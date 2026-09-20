// PagaMenos · CCA FOUNDATION TEST FIXTURE — private tracked-adapter implementation (§17, §21, §26, §27).
//
// NOT M7. Holds the hidden transaction client only as the `tx` parameter the CCA engine supplies.
// Every lock goes through the engine-owned LockSequencer, so the canonical order
//   EXPERIMENT_ASSIGNMENT (held by CCA) → FIXTURE_ROOT → FIXTURE_CHILD (ascending peers)
// is enforced mechanically. Every write derives its assignment from the LockedCollectionScope.
import type { Prisma } from '@prisma/client';

import { defineLockOrder } from '@/cca/lock-order';
import { requireLockedAssignment } from '@/cca/locked-scope';
import type { AdapterImplementation } from '@/cca/tracked-adapter';

import type { FoundationFixtureAdapter } from './foundation.cca-adapter-interface';

export const foundationFixtureLockOrder = defineLockOrder(['FIXTURE_ROOT', 'FIXTURE_CHILD']);

type Tx = Prisma.TransactionClient;

export const foundationFixtureAdapter: AdapterImplementation<Tx, FoundationFixtureAdapter> = {
  async recordFixtureCollection(tx, { scope, locks }, args) {
    const identity = `${scope.assignmentId}:${args.rootKey}`;
    await locks.acquire(
      'FIXTURE_ROOT',
      args.rootKey,
      () => tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`cca-root:${identity}`}))`,
    );
    // Replay re-check under the root/replay lock (§28 steps 1–3): an existing row → no new write.
    const existing = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id"::text AS "id" FROM "cca_fixture_root"
      WHERE "assignment_id" = ${scope.assignmentId}::uuid AND "root_key" = ${args.rootKey}`;
    if (existing.length === 1) return { kind: 'EXISTING', rootId: existing[0]!.id };
    const inserted = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO "cca_fixture_root" ("assignment_id", "root_key")
      VALUES (${scope.assignmentId}::uuid, ${args.rootKey}) RETURNING "id"::text AS "id"`;
    const rootId = inserted[0]!.id;
    await locks.acquirePeers('FIXTURE_CHILD', args.childKeys, async (key) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`cca-child:${key}`}))`;
      if (args.pauseMs !== undefined && args.pauseMs > 0) {
        await tx.$executeRaw`SELECT pg_sleep(${args.pauseMs / 1000}::float8)`;
      }
      await tx.$executeRaw`
        INSERT INTO "cca_fixture_child" ("root_id", "child_key", "assignment_id")
        VALUES (${rootId}::uuid, ${key}, ${scope.assignmentId}::uuid)`;
    });
    return { kind: 'CREATED', rootId };
  },

  async proveUpstreamOwnership(tx, { scope }, upstreamRootId) {
    const rows = await tx.$queryRaw<Array<{ assignment_id: string }>>`
      SELECT "assignment_id"::text AS "assignment_id" FROM "cca_fixture_root"
      WHERE "id" = ${upstreamRootId}::uuid`;
    requireLockedAssignment(scope, rows[0]?.assignment_id ?? null);
  },

  async slowMarker(tx, { scope }, label, sleepMs) {
    await tx.$executeRaw`SELECT pg_sleep(${sleepMs / 1000}::float8)`;
    await tx.$executeRaw`
      INSERT INTO "cca_fixture_marker" ("assignment_id", "label")
      VALUES (${scope.assignmentId}::uuid, ${label})`;
    return label;
  },

  async attemptLockInversion(tx, { scope, locks }, rootKey, childKey) {
    await tx.$executeRaw`
      INSERT INTO "cca_fixture_marker" ("assignment_id", "label")
      VALUES (${scope.assignmentId}::uuid, ${`inversion:${rootKey}`})`;
    await locks.acquire(
      'FIXTURE_CHILD',
      childKey,
      () => tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`cca-child:${childKey}`}))`,
    );
    await locks.acquire(
      'FIXTURE_ROOT',
      rootKey,
      () => tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`cca-root:${rootKey}`}))`,
    );
  },
};

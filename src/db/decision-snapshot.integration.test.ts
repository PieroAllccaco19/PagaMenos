// PagaMenos · db — REAL PostgreSQL integration tests for the immutable DecisionSnapshot (§25/§26).
//
// These run ONLY under the ephemeral-Postgres orchestrator (`pnpm test:integration`), which initdb's
// a throwaway cluster, applies the migration from a clean DB, sets DATABASE_URL, and tears down. They
// prove the invariants that mocks/SQLite cannot: DB-level immutability triggers, unique-key
// idempotency/business semantics under real constraints, concurrency, and transactional rollback.
//
// Every test uses fresh unique keys (the table is append-only — no cleanup is possible or needed; the
// orchestrator gives each run a clean database).
import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '@/db';
import { DecisionSnapshotRepository } from '@/db';
import { decide } from '@/engine';
import {
  BusinessDecisionConflictError,
  IdempotencyConflictError,
  buildDecisionSnapshotDraft,
  canonicalHash,
  verifySnapshotIntegrity,
  type DecisionSnapshotDraft,
} from '@/persistence';

import { chinawokInput, CORPUS_VERSION } from '../persistence/__fixtures__/decision-fixture';

const repo = new DecisionSnapshotRepository(prisma);

/** Build a draft with explicit keys. `variantAt` changes the instants ⇒ a different input/output hash. */
function makeDraft(
  keys: { businessDecisionKey: string; idempotencyKey: string },
  variantAt?: string,
): DecisionSnapshotDraft {
  const input = chinawokInput();
  if (variantAt) {
    input.evaluatedAt = variantAt;
    input.intendedTransactionAt = variantAt;
  }
  const output = decide(input);
  return buildDecisionSnapshotDraft({
    input,
    output,
    corpusVersion: CORPUS_VERSION,
    build: { gitSha: 'integrationsha', buildId: 'itest' },
    ...keys,
  });
}

async function countByIdempotencyKey(idempotencyKey: string): Promise<number> {
  return prisma.decisionSnapshot.count({ where: { idempotencyKey } });
}

beforeAll(async () => {
  // Fail loudly if the orchestrator did not point us at a real database.
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set for integration tests');
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('migration + insert + read roundtrip (§25.1–3)', () => {
  it('inserts and reads back a byte-identical, hash-verifiable snapshot', async () => {
    const draft = makeDraft({
      businessDecisionKey: `bdk-${randomUUID()}`,
      idempotencyKey: `idem-${randomUUID()}`,
    });
    const persisted = await repo.persist(draft);

    expect(persisted.id).toMatch(/[0-9a-f-]{36}/);
    expect(persisted.decisionStatus).toBe('BEST_CONFIRMED');
    expect(persisted.merchantId).toBe('m_chinawok');

    const reloaded = await repo.findById(persisted.id);
    expect(reloaded).not.toBeNull();
    // Exact payload round-trip.
    expect(reloaded!.engineInputJson).toEqual(draft.engineInputJson);
    expect(reloaded!.engineOutputJson).toEqual(draft.engineOutputJson);
    // Stored hashes are intact and re-verify against the reloaded payloads (§28).
    expect(reloaded!.inputHash).toBe(draft.inputHash);
    expect(reloaded!.outputHash).toBe(draft.outputHash);
    expect(canonicalHash(reloaded!.engineInputJson)).toBe(reloaded!.inputHash);
    expect(() => verifySnapshotIntegrity(reloaded!)).not.toThrow();
  });
});

describe('DB-level immutability triggers (§12/§25.4–5)', () => {
  it('rejects UPDATE on a historical row', async () => {
    const draft = makeDraft({
      businessDecisionKey: `bdk-${randomUUID()}`,
      idempotencyKey: `idem-${randomUUID()}`,
    });
    const persisted = await repo.persist(draft);
    await expect(
      prisma.$executeRawUnsafe(
        'UPDATE "decision_snapshot" SET "gitSha" = $1 WHERE id = $2::uuid',
        'TAMPERED',
        persisted.id,
      ),
    ).rejects.toThrow();
    // The row is unchanged.
    const reloaded = await repo.findById(persisted.id);
    expect(reloaded!.gitSha).toBe('integrationsha');
  });

  it('rejects DELETE on a historical row', async () => {
    const draft = makeDraft({
      businessDecisionKey: `bdk-${randomUUID()}`,
      idempotencyKey: `idem-${randomUUID()}`,
    });
    const persisted = await repo.persist(draft);
    await expect(
      prisma.$executeRawUnsafe('DELETE FROM "decision_snapshot" WHERE id = $1::uuid', persisted.id),
    ).rejects.toThrow();
    expect(await repo.findById(persisted.id)).not.toBeNull();
  });

  it('rejects TRUNCATE on the table', async () => {
    await expect(prisma.$executeRawUnsafe('TRUNCATE "decision_snapshot"')).rejects.toThrow();
  });
});

describe('idempotency (§10/§25.6–7)', () => {
  it('first insert, exact retry returns the same row (no duplicate)', async () => {
    const keys = {
      businessDecisionKey: `bdk-${randomUUID()}`,
      idempotencyKey: `idem-${randomUUID()}`,
    };
    const first = await repo.persist(makeDraft(keys));
    const retry = await repo.persist(makeDraft(keys));
    expect(retry.id).toBe(first.id);
    expect(await countByIdempotencyKey(keys.idempotencyKey)).toBe(1);
  });

  it('same idempotencyKey with a different payload → IdempotencyConflictError', async () => {
    const keys = {
      businessDecisionKey: `bdk-${randomUUID()}`,
      idempotencyKey: `idem-${randomUUID()}`,
    };
    await repo.persist(makeDraft(keys));
    const conflicting = makeDraft(
      { businessDecisionKey: `bdk-${randomUUID()}`, idempotencyKey: keys.idempotencyKey },
      '2026-09-08T12:00:00-05:00',
    );
    await expect(repo.persist(conflicting)).rejects.toBeInstanceOf(IdempotencyConflictError);
    expect(await countByIdempotencyKey(keys.idempotencyKey)).toBe(1);
  });
});

describe('business uniqueness (§11)', () => {
  it('same businessDecisionKey + same snapshot via a different idempotencyKey → same row', async () => {
    const bdk = `bdk-${randomUUID()}`;
    const first = await repo.persist(
      makeDraft({ businessDecisionKey: bdk, idempotencyKey: `idem-${randomUUID()}` }),
    );
    const dup = await repo.persist(
      makeDraft({ businessDecisionKey: bdk, idempotencyKey: `idem-${randomUUID()}` }),
    );
    expect(dup.id).toBe(first.id);
  });

  it('same businessDecisionKey + different snapshot → BusinessDecisionConflictError', async () => {
    const bdk = `bdk-${randomUUID()}`;
    await repo.persist(
      makeDraft({ businessDecisionKey: bdk, idempotencyKey: `idem-${randomUUID()}` }),
    );
    const conflicting = makeDraft(
      { businessDecisionKey: bdk, idempotencyKey: `idem-${randomUUID()}` },
      '2026-09-08T12:00:00-05:00',
    );
    await expect(repo.persist(conflicting)).rejects.toBeInstanceOf(BusinessDecisionConflictError);
  });
});

describe('concurrency (§26)', () => {
  it('two concurrent identical writes → one durable row, both resolve to it', async () => {
    const keys = {
      businessDecisionKey: `bdk-${randomUUID()}`,
      idempotencyKey: `idem-${randomUUID()}`,
    };
    const [a, b] = await Promise.all([
      repo.persist(makeDraft(keys)),
      repo.persist(makeDraft(keys)),
    ]);
    expect(a.id).toBe(b.id);
    expect(await countByIdempotencyKey(keys.idempotencyKey)).toBe(1);
  });

  it('two concurrent writes, same key different payload → one succeeds, one conflicts', async () => {
    const idempotencyKey = `idem-${randomUUID()}`;
    const d1 = makeDraft({ businessDecisionKey: `bdk-${randomUUID()}`, idempotencyKey });
    const d2 = makeDraft(
      { businessDecisionKey: `bdk-${randomUUID()}`, idempotencyKey },
      '2026-09-08T12:00:00-05:00',
    );
    const results = await Promise.allSettled([repo.persist(d1), repo.persist(d2)]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(IdempotencyConflictError);
    expect(await countByIdempotencyKey(idempotencyKey)).toBe(1);
  });
});

describe('transaction atomicity (§16/§25.8)', () => {
  it('a failed transaction leaves zero partial rows', async () => {
    const idempotencyKey = `idem-${randomUUID()}`;
    const draft = makeDraft({ businessDecisionKey: `bdk-${randomUUID()}`, idempotencyKey });
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.decisionSnapshot.create({
          data: {
            businessDecisionKey: draft.businessDecisionKey,
            idempotencyKey: draft.idempotencyKey,
            snapshotSchemaVersion: draft.snapshotSchemaVersion,
            engineInputSchemaVersion: draft.engineInputSchemaVersion,
            engineOutputSchemaVersion: draft.engineOutputSchemaVersion,
            engineContractVersion: draft.engineContractVersion,
            corpusVersion: draft.corpusVersion,
            merchantId: draft.merchantId,
            selectedScopeId: draft.selectedScopeId,
            decisionStatus: draft.decisionStatus,
            evaluatedAt: new Date(draft.evaluatedAt),
            intendedTransactionAt: new Date(draft.intendedTransactionAt),
            engineInputJson: draft.engineInputJson as never,
            engineOutputJson: draft.engineOutputJson as never,
            inputHash: draft.inputHash,
            outputHash: draft.outputHash,
            gitSha: draft.gitSha,
            buildId: draft.buildId,
          },
        });
        throw new Error('forced rollback');
      }),
    ).rejects.toThrow('forced rollback');
    // The insert was rolled back with the transaction.
    expect(await countByIdempotencyKey(idempotencyKey)).toBe(0);
  });
});

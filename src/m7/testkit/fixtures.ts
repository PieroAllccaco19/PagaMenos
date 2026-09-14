// M7 V1.1 — S02 real-PostgreSQL harness: disposable, clearly non-M7 self-test fixtures.
//
// Test infrastructure only. The harness proves itself (independent sessions, lock-wait observation,
// seeded deadlock) on a disposable schema that is NOT M7: it is not `m7`, contains no §19 object, is
// created in the harness's own self-test database, and is dropped — with the drop verified — when the
// self-test ends. This module also provides the "no M7 installation" probe S02 must pass.
import type { Queryable } from './roles';

/** The disposable self-test schema. Deliberately not `m7` and not `m7`-prefixed. */
export const SELFTEST_SCHEMA = 's02_harness_selftest';
export const SELFTEST_TABLE = `${SELFTEST_SCHEMA}.lock_probe`;
export const SELFTEST_ROW_IDS = [1, 2, 3] as const;

function assertNonM7(schema: string): void {
  if (/^m7($|_)/i.test(schema) || schema === 'm7') {
    throw new Error(`refusing to use schema ${schema}: S02 fixtures must never be M7 objects`);
  }
}

export async function createSelfTestFixture(db: Queryable): Promise<void> {
  assertNonM7(SELFTEST_SCHEMA);
  await db.query(`CREATE SCHEMA ${SELFTEST_SCHEMA}`);
  await db.query(`CREATE TABLE ${SELFTEST_TABLE} (id integer PRIMARY KEY, v integer NOT NULL)`);
  await db.query(`INSERT INTO ${SELFTEST_TABLE} (id, v) SELECT g, 0 FROM unnest($1::int[]) AS g`, [
    SELFTEST_ROW_IDS,
  ]);
}

/** Drops the fixture and proves it is gone. */
export async function dropSelfTestFixture(db: Queryable): Promise<{ schemaRemaining: number }> {
  await db.query(`DROP SCHEMA IF EXISTS ${SELFTEST_SCHEMA} CASCADE`);
  const { rows } = await db.query<{ n: number }>(
    'SELECT count(*)::int AS n FROM pg_catalog.pg_namespace WHERE nspname = $1',
    [SELFTEST_SCHEMA],
  );
  const schemaRemaining = rows[0]!.n;
  if (schemaRemaining !== 0) throw new Error(`${SELFTEST_SCHEMA} still exists after drop`);
  return { schemaRemaining };
}

export interface M7InstallationProbe {
  readonly database: string;
  readonly m7Schema: number;
  readonly ownerOwnedNamespaces: number;
  readonly ownerOwnedRelations: number;
  readonly ownerOwnedFunctions: number;
  readonly ownerOwnedTypes: number;
  readonly m7PrefixedRelations: number;
}

/**
 * Probes one database for any trace of an M7 §19 installation: schema `m7`, or any namespace,
 * relation, function or type owned by `ownerRole`, or any `m7_`-prefixed relation anywhere.
 */
export async function probeNoM7Installation(
  db: Queryable,
  ownerRole: string,
): Promise<M7InstallationProbe> {
  const { rows } = await db.query<M7InstallationProbe>(
    `SELECT current_database() AS database,
            (SELECT count(*)::int FROM pg_catalog.pg_namespace WHERE nspname = 'm7') AS "m7Schema",
            (SELECT count(*)::int FROM pg_catalog.pg_namespace n JOIN pg_catalog.pg_roles r ON r.oid = n.nspowner
              WHERE r.rolname = $1) AS "ownerOwnedNamespaces",
            (SELECT count(*)::int FROM pg_catalog.pg_class c JOIN pg_catalog.pg_roles r ON r.oid = c.relowner
              WHERE r.rolname = $1) AS "ownerOwnedRelations",
            (SELECT count(*)::int FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_roles r ON r.oid = p.proowner
              WHERE r.rolname = $1) AS "ownerOwnedFunctions",
            (SELECT count(*)::int FROM pg_catalog.pg_type t JOIN pg_catalog.pg_roles r ON r.oid = t.typowner
              WHERE r.rolname = $1) AS "ownerOwnedTypes",
            (SELECT count(*)::int FROM pg_catalog.pg_class WHERE relname LIKE 'm7\\_%') AS "m7PrefixedRelations"`,
    [ownerRole],
  );
  return rows[0]!;
}

export function isClearOfM7(p: M7InstallationProbe): boolean {
  return (
    p.m7Schema === 0 &&
    p.ownerOwnedNamespaces === 0 &&
    p.ownerOwnedRelations === 0 &&
    p.ownerOwnedFunctions === 0 &&
    p.ownerOwnedTypes === 0 &&
    p.m7PrefixedRelations === 0
  );
}

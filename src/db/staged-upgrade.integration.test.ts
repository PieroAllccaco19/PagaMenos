// PagaMenos · db — STAGED existing-data upgrade regression (P35A-01 §8). REAL PostgreSQL.
//
// Reproduces the exact Codex attack: a database populated UNDER THE BASE migration (with a snapshot
// carrying an `idempotencyKey`) is upgraded by the closure migration; the historical key MUST survive
// as a durable receipt and MUST NOT be reusable for a different request. Uses genuine
// `prisma migrate deploy` staging (NOT db push): the base migration is deployed alone, a pre-closure
// snapshot is inserted, then the closure migration is deployed.
//
// Runs ONLY under the ephemeral-Postgres orchestrator against its own `pagamenos_upgrade` database
// (DATABASE_URL is set by the orchestrator). The DB starts EMPTY — this test applies both migrations.
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '@/db/client';
import { IdempotencyConflictError } from '@/persistence/errors';
import { DECISION_PERSIST_OPERATION_SCOPE } from '@/persistence/snapshot';
import { canonicalHash } from '@/persistence/hash';
import {
  ENGINE_CONTRACT_VERSION,
  ENGINE_INPUT_SCHEMA_VERSION,
  ENGINE_OUTPUT_SCHEMA_VERSION,
  SNAPSHOT_SCHEMA_VERSION,
} from '@/persistence/versions';
import {
  chinawokDecision,
  CORPUS_VERSION,
  TEST_GIT_SHA,
} from '../persistence/__fixtures__/decision-fixture';
import { decideAndPersistWithDeps } from '@/services/decide-and-persist';
import { corpusV1ProvenanceProvider, fixedBuildMetadataProvider } from '@/persistence/provenance';

// Fixed staged constants (only meaningful within this test's own database).
const K_OLD = 'K_OLD_STAGED_UPGRADE';
const D_OLD = 'D_OLD_STAGED_UPGRADE';

const MIGRATIONS_DIR = join(process.cwd(), 'prisma', 'migrations');
const BASE_MIGRATION = '20260831120000_m3_5a_decision_snapshot';
const CLOSURE_MIGRATION = '20260831130000_m3_5a_closure_idempotency_receipts';

let stageDir: string;

function deploy(schemaPath: string): void {
  const res = spawnSync(`npx prisma migrate deploy --schema "${schemaPath}"`, {
    stdio: 'pipe',
    shell: true,
    env: process.env,
    encoding: 'utf8',
  });
  if (res.status !== 0) {
    throw new Error(`prisma migrate deploy failed:\n${res.stdout}\n${res.stderr}`);
  }
}

const { input: oldInput, output: oldOutput } = chinawokDecision();
const H_OLD = canonicalHash(oldInput); // requestHash === inputHash (frozen, §5)

beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set for staged upgrade test');

  // Build a staging area: a schema copy + a migrations dir containing ONLY the base migration.
  stageDir = mkdtempSync(join(tmpdir(), 'pagamenos-stage-'));
  cpSync(join(process.cwd(), 'prisma', 'schema.prisma'), join(stageDir, 'schema.prisma'));
  const migDir = join(stageDir, 'migrations');
  cpSync(join(MIGRATIONS_DIR, 'migration_lock.toml'), join(migDir, 'migration_lock.toml'), {
    recursive: true,
  });
  cpSync(join(MIGRATIONS_DIR, BASE_MIGRATION), join(migDir, BASE_MIGRATION), { recursive: true });

  // Stage A — deploy ONLY the base migration.
  deploy(join(stageDir, 'schema.prisma'));

  // Stage B — insert a valid pre-closure snapshot carrying idempotencyKey = K_OLD (base schema).
  await prisma.$executeRawUnsafe(
    `INSERT INTO "decision_snapshot"
      ("businessDecisionKey","idempotencyKey","snapshotSchemaVersion","engineInputSchemaVersion",
       "engineOutputSchemaVersion","engineContractVersion","corpusVersion","merchantId",
       "decisionStatus","evaluatedAt","intendedTransactionAt","engineInputJson","engineOutputJson",
       "inputHash","outputHash","gitSha")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::timestamptz,$11::timestamptz,$12::jsonb,$13::jsonb,$14,$15,$16)`,
    D_OLD,
    K_OLD,
    SNAPSHOT_SCHEMA_VERSION,
    ENGINE_INPUT_SCHEMA_VERSION,
    ENGINE_OUTPUT_SCHEMA_VERSION,
    ENGINE_CONTRACT_VERSION,
    CORPUS_VERSION,
    'm_chinawok',
    'BEST_CONFIRMED',
    oldInput.evaluatedAt,
    oldInput.intendedTransactionAt,
    JSON.stringify(oldInput),
    JSON.stringify(oldOutput),
    H_OLD,
    canonicalHash(oldOutput),
    TEST_GIT_SHA,
  );

  // Stage C — add the closure migration to the staging dir and deploy it (backfill + drop).
  cpSync(join(MIGRATIONS_DIR, CLOSURE_MIGRATION), join(stageDir, 'migrations', CLOSURE_MIGRATION), {
    recursive: true,
  });
  deploy(join(stageDir, 'schema.prisma'));
});

afterAll(async () => {
  await prisma.$disconnect();
  if (stageDir) {
    try {
      rmSync(stageDir, { recursive: true, force: true });
    } catch {
      /* a leftover temp dir is harmless */
    }
  }
});

describe('staged existing-data upgrade (§8)', () => {
  it('preserves the pre-closure idempotency key as a durable receipt', async () => {
    const snapshot = await prisma.decisionSnapshot.findUniqueOrThrow({
      where: { businessDecisionKey: D_OLD },
    });
    const receipt = await prisma.decisionIdempotencyReceipt.findUnique({
      where: {
        operationScope_idempotencyKey: {
          operationScope: DECISION_PERSIST_OPERATION_SCOPE,
          idempotencyKey: K_OLD,
        },
      },
    });
    expect(receipt).not.toBeNull();
    expect(receipt!.requestHash).toBe(H_OLD);
    expect(receipt!.decisionSnapshotId).toBe(snapshot.id);
    expect(
      await prisma.decisionIdempotencyReceipt.count({ where: { idempotencyKey: K_OLD } }),
    ).toBe(1);
  });

  it('drops the old snapshot idempotencyKey column', async () => {
    const rows = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'decision_snapshot' AND column_name = 'idempotencyKey'`,
    );
    expect(rows).toHaveLength(0);
  });

  it('the preserved key CANNOT be reused for a different request (§8 exploit closed)', async () => {
    // A different business key + a different input ⇒ a different requestHash than the backfilled H_OLD.
    const differentInput = chinawokDecision().input;
    differentInput.evaluatedAt = '2026-09-15T12:00:00-05:00';
    differentInput.intendedTransactionAt = '2026-09-15T12:00:00-05:00';
    await expect(
      decideAndPersistWithDeps(
        { input: differentInput, businessDecisionKey: 'D_NEW_STAGED', idempotencyKey: K_OLD },
        {
          corpusProvenanceFactory: () => corpusV1ProvenanceProvider(),
          buildProviderFactory: () => fixedBuildMetadataProvider({ gitSha: TEST_GIT_SHA }),
        },
      ),
    ).rejects.toBeInstanceOf(IdempotencyConflictError);
  });
});

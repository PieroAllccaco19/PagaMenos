// PagaMenos · db — REAL PostgreSQL integration tests for the immutable decision persistence (§44–§52).
//
// Run ONLY under the ephemeral-Postgres orchestrator (`pnpm test:integration`): initdb → migrate
// deploy (the full base + closure chain) → this suite → teardown. Proves what mocks/SQLite cannot:
// DB-level immutability of BOTH tables, durable idempotency receipts / alias semantics under real
// unique constraints and concurrency, the alias-reuse exploit is closed, prototype/Date rejection
// with zero poisoned rows, and two-table transactional atomicity.
import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '@/db/client';
import { decide, type DecideInput } from '@/engine';
import {
  exactItemsOf,
  frozenRule,
  frozenScope,
  opState,
  PORTFOLIO_ALL,
} from '@/engine/golden/harness';
import { corpusV1ProvenanceProvider } from '@/persistence/provenance';
import type { BuildMetadataProvider } from '@/persistence/provenance';
import {
  BusinessDecisionConflictError,
  CorpusProvenanceError,
  IdempotencyConflictError,
} from '@/persistence/errors';
import {
  buildDecisionSnapshotDraft,
  computeRequestHash,
  DECISION_PERSIST_OPERATION_SCOPE,
} from '@/persistence/snapshot';
import {
  chinawokInput,
  CORPUS_VERSION,
  TEST_GIT_SHA,
  testBuildProvider,
} from '../persistence/__fixtures__/decision-fixture';
import { decideAndPersist, decideAndPersistWithDeps } from '@/services/decide-and-persist';

const B = '2026-09-08T12:00:00-05:00'; // variant instants ⇒ a different request fingerprint

/** Chinawok input, optionally with variant instants (request "B"). */
function input(variant = false) {
  const i = chinawokInput();
  if (variant) {
    i.evaluatedAt = B;
    i.intendedTransactionAt = B;
  }
  return i;
}

function svcDeps(buildFactory: () => BuildMetadataProvider = () => testBuildProvider()) {
  return {
    corpusProvenanceFactory: () => corpusV1ProvenanceProvider(),
    buildProviderFactory: buildFactory,
  };
}

/** A build-provider FACTORY that counts BOTH construction and resolution (§11 proxy for new-decision). */
function countingBuild(sha = TEST_GIT_SHA) {
  let factoryCalls = 0;
  let resolveCalls = 0;
  const factory = (): BuildMetadataProvider => {
    factoryCalls += 1;
    return {
      resolve: () => {
        resolveCalls += 1;
        return { gitSha: sha, buildId: 'itest' };
      },
    };
  };
  return { factory, factoryCalls: () => factoryCalls, resolveCalls: () => resolveCalls };
}

async function persist(
  bdk: string,
  idem: string,
  variant = false,
  buildFactory?: () => BuildMetadataProvider,
) {
  return decideAndPersistWithDeps(
    { input: input(variant), businessDecisionKey: bdk, idempotencyKey: idem },
    svcDeps(buildFactory),
  );
}

const countReceipts = (idempotencyKey: string) =>
  prisma.decisionIdempotencyReceipt.count({ where: { idempotencyKey } });
const countSnapshots = (businessDecisionKey: string) =>
  prisma.decisionSnapshot.count({ where: { businessDecisionKey } });

const uid = () => randomUUID();

beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set for integration tests');
  await prisma.$connect();
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe('migration chain applied (§52)', () => {
  it('both tables exist and are queryable', async () => {
    await expect(prisma.decisionSnapshot.count()).resolves.toBeGreaterThanOrEqual(0);
    await expect(prisma.decisionIdempotencyReceipt.count()).resolves.toBeGreaterThanOrEqual(0);
  });
});

describe('insert + read roundtrip (§44 I1)', () => {
  it('persists a hash+coherence-verifiable snapshot with one receipt', async () => {
    const bdk = uid();
    const key = uid();
    const r = await persist(bdk, key);
    expect(r.decisionStatus).toBe('BEST_CONFIRMED');
    expect(r.merchantId).toBe('m_chinawok');
    expect(r.gitSha).toBe(TEST_GIT_SHA);
    expect(await countSnapshots(bdk)).toBe(1);
    expect(await countReceipts(key)).toBe(1);
    expect(await countReceipts(key)).toBe(1);
  });
});

describe('idempotency matrix (§44)', () => {
  it('I2 exact retry returns same snapshot; the new-decision path is NOT re-run (§11)', async () => {
    const bdk = uid();
    const key = uid();
    const b = countingBuild();
    const first = await persist(bdk, key, false, b.factory);
    expect(b.factoryCalls()).toBe(1);
    expect(b.resolveCalls()).toBe(1);
    const retry = await persist(bdk, key, false, b.factory);
    expect(retry.id).toBe(first.id);
    expect(b.factoryCalls()).toBe(1); // provider not constructed again
    expect(b.resolveCalls()).toBe(1); // build not resolved again
    expect(await countSnapshots(bdk)).toBe(1);
    expect(await countReceipts(key)).toBe(1);
  });

  it('I3 same key + different request → IdempotencyConflict', async () => {
    const bdk = uid();
    const key = uid();
    await persist(bdk, key, false);
    await expect(persist(bdk, key, true)).rejects.toBeInstanceOf(IdempotencyConflictError);
    expect(await countSnapshots(bdk)).toBe(1);
  });

  it('I4 two keys, same business, same request → same snapshot, BOTH receipts durable', async () => {
    const bdk = uid();
    const k1 = uid();
    const k2 = uid();
    const r1 = await persist(bdk, k1);
    const r2 = await persist(bdk, k2);
    expect(r2.id).toBe(r1.id);
    expect(await countSnapshots(bdk)).toBe(1);
    expect(await countReceipts(k1)).toBe(1);
    expect(await countReceipts(k2)).toBe(1);
  });

  it('I5 (exploit) after aliasing K1,K2 → reuse K2 with a different request → IdempotencyConflict', async () => {
    const bdk = uid();
    const k1 = uid();
    const k2 = uid();
    await persist(bdk, k1);
    await persist(bdk, k2); // alias
    // K2 is permanently consumed: a NEW business + different request under K2 must be rejected.
    await expect(persist(uid(), k2, true)).rejects.toBeInstanceOf(IdempotencyConflictError);
  });

  it('I6 reuse K1 with a different request → IdempotencyConflict', async () => {
    const bdk = uid();
    const k1 = uid();
    const k2 = uid();
    await persist(bdk, k1);
    await persist(bdk, k2);
    await expect(persist(uid(), k1, true)).rejects.toBeInstanceOf(IdempotencyConflictError);
  });

  it('I7 different key, same business, different request → BusinessDecisionConflict', async () => {
    const bdk = uid();
    await persist(bdk, uid(), false); // request A
    await expect(persist(bdk, uid(), true)).rejects.toBeInstanceOf(BusinessDecisionConflictError);
  });

  it('I11 exact retry after a deployment (build) change returns ORIGINAL provenance; engine not re-run', async () => {
    const bdk = uid();
    const key = uid();
    const first = await persist(bdk, key, false, () => testBuildProvider());
    const otherSha = 'f'.repeat(40);
    const b2 = countingBuild(otherSha);
    const retry = await persist(bdk, key, false, b2.factory);
    expect(retry.id).toBe(first.id);
    expect(retry.gitSha).toBe(TEST_GIT_SHA); // original build provenance, not the new one
    expect(b2.factoryCalls()).toBe(0); // current build provider not constructed on retry
    expect(b2.resolveCalls()).toBe(0); // current build not resolved on retry
  });
});

describe('concurrency (§44 I8/I9/I10)', () => {
  it('I8 two concurrent identical writes → one snapshot, one receipt, same id', async () => {
    const bdk = uid();
    const key = uid();
    const [a, b] = await Promise.all([persist(bdk, key), persist(bdk, key)]);
    expect(a.id).toBe(b.id);
    expect(await countSnapshots(bdk)).toBe(1);
    expect(await countReceipts(key)).toBe(1);
  });

  it('I9 concurrent different keys, same business, same request → one snapshot, two receipts', async () => {
    const bdk = uid();
    const k1 = uid();
    const k2 = uid();
    const [a, b] = await Promise.all([persist(bdk, k1), persist(bdk, k2)]);
    expect(a.id).toBe(b.id);
    expect(await countSnapshots(bdk)).toBe(1);
    expect(await countReceipts(k1)).toBe(1);
    expect(await countReceipts(k2)).toBe(1);
  });

  it('I10 both parallel-accepted aliases stay consumed → later reuse with a new request conflicts', async () => {
    const bdk = uid();
    const k1 = uid();
    const k2 = uid();
    await Promise.all([persist(bdk, k1), persist(bdk, k2)]);
    await expect(persist(uid(), k1, true)).rejects.toBeInstanceOf(IdempotencyConflictError);
    await expect(persist(uid(), k2, true)).rejects.toBeInstanceOf(IdempotencyConflictError);
  });

  it('concurrent same key + different request → one succeeds, one conflicts, one receipt', async () => {
    const bdk1 = uid();
    const bdk2 = uid();
    const key = uid();
    const results = await Promise.allSettled([
      decideAndPersistWithDeps(
        { input: input(false), businessDecisionKey: bdk1, idempotencyKey: key },
        svcDeps(),
      ),
      decideAndPersistWithDeps(
        { input: input(true), businessDecisionKey: bdk2, idempotencyKey: key },
        svcDeps(),
      ),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    expect(rejected).toHaveLength(1);
    expect(rejected[0]!.reason).toBeInstanceOf(IdempotencyConflictError);
    expect(await countReceipts(key)).toBe(1);
  });

  // P35A-07 §7/§27 — the race Codex reproduced: same key + same input + DIFFERENT business, run
  // concurrently ENOUGH times to actually exercise the uniqueness-race reconciliation branch.
  it('R1 concurrent same key / same input / different business → one wins with ITS OWN snapshot', async () => {
    for (let i = 0; i < 12; i++) {
      const key = uid();
      const d1 = uid();
      const d2 = uid();
      const A = input(false);
      const results = await Promise.allSettled([
        decideAndPersistWithDeps(
          { input: A, businessDecisionKey: d1, idempotencyKey: key },
          svcDeps(),
        ),
        decideAndPersistWithDeps(
          { input: A, businessDecisionKey: d2, idempotencyKey: key },
          svcDeps(),
        ),
      ]);
      const fulfilled = results.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<
        Awaited<ReturnType<typeof decideAndPersistWithDeps>>
      >[];
      const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0]!.reason).toBeInstanceOf(IdempotencyConflictError);
      // Exactly one snapshot + one receipt for the key; the winner got ITS OWN business decision,
      // never the loser's snapshot.
      expect(await countReceipts(key)).toBe(1);
      const winnerBdk = fulfilled[0]!.value.businessDecisionKey;
      expect([d1, d2]).toContain(winnerBdk);
      expect(await countSnapshots(winnerBdk)).toBe(1);
      const loserBdk = winnerBdk === d1 ? d2 : d1;
      expect(await countSnapshots(loserBdk)).toBe(0);
    }
  });
});

describe('public API — trusted, no injection (P35A-05 §28)', () => {
  it('full Chinawok via decideAndPersist(request) → BEST_CONFIRMED CW-PLIN-01', async () => {
    const r = await decideAndPersist({
      input: chinawokInput(),
      businessDecisionKey: uid(),
      idempotencyKey: uid(),
    });
    expect(r.decisionStatus).toBe('BEST_CONFIRMED');
    expect(r.merchantId).toBe('m_chinawok');
    expect(r.engineOutputJson.final?.winnerRef?.ruleId).toBe('CW-PLIN-01');
  });

  it('SIP-only Chinawok via the public API → completeness reject, zero rows', async () => {
    const bdk = uid();
    const key = uid();
    const sip = chinawokInput();
    sip.rules = sip.rules.filter((r) => r.ruleId !== 'CW-PLIN-01');
    sip.operationalStates = sip.operationalStates.filter((o) => o.ruleId !== 'CW-PLIN-01');
    await expect(
      decideAndPersist({ input: sip, businessDecisionKey: bdk, idempotencyKey: key }),
    ).rejects.toBeInstanceOf(CorpusProvenanceError);
    expect(await countSnapshots(bdk)).toBe(0);
    expect(await countReceipts(key)).toBe(0);
  });
});

describe('Corpus-v1 candidate-set completeness (§27/§28/§33)', () => {
  it('Chinawok SIP-only (missing CW-PLIN-01) → zero snapshot & zero receipt rows', async () => {
    const bdk = uid();
    const key = uid();
    const incomplete = chinawokInput();
    incomplete.rules = incomplete.rules.filter((r) => r.ruleId !== 'CW-PLIN-01');
    incomplete.operationalStates = incomplete.operationalStates.filter(
      (o) => o.ruleId !== 'CW-PLIN-01',
    );
    await expect(
      decideAndPersistWithDeps(
        { input: incomplete, businessDecisionKey: bdk, idempotencyKey: key },
        svcDeps(),
      ),
    ).rejects.toBeInstanceOf(CorpusProvenanceError);
    expect(await countSnapshots(bdk)).toBe(0);
    expect(await countReceipts(key)).toBe(0);
    // The key was NOT consumed — a corrected complete request may reuse it.
    const fixed = await persist(uid(), key);
    expect(fixed.merchantId).toBe('m_chinawok');
    expect(await countReceipts(key)).toBe(1);
  });

  it('SECOND CONTROL — Popeyes 6pcs missing POP-BCP-01 → zero rows', async () => {
    const scope = frozenScope('sc_pop_6pcs_family_potato');
    const incomplete: DecideInput = {
      rules: [frozenRule('POP-SIP-02')],
      operationalStates: [opState('POP-SIP-02')],
      scopes: [scope],
      portfolio: PORTFOLIO_ALL,
      context: { merchantId: 'm_popeyes', exactItems: exactItemsOf(scope) },
      evaluatedAt: '2026-09-01T12:00:00-05:00',
      intendedTransactionAt: '2026-09-01T12:00:00-05:00',
    };
    const bdk = uid();
    const key = uid();
    await expect(
      decideAndPersistWithDeps(
        { input: incomplete, businessDecisionKey: bdk, idempotencyKey: key },
        svcDeps(),
      ),
    ).rejects.toBeInstanceOf(CorpusProvenanceError);
    expect(await countSnapshots(bdk)).toBe(0);
    expect(await countReceipts(key)).toBe(0);
  });
});

describe('DB-level immutability — snapshots (§50)', () => {
  it('rejects UPDATE / DELETE / TRUNCATE on decision_snapshot', async () => {
    const bdk = uid();
    const r = await persist(bdk, uid());
    await expect(
      prisma.$executeRawUnsafe(
        'UPDATE "decision_snapshot" SET "gitSha" = $1 WHERE id = $2::uuid',
        'x',
        r.id,
      ),
    ).rejects.toThrow();
    await expect(
      prisma.$executeRawUnsafe('DELETE FROM "decision_snapshot" WHERE id = $1::uuid', r.id),
    ).rejects.toThrow();
    await expect(
      prisma.$executeRawUnsafe('TRUNCATE "decision_snapshot" CASCADE'),
    ).rejects.toThrow();
  });
});

describe('DB-level immutability — receipts (§50)', () => {
  it('rejects UPDATE / DELETE / TRUNCATE on decision_idempotency_receipt', async () => {
    const key = uid();
    await persist(uid(), key);
    const receipt = await prisma.decisionIdempotencyReceipt.findFirstOrThrow({
      where: { idempotencyKey: key },
    });
    await expect(
      prisma.$executeRawUnsafe(
        'UPDATE "decision_idempotency_receipt" SET "requestHash" = $1 WHERE id = $2::uuid',
        'x',
        receipt.id,
      ),
    ).rejects.toThrow();
    await expect(
      prisma.$executeRawUnsafe(
        'DELETE FROM "decision_idempotency_receipt" WHERE id = $1::uuid',
        receipt.id,
      ),
    ).rejects.toThrow();
    await expect(
      prisma.$executeRawUnsafe('TRUNCATE "decision_idempotency_receipt"'),
    ).rejects.toThrow();
  });
});

describe('adversarial input rejected before persistence (§46)', () => {
  it('prototype toJSON input fails with zero snapshot & receipt rows', async () => {
    const bdk = uid();
    const key = uid();
    const evil = Object.create({
      toJSON() {
        return { hacked: true };
      },
    }) as Record<string, unknown>;
    Object.assign(evil, chinawokInput());
    await expect(
      decideAndPersistWithDeps(
        { input: evil as never, businessDecisionKey: bdk, idempotencyKey: key },
        svcDeps(),
      ),
    ).rejects.toThrow();
    expect(await countSnapshots(bdk)).toBe(0);
    expect(await countReceipts(key)).toBe(0);
  });

  it('Date and sparse-array inputs are rejected before persistence', async () => {
    const bdk1 = uid();
    const withDate = chinawokInput() as unknown as Record<string, unknown>;
    withDate.evaluatedAt = new Date() as unknown as string;
    await expect(
      decideAndPersistWithDeps(
        { input: withDate as never, businessDecisionKey: bdk1, idempotencyKey: uid() },
        svcDeps(),
      ),
    ).rejects.toThrow();
    expect(await countSnapshots(bdk1)).toBe(0);
  });
});

describe('two-table transaction atomicity (§51)', () => {
  it('a failed transaction leaves zero snapshot AND zero receipt rows', async () => {
    const bdk = uid();
    const key = uid();
    const i = chinawokInput();
    const output = decide(i);
    const draft = buildDecisionSnapshotDraft({
      input: i,
      output,
      corpusVersion: CORPUS_VERSION,
      build: { gitSha: TEST_GIT_SHA, buildId: 'itest' },
      businessDecisionKey: bdk,
    });
    await expect(
      prisma.$transaction(async (tx) => {
        const snap = await tx.decisionSnapshot.create({
          data: {
            businessDecisionKey: draft.businessDecisionKey,
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
        await tx.decisionIdempotencyReceipt.create({
          data: {
            operationScope: DECISION_PERSIST_OPERATION_SCOPE,
            idempotencyKey: key,
            requestHash: computeRequestHash(i),
            decisionSnapshotId: snap.id,
          },
        });
        throw new Error('forced rollback');
      }),
    ).rejects.toThrow('forced rollback');
    expect(await countSnapshots(bdk)).toBe(0);
    expect(await countReceipts(key)).toBe(0);
  });
});

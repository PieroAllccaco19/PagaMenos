// PagaMenos · M3.5B-B1 real-PostgreSQL Opportunity-Identity integration suite.
//
// Runs ONLY under `scripts/pg-integration.ts` (ephemeral cluster + `prisma migrate deploy` + this
// suite). It exercises the SANCTIONED B1 service end-to-end against real Postgres, probes the
// DB-level guards directly (append-only triggers, CHECKs, FKs, the identity-coherence trigger), and
// drives GENUINE overlapping transactions (multiple Prisma clients + a real row-lock barrier) for the
// concurrency proof. Trusted clocks are injected ONLY through the internal repository constructor.
import { randomUUID } from 'node:crypto';

import { PrismaClient } from '@prisma/client';
import { afterAll, describe, expect, it } from 'vitest';

import { prisma } from '@/db/client';
import { PurchaseOccasionRepository } from '@/db/purchase-occasion-repository';
import {
  assignParticipant,
  createExperiment,
  freezeAnalysisProtocol,
  registerAnalysisProtocolDraft,
  registerStudyParticipant,
  resolveTrustedEntrySource,
  resolveTrustedParticipantContext,
} from '@/services/study-admin';
import { recordConsentGrant, recordConsentWithdrawal } from '@/services';
import {
  appendEligibilityProfile,
  appendPurchaseIntentContext,
  captureIntentToken,
  createPurchaseIntent,
  finalizePurchaseIntent,
  invalidatePurchaseIntent,
} from '@/services/study-purchase-intent';
import { requestPurchaseIntentDecision } from '@/services/study-intent-decision';
import {
  loadPurchaseOccasion,
  materializePurchaseOccasion,
  materializePurchaseOccasionWithDeps,
} from '@/services/study-purchase-occasion';
import {
  B1_OCCASION_SCHEMA_VERSION_V1,
  computeOccasionIdentityDigest,
  materializeOccasionRequestHash,
  normalizeOccasionIdentityFacts,
  OCCASION_MATERIALIZE_OPERATION_SCOPE,
  PurchaseIntentInvalidatedError,
  PurchaseIntentNotFinalizedError,
  PurchaseIntentOwnershipError,
  PurchaseOccasionCoherenceError,
  PurchaseOccasionConflictError,
  PurchaseOccasionIdempotencyConflictError,
  PurchaseOccasionInvariantError,
  RECRUITMENT_KEY_VERSION_V1,
  type ResolvedEntrySource,
  type TrustedParticipantContext,
} from '@/study';

const uid = () => randomUUID().slice(0, 8);
const DEF = {
  observationWindowWeeks: 6,
  contaminationWindowHours: 48,
  minimumVerifiedLevel: 'CORROBORATED',
  minimumIndependentOccasions: 2,
};
const DIRECT: ResolvedEntrySource = resolveTrustedEntrySource([{ kind: 'DIRECT' }]);
const BILL = {
  kind: 'BILL',
  merchantId: 'm_fridays',
  channel: 'SALON',
  wholeBillCentimos: 10000,
  foodCentimos: 8000,
  nonAlcoholicBeverageCentimos: 1500,
  purchaseDomain: 'RESTAURANT_BILL',
};
const PORTFOLIO = { instruments: [{ family: 'IBK_PLIN', memberships: ['A'] }] };
const INTENDED_AT = '2026-07-28T12:00:00-05:00';

const extraClients: PrismaClient[] = [];
afterAll(async () => {
  await Promise.all(extraClients.map((c) => c.$disconnect()));
  await prisma.$disconnect();
});
function newClient(): PrismaClient {
  const c = new PrismaClient();
  extraClients.push(c);
  return c;
}

interface Fixture {
  assignmentId: string;
  participantId: string;
  context: TrustedParticipantContext;
}

/** A frozen protocol → experiment → participant → assignment + a GRANTED consent. */
async function grantedAssignment(): Promise<Fixture> {
  const draft = await registerAnalysisProtocolDraft({
    input: { protocolVersion: `P-${uid()}`, definition: DEF },
    idempotencyKey: `reg-${uid()}`,
  });
  const frozen = await freezeAnalysisProtocol({
    input: { protocolId: draft.protocol.id },
    idempotencyKey: `frz-${uid()}`,
  });
  const experiment = await createExperiment({
    input: { experimentCode: `E-${uid()}`, frozenProtocolId: frozen.protocol.id },
    idempotencyKey: `exp-${uid()}`,
  });
  const participant = await registerStudyParticipant({
    input: {
      recruitmentSubjectKey: `sk-${uid()}`,
      recruitmentKeyVersion: RECRUITMENT_KEY_VERSION_V1,
    },
    idempotencyKey: `par-${uid()}`,
  });
  const assignment = await assignParticipant({
    input: { experimentId: experiment.experiment.id, participantId: participant.participant.id },
    idempotencyKey: `asg-${uid()}`,
  });
  const context = resolveTrustedParticipantContext({
    authenticatedParticipantId: participant.participant.id,
  });
  await recordConsentGrant({
    trustedParticipantContext: context,
    assignmentId: assignment.assignment.id,
    consentPayload: {
      consentVersion: 'cv1',
      privacyNoticeVersion: 'pv1',
      optionalEvidenceConsent: true,
    },
    idempotencyKey: `cg-${uid()}`,
  });
  return {
    assignmentId: assignment.assignment.id,
    participantId: participant.participant.id,
    context,
  };
}

/** Capture → create → context → profile (NOT finalized). */
async function openIntent(fx: Fixture, over: Partial<typeof BILL> = {}, at = INTENDED_AT) {
  const token = await captureIntentToken({
    trustedParticipantContext: fx.context,
    assignmentId: fx.assignmentId,
    clientCorrelationNonce: `nonce-${uid()}`,
    resolvedEntrySource: DIRECT,
  });
  const intent = await createPurchaseIntent({
    trustedParticipantContext: fx.context,
    assignmentId: fx.assignmentId,
    intentCaptureKey: token.intentCaptureKey,
    intentType: 'BUYING_NOW',
    idempotencyKey: `ci-${uid()}`,
  });
  const ctx = await appendPurchaseIntentContext({
    trustedParticipantContext: fx.context,
    assignmentId: fx.assignmentId,
    intentId: intent.intentId,
    contextCaptureKey: `cc-${uid()}`,
    signature: { ...BILL, ...over },
    intendedTransactionAt: at,
    idempotencyKey: `ac-${uid()}`,
  });
  const prof = await appendEligibilityProfile({
    trustedParticipantContext: fx.context,
    assignmentId: fx.assignmentId,
    profileCaptureKey: `pc-${uid()}`,
    portfolio: PORTFOLIO,
    idempotencyKey: `ap-${uid()}`,
  });
  return { token, intent, ctx, prof };
}

/** ...and finalize it (the accepted A2 point at which every B1 identity fact exists and is frozen). */
async function finalizedIntent(fx: Fixture, over: Partial<typeof BILL> = {}, at = INTENDED_AT) {
  const open = await openIntent(fx, over, at);
  const fin = await finalizePurchaseIntent({
    trustedParticipantContext: fx.context,
    assignmentId: fx.assignmentId,
    intentId: open.intent.intentId,
    contextVersionId: open.ctx.contextVersionId,
    eligibilityProfileVersionId: open.prof.eligibilityProfileVersionId,
    idempotencyKey: `fin-${uid()}`,
  });
  return { ...open, fin };
}

const materialize = (fx: Fixture, intentId: string, key = `occ-${uid()}`) =>
  materializePurchaseOccasion({
    trustedParticipantContext: fx.context,
    assignmentId: fx.assignmentId,
    intentId,
    idempotencyKey: key,
  });

// ===================================================================================================
describe('B1 creation — a finalized intent obtains ONE durable identity (§14 B)', () => {
  it('materializes an occasion whose immutable facts come from the accepted A2 authorities', async () => {
    const fx = await grantedAssignment();
    const { intent, ctx, fin } = await finalizedIntent(fx);

    const res = await materialize(fx, intent.intentId);
    expect(res.resultKind).toBe('MATERIALIZED');
    expect(res.replayed).toBe(false);
    expect(res.occasionId).toMatch(/^[0-9a-f-]{36}$/);

    const row = await prisma.purchaseOccasion.findUniqueOrThrow({ where: { id: res.occasionId } });
    expect(row.occasionSchemaVersion).toBe(B1_OCCASION_SCHEMA_VERSION_V1);
    expect(row.originIntentId).toBe(intent.intentId);
    expect(row.originFinalizationId).toBe(fin.finalizationId);
    expect(row.originContextVersionId).toBe(ctx.contextVersionId);
    expect(row.assignmentId).toBe(fx.assignmentId);
    expect(row.merchantId).toBe(BILL.merchantId);
    expect(row.intendedTransactionAt.toISOString()).toBe(new Date(INTENDED_AT).toISOString());

    // The stored digest fingerprints exactly the stored identity facts.
    expect(row.identityDigest).toBe(
      computeOccasionIdentityDigest(
        normalizeOccasionIdentityFacts({
          occasionSchemaVersion: row.occasionSchemaVersion,
          originIntentId: row.originIntentId,
          originFinalizationId: row.originFinalizationId,
          originContextVersionId: row.originContextVersionId,
          assignmentId: row.assignmentId,
          merchantId: row.merchantId,
          intendedTransactionAt: row.intendedTransactionAt,
        }),
      ),
    );

    // Exactly one MATERIALIZED receipt, scoped to the trusted operation constant.
    const receipts = await prisma.purchaseOccasionMaterializationReceipt.findMany({
      where: { occasionId: res.occasionId },
    });
    expect(receipts).toHaveLength(1);
    expect(receipts[0]!.operationScope).toBe(OCCASION_MATERIALIZE_OPERATION_SCOPE);
    expect(receipts[0]!.resultKind).toBe('MATERIALIZED');
  });

  it('persists through readback, coherence-proven, with the parent relations intact', async () => {
    const fx = await grantedAssignment();
    const { intent, ctx, fin } = await finalizedIntent(fx);
    const res = await materialize(fx, intent.intentId);

    const loaded = await loadPurchaseOccasion({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      occasionId: res.occasionId,
    });
    expect(loaded).not.toBeNull();
    expect(loaded!.occasionId).toBe(res.occasionId);
    expect(loaded!.originIntentId).toBe(intent.intentId);
    expect(loaded!.originFinalizationId).toBe(fin.finalizationId);
    expect(loaded!.originContextVersionId).toBe(ctx.contextVersionId);
    expect(loaded!.assignmentId).toBe(fx.assignmentId);
    expect(loaded!.merchantId).toBe(BILL.merchantId);
    expect(new Date(loaded!.intendedTransactionAt).toISOString()).toBe(
      new Date(INTENDED_AT).toISOString(),
    );
    expect(loaded!.materializedAt).toBeTruthy();
  });

  it('an unknown occasion id reads as null (never a fabricated identity)', async () => {
    const fx = await grantedAssignment();
    expect(
      await loadPurchaseOccasion({
        trustedParticipantContext: fx.context,
        assignmentId: fx.assignmentId,
        occasionId: randomUUID(),
      }),
    ).toBeNull();
  });
});

// ===================================================================================================
describe('B1 distinctness — genuinely distinct opportunities never collapse (§14 C)', () => {
  it('two intents with the SAME merchant, amount and intended instant get DISTINCT identities', async () => {
    const fx = await grantedAssignment();
    // Deliberately identical business facts — the A2 non-collapse invariant must survive into B1.
    const a = await finalizedIntent(fx);
    const b = await finalizedIntent(fx);
    expect(a.intent.intentId).not.toBe(b.intent.intentId);

    const occA = await materialize(fx, a.intent.intentId);
    const occB = await materialize(fx, b.intent.intentId);
    expect(occA.occasionId).not.toBe(occB.occasionId);
    expect(occA.resultKind).toBe('MATERIALIZED');
    expect(occB.resultKind).toBe('MATERIALIZED');

    const rows = await prisma.purchaseOccasion.findMany({
      where: { originIntentId: { in: [a.intent.intentId, b.intent.intentId] } },
    });
    expect(rows).toHaveLength(2);
    // Same merchant + same intended instant, two identities: B1 asserts NO reconciliation (that is B2).
    expect(rows[0]!.merchantId).toBe(rows[1]!.merchantId);
    expect(rows[0]!.intendedTransactionAt.getTime()).toBe(rows[1]!.intendedTransactionAt.getTime());
  });

  it('occasions of two different participants stay separate identities', async () => {
    const fx1 = await grantedAssignment();
    const fx2 = await grantedAssignment();
    const i1 = await finalizedIntent(fx1);
    const i2 = await finalizedIntent(fx2);
    const o1 = await materialize(fx1, i1.intent.intentId);
    const o2 = await materialize(fx2, i2.intent.intentId);
    expect(o1.occasionId).not.toBe(o2.occasionId);
  });
});

// ===================================================================================================
describe('B1 idempotency — a legitimate retry never mints a second identity (§14 D)', () => {
  it('the SAME transport key replayed returns the frozen outcome and writes no new row', async () => {
    const fx = await grantedAssignment();
    const { intent } = await finalizedIntent(fx);
    const key = `occ-${uid()}`;

    const first = await materialize(fx, intent.intentId, key);
    const replay = await materialize(fx, intent.intentId, key);
    expect(replay.occasionId).toBe(first.occasionId);
    expect(replay.resultKind).toBe('MATERIALIZED');
    expect(replay.replayed).toBe(true);

    expect(
      await prisma.purchaseOccasion.count({ where: { originIntentId: intent.intentId } }),
    ).toBe(1);
    expect(
      await prisma.purchaseOccasionMaterializationReceipt.count({
        where: { occasionId: first.occasionId },
      }),
    ).toBe(1);
  });

  it('a DIFFERENT transport key for the same intent aliases the same occasion', async () => {
    const fx = await grantedAssignment();
    const { intent } = await finalizedIntent(fx);

    const first = await materialize(fx, intent.intentId);
    const alias = await materialize(fx, intent.intentId);
    expect(alias.occasionId).toBe(first.occasionId);
    expect(alias.resultKind).toBe('OCCASION_ALIAS');
    expect(alias.replayed).toBe(false);

    expect(
      await prisma.purchaseOccasion.count({ where: { originIntentId: intent.intentId } }),
    ).toBe(1);
    const receipts = await prisma.purchaseOccasionMaterializationReceipt.findMany({
      where: { occasionId: first.occasionId },
      orderBy: { createdAt: 'asc' },
    });
    expect(receipts.map((r) => r.resultKind)).toEqual(['MATERIALIZED', 'OCCASION_ALIAS']);
  });

  it('a process restart (a fresh repository + clock) still resolves the same identity', async () => {
    const fx = await grantedAssignment();
    const { intent } = await finalizedIntent(fx);
    const first = await materialize(fx, intent.intentId);
    // A brand-new client + a DIFFERENT trusted clock: identity must not depend on either.
    const restarted = new PurchaseOccasionRepository(newClient(), () => new Date('2031-01-01Z'));
    const again = await materializePurchaseOccasionWithDeps(
      {
        trustedParticipantContext: fx.context,
        assignmentId: fx.assignmentId,
        intentId: intent.intentId,
        idempotencyKey: `occ-${uid()}`,
      },
      { repository: restarted },
    );
    expect(again.occasionId).toBe(first.occasionId);
    const row = await prisma.purchaseOccasion.findUniqueOrThrow({
      where: { id: first.occasionId },
    });
    // materializedAt is the FIRST materialization instant; a later clock never rewrites it.
    expect(row.materializedAt.getUTCFullYear()).not.toBe(2031);
  });
});

// ===================================================================================================
describe('B1 conflicting replay — an inconsistent replay is rejected, never merged (§14 E)', () => {
  it('one transport key reused for a DIFFERENT origin intent is a typed idempotency conflict', async () => {
    const fx = await grantedAssignment();
    const a = await finalizedIntent(fx);
    const b = await finalizedIntent(fx);
    const key = `occ-${uid()}`;

    const first = await materialize(fx, a.intent.intentId, key);
    await expect(materialize(fx, b.intent.intentId, key)).rejects.toBeInstanceOf(
      PurchaseOccasionIdempotencyConflictError,
    );
    // The reused key did NOT create an identity for b, and did not disturb a.
    expect(
      await prisma.purchaseOccasion.count({ where: { originIntentId: b.intent.intentId } }),
    ).toBe(0);
    expect(
      (await prisma.purchaseOccasion.findUniqueOrThrow({ where: { id: first.occasionId } }))
        .originIntentId,
    ).toBe(a.intent.intentId);
  });

  it('an alias attempt whose material request differs from the frozen origin receipt is rejected', async () => {
    // Persistence-layer proof (§9): the guard lives in the repository, so it is exercised directly —
    // a caller that reached the alias branch with a divergent requestHash must NOT be handed the
    // existing occasion.
    const fx = await grantedAssignment();
    const { intent } = await finalizedIntent(fx);
    const repo = new PurchaseOccasionRepository(prisma, () => new Date());
    const honest = materializeOccasionRequestHash({
      intentId: intent.intentId,
      context: { participantId: fx.participantId },
    });
    const first = await repo.materializeOccasion({
      assignmentId: fx.assignmentId,
      intentId: intent.intentId,
      operationScope: OCCASION_MATERIALIZE_OPERATION_SCOPE,
      idempotencyKey: `occ-${uid()}`,
      requestHash: honest,
    });
    expect(first.resultKind).toBe('MATERIALIZED');

    await expect(
      repo.materializeOccasion({
        assignmentId: fx.assignmentId,
        intentId: intent.intentId,
        operationScope: OCCASION_MATERIALIZE_OPERATION_SCOPE,
        idempotencyKey: `occ-${uid()}`,
        requestHash: materializeOccasionRequestHash({
          intentId: intent.intentId,
          context: { participantId: 'someone-else' },
        }),
      }),
    ).rejects.toBeInstanceOf(PurchaseOccasionConflictError);

    // No alias receipt was written for the rejected attempt.
    expect(
      await prisma.purchaseOccasionMaterializationReceipt.count({
        where: { occasionId: first.occasionId },
      }),
    ).toBe(1);
  });

  it('a FORGED receipt row cannot redirect a legitimate retry to a foreign occasion', async () => {
    // Adversarial audit finding: UPDATE/DELETE/TRUNCATE are trigger-blocked on the receipt table, but
    // INSERT is not (and cannot be — the repository must write receipts). A forged receipt carrying a
    // victim's (operationScope, idempotencyKey, requestHash) but somebody else's occasionId would
    // otherwise make the victim's retry resolve to the WRONG opportunity. It must fail closed.
    const fx = await grantedAssignment();
    const victim = await finalizedIntent(fx);
    const foreign = await finalizedIntent(fx);
    const foreignOcc = await materialize(fx, foreign.intent.intentId);

    const key = `occ-forged-${uid()}`;
    const victimHash = materializeOccasionRequestHash({
      intentId: victim.intent.intentId,
      context: { participantId: fx.participantId },
    });
    await prisma.$executeRawUnsafe(
      `INSERT INTO "purchase_occasion_materialization_receipt"
         ("operationScope","idempotencyKey","requestHash","resultKind","occasionId")
       VALUES ('${OCCASION_MATERIALIZE_OPERATION_SCOPE}','${key}','${victimHash}','MATERIALIZED',
               '${foreignOcc.occasionId}'::uuid)`,
    );

    await expect(materialize(fx, victim.intent.intentId, key)).rejects.toBeInstanceOf(
      PurchaseOccasionCoherenceError,
    );
    // The victim intent still has no identity, and the foreign occasion is untouched.
    expect(
      await prisma.purchaseOccasion.count({ where: { originIntentId: victim.intent.intentId } }),
    ).toBe(0);
    expect(
      (
        await prisma.purchaseOccasion.findUniqueOrThrow({
          where: { id: foreignOcc.occasionId },
        })
      ).originIntentId,
    ).toBe(foreign.intent.intentId);
  });
});

// ===================================================================================================
describe('B1 A1/A2 boundary — an opportunity is never manufactured from an excluded record', () => {
  it('an intent that is NOT finalized cannot obtain an identity', async () => {
    const fx = await grantedAssignment();
    const open = await openIntent(fx);
    await expect(materialize(fx, open.intent.intentId)).rejects.toBeInstanceOf(
      PurchaseIntentNotFinalizedError,
    );
    expect(
      await prisma.purchaseOccasion.count({ where: { originIntentId: open.intent.intentId } }),
    ).toBe(0);
  });

  it('an ALREADY-invalidated intent cannot mint a NEW identity (A2 exclusion is respected)', async () => {
    const fx = await grantedAssignment();
    const { intent } = await finalizedIntent(fx);
    await invalidatePurchaseIntent({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      invalidatedIntentId: intent.intentId,
      reasonCode: 'PARTICIPANT_CORRECTION',
      idempotencyKey: `inv-${uid()}`,
    });
    await expect(materialize(fx, intent.intentId)).rejects.toBeInstanceOf(
      PurchaseIntentInvalidatedError,
    );
    expect(
      await prisma.purchaseOccasion.count({ where: { originIntentId: intent.intentId } }),
    ).toBe(0);
  });

  it('an occasion materialized BEFORE invalidation survives it, and B1 stores no effectiveness flag', async () => {
    const fx = await grantedAssignment();
    const { intent } = await finalizedIntent(fx);
    const occ = await materialize(fx, intent.intentId);
    await invalidatePurchaseIntent({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      invalidatedIntentId: intent.intentId,
      reasonCode: 'DATA_ENTRY_ERROR',
      idempotencyKey: `inv-${uid()}`,
    });
    // The historical identity is intact and still readable...
    const loaded = await loadPurchaseOccasion({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      occasionId: occ.occasionId,
    });
    expect(loaded!.occasionId).toBe(occ.occasionId);
    // ...and non-effectiveness stays DERIVED from the A2 invalidation row, never copied onto B1.
    const columns = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'purchase_occasion'`,
    );
    const names = columns.map((c) => c.column_name);
    for (const forbidden of [
      'invalidated',
      'effective',
      'isEffective',
      'actualTransactionAt',
      'purchaseFingerprint',
      'thresholdStatus',
    ]) {
      expect(names, forbidden).not.toContain(forbidden);
    }
  });

  it('a participant cannot materialize or read an occasion of another assignment', async () => {
    const owner = await grantedAssignment();
    const attacker = await grantedAssignment();
    const { intent } = await finalizedIntent(owner);

    // Wrong actor claiming the owner assignment.
    await expect(
      materializePurchaseOccasion({
        trustedParticipantContext: attacker.context,
        assignmentId: owner.assignmentId,
        intentId: intent.intentId,
        idempotencyKey: `occ-${uid()}`,
      }),
    ).rejects.toBeInstanceOf(PurchaseIntentOwnershipError);

    // Own assignment, but somebody else's intent.
    await expect(
      materializePurchaseOccasion({
        trustedParticipantContext: attacker.context,
        assignmentId: attacker.assignmentId,
        intentId: intent.intentId,
        idempotencyKey: `occ-${uid()}`,
      }),
    ).rejects.toBeInstanceOf(PurchaseIntentOwnershipError);

    const occ = await materialize(owner, intent.intentId);
    await expect(
      loadPurchaseOccasion({
        trustedParticipantContext: attacker.context,
        assignmentId: attacker.assignmentId,
        occasionId: occ.occasionId,
      }),
    ).rejects.toBeInstanceOf(PurchaseIntentOwnershipError);
  });

  it('B1 neither requires nor produces an A2 decision — and never disturbs one', async () => {
    const fx = await grantedAssignment();
    const { intent } = await finalizedIntent(fx);
    const occ = await materialize(fx, intent.intentId);
    // The accepted A2 decision saga still works, unchanged, after the occasion exists.
    const decision = await requestPurchaseIntentDecision({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      intentId: intent.intentId,
    });
    expect(decision.snapshotId).toBeTruthy();
    // ...and the occasion holds NO decision/snapshot reference (that binding is A2's, C1 will attribute).
    const row = await prisma.purchaseOccasion.findUniqueOrThrow({ where: { id: occ.occasionId } });
    expect(Object.keys(row)).not.toContain('snapshotId');
    expect(Object.keys(row)).not.toContain('decisionRequestId');
  });

  it('withdrawal after finalization does NOT block materialization (internal processing, not new collection)', async () => {
    // RT-11 D/E: missingness/withdrawal must never make GREEN easier by silently removing already
    // collected opportunities. Materialization derives from durable A2 facts only — no consent read.
    const fx = await grantedAssignment();
    const { intent } = await finalizedIntent(fx);
    await recordConsentWithdrawal({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      idempotencyKey: `cw-${uid()}`,
    });
    const occ = await materialize(fx, intent.intentId);
    expect(occ.resultKind).toBe('MATERIALIZED');
  });
});

// ===================================================================================================
describe('B1 database invariants — enforced by PostgreSQL, not by application code (§14 F/G)', () => {
  it('UPDATE / DELETE / TRUNCATE on an occasion are rejected at the DB level (identity never mutates)', async () => {
    const fx = await grantedAssignment();
    const { intent } = await finalizedIntent(fx);
    const occ = await materialize(fx, intent.intentId);

    await expect(
      prisma.$executeRawUnsafe(
        `UPDATE "purchase_occasion" SET "merchantId" = 'm_other' WHERE "id" = '${occ.occasionId}'::uuid`,
      ),
    ).rejects.toThrow();
    await expect(
      prisma.$executeRawUnsafe(
        `DELETE FROM "purchase_occasion" WHERE "id" = '${occ.occasionId}'::uuid`,
      ),
    ).rejects.toThrow();
    await expect(prisma.$executeRawUnsafe(`TRUNCATE "purchase_occasion"`)).rejects.toThrow();
    // ...and the receipt table is equally append-only.
    await expect(
      prisma.$executeRawUnsafe(
        `UPDATE "purchase_occasion_materialization_receipt" SET "requestHash" = 'x' WHERE "occasionId" = '${occ.occasionId}'::uuid`,
      ),
    ).rejects.toThrow();
    // The row is untouched.
    const row = await prisma.purchaseOccasion.findUniqueOrThrow({ where: { id: occ.occasionId } });
    expect(row.merchantId).toBe(BILL.merchantId);
  });

  it('UNIQUE(originIntentId) blocks a second identity even on a DIRECT raw insert', async () => {
    const fx = await grantedAssignment();
    const { intent, ctx, fin } = await finalizedIntent(fx);
    await materialize(fx, intent.intentId);
    await expect(
      prisma.$executeRawUnsafe(
        `INSERT INTO "purchase_occasion"
           ("occasionSchemaVersion","originIntentId","originFinalizationId","originContextVersionId",
            "assignmentId","merchantId","intendedTransactionAt","identityDigest","materializedAt")
         VALUES ('${B1_OCCASION_SCHEMA_VERSION_V1}','${intent.intentId}'::uuid,'${fin.finalizationId}'::uuid,
                 '${ctx.contextVersionId}'::uuid,'${fx.assignmentId}'::uuid,'${BILL.merchantId}',
                 '${INTENDED_AT}'::timestamptz,'${'a'.repeat(64)}', now())`,
      ),
    ).rejects.toThrow();
    expect(
      await prisma.purchaseOccasion.count({ where: { originIntentId: intent.intentId } }),
    ).toBe(1);
  });

  it('the coherence trigger rejects every forged identity fact on a raw insert', async () => {
    const fx = await grantedAssignment();
    const mine = await finalizedIntent(fx);
    const other = await finalizedIntent(fx);
    const otherFx = await grantedAssignment();
    const foreign = await finalizedIntent(otherFx);
    const D = 'b'.repeat(64);

    const insert = (cols: {
      intent: string;
      fin: string;
      ctx: string;
      asg: string;
      merchant?: string;
      at?: string;
      version?: string;
      digest?: string;
    }) =>
      prisma.$executeRawUnsafe(
        `INSERT INTO "purchase_occasion"
           ("occasionSchemaVersion","originIntentId","originFinalizationId","originContextVersionId",
            "assignmentId","merchantId","intendedTransactionAt","identityDigest","materializedAt")
         VALUES ('${cols.version ?? B1_OCCASION_SCHEMA_VERSION_V1}','${cols.intent}'::uuid,
                 '${cols.fin}'::uuid,'${cols.ctx}'::uuid,'${cols.asg}'::uuid,
                 '${cols.merchant ?? BILL.merchantId}','${cols.at ?? INTENDED_AT}'::timestamptz,
                 '${cols.digest ?? D}', now())`,
      );

    const ok = {
      intent: mine.intent.intentId,
      fin: mine.fin.finalizationId,
      ctx: mine.ctx.contextVersionId,
      asg: fx.assignmentId,
    };
    // A finalization belonging to another intent.
    await expect(insert({ ...ok, fin: other.fin.finalizationId })).rejects.toThrow();
    // A context version the finalization did not pin (and that belongs to another intent).
    await expect(insert({ ...ok, ctx: other.ctx.contextVersionId })).rejects.toThrow();
    // An assignment that is not the origin intent capture-token assignment.
    await expect(insert({ ...ok, asg: otherFx.assignmentId })).rejects.toThrow();
    // A merchant that is not the pinned context merchant.
    await expect(insert({ ...ok, merchant: 'm_forged' })).rejects.toThrow();
    // An intended instant that is not the pinned context instant.
    await expect(insert({ ...ok, at: '2026-07-29T12:00:00-05:00' })).rejects.toThrow();
    // An unknown identity schema version (CHECK).
    await expect(insert({ ...ok, version: 'pagamenos.purchase-occasion.v99' })).rejects.toThrow();
    // A malformed identity digest (CHECK).
    await expect(insert({ ...ok, digest: 'not-a-sha256' })).rejects.toThrow();
    // A nonexistent origin intent (FK).
    await expect(insert({ ...ok, intent: randomUUID() })).rejects.toThrow();
    // Nothing above created a row.
    expect(
      await prisma.purchaseOccasion.count({ where: { originIntentId: mine.intent.intentId } }),
    ).toBe(0);
    expect(foreign.intent.intentId).toBeTruthy();

    // ...and the honest insert (the exact A2-derived facts) is accepted, proving the trigger is not
    // simply rejecting everything.
    const honest = normalizeOccasionIdentityFacts({
      occasionSchemaVersion: B1_OCCASION_SCHEMA_VERSION_V1,
      originIntentId: ok.intent,
      originFinalizationId: ok.fin,
      originContextVersionId: ok.ctx,
      assignmentId: ok.asg,
      merchantId: BILL.merchantId,
      intendedTransactionAt: INTENDED_AT,
    });
    await insert({ ...ok, digest: computeOccasionIdentityDigest(honest) });
    expect(await prisma.purchaseOccasion.count({ where: { originIntentId: ok.intent } })).toBe(1);
  });

  it('the coherence trigger rejects an occasion for an intent invalidated out of band', async () => {
    const fx = await grantedAssignment();
    const { intent, ctx, fin } = await finalizedIntent(fx);
    await invalidatePurchaseIntent({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      invalidatedIntentId: intent.intentId,
      reasonCode: 'OTHER',
      idempotencyKey: `inv-${uid()}`,
    });
    await expect(
      prisma.$executeRawUnsafe(
        `INSERT INTO "purchase_occasion"
           ("occasionSchemaVersion","originIntentId","originFinalizationId","originContextVersionId",
            "assignmentId","merchantId","intendedTransactionAt","identityDigest","materializedAt")
         VALUES ('${B1_OCCASION_SCHEMA_VERSION_V1}','${intent.intentId}'::uuid,'${fin.finalizationId}'::uuid,
                 '${ctx.contextVersionId}'::uuid,'${fx.assignmentId}'::uuid,'${BILL.merchantId}',
                 '${INTENDED_AT}'::timestamptz,'${'c'.repeat(64)}', now())`,
      ),
    ).rejects.toThrow();
  });

  it('the receipt operationScope CHECK rejects a forged scope, and its FK rejects an orphan', async () => {
    const fx = await grantedAssignment();
    const { intent } = await finalizedIntent(fx);
    const occ = await materialize(fx, intent.intentId);
    await expect(
      prisma.$executeRawUnsafe(
        `INSERT INTO "purchase_occasion_materialization_receipt"
           ("operationScope","idempotencyKey","requestHash","resultKind","occasionId")
         VALUES ('FORGED_SCOPE','k','h','MATERIALIZED','${occ.occasionId}'::uuid)`,
      ),
    ).rejects.toThrow();
    await expect(
      prisma.$executeRawUnsafe(
        `INSERT INTO "purchase_occasion_materialization_receipt"
           ("operationScope","idempotencyKey","requestHash","resultKind","occasionId")
         VALUES ('${OCCASION_MATERIALIZE_OPERATION_SCOPE}','k-${uid()}','h','MATERIALIZED','${randomUUID()}'::uuid)`,
      ),
    ).rejects.toThrow();
  });

  it('an origin intent/finalization/context can never be deleted out from under an occasion', async () => {
    const fx = await grantedAssignment();
    const { intent } = await finalizedIntent(fx);
    await materialize(fx, intent.intentId);
    // (The A2 tables are append-only anyway; this proves the B1 FKs are RESTRICT, not CASCADE, so no
    // future relaxation of A2 immutability could orphan or silently erase an opportunity identity.)
    const fks = await prisma.$queryRawUnsafe<Array<{ conname: string; confdeltype: string }>>(
      `SELECT conname, confdeltype FROM pg_constraint
        WHERE conrelid = '"purchase_occasion"'::regclass AND contype = 'f'`,
    );
    expect(fks).toHaveLength(4);
    for (const fk of fks) expect(fk.confdeltype, fk.conname).toBe('r'); // 'r' = RESTRICT
  });
});

// ===================================================================================================
// Deterministic barrier on the PurchaseIntent ROOT lock — the ACTUAL B1 serialization point. A
// dedicated connection holds `SELECT ... FOR UPDATE` on the intent row; the competing operations are
// launched, PROVEN still pending after a settle window, then released so they serialize for real.
async function raceAtIntentRootLock(
  intentId: string,
  ops: Array<() => Promise<unknown>>,
): Promise<Array<{ status: 'fulfilled' | 'rejected'; value?: unknown; reason?: unknown }>> {
  const holder = newClient();
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  let acquired!: () => void;
  const acquiredP = new Promise<void>((r) => (acquired = r));
  const held = holder.$transaction(
    async (tx) => {
      await tx.$queryRawUnsafe(
        `SELECT "id" FROM "purchase_intent" WHERE "id" = '${intentId}'::uuid FOR UPDATE`,
      );
      acquired();
      await gate;
    },
    { timeout: 30000 },
  );
  await acquiredP;
  const settled = ops.map((op) =>
    op().then(
      (value: unknown) => ({ status: 'fulfilled' as const, value }),
      (reason: unknown) => ({ status: 'rejected' as const, reason }),
    ),
  );
  const probe = await Promise.race([
    Promise.all(settled).then(() => 'done'),
    new Promise((r) => setTimeout(() => r('pending'), 400)),
  ]);
  expect(probe).toBe('pending'); // every op is blocked on the intent ROOT lock
  release();
  await held;
  return Promise.all(settled);
}

describe('B1 concurrency — the database prevents duplicate durable identities (§14 F)', () => {
  it('two concurrent materializations of one intent (separate connections) yield ONE occasion', async () => {
    const fx = await grantedAssignment();
    const { intent } = await finalizedIntent(fx);
    const repoA = new PurchaseOccasionRepository(newClient());
    const repoB = new PurchaseOccasionRepository(newClient());

    const results = await raceAtIntentRootLock(intent.intentId, [
      () =>
        materializePurchaseOccasionWithDeps(
          {
            trustedParticipantContext: fx.context,
            assignmentId: fx.assignmentId,
            intentId: intent.intentId,
            idempotencyKey: `occ-a-${uid()}`,
          },
          { repository: repoA },
        ),
      () =>
        materializePurchaseOccasionWithDeps(
          {
            trustedParticipantContext: fx.context,
            assignmentId: fx.assignmentId,
            intentId: intent.intentId,
            idempotencyKey: `occ-b-${uid()}`,
          },
          { repository: repoB },
        ),
    ]);

    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    const ids = results.map((r) => (r.value as { occasionId: string }).occasionId);
    expect(new Set(ids).size).toBe(1);
    const kinds = results.map((r) => (r.value as { resultKind: string }).resultKind).sort();
    expect(kinds).toEqual(['MATERIALIZED', 'OCCASION_ALIAS']);
    expect(
      await prisma.purchaseOccasion.count({ where: { originIntentId: intent.intentId } }),
    ).toBe(1);
  });

  it('five concurrent attempts under the SAME transport key still yield ONE occasion', async () => {
    const fx = await grantedAssignment();
    const { intent } = await finalizedIntent(fx);
    const key = `occ-${uid()}`;
    const repos = [0, 1, 2, 3, 4].map(() => new PurchaseOccasionRepository(newClient()));
    const results = await raceAtIntentRootLock(
      intent.intentId,
      repos.map(
        (repository) => () =>
          materializePurchaseOccasionWithDeps(
            {
              trustedParticipantContext: fx.context,
              assignmentId: fx.assignmentId,
              intentId: intent.intentId,
              idempotencyKey: key,
            },
            { repository },
          ),
      ),
    );
    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    const ids = results.map((r) => (r.value as { occasionId: string }).occasionId);
    expect(new Set(ids).size).toBe(1);
    expect(
      await prisma.purchaseOccasion.count({ where: { originIntentId: intent.intentId } }),
    ).toBe(1);
    // One transport key ⇒ exactly one receipt, no matter how many concurrent attempts presented it.
    expect(
      await prisma.purchaseOccasionMaterializationReceipt.count({
        where: { operationScope: OCCASION_MATERIALIZE_OPERATION_SCOPE, idempotencyKey: key },
      }),
    ).toBe(1);
  });

  it('materialization racing an invalidation on the same intent leaves a coherent outcome', async () => {
    const fx = await grantedAssignment();
    const { intent } = await finalizedIntent(fx);
    const repo = new PurchaseOccasionRepository(newClient());

    const results = await raceAtIntentRootLock(intent.intentId, [
      () =>
        materializePurchaseOccasionWithDeps(
          {
            trustedParticipantContext: fx.context,
            assignmentId: fx.assignmentId,
            intentId: intent.intentId,
            idempotencyKey: `occ-${uid()}`,
          },
          { repository: repo },
        ),
      () =>
        invalidatePurchaseIntent({
          trustedParticipantContext: fx.context,
          assignmentId: fx.assignmentId,
          invalidatedIntentId: intent.intentId,
          reasonCode: 'PARTICIPANT_CORRECTION',
          idempotencyKey: `inv-${uid()}`,
        }),
    ]);

    const [mat, inv] = results;
    // The invalidation always succeeds (it is the terminal A2 state).
    expect(inv!.status).toBe('fulfilled');
    const count = await prisma.purchaseOccasion.count({
      where: { originIntentId: intent.intentId },
    });
    if (mat!.status === 'fulfilled') {
      // Materialization won the lock: the identity exists and survives the later invalidation.
      expect(count).toBe(1);
    } else {
      // Invalidation won: the NEW identity is refused with the accepted A2 typed error, no phantom row.
      expect(mat!.reason).toBeInstanceOf(PurchaseIntentInvalidatedError);
      expect(count).toBe(0);
    }
  });

  it('a rolled-back materialization leaves NO phantom identity', async () => {
    const fx = await grantedAssignment();
    const { intent } = await finalizedIntent(fx);
    // A repository whose clock throws AFTER the A2 authorities are derived: the transaction aborts.
    const boom = new PurchaseOccasionRepository(newClient(), () => {
      throw new Error('clock failure inside the transaction');
    });
    await expect(
      materializePurchaseOccasionWithDeps(
        {
          trustedParticipantContext: fx.context,
          assignmentId: fx.assignmentId,
          intentId: intent.intentId,
          idempotencyKey: `occ-${uid()}`,
        },
        { repository: boom },
      ),
    ).rejects.toThrow();
    expect(
      await prisma.purchaseOccasion.count({ where: { originIntentId: intent.intentId } }),
    ).toBe(0);
    expect(
      await prisma.purchaseOccasionMaterializationReceipt.count({
        where: { occasion: { originIntentId: intent.intentId } },
      }),
    ).toBe(0);
    // The intent is still perfectly materializable afterwards — no key was silently consumed.
    const ok = await materialize(fx, intent.intentId);
    expect(ok.resultKind).toBe('MATERIALIZED');
  });
});

// ===================================================================================================
describe('B1 adversarial schema audit — the shape itself cannot hide an identity defect', () => {
  it('NO B1 column is nullable, so no NULL can weaken a uniqueness key in PostgreSQL', async () => {
    const cols = await prisma.$queryRawUnsafe<Array<{ column_name: string; is_nullable: string }>>(
      `SELECT column_name, is_nullable FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN ('purchase_occasion','purchase_occasion_materialization_receipt')`,
    );
    expect(cols.length).toBeGreaterThan(0);
    expect(cols.filter((c) => c.is_nullable !== 'NO').map((c) => c.column_name)).toEqual([]);
  });

  it('every B1 index is TOTAL — no partial index whose predicate could exempt rows', async () => {
    const idx = await prisma.$queryRawUnsafe<Array<{ indexname: string; indexdef: string }>>(
      `SELECT indexname, indexdef FROM pg_indexes
        WHERE tablename IN ('purchase_occasion','purchase_occasion_materialization_receipt')`,
    );
    expect(idx.length).toBeGreaterThan(0);
    for (const i of idx) expect(i.indexdef, i.indexname).not.toMatch(/\sWHERE\s/i);
  });

  it('the identity digest is an integrity fingerprint, NOT a second competing identity', async () => {
    const uniques = await prisma.$queryRawUnsafe<Array<{ indexdef: string }>>(
      `SELECT indexdef FROM pg_indexes WHERE tablename = 'purchase_occasion'`,
    );
    // No UNIQUE index mentions identityDigest — a digest can never become an identity key.
    for (const u of uniques) {
      if (/UNIQUE/i.test(u.indexdef)) expect(u.indexdef).not.toMatch(/identityDigest/);
    }
    // ...and exactly the three origin-uniqueness indexes plus the primary key are UNIQUE.
    const uniqueDefs = uniques.filter((u) => /UNIQUE/i.test(u.indexdef)).map((u) => u.indexdef);
    expect(uniqueDefs).toHaveLength(4);
  });

  it('NO timestamp participates in a B1 uniqueness key (time is never an identity substitute)', async () => {
    const uniques = await prisma.$queryRawUnsafe<Array<{ indexdef: string }>>(
      `SELECT indexdef FROM pg_indexes
        WHERE tablename IN ('purchase_occasion','purchase_occasion_materialization_receipt')
          AND indexdef ILIKE '%UNIQUE%'`,
    );
    for (const u of uniques) {
      expect(u.indexdef).not.toMatch(/materializedAt|createdAt|intendedTransactionAt/);
    }
  });

  it('materializedAt has NO database default — a time is never silently invented for an identity', async () => {
    const d = await prisma.$queryRawUnsafe<
      Array<{ column_name: string; column_default: string | null }>
    >(
      `SELECT column_name, column_default FROM information_schema.columns
        WHERE table_name = 'purchase_occasion' AND column_name = 'materializedAt'`,
    );
    expect(d[0]!.column_default).toBeNull();
    // A raw insert omitting it is refused outright.
    await expect(
      prisma.$executeRawUnsafe(
        `INSERT INTO "purchase_occasion"
           ("occasionSchemaVersion","originIntentId","originFinalizationId","originContextVersionId",
            "assignmentId","merchantId","intendedTransactionAt","identityDigest")
         VALUES ('${B1_OCCASION_SCHEMA_VERSION_V1}','${randomUUID()}'::uuid,'${randomUUID()}'::uuid,
                 '${randomUUID()}'::uuid,'${randomUUID()}'::uuid,'m','${INTENDED_AT}'::timestamptz,'${'d'.repeat(64)}')`,
      ),
    ).rejects.toThrow();
  });

  it('the B1 migration did not alter the accepted A2 / M3.5A table shapes', async () => {
    // A regression guard on the "additive only" claim: the accepted tables keep exactly the columns
    // the accepted migrations created, and gain no B1 column.
    const named = async (table: string): Promise<string[]> => {
      const rows = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
        `SELECT column_name FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = '${table}' ORDER BY column_name`,
      );
      return rows.map((r) => r.column_name);
    };
    expect(await named('purchase_intent')).toEqual([
      'captureTokenId',
      'createdAt',
      'id',
      'initiatedAt',
      'intentType',
    ]);
    expect(await named('purchase_intent_finalization')).toEqual([
      'contextVersionId',
      'eligibilityProfileVersionId',
      'finalizedAt',
      'id',
      'intentId',
    ]);
    expect(await named('experiment_assignment')).toEqual([
      'createdAt',
      'enrolledAt',
      'experimentId',
      'id',
      'observationStartAt',
      'participantId',
    ]);
    for (const t of [
      'purchase_intent',
      'purchase_intent_finalization',
      'purchase_intent_context_version',
      'experiment_assignment',
      'decision_snapshot',
    ]) {
      const cols = await named(t);
      for (const leaked of ['occasionId', 'purchaseOccasionId', 'originIntentId']) {
        expect(cols, `${t}.${leaked}`).not.toContain(leaked);
      }
    }
  });
});

// ===================================================================================================
describe('B1 referential integrity — an occasion id always denotes a real, coherent opportunity', () => {
  it('an unknown origin intent is refused before any row exists', async () => {
    const fx = await grantedAssignment();
    await expect(materialize(fx, randomUUID())).rejects.toBeInstanceOf(
      PurchaseOccasionInvariantError,
    );
  });

  it('every occasion resolves to exactly one intent, finalization and context version', async () => {
    const fx = await grantedAssignment();
    const { intent, ctx, fin } = await finalizedIntent(fx);
    const occ = await materialize(fx, intent.intentId);
    const joined = await prisma.purchaseOccasion.findUniqueOrThrow({
      where: { id: occ.occasionId },
      include: {
        originIntent: { select: { id: true, captureToken: { select: { assignmentId: true } } } },
        originFinalization: { select: { id: true, intentId: true, contextVersionId: true } },
        originContextVersion: { select: { id: true, intentId: true, merchantId: true } },
        assignment: { select: { id: true, participantId: true } },
      },
    });
    expect(joined.originIntent.id).toBe(intent.intentId);
    expect(joined.originFinalization.id).toBe(fin.finalizationId);
    expect(joined.originFinalization.intentId).toBe(intent.intentId);
    expect(joined.originFinalization.contextVersionId).toBe(ctx.contextVersionId);
    expect(joined.originContextVersion.id).toBe(ctx.contextVersionId);
    expect(joined.originContextVersion.intentId).toBe(intent.intentId);
    expect(joined.originIntent.captureToken.assignmentId).toBe(fx.assignmentId);
    expect(joined.assignment.id).toBe(fx.assignmentId);
    expect(joined.assignment.participantId).toBe(fx.participantId);
  });
});

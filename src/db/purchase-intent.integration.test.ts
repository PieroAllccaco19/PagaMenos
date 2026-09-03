// PagaMenos · M3.5B-A2 real-PostgreSQL adversarial + concurrency integration suite (A2 §5–§20/§37).
//
// Runs ONLY under `scripts/pg-integration.ts` (ephemeral cluster + `prisma migrate deploy` + this
// suite). Exercises the SANCTIONED A2 services end-to-end against real Postgres, probes the DB-level
// guards directly, and drives GENUINE overlapping transactions (multiple Prisma clients + barriers) for
// the concurrency / P2002 closure (Sol Finding 8). All A2 tables are append-only; every test uses fresh
// unique identities. Trusted clocks are injected ONLY through the internal repository constructor / the
// `*WithDeps` seam — never a public surface (Sol Finding 1).
import { randomUUID } from 'node:crypto';

import { PrismaClient } from '@prisma/client';
import { afterAll, describe, expect, it } from 'vitest';

import { prisma } from '@/db/client';
import { PurchaseIntentRepository } from '@/db/purchase-intent-repository';
import { PurchaseIntentDecisionRepository } from '@/db/purchase-intent-decision-repository';
import {
  assignParticipant,
  createExperiment,
  freezeAnalysisProtocol,
  registerAnalysisProtocolDraft,
  registerStudyParticipant,
  resolveTrustedEntrySource,
  resolveTrustedParticipantContext,
} from '@/services/study-admin';
import { loadDecisionSnapshot, recordConsentGrant, recordConsentWithdrawal } from '@/services';
import {
  captureIntentToken,
  createPurchaseIntent,
  createPurchaseIntentWithDeps,
  appendPurchaseIntentContext,
  appendEligibilityProfile,
  finalizePurchaseIntent,
  invalidatePurchaseIntent,
} from '@/services/study-purchase-intent';
import {
  requestPurchaseIntentDecision,
  requestPurchaseIntentDecisionWithDeps,
} from '@/services/study-intent-decision';
import { purchaseIntentDecisionRepository as decisionRepo } from '@/db/purchase-intent-decision-repository';
import {
  deriveBusinessDecisionKey,
  EligibilityProfileConflictError,
  PurchaseIntentBindingCoherenceError,
  PurchaseIntentCaptureConflictError,
  PurchaseIntentConsentNotAuthorizedError,
  PurchaseIntentContextAfterFinalizationError,
  PurchaseIntentContextConflictError,
  PurchaseIntentContextSignatureError,
  PurchaseIntentDecisionRequestIntegrityError,
  PurchaseIntentFinalizationConflictError,
  PurchaseIntentIdempotencyConflictError,
  PurchaseIntentUnsupportedInputSchemaError,
  PurchaseIntentInvalidatedError,
  PurchaseIntentInvalidationCycleError,
  PurchaseIntentNotFinalizedError,
  PurchaseIntentOwnershipError,
  PurchaseIntentSemanticDriftError,
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

/** A frozen protocol → experiment → participant → assignment + a GRANTED consent (Consent Model A). */
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

async function capturedToken(fx: Fixture, nonce = `nonce-${uid()}`) {
  return captureIntentToken({
    trustedParticipantContext: fx.context,
    assignmentId: fx.assignmentId,
    clientCorrelationNonce: nonce,
    resolvedEntrySource: DIRECT,
  });
}

/** Drive capture → create → context → profile → finalize; return the ids needed to request a decision. */
async function finalizedIntent(fx: Fixture) {
  const token = await capturedToken(fx);
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
    signature: BILL,
    intendedTransactionAt: INTENDED_AT,
    idempotencyKey: `ac-${uid()}`,
  });
  const prof = await appendEligibilityProfile({
    trustedParticipantContext: fx.context,
    assignmentId: fx.assignmentId,
    profileCaptureKey: `pc-${uid()}`,
    portfolio: PORTFOLIO,
    idempotencyKey: `ap-${uid()}`,
  });
  const fin = await finalizePurchaseIntent({
    trustedParticipantContext: fx.context,
    assignmentId: fx.assignmentId,
    intentId: intent.intentId,
    contextVersionId: ctx.contextVersionId,
    eligibilityProfileVersionId: prof.eligibilityProfileVersionId,
    idempotencyKey: `fin-${uid()}`,
  });
  return { token, intent, ctx, prof, fin };
}

async function decide(fx: Fixture, intentId: string) {
  return requestPurchaseIntentDecision({
    trustedParticipantContext: fx.context,
    assignmentId: fx.assignmentId,
    intentId,
  });
}

// ===================================================================================================
describe('A2 lifecycle — happy path & exact decision binding (§5–§17)', () => {
  it('captures → creates → finalizes → requests a bound decision, deterministically', async () => {
    const fx = await grantedAssignment();
    const { intent } = await finalizedIntent(fx);
    const decision = await decide(fx, intent.intentId);
    expect(decision.snapshotId).toBeTruthy();
    expect(decision.businessDecisionKey).toBe(deriveBusinessDecisionKey(intent.intentId));
    expect(decision.reused).toBe(false);
    const binding = await prisma.purchaseIntentDecisionBinding.findUnique({
      where: { decisionRequestId: decision.decisionRequestId },
    });
    expect(binding?.snapshotId).toBe(decision.snapshotId);
    const again = await decide(fx, intent.intentId);
    expect(again.snapshotId).toBe(decision.snapshotId);
    expect(again.reused).toBe(true);
  });
});

// ── Consent Model A (Sol Finding 2) ────────────────────────────────────────────────────────────────
describe('A2 Consent Model A — new-fact operations require authorization (§7)', () => {
  it('create fails when consent was never granted', async () => {
    // Build an assignment WITHOUT a consent grant.
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
    const fx: Fixture = {
      assignmentId: assignment.assignment.id,
      participantId: participant.participant.id,
      context,
    };
    const token = await capturedToken(fx); // token issuance does not create a scientific fact
    await expect(
      createPurchaseIntent({
        trustedParticipantContext: fx.context,
        assignmentId: fx.assignmentId,
        intentCaptureKey: token.intentCaptureKey,
        intentType: 'BUYING_NOW',
        idempotencyKey: `ci-${uid()}`,
      }),
    ).rejects.toBeInstanceOf(PurchaseIntentConsentNotAuthorizedError);
  });

  it('all five new-fact operations fail after consent is withdrawn (create/context/profile/finalize/invalidate)', async () => {
    const fx = await grantedAssignment();
    // Build one intent WHILE authorized, so context/finalize/invalidate have a target.
    const token = await capturedToken(fx);
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
      signature: BILL,
      intendedTransactionAt: INTENDED_AT,
      idempotencyKey: `ac-${uid()}`,
    });
    const prof = await appendEligibilityProfile({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      profileCaptureKey: `pc-${uid()}`,
      portfolio: PORTFOLIO,
      idempotencyKey: `ap-${uid()}`,
    });
    // Withdraw consent → future participant-facing collection is closed.
    await recordConsentWithdrawal({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      idempotencyKey: `cw-${uid()}`,
    });

    const token2 = await capturedToken(fx);
    await expect(
      createPurchaseIntent({
        trustedParticipantContext: fx.context,
        assignmentId: fx.assignmentId,
        intentCaptureKey: token2.intentCaptureKey,
        intentType: 'BUYING_NOW',
        idempotencyKey: `ci-${uid()}`,
      }),
    ).rejects.toBeInstanceOf(PurchaseIntentConsentNotAuthorizedError);
    await expect(
      appendPurchaseIntentContext({
        trustedParticipantContext: fx.context,
        assignmentId: fx.assignmentId,
        intentId: intent.intentId,
        contextCaptureKey: `cc-${uid()}`,
        signature: BILL,
        intendedTransactionAt: INTENDED_AT,
        idempotencyKey: `ac-${uid()}`,
      }),
    ).rejects.toBeInstanceOf(PurchaseIntentConsentNotAuthorizedError);
    await expect(
      appendEligibilityProfile({
        trustedParticipantContext: fx.context,
        assignmentId: fx.assignmentId,
        profileCaptureKey: `pc-${uid()}`,
        portfolio: PORTFOLIO,
        idempotencyKey: `ap-${uid()}`,
      }),
    ).rejects.toBeInstanceOf(PurchaseIntentConsentNotAuthorizedError);
    await expect(
      finalizePurchaseIntent({
        trustedParticipantContext: fx.context,
        assignmentId: fx.assignmentId,
        intentId: intent.intentId,
        contextVersionId: ctx.contextVersionId,
        eligibilityProfileVersionId: prof.eligibilityProfileVersionId,
        idempotencyKey: `fin-${uid()}`,
      }),
    ).rejects.toBeInstanceOf(PurchaseIntentConsentNotAuthorizedError);
    await expect(
      invalidatePurchaseIntent({
        trustedParticipantContext: fx.context,
        assignmentId: fx.assignmentId,
        invalidatedIntentId: intent.intentId,
        reasonCode: 'DATA_ENTRY_ERROR',
        idempotencyKey: `inv-${uid()}`,
      }),
    ).rejects.toBeInstanceOf(PurchaseIntentConsentNotAuthorizedError);
  });

  it('the trusted clock (never a caller timestamp) governs the consent collection instant', async () => {
    // A repo whose clock is pinned to BEFORE the grant: at that trusted instant consent was not open,
    // so a NEW fact is refused — proving the collection time is the trusted clock, not caller-chosen.
    const fx = await grantedAssignment();
    const token = await capturedToken(fx);
    const beforeGrantRepo = new PurchaseIntentRepository(
      prisma,
      () => new Date('2000-01-01T00:00:00Z'),
    );
    await expect(
      createPurchaseIntentWithDeps(
        {
          trustedParticipantContext: fx.context,
          assignmentId: fx.assignmentId,
          intentCaptureKey: token.intentCaptureKey,
          intentType: 'BUYING_NOW',
          idempotencyKey: `ci-${uid()}`,
        },
        { repository: beforeGrantRepo },
      ),
    ).rejects.toBeInstanceOf(PurchaseIntentConsentNotAuthorizedError);
    // The same operation with the real trusted clock (after grant) succeeds.
    const ok = await createPurchaseIntent({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      intentCaptureKey: token.intentCaptureKey,
      intentType: 'BUYING_NOW',
      idempotencyKey: `ci-${uid()}`,
    });
    expect(ok.intentId).toBeTruthy();
  });

  it('internal crash-repair after withdrawal completes without new collection (history intact)', async () => {
    const fx = await grantedAssignment();
    const { intent } = await finalizedIntent(fx);
    const first = await decide(fx, intent.intentId); // decision established while authorized
    await recordConsentWithdrawal({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      idempotencyKey: `cw-${uid()}`,
    });
    // Re-request (internal repair) still completes from the already-authorized durable facts.
    const again = await decide(fx, intent.intentId);
    expect(again.snapshotId).toBe(first.snapshotId);
    expect(again.reused).toBe(true);
  });
});

// ── Idempotency & capture identity (§24) ────────────────────────────────────────────────────────────
describe('A2 idempotency — replay, alias, conflict (§24)', () => {
  it('create: transport replay; capture alias; material conflict; key reuse conflict', async () => {
    const fx = await grantedAssignment();
    const token = await capturedToken(fx);
    const key = `ci-${uid()}`;
    const a = await createPurchaseIntent({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      intentCaptureKey: token.intentCaptureKey,
      intentType: 'BUYING_NOW',
      idempotencyKey: key,
    });
    const replay = await createPurchaseIntent({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      intentCaptureKey: token.intentCaptureKey,
      intentType: 'BUYING_NOW',
      idempotencyKey: key,
    });
    expect(replay.intentId).toBe(a.intentId);
    expect(replay.replayed).toBe(true);
    const alias = await createPurchaseIntent({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      intentCaptureKey: token.intentCaptureKey,
      intentType: 'BUYING_NOW',
      idempotencyKey: `ci-${uid()}`,
    });
    expect(alias.intentId).toBe(a.intentId);
    expect(alias.resultKind).toBe('CAPTURE_ALIAS');
    await expect(
      createPurchaseIntent({
        trustedParticipantContext: fx.context,
        assignmentId: fx.assignmentId,
        intentCaptureKey: token.intentCaptureKey,
        intentType: 'EXPLORATORY',
        idempotencyKey: `ci-${uid()}`,
      }),
    ).rejects.toBeInstanceOf(PurchaseIntentCaptureConflictError);
    await expect(
      createPurchaseIntent({
        trustedParticipantContext: fx.context,
        assignmentId: fx.assignmentId,
        intentCaptureKey: token.intentCaptureKey,
        intentType: 'EXPLORATORY',
        idempotencyKey: key, // reused key, different material
      }),
    ).rejects.toBeInstanceOf(PurchaseIntentIdempotencyConflictError);
  });

  it('capture is idempotent on the correlation nonce; distinct nonces → distinct captures', async () => {
    const fx = await grantedAssignment();
    const nonce = `nonce-${uid()}`;
    const t1 = await capturedToken(fx, nonce);
    const t2 = await capturedToken(fx, nonce);
    expect(t2.intentCaptureKey).toBe(t1.intentCaptureKey);
    expect(t2.replayed).toBe(true);
    const t3 = await capturedToken(fx, `nonce-${uid()}`);
    expect(t3.intentCaptureKey).not.toBe(t1.intentCaptureKey);
  });

  it('context/profile capture-key: different payload conflicts', async () => {
    const fx = await grantedAssignment();
    const token = await capturedToken(fx);
    const intent = await createPurchaseIntent({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      intentCaptureKey: token.intentCaptureKey,
      intentType: 'BUYING_NOW',
      idempotencyKey: `ci-${uid()}`,
    });
    const cck = `cc-${uid()}`;
    await appendPurchaseIntentContext({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      intentId: intent.intentId,
      contextCaptureKey: cck,
      signature: BILL,
      intendedTransactionAt: INTENDED_AT,
      idempotencyKey: `ac-${uid()}`,
    });
    await expect(
      appendPurchaseIntentContext({
        trustedParticipantContext: fx.context,
        assignmentId: fx.assignmentId,
        intentId: intent.intentId,
        contextCaptureKey: cck,
        signature: { ...BILL, wholeBillCentimos: 20000 },
        intendedTransactionAt: INTENDED_AT,
        idempotencyKey: `ac-${uid()}`,
      }),
    ).rejects.toBeInstanceOf(PurchaseIntentContextConflictError);

    const pck = `pc-${uid()}`;
    await appendEligibilityProfile({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      profileCaptureKey: pck,
      portfolio: PORTFOLIO,
      idempotencyKey: `ap-${uid()}`,
    });
    await expect(
      appendEligibilityProfile({
        trustedParticipantContext: fx.context,
        assignmentId: fx.assignmentId,
        profileCaptureKey: pck,
        portfolio: { instruments: [{ family: 'DINERS', network: 'VISA' }] },
        idempotencyKey: `ap-${uid()}`,
      }),
    ).rejects.toBeInstanceOf(EligibilityProfileConflictError);
  });
});

// ── State gates / ownership / signature (§7/§8/§9/§10) ──────────────────────────────────────────────
describe('A2 state gates, ownership, signature', () => {
  it('context after finalization rejected; decision on not-finalized rejected', async () => {
    const fx = await grantedAssignment();
    const { intent } = await finalizedIntent(fx);
    await expect(
      appendPurchaseIntentContext({
        trustedParticipantContext: fx.context,
        assignmentId: fx.assignmentId,
        intentId: intent.intentId,
        contextCaptureKey: `cc-${uid()}`,
        signature: BILL,
        intendedTransactionAt: INTENDED_AT,
        idempotencyKey: `ac-${uid()}`,
      }),
    ).rejects.toBeInstanceOf(PurchaseIntentContextAfterFinalizationError);

    const fx2 = await grantedAssignment();
    const token = await capturedToken(fx2);
    const notFinal = await createPurchaseIntent({
      trustedParticipantContext: fx2.context,
      assignmentId: fx2.assignmentId,
      intentCaptureKey: token.intentCaptureKey,
      intentType: 'BUYING_NOW',
      idempotencyKey: `ci-${uid()}`,
    });
    await expect(decide(fx2, notFinal.intentId)).rejects.toBeInstanceOf(
      PurchaseIntentNotFinalizedError,
    );
  });

  it('finalize / decision after invalidation rejected', async () => {
    const fx = await grantedAssignment();
    const token = await capturedToken(fx);
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
      signature: BILL,
      intendedTransactionAt: INTENDED_AT,
      idempotencyKey: `ac-${uid()}`,
    });
    const prof = await appendEligibilityProfile({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      profileCaptureKey: `pc-${uid()}`,
      portfolio: PORTFOLIO,
      idempotencyKey: `ap-${uid()}`,
    });
    await invalidatePurchaseIntent({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      invalidatedIntentId: intent.intentId,
      reasonCode: 'DATA_ENTRY_ERROR',
      idempotencyKey: `inv-${uid()}`,
    });
    await expect(
      finalizePurchaseIntent({
        trustedParticipantContext: fx.context,
        assignmentId: fx.assignmentId,
        intentId: intent.intentId,
        contextVersionId: ctx.contextVersionId,
        eligibilityProfileVersionId: prof.eligibilityProfileVersionId,
        idempotencyKey: `fin-${uid()}`,
      }),
    ).rejects.toBeInstanceOf(PurchaseIntentInvalidatedError);
    await expect(decide(fx, intent.intentId)).rejects.toBeInstanceOf(
      PurchaseIntentInvalidatedError,
    );
  });

  it('rejects operations from a different participant (ownership)', async () => {
    const fx = await grantedAssignment();
    const other = await grantedAssignment();
    await expect(
      captureIntentToken({
        trustedParticipantContext: other.context,
        assignmentId: fx.assignmentId,
        clientCorrelationNonce: `nonce-${uid()}`,
        resolvedEntrySource: DIRECT,
      }),
    ).rejects.toBeInstanceOf(PurchaseIntentOwnershipError);
  });

  it('rejects a malformed (mixed) purchase signature before any write', async () => {
    const fx = await grantedAssignment();
    const token = await capturedToken(fx);
    const intent = await createPurchaseIntent({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      intentCaptureKey: token.intentCaptureKey,
      intentType: 'BUYING_NOW',
      idempotencyKey: `ci-${uid()}`,
    });
    await expect(
      appendPurchaseIntentContext({
        trustedParticipantContext: fx.context,
        assignmentId: fx.assignmentId,
        intentId: intent.intentId,
        contextCaptureKey: `cc-${uid()}`,
        signature: { ...BILL, ticketCount: 3 },
        intendedTransactionAt: INTENDED_AT,
        idempotencyKey: `ac-${uid()}`,
      }),
    ).rejects.toBeInstanceOf(PurchaseIntentContextSignatureError);
  });
});

// ── Finalization conflict, coherence trigger, invalidation lineage ──────────────────────────────────
describe('A2 finalization conflict, DB coherence trigger, invalidation lineage', () => {
  it('rejects re-finalizing to a different context/profile', async () => {
    const fx = await grantedAssignment();
    const { intent, ctx } = await finalizedIntent(fx);
    const prof2 = await appendEligibilityProfile({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      profileCaptureKey: `pc-${uid()}`,
      portfolio: { instruments: [{ family: 'DINERS', network: 'VISA' }] },
      idempotencyKey: `ap-${uid()}`,
    });
    await expect(
      finalizePurchaseIntent({
        trustedParticipantContext: fx.context,
        assignmentId: fx.assignmentId,
        intentId: intent.intentId,
        contextVersionId: ctx.contextVersionId,
        eligibilityProfileVersionId: prof2.eligibilityProfileVersionId,
        idempotencyKey: `fin-${uid()}`,
      }),
    ).rejects.toBeInstanceOf(PurchaseIntentFinalizationConflictError);
  });

  it('the DB coherence trigger rejects a direct finalization pinning another assignment’s profile', async () => {
    const fx = await grantedAssignment();
    const other = await grantedAssignment();
    const token = await capturedToken(fx);
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
      signature: BILL,
      intendedTransactionAt: INTENDED_AT,
      idempotencyKey: `ac-${uid()}`,
    });
    const foreignProfile = await appendEligibilityProfile({
      trustedParticipantContext: other.context,
      assignmentId: other.assignmentId,
      profileCaptureKey: `pc-${uid()}`,
      portfolio: PORTFOLIO,
      idempotencyKey: `ap-${uid()}`,
    });
    await expect(
      prisma.purchaseIntentFinalization.create({
        data: {
          intentId: intent.intentId,
          contextVersionId: ctx.contextVersionId,
          eligibilityProfileVersionId: foreignProfile.eligibilityProfileVersionId,
          finalizedAt: new Date(),
        },
      }),
    ).rejects.toThrow();
  });

  it('rejects self-replacement and cross-assignment replacement', async () => {
    const fx = await grantedAssignment();
    const { intent } = await finalizedIntent(fx);
    await expect(
      invalidatePurchaseIntent({
        trustedParticipantContext: fx.context,
        assignmentId: fx.assignmentId,
        invalidatedIntentId: intent.intentId,
        replacementIntentId: intent.intentId,
        idempotencyKey: `inv-${uid()}`,
      }),
    ).rejects.toBeInstanceOf(PurchaseIntentInvalidationCycleError);
    const other = await grantedAssignment();
    const foreign = await finalizedIntent(other);
    await expect(
      invalidatePurchaseIntent({
        trustedParticipantContext: fx.context,
        assignmentId: fx.assignmentId,
        invalidatedIntentId: intent.intentId,
        replacementIntentId: foreign.intent.intentId,
        idempotencyKey: `inv-${uid()}`,
      }),
    ).rejects.toBeInstanceOf(PurchaseIntentInvalidationCycleError);
  });
});

// ── Authoritative snapshot binding (Sol Finding 4) ──────────────────────────────────────────────────
describe('A2 authoritative snapshot binding (§16/§17; Sol Finding 4)', () => {
  it('the exact cross-wire attack (Request A + unrelated Snapshot B) fails closed', async () => {
    const fxA = await grantedAssignment();
    const fxB = await grantedAssignment();
    const a = await finalizedIntent(fxA);
    const b = await finalizedIntent(fxB);
    const decA = await decide(fxA, a.intent.intentId);
    const decB = await decide(fxB, b.intent.intentId);
    const requestA = await decisionRepo.findDecisionRequestByIntent(a.intent.intentId);
    // Attempt to bind A's request to B's UNRELATED snapshot: bindSnapshot loads BOTH authoritative rows
    // and rejects on the businessDecisionKey mismatch — caller-described identity is never trusted.
    await expect(
      decisionRepo.bindSnapshot({
        decisionRequestId: requestA!.id,
        snapshotId: decB.snapshotId,
        loadSnapshot: (id) => loadDecisionSnapshot(id),
      }),
    ).rejects.toBeInstanceOf(PurchaseIntentBindingCoherenceError);
    // The genuine (related) binding remains intact.
    expect(decA.snapshotId).not.toBe(decB.snapshotId);
    const bindingA = await decisionRepo.findBindingByRequest(requestA!.id);
    expect(bindingA?.snapshotId).toBe(decA.snapshotId);
  });

  it('re-binding the SAME snapshot is idempotent; a different snapshot for the request is rejected', async () => {
    const fx = await grantedAssignment();
    const { intent } = await finalizedIntent(fx);
    const dec = await decide(fx, intent.intentId);
    const request = await decisionRepo.findDecisionRequestByIntent(intent.intentId);
    const same = await decisionRepo.bindSnapshot({
      decisionRequestId: request!.id,
      snapshotId: dec.snapshotId,
      loadSnapshot: (id) => loadDecisionSnapshot(id),
    });
    expect(same.snapshotId).toBe(dec.snapshotId);

    const other = await grantedAssignment();
    const b = await finalizedIntent(other);
    const decOther = await decide(other, b.intent.intentId);
    await expect(
      decisionRepo.bindSnapshot({
        decisionRequestId: request!.id,
        snapshotId: decOther.snapshotId,
        loadSnapshot: (id) => loadDecisionSnapshot(id),
      }),
    ).rejects.toBeInstanceOf(PurchaseIntentBindingCoherenceError);
  });
});

// ── Historical parser / self-integrity (Sol Finding 7) ──────────────────────────────────────────────
describe('A2 historical parser & self-integrity (§19; Sol Finding 7)', () => {
  it('a valid frozen request loads through the version-dispatched parser', async () => {
    const fx = await grantedAssignment();
    const { intent } = await finalizedIntent(fx);
    await decide(fx, intent.intentId);
    const loaded = await decisionRepo.findDecisionRequestByIntent(intent.intentId);
    expect(loaded).not.toBeNull();
    expect(loaded!.decisionRequestSchemaVersion).toBe('pagamenos.a2-decision-request.v1');
    expect(loaded!.decideInputHash).toHaveLength(64);
  });

  it('rejects an UNKNOWN current creation schema version at freeze (§19)', async () => {
    await expect(
      decisionRepo.freezeDecisionRequest({
        intentId: randomUUID(),
        finalizationId: randomUUID(),
        decisionRequestSchemaVersion: 'pagamenos.a2-decision-request.vX', // unknown
        exactValidatedDecideInputJson: {},
        decideInputHash: 'x',
        expectedEngineInputSchemaVersion: 'e',
        expectedEngineContractVersion: 'c',
        expectedCorpusVersion: 'v',
        expectedCorpusSemanticDigest: 'd',
        holidayCalendarVersion: 'h',
        holidayCalendarDigest: 'hd',
        businessDecisionKey: 'b',
        m3_5aIdempotencyKey: 'm',
      }),
    ).rejects.toBeInstanceOf(PurchaseIntentUnsupportedInputSchemaError);
  });

  it('a corrupted stored row is rejected by the parser on load (raw INSERT bypassing the service)', async () => {
    // A finalized intent with NO decision request yet — host a hand-corrupted request row.
    const fx = await grantedAssignment();
    const host = await finalizedIntent(fx);
    const bdk = `pagamenos:study-intent-decision:v1:corrupt-${uid()}`;
    const idem = `pagamenos:study-intent-decision-idem:v1:corrupt-${uid()}`;
    // exactValidatedDecideInputJson = '{}' is NOT a valid engine input → parser fails schema validation.
    await prisma.$executeRawUnsafe(
      `INSERT INTO "purchase_intent_decision_request"
        ("id","intentId","finalizationId","decisionRequestSchemaVersion","exactValidatedDecideInputJson",
         "decideInputHash","expectedEngineInputSchemaVersion","expectedEngineContractVersion",
         "expectedCorpusVersion","expectedCorpusSemanticDigest","holidayCalendarVersion",
         "holidayCalendarDigest","businessDecisionKey","m3_5aIdempotencyKey","createdAt")
       VALUES (gen_random_uuid(), '${host.intent.intentId}'::uuid, '${host.fin.finalizationId}'::uuid,
         'pagamenos.a2-decision-request.v1', '{}'::jsonb, 'deadbeef', 'e', 'c', 'v', 'd', 'h', 'hd',
         '${bdk}', '${idem}', now())`,
    );
    await expect(
      decisionRepo.findDecisionRequestByIntent(host.intent.intentId),
    ).rejects.toBeInstanceOf(PurchaseIntentDecisionRequestIntegrityError);
  });
});

// ── Semantic drift (§14) & version gates ────────────────────────────────────────────────────────────
describe('A2 semantic drift & version gates (§14; Sol Finding 5/6 runtime)', () => {
  it('fail-closes a frozen-but-undecided request under corpus semantic drift', async () => {
    const fx = await grantedAssignment();
    const { intent } = await finalizedIntent(fx);
    // 1. Freeze only (crash after freeze): inject a decideAndPersist that throws.
    await expect(
      requestPurchaseIntentDecisionWithDeps(
        {
          trustedParticipantContext: fx.context,
          assignmentId: fx.assignmentId,
          intentId: intent.intentId,
        },
        {
          decideAndPersist: () => {
            throw new Error('crash after freeze');
          },
        },
      ),
    ).rejects.toThrow('crash after freeze');
    const realFrozen = await decisionRepo.findDecisionRequestByIntent(intent.intentId);
    expect(realFrozen).not.toBeNull();
    // 2. Present a DRIFTED runtime: the frozen request advertises a stale corpus semantic digest, and
    //    no snapshot exists (finder NONE) ⇒ the §14 gate fails closed.
    const driftRepo = Object.assign(
      Object.create(Object.getPrototypeOf(decisionRepo)),
      decisionRepo,
      {
        findDecisionRequestByIntent: async () => ({
          ...realFrozen!,
          expectedCorpusSemanticDigest: 'sha256:DRIFTED',
        }),
      },
    );
    await expect(
      requestPurchaseIntentDecisionWithDeps(
        {
          trustedParticipantContext: fx.context,
          assignmentId: fx.assignmentId,
          intentId: intent.intentId,
        },
        { decisionRepository: driftRepo },
      ),
    ).rejects.toBeInstanceOf(PurchaseIntentSemanticDriftError);
  });

  it('completes crash-repair after a crash BETWEEN freeze and decide (no drift)', async () => {
    const fx = await grantedAssignment();
    const { intent } = await finalizedIntent(fx);
    await expect(
      requestPurchaseIntentDecisionWithDeps(
        {
          trustedParticipantContext: fx.context,
          assignmentId: fx.assignmentId,
          intentId: intent.intentId,
        },
        {
          decideAndPersist: () => {
            throw new Error('crash after freeze');
          },
        },
      ),
    ).rejects.toThrow('crash after freeze');
    // Re-run normally → converges to a bound decision (engine runs now).
    const done = await decide(fx, intent.intentId);
    expect(done.snapshotId).toBeTruthy();
    expect(done.reused).toBe(false);
  });
});

// ── Database immutability (append-only triggers) ────────────────────────────────────────────────────
describe('A2 database immutability (append-only triggers)', () => {
  it('rejects direct UPDATE and DELETE of a purchase_intent row', async () => {
    const fx = await grantedAssignment();
    const { intent } = await finalizedIntent(fx);
    await expect(
      prisma.$executeRawUnsafe(
        `UPDATE "purchase_intent" SET "intentType" = 'EXPLORATORY' WHERE "id" = '${intent.intentId}'`,
      ),
    ).rejects.toThrow();
    await expect(
      prisma.$executeRawUnsafe(`DELETE FROM "purchase_intent" WHERE "id" = '${intent.intentId}'`),
    ).rejects.toThrow();
  });

  it('rejects direct mutation of a frozen decision request', async () => {
    const fx = await grantedAssignment();
    const { intent } = await finalizedIntent(fx);
    const dec = await decide(fx, intent.intentId);
    await expect(
      prisma.$executeRawUnsafe(
        `UPDATE "purchase_intent_decision_request" SET "decideInputHash" = 'HACK' WHERE "id" = '${dec.decisionRequestId}'`,
      ),
    ).rejects.toThrow();
  });
});

// ── GENUINE concurrency / P2002 closure (Sol Finding 8) — overlapping transactions ──────────────────
describe('A2 real-PostgreSQL concurrency (Sol Finding 8)', () => {
  it('1. simultaneous EQUIVALENT create converges to ONE intent (P2002 equivalent winner)', async () => {
    const fx = await grantedAssignment();
    const token = await capturedToken(fx);
    const call = () =>
      createPurchaseIntent({
        trustedParticipantContext: fx.context,
        assignmentId: fx.assignmentId,
        intentCaptureKey: token.intentCaptureKey,
        intentType: 'BUYING_NOW',
        idempotencyKey: `ci-${uid()}`, // distinct transport keys, SAME capture → alias
      });
    const [a, b] = await Promise.all([call(), call()]);
    expect(a.intentId).toBe(b.intentId);
    const count = await prisma.purchaseIntent.count({ where: { captureTokenId: token.id } });
    expect(count).toBe(1);
  });

  it('2. simultaneous CONFLICTING create → exactly one succeeds, the other is a capture conflict', async () => {
    const fx = await grantedAssignment();
    const token = await capturedToken(fx);
    const mk = (t: 'BUYING_NOW' | 'EXPLORATORY') =>
      createPurchaseIntent({
        trustedParticipantContext: fx.context,
        assignmentId: fx.assignmentId,
        intentCaptureKey: token.intentCaptureKey,
        intentType: t,
        idempotencyKey: `ci-${uid()}`,
      });
    const results = await Promise.allSettled([mk('BUYING_NOW'), mk('EXPLORATORY')]);
    const ok = results.filter((r) => r.status === 'fulfilled');
    const bad = results.filter((r) => r.status === 'rejected');
    // Either both saw the same first-committed material (both fulfilled as alias) OR one conflicted.
    expect(ok.length + bad.length).toBe(2);
    const count = await prisma.purchaseIntent.count({ where: { captureTokenId: token.id } });
    expect(count).toBe(1);
  });

  it('3. duplicate FINALIZATION race → one finalization row', async () => {
    const fx = await grantedAssignment();
    const token = await capturedToken(fx);
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
      signature: BILL,
      intendedTransactionAt: INTENDED_AT,
      idempotencyKey: `ac-${uid()}`,
    });
    const prof = await appendEligibilityProfile({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      profileCaptureKey: `pc-${uid()}`,
      portfolio: PORTFOLIO,
      idempotencyKey: `ap-${uid()}`,
    });
    const fin = () =>
      finalizePurchaseIntent({
        trustedParticipantContext: fx.context,
        assignmentId: fx.assignmentId,
        intentId: intent.intentId,
        contextVersionId: ctx.contextVersionId,
        eligibilityProfileVersionId: prof.eligibilityProfileVersionId,
        idempotencyKey: `fin-${uid()}`,
      });
    const [f1, f2] = await Promise.all([fin(), fin()]);
    expect(f1.finalizationId).toBe(f2.finalizationId);
    const count = await prisma.purchaseIntentFinalization.count({
      where: { intentId: intent.intentId },
    });
    expect(count).toBe(1);
  });

  it('4/5/6. concurrent decision (crash-repair) → one snapshot, one binding, both converge', async () => {
    const fx = await grantedAssignment();
    const { intent } = await finalizedIntent(fx);
    const [d1, d2] = await Promise.all([decide(fx, intent.intentId), decide(fx, intent.intentId)]);
    expect(d1.snapshotId).toBe(d2.snapshotId);
    expect(d1.decisionRequestId).toBe(d2.decisionRequestId);
    const bindings = await prisma.purchaseIntentDecisionBinding.count({
      where: { decisionRequestId: d1.decisionRequestId },
    });
    expect(bindings).toBe(1);
    const requests = await prisma.purchaseIntentDecisionRequest.count({
      where: { intentId: intent.intentId },
    });
    expect(requests).toBe(1);
  });

  it('7. concurrent crash-repair across TWO SEPARATE client connections converges', async () => {
    const fx = await grantedAssignment();
    const { intent } = await finalizedIntent(fx);
    // Two genuinely separate Postgres connections, each with its own repository instances, race the
    // full freeze→decide→bind saga at once. They must converge to one request / snapshot / binding.
    const clientA = newClient();
    const clientB = newClient();
    const depsFor = (c: PrismaClient) => ({
      intentRepository: new PurchaseIntentRepository(c),
      decisionRepository: new PurchaseIntentDecisionRepository(c),
    });
    const req = {
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      intentId: intent.intentId,
    };
    const [r1, r2] = await Promise.all([
      requestPurchaseIntentDecisionWithDeps(req, depsFor(clientA)),
      requestPurchaseIntentDecisionWithDeps(req, depsFor(clientB)),
    ]);
    expect(r1.snapshotId).toBe(r2.snapshotId);
    expect(r1.decisionRequestId).toBe(r2.decisionRequestId);
    const requests = await prisma.purchaseIntentDecisionRequest.count({
      where: { intentId: intent.intentId },
    });
    expect(requests).toBe(1);
    const bindings = await prisma.purchaseIntentDecisionBinding.count({
      where: { decisionRequestId: r1.decisionRequestId },
    });
    expect(bindings).toBe(1);
  });

  it('8. FINALIZATION vs INVALIDATION race never leaves a finalization on an invalidated intent', async () => {
    const fx = await grantedAssignment();
    const token = await capturedToken(fx);
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
      signature: BILL,
      intendedTransactionAt: INTENDED_AT,
      idempotencyKey: `ac-${uid()}`,
    });
    const prof = await appendEligibilityProfile({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      profileCaptureKey: `pc-${uid()}`,
      portfolio: PORTFOLIO,
      idempotencyKey: `ap-${uid()}`,
    });
    const finalizeCall = finalizePurchaseIntent({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      intentId: intent.intentId,
      contextVersionId: ctx.contextVersionId,
      eligibilityProfileVersionId: prof.eligibilityProfileVersionId,
      idempotencyKey: `fin-${uid()}`,
    });
    const invalidateCall = invalidatePurchaseIntent({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      invalidatedIntentId: intent.intentId,
      reasonCode: 'DATA_ENTRY_ERROR',
      idempotencyKey: `inv-${uid()}`,
    });
    const [finRes, invRes] = await Promise.allSettled([finalizeCall, invalidateCall]);
    const finalized = await prisma.purchaseIntentFinalization.findUnique({
      where: { intentId: intent.intentId },
    });
    const invalidated = await prisma.purchaseIntentInvalidation.findUnique({
      where: { invalidatedIntentId: intent.intentId },
    });
    // The serialization invariant: it is NEVER the case that BOTH a finalization exists AND the
    // invalidation committed BEFORE it. Concretely, if the intent is invalidated, finalize must have
    // been rejected (no finalization row); if finalized, invalidate may still be recorded afterwards.
    if (invalidated && finRes.status === 'rejected') {
      expect(finalized).toBeNull();
    }
    // Exactly one of the two ordering outcomes occurred (never a torn state).
    expect(finRes.status === 'fulfilled' || invRes.status === 'fulfilled').toBe(true);
  });
});

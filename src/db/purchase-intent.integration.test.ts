// PagaMenos · M3.5B-A2 real-PostgreSQL adversarial integration suite (A2 §5–§19/§37).
//
// Runs ONLY under `scripts/pg-integration.ts` (ephemeral cluster + `prisma migrate deploy` + this
// suite). Exercises the SANCTIONED A2 services end-to-end against real Postgres AND probes the
// database-level guards (append-only immutability triggers, finalization cross-assignment coherence
// trigger) directly. All A2 tables are append-only, so every test uses fresh unique identities.
import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { prisma } from '@/db/client';
import { purchaseIntentDecisionRepository } from '@/db/purchase-intent-decision-repository';
import {
  assignParticipant,
  createExperiment,
  freezeAnalysisProtocol,
  registerAnalysisProtocolDraft,
  registerStudyParticipant,
  resolveTrustedParticipantContext,
} from '@/services/study-admin';
import {
  appendEligibilityProfile,
  appendPurchaseIntentContext,
  captureIntentToken,
  createPurchaseIntent,
  finalizePurchaseIntent,
  invalidatePurchaseIntent,
  requestPurchaseIntentDecision,
} from '@/services';
import {
  deriveBusinessDecisionKey,
  EligibilityProfileConflictError,
  PurchaseIntentBindingCoherenceError,
  PurchaseIntentCaptureConflictError,
  PurchaseIntentContextAfterFinalizationError,
  PurchaseIntentContextConflictError,
  PurchaseIntentContextSignatureError,
  PurchaseIntentFinalizationConflictError,
  PurchaseIntentIdempotencyConflictError,
  PurchaseIntentInvalidatedError,
  PurchaseIntentInvalidationCycleError,
  PurchaseIntentNotFinalizedError,
  PurchaseIntentOwnershipError,
  PurchaseIntentSemanticDriftError,
  RECRUITMENT_KEY_VERSION_V1,
  type TrustedParticipantContext,
} from '@/study';

const uid = () => randomUUID().slice(0, 8);
const DEF = {
  observationWindowWeeks: 6,
  contaminationWindowHours: 48,
  minimumVerifiedLevel: 'CORROBORATED',
  minimumIndependentOccasions: 2,
};

afterAll(async () => {
  await prisma.$disconnect();
});

interface Fixture {
  assignmentId: string;
  participantId: string;
  context: TrustedParticipantContext;
}

/** A frozen protocol → experiment → participant → assignment; returns ids + trusted context. */
async function freshAssignment(): Promise<Fixture> {
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
  return {
    assignmentId: assignment.assignment.id,
    participantId: participant.participant.id,
    context: resolveTrustedParticipantContext({
      authenticatedParticipantId: participant.participant.id,
    }),
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

/** Drive capture → create → context → profile → finalize; return the ids needed to request a decision. */
async function finalizedIntent(fx: Fixture, entryEvidence = [{ kind: 'DIRECT' as const }]) {
  const token = await captureIntentToken({
    trustedParticipantContext: fx.context,
    assignmentId: fx.assignmentId,
    clientCorrelationNonce: `nonce-${uid()}`,
    entryEvidence,
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

// ===================================================================================================
describe('A2 lifecycle — happy path & exact decision binding (§5–§17)', () => {
  it('captures → creates → finalizes → requests a bound decision, deterministically', async () => {
    const fx = await freshAssignment();
    const { intent } = await finalizedIntent(fx);
    const decision = await requestPurchaseIntentDecision({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      intentId: intent.intentId,
    });
    expect(decision.snapshotId).toBeTruthy();
    expect(decision.businessDecisionKey).toBe(deriveBusinessDecisionKey(intent.intentId));
    expect(decision.reused).toBe(false);

    // Binding row exists and links request → snapshot exactly.
    const binding = await prisma.purchaseIntentDecisionBinding.findUnique({
      where: { decisionRequestId: decision.decisionRequestId },
    });
    expect(binding?.snapshotId).toBe(decision.snapshotId);

    // Re-request converges to the SAME bound decision (idempotent completion).
    const again = await requestPurchaseIntentDecision({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      intentId: intent.intentId,
    });
    expect(again.snapshotId).toBe(decision.snapshotId);
    expect(again.decisionRequestId).toBe(decision.decisionRequestId);
    expect(again.reused).toBe(true);
  });
});

describe('A2 idempotency — transport replay, capture alias, material conflict (§24)', () => {
  it('create: exact transport replay returns the same intent; a new key aliases; different material conflicts', async () => {
    const fx = await freshAssignment();
    const token = await captureIntentToken({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      clientCorrelationNonce: `nonce-${uid()}`,
      entryEvidence: [{ kind: 'DIRECT' }],
    });
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

    // A new transport key, SAME material → capture alias to the same intent.
    const alias = await createPurchaseIntent({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      intentCaptureKey: token.intentCaptureKey,
      intentType: 'BUYING_NOW',
      idempotencyKey: `ci-${uid()}`,
    });
    expect(alias.intentId).toBe(a.intentId);
    expect(alias.resultKind).toBe('CAPTURE_ALIAS');

    // A new transport key, DIFFERENT material (intentType) on the same capture → conflict.
    await expect(
      createPurchaseIntent({
        trustedParticipantContext: fx.context,
        assignmentId: fx.assignmentId,
        intentCaptureKey: token.intentCaptureKey,
        intentType: 'EXPLORATORY',
        idempotencyKey: `ci-${uid()}`,
      }),
    ).rejects.toBeInstanceOf(PurchaseIntentCaptureConflictError);
  });

  it('capture is idempotent on the correlation nonce (same key returned)', async () => {
    const fx = await freshAssignment();
    const nonce = `nonce-${uid()}`;
    const t1 = await captureIntentToken({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      clientCorrelationNonce: nonce,
      entryEvidence: [{ kind: 'DIRECT' }],
    });
    const t2 = await captureIntentToken({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      clientCorrelationNonce: nonce, // SAME nonce → same durable token
      entryEvidence: [{ kind: 'RESEARCH_LINK', researchLinkId: 'r1' }], // first resolution wins
    });
    expect(t2.intentCaptureKey).toBe(t1.intentCaptureKey);
    expect(t2.entrySource).toBe(t1.entrySource); // immutable; first-resolved entrySource is authoritative
    expect(t2.replayed).toBe(true);
  });

  it('create: same transport key reused for a DIFFERENT request → idempotency conflict', async () => {
    const fx = await freshAssignment();
    const t1 = await captureIntentToken({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      clientCorrelationNonce: `nonce-${uid()}`,
      entryEvidence: [{ kind: 'DIRECT' }],
    });
    const key = `ci-${uid()}`;
    await createPurchaseIntent({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      intentCaptureKey: t1.intentCaptureKey,
      intentType: 'BUYING_NOW',
      idempotencyKey: key,
    });
    // Same key, but now describing a different intentType → the key can't acknowledge it.
    await expect(
      createPurchaseIntent({
        trustedParticipantContext: fx.context,
        assignmentId: fx.assignmentId,
        intentCaptureKey: t1.intentCaptureKey,
        intentType: 'EXPLORATORY',
        idempotencyKey: key,
      }),
    ).rejects.toBeInstanceOf(PurchaseIntentIdempotencyConflictError);
  });

  it('context capture key: same payload aliases; different payload conflicts', async () => {
    const fx = await freshAssignment();
    const token = await captureIntentToken({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      clientCorrelationNonce: `nonce-${uid()}`,
      entryEvidence: [{ kind: 'DIRECT' }],
    });
    const intent = await createPurchaseIntent({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      intentCaptureKey: token.intentCaptureKey,
      intentType: 'BUYING_NOW',
      idempotencyKey: `ci-${uid()}`,
    });
    const cck = `cc-${uid()}`;
    const c1 = await appendPurchaseIntentContext({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      intentId: intent.intentId,
      contextCaptureKey: cck,
      signature: BILL,
      intendedTransactionAt: INTENDED_AT,
      idempotencyKey: `ac-${uid()}`,
    });
    const c2 = await appendPurchaseIntentContext({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      intentId: intent.intentId,
      contextCaptureKey: cck,
      signature: BILL,
      intendedTransactionAt: INTENDED_AT,
      idempotencyKey: `ac-${uid()}`, // same transport key → pure replay
    });
    expect(c2.contextVersionId).toBe(c1.contextVersionId);
    // Same capture key, different transport key, DIFFERENT payload → conflict.
    await expect(
      appendPurchaseIntentContext({
        trustedParticipantContext: fx.context,
        assignmentId: fx.assignmentId,
        intentId: intent.intentId,
        contextCaptureKey: cck,
        signature: { ...BILL, wholeBillCentimos: 20000 }, // valid, but materially different
        intendedTransactionAt: INTENDED_AT,
        idempotencyKey: `ac-${uid()}`,
      }),
    ).rejects.toBeInstanceOf(PurchaseIntentContextConflictError);
  });

  it('profile capture key: different payload conflicts', async () => {
    const fx = await freshAssignment();
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

describe('A2 state gates & ownership (§7/§8/§9/§10)', () => {
  it('rejects context append after finalization', async () => {
    const fx = await freshAssignment();
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
  });

  it('rejects a decision request for a NOT-finalized intent', async () => {
    const fx = await freshAssignment();
    const token = await captureIntentToken({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      clientCorrelationNonce: `nonce-${uid()}`,
      entryEvidence: [{ kind: 'DIRECT' }],
    });
    const intent = await createPurchaseIntent({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      intentCaptureKey: token.intentCaptureKey,
      intentType: 'BUYING_NOW',
      idempotencyKey: `ci-${uid()}`,
    });
    await expect(
      requestPurchaseIntentDecision({
        trustedParticipantContext: fx.context,
        assignmentId: fx.assignmentId,
        intentId: intent.intentId,
      }),
    ).rejects.toBeInstanceOf(PurchaseIntentNotFinalizedError);
  });

  it('rejects finalize / decision after invalidation', async () => {
    const fx = await freshAssignment();
    const token = await captureIntentToken({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      clientCorrelationNonce: `nonce-${uid()}`,
      entryEvidence: [{ kind: 'DIRECT' }],
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
  });

  it('rejects an operation from a different participant (ownership)', async () => {
    const fx = await freshAssignment();
    const other = await freshAssignment();
    await expect(
      captureIntentToken({
        trustedParticipantContext: other.context, // wrong participant for fx.assignmentId
        assignmentId: fx.assignmentId,
        clientCorrelationNonce: `nonce-${uid()}`,
        entryEvidence: [{ kind: 'DIRECT' }],
      }),
    ).rejects.toBeInstanceOf(PurchaseIntentOwnershipError);
  });

  it('rejects a malformed (mixed) purchase signature before any write', async () => {
    const fx = await freshAssignment();
    const token = await captureIntentToken({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      clientCorrelationNonce: `nonce-${uid()}`,
      entryEvidence: [{ kind: 'DIRECT' }],
    });
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
        signature: { ...BILL, ticketCount: 3 }, // mixed families
        intendedTransactionAt: INTENDED_AT,
        idempotencyKey: `ac-${uid()}`,
      }),
    ).rejects.toBeInstanceOf(PurchaseIntentContextSignatureError);
  });
});

describe('A2 finalization conflict & cross-assignment coherence (§9)', () => {
  it('rejects re-finalizing to a different context/profile', async () => {
    const fx = await freshAssignment();
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
    const fx = await freshAssignment();
    const other = await freshAssignment();
    const token = await captureIntentToken({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      clientCorrelationNonce: `nonce-${uid()}`,
      entryEvidence: [{ kind: 'DIRECT' }],
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
    // Bypass the service in-process check; prove the DB trigger is the hard guarantee.
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
});

describe('A2 invalidation lineage (§10/§23)', () => {
  it('rejects self-replacement and cross-assignment replacement', async () => {
    const fx = await freshAssignment();
    const { intent } = await finalizedIntent(fx);
    await expect(
      invalidatePurchaseIntent({
        trustedParticipantContext: fx.context,
        assignmentId: fx.assignmentId,
        invalidatedIntentId: intent.intentId,
        replacementIntentId: intent.intentId, // self
        idempotencyKey: `inv-${uid()}`,
      }),
    ).rejects.toBeInstanceOf(PurchaseIntentInvalidationCycleError);

    const other = await freshAssignment();
    const foreign = await finalizedIntent(other);
    await expect(
      invalidatePurchaseIntent({
        trustedParticipantContext: fx.context,
        assignmentId: fx.assignmentId,
        invalidatedIntentId: intent.intentId,
        replacementIntentId: foreign.intent.intentId, // different assignment
        idempotencyKey: `inv-${uid()}`,
      }),
    ).rejects.toBeInstanceOf(PurchaseIntentInvalidationCycleError);
  });
});

describe('A2 crash-repair saga resumability (§16/§17)', () => {
  it('completes after a crash BETWEEN freeze and decide', async () => {
    const fx = await freshAssignment();
    const { intent } = await finalizedIntent(fx);
    // Simulate a crash after freeze: decideAndPersist throws.
    await expect(
      requestPurchaseIntentDecision(
        {
          trustedParticipantContext: fx.context,
          assignmentId: fx.assignmentId,
          intentId: intent.intentId,
        },
        {
          decideAndPersist: () => {
            throw new Error('simulated crash after freeze');
          },
        },
      ),
    ).rejects.toThrow('simulated crash after freeze');
    // The request was frozen but no snapshot/binding exists.
    const frozen = await purchaseIntentDecisionRepository.findDecisionRequestByIntent(
      intent.intentId,
    );
    expect(frozen).not.toBeNull();
    expect(await purchaseIntentDecisionRepository.findBindingByRequest(frozen!.id)).toBeNull();
    // Re-run normally → converges to a bound decision.
    const decision = await requestPurchaseIntentDecision({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      intentId: intent.intentId,
    });
    expect(decision.decisionRequestId).toBe(frozen!.id);
    expect(decision.snapshotId).toBeTruthy();
  });

  it('completes after a crash BETWEEN decide and bind', async () => {
    const fx = await freshAssignment();
    const { intent } = await finalizedIntent(fx);
    // Real decide happens, but bind throws → snapshot persisted, binding missing.
    const throwingBindRepo = Object.assign(
      Object.create(Object.getPrototypeOf(purchaseIntentDecisionRepository)),
      purchaseIntentDecisionRepository,
      {
        bindSnapshot: () => {
          throw new Error('simulated crash before bind');
        },
      },
    );
    await expect(
      requestPurchaseIntentDecision(
        {
          trustedParticipantContext: fx.context,
          assignmentId: fx.assignmentId,
          intentId: intent.intentId,
        },
        { decisionRepository: throwingBindRepo },
      ),
    ).rejects.toThrow('simulated crash before bind');
    const frozen = await purchaseIntentDecisionRepository.findDecisionRequestByIntent(
      intent.intentId,
    );
    expect(await purchaseIntentDecisionRepository.findBindingByRequest(frozen!.id)).toBeNull();
    // Re-run normally → the decision already exists (reused) and binding completes.
    const decision = await requestPurchaseIntentDecision({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      intentId: intent.intentId,
    });
    expect(decision.reused).toBe(true);
    expect(
      (await purchaseIntentDecisionRepository.findBindingByRequest(frozen!.id))?.snapshotId,
    ).toBe(decision.snapshotId);
  });

  it('fail-closes a frozen-but-undecided request under runtime semantic drift (§14)', async () => {
    const fx = await freshAssignment();
    const { intent } = await finalizedIntent(fx);
    // First freeze the request (crash after freeze).
    await expect(
      requestPurchaseIntentDecision(
        {
          trustedParticipantContext: fx.context,
          assignmentId: fx.assignmentId,
          intentId: intent.intentId,
        },
        {
          decideAndPersist: () => {
            throw new Error('freeze only');
          },
        },
      ),
    ).rejects.toThrow('freeze only');
    // Now present a DRIFTED runtime: the frozen request's pinned corpus version no longer matches.
    const realFrozen = await purchaseIntentDecisionRepository.findDecisionRequestByIntent(
      intent.intentId,
    );
    const driftRepo = Object.assign(
      Object.create(Object.getPrototypeOf(purchaseIntentDecisionRepository)),
      purchaseIntentDecisionRepository,
      {
        findDecisionRequestByIntent: async () => ({
          ...realFrozen!,
          expectedCorpusVersion: 'DRIFTED_CORPUS_VERSION',
        }),
      },
    );
    await expect(
      requestPurchaseIntentDecision(
        {
          trustedParticipantContext: fx.context,
          assignmentId: fx.assignmentId,
          intentId: intent.intentId,
        },
        { decisionRepository: driftRepo },
      ),
    ).rejects.toBeInstanceOf(PurchaseIntentSemanticDriftError);
  });
});

describe('A2 database immutability (append-only triggers)', () => {
  it('rejects direct UPDATE and DELETE of a purchase_intent row', async () => {
    const fx = await freshAssignment();
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
    const fx = await freshAssignment();
    const { intent } = await finalizedIntent(fx);
    const decision = await requestPurchaseIntentDecision({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      intentId: intent.intentId,
    });
    await expect(
      prisma.$executeRawUnsafe(
        `UPDATE "purchase_intent_decision_request" SET "decideInputHash" = 'HACK' WHERE "id" = '${decision.decisionRequestId}'`,
      ),
    ).rejects.toThrow();
  });
});

describe('A2 binding coherence (§17)', () => {
  it('rejects binding a snapshot whose business key does not match the request', async () => {
    const fx = await freshAssignment();
    const { intent } = await finalizedIntent(fx);
    const decision = await requestPurchaseIntentDecision({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      intentId: intent.intentId,
    });
    await expect(
      purchaseIntentDecisionRepository.bindSnapshot({
        decisionRequestId: decision.decisionRequestId,
        snapshotId: decision.snapshotId,
        requestDecideInputHash: decision.decideInputHash,
        requestBusinessDecisionKey: decision.businessDecisionKey,
        snapshotInputHash: decision.decideInputHash,
        snapshotBusinessDecisionKey: 'WRONG_BUSINESS_KEY',
      }),
    ).rejects.toBeInstanceOf(PurchaseIntentBindingCoherenceError);
  });
});

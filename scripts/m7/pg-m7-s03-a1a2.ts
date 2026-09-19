// PagaMenos · M7 V1.1 — S03 harness: accepted A1/A2 rows for the positive paths (VBA-01 VBA-SC-4).
//
// Lives beside the harness (not under src/) because it drives the trusted A1/A2 services and the raw Prisma
// client, which the accepted module-capability boundary reserves to their owners inside src/.
//
// Verification tooling only, and only for the disposable database. Every A1/A2 row is created through the
// SANCTIONED A1/A2 application services — exactly the services the accepted A1/A2 integration suites
// drive — so no trigger, constraint or guard is disabled, bypassed or altered. The services connect with
// DATABASE_URL (the migration role, as the accepted suites do under the S02 harness). Keys are
// deterministic per run; nothing here is a VBCP identity and nothing enters E, F or a digest.
import type { A1A2Participant } from '../../src/m7/s03/positive-paths';

/**
 * A2 build-provenance test constant: the persistence boundary requires a 40-hex git sha. This is the S02
 * harness's own synthetic constant (scripts/m7/pg-m7-harness.ts TEST_GIT_SHA) — not a commit of this
 * repository, not a VBCP value, not a selector or authority value.
 */
export const A2_TEST_BUILD_GIT_SHA = '0123456789abcdef0123456789abcdef01234567';

const DEF = {
  observationWindowWeeks: 6,
  contaminationWindowHours: 48,
  minimumVerifiedLevel: 'CORROBORATED',
  minimumIndependentOccasions: 2,
};
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

/**
 * Builds `plan.length` participants, each with a GRANTED consent and `intents` finalized purchase intents
 * with a bound decision. Must run in a process whose Prisma client has not been created yet.
 */
export async function buildA1A2Participants(
  databaseUrl: string,
  plan: readonly { readonly label: string; readonly intents: number }[],
): Promise<A1A2Participant[]> {
  process.env.DATABASE_URL = databaseUrl;
  process.env.PAGAMENOS_GIT_SHA = A2_TEST_BUILD_GIT_SHA;
  const admin = await import('../../src/services/study-admin');
  const services = await import('../../src/services');
  const pi = await import('../../src/services/study-purchase-intent');
  const dec = await import('../../src/services/study-intent-decision');
  const study = await import('../../src/study');
  const { prisma } = await import('../../src/db/client');

  let n = 0;
  const key = (p: string) => `${p}-s03vb-${String((n += 1)).padStart(4, '0')}`;
  try {
    const draft = await admin.registerAnalysisProtocolDraft({
      input: { protocolVersion: key('P'), definition: DEF },
      idempotencyKey: key('reg'),
    });
    const frozen = await admin.freezeAnalysisProtocol({
      input: { protocolId: draft.protocol.id },
      idempotencyKey: key('frz'),
    });
    const experiment = await admin.createExperiment({
      input: { experimentCode: key('E'), frozenProtocolId: frozen.protocol.id },
      idempotencyKey: key('exp'),
    });
    const direct = admin.resolveTrustedEntrySource([{ kind: 'DIRECT' }]);
    const out: A1A2Participant[] = [];
    for (const p of plan) {
      const participant = await admin.registerStudyParticipant({
        input: {
          recruitmentSubjectKey: key('sk'),
          recruitmentKeyVersion: study.RECRUITMENT_KEY_VERSION_V1,
        },
        idempotencyKey: key('par'),
      });
      const assignment = await admin.assignParticipant({
        input: {
          experimentId: experiment.experiment.id,
          participantId: participant.participant.id,
        },
        idempotencyKey: key('asg'),
      });
      const context = admin.resolveTrustedParticipantContext({
        authenticatedParticipantId: participant.participant.id,
      });
      await services.recordConsentGrant({
        trustedParticipantContext: context,
        assignmentId: assignment.assignment.id,
        consentPayload: {
          consentVersion: 'cv1',
          privacyNoticeVersion: 'pv1',
          optionalEvidenceConsent: true,
        },
        idempotencyKey: key('cg'),
      });
      const intentIds: string[] = [];
      const bindingIds: string[] = [];
      for (let i = 0; i < p.intents; i += 1) {
        const token = await pi.captureIntentToken({
          trustedParticipantContext: context,
          assignmentId: assignment.assignment.id,
          clientCorrelationNonce: key('nonce'),
          resolvedEntrySource: direct,
        });
        const intent = await pi.createPurchaseIntent({
          trustedParticipantContext: context,
          assignmentId: assignment.assignment.id,
          intentCaptureKey: token.intentCaptureKey,
          intentType: 'BUYING_NOW',
          idempotencyKey: key('ci'),
        });
        const ctx = await pi.appendPurchaseIntentContext({
          trustedParticipantContext: context,
          assignmentId: assignment.assignment.id,
          intentId: intent.intentId,
          contextCaptureKey: key('cc'),
          signature: BILL,
          intendedTransactionAt: INTENDED_AT,
          idempotencyKey: key('ac'),
        });
        const prof = await pi.appendEligibilityProfile({
          trustedParticipantContext: context,
          assignmentId: assignment.assignment.id,
          profileCaptureKey: key('pc'),
          portfolio: PORTFOLIO,
          idempotencyKey: key('ap'),
        });
        await pi.finalizePurchaseIntent({
          trustedParticipantContext: context,
          assignmentId: assignment.assignment.id,
          intentId: intent.intentId,
          contextVersionId: ctx.contextVersionId,
          eligibilityProfileVersionId: prof.eligibilityProfileVersionId,
          idempotencyKey: key('fin'),
        });
        const decision = await dec.requestPurchaseIntentDecision({
          trustedParticipantContext: context,
          assignmentId: assignment.assignment.id,
          intentId: intent.intentId,
        });
        const binding = await prisma.purchaseIntentDecisionBinding.findUnique({
          where: { decisionRequestId: decision.decisionRequestId },
        });
        if (!binding) throw new Error(`A2 decision for ${intent.intentId} produced no binding`);
        intentIds.push(intent.intentId);
        bindingIds.push(binding.id);
      }
      out.push({
        label: p.label,
        participantId: participant.participant.id,
        assignmentId: assignment.assignment.id,
        intentIds,
        decisionBindingIds: bindingIds,
      });
    }
    return out;
  } finally {
    await prisma.$disconnect();
  }
}

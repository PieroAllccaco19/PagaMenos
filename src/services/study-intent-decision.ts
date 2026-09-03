// PagaMenos · src/services — PurchaseIntentDecisionCapability + crash-repair saga (A2 §12–§19). SANCTIONED.
//
// Turns a finalized PurchaseIntent into a persisted, exactly-bound M3.5A decision, deterministically and
// crash-resumably. The saga has three durable steps, each idempotent, so re-invocation after a crash at
// ANY point converges to the same bound decision without recomputation or history rewrite:
//   1. FREEZE (once) — build the exact validated DecideInput from the FROZEN finalized authorities +
//      the accepted corpus snapshot + the pinned holiday fixture, sample the trusted evaluatedAt ONCE,
//      derive businessDecisionKey / m3_5aIdempotencyKey from the immutable intent id, and persist the
//      immutable decision request (self-verified on load).
//   2. DECIDE — run the sanctioned M3.5A `decideAndPersist` over the FROZEN input, keyed by the derived
//      keys (idempotent + race-safe). Skipped entirely when the decision already exists (read via the
//      read-only historical facade), which keeps crash-repair safe even after a later corpus update.
//   3. BIND — persist the exact 1:1 request↔snapshot binding (idempotent; coherence-checked).
// A frozen-but-undecided request is fail-closed under runtime semantic drift (§14): its pinned corpus/
// engine/holiday versions must still match the current runtime before a NEW decision may be computed.
// The raw decision repository is reachable only from here; the intent repository is read-only here.
import { loadCorpus } from '@/corpus';

import {
  purchaseIntentDecisionRepository,
  type PurchaseIntentDecisionRepository,
} from '@/db/purchase-intent-decision-repository';
import {
  purchaseIntentRepository,
  type PurchaseIntentRepository,
} from '@/db/purchase-intent-repository';
import { ENGINE_CONTRACT_VERSION, ENGINE_INPUT_SCHEMA_VERSION } from '@/persistence';
import {
  decideAndPersist as decideAndPersistTrusted,
  findExactHistoricalDecision as findExactHistoricalDecisionTrusted,
  type DecisionSnapshotDto,
} from '@/services';
import {
  A2_HOLIDAY_CALENDAR_FIXTURE_V1,
  A2_HOLIDAY_CALENDAR_VERSION_V1,
  buildDecideInputFromFinalizedAuthorities,
  computeDecideInputHash,
  deriveBusinessDecisionKey,
  deriveM3_5aIdempotencyKey,
  isTrustedParticipantContext,
  normalizeA2PurchaseSignatureV1,
  normalizeEligibilityPortfolioV1,
  PurchaseIntentInvalidatedError,
  PurchaseIntentInvariantError,
  PurchaseIntentNotFinalizedError,
  PurchaseIntentOwnershipError,
  PurchaseIntentSemanticDriftError,
  PurchaseIntentValidationError,
  type TrustedParticipantContext,
} from '@/study';
import type { DecideInput } from '@/engine';

/** A2 decision-request schema version (A2 §12). */
export const A2_DECISION_REQUEST_SCHEMA_VERSION_V1 = 'pagamenos.a2-decision-request.v1';

/** Trusted decide/persist + historical-read seam (defaults to the sanctioned production functions). */
export interface IntentDecisionDeps {
  intentRepository?: PurchaseIntentRepository;
  decisionRepository?: PurchaseIntentDecisionRepository;
  now?: () => Date;
  decideAndPersist?: typeof decideAndPersistTrusted;
  findExactHistoricalDecision?: typeof findExactHistoricalDecisionTrusted;
}

export interface RequestPurchaseIntentDecisionRequest {
  trustedParticipantContext: TrustedParticipantContext;
  assignmentId: string;
  intentId: string;
}

export interface PurchaseIntentDecisionResult {
  intentId: string;
  decisionRequestId: string;
  snapshotId: string;
  businessDecisionKey: string;
  decideInputHash: string;
  /** True when the decision already existed (replayed / crash-repair completion), false when freshly decided. */
  reused: boolean;
}

function requireTrustedContext(value: unknown): TrustedParticipantContext {
  if (!isTrustedParticipantContext(value)) {
    throw new PurchaseIntentValidationError(
      'a trusted participant context is required for decision requests',
    );
  }
  return value;
}

/**
 * Request (or resume) the exact bound decision for a finalized PurchaseIntent (A2 §12–§19). Idempotent
 * and crash-resumable end to end: safe to invoke any number of times; converges to one bound decision.
 */
export async function requestPurchaseIntentDecision(
  request: RequestPurchaseIntentDecisionRequest,
  deps: IntentDecisionDeps = {},
): Promise<PurchaseIntentDecisionResult> {
  const intentRepo = deps.intentRepository ?? purchaseIntentRepository;
  const decisionRepo = deps.decisionRepository ?? purchaseIntentDecisionRepository;
  const now = deps.now ?? (() => new Date());
  const decideAndPersist = deps.decideAndPersist ?? decideAndPersistTrusted;
  const findExactHistoricalDecision =
    deps.findExactHistoricalDecision ?? findExactHistoricalDecisionTrusted;

  const context = requireTrustedContext(request.trustedParticipantContext);

  // 1. Load + gate the finalized authorities (ownership, invalidation, finalization).
  const authorities = await intentRepo.loadFinalizedDecisionAuthorities(request.intentId);
  if (!authorities) {
    throw new PurchaseIntentInvariantError(`purchase intent ${request.intentId} not found`);
  }
  if (
    authorities.assignmentId !== request.assignmentId ||
    (await intentRepo.findAssignmentParticipantId(authorities.assignmentId)) !==
      context.participantId
  ) {
    throw new PurchaseIntentOwnershipError();
  }
  if (authorities.invalidated) throw new PurchaseIntentInvalidatedError();
  if (!authorities.finalization) throw new PurchaseIntentNotFinalizedError();

  const businessDecisionKey = deriveBusinessDecisionKey(request.intentId);
  const m3_5aIdempotencyKey = deriveM3_5aIdempotencyKey(request.intentId);

  // 2. FREEZE (once). Re-use an existing frozen request verbatim (crash repair); otherwise build the
  //    exact validated DecideInput from the FROZEN authorities + accepted corpus + pinned holiday
  //    fixture, sampling evaluatedAt ONCE, and persist it immutably.
  let frozen = await decisionRepo.findDecisionRequestByIntent(request.intentId);
  if (!frozen) {
    const signature = normalizeA2PurchaseSignatureV1(
      authorities.finalization.contextVersion.purchaseSignatureJson,
    );
    const portfolio = normalizeEligibilityPortfolioV1(
      authorities.finalization.eligibilityProfileVersion.portfolioJson,
    );
    const corpus = loadCorpus();
    const input = buildDecideInputFromFinalizedAuthorities({
      signature,
      intendedTransactionAt: authorities.finalization.contextVersion.intendedTransactionAt,
      portfolio,
      corpus,
      evaluatedAt: now().toISOString(),
      holidayCalendar: A2_HOLIDAY_CALENDAR_FIXTURE_V1.normalizedDates,
    });
    const decideInputHash = computeDecideInputHash(input);
    frozen = await decisionRepo.freezeDecisionRequest({
      intentId: request.intentId,
      finalizationId: authorities.finalization.finalizationId,
      decisionRequestSchemaVersion: A2_DECISION_REQUEST_SCHEMA_VERSION_V1,
      exactValidatedDecideInputJson: input as unknown,
      decideInputHash,
      expectedEngineInputSchemaVersion: ENGINE_INPUT_SCHEMA_VERSION,
      expectedEngineContractVersion: ENGINE_CONTRACT_VERSION,
      expectedCorpusVersion: corpus.corpusId,
      holidayCalendarVersion: A2_HOLIDAY_CALENDAR_VERSION_V1,
      businessDecisionKey,
      m3_5aIdempotencyKey,
    });
  }

  // 3. DECIDE. If the decision already exists, complete the saga from it (drift-safe crash repair).
  //    Otherwise the frozen-but-undecided request is fail-closed under runtime semantic drift (§14),
  //    then decided ONCE over the FROZEN input via the sanctioned M3.5A path.
  let snapshot: DecisionSnapshotDto | null = await findExactHistoricalDecision(
    frozen.businessDecisionKey,
  );
  let reused = snapshot !== null;
  if (!snapshot) {
    assertNoRuntimeDrift(frozen);
    snapshot = await decideAndPersist({
      input: frozen.exactValidatedDecideInputJson as DecideInput,
      businessDecisionKey: frozen.businessDecisionKey,
      idempotencyKey: frozen.m3_5aIdempotencyKey,
    });
    reused = false;
  }

  // 4. BIND (idempotent, coherence-checked). The intent is reached only via decisionRequestId.
  const binding = await decisionRepo.bindSnapshot({
    decisionRequestId: frozen.id,
    snapshotId: snapshot.id,
    requestDecideInputHash: frozen.decideInputHash,
    requestBusinessDecisionKey: frozen.businessDecisionKey,
    snapshotInputHash: snapshot.inputHash,
    snapshotBusinessDecisionKey: snapshot.businessDecisionKey,
  });

  return {
    intentId: request.intentId,
    decisionRequestId: frozen.id,
    snapshotId: binding.snapshotId,
    businessDecisionKey: frozen.businessDecisionKey,
    decideInputHash: frozen.decideInputHash,
    reused,
  };
}

/** Fail-closed §14 gate: a frozen-but-undecided request's pinned versions MUST match the current runtime. */
function assertNoRuntimeDrift(frozen: {
  expectedCorpusVersion: string;
  expectedEngineInputSchemaVersion: string;
  expectedEngineContractVersion: string;
  holidayCalendarVersion: string;
}): void {
  const currentCorpusId = loadCorpus().corpusId;
  const drifted: string[] = [];
  if (frozen.expectedCorpusVersion !== currentCorpusId) {
    drifted.push(`corpus ${frozen.expectedCorpusVersion} != ${currentCorpusId}`);
  }
  if (frozen.expectedEngineInputSchemaVersion !== ENGINE_INPUT_SCHEMA_VERSION) {
    drifted.push(
      `engineInputSchema ${frozen.expectedEngineInputSchemaVersion} != ${ENGINE_INPUT_SCHEMA_VERSION}`,
    );
  }
  if (frozen.expectedEngineContractVersion !== ENGINE_CONTRACT_VERSION) {
    drifted.push(
      `engineContract ${frozen.expectedEngineContractVersion} != ${ENGINE_CONTRACT_VERSION}`,
    );
  }
  if (frozen.holidayCalendarVersion !== A2_HOLIDAY_CALENDAR_VERSION_V1) {
    drifted.push(
      `holidayCalendar ${frozen.holidayCalendarVersion} != ${A2_HOLIDAY_CALENDAR_VERSION_V1}`,
    );
  }
  if (drifted.length > 0) {
    throw new PurchaseIntentSemanticDriftError(
      `frozen decision request is stale under current runtime semantics: ${drifted.join('; ')}`,
    );
  }
}

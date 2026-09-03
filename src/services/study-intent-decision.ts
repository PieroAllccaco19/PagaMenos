// PagaMenos · src/services — PurchaseIntentDecisionCapability + crash-repair saga (A2 §12–§20). SANCTIONED.
//
// Turns a finalized PurchaseIntent into a persisted, exactly-bound M3.5A decision, deterministically and
// crash-resumably. Three durable, idempotent steps (freeze-once → decide via M3.5A → bind) so
// re-invocation after a crash at ANY point converges without recomputation or history rewrite.
//
// PUBLIC vs INTERNAL surface (Sol Finding 1): the operation is a PUBLIC one-request-argument wrapper
// plus an INTERNAL `*WithDeps`. Only the wrapper is re-exported by the public barrel; the injectable
// seam (repositories, trusted clock, decideAndPersist / findExactHistoricalDecision / loadDecisionSnapshot)
// is reachable only from this sanctioned file and tests. No caller can inject infrastructure or a clock.
//
// PRE-FREEZE AUTHORITY (Sol Findings 5/6): before freezing, the corpus semantic-authority digest is
// recomputed and gated (`assertCorpusAuthority`), and the intended-transaction Lima date is verified
// inside the accepted holiday-fixture coverage; both the recomputed corpus digest and the exact holiday
// fixture version+digest are pinned into the immutable frozen request.
//
// AUTHORITATIVE BINDING (Sol Finding 4): the exact snapshot is obtained via the read-only §18 finder
// (authoritative receipt+snapshot verification), and bound via `bindSnapshot`, which independently
// re-loads both authoritative rows — no caller-described identity is ever trusted.
import { loadCorpus } from '@/corpus';

import {
  purchaseIntentDecisionRepository,
  CURRENT_A2_DECISION_REQUEST_SCHEMA_VERSION,
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
  loadDecisionSnapshot as loadDecisionSnapshotTrusted,
} from '@/services';
import {
  A2_HOLIDAY_CALENDAR_FIXTURE_V1,
  A2_HOLIDAY_CALENDAR_VERSION_V1,
  assertCorpusAuthority,
  assertIntendedDateWithinCoverage,
  buildDecideInputFromFinalizedAuthorities,
  computeCorpusSemanticDigest,
  computeDecideInputHash,
  computeHolidayContentDigest,
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

export const A2_DECISION_REQUEST_SCHEMA_VERSION_V1 = CURRENT_A2_DECISION_REQUEST_SCHEMA_VERSION;

/**
 * INTERNAL injectable seam (Sol Finding 1). NOT part of the public request and NOT reachable through
 * the public barrel; only this sanctioned file and tests may pass it. Every field defaults to the
 * trusted production dependency; `now` is the trusted evaluatedAt clock (never caller-supplied).
 */
export interface IntentDecisionDeps {
  intentRepository?: PurchaseIntentRepository;
  decisionRepository?: PurchaseIntentDecisionRepository;
  decideAndPersist?: typeof decideAndPersistTrusted;
  findExactHistoricalDecision?: typeof findExactHistoricalDecisionTrusted;
  loadDecisionSnapshot?: typeof loadDecisionSnapshotTrusted;
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

/** INTERNAL: request (or resume) the exact bound decision with an injectable seam. See the wrapper. */
export async function requestPurchaseIntentDecisionWithDeps(
  request: RequestPurchaseIntentDecisionRequest,
  deps: IntentDecisionDeps = {},
): Promise<PurchaseIntentDecisionResult> {
  const intentRepo = deps.intentRepository ?? purchaseIntentRepository;
  const decisionRepo = deps.decisionRepository ?? purchaseIntentDecisionRepository;
  const decideAndPersist = deps.decideAndPersist ?? decideAndPersistTrusted;
  const findExactHistoricalDecision =
    deps.findExactHistoricalDecision ?? findExactHistoricalDecisionTrusted;
  const loadDecisionSnapshot = deps.loadDecisionSnapshot ?? loadDecisionSnapshotTrusted;

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

  // 2. FREEZE (once). Re-use an existing frozen request verbatim (crash repair); otherwise gate the
  //    pre-freeze authorities (corpus §5, holiday coverage §3.5), build the exact validated DecideInput
  //    from the FROZEN authorities, sample evaluatedAt ONCE, and persist it immutably with its pins.
  let frozen = await decisionRepo.findDecisionRequestByIntent(request.intentId);
  if (!frozen) {
    const corpus = loadCorpus();
    const corpusSemanticDigest = assertCorpusAuthority(corpus); // Finding 5 pre-freeze gate
    const fixture = A2_HOLIDAY_CALENDAR_FIXTURE_V1;
    const signature = normalizeA2PurchaseSignatureV1(
      authorities.finalization.contextVersion.purchaseSignatureJson,
    );
    const intendedTransactionAt = authorities.finalization.contextVersion.intendedTransactionAt;
    assertIntendedDateWithinCoverage(fixture, intendedTransactionAt); // Finding 6 coverage gate
    const portfolio = normalizeEligibilityPortfolioV1(
      authorities.finalization.eligibilityProfileVersion.portfolioJson,
    );
    const input = buildDecideInputFromFinalizedAuthorities({
      signature,
      intendedTransactionAt,
      portfolio,
      corpus,
      // DETERMINISTIC freeze (A2 §13/§21): evaluatedAt is the durable trusted finalization instant, NOT
      // a fresh wall-clock sample — so two concurrent first-freezes derive the BYTE-IDENTICAL request
      // and the P2002 loser reconciles cleanly instead of seeing a spurious mismatch.
      evaluatedAt: authorities.finalization.finalizedAt,
      holidayCalendar: fixture.normalizedDates,
    });
    const decideInputHash = computeDecideInputHash(input);
    frozen = await decisionRepo.freezeDecisionRequest({
      intentId: request.intentId,
      finalizationId: authorities.finalization.finalizationId,
      decisionRequestSchemaVersion: CURRENT_A2_DECISION_REQUEST_SCHEMA_VERSION,
      exactValidatedDecideInputJson: input as unknown,
      decideInputHash,
      expectedEngineInputSchemaVersion: ENGINE_INPUT_SCHEMA_VERSION,
      expectedEngineContractVersion: ENGINE_CONTRACT_VERSION,
      expectedCorpusVersion: corpus.corpusId,
      expectedCorpusSemanticDigest: corpusSemanticDigest,
      holidayCalendarVersion: fixture.version,
      holidayCalendarDigest: computeHolidayContentDigest(fixture),
      businessDecisionKey,
      m3_5aIdempotencyKey,
    });
  }

  // 3. DECIDE. The read-only §18 finder returns FOUND (authoritative, fully verified) / NONE, or throws
  //    a typed CONFLICT. FOUND ⇒ drift-safe crash-repair completion. NONE ⇒ fail closed under runtime
  //    semantic drift (§14) then decide ONCE over the FROZEN input via the sanctioned M3.5A path.
  const found = await findExactHistoricalDecision({
    businessDecisionKey: frozen.businessDecisionKey,
    idempotencyKey: frozen.m3_5aIdempotencyKey,
    inputHash: frozen.decideInputHash,
  });
  let snapshotId: string;
  let reused: boolean;
  if (found.kind === 'FOUND') {
    snapshotId = found.snapshot.id;
    reused = true;
  } else {
    assertNoRuntimeDrift(frozen);
    const snapshot = await decideAndPersist({
      input: frozen.exactValidatedDecideInputJson as DecideInput,
      businessDecisionKey: frozen.businessDecisionKey,
      idempotencyKey: frozen.m3_5aIdempotencyKey,
    });
    snapshotId = snapshot.id;
    reused = false;
  }

  // 4. BIND (idempotent, authoritative-row coherence-checked). The intent is reached only via
  //    decisionRequestId; bindSnapshot independently reloads both authoritative rows.
  const binding = await decisionRepo.bindSnapshot({
    decisionRequestId: frozen.id,
    snapshotId,
    loadSnapshot: (id) => loadDecisionSnapshot(id),
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

/**
 * Request (or resume) the exact bound decision for a finalized PurchaseIntent (A2 §12–§20), using
 * TRUSTED production dependencies. Idempotent and crash-resumable end to end.
 */
export function requestPurchaseIntentDecision(
  request: RequestPurchaseIntentDecisionRequest,
): Promise<PurchaseIntentDecisionResult> {
  return requestPurchaseIntentDecisionWithDeps(request);
}

/** Fail-closed §14 gate: a frozen-but-undecided request's pinned versions MUST match the current runtime. */
function assertNoRuntimeDrift(frozen: {
  expectedCorpusVersion: string;
  expectedCorpusSemanticDigest: string;
  expectedEngineInputSchemaVersion: string;
  expectedEngineContractVersion: string;
  holidayCalendarVersion: string;
  holidayCalendarDigest: string;
}): void {
  const corpus = loadCorpus();
  const currentCorpusSemanticDigest = computeCorpusSemanticDigest(corpus);
  const currentHolidayDigest = computeHolidayContentDigest(A2_HOLIDAY_CALENDAR_FIXTURE_V1);
  const drifted: string[] = [];
  if (frozen.expectedCorpusVersion !== corpus.corpusId) {
    drifted.push(`corpus ${frozen.expectedCorpusVersion} != ${corpus.corpusId}`);
  }
  if (frozen.expectedCorpusSemanticDigest !== currentCorpusSemanticDigest) {
    drifted.push(
      `corpusSemantic ${frozen.expectedCorpusSemanticDigest} != ${currentCorpusSemanticDigest}`,
    );
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
  if (frozen.holidayCalendarDigest !== currentHolidayDigest) {
    drifted.push(`holidayDigest ${frozen.holidayCalendarDigest} != ${currentHolidayDigest}`);
  }
  if (drifted.length > 0) {
    throw new PurchaseIntentSemanticDriftError(
      `frozen decision request is stale under current runtime semantics: ${drifted.join('; ')}`,
    );
  }
}

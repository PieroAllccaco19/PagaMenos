// PagaMenos · src/services — PurchaseIntentDecisionCapability + crash-repair saga (A2 §12–§20). SANCTIONED.
//
// Turns a finalized PurchaseIntent into a persisted, exactly-bound M3.5A decision, deterministically and
// crash-resumably. Three durable, idempotent steps (freeze-once → decide via M3.5A → bind) so
// re-invocation after a crash at ANY point converges without recomputation or history rewrite.
//
// PUBLIC vs INTERNAL surface (Sol Finding 1): the operation is a PUBLIC one-request-argument wrapper
// plus an INTERNAL `*WithDeps`. Only the wrapper is re-exported by the public barrel; the injectable
// seam (repositories, decideAndPersist / findExactHistoricalDecision; the trusted evaluatedAt clock is
// on the decision repository, sampled under the intent-root lock)
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
import { decideAndPersist as decideAndPersistTrusted } from '@/services';
// Sol Closure 3: the §18 finder is an INTERNAL A2 decision/repair capability, NOT on the public barrel.
// The sanctioned saga (an A2 owner) reaches it directly from the deep module; ordinary code cannot
// (module-capability AST boundary + ESLint), and `@/services` no longer re-exports it.
import { findExactHistoricalDecision as findExactHistoricalDecisionTrusted } from '@/services/decide-and-persist';
import {
  A2_CONTEXT_SCHEMA_VERSION_V1,
  A2_HOLIDAY_CALENDAR_FIXTURE_V1,
  A2_PORTFOLIO_SCHEMA_VERSION_V1,
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
  PurchaseIntentUnsupportedInputSchemaError,
  PurchaseIntentValidationError,
  type TrustedParticipantContext,
} from '@/study';

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

  const context = requireTrustedContext(request.trustedParticipantContext);

  // 1. Load authorities + ownership (ownership is always required).
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

  const businessDecisionKey = deriveBusinessDecisionKey(request.intentId);
  const m3_5aIdempotencyKey = deriveM3_5aIdempotencyKey(request.intentId);

  // 2. CASE A (A2 §20; Sol Correction 7): if an exact verified historical binding already exists, return
  //    it — EVEN IF the intent was later invalidated. Invalidation prevents creating NEW scientific facts;
  //    it never erases or makes inaccessible a previously valid immutable historical decision. The
  //    complete nine-clause coherence predicate is re-proven by bindSnapshot (idempotent).
  let frozen = await decisionRepo.findDecisionRequestByIntent(request.intentId);
  if (frozen) {
    const existingBinding = await decisionRepo.findBindingByRequest(frozen.id);
    if (existingBinding) {
      const binding = await decisionRepo.bindSnapshot({
        decisionRequestId: frozen.id,
        snapshotId: existingBinding.snapshotId,
        findExact: (q) => findExactHistoricalDecision(q),
      });
      return {
        intentId: request.intentId,
        decisionRequestId: frozen.id,
        snapshotId: binding.snapshotId,
        businessDecisionKey: frozen.businessDecisionKey,
        decideInputHash: frozen.decideInputHash,
        reused: true,
      };
    }
  }

  // 3. CASE C — no DecisionRequest yet: FREEZE one under the PurchaseIntent ROOT lock only. The lock path
  //    re-checks Case-C state (finalized + NOT invalidated) authoritatively, so a NEW request is never
  //    created for an invalidated or not-finalized intent. (A already-frozen request with no binding —
  //    Case B — skips this and proceeds to internal-repair completion below, permitted even if later
  //    invalidated, A2 §31.)
  if (!frozen) {
    // Invalidation is the terminal state — report it first (an invalidated intent can never be decided).
    if (authorities.invalidated) throw new PurchaseIntentInvalidatedError();
    if (!authorities.finalization) throw new PurchaseIntentNotFinalizedError();
    const corpus = loadCorpus();
    const corpusSemanticDigest = assertCorpusAuthority(corpus); // Finding 5 pre-freeze gate
    const fixture = A2_HOLIDAY_CALENDAR_FIXTURE_V1;
    // Version-dispatch the retained context / eligibility-profile payload parsers (Sol Correction 6):
    // an unknown persisted schema version fails closed; the normalizers then re-validate the payloads.
    if (
      authorities.finalization.contextVersion.contextSchemaVersion !== A2_CONTEXT_SCHEMA_VERSION_V1
    ) {
      throw new PurchaseIntentUnsupportedInputSchemaError(
        authorities.finalization.contextVersion.contextSchemaVersion,
      );
    }
    if (
      authorities.finalization.eligibilityProfileVersion.portfolioSchemaVersion !==
      A2_PORTFOLIO_SCHEMA_VERSION_V1
    ) {
      throw new PurchaseIntentUnsupportedInputSchemaError(
        authorities.finalization.eligibilityProfileVersion.portfolioSchemaVersion,
      );
    }
    const signature = normalizeA2PurchaseSignatureV1(
      authorities.finalization.contextVersion.purchaseSignatureJson,
    );
    const intendedTransactionAt = authorities.finalization.contextVersion.intendedTransactionAt;
    assertIntendedDateWithinCoverage(fixture, intendedTransactionAt); // Finding 6 coverage gate
    const portfolio = normalizeEligibilityPortfolioV1(
      authorities.finalization.eligibilityProfileVersion.portfolioJson,
    );
    // Freeze UNDER the PurchaseIntent ROOT lock ONLY (Case C; Sol Closure 5 — no assignment lock; this
    // is not a consent-gated collection fact). `evaluatedAt` is the TRUSTED SERVICE SAMPLE AT FREEZE
    // (A2 §13; Sol Correction 2) — sampled ONCE by the repo under the lock for the winner;
    // concurrent entries adopt the winner's frozen request verbatim (they never require their own
    // sampled instant to match). Everything else in `buildFreeze` is a deterministic function of the
    // frozen authorities + corpus + holiday fixture.
    frozen = await decisionRepo.freezeDecisionRequestUnderLock({
      intentId: request.intentId,
      assignmentId: request.assignmentId,
      buildFreeze: (evaluatedAt) => {
        const input = buildDecideInputFromFinalizedAuthorities({
          signature,
          intendedTransactionAt,
          portfolio,
          corpus,
          evaluatedAt,
          holidayCalendar: fixture.normalizedDates,
        });
        return {
          decisionRequestSchemaVersion: CURRENT_A2_DECISION_REQUEST_SCHEMA_VERSION,
          exactValidatedDecideInputJson: input as unknown,
          decideInputHash: computeDecideInputHash(input),
          expectedEngineInputSchemaVersion: ENGINE_INPUT_SCHEMA_VERSION,
          expectedEngineContractVersion: ENGINE_CONTRACT_VERSION,
          expectedCorpusVersion: corpus.corpusId,
          expectedCorpusSemanticDigest: corpusSemanticDigest,
          holidayCalendarVersion: fixture.version,
          holidayCalendarDigest: computeHolidayContentDigest(fixture),
          businessDecisionKey,
          m3_5aIdempotencyKey,
        };
      },
    });
  }

  // 3. DECIDE. The read-only §18 finder returns FOUND (authoritative, fully verified) / NONE, or throws
  //    a typed CONFLICT. FOUND ⇒ drift-safe crash-repair completion. NONE ⇒ fail closed under runtime
  //    semantic drift (§14) then decide ONCE over the FROZEN input via the sanctioned M3.5A path.
  const found = await findExactHistoricalDecision({
    businessDecisionKey: frozen.businessDecisionKey,
    idempotencyKey: frozen.m3_5aIdempotencyKey,
    inputHash: frozen.decideInputHash,
    expectedEngineContractVersion: frozen.expectedEngineContractVersion,
    expectedEngineInputSchemaVersion: frozen.expectedEngineInputSchemaVersion,
    expectedCorpusVersion: frozen.expectedCorpusVersion,
  });
  let snapshotId: string;
  let reused: boolean;
  if (found.kind === 'FOUND') {
    snapshotId = found.snapshot.id;
    reused = true;
  } else {
    assertNoRuntimeDrift(frozen);
    const snapshot = await decideAndPersist({
      // The VALIDATED, version-dispatched-parsed DecideInput (no unsafe cast on the load path).
      input: frozen.parsedDecideInput,
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
    findExact: (q) => findExactHistoricalDecision(q),
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

/**
 * Fail-closed §14 gate BEFORE a NEW decision is computed for a frozen-but-undecided request. It gates
 * ONLY the pins whose CURRENT value participates in re-deriving the decision through the sanctioned
 * M3.5A path — corpus authority (decideAndPersist re-verifies corpus provenance against the CURRENT
 * corpus) and engine contract / input-schema (the CURRENT engine decides). The HOLIDAY calendar is NOT
 * gated on current equality here (Sol Closure 7): the exact holiday dates were frozen INTO the
 * DecideInput and the decision is computed over that frozen input, so a later CURRENT holiday-version
 * advance does not make an unbound historical v1 request unrepairable. The stored holiday version's own
 * retained-registry self-integrity (version resolvable + content digest reproduces + frozen dates ==
 * retained dates) is already proven on every authoritative request load by the version-dispatched parser.
 */
function assertNoRuntimeDrift(frozen: {
  expectedCorpusVersion: string;
  expectedCorpusSemanticDigest: string;
  expectedEngineInputSchemaVersion: string;
  expectedEngineContractVersion: string;
}): void {
  const corpus = loadCorpus();
  const currentCorpusSemanticDigest = computeCorpusSemanticDigest(corpus);
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
  if (drifted.length > 0) {
    throw new PurchaseIntentSemanticDriftError(
      `frozen decision request is stale under current runtime semantics: ${drifted.join('; ')}`,
    );
  }
}

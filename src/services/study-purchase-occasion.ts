// PagaMenos · src/services — PurchaseOccasionCapability (M3.5B-B1 Opportunity Identity). SANCTIONED.
//
// Turns ONE finalized A2 PurchaseIntent into ONE durable, immutable opportunity identity that B2
// (exposure/reconciliation) and C1 (evidence/attribution) can hold forever as their join target.
//
// PUBLIC vs INTERNAL surface (accepted Sol Finding 1 discipline): each operation is a PUBLIC
// one-request-argument wrapper plus an INTERNAL `*WithDeps(request, deps)`. Only the wrappers are
// re-exported by the public barrel; the injectable seam (repository + trusted clock) is reachable only
// from this sanctioned file and tests (module `@/services/study-purchase-occasion` is in the
// deep-service forbidden set). No participant caller can inject a repository, a clock, a timestamp, or
// any identity fact — every immutable fact is derived server-side from the accepted A2 rows.
//
// B1 OWNS IDENTITY ONLY. Nothing here evaluates exposure, reconciles/merges occasions, attributes
// evidence, applies the "meaningful opportunity" economic threshold, or counts anything: those are
// B2/C1/C2 and are deliberately absent.
import {
  purchaseOccasionRepository,
  type MaterializeOccasionResult,
  type PurchaseOccasionRecord,
  type PurchaseOccasionRepository,
} from '@/db/purchase-occasion-repository';
import {
  isTrustedParticipantContext,
  materializeOccasionRequestHash,
  OCCASION_MATERIALIZE_OPERATION_SCOPE,
  PurchaseIntentOwnershipError,
  PurchaseOccasionValidationError,
  type B1TrustedContext,
  type TrustedParticipantContext,
} from '@/study';

/**
 * INTERNAL injectable dependencies. NOT part of any public request and NOT reachable through the
 * public barrel; only this sanctioned file and tests may pass them. `repository` carries the trusted
 * server-side clock (sampled under the intent root lock); a participant caller can supply neither.
 */
export interface PurchaseOccasionDeps {
  repository?: PurchaseOccasionRepository;
}

export interface MaterializePurchaseOccasionRequest {
  trustedParticipantContext: TrustedParticipantContext;
  assignmentId: string;
  /** The origin A2 PurchaseIntent. The only caller-chosen material of the operation. */
  intentId: string;
  idempotencyKey: string;
}

export interface LoadPurchaseOccasionRequest {
  trustedParticipantContext: TrustedParticipantContext;
  assignmentId: string;
  occasionId: string;
}

function requireTrustedContext(value: unknown): TrustedParticipantContext {
  if (!isTrustedParticipantContext(value)) {
    throw new PurchaseOccasionValidationError(
      'a trusted participant context is required for purchase-occasion operations',
    );
  }
  return value;
}

function requireNonEmpty(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new PurchaseOccasionValidationError(`${label} must be a non-empty string`);
  }
  return value;
}

async function assertOwnAssignment(
  repository: PurchaseOccasionRepository,
  context: TrustedParticipantContext,
  assignmentId: string,
): Promise<void> {
  const ownerId = await repository.findAssignmentParticipantId(assignmentId);
  if (ownerId === null || ownerId !== context.participantId) {
    throw new PurchaseIntentOwnershipError();
  }
}

/** Public result shapes (owned here; the raw repository module stays internal to `src/db`). */
export type { MaterializeOccasionResult, PurchaseOccasionRecord };

// ── INTERNAL implementations (dependency-injectable; NOT barrel-exported) ─────────────────────────

/** INTERNAL: materialize (or idempotently resolve) an opportunity identity. See the wrapper. */
export async function materializePurchaseOccasionWithDeps(
  request: MaterializePurchaseOccasionRequest,
  deps: PurchaseOccasionDeps = {},
): Promise<MaterializeOccasionResult> {
  const repository = deps.repository ?? purchaseOccasionRepository;
  requireNonEmpty(request.intentId, 'intentId');
  requireNonEmpty(request.idempotencyKey, 'idempotencyKey');
  const context = requireTrustedContext(request.trustedParticipantContext);
  await assertOwnAssignment(repository, context, request.assignmentId);
  const hashContext: B1TrustedContext = { participantId: context.participantId };
  const requestHash = materializeOccasionRequestHash({
    intentId: request.intentId,
    context: hashContext,
  });
  return repository.materializeOccasion({
    assignmentId: request.assignmentId,
    intentId: request.intentId,
    operationScope: OCCASION_MATERIALIZE_OPERATION_SCOPE,
    idempotencyKey: request.idempotencyKey,
    requestHash,
  });
}

/** INTERNAL: read one durable opportunity identity (coherence-proven). See the wrapper. */
export async function loadPurchaseOccasionWithDeps(
  request: LoadPurchaseOccasionRequest,
  deps: PurchaseOccasionDeps = {},
): Promise<PurchaseOccasionRecord | null> {
  const repository = deps.repository ?? purchaseOccasionRepository;
  requireNonEmpty(request.occasionId, 'occasionId');
  const context = requireTrustedContext(request.trustedParticipantContext);
  await assertOwnAssignment(repository, context, request.assignmentId);
  const record = await repository.loadOccasion(request.occasionId);
  if (record === null) return null;
  // An occasion of ANOTHER assignment is never disclosed through this participant-facing read.
  if (record.assignmentId !== request.assignmentId) throw new PurchaseIntentOwnershipError();
  return record;
}

// ── PUBLIC one-request-argument surface (the ONLY B1 exports re-exported by the barrel) ───────────

/**
 * Materialize THE opportunity identity of one finalized A2 PurchaseIntent, idempotently.
 *
 * Exactly one durable occasion exists per origin intent, forever: a transport retry replays the frozen
 * outcome, a different transport key aliases the same occasion, concurrent attempts converge on one
 * row (DB `UNIQUE(originIntentId)`), and a reused key carrying a materially different request is
 * rejected rather than silently resolved.
 */
export function materializePurchaseOccasion(
  request: MaterializePurchaseOccasionRequest,
): Promise<MaterializeOccasionResult> {
  return materializePurchaseOccasionWithDeps(request);
}

/**
 * Read one durable opportunity identity by id, re-proving its stored immutable facts against the
 * accepted A2 authorities (fail-closed). This is the read B2/C1 build on: given an occasion id, it
 * denotes one and only one durable logical opportunity.
 */
export function loadPurchaseOccasion(
  request: LoadPurchaseOccasionRequest,
): Promise<PurchaseOccasionRecord | null> {
  return loadPurchaseOccasionWithDeps(request);
}

// PagaMenos · src/services — PurchaseIntentCapability (A2 §5/§8/§9/§10). SANCTIONED.
//
// The participant-facing PurchaseIntent lifecycle, behind a TRUSTED participant context. Every command
// follows the accepted study ordering: (1) validate/normalize the material input FIRST (a malformed
// signature or portfolio is rejected before any receipt lookup, so an invalid request can never replay
// a prior valid receipt); (2) bind the participant's OWN assignment (an arbitrary assignmentId is never
// trusted); (3) compute the operation-discriminated material request hash; (4) delegate to the raw A2
// repository, which locks the correct row, allocates sequences, gates state, and appends the row + its
// durable receipt atomically. The raw `purchase-intent-repository` is reachable from here (and, read
// only, from the decision saga) — enforced by the module-capability AST test.
import { randomUUID } from 'node:crypto';

import {
  purchaseIntentRepository,
  type AppendContextResult,
  type AppendEligibilityProfileResult,
  type CaptureTokenRecord,
  type CreatePurchaseIntentResult,
  type FinalizeResult,
  type InvalidateResult,
  type PurchaseIntentRepository,
} from '@/db/purchase-intent-repository';
import {
  A2_CONTEXT_SCHEMA_VERSION_V1,
  A2_PORTFOLIO_SCHEMA_VERSION_V1,
  appendContextRequestHash,
  appendEligibilityProfileRequestHash,
  createPurchaseIntentRequestHash,
  ELIGIBILITY_PROFILE_APPEND_OPERATION_SCOPE,
  finalizeRequestHash,
  INTENT_CONTEXT_APPEND_OPERATION_SCOPE,
  INTENT_CREATE_OPERATION_SCOPE,
  INTENT_FINALIZE_OPERATION_SCOPE,
  INTENT_INVALIDATE_OPERATION_SCOPE,
  invalidateRequestHash,
  isTrustedParticipantContext,
  normalizeA2PurchaseSignatureV1,
  normalizeEligibilityPortfolioV1,
  PurchaseIntentOwnershipError,
  PurchaseIntentValidationError,
  resolveTrustedEntrySource,
  type A2TrustedContext,
  type TrustedEntryEvidence,
  type TrustedParticipantContext,
} from '@/study';

export interface PurchaseIntentDeps {
  repository?: PurchaseIntentRepository;
  /** Trusted server clock (sampled for stored `*At` facts; never part of any request hash). */
  now?: () => Date;
}

const INTENT_TYPES = ['BUYING_NOW', 'BUYING_TODAY', 'CONSIDERING_LATER', 'EXPLORATORY'] as const;
type IntentTypeValue = (typeof INTENT_TYPES)[number];
const INVALIDATION_REASONS = [
  'SUPERSEDED_BY_REPLACEMENT',
  'PARTICIPANT_CORRECTION',
  'DATA_ENTRY_ERROR',
  'OTHER',
] as const;
type InvalidationReasonValue = (typeof INVALIDATION_REASONS)[number];

// ── request shapes ────────────────────────────────────────────────────────────────────────────────
export interface CaptureIntentTokenRequest {
  trustedParticipantContext: TrustedParticipantContext;
  assignmentId: string;
  clientCorrelationNonce: string;
  /** Trusted server-resolved entry evidence (A2 §8); the entrySource is derived, never client-chosen. */
  entryEvidence: readonly TrustedEntryEvidence[];
}
export interface CreatePurchaseIntentRequest {
  trustedParticipantContext: TrustedParticipantContext;
  assignmentId: string;
  intentCaptureKey: string;
  intentType: IntentTypeValue;
  idempotencyKey: string;
}
export interface AppendPurchaseIntentContextRequest {
  trustedParticipantContext: TrustedParticipantContext;
  assignmentId: string;
  intentId: string;
  contextCaptureKey: string;
  /** Raw purchase signature (pure family object); normalized (complete-signature-only) here. */
  signature: unknown;
  /** The intended transaction instant (ISO-8601); the trusted temporal authority for the decision. */
  intendedTransactionAt: string;
  idempotencyKey: string;
}
export interface AppendEligibilityProfileRequest {
  trustedParticipantContext: TrustedParticipantContext;
  assignmentId: string;
  profileCaptureKey: string;
  /** Raw portfolio; normalized (card-number-free) here. */
  portfolio: unknown;
  idempotencyKey: string;
}
export interface FinalizePurchaseIntentRequest {
  trustedParticipantContext: TrustedParticipantContext;
  assignmentId: string;
  intentId: string;
  contextVersionId: string;
  eligibilityProfileVersionId: string;
  idempotencyKey: string;
}
export interface InvalidatePurchaseIntentRequest {
  trustedParticipantContext: TrustedParticipantContext;
  assignmentId: string;
  invalidatedIntentId: string;
  replacementIntentId?: string | null;
  reasonCode?: InvalidationReasonValue | null;
  idempotencyKey: string;
}

function requireTrustedContext(value: unknown): TrustedParticipantContext {
  if (!isTrustedParticipantContext(value)) {
    throw new PurchaseIntentValidationError(
      'a trusted participant context is required for purchase-intent operations',
    );
  }
  return value;
}

async function assertOwnAssignment(
  repository: PurchaseIntentRepository,
  context: TrustedParticipantContext,
  assignmentId: string,
): Promise<void> {
  const ownerId = await repository.findAssignmentParticipantId(assignmentId);
  // A missing assignment or a mismatch both fail as ownership violations (no existence leak, §5/§7).
  if (ownerId === null || ownerId !== context.participantId) {
    throw new PurchaseIntentOwnershipError();
  }
}

function requireEnum<T extends string>(value: unknown, allowed: readonly T[], label: string): T {
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
    throw new PurchaseIntentValidationError(`${label} must be one of ${allowed.join(', ')}`);
  }
  return value as T;
}

function requireNonEmpty(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new PurchaseIntentValidationError(`${label} must be a non-empty string`);
  }
  return value;
}

/** Issue (or idempotently return) a durable capture token for the participant's own assignment (§5). */
export async function captureIntentToken(
  request: CaptureIntentTokenRequest,
  deps: PurchaseIntentDeps = {},
): Promise<CaptureTokenRecord> {
  const repository = deps.repository ?? purchaseIntentRepository;
  const context = requireTrustedContext(request.trustedParticipantContext);
  requireNonEmpty(request.clientCorrelationNonce, 'clientCorrelationNonce');
  await assertOwnAssignment(repository, context, request.assignmentId);
  // Trusted server-resolved entry provenance (never client-chosen); immutably bound at issuance.
  const entrySource = resolveTrustedEntrySource(request.entryEvidence);
  return repository.issueCaptureToken({
    assignmentId: request.assignmentId,
    clientCorrelationNonce: request.clientCorrelationNonce,
    intentCaptureKey: `pi_${randomUUID()}`,
    entrySource,
  });
}

/** Create the immutable PurchaseIntent for a capture token (§5.2/§20). */
export async function createPurchaseIntent(
  request: CreatePurchaseIntentRequest,
  deps: PurchaseIntentDeps = {},
): Promise<CreatePurchaseIntentResult> {
  const repository = deps.repository ?? purchaseIntentRepository;
  const now = deps.now ?? (() => new Date());
  const intentType = requireEnum(request.intentType, INTENT_TYPES, 'intentType');
  requireNonEmpty(request.intentCaptureKey, 'intentCaptureKey');
  const context = requireTrustedContext(request.trustedParticipantContext);
  await assertOwnAssignment(repository, context, request.assignmentId);
  const hashContext: A2TrustedContext = { participantId: context.participantId };
  const requestHash = createPurchaseIntentRequestHash({
    intentCaptureKey: request.intentCaptureKey,
    intentType,
    context: hashContext,
  });
  return repository.createPurchaseIntent({
    assignmentId: request.assignmentId,
    intentCaptureKey: request.intentCaptureKey,
    intentType,
    initiatedAt: now().toISOString(),
    operationScope: INTENT_CREATE_OPERATION_SCOPE,
    idempotencyKey: request.idempotencyKey,
    requestHash,
  });
}

/** Append a corrigible complete-signature context version (§8). */
export async function appendPurchaseIntentContext(
  request: AppendPurchaseIntentContextRequest,
  deps: PurchaseIntentDeps = {},
): Promise<AppendContextResult> {
  const repository = deps.repository ?? purchaseIntentRepository;
  const now = deps.now ?? (() => new Date());
  // 1. Normalize the signature FIRST (complete-signature-only; rejects mixed/unknown before any lookup).
  const signature = normalizeA2PurchaseSignatureV1(request.signature);
  requireNonEmpty(request.contextCaptureKey, 'contextCaptureKey');
  const intendedTransactionAt = normalizeInstant(
    request.intendedTransactionAt,
    'intendedTransactionAt',
  );
  const context = requireTrustedContext(request.trustedParticipantContext);
  await assertOwnAssignment(repository, context, request.assignmentId);
  const hashContext: A2TrustedContext = { participantId: context.participantId };
  const requestHash = appendContextRequestHash({
    intentId: request.intentId,
    contextCaptureKey: request.contextCaptureKey,
    contextSchemaVersion: A2_CONTEXT_SCHEMA_VERSION_V1,
    intendedTransactionAt,
    signature,
    context: hashContext,
  });
  return repository.appendContext({
    assignmentId: request.assignmentId,
    intentId: request.intentId,
    contextCaptureKey: request.contextCaptureKey,
    contextSchemaVersion: A2_CONTEXT_SCHEMA_VERSION_V1,
    merchantId: signature.merchantId,
    signatureKind: signature.kind,
    intendedTransactionAt,
    purchaseSignatureJson: signature as unknown,
    capturedAt: now().toISOString(),
    operationScope: INTENT_CONTEXT_APPEND_OPERATION_SCOPE,
    idempotencyKey: request.idempotencyKey,
    requestHash,
  });
}

/** Append an assignment-scoped eligibility profile version (§10). */
export async function appendEligibilityProfile(
  request: AppendEligibilityProfileRequest,
  deps: PurchaseIntentDeps = {},
): Promise<AppendEligibilityProfileResult> {
  const repository = deps.repository ?? purchaseIntentRepository;
  const now = deps.now ?? (() => new Date());
  // 1. Normalize the portfolio FIRST (card-number-free; deterministic).
  const portfolio = normalizeEligibilityPortfolioV1(request.portfolio);
  requireNonEmpty(request.profileCaptureKey, 'profileCaptureKey');
  const context = requireTrustedContext(request.trustedParticipantContext);
  await assertOwnAssignment(repository, context, request.assignmentId);
  const hashContext: A2TrustedContext = { participantId: context.participantId };
  const requestHash = appendEligibilityProfileRequestHash({
    assignmentId: request.assignmentId,
    profileCaptureKey: request.profileCaptureKey,
    portfolioSchemaVersion: A2_PORTFOLIO_SCHEMA_VERSION_V1,
    portfolio,
    context: hashContext,
  });
  return repository.appendEligibilityProfile({
    assignmentId: request.assignmentId,
    profileCaptureKey: request.profileCaptureKey,
    portfolioSchemaVersion: A2_PORTFOLIO_SCHEMA_VERSION_V1,
    portfolioJson: portfolio as unknown,
    capturedAt: now().toISOString(),
    operationScope: ELIGIBILITY_PROFILE_APPEND_OPERATION_SCOPE,
    idempotencyKey: request.idempotencyKey,
    requestHash,
  });
}

/** Finalize an intent by pinning its exact context + eligibility profile versions (§9). */
export async function finalizePurchaseIntent(
  request: FinalizePurchaseIntentRequest,
  deps: PurchaseIntentDeps = {},
): Promise<FinalizeResult> {
  const repository = deps.repository ?? purchaseIntentRepository;
  const now = deps.now ?? (() => new Date());
  requireNonEmpty(request.contextVersionId, 'contextVersionId');
  requireNonEmpty(request.eligibilityProfileVersionId, 'eligibilityProfileVersionId');
  const context = requireTrustedContext(request.trustedParticipantContext);
  await assertOwnAssignment(repository, context, request.assignmentId);
  const hashContext: A2TrustedContext = { participantId: context.participantId };
  const requestHash = finalizeRequestHash({
    intentId: request.intentId,
    contextVersionId: request.contextVersionId,
    eligibilityProfileVersionId: request.eligibilityProfileVersionId,
    context: hashContext,
  });
  return repository.finalize({
    assignmentId: request.assignmentId,
    intentId: request.intentId,
    contextVersionId: request.contextVersionId,
    eligibilityProfileVersionId: request.eligibilityProfileVersionId,
    finalizedAt: now().toISOString(),
    operationScope: INTENT_FINALIZE_OPERATION_SCOPE,
    idempotencyKey: request.idempotencyKey,
    requestHash,
  });
}

/** Invalidate an intent, optionally superseding it with a replacement in the same assignment (§10/§23). */
export async function invalidatePurchaseIntent(
  request: InvalidatePurchaseIntentRequest,
  deps: PurchaseIntentDeps = {},
): Promise<InvalidateResult> {
  const repository = deps.repository ?? purchaseIntentRepository;
  const now = deps.now ?? (() => new Date());
  const replacementIntentId = request.replacementIntentId ?? null;
  const reasonCode =
    request.reasonCode === undefined || request.reasonCode === null
      ? null
      : requireEnum(request.reasonCode, INVALIDATION_REASONS, 'reasonCode');
  const context = requireTrustedContext(request.trustedParticipantContext);
  await assertOwnAssignment(repository, context, request.assignmentId);
  const hashContext: A2TrustedContext = { participantId: context.participantId };
  const requestHash = invalidateRequestHash({
    intentId: request.invalidatedIntentId,
    replacementIntentId,
    reasonCode,
    context: hashContext,
  });
  return repository.invalidate({
    assignmentId: request.assignmentId,
    invalidatedIntentId: request.invalidatedIntentId,
    replacementIntentId,
    reasonCode,
    invalidatedAt: now().toISOString(),
    operationScope: INTENT_INVALIDATE_OPERATION_SCOPE,
    idempotencyKey: request.idempotencyKey,
    requestHash,
  });
}

/** Normalize an ISO-8601 instant to canonical UTC so hash + storage agree (A2 §8). */
function normalizeInstant(value: unknown, label: string): string {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw new PurchaseIntentValidationError(`${label} must be an ISO-8601 timestamp string`);
  }
  return new Date(value).toISOString();
}

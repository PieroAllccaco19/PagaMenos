// PagaMenos · src/services — PurchaseIntentCapability (A2 §5/§8/§9/§10). SANCTIONED.
//
// The participant-facing PurchaseIntent lifecycle, behind a TRUSTED participant context. Each command
// follows the accepted ordering: (1) validate/normalize the material input FIRST; (2) bind the
// participant's OWN assignment; (3) compute the operation-discriminated material request hash; (4)
// delegate to the raw A2 repository, which locks the assignment (then the intent), samples the trusted
// collection time under the lock, enforces Consent Model A, and appends the row + its durable receipt.
//
// PUBLIC vs INTERNAL surface (Sol Finding 1): each operation is a PUBLIC one-request-argument wrapper
// plus an INTERNAL `*WithDeps(request, deps)`. Only the wrappers are re-exported by the public barrel;
// the `*WithDeps` (and thus dependency injection — repository, trusted clock) are reachable only from
// this sanctioned file and tests (module `@/services/study-purchase-intent` is in the deep-service
// forbidden set). No participant caller can inject a repository or a clock, nor supply a timestamp.
//
// TRUSTED entry provenance (Sol Finding 3): `captureIntentToken` accepts a branded `ResolvedEntrySource`
// that ONLY the trusted session adapter can mint (registry-backed, unforgeable). A participant-facing
// request cannot submit a plain `{ kind: 'RESEARCH_LINK', … }` object and self-assign trusted provenance.
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
  isResolvedEntrySource,
  isTrustedParticipantContext,
  normalizeA2PurchaseSignatureV1,
  normalizeEligibilityPortfolioV1,
  PurchaseIntentOwnershipError,
  PurchaseIntentValidationError,
  type A2TrustedContext,
  type ResolvedEntrySource,
  type TrustedParticipantContext,
} from '@/study';

/**
 * INTERNAL injectable dependencies (Sol Finding 1). NOT part of any public request and NOT reachable
 * through the public barrel; only this sanctioned file and tests may pass them. `repository` carries
 * the trusted server-side clock (sampled under the row lock); a participant caller can supply neither.
 */
export interface PurchaseIntentDeps {
  repository?: PurchaseIntentRepository;
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

// ── request shapes (participant-facing; NO clock, NO repo, NO raw trusted evidence) ─────────────────
export interface CaptureIntentTokenRequest {
  trustedParticipantContext: TrustedParticipantContext;
  assignmentId: string;
  clientCorrelationNonce: string;
  /** A trusted, server-minted entry provenance (branded; unforgeable — Sol Finding 3). */
  resolvedEntrySource: ResolvedEntrySource;
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

/** Normalize an ISO-8601 instant to canonical UTC so hash + storage agree (A2 §8). */
function normalizeInstant(value: unknown, label: string): string {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw new PurchaseIntentValidationError(`${label} must be an ISO-8601 timestamp string`);
  }
  return new Date(value).toISOString();
}

// ── INTERNAL implementations (dependency-injectable; NOT barrel-exported) ───────────────────────────

export async function captureIntentTokenWithDeps(
  request: CaptureIntentTokenRequest,
  deps: PurchaseIntentDeps = {},
): Promise<CaptureTokenRecord> {
  const repository = deps.repository ?? purchaseIntentRepository;
  const context = requireTrustedContext(request.trustedParticipantContext);
  requireNonEmpty(request.clientCorrelationNonce, 'clientCorrelationNonce');
  if (!isResolvedEntrySource(request.resolvedEntrySource)) {
    // A plain/forged object is rejected — trusted entry provenance is minted only server-side.
    throw new PurchaseIntentValidationError(
      'a trusted (server-minted) resolvedEntrySource is required; raw evidence is not accepted',
    );
  }
  await assertOwnAssignment(repository, context, request.assignmentId);
  return repository.issueCaptureToken({
    assignmentId: request.assignmentId,
    clientCorrelationNonce: request.clientCorrelationNonce,
    intentCaptureKey: mintIntentCaptureKey(),
    entrySource: request.resolvedEntrySource.entrySource,
  });
}

export async function createPurchaseIntentWithDeps(
  request: CreatePurchaseIntentRequest,
  deps: PurchaseIntentDeps = {},
): Promise<CreatePurchaseIntentResult> {
  const repository = deps.repository ?? purchaseIntentRepository;
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
    operationScope: INTENT_CREATE_OPERATION_SCOPE,
    idempotencyKey: request.idempotencyKey,
    requestHash,
  });
}

export async function appendPurchaseIntentContextWithDeps(
  request: AppendPurchaseIntentContextRequest,
  deps: PurchaseIntentDeps = {},
): Promise<AppendContextResult> {
  const repository = deps.repository ?? purchaseIntentRepository;
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
    operationScope: INTENT_CONTEXT_APPEND_OPERATION_SCOPE,
    idempotencyKey: request.idempotencyKey,
    requestHash,
  });
}

export async function appendEligibilityProfileWithDeps(
  request: AppendEligibilityProfileRequest,
  deps: PurchaseIntentDeps = {},
): Promise<AppendEligibilityProfileResult> {
  const repository = deps.repository ?? purchaseIntentRepository;
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
    operationScope: ELIGIBILITY_PROFILE_APPEND_OPERATION_SCOPE,
    idempotencyKey: request.idempotencyKey,
    requestHash,
  });
}

export async function finalizePurchaseIntentWithDeps(
  request: FinalizePurchaseIntentRequest,
  deps: PurchaseIntentDeps = {},
): Promise<FinalizeResult> {
  const repository = deps.repository ?? purchaseIntentRepository;
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
    operationScope: INTENT_FINALIZE_OPERATION_SCOPE,
    idempotencyKey: request.idempotencyKey,
    requestHash,
  });
}

export async function invalidatePurchaseIntentWithDeps(
  request: InvalidatePurchaseIntentRequest,
  deps: PurchaseIntentDeps = {},
): Promise<InvalidateResult> {
  const repository = deps.repository ?? purchaseIntentRepository;
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
    operationScope: INTENT_INVALIDATE_OPERATION_SCOPE,
    idempotencyKey: request.idempotencyKey,
    requestHash,
  });
}

/** Server-minted opaque capture identity (never client-chosen). */
function mintIntentCaptureKey(): string {
  return `pi_${randomUUID()}`;
}

// ── PUBLIC one-request-argument surface (the ONLY A2 lifecycle exports re-exported by the barrel) ───

/** Issue (or idempotently return) a durable capture token for the participant's own assignment (§5). */
export function captureIntentToken(
  request: CaptureIntentTokenRequest,
): Promise<CaptureTokenRecord> {
  return captureIntentTokenWithDeps(request);
}
/** Create the immutable PurchaseIntent for a capture token (§5.2/§20). */
export function createPurchaseIntent(
  request: CreatePurchaseIntentRequest,
): Promise<CreatePurchaseIntentResult> {
  return createPurchaseIntentWithDeps(request);
}
/** Append a corrigible complete-signature context version (§8). */
export function appendPurchaseIntentContext(
  request: AppendPurchaseIntentContextRequest,
): Promise<AppendContextResult> {
  return appendPurchaseIntentContextWithDeps(request);
}
/** Append an assignment-scoped eligibility profile version (§10). */
export function appendEligibilityProfile(
  request: AppendEligibilityProfileRequest,
): Promise<AppendEligibilityProfileResult> {
  return appendEligibilityProfileWithDeps(request);
}
/** Finalize an intent by pinning its exact context + eligibility profile versions (§9). */
export function finalizePurchaseIntent(
  request: FinalizePurchaseIntentRequest,
): Promise<FinalizeResult> {
  return finalizePurchaseIntentWithDeps(request);
}
/** Invalidate an intent, optionally superseding it with a replacement in the same assignment (§10/§23). */
export function invalidatePurchaseIntent(
  request: InvalidatePurchaseIntentRequest,
): Promise<InvalidateResult> {
  return invalidatePurchaseIntentWithDeps(request);
}

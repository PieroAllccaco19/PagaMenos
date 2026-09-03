// PagaMenos · src/services — ParticipantConsentCapability (spec §8/§11/§12). SANCTIONED.
//
// The participant-facing consent surface, behind a TRUSTED participant context (§12). Ordering (§8.10):
//   1. validate input schema FIRST — a GRANT bearing the forbidden `assertedEffectiveAt` is rejected
//      here, BEFORE any receipt lookup, so an invalid request can never replay a prior valid receipt;
//   2. resolve/verify the participant's OWN assignment (an arbitrary assignmentId is never trusted);
//   3. compute the material request hash;
//   4. delegate to the consent repository, which locks the assignment row, reloads state, evaluates
//      the pure state machine, allocates the sequence + samples capturedAt under the lock, appends an
//      event only when state-changing, and appends the receipt with its resultKind.
// The raw `study-consent-repository` is reachable ONLY from here (module-capability AST test).
import {
  ConsentTransitionRejection,
  studyConsentRepository,
  type ConsentCommandResult,
  type ConsentStore,
} from '@/db/study-consent-repository';
import {
  CONSENT_GRANT_OPERATION_SCOPE,
  CONSENT_WITHDRAW_OPERATION_SCOPE,
  consentGrantPayloadSchema,
  consentGrantRequestHash,
  consentWithdrawPayloadSchema,
  consentWithdrawRequestHash,
  evaluateGrant,
  evaluateWithdraw,
  isTrustedParticipantContext,
  parseStudyInput,
  StudyAssignmentOwnershipError,
  StudyConsentInvalidTransitionError,
  StudyConsentUpdateNotSupportedError,
  StudyValidationError,
  type ConsentGrantPayload,
  type ConsentWithdrawPayload,
  type TrustedContext,
  type TrustedParticipantContext,
} from '@/study';

/** Re-exported so the public barrel need not import from the internal `@/db` layer. */
export type { ConsentCommandResult, ConsentResultKind } from '@/db/study-consent-repository';

export interface ConsentDeps {
  repository?: ConsentStore;
}

export interface RecordConsentGrantRequest {
  trustedParticipantContext: TrustedParticipantContext;
  /** Opaque own-assignment reference; honored only if it belongs to the trusted context (§12). */
  assignmentId: string;
  consentPayload: ConsentGrantPayload;
  idempotencyKey: string;
}

export interface RecordConsentWithdrawalRequest {
  trustedParticipantContext: TrustedParticipantContext;
  assignmentId: string;
  withdrawPayload?: ConsentWithdrawPayload;
  idempotencyKey: string;
}

function requireTrustedContext(value: unknown): TrustedParticipantContext {
  if (!isTrustedParticipantContext(value)) {
    throw new StudyValidationError(
      'a trusted participant context is required for consent operations',
    );
  }
  return value;
}

async function assertOwnAssignment(
  repository: ConsentStore,
  context: TrustedParticipantContext,
  assignmentId: string,
): Promise<void> {
  const ownerId = await repository.findAssignmentParticipantId(assignmentId);
  // A missing assignment or a mismatch both fail as ownership violations (no existence leak, §12).
  if (ownerId === null || ownerId !== context.participantId) {
    throw new StudyAssignmentOwnershipError();
  }
}

/** Translate the repository's transition-rejection signal into the spec's typed errors (§8.3). */
function mapRejection(e: unknown): never {
  if (e instanceof ConsentTransitionRejection) {
    if (e.reason === 'UPDATE_NOT_SUPPORTED') throw new StudyConsentUpdateNotSupportedError();
    throw new StudyConsentInvalidTransitionError(e.fromState ?? 'UNKNOWN', e.command ?? 'GRANT');
  }
  throw e;
}

/**
 * Sanctioned READ-ONLY consent-authorization facade (A2 §7 Consent Model A). Returns the ordered
 * append-only consent event stream for an assignment, so a trusted A2 collection path can evaluate the
 * accepted A1 authority `wasCollectionAuthorizedAtKnownTime(...)` against it. It exposes NO write
 * capability and NO raw consent repository. A2's atomic enforcement additionally reads these facts
 * under the assignment row lock (so a concurrent withdrawal cannot interleave); this facade is the
 * sanctioned surface for non-transactional reads and tests. The raw `study-consent-repository` remains
 * reachable only from this owning service.
 */
export async function readConsentAuthorizationFacts(
  assignmentId: string,
): Promise<import('@/study').ConsentEventFact[]> {
  return studyConsentRepository.listEvents(assignmentId);
}

/** Record a consent GRANT for the participant's own assignment (spec §8.2/§8.3). */
export async function recordConsentGrant(
  request: RecordConsentGrantRequest,
  deps: ConsentDeps = {},
): Promise<ConsentCommandResult> {
  const repository = deps.repository ?? studyConsentRepository;
  // 1. Schema validation FIRST — rejects a forbidden `assertedEffectiveAt` before any receipt lookup.
  const payload = parseStudyInput(
    consentGrantPayloadSchema,
    request.consentPayload,
    'consent grant payload',
  );
  // 2. Trusted own-assignment binding.
  const context = requireTrustedContext(request.trustedParticipantContext);
  await assertOwnAssignment(repository, context, request.assignmentId);
  // 3. Material request hash (resolved own assignment + all provenance + trusted participant identity).
  const hashContext: TrustedContext = { participantId: context.participantId };
  const requestHash = consentGrantRequestHash({
    assignmentId: request.assignmentId,
    consentVersion: payload.consentVersion,
    privacyNoticeVersion: payload.privacyNoticeVersion,
    optionalEvidenceConsent: payload.optionalEvidenceConsent,
    context: hashContext,
  });
  // 4. Serialize + evaluate + append under the assignment row lock.
  try {
    return await repository.recordConsentCommand({
      operationScope: CONSENT_GRANT_OPERATION_SCOPE,
      assignmentId: request.assignmentId,
      idempotencyKey: request.idempotencyKey,
      requestHash,
      grantProvenance: payload,
      evaluate: (events) => evaluateGrant(events, payload),
    });
  } catch (e) {
    return mapRejection(e);
  }
}

/** Record a consent WITHDRAWAL for the participant's own assignment (spec §8.3/§8.6). */
export async function recordConsentWithdrawal(
  request: RecordConsentWithdrawalRequest,
  deps: ConsentDeps = {},
): Promise<ConsentCommandResult> {
  const repository = deps.repository ?? studyConsentRepository;
  // 1. Schema validation FIRST.
  const payload = parseStudyInput(
    consentWithdrawPayloadSchema,
    request.withdrawPayload ?? {},
    'consent withdraw payload',
  );
  // 2. Trusted own-assignment binding.
  const context = requireTrustedContext(request.trustedParticipantContext);
  await assertOwnAssignment(repository, context, request.assignmentId);
  // Normalize the asserted instant to canonical UTC so hash + equality + storage all agree (§8.6/§10).
  const assertedEffectiveAt =
    payload.assertedEffectiveAt !== undefined
      ? new Date(payload.assertedEffectiveAt).toISOString()
      : null;
  // 3. Material request hash (own assignment + assertedEffectiveAt if present + trusted identity).
  const hashContext: TrustedContext = { participantId: context.participantId };
  const requestHash = consentWithdrawRequestHash({
    assignmentId: request.assignmentId,
    assertedEffectiveAt,
    context: hashContext,
  });
  // 4. Serialize + evaluate + append under the assignment row lock.
  try {
    return await repository.recordConsentCommand({
      operationScope: CONSENT_WITHDRAW_OPERATION_SCOPE,
      assignmentId: request.assignmentId,
      idempotencyKey: request.idempotencyKey,
      requestHash,
      assertedEffectiveAt: assertedEffectiveAt !== null ? new Date(assertedEffectiveAt) : null,
      evaluate: (events) => evaluateWithdraw(events, assertedEffectiveAt),
    });
  } catch (e) {
    return mapRejection(e);
  }
}

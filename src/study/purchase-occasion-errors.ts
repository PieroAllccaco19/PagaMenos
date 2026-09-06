// PagaMenos · src/study — M3.5B-B1 typed Opportunity-Identity domain errors.
//
// Every B1 identity-integrity failure is an explicit typed error, never a bare Error/500. Pure module
// (no I/O). Names follow the accepted A1 `Study*Error` / A2 `PurchaseIntent*Error` convention.
//
// B1 deliberately does NOT reuse the A2 error classes: an A2 caller catching
// `PurchaseIntentCaptureConflictError` must never silently absorb a B1 occasion-identity fault, and a
// B1 caller must be able to discriminate an identity failure from an upstream intent failure. The A2
// errors that describe *upstream A2 state* (`PurchaseIntentNotFinalizedError`,
// `PurchaseIntentInvalidatedError`, `PurchaseIntentOwnershipError`) ARE reused verbatim, because B1
// reports the accepted A2 fact rather than redefining it.

/** Base class for all M3.5B-B1 PurchaseOccasion (opportunity identity) domain errors. */
export class PurchaseOccasionError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'PurchaseOccasionError';
  }
}

/** Malformed/invalid material input for a B1 operation (schema/domain validation). */
export class PurchaseOccasionValidationError extends PurchaseOccasionError {
  constructor(message: string) {
    super('PURCHASE_OCCASION_VALIDATION', message);
    this.name = 'PurchaseOccasionValidationError';
  }
}

/**
 * One origin PurchaseIntent cannot yield two materially different occasions (B1 uniqueness boundary).
 * Raised when a second materialization for the SAME intent carries a materially different request than
 * the one frozen by the origin `MATERIALIZED` receipt — the alias is refused rather than silently
 * resolving to an occasion the caller did not ask for.
 */
export class PurchaseOccasionConflictError extends PurchaseOccasionError {
  constructor(message: string) {
    super('PURCHASE_OCCASION_CONFLICT', message);
    this.name = 'PurchaseOccasionConflictError';
  }
}

/**
 * A durable occasion's stored immutable identity facts disagree with the accepted A2 authorities it
 * claims to originate from. Fail closed — never return a semantically wrong opportunity identity.
 */
export class PurchaseOccasionCoherenceError extends PurchaseOccasionError {
  constructor(
    public readonly reason:
      | 'ASSIGNMENT_MISMATCH'
      | 'FINALIZATION_MISMATCH'
      | 'CONTEXT_VERSION_MISMATCH'
      | 'MERCHANT_MISMATCH'
      | 'INTENDED_TRANSACTION_AT_MISMATCH'
      | 'IDENTITY_DIGEST_MISMATCH'
      | 'UNSUPPORTED_OCCASION_SCHEMA_VERSION'
      | 'ORIGIN_INTENT_MISSING'
      | 'ORIGIN_FINALIZATION_MISSING',
    message: string,
  ) {
    super('PURCHASE_OCCASION_COHERENCE', message);
    this.name = 'PurchaseOccasionCoherenceError';
  }
}

/** A transport idempotency key was reused for a materially different B1 request. */
export class PurchaseOccasionIdempotencyConflictError extends PurchaseOccasionError {
  constructor(
    public readonly operationScope: string,
    public readonly idempotencyKey: string,
    public readonly existingRequestHash: string,
    public readonly attemptedRequestHash: string,
  ) {
    super(
      'PURCHASE_OCCASION_IDEMPOTENCY_CONFLICT',
      `idempotency key ${JSON.stringify(idempotencyKey)} for operation ${JSON.stringify(
        operationScope,
      )} was already used for a materially different request`,
    );
    this.name = 'PurchaseOccasionIdempotencyConflictError';
  }
}

/** A B1 persistence-layer invariant was violated (wrapped unexpected/structural failure). */
export class PurchaseOccasionInvariantError extends PurchaseOccasionError {
  constructor(message: string, options?: { cause?: unknown }) {
    super('PURCHASE_OCCASION_INVARIANT', message, options);
    this.name = 'PurchaseOccasionInvariantError';
  }
}

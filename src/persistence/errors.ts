// PagaMenos · src/persistence — typed persistence errors (§30).
//
// Every known persistence failure is translated to one of these at the repository boundary, so
// application code never parses raw database error strings. Unexpected database failures are wrapped
// as `PersistenceInvariantError` (with the original cause preserved) rather than leaking driver text.

/** Base class for all decision-persistence invariant violations. */
export class PersistenceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'PersistenceError';
  }
}

/**
 * A transport idempotency key was reused with a *different* decision payload (a different input or
 * output hash, or a different business decision key). The historical record is never overwritten;
 * the caller must not reuse one idempotency key for two distinct decisions.
 */
export class IdempotencyConflictError extends PersistenceError {
  constructor(
    public readonly idempotencyKey: string,
    public readonly existingInputHash: string,
    public readonly existingOutputHash: string,
    public readonly attemptedInputHash: string,
    public readonly attemptedOutputHash: string,
  ) {
    super(
      'IDEMPOTENCY_CONFLICT',
      `idempotencyKey '${idempotencyKey}' already persisted a different decision ` +
        `(stored ${existingInputHash.slice(0, 12)}/${existingOutputHash.slice(0, 12)}, ` +
        `attempted ${attemptedInputHash.slice(0, 12)}/${attemptedOutputHash.slice(0, 12)})`,
    );
    this.name = 'IdempotencyConflictError';
  }
}

/**
 * A domain-level business decision key already identifies a *different* historical decision. Distinct
 * from `IdempotencyConflictError`: this is the study-domain occurrence collision, not a transport
 * retry collision. The existing historical decision is never rewritten.
 */
export class BusinessDecisionConflictError extends PersistenceError {
  constructor(
    public readonly businessDecisionKey: string,
    public readonly existingInputHash: string,
    public readonly existingOutputHash: string,
    public readonly attemptedInputHash: string,
    public readonly attemptedOutputHash: string,
  ) {
    super(
      'BUSINESS_DECISION_CONFLICT',
      `businessDecisionKey '${businessDecisionKey}' already identifies a different historical ` +
        `decision (stored ${existingInputHash.slice(0, 12)}/${existingOutputHash.slice(0, 12)}, ` +
        `attempted ${attemptedInputHash.slice(0, 12)}/${attemptedOutputHash.slice(0, 12)})`,
    );
    this.name = 'BusinessDecisionConflictError';
  }
}

/**
 * A stored snapshot's canonical input/output no longer matches its recorded `inputHash`/`outputHash`
 * (tampering, corruption, or a serialization regression). Read paths MUST surface this rather than
 * returning a corrupted snapshot as if it were valid (§28).
 */
export class SnapshotIntegrityError extends PersistenceError {
  constructor(
    public readonly field: 'inputHash' | 'outputHash',
    public readonly expected: string,
    public readonly actual: string,
    public readonly snapshotId?: string,
  ) {
    super(
      'SNAPSHOT_INTEGRITY',
      `snapshot ${snapshotId ?? '(unsaved)'} ${field} mismatch: recorded ${expected.slice(0, 16)}, ` +
        `recomputed ${actual.slice(0, 16)}`,
    );
    this.name = 'SnapshotIntegrityError';
  }
}

/**
 * A persistence-layer structural invariant was violated (a malformed payload that failed runtime
 * validation, a non-canonicalizable value, or an unexpected wrapped database failure).
 */
export class PersistenceInvariantError extends PersistenceError {
  constructor(message: string, options?: { cause?: unknown }) {
    super('PERSISTENCE_INVARIANT', message, options);
    this.name = 'PersistenceInvariantError';
  }
}

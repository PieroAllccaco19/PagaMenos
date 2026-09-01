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
    public readonly existingRequestHash: string,
    public readonly attemptedRequestHash: string,
  ) {
    super(
      'IDEMPOTENCY_CONFLICT',
      `idempotencyKey '${idempotencyKey}' was already consumed by a different request ` +
        `(stored request ${existingRequestHash.slice(0, 12)}, attempted ${attemptedRequestHash.slice(0, 12)})`,
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
    public readonly existingRequestHash: string,
    public readonly attemptedRequestHash: string,
  ) {
    super(
      'BUSINESS_DECISION_CONFLICT',
      `businessDecisionKey '${businessDecisionKey}' already identifies a different historical ` +
        `decision (stored request ${existingRequestHash.slice(0, 12)}, attempted ${attemptedRequestHash.slice(0, 12)})`,
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
 * A stored snapshot's queryable metadata contradicts its historical payload (e.g. `merchantId`,
 * `decisionStatus`, or an instant column disagrees with the parsed input/output). A read path MUST
 * surface this rather than returning a self-contradictory record (§18/§41).
 */
export class SnapshotCoherenceError extends PersistenceError {
  constructor(
    public readonly field: string,
    public readonly columnValue: unknown,
    public readonly payloadValue: unknown,
    public readonly snapshotId?: string,
  ) {
    super(
      'SNAPSHOT_COHERENCE',
      `snapshot ${snapshotId ?? '(unsaved)'} column '${field}' (${JSON.stringify(columnValue)}) ` +
        `contradicts the historical payload (${JSON.stringify(payloadValue)})`,
    );
    this.name = 'SnapshotCoherenceError';
  }
}

/**
 * A persisted record carried an unknown/absent `snapshotSchemaVersion` — it cannot be decoded by any
 * known historical parser and must NOT fall into current parsing (P35A-04 §28).
 */
export class UnsupportedSnapshotVersionError extends PersistenceError {
  constructor(public readonly version: unknown) {
    super(
      'UNSUPPORTED_SNAPSHOT_VERSION',
      `no historical parser for snapshotSchemaVersion ${JSON.stringify(version)}`,
    );
    this.name = 'UnsupportedSnapshotVersionError';
  }
}

/**
 * The static rules/scopes supplied for a NEW decision could not be verified as exact members of the
 * claimed authoritative corpus version — arbitrary/mutated rules may not be labelled Corpus-v1
 * (P35A-05 §35/§36).
 */
export class CorpusProvenanceError extends PersistenceError {
  constructor(message: string) {
    super('CORPUS_PROVENANCE', message);
    this.name = 'CorpusProvenanceError';
  }
}

/**
 * Trusted build identity (git sha) could not be resolved/validated at the persistence boundary for a
 * NEW decision (P35A-05 §34). Never persist a placeholder ("unknown"/"dev"/"") as factual provenance.
 */
export class BuildProvenanceError extends PersistenceError {
  constructor(message: string) {
    super('BUILD_PROVENANCE', message);
    this.name = 'BuildProvenanceError';
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

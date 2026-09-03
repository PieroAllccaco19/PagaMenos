// PagaMenos · src/study — M3.5B-A2 typed domain errors (A2 §34 error model).
//
// Every A2 scientific-integrity failure is an explicit typed error, never a bare Error/500. Pure
// module (no I/O). Names follow the accepted A1 `Study*Error` convention.

/** Base class for all M3.5B-A2 PurchaseIntent/decision domain errors. */
export class PurchaseIntentError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'PurchaseIntentError';
  }
}

/** Malformed/invalid material input for an A2 operation (schema/domain validation). */
export class PurchaseIntentValidationError extends PurchaseIntentError {
  constructor(message: string) {
    super('PURCHASE_INTENT_VALIDATION', message);
    this.name = 'PurchaseIntentValidationError';
  }
}

/** Own-assignment / own-intent trusted-context ownership violation (A2 §5/§7). */
export class PurchaseIntentOwnershipError extends PurchaseIntentError {
  constructor() {
    super('PURCHASE_INTENT_OWNERSHIP', 'operation target does not belong to the trusted actor');
    this.name = 'PurchaseIntentOwnershipError';
  }
}

/** One capture cannot yield two materially different intents (A2 §5.2). */
export class PurchaseIntentCaptureConflictError extends PurchaseIntentError {
  constructor(message: string) {
    super('PURCHASE_INTENT_CAPTURE_CONFLICT', message);
    this.name = 'PurchaseIntentCaptureConflictError';
  }
}

/** Same context-capture identity reused for a materially different context payload (A2 §8.1). */
export class PurchaseIntentContextConflictError extends PurchaseIntentError {
  constructor(message: string) {
    super('PURCHASE_INTENT_CONTEXT_CONFLICT', message);
    this.name = 'PurchaseIntentContextConflictError';
  }
}

/** Context did not instantiate exactly one complete supported purchase signature (A2 §1/§3). */
export class PurchaseIntentContextSignatureError extends PurchaseIntentError {
  constructor(message: string) {
    super('PURCHASE_INTENT_CONTEXT_SIGNATURE', message);
    this.name = 'PurchaseIntentContextSignatureError';
  }
}

/** Context append attempted after finalization (A2 §8). */
export class PurchaseIntentContextAfterFinalizationError extends PurchaseIntentError {
  constructor() {
    super(
      'PURCHASE_INTENT_CONTEXT_AFTER_FINALIZATION',
      'context cannot be appended after the intent is finalized',
    );
    this.name = 'PurchaseIntentContextAfterFinalizationError';
  }
}

/** Same eligibility-profile capture identity reused for a materially different portfolio (A2 §10.1). */
export class EligibilityProfileConflictError extends PurchaseIntentError {
  constructor(message: string) {
    super('ELIGIBILITY_PROFILE_CONFLICT', message);
    this.name = 'EligibilityProfileConflictError';
  }
}

/** An already-invalidated intent was re-invalidated with materially different reason/replacement (A2 §10). */
export class PurchaseIntentInvalidationConflictError extends PurchaseIntentError {
  constructor(message: string) {
    super('PURCHASE_INTENT_INVALIDATION_CONFLICT', message);
    this.name = 'PurchaseIntentInvalidationConflictError';
  }
}

/** Finalization re-pointed to a different context version (A2 §9). */
export class PurchaseIntentFinalizationConflictError extends PurchaseIntentError {
  constructor(message: string) {
    super('PURCHASE_INTENT_FINALIZATION_CONFLICT', message);
    this.name = 'PurchaseIntentFinalizationConflictError';
  }
}

/** Operation forbidden because the intent is invalidated (A2 §9/§10). */
export class PurchaseIntentInvalidatedError extends PurchaseIntentError {
  constructor(message = 'the purchase intent is invalidated') {
    super('PURCHASE_INTENT_INVALIDATED', message);
    this.name = 'PurchaseIntentInvalidatedError';
  }
}

/** A decision was requested for an intent that is not yet finalized (A2 §21). */
export class PurchaseIntentNotFinalizedError extends PurchaseIntentError {
  constructor() {
    super('PURCHASE_INTENT_NOT_FINALIZED', 'the purchase intent is not finalized');
    this.name = 'PurchaseIntentNotFinalizedError';
  }
}

/** An invalidation/replacement would create a cycle, self-link, or cross-assignment link (A2 §23). */
export class PurchaseIntentInvalidationCycleError extends PurchaseIntentError {
  constructor(message: string) {
    super('PURCHASE_INTENT_INVALIDATION_CYCLE', message);
    this.name = 'PurchaseIntentInvalidationCycleError';
  }
}

/** Current runtime economic/input-schema semantics differ from the frozen request pins (A2 §14). */
export class PurchaseIntentSemanticDriftError extends PurchaseIntentError {
  constructor(message: string) {
    super('PURCHASE_INTENT_SEMANTIC_DRIFT', message);
    this.name = 'PurchaseIntentSemanticDriftError';
  }
}

/** A frozen DecisionRequest failed self-integrity verification (A2 §19). */
export class PurchaseIntentDecisionRequestIntegrityError extends PurchaseIntentError {
  constructor(message: string) {
    super('PURCHASE_INTENT_DECISION_REQUEST_INTEGRITY', message);
    this.name = 'PurchaseIntentDecisionRequestIntegrityError';
  }
}

/** The frozen input-schema version has no retained parser (A2 §16/§19). */
export class PurchaseIntentUnsupportedInputSchemaError extends PurchaseIntentError {
  constructor(public readonly inputSchemaVersion: string) {
    super(
      'PURCHASE_INTENT_UNSUPPORTED_INPUT_SCHEMA',
      `no retained DecideInput parser for schema version ${JSON.stringify(inputSchemaVersion)}`,
    );
    this.name = 'PurchaseIntentUnsupportedInputSchemaError';
  }
}

/** A snapshot proposed for binding did not exactly cohere with the frozen request (A2 §17). */
export class PurchaseIntentBindingCoherenceError extends PurchaseIntentError {
  constructor(
    public readonly reason: 'BUSINESS_KEY' | 'RECEIPT' | 'INPUT_HASH' | 'SEMANTIC' | 'REQUEST_LINK',
    message: string,
  ) {
    super('PURCHASE_INTENT_BINDING_COHERENCE', message);
    this.name = 'PurchaseIntentBindingCoherenceError';
  }
}

/** A historical-decision lookup found corrupted/contradictory/unloadable state (A2 §18/§24/§26). */
export class PurchaseIntentHistoricalConflictError extends PurchaseIntentError {
  constructor(
    public readonly reason:
      | 'RECEIPT_DANGLING'
      | 'RECEIPT_HASH_MISMATCH'
      | 'BUSINESS_KEY_MISMATCH'
      | 'BUSINESS_KEY_CONFLICT'
      | 'SNAPSHOT_WITHOUT_RECEIPT'
      | 'SEMANTIC_MISMATCH'
      | 'SNAPSHOT_UNLOADABLE',
    message: string,
  ) {
    super('PURCHASE_INTENT_HISTORICAL_CONFLICT', message);
    this.name = 'PurchaseIntentHistoricalConflictError';
  }
}

/** Trusted entry-source provenance could not be resolved from trusted server evidence (A2 §8). */
export class TrustedEntrySourceError extends PurchaseIntentError {
  constructor(message: string) {
    super('TRUSTED_ENTRY_SOURCE', message);
    this.name = 'TrustedEntrySourceError';
  }
}

/** A transport idempotency key was reused for a materially different A2 request (A2 §24). */
export class PurchaseIntentIdempotencyConflictError extends PurchaseIntentError {
  constructor(
    public readonly operationScope: string,
    public readonly idempotencyKey: string,
    public readonly existingRequestHash: string,
    public readonly attemptedRequestHash: string,
  ) {
    super(
      'PURCHASE_INTENT_IDEMPOTENCY_CONFLICT',
      `idempotency key ${JSON.stringify(idempotencyKey)} for operation ${JSON.stringify(
        operationScope,
      )} was already used for a materially different request`,
    );
    this.name = 'PurchaseIntentIdempotencyConflictError';
  }
}

/** A persistence-layer A2 invariant was violated (wrapped unexpected/structural failure). */
export class PurchaseIntentInvariantError extends PurchaseIntentError {
  constructor(message: string, options?: { cause?: unknown }) {
    super('PURCHASE_INTENT_INVARIANT', message, options);
    this.name = 'PurchaseIntentInvariantError';
  }
}

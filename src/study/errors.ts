// PagaMenos · src/study — typed study-domain errors (M3.5B-A1, spec §8/§9/§10/§14).
//
// Every known A1 failure is translated to one of these at a service/repository boundary, so callers
// never parse raw database or driver strings. Names track the spec's typed errors exactly where it
// names them (`StudyConsentInvalidTransitionError`, `StudyConsentUpdateNotSupportedError`,
// `StudyIdempotencyConflictError`); the rest carry stable `code`s for programmatic handling.

/** Base class for all A1 study-domain invariant violations. */
export class StudyError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'StudyError';
  }
}

/**
 * A material request failed input/schema validation (spec §8.2/§8.10) — e.g. a GRANT bearing the
 * forbidden `assertedEffectiveAt`, a missing/blank required field, or a malformed payload. Raised
 * BEFORE any receipt lookup or DB write, so an invalid request can never replay a prior valid receipt.
 */
export class StudyValidationError extends StudyError {
  constructor(
    message: string,
    public readonly issues?: unknown,
  ) {
    super('STUDY_VALIDATION', message);
    this.name = 'StudyValidationError';
  }
}

/**
 * A transport idempotency key was reused with a materially DIFFERENT request (spec §10, §8.13). The
 * historical receipt is never overwritten and a caller requesting B never receives A as success.
 */
export class StudyIdempotencyConflictError extends StudyError {
  constructor(
    public readonly operationScope: string,
    public readonly idempotencyKey: string,
    public readonly existingRequestHash: string,
    public readonly attemptedRequestHash: string,
  ) {
    super(
      'STUDY_IDEMPOTENCY_CONFLICT',
      `idempotencyKey '${idempotencyKey}' (scope ${operationScope}) was already consumed by a ` +
        `different request (stored ${existingRequestHash.slice(0, 12)}, attempted ${attemptedRequestHash.slice(0, 12)})`,
    );
    this.name = 'StudyIdempotencyConflictError';
  }
}

/**
 * A different transport key carries the SAME domain identity but a conflicting material payload
 * (spec §10) — e.g. the same `recruitmentSubjectKey` registered with a divergent request. Distinct
 * from a transport-key conflict; the existing domain record is never rewritten.
 */
export class StudyDomainConflictError extends StudyError {
  constructor(
    public readonly domainIdentity: string,
    public readonly existingRequestHash: string,
    public readonly attemptedRequestHash: string,
  ) {
    super(
      'STUDY_DOMAIN_CONFLICT',
      `domain identity '${domainIdentity}' already resolves a different request ` +
        `(stored ${existingRequestHash.slice(0, 12)}, attempted ${attemptedRequestHash.slice(0, 12)})`,
    );
    this.name = 'StudyDomainConflictError';
  }
}

/** A consent command attempted an illegal state transition (spec §8.3): NO_CONSENT→WITHDRAW,
 * WITHDRAWN→GRANT (no re-consent in A1). */
export class StudyConsentInvalidTransitionError extends StudyError {
  constructor(
    public readonly fromState: string,
    public readonly command: 'GRANT' | 'WITHDRAW',
  ) {
    super(
      'STUDY_CONSENT_INVALID_TRANSITION',
      `consent command ${command} is not a valid transition from state ${fromState}`,
    );
    this.name = 'StudyConsentInvalidTransitionError';
  }
}

/** A repeated GRANT while already GRANTED differed materially (spec §8.3/§8.4). A1 has no
 * consent-update workflow: provenance may not be changed by re-granting. */
export class StudyConsentUpdateNotSupportedError extends StudyError {
  constructor() {
    super(
      'STUDY_CONSENT_UPDATE_NOT_SUPPORTED',
      'a materially different GRANT while already GRANTED is not supported in A1 (no consent update)',
    );
    this.name = 'StudyConsentUpdateNotSupportedError';
  }
}

/** An experiment referenced, or a load requested, a protocol that is not FROZEN (spec §4/§2). */
export class StudyProtocolNotFrozenError extends StudyError {
  constructor(public readonly protocolRef: string) {
    super('STUDY_PROTOCOL_NOT_FROZEN', `analysis protocol '${protocolRef}' is not FROZEN`);
    this.name = 'StudyProtocolNotFrozenError';
  }
}

/** A frozen protocol's persisted `definitionJson` no longer matches its recorded `definitionDigest`
 * (spec §2/§2.1). Analysis MUST fail closed rather than trust a tampered/corrupt definition. */
export class StudyProtocolDigestMismatchError extends StudyError {
  constructor(
    public readonly expected: string,
    public readonly actual: string,
    public readonly protocolRef?: string,
  ) {
    super(
      'STUDY_PROTOCOL_DIGEST_MISMATCH',
      `analysis protocol ${protocolRef ?? '(unsaved)'} definition digest mismatch: recorded ` +
        `${expected.slice(0, 16)}, recomputed ${actual.slice(0, 16)}`,
    );
    this.name = 'StudyProtocolDigestMismatchError';
  }
}

/** A freeze targeted a protocol that is already FROZEN through a different command (spec §2.2). The
 * DRAFT→FROZEN lifecycle is one-way; there is no re-freeze. (A same-key repeat replays via receipt.) */
export class StudyProtocolAlreadyFrozenError extends StudyError {
  constructor(public readonly protocolRef: string) {
    super('STUDY_PROTOCOL_ALREADY_FROZEN', `analysis protocol '${protocolRef}' is already FROZEN`);
    this.name = 'StudyProtocolAlreadyFrozenError';
  }
}

/** A persisted protocol carried an unknown `definitionSchemaVersion`/`canonicalizationVersion` — no
 * historical parser/canonicalizer exists, so it must fail closed (spec §2.1; no current-constant
 * fallback). */
export class UnsupportedStudyVersionError extends StudyError {
  constructor(
    public readonly kind: 'definitionSchemaVersion' | 'canonicalizationVersion' | 'recruitmentKeyVersion',
    public readonly version: unknown,
  ) {
    super(
      'UNSUPPORTED_STUDY_VERSION',
      `no historical handler for ${kind} ${JSON.stringify(version)}`,
    );
    this.name = 'UnsupportedStudyVersionError';
  }
}

/** A recruitment credential could not be trusted/resolved to a stable `recruitmentSubjectKey`
 * (spec §5/§6). Never mint a participant from an unresolvable/untrusted credential. */
export class StudyRecruitmentResolutionError extends StudyError {
  constructor(message: string) {
    super('STUDY_RECRUITMENT_RESOLUTION', message);
    this.name = 'StudyRecruitmentResolutionError';
  }
}

/** A consent command targeted an assignment the trusted participant context does not own (spec §12).
 * An arbitrary `assignmentId` is never accepted as ownership proof. */
export class StudyAssignmentOwnershipError extends StudyError {
  constructor() {
    super(
      'STUDY_ASSIGNMENT_OWNERSHIP',
      'the trusted participant context does not own the referenced assignment',
    );
    this.name = 'StudyAssignmentOwnershipError';
  }
}

/** A structural invariant was violated: an impossible persisted history, a missing referenced row,
 * or an unexpected wrapped database failure. */
export class StudyInvariantError extends StudyError {
  constructor(message: string, options?: { cause?: unknown }) {
    super('STUDY_INVARIANT', message, options);
    this.name = 'StudyInvariantError';
  }
}

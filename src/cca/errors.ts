// PagaMenos · src/cca — typed CCA runtime-enforcement errors (Amendment 01 §22, §29, §30, §49).
//
// Every error carries a stable `code`. None of them carries consent material: a consent refusal is
// NEVER an error — it is the generic `NOT_AUTHORIZED` sentinel (src/cca/sealed-operation.ts, §9.2).
// These errors describe topology/capability violations, which say nothing about consent state.

export type CcaErrorCode =
  | 'CCA_TOP_LEVEL_TRANSACTION_REQUIRED'
  | 'CCA_REENTRY_FORBIDDEN'
  | 'CCA_NESTED_TRANSACTION_FORBIDDEN'
  | 'CCA_UNGOVERNED_CLIENT'
  | 'CCA_ADAPTER_NOT_ACTIVE'
  | 'CCA_IN_FLIGHT_AT_SETTLEMENT'
  | 'CCA_ADAPTER_OPERATION_FAILED'
  | 'CCA_ASSIGNMENT_SCOPE_MISMATCH'
  | 'CCA_ASSIGNMENT_OWNERSHIP'
  | 'CCA_UNTRUSTED_PARTICIPANT_CONTEXT'
  | 'CCA_LOCK_ORDER_VIOLATION'
  | 'CCA_INVALID_OPERATION_INPUT'
  | 'CCA_SEALED_SURFACE_VIOLATION'
  | 'CCA_INVALID_DEFINITION'
  | 'CCA_CONSENT_HISTORY_INTEGRITY_FAILURE'
  | 'CCA_REPLAY_CONTRACT_VIOLATION';

export class CcaError extends Error {
  constructor(
    public readonly code: CcaErrorCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(`${code}: ${message}`, options);
    this.name = 'CcaError';
  }
}

/** Type guard for a CCA error with a specific code. */
export function isCcaError(e: unknown, code?: CcaErrorCode): e is CcaError {
  return e instanceof CcaError && (code === undefined || e.code === code);
}

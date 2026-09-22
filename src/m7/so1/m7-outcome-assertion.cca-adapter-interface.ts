// PagaMenos · src/db — SO-1 operation-specific tracked-adapter interface (CCA §15 item 3). TYPES ONLY.
//
// The ONE and only database-reaching edge of the SO-1 fixed executor. It models exactly one
// operation — the atomic Outcome assertion collection of V1.1 §9.2 — and it exposes no orderable
// low-level method, because `m7.p_record_outcome_assertion_v1` is itself atomic and internally
// lock-ordered (§16.2, CCA §26). There is no query, no transaction, no lock, no raw SQL and no
// client on this surface, and nothing here mentions the session secret, the participant, the
// assignment, `capturedAt` or the control-plane digest: those are supplied to the private adapter
// implementation by the engine, never by the executor.
import type {
  M7AssertionKind,
  M7EventTimeAssertion,
  M7MerchantAssertion,
  M7OccurrenceAssertion,
  M7OutcomeAssertionResult,
  M7OutcomeStatusLabel,
} from '@/m7/so1/outcome-assertion-input';

/** Exactly the §9.3 SO-1 caller fields the executor forwards. RQ only — no CP value, ever. */
export interface M7OutcomeAssertionCollectionArgs {
  readonly purchaseIntentId: string;
  readonly clientCaptureKey: string;
  readonly idempotencyKey: string;
  readonly assertionKind: M7AssertionKind;
  readonly supersedesAssertionId?: string | undefined;
  readonly statusLabel?: M7OutcomeStatusLabel | undefined;
  readonly occurrenceAssertion?: M7OccurrenceAssertion | undefined;
  readonly merchant?: M7MerchantAssertion | undefined;
  readonly eventTime?: M7EventTimeAssertion | undefined;
}

export interface M7OutcomeAssertionAdapter {
  /**
   * Atomic (V1.1 §9.2 SO-1): ONE `SELECT m7.p_record_outcome_assertion_v1(...)` on the hidden
   * transaction client. The function performs its own in-transaction replay and domain re-check
   * under its own locks (§9.5.2), so this method never issues a second persistence statement.
   */
  executeOutcomeAssertionCollection(
    args: M7OutcomeAssertionCollectionArgs,
  ): Promise<M7OutcomeAssertionResult>;
}

// PagaMenos · src/m7/so2 — SO-2 operation-specific tracked-adapter interface (CCA §15 item 3). TYPES ONLY.
//
// The ONE and only database-reaching edge of the SO-2 fixed executor. It models exactly one
// operation — the atomic evidence-upload authorization of V1.1 §9.2 SO-2 — and exposes no orderable
// low-level method, because `m7.p_begin_evidence_upload_v1` is itself atomic and internally
// lock-ordered (§16.2, CCA §26). There is no query, no transaction, no lock, no raw SQL and no client
// on this surface, and nothing here mentions the session secret, the participant, the assignment,
// `capturedAt`, the control-plane digest, a storage profile, a backend, a staging key or a transport:
// those are supplied to the private adapter implementation by the engine, or returned by the
// database, never chosen by the executor.
import type { M7EvidenceUploadAuthorization } from '@/m7/so2/evidence-upload-input';

/** Exactly the §9.3 SO-2 caller fields the executor forwards. RQ only — no CP value, ever. */
export interface M7EvidenceUploadAuthorizationArgs {
  readonly purchaseIntentId: string;
  readonly clientCorrelationNonce: string;
}

export interface M7EvidenceUploadAdapter {
  /**
   * Atomic (V1.1 §9.2 SO-2): ONE `SELECT * FROM m7.p_begin_evidence_upload_v1(...)` on the hidden
   * transaction client. The function returns the existing intent for an exact
   * `(decisionBindingId, clientCorrelationNonce)` retry (§9.5.2) and derives every result field
   * from the intent's own issuance profile (RP-3), so this method never issues a second statement.
   */
  executeEvidenceUploadAuthorization(
    args: M7EvidenceUploadAuthorizationArgs,
  ): Promise<M7EvidenceUploadAuthorization>;
}

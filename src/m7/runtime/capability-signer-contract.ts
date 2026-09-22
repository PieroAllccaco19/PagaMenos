// PagaMenos · src/m7/runtime — the M7 capability-signer DB-foundation contract (V1.1 §19.11.7). PRE-LC-1.
//
// Pure and DB-free: no client, no query, no environment read, no clock. It declares
//   * the COMMITTED GENERATION ENVELOPE — the exact ten fields `m7.x_mint_generation_capability_v1`
//     returns, copied verbatim by the signer module (src/db/m7-capability-signer.ts) and never
//     recomputed, re-derived or substituted by application code; and
//   * the typed refusal the signer module throws.
//
// ────────────────────────────────────────────────────────────────────────────────────────────────
// SCOPE HONESTY. The envelope is AUTHORIZATION DATA, not a capability. No provider signing exists in
// this slice: no provider SDK, no signing credential, no token, no presigned URL, no exact-key PUT.
// Physical provider signing — XF-16's "sign only after commit" half, XC-7 credential routing,
// T-171c/T-171d on a real provider — is DEFERRED to the provider integration slice. IMP-18 and IMP-20
// remain OPEN.
// ────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The committed authorization envelope of one mint (XF-GOAL + XF-15 + XF-17), exactly as PostgreSQL
 * returned it AFTER the TO-8 transaction committed. Field-for-field the `RETURNS TABLE` of
 * `m7.x_mint_generation_capability_v1`; enum columns are carried as their text labels.
 */
export interface M7CommittedGenerationEnvelope {
  /** `capability_operation` — the envelope's operation (always the canonical create). */
  readonly capabilityOperation: string;
  /** `canonical_object_key` — the ONE exact key of the generation. */
  readonly canonicalObjectKey: string;
  /** `backend_sha256` — the ONE storage authority. */
  readonly backendSha256: string;
  /** `valid_until` — the grant's absolute expiry, as `m7.i_ts` text. */
  readonly validUntil: string;
  /** `capability_mode` — how the envelope is carried. */
  readonly capabilityMode: string;
  /** `envelope_enforcement` — who enforces the envelope. */
  readonly envelopeEnforcement: string;
  /** `envelope_sha256` — identical for every mint of one grant (T-169). */
  readonly envelopeSha256: string;
  /** `mint_seq` — 1, 2, 3 … per grant; a re-mint is visible, never silent (XF-15). */
  readonly mintSeq: number;
  /** `signing_profile_version` — resolved by the database (XF-17), never selected by a caller. */
  readonly signingProfileVersion: string;
  /** `signing_credential_profile_id` — the identifier a later provider slice must obey (XC-7). */
  readonly signingCredentialProfileId: string;
}

export type M7CapabilitySignerRefusal =
  /** The argument is not exactly one canonical UUID string. Refused before any database access. */
  | 'INVALID_GENERATION_GRANT_ID'
  /** `M7013 M7_CAPABILITY_REFUSED` — unknown grant, expired, stale epoch, not PROCESSING, retired
   *  backend or no signing profile. Deliberately one indistinguishable refusal (§19.11.7). */
  | 'CAPABILITY_REFUSED'
  /** `55000 M7_CONTROL_PLANE_MISMATCH` — this deployment's expected digest is not the active one. */
  | 'CONTROL_PLANE_MISMATCH'
  /** Anything else, including a rolled-back or failed commit. No envelope is ever returned. */
  | 'UNAVAILABLE';

/** A refused or failed mint. Carries no envelope component, no grant identity and no driver text. */
export class M7CapabilitySignerError extends Error {
  constructor(
    readonly reason: M7CapabilitySignerRefusal,
    /** The governed SQLSTATE, only for the two governed refusals; otherwise null. */
    readonly sqlState: 'M7013' | '55000' | null = null,
  ) {
    super(`M7_CAPABILITY_SIGNER: ${reason}`);
    this.name = 'M7CapabilitySignerError';
  }
}

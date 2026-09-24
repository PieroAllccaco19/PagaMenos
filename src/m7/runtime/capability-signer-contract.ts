// PagaMenos · src/m7/runtime — the M7 capability-signer contract (V1.1 §11.7.3, §18.3, §19.11.7).
// PRE-LC-1.
//
// Pure and DB-free: no client, no query, no environment read, no clock, no import. It declares
//   * the COMMITTED GENERATION ENVELOPE — the exact ten fields `m7.x_mint_generation_capability_v1`
//     returns, copied verbatim by the signer module (src/db/m7-capability-signer.ts) and never
//     recomputed, re-derived or substituted by application code;
//   * the GENERATION WRITE CAPABILITY — the one physical provider capability the signer returns
//     (PPC-1: an S3-compatible SigV4 presigned PUT, SIGNER_TOPOLOGY); and
//   * the typed refusal the signer module throws.
//
// ────────────────────────────────────────────────────────────────────────────────────────────────
// SCOPE HONESTY (PPC-1). This is a PROVIDER-PROTOCOL implementation only: exactly one capability kind
// (`S3_COMPATIBLE` × `EXACT_KEY_PRESIGNED_PUT` × `SIGNER_TOPOLOGY`). It does NOT select or verify a
// real production provider; real-provider conformance (Family Q), the signer's own process (IMP-20),
// the deployed credential inventory (XC-7 / MA-15) and T-171b/c/d against a deployment remain OPEN.
// IMP-18 and IMP-20 remain OPEN.
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
  /** `signing_credential_profile_id` — the ONLY key under which the signer looks up a credential (XC-7). */
  readonly signingCredentialProfileId: string;
}

/**
 * The ONE physical capability the signer returns (PPC-1): an S3-compatible SigV4 query-presigned
 * CONDITIONAL `PUT` (`If-None-Match: *`, signed)
 * of exactly the committed envelope's `canonicalObjectKey`, on the bucket/endpoint provisioned for the
 * returned `signingCredentialProfileId`, signed with exactly that credential, strictly after the mint
 * committed, and expiring no later than the envelope's `validUntil`.
 *
 * `url` is a BEARER SECRET (RT-16 / IMP-12). It is reachable only through the deliberate `url` read;
 * JSON serialization, string coercion and `util.inspect` of the capability yield a redaction marker.
 */
export interface M7GenerationWriteCapability {
  readonly kind: 'M7_GENERATION_WRITE_CAPABILITY_V1';
  /** Always `PUT` — the envelope's only operation is `CANONICAL_CREATE`. */
  readonly method: 'PUT';
  /**
   * The headers the request MUST carry, exactly (frozen). `If-None-Match: *` makes the PUT a CONDITIONAL
   * create (SP-4, §11.3, Corollary 4, T-169) and is part of the SigV4 signed-header set: a request
   * without it, or with another value, does not verify. Not an option — the capability's own shape.
   */
  readonly requiredHeaders: Readonly<{ 'if-none-match': '*' }>;
  /** The presigned URL. A secret: never log, persist or serialize it. */
  readonly url: string;
  /** The capability's own absolute expiry (`X-Amz-Date + X-Amz-Expires`), never after `validUntil`. */
  readonly expiresAt: string;
  /** The committed mint's sequence number (XF-15). */
  readonly mintSeq: number;
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
  | 'UNAVAILABLE'
  /** DEPLOYMENT DEFECT: the provider-credential registry is absent or malformed. Refused BEFORE any
   *  database access; nothing is minted and nothing is signed. */
  | 'PROVIDER_CREDENTIALS_UNAVAILABLE'
  /** DEPLOYMENT DEFECT (XC-7): the registry holds no credential for the committed mint's
   *  `signing_credential_profile_id`. The mint is committed; nothing is signed; no fallback. */
  | 'SIGNING_CREDENTIAL_MISSING'
  /** DEPLOYMENT DEFECT: the selected credential's provisioned backend literal is not the committed
   *  envelope's `backendSha256`. The mint is committed; nothing is signed. */
  | 'SIGNING_CREDENTIAL_BACKEND_MISMATCH'
  /** The committed envelope's operation / capability mode / envelope enforcement is not the one kind
   *  PPC-1 implements. The mint is committed; nothing is signed. */
  | 'UNSUPPORTED_CAPABILITY_KIND'
  /** The committed `canonicalObjectKey` cannot be carried verbatim in a request path (a character
   *  outside the DDL key alphabet, or an empty / `.` / `..` segment). Nothing is signed. */
  | 'CANONICAL_KEY_NOT_TRANSPORTABLE'
  /** The remaining window to `validUntil` is below one second or above the SigV4 maximum (604800 s),
   *  or `validUntil` is malformed. Never clamped upward. Nothing is signed. */
  | 'SIGNING_WINDOW_INVALID'
  /** The signing library failed, or its output did not match the envelope exactly. Nothing is
   *  returned. */
  | 'SIGNING_FAILED';

const DEPLOYMENT_DEFECTS: ReadonlySet<M7CapabilitySignerRefusal> = new Set([
  'PROVIDER_CREDENTIALS_UNAVAILABLE',
  'SIGNING_CREDENTIAL_MISSING',
  'SIGNING_CREDENTIAL_BACKEND_MISMATCH',
]);

/**
 * A refused or failed mint / signature. Carries no envelope component, no grant identity, no
 * credential identifier, no secret, no URL and no driver or library text — and never a `cause`.
 */
export class M7CapabilitySignerError extends Error {
  /** True for the refusals XC-7 classifies as a deployment defect (never a caller error). */
  readonly deploymentDefect: boolean;

  constructor(
    readonly reason: M7CapabilitySignerRefusal,
    /** The governed SQLSTATE, only for the two governed refusals; otherwise null. */
    readonly sqlState: 'M7013' | '55000' | null = null,
  ) {
    super(`M7_CAPABILITY_SIGNER: ${reason}`);
    this.name = 'M7CapabilitySignerError';
    this.deploymentDefect = DEPLOYMENT_DEFECTS.has(reason);
  }
}

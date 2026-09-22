// PagaMenos · src/m7/runtime — the expected control-plane manifest digest (V1.1 §23.6). PRE-LC-1.
//
// ────────────────────────────────────────────────────────────────────────────────────────────────
// PRE-LC-1 LIMITATION — READ THIS BEFORE CLAIMING ANYTHING ABOUT §23.6 OR MA-8
//
// §23.6 requires a THREE-WAY equality before any M7 operation may be served:
//
//        build embeds the reviewed manifest   ─┐
//        env M7_CONTROL_PLANE_MANIFEST_SHA256  ┼─ all three must be equal
//        DB active installation's manifest    ─┘
//
// This module implements the SECOND leg only, and the third leg is enforced by the database itself
// (`m7.i_assert_control_plane` raises 55000 M7_CONTROL_PLANE_MISMATCH on every entry function).
//
// The FIRST leg — the digest of an embedded REVIEWED manifest — is DEFERRED TO LC-1, because the
// reviewed manifest bytes DO NOT EXIST YET: no production M7 control-plane manifest has been
// authored, reviewed (LC-3) or published (LC-4). Authoring one here is forbidden by the authorizing
// instruction, and embedding fabricated bytes would be worse than the gap.
//
// Therefore, explicitly and without hedging:
//        §23.6 IS NOT COMPLETE.   MA-8 IS NOT COMPLETE.   NEITHER IS CLAIMED HERE.
// What IS implemented is the fail-closed runtime boundary that obtains the environment digest, so
// that an LC-1 implementation candidate can compose the embedded-manifest comparison behind it.
// ────────────────────────────────────────────────────────────────────────────────────────────────
//
// Invariants this module does hold (AUTH §14):
//   * the digest is NEVER caller input — it is not a parameter of any sealed operation;
//   * it is parsed FAIL CLOSED as an exact SHA-256 digest, in the exact lexical form the accepted
//     `m7_control_plane_manifest_digest_ck` stores: `sha256:` followed by 64 lowercase hex digits;
//   * it is read in exactly ONE controlled runtime module — this one (proved by the capability
//     test's environment-key census);
//   * NO database query may tell the application which digest to expect, and there is NO fallback
//     that derives it from the active DB installation. Doing so would make a drifted deployment
//     agree with itself, which is precisely what §23.6 exists to prevent.

export const M7_CONTROL_PLANE_MANIFEST_SHA256_ENV = 'M7_CONTROL_PLANE_MANIFEST_SHA256';

/** The §23.6 leg that is deferred until reviewed manifest bytes exist (LC-1). */
export const CONTROL_PLANE_BINDING_STATUS = Object.freeze({
  environmentDigest: 'IMPLEMENTED',
  databaseActiveInstallation: 'ENFORCED_BY_DATABASE',
  embeddedReviewedManifest: 'DEFERRED_TO_LC_1_NO_REVIEWED_MANIFEST_BYTES_EXIST',
  threeWayBindingComplete: false,
  ma8Complete: false,
} as const);

/** The M7 control plane is not usable by this deployment. Carries no consent material. */
export class M7ControlPlaneUnavailableError extends Error {
  constructor(detail: string) {
    super(`M7_CONTROL_PLANE_UNAVAILABLE: ${detail}`);
    this.name = 'M7ControlPlaneUnavailableError';
  }
}

/**
 * The EXACT accepted lexical form of a control-plane manifest digest, taken verbatim from
 * `m7_control_plane_manifest_digest_ck` (§19.4):
 *
 *     CHECK ("manifestSha256" ~ '^sha256:[0-9a-f]{64}$')
 *
 * The value this module produces is compared, inside PostgreSQL, against the ACTIVE installation's
 * stored digest by `m7.i_assert_control_plane`, so it must be the same spelling the column stores —
 * the `sha256:` prefix included. Parsing a bare 64-hex value here would make every M7 operation fail
 * with 55000 at runtime instead of failing closed at the boundary, which is the wrong end.
 */
const MANIFEST_SHA256 = /^sha256:[0-9a-f]{64}$/;

/**
 * Parse an expected manifest digest fail-closed. Absent, empty, unprefixed, malformed, wrong length,
 * uppercase or non-hex all refuse. Exported so the census and the negative controls can exercise the
 * exact parser the runtime uses, without touching the environment.
 */
export function parseControlPlaneManifestDigest(raw: string | undefined): string {
  if (raw === undefined) {
    throw new M7ControlPlaneUnavailableError(
      `${M7_CONTROL_PLANE_MANIFEST_SHA256_ENV} is not set; M7 operations are refused (§23.6)`,
    );
  }
  if (!MANIFEST_SHA256.test(raw)) {
    throw new M7ControlPlaneUnavailableError(
      `${M7_CONTROL_PLANE_MANIFEST_SHA256_ENV} is not of the accepted form sha256:<64 lowercase hex>; ` +
        'M7 operations are refused (§23.6)',
    );
  }
  return raw;
}

/**
 * The expected control-plane manifest digest for this process. Read at call time (never cached into
 * a mutable module export, so a test harness cannot be fooled by import order), always fail-closed.
 * The value is passed to every `m7.*` entry function, which compares it against the ACTIVE
 * installation inside PostgreSQL (§23.6 item 2, RP-6).
 */
export function expectedControlPlaneManifestDigest(): string {
  return parseControlPlaneManifestDigest(process.env[M7_CONTROL_PLANE_MANIFEST_SHA256_ENV]);
}

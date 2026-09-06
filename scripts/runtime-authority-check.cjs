// PagaMenos · M3.5B-A2 Closure 1 — runtime-authority ↔ external-ledger verifier (SHARED, pure).
//
// This is the SINGLE trust-boundary comparison used by BOTH:
//   • the CI `authority-gate` job, which reads the candidate runtime authority declaration from the
//     working tree and the accepted historical ledger/manifest via `git show <BASE_SHA>:<path>` (the
//     externally-configured protected repository variable PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA), and
//   • a unit test that exercises the NEGATIVE cases with in-memory fixtures (no Git, no network).
//
// It proves the candidate runtime authority declaration for the frozen corpus matches the immutable
// external ledger entry selected by BASE_SHA. The external historical ledger is the ORACLE: a
// candidate-local edit of BOTH the corpus AND the runtime declaration (kept internally self-consistent
// under the same historical corpusId) still FAILS here, because the ledger digest is unchanged.
//
// Pure and dependency-free (CommonJS) so it can be `require`d from the CI inline node step and imported
// from vitest without pulling in Git/network. It performs NO I/O itself — callers supply already-parsed
// objects.
'use strict';

/** All comparison fields required to bind a candidate runtime declaration to the external ledger. */
const REQUIRED_RUNTIME_FIELDS = [
  'corpusId',
  'corpusSemanticProjectionVersion',
  'corpusSemanticDigest',
];

/**
 * Verify a candidate runtime authority declaration against the accepted external historical ledger
 * (and, redundantly, the authority baseline manifest) at the protected BASE_SHA.
 *
 * @param {object} args
 * @param {object} args.runtime  Candidate runtime authority declaration (working-tree JSON).
 * @param {object} args.ledger   CORPUS_RELEASE_LEDGER_V1.json parsed from `git show BASE_SHA:…`.
 * @param {object} [args.manifest] AUTHORITY_BASELINE_MANIFEST_V1.json parsed from `git show BASE_SHA:…`.
 * @returns {{ ok: true, corpusId: string, digest: string } | { ok: false, error: string }}
 */
function verifyRuntimeAuthority(args) {
  const runtime = args && args.runtime;
  const ledger = args && args.ledger;
  const manifest = args && args.manifest; // optional cross-check

  if (!runtime || typeof runtime !== 'object') {
    return { ok: false, error: 'runtime declaration missing or not an object' };
  }
  for (const f of REQUIRED_RUNTIME_FIELDS) {
    if (typeof runtime[f] !== 'string' || runtime[f].length === 0) {
      return { ok: false, error: `runtime declaration field '${f}' missing/empty` };
    }
  }
  if (
    !ledger ||
    typeof ledger !== 'object' ||
    !ledger.entries ||
    typeof ledger.entries !== 'object'
  ) {
    return { ok: false, error: 'external ledger missing or has no entries' };
  }

  const corpusId = runtime.corpusId;
  const entry = ledger.entries[corpusId];
  if (!entry || typeof entry !== 'object') {
    return { ok: false, error: `external ledger has no entry for corpusId '${corpusId}'` };
  }
  if (runtime.corpusSemanticDigest !== entry.digest) {
    return {
      ok: false,
      error:
        `runtime digest ${runtime.corpusSemanticDigest} != external ledger digest ${entry.digest} ` +
        `for corpusId '${corpusId}'`,
    };
  }
  if (runtime.corpusSemanticProjectionVersion !== entry.semanticProjectionVersion) {
    return {
      ok: false,
      error:
        `runtime projection version ${runtime.corpusSemanticProjectionVersion} != external ledger ` +
        `${entry.semanticProjectionVersion}`,
    };
  }

  // Redundant cross-check against the baseline manifest (defense in depth; same immutable SHA).
  if (manifest && typeof manifest === 'object') {
    if (manifest.corpusId !== corpusId) {
      return { ok: false, error: `manifest corpusId ${manifest.corpusId} != runtime ${corpusId}` };
    }
    if (manifest.corpusSemanticDigest !== runtime.corpusSemanticDigest) {
      return {
        ok: false,
        error: `manifest digest ${manifest.corpusSemanticDigest} != runtime ${runtime.corpusSemanticDigest}`,
      };
    }
    if (manifest.corpusSemanticProjectionVersion !== runtime.corpusSemanticProjectionVersion) {
      return {
        ok: false,
        error:
          `manifest projection version ${manifest.corpusSemanticProjectionVersion} != runtime ` +
          `${runtime.corpusSemanticProjectionVersion}`,
      };
    }
  }

  return { ok: true, corpusId, digest: entry.digest };
}

module.exports = { verifyRuntimeAuthority, REQUIRED_RUNTIME_FIELDS };

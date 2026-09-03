import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

import { loadCorpus, type Corpus } from '@/corpus';
import { canonicalize } from '@/persistence/canonical';

import {
  A2_ACCEPTED_CORPUS_ID,
  A2_ACCEPTED_CORPUS_SEMANTIC_DIGEST_V1,
  assertCorpusAuthority,
  assertCorpusAuthorityAgainst,
  computeCorpusSemanticDigest,
  CorpusAuthorityMismatchError,
  normalizeCorpusSemanticProjection,
  RUNTIME_CORPUS_AUTHORITY,
  type RuntimeCorpusAuthorityDeclaration,
} from './corpus-authority';

const ACCEPTED = 'sha256:ff178a52bf3c3c3492828ae5cc7b8f3e7ca7b843a235ad7671ea2760803aed18';
const clone = (): Corpus => structuredClone(loadCorpus());

// The SHARED runtime-authority verifier used by the CI authority-gate. Loaded here (no Git / network)
// to exercise the NEGATIVE trust-boundary cases with an in-memory copy of the external ledger.
const require = createRequire(import.meta.url);
const { verifyRuntimeAuthority } = require('../../scripts/runtime-authority-check.cjs') as {
  verifyRuntimeAuthority: (args: {
    runtime: unknown;
    ledger: unknown;
    manifest?: unknown;
  }) => { ok: true; corpusId: string; digest: string } | { ok: false; error: string };
};

// A faithful in-memory copy of the accepted EXTERNAL ledger entry (the CI job reads the real blob via
// `git show <BASE_SHA>:authority/v1/CORPUS_RELEASE_LEDGER_V1.json`). Unit tests must not touch Git.
const EXTERNAL_LEDGER = {
  schemaVersion: 'pagamenos.corpus-release-ledger.v1',
  entries: {
    [A2_ACCEPTED_CORPUS_ID]: {
      semanticProjectionVersion: 'pagamenos.corpus-semantic-projection.v1',
      sourceCommit: '64cf864a817c137920204487ab3317bc6d4c9ba5',
      digest: ACCEPTED,
    },
  },
};

describe('A2 corpus semantic authority (Sol Finding 5 / Correction 1; V4.5 §4/§5/§11/§12)', () => {
  it('reproduces the accepted V4.5 digest EXACTLY (56639 canonical bytes)', () => {
    const bytes = Buffer.byteLength(
      canonicalize(normalizeCorpusSemanticProjection(loadCorpus())),
      'utf8',
    );
    expect(bytes).toBe(56639);
    expect(computeCorpusSemanticDigest(loadCorpus())).toBe(ACCEPTED);
    expect(A2_ACCEPTED_CORPUS_SEMANTIC_DIGEST_V1).toBe(ACCEPTED);
    expect(assertCorpusAuthority(loadCorpus())).toBe(ACCEPTED);
  });

  it('projects exactly {scopes:30, activeRules:46, operationalStates:46} and no other top-level key', () => {
    const proj = normalizeCorpusSemanticProjection(loadCorpus()) as {
      scopes: unknown[];
      activeRules: unknown[];
      operationalStates: unknown[];
    };
    expect(Object.keys(proj).sort()).toEqual(['activeRules', 'operationalStates', 'scopes']);
    expect(proj.scopes.length).toBe(30);
    expect(proj.activeRules.length).toBe(46);
    expect(proj.operationalStates.length).toBe(46);
  });

  // ── Closure 1: trust boundary ────────────────────────────────────────────────────────────────────
  it('runtime consumes ONE authority declaration whose digest recompute matches (no Git at runtime)', () => {
    // The runtime declaration is DATA, consumed directly; the runtime never reads Git/network.
    expect(RUNTIME_CORPUS_AUTHORITY.corpusId).toBe(A2_ACCEPTED_CORPUS_ID);
    expect(RUNTIME_CORPUS_AUTHORITY.corpusSemanticDigest).toBe(ACCEPTED);
    expect(RUNTIME_CORPUS_AUTHORITY.corpusSemanticProjectionVersion).toBe(
      'pagamenos.corpus-semantic-projection.v1',
    );
    // Actual current corpus projection is recomputed and must equal the declaration.
    expect(computeCorpusSemanticDigest(loadCorpus())).toBe(
      RUNTIME_CORPUS_AUTHORITY.corpusSemanticDigest,
    );
  });

  it('the runtime declaration matches the EXTERNAL ledger (authority-gate PASS path)', () => {
    const result = verifyRuntimeAuthority({
      runtime: RUNTIME_CORPUS_AUTHORITY,
      ledger: EXTERNAL_LEDGER,
    });
    expect(result).toEqual({ ok: true, corpusId: A2_ACCEPTED_CORPUS_ID, digest: ACCEPTED });
  });

  it('SELF-APPROVAL ATTACK: mutated corpus + mutated runtime declaration (same corpusId) → authority-gate FAILS', () => {
    // Simulate a candidate that mutates a corpus field AND edits the runtime declaration to the new,
    // internally-consistent digest, keeping the SAME historical corpusId. Runtime-local checks would
    // pass (declaration == recompute), but the EXTERNAL ledger is the oracle and still says ff178…
    const mutated = clone();
    mutated.activeRules[0]!.provenance.url = mutated.activeRules[0]!.provenance.url + '-LAUNDER';
    const launderedDigest = computeCorpusSemanticDigest(mutated);
    expect(launderedDigest).not.toBe(ACCEPTED);
    const forgedDeclaration: RuntimeCorpusAuthorityDeclaration = {
      declarationVersion: RUNTIME_CORPUS_AUTHORITY.declarationVersion,
      corpusId: A2_ACCEPTED_CORPUS_ID, // SAME historical id
      corpusSemanticProjectionVersion: RUNTIME_CORPUS_AUTHORITY.corpusSemanticProjectionVersion,
      corpusSemanticDigest: launderedDigest, // laundered to match the mutated corpus
    };
    // Runtime-local self-consistency is (deliberately) satisfied by the forged pair…
    expect(assertCorpusAuthorityAgainst(mutated, forgedDeclaration)).toBe(launderedDigest);
    // …but the external authority-gate comparison FAILS: ledger digest is unchanged.
    const gate = verifyRuntimeAuthority({ runtime: forgedDeclaration, ledger: EXTERNAL_LEDGER });
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.error).toMatch(/ledger digest/);
  });

  it('authority-gate FAILS if the runtime digest is edited but the corpus id is kept', () => {
    const forged = { ...RUNTIME_CORPUS_AUTHORITY, corpusSemanticDigest: 'sha256:deadbeef' };
    expect(verifyRuntimeAuthority({ runtime: forged, ledger: EXTERNAL_LEDGER }).ok).toBe(false);
  });

  it('authority-gate FAILS if the runtime corpusId is not present in the external ledger', () => {
    const forged = { ...RUNTIME_CORPUS_AUTHORITY, corpusId: 'PAGAMENOS_FORGED_CORPUS' };
    const gate = verifyRuntimeAuthority({ runtime: forged, ledger: EXTERNAL_LEDGER });
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.error).toMatch(/no entry for corpusId/);
  });

  it('assertCorpusAuthority takes NO caller overrides — production cannot substitute an accepted authority', () => {
    // The public gate is single-argument; there is no way to pass an alternate accepted id/digest.
    expect(assertCorpusAuthority.length).toBe(1);
  });

  it('rejects a corpus whose declared corpusId is not the accepted authority id', () => {
    const c = clone();
    (c as { corpusId: string }).corpusId = 'PAGAMENOS_FORGED_CORPUS';
    expect(() => assertCorpusAuthority(c)).toThrow(CorpusAuthorityMismatchError);
  });

  it('mutating provenance.sourceId / url / observedAt each changes the digest', () => {
    for (const field of ['sourceId', 'url', 'observedAt'] as const) {
      const c = clone();
      c.activeRules[0]!.provenance[field] = c.activeRules[0]!.provenance[field] + '-MUTATED';
      expect(computeCorpusSemanticDigest(c)).not.toBe(ACCEPTED);
      expect(() => assertCorpusAuthority(c)).toThrow(CorpusAuthorityMismatchError);
    }
  });

  it('mutating operationalState.asOf changes the digest (V4.5 §8)', () => {
    const c = clone();
    c.operationalStates[0]!.asOf = '2099-01-01T00:00:00-05:00';
    expect(computeCorpusSemanticDigest(c)).not.toBe(ACCEPTED);
    expect(() => assertCorpusAuthority(c)).toThrow(CorpusAuthorityMismatchError);
  });

  it('mutating operationalState.note (absent→present, and A→B) changes the digest (V4.5 §9)', () => {
    const added = clone();
    added.operationalStates[0]!.note = 'diagnostic-change';
    expect(computeCorpusSemanticDigest(added)).not.toBe(ACCEPTED);
    const changed = clone();
    changed.operationalStates[0]!.note = 'A';
    const dA = computeCorpusSemanticDigest(changed);
    changed.operationalStates[0]!.note = 'B';
    expect(computeCorpusSemanticDigest(changed)).not.toBe(dA);
  });

  it('complete operational-state field coverage — every schema-valid mutation changes the digest (V4.5 §10)', () => {
    const mutators: Array<(c: Corpus) => void> = [
      (c) => (c.operationalStates[0]!.ruleId = c.operationalStates[0]!.ruleId + '-X'),
      (c) => (c.operationalStates[0]!.version = c.operationalStates[0]!.version + 1000),
      (c) => (c.operationalStates[0]!.publicationState = 'QUARANTINED'),
      (c) => (c.operationalStates[0]!.sourceQualityState = 'STALE'),
      (c) => (c.operationalStates[0]!.availability = 'CONFIRMED_UNAVAILABLE'),
      (c) => (c.operationalStates[0]!.asOf = '2099-12-31T00:00:00-05:00'),
      (c) => (c.operationalStates[0]!.note = 'mutation-coverage'),
    ];
    for (const mutate of mutators) {
      const c = clone();
      mutate(c);
      expect(computeCorpusSemanticDigest(c)).not.toBe(ACCEPTED);
    }
  });

  it('mutating scope / rule identity + set-like fields changes the digest', () => {
    const s = clone();
    s.scopes[0]!.equivalenceGroup = s.scopes[0]!.equivalenceGroup + '-X';
    expect(computeCorpusSemanticDigest(s)).not.toBe(ACCEPTED);
    const r = clone();
    r.activeRules[0]!.campaignId = r.activeRules[0]!.campaignId + '-X';
    expect(computeCorpusSemanticDigest(r)).not.toBe(ACCEPTED);
  });

  it('set-like array ORDER is normalized (reversing every set-like array does not change the digest)', () => {
    const c = clone();
    const rev = <T>(a: T[] | undefined): T[] | undefined => (a ? [...a].reverse() : a);
    for (const s of c.scopes) {
      s.requiredContext = rev(s.requiredContext)!;
      s.allowedSelectors = rev(s.allowedSelectors)!;
    }
    for (const r of c.activeRules) {
      r.merchantIds = rev(r.merchantIds)!;
      r.comparisonScopeRefs = rev(r.comparisonScopeRefs)!;
      if (r.constraints.weekdays) r.constraints.weekdays = rev(r.constraints.weekdays)!;
      if (r.constraints.channels) r.constraints.channels = rev(r.constraints.channels)!;
    }
    expect(computeCorpusSemanticDigest(c)).toBe(ACCEPTED);
  });
});

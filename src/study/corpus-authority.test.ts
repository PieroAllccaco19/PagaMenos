import { execFileSync } from 'node:child_process';

import { describe, expect, it } from 'vitest';

import { loadCorpus, type Corpus } from '@/corpus';
import { canonicalize } from '@/persistence/canonical';

import {
  A2_ACCEPTED_AUTHORITY_BASE_SHA,
  A2_ACCEPTED_CORPUS_ID,
  A2_ACCEPTED_CORPUS_SEMANTIC_DIGEST_V1,
  assertCorpusAuthority,
  computeCorpusSemanticDigest,
  CorpusAuthorityMismatchError,
  normalizeCorpusSemanticProjection,
} from './corpus-authority';

const ACCEPTED = 'sha256:ff178a52bf3c3c3492828ae5cc7b8f3e7ca7b843a235ad7671ea2760803aed18';
const clone = (): Corpus => structuredClone(loadCorpus());

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

  it('the digest constant is anchored to the EXTERNAL protected ledger (self-approval attack fails)', () => {
    // Read the accepted corpus digest DIRECTLY from the immutable external authority blob at
    // PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA. The runtime constant MUST equal it — so a candidate-local
    // edit of the constant (to launder a mutated corpus) is caught here / by the CI authority-gate.
    const ledgerJson = execFileSync(
      'git',
      ['show', `${A2_ACCEPTED_AUTHORITY_BASE_SHA}:authority/v1/CORPUS_RELEASE_LEDGER_V1.json`],
      { encoding: 'utf8' },
    );
    const ledger = JSON.parse(ledgerJson) as {
      entries: Record<string, { digest: string; sourceCommit: string }>;
    };
    const entry = ledger.entries[A2_ACCEPTED_CORPUS_ID];
    expect(entry).toBeDefined();
    expect(entry!.digest).toBe(ACCEPTED);
    expect(A2_ACCEPTED_CORPUS_SEMANTIC_DIGEST_V1).toBe(entry!.digest);
    // A mutated corpus cannot reproduce the external-ledger digest under the same corpusId.
    const mutated = clone();
    mutated.activeRules[0]!.provenance.url = mutated.activeRules[0]!.provenance.url + '-LAUNDER';
    expect(computeCorpusSemanticDigest(mutated)).not.toBe(entry!.digest);
    expect(() => assertCorpusAuthority(mutated, entry!.digest)).toThrow(
      CorpusAuthorityMismatchError,
    );
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

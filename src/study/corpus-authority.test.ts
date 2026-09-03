import { describe, expect, it } from 'vitest';

import { loadCorpus, type Corpus } from '@/corpus';

import {
  A2_ACCEPTED_CORPUS_SEMANTIC_DIGEST_V1,
  assertCorpusAuthority,
  computeCorpusSemanticDigest,
  CorpusAuthorityMismatchError,
} from './corpus-authority';

const clone = (): Corpus => structuredClone(loadCorpus());
const base = () => computeCorpusSemanticDigest(loadCorpus());

describe('A2 corpus semantic authority (Sol Finding 5; V4.5 §5-§11)', () => {
  it('the live corpus reproduces the accepted ledger digest', () => {
    expect(base()).toBe(A2_ACCEPTED_CORPUS_SEMANTIC_DIGEST_V1);
    expect(assertCorpusAuthority(loadCorpus())).toBe(A2_ACCEPTED_CORPUS_SEMANTIC_DIGEST_V1);
  });

  it('mutating provenance.sourceId / url / observedAt each changes the digest (V4.4/V4.5)', () => {
    for (const field of ['sourceId', 'url', 'observedAt'] as const) {
      const c = clone();
      const rule = c.activeRules[0]!;
      rule.provenance[field] = rule.provenance[field] + '-MUTATED';
      expect(computeCorpusSemanticDigest(c)).not.toBe(A2_ACCEPTED_CORPUS_SEMANTIC_DIGEST_V1);
      expect(() => assertCorpusAuthority(c)).toThrow(CorpusAuthorityMismatchError);
    }
  });

  it('mutating operationalState.asOf changes the digest (V4.5 §8)', () => {
    const c = clone();
    c.operationalStates[0]!.asOf = '2099-01-01T00:00:00-05:00';
    expect(computeCorpusSemanticDigest(c)).not.toBe(A2_ACCEPTED_CORPUS_SEMANTIC_DIGEST_V1);
    expect(() => assertCorpusAuthority(c)).toThrow(CorpusAuthorityMismatchError);
  });

  it('mutating operationalState.note (absent→present, and A→B) changes the digest (V4.5 §9)', () => {
    const added = clone();
    added.operationalStates[0]!.note = 'diagnostic-change';
    const d1 = computeCorpusSemanticDigest(added);
    expect(d1).not.toBe(A2_ACCEPTED_CORPUS_SEMANTIC_DIGEST_V1);

    const changed = clone();
    changed.operationalStates[0]!.note = 'A';
    const dA = computeCorpusSemanticDigest(changed);
    changed.operationalStates[0]!.note = 'B';
    const dB = computeCorpusSemanticDigest(changed);
    expect(dA).not.toBe(dB);
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
      expect(computeCorpusSemanticDigest(c)).not.toBe(A2_ACCEPTED_CORPUS_SEMANTIC_DIGEST_V1);
    }
  });

  it('mutating scope / rule identity fields changes the digest', () => {
    const s = clone();
    s.scopes[0]!.equivalenceGroup = s.scopes[0]!.equivalenceGroup + '-X';
    expect(computeCorpusSemanticDigest(s)).not.toBe(A2_ACCEPTED_CORPUS_SEMANTIC_DIGEST_V1);
    const r = clone();
    r.activeRules[0]!.campaignId = r.activeRules[0]!.campaignId + '-X';
    expect(computeCorpusSemanticDigest(r)).not.toBe(A2_ACCEPTED_CORPUS_SEMANTIC_DIGEST_V1);
  });
});

// PagaMenos · persistence — trusted provenance tests (P35A-05 §49).
import { describe, expect, it } from 'vitest';

import { frozenRule, frozenScope } from '@/engine/golden/harness';
import type { RuleVersion } from '@/corpus';

import { CORPUS_VERSION } from './__fixtures__/decision-fixture';
import { CorpusProvenanceError } from './errors';
import { corpusV1ProvenanceProvider, fixedCorpusProvenanceProvider } from './provenance';

const rules = [frozenRule('CW-PLIN-01'), frozenRule('CW-SIP-01')];
const scopes = [frozenScope('sc_cw_chijaukay_alopobre')];

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

describe('corpusV1ProvenanceProvider — verifies exact Corpus-v1 membership (§35/§36)', () => {
  const provider = corpusV1ProvenanceProvider();

  it('accepts a genuine SUBSET of Corpus-v1 rules/scopes and returns the corpus id', () => {
    expect(provider.verify({ rules, scopes })).toBe(CORPUS_VERSION);
  });

  it('rejects an unknown rule id (not a member)', () => {
    const fake = clone(rules[0]!);
    fake.ruleId = 'FAKE-RULE-XYZ';
    expect(() => provider.verify({ rules: [fake], scopes })).toThrow(CorpusProvenanceError);
  });

  it('rejects a mutated economic field on a real rule (arbitrary rule cannot get the Corpus-v1 label)', () => {
    const mutated = clone(rules[0]!) as RuleVersion & {
      benefit: { type: string; bundlePriceCentimos?: number };
    };
    if (mutated.benefit.type === 'FIXED_BUNDLE') {
      mutated.benefit.bundlePriceCentimos = 1; // tamper the price
    } else {
      (mutated as unknown as { campaignId: string }).campaignId = 'TAMPERED';
    }
    expect(() => provider.verify({ rules: [mutated as RuleVersion], scopes })).toThrow(
      CorpusProvenanceError,
    );
  });

  it('rejects an unknown scope id', () => {
    const fake = clone(scopes[0]!);
    fake.scopeId = 'sc_not_real';
    expect(() => provider.verify({ rules, scopes: [fake] })).toThrow(CorpusProvenanceError);
  });
});

describe('fixedCorpusProvenanceProvider — trusted injection (§37)', () => {
  it('returns a fixed label without membership verification (for synthetic-rule suites)', () => {
    const p = fixedCorpusProvenanceProvider('TEST_CORPUS');
    expect(p.verify({ rules: [], scopes: [] })).toBe('TEST_CORPUS');
  });
  it('rejects an empty label', () => {
    expect(() => fixedCorpusProvenanceProvider('  ')).toThrow(CorpusProvenanceError);
  });
});

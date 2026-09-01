// PagaMenos · persistence — trusted provenance tests (P35A-05 §27–§31/§49).
import { describe, expect, it } from 'vitest';

import { exactItemsOf, frozenRule, frozenScope } from '@/engine/golden/harness';
import type { DecideInput } from '@/engine';
import type { RuleVersion } from '@/corpus';

import { CORPUS_VERSION } from './__fixtures__/decision-fixture';
import { CorpusProvenanceError } from './errors';
import { corpusV1ProvenanceProvider, fixedCorpusProvenanceProvider } from './provenance';

const chijaukayScope = frozenScope('sc_cw_chijaukay_alopobre');
const popScope = frozenScope('sc_pop_6pcs_family_potato');

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/** A complete, authentic Chinawok chijaukay comparison input (no selected scope). */
function chinawokComplete(): Pick<DecideInput, 'rules' | 'scopes' | 'context' | 'selectedScopeId'> {
  return {
    rules: [frozenRule('CW-PLIN-01'), frozenRule('CW-SIP-01')],
    scopes: [chijaukayScope],
    context: { merchantId: 'm_chinawok', exactItems: exactItemsOf(chijaukayScope) },
  };
}

/** A complete, authentic Popeyes 6pcs comparison input. */
function popeyesComplete(): Pick<DecideInput, 'rules' | 'scopes' | 'context' | 'selectedScopeId'> {
  return {
    rules: [frozenRule('POP-BCP-01'), frozenRule('POP-SIP-02')],
    scopes: [popScope],
    context: { merchantId: 'm_popeyes', exactItems: exactItemsOf(popScope) },
  };
}

describe('corpusV1ProvenanceProvider — authenticity (§30)', () => {
  const provider = corpusV1ProvenanceProvider();

  it('accepts a complete authentic Corpus-v1 comparison set and returns the corpus id', () => {
    expect(provider.verify(chinawokComplete())).toBe(CORPUS_VERSION);
  });

  it('rejects an unknown rule id', () => {
    const c = chinawokComplete();
    const fake = clone(c.rules[0]!);
    fake.ruleId = 'FAKE-RULE-XYZ';
    expect(() => provider.verify({ ...c, rules: [fake, c.rules[1]!] })).toThrow(
      CorpusProvenanceError,
    );
  });

  it('rejects a mutated economic field on a real rule', () => {
    const c = chinawokComplete();
    const mutated = clone(c.rules[0]!) as RuleVersion & { campaignId: string };
    mutated.campaignId = 'TAMPERED';
    expect(() => provider.verify({ ...c, rules: [mutated, c.rules[1]!] })).toThrow(
      CorpusProvenanceError,
    );
  });

  it('rejects an unknown scope id', () => {
    const c = chinawokComplete();
    const fake = clone(c.scopes[0]!);
    fake.scopeId = 'sc_not_real';
    expect(() => provider.verify({ ...c, scopes: [fake] })).toThrow(CorpusProvenanceError);
  });
});

describe('corpusV1ProvenanceProvider — candidate-set completeness (§18–§29)', () => {
  const provider = corpusV1ProvenanceProvider();

  it('CHINAWOK EXPLOIT: SIP-only (missing CW-PLIN-01) fails completeness', () => {
    const c = chinawokComplete();
    expect(() => provider.verify({ ...c, rules: [frozenRule('CW-SIP-01')] })).toThrow(
      CorpusProvenanceError,
    );
  });

  it('SECOND CONTROL: Popeyes missing POP-BCP-01 fails completeness', () => {
    const c = popeyesComplete();
    expect(() => provider.verify({ ...c, rules: [frozenRule('POP-SIP-02')] })).toThrow(
      CorpusProvenanceError,
    );
  });

  it('is order-invariant on the provided rule set (§29)', () => {
    const c = chinawokComplete();
    expect(provider.verify({ ...c, rules: [c.rules[1]!, c.rules[0]!] })).toBe(CORPUS_VERSION);
  });

  it('selected scope must have its complete candidate set present (§21)', () => {
    const c = chinawokComplete();
    // selected scope present + complete → OK
    expect(provider.verify({ ...c, selectedScopeId: 'sc_cw_chijaukay_alopobre' })).toBe(
      CORPUS_VERSION,
    );
    // selected scope present but incomplete → reject
    expect(() =>
      provider.verify({
        ...c,
        rules: [frozenRule('CW-SIP-01')],
        selectedScopeId: 'sc_cw_chijaukay_alopobre',
      }),
    ).toThrow(CorpusProvenanceError);
  });

  it('rejects a selectedScopeId that is not a Corpus-v1 scope for the merchant', () => {
    const c = chinawokComplete();
    expect(() => provider.verify({ ...c, selectedScopeId: 'sc_pop_6pcs_family_potato' })).toThrow(
      CorpusProvenanceError,
    );
  });
});

describe('fixedCorpusProvenanceProvider — trusted injection (§31/§37)', () => {
  it('returns a fixed label without verification (synthetic-rule suites only)', () => {
    const p = fixedCorpusProvenanceProvider('TEST_CORPUS');
    expect(p.verify({ rules: [], scopes: [], context: { merchantId: 'm_chinawok' } })).toBe(
      'TEST_CORPUS',
    );
  });
  it('rejects an empty label', () => {
    expect(() => fixedCorpusProvenanceProvider('  ')).toThrow(CorpusProvenanceError);
  });
});

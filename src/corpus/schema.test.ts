import { describe, expect, it } from 'vitest';

import { loadCorpus, parseCorpus } from '@/corpus';

function deepClone(): any {
  return JSON.parse(JSON.stringify(loadCorpus()));
}

describe('corpus schema (strict)', () => {
  it('accepts the frozen Corpus v1', () => {
    expect(() => parseCorpus(loadCorpus())).not.toThrow();
  });

  it('rejects legacy Constraints.minSpendCentimos', () => {
    const raw = deepClone();
    raw.activeRules[0].constraints.minSpendCentimos = 1000; // superseded field
    expect(() => parseCorpus(raw)).toThrow();
  });

  it('rejects legacy Benefit.minimumSpendCentimos / minimumSpendBasis', () => {
    const a = deepClone();
    a.activeRules[0].benefit.minimumSpendCentimos = 1000;
    expect(() => parseCorpus(a)).toThrow();

    const b = deepClone();
    b.activeRules[0].benefit.minimumSpendBasis = 'WHOLE_BILL';
    expect(() => parseCorpus(b)).toThrow();
  });

  it('accepts the Rev-2 canonical minimumSpend shape', () => {
    const raw = deepClone();
    raw.activeRules[0].constraints.minimumSpend = {
      minimumSpendCentimos: 5000,
      basis: 'WHOLE_BILL',
    };
    expect(() => parseCorpus(raw)).not.toThrow();
  });

  it('rejects an unknown top-level key (strict)', () => {
    const raw = deepClone();
    raw.somethingUnexpected = true;
    expect(() => parseCorpus(raw)).toThrow();
  });
});

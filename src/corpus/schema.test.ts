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

  // M1 closure: observation date and provider-declared start date are DISTINCT concepts.
  it('OBSERVED_ACTIVE_UNTIL has no start field — adding startDateInclusive is rejected (strict)', () => {
    const raw = deepClone();
    raw.activeRules[0].constraints.temporal = {
      kind: 'OBSERVED_ACTIVE_UNTIL',
      observedActiveAt: '2026-08-30',
      endDateInclusive: '2026-09-30',
    };
    // The observed-active variant accepts observation + published end...
    expect(() => parseCorpus(raw)).not.toThrow();
    // ...but conflating the observation date with a campaign start is a strict-schema violation.
    raw.activeRules[0].constraints.temporal.startDateInclusive = '2026-08-30';
    expect(() => parseCorpus(raw)).toThrow();
  });

  it('rejects an OBSERVED_ACTIVE_UNTIL with an invalid Lima calendar date', () => {
    const raw = deepClone();
    raw.activeRules[0].constraints.temporal = {
      kind: 'OBSERVED_ACTIVE_UNTIL',
      observedActiveAt: '2026-02-30', // not a real date
      endDateInclusive: '2026-09-30',
    };
    expect(() => parseCorpus(raw)).toThrow();
  });
});

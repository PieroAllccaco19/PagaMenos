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

  // RTM3-11 (2nd closure): nominal economic values must be SAFE integers in the corpus itself.
  const nominalIndex = (raw: any): number =>
    raw.activeRules.findIndex((r: any) => r.benefit.type === 'NON_CASH_NOMINAL');

  it('accepts the frozen Coney nominal rows (safe-integer values)', () => {
    const raw = deepClone();
    expect(nominalIndex(raw)).toBeGreaterThanOrEqual(0);
    expect(() => parseCorpus(raw)).not.toThrow();
  });

  for (const bad of [Number.MAX_SAFE_INTEGER + 1, -1, 1.5]) {
    it(`rejects nominalMinorUnits = ${bad}`, () => {
      const raw = deepClone();
      raw.activeRules[nominalIndex(raw)].benefit.nominalMinorUnits = bad;
      expect(() => parseCorpus(raw)).toThrow();
    });
    it(`rejects nominal cashAcquisitionCostCentimos = ${bad}`, () => {
      const raw = deepClone();
      raw.activeRules[nominalIndex(raw)].benefit.cashAcquisitionCostCentimos = bad;
      expect(() => parseCorpus(raw)).toThrow();
    });
    it(`rejects a NOMINAL_PACKAGE signature acquisition cost = ${bad}`, () => {
      const raw = deepClone();
      const scopeIdx = raw.scopes.findIndex((s: any) => s.signature.kind === 'NOMINAL_PACKAGE');
      raw.scopes[scopeIdx].signature.cashAcquisitionCostCentimos = bad;
      expect(() => parseCorpus(raw)).toThrow();
    });
  }

  // RTM3-11 (micro-closure): nominalMinorUnits shares one POSITIVITY invariant with the runtime —
  // −1 and 0 are rejected by both; 1 is valid by both. (Zero IS valid for a céntimo cost, so this is
  // asserted only for nominalMinorUnits.)
  it('schema rejects nominalMinorUnits = 0 and -1 but accepts 1 (aligned with runtime positivity)', () => {
    const reject = (v: number) => {
      const raw = deepClone();
      raw.activeRules[nominalIndex(raw)].benefit.nominalMinorUnits = v;
      expect(() => parseCorpus(raw)).toThrow();
    };
    reject(0);
    reject(-1);
    const raw = deepClone();
    raw.activeRules[nominalIndex(raw)].benefit.nominalMinorUnits = 1;
    expect(() => parseCorpus(raw)).not.toThrow();
  });
});

import { describe, expect, it } from 'vitest';

import {
  canonicalItemsEqual,
  CanonicalItemError,
  deriveRequiredContext,
  deriveRequiredSignatureKind,
  lintCorpus,
  loadCorpus,
  normalizeCanonicalItems,
  reconcileCorpus,
  SignatureDerivationError,
} from '@/corpus';
import type { Benefit, ComparisonScope, Corpus, RuleOperationalState, RuleVersion } from '@/corpus';

// ---------- helpers ----------
function mkRule(
  over: Partial<RuleVersion> & {
    benefit: Benefit;
    eligibleSpendSelector: RuleVersion['eligibleSpendSelector'];
  },
): RuleVersion {
  return {
    ruleId: 'R1',
    version: 1,
    campaignId: 'c1',
    merchantIds: ['m_papa_johns'],
    providerFamily: 'IBK_PLIN',
    eligibilityClass: 'DETERMINISTIC_PUBLIC',
    confidence: 'HIGH',
    comparisonScopeRefs: ['sc'],
    signatureKind: 'EXACT_BUNDLE',
    provenance: { sourceId: 's1', url: 'https://x', observedAt: '2026-08-30' },
    constraints: {
      temporal: {
        kind: 'LOCAL_DATE_RANGE',
        startDateInclusive: '2026-07-01',
        endDateInclusive: '2026-09-30',
      },
      holidayPolicy: 'UNKNOWN',
      channels: ['SALON'],
      combinability: 'NO',
    },
    ...over,
  };
}

function baseCorpus(): Corpus {
  const scope: ComparisonScope = {
    scopeId: 'sc',
    merchantId: 'm_papa_johns',
    comparisonBasis: 'EFFECTIVE_OUT_OF_POCKET_COST',
    equivalenceGroup: 'g',
    purchaseKind: 'K',
    requiredContext: ['BASKET', 'DATE_TIME', 'CHANNEL'],
    allowedSelectors: ['EXACT_SKU_BUNDLE'],
    signature: {
      kind: 'EXACT_BUNDLE',
      merchantId: 'm_papa_johns',
      canonicalItems: [{ itemKey: 'a', qty: 1 }],
    },
  };
  const rule = mkRule({
    benefit: { type: 'FIXED_BUNDLE', bundlePriceCentimos: 1000, regularReferenceCentimos: 2000 },
    eligibleSpendSelector: 'EXACT_SKU_BUNDLE',
    canonicalItems: [{ itemKey: 'a', qty: 1 }],
    eligibilityClass: 'DYNAMIC_EXTERNAL',
  });
  const op: RuleOperationalState = {
    ruleId: 'R1',
    version: 1,
    publicationState: 'ACTIVE',
    sourceQualityState: 'FRESH',
    availability: 'UNKNOWN',
    asOf: 't',
  };
  return {
    corpusId: 'c',
    freezeTimestamp: 't',
    merchants: [{ merchantId: 'm_papa_johns', displayName: 'PJ', category: 'FOOD' }],
    sources: [{ sourceId: 's1', providerFamily: 'IBK_PLIN', url: 'https://x', label: 'l' }],
    scopes: [scope],
    activeRules: [rule],
    operationalStates: [op],
    researchMeta: [],
    excludedRules: [],
  };
}

function codes(c: Corpus): string[] {
  return lintCorpus(c).map((e) => e.code);
}

// ---------- Corpus v1 reconciliation ----------
describe('Corpus v1 reconciliation', () => {
  const corpus = loadCorpus();
  const r = reconcileCorpus(corpus);

  it('matches all frozen counts', () => {
    expect(r.mismatches).toEqual([]);
    expect(r.merchants).toBe(14);
    expect(r.activeRules).toBe(46);
    expect(r.foodMerchants).toBe(10);
    expect(r.entertainmentMerchants).toBe(4);
    expect(r.providerDistribution).toEqual({ IBK_PLIN: 16, DINERS: 12, BCP_QORE: 10, SIP_OH: 8 });
    expect(r.providerPrivateOverlays).toBe(2);
    expect(r.overlap).toEqual({ O2: 8, O3: 2, O4_CONFIRMED: 4 });
    expect(r.decision).toEqual({
      DECISION_ENGINE_CORE: 7,
      DECISION_ASSIST: 3,
      DIRECTORY_SUFFICIENT: 4,
    });
  });

  it('removed merchants are absent and stale Cineplanet Sip is not active', () => {
    expect(r.removedMerchantsPresent).toEqual([]);
    expect(r.staleCineplanetActive).toBe(false);
    expect(corpus.activeRules.some((x) => x.ruleId === 'CIN-SIP-STALE')).toBe(false);
    expect(corpus.excludedRules.some((x) => x.rule.ruleId === 'CIN-SIP-STALE')).toBe(true);
  });

  it('the frozen corpus passes lint with 0 errors', () => {
    expect(lintCorpus(corpus)).toEqual([]);
  });
});

// ---------- Signature derivation ----------
describe('deriveRequiredSignatureKind', () => {
  it('NON_CASH_NOMINAL → NOMINAL_PACKAGE', () => {
    expect(
      deriveRequiredSignatureKind(
        mkRule({
          benefit: {
            type: 'NON_CASH_NOMINAL',
            nominalMinorUnits: 8500,
            nominalUnit: 'CONEY_PLAY_BALANCE',
            cashAcquisitionCostCentimos: 4500,
          },
          eligibleSpendSelector: 'EXACT_SKU_BUNDLE',
        }),
      ),
    ).toBe('NOMINAL_PACKAGE');
  });
  it('ticket unit → TICKETS', () => {
    expect(
      deriveRequiredSignatureKind(
        mkRule({
          benefit: { type: 'TWO_FOR_ONE', pay: 1, of: 2 },
          eligibleSpendSelector: 'TICKET_UNIT',
        }),
      ),
    ).toBe('TICKETS');
  });
  it('exact bundle → EXACT_BUNDLE', () => {
    expect(
      deriveRequiredSignatureKind(
        mkRule({
          benefit: {
            type: 'FIXED_BUNDLE',
            bundlePriceCentimos: 1000,
            regularReferenceCentimos: 2000,
          },
          eligibleSpendSelector: 'EXACT_SKU_BUNDLE',
        }),
      ),
    ).toBe('EXACT_BUNDLE');
  });
  it('genuine bill percentage → ELIGIBLE_BILL', () => {
    expect(
      deriveRequiredSignatureKind(
        mkRule({
          benefit: { type: 'PERCENT', percentBps: 2000, rounding: 'FLOOR_TO_CENT' },
          eligibleSpendSelector: 'FOOD_ONLY',
        }),
      ),
    ).toBe('ELIGIBLE_BILL');
  });
  it('undeterminable semantics → throws (fail-closed)', () => {
    expect(() =>
      deriveRequiredSignatureKind(
        mkRule({
          benefit: { type: 'CASHBACK', valueCentimos: 500, settlementDelay: '30d' },
          eligibleSpendSelector: 'NON_EQUIVALENT_PURCHASE',
        }),
      ),
    ).toThrow(SignatureDerivationError);
  });
});

// ---------- RT-04 signature-kind bypass regression ----------
describe('RT-04 signature-kind bypass is blocked', () => {
  it('two exact bundles mislabeled ELIGIBLE_BILL fail corpus lint', () => {
    const c = baseCorpus();
    // Pizza-Hut-class: exact-bundle semantics forced into an ELIGIBLE_BILL scope.
    c.scopes = [
      {
        scopeId: 'sc',
        merchantId: 'm_papa_johns',
        comparisonBasis: 'EFFECTIVE_OUT_OF_POCKET_COST',
        equivalenceGroup: 'g',
        purchaseKind: 'GENERAL_MEAL',
        requiredContext: ['BASKET', 'DATE_TIME', 'CHANNEL'],
        allowedSelectors: ['EXACT_SKU_BUNDLE'],
        signature: {
          kind: 'ELIGIBLE_BILL',
          merchantId: 'm_papa_johns',
          purchaseDomain: 'RESTAURANT_BILL',
        },
      },
    ];
    c.activeRules = [
      mkRule({
        ruleId: 'A',
        benefit: {
          type: 'FIXED_BUNDLE',
          bundlePriceCentimos: 1000,
          regularReferenceCentimos: 2000,
        },
        eligibleSpendSelector: 'EXACT_SKU_BUNDLE',
        canonicalItems: [
          { itemKey: 'pizza_a', qty: 1 },
          { itemKey: 'drink', qty: 1 },
        ],
        signatureKind: 'ELIGIBLE_BILL',
      }),
      mkRule({
        ruleId: 'B',
        benefit: {
          type: 'FIXED_BUNDLE',
          bundlePriceCentimos: 1100,
          regularReferenceCentimos: 2100,
        },
        eligibleSpendSelector: 'EXACT_SKU_BUNDLE',
        canonicalItems: [
          { itemKey: 'pizza_b', qty: 1 },
          { itemKey: 'sides', qty: 1 },
        ],
        signatureKind: 'ELIGIBLE_BILL',
      }),
    ];
    c.operationalStates = c.activeRules.map((x) => ({
      ruleId: x.ruleId,
      version: 1,
      publicationState: 'ACTIVE',
      sourceQualityState: 'FRESH',
      availability: 'NOT_APPLICABLE',
      asOf: 't',
    }));
    expect(codes(c)).toContain('SIGNATURE_KIND_NOT_DERIVED');
  });

  it('correctly-labeled exact bundle is allowed', () => {
    expect(lintCorpus(baseCorpus())).toEqual([]);
  });

  it('genuine Perroquet-style ELIGIBLE_BILL with differing selectors is allowed', () => {
    const c = baseCorpus();
    c.merchants = [{ merchantId: 'm_perroquet', displayName: 'Perroquet', category: 'FOOD' }];
    c.scopes = [
      {
        scopeId: 'sc',
        merchantId: 'm_perroquet',
        comparisonBasis: 'EFFECTIVE_OUT_OF_POCKET_COST',
        equivalenceGroup: 'meal',
        purchaseKind: 'SIT_DOWN_MEAL',
        requiredContext: ['AMOUNT', 'BASKET', 'DATE_TIME', 'CHANNEL'],
        allowedSelectors: ['FOOD_ONLY', 'FOOD_PLUS_NONALCOHOLIC'],
        signature: {
          kind: 'ELIGIBLE_BILL',
          merchantId: 'm_perroquet',
          purchaseDomain: 'SIT_DOWN_MEAL',
        },
      },
    ];
    c.activeRules = [
      mkRule({
        ruleId: 'BCP',
        merchantIds: ['m_perroquet'],
        benefit: { type: 'PERCENT', percentBps: 2000, rounding: 'FLOOR_TO_CENT' },
        eligibleSpendSelector: 'FOOD_PLUS_NONALCOHOLIC',
        signatureKind: 'ELIGIBLE_BILL',
      }),
      mkRule({
        ruleId: 'DIN',
        merchantIds: ['m_perroquet'],
        benefit: { type: 'PERCENT', percentBps: 3000, rounding: 'FLOOR_TO_CENT' },
        eligibleSpendSelector: 'FOOD_ONLY',
        signatureKind: 'ELIGIBLE_BILL',
      }),
    ];
    c.operationalStates = c.activeRules.map((x) => ({
      ruleId: x.ruleId,
      version: 1,
      publicationState: 'ACTIVE',
      sourceQualityState: 'FRESH',
      availability: 'NOT_APPLICABLE',
      asOf: 't',
    }));
    expect(lintCorpus(c)).toEqual([]);
  });
});

// ---------- Exact-bundle structural check ----------
describe('exact-bundle normalization & structural check', () => {
  it('same normalized items are equal; unequal are not', () => {
    expect(
      canonicalItemsEqual(
        [
          { itemKey: 'b', qty: 1 },
          { itemKey: 'a', qty: 2 },
        ],
        [
          { itemKey: 'a', qty: 2 },
          { itemKey: 'b', qty: 1 },
        ],
      ),
    ).toBe(true);
    expect(canonicalItemsEqual([{ itemKey: 'a', qty: 1 }], [{ itemKey: 'a', qty: 2 }])).toBe(false);
  });
  it('duplicate item key rejected', () => {
    expect(() =>
      normalizeCanonicalItems([
        { itemKey: 'a', qty: 1 },
        { itemKey: 'a', qty: 1 },
      ]),
    ).toThrow(CanonicalItemError);
  });
  it('invalid quantity rejected', () => {
    expect(() => normalizeCanonicalItems([{ itemKey: 'a', qty: 0 }])).toThrow(CanonicalItemError);
    expect(() => normalizeCanonicalItems([{ itemKey: 'a', qty: 1.5 }])).toThrow(CanonicalItemError);
  });
  it('two unequal exact bundles cannot share one rankable scope', () => {
    const c = baseCorpus();
    c.activeRules = [
      mkRule({
        ruleId: 'A',
        benefit: {
          type: 'FIXED_BUNDLE',
          bundlePriceCentimos: 1000,
          regularReferenceCentimos: 2000,
        },
        eligibleSpendSelector: 'EXACT_SKU_BUNDLE',
        canonicalItems: [{ itemKey: 'a', qty: 1 }],
      }),
      mkRule({
        ruleId: 'B',
        benefit: {
          type: 'FIXED_BUNDLE',
          bundlePriceCentimos: 1100,
          regularReferenceCentimos: 2100,
        },
        eligibleSpendSelector: 'EXACT_SKU_BUNDLE',
        canonicalItems: [{ itemKey: 'DIFFERENT', qty: 1 }],
      }),
    ];
    c.operationalStates = c.activeRules.map((x) => ({
      ruleId: x.ruleId,
      version: 1,
      publicationState: 'ACTIVE',
      sourceQualityState: 'FRESH',
      availability: 'NOT_APPLICABLE',
      asOf: 't',
    }));
    expect(codes(c)).toContain('EXACT_BUNDLE_ITEM_MISMATCH');
  });
});

// ---------- Required-context derivation ----------
describe('deriveRequiredContext', () => {
  const ctx = (r: RuleVersion): string[] => [...deriveRequiredContext(r)].sort();
  it('percentage bill needs AMOUNT + BASKET(food) + CHANNEL + DATE_TIME', () => {
    expect(
      ctx(
        mkRule({
          benefit: { type: 'PERCENT', percentBps: 2000, rounding: 'FLOOR_TO_CENT' },
          eligibleSpendSelector: 'FOOD_ONLY',
        }),
      ),
    ).toEqual(['AMOUNT', 'BASKET', 'CHANNEL', 'DATE_TIME']);
  });
  it('exact bundle needs BASKET + CHANNEL + DATE_TIME (no AMOUNT)', () => {
    expect(
      ctx(
        mkRule({
          benefit: { type: 'FIXED_BUNDLE', bundlePriceCentimos: 1, regularReferenceCentimos: 2 },
          eligibleSpendSelector: 'EXACT_SKU_BUNDLE',
        }),
      ),
    ).toEqual(['BASKET', 'CHANNEL', 'DATE_TIME']);
  });
  it('ticket unit needs TICKET_PRICE + CHANNEL + DATE_TIME', () => {
    expect(
      ctx(
        mkRule({
          benefit: { type: 'TWO_FOR_ONE', pay: 1, of: 2 },
          eligibleSpendSelector: 'TICKET_UNIT',
        }),
      ),
    ).toEqual(['CHANNEL', 'DATE_TIME', 'TICKET_PRICE']);
  });
  it('nominal package needs only DATE_TIME + CHANNEL', () => {
    expect(
      ctx(
        mkRule({
          benefit: {
            type: 'NON_CASH_NOMINAL',
            nominalMinorUnits: 8500,
            nominalUnit: 'CONEY_PLAY_BALANCE',
            cashAcquisitionCostCentimos: 4500,
          },
          eligibleSpendSelector: 'EXACT_SKU_BUNDLE',
        }),
      ),
    ).toEqual(['CHANNEL', 'DATE_TIME']);
  });
  it('cap adds AMOUNT even without a percentage', () => {
    const r = mkRule({
      benefit: { type: 'FIXED_DISCOUNT', fixedDiscountCentimos: 500, amountDependent: false },
      eligibleSpendSelector: 'EXACT_SKU_BUNDLE',
      constraints: {
        temporal: {
          kind: 'LOCAL_DATE_RANGE',
          startDateInclusive: '2026-07-01',
          endDateInclusive: '2026-09-30',
        },
        holidayPolicy: 'UNKNOWN',
        channels: ['SALON'],
        combinability: 'NO',
        cap: { kind: 'AMOUNT', centimos: 7000 },
      },
    });
    expect(ctx(r)).toContain('AMOUNT');
  });
  it('missing required context in a scope fails lint', () => {
    const c = baseCorpus();
    // Percentage rule needs AMOUNT; scope omits it.
    c.scopes = [
      {
        scopeId: 'sc',
        merchantId: 'm_papa_johns',
        comparisonBasis: 'EFFECTIVE_OUT_OF_POCKET_COST',
        equivalenceGroup: 'g',
        purchaseKind: 'K',
        requiredContext: ['BASKET', 'DATE_TIME', 'CHANNEL'],
        allowedSelectors: ['FOOD_ONLY'],
        signature: {
          kind: 'ELIGIBLE_BILL',
          merchantId: 'm_papa_johns',
          purchaseDomain: 'RESTAURANT_FOOD',
        },
      },
    ];
    c.activeRules = [
      mkRule({
        benefit: { type: 'PERCENT', percentBps: 2000, rounding: 'FLOOR_TO_CENT' },
        eligibleSpendSelector: 'FOOD_ONLY',
        signatureKind: 'ELIGIBLE_BILL',
      }),
    ];
    expect(codes(c)).toContain('REQUIRED_CONTEXT_OMITTED');
  });
});

// ---------- Nominal structural prerequisites (RT-06) ----------
describe('nominal comparison prerequisites', () => {
  function nominalCorpus(scopeCash: number): Corpus {
    const c = baseCorpus();
    c.merchants = [{ merchantId: 'm_coney_park', displayName: 'Coney', category: 'ENTERTAINMENT' }];
    c.scopes = [
      {
        scopeId: 'sc',
        merchantId: 'm_coney_park',
        comparisonBasis: 'NOMINAL_VALUE_SAME_UNIT',
        equivalenceGroup: 'play',
        purchaseKind: 'PLAY',
        requiredContext: ['DATE_TIME', 'CHANNEL'],
        allowedSelectors: ['EXACT_SKU_BUNDLE'],
        signature: {
          kind: 'NOMINAL_PACKAGE',
          merchantId: 'm_coney_park',
          cashAcquisitionCostCentimos: scopeCash,
          nominalUnit: 'CONEY_PLAY_BALANCE',
        },
      },
    ];
    c.activeRules = [
      mkRule({
        ruleId: 'N',
        merchantIds: ['m_coney_park'],
        benefit: {
          type: 'NON_CASH_NOMINAL',
          nominalMinorUnits: 8500,
          nominalUnit: 'CONEY_PLAY_BALANCE',
          cashAcquisitionCostCentimos: 4500,
        },
        eligibleSpendSelector: 'EXACT_SKU_BUNDLE',
        signatureKind: 'NOMINAL_PACKAGE',
      }),
    ];
    c.operationalStates = [
      {
        ruleId: 'N',
        version: 1,
        publicationState: 'ACTIVE',
        sourceQualityState: 'FRESH',
        availability: 'NOT_APPLICABLE',
        asOf: 't',
      },
    ];
    return c;
  }
  it('same unit + equal acquisition cost is allowed', () => {
    expect(lintCorpus(nominalCorpus(4500))).toEqual([]);
  });
  it('mismatched acquisition cost is rejected', () => {
    expect(codes(nominalCorpus(4000))).toContain('NOMINAL_ACQUISITION_COST_MISMATCH');
  });
});

// ---------- Identity / provenance / references ----------
describe('identity, provenance & reference integrity', () => {
  it('unknown source is rejected', () => {
    const c = baseCorpus();
    c.activeRules[0]!.provenance = {
      sourceId: 's_missing',
      url: 'https://x',
      observedAt: '2026-08-30',
    };
    expect(codes(c)).toContain('UNKNOWN_SOURCE');
  });
  it('unknown scope ref is rejected', () => {
    const c = baseCorpus();
    c.activeRules[0]!.comparisonScopeRefs = ['sc_missing'];
    expect(codes(c)).toContain('UNKNOWN_SCOPE_REF');
  });
  it('duplicate ruleId is rejected', () => {
    const c = baseCorpus();
    c.activeRules = [c.activeRules[0]!, { ...c.activeRules[0]! }];
    c.operationalStates = [c.operationalStates[0]!, { ...c.operationalStates[0]! }];
    expect(codes(c)).toContain('DUPLICATE_RULE_ID');
  });
  it('missing provenance url is rejected', () => {
    const c = baseCorpus();
    c.activeRules[0]!.provenance = { sourceId: 's1', url: '', observedAt: '2026-08-30' };
    expect(codes(c)).toContain('MISSING_PROVENANCE_URL');
  });
  it('inverted temporal range is rejected', () => {
    const c = baseCorpus();
    c.activeRules[0]!.constraints.temporal = {
      kind: 'LOCAL_DATE_RANGE',
      startDateInclusive: '2026-09-30',
      endDateInclusive: '2026-07-01',
    };
    expect(codes(c)).toContain('MALFORMED_TEMPORAL_RANGE');
  });
  it('provider-private rule without a private key is rejected', () => {
    const c = baseCorpus();
    c.activeRules[0]!.eligibilityClass = 'PROVIDER_PRIVATE';
    expect(codes(c)).toContain('PRIVATE_MISSING_KEY');
  });
});

// ---------- M1 closure: temporal representation (unknown start ≠ invented start) ----------
describe('temporal representation (OBSERVED_ACTIVE_UNTIL vs LOCAL_DATE_RANGE)', () => {
  it('a published full range stays LOCAL_DATE_RANGE with both dates preserved', () => {
    const c = baseCorpus();
    c.activeRules[0]!.constraints.temporal = {
      kind: 'LOCAL_DATE_RANGE',
      startDateInclusive: '2026-07-01',
      endDateInclusive: '2026-09-30',
    };
    const t = c.activeRules[0]!.constraints.temporal;
    expect(t.kind).toBe('LOCAL_DATE_RANGE');
    expect(t).toMatchObject({ startDateInclusive: '2026-07-01', endDateInclusive: '2026-09-30' });
    expect(codes(c)).not.toContain('MALFORMED_TEMPORAL_RANGE');
  });

  it('end-date-only frozen rows use OBSERVED_ACTIVE_UNTIL and never serialize an invented start', () => {
    const corpus = loadCorpus();
    const endOnly = ['PJ-SIP-01', 'CW-SIP-01', 'POP-IBK-01', 'EMB-IBK-01'];
    for (const id of endOnly) {
      const rule = corpus.activeRules.find((r) => r.ruleId === id);
      expect(rule, `rule ${id} present`).toBeDefined();
      const t = rule!.constraints.temporal;
      expect(t.kind).toBe('OBSERVED_ACTIVE_UNTIL');
      if (t.kind !== 'OBSERVED_ACTIVE_UNTIL') throw new Error('unreachable');
      // observedActiveAt is provenance (the freeze observation date), NOT a claimed start.
      expect(t.observedActiveAt).toBe('2026-08-30');
      expect(t.endDateInclusive.length).toBe(10);
      // MUST NOT store 2026-08-30 as a provider campaign start.
      expect(Object.keys(t)).not.toContain('startDateInclusive');
    }
    // The real corpus with these variants still passes the blocking linter.
    expect(codes(corpus)).not.toContain('MALFORMED_TEMPORAL_RANGE');
  });

  it('rejects invalid chronology: observedActiveAt after the published end', () => {
    const c = baseCorpus();
    c.activeRules[0]!.constraints.temporal = {
      kind: 'OBSERVED_ACTIVE_UNTIL',
      observedActiveAt: '2026-10-01',
      endDateInclusive: '2026-09-30',
    };
    expect(codes(c)).toContain('MALFORMED_TEMPORAL_RANGE');
  });
});

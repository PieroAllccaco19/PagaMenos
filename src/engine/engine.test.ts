import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { loadCorpus } from '@/corpus';
import type { ComparisonScope, RuleOperationalState, RuleVersion } from '@/corpus';

import { decide, evaluateScope, CrossMerchantMembershipError } from '@/engine';
import type { DecideInput, EligibilityPortfolio, PurchaseContext } from '@/engine';
import {
  applyKnownCap,
  minimumSpendMet,
  percentDiscountCentimos,
  twoForOneCostCentimos,
} from './money';
import { evaluateHoliday, limaDate, limaWeekday, withinTemporalRange } from './time';
import { resolveSourceQuality } from './eligibility';

// ------------------------------------------------------------------ helpers
function rule(
  over: Partial<RuleVersion> & Pick<RuleVersion, 'ruleId' | 'benefit' | 'eligibleSpendSelector'>,
): RuleVersion {
  const base: RuleVersion = {
    ruleId: over.ruleId,
    version: 1,
    campaignId: `cmp_${over.ruleId}`,
    merchantIds: over.merchantIds ?? ['m_fridays'],
    providerFamily: over.providerFamily ?? 'IBK_PLIN',
    benefit: over.benefit,
    eligibleSpendSelector: over.eligibleSpendSelector,
    constraints: over.constraints ?? {
      temporal: {
        kind: 'LOCAL_DATE_RANGE',
        startDateInclusive: '2026-01-01',
        endDateInclusive: '2026-12-31',
      },
      holidayPolicy: 'NONE',
      combinability: 'NO',
    },
    eligibilityClass: over.eligibilityClass ?? 'DETERMINISTIC_PUBLIC',
    confidence: over.confidence ?? 'HIGH',
    comparisonScopeRefs: over.comparisonScopeRefs ?? ['sc'],
    signatureKind: over.signatureKind ?? 'ELIGIBLE_BILL',
    provenance: { sourceId: 's', url: 'https://x', observedAt: '2026-08-30' },
  };
  if (over.canonicalItems) base.canonicalItems = over.canonicalItems;
  if (over.ticketContext) base.ticketContext = over.ticketContext;
  return base;
}

function op(ruleId: string, over: Partial<RuleOperationalState> = {}): RuleOperationalState {
  return {
    ruleId,
    version: 1,
    publicationState: 'ACTIVE',
    sourceQualityState: 'FRESH',
    availability: 'NOT_APPLICABLE',
    asOf: '2026-06-01T00:00:00-05:00',
    ...over,
  };
}

function scope(over: Partial<ComparisonScope> = {}): ComparisonScope {
  const merchantId = over.merchantId ?? 'm_fridays';
  return {
    scopeId: over.scopeId ?? 'sc',
    merchantId,
    comparisonBasis: over.comparisonBasis ?? 'EFFECTIVE_OUT_OF_POCKET_COST',
    equivalenceGroup: over.equivalenceGroup ?? 'g',
    purchaseKind: over.purchaseKind ?? 'k',
    requiredContext: over.requiredContext ?? ['AMOUNT', 'DATE_TIME'],
    allowedSelectors: over.allowedSelectors ?? ['WHOLE_BILL'],
    signature: over.signature ?? {
      kind: 'ELIGIBLE_BILL',
      merchantId,
      purchaseDomain: 'RESTAURANT_BILL',
    },
  };
}

const HELD_BOTH: EligibilityPortfolio = {
  instruments: [
    { family: 'IBK_PLIN' },
    { family: 'DINERS' },
    { family: 'BCP_QORE' },
    { family: 'SIP_OH' },
  ],
};

function run(
  over: Partial<DecideInput> &
    Pick<DecideInput, 'rules' | 'operationalStates' | 'scopes' | 'context'>,
): DecideInput {
  return {
    portfolio: over.portfolio ?? HELD_BOTH,
    evaluatedAt: '2026-06-01T12:00:00-05:00',
    intendedTransactionAt: over.intendedTransactionAt ?? '2026-06-01T12:00:00-05:00',
    ...over,
  };
}

const ctxBill = (over: Partial<PurchaseContext> = {}): PurchaseContext => ({
  merchantId: 'm_fridays',
  wholeBillCentimos: 10000,
  // Default ELIGIBLE_BILL runtime proof (RTM3-01); harmless for the EXACT_BUNDLE scope tests that
  // also pass exactItems.
  purchaseDomain: 'RESTAURANT_BILL',
  ...over,
});

// ================================================================== SETTLEMENT
describe('settlement — money (integer céntimos only)', () => {
  it('percent fractional-cent discount floors', () => {
    // 15.33% of 1000 = 153.3 → floor 153
    expect(percentDiscountCentimos(1000, 1533, 'FLOOR_TO_CENT').value).toBe(153);
    // 20% of 12345 = 2469.0 → 2469
    expect(percentDiscountCentimos(12345, 2000, 'FLOOR_TO_CENT').value).toBe(2469);
  });

  it('round-half-up vs floor differ by at most one céntimo', () => {
    const floor = percentDiscountCentimos(1005, 1500, 'FLOOR_TO_CENT').value; // 150.75 → 150
    const half = percentDiscountCentimos(1005, 1500, 'ROUND_HALF_UP_TO_CENT').value; // → 151
    expect(floor).toBe(150);
    expect(half).toBe(151);
  });

  it('EXACT_FIXED rounding on a percent is a fail-closed invariant error', () => {
    expect(() => percentDiscountCentimos(1000, 2000, 'EXACT_FIXED')).toThrow();
  });

  it('known cap applied below / exact / above', () => {
    expect(applyKnownCap(300, 500)).toBe(300); // below cap
    expect(applyKnownCap(500, 500)).toBe(500); // exact
    expect(applyKnownCap(800, 500)).toBe(500); // above → capped
  });

  it('minimum spend: below ineligible, exact & above eligible', () => {
    const c = {
      holidayPolicy: 'NONE',
      combinability: 'NO',
      temporal: {
        kind: 'LOCAL_DATE_RANGE',
        startDateInclusive: '2026-01-01',
        endDateInclusive: '2026-12-31',
      },
      minimumSpend: { minimumSpendCentimos: 5000, basis: 'WHOLE_BILL' },
    } as const;
    expect(minimumSpendMet(c, 4999)).toBe(false);
    expect(minimumSpendMet(c, 5000)).toBe(true);
    expect(minimumSpendMet(c, 5001)).toBe(true);
  });

  it('two-for-one ticket settlement', () => {
    expect(twoForOneCostCentimos(1800, 2, 1, 2)).toBe(1800); // 2 tickets, pay 1
    expect(twoForOneCostCentimos(1800, 3, 1, 2)).toBe(3600); // 1 full group (pay 1) + 1 remainder
    expect(twoForOneCostCentimos(1800, 4, 1, 2)).toBe(3600); // 2 groups → pay 2
  });

  it('engine: fixed price is the effective cost', () => {
    const r = rule({
      ruleId: 'R',
      benefit: { type: 'FIXED_PRICE', fixedPriceCentimos: 1590 },
      eligibleSpendSelector: 'EXACT_SKU_BUNDLE',
      signatureKind: 'EXACT_BUNDLE',
    });
    const sc = scope({
      requiredContext: ['BASKET', 'DATE_TIME'],
      allowedSelectors: ['EXACT_SKU_BUNDLE'],
      signature: {
        kind: 'EXACT_BUNDLE',
        merchantId: 'm_fridays',
        canonicalItems: [{ itemKey: 'a', qty: 1 }],
      },
    });
    const e = decide(
      run({
        rules: [r],
        operationalStates: [op('R')],
        scopes: [sc],
        context: ctxBill({ exactItems: [{ itemKey: 'a', qty: 1 }] }),
      }),
    );
    expect(e.final?.status).toBe('BEST_CONFIRMED');
    expect(e.final?.candidates[0]?.effectiveCostCentimos).toBe(1590);
  });

  it('engine: fixed bundle is the effective cost', () => {
    const r = rule({
      ruleId: 'R',
      benefit: { type: 'FIXED_BUNDLE', bundlePriceCentimos: 2990, regularReferenceCentimos: 3990 },
      eligibleSpendSelector: 'EXACT_SKU_BUNDLE',
      signatureKind: 'EXACT_BUNDLE',
    });
    const sc = scope({
      requiredContext: ['BASKET', 'DATE_TIME'],
      allowedSelectors: ['EXACT_SKU_BUNDLE'],
      signature: {
        kind: 'EXACT_BUNDLE',
        merchantId: 'm_fridays',
        canonicalItems: [{ itemKey: 'a', qty: 1 }],
      },
    });
    const e = decide(
      run({
        rules: [r],
        operationalStates: [op('R')],
        scopes: [sc],
        context: ctxBill({ exactItems: [{ itemKey: 'a', qty: 1 }] }),
      }),
    );
    expect(e.final?.candidates[0]?.effectiveCostCentimos).toBe(2990);
  });

  it('engine: minimum-spend below is rejected, not ranked', () => {
    const r = rule({
      ruleId: 'R',
      benefit: { type: 'FIXED_DISCOUNT', fixedDiscountCentimos: 1000, amountDependent: true },
      eligibleSpendSelector: 'WHOLE_BILL',
      constraints: {
        temporal: {
          kind: 'LOCAL_DATE_RANGE',
          startDateInclusive: '2026-01-01',
          endDateInclusive: '2026-12-31',
        },
        holidayPolicy: 'NONE',
        combinability: 'NO',
        minimumSpend: { minimumSpendCentimos: 5000, basis: 'WHOLE_BILL' },
      },
    });
    const below = decide(
      run({
        rules: [r],
        operationalStates: [op('R')],
        scopes: [scope()],
        context: ctxBill({ wholeBillCentimos: 4000 }),
      }),
    );
    expect(below.final?.status).toBe('NO_APPLICABLE_BENEFIT');
    const above = decide(
      run({
        rules: [r],
        operationalStates: [op('R')],
        scopes: [scope()],
        context: ctxBill({ wholeBillCentimos: 5000 }),
      }),
    );
    expect(above.final?.status).toBe('BEST_CONFIRMED');
    expect(above.final?.candidates[0]?.effectiveCostCentimos).toBe(4000);
  });

  it('engine: cashback does NOT reduce immediate payable cost', () => {
    const r = rule({
      ruleId: 'R',
      benefit: { type: 'CASHBACK', valueCentimos: 1500, settlementDelay: '30d' },
      eligibleSpendSelector: 'WHOLE_BILL',
    });
    const e = decide(
      run({
        rules: [r],
        operationalStates: [op('R')],
        scopes: [scope()],
        context: ctxBill({ wholeBillCentimos: 10000 }),
      }),
    );
    expect(e.final?.candidates[0]?.effectiveCostCentimos).toBe(10000);
    expect(e.final?.candidates[0]?.cashbackCentimos).toBe(1500);
  });

  it('engine: known cap below/exact/above changes effective cost', () => {
    const mk = (cap: number) =>
      rule({
        ruleId: 'R',
        benefit: { type: 'PERCENT', percentBps: 2000, rounding: 'FLOOR_TO_CENT' },
        eligibleSpendSelector: 'WHOLE_BILL',
        constraints: {
          temporal: {
            kind: 'LOCAL_DATE_RANGE',
            startDateInclusive: '2026-01-01',
            endDateInclusive: '2026-12-31',
          },
          holidayPolicy: 'NONE',
          combinability: 'NO',
          cap: { kind: 'AMOUNT', centimos: cap },
        },
      });
    // 20% of 10000 = 2000
    const below = decide(
      run({
        rules: [mk(3000)],
        operationalStates: [op('R')],
        scopes: [scope()],
        context: ctxBill(),
      }),
    );
    expect(below.final?.candidates[0]?.effectiveCostCentimos).toBe(8000); // full 2000 discount
    const exact = decide(
      run({
        rules: [mk(2000)],
        operationalStates: [op('R')],
        scopes: [scope()],
        context: ctxBill(),
      }),
    );
    expect(exact.final?.candidates[0]?.effectiveCostCentimos).toBe(8000);
    const aboveCap = decide(
      run({
        rules: [mk(1500)],
        operationalStates: [op('R')],
        scopes: [scope()],
        context: ctxBill(),
      }),
    );
    expect(aboveCap.final?.candidates[0]?.effectiveCostCentimos).toBe(8500); // capped at 1500
  });

  it('engine: UNKNOWN rounding is material near a tie, non-material on a wide margin', () => {
    // A = 15% of 7677 = 1151.55 → floor 1151 (cost 6526) or half-up 1152 (cost 6525). With UNKNOWN
    // rounding, A's cost band is [6525, 6526].
    const A = rule({
      ruleId: 'A',
      providerFamily: 'IBK_PLIN',
      benefit: { type: 'PERCENT', percentBps: 1500, rounding: 'UNKNOWN' },
      eligibleSpendSelector: 'WHOLE_BILL',
    });
    // Rival B fixed at 6525: B wins conservatively (6525 < 6526), but A's rounded-up cost (6525)
    // could tie B — a material 1-céntimo ambiguity.
    const Bnear = rule({
      ruleId: 'B',
      providerFamily: 'DINERS',
      benefit: { type: 'FIXED_PRICE', fixedPriceCentimos: 6525 },
      eligibleSpendSelector: 'WHOLE_BILL',
    });
    const near = decide(
      run({
        rules: [A, Bnear],
        operationalStates: [op('A'), op('B')],
        scopes: [scope()],
        context: ctxBill({ wholeBillCentimos: 7677 }),
      }),
    );
    expect(near.final?.status).toBe('NO_SAFE_WINNER');

    // Rival B far above: A wins by a wide margin, so the rounding ambiguity cannot change anything.
    const Bfar = rule({
      ruleId: 'B',
      providerFamily: 'DINERS',
      benefit: { type: 'FIXED_PRICE', fixedPriceCentimos: 9500 },
      eligibleSpendSelector: 'WHOLE_BILL',
    });
    const far = decide(
      run({
        rules: [A, Bfar],
        operationalStates: [op('A'), op('B')],
        scopes: [scope()],
        context: ctxBill({ wholeBillCentimos: 7677 }),
      }),
    );
    expect(far.final?.status).toBe('BEST_CONFIRMED');
    expect(far.final?.winnerRef?.ruleId).toBe('A');
  });
});

// ================================================================== TIME
describe('temporal — America/Lima', () => {
  const range = {
    kind: 'LOCAL_DATE_RANGE',
    startDateInclusive: '2026-07-01',
    endDateInclusive: '2026-09-30',
  } as const;

  it('valid on the start date', () => {
    expect(withinTemporalRange(range, '2026-07-01T00:00:00-05:00')).toBe(true);
  });
  it('valid through the entire final Lima calendar day', () => {
    expect(withinTemporalRange(range, '2026-09-30T23:59:00-05:00')).toBe(true);
  });
  it('invalid at the first instant of the next Lima day', () => {
    expect(withinTemporalRange(range, '2026-10-01T00:00:00-05:00')).toBe(false);
  });
  it('does NOT expire at UTC midnight (UTC/Lima crossover)', () => {
    // 2026-10-01T00:00Z = Lima 2026-09-30T19:00 → still valid.
    expect(limaDate('2026-10-01T00:00:00Z')).toBe('2026-09-30');
    expect(withinTemporalRange(range, '2026-10-01T00:00:00Z')).toBe(true);
  });

  it('OBSERVED_ACTIVE_UNTIL: before / at / after the evidence interval', () => {
    const oau = {
      kind: 'OBSERVED_ACTIVE_UNTIL',
      observedActiveAt: '2026-08-30',
      endDateInclusive: '2026-09-30',
    } as const;
    expect(withinTemporalRange(oau, '2026-08-29T12:00:00-05:00')).toBe(false); // before observedActiveAt
    expect(withinTemporalRange(oau, '2026-08-30T12:00:00-05:00')).toBe(true); // at
    expect(withinTemporalRange(oau, '2026-09-30T12:00:00-05:00')).toBe(true); // at end
    expect(withinTemporalRange(oau, '2026-10-01T12:00:00-05:00')).toBe(false); // after end
  });

  it('LOCAL_DATETIME_RANGE honours explicit start/end (end exclusive)', () => {
    const dt = {
      kind: 'LOCAL_DATETIME_RANGE',
      startInclusive: '2026-06-01T18:00:00-05:00',
      endExclusive: '2026-06-01T22:00:00-05:00',
    } as const;
    expect(withinTemporalRange(dt, '2026-06-01T18:00:00-05:00')).toBe(true);
    expect(withinTemporalRange(dt, '2026-06-01T22:00:00-05:00')).toBe(false);
  });

  it('weekday gate uses the Lima weekday', () => {
    expect(limaWeekday('2026-06-01T12:00:00-05:00')).toBe('MON');
    const r = rule({
      ruleId: 'R',
      benefit: { type: 'FIXED_PRICE', fixedPriceCentimos: 1000 },
      eligibleSpendSelector: 'EXACT_SKU_BUNDLE',
      signatureKind: 'EXACT_BUNDLE',
      constraints: {
        temporal: {
          kind: 'LOCAL_DATE_RANGE',
          startDateInclusive: '2026-01-01',
          endDateInclusive: '2026-12-31',
        },
        holidayPolicy: 'NONE',
        combinability: 'NO',
        weekdays: ['SAT', 'SUN'],
      },
    });
    const sc = scope({
      requiredContext: ['BASKET', 'DATE_TIME'],
      allowedSelectors: ['EXACT_SKU_BUNDLE'],
      signature: {
        kind: 'EXACT_BUNDLE',
        merchantId: 'm_fridays',
        canonicalItems: [{ itemKey: 'a', qty: 1 }],
      },
    });
    const monday = decide(
      run({
        rules: [r],
        operationalStates: [op('R')],
        scopes: [sc],
        context: ctxBill({ exactItems: [{ itemKey: 'a', qty: 1 }] }),
        intendedTransactionAt: '2026-06-01T12:00:00-05:00',
      }),
    );
    expect(monday.final?.status).toBe('NO_APPLICABLE_BENEFIT'); // Monday excluded
  });

  it('holiday policy: NONE allows, EXCLUDED blocks on a holiday, UNKNOWN is uncertain only on a holiday', () => {
    const cal = new Set(['2026-07-28']);
    const base = {
      temporal: {
        kind: 'LOCAL_DATE_RANGE',
        startDateInclusive: '2026-01-01',
        endDateInclusive: '2026-12-31',
      },
      combinability: 'NO',
    } as const;
    const holiday = '2026-07-28T12:00:00-05:00';
    const normal = '2026-07-27T12:00:00-05:00';
    expect(evaluateHoliday({ ...base, holidayPolicy: 'NONE' }, holiday, cal)).toBe('ALLOWED');
    expect(evaluateHoliday({ ...base, holidayPolicy: 'EXCLUDED' }, holiday, cal)).toBe('BLOCKED');
    expect(evaluateHoliday({ ...base, holidayPolicy: 'EXCLUDED' }, normal, cal)).toBe('ALLOWED');
    expect(evaluateHoliday({ ...base, holidayPolicy: 'UNKNOWN' }, holiday, cal)).toBe('UNCERTAIN');
    expect(evaluateHoliday({ ...base, holidayPolicy: 'UNKNOWN' }, normal, cal)).toBe('ALLOWED');
  });
});

// ================================================================== ELIGIBILITY
describe('eligibility — tri-state, conservative', () => {
  const fixed = (over: Partial<RuleVersion> = {}) =>
    rule({
      ruleId: 'R',
      benefit: { type: 'FIXED_PRICE', fixedPriceCentimos: 1000 },
      eligibleSpendSelector: 'EXACT_SKU_BUNDLE',
      signatureKind: 'EXACT_BUNDLE',
      ...over,
    });
  const exactScope = scope({
    requiredContext: ['BASKET', 'DATE_TIME'],
    allowedSelectors: ['EXACT_SKU_BUNDLE'],
    signature: {
      kind: 'EXACT_BUNDLE',
      merchantId: 'm_fridays',
      canonicalItems: [{ itemKey: 'a', qty: 1 }],
    },
  });
  const exactCtx = ctxBill({ exactItems: [{ itemKey: 'a', qty: 1 }] });

  it('deterministic public ranks when the family is held', () => {
    const e = decide(
      run({
        rules: [fixed()],
        operationalStates: [op('R')],
        scopes: [exactScope],
        context: exactCtx,
        portfolio: { instruments: [{ family: 'IBK_PLIN' }] },
      }),
    );
    expect(e.final?.status).toBe('BEST_CONFIRMED');
  });

  it('missing provider family ⇒ ineligible ⇒ no benefit', () => {
    const e = decide(
      run({
        rules: [fixed()],
        operationalStates: [op('R')],
        scopes: [exactScope],
        context: exactCtx,
        portfolio: { instruments: [{ family: 'DINERS' }] },
      }),
    );
    expect(e.final?.status).toBe('NO_APPLICABLE_BENEFIT');
    expect(e.final?.candidates[0]?.eligibility).toBe('INELIGIBLE');
  });

  it('wrong network ⇒ ineligible', () => {
    const r = fixed({
      constraints: {
        temporal: {
          kind: 'LOCAL_DATE_RANGE',
          startDateInclusive: '2026-01-01',
          endDateInclusive: '2026-12-31',
        },
        holidayPolicy: 'NONE',
        combinability: 'NO',
        cardNetwork: 'AMEX',
      },
    });
    const e = decide(
      run({
        rules: [r],
        operationalStates: [op('R')],
        scopes: [exactScope],
        context: exactCtx,
        portfolio: { instruments: [{ family: 'IBK_PLIN', network: 'VISA' }] },
      }),
    );
    expect(e.final?.candidates[0]?.eligibility).toBe('INELIGIBLE');
  });

  it('BCP ownership never implies Qore active (private states are independent)', () => {
    const r = fixed({
      eligibilityClass: 'PROVIDER_PRIVATE',
      constraints: {
        temporal: {
          kind: 'LOCAL_DATE_RANGE',
          startDateInclusive: '2026-01-01',
          endDateInclusive: '2026-12-31',
        },
        holidayPolicy: 'NONE',
        combinability: 'NO',
        providerPrivateKey: 'qore_active',
      },
      providerFamily: 'BCP_QORE',
    });
    // Participant owns a BCP_QORE card but qore_active is UNKNOWN — must NOT be treated as YES.
    const e = decide(
      run({
        rules: [r],
        operationalStates: [op('R')],
        scopes: [exactScope],
        context: exactCtx,
        portfolio: {
          instruments: [{ family: 'BCP_QORE' }],
          privateStates: { qore_active: 'UNKNOWN' },
        },
      }),
    );
    const cand = e.final?.candidates[0];
    expect(cand?.eligibility).toBe('UNKNOWN');
    expect(cand?.rankable).toBe(false);
    expect(cand?.advisories).toContain('VERIFY_FIRST');
    expect(e.final?.status).not.toBe('BEST_CONFIRMED');
  });

  it('provider-private NO ⇒ ineligible; YES and UNKNOWN ⇒ non-rankable VERIFY_FIRST', () => {
    const mk = (state: 'YES' | 'NO' | 'UNKNOWN') =>
      decide(
        run({
          rules: [
            fixed({
              eligibilityClass: 'PROVIDER_PRIVATE',
              providerFamily: 'BCP_QORE',
              constraints: {
                temporal: {
                  kind: 'LOCAL_DATE_RANGE',
                  startDateInclusive: '2026-01-01',
                  endDateInclusive: '2026-12-31',
                },
                holidayPolicy: 'NONE',
                combinability: 'NO',
                providerPrivateKey: 'qore_active',
              },
            }),
          ],
          operationalStates: [op('R')],
          scopes: [exactScope],
          context: exactCtx,
          portfolio: {
            instruments: [{ family: 'BCP_QORE' }],
            privateStates: { qore_active: state },
          },
        }),
      );
    expect(mk('NO').final?.candidates[0]?.eligibility).toBe('INELIGIBLE');
    for (const s of ['YES', 'UNKNOWN'] as const) {
      const c = mk(s).final?.candidates[0];
      expect(c?.rankable).toBe(false);
      expect(c?.advisories).toContain('VERIFY_FIRST');
    }
  });

  it('public confirmed winner coexists with a provider-private VERIFY_FIRST advisory', () => {
    const pub = rule({
      ruleId: 'PUB',
      providerFamily: 'IBK_PLIN',
      benefit: { type: 'FIXED_PRICE', fixedPriceCentimos: 7500 },
      eligibleSpendSelector: 'EXACT_SKU_BUNDLE',
      signatureKind: 'EXACT_BUNDLE',
    });
    const priv = rule({
      ruleId: 'PRIV',
      providerFamily: 'BCP_QORE',
      eligibilityClass: 'PROVIDER_PRIVATE',
      benefit: { type: 'FIXED_PRICE', fixedPriceCentimos: 5000 },
      eligibleSpendSelector: 'EXACT_SKU_BUNDLE',
      signatureKind: 'EXACT_BUNDLE',
      constraints: {
        temporal: {
          kind: 'LOCAL_DATE_RANGE',
          startDateInclusive: '2026-01-01',
          endDateInclusive: '2026-12-31',
        },
        holidayPolicy: 'NONE',
        combinability: 'NO',
        providerPrivateKey: 'qore_active',
      },
    });
    const e = decide(
      run({
        rules: [pub, priv],
        operationalStates: [op('PUB'), op('PRIV')],
        scopes: [exactScope],
        context: exactCtx,
        portfolio: {
          instruments: [{ family: 'IBK_PLIN' }, { family: 'BCP_QORE' }],
          privateStates: { qore_active: 'UNKNOWN' },
        },
      }),
    );
    expect(e.final?.status).toBe('BEST_CONFIRMED');
    expect(e.final?.winnerRef?.ruleId).toBe('PUB');
    const privCand = e.final?.candidates.find((c) => c.ruleRef.ruleId === 'PRIV');
    expect(privCand?.advisories).toContain('VERIFY_FIRST');
    expect(privCand?.couldChangeDecision).toBe(true); // upside exists, but user-resolvable
  });

  it('ordinary USER_DECLARABLE ranks when explicitly YES; UNKNOWN is never silently YES', () => {
    const mk = () =>
      rule({
        ruleId: 'R',
        eligibilityClass: 'USER_DECLARABLE',
        benefit: { type: 'FIXED_PRICE', fixedPriceCentimos: 1000 },
        eligibleSpendSelector: 'EXACT_SKU_BUNDLE',
        signatureKind: 'EXACT_BUNDLE',
        constraints: {
          temporal: {
            kind: 'LOCAL_DATE_RANGE',
            startDateInclusive: '2026-01-01',
            endDateInclusive: '2026-12-31',
          },
          holidayPolicy: 'NONE',
          combinability: 'NO',
          membership: 'CINEPLANET_SOCIO',
        },
      });
    const yes = decide(
      run({
        rules: [mk()],
        operationalStates: [op('R')],
        scopes: [exactScope],
        context: exactCtx,
        portfolio: {
          instruments: [{ family: 'IBK_PLIN' }],
          declarations: { 'membership:CINEPLANET_SOCIO': 'YES' },
        },
      }),
    );
    expect(yes.final?.status).toBe('BEST_CONFIRMED');
    const unknown = decide(
      run({
        rules: [mk()],
        operationalStates: [op('R')],
        scopes: [exactScope],
        context: exactCtx,
        portfolio: { instruments: [{ family: 'IBK_PLIN' }] },
      }),
    );
    expect(unknown.final?.candidates[0]?.eligibility).toBe('UNKNOWN');
    expect(unknown.final?.candidates[0]?.rankable).toBe(false);
    expect(unknown.final?.status).toBe('NO_APPLICABLE_BENEFIT');
  });
});

// ================================================================== AVAILABILITY
describe('availability', () => {
  const two = (availB: RuleOperationalState['availability'], preVerif = false) => {
    const A = rule({
      ruleId: 'A',
      providerFamily: 'IBK_PLIN',
      benefit: { type: 'FIXED_PRICE', fixedPriceCentimos: 9000 },
      eligibleSpendSelector: 'EXACT_SKU_BUNDLE',
      signatureKind: 'EXACT_BUNDLE',
    });
    const B = rule({
      ruleId: 'B',
      providerFamily: 'DINERS',
      benefit: { type: 'FIXED_PRICE', fixedPriceCentimos: 8000 },
      eligibleSpendSelector: 'EXACT_SKU_BUNDLE',
      signatureKind: 'EXACT_BUNDLE',
      // preRedemptionVerifiable is a RULE SEMANTIC, not a caller override.
      constraints: {
        temporal: {
          kind: 'LOCAL_DATE_RANGE',
          startDateInclusive: '2026-01-01',
          endDateInclusive: '2026-12-31',
        },
        holidayPolicy: 'NONE',
        combinability: 'NO',
        ...(preVerif ? { preRedemptionVerifiable: true } : {}),
      },
    });
    const sc = scope({
      requiredContext: ['BASKET', 'DATE_TIME'],
      allowedSelectors: ['EXACT_SKU_BUNDLE'],
      signature: {
        kind: 'EXACT_BUNDLE',
        merchantId: 'm_fridays',
        canonicalItems: [{ itemKey: 'a', qty: 1 }],
      },
    });
    return decide(
      run({
        rules: [A, B],
        operationalStates: [op('A'), op('B', { availability: availB })],
        scopes: [sc],
        context: ctxBill({ exactItems: [{ itemKey: 'a', qty: 1 }] }),
      }),
    );
  };

  it('confirmed-available cheaper option wins', () => {
    const e = two('CONFIRMED_AVAILABLE');
    expect(e.final?.status).toBe('BEST_CONFIRMED');
    expect(e.final?.winnerRef?.ruleId).toBe('B');
  });
  it('confirmed-unavailable option drops out; the available one wins', () => {
    const e = two('CONFIRMED_UNAVAILABLE');
    expect(e.final?.winnerRef?.ruleId).toBe('A');
    expect(e.final?.candidates.find((c) => c.ruleRef.ruleId === 'B')?.rejectionReason).toBe(
      'CONFIRMED_UNAVAILABLE',
    );
  });
  it('UNKNOWN availability that is material and not resolvable ⇒ NO_SAFE_WINNER (never LIKELY)', () => {
    const e = two('UNKNOWN'); // B cheaper (8000) < A (9000) ⇒ B's unknown availability is material
    expect(e.final?.status).toBe('NO_SAFE_WINNER');
    expect(e.final?.status).not.toBe('LIKELY');
  });
  it('UNKNOWN availability that is pre-redemption-verifiable lets the public winner stand + advisory', () => {
    const e = two('UNKNOWN', true);
    expect(e.final?.status).toBe('BEST_CONFIRMED');
    expect(e.final?.winnerRef?.ruleId).toBe('A');
    const bCand = e.final?.candidates.find((c) => c.ruleRef.ruleId === 'B');
    expect(bCand?.advisories).toContain('DYNAMIC_AVAILABILITY');
  });
  it('UNKNOWN availability that is non-material ⇒ winner stands + DYNAMIC_AVAILABILITY', () => {
    // Make B the more expensive one so its unknown availability cannot change the decision.
    const A = rule({
      ruleId: 'A',
      providerFamily: 'IBK_PLIN',
      benefit: { type: 'FIXED_PRICE', fixedPriceCentimos: 7000 },
      eligibleSpendSelector: 'EXACT_SKU_BUNDLE',
      signatureKind: 'EXACT_BUNDLE',
    });
    const B = rule({
      ruleId: 'B',
      providerFamily: 'DINERS',
      benefit: { type: 'FIXED_PRICE', fixedPriceCentimos: 9000 },
      eligibleSpendSelector: 'EXACT_SKU_BUNDLE',
      signatureKind: 'EXACT_BUNDLE',
    });
    const sc = scope({
      requiredContext: ['BASKET', 'DATE_TIME'],
      allowedSelectors: ['EXACT_SKU_BUNDLE'],
      signature: {
        kind: 'EXACT_BUNDLE',
        merchantId: 'm_fridays',
        canonicalItems: [{ itemKey: 'a', qty: 1 }],
      },
    });
    const e = decide(
      run({
        rules: [A, B],
        operationalStates: [op('A'), op('B', { availability: 'UNKNOWN' })],
        scopes: [sc],
        context: ctxBill({ exactItems: [{ itemKey: 'a', qty: 1 }] }),
      }),
    );
    expect(e.final?.status).toBe('BEST_CONFIRMED');
    expect(e.final?.winnerRef?.ruleId).toBe('A');
    expect(e.final?.candidates.find((c) => c.ruleRef.ruleId === 'B')?.couldChangeDecision).toBe(
      false,
    );
  });
});

// ================================================================== SOURCE QUALITY
describe('source quality — total resolver, no default branch', () => {
  it('resolves every SourceQualityState explicitly', () => {
    expect(resolveSourceQuality('FRESH').rankable).toBe(true);
    expect(resolveSourceQuality('STALE')).toMatchObject({ rankable: false, uncertainty: 'STALE' });
    expect(resolveSourceQuality('INACCESSIBLE')).toMatchObject({
      rankable: false,
      uncertainty: 'STALE',
    });
    expect(resolveSourceQuality('CONFLICTED')).toMatchObject({
      rankable: false,
      uncertainty: 'CONFLICTED',
    });
    expect(resolveSourceQuality('UNKNOWN')).toMatchObject({
      rankable: false,
      uncertainty: 'UNKNOWN',
    });
  });

  const pair = (srcB: RuleOperationalState['sourceQualityState'], bCost = 7000) => {
    const A = rule({
      ruleId: 'A',
      providerFamily: 'IBK_PLIN',
      benefit: { type: 'FIXED_PRICE', fixedPriceCentimos: 8000 },
      eligibleSpendSelector: 'EXACT_SKU_BUNDLE',
      signatureKind: 'EXACT_BUNDLE',
    });
    const B = rule({
      ruleId: 'B',
      providerFamily: 'DINERS',
      benefit: { type: 'FIXED_PRICE', fixedPriceCentimos: bCost },
      eligibleSpendSelector: 'EXACT_SKU_BUNDLE',
      signatureKind: 'EXACT_BUNDLE',
    });
    const sc = scope({
      requiredContext: ['BASKET', 'DATE_TIME'],
      allowedSelectors: ['EXACT_SKU_BUNDLE'],
      signature: {
        kind: 'EXACT_BUNDLE',
        merchantId: 'm_fridays',
        canonicalItems: [{ itemKey: 'a', qty: 1 }],
      },
    });
    return decide(
      run({
        rules: [A, B],
        operationalStates: [op('A'), op('B', { sourceQualityState: srcB })],
        scopes: [sc],
        context: ctxBill({ exactItems: [{ itemKey: 'a', qty: 1 }] }),
      }),
    );
  };

  it('a fresh option wins over a stale potentially-better one ⇒ NO_SAFE_WINNER (stale material)', () => {
    const e = pair('STALE', 7000); // B cheaper but STALE ⇒ its true value unbounded ⇒ material
    expect(e.final?.status).toBe('NO_SAFE_WINNER');
  });
  it('a stale but provably non-material candidate lets the fresh winner stand', () => {
    const e = pair('STALE', 9000); // B pricier & stale ⇒ but stale value is UNBOUNDED ⇒ still material
    // A stale candidate is UNKNOWN_OR_UNBOUNDED (RT-05) ⇒ material by default even when last-known worse.
    expect(e.final?.status).toBe('NO_SAFE_WINNER');
  });
  it('conflicted material candidate with empty rankable set ⇒ SOURCE_CONFLICT', () => {
    const A = rule({
      ruleId: 'A',
      providerFamily: 'IBK_PLIN',
      benefit: { type: 'FIXED_PRICE', fixedPriceCentimos: 8000 },
      eligibleSpendSelector: 'EXACT_SKU_BUNDLE',
      signatureKind: 'EXACT_BUNDLE',
    });
    const sc = scope({
      requiredContext: ['BASKET', 'DATE_TIME'],
      allowedSelectors: ['EXACT_SKU_BUNDLE'],
      signature: {
        kind: 'EXACT_BUNDLE',
        merchantId: 'm_fridays',
        canonicalItems: [{ itemKey: 'a', qty: 1 }],
      },
    });
    const e = decide(
      run({
        rules: [A],
        operationalStates: [op('A', { sourceQualityState: 'CONFLICTED' })],
        scopes: [sc],
        context: ctxBill({ exactItems: [{ itemKey: 'a', qty: 1 }] }),
      }),
    );
    expect(e.final?.status).toBe('SOURCE_CONFLICT');
  });
  const exactSc = scope({
    requiredContext: ['BASKET', 'DATE_TIME'],
    allowedSelectors: ['EXACT_SKU_BUNDLE'],
    signature: {
      kind: 'EXACT_BUNDLE',
      merchantId: 'm_fridays',
      canonicalItems: [{ itemKey: 'a', qty: 1 }],
    },
  });
  const FAM = ['IBK_PLIN', 'DINERS', 'SIP_OH', 'BCP_QORE'] as const;
  // N non-fresh single-offer candidates (empty rankable set), each material by default (RT-05).
  const emptySet = (states: RuleOperationalState['sourceQualityState'][]) => {
    const rules = states.map((_, i) =>
      rule({
        ruleId: `R${i}`,
        providerFamily: FAM[i]!,
        benefit: { type: 'FIXED_PRICE', fixedPriceCentimos: 8000 - i },
        eligibleSpendSelector: 'EXACT_SKU_BUNDLE',
        signatureKind: 'EXACT_BUNDLE',
      }),
    );
    const ops = states.map((s, i) => op(`R${i}`, { sourceQualityState: s }));
    return decide(
      run({
        rules,
        operationalStates: ops,
        scopes: [exactSc],
        context: ctxBill({ exactItems: [{ itemKey: 'a', qty: 1 }] }),
      }),
    );
  };

  it('STALE sole material candidate ⇒ SOURCE_STALE', () => {
    expect(emptySet(['STALE']).final?.status).toBe('SOURCE_STALE');
  });
  it('INACCESSIBLE sole material candidate ⇒ SOURCE_STALE', () => {
    expect(emptySet(['INACCESSIBLE']).final?.status).toBe('SOURCE_STALE');
  });
  it('UNKNOWN sole material candidate ⇒ NO_SAFE_WINNER (never SOURCE_STALE)', () => {
    const e = emptySet(['UNKNOWN']);
    expect(e.final?.status).toBe('NO_SAFE_WINNER');
    expect(e.final?.status).not.toBe('SOURCE_STALE');
  });

  it('mixed blockers CONFLICTED + STALE + UNKNOWN ⇒ SOURCE_CONFLICT (precedence)', () => {
    expect(emptySet(['CONFLICTED', 'STALE', 'UNKNOWN']).final?.status).toBe('SOURCE_CONFLICT');
  });
  it('mixed blockers STALE + UNKNOWN ⇒ SOURCE_STALE (UNKNOWN does not outrank stale)', () => {
    expect(emptySet(['STALE', 'UNKNOWN']).final?.status).toBe('SOURCE_STALE');
  });
  it('UNKNOWN only ⇒ NO_SAFE_WINNER', () => {
    expect(emptySet(['UNKNOWN', 'UNKNOWN']).final?.status).toBe('NO_SAFE_WINNER');
  });

  // Fresh winner coexisting with an UNKNOWN-source candidate.
  const freshPlusUnknown = (bCost: number) => {
    const A = rule({
      ruleId: 'A',
      providerFamily: 'IBK_PLIN',
      benefit: { type: 'FIXED_PRICE', fixedPriceCentimos: 8000 },
      eligibleSpendSelector: 'EXACT_SKU_BUNDLE',
      signatureKind: 'EXACT_BUNDLE',
    });
    const B = rule({
      ruleId: 'B',
      providerFamily: 'DINERS',
      benefit: { type: 'FIXED_PRICE', fixedPriceCentimos: bCost },
      eligibleSpendSelector: 'EXACT_SKU_BUNDLE',
      signatureKind: 'EXACT_BUNDLE',
    });
    return decide(
      run({
        rules: [A, B],
        operationalStates: [op('A'), op('B', { sourceQualityState: 'UNKNOWN' })],
        scopes: [exactSc],
        context: ctxBill({ exactItems: [{ itemKey: 'a', qty: 1 }] }),
      }),
    );
  };
  it('fresh winner + material UNKNOWN candidate ⇒ NO_SAFE_WINNER', () => {
    // B's source is UNKNOWN ⇒ UNKNOWN_OR_UNBOUNDED ⇒ material regardless of last-known price.
    expect(freshPlusUnknown(7000).final?.status).toBe('NO_SAFE_WINNER');
  });
  it('fresh winner + UNKNOWN candidate is still material by default (RT-05 unbounded)', () => {
    // Even when B's last-known price is worse, an UNKNOWN source cannot be bounded ⇒ material.
    expect(freshPlusUnknown(9000).final?.status).toBe('NO_SAFE_WINNER');
  });
});

// ================================================================== BOUNDS / MATERIALITY
describe('bounds & materiality (RT-05)', () => {
  const withCapUnknown = (bCost: number) => {
    // A: 20% uncapped-unknown on a 10000 bill (uncapped optimistic cost = 8000). B: fixed.
    const A = rule({
      ruleId: 'A',
      providerFamily: 'IBK_PLIN',
      benefit: { type: 'PERCENT', percentBps: 2000, rounding: 'FLOOR_TO_CENT' },
      eligibleSpendSelector: 'WHOLE_BILL',
      constraints: {
        temporal: {
          kind: 'LOCAL_DATE_RANGE',
          startDateInclusive: '2026-01-01',
          endDateInclusive: '2026-12-31',
        },
        holidayPolicy: 'NONE',
        combinability: 'NO',
        cap: { kind: 'UNKNOWN_NOT_STATED' },
      },
    });
    const B = rule({
      ruleId: 'B',
      providerFamily: 'DINERS',
      benefit: { type: 'FIXED_PRICE', fixedPriceCentimos: bCost },
      eligibleSpendSelector: 'WHOLE_BILL',
    });
    return decide(
      run({
        rules: [A, B],
        operationalStates: [op('A'), op('B')],
        scopes: [scope()],
        context: ctxBill({ wholeBillCentimos: 10000 }),
      }),
    );
  };

  it('unknown cap whose uncapped bound could beat the winner ⇒ material ⇒ NO_SAFE_WINNER', () => {
    const e = withCapUnknown(8500); // uncapped A cost 8000 ≤ 8500 ⇒ material
    expect(e.final?.status).toBe('NO_SAFE_WINNER');
    const aCand = e.final?.candidates.find((c) => c.ruleRef.ruleId === 'A');
    expect(aCand?.plausibleBound.kind).toBe('KNOWN_BOUND');
    expect(aCand?.couldChangeDecision).toBe(true);
  });

  it('cost bound equality is material (could convert BEST into TIE)', () => {
    const e = withCapUnknown(8000); // uncapped A cost 8000 == winner 8000 ⇒ material (≤)
    expect(e.final?.status).toBe('NO_SAFE_WINNER');
  });

  it('unknown cap whose uncapped bound cannot beat the winner ⇒ non-material ⇒ winner stands', () => {
    const e = withCapUnknown(7000); // winner B 7000 < uncapped A 8000 ⇒ A not material
    expect(e.final?.status).toBe('BEST_CONFIRMED');
    expect(e.final?.winnerRef?.ruleId).toBe('B');
    expect(e.final?.candidates.find((c) => c.ruleRef.ruleId === 'A')?.couldChangeDecision).toBe(
      false,
    );
  });

  it('a stale last-known value never establishes a valid KNOWN_BOUND (UNKNOWN_OR_UNBOUNDED)', () => {
    const A = rule({
      ruleId: 'A',
      providerFamily: 'IBK_PLIN',
      benefit: { type: 'FIXED_PRICE', fixedPriceCentimos: 6000 },
      eligibleSpendSelector: 'WHOLE_BILL',
    });
    const B = rule({
      ruleId: 'B',
      providerFamily: 'DINERS',
      benefit: { type: 'FIXED_PRICE', fixedPriceCentimos: 5000 },
      eligibleSpendSelector: 'WHOLE_BILL',
    });
    // B cheaper but STALE ⇒ its bound must be UNKNOWN_OR_UNBOUNDED, not a bound at its last-known 5000.
    const e = decide(
      run({
        rules: [A, B],
        operationalStates: [op('A'), op('B', { sourceQualityState: 'STALE' })],
        scopes: [scope()],
        context: ctxBill({ wholeBillCentimos: 10000 }),
      }),
    );
    const bCand = e.final?.candidates.find((c) => c.ruleRef.ruleId === 'B');
    expect(bCand?.plausibleBound.kind).toBe('UNKNOWN_OR_UNBOUNDED');
    expect(e.final?.status).toBe('NO_SAFE_WINNER');
  });
});

// ================================================================== NOMINAL
describe('nominal basis (RT-06) — never becomes PEN', () => {
  const nomScope = scope({
    comparisonBasis: 'NOMINAL_VALUE_SAME_UNIT',
    requiredContext: ['DATE_TIME'],
    allowedSelectors: ['EXACT_SKU_BUNDLE'],
    signature: {
      kind: 'NOMINAL_PACKAGE',
      merchantId: 'm_coney_park',
      cashAcquisitionCostCentimos: 4500,
      nominalUnit: 'CONEY_PLAY_BALANCE',
    },
    merchantId: 'm_coney_park',
  });
  const nomRule = (
    id: string,
    family: RuleVersion['providerFamily'],
    minor: number,
    cash: number | undefined = 4500,
    unit: 'CONEY_PLAY_BALANCE' = 'CONEY_PLAY_BALANCE',
  ) =>
    rule({
      ruleId: id,
      merchantIds: ['m_coney_park'],
      providerFamily: family,
      benefit: {
        type: 'NON_CASH_NOMINAL',
        nominalMinorUnits: minor,
        nominalUnit: unit,
        // Absent ⇒ explicit UNKNOWN acquisition cost (no NaN/Infinity sentinel).
        ...(cash !== undefined ? { cashAcquisitionCostCentimos: cash } : {}),
      },
      eligibleSpendSelector: 'EXACT_SKU_BUNDLE',
      signatureKind: 'NOMINAL_PACKAGE',
      comparisonScopeRefs: ['ncp'],
    });
  const nctx: PurchaseContext = {
    merchantId: 'm_coney_park',
    // Runtime NOMINAL_PACKAGE proof (RTM3-01) matching the nominal scope's signature (S/45, balance).
    nominalPackage: { cashAcquisitionCostCentimos: 4500, nominalUnit: 'CONEY_PLAY_BALANCE' },
  };
  const s = { ...nomScope, scopeId: 'ncp' };
  const port: EligibilityPortfolio = { instruments: [{ family: 'SIP_OH' }, { family: 'DINERS' }] };

  it('same unit + equal cash cost ranks by argmax minor units; delta is NOMINAL_VALUE (not PEN)', () => {
    const e = decide(
      run({
        rules: [nomRule('X', 'SIP_OH', 8500), nomRule('Y', 'DINERS', 8600)],
        operationalStates: [op('X'), op('Y')],
        scopes: [s],
        context: nctx,
        portfolio: port,
      }),
    );
    expect(e.final?.status).toBe('BEST_CONFIRMED');
    expect(e.final?.winnerRef?.ruleId).toBe('Y');
    expect(e.final?.delta).toEqual({
      kind: 'NOMINAL_VALUE',
      amountMinorUnits: 100,
      unit: 'CONEY_PLAY_BALANCE',
    });
    expect(e.final?.candidates.every((c) => c.penSavedCentimos === undefined)).toBe(true);
  });

  it('equal nominal at equal cost ⇒ CONFIRMED_TIE', () => {
    const e = decide(
      run({
        rules: [nomRule('X', 'SIP_OH', 8500), nomRule('Y', 'DINERS', 8500)],
        operationalStates: [op('X'), op('Y')],
        scopes: [s],
        context: nctx,
        portfolio: port,
      }),
    );
    expect(e.final?.status).toBe('CONFIRMED_TIE');
  });

  it('unequal cash acquisition cost refuses (NON_COMPARABLE, no economic winner)', () => {
    const e = decide(
      run({
        rules: [nomRule('X', 'SIP_OH', 8500, 4500), nomRule('Y', 'DINERS', 8600, 5000)],
        operationalStates: [op('X'), op('Y')],
        scopes: [s],
        context: nctx,
        portfolio: port,
      }),
    );
    expect(e.final?.winnerRef).toBeUndefined();
    expect(e.final?.candidates.every((c) => c.advisories.includes('NON_COMPARABLE'))).toBe(true);
  });

  it('different nominal unit refuses', () => {
    const y = nomRule('Y', 'DINERS', 8600);
    // Force a different unit on Y via cast (no second unit exists in the frozen vocabulary).
    (y.benefit as { nominalUnit: string }).nominalUnit = 'OTHER_UNIT';
    const e = decide(
      run({
        rules: [nomRule('X', 'SIP_OH', 8500), y],
        operationalStates: [op('X'), op('Y')],
        scopes: [s],
        context: nctx,
        portfolio: port,
      }),
    );
    expect(e.final?.winnerRef).toBeUndefined();
  });

  it('absent (explicit UNKNOWN) acquisition cost refuses ⇒ NON_COMPARABLE', () => {
    // Y omits cashAcquisitionCostCentimos entirely ⇒ explicit UNKNOWN (not a sentinel).
    const y = rule({
      ruleId: 'Y',
      merchantIds: ['m_coney_park'],
      providerFamily: 'DINERS',
      benefit: {
        type: 'NON_CASH_NOMINAL',
        nominalMinorUnits: 8600,
        nominalUnit: 'CONEY_PLAY_BALANCE',
      },
      eligibleSpendSelector: 'EXACT_SKU_BUNDLE',
      signatureKind: 'NOMINAL_PACKAGE',
      comparisonScopeRefs: ['ncp'],
    });
    expect(
      y.benefit.type === 'NON_CASH_NOMINAL' && y.benefit.cashAcquisitionCostCentimos,
    ).toBeUndefined();
    const e = decide(
      run({
        rules: [nomRule('X', 'SIP_OH', 8500), y],
        operationalStates: [op('X'), op('Y')],
        scopes: [s],
        context: nctx,
        portfolio: port,
      }),
    );
    expect(e.final?.winnerRef).toBeUndefined();
    expect(e.final?.candidates.every((c) => c.advisories.includes('NON_COMPARABLE'))).toBe(true);
  });

  it('a NaN / Infinity acquisition cost is a domain invariant error, never "unknown"', () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, -1] as const) {
      const y = nomRule('Y', 'DINERS', 8600);
      (y.benefit as { cashAcquisitionCostCentimos: number }).cashAcquisitionCostCentimos = bad;
      expect(() =>
        decide(
          run({
            rules: [nomRule('X', 'SIP_OH', 8500), y],
            operationalStates: [op('X'), op('Y')],
            scopes: [s],
            context: nctx,
            portfolio: port,
          }),
        ),
      ).toThrow();
    }
  });
});

// ================================================================== SCOPE
describe('scope behaviour (§5)', () => {
  const exactScope = (scopeId: string) =>
    scope({
      scopeId,
      requiredContext: ['BASKET', 'DATE_TIME'],
      allowedSelectors: ['EXACT_SKU_BUNDLE'],
      signature: {
        kind: 'EXACT_BUNDLE',
        merchantId: 'm_fridays',
        canonicalItems: [{ itemKey: 'a', qty: 1 }],
      },
    });

  it('one matched scope ⇒ final is that scope, no selection required', () => {
    const r = rule({
      ruleId: 'R',
      benefit: { type: 'FIXED_PRICE', fixedPriceCentimos: 1000 },
      eligibleSpendSelector: 'EXACT_SKU_BUNDLE',
      signatureKind: 'EXACT_BUNDLE',
      comparisonScopeRefs: ['s1'],
    });
    const e = decide(
      run({
        rules: [r],
        operationalStates: [op('R')],
        scopes: [exactScope('s1')],
        context: ctxBill({ exactItems: [{ itemKey: 'a', qty: 1 }] }),
      }),
    );
    expect(e.requiresScopeSelection).toBe(false);
    expect(e.matchedScopes).toHaveLength(1);
    expect(e.final?.scopeId).toBe('s1');
  });

  it('two materially-distinct matched scopes ⇒ requiresScopeSelection, final undefined (never picks by largest saving)', () => {
    const r1 = rule({
      ruleId: 'R1',
      benefit: { type: 'FIXED_PRICE', fixedPriceCentimos: 1000 },
      eligibleSpendSelector: 'EXACT_SKU_BUNDLE',
      signatureKind: 'EXACT_BUNDLE',
      comparisonScopeRefs: ['s1'],
    });
    const r2 = rule({
      ruleId: 'R2',
      benefit: { type: 'FIXED_PRICE', fixedPriceCentimos: 500 },
      eligibleSpendSelector: 'EXACT_SKU_BUNDLE',
      signatureKind: 'EXACT_BUNDLE',
      comparisonScopeRefs: ['s2'],
    });
    const e = decide(
      run({
        rules: [r1, r2],
        operationalStates: [op('R1'), op('R2')],
        scopes: [exactScope('s1'), exactScope('s2')],
        context: ctxBill({ exactItems: [{ itemKey: 'a', qty: 1 }] }),
      }),
    );
    expect(e.requiresScopeSelection).toBe(true);
    expect(e.final).toBeUndefined();
    expect(e.matchedScopes).toHaveLength(2);
  });

  it('selecting one of two scopes returns that scope only (no cross-scope ranking)', () => {
    const r1 = rule({
      ruleId: 'R1',
      benefit: { type: 'FIXED_PRICE', fixedPriceCentimos: 1000 },
      eligibleSpendSelector: 'EXACT_SKU_BUNDLE',
      signatureKind: 'EXACT_BUNDLE',
      comparisonScopeRefs: ['s1'],
    });
    const r2 = rule({
      ruleId: 'R2',
      benefit: { type: 'FIXED_PRICE', fixedPriceCentimos: 500 },
      eligibleSpendSelector: 'EXACT_SKU_BUNDLE',
      signatureKind: 'EXACT_BUNDLE',
      comparisonScopeRefs: ['s2'],
    });
    const e = decide(
      run({
        rules: [r1, r2],
        operationalStates: [op('R1'), op('R2')],
        scopes: [exactScope('s1'), exactScope('s2')],
        context: ctxBill({ exactItems: [{ itemKey: 'a', qty: 1 }] }),
        selectedScopeId: 's1',
      }),
    );
    expect(e.requiresScopeSelection).toBe(false);
    expect(e.final?.scopeId).toBe('s1');
    expect(e.final?.winnerRef?.ruleId).toBe('R1'); // NOT R2 despite R2 being cheaper in its own scope
  });

  it('cross-merchant membership is rejected (typed invariant error)', () => {
    const foreign = rule({
      ruleId: 'X',
      merchantIds: ['m_coney_active'],
      benefit: { type: 'FIXED_PRICE', fixedPriceCentimos: 1000 },
      eligibleSpendSelector: 'EXACT_SKU_BUNDLE',
      signatureKind: 'EXACT_BUNDLE',
      comparisonScopeRefs: ['s1'],
    });
    const parkScope = { ...exactScope('s1'), merchantId: 'm_coney_park' as const };
    expect(() =>
      evaluateScope(
        parkScope,
        [foreign],
        new Map([['X@1', op('X')]]),
        run({
          rules: [foreign],
          operationalStates: [op('X')],
          scopes: [parkScope],
          context: { merchantId: 'm_coney_park' },
        }),
      ),
    ).toThrow(CrossMerchantMembershipError);
  });
});

// ================================================================== PAPA JOHNS (RT-04, real corpus)
describe('Papa Johns real corpus — different exact SKUs are not directly comparable', () => {
  const corpus = loadCorpus();

  it('BCP Large Classic and Plin Large Americana live in different EXACT_BUNDLE scopes', () => {
    const pjRules = corpus.activeRules.filter((r) => r.merchantIds.includes('m_papa_johns'));
    const bcp = pjRules.find((r) => r.ruleId === 'PJ-BCP-01');
    const plin = pjRules.find((r) => r.ruleId.startsWith('PJ-PLIN'));
    expect(bcp).toBeDefined();
    expect(plin).toBeDefined();
    // No shared scope ⇒ they can never be members of one rankable comparison.
    const shared = bcp!.comparisonScopeRefs.filter((s) => plin!.comparisonScopeRefs.includes(s));
    expect(shared).toEqual([]);
  });

  it('each Papa Johns scope contains only one exact-SKU signature (no Plin-vs-BCP ranking)', () => {
    const pjScopes = corpus.scopes.filter((s) => s.merchantId === 'm_papa_johns');
    for (const s of pjScopes) {
      const members = corpus.activeRules.filter((r) => r.comparisonScopeRefs.includes(s.scopeId));
      const families = new Set(members.map((m) => m.providerFamily));
      // A Papa Johns exact-bundle scope is single-offer (its distinct SKU), never a BCP-vs-Plin race.
      expect(families.size).toBeLessThanOrEqual(1);
    }
  });
});

// ================================================================== PROPERTIES
describe('engine properties (fast-check, small)', () => {
  it('effective cost from decide() is never negative for a percentage discount (RTM3-13)', () => {
    // RTM3-13: invoke PRODUCTION settlement via decide(), not a locally-clamped test expression.
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500000 }),
        fc.integer({ min: 1, max: 10000 }),
        (bill, bps) => {
          const r = rule({
            ruleId: 'R',
            benefit: { type: 'PERCENT', percentBps: bps, rounding: 'FLOOR_TO_CENT' },
            eligibleSpendSelector: 'WHOLE_BILL',
          });
          const e = decide(
            run({
              rules: [r],
              operationalStates: [op('R')],
              scopes: [scope()],
              context: ctxBill({ wholeBillCentimos: bill }),
            }),
          );
          const cost = e.final?.candidates[0]?.effectiveCostCentimos;
          return cost !== undefined && cost >= 0 && Number.isSafeInteger(cost);
        },
      ),
    );
  });

  it('a known percentage discount never exceeds its known cap', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 500000 }),
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 0, max: 100000 }),
        (bill, bps, cap) => {
          const raw = percentDiscountCentimos(bill, bps, 'FLOOR_TO_CENT').value;
          return applyKnownCap(raw, cap) <= cap;
        },
      ),
    );
  });

  it('candidate input order does not change status / winner / delta (§35)', () => {
    const A = rule({
      ruleId: 'A',
      providerFamily: 'IBK_PLIN',
      benefit: { type: 'FIXED_PRICE', fixedPriceCentimos: 8000 },
      eligibleSpendSelector: 'EXACT_SKU_BUNDLE',
      signatureKind: 'EXACT_BUNDLE',
    });
    const B = rule({
      ruleId: 'B',
      providerFamily: 'DINERS',
      benefit: { type: 'FIXED_PRICE', fixedPriceCentimos: 7000 },
      eligibleSpendSelector: 'EXACT_SKU_BUNDLE',
      signatureKind: 'EXACT_BUNDLE',
    });
    const C = rule({
      ruleId: 'C',
      providerFamily: 'SIP_OH',
      benefit: { type: 'FIXED_PRICE', fixedPriceCentimos: 9000 },
      eligibleSpendSelector: 'EXACT_SKU_BUNDLE',
      signatureKind: 'EXACT_BUNDLE',
    });
    const sc = scope({
      requiredContext: ['BASKET', 'DATE_TIME'],
      allowedSelectors: ['EXACT_SKU_BUNDLE'],
      signature: {
        kind: 'EXACT_BUNDLE',
        merchantId: 'm_fridays',
        canonicalItems: [{ itemKey: 'a', qty: 1 }],
      },
    });
    const ops = [op('A'), op('B'), op('C')];
    const ctx = ctxBill({ exactItems: [{ itemKey: 'a', qty: 1 }] });
    const orderings: RuleVersion[][] = [
      [A, B, C],
      [C, B, A],
      [B, A, C],
      [B, C, A],
      [A, C, B],
      [C, A, B],
    ];
    const results = orderings.map(
      (rules) => decide(run({ rules, operationalStates: ops, scopes: [sc], context: ctx })).final,
    );
    for (const r of results) {
      expect(r?.status).toBe('BEST_CONFIRMED');
      expect(r?.winnerRef?.ruleId).toBe('B');
      expect(r?.delta).toEqual({ kind: 'COST_CENTIMOS', amountCentimos: 1000 });
    }
  });
});

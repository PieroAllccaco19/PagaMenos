// PagaMenos · M3 adversarial + status/advisory truth-table suite. Deterministic targeted
// regressions for the specific ways a plausible-but-wrong recommendation could be produced (§22),
// plus the decision-status vs candidate-advisory truth table (§23). All synthetic inputs are
// TEST-ONLY (outside Corpus v1).
import { describe, expect, it } from 'vitest';

import type { RuleVersion } from '@/corpus';
import { decide } from '../decide';
import { SettlementInvariantError } from '../errors';
import type { DecideInput, EligibilityPortfolio, PurchaseContext } from '../types';
import { costScope, fixedRule, nominalRule, nominalScope, percentRule, synOp } from './synthetic';

const AT = '2026-09-01T12:00:00-05:00';
const ALL: EligibilityPortfolio = {
  instruments: [
    { family: 'IBK_PLIN' },
    { family: 'DINERS' },
    { family: 'BCP_QORE' },
    { family: 'SIP_OH' },
  ],
};
const bundleCtx = (over: Partial<PurchaseContext> = {}): PurchaseContext => ({
  merchantId: 'm_fridays',
  exactItems: [{ itemKey: 'syn_item', qty: 1 }],
  wholeBillCentimos: 10000,
  ...over,
});
const runCost = (
  rules: RuleVersion[],
  ops: DecideInput['operationalStates'],
  over: Partial<DecideInput> = {},
) =>
  decide({
    rules,
    operationalStates: ops,
    scopes: [costScope()],
    portfolio: ALL,
    context: bundleCtx(),
    evaluatedAt: AT,
    intendedTransactionAt: AT,
    ...over,
  }).final;
const cand = (f: ReturnType<typeof runCost>, id: string) =>
  f?.candidates.find((c) => c.ruleRef.ruleId === id);

// ============================================================ ADVERSARIAL (§22)
describe('ADV — false winner from input order', () => {
  it('the cheapest candidate wins even when a pricier rule is first in the array', () => {
    const pricey = fixedRule('Z-PRICEY', 'IBK_PLIN', 9000);
    const cheap = fixedRule('A-CHEAP', 'DINERS', 3000);
    // Pricey rule deliberately placed first; A-CHEAP also sorts first by id — neither position wins it.
    const f = runCost([pricey, cheap], [synOp('Z-PRICEY'), synOp('A-CHEAP')]);
    expect(f?.winnerRef?.ruleId).toBe('A-CHEAP');
    const g = runCost([cheap, pricey], [synOp('A-CHEAP'), synOp('Z-PRICEY')]);
    expect(g?.winnerRef?.ruleId).toBe('A-CHEAP');
  });
});

describe('ADV — false tie from rounding', () => {
  it('a material 1-céntimo rounding ambiguity is NOT confirmed as a tie or a best', () => {
    // 15% of 7677 = 1151.55 → floor 1151 (cost 6526) / half-up 1152 (cost 6525). UNKNOWN rounding.
    const A = percentRule('A', 'IBK_PLIN', 1500, {
      selector: 'WHOLE_BILL',
      signatureKind: 'ELIGIBLE_BILL',
    });
    (A.benefit as { rounding: string }).rounding = 'UNKNOWN';
    const B = fixedRule('B', 'DINERS', 6525, {
      selector: 'WHOLE_BILL',
      signatureKind: 'ELIGIBLE_BILL',
    });
    const f = runCost([A, B], [synOp('A'), synOp('B')], {
      context: bundleCtx({ wholeBillCentimos: 7677 }),
    });
    expect(f?.status).toBe('NO_SAFE_WINNER');
    expect(f?.status).not.toBe('CONFIRMED_TIE');
    expect(f?.status).not.toBe('BEST_CONFIRMED');
  });
});

describe('ADV — false winner from unknown cap', () => {
  it('an unknown cap whose uncapped bound could beat the winner blocks confirmation', () => {
    const A = percentRule('A', 'IBK_PLIN', 2000, {
      selector: 'WHOLE_BILL',
      signatureKind: 'ELIGIBLE_BILL',
      cap: { kind: 'UNKNOWN_NOT_STATED' },
    });
    const B = fixedRule('B', 'DINERS', 8500, {
      selector: 'WHOLE_BILL',
      signatureKind: 'ELIGIBLE_BILL',
    });
    const f = runCost([A, B], [synOp('A'), synOp('B')], {
      context: bundleCtx({ wholeBillCentimos: 10000 }),
    });
    expect(f?.status).toBe('NO_SAFE_WINNER'); // uncapped A optimistic 8000 < 8500 ⇒ material
    expect(cand(f, 'A')?.advisories).toContain('UNKNOWN_CAP');
    expect(cand(f, 'A')?.couldChangeDecision).toBe(true);
  });
});

describe('ADV — false winner from stale last-known value', () => {
  it('a stale last-known S/100 price cannot prove current cost ≥ S/100 (bound is UNBOUNDED)', () => {
    const A = fixedRule('A', 'IBK_PLIN', 6000); // fresh, cheaper last-known
    const B = fixedRule('B', 'DINERS', 10000); // last-known S/100 but STALE
    const f = runCost([A, B], [synOp('A'), synOp('B', { sourceQualityState: 'STALE' })]);
    expect(cand(f, 'B')?.plausibleBound.kind).toBe('UNKNOWN_OR_UNBOUNDED');
    // B's true current value is unknowable ⇒ it stays material ⇒ A is NOT falsely confirmed.
    expect(f?.status).toBe('NO_SAFE_WINNER');
  });
});

describe('ADV — false winner from missing basket', () => {
  it('missing material basket context is not silently assumed favorable', () => {
    const A = fixedRule('A', 'IBK_PLIN', 9000); // known winner
    const B = percentRule('B', 'DINERS', 5000, {
      selector: 'FOOD_ONLY',
      signatureKind: 'ELIGIBLE_BILL',
    });
    // foodCentimos deliberately omitted ⇒ B's basket is missing ⇒ its value is unbounded.
    const f = runCost([A, B], [synOp('A'), synOp('B')], {
      context: {
        merchantId: 'm_fridays',
        exactItems: [{ itemKey: 'syn_item', qty: 1 }],
        wholeBillCentimos: 10000,
      },
    });
    expect(cand(f, 'B')?.advisories).toContain('MISSING_CONTEXT');
    expect(f?.status).toBe('NO_SAFE_WINNER');
  });
});

describe('ADV — cross-scope high saving cannot hijack the selected scope', () => {
  it('a blockbuster candidate in another scope leaves the selected scope untouched', () => {
    const scA = costScope('scA');
    const scB = costScope('scB');
    const A1 = fixedRule('A1', 'IBK_PLIN', 5000, { scopeRefs: ['scA'] });
    const A2 = fixedRule('A2', 'DINERS', 6000, { scopeRefs: ['scA'] });
    const B = fixedRule('B', 'SIP_OH', 1, { scopeRefs: ['scB'] });
    const f = decide({
      rules: [A1, A2, B],
      operationalStates: [synOp('A1'), synOp('A2'), synOp('B')],
      scopes: [scA, scB],
      portfolio: ALL,
      context: bundleCtx(),
      evaluatedAt: AT,
      intendedTransactionAt: AT,
      selectedScopeId: 'scA',
    }).final;
    expect(f?.scopeId).toBe('scA');
    expect(f?.winnerRef?.ruleId).toBe('A1');
    expect(f?.delta).toEqual({ kind: 'COST_CENTIMOS', amountCentimos: 1000 });
  });
});

describe('ADV — private Qore YES stays advisory', () => {
  it('a provider-private YES never becomes a confirmed winner', () => {
    const pub = fixedRule('PUB', 'IBK_PLIN', 9000);
    const priv = fixedRule('PRIV', 'BCP_QORE', 3000, {
      eligibilityClass: 'PROVIDER_PRIVATE',
      providerPrivateKey: 'qore_active',
    });
    const f = decide({
      rules: [pub, priv],
      operationalStates: [synOp('PUB'), synOp('PRIV')],
      scopes: [costScope()],
      portfolio: { ...ALL, privateStates: { qore_active: 'YES' } },
      context: bundleCtx(),
      evaluatedAt: AT,
      intendedTransactionAt: AT,
    }).final;
    expect(f?.status).toBe('BEST_CONFIRMED');
    expect(f?.winnerRef?.ruleId).toBe('PUB');
    expect(cand(f, 'PRIV')?.advisories).toContain('VERIFY_FIRST');
    expect(cand(f, 'PRIV')?.rankable).toBe(false);
  });
});

describe('ADV — source UNKNOWN yields NO_SAFE_WINNER (never SOURCE_STALE)', () => {
  it('a sole material UNKNOWN-source candidate maps to NO_SAFE_WINNER', () => {
    const A = fixedRule('A', 'IBK_PLIN', 5000);
    const f = runCost([A], [synOp('A', { sourceQualityState: 'UNKNOWN' })]);
    expect(f?.status).toBe('NO_SAFE_WINNER');
    expect(f?.status).not.toBe('SOURCE_STALE');
  });
});

describe('ADV — nominal: same unit + unequal cash cost cannot just maximize nominal value', () => {
  it('unequal acquisition cost ⇒ NON_COMPARABLE (no winner)', () => {
    const f = decide({
      rules: [
        nominalRule('X', 'SIP_OH', 8500, 4500, { merchantIds: ['m_coney_park'] }),
        nominalRule('Y', 'DINERS', 9000, 5000, { merchantIds: ['m_coney_park'] }),
      ],
      operationalStates: [
        synOp('X', { availability: 'NOT_APPLICABLE' }),
        synOp('Y', { availability: 'NOT_APPLICABLE' }),
      ],
      scopes: [nominalScope()],
      portfolio: ALL,
      context: {
        merchantId: 'm_coney_park',
        nominalPackage: { cashAcquisitionCostCentimos: 4500, nominalUnit: 'CONEY_PLAY_BALANCE' },
      },
      evaluatedAt: AT,
      intendedTransactionAt: AT,
    }).final;
    expect(f?.winnerRef).toBeUndefined();
    expect(f?.candidates.every((c) => c.advisories.includes('NON_COMPARABLE'))).toBe(true);
  });
});

describe('ADV — nominal: different units cannot be compared', () => {
  it('two different nominal units ⇒ no winner', () => {
    const y = nominalRule('Y', 'DINERS', 9000, 4500, { merchantIds: ['m_coney_park'] });
    (y.benefit as { nominalUnit: string }).nominalUnit = 'OTHER_UNIT';
    const f = decide({
      rules: [nominalRule('X', 'SIP_OH', 8500, 4500, { merchantIds: ['m_coney_park'] }), y],
      operationalStates: [
        synOp('X', { availability: 'NOT_APPLICABLE' }),
        synOp('Y', { availability: 'NOT_APPLICABLE' }),
      ],
      scopes: [nominalScope()],
      portfolio: ALL,
      context: {
        merchantId: 'm_coney_park',
        nominalPackage: { cashAcquisitionCostCentimos: 4500, nominalUnit: 'CONEY_PLAY_BALANCE' },
      },
      evaluatedAt: AT,
      intendedTransactionAt: AT,
    }).final;
    expect(f?.winnerRef).toBeUndefined();
  });
});

describe('ADV — non-finite / negative money fails closed', () => {
  const nomWithCost = (bad: number) => {
    const y = nominalRule('Y', 'DINERS', 9000, 4500, { merchantIds: ['m_coney_park'] });
    (y.benefit as { cashAcquisitionCostCentimos: number }).cashAcquisitionCostCentimos = bad;
    return () =>
      decide({
        rules: [nominalRule('X', 'SIP_OH', 8500, 4500, { merchantIds: ['m_coney_park'] }), y],
        operationalStates: [
          synOp('X', { availability: 'NOT_APPLICABLE' }),
          synOp('Y', { availability: 'NOT_APPLICABLE' }),
        ],
        scopes: [nominalScope()],
        portfolio: ALL,
        context: {
          merchantId: 'm_coney_park',
          nominalPackage: { cashAcquisitionCostCentimos: 4500, nominalUnit: 'CONEY_PLAY_BALANCE' },
        },
        evaluatedAt: AT,
        intendedTransactionAt: AT,
      });
  };

  it('NaN / Infinity / negative nominal acquisition cost throws, never propagates a winner', () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, -1]) {
      expect(nomWithCost(bad)).toThrow(SettlementInvariantError);
    }
  });

  it('a NaN / negative bill into a percentage discount throws (fail-closed settlement)', () => {
    const A = percentRule('A', 'IBK_PLIN', 2000, {
      selector: 'WHOLE_BILL',
      signatureKind: 'ELIGIBLE_BILL',
    });
    for (const bad of [Number.NaN, -100]) {
      expect(() =>
        runCost([A], [synOp('A')], { context: bundleCtx({ wholeBillCentimos: bad }) }),
      ).toThrow(SettlementInvariantError);
    }
  });
});

// ============================================================ STATUS / ADVISORY TRUTH TABLE (§23)
describe('TRUTH TABLE — decision status is distinct from candidate advisory', () => {
  const pubPlusPrivate = (qore: 'YES' | 'NO' | 'UNKNOWN', includePublic: boolean) => {
    const rules: RuleVersion[] = [];
    const ops: DecideInput['operationalStates'] = [];
    if (includePublic) {
      rules.push(fixedRule('PUB', 'IBK_PLIN', 9000));
      ops.push(synOp('PUB'));
    }
    rules.push(
      fixedRule('PRIV', 'BCP_QORE', 3000, {
        eligibilityClass: 'PROVIDER_PRIVATE',
        providerPrivateKey: 'qore_active',
      }),
    );
    ops.push(synOp('PRIV'));
    return decide({
      rules,
      operationalStates: ops,
      scopes: [costScope()],
      portfolio: { ...ALL, privateStates: { qore_active: qore } },
      context: bundleCtx(),
      evaluatedAt: AT,
      intendedTransactionAt: AT,
    }).final;
  };

  it('T1: public safe winner + private VERIFY_FIRST ⇒ public BEST_CONFIRMED + private advisory', () => {
    const f = pubPlusPrivate('UNKNOWN', true);
    expect(f?.status).toBe('BEST_CONFIRMED');
    expect(f?.winnerRef?.ruleId).toBe('PUB');
    expect(cand(f, 'PRIV')?.advisories).toContain('VERIFY_FIRST');
  });

  it('T2: no safe public candidate + sole private verify path ⇒ VERIFY_FIRST', () => {
    const f = pubPlusPrivate('UNKNOWN', false);
    expect(f?.status).toBe('VERIFY_FIRST');
    expect(f?.winnerRef).toBeUndefined();
  });

  it('T3: public winner + non-material uncertain candidate ⇒ winner stands + advisory', () => {
    // The engine's RT-05 conservatism makes every STALE candidate UNBOUNDED ⇒ always material, so a
    // genuinely NON-material uncertain candidate is demonstrated via a pricier unknown-availability
    // candidate (its bound is its own FRESH cost, strictly worse than the winner ⇒ non-material).
    const A = fixedRule('A', 'IBK_PLIN', 7000); // winner
    const B = fixedRule('B', 'DINERS', 9000); // pricier, availability UNKNOWN
    const f = runCost([A, B], [synOp('A'), synOp('B', { availability: 'UNKNOWN' })]);
    expect(f?.status).toBe('BEST_CONFIRMED');
    expect(f?.winnerRef?.ruleId).toBe('A');
    expect(cand(f, 'B')?.advisories).toContain('DYNAMIC_AVAILABILITY');
    expect(cand(f, 'B')?.couldChangeDecision).toBe(false);
    // Corollary: a STALE candidate really is always material (bound UNBOUNDED) — no non-material stale.
    const g = runCost(
      [A, fixedRule('B', 'DINERS', 12000)],
      [synOp('A'), synOp('B', { sourceQualityState: 'STALE' })],
    );
    expect(cand(g, 'B')?.plausibleBound.kind).toBe('UNKNOWN_OR_UNBOUNDED');
    expect(g?.status).toBe('NO_SAFE_WINNER');
  });

  it('T4: public winner + material stale candidate ⇒ NO_SAFE_WINNER', () => {
    const A = fixedRule('A', 'IBK_PLIN', 9000);
    const B = fixedRule('B', 'DINERS', 5000); // cheaper last-known but STALE ⇒ material
    const f = runCost([A, B], [synOp('A'), synOp('B', { sourceQualityState: 'STALE' })]);
    expect(f?.status).toBe('NO_SAFE_WINNER');
    expect(cand(f, 'B')?.advisories).toContain('STALE_CANDIDATE');
  });
});

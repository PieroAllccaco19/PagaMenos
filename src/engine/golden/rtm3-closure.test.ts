// PagaMenos · M3 red-team CLOSURE regressions (RTM3-01/04/05/06/07/10/11). Exact counterexamples
// that must fail-closed: runtime PurchaseSignature enforcement, monetary validation, canonical
// identity, strict instants, provider-scoped eligibility, and combined-uncertainty resolvability.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { RuleOperationalState, RuleVersion } from '@/corpus';
import { decide } from '../decide';
import { CanonicalInputError, SettlementInvariantError, TemporalInputError } from '../errors';
import { percentDiscountCentimos } from '../money';
import type { DecideInput, EligibilityPortfolio, PurchaseContext } from '../types';
import {
  candidate,
  exactItemsOf,
  finalOf,
  frozenRule,
  frozenScope,
  opState,
  PORTFOLIO_ALL,
  runGolden,
} from './harness';
import { billScope, costScope, fixedRule, percentRule, synOp } from './synthetic';

const AT = '2026-09-01T12:00:00-05:00';

// ============================================================ RTM3-01 signature enforcement
describe('RTM3-01 — runtime PurchaseSignature enforcement (a boolean cannot prove the bundle)', () => {
  const bcp = frozenRule('POP-BCP-01');
  const sip = frozenRule('POP-SIP-02');
  const popScope = frozenScope('sc_pop_6pcs_family_potato');
  const popCase = (exactItems: PurchaseContext['exactItems']) =>
    finalOf({
      rules: [bcp, sip],
      operationalStates: [
        opState('POP-BCP-01', { availability: 'CONFIRMED_AVAILABLE' }),
        opState('POP-SIP-02', { availability: 'CONFIRMED_AVAILABLE' }),
      ],
      scopes: [popScope],
      context: { merchantId: 'm_popeyes', channel: 'SALON', ...(exactItems ? { exactItems } : {}) },
      intendedTransactionAt: AT,
    });

  it('exact bundle FALSE: runtime items ≠ the 6pcs+family-potato signature ⇒ no Popeyes winner', () => {
    // 5 pieces instead of 6 — a different bundle entirely.
    const f = popCase([
      { itemKey: 'pop_chicken_piece', qty: 5 },
      { itemKey: 'pop_family_potato', qty: 1 },
    ]);
    expect(f?.status).not.toBe('BEST_CONFIRMED');
    expect(f?.winnerRef).toBeUndefined();
    expect(candidate(f, 'POP-SIP-02')?.rankable).toBe(false);
    expect(candidate(f, 'POP-SIP-02')?.rejectionReason).toContain('scope not applicable');
  });

  it('missing exact-bundle evidence ⇒ MISSING_CONTEXT / non-rankable (never confirmed)', () => {
    const f = popCase(undefined);
    expect(f?.status).not.toBe('BEST_CONFIRMED');
    expect(candidate(f, 'POP-SIP-02')?.rankable).toBe(false);
    expect(candidate(f, 'POP-SIP-02')?.advisories).toContain('MISSING_CONTEXT');
  });

  it('exact bundle TRUE (the real 6pcs+family-potato items) ⇒ ranks normally', () => {
    const f = popCase(exactItemsOf(popScope));
    expect(f?.status).toBe('BEST_CONFIRMED');
    expect(f?.winnerRef?.ruleId).toBe('POP-SIP-02');
  });

  // ---- UVK tickets: count + class must match the signature before settlement ----
  const uvkIbk = frozenRule('UVK-IBK-01');
  const uvkDin = frozenRule('UVK-DIN-01');
  const uvkScope = frozenScope('sc_uvk_2tickets');
  const uvkCase = (over: Partial<PurchaseContext>) =>
    finalOf({
      rules: [uvkIbk, uvkDin],
      operationalStates: [
        opState('UVK-IBK-01', { availability: 'NOT_APPLICABLE' }),
        opState('UVK-DIN-01', { availability: 'NOT_APPLICABLE' }),
      ],
      scopes: [uvkScope],
      context: {
        merchantId: 'm_uvk',
        channel: 'BOX_OFFICE',
        branch: 'selected',
        ticketUnitPriceCentimos: 1800,
        ticketCount: 2,
        ticketClass: 'STANDARD',
        ...over,
      },
      intendedTransactionAt: '2026-09-02T12:00:00-05:00',
    });

  it('UVK ticket count 1 ⇒ the 2-ticket scope does NOT rank', () => {
    const f = uvkCase({ ticketCount: 1 });
    expect(f?.winnerRef).toBeUndefined();
    expect(candidate(f, 'UVK-IBK-01')?.rankable).toBe(false);
  });
  it('UVK ticket count 2 ⇒ valid', () => {
    expect(uvkCase({ ticketCount: 2 })?.status).toBe('BEST_CONFIRMED');
  });
  it('UVK ticket count 3 ⇒ the 2-ticket scope does NOT rank', () => {
    const f = uvkCase({ ticketCount: 3 });
    expect(f?.winnerRef).toBeUndefined();
    expect(candidate(f, 'UVK-IBK-01')?.rankable).toBe(false);
  });
  it('UVK wrong ticket class ⇒ no ranking', () => {
    const f = uvkCase({ ticketClass: 'VIP' });
    expect(f?.winnerRef).toBeUndefined();
    expect(candidate(f, 'UVK-IBK-01')?.rejectionReason).toContain('scope not applicable');
  });
  it('UVK missing material ticket class ⇒ MISSING_CONTEXT (non-rankable)', () => {
    const f = finalOf({
      rules: [uvkIbk, uvkDin],
      operationalStates: [
        opState('UVK-IBK-01', { availability: 'NOT_APPLICABLE' }),
        opState('UVK-DIN-01', { availability: 'NOT_APPLICABLE' }),
      ],
      scopes: [uvkScope],
      // ticketClass deliberately OMITTED (not present) ⇒ MISSING_CONTEXT.
      context: {
        merchantId: 'm_uvk',
        channel: 'BOX_OFFICE',
        branch: 'selected',
        ticketUnitPriceCentimos: 1800,
        ticketCount: 2,
      },
      intendedTransactionAt: '2026-09-02T12:00:00-05:00',
    });
    expect(candidate(f, 'UVK-IBK-01')?.rankable).toBe(false);
    expect(candidate(f, 'UVK-IBK-01')?.advisories).toContain('MISSING_CONTEXT');
  });

  it('SELECTED SCOPE SAFETY: a selected scope that does not match the purchase is not confirmed', () => {
    // Buy the Large Classic bundle but select the Large Americana scope ⇒ no BEST_CONFIRMED.
    const e = runGolden({
      rules: [frozenRule('PJ-PLIN-01')],
      operationalStates: [opState('PJ-PLIN-01', { availability: 'CONFIRMED_AVAILABLE' })],
      scopes: [frozenScope('sc_pj_large_classic'), frozenScope('sc_pj_large_americana')],
      context: {
        merchantId: 'm_papa_johns',
        channel: 'SALON',
        branch: 'miraflores',
        exactItems: exactItemsOf(frozenScope('sc_pj_large_classic')),
      },
      selectedScopeId: 'sc_pj_large_americana',
      intendedTransactionAt: AT,
    });
    expect(e.final?.status).not.toBe('BEST_CONFIRMED');
    expect(e.final?.winnerRef).toBeUndefined();
  });
});

// ============================================================ RTM3-04/11 monetary validation
describe('RTM3-04/11 — monetary input validation (fail closed, never a nonsensical winner)', () => {
  const percentCase = (ctx: Partial<PurchaseContext>) =>
    decide({
      rules: [percentRule('A', 'IBK_PLIN', 2000, { scopeRefs: ['syn_bill'] })],
      operationalStates: [synOp('A')],
      scopes: [billScope('syn_bill')],
      portfolio: PORTFOLIO_ALL,
      context: { merchantId: 'm_fridays', wholeBillCentimos: 10000, ...ctx },
      evaluatedAt: AT,
      intendedTransactionAt: AT,
    });

  it('subtotal inconsistency (wholeBill 1000, food 10000) fails closed — the Fridays counterexample', () => {
    expect(() => percentCase({ wholeBillCentimos: 1000, foodCentimos: 10000 })).toThrow(
      SettlementInvariantError,
    );
  });
  it('food + non-alcoholic exceeding the bill fails closed', () => {
    expect(() =>
      percentCase({
        wholeBillCentimos: 10000,
        foodCentimos: 7000,
        nonAlcoholicBeverageCentimos: 4000,
      }),
    ).toThrow(SettlementInvariantError);
  });
  for (const bad of [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    -100,
    1.5,
    Number.MAX_SAFE_INTEGER + 2,
  ]) {
    it(`a structurally invalid wholeBill (${bad}) is a typed rejection`, () => {
      expect(() => percentCase({ wholeBillCentimos: bad })).toThrow(SettlementInvariantError);
    });
  }
  it('percentBps > 10000 (a >100% discount) is a typed rejection', () => {
    expect(() => percentDiscountCentimos(10000, 10001, 'FLOOR_TO_CENT')).toThrow(
      SettlementInvariantError,
    );
  });
  it('a fixed discount larger than the bill (negative payable) fails closed — never clamps to 0', () => {
    const rule = fixedRule('A', 'IBK_PLIN', 0, { scopeRefs: ['syn_bill'] });
    rule.benefit = { type: 'FIXED_DISCOUNT', fixedDiscountCentimos: 20000, amountDependent: true };
    expect(() =>
      decide({
        rules: [rule],
        operationalStates: [synOp('A')],
        scopes: [billScope('syn_bill')],
        portfolio: PORTFOLIO_ALL,
        context: { merchantId: 'm_fridays', wholeBillCentimos: 10000 },
        evaluatedAt: AT,
        intendedTransactionAt: AT,
      }),
    ).toThrow(SettlementInvariantError);
  });

  it('BigInt oracle: percentage settlement is exact even for very large safe-integer bills', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
        fc.integer({ min: 1, max: 10000 }),
        (bill, bps) => {
          const got = percentDiscountCentimos(bill, bps, 'FLOOR_TO_CENT').value;
          const oracle = Number((BigInt(bill) * BigInt(bps)) / 10000n);
          return got === oracle && Number.isSafeInteger(got);
        },
      ),
      { numRuns: 1000 },
    );
  });
});

// ============================================================ RTM3-05 canonical identity
describe('RTM3-05 — canonical input identity (no last-write-wins, no silent drop)', () => {
  const chinawok = frozenRule('CW-PLIN-01');
  const scope = frozenScope('sc_cw_chijaukay_alopobre');
  const ctx: PurchaseContext = {
    merchantId: 'm_chinawok',
    channel: 'SALON',
    branch: 'miraflores',
    exactItems: exactItemsOf(scope),
  };
  const base: Omit<DecideInput, 'operationalStates'> = {
    rules: [chinawok],
    scopes: [scope],
    portfolio: PORTFOLIO_ALL,
    context: ctx,
    evaluatedAt: AT,
    intendedTransactionAt: AT,
  };
  const opA: RuleOperationalState = opState('CW-PLIN-01', { availability: 'CONFIRMED_AVAILABLE' });
  const opB: RuleOperationalState = opState('CW-PLIN-01', {
    availability: 'CONFIRMED_UNAVAILABLE',
    asOf: '2026-09-02T00:00:00-05:00',
  });

  it('duplicate operational state (both input orders) ⇒ typed rejection, not two different winners', () => {
    expect(() => decide({ ...base, operationalStates: [opA, opB] })).toThrow(CanonicalInputError);
    expect(() => decide({ ...base, operationalStates: [opB, opA] })).toThrow(CanonicalInputError);
  });
  it('missing operational state for an evaluated rule ⇒ typed rejection (not silent disappearance)', () => {
    expect(() => decide({ ...base, operationalStates: [] })).toThrow(CanonicalInputError);
  });
  it('duplicate rule identity ⇒ typed rejection (never a false CONFIRMED_TIE)', () => {
    expect(() =>
      decide({ ...base, rules: [chinawok, chinawok], operationalStates: [opA] }),
    ).toThrow(CanonicalInputError);
  });
  it('duplicate scopeId ⇒ typed rejection', () => {
    expect(() => decide({ ...base, scopes: [scope, scope], operationalStates: [opA] })).toThrow(
      CanonicalInputError,
    );
  });
  it('an operational state referencing no supplied rule ⇒ typed rejection', () => {
    expect(() => decide({ ...base, operationalStates: [opA, synOp('GHOST')] })).toThrow(
      CanonicalInputError,
    );
  });
});

// ============================================================ RTM3-06 strict instants
describe('RTM3-06 — strict ISO-8601 instant parsing (no permissive Date.parse)', () => {
  const withAt = (at: string) =>
    decide({
      rules: [fixedRule('A', 'IBK_PLIN', 1000)],
      operationalStates: [synOp('A')],
      scopes: [costScope()],
      portfolio: PORTFOLIO_ALL,
      context: { merchantId: 'm_fridays', exactItems: [{ itemKey: 'syn_item', qty: 1 }] },
      evaluatedAt: at,
      intendedTransactionAt: at,
    }).final;

  it('an impossible date (2026-02-30) is rejected', () => {
    expect(() => withAt('2026-02-30T00:00:00Z')).toThrow(TemporalInputError);
  });
  it('an offsetless date-only value (2026-09-01) is rejected', () => {
    expect(() => withAt('2026-09-01')).toThrow(TemporalInputError);
  });
  it('an offsetless date-time (2026-09-01T00:00:00) is rejected', () => {
    expect(() => withAt('2026-09-01T00:00:00')).toThrow(TemporalInputError);
  });
  it('an explicit-offset instant is valid', () => {
    expect(withAt('2026-09-01T00:00:00-05:00')?.status).toBeDefined();
  });
  it('a UTC (Z) instant is valid and 2026-09-01T05:00:00Z is 2026-09-01 00:00 Lima', () => {
    // Both valid; the Lima-transition boundary is exercised in the temporal unit tests.
    expect(withAt('2026-09-01T05:00:00Z')?.status).toBeDefined();
    expect(withAt('2026-09-01T04:59:59Z')?.status).toBeDefined();
  });
  it('a leap-day (2028-02-29) is accepted; a non-leap 2026-02-29 is rejected', () => {
    expect(withAt('2028-02-29T12:00:00Z')?.status).toBeDefined();
    expect(() => withAt('2026-02-29T12:00:00Z')).toThrow(TemporalInputError);
  });
});

// ============================================================ RTM3-07 provider-scoped eligibility
describe('RTM3-07 — network/tier facts stay associated with their provider', () => {
  // An IBK-family rule requiring AMEX.
  const amexScope = costScope('syn_amex');
  const amexRule = fixedRule('A', 'IBK_PLIN', 1000, {
    scopeRefs: ['syn_amex'],
    cardNetwork: 'AMEX',
  });
  const run = (portfolio: EligibilityPortfolio) =>
    finalOf({
      rules: [amexRule],
      operationalStates: [synOp('A')],
      scopes: [amexScope],
      portfolio,
      context: { merchantId: 'm_fridays', exactItems: [{ itemKey: 'syn_item', qty: 1 }] },
      intendedTransactionAt: AT,
    });

  it('IBK Visa + BCP AMEX ⇒ the IBK AMEX promotion is NOT eligible', () => {
    const f = run({
      instruments: [
        { family: 'IBK_PLIN', network: 'VISA' },
        { family: 'BCP_QORE', network: 'AMEX' },
      ],
    });
    expect(candidate(f, 'A')?.eligibility).toBe('INELIGIBLE');
  });
  it('adding a global-style AMEX declaration does NOT rescue the contradictory IBK Visa', () => {
    const f = run({
      instruments: [
        { family: 'IBK_PLIN', network: 'VISA' },
        { family: 'BCP_QORE', network: 'AMEX' },
      ],
      declarations: { 'network:AMEX': 'YES', 'network:IBK_PLIN:AMEX': 'YES' },
    });
    expect(candidate(f, 'A')?.eligibility).toBe('INELIGIBLE');
  });
  it('IBK AMEX + BCP Visa ⇒ the IBK AMEX promotion IS eligible', () => {
    const f = run({
      instruments: [
        { family: 'IBK_PLIN', network: 'AMEX' },
        { family: 'BCP_QORE', network: 'VISA' },
      ],
    });
    expect(f?.status).toBe('BEST_CONFIRMED');
    expect(candidate(f, 'A')?.eligibility).toBe('ELIGIBLE');
  });
  it('multiple same-family instruments where one qualifies ⇒ eligible', () => {
    const f = run({
      instruments: [
        { family: 'IBK_PLIN', network: 'VISA' },
        { family: 'IBK_PLIN', network: 'AMEX' },
      ],
    });
    expect(f?.status).toBe('BEST_CONFIRMED');
  });
});

// ============================================================ RTM3-10 combined uncertainty
describe('RTM3-10 — combined uncertainty is safely resolvable only if EVERY axis is', () => {
  const pair = (bOps: Partial<RuleOperationalState>, bPreVerif: boolean) => {
    const A = fixedRule('A', 'IBK_PLIN', 9000); // pricier, safe winner
    const B: RuleVersion = fixedRule('B', 'DINERS', 5000); // cheaper but uncertain
    if (bPreVerif) {
      B.constraints = { ...B.constraints, preRedemptionVerifiable: true };
    }
    return finalOf({
      rules: [A, B],
      operationalStates: [synOp('A'), synOp('B', bOps)],
      scopes: [costScope()],
      portfolio: PORTFOLIO_ALL,
      context: { merchantId: 'm_fridays', exactItems: [{ itemKey: 'syn_item', qty: 1 }] },
      intendedTransactionAt: AT,
    });
  };

  it('availability UNKNOWN (pre-verifiable) + source UNKNOWN ⇒ NO_SAFE_WINNER (source axis unresolvable)', () => {
    const f = pair({ availability: 'UNKNOWN', sourceQualityState: 'UNKNOWN' }, true);
    expect(f?.status).toBe('NO_SAFE_WINNER');
    // The candidate still carries an explicit reason (RTM3-25) — it never disappears silently.
    expect(candidate(f, 'B')?.rejectionReason).toBeDefined();
  });
  it('availability UNKNOWN (pre-verifiable) + source FRESH ⇒ winner stands + DYNAMIC_AVAILABILITY', () => {
    // Make B the pricier one so its resolvable availability uncertainty is non-material anyway.
    const A = fixedRule('A', 'IBK_PLIN', 5000);
    const B: RuleVersion = fixedRule('B', 'DINERS', 9000);
    B.constraints = { ...B.constraints, preRedemptionVerifiable: true };
    const f = finalOf({
      rules: [A, B],
      operationalStates: [synOp('A'), synOp('B', { availability: 'UNKNOWN' })],
      scopes: [costScope()],
      portfolio: PORTFOLIO_ALL,
      context: { merchantId: 'm_fridays', exactItems: [{ itemKey: 'syn_item', qty: 1 }] },
      intendedTransactionAt: AT,
    });
    expect(f?.status).toBe('BEST_CONFIRMED');
    expect(f?.winnerRef?.ruleId).toBe('A');
    expect(candidate(f, 'B')?.advisories).toContain('DYNAMIC_AVAILABILITY');
  });
});

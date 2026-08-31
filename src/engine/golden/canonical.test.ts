// PagaMenos · M3 canonical golden fixtures — FIX01..FIX12 + REG-PJ-CROSS-SKU + SYN-REGULAR-BASELINE.
//
// Each fixture asserts EXPLICIT economic facts (status, winner, effective cost, typed rank delta,
// advisories) against the FROZEN Corpus v1 rule semantics. Snapshots are NOT the oracle (§20/§28).
// Operational state (availability / source / publication) is supplied per fixture as the separate
// runtime axis (see harness.ts) — no corpus rule value is mutated.
import { describe, expect, it } from 'vitest';

import type { ComparisonScope, RuleOperationalState, RuleVersion } from '@/corpus';
import { decide } from '../decide';
import type { EligibilityPortfolio } from '../types';
import {
  candidate,
  exactItemsOf,
  finalOf,
  frozenExcluded,
  frozenRule,
  frozenScope,
  opState,
  runGolden,
  toInput,
} from './harness';

// A Tuesday inside every relevant campaign window; not in any test holiday calendar.
const TUE = '2026-09-01T12:00:00-05:00';
// A Wednesday (UVK Diners requires WED among MON/WED/THU/FRI).
const WED = '2026-09-02T12:00:00-05:00';
// A Sunday (weekend) — Diners weekday-restricted rules drop out.
const SUN = '2026-09-06T12:00:00-05:00';

// ============================================================ FIX01 — Chinawok simple winner
describe('FIX01 — Chinawok chijaukay a lo pobre + drink: Plin beats Sip on out-of-pocket cost', () => {
  const plin = frozenRule('CW-PLIN-01'); // fixed bundle S/15.90
  const sip = frozenRule('CW-SIP-01'); // fixed bundle S/16.90
  const scope = frozenScope('sc_cw_chijaukay_alopobre');
  const final = finalOf({
    rules: [plin, sip],
    operationalStates: [opState('CW-PLIN-01'), opState('CW-SIP-01')],
    scopes: [scope],
    context: {
      merchantId: 'm_chinawok',
      channel: 'SALON',
      branch: 'miraflores',
      exactItems: exactItemsOf(scope),
    },
    intendedTransactionAt: TUE,
  });

  it('compares on the shared exact-bundle scope with EFFECTIVE_OUT_OF_POCKET_COST basis', () => {
    expect(scope.scopeId).toBe('sc_cw_chijaukay_alopobre');
    expect(final?.comparisonBasis).toBe('EFFECTIVE_OUT_OF_POCKET_COST');
  });
  it('status BEST_CONFIRMED, winner Plin (IBK_PLIN) at 1590, runner-up Sip at 1690', () => {
    expect(final?.status).toBe('BEST_CONFIRMED');
    expect(final?.winnerRef?.ruleId).toBe('CW-PLIN-01');
    expect(final?.runnerUpRef?.ruleId).toBe('CW-SIP-01');
    expect(candidate(final, 'CW-PLIN-01')?.effectiveCostCentimos).toBe(1590);
    expect(candidate(final, 'CW-SIP-01')?.effectiveCostCentimos).toBe(1690);
  });
  it('typed rank delta is COST_CENTIMOS 100', () => {
    expect(final?.delta).toEqual({ kind: 'COST_CENTIMOS', amountCentimos: 100 });
  });
});

// ============================================================ FIX02 — Popeyes fixed bundle winner
describe('FIX02 — Popeyes 6pcs + family potato: Sip fixed bundle beats BCP', () => {
  const bcp = frozenRule('POP-BCP-01'); // fixed bundle S/39.90
  const sip = frozenRule('POP-SIP-02'); // fixed bundle S/29.90 (SAME 6pcs+family-potato signature)
  const scope = frozenScope('sc_pop_6pcs_family_potato');

  it('both rules share the exact 6-piece + family-potato bundle signature', () => {
    expect(bcp.comparisonScopeRefs).toContain('sc_pop_6pcs_family_potato');
    expect(sip.comparisonScopeRefs).toContain('sc_pop_6pcs_family_potato');
    expect(scope.signature).toEqual({
      kind: 'EXACT_BUNDLE',
      merchantId: 'm_popeyes',
      canonicalItems: [
        { itemKey: 'pop_chicken_piece', qty: 6 },
        { itemKey: 'pop_family_potato', qty: 1 },
      ],
    });
  });

  const final = finalOf({
    rules: [bcp, sip],
    operationalStates: [opState('POP-BCP-01'), opState('POP-SIP-02')],
    scopes: [scope],
    context: { merchantId: 'm_popeyes', channel: 'SALON', exactItems: exactItemsOf(scope) },
    intendedTransactionAt: TUE,
  });
  it('BEST_CONFIRMED winner SIP_OH at 2990, runner-up 3990, delta COST_CENTIMOS 1000', () => {
    expect(final?.status).toBe('BEST_CONFIRMED');
    expect(final?.winnerRef?.ruleId).toBe('POP-SIP-02');
    expect(candidate(final, 'POP-SIP-02')?.effectiveCostCentimos).toBe(2990);
    expect(candidate(final, 'POP-BCP-01')?.effectiveCostCentimos).toBe(3990);
    expect(final?.delta).toEqual({ kind: 'COST_CENTIMOS', amountCentimos: 1000 });
  });
});

// ============================================================ FIX03 — Baco confirmed tie (S/150)
describe('FIX03 — Baco S/150 @ 20%: three capped 20% offers tie; unknown-cap IBK cannot change it', () => {
  const rules = ['BV-BCP-01', 'BV-IBK-01', 'BV-SIP-01', 'BV-DIN-01'].map(frozenRule);
  const final = finalOf({
    rules,
    // None of the Baco rules is stock-bearing; NOT_APPLICABLE availability is the corpus default.
    operationalStates: rules.map((r) => opState(r.ruleId, { availability: 'NOT_APPLICABLE' })),
    scopes: [frozenScope('sc_baco_bill')],
    context: {
      merchantId: 'm_baco_y_vaca',
      channel: 'SALON',
      branch: 'listed', // BV-IBK-01 requires the 'listed' branch — it IS applicable here
      wholeBillCentimos: 15000,
    },
    intendedTransactionAt: TUE,
  });

  it('the three capped candidates each pay 12000 (20% of 15000, cap 10000 non-binding)', () => {
    for (const id of ['BV-BCP-01', 'BV-SIP-01', 'BV-DIN-01']) {
      expect(candidate(final, id)?.effectiveCostCentimos).toBe(12000);
      expect(candidate(final, id)?.rankable).toBe(true);
    }
  });
  it('CONFIRMED_TIE among the confirmed candidates — no false BEST_CONFIRMED manufactured', () => {
    expect(final?.status).toBe('CONFIRMED_TIE');
    // The confirmed top set is the three capped candidates; the unknown-cap IBK could still join it,
    // so the top set is NOT complete (RTM3-03 §9).
    const topIds = final?.confirmedTopRuleRefs.map((r) => r.ruleId).sort();
    expect(topIds).toEqual(['BV-BCP-01', 'BV-DIN-01', 'BV-SIP-01']);
    expect(final?.possibleAdditionalTopRuleRefs.map((r) => r.ruleId)).toEqual(['BV-IBK-01']);
    expect(final?.topSetComplete).toBe(false);
  });
  it('the unknown-cap IBK candidate is non-rankable but IS decision-material (could join the tie)', () => {
    const ibk = candidate(final, 'BV-IBK-01');
    expect(ibk?.rankable).toBe(false);
    expect(ibk?.advisories).toContain('UNKNOWN_CAP');
    // Equality is material to the top set (RTM3-03): IBK could join the tie though it cannot beat it.
    expect(ibk?.couldChangeDecision).toBe(true);
    expect(ibk?.couldChangeTopSet).toBe(true);
    expect(ibk?.couldImproveBestOutcome).toBe(false);
  });
});

// ============================================================ FIX04 — Baco unknown cap blocks (S/1000)
describe('FIX04 — Baco S/1000 @ 20%: unknown-cap IBK becomes decision-material ⇒ NO_SAFE_WINNER', () => {
  const rules = ['BV-BCP-01', 'BV-IBK-01', 'BV-SIP-01', 'BV-DIN-01'].map(frozenRule);
  const final = finalOf({
    rules,
    operationalStates: rules.map((r) => opState(r.ruleId, { availability: 'NOT_APPLICABLE' })),
    scopes: [frozenScope('sc_baco_bill')],
    context: {
      merchantId: 'm_baco_y_vaca',
      channel: 'SALON',
      branch: 'listed',
      wholeBillCentimos: 100000,
    },
    intendedTransactionAt: TUE,
  });

  it('the capped candidates pay 90000 (20%=20000 capped to 10000)', () => {
    expect(candidate(final, 'BV-BCP-01')?.effectiveCostCentimos).toBe(90000);
  });
  it('NO_SAFE_WINNER — the unknown cap could beat the capped winner', () => {
    expect(final?.status).toBe('NO_SAFE_WINNER');
  });
  it('IBK unknown-cap candidate: UNKNOWN_CAP advisory, couldChangeDecision = true, not confirmed', () => {
    const ibk = candidate(final, 'BV-IBK-01');
    expect(ibk?.rankable).toBe(false);
    expect(ibk?.advisories).toContain('UNKNOWN_CAP');
    expect(ibk?.couldChangeDecision).toBe(true);
    expect(ibk?.couldImproveBestOutcome).toBe(true); // could STRICTLY beat the capped winner
  });
});

// ============================================================ FIX05 — UVK amount switch (2 tickets)
describe('FIX05 — UVK two standard tickets: IBK 2x1 (=P) vs Diners fixed 1980 total switch by price', () => {
  const ibk = frozenRule('UVK-IBK-01'); // TWO_FOR_ONE pay1of2
  const din = frozenRule('UVK-DIN-01'); // FIXED_PRICE 990 per ticket × 2 = 1980 total
  const scope = frozenScope('sc_uvk_2tickets');
  const runP = (P: number) =>
    finalOf({
      rules: [ibk, din],
      operationalStates: [
        opState('UVK-IBK-01', { availability: 'NOT_APPLICABLE' }),
        opState('UVK-DIN-01', { availability: 'NOT_APPLICABLE' }),
      ],
      scopes: [scope],
      context: {
        merchantId: 'm_uvk',
        channel: 'BOX_OFFICE',
        branch: 'selected',
        ticketUnitPriceCentimos: P,
        ticketCount: 2,
        ticketClass: 'STANDARD',
      },
      intendedTransactionAt: WED,
    });

  it('P = 1800: IBK pays 1800, Diners pays 1980 ⇒ BEST_CONFIRMED IBK, delta 180', () => {
    const f = runP(1800);
    expect(candidate(f, 'UVK-IBK-01')?.effectiveCostCentimos).toBe(1800);
    expect(candidate(f, 'UVK-DIN-01')?.effectiveCostCentimos).toBe(1980);
    expect(f?.status).toBe('BEST_CONFIRMED');
    expect(f?.winnerRef?.ruleId).toBe('UVK-IBK-01');
    expect(f?.delta).toEqual({ kind: 'COST_CENTIMOS', amountCentimos: 180 });
  });
  it('P = 1980: IBK pays 1980 == Diners 1980 ⇒ CONFIRMED_TIE', () => {
    const f = runP(1980);
    expect(candidate(f, 'UVK-IBK-01')?.effectiveCostCentimos).toBe(1980);
    expect(candidate(f, 'UVK-DIN-01')?.effectiveCostCentimos).toBe(1980);
    expect(f?.status).toBe('CONFIRMED_TIE');
  });
  it('P = 2500: IBK pays 2500, Diners 1980 ⇒ BEST_CONFIRMED DINERS, delta 520', () => {
    const f = runP(2500);
    expect(candidate(f, 'UVK-IBK-01')?.effectiveCostCentimos).toBe(2500);
    expect(candidate(f, 'UVK-DIN-01')?.effectiveCostCentimos).toBe(1980);
    expect(f?.status).toBe('BEST_CONFIRMED');
    expect(f?.winnerRef?.ruleId).toBe('UVK-DIN-01');
    expect(f?.delta).toEqual({ kind: 'COST_CENTIMOS', amountCentimos: 520 });
  });
});

// ============================================================ FIX06 — Embarcadero day / channel switch
describe('FIX06 — Embarcadero 41 bill S/150: day / channel switch flips applicability', () => {
  const ibk = frozenRule('EMB-IBK-01'); // 15% cap 10000, SALON/PICKUP, no weekday limit
  const din = frozenRule('EMB-DIN-01'); // 20% cap 10000, SALON only, MON-FRI, holiday EXCLUDED
  const scope = frozenScope('sc_embarcadero_food');
  const base = {
    rules: [ibk, din],
    operationalStates: [
      opState('EMB-IBK-01', { availability: 'NOT_APPLICABLE' }),
      opState('EMB-DIN-01', { availability: 'NOT_APPLICABLE' }),
    ],
    scopes: [scope],
  };

  it('weekday dine-in: Diners 20% (cost 12000) beats IBK 15% (cost 12750), delta 750', () => {
    const f = finalOf({
      ...base,
      context: {
        merchantId: 'm_embarcadero_41',
        channel: 'SALON',
        foodCentimos: 15000,
        wholeBillCentimos: 15000,
      },
      intendedTransactionAt: TUE,
    });
    expect(candidate(f, 'EMB-IBK-01')?.effectiveCostCentimos).toBe(12750);
    expect(candidate(f, 'EMB-DIN-01')?.effectiveCostCentimos).toBe(12000);
    expect(f?.status).toBe('BEST_CONFIRMED');
    expect(f?.winnerRef?.ruleId).toBe('EMB-DIN-01');
    expect(f?.delta).toEqual({ kind: 'COST_CENTIMOS', amountCentimos: 750 });
  });

  it('weekend: Diners (MON-FRI) drops out ⇒ IBK is the sole safe public winner', () => {
    const f = finalOf({
      ...base,
      context: {
        merchantId: 'm_embarcadero_41',
        channel: 'SALON',
        foodCentimos: 15000,
        wholeBillCentimos: 15000,
      },
      intendedTransactionAt: SUN,
    });
    expect(candidate(f, 'EMB-DIN-01')?.rejectionReason).toBe('weekday not eligible');
    expect(f?.status).toBe('BEST_CONFIRMED');
    expect(f?.winnerRef?.ruleId).toBe('EMB-IBK-01');
    expect(candidate(f, 'EMB-IBK-01')?.effectiveCostCentimos).toBe(12750);
  });

  it('pickup channel: Diners (SALON only) is rejected ⇒ IBK sole safe public winner', () => {
    const f = finalOf({
      ...base,
      context: {
        merchantId: 'm_embarcadero_41',
        channel: 'PICKUP',
        foodCentimos: 15000,
        wholeBillCentimos: 15000,
      },
      intendedTransactionAt: TUE,
    });
    expect(candidate(f, 'EMB-DIN-01')?.rejectionReason).toBe('channel PICKUP not allowed');
    expect(f?.status).toBe('BEST_CONFIRMED');
    expect(f?.winnerRef?.ruleId).toBe('EMB-IBK-01');
  });
});

// ============================================================ FIX07 — Perroquet basket composition
describe('FIX07 — Perroquet: per-rule EligibleSpendSelector drives the winner by basket composition', () => {
  const bcp = frozenRule('PER-BCP-01'); // 20% on FOOD_PLUS_NONALCOHOLIC
  const din = frozenRule('PER-DIN-01'); // 30% on FOOD_ONLY
  const scope = frozenScope('sc_perroquet_meal');
  const base = {
    rules: [bcp, din],
    operationalStates: [
      opState('PER-BCP-01', { availability: 'NOT_APPLICABLE' }),
      opState('PER-DIN-01', { availability: 'NOT_APPLICABLE' }),
    ],
    scopes: [scope],
  };

  it('case A (food 100, non-alcoholic 20): Diners 30%×food (cost 9000) beats BCP 20%×(food+drink) (9600), delta 600', () => {
    const f = finalOf({
      ...base,
      context: {
        merchantId: 'm_perroquet',
        channel: 'SALON',
        foodCentimos: 10000,
        nonAlcoholicBeverageCentimos: 2000,
        wholeBillCentimos: 12000,
      },
      intendedTransactionAt: TUE,
    });
    expect(candidate(f, 'PER-BCP-01')?.effectiveCostCentimos).toBe(9600);
    expect(candidate(f, 'PER-DIN-01')?.effectiveCostCentimos).toBe(9000);
    expect(f?.status).toBe('BEST_CONFIRMED');
    expect(f?.winnerRef?.ruleId).toBe('PER-DIN-01');
    expect(f?.delta).toEqual({ kind: 'COST_CENTIMOS', amountCentimos: 600 });
  });

  it('case B (food 100, non-alcoholic 60): BCP 20%×(food+drink) (cost 12800) beats Diners 30%×food (13000), delta 200', () => {
    const f = finalOf({
      ...base,
      context: {
        merchantId: 'm_perroquet',
        channel: 'SALON',
        foodCentimos: 10000,
        nonAlcoholicBeverageCentimos: 6000,
        wholeBillCentimos: 16000,
      },
      intendedTransactionAt: TUE,
    });
    expect(candidate(f, 'PER-BCP-01')?.effectiveCostCentimos).toBe(12800);
    expect(candidate(f, 'PER-DIN-01')?.effectiveCostCentimos).toBe(13000);
    expect(f?.status).toBe('BEST_CONFIRMED');
    expect(f?.winnerRef?.ruleId).toBe('PER-BCP-01');
    expect(f?.delta).toEqual({ kind: 'COST_CENTIMOS', amountCentimos: 200 });
  });
});

// ============================================================ FIX08 — Fridays location / calendar switch
describe('FIX08 — TGI Fridays location/calendar switch (RTM3-02 corrected: IBK airport-INCLUDED)', () => {
  const ibk = frozenRule('FR-IBK-01'); // 25%, NO location restriction (airport included), holiday EXCLUDED
  const sip = frozenRule('FR-SIP-01'); // 25%, locations exclude ['airport'], holiday NONE
  const scope = frozenScope('sc_fridays_food');
  const publicRules = [ibk, sip];
  const ops = [
    opState('FR-IBK-01', { availability: 'CONFIRMED_AVAILABLE' }), // FR-IBK-01 is stock-bearing
    opState('FR-SIP-01', { availability: 'NOT_APPLICABLE' }),
  ];
  const foodCtx = (over: Record<string, unknown>) => ({
    merchantId: 'm_fridays' as const,
    channel: 'SALON' as const,
    foodCentimos: 15000,
    wholeBillCentimos: 15000,
    ...over,
  });

  it('CORPUS FIDELITY: FR-IBK-01 carries no airport-only restriction (the airport is included)', () => {
    // RTM3-02: the frozen Phase 0A-1B row is "international airport INCLUDED" — coverage in addition
    // to ordinary salon/takeaway locations, i.e. no location restriction. Both public offers are 25%.
    expect(ibk.constraints.locations).toBeUndefined();
    expect(sip.constraints.locations).toEqual({ exclude: ['airport'] });
    expect(ibk.benefit).toMatchObject({ type: 'PERCENT', percentBps: 2500 });
    expect(sip.benefit).toMatchObject({ type: 'PERCENT', percentBps: 2500 });
  });

  it('ordinary non-airport, non-holiday: IBK 25% ties Sip 25% at 11250 ⇒ CONFIRMED_TIE', () => {
    const f = finalOf({
      rules: publicRules,
      operationalStates: ops,
      scopes: [scope],
      context: foodCtx({ branch: 'miraflores' }),
      intendedTransactionAt: TUE,
    });
    expect(candidate(f, 'FR-IBK-01')?.effectiveCostCentimos).toBe(11250);
    expect(candidate(f, 'FR-SIP-01')?.effectiveCostCentimos).toBe(11250);
    expect(f?.status).toBe('CONFIRMED_TIE');
    expect(f?.confirmedTopRuleRefs.map((r) => r.ruleId).sort()).toEqual(['FR-IBK-01', 'FR-SIP-01']);
  });

  it('airport, non-holiday: Sip excluded by location ⇒ IBK is the sole public winner', () => {
    const f = finalOf({
      rules: publicRules,
      operationalStates: ops,
      scopes: [scope],
      context: foodCtx({ branch: 'airport' }),
      intendedTransactionAt: TUE,
    });
    expect(candidate(f, 'FR-SIP-01')?.rejectionReason).toBe('branch airport excluded');
    expect(f?.status).toBe('BEST_CONFIRMED');
    expect(f?.winnerRef?.ruleId).toBe('FR-IBK-01');
    expect(candidate(f, 'FR-IBK-01')?.effectiveCostCentimos).toBe(11250); // 25% of 15000
  });

  it('ordinary non-airport, HOLIDAY: IBK holiday-excluded, Sip (no holiday exclusion) wins', () => {
    const f = finalOf({
      rules: publicRules,
      operationalStates: ops,
      scopes: [scope],
      context: foodCtx({ branch: 'miraflores' }),
      intendedTransactionAt: '2026-07-28T12:00:00-05:00',
      holidayCalendar: ['2026-07-28'],
    });
    expect(candidate(f, 'FR-IBK-01')?.rejectionReason).toBe('holiday excluded');
    expect(f?.status).toBe('BEST_CONFIRMED');
    expect(f?.winnerRef?.ruleId).toBe('FR-SIP-01');
    expect(candidate(f, 'FR-SIP-01')?.effectiveCostCentimos).toBe(11250); // 25% of 15000
  });
});

// ============================================================ FIX09 — Fridays Qore provider-private overlay
describe('FIX09 — Fridays Qore: a provider-private overlay stays advisory, never a confirmed winner', () => {
  // §28: evaluate the Qore overlay against the COMPLETE relevant public set for this purchase — both
  // FR-IBK-01 (now airport-included ⇒ applies at ordinary Lima branches too) and FR-SIP-01.
  const ibk = frozenRule('FR-IBK-01'); // public 25%
  const sip = frozenRule('FR-SIP-01'); // public 25%
  const qore = frozenRule('FR-QORE-01'); // provider-private 50% (qore_active)
  const scope = frozenScope('sc_fridays_food');
  const port = (qoreState: 'YES' | 'NO' | 'UNKNOWN'): EligibilityPortfolio => ({
    instruments: [{ family: 'IBK_PLIN' }, { family: 'SIP_OH' }, { family: 'BCP_QORE' }],
    privateStates: { qore_active: qoreState },
  });
  const runQ = (qoreState: 'YES' | 'NO' | 'UNKNOWN') =>
    finalOf({
      rules: [ibk, sip, qore],
      operationalStates: [
        opState('FR-IBK-01', { availability: 'CONFIRMED_AVAILABLE' }),
        opState('FR-SIP-01', { availability: 'NOT_APPLICABLE' }),
        opState('FR-QORE-01', { availability: 'NOT_APPLICABLE' }),
      ],
      scopes: [scope],
      portfolio: port(qoreState),
      context: {
        merchantId: 'm_fridays',
        channel: 'SALON',
        branch: 'miraflores',
        foodCentimos: 15000,
        wholeBillCentimos: 15000,
      },
      intendedTransactionAt: TUE,
    });

  for (const qoreState of ['UNKNOWN', 'YES'] as const) {
    it(`qore_active = ${qoreState}: public IBK+Sip CONFIRMED_TIE stands; Qore is a VERIFY_FIRST advisory only`, () => {
      const f = runQ(qoreState);
      // The complete public set ties at 25% (IBK + Sip); the 50% Qore overlay never joins it.
      expect(f?.status).toBe('CONFIRMED_TIE');
      expect(f?.confirmedTopRuleRefs.map((r) => r.ruleId).sort()).toEqual([
        'FR-IBK-01',
        'FR-SIP-01',
      ]);
      const q = candidate(f, 'FR-QORE-01');
      expect(q?.rankable).toBe(false);
      expect(q?.advisories).toContain('VERIFY_FIRST');
      expect(q?.couldChangeDecision).toBe(true); // 50% upside exists, but user-resolvable
      expect(f?.confirmedTopRuleRefs.map((r) => r.ruleId)).not.toContain('FR-QORE-01');
    });
  }

  it('qore_active = NO: the Qore overlay is ineligible; the public IBK+Sip tie stands', () => {
    const f = runQ('NO');
    const q = candidate(f, 'FR-QORE-01');
    expect(q?.eligibility).toBe('INELIGIBLE');
    expect(q?.rankable).toBe(false);
    expect(f?.status).toBe('CONFIRMED_TIE');
  });
});

// ============================================================ FIX10 — Cineplanet excluded/stale Sip
describe('FIX10 — Cineplanet: the quarantined historical Sip row can never become a rankable winner', () => {
  const bcp = frozenRule('CIN-BCP-01'); // 50%, AMEX + socio membership
  const ibk = frozenRule('CIN-IBK-01'); // 50%, AMEX + socio membership
  const stale = frozenExcluded('CIN-SIP-STALE'); // fixed S/9.90, QUARANTINED + CONFLICTED
  const scope = frozenScope('sc_cineplanet_ticket');
  const port: EligibilityPortfolio = {
    instruments: [
      { family: 'BCP_QORE', network: 'AMEX' },
      { family: 'IBK_PLIN', network: 'AMEX' },
      { family: 'SIP_OH' },
    ],
    declarations: { 'membership:socio_cineplanet': 'YES' },
  };
  const context = {
    merchantId: 'm_cineplanet' as const,
    channel: 'WEB_APP' as const,
    ticketUnitPriceCentimos: 2000,
    ticketCount: 1,
    ticketClass: 'ELIGIBLE_FORMAT',
    wholeBillCentimos: 2000,
  };

  it('the two active 50% ticket offers tie at 1000 (CONFIRMED_TIE)', () => {
    const f = finalOf({
      rules: [bcp, ibk],
      operationalStates: [
        opState('CIN-BCP-01', { availability: 'NOT_APPLICABLE' }),
        opState('CIN-IBK-01', { availability: 'NOT_APPLICABLE' }),
      ],
      scopes: [scope],
      portfolio: port,
      context,
      intendedTransactionAt: TUE,
    });
    expect(candidate(f, 'CIN-BCP-01')?.effectiveCostCentimos).toBe(1000);
    expect(candidate(f, 'CIN-IBK-01')?.effectiveCostCentimos).toBe(1000);
    expect(f?.status).toBe('CONFIRMED_TIE');
  });

  it('injecting the quarantined Sip S/9.90 row does NOT make it a winner (cheaper but non-actionable)', () => {
    const f = finalOf({
      rules: [bcp, ibk, stale.rule],
      operationalStates: [
        opState('CIN-BCP-01', { availability: 'NOT_APPLICABLE' }),
        opState('CIN-IBK-01', { availability: 'NOT_APPLICABLE' }),
        stale.op, // QUARANTINED + CONFLICTED, straight from the frozen excluded history
      ],
      scopes: [scope],
      portfolio: port,
      context,
      intendedTransactionAt: TUE,
    });
    const s = candidate(f, 'CIN-SIP-STALE');
    expect(s?.rankable).toBe(false);
    expect(s?.rejectionReason).toBe('publication QUARANTINED');
    expect(f?.winnerRef?.ruleId).not.toBe('CIN-SIP-STALE');
    expect(f?.status).toBe('CONFIRMED_TIE'); // active pair unaffected by the stale row
  });
});

// ============================================================ FIX11 — Coney non-cash nominal value
describe('FIX11 — Coney nominal packages: same-unit nominal ranking, never a fake PEN saving', () => {
  it('Coney Park: Sip 8500 vs Diners 8500 at equal S/45 acquisition ⇒ CONFIRMED_TIE, penSaved undefined', () => {
    const sip = frozenRule('CON-SIP-01');
    const din = frozenRule('CON-DIN-P-01');
    const f = finalOf({
      rules: [sip, din],
      operationalStates: [
        opState('CON-SIP-01', { availability: 'NOT_APPLICABLE' }),
        opState('CON-DIN-P-01', { availability: 'NOT_APPLICABLE' }),
      ],
      scopes: [frozenScope('sc_coney_park_play')],
      portfolio: { instruments: [{ family: 'SIP_OH' }, { family: 'DINERS' }] },
      context: { merchantId: 'm_coney_park', channel: 'PICKUP' },
      intendedTransactionAt: TUE,
    });
    expect(f?.comparisonBasis).toBe('NOMINAL_VALUE_SAME_UNIT');
    expect(candidate(f, 'CON-SIP-01')?.nominalValue).toEqual({
      minorUnits: 8500,
      unit: 'CONEY_PLAY_BALANCE',
    });
    expect(f?.status).toBe('CONFIRMED_TIE');
    expect(f?.candidates.every((c) => c.penSavedCentimos === undefined)).toBe(true);
  });

  it('Coney Active: Sip 8500 vs Diners 8600 ⇒ BEST_CONFIRMED Diners, delta NOMINAL_VALUE 100 (not PEN)', () => {
    const sip = frozenRule('CON-SIP-01');
    const din = frozenRule('CON-DIN-A-01');
    const f = finalOf({
      rules: [sip, din],
      operationalStates: [
        opState('CON-SIP-01', { availability: 'NOT_APPLICABLE' }),
        opState('CON-DIN-A-01', { availability: 'NOT_APPLICABLE' }),
      ],
      scopes: [frozenScope('sc_coney_active_play')],
      portfolio: { instruments: [{ family: 'SIP_OH' }, { family: 'DINERS' }] },
      context: { merchantId: 'm_coney_active', channel: 'PICKUP' },
      intendedTransactionAt: TUE,
    });
    expect(f?.status).toBe('BEST_CONFIRMED');
    expect(f?.winnerRef?.ruleId).toBe('CON-DIN-A-01');
    expect(f?.delta).toEqual({
      kind: 'NOMINAL_VALUE',
      amountMinorUnits: 100, // corpus minor units (S/86 − S/85 = S/1 = 100 balance units)
      unit: 'CONEY_PLAY_BALANCE',
    });
    expect(f?.candidates.every((c) => c.penSavedCentimos === undefined)).toBe(true);
  });
});

// ============================================================ FIX12 — Dynamic availability exit
describe('FIX12 — Popeyes dynamic availability: confirmed / unavailable / unknown', () => {
  const bcp = frozenRule('POP-BCP-01'); // 3990
  const sip = frozenRule('POP-SIP-02'); // 2990 (cheaper)
  const scope = frozenScope('sc_pop_6pcs_family_potato');
  const runAvail = (sipAvail: RuleOperationalState['availability']) =>
    finalOf({
      rules: [bcp, sip],
      operationalStates: [
        opState('POP-BCP-01', { availability: 'CONFIRMED_AVAILABLE' }),
        opState('POP-SIP-02', { availability: sipAvail }),
      ],
      scopes: [scope],
      context: { merchantId: 'm_popeyes', channel: 'SALON', exactItems: exactItemsOf(scope) },
      intendedTransactionAt: TUE,
    });

  it('confirmed available: the cheaper Sip bundle wins normally', () => {
    const f = runAvail('CONFIRMED_AVAILABLE');
    expect(f?.status).toBe('BEST_CONFIRMED');
    expect(f?.winnerRef?.ruleId).toBe('POP-SIP-02');
  });
  it('confirmed unavailable: Sip exits the rankable set; BCP wins (attractive value cannot keep it in)', () => {
    const f = runAvail('CONFIRMED_UNAVAILABLE');
    expect(candidate(f, 'POP-SIP-02')?.rejectionReason).toBe('CONFIRMED_UNAVAILABLE');
    expect(f?.status).toBe('BEST_CONFIRMED');
    expect(f?.winnerRef?.ruleId).toBe('POP-BCP-01');
  });
  it('unknown + material + not pre-redemption-verifiable ⇒ NO_SAFE_WINNER (no false confirmed winner)', () => {
    const f = runAvail('UNKNOWN');
    expect(f?.status).toBe('NO_SAFE_WINNER');
    const s = candidate(f, 'POP-SIP-02');
    expect(s?.advisories).toContain('DYNAMIC_AVAILABILITY');
    expect(s?.couldChangeDecision).toBe(true);
  });

  it('a prior immutable result object is not retroactively changed by a later separate evaluation', () => {
    const inputA = toInput({
      rules: [bcp, sip],
      operationalStates: [
        opState('POP-BCP-01', { availability: 'CONFIRMED_AVAILABLE' }),
        opState('POP-SIP-02', { availability: 'CONFIRMED_AVAILABLE' }),
      ],
      scopes: [scope],
      context: { merchantId: 'm_popeyes', channel: 'SALON', exactItems: exactItemsOf(scope) },
      intendedTransactionAt: TUE,
    });
    const resultA = decide(inputA);
    const snapshotA = JSON.stringify(resultA);
    // A completely separate evaluation with different availability.
    runAvail('CONFIRMED_UNAVAILABLE');
    expect(JSON.stringify(resultA)).toBe(snapshotA); // unchanged
    // The frozen rule inputs were not mutated either.
    expect(bcp.benefit).toMatchObject({ type: 'FIXED_BUNDLE', bundlePriceCentimos: 3990 });
    expect(sip.benefit).toMatchObject({ type: 'FIXED_BUNDLE', bundlePriceCentimos: 2990 });
  });
});

// ============================================================ REG-PJ-CROSS-SKU (negative regression)
describe('REG-PJ-CROSS-SKU — Papa Johns: different exact SKUs never enter one ranking', () => {
  const bcp = frozenRule('PJ-BCP-01'); // Large Classic, S/20.90, scope sc_pj_large_classic
  const plin = frozenRule('PJ-PLIN-01'); // Large Americana, S/13.90, scope sc_pj_large_americana

  it('the two rules live in disjoint EXACT_BUNDLE scopes (no shared rankable comparison)', () => {
    const shared = bcp.comparisonScopeRefs.filter((s) => plin.comparisonScopeRefs.includes(s));
    expect(shared).toEqual([]);
  });

  const classicScope = frozenScope('sc_pj_large_classic');
  const americanaScope = frozenScope('sc_pj_large_americana');
  const bothScopes = [classicScope, americanaScope];
  const bothOps = [
    opState('PJ-BCP-01', { availability: 'CONFIRMED_AVAILABLE' }),
    opState('PJ-PLIN-01', { availability: 'CONFIRMED_AVAILABLE' }),
  ];

  it('buying the Large Classic bundle matches ONLY the Large Classic scope (Americana cannot match)', () => {
    const e = runGolden({
      rules: [bcp, plin],
      operationalStates: bothOps,
      scopes: bothScopes,
      context: {
        merchantId: 'm_papa_johns',
        channel: 'SALON',
        branch: 'miraflores',
        exactItems: exactItemsOf(classicScope), // the ACTUAL purchase is the Large Classic bundle
      },
      intendedTransactionAt: TUE,
    });
    // Only the Large Classic scope matches the runtime purchase; the Americana scope never ranks.
    expect(e.matchedScopes.map((s) => s.scopeId)).toEqual(['sc_pj_large_classic']);
    expect(e.final?.scopeId).toBe('sc_pj_large_classic');
    expect(e.final?.candidates.map((c) => c.ruleRef.ruleId)).toEqual(['PJ-BCP-01']);
    expect(candidate(e.final, 'PJ-BCP-01')?.effectiveCostCentimos).toBe(2090);
    // No decision ever ranks BCP against Plin ⇒ the forbidden S/7 delta cannot appear.
    for (const s of e.matchedScopes) {
      expect(s.decision.delta).not.toEqual({ kind: 'COST_CENTIMOS', amountCentimos: 700 });
    }
  });

  it('buying the Large Americana bundle matches ONLY the Americana scope (winner Plin 1390)', () => {
    const e = runGolden({
      rules: [bcp, plin],
      operationalStates: bothOps,
      scopes: bothScopes,
      context: {
        merchantId: 'm_papa_johns',
        channel: 'SALON',
        branch: 'miraflores',
        exactItems: exactItemsOf(americanaScope),
      },
      intendedTransactionAt: TUE,
    });
    expect(e.matchedScopes.map((s) => s.scopeId)).toEqual(['sc_pj_large_americana']);
    expect(e.final?.candidates.map((c) => c.ruleRef.ruleId)).toEqual(['PJ-PLIN-01']);
    expect(candidate(e.final, 'PJ-PLIN-01')?.effectiveCostCentimos).toBe(1390);
  });

  it('supplying Large Classic items can NEVER match the Large Americana scope (runtime, not lint)', () => {
    // Evaluate ONLY the Americana scope while buying the Classic bundle ⇒ the scope is not applicable
    // (its rules never rank), so there is no Plin winner from a Classic purchase.
    const e = runGolden({
      rules: [plin],
      operationalStates: [opState('PJ-PLIN-01', { availability: 'CONFIRMED_AVAILABLE' })],
      scopes: [americanaScope],
      context: {
        merchantId: 'm_papa_johns',
        channel: 'SALON',
        branch: 'miraflores',
        exactItems: exactItemsOf(classicScope), // Classic items vs an Americana scope
      },
      intendedTransactionAt: TUE,
    });
    expect(e.matchedScopes).toEqual([]);
    expect(candidate(e.final, 'PJ-PLIN-01')?.rankable).toBe(false);
    expect(candidate(e.final, 'PJ-PLIN-01')?.rejectionReason).toContain('scope not applicable');
  });
});

// ============================================================ SYN-REGULAR-BASELINE (test-only property)
describe('SYN-REGULAR-BASELINE — provider-advertised list price is NEVER the rank key (test-only)', () => {
  // TEST-ONLY synthetic rules — NOT part of CORPUS_V1's 46 active rules. Two providers sell the
  // exact same canonical bundle at different actual payables and different advertised baselines.
  const synScope: ComparisonScope = {
    scopeId: 'syn_same_bundle',
    merchantId: 'm_fridays',
    comparisonBasis: 'EFFECTIVE_OUT_OF_POCKET_COST',
    equivalenceGroup: 'syn_bundle',
    purchaseKind: 'SYN_BUNDLE',
    requiredContext: ['BASKET', 'DATE_TIME'],
    allowedSelectors: ['EXACT_SKU_BUNDLE'],
    signature: {
      kind: 'EXACT_BUNDLE',
      merchantId: 'm_fridays',
      canonicalItems: [{ itemKey: 'syn_item', qty: 1 }],
    },
  };
  const synRule = (
    id: string,
    family: RuleVersion['providerFamily'],
    payable: number,
    advertised?: number,
  ): RuleVersion => ({
    ruleId: id,
    version: 1,
    campaignId: `cmp_${id}`,
    merchantIds: ['m_fridays'],
    providerFamily: family,
    benefit: {
      type: 'FIXED_PRICE',
      fixedPriceCentimos: payable,
      ...(advertised !== undefined ? { regularReferenceCentimos: advertised } : {}),
    },
    eligibleSpendSelector: 'EXACT_SKU_BUNDLE',
    canonicalItems: [{ itemKey: 'syn_item', qty: 1 }],
    constraints: {
      temporal: {
        kind: 'LOCAL_DATE_RANGE',
        startDateInclusive: '2026-01-01',
        endDateInclusive: '2026-12-31',
      },
      holidayPolicy: 'NONE',
      combinability: 'NO',
    },
    eligibilityClass: 'DETERMINISTIC_PUBLIC',
    confidence: 'HIGH',
    comparisonScopeRefs: ['syn_same_bundle'],
    signatureKind: 'EXACT_BUNDLE',
    provenance: { sourceId: 'syn', url: 'test-only', observedAt: '2026-08-30' },
  });
  const port: EligibilityPortfolio = {
    instruments: [{ family: 'IBK_PLIN' }, { family: 'DINERS' }],
  };
  const runSyn = (advA: number | undefined, advB: number | undefined, baseline?: number) =>
    finalOf({
      rules: [synRule('SYN-A', 'IBK_PLIN', 1390, advA), synRule('SYN-B', 'DINERS', 2090, advB)],
      operationalStates: [
        opState('SYN-A', { availability: 'NOT_APPLICABLE' }),
        opState('SYN-B', { availability: 'NOT_APPLICABLE' }),
      ],
      scopes: [synScope],
      portfolio: port,
      context: { merchantId: 'm_fridays', exactItems: [{ itemKey: 'syn_item', qty: 1 }] },
      intendedTransactionAt: TUE,
      ...(baseline !== undefined ? { baselineByScopeId: { syn_same_bundle: baseline } } : {}),
    });

  it('ranks by actual payable (A 1390 < B 2090), not by advertised baseline (which favours neither consistently)', () => {
    const f = runSyn(2790, 3290);
    expect(f?.status).toBe('BEST_CONFIRMED');
    expect(f?.winnerRef?.ruleId).toBe('SYN-A');
    expect(f?.delta).toEqual({ kind: 'COST_CENTIMOS', amountCentimos: 700 });
  });

  it('removing / varying the advertised baselines leaves winner, status, and rank delta unchanged', () => {
    const withBaselines = runSyn(2790, 3290);
    const noBaselines = runSyn(undefined, undefined);
    const swappedBaselines = runSyn(9999, 1); // absurd advertised prices
    for (const f of [noBaselines, swappedBaselines]) {
      expect(f?.status).toBe(withBaselines?.status);
      expect(f?.winnerRef?.ruleId).toBe(withBaselines?.winnerRef?.ruleId);
      expect(f?.delta).toEqual(withBaselines?.delta);
    }
  });

  it('a display-only common baseline changes only penSaved, never winner / status / rank delta', () => {
    const b1 = runSyn(2790, 3290, 3000);
    const b2 = runSyn(2790, 3290, 5000);
    expect(b1?.status).toBe(b2?.status);
    expect(b1?.winnerRef?.ruleId).toBe(b2?.winnerRef?.ruleId);
    expect(b1?.delta).toEqual(b2?.delta);
    // Only the display penSaved differs (5000 − 1390 vs 3000 − 1390 for the winner).
    expect(candidate(b1, 'SYN-A')?.penSavedCentimos).toBe(3000 - 1390);
    expect(candidate(b2, 'SYN-A')?.penSavedCentimos).toBe(5000 - 1390);
  });
});

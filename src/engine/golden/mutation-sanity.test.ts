// PagaMenos · M3 mutation-like sanity checks (§27). These prove the golden invariants are load-
// bearing: when a key input is deliberately perturbed TEST-LOCALLY, the engine's answer changes in
// the expected direction. No production code is broken; the perturbations live only in this file.
import { describe, expect, it } from 'vitest';

import { decide } from '../decide';
import type { DecideInput, EligibilityPortfolio } from '../types';
import { costScope, fixedRule, percentRule, synOp } from './synthetic';

const AT = '2026-09-01T12:00:00-05:00';
const ALL: EligibilityPortfolio = {
  instruments: [
    { family: 'IBK_PLIN' },
    { family: 'DINERS' },
    { family: 'BCP_QORE' },
    { family: 'SIP_OH' },
  ],
};
const run = (
  over: Pick<DecideInput, 'rules' | 'operationalStates' | 'scopes'> & Partial<DecideInput>,
) =>
  decide({
    portfolio: ALL,
    context: {
      merchantId: 'm_fridays',
      exactItems: [{ itemKey: 'syn_item', qty: 1 }],
      wholeBillCentimos: 10000,
    },
    evaluatedAt: AT,
    intendedTransactionAt: AT,
    ...over,
  }).final;

describe('MUTATION SANITY — golden invariants are load-bearing', () => {
  it('swapping the expected winner: making the loser cheaper flips the winner', () => {
    const base = run({
      rules: [fixedRule('A', 'IBK_PLIN', 3000), fixedRule('B', 'DINERS', 5000)],
      operationalStates: [synOp('A'), synOp('B')],
      scopes: [costScope()],
    });
    expect(base?.winnerRef?.ruleId).toBe('A');
    const mutated = run({
      rules: [fixedRule('A', 'IBK_PLIN', 6000), fixedRule('B', 'DINERS', 5000)],
      operationalStates: [synOp('A'), synOp('B')],
      scopes: [costScope()],
    });
    expect(mutated?.winnerRef?.ruleId).toBe('B'); // winner really depends on cost, not identity
  });

  it('removing the unknown cap turns a NO_SAFE_WINNER into a confirmable comparison', () => {
    const withUnknownCap = run({
      rules: [
        percentRule('A', 'IBK_PLIN', 2000, {
          selector: 'WHOLE_BILL',
          signatureKind: 'ELIGIBLE_BILL',
          cap: { kind: 'UNKNOWN_NOT_STATED' },
        }),
        fixedRule('B', 'DINERS', 8500, { selector: 'WHOLE_BILL', signatureKind: 'ELIGIBLE_BILL' }),
      ],
      operationalStates: [synOp('A'), synOp('B')],
      scopes: [costScope('syn_cost', 'm_fridays', ['AMOUNT', 'DATE_TIME'], ['WHOLE_BILL'])],
    });
    expect(withUnknownCap?.status).toBe('NO_SAFE_WINNER');
    const withKnownCap = run({
      rules: [
        percentRule('A', 'IBK_PLIN', 2000, {
          selector: 'WHOLE_BILL',
          signatureKind: 'ELIGIBLE_BILL',
          cap: { kind: 'AMOUNT', centimos: 10000 },
        }),
        fixedRule('B', 'DINERS', 8500, { selector: 'WHOLE_BILL', signatureKind: 'ELIGIBLE_BILL' }),
      ],
      operationalStates: [synOp('A'), synOp('B')],
      scopes: [costScope('syn_cost', 'm_fridays', ['AMOUNT', 'DATE_TIME'], ['WHOLE_BILL'])],
    });
    // Now A is a known 20% → cost 8000 < 8500 ⇒ A confirmed winner. The cap is genuinely load-bearing.
    expect(withKnownCap?.status).toBe('BEST_CONFIRMED');
    expect(withKnownCap?.winnerRef?.ruleId).toBe('A');
  });

  it('treating a provider-private rule as public would (wrongly) let it win — the guard prevents it', () => {
    const asPrivate = run({
      rules: [
        fixedRule('PUB', 'IBK_PLIN', 9000),
        fixedRule('PRIV', 'BCP_QORE', 3000, {
          eligibilityClass: 'PROVIDER_PRIVATE',
          providerPrivateKey: 'qore_active',
        }),
      ],
      operationalStates: [synOp('PUB'), synOp('PRIV')],
      scopes: [costScope()],
      portfolio: { ...ALL, privateStates: { qore_active: 'YES' } },
    });
    expect(asPrivate?.winnerRef?.ruleId).toBe('PUB'); // PRIV cannot win
    // Control: the SAME economics as an ordinary public rule WOULD win — proving the class is the guard.
    const asPublic = run({
      rules: [fixedRule('PUB', 'IBK_PLIN', 9000), fixedRule('PRIV', 'BCP_QORE', 3000)],
      operationalStates: [synOp('PUB'), synOp('PRIV')],
      scopes: [costScope()],
    });
    expect(asPublic?.winnerRef?.ruleId).toBe('PRIV');
  });

  it('comparing different Papa-Johns-style SKUs in one scope WOULD rank them — disjoint scopes prevent it', () => {
    // Control: forcing two different-price bundles into ONE scope ranks them (what must never happen
    // for real PJ rows). The real corpus keeps them in DISJOINT scopes (asserted in REG-PJ-CROSS-SKU).
    const forcedTogether = run({
      rules: [
        fixedRule('BCP', 'BCP_QORE', 2090, { scopeRefs: ['one'] }),
        fixedRule('PLIN', 'IBK_PLIN', 1390, { scopeRefs: ['one'] }),
      ],
      operationalStates: [synOp('BCP'), synOp('PLIN')],
      scopes: [costScope('one')],
    });
    expect(forcedTogether?.delta).toEqual({ kind: 'COST_CENTIMOS', amountCentimos: 700 }); // the forbidden S/7
    expect(forcedTogether?.winnerRef?.ruleId).toBe('PLIN');
  });
});

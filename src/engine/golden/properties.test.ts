// PagaMenos · M3 property-based suite (fast-check). Economic INVARIANTS over bounded, valid
// domain inputs — not arbitrary garbage. Reproducible: fixed seed + explicit run count. On any
// failure fast-check reports the counterexample seed and shrink path.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { NominalUnit, ProviderFamily, RuleOperationalState, RuleVersion } from '@/corpus';
import { decide } from '../decide';
import type { DecideInput, EligibilityPortfolio, PurchaseContext } from '../types';
import {
  billScope,
  cashbackRule,
  costScope,
  fixedRule,
  nominalRule,
  nominalScope,
  percentRule,
  synOp,
} from './synthetic';

// Reproducible configuration (§26): >= 500 runs for these inexpensive pure properties.
const RUNS = 500;
fc.configureGlobal({ numRuns: RUNS, seed: 0x50_11 });

const FAMILIES: ProviderFamily[] = ['IBK_PLIN', 'DINERS', 'BCP_QORE', 'SIP_OH'];
const PORTFOLIO: EligibilityPortfolio = { instruments: FAMILIES.map((family) => ({ family })) };

const AT = '2026-09-01T12:00:00-05:00';
const richCtx = (over: Partial<PurchaseContext> = {}): PurchaseContext => ({
  merchantId: 'm_fridays',
  exactItems: [{ itemKey: 'syn_item', qty: 1 }],
  wholeBillCentimos: 10000,
  ...over,
});

function runCost(
  rules: RuleVersion[],
  ops: RuleOperationalState[],
  over: Partial<DecideInput> = {},
) {
  return decide({
    rules,
    operationalStates: ops,
    scopes: [costScope()],
    portfolio: PORTFOLIO,
    context: richCtx(),
    evaluatedAt: AT,
    intendedTransactionAt: AT,
    ...over,
  }).final;
}

/** All permutations of a small array (n ≤ 4). */
function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const out: T[][] = [];
  arr.forEach((x, i) => {
    for (const rest of permutations([...arr.slice(0, i), ...arr.slice(i + 1)]))
      out.push([x, ...rest]);
  });
  return out;
}

// ------------------------------------------------------------ P1 rule-order invariance
describe('P1 — rule ordering does not change status / winner / tie / delta', () => {
  it('is invariant under every permutation of the rules array', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.integer({ min: 100, max: 50000 }), { minLength: 2, maxLength: 4 }),
        (costs) => {
          const rules = costs.map((c, i) => fixedRule(`R${i}`, FAMILIES[i]!, c));
          const ops = rules.map((r) => synOp(r.ruleId));
          const ref = runCost(rules, ops);
          for (const perm of permutations(rules)) {
            const f = runCost(perm, ops);
            expect(f?.status).toBe(ref?.status);
            expect(f?.winnerRef?.ruleId).toBe(ref?.winnerRef?.ruleId);
            expect(f?.delta).toEqual(ref?.delta);
          }
        },
      ),
    );
  });
});

// ------------------------------------------------------------ P2 operational-state order invariance
describe('P2 — operational-state ordering does not change the semantic result', () => {
  it('is invariant under permutation of the operationalStates array', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.integer({ min: 100, max: 50000 }), { minLength: 2, maxLength: 4 }),
        (costs) => {
          const rules = costs.map((c, i) => fixedRule(`R${i}`, FAMILIES[i]!, c));
          const ops = rules.map((r) => synOp(r.ruleId));
          const ref = runCost(rules, ops);
          for (const perm of permutations(ops)) {
            const f = runCost(rules, perm);
            expect(f?.status).toBe(ref?.status);
            expect(f?.winnerRef?.ruleId).toBe(ref?.winnerRef?.ruleId);
            expect(f?.delta).toEqual(ref?.delta);
          }
        },
      ),
    );
  });
});

// ------------------------------------------------------------ P3 confirmed cost winner
describe('P3 — the strictly cheaper of two confirmed candidates cannot lose', () => {
  it('cost A < cost B ⇒ A wins, BEST_CONFIRMED', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 40000 }),
        fc.integer({ min: 1, max: 10000 }),
        (a, gap) => {
          const A = fixedRule('A', 'IBK_PLIN', a);
          const B = fixedRule('B', 'DINERS', a + gap);
          const f = runCost([A, B], [synOp('A'), synOp('B')]);
          expect(f?.status).toBe('BEST_CONFIRMED');
          expect(f?.winnerRef?.ruleId).toBe('A');
          expect(f?.delta).toEqual({ kind: 'COST_CENTIMOS', amountCentimos: gap });
        },
      ),
    );
  });
});

// ------------------------------------------------------------ P4 exact equality
describe('P4 — two equal confirmed costs tie (never a first-candidate winner)', () => {
  it('cost A == cost B ⇒ CONFIRMED_TIE', () => {
    fc.assert(
      fc.property(fc.integer({ min: 100, max: 50000 }), (a) => {
        const f = runCost(
          [fixedRule('A', 'IBK_PLIN', a), fixedRule('B', 'DINERS', a)],
          [synOp('A'), synOp('B')],
        );
        expect(f?.status).toBe('CONFIRMED_TIE');
      }),
    );
  });
});

// ------------------------------------------------------------ P5 lower-cost monotonicity
describe('P5 — decreasing the unique winner’s cost keeps it the winner', () => {
  it('A already the unique winner and only A’s cost decreases ⇒ A still wins', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 200, max: 40000 }),
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 100 }),
        (a, gap, drop) => {
          const B = fixedRule('B', 'DINERS', a + gap);
          const before = runCost([fixedRule('A', 'IBK_PLIN', a), B], [synOp('A'), synOp('B')]);
          const after = runCost(
            [fixedRule('A', 'IBK_PLIN', Math.max(0, a - drop)), B],
            [synOp('A'), synOp('B')],
          );
          expect(before?.winnerRef?.ruleId).toBe('A');
          expect(after?.winnerRef?.ruleId).toBe('A');
          expect(after?.status).toBe('BEST_CONFIRMED');
        },
      ),
    );
  });
});

// ------------------------------------------------------------ P6 cashback independence
describe('P6 — varying future cashback never alters the immediate-cost comparison', () => {
  it('immediate winner / delta unchanged as the cashback value varies', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 9000 }),
        fc.integer({ min: 0, max: 100000 }),
        fc.integer({ min: 0, max: 100000 }),
        (fixedCost, cb1, cb2) => {
          // A: fixed immediate cost. B: cashback rule (immediate cost = full bill 10000).
          const mk = (cb: number) =>
            runCost(
              [fixedRule('A', 'IBK_PLIN', fixedCost), cashbackRule('B', 'DINERS', cb)],
              [synOp('A'), synOp('B')],
            );
          const r1 = mk(cb1);
          const r2 = mk(cb2);
          expect(r1?.status).toBe(r2?.status);
          expect(r1?.winnerRef?.ruleId).toBe(r2?.winnerRef?.ruleId);
          expect(r1?.delta).toEqual(r2?.delta);
        },
      ),
    );
  });
});

// ------------------------------------------------------------ P7 display-baseline independence
describe('P7 — a display-only compatible baseline never alters winner / status / delta', () => {
  it('only penSaved may change when the baseline changes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 20000 }),
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 20001, max: 60000 }),
        fc.integer({ min: 20001, max: 60000 }),
        (a, gap, base1, base2) => {
          const rules = [fixedRule('A', 'IBK_PLIN', a), fixedRule('B', 'DINERS', a + gap)];
          const ops = [synOp('A'), synOp('B')];
          const r1 = runCost(rules, ops, { baselineByScopeId: { syn_cost: base1 } });
          const r2 = runCost(rules, ops, { baselineByScopeId: { syn_cost: base2 } });
          expect(r1?.status).toBe(r2?.status);
          expect(r1?.winnerRef?.ruleId).toBe(r2?.winnerRef?.ruleId);
          expect(r1?.delta).toEqual(r2?.delta);
        },
      ),
    );
  });
});

// ------------------------------------------------------------ P8 LOW confidence safety
describe('P8 — a LOW-confidence candidate never becomes the confirmed winner', () => {
  it('a LOW-confidence cheapest candidate cannot be a participant winner', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 20000 }),
        fc.integer({ min: 1, max: 10000 }),
        (a, gap) => {
          // A cheaper but LOW confidence, B pricier but HIGH.
          const A = fixedRule('A', 'IBK_PLIN', a, { confidence: 'LOW' });
          const B = fixedRule('B', 'DINERS', a + gap);
          const f = runCost([A, B], [synOp('A'), synOp('B')]);
          expect(f?.winnerRef?.ruleId).not.toBe('A');
          expect(f?.status).toBe('BEST_CONFIRMED');
          expect(f?.winnerRef?.ruleId).toBe('B');
        },
      ),
    );
  });
});

// ------------------------------------------------------------ P9 provider-private safety
describe('P9 — provider-private YES/UNKNOWN never confirmed; NO never ranks', () => {
  it('a private candidate cannot be a confirmed/likely/tie winner', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<'YES' | 'NO' | 'UNKNOWN'>('YES', 'NO', 'UNKNOWN'),
        fc.integer({ min: 100, max: 9000 }),
        (state, privCost) => {
          const pub = fixedRule('PUB', 'IBK_PLIN', 9500);
          const priv = fixedRule('PRIV', 'BCP_QORE', privCost, {
            eligibilityClass: 'PROVIDER_PRIVATE',
            providerPrivateKey: 'qore_active',
          });
          const f = decide({
            rules: [pub, priv],
            operationalStates: [synOp('PUB'), synOp('PRIV')],
            scopes: [costScope()],
            portfolio: { ...PORTFOLIO, privateStates: { qore_active: state } },
            context: richCtx(),
            evaluatedAt: AT,
            intendedTransactionAt: AT,
          }).final;
          expect(f?.winnerRef?.ruleId).not.toBe('PRIV');
          const priorityBad = ['CONFIRMED_TIE', 'LIKELY'];
          if (f?.winnerRef?.ruleId === undefined) expect(priorityBad).not.toContain(f?.status);
          // The public candidate (or a safe status) governs; PRIV is only ever advisory/ineligible.
          expect(['BEST_CONFIRMED', 'NO_SAFE_WINNER', 'VERIFY_FIRST']).toContain(f?.status);
        },
      ),
    );
  });
});

// ------------------------------------------------------------ P10 unknown availability safety
describe('P10 — material UNKNOWN availability (not pre-verifiable) yields no false confirmed winner', () => {
  it('a cheaper unknown-availability candidate blocks confirmation', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 8000 }),
        fc.integer({ min: 1, max: 1000 }),
        (b, gap) => {
          const A = fixedRule('A', 'IBK_PLIN', b + gap); // pricier, available
          const B = fixedRule('B', 'DINERS', b); // cheaper, UNKNOWN availability
          const f = runCost([A, B], [synOp('A'), synOp('B', { availability: 'UNKNOWN' })]);
          expect(f?.status).toBe('NO_SAFE_WINNER');
          expect(f?.status).not.toBe('LIKELY');
          expect(f?.status).not.toBe('BEST_CONFIRMED');
        },
      ),
    );
  });
});

// ------------------------------------------------------------ P11 source-uncertainty safety
describe('P11 — a material non-fresh candidate is never silently dropped for a false confirmation', () => {
  it('a cheaper non-FRESH candidate prevents BEST_CONFIRMED', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<RuleOperationalState['sourceQualityState']>(
          'STALE',
          'INACCESSIBLE',
          'CONFLICTED',
          'UNKNOWN',
        ),
        fc.integer({ min: 100, max: 8000 }),
        fc.integer({ min: 1, max: 1000 }),
        (src, b, gap) => {
          const A = fixedRule('A', 'IBK_PLIN', b + gap);
          const B = fixedRule('B', 'DINERS', b);
          const f = runCost([A, B], [synOp('A'), synOp('B', { sourceQualityState: src })]);
          // A fresh rankable winner (A) coexists with a cheaper material non-fresh candidate (B) ⇒
          // the EXACT required result is NO_SAFE_WINNER (the SOURCE_* statuses only arise when the
          // rankable set is empty). B is never silently dropped to falsely confirm A.
          expect(f?.status).toBe('NO_SAFE_WINNER');
          expect(f?.candidates.find((c) => c.ruleRef.ruleId === 'B')?.couldChangeDecision).toBe(
            true,
          );
        },
      ),
    );
  });
});

// ------------------------------------------------------------ P12 equality is material (unique winner)
describe('P12 — an uncertain optimistic bound equal to a UNIQUE winner is decision-material', () => {
  it('unknown-cap optimistic == unique winner ⇒ couldChangeDecision = true ⇒ NO_SAFE_WINNER', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 40000 }),
        fc.integer({ min: 500, max: 5000 }),
        (bill, bps) => {
          // Unknown-cap percent A: optimistic cost = bill − floor(bill*bps/1e4). Fixed B set to equal it.
          const disc = Math.floor((bill * bps) / 10000);
          const optimistic = bill - disc;
          const A = percentRule('A', 'IBK_PLIN', bps, { cap: { kind: 'UNKNOWN_NOT_STATED' } });
          const B = fixedRule('B', 'DINERS', optimistic, {
            selector: 'WHOLE_BILL',
            signatureKind: 'ELIGIBLE_BILL',
          });
          const f = runCost([A, B], [synOp('A'), synOp('B')], {
            context: richCtx({ wholeBillCentimos: bill }),
          });
          const aCand = f?.candidates.find((c) => c.ruleRef.ruleId === 'A');
          expect(aCand?.couldChangeDecision).toBe(true);
          expect(f?.status).toBe('NO_SAFE_WINNER');
        },
      ),
    );
  });
});

// ------------------------------------------------------------ P13 worse-bound non-materiality
describe('P13 — an uncertain bound strictly worse than the winner does not block it', () => {
  it('unknown-cap optimistic > winner cost ⇒ winner stands, candidate non-material', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 20000 }),
        fc.integer({ min: 500, max: 3000 }),
        fc.integer({ min: 1, max: 500 }),
        (bill, bps, gap) => {
          const disc = Math.floor((bill * bps) / 10000);
          const optimistic = bill - disc; // A's best-case cost
          const winnerCost = optimistic - gap; // B strictly cheaper than A's best case
          const A = percentRule('A', 'IBK_PLIN', bps, { cap: { kind: 'UNKNOWN_NOT_STATED' } });
          const B = fixedRule('B', 'DINERS', winnerCost, {
            selector: 'WHOLE_BILL',
            signatureKind: 'ELIGIBLE_BILL',
          });
          const f = runCost([A, B], [synOp('A'), synOp('B')], {
            context: richCtx({ wholeBillCentimos: bill }),
          });
          expect(f?.status).toBe('BEST_CONFIRMED');
          expect(f?.winnerRef?.ruleId).toBe('B');
          expect(f?.candidates.find((c) => c.ruleRef.ruleId === 'A')?.couldChangeDecision).toBe(
            false,
          );
        },
      ),
    );
  });
});

// ------------------------------------------------------------ P14 nominal prerequisites
describe('P14 — nominal ranking requires same unit + known + equal cost + same scope', () => {
  const runNom = (rules: RuleVersion[]) =>
    decide({
      rules,
      operationalStates: rules.map((r) => synOp(r.ruleId, { availability: 'NOT_APPLICABLE' })),
      scopes: [nominalScope()],
      portfolio: PORTFOLIO,
      context: {
        merchantId: 'm_coney_park',
        nominalPackage: { cashAcquisitionCostCentimos: 4500, nominalUnit: 'CONEY_PLAY_BALANCE' },
      },
      evaluatedAt: AT,
      intendedTransactionAt: AT,
    }).final;

  it('equal known cost + same unit ⇒ ranks; breaking cost-equality or known-cost ⇒ NON_COMPARABLE', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 9000 }),
        fc.integer({ min: 1, max: 500 }),
        fc.integer({ min: 4000, max: 5000 }),
        (v, gap, cash) => {
          const ok = runNom([
            nominalRule('X', 'SIP_OH', v, cash, { merchantIds: ['m_coney_park'] }),
            nominalRule('Y', 'DINERS', v + gap, cash, { merchantIds: ['m_coney_park'] }),
          ]);
          expect(ok?.winnerRef?.ruleId).toBe('Y'); // higher nominal wins at equal cost

          const unequalCost = runNom([
            nominalRule('X', 'SIP_OH', v, cash, { merchantIds: ['m_coney_park'] }),
            nominalRule('Y', 'DINERS', v + gap, cash + 1, { merchantIds: ['m_coney_park'] }),
          ]);
          expect(unequalCost?.winnerRef).toBeUndefined();

          const unknownCost = runNom([
            nominalRule('X', 'SIP_OH', v, cash, { merchantIds: ['m_coney_park'] }),
            nominalRule('Y', 'DINERS', v + gap, undefined, { merchantIds: ['m_coney_park'] }),
          ]);
          expect(unknownCost?.winnerRef).toBeUndefined();

          // Different nominal units ⇒ non-comparable even at equal cost.
          const yOther = nominalRule('Y', 'DINERS', v + gap, cash, {
            merchantIds: ['m_coney_park'],
          });
          (yOther.benefit as { nominalUnit: string }).nominalUnit = 'OTHER_UNIT';
          const differentUnit = runNom([
            nominalRule('X', 'SIP_OH', v, cash, { merchantIds: ['m_coney_park'] }),
            yOther,
          ]);
          expect(differentUnit?.winnerRef).toBeUndefined();
        },
      ),
    );
  });
});

// ------------------------------------------------------------ P15 nominal / PEN separation
describe('P15 — a valid nominal comparison never emits a PEN rank delta', () => {
  it('the delta is NOMINAL_VALUE (or null), never COST_CENTIMOS; penSaved undefined', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 9000 }),
        fc.integer({ min: 1, max: 500 }),
        fc.integer({ min: 4000, max: 5000 }),
        (v, gap, cash) => {
          const f = decide({
            rules: [
              nominalRule('X', 'SIP_OH', v, cash, { merchantIds: ['m_coney_park'] }),
              nominalRule('Y', 'DINERS', v + gap, cash, { merchantIds: ['m_coney_park'] }),
            ],
            operationalStates: [
              synOp('X', { availability: 'NOT_APPLICABLE' }),
              synOp('Y', { availability: 'NOT_APPLICABLE' }),
            ],
            scopes: [nominalScope()],
            portfolio: PORTFOLIO,
            context: {
              merchantId: 'm_coney_park',
              nominalPackage: {
                cashAcquisitionCostCentimos: 4500,
                nominalUnit: 'CONEY_PLAY_BALANCE',
              },
            },
            evaluatedAt: AT,
            intendedTransactionAt: AT,
          }).final;
          if (f?.delta) expect(f.delta.kind).toBe('NOMINAL_VALUE');
          expect(f?.candidates.every((c) => c.penSavedCentimos === undefined)).toBe(true);
        },
      ),
    );
  });
});

// ------------------------------------------------------------ P16 scope isolation
describe('P16 — a spectacular candidate in a different scope cannot change the selected scope', () => {
  it('adding a scope-B blockbuster leaves scope A’s decision identical', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 20000 }),
        fc.integer({ min: 1, max: 5000 }),
        (a, gap) => {
          const scA = costScope('scA');
          const scB = costScope('scB');
          const A1 = fixedRule('A1', 'IBK_PLIN', a, { scopeRefs: ['scA'] });
          const A2 = fixedRule('A2', 'DINERS', a + gap, { scopeRefs: ['scA'] });
          const B1 = fixedRule('B1', 'SIP_OH', 1, { scopeRefs: ['scB'] }); // absurdly cheap, different scope
          const base = decide({
            rules: [A1, A2],
            operationalStates: [synOp('A1'), synOp('A2')],
            scopes: [scA],
            portfolio: PORTFOLIO,
            context: richCtx(),
            evaluatedAt: AT,
            intendedTransactionAt: AT,
            selectedScopeId: 'scA',
          }).final;
          const withB = decide({
            rules: [A1, A2, B1],
            operationalStates: [synOp('A1'), synOp('A2'), synOp('B1')],
            scopes: [scA, scB],
            portfolio: PORTFOLIO,
            context: richCtx(),
            evaluatedAt: AT,
            intendedTransactionAt: AT,
            selectedScopeId: 'scA',
          }).final;
          expect(withB?.status).toBe(base?.status);
          expect(withB?.winnerRef?.ruleId).toBe(base?.winnerRef?.ruleId);
          expect(withB?.delta).toEqual(base?.delta);
        },
      ),
    );
  });
});

// ------------------------------------------------------------ P17 merchant isolation
describe('P17 — a rule for a different merchant never influences the recommendation', () => {
  it('a foreign-merchant scope/rule does not change the context merchant’s decision', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 20000 }),
        fc.integer({ min: 1, max: 5000 }),
        (a, gap) => {
          const scHome = costScope('scHome', 'm_fridays');
          const scOther = costScope('scOther', 'm_issei');
          const A = fixedRule('A', 'IBK_PLIN', a, { scopeRefs: ['scHome'] });
          const B = fixedRule('B', 'DINERS', a + gap, { scopeRefs: ['scHome'] });
          const foreign = fixedRule('F', 'SIP_OH', 1, {
            merchantIds: ['m_issei'],
            scopeRefs: ['scOther'],
          });
          const base = decide({
            rules: [A, B],
            operationalStates: [synOp('A'), synOp('B')],
            scopes: [scHome],
            portfolio: PORTFOLIO,
            context: richCtx({ merchantId: 'm_fridays' }),
            evaluatedAt: AT,
            intendedTransactionAt: AT,
          }).final;
          const withForeign = decide({
            rules: [A, B, foreign],
            operationalStates: [synOp('A'), synOp('B'), synOp('F')],
            scopes: [scHome, scOther],
            portfolio: PORTFOLIO,
            context: richCtx({ merchantId: 'm_fridays' }),
            evaluatedAt: AT,
            intendedTransactionAt: AT,
          }).final;
          expect(withForeign?.status).toBe(base?.status);
          expect(withForeign?.winnerRef?.ruleId).toBe(base?.winnerRef?.ruleId);
          expect(withForeign?.delta).toEqual(base?.delta);
        },
      ),
    );
  });
});

// ------------------------------------------------------------ P18 minimum boundary
describe('P18 — minimum-spend boundary: min−1 ineligible, min & min+1 eligible', () => {
  it('preserves the frozen inclusive minimum-spend semantics', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1000, max: 40000 }), (min) => {
        const mk = (bill: number) =>
          runCost(
            [
              percentRule('A', 'IBK_PLIN', 2000, {
                minimumSpend: { minimumSpendCentimos: min, basis: 'WHOLE_BILL' },
              }),
            ],
            [synOp('A')],
            { context: richCtx({ wholeBillCentimos: bill }) },
          );
        expect(mk(min - 1)?.status).toBe('NO_APPLICABLE_BENEFIT'); // below ⇒ ineligible
        expect(mk(min)?.status).toBe('BEST_CONFIRMED'); // exactly meets
        expect(mk(min + 1)?.status).toBe('BEST_CONFIRMED'); // above
      }),
    );
  });
});

// ------------------------------------------------------------ P19 cap safety
describe('P19 — a known percentage discount equals the EXACT capped result (oracle)', () => {
  it('capped effective cost == bill − min(floor(bill*bps/1e4), cap) — not a loose inequality', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 500000 }),
        fc.integer({ min: 1, max: 9999 }),
        fc.integer({ min: 0, max: 200000 }),
        (bill, bps, capC) => {
          const f = runCost(
            [percentRule('A', 'IBK_PLIN', bps, { cap: { kind: 'AMOUNT', centimos: capC } })],
            [synOp('A')],
            { context: richCtx({ wholeBillCentimos: bill }) },
          );
          const rawDiscount = Number((BigInt(bill) * BigInt(bps)) / 10000n); // BigInt oracle
          const expected = bill - Math.min(rawDiscount, capC);
          // The assertion FAILS if the cap were removed (unlike the previous inequality), so the cap
          // is genuinely exercised.
          expect(f?.candidates[0]?.effectiveCostCentimos).toBe(expected);
        },
      ),
    );
  });
});

// ------------------------------------------------------------ P20 integer settlement (BigInt oracle)
describe('P20 — céntimo settlement is EXACT against an independent BigInt oracle', () => {
  it('the engine percent cost equals the BigInt oracle and is a safe integer (no FP artefacts)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
        fc.integer({ min: 1, max: 10000 }),
        (bill, bps) => {
          const f = runCost([percentRule('A', 'IBK_PLIN', bps, {})], [synOp('A')], {
            context: richCtx({ wholeBillCentimos: bill }),
          });
          const oracleDiscount = Number((BigInt(bill) * BigInt(bps)) / 10000n);
          const oracleCost = bill - oracleDiscount;
          const cost = f?.candidates[0]?.effectiveCostCentimos;
          return cost === oracleCost && cost !== undefined && Number.isSafeInteger(cost);
        },
      ),
    );
  });
});

// ---------------------------------------- P21 ELIGIBLE_BILL structural signature proof (RTM3-01)
describe('P21 — any purchaseDomain ≠ the scope signature makes the selected bill scope non-rankable', () => {
  it('a mismatched purchaseDomain never confirms an ELIGIBLE_BILL winner (selectedScopeId cannot override)', () => {
    // billScope() signature domain is RESTAURANT_BILL.
    const wrong = ['RESTAURANT_FOOD', 'SIT_DOWN_MEAL', 'CINEMA_CANDYBAR', 'UVK_OPERA'] as const;
    fc.assert(
      fc.property(
        fc.constantFrom(...wrong),
        fc.integer({ min: 100, max: 40000 }),
        (domain, bill) => {
          const f = decide({
            rules: [percentRule('A', 'IBK_PLIN', 2000, { scopeRefs: ['syn_bill'] })],
            operationalStates: [synOp('A')],
            scopes: [billScope('syn_bill')],
            portfolio: PORTFOLIO,
            context: { merchantId: 'm_fridays', purchaseDomain: domain, wholeBillCentimos: bill },
            evaluatedAt: AT,
            intendedTransactionAt: AT,
            selectedScopeId: 'syn_bill',
          }).final;
          return f?.status !== 'BEST_CONFIRMED' && f?.candidates.every((c) => !c.rankable) === true;
        },
      ),
    );
  });
});

// ---------------------------------------- P22 NOMINAL_PACKAGE structural signature proof (RTM3-01)
describe('P22 — any nominal-package unit/cost ≠ the scope signature makes the scope non-rankable', () => {
  const runNom = (nominalPackage: PurchaseContext['nominalPackage']) =>
    decide({
      rules: [
        nominalRule('X', 'SIP_OH', 8500, 4500, { merchantIds: ['m_coney_park'] }),
        nominalRule('Y', 'DINERS', 8600, 4500, { merchantIds: ['m_coney_park'] }),
      ],
      operationalStates: [
        synOp('X', { availability: 'NOT_APPLICABLE' }),
        synOp('Y', { availability: 'NOT_APPLICABLE' }),
      ],
      scopes: [nominalScope()],
      portfolio: PORTFOLIO,
      context: { merchantId: 'm_coney_park', ...(nominalPackage ? { nominalPackage } : {}) },
      evaluatedAt: AT,
      intendedTransactionAt: AT,
    }).final;

  it('a wrong acquisition cost (≠ 4500) never ranks', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000 }).filter((c) => c !== 4500),
        (cost) => {
          const f = runNom({
            cashAcquisitionCostCentimos: cost,
            nominalUnit: 'CONEY_PLAY_BALANCE',
          });
          return f?.winnerRef === undefined && f?.candidates.every((c2) => !c2.rankable) === true;
        },
      ),
    );
  });
  it('a wrong nominal unit never ranks', () => {
    const f = runNom({
      cashAcquisitionCostCentimos: 4500,
      nominalUnit: 'OTHER_UNIT' as NominalUnit,
    });
    expect(f?.winnerRef).toBeUndefined();
    expect(f?.candidates.every((c) => !c.rankable)).toBe(true);
  });
});

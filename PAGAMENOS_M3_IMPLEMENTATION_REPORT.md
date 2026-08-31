# PagaMenos — M3 Implementation Report

**Milestone:** M3 — Golden Fixtures, Property Testing & Adversarial Engine Gate
**Authorization:** M3 only. Baseline = M2 closure commit `c690b7d36e68b27abff3a264665b4a115acf2383`.
**Corpus:** `PAGAMENOS_VALIDATION_CORPUS_v1_2026-08-30T1800-0500` (frozen, unchanged).

---

## 1. M3 Verdict: **PASS**

The frozen Corpus v1 and the pure M2 evaluator were subjected to 12 canonical golden fixture groups
(explicit economic assertions), the Papa Johns cross-SKU negative regression, a synthetic
regular-price-baseline property, a 20-property fast-check program, an adversarial regression battery,
a decision-status vs candidate-advisory truth table, and mutation-like sanity checks. The suite
**exposed two genuine M2 engine defects** (tie-aware equality materiality; FIXED_PRICE ticket
settlement) which were fixed with minimal, regression-first corrections. **No corpus fact was
changed.** One **spec-vs-corpus discrepancy** (a literal Fridays CONFIRMED_TIE) was found to be
precluded by the frozen corpus and is documented, not fabricated. All seven repository gates exit 0.

## 2. Starting M2 closure SHA

`c690b7d36e68b27abff3a264665b4a115acf2383` (HEAD unchanged until the single M3 commit; M0–M2 not
amended).

## 3. Repository status before work

`git rev-parse HEAD` = `c690b7d…`, working tree **clean** — both preconditions satisfied. `src/engine`
held the M2 evaluator; `src/engine/golden/` did not exist. Corpus/prisma untouched throughout.

## 4. Golden-test architecture

New area `src/engine/golden/`:

- **`harness.ts`** — pulls FROZEN rule semantics/scopes/excluded-history by id from `CORPUS_V1`, and
  supplies a per-fixture **operational snapshot** (publication/source/availability) as the separate
  runtime axis of `decide()`. The corpus ships a conservative default (dynamic-stock promos default
  `availability = UNKNOWN`); a fixture exercising a confirmed economic comparison supplies a
  `CONFIRMED_AVAILABLE` snapshot exactly as a live source check would. **No corpus rule value is
  mutated.**
- **`synthetic.ts`** — TEST-ONLY builders (fixed/percent/cashback/nominal rules, cost/nominal scopes,
  operational snapshots) living entirely outside `CORPUS_V1`.
- **`canonical.test.ts`** — FIX01–FIX12 + REG-PJ-CROSS-SKU + SYN-REGULAR-BASELINE, explicit assertions.
- **`properties.test.ts`** — P1–P20 (fast-check, fixed seed, 500 runs each).
- **`adversarial.test.ts`** — §22 adversarial regressions + §23 status/advisory truth table.
- **`mutation-sanity.test.ts`** — §27 proofs that key invariants are load-bearing.

Explicit facts are the oracle (`expect(status).toBe(...)`, `winnerRef`, `effectiveCostCentimos`,
typed `delta`, advisories, `couldChangeDecision`). **No `toMatchSnapshot` is used anywhere.**

## 5. FIX01 — Chinawok simple winner — **PASS**

Scope `sc_cw_chijaukay_alopobre` (EFFECTIVE_OUT_OF_POCKET_COST). `CW-PLIN-01` fixed bundle **1590**
beats `CW-SIP-01` **1690**. `BEST_CONFIRMED`, winner Plin (IBK_PLIN), runner-up Sip, **delta
COST_CENTIMOS 100**.

## 6. FIX02 — Popeyes fixed bundle — **PASS**

Scope `sc_pop_6pcs_family_potato` (identical 6pc+family-potato signature). `POP-SIP-02` **2990** beats
`POP-BCP-01` **3990**. `BEST_CONFIRMED` SIP_OH, **delta COST_CENTIMOS 1000**.

## 7. FIX03 — Baco confirmed tie — **PASS (exposed M2 defect #1)**

Baco S/150 @ 20%. `BV-BCP-01`, `BV-SIP-01`, `BV-DIN-01` each pay **12000** (20% of 15000, cap 10000
non-binding) — a 3-way tie. `BV-IBK-01` has an **unknown cap**; its optimistic (uncapped) bound is
also 12000. **Expected `CONFIRMED_TIE`.** The M2 engine returned `NO_SAFE_WINNER`, because
`boundIsMaterial` used `minPlausibleCost <= winnerCost` unconditionally — an optimistic bound that
merely *equals* an **already-tied** winner cannot change the decision (it can only join, or not join,
a tie). Fixed (defect #1, §21). Now `CONFIRMED_TIE`; the IBK candidate carries `UNKNOWN_CAP` with
`couldChangeDecision = false`. No confirmed candidate was manufactured from the unknown cap; no
uncertainty was weakened.

## 8. FIX04 — Baco unknown cap blocks false winner — **PASS**

Baco S/1000 @ 20%. The capped candidates pay **90000** (20%=20000 capped to 10000). `BV-IBK-01`
uncapped optimistic **80000 < 90000** — it could STRICTLY beat the winner ⇒ genuinely material ⇒
`NO_SAFE_WINNER`, `UNKNOWN_CAP` advisory, `couldChangeDecision = true`. (Correct in M2; the tie-aware
fix does not touch strict-beat materiality.)

## 9. FIX05 — UVK amount switch — **PASS (exposed M2 defect #2)**

Scope `sc_uvk_2tickets`. `UVK-IBK-01` (2×1) pays `P`; `UVK-DIN-01` (`FIXED_PRICE 990` per ticket)
should pay **1980** total for 2 tickets. The M2 `FIXED_PRICE` handler ignored the ticket count and
returned the flat **990**, so Diners always won and the amount-switch never occurred. Fixed (defect
#2): a `FIXED_PRICE` over a `TICKET_UNIT` scope settles as `price × ticketCount`; an exact-bundle
`FIXED_PRICE` stays flat. Verified subcases:

| P | IBK 2×1 | Diners fixed | Result |
| --- | --- | --- | --- |
| 1800 | 1800 | 1980 | `BEST_CONFIRMED` IBK, delta 180 |
| 1980 | 1980 | 1980 | `CONFIRMED_TIE` |
| 2500 | 2500 | 1980 | `BEST_CONFIRMED` DINERS, delta 520 |

The winner recomputes from purchase context — no permanent provider winner attaches to the merchant.

## 10. FIX06 — Embarcadero day / channel switch — **PASS**

Scope `sc_embarcadero_food`, bill S/150. Weekday SALON: `EMB-DIN-01` 20% (**12000**) beats `EMB-IBK-01`
15% (**12750**), delta **750**. Weekend: Diners (MON-FRI) → `weekday not eligible` ⇒ IBK sole winner.
Pickup channel: Diners (SALON only) → `channel PICKUP not allowed` ⇒ IBK sole winner.

## 11. FIX07 — Perroquet basket composition — **PASS**

Scope `sc_perroquet_meal`; per-rule `eligibleSpendSelector` drives the winner. Case A (food 100,
non-alcoholic 20): Diners 30%×food (**9000**) beats BCP 20%×(food+drink) (**9600**), delta **600**.
Case B (food 100, non-alcoholic 60): BCP 20%×(food+drink) (**12800**) beats Diners 30%×food (**13000**),
delta **200**. The test fails if `eligibleSpendSelector` is ever moved to the shared scope.

## 12. FIX08 — Fridays location / calendar switch — **PASS (with documented discrepancy)**

Corpus fact: `FR-IBK-01` (`include:['airport']`) and `FR-SIP-01` (`exclude:['airport']`) have
**complementary, disjoint** locations and can **never co-apply**. A literal both-applicable
`CONFIRMED_TIE` between them (spec §13 first subcase) is therefore **precluded by the frozen corpus**
— a **spec-vs-corpus discrepancy**. Per §24 the corpus was **not altered**; the discrepancy is asserted
structurally (both offers are 25%; locations are disjoint) and documented here. The reconcilable
subcases pass:

- **airport, non-holiday** → Sip location-excluded ⇒ IBK sole winner, cost **11250** (25% of 15000).
- **airport, holiday** → IBK `holiday excluded` (holiday gate precedes location) AND Sip location-excluded ⇒ `NO_APPLICABLE_BENEFIT`.
- **ordinary location, holiday** → IBK `holiday excluded`, Sip (holiday NONE) sole winner, cost **11250**.

## 13. FIX09 — Fridays Qore provider-private overlay — **PASS**

Public Sip winner (`BEST_CONFIRMED`, cost 11250). `FR-QORE-01` (private 50%): `qore_active` UNKNOWN
**and** YES ⇒ `VERIFY_FIRST` advisory, non-rankable, `couldChangeDecision = true`, never
`BEST_CONFIRMED`/`LIKELY`/`CONFIRMED_TIE`; NO ⇒ `INELIGIBLE`. Decision status (public confirmed)
stays distinct from the candidate advisory.

## 14. FIX10 — Cineplanet excluded/stale Sip — **PASS**

Active `CIN-BCP-01`/`CIN-IBK-01` (both 50%, AMEX + socio membership) tie at **1000**
(`CONFIRMED_TIE`). Injecting the frozen excluded `CIN-SIP-STALE` (QUARANTINED + CONFLICTED, last-known
S/9.90) with its real operational state: it is rejected at publication (`publication QUARANTINED`),
`rankable = false`, never the winner — the cheaper stale row cannot hijack the result. The record was
not mutated to ACTIVE/FRESH.

## 15. FIX11 — Coney non-cash nominal value — **PASS**

Basis `NOMINAL_VALUE_SAME_UNIT`. Coney Park: `CON-SIP-01` 8500 vs `CON-DIN-P-01` 8500 at equal S/45
acquisition ⇒ `CONFIRMED_TIE`, `penSavedCentimos` undefined. Coney Active: `CON-SIP-01` 8500 vs
`CON-DIN-A-01` 8600 ⇒ `BEST_CONFIRMED` Diners, **delta `NOMINAL_VALUE` amountMinorUnits 100
CONEY_PLAY_BALANCE** (the corpus minor-unit representation of S/86 − S/85 = S/1), never a PEN delta,
`penSavedCentimos` undefined. No S/86 = balance-86 economic conversion is inferred.

## 16. FIX12 — Dynamic availability exit — **PASS**

Scope `sc_pop_6pcs_family_potato`, cheaper `POP-SIP-02`. Confirmed available ⇒ Sip wins. Confirmed
unavailable ⇒ Sip exits (`rejectionReason CONFIRMED_UNAVAILABLE`), BCP wins — attractive value cannot
keep an out-of-stock candidate in. UNKNOWN (material, not `preRedemptionVerifiable`) ⇒ `NO_SAFE_WINNER`,
`DYNAMIC_AVAILABILITY` advisory, `couldChangeDecision = true`. Pure-engine immutability: a previously
produced result object is byte-identical after a separate later evaluation, and the frozen rule inputs
are not mutated. (No M3.5 DB/historical reproduction claimed here.)

## 17. Papa Johns negative regression (REG-PJ-CROSS-SKU) — **PASS**

`PJ-BCP-01` (Large Classic, 2090, `sc_pj_large_classic`) and `PJ-PLIN-01` (Large Americana, 1390,
`sc_pj_large_americana`) share **no scope**. An underspecified Papa Johns context yields
`requiresScopeSelection = true`, `final = undefined`; each matched scope is single-offer; the forbidden
`Plin wins by S/7` (delta COST_CENTIMOS **700**) never appears. Selecting the Large Classic scope
returns only the BCP offer (2090), never the Plin SKU. This is a separate regression, **not** a 13th
canonical fixture.

## 18. Synthetic regular-baseline test (SYN-REGULAR-BASELINE) — **PASS**

TEST-ONLY same-purchase pair (actual payable A 1390 / B 2090; advertised baselines 2790/3290). Ranking
uses the actual permitted economic outcome (A wins, delta 700). Removing or absurdly varying the
provider-advertised baselines leaves winner/status/delta **unchanged**. A display-only common
`baselineByScopeId` changes only `penSavedCentimos`, never winner/status/delta. Not part of the 46
active rules.

## 19. Property-test inventory + run counts

fast-check, reproducible (`seed = 0x5011`), **500 runs/property** (§26; documented). P1 rule-order
invariance · P2 operational-state-order invariance · P3 confirmed cost winner · P4 exact equality tie
· P5 lower-cost monotonicity · P6 cashback independence · P7 display-baseline independence · P8 LOW
confidence safety · P9 provider-private safety · P10 unknown-availability safety · P11 source-uncertainty
safety · P12 equality-is-material (unique winner) · P13 worse-bound non-materiality · P14 nominal
prerequisites · P15 nominal/PEN separation · P16 scope isolation · P17 merchant isolation · P18
minimum-spend boundary (min−1/min/min+1) · P19 cap safety · P20 integer settlement. **20/20 pass.**

## 20. Adversarial-test inventory

false winner from input order · false tie from rounding · false winner from unknown cap · false winner
from stale last-known value · false winner from missing basket · cross-scope high saving · private Qore
YES stays advisory · source UNKNOWN ⇒ NO_SAFE_WINNER (not SOURCE_STALE) · same nominal unit + unequal
cash cost ⇒ NON_COMPARABLE · different nominal units ⇒ non-comparable · non-finite/negative money
fails closed. Plus the §23 truth table T1–T4 (see §21) and §27 mutation-sanity checks. **All pass.**

## 21. M2 defects discovered

1. **Tie-aware equality materiality (FIX03).** `boundIsMaterial` treated an optimistic bound equal to
   the winner as material even when the winner set was already a tie, forcing a false `NO_SAFE_WINNER`
   where the correct decision is `CONFIRMED_TIE`.
2. **FIXED_PRICE ticket settlement (FIX05).** The `FIXED_PRICE` benefit handler ignored the ticket
   count for a `TICKET_UNIT` scope, so a per-ticket fixed price was not multiplied by the number of
   tickets (Diners UVK returned 990 instead of 1980).

Truth-table note (§23): the engine's RT-05 conservatism makes **every** STALE candidate
`UNKNOWN_OR_UNBOUNDED` (always material), so a "non-material stale candidate" (T3 as literally worded)
does not arise; the winner-stands-with-advisory case is demonstrated instead via a pricier
UNKNOWN-availability candidate (bound = its own FRESH cost, strictly worse ⇒ non-material). Documented,
not a defect.

## 22. Engine corrections made

- **`src/engine/decide.ts`** — (a) `boundIsMaterial` now takes `winnerIsTie` and treats a bound equal
  to the winner as material **only when the winner is unique** (both cost and nominal bases); the
  rounding-ambiguity blocker uses the same rule. (b) `FIXED_PRICE` over a `TICKET_UNIT` scope settles
  as `price × ticketCount` (with a missing-`ticketCount` guard), else stays the flat bundle price.
- **`src/engine/money.ts`** — added `fixedPriceTicketCostCentimos(price, count)` (integer,
  fail-closed on a non-positive count / negative price).

Both corrections were made regression-first (the golden fixtures were written expecting the correct
outcome, observed to fail against the M2 engine, then fixed). All 63 pre-existing M2 engine tests
still pass unchanged.

## 23. Corpus mutation audit

`git diff --stat c690b7d… -- src/corpus prisma` is **empty** — **zero** changes to corpus data, types,
schema, or prisma. `pnpm corpus:validate` re-verified all frozen counts: merchants **14** (food 10 /
ent 4), active rules **46**, providers **16 / 12 / 10 / 8**, provider-private **2**, overlap O2 8 · O3
2 · O4 4, decision CORE 7 · ASSIST 3 · DIRECTORY 4, excluded history 1, stale Cineplanet active
`false`. No corpus type/schema change was required in M3.

## 24. Purity audit

`src/engine/golden/` imports only `@/corpus`, `../{decide,types,errors}`, and (test-only)
`fast-check`/`vitest`. No db/app/analytics/sourcemon/services, Next, React, Prisma, `fs/net/http/
process/env`, git metadata. The production engine changes add no new imports beyond a local `./money`
helper. The mechanical boundary test (`src/lib/boundary.test.ts`) and the ESLint pure-layer rules
remain green.

## 25. Exact verification commands / results

| Command | Result |
| --- | --- |
| `pnpm lint` | OK (exit 0) |
| `pnpm typecheck` | OK (exit 0) |
| `pnpm test` | **192 passed / 10 files** (exit 0) |
| `pnpm corpus:validate` | **PASS** — schema OK · lint 0 errors · all frozen counts match |
| `pnpm build` | OK (exit 0) |
| `pnpm db:validate` | OK — schema valid |
| `pnpm format:check` | OK — all files match Prettier |

Separately: canonical fixture groups **12 / 12 passing**; Papa Johns regression **PASS**; synthetic
regular-baseline **PASS**; property suite **20/20 PASS**; adversarial suite **PASS**.

## 26. Total test count

**192 tests / 10 files.** M3 added **80**: canonical 40 · properties 20 · adversarial+truth-table 16 ·
mutation-sanity 4. (Prior 112 = 49 M0/M1 baseline + 63 M2 engine, unchanged.)

## 27. Files changed

**New:** `src/engine/golden/{harness,synthetic}.ts`,
`src/engine/golden/{canonical,properties,adversarial,mutation-sanity}.test.ts`,
`PAGAMENOS_M3_IMPLEMENTATION_REPORT.md`.
**Modified:** `src/engine/decide.ts`, `src/engine/money.ts` (the two engine corrections).
**Unchanged:** all of `src/corpus`, `prisma`, `package.json`, CI config.

## 28. Final git status

After the M3 commit: clean. `src/corpus` and `prisma` untouched (audit §23).

## 29. M3 commit SHA

A single M3 commit as a child of the M2 closure baseline (M0–M2 not amended); recorded via
`git rev-parse HEAD` in the finalization summary. Not pushed.

## 30. Unresolved warnings

- **FIX08 tie subcase** is precluded by the frozen corpus (complementary Fridays airport locations) —
  a spec-vs-corpus discrepancy, corpus left unaltered (§12). The reconcilable location/calendar
  subcases are fully asserted.
- **Truth-table T3** ("non-material stale") is not reachable given RT-05 (all stale candidates are
  unbounded ⇒ always material); the winner-stands-with-advisory behaviour is proven via
  UNKNOWN-availability instead (§21).
- Pre-redemption verifiability remains a rule semantic that **no** active Corpus-v1 rule sets, so
  FIX12's material UNKNOWN-availability path is conservatively `NO_SAFE_WINNER` (correct per the
  frozen contract).

## 31. Exact recommended next action

Submit this report and the single M3 commit to the **independent code red-team by Codex Sol** against
the actual M0–M3 repository. **Do not begin M3.5** (persistence), Prisma domain schema, participant
UI, auth, analytics, source monitor, or any later milestone.

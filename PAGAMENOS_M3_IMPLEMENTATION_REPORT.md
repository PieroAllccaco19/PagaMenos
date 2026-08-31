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

---

# M3 RED-TEAM CLOSURE PATCH (Codex Sol "C — M3 NO-GO" remediation)

Independent verdict remediated: **CRITICAL 1 · HIGH 6 · MEDIUM 6**. This closure patch fixes the
CRITICAL, all six HIGH, and the three interacting MEDIUM findings (RTM3-10/11/13). No M3.5 work; no
architecture redesign. **Independent acceptance is NOT claimed here** — this records the remediation
for re-review.

## C.1 Closure verdict

**PATCH COMPLETE — READY FOR RE-REVIEW.** Starting M3 SHA `3cf8663882688a7a2854cf20ff70c36643fccbde`,
working tree clean. All seven gates exit 0; **229 tests / 11 files**; corpus reconciliation PASS
(14 / 46 / 16·12·10·8 / private 2 / O2 8·O3 2·O4 4 / CORE 7·ASSIST 3·DIRECTORY 4).

## C.2 RTM3 closure matrix

| ID | Sev | Status | Evidence |
| --- | --- | --- | --- |
| RTM3-01 runtime PurchaseSignature | CRITICAL | **CLOSED** | `matchPurchaseSignature` gate in `evaluateScope`; `PurchaseContext.exactItems` + `ticketClass` replace the `hasExactBundle` boolean; `rtm3-closure.test.ts` (exact-bundle false / missing / true; UVK count 1·2·3; class correct/wrong/missing; PJ cross-SKU; selected-scope safety) |
| RTM3-02 Fridays corpus fidelity | HIGH | **CLOSED** | FR-IBK-01 airport-only restriction removed (§C.4); FIX08 restored to tie / airport→IBK / holiday→Sip; counts reconcile |
| RTM3-03 tie / top-set materiality | HIGH | **CLOSED** | equality is material again (`boundMateriality`); `couldImproveBestOutcome` vs `couldChangeTopSet`; `confirmedTopRuleRefs` / `possibleAdditionalTopRuleRefs` / `topSetComplete`; FIX03 = CONFIRMED_TIE with IBK material & top set incomplete; unique-winner-tieable ⇒ NO_SAFE_WINNER |
| RTM3-04 monetary validation | HIGH | **CLOSED** | `assertSafeCentimos` (isSafeInteger); `percentBps ∈ (0,10000]`; BigInt multiply/divide; negative-cost throw; subtotal consistency |
| RTM3-05 canonical identity | HIGH | **CLOSED** | `buildValidatedOpMap` rejects duplicate rule/scope ids, duplicate/orphan op states; missing evaluated-rule state throws; `CanonicalInputError` |
| RTM3-06 strict instant parsing | HIGH | **CLOSED** | `parseStrictInstantMs` (corpus/instant.ts) requires a zone; rejects offsetless & impossible dates; wired into `epochMs`, `decide()`, and the corpus schema's LOCAL_DATETIME_RANGE |
| RTM3-07 provider-scoped eligibility | HIGH | **CLOSED** | family-scoped network/tier; held instrument beats declaration; family-keyed declarations (`network:<FAMILY>:AMEX`) |
| RTM3-10 combined uncertainty | MEDIUM | **CLOSED** | `isUserResolvable` requires EVERY material axis resolvable (source/cap/combinability/holiday/missing unresolvable; availability iff pre-verifiable; private resolvable) |
| RTM3-11 subtotal / safe-int | MEDIUM | **CLOSED** | folded into RTM3-04 (`validateContextMoney`, `assertSafeCentimos`) |
| RTM3-13 replace weak tests | MEDIUM | **CLOSED** | P20 + a dedicated BigInt oracle; non-negative property invokes `decide`; P11 exact; P14 adds different-units; P19 exact capped result; duplicate-key tested as invalid input |
| RTM3-25 unknown-source explanation | (within 10) | **CLOSED** | a non-FRESH candidate always carries an explicit `rejectionReason` |

## C.3 Deferred MEDIUM register (still valid, NOT closed)

- **RTM3-08** independently-current bound for a stale source — **DEFERRED — BEFORE WAVE 0 /
  SOURCE-PROOF INTEGRATION.** Conservative consequence acknowledged: every non-FRESH candidate stays
  `UNKNOWN_OR_UNBOUNDED` ⇒ always material.
- **RTM3-09** explicit per-ticket vs total ticket fixed-price semantics — **DEFERRED — BEFORE ADDING
  ANY NEW TICKET FIXED-PRICE RULE.** UVK current behaviour (per-ticket × count) remains tested (FIX05).
- **RTM3-12** typed compatible-baseline evidence — **DEFERRED — BEFORE SAVINGS DISPLAY / M7.** Ranking
  remains independent of the display baseline (P7, SYN-REGULAR-BASELINE).

## C.4 Fridays correction (RTM3-02)

Authoritative Phase 0A-1B row (line 172): *"salon/takeaway; international airport included; …"* and
the fixture table (347–349): ordinary-day tie, airport→Interbank, holiday→Sip.

```
FR-IBK-01 before:  constraints.locations = { include: ['airport'] }   // wrongly airport-ONLY
FR-IBK-01 after :  (no `locations` field)                             // airport INCLUDED among ordinary locations
```

Reason: a factual **transcription** correction against already-frozen evidence (not a post-freeze
campaign change). Only this one row changed in `src/corpus/data`; all frozen counts reconcile.

## C.5 Runtime PurchaseSignature solution (RTM3-01)

`PurchaseContext` now carries `exactItems?: CanonicalItemQty[]` and `ticketClass?: string` (the
boolean `hasExactBundle` is removed). `matchPurchaseSignature(scope.signature, context)` runs once per
scope and is total over the four kinds: EXACT_BUNDLE normalizes runtime items with the M1 rules and
requires exact `(itemKey, qty)` equality (absent ⇒ MISSING_CONTEXT, mismatch ⇒ scope not applicable);
TICKETS requires `ticketCount` and `ticketClass` to equal the signature; ELIGIBLE_BILL / NOMINAL_PACKAGE
match by merchant (composition is not the promotion identity). A NO_MATCH scope's rules never rank; a
selected scope that does not match is not evaluated economically (no BEST_CONFIRMED from a mismatch).

## C.6 Tie / top-set solution (RTM3-03 §7–§11)

Two questions are tracked per candidate: `couldImproveBestOutcome` (bound strictly beats the best) and
`couldChangeTopSet` (bound equal-or-beats the best); `couldChangeDecision = couldChangeTopSet`.
Equality is always material. Status: a strict-improver ⇒ NO_SAFE_WINNER; an equal-only candidate ⇒
NO_SAFE_WINNER against a **unique** winner, but tolerated against an **existing tie** (the tie merely
widens). The result exposes `confirmedTopRuleRefs`, `possibleAdditionalTopRuleRefs`, and
`topSetComplete`, so a tie is never misrepresented by a lexicographic singular `winnerRef`. FIX03 Baco
S/150 ⇒ `CONFIRMED_TIE`, confirmed top `[BV-BCP-01, BV-DIN-01, BV-SIP-01]`, possible-additional
`[BV-IBK-01]`, `topSetComplete = false`, IBK `couldChangeDecision = true` / `couldImproveBestOutcome =
false`. FIX04 (strict beat) and the unique-winner-tieable case ⇒ NO_SAFE_WINNER.

## C.7 Monetary-validation solution (RTM3-04/11)

`assertSafeCentimos` (`Number.isSafeInteger` + non-negative) guards every settlement input and every
participant-rankable cost. `percentBps` must be in `(0, 10000]`. `percentDiscountCentimos` and the
ticket/2×1 helpers use **BigInt** for multiply/divide with a safe-range bound-check, so the prior
`MAX_SAFE_INTEGER` rounding defect is impossible (proven by a BigInt oracle to `Number.MAX_SAFE_INTEGER`).
`validateContextMoney` enforces `food ≤ bill`, `nonAlcoholic ≤ bill`, `food + nonAlcoholic ≤ bill`; a
negative payable throws (never clamps). The exact Fridays counterexample (`wholeBill 1000, food 10000`)
fails closed.

## C.8 Identity-validation solution (RTM3-05)

`buildValidatedOpMap` rejects a duplicate `(ruleId, version)` or `scopeId`, a duplicate operational
state (no last-write-wins), and an operational state referencing no supplied rule; `decide()` then
requires exactly one operational state per evaluated rule. All raise `CanonicalInputError`. After
validation, array order is irrelevant (P1/P2). Duplicate/missing identities are covered as invalid
input in `rtm3-closure.test.ts` (both input orders).

## C.9 Strict-time solution (RTM3-06)

`parseStrictInstantMs` requires `YYYY-MM-DDThh:mm:ss[.fff](Z|±HH:MM)`, validates month/day-in-month
(leap-aware)/hour/minute/second/offset, and computes the epoch itself (no `Date.parse`). `epochMs`
uses it (so temporal evaluation and LOCAL_DATETIME_RANGE endpoints are strict), `decide()` validates
`evaluatedAt`/`intendedTransactionAt` up front, and the corpus schema validates serialized datetime
endpoints. `2026-02-30`, `2026-09-01`, `2026-09-01T00:00:00`, and non-leap `2026-02-29` are rejected;
offset and `Z` instants (incl. the Lima 05:00Z boundary) are accepted.

## C.10 Family-scoped eligibility solution (RTM3-07)

`resolveNetwork`/`resolveTier` consider only instruments of the rule's provider family; a held family
instrument with a defined, contradictory value returns NO (an instrument fact beats any declaration);
declarations are family-scoped (`network:<FAMILY>:<VALUE>`). IBK-Visa + BCP-AMEX (+ a global AMEX
declaration) ⇒ an IBK-AMEX promotion is **ineligible**; IBK-AMEX + BCP-Visa ⇒ eligible; membership
(a merchant-loyalty fact) stays provider-independent. FIX10 still passes via per-family AMEX instruments.

## C.11 Combined-uncertainty solution (RTM3-10)

`isUserResolvable` is now conjunctive: a candidate is user-resolvable only if **every** material axis
is resolvable before payment. Source quality, unknown cap, unknown combinability, holiday uncertainty,
and missing context are unresolvable; availability is resolvable iff `preRedemptionVerifiable`;
provider-private is resolvable. Availability-UNKNOWN (pre-verifiable) **plus** source-UNKNOWN ⇒
NO_SAFE_WINNER (the source axis is not masked); availability-UNKNOWN (pre-verifiable) **plus**
source-FRESH ⇒ the public winner stands with a `DYNAMIC_AVAILABILITY` advisory. A source-UNKNOWN
candidate always carries an explicit `rejectionReason` (RTM3-25).

## C.12 Golden results

FIX01–FIX12 all pass; FIX03 reconciled with top-set semantics; FIX05 valid; **FIX08 restored** to the
authoritative ordinary-tie / airport→IBK / holiday→Sip behaviour; **FIX09** evaluates the Qore overlay
against the complete public set (IBK + Sip tie) with Qore advisory. REG-PJ-CROSS-SKU protects runtime
(a Classic purchase cannot match the Americana scope). SYN-REGULAR-BASELINE and the truth table pass.
No canonical fixture remains a spec/corpus conflict.

## C.13 Property / adversarial corrections (RTM3-13)

P20 rewritten as a BigInt oracle equality over safe-integer bills; the non-negative property invokes
`decide`; P11 asserts exactly NO_SAFE_WINNER; P14 adds the different-units case; P19 asserts the exact
capped result (fails if the cap were removed); duplicate-key behaviour is a separate invalid-input
regression. New file `rtm3-closure.test.ts` adds targeted regressions for RTM3-01/04/05/06/07/10.

## C.14 Corpus reconciliation

Unchanged: merchants **14** (food 10 / ent 4), active rules **46**, providers **16 / 12 / 10 / 8**,
provider-private **2**, overlap O2 8 · O3 2 · O4 4, decision CORE 7 · ASSIST 3 · DIRECTORY 4, excluded
history 1. The only `src/corpus/data` change is the FR-IBK-01 location removal (§C.4).

## C.15 Exact quality-gate results

`pnpm lint` · `typecheck` · `test` (**229 / 11 files**) · `corpus:validate` (PASS) · `build` ·
`db:validate` · `format:check` — all exit 0.

## C.16 Purity audit

`src/engine` and `src/corpus` remain free of db/app/analytics/sourcemon/services, Next, React, Prisma,
`fs/net/http/process/env`, and `Date.parse` (the two `Date.parse` mentions are comments documenting its
removal). `corpus/instant.ts` is pure. The boundary test stays green.

## C.17 Files changed (closure patch)

**New:** `src/corpus/instant.ts`, `src/engine/golden/rtm3-closure.test.ts`.
**Modified (engine):** `decide.ts`, `eligibility.ts`, `errors.ts`, `money.ts`, `time.ts`, `types.ts`.
**Modified (corpus):** `data/rules.ts` (FR-IBK-01 only), `index.ts` (export), `schema.ts` (strict
instant). **Modified (tests):** `engine.test.ts`, `golden/{harness,synthetic,canonical,properties,
adversarial,mutation-sanity}.ts`. **Report:** this section.

## C.18 Next action

Submit the closure commit for **independent Codex Sol re-review**. Do not begin M3.5.

---

# M3 SECOND RED-TEAM CLOSURE PATCH (Codex Sol recheck "C — NO-GO" remediation)

The independent Codex Sol closure **recheck** of `95d7255…` returned **C — M3 NO-GO** with three
findings still PARTIAL: **RTM3-01 CRITICAL**, **RTM3-03 HIGH**, **RTM3-11 MEDIUM**. All other
previously blocking findings stayed CLOSED; no new CRITICAL/HIGH. This second, narrow patch closes
the three. Independent acceptance is **not** claimed. Chronology: first closure (`95d7255`) did **not**
pass the recheck; this patch is the follow-up.

## D.1 Second-closure verdict

**PATCH COMPLETE — READY FOR RE-REVIEW.** Starting SHA `95d7255be8be2a79895e0e91f86f70a969ce912f`,
working tree clean. All seven gates exit 0; **254 tests / 11 files**; corpus reconciliation PASS
(14 / 46 / 16·12·10·8 / private 2 / O2 8·O3 2·O4 4 / CORE 7·ASSIST 3·DIRECTORY 4). No factual corpus
change (`git diff 95d7255 -- src/corpus/data` empty).

## D.2 RTM3 recheck matrix

| ID | Sev | Status | Evidence |
| --- | --- | --- | --- |
| RTM3-01 runtime PurchaseSignature | CRITICAL | **CLOSED** | matcher now proves ALL FOUR kinds — ELIGIBLE_BILL via `purchaseDomain`, NOMINAL_PACKAGE via `nominalPackage` (cost+unit); no merchant-only branch; UVK candy-bar/opera and Coney exploits fail closed; selectedScopeId invariant across families |
| RTM3-03 tie API | HIGH | **CLOSED** | `winnerRef`/`runnerUpRef` omitted for CONFIRMED_TIE (and all non-unique statuses); tie truth is `confirmedTopRuleRefs`/`possibleAdditionalTopRuleRefs`/`topSetComplete`; a deterministic representative stays internal (never exposed as the winner) |
| RTM3-11 nominal safe-integer | MEDIUM | **CLOSED** | corpus schema requires safe integers for `nominalMinorUnits`, `cashAcquisitionCostCentimos` (benefit + signature); runtime rejects unsafe nominal minor units / acquisition cost / context package cost; nominal rank delta asserted safe |

Deferred (unchanged, still valid): **RTM3-08** (BEFORE WAVE 0 / SOURCE-PROOF INTEGRATION), **RTM3-09**
(BEFORE ANY ADDITIONAL TICKET FIXED-PRICE RULE), **RTM3-12** (BEFORE PREDICTED SAVINGS DISPLAY / M7).
Not claimed closed. No other CLOSED finding's behaviour changed (only fixture context updates required
by the new proofs).

## D.3 RTM3-01 final implementation (all four signature kinds runtime-verifiable)

`matchPurchaseSignature` is an exhaustive switch with no merchant-only shortcut:

- **EXACT_BUNDLE** — runtime `exactItems` normalized and compared item-for-item (unchanged).
- **TICKETS** — runtime `ticketCount` + `ticketClass` equal the signature (unchanged).
- **ELIGIBLE_BILL** — merchant AND runtime `purchaseDomain` (reusing the frozen `PurchaseDomain` type)
  equal the signature; absent ⇒ MISSING_CONTEXT, different ⇒ scope not applicable.
- **NOMINAL_PACKAGE** — merchant AND runtime `nominalPackage` (`cashAcquisitionCostCentimos` +
  `nominalUnit`) equal the signature; absent ⇒ MISSING_CONTEXT, mismatch ⇒ not applicable.

`selectedScopeId` selects only among runtime-matching scopes; it never validates a mismatch (tested
for EXACT_BUNDLE, ELIGIBLE_BILL, TICKETS, NOMINAL_PACKAGE). The frozen NOMINAL_PACKAGE signature
(merchant + cost + unit) uniquely distinguishes every current Coney package, so no speculative
`packageId` was added.

## D.4 ELIGIBLE_BILL runtime-proof behaviour (UVK exploit closed)

Real Corpus-v1 UVK bill scopes `sc_uvk_combos` (CINEMA_CANDYBAR) and `sc_uvk_opera` (UVK_OPERA) can no
longer be confused: `purchaseDomain = CINEMA_CANDYBAR` evaluates the candy-bar scope and yields NO
winner if the opera scope is selected (and vice-versa); a missing `purchaseDomain` ⇒ MISSING_CONTEXT
for either. Perroquet's two per-rule subtotal selectors remain one valid `SIT_DOWN_MEAL` domain (FIX07
unchanged). All ELIGIBLE_BILL fixtures now supply their real corpus domain (Baco RESTAURANT_BILL,
Embarcadero/Fridays RESTAURANT_FOOD, Perroquet SIT_DOWN_MEAL).

## D.5 NOMINAL_PACKAGE runtime-proof behaviour (Coney exploit closed)

Coney Active with merchant only no longer returns a false `BEST_CONFIRMED CON-DIN-A-01`; Coney Park no
longer a false `CONFIRMED_TIE`. Missing `nominalPackage` ⇒ MISSING_CONTEXT; the correct package
(S/45, `CONEY_PLAY_BALANCE`) ⇒ normal evaluation (Active → BEST_CONFIRMED Diners, Park → CONFIRMED_TIE);
a wrong acquisition cost or unit ⇒ NO_MATCH (no nominal candidate ranks).

## D.6 selectedScopeId mismatch behaviour

Frozen invariant, tested per family: a selected scope whose signature does not match the runtime
purchase is never confirmed — PJ Classic items + selected Americana scope (EXACT_BUNDLE); UVK candy-bar
domain + selected opera scope (ELIGIBLE_BILL); ticketCount 1 + selected 2-ticket scope (TICKETS); wrong
package + selected Coney scope (NOMINAL_PACKAGE). Each yields no `BEST_CONFIRMED` and `winnerRef`
undefined.

## D.7 RTM3-03 tie API correction

`winnerRef` now denotes a UNIQUE confirmed best only (`hasUniqueWinner = (BEST_CONFIRMED | LIKELY) &&
!tie`). For `CONFIRMED_TIE` — and every non-unique status — `winnerRef` and `runnerUpRef` are omitted;
truth is `confirmedTopRuleRefs` / `possibleAdditionalTopRuleRefs` / `topSetComplete`. The
lexicographic representative used internally for determinism is never exposed as the winner. Tie
regressions assert `winnerRef === undefined` for Baco S/150, ordinary Fridays, and Coney Park; unique
winners (Chinawok / Popeyes / Coney Active) keep `winnerRef`.

## D.8 RTM3-11 nominal safe-integer correction

Corpus Zod schema: `nominalMinorUnits` and every `cashAcquisitionCostCentimos` (benefit + NOMINAL_PACKAGE
signature) must satisfy `Number.isSafeInteger` (a shared `safeInt` refinement — `z.number().int()`
alone accepts values above 2^53−1). Runtime: the nominal grouping rejects an unsafe/negative/fractional
`nominalMinorUnits` or `cashAcquisitionCostCentimos`; `validateContextMoney` rejects an unsafe
`nominalPackage.cashAcquisitionCostCentimos`; and the nominal rank delta is asserted to be a safe
integer. `NaN`/`Infinity`/`MAX_SAFE_INTEGER+1`/negative/fractional all fail closed — no
`BEST_CONFIRMED`/`CONFIRMED_TIE` from unsafe nominal input. All frozen Coney rows remain valid.

## D.9 Tests added / updated

**New regressions** (`rtm3-closure.test.ts`): ELIGIBLE_BILL domain (UVK candy-bar/opera + missing);
NOMINAL_PACKAGE (Coney Active/Park missing/correct/wrong-cost/wrong-unit); selectedScopeId TICKETS
mismatch; nominal safe-integer runtime rejections. **New properties** (`properties.test.ts`): P21
(ELIGIBLE_BILL domain mismatch ⇒ non-rankable), P22 (nominal unit/cost mismatch ⇒ non-rankable).
**New schema tests** (`schema.test.ts`): nominal `MAX_SAFE_INTEGER+1`/negative/fractional rejected for
minor units, benefit cost, and signature cost; frozen Coney rows accepted. **Updated fixtures**: every
ELIGIBLE_BILL context supplies its real `purchaseDomain`; every nominal context supplies its
`nominalPackage`; tie tests assert `winnerRef === undefined`. Suite: **254 tests / 11 files** (was 229).

## D.10 Canonical fixture results

FIX01–FIX12 all pass with explicit signature proof; REG-PJ-CROSS-SKU and SYN-REGULAR-BASELINE pass;
no expected outcome weakened. Ties (FIX03, FIX08 ordinary, FIX11 Park) now assert `winnerRef` absent.

## D.11 Corpus reconciliation

Unchanged: 14 / 46 / 16·12·10·8 / private 2 / O2 8·O3 2·O4 4 / CORE 7·ASSIST 3·DIRECTORY 4. `git diff
95d7255 -- src/corpus/data` is empty (schema/type/test changes only).

## D.12 Exact quality-gate results

`pnpm lint` · `typecheck` · `test` (**254 / 11 files**) · `corpus:validate` (PASS) · `build` ·
`db:validate` · `format:check` — all exit 0.

## D.13 Files changed (second closure)

**Modified (engine):** `decide.ts`, `types.ts`, `index.ts`. **Modified (corpus):** `schema.ts`,
`schema.test.ts`. **Modified (tests):** `engine.test.ts`, `golden/{harness,canonical,properties,
adversarial,rtm3-closure}.ts`. **Report:** this section. No `src/corpus/data` change.

## D.14 Next action

Submit the second-closure commit for **independent Codex Sol re-review**. Do NOT begin M3.5. Do NOT
self-declare M3 accepted.

---

# M3 FINAL MICRO-CLOSURE (RTM3-11 nominal positivity)

The independent Codex Sol final second-closure recheck of `e4c7105…` returned **B — ONE FINAL
MICRO-PATCH**: RTM3-01 (CRITICAL) and RTM3-03 (HIGH) are CLOSED; the sole remaining blocker was
RTM3-11 (MEDIUM) PARTIAL, because the runtime accepted `nominalMinorUnits = 0` / `-1` even though the
corpus schema requires a positive value. This micro-closure aligns the runtime with the schema.
Independent acceptance is **not** claimed.

Chronology (unchanged): `3cf8663` → C · `95d7255` → C · `e4c7105` → B · this micro-closure → pending
independent confirmation.

## E.1 RTM3-11 status: **CLOSED**

Runtime `nominalMinorUnits` now enforces the same positivity invariant as the schema
(`Number.isSafeInteger(v) && v > 0`); `0`, negatives, `NaN`, `Infinity`, fractional, and unsafe
integers fail closed and can never yield `BEST_CONFIRMED` / `CONFIRMED_TIE` / `LIKELY`. The
`cashAcquisitionCostCentimos` contract (safe integer ≥ 0 — zero is a valid céntimo cost) is unchanged.

## E.2 Exact runtime guard (`src/engine/decide.ts`, nominal grouping)

```ts
if (
  w.nominalMinorUnits !== undefined &&
  (!Number.isSafeInteger(w.nominalMinorUnits) || w.nominalMinorUnits <= 0)
) {
  throw new SettlementInvariantError(
    `invalid nominal minor units for ${w.ref.ruleId}: ${w.nominalMinorUnits} (must be a positive safe integer)`,
  );
}
```

## E.3 Tests added

- Runtime (`rtm3-closure.test.ts`): `nominalMinorUnits = -1` ⇒ typed fail-closed error; `= 0` ⇒ typed
  fail-closed error; positive control `= 1` ⇒ valid (`BEST_CONFIRMED`); real-corpus Coney controls.
- Schema/runtime alignment (`schema.test.ts`): `nominalMinorUnits` `0` and `-1` rejected by the schema,
  `1` accepted — the same positivity invariant on both sides.

## E.4 Coney control results (real Corpus-v1, correct runtime nominal-package proof)

- **Coney Park** ⇒ `CONFIRMED_TIE` (unchanged).
- **Coney Active** ⇒ `BEST_CONFIRMED CON-DIN-A-01` (unchanged).

## E.5 Corpus audit

`git diff e4c7105 -- src/corpus/data` is **empty** — no factual corpus change. Counts reconcile:
14 / 46 / 16·12·10·8 / private 2 / O2 8·O3 2·O4 4 / CORE 7·ASSIST 3·DIRECTORY 4.

## E.6 Quality gates

`pnpm lint` · `typecheck` · `test` (**259 / 11 files**) · `corpus:validate` (PASS) · `build` ·
`db:validate` · `format:check` — all exit 0.

## E.7 Deferred findings (unchanged)

RTM3-08 (BEFORE WAVE 0 / SOURCE-PROOF INTEGRATION) · RTM3-09 (BEFORE ADDING ANOTHER TICKET
FIXED-PRICE RULE) · RTM3-12 (BEFORE PREDICTED-SAVINGS DISPLAY / M7). Not claimed closed.

## E.8 Next action

Submit the micro-closure commit for **independent Codex Sol confirmation**. Do NOT begin M3.5. Do NOT
self-declare M3 accepted.

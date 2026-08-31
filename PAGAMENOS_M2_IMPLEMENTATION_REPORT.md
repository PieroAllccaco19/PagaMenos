# PagaMenos — M2 Implementation Report

**Milestone:** M2 — Pure Deterministic Decision Engine
**Authorization:** M2 only. Baseline = M1 closure commit `a7a6f7c6464fb50aa61c8df865c2f856485ce916`.
**Corpus:** `PAGAMENOS_VALIDATION_CORPUS_v1_2026-08-30T1800-0500` (frozen, unchanged).

---

## 1. M2 Verdict: **PASS**

A pure, deterministic, side-effect-free evaluator (`src/engine`) computes an auditable
recommendation over the accepted M1 domain/corpus: integer-céntimo settlement, basis-aware
comparison with a typed rank delta, America/Lima temporal semantics, tri-state eligibility,
availability, a total source-quality resolver, RT-05 evidence-bearing plausible bounds, and
`couldChangeDecision` materiality. No M3 golden/adversarial suite, no persistence, no UI/auth/
analytics/source-monitor. The M0 purity boundary remains green. All seven gates pass.

## 2. Starting M1 SHA

`a7a6f7c6464fb50aa61c8df865c2f856485ce916` (HEAD unchanged until the M2 commit; M0/M1 not amended).

## 3. Coney cross-merchant preflight — **PASS**

Mechanical check over the frozen corpus: for every rule/scope membership, `scope.merchantId ∈
rule.merchantIds`. **47 memberships checked, 0 violations.** `CON-SIP-01` carries
`merchantIds = [m_coney_park, m_coney_active]` and participates in `sc_coney_park_play` (merchant
`m_coney_park`) and `sc_coney_active_play` (merchant `m_coney_active`) — each scope's merchant is
one the rule actually serves. "One rule spanning Park and Active" is a single Sip campaign genuinely
valid at both merchants (shared promotional semantics), **not** a cross-merchant leak. No M1 defect;
M2 proceeded. A regression (`scope behaviour › cross-merchant membership is rejected`) asserts the
engine throws `CrossMerchantMembershipError` if a foreign-merchant rule is offered to a scope.

## 4. Repository status before work

Clean working tree at the M1 closure baseline. `src/engine` held only the `export {}` M0 boundary
placeholder; no engine types or evaluator existed. Corpus/prisma untouched throughout.

## 5. Engine public API (`src/engine/index.ts`)

Deliberately small (§39): `decide` and `evaluateScope`; the typed invariant errors
(`EngineInvariantError`, `CrossMerchantMembershipError`, `ComparisonBasisMismatchError`,
`SettlementInvariantError`, `TemporalInputError`); and the input/output types (`DecideInput`,
`EngineEvaluation`, `ScopeDecisionResult`, `EngineDecisionResult`, `DecisionCandidate`,
`PlausibleBound`, `BoundProof`, `RankDelta`, `DecisionStatus`, `CandidateAdvisory`,
`EligibilityPortfolio`, `PurchaseContext`, `RuleRef`, `Tri`, `PortfolioInstrument`). Arithmetic,
eligibility, source, time and bounds internals stay unexported (unit-tested via relative imports).

Core entry:
```ts
decide({ rules, operationalStates, scopes, portfolio, context, evaluatedAt,
         intendedTransactionAt, selectedScopeId?, holidayCalendar?,
         preRedemptionVerifiableRuleIds?, baselineByScopeId? }): EngineEvaluation
```

## 6. Money / settlement (`money.ts`) — integer céntimos only

`percentDiscountCentimos = floor(eligibleSpend × percentBps / 10_000)` with frozen `RoundingRule`
semantics: `FLOOR_TO_CENT`, `ROUND_HALF_UP_TO_CENT`, `UNKNOWN` (returns a `[floor, half-up]` band so
a ≤1-céntimo ambiguity can be tested for materiality), and `EXACT_FIXED` (fail-closed on a
percentage). `applyKnownCap = min(raw, cap)`. `twoForOneCostCentimos` implements the exact ticket
scope semantics (`floor(count/of)·pay + count%of` unit prices) — no arbitrary N-for-M algebra.
`minimumSpendMet` uses `Constraints.minimumSpend` only (below ⇒ ineligible, equal/above ⇒ eligible).
Cashback is surfaced separately and **never** reduces `effectiveCostCentimos` (§14). All math is
integer; no floating point in settlement.

## 7. Temporal (`time.ts`) — America/Lima (fixed UTC−05, no DST)

Instants are shifted −5h and read via UTC fields. `LOCAL_DATE_RANGE` is inclusive on Lima calendar
dates (valid through the whole final Lima day; the first invalid instant is `endDate+1 00:00 Lima`;
does **not** expire at UTC midnight). `OBSERVED_ACTIVE_UNTIL` honours the M1-closure conservative
interval `[observedActiveAt, endDateInclusive]` — `observedActiveAt` is evidence, never an inferred
earlier start. `LOCAL_DATETIME_RANGE` is `[start, end)`. Weekday/time-window/holiday evaluate against
`intendedTransactionAt` in Lima. Holiday policy uses only the explicit supplied Lima calendar;
`UNKNOWN` is conservative (uncertain only on an actual holiday, never silently "no restriction").

## 8. Eligibility (`eligibility.ts`) — tri-state, conservative

Provider-family gate, then per-class: `PROVIDER_PRIVATE` NO ⇒ ineligible, YES **or** UNKNOWN ⇒
non-rankable `VERIFY_FIRST` (never `BEST_CONFIRMED`/`LIKELY`/`CONFIRMED_TIE`, §21);
`USER_DECLARABLE` facts rank only when explicitly YES, UNKNOWN is never silently YES (§22);
network/tier/membership facts matched against instruments/declarations with a `NO`/`UNKNOWN`
distinction. `privateStates` are looked up independently — owning a BCP instrument never implies
`qore_active` (§20).

## 9. Availability — total resolver

`CONFIRMED_AVAILABLE`/`NOT_APPLICABLE` rank; `CONFIRMED_UNAVAILABLE` never ranks; `UNKNOWN` is
uncertainty that **never creates `LIKELY`** — if material and not `preRedemptionVerifiable` ⇒
`NO_SAFE_WINNER`; if pre-redemption-verifiable or provably non-material ⇒ public winner stands with a
`DYNAMIC_AVAILABILITY` advisory. Exhaustive switch with a `never` default.

## 10. Source-quality resolver — total, no default branch

`FRESH` ranks; `STALE`, `INACCESSIBLE` (as stale-like), `CONFLICTED`, `UNKNOWN` are all non-rankable
and carry a typed uncertainty class. With an empty rankable set, precedence is `SOURCE_CONFLICT` >
`SOURCE_STALE`. Every state is handled explicitly (`never`-checked); no combination falls through.
Publication is likewise total (`ACTIVE` ranks; `FUTURE`/`EXPIRED`/`QUARANTINED` excluded).

## 11. Plausible bounds / materiality (RT-05, §27/§28)

Basis-discriminated `PlausibleBound`: cost `KNOWN_BOUND{minPlausibleCostCentimos}`, nominal
`KNOWN_BOUND{maxPlausibleValueMinorUnits, unit}`, or `UNKNOWN_OR_UNBOUNDED{reason}`, each cost/nominal
bound carrying an evidence-bearing `BoundProof`. **A non-FRESH last-known value can never establish a
`KNOWN_BOUND`** — it defaults to `UNKNOWN_OR_UNBOUNDED` (the stale-`S/100` case). The only synthesized
`KNOWN_BOUND`s derive from the rule's own current (FRESH) constraint: an unknown-cap uncapped-function
bound and a known-value/uncertain-stock bound. Materiality: cost material iff `minPlausibleCost ≤
winnerCost` (equality material — could convert BEST→TIE); nominal iff `maxPlausibleValue ≥
winnerNominal`; `UNKNOWN_OR_UNBOUNDED` material by default. `couldChangeDecision = material`; the
engine uses "could change the decision", not "could beat the winner".

## 12. Comparison basis (§8)

`EFFECTIVE_OUT_OF_POCKET_COST` → `argmin(effectiveCostCentimos)`, exact tie ⇒ `CONFIRMED_TIE`.
`NOMINAL_VALUE_SAME_UNIT` → `argmax(nominalMinorUnits)` **only** when RT-06 prerequisites all hold
(same unit · known & exactly-equal cash acquisition costs · same scope); otherwise the candidates
are `NON_COMPARABLE` (no economic winner). `NON_COMPARABLE` never produces a winner. Rank delta is
typed `{ COST_CENTIMOS } | { NOMINAL_VALUE, unit } | null` — a Coney 8600 vs 8500 difference is
`NOMINAL_VALUE 100 CONEY_PLAY_BALANCE`, never céntimos; `differenceCentimos` is not reintroduced.
`penSavedCentimos` is emitted only when a common `baselineByScopeId` is supplied, is display-only,
and is never a ranking key (so incompatible provider regulars can never decide ranking).

## 13. Multi-scope behaviour (§5)

`decide` evaluates each scope for the context merchant independently. A scope is "matched" iff it
yields a rankable or material-uncertain candidate. One matched scope ⇒ `final` is that scope. >1
materially-distinct matched scope with none selected ⇒ `requiresScopeSelection = true`, `final =
undefined` (the engine never picks a scope by largest saving). `selectedScopeId` returns just that
scope. No global ranking across scopes; no cross-merchant ranking.

## 14. Decision statuses / advisories

Statuses (decision level): `BEST_CONFIRMED`, `CONFIRMED_TIE`, `LIKELY` (MEDIUM-confidence winner
only), `VERIFY_FIRST`, `NO_SAFE_WINNER`, `NO_APPLICABLE_BENEFIT`, `SOURCE_STALE`, `SOURCE_CONFLICT`.
Advisories (candidate level): `VERIFY_FIRST`, `STALE_CANDIDATE`, `CONFLICTED_CANDIDATE`,
`NON_COMPARABLE`, `NON_EQUIVALENT_PURCHASE`, `DYNAMIC_AVAILABILITY`, `UNKNOWN_CAP`,
`UNKNOWN_COMBINABILITY`, `MISSING_CONTEXT`. The two axes are distinct: a public `BEST_CONFIRMED`
winner coexists with a provider-private `VERIFY_FIRST` advisory (`couldChangeDecision=true`) without
downgrading the overall status. LOW confidence is never participant-rankable.

## 15. Tests added — 55 engine tests (`src/engine/engine.test.ts`)

Settlement (percent floor, half-up vs floor, EXACT_FIXED throw, cap below/exact/above, min-spend
below/exact/above, 2×1, fixed price, fixed bundle, cashback-excluded, UNKNOWN-rounding material vs
non-material). Time (start date, inclusive final Lima date, first invalid Lima instant, UTC/Lima
crossover, `OBSERVED_ACTIVE_UNTIL` before/at/after, datetime range, weekday, holiday NONE/EXCLUDED/
UNKNOWN). Eligibility (deterministic YES/NO/UNKNOWN, BCP≠Qore independence, provider-private YES/NO/
UNKNOWN, wrong network, public-winner + private-advisory coexistence, USER_DECLARABLE ranks-when-YES/
UNKNOWN-not-YES). Availability (available, unavailable, unknown-material, unknown-non-material,
pre-redemption-verifiable). Sources (total resolver over all five states; fresh winner; stale
material; conflicted→SOURCE_CONFLICT; stale/inaccessible/unknown→SOURCE_STALE). Bounds/materiality
(cost <, =, >; unknown-cap bound; stale value never a KNOWN_BOUND). Nominal (equal-cost ranks; tie;
unequal cost refuses; different unit refuses; unknown cost refuses; delta never PEN). Scope (one
matched; multi→requiresScopeSelection; selection; cross-merchant throws). Papa Johns real corpus
(BCP Large Classic and Plin Large Americana share no scope; each PJ scope is single-family — no
Plin-vs-BCP ranking). Properties (fast-check: cost never negative; discount ≤ cap; candidate order
invariance of status/winner/delta). **Suite total: 104 tests / 6 files, all passing** (49 M0/M1 +
55 M2).

## 16. Corpus mutation audit

**Zero corpus mutation.** `git status src/corpus prisma` is empty. No factual rows, counts, scopes,
signatures, or operational states were edited. All synthetic engine fixtures live only in the test
file, outside the active corpus. Reconciliation re-verified unchanged: merchants **14**, active
rules **46**, providers **16 / 12 / 10 / 8**, provider-private **2**, overlap O2 8 · O3 2 ·
O4-CONFIRMED 4, decision CORE 7 · ASSIST 3 · DIRECTORY 4.

## 17. Module-boundary / purity audit

`src/engine` imports only from `@/corpus`, `./` internals, and (test-only) `fast-check`/`vitest`.
No `db/app/analytics/sourcemon/services`, Next, React, Prisma, `fs/net/http/process/env`, `gitSha`,
or `buildId` (the sole grep hit is a documentation comment stating their absence). The standing
mechanical boundary test (`src/lib/boundary.test.ts`) and the ESLint pure-layer rules remain green.
The engine result is build-free; persistence/build metadata is a later-layer concern.

## 18. Exact verification commands / results

| Command | Result |
| --- | --- |
| `pnpm lint` | OK (exit 0) |
| `pnpm typecheck` | OK (exit 0) |
| `pnpm test` | 104 passed / 6 files (exit 0) |
| `pnpm corpus:validate` | **PASS** — schema OK · lint 0 errors · all frozen counts match |
| `pnpm build` | OK (exit 0) |
| `pnpm db:validate` | OK — schema valid |
| `pnpm format:check` | OK — all files match Prettier |

## 19. Files changed

**New:** `src/engine/{errors,money,time,types,eligibility,decide}.ts`, `src/engine/engine.test.ts`,
`PAGAMENOS_M2_IMPLEMENTATION_REPORT.md`.
**Modified:** `src/engine/index.ts` (M0 placeholder → small public API).
No changes under `src/corpus`, `prisma`, `package.json`, or CI config.

## 20. Final git status

Clean after the M2 commit (below); nothing uncommitted. `src/corpus` and `prisma` untouched.

## 21. M2 commit SHA

Recorded in the finalization summary and via `git rev-parse HEAD`; a **separate** child of the M1
closure baseline (M0/M1 not amended). Not pushed.

## 22. Warnings / unresolved items

- `preRedemptionVerifiable`, external `BoundProof` snapshots, `holidayCalendar`, and
  `baselineByScopeId` are **engine inputs**, not corpus fields — M2 evaluates supplied snapshots
  deterministically and never fetches or verifies sources (RT-05/§27). No such data is fabricated
  into the corpus.
- `LIKELY` arises solely from a MEDIUM-confidence winner with all other uncertainty non-material;
  UNKNOWN availability never yields `LIKELY` (§23 precedence over §9 step 8).
- The 12 canonical golden fixtures and the full fast-check/adversarial program remain **M3** and were
  intentionally not built; M2 provides focused per-branch coverage only.
- Nominal "unknown acquisition cost" is exercised via a non-finite-cost synthetic candidate, since
  the frozen `NON_CASH_NOMINAL` type always carries a known cost.

## 23. Exact recommended next action

Submit this report to the **independent M2 gate**. **Do not begin M3.** When authorized, M3 = the
12 canonical golden fixtures (explicit assertions) + the comprehensive fast-check/adversarial suite
+ the synthetic same-purchase regular-price-baseline property (RT-10 groundwork), over this frozen
M1 corpus and M2 engine.

# PagaMenos — M1 Implementation Report

**Milestone:** M1 — Corpus v1, Typed Rule Domain & Blocking Corpus Linter
**Authorization:** M1 only. Starting baseline = M0 commit `4ce985ac3d7f841ce394c46bf6019f36c020b167`.
**Corpus:** `PAGAMENOS_VALIDATION_CORPUS_v1_2026-08-30T1800-0500`

---

## 1. M1 Verdict: **PASS**

All 46 hardened rules are faithfully represented under the final Phase-0A rule contract; a
blocking, fail-closed corpus linter rejects unsafe configurations; the offline
`pnpm corpus:validate` gate reconciles every frozen count. No winner/economic evaluation was
implemented.

## 2. Starting M0 SHA

`4ce985ac3d7f841ce394c46bf6019f36c020b167` (HEAD unchanged until the M1 commit; M0 baseline
not amended).

## 3. Repository status before work

Clean working tree at the accepted M0 baseline. `src/corpus` held only the `export {}`
boundary placeholder; no domain types, corpus data, or linter existed.

## 4. Domain types implemented (`src/corpus/`)

Pure, deterministic, no I/O. `ids.ts` (frozen vocabularies: `ProviderFamily`, 14 `MerchantId`s,
`EligibilityClass`, `BenefitType`, `EligibleSpendSelector`, `RoundingRule`, `PublicationState`
⟂ `SourceQualityState` ⟂ `AvailabilityState`, `HolidayPolicy`, `ContextReq`, `ComparisonBasis`,
`PurchaseSignatureKind`, `NominalUnit`, `PurchaseDomain`, research labels, `EXPECTED` targets).
`types.ts` (discriminated `Benefit` union — PERCENT/FIXED_DISCOUNT/FIXED_PRICE/TWO_FOR_ONE/
FIXED_BUNDLE/CASHBACK/NON_CASH_NOMINAL; `Constraints` with the **Rev-2 canonical**
`minimumSpend: SpendThreshold`; `LocalDateRange`/`LocalDateTimeRange`; `ComparisonScope`;
`PurchaseSignature`; `RuleVersion` (immutable semantics) **separate from**
`RuleOperationalState` (publication + source-quality + availability); `Provenance`; `Corpus`).

## 5. Corpus representation / file layout

Version-controlled **typed TS data** (no fs at runtime): `data/merchants.ts` (14 merchants +
14 sources + research metadata), `data/scopes.ts` (30 comparison scopes), `data/rules.ts`
(46 active rules + operational states + 1 excluded history rule, via a compact `mk()` builder),
`data/index.ts` (assembled `CORPUS_V1`). `index.ts` exposes `loadCorpus()`, `reconcileCorpus()`,
and re-exports the domain/derive/lint/schema API.

## 6. Corpus reconciliation counts (all match frozen targets)

| Metric | Value |
| --- | --- |
| Merchants | 14 (food 10 / entertainment 4) |
| Active rule instances | 46 |
| Provider distribution | IBK_PLIN 16 · DINERS 12 · BCP_QORE 10 · SIP_OH 8 |
| Provider-private overlays | 2 (FR-QORE-01, VC-QORE-01) |
| Overlap | O2 8 · O3 2 · O4-CONFIRMED 4 |
| Decision class | CORE 7 · ASSIST 3 · DIRECTORY 4 |
| Excluded (history) | 1 (stale Sip Cineplanet — not active) |
| Removed merchants present | 0 (Don Belisario / Pizza Hut / La Bistecca / La Nacional absent) |

## 7. ComparisonScope / PurchaseSignature

`ComparisonScope` = CanonicalPurchaseDefinition (`scopeId`, `merchantId`, `comparisonBasis`,
`equivalenceGroup`, `purchaseKind`, `requiredContext`, `allowedSelectors`, `signature`).
`PurchaseSignature` is the corpus-controlled union `EXACT_BUNDLE{canonicalItems}` /
`ELIGIBLE_BILL{purchaseDomain}` / `TICKETS{ticketCount,ticketClass}` /
`NOMINAL_PACKAGE{cashAcquisitionCostCentimos,nominalUnit}`. Canonical item keys are
corpus-controlled with positive-integer quantities, deterministic sort, and duplicate-key
rejection. Perroquet is one `ELIGIBLE_BILL` scope with two per-rule selectors
(`FOOD_PLUS_NONALCOHOLIC` vs `FOOD_ONLY`); Coney Sip is one rule spanning the Park and Active
nominal scopes.

## 8. `deriveRequiredSignatureKind`

Pure, deterministic, **fail-closed** precedence NOMINAL_PACKAGE > TICKETS > EXACT_BUNDLE >
ELIGIBLE_BILL; undeterminable semantics throw `SignatureDerivationError` (→ lint failure). The
linter asserts `scope.signature.kind === deriveRequiredSignatureKind(rule)`, so a signature
kind can never be authored freely — closing the RT-04 bypass.

## 9. `deriveRequiredContext`

Pure derivation over `{AMOUNT, BASKET, TICKET_PRICE, CHANNEL, LOCATION_OR_BRANCH, DATE_TIME}`
from rule semantics (percentage/amount-dependent/min-spend/cap/general-bill → AMOUNT; exact/food
selectors/product rules → BASKET; ticket unit → TICKET_PRICE; channels → CHANNEL; locations →
LOCATION_OR_BRANCH; temporal → DATE_TIME; nominal packages → DATE_TIME + CHANNEL only).
Membership/instrument facts remain eligibility, not purchase context. The linter enforces
`scope.requiredContext ⊇ ⋃ deriveRequiredContext(memberRule)`.

## 10. Linter invariants (blocking, fail-closed — `src/corpus/lint.ts`)

merchant mismatch · comparison-basis mismatch · signature-kind not-derived / mismatch ·
selector not allowed · required-context omission · exact-bundle item/qty mismatch · invalid/
duplicate canonical item · tickets count/class mismatch · nominal unit / acquisition-cost
mismatch · `NON_EQUIVALENT_PURCHASE` in a rankable scope · malformed/inverted temporal range ·
duplicate ruleId / ruleId+version / scopeId · unknown merchant/source/scope reference · missing
campaign id / provenance url / observedAt · provider-private without private key · missing/
non-ACTIVE operational state · excluded rule that is active or not quarantined. Superseded
minimum-spend fields are rejected at the **schema** layer (strict objects).

## 11. Provenance / reference model

Every `RuleVersion` carries immutable `provenance {sourceId, url, observedAt}` traceable to a
registered `Source`; the linter rejects unknown/empty references. Sources use the authoritative
family/merchant catalogue URLs cited in the frozen corpus (no fabricated per-rule paths). **No
source was fetched; no monitoring exists** — M1 encodes frozen evidence only.

## 12. Tests added

`src/corpus/corpus.test.ts` (29) — reconciliation; signature derivation (nominal/ticket/exact/
bill/undeterminable); **RT-04 bypass regression** (two exact bundles mislabeled ELIGIBLE_BILL →
lint failure); exact-bundle equality/duplicate/invalid-qty + unequal-bundles-in-one-scope;
required-context per trigger + omission failure; nominal same-unit/equal-cost allowed vs
cost-mismatch rejected; identity/provenance/reference failures. `src/corpus/schema.test.ts` (5)
— strict rejection of `minSpendCentimos`, `Benefit.minimumSpendCentimos`, `minimumSpendBasis`,
and unknown keys; acceptance of the Rev-2 `minimumSpend`. Suite total: **44 tests, 5 files,
all passing** (plus the M0 boundary/logger/env tests).

## 13. `corpus:validate` behavior / result

`pnpm corpus:validate` (via `tsx`, fully offline) runs schema → semantic lint → reconciliation,
prints counts, exits non-zero on any failure. Result: **PASS** — `[schema] OK`, `[lint] OK — 0
errors`, `[reconcile] OK — all frozen counts match`. No network/DB/dev-server dependency.

## 14. Exact verification commands / results

| Command | Exit |
| --- | --- |
| `pnpm lint` | 0 |
| `pnpm typecheck` | 0 |
| `pnpm test` (44 passed) | 0 |
| `pnpm corpus:validate` (PASS) | 0 |
| `pnpm build` | 0 |
| `pnpm db:validate` | 0 |
| `pnpm format:check` | 0 |

## 15. Scope audit — no M2+ work

No decision ranking, effective-cost/winner resolution, materiality engine, decision states, DB
Decision persistence, participant UI/auth, analytics, source monitor, outcomes/evidence, or
admin were implemented. `src/engine`, `src/db`, `src/services`, `src/analytics`, `src/sourcemon`
remain `export {}` placeholders. No Prisma domain models were added (schema still model-less;
`pnpm db:validate` passes). The M0 boundary is intact — the corpus layer imports no db/app/
Next/Prisma/IO (verified by the standing boundary test and lint).

## 16. Files changed

**New:** `src/corpus/{ids,types,derive,lint,schema}.ts`, `src/corpus/data/{merchants,scopes,
rules,index}.ts`, `src/corpus/{corpus,schema}.test.ts`, `scripts/corpus-validate.ts`.
**Modified:** `src/corpus/index.ts` (loader + reconcile + re-exports), `package.json` (`tsx`
dev-dep, `typegen`/`corpus:validate` scripts), `pnpm-lock.yaml`, `.github/workflows/ci.yml`
(added the `corpus:validate` and `format:check` steps; typecheck-before-build order).

## 17. Final git status

Clean after the M1 commit (below); nothing uncommitted. `.env`, `.next/`, `node_modules/`
remain git-ignored.

## 18. M1 commit SHA

Recorded in the M1 finalization summary and via `git rev-parse HEAD`; it is a **separate**
child of the M0 baseline (M0 not squashed/amended). Not pushed.

## 19. Warnings / unresolved items

- **Unknown campaign start dates (corrected — see §21):** where a source states only an end
  date, the rule is now encoded as `OBSERVED_ACTIVE_UNTIL {observedActiveAt, endDateInclusive}`,
  where `observedActiveAt` is the freeze observation date `2026-08-30` as **provenance**, never a
  provider-declared campaign start. No earlier start date is invented.
- **Papa Johns cross-provider comparability (FIX-01b — resolved, see §21):** the frozen rows are
  **different pizza SKUs** (BCP "Large Classic" 20.90 vs Plin "Large Americana/Pepperoni" 13.90),
  encoded faithfully as **distinct EXACT_BUNDLE scopes**. Per RT-04 they are **non-comparable** as
  the same purchase; the FIX-01b "Plin wins by S/7" expectation is superseded for the real corpus.
- Constraint fidelity is at the level the frozen corpus provides; `holidayPolicy` is `UNKNOWN`
  wherever the source is silent (fail-safe, not invented).
- The boundary self-test's programmatic ESLint run adds ~12s to `pnpm test` (first run); a
  known cost, not a defect.

## 20. Exact recommended next action

Submit this report to the **independent M1 gate** for review. **Do not begin M2.** When
authorized, M2 = the pure deterministic evaluator (availability, integer settlement, Lima
temporal semantics, multi-scope evaluation, exhaustive source-quality + basis-typed bounds,
materiality × resolvability, decision-status ⟂ advisories) over this M1 corpus.

---

## 21. M1 Closure Patch (post-review corrections)

Applied after the independent review flagged two narrow closure issues. **No active rule was
added or removed; no factual corpus row changed.** Reconciliation is unchanged: merchants **14**,
active rules **46**, providers **16 / 12 / 10 / 8**, provider-private **2**, overlap O2 8 · O3 2 ·
O4-CONFIRMED 4, decision CORE 7 · ASSIST 3 · DIRECTORY 4, excluded (history) 1.

### 21.1 Closure A — Papa Johns exact-SKU comparability (FIX-01b)

- **Papa Johns clarification (frozen interpretation):** the BCP offer (Large Classic) and the
  Plin offer (Large Americana) are **different exact product compositions**. They remain under
  **separate `EXACT_BUNDLE` purchase signatures / scopes**. They MUST NOT be merged merely because
  both are "large pizzas." This is required by the RT-04 invariant: *different exact
  product/package compositions must not be directly ranked as the same purchase.*
- **FIX-01b real-corpus expectation superseded:** any earlier fixture expectation of the form
  "Plin S/13.90 vs BCP S/20.90 → Plin wins by S/7" is **superseded** for the real Corpus-v1 rows,
  because the products are not structurally identical. The real-corpus contract is **different
  exact purchase signatures ⇒ no direct comparison**. This becomes an **M2/M3 negative
  comparability regression** (not implemented here).
- **Economic property retained for M3 (synthetic, test-only):** the intended property — that
  provider-specific advertised/list "regular" prices must **not** determine ranking, only the
  permitted actual economic outcome does — is preserved as a **future synthetic M3 fixture** with
  the *same* canonical purchase signature, two provider offers, deliberately different advertised
  baselines, and ranking by the permitted economic basis only. It is **not** fabricated into the
  active 46-rule corpus.

### 21.2 Closure B — unknown campaign start must not be invented

- **New temporal variant.** `TemporalRange` gains `OBSERVED_ACTIVE_UNTIL { observedActiveAt,
  endDateInclusive }` alongside `LOCAL_DATE_RANGE` and `LOCAL_DATETIME_RANGE`
  (`src/corpus/types.ts`). `observedActiveAt` is **evidence/provenance** (when the campaign was
  observed live), **not** a provider-declared campaign start; the published `endDateInclusive`
  remains authoritative. No earlier start date is invented.
- **Corpus rows corrected.** The four end-date-only rows previously encoded with a synthetic
  `startDateInclusive = 2026-08-30` — **PJ-SIP-01, CW-SIP-01, POP-IBK-01, EMB-IBK-01** — now use
  `OBSERVED_ACTIVE_UNTIL` with `observedActiveAt = 2026-08-30` (the freeze observation date) and
  their published ends (`2026-09-30` ×3, `2026-12-31`). Fully-published rows keep
  `LOCAL_DATE_RANGE`. No other row changed.
- **Validation.** The Zod schema (`src/corpus/schema.ts`) adds the strict variant and validates
  both of its dates as **real America/Lima calendar dates** (`isValidLocalDate`). The blocking
  linter (`src/corpus/lint.ts`) rejects **`observedActiveAt > endDateInclusive`** as
  `MALFORMED_TEMPORAL_RANGE`. M1 does **not** implement final temporal economic evaluation; the
  documented M2 contract is to admit the rule only within `[observedActiveAt, endDateInclusive]`
  (Lima) unless stronger start evidence later exists.

### 21.3 Tests added (temporal regression)

- `corpus.test.ts` (+3): published full range stays `LOCAL_DATE_RANGE` with both dates preserved;
  the four end-date-only frozen rows use `OBSERVED_ACTIVE_UNTIL` and **never serialize a
  `startDateInclusive`** (no invented start); invalid chronology `observedActiveAt >
  endDateInclusive` is rejected.
- `schema.test.ts` (+2): `OBSERVED_ACTIVE_UNTIL` has **no start field** — adding
  `startDateInclusive` is rejected by the strict schema (observation date and campaign start are
  distinct concepts); an invalid Lima calendar date (`2026-02-30`) is rejected.
- Suite total: **49 tests, 5 files, all passing** (was 44).

### 21.4 Exact verification results (closure)

| Command | Result |
| --- | --- |
| `pnpm lint` | OK (exit 0) |
| `pnpm typecheck` | OK (exit 0) |
| `pnpm test` | 49 passed / 5 files (exit 0) |
| `pnpm corpus:validate` | **PASS** — schema OK · lint 0 errors · all frozen counts match |
| `pnpm build` | OK (exit 0) |
| `pnpm db:validate` | OK — schema valid |
| `pnpm format:check` | OK — all files match Prettier |

### 21.5 Files changed (closure)

`src/corpus/types.ts` (new `OBSERVED_ACTIVE_UNTIL` variant), `src/corpus/schema.ts`
(`isValidLocalDate` + `localDate` + temporal variant), `src/corpus/lint.ts` (chronology check),
`src/corpus/data/rules.ts` (`oau()` helper + 4 rows converted + header note),
`src/corpus/corpus.test.ts` (+3 tests), `src/corpus/schema.test.ts` (+2 tests), this report.

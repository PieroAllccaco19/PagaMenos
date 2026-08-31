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

- **Conservative start dates:** where a source states only an end date (several Sip / "to 30/09"
  rows, IBK Popeyes/Embarcadero), the start is set to the freeze observation date `2026-08-30`
  (a defensible lower bound — the campaign was observed active at freeze), never an invented
  earlier date.
- **Papa Johns cross-provider comparability (FIX-01b):** the frozen rows are **different pizza
  SKUs** (BCP "Large Classic" 20.90 vs Plin "Large Americana/Pepperoni" 13.90). They are
  encoded faithfully as **distinct EXACT_BUNDLE scopes**; forcing them into one scope would
  violate RT-04 exact-bundle integrity. Whether FIX-01b treats them as one comparable "large
  pizza" is an **M2/M3 fixture-modeling decision**, not an M1 data change.
- Constraint fidelity is at the level the frozen corpus provides; `holidayPolicy` is `UNKNOWN`
  wherever the source is silent (fail-safe, not invented).
- The boundary self-test's programmatic ESLint run adds ~12s to `pnpm test` (first run); a
  known cost, not a defect.

## 20. Exact recommended next action

Submit this report to the **independent M1 gate** for review. **Do not begin M2.** When
authorized, M2 = the pure deterministic evaluator (availability, integer settlement, Lima
temporal semantics, multi-scope evaluation, exhaustive source-quality + basis-typed bounds,
materiality × resolvability, decision-status ⟂ advisories) over this M1 corpus.

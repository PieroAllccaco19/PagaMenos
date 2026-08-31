# PAGAMENOS — PHASE 0A-2: RED-TEAM PATCH ADDENDUM (FINAL PRE-IMPLEMENTATION CONTRACT)

**Precedence:** where this addendum changes `PAGAMENOS_PHASE_0A-2_FINAL.md`, **this addendum wins.**
**Red-team verdict:** B — IMPLEMENTATION GO WITH REQUIRED PRE-M3 PATCH (0 CRITICAL · 17 HIGH · 2 MEDIUM).
**Scope:** resolves RT-01…RT-07 + RT-19 (blocking M1–M3); freezes enforceable acceptance contracts for RT-08…RT-18. No software implemented. No architecture or research reopened.
**Convention:** MUST/MUST NOT are normative. All money is integer céntimos; all nominal value is integer minor units; timezone is `America/Lima`.

---

## 1. Patch Decision

**ACCEPTED — PATCH APPLIED.** The pure engine + corpus contract is tightened at seven blocking points (availability, integer settlement, temporal endpoints, scope integrity, exhaustive source-quality, structural nominal safety, conservative provider-private) and the M3/M3.5 milestone boundary is corrected (RT-19). RT-08…RT-18 outcomes are frozen so later agents cannot reinterpret them. No feature is added; each change makes a wrong result harder. Engine remains pure (no DB/env/git). Architecture, stack, corpus scope, analytics hierarchy, auth, source-monitor design, and milestones (except the RT-19 M3/M3.5 correction) are unchanged.

---

## 2. RT-01 Resolution — Dynamic Availability / Unknown Stock

Add an explicit, total availability axis derived from `Constraints.stock` / promotional-fund / code state:
```ts
type AvailabilityState = 'CONFIRMED_AVAILABLE' | 'CONFIRMED_UNAVAILABLE' | 'UNKNOWN' | 'NOT_APPLICABLE'
```
Derivation: `stock.known && remaining>0` → CONFIRMED_AVAILABLE · `stock.known && remaining==0` → CONFIRMED_UNAVAILABLE · stock/fund/code constraint present but `known==false` → UNKNOWN · no stock/fund/code constraint → NOT_APPLICABLE.

Normative rules:
- **CONFIRMED_AVAILABLE** → MAY rank if all other conditions pass.
- **CONFIRMED_UNAVAILABLE** → MUST NOT rank (rejected; `rejectionReason='UNAVAILABLE'`).
- **UNKNOWN**, *material to redemption* (stock/fund/code gating is required to actually redeem — **true by default for any rule that declares such a constraint**):
  - MUST NOT become `BEST_CONFIRMED`; MUST NOT become `LIKELY` merely because the rest of the rule is known. It is an **uncertainty candidate** carrying advisory `DYNAMIC_AVAILABILITY`.
  - Compute `couldChangeDecision` via its best-case bound (assume available, full value). If it **could change the decision**:
    - **user-resolvable only when the participant can actually verify availability before paying** (flag `preRedemptionVerifiable` on the rule). **Phase-0A default: stock/fund availability is NOT reliably pre-payment-verifiable ⇒ not user-resolvable ⇒ `NO_SAFE_WINNER`.**
    - if user-resolvable: keep the confirmed-available winner + a `DYNAMIC_AVAILABILITY` (verify-first-style) advisory.
  - If **non-material** (cannot change the decision even at full value): the safe confirmed winner stands with a `DYNAMIC_AVAILABILITY` advisory.
- **NOT_APPLICABLE** → no availability effect.

**Consequence — `LIKELY` is narrowed:** `LIKELY` MUST NOT arise from unknown availability. `LIKELY` now means only: a comparable, `CONFIRMED_AVAILABLE`, uniquely-optimal winner that rests on a MEDIUM-confidence rule whose uncertainty is **proven non-material** to ordering. **UNKNOWN dynamic availability is uncertainty, never likelihood evidence.**

Golden/property: Fixture 12 (Popeyes stock exhausted) → CONFIRMED_UNAVAILABLE, not ranked. Add: UNKNOWN-material-and-cheapest → `NO_SAFE_WINNER`; UNKNOWN-non-material → winner stands + advisory.

---

## 3. RT-02 Resolution — Integer Settlement / Rounding / Minimum / Cap

Canonical, float-free settlement pipeline (per rule, in order):

1. **Percentage** = integer **basis points** (`percentBps`, e.g. `2000` = 20%).
2. **Eligible subtotal**: `eligibleSpendCentimos = selector(context)` from the rule's `eligibleSpendSelector`.
3. **Minimum**: `eligible ⇔ quantity(minimumSpendBasis) ≥ minimumSpendCentimos`. `minimumSpendBasis?` is explicit per rule; **default = the rule's `eligibleSpendSelector`**. Threshold applies to a different quantity only when the source says so.
4. **Raw percentage discount** — canonical Phase-0A settlement: `rawDiscountCentimos = floor(eligibleSpendCentimos * percentBps / 10_000)`. Provider-specific rounding is declared, not assumed:
   ```ts
   type RoundingRule = 'FLOOR_TO_CENT' | 'ROUND_HALF_UP_TO_CENT' | 'EXACT_FIXED' | 'UNKNOWN'  // default FLOOR_TO_CENT
   ```
   `UNKNOWN` rounding yields a ±1-céntimo band on that candidate's discount; it is **decision-material iff a competitor lies within that band** (feeds §6/§11 materiality) — if material and system-unresolvable ⇒ `NO_SAFE_WINNER`.
5. **Cap**: `discountCentimos = min(rawDiscountCentimos, capCentimos)`.
6. **Effective cost**: `effectiveCostCentimos = cashPurchaseCostCentimos − immediateDiscountCentimos`, subject to fixed semantics — FIXED_PRICE ⇒ `effectiveCost = fixedPriceCentimos`; FIXED_BUNDLE ⇒ `= bundlePriceCentimos`; TWO_FOR_ONE ⇒ `= cost of the (pay) units`.
7. **Cashback** is computed **separately** and **MUST NOT** reduce `effectiveCostCentimos` (immediate payable). It is future value, surfaced apart, never in immediate ranking.

Required boundary tests (M2/M3): cap below/equal/above; minimum one-cent-below/equal/one-cent-above; fractional-percentage floor; cashback-does-not-alter-immediate-cost; `EXACT_FIXED` price; 2×1 effective cost.

---

## 4. RT-03 Resolution — Date / Time / Endpoint Semantics

Public campaign dates (e.g. `01/07/2026 – 30/09/2026`) MUST be modeled as **inclusive local calendar dates in `America/Lima`**, unless the source publishes an explicit time-of-day.
```ts
interface LocalDateRange     { startDateInclusive: string /*YYYY-MM-DD, Lima*/; endDateInclusive: string }
interface LocalDateTimeRange { startInclusive: string /*ISO w/ zone*/; endExclusive: string /*documented*/ }
```
A `LocalDateRange` is active for `intendedTransactionAt` **iff the Lima calendar date of `intendedTransactionAt` ∈ [startDateInclusive, endDateInclusive]**. Therefore for `…–30/09/2026`: valid at `2026-09-30 00:00:00` Lima, valid through `2026-09-30 23:59:59.999` Lima, invalid at `2026-10-01 00:00:00` Lima. **MUST NOT** convert an inclusive date to midnight UTC (which would expire ~5h early). Weekday and holiday evaluation use `intendedTransactionAt` in Lima.

Required tests: start boundary · inclusive final day · first invalid instant (next local midnight) · Lima-midnight vs UTC crossover · holiday boundary.

---

## 5. RT-04 Resolution — Comparison-Scope Integrity + Multiple Matching Groups

`ComparisonScope` becomes an explicit **CanonicalPurchaseDefinition**:
```ts
interface ComparisonScope {          // authoritative shape (supersedes FINAL §8 fields)
  scopeId: string
  merchantId: string
  comparisonBasis: ComparisonBasis
  purchaseKind: string               // e.g. UVK_TWO_STANDARD_TICKETS, PERROQUET_SIT_DOWN_MEAL
  equivalenceGroup: string           // rankable-together group
  requiredContext: ContextReq[]
  allowedSelectors: EligibleSpendSelector[]
  nominalUnit?: NominalUnit           // required when comparisonBasis = NOMINAL_VALUE_SAME_UNIT
}
```
**Corpus linter (blocking, runs before seed acceptance):** scope.merchantId == every member rule's merchantId · each rule's `eligibleSpendSelector` ∈ `scope.allowedSelectors` · `requiredContext` cannot be omitted where a member rule needs it · `NON_EQUIVALENT_PURCHASE` rules never share a rankable scope · nominal scopes declare `nominalUnit` · all rankable members agree on `comparisonBasis`. Seed load fails on any violation.

**Multiple matching groups:** the engine evaluates **each matching `ComparisonScope` independently** and returns a collection; there is **no global ranking across separate purchase scopes**.
```ts
interface ScopeDecisionResult { scopeId: string; result: EngineDecisionResult }
interface EngineEvaluation {
  merchantId: string
  matchedScopes: ScopeDecisionResult[]
  requiresScopeSelection: boolean          // true if >1 materially distinct scope matched and none selected
  selectedScopeId?: string
  final?: EngineDecisionResult             // present iff exactly one scope matched OR a scope was selected
}
```
When `>1` materially distinct scope matches, the participant MUST select/confirm the intended purchase scope; only the selected scope becomes the final purchase Decision. `engine.decide(...)` now returns `EngineEvaluation` (a single matched scope collapses to `final`).

Required tests: wrong Pizza Hut grouping rejected by linter · missing basket/channel → `MISSING_CONTEXT` · multi-scope match → `requiresScopeSelection=true`, no cross-scope ranking.

---

## 6. RT-05 Resolution — Exhaustive Source-Quality Resolution + Basis-Typed Bounds

`SourceQualityState` handling is a **total function — no default fallthrough.** Evaluated as-of `evaluatedAt` alongside `PublicationState`.

| SourceQualityState | Rankable? | Advisory | Plausible bound | Sole candidate → status | With a fresh winner present |
| :-- | :-- | :-- | :-- | :-- | :-- |
| FRESH | yes (if all else passes) | — | actual `KNOWN_BOUND` | normal | competes normally |
| STALE | no | `STALE_CANDIDATE` | `UNKNOWN_OR_UNBOUNDED` unless a conservative `KNOWN_BOUND` proof exists (e.g. fixed promo price) | `SOURCE_STALE` | material ⇒ `NO_SAFE_WINNER`; non-material ⇒ advisory, winner stands |
| INACCESSIBLE | no | `STALE_CANDIDATE` | `UNKNOWN_OR_UNBOUNDED` | `SOURCE_STALE` | material ⇒ `NO_SAFE_WINNER`; non-material ⇒ advisory |
| CONFLICTED | no | `CONFLICTED_CANDIDATE` | `UNKNOWN_OR_UNBOUNDED` | `SOURCE_CONFLICT` | material ⇒ `NO_SAFE_WINNER`; non-material ⇒ advisory |
| UNKNOWN | no | `STALE_CANDIDATE` | `UNKNOWN_OR_UNBOUNDED` unless a conservative `KNOWN_BOUND` proof exists | `NO_SAFE_WINNER` | material ⇒ `NO_SAFE_WINNER`; non-material ⇒ advisory |

Mixed-blocker precedence when the rankable set is empty: `SOURCE_CONFLICT` > `SOURCE_STALE` > `NO_SAFE_WINNER`.

**PlausibleBound is discriminated by `ComparisonBasis` and carries a proof (supersedes the earlier `PlausibleBound`):**
```ts
type BoundProof = 'UNCAPPED_DISCOUNT_UPPER_BOUND' | 'FIXED_PROMO_PRICE' | 'KNOWN_STOCK_ZERO' | 'EXPLICIT_PROVIDER_LIMIT' | 'OTHER_REVIEWED'
type PlausibleBound =
  | { basis: 'EFFECTIVE_OUT_OF_POCKET_COST'; kind: 'KNOWN_BOUND'; minPlausibleCostCentimos: number; proof: BoundProof }
  | { basis: 'NOMINAL_VALUE_SAME_UNIT';      kind: 'KNOWN_BOUND'; maxPlausibleValueMinorUnits: number; unit: NominalUnit; proof: BoundProof }
  | { kind: 'UNKNOWN_OR_UNBOUNDED'; reason: string }
```
Unknown/inaccessible/conflicted candidates that plausibly share the purchase scope are **material by default** unless a valid conservative `KNOWN_BOUND` (with proof) shows otherwise. Required: exhaustive `PublicationState × SourceQualityState` truth-table tests for the cases the engine reaches.

---

## 7. RT-06 Resolution — Structurally Safe Nominal Comparison (enforced)

`NOMINAL_VALUE_SAME_UNIT` MAY rank **only when the engine structurally verifies all four**:
1. all rankable candidates share the **exact same `NominalUnit`**;
2. each candidate's required **cash acquisition cost is known** (`cashAcquisitionCostCentimos != null`);
3. those acquisition costs are **exactly equal** across the compared alternatives;
4. a **same-purchase scope** is established (shared `equivalenceGroup`).

Otherwise → `NON_COMPARABLE` (or `NO_SAFE_WINNER` if an unresolved candidate is decision-material). The engine MUST persist the proving fields (`nominalUnit`, `cashAcquisitionCostCentimos`, `scopeId`). **No multidimensional utility across unequal cash prices.** Nominal values MUST NOT enter PEN savings / VS3.

Required tests: **allow** `S/45→85` vs `S/45→86` (same unit, equal cost) · **refuse** `S/45→85` vs `S/40→84` (unequal cost) · **refuse** same cost / different unit · **refuse** unknown acquisition cost · nominal never contributes to PEN/VS3.

---

## 8. RT-07 Resolution — Provider-Private Eligibility (conservative)

For the **`PROVIDER_PRIVATE`** class (Qore) only:
```
PROVIDER_PRIVATE = NO      → candidate INELIGIBLE (rejected)
PROVIDER_PRIVATE = YES     → VERIFY_FIRST advisory (NOT rankable)
PROVIDER_PRIVATE = UNKNOWN → VERIFY_FIRST advisory (NOT rankable)
```
Neither YES nor UNKNOWN may produce `BEST_CONFIRMED`, `LIKELY`, or `CONFIRMED_TIE`. Rationale: a self-declared private benefit is not independent evidence that *this* campaign is currently activated, the segment is still active, or redemption limits are unused.

**Boundary (do not over-apply):** this rule governs `PROVIDER_PRIVATE` only. `USER_DECLARABLE` (e.g. Cineplanet AMEX + Socio) remains rankable — the participant can straightforwardly confirm network/membership. Persisted private states MUST be scoped to `participant · provider · campaign/rule-family · declaredAt · expiresAt/reconfirmation policy`; a stale Qore `YES` MUST NOT be auto-reused for a later campaign.

Required tests: card-ownership-only · Qore YES · Qore NO · Qore UNKNOWN · stale Qore declaration · wrong network · wrong tier.

---

## 9. RT-19 — Milestone / First-Slice Correction

The historical-persistence/re-run property was mis-placed in M3. Corrected boundary:
- **M0–M3 (pure engine + corpus):** **no persisted DB `DecisionSnapshot` is required.** Golden-fixture "reproducibility" means **pure determinism**: identical exact inputs + engine version ⇒ identical `EngineEvaluation`.
- **M3.5 (persistence):** adds persisted immutable `DecisionSnapshot`, exact input snapshot, DB immutability, build/git metadata, and historical persistence/reproduction **integration** tests.

The M0–M3 DoD (§13) is updated accordingly: DB immutability / snapshot re-run assertions belong to M3.5, not M3.

---

## 10. Frozen RT-08–RT-18 Acceptance Contracts

*(Outcomes frozen now; implemented at the stated gate. Later agents MUST NOT reinterpret.)*

**RT-08 — Historical immutability (M3.5 gate).** `DecisionSnapshot` MUST embed all material inputs: purchase context; selected purchase/comparison scope; eligibility snapshot; `intendedTransactionAt`; `evaluatedAt`; holiday-calendar version (or resolved holiday fact); exact `RuleVersion` refs; source publication + quality states used; economic intermediate outputs needed for audit; engine semantic version; `gitSha`/`buildId`; corpus version. Historical participant/research views read the **snapshot**, never live joins for computed values. DB: prior `DecisionSnapshot` **cannot UPDATE**; **cannot DELETE** while part of the research dataset except via explicit withdrawal/privacy process; referenced `RuleVersion`s **cannot cascade-delete** (FK `RESTRICT`). Acceptance tests: attempted update/delete/cascade all rejected.

**RT-09 — Business uniqueness / concurrency (M3.5 + M7).** Idempotency key is **endpoint/actor-scoped + request-payload-hash**; same key + different payload ⇒ **conflict (409)**. Business uniqueness (DB unique constraints/transactions): one finalized `PurchaseIntent` = one purchase-decision occasion; **≤1 final `Decision` per finalized `PurchaseIntent`** (unless an explicit revision/supersession model exists); one `Outcome` per occasion/Decision; **one terminal VS3 per `Outcome`**; `SavingEvidence` stores a content digest to detect accidental reuse. Concurrency tests: same key (dedup), different keys, simultaneous requests.

**RT-10 — Verified cash value (M7 gate).** Verification is discriminated:
```ts
type VerifiedValue = 'VERIFIED_PEN_SAVING' | 'VERIFIED_NOMINAL_OUTCOME' | 'NO_VERIFIABLE_SAVING'
```
Only `VERIFIED_PEN_SAVING` contributes to PEN metrics / RIVSR VS3, and it **requires a defensible baseline/comparator**: an actual alternate price for the same purchase, a common independent regular price, or an explicitly reviewed counterfactual. Provider-relative incompatible list prices MUST NOT create verified savings.

**RT-11 — Distinct purchase occasion + RIVSR denominator (M10/M11.5).** Introduce a stable `PurchaseOccasion` identity; two Decisions/Outcomes from the **same actual transaction** MUST NOT count as two independent occasions. **RIVSR numerator:** participant has **≥2 VS3 `VERIFIED_PEN_SAVING` outcomes on ≥2 distinct independent `PurchaseOccasion`s.** Frozen into `AnalysisProtocol v1` before Wave 1: analysis-eligible participant; minimum real covered purchase opportunities; **missing `WeeklyExposureReport` handling that MUST NOT shrink the denominator toward successful participants**; content-driven sessions; withdrawal; partial-week.

**RT-12 — Contamination / auth (M4 + M11.5).** Contamination window = **`[contactTime, contactTime + 24h)`** (23:59:59 after = contaminated; exactly +24h = outside; +24h+1s = outside). The **pre-contact exception** applies only if, **before** the contact, the system had already **immutably captured** participant + qualifying intent type + merchant + intended transaction time/window; an empty DRAFT does **not** qualify. `AUTH_MESSAGE` is non-contaminating **only** if system-generated for initial invitation, expired/revoked session, or participant-requested reauthentication; a message containing behavioral encouragement is **never** `AUTH` merely because it also carries a login link.

**RT-13 — Events never repair domain facts (M3.5/M11).** `CanonicalEvent` MUST NEVER create or repair VS3, Outcome, Decision, eligibility, `PurchaseOccasion`, contamination, verified saving, or analysis eligibility. A missing domain fact stays missing and is a reconciliation/data-quality exception. Events supplement telemetry with no domain equivalent only.

**RT-14 — Source metric denominators (M8–M10).** Maintain an independently audited **`GroundTruthSourceChange`** ledger. A material change exists even if the parser misses it, creates no `ProposedRuleVersion`, fails to parse, or the adapter errors. **Automation Rate denominator = independently confirmed material source changes** (not parser proposals); no-change checks excluded; failures counted = missed detection + failed parse + incorrect auto-proposal. `PARTIAL` audit = **inconclusive / not correct**. **CEA** requires a complete audit of **all** critical fields for the sampled item; auditor ≠ the actor/model that authored the parsing interpretation for that item. Formulas:
```
AutomationRate = (auto-accept proposals: humanAuditResult=CORRECT ∧ ¬materialDiscrepancy) / (independently confirmed material source changes)
ExceptionRate  = (human-semantic-intervention + missed-detections + failed-parses + incorrect-auto-proposals) / (independently confirmed material source changes)
CEA            = 1 − (fully-audited sampled items with any material error on a critical field) / (fully-audited sampled items)   // PARTIAL ⇒ not fully-audited ⇒ excluded from denominator, never counted CORRECT
```

**RT-15 — TTDC (M10).** No midpoint may drive GREEN/YELLOW/RED. Each confirmed change carries `lastObservedUnchangedAt` and `firstObservedChangedAt`; evaluation is **interval-censored / conservative upper-bound**. If the interval spans a gate threshold ⇒ **INCONCLUSIVE**, unless the pre-registered analysis method supports a valid classification. Never claim exact TTDC without exact evidence.

**RT-16 — Logging / telemetry privacy (M0).** An explicit **allowlist** policy MUST exist before any application logging is added. Never send to Sentry / platform logs / analytics: email, magic-link token, auth/session cookie, signed evidence URL, raw evidence, unnecessary portfolio detail, unnecessary full basket/context, raw provider snapshot, source credentials/secrets — unless explicitly sanitized and required. Error telemetry is allowlist-based. Redaction/scrubbing tests required.

**RT-17 — Evidence security / consent (M7).** Upload requires `StudyConsent.optionalEvidenceConsent = true` **at upload time**. Phase-0A accepts **images only: JPEG, PNG, WEBP**; **no PDF** unless a secure rasterization/sanitization pipeline is intentionally added later. Validate by **actual file decoding / magic bytes**, not the MIME header. Safe re-encode; strip metadata; private storage. **Raw-evidence deletion SLA (frozen defaults, confirm at Wave-0 sign-off):** delete raw ≤7 days after a verification decision; ≤30 days if never verified; on withdrawal ≤24h. On withdrawal: raw deleted, signed links invalidated, CDN/cache purged, retained verification metadata pseudonymized/unlinked per consent/protocol.

**RT-18 — Admin separation + snapshot retention (before M8/M12).** Separate capabilities (simple app roles, not enterprise IAM): identity/contact access · evidence verification · rule/source editing · research analytics. Set a **concrete raw source-snapshot retention policy before Wave 0** (frozen default: private/internal-only ≤90 days, then reduce to fingerprint + sanitized excerpt).

---

## 11. Revised Type / Interface Deltas

```ts
// RT-01
type AvailabilityState = 'CONFIRMED_AVAILABLE'|'CONFIRMED_UNAVAILABLE'|'UNKNOWN'|'NOT_APPLICABLE'
// RT-02
type RoundingRule = 'FLOOR_TO_CENT'|'ROUND_HALF_UP_TO_CENT'|'EXACT_FIXED'|'UNKNOWN'   // default FLOOR_TO_CENT
// RT-05
type BoundProof = 'UNCAPPED_DISCOUNT_UPPER_BOUND'|'FIXED_PROMO_PRICE'|'KNOWN_STOCK_ZERO'|'EXPLICIT_PROVIDER_LIMIT'|'OTHER_REVIEWED'
type PlausibleBound =
  | { basis:'EFFECTIVE_OUT_OF_POCKET_COST'; kind:'KNOWN_BOUND'; minPlausibleCostCentimos:number; proof:BoundProof }
  | { basis:'NOMINAL_VALUE_SAME_UNIT'; kind:'KNOWN_BOUND'; maxPlausibleValueMinorUnits:number; unit:NominalUnit; proof:BoundProof }
  | { kind:'UNKNOWN_OR_UNBOUNDED'; reason:string }
type NominalUnit = string   // corpus-controlled (e.g. 'CONEY_PLAY_BALANCE')

// Benefit additions (RT-02, RT-06)
interface Benefit {
  /* …existing… */
  percentBps?: number
  roundingRule?: RoundingRule           // default FLOOR_TO_CENT
  minimumSpendCentimos?: number
  minimumSpendBasis?: EligibleSpendSelector   // default = eligibleSpendSelector
  nominalUnit?: NominalUnit
  cashAcquisitionCostCentimos?: number  // required for NON_CASH_NOMINAL ranking
  preRedemptionVerifiable?: boolean     // RT-01: participant can verify availability before paying (default false)
}

// ComparisonScope → CanonicalPurchaseDefinition (RT-04) — supersedes FINAL §8 shape
interface ComparisonScope {
  scopeId; merchantId; comparisonBasis; purchaseKind; equivalenceGroup
  requiredContext: ContextReq[]; allowedSelectors: EligibleSpendSelector[]; nominalUnit?: NominalUnit
}

// Temporal (RT-03)
interface LocalDateRange     { startDateInclusive: string; endDateInclusive: string }        // Lima YYYY-MM-DD
interface LocalDateTimeRange { startInclusive: string; endExclusive: string }

// DecisionCandidate additions (RT-01/05/06)
interface DecisionCandidate {
  /* …existing, minus superseded PlausibleBound… */
  availability: AvailabilityState
  nominalUnit?: NominalUnit
  cashAcquisitionCostCentimos?: number
  plausibleBound: PlausibleBound         // basis-discriminated (RT-05)
}

// Engine top-level result (RT-04) — engine.decide now returns EngineEvaluation
interface ScopeDecisionResult { scopeId: string; result: EngineDecisionResult }
interface EngineEvaluation {
  merchantId: string; matchedScopes: ScopeDecisionResult[]
  requiresScopeSelection: boolean; selectedScopeId?: string; final?: EngineDecisionResult
}

// Verified value (RT-10) / occasion (RT-11)
type VerifiedValue = 'VERIFIED_PEN_SAVING'|'VERIFIED_NOMINAL_OUTCOME'|'NO_VERIFIABLE_SAVING'
interface PurchaseOccasion { id: string; participantId: string; merchantId: string; occasionKey: string }
```
`LIKELY` is redefined per §2 (no unknown-availability path). Engine remains pure (no DB/env/git); build metadata attaches only at the M3.5 persistence boundary (RT-19).

---

## 12. Revised Test Deltas (normative additions)

**Engine (M2/M3):**
1. **Availability:** available · unavailable · unknown-material (cheapest ⇒ `NO_SAFE_WINNER`) · unknown-non-material (winner stands + advisory).
2. **Monetary boundary:** fractional-percentage floor · minimum below/equal/above · cap below/equal/above · cashback never lowers immediate cost · `EXACT_FIXED` · 2×1.
3. **Time:** start date · inclusive final day · first invalid instant · Lima-midnight vs UTC crossover · holiday boundary.
4. **Scope:** wrong basket · missing basket/channel (`MISSING_CONTEXT`) · wrong channel · multiple matching groups (`requiresScopeSelection`); corpus-linter rejects wrong Pizza Hut grouping.
5. **Source state:** exhaustive `PublicationState × SourceQualityState` truth table reachable by the engine (no default fallthrough).
6. **Nominal:** same-cost/same-unit (allow) · unequal cost (refuse) · unequal unit (refuse) · unknown acquisition cost (refuse); never enters PEN/VS3.
7. **Provider-private:** ownership-only · YES · NO · UNKNOWN · stale-YES · wrong tier/network — none of YES/UNKNOWN yields BEST/LIKELY/TIE.

**Later gates:** 8. historical DB immutability (update/delete/cascade rejected). 9. multi-key concurrency/idempotency (same-key dedup, payload-mismatch conflict, simultaneous). 10. `PurchaseOccasion`/VS3 dedupe. 11. exact contamination boundary (−1s/exact/+1s; pre-contact exception vs empty DRAFT). 12. source-metric denominator failure cases (missed/failed/incorrect; PARTIAL). 13. evidence consent + file-spoofing (magic-byte vs MIME) + log-redaction.

---

## 13. Revised M0–M3 DoD

- **M0** — repo bootstrap + module-boundary lint **+ logging allowlist/redaction policy in place before any app logging (RT-16).**
- **M1** — corpus typed model incl. `CanonicalPurchaseDefinition`, per-rule `eligibleSpendSelector`, `roundingRule`, `minimumSpendBasis`, `nominalUnit`/`cashAcquisitionCostCentimos`, two-axis operational state; **blocking corpus linter (RT-04) passes**; 46 rules seed reproducibly; every rule traceable to source+version.
- **M2** — pure evaluator implementing: availability model (RT-01), integer settlement/rounding/min/cap (RT-02), Lima inclusive-date semantics (RT-03), multi-scope `EngineEvaluation` (RT-04), exhaustive source-quality + basis-typed bounds (RT-05), structural nominal guard (RT-06), conservative provider-private (RT-07). Imports nothing from db/app/Next/env.
- **M3** — 12 golden fixtures pass on **explicit assertions** + full property/boundary suite (§12 items 1–7). **Reproducibility = pure determinism** (identical inputs + engine version ⇒ identical `EngineEvaluation`); **no DB `DecisionSnapshot` (RT-19)**.
- **Invariants that MUST hold at M3:** cross-scope ranking impossible; `PROVIDER_PRIVATE` YES/UNKNOWN never BEST/LIKELY/TIE; UNKNOWN availability never LIKELY; nominal never becomes PEN; no source-quality state falls through a default; effective cost never reduced by cashback.

---

## 14. Remaining Blockers Before M0

- **None**, other than red-team **recheck sign-off of this addendum.** All M1–M3 blocking items (RT-01…07, RT-19) are resolved here; the only M0 precondition it introduces — the RT-16 logging allowlist — is an M0 deliverable, not an external dependency.

---

## 15. Remaining Blockers Before Wave 0

Wave-configuration items to freeze into `AnalysisProtocol v1` / ops policy before the M11.5 protocol freeze and Wave-0 gate (none blocks M0–M3):
1. RIVSR analysis-eligibility params: minimum covered opportunities, missing-`WeeklyExposureReport` handling, content-driven-session and partial-week rules, `PurchaseOccasion.occasionKey` definition (RT-11).
2. Weekly check-in delivery default (FORM vs RESEARCHER).
3. Persistent-session TTL (study duration).
4. RANDOM audit sampling rate + the frozen critical-field list for CEA (RT-14).
5. Expiry auto-apply scope (which deterministic expiries auto-apply vs shadow-only).
6. Confirm frozen defaults: raw-evidence deletion SLA (RT-17), raw source-snapshot retention (RT-18), admin capability matrix (RT-18).

*(Already frozen and not open: contamination window = 24h (RT-12); LOW = admin-only; provider-private conservative rule (RT-07).)*

---

## 16. FINAL PATCH READY FOR RED-TEAM RECHECK — **YES**

RT-01…RT-07 and RT-19 are fully resolved with normative, testable semantics; RT-08…RT-18 acceptance contracts are frozen at their gates. No code was written, no architecture or research reopened. **Next action:** submit this addendum for Codex Sol recheck; on clearance, begin **M0 → M3** under the revised DoD (§13).

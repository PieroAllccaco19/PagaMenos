# PAGAMENOS — PHASE 0A-2: VALIDATION SYSTEM IMPLEMENTATION SPEC (FINAL / AUTHORITATIVE)

**Consolidation of Revision 1 + Revision 1.1.** All superseded definitions removed. This is the single authoritative contract.
**Corpus (frozen):** `PAGAMENOS_VALIDATION_CORPUS_v1_2026-08-30T1800-0500` · 14 merchants · 46 rules · 4 provider families (10 food, 4 entertainment).
**Decision state:** NARROWED CORPUS GREEN — private software validation authorized; production NOT authorized.
**Status:** Architecture + contract approved. **Pending Codex Sol independent technical red-team before freeze.** Do not start M0 until red-team passes.

> **Editorial note (v FINAL):** this document consolidates Revision 1 + Revision 1.1 into one authoritative contract. Every superseded definition has been removed; only the canonical types in the body and §53 apply. Any term from an earlier revision that is not present here is intentionally retired and must not appear in code or docs.

---

## 0. Context & Scope Boundary

Three prior research phases concluded **NARROWED CORPUS GREEN**: the real Peruvian promotion data now contains enough high-confidence, *same-purchase* decision problems (14/14 confirmed O2+ merchants; 4 O4-CONFIRMED across 4 distinct mechanisms) to justify a behavioral-validation system — and only that. This spec builds the smallest system that makes a **wrong research conclusion difficult**: correctness, reproducibility, and auditability dominate scale. The system must be easy to delete if PagaMenos fails validation.

The purpose is to test H-P0-01…08 — centrally, whether users **independently return at real purchase moments and realize verified savings** (primary metric **RIVSR**, from VS3 transaction-corroborated savings). Nothing on the Do-Not-Build list (§48-adjacent, unchanged from approval) is included.

---

## 1. Executive Technical Recommendation

A **single TypeScript modular monolith**: **Next.js (App Router) full-stack + PostgreSQL (Prisma) + a pure, framework-free decision-engine module**, deployed on **Vercel + Neon**. The engine (`src/engine`) never imports Next/DB/env; it is exercised by **12 golden fixtures** as its acceptance suite. Money is **integer céntimos**, compared exactly. Nominal (non-cash) value uses integer **minor units** in a named unit, never converted to PEN. Ranking is by a typed **`ComparisonBasis`**, never by provider-declared `penSaved`. Decisions persist as **immutable snapshots**. Provider-private (Qore) eligibility is **tri-state (YES/NO/UNKNOWN)**, never inferred to YES. **Domain tables are the source of truth for research facts; `CanonicalEvent` is telemetry.** A minimal per-provider **source monitor** (4 adapters + shadow-automation measurement + human review) runs on Vercel Cron.

Rejected: separated backends (NestJS/FastAPI), microservices, Redis/Kafka/ES/vector DB, ML, native apps. At 30–50 participants none earns its complexity, and each adds surfaces where analytics or history could be corrupted.

---

## 2. What Is / Is Not Being Built

**Built (one codebase, five logical surfaces):** A. Participant Web (mobile-first) · B. Research/Admin · C. Rules Evaluator (pure) · D. Source Monitor (4 adapters) · E. Analytics/Experiment Data (first-party).

**Not built (default-exclude):** native/Flutter apps · production PagaMenos mobile architecture · nationwide catalogue · all-banks coverage · recommendation ML/embeddings · AI chatbot · bank/transaction APIs · card-number/CVV capture · budgeting/payments/cashback/subscriptions · affiliate/merchant/provider portals · geofencing · social/reviews/referrals/gamification · supermarket/general-ecommerce optimizer · receipt OCR · microservices · Redis · Kafka · Kubernetes · Elasticsearch · vector DB · generic CMS · LATAM abstractions · generic experimentation platform · public deals feed · public SEO pages · **multidimensional offer optimization** (cash-vs-nominal trade-offs are `NON_COMPARABLE`, §6).

---

## 3. Final Architecture, Stack, Modules, Diagram

**Modular monolith:** one Next.js App-Router application, TypeScript strict, PostgreSQL via Prisma, engine as an I/O-free internal module. Server Actions + Route Handlers. Admin = protected routes in the same app. Jobs via Vercel Cron. Evidence in private blob storage with signed short-lived URLs.

| Concern | Choice |
| :-- | :-- |
| Framework | Next.js (App Router), React, TypeScript strict |
| DB / ORM | PostgreSQL (Neon) / Prisma (real migrations, no auto-sync) |
| Validation | Zod (inputs + corpus schema + event props) |
| Money/time | integer céntimos + integer minor units; Luxon (`America/Lima`); explicit holiday table |
| Auth | Auth.js email magic-link + participant code; admin allowlist/role |
| Email | Resend (magic links + typed message classes) |
| Storage | Vercel Blob (private, signed URLs) — evidence only |
| Jobs | Vercel Cron (per-provider source checks) |
| Tests | Vitest (+ fast-check property), Playwright (E2E), golden snapshots |
| Errors | Sentry (app + engine invariant violations) |
| CI | GitHub Actions (lint/type/test/golden/migrate/build) |

**Module boundaries (ESLint / dependency-cruiser enforced):**
```
src/
  engine/     PURE. No Next, no Prisma, no I/O, no env/git. Types + evaluators + aggregator.
  corpus/     Corpus v1 as typed data + Zod schema + version-controlled seed builder.
  db/         Prisma client + repositories (only place engine outputs are persisted).
  services/   Use-cases orchestrating engine + db + analytics (intent, decide, outcome…).
  analytics/  canonical_event writer + typed event contracts + export queries.
  sourcemon/  4 provider adapters + fingerprint/change/expiry + shadow automation + review queue.
  app/        Participant routes (mobile-first).  app/admin/  Research/admin routes.
  lib/        money, minorUnits, time (Lima), auth, ids, guards.
```
**Hard rule:** `engine/` and `corpus/` must not import `db/`, `app/`, `analytics/`, Next, or environment/git data.

```
                         ┌──────────────────────────────────────────────┐
  Participant (mobile)──▶│  /app  routes ─┐                              │
  Researcher/Admin ─────▶│  /admin routes ┤ Server Actions + Handlers    │
                         │                ▼                              │
                         │   services (intent·decide·outcome·evidence·   │
                         │             contact·admin·export)             │
                         │        │                     │                │
                         │   ┌────▼─────┐        ┌───────▼───────┐        │
                         │   │ ENGINE   │(pure)  │ ANALYTICS      │       │
                         │   └────┬─────┘        │ canonical_event│       │
                         │        │ reads        └───────┬────────┘       │
                         │   ┌────▼───────────────────────▼───┐          │
                         │   │      Prisma / Postgres (Neon)   │          │
                         │   └────▲────────────────────────────┘          │
   Vercel Cron ─────────▶│  SOURCE MONITOR (IBK/Diners/BCP/Sip)           │
                         │   → SourceCheck/ProposedRuleVersion/RuleAudit  │
                         │   → Review Queue (admin)                       │
                         │  Private Blob (evidence) · Sentry · Resend     │
                         └──────────────────────────────────────────────┘
```
Corpus = version-controlled seed → `Campaign`/`RuleVersion`. Engine reads immutable rule versions + inputs; writes nothing.

---

## 4. Architecture Invariants

- **INV-A (source-of-truth split):** decision-critical facts live in domain tables; `CanonicalEvent` is telemetry. No research metric is computed from events alone.
- **INV-B (rule dual-model):** `RuleVersion` is immutable semantics; rankability-at-time comes from the append-only two-axis operational state (§14). A Decision snapshot freezes both axes, so history never depends on the mutable timeline.
- **INV-C (comparability):** only candidates sharing the same `equivalenceGroup` under a compatible `ComparisonBasis` may be ranked. Cross-scope ranking is a bug.
- **INV-D (materiality):** a confirmed winner is asserted only if no *system-unresolvable* uncertain candidate `couldChangeDecision`. User-resolvable (private) upside is an advisory, not a blocker.
- **INV-E (reproducibility):** every persisted `DecisionSnapshot` records `engineSemanticVersion`, `buildId`, `gitSha`, `corpusVersion`, and exact `ruleRef{id,version}` per candidate. The snapshot is primary evidence; re-execution, if ever needed, is from the `gitSha` checkout — the live app never carries multiple engine implementations, and the pure engine itself reads no build/env data (§15).
- **INV-F (idempotency):** intent-finalize, decide, outcome, evidence, and critical event writes are idempotent by client key (unique constraint / upsert). Retries never duplicate decisions/outcomes/VS3.
- **INV-G (derived contamination):** exposure/contamination is recomputed from `ResearchContact` + exposure records per frozen `AnalysisProtocol`; any cached flag is diagnostic and never authoritative.
- **INV-H (consent gate):** no behavioral data before required `StudyConsent`.

**Cost envelope (coarse):** Neon (small paid, PITR/backups), Vercel (Pro: cron + previews), Resend (starter), Sentry (team/free), Blob (usage) ⇒ **≈ US$40–90/month**. Zero-cost is not pursued where it risks data loss (DB backups, email deliverability).

---

## 5. Domain / Rule Model

Typed **declarative** rules (no executable expressions in DB). A `RuleVersion` is immutable; edits create new versions.

```ts
type BenefitType =
  | 'PERCENT' | 'FIXED_DISCOUNT' | 'FIXED_PRICE' | 'TWO_FOR_ONE'
  | 'FIXED_BUNDLE' | 'CASHBACK' | 'NON_CASH_NOMINAL'

type EligibilityClass =
  | 'DETERMINISTIC_PUBLIC' | 'USER_DECLARABLE' | 'DYNAMIC_EXTERNAL' | 'PROVIDER_PRIVATE'

interface RuleVersion {                        // IMMUTABLE semantics — "what did this rule mean?"
  ruleId: string; version: number
  campaignId: string; merchantId: string
  providerFamily: 'IBK_PLIN'|'DINERS'|'BCP_QORE'|'SIP_OH'
  benefit: Benefit                             // includes eligibleSpendSelector (§8)
  constraints: Constraints
  eligibilityClass: EligibilityClass
  confidence: 'HIGH'|'MEDIUM'|'LOW'
  comparisonScopeRef: ComparablePurchaseKey    // §8
  provenance: { sourceId: string; observedAt: string; url: string }
}

interface Benefit {
  type: BenefitType
  percentBps?: number                          // basis points
  fixedDiscountCentimos?: number
  fixedPriceCentimos?: number
  regularReferenceCentimos?: number            // provider-declared; NOT a ranking input (§6)
  nofN?: { pay: number; of: number }
  bundlePriceCentimos?: number
  cashback?: { valueCentimos: number; settlementDelay: string }
  nominal?: { minorUnits: number; unit: string }   // NON_CASH_NOMINAL; never PEN (§6)
  eligibleSpendSelector: EligibleSpendSelector      // per-rule (§8)
}

interface Constraints {
  minSpendCentimos?: number
  cap?: { kind: 'AMOUNT'; centimos: number } | { kind: 'UNKNOWN_NOT_STATED' }
  dateRange: { start: string; end: string }
  weekdays?: Weekday[]; timeWindow?: { from: string; to: string }
  holidayPolicy: 'NONE' | 'EXCLUDED' | 'SPECIFIC_DATES' | 'UNKNOWN'   // §13
  specificBlackoutDates?: string[]
  locations?: { include?: string[]; exclude?: string[] }
  channels?: Channel[]                         // salon|takeaway|delivery|web_app|box_office
  products?: { includeSku?: string[]; excludeSku?: string[] }
  useLimit?: { per: 'DAY'|'ORDER'|'MONTH'|'CAMPAIGN'; count: number }
  stock?: { known: boolean; remaining?: number }   // DYNAMIC_EXTERNAL
  cardNetwork?: 'AMEX'|'VISA'|'MC'|'ANY'; cardTier?: string
  membership?: string; providerPrivateKey?: string  // e.g. 'qore_active'
  combinability: 'NO' | 'UNKNOWN' | 'YES'
}
```
All 46 rules and the torture suite map to this model. No generic cart/ecommerce basket.

---

## 6. Economic Value Model

`Money` = integer **céntimos** (PEN). Nominal value = integer **minor units** in a named unit. **Never conflated, never floated.**

- `effectiveCostCentimos` — what the participant actually pays. **Primary ranking quantity** under the cost basis.
- `penSavedCentimos` — immediate PEN saving. **Retained only** for explanation, VS3 verification, savings analysis, RIVSR — **never a ranking input.** Where a single **independent baseline** exists for an equivalence group, `penSaved` may be derived from that common baseline for display; it is never taken from incompatible provider-declared regulars.
- `nominalValue = { minorUnits, unit }` — non-cash benefit (e.g. `{ minorUnits: 8500, unit: 'CONEY_PLAY_BALANCE' }` = S/85 play balance). **Never** added to `penSaved`; never labeled cash; never feeds VS3/RIVSR as cash.
- `cashback = { valueCentimos, settlementDelay }` — economic but delayed; excluded from immediate-cost ranking; surfaced separately.

**Comparison basis (typed):**
```ts
type ComparisonBasis = 'EFFECTIVE_OUT_OF_POCKET_COST' | 'NOMINAL_VALUE_SAME_UNIT' | 'NON_COMPARABLE'
```
- `EFFECTIVE_OUT_OF_POCKET_COST` → **argmin `effectiveCostCentimos`**. Exact-equal cost → `CONFIRMED_TIE`.
- `NOMINAL_VALUE_SAME_UNIT` → **argmax `nominalValue.minorUnits`**. Equal → tie. **Permitted to rank ONLY when ALL hold:**
  1. the nominal **unit is identical** across candidates;
  2. the **cash acquisition cost is confirmed equivalent** (candidates pay the same cash, e.g. both S/45);
  3. **no subjective conversion to PEN** is required.
  If any condition fails → the alternatives are `NON_COMPARABLE`. Phase 0A does **not** build multidimensional optimization (no cash-cost vs nominal-value trade-off).
- `NON_COMPARABLE` → excluded from ranking; surfaced as a `NON_COMPARABLE` advisory (points/miles/unrelated rewards, or a failed nominal condition).

**Rounding:** ranking uses exact integer comparison (percentages via exact scaled-integer/rational math). Displayed PEN saving is floored to the céntimo (never overstate). Nominal comparisons are exact integer minor units.

---

## 7. Eligibility Model

Portfolio is declarative and card-number-free: provider family, instrument, network, tier, membership. Provider-private states use explicit tri-state:
```ts
type Tri = 'YES' | 'NO' | 'UNKNOWN'
interface EligibilityPortfolio {
  families: ProviderFamily[]
  instruments: { family; network?; tier?; membership? }[]
  privateStates: Record<string, Tri>          // e.g. { qore_active: 'UNKNOWN' }
}
```
**Invariant (property-tested):** owning a BCP card never sets `qore_active = YES`. `UNKNOWN` private state ⇒ that rule can only ever surface as a `VERIFY_FIRST` advisory (or a `VERIFY_FIRST` decision status when nothing else is confirmable), never `BEST_CONFIRMED`.

---

## 8. Comparability / Same-Purchase Model

Typed, declarative — no runtime expressions. The `ComparisonScope` carries the **basis** (shared); the **eligible-spend selector is per-rule** (candidates in one group may compute eligible spend differently).

```ts
type ComparablePurchaseKey = string   // e.g. CHINAWOK_CHIJAUKAY_A_LO_POBRE_DRINK, POPEYES_6PCS_FAMILY_POTATO
type ContextReq = 'BASKET' | 'AMOUNT' | 'TICKET_PRICE' | 'CHANNEL' | 'DATE'

interface ComparisonScope {
  key: ComparablePurchaseKey
  equivalenceGroup: string           // rankable-together group
  comparisonBasis: ComparisonBasis
  requiredContext: ContextReq[]
}

type EligibleSpendSelector =
  | 'WHOLE_BILL' | 'FOOD_ONLY' | 'FOOD_PLUS_NONALCOHOLIC'
  | 'EXACT_SKU_BUNDLE' | 'TICKET_UNIT' | 'NON_EQUIVALENT_PURCHASE'
```
**Ranking rule:** only candidates in the **same `equivalenceGroup`** are ranked, under that group's `comparisonBasis`. Each candidate applies **its own `Benefit.eligibleSpendSelector`** to the declared basket/amount. Perroquet: BCP → `FOOD_PLUS_NONALCOHOLIC`, Diners → `FOOD_ONLY`; both in one group under `EFFECTIVE_OUT_OF_POCKET_COST` — the composition switch is pure arithmetic over declared line items, no code. Different Pizza Hut bundles get **different keys** ⇒ never compared merely for sharing a merchant; each is its own opportunity or a `NON_EQUIVALENT_PURCHASE` advisory. Missing `requiredContext` ⇒ `MISSING_CONTEXT` (→ materiality, §11).

---

## 9. Decision Engine (pipeline)

Pure `decide({ rules, portfolio, context, evaluatedAt, intendedTransactionAt }) → EngineDecisionResult`:

1. Load rule versions for merchant (quarantined never enter the candidate set).
2. **Source state** as-of `evaluatedAt` (two axes, §14): stale/inaccessible/conflicted flagged; conflicted excluded from ranking.
3. Temporal validity vs `intendedTransactionAt` (date range, weekday, time, holiday §13).
4. Merchant/location. 5. Channel. 6. Product/basket (only where SKU/basket rules apply; missing required context ⇒ `MISSING_CONTEXT`).
7. Declared eligibility (network/tier/membership).
8. Classify unknown/private: `DYNAMIC_EXTERNAL` stock-unknown ⇒ downgrade rankable→`LIKELY`/`DYNAMIC_AVAILABILITY`; `PROVIDER_PRIVATE` UNKNOWN ⇒ `VERIFY_FIRST` bucket.
9. Compute economic value (§6, exact); assign `comparisonBasis` from scope.
10. Partition: comparable-eligible (rankable) · verify-first · non-comparable · rejected(with reason).
11. Rank comparable-eligible **within equivalence group by basis** (§6/§8).
12. Confidence + **rankability** (§12).
13. **Materiality × resolvability** (§11).
14. Emit `EngineDecisionResult` (status + typed delta + advisories). Persistence layer wraps it into an immutable `DecisionSnapshot` (§15).

Source-state is deliberately step 2 (before temporal), so a stale/conflicted source can never contribute a ranked winner.

---

## 10. Decision-State & Advisory Semantics

Decision-level **status** = safest assertable answer. Candidate-level **advisories** = per-option uncertainty. They do not collide.

```ts
type DecisionStatus =
  | 'BEST_CONFIRMED' | 'CONFIRMED_TIE' | 'LIKELY'
  | 'VERIFY_FIRST'                     // ONLY when no confirmable option and best path is "go verify"
  | 'NO_SAFE_WINNER' | 'NO_APPLICABLE_BENEFIT'
  | 'SOURCE_STALE' | 'SOURCE_CONFLICT'

type AdvisoryStatus =
  | 'VERIFY_FIRST'                     // provider-private, USER-resolvable upside
  | 'STALE_CANDIDATE' | 'CONFLICTED_CANDIDATE'
  | 'NON_COMPARABLE' | 'NON_EQUIVALENT_PURCHASE'
  | 'DYNAMIC_AVAILABILITY'
  | 'UNKNOWN_CAP' | 'UNKNOWN_COMBINABILITY' | 'MISSING_CONTEXT'

type DecisionDelta =                   // typed by ComparisonBasis (COST_CENTIMOS | NOMINAL_VALUE)
  | { basis: 'EFFECTIVE_OUT_OF_POCKET_COST'; kind: 'COST_CENTIMOS'; value: number }
  | { basis: 'NOMINAL_VALUE_SAME_UNIT';      kind: 'NOMINAL_VALUE'; unit: string; value: number }
```

**Status precedence:**
| Status | Condition |
| :-- | :-- |
| `NO_APPLICABLE_BENEFIT` | No rule matches merchant+context. |
| `SOURCE_CONFLICT` | Rankable set empty; a decision-material candidate is `CONFLICTED` (excluded). |
| `SOURCE_STALE` | Rankable set empty; remaining material candidates are `STALE`. |
| `NO_SAFE_WINNER` | A rankable winner exists but a **system-unresolvable material** candidate shares the group (unknown cap, unknown combinability, unbounded stale/conflict, missing context). |
| `VERIFY_FIRST` | Rankable set empty; sole path is a **user-resolvable** private option. |
| `CONFIRMED_TIE` | ≥2 comparable-eligible options exactly equal at top (by basis). |
| `LIKELY` | Comparable winner rests on `DYNAMIC_AVAILABILITY` or MEDIUM (non-material) confidence. |
| `BEST_CONFIRMED` | ≥1 comparable-eligible option, uniquely optimal, HIGH confidence, no blocking material unknown. |

**Coexistence example (Fridays / Qore):**
```
status = BEST_CONFIRMED, winner = Interbank (25%),
delta  = { basis: EFFECTIVE_OUT_OF_POCKET_COST, kind: COST_CENTIMOS, value: <runnerUp − winner> },
advisories = [{ candidate: BCP_QORE, advisory: VERIFY_FIRST, couldChangeDecision: true }]
UX: "Best confirmed option: Interbank. A potentially better Qore option exists if that private benefit is active."
```

---

## 11. Materiality × Resolvability

For each uncertain/excluded candidate that shares the winner's `equivalenceGroup`, compute a typed bound:
```ts
type PlausibleBound =
  | { kind: 'KNOWN_BOUND'; minCostCentimos?: number; maxValueMinorUnits?: number }
  | { kind: 'UNKNOWN_OR_UNBOUNDED' }
```
```
basis = EFFECTIVE_OUT_OF_POCKET_COST → material iff minCostCentimos   ≤ winner.effectiveCostCentimos   // ≤ : equality is material (could tie)
basis = NOMINAL_VALUE_SAME_UNIT      → material iff maxValueMinorUnits ≥ winner.nominalValue.minorUnits
kind  = UNKNOWN_OR_UNBOUNDED         → material by default (true)
couldChangeDecision = material(...)
```
**Bound rules (conservative):**
- `UNKNOWN_CAP` → `KNOWN_BOUND` **only** where the **uncapped** value function gives a defensible bound for this transaction (uncapped saving ≥ true saving ⇒ valid optimistic bound). Baco high-value: uncapped 20% ⇒ `minCost` below capped rivals ⇒ material.
- `UNKNOWN_COMBINABILITY` → **material by default** → `UNKNOWN_OR_UNBOUNDED` unless a safe bound proves otherwise.
- `STALE`/`CONFLICTED` whose current value cannot be safely bounded and that share the group → `UNKNOWN_OR_UNBOUNDED` → material. Never assumed harmless because the last-known value was below the current winner.

**Resolvability:**
| Uncertainty | User-resolvable? | If material |
| :-- | :-- | :-- |
| `PROVIDER_PRIVATE` (Qore) | Yes (check app) | winner stands; `VERIFY_FIRST` advisory (`couldChangeDecision=true`) |
| `UNKNOWN_CAP` / `UNKNOWN_COMBINABILITY` | No | `NO_SAFE_WINNER` |
| `STALE`/`CONFLICTED` (could exceed) | No | `NO_SAFE_WINNER` (or `SOURCE_STALE`/`SOURCE_CONFLICT` if rankable set empty) |
| `MISSING_CONTEXT` changing order | No (until provided) | `NO_SAFE_WINNER` / prompt for context |

If `couldChangeDecision=false`, a safe confirmed result stands and the uncertain candidate is a **non-material advisory**.

---

## 12. Confidence / Rankability

| Confidence | Rankable? |
| :-- | :-- |
| HIGH | yes, if all conditions pass |
| MEDIUM | only if its uncertainty is **proven non-material** to this decision (else advisory) |
| LOW | **never participant-rankable** — admin/research review only (`REVIEW_REQUIRED`) |

`LOW` can never yield `BEST_CONFIRMED`, `LIKELY`, or a confirmed tie; no enum conversion changes this. Participant UX may show at most a generic line: *"Some offers were excluded because they could not be verified with sufficient confidence."*

---

## 13. Time / Holiday Semantics

**Two times, both `America/Lima`, never overloaded:**
- `intendedTransactionAt` — drives promotion **calendar/weekday/time/holiday/channel** eligibility.
- `evaluatedAt` — drives **source freshness / system observation** and the operational-state as-of query.

**Holiday policy:** `holidayPolicy ∈ { NONE, EXCLUDED, SPECIFIC_DATES, UNKNOWN }` — `NONE` = source explicitly imposes no restriction · `EXCLUDED` = explicitly excludes holidays · `SPECIFIC_DATES` = `specificBlackoutDates` list · `UNKNOWN` = incomplete info (→ materiality). Fridays fixture: Sip `NONE`, Interbank `EXCLUDED`. `HolidayCalendar` holds Lima holidays.

---

## 14. Corpus Versioning + Rule Operational State (two axes)

Two independent axes:
- **Experiment scope = FROZEN** at `2026-08-30T18:00-05` (14 merchants, 4 families, 2 categories). New campaigns/merchants → `v1-next-candidate`, never auto-activated for a running cohort.
- **Operational rule state = MUTABLE**: `RuleVersion` is immutable (identity `ruleId`, version bumps on correction/expiry/cap-change + a `RuleChange` row).

**Rankability-at-time is two append-only axes** (no single mutable `status`):
```ts
type PublicationState   = 'ACTIVE' | 'FUTURE' | 'EXPIRED' | 'QUARANTINED'
type SourceQualityState = 'FRESH' | 'STALE' | 'INACCESSIBLE' | 'CONFLICTED' | 'UNKNOWN'

interface RulePublicationEvent   { id; ruleVersionId; state: PublicationState;   effectiveAt; reason; sourceCheckId?; actor }
interface RuleSourceQualityEvent { id; ruleVersionId; state: SourceQualityState; effectiveAt; reason; sourceCheckId?; actor }

interface RuleOperationalStateSnapshot {   // frozen into every DecisionCandidate
  publicationState: PublicationState
  sourceQualityState: SourceQualityState
  asOf: string
}
```
A rule may be `publicationState=ACTIVE` + `sourceQualityState=STALE`. The engine evaluates **both as-of `evaluatedAt`**; the Decision snapshot freezes both. Every rule traces to `Source` + `observedAt` + `url`.

---

## 15. Decision Snapshot Strategy + Engine/Persistence Boundary

The **pure engine** returns build-free data:
```ts
interface EngineDecisionResult {
  status: DecisionStatus
  winnerRef?: RuleRef; runnerUpRef?: RuleRef
  delta?: DecisionDelta
  confidence: 'HIGH'|'MEDIUM'|'LOW'
  candidates: DecisionCandidate[]      // full evaluated set
  advisories: DecisionCandidate[]      // uncertain/coexisting options surfaced to UX
  explanation: string; provenance: Provenance[]
  evaluatedAt: string; intendedTransactionAt: string
}
```
The **application service** enriches and persists an immutable snapshot (no `UPDATE` on prior decisions):
```ts
interface DecisionSnapshot extends EngineDecisionResult {
  id; participantId; purchaseIntentId; computedAt; idempotencyKey
  engineSemanticVersion; buildId; gitSha; corpusVersion       // added here, NOT read by the engine
  ruleRefs: RuleRef[]                                          // exact versions used
}

interface DecisionCandidate {
  ruleRef: { ruleId: string; version: number }
  operationalStateAtDecision: RuleOperationalStateSnapshot
  comparisonScopeRef: ComparablePurchaseKey | null
  comparisonBasis: ComparisonBasis
  eligibility: 'ELIGIBLE' | 'INELIGIBLE' | 'UNKNOWN'
  comparable: boolean
  effectiveCostCentimos?: number                       // rank key when basis = EFFECTIVE_OUT_OF_POCKET_COST
  nominalValue?: { minorUnits: number; unit: string }  // rank key when basis = NOMINAL_VALUE_SAME_UNIT
  penSavedCentimos?: number                            // explanation / VS3 / RIVSR only — never a rank key
  baselineRef?: string
  plausibleBound: PlausibleBound
  couldChangeDecision: boolean
  advisory?: AdvisoryStatus
  rejectionReason?: string
}
```
**Immutability invariant (property-tested):** re-running the engine on the stored snapshot inputs at the stored `gitSha` reproduces the same status/winner/delta. Corpus edits create new versions and never mutate prior `DecisionSnapshot` rows.

---

## 16. Change Log

Every post-freeze mutation writes a `RuleChange`: `rule_id`, `rule_version_old/new`, `field_changed`, `old_value`, `new_value`, `source_url`, `detected_at`, `corrected_at`, `detection_method`, `change_reason`, `material_to_decision`, `old_winner?`, `new_winner?`, `participants_exposed[]`, `retroactive_impact`, `reviewer`. A material correction makes prior potentially-wrong recommendations auditable.

---

## 17. Source Monitor + Shadow Automation

4 provider-specific adapters (no generic parser). Publication stays human-confirmed in 0A; the system **measures** whether automation would have been correct.
```
SourceCheck → parser/extractor → ProposedRuleVersion(+confidence, wouldAutoAccept)
           → human independent audit → correctness result → approved operational change
```
```ts
interface SourceCheck {
  sourceId; checkedAt; statusCode; latencyMs; fingerprint
  lastObservedUnchangedAt; firstObservedChangedAt          // interval-censored; NO fabricated actualChangedAt
  accessibility: 'OK' | 'BLOCKED' | 'ERROR'
}
interface ProposedRuleVersion {
  sourceCheckId; adapterVersion; parserVersion
  proposedStructuredChange; parserConfidence; wouldAutoAccept: boolean
  humanSemanticInterventionRequired: boolean
  humanAuditResult: 'CORRECT' | 'INCORRECT' | 'PARTIAL'
  materialDiscrepancy: boolean; appliedOperationalChangeId?
}
```
- **Automation Rate** = proposals with `wouldAutoAccept ∧ humanAuditResult=CORRECT ∧ ¬materialDiscrepancy` / total changes. **Exception Rate** = proposals needing `humanSemanticInterventionRequired` OR where `wouldAutoAccept` disagreed with audit.
- **Safe deterministic auto-apply:** unambiguous **expiry** (clean date parse, no semantic change) may auto-apply if justified; recorded for the same metrics.
- **TTDC:** interval-censored `[lastObservedUnchangedAt, firstObservedChangedAt]` (midpoint with bounds), never a fabricated exact time.
- **Fixtures:** adapter tests use minimal **sanitized excerpts / fingerprints**, not full provider HTML in the repo. Any raw snapshot retained is private, access-controlled, retention-limited, not redistributed.

---

## 18. Review Queue

Minimal workflow for: changed rule · conflicting source · unknown parser semantics · user stale-report · high-impact correction. Reviewer sees old normalized version, new source info, proposed interpretation, and impact (which decisions/participants). Actions: accept (new version) / quarantine / downgrade source-quality / dismiss. Not enterprise workflow software.

---

## 19. Independent Audit Model

Parser self-validation is not an audit.
```ts
interface RuleAudit {
  ruleVersionId; sourceCheckId; auditType: 'RANDOM' | 'TARGETED'; auditor; auditedAt
  fieldsChecked[]; materialErrorFound: boolean; errorCategory?
  changesEligibility: boolean; changesEconomicValue: boolean; changesWinner: boolean; notes
}
```
RANDOM sample of active versions + TARGETED audits of O4/high-value rules. **CEA** = 1 − (audited versions with `materialErrorFound` on critical fields / audited versions), from `RuleAudit` only. **SFR** derived from `RuleAudit` + `SourceCheck` freshness. Auditor ≠ parser/adapter author.

---

## 20. Data Quality Metrics

Log enough on `SourceCheck`/`RuleChange`/`ProposedRuleVersion`/`RuleAudit` to reproduce: Source Freshness Rate, Critical Extraction Accuracy, Automation Rate, Exception Rate, Time-to-Detect-Change (interval-censored), Time-to-Correct, Human Minutes per 100 changes. All derived by SQL; never stored as results.

---

## 21. Outcome / Verified Saving Model

VS ladder on `Outcome`: **VS0** theoretical (decision computed) · **VS1** intended · **VS2** self-reported · **VS3** transaction-corroborated (evidence verified) · **VS4** dual-corroborated. Statuses: intended · attempted · self-reported · evidence-submitted · evidence-verified · failed · abandoned. **RIVSR uses VS3.** Nominal-value outcomes never count as PEN VS3. Raw fields captured; RIVSR computed only in analysis (never hard-coded).

---

## 22. Evidence Privacy

Optional, minimized: client-side crop + redaction instructions. Upload hardening: **size limit**, **MIME allowlist** (jpeg/png/webp/pdf), **server-side safe re-encode** + **EXIF/metadata strip**, private object store only, **no public URL** (signed short-lived reads for verifiers). No OCR — manual verification is acceptable. **Verify-then-purge**: after verification, retain only metadata and delete the image at `retentionUntil`. Surviving VS3 metadata: `verificationMethod, verifier, verifiedAmountCentimos, evidenceType, decisionId, verifiedAt, discrepancyFromPredictedCentimos, retentionUntil`.

---

## 23. Research Source-of-Truth Hierarchy

- **Domain transactional tables = canonical truth** for: PurchaseIntent, EligibilityDeclaration, DecisionSnapshot, Outcome + verified-saving level, ResearchContact, WeeklyExposureReport / study exposure, rule + operational + source state.
- **CanonicalEvent = canonical truth for telemetry** with no domain representation: views, page exposure, funnel interactions, content entry, button clicks, share, generic behavioral signals.
- **RIVSR and every decision-critical metric are reproducible primarily from domain records + exposure/contact data.**
- **Conflict rule:** if an event disagrees with a domain record on a decision-critical value, the **domain record wins**; the divergence is logged as a data-quality exception (never silently reconciled toward the event). Events fill only gaps with no domain fact.

---

## 24. Canonical Analytics + Event Contracts

First-party `CanonicalEvent` (24 events) with a shared envelope: `{ name, ts, actor, participantId?, decisionId?, experimentWave, onboardingVariant, corpusVersion, prototypeVersion, acquisitionSource, entrySource? }` + typed per-event props (Zod). **No authoritative `researchContactExposure` on events** — at most an optional diagnostic hint, ignored by the locked analysis (INV-G). Events written transactionally alongside the state change they describe. Derived metrics are never emitted as raw events. Events: acquisition_visit, qualified_visit, merchant_search, merchant_selected, purchase_intent_declared, portfolio_prompt_shown, instrument_selected, portfolio_context_completed, decision_computed, actionable_recommendation_returned, no_actionable_recommendation, recommendation_viewed, evidence_viewed, recommendation_intended, recommendation_attempted, saving_reported, saving_verified, recommendation_failed, purchase_abandoned, offer_stale_reported, recommendation_shared, research_contact, premium_prompt_exposed, premium_interest_action.

---

## 25. Independent-Use + Research Contact Contamination

`ResearchContact { participantId, ts, contactType }` + `contactType ∈ { WEEKLY_CHECK_IN, RESEARCHER_CONTACT, BEHAVIORAL_NUDGE }` (auth messages logged separately, non-exposure). Automated nudges also logged. **Independence is derived, not self-reported**: voluntary initiation + genuine intent (`BUYING_NOW/TODAY`) + purchase window + no contact/nudge inside the contamination window + no usability task, per the frozen protocol. Contamination logic never touches recommendation calculation.

---

## 26. Weekly Exposure / Opportunity Model

Lightweight weekly check-in (not a diary) to separate "no opportunity" from "forgot PagaMenos":
```ts
interface WeeklyExposureReport {
  participantId; studyWeek
  coveredPurchaseCount                       // total relevant purchases that week
  supportedMerchantPurchaseCount             // among the 14 corpus merchants
  merchantOccurrences?: { merchantId; count }[]
  submittedAt; collectionMethod: 'FORM' | 'RESEARCHER' | 'REMINDED'
  associatedResearchContactId                // the check-in IS a contact
}
```
Supports analysis eligibility, opportunity density, missed-opportunity interpretation, forgetting analysis. Logged as `ResearchContact(WEEKLY_CHECK_IN)`; any session/intent within the contamination window *after* it is treated as prompted. One report per participant-week; idempotent by `(participantId, studyWeek)`.

---

## 27. Experiment Configuration + AnalysisProtocol Freeze

Simple config fields (no generic platform): `wave (WAVE_0/1/2)`, `onboardingVariant (PORTFOLIO_FIRST / INTENT_FIRST_HYBRID)`, `segment (ICP-A/B)`, `acquisitionSource`, `prototypeVersion`, `analysisProtocolVersion`, stamped onto every event/decision.

**`AnalysisProtocol`** is a repository-controlled, versioned spec (`/analysis/protocol/v1.ts` + `.md`, git-tagged), containing: **`contaminationWindowHours = 24`** (pre-registered — a session/intent within 24h *after* a research check-in/contact is exposure-flagged and excluded from independent use unless the intent predates the contact); independent-intent definition; analysis-eligible definition; **RIVSR** definition; **VS3** rule; exclusion rules; pre-registered thresholds. **Freeze/tag `AnalysisProtocol v1` before Wave 1.** Changes require a new version and are exploratory unless a new cohort begins. Engine/UX never read the protocol; only the analysis pipeline does.

---

## 28. Participant Identity / Auth / Consent

**Research-issued participant code + email magic-link** (Auth.js). No passwords, no card data. **Auth must not manufacture recall:** initial invite/magic-link → **persistent study session** (signed cookie, study-duration TTL) → easy revoke/re-auth. **No forced login before a natural purchase decision.** Admin/researcher is a separate role (env allowlist) behind additional route gating.

Typed message classes (distinct contamination treatment): `AUTH_MESSAGE` (invite/re-auth — **not** exposure) · `STUDY_CHECK_IN` · `RESEARCHER_CONTACT` · `BEHAVIORAL_NUDGE` (all **exposure**, logged as `ResearchContact`).

```ts
interface StudyConsent {
  participantId; consentVersion; privacyNoticeVersion; acceptedAt
  optionalEvidenceConsent: boolean; withdrawnAt?
}
```
No behavioral collection before required consent (INV-H). Withdrawal: hard-delete PII + raw evidence, set `withdrawnAt`, retain only pseudonymized aggregates + verification metadata; exclude from active cohort per protocol.

---

## 29. Session / Intent Attribution + PurchaseIntent Lifecycle

**Two separate attributions:** `Participant.acquisitionSource` (first-touch) vs per-session/intent `entrySource`:
```
entrySource ∈ { DIRECT, CONTENT, SHARED_LINK, RESEARCH_LINK, AUTH_LINK, SAVED_DECISION, OTHER }
+ contentId?, referrer?, studyTaskId?
```
Recorded on each `Session`, copied to the `PurchaseIntent` created in it — distinguishing content-driven return from independent direct return.

```ts
interface PurchaseIntent {
  // IMMUTABLE initiation:
  participantId; sessionId; intentType; entrySource; initiatedAt
  // MUTABLE while DRAFT:
  context?: { merchant; branch?; intendedTransactionAt; channel; amountCentimos?; basket? }
  status: 'DRAFT' | 'FINALIZED'; finalizedAt?; idempotencyKey
}
```
`intentType ∈ { BUYING_NOW, BUYING_TODAY, CONSIDERING_LATER, EXPLORATORY }` (first two qualify for purchase-intent analysis). Declaring intent writes the immutable initiation. Context is editable only while `DRAFT`. Computing a Decision sets `FINALIZED`, freezes context into the `DecisionSnapshot`, and never overwrites initiation evidence.

---

## 30. Data Model (entities)

| Entity | Purpose | Immutability |
| :-- | :-- | :-- |
| Participant | pseudonymous identity (code, emailHash) | append-mostly |
| IdentityMap | access-controlled `participantId ↔ email` (excluded from exports) | restricted |
| ExperimentAssignment | wave/variant/segment/acq/version/`analysisProtocolVersion` | immutable per assignment |
| StudyConsent | versioned consent | append |
| Session | per-visit `entrySource` + attribution | immutable |
| ResearchContact | contamination log (typed contactType) | immutable |
| WeeklyExposureReport | weekly opportunity check-in | immutable per (participant, week) |
| EligibilityInstrument / EligibilityDeclaration | catalog / per-participant tri-state portfolio snapshot | reference / immutable snapshot |
| Merchant / MerchantLocation | canonical merchant + branches + aliases | reference |
| Campaign | provider campaign identity | reference |
| RuleVersion | immutable rule semantics + `comparisonScopeRef` | **immutable** |
| RulePublicationEvent / RuleSourceQualityEvent | two append-only operational axes | append-only |
| Source / SourceCheck / SourceSnapshot | provenance + monitoring (interval-censored) | append-only |
| ProposedRuleVersion / RuleAudit | shadow automation / independent audit | append-only |
| PurchaseIntent | initiation (immutable) + draft context | see §29 |
| DecisionSnapshot / DecisionCandidate | immutable decision (§15) | **immutable** |
| Outcome | VS ladder | append |
| SavingEvidence | minimized upload; verify-then-purge | metadata survives |
| RuleChange | change log (§16) | immutable |
| CanonicalEvent | first-party telemetry | append-only |
| HolidayCalendar | Lima holidays | reference |
| AnalysisProtocol | versioned repo spec + DB pointer | version-tagged |

Idempotency keys (unique): `PurchaseIntent` finalize, `DecisionSnapshot`, `Outcome`, `SavingEvidence`, critical events.

---

## 31. Data Export / Analysis Support

Reproducible CSV/JSON/SQL exports for four datasets: participant-level, decision-level, rule/source-quality, acquisition funnel. **Pseudonymized by default** — raw email/auth identity never appears in ordinary research exports (held only in the access-controlled `IdentityMap`). Versioned SQL in `/analysis`. No BI platform; no data trapped in dashboards.

---

## 32. Security

TLS (platform); Auth.js sessions; admin route guard + allowlist; signed private evidence URLs; object access control; secrets in env/Vercel; audit events on admin mutations; nightly Neon backups; basic rate limiting on auth + decision endpoints. No card data ever; no public evidence URLs. Proportionate — no enterprise IAM.

---

## 33. Privacy

Data-minimization. **Necessary:** participant code, email (magic-link/follow-up), declared portfolio (no numbers), purchase context, outcomes. **Optional:** evidence image (purged post-verification). **Prohibited:** card numbers, CVV, credentials, balances, transaction history, bank access. Retention + deletion + participant-withdrawal defined (§28). Design avoids accidentally testing production privacy assumptions.

---

## 34. Infrastructure / Deployment

**Vercel + Neon** for 30–50 participants: Next.js-native, built-in Cron + Blob, Neon serverless Postgres with branch = staging. Cheap, predictable, low-ops. If source-monitor jobs ever exceed Vercel Cron limits, add one tiny Railway/Render worker (not expected for daily 4-family checks). Not optimized for millions of requests; DB not on fragile hobby tiers.

---

## 35. Observability

App: errors, request/job failures (Sentry). Engine: calculation failures, unexpected no-result, **invariant violations** (expired/quarantined winner, cap exceeded, `PROVIDER_PRIVATE` UNKNOWN confirmed, cross-scope ranking) → hard error + alert. Pipeline: source-failed, changed-source, stale-rules, parser errors → review queue + alert. Experiment: event-ingestion health, missing analytics, evidence-upload failure. Alerts: any engine invariant violation; source inaccessible >48h; event write failure.

---

## 36. Test Strategy

Correctness-first. **Unit** (rule predicates, money/minor-unit functions, exact rounding). **Fixture/golden** (12 canonical, §37). **Property/invariant** (fast-check): discount ≤ cap; expired/quarantined can't win; `PROVIDER_PRIVATE` UNKNOWN can't be `BEST_CONFIRMED`; no PEN invented for non-cash; **no cross-scope ranking (INV-C)**; **system-unresolvable material ⇒ not BEST (INV-D)**; **LOW never ranks**; snapshot re-run stable. **Integration** (decide → immutable snapshot + atomic domain writes + events; idempotent retries). **Source-adapter** (sanitized fixtures). **Analytics** (correct event emission; RIVSR from domain records). **E2E** (Playwright core flow). Mutation/adversarial on caps, date ranges, eligibility, comparator ordering.

---

## 37. Golden Fixture Strategy

The 12 canonical fixtures are the engine acceptance gate, each with **explicit assertions** (decision status, winner, runner-up, effective cost / nominal value, typed `delta`, per-candidate eligibility/advisory, `comparisonBasis`, `couldChangeDecision`, bound kind, non-cash treatment, refusal reason). **Golden snapshots are supplemental** — a snapshot diff without a matching explicit-assertion change fails CI.

| # | Fixture | Expected |
| :-- | :-- | :-- |
| 01 | Chinawok exact | cost basis: Plin pays 15.90 < Sip 16.90 → **Plin** `BEST_CONFIRMED`; ranked by effective cost, not provider penSaved |
| 01b | Papa Johns (P1 canonical) | large-classic: Plin pays 13.90 < BCP 20.90 → **Plin**, though provider regulars differ (27.90 vs 32.90); ranking ignores incompatible regulars |
| 02 | Popeyes 6-piece | Sip pays 29.90 < BCP 39.90 → **Sip**; delta `COST_CENTIMOS 1000` |
| 03 | Baco S/150 | equal effective cost → `CONFIRMED_TIE` |
| 04 | Baco high-value, IBK cap unknown | `KNOWN_BOUND` (uncapped 20%) ⇒ `couldChangeDecision`, system-unresolvable ⇒ `NO_SAFE_WINNER` |
| 05 | UVK 2 tickets | P=18 → Interbank; P=25 → Diners (amount switch) |
| 06 | Embarcadero 41 | weekday salon → Diners; weekend/pickup → Interbank |
| 07 | Perroquet | per-rule selectors (BCP `FOOD_PLUS_NONALCOHOLIC`, Diners `FOOD_ONLY`), one group: F100+B20 → Diners; F100+B60 → BCP |
| 08 | Fridays | airport normal → Interbank; holiday Lima (`EXCLUDED` vs `NONE`) → Sip |
| 09 | Fridays Qore UNKNOWN | `BEST_CONFIRMED` public + `VERIFY_FIRST` advisory (`couldChangeDecision=true`); never `BEST_CONFIRMED` for Qore |
| 10 | Cineplanet Sip stale/conflicted | quarantined; never in candidate set |
| 11 | Coney Park nominal | `NOMINAL_VALUE_SAME_UNIT`, `unit=CONEY_PLAY_BALANCE`: 8500=8500 → `CONFIRMED_TIE`; `penSavedCentimos=undefined`; excluded from VS3/RIVSR. (Active 8600 vs 8500 → Diners; delta `NOMINAL_VALUE 100` in `CONEY_PLAY_BALANCE`, **not** céntimos) |
| 12 | Popeyes stock exhausted | drops from rankable (`DYNAMIC_AVAILABILITY`); audit trail preserved |

---

## 38. CI

GitHub Actions on every PR: format/lint → typecheck → unit → **fixture/golden (explicit assertions)** → integration → **migration validation** (clean-DB up + seed) → build. Golden/engine failures block merge. No CD beyond Vercel git deploys.

---

## 39. Environment Strategy

**local** (Neon branch or local Postgres) · **staging** (Neon branch, Vercel preview) · **production-research** (single low-traffic deploy). Separate DBs + seed guards so wave participants never touch dev data.

---

## 40. Implementation Milestones (final)

Each ends in a verifiable artifact.

| M | Deliverable | Effort |
| :-- | :-- | :-- |
| M0 | Repo bootstrap: Next+TS+Prisma+CI+boundary lint | S |
| M1 | Corpus v1 typed model (`ComparisonScope`, per-rule `eligibleSpendSelector`, two-axis operational state) + Zod + version-controlled seed (46 rules traceable) | M |
| M2 | Pure evaluator: comparability + basis ranking + rankability + materiality×resolvability + split times + 4-value holiday | L |
| M3 | 12 golden fixtures pass on **explicit assertions** + property suite (INV-C/D, LOW-never-ranks) | M |
| M3.5 | Immutable `DecisionSnapshot` persistence + canonical events + idempotency + reproducibility fields | M |
| M4 | Participant intent flow (merchant→intent→context; `Session.entrySource`; DRAFT/FINALIZED) | M |
| M5 | Eligibility portfolio (tri-state) + `StudyConsent` gate + persistent session | S |
| M6 | Decision UX (status + advisories + provenance, mobile) | M |
| M7 | Outcomes + VS ladder + evidence (hardened, verify-then-purge) | M |
| M8 | Admin/research tools + review queue + `ProposedRuleVersion` shadow + `RuleAudit` + operational-state timeline | L |
| M9 | Source monitor (4 adapters) + shadow automation + interval-censored bounds + sanitized fixtures | L |
| M10 | Data-quality metrics (CEA/SFR/Automation/Exception/TTDC) + `WeeklyExposureReport` + exports | M |
| M11 | Analytics reconciliation + independent-use derivation + RIVSR from domain records + pseudonymized exports | M |
| M11.5 | **Freeze/tag `AnalysisProtocol v1`** (gate before Wave 1) | S |
| M12 | Wave-0 readiness (§46) | M |

---

## 41. Milestone Gates

- **Corpus gate (M1):** every rule traces to source + version; seed reproducible from zero; each rule has a `ComparisonScope`.
- **Evaluator gate (M3):** all 12 fixtures pass on explicit assertions; invariant properties hold.
- **Snapshot gate (M3.5):** stored decision re-runs identically at its `gitSha`; corpus edit never mutates prior decision; idempotent retries.
- **Analytics gate (M11):** synthetic journey reconstructs from domain records; RIVSR query runs; contamination recomputed from raw contacts.
- **Protocol gate (M11.5):** `AnalysisProtocol v1` tagged, `contaminationWindowHours=24`.
- **Wave-0 gate (M12):** no critical correctness/security/instrumentation issue; §46 checklist green.

---

## 42. Engineering Backlog (coherent units)

Each: ID · milestone · acceptance · tests · risk · implementer/reviewer. Representative: B-01 bootstrap+boundary (M0) · B-02 corpus schema+seed (M1) · B-03 money/minor-unit + predicate functions (M2) · B-04 basis ranking + materiality + 8-state resolver (M2) · B-05 12 fixtures explicit assertions (M3) · B-06 snapshot+event persistence+idempotency (M3.5) · B-07 intent flow+entrySource (M4) · B-08 portfolio tri-state+consent (M5) · B-09 decision UX (M6) · B-10 outcomes/VS/evidence (M7) · B-11 admin+review+shadow+audit (M8) · B-12 4 adapters+shadow (M9) · B-13 metrics+RIVSR+independence (M10/11).

---

## 43. Model / Agent Allocation

Author ≠ approver on high-risk. **Opus 4.8** — architecture, engine design, state/advisory semantics, materiality, snapshot immutability (reviewer: Codex Sol adversarial). **Codex Sol** — golden/property/mutation tests + independent engine/analytics audit (reviewer: Opus 4.8). **Sonnet 5** — participant/admin UI, forms, event wiring, source adapters (reviewer: Opus 4.8 spot / Codex Sol for adapters). No model authors and approves its own high-risk work.

---

## 44. Code Review Workflow

implement → author tests → **independent review** (stronger for engine/analytics/snapshot than UI) → correction → regression (golden + property stay green) → milestone acceptance against its gate. Engine/analytics PRs require the Codex Sol adversarial pass before merge.

---

## 45. Documentation

Only necessary: README; experimental scope + corpus version; domain-rule semantics; decision-state/advisory semantics; analytics event definitions; experiment config; source-monitor behavior; **Wave-0 runbook**; known limitations. No enterprise docs.

---

## 46. Wave-0 Readiness Checklist

Corpus loaded correctly · golden fixtures pass · no expired/conflicted winner reachable · participant auth + persistent session · portfolio tri-state · consent gate · decision flow · provenance shown · outcomes · evidence minimized+purge · events emitting · research-contact + weekly-exposure logging · admin · source-monitor + shadow running · nightly backups · privacy notice/consent · no sensitive-data leakage (audit) · mobile responsive verified · **analytics reconciliation** (synthetic journey → domain records → RIVSR) · `AnalysisProtocol v1` frozen. All green before the first invite.

---

## 47. Wave-0 Change Policy

**Allowed** without invalidating Wave 1: bug fixes, wording, responsive UI, analytics defects, merchant-alias fixes. **Never silently changed:** scoring, decision logic, success thresholds, ICP, core proposition, `AnalysisProtocol` — material hypothesis changes are classified and logged separately.

---

## 48. Source-Rights Parallel Work

Implementation proceeds for **private validation only**. Architecture assumes **no production permission**: no public catalogue, no SEO pages, data behind participant/research contexts, snapshots internal-only. Rights outreach (Diners/BCP/Sip/Interbank) runs in parallel and is **not** a build gate; Sip stays PERMISSION_REQUIRED. "Implementation GO" ≠ "commercial production clearance".

---

## 49. Primary Technical Risks

| Risk | Prob | Impact | Mitigation | Detection |
| :-- | :-- | :-- | :-- | :-- |
| Rule-model correctness / false winner | Med | Critical | pure engine, exact money/minor-units, basis ranking, materiality, golden+property, adversarial audit | invariant alerts, golden CI |
| Corpus/version drift | Med | High | immutable versions, frozen scope, seed in VCS | snapshot re-run test |
| Analytics corruption (loss/dup) | Med | Critical | domain source-of-truth, atomic + idempotent writes | reconciliation gate |
| Observer contamination | Med | High | contact + weekly-exposure logs; derived independence | contamination flag in export |
| Evidence privacy leak | Low | High | minimize, re-encode/EXIF-strip, signed URLs, purge | no-public-URL audit |
| Source changes mid-wave | High | Med | monitor + shadow + review + change log | daily checks, alerts |
| Auth/session errors | Low | Med | Auth.js, tested flows | Sentry |
| Scope creep / overengineering | Med | High | default-exclude, gates | plan audit §55 |

---

## 50. Engineering Pre-Mortem

1. **History rewritten after a corpus edit** → misattributed accuracy. *Control:* immutable snapshots; new versions; re-run stability; `RuleChange.participants_exposed`.
2. **Prompted sessions counted as independent** → inflated RIVSR. *Control:* log every nudge/contact/weekly check-in + `entrySource`; independence derived at 24h window, never self-reported.
3. **Stale/expired offer stayed rankable** → phantom savings. *Control:* source-state first; quarantine excluded; two-axis quality; Fixture 10; monitor.
4. **Events duplicated or lost** → broken funnel. *Control:* domain source-of-truth; transactional + idempotent writes; reconciliation gate.
5. **Evidence verification mis-attributed** → corrupt VS3. *Control:* evidence→outcome→decision FK chain; verifier confirms decisionId; audit event.
6. **Non-cash counted as PEN / cross-basis compared** → overstated savings. *Control:* separate `minorUnits`; `NOMINAL_VALUE_SAME_UNIT` conditions; typed `DecisionDelta`; Fixture 11; property test.

---

## 51. Effort / Dependency Map

**Sequential spine:** M0 → M1 → M2 → M3 → M3.5 (engine + snapshot + events = critical path). **Parallel after M3.5:** M4–M6 UX (Sonnet) ∥ M9 source adapters (Sonnet) ∥ M8 admin. M10/M11 depend on M3.5 events + M7 outcomes; M11.5 depends on M11. Heaviest: M2/M8/M9 (L). Engine is provable before any UI exists.

---

## 52. First Implementation Slice

**Corpus import + typed rule representation + deterministic evaluator + 12 golden fixtures** (M0→M3).
- **Inputs:** corpus v1 seed (46 rules) with `comparisonScopeRef`, per-rule `eligibleSpendSelector`, immutable `RuleVersion`, two-axis operational state; tri-state portfolio; context; `evaluatedAt` + `intendedTransactionAt`.
- **Engine includes:** basis ranking (§6/§8), rankability (§12), materiality×resolvability + `PlausibleBound` (§11), decision-status ⟂ advisories + typed `DecisionDelta` (§10), 4-value holiday (§13).
- **Output:** `EngineDecisionResult` (status + `delta` + `advisories`) — build-free.
- **Tests:** unit + property (INV-C/D, LOW-never-ranks, exact money/minor-units) + **12 fixtures on explicit assertions**.
- **DoD:** all 12 fixtures pass on explicit assertions (not snapshots alone); engine imports nothing from db/app/Next/env; every rule traceable to source+version; snapshot re-run stable at `gitSha`; cross-scope ranking impossible; a `PROVIDER_PRIVATE` UNKNOWN candidate can never be `BEST_CONFIRMED`; nominal never becomes PEN.

---

## 53. Consolidated Type Reference (authoritative)

```ts
// Comparability & economics
type ComparablePurchaseKey = string
type ComparisonBasis = 'EFFECTIVE_OUT_OF_POCKET_COST' | 'NOMINAL_VALUE_SAME_UNIT' | 'NON_COMPARABLE'
type EligibleSpendSelector = 'WHOLE_BILL'|'FOOD_ONLY'|'FOOD_PLUS_NONALCOHOLIC'|'EXACT_SKU_BUNDLE'|'TICKET_UNIT'|'NON_EQUIVALENT_PURCHASE'
interface ComparisonScope { key: ComparablePurchaseKey; equivalenceGroup: string; comparisonBasis: ComparisonBasis; requiredContext: ('BASKET'|'AMOUNT'|'TICKET_PRICE'|'CHANNEL'|'DATE')[] }

// Operational state (two append-only axes)
type PublicationState = 'ACTIVE'|'FUTURE'|'EXPIRED'|'QUARANTINED'
type SourceQualityState = 'FRESH'|'STALE'|'INACCESSIBLE'|'CONFLICTED'|'UNKNOWN'
interface RuleOperationalStateSnapshot { publicationState: PublicationState; sourceQualityState: SourceQualityState; asOf: string }

// Decision
type DecisionStatus = 'BEST_CONFIRMED'|'CONFIRMED_TIE'|'LIKELY'|'VERIFY_FIRST'|'NO_SAFE_WINNER'|'NO_APPLICABLE_BENEFIT'|'SOURCE_STALE'|'SOURCE_CONFLICT'
type AdvisoryStatus = 'VERIFY_FIRST'|'STALE_CANDIDATE'|'CONFLICTED_CANDIDATE'|'NON_COMPARABLE'|'NON_EQUIVALENT_PURCHASE'|'DYNAMIC_AVAILABILITY'|'UNKNOWN_CAP'|'UNKNOWN_COMBINABILITY'|'MISSING_CONTEXT'
type DecisionDelta =
  | { basis: 'EFFECTIVE_OUT_OF_POCKET_COST'; kind: 'COST_CENTIMOS'; value: number }
  | { basis: 'NOMINAL_VALUE_SAME_UNIT';      kind: 'NOMINAL_VALUE'; unit: string; value: number }
type PlausibleBound = { kind: 'KNOWN_BOUND'; minCostCentimos?: number; maxValueMinorUnits?: number } | { kind: 'UNKNOWN_OR_UNBOUNDED' }

interface DecisionCandidate {
  ruleRef: { ruleId: string; version: number }
  operationalStateAtDecision: RuleOperationalStateSnapshot
  comparisonScopeRef: ComparablePurchaseKey | null
  comparisonBasis: ComparisonBasis
  eligibility: 'ELIGIBLE'|'INELIGIBLE'|'UNKNOWN'
  comparable: boolean
  effectiveCostCentimos?: number
  nominalValue?: { minorUnits: number; unit: string }
  penSavedCentimos?: number                 // explanation / VS3 / RIVSR only — never a rank key
  baselineRef?: string
  plausibleBound: PlausibleBound
  couldChangeDecision: boolean
  advisory?: AdvisoryStatus
  rejectionReason?: string
}
interface EngineDecisionResult {
  status: DecisionStatus; winnerRef?: RuleRef; runnerUpRef?: RuleRef; delta?: DecisionDelta
  confidence: 'HIGH'|'MEDIUM'|'LOW'; candidates: DecisionCandidate[]; advisories: DecisionCandidate[]
  explanation: string; provenance: Provenance[]; evaluatedAt: string; intendedTransactionAt: string
}
interface DecisionSnapshot extends EngineDecisionResult {
  id; participantId; purchaseIntentId; computedAt; idempotencyKey
  engineSemanticVersion; buildId; gitSha; corpusVersion; ruleRefs: RuleRef[]
}
```

---

## 54. Open Issues Remaining (wave-configuration, non-blocking for M0–M3)

1. **Weekly check-in delivery** — FORM vs RESEARCHER default (affects exposure cadence).
2. **Persistent-session TTL** — exact study duration pending wave calendar.
3. **RANDOM audit sampling rate** — sample size over 46 rules to make CEA meaningful.
4. **Expiry auto-apply scope** — which deterministic expiries are safe to auto-apply vs shadow-only.

*(Contamination window and `REVIEW_REQUIRED` are resolved: 24h pre-registered; LOW = admin-only.)* Items 2–3 must resolve before the M11.5 protocol freeze / Wave-0 gate; none blocks the First Slice.

---

## 55. Final Plan Audit

Experiment integrity ✅ (immutable snapshots, domain source-of-truth, frozen scope, derived contamination) · Correctness ✅ (pure engine, exact céntimos/minor-units, basis ranking, materiality, golden+property) · Simplicity ✅ (one app, one DB, no Do-Not-Build items, no multidimensional optimization) · Security/privacy ✅ (passwordless, no card data, hardened+purged evidence, pseudonymized exports) · Testability ✅ (isolated engine, explicit-assertion golden gate) · Deployment cost ✅ (Vercel+Neon) · Corpus traceability ✅ · Analytics reproducibility ✅ · Source-monitor feasibility ✅ (4 adapters + shadow) · Scope containment ✅. **No Phase-0A boundary violation.**

---

## 56. Verification (end-to-end)

1. `pnpm test` — unit + property (INV-C/D, LOW-never-ranks, exact money/minor-units) + **12 fixtures on explicit assertions** green.
2. Clean-DB migrate + seed → 46 rules, each with a `ComparisonScope` + traceable source/version; two-axis operational timeline present.
3. Integration: decide → immutable `DecisionSnapshot` (advisories + typed `delta` + reproducibility fields) + atomic domain writes; edit a rule (new version + operational events) → prior decision unchanged; re-run at `gitSha` → identical (INV-B/E). Retry decide/outcome with same idempotency key → no duplicate (INV-F).
4. Materiality: Baco high-value → `NO_SAFE_WINNER`; Fridays Qore-UNKNOWN → `BEST_CONFIRMED` + `VERIFY_FIRST` advisory.
5. Non-cash: Coney Park → `CONFIRMED_TIE` on `NOMINAL_VALUE_SAME_UNIT` with `penSavedCentimos=undefined`; Coney Active delta `NOMINAL_VALUE 100` in `CONEY_PLAY_BALANCE`, never céntimos; excluded from RIVSR as cash.
6. Analytics: synthetic journey → RIVSR from domain records; contamination recomputed at 24h; export pseudonymized.
7. Source adapter: sanitized excerpt → change/expiry detection with interval-censored bounds + `ProposedRuleVersion` shadow row; `RuleAudit` yields CEA/SFR.

---

## 57. Exact Immediate Next Action

**Freeze-pending.** Submit this FINAL spec to the **Codex Sol independent technical red-team**. On pass, tag it authoritative and begin **M0 → M3** (First Slice, §52). **Do not write code or run M0 before the red-team clears.**

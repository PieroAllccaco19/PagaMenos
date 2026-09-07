# PAGAMENOS — PHASE 0A-2: RED-TEAM PATCH REVISION 2 (SPECIFICATION CLOSURE DELTA)

**Precedence:** where this delta changes `PAGAMENOS_PHASE_0A-2_FINAL.md` or `…_REDTEAM_PATCH.md`, **Rev 2 wins.**
**Recheck verdict:** B — IMPLEMENTATION GO WITH SPECIFIC PATCH (13 CLOSED · 6 PARTIAL · 0 OPEN · 0 new CRITICAL/HIGH).
**Scope:** close the six residual PARTIALs only — RT-02, RT-04, RT-05 (blocking M0/M1–M3); RT-10, RT-11, RT-14 (later-milestone contracts frozen now). No architecture, no new features, no repetition of CLOSED findings. Milestones are touched only to attach these corrections.

> ### ⚠ AMENDMENT NOTICE — this document has been amended in two places
>
> **Two sections of this document are AMENDED by a later accepted authority and MUST NOT be applied as written:**
>
> | Section | Amendment | Controlling authority |
> | :-- | :-- | :-- |
> | **§6.A** — `PurchaseOccasion` identity | field structure amended (**R-B-05**, **R-B-13**, **HR-B-03**) | `PAGAMENOS_M3_5B_B_SEMANTIC_RATIFICATION_V1_3` |
> | **§8** — superseded-field register, `occasionKey` row | deletion **stands**; its scope is narrowed (**P-03**, **P-03a**, **O-16**) | `PAGAMENOS_M3_5B_B_SEMANTIC_RATIFICATION_V1_3` |
>
> The amendment notes are printed **inline at each amended section**. Do not apply the pre-ratification field structure of §6.A. Nothing else in this document is amended; §§1–5, §6.B–§6.F, §7 and §§9–11 stand unchanged.
>
> Recorded by the **R-B-17 authority repair** in satisfaction of open item **O-12**. Root register: `PAGAMENOS_SPEC_AUTHORITY.md`. Repair record: `PAGAMENOS_R_B_17_AUTHORITY_REPAIR_REPORT.md`.

---

## 1. Revision-2 Decision

**ACCEPTED — CLOSURE APPLIED.** Six specification ambiguities are removed by making each contested point single-canonical, machine-verifiable, evidence-bearing, and gate-safe: one minimum-spend model (RT-02); linter-derived required context + structured purchase signatures (RT-04); bounds that may never rest on stale last-known values (RT-05); a data-bearing verified-value union (RT-10); a frozen `PurchaseOccasion`/RIVSR analysis contract (RT-11); unique-change source metrics with completion/coverage gates (RT-14). Every superseded field/type is enumerated in §8 so no duplicate canonical form survives. Engine stays pure; architecture, stack, corpus scope, analytics hierarchy, auth, and source-monitor design are unchanged.

---

## 2. RT-02 Final Closure — One Canonical Minimum-Spend Model

Exactly one representation, on `Constraints`:
```ts
interface SpendThreshold { minimumSpendCentimos: number; basis: EligibleSpendSelector }   // basis is REQUIRED, explicit
interface Constraints {
  minimumSpend?: SpendThreshold          // canonical; undefined ⇒ no minimum
  // minSpendCentimos: REMOVED
}
```
Normative:
- `Benefit.minimumSpendCentimos` and `Benefit.minimumSpendBasis` **MUST NOT exist** (superseded by `Constraints.minimumSpend`).
- legacy `Constraints.minSpendCentimos` **MUST NOT exist**.
- evaluation: rule is eligible on the threshold iff `quantity(minimumSpend.basis) ≥ minimumSpend.minimumSpendCentimos`, where `quantity(basis)` is the selector applied to the context.
- **basis is never inferred** from a competing field — it lives inside `SpendThreshold` and is mandatory.
- no minimum ⇒ `minimumSpend = undefined`.
- **Corpus seed/linter MUST reject** any rule carrying `minSpendCentimos`, `Benefit.minimumSpendCentimos`, or `minimumSpendBasis`.

Settlement pipeline (RT-02 patch §3, step 3) now reads `Constraints.minimumSpend` only. **Attaches to M1 (linter) + M2 (evaluation).**

---

## 3. RT-04 Final Closure — Machine-Verifiable Purchase-Scope Integrity

**A. Total required-context derivation** — a pure function (engine/corpus pure layer), the single source of truth for context needs:
```ts
type ContextReq = 'AMOUNT' | 'BASKET' | 'TICKET_PRICE' | 'CHANNEL' | 'LOCATION_OR_BRANCH' | 'DATE_TIME'
function deriveRequiredContext(rule: RuleVersion): Set<ContextReq>
```
Derivation (MUST, not manual):
- **AMOUNT** — percentage discount; fixed discount whose applicability/value depends on amount; any `minimumSpend`; cap materiality; whole-bill/subtotal selectors.
- **BASKET** — `EXACT_SKU_BUNDLE`; `FOOD_ONLY`; `FOOD_PLUS_NONALCOHOLIC`; product include/exclude; any item/category eligibility that affects value.
- **TICKET_PRICE** — ticket-price-dependent rules (UVK).
- **CHANNEL** — any allowed/excluded channel constraint.
- **LOCATION_OR_BRANCH** — branch inclusion/exclusion; location changes applicability; location participates in an O4 switch.
- **DATE_TIME** — campaign date, weekday, time window, holiday, or special-date affects eligibility.
- **MEMBERSHIP / INSTRUMENT CONTEXT** stays in eligibility, not purchase context — the boundary is explicit and MUST NOT leak into `ContextReq`.

Linter assertion (blocking): `scope.requiredContext ⊇ ⋃(deriveRequiredContext(memberRule))`. A required dependency cannot be omitted manually (superset allowed; omission rejected).

**B. Structured Purchase Signature** — identifiers (`purchaseKind`, `equivalenceGroup`) are not proof; add a machine-comparable, corpus-controlled signature (Phase-0A-small; **not** a generic commerce ontology):
```ts
interface CanonicalItemQty { itemKey: string; qty: number }   // corpus-controlled itemKey
type PurchaseSignature =
  | { kind:'EXACT_BUNDLE';     merchantId: string; canonicalItems: CanonicalItemQty[] }
  | { kind:'ELIGIBLE_BILL';    merchantId: string; purchaseDomain: 'GENERAL_MEAL'|'RESTAURANT_BILL'|string /*corpus-controlled*/ }
  | { kind:'TICKETS';          merchantId: string; ticketCount: number; ticketClass: string }
  | { kind:'NOMINAL_PACKAGE';  merchantId: string; cashAcquisitionCostCentimos: number; nominalUnit: NominalUnit }
// ComparisonScope gains: signature: PurchaseSignature
```
Linter MUST verify: member merchant == signature merchant · `EXACT_BUNDLE` members share the **same canonical item/qty** before being directly compared · `TICKETS` members match ticket count/class where required · `NOMINAL_PACKAGE` members match the scope's nominal prerequisites (unit + acquisition cost, RT-06) · `NON_EQUIVALENT_PURCHASE` rules cannot join a rankable signature · all members agree with the scope's `comparisonBasis`.

**Percentage/general-bill exception (Perroquet):** for an `ELIGIBLE_BILL` signature the shared signature (merchant + `purchaseDomain`) proves the **same real purchase occasion**; each provider's `EligibleSpendSelector` computes its own eligible subtotal. The linter MUST NOT require identical eligible subtotals in this case.

**C. Multiple matching scopes** — unchanged approved behavior (evaluate independently; no global ranking; `requiresScopeSelection=true` when >1 materially distinct scope matches; participant confirms one before final Decision). Only the stronger signature/context validation is integrated. **Attaches to M1 (linter) + M2 (evaluation).**

---

## 4. RT-05 Final Closure — Bounds MUST NOT Use Stale Last-Known Values

**Core invariant:** a last-known value from a source now `STALE`, `INACCESSIBLE`, `UNKNOWN`, or `CONFLICTED` **MUST NOT, by itself, establish a conservative current bound.** A stale promo price of `S/100` does **not** prove `current ≥ S/100` (the current unknown value could be `S/80`). Therefore source-quality uncertainty **defaults to `{ kind:'UNKNOWN_OR_UNBOUNDED', reason }`** unless the bound derives from an **independently current** constraint whose mathematical relationship remains valid.

**Evidence-bearing `BoundProof`** (replaces label-only proofs):
```ts
type BoundProof =
  | { kind:'CURRENT_EXPLICIT_LIMIT';             proofRef: string; sourceCheckId: string; reviewedBy: string; reviewedAt: string; derivation: string }
  | { kind:'CURRENT_UNCAPPED_FUNCTION_BOUND';    proofRef: string; sourceCheckId: string; reviewedBy: string; reviewedAt: string; derivation: string }
  | { kind:'CURRENT_CONFIRMED_ZERO_AVAILABILITY';proofRef: string; sourceCheckId: string; reviewedBy: string; reviewedAt: string; derivation: string }
```
Every `KNOWN_BOUND` MUST be auditable to current evidence + derivation/assumptions + reviewer + timestamp/reference, and its `sourceCheckId` MUST reference a **current (FRESH)** check — **not** the stale/inaccessible/conflicted check that caused the uncertainty. Removed naked labels: `FIXED_PROMO_PRICE`, `OTHER_REVIEWED`. A fixed promotional price may form a bound **only** when the evidence establishing that price is itself current for the asserted bound. No stale/inaccessible last-known price is conservative by default. **Attaches to M2 (bounds) + M9/M10 (proof provenance via `sourceCheckId`).**

---

## 5. RT-10 Frozen Contract — Data-Bearing Verified Value

```ts
type BaselineKind = 'ACTUAL_ALTERNATIVE_SAME_PURCHASE' | 'COMMON_INDEPENDENT_REGULAR_PRICE'
type VerifiedValue =
  | { kind:'VERIFIED_PEN_SAVING';
      paidAmountCentimos: number; counterfactualAmountCentimos: number; verifiedSavingCentimos: number
      baselineKind: BaselineKind; baselineEvidenceRef: string
      purchaseOccasionId: string; decisionId: string; verifierId: string; verifiedAt: string }
  | { kind:'VERIFIED_NOMINAL_OUTCOME';
      paidAmountCentimos: number; nominalValueMinorUnits: number; nominalUnit: NominalUnit; evidenceRef: string
      purchaseOccasionId: string; decisionId: string; verifierId: string; verifiedAt: string }
  | { kind:'NO_VERIFIABLE_SAVING';
      reason: string; purchaseOccasionId: string; decisionId: string; verifiedAt: string }
```
Invariants: `verifiedSavingCentimos = counterfactualAmountCentimos − paidAmountCentimos`, and it MUST be **> 0** to qualify as VS3 PEN saving. Only `VERIFIED_PEN_SAVING` contributes to PEN metrics / RIVSR VS3. **Primary Phase-0A VS3 permits only the two `BaselineKind` values** — no undefined "other reviewed counterfactual"; any new baseline type requires an `AnalysisProtocol` version change. Provider-relative incompatible advertised list prices are **not** accepted counterfactuals. **Attaches to M7.**

---

## 6. RT-11 Frozen Contract — PurchaseOccasion & RIVSR Analysis

> ### ⚠ NORMATIVE AMENDMENT TO §6.A — controlling authority: `PAGAMENOS_M3_5B_B_SEMANTIC_RATIFICATION_V1_3`
>
> **§6.A below is the PRE-RATIFICATION field structure. It MUST NOT be applied as written.** The interface printed in §6.A was authored before the M3.5B-B semantic ratification and is amended by clauses **R-B-05** and **R-B-13**, as further corrected by **HR-B-03**. The amendment is permissible because the contract is *slated for* — but has **not undergone** — the `AnalysisProtocol v1` freeze, and **v1 is UNFROZEN**; because §6.B itself anticipates versioned change; and because R-B-05 removes an internal §6.A-versus-§6.C contradiction rather than creating one.
>
> **What the accepted ratification supersedes in §6.A:**
>
> 1. the **required singular `createdFromIntentId`** field;
> 2. **any interpretation requiring one app intent per occasion** — no 1:1 intent-to-occasion relation is implied, and `UNIQUE(originIntentId)` or any equivalent finalization/context uniqueness is **forbidden** as canonical occasion identity (**R-B-04**, prohibition **P-02**);
> 3. **physical scalar-shape assumptions incompatible with the ratified logical interface** — in particular, requiring physical scalar columns merely because the superseded interface used them (prohibition **P-19**).
>
> **What holds after the amendment:**
>
> - a `PurchaseOccasion` may have **zero, one, or many** source links; synthetic `PurchaseIntent` records MUST NOT be manufactured for purchases that occurred outside app usage (**R-B-05**, prohibition **P-11**);
> - **provenance is separate from canonical identity** — no source-system identifier is canonical identity, and one authoritative source may suffice (**R-B-06**, **HR-B-08**; corroboration from two or more sources is **not** a universal establishment rule, prohibition **P-15**);
> - **analysis-facing semantics follow the accepted amended logical interface** (**HR-B-03**), not the literal shape printed below. Any analysis-facing scalar projection requires an accepted selection/adjudication rule first; implicit *latest-wins*, *first-wins* or *highest-confidence-wins* selection is **prohibited** (**P-14**), and **no scalar projection may be implemented before its rule is accepted** (open item **O-11**);
> - **late-arriving facts may be represented append-only** on supporting records — including `actualTransactionAt` and `purchaseFingerprint` — **rather than by mutating the canonical identity record** (**R-B-13**). Canonical occasion identity is append-only; the accepted append-only discipline is not weakened.
>
> **Unchanged by this amendment.** The **conservative dedup invariant** and **anti-inflation rule** below remain binding — *ambiguity MUST NOT increase the numerator* — but they bind **B2**, which owns real-world distinctness, and are preserved inside C2 analysis; they MUST NOT be re-expressed as B2 identity rules (**R-B-11**, **HR-B-02**, **§8.2** of the ratification). Scientific independence MUST NOT be used as the individuation predicate (**P-12**), and C2 / `AnalysisProtocol` MUST NOT change B2's canonical occasion count (**P-12a**). §6.B–§6.F are **not** amended; §6.E in particular remains controlling, including *"Legal/consent deletion overrides analysis retention."*
>
> **Still open — do not resolve from §6.A.** `intendedTransactionAt`'s semantic contract, including whether an intentless occasion may obtain it from another admissible source, is open item **O-04**, owned by the **Joint B Architecture**. The provenance/source-link architecture is **O-14**; the preservation contract is **O-06b-ARCH**. **The exact physical representation of the amended interface is NOT decided here and MUST NOT be inferred from §6.A.**
>
> Recorded by the **R-B-17 authority repair** in satisfaction of open item **O-12**.

**A. Identity** (one real-world attempted/realized purchase, not one app request):
```ts
interface PurchaseOccasion {
  id: string; participantId: string; merchantId: string
  intendedTransactionAt: string; actualTransactionAt?: string
  purchaseFingerprint?: string        // normalized research-safe: participant + merchant + coarse time-window + verified paid amount + evidence digest; NEVER sensitive payment identifiers
  createdFromIntentId: string
}
```
**Conservative dedup invariant:** when two records plausibly represent the same real transaction and distinctness cannot be established, they count as **one** `PurchaseOccasion` for primary RIVSR. **Ambiguity MUST NOT increase the numerator.** Manual research adjudication may merge duplicates with an audit record.

**B. Primary independent entry sources** — qualify (if all other contamination criteria pass): `DIRECT`, `SAVED_DECISION`, and `OTHER` **only after** research classification as genuinely participant-initiated. **Do not** count as primary independent intent: `CONTENT`, `SHARED_LINK`, `RESEARCH_LINK`, `AUTH_LINK` (`CONTENT`/`SHARED_LINK` analyzed separately as content-driven acquisition). Taxonomy changes require a new `AnalysisProtocol` version.

**C. Analysis-eligible denominator** — participants who: (1) completed required consent/onboarding; (2) were technically able to use the prototype; (3) remained in the observation period per the pre-registered cohort rule; (4) had **≥3 genuine covered purchase occasions/opportunities** during the 4-week study, established from app records + `WeeklyExposureReport`s/research reconciliation. Also report an **intention-to-observe** denominator that includes participants with insufficient opportunity exposure.

**D. Missing `WeeklyExposureReport`** — missingness MUST NOT make GREEN easier: a missing report stays **MISSING** (never read as zero purchases); analysis attempts recovery/reconciliation **without behavioral nudging**; the participant stays in intention-to-observe reporting; missing data preventing the ≥3-opportunity criterion does **not** silently remove the participant. Required reporting: (1) primary analysis-eligible RIVSR; (2) intention-to-observe sensitivity where unresolved-opportunity participants enter the denominator **conservatively as non-successes**; (3) missing-report rate. **If primary and conservative-sensitivity conclusions differ materially ⇒ INCONCLUSIVE / NARROW, never GREEN from the favorable denominator alone.**

**E. Withdrawal** — no further collection; privacy/deletion rules apply. Reporting preserves pre-withdrawal pseudonymized facts only where consent/protocol legally permits; always report withdrawal count/reasons if known; provide a sensitivity treating withdrawals conservatively rather than selectively deleting poor outcomes. **Legal/consent deletion overrides analysis retention.**

**F. Partial-week** — no extrapolation of partial weeks into full weeks. Primary 4-week RIVSR requires completion of the pre-registered observation window unless withdrawal/technical failure is separately reported; partial observation lives in sensitivity/descriptive analysis, never pooled as full exposure.

All of A–F are frozen into `AnalysisProtocol v1`. **Attaches to M10 + M11.5.**

---

## 7. RT-14 Final Metric Contract — Source Integrity

**A. Primary ExceptionRate uses UNIQUE changes:**
```
ExceptionRate = count(distinct GroundTruthSourceChange.id WHERE hasAnyException)
              / count(distinct independently-confirmed material GroundTruthSourceChange.id)

hasAnyException = missedDetection OR failedParse OR humanSemanticInterventionRequired
                 OR incorrectAutoProposal OR otherPreRegisteredException
```
One change contributes at most 1 to the primary numerator ⇒ **primary `ExceptionRate ∈ [0,1]`**. Category-specific incidence rates (human intervention, missed detection, failed parse, incorrect auto-proposal) are reported **separately** and **MUST NOT** be summed into the primary rate.

**B. CEA completion/coverage protection:**
```
AuditCompletionRate       = fullyCompletedSampledAudits / allSampledAudits
CriticalFieldCoverageRate = auditedRequiredCriticalFields / allRequiredCriticalFieldsAcrossSample
CEA = 1 − (fully-audited sampled items with any material error on a critical field) / (fully-audited sampled items)
```
An audit enters CEA only if **100% of its pre-registered critical fields** are reviewed; `PARTIAL` never counts as correct and is excluded from the CEA denominator. The random CEA sample targets **100% completion**; a genuinely unavailable item is excluded with a recorded reason and **replaced through the same random sampling procedure** (exclusion preserved/reported). **Phase-0A frozen GREEN thresholds:** `AuditCompletionRate = 100%` of the final valid random sample and `CriticalFieldCoverageRate = 100%`; below either ⇒ **CEA = INCONCLUSIVE for gating, never GREEN.** TARGETED audits are reported separately and **must not substitute** for the random sample. **Attaches to M8–M10.**

---

## 8. Canonical Superseded-Field/Type Register

> ### ⚠ NORMATIVE AMENDMENT TO §8 — controlling authority: `PAGAMENOS_M3_5B_B_SEMANTIC_RATIFICATION_V1_3`
>
> **The `occasionKey` deletion recorded in the RT-11 row below STANDS. Its SCOPE is narrowed.**
>
> **What remains in force (INHERITED from this §8).** The legacy `occasionKey` removed here MUST NOT be treated as a surviving inherited contract field, and MUST NOT be silently restored under its former semantics (prohibition **P-03**).
>
> **What MUST NOT be inferred from that deletion.** This deletion **MUST NOT be reinterpreted as a universal ban on all possible future deterministic identity constructions.** The accepted ratification (§4.1) states explicitly: *"No universal prohibition on every conceivable deterministic identity construction is ratified"*, and *"the universal prohibition MUST NOT be labelled INHERITED."*
>
> **What the narrowing preserves separately** — as distinct rules, never merged into a universal ban:
>
> - no source-system identifier is canonical identity (**R-B-06**);
> - no timestamp is canonical identity (**R-B-12**);
> - `UNIQUE(originIntentId)` and equivalents remain forbidden (**R-B-04**, **P-02**);
> - the rejected digest design remains unauthorized — no digest is required, and none is stored unless PostgreSQL can verify its **semantic content**, not merely its syntax (**R-B-14**, **P-09**).
>
> **The open question and its interim default.** Whether canonical occasion identity must remain opaque/surrogate, or may use another deterministic construction, is open item **O-16**, owned by the **Joint B Architecture**, deadlined **before JBA acceptance**. **`O-16` REMAINS OPEN AND IS NOT RESOLVED BY THIS AMENDMENT.**
>
> ```
> DEFAULT UNTIL O-16 IS RESOLVED: no new deterministic canonical key is authorized.
> ```
>
> Introducing a **new** deterministic canonical occasion key before O-16 is resolved is prohibited (**P-03a**).
>
> **Scope of this amendment.** Only the `occasionKey` clause of the RT-11 row is affected. **No other row of the register below is amended** — every other superseded field or type listed remains superseded exactly as written. The RT-11 row's replacement shape (`intendedTransactionAt` / `actualTransactionAt?` / `purchaseFingerprint?` / `createdFromIntentId`) is separately amended by the §6.A amendment note above.
>
> Recorded by the **R-B-17 authority repair** in satisfaction of open item **O-12**.

No duplicate canonical form may remain. Removed/replaced:

| Superseded (MUST NOT appear) | Canonical replacement | RT |
| :-- | :-- | :-- |
| `Constraints.minSpendCentimos` | `Constraints.minimumSpend: SpendThreshold` | RT-02 |
| `Benefit.minimumSpendCentimos`, `Benefit.minimumSpendBasis` | `Constraints.minimumSpend.{minimumSpendCentimos,basis}` | RT-02 |
| `ContextReq` value `'DATE'` | `'DATE_TIME'` | RT-04 |
| *(none)* → add | `ContextReq` value `'LOCATION_OR_BRANCH'` | RT-04 |
| manual `ComparisonScope.requiredContext` authoring | linter-enforced `⊇ ⋃ deriveRequiredContext(rule)` | RT-04 |
| string-only `purchaseKind`/`equivalenceGroup` as proof | add `ComparisonScope.signature: PurchaseSignature` (identifiers kept, no longer proof) | RT-04 |
| label-only `BoundProof` (`UNCAPPED_DISCOUNT_UPPER_BOUND`, `FIXED_PROMO_PRICE`, `KNOWN_STOCK_ZERO`, `EXPLICIT_PROVIDER_LIMIT`, `OTHER_REVIEWED`) | data-bearing `BoundProof` (`CURRENT_EXPLICIT_LIMIT`, `CURRENT_UNCAPPED_FUNCTION_BOUND`, `CURRENT_CONFIRMED_ZERO_AVAILABILITY`) w/ proofRef+sourceCheckId+reviewedBy+reviewedAt+derivation; **`FIXED_PROMO_PRICE`/`OTHER_REVIEWED` deleted** | RT-05 |
| enum-only `VerifiedValue` (3 string literals) | data-bearing `VerifiedValue` discriminated union; "explicitly reviewed counterfactual" removed from primary VS3 (two `BaselineKind` only) | RT-10 |
| minimal `PurchaseOccasion { id, participantId, merchantId, occasionKey }` | full `PurchaseOccasion` (`intendedTransactionAt`/`actualTransactionAt?`/`purchaseFingerprint?`/`createdFromIntentId`); `occasionKey` removed | RT-11 |
| summed-category `ExceptionRate` (RT-14 patch §RT-14 formula) | distinct-change `ExceptionRate ∈ [0,1]` + separate category incidences | RT-14 |

---

## 9. Revised Acceptance-Test Deltas

- **RT-02 (M1/M2):** linter rejects `minSpendCentimos`, `Benefit.minimumSpendCentimos`, `minimumSpendBasis`; minimum evaluation one-cent-below/equal/above using `minimumSpend.basis` quantity; `minimumSpend=undefined` path.
- **RT-04 (M1/M2):** `deriveRequiredContext` unit tests, one per `ContextReq` trigger; linter fails when `requiredContext ⊉ ⋃ derive`; `EXACT_BUNDLE` mismatch blocks direct comparison; `TICKETS` count/class checked; `NOMINAL_PACKAGE` unit+cost checked; **Perroquet `ELIGIBLE_BILL` permits differing subtotals under one `purchaseDomain`**; `NON_EQUIVALENT_PURCHASE` rejected from a rankable signature; merchant mismatch rejected; multi-scope → `requiresScopeSelection`.
- **RT-05 (M2):** stale/inaccessible/unknown/conflicted last-known value never yields `KNOWN_BOUND` (defaults `UNKNOWN_OR_UNBOUNDED`); the `S/100` stale example → `UNKNOWN_OR_UNBOUNDED` → material; a `KNOWN_BOUND` whose `sourceCheckId` is the same stale/non-FRESH check is rejected; valid `KNOWN_BOUND` requires FRESH `sourceCheckId` + reviewer + derivation.
- **RT-10 (M7):** `verifiedSaving = counterfactual − paid` and `>0` for VS3; only the two `BaselineKind` accepted; provider-relative advertised list price rejected as counterfactual; `VERIFIED_NOMINAL_OUTCOME` never enters PEN VS3; `NO_VERIFIABLE_SAVING` carries `reason`.
- **RT-11 (M10/M11.5):** two records of one real transaction → one occasion (ambiguity merges conservatively, never inflates numerator); entry-source taxonomy (DIRECT/SAVED_DECISION qualify; CONTENT/SHARED/RESEARCH/AUTH excluded from primary); ≥3-opportunity denominator; missing weekly report never → zero and never silent removal; intention-to-observe conservative-sensitivity denominator; partial-week not extrapolated; withdrawal conservative sensitivity; primary-vs-conservative divergence → INCONCLUSIVE/NARROW.
- **RT-14 (M8–M10):** `ExceptionRate ∈ [0,1]` with one change counted once; category incidences reported separately (not summed); `PARTIAL` excluded from CEA denominator and never correct; `AuditCompletionRate`/`CriticalFieldCoverageRate` < 100% → CEA INCONCLUSIVE; excluded audit item replaced via the same random procedure with recorded reason; TARGETED reported separately.

---

## 10. Remaining Unresolved CRITICAL / HIGH

**None.** 0 new CRITICAL/HIGH from recheck; the six PARTIALs are closed by §§2–7; the prior 13 CLOSED findings are unchanged and not repeated. Residual items are the previously-tracked **Wave-0 configuration** values (weekly check-in delivery default; persistent-session TTL; RANDOM audit sampling rate + frozen critical-field list; expiry auto-apply scope; confirmation of frozen SLA/retention/role-matrix defaults) — none is CRITICAL/HIGH and none blocks M0–M3.

---

## 11. READY FOR FINAL SOL CLOSURE CHECK — **YES**

RT-02/04/05 are single-canonical, machine-verifiable, and stale-safe; RT-10/11/14 are frozen as data-bearing, dedup-safe, and gate-safe contracts; every superseded field/type is registered (§8) with no duplicate canonical form remaining. No code written, no architecture or research reopened. **Next action:** submit Rev 2 for the final Codex Sol closure check; on clearance, begin **M0 → M3** under the standing revised DoD.

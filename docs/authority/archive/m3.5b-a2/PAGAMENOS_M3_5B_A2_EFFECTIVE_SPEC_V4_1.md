<!-- R-B-17 ARCHIVAL HEADER - BEGIN. Added by the R-B-17 authority repair. Nothing below the END marker is altered. -->

> # HISTORICAL / NON-NORMATIVE
>
> **Status:** `HISTORICAL / NON-NORMATIVE - accepted-chain member, consolidated into the canonical A2 specification`
>
> **This document is retained as audit evidence only. It is NOT active authority and MUST NOT drive implementation, review, or gating.**
>
> **Active normative A2 specification:** `PAGAMENOS_M3_5B_A2_EFFECTIVE_SPEC_CANONICAL_V1.md`, which consolidates the accepted V4 to V4.5 chain without semantic change. This revision was a bounded patch closing DG-01 (Model A), DG-03, H02, H03 and V4-NEW-01; it did not replace the V4 architecture.
>
> **Supersession language inside this file is non-operative.** Any claim below of the form "fully supersedes" or "fully replaces" described the review packet submitted to one historical gate. It does **not** supersede, and never superseded, the active normative artifact named above. See Appendix B of the canonical A2 specification for the full register of neutralized claims.
>
> **Body integrity.** Everything after the `R-B-17 ARCHIVAL HEADER - END` marker is the original file, byte for byte. Its SHA-256 before archival was:
>
> `sha256:bcd77db32d43b9c2a577b6e596c318cafdf8ad800e388ab59bc7e4fea032dc55`
>
> Verify with: `tail -n +23 <this file> | sha256sum`
>
> **Root authority register:** `PAGAMENOS_SPEC_AUTHORITY.md` · **Repair record:** `PAGAMENOS_R_B_17_AUTHORITY_REPAIR_REPORT.md`

<!-- R-B-17 ARCHIVAL HEADER - END -->

# PAGAMENOS — M3.5B-A2 EFFECTIVE PRE-IMPLEMENTATION SPECIFICATION — V4.1

**Milestone:** M3.5B-A2 — PurchaseIntent lifecycle · deterministic decision-request freezing · exact snapshot binding · crash-repair saga.
**Status:** DESIGN / SPECIFICATION ONLY. No code / Prisma / migrations / Git / commits / implementation / B/C / production-protocol freeze / Wave 0.
**Nature:** self-contained. **This V4.1 fully supersedes V1/V2/V3/V4.** A reviewer needs only (1) this document, (2) accepted A1 spec `PAGAMENOS_M3_5B_A1_EFFECTIVE_SPEC_V2_1.md`, and (3) the accepted repository.

**Origin:** the Codex Sol focused V4 gate returned `# B — M3.5B-A2 V4 REQUIRES CLOSURE PATCH` (architecture viable; not a redesign). V4.1 closes ONLY the six remaining findings and propagates for consistency: `A2-DG-01` (implementable consent-read serialization), `A2-DG-02` (holiday authority + accepted-PurchaseContext policy + operational-state cardinality), `A2-DG-03` (closed trusted entry-source evidence + precedence), `A2-DG-H02` (robust reload-and-prove P2002), `A2-DG-H03` (immutable historical `corpusId → semanticDigest`), `A2-V4-NEW-01` (portfolio normalization before persistence). Findings Sol already closed — **DG-04, DG-05, DG-06, H01, H04, H05** — are carried forward unchanged (§10) and not reopened.

**Accepted baselines (verified present, `C:/Users/piero/pagamenos-a1`, inspected READ ONLY):** M3.5A `64cf864…`; M3.5B-A1 `99f2d61…`; A1 doc child `7c0a3d9…`. Failed prototype `1ded28d…` not authority.

**Conventions.** Instants zone-qualified (`America/Lima`); trusted time sampled under a stable row lock. Money integer céntimos (provenance, not identity). A2 scientific tables append-only at DB level (BEFORE UPDATE/DELETE/TRUNCATE triggers `RAISE`). *(verified)* = read in the worktree.

---

## 0. Carried-forward closed foundations (unchanged from V4; summarized for self-containment)

Accepted `DecideInput` *(verified, `src/engine/types.ts`)*: `{ rules: RuleVersion[]; operationalStates: RuleOperationalState[]; scopes: ComparisonScope[]; portfolio: EligibilityPortfolio (mandatory); context: PurchaseContext; evaluatedAt; intendedTransactionAt; selectedScopeId?; holidayCalendar?: string[]; baselineByScopeId? }`. `EligibilityPortfolio = { instruments: {family; network?∈{AMEX,VISA,MC}; tier?; memberships?:string[]}[]; privateStates?: Record<string,Tri>; declarations?: Record<string,Tri> }`, `Tri∈{YES,NO,UNKNOWN}`. Corpus `loadCorpus()=CORPUS_V1` (static) with `corpusId; scopes; activeRules; operationalStates`. M3.5A `decideAndPersist/loadDecisionSnapshot/replayDecisionSnapshot`; `requestHash===inputHash===SHA-256(canonical(validated DecideInput))`; receipt `UNIQUE(operationScope, idempotencyKey)`; snapshot version fields pinned with `z.literal(current)` ⇒ loadability bounded by parser retention.

**Entities/relationships (final, unchanged):** `PurchaseIntentCaptureToken` (assignment + trusted `entrySource` + `intentCaptureKey` UNIQUE; `UNIQUE(assignmentId, clientCorrelationNonce)`); `PurchaseIntent` (`captureTokenId` UNIQUE FK RESTRICT; `intentType`; `initiatedAt`); `PurchaseIntentContextVersion` (discriminated signature — §3); `EligibilityProfileVersion` (§7); `PurchaseIntentFinalization` (pins `contextVersionId` + `eligibilityProfileVersionId`, `UNIQUE(intentId)`); `PurchaseIntentInvalidation` (`UNIQUE(invalidatedIntentId)`; acyclic via `ExperimentAssignment FOR UPDATE` walk); `PurchaseIntentDecisionRequest` (`UNIQUE(intentId)`, `businessDecisionKey`/`m3_5aIdempotencyKey` derived from the immutable `id`, frozen `exactValidatedDecideInputJson`+`decideInputHash`, pins); `PurchaseIntentDecisionBinding` (**no free-standing `intentId`** — reached only via `decisionRequestId`; `UNIQUE(decisionRequestId)`/`UNIQUE(snapshotId)`; `verifyPurchaseIntentDecisionBinding` in Case A — **DG-05 closed**). `businessDecisionKey = "pagamenos:study-intent-decision:v1:"+id`; `m3_5aIdempotencyKey = "pagamenos:study-intent-decision-idem:v1:"+id`.

**Closed contracts (carried, §10):** DG-04 complete context hash; DG-05 cross-wiring-free binding + verifier; DG-06 Case-C DecisionRequest = internal processing (no consent read; withdrawal ≠ invalidation; decision service has no consent capability); H01 Prisma resolves **6.19.3**; H04 unused-token freezes assignment/entrySource/capture-id but not `intentType` (first committed intent fixes it); H05 label grammar (TEXT, trimmed, non-empty, ≤128 service max; input-schema parser-dispatched). `findExactHistoricalDecision` additive read-only M3.5A facade; three-way version separation (self-integrity / current-execution gate on input-schema+contract+corpus / historical-snapshot stamp coherence). Global lock order **`ExperimentAssignment ≺ PurchaseIntent root (UUID asc) ≺ children`**.

---

## 1. Scope

Closes the six findings above; introduces **no** new decision entity beyond a versioned static **holiday-calendar authority artifact** (§5, not a DB table) and the already-authorized `EligibilityProfileVersion`. No B/C semantics: `PurchaseIntent input capture ≠ B opportunity ≠ C evidence`.

---

## 2. A2-DG-01 — Implementable consent-read serialization (MODEL A, chosen)

**Verified basis.** The A1 consent repository uses the shared singleton `PrismaClient` (`src/db/client.ts`); `ConsentStore.listEvents(assignmentId)` is a plain `findMany` (not inside a transaction) *(verified, `src/db/study-consent-repository.ts`)*. A `readConsentAuthorizationFacts` facade built on it reads on a **separate pooled connection** under PostgreSQL's default **READ COMMITTED** isolation — independent of any A2 `$transaction`. A1 consent mutation locks `experiment_assignment FOR UPDATE` *(verified)* — the row A2 shares.

**Chosen model — MODEL A (assignment-locked A2 tx + separate consent read).** For every genuinely NEW participant scientific fact:
```
BEGIN A2 TRANSACTION (READ COMMITTED)
  LOCK ExperimentAssignment FOR UPDATE                          -- the serialization authority
  lock required PurchaseIntent root(s) in ascending UUID order  -- where a root is involved
  recheck exact same-key receipt / domain identity under the locks
  if a historical result now exists → REPLAY/ALIAS (no consent, no new timestamp), COMMIT/return
  sample trusted collectionAt
  events = readConsentAuthorizationFacts(assignmentId)          -- A1 read facade, SEPARATE READ COMMITTED connection
  if NOT wasCollectionAuthorizedAtKnownTime({ events, collectionAt }): ROLLBACK/REJECT
  append scientific fact + receipt (atomic in the A2 transaction)
COMMIT
```

**Normative safety argument (frozen).** (1) Any withdrawal that committed **before** A2 acquired the assignment lock is visible to the later READ COMMITTED consent read. (2) Any withdrawal that has **not** committed but already holds the assignment lock blocks A2 from acquiring it. (3) Once A2 holds the assignment lock, no new withdrawal can acquire it until A2 commits. (4) Therefore the consent-event set relevant to `collectionAt` cannot cross the collection point so as to create a post-withdrawal collection. (5) The A2 scientific fact + receipt remain atomic in the A2 transaction. **The serialization authority is the continuously-held `ExperimentAssignment` row lock; consent facts may be read through the sanctioned A1 read facade on another READ COMMITTED connection after the lock is acquired.** The consent facade need NOT share the A2 transaction client. All V4 language requiring the consent facade to run "inside the same transaction client" is **removed**.

Replay/alias exemption retained: historical-fact recovery requires no current consent and may return before the assignment lock; a concurrent-arrival race is re-checked under the locks (step "recheck").

### 2.1 Race proof (only two serializations)
- **Withdrawal wins:** `W: LOCK Assignment → append WITHDRAWN → COMMIT`; `A2: waits → acquires Assignment → samples T2 → reads consent (sees withdrawal) → REJECT`.
- **A2 wins:** `A2: LOCK Assignment → samples T1 → reads GRANTED → insert NEW fact+receipt → COMMIT`; `W: then acquires Assignment → appends withdrawal`. Valid new fact, then withdrawal.
No third serialization (the assignment row lock is mutually exclusive).

### 2.2 Tests (real PostgreSQL)
For each of {create, context append, eligibility-profile append, finalize, invalidate} vs withdrawal: A2-lock-first succeeds then withdrawal; withdrawal-lock-first rejects the NEW fact; response-loss historical replay after withdrawal succeeds with **no** new scientific row.

---

## 3. A2-DG-02(a) — Accepted PurchaseContext policy: COMPLETE-SIGNATURE-ONLY (chosen)

The accepted engine `PurchaseContext` is optional-field based; a partial/mixed context may yield `MISSING_CONTEXT` advisories rather than a schema rejection *(verified, `engine/types.ts`, `provenance.ts` `signatureRelevant`)*. A2 deliberately narrows this:

> **A2 Phase-0A defines a stricter input-capture contract than the generic engine `PurchaseContext`. This does NOT alter M3 engine semantics; it limits which contexts Phase-0A A2 will freeze into a DecisionRequest.** A2 participant capture admits ONLY a context carrying enough authoritative information to instantiate exactly one complete supported purchase-signature family (a single discriminant `signatureKind`). Partial/mixed engine-valid contexts remain legal in the generic M3 engine but are **not** admitted as A2 scientific purchase-intent inputs in Phase 0A.

### 3.1 Admitted families (exact required fields; verified against corpus `PurchaseSignature`)
The A2 context version stores one normalized `purchaseSignatureJson` under `contextSchemaVersion="pagamenos.a2-context.v1"` (strict; unknown keys rejected), plus lifted `merchantId`, `signatureKind`, `intendedTransactionAt`.

| `signatureKind` | Maps to corpus scope signature | Required | Optional | Forbidden (A2) |
| :-- | :-- | :-- | :-- | :-- |
| **BILL** | ELIGIBLE_BILL | `merchantId`, `intendedTransactionAt`, `wholeBillCentimos`, `purchaseDomain` | `channel`, `branch`, `foodCentimos`, `nonAlcoholicBeverageCentimos` | `ticket*`, `exactItems`, `nominalPackage` |
| **TICKETS** | TICKETS | `merchantId`, `intendedTransactionAt`, `ticketUnitPriceCentimos`, `ticketCount`, `ticketClass` | `channel`, `branch` | `wholeBill*/food*`, `exactItems`, `nominalPackage`, `purchaseDomain` |
| **EXACT_ITEMS** | EXACT_BUNDLE | `merchantId`, `intendedTransactionAt`, `exactItems` (non-empty, normalized) | `channel`, `branch` | `wholeBill*/food*`, `ticket*`, `nominalPackage`, `purchaseDomain` |
| **NOMINAL_PACKAGE** | NOMINAL_PACKAGE | `merchantId`, `intendedTransactionAt`, `nominalPackage{cashAcquisitionCostCentimos, nominalUnit}` | `channel`, `branch` | `wholeBill*/food*`, `ticket*`, `exactItems`, `purchaseDomain` |

Rationale (verified engine matching): `signatureRelevant` for ELIGIBLE_BILL matches on `merchantId` + `purchaseDomain` (absent ⇒ MISSING) → A2 **requires** `purchaseDomain` so Phase-0A scope match is decisive, not MISSING; `wholeBillCentimos` is required because WHOLE_BILL-selector rules need the bill amount economically. TICKETS matches `ticketCount`+`ticketClass` (both required); `ticketUnitPriceCentimos` required economically. EXACT_BUNDLE matches item-for-item against `exactItems`; A2 **forbids** `wholeBillCentimos` here — A2 chooses one complete-signature authority rather than a mixed generic context. NOMINAL_PACKAGE matches `cashAcquisitionCostCentimos`+`nominalUnit`.

Céntimos are integers ≥ 0; `qty` positive integers with unique `itemKey`; `ticketCount` positive integer; enums from frozen token sets (`CHANNELS_V1`, `PURCHASE_DOMAINS_V1`, `NOMINAL_UNITS_V1`). For BILL, if both `foodCentimos` and `nonAlcoholicBeverageCentimos` are present: each ≥ 0 and `food + nonAlc ≤ wholeBillCentimos`.

### 3.2 No ambiguous mixed context (frozen answers)
`exactItems + wholeBillCentimos` → **rejected**; `tickets + purchaseDomain` → **rejected**; `nominalPackage + wholeBill` → **rejected**; `food split + tickets` → **rejected**. All by the single-discriminant schema. Tests prove: the generic M3 engine may syntactically accept a partial/mixed context, while A2 Phase-0A capture rejects it with a typed `PurchaseIntentContextSignatureError` — a deliberate narrower policy, not an M3 change.

---

## 4. A2-DG-02(b) — Operational-state cardinality (fail closed)

At DecisionRequest construction (§ build):
```
includedRuleKeys = { ruleId@version : each included rule }
stateMultimap    = group corpusSnapshot.operationalStates by ruleId@version
for each key in includedRuleKeys:
  n = count(stateMultimap[key])
  if n == 0: throw PurchaseIntentCorpusOperationalStateIntegrityError('missing', key)
  if n  > 1: throw PurchaseIntentCorpusOperationalStateIntegrityError('duplicate', key)
```
Exactly one op-state per included rule, else fail closed (never rely on the current corpus being coherent). **Orphan policy:** an operational state for a rule NOT in `includedRuleKeys` simply does not enter `DecideInput`; but the **corpus release/lint guard (§9)** globally rejects a duplicate op-state key, a missing state for an active rule, and an orphan state for a nonexistent active rule. (Current corpus is 46 active rules / 46 states, so this is mechanically satisfiable.)

---

## 5. A2-DG-02(c) — Exact holiday authority (content-defined)

**Verified gap.** The corpus does **not** own a holiday calendar; each rule carries only `holidayPolicy∈{NONE,EXCLUDED,SPECIFIC_DATES,UNKNOWN}` + optional `specificBlackoutDates` *(verified, `corpus/data/rules.ts`)*. `holidayCalendar` is a **`decide()` input** *(verified, `engine/decide.ts` `new Set(input.holidayCalendar ?? [])`; `engine/time.ts` `evaluateHoliday`)*: for `EXCLUDED`, BLOCKED iff `holidayCalendar.has(limaDate(intendedTransactionAt))`; for `UNKNOWN`, UNCERTAIN only on a holiday date; `SPECIFIC_DATES` uses the rule's own dates; `NONE` always ALLOWED. So an empty/incomplete calendar silently makes EXCLUDED-policy rules ALLOWED on real holidays — a genuine decision difference. The calendar is therefore decision-critical and A2-owned.

### 5.1 Versioned immutable holiday-calendar authority (static artifact, not a DB table)
```
HolidayCalendarVersion {           // design-time immutable fixture/registry (repository artifact)
  version               // e.g. "pagamenos.holiday.lima.v1"
  jurisdiction          // §5.2
  coverageStartDate     // YYYY-MM-DD (Lima)
  coverageEndDate       // YYYY-MM-DD (Lima)
  dates: string[]       // sorted unique YYYY-MM-DD within coverage
  contentDigest         // §5.4
  sourceMetadata        // provenance of the fixture (authority artifact reference)
}
```
No new DB table is required (§ entity table); it is a **versioned static authority artifact** plus an immutable registry `HOLIDAY_CALENDAR_REGISTRY: { version → contentDigest }`.

### 5.2 Jurisdiction policy (frozen)
> **Include only dates that are legal/public holidays applicable to private commercial activity in Lima/Callao, Peru** — Peru national statutory public holidays and Lima/Callao local public holidays (including movable and one-off government-declared *public* holidays) that apply to private commerce. **Exclude** public-sector-only compensable non-working days, optional banking holidays, and private-sector workday shifts, **unless** a benefit rule explicitly treats such a day as holiday-equivalent. The engine consumes only date membership; this policy defines which dates enter `dates[]`.

### 5.3 Source authority + bounded pre-implementation artifact dependency
The implementation engineer must NOT choose a source. Source-class precedence: (1) explicit holiday dates already frozen in the corpus/rule research package **if they exist** — *verified: they do not (§5 gap)*; (2) otherwise a first-party Peruvian legal/government public-holiday authority; (3) a curated immutable fixture derived from that authority. Because the actual dates are **not** present in the repository, V4.1 declares one bounded artifact dependency — it does not fabricate dates:

> **Artifact `A2 Holiday Calendar Fixture v1` (pre-implementation gate).** Before A2 implementation begins, produce the immutable `HolidayCalendarVersion` fixture per §5.1/§5.2 from the §5.3(2) authority, covering §5.5, compute its `contentDigest` (§5.4), and register the `(version → contentDigest)` pair in the immutable `HOLIDAY_CALENDAR_REGISTRY`. The fixture and registry entry are frozen historical authority thereafter. This is a bounded data-authoring artifact, **not** a research phase; it does not change engine/corpus/M3.5A/A1 code.

### 5.4 Version ↔ content binding
```
holidayCalendarContentDigest = SHA-256(canonical({ jurisdiction, coverageStartDate, coverageEndDate, dates: sortedUnique(dates) }))
```
`HOLIDAY_CALENDAR_REGISTRY[version]` is immutable: an existing version's digest never changes; a decision-relevant change (any date/jurisdiction/coverage) requires a **new** `version`. The DecisionRequest freeze stores the **exact `dates[]` inside `DecideInput.holidayCalendar`**, plus `holidayCalendarVersion` on the request. Self-integrity (§ self-integrity) verifies the frozen dates canonicalize to `HOLIDAY_CALENDAR_REGISTRY[holidayCalendarVersion]`. A retry never reads current holiday data; the current-runtime gate does **not** compare current holiday version (the exact dates are frozen in the input and bound by `decideInputHash`).

### 5.5 Coverage + fail-closed
`dates[]` coverage `[coverageStartDate, coverageEndDate]` MUST include every `intendedTransactionAt` (Lima date) admissible in the Phase-0A observation window plus a guard horizon for BUYING_TODAY / intended-future capture. If a finalized context's `intendedTransactionAt` (Lima date) falls **outside** coverage, fail closed before DecisionRequest construction with `PurchaseIntentHolidayCoverageError`. Out-of-range dates are **never** silently treated as non-holidays.

### 5.6 Corpus vs holiday (no conflation, §37-of-task)
`corpusId` tracks corpus decision content (§9); `holidayCalendarVersion`/digest tracks the calendar; the exact holiday dates live inside the frozen `DecideInput`; M3.5A `inputHash` binds both. Holiday dates are **not** part of the corpus semantic digest (the corpus does not own them).

### 5.7 Tests
Exact version reproduces exact sorted-unique dates; changing one date changes the digest; same version + changed digest fails; duplicate/unordered dates normalize deterministically; out-of-coverage intended date fails closed; retry uses frozen dates despite a current-calendar change; a known holiday date drives `holidayPolicy` (EXCLUDED→BLOCKED, UNKNOWN→UNCERTAIN) consistently in the engine.

---

## 6. A2-DG-03 — Closed trusted entry-source evidence + precedence

### 6.1 Closed discriminated evidence union (server-resolved only)
```
TrustedEntryEvidence =
  | { kind: 'RESEARCH_LINK';  researchLinkId:  opaqueTrustedId }
  | { kind: 'AUTH_LINK';      authMessageId:   opaqueTrustedId }
  | { kind: 'SAVED_DECISION'; savedDecisionId: opaqueTrustedId }
  | { kind: 'SHARED_LINK';    shareTokenId:    opaqueTrustedId }
  | { kind: 'CONTENT';        contentTokenId:  opaqueTrustedId }
  | { kind: 'DIRECT' }
  | { kind: 'UNCLASSIFIED' }
```
All fields derive ONLY from server-resolved route/token/session state; the participant request body cannot instantiate or choose the union; opaque ids are trusted server artifacts. Resolved at capture-token issuance by the sanctioned `resolveTrustedEntrySource` (capability § 27-of-V4 / capability owner map); the participant never supplies `entrySource`.

### 6.2 Exhaustive mapping
| `TrustedEntryEvidence.kind` | `entrySource` |
| :-- | :-- |
| RESEARCH_LINK | RESEARCH_LINK |
| AUTH_LINK | AUTH_LINK |
| SAVED_DECISION | SAVED_DECISION |
| SHARED_LINK | SHARED_LINK |
| CONTENT | CONTENT |
| DIRECT | DIRECT |
| UNCLASSIFIED | OTHER |

### 6.3 Precedence (frozen) + resolution algorithm
When multiple server signals coexist, deduplicate and apply the frozen precedence (highest first):
```
RESEARCH_LINK > AUTH_LINK > SAVED_DECISION > SHARED_LINK > CONTENT > DIRECT > OTHER
```
```
resolveTrustedEntrySource(evidenceSet):
  recognized = filter evidenceSet to known kinds with valid trusted ids
  if recognized empty → return OTHER
  pick the highest-precedence recognized kind
  return mapping(kind)   // §6.2
```
Rationale: research/auth capture routes are the most contamination-relevant provenance and must win over generic content/direct. Invalid/unrecognized server evidence → OTHER. A participant-declared fallback is never accepted. No two implementers can map the same trusted evidence differently.

### 6.4 Retry
First durable token issuance for `(assignmentId, clientCorrelationNonce)` freezes `entrySource`. A later same-`(assignmentId, clientCorrelationNonce)` issuance with different current trusted evidence returns the historical token/source **unchanged** (no scientific-provenance mutation). Any mismatch may be emitted as audit-only telemetry later — never as scientific state. No blocker. This is **trusted capture provenance**, explicitly not later B entry-source adjudication/contamination conclusions.

---

## 7. A2-V4-NEW-01 — EligibilityPortfolio normalization before persistence

**Verified consumption** *(engine `eligibility.ts`)*: `portfolio.instruments.some(i => i.family===…)`, `.filter(...).some(i => i.network===…)`, `.some(i => i.tier===…)`, `.some(i => i.memberships?.includes(required))`, and `privateStates?.[key]` / `declarations?.[key]` map lookups. Matching is **existential** and by strict `===`/`.includes` (case-sensitive), so instruments/memberships are **set-like**, maps are keyed lookups. This grounds the normalization.

Freeze a normative `normalizeEligibilityPortfolioV1(raw): EligibilityPortfolio`, applied **before** persistence, `requestHash`, domain reconciliation, and DecisionRequest construction. No raw-order payload is ever persisted as scientific authority.

- **String grammar** (for `tier`, each `memberships` element, keys of `privateStates`/`declarations`): Unicode; trim; non-empty after trim; service-level max matching repository convention (≤128); **preserve exact case** (engine matching is case-sensitive `===`/`.includes`; lowercasing would alter token identity). `Tri` values validated against `{YES,NO,UNKNOWN}`; `family`/`network` against the frozen enums.
- **Memberships (set semantics):** trim/validate each; **deduplicate** exact-equal values; **sort code-point ascending**; persist only the normalized unique sorted list.
- **Instruments:** normalize `family` (enum), `network?` (enum), `tier?` (string grammar), `memberships?` (as above). **Deduplicate identical normalized instruments** (existential matching gives duplicates no semantic value); then **canonical sort** by the frozen comparator tuple `(family, network ?? '', tier ?? '', canonicalMembershipsSerialized)`.
- **Maps (`privateStates`, `declarations`):** validate key grammar + `Tri`; keys are unique by object nature; the canonical serializer emits keys in code-point order so key-permutation variants converge.

Two raw portfolios differing only by instrument order, membership order, duplicate memberships, duplicate identical instruments, or map-key order normalize to **identical** `portfolioJson` ⇒ identical `requestHash` ⇒ same domain reconciliation. Changing any semantic fact (`family`/`network`/`tier`/a membership value/a `Tri` value) changes the normalized JSON/hash. The normalized object is validated under `portfolioSchemaVersion="pagamenos.a2-portfolio.v1"` (strict; privacy — no PAN/CVV/credentials/transactions; `network` is a brand enum) and stored as the pinned `EligibilityProfileVersion.portfolioJson`.

Tests: all listed permutations converge; each semantic mutation diverges (§ tests).

---

## 8. A2-DG-H02 — Robust reload-and-prove P2002 fallback

Correctness comes from reloaded domain facts, not driver metadata. `e.meta?.target` is only a hint.
```
on Prisma P2002:
  hint = normalizeExpectedTarget(e.meta?.target)          // may be undefined/malformed
  if hint conclusively identifies ONE expected UNIQUE for this operation:
     candidateReloads = [that reconciliation]
  else:
     candidateReloads = [reload-and-prove for EVERY domain identity that could legally conflict for this operation]
  results = run each candidate reload
  accept reconciliation ONLY if exactly ONE coherent historical domain result proves the incoming
     request is the exact replay/alias (material + ownership + integrity all verify)
  if zero, or multiple/inconsistent candidates: FAIL CLOSED (typed invariant error)
```

Per-operation reload-and-prove lookups:
| Operation | Reload-and-prove | Reconcile iff | Else |
| :-- | :-- | :-- | :-- |
| capture-token issuance | `(assignmentId, clientCorrelationNonce)` | exactly one token matches the nonce identity | `intentCaptureKey` collision with no nonce match → invariant failure |
| createPurchaseIntent | by `captureTokenId` | first-committed material (§H04) matches | fail closed |
| context append | `(intentId, contextCaptureKey)` (+ intended `contextSeq` candidate) | capture-key identity matches & payload equal | `(intentId, contextSeq)` collision alone → **retry allocation under lock**, not alias |
| eligibility-profile append | `(assignmentId, profileCaptureKey)` (+ `profileSeq` candidate) | capture-key identity & payload equal | seq collision → retry allocation |
| finalization | by `intentId` | `contextVersionId` + `eligibilityProfileVersionId` equal | conflict |
| receipts | exact `(operationScope, idempotencyKey)` | request-hash matches | conflict |
| DecisionRequest | by `intentId`, `businessDecisionKey`, `m3_5aIdempotencyKey` | all three resolve to the SAME row coherently | fail closed |
| Binding | by `decisionRequestId` and by `snapshotId` | both resolve to the SAME binding & `verifyPurchaseIntentDecisionBinding` passes | typed binding conflict |

Tests (§): normal `meta.target`; target absent; target malformed; unrelated unique violation; multiple conflicting rows (direct-SQL probe) → no wrong alias; a legitimate expected race still converges when metadata is absent.

---

## 9. A2-DG-H03 — Immutable historical `corpusId → semanticDigest` binding

**Threat (Sol):** change corpus content → change a mutable expected-digest constant → keep the same `corpusId` → CI passes. This must be impossible.

### 9.1 Versioned immutable release ledger
Repository artifact `CORPUS_RELEASE_LEDGER_V1`, an immutable map `{ corpusId → corpusSemanticDigest }`:
- every released/accepted `corpusId` has exactly one registered semantic digest;
- an existing `corpusId`'s digest is **immutable**;
- a decision-relevant content change requires a **new** `corpusId` (with a new ledger entry);
- **CI gate 1:** current corpus's computed semantic digest MUST equal `ledger[currentCorpusId]`, else fail;
- **CI gate 2:** the ledger MUST equal an accepted **immutable historical release snapshot** (a committed accepted git tag / accepted fixture of the ledger) for all pre-existing entries, so editing an old entry is detected independently of the current working tree.

The attack fails: if the developer edits the ledger entry for `currentCorpusId`, CI gate 2 detects divergence from the accepted historical snapshot; if they don't edit it, CI gate 1 fails (current digest ≠ ledger). They cannot both change content and keep `corpusId`. (If maintaining an external accepted tag is awkward, a **content-addressed `corpusId`** for FUTURE versions is an acceptable alternative — but the immutability invariant is mandatory and mechanical, never documentation-only.)

### 9.2 Accepted-current bootstrap
Compute one canonical semantic digest for the existing accepted corpus, register it under its current accepted `corpusId`, and treat that pair as frozen historical authority from the first A2 release. No past M3.5A data is rewritten.

### 9.3 Semantic projection (exact) + ordering
`corpusSemanticDigest = canonicalHash(project(loadCorpus()))` where `project =`:
```
{
  scopes:            corpus.scopes           sorted by scopeId,                    normalized (set-like nested fields sorted)
  activeRules:       corpus.activeRules      sorted by (ruleId, version),          full RuleVersion semantic content
  operationalStates: corpus.operationalStates sorted by (ruleId, version),         decision-consumed fields
}
```
Exclude: `corpusId` itself; `freezeTimestamp`; `merchants`/`sources` registries and `researchMeta` (not consumed by `decide()` — `DecideInput` carries only rules/operationalStates/scopes/portfolio/context); documentary notes. **Include** every field that can alter `decide()` output/status/advisories/ranking (the full `RuleVersion` — benefit, constraints incl. `holidayPolicy`/`specificBlackoutDates`, selectors, signature, eligibility/confidence — and the operational-state axes the engine consumes). Because the accepted canonicalizer preserves array order, arrays are sorted before hashing (scopes by `scopeId`; rules & states by `(ruleId, version)`; nested set-like collections normalized) so a mere source-array reorder does not change the digest. **Operational-state cardinality (§4)** is enforced at release too: duplicate op-state key / missing state for an active rule / orphan state for a nonexistent active rule → release-guard failure.

### 9.4 Relationship to the frozen input
This guard closes only **corpus label-integrity** — two different contents sharing one `corpusId`. The concrete decision inputs are already protected at fresh execution: M3.5A's provenance verifier canonical-hashes each frozen rule/scope against the current corpus (authenticity) and enforces per-scope completeness, and `decideInputHash` freezes the exact input. So no redundant runtime digest is persisted by A2; the ledger is a build/release invariant.

### 9.5 Test (critical attack)
`change a rule → recompute/edit a local expected digest → keep corpusId unchanged` MUST fail CI (gate 1 and/or gate 2). Plus: changing a decision-relevant field flips the digest; a source-array reorder alone does not.

---

## 10. Carried-forward closed findings (NOT reopened; consistency only)

- **DG-04** — every persisted material context field participates in the context `requestHash` + domain reconciliation; `purchaseSignatureJson` (now the §3 discriminated object) is canonicalized whole; `contextSeq`/`capturedAt`/`recordedAt` excluded (sampled/derived). Property mutation test retained; extended to the §3 fields.
- **DG-05** — binding carries no free-standing `intentId`; intent reached via `decisionRequestId`; `verifyPurchaseIntentDecisionBinding` in Case A; `UNIQUE(decisionRequestId)`/`UNIQUE(snapshotId)`.
- **DG-06** — Case-C DecisionRequest creation = INTERNAL PROCESSING; no consent read; withdrawal ≠ `PurchaseIntentInvalidation`; `services/study-intent-decision.ts` has no consent-facts capability (AST-tested).
- **H01** — Prisma declared `^6.2.0`, lockfile-resolved **6.19.3**; implementability uses 6.19.3; virtual back-relations only, no SQL column on accepted tables.
- **H04** — a `PurchaseIntentCaptureToken` freezes assignment/`entrySource`/capture identity but not `intentType`; the first committed `PurchaseIntent` fixes `intentType`; a later create on an already-used token with different `intentType` → `PurchaseIntentCaptureConflictError`.
- **H05** — label grammar (TEXT; trimmed; non-empty; ≤128 service max); `expectedEngineInputSchemaVersion` additionally parser-dispatched.

---

## 11. Updated Exact DecideInput Construction Authority (full)

| DecideInput field | Req? | Authoritative persisted source | Trusted derivation at freeze | In frozen JSON+hash? |
| :-- | :-- | :-- | :-- | :-- |
| rules | yes | corpus `activeRules` | complete active set for each required scope; sorted `(ruleId, version)` | yes |
| operationalStates | yes | corpus `operationalStates` | exactly one per included rule (**§4 fail closed**); sorted `(ruleId, version)` | yes |
| scopes | yes | corpus `scopes` | all merchant scopes RELEVANT to the derived context; sorted `scopeId` | yes |
| portfolio | yes | pinned `EligibilityProfileVersion.portfolioJson` | **`normalizeEligibilityPortfolioV1` before persistence (§7)**; parsed under `portfolioSchemaVersion` | yes |
| context | yes | finalized `PurchaseIntentContextVersion.purchaseSignatureJson` | **COMPLETE-SIGNATURE-ONLY (§3)**; flatten the one admitted family to `PurchaseContext` | yes |
| evaluatedAt | yes | — | trusted service sample at freeze | yes |
| intendedTransactionAt | yes | finalized context version | copied verbatim (zone-qualified) | yes |
| selectedScopeId | optional | — | **omitted (fixed Phase-0A policy)** | absent |
| holidayCalendar | optional | **`HolidayCalendarVersion.dates` @ `holidayCalendarVersion` (§5)**; content-bound registry digest | exact `dates[]` snapshotted verbatim; coverage-checked (fail closed out-of-range) | yes (exact values) |
| baselineByScopeId | optional | — | **omitted (display-only penSaved; never a ranking key)** | absent |

`buildDecideInputFromFinalizedAuthorities({ finalizedContextVersion, pinnedEligibilityProfileVersion (normalized), corpusSnapshot, holidayCalendarVersion+dates, evaluatedAt })` — deterministic; validates under `engineInputV1Schema`; requires no mutable/current fact after return; persisted immediately into `PurchaseIntentDecisionRequest.exactValidatedDecideInputJson`. The DecisionRequest additionally stores `holidayCalendarVersion` (§5.4) alongside `expectedEngineInputSchemaVersion`/`expectedEngineContractVersion`/`expectedCorpusVersion`.

---

## 12. Entity / service table deltas

**Entities:** unchanged set from V4 (13 A2 tables). **No new DB table** for holidays — the holiday calendar is a **versioned static authority artifact + immutable registry** (§5.1). `EligibilityProfileVersion.portfolioJson` stores the **normalized** portfolio (§7). `PurchaseIntentDecisionRequest` gains `holidayCalendarVersion` (label; grammar per H05). Virtual back-relations only on accepted tables (no SQL column).

**Services:** unchanged surfaces. Clarifications: the participant-write service `services/study-purchase-intent.ts` uses the **assignment lock + separate A1 consent read (Model A, §2)**; the decision service `services/study-intent-decision.ts` has **no** consent capability; `buildDecideInputFromFinalizedAuthorities` receives the normalized pinned profile + finalized context + exact holiday fixture dates + validated corpus snapshot. `resolveTrustedEntrySource` consumes only `TrustedEntryEvidence` (§6).

---

## 13. SCI updates

- **SCI-A2-05 (DecideInput authority) — READY:** complete-signature A2 policy explicit (§3); every accepted `DecideInput` field has exact authority (§11); exact holiday fixture (§5); operational-state exactly-one cardinality (§4).
- **SCI-A2-11 (consent serialization) — READY:** assignment-lock + Model A separate consent read is mechanically sufficient (§2); replay/alias/internal-repair never re-authorize.
- **SCI-A2-12 (retry/domain identity) — READY:** normalized portfolio (§7) + robust reload-and-prove P2002 (§8) complete the domain identity.
- **SCI-A2-16 (trusted entry provenance) — READY:** closed evidence union + mapping + precedence (§6).
- **SCI-A2-17 (portfolio input authority) — READY:** pre-persistence normalization (§7); immutable versioned; card-number-free; no B/C.
- **SCI-A2-18 (corpus semantic integrity) — READY:** immutable historical `corpusId → digest` ledger with dual CI gates (§9).
Other SCI-A2 clauses (01–04, 06–10, 13–15) carried unchanged from V4.

---

## 14. R35R matrix

| Finding | Status | Basis |
| :-- | :-- | :-- |
| R35R-04 | CLOSED | businessDecisionKey from immutable id |
| R35R-05 | CLOSED | exact DecideInput authority (§11) + binding repair complete |
| R35R-06 | CLOSED | deterministic trusted entry evidence (§6) + exact initiation/context/finalization/invalidation authorities |
| R35R-08 A2 | CLOSED (A2 portion) | consent serialization contract implementable (Model A, §2) |
| R35R-11 A2 | CLOSED | SCI ready (§13) |
| R35R-15 A2 | CLOSED | normalized semantic identity (§7) + robust P2002 fallback (§8) |
| R35R-19 | DEFERRED NON-BLOCKING | timestamps preserved; as-of C2 |

---

## 15. V4.1 Closure Matrix

| Finding | Status | Authority · algorithm · concurrency · enforcement · test |
| :-- | :-- | :-- |
| A2-DG-01 | **CLOSED** | **Authority:** continuously-held `ExperimentAssignment FOR UPDATE`. **Algorithm:** Model A (§2) — lock, recheck, sample `collectionAt`, read consent via A1 facade on a separate READ COMMITTED connection, `wasCollectionAuthorizedAtKnownTime`, append+commit or rollback. **Concurrency:** two-serialization proof (§2.1); withdrawal can't commit while A2 holds the lock; a pre-lock withdrawal is visible to the READ COMMITTED read. **Enforcement:** service in `study-purchase-intent.ts`; consent facade separate client (verified shared singleton). **Test:** real-PG withdrawal races for all five NEW facts + replay-after-withdrawal (§2.2). |
| A2-DG-02 | **CLOSED** | **Authority:** (a) COMPLETE-SIGNATURE-ONLY capture policy (§3), (b) op-state exactly-one cardinality (§4), (c) versioned content-bound holiday fixture + registry (§5) with the bounded `A2 Holiday Calendar Fixture v1` gate. **Algorithm:** discriminated `purchaseSignatureJson` schema; per-included-rule op-state count==1 else typed error; frozen `dates[]`+coverage fail-closed. **Enforcement:** versioned A2 context/portfolio/holiday schemas + build guard + DecisionRequest freeze. **Test:** §3.2/§4/§5.7. |
| A2-DG-03 | **CLOSED** | **Authority:** closed `TrustedEntryEvidence` union, server-resolved only (§6.1). **Algorithm:** exhaustive mapping (§6.2) + frozen precedence resolution (§6.3); invalid→OTHER; retry freezes source (§6.4). **Enforcement:** `resolveTrustedEntrySource` capability; participant body cannot instantiate the union; token-immutable `entrySource`. **Test:** every variant maps deterministically; precedence conflicts; body cannot choose. |
| A2-DG-H02 | **CLOSED** | **Authority:** reloaded domain facts (metadata is a hint). **Algorithm:** reload-and-prove; accept iff exactly one coherent historical result proves exact replay/alias, else fail closed (§8). **Enforcement:** per-operation lookups (§8 table). **Test:** metadata present/absent/malformed/unrelated/multiple → no wrong alias; expected race converges without metadata. |
| A2-DG-H03 | **CLOSED** | **Authority:** immutable `CORPUS_RELEASE_LEDGER_V1` (`corpusId → semanticDigest`) + accepted historical snapshot (§9). **Algorithm:** dual CI gates (current digest == ledger[currentId]; ledger == accepted snapshot for old entries); semantic projection {scopes, activeRules, operationalStates} sorted+canonicalHash (§9.3). **Concurrency:** n/a (release-time). **Enforcement:** CI/release guard + op-state cardinality. **Test:** content-change+digest-edit+same-corpusId MUST fail (§9.5). |
| A2-V4-NEW-01 | **CLOSED** | **Authority:** engine existential/case-sensitive portfolio consumption (verified). **Algorithm:** `normalizeEligibilityPortfolioV1` before persistence/hash/reconciliation — string grammar (case-preserving), membership set dedup+sort, instrument dedup+canonical sort, map key-order-canonical (§7). **Enforcement:** normalize→validate(`portfolioSchemaVersion`)→persist as pinned `EligibilityProfileVersion`. **Test:** all permutations converge; each semantic mutation diverges (§7). |

---

## 16. Mandatory tests (additions this patch)

**DG-01:** real-PG withdrawal races (Model A) for create/context/eligibility-profile/finalize/invalidate — lock-first success, withdrawal-first rejection, replay-after-withdrawal success with no new row. **DG-02 context:** generic M3 accepts a partial/mixed context, A2 capture rejects it (`PurchaseIntentContextSignatureError`); each admitted family with exact required fields succeeds. **DG-02 op-states:** missing → fail; duplicate → fail; orphan → release-guard fail; exactly-one → build succeeds. **DG-02 holiday:** exact fixture/digest; mutation under same version fails; out-of-coverage fails closed; retry freezes exact dates; holiday date drives `holidayPolicy` consistently. **DG-03:** every `TrustedEntryEvidence` variant maps; precedence conflicts resolve deterministically; participant body cannot choose source. **Portfolio (V4-NEW-01):** all semantic permutations normalize identically; each semantic mutation changes identity. **H02:** metadata-absent fallback converges; no wrong alias under corruption. **H03:** the critical attack (content change + local digest edit + same corpusId) fails CI. Plus all prior A2 adversarial tests (capture/context/finalization/invalidation/business-key/DecisionRequest self-integrity/historical finder/version-drift/binding/capability/Prisma-validate) carried forward.

---

## 17. Exact next action

**STOP.** Submit V4.1 for the independent Codex Sol closure gate, alongside accepted A1 V2.1 and the accepted repository, plus the declared bounded pre-implementation artifact `A2 Holiday Calendar Fixture v1` (§5.3) which must be produced and gated before A2 implementation begins. Do not implement, create Prisma models/migrations, author the fixture as code, expose any facade, or open a branch. `Production Protocol v1 = UNFROZEN`; `Wave 0 = NOT AUTHORIZED`.

---

# Final Verdict

## M3.5B-A2 EFFECTIVE DESIGN V4.1 READY FOR INDEPENDENT CLOSURE GATE

All six remaining findings are closed with authority, exact algorithm, concurrency behavior, enforcement point, and adversarial test (§15):
- **DG-01** — Model A: the continuously-held `ExperimentAssignment` row lock is the serialization authority; the A1 consent facade reads on a separate READ COMMITTED connection after the lock is acquired; the two-serialization proof holds (§2). The transaction-client-sharing requirement is removed.
- **DG-02** — deliberate COMPLETE-SIGNATURE-ONLY capture policy (§3); operational-state exactly-one cardinality, fail closed (§4); a content-defined versioned immutable holiday authority with a declared bounded fixture artifact and digest binding, coverage, and fail-closed out-of-range (§5).
- **DG-03** — a closed server-resolved `TrustedEntryEvidence` union with an exhaustive mapping and frozen precedence (§6).
- **H02** — reload-and-prove P2002 correctness from domain facts, metadata only a hint (§8).
- **H03** — an immutable historical `corpusId → semanticDigest` release ledger with dual CI gates defeating the content-change/same-id attack (§9).
- **V4-NEW-01** — `normalizeEligibilityPortfolioV1` before persistence/hash/reconciliation, grounded in the verified existential, case-sensitive engine consumption (§7).

Sol's previously-closed findings (DG-04/05/06/H01/H04/H05) are carried forward unchanged (§10). No B/C scope expansion; no material design choice remains for the implementer except the one explicitly-declared, gated data-authoring artifact (`A2 Holiday Calendar Fixture v1`, §5.3). No implementation is self-authorized — implementation GO remains the independent reviewer's to grant. **DESIGN ONLY.**

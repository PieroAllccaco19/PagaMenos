<!-- R-B-17 ARCHIVAL HEADER - BEGIN. Added by the R-B-17 authority repair. Nothing below the END marker is altered. -->

> # HISTORICAL / NON-NORMATIVE
>
> **Status:** `HISTORICAL / NON-NORMATIVE - accepted-chain member, consolidated into the canonical A2 specification`
>
> **This document is retained as audit evidence only. It is NOT active authority and MUST NOT drive implementation, review, or gating.**
>
> **Active normative A2 specification:** `PAGAMENOS_M3_5B_A2_EFFECTIVE_SPEC_CANONICAL_V1.md`, which consolidates the accepted V4 to V4.5 chain without semantic change. This revision supplied the architectural spine.
>
> **Supersession language inside this file is non-operative.** Any claim below of the form "fully supersedes" or "fully replaces" described the review packet submitted to one historical gate. It does **not** supersede, and never superseded, the active normative artifact named above. See Appendix B of the canonical A2 specification for the full register of neutralized claims.
>
> **Body integrity.** Everything after the `R-B-17 ARCHIVAL HEADER - END` marker is the original file, byte for byte. Its SHA-256 before archival was:
>
> `sha256:1303e2376d99e33dd41ff728cac2a01c6c586b765fbaa826f040f4dcea6ebaab`
>
> Verify with: `tail -n +23 <this file> | sha256sum`
>
> **Root authority register:** `PAGAMENOS_SPEC_AUTHORITY.md` · **Repair record:** `PAGAMENOS_R_B_17_AUTHORITY_REPAIR_REPORT.md`

<!-- R-B-17 ARCHIVAL HEADER - END -->

# PAGAMENOS — M3.5B-A2 EFFECTIVE PRE-IMPLEMENTATION SPECIFICATION — V4

**Milestone:** M3.5B-A2 — PurchaseIntent lifecycle · deterministic decision-request freezing · exact snapshot binding · crash-repair saga.
**Status:** DESIGN / SPECIFICATION ONLY. No code / Prisma / migrations / Git / commits / implementation / B/C / Wave 0.
**Nature:** self-contained. **This V4 fully supersedes V1/V2/V3.** A reviewer needs only (1) this document, (2) accepted A1 spec `PAGAMENOS_M3_5B_A1_EFFECTIVE_SPEC_V2_1.md`, and (3) the accepted repository. Prior versions are historical; do not reconcile them.

**Origin:** the independent Codex Sol gate returned `# B — M3.5B-A2 DESIGN REQUIRES FINAL SPEC PATCH` on V3. V4 closes the six blockers `A2-DG-01…06` and five hardening items `A2-DG-H01…H05` (closure matrix §53).

**Accepted baselines (verified present, `C:/Users/piero/pagamenos-a1`, HEAD `7c0a3d9`; inspected READ ONLY):** M3.5A `64cf864…`; M3.5B-A1 `99f2d61…` (ACCEPTED, CLOSED); doc-only A1 child `7c0a3d9…`. Failed prototype `1ded28d…` (C — NO-GO) is not authority.

**Conventions.** Instants zone-qualified (`America/Lima`); "trusted time" is sampled by the service under a stable row lock, never caller-supplied. Money is integer céntimos and is provenance, never identity. A2 scientific tables are append-only at the DB level (BEFORE UPDATE/DELETE/TRUNCATE triggers `RAISE`), matching the accepted `*_forbid_mutation` guard. *(verified)* = read in the accepted worktree; *(contract)* = reliance on the accepted semantic contract.

---

## 1. Executive Summary

A2 turns one trustworthy participant purchase intent into exactly one immutable decision request and exactly one matching immutable `DecisionSnapshot`, safe under retries, concurrency, crashes, redeploys, engine/corpus drift, correction/invalidation, and lost responses. V4's closures:

- **A2-DG-01** — every genuinely NEW participant scientific write serializes on **`ExperimentAssignment FOR UPDATE`** (the same row A1 consent mutation locks) before sampling collection time or reading consent, under a global lock order `ExperimentAssignment ≺ PurchaseIntent root ≺ children` (§4). Replay/alias of an already-durable fact is exempt (§5-consent).
- **A2-DG-02** — an exhaustive, field-level **Exact DecideInput Construction Authority** (§11) grounded in the verified accepted `DecideInput`/`EligibilityPortfolio`/`PurchaseContext`/`Corpus` types; a discriminated **purchase-signature** context model (§9) representing every accepted signature family; a mandatory **`EligibilityProfileVersion`** input authority (§10); a deterministic corpus→input transformation persisted verbatim (§12). No mutable reference survives the freeze.
- **A2-DG-03** — `entrySource` becomes **trusted server-resolved provenance** on the capture token, never participant-selected (§8).
- **A2-DG-04** — every persisted material context field (incl. the former `locationRef`, now the accepted `branch`) is in the context request hash + domain reconciliation, proven by a property test (§14).
- **A2-DG-05** — binding cross-wiring is **structurally impossible** (the binding carries no free-standing `intentId`; the intent is reached only via `decisionRequestId`), plus a normative `verifyPurchaseIntentDecisionBinding` (§7/§7.1).
- **A2-DG-06** — Case-C `DecisionRequest` creation is **INTERNAL PROCESSING**, never new collection; no current-consent read; withdrawal ≠ invalidation; the decision service has **no** consent-read capability (§6/§7.2).
- Hardening: **H01** Prisma resolves to **6.19.3** (declared `^6.2.0`); **H02** exact per-constraint P2002 discrimination; **H03** a mechanical corpus content-digest release guard; **H04** unused-token material semantics; **H05** exact historical-label grammar.

`PurchaseIntent input capture ≠ B opportunity identity ≠ C evidence` (§44).

---

## 2. Scope / Non-Scope

**A2 authorizes:** `PurchaseIntentCaptureToken`; `PurchaseIntent`; `PurchaseIntentContextVersion` (discriminated purchase signature); `EligibilityProfileVersion`; `PurchaseIntentFinalization`; `PurchaseIntentInvalidation`; deterministic `businessDecisionKey`; `PurchaseIntentDecisionRequest`; `PurchaseIntentDecisionBinding`; the additive read-only M3.5A `findExactHistoricalDecision` facade; the additive read-only A1 `readConsentAuthorizationFacts` facade; the trusted entry-source resolver interface; the current-runtime compatibility gate; A2 write receipts; the A2 capability boundary; A2 SCI + adversarial tests; the additive Prisma models/migrations/AST-ESLint extensions/services.

**OUT of scope (B/C):** PurchaseOccasion; occasion lineages; ResearchContact; AuthMessage; weekly reports; opportunity reconciliation; entry-source **adjudication/contamination conclusions**; aggregate/app overlap; TransactionCorroboration; BaselineCorroboration; ValueVerification; redeemed-benefit attribution; VS3/VS4; RIVSR; denominator bounds; thresholdStatus; C2 analysis. A2 captures eligibility/purchase-signature **only as decision INPUT authority** (§44). No production Protocol v1 freeze, deploy, or Wave 0 (§41).

---

## 3. Accepted Baseline Dependencies (VERIFIED)

### 3.1 The accepted `DecideInput` *(verified, `src/engine/types.ts`)*
```
DecideInput {
  rules:               RuleVersion[]            // corpus
  operationalStates:   RuleOperationalState[]   // corpus
  scopes:              ComparisonScope[]        // corpus
  portfolio:           EligibilityPortfolio     // MANDATORY (non-optional)
  context:             PurchaseContext
  evaluatedAt:         string                   // zone-qualified instant
  intendedTransactionAt: string                 // zone-qualified instant
  selectedScopeId?:    string
  holidayCalendar?:    string[]                 // explicit Lima YYYY-MM-DD; no external lookup
  baselineByScopeId?:  Record<string, Centimos> // DISPLAY-ONLY penSaved; never a ranking key (§14-baseline)
}
EligibilityPortfolio {                          // card-number-free (§7 of engine)
  instruments: { family: ProviderFamily; network?: 'AMEX'|'VISA'|'MC'; tier?: string; memberships?: string[] }[]
  privateStates?: Record<string, Tri>           // Tri = 'YES'|'NO'|'UNKNOWN'
  declarations?:  Record<string, Tri>
}
PurchaseContext {
  merchantId: MerchantId
  channel?: Channel; branch?: string
  wholeBillCentimos?; foodCentimos?; nonAlcoholicBeverageCentimos?: Centimos
  ticketUnitPriceCentimos?: Centimos; ticketCount?: number; ticketClass?: string
  exactItems?: { itemKey: string; qty: number }[]      // CanonicalItemQty
  purchaseDomain?: PurchaseDomain
  nominalPackage?: { cashAcquisitionCostCentimos: Centimos; nominalUnit: NominalUnit }
}
```
`Tri = 'YES'|'NO'|'UNKNOWN'` *(verified)*. `INSTRUMENT_NETWORKS_V1 = ['AMEX','VISA','MC']`, `NOMINAL_UNITS_V1 = ['CONEY_PLAY_BALANCE']`, `TRI_V1 = ['YES','NO','UNKNOWN']` *(verified, `tokens-v1.ts`)*. The frozen persistence mirror is `engineInputV1Schema` *(verified, `src/persistence/schema.ts`)* under `ENGINE_INPUT_SCHEMA_VERSION='pagamenos.engine-input.v1'`.

### 3.2 Corpus *(verified, `src/corpus/types.ts`, `index.ts`)*
`loadCorpus(): Corpus = CORPUS_V1` (static, pure, in-memory). `Corpus { corpusId; freezeTimestamp; merchants; sources; scopes: ComparisonScope[]; activeRules: RuleVersion[]; operationalStates: RuleOperationalState[]; researchMeta; excludedRules }`. `RuleVersion.comparisonScopeRefs: string[]`; `ComparisonScope.signature: PurchaseSignature` ∈ `{ EXACT_BUNDLE(canonicalItems) | ELIGIBLE_BILL(purchaseDomain) | TICKETS(ticketCount,ticketClass) | NOMINAL_PACKAGE(cashAcquisitionCostCentimos,nominalUnit) }`. The corpus-provenance verifier *(verified, `src/persistence/provenance.ts`)* defines required-scope selection: with `selectedScopeId` unset, every corpus scope for the runtime merchant whose signature is RELEVANT to the context (`signatureRelevant`) must be present, and per required scope the COMPLETE active `ruleId@version` set must be present (order-invariant); operational state is dynamic and not membership-checked.

### 3.3 M3.5A persistence *(verified, unchanged from `64cf864`)*
`decideAndPersist({ input, businessDecisionKey, idempotencyKey })`, `loadDecisionSnapshot`, `replayDecisionSnapshot` (public barrel); internal repo `findReceipt`/`findSnapshotById`/`findSnapshotByBusinessKey`; `requestHash === inputHash === SHA-256(canonical(validated DecideInput))`; `businessDecisionKey` UNIQUE and compared separately; receipt `UNIQUE(operationScope, idempotencyKey)`. `ENGINE_CONTRACT_VERSION='pagamenos.engine.m3.v1'`; `corpusVersion = corpusId`; `gitSha`/`buildId` are build identity. **Loadability rule (verified):** `decisionSnapshotDtoSchema` pins all four version fields with `z.literal(<current constant>)` and `parseDecisionSnapshot` dispatches on `snapshotSchemaVersion`, so a stored snapshot is loadable only while the current build recognizes its stamped versions (§16). Provenance verifier canonical-hashes each supplied rule/scope against the current corpus (authenticity) and enforces per-scope completeness.

### 3.4 A1 *(verified)*
Prisma client/CLI declared `^6.2.0`, **lockfile-resolved `6.19.3`** *(verified, `pnpm-lock.yaml`)* — **H01**; V4 uses 6.19.3 for implementability. `TrustedParticipantContext = { readonly participantId }` (WeakSet-validated, unforgeable); adapter `resolveTrustedParticipantContext({ authenticatedParticipantId })` (`services/study-participant-session.ts`, behind `@/services/study-admin`). Own-assignment: `ConsentStore.findAssignmentParticipantId(assignmentId)` compared to `context.participantId` (`StudyAssignmentOwnershipError`). Pure consent contracts on `@/services`: `wasCollectionAuthorizedAtKnownTime({ events, collectionAt, asOfKnowledgeAt? })`, `deriveConsentAuthorizationIntervals`, `effectiveConsentState`, `ConsentEventFact`. Events load only via internal `ConsentStore.listEvents(assignmentId)` (capability-locked to `services/study-consent.ts`) ⇒ A2 needs the additive facade (§7.2). Consent mutation locks `experiment_assignment` `FOR UPDATE` *(verified, `study-consent-repository.ts`)* — the serialization row A2-DG-01 shares. Request-hash discipline `canonicalHash({ op, …material…, context })`. Capability enforcement = ESLint groups + AST `RAW_WRITE_MODULES`/`DEEP_SERVICE` + a **per-repository owner-allowlist map** + fail-closed non-literal `import()`.

---

## 4. A2-DG-01 — New-collection serialization with A1 withdrawal

**Rule.** Every genuinely NEW participant scientific fact MUST serialize on the SAME stable authority row A1 consent mutation uses — `ExperimentAssignment FOR UPDATE` — **before** sampling collection time or evaluating consent. Applies to NEW: `PurchaseIntent`, `PurchaseIntentContextVersion`, `EligibilityProfileVersion`, `PurchaseIntentFinalization`, `PurchaseIntentInvalidation`. Does NOT apply to: exact same-key transport replay; exact different-key alias of an already-existing fact; `PurchaseIntentCaptureToken` issuance (§8/§9-consent); `PurchaseIntentDecisionRequest` creation / internal decision repair (§6).

**Global lock order (frozen):** `ExperimentAssignment ≺ PurchaseIntent roots (ascending UUID order) ≺ child rows`. No operation may acquire `PurchaseIntent → ExperimentAssignment`.

**Per new-fact operation (normative ordering):**
```
1  validate schema/material
2  resolve trusted actor + own-resource (own-assignment / own-intent via TrustedParticipantContext)
3  exact same-transport-key receipt lookup            → if present & material matches: REPLAY (no consent, no new timestamp), return
4  exact domain-result reconciliation (existing fact) → if present & material matches: ALIAS  (no consent, no new timestamp), return
5  determine assignment (via intent → captureToken → assignment, or directly for create)
6  BEGIN TX
7  LOCK ExperimentAssignment FOR UPDATE
8  acquire the required PurchaseIntent root lock(s) in ascending-UUID order (where a root is involved)
9  RE-CHECK receipt/domain result under the locks     → if a historical result now exists: REPLAY/ALIAS (no new collection)
10 sample trusted collection timestamp
11 load consent events INSIDE the same transaction (readConsentAuthorizationFacts, §7.2)
12 wasCollectionAuthorizedAtKnownTime({ events, collectionAt })  → if unauthorized: ROLLBACK/REJECT
13 append the scientific fact + its receipt atomically
14 COMMIT
```

**Withdrawal races (only two outcomes):**
- *A2 new-fact lock wins:* A2 holds `ExperimentAssignment` first, reads GRANTED, authorizes, and commits; the withdrawal transaction can acquire the assignment lock only afterward. Valid new fact, then withdrawal. ✔
- *Withdrawal lock wins:* the withdrawal commits first; A2 then acquires the assignment lock, `readConsentAuthorizationFacts` returns the withdrawal event, `wasCollectionAuthorizedAtKnownTime` is false at the sampled `collectionAt`, and A2 **rejects** the new fact. ✔

No third outcome (the assignment row lock serializes them). Required real-PostgreSQL concurrency tests (§50 DG-01): withdrawal vs {create, context append, eligibility-profile append, finalize, invalidate} — prove no post-withdrawal NEW fact commits.

**Replay/alias stays fast (do not "fix" DG-01 by re-authorizing history).** Steps 3–4 may return **before** the assignment lock when the historical result is already durable and material/ownership/integrity verify. If a race means the historical result could be arriving concurrently, step 9 re-checks under the locks before creating a NEW fact. Withdrawal never makes an exact historical retry fail.

---

## 5. Capture Identity / Retry (structurally token-bound)

**Model:** server-issued durable capture token, idempotent on a client-held correlation nonce, immutably bound to the trusted assignment and to trusted `entrySource` (§8); the `PurchaseIntent` is a DB-FK child of the token (no independent assignment field to forge).

```
PurchaseIntentCaptureToken {
  id                     PK UUID
  assignmentId           FK → ExperimentAssignment RESTRICT   -- TRUSTED, from the trusted context; immutable
  clientCorrelationNonce                                       -- UNTRUSTED correlation material (client-held; §13.1)
  intentCaptureKey       UNIQUE                                -- SERVER-minted opaque (gen_random_uuid); never client-chosen
  entrySource            enum (§8)                             -- TRUSTED server-resolved provenance; immutable
  issuedAt               TIMESTAMPTZ trusted
  UNIQUE(assignmentId, clientCorrelationNonce)                 -- COMPLETE durable issuance idempotency (no receipt; H2/DG-13)
}   -- append-only

PurchaseIntent {
  id             PK UUID                                        -- SOLE decision identity
  captureTokenId UNIQUE FK → PurchaseIntentCaptureToken RESTRICT -- assignment + entrySource reached ONLY here (§4/§8)
  intentType     enum BUYING_NOW|BUYING_TODAY|CONSIDERING_LATER|EXPLORATORY   -- participant initiation (§H04)
  initiatedAt    TIMESTAMPTZ trusted
  createdAt      TIMESTAMPTZ trusted
}   -- append-only
```
No `assignmentId`, `intentCaptureKey`, `entrySource`, `captureOrigin`, or actor-context columns live on `PurchaseIntent` — the assignment and `entrySource` are the token's alone (structurally eliminates mismatch/forgery; trusted actor is inferable via `intent → token → assignment → participant` and is bound into request hashes, §25).

**`issueIntentCaptureKey({ trustedParticipantContext, assignmentId, clientCorrelationNonce })`** — verify own assignment; the trusted entry-source resolver (§8) supplies `entrySource` server-side; insert the token; on `UNIQUE(assignmentId, clientCorrelationNonce)` P2002 return the existing token's `intentCaptureKey` (**idempotency = that constraint; no receipt, no request-hash — A2-DG-13**). Issuance is **not** participant scientific collection (§9-consent).

**`createPurchaseIntent({ trustedParticipantContext, intentCaptureKey, intentType, idempotencyKey })`** — resolve the token by `intentCaptureKey`; verify `token.assignmentId` is own; apply §4 (NEW fact ⇒ assignment lock + consent); insert `PurchaseIntent(captureTokenId=token.id, intentType, initiatedAt)`; on `UNIQUE(captureTokenId)` P2002 reconcile (§H02). `entrySource` is NOT a create input.

### 5.1 Response-loss / restart
Client generates `clientCorrelationNonce` before any call and persists it client-side. Issuance response lost ⇒ same nonce ⇒ same token/key. Create response lost ⇒ retry (possibly different transport key) with the held `intentCaptureKey` ⇒ `UNIQUE(captureTokenId)` ⇒ one root. If the client lost the nonce, it starts fresh (a genuinely-new capture — never collapsed).

### 5.2 Convergence
| transport | intentCaptureKey→token | create material (intentType) | Result |
| :-- | :-- | :-- | :-- |
| same | same | same | replay create-receipt |
| same | different | — | `PurchaseIntentCaptureConflictError` |
| different | same | same | one root + CAPTURE_ALIAS receipt |
| different | same | different | `PurchaseIntentCaptureConflictError` |
| different | different | — | two roots |
| concurrent | same | same | one root (`UNIQUE(captureTokenId)`+P2002) |

**Non-collapse:** distinct nonces ⇒ distinct tokens ⇒ distinct roots regardless of merchant/amount/time. **Cross-participant:** B presenting A's key fails own-assignment against `token.assignmentId`; the token is immutable and the intent has no independent assignment — even a direct DB INSERT cannot rebind (A2-PRE-10 stays closed).

---

## 6. A2-DG-06 — Case-C consent semantics (frozen)

**Creating a `PurchaseIntentDecisionRequest` from already-finalized, already-collected facts is INTERNAL PROCESSING, never new participant collection.** Therefore:
- No current-consent read is performed for `decideForPurchaseIntent` / DecisionRequest creation / binding repair.
- **Withdrawal ≠ `PurchaseIntentInvalidation`.** They are distinct facts. A later withdrawal does not block Case C; an explicit `PurchaseIntentInvalidation` **does**.
- Case C requires: finalized intent; no explicit invalidation; the exact pinned finalized context + eligibility-profile versions; the exact pinned input authorities. It requires **no** A1 authorization and reads **no** consent facts.

All wording of the form `consent@collection (NEW)` for DecisionRequest/Case C is removed from every table (§21/§31). The decision service holds **no** consent-read capability (§7.2/§46); an AST test proves `services/study-intent-decision.ts` cannot import `readConsentAuthorizationFacts` (§50 DG-06).

---

## 7. A2-DG-05 — Binding + verification (cross-wiring structurally impossible)

```
PurchaseIntentDecisionBinding {
  id                 PK UUID
  decisionRequestId  UNIQUE FK → PurchaseIntentDecisionRequest RESTRICT
  snapshotId         UNIQUE FK → decision_snapshot(id) (M3.5A) RESTRICT
  boundAt            TIMESTAMPTZ trusted
}   -- append-only
```
The binding carries **no free-standing `intentId`.** The intent is reached only via `decisionRequestId → DecisionRequest.intentId`. Cross-wiring (Intent A / Request B / Snapshot B claimed as A's) is therefore **structurally impossible**: a binding names exactly one request, whose intent is fixed by construction. One intent → one request (`UNIQUE(intentId)` on request) → one binding (`UNIQUE(decisionRequestId)`); one snapshot → one binding (`UNIQUE(snapshotId)`). No `intentId` scalar is shared across two relations, so Prisma 6.19.3 validates cleanly (§20). Immutable; no public attach.

### 7.1 `verifyPurchaseIntentDecisionBinding(binding, requestedIntentId)` — normative; Case A MUST call it before returning any historical result
1. load `request = DecisionRequest(binding.decisionRequestId)`; assert `request.intentId === requestedIntentId`.
2. `verifyPurchaseIntentDecisionRequest(request)` passes (§19).
3. load `snapshot = findSnapshotById(binding.snapshotId)` (its stamped versions must be recognized, §16).
4. assert `binding.snapshotId === snapshot.id`.
5. exact snapshot coherence §17 passes for `(request, snapshot)`.
No cross-wired or incoherent binding validates. (The former V3 checks "binding.intentId == …" collapse because there is no `binding.intentId`.)

### 7.2 Additive A1 read facade + capability separation
`readConsentAuthorizationFacts({ assignmentId }): Promise<ConsentEventFact[]>` (READ ONLY) added to sanctioned `services/study-consent.ts` (reusing internal `ConsentStore.listEvents`); no raw repo exposed; no A1 semantic change. **Importable ONLY by the participant scientific-write service `services/study-purchase-intent.ts`** (which creates NEW collected facts). It is **NOT** importable by `services/study-intent-decision.ts` (§6/§46). Own-assignment enforcement is the participant caller's responsibility (via the trusted context).

---

## 8. A2-DG-03 — entrySource as trusted server provenance

Participant-facing callers MUST NOT choose authoritative `entrySource`. One trusted authority resolves it server-side and freezes it on the capture token.

- **Resolver interface (authorized minimal A2 capture-provenance resolver):** `resolveTrustedEntrySource(trustedServerEvidence) → entrySource`, where `trustedServerEvidence` is server-observed request-route / session-token-kind / referrer-classification — **never** the participant request body. `entrySource ∈ { DIRECT, CONTENT, SHARED_LINK, RESEARCH_LINK, AUTH_LINK, SAVED_DECISION, OTHER }` (Phase 0A §29). For each category the resolver defines what trusted server evidence assigns it (e.g. `RESEARCH_LINK` ⇐ a research-issued capture route/token; `AUTH_LINK` ⇐ an auth-message capture route; `DIRECT` ⇐ no attributable referrer; `OTHER` ⇐ unclassifiable). If the current app cannot yet classify a route, the resolver returns `OTHER` — it never trusts the body. This is **trusted capture provenance**, explicitly NOT later B entry-source **adjudication/contamination conclusions** (§44).
- **Authority + immutability:** `entrySource` is set **only** at token issuance from the resolver, is immutable on the token, and is the single authority; `PurchaseIntent` derives it exclusively through its capture token (no duplicate disagreeing copy). It is stable across transport retries (it is the frozen token's).

### 8.1 Entry-source response-loss rule (frozen)
The FIRST durable token issuance for a given `(assignmentId, clientCorrelationNonce)` freezes `entrySource`. A same-nonce retry returns that historical token and its frozen `entrySource` **unchanged**, even if the retry's server evidence would resolve a different category. No silent overwrite; the nonce is the exact issuance domain identity, so the historical token wins (no typed conflict needed — issuance carries no other material). `entrySource` therefore cannot be mutated by a later request/session.

---

## 9. Purchase-signature context model (discriminated) — A2-DG-02 part 1

The accepted `PurchaseContext` has many optional fields that only make sense per signature family. A2 stores a **discriminated purchase signature** in the context version as one normalized JSON object validated by a versioned A2 context schema, plus lifted query columns — the DB/service mechanically prevents invalid mixed signatures (one discriminant).

```
PurchaseIntentContextVersion {
  id                 PK UUID
  intentId           FK → PurchaseIntent
  contextSeq         INT                          -- monotonic per intent, under the PurchaseIntent root lock
  contextCaptureKey                               -- client-held correlation (§13.2)
  contextSchemaVersion                            -- "pagamenos.a2-context.v1"
  merchantId                                       -- lifted (query)
  signatureKind      enum BILL|TICKETS|EXACT_ITEMS|NOMINAL_PACKAGE   -- lifted (query); discriminant
  intendedTransactionAt  TIMESTAMPTZ               -- participant-entered (DecideInput top-level field)
  purchaseSignatureJson  JSONB                     -- the exact normalized discriminated signature (authority)
  capturedAt         TIMESTAMPTZ trusted           -- scientific capture time (NOT resampled on alias, §24)
  recordedAt         TIMESTAMPTZ                   -- knowledge time
  UNIQUE(intentId, contextSeq)
  UNIQUE(intentId, contextCaptureKey)              -- exact context-command identity (A2-PRE-02)
}   -- append-only
```
`purchaseSignatureJson` (validated by the versioned A2 context schema; strict, unknown keys rejected):
```
{ schemaVersion, merchantId, channel?, branch?,
  signature:
    | { kind:'BILL',           wholeBillCentimos, foodCentimos?, nonAlcoholicBeverageCentimos?, purchaseDomain }
    | { kind:'TICKETS',        ticketUnitPriceCentimos, ticketCount, ticketClass }
    | { kind:'EXACT_ITEMS',    exactItems:[{itemKey, qty}] }        -- exact immutable basket content (§ DG-02/no-refs)
    | { kind:'NOMINAL_PACKAGE',nominalPackage:{ cashAcquisitionCostCentimos, nominalUnit } } }
```
Validation (versioned schema + DB): céntimos are integers ≥ 0; `qty` positive integers, unique `itemKey`; `ticketCount` positive integer; enums from the frozen token sets (`CHANNELS_V1`, `PURCHASE_DOMAINS_V1`, `NOMINAL_UNITS_V1`). **Mixed-signature prevention** is structural — a single `signature.kind` discriminant makes ticket fields on a BILL, or `exactItems`+`nominalPackage` together, unrepresentable. **Split coherence (A2 guard):** for `BILL`, if `foodCentimos` and `nonAlcoholicBeverageCentimos` are both present they are each ≥ 0 and `food + nonAlc ≤ wholeBillCentimos` (a coherence CHECK that cannot reject an engine-valid input). The exact basket lives in the JSON (no `basketRef`, no mutable reference — §8-of-task). Derivation to the flat `PurchaseContext` (§11) sets only the discriminant's fields.

Corrigible pre-finalization (new `contextCaptureKey` → new version); no append after finalization (`PurchaseIntentContextAfterFinalizationError`). Retry/alias matrix identical to §14.1-context (payload-compared on different-key alias; domain conflict on payload mismatch).

---

## 10. A2-DG-02 part 2 — EligibilityPortfolio authority (mandatory input)

The accepted engine requires a non-optional `EligibilityPortfolio`. A1 has no portfolio model. **A2 authorizes a new entity** (Option B: an append-only, assignment-scoped participant eligibility-profile version, pinned by finalization):
```
EligibilityProfileVersion {
  id                 PK UUID
  assignmentId       FK → ExperimentAssignment RESTRICT   -- trusted participant ownership
  profileSeq         INT                                   -- monotonic per assignment (under ExperimentAssignment lock, §4)
  profileCaptureKey                                        -- client-held correlation (§13.2 style)
  portfolioSchemaVersion                                   -- "pagamenos.a2-portfolio.v1"
  portfolioJson      JSONB                                 -- normalized EligibilityPortfolio (authority)
  capturedAt         TIMESTAMPTZ trusted
  recordedAt         TIMESTAMPTZ
  UNIQUE(assignmentId, profileSeq)
  UNIQUE(assignmentId, profileCaptureKey)
}   -- append-only
```
`portfolioJson` (strict versioned schema, unknown keys rejected): exactly `{ instruments:[{ family∈PROVIDER_FAMILIES_V1, network?∈{AMEX,VISA,MC}, tier?, memberships?:string[] }], privateStates?:Record<string,Tri>, declarations?:Record<string,Tri> }`, `Tri∈{YES,NO,UNKNOWN}`. **Privacy (enforced by the strict schema):** no PAN/card number, no CVV, no bank/account credentials, no transaction ingestion — `network` is a brand enum, not a card number; only YES/NO/UNKNOWN eligibility facts, tiers, and canonical membership tokens are permitted.

Properties: immutable/versioned historical fact; a NEW profile version is **new participant collection** (assignment lock + consent, §4); trusted participant ownership (own-assignment); **finalization pins the exact `eligibilityProfileVersionId`** (§ finalization); future profile changes never alter an existing DecisionRequest (pinned by version). Introduces **no** B/C evidence semantics (§44).

### 10.1 Portfolio retry / identity (§10-task)
Domain identity of one exact profile update = `contextCaptureKey`-style `profileCaptureKey` under `UNIQUE(assignmentId, profileCaptureKey)`; transport idempotency via `EligibilityProfileCommandReceipt` (`operationScope=ELIGIBILITY_PROFILE_APPEND_V1`, target FK `eligibilityProfileVersionId`, resultKind `APPENDED|PROFILE_ALIAS`); response-loss/alias identical to context (§14.1); append-only versioning; consent serialized on `ExperimentAssignment` (§4); request-hash = normalized `portfolioJson` + `profileCaptureKey` + assignment + trusted `{participantId}`. No mutable "current portfolio" — only pinned versions are ever read for a decision.

---

## 11. Exact DecideInput Construction Authority — A2-DG-02 core

Every accepted `DecideInput` field, with authority. No field omitted; no "etc./where available/as appropriate".

| DecideInput field | Accepted type | Req? | Authoritative persisted source | Trusted derivation at freeze | Freeze moment | Correction semantics | In frozen JSON + hash? |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| rules | RuleVersion[] | yes | accepted corpus (`loadCorpus().activeRules`) | complete active rule set for each required scope (§12); canonical order by (ruleId, version) | DecisionRequest freeze | none post-freeze (immutable) | yes |
| operationalStates | RuleOperationalState[] | yes | corpus `operationalStates` | the op-state for each included rule (match ruleId+version); canonical order by (ruleId, version) | freeze | immutable | yes |
| scopes | ComparisonScope[] | yes | corpus `scopes` | all merchant scopes RELEVANT to the derived context (`signatureRelevant`); canonical order by scopeId | freeze | immutable | yes |
| portfolio | EligibilityPortfolio | yes | pinned `EligibilityProfileVersion.portfolioJson` (§10) | parsed under `portfolioSchemaVersion`; instruments canonical-ordered; `privateStates`/`declarations` keys code-point sorted by the canonical serializer | freeze | new profile version pre-finalization only | yes |
| context | PurchaseContext | yes | finalized `PurchaseIntentContextVersion.purchaseSignatureJson` (§9) | flatten the discriminated signature to `PurchaseContext` fields (§11.1) | freeze | new context version pre-finalization only | yes |
| evaluatedAt | string instant | yes | — | trusted service sample at freeze (the decision instant) | freeze | immutable | yes |
| intendedTransactionAt | string instant | yes | finalized context version | copied verbatim (zone-qualified) | freeze | via new context version pre-finalization | yes |
| selectedScopeId | string? | optional | — | **OMITTED (fixed A2 Phase-0A policy, §12.1)** | freeze | n/a | absent (frozen policy) |
| holidayCalendar | string[]? | optional | trusted versioned Lima-holiday authority `LIMA_HOLIDAY_CALENDAR@holidayCalendarVersion` (§13-holiday) | resolved list snapshotted verbatim at freeze | freeze | immutable | yes (exact values) |
| baselineByScopeId | Record? | optional | — | **OMITTED (display-only penSaved; never a ranking key — §14-baseline)** | freeze | n/a | absent (frozen policy) |

### 11.1 Signature → PurchaseContext flattening (deterministic)
`merchantId`, `channel?`, `branch?` copied. Then by `signature.kind`: **BILL** → `{ wholeBillCentimos, foodCentimos?, nonAlcoholicBeverageCentimos?, purchaseDomain }`; **TICKETS** → `{ ticketUnitPriceCentimos, ticketCount, ticketClass }`; **EXACT_ITEMS** → `{ exactItems }`; **NOMINAL_PACKAGE** → `{ nominalPackage }`. All other `PurchaseContext` fields remain `undefined` (dropped by canonicalization).

### 11.2 The construction function
```
buildDecideInputFromFinalizedAuthorities({
  finalizedContextVersion, pinnedEligibilityProfileVersion, corpusSnapshot,
  holidayCalendar, evaluatedAt
}): DecideInput
```
Output MUST: (1) cover every field above; (2) be deterministic (fixed canonical ordering of rules/scopes/opstates/instruments); (3) validate under `engineInputV1Schema` (`ENGINE_INPUT_SCHEMA_VERSION`); (4) require no mutable/current external fact after it returns; (5) be persisted immediately into `PurchaseIntentDecisionRequest.exactValidatedDecideInputJson`. Implementation is mechanical.

---

## 12. Corpus → DecideInput transformation (deterministic)

Pure function of `(finalized immutable A2 authorities, accepted corpus snapshot at freeze)`. Steps:
1. `merchant = derivedContext.merchantId`.
2. `selectedScopeId` unset (§12.1) ⇒ `requiredScopes = corpusSnapshot.scopes.filter(s => s.merchantId === merchant && signatureRelevant(s.signature, derivedContext))` — **all** such scopes (a caller can never hide a relevant scope; the M3.5A provenance completeness check re-verifies this at execution).
3. `scopes = requiredScopes` sorted by `scopeId`.
4. `rules = corpusSnapshot.activeRules.filter(r => r.comparisonScopeRefs ∩ requiredScopeIds ≠ ∅)` sorted by `(ruleId, version)` — the complete active set for each required scope.
5. `operationalStates = for each included rule, its op-state (ruleId+version) from corpusSnapshot` sorted by `(ruleId, version)`.
6. provider metadata is carried inside each `RuleVersion` (`providerFamily`, `provenance`) verbatim — no separate projection.
7. `portfolio/context/evaluatedAt/intendedTransactionAt/holidayCalendar` per §11; `selectedScopeId`/`baselineByScopeId` omitted.

The exact output is persisted in the DecisionRequest; **a retry never re-runs this transformation** — it rehydrates the frozen JSON (§22). Canonical ordering makes `decideInputHash` stable.

### 12.1 `selectedScopeId` policy (frozen)
`selectedScopeId` is **always omitted (undefined)** by A2 in Phase 0A: A2 never preselects a scope; the engine evaluates all relevant scopes and may set `requiresScopeSelection` (recorded in the snapshot). Participant scope selection is not an A2 concern (a later B/UX matter, out of scope). This makes the required-scope set = "all relevant scopes for the merchant" (§12 step 2), deterministic.

### 12.2 `holidayCalendar` policy (frozen)
A2 resolves the holiday calendar from a trusted, versioned Lima-holiday authority `LIMA_HOLIDAY_CALENDAR` at a pinned `holidayCalendarVersion`, and snapshots the exact `string[]` (YYYY-MM-DD) into the frozen `DecideInput` (no external lookup at execution). If the accepted product later exposes a first-class holiday source, that becomes the authority; until then this versioned A2 constant is authorized. A construction test (§17-tests) asserts the exact frozen calendar values. (A non-empty explicit calendar is chosen over empty precisely because an empty calendar could silently alter `holidayPolicy` evaluation; freezing exact values keeps the decision deterministic and stable across redeploys.)

### 12.3 `baselineByScopeId` policy (frozen)
Omitted. Per the accepted engine, `baselineByScopeId` feeds only **display-only `penSaved`**, which is "explanation / VS3 / RIVSR only — NEVER a ranking key" (verified, `engine/types.ts`). It does not affect the decision/ranking, so A2 supplies nothing. This is distinct from C1/C2 `BaselineCorroboration` (a B/C evidence concept, out of scope). Omission is engine-legal (the field is optional).

### 12.4 Operational-state freeze
Operational states (publication/source-quality/availability, incl. `DYNAMIC_AVAILABILITY`/UNKNOWN advisories) are snapshotted **verbatim from the corpus snapshot at freeze** and never re-fetched on crash retry. UNKNOWN/dynamic availability is represented exactly as the corpus op-state carries it; the engine's advisory semantics are preserved because the exact op-state rows are frozen into the input.

---

## 13. Correlation-key & label contracts

**13.1 `clientCorrelationNonce`** — opaque, high-entropy (≥128-bit) random, formatted like the project's opaque keys; not PII; generated by the controlled client before the first `issueIntentCaptureKey`; persisted client-side until capture creation resolves; reused only for retries of that exact capture; a genuinely-new capture uses a new nonce. Issuance carries no material beyond `(assignment, nonce)`, so same `(assignment, nonce)` always returns the same token (never a conflict); materially-different initialization surfaces only at `createPurchaseIntent` (different `intentType` on the same token ⇒ `PurchaseIntentCaptureConflictError`, §5.2). No merchant/time heuristics.

**13.2 `contextCaptureKey` / `profileCaptureKey`** — opaque correlation values; client-persisted before the append; reused only for exact retry; a new correction/update uses a new key; field equality never defines identity. Same key + materially different payload ⇒ same transport key: idempotency conflict; different transport key: **domain conflict** (`PurchaseIntentContextConflictError` / `EligibilityProfileConflictError`), never alias.

**13.3 Historical label grammar (H05)** — `expectedEngineContractVersion`, `expectedCorpusVersion`, `expectedEngineInputSchemaVersion`, `holidayCalendarVersion` are stored as `String` (Postgres `TEXT`, matching the accepted M3.5A version columns which are unbounded `TEXT`); validated as: UTF-8, trimmed, non-empty, with a defensive service-level max of 128 chars (A2 service validation, not a DB narrowing that would diverge from the accepted TEXT columns). Self-integrity validates grammar only and **never** requires current-runtime equality (§19). `expectedEngineInputSchemaVersion` additionally must resolve to a retained versioned parser (§16), which is stronger than grammar.

---

## 14. A2-DG-04 — Complete context request hash

**Rule:** every persisted MATERIAL field of one context version participates in context-domain reconciliation and `requestHash`, unless it is an internally sampled/derived output (`id`, `contextSeq`, `capturedAt`, `recordedAt`). Semantically-unordered collections are canonicalized (code-point key sort; `exactItems` sorted by `itemKey`) before hashing.

| Context field | source | persisted? | material? | in requestHash? | in domain reconciliation? |
| :-- | :-- | :-- | :-- | :-- | :-- |
| contextCaptureKey | client correlation | yes | yes (identity) | yes | yes (`UNIQUE(intentId, contextCaptureKey)`) |
| contextSchemaVersion | A2 constant | yes | yes | yes | compared |
| merchantId | participant | yes | yes | yes | compared |
| signatureKind | derived from signature | yes | yes | yes | compared |
| intendedTransactionAt | participant | yes | yes | yes | compared |
| purchaseSignatureJson (incl. channel, branch, wholeBill/food/nonAlc, ticket*, exactItems, purchaseDomain, nominalPackage) | participant | yes | yes | yes (canonicalized) | compared (payload equality) |
| contextSeq / capturedAt / recordedAt | internal | yes | no (sampled/derived) | no | no |

The former V3 `locationRef` no longer exists; its role is the accepted `branch`, which sits inside `purchaseSignatureJson` and is fully hashed. **Required property/table-driven test:** for every persisted material field F, holding `idempotencyKey` and `contextCaptureKey` fixed and changing only F ⇒ `requestHash` changes ⇒ idempotency/domain conflict (§50 DG-04). Server-derived material fields (if any) participate in reconciliation using their **trusted resolved value** (§14.1).

### 14.1 Trusted server-derived fields
If a context/portfolio field is server-derived rather than participant-authored, and changing it changes the durable scientific fact or the eventual `DecideInput`, it MUST be part of exact domain reconciliation; the transport `requestHash` incorporates the **trusted resolved value**, not raw request input, so a retry under changed server context never silently acknowledges a different scientific fact. (In V4 the only server-derived capture field is `entrySource`, which lives on the immutable token and is bound via the create hash's token identity, §37.)

---

## 15. M3.5A idempotency identity; DecisionRequest

`m3_5aIdempotencyKey = "pagamenos:study-intent-decision-idem:v1:" + PurchaseIntent.id`; `businessDecisionKey = "pagamenos:study-intent-decision:v1:" + PurchaseIntent.id` (§ closes R35R-04). One deterministic key per intent ⇒ M3.5A's alias path is never exercised; exactly one `(businessDecisionKey, m3_5aIdempotencyKey)` pairing per intent.

```
PurchaseIntentDecisionRequest {
  id                             PK UUID
  intentId                       UNIQUE FK → PurchaseIntent
  finalizationId                 UNIQUE FK → PurchaseIntentFinalization
  decisionRequestSchemaVersion   -- "pagamenos.intent-decision-request.v1"
  exactValidatedDecideInputJson  JSONB                 -- normalized validated DecideInput (§13-of-task semantic value)
  decideInputHash                -- SHA-256(canonical(...)) == M3.5A inputHash/requestHash
  expectedEngineInputSchemaVersion / expectedEngineContractVersion / expectedCorpusVersion   -- pins (§16)
  holidayCalendarVersion         -- pin for the frozen calendar (§12.2)
  businessDecisionKey  UNIQUE ; m3_5aIdempotencyKey UNIQUE
  createdAt            TIMESTAMPTZ trusted
  @@unique([intentId, id])       -- lets a composite relation target it if ever needed; harmless (§20)
}   -- append-only
```
JSONB is a normalized semantic value (not preserved text); the frozen invariant is that it reparses (versioned parser, §22) to the exact validated `DecideInput` and re-hashes to `decideInputHash`.

---

## 16. Version pinning, loadability & parser retention

Three separated concerns (unchanged in intent from V3, corrected in V4):
- **(a) Request self-integrity (§19):** engine/corpus/holiday pins validated as opaque well-formed labels (no current support required); `expectedEngineInputSchemaVersion` must resolve to a retained parser.
- **(b) Current-execution compatibility (fresh run only):** `assertCurrentRuntimeMatchesDecisionRequest` requires current `ENGINE_INPUT_SCHEMA_VERSION` **and** `ENGINE_CONTRACT_VERSION` **and** `corpusId` == pins, else fail closed (`PurchaseIntentSemanticDriftError`) — no `decideAndPersist` call, no snapshot written.
- **(c) Historical-snapshot coherence (§17):** a bound snapshot's stamped `engineContractVersion`/`corpusVersion`/`engineInputSchemaVersion` == pins, found or fresh.

**Retention (verified loadability, §3.3):** because M3.5A pins snapshot version fields with `z.literal(current)`, a stored snapshot loads only while the build recognizes its stamps. Obligations: deployments retain the input parser for any input-schema pinned by a still-repairable request (else fail closed, `PurchaseIntentUnsupportedInputSchemaError`); and inherit M3.5A's documented version-dispatch retention so a still-bindable snapshot remains loadable — otherwise `findExactHistoricalDecision` fails closed (`…HistoricalSnapshotUnloadableError`), never silent. The common redeploy (bug fix / new `gitSha`, no version bump) is unaffected.

### 16.1 Semantic-pin table
| Authority | self-integrity | current==pins before fresh run | historical stamp==pins |
| :-- | :-- | :-- | :-- |
| ENGINE_INPUT_SCHEMA_VERSION | retained parser | **YES** | **YES** |
| ENGINE_CONTRACT_VERSION | well-formed label | **YES** | **YES** |
| corpusVersion (corpusId) | well-formed label | **YES** | **YES** |
| holidayCalendarVersion | well-formed label | n/a (values frozen in input) | n/a (values in input, hashed) |
| canonicalization | frozen/non-versioned | n/a | n/a (hash proves) |
| gitSha / buildId | not pinned | no | no |
| ENGINE_OUTPUT_SCHEMA_VERSION / SNAPSHOT_SCHEMA_VERSION | not pinned by A2 | no (affects loadability §16) | recorded; M3.5A verifies on load |

---

## 17. Exact snapshot coherence (unified predicate)

For request `R`, snapshot `S`, ALL must hold: (1) `S.businessDecisionKey==R.businessDecisionKey`; (2) receipt exists for `(DECISION_PERSIST_V1, R.m3_5aIdempotencyKey)`; (3) `receipt.decisionSnapshotId==S.id`; (4) `receipt.requestHash==R.decideInputHash`; (5) `S.inputHash==R.decideInputHash`; (6) `S.engineContractVersion==R.expectedEngineContractVersion`; (7) `S.corpusVersion==R.expectedCorpusVersion`; (8) `S.engineInputSchemaVersion==R.expectedEngineInputSchemaVersion`; (9) `verifyHistoricalSnapshot(S)` passes (load requires stamps recognized, §16). Current runtime need not equal `S`'s stamps when `S` exists. Same merchant/similar input/amount/time never suffices. Typed conflicts: `…BindingBusinessKeyMismatchError`(1), `…BindingReceiptMismatchError`(2/3/4), `…BindingInputHashMismatchError`(5), `…BindingSemanticMismatchError`(6/7/8), M3.5A integrity/coherence/unloadable(9).

---

## 18. findExactHistoricalDecision (owns the full predicate)

```
findExactHistoricalDecision({ businessDecisionKey, idempotencyKey, inputHash,
  expectedEngineContractVersion, expectedCorpusVersion, expectedEngineInputSchemaVersion })
  → { kind:'NONE' } | { kind:'FOUND'; snapshot } | throw typed CONFLICT
```
READ ONLY (no engine/corpus/provider/build; no write). NONE iff no receipt AND no business-key snapshot. Else verify clauses 1–9 (§17): a load that throws for unrecognized stamps ⇒ `…HistoricalSnapshotUnloadableError` (CONFLICT, never NONE); receipt→missing snapshot ⇒ `…ReceiptDanglingError`; business-key snapshot without receipt ⇒ `…SnapshotWithoutReceiptError`; receipt present with a business-key snapshot of different `inputHash` ⇒ `…BusinessKeyConflictError`; stamp≠pins ⇒ `…HistoricalSemanticMismatchError`. Added additively in `services/decide-and-persist.ts`; not on the public barrel; importable only by `services/study-intent-decision.ts` (§46).

---

## 19. verifyPurchaseIntentDecisionRequest (self-integrity; fail closed)

1 intent exists; 2 finalization exists + same intent; 3 finalization's `contextVersionId` **and** `eligibilityProfileVersionId` exist + same intent/assignment; 4 `deriveBusinessDecisionKey(intentId)==stored`; 5 `deriveM3_5aIdempotencyKey(intentId)==stored`; 6 `decisionRequestSchemaVersion` supported; 7 `expectedEngineInputSchemaVersion` selects a retained parser (else fail closed); 8 `exactValidatedDecideInputJson` parses under that parser; 9 `canonicalHash(parsed)==decideInputHash`; 10 `expectedEngineContractVersion`/`expectedCorpusVersion`/`holidayCalendarVersion` are well-formed frozen labels (§13.3); 11 **do NOT require (10) to equal current runtime** (A2-DG-09-lineage preserved). Cross-table checks 1–3 under a read transaction; 4–10 pure. The three concerns (self-integrity / current-execution / historical-snapshot) stay separate.

---

## 20. Boundary + Prisma implementability (H01: Prisma 6.19.3)

Additive-only. Virtual Prisma back-relations (no SQL column, no accepted stored/migration/economic change), required by Prisma 6.19.3's opposite-relation rule: on `ExperimentAssignment` (A1) — `purchaseIntentCaptureTokens` and `eligibilityProfileVersions`; on `DecisionSnapshot` (M3.5A) — `purchaseIntentDecisionBinding`. FK scalars (`captureTokenId`, `assignmentId`, `decisionRequestId`, `snapshotId`, `intentId`, `finalizationId`, `contextVersionId`, `eligibilityProfileVersionId`) live on A2 child tables. Each A2→A2/M3.5A relation uses a **single scalar** per relation (no scalar shared across two relations), so Prisma 6.19.3 validates; the binding's cross-wiring-free shape (§7) is the key example. `findExactHistoricalDecision` is the only M3.5A change (additive read fn). `prisma validate` + the migration↔schema diff (`pnpm db:migrate:check`) stay clean. "M3.5A/A1 untouched" = no persisted/stored/economic/migration mutation; a virtual relation field is not a mutation (SCI-A2-13). No `A2 DESIGN BLOCKER`.

---

## 21. Crash-Repair Saga (state-sensitive; Case C consent-independent — A2-DG-06)

`decideForPurchaseIntent({ intentId })` — trusted internal op; no caller input/engine/corpus/key/snapshotId; **no consent read** (§6).

- **Case A — binding exists:** `verifyPurchaseIntentDecisionBinding(binding, intentId)` (§7.1) → return `S`. No engine call, regardless of later withdrawal/invalidation.
- **Case B — request exists, no binding:** `verifyPurchaseIntentDecisionRequest` (§19); `findExactHistoricalDecision` (§18): **FOUND** → §17 → bind → return; **NONE** → `assertCurrentRuntimeMatchesDecisionRequest` (§16b; fail closed on drift) → rehydrate (§22) → `decideAndPersist` → §17 → bind → return; **CONFLICT** → fail closed. No consent read.
- **Case C — request absent:** under the `PurchaseIntent` **root lock only** (not new collection, so no assignment lock for consent; §42): require **finalized AND no explicit `PurchaseIntentInvalidation`** (withdrawal alone does NOT block); load the exact pinned `contextVersion` + `eligibilityProfileVersion` (immutable); freeze/create one DecisionRequest (§40) → COMMIT → continue at Case B. **No current-consent read.**

### 21.1 Invalidation/withdrawal × decision
| State | explicit invalidation? | New request? | Consent read? | Result |
| :-- | :-- | :-- | :-- | :-- |
| not finalized | any | no | no | `PurchaseIntentNotFinalizedError` |
| finalized, no request, participant withdrawn, not invalidated | no | **yes (Case C)** | **no** | request created → decision (internal processing) |
| finalized, no request, explicitly invalidated | yes | no | no | `PurchaseIntentInvalidatedError` |
| request, no snapshot | — | n/a | no | complete internally (finder → gate → decide → bind) |
| request, snapshot, no binding | — | n/a | no | bind (FOUND), engine not rerun |
| binding exists | — | n/a | no | return historical binding (verified) |

---

## 22. Concurrency / locking + rehydration

Global order `ExperimentAssignment ≺ PurchaseIntent root (UUID asc) ≺ children` (§4). NEW-fact participant writes (create/context/eligibility-profile/finalize/invalidate) take the assignment lock first (§4). **Case C** (DecisionRequest freeze) is internal, not new collection, and takes the **root lock only** — it serializes against invalidation on the root (invalidation takes assignment→root; Case C takes root; they contend on the root; no inversion because Case C never grabs the assignment while holding the root). Invalidation lineage/cycle walk holds `ExperimentAssignment FOR UPDATE` (§23). `decideAndPersist` runs outside any A2 lock. Binding is a short transaction on `UNIQUE(decisionRequestId)`/`UNIQUE(snapshotId)` + exact P2002 discrimination (§26).

**Rehydration (§22.2, no direct cast):** 1 load request; 2 `verifyPurchaseIntentDecisionRequest`; 3 dispatch the versioned parser by `expectedEngineInputSchemaVersion`; 4 typed `DecideInput`; 5 recompute canonical hash; 6 compare to `decideInputHash`; 7 only then `decideAndPersist`. Never cast JSONB directly; never reconstruct from current context/portfolio/corpus.

---

## 23. Invalidation cycle prevention

Serialize on `ExperimentAssignment FOR UPDATE` (all replacements share one assignment, resolved via each intent's capture token). Under the lock: apply §7 replay/alias for an already-durable invalidation; assert invalidated intent belongs to A and not already invalidated (`UNIQUE(invalidatedIntentId)`); if `replacementIntentId` present assert its assignment (via its token) == A, `≠ invalidatedIntentId` (CHECK), and walk the existing replacement lineage rejecting any edge that makes `invalidatedIntentId` reachable from `replacementIntentId` (`PurchaseIntentInvalidationCycleError`); as a NEW fact, sample time + consent (§4); append invalidation + receipt. Covers `A→A`, `A→B`+`B→A`, `A→B→C`+`C→A`, concurrent cycles (serialized). `PurchaseIntentInvalidation { id, invalidatedIntentId UNIQUE FK, replacementIntentId? FK, invalidatedAt, reasonCode? enum, CHECK(replacement<>invalidated) }`, append-only. Intent-replacement history only (§44).

---

## 24. Receipts + resultKind (alias never resamples capture time)

Strong-FK families for externally-triggered writes that create a fact: `operationScope`, transport `idempotencyKey`, `requestHash` (§25), concrete target FK, `createdAt`, `UNIQUE(operationScope, idempotencyKey)`, append-only.

| Receipt | operationScope | Target FK | resultKind |
| :-- | :-- | :-- | :-- |
| PurchaseIntentCreateReceipt | INTENT_CREATE_V1 | intentId | CREATED · CAPTURE_ALIAS |
| PurchaseIntentContextCommandReceipt | INTENT_CONTEXT_APPEND_V1 | contextVersionId | APPENDED · CONTEXT_ALIAS |
| EligibilityProfileCommandReceipt | ELIGIBILITY_PROFILE_APPEND_V1 | eligibilityProfileVersionId | APPENDED · PROFILE_ALIAS |
| PurchaseIntentFinalizationReceipt | INTENT_FINALIZE_V1 | finalizationId | FINALIZED · FINALIZE_ALIAS |
| PurchaseIntentInvalidationReceipt | INTENT_INVALIDATE_V1 | invalidationId | INVALIDATED · INVALIDATE_ALIAS |

`resultKind` = durable effect of the command in THIS receipt row. A same-key replay creates **no** new receipt (returns the existing + transient `replayed:true`). A different-key domain alias creates a new receipt with the `*_ALIAS` value and **never resamples** the original fact's `capturedAt`/`initiatedAt`; the alias receipt's `createdAt` is transport/audit metadata, not scientific capture time. `PurchaseIntentCaptureToken` issuance and internal `PurchaseIntentDecisionRequest`/`PurchaseIntentDecisionBinding` have **no** transport receipt (idempotency = their UNIQUE constraints).

---

## 25. Request-hash completeness matrices (closes R35R-15 A2)

Every persisted material field participates; internally sampled/derived fields excluded. `op` discriminator + trusted `{participantId}` context always included.

- **capture-token issuance (domain identity, no receipt):** `(assignmentId, clientCorrelationNonce)` UNIQUE. `entrySource` and `intentCaptureKey` are server-derived outputs, not issuance identity.
- **createPurchaseIntent:** `intentCaptureKey` (⇒ immutable token ⇒ assignment + entrySource), `intentType`.
- **appendPurchaseIntentContext:** `intentId`, `contextCaptureKey`, `contextSchemaVersion`, `merchantId`, `signatureKind`, `intendedTransactionAt`, canonicalized `purchaseSignatureJson`.
- **appendEligibilityProfile:** `assignmentId`, `profileCaptureKey`, `portfolioSchemaVersion`, canonicalized `portfolioJson`.
- **finalizePurchaseIntent:** `intentId`, `contextVersionId`, `eligibilityProfileVersionId`.
- **invalidatePurchaseIntent:** `intentId`, `replacementIntentId?`, `reasonCode?`.

For each, a **mutation test** (§50/§51): changing any one material field flips the hash ⇒ conflict; collection-typed fields normalized first. `entrySource` is not redundantly hashed on create because the token identity already fixes an immutable `entrySource` (§37); if included as defense-in-depth it uses the trusted resolved value, never body input.

---

## 26. P2002 / constraint discrimination (H02) + NONE-vs-CONFLICT

On any Prisma 6.19.3 `P2002`, inspect `e.meta?.target` (the violated constraint/columns) and reconcile ONLY the expected constraint; any other unique violation **fails closed** (typed invariant error). Per service:

| Service | Expected constraint on P2002 | Reconciliation | Any other unique |
| :-- | :-- | :-- | :-- |
| issueIntentCaptureKey | `(assignmentId, clientCorrelationNonce)` | return existing token/key | `intentCaptureKey` (server UUID) → invariant (never expected) |
| createPurchaseIntent | `captureTokenId` | load intent by token; verify material (§5.2) | fail closed |
| appendPurchaseIntentContext | `(intentId, contextCaptureKey)` | compare payload → alias / domain conflict | `(intentId, contextSeq)` → internal seq retry |
| appendEligibilityProfile | `(assignmentId, profileCaptureKey)` | compare payload → alias / domain conflict | `(assignmentId, profileSeq)` → seq retry |
| finalizePurchaseIntent | `intentId` | compare pinned versions → replay / conflict | fail closed |
| receipts | `(operationScope, idempotencyKey)` | replay | fail closed |
| DecisionRequest | `intentId` | reconcile to existing | `businessDecisionKey`/`m3_5aIdempotencyKey` also expected-coherent; else fail closed |
| Binding | `decisionRequestId` or `snapshotId` | load by each; `verifyPurchaseIntentDecisionBinding`; accept only if all resolve to the exact same binding | mismatch (intent already bound elsewhere / snapshot already bound / request bound inconsistently) → typed binding conflict |

Real-PostgreSQL or Prisma-error-metadata tests required (§51 H02). **NONE vs CONFLICT** for the finder is normative (§18); corrupted/partial/unloadable state is never NONE.

---

## 27. Trusted capability matrix

| Capability | Operation | Allowed importer | Forbidden |
| :-- | :-- | :-- | :-- |
| PurchaseIntentCapture | issueIntentCaptureKey, createPurchaseIntent, appendPurchaseIntentContext, appendEligibilityProfile | `services/study-purchase-intent.ts` | app/participant raw; other services |
| PurchaseIntentFinalization | finalizePurchaseIntent | `services/study-purchase-intent.ts` | same |
| PurchaseIntentAdministration | invalidatePurchaseIntent | `services/study-purchase-intent.ts` | same |
| PurchaseIntentDecision | decideForPurchaseIntent | `services/study-intent-decision.ts` | same; **no consent-facts import** |
| HistoricalDecisionLookup | findExactHistoricalDecision | defined in `services/decide-and-persist.ts` → imported ONLY by `services/study-intent-decision.ts` | everything else |
| A1-ConsentFactsRead | readConsentAuthorizationFacts | defined in `services/study-consent.ts` → imported ONLY by `services/study-purchase-intent.ts` | **`services/study-intent-decision.ts`** and all others (A2-DG-06) |
| TrustedEntrySourceResolve | resolveTrustedEntrySource | the trusted capture-provenance resolver module → imported ONLY by `services/study-purchase-intent.ts` (issuance path) | participant/app; other services |

`study-purchase-intent.ts` may reach: own-assignment authority, `readConsentAuthorizationFacts`, the A2 participant-write repositories, the entry-source resolver. `study-intent-decision.ts` may reach: the A2 decision-request/binding repository, `findExactHistoricalDecision`, read-only frozen A2 authorities, corpus authority to build a NEW DecisionRequest — but **NOT** consent facts, participant scientific-mutation APIs, or binding attach outside its sanctioned repo. Enforcement = extend `RAW_WRITE_MODULES` (`db/purchase-intent-repository`, `db/purchase-intent-decision-repository`), the per-repository owner-allowlist map, ESLint groups, sanctioned-impl exemptions; add the AST test that `study-intent-decision.ts` cannot import the consent-facts facade.

---

## 28. Database invariant matrix

| Invariant | Enforcement |
| :-- | :-- |
| decision identity | PurchaseIntent PK UUID |
| token issuance idempotency | UNIQUE(assignmentId, clientCorrelationNonce) (no receipt) |
| capture-key uniqueness | UNIQUE(intentCaptureKey) |
| **intent↔token structural coherence** | captureTokenId UNIQUE FK RESTRICT (no separate intent assignment) |
| entrySource trusted/immutable | resolver-only at issuance; token immutable; intent derives via token (§8) |
| intentType domain | CHECK enum |
| context identity | UNIQUE(intentId, contextSeq) |
| **context-command identity** | UNIQUE(intentId, contextCaptureKey) + payload reconciliation |
| **signature well-formedness / no mixed signatures** | versioned A2 context schema (discriminant) + céntimos/qty CHECKs + BILL split coherence CHECK |
| context/profile monotonic seq | parent lock (root / ExperimentAssignment) + append-only trigger |
| **eligibility-profile identity** | UNIQUE(assignmentId, profileSeq); UNIQUE(assignmentId, profileCaptureKey); strict portfolio schema (privacy) |
| finalization pins context+profile of same intent/assignment | UNIQUE(intentId) + triggers (ctxVersion.intentId==intentId; profile.assignmentId==intent's assignment) |
| one DecisionRequest per intent | UNIQUE(intentId) + root lock |
| request self-integrity | verifyPurchaseIntentDecisionRequest (§19) |
| **exact 1:1 binding, no cross-wiring** | UNIQUE(decisionRequestId)+UNIQUE(snapshotId) (no binding.intentId) + verifyPurchaseIntentDecisionBinding (§7) |
| snapshot never deleted | binding.snapshotId FK RESTRICT + M3.5A trigger |
| invalidated at most once / no self / same assignment / acyclic | UNIQUE(invalidatedIntentId); CHECK; trigger; §23 walk under assignment lock |
| **NEW-fact ⇄ withdrawal serialization** | ExperimentAssignment FOR UPDATE before collection-time sample + consent (§4) |
| new-fact vs replay/alias consent | service ordering §4 (replay/alias → no consent) |
| receipts | UNIQUE(operationScope, idempotencyKey) + FK + enum |
| capability / own-assignment | AST owner-map + ESLint + trusted context (§27) |
| corpus content integrity | release digest guard (§32/H03) |

No illegal cross-table CHECK; cross-table rules are triggers/transactions/service verification.

---

## 29. Entity table (final)

| Entity | PK | Domain identity | FKs | UNIQUE | CHECK | Consent (new fact) | Retry identity | Capability |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| PurchaseIntentCaptureToken | id | intentCaptureKey | assignmentId→ExperimentAssignment | intentCaptureKey; (assignmentId, clientCorrelationNonce) | — | no (infra, §9) | UNIQUE(assignmentId, nonce) | PurchaseIntentCapture |
| PurchaseIntent | id | id | captureTokenId→CaptureToken | captureTokenId | intentType∈enum | yes | UNIQUE(captureTokenId) + CreateReceipt | PurchaseIntentCapture |
| PurchaseIntentContextVersion | id | (intentId, contextSeq) | intentId→PurchaseIntent | (intentId, contextSeq); (intentId, contextCaptureKey) | signature schema; céntimos≥0; BILL split | yes | contextCaptureKey + receipt | PurchaseIntentCapture |
| EligibilityProfileVersion | id | (assignmentId, profileSeq) | assignmentId→ExperimentAssignment | (assignmentId, profileSeq); (assignmentId, profileCaptureKey) | strict portfolio schema (privacy) | yes | profileCaptureKey + receipt | PurchaseIntentCapture |
| PurchaseIntentFinalization | id | intentId | intentId→PurchaseIntent; contextVersionId→ContextVersion; eligibilityProfileVersionId→EligibilityProfileVersion | intentId | — | yes | contextVersionId+eligibilityProfileVersionId + receipt | PurchaseIntentFinalization |
| PurchaseIntentInvalidation | id | invalidatedIntentId | invalidatedIntentId→PurchaseIntent; replacementIntentId?→PurchaseIntent | invalidatedIntentId | replacement<>invalidated | yes | receipt | PurchaseIntentAdministration |
| PurchaseIntentDecisionRequest | id | intentId | intentId→PurchaseIntent; finalizationId→Finalization | intentId; finalizationId; businessDecisionKey; m3_5aIdempotencyKey; (intentId,id) | — | no (internal) | deterministic identity | PurchaseIntentDecision |
| PurchaseIntentDecisionBinding | id | decisionRequestId | decisionRequestId→Request; snapshotId→decision_snapshot | decisionRequestId; snapshotId | — | no (internal) | deterministic + verify (§7) | PurchaseIntentDecision |
| 5 receipt families | id | (operationScope, idempotencyKey) | concrete target | (operationScope, idempotencyKey) | resultKind∈enum | — | — | owning service |

Virtual back-relations (no SQL column, §20): `ExperimentAssignment.{purchaseIntentCaptureTokens, eligibilityProfileVersions}`, `DecisionSnapshot.purchaseIntentDecisionBinding`. No B/C entities.

---

## 30. Service table (final)

| Operation | Caller | Pub/Int | Material input | Derived | Lock | Receipt | New-collection consent? |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| issueIntentCaptureKey | Capture (trusted ctx) | public | assignmentId(own), clientCorrelationNonce | intentCaptureKey, entrySource (resolver), issuedAt | UNIQUE guard | — | **no** (§9) |
| createPurchaseIntent | Capture | public | intentCaptureKey, intentType | captureTokenId, initiatedAt | Assignment FOR UPDATE → root guard (§4) | CreateReceipt | **yes** (new)/no (replay/alias) |
| appendPurchaseIntentContext | Capture | public | intentId(own), contextCaptureKey, signature (merchant, kind, fields, intendedTransactionAt) | contextSeq, capturedAt, recordedAt | Assignment FOR UPDATE → root | ContextCommandReceipt | **yes**/no |
| appendEligibilityProfile | Capture | public | assignmentId(own), profileCaptureKey, portfolioJson | profileSeq, capturedAt, recordedAt | Assignment FOR UPDATE | EligibilityProfileCommandReceipt | **yes**/no |
| finalizePurchaseIntent | Finalization | public | intentId(own), contextVersionId, eligibilityProfileVersionId | finalizedAt | Assignment FOR UPDATE → root | FinalizationReceipt | **yes**/no |
| invalidatePurchaseIntent | Administration | public | intentId(own), replacementIntentId?, reasonCode? | invalidatedAt | Assignment FOR UPDATE → root(s) (§23) | InvalidationReceipt | **yes**/no |
| decideForPurchaseIntent | Decision (internal) | internal | intentId | businessDecisionKey, idem key, frozen input, pins | root lock only (Case C) | — | **no** (internal, §6) |
| findExactHistoricalDecision | HistoricalDecisionLookup | internal (M3.5A facade) | businessKey, idem key, inputHash, 3 pins | — | read-only | — | n/a |
| readConsentAuthorizationFacts | A1-ConsentFactsRead | internal (A1 facade) | assignmentId | — | read-only | — | n/a |
| resolveTrustedEntrySource | TrustedEntrySourceResolve | internal | trusted server evidence | entrySource | — | — | n/a |

**No public** attachSnapshot / bindSnapshot / createDecisionRequest(raw input) / findSnapshot(raw query) / raw DecideInput / arbitrary rules|corpus|engine version | snapshotId.

---

## 31. Crash-saga table

| Durable at entry | invalidated? | Checks | Finder | Engine? | current==pins(3)? | historical stamp==pins? | New collection? | Result |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| finalized, no request, withdrawn, not invalidated | no | finalized; no invalidation | no (Case C) | not yet | — | — | **no** (internal) | freeze request → Case B |
| finalized, no request, invalidated | yes | invalidation present | no | no | — | — | no | `PurchaseIntentInvalidatedError` |
| request, no snapshot | — | verify request | yes (NONE) | yes iff NONE | **yes** else fail closed | n/a | no | decideAndPersist → §17 → bind |
| request, snapshot, no binding | — | verify request; FOUND | yes | no | no | **yes** | no | bind; engine not rerun |
| request, snapshot, binding | — | verifyBinding (§7) | no | no | no | yes | no | return existing binding |
| stamps≠pins / unloadable | — | finder | — | no | — | mismatch/unloadable | no | CONFLICT |
| request, no snapshot, drift(3) | — | finder NONE | yes | **no** | mismatch | — | no | fail closed |
| build-only change | — | finder NONE | yes | yes | current==pins | n/a | no | completes |
| NEW context/create/finalize/invalidate after withdrawal | — | §4 assignment lock sees withdrawal | — | — | — | — | **would be new** | **REJECT** |

---

## 32. H03 — Corpus content-integrity release guard

**Threat closed:** a fresh execution under a corpus whose *decision-relevant content changed without the `corpusId` label changing.* Note the frozen input + M3.5A provenance already protect the concrete inputs — at fresh execution the M3.5A provenance verifier canonical-hashes each frozen rule/scope against the current corpus (authenticity) and enforces per-scope completeness, so a mutated/added/removed decision-relevant rule for this input is already caught (`CorpusProvenanceError`). The residual is purely **label integrity**: two different corpus contents sharing one `corpusId`.

**Guard (Option B, mechanical; smallest safe):** a deterministic build/CI test computes `corpusContentDigest = canonicalHash(decision-relevant projection of loadCorpus())` — the projection = `{ scopes, activeRules, operationalStates }` (the decision-relevant content), canonicalized — and asserts a pinned `expectedCorpusContentDigest` for the current `corpusId`. Any decision-relevant content change flips the digest and **fails the release/test guard** until `corpusId` is bumped and the pin updated. This is an A2-adjacent build assertion — **no** M3.5A semantic mutation, **no** redundant runtime complexity (A2 does not persist the digest; the frozen `decideInputHash` + M3.5A membership already bind the runtime inputs). It closes only corpus semantic-version integrity, not source-rights/freshness.

---

## 33. H04 — Unused token material

A `PurchaseIntentCaptureToken` with no `PurchaseIntent` freezes `assignmentId`, trusted `entrySource`, and capture identity — but **not** participant initiation material (`intentType`). The **first successfully committed `PurchaseIntent` on the token** establishes `intentType`. Before any intent exists, a later create attempt on the same token may carry a different `intentType` (no scientific root existed, so nothing is contradicted). After a root exists, a create with different `intentType` → `PurchaseIntentCaptureConflictError` (§5.2, `UNIQUE(captureTokenId)` reconciliation). Stated exactly.

---

## 34. Timestamps — finalization/invalidation event==knowledge

`finalizedAt` and `invalidatedAt` are immediate trusted service events; they cannot be participant-backdated in A2, so **event time == system knowledge/recording time** — no separate `recordedAt` is needed for finalization/invalidation. Context and eligibility-profile retain distinct `capturedAt`/`recordedAt` (later C2 may need the event/knowledge distinction). This does not claim R35R-19 closed.

---

## 35. A2 SCI invariants (updated)

- **SCI-A2-01** Exact capture identity, token-structurally bound; response-loss converge; distinct captures never collapse; cross-participant/direct-DB rebind impossible (§5).
- **SCI-A2-02** Immutable context history + exact context-command identity + **complete material context hash** (every persisted material field, §14) (A2-DG-04).
- **SCI-A2-03** One finalization pins one exact context **and** one exact eligibility-profile version (§9/§10).
- **SCI-A2-04** businessDecisionKey from the immutable id (R35R-04).
- **SCI-A2-05** **Complete accepted `DecideInput` construction authority** — every field sourced from immutable A2 authorities + frozen corpus snapshot, deterministic, no mutable reference after freeze (§11/§12) (A2-DG-02).
- **SCI-A2-06** Three-way version separation; current input-schema+contract+corpus gate before any fresh run; build-only change never blocks (§16).
- **SCI-A2-07** Crash recovery without recomputation (§18/§21).
- **SCI-A2-08** Exact 1:1 binding with **cross-wiring structurally impossible** + `verifyPurchaseIntentDecisionBinding` (§7) (A2-DG-05).
- **SCI-A2-09** Invalidation history + acyclic replacement (§23).
- **SCI-A2-10** DecisionRequest self-integrity, fail closed, no runtime fallback (§19).
- **SCI-A2-11** **New-collection serialized with A1 withdrawal on `ExperimentAssignment`**, while replay/alias/internal repair never re-authorize against current consent (§4/§6) (A2-DG-01/06; continues R35R-08 A2).
- **SCI-A2-12** Complete A2 transport-retry/domain identity; every persisted material field in the appropriate identity; token issuance idempotency = `UNIQUE(assignment, nonce)` (§24/§25; R35R-15).
- **SCI-A2-13** M3.5A/A1 not mutated (virtual relation field is not a mutation) (§20).
- **SCI-A2-14** Historical parser / snapshot-loadability retention; unavailable ⇒ fail closed (§16).
- **SCI-A2-15** Capture-token↔intent structural coherence via DB FK (§5/§28).
- **SCI-A2-16** **Trusted entry-source provenance** — server-resolved, token-frozen, never participant-selected; response-loss retains the frozen source (§8) (A2-DG-03). *(new)*
- **SCI-A2-17** **Mandatory EligibilityPortfolio input authority** — immutable versioned participant eligibility-profile pinned at finalization; card-number-free; no B/C evidence (§10/§44) (A2-DG-02). *(new)*
- **SCI-A2-18** **Corpus semantic-version integrity guard** — decision-relevant content change forces `corpusId` change via a mechanical release digest assertion (§32) (H03). *(new)*

---

## 36. R35R matrix

| Finding | Status | Basis |
| :-- | :-- | :-- |
| R35R-04 | **CLOSED** | §15 |
| R35R-05 | **CLOSED** | request construction (§11/§12) + binding repair (§7/§17/§18/§21) complete and contradiction-free |
| R35R-06 | **CLOSED** | initiation (§5), trusted source (§8), context (§9), portfolio (§10), finalization/invalidation (§ finalization/§23) authorities exact |
| R35R-08 A2 | **CLOSED (A2 portion)** | assignment-lock serialization prevents post-withdrawal new facts (§4); internal repair preserves history (§6) |
| R35R-11 A2 | **CLOSED** | §35 normative |
| R35R-15 A2 | **CLOSED** | every externally-triggered material write has complete retry/domain identity (§24/§25) |
| R35R-19 | **DEFERRED NON-BLOCKING** | timestamps preserved (§34); as-of remains C2 |

No B/C finding claimed closed.

---

## 37. entrySource materiality / create hash

`PurchaseIntent` no longer receives `entrySource` from the caller (§8). The create `requestHash` binds to `intentCaptureKey` (⇒ the immutable token that already fixes `entrySource`), so the same transport key cannot acknowledge another capture. `entrySource` is **not** redundantly hashed on create (the token id/key uniquely identifies a token with an immutable `entrySource`); if included as defense-in-depth it uses the trusted resolved value from the token, never participant input.

---

## 38. Deferred register

Production `AnalysisProtocol v1` freeze: **UNFROZEN**. Wave 0: **NOT AUTHORIZED**. Deploy/production Protocol v1: not authorized. B/C semantics deferred (A2 persists only decision-input authority + provenance/timestamps). SCI renumbering deferred to the register authority.

---

## 39. Service/entity surfaces after DG-02 (summary)

New A2 surfaces vs V3: `EligibilityProfileVersion` + `appendEligibilityProfile`; discriminated `purchaseSignatureJson` (replacing generic `amountCentimos`/`basketRef`/`locationRef`); `resolveTrustedEntrySource` + token `entrySource`; finalization pins `eligibilityProfileVersionId`; binding drops `intentId`. No raw DecideInput/rules/corpus/engine-version/snapshotId is ever exposed; `decideForPurchaseIntent` derives everything from frozen authorities.

---

## 40. DecisionRequest freeze transaction (exact)

```
LOCK PurchaseIntent root FOR UPDATE                         -- Case C; internal processing (§42) — no assignment lock, no consent
assert finalized AND no explicit PurchaseIntentInvalidation
load exact pinned PurchaseIntentFinalization → contextVersionId, eligibilityProfileVersionId
load exact pinned ContextVersion + EligibilityProfileVersion (immutable)
resolve holidayCalendar@holidayCalendarVersion; sample evaluatedAt
corpusSnapshot = loadCorpus()
input = buildDecideInputFromFinalizedAuthorities({...})     -- §11.2/§12
validate(engineInputV1Schema); canonicalize; decideInputHash
pin expectedEngineInputSchemaVersion/expectedEngineContractVersion/expectedCorpusVersion/holidayCalendarVersion
persist PurchaseIntentDecisionRequest ; COMMIT
```
Uses only immutable scientific facts collected under prior authorization; no mutable participant lookup; no new consent check merely because it occurs later.

---

## 41. Exact next action

**STOP.** Submit V4 for the independent Codex Sol closure gate, alongside accepted A1 V2.1 and the accepted repository. Do not implement, create Prisma models/migrations, expose any facade, or open a branch. `Production Protocol v1 = UNFROZEN`; `Wave 0 = NOT AUTHORIZED`.

---

## 42. Case-C locking note

Case C locks the `PurchaseIntent` root only. It is internal processing, so it needs no `ExperimentAssignment` lock for consent; the finalized authorities it reads (context/profile versions, finalization) are immutable. It serializes against invalidation on the root; invalidation acquires `ExperimentAssignment` then root, Case C acquires only the root, so the global order (`assignment ≺ root`) is respected and no inversion occurs.

---

## 43. DecideInput construction adversarial matrix (tests)

For EVERY accepted purchase-signature family — **BILL** (whole/eligible bill, incl. food + non-alcoholic split), **TICKETS**, **EXACT_ITEMS**, **NOMINAL_PACKAGE** — construct: a valid finalized A2 context; an exact pinned `EligibilityProfileVersion`; the exact relevant corpus data; and assert the produced `DecideInput` equals the expected normalized object **field-by-field** (rules/scopes/opstates canonical-ordered; portfolio; context; evaluatedAt frozen; intendedTransactionAt; selectedScopeId absent; holidayCalendar exact; baselineByScopeId absent). Also: invalid mixed signatures rejected by the context schema; missing required authority (no finalized context / no pinned profile) rejected; no mutable/reference lookup after DecisionRequest persistence (rehydration reproduces the exact frozen input + hash). Pure mapping tests need no engine invocation.

---

## 44. No B/C leak

`PurchaseIntent input capture ≠ B PurchaseOccasion/opportunity ≠ C evidence`. `EligibilityProfileVersion` and the purchase signature are **decision INPUT authority** only. A2 never converts them into transaction evidence, observed occasions, corroboration, verification, or denominator/opportunity facts. The invalidation lineage is intent-replacement history only.

---

## 53. V4 Closure Matrix

| Finding | Status | Authority · mechanical enforcement · concurrency · required test |
| :-- | :-- | :-- |
| A2-DG-01 | **CLOSED** | §4 — every NEW fact locks `ExperimentAssignment FOR UPDATE` before sampling time/consent; global order `assignment ≺ root ≺ children`; two-outcome withdrawal race; real-PG tests withdrawal vs create/context/profile/finalize/invalidate (§50). |
| A2-DG-02 | **CLOSED** | §11/§12 exhaustive field-level authority + deterministic corpus transform; §9 discriminated signature (all families); §10 mandatory `EligibilityProfileVersion`; §8 no mutable refs; enforced by versioned A2 schemas + strict validation + `buildDecideInputFromFinalizedAuthorities`; field-by-field construction tests per family (§43). |
| A2-DG-03 | **CLOSED** | §8 — trusted server resolver freezes `entrySource` on the immutable token; participant body never authoritative; response-loss retains frozen source; token FK is the single authority; tests §50 DG-03. |
| A2-DG-04 | **CLOSED** | §14 — every persisted material context field (incl. former `locationRef`→`branch` in `purchaseSignatureJson`) in hash + reconciliation; property/table-driven mutation test §50 DG-04. |
| A2-DG-05 | **CLOSED** | §7 — binding has no `intentId` (cross-wiring structurally impossible); `verifyPurchaseIntentDecisionBinding` in Case A; UNIQUE(decisionRequestId)/UNIQUE(snapshotId); P2002 discrimination §26; tests §50 DG-05. |
| A2-DG-06 | **CLOSED** | §6/§21/§42 — Case C is internal processing, no consent read; withdrawal≠invalidation; `study-intent-decision.ts` has no consent-facts capability; AST import test §50 DG-06. |
| A2-DG-H01 | **CLOSED** | §3.4/§20 — Prisma declared `^6.2.0`, lockfile-resolved **6.19.3**; implementability uses 6.19.3. |
| A2-DG-H02 | **CLOSED** | §26 — per-service expected constraint discrimination via `e.meta.target`; unexpected unique fails closed; tests §51 H02. |
| A2-DG-H03 | **CLOSED** | §32 — mechanical corpus content-digest release guard forcing `corpusId` bump on decision-relevant content change; test §51 H03. |
| A2-DG-H04 | **CLOSED** | §33 — token freezes assignment/entrySource/capture id, not `intentType`; first committed intent fixes initiation material; test §51 H04. |
| A2-DG-H05 | **CLOSED** | §13.3 — exact label grammar (TEXT; trimmed non-empty; ≤128 service max); input-schema parser-dispatched; test §51 H05. |

---

## 50/51. Mandatory tests (Sol closure + hardening)

**DG-01** real-PostgreSQL concurrency: withdrawal vs {create, context append, eligibility-profile append, finalize, invalidate} — no post-withdrawal NEW fact commits (both serializations). **DG-02** pure field-by-field `DecideInput` construction per family (§43); portfolio version pinned; no mutable/reference lookup after persistence. **DG-03** participant cannot submit authoritative `entrySource`; resolver assigns; retry retains frozen source; another session cannot mutate historical source. **DG-04** per-material-field hash mutation (incl. `branch`) flips hash → conflict. **DG-05** cross-wired attempt (Intent A / Request B / Snapshot B) fails closed; each binding UNIQUE/P2002 collision (same concurrent binding; intent already bound; snapshot already bound; request bound inconsistently). **DG-06** finalize under consent → withdraw → no request → internal `decideForPurchaseIntent` may create the request with **no** consent-facts call; AST test: `study-intent-decision.ts` cannot import `readConsentAuthorizationFacts`. **H02** unexpected UNIQUE/P2002 never aliases. **H03** decision-relevant corpus change without version/digest update fails the guard. **H04** unused token + no intent: first committed create fixes `intentType`. **H05** malformed/empty/oversized historical labels fail self-integrity. **Timestamps** finalization/invalidation event==knowledge documented/tested. Plus all prior A2 adversarial tests (capture/context/finalization/invalidation/business-key/DecisionRequest self-integrity/historical finder/version-drift/binding/capability/Prisma-validate).

---

# Final Verdict

## M3.5B-A2 EFFECTIVE DESIGN V4 READY FOR INDEPENDENT CLOSURE GATE

- new scientific writes serialize with A1 withdrawal on `ExperimentAssignment` (§4);
- complete accepted `DecideInput` construction is deterministic and fully sourced (§11/§12), with every purchase-signature family representable (§9) and no mutable reference after freeze (§8/§9/§13);
- mandatory `EligibilityPortfolio` has exact immutable, card-number-free authority pinned at finalization (§10);
- `entrySource` is trusted server provenance, not participant-selected (§8);
- all persisted context material is in retry/hash identity (§14);
- cross-wired binding is structurally impossible and verified (§7);
- Case-C processing after withdrawal is unambiguously consent-independent (§6/§21/§42) and the decision service has no consent-read capability (§27/§46-in-§27);
- P2002 reconciliation is exact per constraint (§26);
- corpus semantic-version integrity has a mechanical guard (§32);
- Prisma facts corrected to 6.19.3 (§3.4/§20);
- no B/C scope expansion (§44); no material design choice is left to the implementer.

No implementation is self-authorized — implementation GO remains the independent reviewer's to grant. **DESIGN PATCH ONLY.**

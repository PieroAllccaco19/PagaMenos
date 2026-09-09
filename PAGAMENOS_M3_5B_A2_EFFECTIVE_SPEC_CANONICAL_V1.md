# PAGAMENOS — M3.5B-A2 CANONICAL EFFECTIVE SPECIFICATION — V1

**Status:** **NORMATIVE / ACTIVE.** This is the **single active A2 normative specification**.
**Milestone:** M3.5B-A2 — PurchaseIntent lifecycle · deterministic decision-request freezing · exact snapshot binding · crash-repair saga.
**Nature:** **CONSOLIDATION ONLY.** This document reconciles the accepted A2 effective-specification chain `V4 → V4.1 → V4.2 → V4.3 → V4.4 → V4.5` into one self-contained readable contract. **It changes no A2 semantics, adds no A2 semantics, and removes no accepted closure.** Every normative statement below is traceable to a source revision in **Appendix A**.
**Created by:** the **R-B-17 authority repair** (see `PAGAMENOS_R_B_17_AUTHORITY_REPAIR_REPORT.md`), executing clause **R-B-17** of the accepted `PAGAMENOS_M3_5B_B_SEMANTIC_RATIFICATION_V1_3`.

---

## 0. Consolidation basis, precedence and integrity

### 0.1 Accepted implementation identity (exact)

| Fact | Value |
| :-- | :-- |
| **A2 accepted implementation head** | `22c8efe016a1f743196c45fe4b78d606b56d1567` |
| **A2 accepted integration merge** | `81b1cc606df9eeff7766c5afdaa56eeddb0db1a5` |
| **A2 accepted integration tree** | `b6de0d7f72ef67a6d2099a5fd9d7f09b0a476f6b` |
| M3.5A accepted implementation (decision-persistence authority) | `64cf864a817c137920204487ab3317bc6d4c9ba5` |
| M3.5B-A1 accepted implementation (participant/assignment/consent authority) | `99f2d61bc45839d6f9506abee5fae641bfcd8b2e` |
| M3.5B-A1 documentation-only child (does **not** replace the accepted A1 SHA) | `7c0a3d9e0add34e4823c01f22c21542817dbc881` |
| Failed historical prototype — **evidence only, NOT authority** | `1ded28d28038d4a385628683da096f846439a100` (Codex Sol: **C — NO-GO**) |

The accepted A1 design authority is `PAGAMENOS_M3_5B_A1_EFFECTIVE_SPEC_V2_1.md`. A2 **consumes** A1 facts; it never redefines them.

### 0.2 What this document consolidates, and why it was required

The accepted A2 semantics were distributed across **V4** (the architecture) plus **V4.1–V4.5** (bounded correction patches). Each patch carried a header of the form *"fully supersedes V1–V4.n"*. **Read literally, that claim is false and dangerous:** V4.5 is a 177-line, two-field reclassification patch, while V4 is the 779-line architecture. A gate reading only the newest file would read a two-field patch and lose the entire `PurchaseIntent` lifecycle.

**The accepted effective A2 authority is the ordered union `V4 ∪ V4.1 ∪ V4.2 ∪ V4.3 ∪ V4.4 ∪ V4.5`, later revisions winning field-by-field only on what they explicitly reclassify.** This document *is* that union, written once.

### 0.3 Consolidation rule (frozen)

1. **V4** supplies the architectural spine and every contract it closed (`DG-04`, `DG-05`, `DG-06`, `H01`, `H04`, `H05`).
2. A later revision overrides an earlier one **only** where it explicitly states a correction. Everything a later revision lists as "carried forward / not reopened" retains its earlier text.
3. **No consolidation-time invention.** Where the accepted chain deliberately left a value to be produced later (for example a digest hex computed at the authority-bootstrap gate), this document records that fact rather than supplying a value.
4. The in-document *"fully supersedes"* headers of V4.1–V4.5 are **historical review-scope statements about a review packet**. They are **non-operative** as supersession of the architecture, and are superseded by this rule (**Appendix B**).

### 0.4 Precedence

```
PAGAMENOS_M3_5B_A2_EFFECTIVE_SPEC_CANONICAL_V1   (this document — the only active A2 normative spec)
        ^ consolidates, without semantic change
        |
V4 · V4.1 · V4.2 · V4.3 · V4.4 · V4.5             HISTORICAL / NON-NORMATIVE
V1 · V2 · V3                                       HISTORICAL / NON-NORMATIVE (superseded before the accepted chain)
```

All historical A2 revisions are archived under `docs/authority/archive/m3.5b-a2/` and are marked `HISTORICAL / NON-NORMATIVE`. They are retained as audit evidence and **MUST NOT** drive implementation, review, or gating.

### 0.5 Relationship to the accepted A2 implementation

This document is a **faithful restatement of the design authority the accepted A2 implementation was gated against**. It does **not** modify:

- the accepted A1/A2 database semantics;
- runtime services, Prisma schema, or migrations;
- business logic or trusted-harness semantics;
- application behaviour.

The accepted implementation at `22c8efe0` / integration `81b1cc60` is unchanged by the creation of this document.

### 0.6 Conventions

Instants are zone-qualified (`America/Lima`). "Trusted time" is sampled by the service from the system clock **under a stable row lock**, never caller-supplied. Money is integer céntimos and is **provenance, never identity**. Every A2 scientific table is append-only at the DB level (`BEFORE UPDATE/DELETE/TRUNCATE` triggers that `RAISE`), matching the accepted M3.5A/A1 `*_forbid_mutation` guard. *(verified)* = read in the accepted worktree; *(contract)* = reliance on the accepted semantic contract only. "M3.5A §n" = accepted persistence markers; "A1 §n" = the A1 V2.1 spec.

---

## 1. Executive summary

A2 answers exactly one question: **how does one trustworthy participant purchase intent become exactly one immutable decision request and exactly one matching immutable `DecisionSnapshot`, despite retries, concurrent calls, crashes, redeploys, engine/corpus version changes, intent correction/invalidation, and lost responses?**

The closures that constitute the accepted A2 contract:

- **A2-DG-01** — every genuinely NEW participant scientific write serializes on `ExperimentAssignment FOR UPDATE` before sampling collection time or reading consent, under the global lock order `ExperimentAssignment ≺ PurchaseIntent root ≺ children`. The consent read itself is **Model A**: a separate READ COMMITTED connection *after* the lock is acquired (§4).
- **A2-DG-02** — an exhaustive, field-level **Exact DecideInput Construction Authority** (§11); a discriminated **COMPLETE-SIGNATURE-ONLY** purchase-signature context model (§9); a mandatory **`EligibilityProfileVersion`** input authority with a total normalizer (§10); a deterministic corpus→input transformation with **exactly one operational state per included rule** (§12); and an **actual content-defined holiday calendar fixture** (§13). No mutable reference survives the freeze.
- **A2-DG-03** — `entrySource` is **trusted server-resolved provenance** on the capture token, from a closed evidence union with frozen precedence, never participant-selected (§8).
- **A2-DG-04** — every persisted material context field is in the context request hash and domain reconciliation, proven by a property test (§15).
- **A2-DG-05** — binding cross-wiring is **structurally impossible** (the binding carries no free-standing `intentId`), plus a normative `verifyPurchaseIntentDecisionBinding` (§7).
- **A2-DG-06** — Case-C `DecisionRequest` creation is **INTERNAL PROCESSING**, never new collection; no current-consent read; withdrawal is not invalidation; the decision service has **no** consent-read capability (§6).
- **A2-DG-H01** — Prisma declared `^6.2.0`, lockfile-resolved **6.19.3**.
- **A2-DG-H02** — **reload-and-prove** P2002 discrimination; driver metadata is a hint only (§27).
- **A2-DG-H03** — an immutable `corpusId → corpusSemanticDigest` release ledger under **external protected-base-SHA** governance, over an **exhaustive** corpus semantic projection (§33/§34).
- **A2-DG-H04** — unused-token material semantics (§35).
- **A2-DG-H05** — exact historical-label grammar (§14.3).
- **A2-V4-NEW-01** — **total** `normalizeEligibilityPortfolioV1` before persistence, hashing and reconciliation (§10.2), with an injective, total instrument comparator (§10.3).
- **A2-CORPUS-PROJECTION-INCOMPLETE** — the corpus semantic projection includes **every** `RuleVersion` field (the full `provenance` object) and **every** `RuleOperationalState` field (including `asOf` and `note`) (§33).

`PurchaseIntent input capture ≠ B opportunity/occasion identity ≠ C evidence` (§44).

---

## 2. Scope / non-scope

**A2 authorizes:** `PurchaseIntentCaptureToken`; `PurchaseIntent`; `PurchaseIntentContextVersion` (discriminated purchase signature); `EligibilityProfileVersion`; `PurchaseIntentFinalization`; `PurchaseIntentInvalidation`; deterministic `businessDecisionKey`; `PurchaseIntentDecisionRequest`; `PurchaseIntentDecisionBinding`; the additive read-only M3.5A `findExactHistoricalDecision` facade; the additive read-only A1 `readConsentAuthorizationFacts` facade; the trusted entry-source resolver interface; the current-runtime compatibility gate; A2 write receipts; the A2 capability boundary; A2 SCI and adversarial tests; the additive Prisma models/migrations/AST-ESLint extensions/services; the versioned static holiday-calendar authority artifact and its registry; the corpus release ledger.

**OUT of scope (B/C):** `PurchaseOccasion`; occasion lineages; `ResearchContact`; `AuthMessage`; weekly reports; opportunity reconciliation; entry-source **adjudication/contamination conclusions**; aggregate/app overlap; `TransactionCorroboration`; `BaselineCorroboration`; `ValueVerification`; redeemed-benefit attribution; VS3/VS4; RIVSR; denominator bounds; `thresholdStatus`; C2 analysis. A2 captures eligibility and purchase-signature facts **only as decision INPUT authority** (§44). No production `AnalysisProtocol v1` freeze, no deploy, no Wave 0.

---

## 3. Accepted baseline dependencies (VERIFIED)

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
  baselineByScopeId?:  Record<string, Centimos> // DISPLAY-ONLY penSaved; never a ranking key
}
EligibilityPortfolio {                          // card-number-free
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

`loadCorpus(): Corpus = CORPUS_V1` (static, pure, in-memory). `Corpus { corpusId; freezeTimestamp; merchants; sources; scopes: ComparisonScope[]; activeRules: RuleVersion[]; operationalStates: RuleOperationalState[]; researchMeta; excludedRules }`. `corpusId = 'PAGAMENOS_VALIDATION_CORPUS_v1_2026-08-30T1800-0500'` *(verified, `src/corpus/ids.ts`)*. `RuleVersion.comparisonScopeRefs: string[]`; `ComparisonScope.signature: PurchaseSignature` in `{ EXACT_BUNDLE(canonicalItems) | ELIGIBLE_BILL(purchaseDomain) | TICKETS(ticketCount,ticketClass) | NOMINAL_PACKAGE(cashAcquisitionCostCentimos,nominalUnit) }`.

The corpus-provenance verifier *(verified, `src/persistence/provenance.ts`)* defines required-scope selection: with `selectedScopeId` unset, every corpus scope for the runtime merchant whose signature is RELEVANT to the context (`signatureRelevant`) must be present, and per required scope the COMPLETE active `ruleId@version` set must be present (order-invariant); operational state is dynamic and not membership-checked.

`RuleVersion.provenance` contains **exactly** `{ sourceId, url, observedAt }` *(verified, `src/corpus/types.ts` `interface Provenance`, mirrored one-to-one by `ruleVersionSchema.provenance` in `src/persistence/schema.ts`)*. `RuleOperationalState` contains **exactly** `{ ruleId, version, publicationState, sourceQualityState, availability, asOf, note? }` *(verified)*. The current corpus is **46 active rules / 46 operational states**.

### 3.3 M3.5A persistence *(verified, unchanged from `64cf864`)*

`decideAndPersist({ input, businessDecisionKey, idempotencyKey })`, `loadDecisionSnapshot`, `replayDecisionSnapshot` (public barrel); internal repo `findReceipt`/`findSnapshotById`/`findSnapshotByBusinessKey`; `requestHash === inputHash === SHA-256(canonical(validated DecideInput))`; `businessDecisionKey` UNIQUE and compared separately; receipt `UNIQUE(operationScope, idempotencyKey)`. `ENGINE_CONTRACT_VERSION='pagamenos.engine.m3.v1'`; `corpusVersion = corpusId`; `gitSha`/`buildId` are build identity.

**Loadability rule (verified):** `decisionSnapshotDtoSchema` pins all four version fields with `z.literal(<current constant>)` and `parseDecisionSnapshot` dispatches on `snapshotSchemaVersion`, so a stored snapshot is loadable only while the current build recognizes its stamped versions (§17). The provenance verifier canonical-hashes each supplied rule/scope against the current corpus (authenticity) and enforces per-scope completeness.

### 3.4 A1 *(verified)*

Prisma client/CLI declared `^6.2.0`, **lockfile-resolved `6.19.3`** *(verified, `pnpm-lock.yaml`)* — **H01**. `TrustedParticipantContext = { readonly participantId }` (WeakSet-validated, unforgeable); adapter `resolveTrustedParticipantContext({ authenticatedParticipantId })` (`services/study-participant-session.ts`, behind `@/services/study-admin`). Own-assignment: `ConsentStore.findAssignmentParticipantId(assignmentId)` compared to `context.participantId` (`StudyAssignmentOwnershipError`).

Pure consent contracts on `@/services`: `wasCollectionAuthorizedAtKnownTime({ events, collectionAt, asOfKnowledgeAt? })`, `deriveConsentAuthorizationIntervals`, `effectiveConsentState`, `ConsentEventFact`. Events load only via internal `ConsentStore.listEvents(assignmentId)` (capability-locked to `services/study-consent.ts`), so A2 needs the additive facade (§7.2). Consent mutation locks `experiment_assignment` `FOR UPDATE` *(verified, `study-consent-repository.ts`)* — the serialization row A2-DG-01 shares.

The A1 consent repository uses the shared singleton `PrismaClient` (`src/db/client.ts`); `ConsentStore.listEvents(assignmentId)` is a plain `findMany`, **not** inside a transaction *(verified)*. A `readConsentAuthorizationFacts` facade built on it therefore reads on a **separate pooled connection** under PostgreSQL default **READ COMMITTED** isolation, independent of any A2 `$transaction` — the basis of Model A (§4.1).

Request-hash discipline `canonicalHash({ op, …material…, context })`. Capability enforcement = ESLint groups + AST `RAW_WRITE_MODULES`/`DEEP_SERVICE` + a **per-repository owner-allowlist map** + fail-closed non-literal `import()`.

**Verified corpus parity:** `git diff 64cf864 99f2d61 -- src/corpus src/engine` is **EMPTY** — A1 modified neither corpus nor engine content, so the corpus digest is identical at both SHAs.

---

## 4. A2-DG-01 — New-collection serialization with A1 withdrawal (Model A)

**Rule.** Every genuinely NEW participant scientific fact MUST serialize on the SAME stable authority row A1 consent mutation uses — `ExperimentAssignment FOR UPDATE` — **before** sampling collection time or evaluating consent.

Applies to NEW: `PurchaseIntent`, `PurchaseIntentContextVersion`, `EligibilityProfileVersion`, `PurchaseIntentFinalization`, `PurchaseIntentInvalidation`.
Does **not** apply to: exact same-transport-key replay; exact different-key alias of an already-existing fact; `PurchaseIntentCaptureToken` issuance; `PurchaseIntentDecisionRequest` creation and internal decision repair (§6).

**Global lock order (frozen):** `ExperimentAssignment ≺ PurchaseIntent roots (ascending UUID order) ≺ child rows`. No operation may acquire `PurchaseIntent → ExperimentAssignment`.

### 4.1 Model A — the chosen, implementable serialization

```
BEGIN A2 TRANSACTION (READ COMMITTED)
  LOCK ExperimentAssignment FOR UPDATE                          -- the serialization authority
  lock required PurchaseIntent root(s) in ascending UUID order  -- where a root is involved
  recheck exact same-key receipt / domain identity under the locks
  if a historical result now exists -> REPLAY/ALIAS (no consent, no new timestamp), COMMIT/return
  sample trusted collectionAt
  events = readConsentAuthorizationFacts(assignmentId)          -- A1 read facade, SEPARATE READ COMMITTED connection
  if NOT wasCollectionAuthorizedAtKnownTime({ events, collectionAt }): ROLLBACK/REJECT
  append scientific fact + receipt (atomic in the A2 transaction)
COMMIT
```

**The serialization authority is the continuously-held `ExperimentAssignment` row lock.** The consent facade **need NOT share the A2 transaction client**; it may read on another pooled READ COMMITTED connection after the lock is acquired. Any earlier requirement that the consent facade run "inside the same transaction client" is **removed**.

**Normative safety argument (frozen).** (1) Any withdrawal that committed **before** A2 acquired the assignment lock is visible to the later READ COMMITTED consent read. (2) Any withdrawal that has **not** committed but already holds the assignment lock blocks A2 from acquiring it. (3) Once A2 holds the assignment lock, no new withdrawal can acquire it until A2 commits. (4) Therefore the consent-event set relevant to `collectionAt` cannot cross the collection point so as to create a post-withdrawal collection. (5) The A2 scientific fact and its receipt remain atomic in the A2 transaction.

### 4.2 Per-new-fact operation (normative ordering)

```
1  validate schema/material
2  resolve trusted actor + own-resource (own-assignment / own-intent via TrustedParticipantContext)
3  exact same-transport-key receipt lookup            -> if present & material matches: REPLAY (no consent, no new timestamp), return
4  exact domain-result reconciliation (existing fact) -> if present & material matches: ALIAS  (no consent, no new timestamp), return
5  determine assignment (via intent -> captureToken -> assignment, or directly for create)
6  BEGIN TX
7  LOCK ExperimentAssignment FOR UPDATE
8  acquire the required PurchaseIntent root lock(s) in ascending-UUID order (where a root is involved)
9  RE-CHECK receipt/domain result under the locks     -> if a historical result now exists: REPLAY/ALIAS (no new collection)
10 sample trusted collection timestamp
11 read consent events via readConsentAuthorizationFacts (separate READ COMMITTED connection, §4.1)
12 wasCollectionAuthorizedAtKnownTime({ events, collectionAt })  -> if unauthorized: ROLLBACK/REJECT
13 append the scientific fact + its receipt atomically
14 COMMIT
```

### 4.3 Race proof — only two serializations

- **A2 lock wins:** A2 holds `ExperimentAssignment` first, samples `T1`, reads GRANTED, inserts the NEW fact and receipt, commits; the withdrawal transaction can acquire the assignment lock only afterward. Valid new fact, then withdrawal.
- **Withdrawal lock wins:** the withdrawal commits first; A2 then acquires the assignment lock, `readConsentAuthorizationFacts` returns the withdrawal event, `wasCollectionAuthorizedAtKnownTime` is false at the sampled `collectionAt`, and A2 **rejects** the new fact.

**No third serialization** — the assignment row lock is mutually exclusive.

**Replay/alias stays fast (do not "fix" DG-01 by re-authorizing history).** Steps 3–4 may return **before** the assignment lock when the historical result is already durable and material/ownership/integrity verify. Step 9 re-checks under the locks before creating a NEW fact. Withdrawal never makes an exact historical retry fail.

**Required real-PostgreSQL tests:** for each of {create, context append, eligibility-profile append, finalize, invalidate} against withdrawal — A2-lock-first succeeds then withdrawal; withdrawal-lock-first rejects the NEW fact; response-loss historical replay after withdrawal succeeds with **no** new scientific row.

---

## 5. Capture identity / retry (structurally token-bound)

**Model:** a server-issued durable capture token, idempotent on a client-held correlation nonce, immutably bound to the trusted assignment and to trusted `entrySource` (§8); the `PurchaseIntent` is a DB-FK child of the token, with no independent assignment field to forge.

```
PurchaseIntentCaptureToken {
  id                     PK UUID
  assignmentId           FK -> ExperimentAssignment RESTRICT   -- TRUSTED, from the trusted context; immutable
  clientCorrelationNonce                                       -- UNTRUSTED correlation material (client-held; §14.1)
  intentCaptureKey       UNIQUE                                -- SERVER-minted opaque (gen_random_uuid); never client-chosen
  entrySource            enum (§8)                             -- TRUSTED server-resolved provenance; immutable
  issuedAt               TIMESTAMPTZ trusted
  UNIQUE(assignmentId, clientCorrelationNonce)                 -- COMPLETE durable issuance idempotency (no receipt)
}   -- append-only

PurchaseIntent {
  id             PK UUID                                        -- SOLE decision identity
  captureTokenId UNIQUE FK -> PurchaseIntentCaptureToken RESTRICT -- assignment + entrySource reached ONLY here
  intentType     enum BUYING_NOW|BUYING_TODAY|CONSIDERING_LATER|EXPLORATORY
  initiatedAt    TIMESTAMPTZ trusted
  createdAt      TIMESTAMPTZ trusted
}   -- append-only
```

No `assignmentId`, `intentCaptureKey`, `entrySource`, `captureOrigin`, or actor-context column lives on `PurchaseIntent` — the assignment and `entrySource` are the token's alone. This structurally eliminates mismatch and forgery; the trusted actor is inferable via `intent -> token -> assignment -> participant` and is bound into request hashes (§26).

**`issueIntentCaptureKey({ trustedParticipantContext, assignmentId, clientCorrelationNonce })`** — verify own assignment; the trusted entry-source resolver (§8) supplies `entrySource` server-side; insert the token; on `UNIQUE(assignmentId, clientCorrelationNonce)` P2002 return the existing token's `intentCaptureKey`. **Idempotency is that constraint — no receipt, no request-hash.** Issuance is **not** participant scientific collection.

**`createPurchaseIntent({ trustedParticipantContext, intentCaptureKey, intentType, idempotencyKey })`** — resolve the token by `intentCaptureKey`; verify `token.assignmentId` is own; apply §4 (NEW fact, so assignment lock and consent); insert `PurchaseIntent(captureTokenId=token.id, intentType, initiatedAt)`; on `UNIQUE(captureTokenId)` P2002 reconcile (§27). **`entrySource` is NOT a create input.**

### 5.1 Response-loss / restart

The client generates `clientCorrelationNonce` before any call and persists it client-side. Issuance response lost means the same nonce yields the same token and key. Create response lost means a retry — possibly with a different transport key — carrying the held `intentCaptureKey`, which hits `UNIQUE(captureTokenId)` and yields one root. If the client lost the nonce it starts fresh: a genuinely new capture, never collapsed.

### 5.2 Convergence

| transport | intentCaptureKey to token | create material (intentType) | Result |
| :-- | :-- | :-- | :-- |
| same | same | same | replay create-receipt |
| same | different | — | `PurchaseIntentCaptureConflictError` |
| different | same | same | one root + `CAPTURE_ALIAS` receipt |
| different | same | different | `PurchaseIntentCaptureConflictError` |
| different | different | — | two roots |
| concurrent | same | same | one root (`UNIQUE(captureTokenId)` + P2002) |

**Non-collapse:** distinct nonces yield distinct tokens and therefore distinct roots, regardless of merchant, amount, or time.
**Cross-participant:** B presenting A's key fails own-assignment against `token.assignmentId`; the token is immutable and the intent has no independent assignment, so **even a direct DB INSERT cannot rebind it**.

---

## 6. A2-DG-06 — Case-C consent semantics (frozen)

**Creating a `PurchaseIntentDecisionRequest` from already-finalized, already-collected facts is INTERNAL PROCESSING, never new participant collection.** Therefore:

- No current-consent read is performed for `decideForPurchaseIntent`, DecisionRequest creation, or binding repair.
- **Withdrawal is not `PurchaseIntentInvalidation`.** They are distinct facts. A later withdrawal does not block Case C; an explicit `PurchaseIntentInvalidation` **does**.
- Case C requires: a finalized intent; no explicit invalidation; the exact pinned finalized context and eligibility-profile versions; the exact pinned input authorities. It requires **no** A1 authorization and reads **no** consent facts.

All wording of the form `consent@collection (NEW)` for DecisionRequest/Case C is removed from every table (§22/§32). The decision service holds **no** consent-read capability (§7.2/§28); an AST test proves `services/study-intent-decision.ts` cannot import `readConsentAuthorizationFacts`.

---

## 7. A2-DG-05 — Binding and verification (cross-wiring structurally impossible)

```
PurchaseIntentDecisionBinding {
  id                 PK UUID
  decisionRequestId  UNIQUE FK -> PurchaseIntentDecisionRequest RESTRICT
  snapshotId         UNIQUE FK -> decision_snapshot(id) (M3.5A) RESTRICT
  boundAt            TIMESTAMPTZ trusted
}   -- append-only
```

The binding carries **no free-standing `intentId`.** The intent is reached only via `decisionRequestId -> DecisionRequest.intentId`. Cross-wiring (Intent A / Request B / Snapshot B claimed as A's) is therefore **structurally impossible**: a binding names exactly one request, whose intent is fixed by construction. One intent yields one request (`UNIQUE(intentId)` on the request), which yields one binding (`UNIQUE(decisionRequestId)`); one snapshot yields one binding (`UNIQUE(snapshotId)`). No `intentId` scalar is shared across two relations, so Prisma 6.19.3 validates cleanly (§21). Immutable; no public attach.

### 7.1 `verifyPurchaseIntentDecisionBinding(binding, requestedIntentId)` — normative

Case A MUST call it before returning any historical result.

1. load `request = DecisionRequest(binding.decisionRequestId)`; assert `request.intentId === requestedIntentId`.
2. `verifyPurchaseIntentDecisionRequest(request)` passes (§20).
3. load `snapshot = findSnapshotById(binding.snapshotId)` (its stamped versions must be recognized, §17).
4. assert `binding.snapshotId === snapshot.id`.
5. exact snapshot coherence §18 passes for `(request, snapshot)`.

No cross-wired or incoherent binding validates.

### 7.2 Additive A1 read facade and capability separation

`readConsentAuthorizationFacts({ assignmentId }): Promise<ConsentEventFact[]>` (READ ONLY) is added to sanctioned `services/study-consent.ts`, reusing internal `ConsentStore.listEvents`; no raw repository is exposed and no A1 semantics change. **Importable ONLY by the participant scientific-write service `services/study-purchase-intent.ts`.** It is **NOT** importable by `services/study-intent-decision.ts` (§6/§28). Own-assignment enforcement is the participant caller's responsibility, via the trusted context.

---

## 8. A2-DG-03 — `entrySource` as trusted server provenance

Participant-facing callers MUST NOT choose authoritative `entrySource`. One trusted authority resolves it server-side and freezes it on the capture token.

`entrySource` is in `{ DIRECT, CONTENT, SHARED_LINK, RESEARCH_LINK, AUTH_LINK, SAVED_DECISION, OTHER }` (Phase 0A §29).

### 8.1 Closed discriminated evidence union (server-resolved only)

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

All fields derive ONLY from server-resolved route/token/session state; **the participant request body cannot instantiate or choose the union**; opaque ids are trusted server artifacts. Resolution happens at capture-token issuance, in the sanctioned `resolveTrustedEntrySource`.

### 8.2 Exhaustive mapping

| `TrustedEntryEvidence.kind` | `entrySource` |
| :-- | :-- |
| RESEARCH_LINK | RESEARCH_LINK |
| AUTH_LINK | AUTH_LINK |
| SAVED_DECISION | SAVED_DECISION |
| SHARED_LINK | SHARED_LINK |
| CONTENT | CONTENT |
| DIRECT | DIRECT |
| UNCLASSIFIED | OTHER |

### 8.3 Precedence (frozen) and resolution algorithm

```
RESEARCH_LINK > AUTH_LINK > SAVED_DECISION > SHARED_LINK > CONTENT > DIRECT > OTHER
```
```
resolveTrustedEntrySource(evidenceSet):
  recognized = filter evidenceSet to known kinds with valid trusted ids
  if recognized empty -> return OTHER
  pick the highest-precedence recognized kind
  return mapping(kind)   // §8.2
```

Research and auth capture routes are the most contamination-relevant provenance and must win over generic content or direct entry. Invalid or unrecognized server evidence maps to `OTHER`. A participant-declared fallback is never accepted. **No two implementers can map the same trusted evidence differently.**

### 8.4 Authority, immutability and response-loss rule (frozen)

`entrySource` is set **only** at token issuance from the resolver, is immutable on the token, and is the single authority; `PurchaseIntent` derives it exclusively through its capture token, with no duplicate disagreeing copy.

The FIRST durable token issuance for a given `(assignmentId, clientCorrelationNonce)` freezes `entrySource`. A same-nonce retry returns that historical token and its frozen `entrySource` **unchanged**, even if the retry's server evidence would resolve a different category. There is no silent overwrite; the nonce is the exact issuance domain identity, so the historical token wins, and no typed conflict is needed because issuance carries no other material. Any mismatch may be emitted as audit-only telemetry later, **never as scientific state**.

This is **trusted capture provenance**, explicitly **NOT** later B entry-source adjudication or contamination conclusions (§44).

---

## 9. Purchase-signature context model — COMPLETE-SIGNATURE-ONLY (A2-DG-02a)

The accepted engine `PurchaseContext` is optional-field based; a partial or mixed context may yield `MISSING_CONTEXT` advisories rather than a schema rejection *(verified, `engine/types.ts`, `provenance.ts` `signatureRelevant`)*. A2 deliberately narrows this:

> **A2 Phase-0A defines a stricter input-capture contract than the generic engine `PurchaseContext`. This does NOT alter M3 engine semantics; it limits which contexts Phase-0A A2 will freeze into a DecisionRequest.** A2 participant capture admits ONLY a context carrying enough authoritative information to instantiate exactly one complete supported purchase-signature family (a single discriminant `signatureKind`). Partial or mixed engine-valid contexts remain legal in the generic M3 engine but are **not** admitted as A2 scientific purchase-intent inputs in Phase 0A.

### 9.1 Entity

```
PurchaseIntentContextVersion {
  id                 PK UUID
  intentId           FK -> PurchaseIntent
  contextSeq         INT                          -- monotonic per intent, under the PurchaseIntent root lock
  contextCaptureKey                               -- client-held correlation (§14.2)
  contextSchemaVersion                            -- "pagamenos.a2-context.v1"
  merchantId                                       -- lifted (query)
  signatureKind      enum BILL|TICKETS|EXACT_ITEMS|NOMINAL_PACKAGE   -- lifted (query); discriminant
  intendedTransactionAt  TIMESTAMPTZ               -- participant-entered (DecideInput top-level field)
  purchaseSignatureJson  JSONB                     -- the exact normalized discriminated signature (authority)
  capturedAt         TIMESTAMPTZ trusted           -- scientific capture time (NOT resampled on alias, §25)
  recordedAt         TIMESTAMPTZ                   -- knowledge time
  UNIQUE(intentId, contextSeq)
  UNIQUE(intentId, contextCaptureKey)              -- exact context-command identity
}   -- append-only
```

`purchaseSignatureJson` (validated by the versioned A2 context schema; strict, unknown keys rejected):

```
{ schemaVersion, merchantId, channel?, branch?,
  signature:
    | { kind:'BILL',            wholeBillCentimos, foodCentimos?, nonAlcoholicBeverageCentimos?, purchaseDomain }
    | { kind:'TICKETS',         ticketUnitPriceCentimos, ticketCount, ticketClass }
    | { kind:'EXACT_ITEMS',     exactItems:[{itemKey, qty}] }
    | { kind:'NOMINAL_PACKAGE', nominalPackage:{ cashAcquisitionCostCentimos, nominalUnit } } }
```

### 9.2 Admitted families (exact required fields; verified against corpus `PurchaseSignature`)

| `signatureKind` | Corpus scope signature | Required | Optional | Forbidden (A2) |
| :-- | :-- | :-- | :-- | :-- |
| **BILL** | ELIGIBLE_BILL | `merchantId`, `intendedTransactionAt`, `wholeBillCentimos`, `purchaseDomain` | `channel`, `branch`, `foodCentimos`, `nonAlcoholicBeverageCentimos` | `ticket*`, `exactItems`, `nominalPackage` |
| **TICKETS** | TICKETS | `merchantId`, `intendedTransactionAt`, `ticketUnitPriceCentimos`, `ticketCount`, `ticketClass` | `channel`, `branch` | `wholeBill*/food*`, `exactItems`, `nominalPackage`, `purchaseDomain` |
| **EXACT_ITEMS** | EXACT_BUNDLE | `merchantId`, `intendedTransactionAt`, `exactItems` (non-empty; unique `itemKey`; positive-int `qty`) | `channel`, `branch` | `wholeBill*/food*`, `ticket*`, `nominalPackage`, `purchaseDomain` |
| **NOMINAL_PACKAGE** | NOMINAL_PACKAGE | `merchantId`, `intendedTransactionAt`, `nominalPackage{cashAcquisitionCostCentimos, nominalUnit}` | `channel`, `branch` | `wholeBill*/food*`, `ticket*`, `exactItems`, `purchaseDomain` |

**Verified rationale.** `signatureRelevant` (`provenance.ts`) matches ELIGIBLE_BILL on `merchantId` + `purchaseDomain` (absent means MISSING), so A2 **requires** `purchaseDomain` to make the Phase-0A scope match decisive rather than MISSING; `wholeBillCentimos` is required because WHOLE_BILL-selector rules need the bill amount economically. TICKETS matches on `ticketCount` + `ticketClass` (both required); `ticketUnitPriceCentimos` is required economically. EXACT_BUNDLE matches item-for-item against `exactItems`, and A2 **forbids** `wholeBillCentimos` there — A2 chooses one complete-signature authority rather than a mixed generic context. NOMINAL_PACKAGE matches on `cashAcquisitionCostCentimos` + `nominalUnit`.

### 9.3 Validation and mixed-signature prevention (frozen)

Céntimos are integers greater than or equal to 0; `qty` values are positive integers with unique `itemKey`; `ticketCount` is a positive integer; enums come from the frozen token sets (`CHANNELS_V1`, `PURCHASE_DOMAINS_V1`, `NOMINAL_UNITS_V1`). For BILL, when both `foodCentimos` and `nonAlcoholicBeverageCentimos` are present, each is greater than or equal to 0 and `food + nonAlc <= wholeBillCentimos` — a coherence CHECK that cannot reject an engine-valid input.

**Mixed-signature prevention is structural.** A single `signature.kind` discriminant makes ticket fields on a BILL, or `exactItems` together with `nominalPackage`, unrepresentable. Frozen rejections: `exactItems + wholeBillCentimos`; `tickets + purchaseDomain`; `nominalPackage + wholeBill`; `food split + tickets` — all raise `PurchaseIntentContextSignatureError`. Tests prove that the generic M3 engine may syntactically accept a partial or mixed context while A2 Phase-0A capture rejects it: a deliberate narrower policy, **not** an M3 change.

The exact basket lives in the JSON — no `basketRef`, no mutable reference. Derivation to the flat `PurchaseContext` (§11.1) sets only the discriminant's fields.

### 9.4 Correction semantics

Corrigible pre-finalization: a new `contextCaptureKey` produces a new version. No append is permitted after finalization (`PurchaseIntentContextAfterFinalizationError`). The retry/alias matrix is payload-compared on a different-key alias, with a domain conflict on payload mismatch (§14.2).

---

## 10. `EligibilityPortfolio` authority (A2-DG-02b, A2-V4-NEW-01)

The accepted engine requires a non-optional `EligibilityPortfolio`. A1 has no portfolio model. **A2 authorizes a new entity** — an append-only, assignment-scoped participant eligibility-profile version, pinned by finalization.

### 10.1 Entity

```
EligibilityProfileVersion {
  id                 PK UUID
  assignmentId       FK -> ExperimentAssignment RESTRICT   -- trusted participant ownership
  profileSeq         INT                                   -- monotonic per assignment (under ExperimentAssignment lock, §4)
  profileCaptureKey                                        -- client-held correlation (§14.2)
  portfolioSchemaVersion                                   -- "pagamenos.a2-portfolio.v1"
  portfolioJson      JSONB                                 -- NORMALIZED EligibilityPortfolio (authority)
  capturedAt         TIMESTAMPTZ trusted
  recordedAt         TIMESTAMPTZ
  UNIQUE(assignmentId, profileSeq)
  UNIQUE(assignmentId, profileCaptureKey)
}   -- append-only
```

`portfolioJson` (strict versioned schema, unknown keys rejected) is exactly `{ instruments:[{ family in PROVIDER_FAMILIES_V1, network? in {AMEX,VISA,MC}, tier?, memberships?:string[] }], privateStates?:Record<string,Tri>, declarations?:Record<string,Tri> }` with `Tri` in `{YES,NO,UNKNOWN}`.

**Privacy (enforced by the strict schema):** no PAN or card number, no CVV, no bank or account credentials, no transaction ingestion. `network` is a brand enum, not a card number; only YES/NO/UNKNOWN eligibility facts, tiers, and canonical membership tokens are permitted.

**Properties.** Immutable versioned historical fact; a NEW profile version is **new participant collection** (assignment lock and consent, §4); trusted participant ownership via own-assignment; **finalization pins the exact `eligibilityProfileVersionId`**; future profile changes never alter an existing DecisionRequest, because it is pinned by version. Introduces **no** B/C evidence semantics (§44).

**Retry / identity.** The domain identity of one exact profile update is `profileCaptureKey` under `UNIQUE(assignmentId, profileCaptureKey)`; transport idempotency uses `EligibilityProfileCommandReceipt` (`operationScope=ELIGIBILITY_PROFILE_APPEND_V1`, target FK `eligibilityProfileVersionId`, `resultKind` in `APPENDED|PROFILE_ALIAS`). The request hash is the normalized `portfolioJson` plus `profileCaptureKey`, assignment, and the trusted `{participantId}`. There is **no mutable "current portfolio"** — only pinned versions are ever read for a decision.

### 10.2 `normalizeEligibilityPortfolioV1` — TOTAL, applied before persistence

**Verified consumption** *(`engine/eligibility.ts`)*: instruments are matched **existentially** by `family` / `network` / `tier` / `memberships.includes`, with strict case-sensitive `===`; `declarations` are keyed `network:<FAM>:<NET>` / `tier:<FAM>:<TIER>` / `membership:<X>`; `privateStates` are keyed by `providerPrivateKey`. Instruments and memberships are therefore **set-like**, maps are keyed lookups, and **case is preserved**.

`normalizeEligibilityPortfolioV1(raw): EligibilityPortfolio` is a **TOTAL** function over valid raw input, and otherwise a deterministic typed rejection. Exact order:

```
1. validate top-level known fields only (reject unknown keys)
2. per instrument:
   a. family in PROVIDER_FAMILIES else reject
   b. network in {AMEX,VISA,MC} if present else reject
   c. tier: if present, trim; blank-after-trim -> REJECT (EligibilityProfileBlankTierError); preserve case; <=128
   d. memberships: trim each; blank element -> REJECT (EligibilityProfileBlankMembershipError); <=128; preserve case;
      deduplicate exact-equal; sort code-point; if zero after normalization -> OMIT the field (never [])
   e. omit empty optional containers
3. deduplicate identical normalized instruments
4. sort instruments with compareNormalizedEligibilityInstrumentV1 (§10.3)
5. privateStates: for each raw key -> normalizedKey = trim(key); validate grammar (non-empty, <=128, preserve case);
   group by normalizedKey; if >1 DISTINCT raw key maps to one normalizedKey -> REJECT
     (EligibilityProfileNormalizedKeyCollisionError) -- even if the Tri values are identical;
   validate Tri in {YES,NO,UNKNOWN}; build the map from keys sorted code-point; if zero entries -> OMIT (never {})
6. declarations: identical algorithm (same collision error)
7. construct the normalized EligibilityPortfolio
8. strict schema validate (portfolioSchemaVersion="pagamenos.a2-portfolio.v1"; privacy - no PAN/CVV/credentials/transactions)
9. persist ONLY the normalized object
10. use ONLY the normalized object for: requestHash, domain reconciliation, finalization pinning, DecideInput.portfolio
```

**Post-trim map-key collision (frozen).** Two DISTINCT raw keys that trim to one normalized key **REJECT the entire profile** — never last-write-wins, never first-write-wins, never merge, never a JSON-order choice — even when the `Tri` values are identical. Test: `"membership:X"` and `" membership:X "` always raise `EligibilityProfileNormalizedKeyCollisionError`, for `privateStates` and `declarations` alike.

**Absent versus empty (frozen equivalence).** `memberships: undefined` is equivalent to `memberships: []` and to zero-after-normalization, and the field is **omitted** (never persisted as `[]`); a blank membership string is **rejected**, not silently erased. `privateStates: undefined` is equivalent to `{}`, and is **omitted** (never `{}`). `declarations: undefined` is equivalent to `{}`, and is **omitted**. An instrument `tier` that is absent stays omitted; a blank or whitespace-only `tier` is **invalid** and rejected, never treated as absent.

**No raw-order payload is ever persisted as scientific authority.** Two raw portfolios differing only by instrument order, membership order, duplicate memberships, duplicate identical instruments, or map-key order normalize to **identical** `portfolioJson`, hence an identical `requestHash` and the same domain reconciliation. Changing any semantic fact — `family`, `network`, a non-blank `tier`, a membership value, or a `Tri` value — changes the normalized JSON and the hash.

### 10.3 Injective, total instrument comparator (A2-PORTFOLIO-COMPARATOR-UNDERSPECIFIED — closed)

**`canonicalMembershipsSerialized`:**

```
canonicalMembershipsSerialized(instrument):
  memberships = instrument.memberships ?? []      // already normalized (trimmed, deduped, code-point sorted)
  return canonicalize(memberships)                // the accepted serializer, src/persistence/canonical.ts
```

`canonicalize` is the **existing accepted PagaMenos canonical JSON serializer** (`src/persistence/canonical.ts`): no delimiter joining, no locale-dependent serialization, no custom serializer, no `Array.toString()`, no enum-ordinal encoding. Because canonical JSON emits array structure and JSON string escaping, `["A,B"]` and `["A","B"]` serialize to **different** values, so the serialization is **injective** over the already-normalized membership array.

**`compareUnicodeCodePointStrings(a, b): -1 | 0 | 1`:**

```
A = Array.from(a); B = Array.from(b)      // Unicode code-point iteration
for i in 0 .. min(A.length, B.length)-1:
  cpA = A[i].codePointAt(0); cpB = B[i].codePointAt(0)
  if cpA < cpB: return -1
  if cpA > cpB: return 1
if A.length < B.length: return -1
if A.length > B.length: return 1
return 0
```

Lexicographic by Unicode scalar/code-point sequence. **Do NOT use** `localeCompare`, host locale, `Intl.Collator`, enum-ordinal ordering, implementation-defined sort, or UTF-8 byte locale collation. **No** NFC/NFD normalization is added: the accepted engine uses exact, case-sensitive string identity, so code-point-distinct but canonically equivalent Unicode strings remain distinct unless existing accepted validation already collapses them.

**`compareNormalizedEligibilityInstrumentV1(a, b)`:**

```
instrumentSortTuple(i) = [ i.family, i.network ?? "", i.tier ?? "", canonicalize(i.memberships ?? []) ]
compareNormalizedEligibilityInstrumentV1(a, b):
  A = instrumentSortTuple(a); B = instrumentSortTuple(b)
  for index in 0..3:
    c = compareUnicodeCodePointStrings(A[index], B[index])
    if c != 0: return c
  return 0
```

The tuple component order is frozen: (1) `family`, (2) `network ?? ""`, (3) `tier ?? ""`, (4) `canonicalize(memberships ?? [])`. The four components are compared **independently** and are never concatenated into one delimiter-separated string. Instrument ordering is therefore determined by explicit Unicode code-point comparison of the `family` string, **not** by enum declaration order.

**Comparator equality invariant (stated and tested):**

```
compareNormalizedEligibilityInstrumentV1(a, b) == 0  IFF  a and b are structurally identical normalized instruments
```

**Defense in depth:** if `comparator(a,b) == 0` but `canonicalize(a) != canonicalize(b)`, throw `EligibilityProfileInstrumentComparatorInvariantError` rather than relying on sort stability. This is unreachable for valid normalized V1 instruments but MUST be tested.

**Deduplication and sort order (frozen):**

```
raw instruments -> validate each -> normalize memberships -> normalize optional fields
-> produce normalized instrument objects
-> deduplicate structurally identical normalized instruments (equality of canonicalize(normalizedInstrument))
-> sort remaining instruments with compareNormalizedEligibilityInstrumentV1
-> persist
```

Deduplication is structural over the normalized representation via `canonicalize`, never over caller order or raw JSON bytes. No implementation choice is discretionary.

**Required attack tests.** Delimiter collision (`["A,B"]` versus `["A","B"]` must differ, comparator must not return 0); membership permutation and duplicates converge; instrument permutation yields byte-identical `portfolioJson`; provider-family ordering is by code point, not enum declaration order; Unicode and punctuation memberships (comma, quote, backslash, colon, brackets, non-ASCII) keep canonical JSON injective; the comparator equality invariant holds as a property test.

---

## 11. Exact `DecideInput` Construction Authority (A2-DG-02 core)

Every accepted `DecideInput` field, with authority. No field omitted; no "etc. / where available / as appropriate".

| `DecideInput` field | Req? | Authoritative persisted source | Trusted derivation at freeze | Correction semantics | In frozen JSON + hash? |
| :-- | :-- | :-- | :-- | :-- | :-- |
| `rules` | yes | accepted corpus `loadCorpus().activeRules` | complete active rule set for each required scope (§12); canonical order by `(ruleId, version)` | none post-freeze (immutable) | yes |
| `operationalStates` | yes | corpus `operationalStates` | **exactly one** op-state per included rule (§12.2, fail closed); canonical order by `(ruleId, version)` | immutable | yes |
| `scopes` | yes | corpus `scopes` | all merchant scopes RELEVANT to the derived context (`signatureRelevant`); canonical order by `scopeId` | immutable | yes |
| `portfolio` | yes | pinned `EligibilityProfileVersion.portfolioJson` | **`normalizeEligibilityPortfolioV1` applied before persistence (§10.2)**; parsed under `portfolioSchemaVersion` | new profile version pre-finalization only | yes |
| `context` | yes | finalized `PurchaseIntentContextVersion.purchaseSignatureJson` | **COMPLETE-SIGNATURE-ONLY (§9)**; flatten the one admitted family to `PurchaseContext` (§11.1) | new context version pre-finalization only | yes |
| `evaluatedAt` | yes | — | trusted service sample at freeze (the decision instant) | immutable | yes |
| `intendedTransactionAt` | yes | finalized context version | copied verbatim (zone-qualified) | via a new context version pre-finalization | yes |
| `selectedScopeId` | optional | — | **OMITTED (fixed A2 Phase-0A policy, §12.3)** | n/a | absent (frozen policy) |
| `holidayCalendar` | optional | **`HolidayCalendarVersion.normalizedDates` at `holidayCalendarVersion` (§13)**; content-bound registry digest | exact `dates[]` snapshotted verbatim; coverage-checked, fail closed out of range | immutable | yes (exact values) |
| `baselineByScopeId` | optional | — | **OMITTED (display-only `penSaved`; never a ranking key — §12.5)** | n/a | absent (frozen policy) |

### 11.1 Signature to `PurchaseContext` flattening (deterministic)

`merchantId`, `channel?`, `branch?` are copied. Then by `signature.kind`: **BILL** yields `{ wholeBillCentimos, foodCentimos?, nonAlcoholicBeverageCentimos?, purchaseDomain }`; **TICKETS** yields `{ ticketUnitPriceCentimos, ticketCount, ticketClass }`; **EXACT_ITEMS** yields `{ exactItems }`; **NOMINAL_PACKAGE** yields `{ nominalPackage }`. All other `PurchaseContext` fields remain `undefined` and are dropped by canonicalization.

### 11.2 The construction function

```
buildDecideInputFromFinalizedAuthorities({
  finalizedContextVersion,
  pinnedEligibilityProfileVersion,   // already normalized (§10.2)
  corpusSnapshot,
  holidayCalendarVersion, holidayCalendarDates,
  evaluatedAt
}): DecideInput
```

The output MUST: (1) cover every field in the table above; (2) be deterministic, with fixed canonical ordering of rules, scopes, operational states and instruments; (3) validate under `engineInputV1Schema` (`ENGINE_INPUT_SCHEMA_VERSION`); (4) require no mutable or current external fact after it returns; (5) be persisted immediately into `PurchaseIntentDecisionRequest.exactValidatedDecideInputJson`. The implementation is mechanical.

The DecisionRequest additionally stores `holidayCalendarVersion` alongside `expectedEngineInputSchemaVersion`, `expectedEngineContractVersion` and `expectedCorpusVersion`.

---

## 12. Corpus to `DecideInput` transformation (deterministic)

A pure function of `(finalized immutable A2 authorities, accepted corpus snapshot at freeze)`.

### 12.1 Steps

```
1  merchant = derivedContext.merchantId
2  selectedScopeId unset (§12.3) => requiredScopes = corpusSnapshot.scopes.filter(
       s => s.merchantId === merchant && signatureRelevant(s.signature, derivedContext))   -- ALL such scopes
3  scopes = requiredScopes sorted by scopeId
4  rules = corpusSnapshot.activeRules.filter(r => r.comparisonScopeRefs INTERSECT requiredScopeIds != empty)
       sorted by (ruleId, version)                                  -- the complete active set for each required scope
5  operationalStates = for each included rule, its op-state (ruleId+version) from corpusSnapshot,
       subject to the cardinality gate §12.2, sorted by (ruleId, version)
6  provider metadata is carried inside each RuleVersion (providerFamily, provenance) verbatim - no separate projection
7  portfolio / context / evaluatedAt / intendedTransactionAt / holidayCalendar per §11;
   selectedScopeId and baselineByScopeId omitted
```

A caller can never hide a relevant scope: the M3.5A provenance completeness check re-verifies the required set at execution. The exact output is persisted in the DecisionRequest; **a retry never re-runs this transformation** — it rehydrates the frozen JSON (§23). Canonical ordering makes `decideInputHash` stable.

### 12.2 Operational-state cardinality (fail closed)

At DecisionRequest construction:

```
includedRuleKeys = { ruleId@version : each included rule }
stateMultimap    = group corpusSnapshot.operationalStates by ruleId@version
for key in includedRuleKeys:
  n = |stateMultimap[key]|
  n == 0 -> throw PurchaseIntentCorpusOperationalStateIntegrityError('missing', key)
  n  > 1 -> throw PurchaseIntentCorpusOperationalStateIntegrityError('duplicate', key)
```

Exactly one operational state per included rule, else fail closed. **Never rely on the current corpus being coherent.**

**Orphan policy.** An operational state for a rule NOT in `includedRuleKeys` simply does not enter `DecideInput`; but the **corpus release/lint guard (§33.6)** globally rejects a duplicate op-state key, a missing state for an active rule, and an orphan state for a nonexistent active rule. The current corpus is 46 active rules and 46 states, so this is mechanically satisfiable.

### 12.3 `selectedScopeId` policy (frozen)

`selectedScopeId` is **always omitted (undefined)** by A2 in Phase 0A. A2 never preselects a scope; the engine evaluates all relevant scopes and may set `requiresScopeSelection`, which is recorded in the snapshot. Participant scope selection is not an A2 concern — it is a later B/UX matter, out of scope. This makes the required-scope set exactly "all relevant scopes for the merchant" (§12.1 step 2), and therefore deterministic.

### 12.4 Operational-state freeze

Operational states — publication, source-quality and availability axes, including `DYNAMIC_AVAILABILITY` and UNKNOWN advisories — are snapshotted **verbatim from the corpus snapshot at freeze** and are never re-fetched on crash retry. UNKNOWN or dynamic availability is represented exactly as the corpus op-state carries it; the engine's advisory semantics are preserved because the exact op-state rows are frozen into the input.

### 12.5 `baselineByScopeId` policy (frozen)

Omitted. Per the accepted engine, `baselineByScopeId` feeds only **display-only `penSaved`**, which is explanation / VS3 / RIVSR material and **never a ranking key** *(verified, `engine/types.ts`)*. It does not affect the decision or ranking, so A2 supplies nothing. This is distinct from C1/C2 `BaselineCorroboration`, a B/C evidence concept that is out of scope. Omission is engine-legal because the field is optional.

---

## 13. Holiday calendar authority (A2-DG-02c)

### 13.1 Verified engine facts

The corpus does **not** own a holiday calendar; each rule carries only `holidayPolicy` in `{NONE, EXCLUDED, SPECIFIC_DATES, UNKNOWN}` plus an optional per-rule `specificBlackoutDates` *(verified, `corpus/data/rules.ts`, `corpus/ids.ts`)*. `holidayCalendar` is a `decide()` input *(verified, `engine/decide.ts`: `new Set(input.holidayCalendar ?? [])`; `engine/time.ts` `evaluateHoliday`)*: `EXCLUDED` is BLOCKED if and only if `holidayCalendar.has(limaDate(intendedTransactionAt))`; `UNKNOWN` is UNCERTAIN only on a holiday date; `SPECIFIC_DATES` uses the rule's own dates; `NONE` is always ALLOWED.

An empty or incomplete calendar therefore silently makes EXCLUDED-policy rules ALLOWED on real holidays — a genuine decision difference. **The calendar is decision-critical and A2-owned.**

### 13.2 Versioned immutable holiday-calendar authority (static artifact, not a DB table)

```
HolidayCalendarVersion {           // design-time immutable fixture/registry (repository artifact)
  version               // "pagamenos.holiday.pe-lima-callao.private-commerce.v1"
  jurisdiction
  legalPolicyVersion
  coverageStartDate     // YYYY-MM-DD (Lima)
  coverageEndDate       // YYYY-MM-DD (Lima)
  normalizedDates: string[]   // sorted unique YYYY-MM-DD within coverage
  contentDigest
  sourceManifest        // provenance of the fixture
}
```

**No new DB table is required.** It is a **versioned static authority artifact** plus an immutable registry `HOLIDAY_CALENDAR_REGISTRY_V1: { version -> record }`.

### 13.3 Semantic policy (frozen)

> `holidayCalendar` contains statutory/public **feriados** that legally apply as feriados to ordinary **private-sector commercial activity** in Lima/Callao, Peru.
>
> **INCLUDE:** Peru national statutory public holidays applicable to private-sector workers, including movable statutory national holidays; a Lima/Callao-specific holiday ONLY if an enacted legal authority makes it a public holiday applicable to ordinary private-sector commerce in that jurisdiction and date.
>
> **EXCLUDE:** ordinary `día no laborable` (public-sector) declarations; optional private-sector non-working days dependent on employer/worker agreement; compensable public-sector-only non-working days; banking-only holidays; government-office closures that are not legal private-sector feriados; school holidays; commemorative dates without private-sector feriado legal effect.
>
> `feriado` is never conflated with `día no laborable`. An exceptional measure classifying a private-sector-mandatory date as something other than a statutory feriado is documented separately, never silently included.

### 13.4 Source conflict hierarchy (frozen)

1. enacted law, legislative decree, or official legal amendment;
2. a later specific legal norm prevails over an earlier general norm where legally applicable;
3. an official consolidated government holiday page may *instantiate* dates but never override enacted legal text;
4. SUNAFIL/MTPE guidance is interpretive evidence for private-sector applicability;
5. a material conflict between authoritative sources means declaring `HOLIDAY_AUTHORITY_CONFLICT` and failing the fixture gate.

Each included holiday records its establishing legal authority (§13.7). **No `HOLIDAY_AUTHORITY_CONFLICT` was encountered** authoring this fixture.

### 13.5 Coverage (frozen absolute range)

`coverageStartDate = 2026-01-01`, `coverageEndDate = 2027-12-31`, deliberately broader than the expected Phase-0A study period and independent of any production-protocol freeze. A2 Phase-0A MUST reject a finalized `intendedTransactionAt` whose America/Lima calendar date falls outside `[2026-01-01, 2027-12-31]` with `PurchaseIntentHolidayCoverageError`. There is no undefined future horizon and no dynamic derivation from the (unfrozen) production protocol. **Out-of-range dates are never silently treated as non-holidays.**

### 13.6 Movable holidays (Gregorian computus; verified)

Jueves Santo and Viernes Santo are statutory feriados (DL 713) whose calendar dates follow Gregorian Easter. Computed with the Anonymous Gregorian algorithm: **Easter 2026 = 2026-04-05**, so Jueves Santo is **2026-04-02** and Viernes Santo is **2026-04-03**; **Easter 2027 = 2027-03-28**, so Jueves Santo is **2027-03-25** and Viernes Santo is **2027-03-26**. The fixture contains the exact instantiated dates; there is **no runtime computation**.

### 13.7 Lima/Callao local determination

**No additional Lima/Callao-local private-sector public holidays are included for this fixture.** Basis: Peru's national feriado regime (DL 713 Art. 6 plus the national amending laws below) governs private-sector feriados, and no enacted Lima Metropolitan or Callao regional norm within `[2026-01-01, 2027-12-31]` establishes a feriado applicable to ordinary private commerce beyond the national set. Municipal and regional anniversaries and commemorative dates do not carry private-sector feriado legal effect and are excluded. The fixture-gate obligation (§13.10) requires an independent reviewer to re-confirm that no qualifying local norm exists within coverage.

### 13.8 `A2 HOLIDAY CALENDAR FIXTURE V1` — actual dates and provenance

```
version           = "pagamenos.holiday.pe-lima-callao.private-commerce.v1"
jurisdiction      = "PE-LIMA-CALLAO-PRIVATE-COMMERCE"
legalPolicyVersion= "dl713-art6+ley31381+ley31530+ley31788+ley31822.v1"
coverageStartDate = "2026-01-01"
coverageEndDate   = "2027-12-31"
applicability (every entry) = PRIVATE_SECTOR_PUBLIC_HOLIDAY
```

| date | holidayCode | holidayName | authorityRefs |
| :-- | :-- | :-- | :-- |
| 2026-01-01 | PE_ANIO_NUEVO | Año Nuevo | DL 713 Art.6 |
| 2026-04-02 | PE_JUEVES_SANTO | Jueves Santo (movable; Easter 2026-04-05) | DL 713 Art.6 |
| 2026-04-03 | PE_VIERNES_SANTO | Viernes Santo (movable) | DL 713 Art.6 |
| 2026-05-01 | PE_DIA_DEL_TRABAJO | Día del Trabajo | DL 713 Art.6 |
| 2026-06-07 | PE_BATALLA_ARICA_BANDERA | Batalla de Arica y Día de la Bandera | Ley 31788 |
| 2026-06-29 | PE_SAN_PEDRO_SAN_PABLO | San Pedro y San Pablo | DL 713 Art.6 |
| 2026-07-23 | PE_FUERZA_AEREA_QUINONES | Día de la Fuerza Aérea del Perú (Cap. FAP J.A. Quiñones) | Ley 31822 |
| 2026-07-28 | PE_FIESTAS_PATRIAS_28 | Fiestas Patrias (Independencia) | DL 713 Art.6 |
| 2026-07-29 | PE_FIESTAS_PATRIAS_29 | Fiestas Patrias | DL 713 Art.6 |
| 2026-08-06 | PE_BATALLA_JUNIN | Batalla de Junín | Ley 31530 |
| 2026-08-30 | PE_SANTA_ROSA_LIMA | Santa Rosa de Lima | DL 713 Art.6 |
| 2026-10-08 | PE_COMBATE_ANGAMOS | Combate de Angamos | DL 713 Art.6 |
| 2026-11-01 | PE_TODOS_LOS_SANTOS | Día de Todos los Santos | DL 713 Art.6 |
| 2026-12-08 | PE_INMACULADA_CONCEPCION | Inmaculada Concepción | DL 713 Art.6 |
| 2026-12-09 | PE_BATALLA_AYACUCHO | Batalla de Ayacucho | Ley 31381 |
| 2026-12-25 | PE_NAVIDAD | Navidad | DL 713 Art.6 |
| 2027-01-01 | PE_ANIO_NUEVO | Año Nuevo | DL 713 Art.6 |
| 2027-03-25 | PE_JUEVES_SANTO | Jueves Santo (movable; Easter 2027-03-28) | DL 713 Art.6 |
| 2027-03-26 | PE_VIERNES_SANTO | Viernes Santo (movable) | DL 713 Art.6 |
| 2027-05-01 | PE_DIA_DEL_TRABAJO | Día del Trabajo | DL 713 Art.6 |
| 2027-06-07 | PE_BATALLA_ARICA_BANDERA | Batalla de Arica y Día de la Bandera | Ley 31788 |
| 2027-06-29 | PE_SAN_PEDRO_SAN_PABLO | San Pedro y San Pablo | DL 713 Art.6 |
| 2027-07-23 | PE_FUERZA_AEREA_QUINONES | Día de la Fuerza Aérea del Perú | Ley 31822 |
| 2027-07-28 | PE_FIESTAS_PATRIAS_28 | Fiestas Patrias (Independencia) | DL 713 Art.6 |
| 2027-07-29 | PE_FIESTAS_PATRIAS_29 | Fiestas Patrias | DL 713 Art.6 |
| 2027-08-06 | PE_BATALLA_JUNIN | Batalla de Junín | Ley 31530 |
| 2027-08-30 | PE_SANTA_ROSA_LIMA | Santa Rosa de Lima | DL 713 Art.6 |
| 2027-10-08 | PE_COMBATE_ANGAMOS | Combate de Angamos | DL 713 Art.6 |
| 2027-11-01 | PE_TODOS_LOS_SANTOS | Día de Todos los Santos | DL 713 Art.6 |
| 2027-12-08 | PE_INMACULADA_CONCEPCION | Inmaculada Concepción | DL 713 Art.6 |
| 2027-12-09 | PE_BATALLA_AYACUCHO | Batalla de Ayacucho | Ley 31381 |
| 2027-12-25 | PE_NAVIDAD | Navidad | DL 713 Art.6 |

32 sorted unique dates; per-year count 16 (14 fixed statutory plus 2 movable).

**sourceManifest** (first-party government authorities; research/access date **2026-09-02**):

- **Decreto Legislativo N° 713, Art. 6** (consolidated feriados regime) — Diario Oficial El Peruano normative database, `https://diariooficial.elperuano.pe/Normas/obtenerDocumento?idNorma=110007`; congressional copy `https://www.leyes.congreso.gob.pe/Documentos/DecretosLegislativos/00713.pdf`.
- **Ley N° 31788** — 7 June feriado (Batalla de Arica / Día de la Bandera): `https://busquedas.elperuano.pe/dispositivo/NL/2187453-1`.
- **Ley N° 31822** (2023) — 23 July feriado nacional (Día de la Fuerza Aérea / Cap. FAP J.A. Quiñones), private and public sector; corroborated by TVPerú `https://tvperu.gob.pe/noticias/nacionales/es-oficial-declaran-feriado-nacional-el-23-de-julio-por-el-dia-de-la-fuerza-aerea-del-peru` and Diario Oficial El Peruano.
- **Ley N° 31530** (2022) — 6 August feriado (Batalla de Junín): `https://busquedas.elperuano.pe/dispositivo/NL/2089960-2`.
- **Ley N° 31381** (2021) — 9 December feriado (Batalla de Ayacucho): `https://busquedas.elperuano.pe/dispositivo/NL/2026913-1`.
- Consolidated corroboration: gob.pe Plataforma del Estado (`https://www.gob.pe/feriados`) and SUNAFIL/MTPE 2026 feriado guidance (interpretive private-sector applicability).

**Authoring transparency (honest provenance, carried verbatim in substance).** `https://www.gob.pe/feriados` returned HTTP 418 (bot protection) during authoring, so enacting-law identities were confirmed via the Diario Oficial El Peruano official normative database (`busquedas.elperuano.pe/dispositivo/NL/...`, first-party) plus gob.pe, TVPerú and SUNAFIL corroboration; movable dates were derived by the Gregorian computus (§13.6). The fixture gate (§13.10) requires an independent reviewer to re-verify each enacting law's official text and the Lima/Callao determination before the fixture is accepted. This is a bounded data-authoring artifact, **not** a research phase.

### 13.9 Normalization and content digest (reproducible)

```
normalizeHolidayCalendarV1(rawDates):
  parse strict YYYY-MM-DD; reject invalid; deduplicate; sort code-point (== chronological for ISO dates)

holidaySemanticPayload = {
  versionedPolicy: legalPolicyVersion,
  jurisdiction, coverageStartDate, coverageEndDate,
  normalizedDates
}
contentDigest = "sha256:" + SHA-256( canonical(holidaySemanticPayload) )   // accepted src/persistence/canonical.ts + hash.ts
```

Canonical preimage (keys code-point-sorted, arrays preserved, JSON-escaped strings):

```
{"coverageEndDate":"2027-12-31","coverageStartDate":"2026-01-01","jurisdiction":"PE-LIMA-CALLAO-PRIVATE-COMMERCE","normalizedDates":["2026-01-01","2026-04-02","2026-04-03","2026-05-01","2026-06-07","2026-06-29","2026-07-23","2026-07-28","2026-07-29","2026-08-06","2026-08-30","2026-10-08","2026-11-01","2026-12-08","2026-12-09","2026-12-25","2027-01-01","2027-03-25","2027-03-26","2027-05-01","2027-06-07","2027-06-29","2027-07-23","2027-07-28","2027-07-29","2027-08-06","2027-08-30","2027-10-08","2027-11-01","2027-12-08","2027-12-09","2027-12-25"],"versionedPolicy":"dl713-art6+ley31381+ley31530+ley31788+ley31822.v1"}
```

```
contentDigest = sha256:6d65409665d176d40390be4ed8414dc22e4ab9d11b40ede1d38abb7b258460d8
```

Any change to a date, jurisdiction, coverage or policy changes the digest and **REQUIRES a new `version`**. The digest is byte-reproducible by anyone from the preimage above.

### 13.10 Version immutability and registry record

`version` MUST change if any included date changes, an omitted date becomes included, or jurisdiction, applicability, coverage or policy changes.

```
HOLIDAY_CALENDAR_REGISTRY_V1["pagamenos.holiday.pe-lima-callao.private-commerce.v1"] = {
  version, digest: "sha256:6d654096...60d8",
  jurisdiction: "PE-LIMA-CALLAO-PRIVATE-COMMERCE",
  legalPolicyVersion: "dl713-art6+ley31381+ley31530+ley31788+ley31822.v1",
  coverageStartDate: "2026-01-01", coverageEndDate: "2027-12-31"
}
```

### 13.11 DecisionRequest self-integrity and finalization gate

The DecisionRequest stores `holidayCalendarVersion` and the exact `normalizedDates` inside the frozen `DecideInput.holidayCalendar`.

Self-integrity, per load: (1) load the accepted registry record for the stored version from the application's retained `HOLIDAY_CALENDAR_REGISTRY_V1`; (2) recompute the semantic digest from the frozen `normalizedDates` plus the record's `versionedPolicy`, `jurisdiction` and coverage; (3) compare to the registered digest; (4) fail closed on mismatch. **No current holiday-source lookup on retry.** The current-runtime gate does **not** compare a current holiday version, because the exact dates are frozen and bound by `decideInputHash`.

At finalization/freeze: convert `intendedTransactionAt` to a Lima date; verify coverage (else `PurchaseIntentHolidayCoverageError`); copy the pinned version's `normalizedDates` into `DecideInput`; persist `holidayCalendarVersion`; hash the full `DecideInput`.

### 13.12 Corpus versus holiday (no conflation)

`corpusId` tracks corpus decision content (§33); `holidayCalendarVersion` and its digest track the calendar; the exact holiday dates live inside the frozen `DecideInput`; the M3.5A `inputHash` binds both. **Holiday dates are not part of the corpus semantic digest** — the corpus does not own them. Holiday changes never imply a `corpusId` change, and the reverse also holds.

### 13.13 Holiday tests

A reviewer reproduces the exact fixture from the cited authorities; all dates are sorted and unique; mutating one date changes the digest; editing a date plus the local registry under the same version fails against the external base comparison (§34); coverage boundaries are exact; a date outside coverage fails closed; known statutory holiday membership is correct (for example `2026-07-28` present, `2026-04-03` present) and an ordinary non-holiday is absent (for example `2026-07-27`, a public-sector *día no laborable*, excluded); a public-sector-only day is excluded; an optional-agreement day is excluded; a retry uses frozen dates despite a current-calendar change; a known holiday drives `holidayPolicy` consistently in the engine (EXCLUDED to BLOCKED, UNKNOWN to UNCERTAIN); the version cannot mutate.

---

## 14. Correlation-key and label contracts

### 14.1 `clientCorrelationNonce`

Opaque, high-entropy (at least 128-bit) random material, formatted like the project's other opaque keys; not PII; generated by the controlled client before the first `issueIntentCaptureKey`; persisted client-side until capture creation resolves; reused only for retries of that exact capture; a genuinely new capture uses a new nonce.

Issuance carries no material beyond `(assignment, nonce)`, so the same `(assignment, nonce)` always returns the same token and never a conflict; materially different initialization surfaces only at `createPurchaseIntent`, where a different `intentType` on the same token raises `PurchaseIntentCaptureConflictError` (§5.2). No merchant or time heuristics.

### 14.2 `contextCaptureKey` / `profileCaptureKey`

Opaque correlation values; client-persisted before the append; reused only for an exact retry; a new correction or update uses a new key; **field equality never defines identity**. The same key with a materially different payload means: on the same transport key, an idempotency conflict; on a different transport key, a **domain conflict** (`PurchaseIntentContextConflictError` / `EligibilityProfileConflictError`) — **never an alias**.

### 14.3 Historical label grammar (H05)

`expectedEngineContractVersion`, `expectedCorpusVersion`, `expectedEngineInputSchemaVersion` and `holidayCalendarVersion` are stored as `String` (Postgres `TEXT`, matching the accepted M3.5A version columns which are unbounded `TEXT`). They are validated as UTF-8, trimmed, non-empty, with a defensive service-level maximum of 128 characters — an A2 service validation, **not** a DB narrowing that would diverge from the accepted TEXT columns.

Self-integrity validates grammar only and **never** requires current-runtime equality (§20). `expectedEngineInputSchemaVersion` additionally must resolve to a retained versioned parser (§17), which is a stronger requirement than grammar.

---

## 15. A2-DG-04 — Complete context request hash

**Rule.** Every persisted MATERIAL field of one context version participates in context-domain reconciliation and `requestHash`, unless it is an internally sampled or derived output (`id`, `contextSeq`, `capturedAt`, `recordedAt`). Semantically unordered collections are canonicalized (code-point key sort; `exactItems` sorted by `itemKey`) before hashing.

| Context field | source | persisted? | material? | in requestHash? | in domain reconciliation? |
| :-- | :-- | :-- | :-- | :-- | :-- |
| `contextCaptureKey` | client correlation | yes | yes (identity) | yes | yes (`UNIQUE(intentId, contextCaptureKey)`) |
| `contextSchemaVersion` | A2 constant | yes | yes | yes | compared |
| `merchantId` | participant | yes | yes | yes | compared |
| `signatureKind` | derived from signature | yes | yes | yes | compared |
| `intendedTransactionAt` | participant | yes | yes | yes | compared |
| `purchaseSignatureJson` (incl. `channel`, `branch`, `wholeBill`/`food`/`nonAlc`, `ticket*`, `exactItems`, `purchaseDomain`, `nominalPackage`) | participant | yes | yes | yes (canonicalized) | compared (payload equality) |
| `contextSeq` / `capturedAt` / `recordedAt` | internal | yes | no (sampled/derived) | no | no |

The former `locationRef` no longer exists; its role is the accepted `branch`, which sits inside `purchaseSignatureJson` and is fully hashed.

**Required property/table-driven test:** for every persisted material field F, holding `idempotencyKey` and `contextCaptureKey` fixed and changing only F, `requestHash` MUST change and an idempotency or domain conflict MUST result.

### 15.1 Trusted server-derived fields

If a context or portfolio field is server-derived rather than participant-authored, and changing it changes the durable scientific fact or the eventual `DecideInput`, it MUST be part of exact domain reconciliation; the transport `requestHash` incorporates the **trusted resolved value**, not raw request input, so a retry under changed server context never silently acknowledges a different scientific fact. The only server-derived capture field is `entrySource`, which lives on the immutable token and is bound via the create hash's token identity (§39).

---

## 16. M3.5A idempotency identity; `PurchaseIntentDecisionRequest`

```
m3_5aIdempotencyKey = "pagamenos:study-intent-decision-idem:v1:" + PurchaseIntent.id
businessDecisionKey = "pagamenos:study-intent-decision:v1:"      + PurchaseIntent.id
```

One deterministic key per intent, so the M3.5A alias path is never exercised and there is exactly one `(businessDecisionKey, m3_5aIdempotencyKey)` pairing per intent.

```
PurchaseIntentDecisionRequest {
  id                             PK UUID
  intentId                       UNIQUE FK -> PurchaseIntent
  finalizationId                 UNIQUE FK -> PurchaseIntentFinalization
  decisionRequestSchemaVersion   -- "pagamenos.intent-decision-request.v1"
  exactValidatedDecideInputJson  JSONB                 -- normalized validated DecideInput
  decideInputHash                -- SHA-256(canonical(...)) == M3.5A inputHash/requestHash
  expectedEngineInputSchemaVersion / expectedEngineContractVersion / expectedCorpusVersion   -- pins (§17)
  holidayCalendarVersion         -- pin for the frozen calendar (§13)
  businessDecisionKey  UNIQUE ; m3_5aIdempotencyKey UNIQUE
  createdAt            TIMESTAMPTZ trusted
  @@unique([intentId, id])       -- lets a composite relation target it if ever needed; harmless (§21)
}   -- append-only
```

JSONB is a normalized semantic value, not preserved text. The frozen invariant is that it reparses under the versioned parser (§23) to the exact validated `DecideInput` and re-hashes to `decideInputHash`.

---

## 17. Version pinning, loadability and parser retention

Three separated concerns:

- **(a) Request self-integrity (§20):** engine, corpus and holiday pins are validated as opaque well-formed labels, with no current support required; `expectedEngineInputSchemaVersion` must resolve to a retained parser.
- **(b) Current-execution compatibility (fresh run only):** `assertCurrentRuntimeMatchesDecisionRequest` requires the current `ENGINE_INPUT_SCHEMA_VERSION` **and** `ENGINE_CONTRACT_VERSION` **and** `corpusId` to equal the pins, else fail closed (`PurchaseIntentSemanticDriftError`) — no `decideAndPersist` call, no snapshot written.
- **(c) Historical-snapshot coherence (§18):** a bound snapshot's stamped `engineContractVersion`, `corpusVersion` and `engineInputSchemaVersion` equal the pins, whether found or fresh.

**Retention (verified loadability, §3.3).** Because M3.5A pins snapshot version fields with `z.literal(current)`, a stored snapshot loads only while the build recognizes its stamps. Obligations: deployments retain the input parser for any input schema pinned by a still-repairable request, else fail closed with `PurchaseIntentUnsupportedInputSchemaError`; and they inherit M3.5A's documented version-dispatch retention so a still-bindable snapshot remains loadable, otherwise `findExactHistoricalDecision` fails closed with `...HistoricalSnapshotUnloadableError`, **never silently**. The common redeploy (bug fix, new `gitSha`, no version bump) is unaffected.

### 17.1 Semantic-pin table

| Authority | self-integrity | current == pins before fresh run | historical stamp == pins |
| :-- | :-- | :-- | :-- |
| `ENGINE_INPUT_SCHEMA_VERSION` | retained parser | **YES** | **YES** |
| `ENGINE_CONTRACT_VERSION` | well-formed label | **YES** | **YES** |
| `corpusVersion` (`corpusId`) | well-formed label | **YES** | **YES** |
| `holidayCalendarVersion` | well-formed label + registry digest recompute (§13.11) | n/a (values frozen in input) | n/a (values in input, hashed) |
| canonicalization | frozen / non-versioned | n/a | n/a (the hash proves it) |
| `gitSha` / `buildId` | not pinned | no | no |
| `ENGINE_OUTPUT_SCHEMA_VERSION` / `SNAPSHOT_SCHEMA_VERSION` | not pinned by A2 | no (affects loadability, §17) | recorded; M3.5A verifies on load |

---

## 18. Exact snapshot coherence (unified predicate)

For request `R` and snapshot `S`, ALL must hold:

1. `S.businessDecisionKey == R.businessDecisionKey`;
2. a receipt exists for `(DECISION_PERSIST_V1, R.m3_5aIdempotencyKey)`;
3. `receipt.decisionSnapshotId == S.id`;
4. `receipt.requestHash == R.decideInputHash`;
5. `S.inputHash == R.decideInputHash`;
6. `S.engineContractVersion == R.expectedEngineContractVersion`;
7. `S.corpusVersion == R.expectedCorpusVersion`;
8. `S.engineInputSchemaVersion == R.expectedEngineInputSchemaVersion`;
9. `verifyHistoricalSnapshot(S)` passes (loading requires the stamps to be recognized, §17).

The current runtime need not equal `S`'s stamps when `S` exists. Same merchant, similar input, amount or time **never** suffices.

Typed conflicts: `...BindingBusinessKeyMismatchError` (1); `...BindingReceiptMismatchError` (2/3/4); `...BindingInputHashMismatchError` (5); `...BindingSemanticMismatchError` (6/7/8); M3.5A integrity/coherence/unloadable (9).

---

## 19. `findExactHistoricalDecision` (owns the full predicate)

```
findExactHistoricalDecision({ businessDecisionKey, idempotencyKey, inputHash,
  expectedEngineContractVersion, expectedCorpusVersion, expectedEngineInputSchemaVersion })
  -> { kind:'NONE' } | { kind:'FOUND'; snapshot } | throw typed CONFLICT
```

READ ONLY: no engine, corpus, provider or build access; no write. `NONE` if and only if there is no receipt AND no business-key snapshot. Otherwise verify clauses 1–9 (§18):

- a load that throws for unrecognized stamps yields `...HistoricalSnapshotUnloadableError` (CONFLICT, **never** NONE);
- receipt pointing at a missing snapshot yields `...ReceiptDanglingError`;
- a business-key snapshot without a receipt yields `...SnapshotWithoutReceiptError`;
- a receipt present with a business-key snapshot of a different `inputHash` yields `...BusinessKeyConflictError`;
- a stamp not equal to the pins yields `...HistoricalSemanticMismatchError`.

Added additively in `services/decide-and-persist.ts`; **not** on the public barrel; importable only by `services/study-intent-decision.ts` (§28). **NONE versus CONFLICT is normative:** corrupted, partial or unloadable state is never NONE.

---

## 20. `verifyPurchaseIntentDecisionRequest` (self-integrity; fail closed)

1. the intent exists;
2. the finalization exists and is for the same intent;
3. the finalization's `contextVersionId` **and** `eligibilityProfileVersionId` exist and belong to the same intent/assignment;
4. `deriveBusinessDecisionKey(intentId) == stored`;
5. `deriveM3_5aIdempotencyKey(intentId) == stored`;
6. `decisionRequestSchemaVersion` is supported;
7. `expectedEngineInputSchemaVersion` selects a retained parser, else fail closed;
8. `exactValidatedDecideInputJson` parses under that parser;
9. `canonicalHash(parsed) == decideInputHash`;
10. `expectedEngineContractVersion`, `expectedCorpusVersion` and `holidayCalendarVersion` are well-formed frozen labels (§14.3), and the frozen holiday dates recompute to the registered digest (§13.11);
11. **do NOT require (10) to equal the current runtime.**

Cross-table checks 1–3 run under a read transaction; 4–10 are pure. The three concerns — self-integrity, current-execution compatibility, historical-snapshot coherence — stay separate.

---

## 21. Boundary and Prisma implementability (H01: Prisma 6.19.3)

Additive only. Virtual Prisma back-relations (no SQL column, no accepted stored/migration/economic change), required by the Prisma 6.19.3 opposite-relation rule: on `ExperimentAssignment` (A1) — `purchaseIntentCaptureTokens` and `eligibilityProfileVersions`; on `DecisionSnapshot` (M3.5A) — `purchaseIntentDecisionBinding`.

FK scalars (`captureTokenId`, `assignmentId`, `decisionRequestId`, `snapshotId`, `intentId`, `finalizationId`, `contextVersionId`, `eligibilityProfileVersionId`) live on A2 child tables. Each A2-to-A2 or A2-to-M3.5A relation uses a **single scalar** per relation, with no scalar shared across two relations, so Prisma 6.19.3 validates; the cross-wiring-free binding shape (§7) is the key example.

`findExactHistoricalDecision` is the only M3.5A change — an additive read function. `prisma validate` plus the migration-versus-schema diff (`pnpm db:migrate:check`) stay clean. "M3.5A/A1 untouched" means no persisted, stored, economic or migration mutation; **a virtual relation field is not a mutation** (SCI-A2-13).

---

## 22. Crash-repair saga (state-sensitive; Case C consent-independent)

`decideForPurchaseIntent({ intentId })` — a trusted internal operation; no caller input, engine, corpus, key or `snapshotId`; **no consent read** (§6).

- **Case A — binding exists:** `verifyPurchaseIntentDecisionBinding(binding, intentId)` (§7.1), then return `S`. No engine call, regardless of later withdrawal or invalidation.
- **Case B — request exists, no binding:** `verifyPurchaseIntentDecisionRequest` (§20); then `findExactHistoricalDecision` (§19): **FOUND** goes to §18, bind, return; **NONE** goes to `assertCurrentRuntimeMatchesDecisionRequest` (§17b, fail closed on drift), rehydrate (§23), `decideAndPersist`, §18, bind, return; **CONFLICT** fails closed. No consent read.
- **Case C — request absent:** under the `PurchaseIntent` **root lock only** (not new collection, so no assignment lock for consent; §42): require **finalized AND no explicit `PurchaseIntentInvalidation`** (withdrawal alone does NOT block); load the exact pinned `contextVersion` and `eligibilityProfileVersion` (immutable); freeze and create one DecisionRequest (§41); COMMIT; continue at Case B. **No current-consent read.**

### 22.1 Invalidation / withdrawal against decision

| State | explicit invalidation? | New request? | Consent read? | Result |
| :-- | :-- | :-- | :-- | :-- |
| not finalized | any | no | no | `PurchaseIntentNotFinalizedError` |
| finalized, no request, participant withdrawn, not invalidated | no | **yes (Case C)** | **no** | request created, then decision (internal processing) |
| finalized, no request, explicitly invalidated | yes | no | no | `PurchaseIntentInvalidatedError` |
| request, no snapshot | — | n/a | no | complete internally (finder, gate, decide, bind) |
| request, snapshot, no binding | — | n/a | no | bind (FOUND); the engine is not rerun |
| binding exists | — | n/a | no | return the historical binding (verified) |

---

## 23. Concurrency, locking and rehydration

Global order `ExperimentAssignment ≺ PurchaseIntent root (UUID ascending) ≺ children` (§4). NEW-fact participant writes (create, context, eligibility-profile, finalize, invalidate) take the assignment lock first (§4).

**Case C** (DecisionRequest freeze) is internal, not new collection, and takes the **root lock only**. It serializes against invalidation on the root: invalidation takes assignment then root, Case C takes root only, so they contend on the root with no inversion, because Case C never grabs the assignment while holding the root. The invalidation lineage/cycle walk holds `ExperimentAssignment FOR UPDATE` (§24). `decideAndPersist` runs outside any A2 lock. Binding is a short transaction on `UNIQUE(decisionRequestId)` / `UNIQUE(snapshotId)` with exact P2002 discrimination (§27).

**Rehydration (no direct cast):**

```
1 load request
2 verifyPurchaseIntentDecisionRequest
3 dispatch the versioned parser by expectedEngineInputSchemaVersion
4 typed DecideInput
5 recompute the canonical hash
6 compare to decideInputHash
7 only then decideAndPersist
```

**Never** cast JSONB directly; **never** reconstruct from current context, portfolio or corpus.

---

## 24. Invalidation cycle prevention

Serialize on `ExperimentAssignment FOR UPDATE` — all replacements share one assignment, resolved via each intent's capture token. Under the lock: apply §4 replay/alias for an already-durable invalidation; assert the invalidated intent belongs to A and is not already invalidated (`UNIQUE(invalidatedIntentId)`); if `replacementIntentId` is present, assert its assignment (via its token) equals A, that it differs from `invalidatedIntentId` (CHECK), and walk the existing replacement lineage rejecting any edge that makes `invalidatedIntentId` reachable from `replacementIntentId` (`PurchaseIntentInvalidationCycleError`); as a NEW fact, sample time and consent (§4); append the invalidation and its receipt.

Covers `A→A`, `A→B` plus `B→A`, `A→B→C` plus `C→A`, and concurrent cycles (serialized).

```
PurchaseIntentInvalidation {
  id, invalidatedIntentId UNIQUE FK, replacementIntentId? FK, invalidatedAt,
  reasonCode? enum, CHECK(replacement <> invalidated)
}   -- append-only
```

This is **intent-replacement history only** (§44).

---

## 25. Receipts and `resultKind` (an alias never resamples capture time)

Strong-FK receipt families for externally triggered writes that create a fact: `operationScope`, transport `idempotencyKey`, `requestHash` (§26), a concrete target FK, `createdAt`, `UNIQUE(operationScope, idempotencyKey)`, append-only.

| Receipt | operationScope | Target FK | resultKind |
| :-- | :-- | :-- | :-- |
| `PurchaseIntentCreateReceipt` | `INTENT_CREATE_V1` | `intentId` | `CREATED` · `CAPTURE_ALIAS` |
| `PurchaseIntentContextCommandReceipt` | `INTENT_CONTEXT_APPEND_V1` | `contextVersionId` | `APPENDED` · `CONTEXT_ALIAS` |
| `EligibilityProfileCommandReceipt` | `ELIGIBILITY_PROFILE_APPEND_V1` | `eligibilityProfileVersionId` | `APPENDED` · `PROFILE_ALIAS` |
| `PurchaseIntentFinalizationReceipt` | `INTENT_FINALIZE_V1` | `finalizationId` | `FINALIZED` · `FINALIZE_ALIAS` |
| `PurchaseIntentInvalidationReceipt` | `INTENT_INVALIDATE_V1` | `invalidationId` | `INVALIDATED` · `INVALIDATE_ALIAS` |

`resultKind` is the durable effect of the command in THIS receipt row. A same-key replay creates **no** new receipt (it returns the existing one plus a transient `replayed:true`). A different-key domain alias creates a new receipt with the `*_ALIAS` value and **never resamples** the original fact's `capturedAt` / `initiatedAt`; the alias receipt's `createdAt` is transport/audit metadata, **not** scientific capture time.

`PurchaseIntentCaptureToken` issuance and the internal `PurchaseIntentDecisionRequest` / `PurchaseIntentDecisionBinding` have **no** transport receipt — idempotency is their UNIQUE constraints.

---

## 26. Request-hash completeness matrices

Every persisted material field participates; internally sampled or derived fields are excluded. The `op` discriminator and the trusted `{participantId}` context are always included.

- **capture-token issuance (domain identity, no receipt):** `(assignmentId, clientCorrelationNonce)` UNIQUE. `entrySource` and `intentCaptureKey` are server-derived outputs, not issuance identity.
- **`createPurchaseIntent`:** `intentCaptureKey` (which implies the immutable token, hence assignment and `entrySource`), `intentType`.
- **`appendPurchaseIntentContext`:** `intentId`, `contextCaptureKey`, `contextSchemaVersion`, `merchantId`, `signatureKind`, `intendedTransactionAt`, canonicalized `purchaseSignatureJson`.
- **`appendEligibilityProfile`:** `assignmentId`, `profileCaptureKey`, `portfolioSchemaVersion`, canonicalized **normalized** `portfolioJson` (§10.2).
- **`finalizePurchaseIntent`:** `intentId`, `contextVersionId`, `eligibilityProfileVersionId`.
- **`invalidatePurchaseIntent`:** `intentId`, `replacementIntentId?`, `reasonCode?`.

For each, a **mutation test**: changing any one material field flips the hash and produces a conflict; collection-typed fields are normalized first. `entrySource` is not redundantly hashed on create because the token identity already fixes an immutable `entrySource` (§39); if it is included as defense in depth it uses the trusted resolved value, never body input.

---

## 27. P2002 discrimination — reload-and-prove (H02)

**Correctness comes from reloaded domain facts, not driver metadata.** `e.meta?.target` is only a hint.

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

| Operation | Reload-and-prove | Reconcile if and only if | Else |
| :-- | :-- | :-- | :-- |
| capture-token issuance | `(assignmentId, clientCorrelationNonce)` | exactly one token matches the nonce identity | `intentCaptureKey` collision with no nonce match means an invariant failure |
| `createPurchaseIntent` | by `captureTokenId` | first-committed material (§35) matches | fail closed |
| context append | `(intentId, contextCaptureKey)` plus the intended `contextSeq` candidate | capture-key identity matches and payload is equal | an `(intentId, contextSeq)` collision alone means **retry allocation under lock**, not alias |
| eligibility-profile append | `(assignmentId, profileCaptureKey)` plus the `profileSeq` candidate | capture-key identity matches and payload is equal | a seq collision means retry allocation |
| finalization | by `intentId` | `contextVersionId` and `eligibilityProfileVersionId` are equal | conflict |
| receipts | exact `(operationScope, idempotencyKey)` | the request hash matches | conflict |
| DecisionRequest | by `intentId`, `businessDecisionKey`, `m3_5aIdempotencyKey` | all three resolve to the SAME row coherently | fail closed |
| Binding | by `decisionRequestId` and by `snapshotId` | both resolve to the SAME binding and `verifyPurchaseIntentDecisionBinding` passes | typed binding conflict |

Required tests: normal `meta.target`; target absent; target malformed; an unrelated unique violation; multiple conflicting rows via a direct-SQL probe, which must produce no wrong alias; and a legitimate expected race that still converges when metadata is absent.

---

## 28. Trusted capability matrix

| Capability | Operation | Allowed importer | Forbidden |
| :-- | :-- | :-- | :-- |
| PurchaseIntentCapture | `issueIntentCaptureKey`, `createPurchaseIntent`, `appendPurchaseIntentContext`, `appendEligibilityProfile` | `services/study-purchase-intent.ts` | app/participant raw; other services |
| PurchaseIntentFinalization | `finalizePurchaseIntent` | `services/study-purchase-intent.ts` | same |
| PurchaseIntentAdministration | `invalidatePurchaseIntent` | `services/study-purchase-intent.ts` | same |
| PurchaseIntentDecision | `decideForPurchaseIntent` | `services/study-intent-decision.ts` | same; **no consent-facts import** |
| HistoricalDecisionLookup | `findExactHistoricalDecision` | defined in `services/decide-and-persist.ts`, imported ONLY by `services/study-intent-decision.ts` | everything else |
| A1-ConsentFactsRead | `readConsentAuthorizationFacts` | defined in `services/study-consent.ts`, imported ONLY by `services/study-purchase-intent.ts` | **`services/study-intent-decision.ts`** and all others (A2-DG-06) |
| TrustedEntrySourceResolve | `resolveTrustedEntrySource` | the trusted capture-provenance resolver module, imported ONLY by `services/study-purchase-intent.ts` (issuance path) | participant/app; other services |

`study-purchase-intent.ts` may reach: own-assignment authority, `readConsentAuthorizationFacts`, the A2 participant-write repositories, and the entry-source resolver.

`study-intent-decision.ts` may reach: the A2 decision-request/binding repository, `findExactHistoricalDecision`, read-only frozen A2 authorities, and corpus authority to build a NEW DecisionRequest — but **NOT** consent facts, participant scientific-mutation APIs, or binding attach outside its sanctioned repository.

Enforcement extends `RAW_WRITE_MODULES` (`db/purchase-intent-repository`, `db/purchase-intent-decision-repository`), the per-repository owner-allowlist map, ESLint groups and sanctioned-implementation exemptions, plus the AST test that `study-intent-decision.ts` cannot import the consent-facts facade.

---

## 29. Database invariant matrix

| Invariant | Enforcement |
| :-- | :-- |
| decision identity | `PurchaseIntent` PK UUID |
| token issuance idempotency | `UNIQUE(assignmentId, clientCorrelationNonce)` (no receipt) |
| capture-key uniqueness | `UNIQUE(intentCaptureKey)` |
| **intent-token structural coherence** | `captureTokenId` UNIQUE FK RESTRICT (no separate intent assignment) |
| `entrySource` trusted/immutable | resolver-only at issuance; token immutable; intent derives via token (§8) |
| `intentType` domain | CHECK enum |
| context identity | `UNIQUE(intentId, contextSeq)` |
| **context-command identity** | `UNIQUE(intentId, contextCaptureKey)` plus payload reconciliation |
| **signature well-formedness / no mixed signatures** | versioned A2 context schema (discriminant) plus céntimos/qty CHECKs plus BILL split-coherence CHECK |
| context/profile monotonic seq | parent lock (root / `ExperimentAssignment`) plus append-only trigger |
| **eligibility-profile identity** | `UNIQUE(assignmentId, profileSeq)`; `UNIQUE(assignmentId, profileCaptureKey)`; strict portfolio schema (privacy) |
| finalization pins context and profile of the same intent/assignment | `UNIQUE(intentId)` plus triggers (`ctxVersion.intentId == intentId`; `profile.assignmentId ==` the intent's assignment) |
| one DecisionRequest per intent | `UNIQUE(intentId)` plus root lock |
| request self-integrity | `verifyPurchaseIntentDecisionRequest` (§20) |
| **exact 1:1 binding, no cross-wiring** | `UNIQUE(decisionRequestId)` + `UNIQUE(snapshotId)` (no `binding.intentId`) plus `verifyPurchaseIntentDecisionBinding` (§7) |
| snapshot never deleted | `binding.snapshotId` FK RESTRICT plus the M3.5A trigger |
| invalidated at most once / no self / same assignment / acyclic | `UNIQUE(invalidatedIntentId)`; CHECK; trigger; §24 walk under the assignment lock |
| **NEW-fact against withdrawal serialization** | `ExperimentAssignment FOR UPDATE` before the collection-time sample and consent (§4) |
| new-fact versus replay/alias consent | service ordering §4.2 (replay/alias means no consent) |
| receipts | `UNIQUE(operationScope, idempotencyKey)` plus FK plus enum |
| capability / own-assignment | AST owner map plus ESLint plus trusted context (§28) |
| corpus content integrity | release ledger plus dual CI gates (§33/§34) |
| holiday content integrity | content digest plus immutable registry plus external base comparison (§13/§34) |

No illegal cross-table CHECK exists; cross-table rules are triggers, transactions and service verification.

---

## 30. Entity table (final)

| Entity | PK | Domain identity | FKs | UNIQUE | CHECK | Consent (new fact) | Retry identity | Capability |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| `PurchaseIntentCaptureToken` | id | `intentCaptureKey` | `assignmentId` to `ExperimentAssignment` | `intentCaptureKey`; `(assignmentId, clientCorrelationNonce)` | — | no (infra) | `UNIQUE(assignmentId, nonce)` | PurchaseIntentCapture |
| `PurchaseIntent` | id | id | `captureTokenId` to CaptureToken | `captureTokenId` | `intentType` in enum | yes | `UNIQUE(captureTokenId)` plus CreateReceipt | PurchaseIntentCapture |
| `PurchaseIntentContextVersion` | id | `(intentId, contextSeq)` | `intentId` to `PurchaseIntent` | `(intentId, contextSeq)`; `(intentId, contextCaptureKey)` | signature schema; céntimos >= 0; BILL split | yes | `contextCaptureKey` plus receipt | PurchaseIntentCapture |
| `EligibilityProfileVersion` | id | `(assignmentId, profileSeq)` | `assignmentId` to `ExperimentAssignment` | `(assignmentId, profileSeq)`; `(assignmentId, profileCaptureKey)` | strict portfolio schema (privacy) | yes | `profileCaptureKey` plus receipt | PurchaseIntentCapture |
| `PurchaseIntentFinalization` | id | `intentId` | `intentId`; `contextVersionId`; `eligibilityProfileVersionId` | `intentId` | — | yes | `contextVersionId` + `eligibilityProfileVersionId` plus receipt | PurchaseIntentFinalization |
| `PurchaseIntentInvalidation` | id | `invalidatedIntentId` | `invalidatedIntentId`; `replacementIntentId?` | `invalidatedIntentId` | replacement `<>` invalidated | yes | receipt | PurchaseIntentAdministration |
| `PurchaseIntentDecisionRequest` | id | `intentId` | `intentId`; `finalizationId` | `intentId`; `finalizationId`; `businessDecisionKey`; `m3_5aIdempotencyKey`; `(intentId,id)` | — | no (internal) | deterministic identity | PurchaseIntentDecision |
| `PurchaseIntentDecisionBinding` | id | `decisionRequestId` | `decisionRequestId`; `snapshotId` to `decision_snapshot` | `decisionRequestId`; `snapshotId` | — | no (internal) | deterministic plus verify (§7) | PurchaseIntentDecision |
| 5 receipt families | id | `(operationScope, idempotencyKey)` | concrete target | `(operationScope, idempotencyKey)` | `resultKind` in enum | — | — | owning service |

Virtual back-relations (no SQL column, §21): `ExperimentAssignment.{purchaseIntentCaptureTokens, eligibilityProfileVersions}`, `DecisionSnapshot.purchaseIntentDecisionBinding`. **No B/C entities.** **No DB table for holidays** — the calendar is a versioned static authority artifact plus an immutable registry (§13.2).

---

## 31. Service table (final)

| Operation | Caller | Pub/Int | Material input | Derived | Lock | Receipt | New-collection consent? |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| `issueIntentCaptureKey` | Capture (trusted ctx) | public | `assignmentId` (own), `clientCorrelationNonce` | `intentCaptureKey`, `entrySource` (resolver), `issuedAt` | UNIQUE guard | — | **no** |
| `createPurchaseIntent` | Capture | public | `intentCaptureKey`, `intentType` | `captureTokenId`, `initiatedAt` | Assignment FOR UPDATE then root guard (§4) | CreateReceipt | **yes** (new) / no (replay/alias) |
| `appendPurchaseIntentContext` | Capture | public | `intentId` (own), `contextCaptureKey`, signature (merchant, kind, fields, `intendedTransactionAt`) | `contextSeq`, `capturedAt`, `recordedAt` | Assignment FOR UPDATE then root | ContextCommandReceipt | **yes** / no |
| `appendEligibilityProfile` | Capture | public | `assignmentId` (own), `profileCaptureKey`, raw portfolio (normalized before persistence, §10.2) | `profileSeq`, `capturedAt`, `recordedAt` | Assignment FOR UPDATE | EligibilityProfileCommandReceipt | **yes** / no |
| `finalizePurchaseIntent` | Finalization | public | `intentId` (own), `contextVersionId`, `eligibilityProfileVersionId` | `finalizedAt` | Assignment FOR UPDATE then root | FinalizationReceipt | **yes** / no |
| `invalidatePurchaseIntent` | Administration | public | `intentId` (own), `replacementIntentId?`, `reasonCode?` | `invalidatedAt` | Assignment FOR UPDATE then root(s) (§24) | InvalidationReceipt | **yes** / no |
| `decideForPurchaseIntent` | Decision (internal) | internal | `intentId` | `businessDecisionKey`, idempotency key, frozen input, pins | root lock only (Case C) | — | **no** (internal, §6) |
| `findExactHistoricalDecision` | HistoricalDecisionLookup | internal (M3.5A facade) | business key, idempotency key, `inputHash`, 3 pins | — | read-only | — | n/a |
| `readConsentAuthorizationFacts` | A1-ConsentFactsRead | internal (A1 facade) | `assignmentId` | — | read-only, separate READ COMMITTED connection | — | n/a |
| `resolveTrustedEntrySource` | TrustedEntrySourceResolve | internal | trusted server evidence | `entrySource` | — | — | n/a |

**No public** `attachSnapshot` / `bindSnapshot` / `createDecisionRequest(raw input)` / `findSnapshot(raw query)` / raw `DecideInput` / arbitrary rules, corpus, engine version or `snapshotId`.

---

## 32. Crash-saga table

| Durable at entry | invalidated? | Checks | Finder | Engine? | current == pins(3)? | historical stamp == pins? | New collection? | Result |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| finalized, no request, withdrawn, not invalidated | no | finalized; no invalidation | no (Case C) | not yet | — | — | **no** (internal) | freeze request, then Case B |
| finalized, no request, invalidated | yes | invalidation present | no | no | — | — | no | `PurchaseIntentInvalidatedError` |
| request, no snapshot | — | verify request | yes (NONE) | yes if NONE | **yes**, else fail closed | n/a | no | `decideAndPersist`, §18, bind |
| request, snapshot, no binding | — | verify request; FOUND | yes | no | no | **yes** | no | bind; the engine is not rerun |
| request, snapshot, binding | — | `verifyBinding` (§7) | no | no | no | yes | no | return the existing binding |
| stamps not equal to pins / unloadable | — | finder | — | no | — | mismatch/unloadable | no | CONFLICT |
| request, no snapshot, drift(3) | — | finder NONE | yes | **no** | mismatch | — | no | fail closed |
| build-only change | — | finder NONE | yes | yes | current == pins | n/a | no | completes |
| NEW context/create/finalize/invalidate after withdrawal | — | §4 assignment lock sees the withdrawal | — | — | — | — | **would be new** | **REJECT** |

---

## 33. Corpus semantic projection and release ledger (A2-DG-H03; A2-CORPUS-PROJECTION-INCOMPLETE)

### 33.1 Governing criterion (frozen)

> A historical `corpusId` MUST bind every corpus field whose value participates in the exact validated `DecideInput`, M3.5A input hashing, corpus-authenticity verification, persisted decision history, historical integrity verification, replay semantics, decision output, decision status, candidate economics, advisories, or decision-bound proof/audit material.

Equivalently:

```
same historical corpusId
=> same normalized corpus authority for every field material to:
     exact DecideInput
     OR inputHash
     OR corpus authenticity
     OR replay/integrity
     OR engine decision semantics
     OR decision-bound audit/proof semantics
```

**Direct use by `decide()` is NOT required for inclusion.** This criterion is deliberately broader than "directly consumed by `decide()`". It is **not** broadened into source-rights governance, source-scraping governance, research-contact semantics, or freshness adjudication outside existing `RuleVersion` / `RuleOperationalState` fields.

### 33.2 Digest

```
corpusSemanticDigest = "sha256:" + SHA-256(canonical(normalizeCorpusSemanticProjection(loadCorpus())))
```

The projection is `{ scopes, activeRules, operationalStates }` only. `merchants`, `sources`, `researchMeta`, `freezeTimestamp` and `excludedRules` are not decision inputs. **`corpusId` is EXCLUDED from the digest**, so renaming the id cannot change the digest and identity comparison stays clean. The digest is computed **only after** the validation of §33.6 passes.

### 33.3 `ComparisonScope` and `PurchaseSignature`

| field | class |
| :-- | :-- |
| `ComparisonScope.scopeId` | INCLUDE (stable identity / sort key) |
| `ComparisonScope.merchantId` | INCLUDE |
| `ComparisonScope.comparisonBasis` | INCLUDE |
| `ComparisonScope.equivalenceGroup` | INCLUDE |
| `ComparisonScope.purchaseKind` | INCLUDE |
| `ComparisonScope.requiredContext` | INCLUDE (set-like, §33.6) |
| `ComparisonScope.allowedSelectors` | INCLUDE (set-like, §33.6) |
| `ComparisonScope.signature` | INCLUDE (below) |
| `PurchaseSignature.kind` | INCLUDE |
| `PurchaseSignature.merchantId` | INCLUDE |
| `PurchaseSignature.canonicalItems` (EXACT_BUNDLE) | INCLUDE (set by `itemKey`) |
| `PurchaseSignature.purchaseDomain` (ELIGIBLE_BILL) | INCLUDE |
| `PurchaseSignature.ticketCount`, `.ticketClass` (TICKETS) | INCLUDE |
| `PurchaseSignature.cashAcquisitionCostCentimos`, `.nominalUnit` (NOMINAL_PACKAGE) | INCLUDE |

### 33.4 `RuleVersion` — every field INCLUDE

| field | class |
| :-- | :-- |
| `ruleId` | INCLUDE (identity / sort key) |
| `version` | INCLUDE (identity / sort key) |
| `campaignId` | INCLUDE (combinability/grouping identity) |
| `merchantIds` | INCLUDE (normalized set) |
| `providerFamily` | INCLUDE (eligibility, `hasFamily`) |
| `benefit` (full discriminated union) | INCLUDE (economic core) |
| `eligibleSpendSelector` | INCLUDE (spend base) |
| `canonicalItems?` | INCLUDE (normalized set by `itemKey`) |
| `ticketContext?` | INCLUDE |
| `constraints` (every decision-relevant subfield, §33.5) | INCLUDE |
| `eligibilityClass` | INCLUDE |
| `confidence` | INCLUDE (rankability) |
| `comparisonScopeRefs` | INCLUDE (normalized set) |
| `signatureKind` | INCLUDE |
| **`provenance.sourceId`** | **INCLUDE** |
| **`provenance.url`** | **INCLUDE** |
| **`provenance.observedAt`** | **INCLUDE** |

**Why the full `provenance` object is included.** `decide()` reads `rule.provenance.observedAt` and uses it as decision-bound proof material (`BoundProof.sourceCheckId` and `reviewedAt`) *(verified, `src/engine/decide.ts`)*. `sourceId` and `url` are not read by `decide()` ranking or status logic, but they are inside `ruleVersionSchema.provenance` within `engineInputV1Schema.rules`, therefore inside the exact validated `DecideInput`; `requestHash == inputHash == SHA-256(canonical(validated DecideInput))`; `engineInputJson` preserves them verbatim as immutable historical audit/replay material; the corpus provenance verifier canonical-hashes the **whole** `RuleVersion` including its `provenance` for exact membership equality; and historical replay verifies the exact input hash. A `sourceId`-only or `url`-only mutation therefore changes the exact authenticated/persisted input, and must change the corpus digest too.

**Normalization.** `sourceId`, `url` and `observedAt` are scalar accepted values used **exactly** as validated: not trimmed beyond whatever the accepted schema already does (it does not), not lowercased, not URL-syntax-normalized, not redirect-resolved, not host-canonicalized, not source-id-rewritten, not re-fetched, not date-converted, not metadata-substituted. `observedAt` values are Lima calendar `YYYY-MM-DD` strings under `z.string().min(1)`; no new date format is invented.

### 33.5 `RuleVersion.constraints`

INCLUDE all: `temporal` (the discriminated range), `holidayPolicy`, `specificBlackoutDates?`, `weekdays?`, `timeWindow?`, `minimumSpend?`, `cap?`, `channels?`, `locations?.include` / `.exclude`, `products?.includeSku` / `.excludeSku`, `useLimit?`, `stock?`, `cardNetwork?`, `cardTier?`, `membership?`, `providerPrivateKey?`, `preRedemptionVerifiable?`, `combinability`. **None are documentary** — every one can alter eligibility, temporal or economic evaluation.

### 33.6 `RuleOperationalState` — every field INCLUDE

| Field | Projection |
| :-- | :-- |
| `ruleId` | INCLUDE (join key / sort key) |
| `version` | INCLUDE (join key / sort key) |
| `publicationState` | INCLUDE (`resolvePublication`) |
| `sourceQualityState` | INCLUDE (`resolveSourceQuality`) |
| `availability` | INCLUDE (`resolveAvailability`) |
| **`asOf`** | **INCLUDE** |
| **`note`** | **INCLUDE WHEN PRESENT** |

**Why `asOf` and `note` are included.** `ruleOperationalStateSchema` includes `asOf: z.string().min(1)` and `note: z.string().optional()`; the full `RuleOperationalState[]` is inside the validated `engineInputV1Schema.operationalStates`; the entire validated `DecideInput` is canonicalized, SHA-256-hashed, persisted as `engineInputJson`, protected by `inputHash`, and verified by historical integrity and replay. Changing only `asOf` or only `note` therefore changes the exact frozen M3.5A input identity, even though neither is directly consumed by `decide()`. **No separate "documentary" exception is invented for values already frozen into the authenticated input.**

**Normalization.** `asOf` enters the projection using the **exact value** accepted by the existing schema (a non-empty string, for example `"2026-09-01T00:00:00-05:00"`): not timezone-converted, reformatted, truncated, replaced with current time, derived from rule provenance, locale-normalized, or scientifically reinterpreted. This inclusion is about exact frozen input authority, **not** C2 event/knowledge-time analysis; **R35R-19 remains DEFERRED** (§38).

`note` when absent preserves semantic absence exactly as the accepted validated schema and canonical serializer represent it — the accepted canonicalizer drops an `undefined`/absent optional key, and no `note: ""` or `note: null` is invented. `note` when present uses the exact validated string verbatim: no trim, lowercase, rewrite, whitespace normalization or semantic interpretation. The purpose is only *same `corpusId` implies the same exact frozen operational-state input*; **no product behaviour is inferred from the note.**

### 33.7 Array semantic classification (no blanket sorting)

Every array/set-like corpus field is **SET-LIKE**: order carries no decision meaning under the verified engine consumption, and **no ORDERED array exists in the corpus decision content**. Per set-like field: validate elements; **duplicates are INVALID** and fail the corpus release validator; then canonical sort.

| Array field | duplicate policy | sort key |
| :-- | :-- | :-- |
| `ComparisonScope.requiredContext` | invalid, fail | code-point |
| `ComparisonScope.allowedSelectors` | invalid, fail | code-point |
| `PurchaseSignature.canonicalItems` (EXACT_BUNDLE) | duplicate `itemKey` invalid, fail | `itemKey` |
| `RuleVersion.merchantIds` | invalid, fail | code-point |
| `RuleVersion.comparisonScopeRefs` | invalid, fail | code-point |
| `RuleVersion.canonicalItems` | duplicate `itemKey` invalid, fail | `itemKey` |
| `constraints.weekdays` | invalid, fail | canonical weekday index (MON..SUN) |
| `constraints.channels` | invalid, fail | code-point |
| `constraints.specificBlackoutDates` | invalid, fail | code-point (chronological for ISO dates) |
| `constraints.locations.include` / `.exclude` | invalid, fail | code-point |
| `constraints.products.includeSku` / `.excludeSku` | invalid, fail | code-point |

### 33.8 Object ordering and cardinality

Top-level projection: `scopes` sorted by `scopeId`; `activeRules` sorted by `(ruleId, version)`; `operationalStates` sorted by `(ruleId, version)`. A duplicate stable identity — two scopes sharing one `scopeId`, or two rules/states sharing one `(ruleId, version)` — **fails the release gate**. Operational-state cardinality (§12.2) is enforced at release as well: for every active rule key exactly one state; duplicate, missing or orphan fails. Because the accepted canonicalizer preserves array order, arrays are sorted before hashing, so a mere source-array reorder does not change the digest.

### 33.9 Exhaustiveness (read-only audit result)

The corpus-owned inputs to the frozen `DecideInput` are `scopes` (`ComparisonScope`, all fields including `signature`), `rules` (`RuleVersion`, all fields including the full `provenance`), and `operationalStates` (`RuleOperationalState`, all seven fields). The non-corpus `DecideInput` fields — `portfolio`, `context`, `evaluatedAt`, `intendedTransactionAt`, `selectedScopeId`, `holidayCalendar`, `baselineByScopeId` — are A2, participant or holiday-fixture authorities, bound separately and already closed.

```
NO ADDITIONAL OMITTED CORPUS-AUTHORITY FIELD FOUND
```

No hypothetical future field is invented.

### 33.10 Release ledger and bootstrap

`CORPUS_RELEASE_LEDGER_V1` is an immutable map `{ corpusId -> corpusSemanticDigest }` living in the authority-baseline artifact/commit:

- every released/accepted `corpusId` has exactly one registered semantic digest;
- an existing `corpusId`'s digest is **immutable**;
- a decision-relevant content change requires a **new** `corpusId` with a new ledger entry.

**Bootstrap.** Because the corpus content is byte-identical between `64cf864` and `99f2d61` (§3.4), the initial ledger digest is computed from the corpus at the exact accepted M3.5A commit `64cf864a817c137920204487ab3317bc6d4c9ba5`, using `normalizeCorpusSemanticProjection` as specified in §33.2–§33.8:

```
CORPUS_RELEASE_LEDGER_V1 = {
  "PAGAMENOS_VALIDATION_CORPUS_v1_2026-08-30T1800-0500": "sha256:<corpusSemanticDigest @64cf864>"
}
```

**The concrete hex is produced at the authority-bootstrap gate by running the frozen projection and hash against `64cf864`.** It is fully reproducible and is deliberately **not hand-authored in any specification revision**, to avoid asserting an unverified value. This consolidation does not supply it either (§0.3 rule 3).

### 33.11 Required corpus attack tests

Each tested separately at the release/authority gate, starting from the accepted external authority baseline:

- **`observedAt`-only** — change only `RuleVersion.provenance.observedAt`; `corpusSemanticDigest` MUST change; with an unchanged `corpusId`, CI FAILS against the external ledger.
- **`sourceId`-only** — change only `provenance.sourceId`; the digest MUST change; unchanged `corpusId` means CI FAILS. Also prove the mutation changes the exact M3.5A `DecideInput` / `inputHash`.
- **`url`-only** — change only `provenance.url`; the digest MUST change; unchanged `corpusId` means CI FAILS. Also prove the `DecideInput` / `inputHash` change.
- **`asOf`-only** — baseline `asOf = A` gives digest `D1`; change only `asOf = B` gives `D2`; require `D1 != D2`, and independently prove the validated `inputHash` changes.
- **`note`** — absent to `"diagnostic-change"`, and `"A"` to `"B"`, each with every other field unchanged, must change both the digest and the validated `inputHash`. A schema-valid diagnostic mutation is sufficient; the current corpus need not have a populated `note`.
- **Complete operational-state authority test** — property/table-driven testing mutates EACH `RuleOperationalState` field independently (`ruleId`, `version`, `publicationState`, `sourceQualityState`, `availability`, `asOf`, `note`). Every schema-valid mutation MUST either change `corpusSemanticDigest`, or fail validation because an identity/coherence invariant such as op-state cardinality was broken. **No valid field mutation may leave the semantic digest unchanged.**
- **Reorder invariance** — a source-array reorder alone does not change the digest.
- **Candidate-local self-approval** — for every mutation above, the candidate may edit corpus data, the local `CORPUS_RELEASE_LEDGER_V1`, the local expected digest, and every candidate-local authority fixture; the gate STILL fails, because the accepted historical ledger is loaded from the externally supplied protected SHA (§34).

### 33.12 Relationship to the frozen input

This guard closes only **corpus label integrity** — two different contents sharing one `corpusId`. The concrete decision inputs are already protected at fresh execution: the M3.5A provenance verifier canonical-hashes each frozen rule/scope against the current corpus for authenticity and enforces per-scope completeness, and `decideInputHash` freezes the exact input. **A2 therefore persists no redundant runtime digest**; the ledger is a build/release invariant.

---

## 34. External protected authority-base SHA governance

Both the holiday registry and the corpus ledger use ONE mechanically independent historical-authority mechanism — no tags, no local self-referential fixtures, no content-addressed IDs offered as alternatives.

**Protected CI variable `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA`** is configured in CI/project settings OUTSIDE any candidate Git change; ordinary repository changes cannot alter it; it holds the **full immutable Git object SHA** (never a branch name) of the latest independently ACCEPTED authority-baseline commit, which contains `HOLIDAY_CALENDAR_REGISTRY_V1` and `CORPUS_RELEASE_LEDGER_V1`. Candidate CI reads history from that SHA:

```
BASE_SHA = env.PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA
git cat-file -e "$BASE_SHA^{commit}"          # must exist
git show "$BASE_SHA:<authority-path>"         # accepted historical authority
```

A candidate cannot satisfy the gate by editing repository files, because the historical comparison comes from a commit SHA supplied outside the candidate.

### 34.1 Bootstrap (frozen sequence)

1. Produce the effective A2 specification plus the exact Holiday Fixture v1 (§13.8).
2. Produce the initial authority-baseline artifact containing `HOLIDAY_CALENDAR_REGISTRY_V1` (§13.10) and `CORPUS_RELEASE_LEDGER_V1` (§33.10).
3. Independently gate those contents.
4. Commit ONLY the accepted authority artifacts in a dedicated authority-baseline commit.
5. Record that full immutable commit SHA in `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA`.
6. Only then may A2 implementation begin.
7. Ordinary candidate code cannot change the protected variable.
8. A future authority update requires a new independently reviewed additive authority commit, a new full SHA, and a privileged CI-variable rotation AFTER acceptance — no force-moved tag, no branch authority, no candidate-owned base selection.

### 34.2 Threat model (stated)

This protects against ordinary candidate/repository changes self-approving authority mutation. It does **NOT** defend against an administrator who can maliciously alter protected CI variables, which is outside the A2 application threat model. Ordinary implementation changes cannot self-approve historical-authority mutation, which is sufficient mechanical independence.

### 34.3 Shared commit, independent semantics

Holiday and corpus share `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA` for governance but keep independent registries (`HOLIDAY_CALENDAR_REGISTRY_V1` versus `CORPUS_RELEASE_LEDGER_V1`). Holiday changes never imply a `corpusId` change and the reverse also holds; `DecideInput` / `inputHash` binds both concrete inputs.

### 34.4 Holiday CI gate

(1) Load the accepted historical registry from `$PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA`; (2) every historical version in the base registry MUST remain byte/semantically identical in the candidate; (3) only additive NEW versions are allowed; (4) the current fixture's computed digest MUST equal its candidate registry entry; (5) an existing version with a changed date, policy or coverage MUST fail. **Attack** — edit holiday dates, edit the local holiday registry, keep the version unchanged — fails at step 2.

### 34.5 Corpus CI gate

(1) Compute the current `corpusSemanticDigest`; (2) load the candidate ledger; (3) require candidate `ledger[currentCorpusId] == currentDigest`; (4) load the accepted historical ledger from `$PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA`; (5) require EVERY accepted historical `(corpusId, digest)` to exist unchanged in the candidate ledger; (6) the candidate may add new IDs only; (7) the same ID with a changed digest fails; (8) a new digest under an old ID fails; (9) changed decision content without a new ID fails; (10) editing all candidate-local files cannot defeat step 5.

---

## 35. H04 — Unused token material

A `PurchaseIntentCaptureToken` with no `PurchaseIntent` freezes `assignmentId`, the trusted `entrySource`, and capture identity — but **not** participant initiation material (`intentType`).

The **first successfully committed `PurchaseIntent` on the token** establishes `intentType`. Before any intent exists, a later create attempt on the same token may carry a different `intentType`, because no scientific root existed and nothing is contradicted. After a root exists, a create with a different `intentType` raises `PurchaseIntentCaptureConflictError` (§5.2, via `UNIQUE(captureTokenId)` reconciliation).

---

## 36. Timestamps — finalization and invalidation event equals knowledge

`finalizedAt` and `invalidatedAt` are immediate trusted service events; they cannot be participant-backdated in A2, so **event time equals system knowledge/recording time** and no separate `recordedAt` is needed for finalization or invalidation. Context and eligibility-profile retain distinct `capturedAt` / `recordedAt`, because later C2 may need the event/knowledge distinction. **This does not claim R35R-19 closed.**

---

## 37. A2 SCI invariants

- **SCI-A2-01** — Exact capture identity, token-structurally bound; response-loss converges; distinct captures never collapse; cross-participant and direct-DB rebind are impossible (§5).
- **SCI-A2-02** — Immutable context history plus exact context-command identity plus a **complete material context hash** covering every persisted material field (§15) — A2-DG-04.
- **SCI-A2-03** — One finalization pins one exact context **and** one exact eligibility-profile version (§9/§10).
- **SCI-A2-04** — `businessDecisionKey` derived from the immutable id (R35R-04).
- **SCI-A2-05** — **Complete accepted `DecideInput` construction authority**: every field sourced from immutable A2 authorities plus the frozen corpus snapshot, deterministic, with no mutable reference after freeze (§11/§12), the COMPLETE-SIGNATURE-ONLY capture policy (§9), operational-state exactly-one cardinality (§12.2), and the exact holiday fixture (§13) — A2-DG-02. **READY.**
- **SCI-A2-06** — Three-way version separation; the current input-schema, contract and corpus gate before any fresh run; a build-only change never blocks (§17).
- **SCI-A2-07** — Crash recovery without recomputation (§19/§22).
- **SCI-A2-08** — Exact 1:1 binding with **cross-wiring structurally impossible**, plus `verifyPurchaseIntentDecisionBinding` (§7) — A2-DG-05.
- **SCI-A2-09** — Invalidation history plus acyclic replacement (§24).
- **SCI-A2-10** — DecisionRequest self-integrity, fail closed, no runtime fallback (§20).
- **SCI-A2-11** — **New collection serialized with A1 withdrawal on `ExperimentAssignment`** under Model A, while replay, alias and internal repair never re-authorize against current consent (§4/§6) — A2-DG-01/06; continues R35R-08 A2. **READY.**
- **SCI-A2-12** — Complete A2 transport-retry and domain identity; every persisted material field in the appropriate identity; token issuance idempotency is `UNIQUE(assignment, nonce)`; total portfolio normalization (§10.2) and reload-and-prove P2002 (§27) complete the domain identity (§25/§26) — R35R-15. **READY.**
- **SCI-A2-13** — M3.5A and A1 are not mutated; a virtual relation field is not a mutation (§21).
- **SCI-A2-14** — Historical parser and snapshot-loadability retention; unavailable means fail closed (§17).
- **SCI-A2-15** — Capture-token to intent structural coherence via DB FK (§5/§29).
- **SCI-A2-16** — **Trusted entry-source provenance**: server-resolved from a closed evidence union with frozen precedence, token-frozen, never participant-selected; response-loss retains the frozen source (§8) — A2-DG-03. **READY.**
- **SCI-A2-17** — **Mandatory `EligibilityPortfolio` input authority**: an immutable versioned participant eligibility profile pinned at finalization, card-number-free, with total pre-persistence normalization including post-trim collision rejection and absent/empty equivalence, and no B/C evidence (§10/§44) — A2-DG-02/A2-V4-NEW-01. **READY.**
- **SCI-A2-18** — **Corpus and authority integrity**: the external protected-base-SHA mechanism (§34) plus the exhaustive field-by-field corpus semantic projection with array classification (§33) plus the attack tests (§33.11) plus the content-bound holiday registry (§13.10/§34.4). **READY.**

---

## 38. R35R matrix

| Finding | Status | Basis |
| :-- | :-- | :-- |
| R35R-04 | **CLOSED** | §16 — `businessDecisionKey` from the immutable id |
| R35R-05 | **CLOSED** | full `DecideInput` authority executable (§9/§11/§12/§13/§33) plus binding repair (§7/§18/§19/§22) |
| R35R-06 | **CLOSED** | deterministic trusted entry evidence (§8) plus exact initiation, context, portfolio, finalization and invalidation authorities |
| R35R-08 A2 | **CLOSED (A2 portion)** | Model A assignment-lock serialization prevents post-withdrawal new facts (§4); internal repair preserves history (§6) |
| R35R-11 A2 | **CLOSED** | all A2 SCI clauses READY (§37) |
| R35R-15 A2 | **CLOSED** | total normalization (§10.2) plus reload-and-prove P2002 (§27) |
| R35R-19 | **DEFERRED NON-BLOCKING** | timestamps preserved (§36); as-of remains a C2 concern |

**No B/C finding is claimed closed.**

---

## 39. `entrySource` materiality and the create hash

`PurchaseIntent` no longer receives `entrySource` from the caller (§8). The create `requestHash` binds to `intentCaptureKey`, which implies the immutable token that already fixes `entrySource`, so the same transport key cannot acknowledge another capture. `entrySource` is **not** redundantly hashed on create, because the token id/key uniquely identifies a token with an immutable `entrySource`; if it is included as defense in depth it uses the trusted resolved value from the token, never participant input.

---

## 40. Deferred register and analysis-protocol status

```
Production AnalysisProtocol v1 freeze : UNFROZEN
Wave 0                                : NOT AUTHORIZED
Deploy / production Protocol v1       : NOT AUTHORIZED
B / C semantics                       : DEFERRED (A2 persists only decision-input authority + provenance/timestamps)
SCI renumbering                       : deferred to the register authority
```

A2 does not freeze, and MUST NOT be read as freezing, any element of `AnalysisProtocol v1`.

---

## 41. DecisionRequest freeze transaction (exact)

```
LOCK PurchaseIntent root FOR UPDATE                         -- Case C; internal processing (§42) - no assignment lock, no consent
assert finalized AND no explicit PurchaseIntentInvalidation
load exact pinned PurchaseIntentFinalization -> contextVersionId, eligibilityProfileVersionId
load exact pinned ContextVersion + EligibilityProfileVersion (immutable, already normalized)
resolve holidayCalendar@holidayCalendarVersion; verify Lima-date coverage (else PurchaseIntentHolidayCoverageError)
sample evaluatedAt
corpusSnapshot = loadCorpus()
enforce operational-state exactly-one cardinality over the included rules (§12.2)
input = buildDecideInputFromFinalizedAuthorities({...})     -- §11.2/§12
validate(engineInputV1Schema); canonicalize; decideInputHash
pin expectedEngineInputSchemaVersion / expectedEngineContractVersion / expectedCorpusVersion / holidayCalendarVersion
persist PurchaseIntentDecisionRequest ; COMMIT
```

Uses only immutable scientific facts collected under prior authorization. No mutable participant lookup. No new consent check merely because it occurs later.

---

## 42. Case-C locking note

Case C locks the `PurchaseIntent` root only. It is internal processing, so it needs no `ExperimentAssignment` lock for consent, and the finalized authorities it reads — context and profile versions, and the finalization — are immutable. It serializes against invalidation on the root: invalidation acquires `ExperimentAssignment` then the root, while Case C acquires only the root, so the global order `assignment ≺ root` is respected and no inversion occurs.

---

## 43. Adversarial test matrix (mandatory)

**DG-01 (real PostgreSQL):** withdrawal against each of {create, context append, eligibility-profile append, finalize, invalidate} — A2-lock-first success then withdrawal; withdrawal-first rejection of the NEW fact; replay-after-withdrawal succeeds with **no** new scientific row (Model A, both serializations).

**DG-02 construction:** for EVERY accepted purchase-signature family — **BILL** (including the food and non-alcoholic split), **TICKETS**, **EXACT_ITEMS**, **NOMINAL_PACKAGE** — construct a valid finalized A2 context, an exact pinned `EligibilityProfileVersion`, and the exact relevant corpus data, then assert the produced `DecideInput` equals the expected normalized object **field by field** (rules, scopes and op-states canonically ordered; portfolio; context; `evaluatedAt` frozen; `intendedTransactionAt`; `selectedScopeId` absent; `holidayCalendar` exact; `baselineByScopeId` absent). Also: invalid mixed signatures rejected by the context schema; a missing required authority (no finalized context, or no pinned profile) rejected; no mutable or reference lookup after DecisionRequest persistence, with rehydration reproducing the exact frozen input and hash. Pure mapping tests need no engine invocation.

**DG-02 context policy:** the generic M3 engine accepts a partial/mixed context while A2 capture rejects it with `PurchaseIntentContextSignatureError`; each admitted family with its exact required fields succeeds.

**DG-02 operational states:** missing fails; duplicate fails; orphan fails the release guard; exactly one builds successfully.

**DG-02 holiday:** §13.13 in full.

**DG-03:** a participant cannot submit an authoritative `entrySource`; the resolver assigns it; every `TrustedEntryEvidence` variant maps deterministically; precedence conflicts resolve deterministically; a retry retains the frozen source; another session cannot mutate the historical source.

**DG-04:** per-material-field hash mutation, including `branch`, flips the hash and yields a conflict.

**DG-05:** a cross-wired attempt (Intent A / Request B / Snapshot B) fails closed; each binding UNIQUE/P2002 collision — same concurrent binding, intent already bound, snapshot already bound, request bound inconsistently — is handled.

**DG-06:** finalize under consent, then withdraw, then no request; internal `decideForPurchaseIntent` may create the request with **no** consent-facts call; an AST test proves `study-intent-decision.ts` cannot import `readConsentAuthorizationFacts`.

**H02:** metadata present, absent, malformed, unrelated, and multiple conflicting rows — no wrong alias; a legitimate expected race still converges when metadata is absent.

**H03 / corpus:** §33.11 in full.

**H04:** an unused token with no intent — the first committed create fixes `intentType`.

**H05:** malformed, empty and oversized historical labels fail self-integrity.

**Portfolio (V4-NEW-01 + comparator):** §10.2 and §10.3 convergence, rejection, divergence and attack tests.

**Timestamps:** finalization and invalidation event equals knowledge, documented and tested.

Plus all prior A2 adversarial tests: capture, context, finalization, invalidation, business key, DecisionRequest self-integrity, historical finder, version drift, binding, capability, and `prisma validate`.

---

## 44. No B/C leak

`PurchaseIntent input capture ≠ B PurchaseOccasion / occasion candidate / opportunity ≠ C evidence.`

`EligibilityProfileVersion` and the purchase signature are **decision INPUT authority only**. A2 never converts them into transaction evidence, observed occasions, corroboration, verification, or denominator/opportunity facts. The invalidation lineage is **intent-replacement history only**.

The `entrySource` captured by A2 is **trusted capture provenance**, never a B entry-source adjudication or contamination conclusion.

**Cross-reference to the accepted B semantic authority.** `PAGAMENOS_M3_5B_B_SEMANTIC_RATIFICATION_V1_3` independently records the same firewall in its §11 terminology table, and its **P-04** prohibits inferring occasion merge, split or lineage from the A2 invalidation/replacement lineage — citing A2 as INHERITED authority. Nothing in this consolidation changes that; it is noted so a future B reader does not re-derive A2 semantics incorrectly.

---

## 45. Consolidated closure matrix

| Finding | Status | Closure authority in this document | Originally closed at |
| :-- | :-- | :-- | :-- |
| A2-DG-01 | **CLOSED** | §4 — Model A: continuously held `ExperimentAssignment FOR UPDATE` is the serialization authority; the A1 consent facade reads on a separate READ COMMITTED connection after the lock; the two-serialization proof holds; real-PG tests for all five NEW facts | V4 (rule) → **V4.1 §2 (Model A)**; confirmed closed at the V4.1 gate |
| A2-DG-02 | **CLOSED** | §9 COMPLETE-SIGNATURE-ONLY capture policy; §12.2 operational-state exactly-one cardinality; §13 the actual content-defined Holiday Fixture v1 with digest `sha256:6d654096…60d8`, immutable version registry and coverage fail-closed; §11/§12 exhaustive field-level construction authority | V4 §9/§10/§11/§12 → V4.1 §3/§4/§5 → **V4.2 §1/§2/§3**; closed at the V4.2 gate |
| A2-DG-03 | **CLOSED** | §8 — a closed server-resolved `TrustedEntryEvidence` union, exhaustive mapping, frozen precedence, invalid to `OTHER`, response-loss freezing | V4 §8 → **V4.1 §6**; confirmed closed at the V4.1 gate |
| A2-DG-04 | **CLOSED** | §15 — every persisted material context field, including the former `locationRef` now `branch` inside `purchaseSignatureJson`, in the hash and reconciliation; property mutation test | **V4 §14**; carried unchanged |
| A2-DG-05 | **CLOSED** | §7 — the binding carries no `intentId`, so cross-wiring is structurally impossible; `verifyPurchaseIntentDecisionBinding` in Case A; `UNIQUE(decisionRequestId)` / `UNIQUE(snapshotId)`; P2002 discrimination | **V4 §7**; carried unchanged |
| A2-DG-06 | **CLOSED** | §6/§22/§42 — Case C is internal processing with no consent read; withdrawal is not invalidation; `study-intent-decision.ts` has no consent-facts capability, AST-tested | **V4 §6**; carried unchanged |
| A2-DG-H01 | **CLOSED** | §3.4/§21 — Prisma declared `^6.2.0`, lockfile-resolved **6.19.3**; implementability uses 6.19.3 | **V4 §3.4/§20**; carried unchanged |
| A2-DG-H02 | **CLOSED** | §27 — reload-and-prove: correctness from reloaded domain facts, `e.meta.target` is a hint only; accept only if exactly one coherent historical result proves the exact replay/alias, else fail closed | V4 §26 → **V4.1 §8**; confirmed closed at the V4.1 gate |
| A2-DG-H03 | **CLOSED** | §33/§34 — external protected `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA` plus `CORPUS_RELEASE_LEDGER_V1` bootstrapped from `64cf864`; dual CI gates; exhaustive projection; attack tests fail even when all candidate-local files are edited | V4 §32 → V4.1 §9 → **V4.2 §4–§8**; closed at the V4.2 gate |
| A2-DG-H04 | **CLOSED** | §35 — the token freezes assignment, `entrySource` and capture identity, but not `intentType`; the first committed intent fixes initiation material | **V4 §33**; carried unchanged |
| A2-DG-H05 | **CLOSED** | §14.3 — exact label grammar: TEXT, trimmed, non-empty, 128-char service maximum; input schema parser-dispatched | **V4 §13.3**; carried unchanged |
| A2-V4-NEW-01 | **CLOSED** | §10.2 — total `normalizeEligibilityPortfolioV1` before persistence, hashing and reconciliation; post-trim collision rejection; absent/empty omission; blanks rejected | V4.1 §7 → **V4.2 §9**; closed at the V4.2 gate |
| A2-PORTFOLIO-COMPARATOR-UNDERSPECIFIED | **CLOSED** | §10.3 — `canonicalMembershipsSerialized = canonicalize(memberships ?? [])`; frozen `compareUnicodeCodePointStrings`; component-wise `compareNormalizedEligibilityInstrumentV1`; equality invariant with typed error; structural dedup | **V4.3 §4**; closed at the V4.3 gate |
| A2-CORPUS-PROJECTION-INCOMPLETE | **CLOSED** | §33.4/§33.6 — the corpus semantic projection includes every `RuleVersion` field (full `provenance`: `sourceId`, `url`, `observedAt`) and every `RuleOperationalState` field (`asOf`, `note` when present), under the §33.1 governing criterion | V4.3 §3 (`observedAt`) → V4.4 §3 (`sourceId`, `url`) → **V4.5 §3 (`asOf`, `note`)** |

---

## 46. Status and next action

```
A2 DESIGN AUTHORITY        : ACCEPTED (this consolidation is normative and changes nothing)
A2 IMPLEMENTATION          : ACCEPTED at 22c8efe0 / integration 81b1cc60
PRE-IMPLEMENTATION AUTHORITY BOOTSTRAP (§34.1) : governed by the accepted process; concrete corpus digest hex
                                                  is produced at the bootstrap gate, never hand-authored
B1 / B2                    : RATIFIED (V1.3), NOT YET SPECIFIED - see PAGAMENOS_SPEC_AUTHORITY.md
C1 / C2                    : NOT AUTHORIZED
PRODUCTION PROTOCOL v1     : UNFROZEN
WAVE 0                     : NOT AUTHORIZED
```

This document authorizes **no new work**. It is the durable, versioned, unambiguous A2 normative reference that future artifacts cite.

---

# Appendix A — Provenance map (canonical section to source revision)

Every canonical section, with the revision(s) it derives from. "V4" means the section is carried from V4 unchanged; a later revision listed alone means that revision is the controlling correction for that section.

| Canonical section | Source revision(s) | Nature |
| :-- | :-- | :-- |
| §0 Consolidation basis, precedence, integrity | **R-B-17 repair** (framing only) + accepted SHAs from V4/V4.1/V4.2/V4.3/V4.4/V4.5 headers | Consolidation framing; **no A2 semantics** |
| §1 Executive summary | V4 §1 + V4.1 §15 + V4.2 §13 + V4.3 §9 + V4.4 §15 + V4.5 §17 | Restatement of the closure set |
| §2 Scope / non-scope | V4 §2 | Carried |
| §3.1 Accepted `DecideInput` | V4 §3.1 (+ V4.1 §0, V4.2 §0 restatements) | Carried |
| §3.2 Corpus | V4 §3.2 + V4.2 §0 (`corpusId`) + V4.4 §3 (`Provenance` exactly 3 fields) + V4.5 §2 (`RuleOperationalState` exactly 7 fields) + V4.2 §2 (46 rules / 46 states) | Carried + verified-fact additions |
| §3.3 M3.5A persistence | V4 §3.3 | Carried |
| §3.4 A1 | V4 §3.4 + V4.1 §2 (singleton client / non-transactional `listEvents`) + V4.2 header (corpus parity at `64cf864`↔`99f2d61`) | Carried + verified-fact additions |
| §4 DG-01 serialization (Model A) | V4 §4 (rule, lock order, ordering, replay/alias exemption) **corrected by V4.1 §2/§2.1/§2.2** | **V4.1 controls** the consent-read model |
| §5 Capture identity / retry | V4 §5, §5.1, §5.2 | Carried |
| §6 DG-06 Case-C consent semantics | V4 §6 | Carried |
| §7 DG-05 binding + verification | V4 §7, §7.1, §7.2 | Carried |
| §8 DG-03 trusted `entrySource` | V4 §8/§8.1 **superseded in detail by V4.1 §6.1–§6.4** | **V4.1 controls** the evidence union, mapping, precedence |
| §9 COMPLETE-SIGNATURE-ONLY context | V4 §9 (entity, JSON shape, mixed-signature structure) + V4.1 §3/§3.1/§3.2 **restated by V4.2 §1** | **V4.2 controls** the family table and frozen rejections |
| §10.1 `EligibilityProfileVersion` entity | V4 §10, §10.1 | Carried |
| §10.2 Total portfolio normalization | V4.1 §7 **superseded by V4.2 §9** | **V4.2 controls** |
| §10.3 Instrument comparator | **V4.3 §4.1–§4.7** | **V4.3 controls**; V4.4 §14 and V4.5 §16 confirm no regression |
| §11 Exact `DecideInput` construction authority | V4 §11/§11.1/§11.2 **updated by V4.1 §11** | **V4.1 controls** the table |
| §12 Corpus to `DecideInput` transformation | V4 §12, §12.1, §12.4 (steps, `selectedScopeId`, op-state freeze) + **V4.2 §2** (cardinality, from V4.1 §4) | Mixed; §12.2 is V4.1/V4.2 |
| §12.5 `baselineByScopeId` policy | V4 §12.3 | Carried |
| §13 Holiday calendar authority | V4 §12.2 (placeholder policy) → V4.1 §5 (structure, artifact gate) **superseded by V4.2 §3.1–§3.11** | **V4.2 controls**, including the actual fixture and digest |
| §14 Correlation keys and labels | V4 §13.1, §13.2, §13.3 | Carried |
| §15 DG-04 complete context hash | V4 §14, §14.1 + V4.1 §10 (extended to the §9 fields) | Carried |
| §16 M3.5A idempotency identity; DecisionRequest | V4 §15 + V4.1 §12 (`holidayCalendarVersion` column) | Carried + V4.1 field |
| §17 Version pinning, loadability, parser retention | V4 §16, §16.1 + V4.2 §3.10 (holiday self-integrity row) | Carried |
| §18 Exact snapshot coherence | V4 §17 | Carried |
| §19 `findExactHistoricalDecision` | V4 §18 | Carried |
| §20 Request self-integrity | V4 §19 + V4.2 §3.10 (holiday digest recompute) | Carried |
| §21 Prisma implementability | V4 §20 | Carried |
| §22 Crash-repair saga | V4 §21, §21.1 | Carried |
| §23 Concurrency, locking, rehydration | V4 §22 | Carried |
| §24 Invalidation cycle prevention | V4 §23 | Carried |
| §25 Receipts and `resultKind` | V4 §24 | Carried |
| §26 Request-hash completeness | V4 §25 (+ normalized portfolio per V4.2 §9) | Carried |
| §27 P2002 reload-and-prove | V4 §26 **superseded by V4.1 §8** | **V4.1 controls** |
| §28 Trusted capability matrix | V4 §27 | Carried |
| §29 Database invariant matrix | V4 §28 + V4.2 §3.9/§8 (holiday/corpus integrity rows) | Carried + consolidation rows |
| §30 Entity table | V4 §29 + V4.1 §12 (no holiday DB table; normalized `portfolioJson`; `holidayCalendarVersion`) | Carried |
| §31 Service table | V4 §30 + V4.1 §12 (Model A clarifications) | Carried |
| §32 Crash-saga table | V4 §31 | Carried |
| §33.1 Governing corpus criterion | **V4.4 §4**, applied consistently by **V4.5 §5** | **V4.4/V4.5 control** |
| §33.2 Digest, projection set, `corpusId` excluded | V4 §32 → V4.1 §9.3 → **V4.2 §7** | **V4.2 controls** |
| §33.3 `ComparisonScope` / `PurchaseSignature` | **V4.2 §7.1/§7.2**; carried unchanged by V4.3 §3.4, V4.4 §6, V4.5 §12 | Carried |
| §33.4 `RuleVersion` (full `provenance`) | V4.2 §7.3 (provenance EXCLUDE) → V4.3 §3 (`observedAt` INCLUDE) → **V4.4 §3/§5/§7 (`sourceId`, `url` INCLUDE)** | **V4.4 controls** |
| §33.5 `constraints` | **V4.2 §7.4**; carried by V4.3 §3.3, V4.4 §6, V4.5 §12 | Carried |
| §33.6 `RuleOperationalState` (`asOf`, `note`) | V4.2 §7.5 (EXCLUDE) → V4.3 §3.4 / V4.4 §6 (EXCLUDE) → **V4.5 §3/§4/§6/§7 (INCLUDE)** | **V4.5 controls** |
| §33.7 Array classification | **V4.2 §7.6**; carried by V4.3 §3.4, V4.4 §6, V4.5 §12 | Carried |
| §33.8 Ordering and cardinality | **V4.2 §7.7** + V4.1 §9.3 (sort-before-hash rationale) | Carried |
| §33.9 Exhaustiveness | V4.4 §10 + **V4.5 §11** | **V4.5 controls** |
| §33.10 Release ledger and bootstrap | V4.1 §9.1/§9.2 → **V4.2 §6/§6.1**; digest hex deferred to the bootstrap gate per V4.2 §6.1, V4.3 §3.5, V4.4 §13, V4.5 §15 | **V4.2 controls** |
| §33.11 Corpus attack tests | V4.2 §8 + V4.3 §3.6 + **V4.4 §8/§9** + **V4.5 §8/§9/§10** | Cumulative |
| §33.12 Relationship to frozen input | V4 §32 + V4.1 §9.4 + V4.3 §3.5 | Carried |
| §34 External protected base-SHA governance | **V4.2 §4/§4.1/§4.2/§4.3/§5/§8**; carried by V4.3 §5, V4.4 §9, V4.5 §12 | Carried |
| §35 H04 unused token material | V4 §33 | Carried |
| §36 Timestamps | V4 §34 | Carried |
| §37 SCI invariants | V4 §35 + V4.1 §13 + V4.2 §11 + V4.3 §6 + V4.4 §11 + **V4.5 §13** | Cumulative; READY states as at the last gate |
| §38 R35R matrix | V4 §36 + V4.1 §14 + V4.2 §12 + V4.3 §7 + V4.4 §12 + **V4.5 §14** | Cumulative |
| §39 `entrySource` materiality | V4 §37 | Carried |
| §40 Deferred register | V4 §38 + V4.3/§V4.4/§V4.5 status blocks | Carried |
| §41 DecisionRequest freeze transaction | V4 §40 + V4.1 §5.5/§11 (coverage check) + V4.2 §2 (cardinality) | Carried + consolidation ordering |
| §42 Case-C locking note | V4 §42 | Carried |
| §43 Adversarial test matrix | V4 §43 + V4 §50/§51 + V4.1 §16 + V4.2 §3.11/§9 + V4.3 §4.6 + V4.4 §8 + V4.5 §8/§9/§10 | Cumulative |
| §44 No B/C leak | V4 §44; the B cross-reference note is a **pointer**, added by the R-B-17 repair, asserting no A2 semantics | Carried + non-semantic pointer |
| §45 Consolidated closure matrix | V4 §53 + V4.1 §15 + V4.2 §13 + V4.3 §9 + V4.4 §15 + V4.5 §17 | Cumulative |
| §46 Status and next action | V4 §41 / V4.1 §17 / V4.2 §14 / V4.3 §8 / V4.4 §13 / V4.5 §15, updated only for the **accepted** implementation state | Status restatement |

**Consolidation-time additions that are NOT A2 semantics:** §0 in full; the Appendix A and Appendix B tables; the §44 cross-reference note. Nothing in these adds, removes or alters an A2 normative rule.

**Deliberately not supplied (per §0.3 rule 3):** the concrete `corpusSemanticDigest` hex for `PAGAMENOS_VALIDATION_CORPUS_v1_2026-08-30T1800-0500`. Every revision from V4.2 onward states that it is produced at the authority-bootstrap gate and must not be hand-authored. This consolidation preserves that.

---

# Appendix B — Register of neutralized supersession claims

Each archived historical A2 revision carries a header claiming it "fully supersedes" the earlier ones. Those claims described the **review packet** for one gate, not the standing architecture. They are recorded here and are **non-operative**.

| Revision | Literal header claim | Actual accepted scope | Disposition |
| :-- | :-- | :-- | :-- |
| V2 | "fully replaces `PAGAMENOS_M3_5B_A2_EFFECTIVE_SPEC.md` for review" *(quoted verbatim; that unversioned file is archived as `PAGAMENOS_M3_5B_A2_EFFECTIVE_SPEC_V1.md`)* | pre-gate blockers A2-PRE-01…07 | HISTORICAL; superseded before the accepted chain |
| V3 | "fully supersedes V1 and V2 for review" | A2-PRE-08…13 | HISTORICAL; superseded before the accepted chain |
| V4 | "fully supersedes V1/V2/V3" | **true for V1–V3**; V4 is the architectural spine | HISTORICAL; **spine consolidated into this document** |
| V4.1 | "fully supersedes V1/V2/V3/V4" | **false as written** — a bounded patch closing DG-01, DG-02(partial), DG-03, H02, H03, V4-NEW-01; it explicitly carries DG-04/05/06/H01/H04/H05 forward in its §10 | **Non-operative.** V4 architecture survives; V4.1 controls only what it corrects |
| V4.2 | "fully supersedes V1–V4.1" | **false as written** — closes only DG-02, H03, V4-NEW-01; §10 explicitly carries the rest | **Non-operative.** V4.2 controls only what it corrects |
| V4.3 | "fully supersedes V1–V4.2 for review" | **false as written** — exactly two corrections (corpus `observedAt`; portfolio comparator); §5 lists explicit non-regressions | **Non-operative.** V4.3 controls only what it corrects |
| V4.4 | "fully supersedes V1–V4.3 for review" | **false as written** — one correction (`provenance.sourceId`/`url` to INCLUDE); §14 lists explicit non-regressions | **Non-operative.** V4.4 controls only what it corrects |
| V4.5 | "fully supersedes V1–V4.4 for review" | **false as written** — one correction (`RuleOperationalState.asOf` / `note` to INCLUDE); §16 lists explicit non-regressions | **Non-operative.** V4.5 controls only what it corrects |

This register discharges the diagnostic finding **AUTH-05** ("the A2 revision chain's supersession claims are literally false"), recorded in the non-normative `PAGAMENOS_M3_5B_B1_EFFECTIVE_SPEC_V1`. No historical revision retains an operative claim to supersede this canonical document; each archived file carries a visible header saying so.

---

```
CANONICAL A2 NORMATIVE SPECIFICATION.
CONSOLIDATION ONLY - NO A2 SEMANTIC CHANGE.
NO IMPLEMENTATION DELTA.
A2 ACCEPTED AT 22c8efe016a1f743196c45fe4b78d606b56d1567 (INTEGRATION 81b1cc606df9eeff7766c5afdaa56eeddb0db1a5).
B1 / B2 RATIFIED, NOT YET SPECIFIED.
C1 / C2 NOT AUTHORIZED.
PRODUCTION PROTOCOL v1 UNFROZEN.
WAVE 0 NOT AUTHORIZED.
```

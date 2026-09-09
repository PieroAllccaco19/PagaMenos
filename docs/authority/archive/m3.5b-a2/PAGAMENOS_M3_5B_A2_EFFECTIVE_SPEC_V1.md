<!-- R-B-17 ARCHIVAL HEADER - BEGIN. Added by the R-B-17 authority repair. Nothing below the END marker is altered. -->

> # HISTORICAL / NON-NORMATIVE
>
> **Status:** `HISTORICAL / NON-NORMATIVE - superseded before the accepted A2 chain`
>
> **This document is retained as audit evidence only. It is NOT active authority and MUST NOT drive implementation, review, or gating.**
>
> **Active normative A2 specification:** `PAGAMENOS_M3_5B_A2_EFFECTIVE_SPEC_CANONICAL_V1.md`, which consolidates the accepted V4 to V4.5 chain without semantic change.
>
> **Supersession language inside this file is non-operative.** Any claim below of the form "fully supersedes" or "fully replaces" described the review packet submitted to one historical gate. It does **not** supersede, and never superseded, the active normative artifact named above. See Appendix B of the canonical A2 specification for the full register of neutralized claims.
>
> **Body integrity.** Everything after the `R-B-17 ARCHIVAL HEADER - END` marker is the original file, byte for byte. Its SHA-256 before archival was:
>
> `sha256:8ee9dc6fcf795e9229b16a24ccd0f434f4af84a1b6efb1dc1b1c8af4f75fba62`
>
> Verify with: `tail -n +23 <this file> | sha256sum`
>
> **Root authority register:** `PAGAMENOS_SPEC_AUTHORITY.md` · **Repair record:** `PAGAMENOS_R_B_17_AUTHORITY_REPAIR_REPORT.md`

<!-- R-B-17 ARCHIVAL HEADER - END -->

# PAGAMENOS — M3.5B-A2 EFFECTIVE PRE-IMPLEMENTATION SPECIFICATION

**Milestone:** M3.5B-A2 — PurchaseIntent lifecycle · deterministic decision-request freezing · exact snapshot binding · crash-repair saga.
**Status:** DESIGN / SPECIFICATION ONLY. A2 not implemented. No code / Prisma / migrations / Git / commits / implementation / B/C / Wave 0.
**Nature:** self-contained. An independent reviewer needs only (1) this document, (2) the accepted A1 spec `PAGAMENOS_M3_5B_A1_EFFECTIVE_SPEC_V2_1.md`, and (3) the accepted repository baseline, to gate A2. R.1/R.1a/R.1b/R.1c history is not required.

**Accepted baselines**
- M3.5A accepted implementation (decision persistence authority): `64cf864a817c137920204487ab3317bc6d4c9ba5`.
- M3.5B-A1 accepted implementation (participant/assignment/consent authority): `99f2d61bc45839d6f9506abee5fae641bfcd8b2e` (Codex Sol: **A — ACCEPTED**, A1 CLOSED). Documentation-only child `7c0a3d9e0add34e4823c01f22c21542817dbc881` changes documentation only and does NOT replace the accepted implementation SHA.
- Accepted A1 design authority: `PAGAMENOS_M3_5B_A1_EFFECTIVE_SPEC_V2_1.md`. A2 **consumes** A1 facts; it does not redefine them.
- Failed historical prototype (evidence only, NOT authority): `1ded28d28038d4a385628683da096f846439a100` (Codex Sol: **C — NO-GO**). Its `PurchaseOccasion` / `ResearchContact` / `ValueVerification` / `WeeklyExposureReport` / lifted-scalar `AnalysisProtocol` / `consentBusinessKey` shapes are **not** A2 authority and are never reused.

**Conventions.** All instants zone-qualified (`America/Lima`); "trusted time" is sampled by the service from the system clock **under a stable row lock**, never caller-supplied. Money not used as identity. Every A2 scientific table is append-only at the DB level (BEFORE UPDATE/DELETE/TRUNCATE triggers that `RAISE`), matching the accepted M3.5A/A1 convention (`prisma/migrations/20260831120000_m3_5a_decision_snapshot/migration.sql` immutability guard). "M3.5A" quoted section markers (§n) refer to that milestone's accepted persistence contract; "A1 §n" refers to the V2.1 spec.

---

## 1. Executive A2 Design Summary

A2 answers exactly one question: **how does one trustworthy participant purchase intent become exactly one immutable decision request and exactly one matching immutable `DecisionSnapshot`, despite retries, concurrent calls, crashes, redeploys, engine/corpus version changes, intent correction/invalidation, and lost responses?**

The design chain, all additive over accepted M3.5A + A1:

1. **Immutable `PurchaseIntent` root** whose DB-assigned `id` (a UUID) is the sole basis of decision domain identity. No caller-, merchant-, amount-, session-, or time-bucket-derived key ever exists.
2. **Exact capture identity** (`intentCaptureKey`, minted by the trusted A1 participant-session adapter) separates *transport retry* (same capture, converge to one root) from *genuinely distinct capture* (two roots), independently of merchant/amount/time similarity. Transport idempotency (`PurchaseIntentCreateReceipt`) is layered on top and never substitutes for capture identity.
3. **Append-only `PurchaseIntentContextVersion`** captures corrigible context; **`PurchaseIntentFinalization`** pins exactly one context version; later context can never silently re-select.
4. **`businessDecisionKey = "pagamenos:study-intent-decision:v1:" + PurchaseIntent.id`** — structurally collision-free (distinct immutable UUIDs → distinct keys), closing R35R-04 permanently.
5. **`PurchaseIntentDecisionRequest`** freezes the exact validated `DecideInput` (verbatim JSON + `decideInputHash`) and pins the expected engine/corpus economic-semantic versions **before** M3.5A `decideAndPersist` is ever called. A retry always reloads the frozen input; it never reconstructs it from mutable current state.
6. **Semantic pinning**: if no exact historical snapshot exists and current engine/corpus semantics ≠ the pinned expected semantics, the saga **fails closed** — never recompute a frozen request under changed economic semantics. A build-only change (`gitSha`) is not an economic-semantic change and never blocks repair.
7. **`findExactHistoricalDecision`** — one narrow, additive, read-only M3.5A facade returning `NONE | FOUND(snapshot) | CONFLICT` on exact `(businessDecisionKey, m3_5aIdempotencyKey, decideInputHash)` identity with full receipt/snapshot integrity verification. Corrupted/partial state is never collapsed to `NONE`.
8. **`PurchaseIntentDecisionBinding`** — exact 1:1 intent↔snapshot, created only after exact coherence verification, immutable, surviving invalidation.
9. **Crash-repair saga** `decideForPurchaseIntent({ intentId })` — deterministic; the engine reruns only on the genuinely-new path under matching semantics, never after a snapshot already exists.

A2 is a **system-integrity** contract. It does **not** assert B/C opportunity/occasion/denominator semantics: `PurchaseIntent ≠ PurchaseOccasion ≠ denominator opportunity` (§45).

---

## 2. Scope / Non-Scope

**A2 authorizes exactly:** `PurchaseIntent` immutable root; `intentCaptureKey` capture identity (minimum trusted infrastructure for exact-retry); `PurchaseIntentContextVersion`; `PurchaseIntentFinalization`; `PurchaseIntentInvalidation` (invalidation/replacement lineage); deterministic `businessDecisionKey`; `PurchaseIntentDecisionRequest` (frozen validated `DecideInput` + semantic pins + M3.5A idempotency identity); `PurchaseIntentDecisionBinding`; the narrow additive read-only `findExactHistoricalDecision` M3.5A facade; A2 concrete write receipts; A2 capability boundary; A2-owned SCI invariants and adversarial tests; the additive Prisma models, migrations (triggers/constraints), AST/ESLint capability extensions, and services realizing the above.

**Explicitly OUT of scope (remain B/C):** `PurchaseOccasion`; occasion correction lineages; `ResearchContact`; `AuthMessage`; weekly reports; opportunity reconciliation; entry-source *adjudication*; aggregate/app overlap; `TransactionCorroboration`; `BaselineCorroboration`; `ValueVerification`; redeemed-benefit attribution; VS3/VS4; RIVSR; denominator bounds; `thresholdStatus`; C2 analysis bundles. A2 may **persist provenance facts** (e.g. `entrySource`, `intentType`, `intendedTransactionAt`) that B/C later consume, but MUST NOT resolve any B/C semantics.

A2 does **not** reopen A1 (§7). A2 does **not** authorize production Protocol v1 freeze, deploy, or Wave 0 (§33).

---

## 3. Accepted Baseline Dependencies

### 3.1 M3.5A decision-persistence facts A2 consumes (verified against `64cf864`)

`DecisionSnapshot` (table `decision_snapshot`), immutable/append-only at DB level, columns A2 relies on:
`id` (UUID, DB-assigned); `businessDecisionKey` **UNIQUE**; version pins `snapshotSchemaVersion` / `engineInputSchemaVersion` / `engineOutputSchemaVersion` / `engineContractVersion`; `corpusVersion`; queryable `merchantId` / `selectedScopeId` / `decisionStatus`; `evaluatedAt` / `intendedTransactionAt` (timestamptz); `engineInputJson` / `engineOutputJson` (JSONB, historical truth); `inputHash` / `outputHash` (SHA-256 hex over canonical bytes); `gitSha` / `buildId`; `createdAt`.

`DecisionIdempotencyReceipt` (table `decision_idempotency_receipt`), append-only: `operationScope` (trusted, e.g. `DECISION_PERSIST_V1`); `idempotencyKey`; `requestHash`; `decisionSnapshotId` → snapshot; **UNIQUE(operationScope, idempotencyKey)**.

Sanctioned service surface (`src/services/decide-and-persist.ts`, re-exported by `src/services/index.ts`):
- `decideAndPersist(request: { input: DecideInput; businessDecisionKey: string; idempotencyKey: string }): Promise<DecisionSnapshotDto>` — one argument, TRUSTED production deps (corpus provenance, env build, production repository, accepted engine); **no** caller-supplied provenance/engine/deps/output.
- `loadDecisionSnapshot(id): Promise<DecisionSnapshotDto | null>` — full historical verification.
- `replayDecisionSnapshot(id): Promise<ReplayComparison | null>` — diagnostic; never mutates.

**FROZEN M3.5A identity equivalence** (`src/persistence/snapshot.ts:computeRequestHash`, `src/persistence/hash.ts`, `src/persistence/canonical.ts`):
```
requestHash === DecisionSnapshot.inputHash === SHA-256(canonical(validated DecideInput))
```
`businessDecisionKey` is **always compared separately** from `requestHash` (`assertReceiptMatchesRequest`, `src/persistence/snapshot.ts`). `decideAndPersist` resolves an exact-retry receipt **before** any engine/corpus/build work; a business-key alias without recompute; and constructs trusted providers + runs the engine **only** on the genuinely-new path.

Semantic-identity authorities A2 pins against (accepted, `src/persistence/versions.ts` and `src/persistence/provenance.ts`):
- `ENGINE_CONTRACT_VERSION = 'pagamenos.engine.m3.v1'` — the economic decision contract.
- `corpusVersion = loadCorpus().corpusId` — the factual corpus label the trusted provenance provider returns.
- `gitSha` / `buildId` — **build** identity (deployment), *not* an economic-semantic version.

Capability enforcement A2 extends: the ESLint `no-restricted-imports` boundary (`eslint.config.mjs`, `FORBIDDEN_WRITE_INTERNALS` / `FORBIDDEN_DEEP_SERVICE`) plus the AST module-capability test (`src/lib/module-capability.test.ts`, `RAW_WRITE_MODULES` / `DEEP_SERVICE` / `SANCTIONED_IMPLS` + the fail-closed non-literal `import()` rule). The raw `src/db` barrel exports nothing (`src/db/index.ts`).

### 3.2 A1 facts A2 consumes (V2.1 spec, not re-derived)

`StudyParticipant` (stable `recruitmentSubjectKey`, opaque `participantCode`); `Experiment` (frozen-protocol anchor); `ExperimentAssignment { id, experimentId, participantId, enrolledAt, observationStartAt, UNIQUE(experimentId, participantId) }` — the official population fact, immutable, not deleted on withdrawal; `StudyConsentEvent` append-only stream + state machine; A1 consent authorization functions `wasCollectionAuthorizedAtKnownTime(...)` and `deriveConsentAuthorizationIntervals(...)` (A1 §8.8); the trusted participant actor/session context and own-assignment binding (A1 §12); A1 receipt architecture `UNIQUE(operationScope, idempotencyKey)` + concrete strong-FK target + `requestHash` (A1 §9/§10); the A1 module-capability boundary (A1 §11).

A2 **references** these; it does not duplicate their authority and does not alter A1 tables.

---

## 4. PurchaseIntent — Immutable Root

The immutable root carries only fields that are **scientific identity** and never change. Corrigible context lives in `PurchaseIntentContextVersion` (§8).

```
PurchaseIntent {
  id                 PK  UUID  DB-assigned (gen_random_uuid())   -- SOLE basis of decision identity
  assignmentId       FK → ExperimentAssignment                   -- trusted A1 population/consent anchor
  intentCaptureKey   UNIQUE                                       -- stable trusted capture identity (§5)
  intentCaptureKeyVersion                                         -- normalization version of the capture key
  intentType         BUYING_NOW | BUYING_TODAY | CONSIDERING_LATER | EXPLORATORY   -- immutable initiation (Phase 0A §29)
  entrySource        DIRECT | CONTENT | SHARED_LINK | RESEARCH_LINK | AUTH_LINK | SAVED_DECISION | OTHER  -- provenance only (Phase 0A §29); NOT adjudicated
  captureOrigin?                                                  -- optional trusted provenance label
  initiatedAt        TIMESTAMPTZ  trusted (sampled under root creation)  -- immutable initiation instant
  createdAt          TIMESTAMPTZ  trusted
}
```

Rules:
- `id` is DB-assigned; the application never supplies it. Because `businessDecisionKey` (§11) is a pure function of `id`, and `id` is a fresh UUID per root, **two intents can never collide on one `businessDecisionKey`** and one intent's key is stable forever.
- `intentType` and `entrySource` are **immutable initiation** facts (Phase 0A §29): they are frozen at root creation and never appear in a context version. `entrySource` is stored as *provenance* — A2 performs **no** entry-source adjudication and never derives PRECONTACT/independence from any caller boolean (that is B).
- `assignmentId` is the trusted A1 relationship. Participant + experiment identity is reached only through the assignment; A2 never trusts a raw `participantId` from a request (own-assignment binding, §7/§40).
- The root is append-only/immutable at the DB level (trigger). A "change" to a purchase intent is never an edit: corrigible context is a new `PurchaseIntentContextVersion` before finalization; a materially different intent is a new root via invalidation/replacement (§10).

Field-classification rationale table:

| Field | Class | Why here (not context/version) |
| :-- | :-- | :-- |
| id | immutable identity | decision domain identity; basis of businessDecisionKey |
| assignmentId | immutable identity | trusted population/consent anchor; determines replacement legality |
| intentCaptureKey | immutable identity | exact-retry vs distinct-capture discriminator (§5) |
| intentType | immutable initiation | Phase 0A §29; qualifies later B analysis, never re-declared |
| entrySource | immutable provenance | Phase 0A §29; B consumes, A2 never adjudicates |
| initiatedAt | immutable trusted time | initiation evidence; never overwritten |
| merchant / amount / channel / intendedTransactionAt / basket | **context (versioned)** | corrigible before finalization → `PurchaseIntentContextVersion` (§8) |

---

## 5. Exact Capture Identity / Retry Semantics

**Transport idempotency is NOT scientific identity.** Two orthogonal identities:

- **Capture identity** = `intentCaptureKey`: a stable, pseudonymous, per-intended-capture token **minted by the trusted A1 participant-session adapter** (the same trusted-context layer A1 §12 uses to resolve a participant's own assignment) at/just before the first capture attempt, bound to the actor's own `ExperimentAssignment`. It is presented on every transport retry of that same capture. `intentCaptureKey` is the domain discriminator: `UNIQUE(intentCaptureKey)` + P2002 reconcile.
- **Transport identity** = `(operationScope, idempotencyKey)` on `PurchaseIntentCreateReceipt` (§32/§34): the HTTP/app request key, which may rotate across retries.

Convergence matrix (mechanically implementable via `UNIQUE(intentCaptureKey)` + the create receipt; mirrors A1 §5.1 participant dedup):

| transport key | capture (`intentCaptureKey`) | Result |
| :-- | :-- | :-- |
| same | same | replay historical intent (create-receipt replay) |
| same | different | `PurchaseIntentCaptureConflictError` (one key cannot mean two captures) |
| different | same | same PurchaseIntent + **alias** create-receipt |
| different | different | two distinct PurchaseIntent roots |
| concurrent different keys | same | exactly one root (`UNIQUE(intentCaptureKey)` + P2002) |

**Non-collapse invariant (critical):** two genuinely distinct captures with the **same merchant, similar amount, similar intended time, same session, similar context** produce **two** `PurchaseIntent` roots, because they carry **two** `intentCaptureKey` values. A2 dedup is *exact-capture/retry correctness only*. It never uses merchant/amount/time heuristics as identity, and it never asserts that multiple captures are one economic opportunity — that reconciliation is B1/B2 (§45).

`intentCaptureKey` is the **narrowest** stable capture identity: A2 introduces no new session store. It reuses the A1 trusted participant-session adapter to mint and validate the key against the actor's own assignment; the key is opaque and pseudonymous (no PII). The only A2-internal operation is the mint (§50 `issueIntentCaptureKey`), which the trusted adapter performs; participant-facing code never mints its own capture identity.

---

## 6. Trusted Capture Provenance

Prior R35R findings require **initiation, finalization, correction, retry, and trusted entry provenance to remain separate, never conflated** (R35R-06). A2 keeps them in distinct structures:

| Concern | Where persisted | Mutability |
| :-- | :-- | :-- |
| initiation (who/how/when it began) | `PurchaseIntent` root (`assignmentId`, `intentType`, `entrySource`, `initiatedAt`, `intentCaptureKey`) | immutable |
| correction (context change before finalize) | new `PurchaseIntentContextVersion` | append-only |
| finalization (which context decided) | `PurchaseIntentFinalization` | immutable |
| retry (transport) | `PurchaseIntentCreateReceipt` / `PurchaseIntentContextCommandReceipt` / … | append-only |
| trusted entry provenance | root `entrySource` / `captureOrigin`; context version fields | immutable per version |

Trusted facts A2 **persists** (authority: Phase 0A §29; A1 anchor):
- trusted `ExperimentAssignment` (root FK) — required.
- trusted participant/session identity — via the trusted adapter (not stored as PII; represented by `assignmentId` + `intentCaptureKey`).
- stable trusted capture identifier `intentCaptureKey` — required.
- capture origin `entrySource` (+ optional `captureOrigin`) — provenance only.
- `initiatedAt` — trusted, service-sampled.
- participant-entered intended purchase instant/window `intendedTransactionAt` — in the context version when supplied.
- merchant identity/context, amount/channel/location where available — in the context version.
- `intentType` (BUYING_NOW / BUYING_TODAY / CONSIDERING_LATER / EXPLORATORY) where authoritative — root.

A2 does **not** create `ResearchContact`, does **not** classify PRECONTACT from a caller boolean, and does **not** implement B entry-source adjudication. It records enough trusted provenance for later RT12/B rules **without deciding them**.

---

## 7. A1 Consent Boundary

A2 respects the accepted A1 consent authority. The decisive distinction:

- **New participant collection** (requires A1 collection authorization at trusted capture time): `createPurchaseIntent`, `appendPurchaseIntentContext`, `finalizePurchaseIntent`, `invalidatePurchaseIntent`. For each, trusted capture time is sampled internally under the relevant row lock; A2 calls the A1 authority `wasCollectionAuthorizedAtKnownTime(...)` over the **already-recorded** consent events for the actor's own assignment; a participant whose consent was not open at that internally-sampled instant cannot create new capture through the participant-facing path. This is checked at collection time only, using facts known then — never using *current* consent to rewrite history (A1 §8.8).
- **Internal crash repair** (`decideForPurchaseIntent` completing a DecisionRequest → snapshot → binding): **NOT new participant collection.** It consumes facts (the finalized context) already durably captured and authorized. A later withdrawal MUST NOT (a) delete any historical fact, (b) prevent purely-internal completion of an already-durably-established DecisionRequest, or (c) retroactively invalidate a collection that was authorized when it occurred.

Therefore "current consent" is **never** a predicate that rewrites historical authority. Withdrawal marks the participant's *future* participant-facing collection closed and (via invalidation, if the participant/researcher issues it) marks a root non-effective for B/C — but it does not erase or block deterministic internal repair of what was validly established.

Own-assignment binding (A1 §12): every A2 participant-facing operation receives a `trustedParticipantContext`, resolves the participant's **own** assignment, and honors an opaque `intentId`/`assignmentId` reference only if the trusted adapter verifies it belongs to that actor. A2 never trusts a caller-supplied `participantId`/`assignmentId`.

---

## 8. Context Versioning

Context is append-only; `PurchaseIntent` is never mutated to hold context.

```
PurchaseIntentContextVersion {
  id             PK UUID
  intentId       FK → PurchaseIntent
  contextSeq     INT   -- monotonic per intent, allocated under the PurchaseIntent row lock
  merchantId
  intendedTransactionAt   TIMESTAMPTZ?   -- participant-entered intended instant/window when supplied
  channel?
  amountCentimos?         -- non-negative integer; provenance, never an identity key
  branch? / locationRef?
  basketRef?              -- opaque reference; A2 stores provenance, not basket adjudication
  capturedAt     TIMESTAMPTZ trusted   -- sampled under the root lock
  recordedAt     TIMESTAMPTZ           -- knowledge time (when the system learned it)
  capturedByContext        -- trusted actor/session provenance (assignment-bound)
  UNIQUE(intentId, contextSeq)
}
```

- `contextSeq` is allocated under `SELECT ... FOR UPDATE` on the parent `PurchaseIntent` row; concurrent appends serialize and receive distinct increasing sequences. `UNIQUE(intentId, contextSeq)` is defense-in-depth, not the sole concurrency mechanism.
- Historical context is never overwritten. A **material correction before finalization** appends a new version (higher `contextSeq`); the earlier version remains.
- Idempotency: an append command is identified by `PurchaseIntentContextCommandReceipt` (§35) keyed on a stable trusted capture/command identity, so a transport retry with a different key does not manufacture a duplicate version, while a genuinely-new participant context update does append.
- **After finalization** (§9): the context used for the decision is the exact pinned version. No later context version may silently change the frozen `DecisionRequest`. A material correction after finalization is not an in-place change — it requires explicit invalidation/replacement (§10). Whether a post-finalization append is *rejected* or merely *ineffective for the decision* is specified as: **appends after finalization are rejected** (`PurchaseIntentContextAfterFinalizationError`) — the intent is closed to further context; a genuine change is a replacement root. This keeps "which context decided" unambiguous and append-only.

---

## 9. Finalization

Exactly one effective finalization per intent, pinning exactly one context version.

```
PurchaseIntentFinalization {
  id                 PK UUID
  intentId           UNIQUE FK → PurchaseIntent          -- at most one finalization per intent
  contextVersionId   UNIQUE FK → PurchaseIntentContextVersion   -- the EXACT pinned context (must belong to intentId)
  finalizedAt        TIMESTAMPTZ trusted
  finalizedByContext -- trusted actor/session provenance (assignment-bound)
}
```

Contract:
- **Preconditions:** the intent exists and is **effective** (not invalidated, §10); at least one `PurchaseIntentContextVersion` exists; A1 collection authorization holds at the internally-sampled `finalizedAt` (new collection, §7); the selected `contextVersionId` belongs to `intentId` (enforced in-transaction under the root lock, and as a service invariant; a cross-table CHECK cannot subquery, so this is a trigger/transaction check, §25).
- **Pins the exact context version.** Finalization stores `contextVersionId` explicitly. It **must not** select "latest context" dynamically on any future read; the pinned identity is persisted once.
- **Idempotency / concurrency:** `UNIQUE(intentId)` guarantees one finalization; concurrent finalize calls serialize on the `PurchaseIntent` row lock, and the loser P2002-reconciles to the existing finalization. A retry that names the **same** `contextVersionId` replays the existing finalization; a retry naming a **different** `contextVersionId` after finalization is a `PurchaseIntentFinalizationConflictError` (finalization can never re-point).
- **Finalization after invalidation:** rejected (`PurchaseIntentInvalidatedError`) — an invalidated intent cannot finalize.
- **After finalization:** no further context append (§8); the finalized context is frozen input to the `DecisionRequest` (§13).

---

## 10. Invalidation / Replacement

Append-only invalidation lineage; history is always retained.

```
PurchaseIntentInvalidation {
  id                    PK UUID
  invalidatedIntentId   UNIQUE FK → PurchaseIntent    -- an intent is invalidated at most once
  replacementIntentId?  FK → PurchaseIntent           -- optional; a NEW root
  invalidatedAt         TIMESTAMPTZ trusted
  reasonCode?           -- typed enum (no free text as scientific input); see §37
  invalidatedByContext  -- trusted actor/session provenance
  CHECK (replacementIntentId IS NULL OR replacementIntentId <> invalidatedIntentId)   -- no self-link
}
```

Required semantics:
- The invalidated intent and all its context/finalization/request/snapshot/binding **remain historically present** — never deleted.
- The invalidated intent is **scientifically non-effective** for future B/C analysis (a derived property of the presence of an invalidation row; not a mutable flag on the root).
- `replacementIntentId`, when present, is a **new** `PurchaseIntent` root belonging to the **same `ExperimentAssignment`** as the invalidated intent (cross-row → trigger/transaction check, §25), `<> invalidatedIntentId` (single-table CHECK), and receives its **own** `businessDecisionKey` and its own decision identity. The replacement **never inherits or reuses** the invalidated intent's context/finalization/request/snapshot/binding.
- Invalidation itself does **not** assert B-level opportunity identity. It is intent-replacement history, not occasion lineage.

**Can a replacement itself be invalidated?** Yes — a replacement is an ordinary root and may later be invalidated with its own replacement, forming a linear chain `A ⇒ B ⇒ C`. Cycle safety is specified in §44 (a simple CHECK is insufficient across rows).

---

## 11. BusinessDecisionKey

Frozen, exact:
```
businessDecisionKey = "pagamenos:study-intent-decision:v1:" + PurchaseIntent.id
```
No accepted-repository authority prescribes a different namespace (M3.5A enforces only uniqueness of `businessDecisionKey`, `prisma/schema.prisma` / `src/persistence/snapshot.ts`), so A2 fixes this literal namespace.

- The immutable `PurchaseIntent.id` (a DB-assigned UUID) is the decision domain identity. Same root ⇒ same key **forever**; a replacement root ⇒ a **different** key.
- **Forbidden and structurally impossible in A2:** merchant-only key; merchant+amount key; session key; timestamp-bucket key; any caller-provided `businessDecisionKey`. The public decision service (§18) accepts no `businessDecisionKey` at all — it is derived internally from `intentId`.
- This closes R35R-04 by construction: distinct roots have distinct UUIDs, hence distinct keys; there is no field two distinct intents could share to collide.

---

## 12. PurchaseIntentDecisionRequest

The exact immutable frozen request, created once per intent, before any M3.5A engine work.

```
PurchaseIntentDecisionRequest {
  id                           PK UUID
  intentId                     UNIQUE FK → PurchaseIntent
  finalizationId               UNIQUE FK → PurchaseIntentFinalization   -- pins the exact decided context transitively

  decisionRequestSchemaVersion -- A2 envelope version, e.g. "pagamenos.intent-decision-request.v1"

  exactValidatedDecideInputJson  JSONB   -- the EXACT validated DecideInput, verbatim (frozen payload)
  decideInputHash                        -- SHA-256(canonical(exactValidatedDecideInputJson)) == M3.5A inputHash/requestHash

  expectedEngineContractVersion  -- pinned == accepted ENGINE_CONTRACT_VERSION at freeze time
  expectedCorpusVersion          -- pinned == loadCorpus().corpusId at freeze time

  businessDecisionKey          UNIQUE  -- derived (§11); stored for defense-in-depth + coherence
  m3_5aIdempotencyKey          UNIQUE  -- derived (§15)

  createdAt                    TIMESTAMPTZ trusted
}
```

Column classes:

| Column | Class | Notes |
| :-- | :-- | :-- |
| intentId, finalizationId | scientific identity (derived) | 1:1 with the decided intent; UNIQUE each |
| businessDecisionKey, m3_5aIdempotencyKey | derived identity | pure functions of `intentId` (§11/§15); UNIQUE each |
| exactValidatedDecideInputJson | frozen payload | verbatim; survives crash/redeploy/context change |
| decideInputHash | derived identity | canonical hash; equals M3.5A `inputHash`/`requestHash` |
| expectedEngineContractVersion, expectedCorpusVersion | semantic-version pins | drive the recompute fail-closed gate (§14/§19) |
| decisionRequestSchemaVersion | envelope version | pins how to read this A2 record |

Every column is immutable (append-only table + trigger). A2 deliberately does **not** duplicate M3.5A's structural payload-schema versions (`snapshotSchemaVersion` etc.) — those are the snapshot's own self-description and are re-verified by M3.5A on load; A2 pins only the **economic-semantic** identities it must compare for the recompute gate. `gitSha`/`buildId` are intentionally **not** pinned as "expected" (a build/deploy change is not an economic-semantic change; §14/§27).

---

## 13. Exact DecideInput Freezing

Mandatory ordering (the freeze commits **before** M3.5A ever runs):

```
finalized effective PurchaseIntent
  → load exact finalized PurchaseIntentContextVersion (via PurchaseIntentFinalization.contextVersionId)
  → derive authoritative DecideInput:
        context   ← finalized context version (merchant, channel, amounts, intendedTransactionAt, basket)
        rules/scopes/operationalStates ← trusted corpus (loadCorpus) for the merchant
        portfolio ← participant's trusted portfolio (assignment-bound)
        evaluatedAt ← trusted, sampled at freeze
  → validate against the accepted DecideInput contract (engineInputV1Schema, src/persistence/schema.ts)
  → assertCanonicalizable + canonicalize (src/persistence/canonical.ts)
  → decideInputHash = SHA-256(canonical) (src/persistence/hash.ts)
  → pin expectedEngineContractVersion (ENGINE_CONTRACT_VERSION), expectedCorpusVersion (corpusId)
  → persist immutable PurchaseIntentDecisionRequest
  → COMMIT durable request
  → ONLY THEN may decideForPurchaseIntent proceed to M3.5A decideAndPersist (§20/§26)
```

The frozen `exactValidatedDecideInputJson` must survive process crash, restart, deploy, and any change to *current* context / catalog / corpus / app configuration. **A retry MUST load the persisted `exactValidatedDecideInputJson` verbatim and pass it to `decideAndPersist`; it MUST NEVER reconstruct the historical `DecideInput` from mutable/current state.** Because `decideInputHash == canonicalHash(exactValidatedDecideInputJson) == M3.5A inputHash == requestHash`, the frozen request is the exact coherence anchor for the historical finder (§18) and binding (§17).

---

## 14. Engine/Corpus Semantic Pinning

The `DecisionRequest` pins `expectedEngineContractVersion` and `expectedCorpusVersion` at freeze time. This lets the saga detect:
```
request frozen under runtime R1 → crash → deploy R2 → retry
```
Two cases (normative):

- **Exact historical snapshot already exists** (found via `findExactHistoricalDecision`, §18): repair may **return/bind** the historical snapshot even if current runtime economic semantics differ. **No recomputation.** (This covers "deploy after snapshot but before binding".)
- **No exact historical snapshot exists** (`NONE`): before calling `decideAndPersist`, the current runtime economic-semantic identities MUST equal the request's pinned expected identities:
  ```
  loadCorpus().corpusId === expectedCorpusVersion   AND   ENGINE_CONTRACT_VERSION === expectedEngineContractVersion
  ```
  If not → **FAIL CLOSED** (`PurchaseIntentSemanticDriftError`). Never recompute a historical frozen request under changed economic semantics.

`gitSha`/`buildId` are **not** in this comparison: a redeploy that changes only the build but not `engineContractVersion`/`corpusVersion` leaves economic semantics identical, so recompute is still permitted; a redeploy that changes `engineContractVersion` or `corpusVersion` fails closed. A2 invents **no** arbitrary version strings — it reuses the accepted `ENGINE_CONTRACT_VERSION` constant and the corpus's own `corpusId`.

---

## 15. M3.5A Idempotency Identity

Deterministic internal M3.5A idempotency key:
```
m3_5aIdempotencyKey = "pagamenos:study-intent-decision-idem:v1:" + PurchaseIntent.id
```
Properties: derived internally (never a transport caller key); **stable forever** for one intent/DecisionRequest; namespace-versioned; **not regenerated per retry**; distinct across distinct intent roots (distinct UUIDs). Passed as `decideAndPersist({ ..., idempotencyKey: m3_5aIdempotencyKey })` under `operationScope = DECISION_PERSIST_V1`.

Relationships:
- with `PurchaseIntent.id`: pure function of it (like `businessDecisionKey`), in a **distinct namespace** so the two derived keys can never be confused.
- with `businessDecisionKey`: both address the same M3.5A decision; `businessDecisionKey` is the domain occurrence identity (snapshot UNIQUE), `m3_5aIdempotencyKey` is the transport-scoped receipt identity (receipt UNIQUE(operationScope, idempotencyKey)).
- with `decideInputHash`: `decideInputHash` is the M3.5A `requestHash`; the receipt A2 causes M3.5A to write will carry `requestHash == decideInputHash`. No redundant identity is introduced — each of the three has a distinct purpose (domain uniqueness / transport-receipt uniqueness / payload fingerprint).

Because A2 uses one deterministic `m3_5aIdempotencyKey` per intent and never a rotating key, M3.5A's alias mechanism is never exercised by A2 — there is exactly one `(businessDecisionKey, m3_5aIdempotencyKey)` pairing per intent, giving a tight coherence invariant the finder relies on (§18/§22).

---

## 16. PurchaseIntentDecisionBinding

Exact 1:1 intent↔snapshot binding.

```
PurchaseIntentDecisionBinding {
  id                 PK UUID
  intentId           UNIQUE FK → PurchaseIntent
  decisionRequestId  UNIQUE FK → PurchaseIntentDecisionRequest   -- explicit, strengthens identity
  snapshotId         UNIQUE   -- references decision_snapshot.id (M3.5A); see §19 for FK direction
  boundAt            TIMESTAMPTZ trusted
}
```

Mandatory:
- One `PurchaseIntent` → **at most one** snapshot binding (`UNIQUE(intentId)`).
- One `DecisionSnapshot` → **at most one** `PurchaseIntent` binding (`UNIQUE(snapshotId)`).
- Binding is immutable (append-only table + trigger).
- There is **no** public "attach snapshot"/"bind snapshot" operation; a binding is created only inside the sanctioned saga (§20) **after exact coherence verification** (§17).
- Historical bindings survive invalidation (§10/§30).
- `decisionRequestId` is included explicitly so a binding is provably the one produced by *this* frozen request (not merely "some snapshot for this intent"); the saga verifies `binding.decisionRequestId` ↔ `request.intentId` ↔ `snapshot.businessDecisionKey` coherently.

`snapshotId` references the M3.5A `decision_snapshot(id)`. Direction of the physical FK is discussed in §19 (A2 must not add a back-relation column to the accepted M3.5A table; the FK lives on the A2 side, referencing the immutable snapshot with `ON DELETE RESTRICT`, and M3.5A rows are never deleted).

---

## 17. Exact Snapshot Coherence

A binding is created **only** when the snapshot exactly matches the frozen request. Coherence predicate (all must hold):

1. `snapshot.businessDecisionKey === request.businessDecisionKey` (`=== "pagamenos:study-intent-decision:v1:" + intentId`).
2. The M3.5A idempotency receipt for `(DECISION_PERSIST_V1, request.m3_5aIdempotencyKey)` exists and its `decisionSnapshotId === snapshot.id`.
3. `receipt.requestHash === request.decideInputHash` **and** `snapshot.inputHash === request.decideInputHash` (M3.5A's frozen equivalence `requestHash === inputHash`, §3.1).
4. Snapshot integrity verification succeeds (M3.5A `verifyHistoricalSnapshot`: recompute canonical hashes + column↔payload coherence, `src/persistence/integrity.ts`).
5. Frozen request semantic metadata is coherent: `snapshot.engineContractVersion === request.expectedEngineContractVersion` and `snapshot.corpusVersion === request.expectedCorpusVersion` **when the snapshot was produced by this request** (i.e. on the recompute path). On the "historical snapshot found under drifted runtime" path (§14/§27), the snapshot's stamped versions are its own historical truth and are simply recorded — coherence 1–4 already prove exact identity; the version equality of clause 5 is asserted only for snapshots this request caused to be computed.

**Same merchant is NOT sufficient. Similar input is NOT sufficient. Same amount/time is NOT sufficient.** Only the exact `(businessDecisionKey, m3_5aIdempotencyKey, decideInputHash)` identity + integrity binds.

Typed fail-closed conflicts on partial mismatch (never silently proceed, never bind):
- `PurchaseIntentBindingBusinessKeyMismatchError` (clause 1 fails).
- `PurchaseIntentBindingReceiptMismatchError` (clause 2/3 fails: receipt missing, wrong snapshot, or wrong requestHash).
- `SnapshotIntegrityError` / `SnapshotCoherenceError` (clause 4 — reuse M3.5A typed errors).
- `PurchaseIntentBindingSemanticMismatchError` (clause 5 fails on a recompute-path snapshot).

---

## 18. findExactHistoricalDecision

The one narrow, additive, **read-only** M3.5A facade A2 requires.

```
findExactHistoricalDecision({
  businessDecisionKey: string,     // request.businessDecisionKey
  idempotencyKey:      string,     // request.m3_5aIdempotencyKey (operationScope = DECISION_PERSIST_V1)
  inputHash:           string,     // request.decideInputHash
}): Promise<{ kind: 'NONE' } | { kind: 'FOUND'; snapshot: DecisionSnapshotDto }>
   // throws a typed CONFLICT/integrity error otherwise
```

Implementation (using the accepted repository read methods `findReceipt`, `findSnapshotById`, `findSnapshotByBusinessKey`, `src/db/decision-snapshot-repository.ts`, and `verifyHistoricalSnapshot`):

Requirements — READ ONLY: **no** engine invocation, **no** corpus invocation, **no** provider/build recomputation, **no** write, **no** arbitrary repository exposure. Exact predicates only.

Algorithm:
1. `receipt = findReceipt(DECISION_PERSIST_V1, idempotencyKey)`.
2. `snapshotByKey = findSnapshotByBusinessKey(businessDecisionKey)`.
3. **NONE** iff `receipt` is null **and** `snapshotByKey` is null. (Nothing exists for this exact identity, and — because A2 writes snapshot+receipt atomically via M3.5A `createDecision` and uses one deterministic key pair per intent — no conflicting partial state can exist for this identity.) Return `{ kind: 'NONE' }`.
4. Otherwise verify complete coherence and either return `FOUND` or throw a typed CONFLICT (§24):
   - If `receipt` exists: `snapshot = findSnapshotById(receipt.decisionSnapshotId)`; if missing → `PurchaseIntentHistoricalReceiptDanglingError` (receipt without snapshot = corruption). Assert `receipt.requestHash === inputHash` (else `PurchaseIntentHistoricalReceiptHashMismatchError`) and `snapshot.businessDecisionKey === businessDecisionKey` (else `PurchaseIntentHistoricalBusinessKeyMismatchError`). `verifyHistoricalSnapshot(snapshot)` (else M3.5A integrity/coherence error). Assert `snapshot.inputHash === inputHash`. Return `FOUND(snapshot)`.
   - If `receipt` is null but `snapshotByKey` exists: this is a contradictory partial state for A2's identity model (a snapshot under this businessDecisionKey must have been written atomically with its receipt under the deterministic key) → `PurchaseIntentHistoricalSnapshotWithoutReceiptError`. Fail closed; never treat as `NONE`.
   - If `receipt` exists but `snapshotByKey` exists with a **different** `inputHash` than `inputHash` → `PurchaseIntentHistoricalBusinessKeyConflictError`.

`FOUND` is returned **only** when a historical decision exists for the exact identity **and** all integrity/coherence checks pass. `NONE` is returned **only** when nothing exists for the exact identity **and** no conflicting partial state exists.

---

## 19. M3.5A Boundary / Capability

A2 must **not** redesign M3.5A. The **only** allowed change is to **narrowly expose** `findExactHistoricalDecision` through a capability-protected sanctioned service. Concretely:

- `findExactHistoricalDecision` is added as an **additive, read-only** function in the sanctioned M3.5A implementation file `src/services/decide-and-persist.ts` (the only file already permitted raw repository access, `eslint.config.mjs` + `module-capability.test.ts`), using existing repository **read** methods only. This adds no write path and changes no economic semantics.
- It is **not** re-exported by the public `src/services/index.ts` barrel. It is reachable only by the A2 decision-repair service (a new sanctioned impl, §40) and by tests/internal integrity verification — enforced by adding the repair-service file to `SANCTIONED_IMPLS`/ESLint exemptions and keeping `services/decide-and-persist` in `DEEP_SERVICE` (off-limits to ordinary code).

A2 must **NOT**: expose the raw decision repository; mutate accepted M3.5A migrations; alter decision economic semantics; change `DecisionSnapshot` mutability; or change existing engine behavior.

**Snapshot FK direction:** the binding's `snapshotId` FK lives entirely on the **A2** `purchase_intent_decision_binding` table, referencing `decision_snapshot(id)` with `ON DELETE RESTRICT`. A2 adds **no** column or back-relation to the accepted `decision_snapshot` model (the accepted `64cf864` schema has no such back-relations; the failed prototype's `purchaseOccasions`/`valueVerifications` back-relations are NOT reintroduced). Adding a child table with an FK to an immutable, never-deleted parent is additive and does not mutate the M3.5A table or its triggers.

**A2 DESIGN BLOCKER declaration rule:** if any A2 requirement were found to need a *semantic* M3.5A change rather than additive read access, this document would declare `A2 DESIGN BLOCKER` and stop. **No such blocker exists** — every A2 need is met additively (§32/§52).

---

## 20. Crash-Repair Saga

`decideForPurchaseIntent({ intentId })` — trusted internal operation (PurchaseIntentDecisionCapability). No caller-provided DecideInput / engineContext / corpus / build / provider set / businessDecisionKey / idempotencyKey / snapshotId (§18-public-forbidden, §40).

**Step 0.** Resolve/authorize the caller (A2 capability). Load the effective intent + finalization state (must be finalized and effective; else typed error — no engine work).

**Case A — binding already exists.**
Load binding → load request → load exact snapshot (by `binding.snapshotId`) → verify complete coherence (§17) → return the historical snapshot. **No engine call.**

**Case B — DecisionRequest exists, binding absent.**
Load the exact frozen request. Call `findExactHistoricalDecision({ businessDecisionKey, m3_5aIdempotencyKey, decideInputHash })`:
- **FOUND**: verify coherence (§17) → create binding atomically/idempotently (§29) → return snapshot. **No engine call.**
- **NONE**: compare current economic-semantic identities to the pinned expected identities (§14). **Mismatch → fail closed** (`PurchaseIntentSemanticDriftError`). **Match →** call `decideAndPersist({ input: exactValidatedDecideInputJson (verbatim), businessDecisionKey, idempotencyKey: m3_5aIdempotencyKey })`; verify the returned snapshot (§17); create binding (§29); return snapshot.
- **CONFLICT** (typed): fail closed; never bind, never recompute.

**Case C — DecisionRequest absent.**
Under the stable `PurchaseIntent` root lock: verify the intent is finalized **and effective** (not invalidated); freeze/create exactly one `DecisionRequest` (§13); **COMMIT** (release lock); then continue through **Case B**.

**Transaction boundaries (deliberate):**
- The `PurchaseIntent` root lock is held only for the *short* DecisionRequest freeze/create (Case C) and never across engine execution.
- `decideAndPersist` runs **outside** any A2 row lock; it manages its own atomic snapshot+receipt write and race reconciliation (M3.5A, `createDecision`).
- Binding creation is its own short transaction relying on `UNIQUE(intentId)`/`UNIQUE(snapshotId)` + P2002 reconcile (§29).

The engine reruns **only** on Case B → NONE → semantics-match. Every other path returns/binds a historical snapshot without recomputation.

---

## 21. Concurrency / Locking

- **DecisionRequest creation** serializes on the `PurchaseIntent` root row (`SELECT ... FOR UPDATE`). The root is immutable but is a legal lock target. `UNIQUE(intentId)` on `PurchaseIntentDecisionRequest` is defense-in-depth; the row lock is the primary mechanism. Same frozen context ⇒ the same exact request (deterministic derivation); two concurrent Case-C entries cannot create two requests.
- **DecisionRequest creation vs invalidation** are mutually-exclusive transitions on the intent's *effective* status and serialize on the **same** `PurchaseIntent` root lock (§31), so no request is created "between verification and creation" while an invalidation commits, and vice versa — the outcome is deterministic by lock order.
- **Context append** allocates `contextSeq` under the same root lock (§8).
- **Finalization** serializes on the root lock; `UNIQUE(intentId)` is defense-in-depth (§9).
- **Binding** relies on `UNIQUE(intentId)` + `UNIQUE(snapshotId)` under a short transaction (§29); no long-held lock.
- **decideAndPersist** concurrency is entirely M3.5A's (atomic snapshot+receipt, race reconciliation) — two concurrent Case-B→NONE calls both resolve to the **same** snapshot identity because both pass the same `(businessDecisionKey, m3_5aIdempotencyKey, input)`; M3.5A returns one snapshot to both (create wins once, the other reconciles to it).

---

## 22. A2 Receipt Architecture

Concrete strong-FK receipt families (no polymorphic target), for **externally-triggered** A2 writes. Each carries: `operationScope` (internal constant), transport `idempotencyKey`, `requestHash`, a **concrete** target FK, `createdAt`, `UNIQUE(operationScope, idempotencyKey)`, append-only; reconciliation per §32-34.

| Receipt | operationScope | Target FK | Extra |
| :-- | :-- | :-- | :-- |
| PurchaseIntentCreateReceipt | INTENT_CREATE_V1 | intentId → PurchaseIntent | resultKind ∈ {CREATED, REPLAYED, CAPTURE_ALIAS} |
| PurchaseIntentContextCommandReceipt | INTENT_CONTEXT_APPEND_V1 | contextVersionId → PurchaseIntentContextVersion | resultKind ∈ {APPENDED, REPLAYED} |
| PurchaseIntentFinalizationReceipt | INTENT_FINALIZE_V1 | finalizationId → PurchaseIntentFinalization | resultKind ∈ {FINALIZED, REPLAYED} |
| PurchaseIntentInvalidationReceipt | INTENT_INVALIDATE_V1 | invalidationId → PurchaseIntentInvalidation | resultKind ∈ {INVALIDATED, REPLAYED} |

**Internal-only** operations `PurchaseIntentDecisionRequest` and `PurchaseIntentDecisionBinding` get **no** transport receipt (§38): they are internal/deterministic, and their crash recovery is provided by deterministic domain identity + UNIQUE constraints (`UNIQUE(intentId)` on request and binding; `UNIQUE(snapshotId)` on binding; `businessDecisionKey`/`m3_5aIdempotencyKey` UNIQUE on request). Receipt tables are not created for symmetry.

---

## 23. Request Hashes

For **every** A2 externally-triggered operation, `requestHash = canonical(complete normalized MATERIAL caller request + stable trusted calling context)`; **excludes** sampled/derived outputs (DB ids, trusted timestamps, sequences). Canonicalization reuses `src/persistence/canonical.ts` semantics; a normalized-canonicalization version tag is recorded so a future format change is never silently conflated.

Material identity per operation (each **includes** the stable trusted actor/session identity, assignment-bound, so one actor's idempotency key can never acknowledge another actor's request — A1 §10 discipline):

| Operation | Material request identity (hashed) |
| :-- | :-- |
| createPurchaseIntent | `intentCaptureKey` (+ its version), `assignmentId` (resolved own), `intentType`, `entrySource`, trusted actor/context |
| appendPurchaseIntentContext | `intentId` (own), stable context/command capture identity, the exact context fields (merchant, intendedTransactionAt, channel, amount, branch, basketRef), trusted actor/context |
| finalizePurchaseIntent | `intentId` (own), selected `contextVersionId`, trusted actor/context |
| invalidatePurchaseIntent | `intentId` (own), `replacementIntentId?`, `reasonCode?` (material — hashed), trusted actor/context |

Same idempotency key + any material difference → typed conflict; different key + same domain identity → domain reconciliation (alias/replay if material matches, else typed domain conflict). Under a race a caller requesting B never receives A as success (reuse the A1 `assertReceiptMatchesRequest` discipline, adapted per family).

---

## 24. NONE vs CONFLICT (normative)

**NONE** (safe to consider engine execution iff semantics still match, §14): no matching receipt for `(DECISION_PERSIST_V1, m3_5aIdempotencyKey)`, no snapshot for `businessDecisionKey`, and no conflicting partial identity.

**CONFLICT / INTEGRITY ERROR** (never collapse to NONE; always typed, fail closed):
- `businessDecisionKey` exists with a snapshot whose `inputHash` ≠ the request's `decideInputHash` → `PurchaseIntentHistoricalBusinessKeyConflictError`.
- receipt exists with `requestHash` ≠ `decideInputHash` → `PurchaseIntentHistoricalReceiptHashMismatchError`.
- receipt exists but its referenced snapshot is missing → `PurchaseIntentHistoricalReceiptDanglingError`.
- snapshot exists under `businessDecisionKey` but no receipt for the deterministic key → `PurchaseIntentHistoricalSnapshotWithoutReceiptError`.
- a binding points to a snapshot inconsistent with the `DecisionRequest` → `PurchaseIntentBindingSemanticMismatchError` (§17).
- integrity hash / column-coherence verification fails → M3.5A `SnapshotIntegrityError` / `SnapshotCoherenceError`.

Corrupted/partial state is **never** returned as `NONE`.

---

## 25. Database Invariant Matrix

| A2 invariant | Enforcement |
| :-- | :-- |
| PurchaseIntent.id decision identity | PK UUID (DB-assigned) |
| intentCaptureKey exact-capture dedup | UNIQUE(intentCaptureKey) + P2002 reconcile |
| PurchaseIntent immutable | trigger (BEFORE UPDATE/DELETE/TRUNCATE RAISE) |
| intentType/entrySource enum domain | CHECK (enum membership) |
| context version identity | UNIQUE(intentId, contextSeq) |
| context monotonic sequence; no overwrite | PurchaseIntent root lock + append-only trigger |
| context version belongs to its intent | FK(intentId) |
| append after finalization rejected | service (state check under root lock) + finalization presence |
| one finalization per intent | UNIQUE(intentId) on finalization |
| finalization pins one context version | UNIQUE(contextVersionId) + trigger/transaction: contextVersion.intentId == finalization.intentId (cross-table ⇒ trigger, not CHECK) |
| finalization after invalidation rejected | service (effective-status check under root lock) |
| businessDecisionKey from immutable id | pure derivation (§11); UNIQUE(businessDecisionKey) on request |
| one DecisionRequest per intent | UNIQUE(intentId) on request + root lock |
| frozen input immutable | append-only trigger; JSONB verbatim |
| m3_5aIdempotencyKey stable/unique | pure derivation (§15); UNIQUE on request |
| exact 1:1 binding | UNIQUE(intentId) + UNIQUE(snapshotId) + UNIQUE(decisionRequestId) on binding; coherence verified in-transaction |
| binding snapshot coherence | service verification (§17) under transaction (cross-table to M3.5A ⇒ service, not CHECK) |
| snapshot never cascade-deleted | FK snapshotId ON DELETE RESTRICT (A2 side only); M3.5A immutability trigger |
| invalidated at most once | UNIQUE(invalidatedIntentId) |
| no self-invalidation | single-table CHECK (replacementIntentId <> invalidatedIntentId) |
| replacement same assignment | trigger/transaction (cross-row ⇒ not CHECK) |
| no invalidation cycles | transaction + recursive lineage check under assignment lock (§44) |
| receipt idempotency + resultKind | UNIQUE(operationScope, idempotencyKey) + concrete FK + enum |
| capability / own-assignment binding | AST module-capability test + ESLint + trusted-context adapter (§40) |

No cross-table CHECK is claimed where PostgreSQL cannot legally subquery (those are triggers/transactions/service verification, stated explicitly above).

---

## 26. A2 SCI Invariants

A2-owned, implementation-testable clauses. **Mapping note:** these are stated with A2-local labels; the authoritative broader SCI register is **not** reopened here. Where a clause plainly continues an A1-owned register entry, that is flagged; final register-number assignment is deferred to the register authority rather than invented.

- **SCI-A2-01 — PurchaseIntent exact capture identity.** One `intentCaptureKey` ⇒ one root; transport-key rotation aliases, never duplicates; distinct captures ⇒ distinct roots even under identical merchant/amount/time. Enforce: UNIQUE(intentCaptureKey) + create-receipt.
- **SCI-A2-02 — Immutable context version history.** Context is append-only; sequences monotonic under the root lock; no overwrite; no post-finalization append.
- **SCI-A2-03 — One finalization selects one exact context.** UNIQUE(intentId) finalization pins a specific `contextVersionId`; never dynamic "latest".
- **SCI-A2-04 — businessDecisionKey from the immutable id.** `"pagamenos:study-intent-decision:v1:" + id`; structurally collision-free; no caller/merchant/amount/session/time key. (Closes R35R-04.)
- **SCI-A2-05 — Frozen DecisionRequest before M3.5A.** Exact validated `DecideInput` + `decideInputHash` committed before `decideAndPersist`; a retry reloads verbatim, never reconstructs.
- **SCI-A2-06 — Semantic engine/corpus pinning.** No historical snapshot + drifted economic semantics ⇒ fail closed; build-only change never blocks repair.
- **SCI-A2-07 — Crash recovery without recomputation.** Snapshot already exists ⇒ found + bound, engine never rerun.
- **SCI-A2-08 — Exact 1:1 binding.** UNIQUE(intentId)+UNIQUE(snapshotId); bind only after exact coherence; no public attach.
- **SCI-A2-09 — Invalidation history.** Append-only lineage; nothing deleted; replacement is an independent root/decision; no reuse of prior binding/snapshot.
- **SCI-A2-10 — Consent: new collection vs internal repair.** New participant collection respects A1 authorization at internally-sampled capture time; internal repair uses already-authorized durable facts and is never blocked/erased by later withdrawal. (Continues R35R-08 A2 obligation; A1 portion already closed.)
- **SCI-A2-11 — Complete A2 transport retry identity.** Every externally-triggered write has a complete material request hash incl. trusted actor/context; a consumed key never resolves a different request. (Continues the A1 retry-identity register entry / R35R-15 for A2 writes.)
- **SCI-A2-12 — M3.5A untouched.** No ALTER/mutation of `decision_snapshot`/`decision_idempotency_receipt`; engine/corpus byte-unchanged; only an additive read facade is exposed. (Continues A1 SCI-24 for A2.)

---

## 27. R35R Matrix

| Finding | A2 disposition | Where |
| :-- | :-- | :-- |
| R35R-04 businessDecisionKey collision | **CLOSED BY A2 DESIGN** | §11, §26(SCI-A2-04) |
| R35R-05 no durable intent→snapshot binding / crash repair | **CLOSED BY A2 DESIGN** | §16, §18, §20, §29, §31 |
| R35R-06 intent identity/finalization/correction/provenance conflated | **CLOSED BY A2 DESIGN** | §4, §6, §8, §9, §10 |
| R35R-10 A1 protocol/anchor portion | **A1 ALREADY CLOSED** (not reopened) | A1 §2/§4/§7 |
| R35R-11 A2 SCI normative definitions | **CLOSED FOR A2-OWNED PORTION** | §26 |
| R35R-15 concrete idempotency receipts | **CLOSED FOR A2 WRITES** | §22, §23, §32-37 |
| R35R-08 consent historical/temporal semantics | A1 portion closed; **A2 obligation only**: new collection respects A1, internal repair preserves history | §7, §26(SCI-A2-10) |
| R35R-19 eventCutoff/knowledgeCutoff | **DEFERRED NON-BLOCKING**: A2 preserves `capturedAt`/`recordedAt`/`initiatedAt`/`intendedTransactionAt`/`finalizedAt`/`boundAt`; full as-of analysis remains C2 | §8, §33 |

No B/C finding is claimed closed. No OPEN A2 BLOCKER.

---

## 28. Mandatory Adversarial Tests

The implementation MUST include tests for at least the following (expected outcome in parentheses):

**Intent root / capture:** same transport key + same capture (replay); same capture + different transport key (same root + alias receipt); concurrent same capture (one root); genuinely distinct capture not collapsed (two roots); same merchant/amount/time yet distinct captures (two roots); same transport key + different capture (conflict).

**Consent:** participant capture while authorized (success); capture after withdrawal via participant path (rejected); internal repair after withdrawal uses existing frozen facts, creates no new participant collection, deletes nothing (success, history intact).

**Context:** append sequence race (distinct monotonic seqs, no duplicate); different transport retry of the same exact context capture (no duplicate version); material context correction (new version appended, old retained); attempt to mutate a context version (DB trigger rejects); append after finalization (rejected).

**Finalization:** concurrent finalize (one finalization); retry with different transport key, same contextVersion (replay); different selected contextVersion after finalization (conflict); finalize an invalidated intent (rejected).

**Invalidation:** invalidate before finalization; after finalization; after DecisionRequest; after binding (all retain history); replacement same assignment (accepted); replacement different assignment (rejected); self-link (CHECK rejects); 2-cycle; longer cycle; concurrent cycle attack (all rejected, §44).

**Business key:** same intent stable key; different intents always different; replacement different.

**DecisionRequest:** created exactly once; frozen before engine; exact JSON/hash persists across restart; caller cannot choose DecideInput/version/key/snapshotId; different runtime economic-semantic version detected.

**Historical finder:** exact match (FOUND); true NONE; partial business-key conflict; wrong idempotency; wrong input hash; receipt-without-snapshot; snapshot-without-receipt; snapshot integrity failure (each a distinct typed CONFLICT, never NONE).

**Crash saga:** crash before request commit; after request commit; after M3.5A snapshot commit before binding; after binding before response (each retry converges, engine reruns only on the genuinely-new path).

**Version drift:** snapshot exists + runtime economic version changed → repair binding (no rerun); snapshot absent + runtime economic version changed → fail closed; build-only (gitSha) change with same economic versions → still allowed.

**Binding:** second snapshot for one intent (rejected); same snapshot for a second intent (rejected); wrong business key (rejected); wrong input hash (rejected); arbitrary caller cannot attach a snapshot.

**Capability:** raw historical finder not generally importable; ordinary participant caller cannot mint internal decision identity; caller cannot submit snapshotId/businessDecisionKey/engine context/DecideInput.

---

## 29. A2 Entity Table (implementation-authorized)

| Entity | PK | Domain identity | FKs | UNIQUE | CHECK | Immutable/behavior | Timestamps | Receipt | Capability owner |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| PurchaseIntent | id (UUID) | id | assignmentId→ExperimentAssignment | intentCaptureKey | intentType∈enum; entrySource∈enum | append-only (trigger) | initiatedAt, createdAt | PurchaseIntentCreateReceipt | PurchaseIntentCapture |
| PurchaseIntentContextVersion | id | (intentId, contextSeq) | intentId→PurchaseIntent | (intentId, contextSeq) | amountCentimos≥0 | append-only | capturedAt, recordedAt | PurchaseIntentContextCommandReceipt | PurchaseIntentCapture |
| PurchaseIntentFinalization | id | intentId | intentId→PurchaseIntent; contextVersionId→ContextVersion | intentId; contextVersionId | — | append-only; +trigger(contextVersion.intentId==intentId) | finalizedAt | PurchaseIntentFinalizationReceipt | PurchaseIntentFinalization |
| PurchaseIntentInvalidation | id | invalidatedIntentId | invalidatedIntentId→PurchaseIntent; replacementIntentId?→PurchaseIntent | invalidatedIntentId | replacementIntentId<>invalidatedIntentId | append-only; +trigger(same assignment; §44 cycle) | invalidatedAt | PurchaseIntentInvalidationReceipt | PurchaseIntentAdministration |
| PurchaseIntentDecisionRequest | id | intentId | intentId→PurchaseIntent; finalizationId→Finalization | intentId; finalizationId; businessDecisionKey; m3_5aIdempotencyKey | — | append-only | createdAt | — (internal, §38) | PurchaseIntentDecision |
| PurchaseIntentDecisionBinding | id | intentId | intentId→PurchaseIntent; decisionRequestId→Request; snapshotId→decision_snapshot(id) RESTRICT | intentId; snapshotId; decisionRequestId | — | append-only | boundAt | — (internal, §38) | PurchaseIntentDecision |
| (capture identity) intentCaptureKey | — | issued by trusted A1 session adapter; stored as a column on PurchaseIntent (no separate table required) | — | (on PurchaseIntent) | — | — | — | — | trusted A1 session adapter |

Excluded (B/C): PurchaseOccasion, ResearchContact, weekly reports, evidence/ValueVerification, C2 analysis models — **not** A2 entities.

---

## 30. A2 Service Table (sanctioned operations)

| Operation | Caller / trusted context | Public/Internal | Material input | Internally-derived | Lock | Transaction | Receipt | Domain identity | Errors |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| issueIntentCaptureKey | trusted A1 session adapter | internal | own assignment context | intentCaptureKey (+version) | — | — | — | intentCaptureKey | not-own-assignment |
| createPurchaseIntent | PurchaseIntentCapture (trusted ctx) | public (participant) | intentCaptureKey, intentType, entrySource | assignmentId (resolved own), initiatedAt | intentCaptureKey UNIQUE guard | insert | PurchaseIntentCreateReceipt | id / intentCaptureKey | consent-not-authorized; capture conflict; not-own-assignment |
| appendPurchaseIntentContext | PurchaseIntentCapture (trusted ctx) | public (participant) | intentId(own), context fields, command capture id | contextSeq, capturedAt, recordedAt | PurchaseIntent root FOR UPDATE | insert | PurchaseIntentContextCommandReceipt | (intentId, contextSeq) | consent-not-authorized; after-finalization; invalidated |
| finalizePurchaseIntent | PurchaseIntentFinalization (trusted ctx) | public (participant) | intentId(own), contextVersionId | finalizedAt | PurchaseIntent root FOR UPDATE | insert | PurchaseIntentFinalizationReceipt | intentId | consent-not-authorized; invalidated; different-context conflict; no-context |
| invalidatePurchaseIntent | PurchaseIntentAdministration (trusted ctx) | public | intentId(own), replacementIntentId?, reasonCode? | invalidatedAt | PurchaseIntent root FOR UPDATE (+ §44 lineage) | insert | PurchaseIntentInvalidationReceipt | invalidatedIntentId | already-invalidated; self-link; cross-assignment; cycle |
| decideForPurchaseIntent | PurchaseIntentDecision (trusted internal) | internal | intentId | businessDecisionKey, m3_5aIdempotencyKey, frozen DecideInput, expected versions | root lock only for Case C freeze | multi (§20) | — (internal identity) | intentId | not-finalized; semantic-drift; historical CONFLICT; binding-coherence |
| findExactHistoricalDecision | HistoricalDecisionLookup (A2 repair only) | internal (M3.5A facade) | businessDecisionKey, idempotencyKey, inputHash | — | — | read-only | — | exact triple | typed CONFLICT/integrity (§24) |

**No public** `attachSnapshot`, `bindSnapshot`, `createDecisionRequest(raw input)`, or `findSnapshot(raw query)`.

---

## 31. Crash-Saga Table

| Durable facts at entry | Validity checks | Historical lookup? | Engine exec permitted? | Engine version compare? | Write performed | Crash-safe next durable state | Retry result |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| No DecisionRequest; finalized+effective | finalized, effective, consent-at-collection | no (Case C first) | not yet | no | freeze+commit DecisionRequest | DecisionRequest durable | one DecisionRequest created |
| DecisionRequest; no snapshot | request loaded | yes (NONE) | yes iff semantics match | **yes** (fail closed on drift) | decideAndPersist → snapshot+receipt (M3.5A atomic) | snapshot+receipt durable | frozen request reused; snapshot created once |
| DecisionRequest; snapshot; no binding | request loaded; finder FOUND | yes (FOUND) | **no** | n/a (found) | create binding | binding durable | binding repaired; engine NOT rerun |
| DecisionRequest; snapshot; binding | binding+coherence | no | no | no | none | already complete | existing binding returned |
| Invalidated before DecisionRequest | effective check fails | n/a | no | no | none | invalidation durable | typed not-effective; no decision |
| Invalidated after DecisionRequest, no snapshot | request durable; root non-effective | yes | yes (internal completion permitted, §30-matrix) iff semantics match | yes | decideAndPersist → snapshot | snapshot durable; root non-effective for B/C | completes internally; excluded by B/C |
| Invalidated after snapshot/binding | all durable | no | no | no | none | all retained | history intact; root non-effective for B/C |
| Runtime economic version drift; snapshot exists | finder FOUND | yes | no | n/a | create binding | binding durable | repaired without rerun |
| Runtime economic version drift; snapshot absent | finder NONE | yes | **no** | mismatch | none | DecisionRequest durable | **fail closed** (PurchaseIntentSemanticDriftError) |
| Concurrent decide calls | both load request | yes | one rerun at most | yes | M3.5A dedups to one snapshot; one binding wins | one request/one snapshot/one binding | both return coherent result |

**Invalidation × decision authority (explicit, §30-matrix rationale):** once a `DecisionRequest` is durably frozen, its engine completion is *internal repair*, deterministic, and **permitted** for historical completeness — because participant collection already occurred and the request is already durable; blocking it would create an impossible half-state (a frozen request that can never resolve) and would contradict crash-repair determinism. Invalidation makes the **root** non-effective for future B/C (a derived property), never deletes the request/snapshot/binding, and — via the shared root lock (§21) — deterministically prevents creating a *new* DecisionRequest once invalidation has committed. This choice is consistent with append-only history, no selective deletion, future B/C exclusion, and crash-repair determinism.

---

## 32. Implementability Against Accepted Repository

Validated against accepted M3.5A `64cf864` and A1 `99f2d61` (documentation child `7c0a3d9` changes docs only).

**Additive Prisma models (A2):** `PurchaseIntent`, `PurchaseIntentContextVersion`, `PurchaseIntentFinalization`, `PurchaseIntentInvalidation`, `PurchaseIntentDecisionRequest`, `PurchaseIntentDecisionBinding`, and the four receipt families. All new tables; no ALTER of `decision_snapshot` / `decision_idempotency_receipt` / any A1 table. The binding's FK to `decision_snapshot(id)` (`ON DELETE RESTRICT`) is on the A2 table only; **no** back-relation column is added to the accepted `DecisionSnapshot` model (§19). Prisma requires the relation to be expressible from the A2 side referencing the immutable parent — this is additive and needs no change to the parent's stored shape or triggers.

**Migration triggers/checks (A2):** per-table append-only triggers (BEFORE UPDATE/DELETE/TRUNCATE RAISE) mirroring `20260831120000_m3_5a_decision_snapshot/migration.sql`; single-table CHECKs (enum domains, `replacementIntentId <> invalidatedIntentId`, `amountCentimos ≥ 0`); cross-table triggers (finalization.contextVersion.intentId equality; replacement same-assignment; invalidation cycle prevention); all UNIQUE indexes in §29. Guarded offline by the existing `pnpm db:migrate:check` gate.

**M3.5A read facade:** `findExactHistoricalDecision` added additively in `src/services/decide-and-persist.ts`, read-only, using existing repository read methods; not re-exported by the public barrel (§19).

**A2 services:** a sanctioned participant/administration service module (owning create/append/finalize/invalidate) and a sanctioned decision-repair service module (owning `decideForPurchaseIntent`, importing the deep decision-persistence module for `decideAndPersist` + `findExactHistoricalDecision`). Both added to `SANCTIONED_IMPLS` and the ESLint exemption set, consistent with the A1 sanctioned-service pattern.

**AST/capability additions:** extend `RAW_WRITE_MODULES` with the A2 raw repositories; extend `DEEP_SERVICE`/`SANCTIONED_IMPLS` with the new A2 service modules; extend the ESLint `FORBIDDEN_WRITE_INTERNALS`/`FORBIDDEN_DEEP_SERVICE` groups symmetrically; keep participant-facing code barred from raw snapshot repository, binding creation, snapshot selection, engine context, and arbitrary `participantId` authority.

**Expected test files:** A2 unit + integration suites covering §28; extension of `src/lib/module-capability.test.ts` probes for the new A2 raw/deep specifiers and the historical-finder capability.

**No accepted A1/M3.5A semantic table requires mutation.** No `A2 DESIGN BLOCKER`.

---

## 33. Deferred Register

- **Production `AnalysisProtocol v1` freeze:** remains **UNFROZEN** (A1 §3/§20). A2 does not freeze it.
- **Wave 0:** **NOT AUTHORIZED.**
- **Deployment / production Protocol v1:** A2 authorizes neither.
- **B/C semantics** (occasion identity, reconciliation, entry-source adjudication, contamination, value/VS/RIVSR, denominator bounds, thresholdStatus, as-of/eventCutoff/knowledgeCutoff analysis): deferred; A2 only **persists** the provenance/timestamps these will consume (R35R-19).
- **SCI register numbers:** A2 clauses use A2-local labels; authoritative global renumbering deferred to the register authority (§26).

---

## 34. Exact Next Action

**STOP.** Submit this A2 spec for the **independent Codex Sol A2 design gate**, alongside accepted A1 V2.1 and the accepted repository baseline. Do **NOT**: create Prisma models; create migrations; expose the M3.5A finder; implement services; or open an implementation branch. No implementation, migrations, Git, commits, or Wave 0 before the gate. `Production Protocol v1 = UNFROZEN`; `Wave 0 = NOT AUTHORIZED`.

---

# Final Verdict

## M3.5B-A2 EFFECTIVE DESIGN READY FOR INDEPENDENT GATE

All gate conditions are met:
- exact `PurchaseIntent` identity is defined (immutable UUID root; §4);
- transport retry vs genuinely-separate intent is unambiguous (`intentCaptureKey` capture identity vs transport receipts; §5);
- finalization freezes an exact `ContextVersion` (`UNIQUE(intentId)` + pinned `contextVersionId`; §9);
- invalidation/replacement is historically safe (append-only lineage, new-root replacement, cycle-safe; §10/§44);
- `businessDecisionKey` collision is structurally impossible (`namespace + immutable id`; §11);
- `DecisionRequest` freezes the exact validated `DecideInput` before M3.5A (`decideInputHash == inputHash == requestHash`; §12/§13);
- engine/corpus semantic drift fails closed when no historical snapshot exists (§14/§20/§31);
- exact historical lookup is narrowly specified, read-only, with NONE-vs-CONFLICT normativity (§18/§24);
- crash-after-snapshot/before-binding is repairable without recomputation (§20 Case B FOUND; §31);
- exact 1:1 binding is guaranteed (`UNIQUE(intentId)`+`UNIQUE(snapshotId)` + exact coherence; §16/§17);
- the A1 consent boundary is preserved (new-collection authorization vs internal-repair; §7);
- concrete A2 idempotency is specified (four strong-FK receipt families + request hashes; §22/§23);
- A2 remains separate from B/C opportunity semantics (§2/§45-in-§1/§33);
- no implementation blocker remains (§19/§32).

No A2 implementation is self-authorized. Implementation GO remains the independent reviewer's to grant. **DESIGN ONLY.**

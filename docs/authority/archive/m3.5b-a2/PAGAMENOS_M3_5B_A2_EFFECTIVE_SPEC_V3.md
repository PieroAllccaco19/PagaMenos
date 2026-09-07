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
> `sha256:b1f8deb09e02d0ca43fdfa78e49db201fd9497e6a7029b7a719ffd8f1c65b28c`
>
> Verify with: `tail -n +23 <this file> | sha256sum`
>
> **Root authority register:** `PAGAMENOS_SPEC_AUTHORITY.md` · **Repair record:** `PAGAMENOS_R_B_17_AUTHORITY_REPAIR_REPORT.md`

<!-- R-B-17 ARCHIVAL HEADER - END -->

# PAGAMENOS — M3.5B-A2 EFFECTIVE PRE-IMPLEMENTATION SPECIFICATION — V3

**Milestone:** M3.5B-A2 — PurchaseIntent lifecycle · deterministic decision-request freezing · exact snapshot binding · crash-repair saga.
**Status:** DESIGN / SPECIFICATION ONLY. A2 not implemented. No code / Prisma / migrations / Git / commits / implementation / B/C / Wave 0.
**Nature:** self-contained. **This V3 fully supersedes V1 and V2 for review** — a reviewer needs only (1) this document, (2) the accepted A1 spec `PAGAMENOS_M3_5B_A1_EFFECTIVE_SPEC_V2_1.md`, and (3) the accepted repository baselines. V1/V2 are historical/superseded; do not reconcile them.

**V3 change log (final pre-gate hardening — bounded):** resolves A2-PRE-08 (current input-schema version gates recomputation, §14/§2); A2-PRE-09 (historical request verification does not require current corpus/engine support, §19); A2-PRE-10 (PurchaseIntent structurally bound to its capture token via a DB FK, §5/§20); A2-PRE-11 (consent gate distinguishes new-fact creation from idempotent historical replay/alias, §7); A2-PRE-12 (persisted actor/provenance fields made exact — resolved by removal, §4/§6); A2-PRE-13 (issueIntentCaptureKey idempotency = token domain identity, no phantom request-hash receipt, §5/§24). It also fixes the three-way separation of *request self-integrity* / *current-execution compatibility* / *historical-snapshot coherence* (§14/§17/§19), specifies the client-correlation-nonce and contextCaptureKey contracts (§13), and states the historical-parser/snapshot-loadability retention obligation (§16). No A2 scope is broadened.

**Accepted baselines (verified present at `C:/Users/piero/pagamenos-a1`, HEAD `7c0a3d9`):**
- M3.5A accepted implementation (decision persistence authority): `64cf864a817c137920204487ab3317bc6d4c9ba5`.
- M3.5B-A1 accepted implementation: `99f2d61bc45839d6f9506abee5fae641bfcd8b2e` (ACCEPTED, A1 CLOSED). Doc-only child `7c0a3d9e0add34e4823c01f22c21542817dbc881` (worktree HEAD; chain `7c0a3d9 → 99f2d61 → a0ef79a`) changes documentation only.
- Accepted A1 design authority: `PAGAMENOS_M3_5B_A1_EFFECTIVE_SPEC_V2_1.md`.
- Failed prototype (evidence only, NOT authority): `1ded28d…` (C — NO-GO).

**Conventions.** Instants zone-qualified (`America/Lima`); "trusted time" is sampled by the service under a stable row lock, never caller-supplied. Money is provenance, never identity. Every A2 scientific table is append-only at the DB level (BEFORE UPDATE/DELETE/TRUNCATE triggers that `RAISE`), matching the accepted M3.5A/A1 `*_forbid_mutation` guard. "M3.5A §n" = accepted persistence markers; "A1 §n" = the V2.1 spec. Names verified in the accepted worktree are marked *(verified)*; reliance only on the accepted semantic contract is marked *(contract)*.

---

## 1. Executive A2 Design Summary

A2 answers exactly one question: **how does one trustworthy participant purchase intent become exactly one immutable decision request and exactly one matching immutable `DecisionSnapshot`, despite retries, concurrent calls, crashes, redeploys, engine/corpus version changes, intent correction/invalidation, and lost responses?**

Design chain, all additive over accepted M3.5A + A1:
1. **Immutable `PurchaseIntent` root** whose DB-assigned UUID `id` is the sole basis of decision identity; it is **structurally FK-bound to its capture token** (§5), so no direct/privileged INSERT can reference an unissued token or bind one participant's token to another's assignment.
2. **Exact capture identity** via a durable `PurchaseIntentCaptureToken` — server-minted `intentCaptureKey`, **idempotent on a client-held correlation nonce**, immutably bound to the trusted assignment (§5/§13). Survives response loss and restart; converges retries to one root; cannot be rebound across participants; never collapses distinct captures.
3. **Append-only `PurchaseIntentContextVersion`** with exact `contextCaptureKey` command identity (`UNIQUE(intentId, contextCaptureKey)`, §8); **`PurchaseIntentFinalization`** pins exactly one context version.
4. **`businessDecisionKey = "pagamenos:study-intent-decision:v1:" + PurchaseIntent.id`** — structurally collision-free (R35R-04).
5. **`PurchaseIntentDecisionRequest`** freezes the exact validated `DecideInput` (normalized JSONB + `decideInputHash`) and pins the expected **input-schema**, **engine-contract**, and **corpus** versions. **Fresh M3.5A execution is gated on all three current authorities equalling the pins** (§2/§14) so a schema/economic/corpus drift can never persist an unusable snapshot; a build-only (`gitSha`) change never blocks.
6. **Three separated version concerns** (§14/§17/§19): *request self-integrity* (frozen labels well-formed + retained input parser), *current-execution compatibility* (current == pins before a fresh engine run), *historical-snapshot coherence* (a bound snapshot's stamped versions == pins, whether found or freshly computed). Historical verification never requires current corpus/engine runtime to "support" old labels.
7. **`findExactHistoricalDecision`** — one narrow, additive, read-only M3.5A facade owning the full exact-match predicate (identity + semantic pins + integrity + loadability), returning `NONE | FOUND | CONFLICT`, never collapsing corrupted/partial/unloadable state to `NONE` (§18/§26).
8. **`PurchaseIntentDecisionBinding`** — exact 1:1 intent↔snapshot, immutable, created only after the unified coherence predicate, surviving invalidation (§16/§17).
9. **Consent gate distinguishes new-fact creation from idempotent replay/alias** (§7): a response-loss retry / alias of an already-durable fact is never re-authorized against *current* consent, so withdrawal cannot break the idempotency guarantee; a genuinely-new fact after withdrawal is rejected.
10. **State-sensitive crash-repair saga** (§21): the engine reruns only on the genuinely-new path under matching semantics; invalidation is handled without any contradictory gate.

A2 is a **system-integrity** contract. `PurchaseIntent ≠ PurchaseOccasion ≠ denominator opportunity` (§38).

---

## 2. Scope / Non-Scope

**A2 authorizes exactly:** `PurchaseIntentCaptureToken`; `PurchaseIntent`; `PurchaseIntentContextVersion`; `PurchaseIntentFinalization`; `PurchaseIntentInvalidation`; deterministic `businessDecisionKey`; `PurchaseIntentDecisionRequest`; `PurchaseIntentDecisionBinding`; the narrow additive read-only `findExactHistoricalDecision` M3.5A facade; the narrow additive read-only A1 consent-facts facade (§7); the current-runtime compatibility gate (§2/§14); A2 write receipts; the A2 capability boundary; A2-owned SCI invariants + adversarial tests; the additive Prisma models, migrations, AST/ESLint capability extensions, and services realizing the above.

**Explicitly OUT of scope (remain B/C):** `PurchaseOccasion`; occasion correction lineages; `ResearchContact`; `AuthMessage`; weekly reports; opportunity reconciliation; entry-source *adjudication*; aggregate/app overlap; `TransactionCorroboration`; `BaselineCorroboration`; `ValueVerification`; redeemed-benefit attribution; VS3/VS4; RIVSR; denominator bounds; `thresholdStatus`; C2 analysis. A2 persists provenance (`entrySource`, `intentType`, `intendedTransactionAt`, timestamps) B/C consume, but resolves no B/C semantics. A2 authorizes neither production Protocol v1 freeze, nor deploy, nor Wave 0 (§35).

### 2.1 Fresh-execution current-runtime gate (normative helper)
Freeze one contract:
```
assertCurrentRuntimeMatchesDecisionRequest(request):     // called BEFORE decideAndPersist on the fresh path
  require current ENGINE_INPUT_SCHEMA_VERSION === request.expectedEngineInputSchemaVersion
  require current ENGINE_CONTRACT_VERSION    === request.expectedEngineContractVersion
  require current loadCorpus().corpusId       === request.expectedCorpusVersion
  else throw PurchaseIntentSemanticDriftError   // fail closed; NO decideAndPersist call, NO snapshot written
```
Verified against accepted M3.5A, these are the **complete** set of current authorities that (a) govern parsing of the input, (b) govern economic decision semantics, or (c) govern trusted corpus semantics, **and** are stamped by M3.5A into the resulting snapshot in a way A2 later requires to match (§14.1). `gitSha`/`buildId` are excluded — accepted authority treats them as build/deployment identity, not economic semantics (`src/persistence/build-meta.ts`, `versions.ts`). `snapshotSchemaVersion`/`engineOutputSchemaVersion` are M3.5A's structural self-description (they affect snapshot *loadability*, §16, but A2 neither pins nor independently gates them — see §14.1).

---

## 3. Accepted Baseline Dependencies (VERIFIED)

### 3.1 M3.5A decision persistence *(verified, unchanged from `64cf864`)*
- `DecisionSnapshot` (`decision_snapshot`), immutable: `id`; `businessDecisionKey` **UNIQUE**; stamps `snapshotSchemaVersion`/`engineInputSchemaVersion`/`engineOutputSchemaVersion`/`engineContractVersion`; `corpusVersion`; `merchantId`/`selectedScopeId`/`decisionStatus`; `evaluatedAt`/`intendedTransactionAt`; `engineInputJson`/`engineOutputJson` (JSONB); `inputHash`/`outputHash`; `gitSha`/`buildId`; `createdAt`; back-relation `receipts`.
- `DecisionIdempotencyReceipt` (`decision_idempotency_receipt`), append-only: `operationScope`; `idempotencyKey`; `requestHash`; `decisionSnapshotId`; **UNIQUE(operationScope, idempotencyKey)**.
- Public surface *(verified, `src/services/index.ts`)*: `decideAndPersist({ input, businessDecisionKey, idempotencyKey })`, `loadDecisionSnapshot(id)`, `replayDecisionSnapshot(id)`, `DecisionSnapshotDto`, typed errors. `decideAndPersist` binds TRUSTED deps (no injection publicly), resolves an exact-retry receipt before any engine work, aliases a business key without recompute, and runs the engine only on the genuinely-new path.
- FROZEN equivalence *(verified, `snapshot.ts`/`hash.ts`/`canonical.ts`)*: `requestHash === DecisionSnapshot.inputHash === SHA-256(canonical(validated DecideInput))`; `businessDecisionKey` compared separately.
- Repository read methods *(verified)*: `findReceipt`, `findSnapshotById`, `findSnapshotByBusinessKey`; internal (capability-locked to `services/decide-and-persist.ts`).
- Semantic authorities *(verified, `versions.ts`/`provenance.ts`)*: `ENGINE_CONTRACT_VERSION='pagamenos.engine.m3.v1'`; `ENGINE_INPUT_SCHEMA_VERSION='pagamenos.engine-input.v1'`; `ENGINE_OUTPUT_SCHEMA_VERSION`; `SNAPSHOT_SCHEMA_VERSION`; `corpusVersion=loadCorpus().corpusId`. Canonicalization *(verified, `canonical.ts`)* is **frozen and non-versioned** (no version constant; tied to the schema versions). Frozen input schema `engineInputV1Schema` *(verified, `schema.ts`)*.
- **Verified loadability rule (governs A2 §16/§18):** `parseDecisionSnapshot` *(verified, `schema.ts`)* dispatches on `snapshotSchemaVersion`, then validates via `decisionSnapshotDtoSchema`, which pins **all four** version fields with `z.literal(<current constant>)`. Therefore, under accepted M3.5A, a stored snapshot is **loadable only while the current build's version constants (and version-dispatch branches) recognize its stamped versions**; a stamp that no longer matches the current literals (with no retained historical parser branch) makes that snapshot fail to load (typed `UnsupportedSnapshotVersionError` / validation error) — it is never silently reparsed as current.

### 3.2 A1 facts A2 consumes *(verified)*
- Prisma **6.2.0** *(verified, `package.json`)* — a relation field on one model requires an opposite relation field on the other. Models *(verified, `schema.prisma`)*: `RecruitmentSubjectIdentity`, `RecruitmentCredentialLink`, `StudyParticipant`, `Experiment`, `ExperimentAssignment` (`UNIQUE(experimentId, participantId)`), `StudyConsentEvent` (`UNIQUE(assignmentId, consentSeq)`), A1 receipts.
- `TrustedParticipantContext = { readonly participantId }` *(verified, `study/participant-context.ts`)*; validity = module-private `WeakSet` membership (unforgeable). Creation primitive `createTrustedParticipantContext` reachable only from the trusted session adapter + tests; public checker `isTrustedParticipantContext`.
- Trusted session adapter `resolveTrustedParticipantContext({ authenticatedParticipantId })` *(verified, `services/study-participant-session.ts`)* — behind `@/services/study-admin`, off-limits to participant-facing/app code.
- Own-assignment binding *(verified)*: `ConsentStore.findAssignmentParticipantId(assignmentId)` → owner; honored only if `owner === context.participantId` (`StudyAssignmentOwnershipError`).
- Pure consent contracts exported by `@/services` *(verified)*: `wasCollectionAuthorizedAtKnownTime({ events, collectionAt, asOfKnowledgeAt? })`, `deriveConsentAuthorizationIntervals`, `effectiveConsentState`, type `ConsentEventFact`, `AuthorizationInterval`. **Pure over `ConsentEventFact[]`; read nothing from the DB.**
- **Verified gap:** events are loaded only by internal `ConsentStore.listEvents(assignmentId)` *(verified)*, capability-locked to `services/study-consent.ts`. No public loader ⇒ A2 requires a narrow additive A1 read facade (§7).
- Request-hash discipline `canonicalHash({ op, …material…, context })` *(verified, `study/request-hash.ts`)*.
- Capability enforcement *(verified, `eslint.config.mjs` + `src/lib/module-capability.test.ts`)*: ESLint groups + the AST test's `RAW_WRITE_MODULES`/`DEEP_SERVICE` sets **plus a per-repository owner-allowlist map** (e.g. `'db/study-consent-repository' → ['services/study-consent.ts']`) + the fail-closed non-literal-`import()` rule. A2 extends these (§27/§36).

---

## 4. PurchaseIntent — Immutable Root (actor/provenance fields made exact — A2-PRE-12)

```
PurchaseIntent {
  id             PK UUID  DB-assigned                 -- SOLE basis of decision identity
  captureTokenId UNIQUE FK → PurchaseIntentCaptureToken(id) ON DELETE RESTRICT   -- structural capture binding (§5/§20)
  intentType     BUYING_NOW | BUYING_TODAY | CONSIDERING_LATER | EXPLORATORY   -- immutable initiation (Phase 0A §29)
  entrySource    DIRECT | CONTENT | SHARED_LINK | RESEARCH_LINK | AUTH_LINK | SAVED_DECISION | OTHER   -- provenance only; NOT adjudicated
  initiatedAt    TIMESTAMPTZ trusted                  -- immutable initiation instant
  createdAt      TIMESTAMPTZ trusted
}   -- append-only (trigger)
```

**A2-PRE-12 (exact fields).** The V2 pseudo-columns `capturedByContext` / `finalizedByContext` / `invalidatedByContext` / `captureOrigin?` are **NOT persisted** and are removed from every A2 model:
- Trusted actor identity is `participantId`, which is durably inferable through `PurchaseIntent → captureToken → ExperimentAssignment → participant` and is bound into each operation's `requestHash` (§25). No separate actor column is stored (avoids redundant/possibly-identifying storage). Trusted actor identity participates in authorization and request-hash identity; it is not a stored pseudo-column.
- `captureOrigin` is **removed**: `entrySource` (Phase 0A §29) already carries capture-origin provenance, and A2 needs nothing more. Removing it avoids the trap of persisting a request-affecting field that is excluded from idempotency identity (§11).

Notes:
- `id` is DB-assigned; `businessDecisionKey` (§11) is a pure function of it ⇒ no two intents collide on one key; one intent's key is stable forever.
- **No `assignmentId` column on `PurchaseIntent`.** The assignment is reached solely through `captureToken.assignmentId` — this structurally eliminates any assignment-mismatch vector (there is no second assignment field to disagree with the token, §5/§20/A2-PRE-10). `intentCaptureKey` is likewise the token's, not duplicated here.
- `intentType`/`entrySource` are immutable initiation provenance; A2 performs no entry-source adjudication and derives no PRECONTACT/independence from any caller boolean (that is B).
- Append-only at the DB level. Corrigible context is a new context version pre-finalization; a materially different intent is a new root via invalidation/replacement (§10).

---

## 5. Exact Capture Identity / Retry Semantics — ONE model, structurally bound (A2-PRE-01/10/13)

**Model:** *server-issued, durably-persisted capture token, idempotent on a client-held correlation nonce, immutably bound to the trusted assignment; the PurchaseIntent is a DB-FK child of the token.*

```
PurchaseIntentCaptureToken {
  id                     PK UUID
  assignmentId           FK → ExperimentAssignment (A1) ON DELETE RESTRICT   -- TRUSTED binding, from the trusted context; immutable
  clientCorrelationNonce                                  -- UNTRUSTED correlation material (client-held; §13)
  intentCaptureKey       UNIQUE                           -- SERVER-minted opaque stable identity (gen_random_uuid); never client-chosen
  issuedAt               TIMESTAMPTZ trusted
  UNIQUE(assignmentId, clientCorrelationNonce)            -- COMPLETE durable idempotency/domain identity of issuance (A2-PRE-13)
}   -- append-only
```
`PurchaseIntent.captureTokenId` **UNIQUE FK → PurchaseIntentCaptureToken(id)** (§4/§20) gives: (i) an intent can never reference an unissued token (FK); (ii) an intent's assignment is exactly the token's (there is no separate assignment field to rebind — A2-PRE-10); (iii) one token → **at most one** intent (`UNIQUE(captureTokenId)`); (iv) both rows immutable.

**Trusted vs untrusted split:** `clientCorrelationNonce` is untrusted correlation material — it only makes issuance idempotent and grants no authority. `assignmentId` is the trusted binding (from the authenticated `participantId` at issuance). `intentCaptureKey` is server-minted (never client-chosen), so a client cannot forge a key mapping to another assignment.

Two operations (both behind a `TrustedParticipantContext`, §3.2):
- **`issueIntentCaptureKey({ trustedParticipantContext, assignmentId, clientCorrelationNonce }) → { intentCaptureKey }`** — verify `assignmentId` is the actor's own; insert the token; on `UNIQUE(assignmentId, clientCorrelationNonce)` P2002, return the existing token's `intentCaptureKey`. **Idempotency/domain identity = `UNIQUE(assignmentId, clientCorrelationNonce)` — there is no separate issuance receipt or request-hash (A2-PRE-13, Option A).** Issuance carries no material beyond `(assignment, nonce)`, so there is no "same nonce / different material" case at issuance.
- **`createPurchaseIntent({ trustedParticipantContext, intentCaptureKey, intentType, entrySource, idempotencyKey })`** — resolve the token by `intentCaptureKey` (must exist); verify `token.assignmentId` is the actor's own; apply the new-fact-vs-replay consent discipline (§7); insert `PurchaseIntent(captureTokenId = token.id, …)`; on `UNIQUE(captureTokenId)` P2002 reconcile.

**Issuance is NOT participant scientific collection (A2-PRE-09/§9).** A `PurchaseIntentCaptureToken` is transport/capture-identity infrastructure only; it is not yet a `PurchaseIntent` scientific fact, grants no authorization to create an intent, and cannot bypass withdrawal — `createPurchaseIntent` re-checks A1 authorization at the moment a NEW intent is actually created (§7). Therefore a token issued before withdrawal cannot be used to create a new intent after withdrawal.

### 5.1 Response-loss / restart survival
1. Client generates `clientCorrelationNonce` locally and persists it in its own durable draft state **before any call** (survives every server response loss; it never depended on a server response).
2. Client → `issueIntentCaptureKey(nonce)`. Response lost ⇒ retry with the **same** nonce ⇒ idempotent via `UNIQUE(assignmentId, clientCorrelationNonce)` ⇒ the **same** `intentCaptureKey` (durable rows survive restart). Client now holds `intentCaptureKey`.
3. Client → `createPurchaseIntent(intentCaptureKey)`. This response lost ⇒ retry — possibly with a **different transport idempotency key** — presenting the **same** `intentCaptureKey` ⇒ `UNIQUE(captureTokenId)` + P2002 ⇒ exactly **one** `PurchaseIntent`.
4. **Honest boundary:** if the client lost even the nonce, it starts fresh ⇒ new nonce ⇒ new key ⇒ new intent. A2 does not collapse this — it is observationally indistinguishable from a genuinely new capture, and collapsing would be the unsafe behavior this section forbids. Convergence bottoms out at the client-held nonce, the minimum stable carrier.

### 5.2 Convergence matrix

| transport key | `intentCaptureKey` (→ token) | create material (`intentType`,`entrySource`) | Result |
| :-- | :-- | :-- | :-- |
| same | same | same | replay historical intent (create-receipt replay) |
| same | different | — | `PurchaseIntentCaptureConflictError` |
| different | same | same | same PurchaseIntent + **CAPTURE_ALIAS** create-receipt |
| different | same | **different** | `PurchaseIntentCaptureConflictError` (one capture cannot yield two materially different intents) |
| different | different | — | two distinct roots |
| concurrent | same | same | exactly one root (`UNIQUE(captureTokenId)` + P2002) |

**Non-collapse invariant:** two genuinely distinct captures (two `clientCorrelationNonce`s ⇒ two tokens ⇒ two `intentCaptureKey`s) yield two roots even under identical merchant/amount/time/session — no merchant/time heuristics are ever used.

**Ownership before an intent exists / cross-participant attack:** the token row exists **before** any intent, so the own-assignment check runs against `token.assignmentId`. Participant A obtains/observes `CA`; B calls `createPurchaseIntent(CA)` ⇒ the token's `assignmentId` is A's ⇒ B's own-assignment check fails ⇒ `StudyAssignmentOwnershipError`. Neither B nor A can rebind `CA` to another assignment: the token is append-only and `PurchaseIntent` has **no** independent assignment field (its assignment IS the token's, §4). **Even a direct/privileged DB INSERT cannot forge a mismatch** — the FK forbids referencing an unissued token, and there is no separate assignment column to set to B (A2-PRE-10). Opacity is not relied on; the structural binding is the authority.

---

## 6. Trusted Capture Provenance

R35R-06 keeps initiation / finalization / correction / retry / trusted-entry provenance separate:

| Concern | Where | Mutability |
| :-- | :-- | :-- |
| capture-identity issuance | `PurchaseIntentCaptureToken` | append-only |
| initiation | `PurchaseIntent` root (`captureTokenId`→assignment, `intentType`, `entrySource`, `initiatedAt`) | immutable |
| correction (pre-finalize context) | new `PurchaseIntentContextVersion` | append-only |
| finalization | `PurchaseIntentFinalization` | immutable |
| retry (transport) | the four receipt families (§24) | append-only |
| trusted entry provenance | root `entrySource`; context fields | immutable per version |

Trusted actor identity (`participantId`) is durably inferable via `intent → token → assignment → participant` and bound into each `requestHash`; it is **not** stored as a separate actor column (§4/A2-PRE-12). A2 persists (Phase 0A §29): trusted assignment (via token); stable `intentCaptureKey` (token); `entrySource`; trusted `initiatedAt`; participant-entered `intendedTransactionAt`, merchant/amount/channel/location (context version); `intentType` (root). A2 creates no `ResearchContact`, classifies no PRECONTACT from a caller boolean, does no B entry-source adjudication.

---

## 7. A1 Consent Boundary — new-fact vs idempotent replay/alias (A2-PRE-11)

The gate distinguishes creating a **new scientific fact** from an **idempotent historical replay/alias** of a fact that already exists. Only the former is "new participant collection".

- **Existing durable historical result** — an exact same-key transport replay, or an exact domain alias (a different transport key resolving to an already-existing fact via the same capture/context/finalization/invalidation domain identity). A2 verifies input/ownership/coherence and returns (or creates the alias receipt); it performs **no** new scientific collection and does **NOT** require *current* consent to re-authorize the already-recorded fact. A later withdrawal therefore never turns a response-loss retry / alias into a failure.
- **New scientific fact** — no exact durable domain result exists and this invocation would create a `PurchaseIntent` / `PurchaseIntentContextVersion` / `PurchaseIntentFinalization` / `PurchaseIntentInvalidation`. A2 samples trusted collection time under the parent lock and calls the A1 pure contract `wasCollectionAuthorizedAtKnownTime({ events, collectionAt })` over the actor's already-recorded consent events (loaded via the facade below); if unauthorized → reject; else append.

**Internal crash repair** (`decideForPurchaseIntent`) is never new collection (it consumes already-authorized durable facts); a later withdrawal never deletes history, blocks internal completion, or retroactively invalidates a collection authorized when it occurred. "Current consent" is never a predicate that rewrites historical authority.

### 7.1 Normative per-operation ordering (§7 discipline, propagated to §30)
```
1  schema/material validation
2  trusted actor + own-resource verification (own-assignment / own-intent via the trusted context)
3  exact same-transport-key receipt lookup  → if present & material matches: REPLAY (no new collection, no consent re-check)
4  exact domain-identity reconciliation / existing-fact lookup → if present & material matches: ALIAS (no new collection, no consent re-check); if material differs: typed conflict
5  otherwise (a NEW fact would be created):
     lock the parent/domain row (§22)
     re-check no historical result appeared concurrently
     sample trusted collection time
     read A1 consent facts (readConsentAuthorizationFacts, §7.2)
     wasCollectionAuthorizedAtKnownTime(...) ; if unauthorized → reject
     append the scientific fact + its receipt atomically
```
Replay/alias (steps 3–4) never bypass material-request-mismatch, ownership, or historical-integrity checks; they only bypass *new-collection consent re-authorization*, because no new fact is created.

### 7.2 Additive A1 read facade (required; verified gap §3.2)
```
readConsentAuthorizationFacts({ assignmentId }): Promise<ConsentEventFact[]>   // READ ONLY
```
Added to the sanctioned A1 consent service `src/services/study-consent.ts` (which already owns `study-consent-repository` and its `listEvents`), reusing `listEvents`. No raw consent repository exposed; no A1 semantic change; append-only consent tables untouched. Exposed narrowly to the A2 services via the capability owner map (§27), not to participant-facing/app code. Own-assignment enforcement is the caller's responsibility (A2 participant paths bind own-assignment first via the trusted context; the A2 repair path calls it as trusted-internal).

---

## 8. Context Versioning — exact context-command identity (A2-PRE-02) + contract (§14 task)

```
PurchaseIntentContextVersion {
  id                 PK UUID
  intentId           FK → PurchaseIntent
  contextSeq         INT                     -- monotonic per intent, allocated under the PurchaseIntent root lock
  contextCaptureKey                          -- client-held opaque correlation token for ONE context capture (§13)
  merchantId
  intendedTransactionAt   TIMESTAMPTZ?
  channel? / branch? / locationRef? / basketRef?
  amountCentimos?         -- non-negative integer; provenance, never identity
  capturedAt         TIMESTAMPTZ trusted      -- scientific capture time, sampled under the root lock (NOT resampled on alias, §21)
  recordedAt         TIMESTAMPTZ              -- knowledge time
  UNIQUE(intentId, contextSeq)
  UNIQUE(intentId, contextCaptureKey)         -- exact context-command identity (A2-PRE-02)
}   -- append-only
```
`contextCaptureKey` is the exact domain identity of one context capture. It needs no issuance table (the parent intent already exists and owns the namespace). Trust = own-intent binding; scope = `intentId`. `contextSeq` is allocated under `SELECT … FOR UPDATE` on the parent `PurchaseIntent` (the sole order authority). Material correction pre-finalization = a new capture (new `contextCaptureKey`) → new version; the earlier version remains. **After finalization, appends are rejected** (`PurchaseIntentContextAfterFinalizationError`); a genuine post-finalization change is a replacement root (§10).

### 8.1 Context retry matrix (A2 capture correctness, NOT B reconciliation)

| transport key | `contextCaptureKey` | payload vs existing | Result |
| :-- | :-- | :-- | :-- |
| same | same | same | context-command receipt replay |
| same | same | **different** | `StudyIdempotencyConflictError` (same key ≠ two captures) |
| different | same | same | ONE version + **CONTEXT_ALIAS** receipt |
| different | same | **different** | `PurchaseIntentContextConflictError` (domain conflict — NOT a silent alias) |
| different | different (genuinely separate captures) | any | distinct versions (even identical merchant/amount/time) |
| concurrent | same | same | exactly one version (`UNIQUE(intentId, contextCaptureKey)` + P2002) |

Reconciliation on P2002 compares the incoming material payload to the existing version's: equal → alias; different → `PurchaseIntentContextConflictError`. **Field equality never defines identity — `contextCaptureKey` does.**

**Cross-intent reuse attack:** the same `contextCaptureKey` string under another `intentId` is a distinct `(intentId, contextCaptureKey)` pair, and the append is only permitted on the actor's own intent — neither duplicates nor leaks.

---

## 9. Finalization

```
PurchaseIntentFinalization {
  id                 PK UUID
  intentId           UNIQUE FK → PurchaseIntent          -- one finalization per intent
  contextVersionId   FK → PurchaseIntentContextVersion   -- the EXACT pinned context (must belong to intentId)
  finalizedAt        TIMESTAMPTZ trusted
}   -- append-only
```
`contextVersionId` is **not** globally UNIQUE (redundant: the version belongs to one intent by FK, and each intent finalizes once by `UNIQUE(intentId)`; no legitimate history needs it constrained). Load-bearing = `UNIQUE(intentId)` + trigger `contextVersion.intentId == finalization.intentId` (cross-table ⇒ trigger, §28). Core: **one intent → one finalization → one exact pinned context version.**

Contract: preconditions (intent effective/not-invalidated; ≥1 context version; the selected `contextVersionId` belongs to `intentId`); a NEW finalization is new collection (A1 authorization at `finalizedAt`, §7) while a **replay of the same finalization** (§7 steps 3–4) is not; `UNIQUE(intentId)` + root lock; a retry naming the **same** `contextVersionId` replays; a **different** `contextVersionId` after finalization → `PurchaseIntentFinalizationConflictError`; finalizing an invalidated intent → `PurchaseIntentInvalidatedError`; after finalization no further context append (§8); the finalized context is the frozen input to the DecisionRequest (§13).

---

## 10. Invalidation / Replacement

```
PurchaseIntentInvalidation {
  id                    PK UUID
  invalidatedIntentId   UNIQUE FK → PurchaseIntent    -- invalidated at most once
  replacementIntentId?  FK → PurchaseIntent           -- optional; a NEW root
  invalidatedAt         TIMESTAMPTZ trusted
  reasonCode?           -- typed enum (no free text as scientific input)
  CHECK (replacementIntentId IS NULL OR replacementIntentId <> invalidatedIntentId)   -- no self-link
}   -- append-only
```
Semantics: the invalidated intent and all its context/finalization/request/snapshot/binding remain present (never deleted); the invalidated intent is scientifically non-effective for future B/C (derived from the presence of an invalidation row); `replacementIntentId`, when present, is a **new** root in the **same assignment** (both assignments resolved via their capture tokens; cross-row ⇒ trigger/transaction, §23), `<> invalidatedIntentId` (CHECK), with its **own** `businessDecisionKey`/decision identity, never reusing the invalidated intent's context/finalization/request/snapshot/binding. A replacement is an ordinary root and may itself be invalidated later; cycle safety §23. Invalidation asserts no B-level opportunity identity. A new invalidation is new collection (A1 authorization at `invalidatedAt`); a **replay** of an already-recorded invalidation is not (§7).

---

## 11. BusinessDecisionKey

```
businessDecisionKey = "pagamenos:study-intent-decision:v1:" + PurchaseIntent.id
```
No accepted authority prescribes a different namespace (M3.5A enforces only uniqueness). Same root ⇒ same key forever; replacement root ⇒ different key. Forbidden and structurally impossible: merchant-only / merchant+amount / session / timestamp-bucket / caller-provided keys — the public decision path accepts no `businessDecisionKey`. Closes R35R-04. (No persisted request-affecting field is excluded from identity, §11-task: the removed `captureOrigin` eliminated the only candidate for that trap.)

---

## 12. PurchaseIntentDecisionRequest

```
PurchaseIntentDecisionRequest {
  id                             PK UUID
  intentId                       UNIQUE FK → PurchaseIntent
  finalizationId                 UNIQUE FK → PurchaseIntentFinalization

  decisionRequestSchemaVersion   -- A2 envelope version, "pagamenos.intent-decision-request.v1"

  exactValidatedDecideInputJson  JSONB   -- normalized validated DecideInput (semantic value; §13)
  decideInputHash                        -- SHA-256(canonical(...)) == M3.5A inputHash/requestHash

  expectedEngineInputSchemaVersion   -- == accepted ENGINE_INPUT_SCHEMA_VERSION at freeze (rehydration + fresh-run gate, §2/§14)
  expectedEngineContractVersion      -- == accepted ENGINE_CONTRACT_VERSION at freeze
  expectedCorpusVersion              -- == loadCorpus().corpusId at freeze

  businessDecisionKey            UNIQUE  -- derived (§11)
  m3_5aIdempotencyKey            UNIQUE  -- derived (§15)

  createdAt                      TIMESTAMPTZ trusted
}   -- append-only
```
Immutable; A2 persists the accepted M3.5A constant values (invents no versioning). All **three** pins participate in the fresh-run gate (§2/§14) and the historical-snapshot coherence predicate (§17). `gitSha`/`buildId` are not pinned (build ≠ economic semantics). `snapshotSchemaVersion`/`engineOutputSchemaVersion` are M3.5A structural self-description, not A2 pins (§14.1).

---

## 13. Exact DecideInput Freezing + correlation-key contracts

Freezing order (commits before M3.5A runs): finalized effective intent → load exact finalized context version → derive `DecideInput` (context ← finalized version; portfolio ← participant's trusted portfolio; rules/scopes/operationalStates ← trusted corpus for the merchant; `evaluatedAt` ← trusted sample) → validate (`engineInputV1Schema`) → `assertCanonicalizable` + canonicalize → `decideInputHash = SHA-256(canonical)` → pin the three expected versions → persist `PurchaseIntentDecisionRequest` → COMMIT → only then may the saga proceed to M3.5A (§18/§22).

**JSONB is a normalized semantic value, not preserved text.** PostgreSQL JSONB preserves neither byte text nor key order, and need not: the frozen invariant is semantic — the value reloaded from JSONB reparses (via the versioned parser, §22) into the exact validated `DecideInput`, and its recomputed canonical hash equals `decideInputHash` (== M3.5A `inputHash`/`requestHash`). A retry rehydrates via the versioned parser and re-verifies the hash — never reconstructing from mutable current context/corpus/config.

### 13.1 `clientCorrelationNonce` contract (§13 task)
Opaque, high-entropy (≥128-bit) random value formatted like the project's other opaque keys; **not** PII; generated by the controlled client **before** the first `issueIntentCaptureKey` call; persisted client-side until capture creation is resolved; scoped by assignment (`UNIQUE(assignmentId, clientCorrelationNonce)`); reused **only** for retries of that exact capture; a genuinely-new capture uses a **new** nonce. Because issuance carries no material beyond `(assignment, nonce)`, same `(assignment, nonce)` always returns the same token (never a conflict); materially-different *intent initialization* is expressed at `createPurchaseIntent` and, on the same token with different `intentType`/`entrySource`, is a `PurchaseIntentCaptureConflictError` (§5.2), never a silent alias. No merchant/time heuristics.

### 13.2 `contextCaptureKey` contract (§14 task)
Opaque correlation value; persisted by the controlled client **before** the append attempt; reused **only** for retry of that exact context capture; a new correction/update uses a **new** key; field equality never defines identity. Same `contextCaptureKey` + materially different payload → same transport key: idempotency conflict; different transport key: **domain conflict** (`PurchaseIntentContextConflictError`), never alias (§8.1).

---

## 14. Engine/Corpus/Input-Schema Semantic Pinning — three concerns separated (A2-PRE-08)

Three distinct concerns must not be conflated:

**(a) Request self-integrity (§19)** — validates the frozen request in isolation; treats `expectedEngineContractVersion`/`expectedCorpusVersion` as **opaque well-formed frozen identity labels** (does NOT require current runtime to "support" them, A2-PRE-09); requires a **retained input parser** for `expectedEngineInputSchemaVersion` to rehydrate/rehash the frozen input.

**(b) Current-execution compatibility (§2.1)** — before a **fresh** `decideAndPersist`, current `ENGINE_INPUT_SCHEMA_VERSION` **and** `ENGINE_CONTRACT_VERSION` **and** `corpusId` MUST equal the request pins, else fail closed. **A2-PRE-08 fix:** the input-schema version is now part of this gate — so a current input-schema drift (`S1→S2`) can never let M3.5A persist a snapshot stamped `S2` that A2's own binding predicate (clause 8, §17) would then reject, poisoning the deterministic identity. **No incompatible snapshot is ever persisted first and rejected afterward.**

**(c) Historical-snapshot coherence (§17)** — a snapshot may bind only if its **stamped** `engineContractVersion`/`corpusVersion`/`engineInputSchemaVersion` equal the request pins, whether the snapshot was found historically or freshly computed. Current runtime may differ from the historical snapshot's stamps only when repairing an already-existing snapshot; the historical snapshot itself may never differ from the request pins (a matching-identity snapshot with mismatched stamps ⇒ typed CONFLICT).

Because a fresh recompute is gated on current == pins for all three (b), and M3.5A stamps the current constants at creation, a freshly-created snapshot is always stamped == pins — A2 never poisons its own identity. A build-only (`gitSha`) change with all three economic/schema versions equal still permits recompute and binding.

### 14.1 Fresh-execution vs historical-binding table

| Authority (accepted constant) | Request self-integrity (§19) | Required CURRENT == request before fresh engine (§2.1/b) | Required HISTORICAL snapshot stamp == request pins (§17/c) |
| :-- | :-- | :-- | :-- |
| `decisionRequestSchemaVersion` (A2 envelope) | supported envelope version | n/a (not an M3.5A authority) | n/a |
| `ENGINE_INPUT_SCHEMA_VERSION` | **retained parser available** (else fail closed) | **YES** (A2-PRE-08) | **YES** |
| `ENGINE_CONTRACT_VERSION` | well-formed frozen label (no current support required) | **YES** | **YES** |
| `corpusVersion` (`corpusId`) | well-formed frozen label (no current support required) | **YES** | **YES** |
| canonicalization | frozen / non-versioned (tied to schema versions) | n/a | n/a (hash equality proves it) |
| `gitSha` / `buildId` | not pinned | **no** | **no** |
| `ENGINE_OUTPUT_SCHEMA_VERSION` / `SNAPSHOT_SCHEMA_VERSION` | not pinned by A2 | no (but affects M3.5A snapshot **loadability**, §16) | recorded; verified by M3.5A `verifyHistoricalSnapshot` on load |

A2 invents no version strings — it persists and compares the accepted constants' values. A2 relies on the corpus discipline that `corpusId` changes whenever corpus content changes; a mutated rule without a label bump would additionally be caught by M3.5A's own provenance membership check at `decideAndPersist` time (`CorpusProvenanceError`).

---

## 15. M3.5A Idempotency Identity

```
m3_5aIdempotencyKey = "pagamenos:study-intent-decision-idem:v1:" + PurchaseIntent.id
```
Derived internally; stable forever per intent; namespace-versioned; never a transport caller key; never regenerated per retry; distinct across intents. Passed under `operationScope = DECISION_PERSIST_V1`. Distinct namespace from `businessDecisionKey`. A2 uses one deterministic key per intent ⇒ M3.5A's alias path is never exercised by A2 ⇒ exactly one `(businessDecisionKey, m3_5aIdempotencyKey)` pairing per intent (a tight coherence invariant the finder relies on, §18).

---

## 16. Snapshot loadability & historical-parser retention (verified constraint)

Verified (§3.1): under accepted M3.5A a stored snapshot is loadable only while the current build's version constants + version-dispatch branches recognize its stamped versions (`decisionSnapshotDtoSchema` pins all four with `z.literal`). Consequences A2 states normatively:
- **Input-parser retention (A2 obligation):** if an A2 `DecisionRequest` pinned to input-schema `S` can remain unresolved/repairable, deployments MUST retain the versioned input parser needed to verify/rehydrate `S` (§19 check 7). If unavailable → fail closed (`PurchaseIntentUnsupportedInputSchemaError`); never fall back to the current schema. This does not require retaining old corpus/engine runtime *code* merely to bind an already-existing snapshot.
- **Snapshot-loadability retention (M3.5A operational obligation A2 inherits):** to *bind* a historical snapshot, M3.5A must be able to *load* it; under accepted M3.5A that requires the current build to recognize the snapshot's stamped versions (its own documented version-dispatch retention pattern). A2 requires no M3.5A semantic change; if a deployment bumps a stamped version without retaining a historical parser branch, an old snapshot becomes unloadable and `findExactHistoricalDecision` **fails closed** (typed CONFLICT, §18/§26) — never silent, never corrupting. The common redeploy (bug fix / new `gitSha`, no version bump) leaves all stamps unchanged, so old snapshots load and repair binds normally.

---

## 17. Exact Snapshot Coherence — unified predicate (A2-PRE-04)

Binding requires, for DecisionRequest `R` and snapshot `S`, **all**:
1. `S.businessDecisionKey === R.businessDecisionKey`.
2. an M3.5A receipt exists for `(DECISION_PERSIST_V1, R.m3_5aIdempotencyKey)`.
3. `receipt.decisionSnapshotId === S.id`.
4. `receipt.requestHash === R.decideInputHash`.
5. `S.inputHash === R.decideInputHash`.
6. `S.engineContractVersion === R.expectedEngineContractVersion`.
7. `S.corpusVersion === R.expectedCorpusVersion`.
8. `S.engineInputSchemaVersion === R.expectedEngineInputSchemaVersion`.
9. `verifyHistoricalSnapshot(S)` passes (M3.5A recompute-hash + column↔payload coherence); loading `S` at all requires M3.5A to recognize its stamped versions (§16).

CURRENT runtime versions need **not** equal `S`'s stamps when `S` already exists; clauses 6–8 compare `S`'s stamps to the **request pins**. **Same merchant / similar input / same amount/time is never sufficient.** Typed fail-closed conflicts: `…BindingBusinessKeyMismatchError` (1); `…BindingReceiptMismatchError` (2/3/4); `…BindingInputHashMismatchError` (5); `…BindingSemanticMismatchError` (6/7/8); M3.5A `SnapshotIntegrityError`/`SnapshotCoherenceError`/`UnsupportedSnapshotVersionError` (9).

---

## 18. findExactHistoricalDecision (owns the full predicate)

```
findExactHistoricalDecision({
  businessDecisionKey, idempotencyKey, inputHash,
  expectedEngineContractVersion, expectedCorpusVersion, expectedEngineInputSchemaVersion,
}): Promise<{ kind: 'NONE' } | { kind: 'FOUND'; snapshot: DecisionSnapshotDto }>   // else throws typed CONFLICT
```
The finder OWNS the full exact-match predicate (clauses 1–9, §17) including the semantic pins, returning `FOUND` only when all hold, `NONE` only when nothing exists for the identity and no conflicting partial/unloadable state exists, and throwing a typed CONFLICT otherwise. READ ONLY (no engine/corpus/provider/build invocation, no write, no arbitrary repository exposure); uses `findReceipt`/`findSnapshotById`/`findSnapshotByBusinessKey` + `verifyHistoricalSnapshot`.

Algorithm: (1) `receipt = findReceipt(DECISION_PERSIST_V1, idempotencyKey)`; `snapByKey = findSnapshotByBusinessKey(businessDecisionKey)`. (2) **NONE** iff both null. (3) else verify: if `receipt` present, `S = findSnapshotById(receipt.decisionSnapshotId)` — if the load itself throws because the stamped versions are unrecognized (§16), surface it as `PurchaseIntentHistoricalSnapshotUnloadableError` (CONFLICT, never NONE); missing ⇒ `…ReceiptDanglingError`; then assert clauses 1–9, any failure ⇒ its typed CONFLICT (semantic-stamp mismatch ⇒ `…HistoricalSemanticMismatchError`); return `FOUND(S)`. If `receipt` null but `snapByKey` present ⇒ `…SnapshotWithoutReceiptError`. If `receipt` present and `snapByKey` present with a different `inputHash` ⇒ `…BusinessKeyConflictError`.

---

## 19. DecisionRequest Self-Integrity Verification (A2-PRE-05/09; final rules)

Every load of a `PurchaseIntentDecisionRequest` used for historical lookup, engine execution, binding, or repair MUST pass, fail-closed, with no current-runtime fallback:
```
verifyPurchaseIntentDecisionRequest(request): VerifiedDecisionRequest
```
1. `request.intentId` exists.
2. `request.finalizationId` exists and its `intentId === request.intentId`.
3. the finalization's `contextVersionId` exists and its `intentId === request.intentId`.
4. `deriveBusinessDecisionKey(request.intentId) === request.businessDecisionKey` (§11).
5. `deriveM3_5aIdempotencyKey(request.intentId) === request.m3_5aIdempotencyKey` (§15).
6. `request.decisionRequestSchemaVersion` is a supported envelope version.
7. `request.expectedEngineInputSchemaVersion` selects a **retained historical input parser** (else `PurchaseIntentUnsupportedInputSchemaError`, §16).
8. `request.exactValidatedDecideInputJson` parses under **that** parser.
9. `canonicalHash(parsed normalized input) === request.decideInputHash`.
10. `request.expectedEngineContractVersion` and `request.expectedCorpusVersion` are **syntactically valid, well-formed frozen historical identities** (non-empty, correctly shaped).
11. **Verification does NOT require (10) to equal current runtime versions** (A2-PRE-09) — historical crash repair of an exact snapshot pinned to older economic labels must not be blocked merely because current runtime moved on. Current-runtime equality is a **separate** concern applied only before a *fresh* engine run (§2.1), and historical-snapshot coherence is a **separate** concern applied at binding (§17).

Checks 1–3 are cross-table (service verifier under a read transaction); 4–10 are pure over the loaded row + `intentId`. The three concerns — *request self-integrity* / *current-execution compatibility* / *historical-snapshot coherence* — are kept strictly separate.

---

## 20. M3.5A / A1 Boundary + Prisma implementability (A2-PRE-07/10/19)

**Allowed M3.5A change (only):** `findExactHistoricalDecision` as an additive read-only function in `src/services/decide-and-persist.ts`; not on the public barrel; reachable only by the A2 repair service + tests via the owner map. No write path, no economic-semantic change, no migration/mutability change, no engine change.

**Prisma relations (verified Prisma 6.2.0 ⇒ opposite relation field required).** A2 adds **Prisma-only virtual back-relation fields** (no SQL column, no accepted stored/migration/economic change):
- on A1 `ExperimentAssignment`: `purchaseIntentCaptureTokens PurchaseIntentCaptureToken[]` (for the token→assignment FK).
- on M3.5A `DecisionSnapshot`: `purchaseIntentDecisionBinding PurchaseIntentDecisionBinding?` (for the binding→snapshot FK).
Each generates no SQL column on the accepted table; the FK scalars (`assignmentId`, `snapshotId`, `captureTokenId`) live on the A2 child tables.

**Capture-token structural FK (A2-PRE-10, chosen model).** `PurchaseIntent.captureTokenId String @db.Uuid @unique` with `@relation(fields: [captureTokenId], references: [id]) ON DELETE RESTRICT` to `PurchaseIntentCaptureToken`; the token carries the `assignmentId` FK. This **single-scalar** relation is chosen over the alternative composite `(intentCaptureKey, assignmentId)` FK because Prisma disallows a scalar (`assignmentId`) participating in two relations (it would also need a direct FK to `ExperimentAssignment`), which would be an ORM validation surprise; routing the assignment **through the token** removes any second assignment field and makes assignment-coherence automatic (there is nothing to mismatch). Exact SQL: `purchase_intent.captureTokenId` UNIQUE + FK → `purchase_intent_capture_token(id)` RESTRICT. `prisma validate` + the migration↔schema diff (`pnpm db:migrate:check`) stay clean; the two virtual back-relations above are the only touch to accepted models.

**SCI wording:** "M3.5A/A1 untouched" means no persisted/stored/economic/migration mutation; a Prisma-only virtual relation field required by the ORM for relational completeness is permitted and is not a mutation (SCI-A2-13). If A2 ever needed a semantic M3.5A/A1 change rather than additive read access + a virtual relation field, this document would declare `A2 DESIGN BLOCKER`. **No such blocker exists.**

---

## 21. Crash-Repair Saga — state-sensitive (A2-PRE-03) + replay/consent discipline (A2-PRE-11)

`decideForPurchaseIntent({ intentId })` — trusted internal op. No caller-provided input/engine/corpus/build/key/snapshotId. **No blanket "must be effective" gate.**

**Step 0.** Authorize the caller; load intent + finalization + invalidation + request + binding state.

**Case A — binding exists.** Load binding → verify request (§19) → load `S` by `binding.snapshotId` → assert §17 → return `S`. No engine call, regardless of later invalidation (not new collection).

**Case B — request exists, binding absent.** Verify request (§19). `findExactHistoricalDecision(pins…)` (§18):
- **FOUND** → assert §17 (defensive) → create binding (§22/§29) → return `S`. No engine call; invalidation state irrelevant (internal repair, §7).
- **NONE** → `assertCurrentRuntimeMatchesDecisionRequest` (§2.1); if mismatch → fail closed. Else rehydrate frozen input (§22) → `decideAndPersist` → the returned `S` must satisfy §17 → bind → return `S`.
- **CONFLICT** → fail closed.

**Case C — request absent.** Under the `PurchaseIntent` root lock (§22): require **finalized AND NOT invalidated**; if invalidated → `PurchaseIntentInvalidatedError` (no new request, no engine); else freeze/create exactly one request (§13) → COMMIT → continue at Case B. The effectiveness gate applies **only** here (creating a *new* request).

Internal completion of an already-durable request is deterministic repair, not new collection (§7); it consumes facts collected/authorized when the context was captured.

### 21.1 Invalidation × decision state table

| State at entry | invalidated? | New request? | Finder? | Engine may run? | New collection? | Result |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| not finalized | any | no | no | no | no | `PurchaseIntentNotFinalizedError` |
| finalized, no request | no | yes (Case C) | then B | maybe (B) | no (internal freeze) | request created → decision |
| finalized, no request | yes | **no** | no | no | no | `PurchaseIntentInvalidatedError` |
| request, no snapshot | any | n/a | yes | yes iff NONE + current==pins | no (internal repair) | completes; root non-effective if invalidated |
| request, snapshot, no binding | any | n/a | yes (FOUND) | no | no | binding repaired; engine NOT rerun |
| binding exists | any | n/a | no | no | no | return historical binding |

Rationale unchanged from prior analysis: once a request is durably frozen, completion is deterministic internal repair; blocking it would create an impossible half-state. Invalidation makes the root non-effective for future B/C, deletes nothing, and (via the shared root lock, §22) deterministically forbids creating a *new* request once invalidation commits.

---

## 22. Concurrency / Locking + Input Rehydration

**Lock hierarchy (deadlock-free):** `ExperimentAssignment` **≺** `PurchaseIntent` root(s, ascending UUID order) **≺** child rows. Operations needing both acquire the assignment first, then roots in UUID order.
- Context append / finalize / decide Case-C freeze: lock the `PurchaseIntent` root only.
- Invalidation: lock `ExperimentAssignment` first (lineage/cycle walk §23), then root(s). Since decide/finalize/append lock only the root and never grab the assignment while holding the root, invalidation (assignment→root) and decide (root) contend only on the root lock — no cycle.
- Request creation vs invalidation serialize on the shared root lock; whichever holds it first determines whether a request exists (§21 Case C). `UNIQUE(intentId)` is defense-in-depth.
- `decideAndPersist` runs outside any A2 lock; M3.5A owns its atomic snapshot+receipt write + reconciliation. Two concurrent Case-B→NONE calls pass the same `(businessDecisionKey, m3_5aIdempotencyKey, input)` ⇒ M3.5A returns one snapshot; one binding wins, the other P2002-reconciles.
- Binding: short transaction on `UNIQUE(intentId)`+`UNIQUE(snapshotId)`+P2002; a conflicting second binding to a materially-different snapshot fails closed (§17).

### 22.1 Decide/invalidate race
Invalidation wins before any request commit → invalidation durable → Case C refuses a request. Request commit wins before invalidation → request durable; later invalidation deletes nothing → internal completion follows §21.1. No ambiguous half-state.

### 22.2 DecisionRequest → M3.5A input rehydration (no direct cast)
1 load request; 2 `verifyPurchaseIntentDecisionRequest` (§19); 3 dispatch the versioned parser by `expectedEngineInputSchemaVersion` (reuse `engineInputV1Schema`; unsupported ⇒ fail closed §16); 4 produce the validated typed `DecideInput`; 5 recompute canonical hash; 6 compare to `decideInputHash`; 7 only then pass to `decideAndPersist`. Never cast JSONB directly; never reconstruct from the current context version.

---

## 23. Invalidation Cycle Prevention Algorithm (A2-PRE-06)

Serialize the lineage on the `ExperimentAssignment` row (all replacements share one assignment, resolved via each intent's capture token):
```
invalidatePurchaseIntent({ trustedParticipantContext, intentId, replacementIntentId?, reasonCode? }):
  resolve own assignment A of intentId (via intent → captureToken → assignment; own-assignment binding)
  BEGIN TX
    LOCK ExperimentAssignment A FOR UPDATE                 -- lineage serialization (top of hierarchy §22)
    (§7 discipline) if this exact invalidation already durable → replay/alias, no new collection
    assert invalidatedIntent belongs to A and not already invalidated (UNIQUE guard + read)
    if replacementIntentId present:
      assert replacementIntentId's assignment (via its captureToken) == A     -- same-assignment rule
      assert replacementIntentId != intentId                                  -- no self-link (also CHECK)
      walk the existing replacement lineage; if intentId is reachable FROM replacementIntentId
        (adding edge intentId→replacementIntentId would close a cycle) → reject PurchaseIntentInvalidationCycleError
    sample trusted collection time; read consent facts; wasCollectionAuthorizedAtKnownTime(...); reject if unauthorized  -- NEW fact only
    append PurchaseIntentInvalidation + PurchaseIntentInvalidationReceipt
  COMMIT
```
The whole lineage for one assignment is walked/mutated only under that assignment's `FOR UPDATE`, so concurrent invalidations serialize and each cycle check is exact. Covered (all rejected): `A→A`; `A→B` then `B→A`; `A→B→C` then `C→A`; concurrent `A→B`/`B→A` (one commits, the other's walk sees the committed edge → reject); longer concurrent cycles. `UNIQUE(invalidatedIntentId)` bounds the lineage to a simple chain. Intent-replacement history only — not B opportunity lineage (§38).

---

## 24. A2 Receipt Architecture + resultKind semantics (A2-PRE-13 / §21 task)

Concrete strong-FK receipt families for externally-triggered writes that create a scientific fact: `operationScope`, transport `idempotencyKey`, `requestHash` (§25), concrete target FK, `createdAt`, `UNIQUE(operationScope, idempotencyKey)`, append-only.

**`issueIntentCaptureKey` has NO receipt (A2-PRE-13, Option A):** its complete durable idempotency/domain identity is `UNIQUE(assignmentId, clientCorrelationNonce)` on the token; there is no persisted issuance `requestHash` (it is removed from the request-hash table, §25).

`resultKind` = **durable effect of the command represented by this receipt row**, never "how this HTTP invocation returned". A **same-transport-key replay creates no new receipt** and changes no `resultKind`; it returns the existing receipt + a transient `replayed: true` (the verified A1 `ConsentCommandResult.replayed` pattern). A **different-transport-key domain alias creates a new receipt** whose `resultKind` is the `*_ALIAS` value pointing at the already-existing target. **An alias never resamples scientific capture time** (§21 task): it does not change the original fact's `capturedAt`/`initiatedAt`; the alias receipt's `createdAt` is transport/audit metadata (alias-command processing time), not scientific capture time.

| Receipt | operationScope | Target FK | resultKind |
| :-- | :-- | :-- | :-- |
| PurchaseIntentCreateReceipt | INTENT_CREATE_V1 | intentId → PurchaseIntent | CREATED · CAPTURE_ALIAS |
| PurchaseIntentContextCommandReceipt | INTENT_CONTEXT_APPEND_V1 | contextVersionId → ContextVersion | APPENDED · CONTEXT_ALIAS |
| PurchaseIntentFinalizationReceipt | INTENT_FINALIZE_V1 | finalizationId → Finalization | FINALIZED · FINALIZE_ALIAS |
| PurchaseIntentInvalidationReceipt | INTENT_INVALIDATE_V1 | invalidationId → Invalidation | INVALIDATED · INVALIDATE_ALIAS |

Internal-only `PurchaseIntentDecisionRequest`/`PurchaseIntentDecisionBinding` get no transport receipt: crash recovery is deterministic domain identity + UNIQUE (`UNIQUE(intentId)` on both; `UNIQUE(snapshotId)`/`UNIQUE(decisionRequestId)` on binding; `businessDecisionKey`/`m3_5aIdempotencyKey` on request).

---

## 25. Request Hashes

Reusing the verified A1 discipline (`canonicalHash({ op, …material…, context })`), `requestHash = canonical(material caller request + stable trusted actor/context)`; excludes sampled/derived outputs (DB ids, trusted timestamps, sequences); a normalization version tag accompanies each family.

| Operation | Material identity (hashed), each + `op` + trusted `{participantId}` context |
| :-- | :-- |
| createPurchaseIntent | `intentCaptureKey`, `intentType`, `entrySource` |
| appendPurchaseIntentContext | `intentId` (own), `contextCaptureKey`, context fields (merchant, intendedTransactionAt, channel, amount, branch, basketRef) |
| finalizePurchaseIntent | `intentId` (own), `contextVersionId` |
| invalidatePurchaseIntent | `intentId` (own), `replacementIntentId?`, `reasonCode?` (material) |

`issueIntentCaptureKey` is **absent** (no receipt / no persisted request-hash; §24). Same key + any material difference → typed conflict; different key + same domain identity → alias/replay if material matches, else typed domain conflict; a caller requesting B never receives A. All persisted material fields participate in the appropriate identity (no persisted-but-unhashed request-affecting field remains — `captureOrigin` was removed, §4/§11).

---

## 26. NONE vs CONFLICT (normative)

**NONE** (safe to consider engine execution iff current == pins, §2.1): no receipt for `(DECISION_PERSIST_V1, m3_5aIdempotencyKey)`, no snapshot for `businessDecisionKey`, no conflicting partial state.

**CONFLICT / INTEGRITY (never NONE; always typed, fail closed):** business-key snapshot with `inputHash ≠ decideInputHash` (`…BusinessKeyConflictError`); receipt `requestHash ≠ decideInputHash` (`…ReceiptHashMismatchError`); receipt→missing snapshot (`…ReceiptDanglingError`); snapshot-under-key without receipt (`…SnapshotWithoutReceiptError`); **matching identity but stamped `engineContractVersion`/`corpusVersion`/`engineInputSchemaVersion` ≠ pins** (`…HistoricalSemanticMismatchError`); **snapshot exists but is unloadable under the current build's version dispatch** (`…HistoricalSnapshotUnloadableError`, §16); binding↔snapshot incoherence (`…BindingSemanticMismatchError`); M3.5A `SnapshotIntegrityError`/`SnapshotCoherenceError`.

---

## 27. Trusted Capability Matrix (verified A1 names)

| A2 capability (concept) | A2 operation | Allowed importing module (new A2 additions) | Forbidden callers |
| :-- | :-- | :-- | :-- |
| PurchaseIntentCapture | issueIntentCaptureKey, createPurchaseIntent, appendPurchaseIntentContext | `services/study-purchase-intent.ts` (behind trusted context) | app/participant-facing raw; other services |
| PurchaseIntentFinalization | finalizePurchaseIntent | `services/study-purchase-intent.ts` | same |
| PurchaseIntentAdministration | invalidatePurchaseIntent | `services/study-purchase-intent.ts` | same |
| PurchaseIntentDecision | decideForPurchaseIntent | `services/study-intent-decision.ts` | app/participant-facing; other services |
| HistoricalDecisionLookup | findExactHistoricalDecision | defined in `services/decide-and-persist.ts` → imported ONLY by `services/study-intent-decision.ts` | everything else (incl. public barrel) |
| A1-ConsentFactsRead | readConsentAuthorizationFacts | defined in `services/study-consent.ts` → imported ONLY by `services/study-purchase-intent.ts` + `services/study-intent-decision.ts` | everything else |

Enforcement extensions (mirroring verified A1): add A2 raw repos (`@/db/purchase-intent-repository`, `@/db/purchase-intent-decision-repository`) to `RAW_WRITE_MODULES` + ESLint `FORBIDDEN_WRITE_INTERNALS`; add A2 deep services to a `FORBIDDEN_STUDY_ADMIN`-style group; extend the **per-repository owner-allowlist map** (`'db/purchase-intent-repository' → ['services/study-purchase-intent.ts']`, `'db/purchase-intent-decision-repository' → ['services/study-intent-decision.ts']`) and the service owner map so the finder and consent-facts facade are importable only by their designated A2 callers; add both new sanctioned impl files to the exemption list. Participant-facing code gains no raw snapshot/binding repository, no binding creation, no snapshot selection, no engine context, no `businessDecisionKey`/`m3_5aIdempotencyKey`/`snapshotId` control, no arbitrary `participantId` (own-assignment only via the verified WeakSet-validated context).

---

## 28. Database Invariant Matrix

| A2 invariant | Enforcement |
| :-- | :-- |
| PurchaseIntent.id decision identity | PK UUID |
| token issuance idempotent / domain identity | UNIQUE(assignmentId, clientCorrelationNonce) + P2002 (no receipt) |
| capture-key uniqueness | UNIQUE(intentCaptureKey) on token |
| **intent↔token structural coherence** | **PurchaseIntent.captureTokenId FK → token(id) RESTRICT + UNIQUE(captureTokenId)** (no separate intent assignment to mismatch; A2-PRE-10) |
| capture-key ownership (before intent exists) | service: token.assignmentId owner == context.participantId (§5) |
| token / PurchaseIntent immutable | append-only triggers |
| intentType/entrySource domain | CHECK (enum) |
| context version identity | UNIQUE(intentId, contextSeq) |
| **context-command exact identity** | **UNIQUE(intentId, contextCaptureKey)** + payload reconciliation (§8.1) |
| context monotonic seq; no overwrite | root lock + append-only trigger |
| context belongs to its intent | FK(intentId) |
| append after finalization rejected | service (finalization presence under root lock) |
| one finalization per intent | UNIQUE(intentId) on finalization |
| finalization pins one context of same intent | FK(contextVersionId) + trigger(ctxVersion.intentId == finalization.intentId) |
| finalization after invalidation rejected | service (effective check under root lock) |
| businessDecisionKey from immutable id | pure derivation; UNIQUE on request |
| one DecisionRequest per intent | UNIQUE(intentId) on request + root lock |
| frozen input immutable / self-integrity | append-only trigger + `verifyPurchaseIntentDecisionRequest` (§19) |
| m3_5aIdempotencyKey stable/unique | pure derivation; UNIQUE on request |
| exact 1:1 binding | UNIQUE(intentId)+UNIQUE(snapshotId)+UNIQUE(decisionRequestId) + §17 in-tx |
| binding snapshot coherence | service verification §17 (cross-table to M3.5A) |
| snapshot never cascade-deleted | binding.snapshotId FK RESTRICT + M3.5A immutability trigger |
| invalidated at most once | UNIQUE(invalidatedIntentId) |
| no self-invalidation | single-table CHECK |
| replacement same assignment | trigger/transaction via tokens (§23) |
| no invalidation cycles | transaction + recursive walk under ExperimentAssignment FOR UPDATE (§23) |
| new-fact vs replay/alias consent | service ordering §7.1 (new fact → A1 authorization at collection time; replay/alias → none) |
| receipt idempotency + resultKind | UNIQUE(operationScope, idempotencyKey) + concrete FK + enum |
| capability / own-assignment | AST owner-map + ESLint + trusted context (§27) |

No illegal cross-table CHECK is claimed; cross-table rules are triggers/transactions/service verification.

---

## 29. A2 Entity Table

| Entity | PK | Domain identity | FKs | UNIQUE | CHECK | Behavior |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| PurchaseIntentCaptureToken | id | intentCaptureKey | assignmentId→ExperimentAssignment RESTRICT | intentCaptureKey; (assignmentId, clientCorrelationNonce) | — | append-only |
| PurchaseIntent | id | id | captureTokenId→PurchaseIntentCaptureToken RESTRICT | captureTokenId | intentType∈enum; entrySource∈enum | append-only |
| PurchaseIntentContextVersion | id | (intentId, contextSeq) | intentId→PurchaseIntent | (intentId, contextSeq); (intentId, contextCaptureKey) | amountCentimos≥0 | append-only |
| PurchaseIntentFinalization | id | intentId | intentId→PurchaseIntent; contextVersionId→ContextVersion | intentId | — | append-only; +trigger(ctxVersion.intentId==intentId) |
| PurchaseIntentInvalidation | id | invalidatedIntentId | invalidatedIntentId→PurchaseIntent; replacementIntentId?→PurchaseIntent | invalidatedIntentId | replacement<>invalidated | append-only; +trigger(same assignment; §23 cycle) |
| PurchaseIntentDecisionRequest | id | intentId | intentId→PurchaseIntent; finalizationId→Finalization | intentId; finalizationId; businessDecisionKey; m3_5aIdempotencyKey | — | append-only; self-verified (§19) |
| PurchaseIntentDecisionBinding | id | intentId | intentId→PurchaseIntent; decisionRequestId→Request; snapshotId→decision_snapshot RESTRICT | intentId; snapshotId; decisionRequestId | — | append-only |
| PurchaseIntentCreateReceipt / ContextCommandReceipt / FinalizationReceipt / InvalidationReceipt | id | (operationScope, idempotencyKey) | concrete target FK | (operationScope, idempotencyKey) | resultKind∈enum | append-only |

No stored actor/`captureOrigin` columns (§4). Virtual Prisma back-relations (no SQL column): `ExperimentAssignment.purchaseIntentCaptureTokens` (A1), `DecisionSnapshot.purchaseIntentDecisionBinding` (M3.5A). Excluded (B/C): PurchaseOccasion, ResearchContact, weekly reports, ValueVerification, C2 models.

---

## 30. A2 Service Table

| Operation | Caller / trusted context | Public/Internal | Material input | Internally derived | Lock | Receipt | New-collection consent? | Errors |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| issueIntentCaptureKey | PurchaseIntentCapture (trusted ctx) | public (participant) | assignmentId(own), clientCorrelationNonce | intentCaptureKey, issuedAt | UNIQUE guard | — (idempotent token) | **no** (infrastructure, §9) | not-own-assignment |
| createPurchaseIntent | PurchaseIntentCapture (trusted ctx) | public | intentCaptureKey, intentType, entrySource | captureTokenId(=token.id), initiatedAt | UNIQUE guard | CreateReceipt | **yes** on NEW; no on replay/alias (§7) | consent-not-authorized; capture conflict; not-own-assignment |
| appendPurchaseIntentContext | PurchaseIntentCapture (trusted ctx) | public | intentId(own), contextCaptureKey, context fields | contextSeq, capturedAt, recordedAt | root FOR UPDATE | ContextCommandReceipt | **yes** on NEW; no on replay/alias | consent-not-authorized; after-finalization; invalidated; context conflict |
| finalizePurchaseIntent | PurchaseIntentFinalization (trusted ctx) | public | intentId(own), contextVersionId | finalizedAt | root FOR UPDATE | FinalizationReceipt | **yes** on NEW; no on replay | consent-not-authorized; invalidated; different-context conflict; no-context |
| invalidatePurchaseIntent | PurchaseIntentAdministration (trusted ctx) | public | intentId(own), replacementIntentId?, reasonCode? | invalidatedAt | Assignment FOR UPDATE → root(s) (§22/§23) | InvalidationReceipt | **yes** on NEW; no on replay | already-invalidated; self-link; cross-assignment; cycle |
| decideForPurchaseIntent | PurchaseIntentDecision (trusted internal) | internal | intentId | businessDecisionKey, m3_5aIdempotencyKey, frozen input, pins | root lock only for Case C freeze | — | **no** (internal repair, §7) | not-finalized; invalidated (Case C); semantic-drift; historical CONFLICT; binding-coherence |
| findExactHistoricalDecision | HistoricalDecisionLookup (repair only) | internal (M3.5A facade) | businessDecisionKey, idempotencyKey, inputHash, 3 pins | — | read-only | — | n/a | typed CONFLICT/integrity (§26) |
| readConsentAuthorizationFacts | A1-ConsentFactsRead (A2 callers only) | internal (A1 facade) | assignmentId | — | read-only | — | n/a | — |

**No public** `attachSnapshot`, `bindSnapshot`, `createDecisionRequest(raw input)`, `findSnapshot(raw query)`.

---

## 31. Crash-Saga Table

| Durable facts at entry | invalidated? | Validity checks | Finder? | Engine may run? | Current==pins (3) before fresh? | Historical stamps==pins? | Write | Retry result |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| finalized, no request | no | finalized, effective, consent@collection (NEW) | no (Case C) | not yet | — | — | freeze+commit request | one request created |
| finalized, no request | yes | invalidated | no | no | — | — | none | `PurchaseIntentInvalidatedError` |
| request, no snapshot | any | verify request (§19) | yes (NONE) | yes iff NONE | **yes (input-schema+contract+corpus)** else fail closed | n/a (fresh S satisfies §17) | decideAndPersist → S+receipt → bind | one snapshot; bound; engine ran once |
| request, snapshot, no binding | any | verify request; finder FOUND | yes | no | no | **yes** (§17 6–8) | bind | binding repaired; engine NOT rerun |
| request, snapshot, binding | any | verify binding+§17 | no | no | no | yes | none | existing binding returned |
| matching identity, stamps ≠ pins | any | finder | — | no | — | mismatch | none | CONFLICT (`…HistoricalSemanticMismatchError`) |
| snapshot exists but unloadable (stamp not recognized, §16) | any | finder load throws | — | no | — | — | none | CONFLICT (`…HistoricalSnapshotUnloadableError`) |
| request, no snapshot; current input-schema/contract/corpus drift | any | finder NONE | yes | **no** | mismatch | — | none | fail closed (`PurchaseIntentSemanticDriftError`) |
| request, no snapshot; build-only (gitSha) change | any | finder NONE | yes | yes | current==pins (build excluded) | n/a | decideAndPersist → bind | completes normally |
| concurrent decide calls | any | both verify | yes | one rerun at most | yes | yes | M3.5A dedups to one S; one binding wins | both coherent |

---

## 32. Mandatory Adversarial Tests

**Capture response loss / restart:** create commits, response lost, different-transport-key retry with the held `intentCaptureKey` → one root. Issuance response lost → re-issue same nonce → same key/one token. **Capture cross-participant:** A's key used by B → `StudyAssignmentOwnershipError`. **Capture non-collapse:** two distinct captures (same merchant/amount/time) → two roots. **Capture material conflict:** same token, different `intentType`/`entrySource` → `PurchaseIntentCaptureConflictError`.

**Direct-DB adversarial (A2-PRE-10 / §20 task):** PurchaseIntent referencing a nonexistent capture token → FK reject; PurchaseIntent whose assignment would differ from the token → **impossible** (no separate assignment field; assignment IS the token's); reuse one token for a second intent → `UNIQUE(captureTokenId)` reject; context duplicate capture key → `UNIQUE(intentId, contextCaptureKey)` reject; finalization context from another intent → trigger reject; malformed self-replacement → CHECK reject; any UPDATE/DELETE on an append-only table → trigger reject.

**Context:** response loss → different transport key + same `contextCaptureKey` → one version + alias; matrix §8.1 each row (incl. same key/different payload → idempotency conflict; different key/different payload → domain conflict); cross-intent reuse harmless/own-intent only; mutation rejected; append after finalization rejected.

**Consent retry vs new-collection (A2-PRE-11):**
- *Create:* authorized create commits, response lost, participant withdraws, different-transport-key + same capture → same intent, alias receipt, **no** new collection authorization required. *New* intent capture after withdrawal → rejected.
- *Context:* authorized append commits, response lost, withdraw, retry exact context capture → same version, alias/replay, no new row, no re-authorization. *New* context capture after withdrawal → rejected.
- *Finalization:* authorized finalize commits, response lost, withdraw, retry exact finalize → historical finalization returned, no new finalization, no re-authorization.
- *Invalidation:* already-durable invalidation replay after withdrawal → historical invalidation, no re-authorization; a *new* invalidation after withdrawal → subject to §7 (new collection).
- Internal repair after withdrawal completes using frozen facts, no new collection, nothing deleted.

**Finalization:** concurrent (one); retry same context (replay); different context after finalize (conflict); finalize invalidated (rejected).

**Invalidation cycles:** `A→A`; `A→B` then `B→A`; `A→B→C` then `C→A`; concurrent `A→B`/`B→A` (never both commit); replacement different assignment (reject).

**Business key:** same intent stable; different intents different; replacement different.

**DecisionRequest self-integrity (§19):** JSON/hash mismatch → fail closed before finder/engine; wrong derived business/idempotency key → fail closed; unsupported historical input-schema (no retained parser) → fail closed; well-formed historical engine/corpus labels that current runtime no longer "supports" → still verifiable (do NOT fail merely for that).

**Version separation (A2-PRE-08/09):** current input-schema drift `S1→S2` with no snapshot → **fail closed before decideAndPersist** (no unusable snapshot persisted); current contract/corpus drift → fail closed; build-only change → allowed; historical FOUND under drifted runtime with stamps still == pins and a retained snapshot parser → repair binds without rerun; historical snapshot unloadable (stamp unrecognized) → CONFLICT.

**Historical finder:** exact FOUND; true NONE; business-key conflict; wrong idempotency; wrong input hash; receipt-without-snapshot; snapshot-without-receipt; historical semantic mismatch (same key/idempotency/input hash, engine V2 or corpus C2) → CONFLICT; unloadable → CONFLICT; integrity failure.

**Crash saga:** before request commit; after request commit; after snapshot before binding; after binding before response — each converges, engine reruns only on the genuinely-new path.

**Binding:** second snapshot for one intent (reject); same snapshot for a second intent (reject); wrong business key/input hash/semantic stamps (reject); arbitrary caller cannot attach.

**Capability / Prisma:** raw finder / consent-facts facade not generally importable; participant caller cannot mint internal decision identity or submit snapshotId/businessDecisionKey/engine context/DecideInput; the schema (A2 models + capture-token FK + two virtual back-relations) passes `prisma validate` and a clean migration↔schema diff.

---

## 33. A2 SCI Invariants

A2-local labels; global register not reopened (numbering deferred to the register authority).
- **SCI-A2-01 — Exact capture identity**, structurally token-bound; response-loss/restart converge; distinct captures never collapse; cross-participant rebind impossible even via direct INSERT (§5).
- **SCI-A2-02 — Immutable context history + exact context-command identity** (§8).
- **SCI-A2-03 — One finalization pins one exact context** (§9).
- **SCI-A2-04 — businessDecisionKey from the immutable id** (R35R-04; §11).
- **SCI-A2-05 — Frozen DecisionRequest before M3.5A**, rehydrated via the versioned parser + hash re-verify (§13/§22).
- **SCI-A2-06 — Three-way version separation.** *Request self-integrity* (opaque well-formed labels + retained input parser), *current-execution compatibility* (current input-schema+contract+corpus == pins before a fresh run, else fail closed), *historical-snapshot coherence* (bound snapshot stamps == pins) are distinct and complete; build-only change never blocks; a current input-schema drift can never persist an unusable snapshot (§2/§14/§17/§19). *(updated; A2-PRE-08/09)*
- **SCI-A2-07 — Crash recovery without recomputation** (§18/§21/§31).
- **SCI-A2-08 — Exact 1:1 binding** after the unified predicate; no public attach (§16/§17).
- **SCI-A2-09 — Invalidation history + acyclic replacement**; nothing deleted; replacement independent (§10/§23).
- **SCI-A2-10 — DecisionRequest self-integrity**, fail closed, no runtime fallback (§19).
- **SCI-A2-11 — Consent: new-fact vs idempotent replay/alias.** A response-loss retry / alias of an already-durable fact is never re-authorized against current consent; a genuinely-new fact after withdrawal is rejected; internal repair preserves history (§7). *(updated; A2-PRE-11; continues R35R-08 A2 obligation)*
- **SCI-A2-12 — Complete A2 transport-retry identity**; every persisted material field participates in the appropriate domain/request identity; token issuance idempotency is `UNIQUE(assignmentId, clientCorrelationNonce)` (§24/§25; continues R35R-15).
- **SCI-A2-13 — M3.5A/A1 not mutated.** No persisted/stored/economic/migration change; a Prisma-only virtual relation field for relational completeness is permitted and is not a mutation (§20).
- **SCI-A2-14 — Historical parser / snapshot-loadability retention** obligation; unavailable parser or unrecognized stamp ⇒ fail closed, never silent reparse (§16). *(new)*
- **SCI-A2-15 — Capture-token↔intent structural coherence** enforced by DB FK, not merely capability boundaries; no cross-participant rebind via direct DB access (§5/§20/§28). *(new)*

---

## 34. R35R Matrix (rechecked)

| Finding | Disposition | Basis |
| :-- | :-- | :-- |
| R35R-04 businessDecisionKey collision | **CLOSED BY A2 DESIGN** | §11 |
| R35R-05 no durable binding / crash repair | **CLOSED BY A2 DESIGN** | §16/§18/§21/§31 (contradiction-free; three version concerns separated; no unusable snapshot can be persisted) |
| R35R-06 intent identity/finalization/correction/provenance conflated | **CLOSED BY A2 DESIGN** | §4/§5/§6/§8/§9/§10 (capture + context-command identities mechanically complete and DB-bound) |
| R35R-10 A1 protocol/anchor | **A1 ALREADY CLOSED** | not reopened |
| R35R-11 A2 SCI normative | **CLOSED FOR A2-OWNED PORTION** | §33 |
| R35R-15 concrete idempotency receipts | **CLOSED FOR A2 WRITES** | §24/§25: token issuance idempotency coherent (UNIQUE(assignment,nonce), no phantom hash); intent + context retries survive response loss; replay/alias after withdrawal creates no duplicate and does not fail incorrectly; every persisted material field participates in domain/request identity |
| R35R-08 consent historical/temporal | A1 closed; **A2 obligation only** | §7 (new-fact vs replay/alias; internal repair preserves history) |
| R35R-19 eventCutoff/knowledgeCutoff | **DEFERRED NON-BLOCKING** | A2 preserves timestamps; as-of remains C2 |

No B/C finding claimed closed. No OPEN A2 BLOCKER.

---

## 35. Deferred Register

Production `AnalysisProtocol v1` freeze: **UNFROZEN** (A1 §3/§20). Wave 0: **NOT AUTHORIZED**. Deployment/production Protocol v1: not authorized. B/C semantics deferred; A2 persists only the provenance/timestamps they consume (R35R-19). SCI renumbering deferred to the register authority (§33).

---

## 36. Implementability Against Accepted Repository (VERIFIED)

- **Additive Prisma models:** `PurchaseIntentCaptureToken`, `PurchaseIntent`, `PurchaseIntentContextVersion`, `PurchaseIntentFinalization`, `PurchaseIntentInvalidation`, `PurchaseIntentDecisionRequest`, `PurchaseIntentDecisionBinding`, four receipt families. Capture-token structural FK per §20 (single-scalar `captureTokenId` UNIQUE FK RESTRICT). Two virtual back-relation fields on accepted models (§20) — no SQL column, no accepted migration/stored/economic change (Prisma 6.2.0 verified).
- **Migrations:** append-only triggers mirroring the accepted `*_forbid_mutation` guard; single-table CHECKs; cross-table triggers (finalization context-of-intent, replacement same-assignment); §23 cycle serialization is service+transaction under the assignment lock; all UNIQUE indexes §28. Offline `pnpm db:migrate:check` guard.
- **M3.5A read facade:** `findExactHistoricalDecision` additive in `src/services/decide-and-persist.ts`, read-only; not on the public barrel.
- **A1 read facade:** `readConsentAuthorizationFacts` additive in `src/services/study-consent.ts`, read-only, reusing `ConsentStore.listEvents`; not on the public barrel; no A1 semantic change.
- **A2 services:** `src/services/study-purchase-intent.ts` (capture/context/finalize/invalidate) and `src/services/study-intent-decision.ts` (decide; imports the deep decision module + both facades). Added to the sanctioned-impl exemption lists like the A1 study impls.
- **A2 raw repositories:** `src/db/purchase-intent-repository.ts`, `src/db/purchase-intent-decision-repository.ts`; internal; added to `RAW_WRITE_MODULES` + the AST owner map (§27).
- **AST/ESLint:** extend the verified owner-allowlist map + ESLint groups (§27).
- **Retention:** deployments retain the input parser for any input-schema pinned by a still-repairable request, and M3.5A's historical snapshot parser branch for any still-bindable stamped versions (§16).
- **Expected test files:** A2 unit + integration suites (§32); extension of `src/lib/module-capability.test.ts` probes.

**No accepted A1/M3.5A stored/semantic table requires mutation.** No `A2 DESIGN BLOCKER`.

---

## 37. Exact Next Action

**STOP.** Submit this V3 for the independent Codex Sol A2 design gate, alongside accepted A1 V2.1 and the accepted repository. Do not implement, create Prisma models/migrations, expose either facade, or open a branch. `Production Protocol v1 = UNFROZEN`; `Wave 0 = NOT AUTHORIZED`.

---

## 38. No B-Level Opportunity Semantics

`PurchaseIntent ≠ PurchaseOccasion ≠ denominator opportunity`. A2's one-intent-one-decision identity is a system-integrity contract; it does not claim each intent is an independent behavioral opportunity. Later B reconciliation may map multiple A2 captures to one opportunity. A2 computes no opportunity counts, independent sessions/occasions, aggregate overlap, or RIVSR denominator; the invalidation lineage (§10/§23) is intent-replacement history only.

---

# Final Verdict

## M3.5B-A2 EFFECTIVE DESIGN V3 READY FOR INDEPENDENT GATE

- **A2-PRE-08** — the fresh-execution gate now requires current `ENGINE_INPUT_SCHEMA_VERSION` == pin (with `ENGINE_CONTRACT_VERSION` and `corpusId`), so an input-schema drift **cannot** create an unusable M3.5A snapshot that the binding predicate later rejects (§2/§14/§18/§31).
- **A2-PRE-09** — historical request verification treats engine/corpus pins as opaque well-formed frozen labels and does not require current runtime to "support" them; the three concerns (request self-integrity / current-execution compatibility / historical-snapshot coherence) are separate and complete (§14/§17/§19).
- **A2-PRE-10** — `PurchaseIntent` is DB-FK-bound to its capture token (`captureTokenId` UNIQUE FK RESTRICT), the assignment is the token's alone, so no direct/privileged INSERT can reference an unissued token or rebind across participants (§5/§20/§28).
- **A2-PRE-11** — every externally-triggered write distinguishes idempotent replay/alias (no new collection, no current-consent re-check) from a genuinely-new scientific fact (A1 authorization at collection time); withdrawal cannot break response-loss/idempotency guarantees (§7).
- **A2-PRE-12** — actor/provenance pseudo-fields removed (`capturedByContext`/…/`captureOrigin`); trusted actor identity participates via relation + request hash; the entity model has no undefined columns (§4/§6).
- **A2-PRE-13** — `issueIntentCaptureKey` idempotency is exactly `UNIQUE(assignmentId, clientCorrelationNonce)`; no phantom request-hash receipt (§5/§24/§25).
- Request self-integrity / current-runtime / historical-snapshot checks are separate and complete (§14/§17/§19); historical parser and snapshot-loadability retention are stated normatively with fail-closed behavior (§16); token/context correlation-key contracts are exact (§13); no A2/B/C scope expansion.

No implementation is self-authorized — implementation GO remains the independent reviewer's to grant. **FINAL PRE-GATE DESIGN — DESIGN ONLY.**

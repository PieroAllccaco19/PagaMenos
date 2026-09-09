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
> `sha256:b78d8bf6481334c004dfa6af9eb4a6ce8463baa8c55fa5a4a9c387489190c0b6`
>
> Verify with: `tail -n +23 <this file> | sha256sum`
>
> **Root authority register:** `PAGAMENOS_SPEC_AUTHORITY.md` · **Repair record:** `PAGAMENOS_R_B_17_AUTHORITY_REPAIR_REPORT.md`

<!-- R-B-17 ARCHIVAL HEADER - END -->

# PAGAMENOS — M3.5B-A2 EFFECTIVE PRE-IMPLEMENTATION SPECIFICATION — V2

**Milestone:** M3.5B-A2 — PurchaseIntent lifecycle · deterministic decision-request freezing · exact snapshot binding · crash-repair saga.
**Status:** DESIGN / SPECIFICATION ONLY. A2 not implemented. No code / Prisma / migrations / Git / commits / implementation / B/C / Wave 0.
**Nature:** self-contained. **This V2 fully replaces `PAGAMENOS_M3_5B_A2_EFFECTIVE_SPEC.md` for review** — a reviewer needs only (1) this document, (2) the accepted A1 spec `PAGAMENOS_M3_5B_A1_EFFECTIVE_SPEC_V2_1.md`, and (3) the accepted repository baselines. The V1 A2 spec is superseded; do not reconcile the two.

**V2 change log (bounded hardening):** resolves six pre-gate blockers plus the implementability items — A2-PRE-01 capture-identity response-loss model (§5); A2-PRE-02 context-command exact identity (§8); A2-PRE-03 invalidation×decision saga contradiction (§21); A2-PRE-04 historical-snapshot semantic-version coherence (§14/§17/§18); A2-PRE-05 DecisionRequest self-integrity (§19); A2-PRE-06 invalidation cycle algorithm (§23); A2-PRE-07 Prisma snapshot-FK model (§20). All A1/M3.5A module names are now **verified** against the accepted worktree (§3), and the document marks every place it distinguishes an **accepted semantic contract** from a **verified concrete repository/module name**.

**Accepted baselines (verified present at `C:/Users/piero/pagamenos-a1`, HEAD `7c0a3d9`):**
- M3.5A accepted implementation (decision persistence authority): `64cf864a817c137920204487ab3317bc6d4c9ba5`.
- M3.5B-A1 accepted implementation: `99f2d61bc45839d6f9506abee5fae641bfcd8b2e` (confirmed a commit; ACCEPTED, A1 CLOSED). Documentation-only child `7c0a3d9e0add34e4823c01f22c21542817dbc881` (current worktree HEAD; parent chain `7c0a3d9 → 99f2d61 → a0ef79a`) changes documentation only and does NOT replace the accepted implementation SHA.
- Accepted A1 design authority: `PAGAMENOS_M3_5B_A1_EFFECTIVE_SPEC_V2_1.md`.
- Failed historical prototype (evidence only, NOT authority): `1ded28d…` (Codex Sol: C — NO-GO). Its `PurchaseOccasion`/`ResearchContact`/`ValueVerification`/`consentBusinessKey`/lifted-scalar shapes are never reused.

**Conventions.** Instants zone-qualified (`America/Lima`); "trusted time" is sampled by the service from the system clock **under a stable row lock**, never caller-supplied. Money is provenance, never identity. Every A2 scientific table is append-only at the DB level (BEFORE UPDATE/DELETE/TRUNCATE triggers that `RAISE`), matching the accepted M3.5A/A1 convention (`prisma/migrations/*/migration.sql` immutability guards). "M3.5A §n" = accepted persistence contract markers; "A1 §n" = the V2.1 spec.

---

## 1. Executive A2 Design Summary

A2 answers exactly one question: **how does one trustworthy participant purchase intent become exactly one immutable decision request and exactly one matching immutable `DecisionSnapshot`, despite retries, concurrent calls, crashes, redeploys, engine/corpus version changes, intent correction/invalidation, and lost responses?**

Design chain, all additive over accepted M3.5A + A1:
1. **Immutable `PurchaseIntent` root** whose DB-assigned UUID `id` is the sole basis of decision identity — no caller/merchant/amount/session/time-bucket key ever exists.
2. **Exact capture identity** via a **server-issued, durably-persisted `PurchaseIntentCaptureToken`, idempotent on a client-held correlation nonce, immutably bound to the trusted assignment** (§5). This survives HTTP/app response loss and process restart, converges retries to one root, cannot be rebound across participants, and never collapses genuinely-distinct captures.
3. **Append-only `PurchaseIntentContextVersion`** with an exact **`contextCaptureKey`** command identity (`UNIQUE(intentId, contextCaptureKey)`, §8) so a different transport key cannot duplicate a scientific context version; **`PurchaseIntentFinalization`** pins exactly one context version.
4. **`businessDecisionKey = "pagamenos:study-intent-decision:v1:" + PurchaseIntent.id`** — structurally collision-free (closes R35R-04).
5. **`PurchaseIntentDecisionRequest`** freezes the exact validated `DecideInput` (normalized JSONB + `decideInputHash`) and pins the expected **engine-contract**, **corpus**, and **input-schema** versions before M3.5A ever runs; a retry rehydrates the frozen input through the versioned parser and re-verifies its hash (§13/§19/§22) — never reconstructing from mutable current state.
6. **Semantic pinning + coherence** (§14/§17): a snapshot may bind **only** if its stamped `engineContractVersion`/`corpusVersion`/`engineInputSchemaVersion` equal the request pins — whether found historically or freshly computed. Current runtime may differ from the historical snapshot's stamps only when repairing an already-existing snapshot; a fresh recompute is gated on current==pins and otherwise **fails closed**. A build-only (`gitSha`) change never blocks repair.
7. **`findExactHistoricalDecision`** — one narrow, additive, read-only M3.5A facade owning the full exact-match predicate (identity + semantic pins + integrity), returning `NONE | FOUND | CONFLICT` and never collapsing corrupted/partial state to `NONE` (§18/§26).
8. **`PurchaseIntentDecisionBinding`** — exact 1:1 intent↔snapshot, created only after the unified coherence predicate holds, immutable, surviving invalidation (§16/§17).
9. **State-sensitive crash-repair saga** `decideForPurchaseIntent({ intentId })` (§21): the engine reruns only on the genuinely-new path under matching semantics; invalidation is handled without any contradictory "must be effective" gate.

A2 is a **system-integrity** contract. `PurchaseIntent ≠ PurchaseOccasion ≠ denominator opportunity` (§38).

---

## 2. Scope / Non-Scope

**A2 authorizes exactly:** `PurchaseIntent` immutable root; `PurchaseIntentCaptureToken` (capture-identity infrastructure, §5); `PurchaseIntentContextVersion` (+ `contextCaptureKey`); `PurchaseIntentFinalization`; `PurchaseIntentInvalidation`; deterministic `businessDecisionKey`; `PurchaseIntentDecisionRequest` (frozen validated `DecideInput` + semantic pins); `PurchaseIntentDecisionBinding`; the narrow additive read-only `findExactHistoricalDecision` M3.5A facade; a narrow additive read-only A1 consent-facts facade (§7); the A2 concrete write receipts; the A2 capability boundary; A2-owned SCI invariants and adversarial tests; the additive Prisma models, migrations, AST/ESLint capability extensions, and services realizing the above.

**Explicitly OUT of scope (remain B/C):** `PurchaseOccasion`; occasion correction lineages; `ResearchContact`; `AuthMessage`; weekly reports; opportunity reconciliation; entry-source *adjudication*; aggregate/app overlap; `TransactionCorroboration`; `BaselineCorroboration`; `ValueVerification`; redeemed-benefit attribution; VS3/VS4; RIVSR; denominator bounds; `thresholdStatus`; C2 analysis bundles. A2 **persists** provenance (`entrySource`, `intentType`, `intendedTransactionAt`, timestamps) that B/C consume, but resolves no B/C semantics.

A2 does not reopen A1 (§27). A2 authorizes neither production Protocol v1 freeze, nor deploy, nor Wave 0 (§37).

---

## 3. Accepted Baseline Dependencies (VERIFIED)

Every module/type/function below was read in the accepted A1 worktree (`C:/Users/piero/pagamenos-a1`, HEAD `7c0a3d9`, containing `99f2d61`). Where a name is a **verified concrete** repository/module symbol it is marked *(verified)*; where A2 relies only on the **accepted semantic contract** it is marked *(contract)*.

### 3.1 M3.5A decision-persistence facts *(verified in the A1 worktree, unchanged from `64cf864`)*
- `DecisionSnapshot` (`decision_snapshot`), immutable/append-only: `id` UUID; `businessDecisionKey` **UNIQUE**; version stamps `snapshotSchemaVersion`/`engineInputSchemaVersion`/`engineOutputSchemaVersion`/`engineContractVersion`; `corpusVersion`; `merchantId`/`selectedScopeId`/`decisionStatus`; `evaluatedAt`/`intendedTransactionAt`; `engineInputJson`/`engineOutputJson` (JSONB); `inputHash`/`outputHash` (SHA-256 hex); `gitSha`/`buildId`; `createdAt`; back-relation `receipts DecisionIdempotencyReceipt[]`.
- `DecisionIdempotencyReceipt` (`decision_idempotency_receipt`), append-only: `operationScope`; `idempotencyKey`; `requestHash`; `decisionSnapshotId`; **UNIQUE(operationScope, idempotencyKey)**.
- Public surface *(verified, `src/services/index.ts`)*: `decideAndPersist(request: { input: DecideInput; businessDecisionKey: string; idempotencyKey: string })`, `loadDecisionSnapshot(id)`, `replayDecisionSnapshot(id)`, type `DecisionSnapshotDto`, and the typed persistence errors. `decideAndPersist` binds TRUSTED production deps (no injection publicly).
- FROZEN equivalence *(verified, `src/persistence/snapshot.ts` `computeRequestHash`, `hash.ts`, `canonical.ts`)*: `requestHash === DecisionSnapshot.inputHash === SHA-256(canonical(validated DecideInput))`; `businessDecisionKey` compared separately (`assertReceiptMatchesRequest`). `decideAndPersist` resolves an exact-retry receipt before any engine/corpus/build work; a business-key alias without recompute; and runs the engine only on the genuinely-new path.
- Repository read methods *(verified, `src/db/decision-snapshot-repository.ts`)*: `findReceipt(operationScope, idempotencyKey)`, `findSnapshotById(id)`, `findSnapshotByBusinessKey(businessDecisionKey)`; internal (capability-locked to `services/decide-and-persist.ts`).
- Semantic-version authorities *(verified, `src/persistence/versions.ts`, `src/persistence/provenance.ts`)*: `ENGINE_CONTRACT_VERSION = 'pagamenos.engine.m3.v1'`; `ENGINE_INPUT_SCHEMA_VERSION = 'pagamenos.engine-input.v1'`; `ENGINE_OUTPUT_SCHEMA_VERSION`; `SNAPSHOT_SCHEMA_VERSION`; `corpusVersion = loadCorpus().corpusId`; `gitSha`/`buildId` are **build** identity, not economic semantics. Canonicalization *(verified, `src/persistence/canonical.ts`)* is **frozen and non-versioned** — there is no canonicalization-version constant; its stability is tied to the payload-schema version constants (a change would bump those). The frozen input schema is `engineInputV1Schema` *(verified, `src/persistence/schema.ts`)*, decoded under version dispatch (`parseDecisionSnapshot`).

### 3.2 A1 facts A2 consumes *(verified in the A1 worktree)*
- Prisma models *(verified, `prisma/schema.prisma`)*: `RecruitmentSubjectIdentity`, `RecruitmentCredentialLink`, `StudyParticipant` (`recruitmentSubjectKey` UNIQUE, `participantCode` UNIQUE), `Experiment`, `ExperimentAssignment` (relations `experiment`/`participant`, `UNIQUE(experimentId, participantId)`), `StudyConsentEvent` (`UNIQUE(assignmentId, consentSeq)`), and the A1 receipt families. Prisma client/CLI **6.2.0** *(verified, `package.json`)*.
- Trusted participant context *(verified, `src/study/participant-context.ts`)*: `TrustedParticipantContext = { readonly participantId: string }`; validity = membership in a module-private `WeakSet` (unforgeable — a clone/cast/JSON round-trip is rejected). Creation primitive `createTrustedParticipantContext` is module-private, reachable only from the trusted session adapter and tests; public checker `isTrustedParticipantContext`.
- Trusted session adapter *(verified, `src/services/study-participant-session.ts`)*: `resolveTrustedParticipantContext({ authenticatedParticipantId })` — the ONLY sanctioned construction path; off-limits to participant-facing/app code (behind `@/services/study-admin`).
- Own-assignment binding *(verified, `src/services/study-consent.ts` + `src/db/study-consent-repository.ts`)*: `ConsentStore.findAssignmentParticipantId(assignmentId)` → owner `participantId`; a command is honored only if `owner === context.participantId` (`StudyAssignmentOwnershipError` on missing/mismatch, no existence leak).
- Pure consent contracts, exported publicly from `@/services` *(verified)*: `wasCollectionAuthorizedAtKnownTime({ events, collectionAt, asOfKnowledgeAt? })`, `deriveConsentAuthorizationIntervals(events)`, `effectiveConsentState(events)`, type `ConsentEventFact` (`{ consentSeq, action, consentVersion, privacyNoticeVersion, optionalEvidenceConsent, assertedEffectiveAt, capturedAt, recordedAt }`), type `AuthorizationInterval`. **These are PURE over `ConsentEventFact[]` and read nothing from the DB.**
- **Verified gap:** the consent events themselves are loaded only by the internal `ConsentStore.listEvents(assignmentId)` *(verified, `src/db/study-consent-repository.ts`)*, which is capability-locked to `services/study-consent.ts` (A1 module-capability owner map). There is **no** public "load my consent events" export. → A2 requires a narrow additive A1 read facade (§7).
- Request-hash discipline *(verified, `src/study/request-hash.ts`)*: `canonicalHash({ op, …material…, context })` with an `op` discriminator + resolved `TrustedContext` so one key can never acknowledge a materially different operation or another actor's request. A2 reuses this exact discipline.
- Capability enforcement *(verified, `eslint.config.mjs` + `src/lib/module-capability.test.ts`)*: ESLint `no-restricted-imports` groups `FORBIDDEN_WRITE_INTERNALS` / `FORBIDDEN_DEEP_SERVICE` / `FORBIDDEN_STUDY_ADMIN`; the AST test's `RAW_WRITE_MODULES` / `DEEP_SERVICE` sets **plus a per-repository owner-allowlist map** (e.g. `'db/study-consent-repository' → ['services/study-consent.ts']`, `'study/participant-context' → ['study/index.ts','services/study-participant-session.ts']`) and the fail-closed non-literal-`import()` rule. A2 extends these structures (§27/§36).

A2 references these; it does not duplicate their authority and does not alter A1/M3.5A stored shapes, migrations, or economic semantics (§20/§36).

---

## 4. PurchaseIntent — Immutable Root

```
PurchaseIntent {
  id                 PK UUID  DB-assigned (gen_random_uuid())   -- SOLE basis of decision identity
  assignmentId       FK → ExperimentAssignment (A1)             -- trusted population/consent anchor
  intentCaptureKey   UNIQUE                                     -- server-minted capture identity (§5)
  intentType         BUYING_NOW | BUYING_TODAY | CONSIDERING_LATER | EXPLORATORY   -- immutable initiation (Phase 0A §29)
  entrySource        DIRECT | CONTENT | SHARED_LINK | RESEARCH_LINK | AUTH_LINK | SAVED_DECISION | OTHER  -- provenance only; NOT adjudicated
  captureOrigin?                                                -- optional trusted provenance label
  initiatedAt        TIMESTAMPTZ trusted                         -- immutable initiation instant
  createdAt          TIMESTAMPTZ trusted
}
```
- `id` DB-assigned; `businessDecisionKey` (§11) is a pure function of it ⇒ two intents can never collide on one key; one intent's key is stable forever.
- `intentType`/`entrySource` are **immutable initiation** facts (Phase 0A §29): frozen at root creation, never in a context version. `entrySource` is stored **only as provenance**; A2 performs no entry-source adjudication and derives no PRECONTACT/independence from any caller boolean (that is B).
- `assignmentId` is the trusted A1 relationship; participant identity is reached only through it (own-assignment binding, §7).
- Append-only/immutable at the DB level (trigger). Corrigible context is a new context version before finalization; a materially different intent is a new root via invalidation/replacement (§10).

Field classification: identity = `id`/`assignmentId`/`intentCaptureKey`; immutable initiation = `intentType`/`entrySource`/`initiatedAt`; corrigible (→ context version) = merchant/amount/channel/`intendedTransactionAt`/basket.

Prisma relational note (§20): `assignmentId` requires, under Prisma 6.2.0, a virtual back-relation field `purchaseIntents PurchaseIntent[]` on A1's `ExperimentAssignment` — no SQL column, no A1 migration/stored/economic change.

---

## 5. Exact Capture Identity / Retry Semantics — A2-PRE-01 (ONE model)

**Transport idempotency is NOT scientific identity.** A2 fixes exactly ONE mechanistic capture-identity model:

> **Server-issued, durably-persisted capture token, idempotent on a client-held correlation nonce, immutably bound to the trusted assignment.**

Minimal capture-identity infrastructure:
```
PurchaseIntentCaptureToken {
  id                     PK UUID
  assignmentId           FK → ExperimentAssignment (A1)  -- TRUSTED binding, set from the trusted context; immutable
  clientCorrelationNonce                                  -- UNTRUSTED correlation material (client-chosen)
  intentCaptureKey       UNIQUE                           -- SERVER-minted opaque stable identity (gen_random_uuid); never client-chosen
  issuedAt               TIMESTAMPTZ trusted
  UNIQUE(assignmentId, clientCorrelationNonce)            -- makes issuance idempotent
}   -- append-only
```

Two operations (both behind a `TrustedParticipantContext`, §3.2):
- `issueIntentCaptureKey({ trustedParticipantContext, assignmentId, clientCorrelationNonce }) → { intentCaptureKey }`: verify `assignmentId` is the actor's own (via `findAssignmentParticipantId === context.participantId`); insert the token; on `UNIQUE(assignmentId, clientCorrelationNonce)` P2002, return the existing token's `intentCaptureKey` (idempotent issuance).
- `createPurchaseIntent({ trustedParticipantContext, intentCaptureKey, intentType, entrySource, idempotencyKey })`: resolve the token by `intentCaptureKey` (must exist); verify `token.assignmentId` is the actor's own; check A1 collection authorization at the internally-sampled `initiatedAt` (new collection, §7); insert `PurchaseIntent` with `assignmentId = token.assignmentId` and `intentCaptureKey` (`UNIQUE`); on `UNIQUE(intentCaptureKey)` P2002 reconcile to the existing intent.

**Trusted vs untrusted split:** `clientCorrelationNonce` is untrusted correlation material — it only makes issuance idempotent and grants no authority. `assignmentId` is the **trusted** binding, derived from the authenticated `participantId` in the trusted context at issuance. `intentCaptureKey` is **server-minted** (never client-chosen), so a client cannot forge a key that maps to another assignment.

**Response-loss / restart survival (the critical case):**
1. Client generates `clientCorrelationNonce` locally and persists it in its own durable draft state **before any call** — so it survives every server response loss (it was never dependent on a server response).
2. Client → `issueIntentCaptureKey(nonce)`. If the **response is lost**, the client retries with the **same** nonce → idempotent via `UNIQUE(assignmentId, clientCorrelationNonce)` → the **same** `intentCaptureKey` (server rows survive process restart; the token is durable). The client now holds `intentCaptureKey`.
3. Client → `createPurchaseIntent(intentCaptureKey)`. If **this** response is lost, the client retries — possibly with a **different transport idempotency key** — presenting the **same** `intentCaptureKey` it holds from step 2 → `UNIQUE(intentCaptureKey)` + P2002 reconcile → exactly **one** `PurchaseIntent`.
4. **Honest boundary:** if the client lost even the nonce (never retained anything), it starts fresh → new nonce → new key → new intent. A2 does **not** collapse this, because it is observationally indistinguishable from a genuinely new capture, and collapsing would be the unsafe behavior this section forbids. Exact-retry convergence requires the client to carry *some* stable correlation across attempts; the model above bottoms out at the client-held nonce, which is the minimum such carrier.

**Convergence matrix:**

| transport key | `intentCaptureKey` | Result |
| :-- | :-- | :-- |
| same | same | replay historical intent (create-receipt replay) |
| same | different | `PurchaseIntentCaptureConflictError` (one key cannot mean two captures) |
| different | same | same PurchaseIntent + **CAPTURE_ALIAS** create-receipt |
| different | different | two distinct roots |
| concurrent different keys | same | exactly one root (`UNIQUE(intentCaptureKey)` + P2002) |

**Non-collapse invariant:** two genuinely distinct captures with the same merchant / similar amount / similar time / same session / similar context carry **two** `intentCaptureKey` values ⇒ **two** roots. A2 dedup is exact-capture/retry correctness only; it never uses merchant/amount/time heuristics and never asserts multiple captures are one economic opportunity (B1/B2, §38).

**Ownership before an intent exists (verification is mechanically possible):** the `PurchaseIntentCaptureToken` row exists **before** any `PurchaseIntent`, so the own-assignment check runs against `token.assignmentId`. **Cross-participant attack:** participant A obtains/observes `CA`; participant B calls `createPurchaseIntent(CA)` → the token's `assignmentId` belongs to A; B's own-assignment check (`A ≠ B`) → `StudyAssignmentOwnershipError`, rejected. Neither B nor A can rebind `CA` to another assignment: the token is append-only and its `assignmentId` is fixed at issuance. Opacity is not relied upon — the binding is the authority.

---

## 6. Trusted Capture Provenance

R35R-06 requires initiation, finalization, correction, retry, and trusted entry provenance to stay separate:

| Concern | Where | Mutability |
| :-- | :-- | :-- |
| initiation | `PurchaseIntent` root (`assignmentId`, `intentType`, `entrySource`, `initiatedAt`, `intentCaptureKey`) | immutable |
| capture-identity issuance | `PurchaseIntentCaptureToken` | append-only |
| correction (pre-finalize context) | new `PurchaseIntentContextVersion` | append-only |
| finalization | `PurchaseIntentFinalization` | immutable |
| retry (transport) | the four receipt families (§24) | append-only |
| trusted entry provenance | root `entrySource`/`captureOrigin`; context fields | immutable per version |

A2 persists (authority Phase 0A §29; A1 anchor): trusted `ExperimentAssignment` (root FK); trusted participant/session identity (via the trusted context + `intentCaptureKey`, no PII); stable `intentCaptureKey`; `entrySource`(+`captureOrigin`); trusted `initiatedAt`; participant-entered `intendedTransactionAt` (context version); merchant/amount/channel/location (context version); `intentType` (root). A2 creates no `ResearchContact`, classifies no PRECONTACT from a caller boolean, and performs no B entry-source adjudication.

---

## 7. A1 Consent Boundary (+ additive A1 read facade)

**New participant collection** (A1 collection authorization required at internally-sampled trusted time): `createPurchaseIntent`, `appendPurchaseIntentContext`, `finalizePurchaseIntent`, `invalidatePurchaseIntent`. Each samples trusted time under the relevant lock and calls the A1 pure contract `wasCollectionAuthorizedAtKnownTime({ events, collectionAt, asOfKnowledgeAt })` over the actor's **already-recorded** consent events; a participant not authorized at that instant cannot create new capture through the participant path.

**Internal crash repair** (`decideForPurchaseIntent` completing DecisionRequest → snapshot → binding) is **NOT** new collection: it consumes facts already durably captured and authorized. A later withdrawal never (a) deletes a historical fact, (b) blocks internal completion of an already-durable DecisionRequest, or (c) retroactively invalidates a collection authorized when it occurred. "Current consent" is never a predicate that rewrites historical authority.

**Additive A1 read facade (required; verified gap, §3.2).** `wasCollectionAuthorizedAtKnownTime` is pure over `ConsentEventFact[]`, but no public export loads those events; `ConsentStore.listEvents(assignmentId)` is capability-locked to `services/study-consent.ts`. A2 therefore requires **one narrow, additive, read-only A1 facade**, analogous to the M3.5A finder:
```
readConsentAuthorizationFacts({ assignmentId }): Promise<ConsentEventFact[]>   // READ ONLY
```
- Added to the sanctioned A1 consent service file `src/services/study-consent.ts` (which already owns `study-consent-repository` and its `listEvents`), reusing `listEvents`. No raw consent repository is exposed; no A1 semantic change; append-only consent tables untouched.
- Exposed narrowly to the A2 services via the capability owner map (§27) — NOT re-exported to participant-facing/app code.
- Own-assignment enforcement is the **caller's** responsibility: A2 participant paths call it after own-assignment binding (via the trusted context); the A2 repair path calls it as trusted-internal over an already-established assignment. The facade itself performs no participant-facing authorization (it is a low-level read behind the capability).

Own-assignment binding for every A2 participant-facing op uses the verified A1 pattern (`findAssignmentParticipantId === context.participantId`); A2 never trusts a caller-supplied `participantId`/`assignmentId`.

---

## 8. Context Versioning — A2-PRE-02 (exact context-command identity)

```
PurchaseIntentContextVersion {
  id                 PK UUID
  intentId           FK → PurchaseIntent
  contextSeq         INT                     -- monotonic per intent, allocated under the PurchaseIntent root lock
  contextCaptureKey                          -- client-held correlation token identifying ONE context capture (§5-style)
  merchantId
  intendedTransactionAt   TIMESTAMPTZ?
  channel? / branch? / locationRef? / basketRef?
  amountCentimos?         -- non-negative integer; provenance, never identity
  capturedAt         TIMESTAMPTZ trusted      -- sampled under the root lock
  recordedAt         TIMESTAMPTZ              -- knowledge time
  capturedByContext                          -- trusted actor/session provenance (assignment-bound)
  UNIQUE(intentId, contextSeq)
  UNIQUE(intentId, contextCaptureKey)         -- exact context-command identity (A2-PRE-02)
}   -- append-only
```

**`contextCaptureKey`** is the exact domain identity of one context capture/update. Unlike the capture token (§5), it needs **no** separate issuance table: the parent `PurchaseIntent` already exists, so there is no "before the parent exists" problem — the intent owns the namespace. The client generates `contextCaptureKey` locally (a nonce), persists it in draft state, and reuses it on retry. Trust = own-intent binding (the append targets the actor's own intent); scope = `intentId` (so cross-intent reuse of the same string is a different, harmless `(intentId, contextCaptureKey)` pair). `contextSeq` is allocated under `SELECT … FOR UPDATE` on the parent `PurchaseIntent` row (the sole concurrency/order authority); `UNIQUE(intentId, contextSeq)` and `UNIQUE(intentId, contextCaptureKey)` are constraints, not the concurrency mechanism.

- A **material correction before finalization** is a new context capture (new `contextCaptureKey`) → new version; the earlier version remains.
- Historical context is never overwritten (append-only trigger).
- **After finalization, appends are rejected** (`PurchaseIntentContextAfterFinalizationError`): the intent is closed to further context; a genuine post-finalization change is a replacement root (§10). This keeps "which context decided" unambiguous and append-only — no future read re-selects context.

**Cross-intent reuse attack:** the same `contextCaptureKey` string under a different `intentId` is a distinct `(intentId, contextCaptureKey)` pair, and the append is only permitted on the actor's own intent — so it neither duplicates nor leaks.

### 8.1 Context retry matrix (A2 capture correctness, NOT B reconciliation)

| transport key | `contextCaptureKey` | Result |
| :-- | :-- | :-- |
| same | same | context-command receipt replay |
| same | different | `StudyIdempotencyConflictError` (one key cannot mean two context captures) |
| different | same | ONE `PurchaseIntentContextVersion` + **CONTEXT_ALIAS** receipt |
| different | different (genuinely separate captures) | distinct `PurchaseIntentContextVersion`s (even if merchant/amount/time payload is identical) |
| concurrent | same | exactly one version (`UNIQUE(intentId, contextCaptureKey)` + P2002) |

Field equality is never the context-capture identity — `contextCaptureKey` is.

---

## 9. Finalization

```
PurchaseIntentFinalization {
  id                 PK UUID
  intentId           UNIQUE FK → PurchaseIntent          -- one finalization per intent
  contextVersionId   FK → PurchaseIntentContextVersion   -- the EXACT pinned context (must belong to intentId)
  finalizedAt        TIMESTAMPTZ trusted
  finalizedByContext                                     -- trusted actor/session provenance
}   -- append-only
```

**§17 uniqueness rationale (resolved):** `contextVersionId` is **not** made globally UNIQUE. It would be redundant — each `PurchaseIntentContextVersion` belongs to exactly one intent (`FK intentId`) and each intent finalizes at most once (`UNIQUE(intentId)`), so the same context version can never be pinned by two finalizations under legitimate data, and no legitimate future history needs it constrained. The load-bearing invariants are `UNIQUE(intentId)` **+** the trigger `contextVersion.intentId == finalization.intentId` (cross-table ⇒ trigger, not CHECK, §28). Core preserved: **one intent → one finalization → one exact pinned context version.**

Contract:
- **Preconditions:** intent exists and is **effective** (not invalidated); ≥1 context version exists; A1 collection authorization holds at the internally-sampled `finalizedAt`; the selected `contextVersionId` belongs to `intentId`.
- **Pins the exact context version** explicitly; never dynamic "latest" on any future read.
- **Idempotency/concurrency:** `UNIQUE(intentId)` + root lock; a retry with the **same** `contextVersionId` replays; a retry with a **different** `contextVersionId` after finalization → `PurchaseIntentFinalizationConflictError`.
- **After invalidation:** rejected (`PurchaseIntentInvalidatedError`).
- **After finalization:** no further context append (§8); the finalized context is the frozen input to the DecisionRequest (§13).

---

## 10. Invalidation / Replacement

```
PurchaseIntentInvalidation {
  id                    PK UUID
  invalidatedIntentId   UNIQUE FK → PurchaseIntent    -- invalidated at most once
  replacementIntentId?  FK → PurchaseIntent           -- optional; a NEW root
  invalidatedAt         TIMESTAMPTZ trusted
  reasonCode?           -- typed enum (no free text as scientific input)
  invalidatedByContext
  CHECK (replacementIntentId IS NULL OR replacementIntentId <> invalidatedIntentId)   -- no self-link
}   -- append-only
```
Semantics:
- The invalidated intent and all its context/finalization/request/snapshot/binding remain historically present — never deleted.
- The invalidated intent is **scientifically non-effective** for future B/C (a derived property of the presence of an invalidation row; not a mutable flag).
- `replacementIntentId`, when present, is a **new** `PurchaseIntent` root in the **same `ExperimentAssignment`** (cross-row ⇒ trigger/transaction, §28), `<> invalidatedIntentId` (single-table CHECK), receiving its **own** `businessDecisionKey`/decision identity, never reusing the invalidated intent's context/finalization/request/snapshot/binding.
- Invalidation asserts no B-level opportunity identity — it is intent-replacement history only.
- A replacement is an ordinary root and may itself later be invalidated, forming a chain; cycle safety is specified in §23.

---

## 11. BusinessDecisionKey

```
businessDecisionKey = "pagamenos:study-intent-decision:v1:" + PurchaseIntent.id
```
No accepted-repository authority prescribes a different namespace (M3.5A enforces only uniqueness), so A2 fixes this literal. Same root ⇒ same key forever; replacement root ⇒ different key. Forbidden and structurally impossible: merchant-only / merchant+amount / session / timestamp-bucket / caller-provided keys — the public decision path (§18/§34) accepts no `businessDecisionKey`. Closes R35R-04 by construction.

---

## 12. PurchaseIntentDecisionRequest (+ input-schema pin)

```
PurchaseIntentDecisionRequest {
  id                             PK UUID
  intentId                       UNIQUE FK → PurchaseIntent
  finalizationId                 UNIQUE FK → PurchaseIntentFinalization

  decisionRequestSchemaVersion   -- A2 envelope version, "pagamenos.intent-decision-request.v1"

  exactValidatedDecideInputJson  JSONB   -- normalized validated DecideInput (semantic value; §13)
  decideInputHash                        -- SHA-256(canonical(...)) == M3.5A inputHash/requestHash

  expectedEngineInputSchemaVersion   -- == accepted ENGINE_INPUT_SCHEMA_VERSION at freeze (for rehydration, §22)
  expectedEngineContractVersion      -- == accepted ENGINE_CONTRACT_VERSION at freeze
  expectedCorpusVersion              -- == loadCorpus().corpusId at freeze

  businessDecisionKey            UNIQUE  -- derived (§11)
  m3_5aIdempotencyKey            UNIQUE  -- derived (§15)

  createdAt                      TIMESTAMPTZ trusted
}   -- append-only
```
Every column immutable. A2 pins the three semantic authorities it must compare (§14): `expectedEngineContractVersion`, `expectedCorpusVersion` (economic drift), and `expectedEngineInputSchemaVersion` (rehydration/reparse of the frozen input). A2 persists the **accepted M3.5A constant values** — it invents no duplicate versioning. `gitSha`/`buildId` are deliberately **not** pinned (build ≠ economic semantics; §14). Output/envelope structural versions are the snapshot's own self-description, re-verified by M3.5A on load — not pinned by A2.

---

## 13. Exact DecideInput Freezing

Mandatory ordering (freeze commits before M3.5A runs):
```
finalized effective PurchaseIntent
 → load exact finalized PurchaseIntentContextVersion (via PurchaseIntentFinalization.contextVersionId)
 → derive authoritative DecideInput:
      context   ← finalized context version;  portfolio ← participant's trusted portfolio (assignment-bound)
      rules/scopes/operationalStates ← trusted corpus (loadCorpus) for the merchant
      evaluatedAt ← trusted, sampled at freeze
 → validate against engineInputV1Schema (M3.5A frozen input contract)
 → assertCanonicalizable + canonicalize (M3.5A canonical.ts)
 → decideInputHash = SHA-256(canonical)
 → pin expectedEngineInputSchemaVersion / expectedEngineContractVersion / expectedCorpusVersion
 → persist immutable PurchaseIntentDecisionRequest → COMMIT
 → ONLY THEN may decideForPurchaseIntent proceed to M3.5A (§21/§22)
```

**JSONB clarification (A2-PRE-07 language fix):** `exactValidatedDecideInputJson` is the **persisted normalized semantic JSON value**, not a preserved textual byte string. PostgreSQL JSONB does not preserve text or key order, and it need not: the deterministic canonical serializer (M3.5A `canonical.ts`) produces stable bytes from the semantic value, and `decideInputHash` over those bytes is the integrity anchor. The invariant is **semantic**: the value reloaded from JSONB reparses (via the versioned parser, §22) into the exact validated `DecideInput`, and its recomputed canonical hash equals `decideInputHash` (which equals the M3.5A `inputHash`/`requestHash`). A retry **rehydrates the frozen input through the versioned parser and re-verifies the hash** — it never reconstructs the input from mutable current context/corpus/config.

---

## 14. Engine/Corpus Semantic Pinning (+ semantic-pin table) — A2-PRE-04

The request pins three semantic authorities. Two rules govern recompute vs binding:

- **Recompute gate (no historical snapshot, §21 Case B → NONE):** before calling `decideAndPersist`, **current runtime** economic semantics MUST equal the request pins:
  `loadCorpus().corpusId === expectedCorpusVersion` AND `ENGINE_CONTRACT_VERSION === expectedEngineContractVersion`. Else **FAIL CLOSED** (`PurchaseIntentSemanticDriftError`).
- **Historical-snapshot coherence (any bind, §17):** the **stamped** versions of the snapshot being bound MUST equal the request pins — **regardless of whether the snapshot is found historically or freshly computed**: `S.engineContractVersion === expectedEngineContractVersion`, `S.corpusVersion === expectedCorpusVersion`, `S.engineInputSchemaVersion === expectedEngineInputSchemaVersion`. CURRENT runtime may differ from the historical snapshot's stamps only when repairing an already-existing snapshot; the **historical snapshot itself may never differ from the request pins**.

**Why the historical stamps must match (A2-PRE-04 rationale):** the same `inputHash` can coincide across a corpus/label change (the corpus label bumps for reasons unrelated to this input's specific rules, yet the frozen input still passes M3.5A provenance under the new corpus and yields a snapshot stamped with the **new** `corpusVersion`/`engineContractVersion`). Binding such a snapshot to a request that pinned the old semantics would attribute a differently-authorized economic decision to this request. Therefore a matching-identity snapshot with mismatched stamped versions is a typed **CONFLICT** (fail closed), never `FOUND`, never `NONE`. `gitSha`/`buildId` are excluded from all comparisons — a redeploy that changes only the build (same economic + input-schema versions) still permits recompute and binding.

### 14.1 Semantic-pin table

| Authority (accepted constant) | Meaning | Persisted in A2 request | Blocks recompute drift? | Must == historical snapshot? |
| :-- | :-- | :-- | :-- | :-- |
| `ENGINE_CONTRACT_VERSION` | engine economic contract | `expectedEngineContractVersion` | **YES** | **YES** |
| `corpusVersion` (`corpusId`) | factual corpus label | `expectedCorpusVersion` | **YES** | **YES** |
| `ENGINE_INPUT_SCHEMA_VERSION` | frozen input payload schema (rehydration/reparse) | `expectedEngineInputSchemaVersion` | no (structural) — unsupported version ⇒ fail closed (§22) | **YES** (a differently-shaped input is not the same decision) |
| canonicalization | deterministic serializer | not versioned — **frozen** in accepted code (no version constant; tied to schema versions) | n/a | n/a (hash equality proves it) |
| `gitSha` / `buildId` | build / deployment identity | not pinned | **no** | **no** |
| `ENGINE_OUTPUT_SCHEMA_VERSION` / `SNAPSHOT_SCHEMA_VERSION` | output / envelope structural | not pinned by A2 | no | recorded; verified by M3.5A `verifyHistoricalSnapshot` on load |

A2 invents no version strings — it persists the accepted constants' values and compares them.

---

## 15. M3.5A Idempotency Identity

```
m3_5aIdempotencyKey = "pagamenos:study-intent-decision-idem:v1:" + PurchaseIntent.id
```
Derived internally; stable forever per intent; namespace-versioned; never a transport caller key; never regenerated per retry; distinct across intents. Passed to `decideAndPersist({ …, idempotencyKey })` under `operationScope = DECISION_PERSIST_V1`. Distinct namespace from `businessDecisionKey` so the two derived keys cannot be confused. Because A2 uses one deterministic key per intent, M3.5A's alias path is never exercised by A2 — exactly one `(businessDecisionKey, m3_5aIdempotencyKey)` pairing per intent, a tight coherence invariant the finder relies on (§18).

---

## 16. PurchaseIntentDecisionBinding

```
PurchaseIntentDecisionBinding {
  id                 PK UUID
  intentId           UNIQUE FK → PurchaseIntent
  decisionRequestId  UNIQUE FK → PurchaseIntentDecisionRequest
  snapshotId         UNIQUE   FK → decision_snapshot(id) (M3.5A) ON DELETE RESTRICT
  boundAt            TIMESTAMPTZ trusted
}   -- append-only
```
- One intent → at most one snapshot (`UNIQUE(intentId)`); one snapshot → at most one intent (`UNIQUE(snapshotId)`); `UNIQUE(decisionRequestId)` proves the binding is the one produced by *this* frozen request.
- Immutable; created only inside the sanctioned saga after the unified coherence predicate (§17); no public attach/bind.
- Historical bindings survive invalidation (§10/§21).
- The FK lives on the A2 side only; a Prisma-6 virtual back-relation is added to M3.5A `DecisionSnapshot` (§20) — no SQL column on `decision_snapshot`, no M3.5A migration/stored/economic change; snapshots are never deleted (`ON DELETE RESTRICT` + M3.5A immutability trigger).

---

## 17. Exact Snapshot Coherence — unified predicate (A2-PRE-04)

A binding is created **only** when, for DecisionRequest `R` and snapshot `S`, **all** hold (this is the single exact-match predicate used by both the finder, §18, and the saga, §21):

1. `S.businessDecisionKey === R.businessDecisionKey`.
2. an M3.5A receipt exists for `(DECISION_PERSIST_V1, R.m3_5aIdempotencyKey)`.
3. `receipt.decisionSnapshotId === S.id`.
4. `receipt.requestHash === R.decideInputHash`.
5. `S.inputHash === R.decideInputHash`.
6. `S.engineContractVersion === R.expectedEngineContractVersion`.
7. `S.corpusVersion === R.expectedCorpusVersion`.
8. `S.engineInputSchemaVersion === R.expectedEngineInputSchemaVersion`.
9. `verifyHistoricalSnapshot(S)` passes (M3.5A recompute-hash + column↔payload coherence).

CURRENT runtime versions need **not** equal `S`'s stamped versions when `S` already exists; clauses 6–8 compare `S`'s stamps to the **request pins**, which is the invariant that must always hold. **Same merchant / similar input / same amount/time is never sufficient.**

Typed fail-closed conflicts on partial mismatch (never bind, never proceed):
- `PurchaseIntentBindingBusinessKeyMismatchError` (1).
- `PurchaseIntentBindingReceiptMismatchError` (2/3/4).
- `PurchaseIntentBindingInputHashMismatchError` (5).
- `PurchaseIntentBindingSemanticMismatchError` (6/7/8) — a matching-identity snapshot with mismatched stamped economic/input-schema versions.
- M3.5A `SnapshotIntegrityError` / `SnapshotCoherenceError` (9).

---

## 18. findExactHistoricalDecision (owns the full predicate)

```
findExactHistoricalDecision({
  businessDecisionKey, idempotencyKey, inputHash,
  expectedEngineContractVersion, expectedCorpusVersion, expectedEngineInputSchemaVersion,
}): Promise<{ kind: 'NONE' } | { kind: 'FOUND'; snapshot: DecisionSnapshotDto }>   // else throws typed CONFLICT
```
**Authoritative split (A2-PRE-04 §9):** the finder OWNS the full exact-match predicate **including the semantic pins**; it returns `FOUND` only when clauses 1–9 (§17) all hold, `NONE` only when nothing exists for the identity and no conflicting partial state exists, and throws a typed CONFLICT otherwise. This keeps a single fail-closed authority; the repair service does not need a second version check before binding (it re-asserts §17 defensively but the finder has already fail-closed).

READ ONLY: no engine/corpus/provider/build invocation; no write; no arbitrary repository exposure. Uses the verified repository read methods `findReceipt`, `findSnapshotById`, `findSnapshotByBusinessKey` + `verifyHistoricalSnapshot`.

Algorithm:
1. `receipt = findReceipt(DECISION_PERSIST_V1, idempotencyKey)`; `snapByKey = findSnapshotByBusinessKey(businessDecisionKey)`.
2. **NONE** iff both are null (nothing exists; because A2 writes snapshot+receipt atomically via M3.5A `createDecision` under one deterministic key pair, no conflicting partial state can exist for this identity).
3. Else verify and return `FOUND` or throw:
   - `receipt` present: `S = findSnapshotById(receipt.decisionSnapshotId)`; missing ⇒ `PurchaseIntentHistoricalReceiptDanglingError`. Then assert clauses 1–9 (§17); any failure ⇒ its typed CONFLICT (incl. semantic-version mismatch ⇒ `PurchaseIntentHistoricalSemanticMismatchError`). Return `FOUND(S)`.
   - `receipt` null but `snapByKey` present: contradictory partial state ⇒ `PurchaseIntentHistoricalSnapshotWithoutReceiptError`.
   - `receipt` present but `snapByKey` present with a different `inputHash` than `inputHash` ⇒ `PurchaseIntentHistoricalBusinessKeyConflictError`.

---

## 19. DecisionRequest Self-Integrity Verification — A2-PRE-05

Append-only does not make a directly-inserted/corrupt row trustworthy. Every load of a `PurchaseIntentDecisionRequest` used for historical lookup, engine execution, binding, or crash repair MUST pass, fail-closed with no current-runtime fallback:
```
verifyPurchaseIntentDecisionRequest(request): VerifiedDecisionRequest   // service contract (reads a few parent rows)
```
Checks:
1. `request.intentId` exists (`PurchaseIntent`).
2. `request.finalizationId` exists and its `intentId === request.intentId`.
3. the finalization's pinned `contextVersionId` exists and its `intentId === request.intentId`.
4. `deriveBusinessDecisionKey(request.intentId) === request.businessDecisionKey` (§11).
5. `deriveM3_5aIdempotencyKey(request.intentId) === request.m3_5aIdempotencyKey` (§15).
6. `request.exactValidatedDecideInputJson` parses under the parser selected by `request.expectedEngineInputSchemaVersion` (§22); an unsupported version ⇒ `PurchaseIntentUnsupportedInputSchemaError` (fail closed).
7. `canonicalHash(parsed normalized input) === request.decideInputHash`.
8. `expectedEngineContractVersion` / `expectedCorpusVersion` / `expectedEngineInputSchemaVersion` are valid supported values.
9. `request.decisionRequestSchemaVersion` is a supported envelope version.

Checks 1–3 are cross-table (service verifier under a read transaction). Checks 4–9 are pure over the loaded row + `intentId`.

---

## 20. M3.5A Boundary / Capability (+ Prisma FK model) — A2-PRE-07

**Allowed M3.5A change (only):** narrowly expose `findExactHistoricalDecision` as an **additive, read-only** function in the sanctioned `src/services/decide-and-persist.ts` (the only file with raw decision-repo access), using existing read methods; **not** re-exported by the public barrel; reachable only by the A2 repair service (a new sanctioned impl, §36) and tests, via the capability owner map. No write path, no economic-semantic change, no migration mutation, no `DecisionSnapshot` mutability change, no engine change.

**Prisma snapshot FK (verified Prisma 6.2.0 ⇒ Option B).** Under Prisma 6.2.0 a relation field on one model **requires an opposite relation field** on the other. A2 therefore adds a **Prisma-only virtual back-relation field** on `DecisionSnapshot` — `purchaseIntentDecisionBinding PurchaseIntentDecisionBinding?` — and, symmetrically, `purchaseIntents PurchaseIntent[]` on A1's `ExperimentAssignment`. Each such field:
- generates **NO SQL column** on the accepted table (the FK scalar `snapshotId`/`assignmentId` lives on the A2 child table);
- changes **no** accepted stored row, **no** accepted migration SQL, **no** economic semantics;
- exists solely for Prisma relational completeness, keeping `prisma validate` and the migration↔schema diff (`pnpm db:migrate:check`) clean.

**SCI-A2-12 wording (updated accordingly):** "M3.5A untouched" / "A1 not reopened" means **no persisted/stored/economic/migration mutation** — it does **not** forbid a Prisma-only virtual relation field required by the ORM for relational completeness. This is stated explicitly to avoid an implementation-time surprise; Option A (a bare scalar with a hand-written FK unknown to Prisma) is rejected because it would surface as schema↔migration drift under this repo's explicit-migration + `db:migrate:check` discipline.

If A2 ever required a **semantic** M3.5A/A1 change rather than additive read access + a virtual relation field, this document would declare `A2 DESIGN BLOCKER` and stop. **No such blocker exists.**

---

## 21. Crash-Repair Saga — state-sensitive (A2-PRE-03 contradiction removed)

`decideForPurchaseIntent({ intentId })` — trusted internal op (PurchaseIntentDecisionCapability). No caller-provided input/engine/corpus/build/key/snapshotId. **There is no blanket "must be effective" gate.** The saga is state-sensitive:

**Step 0.** Resolve/authorize the caller; load intent + finalization + invalidation + request + binding state.

**Case A — binding exists.** Load binding → load+verify request (§19) → load `S` by `binding.snapshotId` → assert §17 → return `S`. **No engine call. Regardless of any later invalidation.** (Not new collection.)

**Case B — DecisionRequest exists, binding absent.** Load+verify the request (§19). `findExactHistoricalDecision(pins…)` (§18):
- **FOUND** → assert §17 (defensive) → create binding (§22/§29-concurrency) → return `S`. **No engine call. Invalidation state is irrelevant** — the request is already durable; completing it is internal repair (§7).
- **NONE** → recompute gate (§14): current economic semantics must equal pins, else fail closed. If equal → rehydrate frozen input (§22) → `decideAndPersist` → the returned `S` must satisfy §17 → bind → return `S`.
- **CONFLICT** → fail closed.

**Case C — DecisionRequest absent.** Under the `PurchaseIntent` root lock (§22): require **finalized AND NOT invalidated**; if invalidated → `PurchaseIntentInvalidatedError` (no new DecisionRequest, no engine); if finalized & effective → freeze/create exactly one DecisionRequest (§13) → COMMIT (release lock) → continue at **Case B**.

**The effectiveness gate applies ONLY to Case C** (creating a *new* request). Once a request exists (Cases A/B), effectiveness is irrelevant to completion — this removes the V1 contradiction where a blanket gate would have forbidden the permitted "invalidated-after-request internal completion" path.

### 21.1 Invalidation × decision state table (normative)

| State at entry | invalidated? | New DecisionRequest? | Historical finder? | Engine may run? | New participant collection? | Result |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| not finalized | any | no | no | no | no | `PurchaseIntentNotFinalizedError` |
| finalized, no request | no | **yes** (Case C) | then Case B | maybe (Case B) | no (internal freeze) | request created → decision |
| finalized, no request | **yes** | **no** | no | no | no | `PurchaseIntentInvalidatedError` |
| request, no snapshot | any | n/a | yes | yes iff NONE + semantics match | no (internal repair) | completes; root non-effective if invalidated |
| request, snapshot, no binding | any | n/a | yes (FOUND) | no | no | binding repaired; engine NOT rerun |
| binding exists | any | n/a | no | no | no | return historical binding |

**Rationale for "internal completion permitted after invalidation":** once the DecisionRequest is durably frozen, participant collection already occurred and completion is deterministic internal repair; blocking it would create an impossible half-state (a frozen request that can never resolve) and contradict crash-repair determinism. Invalidation makes the **root** non-effective for future B/C (derived), deletes nothing, and — via the shared root lock (§22) — deterministically prevents creating a *new* DecisionRequest once invalidation has committed.

---

## 22. Concurrency / Locking (+ lock hierarchy) & Input Rehydration

**Lock hierarchy (deadlock-free, item 14):** `ExperimentAssignment` **≺** `PurchaseIntent` root(s, in ascending UUID order) **≺** child rows. Any operation that must lock both acquires the assignment first, then roots in UUID order.
- **Context append / finalize / decideForPurchaseIntent Case-C freeze:** lock the `PurchaseIntent` root only (`SELECT … FOR UPDATE`). They never also grab the assignment while holding the root, so no inversion.
- **Invalidation:** locks `ExperimentAssignment` first (for the lineage/cycle walk, §23), then the `PurchaseIntent` root(s) in UUID order. Because decide/finalize/append lock only the root, they cannot hold the root while waiting on the assignment — so invalidation (assignment→root) and decide (root) can only contend on the **root** lock; no cycle.
- **DecisionRequest creation vs invalidation** serialize on the shared `PurchaseIntent` root lock: whichever holds it first determines whether a request comes into existence (§21 Case C). `UNIQUE(intentId)` on the request is defense-in-depth.
- **decideAndPersist** runs **outside** any A2 lock; M3.5A owns its atomic snapshot+receipt write and race reconciliation. Two concurrent Case-B→NONE calls both pass the same `(businessDecisionKey, m3_5aIdempotencyKey, input)` ⇒ M3.5A returns one snapshot to both; one binding wins (`UNIQUE(intentId)`/`UNIQUE(snapshotId)`), the other P2002-reconciles to it.
- **Binding** is a short transaction relying on `UNIQUE(intentId)` + `UNIQUE(snapshotId)` + P2002; a conflicting second binding to a materially-different snapshot fails closed (§17), never "first wins".

### 22.1 Decide/invalidate race (mechanical)
- invalidation wins before any request commit → invalidation durable → Case C refuses to create a request.
- request commit wins before invalidation → request durable; later invalidation does not delete it → internal completion follows §21.1. No ambiguous half-state (serialized on the root lock).

### 22.2 DecisionRequest → M3.5A input rehydration (no direct cast)
1. load immutable DecisionRequest; 2. `verifyPurchaseIntentDecisionRequest` (§19); 3. dispatch the versioned `DecideInput` parser by `expectedEngineInputSchemaVersion` (reusing M3.5A `engineInputV1Schema`; unsupported ⇒ fail closed); 4. produce the validated typed `DecideInput`; 5. recompute canonical hash; 6. compare to `decideInputHash`; 7. only then pass the typed input to `decideAndPersist`. **Never** cast JSONB directly to `DecideInput`; **never** reconstruct from the current context version.

---

## 23. Invalidation Cycle Prevention Algorithm — A2-PRE-06

Replacement chains must be acyclic. A single-table CHECK is insufficient across rows; a UNIQUE constraint alone is insufficient. Serialize the lineage on the **`ExperimentAssignment` row** (all replacements share one assignment):

```
invalidatePurchaseIntent({ trustedParticipantContext, intentId, replacementIntentId?, reasonCode? }):
  resolve own assignment A of intentId (own-assignment binding)
  BEGIN TX
    LOCK ExperimentAssignment A FOR UPDATE            -- lineage serialization point (top of hierarchy, §22)
    assert invalidatedIntent (intentId) belongs to A and is not already invalidated (UNIQUE guard + read)
    if replacementIntentId present:
      assert replacementIntentId belongs to A                 -- same-assignment rule
      assert replacementIntentId != intentId                  -- no self-link (also CHECK)
      -- Cycle check over the PROPOSED resulting graph (edges: invalidatedIntentId -> replacementIntentId):
      walk the existing replacement lineage; if intentId is reachable FROM replacementIntentId
        (i.e., adding edge intentId->replacementIntentId would close a cycle) -> reject PurchaseIntentInvalidationCycleError
      assert replacementIntentId is itself not already invalidated toward something that reaches intentId
    append PurchaseIntentInvalidation row
    append PurchaseIntentInvalidationReceipt
  COMMIT
```
Because the whole lineage for one assignment is walked and mutated only under that assignment's `FOR UPDATE` lock, concurrent invalidations on the same assignment are fully serialized — the second sees the first's committed edge and its cycle check is exact.

Covered attacks (all rejected): `A→A` (self, CHECK + walk); `A→B` then `B→A` (the second sees edge `A→B`, so `A` reachable from `B` → reject); `A→B→C` then `C→A` (walk finds `A` reachable from `C` via `A→B→C`... reject when adding `C→A`); concurrent `A→B` and `B→A` (serialized on the assignment lock; one commits, the other's walk now sees the committed edge → reject); longer concurrent cycles (same serialization). `UNIQUE(invalidatedIntentId)` additionally guarantees each root is invalidated at most once, bounding the lineage to a simple chain.

This is intent-replacement history only — **not** B opportunity lineage (§38).

---

## 24. A2 Receipt Architecture (+ resultKind semantics)

Concrete strong-FK receipt families for externally-triggered writes. Each: `operationScope` (constant), transport `idempotencyKey`, `requestHash` (§25), concrete target FK, `createdAt`, `UNIQUE(operationScope, idempotencyKey)`, append-only.

**`resultKind` semantics (item 16, aligned to the verified A1 pattern):** `resultKind` records the **durable effect of the command represented by this receipt row** — never "how this HTTP invocation returned". A **same-transport-key replay creates no new receipt** and does not change any `resultKind`; it returns the existing receipt plus a **transient** `replayed: true` in the result object (exactly A1's `ConsentCommandResult.replayed`). A **different-transport-key domain alias** *does* create a new receipt (a real new row) whose `resultKind` is the `*_ALIAS` value pointing at the already-existing target. Hence the smallest correct enums:

| Receipt | operationScope | Target FK | resultKind |
| :-- | :-- | :-- | :-- |
| PurchaseIntentCreateReceipt | INTENT_CREATE_V1 | intentId → PurchaseIntent | CREATED · CAPTURE_ALIAS |
| PurchaseIntentContextCommandReceipt | INTENT_CONTEXT_APPEND_V1 | contextVersionId → ContextVersion | APPENDED · CONTEXT_ALIAS |
| PurchaseIntentFinalizationReceipt | INTENT_FINALIZE_V1 | finalizationId → Finalization | FINALIZED · FINALIZE_ALIAS |
| PurchaseIntentInvalidationReceipt | INTENT_INVALIDATE_V1 | invalidationId → Invalidation | INVALIDATED · INVALIDATE_ALIAS |

There is **no** `REPLAYED` stored value (a same-key replay is a transient result flag, not a durable receipt state). Internal-only `PurchaseIntentDecisionRequest` and `PurchaseIntentDecisionBinding` get **no** transport receipt (§38-internal): their crash recovery is deterministic domain identity + UNIQUE constraints (`UNIQUE(intentId)` on both; `UNIQUE(snapshotId)`/`UNIQUE(decisionRequestId)` on binding; `businessDecisionKey`/`m3_5aIdempotencyKey` on request).

---

## 25. Request Hashes

Reusing the verified A1 discipline (`canonicalHash({ op, …material…, context })`, `src/study/request-hash.ts`): `requestHash = canonical(complete normalized MATERIAL caller request + stable trusted actor/context identity)`; excludes sampled/derived outputs (DB ids, trusted timestamps, sequences). A canonicalization/normalization version tag accompanies each family so a future format change is never silently conflated.

| Operation | Material identity (hashed), each + `op` discriminator + trusted `{participantId}` context |
| :-- | :-- |
| issueIntentCaptureKey | `assignmentId` (own), `clientCorrelationNonce` |
| createPurchaseIntent | `intentCaptureKey`, `intentType`, `entrySource` |
| appendPurchaseIntentContext | `intentId` (own), `contextCaptureKey`, context fields (merchant, intendedTransactionAt, channel, amount, branch, basketRef) |
| finalizePurchaseIntent | `intentId` (own), `contextVersionId` |
| invalidatePurchaseIntent | `intentId` (own), `replacementIntentId?`, `reasonCode?` (material) |

Same key + any material difference → typed conflict (`StudyIdempotencyConflictError` discipline). Different key + same domain identity → alias/replay if material matches, else typed domain conflict. Under a race, a caller requesting B never receives A. Including the trusted `{participantId}` context ensures one actor's key can never acknowledge another actor's request.

---

## 26. NONE vs CONFLICT (normative)

**NONE** (safe to consider engine execution iff semantics match, §14): no receipt for `(DECISION_PERSIST_V1, m3_5aIdempotencyKey)`, no snapshot for `businessDecisionKey`, no conflicting partial identity.

**CONFLICT / INTEGRITY (never collapse to NONE; always typed, fail closed):** business-key snapshot with `inputHash ≠ decideInputHash` (`…BusinessKeyConflictError`); receipt `requestHash ≠ decideInputHash` (`…ReceiptHashMismatchError`); receipt→missing snapshot (`…ReceiptDanglingError`); snapshot-under-key without receipt (`…SnapshotWithoutReceiptError`); **matching identity but stamped `engineContractVersion`/`corpusVersion`/`engineInputSchemaVersion` ≠ request pins** (`…HistoricalSemanticMismatchError`, A2-PRE-04); binding↔snapshot incoherence (`…BindingSemanticMismatchError`); M3.5A `SnapshotIntegrityError`/`SnapshotCoherenceError`.

---

## 27. Trusted Capability Matrix (verified A1 names)

A2 extends the verified A1 capability structures (§3.2). Concept → concrete module (all A2 modules are additions):

| A2 capability (concept) | A2 operation | Allowed importing module | Forbidden callers |
| :-- | :-- | :-- | :-- |
| PurchaseIntentCaptureCapability | issueIntentCaptureKey, createPurchaseIntent, appendPurchaseIntentContext | `services/study-purchase-intent.ts` (new sanctioned impl, behind trusted context) | app/participant-facing raw; other services |
| PurchaseIntentFinalizationCapability | finalizePurchaseIntent | `services/study-purchase-intent.ts` | same |
| PurchaseIntentAdministrationCapability | invalidatePurchaseIntent | `services/study-purchase-intent.ts` | same |
| PurchaseIntentDecisionCapability | decideForPurchaseIntent | `services/study-intent-decision.ts` (new sanctioned repair impl) | app/participant-facing; other services |
| HistoricalDecisionLookupCapability | findExactHistoricalDecision | `services/decide-and-persist.ts` (defines it) → imported ONLY by `services/study-intent-decision.ts` | everything else (incl. public barrel) |
| A1-ConsentFactsReadCapability | readConsentAuthorizationFacts | `services/study-consent.ts` (defines it, §7) → imported ONLY by `services/study-purchase-intent.ts` + `services/study-intent-decision.ts` | everything else |

Enforcement extensions (mirroring the verified A1 mechanism):
- ESLint `no-restricted-imports`: add the A2 raw repositories (`@/db/purchase-intent-repository`, `@/db/purchase-intent-decision-repository`) to `FORBIDDEN_WRITE_INTERNALS`; add the A2 deep services (`@/services/study-purchase-intent`, `@/services/study-intent-decision`) to a `FORBIDDEN_STUDY_ADMIN`-style group; add both new sanctioned impl files to the sanctioned-impl exemption list.
- AST module-capability test: extend `RAW_WRITE_MODULES` with the A2 raw repos; extend the **per-repository owner-allowlist map** with `'db/purchase-intent-repository' → ['services/study-purchase-intent.ts']`, `'db/purchase-intent-decision-repository' → ['services/study-intent-decision.ts']`; extend the service owner map so `findExactHistoricalDecision`'s deep module and `readConsentAuthorizationFacts` are importable only by their designated A2 callers.

Participant-facing code gains **no** raw snapshot/binding repository, no binding creation, no snapshot selection, no engine context, no `businessDecisionKey`/`m3_5aIdempotencyKey`/`snapshotId` control, and no arbitrary `participantId` authority (own-assignment only, via the verified WeakSet-validated `TrustedParticipantContext`).

---

## 28. Database Invariant Matrix

| A2 invariant | Enforcement |
| :-- | :-- |
| PurchaseIntent.id decision identity | PK UUID (DB-assigned) |
| capture-token issuance idempotent | UNIQUE(assignmentId, clientCorrelationNonce) + P2002 |
| capture-key uniqueness | UNIQUE(intentCaptureKey) on PurchaseIntent + P2002 |
| capture-key ownership (before intent exists) | service: token.assignmentId owner == context.participantId (§5) |
| capture token / PurchaseIntent immutable | append-only triggers |
| intentType/entrySource domain | CHECK (enum) |
| context version identity | UNIQUE(intentId, contextSeq) |
| **context-command exact identity** | **UNIQUE(intentId, contextCaptureKey)** (A2-PRE-02) |
| context monotonic seq; no overwrite | PurchaseIntent root lock + append-only trigger |
| context belongs to its intent | FK(intentId) |
| append after finalization rejected | service (finalization presence under root lock) |
| one finalization per intent | UNIQUE(intentId) on finalization |
| finalization pins one context of same intent | FK(contextVersionId) + trigger(contextVersion.intentId == finalization.intentId); (no redundant UNIQUE(contextVersionId), §9) |
| finalization after invalidation rejected | service (effective-status check under root lock) |
| businessDecisionKey from immutable id | pure derivation; UNIQUE on request |
| one DecisionRequest per intent | UNIQUE(intentId) on request + root lock |
| frozen input immutable / self-integrity | append-only trigger + `verifyPurchaseIntentDecisionRequest` service verifier (§19; cross-table checks not expressible as CHECK) |
| m3_5aIdempotencyKey stable/unique | pure derivation; UNIQUE on request |
| exact 1:1 binding | UNIQUE(intentId)+UNIQUE(snapshotId)+UNIQUE(decisionRequestId) + §17 verification in-tx |
| binding snapshot semantic coherence | service verification §17 (cross-table to M3.5A ⇒ service, not CHECK) |
| snapshot never cascade-deleted | FK snapshotId ON DELETE RESTRICT (A2 side) + M3.5A immutability trigger |
| invalidated at most once | UNIQUE(invalidatedIntentId) |
| no self-invalidation | single-table CHECK (replacementIntentId <> invalidatedIntentId) |
| replacement same assignment | trigger/transaction (cross-row) |
| **no invalidation cycles** | **transaction + recursive lineage walk under ExperimentAssignment FOR UPDATE (§23)** |
| receipt idempotency + resultKind | UNIQUE(operationScope, idempotencyKey) + concrete FK + enum |
| capability / own-assignment binding | AST owner-map + ESLint + trusted-context adapter (§27) |

No illegal cross-table CHECK is claimed; cross-table rules are triggers/transactions/service verification, marked as such.

---

## 29. A2 Entity Table

| Entity | PK | Domain identity | FKs | UNIQUE | CHECK | Behavior | Receipt | Capability owner |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| PurchaseIntentCaptureToken | id | intentCaptureKey | assignmentId→ExperimentAssignment | intentCaptureKey; (assignmentId, clientCorrelationNonce) | — | append-only | (issuance is idempotent; no separate receipt) | PurchaseIntentCapture |
| PurchaseIntent | id | id | assignmentId→ExperimentAssignment | intentCaptureKey | intentType∈enum; entrySource∈enum | append-only | PurchaseIntentCreateReceipt | PurchaseIntentCapture |
| PurchaseIntentContextVersion | id | (intentId, contextSeq) | intentId→PurchaseIntent | (intentId, contextSeq); (intentId, contextCaptureKey) | amountCentimos≥0 | append-only | PurchaseIntentContextCommandReceipt | PurchaseIntentCapture |
| PurchaseIntentFinalization | id | intentId | intentId→PurchaseIntent; contextVersionId→ContextVersion | intentId | — | append-only; +trigger(ctxVersion.intentId==intentId) | PurchaseIntentFinalizationReceipt | PurchaseIntentFinalization |
| PurchaseIntentInvalidation | id | invalidatedIntentId | invalidatedIntentId→PurchaseIntent; replacementIntentId?→PurchaseIntent | invalidatedIntentId | replacementIntentId<>invalidatedIntentId | append-only; +trigger(same assignment; §23 cycle) | PurchaseIntentInvalidationReceipt | PurchaseIntentAdministration |
| PurchaseIntentDecisionRequest | id | intentId | intentId→PurchaseIntent; finalizationId→Finalization | intentId; finalizationId; businessDecisionKey; m3_5aIdempotencyKey | — | append-only; self-verified (§19) | — (internal) | PurchaseIntentDecision |
| PurchaseIntentDecisionBinding | id | intentId | intentId→PurchaseIntent; decisionRequestId→Request; snapshotId→decision_snapshot RESTRICT | intentId; snapshotId; decisionRequestId | — | append-only | — (internal) | PurchaseIntentDecision |

Virtual Prisma back-relations added for relational completeness only (no SQL column): `ExperimentAssignment.purchaseIntents` (A1) and `DecisionSnapshot.purchaseIntentDecisionBinding` (M3.5A) — §20. Excluded (B/C): PurchaseOccasion, ResearchContact, weekly reports, ValueVerification, C2 models.

---

## 30. A2 Service Table

| Operation | Caller / trusted context | Public/Internal | Material input | Internally derived | Lock | Receipt | Errors |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| issueIntentCaptureKey | PurchaseIntentCapture (trusted ctx) | public (participant) | assignmentId(own), clientCorrelationNonce | intentCaptureKey, issuedAt | — (UNIQUE guard) | — (idempotent token) | not-own-assignment |
| createPurchaseIntent | PurchaseIntentCapture (trusted ctx) | public (participant) | intentCaptureKey, intentType, entrySource | assignmentId(from token), initiatedAt | UNIQUE guard | PurchaseIntentCreateReceipt | consent-not-authorized; capture conflict; not-own-assignment |
| appendPurchaseIntentContext | PurchaseIntentCapture (trusted ctx) | public (participant) | intentId(own), contextCaptureKey, context fields | contextSeq, capturedAt, recordedAt | PurchaseIntent root FOR UPDATE | PurchaseIntentContextCommandReceipt | consent-not-authorized; after-finalization; invalidated |
| finalizePurchaseIntent | PurchaseIntentFinalization (trusted ctx) | public (participant) | intentId(own), contextVersionId | finalizedAt | PurchaseIntent root FOR UPDATE | PurchaseIntentFinalizationReceipt | consent-not-authorized; invalidated; different-context conflict; no-context |
| invalidatePurchaseIntent | PurchaseIntentAdministration (trusted ctx) | public | intentId(own), replacementIntentId?, reasonCode? | invalidatedAt | Assignment FOR UPDATE → root(s) (§22/§23) | PurchaseIntentInvalidationReceipt | already-invalidated; self-link; cross-assignment; cycle |
| decideForPurchaseIntent | PurchaseIntentDecision (trusted internal) | internal | intentId | businessDecisionKey, m3_5aIdempotencyKey, frozen input, pins | root lock only for Case C freeze | — | not-finalized; invalidated (Case C); semantic-drift; historical CONFLICT; binding-coherence |
| findExactHistoricalDecision | HistoricalDecisionLookup (repair only) | internal (M3.5A facade) | businessDecisionKey, idempotencyKey, inputHash, 3 pins | — | read-only | — | typed CONFLICT/integrity (§26) |
| readConsentAuthorizationFacts | A1-ConsentFactsRead (A2 callers only) | internal (A1 facade) | assignmentId | — | read-only | — | — |

**No public** `attachSnapshot`, `bindSnapshot`, `createDecisionRequest(raw input)`, `findSnapshot(raw query)`.

---

## 31. Crash-Saga Table

| Durable facts at entry | invalidated? | Validity checks | Finder? | Engine may run? | Current==pins required? | Historical stamps==pins required? | Write | Retry result |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| finalized, no request | no | finalized, effective, consent@collection | no (Case C) | not yet | — | — | freeze+commit request | one request created |
| finalized, no request | **yes** | invalidated | no | no | — | — | none | `PurchaseIntentInvalidatedError` |
| request, no snapshot | any | verify request (§19) | yes (NONE) | yes iff NONE | **yes** (else fail closed) | n/a (fresh S must satisfy §17) | decideAndPersist → S+receipt (M3.5A atomic) → bind | one snapshot; bound; engine ran once |
| request, snapshot, no binding | any | verify request; finder FOUND | yes | **no** | no | **yes** (§17 clauses 6–8) | bind | binding repaired; engine NOT rerun |
| request, snapshot, binding | any | verify binding+§17 | no | no | no | yes | none | existing binding returned |
| request; matching identity but stamped versions ≠ pins | any | finder | — | no | — | mismatch | none | **CONFLICT** (`…HistoricalSemanticMismatchError`) |
| request, no snapshot; current economic drift | any | finder NONE | yes | **no** | mismatch | — | none | **fail closed** (`PurchaseIntentSemanticDriftError`) |
| request, no snapshot; build-only (gitSha) change | any | finder NONE | yes | yes | current==pins (build excluded) | n/a | decideAndPersist → bind | completes normally |
| concurrent decide calls | any | both verify request | yes | one rerun at most | yes | yes | M3.5A dedups to one S; one binding wins | both return coherent result |

No contradictory "effective" gate: effectiveness matters only where a *new* request would be created (rows 1–2).

---

## 32. Mandatory Adversarial Tests

**Capture response loss:** intent creation commits but the create response is lost; a different-transport-key retry presenting the already-held `intentCaptureKey` converges to one root. **Issuance response loss:** re-issue with the same `clientCorrelationNonce` returns the same key (one token). **Capture cross-participant:** A's `intentCaptureKey` used by B → `StudyAssignmentOwnershipError`. **Capture non-collapse:** two distinct captures (same merchant/amount/time) → two roots. **Capture conflict:** same transport key, different capture key → conflict.

**Context response loss:** append commits, response lost, retry with a different transport key + same `contextCaptureKey` → one `PurchaseIntentContextVersion` + alias receipt. **Context matrix (§8.1)** each row. **Context cross-intent reuse:** same `contextCaptureKey` under another intent → distinct harmless pair; append to a non-owned intent → rejected. **Context mutation:** DB trigger rejects. **Append after finalization:** rejected.

**Consent:** capture while authorized (success); capture after withdrawal via participant path (rejected); internal repair after withdrawal completes using existing frozen facts, no new collection, nothing deleted.

**Finalization:** concurrent (one); retry same context (replay); different context after finalize (conflict); finalize invalidated (rejected).

**Invalidation:** before finalization; after finalization; after request; after binding (history retained); replacement same/different assignment (accept/reject); self-link; `A→B` then `B→A`; `A→B→C` then `C→A`; concurrent `A→B`/`B→A` (never both commit).

**Business key:** same intent stable; different intents different; replacement different.

**DecisionRequest:** created once; frozen before engine; JSON/hash survives restart; caller cannot choose input/version/key/snapshotId. **DecisionRequest corruption (§19):** JSON/hash mismatch → fail closed before finder/engine; wrong derived business/idempotency key → fail closed; unsupported historical input-schema version → fail closed.

**Historical finder:** exact match FOUND; true NONE; business-key conflict; wrong idempotency; wrong input hash; receipt-without-snapshot; snapshot-without-receipt; **historical semantic mismatch** (same business key/idempotency/input hash but engine V2 or corpus C2 → CONFLICT, no binding); integrity failure.

**Crash saga:** before request commit; after request commit; after snapshot before binding; after binding before response — each converges, engine reruns only on the genuinely-new path.

**Version drift:** snapshot exists + runtime economic version changed → repair binding (no rerun, and only if the historical stamps still equal the pins); snapshot absent + runtime economic version changed → fail closed; build-only change → allowed.

**Binding:** second snapshot for one intent (reject); same snapshot for a second intent (reject); wrong business key/input hash/semantic stamps (reject); arbitrary caller cannot attach.

**Capability:** raw historical finder / consent-facts facade not generally importable; participant caller cannot mint internal decision identity or submit snapshotId/businessDecisionKey/engine context/DecideInput. **Prisma:** the schema (A2 models + virtual back-relations) passes `prisma validate` and the migration↔schema diff is clean.

---

## 33. A2 SCI Invariants

A2-local labels; the authoritative broader SCI register is not reopened (final numbering deferred to the register authority). Continuations of A1-owned entries are flagged.

- **SCI-A2-01 — Exact capture identity.** Server-issued token + client-held nonce; response-loss/restart converge to one root; distinct captures never collapse; cross-participant rebind impossible (§5).
- **SCI-A2-02 — Immutable context version history + exact context-command identity.** Append-only; monotonic seq under root lock; `UNIQUE(intentId, contextCaptureKey)`; no post-finalization append (§8).
- **SCI-A2-03 — One finalization pins one exact context** (§9).
- **SCI-A2-04 — businessDecisionKey from the immutable id** (closes R35R-04, §11).
- **SCI-A2-05 — Frozen DecisionRequest before M3.5A**, rehydrated via the versioned parser + hash re-verify; never reconstructed (§13/§22).
- **SCI-A2-06 — Semantic pinning.** Recompute fails closed on current economic drift; a bound snapshot's stamped engine/corpus/input-schema versions must equal the request pins whether found or freshly computed; build-only change never blocks (§14/§17).
- **SCI-A2-07 — Crash recovery without recomputation** (§18/§21/§31).
- **SCI-A2-08 — Exact 1:1 binding** after the unified coherence predicate; no public attach (§16/§17).
- **SCI-A2-09 — Invalidation history + acyclic replacement**; nothing deleted; replacement independent; no reuse (§10/§23).
- **SCI-A2-10 — DecisionRequest self-integrity**; fail closed with no runtime fallback (§19). *(new)*
- **SCI-A2-11 — Consent: new-collection vs internal-repair** (continues R35R-08 A2 obligation; §7).
- **SCI-A2-12 — Complete A2 transport-retry identity** (continues the A1 retry-identity entry / R35R-15; §24/§25).
- **SCI-A2-13 — M3.5A/A1 not mutated.** No persisted/stored/economic/migration change; a Prisma-only virtual relation field for relational completeness is permitted and is not a mutation (§20). *(supersedes V1 SCI-A2-12 wording)*

---

## 34. R35R Matrix (rechecked)

| Finding | A2 disposition | Basis |
| :-- | :-- | :-- |
| R35R-04 businessDecisionKey collision | **CLOSED BY A2 DESIGN** | §11 (pure function of immutable UUID) |
| R35R-05 no durable binding / crash repair | **CLOSED BY A2 DESIGN** | §16/§18/§21/§31 now contradiction-free (A2-PRE-03 removed; §21.1 normative) |
| R35R-06 intent identity/finalization/correction/provenance conflated | **CLOSED BY A2 DESIGN** | §4/§5/§6/§8/§9/§10 with mechanically-complete capture (§5) and context-command (§8) identities |
| R35R-10 A1 protocol/anchor | **A1 ALREADY CLOSED** | not reopened |
| R35R-11 A2 SCI normative | **CLOSED FOR A2-OWNED PORTION** | §33 |
| R35R-15 concrete idempotency receipts | **CLOSED FOR A2 WRITES** | §24/§25; different-transport-key context retries cannot duplicate a scientific version (`UNIQUE(intentId, contextCaptureKey)`, §8) |
| R35R-08 consent historical/temporal | A1 closed; **A2 obligation only** | §7 (new collection respects A1; internal repair preserves history) |
| R35R-19 eventCutoff/knowledgeCutoff | **DEFERRED NON-BLOCKING** | A2 preserves capturedAt/recordedAt/initiatedAt/intendedTransactionAt/finalizedAt/boundAt; as-of remains C2 |

No B/C finding claimed closed. No OPEN A2 BLOCKER.

---

## 35. Deferred Register

Production `AnalysisProtocol v1` freeze: **UNFROZEN** (A1 §3/§20). Wave 0: **NOT AUTHORIZED**. Deployment/production Protocol v1: not authorized. B/C semantics (occasion identity, reconciliation, entry-source adjudication, contamination, value/VS/RIVSR, denominator bounds, thresholdStatus, as-of/eventCutoff/knowledgeCutoff): deferred; A2 only persists the provenance/timestamps they consume (R35R-19). SCI register renumbering: deferred to the register authority (§33).

---

## 36. Implementability Against Accepted Repository (VERIFIED)

Validated against the accepted A1 worktree (`99f2d61`, doc child `7c0a3d9`) which contains the accepted M3.5A tables unchanged.
- **Additive Prisma models:** `PurchaseIntentCaptureToken`, `PurchaseIntent`, `PurchaseIntentContextVersion`, `PurchaseIntentFinalization`, `PurchaseIntentInvalidation`, `PurchaseIntentDecisionRequest`, `PurchaseIntentDecisionBinding`, and four receipt families. Two **virtual** back-relation fields on accepted models (`ExperimentAssignment.purchaseIntents`, `DecisionSnapshot.purchaseIntentDecisionBinding`) — no SQL column, no accepted migration/stored/economic change (§20), required by Prisma 6.2.0.
- **Migration triggers/checks:** per-table append-only triggers mirroring the accepted `*_forbid_mutation` guard; single-table CHECKs (enums, `replacementIntentId<>invalidatedIntentId`, `amountCentimos≥0`); cross-table triggers (finalization context-of-intent, replacement same-assignment); the §23 cycle serialization is service+transaction under the assignment lock (not a trigger). All UNIQUE indexes in §29. Guarded offline by `pnpm db:migrate:check`.
- **M3.5A read facade:** `findExactHistoricalDecision` additive in `src/services/decide-and-persist.ts`, read-only; not on the public barrel.
- **A1 read facade:** `readConsentAuthorizationFacts` additive in `src/services/study-consent.ts`, read-only, reusing `ConsentStore.listEvents`; not on the public barrel; no A1 semantic change.
- **A2 services:** `src/services/study-purchase-intent.ts` (capture/context/finalize/invalidate, behind the trusted context) and `src/services/study-intent-decision.ts` (decideForPurchaseIntent; imports the deep decision module + both facades). Added to the sanctioned-impl exemption lists like the A1 study impls.
- **A2 raw repositories:** `src/db/purchase-intent-repository.ts`, `src/db/purchase-intent-decision-repository.ts`; internal; added to `RAW_WRITE_MODULES` + the AST owner map (§27).
- **AST/ESLint:** extend the verified owner-allowlist map + ESLint groups (§27).
- **Expected test files:** A2 unit + integration suites covering §32; extension of `src/lib/module-capability.test.ts` probes for the new A2 raw/deep specifiers and both facades.

**No accepted A1/M3.5A stored/semantic table requires mutation.** No `A2 DESIGN BLOCKER`.

---

## 37. Exact Next Action

**STOP.** Submit this V2 for the **independent Codex Sol A2 design gate**, alongside accepted A1 V2.1 and the accepted repository. Do **not** implement, create Prisma models/migrations, expose either facade, or open a branch. `Production Protocol v1 = UNFROZEN`; `Wave 0 = NOT AUTHORIZED`.

---

## 38. No B-Level Opportunity Semantics

`PurchaseIntent ≠ PurchaseOccasion ≠ denominator opportunity`. A2's one-intent-one-decision identity is a **system-integrity** contract; it does not claim each intent is an independent behavioral opportunity. Later B reconciliation may map multiple A2 captures to one opportunity. A2 therefore computes **no** opportunity counts, independent sessions/occasions, aggregate overlap, or RIVSR denominator, and the invalidation lineage (§10/§23) is intent-replacement history only, never opportunity lineage.

---

# Final Verdict

## M3.5B-A2 EFFECTIVE DESIGN V2 READY FOR INDEPENDENT GATE

All pre-gate blockers are resolved without an architectural blocker:
- **A2-PRE-01** capture-identity response-loss — one exact model (server-issued token idempotent on a client-held nonce, immutably assignment-bound), with restart survival and cross-participant rejection (§5).
- **A2-PRE-02** context-command exact identity — `contextCaptureKey` + `UNIQUE(intentId, contextCaptureKey)`, full retry matrix, receipts, hashes, tests, invariants (§8/§24/§25/§28/§32).
- **A2-PRE-03** invalidation×decision saga — the blanket "effective" gate is removed; a state-sensitive saga + normative invalidation×decision table (§21/§21.1); deterministic decide/invalidate race on the shared root lock (§22.1).
- **A2-PRE-04** historical-snapshot semantic coherence — a bound snapshot's stamped engine/corpus/input-schema versions must equal the request pins whether found or freshly computed; mismatch is a typed CONFLICT (§14/§17/§18/§26).
- **A2-PRE-05** DecisionRequest self-integrity — `verifyPurchaseIntentDecisionRequest` fails closed on every load, with no runtime fallback (§19); frozen input rehydrated via the versioned parser + hash re-verify (§22).
- **A2-PRE-06** invalidation cycle algorithm — exact recursive lineage walk under the `ExperimentAssignment` lock with a defined lock hierarchy and concurrency contract (§23/§22).
- **A2-PRE-07** Prisma snapshot FK — Prisma 6.2.0 verified; Option B (virtual back-relation, no SQL column) with updated SCI-A2-13 wording (§20).

All A1/M3.5A module names are verified against the accepted worktree; the input-schema pin (`expectedEngineInputSchemaVersion`) and the semantic-pin table are added (§14); the additive A1 consent-facts read facade is specified as a required A1 read-only capability addition (§7) rather than an assumed public function; the JSONB "verbatim" language is corrected to a semantic/canonical-hash invariant (§13). No implementation is self-authorized — implementation GO remains the independent reviewer's to grant. **DESIGN ONLY.**

# PAGAMENOS — M3.5B-A1 CONSOLIDATED EFFECTIVE PRE-IMPLEMENTATION SPECIFICATION — V2.1

**Milestone:** M3.5B-A1 — Protocol / Experiment / Assignment / Consent Authority.
**Status:** design specification only. A1 not implemented. No code / Prisma / migrations / Git / commits / implementation / A2 / B/C / Wave 0.
**Nature:** self-contained replacement of `PAGAMENOS_M3_5B_A1_EFFECTIVE_SPEC_V2.md`. A reviewer or implementer needs **only this file** for A1; V2 (and all R.x / V1) are historical/superseded.

**Accepted implementation baseline:** `64cf864a817c137920204487ab3317bc6d4c9ba5` (M3.5A, accepted).
**Failed prototype (historical evidence only — NOT a baseline):** `1ded28d28038d4a385628683da096f846439a100` (Codex Sol: **C — NO-GO**).

Conventions: all instants zone-qualified (`America/Lima`); "trusted time" is sampled by the service from the system clock under the assignment row lock, never caller-supplied; money not used in A1. Every A1 scientific table is append-only at the DB level (BEFORE UPDATE/DELETE/TRUNCATE triggers that `RAISE`), except `AnalysisProtocol` (freeze-guarded, §2.2) and `Experiment` (immutable immediately after insert, §4.1).

**V2.1 change log (bounded, consent only):**
- **V2-A1-10** — `GRANT` no longer accepts or persists `assertedEffectiveAt`; a GRANT request bearing it is schema-rejected before receipt lookup; GRANTED rows carry `assertedEffectiveAt IS NULL` (CHECK).
- **V2-A1-11** — the V2 "same-instant rejection" is **removed**; a legal `GRANTED→WITHDRAWN` always appends, and the interval algorithm yields EMPTY when `closeAt ≤ startAt` (no valid withdrawal is rejected for a conservative close boundary at/before the grant start).
- **V2-A1-12** — `StudyConsentCommandReceipt` gains an explicit `resultKind` (`EVENT_APPENDED` / `NO_OP_EFFECTIVE_STATE` / `CORRECTION_NOT_APPLIED`), making replay independently interpretable.
No other V2 area is changed. Sections §1–§7, §11–§13, §20–§22 below are the effective V2 content carried forward verbatim in substance.

---

## 1. Scope

A1 authorizes implementation of exactly: `AnalysisProtocol` registration/canonicalization/freeze **infrastructure**; `Experiment`; `StudyParticipant` (stable recruitment subject identity); `ExperimentAssignment`; `StudyConsent` (append-only event stream + state machine + sequence-based authorization intervals + document provenance); the minimum trusted A1 capability boundary; A1 operation-specific idempotency receipts; A1-owned SCI invariants and adversarial tests. A1 does **not** implement PurchaseIntent, decision binding, PurchaseOccasion, ResearchContact, weekly reports, opportunity reconciliation, evidence/VerifiedValue, or RIVSR (§20). No B/C design is needed to judge A1 correctness.

---

## 2. AnalysisProtocol — Effective Final Contract

Single authoritative representation. **No lifted semantic scalar columns.**
```
AnalysisProtocol {
  id  PK ; protocolVersion UNIQUE ; definitionSchemaVersion ; canonicalizationVersion
  definitionJson ; definitionDigest (= sha256(canonical(definitionJson)))
  lifecycleStatus DRAFT|FROZEN ; frozenAt? ; createdAt trusted
}
```
Prohibited as separate authoritative columns: `contaminationWindowHours`, `minVerifiedLevel`, `minIndependentOccasions`, `minReconciledOpportunities`, `observationWindowWeeks`, entry-source sets, baseline-kind sets, any other semantic scalar. All semantics live in `definitionJson`; query/analysis parses the verified definition — eliminating JSON-vs-scalar-vs-hard-coded drift.

Responsibility split. **DB:** FK, `UNIQUE(protocolVersion)`, lifecycle state, freeze immutability, delete protection of FROZEN. **Service:** canonical parse (frozen local schema @`definitionSchemaVersion`), canonical serialization (@`canonicalizationVersion`), digest creation + verification. **Analysis:** re-verify (recompute digest from persisted `definitionJson`), **fail closed** on mismatch; no hard-coded runtime fallback.

### 2.1 Canonicalization pipeline
`trusted builder input → parse (frozen local schema @definitionSchemaVersion) → normalized definition → M3.5A-compatible canonical JSON (@canonicalizationVersion) → sha256 → digest → persist exact normalized JSON + digest + both version tags.` Analysis load: `load FROZEN → parse @its definitionSchemaVersion → canonicalize @its canonicalizationVersion → recompute digest → compare → FAIL CLOSED on mismatch`.

### 2.2 Registration / Freeze (exact)
`DRAFT → FROZEN`, one-way. `registerAnalysisProtocolDraft` = single INSERT of a complete DRAFT. **DRAFT editing is not provided**; a mistaken DRAFT is superseded by a new `protocolVersion`. `freezeAnalysisProtocol` = the **ONLY** permitted UPDATE: `lifecycleStatus: DRAFT→FROZEN` and `frozenAt: NULL→trusted timestamp`, **all other columns byte/semantically unchanged**; the freeze-guard trigger rejects any UPDATE altering any other column, rejects the transition unless the row is DRAFT, and after FROZEN rejects every UPDATE, every DELETE, and any lifecycle reversal. No "edit + freeze". A revision is a new version row.

---

## 3. Production Protocol v1 Deferral (normative)

A1 implements protocol **infrastructure** and may freeze **synthetic complete test protocols** in tests. A1 **MUST NOT** freeze/register the real production `AnalysisProtocol v1` as scientifically complete until the mandatory B/C protocol-authority semantics (opportunity-threshold uncertainty, missingness/withdrawal interpretation, PagaMenos value-attribution matrix, related B/C definitions) pass their own gates. Does not block A1 infrastructure.

---

## 4. Experiment — Final Contract

`recruitmentPolicy` is not present (removed in V2). No free-form field added.
```
Experiment { id PK ; experimentCode UNIQUE ; frozenProtocolId FK → AnalysisProtocol (FROZEN) ; createdAt trusted }
```
`frozenProtocolId` must reference a FROZEN protocol (FK + trigger). Exactly one protocol path: `assignment → experiment → frozen protocol`; no redundant protocol authority on `ExperimentAssignment`.

### 4.1 Experiment immutability — one rule
`Experiment` rows are append-only/immutable immediately after creation: no ordinary UPDATE/DELETE/TRUNCATE (BEFORE triggers `RAISE`). A revised experiment requires a new row/code via a future authorized workflow.

---

## 5. StudyParticipant — Stable Recruitment Subject Identity

A reissuable invitation/magic-link credential MUST NOT be the domain identity. Chain:
`invitation/magic-link/enrollment credential → trusted recruitment resolver (restricted boundary, outside study truth) → stable recruitmentSubjectKey → StudyParticipant`.
**Chosen model (one):** the trusted recruitment resolver maintains, inside the restricted recruitment/identity boundary (the access-controlled `IdentityMap` region holding `participantId ↔ email`, FINAL §30), a mapping from invitation credentials to a **stable, research-issued, pseudonymous `recruitmentSubjectKey`** issued once per recruited subject; reissued/rotated invites for the same subject resolve to the same key; distinct subjects → distinct keys; normalized under a frozen `recruitmentKeyVersion`. No crypto bytes prescribed.
```
StudyParticipant {
  id PK
  recruitmentSubjectKey UNIQUE   // stable pseudonymous domain identity; not a bearer secret; no PII; not participant-authored
  recruitmentKeyVersion
  participantCode UNIQUE          // opaque participant-facing pseudonym; generated AFTER dedup
  createdAt trusted
}
```
Three distinct identities: domain provisioning = `recruitmentSubjectKey` (UNIQUE, pre-creation dedup); public = `participantCode` (post-dedup); transport = `idempotencyKey` (in receipt). Raw email never stored in the study domain.

### 5.1 Participant retry / concurrency
| Case | Result |
| :-- | :-- |
| same transport key / same subjectKey | historical participant (replay) |
| same transport key / different subjectKey | `StudyIdempotencyConflictError` |
| different transport key / same subjectKey | same participant + alias receipt |
| different transport key / different subjectKey | distinct participants |
| concurrent different keys / same subjectKey | exactly one participant (`UNIQUE(recruitmentSubjectKey)` + P2002) |
| invite A → S → P; A expires; invite B for same S → register | **same P** |

---

## 6. registerStudyParticipant

```
registerStudyParticipant({ recruitmentCredential | recruitmentSubjectKey })   // RecruitmentProvisioningCapability only
```
Steps: (1) trusted resolver resolves credential → `recruitmentSubjectKey` + `recruitmentKeyVersion` (or validates a directly-supplied trusted key); (2) look up by `recruitmentSubjectKey`; (3) if absent, generate `participantCode` + trusted `createdAt`; (4) persist participant; (5) persist receipt; (6) exact/domain retry → historical participant.
```
StudyParticipantRegistrationReceipt { id ; operationScope=PARTICIPANT_REGISTER_V1 ; idempotencyKey ; requestHash ;
  participantId FK → StudyParticipant ; createdAt ; UNIQUE(operationScope, idempotencyKey) }
```
Material request hash uses the stable `recruitmentSubjectKey` + `recruitmentKeyVersion`, never a rotating invite token. Transport-key **and** credential rotation for the same subject converge to one participant.

---

## 7. ExperimentAssignment — Final Contract

```
ExperimentAssignment { id PK ; experimentId FK ; participantId FK ; enrolledAt trusted ;
  observationStartAt = enrolledAt ; createdAt trusted ; UNIQUE(experimentId, participantId) }
```
`enrolledAt` trusted; `observationStartAt = enrolledAt`; no caller anchor/window/protocol id. `observationEndAt` derived at analysis as `observationStartAt + frozenProtocol.observationWindowWeeks` (read from frozen `definitionJson`, never stored). Official population membership fact; immutable; **not deleted on withdrawal**. Anchor authority: participant-relative enrollment (Phase 0A; prototype; RT-11.F; FINAL §34).

---

## 8. Consent — Complete Final Contract (V2.1)

### 8.1 Event shape + provenance + nullability (V2-A1-10)
```
StudyConsentEvent {
  id
  assignmentId          FK → ExperimentAssignment
  consentSeq
  action                GRANTED | WITHDRAWN
  consentVersion        // GRANTED: NOT NULL ; WITHDRAWN: NULL
  privacyNoticeVersion  // GRANTED: NOT NULL ; WITHDRAWN: NULL
  optionalEvidenceConsent  boolean  // GRANTED: NOT NULL ; WITHDRAWN: NULL
  assertedEffectiveAt?  // GRANTED: MUST BE NULL ; WITHDRAWN: MAY BE NULL
  capturedAt            // trusted, sampled under the assignment row lock
  recordedAt            // knowledge time
  UNIQUE(assignmentId, consentSeq)
}
```
Provenance fields prove **what** was accepted (authority: FINAL §28; prototype §7), immutable. **A GRANTED row may never persist a caller-controlled asserted effective instant** — `assertedEffectiveAt IS NULL` on GRANTED is CHECK-enforced (§8.11). `assertedEffectiveAt` is meaningful only on WITHDRAWN, where it can narrow retrospective authorization (§8.6).

### 8.2 GRANT input has no assertedEffectiveAt (V2-A1-10)
```
recordConsentGrant({ trustedParticipantContext, consentPayload: { consentVersion, privacyNoticeVersion, optionalEvidenceConsent } })
```
There is **no `assertedEffectiveAt` field in the GRANT input.** A GRANT request containing it is rejected by **input/schema validation** — **before** idempotency-receipt lookup, consent-state evaluation, and any DB write (§8.10) — with a typed validation error (framework-appropriate; name not invented here). GRANT authorization opens only at trusted `capturedAt`.

### 8.3 States and transitions (no re-consent)
States (effective as-of): `NO_CONSENT`, `GRANTED`, `WITHDRAWN`. Only state-changing transitions append an event.

| Current → incoming | Requirement | Append? | resultKind | Result |
| :-- | :-- | :-- | :-- | :-- |
| NO_CONSENT → GRANT | valid GRANT input | yes | EVENT_APPENDED | append GRANTED |
| GRANTED → GRANT, exact same | full material-grant equality (§8.4) | no | NO_OP_EFFECTIVE_STATE | return effective GRANTED |
| GRANTED → GRANT, materially different | any material field differs | no | — | REJECT `StudyConsentUpdateNotSupportedError` |
| GRANTED → WITHDRAW | valid state transition | **yes (always)** | EVENT_APPENDED | append WITHDRAWN; interval per §8.6 |
| WITHDRAWN → WITHDRAW, exact same | — | no | NO_OP_EFFECTIVE_STATE | return effective WITHDRAWN |
| WITHDRAWN → WITHDRAW, changed/earlier assertion | — | no | CORRECTION_NOT_APPLIED | historical WITHDRAWN unchanged |
| WITHDRAWN → GRANT | — | no | — | REJECT `StudyConsentInvalidTransitionError` (no re-consent) |
| NO_CONSENT → WITHDRAW | — | no | — | REJECT `StudyConsentInvalidTransitionError` |

Re-consent is not in A1; there is no dormant public re-consent command.

### 8.4 Material-grant equality ("exact same grant")
Complete material GRANT identity is exactly:
```
trusted assignment identity ; consentVersion ; privacyNoticeVersion ; optionalEvidenceConsent ; stable trusted participant/context identity
```
There is **no GRANT `assertedEffectiveAt`.** A repeated GRANT is a no-op only when all those fields are equal; any provenance difference (`consentVersion` / `privacyNoticeVersion` / `optionalEvidenceConsent`) → `StudyConsentUpdateNotSupportedError`.

### 8.5 No-op / correction receipt target
`StudyConsentCommandReceipt.consentEventId` = the event representing the **durable result/effective state** associated with the command, **not** universally the event created by this command; `resultKind` distinguishes the cases (§8.9). Concrete FK, no nullable/polymorphic target. Exact repeated GRANT → effective GRANTED event; exact/changed repeated WITHDRAW → current effective WITHDRAWN event.

### 8.6 Temporal + authorization intervals (sequence-based; V2-A1-11)
Consent events are ordered by **`consentSeq`** within the assignment — **never** by asserted timestamps. Authorization intervals over the visible events:
- GRANT **G** opens at `startAt = G.capturedAt`.
- The next sequenced WITHDRAW **W** closes at `closeAt = min(W.capturedAt, W.assertedEffectiveAt ?? W.capturedAt)`.
- Result: `closeAt > startAt ⇒ [startAt, closeAt)` ; `closeAt ≤ startAt ⇒ EMPTY`.
- A backdated withdrawal never lets a grant "win" on effective-timestamp grounds — sequence decides which withdrawal resolves which open grant.

**A legal `GRANTED→WITHDRAWN` is always appended** after row-lock/sequence validation; the interval algorithm then decides the resulting interval. **No valid withdrawal is rejected merely because its conservative close boundary equals or precedes the grant start.** Specifically:
```
G.capturedAt=T10, W.closeAt=T10 → APPEND W → EMPTY interval (state = WITHDRAWN)   // NOT reject
G.capturedAt=T10, W.closeAt=T5  → APPEND W → EMPTY interval (state = WITHDRAWN)
```

### 8.7 Same-instant rule — REMOVED (V2-A1-11)
The V2 special same-instant rejection is **removed entirely** from A1. It has no independently necessary semantics: the only primary concurrency/order mechanism is **row serialization + `consentSeq`** (§8.10), and any legal sequenced `GRANTED→WITHDRAWN` (including one whose close boundary equals the grant start) must persist and resolve via §8.6. `StudyConsentConflictError` is removed; nothing in A1 may reject a valid sequenced transition on a timestamp-equality basis. (No genuinely different same-instant attack exists outside a valid sequenced transition; concurrent contradictory commands are serialized by the row lock and each re-evaluated against the then-current state.)

### 8.8 Collection-time authorization vs retrospective usability
Two distinct pure contracts, persisted-for but not conflated:
- `wasCollectionAuthorizedAtKnownTime(...)` — at collection time only already-recorded facts are known; a later-recorded withdrawal cannot retroactively prevent a collection that already occurred. (Consumed by A2+.)
- `deriveConsentAuthorizationIntervals(...)` — at later analysis, a late-recorded withdrawal with an earlier asserted instant may conservatively render part/all of a prior interval unusable. (Full C2 as-of deferred; A1 persists `capturedAt`, `assertedEffectiveAt?`, `recordedAt`, `consentSeq`.)
A1 must not use final/current consent to retroactively invalidate a validly-authorized collection, nor conflate "what the system knew at collection time" with "what retrospective facts allow analysis to retain."

### 8.9 Receipt resultKind (V2-A1-12)
`resultKind ∈ { EVENT_APPENDED, NO_OP_EFFECTIVE_STATE, CORRECTION_NOT_APPLIED }`:
- **EVENT_APPENDED** — the command created the referenced event.
- **NO_OP_EFFECTIVE_STATE** — no new event; receipt references the existing event representing the effective state (exact repeated GRANT; exact repeated WITHDRAW).
- **CORRECTION_NOT_APPLIED** — no new event; receipt references the current effective historical WITHDRAWN event; an incoming different withdrawal assertion was **not** applied.
This makes replay independently interpretable without re-deriving state.

### 8.10 Serialization (transaction; ordering correction V2-A1-10)
```
1  validate input schema / REJECT prohibited or malformed fields (e.g. assertedEffectiveAt on GRANT)   // BEFORE receipt lookup
2  resolve exact transport receipt if the request is valid (idempotent replay)
3  lock own ExperimentAssignment FOR UPDATE
4  reload effective consent state
5  evaluate state machine (incl. material-grant equality)
6  allocate consentSeq for a state-changing event
7  sample capturedAt under the lock
8  append StudyConsentEvent only if state-changing
9  append command receipt with resultKind (§8.9)
10 commit atomically
```
**Schema validation of prohibited/material input occurs before receipt lookup**, so an invalid GRANT can never replay an old valid receipt as success. Idempotency reconciliation applies only to a **valid** request.

### 8.11 CHECK constraints (single-table, legal) — V2-A1-10 / §16
```
CHECK (
  (action='GRANTED'
     AND consentVersion IS NOT NULL AND privacyNoticeVersion IS NOT NULL
     AND optionalEvidenceConsent IS NOT NULL AND assertedEffectiveAt IS NULL)
  OR
  (action='WITHDRAWN'
     AND consentVersion IS NULL AND privacyNoticeVersion IS NULL
     AND optionalEvidenceConsent IS NULL)      -- assertedEffectiveAt unconstrained (nullable)
)
```
Truth table:

| action | consentVersion | privacyNoticeVersion | optionalEvidenceConsent | assertedEffectiveAt | valid |
| :-- | :-- | :-- | :-- | :-- | :-- |
| GRANTED | NOT NULL | NOT NULL | NOT NULL | NULL | ✓ |
| GRANTED | any NULL | — | — | — | ✗ |
| GRANTED | — | — | — | NOT NULL | ✗ |
| WITHDRAWN | NULL | NULL | NULL | NULL or NOT NULL | ✓ |
| WITHDRAWN | any NOT NULL | — | — | — | ✗ |

Not relied on solely in service; enforced at the database.

### 8.12 Scientific vs transport identity
`scientific event identity = (assignmentId, consentSeq)`; `transport identity = (operationScope, idempotencyKey)`. `consentBusinessKey` does not exist. Because no-op transitions append nothing, a different transport key cannot manufacture a duplicate semantic event.

### 8.13 Repeated-withdrawal idempotency (state-machine exception; V2-A1-14 of brief)
| Case | Result |
| :-- | :-- |
| same key / same withdrawal payload | historical receipt replay |
| same key / different withdrawal payload | `StudyIdempotencyConflictError` (even if already WITHDRAWN) |
| different key / same withdrawal payload while WITHDRAWN | new receipt, `resultKind=NO_OP_EFFECTIVE_STATE`, `consentEventId=`current WITHDRAWN; no event appended |
| different key / materially different withdrawal payload while WITHDRAWN | new receipt, `resultKind=CORRECTION_NOT_APPLIED`, `consentEventId=`current WITHDRAWN; no event appended |

This explicit already-WITHDRAWN exception **supersedes** the generic "different-key / same-domain-identity / conflicting payload → domain conflict" rule (§10) **only** for the already-WITHDRAWN correction-not-supported case. It does not apply to any other operation.

---

## 9. A1 Receipt Architecture (concrete strong-FK families only)

No polymorphic `targetId`. Each: `operationScope` (internal constant), `idempotencyKey`, `requestHash`, concrete target FK, `createdAt`, `UNIQUE(operationScope, idempotencyKey)`; append-only. `StudyConsentCommandReceipt` additionally carries `resultKind` (§8.9).

| Receipt | operationScope | Target FK | Extra |
| :-- | :-- | :-- | :-- |
| AnalysisProtocolCommandReceipt | PROTOCOL_REGISTER_V1, PROTOCOL_FREEZE_V1 | analysisProtocolId → AnalysisProtocol | — |
| ExperimentCreateReceipt | EXPERIMENT_CREATE_V1 | experimentId → Experiment | — |
| StudyParticipantRegistrationReceipt | PARTICIPANT_REGISTER_V1 | participantId → StudyParticipant | — |
| ExperimentAssignmentReceipt | ASSIGN_PARTICIPANT_V1 | assignmentId → ExperimentAssignment | — |
| StudyConsentCommandReceipt | CONSENT_GRANT_V1, CONSENT_WITHDRAW_V1 | consentEventId → StudyConsentEvent (durable effective event, §8.5) | `resultKind ∈ {EVENT_APPENDED, NO_OP_EFFECTIVE_STATE, CORRECTION_NOT_APPLIED}` |

---

## 10. Request-Hash Contract

`requestHash = canonical(complete normalized MATERIAL caller request + stable trusted calling context)`. **Excludes** sampled/derived outputs: DB id, `createdAt`, `recordedAt`, `enrolledAt`, `participantCode`, `consentSeq`, `capturedAt`. Includes:
- **GRANT:** resolved own assignment identity, `consentVersion`, `privacyNoticeVersion`, `optionalEvidenceConsent`, stable trusted actor/context identity. **No `assertedEffectiveAt` exists to hash for GRANT.**
- **WITHDRAW:** resolved own assignment identity, `assertedEffectiveAt` **if present** (material — it can change retrospective authorization bounds), stable trusted actor/context identity.
- **registerStudyParticipant:** `recruitmentSubjectKey` + `recruitmentKeyVersion`.

Same idempotency key + any material difference → typed conflict. Different key + same domain identity → domain reconciliation (alias if payload matches, else typed domain conflict), except the already-WITHDRAWN case in §8.13. Under race a caller requesting B never receives A as success.

---

## 11. Operation-Specific Capability Matrix

Only the owning sanctioned module may invoke each write capability; raw repositories internal; participant-facing/app modules cannot import administrative writes. Enforced by extending the accepted AST module-capability test with operation-specific allowlists (no full authentication).

| Capability | Allowed operation(s) | Allowed importing module (concept) | Forbidden callers |
| :-- | :-- | :-- | :-- |
| ProtocolAdministrationCapability | registerAnalysisProtocolDraft, freezeAnalysisProtocol | protocol-admin service | app/participant-facing, other study services |
| ExperimentAdministrationCapability | createExperiment | experiment-admin service | app/participant-facing, other study services |
| RecruitmentProvisioningCapability | resolve/issue recruitmentSubjectKey, registerStudyParticipant | recruitment-provisioning service | app/participant-facing, other study services |
| AssignmentAdministrationCapability | assignParticipant | assignment-admin service | app/participant-facing, other study services |
| ParticipantConsentCapability | recordConsentGrant, recordConsentWithdrawal | participant-consent service (behind trusted participant context, §12) | admin modules, arbitrary app modules |

Raw `db` repositories/Prisma unreachable from arbitrary services (`src/db/index.ts` exports nothing). Engine/corpus byte-unchanged.

---

## 12. Own-Assignment Consent Binding

Consent operations MUST NOT trust an `assignmentId` from an arbitrary request. Surface: `recordConsentGrant({ trustedParticipantContext, consentPayload })`, `recordConsentWithdrawal({ trustedParticipantContext, withdrawPayload })`. A trusted participant actor/session context resolves the participant's **own** `ExperimentAssignment`; an opaque assignment reference is honored only if the trusted adapter verifies it matches the actor context. Full auth out of scope; trusted-context ownership binding required.

---

## 13. A1 Trust / Capability Model (summary)

Trusted research/system capabilities (§11) own protocol/experiment/recruitment/assignment writes and sample trusted timestamps. Participant-facing capability may only request consent for its **own** assignment (§12). Participant-facing code cannot mint `recruitmentSubjectKey`, `participantCode`, protocol definitions, experiment assignments, or trusted timestamps. Accepted M3.5A module-capability policy preserved.

---

## 14. A1-Owned SCI Invariants

**SCI-01 — Protocol single frozen authority.** *A1-owned: infrastructure.* One representation; analysis re-verifies fail-closed; freeze one-way; exact freeze-UPDATE (§2.2). Prohibited: lifted scalar authority; hard-coded fallback; mutated frozen row; freeze-UPDATE touching a non-lifecycle column. Attack: JSON/digest mismatch → fail closed; freeze-UPDATE altering `definitionJson` → rejected.

**SCI-02 — Assignment defines the official population.** *A1-owned: population identity.* Depends on **stable subject identity, not credential identity**: participants provisioned under a unique `recruitmentSubjectKey`, so credential/transport rotation cannot inflate the population. Enforce: `UNIQUE(recruitmentSubjectKey)`, `UNIQUE(experimentId, participantId)`, immutability triggers, resolver credential→subject mapping. Attack: invite-B-same-subject → same participant.

**SCI-03 — Observation window from frozen protocol.** *A1-owned: trusted anchor.* Window from frozen protocol; `enrolledAt` trusted. Attack: caller anchor/weeks rejected.

**SCI-04 — Consent deterministic + provenance + intervals + no re-consent (V2.1).** *A1-owned: full.* Now states: **GRANT has no asserted effective instant** (rejected on input; `assertedEffectiveAt IS NULL` on GRANTED); authorization **opens only at trusted `capturedAt`**; **withdrawal may carry `assertedEffectiveAt`**; events **ordered by `consentSeq`** (never asserted time); **a legal withdrawal always persists**; **`closeAt ≤ startAt` yields EMPTY** (never a rejection); **no special same-instant rejection overrides the interval algorithm**; **no re-consent**; **provenance immutable**. Enforce: row lock + seq; `UNIQUE(assignmentId, consentSeq)`; §8.11 CHECK; pure interval algorithm (§16). Attack: §17 consent regressions.

**SCI-21 — Complete retry identity (V2.1).** *A1-owned: A1 writes.* Now states: **no caller-controlled persisted GRANT field is omitted from request identity** (GRANT hashes all provenance; there is no GRANT asserted instant to omit); **prohibited GRANT fields are rejected before receipt resolution** (§8.10); **WITHDRAW `assertedEffectiveAt` is material and hashed**; **`resultKind` makes state-machine no-op/correction results auditable**; participant hash uses stable `recruitmentSubjectKey`+`recruitmentKeyVersion`. Attack: GRANT-with-forbidden-field before/after a valid receipt → rejected, not replayed; omitted-provenance retry → conflict.

**SCI-24 — M3.5A untouched.** *A1-owned: full.* No ALTER/mutation of `decision_snapshot`/`decision_idempotency_receipt`; engine/corpus byte-unchanged; boundary preserved; no polymorphic reuse of `DecisionIdempotencyReceipt`. Attack: engine/corpus diff non-empty → fail; boundary offender → fail.

*(Later SCI portions not reopened.)*

---

## 15. Final Consent State Table

| Current state | Incoming command | Payload relation | Valid? | Append event? | resultKind | Receipt target | Authorization effect | Result/error |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| NO_CONSENT | GRANT (valid) | — | yes | yes | EVENT_APPENDED | new GRANTED | opens `[capturedAt, …)` | success |
| NO_CONSENT | WITHDRAW | — | no | no | — | — | none | `StudyConsentInvalidTransitionError` |
| GRANTED | GRANT | exact same material | yes | no | NO_OP_EFFECTIVE_STATE | effective GRANTED | unchanged | no-op success |
| GRANTED | GRANT | materially different | no | no | — | — | unchanged | `StudyConsentUpdateNotSupportedError` |
| GRANTED | WITHDRAW | — | yes | **yes (always)** | EVENT_APPENDED | new WITHDRAWN | closes interval (§8.6; EMPTY if `closeAt≤startAt`) | success |
| WITHDRAWN | GRANT | — | no | no | — | — | unchanged | `StudyConsentInvalidTransitionError` |
| WITHDRAWN | WITHDRAW | exact same | yes | no | NO_OP_EFFECTIVE_STATE | effective WITHDRAWN | unchanged | no-op success |
| WITHDRAWN | WITHDRAW | changed/earlier assertion | yes | no | CORRECTION_NOT_APPLIED | effective WITHDRAWN | unchanged (never widened) | correction-not-applied |

GRANT input bearing `assertedEffectiveAt` never reaches this table — rejected at schema validation (§8.2/§8.10).

---

## 16. Authorization-Interval Pseudocode (pure, normative)

```
deriveAuthorizationIntervals(events):        // restricted to the visible set (as-of, C2)
  ordered = events sorted by consentSeq       // NEVER by assertedEffectiveAt
  openGrant = null ; intervals = []
  for e in ordered:
    if e.action == GRANTED:
      if openGrant != null: fail closed        // impossible after §8.3 validation (no re-consent)
      openGrant = e
    else: /* WITHDRAWN */
      if openGrant == null: fail closed
      closeAt = min(e.capturedAt, e.assertedEffectiveAt ?? e.capturedAt)
      startAt = openGrant.capturedAt
      intervals.push( closeAt > startAt ? [startAt, closeAt) : EMPTY )
      openGrant = null
  if openGrant != null: intervals.push([openGrant.capturedAt, +inf))
  return intervals
```

---

## 17. A1 Adversarial Regressions (expected results)

**GRANT / provenance / assertedEffectiveAt:**
- GRANT with forbidden `assertedEffectiveAt` → validation rejection **before** receipt lookup.
- valid GRANT K, then retry same K with forbidden `assertedEffectiveAt` → validation rejection (**not** historical receipt replay).
- GRANT K provenance A, then same K provenance B → `StudyIdempotencyConflictError`.
- GRANTED missing `consentVersion`/`privacyNoticeVersion`/`optionalEvidenceConsent` → reject (CHECK + schema).
- exact repeated GRANT → no-op, `NO_OP_EFFECTIVE_STATE`.
- changed `consentVersion`/`optionalEvidenceConsent` while GRANTED → `StudyConsentUpdateNotSupportedError`.
- attempt to persist a GRANTED row with non-NULL `assertedEffectiveAt` → CHECK violation.

**Withdrawal / intervals:**
- `WITHDRAWN→GRANT` → reject.
- G captured T10 / W captured T30 asserted T20 → `[T10,T20)`.
- G captured T10 / W captured T30 asserted T5 → **append W**, EMPTY interval, state WITHDRAWN (**not** rejected).
- G captured T10 / W closeAt T10 → **append W**, EMPTY interval (**not** rejected).
- G captured T10 / W asserted NULL captured T30 → `[T10,T30)`.
- exact repeated WITHDRAW (diff key) → `NO_OP_EFFECTIVE_STATE`.
- changed/earlier repeated WITHDRAW → `CORRECTION_NOT_APPLIED`, no correction applied.
- same key / different withdrawal payload → `StudyIdempotencyConflictError`.

**Recruitment:** invite A → S → P; invite B for same S → same key → same P; concurrent two credentials same S → one P; different subjects → distinct; `participantCode` caller-chosen → rejected.
**Capability:** participant-facing module calls `registerStudyParticipant` → boundary test fail; participant supplies another user's `assignmentId` for consent → rejected by trusted-context ownership check.
**Experiment:** `createExperiment` with `recruitmentPolicy` field → field does not exist; `Experiment` UPDATE → rejected.
**Protocol:** freeze-UPDATE changing `definitionJson`+status → rejected; freeze-UPDATE changing only lifecycle+`frozenAt` → allowed; frozen UPDATE/DELETE → rejected; experiment → DRAFT protocol → rejected.
**Assignment:** duplicate assignment → one row; caller anchor/weeks → rejected; assignment UPDATE/DELETE/TRUNCATE → rejected.
**Concurrency:** concurrent consent transitions → serialized by row lock + seq; each re-evaluated against then-current state (no timestamp-equality rejection).

---

## 18. Database Implementability Table

| A1 invariant | Enforcement |
| :-- | :-- |
| protocolVersion unique | UNIQUE |
| experiment → FROZEN protocol | FK + trigger |
| freeze one-way; only lifecycle+frozenAt UPDATE; frozen immutable; no delete | trigger (freeze-guard) |
| protocol digest = canonical(definition) | service (create) + analysis re-verify (fail closed) |
| experiment immutable immediately | trigger |
| participant recruitment dedup | UNIQUE(recruitmentSubjectKey) + P2002 |
| participantCode unique/opaque/system-issued | UNIQUE + service issuance |
| assignment population uniqueness | UNIQUE(experimentId, participantId) |
| assignment immutable; no delete on withdrawal | trigger |
| trusted enrolledAt/observationStartAt | service (trusted clock) |
| consent event identity | UNIQUE(assignmentId, consentSeq) |
| **consent provenance + GRANTED assertedEffectiveAt NULL** | **single-table CHECK (§8.11)** |
| consent serialization; schema-validate-before-receipt | row lock FOR UPDATE + transaction + service ordering |
| consent transition legality; material-grant equality; no re-consent; no-op no-append; resultKind | service validation (state machine) |
| **legal withdrawal always persists; EMPTY not rejection** | **service (no same-instant rejection) + pure interval algorithm** |
| consent append-only | trigger |
| receipt idempotency + resultKind | UNIQUE(operationScope, idempotencyKey) + concrete FK + enum |
| capability/module boundary + own-assignment ownership | module-capability AST test + trusted-context adapter |
| authorization intervals / collection authorization | pure derivation |

No cross-table CHECK is claimed where PostgreSQL cannot legally subquery (those are triggers). Consent nullability/GRANTED-asserted-NULL is a legal single-table CHECK.

---

## 19. Effective A1 Service Table

| Operation | Capability / trusted context | Caller material input | Internally-derived | Domain identity | Receipt / hash | Transaction / lock | Failure modes |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| registerAnalysisProtocolDraft | ProtocolAdmin | builder definition, protocolVersion | normalized JSON, digest, version tags | protocolVersion | AnalysisProtocolCommandReceipt (REGISTER) | insert | invalid definition; duplicate version |
| freezeAnalysisProtocol | ProtocolAdmin | protocolId | frozenAt | — | AnalysisProtocolCommandReceipt (FREEZE) | freeze-guard UPDATE (lifecycle+frozenAt only) | already frozen; other column changed; digest mismatch |
| createExperiment | ExperimentAdmin | experimentCode, frozenProtocolId | — | experimentCode | ExperimentCreateReceipt | insert | protocol not FROZEN; duplicate code |
| registerStudyParticipant | RecruitmentProvisioning | recruitmentCredential / recruitmentSubjectKey | recruitmentSubjectKey, recruitmentKeyVersion, participantCode, createdAt | recruitmentSubjectKey | StudyParticipantRegistrationReceipt | insert (unique guard) | untrusted/unresolvable credential; conflict on key/different payload |
| assignParticipant | AssignmentAdmin | experimentId, participantId | enrolledAt, observationStartAt | (experimentId, participantId) | ExperimentAssignmentReceipt | insert (unique guard) | unknown experiment/participant; duplicate; caller anchor/weeks rejected |
| recordConsentGrant | ParticipantConsent (trusted context) | consentPayload {consentVersion, privacyNoticeVersion, optionalEvidenceConsent} | own assignment (resolved), capturedAt, consentSeq | (assignmentId, consentSeq) | StudyConsentCommandReceipt (GRANT, resultKind); GRANT hash §10 | validate-before-receipt; lock assignment FOR UPDATE; state-machine eval | forbidden `assertedEffectiveAt` on input; not own assignment; materially-different grant; missing provenance |
| recordConsentWithdrawal | ParticipantConsent (trusted context) | withdrawPayload {assertedEffectiveAt?} | own assignment (resolved), capturedAt, consentSeq | (assignmentId, consentSeq) | StudyConsentCommandReceipt (WITHDRAW, resultKind); WITHDRAW hash §10 | validate-before-receipt; lock assignment FOR UPDATE; state-machine eval | `StudyConsentInvalidTransitionError` (NO_CONSENT→WITHDRAW); changed-assertion → CORRECTION_NOT_APPLIED |
| loadFrozenProtocolForAnalysis | analysis | protocolId/version | recomputed digest | — | — | read only | not FROZEN; digest mismatch → fail closed |

No consent operation rejects a legal `GRANTED→WITHDRAWN` on a same-instant/timestamp-equality basis.

---

## 20. Non-A1 Contracts / Deferred Boundaries

**A2/B/C are NOT authorized by this document.** Production `AnalysisProtocol v1` remains **unfrozen** (§3). A2 (PurchaseIntent lifecycle, decision request/binding), B (opportunity/occasion identity, reconciliation), C (evidence/attribution, VS/RIVSR/as-of) are not implemented and not A1 tables. **PurchaseIntent count is not an opportunity/denominator count.** A1 defines `wasCollectionAuthorizedAtKnownTime` / `deriveConsentAuthorizationIntervals` (§8.8) and persists the data C2 needs, without implementing as-of analysis.

---

## 21. Effective A1 Entity Table (implementation-authorized; no A2/B/C models)

| Entity | PK | Domain identity | FKs | UNIQUE | CHECK | Immutable/freeze | Timestamps | Receipt relation |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| AnalysisProtocol | id | protocolVersion | — | protocolVersion | lifecycleStatus∈{DRAFT,FROZEN} | freeze-guard (only lifecycle+frozenAt UPDATE; frozen immutable; no delete) | createdAt, frozenAt? | AnalysisProtocolCommandReceipt |
| Experiment | id | experimentCode | frozenProtocolId→AnalysisProtocol | experimentCode | — | immutable immediately | createdAt | ExperimentCreateReceipt |
| StudyParticipant | id | recruitmentSubjectKey | — | recruitmentSubjectKey; participantCode | no PII | append-only | createdAt | StudyParticipantRegistrationReceipt |
| ExperimentAssignment | id | (experimentId, participantId) | experimentId, participantId | (experimentId, participantId) | — | UPD/DEL/TRUNC denied | enrolledAt, observationStartAt, createdAt | ExperimentAssignmentReceipt |
| StudyConsentEvent | id | (assignmentId, consentSeq) | assignmentId | (assignmentId, consentSeq) | §8.11 (action↔provenance↔assertedEffectiveAt) | append-only | capturedAt, recordedAt | StudyConsentCommandReceipt |
| AnalysisProtocolCommandReceipt | id | (operationScope, idempotencyKey) | analysisProtocolId | (operationScope, idempotencyKey) | scope∈{REGISTER,FREEZE} | append-only | createdAt | — |
| ExperimentCreateReceipt | id | (operationScope, idempotencyKey) | experimentId | (operationScope, idempotencyKey) | — | append-only | createdAt | — |
| StudyParticipantRegistrationReceipt | id | (operationScope, idempotencyKey) | participantId | (operationScope, idempotencyKey) | — | append-only | createdAt | — |
| ExperimentAssignmentReceipt | id | (operationScope, idempotencyKey) | assignmentId | (operationScope, idempotencyKey) | — | append-only | createdAt | — |
| StudyConsentCommandReceipt | id | (operationScope, idempotencyKey) | consentEventId | (operationScope, idempotencyKey) | scope∈{GRANT,WITHDRAW}; resultKind∈{EVENT_APPENDED,NO_OP_EFFECTIVE_STATE,CORRECTION_NOT_APPLIED} | append-only | createdAt | — |

---

## 22. Finding Closure

| Finding | Status | Where |
| :-- | :-- | :-- |
| V2-A1-10 GRANT accepts/persists asserted effective while excluding it from identity | **CLOSED IN V2.1** | §8.1, §8.2, §8.4, §8.10, §8.11, §10, §14(SCI-04/21) |
| V2-A1-11 same-instant rejection contradicts `closeAt≤startAt ⇒ EMPTY` | **CLOSED IN V2.1** | §8.6, §8.7, §15, §16 |
| V2-A1-12 changed repeated-withdrawal result should be receipt-represented | **CLOSED IN V2.1** | §8.9, §8.13, §9 |
| R35R-07 consent race / same-time | **CLOSED IN V2.1** | §8.7, §8.10 (row lock + seq only) |
| R35R-08 consent backdating / favorable withdrawal | **CLOSED IN V2.1** | §8.6, §8.8 |
| R35R-15 study-write idempotency architecture | **CLOSED IN V2.1** | §9, §10, §8.13 |
| A1-01…A1-09 (V2) | CLOSED (carried from V2) | §2–§14 |
| R35R-09/10/11 | CLOSED (carried from V2) | §2, §4, §7, §14 |

No B/C findings claimed closed; production-v1 freeze NON-BLOCKING DEFERRED (§3/§20). No REMAINS-OPEN A1 items.

---

## 23. Exact Next Action

**STOP.** Submit this V2.1 spec for the final independent Codex Sol A1 gate. On clearance, implement **M3.5B-A1** on `64cf864` (after archiving `1ded28d` as `archive/m3.5b-prototype-nogo`), as additive commits that never touch `src/engine`, `src/corpus/data`, or the accepted M3.5A tables; then the independent A2 gate. No implementation, migrations, Git, or Wave 0 before the gate.

---

# Final Verdict

## A1 EFFECTIVE SPEC V2.1 READY FOR FINAL INDEPENDENT GATE

The two consent contradictions are eliminated and the hardening is explicit: GRANT neither accepts nor persists `assertedEffectiveAt` (schema-rejected before receipt lookup; `GRANTED ⇒ assertedEffectiveAt IS NULL` by CHECK), so no caller-controlled GRANT field is both persisted and excluded from identity; a legal `GRANTED→WITHDRAWN` always persists and the interval algorithm yields EMPTY when `closeAt ≤ startAt`, with the anti-conservative same-instant rejection removed entirely; and `StudyConsentCommandReceipt.resultKind` (`EVENT_APPENDED` / `NO_OP_EFFECTIVE_STATE` / `CORRECTION_NOT_APPLIED`) makes every no-op/correction replay independently interpretable. No other V2 area is changed; the document is self-contained; A2/B/C remain non-authorized with production Protocol v1 unfrozen. No implementation GO is self-declared — that remains Codex Sol's to grant.

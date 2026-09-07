<!-- R-B-17 ARCHIVAL HEADER - BEGIN. Added by the R-B-17 authority repair. Nothing below the END marker is altered. -->

> # HISTORICAL / NON-NORMATIVE
>
> **Status:** `HISTORICAL / NON-NORMATIVE - superseded A1 draft`
>
> **This document is retained as audit evidence only. It is NOT active authority and MUST NOT drive implementation, review, or gating.**
>
> **Active normative A1 specification:** `PAGAMENOS_M3_5B_A1_EFFECTIVE_SPEC_V2_1.md` (tracked at the repository root).
>
> **Supersession language inside this file is non-operative.** Any claim below of the form "fully supersedes" or "fully replaces" described the review packet submitted to one historical gate. It does **not** supersede, and never superseded, the active normative artifact named above. See Appendix B of the canonical A2 specification for the full register of neutralized claims.
>
> **Body integrity.** Everything after the `R-B-17 ARCHIVAL HEADER - END` marker is the original file, byte for byte. Its SHA-256 before archival was:
>
> `sha256:721f7298de1b71e4ee71f464520dc4894426448e252d7ce24ed23827d88aa353`
>
> Verify with: `tail -n +23 <this file> | sha256sum`
>
> **Root authority register:** `PAGAMENOS_SPEC_AUTHORITY.md` · **Repair record:** `PAGAMENOS_R_B_17_AUTHORITY_REPAIR_REPORT.md`

<!-- R-B-17 ARCHIVAL HEADER - END -->

# PAGAMENOS — M3.5B-A1 CONSOLIDATED EFFECTIVE PRE-IMPLEMENTATION SPECIFICATION — V2

**Milestone:** M3.5B-A1 — Protocol / Experiment / Assignment / Consent Authority.
**Status:** design specification only. A1 not implemented. No code / Prisma / migrations / Git / commits / implementation / A2 / B/C / Wave 0.
**Nature:** self-contained replacement of `PAGAMENOS_M3_5B_A1_EFFECTIVE_SPEC.md`, incorporating the bounded Codex Sol gate corrections A1-01…A1-09. A reviewer needs **only this file** for normative A1 interpretation; R.1/R.1a/R.1b/R.1c and V1 are superseded for A1.

**Accepted implementation baseline:** `64cf864a817c137920204487ab3317bc6d4c9ba5` (M3.5A, accepted).
**Failed prototype (historical evidence only — NOT a baseline):** `1ded28d28038d4a385628683da096f846439a100` (Codex Sol: **C — NO-GO**).

Conventions: all instants zone-qualified (`America/Lima`); "trusted time" is sampled by the service from the system clock, never caller-supplied; money not used in A1. Every A1 scientific table is append-only at the DB level (BEFORE UPDATE/DELETE/TRUNCATE triggers that `RAISE`), except `AnalysisProtocol` (freeze-guarded, §2.2) and `Experiment` (immutable immediately after insert, §4.1).

**V2 change log (bounded, from V1):** A1-01 consent provenance fields; A1-02 re-consent removed; A1-03 sequence-based authorization intervals; A1-04 stable `recruitmentSubjectKey`; A1-05 capability matrix + own-assignment binding; A1-06 `recruitmentPolicy` removed; A1-07 exact freeze-UPDATE trigger; A1-08 same-instant is a safety rule not the concurrency mechanism; A1-09 explicit repeated-withdrawal no-op result. The prior "UNRESOLVED A1 SPEC QUESTION" (no-op receipt target) is now **normative** (§8.4). No other area reopened.

---

## 1. Scope

A1 specifies and authorizes implementation of exactly: `AnalysisProtocol` registration/canonicalization/freeze **infrastructure**; `Experiment`; `StudyParticipant` (with a stable recruitment subject identity); `ExperimentAssignment`; `StudyConsent` (append-only event stream + state machine + sequence-based authorization intervals + document provenance); the minimum trusted A1 capability boundary; A1 operation-specific idempotency receipts; A1-owned SCI invariants and adversarial tests. A1 does **not** implement PurchaseIntent, decision binding, PurchaseOccasion, ResearchContact, weekly reports, opportunity reconciliation, evidence/VerifiedValue, or RIVSR (§21). No B/C design is needed to judge A1 correctness.

---

## 2. AnalysisProtocol — Effective Final Contract

Single authoritative representation. **No lifted semantic scalar columns.**
```
AnalysisProtocol {
  id                       PK
  protocolVersion          UNIQUE
  definitionSchemaVersion
  canonicalizationVersion
  definitionJson                     // the ONLY semantic authority (normalized)
  definitionDigest                   // sha256(canonical(definitionJson))
  lifecycleStatus          DRAFT | FROZEN
  frozenAt?
  createdAt                trusted
}
```
Prohibited as separate authoritative columns: `contaminationWindowHours`, `minVerifiedLevel`, `minIndependentOccasions`, `minReconciledOpportunities`, `observationWindowWeeks`, entry-source sets, baseline-kind sets, and any other semantic scalar. All semantics live in `definitionJson`; query/analysis code parses the verified definition — structurally eliminating JSON-vs-scalar-vs-hard-coded drift.

**Responsibility split.** DB: FK, `UNIQUE(protocolVersion)`, lifecycle state, freeze immutability, delete protection of FROZEN. Service: canonical parse (frozen local schema at `definitionSchemaVersion`), canonical serialization (`canonicalizationVersion`), digest creation + verification. Analysis: re-verify (recompute digest from persisted `definitionJson`) and **fail closed** on mismatch; no hard-coded runtime fallback.

### 2.1 Canonicalization pipeline
```
trusted builder input → parse (frozen local schema @definitionSchemaVersion) → normalized definition
 → M3.5A-compatible canonical JSON serialization (@canonicalizationVersion) → sha256 → digest
 → persist exact normalized JSON + digest + both version tags
```
Analysis load: `load FROZEN → parse @its definitionSchemaVersion → canonicalize @its canonicalizationVersion → recompute digest → compare → FAIL CLOSED on mismatch`.

### 2.2 Registration / Freeze (exact — closes A1-07)
Lifecycle `DRAFT → FROZEN`, one-way.
- `registerAnalysisProtocolDraft` → a single **INSERT** of a complete DRAFT row.
- **DRAFT editing is not required in A1 and is not provided** — there is no DRAFT-edit service operation; a mistaken DRAFT is superseded by a new `protocolVersion`.
- `freezeAnalysisProtocol` → the **ONLY** permitted UPDATE on `AnalysisProtocol`: `lifecycleStatus: DRAFT→FROZEN` and `frozenAt: NULL→trusted timestamp`, **all other columns byte/semantically unchanged**. The freeze-guard trigger rejects any UPDATE that alters any column other than exactly those two, rejects the transition unless the row is currently DRAFT, and after FROZEN rejects **every** UPDATE, every DELETE, and any lifecycle reversal. No combined "edit + freeze" exists.
- A revision is a **new** `AnalysisProtocol` version row, never a mutation.

---

## 3. Production Protocol v1 Deferral (normative)

A1 implements protocol **infrastructure** and may freeze **synthetic complete test protocols** in tests. A1 **MUST NOT** freeze/register the real production PagaMenos `AnalysisProtocol v1` as scientifically complete until the mandatory B/C protocol-authority semantics (opportunity-threshold uncertainty, missingness/withdrawal interpretation, PagaMenos value-attribution matrix, and related B/C definitions) pass their own gates. This does not block A1 infrastructure implementation.

---

## 4. Experiment — Final Contract (closes A1-06)

`recruitmentPolicy` is **removed** (untyped, no A1 invariant requires it, and keeping it would force invented semantic authority; scientifically material recruitment criteria belong in the eventual frozen `AnalysisProtocol` or an explicitly authorized future study fact). No replacement free-form field is added.
```
Experiment {
  id               PK
  experimentCode   UNIQUE
  frozenProtocolId FK → AnalysisProtocol (FROZEN)   // sole protocol relationship
  createdAt        trusted
}
```
`frozenProtocolId` must reference a FROZEN protocol (FK + trigger — a bare CHECK cannot subquery). There is exactly one protocol path: `assignment → experiment → frozen protocol`; no redundant protocol authority on `ExperimentAssignment`.

### 4.1 Experiment immutability — one rule (closes A1-20/immutability ambiguity)
`Experiment` rows are **append-only/immutable immediately after creation**: no ordinary UPDATE/DELETE/TRUNCATE (BEFORE triggers `RAISE`). A revised experiment requires a new `Experiment` row/code via a future authorized workflow. (Repository authority does not require pre-assignment mutation; the stricter immediate-immutability rule is used, removing the V1 "mutable until first assignment" ambiguity.)

---

## 5. StudyParticipant — Stable Recruitment Subject Identity (closes A1-04)

A reissuable invitation/magic-link credential **MUST NOT** be the domain identity. Frozen chain:
```
invitation / magic-link / enrollment credential
 → trusted recruitment resolver (restricted recruitment/identity boundary, outside study truth)
 → stable recruitmentSubjectKey
 → StudyParticipant
```
**Chosen normative model (one, not "token or digest"):** the trusted recruitment resolver maintains — inside the restricted recruitment/identity boundary (the same access-controlled `IdentityMap` region that holds `participantId ↔ email`, FINAL §30) — a mapping from invitation credentials to a **stable, research-issued, pseudonymous `recruitmentSubjectKey`** issued **once per recruited subject**. Reissued/rotated invites for the same subject resolve to the **same** `recruitmentSubjectKey`; distinct subjects resolve to distinct keys. The key is normalized under a frozen `recruitmentKeyVersion`. (No cryptographic key bytes are prescribed in this spec; if the derivation mechanism evolves, `recruitmentKeyVersion` pins the format.)

```
StudyParticipant {
  id                    PK
  recruitmentSubjectKey UNIQUE   // stable pseudonymous domain identity; resolved in trusted boundary; not a bearer secret; no PII; not participant-authored
  recruitmentKeyVersion          // frozen key-format version
  participantCode       UNIQUE   // opaque participant-facing pseudonym; generated AFTER dedup
  createdAt             trusted
}
```

`recruitmentSubjectKey` is: stable across invitation reissue/rotation and magic-link regeneration; unique to the recruited subject within the study identity scope; pseudonymous; non-PII; **not a bearer secret**; not participant-authored; resolved/generated only inside the trusted recruitment boundary. Raw email is never stored in the study domain. Three distinct identities (frozen):
```
domain provisioning identity = recruitmentSubjectKey   (UNIQUE; pre-creation dedup key)
public pseudonymous identity = participantCode           (opaque; generated post-dedup)
transport retry identity     = idempotencyKey            (in StudyParticipantRegistrationReceipt)
```

### 5.1 Participant retry / concurrency
| Case | Result |
| :-- | :-- |
| same transport key / same recruitmentSubjectKey | historical participant (receipt replay) |
| same transport key / different recruitmentSubjectKey | `StudyIdempotencyConflictError` |
| different transport key / same recruitmentSubjectKey | same participant + durable alias receipt |
| different transport key / different recruitmentSubjectKey | distinct participants |
| concurrent different keys / same recruitmentSubjectKey | **exactly one** `StudyParticipant` (`UNIQUE(recruitmentSubjectKey)` + `P2002` reconciliation) |
| invite A → subject S → P; invite A expires; invite B for same S → register | **same P** (resolver maps B→same recruitmentSubjectKey) |

---

## 6. registerStudyParticipant (closes A1-16)

```
registerStudyParticipant({ recruitmentCredential | recruitmentSubjectKey })     // trusted RecruitmentProvisioningCapability only
```
Steps: (1) the trusted recruitment resolver resolves the invitation/enrollment credential to a stable `recruitmentSubjectKey` + `recruitmentKeyVersion` (or validates a directly-supplied trusted key); (2) look up existing `StudyParticipant` by `recruitmentSubjectKey`; (3) if absent, generate `participantCode` + trusted `createdAt`; (4) persist participant; (5) persist receipt; (6) on exact/domain retry, return the historical participant.
```
StudyParticipantRegistrationReceipt {
  id  operationScope = PARTICIPANT_REGISTER_V1
  idempotencyKey  requestHash
  participantId FK → StudyParticipant  createdAt
  UNIQUE(operationScope, idempotencyKey)
}
```
The **material request hash uses the stable normalized `recruitmentSubjectKey` + `recruitmentKeyVersion`**, never a rotating invite token as scientific request identity. Transport-key rotation **and** credential rotation for the same subject converge to one participant.

---

## 7. ExperimentAssignment — Final Contract

```
ExperimentAssignment {
  id                 PK
  experimentId       FK → Experiment
  participantId      FK → StudyParticipant
  enrolledAt         trusted system time
  observationStartAt = enrolledAt (trusted-derived)
  createdAt          trusted
  UNIQUE(experimentId, participantId)
}
```
`enrolledAt` trusted; `observationStartAt = enrolledAt`; **no caller anchor, no caller window length, no redundant protocol id**. `observationEndAt` is **derived at analysis** as `observationStartAt + frozenProtocol.observationWindowWeeks` (read from frozen `definitionJson`, never a stored scalar). The assignment is the **official population membership fact**; immutable (UPD/DEL/TRUNC denied); **not deleted on withdrawal** (withdrawal is a consent fact). Anchor authority: participant-relative enrollment (Phase 0A "during the four-week period"; prototype enrollment-relative window; RT-11.F completion; 30–50 rolling recruits, FINAL §34).

---

## 8. Consent — Complete Final Contract

### 8.1 Event shape + document provenance (closes A1-01)
```
StudyConsentEvent {
  id
  assignmentId          FK → ExperimentAssignment
  consentSeq

  action                GRANTED | WITHDRAWN

  consentVersion        // GRANTED: NOT NULL ; WITHDRAWN: NULL
  privacyNoticeVersion  // GRANTED: NOT NULL ; WITHDRAWN: NULL
  optionalEvidenceConsent  // boolean; GRANTED: NOT NULL ; WITHDRAWN: NULL

  capturedAt            // trusted
  assertedEffectiveAt?  // optional self-reported instant (see materiality rules §8.2/§8.6)
  recordedAt            // knowledge time

  UNIQUE(assignmentId, consentSeq)
}
```
Document-provenance fields prove **what** was accepted, not merely that acceptance occurred (authority: FINAL §28 `StudyConsent{consentVersion, privacyNoticeVersion, optionalEvidenceConsent}`; prototype §7). They are immutable scientific facts. **Nullability by action (single-table CHECK):** `action='GRANTED' ⇒ consentVersion, privacyNoticeVersion, optionalEvidenceConsent NOT NULL`; `action='WITHDRAWN' ⇒ all three NULL`. GRANT provenance fields **participate in the GRANT material request hash** (§8.6).

### 8.2 States and transitions (closes A1-02: no re-consent)
States (effective as-of): `NO_CONSENT`, `GRANTED`, `WITHDRAWN`. Only state-changing transitions append an event.

| Current → incoming | Payload-equivalence requirement | Append? | Result |
| :-- | :-- | :-- | :-- |
| NO_CONSENT → GRANT | — | yes | append GRANTED |
| GRANTED → GRANT, **exact same** material grant | full material-grant equality (§8.3) | no | **no-op**; return effective GRANTED |
| GRANTED → GRANT, **materially different** | any material field differs | no | **REJECT** `StudyConsentUpdateNotSupportedError` (pending a future authorized consent-update workflow) |
| GRANTED → WITHDRAW | — | yes | append WITHDRAWN |
| WITHDRAWN → WITHDRAW | — | no | **no-op**; return effective WITHDRAWN (see §8.5 for changed-assertion) |
| WITHDRAWN → GRANT | — | no | **REJECT** `StudyConsentInvalidTransitionError` (re-consent not authorized in A1) |
| NO_CONSENT → WITHDRAW | — | no | **REJECT** `StudyConsentInvalidTransitionError` |

**Re-consent (`WITHDRAWN→GRANT`) is removed from A1** — no authoritative basis in the A1 workflow (Sol A1-02). There is **no dormant public re-consent command**. Future re-enrollment/re-consent/new assignment is a separately authorized specification, not A1.

### 8.3 Material-grant equality ("exact same grant")
Equality is over the **complete material consent payload**, never inferred from `action` alone:
```
{ assignment identity (from trusted context),
  consentVersion, privacyNoticeVersion, optionalEvidenceConsent }
```
`assertedEffectiveAt` is **non-material for GRANT** (a grant's authorization opens at `capturedAt`; an asserted instant has no authorization effect for a grant), so it is excluded from grant equality and from the GRANT hash. Any difference in a material field while already GRANTED ⇒ REJECT (§8.2), not a silent second grant.

### 8.4 No-op receipt target — NORMATIVE (closes the former flag)
A no-op command appends no new `StudyConsentEvent`; its `StudyConsentCommandReceipt.consentEventId` references the **consent event that represents the command result / effective state — not necessarily the event created by this transport command**. For an exact repeated GRANT the receipt points to the existing effective GRANTED event; for a repeated WITHDRAW it points to the existing effective WITHDRAWN event. (Sol confirmed this is mechanically sound; the V1 "UNRESOLVED A1 SPEC QUESTION" is removed.)

### 8.5 Repeated withdrawal with a changed/earlier assertion (closes A1-09)
`WITHDRAWN → WITHDRAW` remains a **no-op**. If a second withdrawal supplies a materially different or earlier `assertedEffectiveAt`, it does **not** amend the historical withdrawal and does **not** silently apply the earlier correction. It returns an explicit typed result — `NO_OP_ALREADY_WITHDRAWN / CORRECTION_NOT_APPLIED` — never expanding authorization beyond the already-effective withdrawal. An audited consent-correction workflow is deferred (not A1). If the differing payload reuses an already-consumed idempotency key, normal idempotency-conflict rules apply (§8.6/§10).

### 8.6 Temporal + authorization contract (closes A1-03)
Consent event ordering is **`consentSeq`** within the assignment — **never** sorted by asserted effective timestamps. Authorization intervals are derived over the visible events (knowledge-time rules apply at analysis, §8.7):

- A `GRANTED` event **G** opens an authorization interval at **`G.capturedAt`**.
- The next sequenced `WITHDRAWN` event **W** closes it at
  `withdrawCloseAt = min(W.capturedAt, W.assertedEffectiveAt ?? W.capturedAt)`.
- Interval = `[G.capturedAt, withdrawCloseAt)`; if `withdrawCloseAt ≤ G.capturedAt` the interval is **EMPTY**.
- A backdated withdrawal never lets an earlier/later GRANT "win" on effective-timestamp grounds — **sequence** decides which withdrawal resolves which open grant.

Because A1 permits at most `NO_CONSENT→GRANT→WITHDRAW` (no re-consent), there is at most one open grant; the general algorithm (§20) still applies and fails closed on an impossible second open grant.

### 8.7 Collection-time authorization vs retrospective usability (closes A1-07/§7 of the brief)
Two distinct pure contracts, persisted-for but not conflated:
- **`wasCollectionAuthorizedAtKnownTime(...)`** — at collection time the system can only know already-recorded facts; a withdrawal recorded later cannot retroactively prevent a collection that already occurred. (Consumed by A2+, defined here.)
- **`deriveConsentAuthorizationIntervals(...)`** — at later scientific analysis, a late-recorded withdrawal with an earlier asserted instant may conservatively render part/all of a previously-collected interval unusable. (Full C2 as-of analysis deferred; A1 persists `capturedAt`, `assertedEffectiveAt?`, `recordedAt`, `consentSeq` so it is computable.)

A1 must **not** use final/current consent to retroactively invalidate a collection that was validly authorized at its capture time; and must **not** conflate "what the system knew at collection time" with "what later retrospective consent facts allow analysis to retain."

### 8.8 Backdated-withdrawal matrix
| Events | Authorization interval |
| :-- | :-- |
| G capturedAt=T10 ; W capturedAt=T30, asserted=T20 | `[T10, T20)` |
| G capturedAt=T10 ; W capturedAt=T30, asserted=T5 | `withdrawCloseAt=T5 ≤ T10` ⇒ **EMPTY** |
| G capturedAt=T10 ; W capturedAt=T30, asserted=NULL | `[T10, T30)` |
| G capturedAt=T10 ; no withdrawal | `[T10, +∞)` |

### 8.9 Serialization + same-instant (closes A1-08)
Transaction:
```
1 resolve transport receipt (idempotent replay if present)
2 lock the ExperimentAssignment row FOR UPDATE
3 load effective consent state
4 validate the state transition (§8.2) incl. material-grant equality (§8.3)
5 allocate consentSeq = previous + 1
6 append a StudyConsentEvent ONLY if state-changing
7 persist receipt / result
8 commit atomically
```
`capturedAt` is sampled **while the assignment row is locked**. **The primary concurrency/order mechanism is row serialization + `consentSeq`, not timestamp equality.** Same-instant equality is only an additional safety rule: if two contradictory events nevertheless resolve to exactly the same authorization-effective timestamp after conservative asserted-time rules, **fail closed** (`StudyConsentConflictError`). `UNIQUE(assignmentId, consentSeq)` makes two successful same-sequence writes impossible.

### 8.10 Scientific vs transport identity
```
scientific event identity = (assignmentId, consentSeq)
transport identity        = (operationScope, idempotencyKey)   // StudyConsentCommandReceipt
```
`consentBusinessKey` does not exist. Because no-op transitions append nothing, a different transport key can never manufacture a duplicate semantic GRANT/WITHDRAW.

---

## 9. A1 Receipt Architecture (concrete strong-FK families only)

No polymorphic `targetId`. Each: `operationScope` (internal constant), `idempotencyKey`, `requestHash`, concrete target FK, `createdAt`, `UNIQUE(operationScope, idempotencyKey)`; append-only.

| Receipt | operationScope | Target FK |
| :-- | :-- | :-- |
| AnalysisProtocolCommandReceipt | PROTOCOL_REGISTER_V1, PROTOCOL_FREEZE_V1 | analysisProtocolId → AnalysisProtocol |
| ExperimentCreateReceipt | EXPERIMENT_CREATE_V1 | experimentId → Experiment |
| StudyParticipantRegistrationReceipt | PARTICIPANT_REGISTER_V1 | participantId → StudyParticipant |
| ExperimentAssignmentReceipt | ASSIGN_PARTICIPANT_V1 | assignmentId → ExperimentAssignment |
| StudyConsentCommandReceipt | CONSENT_GRANT_V1, CONSENT_WITHDRAW_V1 | consentEventId → StudyConsentEvent (effective event for no-ops, §8.4) |

---

## 10. Request-Hash Contract (closes A1-11)

```
requestHash = canonical(complete normalized MATERIAL caller request + stable trusted calling context)
```
**Excludes** sampled/derived outputs: generated DB id, `createdAt`, `recordedAt`, `enrolledAt`, `participantCode`, `consentSeq`, `capturedAt`. **Includes** genuinely material caller input:
- **GRANT:** assignment identity (from trusted context), `consentVersion`, `privacyNoticeVersion`, `optionalEvidenceConsent`, stable trusted actor/context identity. (`assertedEffectiveAt` excluded — non-material for GRANT, §8.3.)
- **WITHDRAW:** assignment identity (from trusted context), `assertedEffectiveAt` (material — it narrows the interval), stable trusted actor/context identity.
- **registerStudyParticipant:** `recruitmentSubjectKey` + `recruitmentKeyVersion` (never a rotating token).

Same idempotency key + any material difference → typed conflict. Different key + same domain identity → domain reconciliation (alias if payload matches, else typed domain conflict), never blind aliasing. Under race a caller requesting B never receives A as success (target-identity AND payload-hash match required).

---

## 11. Operation-Specific Capability Matrix (closes A1-05)

Only the owning sanctioned module/service surface may invoke each write capability; raw repositories internal; participant-facing/application modules cannot import administrative writes. Mechanically enforced by extending the accepted AST module-capability boundary test with operation-specific allowlists (no full authentication system).

| Capability | Allowed operation(s) | Allowed importing module (concept) | Forbidden callers |
| :-- | :-- | :-- | :-- |
| ProtocolAdministrationCapability | registerAnalysisProtocolDraft, freezeAnalysisProtocol | protocol-admin service module | app/participant-facing, other study services |
| ExperimentAdministrationCapability | createExperiment | experiment-admin service module | app/participant-facing, other study services |
| RecruitmentProvisioningCapability | resolve/issue recruitmentSubjectKey, registerStudyParticipant | recruitment-provisioning service module | app/participant-facing, other study services |
| AssignmentAdministrationCapability | assignParticipant | assignment-admin service module | app/participant-facing, other study services |
| ParticipantConsentCapability | recordConsentGrant, recordConsentWithdrawal | participant-consent service module (behind trusted participant context, §12) | admin modules, arbitrary app modules |

Raw `db` repositories/Prisma remain unreachable from arbitrary services (accepted M3.5A policy preserved; `src/db/index.ts` exports nothing). Engine/corpus byte-unchanged.

---

## 12. Own-Assignment Consent Binding (closes A1-05)

The participant-facing consent operation **MUST NOT** trust an `assignmentId` from an arbitrary request as proof of ownership. Normative surface:
```
recordConsentGrant({ trustedParticipantContext, consentPayload })
recordConsentWithdrawal({ trustedParticipantContext, withdrawPayload })
```
A trusted participant actor/session context resolves the participant's **own** `ExperimentAssignment`. A request may carry an opaque assignment reference only if the trusted adapter verifies it matches the actor context; otherwise the operation is rejected. Full auth is out of scope; trusted-context ownership binding is required and is what prevents a participant from consenting on another subject's assignment.

---

## 13. A1 Trust / Capability Model (summary)

Trusted research/system capabilities (per §11) own protocol/experiment/recruitment/assignment writes and sample trusted timestamps. Participant-facing capability may only request consent for its **own** assignment (§12). Participant-facing code cannot mint `recruitmentSubjectKey`, `participantCode`, protocol definitions, experiment assignments, or trusted timestamps. Accepted M3.5A module-capability policy preserved.

---

## 14. A1-Owned SCI Invariants (closes A1-29)

**SCI-01 — Protocol single frozen authority.** *A1-owned: infrastructure.* One representation (`definitionJson`+`definitionDigest`); analysis re-verifies, fails closed; freeze one-way; exact freeze-UPDATE (§2.2). Prohibited: lifted scalar authority; hard-coded fallback; mutated frozen row; any freeze-UPDATE touching a non-lifecycle column. Attack: JSON/digest mismatch → fail closed; freeze-UPDATE altering `definitionJson` → rejected. *Later:* production-v1 completeness (B/C, §3).

**SCI-02 — Assignment defines the official population.** *A1-owned: population identity.* **Now depends on stable subject identity, not credential identity:** the population rests on participants provisioned under a unique stable `recruitmentSubjectKey`, so invitation/credential rotation or transport-key rotation cannot mint duplicate participants and cannot inflate `ExperimentAssignment`. Enforce: `UNIQUE(recruitmentSubjectKey)`, `UNIQUE(experimentId, participantId)`, immutability triggers, resolver credential→subject mapping. Attack: invite-B-for-same-subject → same participant; duplicate assignment rejected. *Later:* denominator derivation (C2).

**SCI-03 — Observation window from frozen protocol.** *A1-owned: trusted anchor.* Window length from frozen protocol; `enrolledAt` trusted, not caller-chosen. Attack: caller anchor/weeks rejected. *Later:* completion gate + future-fact non-leakage (C2).

**SCI-04 — Consent deterministic + provenance + no re-consent.** *A1-owned: full.* Reproducible independent of row order; **includes consent document provenance (§8.1), sequence-based authorization intervals (§8.6), and no re-consent (§8.2)**; contradictory simultaneous authorization rejected; forward-only authorization from `capturedAt`; sequence — not asserted timestamps — orders events. Prohibited: row-order/asserted-time ordering; naive `max+1`; seq disambiguating contradiction; retro-authorization; favorable withdrawal removal; `WITHDRAWN→GRANT`; GRANTED with missing provenance. Attack: §17 consent regressions.

**SCI-21 — Complete retry identity.** *A1-owned: A1 writes.* Each fingerprint hashes all material caller input + stable trusted context, excluding sampled outputs; **hashes all consent provenance (GRANT) and the stable `recruitmentSubjectKey`+`recruitmentKeyVersion`** (never a rotating token). Enforce: `UNIQUE(operationScope, idempotencyKey)`; canonical hash. Attack: omitted-provenance retry → conflict; credential/key rotation → one participant.

**SCI-24 — M3.5A untouched.** *A1-owned: full.* No ALTER/mutation of `decision_snapshot`/`decision_idempotency_receipt`; engine/corpus byte-unchanged; module-capability boundary preserved; no polymorphic reuse of `DecisionIdempotencyReceipt`. Attack: engine/corpus diff non-empty → fail; boundary offender → fail.

*(Later SCI portions are not reopened.)*

---

## 15. Required Consent State Table

| Current state | Incoming action | Payload equivalence requirement | Append event? | Receipt target | Result / error | Authorization effect |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| NO_CONSENT | GRANT | — | yes | new GRANTED | success | opens interval at `capturedAt` |
| GRANTED | GRANT (same key) | full material equality | no | effective GRANTED | idempotent replay | unchanged |
| GRANTED | GRANT (diff key, exact same) | full material equality | no | effective GRANTED | no-op success | unchanged |
| GRANTED | GRANT (materially different) | fails equality | no | — | `StudyConsentUpdateNotSupportedError` | unchanged |
| GRANTED | WITHDRAW | — | yes | new WITHDRAWN | success | closes interval (§8.6) |
| WITHDRAWN | WITHDRAW (same payload) | — | no | effective WITHDRAWN | no-op success | unchanged |
| WITHDRAWN | WITHDRAW (different/earlier assertion) | — | no | effective WITHDRAWN | `NO_OP_ALREADY_WITHDRAWN / CORRECTION_NOT_APPLIED` | unchanged (never widened) |
| WITHDRAWN | GRANT | — | no | — | `StudyConsentInvalidTransitionError` | unchanged |
| NO_CONSENT | WITHDRAW | — | no | — | `StudyConsentInvalidTransitionError` | none |

---

## 16. Authorization-Interval Pseudocode (pure, normative)

```
deriveAuthorizationIntervals(events):        // events already restricted to the visible set (as-of, C2)
  ordered = events sorted by consentSeq       // NEVER by assertedEffectiveAt
  openGrant = null
  intervals = []
  for e in ordered:
    if e.action == GRANTED:
      if openGrant != null: fail closed        // impossible after §8.2 validation (no re-consent)
      openGrant = e
    else /* WITHDRAWN */:
      if openGrant == null: fail closed
      closeAt = min(e.capturedAt, e.assertedEffectiveAt ?? e.capturedAt)
      startAt = openGrant.capturedAt
      intervals.push( closeAt > startAt ? [startAt, closeAt) : EMPTY )
      openGrant = null
  if openGrant != null:
     intervals.push([openGrant.capturedAt, +∞))
  return intervals
```

---

## 17. A1 Adversarial Regressions (expected results)

**Consent provenance:** GRANTED missing `consentVersion` → reject; GRANTED missing `privacyNoticeVersion` → reject; GRANTED missing `optionalEvidenceConsent` → reject; exact repeated GRANT → no-op; changed `consentVersion` while GRANTED → reject (`StudyConsentUpdateNotSupportedError`); changed `optionalEvidenceConsent` while GRANTED → reject.
**Withdrawal:** `WITHDRAWN→GRANT` → reject; grant T10 / withdraw captured T30 asserted T20 → `[T10,T20)`; grant T10 / withdraw captured T30 asserted T5 → EMPTY; repeat withdrawal with earlier assertion → `NO_OP_ALREADY_WITHDRAWN / CORRECTION_NOT_APPLIED`, no correction applied; `NO_CONSENT→WITHDRAW` → reject.
**Recruitment identity:** invite A → subject S → P; invite B reissued for same S → same key → same P; two invite credentials for same S concurrently → one P; different subjects → distinct keys/participants; `participantCode` caller-chosen → rejected.
**Capability:** participant-facing module attempts `registerStudyParticipant` → boundary test fail; participant provides another user's `assignmentId` for consent → rejected by trusted-context ownership check.
**Experiment:** `createExperiment` with a `recruitmentPolicy` field → API field does not exist; `Experiment` UPDATE → rejected.
**Protocol:** freeze-UPDATE changing `definitionJson` + status → rejected; freeze-UPDATE changing only `lifecycleStatus`+`frozenAt` → allowed; frozen `AnalysisProtocol` UPDATE/DELETE → rejected; experiment referencing DRAFT protocol → rejected.
**Assignment:** same participant assigned twice in one experiment → one assignment; caller-supplied observation anchor/weeks → rejected; assignment UPDATE/DELETE/TRUNCATE → rejected.
**Concurrency:** concurrent consent transitions → serialized, deterministic, contradictory same-instant rejected; same transport key / different material request → `StudyIdempotencyConflictError`.

---

## 18. Database Implementability Table

| A1 invariant | Enforcement |
| :-- | :-- |
| protocolVersion unique | UNIQUE |
| experiment → FROZEN protocol | FK + trigger |
| freeze one-way; only lifecycle+frozenAt UPDATE; frozen immutable; no delete | trigger (freeze-guard) |
| protocol digest = canonical(definition) | service (create) + analysis re-verify (fail closed) |
| experiment immutable immediately | trigger (UPD/DEL/TRUNC) |
| participant recruitment dedup | UNIQUE(recruitmentSubjectKey) + P2002 reconciliation |
| participantCode unique/opaque/system-issued | UNIQUE + service issuance |
| assignment population uniqueness | UNIQUE(experimentId, participantId) |
| assignment immutable; no delete on withdrawal | trigger |
| trusted enrolledAt/observationStartAt | service (trusted clock) |
| consent event identity | UNIQUE(assignmentId, consentSeq) |
| consent provenance nullability by action | single-table CHECK |
| consent serialization | row lock FOR UPDATE + transaction |
| consent transition legality; material-grant equality; no re-consent; no-op no-append | service validation (state machine) |
| consent append-only | trigger |
| receipt idempotency | UNIQUE(operationScope, idempotencyKey) + concrete FK |
| capability/module boundary + own-assignment ownership | module-capability AST test + trusted-context adapter |
| authorization intervals / collection authorization | pure derivation |

No cross-table CHECK is claimed where PostgreSQL cannot legally subquery (those are triggers). Consent nullability is a legal single-table CHECK.

---

## 19. Effective A1 Service Table (closes A1-26)

| Operation | Capability / trusted context | Caller material input | Internally-derived | Domain identity | Receipt / hash | Transaction / lock | Failure modes |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| registerAnalysisProtocolDraft | ProtocolAdmin | builder definition, protocolVersion | normalized JSON, digest, version tags | protocolVersion | AnalysisProtocolCommandReceipt (REGISTER) | insert | invalid definition; duplicate version |
| freezeAnalysisProtocol | ProtocolAdmin | protocolId | frozenAt | — | AnalysisProtocolCommandReceipt (FREEZE) | freeze-guard UPDATE (lifecycle+frozenAt only) | already frozen; any other column changed; digest mismatch |
| createExperiment | ExperimentAdmin | experimentCode, frozenProtocolId | — | experimentCode | ExperimentCreateReceipt | insert | protocol not FROZEN; duplicate code; (no recruitmentPolicy field) |
| registerStudyParticipant | RecruitmentProvisioning | recruitmentCredential / recruitmentSubjectKey | recruitmentSubjectKey, recruitmentKeyVersion, participantCode, createdAt | recruitmentSubjectKey | StudyParticipantRegistrationReceipt | insert (unique guard) | untrusted/unresolvable credential; conflict on key/different payload |
| assignParticipant | AssignmentAdmin | experimentId, participantId | enrolledAt, observationStartAt | (experimentId, participantId) | ExperimentAssignmentReceipt | insert (unique guard) | unknown experiment/participant; duplicate; caller anchor/weeks rejected |
| recordConsentGrant | ParticipantConsent (trusted context) | consentPayload {consentVersion, privacyNoticeVersion, optionalEvidenceConsent, assertedEffectiveAt?} | own assignment (resolved), capturedAt, consentSeq | (assignmentId, consentSeq) | StudyConsentCommandReceipt (GRANT); GRANT hash §10 | lock assignment FOR UPDATE; state-machine eval | not own assignment; materially-different grant; contradictory same-instant; missing provenance |
| recordConsentWithdrawal | ParticipantConsent (trusted context) | withdrawPayload {assertedEffectiveAt?} | own assignment (resolved), capturedAt, consentSeq | (assignmentId, consentSeq) | StudyConsentCommandReceipt (WITHDRAW); WITHDRAW hash §10 | lock assignment FOR UPDATE; state-machine eval | `StudyConsentInvalidTransitionError` (NO_CONSENT→WITHDRAW); contradictory same-instant; changed-assertion → no-op result |
| loadFrozenProtocolForAnalysis | analysis | protocolId/version | recomputed digest | — | — | read only | not FROZEN; digest mismatch → fail closed |

---

## 20. Capability Table (mechanically testable) — see §11

Rendered as the §11 matrix (Capability · Allowed operation · Allowed importing module concept · Forbidden callers), enforceable by the existing AST module-capability test pattern with operation-specific allowlists.

---

## 21. Effective A1 Entity Table V2 (implementation-authorized; no A2/B/C models)

| Entity | PK | Domain identity | FKs | UNIQUE | CHECK | Immutable/freeze | Timestamps | Receipt relation |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| AnalysisProtocol | id | protocolVersion | — | protocolVersion | lifecycleStatus∈{DRAFT,FROZEN} | freeze-guard (only lifecycle+frozenAt UPDATE; frozen immutable; no delete) | createdAt, frozenAt? | AnalysisProtocolCommandReceipt |
| Experiment | id | experimentCode | frozenProtocolId→AnalysisProtocol | experimentCode | — | immutable immediately (UPD/DEL/TRUNC denied) | createdAt | ExperimentCreateReceipt |
| StudyParticipant | id | recruitmentSubjectKey | — | recruitmentSubjectKey; participantCode | no PII | append-only | createdAt | StudyParticipantRegistrationReceipt |
| ExperimentAssignment | id | (experimentId, participantId) | experimentId, participantId | (experimentId, participantId) | — | UPD/DEL/TRUNC denied | enrolledAt, observationStartAt, createdAt | ExperimentAssignmentReceipt |
| StudyConsentEvent | id | (assignmentId, consentSeq) | assignmentId | (assignmentId, consentSeq) | action∈{GRANTED,WITHDRAWN}; GRANTED⇒provenance NOT NULL; WITHDRAWN⇒provenance NULL | append-only | capturedAt, recordedAt | StudyConsentCommandReceipt |
| AnalysisProtocolCommandReceipt | id | (operationScope, idempotencyKey) | analysisProtocolId | (operationScope, idempotencyKey) | scope∈{REGISTER,FREEZE} | append-only | createdAt | — |
| ExperimentCreateReceipt | id | (operationScope, idempotencyKey) | experimentId | (operationScope, idempotencyKey) | — | append-only | createdAt | — |
| StudyParticipantRegistrationReceipt | id | (operationScope, idempotencyKey) | participantId | (operationScope, idempotencyKey) | — | append-only | createdAt | — |
| ExperimentAssignmentReceipt | id | (operationScope, idempotencyKey) | assignmentId | (operationScope, idempotencyKey) | — | append-only | createdAt | — |
| StudyConsentCommandReceipt | id | (operationScope, idempotencyKey) | consentEventId | (operationScope, idempotencyKey) | scope∈{GRANT,WITHDRAW} | append-only | createdAt | — |

---

## 22. Non-A1 Contracts / Deferred Boundaries

**A2/B/C are NOT authorized by this document.** Production `AnalysisProtocol v1` remains **unfrozen** (§3). A2 (PurchaseIntent lifecycle, decision request/binding), B (opportunity/occasion identity, reconciliation), C (evidence/attribution, VS/RIVSR/as-of) are not implemented and their schemas are not A1 tables. **PurchaseIntent count is not an opportunity/denominator count.** A1 defines `wasCollectionAuthorizedAtKnownTime` / `deriveConsentAuthorizationIntervals` (§8.7) and persists the data C2 needs, without implementing as-of analysis.

---

## 23. Finding Closure

| Finding | Status | Where |
| :-- | :-- | :-- |
| A1-01 consent-document provenance absent | **CLOSED IN V2** | §8.1, §8.3, §10, §14(SCI-04/21) |
| A1-02 WITHDRAWN→GRANT conflicts with withdrawal contract | **CLOSED IN V2** | §8.2 (re-consent removed) |
| A1-03 backdated-withdrawal intervals undefined | **CLOSED IN V2** | §8.6, §8.8, §16 |
| A1-04 recruitmentIdentityKey may be a rotating credential | **CLOSED IN V2** | §5, §6 (stable recruitmentSubjectKey) |
| A1-05 capability is prose; own-assignment consent unbound | **CLOSED IN V2** | §11, §12 |
| A1-06 Experiment.recruitmentPolicy untyped | **CLOSED IN V2** | §4 (removed) |
| A1-07 protocol freeze UPDATE imprecise | **CLOSED IN V2** | §2.2 |
| A1-08 same-instant equality not the concurrency mechanism | **CLOSED IN V2** | §8.9 |
| A1-09 repeated withdrawal must report no correction | **CLOSED IN V2** | §8.5, §15 |
| R35R-07 consent race / same-time | **CLOSED IN V2** | §8.9 |
| R35R-08 consent backdating / favorable withdrawal | **CLOSED IN V2** | §8.6, §8.7 |
| R35R-09 protocol coherence undefined | **CLOSED IN V2** | §2, §2.1 |
| R35R-10 redundant protocol authority / free anchor | **CLOSED IN V2** | §4, §7 |
| R35R-11 SCI definitions | **CLOSED IN V2** | §14 |
| R35R-15 study-write idempotency architecture | **CLOSED IN V2** | §9, §10 |

No B/C findings claimed closed; production-v1 freeze remains deferred (NON-BLOCKING DEFERRED, §3/§22). No REMAINS-OPEN A1 items.

---

## 24. Exact Next Action

**STOP.** Submit this V2 spec for the independent Codex Sol A1 gate. On clearance, implement **M3.5B-A1** on `64cf864` (after archiving `1ded28d` as `archive/m3.5b-prototype-nogo`), as additive commits that never touch `src/engine`, `src/corpus/data`, or the accepted M3.5A tables; then the independent A2 gate. No implementation, migrations, Git, or Wave 0 before the gate.

---

# Final Verdict

## A1 EFFECTIVE SPEC V2 READY FOR INDEPENDENT GATE

All nine Sol findings A1-01…A1-09 are CLOSED IN V2, and R35R-07/08/09/10/11/15 remain closed: consent now carries immutable document provenance and hashes it; re-consent is removed and has no dormant command; backdated-withdrawal authorization is a normative sequence-based interval algorithm that never orders by asserted time; the recruitment domain identity is a stable `recruitmentSubjectKey` immune to credential rotation; capability is an operation-specific, AST-testable matrix with trusted-context own-assignment consent binding; `Experiment.recruitmentPolicy` is removed with immediate immutability; the protocol freeze-UPDATE is an exact two-column trigger contract; same-instant equality is demoted to a safety rule behind row-lock + `consentSeq`; and repeated withdrawal returns an explicit no-correction result. The document is self-contained; A2/B/C remain non-authorized with production Protocol v1 unfrozen. No implementation GO is self-declared — that remains Codex Sol's to grant.

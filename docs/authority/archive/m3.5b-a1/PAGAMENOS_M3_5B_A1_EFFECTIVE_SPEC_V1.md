<!-- R-B-17 ARCHIVAL HEADER - BEGIN. Added by the R-B-17 authority repair. Nothing below the END marker is altered. -->

> # HISTORICAL / NON-NORMATIVE
>
> **Status:** `HISTORICAL / NON-NORMATIVE - superseded A1 draft`
>
> **This document is retained as audit evidence only. It is NOT active authority and MUST NOT drive implementation, review, or gating.**
>
> **Active normative A1 specification:** `PAGAMENOS_M3_5B_A1_EFFECTIVE_SPEC_V2_1.md` (tracked at the repository root).
>
> **Supersession language inside this file is non-operative.** Any claim below of the form "fully supersedes" or "fully replaces" described the review packet submitted to one historical gate. It does **not** supersede, and never superseded, the active normative artifact named above. For the status of this artifact and of every archived A1 revision, see `PAGAMENOS_SPEC_AUTHORITY.md` §5 and `docs/authority/archive/README.md`. *(Appendix B of the canonical A2 specification is the neutralization register for the historical **A2** revision chain only. It does not govern this file.)*
>
> **Body integrity.** Everything after the `R-B-17 ARCHIVAL HEADER - END` marker is the original file, byte for byte. Its SHA-256 before archival was:
>
> `sha256:1d9879b95c790945208fc10d045263548ddf0f0233d7a3d88c5c201a6f6f0109`
>
> Verify with: `tail -n +23 <this file> | sha256sum`
>
> **Root authority register:** `PAGAMENOS_SPEC_AUTHORITY.md` · **Repair record:** `PAGAMENOS_R_B_17_AUTHORITY_REPAIR_REPORT.md`

<!-- R-B-17 ARCHIVAL HEADER - END -->

# PAGAMENOS — M3.5B-A1 CONSOLIDATED EFFECTIVE PRE-IMPLEMENTATION SPECIFICATION

**Milestone:** M3.5B-A1 — Protocol / Experiment / Assignment / Consent Authority.
**Status:** design specification only. A1 has **not** been implemented. No code / Prisma / migrations / Git / commits / Wave 0.
**Nature:** faithful consolidation of R.1 + R.1a + R.1b + R.1c into one self-contained document. No new architecture, no new requirements. A reviewer needs only this file for normative A1 interpretation.

**Accepted implementation baseline:** `64cf864a817c137920204487ab3317bc6d4c9ba5` (M3.5A persistence, accepted).
**Failed prototype (historical evidence only — NOT a baseline):** `1ded28d28038d4a385628683da096f846439a100` (Codex Sol: **C — NO-GO**).

Precedence applied to build this document: **R.1c > R.1b > R.1a > R.1**, each superseding only the sections it explicitly replaced; R.1 supplies everything not superseded. Obsolete alternatives are not retained.

Conventions: money = integer céntimos (not used in A1); all instants zone-qualified (`America/Lima` semantics); "trusted time" = sampled by the service from the system clock, never caller-supplied. Every A1 scientific table is append-only at the database level (BEFORE UPDATE/DELETE/TRUNCATE triggers that `RAISE`), except `AnalysisProtocol`, which is freeze-guarded.

---

## 0. Consolidation Notes (blockers / flags)

- **CONSOLIDATION BLOCKERS: none.** The four source documents are progressive refinements, not co-equal contradictory alternatives. Participant identity (R.1 minimal → R.1b registration → R.1c `recruitmentIdentityKey`), consent (R.1 append-only → R.1b state machine), and receipts (R.1 → R.1a concrete families → R.1c participant receipt) each have a single latest-effective form, used here.
- **UNRESOLVED A1 SPEC QUESTION (low severity, flagged per R.1b §14 / consolidation brief §14):** the source stack established that a **no-op** consent transition (`GRANTED→GRANT`, `WITHDRAWN→WITHDRAW`) appends **no** new `StudyConsentEvent` while `StudyConsentCommandReceipt.consentEventId` is a concrete NOT-NULL FK to `StudyConsentEvent`. The stack did not state, verbatim, which event a no-op receipt references. This document adopts the brief-preferred reading — **a no-op receipt references the current effective historical `StudyConsentEvent`** (§11.4) — because it is the smallest completion consistent with the concrete-FK requirement and appends nothing new. This is flagged for Sol confirmation; it is **not** a design change and does **not** block the A1 gate.

---

## 1. Scope

A1 specifies and authorizes implementation of exactly:

- `AnalysisProtocol` registration / canonicalization / freeze **infrastructure**;
- `Experiment`;
- `StudyParticipant` (provisioning with a trusted recruitment identity);
- `ExperimentAssignment`;
- `StudyConsent` (append-only event stream + state machine + as-of authorization);
- the minimum trusted A1 provisioning / capability boundary;
- A1 operation-specific idempotency receipts;
- A1-owned SCI invariants and A1-owned adversarial tests.

A1 does **not** implement PurchaseIntent, decision binding, PurchaseOccasion, ResearchContact, weekly reports, opportunity reconciliation, evidence/VerifiedValue, or RIVSR (§14). A reviewer does not need B/C design to determine A1 correctness.

---

## 2. AnalysisProtocol — Effective Final Contract

Single authoritative representation. **No lifted semantic scalar columns.**

```
AnalysisProtocol {
  id                       PK
  protocolVersion          UNIQUE                 // business identity
  definitionSchemaVersion                          // which frozen local schema parses definitionJson
  canonicalizationVersion                          // which canonical-serialization algorithm produced the digest
  definitionJson                                   // the ONLY semantic authority (normalized)
  definitionDigest                                 // sha256(canonical(definitionJson))
  lifecycleStatus          DRAFT | FROZEN
  frozenAt?                                         // set exactly once
  createdAt                trusted
}
```

Prohibited as separate authoritative columns: `contaminationWindowHours`, `minVerifiedLevel`, `minIndependentOccasions`, `minReconciledOpportunities`, `observationWindowWeeks`, entry-source sets, baseline-kind sets, and any other semantic scalar. All semantics live inside `definitionJson`; query/analysis code parses the verified definition. This structurally eliminates JSON-vs-scalar-vs-hard-coded-constant drift.

**Responsibility split:**
- **Database owns:** FK, `UNIQUE(protocolVersion)`, lifecycle state, freeze immutability, delete protection of a FROZEN row. The DB does **not** reproduce the application canonical-JSON algorithm.
- **Application (service) owns:** canonical parse (via the frozen local schema at `definitionSchemaVersion`), canonical serialization (`canonicalizationVersion`), digest creation, digest verification.
- **Analysis owns:** re-verify before use — recompute the digest from the persisted `definitionJson` and **fail closed** on any mismatch. No runtime fallback to hard-coded constants.

### 2.1 Canonicalization pipeline (one contract)
```
trusted builder input
 → parse with frozen local protocol-definition schema (definitionSchemaVersion)
 → normalized parsed definition
 → M3.5A-compatible canonical JSON serialization (canonicalizationVersion)
 → sha256 → digest
 → persist exact normalized JSON + digest + both version tags
```
Analysis load:
```
load FROZEN row → parse with the row's historical definitionSchemaVersion
 → canonicalize with the row's historical canonicalizationVersion
 → recompute digest → compare → FAIL CLOSED on mismatch
```

### 2.2 Registration / Freeze
`DRAFT → FROZEN`, one-way. Steps: `register DRAFT → validate canonical definition → verify digest → freeze exactly once`. During the freeze transition none of `definitionJson / definitionDigest / definitionSchemaVersion / canonicalizationVersion` may change. **No combined "edit + freeze" operation.** A revision is a **new** `AnalysisProtocol` version row, never a mutation. DB freeze-guard trigger permits only `frozenAt: NULL→timestamp`, forbids any definition-bearing change after freeze, and forbids delete of a frozen row.

---

## 3. Production Protocol v1 Deferral (normative)

A1 implements protocol **infrastructure** and may freeze **synthetic complete test protocols** in tests. A1 **MUST NOT** freeze/register the real production PagaMenos `AnalysisProtocol v1` as scientifically complete until the mandatory B/C semantics that belong to protocol authority (opportunity-threshold uncertainty, missingness/withdrawal interpretation, PagaMenos value-attribution matrix, and the related B/C semantic definitions) have passed their own gates. This deferral does **not** block A1 infrastructure implementation.

---

## 4. Experiment — Effective Final Contract

```
Experiment {
  id                PK
  experimentCode    UNIQUE                        // business identity
  frozenProtocolId  FK → AnalysisProtocol (FROZEN) // sole protocol relationship
  recruitmentPolicy                                // included only where structurally required by authority
  createdAt         trusted
}
```

Rules: `frozenProtocolId` must reference a **FROZEN** protocol (FK + trigger — a bare CHECK cannot subquery). The `Experiment` is immutable once any `ExperimentAssignment` references it (trigger). There is exactly **one** protocol path: `assignment → experiment → frozen protocol`; there is **no** redundant protocol authority on `ExperimentAssignment`. The Experiment introduces no broad product-user concept — it is the population container plus the single protocol reference.

---

## 5. StudyParticipant — Final (R.1c) Contract

```
StudyParticipant {
  id                     PK
  recruitmentIdentityKey UNIQUE   // trusted research/system-issued; pre-creation domain identity; no PII
  participantCode        UNIQUE   // opaque participant-facing pseudonym; generated AFTER dedup
  createdAt              trusted
}
```

Three distinct identities (frozen):
```
domain provisioning identity = recruitmentIdentityKey   (UNIQUE; pre-creation dedup key)
public pseudonymous identity = participantCode           (opaque; generated post-dedup)
transport retry identity     = idempotencyKey            (in StudyParticipantRegistrationReceipt)
```

`recruitmentIdentityKey`: exists **before** participant creation; issued/resolved by the trusted research/system capability; **not** participant-authored; contains **no PII**; prevents duplicate-subject creation across transport-key rotation. Authority: FINAL §28 (research-issued participant code) + §30 access-controlled `IdentityMap (participantId ↔ email)` — the recruitment key is the **pseudonymous** enrollment identity (a research-issued enrollment/invite token or keyed digest held in the trusted boundary), never the raw email, which stays in the restricted `IdentityMap` outside the study domain. `participantCode` is generated **only after** dedup and is never used as the pre-creation dedup key. A participant-facing caller can choose neither value (impersonation guard). No broad authentication infrastructure is created.

### 5.1 Participant retry / concurrency behavior
| Case | Result |
| :-- | :-- |
| same transport key / same recruitmentIdentityKey | historical participant (receipt replay) |
| same transport key / different recruitmentIdentityKey | `StudyIdempotencyConflictError` |
| different transport key / same recruitmentIdentityKey (same payload) | same participant + durable alias receipt |
| different transport key / different recruitmentIdentityKey | distinct participants |
| concurrent different keys / same recruitmentIdentityKey | **exactly one** `StudyParticipant` (`UNIQUE(recruitmentIdentityKey)` + `P2002` reconciliation; loser aliases to winner) |

---

## 6. registerStudyParticipant — Sanctioned A1 Operation

```
registerStudyParticipant({ recruitmentIdentityKey })     // trusted capability only
```
Service steps: (1) resolve/validate the trusted `recruitmentIdentityKey` (reject if not trusted-issued); (2) look up existing `StudyParticipant` by `recruitmentIdentityKey`; (3) if absent, generate `participantCode` + trusted `createdAt`; (4) persist participant; (5) persist the concrete registration receipt; (6) on exact/domain retry, return the historical participant.

```
StudyParticipantRegistrationReceipt {
  id  operationScope = PARTICIPANT_REGISTER_V1     // internal constant, never caller-controlled
  idempotencyKey  requestHash
  participantId FK → StudyParticipant  createdAt
  UNIQUE(operationScope, idempotencyKey)
}
```
Concrete FK; no polymorphic target. `requestHash` per §13 (includes `recruitmentIdentityKey`; excludes sampled `id`/`participantCode`/`createdAt`).

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

Rules: `enrolledAt` is trusted system time; `observationStartAt = enrolledAt`; **no caller-provided anchor**; **no caller-provided window length**; **no redundant protocol id** (protocol reached via the experiment). `observationEndAt` is **derived at analysis time** as `observationStartAt + frozenProtocol.observationWindowWeeks` (the window length is read from the frozen `definitionJson`, never stored as a scalar — §2). The assignment is the **official population membership fact**; it is immutable (UPD/DEL/TRUNC denied) and is **not deleted on withdrawal** (withdrawal is a consent fact, §11). Anchor authority: participant-relative enrollment (Phase 0A analysis-eligible "during the four-week period"; prototype enrollment-relative window; RT-11.F window completion; 30–50 rolling magic-link recruits, FINAL §34).

---

## 8. Consent — Complete Final Contract

### 8.1 States and transitions
States (effective as-of): `NO_CONSENT` (no event yet), `GRANTED`, `WITHDRAWN`. Actions: `GRANT`, `WITHDRAW`. **Only state-changing transitions append a `StudyConsentEvent`.**

| From → action | Result |
| :-- | :-- |
| NO_CONSENT → GRANT | append GRANTED (first grant) |
| GRANTED → GRANT | **semantic no-op** — append nothing; return current effective GRANTED |
| GRANTED → WITHDRAW | append WITHDRAWN |
| WITHDRAWN → WITHDRAW | **semantic no-op** — append nothing; return current effective WITHDRAWN |
| WITHDRAWN → GRANT | **re-consent — AUTHORIZED** (append GRANTED) |
| NO_CONSENT → WITHDRAW | **reject** (`StudyConsentInvalidTransitionError`) |

**Re-consent is explicitly authorized** in the effective spec (`WITHDRAWN → GRANT` appends a new GRANTED event).

### 8.2 Temporal contract
Fields: `capturedAt` (trusted), `assertedEffectiveAt?` (optional self-reported context), `recordedAt` (persistence knowledge time), `consentSeq` (monotonic per assignment).
- **GRANT cannot authorize collection before trusted `capturedAt`.** Its authorization-effective instant = `capturedAt`; an earlier `assertedEffectiveAt` is retained as context and **never expands** authorization backward.
- **WITHDRAW stops collection no later than trusted `capturedAt`.** Its authorization-effective instant = `min(capturedAt, assertedEffectiveAt?)`; an earlier asserted withdrawal may **conservatively narrow** usable collection.
- Future-dated (scheduled) consent is not supported in A1.
- **Final/current consent is NOT used to retroactively invalidate previously authorized fact collection.** Collectibility of a fact is judged by whether an authorization interval was effective **at the fact's capture time** (pure `isCollectionAuthorized`, to be consumed by A2+).
- **Scientific-history preservation (withdrawal):** authorization, primary-denominator disposition, and sensitivity disposition are separate concerns. A later withdrawal does **not** delete the assignment and does **not** by itself remove a previously-authorized fact; conservative withdrawal handling (as a non-success, never a favorable deletion) is reserved for the C2 analysis but must not be precluded by A1 (§14). Legal/privacy deletion is out of scope and may override retention later.

### 8.3 Serialization (transaction)
```
1 resolve transport receipt (idempotent replay if present)
2 lock the ExperimentAssignment row FOR UPDATE
3 load effective consent state
4 validate the state transition (§8.1)
5 allocate consentSeq = previous + 1
6 append a StudyConsentEvent ONLY if state-changing
7 persist receipt / result
8 commit atomically
```
No naive concurrent `max(seq)+1`. `UNIQUE(assignmentId, consentSeq)` makes two successful same-sequence writes impossible under concurrency.

### 8.4 No-op receipt target (flagged, §0)
A no-op call (`GRANTED→GRANT`, `WITHDRAWN→WITHDRAW`) appends no new event and returns the current effective state. Its `StudyConsentCommandReceipt.consentEventId` references the **current effective historical `StudyConsentEvent`** (the smallest reading consistent with the concrete NOT-NULL FK). Marked UNRESOLVED A1 SPEC QUESTION for Sol confirmation; not a design change.

### 8.5 Same-instant contradiction
Contradictory `GRANT`/`WITHDRAW` at the **same authorization-effective instant** are **rejected** (`StudyConsentConflictError`). `consentSeq` provides deterministic historical ordering and idempotency sequencing only; it is **never** used to disambiguate simultaneous contradictory authorization. A same-action exact retry is handled by idempotency, never by appending a duplicate.

### 8.6 Scientific vs transport identity
```
scientific event identity = (assignmentId, consentSeq)
transport identity        = (operationScope, idempotencyKey)   // StudyConsentCommandReceipt
```
`consentBusinessKey` **does not exist**. Because no-op transitions append nothing (§8.1), a different transport key can **never** manufacture a duplicate semantic GRANT/WITHDRAW.

---

## 9. A1 Receipt Architecture (concrete strong-FK families only)

No polymorphic `targetId`. Each has `operationScope` (internal constant), `idempotencyKey`, `requestHash`, a concrete target FK, `createdAt`, `UNIQUE(operationScope, idempotencyKey)`; all append-only.

| Receipt | operationScope | Target FK |
| :-- | :-- | :-- |
| AnalysisProtocolCommandReceipt | PROTOCOL_REGISTER_V1, PROTOCOL_FREEZE_V1 | analysisProtocolId → AnalysisProtocol |
| ExperimentCreateReceipt | EXPERIMENT_CREATE_V1 | experimentId → Experiment |
| StudyParticipantRegistrationReceipt | PARTICIPANT_REGISTER_V1 | participantId → StudyParticipant |
| ExperimentAssignmentReceipt | ASSIGN_PARTICIPANT_V1 | assignmentId → ExperimentAssignment |
| StudyConsentCommandReceipt | CONSENT_GRANT_V1, CONSENT_WITHDRAW_V1 | consentEventId → StudyConsentEvent (effective event for no-ops, §8.4) |

---

## 10. Request-Hash Contract

```
requestHash = canonical(complete normalized MATERIAL caller request + stable trusted calling context)
```
**Excludes** sampled/derived outputs: generated DB id, `createdAt`, `enrolledAt`, `participantCode`, `consentSeq`, `capturedAt` — unless a value is genuinely material caller input (e.g. a caller-supplied `assertedEffectiveAt`, or `recruitmentIdentityKey`, which are included). Rules: same key + different material request → typed conflict (`StudyIdempotencyConflictError`); different key + same domain identity → **domain reconciliation** (alias if payload matches, else typed domain conflict), never blind aliasing. Under race, a caller requesting B never receives A as success (target-identity match AND payload-hash match required).

---

## 11. A1 Trust / Capability Model

Minimum effective boundary:

| Capability class | May | May NOT |
| :-- | :-- | :-- |
| research/system trusted | register/freeze protocol; create experiment; register participant (issue `recruitmentIdentityKey`/`participantCode`); assign participant; sample trusted timestamps | — |
| participant / participant-facing | request consent grant/withdraw for their own assignment | mint `recruitmentIdentityKey`, `participantCode`, protocol definitions, experiment assignments, or trusted timestamps |

No full authentication is added. The accepted M3.5A module-capability policy is preserved: raw repositories internal (`src/db/index.ts` exports nothing); deep DI internal; dynamic/computed imports fail closed; public production services bind trusted definitions with no injectable DI; the AST-based module-capability boundary test is extended to the new A1 modules. Engine/corpus remain byte-unchanged.

---

## 12. A1-Owned SCI Invariants

Each: requirement · source facts · enforcement · prohibited state · mandatory regression attack. Where an invariant has a later portion, the A1-owned portion is labeled.

**SCI-01 — Protocol is the single frozen semantic authority.** *A1-owned: full for infrastructure.* One authoritative representation (`definitionJson` + `definitionDigest`); analysis re-verifies, fails closed. Facts: `AnalysisProtocol.{definitionJson, definitionDigest, lifecycleStatus, frozenAt, definitionSchemaVersion, canonicalizationVersion}`. Enforce: DB freeze/lifecycle/uniqueness; service canonical+digest; analysis re-verify. Prohibited: lifted scalar authority; hard-coded runtime fallback; mutated frozen row. Attack: JSON/digest mismatch → fail closed; edit+freeze rejected. *Later portion:* production-v1 semantic completeness (B/C, §3).

**SCI-02 — ExperimentAssignment defines the official population.** *A1-owned: population identity.* Population = immutable assignments in the analyzed experiment; never a caller list. Amended (R.1c): assignments reference participants provisioned under a **unique trusted `recruitmentIdentityKey`**, so transport-key rotation/lost-response retries cannot mint duplicate participants and cannot inflate the population. Facts: `ExperimentAssignment(experimentId, participantId)`, `StudyParticipant.recruitmentIdentityKey`. Enforce: `UNIQUE(experimentId, participantId)`, `UNIQUE(recruitmentIdentityKey)`, immutability triggers. Prohibited: caller population; `includedInDenominator` flag; duplicate subject. Attack: duplicate-assignment rejected; lost-response participant retry → one participant. *Later portion:* denominator derivation (C2).

**SCI-03 — Observation window derives only from the frozen protocol.** *A1-owned: trusted anchor.* Window length solely from the frozen protocol; anchor trusted, not caller-chosen. Facts: `ExperimentAssignment.enrolledAt` + protocol `observationWindowWeeks` (in `definitionJson`). Enforce: `enrolledAt` immutable/trusted; window derived at analysis. Prohibited: caller weeks/anchor; per-participant weeks column. Attack: caller anchor/weeks rejected. *Later portion:* completion gate + future-fact non-leakage (C2).

**SCI-04 — Consent ordering and authorization are deterministic.** *A1-owned: full.* Reproducible independent of row order; contradictory simultaneous authorization rejected; forward-only authorization from `capturedAt`. Facts: `StudyConsentEvent{action, capturedAt, assertedEffectiveAt?, recordedAt, consentSeq}`. Enforce: assignment row lock + `consentSeq`; `UNIQUE(assignmentId, consentSeq)`; pure `effectiveConsentAsOf`/`isCollectionAuthorized`. Prohibited: row-order decisions; naive `max+1`; seq disambiguating contradiction; retro-authorization; favorable withdrawal removal. Attack: concurrent grant/withdraw deterministic; same-instant contradiction rejected; backdated grant → no retro-authorization.

**SCI-21 — Every retry identity covers complete material input.** *A1-owned: A1 writes.* Each fingerprint hashes all material caller input + stable trusted context, excluding sampled outputs; participant fingerprint includes `recruitmentIdentityKey`. Facts: typed receipts. Enforce: `UNIQUE(operationScope, idempotencyKey)`; canonical request hash. Prohibited: partial fingerprints; sampled id/seq/time in hash; conflating domain and transport identity. Attack: omitted-field retry → conflict; key-rotation no duplicate.

**SCI-24 — Accepted M3.5A semantics/tables remain untouched.** *A1-owned: full.* No ALTER/mutation of `decision_snapshot`/`decision_idempotency_receipt`; engine/corpus byte-unchanged; module-capability boundary preserved. Enforce: new tables + virtual back-relations; boundary tests; engine/corpus diff empty. Prohibited: reusing `DecisionIdempotencyReceipt` polymorphically for study writes. Attack: engine/corpus diff non-empty → fail; boundary scan offender → fail.

---

## 13. A1 R35R Closure

| ID | Subject | How A1 closes it |
| :-- | :-- | :-- |
| R35R-07 | consent `max(seq)+1` not race-safe; same-time contradiction conflict | §8.3 lock+seq serialization; §8.5 reject same-instant contradiction; `UNIQUE(assignmentId, consentSeq)` |
| R35R-08 | consent backdating retro-authorizes; final-consent favorably removes withdrawals | §8.2 forward-only authorization from `capturedAt`; collectibility judged at capture time; withdrawal history preserved, no favorable removal |
| R35R-09 | protocol JSON/digest/lifted-semantics coherence undefined | §2 single representation, no scalars; §2.1 one canonicalization pipeline + versions; analysis re-verify fail-closed |
| R35R-10 | assignment redundantly stores protocol authority; anchor caller-selectable | §4 single `Experiment→Protocol` path (no `assignedProtocolId`); §7 trusted enrollment anchor |
| R35R-11 | SCI-01…25 need explicit normative definitions | §12 normative A1-owned SCI clauses |
| R35R-15 | no concrete study-write idempotency; `DecisionIdempotencyReceipt` not reusable | §9 concrete strong-FK receipt families; §10 request-hash contract |
| (R.1c) | StudyParticipant domain identity before `participantCode` | §5 `recruitmentIdentityKey` pre-creation dedup; §5.1 concurrency; §6 registration |

No B/C findings are claimed closed.

---

## 14. Non-A1 Contracts / Deferred Boundaries

**A2/B/C are NOT authorized by this document.** A1 must not preclude them. Compatibility constraints:
- Production `AnalysisProtocol v1` remains **unfrozen** until B/C protocol-authority semantics clear their gates (§3).
- A2 (PurchaseIntent lifecycle, decision request/binding), B (opportunity/occasion identity, reconciliation), and C (evidence/attribution, VS/RIVSR/as-of) are **not** implemented and their schemas are **not** part of A1 tables.
- A1 does **not** implement RIVSR, evidence, decision binding, or research-contact semantics.
- **PurchaseIntent count is not an opportunity/denominator count** (reserved for B reconciliation).
- Consent `isCollectionAuthorized` (capture-time authorization) is defined here so A2+ can consume it without reopening A1.

---

## 15. A1 Adversarial Test Contract (expected results)

| Test | Expected |
| :-- | :-- |
| protocol JSON/digest mismatch | fail closed |
| runtime hard-coded fallback attempt | rejected (analysis reads persisted FROZEN definition only) |
| freeze via edit+freeze in one transition | rejected |
| frozen protocol UPDATE / DELETE | rejected (freeze-guard) |
| experiment references DRAFT protocol | rejected (FK + FROZEN trigger) |
| redundant assignment protocol authority | absent by construction (no `assignedProtocolId`) |
| same recruitment subject: K1 response lost, K2 retry | one `StudyParticipant` |
| concurrent K1/K2 same `recruitmentIdentityKey` | one `StudyParticipant` |
| participantCode caller-chosen | rejected (system-issued only) |
| same participant assigned twice in one experiment | one assignment (`UNIQUE`) |
| caller-supplied observation anchor/weeks | rejected |
| assignment UPDATE/DELETE/TRUNCATE | rejected |
| grant backdated earlier (`assertedEffectiveAt` < `capturedAt`) | no retro-authorization (authorized from `capturedAt`) |
| withdraw backdated earlier | conservative narrowing only |
| GRANT repeated same key | idempotent replay, no new event |
| GRANT repeated different key (already GRANTED) | no-op, no new event |
| WITHDRAW repeated different key (already WITHDRAWN) | no-op, no new event |
| concurrent consent transitions | serialized; deterministic; contradictory same-instant rejected |
| same transport key / different material request | `StudyIdempotencyConflictError` |
| re-consent (WITHDRAWN→GRANT) | new GRANTED appended |
| NO_CONSENT→WITHDRAW | `StudyConsentInvalidTransitionError` |

---

## 16. Database Implementability Table

| A1 invariant | Enforcement |
| :-- | :-- |
| protocolVersion unique | UNIQUE |
| experiment → FROZEN protocol | FK + trigger (FROZEN check) |
| freeze one-way; frozen immutable; no delete of frozen | trigger (freeze-guard) |
| protocol digest = canonical(definition) | service (create) + analysis re-verify (fail closed) |
| experiment immutable once referenced | trigger |
| participant recruitment dedup | UNIQUE(recruitmentIdentityKey) + row reconciliation (P2002) |
| participantCode unique/opaque | UNIQUE + service issuance (not caller) |
| assignment population uniqueness | UNIQUE(experimentId, participantId) |
| assignment immutable; no delete on withdrawal | trigger (UPD/DEL/TRUNC) |
| trusted enrolledAt / observationStartAt | service (trusted clock); no caller anchor |
| consent event identity | UNIQUE(assignmentId, consentSeq) |
| consent serialization | row lock FOR UPDATE + transaction |
| consent transition legality; no-op no-append | service validation (state machine) |
| consent append-only | trigger (UPD/DEL/TRUNC) |
| receipt idempotency | UNIQUE(operationScope, idempotencyKey) + concrete FK |
| capability boundary (no raw repo from arbitrary code) | module-capability boundary test + ESLint |
| effective consent / authorization as-of | pure derivation |

No cross-table CHECK is claimed where PostgreSQL CHECK cannot legally query another table (those are triggers).

---

## 17. Effective A1 Service Table

| Operation | Capability | Inputs | Trusted-derived | Transaction / lock | Receipt | Domain uniqueness | Failure conditions |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| registerAnalysisProtocolDraft | research/system | builder definition, protocolVersion | normalized JSON, digest, version tags | insert | AnalysisProtocolCommandReceipt (REGISTER) | protocolVersion | invalid definition; duplicate version |
| freezeAnalysisProtocol | research/system | protocolId | frozenAt | update lifecycle only (freeze-guard) | AnalysisProtocolCommandReceipt (FREEZE) | — | already frozen; definition changed; digest mismatch |
| createExperiment | research/system | experimentCode, frozenProtocolId, recruitmentPolicy? | — | insert | ExperimentCreateReceipt | experimentCode | protocol not FROZEN; duplicate code |
| registerStudyParticipant | research/system | recruitmentIdentityKey | participantCode, createdAt | insert (unique guard) | StudyParticipantRegistrationReceipt | recruitmentIdentityKey | untrusted identity; conflict on key/different payload |
| assignParticipant | research/system | experimentId, participantId | enrolledAt, observationStartAt | insert (unique guard) | ExperimentAssignmentReceipt | (experimentId, participantId) | unknown experiment/participant; duplicate; caller anchor/weeks rejected |
| recordConsentGrant | participant/system | assignmentId, assertedEffectiveAt? | capturedAt, consentSeq | lock assignment FOR UPDATE; state-machine eval | StudyConsentCommandReceipt (GRANT) | (assignmentId, consentSeq) | contradictory same-instant |
| recordConsentWithdrawal | participant/system | assignmentId, assertedEffectiveAt? | capturedAt, consentSeq | lock assignment FOR UPDATE; state-machine eval | StudyConsentCommandReceipt (WITHDRAW) | (assignmentId, consentSeq) | `StudyConsentInvalidTransitionError` (NO_CONSENT→WITHDRAW); contradictory same-instant |
| loadFrozenProtocolForAnalysis | analysis | protocolId/version | recomputed digest | read only | — | — | not FROZEN; digest mismatch → fail closed |

No-op consent transitions return the current effective state without appending an event; the receipt references the effective historical event (§8.4).

---

## 18. Effective A1 Entity Table (implementation-authorized)

| Entity | PK | Domain identity | FKs | UNIQUE | CHECK | Immutability | Timestamps | Receipt relationship |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| AnalysisProtocol | id | protocolVersion | — | protocolVersion | lifecycleStatus∈{DRAFT,FROZEN} | freeze-guard (immutable after freeze; no delete of frozen) | createdAt, frozenAt? | AnalysisProtocolCommandReceipt |
| Experiment | id | experimentCode | frozenProtocolId→AnalysisProtocol | experimentCode | — | immutable once referenced | createdAt | ExperimentCreateReceipt |
| StudyParticipant | id | recruitmentIdentityKey | — | recruitmentIdentityKey; participantCode | no PII | append-only | createdAt | StudyParticipantRegistrationReceipt |
| ExperimentAssignment | id | (experimentId, participantId) | experimentId, participantId | (experimentId, participantId) | — | UPD/DEL/TRUNC denied | enrolledAt, observationStartAt, createdAt | ExperimentAssignmentReceipt |
| StudyConsentEvent | id | (assignmentId, consentSeq) | assignmentId | (assignmentId, consentSeq) | action∈{GRANTED,WITHDRAWN} | append-only | capturedAt, recordedAt | StudyConsentCommandReceipt |
| AnalysisProtocolCommandReceipt | id | (operationScope, idempotencyKey) | analysisProtocolId | (operationScope, idempotencyKey) | scope∈{REGISTER,FREEZE} | append-only | createdAt | — |
| ExperimentCreateReceipt | id | (operationScope, idempotencyKey) | experimentId | (operationScope, idempotencyKey) | — | append-only | createdAt | — |
| StudyParticipantRegistrationReceipt | id | (operationScope, idempotencyKey) | participantId | (operationScope, idempotencyKey) | — | append-only | createdAt | — |
| ExperimentAssignmentReceipt | id | (operationScope, idempotencyKey) | assignmentId | (operationScope, idempotencyKey) | — | append-only | createdAt | — |
| StudyConsentCommandReceipt | id | (operationScope, idempotencyKey) | consentEventId | (operationScope, idempotencyKey) | scope∈{GRANT,WITHDRAW} | append-only | createdAt | — |

No A2/B/C tables are authorized here.

---

## 19. Exact Next Action

**STOP.** Submit this consolidated A1 effective specification for the independent Codex Sol A1 gate. On clearance, implement **M3.5B-A1** on `64cf864` (after archiving `1ded28d` as `archive/m3.5b-prototype-nogo`), as one or more additive commits that never touch `src/engine`, `src/corpus/data`, or the accepted M3.5A tables. Then the independent A2 gate. No implementation, migrations, Git, or Wave 0 before the gate.

---

# Final Consolidation Verdict

## A1 EFFECTIVE SPEC CONSOLIDATED — READY FOR INDEPENDENT GATE

The four-document stack folds into one unambiguous, self-contained A1 specification with no invented requirements and no surviving obsolete alternatives. All A1-relevant Sol findings (R35R-07/08/09/10/11/15 + the StudyParticipant identity closure) are closed; A1-owned SCI-01/02/03/04/21/24 are normative; the entity/service/receipt/DB tables are implementation-ready; and A2/B/C remain non-authorized compatibility boundaries with production Protocol v1 unfrozen. One low-severity item (the no-op consent receipt's FK target, §0/§8.4) is explicitly flagged for Sol confirmation as an UNRESOLVED A1 SPEC QUESTION rather than silently resolved; it does not block the gate. No implementation GO is self-declared.

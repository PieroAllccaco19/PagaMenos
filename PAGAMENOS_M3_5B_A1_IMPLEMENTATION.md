# PagaMenos — M3.5B-A1 Implementation Report

**Milestone:** M3.5B-A1 — Protocol / Experiment / Assignment / Consent Authority.
**Authoritative design:** `PAGAMENOS_M3_5B_A1_EFFECTIVE_SPEC_V2_1.md` (the ONLY normative source; V1/V2/R.x superseded).
**Status:** **ACCEPTED** by the independent Codex Sol A1 gate (`A — M3.5B-A1 IMPLEMENTATION ACCEPTED`). **Accepted implementation SHA: `99f2d61bc45839d6f9506abee5fae641bfcd8b2e`.** Sol raised one LOW, non-blocking documentation finding — **A1-DOC-01** (stale candidate inventory in this report) — which this revision corrects; the accepted implementation SHA is unchanged (this is a documentation-only child commit).

**Audit history:** the first candidate `a0ef79a5092492b27c657a66fb39b8b515a93073` **FAILED** the Sol code gate (`B — M3.5B-A1 IMPLEMENTATION REQUIRES PATCH`) on six independently demonstrated implementation defects (§Q). Those defects were closed by an additive repair commit `99f2d61…` — the independently **accepted** implementation SHA. `a0ef79a…` is preserved as rejected audit evidence; the first candidate did NOT pass.

This is additive over the accepted M3.5A persistence baseline. Every DB-behavior claim below was verified against real PostgreSQL 18.4 (ephemeral cluster via `scripts/pg-integration.ts`), not mocks.

---

## Q. Patch closure after the Sol code gate (candidate `a0ef79a…` → repaired)

The prior report's claims about `TrustedParticipantContext` unforgeability, production recruitment-resolver stability, "complete protocol freeze", and "no material deviations" were **inaccurate** and are corrected here. Closure matrix (all CLOSED):

| Finding | Status | Fix (file) | Test(s) — real-PG where DB behavior matters |
| :-- | :-- | :-- | :-- |
| **A1-CODE-01** TrustedParticipantContext forgeable (CRITICAL) | **CLOSED** | Authority is now a MODULE-PRIVATE `WeakSet` registry: `isTrustedParticipantContext` tests registry membership, not shape/symbols; contexts are `Object.freeze`d; the creation primitive `createTrustedParticipantContext` is NOT on the `@/study` or public `@/services` barrel — it is reachable only via the trusted session adapter `resolveTrustedParticipantContext` (`src/services/study-participant-session.ts`), off-limits to app/arbitrary code (ESLint + AST test). `mintTrustedParticipantContext` was removed from every public export (`src/study/participant-context.ts`, `src/study/index.ts`, `src/services/index.ts`). | `src/study/participant-context.test.ts` (plain object / `as unknown as` / spread / clone / symbol-copy / JSON round-trip / prototype-inherit / mutation all rejected); `module-capability.test.ts` (app cannot import the creation submodule or the adapter, any spelling); integration "a non-trusted / forged / derived context object is rejected" — A's authority cannot append to B; zero B events/receipts (real PG). |
| **A1-CODE-02** recruitment identity not durable (HIGH) | **CLOSED** | New DURABLE identity boundary: `recruitment_subject_identity` (subjectAnchor → issued key+version, authoritative forever) and `recruitment_credential_link` (credential → anchor, no silent reassignment), both append-only. New repo `src/db/study-recruitment-repository.ts`; production default resolver is now `DurableRecruitmentResolver` (`src/services/study-recruitment.ts`) which consults durable issuance BEFORE deriving; provisioning `linkRecruitmentCredential`. The non-durable `InMemoryRecruitmentResolver` was **removed**. | integration: rotated invite → same participant; identity survives a default key-version advance AND a fresh resolver instance (process-restart proxy); credential reassignment → conflict, re-link idempotent; concurrent rotated credentials → one durable subject → one participant (real PG). |
| **A1-CODE-03** protocol lifecycle/frozenAt incoherence (HIGH) | **CLOSED** | Named DB CHECK `analysis_protocol_lifecycle_frozenat_ck` (DRAFT⇒frozenAt NULL, FROZEN⇒frozenAt NOT NULL) in the A1 migration. | integration "the lifecycle↔frozenAt CHECK makes malformed protocol rows impossible" — DRAFT+non-NULL and FROZEN+NULL both rejected by the **named** constraint (real PG). |
| **A1-CODE-04** freeze can freeze a digest-invalid DRAFT (HIGH) | **CLOSED** | The repo freeze now, inside the SAME `FOR UPDATE`-locked transaction, re-parses the persisted `definitionJson` with the row's own version tags, recomputes the digest, and `verifyProtocolDefinition` fails closed (no transition, no receipt) on mismatch — no TOCTOU (`src/db/study-protocol-repository.ts`). | integration "a digest-invalid DRAFT CANNOT be frozen" → `StudyProtocolDigestMismatchError`, stays DRAFT, frozenAt NULL, 0 receipts, and cannot back an experiment (real PG). |
| **A1-CODE-05** DB does not enforce observationStartAt == enrolledAt (MEDIUM) | **CLOSED** | Named DB CHECK `experiment_assignment_anchor_eq_ck` (`"observationStartAt" = "enrolledAt"`) in the A1 migration. | integration "the DB enforces observationStartAt == enrolledAt" — equal accepted, unequal rejected by the **named** constraint (real PG). |
| **A1-CODE-06** different-key freeze retry does not reconcile (MEDIUM) | **CLOSED** | The repo freeze reconciles a different-key semantic retry against an already-FROZEN protocol to the existing successful freeze (durable K2 alias receipt, no second protocol, no mutation); a materially incompatible request conflicts. Freeze input gained an OPTIONAL `expectedDefinitionDigest` precondition (`src/study/schema.ts`, `src/services/study-protocol-admin.ts`) so a retry can never alias to a protocol whose digest differs from the caller's intent; `frozenAt` is never in the request identity. | integration "freeze different-key retry reconciles…" (same-key replay; different-key alias → 2 freeze receipts, 1 protocol; non-equivalent expected digest → `StudyDomainConflictError`, no new receipt); "concurrent different-key freezes → one transition, two receipts" (real PG). |

Additional hardening requested by the gate: participant key/version coherence check on alias (`StudyDomainConflictError`, spec §14); a focused `participantCode`-collision test proving a code collision is retried and NEVER treated as same-subject reconciliation (§27, injectable code generator); the new DB regressions assert **named constraints** rather than generic throws (§28).

**Regression after patch (all green):** `db:validate` ok; `db:migrate:check` ok (13 append-only tables + both new CHECKs + freeze-guard + experiment guard); `typecheck` / `lint` exit 0; `pnpm test` **429 passed** (25 files); `pnpm test:integration` **62 passed** (staged-upgrade 3 + study-authority 36 + decision-snapshot 23) against real PostgreSQL; `migrate diff --exit-code` = "No difference detected" (no drift). Engine/corpus byte-unchanged; accepted M3.5A migrations/tables untouched; no A2/B/C; production Protocol v1 unfrozen; no Wave 0.

**Migration approach (§30):** the A1 migration is an UNACCEPTED, undeployed candidate migration, so it was corrected **in place** (the two new CHECKs, the two durable recruitment tables + their append-only triggers) — keeping a clean, deterministic baseline→candidate history (`prisma migrate diff` confirms zero drift). No accepted historical migration was touched.

---

## A. Baseline / Git safety

- **Starting baseline SHA (exact):** `64cf864a817c137920204487ab3317bc6d4c9ba5` (accepted M3.5A).
- **Failed prototype (evidence only, NOT a baseline):** `1ded28d28038d4a385628683da096f846439a100` (Codex Sol: `C — NO-GO`). Not built upon; not cherry-picked.
- **Archive ref (non-destructive):** `refs/heads/archive/m3.5b-prototype-nogo → 1ded28d…` created via `git update-ref` (created only because it did not already exist). The failed prototype remains durably addressable.
- **Implementation isolation:** a separate Git **worktree** at `C:/Users/piero/pagamenos-a1` on a fresh branch **`m3.5b-a1-implementation`** based EXACTLY on `64cf864…`. The user's original working tree (`master` @ `1ded28d`, plus the three untracked spec files) was left untouched — no `git reset --hard`, `git clean`, or `git checkout -- .` was run against it.
- **Unrelated work preserved:** confirmed. `master` still points at `1ded28d`; the untracked `PAGAMENOS_M3_5B_A1_EFFECTIVE_SPEC*.md` files in the original tree are unmodified. V2.1 was copied (not moved/edited) into the worktree for reference.

## B. Files changed — final accepted candidate `99f2d61…` (39 files; +6085 / −5 vs baseline `64cf864…`, Sol-verified)

The five deletions are line replacements in the modified infra files; `src/engine` and `src/corpus` are byte-unchanged (§L SCI-24). This inventory is the FINAL accepted set (includes the A1-CODE-01/02 closure-patch files); the mid-review candidate `a0ef79a…` had 35 files (+5145/−5) before the patch added the durable-recruitment and trusted-session files below.

**Added — pure domain (`src/study/`):** `errors.ts`, `versions.ts`, `protocol-definition.ts`, `consent-state.ts`, `schema.ts`, `request-hash.ts`, `recruitment.ts` (resolver **contract** only — the non-durable in-memory resolver was removed in the patch), `participant-context.ts` (WeakSet-registry authority, A1-CODE-01), `index.ts` (+ tests: `consent-state.test.ts`, `protocol-definition.test.ts`, `request-hash.test.ts`, `schema.test.ts`, `participant-context.test.ts`).
**Added — raw repositories (`src/db/`, internal):** `study-support.ts`, `study-protocol-repository.ts`, `study-experiment-repository.ts`, `study-participant-repository.ts`, `study-assignment-repository.ts`, `study-consent-repository.ts`, **`study-recruitment-repository.ts`** (durable recruitment identity, A1-CODE-02) (+ `study-authority.integration.test.ts`).
**Added — sanctioned services (`src/services/`):** `study-protocol-admin.ts`, `study-experiment-admin.ts`, `study-recruitment.ts` (now hosts the durable `DurableRecruitmentResolver` + `linkRecruitmentCredential`), `study-assignment-admin.ts`, `study-consent.ts`, `study-analysis.ts`, **`study-participant-session.ts`** (trusted context adapter, A1-CODE-01), `study-admin.ts` (trusted barrel; re-exports the session adapter + provisioning).
**Added — migration:** `prisma/migrations/20260901120000_m3_5b_a1_study_authority/migration.sql` (includes the two durable recruitment tables + the two coherence CHECKs added in the patch).
**Added — docs:** `PAGAMENOS_M3_5B_A1_IMPLEMENTATION.md` (this report), `PAGAMENOS_M3_5B_A1_EFFECTIVE_SPEC_V2_1.md` (spec copied into the worktree for reference; normative contents unchanged).
**Modified:** `prisma/schema.prisma` (additive), `eslint.config.mjs` (study-admin + participant-context/session boundary + sanctioned-impl exemptions), `src/lib/module-capability.test.ts` (operation-specific study ownership incl. participant-context/session), `src/services/index.ts` (participant/read surface; `mint…` removed), `scripts/migrate-check.ts` (A1 guard/CHECK assertions, 13 append-only tables + both new CHECKs), `scripts/pg-integration.ts` (run A1 integration suite).

## C. Data model (exact — `prisma/schema.prisma`, additive only)

Enums: `AnalysisProtocolLifecycle{DRAFT,FROZEN}`, `StudyConsentAction{GRANTED,WITHDRAWN}`, `StudyConsentResultKind{EVENT_APPENDED,NO_OP_EFFECTIVE_STATE,CORRECTION_NOT_APPLIED}`.

| Model (`@@map`) | Domain identity / UNIQUE | Key columns | FKs |
| :-- | :-- | :-- | :-- |
| `AnalysisProtocol` (`analysis_protocol`) | `protocolVersion` UNIQUE | `definitionSchemaVersion`, `canonicalizationVersion`, `definitionJson` (JSONB), `definitionDigest`, `lifecycleStatus`, `frozenAt?`, `createdAt` | — |
| `Experiment` (`experiment`) | `experimentCode` UNIQUE | `createdAt` | `frozenProtocolId → analysis_protocol` |
| `StudyParticipant` (`study_participant`) | `recruitmentSubjectKey` UNIQUE; `participantCode` UNIQUE | `recruitmentKeyVersion`, `createdAt` | — |
| `ExperimentAssignment` (`experiment_assignment`) | `UNIQUE(experimentId, participantId)` | `enrolledAt`, `observationStartAt`, `createdAt` | `experimentId`, `participantId` |
| `StudyConsentEvent` (`study_consent_event`) | `UNIQUE(assignmentId, consentSeq)` | `action`, `consentVersion?`, `privacyNoticeVersion?`, `optionalEvidenceConsent?`, `assertedEffectiveAt?`, `capturedAt`, `recordedAt` | `assignmentId` |
| `AnalysisProtocolCommandReceipt` | `UNIQUE(operationScope, idempotencyKey)` | `requestHash` | `analysisProtocolId` |
| `ExperimentCreateReceipt` | `UNIQUE(operationScope, idempotencyKey)` | `requestHash` | `experimentId` |
| `StudyParticipantRegistrationReceipt` | `UNIQUE(operationScope, idempotencyKey)` | `requestHash` | `participantId` |
| `ExperimentAssignmentReceipt` | `UNIQUE(operationScope, idempotencyKey)` | `requestHash` | `assignmentId` |
| `StudyConsentCommandReceipt` | `UNIQUE(operationScope, idempotencyKey)` | `requestHash`, `resultKind` | `consentEventId` |
| `RecruitmentSubjectIdentity` (`recruitment_subject_identity`) — *A1-internal trusted recruitment/identity infrastructure (not study truth, no PII), A1-CODE-02* | `subjectAnchor` UNIQUE; `recruitmentSubjectKey` UNIQUE | `recruitmentKeyVersion`, `createdAt` | — |
| `RecruitmentCredentialLink` (`recruitment_credential_link`) — *A1-internal trusted recruitment/identity infrastructure (not study truth, no PII), A1-CODE-02* | `credential` UNIQUE | `subjectAnchor` (indexed), `createdAt` | — |

The two `recruitment_*` models are **A1-internal recruitment-provisioning infrastructure** (the trusted recruitment/identity boundary, spec §5/§11/§13), NOT study-domain truth: they hold no PII and no raw email, only a pseudonymous subject anchor, the durably-issued stable key + version, and the rotating-credential → anchor binding. They exist so recruitment-subject identity is durable across credential rotation, key-version evolution, and process restart (A1-CODE-02). Both are append-only (DB triggers).

**No lifted semantic scalar columns** on `AnalysisProtocol` (no `observationWindowWeeks`/`contaminationWindowHours`/etc.) — all protocol semantics live in verified `definitionJson` (spec §2). No `recruitmentPolicy`/`assignedProtocolId` on `Experiment` (spec §4). No `includedInDenominator` on assignment. Concrete strong-FK receipts only — no polymorphic target; `DecisionIdempotencyReceipt` is NOT reused (spec §9/§25).

## D. Migration (`20260901120000_m3_5b_a1_study_authority/migration.sql`, one transaction)

Base DDL generated by `prisma migrate diff` (schema↔migrations verified drift-free: `migrate diff --exit-code` = "No difference detected"), plus hand-written DB-level enforcement Prisma cannot express:

- **Freeze-guard** (`analysis_protocol_freeze_guard` + triggers `_update`, `_delete`; `analysis_protocol_no_truncate`): the ONLY permitted UPDATE is DRAFT→FROZEN with `frozenAt` NULL→timestamp and **every other column unchanged** (incl. JSONB equality); a FROZEN row rejects all UPDATE; DELETE and TRUNCATE rejected (spec §2.2).
- **Experiment FROZEN-protocol guard** (`experiment_requires_frozen_protocol` + `experiment_frozen_protocol_guard`, BEFORE INSERT): a cross-table check that `frozenProtocolId` references a FROZEN protocol (spec §4).
- **Append-only / immutability** (`study_forbid_mutation` + per-table `_no_update`/`_no_delete`/`_no_truncate`): `experiment` (immutable immediately), `study_participant`, `experiment_assignment`, `study_consent_event`, all five receipt tables, and the two `recruitment_*` identity tables (13 append-only tables total).
- **§8.11 single-table CHECK** `study_consent_event_action_provenance_ck`: `GRANTED ⇒ provenance NOT NULL AND assertedEffectiveAt IS NULL`; `WITHDRAWN ⇒ provenance NULL` (assertedEffectiveAt free).
- **Protocol lifecycle CHECK** `analysis_protocol_lifecycle_frozenat_ck` (A1-CODE-03): `DRAFT ⇒ frozenAt NULL`; `FROZEN ⇒ frozenAt NOT NULL` — malformed lifecycle/frozenAt rows impossible at INSERT and beyond.
- **Assignment anchor CHECK** `experiment_assignment_anchor_eq_ck` (A1-CODE-05): `observationStartAt = enrolledAt` enforced at the DB.
- **Receipt operationScope CHECKs** (`*_scope_ck`): each receipt table restricted to its trusted constant(s).
- All UNIQUE/FK/index constraints per §C. `ON DELETE RESTRICT` on every study FK. The A1 migration was corrected in place while unaccepted/undeployed (§30); `prisma migrate diff --exit-code` confirms zero drift at the accepted SHA.

FKs, UNIQUEs, CHECKs, triggers enumerated in the migration file; guarded offline by `pnpm db:migrate:check` (extended for all A1 objects).

## E. Services (sanctioned A1 operations)

| Operation | Module | Capability | Notes |
| :-- | :-- | :-- | :-- |
| `registerAnalysisProtocolDraft`, `freezeAnalysisProtocol` | `study-protocol-admin.ts` | ProtocolAdministration | canonical build + digest; freeze = the one exact UPDATE; trusted `frozenAt` |
| `createExperiment` | `study-experiment-admin.ts` | ExperimentAdministration | FROZEN pre-check + DB guard |
| `registerStudyParticipant` | `study-recruitment.ts` | RecruitmentProvisioning | DURABLE resolver → stable key; hash uses stable key+version only |
| `linkRecruitmentCredential` | `study-recruitment.ts` | RecruitmentProvisioning | durably binds a rotating credential → subject anchor (A1-CODE-02); no silent reassignment |
| `assignParticipant` | `study-assignment-admin.ts` | AssignmentAdministration | trusted `enrolledAt`; `observationStartAt = enrolledAt` |
| `resolveTrustedParticipantContext` | `study-participant-session.ts` | trusted session adapter | the ONLY construction path for a `TrustedParticipantContext` (A1-CODE-01); off the public barrel |
| `recordConsentGrant`, `recordConsentWithdrawal` | `study-consent.ts` | ParticipantConsent (trusted context) | schema-validate → own-assignment → hash → serialized append |
| `loadFrozenProtocolForAnalysis` | `study-analysis.ts` | analysis (read) | fail-closed digest re-verification |

## F. Capability boundary (exact allowed-module enforcement)

Two layers: (1) **ESLint** coarse block (`eslint.config.mjs`) — app/participant-facing (`src/app|analytics|sourcemon|lib`) and arbitrary `src/services/**` cannot import `@/db/**` (raw study repos included) nor the trusted study-admin surface (`@/services/study-*-admin`, `@/services/study-recruitment`, `@/services/study-assignment-admin`, `@/services/study-admin`); the seven sanctioned study impl files are exempted. (2) **AST module-capability test** (`src/lib/module-capability.test.ts`) — the mechanical, syntax-proof (static/dynamic import, relative, `.js`/`.ts`, static template) **operation-specific ownership**:

- Each raw study repo importable ONLY by its owning service: protocol→`study-protocol-admin`(+`study-analysis` read), experiment→`study-experiment-admin`, participant→`study-recruitment`, assignment→`study-assignment-admin`, consent→`study-consent`.
- Admin service modules importable ONLY by the `study-admin` barrel (read-only analysis load also by the public `@/services` barrel); non-literal dynamic imports stay fail-closed for study modules.
- Participant consent operates through a runtime-unforgeable `TrustedParticipantContext` — authority is a module-private `WeakSet` registry (A1-CODE-01), not a symbol/shape — constructed only by the trusted session adapter (`@/services/study-admin`), and the consent service enforces own-assignment binding at runtime (spec §12).

Raw study repositories are unreachable from arbitrary production modules; `src/db/index.ts` still exports nothing.

## G. Protocol implementation (canonicalization / versioning / freeze / load)

`buildProtocolDefinition` = parse (frozen schema @`definitionSchemaVersion`) → normalize → canonicalize (@`canonicalizationVersion`, **reusing the accepted M3.5A `canonicalize`** — no second canonicalizer) → SHA-256 → digest. `verifyProtocolDefinition` re-parses the persisted `definitionJson` with the **row's own** version tags, recomputes, compares, and **fails closed** (`StudyProtocolDigestMismatchError`) — with `UnsupportedStudyVersionError` on any unknown version and **no fallback to current constants** (spec §2.1). Freeze is the single exact UPDATE, enforced in the service, the repository (row-locked `updateMany` guarded by `lifecycleStatus='DRAFT'`), and the DB freeze-guard trigger. Freeze idempotency is stable across the DRAFT→FROZEN transition (the freeze hash pins protocolVersion + unchanged digest under a fixed DRAFT precondition). Production Protocol v1 is NOT frozen (see §N); tests use synthetic complete definitions.

## H. Participant / assignment implementation (stable key & concurrency)

Dedup is by the stable `recruitmentSubjectKey` (`UNIQUE` + Prisma P2002 reconciliation); rotated credentials for the same subject converge to one participant (resolver maps credential→subject anchor→stable key). `participantCode` is opaque and system-issued AFTER dedup (never caller input). The material request hash uses the stable key + version only, never the rotating credential (spec §10). Concurrent different-key/same-subject registrations resolve to exactly one participant (verified with `Promise.all` against real PG). Assignment enrollment is the trusted clock with `observationStartAt = enrolledAt`; `UNIQUE(experimentId, participantId)` dedups; the row is immutable and never deleted on withdrawal.

## I. Consent implementation (state machine, temporal algorithm, receipts, idempotency)

- **Serialization (spec §8.10):** schema validation FIRST (service), then in ONE transaction the consent repository locks the `experiment_assignment` row `FOR UPDATE`, replays an exact transport receipt, reloads state ordered by `consentSeq`, evaluates the pure state machine, allocates `consentSeq` and samples trusted `capturedAt` **under the lock**, appends an event only when state-changing, and appends the receipt with its `resultKind`. Row lock + sequence are the only concurrency/order authority (no unlocked `MAX+1`).
- **State machine (spec §8.3, pure `evaluateGrant`/`evaluateWithdraw`):** NO_CONSENT+GRANT→append; NO_CONSENT+WITHDRAW→reject; GRANTED+exact GRANT→NO_OP; GRANTED+different GRANT→`StudyConsentUpdateNotSupportedError`; GRANTED+WITHDRAW→**always** append; WITHDRAWN+GRANT→reject (no re-consent); WITHDRAWN+exact WITHDRAW→NO_OP; WITHDRAWN+changed WITHDRAW→CORRECTION_NOT_APPLIED.
- **Temporal algorithm (spec §8.6/§16, pure `deriveConsentAuthorizationIntervals`):** ordered by `consentSeq` (never asserted time); GRANT opens at `capturedAt`; WITHDRAW closes at `min(capturedAt, assertedEffectiveAt ?? capturedAt)`; `closeAt>startAt ⇒ [startAt,closeAt)` else EMPTY; a legal withdrawal ALWAYS persists (EMPTY is never a rejection). Same-instant rejection removed entirely. Two persisted-for-but-not-conflated contracts: `wasCollectionAuthorizedAtKnownTime` (as-of-collection-time visibility) vs `deriveConsentAuthorizationIntervals` (retrospective).
- **Receipts (spec §8.5/§8.9):** `StudyConsentCommandReceipt.consentEventId` points at the durable effective event; `resultKind ∈ {EVENT_APPENDED, NO_OP_EFFECTIVE_STATE, CORRECTION_NOT_APPLIED}`.
- **Idempotency (spec §8.13/§10):** same key+same payload→replay; same key+different payload→`StudyIdempotencyConflictError`; different key+same payload while WITHDRAWN→NO_OP receipt (no event); different key+changed payload while WITHDRAWN→CORRECTION_NOT_APPLIED receipt (no event). GRANT bearing `assertedEffectiveAt` is rejected at schema validation BEFORE receipt lookup (never replays a prior valid receipt).

## J. Tests — exact commands and results (all green)

| Command | Result |
| :-- | :-- |
| `pnpm db:validate` | schema valid |
| `pnpm db:migrate:check` | OK — 3 migrations; append-only triggers for 13 tables; freeze-guard + experiment FROZEN guard + §8.11 CHECK + lifecycle/frozenAt CHECK + anchor-equality CHECK + receipt scope CHECKs present |
| `pnpm typecheck` (`next typegen && tsc --noEmit`) | exit 0 |
| `pnpm lint` (`eslint .`) | exit 0 |
| `pnpm test` (offline vitest, post-patch) | **429 passed** (25 files) — baseline + study domain + participant-context forgery (9) + extended capability ownership |
| `pnpm test:integration` (real PostgreSQL 18.4, clean DB, `migrate deploy` of all 3 migrations, post-patch) | **staged-upgrade 3 + study-authority 36 + decision-snapshot 23 = 62 passed** |
| `prisma migrate diff --exit-code` (migrations → schema) | "No difference detected" (no drift) |
| Direct SQL adversarial probe (all 3 migrations, real PG) | every freeze-guard / immutability / §8.11 CHECK / uniqueness / receipt-scope case behaved as specified |

The real-PostgreSQL gate WAS executed (native `initdb`/`pg_ctl` on PATH). The A1 migration composes over the accepted M3.5A migrations from a clean database, and the accepted M3.5A integration suites still pass unchanged.

## K. Adversarial regression matrix (V2.1 §17/§30 → test)

All in `src/db/study-authority.integration.test.ts` (real PG) unless marked *(pure)* = `src/study/*.test.ts` or *(AST)* = `src/lib/module-capability.test.ts`.

- GRANT with forbidden `assertedEffectiveAt` → validation rejection before receipt; valid GRANT K then retry K with forbidden field → rejected, not replayed → "rejects a GRANT bearing assertedEffectiveAt BEFORE any receipt lookup"; *(pure)* schema.test.
- GRANT K prov A then same K prov B → `StudyIdempotencyConflictError` → "same key + different provenance".
- GRANTED missing provenance → CHECK+schema *(pure schema.test / DB probe)*.
- exact repeated GRANT → `NO_OP_EFFECTIVE_STATE` → "exact repeated GRANT".
- changed GRANT while GRANTED → `StudyConsentUpdateNotSupportedError`.
- GRANTED row with non-null assertedEffectiveAt (direct DB) → CHECK violation → "the §8.11 CHECK rejects…".
- `WITHDRAWN→GRANT`, `NO_CONSENT→WITHDRAW` → reject → "NO_CONSENT → WITHDRAW rejects; WITHDRAWN → GRANT rejects".
- G / W asserted before grant → append W, EMPTY, state WITHDRAWN → "a backdated withdrawal ALWAYS persists"; interval cases *(pure)* consent-state.test (`[T10,T20)`, EMPTY at T5/T10, `[T10,T30)`).
- exact repeated WITHDRAW (diff key) → NO_OP; changed → CORRECTION_NOT_APPLIED; same key+changed → conflict → "repeated-withdrawal receipts".
- concurrent consent → one event (row lock) → "concurrent identical GRANTs … append exactly ONE event".
- invite A→S→P, invite B same S → same P; concurrent different keys same subject → one P; same key different subject → conflict → Participant describe.
- `participantCode` caller input, `recruitmentPolicy`, caller anchor → schema reject → participant/experiment/assignment tests + *(pure)* schema.test.
- freeze-UPDATE changing definitionJson+status → rejected; DRAFT arbitrary UPDATE → rejected; FROZEN UPDATE/DELETE → rejected; experiment→DRAFT protocol → rejected → Protocol/Experiment describes + direct SQL probe.
- digest mismatch → fail closed → "load FAILS CLOSED on a digest mismatch"; *(pure)* protocol-definition.test.
- duplicate assignment → one row; assignment UPDATE/DELETE → rejected → Assignment describe.
- participant-facing/arbitrary module imports raw study repo or admin service → boundary fail *(AST)*; participant uses another participant's assignment → `StudyAssignmentOwnershipError`; non-trusted context → `StudyValidationError`.

## L. SCI implementation matrix

| SCI | Enforcement | Tests |
| :-- | :-- | :-- |
| **SCI-01** Protocol single frozen authority | one representation (no lifted scalars); freeze-guard trigger (exact DRAFT→FROZEN); analysis re-verify fail-closed; no hard-coded fallback | protocol-definition.test; study-authority "freeze lifecycle & fail-closed load", "digest mismatch"; DB probe |
| **SCI-02** Assignment = official population (stable identity) | `UNIQUE(recruitmentSubjectKey)`+P2002; `UNIQUE(experimentId,participantId)`; immutability triggers; resolver credential→subject | study-authority Participant + Assignment describes |
| **SCI-03** Observation window from frozen protocol / trusted anchor | trusted `enrolledAt`; `observationStartAt=enrolledAt`; caller anchor/weeks schema-rejected; window read from `definitionJson`, never stored | Assignment "rejects a caller-supplied anchor…"; schema.test |
| **SCI-04** Consent deterministic + provenance + intervals + no re-consent (V2.1) | GRANT no asserted instant (schema+CHECK); open at `capturedAt`; seq order; legal withdrawal always persists; EMPTY not rejection; §8.11 CHECK; row lock + seq | consent-state.test (state machine + intervals + properties); study-authority consent describes; DB probe |
| **SCI-21** Complete retry identity (V2.1) | full provenance hashed; prohibited GRANT field rejected before receipt; WITHDRAW `assertedEffectiveAt` hashed; `resultKind` auditable; participant hash uses stable key+version | request-hash.test; study-authority GRANT/withdrawal idempotency |
| **SCI-24** M3.5A untouched | no ALTER of `decision_snapshot`/`decision_idempotency_receipt`; engine/corpus byte-unchanged; no reuse of `DecisionIdempotencyReceipt` | `git diff 64cf864 -- src/engine src/corpus` EMPTY; M3.5A migrations untouched; schema +286/−0; accepted M3.5A suites still pass |

## M. R35R implementation matrix

| Finding | Enforcement | Tests |
| :-- | :-- | :-- |
| **R35R-07** consent race / same-time | row lock `FOR UPDATE` + `consentSeq` only; no timestamp-equality rejection | study-authority "concurrent identical GRANTs…"; consent-state.test same-instant append |
| **R35R-08** consent backdating / favorable withdrawal | interval close = `min(capturedAt, assertedEffectiveAt)`; ordered by seq; backdated withdrawal → EMPTY, never re-opens | consent-state.test intervals; study-authority "backdated withdrawal ALWAYS persists" |
| **R35R-09** protocol authority | single representation, no lifted scalars; digest re-verify | SCI-01 tests |
| **R35R-10** experiment→frozen protocol | FK + INSERT guard trigger; FROZEN pre-check | Experiment describe; DB probe |
| **R35R-11** trusted anchor | trusted enrolledAt; caller anchor rejected | SCI-03 tests |
| **R35R-15** study-write idempotency architecture | concrete strong-FK receipts per operation; `UNIQUE(operationScope, idempotencyKey)`; material request hashes; `resultKind` | request-hash.test; all idempotency tests |

## N. Deferred register (explicitly preserved, NOT implemented)

A2 (PurchaseIntent lifecycle, decision request/binding, `findExactHistoricalDecision`, StudySession); B1/B2 (PurchaseOccasion, occasion correction lineage, ResearchContact, AuthMessage, weekly reports, opportunity/entry-source reconciliation); C1/C2 (evidence/VerifiedValue, corroboration, RIVSR, denominators/bounds/thresholdStatus, VS3/VS4, as-of analytics); **production `AnalysisProtocol v1`** remains UNFROZEN (no seed/startup path freezes it); **P35A-06** (CI does not automatically run real PostgreSQL) — NOT claimed resolved: the real-PG gate was executed locally in this environment, but no CI automation was added; RTM3-08, RTM3-09, RTM3-12, RT14+; Wave 0 (unauthorized). No deploy, production migration, production seed, or Wave 0 traffic was performed.

## O. Deviations from V2.1

The prior report's "None material" was itself inaccurate (the Sol gate found six defects). No deviation from V2.1 **semantics** remains, but the implementation makes these bounded, disclosed choices (all preserving observable invariants), and adds A1-internal infrastructure the spec explicitly permits:

1. **Durable recruitment identity tables (spec §11 permits):** two A1-internal recruitment-provisioning tables (`recruitment_subject_identity`, `recruitment_credential_link`) were added to make subject identity durable (A1-CODE-02). They hold no PII / no study truth and are append-only. Spec §11 explicitly authorizes "an additional A1-internal table/model IF necessary" for this.
2. **Optional freeze precondition:** `freezeAnalysisProtocol` gained an OPTIONAL `expectedDefinitionDigest` caller precondition (A1-CODE-06/§25) so a different-key retry cannot alias to a protocol whose digest differs from the caller's intent. `frozenAt` is never part of request identity.
3. **Serialization ordering (§8.10):** the exact transport-receipt replay lookup runs INSIDE the transaction immediately after acquiring the assignment row lock (rather than strictly before it). Schema validation still runs before any receipt lookup; this only strengthens race-safety. Permitted by §8.10 ("adapt exact ordering where database transaction mechanics require it, preserving all observable invariants").
4. **`StudyProtocolAlreadyFrozenError`** added (not named in V2.1) for the narrow case of an out-of-band FROZEN row (no sanctioned freeze receipt to reconcile against); a same-key freeze replays and a different-key equivalent freeze now reconciles (A1-CODE-06). This upholds the one-way lifecycle (§2.2) without inventing new scientific semantics.
5. **Domain aliasing:** a different transport key with identical material (protocol content / experiment binding / recruitment subject key+version) attaches an alias receipt to the existing row (the M3.5A pattern, §10); a materially different payload — including an incompatible recruitment key/version (§14) — raises `StudyDomainConflictError`.

Corrections to earlier inaccurate report claims (superseded by §Q): TrustedParticipantContext is now runtime-unforgeable (was forgeable); the production recruitment resolver is now durable (was non-durable); freeze now verifies the digest before freezing (previously did not).

## P. Final SHA (accepted)

Branch `m3.5b-a1-implementation`. Rejected first candidate: `a0ef79a5092492b27c657a66fb39b8b515a93073`. **Accepted implementation SHA: `99f2d61bc45839d6f9506abee5fae641bfcd8b2e`** (Codex Sol: `A — M3.5B-A1 IMPLEMENTATION ACCEPTED`). This revision of the report is a documentation-only child commit (A1-DOC-01); it does not change the accepted implementation SHA, and no source/schema/migration/test/config was modified.

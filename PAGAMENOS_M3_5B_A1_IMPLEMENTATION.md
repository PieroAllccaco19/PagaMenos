# PagaMenos — M3.5B-A1 Implementation Report

**Milestone:** M3.5B-A1 — Protocol / Experiment / Assignment / Consent Authority.
**Authoritative design:** `PAGAMENOS_M3_5B_A1_EFFECTIVE_SPEC_V2_1.md` (the ONLY normative source; V1/V2/R.x superseded).
**Status:** implementation candidate — **REVIEW CANDIDATE ONLY**. Not accepted; awaits the independent Codex Sol A1 gate.

This is additive over the accepted M3.5A persistence baseline. Every claim below was verified against real PostgreSQL 18.4 (ephemeral cluster via `scripts/pg-integration.ts`), not mocks.

---

## A. Baseline / Git safety

- **Starting baseline SHA (exact):** `64cf864a817c137920204487ab3317bc6d4c9ba5` (accepted M3.5A).
- **Failed prototype (evidence only, NOT a baseline):** `1ded28d28038d4a385628683da096f846439a100` (Codex Sol: `C — NO-GO`). Not built upon; not cherry-picked.
- **Archive ref (non-destructive):** `refs/heads/archive/m3.5b-prototype-nogo → 1ded28d…` created via `git update-ref` (created only because it did not already exist). The failed prototype remains durably addressable.
- **Implementation isolation:** a separate Git **worktree** at `C:/Users/piero/pagamenos-a1` on a fresh branch **`m3.5b-a1-implementation`** based EXACTLY on `64cf864…`. The user's original working tree (`master` @ `1ded28d`, plus the three untracked spec files) was left untouched — no `git reset --hard`, `git clean`, or `git checkout -- .` was run against it.
- **Unrelated work preserved:** confirmed. `master` still points at `1ded28d`; the untracked `PAGAMENOS_M3_5B_A1_EFFECTIVE_SPEC*.md` files in the original tree are unmodified. V2.1 was copied (not moved/edited) into the worktree for reference.

## B. Files changed (35 files; +5145 / −5; the 5 deletions are line replacements in the four modified infra files — engine/corpus are byte-unchanged, see §L SCI-24)

**Added — pure domain (`src/study/`):** `errors.ts`, `versions.ts`, `protocol-definition.ts`, `consent-state.ts`, `schema.ts`, `request-hash.ts`, `recruitment.ts`, `participant-context.ts`, `index.ts` (+ tests: `consent-state.test.ts`, `protocol-definition.test.ts`, `request-hash.test.ts`, `schema.test.ts`).
**Added — raw repositories (`src/db/`, internal):** `study-support.ts`, `study-protocol-repository.ts`, `study-experiment-repository.ts`, `study-participant-repository.ts`, `study-assignment-repository.ts`, `study-consent-repository.ts` (+ `study-authority.integration.test.ts`).
**Added — sanctioned services (`src/services/`):** `study-protocol-admin.ts`, `study-experiment-admin.ts`, `study-recruitment.ts`, `study-assignment-admin.ts`, `study-consent.ts`, `study-analysis.ts`, `study-admin.ts`.
**Added — migration:** `prisma/migrations/20260901120000_m3_5b_a1_study_authority/migration.sql`.
**Modified:** `prisma/schema.prisma` (additive: +286/−0), `eslint.config.mjs` (study-admin boundary + sanctioned-impl exemptions), `src/lib/module-capability.test.ts` (operation-specific study ownership), `src/services/index.ts` (participant/read surface), `scripts/migrate-check.ts` (A1 guard/CHECK assertions), `scripts/pg-integration.ts` (run A1 integration suite).

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

**No lifted semantic scalar columns** on `AnalysisProtocol` (no `observationWindowWeeks`/`contaminationWindowHours`/etc.) — all protocol semantics live in verified `definitionJson` (spec §2). No `recruitmentPolicy`/`assignedProtocolId` on `Experiment` (spec §4). No `includedInDenominator` on assignment. Concrete strong-FK receipts only — no polymorphic target; `DecisionIdempotencyReceipt` is NOT reused (spec §9/§25).

## D. Migration (`20260901120000_m3_5b_a1_study_authority/migration.sql`, one transaction)

Base DDL generated by `prisma migrate diff` (schema↔migrations verified drift-free: `migrate diff --exit-code` = "No difference detected"), plus hand-written DB-level enforcement Prisma cannot express:

- **Freeze-guard** (`analysis_protocol_freeze_guard` + triggers `_update`, `_delete`; `analysis_protocol_no_truncate`): the ONLY permitted UPDATE is DRAFT→FROZEN with `frozenAt` NULL→timestamp and **every other column unchanged** (incl. JSONB equality); a FROZEN row rejects all UPDATE; DELETE and TRUNCATE rejected (spec §2.2).
- **Experiment FROZEN-protocol guard** (`experiment_requires_frozen_protocol` + `experiment_frozen_protocol_guard`, BEFORE INSERT): a cross-table check that `frozenProtocolId` references a FROZEN protocol (spec §4).
- **Append-only / immutability** (`study_forbid_mutation` + per-table `_no_update`/`_no_delete`/`_no_truncate`): `experiment` (immutable immediately), `study_participant`, `experiment_assignment`, `study_consent_event`, and all five receipt tables.
- **§8.11 single-table CHECK** `study_consent_event_action_provenance_ck`: `GRANTED ⇒ provenance NOT NULL AND assertedEffectiveAt IS NULL`; `WITHDRAWN ⇒ provenance NULL` (assertedEffectiveAt free).
- **Receipt operationScope CHECKs** (`*_scope_ck`): each receipt table restricted to its trusted constant(s).
- All UNIQUE/FK/index constraints per §C. `ON DELETE RESTRICT` on every study FK.

FKs, UNIQUEs, CHECKs, triggers enumerated in the migration file; guarded offline by `pnpm db:migrate:check` (extended for all A1 objects).

## E. Services (sanctioned A1 operations)

| Operation | Module | Capability | Notes |
| :-- | :-- | :-- | :-- |
| `registerAnalysisProtocolDraft`, `freezeAnalysisProtocol` | `study-protocol-admin.ts` | ProtocolAdministration | canonical build + digest; freeze = the one exact UPDATE; trusted `frozenAt` |
| `createExperiment` | `study-experiment-admin.ts` | ExperimentAdministration | FROZEN pre-check + DB guard |
| `registerStudyParticipant` | `study-recruitment.ts` | RecruitmentProvisioning | trusted resolver → stable key; hash uses stable key+version only |
| `assignParticipant` | `study-assignment-admin.ts` | AssignmentAdministration | trusted `enrolledAt`; `observationStartAt = enrolledAt` |
| `recordConsentGrant`, `recordConsentWithdrawal` | `study-consent.ts` | ParticipantConsent (trusted context) | schema-validate → own-assignment → hash → serialized append |
| `loadFrozenProtocolForAnalysis` | `study-analysis.ts` | analysis (read) | fail-closed digest re-verification |

## F. Capability boundary (exact allowed-module enforcement)

Two layers: (1) **ESLint** coarse block (`eslint.config.mjs`) — app/participant-facing (`src/app|analytics|sourcemon|lib`) and arbitrary `src/services/**` cannot import `@/db/**` (raw study repos included) nor the trusted study-admin surface (`@/services/study-*-admin`, `@/services/study-recruitment`, `@/services/study-assignment-admin`, `@/services/study-admin`); the seven sanctioned study impl files are exempted. (2) **AST module-capability test** (`src/lib/module-capability.test.ts`) — the mechanical, syntax-proof (static/dynamic import, relative, `.js`/`.ts`, static template) **operation-specific ownership**:

- Each raw study repo importable ONLY by its owning service: protocol→`study-protocol-admin`(+`study-analysis` read), experiment→`study-experiment-admin`, participant→`study-recruitment`, assignment→`study-assignment-admin`, consent→`study-consent`.
- Admin service modules importable ONLY by the `study-admin` barrel (read-only analysis load also by the public `@/services` barrel); non-literal dynamic imports stay fail-closed for study modules.
- Participant consent operates through the nominally-branded `TrustedParticipantContext` (module-private symbol), and the consent service enforces own-assignment binding at runtime (spec §12).

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
| `pnpm db:migrate:check` | OK — 3 migrations; append-only triggers for 11 tables; freeze-guard + experiment FROZEN guard + §8.11 CHECK + receipt scope CHECKs present |
| `pnpm typecheck` (`next typegen && tsc --noEmit`) | exit 0 |
| `pnpm lint` (`eslint .`) | exit 0 |
| `pnpm test` (offline vitest) | **419 passed** (24 files) — 371 accepted baseline + 48 new (consent-state 21, schema 7, protocol-definition 6, request-hash 7, module-capability +7 of 17) |
| `pnpm test:integration` (real PostgreSQL 18.4, clean DB, `migrate deploy` of all 3 migrations) | **staged-upgrade 3 + study-authority 27 + decision-snapshot 23 = 53 passed** |
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

None material. Bounded implementation choices (all preserving observable invariants):
1. **Serialization ordering (§8.10):** the exact transport-receipt replay lookup runs INSIDE the transaction immediately after acquiring the assignment row lock (rather than strictly before it). Schema validation still runs before any receipt lookup; this only strengthens race-safety. Permitted by §8.10 ("adapt exact ordering where database transaction mechanics require it, preserving all observable invariants").
2. **`StudyProtocolAlreadyFrozenError`** added (not named in V2.1) for a new-key freeze against an already-FROZEN protocol; a same-key freeze still replays via receipt. This upholds the one-way lifecycle (§2.2) without inventing new scientific semantics.
3. **Protocol/experiment domain aliasing:** a different transport key with identical material (same protocol content / same experiment binding) attaches an alias receipt to the existing row (the M3.5A pattern, §10); a materially different payload raises `StudyDomainConflictError`.

## P. Final candidate SHA

See the commit created on branch `m3.5b-a1-implementation`; the exact final SHA is recorded in the delivery message accompanying this report. **This is a REVIEW CANDIDATE ONLY — not acceptance.** Only the independent Codex Sol A1 code-level gate can accept M3.5B-A1.

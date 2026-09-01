# PagaMenos — M3.5A Implementation Report

**Milestone:** M3.5A — Immutable Decision Persistence Foundation
**Authorization:** M3.5A only (persistence substrate for completed engine decisions). No M3.5B / M4
scope. The accepted M3 economic engine is unchanged.
**Corpus:** `PAGAMENOS_VALIDATION_CORPUS_v1_2026-08-30T1800-0500` (frozen, unchanged).

---

## 1. Verdict: **PASS**

M3.5A implements the durable, immutable, idempotent persistence boundary for completed pure-engine
decisions. A confirmed decision is now persistable as a self-contained historical snapshot: the exact
effective engine input and output are stored verbatim (JSONB), fingerprinted with SHA-256 over a
deterministic canonical serialization, stamped with schema/contract/corpus/build versions, and
protected by **database-level append-only immutability** (UPDATE / DELETE / TRUNCATE triggers).
Idempotency (transport key) and business uniqueness (domain key) are enforced by real unique
constraints with race-safe reconciliation. The pure engine remains untouched and DB-free.

The **real-PostgreSQL integration gate WAS EXECUTED** against an ephemeral PostgreSQL 18.4 cluster
(initdb → `prisma migrate deploy` from clean → integration suite → teardown) and passed all 11
integration tests, including DB-enforced immutability, idempotency/business conflicts, concurrency,
and transactional rollback. All eight standard offline gates exit 0. No corpus fact was mutated. No
M3.5B/M4 scope was added.

## 2. Starting M3-accepted SHA

`aae27a55ffa36b5e0a742b591fc3faba9d671d2a` (M3 final accepted). HEAD was unchanged and the working
tree clean at start; a single new M3.5A commit is created on top (M0–M3 never amended).

## 3. Repository preflight

`git rev-parse HEAD` = `aae27a55…`; `git status` = clean — both required preconditions satisfied.
`src/engine` held the accepted M3 evaluator; `prisma/schema.prisma` had **no** domain models; `src/db`
/ `src/services` were M0 boundary placeholders. Existing suite: **259 tests green**.

## 4. PostgreSQL / Prisma architecture

- Datasource: PostgreSQL via Prisma 6 (`@prisma/client`), `DATABASE_URL` read only at the db/app
  boundary (never in engine/corpus).
- Migrations are **explicit and version-controlled** (`prisma/migrations/**`), driven by
  `prisma migrate deploy`. No `prisma db push`; **no startup auto-migrate** (§24).
- Layering (import direction, §29): `services → { engine, corpus, persistence, db }`,
  `db → { persistence, @prisma/client }`, `persistence → engine`. The engine/corpus purity boundary
  is unchanged and now **also** forbids `@/persistence` and `node:crypto` (mechanically enforced).

## 5. DecisionSnapshot schema

Prisma model `DecisionSnapshot` (`@@map("decision_snapshot")`), one immutable row per completed
decision. Columns (§21): `id` (uuid, `gen_random_uuid()`), `businessDecisionKey` UNIQUE,
`idempotencyKey` UNIQUE, `snapshotSchemaVersion`, `engineInputSchemaVersion`,
`engineOutputSchemaVersion`, `engineContractVersion`, `corpusVersion`, `merchantId`,
`selectedScopeId?`, `decisionStatus`, `evaluatedAt`/`intendedTransactionAt` (`timestamptz`),
`engineInputJson`/`engineOutputJson` (`jsonb`), `inputHash`, `outputHash`, `gitSha`, `buildId?`,
`createdAt`. **No `updatedAt`** (§13). Indexes on merchant/corpus/status/instants for lookup only.

## 6. Snapshot-version contract (§7)

Four explicit version strings (`src/persistence/versions.ts`): `SNAPSHOT_SCHEMA_VERSION`,
`ENGINE_INPUT_SCHEMA_VERSION`, `ENGINE_OUTPUT_SCHEMA_VERSION`, `ENGINE_CONTRACT_VERSION` (all `*.v1`).
The persisted payloads are validated by **frozen v1 Zod schemas** (`src/persistence/schema.ts`) held
locally (not the mutable corpus schema) so historical validity never depends on current corpus shape
(§3). The DTO gate `z.literal(...)` on each version rejects any wrong/absent version — an
unknown/unversioned payload is never treated as current.

## 7. Canonical serialization (§8/§31/§32)

`src/persistence/canonical.ts`: recursive canonical JSON — object keys sorted by code point, **array
order preserved** (semantically significant), `undefined`-valued keys dropped to match the JSONB
round-trip (so a reloaded record re-hashes identically), `undefined`-in-array → `null`, and
non-finite/bigint/function/symbol values **rejected** (`PersistenceInvariantError`). Not
`JSON.stringify` of raw objects.

## 8. Hashing (§8)

`src/persistence/hash.ts`: SHA-256 (`node:crypto`) over the canonical string → lowercase 64-hex
`inputHash`/`outputHash`. Crypto lives at the persistence boundary only; the engine cannot import it
(ESLint + boundary test).

## 9. Exact historical **input** completeness (§6)

`engineInputJson` stores the **entire effective `DecideInput`**: the RuleVersion semantics,
ComparisonScopes, RuleOperationalStates, EligibilityPortfolio, PurchaseContext, `evaluatedAt`,
`intendedTransactionAt`, `selectedScopeId?`, `holidayCalendar?`, and `baselineByScopeId?`. It is **not**
a set of foreign keys into the current corpus — the corpus may later change; the row is self-contained.

## 10. Exact historical **output** completeness (§6)

`engineOutputJson` stores the **entire `EngineEvaluation`**: matched scopes, every candidate, status,
`confirmedTopRuleRefs`, `possibleAdditionalTopRuleRefs`, `topSetComplete`, `winnerRef`/`runnerUpRef`
(when applicable), typed `delta`, advisories, plausible bounds/materiality, and provenance refs carried
by the engine result.

## 11. Application build metadata (§9)

`src/persistence/build-meta.ts` resolves `gitSha` (required — fail-closed if unresolved) and
`buildId?` at the boundary from an injectable env source (default `process.env`; keys
`PAGAMENOS_GIT_SHA`/`GIT_SHA`/`GITHUB_SHA`/`VERCEL_GIT_COMMIT_SHA`, etc.). The engine never reads env.

## 12. Idempotency semantics (§10)

`idempotencyKey` UNIQUE. First write → create. Exact retry (same key, same business key, same
input+output hashes) → the existing row is returned, **no duplicate**. Same key + different payload →
`IdempotencyConflictError`; the historical row is never overwritten. Race safety rests on the DB
unique constraint: a concurrent loser catches `P2002` and reconciles to the winner's committed row.

## 13. Business uniqueness semantics (§11)

`businessDecisionKey` UNIQUE, independent of transport idempotency. Same business key + same snapshot
(via a different idempotency key) → same row (safe duplicate). Same business key + different snapshot →
`BusinessDecisionConflictError`. **M3.5B will bind how a future `PurchaseIntent` constructs this key**;
M3.5A only enforces its uniqueness and does not invent participant workflow.

## 14. Transaction semantics (§16)

Persistence of a snapshot is a single atomic insert; on a forced mid-transaction failure the row is
rolled back leaving **zero** partial rows (proven in integration). `decideAndPersist` runs the engine
once and persists the exact pair — no recompute/reload between deciding and saving (§15).

## 15. DB immutability implementation (§12)

Migration SQL adds `decision_snapshot_forbid_mutation()` and `BEFORE UPDATE` / `BEFORE DELETE` (row)
+ `BEFORE TRUNCATE` (statement) triggers that `RAISE EXCEPTION` (`restrict_violation`). Immutability
is **not** merely "no update method": the DB rejects mutation regardless of caller. Any future
retention/privacy deletion must be a separate authorized process, not ordinary editing.

## 16. Domain-truth vs telemetry boundary (§17/§34 RT13)

The `DecisionSnapshot` domain row is the **sole source of truth**. No analytics event is required to
reconstruct any field, and no domain field is reconstructed from an event stream. No telemetry/outbox
is implemented in M3.5A (out of scope); the boundary is documented and structurally enforced (domain
columns + JSONB truth are self-sufficient).

## 17. Repository / service public API

- `src/db`: `DecisionSnapshotRepository` (`persist`, `findById`, `findByIdempotencyKey`,
  `findByBusinessDecisionKey`) + `decisionSnapshotRepository`, `prisma`. Translates known PostgreSQL
  failures into typed errors at the boundary (no raw-string parsing in app code, §30).
- `src/services`: `decideAndPersist` (sanctioned safe path: validate → decide once → hash → persist),
  `loadDecisionSnapshot` (integrity-checked read), `replayDecisionSnapshot` (diagnostic).
- `src/persistence`: canonical/hash, frozen v1 schemas, `buildDecisionSnapshotDraft`,
  integrity/replay, build metadata, typed errors, `DecisionSnapshotStore` contract.

## 18. Integrity / replay behavior (§27/§28)

`verifySnapshotIntegrity` recomputes the canonical hash of stored payloads and throws
`SnapshotIntegrityError` on any mismatch (never returns a corrupted snapshot). `replayWithCurrentEngine`
re-runs the **current** engine over the stored historical input as a labelled diagnostic; it verifies
input integrity first and returns `historicalOutput` (immutable truth) and `currentEngineReplayOutput`
distinctly — it never rewrites history.

## 19. Migration details (§23)

`prisma/migrations/20260831120000_m3_5a_decision_snapshot/migration.sql` (base table + indexes
generated via `prisma migrate diff`, immutability triggers appended by hand) plus
`migration_lock.toml` (`postgresql`). `gen_random_uuid()` is PostgreSQL core (≥13); no extension
required. Reproducible from a clean database (proven).

## 20. Real-PostgreSQL integration environment

Docker Desktop's daemon was **not running**, but a full PostgreSQL 18.4 server (initdb/pg_ctl/createdb
via scoop) is installed. `scripts/pg-integration.ts` boots a throwaway cluster on a free loopback port,
`prisma migrate deploy` applies the migration from clean, `vitest` runs the integration suite against
it, then the cluster is stopped and its temp datadir removed. `pnpm test:integration` drives it.

## 21. Integration-test results (§25/§26) — **EXECUTED, 11/11 PASS**

Against real PostgreSQL: (1) migration applies from clean DB; (2) insert succeeds; (3) read roundtrip
preserves the byte-identical, hash-verifiable snapshot; (4) UPDATE rejected by DB; (5) DELETE rejected
by DB (+ TRUNCATE rejected); (6) idempotency — first / exact-retry (same row) / conflicting-key
(`IdempotencyConflictError`); (7) business uniqueness — same-key-same-snapshot (same row) /
same-key-different-snapshot (`BusinessDecisionConflictError`); (8) concurrency — two identical writes →
one durable row; two same-key/different-payload → exactly one succeeds, one `IdempotencyConflictError`;
(9) transaction rollback leaves zero partial rows.

## 22. Unit / property tests (offline suite: **316 pass**, +57 over the 259 baseline)

`canonical.test.ts` (key-order invariance, array-order significance, undefined parity, non-finite
rejection), `hash.test.ts` (**non-tautological** literal SHA-256 vectors computed out-of-band),
`schema.test.ts` (v1 round-trip, version gate, strict secret-key rejection), `snapshot.test.ts`
(draft/versions/hashes/metadata, integrity pass+corrupt, replay separation), `build-meta.test.ts`
(resolution/priority/override/fail-closed), `decide-and-persist.test.ts` (orchestration via in-memory
store). All prior 259 engine/corpus/golden tests remain green.

## 23. Purity audit (§29)

`src/engine` and `src/corpus` are **byte-unchanged** (`git status` shows no engine/corpus file
modified). ESLint now forbids `@/persistence` and `node:crypto` from the pure layers, and
`src/lib/boundary.test.ts` mechanically proves an engine import of `@/persistence` and of `node:crypto`
is rejected while `src/services` may use both. Boundary self-test: green.

## 24. Corpus mutation audit (§38)

`git diff aae27a55…HEAD -- src/corpus/data` = **empty**. `pnpm corpus:validate` = PASS (all frozen
counts match). Fridays correction, tie semantics, nominal safety, PurchaseSignature protections, 12
canonical fixtures, and all 259 prior tests remain green.

## 25. RT08 / RT09 / RT13 closure status

- **RT08 (historical completeness / DB immutability): CLOSED for decisions.** Full self-contained
  input+output JSONB + hashes; DB-level append-only triggers proven against real PostgreSQL.
- **RT09 (idempotency / business uniqueness): CLOSED for decisions.** Two independent unique keys with
  race-safe reconciliation, proven under concurrency against real PostgreSQL.
- **RT13 (analytics events must not become domain truth): CLOSED (architecturally).** Domain row is
  the sole source of truth; no field depends on an event stream; no telemetry implemented.

## 26. Deferred RT10 / RT11 / RT12 / RT14+ status

**NOT claimed closed.** RT10 (VerifiedValue), RT11 (PurchaseOccasion / RIVSR denominator), RT12
(contamination derivation / mutable exceptions), RT14+ remain deferred to M3.5B or later gates. No
speculative study-workflow model (Participant, PurchaseOccasion, VerifiedValue, WeeklyExposureReport,
ResearchContact) was created (§35).

## 27. RTM3-08 / 09 / 12 deferred register (§33)

- **RTM3-08** (independent current bound for stale/non-fresh source): **DEFERRED — before Wave 0 /
  source-proof integration.** M3.5A persists only the bound data already present in engine snapshots;
  no source-proof integration was invented.
- **RTM3-09** (another ticket fixed-price rule): **DEFERRED.** No ticket rule added.
- **RTM3-12** (predicted-savings display / M7): **DEFERRED.** No predicted-savings UI.

## 28. Exact quality gates (all exit 0)

`pnpm lint`, `pnpm typecheck`, `pnpm test` (316), `pnpm corpus:validate`, `pnpm build`,
`pnpm db:validate`, `pnpm format:check`, and the new offline `pnpm db:migrate:check` (immutability-
trigger guard). Separately: `pnpm test:integration` (real PostgreSQL, 11/11). CI adds a
`prisma generate` and `db:migrate:check` step; the ephemeral-Postgres suite runs locally (offline CI
has no Postgres service).

## 29. Files changed

**New:** `src/persistence/{versions,errors,canonical,hash,schema,build-meta,snapshot,integrity,index}.ts`
+ tests (`canonical/hash/schema/snapshot/build-meta`) + `__fixtures__/decision-fixture.ts`;
`src/db/{client,decision-snapshot-repository}.ts` + `decision-snapshot.integration.test.ts`;
`src/services/decide-and-persist.ts` + test; `prisma/migrations/20260831120000_m3_5a_decision_snapshot/migration.sql`
+ `prisma/migrations/migration_lock.toml`; `scripts/{pg-integration,migrate-check}.ts`;
`vitest.integration.config.ts`.
**Modified:** `prisma/schema.prisma` (DecisionSnapshot model), `src/db/index.ts`, `src/services/index.ts`,
`eslint.config.mjs` (+@/persistence, +crypto), `src/lib/boundary.test.ts` (+2 rejection cases),
`vitest.config.ts` (exclude integration), `package.json` (+postinstall/test:integration/db:migrate:*),
`.github/workflows/ci.yml` (+prisma generate, +migrate check). **Engine & corpus: unchanged.**

## 30. Final Git status

Working tree consists solely of the additive persistence layer + supporting infra listed above; no
`src/engine` or `src/corpus` file is modified. Committed as one M3.5A commit on top of `aae27a55…`.

## 31. Commit SHA

One local M3.5A commit was created (no push, no amend of `aae27a55…`). The exact SHA is emitted by
`git rev-parse HEAD` immediately after the commit and is reported alongside this document in the
delivery summary.

## 32. Exact recommended next action

**STOP.** Do not begin M3.5B, participant workflows, or Wave 0. Next step: **independent code review by
Codex Sol** of the M3.5A persistence guarantees (historical completeness, canonical hashing,
DB-level immutability, idempotency/business uniqueness, purity boundary).


---

# M3.5A RED-TEAM CLOSURE

Independent Codex Sol review of `eb8a575d54d359ab63f19a20cfa978f18eeefc6d` returned **B — ACCEPTABLE
AFTER SPECIFIC PATCH** with five HIGH findings (P35A-01…05) and one MEDIUM (P35A-06). This section
records the closure. Independent acceptance is NOT claimed here; the next step is a Codex Sol recheck.

## 1. Starting SHA

`eb8a575d54d359ab63f19a20cfa978f18eeefc6d` (working tree clean at start). One new closure commit is
created on top; that commit is not amended.

## 2. P35A-01 status — **CLOSED (implementation claim)**

Transport idempotency moved off the snapshot into an append-only `DecisionIdempotencyReceipt` table.
Every key under which the operation returned success is durably consumed; several keys alias one
snapshot. The alias-reuse exploit (`K1+D1+A`, `K2+D1+A` succeed, then `K2+D2+B`) is now rejected
(I5/I6/I10, real Postgres).

## 3. Receipt schema

`DecisionIdempotencyReceipt { id uuid, operationScope, idempotencyKey, requestHash, decisionSnapshotId
→ FK DecisionSnapshot, createdAt }`, `UNIQUE(operationScope, idempotencyKey)`,
`INDEX(decisionSnapshotId)`, `@@map("decision_idempotency_receipt")`. `operationScope` is a fixed
trusted constant (`DECISION_PERSIST_V1`), never request-controlled. The snapshot's own
`idempotencyKey` unique column was dropped; `businessDecisionKey` stays unique (one snapshot per
domain decision).

## 4. Receipt idempotency semantics

First key → create snapshot + initial receipt. Exact retry (same key, same `requestHash`) → return the
historical snapshot, engine NOT called. Same key + different request → `IdempotencyConflictError`. New
key + existing business + same request → durable alias receipt + return existing. New key + existing
business + different request → `BusinessDecisionConflictError`, key not consumed.

## 5. Retry-before-recompute behavior

`decideAndPersist` resolves an exact-retry receipt (and returns the verified historical snapshot)
BEFORE calling `decide`, the corpus provider, or the build provider (§8/§38). A completed operation
stays valid across engine/corpus/deployment changes (proven by I11).

## 6. Alias durability

Aliased keys are persisted as append-only receipts; both keys stay permanently consumed (I4/I9), and a
later different-request reuse of either is rejected (I5/I6/I10).

## 7. Concurrency semantics

Race correctness rests on DB unique constraints + transactions, reconciled on `P2002`: identical
concurrent writes → one snapshot + one receipt (I8); concurrent different keys / same business / same
request → one snapshot + two receipts (I9); concurrent same key / different request → one succeeds, one
`IdempotencyConflictError`, one receipt.

## 8. P35A-02 status — **CLOSED**

The public barrels no longer expose any write surface. Normal application code cannot reach the raw
Prisma client, the repository write API, the snapshot draft constructor, or the provenance providers —
enforced by ESLint + boundary self-tests.

## 9. Public write / read boundaries

`src/db/index.ts` exports **nothing**. `src/services/index.ts` exports the sanctioned surface:
`decideAndPersist` (write), `loadDecisionSnapshot` / `replayDecisionSnapshot` (verified reads), the
request/deps types, and the typed errors. `src/persistence/index.ts` exports only read-safe helpers
(canonicalize/hash, frozen schemas, `verifySnapshotIntegrity` / `verifyHistoricalSnapshot` /
`verifySnapshotCoherence` / `replayWithCurrentEngine` / `parseDecisionSnapshot`), version constants,
types, and errors — NOT `buildDecisionSnapshotDraft`, the store impl, or the providers. ESLint block
`FORBIDDEN_WRITE_INTERNALS` forbids `src/app|analytics|sourcemon|lib` from importing `@/db*`,
`@prisma/client`, `@/persistence/{snapshot,provenance,build-meta}`; boundary tests prove a rejection
from `src/app`/`src/lib` and acceptance from `src/services`.

## 10. Metadata derivation / coherence

All query columns (`merchantId`, `selectedScopeId`, `decisionStatus`, `evaluatedAt`,
`intendedTransactionAt`) are DERIVED from the parsed output (`deriveQueryMetadata`), never
caller-authored; provenance columns come from trusted providers. On read, `verifySnapshotCoherence`
re-derives and compares (instant columns compared as INSTANTS, since timestamptz round-trips as UTC
while the JSON keeps its original offset). A contradiction → `SnapshotCoherenceError`.

## 11. P35A-03 status — **CLOSED**

## 12. Parse-once semantics

The service rejects a non-plain request up front (`assertCanonicalizable`), then parses ONCE
(`engineInputV1Schema.parse`) and uses ONLY the parsed value for decide/hash/persist; the caller
object is never used again. The output is likewise parsed (`engineOutputV1Schema.parse`) before
metadata/hash/persist.

## 13. Canonical serializer hardening

`canonicalize` now rejects non-plain prototypes (Date, Map/Set, class instances, prototype-`toJSON`)
and sparse arrays, in addition to non-finite/bigint/function/symbol. `assertCanonicalizable` reuses it
as the write-boundary guard. Object-key sorting, array-order significance, null handling, deterministic
escaping, and the independent literal SHA-256 vectors are preserved.

## 14. Prototype / sparse-array results

Unit: Date/Map/Set/class/prototype-`toJSON`/sparse rejected; null-prototype plain object accepted.
Real Postgres (§46): a prototype-`toJSON` request and a Date-bearing request both fail BEFORE
insertion with `snapshot count = 0` AND `receipt count = 0`.

## 15. P35A-04 status — **CLOSED**

## 16. v1 version dispatch

`parseDecisionSnapshot` dispatches on `snapshotSchemaVersion` (only v1 known; unknown/absent →
`UnsupportedSnapshotVersionError`). Within v1, all four version fields (snapshot/input/output/engine
contract) are exact `z.literal`s — `engineContractVersion` is no longer a free string. Version matrix
tested at both draft-creation and historical-load.

## 17. Locally-frozen enum / instant semantics

`src/persistence/tokens-v1.ts` holds frozen local copies of every persisted enum token set (guarded by
`satisfies` against the live union for compile-time drift detection); `src/persistence/instant-v1.ts`
owns the strict instant grammar + epoch parser. The v1 schema sources enums/instants from these, never
from live `@/corpus` runtime arrays. A source-boundary test (`frozen-schema.test.ts`) asserts no value
import of the live domain arrays/validators.

## 18. P35A-05 status — **CLOSED**

## 19. Trusted build provenance

`gitSha` (required) is resolved from a trusted `BuildMetadataProvider` and validated as a real Git
object id (40-hex SHA-1 or 64-hex SHA-256); placeholders (`dev`/`unknown`/empty) →
`BuildProvenanceError`. The production request type carries NO `gitSha`/`buildId`. An exact retry
returns the ORIGINAL build provenance without resolving the current build (I11).

## 20. Trusted corpus provenance

`corpusV1ProvenanceProvider` verifies every supplied static rule/scope is an EXACT member of Corpus v1
(canonical-hash equality; subsets allowed, operational state not checked). Unknown/mutated rule/scope
→ `CorpusProvenanceError`. The request type carries NO `corpusVersion`. Synthetic-rule suites inject
`fixedCorpusProvenanceProvider` (trusted construction, not a request field).

## 21. New migration

`prisma/migrations/20260831130000_m3_5a_closure_idempotency_receipts/migration.sql` — drops the
obsolete snapshot idempotency column/index, creates the receipt table + unique/index/FK, and adds its
append-only triggers. The base migration is untouched; the chain applies from a clean DB via
`prisma migrate deploy` (proven).

## 22. DB immutability for snapshots + receipts

Both tables reject UPDATE / DELETE / TRUNCATE via `BEFORE` triggers that `RAISE EXCEPTION`
(`restrict_violation`). Proven against real Postgres for both tables (§50). `pnpm db:migrate:check`
now guards both tables' triggers offline.

## 23. Real PostgreSQL results — **EXECUTED, 18/18 PASS**

Ephemeral PostgreSQL 18.4 (initdb → migrate deploy of the full chain → suite → teardown): migration
chain, I1–I11 idempotency/alias/exploit matrix, concurrency (I8/I9/I10 + same-key/different-request),
both tables' immutability, adversarial prototype/Date rejection with zero rows, and two-table
transaction atomicity.

## 24. Transaction tests

`createDecision` writes snapshot + initial receipt in one `$transaction` (atomic §16/§51). A forced
mid-transaction failure leaves zero snapshot AND zero receipt rows (proven).

## 25. Public export audit

- `src/db/index.ts`: `export {}` (no surface).
- `src/services/index.ts`: `decideAndPersist`, `loadDecisionSnapshot`, `replayDecisionSnapshot`,
  `DecideAndPersistRequest`/`DecideAndPersistDeps` types, `DecisionSnapshotDto`/`ReplayComparison`
  types, and typed persistence errors. **Only** write path = `decideAndPersist`.
- `src/persistence/index.ts`: canonicalize/`assertCanonicalizable`/hash, version constants, frozen
  schemas + `parseDecisionSnapshot`, read-side verify/replay + `verifySnapshotCoherence`,
  `DecisionSnapshotDraft`/`BuildMetadata` types, and errors. No draft constructor, store impl, or
  providers.

## 26. RT08 status — **CLOSED FOR DECISION PERSISTENCE** (implementation claim).

## 27. RT09 status — **CLOSED FOR DECISION PERSISTENCE** (implementation claim). Durable receipts + business uniqueness proven under concurrency.

## 28. RT13 status — **CLOSED** (implementation claim). Domain rows are the sole source of truth; no analytics implemented.

## 29. P35A-06 status — **DEFERRED (MEDIUM) — BEFORE WAVE 0**

The real PostgreSQL suite WAS rerun this closure (18/18). CI still does not execute the Postgres
integration suite (offline CI has no Postgres service), so P35A-06 is not claimed closed;
`pnpm test:integration` runs locally against an ephemeral cluster.

## 30. Standard / deferred register

Deferred (unchanged): P35A-06 (CI Postgres, before Wave 0); RTM3-08 (source-proof, before Wave 0);
RTM3-09 (before another ticket fixed-price rule); RTM3-12 (before predicted-savings/M7); RT10
(VerifiedValue); RT11 (PurchaseOccasion/RIVSR); RT12 (contamination); RT14+ (later milestones). No
M3.5B / Wave 0 work performed.

## 31. Exact gates (all exit 0)

`pnpm lint`, `pnpm typecheck`, `pnpm test` (351), `pnpm corpus:validate`, `pnpm build`,
`pnpm db:validate`, `pnpm format:check`, `pnpm db:migrate:check`; and `pnpm test:integration` (real
PostgreSQL, 18/18).

## 32. Files changed

**New:** `src/persistence/{tokens-v1,instant-v1,provenance}.ts`,
`src/persistence/{provenance,frozen-schema}.test.ts`,
`prisma/migrations/20260831130000_m3_5a_closure_idempotency_receipts/migration.sql`.
**Modified:** `prisma/schema.prisma` (receipt model; dropped snapshot idempotencyKey),
`src/persistence/{schema,snapshot,canonical,build-meta,integrity,errors,index}.ts`,
`src/db/{decision-snapshot-repository,index}.ts`, `src/services/{decide-and-persist,index}.ts`,
`src/persistence/__fixtures__/decision-fixture.ts`, `eslint.config.mjs`, `src/lib/boundary.test.ts`,
`scripts/migrate-check.ts`, and the persistence/service/integration test files.
**Unchanged:** `src/engine`, `src/corpus`.

## 33. Commit SHA

One local M3.5A closure commit (no push, no amend of the accepted SHA). The SHA is emitted by
`git rev-parse HEAD` after the commit and reported in the delivery summary.

## 34. Final git status

Additive persistence/closure changes only; `git diff <base>..HEAD -- src/engine src/corpus/data` is
empty. Committed as one closure commit.

## 35. Exact next action

**STOP.** Independent code RECHECK by **Codex Sol** focused on P35A-01…05 and any new CRITICAL/HIGH
introduced by the closure. Do not begin M3.5B or Wave 0.


---

# M3.5A SECOND RED-TEAM CLOSURE

Independent Codex Sol recheck of `8535925ceda9d9aa10a7f5ff86f97e0481dda0c0` returned **B — ONE
SPECIFIC PATCH**: P35A-03 and P35A-04 CLOSED (unchanged here); P35A-01, P35A-02, P35A-05 OPEN. This
bounded second closure addresses those three. No new CRITICAL/HIGH was introduced. Independent
acceptance is NOT claimed; the next step is a Codex Sol recheck.

## Starting SHA

`8535925ceda9d9aa10a7f5ff86f97e0481dda0c0` (working tree clean at start). One new closure commit on
top; not amended.

## Files changed

**New:** `src/db/staged-upgrade.integration.test.ts`.
**Modified:** `prisma/migrations/20260831130000_m3_5a_closure_idempotency_receipts/migration.sql`
(unreleased-migration correction), `src/persistence/{provenance,snapshot}.ts`,
`src/services/decide-and-persist.ts`, `src/db/decision-snapshot-repository.ts`,
`src/db/decision-snapshot.integration.test.ts`, `src/persistence/__fixtures__/decision-fixture.ts`,
`eslint.config.mjs`, `src/lib/boundary.test.ts`, `scripts/{migrate-check,pg-integration}.ts`, and the
persistence/service test files. **Unchanged:** `src/engine`, `src/corpus`.

## P35A-01 — final status: **CLOSED (implementation claim)**

### Corrected migration sequence

The unreleased closure migration is corrected IN PLACE (documented as a pre-acceptance/pre-deployment
correction; the accepted commit is not amended). Because a later migration cannot reconstruct an
already-dropped key, the file itself had to change. New order, inside one explicit `BEGIN; … COMMIT;`
transaction: (1) create the receipt table; (2) indexes/unique/FK; (3) **backfill EVERY existing
`decision_snapshot.idempotencyKey` into a receipt** (`operationScope='DECISION_PERSIST_V1'`,
`requestHash = snapshot.inputHash`, `decisionSnapshotId = snapshot.id`, `createdAt` preserved); (4)
receipt append-only triggers; (5) ONLY THEN drop the obsolete unique index + column. The DROP can
never commit independently of the backfill.

### Staged existing-data upgrade result — **REAL PostgreSQL, PASS**

`src/db/staged-upgrade.integration.test.ts` reproduces the exact attack with genuine
`prisma migrate deploy` staging (not db push) on a dedicated `pagamenos_upgrade` DB: deploy base only
→ insert a valid pre-closure snapshot with `idempotencyKey = K_OLD` → deploy the closure. Asserts: the
`K_OLD` receipt exists (`requestHash = H_OLD = snapshot.inputHash`, pointing to the old snapshot); the
old `idempotencyKey` column is gone; and reusing `K_OLD` with a different request →
`IdempotencyConflictError`. 3/3 green.

### Receipt request-hash semantics (frozen, §5)

`requestHash === DecisionSnapshot.inputHash === SHA-256(canonical validated DecideInput)`;
`businessDecisionKey` is always compared separately. `computeRequestHash(input)` now takes the input
only. This makes the backfill a deterministic column copy (no in-database canonical hashing).

### Lazy retry/alias provider construction (§10/§11)

Providers are no longer constructed at the top of `decideAndPersist`. `deps` now takes
`corpusProvenanceFactory` / `buildProviderFactory`, invoked ONLY on the truly new-decision path.
Proven offline (factory-call counters: exact retry ⇒ 0 constructions) and in real Postgres (I2: build
factory + resolve each called once then unchanged on retry; I11: after a build/deployment change, the
retry returns the ORIGINAL provenance with the new factory constructed 0 times and resolved 0 times).

## P35A-02 — final status: **CLOSED (implementation claim)**

### Final boundary (exact-file allowlist, §13)

The write internals (raw Prisma client, `@/db/*` repository, `@/persistence/{snapshot,provenance,
build-meta}`) are now forbidden to `src/app|analytics|sourcemon|lib` AND to ALL of `src/services/**`,
then RE-ALLOWED for exactly ONE file: `src/services/decide-and-persist.ts` (which also hosts
load/replay). Patterns block BOTH alias (`@/db/...`) and relative-traversal (`../db/...`,
`../persistence/...`) specifiers (§14). Tests/fixtures are exempt as infrastructure.

### Arbitrary-service alias/relative import results

Boundary self-tests prove: `src/app` and `src/lib` probes importing the repository/draft/provider/raw
Prisma are rejected; an ARBITRARY `src/services/evil-service.ts` probe is rejected for BOTH alias and
relative imports of the repository and draft constructor; and ONLY
`src/services/decide-and-persist.ts` is allowed to import them.

### Forged-pair surface

There is no public exported service that accepts a caller-supplied `EngineEvaluation` or an
independent input/output pair. The sanctioned path establishes causality by construction
(`parsedInput → decide(parsedInput) → parsedOutput → persist`), and the draft constructor / repository
are unreachable from arbitrary application or service code — so the forged Input-A/Output-B persistence
Codex demonstrated has no mechanically-permitted path.

## P35A-05 — final status: **CLOSED (implementation claim)**

### Candidate-set completeness algorithm (§18–§29)

The production `corpusV1ProvenanceProvider.verify(input)` now checks AUTHENTICITY (every supplied
rule/scope is an exact Corpus-v1 member by canonical hash) AND COMPLETENESS. Required scopes: with
`selectedScopeId`, exactly the selected scope (must be a Corpus-v1 scope for the merchant and present,
§21); otherwise every Corpus-v1 scope for the runtime merchant whose frozen `PurchaseSignature` is
RELEVANT to the context (MATCH or MISSING — a faithful, engine-free reuse of canonical
PurchaseSignature identity via `canonicalItemsEqual`, §22/§24), and every relevant scope must be
present. For each required scope, the COMPLETE set of currently-active Corpus-v1 rules belonging to it
must be present — exact `ruleId@version` set equality, order-invariant (§29). Only the frozen ACTIVE
corpus is used (§25); dynamic operational state is never consulted (§26). The pure engine is untouched
(§23).

### Chinawok exploit result

`sc_cw_chijaukay_alopobre` requires `{CW-PLIN-01, CW-SIP-01}`. A SIP-only input fails completeness
before `decide` — offline and in real Postgres with **zero snapshot and zero receipt rows**, and the
idempotency key is NOT consumed (a corrected complete request reuses it successfully). The full input
still yields `BEST_CONFIRMED CW-PLIN-01`.

### Second completeness control

`sc_pop_6pcs_family_potato` requires `{POP-BCP-01, POP-SIP-02}`. A POP-SIP-02-only input fails
completeness with zero rows (real Postgres).

### Provenance-failure row-count result

Real-Postgres proof: a membership OR completeness failure adds **0** `decision_snapshot` and **0**
`decision_idempotency_receipt` rows; the key stays reusable (§33).

## PostgreSQL integration results — **EXECUTED, 23/23 PASS**

Ephemeral PostgreSQL 18.4, two phases in one cluster: staged-upgrade DB (3) + main suite DB (20) =
23. Main suite covers I1–I11, concurrency (I8/I9/I10 + same-key/different-request), both tables'
immutability, Chinawok + Popeyes completeness zero-row proofs, prototype/Date rejection with zero
rows, and two-table transaction atomicity. Migration chain (base + corrected closure) applies clean
via `prisma migrate deploy`.

## Offline gate results — all exit 0

`pnpm lint`, `pnpm typecheck`, `pnpm test` (**358**), `pnpm corpus:validate`, `pnpm build`,
`pnpm db:validate`, `pnpm format:check`, `pnpm db:migrate:check` (now also guards backfill-before-drop
+ explicit transaction).

## P35A-06 — **MEDIUM, DEFERRED BEFORE WAVE 0**

The real PostgreSQL suite WAS executed this closure (23/23). CI still has no Postgres service, so
P35A-06 is not claimed closed.

## P35A-03 / P35A-04 — **CLOSED, unchanged**

Standing regressions remain green (prototype/Date/class/sparse rejection; exact v1 versions; local v1
tokens; local v1 instant parser).

## RT status (implementation claims pending Codex Sol)

RT08 CLOSED FOR DECISION PERSISTENCE; RT09 CLOSED FOR DECISION PERSISTENCE; RT13 CLOSED.

## Engine / corpus fact audit

`git diff 8535925…HEAD -- src/engine src/corpus/data` is empty. No economic-engine or factual-corpus
change.

## Commit SHA

One local second-closure commit (no push, no amend of `8535925…`). SHA reported in the delivery
summary.

## Final git status

Additive closure changes plus the corrected unreleased migration; engine/corpus untouched.

## Exact next action

**STOP.** Independent code RECHECK by **Codex Sol** focused on P35A-01/02/05. Do not begin M3.5B or
Wave 0.


---

# M3.5A FINAL MICRO-CLOSURE

Independent Codex Sol recheck of `d7d30974b90f6c41ba2d83ee7586deab4b907237` returned **B — ONE FINAL
MICRO-PATCH**: P35A-03/04 CLOSED; P35A-01, P35A-02, P35A-05 OPEN; plus a NEW **P35A-07** (concurrent
idempotency/business identity race). This bounded micro-closure addresses exactly those three targets.
No CRITICAL remains. Independent acceptance is NOT claimed; a final Codex Sol confirmation follows.

## Starting SHA

`d7d30974b90f6c41ba2d83ee7586deab4b907237` (working tree clean at start). One new micro-closure commit
on top; not amended.

## Files changed

**New:** `src/lib/module-capability.test.ts` (AST-based capability scanner).
**Modified:** `src/persistence/snapshot.ts` (central `assertReceiptMatchesRequest`),
`src/db/decision-snapshot-repository.ts`, `src/services/{decide-and-persist,index}.ts`,
`src/services/decide-and-persist.test.ts`, `src/db/decision-snapshot.integration.test.ts`,
`src/db/staged-upgrade.integration.test.ts`, `eslint.config.mjs`, `src/lib/boundary.test.ts`,
`scripts/pg-integration.ts`. **Unchanged:** `src/engine`, `src/corpus`.

## A. P35A-01 / P35A-07 — race identity — **CLOSED (implementation claim)**

The bug lived only in the repository's uniqueness-race reconciliation path (and the alias-conflict
path), which returned a receipt's linked snapshot on `requestHash` match ALONE — so a concurrent
`same key / same input / different business` caller could receive the OTHER business's snapshot.

Fix: a SINGLE invariant `assertReceiptMatchesRequest({ receipt, snapshot, requestedBusinessDecisionKey,
requestedRequestHash })` (in `snapshot.ts`) now guards EVERY receipt-return path — the service
exact-retry path, the repository race-reconciliation path, and the alias-conflict path. Success
requires BOTH `receipt.requestHash === requestedRequestHash` AND
`linkedSnapshot.businessDecisionKey === requestedBusinessDecisionKey`; otherwise
`IdempotencyConflictError`. `requestHash` semantics are unchanged (still `= inputHash`, §5).

Real-Postgres regression **R1** (§7): `same key / same input A / business D1 vs D2` run concurrently,
repeated 12× to actually exercise the reconciliation branch — exactly one succeeds, exactly one throws
`IdempotencyConflictError`, one snapshot + one receipt for the key, and the winner's returned snapshot
carries ITS OWN `businessDecisionKey` (the loser's business has zero snapshots). The full I1–I11 matrix
+ migrated-K_OLD + exact-retry-no-recompute remain green.

## B. P35A-02 — module boundary — **CLOSED (implementation claim)**

`no-restricted-imports` cannot see dynamic `import()`, `.js` suffixes or some relative forms, so a new
AST-based **module-capability boundary test** (`src/lib/module-capability.test.ts`) enforces the
CAPABILITY, not a spelling. It extracts every specifier (static import/export AND dynamic `import()`)
with the TypeScript parser, normalizes it (strip `.js`/`.ts`, resolve relative traversal, drop the
`@/` alias) to a canonical module id, and forbids the raw internals (`db/client`,
`db/decision-snapshot-repository`, `persistence/{snapshot,provenance,build-meta}`, `@prisma/client`)
and the deep DI module (`services/decide-and-persist`) from every production file except the exact
sanctioned implementation. It scans the REAL source tree (zero offenders) and rejects all eight
attack spellings (static/dynamic × alias/relative × with/without `.js`) plus raw-Prisma and
deep-module forms from an arbitrary `services/evil-service.ts`. ESLint remains as a first line
(`FORBIDDEN_WRITE_AND_DEEP` on app/lib/all-services; deep module allowed only from `services/index.ts`;
raw internals allowed only from `services/decide-and-persist.ts`).

Forged-pair recheck: an arbitrary service can obtain neither `DecisionSnapshotRepository.createDecision`
nor `buildDecisionSnapshotDraft` nor raw `prisma.decisionSnapshot.create` through any module syntax,
and the public surface accepts no caller-supplied output — so the forged Input-A/Output-B write has no
mechanically-permitted route. Raw reads are covered by the same scanner (a caller cannot obtain
`findSnapshotById`/raw rows and bypass integrity-verified `loadDecisionSnapshot`).

## C. P35A-05 — trusted production service — **CLOSED (implementation claim)**

Dependency injection was the remaining defect: the public API accepted
`corpusProvenanceFactory`/`buildProviderFactory`, letting ordinary code (calling only the sanctioned
service) substitute a fake provider and mislabel an incomplete SIP-only Chinawok as Corpus-v1.

Fix — two tiers. PUBLIC `decideAndPersist(request)` / `loadDecisionSnapshot(id)` /
`replayDecisionSnapshot(id)` take ONE argument and bind the TRUSTED production dependencies
(`corpusV1ProvenanceProvider`, `envBuildMetadataProvider`, production repository, accepted engine) —
no injection possible. INTERNAL `*WithDeps` keep injection for deterministic tests / provider-call
counters / race testing; they are NOT re-exported by the barrel, and the deep module
`@/services/decide-and-persist` is boundary-blocked, so DI is reachable only from the sanctioned file
and tests. The lazy-provider contract is preserved (retry/alias construct no provider).

Public-API attacks: passing a provider/deps argument to `decideAndPersist(request)` is a COMPILE error
(`@ts-expect-error` guards), and the request type carries no `corpusVersion`/`gitSha`/`buildId`/
provider/repository/output fields. Real-Postgres via the PUBLIC API: full Chinawok →
`BEST_CONFIRMED CW-PLIN-01`; SIP-only → `CorpusProvenanceError` with zero snapshot & zero receipt rows.
The default completeness algorithm (Chinawok/Popeyes) is unchanged.

## PostgreSQL integration — **EXECUTED, 26/26 PASS**

Ephemeral PostgreSQL 18.4, two DBs in one cluster: staged-upgrade (3) + main (23) = 26. Main adds R1
(race identity), the public-API trusted tests (§28), the Chinawok/Popeyes completeness zero-row proofs,
both tables' immutability, prototype/Date rejection, and two-table atomicity. Migration chain applies
clean via `prisma migrate deploy`; the staged upgrade preserves `K_OLD` and blocks its reuse.

## Offline gates — all exit 0

`pnpm lint`, `pnpm typecheck`, `pnpm test` (**366**), `pnpm corpus:validate`, `pnpm build`,
`pnpm db:validate`, `pnpm format:check`, `pnpm db:migrate:check`.

## Public export audit (§35)

- `src/db/index.ts`: `export {}` — no surface.
- `src/services/index.ts`: `decideAndPersist`, `loadDecisionSnapshot`, `replayDecisionSnapshot`,
  `DecideAndPersistRequest`, `DecisionSnapshotDto`/`ReplayComparison` types, typed errors. NOT
  `DecideAndPersistDeps`, `*WithDeps`, providers, repository, engine, or output.
- `src/persistence/index.ts`: canonicalize/hash, version constants, frozen schemas + read-side
  verify/replay/coherence, `DecisionSnapshotDraft`/`BuildMetadata` TYPES, errors. NOT the draft
  constructor, store impl, or providers.
- Ordinary production code CANNOT override engine, corpus provenance, build provenance, repository, or
  historical output — confirmed at the type/API level and by the module-capability scanner.

## P35A-03 / P35A-04 — CLOSED, unchanged

Standing regressions remain green (parse-once; canonicalizer prototype/Date/class/sparse rejection;
exact v1 versions; local v1 tokens; local v1 instant parser).

## P35A-06 — MEDIUM, DEFERRED BEFORE WAVE 0

Real PostgreSQL integration executed locally (26/26); CI still has no Postgres service.

## RT status (implementation claims pending Codex Sol)

RT08 CLOSED FOR DECISION PERSISTENCE; RT09 CLOSED FOR DECISION PERSISTENCE; RT13 CLOSED.

## Engine / corpus audit

`git diff d7d30974…HEAD -- src/engine src/corpus/data` is empty.

## Commit SHA

One local final micro-closure commit (no push, no amend of `d7d30974…`). SHA reported in the delivery
summary.

## Exact next action

**STOP.** Final independent Codex Sol confirmation focused on P35A-01/P35A-07, P35A-02, P35A-05, no new
CRITICAL/HIGH, and quality gates. Do not begin M3.5B or Wave 0.

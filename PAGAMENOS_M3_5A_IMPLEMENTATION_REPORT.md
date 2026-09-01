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

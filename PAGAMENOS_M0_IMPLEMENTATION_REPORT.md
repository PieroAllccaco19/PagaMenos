# PagaMenos — M0 Implementation Report

**Milestone:** M0 — Repository Bootstrap & Engineering Guardrails
**Authorization:** `A — IMPLEMENTATION GO` (M0 only). Authority & precedence recorded in
[`PAGAMENOS_SPEC_AUTHORITY.md`](./PAGAMENOS_SPEC_AUTHORITY.md).
**Date:** 2026-08-30 · **Platform:** Windows 11 · Node 22.19.0 · pnpm 10.33.0

---

## 1. M0 Verdict: **PASS**

Every M0 acceptance-gate criterion is satisfied. All required checks were executed and
passed; no M1+ (domain) work was implemented.

## 2. Repository findings before work

- Git repository **initialized but with zero commits** (unborn branch; `git rev-parse HEAD`
  failed as "unknown revision").
- Working tree contained only untracked research/spec `.md` files (Phase 0A, 0A-1, 0A-1B,
  0A-2 FINAL, red-team patch, patch Rev 2, RT-04 micro-patch). **All preserved unmodified.**
- No application code, `package.json`, or tooling present.
- Toolchain available: Node 22.19.0, pnpm 10.33.0, npm 11.6.0, git. npm registry reachable.

## 3. Files created / changed

**Created (application/tooling):** `package.json`, `pnpm-lock.yaml`, `tsconfig.json`,
`next.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`, `.prettierrc.json`,
`.prettierignore`, `.gitignore`, `.npmrc`, `.env.example`,
`src/app/{layout.tsx,page.tsx}`, boundary placeholders
`src/{engine,corpus,db,services,analytics,sourcemon}/index.ts`,
`src/lib/{logger.ts,env.ts,logger.test.ts,env.test.ts,boundary.test.ts}`,
`prisma/schema.prisma`, `.github/workflows/ci.yml`, `docs/LOGGING_PRIVACY_POLICY.md`.

**Created (docs):** `PAGAMENOS_SPEC_AUTHORITY.md`, `README.md`,
`PAGAMENOS_M0_IMPLEMENTATION_REPORT.md` (this file).

**Local only, git-ignored (not committed):** `.env` (dummy dev values).
**Changed:** none of the pre-existing spec `.md` files were modified.

## 4. Dependency choices (installed versions)

Runtime: `next@15.5.24`, `react@19.2.8`, `react-dom@19.2.8`, `zod@3.25.76`,
`@prisma/client@6.19.3`.
Dev: `typescript@5.9.3`, `typescript-eslint@8.68.0`, `eslint@9.39.5`, `@eslint/js@9.39.5`,
`vitest@3.2.7`, `fast-check@3.23.2` (installed, unused until M2/M3), `prettier@3.9.6`,
`prisma@6.19.3`, `@types/node@22.20.1`, `@types/react@19.2.18`, `@types/react-dom@19.2.5`.
No second backend, Redis, Kafka, queues, Elasticsearch, vector DB, Docker orchestration, or
microservices were added. pnpm native build scripts are allowlisted narrowly via
`pnpm.onlyBuiltDependencies` (`esbuild`, `prisma`, `@prisma/engines`); `@prisma/client`'s
postinstall is intentionally not run (no schema models yet, and it is not imported at M0).

## 5. TypeScript configuration

`strict: true` plus all requested strict options enabled: `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`.
`module: esnext`, `moduleResolution: bundler`, `jsx: preserve`, `paths` alias `@/* → ./src/*`,
`skipLibCheck: true` (standard for Next; keeps `exactOptionalPropertyTypes` from tripping on
third-party lib types). **No requested strict option was omitted.** `tsc --noEmit` passes; the
production build's type-check also passes.

## 6. Module-boundary mechanism

Mechanically enforced via the ESLint flat config (`eslint.config.mjs`): `no-restricted-imports`
+ `no-restricted-globals` applied to `src/engine/**` and `src/corpus/**`, forbidding imports of
`db/app/analytics/sourcemon/services`, Next, React, Prisma, and Node I/O builtins
(`fs/net/http/child_process/os/process/...`) and I/O globals (`process`, `fetch`, `__dirname`).
**Proof it works:** `src/lib/boundary.test.ts` runs the real ESLint config programmatically and
asserts (a) an `@/db` import from `src/engine` is rejected, (b) a Prisma + `node:fs` import from
`src/corpus` is rejected, (c) the same `@/db` import from `src/services` is allowed. CI runs
`pnpm lint` and `pnpm test`, so a prohibited import fails CI.

## 7. Prisma / database baseline

`prisma/schema.prisma` contains the `generator` + `postgresql` `datasource` only — **zero domain
models** (scope audit: `model` count = 0). Migrations are explicit; ORM auto-sync
(`prisma db push`) is not used and not scripted. `pnpm db:validate` → "The schema … is valid".
No speculative Participant/Decision/Rule tables were created.

## 8. Logging / privacy controls (RT-16)

Allowlist policy `docs/LOGGING_PRIVACY_POLICY.md` established before any app logging.
`src/lib/logger.ts` enforces it: only `ALLOWED_LOG_FIELDS` pass through `sanitizeLogFields` /
`createLogEvent`, with a defensive sensitive-substring drop (email, token, cookie, session,
secret, url, evidence, portfolio, basket, snapshot, DATABASE_URL, …). Verified by
`src/lib/logger.test.ts` (3 tests). Sentry is **not** installed (deferred; no unnecessary
telemetry) — the policy documents its future scrub/no-replay contract.

## 9. Environment / secret controls

`src/lib/env.ts` (Zod) validates a **server** schema (`DATABASE_URL` url-checked, optional at
M0) separately from a **public** schema (`NEXT_PUBLIC_*` only). Parsing is explicit, not
import-time. `.env.example` contains variable names/placeholders and **no secrets**; `.env` is
git-ignored and untracked (verified). Server secrets are never exposed via `NEXT_PUBLIC_*`.
Validated by `src/lib/env.test.ts` (4 tests, incl. rejection of a malformed `DATABASE_URL`).

## 10. CI configuration

`.github/workflows/ci.yml`: `pnpm/action-setup` + `setup-node@22` (pnpm cache) →
`pnpm install --frozen-lockfile` → `pnpm lint` → `pnpm typecheck` → `pnpm test` → `pnpm build`
→ `pnpm db:validate` (dummy `DATABASE_URL`) → `pnpm format:check`. **`typecheck` runs before
`build` and does not depend on it** — see §16. Boundary violations fail via `lint` and `test`.

## 11. Commands executed and exact outcomes

| Command | Outcome | Exit |
| --- | --- | --- |
| `pnpm install` (+ reinstall for allowlisted native scripts) | 293 pkgs resolved; esbuild & @prisma/engines postinstall ran | 0 |
| `pnpm build` (`next build`) | ✓ Compiled in ~4.8s; types valid; 4 static routes | 0 |
| `pnpm lint` (`eslint .`) | clean, no findings | 0 |
| `pnpm typecheck` (`tsc --noEmit`) | clean | 0 |
| `pnpm test` (`vitest run`) | 3 files, **10 tests passed** (incl. 3 boundary self-tests) | 0 |
| `pnpm db:validate` (`prisma validate`) | "The schema … is valid 🚀" | 0 |
| `pnpm format:check` (`prettier --check .`) | "All matched files use Prettier code style!" | 0 |

Two non-defect adjustments were made during verification: (a) added a git-ignored `.env` and a
dummy `DATABASE_URL` on the CI validate step, because `prisma validate` resolves `env(...)`;
(b) ran `pnpm format` once to normalize 3 files (whitespace only). Both re-verified green above.

## 12. Remaining warnings

- pnpm/Prisma print benign "update available" notices (Next 16, Prisma 8, etc.). We
  intentionally pin current stable majors (Next 15 / React 19 / Prisma 6) for M0; upgrades are a
  separate decision.
- pnpm labels the `eslint` npm package "deprecated" (a dist-tag artifact); ESLint 9 is the
  current supported line and works correctly here.
- No functional warnings from lint, typecheck, test, build, or validate.

## 13. Scope audit — no M1+ work implemented

Confirmed absent: corpus/rule encoding, `RuleVersion`/`ComparisonScope`/`PurchaseSignature`,
economic calculations, decision states, decision engine logic, participant flow/UI (only a
static placeholder page), auth, analytics events, source monitor/adapters, outcomes/evidence,
admin, deployment, and M3.5 persistence. Prisma has 0 models; `src/engine` and `src/corpus`
are `export {}` boundary placeholders.

## 14. Git status / diff summary

The M0 baseline is captured in a **single local commit** (message `chore: establish PagaMenos
M0 validation baseline`) containing the authoritative spec `.md` files, all M0 tooling/code/docs,
and `pnpm-lock.yaml`. Its SHA is recorded in §16 and retrievable via `git rev-parse HEAD`.
`.env`, `node_modules/`, and `.next/` are git-ignored and excluded from the commit. The commit
was **not pushed** (none requested; deployment is not authorized). No destructive git operations
were used.

## 15. Exact recommended next action

1. Review the working tree, then create the initial commit of the M0 baseline (all files above
   except the git-ignored `.env`), e.g. on a branch — implementer's choice — since none was made
   here.
2. Submit this report to the **independent M0 gate** for approval.
3. **Do not begin M1** until that approval is granted. When authorized, M1 = corpus + typed rule
   domain (`ComparisonScope`/`PurchaseSignature`/two-axis operational state) + version-controlled
   seed + blocking corpus linter, per the standing revised DoD.

---

## 16. Finalization Patch (post-review)

Applied after the "PASS with one small required patch" M0 review:

1. **Standalone typecheck.** `typecheck` is now `next typegen && tsc --noEmit` (with a `typegen`
   script). Verified from a clean state (`.next` and `next-env.d.ts` deleted): `pnpm typecheck`
   regenerates Next's route/ambient types itself and passes with **no prior `next build`**.
   `next-env.d.ts` remains a generated artifact (git-ignored), not hand-maintained source.
2. **CI order corrected** to `install → lint → typecheck → test → build → db:validate →
   format:check`. `typecheck` no longer depends on a prior build; `format:check` added.
3. **Prisma-generate path documented** (README "Database"): when the first models are added,
   allowlist `@prisma/client` in `pnpm.onlyBuiltDependencies`, then `pnpm db:generate` /
   `pnpm db:migrate`. No client or models generated now.
4. **Clean-order verification** (artifacts removed first), exact results:

| # | Command | Result | Exit |
| --- | --- | --- | --- |
| 1 | `pnpm lint` | clean | 0 |
| 2 | `pnpm typecheck` | route types generated, then `tsc` clean (no prior build) | 0 |
| 3 | `pnpm test` | 3 files, 10 tests passed (incl. 3 boundary self-tests) | 0 |
| 4 | `pnpm build` | ✓ compiled; 4 static routes | 0 |
| 5 | `pnpm db:validate` | "The schema … is valid 🚀" | 0 |
| 6 | `pnpm format:check` | "All matched files use Prettier code style!" | 0 |

Module-boundary enforcement re-confirmed by `src/lib/boundary.test.ts` (engine→`@/db` rejected,
corpus→Prisma+`node:fs` rejected, services→`@/db` allowed).

**Baseline commit:** one local commit `chore: establish PagaMenos M0 validation baseline`
(not pushed). Its SHA is reported in the finalization summary and via `git rev-parse HEAD`.

## Final M0 gate: **PASS** (finalized)

All checks green in the required independent order; standalone typecheck confirmed; single
immutable M0 baseline commit created. **STOP — M1 not started; awaiting M0 gate approval.**

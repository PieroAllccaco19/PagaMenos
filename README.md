# PagaMenos — Validation System

Smallest reliable software foundation for the **Phase 0A behavioral-validation** experiment.
This is **not** the production PagaMenos product. Scope, semantics, and precedence are fixed
by the specification documents recorded in [`PAGAMENOS_SPEC_AUTHORITY.md`](./PAGAMENOS_SPEC_AUTHORITY.md).

> **Current milestone: M0 (repository bootstrap).** No domain logic — no corpus, decision
> engine, participant UI, auth, analytics, source monitor, or deployment — is implemented yet.

## Stack

Next.js (App Router) · React 19 · TypeScript (strict) · PostgreSQL + Prisma · Zod · Vitest
(+ fast-check) · ESLint (flat) · pnpm · GitHub Actions. Single modular monolith — no second
backend, no microservices.

## Requirements

- Node.js ≥ 20 (developed on 22)
- pnpm ≥ 10 (`corepack enable` or a global install)
- PostgreSQL (only needed from M1/M3.5 onward; unused at M0)

## Bootstrap from a clean checkout

```bash
pnpm install
cp .env.example .env   # then edit values locally; never commit .env
pnpm lint
pnpm build             # also generates Next's ambient types used by typecheck
pnpm typecheck
pnpm test
```

No undocumented manual steps are required.

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Next dev server |
| `pnpm build` | Production build (fails on type errors) |
| `pnpm lint` | ESLint (includes the engine/corpus purity boundary) |
| `pnpm boundaries` | Lint only the pure layers (`src/engine`, `src/corpus`) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest (includes the boundary self-test) |
| `pnpm format` / `pnpm format:check` | Prettier |
| `pnpm db:validate` / `db:generate` / `db:migrate` | Prisma (no domain models yet) |

## Architecture boundaries

```
src/
  engine/     PURE — no db/app/analytics/sourcemon/services, Next, React, Prisma, or I/O
  corpus/     PURE — version-controlled corpus data, schema & seed builder
  db/         Prisma client + repositories (only persistence layer)
  services/   use-case orchestration
  analytics/  first-party canonical_event telemetry
  sourcemon/  bounded 4-provider source monitor
  lib/        shared utilities (env validation, RT-16 logger)
  app/        Next.js App Router
```

The `engine`/`corpus` purity boundary is **mechanically enforced** by the ESLint flat config
and verified by `src/lib/boundary.test.ts` (a prohibited import fails `pnpm lint` and
`pnpm test`, so CI rejects it). See also [`docs/LOGGING_PRIVACY_POLICY.md`](./docs/LOGGING_PRIVACY_POLICY.md)
(RT-16).

## Database

Prisma is configured (`prisma/schema.prisma`) with the datasource/generator only — **no
domain models**. Migrations are explicit; ORM auto-sync (`prisma db push`) is not used.

**Client generation is intentionally deferred until real models exist.** When the first
Prisma models are introduced (M1 corpus / M3.5 persistence):

1. add the models to `prisma/schema.prisma`;
2. allow the client build script once by adding `@prisma/client` to
   `pnpm.onlyBuiltDependencies` in `package.json`, then `pnpm install`;
3. run `pnpm db:generate` (`prisma generate`) to emit the typed client, and
   `pnpm db:migrate` for the initial migration.

No client is generated at M0 because there are no models and nothing imports `@prisma/client`.

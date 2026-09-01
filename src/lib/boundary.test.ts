// Mechanical proof that the architectural purity boundary is ENFORCED, not just documented.
// Runs the project's real ESLint flat config against virtual probe files and asserts that a
// prohibited import is rejected inside the pure layers (src/engine, src/corpus) yet allowed
// in a non-pure layer (src/services). If the boundary rule regresses, this test fails — and
// CI (`pnpm test`) rejects the change.
import path from 'node:path';

import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

async function ruleIdsFor(relativeFilePath: string, code: string): Promise<string[]> {
  const eslint = new ESLint();
  const results = await eslint.lintText(code, {
    filePath: path.resolve(process.cwd(), relativeFilePath),
  });
  return results
    .flatMap((r) => r.messages.map((m) => m.ruleId ?? ''))
    .filter((id): id is string => id.length > 0);
}

const IMPORT_DB = "import { thing } from '@/db/client';\nexport const x = thing;\n";
const IMPORT_PRISMA_AND_FS = "import '@prisma/client';\nimport 'node:fs';\nexport {};\n";
const IMPORT_PERSISTENCE =
  "import { canonicalHash } from '@/persistence';\nexport const x = canonicalHash;\n";
const IMPORT_CRYPTO = "import { createHash } from 'node:crypto';\nexport const x = createHash;\n";
const IMPORT_REPO =
  "import { decisionSnapshotRepository } from '@/db/decision-snapshot-repository';\nexport const x = decisionSnapshotRepository;\n";
const IMPORT_DRAFT =
  "import { buildDecisionSnapshotDraft } from '@/persistence/snapshot';\nexport const x = buildDecisionSnapshotDraft;\n";
const IMPORT_PROVENANCE =
  "import { corpusV1ProvenanceProvider } from '@/persistence/provenance';\nexport const x = corpusV1ProvenanceProvider;\n";
const IMPORT_PRISMA =
  "import { PrismaClient } from '@prisma/client';\nexport const x = PrismaClient;\n";
// Relative-traversal variants (P35A-02 §14) — must be caught just like the alias forms.
const IMPORT_REPO_REL =
  "import { decisionSnapshotRepository } from '../db/decision-snapshot-repository';\nexport const x = decisionSnapshotRepository;\n";
const IMPORT_DRAFT_REL =
  "import { buildDecisionSnapshotDraft } from '../persistence/snapshot';\nexport const x = buildDecisionSnapshotDraft;\n";
// The deep DI module (P35A-05 §20) — exposes the injectable *WithDeps surface.
const IMPORT_DEEP_SERVICE =
  "import { decideAndPersistWithDeps } from '@/services/decide-and-persist';\nexport const x = decideAndPersistWithDeps;\n";

describe('module-boundary enforcement (engine/corpus purity)', () => {
  it('rejects a prohibited @/db import from src/engine', async () => {
    const ids = await ruleIdsFor('src/engine/__probe__.ts', IMPORT_DB);
    expect(ids).toContain('no-restricted-imports');
  });

  it('rejects a Prisma + node:fs import from src/corpus', async () => {
    const ids = await ruleIdsFor('src/corpus/__probe__.ts', IMPORT_PRISMA_AND_FS);
    expect(ids).toContain('no-restricted-imports');
  });

  it('rejects a prohibited @/persistence import from src/engine (§29)', async () => {
    const ids = await ruleIdsFor('src/engine/__probe__.ts', IMPORT_PERSISTENCE);
    expect(ids).toContain('no-restricted-imports');
  });

  it('rejects a node:crypto import from src/engine (hashing lives at the persistence boundary, §8)', async () => {
    const ids = await ruleIdsFor('src/engine/__probe__.ts', IMPORT_CRYPTO);
    expect(ids).toContain('no-restricted-imports');
  });

  it('allows @/persistence + node:crypto from src/services (non-pure layer)', async () => {
    const ids = await ruleIdsFor('src/services/__probe__.ts', IMPORT_PERSISTENCE + IMPORT_CRYPTO);
    expect(ids).not.toContain('no-restricted-imports');
  });
});

describe('sanctioned write-boundary enforcement (P35A-02 §13/§15)', () => {
  it('rejects the db repository / draft constructor from normal application code (src/app)', async () => {
    expect(await ruleIdsFor('src/app/__probe__.ts', IMPORT_REPO)).toContain(
      'no-restricted-imports',
    );
    expect(await ruleIdsFor('src/app/__probe__.ts', IMPORT_DRAFT)).toContain(
      'no-restricted-imports',
    );
  });

  it('rejects the raw Prisma client / provenance provider from src/lib', async () => {
    expect(await ruleIdsFor('src/lib/__probe__.ts', IMPORT_PRISMA)).toContain(
      'no-restricted-imports',
    );
    expect(await ruleIdsFor('src/lib/__probe__.ts', IMPORT_PROVENANCE)).toContain(
      'no-restricted-imports',
    );
  });

  it('rejects write internals from an ARBITRARY service (alias imports)', async () => {
    const evil = 'src/services/evil-service.ts';
    expect(await ruleIdsFor(evil, IMPORT_REPO)).toContain('no-restricted-imports');
    expect(await ruleIdsFor(evil, IMPORT_DRAFT)).toContain('no-restricted-imports');
    expect(await ruleIdsFor(evil, IMPORT_PROVENANCE)).toContain('no-restricted-imports');
    expect(await ruleIdsFor(evil, IMPORT_PRISMA)).toContain('no-restricted-imports');
  });

  it('rejects write internals from an ARBITRARY service via RELATIVE imports (§14)', async () => {
    const evil = 'src/services/evil-service.ts';
    expect(await ruleIdsFor(evil, IMPORT_REPO_REL)).toContain('no-restricted-imports');
    expect(await ruleIdsFor(evil, IMPORT_DRAFT_REL)).toContain('no-restricted-imports');
  });

  it('ALLOWS write internals ONLY from the sanctioned decision-persistence file', async () => {
    const ids = await ruleIdsFor(
      'src/services/decide-and-persist.ts',
      IMPORT_REPO + IMPORT_DRAFT + IMPORT_PROVENANCE,
    );
    expect(ids).not.toContain('no-restricted-imports');
  });

  it('rejects the deep DI module from an arbitrary service and from src/app (P35A-05 §20)', async () => {
    expect(await ruleIdsFor('src/services/evil-service.ts', IMPORT_DEEP_SERVICE)).toContain(
      'no-restricted-imports',
    );
    expect(await ruleIdsFor('src/app/__probe__.ts', IMPORT_DEEP_SERVICE)).toContain(
      'no-restricted-imports',
    );
  });

  it('ALLOWS the deep DI module from the public barrel (src/services/index.ts)', async () => {
    const ids = await ruleIdsFor('src/services/index.ts', IMPORT_DEEP_SERVICE);
    expect(ids).not.toContain('no-restricted-imports');
  });
});

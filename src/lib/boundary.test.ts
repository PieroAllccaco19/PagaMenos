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
const IMPORT_PRISMA =
  "import { PrismaClient } from '@prisma/client';\nexport const x = PrismaClient;\n";

describe('module-boundary enforcement (engine/corpus purity)', () => {
  it('rejects a prohibited @/db import from src/engine', async () => {
    const ids = await ruleIdsFor('src/engine/__probe__.ts', IMPORT_DB);
    expect(ids).toContain('no-restricted-imports');
  });

  it('rejects a Prisma + node:fs import from src/corpus', async () => {
    const ids = await ruleIdsFor('src/corpus/__probe__.ts', IMPORT_PRISMA_AND_FS);
    expect(ids).toContain('no-restricted-imports');
  });

  it('allows the same @/db import from src/services (non-pure layer)', async () => {
    const ids = await ruleIdsFor('src/services/__probe__.ts', IMPORT_DB);
    expect(ids).not.toContain('no-restricted-imports');
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

describe('sanctioned write-boundary enforcement (P35A-02)', () => {
  it('rejects the db repository write API from normal application code (src/app)', async () => {
    const ids = await ruleIdsFor('src/app/__probe__.ts', IMPORT_REPO);
    expect(ids).toContain('no-restricted-imports');
  });

  it('rejects the snapshot draft constructor from normal application code (src/app)', async () => {
    const ids = await ruleIdsFor('src/app/__probe__.ts', IMPORT_DRAFT);
    expect(ids).toContain('no-restricted-imports');
  });

  it('rejects the raw Prisma client from normal application code (src/lib)', async () => {
    const ids = await ruleIdsFor('src/lib/__probe__.ts', IMPORT_PRISMA);
    expect(ids).toContain('no-restricted-imports');
  });

  it('ALLOWS the same write imports from the sanctioned service (src/services)', async () => {
    const ids = await ruleIdsFor('src/services/__probe__.ts', IMPORT_REPO + IMPORT_DRAFT);
    expect(ids).not.toContain('no-restricted-imports');
  });
});

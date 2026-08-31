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
});

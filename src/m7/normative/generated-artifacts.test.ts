// M7 S01 — the committed prisma/m7/normative/ artifacts are exactly a fresh deterministic generation
// from the accepted bytes (the unit-suite twin of `pnpm m7:ddl:check`).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

import { REPO_ROOT, e01Bytes, v11Bytes, v11Text } from './__fixtures__/accepted-sources';
import {
  NORMATIVE_OUTPUT_DIR,
  diffArtifacts,
  generateNormativeArtifacts,
  isClean,
} from './generate';
import { SourceIdentityError, sha256Hex } from './source';

function readCommitted(): Map<string, string> {
  const root = join(REPO_ROOT, NORMATIVE_OUTPUT_DIR);
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) =>
      statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)],
    );
  return new Map(
    walk(root).map((abs) => [relative(root, abs).replace(/\\/g, '/'), readFileSync(abs, 'utf8')]),
  );
}

const generated = generateNormativeArtifacts(v11Bytes, e01Bytes);

describe('S01 generated artifacts', () => {
  it('generation is deterministic', () => {
    const again = generateNormativeArtifacts(v11Bytes, e01Bytes);
    expect([...again.files.entries()]).toEqual([...generated.files.entries()]);
  });

  it('the committed directory has no drift, no missing and no extra file', () => {
    const drift = diffArtifacts(generated.files, readCommitted());
    expect(drift).toEqual({ missing: [], unexpected: [], changed: [] });
    expect(generated.files.size).toBe(31);
  });

  it('every sql/ file is byte-identical to its source fence body', () => {
    const index = JSON.parse(generated.files.get('EXTRACTION_INDEX.json')!) as {
      fragments: { file: string; fenceOpenLine: number; fenceCloseLine: number; sha256: string }[];
    };
    const lines = v11Text.split('\n');
    expect(index.fragments).toHaveLength(26);
    for (const f of index.fragments) {
      const body = `${lines.slice(f.fenceOpenLine, f.fenceCloseLine - 1).join('\n')}\n`;
      expect(generated.files.get(f.file)).toBe(body);
      expect(sha256Hex(body)).toBe(f.sha256);
    }
  });

  it('the index lists every other artifact with its SHA-256', () => {
    const index = JSON.parse(generated.files.get('EXTRACTION_INDEX.json')!) as {
      files: { path: string; sha256: string }[];
    };
    expect(index.files.map((f) => f.path)).toEqual(
      [...generated.files.keys()].filter((p) => p !== 'EXTRACTION_INDEX.json'),
    );
    for (const f of index.files) expect(sha256Hex(generated.files.get(f.path)!)).toBe(f.sha256);
  });

  it('writes only inside prisma/m7/normative (never prisma/migrations)', () => {
    expect(NORMATIVE_OUTPUT_DIR).toBe('prisma/m7/normative');
    for (const p of generated.files.keys()) {
      expect(p).not.toMatch(/(^|\/)\.\.(\/|$)|^\//);
      expect(p).not.toMatch(/migration/i);
    }
    expect([...generated.files.keys()].some((p) => /manifest/i.test(p))).toBe(false);
  });

  it('a controlled drift (changed, missing, extra file) is detected, and restoration is clean', () => {
    const committed = readCommitted();
    const mutated = new Map(committed);
    mutated.set(
      'sql/02_19.3_enumerated-types.sql',
      `${committed.get('sql/02_19.3_enumerated-types.sql')}-- drift\n`,
    );
    mutated.delete('INVENTORY.json');
    mutated.set('sql/27_extra.sql', 'SELECT 1;\n');
    expect(diffArtifacts(generated.files, mutated)).toEqual({
      missing: ['INVENTORY.json'],
      unexpected: ['sql/27_extra.sql'],
      changed: ['sql/02_19.3_enumerated-types.sql'],
    });
    expect(isClean(diffArtifacts(generated.files, committed))).toBe(true);
  });

  it('refuses to generate from bytes that are not the accepted specification', () => {
    const mutated = Uint8Array.from(v11Bytes);
    mutated[mutated.length - 2] = 0x20;
    expect(() => generateNormativeArtifacts(mutated, e01Bytes)).toThrow(SourceIdentityError);
    expect(() => generateNormativeArtifacts(e01Bytes, v11Bytes)).toThrow(SourceIdentityError);
  });
});

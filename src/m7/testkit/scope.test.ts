// M7 S02 — source-level scope guard: the harness is infrastructure and installs no M7 (offline).
//
// S03 owns installing the S01 normative DDL. No S02 harness or testkit source may read the normative SQL
// fragments, create schema `m7`, or write under prisma/migrations/.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { REPO_ROOT } from '../normative/__fixtures__/accepted-sources';

const S02_SOURCES = [
  ...readdirSync(join(REPO_ROOT, 'src/m7/testkit'))
    // Offline unit tests are excluded: some of them deliberately embed refused statements as controls.
    .filter((f) => f.endsWith('.ts') && !/(?<!\.m7-pg)\.test\.ts$/.test(f))
    .map((f) => `src/m7/testkit/${f}`),
  'scripts/m7/pg-m7-harness.ts',
  'scripts/m7/provision/roles.template.sql',
  'vitest.m7-pg.config.ts',
];

/** Executable text only: `--` SQL comments and `//` TS line comments removed. */
function code(rel: string): string {
  const text = readFileSync(join(REPO_ROOT, rel), 'utf8');
  return rel.endsWith('.sql')
    ? text.replace(/--[^\n]*/g, '')
    : text.replace(/^\s*\/\/[^\n]*/gm, '');
}

describe('S02 scope: no M7 installation surface', () => {
  it.each(S02_SOURCES)('%s does not reference the normative SQL or install M7', (rel) => {
    const text = code(rel);
    expect(text).not.toMatch(/normative[\\/]sql/);
    expect(text).not.toMatch(/(?<!roles\.template)\.sql['"`]/);
    expect(text).not.toMatch(/CREATE\s+SCHEMA\s+(IF\s+NOT\s+EXISTS\s+)?"?m7"?[\s;]/i);
    expect(text).not.toMatch(/writeFileSync\([^)]*migrations/);
  });

  it('covers the harness entry point and the template', () => {
    expect(S02_SOURCES).toContain('scripts/m7/pg-m7-harness.ts');
    expect(S02_SOURCES.length).toBeGreaterThan(8);
  });
});

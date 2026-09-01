// PagaMenos · persistence — frozen-v1 source-boundary assertion (P35A-04 §31/§48).
//
// A source-level guard (not a monkey-patch): the frozen v1 schema and its token/instant modules must
// NOT runtime-import the live mutable domain arrays/validators from `@/corpus` or `@/engine`. Only
// `import type` (compile-time) is allowed. If a future edit turns one of those into a value import,
// this test fails — forcing a deliberate persistence-version decision rather than a silent v1 drift.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/** Matches a VALUE import (not `import type`) that pulls from @/corpus or @/engine. */
const VALUE_IMPORT_FROM_DOMAIN = /import\s+(?!type\b)[^;]*?from\s+['"]@\/(?:corpus|engine)['"]/s;

/** Strip line + block comments so the regex only sees real import statements (no comment prose). */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

const FROZEN_FILES = ['schema.ts', 'tokens-v1.ts', 'instant-v1.ts'];

describe('frozen v1 schema does not runtime-import live domain arrays/validators', () => {
  for (const file of FROZEN_FILES) {
    it(`${file} has no value import from @/corpus or @/engine`, () => {
      const src = stripComments(
        readFileSync(path.resolve(process.cwd(), 'src/persistence', file), 'utf8'),
      );
      expect(VALUE_IMPORT_FROM_DOMAIN.test(src)).toBe(false);
    });
  }

  it('schema.ts sources its instant validator from the frozen local module', () => {
    const src = readFileSync(path.resolve(process.cwd(), 'src/persistence/schema.ts'), 'utf8');
    expect(src).toMatch(/from '\.\/instant-v1'/);
    expect(src).toMatch(/from '\.\/tokens-v1'/);
    // And must NOT import the live corpus instant validator by name.
    expect(src).not.toMatch(/isValidInstant\b(?!V1)/);
  });
});

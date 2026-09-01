// PagaMenos · module-capability boundary (P35A-02 §10–§16/§29).
//
// `no-restricted-imports` only sees STATIC import specifiers and is fooled by dynamic `import()`,
// `.js`/`.ts` suffixes and relative traversal. This test enforces the CAPABILITY: ordinary production
// code outside the exact sanctioned implementation must not obtain the raw decision-persistence
// internals (repository, draft constructor, providers, raw Prisma client) NOR the deep DI module,
// through ANY module syntax. Specifiers are extracted with the TypeScript parser (static import/export
// AND dynamic import()), then normalized (strip extension, resolve relative, drop the `@/` alias) so
// every equivalent spelling maps to the same prohibited capability.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const SRC = path.resolve(process.cwd(), 'src');

/** Raw write/read internals (src-relative module ids, no extension). */
const RAW_WRITE_MODULES = new Set([
  'db/client',
  'db/index',
  'db/decision-snapshot-repository',
  'persistence/snapshot',
  'persistence/provenance',
  'persistence/build-meta',
]);
/** The deep DI module (importing it exposes the injectable *WithDeps surface). */
const DEEP_SERVICE = new Set(['services/decide-and-persist']);

type Kind = 'raw' | 'deep';
interface Violation {
  specifier: string;
  kind: Kind;
}

/** Extract every module specifier: static import/export + dynamic import(). */
function specifiers(code: string): string[] {
  const sf = ts.createSourceFile(
    'probe.tsx',
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const out: string[] = [];
  const visit = (n: ts.Node): void => {
    if (
      (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) &&
      n.moduleSpecifier &&
      ts.isStringLiteral(n.moduleSpecifier)
    ) {
      out.push(n.moduleSpecifier.text);
    } else if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const a = n.arguments[0];
      if (a && ts.isStringLiteral(a)) out.push(a.text);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

/** Normalize a specifier (from a src-relative file) to `{external}` or a src-relative `{module}`. */
function normalize(
  spec: string,
  fromSrcRel: string,
): { external?: string; module?: string } | null {
  if (spec === '@prisma/client' || spec.startsWith('@prisma/'))
    return { external: '@prisma/client' };
  const noExt = spec.replace(/\.(js|ts|tsx|mjs|cjs)$/, '');
  if (noExt.startsWith('@/')) return { module: noExt.slice(2) };
  if (noExt.startsWith('.')) {
    const dir = path.posix.dirname(fromSrcRel.replace(/\\/g, '/'));
    return { module: path.posix.normalize(path.posix.join(dir, noExt)) };
  }
  return null; // bare non-@ package (e.g. 'zod') — not a capability module
}

function forbiddenCapabilities(code: string, fromSrcRel: string): Violation[] {
  const v: Violation[] = [];
  for (const spec of specifiers(code)) {
    const n = normalize(spec, fromSrcRel);
    if (!n) continue;
    if (n.external) v.push({ specifier: spec, kind: 'raw' });
    else if (RAW_WRITE_MODULES.has(n.module!)) v.push({ specifier: spec, kind: 'raw' });
    else if (DEEP_SERVICE.has(n.module!)) v.push({ specifier: spec, kind: 'deep' });
  }
  return v;
}

const isTestOrFixture = (rel: string): boolean =>
  /\.test\.tsx?$/.test(rel) || rel.includes('__fixtures__') || rel.includes('__probe__');
// The ONLY files allowed to hold raw capability: the internal layers + the one sanctioned impl.
const exemptFromRaw = (rel: string): boolean =>
  rel.startsWith('db/') ||
  rel.startsWith('persistence/') ||
  rel === 'services/decide-and-persist.ts' ||
  isTestOrFixture(rel);
// The deep DI module may be imported only by the barrel and the module itself.
const exemptFromDeep = (rel: string): boolean =>
  rel === 'services/index.ts' || rel === 'services/decide-and-persist.ts' || isTestOrFixture(rel);

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) files.push(...walk(full));
    else if (/\.tsx?$/.test(name)) files.push(full);
  }
  return files;
}

describe('module-capability boundary — real source tree', () => {
  it('no production file outside the sanctioned impl obtains raw persistence / deep-DI capability', () => {
    const offenders: string[] = [];
    for (const abs of walk(SRC)) {
      const rel = path.relative(SRC, abs).replace(/\\/g, '/');
      const code = readFileSync(abs, 'utf8');
      for (const v of forbiddenCapabilities(code, rel)) {
        const exempt = v.kind === 'raw' ? exemptFromRaw(rel) : exemptFromDeep(rel);
        if (!exempt) offenders.push(`${rel} → ${v.kind}:${v.specifier}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

// Every equivalent spelling an arbitrary service could try to reach a raw writer/reader.
const RAW_ATTACKS = [
  "import x from '@/db/decision-snapshot-repository';",
  "import x from '@/db/decision-snapshot-repository.js';",
  "import x from '../db/decision-snapshot-repository';",
  "import x from '../db/decision-snapshot-repository.js';",
  "const x = await import('@/db/decision-snapshot-repository');",
  "const x = await import('@/db/decision-snapshot-repository.js');",
  "const x = await import('../db/decision-snapshot-repository');",
  "const x = await import('../db/decision-snapshot-repository.js');",
  "import x from '@/persistence/snapshot';",
  "const x = await import('@/persistence/snapshot.js');",
  "const x = await import('../persistence/snapshot');",
  "import x from '@/persistence/provenance';",
  "import x from '@/persistence/build-meta';",
  "import { PrismaClient } from '@prisma/client';",
  "const x = await import('@prisma/client');",
];
const DEEP_ATTACKS = [
  "import { decideAndPersistWithDeps } from '@/services/decide-and-persist';",
  "const m = await import('@/services/decide-and-persist');",
  "const m = await import('@/services/decide-and-persist.js');",
  "const m = await import('../services/decide-and-persist');",
];

describe('module-capability boundary — arbitrary service probes (§14/§29)', () => {
  it('rejects every raw-capability spelling from an arbitrary service', () => {
    for (const code of RAW_ATTACKS) {
      expect(forbiddenCapabilities(code, 'services/evil-service.ts')).not.toEqual([]);
    }
  });

  it('rejects every deep-DI-module spelling from an arbitrary service', () => {
    for (const code of DEEP_ATTACKS) {
      const hits = forbiddenCapabilities(code, 'services/evil-service.ts');
      expect(hits.some((h) => h.kind === 'deep')).toBe(true);
    }
  });

  it('ALLOWS the public @/services barrel from ordinary code (no capability)', () => {
    const code =
      "import { decideAndPersist, loadDecisionSnapshot } from '@/services';\nexport { decideAndPersist, loadDecisionSnapshot };";
    expect(forbiddenCapabilities(code, 'app/route.ts')).toEqual([]);
  });

  it('the scanner DOES detect raw capability (proving the sanctioned-file exemption is what allows it)', () => {
    const code = "import { decisionSnapshotRepository } from '@/db/decision-snapshot-repository';";
    // Detected as raw for a non-exempt path…
    expect(forbiddenCapabilities(code, 'services/evil-service.ts')).not.toEqual([]);
    // …but the sanctioned file is exempt.
    expect(exemptFromRaw('services/decide-and-persist.ts')).toBe(true);
    expect(exemptFromRaw('services/evil-service.ts')).toBe(false);
  });
});

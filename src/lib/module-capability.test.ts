// PagaMenos · module-capability boundary (P35A-02 §10–§16/§29 + ABSOLUTE FINAL boundary closure).
//
// `no-restricted-imports` only sees STATIC import specifiers and is fooled by dynamic `import()`,
// `.js`/`.ts` suffixes and relative traversal. This test enforces the CAPABILITY: ordinary production
// code outside the exact sanctioned implementation must not obtain the raw decision-persistence
// internals (repository, draft constructor, providers, raw Prisma client) NOR the deep DI module,
// through ANY module syntax. Specifiers are extracted with the TypeScript parser (static import/export
// AND dynamic import()), then normalized (strip extension, resolve relative, drop the `@/` alias) so
// every equivalent spelling maps to the same prohibited capability.
//
// FAIL-CLOSED DYNAMIC-IMPORT RULE (P35A-02 root closure): the previous scanner extracted a dynamic
// `import()` module id ONLY when the argument was a StringLiteral, and SILENTLY IGNORED every other
// argument shape. That let an arbitrary production service smuggle a raw capability through a computed
// specifier — `const m = '@/db/decision-snapshot-repository'; await import(m);` — which resolves at
// runtime yet passed every boundary gate. The policy is now intentionally simple and does NOT attempt
// constant folding, data-flow, or "prove it's really a literal": a dynamic import()'s module id must be
// STATICALLY INSPECTABLE — a StringLiteral or a NoSubstitutionTemplateLiteral. Those two shapes are
// extracted, normalized, and run through the same prohibited-capability check. Any OTHER argument
// (Identifier, TemplateExpression with substitutions, BinaryExpression concatenation, CallExpression,
// ConditionalExpression, ElementAccess/PropertyAccess, …) is rejected outright in protected production
// source with the diagnostic `NON_LITERAL_DYNAMIC_IMPORT_FORBIDDEN`. Only tests/fixtures/probes are
// exempt from the non-literal rule; NO capability-based directory (db/, persistence/) and NOT even the
// sanctioned impl earns a computed-import exemption.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const SRC = path.resolve(process.cwd(), 'src');

/** Diagnostic for a dynamic import() whose module specifier is not statically inspectable. */
export const NON_LITERAL_DYNAMIC_IMPORT_FORBIDDEN = 'NON_LITERAL_DYNAMIC_IMPORT_FORBIDDEN';

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

type Kind = 'raw' | 'deep' | 'nonliteral';
interface Violation {
  specifier: string;
  kind: Kind;
}

/**
 * One import site. Either a statically resolvable module specifier — a static import/export, or a
 * dynamic import() whose argument is a StringLiteral or NoSubstitutionTemplateLiteral — or a dynamic
 * import() with a NON-statically-inspectable argument, which is a boundary violation on its own.
 */
type ImportSite = { type: 'literal'; specifier: string } | { type: 'nonliteral'; text: string };

/**
 * The ONLY dynamic-import argument shapes whose module id is statically inspectable:
 *   import('@/foo/bar')  → StringLiteral
 *   import(`@/foo/bar`)  → NoSubstitutionTemplateLiteral (no `${}` substitutions)
 * Everything else (Identifier, TemplateExpression, BinaryExpression, CallExpression,
 * ConditionalExpression, ElementAccess/PropertyAccess, …) returns null → fail-closed.
 */
function staticImportText(arg: ts.Expression): string | null {
  if (ts.isStringLiteral(arg)) return arg.text;
  if (ts.isNoSubstitutionTemplateLiteral(arg)) return arg.text;
  return null;
}

/** Extract every import site: static import/export + dynamic import(), via the TS AST (not regex). */
function importSites(code: string): ImportSite[] {
  const sf = ts.createSourceFile(
    'probe.tsx',
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const out: ImportSite[] = [];
  const visit = (n: ts.Node): void => {
    if (
      (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) &&
      n.moduleSpecifier &&
      ts.isStringLiteral(n.moduleSpecifier)
    ) {
      out.push({ type: 'literal', specifier: n.moduleSpecifier.text });
    } else if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword) {
      // A real dynamic import() CALL. (`import('@/x').Foo` type positions are ImportTypeNode, not
      // CallExpression, so they never reach here.)
      const arg = n.arguments[0];
      const text = arg ? staticImportText(arg) : null;
      if (text !== null) out.push({ type: 'literal', specifier: text });
      else out.push({ type: 'nonliteral', text: arg ? arg.getText(sf) : '' });
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
  for (const site of importSites(code)) {
    if (site.type === 'nonliteral') {
      // Cannot statically identify the dynamic module → forbidden fail-closed.
      v.push({ specifier: site.text, kind: 'nonliteral' });
      continue;
    }
    const n = normalize(site.specifier, fromSrcRel);
    if (!n) continue;
    if (n.external) v.push({ specifier: site.specifier, kind: 'raw' });
    else if (RAW_WRITE_MODULES.has(n.module!)) v.push({ specifier: site.specifier, kind: 'raw' });
    else if (DEEP_SERVICE.has(n.module!)) v.push({ specifier: site.specifier, kind: 'deep' });
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
// The non-literal dynamic-import rule is fail-closed for ALL protected production source: NO
// capability directory (db/, persistence/) and NOT even the sanctioned impl earns a computed-import
// exemption. Only tests/fixtures/probes may retain their existing exemption.
const exemptFromNonLiteral = (rel: string): boolean => isTestOrFixture(rel);

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
        const exempt =
          v.kind === 'raw'
            ? exemptFromRaw(rel)
            : v.kind === 'deep'
              ? exemptFromDeep(rel)
              : exemptFromNonLiteral(rel);
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
  // NoSubstitutionTemplateLiteral (STATIC template §10) — inspectable, must resolve to raw.
  'const x = await import(`@/db/decision-snapshot-repository`);',
  'const x = await import(`../db/decision-snapshot-repository`);',
];
const DEEP_ATTACKS = [
  "import { decideAndPersistWithDeps } from '@/services/decide-and-persist';",
  "const m = await import('@/services/decide-and-persist');",
  "const m = await import('@/services/decide-and-persist.js');",
  "const m = await import('../services/decide-and-persist');",
  // NoSubstitutionTemplateLiteral (STATIC template §10) — inspectable, must resolve to deep.
  'const m = await import(`@/services/decide-and-persist`);',
];

// COMPUTED / non-literal dynamic imports (P35A-02 root closure §9/§12). Each MUST be rejected as
// `nonliteral` — WITHOUT any attempt to prove the expression evaluates to a safe/known module.
const COMPUTED_ATTACKS = [
  // identifier (alias)
  "const p = '@/db/decision-snapshot-repository';\nawait import(p);",
  // identifier (relative)
  "const p = '../db/decision-snapshot-repository';\nawait import(p);",
  // template WITH substitution
  "const name = 'decision-snapshot-repository';\nawait import(`@/db/${name}`);",
  // string concatenation
  "await import('@/db/' + 'decision-snapshot-repository');",
  // function-call result
  'await import(getPersistenceModule());',
  // conditional expression
  "await import(flag ? '@/safe' : '@/db/client');",
  // element access
  "await import(moduleMap['db']);",
  // deep DI via identifier
  "const p = '@/services/decide-and-persist';\nawait import(p);",
  // deep DI via template WITH substitution
  "const name = 'decide-and-persist';\nawait import(`@/services/${name}`);",
  // deep DI via concatenation
  "await import('@/services/' + 'decide-and-persist');",
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

describe('non-literal dynamic-import closure (P35A-02 root defect §9/§10/§12)', () => {
  it('rejects EVERY computed / non-literal dynamic import() as `nonliteral`', () => {
    for (const code of COMPUTED_ATTACKS) {
      const hits = forbiddenCapabilities(code, 'services/evil-service.ts');
      expect(
        hits.some((h) => h.kind === 'nonliteral'),
        `expected NON_LITERAL_DYNAMIC_IMPORT_FORBIDDEN for: ${code}`,
      ).toBe(true);
    }
  });

  it('a STATIC template literal is inspected (NOT rejected as non-literal) then classified by capability §10', () => {
    // NoSubstitutionTemplateLiteral of a raw module → detected as `raw`, never `nonliteral`.
    const rawTpl = forbiddenCapabilities(
      'const x = await import(`@/db/decision-snapshot-repository`);',
      'services/evil-service.ts',
    );
    expect(rawTpl.some((h) => h.kind === 'raw')).toBe(true);
    expect(rawTpl.some((h) => h.kind === 'nonliteral')).toBe(false);

    // NoSubstitutionTemplateLiteral of the deep DI module → detected as `deep`, never `nonliteral`.
    const deepTpl = forbiddenCapabilities(
      'const m = await import(`@/services/decide-and-persist`);',
      'services/evil-service.ts',
    );
    expect(deepTpl.some((h) => h.kind === 'deep')).toBe(true);
    expect(deepTpl.some((h) => h.kind === 'nonliteral')).toBe(false);

    // TemplateExpression (has `${}`) → NOT statically inspectable → `nonliteral`.
    const dynTpl = forbiddenCapabilities(
      "const n = 'decision-snapshot-repository';\nawait import(`@/db/${n}`);",
      'services/evil-service.ts',
    );
    expect(dynTpl.some((h) => h.kind === 'nonliteral')).toBe(true);
  });

  it('does NOT globally ban import(): a statically-resolvable SAFE dynamic import is allowed §11', () => {
    // StringLiteral of a non-prohibited public module.
    expect(forbiddenCapabilities("await import('@/services');", 'app/route.ts')).toEqual([]);
    // NoSubstitutionTemplateLiteral of a non-prohibited public module.
    expect(forbiddenCapabilities('await import(`@/engine`);', 'app/route.ts')).toEqual([]);
  });

  it('the non-literal rule is fail-closed for capability directories AND the sanctioned impl §5', () => {
    // Only tests/fixtures/probes are exempt from the non-literal rule.
    expect(exemptFromNonLiteral('services/decide-and-persist.ts')).toBe(false);
    expect(exemptFromNonLiteral('db/client.ts')).toBe(false);
    expect(exemptFromNonLiteral('persistence/snapshot.ts')).toBe(false);
    expect(exemptFromNonLiteral('services/evil-service.ts')).toBe(false);
    expect(exemptFromNonLiteral('lib/module-capability.test.ts')).toBe(true);
    expect(exemptFromNonLiteral('services/__fixtures__/probe.ts')).toBe(true);
  });

  it('exposes the NON_LITERAL_DYNAMIC_IMPORT_FORBIDDEN diagnostic constant', () => {
    expect(NON_LITERAL_DYNAMIC_IMPORT_FORBIDDEN).toBe('NON_LITERAL_DYNAMIC_IMPORT_FORBIDDEN');
  });
});

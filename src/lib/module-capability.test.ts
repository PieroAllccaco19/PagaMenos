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
/** Deep DI modules (importing one exposes an injectable *WithDeps surface). */
const DEEP_SERVICE = new Set([
  'services/decide-and-persist',
  // A2-CODE (Sol Finding 1): the A2 lifecycle + saga modules expose *WithDeps (repo, clock, decision fn).
  'services/study-purchase-intent',
  'services/study-intent-decision',
]);

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
// The deep DI module may be imported only by the barrel, the module itself, and — for the INTERNAL
// §18 finder capability (Sol Closure 3) — the sanctioned A2 decision/repair saga, which is the sole
// owner of `findExactHistoricalDecision` now that it is off the public barrel.
const exemptFromDeep = (rel: string): boolean =>
  rel === 'services/index.ts' ||
  rel === 'services/decide-and-persist.ts' ||
  rel === 'services/study-intent-decision.ts' ||
  isTestOrFixture(rel);
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
  // Sol Closure 3: the INTERNAL §18 finder lives in the deep module; an unauthorized deep import of it
  // is a `deep` violation from ordinary code.
  "import { findExactHistoricalDecision } from '@/services/decide-and-persist';",
  // A2-CODE (Sol Finding 1): the A2 deep modules exposing *WithDeps must be equally unreachable.
  "import { createPurchaseIntentWithDeps } from '@/services/study-purchase-intent';",
  "import { requestPurchaseIntentDecisionWithDeps } from '@/services/study-intent-decision';",
  "const m = await import('@/services/study-purchase-intent.js');",
  "const m = await import('../services/study-intent-decision');",
  'const m = await import(`@/services/study-purchase-intent`);',
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

// ===================================================================================================
// Sol Closure 3 — findExactHistoricalDecision is an INTERNAL A2 decision/repair capability.
// ===================================================================================================
describe('§18 finder capability (Sol Closure 3)', () => {
  it('is ABSENT from the public @/services barrel at runtime', async () => {
    const svc = (await import('@/services')) as Record<string, unknown>;
    expect(svc.findExactHistoricalDecision).toBeUndefined();
    // The public decision surface remains available.
    expect(typeof svc.decideAndPersist).toBe('function');
    expect(typeof svc.loadDecisionSnapshot).toBe('function');
  });

  it('the public barrel SOURCE no longer re-exports the finder (unauthorized deep import required)', () => {
    const src = readFileSync(path.join(SRC, 'services/index.ts'), 'utf8');
    expect(src).not.toMatch(/export\s*\{[^}]*findExactHistoricalDecision/s);
  });

  it('an ordinary service importing the finder from the deep module is a `deep` violation', () => {
    const hits = forbiddenCapabilities(
      "import { findExactHistoricalDecision } from '@/services/decide-and-persist';",
      'services/evil-service.ts',
    );
    expect(hits.some((h) => h.kind === 'deep')).toBe(true);
  });

  it('the sanctioned saga MAY reach the deep module (sole finder owner)', () => {
    expect(exemptFromDeep('services/study-intent-decision.ts')).toBe(true);
    expect(exemptFromDeep('services/evil-service.ts')).toBe(false);
  });
});

// ===================================================================================================
// M3.5B-A1 — operation-specific study capability ownership (spec §11/§27).
//
// Extends the accepted AST boundary with OPERATION-SPECIFIC allowlists: each raw study repository is
// reachable only from its OWNING sanctioned service(s); each trusted admin service module is reachable
// only from the study-admin barrel (and, for the read-only analysis load, the public @/services
// barrel). Enforcement is syntax-proof (static/dynamic import, relative paths, `.js`/`.ts` suffixes,
// static template literals) via the same TS-AST extractor. Non-literal dynamic imports remain covered
// by the fail-closed rule above for every protected file, study modules included.
// ===================================================================================================

/** Raw study repository (src-relative, no ext) → the ONLY sanctioned service files that may import it. */
const STUDY_RAW_OWNERS: Record<string, string[]> = {
  'db/study-protocol-repository': [
    'services/study-protocol-admin.ts',
    'services/study-analysis.ts',
  ],
  'db/study-experiment-repository': ['services/study-experiment-admin.ts'],
  'db/study-participant-repository': ['services/study-recruitment.ts'],
  'db/study-recruitment-repository': ['services/study-recruitment.ts'],
  'db/study-assignment-repository': ['services/study-assignment-admin.ts'],
  'db/study-consent-repository': ['services/study-consent.ts'],
};

/** M3.5B-A2 raw repository (src-relative, no ext) → the ONLY sanctioned service files that may import
 * it. The decision-request/binding writer is owned solely by the decision saga; the intent lifecycle
 * writer is owned by the intent service AND read-only by the decision saga (which loads the finalized
 * authorities to freeze a request) — mirroring the two-owner study-protocol-repository pattern. */
const PI_RAW_OWNERS: Record<string, string[]> = {
  'db/purchase-intent-repository': [
    'services/study-purchase-intent.ts',
    'services/study-intent-decision.ts',
  ],
  'db/purchase-intent-decision-repository': ['services/study-intent-decision.ts'],
};

/** Trusted admin service module → the ONLY files that may import it (study-admin barrel; read-only
 * analysis load additionally reachable from the public @/services barrel). Empty ⇒ tests only. */
const STUDY_ADMIN_OWNERS: Record<string, string[]> = {
  'services/study-protocol-admin': ['services/study-admin.ts'],
  'services/study-experiment-admin': ['services/study-admin.ts'],
  'services/study-recruitment': ['services/study-admin.ts'],
  'services/study-assignment-admin': ['services/study-admin.ts'],
  'services/study-participant-session': ['services/study-admin.ts'],
  'services/study-analysis': ['services/study-admin.ts', 'services/index.ts'],
  'services/study-admin': [],
};

/** A1-CODE-01: the participant-context CREATION submodule. Only the pure barrel (which re-exports the
 * checker/type, never the primitive) and the trusted session adapter may import it. */
const STUDY_RESTRICTED_MODULES: Record<string, string[]> = {
  'study/participant-context': ['study/index.ts', 'services/study-participant-session.ts'],
  // A2-CODE: the trusted entry-source creation primitive — only the pure barrel (which re-exports the
  // validator/type, never the primitive) and the trusted session adapter may import it.
  'study/entry-source-context': ['study/index.ts', 'services/study-participant-session.ts'],
};

/** Study boundary violations for one file's source (literal specifiers only; non-literal handled by
 * the fail-closed rule above). Returns human-readable offense strings, or [] if clean. */
function studyBoundaryViolations(code: string, fromSrcRel: string): string[] {
  const out: string[] = [];
  const isTest = isTestOrFixture(fromSrcRel);
  const isDbFile = fromSrcRel.startsWith('db/');
  for (const site of importSites(code)) {
    if (site.type !== 'literal') continue;
    const n = normalize(site.specifier, fromSrcRel);
    if (!n || !n.module) continue;
    const mod = n.module;
    if (/^db\/study-/.test(mod)) {
      // Raw study internals: only db/ files, the mapped owners, and tests may import them.
      if (isTest || isDbFile) continue;
      const owners = STUDY_RAW_OWNERS[mod] ?? [];
      if (owners.includes(fromSrcRel)) continue;
      out.push(`raw-study:${mod}`);
      continue;
    }
    if (/^db\/purchase-intent-/.test(mod)) {
      // Raw A2 internals: only db/ files, the mapped owners, and tests may import them.
      if (isTest || isDbFile) continue;
      const owners = PI_RAW_OWNERS[mod] ?? [];
      if (owners.includes(fromSrcRel)) continue;
      out.push(`raw-pi:${mod}`);
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(STUDY_ADMIN_OWNERS, mod)) {
      if (isTest) continue;
      if (STUDY_ADMIN_OWNERS[mod]!.includes(fromSrcRel)) continue;
      out.push(`study-admin:${mod}`);
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(STUDY_RESTRICTED_MODULES, mod)) {
      if (isTest) continue;
      if (STUDY_RESTRICTED_MODULES[mod]!.includes(fromSrcRel)) continue;
      out.push(`restricted:${mod}`);
    }
  }
  return out;
}

describe('M3.5B-A1 study capability ownership — real source tree (§11/§27)', () => {
  it('no file outside the sanctioned owner imports a raw study repository or trusted admin service', () => {
    const offenders: string[] = [];
    for (const abs of walk(SRC)) {
      const rel = path.relative(SRC, abs).replace(/\\/g, '/');
      const code = readFileSync(abs, 'utf8');
      for (const v of studyBoundaryViolations(code, rel)) offenders.push(`${rel} → ${v}`);
    }
    expect(offenders).toEqual([]);
  });
});

describe('M3.5B-A1 study capability ownership — arbitrary-module probes (§11/§27)', () => {
  it('participant-facing/app code cannot import a raw study repository (any spelling)', () => {
    const attacks = [
      "import { studyConsentRepository } from '@/db/study-consent-repository';",
      "import x from '@/db/study-protocol-repository.js';",
      "const x = await import('../db/study-participant-repository');",
      'const x = await import(`@/db/study-assignment-repository`);',
    ];
    for (const code of attacks) {
      expect(studyBoundaryViolations(code, 'app/consent-page.ts'), code).not.toEqual([]);
    }
  });

  it('an arbitrary service cannot import a raw study repository it does not own', () => {
    expect(
      studyBoundaryViolations(
        "import { studyConsentRepository } from '@/db/study-consent-repository';",
        'services/evil-service.ts',
      ),
    ).not.toEqual([]);
  });

  it('one study service cannot reach ANOTHER capability raw repository (operation-specific)', () => {
    // The consent service owns only the consent repo; reaching the protocol repo is a violation.
    expect(
      studyBoundaryViolations(
        "import { analysisProtocolRepository } from '@/db/study-protocol-repository';",
        'services/study-consent.ts',
      ),
    ).not.toEqual([]);
    // …but its OWN repo is allowed.
    expect(
      studyBoundaryViolations(
        "import { studyConsentRepository } from '@/db/study-consent-repository';",
        'services/study-consent.ts',
      ),
    ).toEqual([]);
  });

  it('participant-facing/app code cannot import a trusted admin service or the admin barrel', () => {
    const attacks = [
      "import { createExperiment } from '@/services/study-experiment-admin';",
      "import { registerStudyParticipant } from '@/services/study-recruitment';",
      "import { freezeAnalysisProtocol } from '@/services/study-admin';",
      "const x = await import('../services/study-assignment-admin');",
    ];
    for (const code of attacks) {
      expect(studyBoundaryViolations(code, 'app/admin-page.ts'), code).not.toEqual([]);
    }
  });

  it('participant-facing/app code cannot import the participant-context creation primitive or the session adapter (A1-CODE-01)', () => {
    const attacks = [
      "import { createTrustedParticipantContext } from '@/study/participant-context';",
      "import x from '@/study/participant-context.js';",
      "const x = await import('../study/participant-context');",
      "import { resolveTrustedParticipantContext } from '@/services/study-participant-session';",
      "const x = await import('../services/study-participant-session');",
    ];
    for (const code of attacks) {
      expect(studyBoundaryViolations(code, 'app/consent-page.ts'), code).not.toEqual([]);
    }
    // …but the trusted session adapter MAY import the creation primitive, and the admin barrel MAY
    // aggregate the session adapter.
    expect(
      studyBoundaryViolations(
        "import { createTrustedParticipantContext } from '@/study/participant-context';",
        'services/study-participant-session.ts',
      ),
    ).toEqual([]);
    expect(
      studyBoundaryViolations(
        "export { resolveTrustedParticipantContext } from './study-participant-session';",
        'services/study-admin.ts',
      ),
    ).toEqual([]);
  });

  it('the study-admin barrel MAY aggregate the admin services (owner-allowed)', () => {
    expect(
      studyBoundaryViolations(
        "export { createExperiment } from './study-experiment-admin';\nexport { assignParticipant } from './study-assignment-admin';",
        'services/study-admin.ts',
      ),
    ).toEqual([]);
  });

  it('the public @/services barrel MAY re-export the read-only analysis load but NOT admin writes', () => {
    expect(
      studyBoundaryViolations(
        "export { loadFrozenProtocolForAnalysis } from './study-analysis';",
        'services/index.ts',
      ),
    ).toEqual([]);
    expect(
      studyBoundaryViolations(
        "export { createExperiment } from './study-experiment-admin';",
        'services/index.ts',
      ),
    ).not.toEqual([]);
  });
});

// PagaMenos · src/cca — static CCA capability / dependency-closure analysis (Amendment 01 §15–§20, §42–§45).
//
// CI TOOLING (consumed by src/cca/capability.test.ts). Not imported by application code.
//
// File roles are fixed by path suffix, so the topology is decidable from source alone:
//   *.cca-leaf.ts               sealed operation leaf (§10)
//   *.cca-executor.ts           fixed trusted executor (§14–§20)
//   *.cca-adapter.ts            private tracked-adapter implementation (§17, §21, §26)
//   *.cca-adapter-interface.ts  the ONE operation-specific adapter interface (§15 item 3) — types only
//   db/cca-engine.ts            private CCA engine (§33 class B)
//
// Executor dependency closure (§43): every module reachable from an executor through ANY edge —
// static import, `import type`, namespace import, re-export, literal dynamic import(), require — is
// classified PURE | APPROVED_TRACKED_ADAPTER_INTERFACE | FORBIDDEN_DB_CAPABLE | UNCLASSIFIED.
// FORBIDDEN or UNCLASSIFIED anywhere ⇒ FAIL CLOSED. A non-literal dynamic import is itself a
// violation. Ambient service-locator routes (globalThis, Symbol.for, require, eval, Function, process,
// import.meta, `$`-prefixed client members) are violations anywhere in the closure. Type-only edges
// are classified exactly like value edges (§44: no PrismaClient/TransactionClient-typed value may
// reach an executor).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

// ---------------------------------------------------------------------------------------------------
// Source access
// ---------------------------------------------------------------------------------------------------

/** src-relative, forward-slash paths (e.g. `cca/lock-order.ts`). */
export interface SourceProvider {
  list(): readonly string[];
  read(rel: string): string | null;
}

export function fsSourceProvider(srcRoot: string): SourceProvider {
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.tsx?$/.test(name)) files.push(path.relative(srcRoot, full).replace(/\\/g, '/'));
    }
  };
  walk(srcRoot);
  const set = new Set(files);
  return {
    list: () => files,
    read: (rel) => (set.has(rel) ? readFileSync(path.join(srcRoot, rel), 'utf8') : null),
  };
}

/** Overlay virtual files (probes / mutations) on a base provider. */
export function overlayProvider(
  base: SourceProvider,
  overlay: Readonly<Record<string, string | null>>,
): SourceProvider {
  const names = new Set([...base.list(), ...Object.keys(overlay)]);
  for (const [k, v] of Object.entries(overlay)) if (v === null) names.delete(k);
  return {
    list: () => [...names],
    read: (rel) =>
      Object.prototype.hasOwnProperty.call(overlay, rel) ? overlay[rel]! : base.read(rel),
  };
}

export const isTestOrFixture = (rel: string): boolean =>
  /\.test\.tsx?$/.test(rel) || rel.includes('__fixtures__') || rel.includes('__probe__');

// ---------------------------------------------------------------------------------------------------
// Import-edge extraction (TypeScript AST, not regex)
// ---------------------------------------------------------------------------------------------------

export type EdgeKind = 'import' | 'reexport' | 'dynamic' | 'require' | 'nonliteral';

export interface ImportEdge {
  readonly specifier: string;
  readonly kind: EdgeKind;
  readonly typeOnly: boolean;
  readonly namespace: boolean;
  readonly exportStar: boolean;
}

function parse(code: string): ts.SourceFile {
  return ts.createSourceFile('m.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function literalText(arg: ts.Expression | undefined): string | null {
  if (arg && (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg))) return arg.text;
  return null;
}

export function extractImportEdges(code: string): ImportEdge[] {
  const sf = parse(code);
  const out: ImportEdge[] = [];
  const visit = (n: ts.Node): void => {
    if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier)) {
      const clause = n.importClause;
      const allSpecifiersTypeOnly =
        clause !== undefined &&
        clause.name === undefined &&
        clause.namedBindings !== undefined &&
        ts.isNamedImports(clause.namedBindings) &&
        clause.namedBindings.elements.length > 0 &&
        clause.namedBindings.elements.every((e) => e.isTypeOnly);
      out.push({
        specifier: n.moduleSpecifier.text,
        kind: 'import',
        typeOnly: clause?.isTypeOnly === true || allSpecifiersTypeOnly,
        namespace:
          clause?.namedBindings !== undefined && ts.isNamespaceImport(clause.namedBindings),
        exportStar: false,
      });
    } else if (
      ts.isExportDeclaration(n) &&
      n.moduleSpecifier &&
      ts.isStringLiteral(n.moduleSpecifier)
    ) {
      out.push({
        specifier: n.moduleSpecifier.text,
        kind: 'reexport',
        typeOnly: n.isTypeOnly,
        namespace: n.exportClause !== undefined && ts.isNamespaceExport(n.exportClause),
        exportStar: n.exportClause === undefined,
      });
    } else if (ts.isImportEqualsDeclaration(n) && ts.isExternalModuleReference(n.moduleReference)) {
      const text = literalText(n.moduleReference.expression);
      out.push({
        specifier: text ?? n.moduleReference.expression.getText(sf),
        kind: text === null ? 'nonliteral' : 'require',
        typeOnly: n.isTypeOnly,
        namespace: true,
        exportStar: false,
      });
    } else if (ts.isCallExpression(n)) {
      const isDynamicImport = n.expression.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire = ts.isIdentifier(n.expression) && n.expression.text === 'require';
      if (isDynamicImport || isRequire) {
        const text = literalText(n.arguments[0]);
        out.push({
          specifier: text ?? (n.arguments[0] ? n.arguments[0].getText(sf) : ''),
          kind: text === null ? 'nonliteral' : isDynamicImport ? 'dynamic' : 'require',
          typeOnly: false,
          namespace: true,
          exportStar: false,
        });
      }
    } else if (ts.isImportTypeNode(n) && ts.isLiteralTypeNode(n.argument)) {
      const lit = n.argument.literal;
      if (ts.isStringLiteral(lit)) {
        out.push({
          specifier: lit.text,
          kind: 'import',
          typeOnly: true,
          namespace: true,
          exportStar: false,
        });
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

// ---------------------------------------------------------------------------------------------------
// Resolution + roles
// ---------------------------------------------------------------------------------------------------

export type Resolved =
  | { readonly type: 'local'; readonly rel: string }
  | { readonly type: 'external'; readonly name: string }
  | { readonly type: 'unresolved'; readonly specifier: string };

export function resolveSpecifier(
  specifier: string,
  fromRel: string,
  provider: SourceProvider,
): Resolved {
  let base: string | null = null;
  const noExt = specifier.replace(/\.(js|jsx|ts|tsx|mjs|cjs)$/, '');
  if (noExt === '@' || noExt.startsWith('@/')) base = noExt === '@' ? '' : noExt.slice(2);
  else if (noExt.startsWith('.')) {
    base = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), noExt));
  }
  if (base === null) return { type: 'external', name: specifier };
  const known = new Set(provider.list());
  for (const candidate of [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
    const c = candidate.replace(/^\//, '');
    if (known.has(c)) return { type: 'local', rel: c };
  }
  return { type: 'unresolved', specifier };
}

export type ModuleRole =
  'LEAF' | 'EXECUTOR' | 'ADAPTER_IMPL' | 'ADAPTER_INTERFACE' | 'ENGINE' | 'OTHER';

/** The accepted CCA foundation engine (Amendment 01 §33 class B). */
export const CCA_ENGINE_MODULE = 'db/cca-engine.ts';

/** The productive M7 specialization of the private CCA engine (M7 V1.1 §9.4; M7 owner TO-1). */
export const M7_PARTICIPANT_CCA_ENGINE_MODULE = 'db/m7-participant-cca-engine.ts';

/**
 * The M7 capability signer: TO-8 DB foundation + PPC-1 physical provider capability (M7 V1.1
 * §11.7.3, §16.2.3, §18.3). NOT a CCA role module: it is a separate transaction owner with its own
 * credentials, its own owner kind and exactly one exported operation, and the ONE productive importer
 * of a provider-signing package. Rules X1–X19 (`analyzeM7CapabilitySignerTopology`,
 * `analyzeProviderSigningPackageManifest`) pin it.
 */
export const M7_CAPABILITY_SIGNER_MODULE = 'db/m7-capability-signer.ts';

/**
 * Every module carrying the ENGINE role. The accepted analyzer had exactly one; the productive M7
 * path adds its specialization. This is an EXTENSION, never a relaxation: an engine is still the
 * ONLY module a leaf may take a db/ or services/ edge to, still the only permitted importer of the
 * restricted CCA capability modules, and is still importable ONLY from a leaf.
 */
export const CCA_ENGINE_MODULES: ReadonlySet<string> = new Set([
  CCA_ENGINE_MODULE,
  M7_PARTICIPANT_CCA_ENGINE_MODULE,
]);

/** Composition-time definition entry points. A leaf calls exactly one of these, exactly once. */
export const SEALED_DEFINITION_FUNCTIONS: readonly string[] = [
  'defineSealedOperation',
  'defineSealedOutcomeAssertionOperation',
  // M7 SO-2 (V1.1 §9.2): the second, separately sealed M7 family. A DISTINCT entry point, never a
  // generic one — the leaf still calls exactly one definition function, exactly once.
  'defineSealedEvidenceUploadOperation',
];

export function roleOf(rel: string): ModuleRole {
  if (CCA_ENGINE_MODULES.has(rel)) return 'ENGINE';
  if (/\.cca-leaf\.tsx?$/.test(rel)) return 'LEAF';
  if (/\.cca-executor\.tsx?$/.test(rel)) return 'EXECUTOR';
  if (/\.cca-adapter-interface\.tsx?$/.test(rel)) return 'ADAPTER_INTERFACE';
  if (/\.cca-adapter\.tsx?$/.test(rel)) return 'ADAPTER_IMPL';
  return 'OTHER';
}

// ---------------------------------------------------------------------------------------------------
// Ambient service-locator / raw-capability scan
// ---------------------------------------------------------------------------------------------------

const AMBIENT_IDENTIFIERS = new Set([
  'globalThis',
  'global',
  'window',
  'self',
  'process',
  'require',
  'module',
  'eval',
  'Function',
  '__non_webpack_require__',
]);

/** Ambient capability routes inside one module. */
export function ambientViolations(code: string): string[] {
  const sf = parse(code);
  const out: string[] = [];
  const visit = (n: ts.Node): void => {
    if (ts.isIdentifier(n)) {
      const parent = n.parent;
      const isPropertyName =
        parent !== undefined &&
        ((ts.isPropertyAccessExpression(parent) && parent.name === n) ||
          (ts.isPropertyAssignment(parent) && parent.name === n) ||
          ts.isPropertySignature(parent) ||
          ts.isMethodSignature(parent) ||
          (ts.isMethodDeclaration(parent) && parent.name === n));
      if (AMBIENT_IDENTIFIERS.has(n.text) && !isPropertyName) out.push(`AMBIENT:${n.text}`);
      if (n.text.startsWith('$')) out.push(`RAW_CLIENT_MEMBER:${n.text}`);
    }
    if (ts.isPrivateIdentifier(n) && n.text.startsWith('#$'))
      out.push(`RAW_CLIENT_MEMBER:${n.text}`);
    if (ts.isElementAccessExpression(n)) {
      const key = literalText(n.argumentExpression);
      if (key !== null && key.startsWith('$')) out.push(`RAW_CLIENT_MEMBER:${key}`);
    }
    if (
      ts.isPropertyAccessExpression(n) &&
      ts.isIdentifier(n.expression) &&
      n.expression.text === 'Symbol' &&
      n.name.text === 'for'
    ) {
      out.push('AMBIENT:Symbol.for');
    }
    if (ts.isMetaProperty(n) && n.keywordToken === ts.SyntaxKind.ImportKeyword) {
      out.push('AMBIENT:import.meta');
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

// ---------------------------------------------------------------------------------------------------
// Executor dependency closure (§15, §16, §20, §43)
// ---------------------------------------------------------------------------------------------------

export type ClosureClass =
  'PURE' | 'APPROVED_TRACKED_ADAPTER_INTERFACE' | 'FORBIDDEN_DB_CAPABLE' | 'UNCLASSIFIED';

export interface ClosureEntry {
  readonly module: string;
  readonly via: string;
  readonly edge: EdgeKind;
  readonly typeOnly: boolean;
  readonly class: ClosureClass;
  readonly reason: string;
}

/** CCA foundation modules an executor may reference ONLY with `import type` (no runtime edge). */
export const EXECUTOR_TYPE_ONLY_MODULES: ReadonlySet<string> = new Set([
  'cca/locked-scope.ts',
  'cca/policy.ts',
  'cca/replay.ts',
  'cca/sealed-operation.ts',
  // M7 V1.1 §9.3: the pure SO-1 input/result contract. It holds no database capability — no client,
  // no repository, no query, no environment read and no clock — so a TYPE-ONLY edge to it carries
  // none either. A value edge is still rejected, exactly as for the CCA contracts above.
  'm7/so1/outcome-assertion-input.ts',
  // M7 V1.1 §9.3 SO-2: the pure SO-2 input/result contract. Same status as the SO-1 contract above:
  // no client, no repository, no query, no environment, no clock — a type-only edge carries nothing.
  'm7/so2/evidence-upload-input.ts',
]);

/** Explicitly allowlisted pure, DB-free utilities an executor may import by value (§15 item 4). */
export const EXECUTOR_PURE_MODULES: ReadonlySet<string> = new Set<string>([]);

/** External packages an executor may import (none: every package is unclassified by default). */
export const EXECUTOR_PURE_EXTERNALS: ReadonlySet<string> = new Set<string>([]);

/** Path classes that are DB-capable by construction of the accepted capability model. */
function isDbCapablePath(rel: string): boolean {
  return (
    rel.startsWith('db/') ||
    rel.startsWith('persistence/') ||
    rel.startsWith('services/') ||
    rel.startsWith('app/') ||
    rel.startsWith('m7/testkit/') ||
    rel.startsWith('m7/s03/')
  );
}

// ---------------------------------------------------------------------------------------------------
// Adapter-implementation capability closure (§16, §17, §21, §39 — AUD-CCA-FND-01)
//
// The private tracked-adapter implementation is the ONLY capability class allowed to hold a
// transaction client, and it may hold ONLY the hidden one the CCA engine passes it as a parameter.
// It must be structurally unable to obtain a SECOND database capability: its own PrismaClient, the
// shared raw client, a repository, a transaction or raw-SQL helper, a generic DB module, a service
// locator / DI binding, or a helper whose closure reaches any of those.
//
// The superseded candidate checked only DIRECT, LOCAL edges, so an EXTERNAL runtime import
// `import { PrismaClient } from '@prisma/client'` inside an adapter was never classified at all and
// `new PrismaClient()` was never detected. This closure fixes that with the same edge coverage as
// the executor closure (static, type-only, namespace, re-export, literal and computed dynamic
// import, require), transitively, fail closed, plus Prisma-specific runtime-capability rules:
// `@prisma/client` is permitted ONLY as `import type`, and any value reference to `PrismaClient`
// (construction, call, re-export) is a violation on its own.
// ---------------------------------------------------------------------------------------------------

/** DB-free CCA foundation modules an adapter implementation may import BY VALUE. */
export const ADAPTER_VALUE_MODULES: ReadonlySet<string> = new Set([
  'cca/errors.ts',
  'cca/lock-order.ts',
  'cca/locked-scope.ts',
  'cca/policy.ts',
  'cca/replay.ts',
  'cca/sealed-operation.ts',
  'cca/tracked-adapter.ts',
]);

/**
 * TYPES-ONLY M7 modules an adapter implementation may reference.
 *
 * V1.1 §9.4 requires the SO-1 adapter method itself to issue the one `$queryRaw` on the hidden
 * TransactionClient, passing the session secret — so the adapter must be able to NAME the shape of
 * the per-execution context the engine hands it. That declaration cannot live in the engine, because
 * an adapter -> ENGINE edge is FORBIDDEN_DB_CAPABLE even when type-only, and it must not live in a
 * module that carries any runtime value.
 *
 * Membership here therefore buys NOTHING but the ability to name a type: `analyzeM7So1Topology`
 * independently proves each of these files contains type declarations ONLY (no value export, no
 * runtime statement), so there is nothing in them to call, construct, re-export or reach through.
 */
export const ADAPTER_M7_TYPES_ONLY_MODULES: ReadonlySet<string> = new Set([
  'm7/so1/m7-participant-operation-context.ts',
  // The SO-2-LOCAL context declaration (SO-2 AUTH §23): SO-2 names its own shape rather than taking a
  // productive SO-2 -> SO-1 edge. Proved types-only by the same rule M7.
  'm7/so2/m7-evidence-upload-operation-context.ts',
]);

const PRISMA_PACKAGE = /^(@prisma\/|\.prisma|prisma$)/;

export interface AdapterClosureReport {
  readonly adapter: string;
  readonly entries: readonly ClosureEntry[];
  readonly violations: readonly string[];
}

/** Runtime Prisma-client capability INSIDE one module (value edges are caught by the edge rule). */
function prismaClientValueUses(code: string): string[] {
  const out: string[] = [];
  const visit = (n: ts.Node): void => {
    if (
      ts.isNewExpression(n) &&
      ts.isIdentifier(n.expression) &&
      n.expression.text === 'PrismaClient'
    ) {
      out.push('PRISMA_CLIENT_CONSTRUCTION');
    } else if (ts.isIdentifier(n) && n.text === 'PrismaClient') {
      const p = n.parent;
      const typePosition =
        p !== undefined &&
        (ts.isTypeReferenceNode(p) ||
          ts.isTypeQueryNode(p) ||
          ((ts.isImportSpecifier(p) || ts.isExportSpecifier(p)) &&
            (p.isTypeOnly ||
              (ts.isImportSpecifier(p) && p.parent.parent.isTypeOnly) ||
              (ts.isExportSpecifier(p) && p.parent.parent.isTypeOnly))));
      if (!typePosition) out.push('PRISMA_CLIENT_VALUE_REFERENCE');
    }
    ts.forEachChild(n, visit);
  };
  visit(parse(code));
  return out;
}

export function analyzeAdapterClosure(
  adapterRel: string,
  provider: SourceProvider,
): AdapterClosureReport {
  const entries: ClosureEntry[] = [];
  const violations: string[] = [];
  const visited = new Set<string>([adapterRel]);
  const queue: string[] = [adapterRel];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const code = provider.read(current);
    if (code === null) {
      violations.push(`${current}: UNREADABLE`);
      continue;
    }
    for (const a of ambientViolations(code)) {
      // $queryRaw/$executeRaw on the SUPPLIED hidden transaction client are the adapter's legitimate
      // surface; a second $transaction and ambient locators never are.
      if (a === 'RAW_CLIENT_MEMBER:$transaction') {
        violations.push(`${current}: ADAPTER_NEW_TRANSACTION`);
      } else if (a.startsWith('AMBIENT:')) {
        violations.push(`${current}: ADAPTER_AMBIENT_CAPABILITY (${a})`);
      }
    }
    for (const hit of prismaClientValueUses(code)) violations.push(`${current}: ADAPTER_${hit}`);

    for (const edge of extractImportEdges(code)) {
      const via = `${current} -[${edge.kind}${edge.typeOnly ? ':type' : ''}]-> ${edge.specifier}`;
      const record = (cls: ClosureClass, module: string, reason: string): void => {
        entries.push({ module, via, edge: edge.kind, typeOnly: edge.typeOnly, class: cls, reason });
        if (cls === 'FORBIDDEN_DB_CAPABLE' || cls === 'UNCLASSIFIED') {
          violations.push(`${via} => ${module}: ${cls} (${reason})`);
        }
      };
      if (edge.kind === 'nonliteral') {
        record('UNCLASSIFIED', edge.specifier, 'NON_LITERAL_DYNAMIC_IMPORT_FORBIDDEN');
        continue;
      }
      if (edge.kind === 'require') {
        record('FORBIDDEN_DB_CAPABLE', edge.specifier, 'require() is not a permitted adapter edge');
        continue;
      }
      const r = resolveSpecifier(edge.specifier, current, provider);
      if (r.type === 'unresolved') {
        record('UNCLASSIFIED', edge.specifier, 'unresolvable local module');
        continue;
      }
      if (r.type === 'external') {
        if (PRISMA_PACKAGE.test(r.name)) {
          if (edge.typeOnly && edge.kind === 'import') {
            record('PURE', r.name, 'type-only Prisma types (no runtime capability)');
          } else {
            record('FORBIDDEN_DB_CAPABLE', r.name, 'RUNTIME_PRISMA_CAPABILITY');
          }
        } else {
          record('UNCLASSIFIED', r.name, 'external package not allowlisted for adapters');
        }
        continue;
      }
      const target = r.rel;
      const role = roleOf(target);
      if (role === 'ADAPTER_INTERFACE') {
        record('APPROVED_TRACKED_ADAPTER_INTERFACE', target, 'own operation adapter interface');
        continue;
      }
      if (role === 'ADAPTER_IMPL' && target !== adapterRel) {
        record('FORBIDDEN_DB_CAPABLE', target, 'adapter → another adapter implementation');
        continue;
      }
      if (role === 'EXECUTOR' || role === 'LEAF' || role === 'ENGINE') {
        record('FORBIDDEN_DB_CAPABLE', target, `adapter → ${role.toLowerCase()}`);
        continue;
      }
      if (isDbCapablePath(target)) {
        record('FORBIDDEN_DB_CAPABLE', target, 'separate DB capability (client/repository/helper)');
        continue;
      }
      if (ADAPTER_VALUE_MODULES.has(target)) {
        record('PURE', target, 'DB-free CCA foundation module');
      } else if (ADAPTER_M7_TYPES_ONLY_MODULES.has(target)) {
        if (!edge.typeOnly) {
          record('FORBIDDEN_DB_CAPABLE', target, 'value import of a types-only M7 contract');
        } else {
          record('PURE', target, 'types-only M7 contract (no runtime capability)');
        }
      } else {
        // Fail closed, and still traverse so the evidence names every hop of
        // adapter → innocent-looking helper → PrismaClient / db client / repository.
        record('UNCLASSIFIED', target, 'module not classified for adapters (fail closed)');
      }
      if (!visited.has(target)) {
        visited.add(target);
        queue.push(target);
      }
    }
  }
  return { adapter: adapterRel, entries, violations };
}

export interface ExecutorClosureReport {
  readonly executor: string;
  readonly entries: readonly ClosureEntry[];
  readonly violations: readonly string[];
}

export function analyzeExecutorClosure(
  executorRel: string,
  provider: SourceProvider,
): ExecutorClosureReport {
  const entries: ClosureEntry[] = [];
  const violations: string[] = [];
  const interfaces = new Set<string>();
  const visited = new Set<string>([executorRel]);
  const queue: string[] = [executorRel];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const code = provider.read(current);
    if (code === null) {
      violations.push(`${current}: UNREADABLE`);
      continue;
    }
    for (const a of ambientViolations(code)) violations.push(`${current}: ${a}`);
    for (const edge of extractImportEdges(code)) {
      const via = `${current} -[${edge.kind}${edge.typeOnly ? ':type' : ''}]-> ${edge.specifier}`;
      const record = (cls: ClosureClass, module: string, reason: string): void => {
        entries.push({
          module,
          via,
          edge: edge.kind,
          typeOnly: edge.typeOnly,
          class: cls,
          reason,
        });
        if (cls === 'FORBIDDEN_DB_CAPABLE' || cls === 'UNCLASSIFIED') {
          // Name BOTH the edge as written and the module it resolves to, so an alias, a relative
          // spelling and a dynamic import produce the same, greppable diagnostic.
          violations.push(`${via} => ${module}: ${cls} (${reason})`);
        }
      };
      if (edge.kind === 'nonliteral') {
        record('UNCLASSIFIED', edge.specifier, 'NON_LITERAL_DYNAMIC_IMPORT_FORBIDDEN');
        continue;
      }
      if (current === executorRel && edge.exportStar) {
        violations.push(`${via}: EXECUTOR_REEXPORT_FORBIDDEN`);
      }
      const r = resolveSpecifier(edge.specifier, current, provider);
      if (r.type === 'unresolved') {
        record('UNCLASSIFIED', edge.specifier, 'unresolvable local module');
        continue;
      }
      if (r.type === 'external') {
        if (/^@prisma\/|^\.prisma|^prisma$/.test(r.name)) {
          record('FORBIDDEN_DB_CAPABLE', r.name, 'Prisma package');
        } else if (EXECUTOR_PURE_EXTERNALS.has(r.name)) {
          record('PURE', r.name, 'allowlisted pure external');
        } else {
          record('UNCLASSIFIED', r.name, 'external package not allowlisted for executors');
        }
        continue;
      }
      const target = r.rel;
      const role = roleOf(target);
      if (role === 'ADAPTER_INTERFACE') {
        interfaces.add(target);
        record('APPROVED_TRACKED_ADAPTER_INTERFACE', target, 'operation adapter interface');
        if (interfaces.size > 1) {
          violations.push(`${via}: ALTERNATE_TRACKED_ADAPTER (second adapter interface)`);
        }
      } else if (role === 'EXECUTOR') {
        record('FORBIDDEN_DB_CAPABLE', target, 'executor → another executor (§20)');
        continue;
      } else if (role === 'ADAPTER_IMPL') {
        record('FORBIDDEN_DB_CAPABLE', target, 'executor → adapter implementation (§17)');
        continue;
      } else if (role === 'LEAF' || role === 'ENGINE') {
        record('FORBIDDEN_DB_CAPABLE', target, `executor → ${role.toLowerCase()} (§16)`);
        continue;
      } else if (isDbCapablePath(target)) {
        record('FORBIDDEN_DB_CAPABLE', target, 'DB-capable layer');
        continue;
      } else if (EXECUTOR_TYPE_ONLY_MODULES.has(target)) {
        if (!edge.typeOnly) {
          record('FORBIDDEN_DB_CAPABLE', target, 'value import of a CCA capability module');
        } else {
          record('PURE', target, 'type-only CCA contract');
        }
        continue; // type-only: no runtime edge to follow
      } else if (EXECUTOR_PURE_MODULES.has(target)) {
        record('PURE', target, 'allowlisted pure utility');
      } else {
        // Fail closed — and still traverse, so the evidence names the whole transitive path
        // (executor → pure-looking helper → repository → Prisma).
        record('UNCLASSIFIED', target, 'module not classified for executors (fail closed)');
      }
      if (!visited.has(target)) {
        visited.add(target);
        queue.push(target);
      }
    }
  }
  if (interfaces.size === 0) violations.push(`${executorRel}: NO_ADAPTER_INTERFACE`);
  return { executor: executorRel, entries, violations };
}

// ---------------------------------------------------------------------------------------------------
// Whole-topology rules (§10, §14, §19, §20, §32, §42)
// ---------------------------------------------------------------------------------------------------

/** Capability primitives → the ONLY src-relative files that may reference them. */
export const CAPABILITY_PRIMITIVE_OWNERS: Readonly<Record<string, readonly string[]>> = {
  // The M7 engine governs its OWN hidden participant client at its single construction point, for
  // the same reason db/client.ts governs the shared one: `runCcaTransaction` requires a governed
  // client, and every non-CCA transaction on it must register with DatabaseExecutionContext.
  installTransactionGovernance: [
    'db/client.ts',
    'cca/execution-context.ts',
    M7_PARTICIPANT_CCA_ENGINE_MODULE,
  ],
  runCcaTransaction: [
    CCA_ENGINE_MODULE,
    M7_PARTICIPANT_CCA_ENGINE_MODULE,
    'cca/execution-context.ts',
  ],
  mintLockedCollectionScope: [
    CCA_ENGINE_MODULE,
    M7_PARTICIPANT_CCA_ENGINE_MODULE,
    'cca/locked-scope.ts',
  ],
  constructTrackedAdapter: [
    CCA_ENGINE_MODULE,
    M7_PARTICIPANT_CCA_ENGINE_MODULE,
    'cca/tracked-adapter.ts',
  ],
  executeUnderZeroInFlightGate: [
    CCA_ENGINE_MODULE,
    M7_PARTICIPANT_CCA_ENGINE_MODULE,
    'cca/tracked-adapter.ts',
  ],
  freezeAdapterSpec: [
    CCA_ENGINE_MODULE,
    M7_PARTICIPANT_CCA_ENGINE_MODULE,
    'cca/tracked-adapter.ts',
  ],
  createLockSequencer: [CCA_ENGINE_MODULE, M7_PARTICIPANT_CCA_ENGINE_MODULE, 'cca/lock-order.ts'],
  sealOperation: [CCA_ENGINE_MODULE, M7_PARTICIPANT_CCA_ENGINE_MODULE, 'cca/sealed-operation.ts'],
  // M7 V1.1 TO-8: the capability-signer owner kind. Its runner and its client sealing are reachable
  // from exactly the signer module (and are defined in the execution-context module).
  runM7CapabilitySignerTransaction: [M7_CAPABILITY_SIGNER_MODULE, 'cca/execution-context.ts'],
  sealM7CapabilitySignerClient: [M7_CAPABILITY_SIGNER_MODULE, 'cca/execution-context.ts'],
};

/** Restricted modules → allowed importers (plus leaves where noted by role rules). */
export const RESTRICTED_MODULE_IMPORTERS: Readonly<Record<string, readonly string[]>> = {
  'cca/execution-context.ts': [
    'db/client.ts',
    CCA_ENGINE_MODULE,
    M7_PARTICIPANT_CCA_ENGINE_MODULE,
    // M7 V1.1 TO-8: the capability signer registers its own owner kind (additive importer).
    M7_CAPABILITY_SIGNER_MODULE,
  ],
  'cca/tracked-adapter.ts': [CCA_ENGINE_MODULE, M7_PARTICIPANT_CCA_ENGINE_MODULE],
};

/**
 * The raw M7 session-secret accessor (V1.1 §8.2) → the ONLY productive modules that may import it.
 * Exactly one: the private M7 participant CCA engine, which must pass the secret to the approved
 * `m7.p_*` functions. Not the leaf, not the executor, not the adapter, not a public barrel, not a
 * participant-facing module.
 */
export const M7_SESSION_SECRET_ACCESSOR = 'readM7ParticipantSessionSecret';
export const M7_SESSION_SECRET_ACCESSOR_OWNERS: readonly string[] = [
  M7_PARTICIPANT_CCA_ENGINE_MODULE,
];

/** The M7 session module: the single productive holder of the secret registry and the issuer. */
export const M7_SESSION_MODULE = 'services/m7-participant-session.ts';

/**
 * V1.1 §18.3 credential scoping: each M7 database credential is read in EXACTLY ONE productive
 * module. Three of the six M7 role credentials are implemented (participant, session issuer and — in
 * the TO-8 signer foundation slice — the capability signer); the other three are not implemented and
 * MUST NOT appear in productive source at all.
 */
export const M7_CREDENTIAL_READERS: Readonly<Record<string, string>> = {
  M7_PARTICIPANT_DATABASE_URL: M7_PARTICIPANT_CCA_ENGINE_MODULE,
  M7_SESSION_ISSUER_DATABASE_URL: M7_SESSION_MODULE,
  M7_CAPABILITY_SIGNER_DATABASE_URL: M7_CAPABILITY_SIGNER_MODULE,
  // PPC-1 (§18.3 "the provider write-signing credentials"): read by the signer module alone.
  M7_CAPABILITY_SIGNER_PROVIDER_CREDENTIALS: M7_CAPABILITY_SIGNER_MODULE,
};

/** M7 role credentials that are deliberately NOT implemented (AUTH §9, §29; signer AUTH §11). */
export const M7_CREDENTIALS_NOT_IN_THIS_SLICE: readonly string[] = [
  'M7_PRIVACY_REQUEST_DATABASE_URL',
  'M7_STORAGE_WORKER_DATABASE_URL',
  'M7_DELETION_AUTHORITY_DATABASE_URL',
];

function identifierUses(code: string, names: ReadonlySet<string>): Set<string> {
  const found = new Set<string>();
  const visit = (n: ts.Node): void => {
    if (ts.isIdentifier(n) && names.has(n.text)) {
      const p = n.parent;
      // A key in an object literal / type member / member access is a NAME, not a reference to the
      // capability binding (this module's own allowlist tables are exactly such keys).
      const isNamePosition =
        p !== undefined &&
        ((ts.isPropertyAssignment(p) && p.name === n) ||
          (ts.isPropertyAccessExpression(p) && p.name === n) ||
          (ts.isPropertySignature(p) && p.name === n) ||
          (ts.isMethodSignature(p) && p.name === n) ||
          (ts.isMethodDeclaration(p) && p.name === n));
      if (!isNamePosition) found.add(n.text);
    }
    ts.forEachChild(n, visit);
  };
  visit(parse(code));
  return found;
}

/** Sealed-operation definition call sites and whether each is at module scope. */
function definitionCalls(code: string): { atModuleScope: boolean }[] {
  const out: { atModuleScope: boolean }[] = [];
  const visit = (n: ts.Node, inFunction: boolean): void => {
    const fn =
      ts.isFunctionDeclaration(n) ||
      ts.isFunctionExpression(n) ||
      ts.isArrowFunction(n) ||
      ts.isMethodDeclaration(n) ||
      ts.isConstructorDeclaration(n) ||
      ts.isGetAccessor(n) ||
      ts.isSetAccessor(n) ||
      ts.isClassStaticBlockDeclaration(n);
    if (
      ts.isCallExpression(n) &&
      ts.isIdentifier(n.expression) &&
      SEALED_DEFINITION_FUNCTIONS.includes(n.expression.text)
    ) {
      out.push({ atModuleScope: !inFunction });
    }
    ts.forEachChild(n, (c) => visit(c, inFunction || fn));
  };
  visit(parse(code), false);
  return out;
}

/** Number of exported VALUE bindings (types excluded). */
function exportedValueCount(code: string): number {
  const sf = parse(code);
  let count = 0;
  for (const st of sf.statements) {
    const mods = ts.canHaveModifiers(st) ? ts.getModifiers(st) : undefined;
    const exported = mods?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) === true;
    if (ts.isVariableStatement(st) && exported) count += st.declarationList.declarations.length;
    else if ((ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st)) && exported) count++;
    else if (ts.isExportAssignment(st)) count++;
    else if (ts.isExportDeclaration(st) && !st.isTypeOnly) {
      if (st.exportClause === undefined || ts.isNamespaceExport(st.exportClause)) count += 99;
      else count += st.exportClause.elements.filter((e) => !e.isTypeOnly).length;
    }
  }
  return count;
}

function onlyTypeDeclarations(code: string): boolean {
  return parse(code).statements.every(
    (st) =>
      ts.isInterfaceDeclaration(st) ||
      ts.isTypeAliasDeclaration(st) ||
      (ts.isImportDeclaration(st) && st.importClause?.isTypeOnly === true) ||
      (ts.isExportDeclaration(st) && st.isTypeOnly) ||
      ts.isEmptyStatement(st),
  );
}

function stringMentions(code: string, needle: RegExp): boolean {
  let hit = false;
  const visit = (n: ts.Node): void => {
    if (
      (ts.isStringLiteral(n) ||
        ts.isNoSubstitutionTemplateLiteral(n) ||
        ts.isTemplateHead(n) ||
        ts.isTemplateMiddle(n) ||
        ts.isTemplateTail(n)) &&
      needle.test(n.text)
    ) {
      hit = true;
    }
    if (
      ts.isPropertyAccessExpression(n) &&
      (n.name.text === 'experimentAssignment' || n.name.text === 'experimentAssignmentReceipt')
    ) {
      hit = true;
    }
    ts.forEachChild(n, visit);
  };
  visit(parse(code));
  return hit;
}

export interface TopologyOptions {
  /** Include fixture/probe files as if they were production (used to validate fixture topology). */
  readonly includeFixtures?: boolean;
}

/** Every CCA topology rule over the provider's files. Returns violations (empty ⇒ compliant). */
export function analyzeCcaTopology(
  provider: SourceProvider,
  options: TopologyOptions = {},
): string[] {
  const files = provider
    .list()
    .filter((f) => !/\.test\.tsx?$/.test(f))
    .filter((f) => options.includeFixtures === true || !isTestOrFixture(f));
  const v: string[] = [];
  const importersOf = new Map<string, Set<string>>();
  const edgesOf = new Map<string, { edge: ImportEdge; target: Resolved }[]>();

  for (const f of files) {
    const code = provider.read(f) ?? '';
    const list = extractImportEdges(code).map((edge) => ({
      edge,
      target: resolveSpecifier(edge.specifier, f, provider),
    }));
    edgesOf.set(f, list);
    for (const { target } of list) {
      if (target.type !== 'local') continue;
      if (!importersOf.has(target.rel)) importersOf.set(target.rel, new Set());
      importersOf.get(target.rel)!.add(f);
    }
    // T9 async_hooks confinement.
    for (const { edge } of list) {
      if (/^(node:)?async_hooks$/.test(edge.specifier) && f !== 'cca/execution-context.ts') {
        v.push(`${f}: ASYNC_HOOKS_IMPORT_FORBIDDEN`);
      }
    }
    // T7 capability primitives.
    const used = identifierUses(code, new Set(Object.keys(CAPABILITY_PRIMITIVE_OWNERS)));
    for (const name of used) {
      if (!CAPABILITY_PRIMITIVE_OWNERS[name]!.includes(f)) {
        v.push(`${f}: CAPABILITY_PRIMITIVE_FORBIDDEN:${name}`);
      }
    }
    if (identifierUses(code, new Set(SEALED_DEFINITION_FUNCTIONS)).size > 0) {
      if (roleOf(f) !== 'LEAF' && !CCA_ENGINE_MODULES.has(f)) {
        v.push(`${f}: DEFINE_SEALED_OPERATION_OUTSIDE_LEAF`);
      }
    }
    // T10 CCA foundation is DB-free.
    if (f.startsWith('cca/') && !isTestOrFixture(f)) {
      for (const { edge, target } of list) {
        const bad =
          (target.type === 'external' && /^@prisma\//.test(target.name)) ||
          (target.type === 'local' && isDbCapablePath(target.rel));
        if (bad) v.push(`${f}: CCA_FOUNDATION_DB_EDGE:${edge.specifier}`);
      }
    }
  }

  const importers = (rel: string): string[] => [...(importersOf.get(rel) ?? [])];

  for (const f of files) {
    const role = roleOf(f);
    const code = provider.read(f) ?? '';
    const list = edgesOf.get(f) ?? [];
    const localTargets = list.flatMap((e) => (e.target.type === 'local' ? [e.target.rel] : []));
    const valueTargets = list.flatMap((e) =>
      e.target.type === 'local' && !e.edge.typeOnly ? [e.target.rel] : [],
    );
    // T8 restricted modules (value edges; a type-only edge carries no runtime capability).
    for (const [mod, allowed] of Object.entries(RESTRICTED_MODULE_IMPORTERS)) {
      if (valueTargets.includes(mod) && !allowed.includes(f)) {
        v.push(`${f}: RESTRICTED_MODULE_IMPORT:${mod}`);
      }
    }
    // Every file: a non-literal dynamic import is forbidden for CCA roles and the CCA namespace.
    if (
      (role !== 'OTHER' || f.startsWith('cca/')) &&
      list.some((e) => e.edge.kind === 'nonliteral')
    ) {
      v.push(`${f}: NON_LITERAL_DYNAMIC_IMPORT_FORBIDDEN`);
    }
    switch (role) {
      case 'ENGINE':
        for (const imp of importers(f)) {
          if (roleOf(imp) !== 'LEAF') v.push(`${imp}: ENGINE_IMPORT_OUTSIDE_LEAF`);
        }
        break;
      case 'EXECUTOR': {
        const imps = importers(f);
        for (const imp of imps) {
          if (roleOf(imp) !== 'LEAF') v.push(`${imp}: EXECUTOR_IMPORT_OUTSIDE_LEAF:${f}`);
        }
        if (imps.length > 1) v.push(`${f}: EXECUTOR_SHARED_BY_LEAVES`);
        for (const x of analyzeExecutorClosure(f, provider).violations) v.push(`EXECUTOR ${x}`);
        break;
      }
      case 'ADAPTER_IMPL': {
        for (const imp of importers(f)) {
          if (roleOf(imp) !== 'LEAF') v.push(`${imp}: ADAPTER_IMPL_IMPORT_OUTSIDE_LEAF:${f}`);
        }
        // AUD-CCA-FND-01: the adapter gets a FULL transitive capability closure, exactly like the
        // executor. A direct-edge check is not sufficient — it missed external Prisma edges,
        // PrismaClient construction and helper-mediated capability entirely.
        for (const x of analyzeAdapterClosure(f, provider).violations) {
          v.push(`ADAPTER ${x}`);
        }
        if (stringMentions(code, /experiment_assignment/)) {
          v.push(`${f}: ADAPTER_IMPL_DIRECT_ASSIGNMENT_ACCESS`);
        }
        break;
      }
      case 'ADAPTER_INTERFACE':
        if (!onlyTypeDeclarations(code)) v.push(`${f}: ADAPTER_INTERFACE_NOT_TYPES_ONLY`);
        break;
      case 'LEAF': {
        const execs = localTargets.filter((t) => roleOf(t) === 'EXECUTOR');
        const impls = localTargets.filter((t) => roleOf(t) === 'ADAPTER_IMPL');
        const engines = new Set(localTargets.filter((t) => CCA_ENGINE_MODULES.has(t)));
        if (new Set(execs).size !== 1) v.push(`${f}: LEAF_EXECUTOR_COUNT:${new Set(execs).size}`);
        if (new Set(impls).size !== 1) v.push(`${f}: LEAF_ADAPTER_COUNT:${new Set(impls).size}`);
        if (engines.size === 0) v.push(`${f}: LEAF_WITHOUT_ENGINE`);
        // A leaf binds to exactly ONE engine; reaching two would let one operation straddle two
        // transaction owners and two credential boundaries.
        if (engines.size > 1) v.push(`${f}: LEAF_MULTIPLE_ENGINES:${engines.size}`);
        if (localTargets.some((t) => roleOf(t) === 'LEAF')) v.push(`${f}: CROSS_LEAF_IMPORT`);
        if (list.some((e) => e.edge.exportStar || e.edge.kind === 'reexport')) {
          v.push(`${f}: LEAF_REEXPORT_FORBIDDEN`);
        }
        for (const { target } of list) {
          if (
            target.type === 'local' &&
            !CCA_ENGINE_MODULES.has(target.rel) &&
            (target.rel.startsWith('db/') || target.rel.startsWith('services/'))
          ) {
            v.push(`${f}: LEAF_DB_EDGE_OUTSIDE_ENGINE:${target.rel}`);
          }
          if (target.type === 'external' && /^@prisma\//.test(target.name)) {
            v.push(`${f}: LEAF_PRISMA_IMPORT`);
          }
        }
        const calls = definitionCalls(code);
        if (calls.length !== 1) v.push(`${f}: LEAF_DEFINITION_COUNT:${calls.length}`);
        if (calls.some((c) => !c.atModuleScope)) v.push(`${f}: DEFINITION_NOT_AT_MODULE_SCOPE`);
        if (exportedValueCount(code) > 1) v.push(`${f}: LEAF_EXPORTS_MORE_THAN_OPERATION`);
        if (ambientViolations(code).some((a) => a.startsWith('RAW_CLIENT_MEMBER'))) {
          v.push(`${f}: LEAF_RAW_CLIENT_MEMBER`);
        }
        break;
      }
      default:
        break;
    }
  }
  return v;
}

// ---------------------------------------------------------------------------------------------------
// M7 SO-1 productive topology (M7 V1.1 §8.2, §9.2, §9.3, §9.4, §9.5.2, §18.3)
//
// Everything below is ADDITIVE. It adds rules the accepted R2 analyzer did not need — because no
// productive leaf existed — and removes, relaxes or exempts nothing. `analyzeCcaTopology` still runs
// in full over the same tree, and every accepted rule still applies to the M7 modules too.
// ---------------------------------------------------------------------------------------------------

/** This analyzer module itself: CI tooling, never in any runtime dependency closure (proved by M12). */
export const ANALYZER_MODULE = 'cca/capability-analysis.ts';

/** The SO-1 modules, by path. Exactly one of each role may exist in productive source. */
export const M7_SO1_MODULES = Object.freeze({
  leaf: 'm7/so1/m7-outcome-assertion.cca-leaf.ts',
  executor: 'm7/so1/m7-outcome-assertion.cca-executor.ts',
  adapterInterface: 'm7/so1/m7-outcome-assertion.cca-adapter-interface.ts',
  adapter: 'm7/so1/m7-outcome-assertion.cca-adapter.ts',
  inputGrammar: 'm7/so1/outcome-assertion-input.ts',
  controlPlaneDigest: 'm7/runtime/control-plane-digest.ts',
});

/**
 * The SO-2 modules, by path (SO-2 AUTH §22). SO-2 is the SECOND and last sealed M7 family this
 * analyzer admits: SO-3, the storage worker and the capability signer remain forbidden (rule M4).
 */
export const M7_SO2_MODULES = Object.freeze({
  leaf: 'm7/so2/m7-evidence-upload.cca-leaf.ts',
  executor: 'm7/so2/m7-evidence-upload.cca-executor.ts',
  adapterInterface: 'm7/so2/m7-evidence-upload.cca-adapter-interface.ts',
  adapter: 'm7/so2/m7-evidence-upload.cca-adapter.ts',
  inputGrammar: 'm7/so2/evidence-upload-input.ts',
  operationContext: 'm7/so2/m7-evidence-upload-operation-context.ts',
});

/**
 * Every productive CCA role module that may exist, per role, at its exact path. The accepted SO-1
 * rule was "exactly one of each role"; with SO-2 it becomes "exactly THESE, one per sealed family" —
 * a closed path set, which is strictly stronger than a count.
 */
export const M7_PRODUCTIVE_ROLE_MODULES: Readonly<Record<string, readonly string[]>> = {
  LEAF: [M7_SO1_MODULES.leaf, M7_SO2_MODULES.leaf],
  EXECUTOR: [M7_SO1_MODULES.executor, M7_SO2_MODULES.executor],
  ADAPTER_INTERFACE: [M7_SO1_MODULES.adapterInterface, M7_SO2_MODULES.adapterInterface],
  ADAPTER_IMPL: [M7_SO1_MODULES.adapter, M7_SO2_MODULES.adapter],
};

/** The EXACT value exports of the private M7 engine: two sealed entry points + its credential key. */
export const M7_ENGINE_EXPORTED_VALUES: readonly string[] = [
  'M7_PARTICIPANT_DATABASE_URL_ENV',
  'defineSealedEvidenceUploadOperation',
  'defineSealedOutcomeAssertionOperation',
];

/** V1.1 §9.3 SO-1: the EXACT closed caller key set. Any drift here is a specification change. */
export const M7_SO1_EXPECTED_INPUT_KEYS: readonly string[] = [
  'purchaseIntentId',
  'clientCaptureKey',
  'idempotencyKey',
  'assertionKind',
  'supersedesAssertionId',
  'statusLabel',
  'occurrenceAssertion',
  'merchant',
  'eventTime',
];

/**
 * V1.1 §9.3 "Forbidden in every input". The closed key set above already excludes these
 * structurally; this census additionally proves none of them was quietly added.
 */
export const M7_SO1_FORBIDDEN_INPUT_KEYS: readonly string[] = [
  'participantId',
  'assignmentId',
  'sessionSecret',
  'capturedAt',
  'manifestSha256',
  'manifestVersion',
  'vocabularyVersion',
  'policyVersion',
  'policy',
  'operationId',
  'executor',
  'callback',
  'transaction',
  'objectKey',
  'digest',
  'size',
  'mediaType',
  'storageProfile',
  'backend',
  'leaseEpoch',
  'selector',
];

/** Productive source: not a test, not a fixture/probe, and not this CI analyzer. */
function isProductive(rel: string): boolean {
  return !isTestOrFixture(rel) && rel !== ANALYZER_MODULE;
}

/**
 * Which of `names` appear in `code` as a string literal, a property name or an identifier.
 * Deliberately broad: an environment key read as `process.env.X`, `process.env['X']` or through a
 * local `const K = 'X'` alias all count as reading it.
 *
 * ONE parse for the whole name set. The obvious `mentionsName(code, name)` shape re-parsed every
 * file once per name, which turned each census into thousands of redundant AST builds.
 */
/**
 * Content-keyed memos for the M7 analyzer only. A mutation probe overlays ONE file on the real tree,
 * so re-deriving edges and name censuses for the other ~250 unchanged files on every probe is pure
 * waste (and long enough to starve the test worker). Keyed by the exact source text, so a changed
 * file can never reuse a stale result; the accepted analyzer functions are not memoized.
 */
const m7EdgeMemo = new Map<string, ImportEdge[]>();
const m7MentionMemo = new Map<string, Set<string>>();
/** PPC-1 X15 per-file env facts (content-keyed, like the memos above). */
const m7EnvFactsMemo = new Map<string, { v: string[]; holders: number }>();
/** PPC-1 X18 per-file SigV4 marker presence (content-keyed). */
const m7Sigv4MarkerMemo = new Map<string, boolean>();

function memoEdges(code: string): ImportEdge[] {
  let hit = m7EdgeMemo.get(code);
  if (hit === undefined) {
    hit = extractImportEdges(code);
    m7EdgeMemo.set(code, hit);
  }
  return hit;
}

function memoMentions(code: string, names: ReadonlySet<string>): Set<string> {
  const key = `${[...names].sort().join(' ')}${code}`;
  let hit = m7MentionMemo.get(key);
  if (hit === undefined) {
    hit = mentionedNames(code, names);
    m7MentionMemo.set(key, hit);
  }
  return hit;
}

function mentionedNames(code: string, names: ReadonlySet<string>): Set<string> {
  const found = new Set<string>();
  const hit = (text: string): void => {
    if (names.has(text)) found.add(text);
  };
  const visit = (n: ts.Node): void => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) hit(n.text);
    else if (ts.isPropertyAccessExpression(n)) hit(n.name.text);
    else if (ts.isIdentifier(n)) hit(n.text);
    ts.forEachChild(n, visit);
  };
  visit(parse(code));
  return found;
}

/** The string elements of a `const <name> = [...]` / `= Object.freeze([...])` declaration. */
function exportedStringArray(code: string, name: string): string[] | null {
  let found: string[] | null = null;
  const literals = (expr: ts.Expression): string[] | null => {
    let e = expr;
    while (ts.isAsExpression(e) || ts.isSatisfiesExpression(e) || ts.isParenthesizedExpression(e)) {
      e = e.expression;
    }
    if (
      ts.isCallExpression(e) &&
      ts.isPropertyAccessExpression(e.expression) &&
      e.expression.name.text === 'freeze' &&
      e.arguments.length === 1
    ) {
      return literals(e.arguments[0]!);
    }
    if (!ts.isArrayLiteralExpression(e)) return null;
    const out: string[] = [];
    for (const el of e.elements) {
      let v: ts.Expression = el;
      while (ts.isAsExpression(v) || ts.isParenthesizedExpression(v)) v = v.expression;
      if (!ts.isStringLiteral(v)) return null;
      out.push(v.text);
    }
    return out;
  };
  for (const st of parse(code).statements) {
    if (!ts.isVariableStatement(st)) continue;
    for (const d of st.declarationList.declarations) {
      if (ts.isIdentifier(d.name) && d.name.text === name && d.initializer !== undefined) {
        found = literals(d.initializer);
      }
    }
  }
  return found;
}

/** Whether `code` exports a VALUE binding with exactly this name. */
function exportsBindingNamed(code: string, name: string): boolean {
  for (const st of parse(code).statements) {
    const mods = ts.canHaveModifiers(st) ? ts.getModifiers(st) : undefined;
    const exported = mods?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) === true;
    if (ts.isVariableStatement(st) && exported) {
      for (const d of st.declarationList.declarations) {
        if (ts.isIdentifier(d.name) && d.name.text === name) return true;
      }
    }
    if ((ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st)) && exported) {
      if (st.name?.text === name) return true;
    }
    if (ts.isExportDeclaration(st) && !st.isTypeOnly && st.exportClause !== undefined) {
      if (ts.isNamedExports(st.exportClause)) {
        for (const el of st.exportClause.elements) {
          if (!el.isTypeOnly && el.name.text === name) return true;
        }
      }
    }
  }
  return false;
}

/** Every exported VALUE binding name of `code`, sorted (types and type-only exports excluded). */
function exportedValueNames(code: string): string[] {
  const out = new Set<string>();
  for (const st of parse(code).statements) {
    const mods = ts.canHaveModifiers(st) ? ts.getModifiers(st) : undefined;
    const exported = mods?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) === true;
    if (ts.isVariableStatement(st) && exported) {
      for (const d of st.declarationList.declarations) {
        out.add(ts.isIdentifier(d.name) ? d.name.text : '<pattern>');
      }
    }
    if ((ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st)) && exported) {
      out.add(st.name?.text ?? '<default>');
    }
    if (ts.isExportAssignment(st)) out.add('<default>');
    if (ts.isExportDeclaration(st) && !st.isTypeOnly) {
      if (st.exportClause === undefined) out.add('<star>');
      else if (ts.isNamedExports(st.exportClause)) {
        for (const el of st.exportClause.elements) if (!el.isTypeOnly) out.add(el.name.text);
      } else out.add('<namespace>');
    }
  }
  return [...out].sort();
}

export interface M7So1TopologyReport {
  readonly violations: readonly string[];
  readonly credentialReaders: Readonly<Record<string, readonly string[]>>;
  readonly secretAccessorImporters: readonly string[];
  readonly controlPlaneDigestReaders: readonly string[];
  readonly so1InputKeys: readonly string[] | null;
  readonly roleCounts: Readonly<Record<string, number>>;
}

/**
 * Every M7 SO-1 productive-topology rule. `violations` is empty when the tree is compliant; the
 * other fields are the CENSUSES themselves, so the audit evidence records what was actually
 * observed rather than only that nothing was found wrong.
 */
export function analyzeM7So1Topology(provider: SourceProvider): M7So1TopologyReport {
  const all = provider.list();
  const productive = all.filter(isProductive);
  const v: string[] = [];

  const read = (rel: string): string => provider.read(rel) ?? '';
  const edgesOf = new Map<string, { edge: ImportEdge; target: Resolved }[]>();
  for (const f of all) {
    edgesOf.set(
      f,
      memoEdges(read(f)).map((edge) => ({
        edge,
        target: resolveSpecifier(edge.specifier, f, provider),
      })),
    );
  }

  // ONE name census pass over the productive tree: every credential key, the out-of-scope
  // credentials, the session-secret accessor and the control-plane digest key, all in one parse
  // per file.
  const CENSUS_NAMES: ReadonlySet<string> = new Set([
    ...Object.keys(M7_CREDENTIAL_READERS),
    ...M7_CREDENTIALS_NOT_IN_THIS_SLICE,
    M7_SESSION_SECRET_ACCESSOR,
    'M7_CONTROL_PLANE_MANIFEST_SHA256',
  ]);
  const mentions = new Map<string, Set<string>>();
  for (const f of productive) mentions.set(f, memoMentions(read(f), CENSUS_NAMES));
  const mentionsIn = (f: string, name: string): boolean => mentions.get(f)?.has(name) === true;
  const localTargetsOf = (rel: string): string[] =>
    (edgesOf.get(rel) ?? []).flatMap((e) => (e.target.type === 'local' ? [e.target.rel] : []));
  const importersOf = (rel: string, files: readonly string[]): string[] =>
    files.filter((f) => localTargetsOf(f).includes(rel));

  // ── M1 / M2 — exactly the SO-1 and SO-2 role modules, one per family, at the expected paths ───
  const roleCounts: Record<string, number> = {
    LEAF: 0,
    EXECUTOR: 0,
    ADAPTER_INTERFACE: 0,
    ADAPTER_IMPL: 0,
    ENGINE: 0,
  };
  for (const f of productive) {
    const role = roleOf(f);
    if (role !== 'OTHER') roleCounts[role] = (roleCounts[role] ?? 0) + 1;
  }
  for (const [label, rel] of [
    ['LEAF', M7_SO1_MODULES.leaf],
    ['EXECUTOR', M7_SO1_MODULES.executor],
    ['ADAPTER_INTERFACE', M7_SO1_MODULES.adapterInterface],
    ['ADAPTER_IMPL', M7_SO1_MODULES.adapter],
  ] as const) {
    if (provider.read(rel) === null) v.push(`M7_SO1_MISSING_${label}:${rel}`);
    const expected = M7_PRODUCTIVE_ROLE_MODULES[label]!;
    if (roleCounts[label] !== expected.length) {
      v.push(`M7_SO1_${label}_COUNT:${roleCounts[label] ?? 0}`);
    }
    // Closed path set: a role module anywhere else is a violation, whatever the count says.
    for (const f of productive) {
      if (roleOf(f) === label && !expected.includes(f)) v.push(`M7_UNEXPECTED_${label}:${f}`);
    }
  }

  // ── M3 — the leaf binds to the M7 engine, its fixed executor and its own adapter ──────────────
  const leafTargets = localTargetsOf(M7_SO1_MODULES.leaf);
  if (!leafTargets.includes(M7_PARTICIPANT_CCA_ENGINE_MODULE)) {
    v.push('M7_SO1_LEAF_NOT_BOUND_TO_M7_ENGINE');
  }
  if (!leafTargets.includes(M7_SO1_MODULES.executor)) v.push('M7_SO1_LEAF_NOT_BOUND_TO_EXECUTOR');
  if (!leafTargets.includes(M7_SO1_MODULES.adapter)) v.push('M7_SO1_LEAF_NOT_BOUND_TO_ADAPTER');
  if (leafTargets.includes(CCA_ENGINE_MODULE)) v.push('M7_SO1_LEAF_BOUND_TO_FOUNDATION_ENGINE');

  // ── M4 — SO-3 / storage worker / signer are NOT implemented (AUTH §29; SO-2 AUTH §32) ──────────
  // The ONLY evidence-family role modules admitted are the exact SO-2 family paths. Any other
  // evidence / upload-intent / submission / worker / signer role module is still a violation.
  const EVIDENCE = /(evidence|upload-intent|saving-evidence|storage-worker|capability-signer)/i;
  const SO2_FAMILY: readonly string[] = [
    M7_SO2_MODULES.leaf,
    M7_SO2_MODULES.executor,
    M7_SO2_MODULES.adapterInterface,
    M7_SO2_MODULES.adapter,
  ];
  for (const f of productive) {
    if (roleOf(f) !== 'OTHER' && EVIDENCE.test(f) && !SO2_FAMILY.includes(f)) {
      v.push(`M7_SO2_SO3_MODULE_PRESENT:${f}`);
    }
  }
  for (const f of [M7_SO1_MODULES.leaf, M7_SO1_MODULES.executor, M7_SO1_MODULES.adapter]) {
    for (const t of localTargetsOf(f)) {
      if (EVIDENCE.test(t)) v.push(`M7_SO1_EVIDENCE_EDGE:${f} -> ${t}`);
    }
  }

  // ── M5 — V1.1 §18.3 credential census: exactly one productive reader each ─────────────────────
  const credentialReaders: Record<string, readonly string[]> = {};
  for (const [key, owner] of Object.entries(M7_CREDENTIAL_READERS)) {
    const readers = productive.filter((f) => mentionsIn(f, key));
    credentialReaders[key] = readers;
    if (readers.length !== 1 || readers[0] !== owner) {
      v.push(`M7_CREDENTIAL_READER_CENSUS:${key}:[${readers.join(',')}] expected [${owner}]`);
    }
  }
  for (const key of M7_CREDENTIALS_NOT_IN_THIS_SLICE) {
    for (const f of productive.filter((x) => mentionsIn(x, key))) {
      v.push(`M7_CREDENTIAL_NOT_IN_THIS_SLICE:${key}:${f}`);
    }
  }

  // ── M6 — the raw session-secret accessor, and the session module itself, are narrowly reachable
  const secretAccessorImporters = productive.filter(
    (f) => f !== M7_SESSION_MODULE && mentionsIn(f, M7_SESSION_SECRET_ACCESSOR),
  );
  const expectedOwners = [...M7_SESSION_SECRET_ACCESSOR_OWNERS].sort();
  if (JSON.stringify([...secretAccessorImporters].sort()) !== JSON.stringify(expectedOwners)) {
    v.push(
      `M7_SESSION_SECRET_ACCESSOR_CENSUS:[${secretAccessorImporters.join(',')}] expected [${expectedOwners.join(',')}]`,
    );
  }
  // Nothing may import the M7 session module except the private engine: participant-facing code,
  // public barrels and the leaf / executor / adapter must not reach the issuer at all.
  for (const f of importersOf(M7_SESSION_MODULE, productive)) {
    if (f !== M7_PARTICIPANT_CCA_ENGINE_MODULE) v.push(`M7_SESSION_MODULE_IMPORT:${f}`);
  }

  // ── M7 — the adapter-reachable M7 contract modules really are TYPES ONLY ──────────────────────
  for (const rel of ADAPTER_M7_TYPES_ONLY_MODULES) {
    const code = provider.read(rel);
    if (code === null) {
      v.push(`M7_TYPES_ONLY_MODULE_MISSING:${rel}`);
      continue;
    }
    if (!onlyTypeDeclarations(code)) v.push(`M7_TYPES_ONLY_MODULE_HAS_RUNTIME_CODE:${rel}`);
    if (exportedValueCount(code) !== 0) v.push(`M7_TYPES_ONLY_MODULE_EXPORTS_VALUE:${rel}`);
  }

  // ── M8 — the private M7 engine exposes EXACTLY its two definition entry points, no DB capability
  const engineCode = provider.read(M7_PARTICIPANT_CCA_ENGINE_MODULE);
  if (engineCode === null) {
    v.push(`M7_ENGINE_MISSING:${M7_PARTICIPANT_CCA_ENGINE_MODULE}`);
  } else {
    const exported = exportedValueCount(engineCode);
    // Two sealed definition entry points (SO-1, SO-2), plus the named environment-key constant the
    // census reads — and the exported NAME set must be exactly that, not merely no larger.
    if (exported > M7_ENGINE_EXPORTED_VALUES.length) {
      v.push(`M7_ENGINE_EXPORTS_MORE_THAN_DEFINITION:${exported}`);
    }
    for (const entry of [
      'defineSealedOutcomeAssertionOperation',
      'defineSealedEvidenceUploadOperation',
    ]) {
      if (!exportsBindingNamed(engineCode, entry)) {
        v.push(`M7_ENGINE_MISSING_DEFINITION_ENTRY_POINT:${entry}`);
      }
    }
    const names = exportedValueNames(engineCode);
    if (JSON.stringify(names) !== JSON.stringify([...M7_ENGINE_EXPORTED_VALUES].sort())) {
      v.push(`M7_ENGINE_EXPORT_SET:[${names.join(',')}]`);
    }
    for (const forbidden of [
      'PrismaClient',
      'TransactionClient',
      'prisma',
      'client',
      'participant',
      'query',
      'queryRaw',
      'execute',
      'executeRaw',
      'runRaw',
      'raw',
      'sql',
      'repository',
      'transaction',
      'db',
      'connection',
      'lookupOutcomeReceipt',
    ]) {
      if (exportsBindingNamed(engineCode, forbidden)) {
        v.push(`M7_ENGINE_EXPORTS_DB_CAPABILITY:${forbidden}`);
      }
    }
    for (const e of extractImportEdges(engineCode)) {
      if (e.exportStar || e.kind === 'reexport') v.push('M7_ENGINE_REEXPORT_FORBIDDEN');
    }
  }

  // ── M9 — AUTH §30: no public route, UI, client hook or public service barrel wiring ───────────
  const internalOnly = [
    M7_SO1_MODULES.leaf,
    M7_SO1_MODULES.executor,
    M7_SO1_MODULES.adapter,
    M7_SO2_MODULES.leaf,
    M7_SO2_MODULES.executor,
    M7_SO2_MODULES.adapter,
    M7_SO2_MODULES.inputGrammar,
    M7_PARTICIPANT_CCA_ENGINE_MODULE,
    M7_SESSION_MODULE,
  ];
  for (const f of productive) {
    if (!f.startsWith('app/') && f !== 'services/index.ts') continue;
    for (const t of localTargetsOf(f)) {
      if (internalOnly.includes(t)) v.push(`M7_SO1_PUBLIC_EXPOSURE:${f} -> ${t}`);
    }
  }

  // ── M10 — the §9.3 caller key set is exactly the accepted one ─────────────────────────────────
  const grammar = provider.read(M7_SO1_MODULES.inputGrammar);
  const so1InputKeys = grammar === null ? null : exportedStringArray(grammar, 'SO1_INPUT_KEYS');
  if (so1InputKeys === null) {
    v.push('M7_SO1_INPUT_KEYS_UNREADABLE');
  } else {
    const observed = JSON.stringify([...so1InputKeys].sort());
    const expected = JSON.stringify([...M7_SO1_EXPECTED_INPUT_KEYS].sort());
    if (observed !== expected) v.push(`M7_SO1_INPUT_KEY_SET:[${so1InputKeys.join(',')}]`);
    for (const forbidden of M7_SO1_FORBIDDEN_INPUT_KEYS) {
      if (so1InputKeys.includes(forbidden)) v.push(`M7_SO1_FORBIDDEN_INPUT_KEY:${forbidden}`);
    }
  }

  // ── M11 — the control-plane digest is read in exactly one controlled runtime module ───────────
  const controlPlaneDigestReaders = productive.filter((f) =>
    mentionsIn(f, 'M7_CONTROL_PLANE_MANIFEST_SHA256'),
  );
  if (
    controlPlaneDigestReaders.length !== 1 ||
    controlPlaneDigestReaders[0] !== M7_SO1_MODULES.controlPlaneDigest
  ) {
    v.push(`M7_CONTROL_PLANE_DIGEST_READER_CENSUS:[${controlPlaneDigestReaders.join(',')}]`);
  }

  // ── M12 — this CI analyzer is never in an application dependency closure ──────────────────────
  for (const f of importersOf(ANALYZER_MODULE, productive)) {
    v.push(`M7_ANALYZER_IMPORTED_BY_PRODUCTION:${f}`);
  }

  // ── M13 — AUD-M7-SO1-01: the CCA entry guard runs BEFORE any database-reaching SO-1 work ──────
  if (engineCode !== null) {
    for (const x of analyzeM7EntryGuardOrder(engineCode)) v.push(x);
  }

  return {
    violations: v,
    credentialReaders,
    secretAccessorImporters,
    controlPlaneDigestReaders,
    so1InputKeys,
    roleCounts,
  };
}

// ---------------------------------------------------------------------------------------------------
// M13 — CCA ENTRY-GUARD ORDER in the productive M7 engine (AUD-M7-SO1-01)
//
// The rejected candidate 8dcf0a81 passed every presence check (it called runCcaTransaction, whose
// B/C guard is correct) and still performed database work BEFORE that guard: it resolved the
// assignment and ran the pre-CCA replay first, and a replay MATCH returned without ever reaching
// runCcaTransaction. PRESENCE WAS INSUFFICIENT. This rule proves ORDER, from the AST:
//
//   * the sealed implementation (the function passed to `sealOperation`) calls the private
//     preflight `assertCcaEntryTopology()` EXACTLY ONCE, as an UNCONDITIONAL top-level statement;
//   * that call precedes, in source order, EVERY call that reads the control-plane digest, reads
//     the session capability, touches the participant client, runs the pre-CCA replay, resolves the
//     assignment, opens the CCA transaction, reads consent, or issues any raw/Prisma database
//     operation (any `prisma.*`, `$queryRaw`, `$executeRaw`, `$transaction`, or tagged template);
//   * `resolveAssignmentReference` is called ONLY lexically inside the `runCcaTransaction(...)`
//     call (the authorized F–H phase), never on the pre-CCA path;
//   * the pre-CCA replay runs OUTSIDE and BEFORE the CCA transaction;
//   * the preflight itself reads ONLY the accepted `readDatabaseExecutionState()`, checks
//     `ccaActive` BEFORE `transactionActive`, throws CCA_REENTRY_FORBIDDEN before
//     CCA_TOP_LEVEL_TRANSACTION_REQUIRED, and awaits nothing.
// ---------------------------------------------------------------------------------------------------

export const M7_ENTRY_GUARD = 'assertCcaEntryTopology';

/** Calls that must never run before the entry guard. */
export const M7_POST_GUARD_CALLS: readonly string[] = [
  'expectedControlPlaneManifestDigest',
  'readM7ParticipantSessionSecret',
  'participant',
  'lookupOutcomeReceipt',
  'resolveAssignmentReference',
  'runCcaTransaction',
  'readConsentAuthorizationFacts',
  'disposeM7Error',
];

interface SiteRecord {
  readonly name: string;
  readonly pos: number;
  readonly end: number;
  readonly node: ts.Node;
}

function calleeName(expr: ts.Expression): string {
  if (ts.isIdentifier(expr)) return expr.text;
  if (ts.isPropertyAccessExpression(expr)) {
    const left = ts.isIdentifier(expr.expression)
      ? expr.expression.text
      : ts.isCallExpression(expr.expression)
        ? `${calleeName(expr.expression.expression)}()`
        : '?';
    return `${left}.${expr.name.text}`;
  }
  return '?';
}

/** The `sealOperation(<impl>)` implementation lexically inside the named definition function. */
function sealedImplementationIn(
  sf: ts.SourceFile,
  definitionFunction: string,
): ts.FunctionLikeDeclaration | undefined {
  let impl: ts.FunctionLikeDeclaration | undefined;
  const find = (n: ts.Node, inside: boolean): void => {
    const here = inside || (ts.isFunctionDeclaration(n) && n.name?.text === definitionFunction);
    if (
      here &&
      ts.isCallExpression(n) &&
      ts.isIdentifier(n.expression) &&
      n.expression.text === 'sealOperation' &&
      n.arguments.length >= 1
    ) {
      const a = n.arguments[0]!;
      if (ts.isArrowFunction(a) || ts.isFunctionExpression(a)) impl = a;
    }
    ts.forEachChild(n, (c) => find(c, here));
  };
  find(sf, false);
  return impl;
}

/** The module-private entry-topology preflight declaration. */
function entryGuardDeclaration(sf: ts.SourceFile): ts.FunctionDeclaration | undefined {
  let decl: ts.FunctionDeclaration | undefined;
  const find = (n: ts.Node): void => {
    if (ts.isFunctionDeclaration(n) && n.name?.text === M7_ENTRY_GUARD) decl = n;
    ts.forEachChild(n, find);
  };
  find(sf);
  return decl;
}

/** Every entry-guard ORDER violation in the M7 engine source. Empty ⇒ compliant. */
export function analyzeM7EntryGuardOrder(code: string): string[] {
  const v: string[] = [];
  const sf = parse(code);

  // With SO-2 present the engine seals TWO implementations; this rule judges the SO-1 one — the
  // `sealOperation` implementation inside `defineSealedOutcomeAssertionOperation`. The SO-2
  // implementation is judged by `analyzeM7So2EntryGuardOrder`, under its own, stricter rules.
  const impl = sealedImplementationIn(sf, 'defineSealedOutcomeAssertionOperation');
  const guardDecl = entryGuardDeclaration(sf);
  if (impl === undefined || impl.body === undefined || !ts.isBlock(impl.body)) {
    return ['M7_ENTRY_GUARD_IMPL_NOT_FOUND'];
  }
  const body = impl.body;

  // Collect every call / DB-reaching site inside the sealed implementation, in source order.
  const sites: SiteRecord[] = [];
  const collect = (n: ts.Node): void => {
    if (ts.isCallExpression(n)) {
      sites.push({ name: calleeName(n.expression), pos: n.getStart(sf), end: n.getEnd(), node: n });
    } else if (ts.isTaggedTemplateExpression(n)) {
      sites.push({
        name: `tagged:${calleeName(n.tag)}`,
        pos: n.getStart(sf),
        end: n.getEnd(),
        node: n,
      });
    } else if (
      ts.isPropertyAccessExpression(n) &&
      ts.isIdentifier(n.expression) &&
      n.expression.text === 'prisma'
    ) {
      sites.push({ name: `prisma.${n.name.text}`, pos: n.getStart(sf), end: n.getEnd(), node: n });
    }
    ts.forEachChild(n, collect);
  };
  collect(body);

  const guards = sites.filter((s) => s.name === M7_ENTRY_GUARD);
  if (guards.length === 0) {
    v.push('M7_ENTRY_GUARD_MISSING');
    return v;
  }
  if (guards.length > 1) v.push(`M7_ENTRY_GUARD_CALLED_${guards.length}_TIMES`);
  const guard = guards[0]!;
  // Unconditional: the guard's ExpressionStatement is a DIRECT child of the implementation body.
  const stmt = guard.node.parent;
  if (!(stmt !== undefined && ts.isExpressionStatement(stmt) && stmt.parent === body)) {
    v.push('M7_ENTRY_GUARD_NOT_UNCONDITIONAL_TOP_LEVEL');
  }

  const dbReaching = (s: SiteRecord): boolean =>
    M7_POST_GUARD_CALLS.includes(s.name) ||
    s.name.startsWith('prisma.') ||
    s.name.startsWith('tagged:') ||
    /\.\$(queryRaw|executeRaw|queryRawUnsafe|executeRawUnsafe|transaction)$/.test(s.name);
  for (const s of sites) {
    if (s.name === M7_ENTRY_GUARD) continue;
    if (dbReaching(s) && s.pos < guard.pos) v.push(`M7_DB_WORK_BEFORE_ENTRY_GUARD:${s.name}`);
  }
  // Any `return` statement before the guard is a bypass (e.g. a replay MATCH returned early).
  const early = (n: ts.Node): void => {
    if (ts.isReturnStatement(n) && n.getStart(sf) < guard.pos)
      v.push('M7_RETURN_BEFORE_ENTRY_GUARD');
    if (ts.isFunctionLike(n) && n !== impl) return;
    ts.forEachChild(n, early);
  };
  early(body);

  const txCalls = sites.filter((s) => s.name === 'runCcaTransaction');
  if (txCalls.length !== 1) v.push(`M7_CCA_TRANSACTION_CALL_COUNT:${txCalls.length}`);
  const tx = txCalls[0];
  const insideTx = (s: SiteRecord): boolean =>
    tx !== undefined && s.pos > tx.pos && s.end <= tx.end && s !== tx;
  for (const s of sites.filter((x) => x.name === 'resolveAssignmentReference')) {
    if (!insideTx(s)) v.push('M7_ASSIGNMENT_RESOLVED_OUTSIDE_CCA_TRANSACTION');
  }
  if (sites.filter((x) => x.name === 'resolveAssignmentReference').length === 0) {
    v.push('M7_ASSIGNMENT_RESOLUTION_MISSING');
  }
  const lookups = sites.filter((x) => x.name === 'lookupOutcomeReceipt');
  if (lookups.length !== 1) v.push(`M7_PRE_CCA_REPLAY_CALL_COUNT:${lookups.length}`);
  for (const s of lookups) {
    if (insideTx(s)) v.push('M7_PRE_CCA_REPLAY_INSIDE_CCA_TRANSACTION');
    if (tx !== undefined && s.pos > tx.pos) v.push('M7_PRE_CCA_REPLAY_AFTER_CCA_TRANSACTION');
  }

  // The preflight itself.
  if (guardDecl === undefined || guardDecl.body === undefined) {
    v.push('M7_ENTRY_GUARD_DECLARATION_MISSING');
    return v;
  }
  const gtext = guardDecl.body.getText(sf);
  const gcalls: string[] = [];
  let awaits = 0;
  const gvisit = (n: ts.Node): void => {
    if (ts.isCallExpression(n)) gcalls.push(calleeName(n.expression));
    if (ts.isAwaitExpression(n)) awaits++;
    ts.forEachChild(n, gvisit);
  };
  gvisit(guardDecl.body);
  if (awaits > 0 || guardDecl.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword)) {
    v.push('M7_ENTRY_GUARD_PERFORMS_ASYNC_WORK');
  }
  if (JSON.stringify(gcalls) !== JSON.stringify(['readDatabaseExecutionState'])) {
    v.push(`M7_ENTRY_GUARD_CALLS:[${gcalls.join(',')}]`);
  }
  const iCca = gtext.indexOf('ccaActive');
  const iTx = gtext.indexOf('transactionActive');
  if (iCca < 0 || iTx < 0 || iCca > iTx) v.push('M7_ENTRY_GUARD_PRECEDENCE');
  const iRe = gtext.indexOf('CCA_REENTRY_FORBIDDEN');
  const iTop = gtext.indexOf('CCA_TOP_LEVEL_TRANSACTION_REQUIRED');
  if (iRe < 0 || iTop < 0 || iRe > iTop) v.push('M7_ENTRY_GUARD_ERROR_CODES');
  return v;
}

// ---------------------------------------------------------------------------------------------------
// M7 SO-2 productive topology (M7 V1.1 §9.2, §9.3, §9.4, §9.5.2, §10, §19.11.4; SO-2 AUTH §9–§32)
//
// ADDITIVE, exactly like the SO-1 block above: every SO-1 rule and every accepted CCA rule still runs
// over the same tree. These rules pin the SECOND sealed family and prove the two families cannot
// reach, select or switch into each other, and that nothing of SO-3 / the storage worker / the
// capability signer / a provider SDK has appeared.
// ---------------------------------------------------------------------------------------------------

/** V1.1 §9.3 SO-2: the EXACT closed caller key set. */
export const M7_SO2_EXPECTED_INPUT_KEYS: readonly string[] = [
  'purchaseIntentId',
  'clientCorrelationNonce',
];

/** SO-2 AUTH §6: forbidden caller inputs (the closed key set already excludes them structurally). */
export const M7_SO2_FORBIDDEN_INPUT_KEYS: readonly string[] = [
  'participantId',
  'assignmentId',
  'sessionSecret',
  'capturedAt',
  'manifestSha256',
  'manifestVersion',
  'storageProfileId',
  'credentialProfileId',
  'backendSha256',
  'stagingObjectKey',
  'uploadTransport',
  'uploadExpiresAt',
  'maxBytes',
  'mediaPolicyVersion',
  'retentionPolicyVersion',
  'installationId',
  'policy',
  'operationId',
  'executor',
  'callback',
  'transaction',
  'objectKey',
  'providerCredential',
  'signedUrl',
];

/** The only `m7.*` database functions productive M7 runtime code may name, and who may name each. */
export const M7_DB_FUNCTION_OWNERS: Readonly<Record<string, readonly string[]>> = {
  p_lock_and_prove_assignment_v1: [M7_PARTICIPANT_CCA_ENGINE_MODULE],
  p_lookup_outcome_receipt_v1: [M7_PARTICIPANT_CCA_ENGINE_MODULE],
  p_record_outcome_assertion_v1: [M7_SO1_MODULES.adapter],
  p_begin_evidence_upload_v1: [M7_SO2_MODULES.adapter],
  s_issue_participant_session_v1: [M7_SESSION_MODULE],
  s_revoke_participant_session_v1: [M7_SESSION_MODULE],
  // M7 V1.1 §19.11.7 / XF-13: the ONE capability function, named only by the TO-8 signer module.
  x_mint_generation_capability_v1: [M7_CAPABILITY_SIGNER_MODULE],
};

/** Later-slice database functions that no productive runtime code may name (SO-2 AUTH §4, §32). */
export const M7_LATER_SLICE_DB_FUNCTIONS: readonly RegExp[] = [
  /\bp_finalize_evidence_submission_v1\b/,
  /\bp_lookup_evidence_receipt_v1\b/,
  /\bw_[a-z0-9_]+_v1\b/,
];

/**
 * Verification tooling (the accepted S03 catalog verifier, the normative-DDL generator and the S02
 * testkit). They legitimately NAME every §19 function in order to verify the installed catalog; they
 * are never imported by the M7 runtime (rule S8 proves it), so they are outside the runtime census.
 */
export const M7_VERIFICATION_TOOLING_PREFIXES: readonly string[] = [
  'm7/s03/',
  'm7/normative/',
  'm7/testkit/',
];

/**
 * Object-store provider SDKs and signing packages. PPC-1 WIDENS the accepted pattern (never narrows
 * it): AWS crypto helpers, the `aws4` / `aws4fetch` signers and the `@aws/` scope are provider-signing
 * capability too. Exactly ONE productive module may import any of them — the capability signer — and
 * only the reviewed allowlist `M7_PROVIDER_SIGNING_PACKAGES` (X3, X12).
 */
export const PROVIDER_SDK_PACKAGE =
  /^(@aws-sdk\/|aws-sdk$|@aws\/|@aws-crypto\/|aws4$|aws4fetch$|@vercel\/blob|@google-cloud\/storage|@azure\/storage|@smithy\/|minio$|s3-)/;

/** The M7 runtime files: the engine, the session module, and every productive so1/so2/runtime file. */
function m7RuntimeFiles(productive: readonly string[]): string[] {
  return productive.filter(
    (f) =>
      f === M7_PARTICIPANT_CCA_ENGINE_MODULE ||
      f === M7_SESSION_MODULE ||
      f === M7_CAPABILITY_SIGNER_MODULE ||
      f.startsWith('m7/so1/') ||
      f.startsWith('m7/so2/') ||
      f.startsWith('m7/runtime/'),
  );
}

/** Text of every string / template literal part in `code` (comments are never seen). */
function literalTexts(code: string): string[] {
  const out: string[] = [];
  const visit = (n: ts.Node): void => {
    if (
      ts.isStringLiteral(n) ||
      ts.isNoSubstitutionTemplateLiteral(n) ||
      ts.isTemplateHead(n) ||
      ts.isTemplateMiddle(n) ||
      ts.isTemplateTail(n)
    ) {
      out.push(n.text);
    }
    ts.forEachChild(n, visit);
  };
  visit(parse(code));
  return out;
}

/** `m7.<x>_<name>` database-function names named in string/template literal text. */
function m7FunctionMentions(code: string): string[] {
  const out = new Set<string>();
  for (const text of literalTexts(code)) {
    for (const m of text.matchAll(/\bm7\.([a-z]_[a-z0-9_]+)/g)) out.add(m[1]!);
  }
  return [...out].sort();
}

/** Every identifier in `code` (comments never seen). */
function identifiersIn(code: string): Set<string> {
  const out = new Set<string>();
  const visit = (n: ts.Node): void => {
    if (ts.isIdentifier(n)) out.add(n.text);
    ts.forEachChild(n, visit);
  };
  visit(parse(code));
  return out;
}

interface DefinitionCallFacts {
  readonly callee: string;
  readonly policy: string | null;
  readonly keys: readonly string[];
}

/** Every call of a sealed definition function in `code`, with its literal `policy` (if any). */
function definitionCallFacts(code: string): DefinitionCallFacts[] {
  const out: DefinitionCallFacts[] = [];
  const visit = (n: ts.Node): void => {
    if (
      ts.isCallExpression(n) &&
      ts.isIdentifier(n.expression) &&
      SEALED_DEFINITION_FUNCTIONS.includes(n.expression.text)
    ) {
      const arg = n.arguments[0];
      let policy: string | null = null;
      const keys: string[] = [];
      if (arg !== undefined && ts.isObjectLiteralExpression(arg)) {
        for (const p of arg.properties) {
          const name = p.name !== undefined && ts.isIdentifier(p.name) ? p.name.text : '<computed>';
          keys.push(ts.isSpreadAssignment(p) ? '<spread>' : name);
          if (
            ts.isPropertyAssignment(p) &&
            name === 'policy' &&
            ts.isStringLiteral(p.initializer)
          ) {
            policy = p.initializer.text;
          }
        }
      }
      out.push({ callee: n.expression.text, policy, keys });
    }
    ts.forEachChild(n, visit);
  };
  visit(parse(code));
  return out;
}

/** The string literal a module-scope `const <name> ... = '<literal>'` is initialized with. */
function constStringInitializer(code: string, name: string): string | null {
  for (const st of parse(code).statements) {
    if (!ts.isVariableStatement(st)) continue;
    for (const d of st.declarationList.declarations) {
      if (!ts.isIdentifier(d.name) || d.name.text !== name || d.initializer === undefined) continue;
      let e: ts.Expression = d.initializer;
      while (ts.isAsExpression(e) || ts.isParenthesizedExpression(e)) e = e.expression;
      return ts.isStringLiteral(e) ? e.text : null;
    }
  }
  return null;
}

export interface M7So2TopologyReport {
  readonly violations: readonly string[];
  readonly so2InputKeys: readonly string[] | null;
  readonly dbFunctionMentions: Readonly<Record<string, readonly string[]>>;
  readonly leafPolicies: Readonly<Record<string, string | null>>;
}

/**
 * Every M7 SO-2 productive-topology rule (S1–S13). `violations` is empty when the tree is
 * compliant; the other fields are the observed censuses, recorded as audit evidence.
 */
export function analyzeM7So2Topology(provider: SourceProvider): M7So2TopologyReport {
  const all = provider.list();
  const productive = all.filter(isProductive);
  const v: string[] = [];
  const read = (rel: string): string => provider.read(rel) ?? '';
  const edgesOf = (rel: string): { edge: ImportEdge; target: Resolved }[] =>
    memoEdges(read(rel)).map((edge) => ({
      edge,
      target: resolveSpecifier(edge.specifier, rel, provider),
    }));
  const localTargetsOf = (rel: string): string[] =>
    edgesOf(rel).flatMap((e) => (e.target.type === 'local' ? [e.target.rel] : []));

  const SO1_FAMILY = [
    M7_SO1_MODULES.leaf,
    M7_SO1_MODULES.executor,
    M7_SO1_MODULES.adapterInterface,
    M7_SO1_MODULES.adapter,
    M7_SO1_MODULES.inputGrammar,
    'm7/so1/m7-participant-operation-context.ts',
  ];
  const SO2_FAMILY = [
    M7_SO2_MODULES.leaf,
    M7_SO2_MODULES.executor,
    M7_SO2_MODULES.adapterInterface,
    M7_SO2_MODULES.adapter,
    M7_SO2_MODULES.inputGrammar,
    M7_SO2_MODULES.operationContext,
  ];

  // ── S1 — the SO-2 family exists at its exact paths, with the right roles ────────────────────────
  for (const [label, rel, role] of [
    ['LEAF', M7_SO2_MODULES.leaf, 'LEAF'],
    ['EXECUTOR', M7_SO2_MODULES.executor, 'EXECUTOR'],
    ['ADAPTER_INTERFACE', M7_SO2_MODULES.adapterInterface, 'ADAPTER_INTERFACE'],
    ['ADAPTER_IMPL', M7_SO2_MODULES.adapter, 'ADAPTER_IMPL'],
    ['INPUT_GRAMMAR', M7_SO2_MODULES.inputGrammar, 'OTHER'],
    ['OPERATION_CONTEXT', M7_SO2_MODULES.operationContext, 'OTHER'],
  ] as const) {
    if (provider.read(rel) === null) v.push(`M7_SO2_MISSING_${label}:${rel}`);
    else if (roleOf(rel) !== role) v.push(`M7_SO2_ROLE:${rel}:${roleOf(rel)}`);
  }

  // ── S2 — the SO-2 leaf binds EXACTLY {M7 engine, own executor, own adapter, own grammar} ───────
  const leafTargets = new Set(localTargetsOf(M7_SO2_MODULES.leaf));
  const expectedLeafTargets = new Set([
    M7_PARTICIPANT_CCA_ENGINE_MODULE,
    M7_SO2_MODULES.executor,
    M7_SO2_MODULES.adapter,
    M7_SO2_MODULES.inputGrammar,
  ]);
  for (const t of expectedLeafTargets) {
    if (!leafTargets.has(t)) v.push(`M7_SO2_LEAF_NOT_BOUND:${t}`);
  }
  for (const t of leafTargets) {
    if (!expectedLeafTargets.has(t)) v.push(`M7_SO2_LEAF_EXTRA_EDGE:${t}`);
  }
  // The literal, composition-time policy of each leaf, and the definition function it calls.
  const leafPolicies: Record<string, string | null> = {};
  for (const [leaf, callee, policy] of [
    [M7_SO1_MODULES.leaf, 'defineSealedOutcomeAssertionOperation', 'GENERAL_COLLECTION'],
    [M7_SO2_MODULES.leaf, 'defineSealedEvidenceUploadOperation', 'OPTIONAL_EVIDENCE'],
  ] as const) {
    const calls = definitionCallFacts(read(leaf));
    leafPolicies[leaf] = calls[0]?.policy ?? null;
    if (calls.length !== 1) v.push(`M7_LEAF_DEFINITION_CALLS:${leaf}:${calls.length}`);
    for (const c of calls) {
      if (c.callee !== callee) v.push(`M7_LEAF_WRONG_DEFINITION_FUNCTION:${leaf}:${c.callee}`);
      if (c.policy !== policy) v.push(`M7_LEAF_POLICY:${leaf}:${String(c.policy)}`);
      const expectedKeys = [
        'adapter',
        'executor',
        'lockOrder',
        'operationId',
        'parseInput',
        'policy',
      ];
      if (JSON.stringify([...c.keys].sort()) !== JSON.stringify(expectedKeys)) {
        v.push(`M7_LEAF_DEFINITION_KEYS:${leaf}:[${c.keys.join(',')}]`);
      }
    }
  }

  // ── S3 — the SO-2 executor: type-only closure, sole DB edge = its own adapter interface ────────
  const exec = analyzeExecutorClosure(M7_SO2_MODULES.executor, provider);
  for (const x of exec.violations) v.push(`M7_SO2_EXECUTOR:${x}`);
  const ifaces = new Set(
    exec.entries
      .filter((e) => e.class === 'APPROVED_TRACKED_ADAPTER_INTERFACE')
      .map((e) => e.module),
  );
  if (ifaces.size !== 1 || !ifaces.has(M7_SO2_MODULES.adapterInterface)) {
    v.push(`M7_SO2_EXECUTOR_INTERFACES:[${[...ifaces].join(',')}]`);
  }
  for (const e of exec.entries) {
    if (e.class === 'APPROVED_TRACKED_ADAPTER_INTERFACE') continue;
    if (!e.typeOnly) v.push(`M7_SO2_EXECUTOR_VALUE_EDGE:${e.module}`);
  }
  // It forwards EXACTLY the two RQ fields to the one modeled method.
  const execCode = read(M7_SO2_MODULES.executor);
  const forwarded: string[][] = [];
  const methodCalls: string[] = [];
  const visitExec = (n: ts.Node): void => {
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) {
      methodCalls.push(n.expression.name.text);
      const a = n.arguments[0];
      if (a !== undefined && ts.isObjectLiteralExpression(a)) {
        forwarded.push(
          a.properties.map((p) =>
            p.name !== undefined && ts.isIdentifier(p.name) ? p.name.text : '<computed>',
          ),
        );
      }
    }
    ts.forEachChild(n, visitExec);
  };
  visitExec(parse(execCode));
  if (JSON.stringify(methodCalls) !== JSON.stringify(['executeEvidenceUploadAuthorization'])) {
    v.push(`M7_SO2_EXECUTOR_CALLS:[${methodCalls.join(',')}]`);
  }
  if (
    forwarded.length !== 1 ||
    JSON.stringify([...forwarded[0]!].sort()) !==
      JSON.stringify([...M7_SO2_EXPECTED_INPUT_KEYS].sort())
  ) {
    v.push(`M7_SO2_EXECUTOR_FORWARDS:${JSON.stringify(forwarded)}`);
  }

  // ── S4 — the SO-2 adapter: hidden tx only, ONE exact p_begin_evidence_upload_v1 statement ─────
  const adapterReport = analyzeAdapterClosure(M7_SO2_MODULES.adapter, provider);
  for (const x of adapterReport.violations) v.push(`M7_SO2_ADAPTER:${x}`);
  const adapterCode = read(M7_SO2_MODULES.adapter);
  const tagged: { tag: string; sql: string; args: number }[] = [];
  const visitAdapter = (n: ts.Node): void => {
    if (ts.isTaggedTemplateExpression(n)) {
      const t = n.template;
      const sql = ts.isNoSubstitutionTemplateLiteral(t)
        ? t.text
        : [t.head.text, ...t.templateSpans.map((s) => s.literal.text)].join('?');
      const args = ts.isNoSubstitutionTemplateLiteral(t) ? 0 : t.templateSpans.length;
      tagged.push({ tag: n.tag.getText(adapterSf), sql, args });
    }
    ts.forEachChild(n, visitAdapter);
  };
  const adapterSf = parse(adapterCode);
  visitAdapter(adapterSf);
  if (tagged.length !== 1) v.push(`M7_SO2_ADAPTER_STATEMENT_COUNT:${tagged.length}`);
  for (const s of tagged) {
    if (s.tag !== 'context.tx.$queryRaw') v.push(`M7_SO2_ADAPTER_STATEMENT_TAG:${s.tag}`);
    if (!/^\s*SELECT \* FROM m7\.p_begin_evidence_upload_v1\(/.test(s.sql)) {
      v.push('M7_SO2_ADAPTER_STATEMENT_NOT_EXACT_FUNCTION');
    }
    if (s.args !== 7) v.push(`M7_SO2_ADAPTER_ARGUMENT_COUNT:${s.args}`);
  }
  const adapterIds = identifiersIn(adapterCode);
  for (const forbidden of [
    '$executeRaw',
    '$transaction',
    '$queryRawUnsafe',
    '$executeRawUnsafe',
    'PrismaClient',
    'prisma',
  ]) {
    if (adapterIds.has(forbidden)) v.push(`M7_SO2_ADAPTER_FORBIDDEN_IDENTIFIER:${forbidden}`);
  }
  // The interface models exactly ONE method.
  const ifaceMethods: string[] = [];
  for (const st of parse(read(M7_SO2_MODULES.adapterInterface)).statements) {
    if (ts.isInterfaceDeclaration(st) && st.name.text === 'M7EvidenceUploadAdapter') {
      for (const m of st.members) {
        ifaceMethods.push(m.name !== undefined && ts.isIdentifier(m.name) ? m.name.text : '?');
      }
    }
  }
  if (JSON.stringify(ifaceMethods) !== JSON.stringify(['executeEvidenceUploadAuthorization'])) {
    v.push(`M7_SO2_ADAPTER_INTERFACE_METHODS:[${ifaceMethods.join(',')}]`);
  }

  // ── S5 — the §9.3 SO-2 caller key set is exactly the accepted one ─────────────────────────────
  const grammar = provider.read(M7_SO2_MODULES.inputGrammar);
  const so2InputKeys = grammar === null ? null : exportedStringArray(grammar, 'SO2_INPUT_KEYS');
  if (so2InputKeys === null) {
    v.push('M7_SO2_INPUT_KEYS_UNREADABLE');
  } else {
    if (
      JSON.stringify([...so2InputKeys].sort()) !==
      JSON.stringify([...M7_SO2_EXPECTED_INPUT_KEYS].sort())
    ) {
      v.push(`M7_SO2_INPUT_KEY_SET:[${so2InputKeys.join(',')}]`);
    }
    for (const forbidden of M7_SO2_FORBIDDEN_INPUT_KEYS) {
      if (so2InputKeys.includes(forbidden)) v.push(`M7_SO2_FORBIDDEN_INPUT_KEY:${forbidden}`);
    }
  }

  // ── S6 — cross-purpose isolation: no SO1<->SO2 edge of ANY kind; engine edges are type-only ────
  for (const f of SO1_FAMILY) {
    for (const t of localTargetsOf(f)) {
      if (t.startsWith('m7/so2/')) v.push(`M7_CROSS_FAMILY_EDGE:${f} -> ${t}`);
    }
  }
  for (const f of SO2_FAMILY) {
    for (const t of localTargetsOf(f)) {
      if (t.startsWith('m7/so1/')) v.push(`M7_CROSS_FAMILY_EDGE:${f} -> ${t}`);
    }
  }
  for (const { edge, target } of edgesOf(M7_PARTICIPANT_CCA_ENGINE_MODULE)) {
    if (target.type !== 'local') continue;
    if ((target.rel.startsWith('m7/so1/') || target.rel.startsWith('m7/so2/')) && !edge.typeOnly) {
      v.push(`M7_ENGINE_FAMILY_VALUE_EDGE:${target.rel}`);
    }
  }
  // Transitive VALUE closure from each leaf, never traversing the engine, stays in its family.
  for (const [leaf, other] of [
    [M7_SO1_MODULES.leaf, 'm7/so2/'],
    [M7_SO2_MODULES.leaf, 'm7/so1/'],
  ] as const) {
    const seen = new Set<string>([leaf]);
    const stack: string[] = [leaf];
    while (stack.length > 0) {
      const cur = stack.pop()!;
      for (const { edge, target } of edgesOf(cur)) {
        if (edge.typeOnly || target.type !== 'local') continue;
        if (target.rel === M7_PARTICIPANT_CCA_ENGINE_MODULE || seen.has(target.rel)) continue;
        if (target.rel.startsWith(other)) v.push(`M7_CROSS_FAMILY_REACH:${leaf} -> ${target.rel}`);
        seen.add(target.rel);
        stack.push(target.rel);
      }
    }
  }

  // ── S7 — every m7.* function the M7 runtime names is allowlisted and named only by its owner ───
  const runtime = m7RuntimeFiles(productive);
  const dbFunctionMentions: Record<string, string[]> = {};
  for (const f of runtime) {
    for (const fn of m7FunctionMentions(read(f))) {
      (dbFunctionMentions[fn] ??= []).push(f);
      const owners = M7_DB_FUNCTION_OWNERS[fn];
      if (owners === undefined) v.push(`M7_DB_FUNCTION_NOT_ALLOWLISTED:${fn}:${f}`);
      else if (!owners.includes(f)) v.push(`M7_DB_FUNCTION_WRONG_OWNER:${fn}:${f}`);
    }
  }

  // ── S8 — no later-slice function, no provider SDK, no tooling edge in productive runtime ───────
  const outsideTooling = productive.filter(
    (f) => !M7_VERIFICATION_TOOLING_PREFIXES.some((p) => f.startsWith(p)),
  );
  for (const f of outsideTooling) {
    const text = literalTexts(read(f)).join('\n');
    for (const re of M7_LATER_SLICE_DB_FUNCTIONS) {
      if (re.test(text)) v.push(`M7_LATER_SLICE_FUNCTION:${re.source}:${f}`);
    }
    for (const { target } of edgesOf(f)) {
      if (target.type === 'external' && PROVIDER_SDK_PACKAGE.test(target.name)) {
        // PPC-1: the ONE sanctioned importer is the capability signer, and only for the reviewed
        // allowlist; the signer rules X3 / X12 / X16 / X17 pin that module instead.
        if (
          f === M7_CAPABILITY_SIGNER_MODULE &&
          M7_PROVIDER_SIGNING_PACKAGES.includes(target.name)
        ) {
          continue;
        }
        v.push(`M7_PROVIDER_SDK_IMPORT:${target.name}:${f}`);
      }
    }
  }
  for (const f of runtime) {
    for (const t of localTargetsOf(f)) {
      if (M7_VERIFICATION_TOOLING_PREFIXES.some((p) => t.startsWith(p))) {
        v.push(`M7_RUNTIME_IMPORTS_VERIFICATION_TOOLING:${f} -> ${t}`);
      }
    }
    // PPC-1: the capability signer is the ONE module that presigns (X12 / X16 / X17 pin it).
    if (f === M7_CAPABILITY_SIGNER_MODULE) continue;
    for (const id of identifiersIn(read(f))) {
      if (/presign|signedurl|signurl/i.test(id)) v.push(`M7_SIGNED_URL_IDENTIFIER:${id}:${f}`);
    }
  }

  // ── S9 — ONE AGR implementation; no M7 runtime file reads optional-evidence consent itself ─────
  for (const f of productive) {
    if (f !== 'cca/consent-evaluation.ts' && identifiersIn(read(f)).has('applyAgr')) {
      v.push(`M7_SECOND_AGR_REFERENCE:${f}`);
    }
  }
  for (const f of runtime) {
    const code = read(f);
    if (
      identifiersIn(code).has('optionalEvidenceConsent') ||
      /optionalEvidenceConsent/.test(literalTexts(code).join('\n'))
    ) {
      v.push(`M7_RUNTIME_READS_OPTIONAL_EVIDENCE_CONSENT:${f}`);
    }
  }

  // ── S10 — the engine's sealed policies are fixed constants, and each factory enforces its own ──
  const engineCode = provider.read(M7_PARTICIPANT_CCA_ENGINE_MODULE);
  if (engineCode === null) {
    v.push('M7_SO2_ENGINE_MISSING');
  } else {
    if (constStringInitializer(engineCode, 'SO1_POLICY') !== 'GENERAL_COLLECTION') {
      v.push('M7_ENGINE_SO1_POLICY_CONSTANT');
    }
    if (constStringInitializer(engineCode, 'SO2_POLICY') !== 'OPTIONAL_EVIDENCE') {
      v.push('M7_ENGINE_SO2_POLICY_CONSTANT');
    }
    const sf = parse(engineCode);
    for (const [fn, constant] of [
      ['defineSealedOutcomeAssertionOperation', 'SO1_POLICY'],
      ['defineSealedEvidenceUploadOperation', 'SO2_POLICY'],
    ] as const) {
      let guarded = false;
      const visit = (n: ts.Node, inside: boolean): void => {
        const here = inside || (ts.isFunctionDeclaration(n) && n.name?.text === fn);
        if (
          here &&
          ts.isIfStatement(n) &&
          ts.isBinaryExpression(n.expression) &&
          n.expression.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken &&
          n.expression.left.getText(sf) === 'policy' &&
          n.expression.right.getText(sf) === constant
        ) {
          guarded = true;
        }
        ts.forEachChild(n, (c) => visit(c, here));
      };
      visit(sf, false);
      if (!guarded) v.push(`M7_ENGINE_POLICY_NOT_ENFORCED:${fn}`);
    }
    // ── S11 — the SO-2 CCA entry order (AUD-M7-SO1-01 inherited) and NO pre-CCA replay ──────────
    for (const x of analyzeM7So2EntryGuardOrder(engineCode)) v.push(x);
  }

  return { violations: v, so2InputKeys, dbFunctionMentions, leafPolicies };
}

// ---------------------------------------------------------------------------------------------------
// S11 — CCA ENTRY-GUARD ORDER and NO-REPLAY for the SO-2 implementation
//
// The SO-2 implementation is the `sealOperation(...)` implementation inside
// `defineSealedEvidenceUploadOperation`. It must satisfy the SAME order rule as SO-1 (preflight first,
// unconditional, before any database-reaching step), and additionally — because SO-2 has NO pre-CCA
// replay (§9.5.2) — it must perform NO database-reaching step at all outside the CCA transaction
// except the digest read, the session-capability read and naming the participant client as the
// transaction's first argument. Inside the transaction the order is fixed:
//   resolveAssignmentReference → lock/prove statement → clock (ONCE) → mintLockedCollectionScope →
//   readConsentAuthorizationFacts → evaluateCollectionConsent(policy, …) → constructTrackedAdapter →
//   executeUnderZeroInFlightGate
// ---------------------------------------------------------------------------------------------------

/** Pre-transaction steps the SO-2 implementation may take (after the guard). */
const SO2_PRE_TX_ALLOWED: readonly string[] = [
  'expectedControlPlaneManifestDigest',
  'readM7ParticipantSessionSecret',
  'participant',
  'runCcaTransaction',
];

/** The fixed in-transaction order of the SO-2 implementation. */
export const M7_SO2_IN_TRANSACTION_ORDER: readonly string[] = [
  'resolveAssignmentReference',
  'tagged:tx.$executeRaw',
  'new:Date',
  'mintLockedCollectionScope',
  'readConsentAuthorizationFacts',
  'evaluateCollectionConsent',
  'constructTrackedAdapter',
  'executeUnderZeroInFlightGate',
];

export function analyzeM7So2EntryGuardOrder(code: string): string[] {
  const v: string[] = [];
  const sf = parse(code);
  const impl = sealedImplementationIn(sf, 'defineSealedEvidenceUploadOperation');
  if (impl === undefined || impl.body === undefined || !ts.isBlock(impl.body)) {
    return ['M7_SO2_ENTRY_GUARD_IMPL_NOT_FOUND'];
  }
  const body = impl.body;

  const sites: SiteRecord[] = [];
  const collect = (n: ts.Node): void => {
    if (ts.isCallExpression(n)) {
      sites.push({ name: calleeName(n.expression), pos: n.getStart(sf), end: n.getEnd(), node: n });
    } else if (ts.isNewExpression(n)) {
      sites.push({
        name: `new:${calleeName(n.expression)}`,
        pos: n.getStart(sf),
        end: n.getEnd(),
        node: n,
      });
    } else if (ts.isTaggedTemplateExpression(n)) {
      sites.push({
        name: `tagged:${calleeName(n.tag)}`,
        pos: n.getStart(sf),
        end: n.getEnd(),
        node: n,
      });
    } else if (
      ts.isPropertyAccessExpression(n) &&
      ts.isIdentifier(n.expression) &&
      n.expression.text === 'prisma'
    ) {
      sites.push({ name: `prisma.${n.name.text}`, pos: n.getStart(sf), end: n.getEnd(), node: n });
    }
    ts.forEachChild(n, collect);
  };
  collect(body);

  // — the preflight: present exactly once, unconditional, first —
  const guards = sites.filter((s) => s.name === M7_ENTRY_GUARD);
  if (guards.length === 0) return ['M7_SO2_ENTRY_GUARD_MISSING'];
  if (guards.length > 1) v.push(`M7_SO2_ENTRY_GUARD_CALLED_${guards.length}_TIMES`);
  const guard = guards[0]!;
  const stmt = guard.node.parent;
  if (!(stmt !== undefined && ts.isExpressionStatement(stmt) && stmt.parent === body)) {
    v.push('M7_SO2_ENTRY_GUARD_NOT_UNCONDITIONAL_TOP_LEVEL');
  }
  const dbReaching = (s: SiteRecord): boolean =>
    M7_POST_GUARD_CALLS.includes(s.name) ||
    s.name.startsWith('prisma.') ||
    s.name.startsWith('tagged:') ||
    /lookup|replay|receipt/i.test(s.name) ||
    /\.\$(queryRaw|executeRaw|queryRawUnsafe|executeRawUnsafe|transaction)$/.test(s.name);
  for (const s of sites) {
    if (s.name !== M7_ENTRY_GUARD && dbReaching(s) && s.pos < guard.pos) {
      v.push(`M7_SO2_DB_WORK_BEFORE_ENTRY_GUARD:${s.name}`);
    }
  }
  const early = (n: ts.Node): void => {
    if (ts.isReturnStatement(n) && n.getStart(sf) < guard.pos) {
      v.push('M7_SO2_RETURN_BEFORE_ENTRY_GUARD');
    }
    if (ts.isFunctionLike(n) && n !== impl) return;
    ts.forEachChild(n, early);
  };
  early(body);

  // — exactly one CCA transaction; NOTHING database-reaching outside it (no pre-CCA replay) —
  const txCalls = sites.filter((s) => s.name === 'runCcaTransaction');
  if (txCalls.length !== 1) v.push(`M7_SO2_CCA_TRANSACTION_CALL_COUNT:${txCalls.length}`);
  const tx = txCalls[0];
  const insideTx = (s: SiteRecord): boolean =>
    tx !== undefined && s !== tx && s.pos > tx.pos && s.end <= tx.end;
  for (const s of sites) {
    if (/lookup|replay|receipt/i.test(s.name)) v.push(`M7_SO2_REPLAY_STEP_PRESENT:${s.name}`);
    if (!dbReaching(s) || insideTx(s) || s.name === M7_ENTRY_GUARD) continue;
    if (!SO2_PRE_TX_ALLOWED.includes(s.name))
      v.push(`M7_SO2_DB_WORK_OUTSIDE_CCA_TRANSACTION:${s.name}`);
  }
  const clients = sites.filter((s) => s.name === 'participant');
  if (clients.length !== 1) v.push(`M7_SO2_PARTICIPANT_CLIENT_USES:${clients.length}`);
  if (tx !== undefined && ts.isCallExpression(tx.node)) {
    const first = tx.node.arguments[0];
    if (!(first !== undefined && clients[0] !== undefined && first === clients[0].node)) {
      v.push('M7_SO2_PARTICIPANT_CLIENT_NOT_TRANSACTION_ARGUMENT');
    }
  }

  // — the fixed in-transaction order, each step exactly once and inside the transaction —
  let last = -1;
  for (const step of M7_SO2_IN_TRANSACTION_ORDER) {
    const hits = sites.filter((s) => s.name === step);
    if (hits.length !== 1) {
      v.push(`M7_SO2_STEP_COUNT:${step}:${hits.length}`);
      continue;
    }
    const h = hits[0]!;
    if (!insideTx(h)) v.push(`M7_SO2_STEP_OUTSIDE_CCA_TRANSACTION:${step}`);
    if (h.pos < last) v.push(`M7_SO2_STEP_ORDER:${step}`);
    last = h.pos;
  }
  // The lock/prove statement is the accepted function, bound to the DERIVED assignment.
  for (const s of sites.filter((x) => x.name === 'tagged:tx.$executeRaw')) {
    const text = s.node.getText(sf);
    if (!/m7\.p_lock_and_prove_assignment_v1\(/.test(text)) {
      v.push('M7_SO2_LOCK_STATEMENT_NOT_ACCEPTED_FUNCTION');
    }
  }
  // Consent is evaluated for the definition's (validated) policy — never a literal, never input.
  for (const s of sites.filter((x) => x.name === 'evaluateCollectionConsent')) {
    const first = ts.isCallExpression(s.node) ? s.node.arguments[0] : undefined;
    if (first === undefined || !ts.isIdentifier(first) || first.text !== 'policy') {
      v.push('M7_SO2_CONSENT_POLICY_ARGUMENT');
    }
  }
  return v;
}

// ---------------------------------------------------------------------------------------------------
// M7 CAPABILITY SIGNER — TO-8 DB FOUNDATION + PPC-1 (M7 V1.1 §11.7.3, §16.2.3, §18.3, §18.6; XC-5,
// XC-6, XC-7, XF-12, XF-13, XF-16, XF-17; signer AUTH §21; PPC-1 review amendments)
//
// ADDITIVE, like the SO-1 / SO-2 blocks: every accepted CCA rule and every SO-1 / SO-2 rule still runs
// over the same tree. Rules X1–X14 pin the signer module; `analyzeTo8ExecutionContext` pins the TO-8
// owner kind inside the one DatabaseExecutionContext. PPC-1 re-points X1 to the new single export,
// widens X3 / X9 / X12 to the reviewed provider-signing allowlist (the SO-2 S8 rule exempts exactly the
// signer module for exactly that allowlist), and ADDS X15 (one provider-credential reader; no computed
// or enumerated process.env bypass), X16 (no network / logger / dynamic code in the signer), X17
// (commit-before-sign shape; the library is reachable only from the private signing step), X18 (no
// alternate hand-rolled signer), X19 (package manifest) and — PPC-1 R2 — X20 (the SIGNED conditional
// create `If-None-Match: *`, AUD-M7-PPC1-01). These are the STATIC (dependency-topology)
// half of T-171b / IMP-05 / IMP-18 only; process separation (IMP-20), the deployed dependency graph
// and provider-secret isolation are deployment facts no source analysis can prove.
// ---------------------------------------------------------------------------------------------------

/** The pure signer contract (envelope type + typed refusal). */
export const M7_CAPABILITY_SIGNER_CONTRACT_MODULE = 'm7/runtime/capability-signer-contract.ts';

/** The ONE exported signer operation and its ONE parameter (XF-12, XC-6). PPC-1: the exported
 *  operation returns the physical capability; the accepted TO-8 mint is its module-private step. */
export const M7_CAPABILITY_SIGNER_OPERATION = 'issueGenerationWriteCapability';
export const M7_CAPABILITY_SIGNER_PARAMETER = 'generationGrantId';
/** The accepted TO-8 step (module-private since PPC-1) and the PPC-1 signing step (module-private). */
export const M7_CAPABILITY_SIGNER_MINT_STEP = 'mintCommittedGenerationEnvelope';
export const M7_CAPABILITY_SIGNER_SIGN_STEP = 'signCommittedEnvelope';
/** The registry parser: the ONLY reader of the provider-credential environment key. */
export const M7_CAPABILITY_SIGNER_CREDENTIAL_LOADER = 'providerCredentials';

/** PPC-1 (D-3): the ONE provider-credential environment source (§18.3; XC-7). */
export const M7_PROVIDER_CREDENTIALS_ENV = 'M7_CAPABILITY_SIGNER_PROVIDER_CREDENTIALS';

/**
 * PPC-1 (D-1): the EXACT reviewed provider-signing package allowlist. Only the capability signer may
 * import these, and it may import no other provider package. Both are exact-pinned in package.json.
 */
export const M7_PROVIDER_SIGNING_PACKAGES: readonly string[] = [
  '@aws-sdk/s3-request-presigner',
  '@smithy/hash-node',
];

/**
 * The accepted productive modules that hold the WHOLE `process.env` object as a value (a default
 * parameter, a spread) — re-enumerated mechanically on this baseline. Any other holder, or another
 * occurrence in these, is an env-census bypass (X15). None mentions a provider-credential key.
 */
export const M7_PROCESS_ENV_OBJECT_HOLDERS: Readonly<Record<string, number>> = {
  'lib/env.ts': 2,
  'm7/s03/environment.ts': 1,
  'm7/testkit/context.ts': 1,
  'persistence/build-meta.ts': 1,
};

/** Marker literals of an AWS Signature V4 implementation (X18: no alternate hand-rolled signer). */
export const SIGV4_MARKERS = /AWS4-HMAC-SHA256|aws4_request|X-Amz-Signature|X-Amz-Credential/;

/** The EXACT local modules the signer may reach (type or value). Nothing else. */
export const M7_CAPABILITY_SIGNER_LOCAL_IMPORTS: readonly string[] = [
  'cca/execution-context.ts',
  M7_CAPABILITY_SIGNER_CONTRACT_MODULE,
  'm7/runtime/control-plane-digest.ts',
  'm7/runtime/m7-errors.ts',
];

/** The EXACT external packages the signer may import: Prisma and the reviewed signing allowlist. */
export const M7_CAPABILITY_SIGNER_EXTERNAL_IMPORTS: readonly string[] = [
  '@prisma/client',
  ...M7_PROVIDER_SIGNING_PACKAGES,
];

/** Signer AUTH §5: names that may never be a signer parameter (and none may be an extra export). */
export const M7_CAPABILITY_SIGNER_FORBIDDEN_PARAMETERS: readonly string[] = [
  'canonicalObjectKey',
  'objectKey',
  'key',
  'prefix',
  'backendSha256',
  'backend',
  'validUntil',
  'ttl',
  'TTL',
  'interval',
  'expiry',
  'grantExpiresAt',
  'operation',
  'capabilityOperation',
  'capabilityMode',
  'envelopeEnforcement',
  'storageProfileId',
  'signingProfileId',
  'credentialProfileId',
  'providerCredential',
  'credential',
  'transaction',
  'tx',
  'callback',
  'sql',
  'repository',
  'workerId',
  'options',
  'manifestSha256',
];

/** The productive PrismaClient construction points — exactly these, each exactly once. */
export const M7_PRISMA_CLIENT_CONSTRUCTION_POINTS: readonly string[] = [
  'db/client.ts',
  M7_PARTICIPANT_CCA_ENGINE_MODULE,
  M7_SESSION_MODULE,
  M7_CAPABILITY_SIGNER_MODULE,
];

/** The TO-8 owner kind literal and the accepted owner kinds, exactly. */
export const TO8_OWNER_KIND = 'M7_CAPABILITY_SIGNER';
export const TRANSACTION_AUTHORITIES: readonly string[] = [
  'NONE',
  'ACCEPTED_OWNER',
  'CCA',
  TO8_OWNER_KIND,
];

export interface M7CapabilitySignerTopologyReport {
  readonly violations: readonly string[];
  readonly signerExports: readonly string[];
  readonly signerParameters: readonly string[];
  readonly signerLocalImports: readonly string[];
  readonly signerExternalImports: readonly string[];
  readonly signerStatements: readonly string[];
  readonly signerDbFunctions: readonly string[];
  readonly signerImporters: readonly string[];
  readonly contractImporters: readonly string[];
  readonly prismaClientConstructionPoints: Readonly<Record<string, number>>;
  readonly signerDatabaseUrlReaders: readonly string[];
  readonly executionContext: readonly string[];
  /** PPC-1 censuses. */
  readonly providerSigningImporters: Readonly<Record<string, readonly string[]>>;
  readonly providerCredentialReaders: readonly string[];
  readonly processEnvObjectHolders: Readonly<Record<string, number>>;
  readonly signerSdkBindings: readonly string[];
}

function newPrismaClientCount(code: string): number {
  let n = 0;
  const visit = (x: ts.Node): void => {
    if (
      ts.isNewExpression(x) &&
      ts.isIdentifier(x.expression) &&
      x.expression.text === 'PrismaClient'
    )
      n++;
    ts.forEachChild(x, visit);
  };
  visit(parse(code));
  return n;
}

function unwrap(e: ts.Expression): ts.Expression {
  let x = e;
  while (
    ts.isParenthesizedExpression(x) ||
    ts.isAsExpression(x) ||
    ts.isNonNullExpression(x) ||
    ts.isSatisfiesExpression(x) ||
    ts.isTypeAssertionExpression(x)
  ) {
    x = x.expression;
  }
  return x;
}

function exportedFunction(sf: ts.SourceFile, name: string): ts.FunctionDeclaration | undefined {
  for (const st of sf.statements) {
    if (!ts.isFunctionDeclaration(st) || st.name?.text !== name) continue;
    const mods = ts.getModifiers(st);
    if (mods?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) === true) return st;
  }
  return undefined;
}

function privateFunction(sf: ts.SourceFile, name: string): ts.FunctionDeclaration | undefined {
  for (const st of sf.statements) {
    if (!ts.isFunctionDeclaration(st) || st.name?.text !== name) continue;
    const mods = ts.getModifiers(st);
    if (mods?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) !== true) return st;
  }
  return undefined;
}

/** Identifier nodes named `name` that are REFERENCES (not property names / declarations' keys). */
function referencesTo(root: ts.Node, sf: ts.SourceFile, name: string): ts.Identifier[] {
  const out: ts.Identifier[] = [];
  const visit = (n: ts.Node): void => {
    if (ts.isIdentifier(n) && n.text === name) {
      const p = n.parent;
      const isName =
        (p !== undefined && ts.isPropertyAccessExpression(p) && p.name === n) ||
        (p !== undefined && ts.isPropertyAssignment(p) && p.name === n) ||
        (p !== undefined && ts.isImportSpecifier(p)) ||
        (p !== undefined && ts.isFunctionDeclaration(p) && p.name === n);
      if (!isName) out.push(n);
    }
    ts.forEachChild(n, visit);
  };
  visit(root);
  void sf;
  return out;
}

const inside = (n: ts.Node, container: ts.Node | undefined): boolean =>
  container !== undefined && n.pos >= container.pos && n.end <= container.end;

function callsNamed(root: ts.Node, name: string): ts.CallExpression[] {
  const out: ts.CallExpression[] = [];
  const visit = (n: ts.Node): void => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === name) {
      out.push(n);
    }
    ts.forEachChild(n, visit);
  };
  visit(root);
  return out;
}

/**
 * Every M7 capability-signer rule (X1–X18, X20) plus the TO-8 execution-context rules. `violations` is
 * empty when the tree is compliant; the other fields are the observed censuses (audit evidence).
 */
export function analyzeM7CapabilitySignerTopology(
  provider: SourceProvider,
): M7CapabilitySignerTopologyReport {
  const productive = provider.list().filter(isProductive);
  const v: string[] = [];
  const read = (rel: string): string => provider.read(rel) ?? '';
  const edgesOf = (rel: string): { edge: ImportEdge; target: Resolved }[] =>
    memoEdges(read(rel)).map((edge) => ({
      edge,
      target: resolveSpecifier(edge.specifier, rel, provider),
    }));

  const code = provider.read(M7_CAPABILITY_SIGNER_MODULE);
  let signerExports: string[] = [];
  let signerParameters: string[] = [];
  const signerLocalImports = new Set<string>();
  const signerExternalImports = new Set<string>();
  const signerStatements: string[] = [];
  let signerDbFunctions: string[] = [];
  const signerSdkBindings: string[] = [];

  if (code === null) {
    v.push(`X1_SIGNER_MISSING:${M7_CAPABILITY_SIGNER_MODULE}`);
  } else {
    const sf = parse(code);

    // ── X1 — exactly ONE exported productive function, exactly ONE argument: generationGrantId ────
    signerExports = exportedValueNames(code);
    if (JSON.stringify(signerExports) !== JSON.stringify([M7_CAPABILITY_SIGNER_OPERATION])) {
      v.push(`X1_SIGNER_EXPORT_SET:[${signerExports.join(',')}]`);
    }
    const op = exportedFunction(sf, M7_CAPABILITY_SIGNER_OPERATION);
    if (op === undefined) {
      v.push('X1_SIGNER_OPERATION_NOT_A_FUNCTION_DECLARATION');
    } else {
      signerParameters = op.parameters.map((p) => p.name.getText(sf));
      if (op.parameters.length !== 1) v.push(`X1_SIGNER_ARITY:${op.parameters.length}`);
      for (const p of op.parameters) {
        const name = p.name.getText(sf);
        if (!ts.isIdentifier(p.name)) v.push(`X1_SIGNER_PARAMETER_PATTERN:${name}`);
        if (p.dotDotDotToken !== undefined) v.push(`X1_SIGNER_REST_PARAMETER:${name}`);
        if (p.initializer !== undefined || p.questionToken !== undefined) {
          v.push(`X1_SIGNER_OPTIONAL_PARAMETER:${name}`);
        }
        if (name !== M7_CAPABILITY_SIGNER_PARAMETER) v.push(`X1_SIGNER_PARAMETER_NAME:${name}`);
        if (M7_CAPABILITY_SIGNER_FORBIDDEN_PARAMETERS.includes(name)) {
          v.push(`X1_SIGNER_FORBIDDEN_PARAMETER:${name}`);
        }
        if (p.type === undefined || p.type.kind !== ts.SyntaxKind.StringKeyword) {
          v.push(`X1_SIGNER_PARAMETER_TYPE:${p.type?.getText(sf) ?? '<none>'}`);
        }
      }
    }
    for (const name of signerExports) {
      if (M7_CAPABILITY_SIGNER_FORBIDDEN_PARAMETERS.includes(name)) {
        v.push(`X1_SIGNER_FORBIDDEN_EXPORT:${name}`);
      }
    }
    // PPC-1 (D-2): the accepted TO-8 mint is MODULE-PRIVATE, keeps its exact one-parameter signature,
    // and the signing step is module-private with exactly (envelope, credentials).
    const mintDecl = privateFunction(sf, M7_CAPABILITY_SIGNER_MINT_STEP);
    if (mintDecl === undefined) v.push('X1_MINT_STEP_NOT_A_PRIVATE_FUNCTION');
    else {
      const ps = mintDecl.parameters.map((p) => p.name.getText(sf));
      if (
        JSON.stringify(ps) !== JSON.stringify([M7_CAPABILITY_SIGNER_PARAMETER]) ||
        mintDecl.parameters[0]?.type?.kind !== ts.SyntaxKind.StringKeyword ||
        mintDecl.parameters[0]?.initializer !== undefined ||
        mintDecl.parameters[0]?.questionToken !== undefined
      ) {
        v.push(`X1_MINT_STEP_SIGNATURE:[${ps.join(',')}]`);
      }
    }
    const signDecl = privateFunction(sf, M7_CAPABILITY_SIGNER_SIGN_STEP);
    if (signDecl === undefined) v.push('X1_SIGN_STEP_NOT_A_PRIVATE_FUNCTION');
    else {
      const ps = signDecl.parameters.map((p) => p.name.getText(sf));
      if (JSON.stringify(ps) !== JSON.stringify(['envelope', 'credentials'])) {
        v.push(`X1_SIGN_STEP_SIGNATURE:[${ps.join(',')}]`);
      }
    }

    // ── X3 — the signer's dependency edges are EXACTLY the allowed set ─────────────────────────────
    for (const { edge, target } of edgesOf(M7_CAPABILITY_SIGNER_MODULE)) {
      if (edge.kind === 'nonliteral' || edge.kind === 'dynamic' || edge.kind === 'require') {
        v.push(`X3_SIGNER_DYNAMIC_EDGE:${edge.specifier}`);
      }
      if (edge.kind === 'reexport' || edge.exportStar)
        v.push(`X3_SIGNER_REEXPORT:${edge.specifier}`);
      if (target.type === 'local') {
        signerLocalImports.add(target.rel);
        if (CCA_ENGINE_MODULES.has(target.rel))
          v.push(`X3_SIGNER_IMPORTS_CCA_ENGINE:${target.rel}`);
        if (target.rel === 'db/client.ts') v.push('X3_SIGNER_IMPORTS_SHARED_CLIENT');
        if (target.rel.startsWith('m7/so1/') || target.rel.startsWith('m7/so2/')) {
          v.push(`X3_SIGNER_IMPORTS_PARTICIPANT_FAMILY:${target.rel}`);
        }
        if (target.rel === M7_SESSION_MODULE) v.push('X3_SIGNER_IMPORTS_SESSION_MODULE');
        if (!M7_CAPABILITY_SIGNER_LOCAL_IMPORTS.includes(target.rel)) {
          v.push(`X3_SIGNER_LOCAL_EDGE:${target.rel}`);
        }
      } else if (target.type === 'external') {
        signerExternalImports.add(target.name);
        if (
          PROVIDER_SDK_PACKAGE.test(target.name) &&
          !M7_PROVIDER_SIGNING_PACKAGES.includes(target.name)
        ) {
          v.push(`X3_SIGNER_PROVIDER_SDK:${target.name}`);
        }
        if (!M7_CAPABILITY_SIGNER_EXTERNAL_IMPORTS.includes(target.name)) {
          v.push(`X3_SIGNER_EXTERNAL_EDGE:${target.name}`);
        }
      } else {
        v.push(`X3_SIGNER_UNRESOLVED_EDGE:${edge.specifier}`);
      }
    }

    // ── X6 — the signer's DB surface: ONE tagged $queryRaw naming x_mint, nothing else ────────────
    const ids = identifiersIn(code);
    for (const forbidden of [
      '$transaction',
      '$executeRaw',
      '$executeRawUnsafe',
      '$queryRawUnsafe',
      '$extends',
      '$use',
      '$on',
      'prisma',
    ]) {
      if (ids.has(forbidden)) v.push(`X6_SIGNER_FORBIDDEN_IDENTIFIER:${forbidden}`);
    }
    let queryRawRefs = 0;
    const tagged: ts.TaggedTemplateExpression[] = [];
    const visitDb = (n: ts.Node): void => {
      if (ts.isPropertyAccessExpression(n) && n.name.text === '$queryRaw') queryRawRefs++;
      if (ts.isElementAccessExpression(n)) {
        const key = literalText(n.argumentExpression);
        if (key !== null && key.startsWith('$')) v.push(`X6_SIGNER_COMPUTED_CLIENT_MEMBER:${key}`);
      }
      if (ts.isTaggedTemplateExpression(n)) tagged.push(n);
      ts.forEachChild(n, visitDb);
    };
    visitDb(sf);
    if (queryRawRefs !== 1) v.push(`X6_SIGNER_QUERY_RAW_REFERENCES:${queryRawRefs}`);
    if (tagged.length !== 1) v.push(`X6_SIGNER_STATEMENT_COUNT:${tagged.length}`);
    for (const t of tagged) {
      const tpl = t.template;
      const sql = ts.isNoSubstitutionTemplateLiteral(tpl)
        ? tpl.text
        : [tpl.head.text, ...tpl.templateSpans.map((s) => s.literal.text)].join('?');
      signerStatements.push(sql);
      const tag = unwrap(t.tag);
      if (!(ts.isPropertyAccessExpression(tag) && tag.name.text === '$queryRaw')) {
        v.push(`X6_SIGNER_STATEMENT_TAG:${t.tag.getText(sf)}`);
      } else {
        const receiver = unwrap(tag.expression);
        if (!(ts.isIdentifier(receiver) && receiver.text === 'tx')) {
          v.push(`X6_SIGNER_STATEMENT_RECEIVER:${tag.expression.getText(sf)}`);
        }
      }
      if (
        !/^SELECT [^;]* FROM m7\.x_mint_generation_capability_v1\(\?::text, \?::uuid\) AS m$/.test(
          sql,
        )
      ) {
        v.push('X6_SIGNER_STATEMENT_NOT_EXACT_FUNCTION');
      }
      const spans = ts.isNoSubstitutionTemplateLiteral(tpl)
        ? []
        : tpl.templateSpans.map((s) => s.expression.getText(sf));
      if (
        JSON.stringify(spans) !== JSON.stringify(['manifestSha256', M7_CAPABILITY_SIGNER_PARAMETER])
      ) {
        v.push(`X6_SIGNER_STATEMENT_ARGUMENTS:[${spans.join(',')}]`);
      }
    }

    // ── X7 — commit boundary: the envelope leaves ONLY as the runner's committed value ─────────────
    const runs = callsNamed(sf, 'runM7CapabilitySignerTransaction');
    if (runs.length !== 1) v.push(`X7_SIGNER_RUNNER_CALLS:${runs.length}`);
    const run = runs[0];
    if (run !== undefined) {
      const mint = privateFunction(sf, M7_CAPABILITY_SIGNER_MINT_STEP);
      if (mint === undefined || !(run.pos > mint.pos && run.end <= mint.end)) {
        v.push('X7_SIGNER_RUNNER_OUTSIDE_OPERATION');
      }
      const [clientArg, optionsArg, bodyArg] = run.arguments;
      if (
        clientArg === undefined ||
        !ts.isCallExpression(clientArg) ||
        clientArg.expression.getText(sf) !== 'signer' ||
        clientArg.arguments.length !== 0
      ) {
        v.push('X7_SIGNER_RUNNER_CLIENT_NOT_HIDDEN_SIGNER');
      }
      if (optionsArg === undefined || optionsArg.getText(sf) !== 'TO8_TRANSACTION_OPTIONS') {
        v.push('X7_SIGNER_RUNNER_OPTIONS_NOT_FIXED');
      }
      if (run.arguments.length !== 3) v.push(`X7_SIGNER_RUNNER_ARITY:${run.arguments.length}`);
      if (bodyArg === undefined || !ts.isArrowFunction(bodyArg)) {
        v.push('X7_SIGNER_CALLBACK_NOT_ARROW');
      } else {
        if (bodyArg.parameters.length !== 1 || bodyArg.parameters[0]!.name.getText(sf) !== 'tx') {
          v.push('X7_SIGNER_CALLBACK_PARAMETERS');
        }
        // The callback is ONE expression — the statement itself. No block, no assignment, no
        // side channel through which a pre-commit value could escape.
        if (ts.isBlock(bodyArg.body)) v.push('X7_SIGNER_CALLBACK_HAS_STATEMENTS');
        else if (!ts.isTaggedTemplateExpression(unwrap(bodyArg.body))) {
          v.push('X7_SIGNER_CALLBACK_NOT_THE_STATEMENT');
        }
        const inner = (n: ts.Node): void => {
          if (
            ts.isBinaryExpression(n) &&
            n.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
            n.operatorToken.kind <= ts.SyntaxKind.LastAssignment
          ) {
            v.push('X7_SIGNER_CALLBACK_ASSIGNS');
          }
          if (ts.isCallExpression(n))
            v.push(`X7_SIGNER_CALLBACK_CALLS:${n.expression.getText(sf)}`);
          ts.forEachChild(n, inner);
        };
        inner(bodyArg.body);
        if (tagged.some((t) => !(t.pos >= bodyArg.pos && t.end <= bodyArg.end))) {
          v.push('X6_SIGNER_STATEMENT_OUTSIDE_TO8_TRANSACTION');
        }
      }
      // The runner's value is awaited into a `const` of the operation and then only copied.
      let awaited: ts.Node = run;
      while (
        awaited.parent !== undefined &&
        (ts.isPropertyAccessExpression(awaited.parent) ||
          (ts.isCallExpression(awaited.parent) && awaited.parent.expression === awaited))
      ) {
        awaited = awaited.parent;
      }
      const aw = awaited.parent;
      const decl = aw?.parent;
      const list = decl?.parent;
      if (
        aw === undefined ||
        !ts.isAwaitExpression(aw) ||
        decl === undefined ||
        !ts.isVariableDeclaration(decl) ||
        list === undefined ||
        !ts.isVariableDeclarationList(list) ||
        (list.flags & ts.NodeFlags.Const) === 0
      ) {
        v.push('X7_SIGNER_RESULT_NOT_AWAITED_CONST');
      }
    }
    // Module scope holds exactly one mutable binding: the lazily built hidden client.
    const moduleLets: string[] = [];
    for (const st of sf.statements) {
      if (ts.isVariableStatement(st) && (st.declarationList.flags & ts.NodeFlags.Const) === 0) {
        for (const d of st.declarationList.declarations) moduleLets.push(d.name.getText(sf));
      }
    }
    if (JSON.stringify(moduleLets) !== JSON.stringify(['signerClient'])) {
      v.push(`X7_SIGNER_MODULE_MUTABLE_BINDINGS:[${moduleLets.join(',')}]`);
    }
    // No `let`/`var` inside the operation or either step: nothing can be captured out of the
    // callback, and no pre-commit value can be stashed for the signing step.
    for (const fnNode of [
      op,
      privateFunction(sf, M7_CAPABILITY_SIGNER_MINT_STEP),
      privateFunction(sf, M7_CAPABILITY_SIGNER_SIGN_STEP),
    ]) {
      if (fnNode === undefined) continue;
      const letIn = (n: ts.Node): void => {
        if (ts.isVariableDeclarationList(n) && (n.flags & ts.NodeFlags.Const) === 0) {
          v.push(`X7_SIGNER_OPERATION_MUTABLE_BINDING:${fnNode.name?.text ?? '?'}`);
        }
        ts.forEachChild(n, letIn);
      };
      letIn(fnNode);
    }

    // ── X8 — the signer names EXACTLY the one capability function ─────────────────────────────────
    signerDbFunctions = m7FunctionMentions(code);
    if (JSON.stringify(signerDbFunctions) !== JSON.stringify(['x_mint_generation_capability_v1'])) {
      v.push(`X8_SIGNER_DB_FUNCTIONS:[${signerDbFunctions.join(',')}]`);
    }

    // ── X9 — the signer reads EXACTLY one credential key, through one environment access ──────────
    const envKeys = literalTexts(code).filter((t) => /DATABASE_URL/.test(t));
    if (JSON.stringify(envKeys) !== JSON.stringify(['M7_CAPABILITY_SIGNER_DATABASE_URL'])) {
      v.push(`X9_SIGNER_CREDENTIAL_KEYS:[${envKeys.join(',')}]`);
    }
    let envAccesses = 0;
    const visitEnv = (n: ts.Node): void => {
      if (
        (ts.isPropertyAccessExpression(n) || ts.isElementAccessExpression(n)) &&
        n.expression.getText(sf) === 'process.env'
      ) {
        envAccesses++;
      }
      ts.forEachChild(n, visitEnv);
    };
    visitEnv(sf);
    // PPC-1: exactly TWO environment reads — the signer DB URL and the provider-credential registry
    // (was one in the TO-8 foundation) — each through its own module constant.
    if (envAccesses !== 2) v.push(`X9_SIGNER_ENV_ACCESSES:${envAccesses}`);
    const providerKeys = literalTexts(code).filter((t) =>
      /^M7_[A-Z0-9_]*_(CREDENTIALS?|SECRETS?|KEYS?|TOKENS?)$/.test(t),
    );
    if (JSON.stringify(providerKeys) !== JSON.stringify([M7_PROVIDER_CREDENTIALS_ENV])) {
      v.push(`X9_SIGNER_PROVIDER_CREDENTIAL_KEYS:[${providerKeys.join(',')}]`);
    }
    const envArgs: string[] = [];
    const visitEnvArgs = (n: ts.Node): void => {
      if (ts.isElementAccessExpression(n) && n.expression.getText(sf) === 'process.env') {
        envArgs.push(n.argumentExpression.getText(sf));
      }
      if (ts.isPropertyAccessExpression(n) && n.expression.getText(sf) === 'process.env') {
        envArgs.push(`.${n.name.text}`);
      }
      ts.forEachChild(n, visitEnvArgs);
    };
    visitEnvArgs(sf);
    if (
      JSON.stringify([...envArgs].sort()) !==
      JSON.stringify(['PROVIDER_CREDENTIALS_ENV', 'SIGNER_DATABASE_URL_ENV'])
    ) {
      v.push(`X9_SIGNER_ENV_ARGUMENTS:[${envArgs.join(',')}]`);
    }
    // …and the registry key is read ONLY inside the credential loader.
    const loader = privateFunction(sf, M7_CAPABILITY_SIGNER_CREDENTIAL_LOADER);
    for (const r of referencesTo(sf, sf, 'PROVIDER_CREDENTIALS_ENV')) {
      if (ts.isVariableDeclaration(r.parent) && r.parent.name === r) continue;
      if (!inside(r, loader)) v.push('X9_PROVIDER_CREDENTIALS_READ_OUTSIDE_LOADER');
    }

    // ── X10 — the signer awaits nothing it may leave floating, and defines no sealed operation ────
    if (identifierUses(code, new Set(SEALED_DEFINITION_FUNCTIONS)).size > 0) {
      v.push('X10_SIGNER_DEFINES_SEALED_OPERATION');
    }
    if (
      identifierUses(code, new Set(['runCcaTransaction', 'installTransactionGovernance'])).size > 0
    ) {
      v.push('X10_SIGNER_USES_CCA_TRANSACTION_PRIMITIVE');
    }

    // ── X16 — the signer holds no network client, no logger, no dynamic code, no module loader ──
    const signerIds = identifiersIn(code);
    for (const forbidden of [
      'fetch',
      'console',
      'XMLHttpRequest',
      'WebSocket',
      'EventSource',
      'globalThis',
      'require',
      'createRequire',
      'eval',
      'Function',
      'logger',
      'createHmac',
      'createSign',
      'subtle',
    ]) {
      if (signerIds.has(forbidden)) v.push(`X16_SIGNER_FORBIDDEN_CAPABILITY:${forbidden}`);
    }

    // ── X17 — commit-before-sign, structurally: op = validate → load registry → AWAIT the private
    //    TO-8 mint into a const → sign exactly that const. The signing library is reachable ONLY from
    //    the private signing step; the mint step cannot reach it. (The runtime proof is the
    //    real-PostgreSQL suite; this pins the shape so a refactor cannot silently reorder it.)
    const mintStep = privateFunction(sf, M7_CAPABILITY_SIGNER_MINT_STEP);
    const signStep = privateFunction(sf, M7_CAPABILITY_SIGNER_SIGN_STEP);
    const mintCalls = callsNamed(sf, M7_CAPABILITY_SIGNER_MINT_STEP);
    const signCalls = callsNamed(sf, M7_CAPABILITY_SIGNER_SIGN_STEP);
    const loaderCalls = callsNamed(sf, M7_CAPABILITY_SIGNER_CREDENTIAL_LOADER);
    if (mintCalls.length !== 1 || !inside(mintCalls[0]!, op)) {
      v.push(`X17_MINT_STEP_CALLS:${mintCalls.length}`);
    }
    if (signCalls.length !== 1 || !inside(signCalls[0]!, op)) {
      v.push(`X17_SIGN_STEP_CALLS:${signCalls.length}`);
    }
    if (loaderCalls.length !== 1 || !inside(loaderCalls[0]!, op)) {
      v.push(`X17_CREDENTIAL_LOADER_CALLS:${loaderCalls.length}`);
    }
    const mintCall = mintCalls[0];
    const signCall = signCalls[0];
    if (mintCall !== undefined && signCall !== undefined) {
      const aw = mintCall.parent;
      const decl = aw?.parent;
      const list = decl?.parent;
      const envelopeName =
        decl !== undefined && ts.isVariableDeclaration(decl) ? decl.name.getText(sf) : null;
      if (
        aw === undefined ||
        !ts.isAwaitExpression(aw) ||
        decl === undefined ||
        !ts.isVariableDeclaration(decl) ||
        list === undefined ||
        !ts.isVariableDeclarationList(list) ||
        (list.flags & ts.NodeFlags.Const) === 0 ||
        JSON.stringify(mintCall.arguments.map((a) => a.getText(sf))) !==
          JSON.stringify([M7_CAPABILITY_SIGNER_PARAMETER])
      ) {
        v.push('X17_MINT_NOT_AWAITED_INTO_CONST');
      }
      const firstArg = signCall.arguments[0];
      if (
        firstArg === undefined ||
        !ts.isIdentifier(firstArg) ||
        firstArg.text !== envelopeName ||
        signCall.arguments.length !== 2
      ) {
        v.push('X17_SIGN_STEP_NOT_GIVEN_THE_COMMITTED_ENVELOPE');
      }
      if (signCall.getStart(sf) < mintCall.end) v.push('X17_SIGN_BEFORE_COMMITTED_MINT');
      // The awaited mint must be a statement of the op body itself (not inside a callback / branch
      // that could let signing run while the TO-8 promise is pending).
      const stmt = list?.parent;
      if (
        op?.body === undefined ||
        stmt === undefined ||
        !ts.isVariableStatement(stmt) ||
        stmt.parent !== op.body
      ) {
        v.push('X17_MINT_AWAIT_NOT_TOP_LEVEL_IN_OPERATION');
      }
      if (op?.body !== undefined && stmt !== undefined) {
        const idx = op.body.statements.indexOf(stmt as ts.Statement);
        const after = op.body.statements.slice(idx + 1);
        const ret = after[0];
        if (
          after.length !== 1 ||
          ret === undefined ||
          !ts.isReturnStatement(ret) ||
          ret.expression === undefined ||
          unwrap(ret.expression) !== signCall
        ) {
          v.push('X17_OPERATION_TAIL_NOT_RETURN_SIGN');
        }
      }
    }
    // SDK bindings (every local name imported from an allowlisted signing package) are referenced
    // ONLY inside the signing step.
    const sdkBindings: string[] = [];
    for (const st of sf.statements) {
      if (
        ts.isImportDeclaration(st) &&
        ts.isStringLiteral(st.moduleSpecifier) &&
        PROVIDER_SDK_PACKAGE.test(st.moduleSpecifier.text)
      ) {
        const c = st.importClause;
        if (c?.name !== undefined) sdkBindings.push(c.name.text);
        const nb = c?.namedBindings;
        if (nb !== undefined && ts.isNamedImports(nb)) {
          for (const e of nb.elements) sdkBindings.push(e.name.text);
        }
        if (nb !== undefined && ts.isNamespaceImport(nb)) sdkBindings.push(nb.name.text);
      }
    }
    for (const b of sdkBindings) {
      for (const r of referencesTo(sf, sf, b)) {
        if (ts.isImportClause(r.parent) || ts.isNamespaceImport(r.parent)) continue;
        if (!inside(r, signStep)) v.push(`X17_SDK_BINDING_OUTSIDE_SIGN_STEP:${b}`);
      }
    }
    signerSdkBindings.push(...sdkBindings);

    // ── X20 — CANONICAL_CREATE is a SIGNED conditional create (PPC-1 R2, AUD-M7-PPC1-01; SP-4,
    //    §11.3, Corollary 4, T-169). The ONE presign request carries exactly `{ host, 'if-none-match':
    //    '*' }` (no spread, no other header); the presign options are exactly `{ signingDate,
    //    expiresIn }` (nothing can un-sign or hoist the header); the self-check demands the signed-header
    //    set `host;if-none-match` and the exact value; the capability exposes the frozen required
    //    headers. A valid signature therefore never exists for a plain (overwriting) PUT.
    const presignCalls: ts.CallExpression[] = [];
    const visitPresign = (n: ts.Node): void => {
      if (
        ts.isCallExpression(n) &&
        ts.isPropertyAccessExpression(n.expression) &&
        n.expression.name.text === 'presign'
      ) {
        presignCalls.push(n);
      }
      ts.forEachChild(n, visitPresign);
    };
    visitPresign(sf);
    if (presignCalls.length !== 1 || !inside(presignCalls[0]!, signStep)) {
      v.push(`X20_PRESIGN_CALLS:${presignCalls.length}`);
    }
    const presignCall = presignCalls[0];
    if (presignCall !== undefined) {
      const [reqArg, optArg] = presignCall.arguments;
      const reqObj = reqArg === undefined ? undefined : unwrap(reqArg);
      if (reqObj === undefined || !ts.isObjectLiteralExpression(reqObj)) {
        v.push('X20_REQUEST_NOT_OBJECT_LITERAL');
      } else {
        const headersProp = reqObj.properties.find(
          (pr) => ts.isPropertyAssignment(pr) && pr.name.getText(sf) === 'headers',
        );
        const headersObj =
          headersProp !== undefined && ts.isPropertyAssignment(headersProp)
            ? unwrap(headersProp.initializer)
            : undefined;
        if (headersObj === undefined || !ts.isObjectLiteralExpression(headersObj)) {
          v.push('X20_REQUEST_HEADERS_NOT_OBJECT_LITERAL');
        } else {
          const shape = headersObj.properties.map((pr) =>
            ts.isShorthandPropertyAssignment(pr)
              ? `shorthand:${pr.name.text}`
              : ts.isPropertyAssignment(pr)
                ? `prop:${literalText(pr.name as ts.Expression) ?? pr.name.getText(sf)}`
                : `other:${pr.getText(sf)}`,
          );
          if (JSON.stringify(shape) !== JSON.stringify(['shorthand:host', 'prop:if-none-match'])) {
            v.push(`X20_REQUEST_HEADERS_SHAPE:[${shape.join(',')}]`);
          }
          const inm = headersObj.properties.find(
            (pr) =>
              ts.isPropertyAssignment(pr) &&
              literalText(pr.name as ts.Expression) === 'if-none-match',
          );
          if (inm === undefined || !ts.isPropertyAssignment(inm)) {
            v.push('X20_IF_NONE_MATCH_MISSING');
          } else if (literalText(inm.initializer) !== '*') {
            v.push(`X20_IF_NONE_MATCH_VALUE:${inm.initializer.getText(sf)}`);
          }
        }
      }
      const optObj = optArg === undefined ? undefined : unwrap(optArg);
      const optKeys =
        optObj !== undefined && ts.isObjectLiteralExpression(optObj)
          ? optObj.properties.map((pr) => pr.name?.getText(sf) ?? `other:${pr.getText(sf)}`)
          : ['<not an object literal>'];
      if (JSON.stringify(optKeys) !== JSON.stringify(['signingDate', 'expiresIn'])) {
        v.push(`X20_PRESIGN_OPTIONS:[${optKeys.join(',')}]`);
      }
    }
    const signText = signStep?.getText(sf) ?? '';
    if (!/'X-Amz-SignedHeaders': 'host;if-none-match',/.test(signText)) {
      v.push('X20_SELF_CHECK_SIGNED_HEADERS');
    }
    if (
      !signText.includes("signed.headers['if-none-match'] !== REQUIRED_HEADERS['if-none-match']")
    ) {
      v.push('X20_SELF_CHECK_HEADER_VALUE');
    }
    if (!/JSON\.stringify\(\['host', 'if-none-match'\]\)/.test(signText)) {
      v.push('X20_SELF_CHECK_HEADER_SET');
    }
    const requiredDecl = sf.statements
      .filter(ts.isVariableStatement)
      .flatMap((st) => [...st.declarationList.declarations])
      .find((d) => d.name.getText(sf) === 'REQUIRED_HEADERS');
    const requiredInit = requiredDecl?.initializer;
    if (
      requiredInit === undefined ||
      !ts.isCallExpression(requiredInit) ||
      requiredInit.expression.getText(sf) !== 'Object.freeze' ||
      !/^\{\s*'if-none-match': '\*',?\s*\}\s*as const$/.test(
        requiredInit.arguments[0]?.getText(sf) ?? '',
      )
    ) {
      v.push('X20_REQUIRED_HEADERS_NOT_FROZEN_LITERAL');
    }
    if (!/readonly requiredHeaders = REQUIRED_HEADERS;/.test(code)) {
      v.push('X20_CAPABILITY_REQUIRED_HEADERS');
    }
    // The mint step reaches neither the signing step, the registry nor the library; the signing step
    // reaches neither the TO-8 runner, the hidden client, the mint step nor a statement.
    if (mintStep !== undefined) {
      for (const name of [
        M7_CAPABILITY_SIGNER_SIGN_STEP,
        M7_CAPABILITY_SIGNER_CREDENTIAL_LOADER,
        ...sdkBindings,
      ]) {
        if (referencesTo(mintStep, sf, name).length > 0) v.push(`X17_MINT_STEP_REACHES:${name}`);
      }
    }
    if (signStep !== undefined) {
      for (const name of [
        'runM7CapabilitySignerTransaction',
        'signer',
        'signerClient',
        M7_CAPABILITY_SIGNER_MINT_STEP,
        M7_CAPABILITY_SIGNER_CREDENTIAL_LOADER,
        'process',
      ]) {
        if (referencesTo(signStep, sf, name).length > 0) v.push(`X17_SIGN_STEP_REACHES:${name}`);
      }
      if (/\$queryRaw|\$executeRaw/.test(signStep.getText(sf))) {
        v.push('X17_SIGN_STEP_REACHES:database');
      }
    }
  }

  // ── X2 — exactly one productive reader of the signer credential (the signer module) ─────────────
  const SIGNER_ENV = 'M7_CAPABILITY_SIGNER_DATABASE_URL';
  const signerDatabaseUrlReaders = productive.filter((f) =>
    memoMentions(read(f), new Set([SIGNER_ENV])).has(SIGNER_ENV),
  );
  if (
    signerDatabaseUrlReaders.length !== 1 ||
    signerDatabaseUrlReaders[0] !== M7_CAPABILITY_SIGNER_MODULE
  ) {
    v.push(`X2_SIGNER_CREDENTIAL_READERS:[${signerDatabaseUrlReaders.join(',')}]`);
  }

  // ── X4 — nothing productive imports the signer; only the signer imports its contract ──────────
  const importersOf = (rel: string): string[] =>
    productive.filter((f) =>
      edgesOf(f).some((e) => e.target.type === 'local' && e.target.rel === rel),
    );
  const signerImporters = importersOf(M7_CAPABILITY_SIGNER_MODULE);
  for (const f of signerImporters) v.push(`X4_SIGNER_IMPORTED_BY_PRODUCTION:${f}`);
  const contractImporters = importersOf(M7_CAPABILITY_SIGNER_CONTRACT_MODULE);
  for (const f of contractImporters) {
    if (f !== M7_CAPABILITY_SIGNER_MODULE) v.push(`X4_SIGNER_CONTRACT_IMPORTER:${f}`);
  }
  const contract = provider.read(M7_CAPABILITY_SIGNER_CONTRACT_MODULE);
  if (contract === null)
    v.push(`X4_SIGNER_CONTRACT_MISSING:${M7_CAPABILITY_SIGNER_CONTRACT_MODULE}`);
  else {
    if (memoEdges(contract).length !== 0) v.push('X4_SIGNER_CONTRACT_HAS_IMPORTS');
    if (
      JSON.stringify(exportedValueNames(contract)) !== JSON.stringify(['M7CapabilitySignerError'])
    ) {
      v.push(`X4_SIGNER_CONTRACT_EXPORTS:[${exportedValueNames(contract).join(',')}]`);
    }
    if (identifiersIn(contract).has('process')) v.push('X4_SIGNER_CONTRACT_READS_ENVIRONMENT');
  }

  // ── X5 — exactly the four PrismaClient construction points, each once ─────────────────────────
  const prismaClientConstructionPoints: Record<string, number> = {};
  for (const f of productive) {
    const n = newPrismaClientCount(read(f));
    if (n > 0) prismaClientConstructionPoints[f] = n;
  }
  for (const [f, n] of Object.entries(prismaClientConstructionPoints)) {
    if (!M7_PRISMA_CLIENT_CONSTRUCTION_POINTS.includes(f))
      v.push(`X5_PRISMA_CLIENT_CONSTRUCTED:${f}`);
    else if (n !== 1) v.push(`X5_PRISMA_CLIENT_CONSTRUCTIONS:${f}:${n}`);
  }
  for (const f of M7_PRISMA_CLIENT_CONSTRUCTION_POINTS) {
    if (prismaClientConstructionPoints[f] === undefined)
      v.push(`X5_PRISMA_CLIENT_POINT_MISSING:${f}`);
  }

  // ── X11 — the capability function is named by NO other productive file ────────────────────────
  for (const f of productive) {
    if (f === M7_CAPABILITY_SIGNER_MODULE) continue;
    if (M7_VERIFICATION_TOOLING_PREFIXES.some((p) => f.startsWith(p))) continue;
    if (/\bx_mint_generation_capability_v1\b/.test(literalTexts(read(f)).join('\n'))) {
      v.push(`X11_CAPABILITY_FUNCTION_OUTSIDE_SIGNER:${f}`);
    }
  }

  // ── X12 — provider-signing packages: EXACTLY one productive importer (the signer), only the
  //    reviewed allowlist, never re-exported, never reached through a non-literal / required /
  //    createRequire'd specifier; no storage-worker runtime, no SO-3 in productive source ────────
  const providerSigningImporters: Record<string, string[]> = {};
  for (const f of productive) {
    for (const { edge, target } of edgesOf(f)) {
      if (edge.kind === 'nonliteral') v.push(`X12_NONLITERAL_MODULE_EDGE:${f}:${edge.specifier}`);
      if (target.type !== 'external') continue;
      const name = target.name;
      const isProviderPackage =
        PROVIDER_SDK_PACKAGE.test(name) || M7_PROVIDER_SIGNING_PACKAGES.includes(name);
      if (!isProviderPackage) continue;
      (providerSigningImporters[name] ??= []).push(f);
      if (f !== M7_CAPABILITY_SIGNER_MODULE) v.push(`X12_PROVIDER_SDK_IMPORT:${name}:${f}`);
      else if (!M7_PROVIDER_SIGNING_PACKAGES.includes(name)) {
        v.push(`X12_PROVIDER_SDK_NOT_ALLOWLISTED:${name}`);
      }
      if (edge.kind === 'reexport' || edge.exportStar) {
        v.push(`X12_PROVIDER_SDK_REEXPORT:${name}:${f}`);
      }
      if (edge.kind !== 'import')
        v.push(`X12_PROVIDER_SDK_NON_STATIC_EDGE:${edge.kind}:${name}:${f}`);
    }
    if (/createRequire/.test(read(f)) && identifiersIn(read(f)).has('createRequire')) {
      v.push(`X12_CREATE_REQUIRE:${f}`);
    }
    if (/(^|\/)(storage-worker|m7-storage-worker|worker)(\/|\.|-)/i.test(f)) {
      v.push(`X12_WORKER_RUNTIME_PRESENT:${f}`);
    }
    if (/(^|\/)(so3|saving-evidence|evidence-submission)(\/|\.|-)/i.test(f)) {
      v.push(`X12_SO3_PRESENT:${f}`);
    }
  }
  for (const pkg of M7_PROVIDER_SIGNING_PACKAGES) {
    if (!PROVIDER_SDK_PACKAGE.test(pkg)) v.push(`X12_ALLOWLIST_OUTSIDE_PATTERN:${pkg}`);
  }

  // ── X13 — no public route / barrel / participant family / session / engine reaches the signer ──
  // (X4 already forbids EVERY productive importer; this names the §12 surfaces explicitly.)
  for (const f of signerImporters) {
    if (f.startsWith('app/') || f === 'services/index.ts' || f === 'db/index.ts') {
      v.push(`X13_SIGNER_PUBLIC_EXPOSURE:${f}`);
    }
    if (f === M7_PARTICIPANT_CCA_ENGINE_MODULE) v.push('X13_PARTICIPANT_ENGINE_IMPORTS_SIGNER');
    if (f === M7_SESSION_MODULE) v.push('X13_SESSION_MODULE_IMPORTS_SIGNER');
  }

  // ── X15 — the provider-credential env source has exactly ONE productive reader, and no
  //    computed / enumerated `process.env` path can bypass that census ──────────────────────────
  const providerCredentialReaders = productive.filter((f) =>
    memoMentions(read(f), new Set([M7_PROVIDER_CREDENTIALS_ENV])).has(M7_PROVIDER_CREDENTIALS_ENV),
  );
  if (
    providerCredentialReaders.length !== 1 ||
    providerCredentialReaders[0] !== M7_CAPABILITY_SIGNER_MODULE
  ) {
    v.push(`X15_PROVIDER_CREDENTIAL_READERS:[${providerCredentialReaders.join(',')}]`);
  }
  const processEnvObjectHolders: Record<string, number> = {};
  for (const f of productive) {
    const text = read(f);
    if (!/\bprocess\b|\beval\b|\bFunction\b/.test(text)) continue;
    const memoKey = `${f}\u0000${text}`;
    let facts = m7EnvFactsMemo.get(memoKey);
    if (facts === undefined) {
      const fv: string[] = [];
      const sf = parse(text);
      // module-level `const X = '<literal>'` names — the only admissible computed env keys
      const constLiterals = new Set<string>();
      for (const st of sf.statements) {
        if (!ts.isVariableStatement(st) || (st.declarationList.flags & ts.NodeFlags.Const) === 0) {
          continue;
        }
        for (const d of st.declarationList.declarations) {
          if (
            ts.isIdentifier(d.name) &&
            d.initializer !== undefined &&
            literalText(d.initializer) !== null
          ) {
            constLiterals.add(d.name.text);
          }
        }
      }
      let holders = 0;
      const visit = (n: ts.Node): void => {
        if (ts.isIdentifier(n) && n.text === 'process') {
          const p = n.parent;
          const isObjectOfMemberAccess =
            p !== undefined && ts.isPropertyAccessExpression(p) && p.expression === n;
          const isTypeName =
            p !== undefined && (ts.isTypeReferenceNode(p) || ts.isQualifiedName(p));
          if (p !== undefined && ts.isElementAccessExpression(p) && p.expression === n) {
            fv.push(`X15_PROCESS_ELEMENT_ACCESS:${f}`);
          } else if (
            !isObjectOfMemberAccess &&
            !isTypeName &&
            !(p !== undefined && ts.isTypeOfExpression(p))
          ) {
            fv.push(`X15_PROCESS_OBJECT_ESCAPE:${f}`);
          }
        }
        if (ts.isPropertyAccessExpression(n) && n.getText(sf) === 'process.env') {
          const p = n.parent;
          if (p !== undefined && ts.isElementAccessExpression(p) && p.expression === n) {
            const a = p.argumentExpression;
            const ok = literalText(a) !== null || (ts.isIdentifier(a) && constLiterals.has(a.text));
            if (!ok) fv.push(`X15_COMPUTED_ENV_ACCESS:${f}:${a.getText(sf)}`);
          } else if (!(p !== undefined && ts.isPropertyAccessExpression(p) && p.expression === n)) {
            holders++;
          }
        }
        if (
          ts.isCallExpression(n) &&
          ts.isIdentifier(n.expression) &&
          n.expression.text === 'eval'
        ) {
          fv.push(`X15_DYNAMIC_CODE:eval:${f}`);
        }
        if (
          (ts.isNewExpression(n) || ts.isCallExpression(n)) &&
          ts.isIdentifier(n.expression) &&
          n.expression.text === 'Function'
        ) {
          fv.push(`X15_DYNAMIC_CODE:Function:${f}`);
        }
        ts.forEachChild(n, visit);
      };
      visit(sf);
      facts = { v: fv, holders };
      m7EnvFactsMemo.set(memoKey, facts);
    }
    v.push(...facts.v);
    const holders = facts.holders;
    if (holders > 0) processEnvObjectHolders[f] = holders;
  }
  if (
    JSON.stringify(Object.entries(processEnvObjectHolders).sort()) !==
    JSON.stringify(Object.entries(M7_PROCESS_ENV_OBJECT_HOLDERS).sort())
  ) {
    v.push(`X15_ENV_OBJECT_HOLDERS:${JSON.stringify(processEnvObjectHolders)}`);
  }

  // ── X18 — no alternate hand-rolled signer anywhere in productive source ─────────────────────────
  for (const f of productive) {
    const text = read(f);
    if (/createHmac|createSign|subtle/.test(text)) {
      const ids = identifiersIn(text);
      for (const x of ['createHmac', 'createSign', 'subtle']) {
        if (ids.has(x)) v.push(`X18_HAND_ROLLED_SIGNING_PRIMITIVE:${x}:${f}`);
      }
    }
    if (f === M7_CAPABILITY_SIGNER_MODULE || !SIGV4_MARKERS.test(text)) continue;
    let marked = m7Sigv4MarkerMemo.get(text);
    if (marked === undefined) {
      marked = literalTexts(text).some((t) => SIGV4_MARKERS.test(t));
      m7Sigv4MarkerMemo.set(text, marked);
    }
    if (marked) v.push(`X18_SIGV4_MARKER_OUTSIDE_SIGNER:${f}`);
  }

  // ── X14 — TO-8 inside the ONE DatabaseExecutionContext ─────────────────────────────────────────
  const execCode = provider.read('cca/execution-context.ts');
  const executionContext =
    execCode === null ? ['TO8_EXECUTION_CONTEXT_MISSING'] : analyzeTo8ExecutionContext(execCode);
  for (const x of executionContext) v.push(x);
  for (const f of productive) {
    if (f === 'cca/execution-context.ts') continue;
    if (identifiersIn(read(f)).has('AsyncLocalStorage'))
      v.push(`TO8_SECOND_ASYNC_LOCAL_STORAGE:${f}`);
  }

  return {
    violations: v,
    signerExports,
    signerParameters,
    signerLocalImports: [...signerLocalImports].sort(),
    signerExternalImports: [...signerExternalImports].sort(),
    signerStatements,
    signerDbFunctions,
    signerImporters,
    contractImporters,
    prismaClientConstructionPoints,
    signerDatabaseUrlReaders,
    executionContext,
    providerSigningImporters,
    providerCredentialReaders,
    processEnvObjectHolders,
    signerSdkBindings,
  };
}

/**
 * PPC-1 package-manifest rule (X19): every dependency matching the provider pattern is EXACTLY the
 * reviewed allowlist, each exact-pinned (no range), and none is a devDependency.
 */
export function analyzeProviderSigningPackageManifest(packageJson: string): string[] {
  const v: string[] = [];
  const pkg = JSON.parse(packageJson) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
  };
  const deps = pkg.dependencies ?? {};
  const provider = Object.keys(deps)
    .filter((n) => PROVIDER_SDK_PACKAGE.test(n))
    .sort();
  if (JSON.stringify(provider) !== JSON.stringify([...M7_PROVIDER_SIGNING_PACKAGES].sort())) {
    v.push(`X19_PROVIDER_DEPENDENCY_SET:[${provider.join(',')}]`);
  }
  for (const n of provider) {
    if (!/^\d+\.\d+\.\d+$/.test(deps[n] ?? '')) v.push(`X19_PROVIDER_DEPENDENCY_NOT_EXACT:${n}`);
  }
  for (const section of ['devDependencies', 'optionalDependencies', 'peerDependencies'] as const) {
    for (const n of Object.keys(pkg[section] ?? {})) {
      if (PROVIDER_SDK_PACKAGE.test(n)) v.push(`X19_PROVIDER_PACKAGE_IN_${section}:${n}`);
    }
  }
  return v;
}

/**
 * TO-8 rules over `cca/execution-context.ts`:
 *   * the owner-kind union is EXACTLY NONE | ACCEPTED_OWNER | CCA | M7_CAPABILITY_SIGNER;
 *   * exactly ONE AsyncLocalStorage is constructed;
 *   * the TO-8 runner takes (client, options, body) — no owner-kind parameter — reads the state
 *     FIRST and refuses on `state.transactionActive` BEFORE any other call; its frame authority is the
 *     fixed literal; the frame is closed in `finally`; it calls the captured original only inside the
 *     frame;
 *   * no exported function takes an owner / authority / kind selector, and no generic
 *     runTransaction / registerOwner / withTransaction exists;
 *   * the accepted state computation and the accepted CCA refusals are still present verbatim, so a
 *     TO-8 frame is observed as `transactionActive` and CCA rejects inside it.
 */
export function analyzeTo8ExecutionContext(code: string): string[] {
  const v: string[] = [];
  const sf = parse(code);

  // owner-kind union
  let union: string[] | null = null;
  for (const st of sf.statements) {
    if (ts.isTypeAliasDeclaration(st) && st.name.text === 'TransactionAuthority') {
      const t = st.type;
      union = ts.isUnionTypeNode(t)
        ? t.types.map((m) =>
            ts.isLiteralTypeNode(m) && ts.isStringLiteral(m.literal) ? m.literal.text : '?',
          )
        : ['?'];
    }
  }
  if (union === null) v.push('TO8_AUTHORITY_UNION_MISSING');
  else if (JSON.stringify(union) !== JSON.stringify(TRANSACTION_AUTHORITIES)) {
    v.push(`TO8_AUTHORITY_UNION:[${union.join(',')}]`);
  }

  // one AsyncLocalStorage
  let als = 0;
  const visitAls = (n: ts.Node): void => {
    if (ts.isNewExpression(n) && n.expression.getText(sf) === 'AsyncLocalStorage') als++;
    ts.forEachChild(n, visitAls);
  };
  visitAls(sf);
  if (als !== 1) v.push(`TO8_ASYNC_LOCAL_STORAGE_COUNT:${als}`);

  // no generic owner selector
  for (const st of sf.statements) {
    if (!ts.isFunctionDeclaration(st)) continue;
    const exported = ts.getModifiers(st)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (exported !== true) continue;
    const name = st.name?.text ?? '';
    if (/^(runTransaction|registerOwner|withTransaction|runOwnedTransaction)$/i.test(name)) {
      v.push(`TO8_GENERIC_TRANSACTION_API:${name}`);
    }
    for (const p of st.parameters) {
      if (/owner|authority|kind/i.test(p.name.getText(sf))) {
        v.push(`TO8_OWNER_SELECTOR_PARAMETER:${name}:${p.name.getText(sf)}`);
      }
    }
  }
  const literalKinds = literalTexts(code).filter((t) => t === TO8_OWNER_KIND).length;
  // one in the union, one in the Frame authority union, one in the runner's frame
  if (literalKinds !== 3) v.push(`TO8_OWNER_KIND_LITERALS:${literalKinds}`);

  // the TO-8 runner
  const runner = sf.statements.find(
    (st): st is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(st) && st.name?.text === 'runM7CapabilitySignerTransaction',
  );
  if (runner === undefined || runner.body === undefined) {
    v.push('TO8_RUNNER_MISSING');
  } else {
    const params = runner.parameters.map((p) => p.name.getText(sf));
    if (JSON.stringify(params) !== JSON.stringify(['client', 'options', 'body'])) {
      v.push(`TO8_RUNNER_PARAMETERS:[${params.join(',')}]`);
    }
    const [first, second] = runner.body.statements;
    const firstOk =
      first !== undefined &&
      ts.isVariableStatement(first) &&
      first.declarationList.declarations.length === 1 &&
      first.declarationList.declarations[0]!.name.getText(sf) === 'state' &&
      first.declarationList.declarations[0]!.initializer?.getText(sf) ===
        'readDatabaseExecutionState()';
    if (!firstOk) v.push('TO8_RUNNER_STATE_NOT_READ_FIRST');
    const guardOk =
      second !== undefined &&
      ts.isIfStatement(second) &&
      second.expression.getText(sf) === 'state.transactionActive' &&
      ts.isBlock(second.thenStatement) &&
      second.thenStatement.statements.some(ts.isThrowStatement);
    if (!guardOk) v.push('TO8_RUNNER_GUARD_NOT_SECOND');
    // Nothing but the state read and the counter/throw precede the guard's end.
    if (second !== undefined) {
      const early = (n: ts.Node): void => {
        if (ts.isCallExpression(n) && n.getStart(sf) < second.getStart(sf)) {
          const name = n.expression.getText(sf);
          if (name !== 'readDatabaseExecutionState') v.push(`TO8_RUNNER_CALL_BEFORE_GUARD:${name}`);
        }
        ts.forEachChild(n, early);
      };
      early(runner.body);
    }
    const bodyText = runner.body.getText(sf);
    if (!/authority:\s*'M7_CAPABILITY_SIGNER'/.test(bodyText))
      v.push('TO8_RUNNER_FRAME_KIND_NOT_FIXED');
    if (!/finally\s*\{\s*frame\.open = false;\s*\}/.test(bodyText)) {
      v.push('TO8_RUNNER_FRAME_NOT_CLOSED_IN_FINALLY');
    }
    const originals = callsNamed(runner.body, 'original');
    if (originals.length !== 1) v.push(`TO8_RUNNER_ORIGINAL_CALLS:${originals.length}`);
    const storageRuns: ts.CallExpression[] = [];
    const visitRun = (n: ts.Node): void => {
      if (ts.isCallExpression(n) && n.expression.getText(sf) === 'storage.run') storageRuns.push(n);
      ts.forEachChild(n, visitRun);
    };
    visitRun(runner.body);
    const outer = storageRuns[0];
    if (
      outer === undefined ||
      originals[0] === undefined ||
      !(originals[0].pos > outer.pos && originals[0].end <= outer.end)
    ) {
      v.push('TO8_RUNNER_TRANSACTION_OUTSIDE_FRAME');
    }
    if (/\$transaction/.test(bodyText)) v.push('TO8_RUNNER_CALLS_CLIENT_TRANSACTION_DIRECTLY');
  }

  // the sealing replaces the signer client's own $transaction with a refusal
  const seal = sf.statements.find(
    (st): st is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(st) && st.name?.text === 'sealM7CapabilitySignerClient',
  );
  if (seal === undefined || seal.body === undefined) v.push('TO8_SEAL_MISSING');
  else if (!/TO8_DIRECT_TRANSACTION_FORBIDDEN/.test(seal.body.getText(sf))) {
    v.push('TO8_SEAL_DOES_NOT_REFUSE_DIRECT_TRANSACTIONS');
  }

  // accepted semantics preserved verbatim where TO-8 depends on them
  const fnText = (name: string): string => {
    const f = sf.statements.find(
      (st): st is ts.FunctionDeclaration => ts.isFunctionDeclaration(st) && st.name?.text === name,
    );
    return f?.body?.getText(sf) ?? '';
  };
  if (!/transactionActive: frames\.length > 0,/.test(fnText('readDatabaseExecutionState'))) {
    v.push('TO8_STATE_TRANSACTION_ACTIVE_NOT_ALL_FRAMES');
  }
  if (/authority/.test(fnText('openFrames'))) v.push('TO8_OPEN_FRAMES_FILTERS_BY_AUTHORITY');
  const cca = fnText('runCcaTransaction');
  const reentry = cca.indexOf('if (state.ccaActive)');
  const topLevel = cca.indexOf('if (state.transactionActive)');
  if (
    reentry < 0 ||
    topLevel < 0 ||
    reentry > topLevel ||
    !/CCA_TOP_LEVEL_TRANSACTION_REQUIRED/.test(cca)
  ) {
    v.push('TO8_CCA_TOP_LEVEL_REFUSAL_CHANGED');
  }
  return v;
}

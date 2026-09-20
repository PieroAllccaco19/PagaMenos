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

export const CCA_ENGINE_MODULE = 'db/cca-engine.ts';

export function roleOf(rel: string): ModuleRole {
  if (rel === CCA_ENGINE_MODULE) return 'ENGINE';
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
  installTransactionGovernance: ['db/client.ts', 'cca/execution-context.ts'],
  runCcaTransaction: [CCA_ENGINE_MODULE, 'cca/execution-context.ts'],
  mintLockedCollectionScope: [CCA_ENGINE_MODULE, 'cca/locked-scope.ts'],
  constructTrackedAdapter: [CCA_ENGINE_MODULE, 'cca/tracked-adapter.ts'],
  executeUnderZeroInFlightGate: [CCA_ENGINE_MODULE, 'cca/tracked-adapter.ts'],
  freezeAdapterSpec: [CCA_ENGINE_MODULE, 'cca/tracked-adapter.ts'],
  createLockSequencer: [CCA_ENGINE_MODULE, 'cca/lock-order.ts'],
  sealOperation: [CCA_ENGINE_MODULE, 'cca/sealed-operation.ts'],
};

/** Restricted modules → allowed importers (plus leaves where noted by role rules). */
export const RESTRICTED_MODULE_IMPORTERS: Readonly<Record<string, readonly string[]>> = {
  'cca/execution-context.ts': ['db/client.ts', CCA_ENGINE_MODULE],
  'cca/tracked-adapter.ts': [CCA_ENGINE_MODULE],
};

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

/** `defineSealedOperation(...)` call sites and whether each is at module scope. */
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
      n.expression.text === 'defineSealedOperation'
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
    if (identifierUses(code, new Set(['defineSealedOperation'])).size > 0) {
      if (roleOf(f) !== 'LEAF' && f !== CCA_ENGINE_MODULE) {
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
        if (new Set(execs).size !== 1) v.push(`${f}: LEAF_EXECUTOR_COUNT:${new Set(execs).size}`);
        if (new Set(impls).size !== 1) v.push(`${f}: LEAF_ADAPTER_COUNT:${new Set(impls).size}`);
        if (!localTargets.includes(CCA_ENGINE_MODULE)) v.push(`${f}: LEAF_WITHOUT_ENGINE`);
        if (localTargets.some((t) => roleOf(t) === 'LEAF')) v.push(`${f}: CROSS_LEAF_IMPORT`);
        if (list.some((e) => e.edge.exportStar || e.edge.kind === 'reexport')) {
          v.push(`${f}: LEAF_REEXPORT_FORBIDDEN`);
        }
        for (const { target } of list) {
          if (
            target.type === 'local' &&
            target.rel !== CCA_ENGINE_MODULE &&
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

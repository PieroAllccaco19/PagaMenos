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
};

/** Restricted modules → allowed importers (plus leaves where noted by role rules). */
export const RESTRICTED_MODULE_IMPORTERS: Readonly<Record<string, readonly string[]>> = {
  'cca/execution-context.ts': ['db/client.ts', CCA_ENGINE_MODULE, M7_PARTICIPANT_CCA_ENGINE_MODULE],
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
 * module. This slice implements exactly two of the six M7 role credentials; the other four are not
 * implemented and MUST NOT appear in productive source at all.
 */
export const M7_CREDENTIAL_READERS: Readonly<Record<string, string>> = {
  M7_PARTICIPANT_DATABASE_URL: M7_PARTICIPANT_CCA_ENGINE_MODULE,
  M7_SESSION_ISSUER_DATABASE_URL: M7_SESSION_MODULE,
};

/** M7 role credentials that are deliberately NOT implemented in this slice (AUTH §9, §29). */
export const M7_CREDENTIALS_NOT_IN_THIS_SLICE: readonly string[] = [
  'M7_PRIVACY_REQUEST_DATABASE_URL',
  'M7_STORAGE_WORKER_DATABASE_URL',
  'M7_DELETION_AUTHORITY_DATABASE_URL',
  'M7_CAPABILITY_SIGNER_DATABASE_URL',
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

  // ── M1 / M2 — exactly one of each SO-1 role, at the expected path ─────────────────────────────
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
    if (roleCounts[label] !== 1) v.push(`M7_SO1_${label}_COUNT:${roleCounts[label] ?? 0}`);
  }

  // ── M3 — the leaf binds to the M7 engine, its fixed executor and its own adapter ──────────────
  const leafTargets = localTargetsOf(M7_SO1_MODULES.leaf);
  if (!leafTargets.includes(M7_PARTICIPANT_CCA_ENGINE_MODULE)) {
    v.push('M7_SO1_LEAF_NOT_BOUND_TO_M7_ENGINE');
  }
  if (!leafTargets.includes(M7_SO1_MODULES.executor)) v.push('M7_SO1_LEAF_NOT_BOUND_TO_EXECUTOR');
  if (!leafTargets.includes(M7_SO1_MODULES.adapter)) v.push('M7_SO1_LEAF_NOT_BOUND_TO_ADAPTER');
  if (leafTargets.includes(CCA_ENGINE_MODULE)) v.push('M7_SO1_LEAF_BOUND_TO_FOUNDATION_ENGINE');

  // ── M4 — SO-2 / SO-3 / Evidence are NOT implemented in this slice (AUTH §29) ──────────────────
  const EVIDENCE = /(evidence|upload-intent|saving-evidence|storage-worker|capability-signer)/i;
  for (const f of productive) {
    if (roleOf(f) !== 'OTHER' && EVIDENCE.test(f)) v.push(`M7_SO2_SO3_MODULE_PRESENT:${f}`);
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

  // ── M8 — the private M7 engine exposes ONE definition entry point and no DB capability ────────
  const engineCode = provider.read(M7_PARTICIPANT_CCA_ENGINE_MODULE);
  if (engineCode === null) {
    v.push(`M7_ENGINE_MISSING:${M7_PARTICIPANT_CCA_ENGINE_MODULE}`);
  } else {
    const exported = exportedValueCount(engineCode);
    // One definition entry point, plus the named environment-key constant the census reads.
    if (exported > 2) v.push(`M7_ENGINE_EXPORTS_MORE_THAN_DEFINITION:${exported}`);
    if (!exportsBindingNamed(engineCode, 'defineSealedOutcomeAssertionOperation')) {
      v.push('M7_ENGINE_MISSING_DEFINITION_ENTRY_POINT');
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

/** Every entry-guard ORDER violation in the M7 engine source. Empty ⇒ compliant. */
export function analyzeM7EntryGuardOrder(code: string): string[] {
  const v: string[] = [];
  const sf = parse(code);

  let impl: ts.FunctionLikeDeclaration | undefined;
  let guardDecl: ts.FunctionDeclaration | undefined;
  const find = (n: ts.Node): void => {
    if (
      ts.isCallExpression(n) &&
      ts.isIdentifier(n.expression) &&
      n.expression.text === 'sealOperation' &&
      n.arguments.length >= 1
    ) {
      const a = n.arguments[0]!;
      if (ts.isArrowFunction(a) || ts.isFunctionExpression(a)) impl = a;
    }
    if (ts.isFunctionDeclaration(n) && n.name?.text === M7_ENTRY_GUARD) guardDecl = n;
    ts.forEachChild(n, find);
  };
  find(sf);
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

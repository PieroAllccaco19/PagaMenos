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
};

/** Later-slice database functions that no productive runtime code may name (SO-2 AUTH §4, §32). */
export const M7_LATER_SLICE_DB_FUNCTIONS: readonly RegExp[] = [
  /\bp_finalize_evidence_submission_v1\b/,
  /\bp_lookup_evidence_receipt_v1\b/,
  /\bx_mint_generation_capability_v1\b/,
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

/** Object-store provider SDKs. None is authorized in this slice (SO-2 AUTH §17, §32). */
export const PROVIDER_SDK_PACKAGE =
  /^(@aws-sdk\/|aws-sdk$|@vercel\/blob|@google-cloud\/storage|@azure\/storage|@smithy\/|minio$|s3-)/;

/** The M7 runtime files: the engine, the session module, and every productive so1/so2/runtime file. */
function m7RuntimeFiles(productive: readonly string[]): string[] {
  return productive.filter(
    (f) =>
      f === M7_PARTICIPANT_CCA_ENGINE_MODULE ||
      f === M7_SESSION_MODULE ||
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

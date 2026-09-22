// PagaMenos · CCA static capability + dependency-closure enforcement (Amendment 01 §15–§20, §42–§45, §48.2).
//
// Runs the analyzer over the REAL source tree (so a future productive executor is covered the moment
// it exists), over the fixture topology, and over virtual probe overlays reproducing every §48.2
// escape. Every probe must FAIL CLOSED.
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  analyzeAdapterClosure,
  analyzeCcaTopology,
  analyzeExecutorClosure,
  analyzeM7So1Topology,
  analyzeM7EntryGuardOrder,
  ambientViolations,
  extractImportEdges,
  fsSourceProvider,
  isTestOrFixture,
  overlayProvider,
  resolveSpecifier,
  roleOf,
  M7_PARTICIPANT_CCA_ENGINE_MODULE,
  M7_SESSION_MODULE,
  M7_SO1_EXPECTED_INPUT_KEYS,
  M7_SO1_MODULES,
  type SourceProvider,
} from './capability-analysis';

const SRC = path.resolve(process.cwd(), 'src');
const tree: SourceProvider = fsSourceProvider(SRC);

const EXECUTOR = 'cca/__probe__/probe.cca-executor.ts';
const INTERFACE = 'cca/__probe__/probe.cca-adapter-interface.ts';

const INTERFACE_SOURCE = `export interface ProbeAdapter { persist(v: string): Promise<void> }`;

/** A compliant probe executor plus overlay files. */
function probe(executorBody: string, extra: Record<string, string> = {}): SourceProvider {
  return overlayProvider(tree, {
    [INTERFACE]: INTERFACE_SOURCE,
    [EXECUTOR]: executorBody,
    ...extra,
  });
}

const COMPLIANT = `
import type { LockedCollectionScope } from '@/cca/locked-scope';
import type { ProbeAdapter } from './probe.cca-adapter-interface';
export async function probeExecutor(
  input: Readonly<{ note: string }>,
  scope: LockedCollectionScope,
  adapter: ProbeAdapter,
): Promise<void> {
  await adapter.persist(input.note + scope.assignmentId);
}`;

function closureViolations(source: string, extra: Record<string, string> = {}): string[] {
  return [...analyzeExecutorClosure(EXECUTOR, probe(source, extra)).violations];
}

describe('real source tree topology (§32, §42)', () => {
  it('has no CCA topology violation in production source', () => {
    expect(analyzeCcaTopology(tree)).toEqual([]);
  });

  it('has no CCA topology violation with the fixture leaf/executor/adapter included', () => {
    expect(analyzeCcaTopology(tree, { includeFixtures: true })).toEqual([]);
  });

  it('classifies the fixture roles and the engine exactly', () => {
    expect(roleOf('db/cca-engine.ts')).toBe('ENGINE');
    expect(roleOf('cca/__fixtures__/foundation.cca-leaf.ts')).toBe('LEAF');
    expect(roleOf('cca/__fixtures__/foundation.cca-executor.ts')).toBe('EXECUTOR');
    expect(roleOf('cca/__fixtures__/foundation.cca-adapter.ts')).toBe('ADAPTER_IMPL');
    expect(roleOf('cca/__fixtures__/foundation.cca-adapter-interface.ts')).toBe(
      'ADAPTER_INTERFACE',
    );
    expect(roleOf('services/study-consent.ts')).toBe('OTHER');
  });

  it('the fixture executor closure is exactly {adapter interface, type-only CCA contract}', () => {
    const report = analyzeExecutorClosure('cca/__fixtures__/foundation.cca-executor.ts', tree);
    expect(report.violations).toEqual([]);
    expect(report.entries.map((e) => `${e.class}:${e.module}`).sort()).toEqual([
      'APPROVED_TRACKED_ADAPTER_INTERFACE:cca/__fixtures__/foundation.cca-adapter-interface.ts',
      'PURE:cca/locked-scope.ts',
    ]);
    expect(report.entries.every((e) => e.typeOnly)).toBe(true);
  });

  it('a compliant probe executor passes (the analyzer is not vacuously failing)', () => {
    expect(closureViolations(COMPLIANT)).toEqual([]);
  });
});

describe('§48.2 executor direct DB escape — every case FAILS CLOSED', () => {
  // Each attack is layered ON TOP of the compliant executor, so the executor still has its one
  // adapter interface and the ONLY violation left is the attack itself. Every case asserts the
  // SPECIFIC diagnostic, so weakening a classification rule cannot be masked by an unrelated one.
  const cases: Array<[string, string, RegExp]> = [
    [
      'imports @/db/client',
      `import { prisma } from '@/db/client';\nexport const attack = prisma;`,
      /db\/client\.ts: FORBIDDEN_DB_CAPABLE \(DB-capable layer\)/,
    ],
    [
      'imports @prisma/client',
      `import { PrismaClient } from '@prisma/client';\nexport const attack = PrismaClient;`,
      /@prisma\/client: FORBIDDEN_DB_CAPABLE \(Prisma package\)/,
    ],
    [
      'type-only @prisma/client (§44)',
      `import type { PrismaClient } from '@prisma/client';\nexport type Attack = PrismaClient;`,
      /@prisma\/client: FORBIDDEN_DB_CAPABLE \(Prisma package\)/,
    ],
    [
      'imports an accepted A2 repository (§38)',
      `import { purchaseIntentRepository } from '@/db/purchase-intent-repository';\nexport const attack = purchaseIntentRepository;`,
      /db\/purchase-intent-repository\.ts: FORBIDDEN_DB_CAPABLE/,
    ],
    [
      'imports an accepted A1 repository (§38)',
      `import { studyConsentRepository } from '@/db/study-consent-repository';\nexport const attack = studyConsentRepository;`,
      /db\/study-consent-repository\.ts: FORBIDDEN_DB_CAPABLE/,
    ],
    [
      'imports the assignment repository (§37, §38)',
      `import { experimentAssignmentRepository } from '@/db/study-assignment-repository';\nexport const attack = experimentAssignmentRepository;`,
      /db\/study-assignment-repository\.ts: FORBIDDEN_DB_CAPABLE/,
    ],
    [
      'imports the generic repository barrel',
      `import * as db from '@/db';\nexport const attack = db;`,
      /db\/index\.ts: FORBIDDEN_DB_CAPABLE/,
    ],
    [
      'imports the consent fact reader / raw SQL helper layer',
      `import { readConsentAuthorizationFacts } from '@/db/study-support';\nexport const attack = readConsentAuthorizationFacts;`,
      /db\/study-support\.ts: FORBIDDEN_DB_CAPABLE/,
    ],
    [
      'imports the CCA engine (§16)',
      `import { defineSealedOperation } from '@/db/cca-engine';\nexport const attack = defineSealedOperation;`,
      /db\/cca-engine\.ts: FORBIDDEN_DB_CAPABLE \(executor → engine/,
    ],
    [
      'imports the private tracked-adapter implementation (§17)',
      `import { foundationFixtureAdapter } from '@/cca/__fixtures__/foundation.cca-adapter';\nexport const attack = foundationFixtureAdapter;`,
      /foundation\.cca-adapter\.ts: FORBIDDEN_DB_CAPABLE \(executor → adapter implementation/,
    ],
    [
      'imports another executor (§20)',
      `import { foundationFixtureExecutor } from '@/cca/__fixtures__/foundation.cca-executor';\nexport const attack = foundationFixtureExecutor;`,
      /foundation\.cca-executor\.ts: FORBIDDEN_DB_CAPABLE \(executor → another executor/,
    ],
    [
      'imports a SECOND adapter interface (§15 item 3)',
      `import type { FoundationFixtureAdapter } from '@/cca/__fixtures__/foundation.cca-adapter-interface';\nexport type Attack = FoundationFixtureAdapter;`,
      /ALTERNATE_TRACKED_ADAPTER/,
    ],
    [
      'uses a computed dynamic import (§42)',
      `const spec = '@/db/client';\nexport const attack = async () => import(spec);`,
      /NON_LITERAL_DYNAMIC_IMPORT_FORBIDDEN/,
    ],
    [
      'uses a literal dynamic import of a forbidden module (§42)',
      `export const attack = async () => import('@/db/client');`,
      /db\/client\.ts: FORBIDDEN_DB_CAPABLE/,
    ],
    [
      'uses require() (§42)',
      `export const attack = () => require('@/db/client');`,
      /AMBIENT:require/,
    ],
    [
      'uses a namespace import of a repository (§42)',
      `import * as repo from '@/db/study-consent-repository';\nexport const attack = repo;`,
      /db\/study-consent-repository\.ts: FORBIDDEN_DB_CAPABLE/,
    ],
    [
      're-exports a restricted module (§42)',
      `export * from '@/db/client';`,
      /EXECUTOR_REEXPORT_FORBIDDEN|db\/client\.ts: FORBIDDEN_DB_CAPABLE/,
    ],
    [
      'reaches the DB through a pure-looking helper (§43 transitive closure)',
      `import { helper } from './innocent-helper';\nexport const attack = helper;`,
      /innocent-helper\.ts -\[import\]-> @\/db\/client => db\/client\.ts: FORBIDDEN_DB_CAPABLE/,
    ],
    [
      'uses a service locator on globalThis (§42, §45)',
      `export const attack = () => (globalThis as unknown as { pagamenosPrisma: unknown }).pagamenosPrisma;`,
      /AMBIENT:globalThis/,
    ],
    [
      'uses the global symbol registry as a locator (§42)',
      `export const attack = () => Reflect.get(Object, Symbol.for('pagamenos.db'));`,
      /AMBIENT:Symbol\.for/,
    ],
    [
      'uses a DI container package (§15, §18)',
      `import { container } from 'tsyringe';\nexport const attack = container;`,
      /tsyringe: UNCLASSIFIED/,
    ],
    [
      'attempts raw SQL through a $-member (§15)',
      `export const attack = (c: { $queryRaw: (s: string) => Promise<unknown> }) => c.$queryRaw('SELECT 1');`,
      /RAW_CLIENT_MEMBER:\$queryRaw/,
    ],
    [
      'value-imports a CCA capability module instead of type-importing it',
      `import { mintLockedCollectionScope } from '@/cca/locked-scope';\nexport const attack = mintLockedCollectionScope;`,
      /locked-scope\.ts: FORBIDDEN_DB_CAPABLE \(value import of a CCA capability module\)/,
    ],
    [
      'imports an unclassified local module (§43 fail closed)',
      `import { effectiveConsentState } from '@/study';\nexport const attack = effectiveConsentState;`,
      /study\/index\.ts: UNCLASSIFIED/,
    ],
    [
      'imports a node builtin (§15)',
      `import { readFileSync } from 'node:fs';\nexport const attack = readFileSync;`,
      /node:fs: UNCLASSIFIED/,
    ],
    [
      'imports a module that does not exist (fail closed)',
      `import { x } from './missing-module';\nexport const attack = x;`,
      /\.\/missing-module: UNCLASSIFIED/,
    ],
  ];

  for (const [name, attack, expected] of cases) {
    it(`FAILS: executor ${name}`, () => {
      const violations = closureViolations(`${COMPLIANT}\n${attack}`, {
        'cca/__probe__/innocent-helper.ts': `import { prisma } from '@/db/client';\nexport const helper = () => prisma;`,
      });
      expect(violations.join('\n'), `${name}: expected the specific diagnostic`).toMatch(expected);
    });
  }

  it('the transitive case names EVERY hop, not just the direct import (§43)', () => {
    const violations = closureViolations(
      `${COMPLIANT}\nimport { helper } from './innocent-helper';\nexport const attack = helper;`,
      {
        'cca/__probe__/innocent-helper.ts': `import { second } from './second-hop';\nexport const helper = second;`,
        'cca/__probe__/second-hop.ts': `import { studyConsentRepository } from '@/db/study-consent-repository';\nexport const second = studyConsentRepository;`,
      },
    );
    const text = violations.join('\n');
    expect(text).toMatch(/innocent-helper\.ts: UNCLASSIFIED/);
    expect(text).toMatch(/second-hop\.ts -\[import\]-> @\/db\/study-consent-repository/);
  });

  it('an executor with NO adapter interface at all fails closed', () => {
    expect(closureViolations(`export const attack = 1;`).join('\n')).toMatch(
      /NO_ADAPTER_INTERFACE/,
    );
  });
});

describe('§48.3 / topology probes — leaf, adapter and engine rules', () => {
  const LEAF = 'cca/__probe__/probe.cca-leaf.ts';
  const ADAPTER = 'cca/__probe__/probe.cca-adapter.ts';
  const base = {
    [INTERFACE]: INTERFACE_SOURCE,
    [EXECUTOR]: COMPLIANT,
    [ADAPTER]: `import type { Prisma } from '@prisma/client';\nexport const probeAdapter = {} as unknown as Prisma.TransactionClient;`,
  };
  const leaf = (body: string, extra: Record<string, string> = {}) =>
    analyzeCcaTopology(overlayProvider(tree, { ...base, [LEAF]: body, ...extra }), {
      includeFixtures: true,
    }).filter((v) => v.includes('__probe__'));

  const COMPLIANT_LEAF = `
import { defineSealedOperation } from '@/db/cca-engine';
import { probeAdapter } from './probe.cca-adapter';
import { probeExecutor } from './probe.cca-executor';
export const probeOperation = defineSealedOperation({
  operationId: 'probe', policy: 'GENERAL_COLLECTION',
  parseInput: (raw: unknown) => raw as { assignmentId: string },
  assignmentRef: (i: { assignmentId: string }) => i.assignmentId,
  lockOrder: { ranks: ['EXPERIMENT_ASSIGNMENT'] }, adapter: probeAdapter, executor: probeExecutor,
} as never);`;

  it('a compliant leaf passes', () => {
    expect(leaf(COMPLIANT_LEAF)).toEqual([]);
  });

  it('FAILS: a leaf that defines its operation inside a function (runtime registry)', () => {
    expect(
      leaf(COMPLIANT_LEAF.replace('export const probeOperation =', 'export const make = () =>')),
    ).toContainEqual(expect.stringContaining('DEFINITION_NOT_AT_MODULE_SCOPE'));
  });

  it('FAILS: a leaf importing a second leaf, a repository or Prisma', () => {
    expect(
      leaf(
        `${COMPLIANT_LEAF}\nimport { recordFoundationFixture } from '@/cca/__fixtures__/foundation.cca-leaf';\nexport const other = recordFoundationFixture;`,
      ),
    ).toContainEqual(expect.stringContaining('CROSS_LEAF_IMPORT'));
    expect(
      leaf(`${COMPLIANT_LEAF}\nimport { prisma } from '@/db/client';\nexport const p = prisma;`),
    ).toContainEqual(expect.stringContaining('LEAF_DB_EDGE_OUTSIDE_ENGINE'));
    expect(
      leaf(`${COMPLIANT_LEAF}\nimport { Prisma } from '@prisma/client';\nexport const p = Prisma;`),
    ).toContainEqual(expect.stringContaining('LEAF_PRISMA_IMPORT'));
  });

  it('FAILS: a leaf that re-exports the engine or exports more than its operation', () => {
    expect(leaf(`${COMPLIANT_LEAF}\nexport * from '@/db/cca-engine';`)).toContainEqual(
      expect.stringContaining('LEAF_REEXPORT_FORBIDDEN'),
    );
    expect(leaf(`${COMPLIANT_LEAF}\nexport const extra = 1;`)).toContainEqual(
      expect.stringContaining('LEAF_EXPORTS_MORE_THAN_OPERATION'),
    );
  });

  it('FAILS: an engine, executor or adapter import from a non-leaf module', () => {
    const bad = analyzeCcaTopology(
      overlayProvider(tree, {
        ...base,
        [LEAF]: COMPLIANT_LEAF,
        'cca/__probe__/outsider.ts': `import { defineSealedOperation } from '@/db/cca-engine';\nimport { probeExecutor } from './probe.cca-executor';\nexport const x = [defineSealedOperation, probeExecutor];`,
      }),
      { includeFixtures: true },
    );
    expect(bad).toContainEqual(expect.stringContaining('ENGINE_IMPORT_OUTSIDE_LEAF'));
    expect(bad).toContainEqual(expect.stringContaining('EXECUTOR_IMPORT_OUTSIDE_LEAF'));
  });

  it('FAILS: an adapter implementation that opens a transaction or touches experiment_assignment', () => {
    const v = analyzeCcaTopology(
      overlayProvider(tree, {
        ...base,
        [LEAF]: COMPLIANT_LEAF,
        [ADAPTER]: `import type { Prisma } from '@prisma/client';
export const probeAdapter = {
  async op(tx: Prisma.TransactionClient) {
    await (tx as unknown as { $transaction: (f: unknown) => Promise<void> }).$transaction(async () => undefined);
    await tx.$queryRawUnsafe('SELECT 1 FROM "experiment_assignment"');
  },
};`,
      }),
      { includeFixtures: true },
    );
    expect(v).toContainEqual(expect.stringContaining('ADAPTER_NEW_TRANSACTION'));
    expect(v).toContainEqual(expect.stringContaining('ADAPTER_IMPL_DIRECT_ASSIGNMENT_ACCESS'));
  });

  it('FAILS: an adapter interface module containing runtime code', () => {
    const v = analyzeCcaTopology(
      overlayProvider(tree, {
        ...base,
        [LEAF]: COMPLIANT_LEAF,
        [INTERFACE]: `${INTERFACE_SOURCE}\nexport const helper = () => 1;`,
      }),
      { includeFixtures: true },
    );
    expect(v).toContainEqual(expect.stringContaining('ADAPTER_INTERFACE_NOT_TYPES_ONLY'));
  });

  it('FAILS: a capability primitive referenced outside its owner', () => {
    for (const [primitive, source] of [
      [
        'runCcaTransaction',
        `import { runCcaTransaction } from '@/cca/execution-context';\nexport const x = runCcaTransaction;`,
      ],
      [
        'installTransactionGovernance',
        `import { installTransactionGovernance } from '@/cca/execution-context';\nexport const x = installTransactionGovernance;`,
      ],
      [
        'constructTrackedAdapter',
        `import { constructTrackedAdapter } from '@/cca/tracked-adapter';\nexport const x = constructTrackedAdapter;`,
      ],
      [
        'mintLockedCollectionScope',
        `import { mintLockedCollectionScope } from '@/cca/locked-scope';\nexport const x = mintLockedCollectionScope;`,
      ],
    ] as const) {
      const v = analyzeCcaTopology(overlayProvider(tree, { 'services/evil-service.ts': source }));
      expect(v.join('\n'), primitive).toMatch(
        new RegExp(`CAPABILITY_PRIMITIVE_FORBIDDEN:${primitive}`),
      );
    }
  });

  it('FAILS: node:async_hooks imported outside the execution-context module', () => {
    const v = analyzeCcaTopology(
      overlayProvider(tree, {
        'services/evil-service.ts': `import { AsyncLocalStorage } from 'node:async_hooks';\nexport const x = AsyncLocalStorage.snapshot();`,
      }),
    );
    expect(v).toContainEqual(expect.stringContaining('ASYNC_HOOKS_IMPORT_FORBIDDEN'));
  });

  it('FAILS: a CCA foundation module taking a database edge', () => {
    const v = analyzeCcaTopology(
      overlayProvider(tree, {
        'cca/rogue.ts': `import { prisma } from '@/db/client';\nexport const x = prisma;`,
      }),
    );
    expect(v).toContainEqual(expect.stringContaining('CCA_FOUNDATION_DB_EDGE'));
  });
});

describe('analyzer primitives', () => {
  it('extracts every edge shape', () => {
    const edges = extractImportEdges(`
      import a from './a';
      import type { B } from './b';
      import { type C } from './c';
      import * as d from './d';
      export * from './e';
      export { f } from './f';
      export type { G } from './g';
      const p = await import('./h');
      const q = await import(dynamic);
      const r = require('./i');
      type J = import('./j').J;
    `);
    const byKind = edges.map((e) => `${e.kind}:${e.specifier}`);
    expect(byKind).toEqual(
      expect.arrayContaining([
        'import:./a',
        'import:./b',
        'import:./c',
        'import:./d',
        'reexport:./e',
        'reexport:./f',
        'reexport:./g',
        'dynamic:./h',
        'nonliteral:dynamic',
        'require:./i',
        'import:./j',
      ]),
    );
    expect(edges.find((e) => e.specifier === './b')!.typeOnly).toBe(true);
    expect(edges.find((e) => e.specifier === './c')!.typeOnly).toBe(true);
    expect(edges.find((e) => e.specifier === './a')!.typeOnly).toBe(false);
    expect(edges.find((e) => e.specifier === './e')!.exportStar).toBe(true);
  });

  it('resolves alias, relative, extension and index spellings to the same module', () => {
    for (const spec of [
      '@/cca/locked-scope',
      '@/cca/locked-scope.js',
      './locked-scope',
      '../cca/locked-scope.ts',
    ]) {
      expect(resolveSpecifier(spec, 'cca/probe.ts', tree)).toEqual({
        type: 'local',
        rel: 'cca/locked-scope.ts',
      });
    }
    expect(resolveSpecifier('@/study', 'cca/probe.ts', tree)).toEqual({
      type: 'local',
      rel: 'study/index.ts',
    });
    expect(resolveSpecifier('zod', 'cca/probe.ts', tree)).toEqual({
      type: 'external',
      name: 'zod',
    });
  });

  it('detects ambient locator routes', () => {
    expect(ambientViolations('export const a = globalThis;')).toContain('AMBIENT:globalThis');
    expect(ambientViolations('export const a = () => eval("1");')).toContain('AMBIENT:eval');
    expect(ambientViolations('export const a = Symbol.for("x");')).toContain('AMBIENT:Symbol.for');
    expect(ambientViolations('export const a = (c: any) => c.$transaction();')).toContain(
      'RAW_CLIENT_MEMBER:$transaction',
    );
    expect(ambientViolations('export const a = (c: any) => c["$queryRaw"]();')).toContain(
      'RAW_CLIENT_MEMBER:$queryRaw',
    );
    expect(ambientViolations('export const a = 1;')).toEqual([]);
  });
});

// ===================================================================================================
// AUD-CCA-FND-01 REGRESSION — tracked-adapter separate DB capability escape.
//
// Independent audit built a PRODUCTIVE CCA topology in which the adapter implementation obtained a
// completely separate Prisma capability, and the superseded analyzer returned
//     adapter violations = []   total violations = 0
// because it inspected only direct, LOCAL edges. Every probe below reproduces one spelling of that
// escape through a FULLY COMPLIANT topology (leaf -> executor -> interface -> adapter), so the
// detected violation is the ATTACK ITSELF and never a missing fixture, and each asserts the exact
// diagnostic. The accepted path — an adapter that receives the hidden TransactionClient from the
// engine and imports Prisma TYPE-ONLY — must stay green.
// ===================================================================================================
describe('AUD-CCA-FND-01 — adapter capability closure (§16, §17, §21, §39)', () => {
  const EVIL_LEAF = 'persistence/evil.cca-leaf.ts';
  const EVIL_EXEC = 'persistence/evil.cca-executor.ts';
  const EVIL_IFACE = 'persistence/evil.cca-adapter-interface.ts';
  const EVIL_ADAPTER = 'persistence/evil.cca-adapter.ts';

  /** A complete, otherwise-valid productive topology whose ADAPTER carries the attack. */
  function productiveTopology(adapterSource: string, extra: Record<string, string> = {}) {
    return overlayProvider(tree, {
      [EVIL_IFACE]: `export interface EvilAdapter { persist(v: string): Promise<void> }`,
      [EVIL_EXEC]: `
import type { LockedCollectionScope } from '@/cca/locked-scope';
import type { EvilAdapter } from './evil.cca-adapter-interface';
export async function evilExecutor(
  input: Readonly<{ note: string }>,
  scope: LockedCollectionScope,
  adapter: EvilAdapter,
): Promise<void> {
  await adapter.persist(input.note + scope.assignmentId);
}`,
      [EVIL_ADAPTER]: adapterSource,
      [EVIL_LEAF]: `
import { defineSealedOperation } from '@/db/cca-engine';
import { evilAdapter } from './evil.cca-adapter';
import { evilExecutor } from './evil.cca-executor';
export const evilOperation = defineSealedOperation({
  operationId: 'evil', policy: 'GENERAL_COLLECTION',
  parseInput: (raw: unknown) => raw as { assignmentId: string },
  assignmentRef: (i: { assignmentId: string }) => i.assignmentId,
  lockOrder: { ranks: ['EXPERIMENT_ASSIGNMENT'] }, adapter: evilAdapter, executor: evilExecutor,
} as never);`,
      ...extra,
    });
  }

  /** The legitimate shape: the hidden TransactionClient arrives as a parameter, types only. */
  const LEGITIMATE_ADAPTER = `
import type { Prisma } from '@prisma/client';
import { requireLockedAssignment } from '@/cca/locked-scope';
import type { AdapterImplementation } from '@/cca/tracked-adapter';
import type { EvilAdapter } from './evil.cca-adapter-interface';
export const evilAdapter: AdapterImplementation<Prisma.TransactionClient, EvilAdapter> = {
  async persist(tx, { scope }, v: string) {
    requireLockedAssignment(scope, scope.assignmentId);
    await tx.$executeRaw\`INSERT INTO "cca_fixture_marker" ("assignment_id","label") VALUES (\${scope.assignmentId}::uuid, \${v})\`;
  },
};`;

  const topologyViolations = (provider: ReturnType<typeof productiveTopology>): string[] =>
    analyzeCcaTopology(provider, { includeFixtures: true }).filter(
      (x) => x.startsWith('ADAPTER ') || x.includes('evil'),
    );

  it('G — the LEGITIMATE hidden-transaction adapter (type-only Prisma) stays GREEN', () => {
    expect(topologyViolations(productiveTopology(LEGITIMATE_ADAPTER))).toEqual([]);
    expect(
      analyzeAdapterClosure(EVIL_ADAPTER, productiveTopology(LEGITIMATE_ADAPTER)).violations,
    ).toEqual([]);
  });

  it('G — the shipped fixture adapter and the real tree stay GREEN', () => {
    const report = analyzeAdapterClosure('cca/__fixtures__/foundation.cca-adapter.ts', tree);
    expect(report.violations).toEqual([]);
    expect(report.entries.some((e) => e.module === '@prisma/client' && e.typeOnly)).toBe(true);
    expect(analyzeCcaTopology(tree, { includeFixtures: true })).toEqual([]);
  });

  // ---- the exploit, in every spelling ------------------------------------------------------------
  const attacks: Array<[string, string, RegExp, Record<string, string>?]> = [
    [
      'A — adapter constructs its own PrismaClient (the exact independent-audit exploit)',
      `import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export const evilAdapter = {
  async persist(_tx: unknown, _b: unknown, v: string) {
    await prisma.$executeRawUnsafe('INSERT INTO "cca_fixture_marker" VALUES ($1)', v);
  },
};`,
      /ADAPTER_PRISMA_CLIENT_CONSTRUCTION|RUNTIME_PRISMA_CAPABILITY/,
    ],
    [
      'A2 — value import of @prisma/client without constructing it',
      `import { Prisma } from '@prisma/client';
export const evilAdapter = { async persist() { return Prisma; } };`,
      /RUNTIME_PRISMA_CAPABILITY/,
    ],
    [
      'A3 — namespace import of @prisma/client',
      `import * as prisma from '@prisma/client';
export const evilAdapter = { async persist() { return prisma; } };`,
      /RUNTIME_PRISMA_CAPABILITY/,
    ],
    [
      'A4 — dynamic import of @prisma/client',
      `export const evilAdapter = { async persist() { return import('@prisma/client'); } };`,
      /RUNTIME_PRISMA_CAPABILITY/,
    ],
    [
      'A5 — static template dynamic import of @prisma/client',
      'export const evilAdapter = { async persist() { return import(`@prisma/client`); } };',
      /RUNTIME_PRISMA_CAPABILITY/,
    ],
    [
      'A6 — computed dynamic import',
      `const spec = '@prisma/client';
export const evilAdapter = { async persist() { return import(spec); } };`,
      /NON_LITERAL_DYNAMIC_IMPORT_FORBIDDEN/,
    ],
    [
      'A7 — re-export of the Prisma package',
      `export * from '@prisma/client';
export const evilAdapter = { async persist() {} };`,
      /RUNTIME_PRISMA_CAPABILITY/,
    ],
    [
      'A8 — require() of the Prisma package',
      `export const evilAdapter = { async persist() { return require('@prisma/client'); } };`,
      /require\(\) is not a permitted adapter edge|ADAPTER_AMBIENT_CAPABILITY/,
    ],
    [
      'C — adapter imports the shared raw DB client',
      `import { prisma } from '@/db/client';
export const evilAdapter = { async persist() { return prisma; } };`,
      /db\/client\.ts: FORBIDDEN_DB_CAPABLE \(separate DB capability/,
    ],
    [
      'C2 — adapter imports the DB client by relative traversal',
      `import { prisma } from '../db/client';
export const evilAdapter = { async persist() { return prisma; } };`,
      /db\/client\.ts: FORBIDDEN_DB_CAPABLE \(separate DB capability/,
    ],
    [
      'D — adapter imports an accepted A1 repository',
      `import { studyConsentRepository } from '@/db/study-consent-repository';
export const evilAdapter = { async persist() { return studyConsentRepository; } };`,
      /db\/study-consent-repository\.ts: FORBIDDEN_DB_CAPABLE/,
    ],
    [
      'D2 — adapter imports an accepted A2 repository',
      `import { purchaseIntentRepository } from '@/db/purchase-intent-repository';
export const evilAdapter = { async persist() { return purchaseIntentRepository; } };`,
      /db\/purchase-intent-repository\.ts: FORBIDDEN_DB_CAPABLE/,
    ],
    [
      'E — adapter reaches Prisma through an innocent-looking helper (transitive)',
      `import { helper } from '@/lib/innocent-helper';
export const evilAdapter = { async persist() { return helper(); } };`,
      /innocent-helper\.ts -\[import\]-> @prisma\/client => @prisma\/client: FORBIDDEN_DB_CAPABLE/,
      {
        'lib/innocent-helper.ts': `import { PrismaClient } from '@prisma/client';\nexport const helper = () => new PrismaClient();`,
      },
    ],
    [
      'E2 — adapter reaches the DB client through a two-hop helper chain',
      `import { helper } from '@/lib/innocent-helper';
export const evilAdapter = { async persist() { return helper(); } };`,
      /second-hop\.ts -\[import\]-> @\/db\/client => db\/client\.ts: FORBIDDEN_DB_CAPABLE/,
      {
        'lib/innocent-helper.ts': `import { second } from '@/lib/second-hop';\nexport const helper = second;`,
        'lib/second-hop.ts': `import { prisma } from '@/db/client';\nexport const second = () => prisma;`,
      },
    ],
    [
      'E3 — adapter reaches a repository through a helper',
      `import { helper } from '@/lib/innocent-helper';
export const evilAdapter = { async persist() { return helper(); } };`,
      /innocent-helper\.ts -\[import\]-> @\/db\/study-assignment-repository/,
      {
        'lib/innocent-helper.ts': `import { experimentAssignmentRepository } from '@/db/study-assignment-repository';\nexport const helper = () => experimentAssignmentRepository;`,
      },
    ],
    [
      'F — adapter opens a second transaction on the supplied client',
      `import type { Prisma } from '@prisma/client';
export const evilAdapter = {
  async persist(tx: Prisma.TransactionClient) {
    await (tx as unknown as { $transaction: (f: unknown) => Promise<void> }).$transaction(async () => undefined);
  },
};`,
      /ADAPTER_NEW_TRANSACTION/,
    ],
    [
      'F2 — adapter imports a transaction helper module',
      `import { runCcaTransaction } from '@/cca/execution-context';
export const evilAdapter = { async persist() { return runCcaTransaction; } };`,
      /CAPABILITY_PRIMITIVE_FORBIDDEN:runCcaTransaction|cca\/execution-context\.ts: UNCLASSIFIED/,
    ],
    [
      'F3 — adapter reaches a DB service locator on globalThis',
      `export const evilAdapter = {
  async persist() { return (globalThis as unknown as { pagamenosPrisma: unknown }).pagamenosPrisma; },
};`,
      /ADAPTER_AMBIENT_CAPABILITY \(AMBIENT:globalThis\)/,
    ],
  ];

  for (const [name, adapterSource, expected, extra] of attacks) {
    it(`FAILS: ${name}`, () => {
      const provider = productiveTopology(adapterSource, extra);
      // B — the violation must come from the FULL productive topology, not from a missing fixture.
      const topology = topologyViolations(provider).join('\n');
      expect(topology, `${name}: topology must reject`).toMatch(expected);
      // …and the adapter closure itself must name it.
      const closure = analyzeAdapterClosure(EVIL_ADAPTER, provider).violations.join('\n');
      expect(closure, `${name}: adapter closure must reject`).toMatch(expected);
    });
  }

  it('B — the full productive topology is otherwise valid: ONLY the adapter escape is reported', () => {
    const provider = productiveTopology(
      `import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export const evilAdapter = { async persist() { return prisma; } };`,
    );
    const violations = topologyViolations(provider);
    expect(violations.length).toBeGreaterThan(0);
    // No leaf/executor/interface complaint: the topology is compliant apart from the adapter.
    for (const v of violations) {
      expect(v, `unexpected non-adapter violation: ${v}`).toMatch(/ADAPTER|evil\.cca-adapter\.ts/);
    }
    // The same topology with the legitimate adapter is completely clean.
    expect(topologyViolations(productiveTopology(LEGITIMATE_ADAPTER))).toEqual([]);
  });

  it('the legacy db/** and persistence/** raw-capability exemption does NOT cover CCA adapters', () => {
    // src/lib/module-capability.test.ts exempts db/ and persistence/ from the legacy raw check
    // (A1/A2 need that). The CCA rule must overlay a stricter rule on adapter implementations
    // WHEREVER they live — including inside those very directories.
    for (const dir of ['persistence', 'db']) {
      const path = `${dir}/legacy-exempt.cca-adapter.ts`;
      const provider = overlayProvider(tree, {
        [path]: `import { PrismaClient } from '@prisma/client';
export const a = { async op() { return new PrismaClient(); } };`,
      });
      expect(analyzeAdapterClosure(path, provider).violations.join('\n'), dir).toMatch(
        /RUNTIME_PRISMA_CAPABILITY|ADAPTER_PRISMA_CLIENT_CONSTRUCTION/,
      );
    }
  });

  it('type-only Prisma cannot smuggle a PrismaClient VALUE through the same exemption', () => {
    const provider = productiveTopology(
      `import type { Prisma } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
export const evilAdapter = {
  async persist(_tx: Prisma.TransactionClient) { return new PrismaClient(); },
};`,
    );
    const closure = analyzeAdapterClosure(EVIL_ADAPTER, provider).violations.join('\n');
    expect(closure).toMatch(/RUNTIME_PRISMA_CAPABILITY/);
    expect(closure).toMatch(/ADAPTER_PRISMA_CLIENT_CONSTRUCTION/);
  });

  it('changing `import type` into a runtime import is detected on its own', () => {
    const typeOnly = productiveTopology(LEGITIMATE_ADAPTER);
    expect(analyzeAdapterClosure(EVIL_ADAPTER, typeOnly).violations).toEqual([]);
    const runtime = productiveTopology(
      LEGITIMATE_ADAPTER.replace(
        "import type { Prisma } from '@prisma/client';",
        "import { Prisma } from '@prisma/client';",
      ),
    );
    expect(analyzeAdapterClosure(EVIL_ADAPTER, runtime).violations.join('\n')).toMatch(
      /RUNTIME_PRISMA_CAPABILITY/,
    );
  });
});

// ===================================================================================================
// M7 SO-1 PRODUCTIVE TOPOLOGY (AUTH §21, §25, §26; M7 V1.1 §8.2, §9.2–§9.5, §18.3)
//
// Everything above this line is the ACCEPTED CCA foundation enforcement and is unchanged. The suites
// below extend it to the productive Outcome path. Every negative control is a virtual overlay over
// the REAL tree, so a mutation is judged in the real topology, not in a toy one.
// ===================================================================================================

const M7_LEAF = M7_SO1_MODULES.leaf;
const M7_EXECUTOR = M7_SO1_MODULES.executor;
const M7_ADAPTER = M7_SO1_MODULES.adapter;
const M7_ENGINE = M7_PARTICIPANT_CCA_ENGINE_MODULE;

/** The real source of a module, for mutation probes that patch one line of the genuine article. */
function realSource(rel: string): string {
  const code = tree.read(rel);
  if (code === null) throw new Error(`missing productive module ${rel}`);
  return code;
}

/** Source with comments removed, so a prose mention is never mistaken for a code construct. */
function codeOnly(rel: string): string {
  return realSource(rel)
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** Productive modules only: tests, fixtures, probes and this CI analyzer are not application code. */
function productiveModules(): string[] {
  return tree.list().filter((rel) => !isTestOrFixture(rel) && rel !== 'cca/capability-analysis.ts');
}

function providerFor(overlay: Record<string, string | null>): SourceProvider {
  return Object.keys(overlay).length === 0 ? tree : overlayProvider(tree, overlay);
}

/** M7 SO-1 topology rules only. */
function m7Violations(overlay: Record<string, string | null> = {}): string[] {
  return [...analyzeM7So1Topology(providerFor(overlay)).violations];
}

/**
 * The ACCEPTED CCA topology rules only, for the mutations whose expected diagnostic comes from the
 * accepted analyzer (LEAF_DB_EDGE_OUTSIDE_ENGINE, LEAF_PRISMA_IMPORT). Kept separate because the
 * accepted whole-topology pass is the expensive one and most M7 mutations do not need it.
 */
function ccaViolations(overlay: Record<string, string | null> = {}): string[] {
  return [...analyzeCcaTopology(providerFor(overlay))];
}

describe('AUTH §25 — the productive SO-1 topology is exactly one sealed operation', () => {
  it('the real tree has NO M7 SO-1 topology violation', () => {
    expect(analyzeM7So1Topology(tree).violations).toEqual([]);
  });

  it('the accepted CCA topology stays green WITH the productive SO-1 modules present', () => {
    expect(analyzeCcaTopology(tree)).toEqual([]);
  });

  it('there is exactly one Outcome leaf, executor, adapter interface and adapter implementation', () => {
    const { roleCounts } = analyzeM7So1Topology(tree);
    expect(roleCounts.LEAF).toBe(1);
    expect(roleCounts.EXECUTOR).toBe(1);
    expect(roleCounts.ADAPTER_INTERFACE).toBe(1);
    expect(roleCounts.ADAPTER_IMPL).toBe(1);
    // Two engines: the accepted CCA foundation engine and the productive M7 specialization.
    expect(roleCounts.ENGINE).toBe(2);
    expect(roleOf(M7_LEAF)).toBe('LEAF');
    expect(roleOf(M7_EXECUTOR)).toBe('EXECUTOR');
    expect(roleOf(M7_ADAPTER)).toBe('ADAPTER_IMPL');
    expect(roleOf(M7_SO1_MODULES.adapterInterface)).toBe('ADAPTER_INTERFACE');
    expect(roleOf(M7_ENGINE)).toBe('ENGINE');
  });

  it('the executor closure is EXACTLY {own adapter interface, type-only contracts}', () => {
    const report = analyzeExecutorClosure(M7_EXECUTOR, tree);
    expect(report.violations).toEqual([]);
    const interfaces = report.entries.filter(
      (e) => e.class === 'APPROVED_TRACKED_ADAPTER_INTERFACE',
    );
    expect(new Set(interfaces.map((e) => e.module))).toEqual(
      new Set([M7_SO1_MODULES.adapterInterface]),
    );
    // Every other edge is PURE and type-only: no runtime DB capability reaches the executor.
    for (const e of report.entries) {
      if (e.class === 'APPROVED_TRACKED_ADAPTER_INTERFACE') continue;
      expect(e.class).toBe('PURE');
      expect(e.typeOnly).toBe(true);
    }
  });

  it('the adapter holds the hidden transaction edge ONLY, with no second capability', () => {
    const report = analyzeAdapterClosure(M7_ADAPTER, tree);
    expect(report.violations).toEqual([]);
    // Its only Prisma edge is type-only, arriving through the types-only context contract.
    const prismaEdges = report.entries.filter((e) => /^@prisma\//.test(e.module));
    expect(prismaEdges.length).toBeGreaterThan(0);
    for (const e of prismaEdges) expect(e.typeOnly).toBe(true);
  });

  it('no Evidence / SO-2 / SO-3 productive module exists, and none is reachable', () => {
    const report = analyzeM7So1Topology(tree);
    expect(report.violations.filter((x) => x.startsWith('M7_SO2_SO3'))).toEqual([]);
    expect(report.violations.filter((x) => x.startsWith('M7_SO1_EVIDENCE_EDGE'))).toEqual([]);
    for (const rel of productiveModules()) {
      expect(rel).not.toMatch(/evidence.*\.cca-(leaf|executor|adapter)/i);
    }
  });

  it('no productive module constructs a second PrismaClient from an M7 credential', () => {
    for (const rel of productiveModules()) {
      if (!/new PrismaClient/.test(codeOnly(rel))) continue;
      // Exactly three construction points: the shared app client, the hidden participant client
      // and the session-issuer client. Each is module-private and never exported.
      expect([M7_ENGINE, M7_SESSION_MODULE, 'db/client.ts']).toContain(rel);
    }
  });

  it('there is no runtime executor registry, generic policy or caller-supplied callback', () => {
    const leaf = codeOnly(M7_LEAF);
    const engine = codeOnly(M7_ENGINE);
    // The definition happens once, at module scope, with a literal policy.
    expect(leaf).toContain("policy: 'GENERAL_COLLECTION'");
    expect(/policy\s*:\s*(args|input|options|params|policy)\b/.test(leaf)).toBe(false);
    // No registry, no lookup table, no dynamic selection of an executor or an adapter.
    for (const pattern of [/registry/i, /\bregister\w*Operation/i, /Map<\s*string\s*,/]) {
      expect(pattern.test(leaf)).toBe(false);
      expect(pattern.test(engine)).toBe(false);
    }
    // The engine's definition surface admits NO replay key, so replay cannot be caller-selected.
    expect(engine).not.toContain('preCcaReplayLookup');
    expect(codeOnly(M7_LEAF)).not.toContain('preCcaReplayLookup');
  });

  it('records the §18.3 credential and secret censuses observed on the real tree', () => {
    const report = analyzeM7So1Topology(tree);
    expect(report.credentialReaders.M7_PARTICIPANT_DATABASE_URL).toEqual([M7_ENGINE]);
    expect(report.credentialReaders.M7_SESSION_ISSUER_DATABASE_URL).toEqual([M7_SESSION_MODULE]);
    expect(report.secretAccessorImporters).toEqual([M7_ENGINE]);
    expect(report.controlPlaneDigestReaders).toEqual([M7_SO1_MODULES.controlPlaneDigest]);
    expect(report.so1InputKeys).toEqual([...M7_SO1_EXPECTED_INPUT_KEYS]);
  });

  it('MUTATION CONTROL — the censuses are not vacuous: removing the engine FAILS', () => {
    expect(m7Violations({ [M7_ENGINE]: null })).not.toEqual([]);
  });
});

describe('AUTH §26 — pre-CCA replay negative controls (every one FAILS CLOSED)', () => {
  const leafWith = (extraImport: string, extraBody = ''): Record<string, string> => ({
    [M7_LEAF]: `${extraImport}\n${realSource(M7_LEAF)}\n${extraBody}`,
  });

  it('FAILS: the leaf imports the shared DB client', () => {
    expect(ccaViolations(leafWith("import { prisma } from '@/db/client';"))).toContainEqual(
      expect.stringContaining('LEAF_DB_EDGE_OUTSIDE_ENGINE:db/client.ts'),
    );
  });

  it('FAILS: the leaf imports a replay repository', () => {
    expect(
      ccaViolations({
        'db/m7-outcome-replay-repository.ts': 'export const lookup = async () => null;',
        ...leafWith("import { lookup } from '@/db/m7-outcome-replay-repository';"),
      }),
    ).toContainEqual(
      expect.stringContaining('LEAF_DB_EDGE_OUTSIDE_ENGINE:db/m7-outcome-replay-repository.ts'),
    );
  });

  it('FAILS: the leaf imports @prisma/client', () => {
    expect(
      ccaViolations(leafWith("import { PrismaClient } from '@prisma/client';")),
    ).toContainEqual(expect.stringContaining('LEAF_PRISMA_IMPORT'));
  });

  it('FAILS: the leaf reaches a generic query function through an innocent helper', () => {
    expect(
      ccaViolations({
        'db/m7-query-helper.ts':
          "import { prisma } from './client';\nexport const query = (sql: string) => prisma.$queryRawUnsafe(sql);",
        ...leafWith("import { query } from '@/db/m7-query-helper';"),
      }),
    ).toContainEqual(expect.stringContaining('LEAF_DB_EDGE_OUTSIDE_ENGINE:db/m7-query-helper.ts'));
  });

  it('FAILS: the Outcome leaf selects an Evidence replay implementation', () => {
    expect(
      m7Violations({
        'm7/so1/evidence-replay.ts': 'export const evidenceReplay = async () => null;',
        ...leafWith("import { evidenceReplay } from '@/m7/so1/evidence-replay';"),
      }),
    ).toContainEqual(expect.stringContaining('M7_SO1_EVIDENCE_EDGE'));
  });

  it('FAILS: the leaf imports a second Evidence adapter/executor family', () => {
    expect(
      m7Violations({
        'm7/so1/m7-evidence.cca-executor.ts': 'export const x = 1;',
        ...leafWith("import { x } from '@/m7/so1/m7-evidence.cca-executor';"),
      }),
    ).not.toEqual([]);
  });

  it('FAILS: the engine exposes a generic raw query helper', () => {
    const mutated = realSource(M7_ENGINE).replace(
      'export function defineSealedOutcomeAssertionOperation',
      'export async function query(sql: string) { return participant().$queryRawUnsafe(sql); }\nexport function defineSealedOutcomeAssertionOperation',
    );
    expect(m7Violations({ [M7_ENGINE]: mutated })).toContainEqual(
      expect.stringContaining('M7_ENGINE_EXPORTS_DB_CAPABILITY:query'),
    );
  });

  it('FAILS: the engine exports its hidden Prisma client', () => {
    const mutated = realSource(M7_ENGINE).replace(
      'let participantClient: PrismaClient | null = null;',
      'export let participantClient: PrismaClient | null = null;',
    );
    expect(m7Violations({ [M7_ENGINE]: mutated })).not.toEqual([]);
  });

  it('FAILS: the engine re-exports anything at all', () => {
    const mutated = `${realSource(M7_ENGINE)}\nexport * from './client';`;
    expect(m7Violations({ [M7_ENGINE]: mutated })).toContainEqual(
      expect.stringContaining('M7_ENGINE_REEXPORT_FORBIDDEN'),
    );
  });

  it('FAILS: a replay helper module holds a transaction the engine could retain across CCA', () => {
    const mutated = realSource(M7_ENGINE).replace(
      'export function defineSealedOutcomeAssertionOperation',
      'export function transaction() { return participant().$transaction; }\nexport function defineSealedOutcomeAssertionOperation',
    );
    expect(m7Violations({ [M7_ENGINE]: mutated })).toContainEqual(
      expect.stringContaining('M7_ENGINE_EXPORTS_DB_CAPABILITY:transaction'),
    );
  });

  it('FAILS: the session secret is added to the SO-1 caller input grammar', () => {
    const mutated = realSource(M7_SO1_MODULES.inputGrammar).replace(
      "  'purchaseIntentId',",
      "  'sessionSecret',\n  'purchaseIntentId',",
    );
    const violations = m7Violations({ [M7_SO1_MODULES.inputGrammar]: mutated });
    expect(violations).toContainEqual(
      expect.stringContaining('M7_SO1_FORBIDDEN_INPUT_KEY:sessionSecret'),
    );
    expect(violations).toContainEqual(expect.stringContaining('M7_SO1_INPUT_KEY_SET'));
  });

  it.each(['assignmentId', 'participantId', 'capturedAt', 'manifestSha256', 'policy', 'callback'])(
    'FAILS: the forbidden caller input %s is added to the grammar',
    (key) => {
      const mutated = realSource(M7_SO1_MODULES.inputGrammar).replace(
        "  'purchaseIntentId',",
        `  '${key}',\n  'purchaseIntentId',`,
      );
      expect(m7Violations({ [M7_SO1_MODULES.inputGrammar]: mutated })).toContainEqual(
        expect.stringContaining(`M7_SO1_FORBIDDEN_INPUT_KEY:${key}`),
      );
    },
  );
});

describe('AUTH §21 — M7 credential capability enforcement (every mutation FAILS CLOSED)', () => {
  const PARTICIPANT_ENV = 'M7_PARTICIPANT_DATABASE_URL';
  const ISSUER_ENV = 'M7_SESSION_ISSUER_DATABASE_URL';

  const readsEnv = (key: string): string =>
    `const stolen = process.env['${key}'];\nexport const leak = stolen;\n`;

  it.each([
    ['the leaf', M7_LEAF],
    ['the executor', M7_EXECUTOR],
    ['the adapter', M7_ADAPTER],
  ])('FAILS: %s reads the participant credential', (_label, rel) => {
    const mutated = `${readsEnv(PARTICIPANT_ENV)}${realSource(rel)}`;
    expect(m7Violations({ [rel]: mutated })).toContainEqual(
      expect.stringContaining(`M7_CREDENTIAL_READER_CENSUS:${PARTICIPANT_ENV}`),
    );
  });

  it('FAILS: a random service reads the participant credential', () => {
    expect(
      m7Violations({ 'services/random-service.ts': readsEnv(PARTICIPANT_ENV) }),
    ).toContainEqual(expect.stringContaining(`M7_CREDENTIAL_READER_CENSUS:${PARTICIPANT_ENV}`));
  });

  it('FAILS: the CCA engine reads the session-issuer credential', () => {
    const mutated = `${readsEnv(ISSUER_ENV)}${realSource(M7_ENGINE)}`;
    expect(m7Violations({ [M7_ENGINE]: mutated })).toContainEqual(
      expect.stringContaining(`M7_CREDENTIAL_READER_CENSUS:${ISSUER_ENV}`),
    );
  });

  it('FAILS: the session module reads the participant credential', () => {
    const mutated = `${readsEnv(PARTICIPANT_ENV)}${realSource(M7_SESSION_MODULE)}`;
    expect(m7Violations({ [M7_SESSION_MODULE]: mutated })).toContainEqual(
      expect.stringContaining(`M7_CREDENTIAL_READER_CENSUS:${PARTICIPANT_ENV}`),
    );
  });

  it('FAILS: a second PrismaClient is constructed from the participant URL elsewhere', () => {
    expect(
      m7Violations({
        'services/shadow-client.ts':
          "import { PrismaClient } from '@prisma/client';\n" +
          `export const shadow = new PrismaClient({ datasourceUrl: process.env['${PARTICIPANT_ENV}'] });\n`,
      }),
    ).toContainEqual(expect.stringContaining(`M7_CREDENTIAL_READER_CENSUS:${PARTICIPANT_ENV}`));
  });

  it('FAILS: a credential is re-exported through a helper or a barrel', () => {
    expect(
      m7Violations({
        'lib/m7-env.ts': `export const participantUrl = process.env['${PARTICIPANT_ENV}'];`,
      }),
    ).toContainEqual(expect.stringContaining(`M7_CREDENTIAL_READER_CENSUS:${PARTICIPANT_ENV}`));
  });

  it.each([
    'M7_PRIVACY_REQUEST_DATABASE_URL',
    'M7_STORAGE_WORKER_DATABASE_URL',
    'M7_DELETION_AUTHORITY_DATABASE_URL',
    'M7_CAPABILITY_SIGNER_DATABASE_URL',
  ])('FAILS: the out-of-scope credential %s appears in productive source', (key) => {
    expect(m7Violations({ 'services/premature.ts': readsEnv(key) })).toContainEqual(
      expect.stringContaining(`M7_CREDENTIAL_NOT_IN_THIS_SLICE:${key}`),
    );
  });
});

describe('AUTH §20 — the raw session secret is reachable from exactly one module', () => {
  it.each([
    ['the leaf', M7_LEAF],
    ['the executor', M7_EXECUTOR],
    ['the adapter', M7_ADAPTER],
  ])('FAILS: %s imports the secret accessor', (_label, rel) => {
    const mutated =
      "import { readM7ParticipantSessionSecret } from '@/services/m7-participant-session';\n" +
      realSource(rel);
    expect(m7Violations({ [rel]: mutated })).toContainEqual(
      expect.stringContaining('M7_SESSION_SECRET_ACCESSOR_CENSUS'),
    );
  });

  it('FAILS: a public barrel or a participant-facing module imports the session module', () => {
    expect(
      m7Violations({
        'services/participant-facing.ts':
          "import { issueM7ParticipantSession } from './m7-participant-session';\nexport const go = issueM7ParticipantSession;",
      }),
    ).toContainEqual(
      expect.stringContaining('M7_SESSION_MODULE_IMPORT:services/participant-facing.ts'),
    );
  });

  it('FAILS: the types-only operation-context contract gains runtime code', () => {
    const rel = 'm7/so1/m7-participant-operation-context.ts';
    const mutated = `${realSource(rel)}\nexport const leak = () => 1;`;
    expect(m7Violations({ [rel]: mutated })).toContainEqual(
      expect.stringContaining('M7_TYPES_ONLY_MODULE_HAS_RUNTIME_CODE'),
    );
  });
});

describe('AUTH §30 — SO-1 is NOT publicly wired in this pre-LC-1 slice', () => {
  it('no app route, UI, client hook or public services barrel reaches the SO-1 path', () => {
    const report = analyzeM7So1Topology(tree);
    expect(report.violations.filter((x) => x.startsWith('M7_SO1_PUBLIC_EXPOSURE'))).toEqual([]);
  });

  it.each([
    ['a Next.js route', 'app/api/m7/outcome/route.ts'],
    ['the public services barrel', 'services/index.ts'],
  ])('FAILS: %s exposes the sealed operation', (_label, rel) => {
    const base = rel === 'services/index.ts' ? realSource(rel) : '';
    expect(
      m7Violations({
        [rel]: `${base}\nimport { recordAuthorizedOutcomeAssertion } from '@/m7/so1/m7-outcome-assertion.cca-leaf';\nexport const POST = recordAuthorizedOutcomeAssertion;\n`,
      }),
    ).toContainEqual(expect.stringContaining('M7_SO1_PUBLIC_EXPOSURE'));
  });
});

describe('AUTH §13 — the sealed definition surface admits no injected capability', () => {
  it('rejects an unknown definition key, so no replay/callback/policy can be injected', async () => {
    const { defineSealedOutcomeAssertionOperation } =
      await import('@/db/m7-participant-cca-engine');
    const { m7OutcomeAssertionLockOrder, m7OutcomeAssertionAdapter } =
      await import('@/m7/so1/m7-outcome-assertion.cca-adapter');
    const { m7OutcomeAssertionExecutor } =
      await import('@/m7/so1/m7-outcome-assertion.cca-executor');
    const { parseOutcomeAssertionInput } = await import('@/m7/so1/outcome-assertion-input');
    const base = {
      operationId: 'probe',
      policy: 'GENERAL_COLLECTION' as const,
      parseInput: parseOutcomeAssertionInput,
      lockOrder: m7OutcomeAssertionLockOrder,
      adapter: m7OutcomeAssertionAdapter,
      executor: m7OutcomeAssertionExecutor,
    };
    // The accepted control: the genuine definition is accepted.
    expect(() => defineSealedOutcomeAssertionOperation(base)).not.toThrow();
    for (const injected of [
      'preCcaReplayLookup',
      'replay',
      'query',
      'callback',
      'client',
      'transaction',
      'assignmentRef',
    ]) {
      expect(() =>
        defineSealedOutcomeAssertionOperation({
          ...base,
          [injected]: () => undefined,
        } as never),
      ).toThrowError(/CCA_INVALID_DEFINITION/);
    }
  });

  it('rejects any policy other than the sealed SO-1 policy', async () => {
    const { defineSealedOutcomeAssertionOperation } =
      await import('@/db/m7-participant-cca-engine');
    const { m7OutcomeAssertionLockOrder, m7OutcomeAssertionAdapter } =
      await import('@/m7/so1/m7-outcome-assertion.cca-adapter');
    const { m7OutcomeAssertionExecutor } =
      await import('@/m7/so1/m7-outcome-assertion.cca-executor');
    const { parseOutcomeAssertionInput } = await import('@/m7/so1/outcome-assertion-input');
    expect(() =>
      defineSealedOutcomeAssertionOperation({
        operationId: 'probe',
        policy: 'OPTIONAL_EVIDENCE',
        parseInput: parseOutcomeAssertionInput,
        lockOrder: m7OutcomeAssertionLockOrder,
        adapter: m7OutcomeAssertionAdapter,
        executor: m7OutcomeAssertionExecutor,
      } as never),
    ).toThrowError(/CCA_INVALID_DEFINITION/);
  });

  it('the sealed surface exposes only `execute`, and rejects a third argument', async () => {
    const { recordAuthorizedOutcomeAssertion } =
      await import('@/m7/so1/m7-outcome-assertion.cca-leaf');
    expect(Object.keys(recordAuthorizedOutcomeAssertion)).toEqual(['execute']);
    expect(Object.isFrozen(recordAuthorizedOutcomeAssertion)).toBe(true);
    await expect(
      (
        recordAuthorizedOutcomeAssertion.execute as unknown as (...a: unknown[]) => Promise<unknown>
      )({}, {}, () => undefined),
    ).rejects.toThrowError(/CCA_SEALED_SURFACE_VIOLATION/);
  });
});

describe('AUD-M7-SO1-01 — the CCA entry guard precedes ALL database-reaching SO-1 work (rule M13)', () => {
  const ENGINE_SRC = (): string => realSource(M7_ENGINE);
  const GUARD_LINE = '    assertCcaEntryTopology();\n';
  const RESOLVE_IN_TX =
    '          const assignmentId = await resolveAssignmentReference(input.purchaseIntentId);\n' +
    '          if (assignmentId === null) throw new NotAuthorizedRollback();\n';
  const MATCH_ANCHOR = "    if (lookup.lookup_status === 'MATCH') {";
  const DIGEST_ANCHOR = '    const expectedManifestSha256 = expectedControlPlaneManifestDigest();';

  function mutate(from: string, to: string, base = ENGINE_SRC()): string {
    expect(base.includes(from), `mutation anchor missing: ${from.slice(0, 60)}`).toBe(true);
    return base.replace(from, to);
  }
  const order = (code: string): string[] => analyzeM7EntryGuardOrder(code);

  it('the real engine satisfies the order rule exactly', () => {
    expect(order(ENGINE_SRC())).toEqual([]);
    expect(analyzeM7So1Topology(tree).violations.filter((x) => x.startsWith('M7_'))).toEqual([]);
  });

  it('FAILS: the preflight guard is removed (only runCcaTransaction would check)', () => {
    expect(order(mutate(GUARD_LINE, ''))).toContain('M7_ENTRY_GUARD_MISSING');
  });

  it('FAILS: the guard is moved below assignment resolution', () => {
    const v = order(
      mutate(
        GUARD_LINE,
        '    const early = await resolveAssignmentReference(input.purchaseIntentId);\n' +
          GUARD_LINE,
      ),
    );
    expect(v).toContain('M7_DB_WORK_BEFORE_ENTRY_GUARD:resolveAssignmentReference');
    expect(v).toContain('M7_ASSIGNMENT_RESOLVED_OUTSIDE_CCA_TRANSACTION');
  });

  it('FAILS: the guard is moved below the pre-CCA replay lookup', () => {
    const v = order(mutate(MATCH_ANCHOR, GUARD_LINE + MATCH_ANCHOR, mutate(GUARD_LINE, '')));
    expect(v).toContain('M7_DB_WORK_BEFORE_ENTRY_GUARD:lookupOutcomeReceipt');
    expect(v).toContain('M7_DB_WORK_BEFORE_ENTRY_GUARD:expectedControlPlaneManifestDigest');
    expect(v).toContain('M7_DB_WORK_BEFORE_ENTRY_GUARD:readM7ParticipantSessionSecret');
  });

  it('FAILS: a replay is performed before the guard', () => {
    const v = order(
      mutate(
        GUARD_LINE,
        '    await lookupOutcomeReceipt("x", Buffer.alloc(32), context.participantId, input);\n' +
          GUARD_LINE,
      ),
    );
    expect(v).toContain('M7_DB_WORK_BEFORE_ENTRY_GUARD:lookupOutcomeReceipt');
    expect(v).toContain('M7_PRE_CCA_REPLAY_CALL_COUNT:2');
  });

  it('FAILS: a replay MATCH is returned before the guard', () => {
    const v = order(
      mutate(
        GUARD_LINE,
        '    const hit = await lookupOutcomeReceipt("x", Buffer.alloc(32), context.participantId, input);\n' +
          "    if (hit.lookup_status === 'MATCH') return hit as never;\n" +
          GUARD_LINE,
      ),
    );
    expect(v).toContain('M7_RETURN_BEFORE_ENTRY_GUARD');
    expect(v).toContain('M7_DB_WORK_BEFORE_ENTRY_GUARD:lookupOutcomeReceipt');
  });

  it('FAILS: assignment resolution happens before CCA (the rejected-candidate ordering)', () => {
    const v = order(
      mutate(
        DIGEST_ANCHOR,
        DIGEST_ANCHOR +
          '\n    const assignmentId = await resolveAssignmentReference(input.purchaseIntentId);\n' +
          '    if (assignmentId === null) return NOT_AUTHORIZED as NotAuthorized;',
        mutate(RESOLVE_IN_TX, ''),
      ),
    );
    expect(v).toContain('M7_ASSIGNMENT_RESOLVED_OUTSIDE_CCA_TRANSACTION');
  });

  it('FAILS: the rejected candidate 8dcf0a81 engine, reproduced in full order', () => {
    // resolveAssignmentReference → lookupOutcomeReceipt → MATCH return → runCcaTransaction, no guard.
    const rejectedShape = `
      function defineSealedOutcomeAssertionOperation() {
        return sealOperation(async (context, rawInput) => {
          const input = parseInput(rawInput);
          const expectedManifestSha256 = expectedControlPlaneManifestDigest();
          const sessionSecret = readM7ParticipantSessionSecret(context);
          const assignmentId = await resolveAssignmentReference(input.purchaseIntentId);
          const lookup = await lookupOutcomeReceipt(expectedManifestSha256, sessionSecret, context.participantId, input);
          if (lookup.lookup_status === 'MATCH') return lookup;
          return await runCcaTransaction(participant(), {}, async () => 1);
        });
      }`;
    const v = order(rejectedShape);
    expect(v).toContain('M7_ENTRY_GUARD_MISSING');
  });

  it('FAILS: the guard is made conditional', () => {
    expect(
      order(
        mutate(GUARD_LINE, '    if (input.purchaseIntentId === "") assertCcaEntryTopology();\n'),
      ),
    ).toContain('M7_ENTRY_GUARD_NOT_UNCONDITIONAL_TOP_LEVEL');
  });

  it('FAILS: the guard precedence is inverted (transaction checked before re-entry)', () => {
    const src = ENGINE_SRC();
    const swapped = src
      .replace('if (state.ccaActive) {', 'if (state.__TMP__) {')
      .replace('if (state.transactionActive) {', 'if (state.ccaActive) {')
      .replace('if (state.__TMP__) {', 'if (state.transactionActive) {');
    expect(swapped).not.toBe(src);
    expect(order(swapped)).toContain('M7_ENTRY_GUARD_PRECEDENCE');
  });

  it('FAILS: the guard performs its own I/O or awaits', () => {
    const v = order(
      mutate(
        '  const state = readDatabaseExecutionState();',
        '  const state = readDatabaseExecutionState();\n  void participant();',
      ),
    );
    expect(v.some((x) => x.startsWith('M7_ENTRY_GUARD_CALLS'))).toBe(true);
  });

  it('FAILS: the pre-CCA replay is moved inside the CCA transaction', () => {
    const inTx = mutate(
      RESOLVE_IN_TX,
      RESOLVE_IN_TX +
        '          await lookupOutcomeReceipt(expectedManifestSha256, sessionSecret, context.participantId, input);\n',
    );
    expect(order(inTx)).toContain('M7_PRE_CCA_REPLAY_INSIDE_CCA_TRANSACTION');
  });

  it('the whole-tree analysis reports an order mutation too (not only the unit function)', () => {
    expect(m7Violations({ [M7_ENGINE]: mutate(GUARD_LINE, '') })).toContain(
      'M7_ENTRY_GUARD_MISSING',
    );
  });
});

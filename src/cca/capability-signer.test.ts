// PagaMenos · M7 CAPABILITY SIGNER / TO-8 DB FOUNDATION — static capability closure + negative
// mutation controls (M7 V1.1 §11.7.3, §16.2.3, §18.3, §18.6; XC-6, XF-12, XF-13, XF-16; signer
// AUTH §21, §22).
//
// Runs the analyzer over the REAL source tree, then over virtual overlays that each re-introduce one
// forbidden shape. Every overlay must FAIL CLOSED with the named violation. The DB-role mutations of
// AUTH §22 (storage-worker role gains EXECUTE on x_mint; signer role gains another M7 function) are
// executed against real PostgreSQL by `pnpm m7:signer`, not here.
import { writeFileSync } from 'node:fs';
import path from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import {
  analyzeCcaTopology,
  analyzeM7CapabilitySignerTopology,
  analyzeM7So1Topology,
  analyzeM7So2Topology,
  analyzeTo8ExecutionContext,
  fsSourceProvider,
  overlayProvider,
  M7_CAPABILITY_SIGNER_MODULE,
  M7_PARTICIPANT_CCA_ENGINE_MODULE,
  M7_SESSION_MODULE,
  type SourceProvider,
} from './capability-analysis';
import {
  installTransactionGovernance,
  readDatabaseExecutionDiagnostics,
  type TransactionCapableClient,
} from './execution-context';

const SRC = path.resolve(process.cwd(), 'src');
const tree: SourceProvider = fsSourceProvider(SRC);
const SIGNER = M7_CAPABILITY_SIGNER_MODULE;
const EXEC = 'cca/execution-context.ts';

function real(rel: string): string {
  const code = tree.read(rel);
  if (code === null) throw new Error(`missing ${rel}`);
  return code;
}

/** Replace EXACTLY one occurrence (a mutation that silently does nothing would be a false control). */
function mutate(rel: string, from: string | RegExp, to: string): Record<string, string> {
  const code = real(rel);
  const hits =
    typeof from === 'string'
      ? code.split(from).length - 1
      : (code.match(new RegExp(from, 'g')) ?? []).length;
  if (hits !== 1)
    throw new Error(`mutation anchor matched ${hits} times in ${rel}: ${String(from)}`);
  return { [rel]: code.replace(from, to) };
}

function signerViolations(overlay: Record<string, string | null> = {}): string[] {
  return [...analyzeM7CapabilitySignerTopology(overlayProvider(tree, overlay)).violations];
}

/** Evidence written by the audit packaging step (structured, from the analyzer itself). */
const EVIDENCE: Record<string, unknown> = {};
afterAll(() => {
  const out = process.env.M7_SIGNER_CAPABILITY_EVIDENCE;
  if (out !== undefined && out !== '') {
    writeFileSync(out, `${JSON.stringify(EVIDENCE, null, 2)}\n`, 'utf8');
  }
});

const SIGNATURE =
  'export async function mintCommittedGenerationEnvelope(\n  generationGrantId: string,\n)';

describe('real source tree — signer / TO-8 closure (AUTH §21)', () => {
  it('every signer and TO-8 rule holds, and every accepted CCA / SO-1 / SO-2 rule still holds', () => {
    const report = analyzeM7CapabilitySignerTopology(tree);
    EVIDENCE.realTree = report;
    expect(report.violations).toEqual([]);
    expect(analyzeCcaTopology(tree)).toEqual([]);
    expect(analyzeM7So1Topology(tree).violations).toEqual([]);
    expect(analyzeM7So2Topology(tree).violations).toEqual([]);
  });

  it('exactly one exported productive function with exactly one argument: generationGrantId', () => {
    const r = analyzeM7CapabilitySignerTopology(tree);
    expect(r.signerExports).toEqual(['mintCommittedGenerationEnvelope']);
    expect(r.signerParameters).toEqual(['generationGrantId']);
  });

  it('exactly one productive reader of M7_CAPABILITY_SIGNER_DATABASE_URL', () => {
    const r = analyzeM7CapabilitySignerTopology(tree);
    expect(r.signerDatabaseUrlReaders).toEqual([SIGNER]);
    expect(analyzeM7So1Topology(tree).credentialReaders.M7_CAPABILITY_SIGNER_DATABASE_URL).toEqual([
      SIGNER,
    ]);
  });

  it('the signer binds exactly the one SQL function through exactly one statement', () => {
    const r = analyzeM7CapabilitySignerTopology(tree);
    expect(r.signerDbFunctions).toEqual(['x_mint_generation_capability_v1']);
    expect(r.signerStatements).toHaveLength(1);
    expect(r.signerStatements[0]).toMatch(
      /FROM m7\.x_mint_generation_capability_v1\(\?::text, \?::uuid\) AS m$/,
    );
  });

  it('the signer reaches only its four allowed local modules and @prisma/client', () => {
    const r = analyzeM7CapabilitySignerTopology(tree);
    expect(r.signerLocalImports).toEqual([
      'cca/execution-context.ts',
      'm7/runtime/capability-signer-contract.ts',
      'm7/runtime/control-plane-digest.ts',
      'm7/runtime/m7-errors.ts',
    ]);
    expect(r.signerExternalImports).toEqual(['@prisma/client']);
    expect(r.signerImporters).toEqual([]);
  });

  it('exactly four PrismaClient construction points, each once', () => {
    expect(analyzeM7CapabilitySignerTopology(tree).prismaClientConstructionPoints).toEqual({
      'db/client.ts': 1,
      [M7_PARTICIPANT_CCA_ENGINE_MODULE]: 1,
      [M7_SESSION_MODULE]: 1,
      [SIGNER]: 1,
    });
  });

  it('the execution-context TO-8 rules hold on the real module', () => {
    expect(analyzeTo8ExecutionContext(real(EXEC))).toEqual([]);
  });
});

// ─── AUTH §22 negative mutations — each must FAIL CLOSED ─────────────────────────────────────────
const CONTROLS: Array<[string, () => Record<string, string>, string]> = [
  [
    '01 a second module reads the signer DB env',
    () => ({
      'services/signer-leak.ts':
        "export const u = process.env['M7_CAPABILITY_SIGNER_DATABASE_URL'];",
    }),
    'X2_SIGNER_CREDENTIAL_READERS',
  ],
  [
    '02 signer accepts canonicalObjectKey',
    () =>
      mutate(
        SIGNER,
        SIGNATURE,
        SIGNATURE.replace('string,\n)', 'string,\n  canonicalObjectKey: string,\n)'),
      ),
    'X1_SIGNER_FORBIDDEN_PARAMETER:canonicalObjectKey',
  ],
  [
    '03 signer accepts validUntil',
    () =>
      mutate(
        SIGNER,
        SIGNATURE,
        SIGNATURE.replace('string,\n)', 'string,\n  validUntil: string,\n)'),
      ),
    'X1_SIGNER_FORBIDDEN_PARAMETER:validUntil',
  ],
  [
    '04 signer accepts backendSha256',
    () =>
      mutate(
        SIGNER,
        SIGNATURE,
        SIGNATURE.replace('string,\n)', 'string,\n  backendSha256: string,\n)'),
      ),
    'X1_SIGNER_FORBIDDEN_PARAMETER:backendSha256',
  ],
  [
    '05 signer accepts credentialProfileId',
    () =>
      mutate(
        SIGNER,
        SIGNATURE,
        SIGNATURE.replace('string,\n)', 'string,\n  credentialProfileId: string,\n)'),
      ),
    'X1_SIGNER_FORBIDDEN_PARAMETER:credentialProfileId',
  ],
  [
    '06 signer accepts operation',
    () =>
      mutate(
        SIGNER,
        SIGNATURE,
        SIGNATURE.replace('string,\n)', 'string,\n  operation: string,\n)'),
      ),
    'X1_SIGNER_FORBIDDEN_PARAMETER:operation',
  ],
  [
    '07 signer accepts a transaction callback',
    () =>
      mutate(
        SIGNER,
        SIGNATURE,
        SIGNATURE.replace('string,\n)', 'string,\n  callback: (tx: unknown) => unknown,\n)'),
      ),
    'X1_SIGNER_FORBIDDEN_PARAMETER:callback',
  ],
  [
    '07b signer takes an options bag instead of the opaque id',
    () =>
      mutate(
        SIGNER,
        SIGNATURE,
        'export async function mintCommittedGenerationEnvelope(\n  { generationGrantId }: { generationGrantId: string },\n)',
      ),
    'X1_SIGNER_PARAMETER_PATTERN',
  ],
  [
    '07c signer grows a second optional argument (arity)',
    () =>
      mutate(SIGNER, SIGNATURE, SIGNATURE.replace('string,\n)', 'string,\n  extra?: string,\n)')),
    'X1_SIGNER_ARITY:2',
  ],
  [
    '08 signer exports its Prisma client',
    () => ({ [SIGNER]: `${real(SIGNER)}\nexport const client = (): PrismaClient => signer();\n` }),
    'X1_SIGNER_EXPORT_SET',
  ],
  [
    '09 signer imports db/client',
    () => ({
      [SIGNER]: `import { prisma as shared } from '@/db/client';\n${real(SIGNER)}\nvoid shared;\n`,
    }),
    'X3_SIGNER_IMPORTS_SHARED_CLIENT',
  ],
  [
    '10 signer imports the CCA engine',
    () => ({
      [SIGNER]: `import { defineSealedOutcomeAssertionOperation as d } from '@/db/m7-participant-cca-engine';\n${real(SIGNER)}\nvoid d;\n`,
    }),
    'X3_SIGNER_IMPORTS_CCA_ENGINE:db/m7-participant-cca-engine.ts',
  ],
  [
    '11 signer opens a raw $transaction bypassing TO-8 registration',
    () =>
      mutate(
        SIGNER,
        'await runM7CapabilitySignerTransaction(\n    signer(),\n    TO8_TRANSACTION_OPTIONS,\n',
        'await signer().$transaction(\n',
      ),
    'X6_SIGNER_FORBIDDEN_IDENTIFIER:$transaction',
  ],
  [
    '12 the TO-8 runner proceeds inside an active registered transaction (guard removed)',
    () =>
      mutate(
        EXEC,
        / {2}if \(state\.transactionActive\) \{\n {4}counters\.m7CapabilitySignerRejectedBeforeDatabase\+\+;\n {4}throw new M7CapabilitySignerTransactionError\(\n {6}'TO8_TRANSACTION_ALREADY_ACTIVE',\n[^]*?\n {2}\}\n/,
        '',
      ),
    'TO8_RUNNER_GUARD_NOT_SECOND',
  ],
  [
    '12b the TO-8 runner opens the transaction BEFORE its guard',
    () =>
      mutate(
        EXEC,
        '  const state = readDatabaseExecutionState();\n  if (state.transactionActive) {\n    counters.m7CapabilitySignerRejectedBeforeDatabase++;',
        '  void signerRawTransactions.get(client)?.(async () => 0, options);\n  const state = readDatabaseExecutionState();\n  if (state.transactionActive) {\n    counters.m7CapabilitySignerRejectedBeforeDatabase++;',
      ),
    'TO8_RUNNER_STATE_NOT_READ_FIRST',
  ],
  [
    '13 CCA runs successfully inside an active TO-8 frame (CCA refusal weakened)',
    () =>
      mutate(
        EXEC,
        '  if (state.transactionActive) {\n    counters.ccaRejectedBeforeDatabase++;',
        "  if (state.transactionActive && state.transactionAuthority !== 'M7_CAPABILITY_SIGNER') {\n    counters.ccaRejectedBeforeDatabase++;",
      ),
    'TO8_CCA_TOP_LEVEL_REFUSAL_CHANGED',
  ],
  [
    '13b a TO-8 frame is hidden from transactionActive',
    () =>
      mutate(
        EXEC,
        '    transactionActive: frames.length > 0,',
        "    transactionActive: frames.some((f) => f.authority !== 'M7_CAPABILITY_SIGNER'),",
      ),
    'TO8_STATE_TRANSACTION_ACTIVE_NOT_ALL_FRAMES',
  ],
  [
    '13c the TO-8 frame masquerades as ACCEPTED_OWNER',
    () =>
      mutate(
        EXEC,
        "    authority: 'M7_CAPABILITY_SIGNER',\n    parent: storage.getStore(),",
        "    authority: 'ACCEPTED_OWNER',\n    parent: storage.getStore(),",
      ),
    'TO8_RUNNER_FRAME_KIND_NOT_FIXED',
  ],
  [
    '14 the TO-8 result escapes the callback before commit (external action on the rows)',
    () =>
      mutate(
        SIGNER,
        '    (tx) =>\n      (tx as Prisma.TransactionClient)',
        '    (tx) =>\n      exfiltrateBeforeCommit(tx as Prisma.TransactionClient)',
      ),
    'X7_SIGNER_CALLBACK_CALLS:exfiltrateBeforeCommit',
  ],
  [
    '14b the TO-8 result is captured into an outer binding before commit',
    () => {
      const m = mutate(
        SIGNER,
        '    (tx) =>\n      (tx as Prisma.TransactionClient)',
        '    (tx) =>\n      (captured = (tx as Prisma.TransactionClient)',
      );
      const code = m[SIGNER]!.replace('AS m`,\n  ).catch', 'AS m`),\n  ).catch').replace(
        'let signerClient',
        'let captured: unknown = null;\nlet signerClient',
      );
      return { [SIGNER]: code };
    },
    'X7_SIGNER_CALLBACK_ASSIGNS',
  ],
  [
    '15 the signer performs a second DB statement outside the TO-8 transaction',
    () =>
      mutate(
        SIGNER,
        '  const manifestSha256 = expectedControlPlaneManifestDigest();\n',
        '  const manifestSha256 = expectedControlPlaneManifestDigest();\n  await signer().$queryRaw`SELECT 1`;\n',
      ),
    'X6_SIGNER_STATEMENT_OUTSIDE_TO8_TRANSACTION',
  ],
  [
    '18 a generic transaction-owner selector appears',
    () => ({
      [EXEC]: `${real(EXEC)}\nexport async function runTransaction(ownerKind: string, fn: () => Promise<unknown>) {\n  return fn();\n}\n`,
    }),
    'TO8_GENERIC_TRANSACTION_API:runTransaction',
  ],
  [
    '19 a second AsyncLocalStorage appears in the execution context',
    () =>
      mutate(
        EXEC,
        'const storage = new AsyncLocalStorage<Frame>();',
        'const storage = new AsyncLocalStorage<Frame>();\nconst shadowStorage = new AsyncLocalStorage<Frame>();\nvoid shadowStorage;',
      ),
    'TO8_ASYNC_LOCAL_STORAGE_COUNT:2',
  ],
  [
    '19b a second AsyncLocalStorage appears in another module',
    () => ({
      'lib/shadow-context.ts':
        "import { AsyncLocalStorage } from 'node:async_hooks';\nexport const s = new AsyncLocalStorage();",
    }),
    'TO8_SECOND_ASYNC_LOCAL_STORAGE:lib/shadow-context.ts',
  ],
  [
    '20 the signer imports a provider SDK',
    () => ({
      [SIGNER]: `import { S3Client } from '@aws-sdk/client-s3';\n${real(SIGNER)}\nvoid S3Client;\n`,
    }),
    'X3_SIGNER_PROVIDER_SDK:@aws-sdk/client-s3',
  ],
  [
    '21 a storage-worker runtime appears',
    () => ({ 'm7/worker/m7-storage-worker.ts': 'export const run = (): number => 1;' }),
    'X12_WORKER_RUNTIME_PRESENT:m7/worker/m7-storage-worker.ts',
  ],
  [
    '22 the participant engine imports the signer',
    () => ({
      [M7_PARTICIPANT_CCA_ENGINE_MODULE]: `import { mintCommittedGenerationEnvelope as m } from './m7-capability-signer';\n${real(M7_PARTICIPANT_CCA_ENGINE_MODULE)}\nvoid m;\n`,
    }),
    'X13_PARTICIPANT_ENGINE_IMPORTS_SIGNER',
  ],
  [
    '23 the session module imports the signer',
    () => ({
      [M7_SESSION_MODULE]: `import { mintCommittedGenerationEnvelope as m } from '@/db/m7-capability-signer';\n${real(M7_SESSION_MODULE)}\nvoid m;\n`,
    }),
    'X13_SESSION_MODULE_IMPORTS_SIGNER',
  ],
  [
    '24 the public services barrel exposes the signer',
    () => ({
      'services/index.ts': `${real('services/index.ts')}\nexport { mintCommittedGenerationEnvelope } from '@/db/m7-capability-signer';\n`,
    }),
    'X13_SIGNER_PUBLIC_EXPOSURE:services/index.ts',
  ],
  [
    '25 a second signer PrismaClient',
    () => ({
      [SIGNER]: `${real(SIGNER)}\nconst second = new PrismaClient();\nvoid second;\n`,
    }),
    `X5_PRISMA_CLIENT_CONSTRUCTIONS:${SIGNER}:2`,
  ],
  [
    '26 the signer names another M7 function',
    () =>
      mutate(
        SIGNER,
        'FROM m7.x_mint_generation_capability_v1(',
        'FROM m7.w_claim_upload_intent_v1(',
      ),
    'X8_SIGNER_DB_FUNCTIONS:[w_claim_upload_intent_v1]',
  ],
  [
    '27 the signer reads a second credential',
    () => ({
      [SIGNER]: `${real(SIGNER)}\nexport const w = process.env['M7_STORAGE_WORKER_DATABASE_URL'];\n`,
    }),
    'X9_SIGNER_CREDENTIAL_KEYS',
  ],
  [
    '28 the runner is handed a client other than the hidden sealed signer',
    () =>
      mutate(
        SIGNER,
        '    signer(),\n    TO8_TRANSACTION_OPTIONS,',
        '    new PrismaClient(),\n    TO8_TRANSACTION_OPTIONS,',
      ),
    'X7_SIGNER_RUNNER_CLIENT_NOT_HIDDEN_SIGNER',
  ],
  [
    '29 the TO-8 transaction options become caller-controlled',
    () =>
      mutate(
        SIGNER,
        '    signer(),\n    TO8_TRANSACTION_OPTIONS,',
        '    signer(),\n    { ...TO8_TRANSACTION_OPTIONS, timeout: 0 },',
      ),
    'X7_SIGNER_RUNNER_OPTIONS_NOT_FIXED',
  ],
  [
    '30 the TO-8 runner owner kind gains a selector parameter',
    () =>
      mutate(
        EXEC,
        '  body: (tx: unknown) => Promise<T>,\n): Promise<T> {\n  const state = readDatabaseExecutionState();\n  if (state.transactionActive) {\n    counters.m7CapabilitySignerRejectedBeforeDatabase++;',
        '  body: (tx: unknown) => Promise<T>,\n  ownerKind: string = "M7_CAPABILITY_SIGNER",\n): Promise<T> {\n  const state = readDatabaseExecutionState();\n  if (state.transactionActive) {\n    counters.m7CapabilitySignerRejectedBeforeDatabase++;',
      ),
    'TO8_OWNER_SELECTOR_PARAMETER:runM7CapabilitySignerTransaction:ownerKind',
  ],
];

describe('AUTH §22 — negative mutation controls (each FAILS CLOSED)', () => {
  const observed: Record<string, string[]> = {};
  afterAll(() => {
    EVIDENCE.mutations = observed;
  });
  it.each(CONTROLS)('%s', (label, overlay, expected) => {
    const v = signerViolations(overlay());
    observed[label] = v;
    expect(v.some((x) => x.startsWith(expected))).toBe(true);
  });

  it('31 another module imports the TO-8 runner — refused by the accepted primitive rules', () => {
    const v = analyzeCcaTopology(
      overlayProvider(tree, {
        'services/rogue-signer.ts':
          "import { runM7CapabilitySignerTransaction } from '@/cca/execution-context';\nexport const r = runM7CapabilitySignerTransaction;",
      }),
    );
    observed['31 another module imports the TO-8 runner'] = v;
    expect(v).toContainEqual(
      'services/rogue-signer.ts: CAPABILITY_PRIMITIVE_FORBIDDEN:runM7CapabilitySignerTransaction',
    );
    expect(v).toContainEqual(
      'services/rogue-signer.ts: RESTRICTED_MODULE_IMPORT:cca/execution-context.ts',
    );
  });

  it('32 a second module reads the signer env — the accepted SO-1 credential census also fails', () => {
    const v = analyzeM7So1Topology(
      overlayProvider(tree, {
        'services/signer-leak.ts':
          "export const u = process.env['M7_CAPABILITY_SIGNER_DATABASE_URL'];",
      }),
    ).violations;
    expect(v).toContainEqual(
      expect.stringContaining('M7_CREDENTIAL_READER_CENSUS:M7_CAPABILITY_SIGNER_DATABASE_URL'),
    );
  });

  it('every mutation anchor is live (no control silently mutated nothing)', () => {
    for (const [label, overlay] of CONTROLS) {
      const o = overlay();
      for (const [rel, code] of Object.entries(o)) {
        const before = tree.read(rel);
        expect(code, label).not.toBe(before);
      }
    }
  });
});

// ─── The productive operation refuses malformed input and nested topology BEFORE any DB access ───
describe('signer runtime refusals that need no database (offline)', () => {
  const GRANT = '11111111-2222-4333-8444-555555555555';

  it('malformed / extra-argument calls are refused before any transaction is opened', async () => {
    const { mintCommittedGenerationEnvelope } = await import('@/db/m7-capability-signer');
    const { M7CapabilitySignerError } = await import('@/m7/runtime/capability-signer-contract');
    const before = readDatabaseExecutionDiagnostics();
    for (const bad of ['', 'not-a-uuid', `${GRANT}x`, ` ${GRANT}`, GRANT.replace(/-/g, '')]) {
      await expect(mintCommittedGenerationEnvelope(bad)).rejects.toSatisfy(
        (e: unknown) =>
          e instanceof M7CapabilitySignerError && e.reason === 'INVALID_GENERATION_GRANT_ID',
      );
    }
    for (const bad of [42, null, undefined, { generationGrantId: GRANT }]) {
      await expect(mintCommittedGenerationEnvelope(bad as never)).rejects.toSatisfy(
        (e: unknown) =>
          e instanceof M7CapabilitySignerError && e.reason === 'INVALID_GENERATION_GRANT_ID',
      );
    }
    await expect(
      (mintCommittedGenerationEnvelope as (...a: unknown[]) => Promise<unknown>)(GRANT, {
        canonicalObjectKey: 'k',
      }),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof M7CapabilitySignerError && e.reason === 'INVALID_GENERATION_GRANT_ID',
    );
    const after = readDatabaseExecutionDiagnostics();
    expect(after.m7CapabilitySignerTransactions).toBe(before.m7CapabilitySignerTransactions);
    expect(after.m7CapabilitySignerRejectedBeforeDatabase).toBe(
      before.m7CapabilitySignerRejectedBeforeDatabase,
    );
  });

  it('inside an accepted-owner transaction the signer is refused before its client is ever used', async () => {
    const { mintCommittedGenerationEnvelope } = await import('@/db/m7-capability-signer');
    const { M7CapabilitySignerTransactionError } = await import('./execution-context');
    const savedDigest = process.env.M7_CONTROL_PLANE_MANIFEST_SHA256;
    const savedUrl = process.env.M7_CAPABILITY_SIGNER_DATABASE_URL;
    // An unroutable URL: if anything tried to connect, the test would fail with a connection error
    // instead of the TO-8 refusal.
    process.env.M7_CONTROL_PLANE_MANIFEST_SHA256 = `sha256:${'a'.repeat(64)}`;
    process.env.M7_CAPABILITY_SIGNER_DATABASE_URL =
      'postgresql://nobody:nothing@127.0.0.1:1/never?connect_timeout=1';
    try {
      const calls: unknown[] = [];
      const shared = {
        $transaction: async (...a: unknown[]): Promise<unknown> => {
          calls.push(a);
          return (a[0] as (tx: unknown) => unknown)({});
        },
      } as unknown as TransactionCapableClient;
      installTransactionGovernance(shared);
      const before = readDatabaseExecutionDiagnostics().m7CapabilitySignerRejectedBeforeDatabase;
      let caught: unknown;
      await (shared.$transaction as unknown as (f: () => Promise<void>) => Promise<unknown>)(
        async () => {
          try {
            await mintCommittedGenerationEnvelope(GRANT);
          } catch (e) {
            caught = e;
          }
        },
      );
      expect(caught).toBeInstanceOf(M7CapabilitySignerTransactionError);
      expect((caught as { code: string }).code).toBe('TO8_TRANSACTION_ALREADY_ACTIVE');
      expect(readDatabaseExecutionDiagnostics().m7CapabilitySignerRejectedBeforeDatabase).toBe(
        before + 1,
      );
    } finally {
      process.env.M7_CONTROL_PLANE_MANIFEST_SHA256 = savedDigest;
      if (savedUrl === undefined) delete process.env.M7_CAPABILITY_SIGNER_DATABASE_URL;
      else process.env.M7_CAPABILITY_SIGNER_DATABASE_URL = savedUrl;
      if (savedDigest === undefined) delete process.env.M7_CONTROL_PLANE_MANIFEST_SHA256;
    }
  });
});

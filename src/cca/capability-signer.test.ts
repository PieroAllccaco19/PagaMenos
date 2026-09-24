// PagaMenos · M7 CAPABILITY SIGNER / TO-8 DB FOUNDATION + PPC-1 PHYSICAL PROVIDER CAPABILITY —
// static capability closure + negative mutation controls (M7 V1.1 §11.7.3, §16.2.3, §18.3, §18.6;
// XC-5, XC-6, XC-7, XF-12, XF-13, XF-16, XF-17; signer AUTH §21, §22; PPC-1 review amendments).
//
// PPC-1 re-points X1 to the new single export (D-2), extends X3 / X9 / X12 to the reviewed provider-
// signing allowlist (D-1, D-3), and ADDS X15–X19. Every accepted TO-8 control below is kept; every
// new rule has its own negative control in the "PPC-1" block.
//
// Runs the analyzer over the REAL source tree, then over virtual overlays that each re-introduce one
// forbidden shape. Every overlay must FAIL CLOSED with the named violation. The DB-role mutations of
// AUTH §22 (storage-worker role gains EXECUTE on x_mint; signer role gains another M7 function) are
// executed against real PostgreSQL by `pnpm m7:signer`, not here.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { randomTestCredential } from '../m7/signer/__fixtures__/test-signing-credentials';

import {
  analyzeCcaTopology,
  analyzeM7CapabilitySignerTopology,
  analyzeM7So1Topology,
  analyzeM7So2Topology,
  analyzeProviderSigningPackageManifest,
  analyzeTo8ExecutionContext,
  fsSourceProvider,
  overlayProvider,
  M7_CAPABILITY_SIGNER_MODULE,
  M7_PARTICIPANT_CCA_ENGINE_MODULE,
  M7_PROVIDER_SIGNING_PACKAGES,
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
  'export async function issueGenerationWriteCapability(\n  generationGrantId: string,\n)';
const MINT_SIGNATURE =
  'async function mintCommittedGenerationEnvelope(\n  generationGrantId: string,\n)';
const OP_TAIL =
  '  const credentials = providerCredentials();\n  const envelope = await mintCommittedGenerationEnvelope(generationGrantId);\n  return signCommittedEnvelope(envelope, credentials);\n';
const SIGN_HEAD =
  'async function signCommittedEnvelope(\n  envelope: M7CommittedGenerationEnvelope,\n  credentials: ReadonlyMap<string, SigningCredential>,\n)';
const SDK = '@aws-sdk/s3-request-presigner';

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
    expect(r.signerExports).toEqual(['issueGenerationWriteCapability']);
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

  it('the signer reaches only its four allowed local modules, @prisma/client and the reviewed signing allowlist', () => {
    const r = analyzeM7CapabilitySignerTopology(tree);
    expect(r.signerLocalImports).toEqual([
      'cca/execution-context.ts',
      'm7/runtime/capability-signer-contract.ts',
      'm7/runtime/control-plane-digest.ts',
      'm7/runtime/m7-errors.ts',
    ]);
    expect(r.signerExternalImports).toEqual([
      '@aws-sdk/s3-request-presigner',
      '@prisma/client',
      '@smithy/hash-node',
    ]);
    expect(r.signerImporters).toEqual([]);
  });

  it('PPC-1: exactly one productive importer of any provider-signing package, exactly the allowlist', () => {
    const r = analyzeM7CapabilitySignerTopology(tree);
    expect(M7_PROVIDER_SIGNING_PACKAGES).toEqual([
      '@aws-sdk/s3-request-presigner',
      '@smithy/hash-node',
    ]);
    expect(r.providerSigningImporters).toEqual({
      '@aws-sdk/s3-request-presigner': [SIGNER],
      '@smithy/hash-node': [SIGNER],
    });
    expect([...r.signerSdkBindings].sort()).toEqual(['Hash', 'S3RequestPresigner']);
  });

  it('PPC-1: exactly one productive reader of M7_CAPABILITY_SIGNER_PROVIDER_CREDENTIALS; env-object holders are the reviewed baseline set', () => {
    const r = analyzeM7CapabilitySignerTopology(tree);
    expect(r.providerCredentialReaders).toEqual([SIGNER]);
    expect(
      analyzeM7So1Topology(tree).credentialReaders.M7_CAPABILITY_SIGNER_PROVIDER_CREDENTIALS,
    ).toEqual([SIGNER]);
    expect(r.processEnvObjectHolders).toEqual({
      'lib/env.ts': 2,
      'm7/s03/environment.ts': 1,
      'm7/testkit/context.ts': 1,
      'persistence/build-meta.ts': 1,
    });
  });

  it('PPC-1 (X19): package.json holds exactly the allowlist, exact-pinned, as runtime dependencies', () => {
    const pkg = readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8');
    EVIDENCE.packageManifest = analyzeProviderSigningPackageManifest(pkg);
    expect(analyzeProviderSigningPackageManifest(pkg)).toEqual([]);
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
        'export async function issueGenerationWriteCapability(\n  { generationGrantId }: { generationGrantId: string },\n)',
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
      [M7_PARTICIPANT_CCA_ENGINE_MODULE]: `import { issueGenerationWriteCapability as m } from './m7-capability-signer';\n${real(M7_PARTICIPANT_CCA_ENGINE_MODULE)}\nvoid m;\n`,
    }),
    'X13_PARTICIPANT_ENGINE_IMPORTS_SIGNER',
  ],
  [
    '23 the session module imports the signer',
    () => ({
      [M7_SESSION_MODULE]: `import { issueGenerationWriteCapability as m } from '@/db/m7-capability-signer';\n${real(M7_SESSION_MODULE)}\nvoid m;\n`,
    }),
    'X13_SESSION_MODULE_IMPORTS_SIGNER',
  ],
  [
    '24 the public services barrel exposes the signer',
    () => ({
      'services/index.ts': `${real('services/index.ts')}\nexport { issueGenerationWriteCapability } from '@/db/m7-capability-signer';\n`,
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
  // ─── PPC-1 negative controls (review amendments: static closure 1–8, D-1…D-3) ─────────────────
  [
    'P01 the private TO-8 mint gains a forbidden parameter',
    () =>
      mutate(
        SIGNER,
        MINT_SIGNATURE,
        MINT_SIGNATURE.replace('string,\n)', 'string,\n  validUntil: string,\n)'),
      ),
    'X1_MINT_STEP_SIGNATURE',
  ],
  [
    'P02 the TO-8 mint is exported again (a second entry point)',
    () => mutate(SIGNER, MINT_SIGNATURE, `export ${MINT_SIGNATURE}`),
    'X1_SIGNER_EXPORT_SET',
  ],
  [
    'P03 an envelope-accepting export appears',
    () => ({
      [SIGNER]: `${real(SIGNER)}\nexport async function signEnvelope(envelope: M7CommittedGenerationEnvelope): Promise<unknown> {\n  return signCommittedEnvelope(envelope, new Map());\n}\n`,
    }),
    'X1_SIGNER_EXPORT_SET',
  ],
  [
    'P04 the signing step gains a caller-selected credential parameter',
    () =>
      mutate(
        SIGNER,
        SIGN_HEAD,
        SIGN_HEAD.replace(
          'SigningCredential>,\n)',
          'SigningCredential>,\n  credentialProfileId?: string,\n)',
        ),
      ),
    'X1_SIGN_STEP_SIGNATURE',
  ],
  [
    'P05 a helper module imports the signing package (helper-based escape)',
    () => ({
      'lib/presign-helper.ts': `import { S3RequestPresigner } from '${SDK}';\nexport const P = S3RequestPresigner;\n`,
    }),
    `X12_PROVIDER_SDK_IMPORT:${SDK}:lib/presign-helper.ts`,
  ],
  [
    'P06 the services barrel re-exports the signing package',
    () => ({
      'services/index.ts': `${real('services/index.ts')}\nexport { S3RequestPresigner } from '${SDK}';\n`,
    }),
    `X12_PROVIDER_SDK_REEXPORT:${SDK}:services/index.ts`,
  ],
  [
    'P07 a literal dynamic import of the signing package from a service',
    () => ({
      'services/lazy-signer.ts': `export const load = () => import('${SDK}');\n`,
    }),
    `X12_PROVIDER_SDK_NON_STATIC_EDGE:dynamic:${SDK}:services/lazy-signer.ts`,
  ],
  [
    'P08 a NON-literal dynamic import (census bypass attempt)',
    () => ({
      'services/lazy-signer.ts':
        "const n = ['@aws-sdk', 's3-request-presigner'].join('/');\nexport const load = () => import(n);\n",
    }),
    'X12_NONLITERAL_MODULE_EDGE:services/lazy-signer.ts',
  ],
  [
    'P09 require() of the hash package from a CCA module',
    () => ({
      'cca/hash-escape.ts': "export const h = require('@smithy/hash-node');\n",
    }),
    'X12_PROVIDER_SDK_IMPORT:@smithy/hash-node:cca/hash-escape.ts',
  ],
  [
    'P10 createRequire as a module-loader escape',
    () => ({
      'lib/loader.ts':
        "import { createRequire } from 'node:module';\nconst r = createRequire(import.meta.url);\nexport const x = r('@aws-sdk/s3-request-presigner');\n",
    }),
    'X12_CREATE_REQUIRE:lib/loader.ts',
  ],
  [
    'P11 the SO-1 participant engine imports the signing package',
    () => ({
      [M7_PARTICIPANT_CCA_ENGINE_MODULE]: `import { Hash as H } from '@smithy/hash-node';\n${real(M7_PARTICIPANT_CCA_ENGINE_MODULE)}\nvoid H;\n`,
    }),
    `X12_PROVIDER_SDK_IMPORT:@smithy/hash-node:${M7_PARTICIPANT_CCA_ENGINE_MODULE}`,
  ],
  [
    'P12 the session module imports the signing package',
    () => ({
      [M7_SESSION_MODULE]: `import { S3RequestPresigner as S } from '${SDK}';\n${real(M7_SESSION_MODULE)}\nvoid S;\n`,
    }),
    `X12_PROVIDER_SDK_IMPORT:${SDK}:${M7_SESSION_MODULE}`,
  ],
  [
    'P13 a future worker path imports the signing package',
    () => ({
      'm7/worker/m7-storage-worker.ts': `import { S3RequestPresigner } from '${SDK}';\nexport const W = S3RequestPresigner;\n`,
    }),
    `X12_PROVIDER_SDK_IMPORT:${SDK}:m7/worker/m7-storage-worker.ts`,
  ],
  [
    'P14 the signer imports a NON-allowlisted signing package',
    () => ({
      [SIGNER]: `import { SignatureV4 } from '@smithy/signature-v4';\n${real(SIGNER)}\nvoid SignatureV4;\n`,
    }),
    'X12_PROVIDER_SDK_NOT_ALLOWLISTED:@smithy/signature-v4',
  ],
  [
    'P15 an alternate signing package (aws4) in a library module',
    () => ({ 'lib/aws4-signer.ts': "import aws4 from 'aws4';\nexport const s = aws4;\n" }),
    'X12_PROVIDER_SDK_IMPORT:aws4:lib/aws4-signer.ts',
  ],
  [
    'P16 a second module reads the provider-credential env source',
    () => ({
      'services/cred-leak.ts':
        'export const c = process.env.M7_CAPABILITY_SIGNER_PROVIDER_CREDENTIALS;\n',
    }),
    'X15_PROVIDER_CREDENTIAL_READERS',
  ],
  [
    'P17 a computed process.env key (census bypass attempt)',
    () => ({
      'services/cred-leak.ts':
        "const k = ['M7_CAPABILITY', 'SIGNER_PROVIDER_CREDENTIALS'].join('_');\nexport const c = process.env[k];\n",
    }),
    'X15_COMPUTED_ENV_ACCESS:services/cred-leak.ts',
  ],
  [
    'P18 process.env enumerated',
    () => ({ 'services/env-dump.ts': 'export const all = Object.entries(process.env);\n' }),
    'X15_ENV_OBJECT_HOLDERS',
  ],
  [
    'P19 process.env aliased then indexed',
    () => ({
      'services/env-alias.ts': "const e = process.env;\nexport const c = e['ANY'];\n",
    }),
    'X15_ENV_OBJECT_HOLDERS',
  ],
  [
    'P20 the process object aliased',
    () => ({ 'services/proc-alias.ts': 'const p = process;\nexport const c = p.env.X;\n' }),
    'X15_PROCESS_OBJECT_ESCAPE:services/proc-alias.ts',
  ],
  [
    "P21 process['env'] element access",
    () => ({ 'services/proc-index.ts': "export const c = process['env'];\n" }),
    'X15_PROCESS_ELEMENT_ACCESS:services/proc-index.ts',
  ],
  [
    'P22 eval in productive code',
    () => ({ 'services/dyn.ts': "export const c = eval('process.env');\n" }),
    'X15_DYNAMIC_CODE:eval:services/dyn.ts',
  ],
  [
    'P23 the Function constructor in productive code',
    () => ({ 'services/dyn.ts': "export const f = new Function('return process.env');\n" }),
    'X15_DYNAMIC_CODE:Function:services/dyn.ts',
  ],
  [
    'P24 the signer reads the provider credentials OUTSIDE its loader',
    () => mutate(SIGNER, OP_TAIL, `  void process.env[PROVIDER_CREDENTIALS_ENV];\n${OP_TAIL}`),
    'X9_PROVIDER_CREDENTIALS_READ_OUTSIDE_LOADER',
  ],
  [
    'P25 the signer names a second secret-shaped env key',
    () => ({
      [SIGNER]: `${real(SIGNER)}\nconst OTHER = 'M7_SIGNER_BACKUP_CREDENTIALS';\nvoid OTHER;\n`,
    }),
    'X9_SIGNER_PROVIDER_CREDENTIAL_KEYS',
  ],
  [
    'P26 the signer gains fetch (an HTTP path)',
    () => mutate(SIGNER, OP_TAIL, `  void fetch;\n${OP_TAIL}`),
    'X16_SIGNER_FORBIDDEN_CAPABILITY:fetch',
  ],
  [
    'P27 the signer logs',
    () => mutate(SIGNER, OP_TAIL, `  console.log(generationGrantId);\n${OP_TAIL}`),
    'X16_SIGNER_FORBIDDEN_CAPABILITY:console',
  ],
  [
    'P28 the signer imports an HTTP client module',
    () => ({ [SIGNER]: `import { request } from 'node:https';\n${real(SIGNER)}\nvoid request;\n` }),
    'X3_SIGNER_EXTERNAL_EDGE:node:https',
  ],
  [
    'P29 the signer hand-rolls HMAC signing',
    () => ({
      [SIGNER]: `import { createHmac } from 'node:crypto';\n${real(SIGNER)}\nvoid createHmac;\n`,
    }),
    'X16_SIGNER_FORBIDDEN_CAPABILITY:createHmac',
  ],
  [
    'P30 the mint is NOT awaited before signing (sign on a pending promise)',
    () =>
      mutate(
        SIGNER,
        OP_TAIL,
        '  const credentials = providerCredentials();\n  const envelope = mintCommittedGenerationEnvelope(generationGrantId);\n  return signCommittedEnvelope(await envelope, credentials);\n',
      ),
    'X17_MINT_NOT_AWAITED_INTO_CONST',
  ],
  [
    'P31 signing chained without a top-level await of the committed mint',
    () =>
      mutate(
        SIGNER,
        OP_TAIL,
        '  const credentials = providerCredentials();\n  return mintCommittedGenerationEnvelope(generationGrantId).then((envelope) =>\n    signCommittedEnvelope(envelope, credentials),\n  );\n',
      ),
    'X17_MINT_NOT_AWAITED_INTO_CONST',
  ],
  [
    'P32 signing reached from INSIDE the TO-8 callback (before COMMIT)',
    () =>
      mutate(
        SIGNER,
        '    (tx) =>\n      (tx as Prisma.TransactionClient)',
        '    (tx) =>\n      signCommittedEnvelope(tx as never, new Map()) &&\n      (tx as Prisma.TransactionClient)',
      ),
    'X7_SIGNER_CALLBACK_CALLS:signCommittedEnvelope',
  ],
  [
    'P33 the signing step reaches the hidden database client',
    () =>
      mutate(
        SIGNER,
        `${SIGN_HEAD}: Promise<M7GenerationWriteCapability> {\n`,
        `${SIGN_HEAD}: Promise<M7GenerationWriteCapability> {\n  void signer();\n`,
      ),
    'X17_SIGN_STEP_REACHES:signer',
  ],
  [
    'P34 the signing library is used outside the signing step',
    () =>
      mutate(
        SIGNER,
        OP_TAIL,
        `  void new S3RequestPresigner({ credentials: { accessKeyId: 'a', secretAccessKey: 'b' }, region: 'r', sha256: Hash.bind(null, 'sha256') });\n${OP_TAIL}`,
      ),
    'X17_SDK_BINDING_OUTSIDE_SIGN_STEP:S3RequestPresigner',
  ],
  [
    'P35 the signing step is given something other than the committed envelope',
    () =>
      mutate(
        SIGNER,
        '  return signCommittedEnvelope(envelope, credentials);\n',
        '  return signCommittedEnvelope({ ...envelope, validUntil: envelope.validUntil }, credentials);\n',
      ),
    'X17_SIGN_STEP_NOT_GIVEN_THE_COMMITTED_ENVELOPE',
  ],
  [
    'P36 a mutable binding inside the signing step',
    () =>
      mutate(
        SIGNER,
        '  const key = envelope.canonicalObjectKey;\n',
        '  let key = envelope.canonicalObjectKey;\n  key = `${key}`;\n',
      ),
    'X7_SIGNER_OPERATION_MUTABLE_BINDING:signCommittedEnvelope',
  ],
  [
    'P37 an alternate hand-rolled SigV4 signer elsewhere',
    () => ({
      'lib/sigv4.ts':
        "import { createHmac } from 'node:crypto';\nexport const sign = (k: string, d: string): string => createHmac('sha256', `AWS4${k}`).update(`AWS4-HMAC-SHA256\\n${d}`).digest('hex');\n",
    }),
    'X18_HAND_ROLLED_SIGNING_PRIMITIVE:createHmac:lib/sigv4.ts',
  ],
  [
    'P38 SigV4 marker literals outside the signer (URL assembly elsewhere)',
    () => ({ 'lib/url.ts': "export const q = 'X-Amz-Signature';\n" }),
    'X18_SIGV4_MARKER_OUTSIDE_SIGNER:lib/url.ts',
  ],
  // ─── PPC-1 R2 negative controls: the SIGNED conditional create (AUD-M7-PPC1-01) ───────────────
  [
    'P42 If-None-Match removed from the presign request (a plain, overwriting PUT is signed)',
    () => mutate(SIGNER, "headers: { host, 'if-none-match': '*' },", 'headers: { host },'),
    'X20_IF_NONE_MATCH_MISSING',
  ],
  [
    'P43 If-None-Match value changed',
    () =>
      mutate(
        SIGNER,
        "headers: { host, 'if-none-match': '*' },",
        "headers: { host, 'if-none-match': '\"etag\"' },",
      ),
    'X20_IF_NONE_MATCH_VALUE',
  ],
  [
    'P44 If-None-Match made optional (conditional spread)',
    () =>
      mutate(
        SIGNER,
        "headers: { host, 'if-none-match': '*' },",
        "headers: { host, ...(expiresIn > 1 ? { 'if-none-match': '*' } : {}) },",
      ),
    'X20_REQUEST_HEADERS_SHAPE',
  ],
  [
    'P45 If-None-Match excluded from signing (unsignableHeaders)',
    () =>
      mutate(
        SIGNER,
        '{ signingDate: new Date(signingMillis), expiresIn },',
        "{ signingDate: new Date(signingMillis), expiresIn, unsignableHeaders: new Set(['if-none-match']) },",
      ),
    'X20_PRESIGN_OPTIONS',
  ],
  [
    'P46 If-None-Match hoisted into the query (not a request condition)',
    () =>
      mutate(
        SIGNER,
        '{ signingDate: new Date(signingMillis), expiresIn },',
        "{ signingDate: new Date(signingMillis), expiresIn, hoistableHeaders: new Set(['if-none-match']) },",
      ),
    'X20_PRESIGN_OPTIONS',
  ],
  [
    'P47 the self-check no longer demands if-none-match in X-Amz-SignedHeaders',
    () =>
      mutate(
        SIGNER,
        "'X-Amz-SignedHeaders': 'host;if-none-match',",
        "'X-Amz-SignedHeaders': 'host',",
      ),
    'X20_SELF_CHECK_SIGNED_HEADERS',
  ],
  [
    'P48 the self-check no longer checks the header value',
    () =>
      mutate(
        SIGNER,
        "    signed.headers['if-none-match'] !== REQUIRED_HEADERS['if-none-match'] ||\n",
        '',
      ),
    'X20_SELF_CHECK_HEADER_VALUE',
  ],
  [
    'P49 the required-headers object is not frozen',
    () =>
      mutate(
        SIGNER,
        "const REQUIRED_HEADERS: Readonly<{ 'if-none-match': '*' }> = Object.freeze({",
        "const REQUIRED_HEADERS: Readonly<{ 'if-none-match': '*' }> = ({",
      ),
    'X20_REQUIRED_HEADERS_NOT_FROZEN_LITERAL',
  ],
  [
    'P50 the capability stops exposing its required headers',
    () => mutate(SIGNER, '  readonly requiredHeaders = REQUIRED_HEADERS;\n', ''),
    'X20_CAPABILITY_REQUIRED_HEADERS',
  ],
  [
    'P51 the self-check accepts a header set without if-none-match',
    () => mutate(SIGNER, "JSON.stringify(['host', 'if-none-match'])", "JSON.stringify(['host'])"),
    'X20_SELF_CHECK_HEADER_SET',
  ],
];

describe('AUTH §22 — negative mutation controls (each FAILS CLOSED)', () => {
  const observed: Record<string, string[]> = {};
  // Each probe is a long synchronous analyzer run; yield one macrotask between probes so the vitest
  // worker's RPC (onTaskUpdate) is serviced and never times out.
  beforeEach(() => new Promise<void>((r) => setImmediate(r)));
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

  it('P39 X19 package manifest: a second provider package / a range / a devDependency → FAILS', () => {
    const pkg = JSON.parse(readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    const variants: Record<string, [unknown, string]> = {
      'client-s3 added': [
        { ...pkg, dependencies: { ...pkg.dependencies, '@aws-sdk/client-s3': '3.0.0' } },
        'X19_PROVIDER_DEPENDENCY_SET',
      ],
      'caret range': [
        {
          ...pkg,
          dependencies: { ...pkg.dependencies, '@aws-sdk/s3-request-presigner': '^3.1139.0' },
        },
        'X19_PROVIDER_DEPENDENCY_NOT_EXACT:@aws-sdk/s3-request-presigner',
      ],
      devDependency: [
        { ...pkg, devDependencies: { ...pkg.devDependencies, '@smithy/signature-v4': '5.7.3' } },
        'X19_PROVIDER_PACKAGE_IN_devDependencies:@smithy/signature-v4',
      ],
      'allowlisted package removed': [
        {
          ...pkg,
          dependencies: Object.fromEntries(
            Object.entries(pkg.dependencies).filter(([n]) => n !== '@smithy/hash-node'),
          ),
        },
        'X19_PROVIDER_DEPENDENCY_SET',
      ],
    };
    for (const [label, [variant, expected]] of Object.entries(variants)) {
      const v = analyzeProviderSigningPackageManifest(JSON.stringify(variant));
      observed[`P39 ${label}`] = v;
      expect(
        v.some((x) => x.startsWith(expected)),
        label,
      ).toBe(true);
    }
  });

  it('P40 the accepted SO-2 rules still fail for every module but the signer, and for a non-allowlisted package in the signer', () => {
    const presignElsewhere = analyzeM7So2Topology(
      overlayProvider(tree, {
        [M7_SESSION_MODULE]: `${real(M7_SESSION_MODULE)}\nconst presignUrl = 1;\nvoid presignUrl;\n`,
      }),
    ).violations;
    const nonAllowlistedInSigner = analyzeM7So2Topology(
      overlayProvider(tree, {
        [SIGNER]: `import { S3Client } from '@aws-sdk/client-s3';\n${real(SIGNER)}\nvoid S3Client;\n`,
      }),
    ).violations;
    observed['P40 presign identifier elsewhere'] = [...presignElsewhere];
    observed['P40 non-allowlisted package in signer'] = [...nonAllowlistedInSigner];
    expect(presignElsewhere).toContainEqual(
      `M7_SIGNED_URL_IDENTIFIER:presignUrl:${M7_SESSION_MODULE}`,
    );
    expect(nonAllowlistedInSigner).toContainEqual(
      `M7_PROVIDER_SDK_IMPORT:@aws-sdk/client-s3:${SIGNER}`,
    );
  });

  it('P41 a second provider-credential reader also fails the accepted SO-1 §18.3 census', () => {
    const v = analyzeM7So1Topology(
      overlayProvider(tree, {
        'services/cred-leak.ts':
          "export const c = process.env['M7_CAPABILITY_SIGNER_PROVIDER_CREDENTIALS'];",
      }),
    ).violations;
    observed['P41 SO-1 census'] = [...v];
    expect(v).toContainEqual(
      expect.stringContaining(
        'M7_CREDENTIAL_READER_CENSUS:M7_CAPABILITY_SIGNER_PROVIDER_CREDENTIALS',
      ),
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
    const { issueGenerationWriteCapability: mintCommittedGenerationEnvelope } =
      await import('@/db/m7-capability-signer');
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
    const { issueGenerationWriteCapability: mintCommittedGenerationEnvelope } =
      await import('@/db/m7-capability-signer');
    const { M7CapabilitySignerTransactionError } = await import('./execution-context');
    const savedDigest = process.env.M7_CONTROL_PLANE_MANIFEST_SHA256;
    const savedUrl = process.env.M7_CAPABILITY_SIGNER_DATABASE_URL;
    const savedRegistry = process.env.M7_CAPABILITY_SIGNER_PROVIDER_CREDENTIALS;
    // PPC-1: a well-formed TEST registry, so the call reaches the TO-8 guard (the registry is parsed
    // before any database access; an absent one would be refused earlier, for another reason).
    process.env.M7_CAPABILITY_SIGNER_PROVIDER_CREDENTIALS = JSON.stringify({
      'offline.credential-profile': randomTestCredential(`sha256:${'b'.repeat(64)}`),
    });
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
      if (savedRegistry === undefined) delete process.env.M7_CAPABILITY_SIGNER_PROVIDER_CREDENTIALS;
      else process.env.M7_CAPABILITY_SIGNER_PROVIDER_CREDENTIALS = savedRegistry;
    }
  });
});

// PagaMenos · M7 CAPABILITY SIGNER — PPC-1 PHYSICAL PROVIDER CAPABILITY — REAL PostgreSQL.
// Driven by `pnpm m7:signer` AFTER the accepted foundation suite, in the same throwaway cluster.
//
// Every case drives the PRODUCTIVE `issueGenerationWriteCapability` through the PRODUCTIVE TO-8 runner
// against real PostgreSQL, on the ADDITIVE fixture planes S1 / S2 (EXACT_KEY_PRESIGNED_PUT ×
// SIGNER_TOPOLOGY on fixture backend B). The signing library is the REAL `@aws-sdk/s3-request-presigner`,
// wrapped by a TEST wrapper that only COUNTS calls and, for one case, OBSERVES the database from another
// connection at the instant signing begins. Signatures are verified by the TEST-ONLY independent SigV4
// verifier (validated offline against AWS's published example).
//
// ── WHAT THIS IS NOT ───────────────────────────────────────────────────────────────────────────
// TEST credentials (random, `.invalid` endpoints), a TEST-FIXTURE control plane, a TEST child process.
// NOT a real provider, NOT a conformance double, NOT Family-Q, NOT T-171b / T-171c / T-171d (those are
// SIGN cases requiring the DEPLOYED signer and a REAL provider credential, VC-8), NOT IMP-18 / IMP-20
// closure. The cases below are local REHEARSALS of those properties' signer-side halves.
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { inspect } from 'node:util';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  readDatabaseExecutionDiagnostics,
  readDatabaseExecutionState,
} from '@/cca/execution-context';
import { prisma } from '@/db/client';
import { issueGenerationWriteCapability } from '@/db/m7-capability-signer';
import {
  M7CapabilitySignerError,
  type M7GenerationWriteCapability,
} from '@/m7/runtime/capability-signer-contract';
import { loadS03Sources } from '@/m7/s03/sources';
import { beginAuthorizedEvidenceUpload } from '@/m7/so2/m7-evidence-upload.cca-leaf';
import { issueM7ParticipantSession } from '@/services/m7-participant-session';
import type { TrustedParticipantContext } from '@/study';

import {
  SIGNER_FIXTURE_KIND,
  SIGNER_PROVIDER_IDENTITIES,
  installSignerProviderPlaneS1,
  retireSignerProviderProfile,
  rotateSignerProviderPlane,
  signerProviderFixtureDigest,
} from './__fixtures__/signer-runtime-control-plane';
import { verifySigV4PresignedUrl } from './__fixtures__/sigv4-independent-verifier';
import {
  randomTestCredential,
  type TestSigningCredential,
} from './__fixtures__/test-signing-credentials';

// ─── TEST wrapper of the REAL presigner ──────────────────────────────────────────────────────────
const signing = vi.hoisted(() => ({
  presignCalls: 0,
  beforePresign: null as null | (() => Promise<void>),
}));
vi.mock('@aws-sdk/s3-request-presigner', async (importOriginal) => {
  const real = await importOriginal<typeof import('@aws-sdk/s3-request-presigner')>();
  class CountingPresigner extends real.S3RequestPresigner {
    override async presign(
      ...args: Parameters<InstanceType<typeof real.S3RequestPresigner>['presign']>
    ): ReturnType<InstanceType<typeof real.S3RequestPresigner>['presign']> {
      signing.presignCalls++;
      if (signing.beforePresign !== null) await signing.beforePresign();
      return super.presign(...args);
    }
  }
  return { ...real, S3RequestPresigner: CountingPresigner };
});

const RAW_CONTEXT = process.env.M7_SIGNER_CONTEXT;
if (RAW_CONTEXT === undefined || RAW_CONTEXT === '') {
  throw new Error(
    'M7 signer provider suite: NOT EXECUTED — run it through `pnpm m7:signer`, which boots the ' +
      'cluster, installs M7 and supplies M7_SIGNER_CONTEXT.',
  );
}

const CTX = JSON.parse(RAW_CONTEXT) as {
  fixtureKind: string;
  backendSha256: string;
  providerManifestSha256: { S1: string; S2: string };
  serverVersion: string;
  participants: Record<
    'P',
    { label: string; participantId: string; assignmentId: string; intentIds: string[] }
  >;
  urls: { application: string; roles: Record<string, string> };
};
const ROOT = resolve(import.meta.dirname, '..', '..', '..');
const SIGNER_ROLE = 'pagamenos_m7_capability_signer_rt';
const WORKER_ROLE = 'pagamenos_m7_storage_worker_rt';
const WORKER_ID = 'signer-provider-suite-worker';
const S1 = SIGNER_PROVIDER_IDENTITIES.S1;
const S2 = SIGNER_PROVIDER_IDENTITIES.S2;

const EVIDENCE: Record<string, unknown> = {
  fixtureKind: CTX.fixtureKind,
  serverVersion: CTX.serverVersion,
  status:
    'LOCAL REHEARSAL with TEST credentials. NOT real-provider evidence, NOT Family-Q, NOT T-171b/c/d.',
};

let admin: pg.Client;
let worker: pg.Client;
let observer: pg.Client;
let backendB: string;
let ctxP: TrustedParticipantContext;
const uploadIntents: string[] = [];
/** Every refusal and capability produced, for the final leak scan. */
const producedErrors: unknown[] = [];
const producedUrls: string[] = [];
const consoleLines: string[] = [];

const credS1: TestSigningCredential = randomTestCredential('sha256:' + '0'.repeat(64));
const credS2: TestSigningCredential = randomTestCredential('sha256:' + '0'.repeat(64));

const digestNow = (): string => process.env.M7_CONTROL_PLANE_MANIFEST_SHA256!;
const nonce = (): string => randomBytes(24).toString('base64url');
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

function setRegistry(entries: Record<string, unknown>): void {
  process.env.M7_CAPABILITY_SIGNER_PROVIDER_CREDENTIALS = JSON.stringify(entries);
}
function defaultRegistry(): void {
  setRegistry({ [S1.credentialProfileId]: credS1, [S2.credentialProfileId]: credS2 });
}

interface Claim {
  uploadIntentId: string;
  grantId: string;
  grantExpiresAt: string;
  canonicalObjectKey: string;
  backendSha256: string;
  storageProfileVersion: string;
  writeCapabilityMode: string;
}

/** TEST INFRASTRUCTURE: one accepted worker claim, which allocates ONE generation write grant. */
async function claim(): Promise<Claim> {
  const id = uploadIntents.shift();
  if (id === undefined) throw new Error('fixture exhausted: no unclaimed upload intent left');
  const { rows } = await worker.query<Record<string, string>>(
    `SELECT generation_grant_id::text AS "grantId", grant_expires_at AS "grantExpiresAt",
            canonical_object_key AS "canonicalObjectKey", backend_sha256 AS "backendSha256",
            storage_profile_version AS "storageProfileVersion",
            write_capability_mode::text AS "writeCapabilityMode"
       FROM m7.w_claim_upload_intent_v1($1::text, $2::uuid, $3::text)`,
    [digestNow(), id, WORKER_ID],
  );
  expect(rows).toHaveLength(1);
  return { uploadIntentId: id, ...(rows[0] as unknown as Omit<Claim, 'uploadIntentId'>) };
}

interface MintRow {
  mintSeq: number;
  envelopeSha256: string;
  signingProfileVersion: string;
  canonicalObjectKey: string;
  grantExpiresAt: string;
}

async function mintRows(grantId: string, client: pg.Client = admin): Promise<MintRow[]> {
  const { rows } = await client.query<MintRow>(
    `SELECT mm."mintSeq" AS "mintSeq", mm."envelopeSha256",
            sp."storageProfileVersion" AS "signingProfileVersion", mm."canonicalObjectKey",
            m7.i_ts(mm."grantExpiresAt") AS "grantExpiresAt"
       FROM m7.m7_generation_capability_mint mm
       JOIN m7.m7_storage_profile sp ON sp."id" = mm."signingProfileId"
      WHERE mm."grantId" = $1::uuid ORDER BY mm."mintSeq"`,
    [grantId],
  );
  return rows;
}

async function refusalOf(p: Promise<unknown>): Promise<unknown> {
  try {
    const v = await p;
    return { resolvedUnexpectedly: v };
  } catch (e) {
    producedErrors.push(e);
    return e;
  }
}

function isRefusal(e: unknown, reason: string, sqlState?: string): boolean {
  return (
    e instanceof M7CapabilitySignerError &&
    e.reason === reason &&
    (sqlState === undefined || e.sqlState === sqlState)
  );
}

async function issue(grantId: string): Promise<M7GenerationWriteCapability> {
  const cap = await issueGenerationWriteCapability(grantId);
  producedUrls.push(cap.url);
  return cap;
}

/** `i_ts` text (µs) → epoch ms, floored. */
function tsMillis(ts: string): number {
  const m = /^(.*)\.(\d{6})Z$/.exec(ts);
  if (m === null) throw new Error(`not an i_ts instant: ${ts}`);
  return Date.parse(`${m[1]}Z`) + Math.floor(Number(m[2]) / 1000);
}

/** Verifies as the provider would receive it: with the capability's REQUIRED headers, unless overridden. */
function verify(
  cap: M7GenerationWriteCapability,
  cred: TestSigningCredential,
  method = 'PUT',
  headers: Readonly<Record<string, string>> = cap.requiredHeaders,
) {
  return verifySigV4PresignedUrl({
    url: cap.url,
    method,
    secretAccessKey: cred.secretAccessKey,
    headers,
  });
}

/** The capability is exactly the committed grant's envelope, signed by `cred`. */
function expectFidelity(cap: M7GenerationWriteCapability, c: Claim, cred: TestSigningCredential) {
  const v = verify(cap, cred);
  expect(v.reasons).toEqual([]);
  expect(cap.method).toBe('PUT');
  expect(verify(cap, cred, 'GET').ok).toBe(false);
  // AUD-M7-PPC1-01: CANONICAL_CREATE is a SIGNED conditional create — no valid signature for a plain PUT.
  expect(cap.requiredHeaders).toEqual({ 'if-none-match': '*' });
  expect(Object.isFrozen(cap.requiredHeaders)).toBe(true);
  expect(v.signedHeaders).toEqual(['host', 'if-none-match']);
  expect(verify(cap, cred, 'PUT', {}).ok).toBe(false);
  expect(verify(cap, cred, 'PUT', { 'if-none-match': '"etag"' }).ok).toBe(false);
  expect(v.decodedPath).toBe(`/${cred.bucket}/${c.canonicalObjectKey}`);
  expect(v.canonicalUri).toBe(`/${cred.bucket}/${c.canonicalObjectKey}`);
  expect(v.host).toBe('s3.ppc1-test.invalid');
  expect(v.accessKeyId).toBe(cred.accessKeyId);
  expect(v.region).toBe(cred.region);
  expect(Date.parse(v.expiresAt!)).toBeLessThanOrEqual(tsMillis(c.grantExpiresAt));
  expect(cap.expiresAt).toBe(v.expiresAt);
  return v;
}

async function connect(url: string): Promise<pg.Client> {
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  return c;
}

async function withDeferredFault(
  grantId: string,
  body: string,
  run: () => Promise<void>,
): Promise<void> {
  await admin.query('CREATE SCHEMA ppc1_test_fault');
  await admin.query(
    `CREATE FUNCTION ppc1_test_fault.fault() RETURNS trigger LANGUAGE plpgsql
       SECURITY DEFINER SET search_path = pg_catalog, pg_temp
       AS $f$ BEGIN ${body} END $f$`,
  );
  await admin.query(
    `CREATE CONSTRAINT TRIGGER ppc1_test_commit_fault AFTER INSERT ON m7.m7_generation_capability_mint
       DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
       WHEN (NEW."grantId" = '${grantId}'::uuid)
       EXECUTE FUNCTION ppc1_test_fault.fault()`,
  );
  try {
    await run();
  } finally {
    await admin.query('DROP TRIGGER ppc1_test_commit_fault ON m7.m7_generation_capability_mint');
    await admin.query('DROP SCHEMA ppc1_test_fault CASCADE');
  }
}

// ─── lifecycle ─────────────────────────────────────────────────────────────────────────────────
beforeAll(async () => {
  for (const n of ['log', 'info', 'warn', 'error', 'debug'] as const) {
    const f = console[n];
    vi.spyOn(console, n).mockImplementation((...a: unknown[]) => {
      consoleLines.push(a.map((x) => (typeof x === 'string' ? x : inspect(x))).join(' '));
      f.apply(console, a);
    });
  }
  admin = await connect(CTX.urls.application);
  worker = await connect(CTX.urls.roles[WORKER_ROLE]!);
  observer = await connect(CTX.urls.application);
  const s1 = await installSignerProviderPlaneS1(admin, loadS03Sources(ROOT));
  expect(CTX.fixtureKind).toBe(SIGNER_FIXTURE_KIND);
  expect(s1.manifestSha256).toBe(CTX.providerManifestSha256.S1);
  backendB = s1.backendSha256;
  expect(backendB).not.toBe(CTX.backendSha256);
  credS1.backendSha256 = backendB;
  credS2.backendSha256 = backendB;
  credS2.bucket = credS1.bucket; // a credential rotation addresses the SAME container
  process.env.M7_CONTROL_PLANE_MANIFEST_SHA256 = s1.manifestSha256;
  defaultRegistry();
  const handle = await issueM7ParticipantSession({
    authenticatedParticipantId: CTX.participants.P.participantId,
  });
  ctxP = handle.trustedParticipantContext;
  for (const purchaseIntentId of CTX.participants.P.intentIds) {
    const r = (await beginAuthorizedEvidenceUpload.execute(ctxP, {
      purchaseIntentId,
      clientCorrelationNonce: nonce(),
    })) as { uploadIntentId?: string };
    if (typeof r?.uploadIntentId !== 'string') {
      throw new Error(`SO-2 did not authorize an upload for ${purchaseIntentId}`);
    }
    uploadIntents.push(r.uploadIntentId);
  }
  EVIDENCE.planeS1 = { manifestSha256: s1.manifestSha256, backendSha256: backendB };
  EVIDENCE.uploadIntentsIssued = uploadIntents.length;
}, 180_000);

afterAll(async () => {
  const out = process.env.M7_SIGNER_PROVIDER_SUITE_EVIDENCE;
  if (out !== undefined && out !== '') {
    writeFileSync(out, `${JSON.stringify(EVIDENCE, null, 2)}\n`, 'utf8');
  }
  await admin?.end();
  await worker?.end();
  await observer?.end();
  await prisma.$disconnect();
  vi.restoreAllMocks();
});

// ─── S1: fidelity, repeat mints, commit-before-sign ──────────────────────────────────────────────
describe('PPC-1 on real PostgreSQL — plane S1 (SIGNER_TOPOLOGY × EXACT_KEY_PRESIGNED_PUT)', () => {
  it('a valid S1 grant → a PUT capability of exactly the committed key, signed by exactly S1; repeats → mintSeq 1,2,3, one envelope', async () => {
    const c = await claim();
    expect(c.storageProfileVersion).toBe(S1.storageProfileVersion);
    expect(c.writeCapabilityMode).toBe('EXACT_KEY_PRESIGNED_PUT');
    expect(c.backendSha256).toBe(backendB);
    const before = signing.presignCalls;
    const caps = [await issue(c.grantId), await issue(c.grantId), await issue(c.grantId)];
    expect(signing.presignCalls - before).toBe(3);
    expect(caps.map((x) => x.mintSeq)).toEqual([1, 2, 3]);
    const verified = caps.map((cap) => expectFidelity(cap, c, credS1));
    for (const cap of caps) expect(verify(cap, credS2).ok).toBe(false);
    const rows = await mintRows(c.grantId);
    expect(rows.map((r) => r.mintSeq)).toEqual([1, 2, 3]);
    expect(new Set(rows.map((r) => r.envelopeSha256)).size).toBe(1);
    for (const r of rows) {
      expect(r.signingProfileVersion).toBe(S1.storageProfileVersion);
      expect(r.canonicalObjectKey).toBe(c.canonicalObjectKey);
      expect(r.grantExpiresAt).toBe(c.grantExpiresAt);
    }
    EVIDENCE.validS1 = {
      grantId: c.grantId,
      grantExpiresAt: c.grantExpiresAt,
      mintSeqs: caps.map((x) => x.mintSeq),
      capabilityExpiresAt: caps.map((x) => x.expiresAt),
      verifiedIndependently: verified.map((v) => v.ok),
      decodedPathEqualsBucketPlusCommittedKey: true,
      signedByCredential: 'S1 (TEST)',
      signingLibraryCalls: 3,
      conditionalCreate: {
        requiredHeaders: caps[0]!.requiredHeaders,
        signedHeaders: verified[0]!.signedHeaders,
        plainPutWithoutIfNoneMatchVerifies: verify(caps[0]!, credS1, 'PUT', {}).ok,
        providerEnforcementOfSP4: 'NOT EXECUTED (Family Q)',
      },
      envelopeDigestsDistinct: 1,
    };
  });

  it('commit-before-sign, OBSERVED: when signing begins, the mint row is already committed and visible to another connection, and no signer transaction is open', async () => {
    const c = await claim();
    const seen: Record<string, unknown>[] = [];
    signing.beforePresign = async () => {
      const rows = await mintRows(c.grantId, observer);
      const { rows: open } = await observer.query<{ n: string }>(
        `SELECT pg_catalog.count(*)::text AS n FROM pg_catalog.pg_stat_activity
          WHERE usename = $1 AND state LIKE 'idle in transaction%'`,
        [SIGNER_ROLE],
      );
      seen.push({
        committedRowsVisibleFromAnotherConnection: rows.map((r) => r.mintSeq),
        signerSessionsIdleInTransaction: Number(open[0]!.n),
        to8FrameActiveInProcess: readDatabaseExecutionState().transactionActive,
        to8OpenDepthInProcess: readDatabaseExecutionState().openDepth,
      });
    };
    try {
      const cap = await issue(c.grantId);
      expectFidelity(cap, c, credS1);
    } finally {
      signing.beforePresign = null;
    }
    expect(seen).toHaveLength(1);
    expect(seen[0]!.committedRowsVisibleFromAnotherConnection).toEqual([1]);
    expect(seen[0]!.signerSessionsIdleInTransaction).toBe(0);
    expect(seen[0]!.to8FrameActiveInProcess).toBe(false);
    expect(seen[0]!.to8OpenDepthInProcess).toBe(0);
    EVIDENCE.commitBeforeSignObserved = seen[0];
  });

  it('COMMIT fails after the function returned → no capability, ZERO signing, no row; the retry commits a new mint and only then signs', async () => {
    const c = await claim();
    const before = signing.presignCalls;
    let e: unknown;
    let rowsDuringFault = -1;
    await withDeferredFault(
      c.grantId,
      "RAISE EXCEPTION 'PPC1_TEST_COMMIT_FAULT' USING ERRCODE = 'P0001';",
      async () => {
        e = await refusalOf(issue(c.grantId));
        rowsDuringFault = (await mintRows(c.grantId)).length;
      },
    );
    expect(isRefusal(e, 'UNAVAILABLE')).toBe(true);
    expect(signing.presignCalls).toBe(before);
    expect(rowsDuringFault).toBe(0);
    const cap = await issue(c.grantId);
    expect(cap.mintSeq).toBe(1);
    expect(signing.presignCalls).toBe(before + 1);
    expectFidelity(cap, c, credS1);
    EVIDENCE.commitFailure = {
      callerReceived: (e as M7CapabilitySignerError).reason,
      signingLibraryCallsDuringFault: 0,
      committedRowsDuringFault: rowsDuringFault,
      retry: { mintSeq: cap.mintSeq, signedAfterCommit: true },
    };
  });

  it('the transaction aborts after the mint row was inserted (statement-level failure) → ZERO signing, no row', async () => {
    const c = await claim();
    const before = signing.presignCalls;
    await admin.query('CREATE SCHEMA ppc1_test_abort');
    await admin.query(
      `CREATE FUNCTION ppc1_test_abort.abort() RETURNS trigger LANGUAGE plpgsql
         SECURITY DEFINER SET search_path = pg_catalog, pg_temp
         AS $f$ BEGIN RAISE EXCEPTION 'PPC1_TEST_ABORT_AFTER_ROW' USING ERRCODE = 'P0001'; END $f$`,
    );
    await admin.query(
      `CREATE TRIGGER ppc1_test_abort_after_row AFTER INSERT ON m7.m7_generation_capability_mint
         FOR EACH ROW WHEN (NEW."grantId" = '${c.grantId}'::uuid)
         EXECUTE FUNCTION ppc1_test_abort.abort()`,
    );
    let e: unknown;
    try {
      e = await refusalOf(issue(c.grantId));
    } finally {
      await admin.query(
        'DROP TRIGGER ppc1_test_abort_after_row ON m7.m7_generation_capability_mint',
      );
      await admin.query('DROP SCHEMA ppc1_test_abort CASCADE');
    }
    expect(isRefusal(e, 'UNAVAILABLE')).toBe(true);
    expect(signing.presignCalls).toBe(before);
    expect(await mintRows(c.grantId)).toHaveLength(0);
    EVIDENCE.abortAfterRow = { callerReceived: 'UNAVAILABLE', signingLibraryCalls: 0, rows: 0 };
  });

  it('commit outcome UNKNOWN to the signer (its backend is terminated while COMMIT runs) → ZERO signing; the retry then signs', async () => {
    const c = await claim();
    const before = signing.presignCalls;
    const LOCK = 7_171_717;
    // TEST instruments: `blocker` (migration role) holds an advisory lock; the COMMIT-time deferred
    // trigger — the ONLY place the signer backend ever requests that lock — waits on it, which makes
    // "inside COMMIT" observable in pg_locks. `killer` is a second connection of the SIGNER role, which
    // may terminate a backend of its own role.
    const blocker = await connect(CTX.urls.application);
    const killer = await connect(CTX.urls.roles[SIGNER_ROLE]!);
    let e: unknown;
    let terminated: { pid: number; usename: string; terminatedOk: boolean } | undefined;
    try {
      await blocker.query('SELECT pg_catalog.pg_advisory_lock($1::bigint)', [LOCK]);
      await withDeferredFault(
        c.grantId,
        `PERFORM pg_catalog.pg_advisory_xact_lock(${LOCK}::bigint);`,
        async () => {
          const pending = refusalOf(issue(c.grantId));
          const deadline = Date.now() + 10_000;
          while (terminated === undefined && Date.now() < deadline) {
            const { rows } = await observer.query<{ pid: number; usename: string }>(
              `SELECT l.pid, a.usename::text AS usename
                 FROM pg_catalog.pg_locks l JOIN pg_catalog.pg_stat_activity a ON a.pid = l.pid
                WHERE l.locktype = 'advisory' AND l.classid = 0 AND l.objid = $1 AND NOT l.granted`,
              [LOCK],
            );
            if (rows[0] !== undefined) {
              const { rows: k } = await killer.query<{ ok: boolean }>(
                'SELECT pg_catalog.pg_terminate_backend($1) AS ok',
                [rows[0].pid],
              );
              terminated = { pid: rows[0].pid, usename: rows[0].usename, terminatedOk: k[0]!.ok };
            } else await sleep(20);
          }
          e = await pending;
        },
      );
    } finally {
      await blocker.query('SELECT pg_catalog.pg_advisory_unlock_all()').catch(() => undefined);
      await blocker.end();
      await killer.end();
    }
    expect(
      terminated,
      'the signer backend must be observed waiting INSIDE COMMIT (deferred trigger) and terminated',
    ).toBeDefined();
    expect(terminated!.usename).toBe(SIGNER_ROLE);
    expect(terminated!.terminatedOk).toBe(true);
    expect(e).toBeInstanceOf(M7CapabilitySignerError);
    expect(isRefusal(e, 'UNAVAILABLE')).toBe(true);
    expect(signing.presignCalls).toBe(before);
    const rowsAfterTermination = (await mintRows(c.grantId)).length;
    // The pool may need a reconnect; a retry either signs, or is refused — it never widens.
    const retryErrors: string[] = [];
    let cap: M7GenerationWriteCapability | undefined;
    for (let attempt = 0; attempt < 3 && cap === undefined; attempt++) {
      try {
        cap = await issue(c.grantId);
      } catch (x) {
        producedErrors.push(x);
        retryErrors.push((x as { reason?: string }).reason ?? 'non-signer error');
        await sleep(250);
      }
    }
    expect(cap).toBeDefined();
    expect(cap!.mintSeq).toBe(rowsAfterTermination + 1);
    expectFidelity(cap!, c, credS1);
    EVIDENCE.unknownCommitOutcome = {
      simulated:
        'the signer backend was terminated while its COMMIT waited in a deferred TEST trigger ' +
        '(advisory-lock rendezvous observed in pg_locks); the client saw the connection die mid-COMMIT',
      terminated,
      callerReceived: (e as M7CapabilitySignerError).reason,
      signingLibraryCallsDuringUnknownOutcome: 0,
      committedRowsAfterTermination: rowsAfterTermination,
      retryErrorsBeforeSuccess: retryErrors,
      retryMintSeq: cap!.mintSeq,
      notSimulated:
        'the variant "COMMIT durably succeeded but its acknowledgement was lost" is NOT deterministically ' +
        'reproducible here (NOT SIMULATED); the signer treats every commit error identically (no signature).',
    };
  }, 60_000);

  it('six concurrent calls for one grant → six capabilities, caller-attributed mintSeq 1..6, one envelope', async () => {
    const c = await claim();
    const before = signing.presignCalls;
    const caps = await Promise.all(Array.from({ length: 6 }, () => issue(c.grantId)));
    expect(signing.presignCalls - before).toBe(6);
    expect(caps.map((x) => x.mintSeq).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6]);
    for (const cap of caps) expectFidelity(cap, c, credS1);
    const rows = await mintRows(c.grantId);
    expect(rows.map((r) => r.mintSeq)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(new Set(rows.map((r) => r.envelopeSha256)).size).toBe(1);
    EVIDENCE.concurrent = {
      callerSeqs: caps.map((x) => x.mintSeq),
      allVerified: true,
      distinctEnvelopeDigests: 1,
    };
  });

  it('a malformed provider-credential registry → refused BEFORE the database: no TO-8 transaction, no mint row', async () => {
    const c = await claim();
    const d0 = readDatabaseExecutionDiagnostics().m7CapabilitySignerTransactions;
    const outcomes: string[] = [];
    for (const raw of [
      '',
      '{',
      '[]',
      JSON.stringify({
        [S1.credentialProfileId]: { ...credS1, sessionToken: 'TESTTOKEN00000000' },
      }),
    ]) {
      process.env.M7_CAPABILITY_SIGNER_PROVIDER_CREDENTIALS = raw;
      const e = await refusalOf(issue(c.grantId));
      expect(isRefusal(e, 'PROVIDER_CREDENTIALS_UNAVAILABLE')).toBe(true);
      outcomes.push((e as M7CapabilitySignerError).reason);
    }
    defaultRegistry();
    expect(readDatabaseExecutionDiagnostics().m7CapabilitySignerTransactions).toBe(d0);
    expect(await mintRows(c.grantId)).toHaveLength(0);
    EVIDENCE.malformedRegistry = { outcomes, signerTransactionsDelta: 0, rows: 0 };
  });

  it('after grantExpiresAt → M7013, ZERO signing, no row', async () => {
    const c = await claim();
    for (;;) {
      const { rows } = await admin.query<{ ok: boolean }>(
        `SELECT pg_catalog.clock_timestamp() >= g."grantExpiresAt" + interval '50 milliseconds' AS ok
           FROM m7.m7_generation_write_grant g WHERE g."id" = $1::uuid`,
        [c.grantId],
      );
      if (rows[0]!.ok) break;
      await sleep(50);
    }
    const before = signing.presignCalls;
    const e = await refusalOf(issue(c.grantId));
    expect(isRefusal(e, 'CAPABILITY_REFUSED', 'M7013')).toBe(true);
    expect(signing.presignCalls).toBe(before);
    expect(await mintRows(c.grantId)).toHaveLength(0);
    EVIDENCE.postExpiry = { sqlState: 'M7013', signingLibraryCalls: 0, rows: 0 };
  }, 60_000);

  it('the storage-worker role cannot mint for an S1 grant (42501)', async () => {
    const c = await claim();
    let code = 'NO_ERROR';
    try {
      await worker.query('SELECT * FROM m7.x_mint_generation_capability_v1($1::text, $2::uuid)', [
        digestNow(),
        c.grantId,
      ]);
    } catch (x) {
      code = String((x as { code?: string }).code);
    }
    expect(code).toBe('42501');
    expect(await mintRows(c.grantId)).toHaveLength(0);
  });
});

// ─── routing S1 → S2 and no-fallback (signer half of XF-17 / XC-7, rehearsed) ────────────────────
describe('PPC-1 routing — exactly the DB-returned credential; no fallback (rehearsal, NOT T-171c)', () => {
  it('grant g under S1; S2 registered (same backend + kind) and S1 retired → g is signed by S2 only, envelope unchanged', async () => {
    const sources = loadS03Sources(ROOT);
    const c = await claim();
    expect(c.storageProfileVersion).toBe(S1.storageProfileVersion);
    const capS1 = await issue(c.grantId);
    expectFidelity(capS1, c, credS1);
    const s2 = await rotateSignerProviderPlane(admin, sources, 'S2', backendB);
    expect(s2.manifestSha256).toBe(CTX.providerManifestSha256.S2);
    expect(s2.manifestSha256).toBe(signerProviderFixtureDigest('S2'));
    process.env.M7_CONTROL_PLANE_MANIFEST_SHA256 = s2.manifestSha256;
    await retireSignerProviderProfile(admin, sources, 'S1');
    const capS2 = await issue(c.grantId);
    const v = expectFidelity(capS2, c, credS2);
    expect(verify(capS2, credS1).ok).toBe(false);
    expect(capS2.url.includes(credS1.accessKeyId)).toBe(false);
    const rows = await mintRows(c.grantId);
    expect(rows.map((r) => r.signingProfileVersion)).toEqual([
      S1.storageProfileVersion,
      S2.storageProfileVersion,
    ]);
    expect(rows[1]!.envelopeSha256).toBe(rows[0]!.envelopeSha256);
    EVIDENCE.routingS1toS2 = {
      grantId: c.grantId,
      beforeRotation: { signingProfile: rows[0]!.signingProfileVersion, signedBy: 'S1 (TEST)' },
      afterRotation: {
        signingProfile: rows[1]!.signingProfileVersion,
        signedBy: 'S2 (TEST)',
        verifiesUnderS1: false,
        accessKeyIsS2: v.accessKeyId === credS2.accessKeyId,
      },
      envelopeSha256Unchanged: true,
      note: 'TEST credentials; the deployed credential inventory (XC-7, MA-15) is NOT exercised.',
    };
  }, 60_000);

  it('the registry lacks the DB-returned credential (only the retired S1 remains) → the DB mints, the signer refuses SIGNING_CREDENTIAL_MISSING, ZERO signing', async () => {
    const pending = await claim();
    expect(pending.storageProfileVersion).toBe(S2.storageProfileVersion);
    const before = signing.presignCalls;
    const outcomes: Record<string, string> = {};
    const registries: Record<string, Record<string, unknown>> = {
      'only the retired S1': { [S1.credentialProfileId]: credS1 },
      'S2 id, case-variant': { [S2.credentialProfileId.toUpperCase()]: credS2 },
      'S2 id, prefix only': { [S2.credentialProfileId.slice(0, -1)]: credS2 },
      '"default" entry': { default: credS2 },
    };
    let seq = 0;
    for (const [label, reg] of Object.entries(registries)) {
      setRegistry(reg);
      const e = await refusalOf(issue(pending.grantId));
      expect(isRefusal(e, 'SIGNING_CREDENTIAL_MISSING'), label).toBe(true);
      expect((e as M7CapabilitySignerError).deploymentDefect).toBe(true);
      outcomes[label] = (e as M7CapabilitySignerError).reason;
      seq++;
    }
    defaultRegistry();
    expect(signing.presignCalls).toBe(before);
    const rows = await mintRows(pending.grantId);
    expect(rows).toHaveLength(seq);
    for (const r of rows) expect(r.signingProfileVersion).toBe(S2.storageProfileVersion);
    EVIDENCE.missingCredential = {
      outcomes,
      signingLibraryCalls: 0,
      committedMintsWhileRefusing: rows.length,
      fallbackUsed: false,
    };
  });

  it('the S2 credential is provisioned for ANOTHER backend literal → SIGNING_CREDENTIAL_BACKEND_MISMATCH, ZERO signing', async () => {
    const c = await claim();
    expect(c.storageProfileVersion).toBe(S2.storageProfileVersion);
    const before = signing.presignCalls;
    setRegistry({ [S2.credentialProfileId]: { ...credS2, backendSha256: CTX.backendSha256 } });
    const e = await refusalOf(issue(c.grantId));
    defaultRegistry();
    expect(isRefusal(e, 'SIGNING_CREDENTIAL_BACKEND_MISMATCH')).toBe(true);
    expect(signing.presignCalls).toBe(before);
    expect(await mintRows(c.grantId)).toHaveLength(1);
    EVIDENCE.backendMismatch = { signingLibraryCalls: 0, committedMints: 1 };
  });

  it('TEST-ONLY child process: the module signs independently with a signer-only environment', async () => {
    const baseEnv: Record<string, string> = {};
    for (const k of [
      'PATH',
      'Path',
      'PATHEXT',
      'SystemRoot',
      'SYSTEMROOT',
      'ComSpec',
      'TEMP',
      'TMP',
      'USERPROFILE',
      'APPDATA',
      'LOCALAPPDATA',
      'HOMEDRIVE',
      'HOMEPATH',
      'HOME',
    ]) {
      const v = process.env[k];
      if (v !== undefined) baseEnv[k] = v;
    }
    const child = spawn('npx', ['tsx', 'src/m7/signer/__fixtures__/signer-child-process.ts'], {
      cwd: ROOT,
      shell: true,
      env: {
        ...baseEnv,
        M7_CAPABILITY_SIGNER_DATABASE_URL: CTX.urls.roles[SIGNER_ROLE]!,
        M7_CAPABILITY_SIGNER_PROVIDER_CREDENTIALS:
          process.env.M7_CAPABILITY_SIGNER_PROVIDER_CREDENTIALS!,
        M7_CONTROL_PLANE_MANIFEST_SHA256: digestNow(),
      } as unknown as NodeJS.ProcessEnv,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (d: Buffer) => (out += d.toString('utf8')));
    child.stderr.on('data', (d: Buffer) => (err += d.toString('utf8')));
    const exited = new Promise<number>((r) => child.on('exit', (code) => r(code ?? -1)));
    const readyDeadline = Date.now() + 90_000;
    while (!/READY \d+ /.test(out) && Date.now() < readyDeadline) await sleep(50);
    const ready = /READY (\d+) (\{.*\})/.exec(out);
    expect(ready, `child never became ready: ${err}`).not.toBeNull();
    const census = JSON.parse(ready![2]!) as Record<string, boolean>;
    const c = await claim();
    child.stdin.write(`${c.grantId}\n`);
    const code = await exited;
    const line = out.split('\n').find((l) => l.startsWith('{'));
    expect(code, `exit ${code}; stderr ${err.length} bytes`).toBe(0);
    const result = JSON.parse(line!) as {
      pid: number;
      capability: {
        kind: string;
        method: string;
        expiresAt: string;
        mintSeq: number;
        url: string;
        requiredHeaders: Record<string, string>;
      };
    };
    producedUrls.push(result.capability.url);
    expect(result.capability.requiredHeaders).toEqual({ 'if-none-match': '*' });
    expect(result.pid).not.toBe(process.pid);
    expect(census).toEqual({
      DATABASE_URL: false,
      M7_PARTICIPANT_DATABASE_URL: false,
      M7_SESSION_ISSUER_DATABASE_URL: false,
      M7_PRIVACY_REQUEST_DATABASE_URL: false,
      M7_STORAGE_WORKER_DATABASE_URL: false,
      M7_DELETION_AUTHORITY_DATABASE_URL: false,
      M7_CAPABILITY_SIGNER_DATABASE_URL: true,
      M7_CAPABILITY_SIGNER_PROVIDER_CREDENTIALS: true,
      M7_CONTROL_PLANE_MANIFEST_SHA256: true,
      AWS_ACCESS_KEY_ID: false,
      AWS_SECRET_ACCESS_KEY: false,
      AWS_PROFILE: false,
    });
    const v = verifySigV4PresignedUrl({
      url: result.capability.url,
      headers: result.capability.requiredHeaders,
      method: 'PUT',
      secretAccessKey: credS2.secretAccessKey,
    });
    expect(v.reasons).toEqual([]);
    expect(v.decodedPath).toBe(`/${credS2.bucket}/${c.canonicalObjectKey}`);
    expect(Date.parse(v.expiresAt!)).toBeLessThanOrEqual(tsMillis(c.grantExpiresAt));
    expect((await mintRows(c.grantId)).map((r) => r.mintSeq)).toEqual([result.capability.mintSeq]);
    EVIDENCE.childProcess = {
      childEnvironmentCensus: census,
      capability: {
        kind: result.capability.kind,
        method: result.capability.method,
        mintSeq: result.capability.mintSeq,
        verifiedIndependently: v.ok,
      },
      status: 'TEST-ONLY harness. Signer production process = DEFERRED; IMP-20 = OPEN.',
    };
  }, 120_000);
});

// ─── leakage: LAST ────────────────────────────────────────────────────────────────────────────────
describe('no secret, URL, key, credential id or envelope material leaked (whole suite)', () => {
  it('console output and every refusal (message, stack, cause, JSON, inspect) are clean', () => {
    const needles = [
      credS1.secretAccessKey,
      credS2.secretAccessKey,
      credS1.accessKeyId,
      credS2.accessKeyId,
      S1.credentialProfileId,
      S2.credentialProfileId,
      ...producedUrls,
      ...producedUrls.map((u) => new URL(u).searchParams.get('X-Amz-Signature') ?? '§'),
    ];
    const haystacks: string[] = [consoleLines.join('\n')];
    for (const e of producedErrors) {
      const x = e as Error & { cause?: unknown };
      haystacks.push(
        `${x.message}\n${x.stack ?? ''}\n${inspect(x, { depth: 5, showHidden: true })}\n${JSON.stringify(x)}`,
      );
      if (x instanceof M7CapabilitySignerError) expect(x.cause).toBeUndefined();
    }
    const hits: string[] = [];
    for (const n of needles) {
      if (n.length < 8) continue;
      for (const h of haystacks) if (h.includes(n)) hits.push(n.slice(0, 10));
    }
    expect(producedUrls.length).toBeGreaterThan(10);
    expect(producedErrors.length).toBeGreaterThan(5);
    expect(hits).toEqual([]);
    EVIDENCE.leakScan = {
      needles: needles.length,
      consoleLines: consoleLines.length,
      refusalsScanned: producedErrors.length,
      urlsIssued: producedUrls.length,
      hits: 0,
    };
  });
});

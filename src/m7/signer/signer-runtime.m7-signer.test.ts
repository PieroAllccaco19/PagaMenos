// PagaMenos · M7 CAPABILITY SIGNER / TO-8 DB FOUNDATION — REAL PostgreSQL (signer AUTH §13–§20, §23).
// Driven by `pnpm m7:signer`.
//
// Every signer case runs the PRODUCTIVE signer module (src/db/m7-capability-signer.ts) through the
// PRODUCTIVE TO-8 runner against a throwaway cluster carrying the accepted migrations, the M7 §19
// normative DDL and the M7 SIGNER RUNTIME TEST FIXTURE control plane. Generation grants are created
// the accepted way: SO-2 (productive leaf) issues upload intents, then the accepted
// `m7.w_claim_upload_intent_v1` is called over a `pagamenos_m7_storage_worker_rt` connection — as TEST
// INFRASTRUCTURE ONLY; no storage-worker runtime exists.
//
// Test-only instruments, each named for what it is: a sealed TEST signer client (to observe the TO-8
// frame and to inject a rollback after the function returned), a CCA TEST shim (runCcaTransaction on
// the shared client), a deferred TEST fault trigger (to make COMMIT itself fail on the productive
// path), a TEST child process, and the TEST / NON-PROVIDER signing stub. None is productive code.
//
// Without the orchestrator's context this suite FAILS TO LOAD (NOT EXECUTED); it never passes by
// default. The control-plane ROTATIONS at the end (A1 → A2 → K) are disposable TEST-FIXTURE rotations
// inside a throwaway database — NOT production manifest authority, NOT LC-3, NOT a selector rotation,
// NOT lifecycle evidence. No provider is involved anywhere.
import { spawn } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { PrismaClient, type Prisma } from '@prisma/client';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { isCcaError } from '@/cca/errors';
import {
  M7CapabilitySignerTransactionError,
  readDatabaseExecutionDiagnostics,
  readDatabaseExecutionState,
  runCcaTransaction,
  runM7CapabilitySignerTransaction,
  sealM7CapabilitySignerClient,
  type DatabaseExecutionState,
} from '@/cca/execution-context';
import { prisma } from '@/db/client';
import { mintCommittedGenerationEnvelope } from '@/db/m7-capability-signer';
import {
  M7CapabilitySignerError,
  type M7CommittedGenerationEnvelope,
} from '@/m7/runtime/capability-signer-contract';
import { loadS03Sources } from '@/m7/s03/sources';
import { beginAuthorizedEvidenceUpload } from '@/m7/so2/m7-evidence-upload.cca-leaf';
import { issueM7ParticipantSession } from '@/services/m7-participant-session';
import type { TrustedParticipantContext } from '@/study';

import {
  SIGNER_FIXTURE_KIND,
  SIGNER_GRANT_TTL_SECONDS,
  SIGNER_IDENTITIES,
  retireSignerProfile,
  rotateSignerPlane,
} from './__fixtures__/signer-runtime-control-plane';
import {
  TEST_NON_PROVIDER_STUB_KIND,
  testNonProviderSignAfterCommit,
} from './__fixtures__/test-non-provider-signing-stub';

const RAW_CONTEXT = process.env.M7_SIGNER_CONTEXT;
if (RAW_CONTEXT === undefined || RAW_CONTEXT === '') {
  throw new Error(
    'M7 signer suite: NOT EXECUTED — run it through `pnpm m7:signer`, which boots the cluster, ' +
      'installs M7 and supplies M7_SIGNER_CONTEXT.',
  );
}

const CTX = JSON.parse(RAW_CONTEXT) as {
  fixtureKind: string;
  manifestSha256: string;
  backendSha256: string;
  rotationManifestSha256: { A2: string; K: string };
  driftedManifestSha256: string;
  database: string;
  port: number;
  serverVersion: string;
  migrationRole: string;
  participants: Record<
    'S',
    { label: string; participantId: string; assignmentId: string; intentIds: string[] }
  >;
  urls: { application: string; roles: Record<string, string> };
};
const ROOT = resolve(import.meta.dirname, '..', '..', '..');
const SIGNER_ROLE = 'pagamenos_m7_capability_signer_rt';
const WORKER_ROLE = 'pagamenos_m7_storage_worker_rt';
const X_MINT = 'm7.x_mint_generation_capability_v1(text,uuid)';
const WORKER_ID = 'signer-suite-worker';

/** Structured evidence, written to M7_SIGNER_SUITE_EVIDENCE after the suite. */
const EVIDENCE: Record<string, unknown> = {
  fixtureKind: CTX.fixtureKind,
  serverVersion: CTX.serverVersion,
  providerSigning: 'NOT_IMPLEMENTED',
  unknownCommitOutcome:
    'DEFERRED — not reproducible deterministically with the existing driver; not simulated',
};

let admin: pg.Client;
let worker: pg.Client;
let signerPg: pg.Client;
/** A TEST-ONLY sealed signer client (same role as the productive one), used only to observe TO-8. */
let testSigner: PrismaClient;
let ctxS: TrustedParticipantContext;
const uploadIntents: string[] = [];

const digestNow = (): string => process.env.M7_CONTROL_PLANE_MANIFEST_SHA256!;
const nonce = (): string => randomBytes(24).toString('base64url');
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

// ─── helpers ───────────────────────────────────────────────────────────────────────────────────
interface Claim {
  uploadIntentId: string;
  grantId: string;
  grantExpiresAt: string;
  canonicalObjectKey: string;
  backendSha256: string;
  storageProfileVersion: string;
  credentialProfileId: string;
  writeCapabilityMode: string;
  leaseEpoch: string;
}

/** TEST INFRASTRUCTURE: one accepted worker claim, which allocates ONE generation write grant. */
async function claim(): Promise<Claim> {
  const id = uploadIntents.shift();
  if (id === undefined) throw new Error('fixture exhausted: no unclaimed upload intent left');
  const { rows } = await worker.query<Record<string, string>>(
    `SELECT generation_grant_id::text AS "grantId", grant_expires_at AS "grantExpiresAt",
            canonical_object_key AS "canonicalObjectKey", backend_sha256 AS "backendSha256",
            storage_profile_version AS "storageProfileVersion",
            credential_profile_id AS "credentialProfileId",
            write_capability_mode::text AS "writeCapabilityMode", lease_epoch::text AS "leaseEpoch"
       FROM m7.w_claim_upload_intent_v1($1::text, $2::uuid, $3::text)`,
    [digestNow(), id, WORKER_ID],
  );
  expect(rows).toHaveLength(1);
  return { uploadIntentId: id, ...(rows[0] as unknown as Omit<Claim, 'uploadIntentId'>) };
}

interface GrantRow {
  capabilityOperation: string;
  canonicalObjectKey: string;
  backendSha256: string;
  grantExpiresAt: string;
  capabilityMode: string;
  envelopeEnforcement: string;
}

async function grantRow(grantId: string): Promise<GrantRow> {
  const { rows } = await admin.query<GrantRow>(
    `SELECT g."capabilityOperation"::text AS "capabilityOperation", g."canonicalObjectKey",
            g."backendSha256", m7.i_ts(g."grantExpiresAt") AS "grantExpiresAt",
            g."capabilityMode"::text AS "capabilityMode",
            g."envelopeEnforcement"::text AS "envelopeEnforcement"
       FROM m7.m7_generation_write_grant g WHERE g."id" = $1::uuid`,
    [grantId],
  );
  expect(rows).toHaveLength(1);
  return rows[0]!;
}

interface MintRow {
  mintSeq: number;
  envelopeSha256: string;
  signingProfileVersion: string;
  credentialProfileId: string;
  mintedBy: string;
  canonicalObjectKey: string;
  backendSha256: string;
  grantExpiresAt: string;
}

async function mintRows(grantId: string): Promise<MintRow[]> {
  const { rows } = await admin.query<MintRow>(
    `SELECT mm."mintSeq" AS "mintSeq", mm."envelopeSha256", sp."storageProfileVersion" AS
            "signingProfileVersion", sp."credentialProfileId", mm."mintedBy",
            mm."canonicalObjectKey", mm."backendSha256", m7.i_ts(mm."grantExpiresAt") AS "grantExpiresAt"
       FROM m7.m7_generation_capability_mint mm
       JOIN m7.m7_storage_profile sp ON sp."id" = mm."signingProfileId"
      WHERE mm."grantId" = $1::uuid ORDER BY mm."mintSeq"`,
    [grantId],
  );
  return rows;
}

async function totalMints(): Promise<number> {
  const { rows } = await admin.query<{ n: string }>(
    'SELECT pg_catalog.count(*)::text AS n FROM m7.m7_generation_capability_mint',
  );
  return Number(rows[0]!.n);
}

/** Waits until PostgreSQL's own clock satisfies `now >= grantExpiresAt + offset`. */
async function waitForDbClock(grantId: string, offset: string): Promise<string> {
  for (;;) {
    const { rows } = await admin.query<{ ok: boolean; now: string }>(
      `SELECT pg_catalog.clock_timestamp() >= g."grantExpiresAt" + $2::interval AS ok,
              m7.i_ts(pg_catalog.clock_timestamp()) AS now
         FROM m7.m7_generation_write_grant g WHERE g."id" = $1::uuid`,
      [grantId, offset],
    );
    if (rows[0]!.ok) return rows[0]!.now;
    await sleep(25);
  }
}

async function dbBeforeExpiry(grantId: string): Promise<{ before: boolean; now: string }> {
  const { rows } = await admin.query<{ before: boolean; now: string }>(
    `SELECT pg_catalog.clock_timestamp() < g."grantExpiresAt" AS before,
            m7.i_ts(pg_catalog.clock_timestamp()) AS now
       FROM m7.m7_generation_write_grant g WHERE g."id" = $1::uuid`,
    [grantId],
  );
  return rows[0]!;
}

function isRefusal(e: unknown, reason: string, sqlState?: string): boolean {
  return (
    e instanceof M7CapabilitySignerError &&
    e.reason === reason &&
    (sqlState === undefined || e.sqlState === sqlState)
  );
}

async function refusalOf(p: Promise<unknown>): Promise<unknown> {
  try {
    const v = await p;
    return { resolvedUnexpectedly: v };
  } catch (e) {
    return e;
  }
}

async function sqlStateOf(client: pg.Client, sql: string, params: unknown[]): Promise<string> {
  try {
    await client.query(sql, params);
    return 'NO_ERROR';
  } catch (e) {
    return String((e as { code?: string }).code);
  }
}

async function connect(url: string): Promise<pg.Client> {
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  return c;
}

function envelopeFieldsWithoutSeq(e: M7CommittedGenerationEnvelope): Record<string, unknown> {
  const rest: Record<string, unknown> = { ...e };
  delete rest.mintSeq;
  return rest;
}

// ─── lifecycle ─────────────────────────────────────────────────────────────────────────────────
beforeAll(async () => {
  admin = await connect(CTX.urls.application);
  worker = await connect(CTX.urls.roles[WORKER_ROLE]!);
  signerPg = await connect(CTX.urls.roles[SIGNER_ROLE]!);
  testSigner = sealM7CapabilitySignerClient(
    new PrismaClient({ datasourceUrl: CTX.urls.roles[SIGNER_ROLE]! }),
  );
  const handle = await issueM7ParticipantSession({
    authenticatedParticipantId: CTX.participants.S.participantId,
  });
  ctxS = handle.trustedParticipantContext;
  for (const purchaseIntentId of CTX.participants.S.intentIds) {
    const r = (await beginAuthorizedEvidenceUpload.execute(ctxS, {
      purchaseIntentId,
      clientCorrelationNonce: nonce(),
    })) as { uploadIntentId?: string };
    if (typeof r?.uploadIntentId !== 'string') {
      throw new Error(`SO-2 did not authorize an upload for ${purchaseIntentId}`);
    }
    uploadIntents.push(r.uploadIntentId);
  }
  EVIDENCE.uploadIntentsIssued = uploadIntents.length;
}, 180_000);

afterAll(async () => {
  const out = process.env.M7_SIGNER_SUITE_EVIDENCE;
  if (out !== undefined && out !== '') {
    writeFileSync(out, `${JSON.stringify(EVIDENCE, null, 2)}\n`, 'utf8');
  }
  await admin?.end();
  await worker?.end();
  await signerPg?.end();
  await testSigner?.$disconnect();
  await prisma.$disconnect();
});

describe('the fixture control plane is a TEST FIXTURE, not a manifest', () => {
  it('declares itself as such; plane A1 is active; no provider is involved', async () => {
    expect(CTX.fixtureKind).toBe(SIGNER_FIXTURE_KIND);
    expect(digestNow()).toBe(CTX.manifestSha256);
    const { rows } = await admin.query<{ mv: string }>(
      `SELECT "manifestVersion" AS mv FROM m7.m7_control_plane_installation WHERE "retiredAt" IS NULL`,
    );
    expect(rows.map((r) => r.mv)).toEqual([SIGNER_IDENTITIES.A1.manifestVersion]);
    expect(uploadIntents.length).toBeGreaterThanOrEqual(16);
  });
});

// ─── valid grant, envelope fidelity, repeat mint ─────────────────────────────────────────────────
describe('valid grant → committed envelope copied verbatim from PostgreSQL (AUTH §6, §14)', () => {
  it('mints; every field equals the DB grant / mint row; repeat mints keep the envelope, mintSeq 1,2,3', async () => {
    const c = await claim();
    const e1 = await mintCommittedGenerationEnvelope(c.grantId);
    const g = await grantRow(c.grantId);
    expect(Object.isFrozen(e1)).toBe(true);
    expect(Object.keys(e1).sort()).toEqual(
      [
        'backendSha256',
        'canonicalObjectKey',
        'capabilityMode',
        'capabilityOperation',
        'envelopeEnforcement',
        'envelopeSha256',
        'mintSeq',
        'signingCredentialProfileId',
        'signingProfileVersion',
        'validUntil',
      ].sort(),
    );
    expect(e1.capabilityOperation).toBe(g.capabilityOperation);
    expect(e1.capabilityOperation).toBe('CANONICAL_CREATE');
    expect(e1.canonicalObjectKey).toBe(g.canonicalObjectKey);
    expect(e1.canonicalObjectKey).toBe(c.canonicalObjectKey);
    expect(e1.backendSha256).toBe(g.backendSha256);
    expect(e1.backendSha256).toBe(CTX.backendSha256);
    expect(e1.validUntil).toBe(g.grantExpiresAt);
    expect(e1.validUntil).toBe(c.grantExpiresAt);
    expect(e1.capabilityMode).toBe(g.capabilityMode);
    expect(e1.envelopeEnforcement).toBe(g.envelopeEnforcement);
    expect(e1.mintSeq).toBe(1);
    expect(e1.signingProfileVersion).toBe(SIGNER_IDENTITIES.A1.storageProfileVersion);
    expect(e1.signingCredentialProfileId).toBe(SIGNER_IDENTITIES.A1.credentialProfileId);

    const e2 = await mintCommittedGenerationEnvelope(c.grantId);
    const e3 = await mintCommittedGenerationEnvelope(c.grantId);
    expect([e1.mintSeq, e2.mintSeq, e3.mintSeq]).toEqual([1, 2, 3]);
    expect(envelopeFieldsWithoutSeq(e2)).toEqual(envelopeFieldsWithoutSeq(e1));
    expect(envelopeFieldsWithoutSeq(e3)).toEqual(envelopeFieldsWithoutSeq(e1));

    const rows = await mintRows(c.grantId);
    expect(rows.map((r) => r.mintSeq)).toEqual([1, 2, 3]);
    for (const r of rows) {
      expect(r.envelopeSha256).toBe(e1.envelopeSha256);
      expect(r.canonicalObjectKey).toBe(e1.canonicalObjectKey);
      expect(r.backendSha256).toBe(e1.backendSha256);
      expect(r.grantExpiresAt).toBe(e1.validUntil);
      expect(r.signingProfileVersion).toBe(e1.signingProfileVersion);
      expect(r.mintedBy).toBe(SIGNER_ROLE);
    }
    EVIDENCE.validAndRepeatMint = {
      grantId: c.grantId,
      envelope: e1,
      grantRow: g,
      repeatSeqs: [e1.mintSeq, e2.mintSeq, e3.mintSeq],
      envelopeSha256Identical: true,
      dbMintRows: rows,
    };
  });
});

// ─── malformed, unknown, manifest mismatch ──────────────────────────────────────────────────────
describe('input and control-plane refusals (AUTH §5, §23)', () => {
  it('a malformed grant UUID is refused BEFORE any database access', async () => {
    const before = readDatabaseExecutionDiagnostics();
    const mintsBefore = await totalMints();
    for (const bad of ['', 'not-a-uuid', '00000000-0000-0000-0000-00000000000g']) {
      expect(
        isRefusal(
          await refusalOf(mintCommittedGenerationEnvelope(bad)),
          'INVALID_GENERATION_GRANT_ID',
        ),
      ).toBe(true);
    }
    const extra = await refusalOf(
      (mintCommittedGenerationEnvelope as (...a: unknown[]) => Promise<unknown>)(randomUUID(), {
        canonicalObjectKey: 'wider/key',
        validUntil: '2999-01-01T00:00:00Z',
      }),
    );
    expect(isRefusal(extra, 'INVALID_GENERATION_GRANT_ID')).toBe(true);
    const after = readDatabaseExecutionDiagnostics();
    expect(after.m7CapabilitySignerTransactions).toBe(before.m7CapabilitySignerTransactions);
    expect(await totalMints()).toBe(mintsBefore);
    EVIDENCE.malformed = { refusedBeforeTransaction: true, signerTransactionsDelta: 0 };
  });

  it('an unknown grant → M7013 (indistinguishable refusal), zero mint rows', async () => {
    const unknown = randomUUID();
    const e = await refusalOf(mintCommittedGenerationEnvelope(unknown));
    expect(isRefusal(e, 'CAPABILITY_REFUSED', 'M7013')).toBe(true);
    expect(
      await sqlStateOf(
        signerPg,
        `SELECT * FROM m7.x_mint_generation_capability_v1($1::text, $2::uuid)`,
        [digestNow(), unknown],
      ),
    ).toBe('M7013');
    expect(await mintRows(unknown)).toHaveLength(0);
    EVIDENCE.unknownGrant = { reason: 'CAPABILITY_REFUSED', sqlState: 'M7013', rows: 0 };
  });

  it('a signer manifest mismatch → 55000, zero mint rows', async () => {
    const c = await claim();
    const good = digestNow();
    process.env.M7_CONTROL_PLANE_MANIFEST_SHA256 = CTX.driftedManifestSha256;
    try {
      const e = await refusalOf(mintCommittedGenerationEnvelope(c.grantId));
      expect(isRefusal(e, 'CONTROL_PLANE_MISMATCH', '55000')).toBe(true);
    } finally {
      process.env.M7_CONTROL_PLANE_MANIFEST_SHA256 = good;
    }
    expect(
      await sqlStateOf(
        signerPg,
        `SELECT * FROM m7.x_mint_generation_capability_v1($1::text, $2::uuid)`,
        [CTX.driftedManifestSha256, c.grantId],
      ),
    ).toBe('55000');
    expect(await mintRows(c.grantId)).toHaveLength(0);
    // …and with the right digest the same grant mints (the refusal was the digest, nothing else).
    expect((await mintCommittedGenerationEnvelope(c.grantId)).mintSeq).toBe(1);
    EVIDENCE.manifestMismatch = { sqlState: '55000', rowsWhileMismatched: 0 };
  });
});

// ─── role / EXECUTE topology (DB half of T-171b, IA-14) ─────────────────────────────────────────
describe('role / EXECUTE topology — the DB half of T-171b (AUTH §17)', () => {
  const EXEC_SET_SQL = `SELECT p.oid::regprocedure::text AS fn
      FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'm7' AND pg_catalog.has_function_privilege($1::name, p.oid, 'EXECUTE')
     ORDER BY 1`;
  const LOGIN_ROLES = () => Object.keys(CTX.urls.roles).sort();

  async function executeSet(role: string): Promise<string[]> {
    return (await admin.query<{ fn: string }>(EXEC_SET_SQL, [role])).rows.map((r) => r.fn);
  }

  /** The IA-14 facts, recomputed from the live catalog. Empty ⇔ compliant. */
  async function ia14Violations(): Promise<string[]> {
    const v: string[] = [];
    const signerSet = await executeSet(SIGNER_ROLE);
    if (JSON.stringify(signerSet) !== JSON.stringify([X_MINT])) {
      v.push(`SIGNER_EXECUTE_SET:[${signerSet.join(',')}]`);
    }
    for (const role of LOGIN_ROLES()) {
      const set = await executeSet(role);
      const hasMint = set.includes(X_MINT);
      if (hasMint && role !== SIGNER_ROLE) v.push(`X_MINT_GRANTEE:${role}`);
      if (hasMint && set.some((f) => /^m7\.[wpsra]_/.test(f))) v.push(`BOTH_AUTHORITIES:${role}`);
    }
    return v;
  }

  it('as the storage-worker role, x_mint → 42501', async () => {
    const c = await claim();
    expect(
      await sqlStateOf(
        worker,
        `SELECT * FROM m7.x_mint_generation_capability_v1($1::text, $2::uuid)`,
        [digestNow(), c.grantId],
      ),
    ).toBe('42501');
    expect(await mintRows(c.grantId)).toHaveLength(0);
    EVIDENCE.workerDirectCall = { sqlState: '42501', rows: 0 };
  });

  it('as the signer role, EVERY other callable m7 function (every family) → 42501', async () => {
    const { rows } = await admin.query<{ fn: string; call: string }>(
      `SELECT p.oid::regprocedure::text AS fn,
              'SELECT ' || p.oid::regproc::text || '(' ||
                COALESCE((SELECT pg_catalog.string_agg('NULL::' || pg_catalog.format_type(t, NULL), ', ' ORDER BY i)
                            FROM pg_catalog.unnest(p.proargtypes::oid[]) WITH ORDINALITY AS a(t, i)), '') || ')' AS call
         FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'm7' AND p.prorettype <> 'pg_catalog.trigger'::regtype
          AND p.oid <> $1::regprocedure
        ORDER BY 1`,
      [X_MINT],
    );
    const results: Record<string, string> = {};
    const families = new Set<string>();
    for (const r of rows) {
      results[r.fn] = await sqlStateOf(signerPg, r.call, []);
      families.add(r.fn.slice(3, 5));
    }
    const notDenied = Object.entries(results).filter(([, s]) => s !== '42501');
    expect(notDenied).toEqual([]);
    for (const family of ['a_', 'c_', 'i_', 'p_', 'r_', 's_', 'w_'])
      expect(families).toContain(family);
    EVIDENCE.signerOtherFamilies = {
      functionsProbed: rows.length,
      families: [...families].sort(),
      allDenied42501: notDenied.length === 0,
      results,
    };
  });

  it('the signer role EXECUTE set is exactly {x_mint}; x_mint grantees among login roles = {signer}', async () => {
    const set = await executeSet(SIGNER_ROLE);
    expect(set).toEqual([X_MINT]);
    const grantees: string[] = [];
    const perRole: Record<string, number> = {};
    for (const role of LOGIN_ROLES()) {
      const s = await executeSet(role);
      perRole[role] = s.length;
      if (s.includes(X_MINT)) grantees.push(role);
    }
    expect(grantees).toEqual([SIGNER_ROLE]);
    const acl = await admin.query<{ grantee: string }>(
      `SELECT pg_catalog.pg_get_userbyid(a.grantee)::text AS grantee
         FROM pg_catalog.pg_proc p, pg_catalog.aclexplode(p.proacl) a
        WHERE p.oid = $1::regprocedure AND a.privilege_type = 'EXECUTE'
          AND a.grantee <> p.proowner ORDER BY 1`,
      [X_MINT],
    );
    expect(acl.rows.map((r) => r.grantee)).toEqual([SIGNER_ROLE]);
    expect(await ia14Violations()).toEqual([]);
    EVIDENCE.executeTopology = {
      signerExecuteSet: set,
      signerExecuteSetCardinality: set.length,
      xMintLoginGrantees: grantees,
      xMintExplicitNonOwnerGrantees: acl.rows.map((r) => r.grantee),
      executeSetSizes: perRole,
      noRoleHoldsBoth: true,
    };
  });

  it('NEGATIVE CONTROL — storage-worker role gains EXECUTE on x_mint → the census FAILS', async () => {
    await admin.query(`GRANT EXECUTE ON FUNCTION ${X_MINT} TO ${WORKER_ROLE}`);
    let violations: string[];
    try {
      violations = await ia14Violations();
    } finally {
      await admin.query(`REVOKE EXECUTE ON FUNCTION ${X_MINT} FROM ${WORKER_ROLE}`);
    }
    expect(violations).toContain(`X_MINT_GRANTEE:${WORKER_ROLE}`);
    expect(violations).toContain(`BOTH_AUTHORITIES:${WORKER_ROLE}`);
    expect(await ia14Violations()).toEqual([]);
    EVIDENCE.negativeWorkerGainsXMint = { detected: violations, restoredClean: true };
  });

  it('NEGATIVE CONTROL — signer role gains another M7 function → the census FAILS', async () => {
    const other = 'm7.w_claim_upload_intent_v1(text,uuid,text)';
    await admin.query(`GRANT EXECUTE ON FUNCTION ${other} TO ${SIGNER_ROLE}`);
    let violations: string[];
    try {
      violations = await ia14Violations();
    } finally {
      await admin.query(`REVOKE EXECUTE ON FUNCTION ${other} FROM ${SIGNER_ROLE}`);
    }
    expect(violations.some((x) => x.startsWith('SIGNER_EXECUTE_SET:'))).toBe(true);
    expect(violations).toContain(`BOTH_AUTHORITIES:${SIGNER_ROLE}`);
    expect(await ia14Violations()).toEqual([]);
    EVIDENCE.negativeSignerGainsAnother = { detected: violations, restoredClean: true };
  });
});

// ─── concurrency ────────────────────────────────────────────────────────────────────────────────
describe('concurrent mints serialize on P1 (XF-15)', () => {
  it('six concurrent mints → consecutive sequences 1..6, one identical envelope', async () => {
    const c = await claim();
    const results = await Promise.all(
      Array.from({ length: 6 }, () => mintCommittedGenerationEnvelope(c.grantId)),
    );
    const seqs = results.map((r) => r.mintSeq).sort((a, b) => a - b);
    expect(seqs).toEqual([1, 2, 3, 4, 5, 6]);
    const digests = new Set(results.map((r) => r.envelopeSha256));
    expect(digests.size).toBe(1);
    for (const r of results) {
      expect(envelopeFieldsWithoutSeq(r)).toEqual(envelopeFieldsWithoutSeq(results[0]!));
    }
    const rows = await mintRows(c.grantId);
    expect(rows.map((r) => r.mintSeq)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(new Set(rows.map((r) => r.envelopeSha256)).size).toBe(1);
    EVIDENCE.concurrentMint = {
      grantId: c.grantId,
      callerSeqsSorted: seqs,
      dbSeqs: rows.map((r) => r.mintSeq),
      distinctEnvelopeDigests: digests.size,
      envelopeSha256: results[0]!.envelopeSha256,
    };
  });
});

// ─── TO-8 DatabaseExecutionContext against real PostgreSQL ──────────────────────────────────────
describe('TO-8 DatabaseExecutionContext — real PostgreSQL (AUTH §8–§10)', () => {
  it('inside the signer transaction the context reports the TO-8 owner, on the signer role', async () => {
    let state: DatabaseExecutionState | undefined;
    const who = await runM7CapabilitySignerTransaction(testSigner, {}, async (tx) => {
      state = readDatabaseExecutionState();
      return (tx as Prisma.TransactionClient).$queryRaw<
        { u: string }[]
      >`SELECT current_user::text AS u`;
    });
    expect(state).toMatchObject({
      transactionActive: true,
      transactionAuthority: 'M7_CAPABILITY_SIGNER',
      ccaActive: false,
      openDepth: 1,
    });
    expect(who[0]!.u).toBe(SIGNER_ROLE);
    expect(readDatabaseExecutionState().transactionActive).toBe(false);
    EVIDENCE.to8State = { insideSignerTransaction: state, currentUser: who[0]!.u };
  });

  it('CCA invoked through a TEST shim while TO-8 is active → CCA_TOP_LEVEL_TRANSACTION_REQUIRED', async () => {
    const before = readDatabaseExecutionDiagnostics();
    let caught: unknown;
    await runM7CapabilitySignerTransaction(testSigner, {}, async () => {
      try {
        await runCcaTransaction(prisma, {}, async () => 'must not run');
      } catch (e) {
        caught = e;
      }
    });
    expect(isCcaError(caught, 'CCA_TOP_LEVEL_TRANSACTION_REQUIRED')).toBe(true);
    const after = readDatabaseExecutionDiagnostics();
    expect(after.ccaTransactions).toBe(before.ccaTransactions);
    expect(after.ccaRejectedBeforeDatabase).toBe(before.ccaRejectedBeforeDatabase + 1);
    EVIDENCE.ccaInsideTo8 = { code: 'CCA_TOP_LEVEL_TRANSACTION_REQUIRED', ccaTransactionsDelta: 0 };
  });

  it('the signer inside ACCEPTED_OWNER / CCA / TO-8 → refused BEFORE signer DB access', async () => {
    const c = await claim();
    const outcomes: Record<string, unknown> = {};
    const d0 = readDatabaseExecutionDiagnostics();

    let inAccepted: unknown;
    await prisma.$transaction(async () => {
      inAccepted = await refusalOf(mintCommittedGenerationEnvelope(c.grantId));
    });
    let inCca: unknown;
    await runCcaTransaction(prisma, {}, async () => {
      inCca = await refusalOf(mintCommittedGenerationEnvelope(c.grantId));
    });
    let inTo8: unknown;
    await runM7CapabilitySignerTransaction(testSigner, {}, async () => {
      inTo8 = await refusalOf(mintCommittedGenerationEnvelope(c.grantId));
    });
    for (const [k, e] of Object.entries({ inAccepted, inCca, inTo8 })) {
      expect(e, k).toBeInstanceOf(M7CapabilitySignerTransactionError);
      expect((e as M7CapabilitySignerTransactionError).code).toBe('TO8_TRANSACTION_ALREADY_ACTIVE');
      outcomes[k] = (e as M7CapabilitySignerTransactionError).code;
    }
    const d1 = readDatabaseExecutionDiagnostics();
    expect(d1.m7CapabilitySignerRejectedBeforeDatabase).toBe(
      d0.m7CapabilitySignerRejectedBeforeDatabase + 3,
    );
    // The only TO-8 transaction opened was the TEST shim's own outer one.
    expect(d1.m7CapabilitySignerTransactions).toBe(d0.m7CapabilitySignerTransactions + 1);
    expect(await mintRows(c.grantId)).toHaveLength(0);
    // Outside any transaction the same grant mints normally.
    expect((await mintCommittedGenerationEnvelope(c.grantId)).mintSeq).toBe(1);
    EVIDENCE.nestedRefusals = {
      outcomes,
      rejectedBeforeDatabaseDelta: 3,
      mintRowsWhileNested: 0,
    };
  });

  it('the sealed signer client cannot open a transaction around TO-8 registration', async () => {
    const e = await refusalOf(
      (testSigner.$transaction as unknown as (f: () => Promise<unknown>) => Promise<unknown>)(
        async () => 'bypass',
      ),
    );
    expect(e).toBeInstanceOf(M7CapabilitySignerTransactionError);
    expect((e as M7CapabilitySignerTransactionError).code).toBe('TO8_DIRECT_TRANSACTION_FORBIDDEN');
  });
});

// ─── commit boundary (XF-16, DB half) ───────────────────────────────────────────────────────────
describe('XF-16 (DB half) — no envelope escapes before COMMIT (AUTH §13)', () => {
  it('the function returned rows, then the transaction rolled back → NO envelope, NO mint row', async () => {
    const c = await claim();
    let insideRows: unknown[] = [];
    let returned: unknown = 'unset';
    const e = await refusalOf(
      (async () => {
        returned = await runM7CapabilitySignerTransaction(
          testSigner,
          { timeout: 15_000 },
          async (tx) => {
            insideRows = await (tx as Prisma.TransactionClient).$queryRaw<
              unknown[]
            >`SELECT m.mint_seq, m.envelope_sha256 FROM m7.x_mint_generation_capability_v1(${digestNow()}::text, ${c.grantId}::uuid) AS m`;
            throw new Error('TEST: deliberate rollback after the function returned rows');
          },
        );
      })(),
    );
    expect((e as Error).message).toMatch(/deliberate rollback/);
    expect(insideRows).toHaveLength(1);
    expect(returned).toBe('unset');
    expect(await mintRows(c.grantId)).toHaveLength(0);
    // The rolled-back sequence was never committed: the next productive mint is mintSeq 1.
    const next = await mintCommittedGenerationEnvelope(c.grantId);
    expect(next.mintSeq).toBe(1);
    EVIDENCE.rollbackAfterFunctionReturned = {
      functionReturnedRows: insideRows.length,
      callerReceivedEnvelope: false,
      committedRowsAfterRollback: 0,
      nextCommittedMintSeq: next.mintSeq,
    };
  });

  it('COMMIT itself fails on the PRODUCTIVE path → the caller receives NO envelope, NO mint row', async () => {
    const c = await claim();
    // TEST fault: a deferred constraint trigger that raises at COMMIT for exactly this grant. It is
    // created by the migration role in the throwaway database and dropped immediately afterwards.
    await admin.query('CREATE SCHEMA signer_test_fault');
    await admin.query(
      `CREATE FUNCTION signer_test_fault.fail_at_commit() RETURNS trigger LANGUAGE plpgsql
         SECURITY DEFINER SET search_path = pg_catalog, pg_temp
         AS $f$ BEGIN RAISE EXCEPTION 'SIGNER_TEST_COMMIT_FAULT' USING ERRCODE = 'P0001'; END $f$`,
    );
    await admin.query(
      `CREATE CONSTRAINT TRIGGER signer_test_commit_fault AFTER INSERT ON m7.m7_generation_capability_mint
         DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
         WHEN (NEW."grantId" = '${c.grantId}'::uuid)
         EXECUTE FUNCTION signer_test_fault.fail_at_commit()`,
    );
    let e: unknown;
    let rowsDuringFault: number;
    try {
      e = await refusalOf(mintCommittedGenerationEnvelope(c.grantId));
      rowsDuringFault = (await mintRows(c.grantId)).length;
    } finally {
      await admin.query(
        'DROP TRIGGER signer_test_commit_fault ON m7.m7_generation_capability_mint',
      );
      await admin.query('DROP SCHEMA signer_test_fault CASCADE');
    }
    expect(isRefusal(e, 'UNAVAILABLE')).toBe(true);
    expect(rowsDuringFault).toBe(0);
    const { rows: leftovers } = await admin.query<{ n: string }>(
      `SELECT pg_catalog.count(*)::text AS n FROM pg_catalog.pg_trigger
        WHERE tgname = 'signer_test_commit_fault'`,
    );
    expect(leftovers[0]!.n).toBe('0');
    const next = await mintCommittedGenerationEnvelope(c.grantId);
    expect(next.mintSeq).toBe(1);
    EVIDENCE.commitFailure = {
      path: 'PRODUCTIVE mintCommittedGenerationEnvelope (deferred TEST fault at COMMIT)',
      callerReceived: (e as M7CapabilitySignerError).reason,
      envelopeReturned: false,
      committedRowsDuringFault: rowsDuringFault,
      faultRemoved: true,
      nextCommittedMintSeq: next.mintSeq,
    };
  });

  it('TEST / NON-PROVIDER stub: a downstream step sees the envelope only once it is committed', async () => {
    const c = await claim();
    const observer = await connect(CTX.urls.application);
    try {
      const out = await testNonProviderSignAfterCommit(c.grantId, async (env) => {
        const { rows } = await observer.query<{ n: string }>(
          `SELECT pg_catalog.count(*)::text AS n FROM m7.m7_generation_capability_mint
            WHERE "grantId" = $1::uuid AND "mintSeq" = $2 AND "envelopeSha256" = $3`,
          [c.grantId, env.mintSeq, env.envelopeSha256],
        );
        return rows[0]!.n === '1';
      });
      expect(out.kind).toBe(TEST_NON_PROVIDER_STUB_KIND);
      expect(out.committedObservedBeforeStub).toBe(true);
      EVIDENCE.testNonProviderStub = {
        kind: out.kind,
        committedObservedFromAnotherConnection: true,
        mintSeq: out.envelope.mintSeq,
        note: 'HMAC under a discarded random key; NOT a provider capability',
      };
    } finally {
      await observer.end();
    }
  });
});

// ─── expiry (XF-14, T-170, T-170b) ──────────────────────────────────────────────────────────────
describe('expiry on a post-lock clock (XF-14; AUTH §16)', () => {
  it('a call at/after grantExpiresAt → M7013, zero mint rows', async () => {
    const c = await claim();
    const at = await waitForDbClock(c.grantId, '50 milliseconds');
    const e = await refusalOf(mintCommittedGenerationEnvelope(c.grantId));
    expect(isRefusal(e, 'CAPABILITY_REFUSED', 'M7013')).toBe(true);
    expect(await mintRows(c.grantId)).toHaveLength(0);
    EVIDENCE.postExpiry = {
      grantExpiresAt: c.grantExpiresAt,
      calledAtDbClock: at,
      sqlState: 'M7013',
      rows: 0,
      grantTtlSeconds: SIGNER_GRANT_TTL_SECONDS,
    };
  }, 60_000);

  async function waitAcrossExpiry(
    label: 'P1_INTENT' | 'P2_BACKEND',
  ): Promise<Record<string, unknown>> {
    const c = await claim();
    const holder = await connect(CTX.urls.application);
    const { rows: pidRows } = await holder.query<{ pid: number }>(
      'SELECT pg_catalog.pg_backend_pid() AS pid',
    );
    const holderPid = pidRows[0]!.pid;
    try {
      await waitForDbClock(c.grantId, '-2500 milliseconds');
      await holder.query('BEGIN');
      if (label === 'P1_INTENT') {
        await holder.query(
          'SELECT 1 FROM m7.m7_evidence_upload_intent WHERE "id" = $1::uuid FOR UPDATE',
          [c.uploadIntentId],
        );
      } else {
        await holder.query(
          'SELECT 1 FROM m7.m7_storage_backend WHERE "backendSha256" = $1 FOR UPDATE',
          [c.backendSha256],
        );
      }
      const pending = refusalOf(mintCommittedGenerationEnvelope(c.grantId));
      // Observe the signer's backend WAITING on the holder, before expiry, on PostgreSQL's clock.
      let blocked:
        | {
            pid: number;
            ungrantedLocks: { locktype: string; relation: string | null; mode: string }[];
          }
        | undefined;
      const deadline = Date.now() + 4_000;
      while (blocked === undefined && Date.now() < deadline) {
        const { rows } = await admin.query<{ pid: number }>(
          `SELECT a.pid FROM pg_catalog.pg_stat_activity a
            WHERE a.usename = $1 AND $2 = ANY (pg_catalog.pg_blocking_pids(a.pid))`,
          [SIGNER_ROLE, holderPid],
        );
        if (rows[0] !== undefined) {
          const { rows: locks } = await admin.query<{
            locktype: string;
            relation: string | null;
            mode: string;
          }>(
            `SELECT l.locktype, l.relation::regclass::text AS relation, l.mode
               FROM pg_catalog.pg_locks l WHERE l.pid = $1 AND NOT l.granted ORDER BY 1, 2, 3`,
            [rows[0].pid],
          );
          blocked = { pid: rows[0].pid, ungrantedLocks: locks };
        } else await sleep(20);
      }
      expect(blocked, 'the signer must be observed waiting on the holder').toBeDefined();
      expect(blocked!.ungrantedLocks.length).toBeGreaterThan(0);
      const observedBefore = await dbBeforeExpiry(c.grantId);
      expect(observedBefore.before).toBe(true);
      const releasedAt = await waitForDbClock(c.grantId, '300 milliseconds');
      await holder.query('COMMIT');
      const e = await pending;
      expect(isRefusal(e, 'CAPABILITY_REFUSED', 'M7013')).toBe(true);
      expect(await mintRows(c.grantId)).toHaveLength(0);
      return {
        lock: label,
        grantExpiresAt: c.grantExpiresAt,
        signerObservedWaitingAt: observedBefore.now,
        signerWaitingBeforeExpiry: observedBefore.before,
        blockedBackend: blocked,
        holderReleasedAt: releasedAt,
        sqlState: 'M7013',
        newMintRows: 0,
      };
    } finally {
      await holder.query('ROLLBACK').catch(() => undefined);
      await holder.end();
    }
  }

  it('begins before expiry, waits on the P1 intent lock across expiry → wakes → M7013, zero rows', async () => {
    EVIDENCE.waitAcrossExpiryP1 = await waitAcrossExpiry('P1_INTENT');
  }, 60_000);

  it('begins before expiry, waits on the P2 backend liveness lock across expiry → M7013, zero rows', async () => {
    EVIDENCE.waitAcrossExpiryP2 = await waitAcrossExpiry('P2_BACKEND');
  }, 60_000);
});

// ─── process status (AUTH §20) ─────────────────────────────────────────────────────────────────
describe('TEST-ONLY child process: the module runs independently with a signer-only environment', () => {
  it('a separate Node process with only the signer credential + digest mints a committed envelope', async () => {
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
    const childPid = Number(ready![1]);
    const census = JSON.parse(ready![2]!) as Record<string, boolean>;
    const c = await claim();
    child.stdin.write(`${c.grantId}\n`);
    const code = await exited;
    const line = out.split('\n').find((l) => l.startsWith('{'));
    expect(code, `${out}\n${err}`).toBe(0);
    const result = JSON.parse(line!) as { pid: number; envelope: M7CommittedGenerationEnvelope };
    expect(childPid).not.toBe(process.pid);
    expect(result.pid).toBe(childPid);
    expect(census).toEqual({
      DATABASE_URL: false,
      M7_PARTICIPANT_DATABASE_URL: false,
      M7_SESSION_ISSUER_DATABASE_URL: false,
      M7_PRIVACY_REQUEST_DATABASE_URL: false,
      M7_STORAGE_WORKER_DATABASE_URL: false,
      M7_DELETION_AUTHORITY_DATABASE_URL: false,
      M7_CAPABILITY_SIGNER_DATABASE_URL: true,
      M7_CONTROL_PLANE_MANIFEST_SHA256: true,
    });
    const rows = await mintRows(c.grantId);
    expect(rows).toHaveLength(1);
    expect(result.envelope.mintSeq).toBe(1);
    expect(result.envelope.envelopeSha256).toBe(rows[0]!.envelopeSha256);
    expect(result.envelope.canonicalObjectKey).toBe(c.canonicalObjectKey);
    EVIDENCE.childProcess = {
      parentPid: process.pid,
      childPid,
      childEnvironmentCensus: census,
      envelope: result.envelope,
      status:
        'TEST-ONLY harness. Signer own production process = PARTIAL / DEFERRED; IMP-20 = OPEN.',
    };
  }, 120_000);
});

// ─── signing-profile routing (XF-17, DB half of T-171c) — LAST: rotates the control plane ──────
describe('signing-profile routing — DB half (AUTH §15, §18)', () => {
  it('generation g under A1; A2 registered (same backend + kind); A1 retired → mint(g) routes to A2, envelope unchanged', async () => {
    const sources = loadS03Sources(ROOT);
    const c = await claim();
    expect(c.storageProfileVersion).toBe(SIGNER_IDENTITIES.A1.storageProfileVersion);
    const eA1 = await mintCommittedGenerationEnvelope(c.grantId);
    expect(eA1.signingProfileVersion).toBe(SIGNER_IDENTITIES.A1.storageProfileVersion);
    expect(eA1.signingCredentialProfileId).toBe(SIGNER_IDENTITIES.A1.credentialProfileId);

    const started = Date.now();
    const a2 = await rotateSignerPlane(admin, sources, 'A2', CTX.backendSha256);
    expect(a2.manifestSha256).toBe(CTX.rotationManifestSha256.A2);
    process.env.M7_CONTROL_PLANE_MANIFEST_SHA256 = a2.manifestSha256;
    await retireSignerProfile(admin, sources, 'A1');
    const eA2 = await mintCommittedGenerationEnvelope(c.grantId);
    const elapsedMs = Date.now() - started;

    expect(eA2.signingProfileVersion).toBe(SIGNER_IDENTITIES.A2.storageProfileVersion);
    expect(eA2.signingCredentialProfileId).toBe(SIGNER_IDENTITIES.A2.credentialProfileId);
    expect(eA2.envelopeSha256).toBe(eA1.envelopeSha256);
    expect(eA2.canonicalObjectKey).toBe(eA1.canonicalObjectKey);
    expect(eA2.backendSha256).toBe(eA1.backendSha256);
    expect(eA2.validUntil).toBe(eA1.validUntil);
    expect(eA2.capabilityOperation).toBe(eA1.capabilityOperation);
    expect(eA2.capabilityMode).toBe(eA1.capabilityMode);
    expect(eA2.envelopeEnforcement).toBe(eA1.envelopeEnforcement);
    expect(eA2.mintSeq).toBe(2);
    const rows = await mintRows(c.grantId);
    expect(rows.map((r) => r.signingProfileVersion)).toEqual([
      SIGNER_IDENTITIES.A1.storageProfileVersion,
      SIGNER_IDENTITIES.A2.storageProfileVersion,
    ]);
    // The generation's own executing profile is history and does not change.
    const { rows: gen } = await admin.query<{ v: string }>(
      `SELECT p."storageProfileVersion" AS v FROM m7.m7_canonical_generation g
         JOIN m7.m7_storage_profile p ON p."id" = g."executingProfileId"
        WHERE g."uploadIntentId" = $1::uuid AND g."leaseEpoch" = $2::bigint`,
      [c.uploadIntentId, c.leaseEpoch],
    );
    expect(gen[0]!.v).toBe(SIGNER_IDENTITIES.A1.storageProfileVersion);
    EVIDENCE.profileRoutingA1toA2 = {
      grantId: c.grantId,
      beforeRotation: {
        profile: eA1.signingProfileVersion,
        credential: eA1.signingCredentialProfileId,
      },
      afterRotation: {
        profile: eA2.signingProfileVersion,
        credential: eA2.signingCredentialProfileId,
      },
      envelopeSha256Unchanged: eA1.envelopeSha256 === eA2.envelopeSha256,
      executingProfileUnchanged: gen[0]!.v,
      rotationAndMintElapsedMs: elapsedMs,
      note: 'DB routing only. No provider credential A2 exists or was used to sign (T-171c NOT PERFORMED).',
    };
  }, 60_000);

  it('the only live profile of the grant backend is of a DIFFERENT capability kind → M7013, no mint', async () => {
    const sources = loadS03Sources(ROOT);
    const c = await claim();
    expect(c.storageProfileVersion).toBe(SIGNER_IDENTITIES.A2.storageProfileVersion);
    expect(c.writeCapabilityMode).toBe('EXACT_KEY_SCOPED_TOKEN');
    const k = await rotateSignerPlane(admin, sources, 'K', CTX.backendSha256);
    process.env.M7_CONTROL_PLANE_MANIFEST_SHA256 = k.manifestSha256;
    await retireSignerProfile(admin, sources, 'A2');
    const { rows: live } = await admin.query<{ v: string; mode: string }>(
      `SELECT "storageProfileVersion" AS v, "writeCapabilityMode"::text AS mode
         FROM m7.m7_storage_profile WHERE "backendSha256" = $1 AND "retiredAt" IS NULL`,
      [CTX.backendSha256],
    );
    expect(live).toEqual([
      { v: SIGNER_IDENTITIES.K.storageProfileVersion, mode: 'EXACT_KEY_PRESIGNED_PUT' },
    ]);
    const e = await refusalOf(mintCommittedGenerationEnvelope(c.grantId));
    expect(isRefusal(e, 'CAPABILITY_REFUSED', 'M7013')).toBe(true);
    expect(await mintRows(c.grantId)).toHaveLength(0);
    EVIDENCE.differentKindRefusal = {
      grantId: c.grantId,
      grantCapabilityMode: c.writeCapabilityMode,
      liveProfilesOnBackend: live,
      sqlState: 'M7013',
      rows: 0,
    };
  }, 60_000);
});

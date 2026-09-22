// PagaMenos · M7 SO-2 EVIDENCE UPLOAD AUTHORIZATION — REAL PostgreSQL (SO-2 AUTH §27–§29).
// Driven by `pnpm m7:so2`.
//
// Every case runs the PRODUCTIVE modules — the SO-2 sealed leaf, the private M7 participant CCA
// engine, the SO-2 fixed executor, the SO-2 tracked adapter and the M7 session module — against a
// throwaway cluster carrying the accepted migrations, the M7 §19 normative DDL and the M7 SO2 RUNTIME
// TEST FIXTURE control plane. Nothing is mocked and no DB evidence is replaced by a stub.
//
// Without the orchestrator's context this suite FAILS TO LOAD (NOT EXECUTED); it never passes by
// default. Tests may import capability-restricted symbols: the accepted capability model exempts test
// files, and the static censuses that keep them out of PRODUCTION source run in `pnpm test`.
//
// The control-plane ROTATION at the end of this file (plane A → plane B → plane A) is a disposable
// TEST-FIXTURE rotation inside a throwaway database. It is NOT production manifest authority, NOT
// LC-3, NOT a selector rotation and NOT lifecycle evidence.
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runCcaTransaction, installTransactionGovernance } from '@/cca/execution-context';
import { isCcaError } from '@/cca/errors';
import { NOT_AUTHORIZED } from '@/cca/sealed-operation';
import { prisma } from '@/db/client';
import { M7ControlPlaneMismatchError } from '@/m7/runtime/m7-errors';
import type { M7EvidenceUploadAuthorization } from '@/m7/so2/evidence-upload-input';
import { beginAuthorizedEvidenceUpload } from '@/m7/so2/m7-evidence-upload.cca-leaf';
import { loadS03Sources } from '@/m7/s03/sources';
import {
  M7SessionError,
  hasM7ParticipantSession,
  issueM7ParticipantSession,
  readM7ParticipantSessionSecret,
  revokeM7ParticipantSession,
} from '@/services/m7-participant-session';
import { recordConsentWithdrawal } from '@/services';
import { resolveTrustedParticipantContext } from '@/services/study-participant-session';
import type { TrustedParticipantContext } from '@/study';
import { PrismaClient } from '@prisma/client';

import {
  SO2_IDENTITIES,
  installSo2Plane,
  reactivateSo2Plane,
  type So2Plane,
} from './__fixtures__/so2-runtime-control-plane';

const RAW_CONTEXT = process.env.M7_SO2_CONTEXT;
if (RAW_CONTEXT === undefined || RAW_CONTEXT === '') {
  throw new Error(
    'M7 SO-2 runtime suite: NOT EXECUTED — run it through `pnpm m7:so2`, which boots the cluster, ' +
      'installs M7 and supplies M7_SO2_CONTEXT.',
  );
}

interface SerializedParticipant {
  readonly label: string;
  readonly participantId: string;
  readonly assignmentId: string;
  readonly intentIds: readonly string[];
  readonly decisionBindingIds: readonly string[];
  readonly optionalEvidenceConsent: boolean;
}

const CTX = JSON.parse(RAW_CONTEXT) as {
  fixtureKind: string;
  manifestSha256: string;
  rotationManifestSha256: string;
  driftedManifestSha256: string;
  database: string;
  port: number;
  migrationRole: string;
  participants: Record<'A' | 'B' | 'N' | 'W' | 'R' | 'SA' | 'SB', SerializedParticipant>;
  urls: { application: string; participant: string; sessionIssuer: string };
};
const P = CTX.participants;
const ROOT = resolve(import.meta.dirname, '..', '..', '..');

/** Structured evidence, written to M7_SO2_SUITE_EVIDENCE after the suite. */
const EVIDENCE: Record<string, unknown> = {};

let admin: pg.Client;
const contexts = new Map<string, TrustedParticipantContext>();
const sessionIds = new Map<string, string>();

/** A CSPRNG nonce of the accepted lexical form (32 chars of base64url ⊂ [A-Za-z0-9_-]). */
const nonce = (): string => randomBytes(24).toString('base64url');

function ctxOf(label: keyof typeof P): TrustedParticipantContext {
  const c = contexts.get(label);
  if (c === undefined) throw new Error(`no M7 session for ${label}`);
  return c;
}

function so2(
  ctx: TrustedParticipantContext,
  purchaseIntentId: string,
  clientCorrelationNonce: string,
): Promise<unknown> {
  return beginAuthorizedEvidenceUpload.execute(ctx, { purchaseIntentId, clientCorrelationNonce });
}

function assertIssued(r: unknown): asserts r is M7EvidenceUploadAuthorization {
  if (r === null || typeof r !== 'object' || !('uploadIntentId' in r)) {
    throw new Error(`SO-2 answered ${JSON.stringify(r)} where an authorization was expected`);
  }
}

async function countIntents(assignmentId?: string): Promise<number> {
  const { rows } = await admin.query<{ n: string }>(
    assignmentId === undefined
      ? 'SELECT pg_catalog.count(*)::text AS n FROM m7.m7_evidence_upload_intent'
      : 'SELECT pg_catalog.count(*)::text AS n FROM m7.m7_evidence_upload_intent WHERE "assignmentId" = $1::uuid',
    assignmentId === undefined ? [] : [assignmentId],
  );
  return Number(rows[0]!.n);
}

interface IntentRow {
  id: string;
  decisionBindingId: string;
  assignmentId: string;
  participantSessionId: string;
  clientCorrelationNonce: string;
  issuanceProfileId: string;
  backendSha256: string;
  stagingObjectKey: string;
  maxBytes: number;
  mediaPolicyVersion: string;
  retentionPolicyVersion: string;
  installationId: string;
  generationPath: string;
  state: string;
  stateVersion: string;
  issuedAt: Date;
  capturedAt: Date;
  uploadExpiresAt: Date;
  intentDeadlineAt: Date;
  stagingWriteFenceAt: Date;
  updatedAt: Date;
  uploadExpiresAtText: string;
}

async function intentRow(id: string): Promise<IntentRow> {
  const { rows } = await admin.query<IntentRow>(
    `SELECT i."id"::text AS "id", i."decisionBindingId"::text AS "decisionBindingId",
            i."assignmentId"::text AS "assignmentId",
            i."participantSessionId"::text AS "participantSessionId",
            i."clientCorrelationNonce", i."issuanceProfileId"::text AS "issuanceProfileId",
            i."backendSha256", i."stagingObjectKey", i."maxBytes", i."mediaPolicyVersion",
            i."retentionPolicyVersion", i."installationId"::text AS "installationId",
            i."generationPath", i."state"::text AS "state", i."stateVersion"::text AS "stateVersion",
            i."issuedAt", i."capturedAt", i."uploadExpiresAt", i."intentDeadlineAt",
            i."stagingWriteFenceAt", i."updatedAt",
            m7.i_ts(i."uploadExpiresAt") AS "uploadExpiresAtText"
       FROM m7.m7_evidence_upload_intent i WHERE i."id" = $1::uuid`,
    [id],
  );
  if (rows.length !== 1) throw new Error(`intent ${id} not found`);
  return rows[0]!;
}

interface PlaneFacts {
  profileId: string;
  backendSha256: string;
  stagingPrefix: string;
  credentialProfileId: string;
  uploadTransport: string;
  storageProfileVersion: string;
  policyVersion: string;
  maxUploadBytes: number;
}

async function planeFacts(plane: So2Plane): Promise<PlaneFacts> {
  const id = SO2_IDENTITIES[plane];
  const { rows } = await admin.query<PlaneFacts>(
    `SELECT p."id"::text AS "profileId", p."backendSha256", b."stagingPrefix",
            p."credentialProfileId", p."uploadTransport"::text AS "uploadTransport",
            p."storageProfileVersion", pol."policyVersion", pol."maxUploadBytes"
       FROM m7.m7_storage_profile p
       JOIN m7.m7_storage_backend b ON b."backendSha256" = p."backendSha256"
       JOIN m7.m7_retention_policy pol ON pol."policyVersion" = $2
      WHERE p."storageProfileVersion" = $1`,
    [id.storageProfileVersion, id.policyVersion],
  );
  if (rows.length !== 1) throw new Error(`plane ${plane} is not registered`);
  return rows[0]!;
}

async function activeInstallation(): Promise<{ id: string; manifestVersion: string }> {
  const { rows } = await admin.query<{ id: string; manifestVersion: string }>(
    `SELECT "id"::text AS "id", "manifestVersion" FROM m7.m7_control_plane_installation
      WHERE "retiredAt" IS NULL`,
  );
  if (rows.length !== 1) throw new Error('not exactly one active installation');
  return rows[0]!;
}

async function withdraw(label: keyof typeof P): Promise<void> {
  await recordConsentWithdrawal({
    trustedParticipantContext: ctxOf(label),
    assignmentId: P[label].assignmentId,
    withdrawPayload: {},
    idempotencyKey: `so2-wd-${label}-${nonce()}`,
  });
}

async function participantClient(): Promise<pg.Client> {
  const c = new pg.Client({ connectionString: CTX.urls.participant });
  await c.connect();
  return c;
}

beforeAll(async () => {
  admin = new pg.Client({ connectionString: CTX.urls.application });
  await admin.connect();
  for (const label of Object.keys(P) as (keyof typeof P)[]) {
    const handle = await issueM7ParticipantSession({
      authenticatedParticipantId: P[label].participantId,
    });
    contexts.set(label, handle.trustedParticipantContext);
    sessionIds.set(label, handle.sessionId);
  }
}, 120_000);

afterAll(async () => {
  const out = process.env.M7_SO2_SUITE_EVIDENCE;
  if (out !== undefined && out !== '') {
    writeFileSync(out, `${JSON.stringify(EVIDENCE, null, 2)}\n`, 'utf8');
  }
  await admin.end();
  await prisma.$disconnect();
});

describe('the fixture control plane is a TEST FIXTURE, not a manifest', () => {
  it('declares itself as such; plane A is the single active installation', async () => {
    expect(CTX.fixtureKind).toBe('M7_SO2_RUNTIME_TEST_FIXTURE_NOT_A_MANIFEST');
    expect(CTX.manifestSha256).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(CTX.rotationManifestSha256).not.toBe(CTX.manifestSha256);
    expect((await activeInstallation()).manifestVersion).toBe(SO2_IDENTITIES.A.manifestVersion);
    expect(P.N.optionalEvidenceConsent).toBe(false);
    expect(P.A.optionalEvidenceConsent).toBe(true);
  });
});

// ─── #6 / #7 / #8 — malformed material is rejected BEFORE CCA and BEFORE any database access ───
describe('SO-2 AUTH §27 #6–#8 — invalid SO-2 material is rejected before CCA / DB', () => {
  const INTENT = (): string => P.A.intentIds[7]!;
  const cases: [string, Record<string, unknown>][] = [
    [
      'malformed purchaseIntentId',
      { purchaseIntentId: 'not-a-uuid', clientCorrelationNonce: 'x'.repeat(22) },
    ],
    [
      'malformed nonce (too short)',
      { purchaseIntentId: 'PLACEHOLDER', clientCorrelationNonce: 'short' },
    ],
    [
      'malformed nonce (bad alphabet)',
      { purchaseIntentId: 'PLACEHOLDER', clientCorrelationNonce: `${'a'.repeat(21)}.` },
    ],
    [
      'unknown input key',
      {
        purchaseIntentId: 'PLACEHOLDER',
        clientCorrelationNonce: 'x'.repeat(22),
        assignmentId: 'x',
      },
    ],
    [
      'injected credentialProfileId',
      {
        purchaseIntentId: 'PLACEHOLDER',
        clientCorrelationNonce: 'x'.repeat(22),
        credentialProfileId: 'b',
      },
    ],
    [
      'injected stagingObjectKey',
      {
        purchaseIntentId: 'PLACEHOLDER',
        clientCorrelationNonce: 'x'.repeat(22),
        stagingObjectKey: 'k',
      },
    ],
    [
      'injected policy',
      {
        purchaseIntentId: 'PLACEHOLDER',
        clientCorrelationNonce: 'x'.repeat(22),
        policy: 'GENERAL_COLLECTION',
      },
    ],
  ];
  const fill = (m: Record<string, unknown>): Record<string, unknown> =>
    m.purchaseIntentId === 'PLACEHOLDER' ? { ...m, purchaseIntentId: INTENT() } : m;

  it.each(cases)('%s → CCA_INVALID_OPERATION_INPUT, zero rows', async (_label, material) => {
    const before = await countIntents();
    await expect(
      beginAuthorizedEvidenceUpload.execute(ctxOf('A'), fill(material) as never),
    ).rejects.toSatisfy((e: unknown) => isCcaError(e, 'CCA_INVALID_OPERATION_INPUT'));
    expect(await countIntents()).toBe(before);
  });

  it.each(cases)(
    '%s is rejected even with NO digest, NO session and INSIDE an outer transaction (A precedes everything)',
    async (_label, material) => {
      const good = process.env.M7_CONTROL_PLANE_MANIFEST_SHA256;
      delete process.env.M7_CONTROL_PLANE_MANIFEST_SHA256;
      const bare = resolveTrustedParticipantContext({
        authenticatedParticipantId: P.A.participantId,
      });
      try {
        await expect(
          beginAuthorizedEvidenceUpload.execute(bare, fill(material) as never),
        ).rejects.toSatisfy((e: unknown) => isCcaError(e, 'CCA_INVALID_OPERATION_INPUT'));
        let caught: unknown;
        await prisma.$transaction(async () => {
          try {
            await beginAuthorizedEvidenceUpload.execute(bare, fill(material) as never);
          } catch (e) {
            caught = e;
          }
        });
        expect(isCcaError(caught, 'CCA_INVALID_OPERATION_INPUT')).toBe(true);
      } finally {
        process.env.M7_CONTROL_PLANE_MANIFEST_SHA256 = good;
      }
    },
  );

  it('rejects an untrusted participant context', async () => {
    await expect(
      so2({ participantId: P.A.participantId } as never, INTENT(), nonce()),
    ).rejects.toSatisfy((e: unknown) => isCcaError(e, 'CCA_UNTRUSTED_PARTICIPANT_CONTEXT'));
  });
});

// ─── #1 / #17 / #20 — the productive happy path, and the committed row ─────────────────────────
describe('SO-2 AUTH §27 #1, #17, #20 — valid context + consent + optionalEvidenceConsent=true', () => {
  it('issues an intent (ISSUED) whose result and row reflect plane A and the derived assignment', async () => {
    const a = await planeFacts('A');
    const installation = await activeInstallation();
    const n = nonce();
    const before = await countIntents(P.A.assignmentId);
    const t0 = Date.now();
    const r = await so2(ctxOf('A'), P.A.intentIds[0]!, n);
    const t1 = Date.now();
    assertIssued(r);
    expect(Object.isFrozen(r)).toBe(true);
    expect(Object.keys(r).sort()).toEqual(
      [
        'credentialProfileId',
        'intentState',
        'maxBytes',
        'stagingObjectKey',
        'storageProfileVersion',
        'uploadExpiresAt',
        'uploadIntentId',
        'uploadTransport',
      ].sort(),
    );
    expect(r.intentState).toBe('ISSUED');
    // #17 — the result reflects the ACTIVE plane A, as RESOLVED BY THE DATABASE.
    expect(r.uploadTransport).toBe(a.uploadTransport);
    expect(r.uploadTransport).toBe('SERVER_MEDIATED');
    expect(r.credentialProfileId).toBe(a.credentialProfileId);
    expect(r.storageProfileVersion).toBe(a.storageProfileVersion);
    expect(r.maxBytes).toBe(a.maxUploadBytes);
    expect(await countIntents(P.A.assignmentId)).toBe(before + 1);

    // #20 — every row fact is server/DB-derived and coherent.
    const row = await intentRow(r.uploadIntentId);
    expect(row.assignmentId).toBe(P.A.assignmentId); // derived from the A2 chain, never supplied
    expect(row.decisionBindingId).toBe(P.A.decisionBindingIds[0]);
    expect(row.participantSessionId).toBe(sessionIds.get('A'));
    expect(row.clientCorrelationNonce).toBe(n);
    expect(row.issuanceProfileId).toBe(a.profileId);
    expect(row.backendSha256).toBe(a.backendSha256);
    expect(row.retentionPolicyVersion).toBe(a.policyVersion);
    expect(row.installationId).toBe(installation.id);
    expect(row.generationPath).toBe('M7_BEGIN_EVIDENCE_UPLOAD_V1');
    expect(row.state).toBe('ISSUED');
    expect(row.stagingObjectKey).toBe(r.stagingObjectKey);
    expect(row.stagingObjectKey).toMatch(
      new RegExp(
        `^${a.stagingPrefix.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}${r.uploadIntentId}/[0-9a-f]{32}$`,
      ),
    );
    expect(row.maxBytes).toBe(r.maxBytes);
    expect(row.uploadExpiresAtText).toBe(r.uploadExpiresAt);
    // capturedAt is the CCA collection instant: sampled by the service inside this call.
    expect(row.capturedAt.getTime()).toBeGreaterThanOrEqual(t0);
    expect(row.capturedAt.getTime()).toBeLessThanOrEqual(t1);
    const ttl = SO2_IDENTITIES.A.uploadUrlTtlSeconds * 1000;
    const fin = SO2_IDENTITIES.A.finalizeWindowSeconds * 1000;
    const fence =
      (SO2_IDENTITIES.A.writeCompletionWindowSeconds + SO2_IDENTITIES.A.writeFenceSkewSeconds) *
      1000;
    expect(row.uploadExpiresAt.getTime() - row.issuedAt.getTime()).toBe(ttl);
    expect(row.intentDeadlineAt.getTime() - row.uploadExpiresAt.getTime()).toBe(fin);
    expect(row.stagingWriteFenceAt.getTime() - row.uploadExpiresAt.getTime()).toBe(fence);
    EVIDENCE.happyPath = {
      result: { ...r, credentialProfileId: '<redacted-in-evidence>' },
      row: { ...row, clientCorrelationNonce: '<redacted>' },
    };
  });
});

// ─── #9 / #12 / #11 — same-nonce idempotency, distinct nonces, and a same-nonce race ───────────
describe('SO-2 AUTH §18 / §27 #9, #11, #12 — issuance idempotency (UNIQUE(binding, nonce))', () => {
  it('#9 exact retry (consent still valid) → SAME intent and SAME historical result, one row', async () => {
    const n = nonce();
    const first = await so2(ctxOf('A'), P.A.intentIds[1]!, n);
    assertIssued(first);
    const rowBefore = await intentRow(first.uploadIntentId);
    const before = await countIntents();
    const again = await so2(ctxOf('A'), P.A.intentIds[1]!, n);
    assertIssued(again);
    expect(again).toEqual(first);
    expect(await countIntents()).toBe(before);
    expect(await intentRow(first.uploadIntentId)).toEqual(rowBefore);
    EVIDENCE.sameNonceReplay = { equal: true, rows: 1 };
  });

  it('#12 a different nonce on the same purchase intent → a DISTINCT intent', async () => {
    const x = await so2(ctxOf('A'), P.A.intentIds[1]!, nonce());
    const y = await so2(ctxOf('A'), P.A.intentIds[1]!, nonce());
    assertIssued(x);
    assertIssued(y);
    expect(x.uploadIntentId).not.toBe(y.uploadIntentId);
    expect(x.stagingObjectKey).not.toBe(y.stagingObjectKey);
  });

  it('#11 concurrent same-nonce calls → ONE durable intent, both converge, no unique leak', async () => {
    const n = nonce();
    const before = await countIntents();
    const results = await Promise.allSettled([
      so2(ctxOf('A'), P.A.intentIds[2]!, n),
      so2(ctxOf('A'), P.A.intentIds[2]!, n),
      so2(ctxOf('A'), P.A.intentIds[2]!, n),
    ]);
    for (const r of results) expect(r.status).toBe('fulfilled');
    const values = results.map((r) => (r as PromiseFulfilledResult<unknown>).value);
    for (const v of values) assertIssued(v);
    const ids = new Set(values.map((v) => (v as M7EvidenceUploadAuthorization).uploadIntentId));
    expect(ids.size).toBe(1);
    expect(values[1]).toEqual(values[0]);
    expect(values[2]).toEqual(values[0]);
    expect(await countIntents()).toBe(before + 1);
    EVIDENCE.concurrentSameNonce = { callers: 3, distinctIntents: ids.size, newRows: 1 };
  }, 60_000);
});

// ─── #2 / #3 — AGR and general-consent refusals ────────────────────────────────────────────────
describe('SO-2 AUTH §8 / §27 #2, #3 — consent refusals are the generic NOT_AUTHORIZED', () => {
  it('#2 general consent valid + optionalEvidenceConsent=false → NOT_AUTHORIZED, zero rows', async () => {
    const before = await countIntents(P.N.assignmentId);
    expect(await so2(ctxOf('N'), P.N.intentIds[0]!, nonce())).toBe(NOT_AUTHORIZED);
    expect(await countIntents(P.N.assignmentId)).toBe(0);
    expect(before).toBe(0);
    EVIDENCE.agrRefusal = { answer: 'NOT_AUTHORIZED', rows: 0 };
  });

  it('#3 withdrawn (general refusal) → the SAME NOT_AUTHORIZED, zero new rows', async () => {
    await withdraw('W');
    expect(await so2(ctxOf('W'), P.W.intentIds[0]!, nonce())).toBe(NOT_AUTHORIZED);
    expect(await countIntents(P.W.assignmentId)).toBe(0);
  });

  it('the AGR refusal and the general refusal are indistinguishable to the caller', async () => {
    const agr = await so2(ctxOf('N'), P.N.intentIds[0]!, nonce());
    const general = await so2(ctxOf('W'), P.W.intentIds[0]!, nonce());
    expect(agr).toBe(general);
    expect(agr).toBe(NOT_AUTHORIZED);
    expect(Object.keys(agr as object)).toEqual(['kind']);
  });
});

// ─── #10 — replay after withdrawal: SO-2 has NO historical replay bypass ────────────────────────
describe('SO-2 AUTH §19 / §27 #10 — same-nonce retry after withdrawal is refused', () => {
  it('existing intent stays unchanged, no duplicate, answer NOT_AUTHORIZED', async () => {
    const n = nonce();
    const first = await so2(ctxOf('R'), P.R.intentIds[0]!, n);
    assertIssued(first);
    const rowBefore = await intentRow(first.uploadIntentId);
    await withdraw('R');
    const retry = await so2(ctxOf('R'), P.R.intentIds[0]!, n);
    // Deliberately DIFFERENT from SO-1's optimistic historical replay: SO-2 re-enters CCA and
    // evaluates CURRENT consent before the function could return the existing intent.
    expect(retry).toBe(NOT_AUTHORIZED);
    expect(await countIntents(P.R.assignmentId)).toBe(1);
    expect(await intentRow(first.uploadIntentId)).toEqual(rowBefore);
    EVIDENCE.replayAfterWithdrawal = {
      answer: 'NOT_AUTHORIZED',
      rowsForAssignment: 1,
      existingRowUnchanged: true,
    };
  });
});

// ─── #4 / #5 / #13 — authorization-shaped refusals ─────────────────────────────────────────────
describe('SO-2 AUTH §26 / §27 #4, #5, #13 — authorization answers are indistinguishable', () => {
  it('#4 a session revoked IN THE DATABASE → the engine gets 28000 → generic NOT_AUTHORIZED, zero rows', async () => {
    // Revoke through the accepted session-issuer FUNCTION on the issuer-role connection, bypassing
    // the in-process module on purpose: the process still holds the (now invalid) secret, so the
    // sealed SO-2 path genuinely reaches PostgreSQL with a session the database refuses.
    const live = await issueM7ParticipantSession({
      authenticatedParticipantId: P.A.participantId,
    });
    const issuer = new pg.Client({ connectionString: CTX.urls.sessionIssuer });
    await issuer.connect();
    try {
      await issuer.query(
        `SELECT m7.s_revoke_participant_session_v1($1::text, $2::uuid, 'LOGOUT'::m7."M7SessionRevocationReason")`,
        [CTX.manifestSha256, live.sessionId],
      );
    } finally {
      await issuer.end();
    }
    expect(hasM7ParticipantSession(live.trustedParticipantContext)).toBe(true);
    const before = await countIntents();
    expect(await so2(live.trustedParticipantContext, P.A.intentIds[3]!, nonce())).toBe(
      NOT_AUTHORIZED,
    );
    expect(await countIntents()).toBe(before);
    // …indistinguishable from a consent refusal.
    expect(await so2(ctxOf('N'), P.N.intentIds[0]!, nonce())).toBe(NOT_AUTHORIZED);
  });

  it('#4 a module-revoked session is gone from the process too (no stale capability)', async () => {
    const handle = await issueM7ParticipantSession({
      authenticatedParticipantId: P.A.participantId,
    });
    await revokeM7ParticipantSession({
      trustedParticipantContext: handle.trustedParticipantContext,
      reason: 'LOGOUT',
    });
    expect(hasM7ParticipantSession(handle.trustedParticipantContext)).toBe(false);
  });

  it('#4 a WRONG session secret is refused by the database with the indistinguishable 28000', async () => {
    const c = await participantClient();
    try {
      const e = await c
        .query(
          `SELECT * FROM m7.p_begin_evidence_upload_v1($1::text,$2::bytea,$3::uuid,$4::uuid,$5::uuid,$6::timestamptz,$7::text)`,
          [
            CTX.manifestSha256,
            Buffer.alloc(32, 9),
            P.A.participantId,
            P.A.assignmentId,
            P.A.intentIds[3],
            new Date().toISOString(),
            nonce(),
          ],
        )
        .then(
          () => null,
          (x: { code?: string; message?: string }) => x,
        );
      expect(e?.code).toBe('28000');
      expect(e?.message).toContain('M7_SESSION_INVALID');
    } finally {
      await c.end();
    }
  });

  it('#4 a genuine context with NO M7 session never reaches the database (typed session error)', async () => {
    const bare = resolveTrustedParticipantContext({
      authenticatedParticipantId: P.A.participantId,
    });
    const before = await countIntents();
    await expect(so2(bare, P.A.intentIds[3]!, nonce())).rejects.toBeInstanceOf(M7SessionError);
    expect(await countIntents()).toBe(before);
  });

  it('#5 another participant’s purchase intent → generic NOT_AUTHORIZED, zero rows', async () => {
    const beforeB = await countIntents(P.B.assignmentId);
    const beforeA = await countIntents(P.A.assignmentId);
    expect(await so2(ctxOf('A'), P.B.intentIds[0]!, nonce())).toBe(NOT_AUTHORIZED);
    expect(await countIntents(P.B.assignmentId)).toBe(beforeB);
    expect(await countIntents(P.A.assignmentId)).toBe(beforeA);
  });

  it('#5 an unknown purchase intent → the SAME generic answer', async () => {
    expect(await so2(ctxOf('A'), '00000000-0000-4000-8000-000000000000', nonce())).toBe(
      NOT_AUTHORIZED,
    );
  });

  it('#13 cross-assignment (own proved assignment + another assignment’s intent) → M7008, rollback', async () => {
    const secret = readM7ParticipantSessionSecret(ctxOf('A'));
    const before = await countIntents();
    const c = await participantClient();
    try {
      await c.query('BEGIN');
      const e = await c
        .query(
          `SELECT * FROM m7.p_begin_evidence_upload_v1($1::text,$2::bytea,$3::uuid,$4::uuid,$5::uuid,$6::timestamptz,$7::text)`,
          [
            CTX.manifestSha256,
            secret,
            P.A.participantId,
            P.A.assignmentId,
            P.B.intentIds[0],
            new Date().toISOString(),
            nonce(),
          ],
        )
        .then(
          () => null,
          (x: { code?: string; message?: string }) => x,
        );
      await c.query('ROLLBACK');
      expect(e?.code).toBe('M7008');
      expect(e?.message).toContain('M7_DECISION_NOT_AVAILABLE');
    } finally {
      await c.end();
    }
    expect(await countIntents()).toBe(before);
    EVIDENCE.crossAssignment = { sqlstate: 'M7008', rows: 0 };
  });
});

// ─── #14 / #15 — CCA topology preflight, before ANY SO-2 database access ───────────────────────
describe('SO-2 AUTH §11 / §27 #14, #15 — CCA entry topology precedes every SO-2 database step', () => {
  let existing: { intent: string; nonce: string; result: M7EvidenceUploadAuthorization };
  let bare: TrustedParticipantContext;

  beforeAll(async () => {
    const n = nonce();
    const r = await so2(ctxOf('A'), P.A.intentIds[4]!, n);
    assertIssued(r);
    existing = { intent: P.A.intentIds[4]!, nonce: n, result: r };
    bare = resolveTrustedParticipantContext({ authenticatedParticipantId: P.A.participantId });
    expect(hasM7ParticipantSession(bare)).toBe(false);
  }, 120_000);

  async function withoutDigest<T>(f: () => Promise<T>): Promise<T> {
    const good = process.env.M7_CONTROL_PLANE_MANIFEST_SHA256;
    delete process.env.M7_CONTROL_PLANE_MANIFEST_SHA256;
    try {
      return await f();
    } finally {
      process.env.M7_CONTROL_PLANE_MANIFEST_SHA256 = good;
    }
  }

  async function insideOuterTransaction(
    ctx: TrustedParticipantContext,
    intent: string,
    n: string,
  ): Promise<unknown> {
    let caught: unknown = 'NO ERROR — the call returned';
    await prisma.$transaction(async () => {
      try {
        caught = { returned: await so2(ctx, intent, n) };
      } catch (e) {
        caught = e;
      }
    });
    return caught;
  }

  async function insideActiveCca(
    ctx: TrustedParticipantContext,
    intent: string,
    n: string,
  ): Promise<unknown> {
    const client = installTransactionGovernance(
      new PrismaClient({ datasourceUrl: CTX.urls.participant }),
    );
    let caught: unknown = 'NO ERROR — the call returned';
    try {
      await runCcaTransaction(client, {}, async () => {
        try {
          caught = { returned: await so2(ctx, intent, n) };
        } catch (e) {
          caught = e;
        }
      });
    } finally {
      await client.$disconnect();
    }
    return caught;
  }

  it('#14 outer application transaction (new nonce) → CCA_TOP_LEVEL_TRANSACTION_REQUIRED, zero rows', async () => {
    const before = await countIntents();
    const e = await insideOuterTransaction(ctxOf('A'), P.A.intentIds[4]!, nonce());
    expect(isCcaError(e, 'CCA_TOP_LEVEL_TRANSACTION_REQUIRED')).toBe(true);
    expect(await countIntents()).toBe(before);
  });

  it('#14 outer transaction + an EXISTING intent’s exact nonce → TOP_LEVEL, NOT the existing intent', async () => {
    const before = await countIntents();
    const e = await insideOuterTransaction(ctxOf('A'), existing.intent, existing.nonce);
    expect(e).not.toHaveProperty('returned');
    expect(isCcaError(e, 'CCA_TOP_LEVEL_TRANSACTION_REQUIRED')).toBe(true);
    expect(await countIntents()).toBe(before);
  });

  it('#14 the guard fires BEFORE the digest read and BEFORE the session read', async () => {
    for (const n of [existing.nonce, nonce()]) {
      const noDigest = await withoutDigest(() =>
        insideOuterTransaction(ctxOf('A'), existing.intent, n),
      );
      expect(isCcaError(noDigest, 'CCA_TOP_LEVEL_TRANSACTION_REQUIRED')).toBe(true);
      const noSession = await insideOuterTransaction(bare, existing.intent, n);
      expect(isCcaError(noSession, 'CCA_TOP_LEVEL_TRANSACTION_REQUIRED')).toBe(true);
      expect(noSession).not.toBeInstanceOf(M7SessionError);
    }
  });

  it('#15 active CCA context → CCA_REENTRY_FORBIDDEN on the REAL sealed SO-2 operation, zero rows', async () => {
    const before = await countIntents();
    const fresh = await insideActiveCca(ctxOf('A'), P.A.intentIds[4]!, nonce());
    expect(isCcaError(fresh, 'CCA_REENTRY_FORBIDDEN')).toBe(true);
    const exact = await insideActiveCca(ctxOf('A'), existing.intent, existing.nonce);
    expect(exact).not.toHaveProperty('returned');
    expect(isCcaError(exact, 'CCA_REENTRY_FORBIDDEN')).toBe(true);
    expect(await countIntents()).toBe(before);
  }, 60_000);

  it('#15 the re-entry guard fires BEFORE the digest read and BEFORE the session read', async () => {
    const noDigest = await withoutDigest(() =>
      insideActiveCca(ctxOf('A'), existing.intent, existing.nonce),
    );
    expect(isCcaError(noDigest, 'CCA_REENTRY_FORBIDDEN')).toBe(true);
    const noSession = await insideActiveCca(bare, existing.intent, existing.nonce);
    expect(isCcaError(noSession, 'CCA_REENTRY_FORBIDDEN')).toBe(true);
    EVIDENCE.topology = {
      outerTransaction: 'CCA_TOP_LEVEL_TRANSACTION_REQUIRED',
      activeCca: 'CCA_REENTRY_FORBIDDEN',
      maskedByMissingDigest: false,
      maskedByMissingSession: false,
    };
  }, 60_000);

  it('outside any transaction the same exact nonce still returns the existing intent', async () => {
    const r = await so2(ctxOf('A'), existing.intent, existing.nonce);
    assertIssued(r);
    expect(r).toEqual(existing.result);
  });
});

// ─── #16 — control-plane digest mismatch ───────────────────────────────────────────────────────
describe('SO-2 AUTH §27 #16 — a drifted control plane refuses with 55000 and writes nothing', () => {
  it('raises M7_CONTROL_PLANE_MISMATCH (typed, not a consent denial), zero rows', async () => {
    const before = await countIntents();
    const good = process.env.M7_CONTROL_PLANE_MANIFEST_SHA256;
    process.env.M7_CONTROL_PLANE_MANIFEST_SHA256 = CTX.driftedManifestSha256;
    try {
      await expect(so2(ctxOf('A'), P.A.intentIds[5]!, nonce())).rejects.toBeInstanceOf(
        M7ControlPlaneMismatchError,
      );
    } finally {
      process.env.M7_CONTROL_PLANE_MANIFEST_SHA256 = good;
    }
    expect(await countIntents()).toBe(before);
    // And the database says 55000 for the same call shape.
    const c = await participantClient();
    try {
      const e = await c
        .query(`SELECT m7.p_lock_and_prove_assignment_v1($1::text,$2::bytea,$3::uuid,$4::uuid)`, [
          CTX.driftedManifestSha256,
          readM7ParticipantSessionSecret(ctxOf('A')),
          P.A.participantId,
          P.A.assignmentId,
        ])
        .then(
          () => null,
          (x: { code?: string; message?: string }) => x,
        );
      expect(e?.code).toBe('55000');
      expect(e?.message).toContain('M7_CONTROL_PLANE_MISMATCH');
    } finally {
      await c.end();
    }
    EVIDENCE.digestMismatch = { sqlstate: '55000', error: 'M7ControlPlaneMismatchError', rows: 0 };
  });
});

// ─── §28 — withdrawal serialization on the assignment lock, both orders ────────────────────────
describe('SO-2 AUTH §28 — withdrawal serialization (real interleaving, both orders)', () => {
  interface Waiter {
    pid: number;
    blockers: number[];
  }

  async function waiters(): Promise<Waiter[]> {
    const { rows } = await admin.query<{ pid: number; blockers: number[] }>(
      `SELECT DISTINCT l.pid, pg_catalog.pg_blocking_pids(l.pid) AS blockers
         FROM pg_catalog.pg_locks l WHERE NOT l.granted AND l.pid IS NOT NULL`,
    );
    return rows.map((r) => ({ pid: r.pid, blockers: [...r.blockers] }));
  }

  async function waitFor(pred: (w: Waiter) => boolean, label: string): Promise<Waiter> {
    const deadline = Date.now() + 4_000;
    while (Date.now() < deadline) {
      const hit = (await waiters()).find(pred);
      if (hit !== undefined) return hit;
      await new Promise((r) => setTimeout(r, 25));
    }
    throw new Error(`timed out waiting for ${label}`);
  }

  async function holder(): Promise<{ c: pg.Client; pid: number }> {
    const c = new pg.Client({ connectionString: CTX.urls.application });
    await c.connect();
    const { rows } = await c.query<{ pid: number }>('SELECT pg_catalog.pg_backend_pid() AS pid');
    return { c, pid: rows[0]!.pid };
  }

  async function withdrawalRecordedAt(assignmentId: string): Promise<Date> {
    const { rows } = await admin.query<{ at: Date }>(
      `SELECT "recordedAt" AS at FROM public.study_consent_event
        WHERE "assignmentId" = $1::uuid AND "action" = 'WITHDRAWN'`,
      [assignmentId],
    );
    expect(rows).toHaveLength(1);
    return rows[0]!.at;
  }

  it('Case A — SO-2 holds the assignment lock first: consent valid → intent commits → withdrawal after', async () => {
    const a = await planeFacts('A');
    const h = await holder();
    try {
      // Pause SO-2 AFTER it took the assignment lock and evaluated consent: hold the class-10
      // backend row, which `p_begin_evidence_upload_v1` takes FOR SHARE last, before its INSERT.
      await h.c.query('BEGIN');
      await h.c.query(`SELECT 1 FROM m7.m7_storage_backend WHERE "backendSha256" = $1 FOR UPDATE`, [
        a.backendSha256,
      ]);
      const so2Call = so2(ctxOf('SA'), P.SA.intentIds[0]!, nonce());
      const so2Waiter = await waitFor((w) => w.blockers.includes(h.pid), 'SO-2 blocked on backend');
      const wdCall = withdraw('SA');
      const wdWaiter = await waitFor(
        (w) => w.pid !== so2Waiter.pid && w.blockers.includes(so2Waiter.pid),
        'withdrawal blocked behind SO-2 on the assignment row',
      );
      await h.c.query('COMMIT');
      const r = await so2Call;
      await wdCall;
      assertIssued(r);
      expect(r.intentState).toBe('ISSUED');
      const row = await intentRow(r.uploadIntentId);
      const withdrawnAt = await withdrawalRecordedAt(P.SA.assignmentId);
      expect(row.issuedAt.getTime()).toBeLessThan(withdrawnAt.getTime());
      expect(row.capturedAt.getTime()).toBeLessThan(withdrawnAt.getTime());
      // After the withdrawal, a NEW SO-2 is refused.
      expect(await so2(ctxOf('SA'), P.SA.intentIds[0]!, nonce())).toBe(NOT_AUTHORIZED);
      expect(await countIntents(P.SA.assignmentId)).toBe(1);
      EVIDENCE.serializationCaseA = {
        holderPid: h.pid,
        so2Waiter,
        withdrawalWaiter: wdWaiter,
        intentIssuedAt: row.issuedAt.toISOString(),
        withdrawalRecordedAt: withdrawnAt.toISOString(),
        intentsForAssignment: 1,
      };
    } finally {
      await h.c.end();
    }
  }, 60_000);

  it('Case B — withdrawal commits first: SO-2 then takes the lock, current consent fails, no intent', async () => {
    const h = await holder();
    try {
      await h.c.query('BEGIN');
      await h.c.query(
        `SELECT 1 FROM public.experiment_assignment WHERE "id" = $1::uuid FOR UPDATE`,
        [P.SB.assignmentId],
      );
      const wdCall = withdraw('SB');
      const wdWaiter = await waitFor((w) => w.blockers.includes(h.pid), 'withdrawal queued first');
      const so2Call = so2(ctxOf('SB'), P.SB.intentIds[0]!, nonce());
      const so2Waiter = await waitFor(
        (w) => w.pid !== wdWaiter.pid && w.pid !== h.pid,
        'SO-2 queued behind the withdrawal',
      );
      await h.c.query('COMMIT');
      await wdCall;
      const r = await so2Call;
      expect(r).toBe(NOT_AUTHORIZED);
      expect(await countIntents(P.SB.assignmentId)).toBe(0);
      EVIDENCE.serializationCaseB = {
        holderPid: h.pid,
        withdrawalWaiter: wdWaiter,
        so2Waiter,
        so2Answer: 'NOT_AUTHORIZED',
        intentsForAssignment: 0,
      };
    } finally {
      await h.c.end();
    }
  }, 60_000);
});

// ─── #17 / #18 / #19 — RP-3 / SI-2 across a TEST-FIXTURE control-plane rotation (runs LAST) ────
describe('SO-2 AUTH §20 / §27 #17–#19 — exact replay across a control-plane rotation returns history', () => {
  it('A-issued intent replays with A facts under B; a new nonce binds B; A→B→A keeps both historical', async () => {
    const a = await planeFacts('A');
    const nA = nonce();
    const underA = await so2(ctxOf('A'), P.A.intentIds[6]!, nA);
    assertIssued(underA);
    const rowA = await intentRow(underA.uploadIntentId);
    expect(underA.uploadTransport).toBe('SERVER_MEDIATED');
    expect(underA.credentialProfileId).toBe(a.credentialProfileId);

    // 3. rotate the disposable TEST control plane to plane B (owner-class c_* calls).
    const sources = loadS03Sources(ROOT);
    const installB = await installSo2Plane(admin, sources, 'B');
    expect(installB.manifestSha256).toBe(CTX.rotationManifestSha256);
    expect((await activeInstallation()).manifestVersion).toBe(SO2_IDENTITIES.B.manifestVersion);
    const b = await planeFacts('B');
    expect(b.backendSha256).not.toBe(a.backendSha256);

    // RP-6: the OLD expected digest is now refused (deployment fail-closed), even for a replay.
    await expect(so2(ctxOf('A'), P.A.intentIds[6]!, nA)).rejects.toBeInstanceOf(
      M7ControlPlaneMismatchError,
    );

    // 4. the TEST expected digest follows the newly active TEST manifest.
    const good = process.env.M7_CONTROL_PLANE_MANIFEST_SHA256;
    process.env.M7_CONTROL_PLANE_MANIFEST_SHA256 = CTX.rotationManifestSha256;
    try {
      // 5. #18 exact replay, consent still valid → the SAME intent with plane A's historical facts.
      const before = await countIntents();
      const replay = await so2(ctxOf('A'), P.A.intentIds[6]!, nA);
      assertIssued(replay);
      expect(replay).toEqual(underA);
      expect(replay.uploadTransport).toBe('SERVER_MEDIATED'); // A's, not B's PRESIGNED_PUT
      expect(replay.credentialProfileId).toBe(a.credentialProfileId);
      expect(replay.storageProfileVersion).toBe(a.storageProfileVersion);
      expect(replay.maxBytes).toBe(a.maxUploadBytes);
      expect(replay.stagingObjectKey.startsWith(a.stagingPrefix)).toBe(true);
      expect(await countIntents()).toBe(before);
      expect(await intentRow(underA.uploadIntentId)).toEqual(rowA);

      // #19 a NEW nonce under B → a new intent bound to plane B.
      const nB = nonce();
      const underB = await so2(ctxOf('A'), P.A.intentIds[6]!, nB);
      assertIssued(underB);
      expect(underB.uploadIntentId).not.toBe(underA.uploadIntentId);
      expect(underB.uploadTransport).toBe('PRESIGNED_PUT');
      expect(underB.credentialProfileId).toBe(b.credentialProfileId);
      expect(underB.storageProfileVersion).toBe(b.storageProfileVersion);
      expect(underB.maxBytes).toBe(b.maxUploadBytes);
      expect(underB.stagingObjectKey.startsWith(b.stagingPrefix)).toBe(true);
      const rowB = await intentRow(underB.uploadIntentId);
      expect(rowB.issuanceProfileId).toBe(b.profileId);
      expect(rowB.backendSha256).toBe(b.backendSha256);
      expect(rowB.retentionPolicyVersion).toBe(b.policyVersion);
      expect(rowB.installationId).toBe((await activeInstallation()).id);
      expect(rowB.uploadExpiresAt.getTime() - rowB.issuedAt.getTime()).toBe(
        SO2_IDENTITIES.B.uploadUrlTtlSeconds * 1000,
      );

      // A → B → A: roll the TEST control plane back; B's intent still replays with B's facts.
      await reactivateSo2Plane(admin, sources, 'A');
      process.env.M7_CONTROL_PLANE_MANIFEST_SHA256 = CTX.manifestSha256;
      const replayB = await so2(ctxOf('A'), P.A.intentIds[6]!, nB);
      assertIssued(replayB);
      expect(replayB).toEqual(underB);
      expect(replayB.uploadTransport).toBe('PRESIGNED_PUT');

      EVIDENCE.rotationReplay = {
        notProductionAuthority: true,
        notLC3: true,
        notSelectorRotation: true,
        planeA: { profileVersion: a.storageProfileVersion, transport: a.uploadTransport },
        planeB: { profileVersion: b.storageProfileVersion, transport: b.uploadTransport },
        exactReplayUnderB: {
          sameIntent: replay.uploadIntentId === underA.uploadIntentId,
          transport: replay.uploadTransport,
          storageProfileVersion: replay.storageProfileVersion,
          maxBytes: replay.maxBytes,
          uploadExpiresAt: replay.uploadExpiresAt === underA.uploadExpiresAt,
        },
        newNonceUnderB: {
          transport: underB.uploadTransport,
          storageProfileVersion: underB.storageProfileVersion,
          maxBytes: underB.maxBytes,
        },
        replayOfBAfterRollbackToA: { transport: replayB.uploadTransport },
        oldDigestAfterRotation: 'M7ControlPlaneMismatchError (RP-6)',
      };
    } finally {
      process.env.M7_CONTROL_PLANE_MANIFEST_SHA256 = good;
    }
    expect((await activeInstallation()).manifestVersion).toBe(SO2_IDENTITIES.A.manifestVersion);
  }, 120_000);
});

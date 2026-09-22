// PagaMenos · M7 SO-1 PARTICIPANT RUNTIME — REAL PostgreSQL (AUTH §24). Driven by `pnpm m7:so1`.
//
// Every case below runs the PRODUCTIVE modules — the sealed leaf, the private M7 participant CCA
// engine, the fixed executor, the tracked adapter and the M7 session module — against a throwaway
// cluster carrying the accepted migrations, the M7 §19 normative DDL and the M7 SO1 RUNTIME TEST
// FIXTURE control plane. Nothing is mocked and no DB evidence is replaced by a stub.
//
// Without the orchestrator's context this suite FAILS TO LOAD (NOT EXECUTED); it never passes by
// default. Tests may import capability-restricted symbols: the accepted capability model exempts
// test files, and the static censuses that keep them out of PRODUCTION source run in `pnpm test`.
import { createHash } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runCcaTransaction, installTransactionGovernance } from '@/cca/execution-context';
import { isCcaError } from '@/cca/errors';
import { NOT_AUTHORIZED } from '@/cca/sealed-operation';
import { prisma } from '@/db/client';
import { M7ControlPlaneMismatchError, M7IdempotencyConflictError } from '@/m7/runtime/m7-errors';
import { recordAuthorizedOutcomeAssertion } from '@/m7/so1/m7-outcome-assertion.cca-leaf';
import type { M7OutcomeAssertionResult } from '@/m7/so1/outcome-assertion-input';
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

const RAW_CONTEXT = process.env.M7_SO1_CONTEXT;
if (RAW_CONTEXT === undefined || RAW_CONTEXT === '') {
  throw new Error(
    'M7 SO-1 runtime suite: NOT EXECUTED — run it through `pnpm m7:so1`, which boots the cluster, ' +
      'installs M7 and supplies M7_SO1_CONTEXT.',
  );
}

interface SerializedParticipant {
  readonly label: string;
  readonly participantId: string;
  readonly assignmentId: string;
  readonly intentIds: readonly string[];
}

const CTX = JSON.parse(RAW_CONTEXT) as {
  fixtureKind: string;
  manifestSha256: string;
  driftedManifestSha256: string;
  merchantRefs: readonly string[];
  database: string;
  port: number;
  participants: Record<'A' | 'B' | 'C', SerializedParticipant>;
  urls: { application: string; participant: string; sessionIssuer: string };
};

let admin: pg.Client;
let contextA: TrustedParticipantContext;

/** Distinct, grammar-valid transport keys. */
let seq = 0;
const key = (tag: string): string => `so1-${tag}-${String((seq += 1)).padStart(6, '0')}-k`;

function original(
  intentId: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    purchaseIntentId: intentId,
    clientCaptureKey: key('cap'),
    idempotencyKey: key('idem'),
    assertionKind: 'ORIGINAL',
    statusLabel: 'SELF_REPORTED',
    occurrenceAssertion: 'REALIZED_PURCHASE',
    merchant: { kind: 'VOCABULARY_MERCHANT', merchantRef: CTX.merchantRefs[0] },
    eventTime: { kind: 'LIMA_DATE', date: '2026-07-28' },
    ...overrides,
  };
}

async function countAssertions(): Promise<number> {
  const { rows } = await admin.query<{ n: string }>(
    'SELECT pg_catalog.count(*)::text AS n FROM m7.m7_outcome_assertion',
  );
  return Number(rows[0]!.n);
}

async function countReceipts(): Promise<number> {
  const { rows } = await admin.query<{ n: string }>(
    'SELECT pg_catalog.count(*)::text AS n FROM m7.m7_outcome_command_receipt',
  );
  return Number(rows[0]!.n);
}

/**
 * Narrow an SO-1 answer to a recorded result. The generic refusal is a SENTINEL VALUE, not an error,
 * so a test that expected a collection must say so explicitly rather than read fields off it.
 */
function assertRecorded(r: unknown): asserts r is M7OutcomeAssertionResult {
  if (r === null || typeof r !== 'object' || !('assertionId' in r)) {
    throw new Error('the SO-1 operation answered NOT_AUTHORIZED where a collection was expected');
  }
}

/** A direct participant-role connection, for the DB-level authorization probes. */
async function participantClient(): Promise<pg.Client> {
  const c = new pg.Client({ connectionString: CTX.urls.participant });
  await c.connect();
  return c;
}

beforeAll(async () => {
  admin = new pg.Client({ connectionString: CTX.urls.application });
  await admin.connect();
  const handle = await issueM7ParticipantSession({
    authenticatedParticipantId: CTX.participants.A.participantId,
  });
  contextA = handle.trustedParticipantContext;
}, 120_000);

afterAll(async () => {
  await admin.end();
  await prisma.$disconnect();
});

describe('the fixture control plane is a TEST FIXTURE, not a manifest', () => {
  it('declares itself as such and is the single active installation', async () => {
    expect(CTX.fixtureKind).toBe('M7_SO1_RUNTIME_TEST_FIXTURE_NOT_A_MANIFEST');
    expect(CTX.manifestSha256).toMatch(/^sha256:[0-9a-f]{64}$/);
    const { rows } = await admin.query<{ n: string }>(
      `SELECT pg_catalog.count(*)::text AS n FROM m7.m7_control_plane_installation WHERE "retiredAt" IS NULL`,
    );
    expect(rows[0]!.n).toBe('1');
  });
});

describe('§8.2 — the participant session capability', () => {
  it('mints exactly 32 CSPRNG bytes and the database sees ONLY the SHA-256 digest', async () => {
    const secret = readM7ParticipantSessionSecret(contextA);
    expect(secret).toHaveLength(32);

    const { rows } = await admin.query<{ len: number; digest: Buffer; pid: string }>(
      `SELECT pg_catalog.octet_length("handleSha256") AS len, "handleSha256" AS digest,
              "participantId"::text AS pid
         FROM m7.m7_participant_session ORDER BY "issuedAt" DESC LIMIT 1`,
    );
    const row = rows[0]!;
    expect(row.len).toBe(32);
    expect(row.pid).toBe(CTX.participants.A.participantId);
    expect(Buffer.from(row.digest).toString('hex')).toBe(
      createHash('sha256').update(secret).digest('hex'),
    );
    // The RAW secret is nowhere in the session table.
    const { rows: leak } = await admin.query<{ n: string }>(
      `SELECT pg_catalog.count(*)::text AS n FROM m7.m7_participant_session WHERE "handleSha256" = $1::bytea`,
      [secret],
    );
    expect(leak[0]!.n).toBe('0');
  });

  it('binds the capability to the genuine trusted context, and to no other', async () => {
    expect(hasM7ParticipantSession(contextA)).toBe(true);
    const impostor = { participantId: CTX.participants.A.participantId } as never;
    expect(hasM7ParticipantSession(impostor)).toBe(false);
    expect(() => readM7ParticipantSessionSecret(impostor)).toThrowError(M7SessionError);

    // A second issuance for the same participant is a DIFFERENT capability.
    const second = await issueM7ParticipantSession({
      authenticatedParticipantId: CTX.participants.A.participantId,
    });
    const a = readM7ParticipantSessionSecret(contextA);
    const b = readM7ParticipantSessionSecret(second.trustedParticipantContext);
    expect(Buffer.compare(a, b)).not.toBe(0);
  });

  it('rejects a WRONG secret with the indistinguishable 28000', async () => {
    const c = await participantClient();
    try {
      await expect(
        c.query(
          `SELECT m7.p_lock_and_prove_assignment_v1($1::text, $2::bytea, $3::uuid, $4::uuid)`,
          [
            CTX.manifestSha256,
            Buffer.alloc(32, 7),
            CTX.participants.A.participantId,
            CTX.participants.A.assignmentId,
          ],
        ),
      ).rejects.toMatchObject({ code: '28000' });
    } finally {
      await c.end();
    }
  });

  it('rejects a FOREIGN participant with the SAME 28000, and the two are indistinguishable', async () => {
    const c = await participantClient();
    try {
      const secret = readM7ParticipantSessionSecret(contextA);
      const foreign = await c
        .query(
          `SELECT m7.p_lock_and_prove_assignment_v1($1::text, $2::bytea, $3::uuid, $4::uuid)`,
          [
            CTX.manifestSha256,
            secret,
            CTX.participants.B.participantId,
            CTX.participants.B.assignmentId,
          ],
        )
        .then(
          () => null,
          (e: { code?: string; message?: string }) => e,
        );
      expect(foreign?.code).toBe('28000');
      expect(foreign?.message).toContain('M7_SESSION_INVALID');
    } finally {
      await c.end();
    }
  });

  it('rejects a REVOKED session (RV-1), and reports quiescence honestly (RV-3/RV-4)', async () => {
    const handle = await issueM7ParticipantSession({
      authenticatedParticipantId: CTX.participants.B.participantId,
    });
    const secret = readM7ParticipantSessionSecret(handle.trustedParticipantContext);
    const outcome = await revokeM7ParticipantSession({
      trustedParticipantContext: handle.trustedParticipantContext,
      reason: 'LOGOUT',
    });
    expect(['COMPLETE', 'REVOKED_NOT_YET_QUIESCENT']).toContain(outcome.state);
    // Nothing quiescent-looking is reported unless the database said QUIESCENT.
    const { rows } = await admin.query<{ n: string }>(
      `SELECT pg_catalog.count(*)::text AS n FROM m7.m7_participant_session_revocation WHERE "sessionId" = $1::uuid`,
      [handle.sessionId],
    );
    expect(rows[0]!.n).toBe('1');

    const c = await participantClient();
    try {
      await expect(
        c.query(
          `SELECT m7.p_lock_and_prove_assignment_v1($1::text, $2::bytea, $3::uuid, $4::uuid)`,
          [
            CTX.manifestSha256,
            secret,
            CTX.participants.B.participantId,
            CTX.participants.B.assignmentId,
          ],
        ),
      ).rejects.toMatchObject({ code: '28000' });
    } finally {
      await c.end();
    }
    // The in-process capability is gone too.
    expect(hasM7ParticipantSession(handle.trustedParticipantContext)).toBe(false);
  });
});

describe('§9.1 — invalid SO-1 material is rejected BEFORE CCA', () => {
  it('rejects malformed grammar without touching the database', async () => {
    const before = await countAssertions();
    await expect(
      recordAuthorizedOutcomeAssertion.execute(
        contextA,
        original(CTX.participants.A.intentIds[0]!, { statusLabel: 'EVIDENCE_VERIFIED' }) as never,
      ),
    ).rejects.toSatisfy((e: unknown) => isCcaError(e, 'CCA_INVALID_OPERATION_INPUT'));
    expect(await countAssertions()).toBe(before);
  });

  it('rejects an unknown input key without touching the database', async () => {
    const before = await countAssertions();
    await expect(
      recordAuthorizedOutcomeAssertion.execute(
        contextA,
        original(CTX.participants.A.intentIds[0]!, { assignmentId: 'injected' }) as never,
      ),
    ).rejects.toSatisfy((e: unknown) => isCcaError(e, 'CCA_INVALID_OPERATION_INPUT'));
    expect(await countAssertions()).toBe(before);
  });

  it('rejects a session secret smuggled into the operation input', async () => {
    await expect(
      recordAuthorizedOutcomeAssertion.execute(
        contextA,
        original(CTX.participants.A.intentIds[0]!, {
          sessionSecret: Buffer.alloc(32, 1).toString('hex'),
        }) as never,
      ),
    ).rejects.toSatisfy((e: unknown) => isCcaError(e, 'CCA_INVALID_OPERATION_INPUT'));
  });

  it('rejects an untrusted participant context', async () => {
    await expect(
      recordAuthorizedOutcomeAssertion.execute(
        { participantId: CTX.participants.A.participantId } as never,
        original(CTX.participants.A.intentIds[0]!) as never,
      ),
    ).rejects.toSatisfy((e: unknown) => isCcaError(e, 'CCA_UNTRUSTED_PARTICIPANT_CONTEXT'));
  });
});

describe('§9.2 / §9.4 — SO-1 happy paths', () => {
  const state: { assertionId?: string; outcomeId?: string; correctionId?: string } = {};
  let intent: string;

  beforeAll(() => {
    intent = CTX.participants.A.intentIds[0]!;
  });

  it('ORIGINAL is recorded, bound to the derived assignment and the active installation', async () => {
    const before = await countAssertions();
    const result = await recordAuthorizedOutcomeAssertion.execute(
      contextA,
      original(intent) as never,
    );
    expect(result).not.toBe(NOT_AUTHORIZED);
    assertRecorded(result);
    expect(result.resultKind).toBe('RECORDED');
    expect(result.replayed).toBe(false);
    state.assertionId = result.assertionId;
    state.outcomeId = result.outcomeId;
    expect(await countAssertions()).toBe(before + 1);

    const { rows } = await admin.query<{
      kind: string;
      label: string;
      asg: string;
      vocab: string | null;
      inst: string;
    }>(
      `SELECT a."assertionKind"::text AS kind, a."statusLabel"::text AS label,
              o."assignmentId"::text AS asg, a."merchantVocabularyVersion" AS vocab,
              r."resolvedInstallationId"::text AS inst
         FROM m7.m7_outcome_assertion a
         JOIN m7.m7_outcome o ON o."id" = a."outcomeId"
         JOIN m7.m7_outcome_command_receipt r ON r."assertionId" = a."id"
        WHERE a."id" = $1::uuid`,
      [result.assertionId],
    );
    const row = rows[0]!;
    expect(row.kind).toBe('ORIGINAL');
    expect(row.label).toBe('SELF_REPORTED');
    // §9.4 F–H: the assignment is DERIVED from the A2 chain, never supplied by the caller.
    expect(row.asg).toBe(CTX.participants.A.assignmentId);
    // §9.5.1 CP: the vocabulary is resolved from the ACTIVE manifest and stored, never hashed.
    expect(row.vocab).not.toBeNull();
    expect(row.inst).not.toBeNull();
  });

  it('CORRECTION supersedes the ORIGINAL', async () => {
    const result = await recordAuthorizedOutcomeAssertion.execute(
      contextA,
      original(intent, {
        assertionKind: 'CORRECTION',
        supersedesAssertionId: state.assertionId,
        statusLabel: 'ATTEMPTED',
      }) as never,
    );
    assertRecorded(result);
    expect(result.resultKind).toBe('RECORDED');
    expect(result.outcomeId).toBe(state.outcomeId);
    state.correctionId = result.assertionId;
    const { rows } = await admin.query<{ sup: string }>(
      `SELECT "supersedesAssertionId"::text AS sup FROM m7.m7_outcome_assertion WHERE "id" = $1::uuid`,
      [result.assertionId],
    );
    expect(rows[0]!.sup).toBe(state.assertionId);
  });

  it('RETRACTION supersedes the CORRECTION and carries NO participant payload', async () => {
    const result = await recordAuthorizedOutcomeAssertion.execute(contextA, {
      purchaseIntentId: intent,
      clientCaptureKey: key('cap'),
      idempotencyKey: key('idem'),
      assertionKind: 'RETRACTION',
      supersedesAssertionId: state.correctionId,
    } as never);
    assertRecorded(result);
    expect(result.resultKind).toBe('RECORDED');
    const { rows } = await admin.query<{ label: string | null; merchant: string | null }>(
      `SELECT "statusLabel"::text AS label, "merchantAssertionKind"::text AS merchant
         FROM m7.m7_outcome_assertion WHERE "id" = $1::uuid`,
      [result.assertionId],
    );
    expect(rows[0]!.label).toBeNull();
    expect(rows[0]!.merchant).toBeNull();
  });

  it('re-superseding an already superseded target raises M7003, and writes nothing', async () => {
    const before = await countAssertions();
    await expect(
      recordAuthorizedOutcomeAssertion.execute(
        contextA,
        original(intent, {
          assertionKind: 'CORRECTION',
          supersedesAssertionId: state.assertionId,
          statusLabel: 'FAILED',
        }) as never,
      ),
    ).rejects.toMatchObject({ token: 'M7_CORRECTION_TARGET_ALREADY_SUPERSEDED' });
    expect(await countAssertions()).toBe(before);
  });
});

describe('§9.5.2 — replay mechanics', () => {
  let intent: string;
  let first: { outcomeId: string; assertionId: string };
  let material: Record<string, unknown>;

  beforeAll(async () => {
    intent = CTX.participants.A.intentIds[1]!;
    material = original(intent);
    const r = await recordAuthorizedOutcomeAssertion.execute(contextA, material as never);
    assertRecorded(r);
    first = { outcomeId: r.outcomeId, assertionId: r.assertionId };
  }, 60_000);

  it('NONE entered CCA and created exactly one assertion', async () => {
    const { rows } = await admin.query<{ n: string }>(
      `SELECT pg_catalog.count(*)::text AS n FROM m7.m7_outcome_assertion WHERE "id" = $1::uuid`,
      [first.assertionId],
    );
    expect(rows[0]!.n).toBe('1');
  });

  it('MATCH returns the SAME historical ids and creates no row', async () => {
    const beforeA = await countAssertions();
    const beforeR = await countReceipts();
    const replay = await recordAuthorizedOutcomeAssertion.execute(contextA, material as never);
    assertRecorded(replay);
    expect(replay.outcomeId).toBe(first.outcomeId);
    expect(replay.assertionId).toBe(first.assertionId);
    expect(replay.replayed).toBe(true);
    // No assertion AND no receipt: the pre-CCA lookup answered without entering CCA at all.
    expect(await countAssertions()).toBe(beforeA);
    expect(await countReceipts()).toBe(beforeR);
  });

  it('CONFLICT — same transport key, different RQ — is M7_IDEMPOTENCY_CONFLICT and writes nothing', async () => {
    const beforeA = await countAssertions();
    const beforeR = await countReceipts();
    await expect(
      recordAuthorizedOutcomeAssertion.execute(contextA, {
        ...material,
        clientCaptureKey: key('cap'),
        statusLabel: 'ABANDONED',
      } as never),
    ).rejects.toBeInstanceOf(M7IdempotencyConflictError);
    expect(await countAssertions()).toBe(beforeA);
    expect(await countReceipts()).toBe(beforeR);
  });

  it('a DIFFERENT transport key with identical caller material yields CAPTURE_ALIAS', async () => {
    const beforeA = await countAssertions();
    const beforeR = await countReceipts();
    const alias = await recordAuthorizedOutcomeAssertion.execute(contextA, {
      ...material,
      idempotencyKey: key('idem'),
    } as never);
    assertRecorded(alias);
    expect(alias.resultKind).toBe('CAPTURE_ALIAS');
    expect(alias.assertionId).toBe(first.assertionId);
    expect(alias.replayed).toBe(false);
    // An alias records a RECEIPT for the new transport key but creates NO new assertion.
    expect(await countAssertions()).toBe(beforeA);
    expect(await countReceipts()).toBe(beforeR + 1);
  });

  it('an in-transaction race on the same transport key leaves exactly ONE durable result', async () => {
    const raceIntent = CTX.participants.A.intentIds[2]!;
    const raceMaterial = original(raceIntent);
    const beforeA = await countAssertions();
    const [x, y] = await Promise.all([
      recordAuthorizedOutcomeAssertion.execute(contextA, raceMaterial as never),
      recordAuthorizedOutcomeAssertion.execute(contextA, raceMaterial as never),
    ]);
    assertRecorded(x);
    assertRecorded(y);
    // Both callers get the same durable identity; exactly one assertion row was created.
    expect(x.assertionId).toBe(y.assertionId);
    expect(x.outcomeId).toBe(y.outcomeId);
    expect(await countAssertions()).toBe(beforeA + 1);
  }, 60_000);
});

describe('§9.6 / §19.11.0 — authorization answers are indistinguishable', () => {
  it('another participant’s purchase intent is refused generically, and writes nothing', async () => {
    const beforeA = await countAssertions();
    const beforeR = await countReceipts();
    const result = await recordAuthorizedOutcomeAssertion.execute(
      contextA,
      original(CTX.participants.B.intentIds[0]!) as never,
    );
    expect(result).toBe(NOT_AUTHORIZED);
    expect(await countAssertions()).toBe(beforeA);
    expect(await countReceipts()).toBe(beforeR);
  });

  it('an unknown purchase intent is refused with the SAME generic answer', async () => {
    const result = await recordAuthorizedOutcomeAssertion.execute(
      contextA,
      original('00000000-0000-4000-8000-000000000000') as never,
    );
    expect(result).toBe(NOT_AUTHORIZED);
  });
});

describe('§23.6 — a drifted control plane refuses, and is not an authorization answer', () => {
  it('raises 55000 M7_CONTROL_PLANE_MISMATCH and writes nothing', async () => {
    const beforeA = await countAssertions();
    const beforeR = await countReceipts();
    const good = process.env.M7_CONTROL_PLANE_MANIFEST_SHA256;
    process.env.M7_CONTROL_PLANE_MANIFEST_SHA256 = CTX.driftedManifestSha256;
    try {
      await expect(
        recordAuthorizedOutcomeAssertion.execute(
          contextA,
          original(CTX.participants.A.intentIds[3]!) as never,
        ),
      ).rejects.toBeInstanceOf(M7ControlPlaneMismatchError);
    } finally {
      process.env.M7_CONTROL_PLANE_MANIFEST_SHA256 = good;
    }
    expect(await countAssertions()).toBe(beforeA);
    expect(await countReceipts()).toBe(beforeR);
  });

  it('an absent digest refuses before any database access', async () => {
    const good = process.env.M7_CONTROL_PLANE_MANIFEST_SHA256;
    delete process.env.M7_CONTROL_PLANE_MANIFEST_SHA256;
    try {
      await expect(
        recordAuthorizedOutcomeAssertion.execute(
          contextA,
          original(CTX.participants.A.intentIds[3]!) as never,
        ),
      ).rejects.toThrowError(/M7_CONTROL_PLANE_UNAVAILABLE/);
    } finally {
      process.env.M7_CONTROL_PLANE_MANIFEST_SHA256 = good;
    }
  });
});

describe('CCA §29 / §29.1 — transaction topology is enforced against real PostgreSQL', () => {
  it('refuses to run inside an application transaction, before any database access', async () => {
    await expect(
      prisma.$transaction(async () =>
        recordAuthorizedOutcomeAssertion.execute(
          contextA,
          original(CTX.participants.A.intentIds[3]!) as never,
        ),
      ),
    ).rejects.toSatisfy((e: unknown) => isCcaError(e, 'CCA_TOP_LEVEL_TRANSACTION_REQUIRED'));
  });

  it('refuses CCA re-entry on the real hidden participant connection', async () => {
    // The re-entry guard is the accepted `runCcaTransaction` primitive that the SO-1 engine uses
    // (proved statically by the capability census). Exercising it here on a governed client built
    // from the SAME participant credential proves the guard holds against real PostgreSQL. It does
    // NOT claim to have re-entered the engine itself, which is structurally impossible.
    const client = installTransactionGovernance(
      new PrismaClient({ datasourceUrl: CTX.urls.participant }),
    );
    try {
      await expect(
        runCcaTransaction(client, {}, async () =>
          runCcaTransaction(client, {}, async () => 'inner'),
        ),
      ).rejects.toSatisfy((e: unknown) => isCcaError(e, 'CCA_REENTRY_FORBIDDEN'));
    } finally {
      await client.$disconnect();
    }
  }, 60_000);

  it('an application transaction opened while CCA is active is refused', async () => {
    const client = installTransactionGovernance(
      new PrismaClient({ datasourceUrl: CTX.urls.participant }),
    );
    try {
      await expect(
        runCcaTransaction(client, {}, async () => prisma.$transaction(async () => 1)),
      ).rejects.toSatisfy((e: unknown) => isCcaError(e, 'CCA_NESTED_TRANSACTION_FORBIDDEN'));
    } finally {
      await client.$disconnect();
    }
  }, 60_000);
});

describe('§9.5.2 / A1 §8.10 — withdrawal serialization and the replay boundary', () => {
  it('a MATCH is returned WITHOUT evaluating consent, and a new collection is then refused', async () => {
    const C = CTX.participants.C;
    const handle = await issueM7ParticipantSession({
      authenticatedParticipantId: C.participantId,
    });
    const contextC = handle.trustedParticipantContext;
    const intent = C.intentIds[0]!;
    const material = original(intent);

    // 1. A collection while consent is GRANTED.
    const recorded = await recordAuthorizedOutcomeAssertion.execute(contextC, material as never);
    assertRecorded(recorded);
    expect(recorded.resultKind).toBe('RECORDED');

    // 2. Withdraw consent through the ACCEPTED A1 service (which locks the assignment row).
    await recordConsentWithdrawal({
      trustedParticipantContext: contextC,
      assignmentId: C.assignmentId,
      withdrawPayload: {},
      idempotencyKey: key('wd'),
    });

    // 3. An EXACT replay still returns the historical result: the pre-CCA lookup answers from the
    //    receipt without evaluating current consent and without entering the write transaction.
    const beforeA = await countAssertions();
    const replay = await recordAuthorizedOutcomeAssertion.execute(contextC, material as never);
    assertRecorded(replay);
    expect(replay.assertionId).toBe(recorded.assertionId);
    expect(replay.replayed).toBe(true);
    expect(await countAssertions()).toBe(beforeA);

    // 4. A NEW collection after the withdrawal is refused, and commits nothing.
    const beforeR = await countReceipts();
    const after = await recordAuthorizedOutcomeAssertion.execute(
      contextC,
      original(intent) as never,
    );
    expect(after).toBe(NOT_AUTHORIZED);
    expect(await countAssertions()).toBe(beforeA);
    expect(await countReceipts()).toBe(beforeR);
  }, 120_000);
});

describe('CCA §22 — the zero-in-flight commit gate stays green', () => {
  it('every committed SO-1 execution left no adapter operation in flight', async () => {
    // A successful commit is itself the gate's evidence: `executeUnderZeroInFlightGate` throws
    // CCA_IN_FLIGHT_AT_SETTLEMENT (rolling the transaction back) if anything is still running, so a
    // durable assertion row proves the gate was satisfied on that path.
    const result = await recordAuthorizedOutcomeAssertion.execute(
      contextA,
      original(CTX.participants.A.intentIds[3]!) as never,
    );
    assertRecorded(result);
    const { rows } = await admin.query<{ n: string }>(
      `SELECT pg_catalog.count(*)::text AS n FROM m7.m7_outcome_assertion WHERE "id" = $1::uuid`,
      [result.assertionId],
    );
    expect(rows[0]!.n).toBe('1');
  });
});

// ===================================================================================================
// AUD-M7-SO1-01 — CCA ENTRY GUARD ORDER, against REAL PostgreSQL
//
// The rejected candidate 8dcf0a81 resolved the assignment and ran the pre-CCA replay BEFORE its only
// B/C check, so an exact-replay MATCH issued inside an outer application transaction returned the
// historical result instead of CCA_TOP_LEVEL_TRANSACTION_REQUIRED. Every case below FAILS on that
// ordering and passes only when the entry preflight runs before any database-reaching SO-1 work.
//
// ORDERING PROOF BY MASKING. In the productive engine the preflight is followed, in order, by the
// control-plane digest read, the session-capability read, and only then the first database call.
// So each case is also run with the digest REMOVED from the environment and with a genuine trusted
// context that has NO M7 session: if anything after the preflight ran first, the answer would be
// M7_CONTROL_PLANE_UNAVAILABLE or M7_SESSION — the answer is still the topology error. Rule M13
// proves statically that no database-reaching call precedes the digest read's predecessor, the
// preflight; together they show the preflight ran before the first SO-1 database operation.
// ===================================================================================================
describe('AUD-M7-SO1-01 — the CCA entry guard precedes every database-reaching SO-1 step', () => {
  let matchMaterial: Record<string, unknown>;
  let historical: M7OutcomeAssertionResult;
  let bare: TrustedParticipantContext;

  beforeAll(async () => {
    // 1. A successful SO-1 assertion OUTSIDE any outer transaction.
    matchMaterial = original(CTX.participants.A.intentIds[4]!);
    const r = await recordAuthorizedOutcomeAssertion.execute(contextA, matchMaterial as never);
    assertRecorded(r);
    historical = r;
    // 2. Sanity: the SAME material, outside any transaction, is an exact pre-CCA MATCH.
    const replay = await recordAuthorizedOutcomeAssertion.execute(contextA, matchMaterial as never);
    assertRecorded(replay);
    expect(replay.replayed).toBe(true);
    expect(replay.assertionId).toBe(historical.assertionId);
    // A GENUINE trusted context with NO registered M7 session capability.
    bare = resolveTrustedParticipantContext({
      authenticatedParticipantId: CTX.participants.A.participantId,
    });
    expect(hasM7ParticipantSession(bare)).toBe(false);
  }, 120_000);

  /** Runs `fn` with the control-plane digest removed from the environment. */
  async function withoutDigest<T>(fn: () => Promise<T>): Promise<T> {
    const good = process.env.M7_CONTROL_PLANE_MANIFEST_SHA256;
    delete process.env.M7_CONTROL_PLANE_MANIFEST_SHA256;
    try {
      return await fn();
    } finally {
      process.env.M7_CONTROL_PLANE_MANIFEST_SHA256 = good;
    }
  }

  /** Runs one SO-1 call inside an ACCEPTED application transaction; returns what it threw. */
  async function insideOuterTransaction(
    ctx: TrustedParticipantContext,
    material: Record<string, unknown>,
  ): Promise<unknown> {
    let caught: unknown = 'NO ERROR — the call returned';
    await prisma.$transaction(async () => {
      try {
        const answer = await recordAuthorizedOutcomeAssertion.execute(ctx, material as never);
        caught = { returned: answer };
      } catch (e) {
        caught = e;
      }
    });
    return caught;
  }

  /** Runs one SO-1 call inside an ACTIVE CCA frame established by the accepted primitive. */
  async function insideActiveCca(
    ctx: TrustedParticipantContext,
    material: Record<string, unknown>,
  ): Promise<unknown> {
    // Test-only use of the accepted runCcaTransaction primitive to establish a genuine CCA frame
    // on a governed client built from the participant credential. No production re-entry API.
    const client = installTransactionGovernance(
      new PrismaClient({ datasourceUrl: CTX.urls.participant }),
    );
    let caught: unknown = 'NO ERROR — the call returned';
    try {
      await runCcaTransaction(client, {}, async () => {
        try {
          const answer = await recordAuthorizedOutcomeAssertion.execute(ctx, material as never);
          caught = { returned: answer };
        } catch (e) {
          caught = e;
        }
      });
    } finally {
      await client.$disconnect();
    }
    return caught;
  }

  it('outer transaction + replay NONE → immediate CCA_TOP_LEVEL_TRANSACTION_REQUIRED, no row', async () => {
    const beforeA = await countAssertions();
    const beforeR = await countReceipts();
    const none = original(CTX.participants.A.intentIds[4]!);
    const e = await insideOuterTransaction(contextA, none);
    expect(isCcaError(e, 'CCA_TOP_LEVEL_TRANSACTION_REQUIRED')).toBe(true);
    expect(await countAssertions()).toBe(beforeA);
    expect(await countReceipts()).toBe(beforeR);
  });

  it('outer transaction + EXACT replay MATCH material → TOP_LEVEL rejection, NOT the historical result', async () => {
    const beforeA = await countAssertions();
    const beforeR = await countReceipts();
    const e = await insideOuterTransaction(contextA, matchMaterial);
    // The rejected candidate returned { returned: <historical result> } here.
    expect(e).not.toHaveProperty('returned');
    expect(isCcaError(e, 'CCA_TOP_LEVEL_TRANSACTION_REQUIRED')).toBe(true);
    expect(await countAssertions()).toBe(beforeA);
    expect(await countReceipts()).toBe(beforeR);
  });

  it('outer transaction: the guard fires BEFORE the digest read and BEFORE the session read', async () => {
    for (const material of [matchMaterial, original(CTX.participants.A.intentIds[4]!)]) {
      const noDigest = await withoutDigest(() => insideOuterTransaction(contextA, material));
      expect(isCcaError(noDigest, 'CCA_TOP_LEVEL_TRANSACTION_REQUIRED')).toBe(true);
      const noSession = await insideOuterTransaction(bare, material);
      expect(isCcaError(noSession, 'CCA_TOP_LEVEL_TRANSACTION_REQUIRED')).toBe(true);
      expect(noSession).not.toBeInstanceOf(M7SessionError);
    }
  });

  it('active CCA context + replay NONE → immediate CCA_REENTRY_FORBIDDEN on the REAL sealed operation', async () => {
    const beforeA = await countAssertions();
    const beforeR = await countReceipts();
    const e = await insideActiveCca(contextA, original(CTX.participants.A.intentIds[4]!));
    expect(isCcaError(e, 'CCA_REENTRY_FORBIDDEN')).toBe(true);
    expect(await countAssertions()).toBe(beforeA);
    expect(await countReceipts()).toBe(beforeR);
  }, 60_000);

  it('active CCA context + EXACT replay MATCH material → REENTRY rejection, NOT the historical result', async () => {
    const beforeA = await countAssertions();
    const beforeR = await countReceipts();
    const e = await insideActiveCca(contextA, matchMaterial);
    expect(e).not.toHaveProperty('returned');
    expect(isCcaError(e, 'CCA_REENTRY_FORBIDDEN')).toBe(true);
    expect(await countAssertions()).toBe(beforeA);
    expect(await countReceipts()).toBe(beforeR);
  }, 60_000);

  it('active CCA context: the guard fires BEFORE the digest read and BEFORE the session read', async () => {
    const noDigest = await withoutDigest(() => insideActiveCca(contextA, matchMaterial));
    expect(isCcaError(noDigest, 'CCA_REENTRY_FORBIDDEN')).toBe(true);
    const noSession = await insideActiveCca(bare, matchMaterial);
    expect(isCcaError(noSession, 'CCA_REENTRY_FORBIDDEN')).toBe(true);
  }, 60_000);

  it('outside any transaction the same MATCH material still replays (the guard does not over-refuse)', async () => {
    const r = await recordAuthorizedOutcomeAssertion.execute(contextA, matchMaterial as never);
    assertRecorded(r);
    expect(r.assertionId).toBe(historical.assertionId);
    expect(r.replayed).toBe(true);
  });
});

// ===================================================================================================
// §8.2 — EXPIRED session (executed with a REAL wait; no faked time, no normative change)
//
// The fixture's sessionTtl is the accepted CHECK minimum, 5 minutes. This case issues a fresh
// session, waits past its expiry in real time, and proves the database refuses it with the same
// indistinguishable 28000 and that SO-1 answers the generic refusal. It runs LAST.
// ===================================================================================================
describe('§8.2 — an EXPIRED session is rejected (real 5-minute TTL)', () => {
  it('rejects an expired session with 28000 and SO-1 answers the generic refusal', async () => {
    const handle = await issueM7ParticipantSession({
      authenticatedParticipantId: CTX.participants.B.participantId,
    });
    const secret = readM7ParticipantSessionSecret(handle.trustedParticipantContext);
    const { rows } = await admin.query<{ ttl: string; wait_ms: string }>(
      `SELECT ("expiresAt" - "issuedAt")::text AS ttl,
                GREATEST(0, EXTRACT(EPOCH FROM ("expiresAt" - pg_catalog.clock_timestamp())) * 1000)::bigint::text AS wait_ms
           FROM m7.m7_participant_session WHERE "id" = $1::uuid`,
      [handle.sessionId],
    );
    expect(rows[0]!.ttl).toBe('00:05:00');

    // Before expiry the capability is valid.
    const c = await participantClient();
    try {
      await c.query(
        `SELECT m7.p_lock_and_prove_assignment_v1($1::text, $2::bytea, $3::uuid, $4::uuid)`,
        [
          CTX.manifestSha256,
          secret,
          CTX.participants.B.participantId,
          CTX.participants.B.assignmentId,
        ],
      );
      // Wait out the REAL TTL, measured against the database clock, plus a margin.
      await new Promise((resolve) => setTimeout(resolve, Number(rows[0]!.wait_ms) + 5_000));
      await expect(
        c.query(
          `SELECT m7.p_lock_and_prove_assignment_v1($1::text, $2::bytea, $3::uuid, $4::uuid)`,
          [
            CTX.manifestSha256,
            secret,
            CTX.participants.B.participantId,
            CTX.participants.B.assignmentId,
          ],
        ),
      ).rejects.toMatchObject({ code: '28000' });
    } finally {
      await c.end();
    }
    const beforeA = await countAssertions();
    const answer = await recordAuthorizedOutcomeAssertion.execute(
      handle.trustedParticipantContext,
      original(CTX.participants.B.intentIds[0]!) as never,
    );
    expect(answer).toBe(NOT_AUTHORIZED);
    expect(await countAssertions()).toBe(beforeA);
  }, 420_000);
});

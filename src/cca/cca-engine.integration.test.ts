// PagaMenos · CCA runtime foundation — REAL-PostgreSQL adversarial suite (Amendment 01 §13, §22–§30, §33–§40, §48).
//
// Runs ONLY under `scripts/pg-integration.ts` (ephemeral cluster + `prisma migrate deploy`). The
// accepted A1/A2 services are driven through the GOVERNED shared client, so accepted-owner
// preservation and outer-transaction detection are proven against the real accepted owners rather
// than a mock. The sealed operations here are FIXTURE operations over TEST-ONLY tables created by
// this file; they carry no M7 domain semantics (no Outcome/SavingEvidence/idempotency meaning).
import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '@/db/client';
import { defineSealedOperation } from '@/db/cca-engine';
import { StudyConsentRepository, studyConsentRepository } from '@/db/study-consent-repository';
import {
  assignParticipant,
  createExperiment,
  freezeAnalysisProtocol,
  registerAnalysisProtocolDraft,
  registerStudyParticipant,
  resolveTrustedEntrySource,
  resolveTrustedParticipantContext,
} from '@/services/study-admin';
import { recordConsentGrant, recordConsentWithdrawal } from '@/services/study-consent';
import { captureIntentToken, createPurchaseIntent } from '@/services/study-purchase-intent';
import {
  CONSENT_GRANT_OPERATION_SCOPE,
  consentGrantRequestHash,
  evaluateGrant,
  RECRUITMENT_KEY_VERSION_V1,
  type ResolvedEntrySource,
  type TrustedParticipantContext,
} from '@/study';

import { isCcaError } from './errors';
import { readDatabaseExecutionState } from './execution-context';
import { NOT_AUTHORIZED } from './sealed-operation';
import { REPLAY_MISS } from './replay';
import {
  foundationFixtureAdapter,
  foundationFixtureLockOrder,
} from './__fixtures__/foundation.cca-adapter';
import type {
  FixtureCollectionResult,
  FoundationFixtureAdapter,
} from './__fixtures__/foundation.cca-adapter-interface';
import { recordFoundationFixture } from './__fixtures__/foundation.cca-leaf';

const uid = () => randomUUID().slice(0, 8);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const DEF = {
  observationWindowWeeks: 6,
  contaminationWindowHours: 48,
  minimumVerifiedLevel: 'CORROBORATED',
  minimumIndependentOccasions: 2,
};
const DIRECT: ResolvedEntrySource = resolveTrustedEntrySource([{ kind: 'DIRECT' }]);

interface Fixture {
  assignmentId: string;
  participantId: string;
  context: TrustedParticipantContext;
}

async function assignment(): Promise<Fixture> {
  const draft = await registerAnalysisProtocolDraft({
    input: { protocolVersion: `P-${uid()}`, definition: DEF },
    idempotencyKey: `reg-${uid()}`,
  });
  const frozen = await freezeAnalysisProtocol({
    input: { protocolId: draft.protocol.id },
    idempotencyKey: `frz-${uid()}`,
  });
  const experiment = await createExperiment({
    input: { experimentCode: `E-${uid()}`, frozenProtocolId: frozen.protocol.id },
    idempotencyKey: `exp-${uid()}`,
  });
  const participant = await registerStudyParticipant({
    input: {
      recruitmentSubjectKey: `sk-${uid()}`,
      recruitmentKeyVersion: RECRUITMENT_KEY_VERSION_V1,
    },
    idempotencyKey: `par-${uid()}`,
  });
  const assigned = await assignParticipant({
    input: { experimentId: experiment.experiment.id, participantId: participant.participant.id },
    idempotencyKey: `asg-${uid()}`,
  });
  return {
    assignmentId: assigned.assignment.id,
    participantId: participant.participant.id,
    context: resolveTrustedParticipantContext({
      authenticatedParticipantId: participant.participant.id,
    }),
  };
}

async function granted(optionalEvidenceConsent = true): Promise<Fixture> {
  const fx = await assignment();
  await recordConsentGrant({
    trustedParticipantContext: fx.context,
    assignmentId: fx.assignmentId,
    consentPayload: { consentVersion: 'cv1', privacyNoticeVersion: 'pv1', optionalEvidenceConsent },
    idempotencyKey: `cg-${uid()}`,
  });
  return fx;
}

async function rootRows(assignmentId: string) {
  return prisma.$queryRawUnsafe<Array<{ id: string; root_key: string }>>(
    `SELECT "id"::text AS id, "root_key" FROM "cca_fixture_root" WHERE "assignment_id" = '${assignmentId}'::uuid ORDER BY "root_key"`,
  );
}
async function childRows(assignmentId: string) {
  return prisma.$queryRawUnsafe<Array<{ child_key: string }>>(
    `SELECT "child_key" FROM "cca_fixture_child" WHERE "assignment_id" = '${assignmentId}'::uuid ORDER BY "child_key"`,
  );
}
async function markerRows(assignmentId: string) {
  return prisma.$queryRawUnsafe<Array<{ label: string }>>(
    `SELECT "label" FROM "cca_fixture_marker" WHERE "assignment_id" = '${assignmentId}'::uuid ORDER BY "label"`,
  );
}

// ── fixture sealed operations (test composition, §19) ────────────────────────────────────────────
interface ScenarioInput {
  readonly assignmentId: string;
  readonly rootKey: string;
  readonly childKeys: readonly string[];
  readonly scenario: string;
  readonly upstreamRootId?: string;
  readonly policyHint?: string;
}

const parseScenario = (raw: unknown): ScenarioInput => {
  const o = raw as ScenarioInput;
  if (typeof o.assignmentId !== 'string' || typeof o.rootKey !== 'string') {
    throw new Error('scenario input');
  }
  return o;
};

let leakedAdapter: FoundationFixtureAdapter | null = null;
let nested: { execute: (c: unknown, i: unknown) => Promise<unknown> } | null = null;
/** Test composition only: an executor has no trusted context of its own (§11, §12). */
let nestedContext: TrustedParticipantContext | null = null;

function scenarioOperation(
  policy: 'GENERAL_COLLECTION' | 'OPTIONAL_EVIDENCE',
  lookup?: () => Promise<unknown>,
) {
  return defineSealedOperation<
    ScenarioInput,
    FixtureCollectionResult | string,
    FoundationFixtureAdapter
  >({
    operationId: `cca.fixture.scenario.${policy}`,
    policy,
    parseInput: parseScenario,
    assignmentRef: (input) => input.assignmentId,
    lockOrder: foundationFixtureLockOrder,
    adapter: foundationFixtureAdapter,
    ...(lookup === undefined ? {} : { preCcaReplayLookup: lookup as never }),
    executor: async (input, _scope, adapter) => {
      const args = { rootKey: input.rootKey, childKeys: input.childKeys };
      switch (input.scenario) {
        case 'record':
          return adapter.recordFixtureCollection(args);
        case 'slow-peers':
          return adapter.recordFixtureCollection({ ...args, pauseMs: 250 });
        case 'void-escape':
          void adapter.slowMarker('void-escape', 0.4);
          return 'returned-early';
        case 'microtask-escape':
          queueMicrotask(() => void adapter.slowMarker('microtask-escape', 0.4));
          return 'returned-early';
        case 'timer-escape':
          setTimeout(() => void adapter.slowMarker('timer-escape', 0).catch(() => undefined), 5);
          return adapter.recordFixtureCollection(args);
        case 'leak-adapter':
          leakedAdapter = adapter;
          return adapter.recordFixtureCollection(args);
        case 'mismatch':
          await adapter.recordFixtureCollection(args);
          await adapter.proveUpstreamOwnership(input.upstreamRootId!);
          return 'unreachable';
        case 'invert':
          await adapter.attemptLockInversion(input.rootKey, 'child-x');
          return 'unreachable';
        case 'reentry':
          await adapter.recordFixtureCollection(args);
          return (await nested!.execute(nestedContext, {
            assignmentId: input.assignmentId,
            rootKey: `${input.rootKey}-nested`,
            childKeys: [],
          })) as string;
        default:
          throw new Error(`unknown scenario ${input.scenario}`);
      }
    },
  });
}

const generalOp = scenarioOperation('GENERAL_COLLECTION');
const optionalOp = scenarioOperation('OPTIONAL_EVIDENCE');

beforeAll(async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "cca_fixture_root" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "assignment_id" uuid NOT NULL,
      "root_key" text NOT NULL,
      UNIQUE ("assignment_id", "root_key"))`);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "cca_fixture_child" (
      "root_id" uuid NOT NULL,
      "child_key" text NOT NULL,
      "assignment_id" uuid NOT NULL)`);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "cca_fixture_marker" (
      "assignment_id" uuid NOT NULL,
      "label" text NOT NULL,
      "at" timestamptz NOT NULL DEFAULT clock_timestamp())`);
});

afterAll(async () => {
  await prisma.$disconnect();
});

// ===================================================================================================
describe('§30 authorized path — commit, and the generic refusal (§9.2, §49)', () => {
  it('commits an authorized collection through the sealed leaf', async () => {
    const fx = await granted();
    const result = await recordFoundationFixture.execute(fx.context, {
      assignmentId: fx.assignmentId,
      rootKey: 'root-1',
      childKeys: ['b', 'a'],
    });
    expect(result).toEqual({ kind: 'CREATED', rootId: expect.any(String) });
    expect((await rootRows(fx.assignmentId)).map((r) => r.root_key)).toEqual(['root-1']);
    expect((await childRows(fx.assignmentId)).map((c) => c.child_key)).toEqual(['a', 'b']);
  });

  it('refuses with the generic NOT_AUTHORIZED and writes nothing when consent was never granted', async () => {
    const fx = await assignment();
    const result = await recordFoundationFixture.execute(fx.context, {
      assignmentId: fx.assignmentId,
      rootKey: 'root-x',
      childKeys: ['a'],
    });
    expect(result).toBe(NOT_AUTHORIZED);
    expect(await rootRows(fx.assignmentId)).toEqual([]);
  });

  it('refuses after withdrawal (accepted A1 predicate, evaluated under the lock)', async () => {
    const fx = await granted();
    await recordConsentWithdrawal({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      idempotencyKey: `cw-${uid()}`,
    });
    const result = await recordFoundationFixture.execute(fx.context, {
      assignmentId: fx.assignmentId,
      rootKey: 'root-w',
      childKeys: [],
    });
    expect(result).toBe(NOT_AUTHORIZED);
    expect(await rootRows(fx.assignmentId)).toEqual([]);
  });
});

describe('§7 policy is fixed by construction — AGR / RT-17 (§8.3)', () => {
  it('OPTIONAL_EVIDENCE refuses a grant whose optionalEvidenceConsent is false, GENERAL commits', async () => {
    const fx = await granted(false);
    const optional = await optionalOp.execute(fx.context, {
      assignmentId: fx.assignmentId,
      rootKey: 'opt-1',
      childKeys: [],
      scenario: 'record',
    });
    expect(optional).toBe(NOT_AUTHORIZED);
    expect(await rootRows(fx.assignmentId)).toEqual([]);
    const general = await generalOp.execute(fx.context, {
      assignmentId: fx.assignmentId,
      rootKey: 'gen-1',
      childKeys: [],
      scenario: 'record',
    });
    expect(general).toMatchObject({ kind: 'CREATED' });
  });

  it('OPTIONAL_EVIDENCE commits when the containing grant carries optionalEvidenceConsent', async () => {
    const fx = await granted(true);
    const optional = await optionalOp.execute(fx.context, {
      assignmentId: fx.assignmentId,
      rootKey: 'opt-2',
      childKeys: ['c'],
      scenario: 'record',
    });
    expect(optional).toMatchObject({ kind: 'CREATED' });
  });

  it('the caller cannot select the policy through the input', async () => {
    const fx = await granted(false);
    const forced = await optionalOp.execute(fx.context, {
      assignmentId: fx.assignmentId,
      rootKey: 'opt-3',
      childKeys: [],
      scenario: 'record',
      policyHint: 'GENERAL_COLLECTION',
    });
    expect(forced).toBe(NOT_AUTHORIZED);
    expect(await rootRows(fx.assignmentId)).toEqual([]);
  });

  it('the refusal is byte-identical across policies (no oracle, §9.2)', async () => {
    const a = await assignment();
    const general = await generalOp.execute(a.context, {
      assignmentId: a.assignmentId,
      rootKey: 'o1',
      childKeys: [],
      scenario: 'record',
    });
    const b = await granted(false);
    const optional = await optionalOp.execute(b.context, {
      assignmentId: b.assignmentId,
      rootKey: 'o2',
      childKeys: [],
      scenario: 'record',
    });
    expect(general).toBe(optional);
    expect(general).toBe(NOT_AUTHORIZED);
  });
});

describe('§13/§14 assignment binding and re-proof', () => {
  it('refuses another participant’s assignment and an unknown assignment identically', async () => {
    const mine = await granted();
    const theirs = await granted();
    const foreign = await recordFoundationFixture
      .execute(mine.context, { assignmentId: theirs.assignmentId, rootKey: 'r', childKeys: [] })
      .catch((e: unknown) => e);
    const unknown = await recordFoundationFixture
      .execute(mine.context, { assignmentId: randomUUID(), rootKey: 'r', childKeys: [] })
      .catch((e: unknown) => e);
    expect(isCcaError(foreign, 'CCA_ASSIGNMENT_OWNERSHIP')).toBe(true);
    expect(isCcaError(unknown, 'CCA_ASSIGNMENT_OWNERSHIP')).toBe(true);
    expect((foreign as Error).message).toBe((unknown as Error).message);
    expect(await rootRows(theirs.assignmentId)).toEqual([]);
  });

  it('§48.1 — material belonging to another assignment rolls the whole operation back', async () => {
    const other = await granted();
    const otherResult = (await recordFoundationFixture.execute(other.context, {
      assignmentId: other.assignmentId,
      rootKey: 'upstream',
      childKeys: [],
    })) as FixtureCollectionResult;
    const mine = await granted();
    const outcome = await generalOp
      .execute(mine.context, {
        assignmentId: mine.assignmentId,
        rootKey: 'mismatch-root',
        childKeys: ['z'],
        scenario: 'mismatch',
        upstreamRootId: otherResult.rootId,
      })
      .catch((e: unknown) => e);
    expect(
      isCcaError(outcome, 'CCA_ADAPTER_OPERATION_FAILED') ||
        isCcaError(outcome, 'CCA_ASSIGNMENT_SCOPE_MISMATCH'),
    ).toBe(true);
    // The row written earlier in the SAME operation is gone: the transaction rolled back.
    expect(await rootRows(mine.assignmentId)).toEqual([]);
    expect(await childRows(mine.assignmentId)).toEqual([]);
  });
});

describe('§29/§40 outer transaction and re-entry, against the REAL accepted owners', () => {
  it('an accepted A1 consent transaction is registered, and CCA is refused inside it', async () => {
    const fx = await granted();
    let observed: ReturnType<typeof readDatabaseExecutionState> | null = null;
    let attempt: Promise<unknown> | null = null;
    const payload = {
      consentVersion: 'cv2',
      privacyNoticeVersion: 'pv2',
      optionalEvidenceConsent: true,
    };
    const repository = new StudyConsentRepository();
    await repository
      .recordConsentCommand({
        operationScope: CONSENT_GRANT_OPERATION_SCOPE,
        assignmentId: fx.assignmentId,
        idempotencyKey: `inner-${uid()}`,
        requestHash: consentGrantRequestHash({
          assignmentId: fx.assignmentId,
          ...payload,
          context: { participantId: fx.participantId },
        }),
        grantProvenance: payload,
        evaluate: (events) => {
          // Runs INSIDE the accepted A1 transaction, under the assignment lock.
          observed = readDatabaseExecutionState();
          attempt = recordFoundationFixture
            .execute(fx.context, {
              assignmentId: fx.assignmentId,
              rootKey: 'inner',
              childKeys: [],
            })
            .catch((e: unknown) => e);
          return evaluateGrant(events, payload);
        },
      })
      .catch(() => undefined);
    expect(observed).toMatchObject({
      transactionActive: true,
      transactionAuthority: 'ACCEPTED_OWNER',
    });
    expect(isCcaError(await attempt!, 'CCA_TOP_LEVEL_TRANSACTION_REQUIRED')).toBe(true);
    expect(await rootRows(fx.assignmentId)).toEqual([]);
  });

  it('§48.1 — locking a row then calling the sealed operation is refused before CCA opens', async () => {
    const fx = await granted();
    await recordFoundationFixture.execute(fx.context, {
      assignmentId: fx.assignmentId,
      rootKey: 'locked-root',
      childKeys: [],
    });
    const outcome = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `SELECT "id" FROM "cca_fixture_root" WHERE "assignment_id" = '${fx.assignmentId}'::uuid FOR UPDATE`,
      );
      return recordFoundationFixture
        .execute(fx.context, { assignmentId: fx.assignmentId, rootKey: 'nested', childKeys: [] })
        .catch((e: unknown) => e);
    });
    expect(isCcaError(outcome, 'CCA_TOP_LEVEL_TRANSACTION_REQUIRED')).toBe(true);
    expect((await rootRows(fx.assignmentId)).map((r) => r.root_key)).toEqual(['locked-root']);
  });

  it('§48.1 — a sealed operation calling another sealed operation is refused and rolls back', async () => {
    const fx = await granted();
    nested = recordFoundationFixture as unknown as typeof nested;
    nestedContext = fx.context;
    const outcome = await generalOp
      .execute(fx.context, {
        assignmentId: fx.assignmentId,
        rootKey: 'reentry-root',
        childKeys: [],
        scenario: 'reentry',
      })
      .catch((e: unknown) => e);
    expect(isCcaError(outcome, 'CCA_REENTRY_FORBIDDEN')).toBe(true);
    expect(await rootRows(fx.assignmentId)).toEqual([]);
  });
});

describe('§22–§24 zero-in-flight gate against a real transaction', () => {
  it('§48.1 — void adapterMethod() leaves activeCount non-zero: nothing commits', async () => {
    const fx = await granted();
    const outcome = await generalOp
      .execute(fx.context, {
        assignmentId: fx.assignmentId,
        rootKey: 'void-root',
        childKeys: [],
        scenario: 'void-escape',
      })
      .catch((e: unknown) => e);
    expect(isCcaError(outcome, 'CCA_IN_FLIGHT_AT_SETTLEMENT')).toBe(true);
    await sleep(600);
    expect(await markerRows(fx.assignmentId)).toEqual([]);
  });

  it('§48.1 — a queueMicrotask escape cannot commit', async () => {
    const fx = await granted();
    const outcome = await generalOp
      .execute(fx.context, {
        assignmentId: fx.assignmentId,
        rootKey: 'micro-root',
        childKeys: [],
        scenario: 'microtask-escape',
      })
      .catch((e: unknown) => e);
    expect(isCcaError(outcome, 'CCA_IN_FLIGHT_AT_SETTLEMENT')).toBe(true);
    await sleep(600);
    expect(await markerRows(fx.assignmentId)).toEqual([]);
  });

  it('§48.1 — a setTimeout escape is rejected before database access; the authorized work commits', async () => {
    const fx = await granted();
    const result = await generalOp.execute(fx.context, {
      assignmentId: fx.assignmentId,
      rootKey: 'timer-root',
      childKeys: ['t'],
      scenario: 'timer-escape',
    });
    expect(result).toMatchObject({ kind: 'CREATED' });
    await sleep(200);
    expect(await markerRows(fx.assignmentId)).toEqual([]);
    expect((await rootRows(fx.assignmentId)).map((r) => r.root_key)).toEqual(['timer-root']);
  });

  it('an adapter that escapes to the caller is inert after the transaction closed', async () => {
    const fx = await granted();
    leakedAdapter = null;
    await generalOp.execute(fx.context, {
      assignmentId: fx.assignmentId,
      rootKey: 'leak-root',
      childKeys: [],
      scenario: 'leak-adapter',
    });
    expect(leakedAdapter).not.toBeNull();
    await expect(leakedAdapter!.slowMarker('after-commit', 0)).rejects.toSatisfy((e) =>
      isCcaError(e, 'CCA_ADAPTER_NOT_ACTIVE'),
    );
    expect(await markerRows(fx.assignmentId)).toEqual([]);
  });
});

describe('§26/§27 canonical lock order', () => {
  it('§48.1 — concurrent contenders acquire peers in canonical order without inversion', async () => {
    const a = await granted();
    const b = await granted();
    const [ra, rb] = await Promise.all([
      generalOp.execute(a.context, {
        assignmentId: a.assignmentId,
        rootKey: 'lo-a',
        childKeys: ['shared-2', 'shared-1'],
        scenario: 'slow-peers',
      }),
      generalOp.execute(b.context, {
        assignmentId: b.assignmentId,
        rootKey: 'lo-b',
        childKeys: ['shared-1', 'shared-2'],
        scenario: 'slow-peers',
      }),
    ]);
    expect(ra).toMatchObject({ kind: 'CREATED' });
    expect(rb).toMatchObject({ kind: 'CREATED' });
    expect((await childRows(a.assignmentId)).map((c) => c.child_key)).toEqual([
      'shared-1',
      'shared-2',
    ]);
  });

  it('an inversion attempt is refused and rolls the operation back', async () => {
    const fx = await granted();
    const outcome = await generalOp
      .execute(fx.context, {
        assignmentId: fx.assignmentId,
        rootKey: 'inv-root',
        childKeys: [],
        scenario: 'invert',
      })
      .catch((e: unknown) => e);
    expect(
      isCcaError(outcome, 'CCA_ADAPTER_OPERATION_FAILED') ||
        isCcaError(outcome, 'CCA_LOCK_ORDER_VIOLATION'),
    ).toBe(true);
    expect(await markerRows(fx.assignmentId)).toEqual([]);
  });
});

describe('§28 replay', () => {
  it('the in-CCA re-check returns the existing result and creates no duplicate', async () => {
    const fx = await granted();
    const first = await recordFoundationFixture.execute(fx.context, {
      assignmentId: fx.assignmentId,
      rootKey: 'replay-root',
      childKeys: ['c1'],
    });
    const second = await recordFoundationFixture.execute(fx.context, {
      assignmentId: fx.assignmentId,
      rootKey: 'replay-root',
      childKeys: ['c1'],
    });
    expect(first).toMatchObject({ kind: 'CREATED' });
    expect(second).toMatchObject({
      kind: 'EXISTING',
      rootId: (first as FixtureCollectionResult).rootId,
    });
    expect(await childRows(fx.assignmentId)).toHaveLength(1);
  });

  it('§48.1 replay race — T1 misses optimistically, T2 creates, T1 re-checks inside CCA', async () => {
    const fx = await granted();
    let released: (() => void) | null = null;
    const gate = new Promise<void>((resolve) => (released = resolve));
    const racing = scenarioOperation('GENERAL_COLLECTION', async () => {
      await gate; // T1's lock-free lookup missed; hold it until T2 committed
      return REPLAY_MISS;
    });
    const t1 = racing.execute(fx.context, {
      assignmentId: fx.assignmentId,
      rootKey: 'race-root',
      childKeys: ['r1'],
      scenario: 'record',
    });
    const t2 = await recordFoundationFixture.execute(fx.context, {
      assignmentId: fx.assignmentId,
      rootKey: 'race-root',
      childKeys: ['r1'],
    });
    released!();
    const t1Result = await t1;
    expect(t2).toMatchObject({ kind: 'CREATED' });
    expect(t1Result).toMatchObject({
      kind: 'EXISTING',
      rootId: (t2 as FixtureCollectionResult).rootId,
    });
    expect(await childRows(fx.assignmentId)).toHaveLength(1);
    expect(await rootRows(fx.assignmentId)).toHaveLength(1);
  });

  it('a pre-CCA lookup hit returns the durable result without opening a transaction', async () => {
    const fx = await assignment(); // no consent at all
    const replayed = scenarioOperation('GENERAL_COLLECTION', async () => 'durable-existing');
    await expect(
      replayed.execute(fx.context, {
        assignmentId: fx.assignmentId,
        rootKey: 'hit',
        childKeys: [],
        scenario: 'record',
      }),
    ).resolves.toBe('durable-existing');
    expect(await rootRows(fx.assignmentId)).toEqual([]);
  });
});

describe('§34/§35/§40 accepted A1/A2 owners keep working under governance', () => {
  it('the accepted A1 consent owner (grant → withdraw) is unchanged', async () => {
    const fx = await assignment();
    const grant = await recordConsentGrant({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      consentPayload: {
        consentVersion: 'cv1',
        privacyNoticeVersion: 'pv1',
        optionalEvidenceConsent: true,
      },
      idempotencyKey: `cg-${uid()}`,
    });
    expect(grant.resultKind).toBe('EVENT_APPENDED');
    const replay = await recordConsentGrant({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      consentPayload: {
        consentVersion: 'cv1',
        privacyNoticeVersion: 'pv1',
        optionalEvidenceConsent: true,
      },
      idempotencyKey: `cg-replay-${uid()}`,
    });
    expect(replay.resultKind).toBe('NO_OP_EFFECTIVE_STATE');
    const withdraw = await recordConsentWithdrawal({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      idempotencyKey: `cw-${uid()}`,
    });
    expect(withdraw.resultKind).toBe('EVENT_APPENDED');
    expect(await studyConsentRepository.listEvents(fx.assignmentId)).toHaveLength(2);
  });

  it('the accepted A2 lifecycle owner (capture → create) is unchanged, including its consent gate', async () => {
    const fx = await granted();
    const token = await captureIntentToken({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      clientCorrelationNonce: `nonce-${uid()}`,
      resolvedEntrySource: DIRECT,
    });
    const intent = await createPurchaseIntent({
      trustedParticipantContext: fx.context,
      assignmentId: fx.assignmentId,
      intentCaptureKey: token.intentCaptureKey,
      intentType: 'BUYING_NOW',
      idempotencyKey: `int-${uid()}`,
    });
    expect(intent.intentId).toEqual(expect.any(String));

    const withdrawn = await granted();
    await recordConsentWithdrawal({
      trustedParticipantContext: withdrawn.context,
      assignmentId: withdrawn.assignmentId,
      idempotencyKey: `cw-${uid()}`,
    });
    const token2 = await captureIntentToken({
      trustedParticipantContext: withdrawn.context,
      assignmentId: withdrawn.assignmentId,
      clientCorrelationNonce: `nonce-${uid()}`,
      resolvedEntrySource: DIRECT,
    });
    await expect(
      createPurchaseIntent({
        trustedParticipantContext: withdrawn.context,
        assignmentId: withdrawn.assignmentId,
        intentCaptureKey: token2.intentCaptureKey,
        intentType: 'BUYING_NOW',
        idempotencyKey: `int-${uid()}`,
      }),
    ).rejects.toThrow();
  });

  it('leaves no execution context behind after the suite’s operations', () => {
    expect(readDatabaseExecutionState()).toMatchObject({
      transactionActive: false,
      transactionAuthority: 'NONE',
      ccaActive: false,
    });
  });
});

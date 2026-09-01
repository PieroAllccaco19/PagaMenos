// PagaMenos · M3.5B-A1 real-PostgreSQL adversarial integration suite (spec §17/§30).
//
// Runs ONLY under `scripts/pg-integration.ts` (ephemeral cluster + `prisma migrate deploy` + this
// suite). It exercises the SANCTIONED services end-to-end against real Postgres AND probes the
// database-level guards (freeze-guard, immutability triggers, §8.11 CHECK) directly. A1 tables are
// append-only, so every test uses fresh unique identities (no truncation between tests).
import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { prisma } from '@/db/client';
import {
  assignParticipant,
  createExperiment,
  freezeAnalysisProtocol,
  loadFrozenProtocolForAnalysis,
  registerAnalysisProtocolDraft,
  registerStudyParticipant,
} from '@/services/study-admin';
import { recordConsentGrant, recordConsentWithdrawal } from '@/services/study-consent';
import {
  deriveConsentAuthorizationIntervals,
  InMemoryRecruitmentResolver,
  mintTrustedParticipantContext,
  RECRUITMENT_KEY_VERSION_V1,
  StudyAssignmentOwnershipError,
  StudyConsentInvalidTransitionError,
  StudyConsentUpdateNotSupportedError,
  StudyDomainConflictError,
  StudyIdempotencyConflictError,
  StudyProtocolAlreadyFrozenError,
  StudyProtocolDigestMismatchError,
  StudyProtocolNotFrozenError,
  StudyValidationError,
  type ConsentEventFact,
} from '@/study';

const uid = () => randomUUID().slice(0, 8);
const DEF = {
  observationWindowWeeks: 6,
  contaminationWindowHours: 48,
  minimumVerifiedLevel: 'CORROBORATED',
  minimumIndependentOccasions: 2,
};

afterAll(async () => {
  await prisma.$disconnect();
});

/** Register + freeze a fresh protocol; return its id + version. */
async function freshFrozenProtocol(): Promise<{ id: string; protocolVersion: string }> {
  const protocolVersion = `P-${uid()}`;
  const draft = await registerAnalysisProtocolDraft({
    input: { protocolVersion, definition: DEF },
    idempotencyKey: `reg-${uid()}`,
  });
  const frozen = await freezeAnalysisProtocol({
    input: { protocolId: draft.protocol.id },
    idempotencyKey: `frz-${uid()}`,
  });
  expect(frozen.protocol.lifecycleStatus).toBe('FROZEN');
  return { id: frozen.protocol.id, protocolVersion };
}

/** A frozen protocol → experiment → participant → assignment; returns ids + trusted context. */
async function consentFixture() {
  const proto = await freshFrozenProtocol();
  const experiment = await createExperiment({
    input: { experimentCode: `E-${uid()}`, frozenProtocolId: proto.id },
    idempotencyKey: `exp-${uid()}`,
  });
  const participant = await registerStudyParticipant({
    input: { recruitmentSubjectKey: `sk-${uid()}`, recruitmentKeyVersion: RECRUITMENT_KEY_VERSION_V1 },
    idempotencyKey: `par-${uid()}`,
  });
  const assignment = await assignParticipant({
    input: { experimentId: experiment.experiment.id, participantId: participant.participant.id },
    idempotencyKey: `asg-${uid()}`,
  });
  const context = mintTrustedParticipantContext({ participantId: participant.participant.id });
  return {
    assignmentId: assignment.assignment.id,
    participantId: participant.participant.id,
    context,
  };
}

async function loadEvents(assignmentId: string): Promise<ConsentEventFact[]> {
  const rows = await prisma.studyConsentEvent.findMany({
    where: { assignmentId },
    orderBy: { consentSeq: 'asc' },
  });
  return rows.map((r) => ({
    consentSeq: r.consentSeq,
    action: r.action,
    consentVersion: r.consentVersion,
    privacyNoticeVersion: r.privacyNoticeVersion,
    optionalEvidenceConsent: r.optionalEvidenceConsent,
    assertedEffectiveAt: r.assertedEffectiveAt ? r.assertedEffectiveAt.toISOString() : null,
    capturedAt: r.capturedAt.toISOString(),
    recordedAt: r.recordedAt.toISOString(),
  }));
}

const GRANT = { consentVersion: 'cv1', privacyNoticeVersion: 'pv1', optionalEvidenceConsent: true };

// ===================================================================================================
describe('AnalysisProtocol — freeze lifecycle & fail-closed load (spec §2/§17)', () => {
  it('registers a DRAFT, freezes it, and loads it fail-closed with a verified definition', async () => {
    const proto = await freshFrozenProtocol();
    const loaded = await loadFrozenProtocolForAnalysis({ protocolId: proto.id });
    expect(loaded.protocol.lifecycleStatus).toBe('FROZEN');
    expect(loaded.definition).toEqual(DEF);
  });

  it('rejects a direct-DB UPDATE and DELETE of a FROZEN protocol (freeze-guard trigger)', async () => {
    const proto = await freshFrozenProtocol();
    await expect(
      prisma.$executeRawUnsafe(
        `UPDATE "analysis_protocol" SET "protocolVersion" = 'HACK' WHERE "id" = '${proto.id}'`,
      ),
    ).rejects.toThrow();
    await expect(
      prisma.$executeRawUnsafe(`DELETE FROM "analysis_protocol" WHERE "id" = '${proto.id}'`),
    ).rejects.toThrow();
  });

  it('rejects an arbitrary UPDATE of a DRAFT protocol (only the freeze transition is allowed)', async () => {
    const draft = await registerAnalysisProtocolDraft({
      input: { protocolVersion: `P-${uid()}`, definition: DEF },
      idempotencyKey: `reg-${uid()}`,
    });
    await expect(
      prisma.$executeRawUnsafe(
        `UPDATE "analysis_protocol" SET "definitionDigest" = 'zzz' WHERE "id" = '${draft.protocol.id}'`,
      ),
    ).rejects.toThrow();
  });

  it('freeze is idempotent by key, and re-freezing a FROZEN protocol with a new key is rejected', async () => {
    const draft = await registerAnalysisProtocolDraft({
      input: { protocolVersion: `P-${uid()}`, definition: DEF },
      idempotencyKey: `reg-${uid()}`,
    });
    const key = `frz-${uid()}`;
    const a = await freezeAnalysisProtocol({ input: { protocolId: draft.protocol.id }, idempotencyKey: key });
    const b = await freezeAnalysisProtocol({ input: { protocolId: draft.protocol.id }, idempotencyKey: key });
    expect(b.protocol.id).toBe(a.protocol.id); // replay
    await expect(
      freezeAnalysisProtocol({ input: { protocolId: draft.protocol.id }, idempotencyKey: `frz-${uid()}` }),
    ).rejects.toBeInstanceOf(StudyProtocolAlreadyFrozenError);
  });

  it('load FAILS CLOSED on a digest mismatch (tampered definitionJson)', async () => {
    // Insert a raw DRAFT whose stored digest does not match its definitionJson, freeze it via raw SQL
    // (the freeze transition is permitted), then load through the service → digest mismatch.
    const id = randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "analysis_protocol" ("id","protocolVersion","definitionSchemaVersion","canonicalizationVersion","definitionJson","definitionDigest","lifecycleStatus")
       VALUES ('${id}','P-${uid()}','pagamenos.analysis-protocol-definition.v1','pagamenos.study.canonicalization.v1','${JSON.stringify(DEF)}'::jsonb,'deadbeef','DRAFT')`,
    );
    await prisma.$executeRawUnsafe(
      `UPDATE "analysis_protocol" SET "lifecycleStatus"='FROZEN', "frozenAt"=now() WHERE "id"='${id}'`,
    );
    await expect(loadFrozenProtocolForAnalysis({ protocolId: id })).rejects.toBeInstanceOf(
      StudyProtocolDigestMismatchError,
    );
  });

  it('register idempotency: same key replays; different key + same content aliases; different content conflicts', async () => {
    const protocolVersion = `P-${uid()}`;
    const key = `reg-${uid()}`;
    const a = await registerAnalysisProtocolDraft({ input: { protocolVersion, definition: DEF }, idempotencyKey: key });
    const replay = await registerAnalysisProtocolDraft({ input: { protocolVersion, definition: DEF }, idempotencyKey: key });
    expect(replay.protocol.id).toBe(a.protocol.id);
    const alias = await registerAnalysisProtocolDraft({
      input: { protocolVersion, definition: DEF },
      idempotencyKey: `reg-${uid()}`,
    });
    expect(alias.protocol.id).toBe(a.protocol.id); // different key, same content → same protocol
    await expect(
      registerAnalysisProtocolDraft({
        input: { protocolVersion, definition: { ...DEF, observationWindowWeeks: 8 } },
        idempotencyKey: `reg-${uid()}`,
      }),
    ).rejects.toBeInstanceOf(StudyDomainConflictError);
  });
});

// ===================================================================================================
describe('Experiment (spec §4/§17)', () => {
  it('creates against a FROZEN protocol; rejects a DRAFT protocol and a recruitmentPolicy field', async () => {
    const proto = await freshFrozenProtocol();
    const exp = await createExperiment({
      input: { experimentCode: `E-${uid()}`, frozenProtocolId: proto.id },
      idempotencyKey: `exp-${uid()}`,
    });
    expect(exp.experiment.frozenProtocolId).toBe(proto.id);

    const draft = await registerAnalysisProtocolDraft({
      input: { protocolVersion: `P-${uid()}`, definition: DEF },
      idempotencyKey: `reg-${uid()}`,
    });
    await expect(
      createExperiment({
        input: { experimentCode: `E-${uid()}`, frozenProtocolId: draft.protocol.id },
        idempotencyKey: `exp-${uid()}`,
      }),
    ).rejects.toBeInstanceOf(StudyProtocolNotFrozenError);

    await expect(
      createExperiment({
        // recruitmentPolicy is not part of the schema (strict) — rejected at validation.
        input: { experimentCode: `E-${uid()}`, frozenProtocolId: proto.id, recruitmentPolicy: 'x' } as never,
        idempotencyKey: `exp-${uid()}`,
      }),
    ).rejects.toBeInstanceOf(StudyValidationError);
  });

  it('is immutable at the DB level (UPDATE/DELETE rejected)', async () => {
    const proto = await freshFrozenProtocol();
    const exp = await createExperiment({
      input: { experimentCode: `E-${uid()}`, frozenProtocolId: proto.id },
      idempotencyKey: `exp-${uid()}`,
    });
    await expect(
      prisma.$executeRawUnsafe(`UPDATE "experiment" SET "experimentCode"='X' WHERE "id"='${exp.experiment.id}'`),
    ).rejects.toThrow();
    await expect(
      prisma.$executeRawUnsafe(`DELETE FROM "experiment" WHERE "id"='${exp.experiment.id}'`),
    ).rejects.toThrow();
  });
});

// ===================================================================================================
describe('StudyParticipant — stable identity & concurrency (spec §5/§17)', () => {
  it('invite A → subject S → P; rotated invite B for the SAME subject → the SAME participant', async () => {
    const resolver = new InMemoryRecruitmentResolver();
    const anchor = `subject-${uid()}`;
    const inviteA = `inviteA-${uid()}`;
    const inviteB = `inviteB-${uid()}`;
    resolver.link(inviteA, anchor);
    resolver.link(inviteB, anchor);
    const p1 = await registerStudyParticipant(
      { input: { recruitmentCredential: inviteA }, idempotencyKey: `par-${uid()}` },
      { resolver },
    );
    const p2 = await registerStudyParticipant(
      { input: { recruitmentCredential: inviteB }, idempotencyKey: `par-${uid()}` },
      { resolver },
    );
    expect(p2.participant.id).toBe(p1.participant.id);
    expect(p2.participant.recruitmentSubjectKey).toBe(p1.participant.recruitmentSubjectKey);
  });

  it('concurrent registrations (different keys, same subject) resolve to exactly ONE participant', async () => {
    const subjectKey = `sk-${uid()}`;
    const [a, b] = await Promise.all([
      registerStudyParticipant({
        input: { recruitmentSubjectKey: subjectKey, recruitmentKeyVersion: RECRUITMENT_KEY_VERSION_V1 },
        idempotencyKey: `par-${uid()}`,
      }),
      registerStudyParticipant({
        input: { recruitmentSubjectKey: subjectKey, recruitmentKeyVersion: RECRUITMENT_KEY_VERSION_V1 },
        idempotencyKey: `par-${uid()}`,
      }),
    ]);
    expect(a.participant.id).toBe(b.participant.id);
    const count = await prisma.studyParticipant.count({ where: { recruitmentSubjectKey: subjectKey } });
    expect(count).toBe(1);
  });

  it('same transport key + a DIFFERENT subject → idempotency conflict', async () => {
    const key = `par-${uid()}`;
    await registerStudyParticipant({
      input: { recruitmentSubjectKey: `sk-${uid()}`, recruitmentKeyVersion: RECRUITMENT_KEY_VERSION_V1 },
      idempotencyKey: key,
    });
    await expect(
      registerStudyParticipant({
        input: { recruitmentSubjectKey: `sk-${uid()}`, recruitmentKeyVersion: RECRUITMENT_KEY_VERSION_V1 },
        idempotencyKey: key,
      }),
    ).rejects.toBeInstanceOf(StudyIdempotencyConflictError);
  });

  it('is append-only at the DB level (UPDATE rejected)', async () => {
    const p = await registerStudyParticipant({
      input: { recruitmentSubjectKey: `sk-${uid()}`, recruitmentKeyVersion: RECRUITMENT_KEY_VERSION_V1 },
      idempotencyKey: `par-${uid()}`,
    });
    await expect(
      prisma.$executeRawUnsafe(`UPDATE "study_participant" SET "participantCode"='X' WHERE "id"='${p.participant.id}'`),
    ).rejects.toThrow();
  });
});

// ===================================================================================================
describe('ExperimentAssignment (spec §7/§17)', () => {
  it('sets observationStartAt = enrolledAt and dedups a duplicate (experiment, participant)', async () => {
    const proto = await freshFrozenProtocol();
    const exp = await createExperiment({
      input: { experimentCode: `E-${uid()}`, frozenProtocolId: proto.id },
      idempotencyKey: `exp-${uid()}`,
    });
    const part = await registerStudyParticipant({
      input: { recruitmentSubjectKey: `sk-${uid()}`, recruitmentKeyVersion: RECRUITMENT_KEY_VERSION_V1 },
      idempotencyKey: `par-${uid()}`,
    });
    const a = await assignParticipant({
      input: { experimentId: exp.experiment.id, participantId: part.participant.id },
      idempotencyKey: `asg-${uid()}`,
    });
    expect(a.assignment.observationStartAt).toBe(a.assignment.enrolledAt);
    const b = await assignParticipant({
      input: { experimentId: exp.experiment.id, participantId: part.participant.id },
      idempotencyKey: `asg-${uid()}`,
    });
    expect(b.assignment.id).toBe(a.assignment.id); // one assignment
    const count = await prisma.experimentAssignment.count({
      where: { experimentId: exp.experiment.id, participantId: part.participant.id },
    });
    expect(count).toBe(1);
  });

  it('rejects a caller-supplied anchor/window (strict schema) and DB UPDATE/DELETE', async () => {
    const { assignmentId } = await consentFixture();
    await expect(
      assignParticipant({
        input: { experimentId: 'x', participantId: 'y', enrolledAt: '2020-01-01T00:00:00Z' } as never,
        idempotencyKey: `asg-${uid()}`,
      }),
    ).rejects.toBeInstanceOf(StudyValidationError);
    await expect(
      prisma.$executeRawUnsafe(`UPDATE "experiment_assignment" SET "enrolledAt"=now() WHERE "id"='${assignmentId}'`),
    ).rejects.toThrow();
    await expect(
      prisma.$executeRawUnsafe(`DELETE FROM "experiment_assignment" WHERE "id"='${assignmentId}'`),
    ).rejects.toThrow();
  });
});

// ===================================================================================================
describe('Consent — GRANT validation & idempotency (spec §8/§17)', () => {
  it('rejects a GRANT bearing assertedEffectiveAt BEFORE any receipt lookup (even after a valid receipt)', async () => {
    const { assignmentId, context } = await consentFixture();
    const key = `cg-${uid()}`;
    const ok = await recordConsentGrant({ trustedParticipantContext: context, assignmentId, consentPayload: GRANT, idempotencyKey: key });
    expect(ok.resultKind).toBe('EVENT_APPENDED');
    // Retry the SAME key but with a forbidden assertedEffectiveAt → validation error, NOT a replay.
    await expect(
      recordConsentGrant({
        trustedParticipantContext: context,
        assignmentId,
        consentPayload: { ...GRANT, assertedEffectiveAt: '2026-09-01T00:00:00.000Z' } as never,
        idempotencyKey: key,
      }),
    ).rejects.toBeInstanceOf(StudyValidationError);
  });

  it('same key + different provenance → idempotency conflict', async () => {
    const { assignmentId, context } = await consentFixture();
    const key = `cg-${uid()}`;
    await recordConsentGrant({ trustedParticipantContext: context, assignmentId, consentPayload: GRANT, idempotencyKey: key });
    await expect(
      recordConsentGrant({
        trustedParticipantContext: context,
        assignmentId,
        consentPayload: { ...GRANT, consentVersion: 'cv2' },
        idempotencyKey: key,
      }),
    ).rejects.toBeInstanceOf(StudyIdempotencyConflictError);
  });

  it('exact repeated GRANT (different key) → NO_OP_EFFECTIVE_STATE, no new event', async () => {
    const { assignmentId, context } = await consentFixture();
    await recordConsentGrant({ trustedParticipantContext: context, assignmentId, consentPayload: GRANT, idempotencyKey: `cg-${uid()}` });
    const again = await recordConsentGrant({ trustedParticipantContext: context, assignmentId, consentPayload: GRANT, idempotencyKey: `cg-${uid()}` });
    expect(again.resultKind).toBe('NO_OP_EFFECTIVE_STATE');
    expect((await loadEvents(assignmentId)).length).toBe(1);
  });

  it('GRANTED + materially different GRANT → StudyConsentUpdateNotSupportedError', async () => {
    const { assignmentId, context } = await consentFixture();
    await recordConsentGrant({ trustedParticipantContext: context, assignmentId, consentPayload: GRANT, idempotencyKey: `cg-${uid()}` });
    await expect(
      recordConsentGrant({
        trustedParticipantContext: context,
        assignmentId,
        consentPayload: { ...GRANT, optionalEvidenceConsent: false },
        idempotencyKey: `cg-${uid()}`,
      }),
    ).rejects.toBeInstanceOf(StudyConsentUpdateNotSupportedError);
  });

  it('concurrent identical GRANTs on one assignment append exactly ONE event (row-lock serialization)', async () => {
    const { assignmentId, context } = await consentFixture();
    await Promise.all([
      recordConsentGrant({ trustedParticipantContext: context, assignmentId, consentPayload: GRANT, idempotencyKey: `cg-${uid()}` }),
      recordConsentGrant({ trustedParticipantContext: context, assignmentId, consentPayload: GRANT, idempotencyKey: `cg-${uid()}` }),
    ]);
    expect((await loadEvents(assignmentId)).length).toBe(1);
  });
});

// ===================================================================================================
describe('Consent — withdrawal, transitions & intervals (spec §8.3/§8.6/§17)', () => {
  it('NO_CONSENT → WITHDRAW rejects; WITHDRAWN → GRANT rejects (no re-consent)', async () => {
    const f1 = await consentFixture();
    await expect(
      recordConsentWithdrawal({ trustedParticipantContext: f1.context, assignmentId: f1.assignmentId, idempotencyKey: `cw-${uid()}` }),
    ).rejects.toBeInstanceOf(StudyConsentInvalidTransitionError);

    const f2 = await consentFixture();
    await recordConsentGrant({ trustedParticipantContext: f2.context, assignmentId: f2.assignmentId, consentPayload: GRANT, idempotencyKey: `cg-${uid()}` });
    await recordConsentWithdrawal({ trustedParticipantContext: f2.context, assignmentId: f2.assignmentId, idempotencyKey: `cw-${uid()}` });
    await expect(
      recordConsentGrant({ trustedParticipantContext: f2.context, assignmentId: f2.assignmentId, consentPayload: GRANT, idempotencyKey: `cg-${uid()}` }),
    ).rejects.toBeInstanceOf(StudyConsentInvalidTransitionError);
  });

  it('a backdated withdrawal ALWAYS persists (EMPTY interval), never rejected', async () => {
    const { assignmentId, context } = await consentFixture();
    const grant = await recordConsentGrant({ trustedParticipantContext: context, assignmentId, consentPayload: GRANT, idempotencyKey: `cg-${uid()}` });
    expect(grant.resultKind).toBe('EVENT_APPENDED');
    // Assert an effective instant BEFORE the grant's trusted capturedAt → closeAt ≤ startAt.
    const withdraw = await recordConsentWithdrawal({
      trustedParticipantContext: context,
      assignmentId,
      withdrawPayload: { assertedEffectiveAt: '2000-01-01T00:00:00.000Z' },
      idempotencyKey: `cw-${uid()}`,
    });
    expect(withdraw.resultKind).toBe('EVENT_APPENDED'); // appended, not rejected
    const events = await loadEvents(assignmentId);
    expect(events.length).toBe(2);
    expect(deriveConsentAuthorizationIntervals(events)).toEqual([{ kind: 'EMPTY' }]);
  });

  it('a normal withdrawal yields a non-empty interval [grant.capturedAt, withdraw close)', async () => {
    const { assignmentId, context } = await consentFixture();
    await recordConsentGrant({ trustedParticipantContext: context, assignmentId, consentPayload: GRANT, idempotencyKey: `cg-${uid()}` });
    await recordConsentWithdrawal({ trustedParticipantContext: context, assignmentId, idempotencyKey: `cw-${uid()}` });
    const events = await loadEvents(assignmentId);
    const intervals = deriveConsentAuthorizationIntervals(events);
    expect(intervals).toHaveLength(1);
    expect(intervals[0]).toMatchObject({ kind: 'INTERVAL', startAt: events[0]!.capturedAt });
  });

  it('repeated-withdrawal receipts: replay / NO_OP / CORRECTION_NOT_APPLIED / conflict (spec §8.13)', async () => {
    const { assignmentId, context } = await consentFixture();
    await recordConsentGrant({ trustedParticipantContext: context, assignmentId, consentPayload: GRANT, idempotencyKey: `cg-${uid()}` });
    const wKey = `cw-${uid()}`;
    const asserted = { assertedEffectiveAt: '2026-09-01T00:00:00.000Z' };
    const first = await recordConsentWithdrawal({ trustedParticipantContext: context, assignmentId, withdrawPayload: asserted, idempotencyKey: wKey });
    expect(first.resultKind).toBe('EVENT_APPENDED');

    // same key + same payload → historical receipt replay (same event id).
    const replay = await recordConsentWithdrawal({ trustedParticipantContext: context, assignmentId, withdrawPayload: asserted, idempotencyKey: wKey });
    expect(replay.consentEventId).toBe(first.consentEventId);

    // same key + CHANGED payload → idempotency conflict.
    await expect(
      recordConsentWithdrawal({ trustedParticipantContext: context, assignmentId, withdrawPayload: { assertedEffectiveAt: '2026-08-01T00:00:00.000Z' }, idempotencyKey: wKey }),
    ).rejects.toBeInstanceOf(StudyIdempotencyConflictError);

    // different key + SAME payload while WITHDRAWN → NO_OP_EFFECTIVE_STATE, no new event.
    const noop = await recordConsentWithdrawal({ trustedParticipantContext: context, assignmentId, withdrawPayload: asserted, idempotencyKey: `cw-${uid()}` });
    expect(noop.resultKind).toBe('NO_OP_EFFECTIVE_STATE');
    expect(noop.consentEventId).toBe(first.consentEventId);

    // different key + CHANGED payload while WITHDRAWN → CORRECTION_NOT_APPLIED, no new event.
    const correction = await recordConsentWithdrawal({ trustedParticipantContext: context, assignmentId, withdrawPayload: { assertedEffectiveAt: '2026-07-01T00:00:00.000Z' }, idempotencyKey: `cw-${uid()}` });
    expect(correction.resultKind).toBe('CORRECTION_NOT_APPLIED');
    expect(correction.consentEventId).toBe(first.consentEventId);

    // Still exactly 2 events (1 grant + 1 withdrawal): no correction ever appended.
    expect((await loadEvents(assignmentId)).length).toBe(2);
  });
});

// ===================================================================================================
describe('Consent — trusted own-assignment binding & DB CHECK (spec §8.11/§12/§17)', () => {
  it('a participant cannot consent on ANOTHER participant\'s assignment', async () => {
    const a = await consentFixture();
    const b = await consentFixture();
    // a's context, b's assignment → ownership rejection.
    await expect(
      recordConsentGrant({ trustedParticipantContext: a.context, assignmentId: b.assignmentId, consentPayload: GRANT, idempotencyKey: `cg-${uid()}` }),
    ).rejects.toBeInstanceOf(StudyAssignmentOwnershipError);
  });

  it('a non-trusted context object is rejected', async () => {
    const { assignmentId } = await consentFixture();
    await expect(
      recordConsentGrant({
        trustedParticipantContext: { participantId: 'forged' } as never,
        assignmentId,
        consentPayload: GRANT,
        idempotencyKey: `cg-${uid()}`,
      }),
    ).rejects.toBeInstanceOf(StudyValidationError);
  });

  it('the §8.11 CHECK rejects a GRANTED row with a non-null assertedEffectiveAt at the DB level', async () => {
    const { assignmentId } = await consentFixture();
    await expect(
      prisma.$executeRawUnsafe(
        `INSERT INTO "study_consent_event" ("assignmentId","consentSeq","action","consentVersion","privacyNoticeVersion","optionalEvidenceConsent","assertedEffectiveAt","capturedAt")
         VALUES ('${assignmentId}', 1, 'GRANTED','cv','pv',true, now(), now())`,
      ),
    ).rejects.toThrow();
  });

  it('consent events are append-only (DB UPDATE rejected)', async () => {
    const { assignmentId, context } = await consentFixture();
    const g = await recordConsentGrant({ trustedParticipantContext: context, assignmentId, consentPayload: GRANT, idempotencyKey: `cg-${uid()}` });
    await expect(
      prisma.$executeRawUnsafe(`UPDATE "study_consent_event" SET "consentSeq"=9 WHERE "id"='${g.consentEventId}'`),
    ).rejects.toThrow();
  });
});

// PagaMenos · M3.5B-A1 real-PostgreSQL adversarial integration suite (spec §17/§30).
//
// Runs ONLY under `scripts/pg-integration.ts` (ephemeral cluster + `prisma migrate deploy` + this
// suite). It exercises the SANCTIONED services end-to-end against real Postgres AND probes the
// database-level guards (freeze-guard, immutability triggers, §8.11 CHECK) directly. A1 tables are
// append-only, so every test uses fresh unique identities (no truncation between tests).
import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { prisma } from '@/db/client';
import { StudyParticipantRepository } from '@/db/study-participant-repository';
import { StudyRecruitmentRepository } from '@/db/study-recruitment-repository';
import {
  assignParticipant,
  createExperiment,
  DurableRecruitmentResolver,
  freezeAnalysisProtocol,
  linkRecruitmentCredential,
  loadFrozenProtocolForAnalysis,
  registerAnalysisProtocolDraft,
  registerStudyParticipant,
  resolveTrustedParticipantContext,
} from '@/services/study-admin';
import { recordConsentGrant, recordConsentWithdrawal } from '@/services/study-consent';
import {
  deriveConsentAuthorizationIntervals,
  RECRUITMENT_KEY_VERSION_V1,
  StudyAssignmentOwnershipError,
  StudyConsentInvalidTransitionError,
  StudyConsentUpdateNotSupportedError,
  StudyDomainConflictError,
  StudyIdempotencyConflictError,
  StudyProtocolAlreadyFrozenError,
  StudyProtocolDigestMismatchError,
  StudyProtocolNotFrozenError,
  StudyRecruitmentResolutionError,
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
    input: {
      recruitmentSubjectKey: `sk-${uid()}`,
      recruitmentKeyVersion: RECRUITMENT_KEY_VERSION_V1,
    },
    idempotencyKey: `par-${uid()}`,
  });
  const assignment = await assignParticipant({
    input: { experimentId: experiment.experiment.id, participantId: participant.participant.id },
    idempotencyKey: `asg-${uid()}`,
  });
  const context = resolveTrustedParticipantContext({
    authenticatedParticipantId: participant.participant.id,
  });
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

  it('freeze is idempotent by key (same-key replay); an out-of-band FROZEN row has nothing to reconcile', async () => {
    const draft = await registerAnalysisProtocolDraft({
      input: { protocolVersion: `P-${uid()}`, definition: DEF },
      idempotencyKey: `reg-${uid()}`,
    });
    const key = `frz-${uid()}`;
    const a = await freezeAnalysisProtocol({
      input: { protocolId: draft.protocol.id },
      idempotencyKey: key,
    });
    const b = await freezeAnalysisProtocol({
      input: { protocolId: draft.protocol.id },
      idempotencyKey: key,
    });
    expect(b.protocol.id).toBe(a.protocol.id); // replay
    // (Different-key equivalent retry now RECONCILES — see the A1-CODE-06 test.)

    // A protocol frozen out-of-band (raw transition, no sanctioned freeze receipt) cannot be
    // re-frozen through the service: there is no successful freeze to reconcile against.
    const rawId = randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "analysis_protocol" ("id","protocolVersion","definitionSchemaVersion","canonicalizationVersion","definitionJson","definitionDigest","lifecycleStatus","frozenAt")
       VALUES ('${rawId}','P-${uid()}','pagamenos.analysis-protocol-definition.v1','pagamenos.study.canonicalization.v1','${JSON.stringify(DEF)}'::jsonb,'${a.protocol.definitionDigest}','FROZEN', now())`,
    );
    await expect(
      freezeAnalysisProtocol({ input: { protocolId: rawId }, idempotencyKey: `frz-${uid()}` }),
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
    const a = await registerAnalysisProtocolDraft({
      input: { protocolVersion, definition: DEF },
      idempotencyKey: key,
    });
    const replay = await registerAnalysisProtocolDraft({
      input: { protocolVersion, definition: DEF },
      idempotencyKey: key,
    });
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

  it('the lifecycle↔frozenAt CHECK makes malformed protocol rows impossible (A1-CODE-03)', async () => {
    const base = (extra: string) =>
      `INSERT INTO "analysis_protocol" ("protocolVersion","definitionSchemaVersion","canonicalizationVersion","definitionJson","definitionDigest",${extra}`;
    // DRAFT + frozenAt NULL → allowed.
    await expect(
      prisma.$executeRawUnsafe(
        base('"lifecycleStatus") VALUES ') + `('P-${uid()}','ds','cz','{}'::jsonb,'d','DRAFT')`,
      ),
    ).resolves.toBeGreaterThanOrEqual(0);
    // DRAFT + frozenAt NON-NULL → rejected by the named constraint.
    await expect(
      prisma.$executeRawUnsafe(
        base('"lifecycleStatus","frozenAt") VALUES ') +
          `('P-${uid()}','ds','cz','{}'::jsonb,'d','DRAFT', now())`,
      ),
    ).rejects.toThrow(/analysis_protocol_lifecycle_frozenat_ck/);
    // FROZEN + frozenAt NULL → rejected by the named constraint.
    await expect(
      prisma.$executeRawUnsafe(
        base('"lifecycleStatus") VALUES ') + `('P-${uid()}','ds','cz','{}'::jsonb,'d','FROZEN')`,
      ),
    ).rejects.toThrow(/analysis_protocol_lifecycle_frozenat_ck/);
  });

  it('a digest-invalid DRAFT CANNOT be frozen (A1-CODE-04) — stays DRAFT, no receipt', async () => {
    const id = randomUUID();
    // Raw DRAFT whose stored digest does not match its definitionJson (frozenAt NULL for the §CODE-03 CK).
    await prisma.$executeRawUnsafe(
      `INSERT INTO "analysis_protocol" ("id","protocolVersion","definitionSchemaVersion","canonicalizationVersion","definitionJson","definitionDigest","lifecycleStatus")
       VALUES ('${id}','P-${uid()}','pagamenos.analysis-protocol-definition.v1','pagamenos.study.canonicalization.v1','${JSON.stringify(DEF)}'::jsonb,'deadbeef','DRAFT')`,
    );
    await expect(
      freezeAnalysisProtocol({ input: { protocolId: id }, idempotencyKey: `frz-${uid()}` }),
    ).rejects.toBeInstanceOf(StudyProtocolDigestMismatchError);
    const row = await prisma.analysisProtocol.findUnique({ where: { id } });
    expect(row!.lifecycleStatus).toBe('DRAFT');
    expect(row!.frozenAt).toBeNull();
    expect(
      await prisma.analysisProtocolCommandReceipt.count({ where: { analysisProtocolId: id } }),
    ).toBe(0);
    // And it cannot back a FROZEN experiment because it is not FROZEN.
    await expect(
      createExperiment({
        input: { experimentCode: `E-${uid()}`, frozenProtocolId: id },
        idempotencyKey: `exp-${uid()}`,
      }),
    ).rejects.toBeInstanceOf(StudyProtocolNotFrozenError);
  });

  it('freeze different-key retry reconciles to the existing successful freeze (A1-CODE-06)', async () => {
    // Same-key replay.
    const draft = await registerAnalysisProtocolDraft({
      input: { protocolVersion: `P-${uid()}`, definition: DEF },
      idempotencyKey: `reg-${uid()}`,
    });
    const k1 = `frz-${uid()}`;
    const a = await freezeAnalysisProtocol({
      input: { protocolId: draft.protocol.id },
      idempotencyKey: k1,
    });
    const replay = await freezeAnalysisProtocol({
      input: { protocolId: draft.protocol.id },
      idempotencyKey: k1,
    });
    expect(replay.protocol.id).toBe(a.protocol.id);

    // Different key, equivalent semantic retry (response-lost scenario) → historical FROZEN + K2 alias.
    const k2 = `frz-${uid()}`;
    const b = await freezeAnalysisProtocol({
      input: { protocolId: draft.protocol.id },
      idempotencyKey: k2,
    });
    expect(b.protocol.id).toBe(a.protocol.id);
    expect(b.protocol.lifecycleStatus).toBe('FROZEN');
    expect(
      await prisma.analysisProtocolCommandReceipt.count({
        where: { analysisProtocolId: draft.protocol.id, operationScope: 'PROTOCOL_FREEZE_V1' },
      }),
    ).toBe(2); // K1 + K2 alias
    // Still exactly one protocol row for that version.
    expect(
      await prisma.analysisProtocol.count({
        where: { protocolVersion: draft.protocol.protocolVersion },
      }),
    ).toBe(1);

    // Non-equivalent K3: an incompatible expected digest → conflict, NO success receipt.
    await expect(
      freezeAnalysisProtocol({
        input: { protocolId: draft.protocol.id, expectedDefinitionDigest: 'deadbeef' },
        idempotencyKey: `frz-${uid()}`,
      }),
    ).rejects.toBeInstanceOf(StudyDomainConflictError);
    expect(
      await prisma.analysisProtocolCommandReceipt.count({
        where: { analysisProtocolId: draft.protocol.id, operationScope: 'PROTOCOL_FREEZE_V1' },
      }),
    ).toBe(2); // unchanged — the non-equivalent retry created nothing
  });

  it('concurrent different-key freezes of one protocol → one transition, two matching receipts (A1-CODE-06)', async () => {
    const draft = await registerAnalysisProtocolDraft({
      input: { protocolVersion: `P-${uid()}`, definition: DEF },
      idempotencyKey: `reg-${uid()}`,
    });
    const [a, b] = await Promise.all([
      freezeAnalysisProtocol({
        input: { protocolId: draft.protocol.id },
        idempotencyKey: `frz-${uid()}`,
      }),
      freezeAnalysisProtocol({
        input: { protocolId: draft.protocol.id },
        idempotencyKey: `frz-${uid()}`,
      }),
    ]);
    expect(a.protocol.id).toBe(b.protocol.id);
    expect(a.protocol.lifecycleStatus).toBe('FROZEN');
    expect(
      await prisma.analysisProtocolCommandReceipt.count({
        where: { analysisProtocolId: draft.protocol.id, operationScope: 'PROTOCOL_FREEZE_V1' },
      }),
    ).toBe(2);
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
        input: {
          experimentCode: `E-${uid()}`,
          frozenProtocolId: proto.id,
          recruitmentPolicy: 'x',
        } as never,
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
      prisma.$executeRawUnsafe(
        `UPDATE "experiment" SET "experimentCode"='X' WHERE "id"='${exp.experiment.id}'`,
      ),
    ).rejects.toThrow();
    await expect(
      prisma.$executeRawUnsafe(`DELETE FROM "experiment" WHERE "id"='${exp.experiment.id}'`),
    ).rejects.toThrow();
  });
});

// ===================================================================================================
describe('StudyParticipant — stable identity & concurrency (spec §5/§17)', () => {
  it('invite A → subject S → P; rotated invite B for the SAME subject → the SAME participant (durable)', async () => {
    const anchor = `subject-${uid()}`;
    const inviteA = `inviteA-${uid()}`;
    const inviteB = `inviteB-${uid()}`;
    await linkRecruitmentCredential({ credential: inviteA, subjectAnchor: anchor });
    await linkRecruitmentCredential({ credential: inviteB, subjectAnchor: anchor });
    const p1 = await registerStudyParticipant({
      input: { recruitmentCredential: inviteA },
      idempotencyKey: `par-${uid()}`,
    });
    const p2 = await registerStudyParticipant({
      input: { recruitmentCredential: inviteB },
      idempotencyKey: `par-${uid()}`,
    });
    expect(p2.participant.id).toBe(p1.participant.id);
    expect(p2.participant.recruitmentSubjectKey).toBe(p1.participant.recruitmentSubjectKey);
  });

  it('durable identity survives a default key-version advance AND a fresh resolver process (A1-CODE-02)', async () => {
    const V2 = 'pagamenos.recruitment-subject-key.v2';
    const anchorS = `subject-${uid()}`;
    const credS = `inv-${uid()}`;
    await linkRecruitmentCredential({ credential: credS, subjectAnchor: anchorS });

    // Issue S under V1 via one resolver instance.
    const resolverV1 = new DurableRecruitmentResolver(new StudyRecruitmentRepository(prisma), {
      currentKeyVersion: RECRUITMENT_KEY_VERSION_V1,
    });
    const first = await resolverV1.resolveCredential(credS);
    expect(first.recruitmentKeyVersion).toBe(RECRUITMENT_KEY_VERSION_V1);

    // A brand-new resolver instance (simulating a restarted process; no in-memory state) with the
    // default advanced to V2 STILL resolves S to its original V1 key/version.
    const resolverV2 = new DurableRecruitmentResolver(new StudyRecruitmentRepository(prisma), {
      currentKeyVersion: V2,
    });
    const again = await resolverV2.resolveCredential(credS);
    expect(again.recruitmentSubjectKey).toBe(first.recruitmentSubjectKey);
    expect(again.recruitmentKeyVersion).toBe(RECRUITMENT_KEY_VERSION_V1); // NOT V2

    // A brand-new subject N after the advance gets V2.
    const anchorN = `subject-${uid()}`;
    const credN = `inv-${uid()}`;
    await linkRecruitmentCredential({ credential: credN, subjectAnchor: anchorN });
    const newSubject = await resolverV2.resolveCredential(credN);
    expect(newSubject.recruitmentKeyVersion).toBe(V2);
  });

  it('a credential already bound to a subject cannot be silently reassigned (A1-CODE-02/§13)', async () => {
    const cred = `inv-${uid()}`;
    await linkRecruitmentCredential({ credential: cred, subjectAnchor: `subject-${uid()}` });
    await linkRecruitmentCredential({ credential: cred, subjectAnchor: `subject-${uid()}` }).then(
      () => {
        throw new Error('expected reassignment conflict');
      },
      (e) => expect(e).toBeInstanceOf(StudyRecruitmentResolutionError),
    );
    // Re-linking the SAME credential to the SAME anchor is idempotent.
    const anchor = `subject-${uid()}`;
    const cred2 = `inv-${uid()}`;
    await linkRecruitmentCredential({ credential: cred2, subjectAnchor: anchor });
    await expect(
      linkRecruitmentCredential({ credential: cred2, subjectAnchor: anchor }),
    ).resolves.toBeUndefined();
  });

  it('concurrent rotated credentials for the same subject → ONE durable subject → ONE participant', async () => {
    const anchor = `subject-${uid()}`;
    const credA = `inv-${uid()}`;
    const credB = `inv-${uid()}`;
    await linkRecruitmentCredential({ credential: credA, subjectAnchor: anchor });
    await linkRecruitmentCredential({ credential: credB, subjectAnchor: anchor });
    const [a, b] = await Promise.all([
      registerStudyParticipant({
        input: { recruitmentCredential: credA },
        idempotencyKey: `par-${uid()}`,
      }),
      registerStudyParticipant({
        input: { recruitmentCredential: credB },
        idempotencyKey: `par-${uid()}`,
      }),
    ]);
    expect(a.participant.id).toBe(b.participant.id);
    expect(
      await prisma.studyParticipant.count({
        where: { recruitmentSubjectKey: a.participant.recruitmentSubjectKey },
      }),
    ).toBe(1);
    expect(
      await prisma.recruitmentSubjectIdentity.count({ where: { subjectAnchor: anchor } }),
    ).toBe(1);
  });

  it('a participantCode collision is NOT treated as same-subject reconciliation (§27)', async () => {
    const dupCode = `PART-DUP-${uid()}`;
    const s1 = `sk-${uid()}`;
    const s2 = `sk-${uid()}`;
    // P1 gets the fixed code.
    const p1 = await registerStudyParticipant(
      {
        input: { recruitmentSubjectKey: s1, recruitmentKeyVersion: RECRUITMENT_KEY_VERSION_V1 },
        idempotencyKey: `par-${uid()}`,
      },
      { repository: new StudyParticipantRepository(prisma, () => dupCode) },
    );
    // A DIFFERENT subject whose first code generation COLLIDES with P1's code, then a unique code.
    let n = 0;
    const uniqueCode = `PART-OK-${uid()}`;
    const collideThenUnique = () => (n++ === 0 ? dupCode : uniqueCode);
    const p2 = await registerStudyParticipant(
      {
        input: { recruitmentSubjectKey: s2, recruitmentKeyVersion: RECRUITMENT_KEY_VERSION_V1 },
        idempotencyKey: `par-${uid()}`,
      },
      { repository: new StudyParticipantRepository(prisma, collideThenUnique) },
    );
    expect(p2.participant.id).not.toBe(p1.participant.id); // never returned P1
    expect(p2.participant.recruitmentSubjectKey).toBe(s2);
    expect(p2.participant.participantCode).toBe(uniqueCode);
  });

  it('concurrent registrations (different keys, same subject) resolve to exactly ONE participant', async () => {
    const subjectKey = `sk-${uid()}`;
    const [a, b] = await Promise.all([
      registerStudyParticipant({
        input: {
          recruitmentSubjectKey: subjectKey,
          recruitmentKeyVersion: RECRUITMENT_KEY_VERSION_V1,
        },
        idempotencyKey: `par-${uid()}`,
      }),
      registerStudyParticipant({
        input: {
          recruitmentSubjectKey: subjectKey,
          recruitmentKeyVersion: RECRUITMENT_KEY_VERSION_V1,
        },
        idempotencyKey: `par-${uid()}`,
      }),
    ]);
    expect(a.participant.id).toBe(b.participant.id);
    const count = await prisma.studyParticipant.count({
      where: { recruitmentSubjectKey: subjectKey },
    });
    expect(count).toBe(1);
  });

  it('same transport key + a DIFFERENT subject → idempotency conflict', async () => {
    const key = `par-${uid()}`;
    await registerStudyParticipant({
      input: {
        recruitmentSubjectKey: `sk-${uid()}`,
        recruitmentKeyVersion: RECRUITMENT_KEY_VERSION_V1,
      },
      idempotencyKey: key,
    });
    await expect(
      registerStudyParticipant({
        input: {
          recruitmentSubjectKey: `sk-${uid()}`,
          recruitmentKeyVersion: RECRUITMENT_KEY_VERSION_V1,
        },
        idempotencyKey: key,
      }),
    ).rejects.toBeInstanceOf(StudyIdempotencyConflictError);
  });

  it('is append-only at the DB level (UPDATE rejected)', async () => {
    const p = await registerStudyParticipant({
      input: {
        recruitmentSubjectKey: `sk-${uid()}`,
        recruitmentKeyVersion: RECRUITMENT_KEY_VERSION_V1,
      },
      idempotencyKey: `par-${uid()}`,
    });
    await expect(
      prisma.$executeRawUnsafe(
        `UPDATE "study_participant" SET "participantCode"='X' WHERE "id"='${p.participant.id}'`,
      ),
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
      input: {
        recruitmentSubjectKey: `sk-${uid()}`,
        recruitmentKeyVersion: RECRUITMENT_KEY_VERSION_V1,
      },
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
        input: {
          experimentId: 'x',
          participantId: 'y',
          enrolledAt: '2020-01-01T00:00:00Z',
        } as never,
        idempotencyKey: `asg-${uid()}`,
      }),
    ).rejects.toBeInstanceOf(StudyValidationError);
    await expect(
      prisma.$executeRawUnsafe(
        `UPDATE "experiment_assignment" SET "enrolledAt"=now() WHERE "id"='${assignmentId}'`,
      ),
    ).rejects.toThrow();
    await expect(
      prisma.$executeRawUnsafe(`DELETE FROM "experiment_assignment" WHERE "id"='${assignmentId}'`),
    ).rejects.toThrow();
  });

  it('the DB enforces observationStartAt == enrolledAt (A1-CODE-05)', async () => {
    const proto = await freshFrozenProtocol();
    const exp = await createExperiment({
      input: { experimentCode: `E-${uid()}`, frozenProtocolId: proto.id },
      idempotencyKey: `exp-${uid()}`,
    });
    const part = await registerStudyParticipant({
      input: {
        recruitmentSubjectKey: `sk-${uid()}`,
        recruitmentKeyVersion: RECRUITMENT_KEY_VERSION_V1,
      },
      idempotencyKey: `par-${uid()}`,
    });
    const ins = (start: string) =>
      `INSERT INTO "experiment_assignment" ("experimentId","participantId","enrolledAt","observationStartAt")
       VALUES ('${exp.experiment.id}','${part.participant.id}','2026-09-01T10:00:00Z', ${start})`;
    // Equal anchors → accepted.
    await expect(
      prisma.$executeRawUnsafe(ins(`'2026-09-01T10:00:00Z'`)),
    ).resolves.toBeGreaterThanOrEqual(0);
    // Different anchors → rejected by the named constraint.
    await expect(prisma.$executeRawUnsafe(ins(`'2026-09-02T10:00:00Z'`))).rejects.toThrow(
      /experiment_assignment_anchor_eq_ck/,
    );
  });
});

// ===================================================================================================
describe('Consent — GRANT validation & idempotency (spec §8/§17)', () => {
  it('rejects a GRANT bearing assertedEffectiveAt BEFORE any receipt lookup (even after a valid receipt)', async () => {
    const { assignmentId, context } = await consentFixture();
    const key = `cg-${uid()}`;
    const ok = await recordConsentGrant({
      trustedParticipantContext: context,
      assignmentId,
      consentPayload: GRANT,
      idempotencyKey: key,
    });
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
    await recordConsentGrant({
      trustedParticipantContext: context,
      assignmentId,
      consentPayload: GRANT,
      idempotencyKey: key,
    });
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
    await recordConsentGrant({
      trustedParticipantContext: context,
      assignmentId,
      consentPayload: GRANT,
      idempotencyKey: `cg-${uid()}`,
    });
    const again = await recordConsentGrant({
      trustedParticipantContext: context,
      assignmentId,
      consentPayload: GRANT,
      idempotencyKey: `cg-${uid()}`,
    });
    expect(again.resultKind).toBe('NO_OP_EFFECTIVE_STATE');
    expect((await loadEvents(assignmentId)).length).toBe(1);
  });

  it('GRANTED + materially different GRANT → StudyConsentUpdateNotSupportedError', async () => {
    const { assignmentId, context } = await consentFixture();
    await recordConsentGrant({
      trustedParticipantContext: context,
      assignmentId,
      consentPayload: GRANT,
      idempotencyKey: `cg-${uid()}`,
    });
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
      recordConsentGrant({
        trustedParticipantContext: context,
        assignmentId,
        consentPayload: GRANT,
        idempotencyKey: `cg-${uid()}`,
      }),
      recordConsentGrant({
        trustedParticipantContext: context,
        assignmentId,
        consentPayload: GRANT,
        idempotencyKey: `cg-${uid()}`,
      }),
    ]);
    expect((await loadEvents(assignmentId)).length).toBe(1);
  });
});

// ===================================================================================================
describe('Consent — withdrawal, transitions & intervals (spec §8.3/§8.6/§17)', () => {
  it('NO_CONSENT → WITHDRAW rejects; WITHDRAWN → GRANT rejects (no re-consent)', async () => {
    const f1 = await consentFixture();
    await expect(
      recordConsentWithdrawal({
        trustedParticipantContext: f1.context,
        assignmentId: f1.assignmentId,
        idempotencyKey: `cw-${uid()}`,
      }),
    ).rejects.toBeInstanceOf(StudyConsentInvalidTransitionError);

    const f2 = await consentFixture();
    await recordConsentGrant({
      trustedParticipantContext: f2.context,
      assignmentId: f2.assignmentId,
      consentPayload: GRANT,
      idempotencyKey: `cg-${uid()}`,
    });
    await recordConsentWithdrawal({
      trustedParticipantContext: f2.context,
      assignmentId: f2.assignmentId,
      idempotencyKey: `cw-${uid()}`,
    });
    await expect(
      recordConsentGrant({
        trustedParticipantContext: f2.context,
        assignmentId: f2.assignmentId,
        consentPayload: GRANT,
        idempotencyKey: `cg-${uid()}`,
      }),
    ).rejects.toBeInstanceOf(StudyConsentInvalidTransitionError);
  });

  it('a backdated withdrawal ALWAYS persists (EMPTY interval), never rejected', async () => {
    const { assignmentId, context } = await consentFixture();
    const grant = await recordConsentGrant({
      trustedParticipantContext: context,
      assignmentId,
      consentPayload: GRANT,
      idempotencyKey: `cg-${uid()}`,
    });
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
    await recordConsentGrant({
      trustedParticipantContext: context,
      assignmentId,
      consentPayload: GRANT,
      idempotencyKey: `cg-${uid()}`,
    });
    await recordConsentWithdrawal({
      trustedParticipantContext: context,
      assignmentId,
      idempotencyKey: `cw-${uid()}`,
    });
    const events = await loadEvents(assignmentId);
    const intervals = deriveConsentAuthorizationIntervals(events);
    expect(intervals).toHaveLength(1);
    expect(intervals[0]).toMatchObject({ kind: 'INTERVAL', startAt: events[0]!.capturedAt });
  });

  it('repeated-withdrawal receipts: replay / NO_OP / CORRECTION_NOT_APPLIED / conflict (spec §8.13)', async () => {
    const { assignmentId, context } = await consentFixture();
    await recordConsentGrant({
      trustedParticipantContext: context,
      assignmentId,
      consentPayload: GRANT,
      idempotencyKey: `cg-${uid()}`,
    });
    const wKey = `cw-${uid()}`;
    const asserted = { assertedEffectiveAt: '2026-09-01T00:00:00.000Z' };
    const first = await recordConsentWithdrawal({
      trustedParticipantContext: context,
      assignmentId,
      withdrawPayload: asserted,
      idempotencyKey: wKey,
    });
    expect(first.resultKind).toBe('EVENT_APPENDED');

    // same key + same payload → historical receipt replay (same event id).
    const replay = await recordConsentWithdrawal({
      trustedParticipantContext: context,
      assignmentId,
      withdrawPayload: asserted,
      idempotencyKey: wKey,
    });
    expect(replay.consentEventId).toBe(first.consentEventId);

    // same key + CHANGED payload → idempotency conflict.
    await expect(
      recordConsentWithdrawal({
        trustedParticipantContext: context,
        assignmentId,
        withdrawPayload: { assertedEffectiveAt: '2026-08-01T00:00:00.000Z' },
        idempotencyKey: wKey,
      }),
    ).rejects.toBeInstanceOf(StudyIdempotencyConflictError);

    // different key + SAME payload while WITHDRAWN → NO_OP_EFFECTIVE_STATE, no new event.
    const noop = await recordConsentWithdrawal({
      trustedParticipantContext: context,
      assignmentId,
      withdrawPayload: asserted,
      idempotencyKey: `cw-${uid()}`,
    });
    expect(noop.resultKind).toBe('NO_OP_EFFECTIVE_STATE');
    expect(noop.consentEventId).toBe(first.consentEventId);

    // different key + CHANGED payload while WITHDRAWN → CORRECTION_NOT_APPLIED, no new event.
    const correction = await recordConsentWithdrawal({
      trustedParticipantContext: context,
      assignmentId,
      withdrawPayload: { assertedEffectiveAt: '2026-07-01T00:00:00.000Z' },
      idempotencyKey: `cw-${uid()}`,
    });
    expect(correction.resultKind).toBe('CORRECTION_NOT_APPLIED');
    expect(correction.consentEventId).toBe(first.consentEventId);

    // Still exactly 2 events (1 grant + 1 withdrawal): no correction ever appended.
    expect((await loadEvents(assignmentId)).length).toBe(2);
  });
});

// ===================================================================================================
describe('Consent — trusted own-assignment binding & DB CHECK (spec §8.11/§12/§17)', () => {
  it("a participant cannot consent on ANOTHER participant's assignment", async () => {
    const a = await consentFixture();
    const b = await consentFixture();
    // a's context, b's assignment → ownership rejection.
    await expect(
      recordConsentGrant({
        trustedParticipantContext: a.context,
        assignmentId: b.assignmentId,
        consentPayload: GRANT,
        idempotencyKey: `cg-${uid()}`,
      }),
    ).rejects.toBeInstanceOf(StudyAssignmentOwnershipError);
  });

  it('a non-trusted / forged / derived context object is rejected (A1-CODE-01)', async () => {
    const a = await consentFixture();
    const b = await consentFixture();
    const forgeries: unknown[] = [
      { participantId: b.participantId }, // plain lookalike
      { ...a.context, participantId: b.participantId }, // spread of A's valid context, retargeted to B
      Object.assign({}, a.context), // clone of A's context
      JSON.parse(JSON.stringify(a.context)), // serialize/reconstruct
    ];
    for (const forged of forgeries) {
      await expect(
        recordConsentGrant({
          trustedParticipantContext: forged as never,
          assignmentId: b.assignmentId,
          consentPayload: GRANT,
          idempotencyKey: `cg-${uid()}`,
        }),
      ).rejects.toBeInstanceOf(StudyValidationError);
    }
    // Zero consent events/receipts were created on B's assignment by any forgery.
    expect(await prisma.studyConsentEvent.count({ where: { assignmentId: b.assignmentId } })).toBe(
      0,
    );
    expect(
      await prisma.studyConsentCommandReceipt.count({
        where: { consentEvent: { assignmentId: b.assignmentId } },
      }),
    ).toBe(0);
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
    const g = await recordConsentGrant({
      trustedParticipantContext: context,
      assignmentId,
      consentPayload: GRANT,
      idempotencyKey: `cg-${uid()}`,
    });
    await expect(
      prisma.$executeRawUnsafe(
        `UPDATE "study_consent_event" SET "consentSeq"=9 WHERE "id"='${g.consentEventId}'`,
      ),
    ).rejects.toThrow();
  });
});

// PagaMenos · src/db — StudyParticipant repository (spec §5/§6/§9). INTERNAL.
//
// The ONLY write path to `study_participant` + `study_participant_registration_receipt`. Dedup is by
// the STABLE `recruitmentSubjectKey` (UNIQUE + P2002), so credential/transport-key rotation for the
// same subject converges to ONE participant. `participantCode` is an opaque, system-issued pseudonym
// generated AFTER dedup (never caller input). Idempotency/domain reconciliation follow M3.5A.
//
// Owning sanctioned service (module-capability AST test): `services/study-recruitment.ts`.
import { randomBytes } from 'node:crypto';

import { type PrismaClient } from '@prisma/client';

import {
  PARTICIPANT_REGISTER_OPERATION_SCOPE,
  StudyDomainConflictError,
  StudyInvariantError,
} from '@/study';

import { prisma as defaultPrisma } from './client';
import { assertReceiptRequestHash, isUniqueViolation, wrapStudyUnexpected } from './study-support';

export interface StudyParticipantDto {
  id: string;
  recruitmentSubjectKey: string;
  recruitmentKeyVersion: string;
  participantCode: string;
  createdAt: string;
}

export interface RegisterParticipantArgs {
  recruitmentSubjectKey: string;
  recruitmentKeyVersion: string;
  idempotencyKey: string;
  requestHash: string;
}

export interface ParticipantStore {
  register(args: RegisterParticipantArgs): Promise<StudyParticipantDto>;
  findById(id: string): Promise<StudyParticipantDto | null>;
  findBySubjectKey(recruitmentSubjectKey: string): Promise<StudyParticipantDto | null>;
}

/** Opaque, system-issued participant-facing pseudonym (no PII, not participant-authored). */
function generateParticipantCode(): string {
  return `PART-${randomBytes(16).toString('hex')}`;
}

function rowToDto(row: {
  id: string;
  recruitmentSubjectKey: string;
  recruitmentKeyVersion: string;
  participantCode: string;
  createdAt: Date;
}): StudyParticipantDto {
  return {
    id: row.id,
    recruitmentSubjectKey: row.recruitmentSubjectKey,
    recruitmentKeyVersion: row.recruitmentKeyVersion,
    participantCode: row.participantCode,
    createdAt: row.createdAt.toISOString(),
  };
}

export class StudyParticipantRepository implements ParticipantStore {
  constructor(
    private readonly prisma: PrismaClient = defaultPrisma,
    /** Injectable participant-code generator (spec §27 collision test). Defaults to a random code. */
    private readonly codeGenerator: () => string = generateParticipantCode,
  ) {}

  async findById(id: string): Promise<StudyParticipantDto | null> {
    const row = await this.prisma.studyParticipant.findUnique({ where: { id } });
    return row ? rowToDto(row) : null;
  }

  async findBySubjectKey(recruitmentSubjectKey: string): Promise<StudyParticipantDto | null> {
    const row = await this.prisma.studyParticipant.findUnique({ where: { recruitmentSubjectKey } });
    return row ? rowToDto(row) : null;
  }

  private async findReceipt(key: string) {
    return this.prisma.studyParticipantRegistrationReceipt.findUnique({
      where: {
        operationScope_idempotencyKey: {
          operationScope: PARTICIPANT_REGISTER_OPERATION_SCOPE,
          idempotencyKey: key,
        },
      },
    });
  }

  async register(args: RegisterParticipantArgs): Promise<StudyParticipantDto> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const row = await this.prisma.$transaction(async (tx) => {
          const participant = await tx.studyParticipant.create({
            data: {
              recruitmentSubjectKey: args.recruitmentSubjectKey,
              recruitmentKeyVersion: args.recruitmentKeyVersion,
              participantCode: this.codeGenerator(),
            },
          });
          await tx.studyParticipantRegistrationReceipt.create({
            data: {
              operationScope: PARTICIPANT_REGISTER_OPERATION_SCOPE,
              idempotencyKey: args.idempotencyKey,
              requestHash: args.requestHash,
              participantId: participant.id,
            },
          });
          return participant;
        });
        return rowToDto(row);
      } catch (e) {
        if (!isUniqueViolation(e)) throw wrapStudyUnexpected(e, 'register study participant');
        const resolved = await this.reconcile(args);
        if (resolved) return resolved;
        // No receipt and no subject row ⇒ a rare participantCode collision or a rolled-back racer;
        // regenerate the code and retry.
      }
    }
    throw new StudyInvariantError(
      `unique violation registering participant for subject key but no conflict could be resolved`,
    );
  }

  private async reconcile(args: RegisterParticipantArgs): Promise<StudyParticipantDto | null> {
    // 1. Exact transport replay (same key). Different key with same key/different subject → conflict.
    const receipt = await this.findReceipt(args.idempotencyKey);
    if (receipt) {
      assertReceiptRequestHash({
        operationScope: PARTICIPANT_REGISTER_OPERATION_SCOPE,
        idempotencyKey: args.idempotencyKey,
        existingRequestHash: receipt.requestHash,
        attemptedRequestHash: args.requestHash,
      });
      const dto = await this.findById(receipt.participantId);
      if (!dto) throw new StudyInvariantError('participant receipt references missing participant');
      return dto;
    }
    // 2. Same subject via a different key ⇒ alias to the SAME participant (never a second participant).
    const existing = await this.findBySubjectKey(args.recruitmentSubjectKey);
    if (existing) {
      // Coherence (spec §14): the same stable key MUST carry the same key version — never alias an
      // incompatible key/version combination onto an existing participant.
      if (existing.recruitmentKeyVersion !== args.recruitmentKeyVersion) {
        throw new StudyDomainConflictError(
          args.recruitmentSubjectKey,
          existing.recruitmentKeyVersion,
          args.recruitmentKeyVersion,
        );
      }
      return this.attachAlias(args, existing);
    }
    return null;
  }

  private async attachAlias(
    args: RegisterParticipantArgs,
    existing: StudyParticipantDto,
  ): Promise<StudyParticipantDto> {
    try {
      await this.prisma.studyParticipantRegistrationReceipt.create({
        data: {
          operationScope: PARTICIPANT_REGISTER_OPERATION_SCOPE,
          idempotencyKey: args.idempotencyKey,
          requestHash: args.requestHash,
          participantId: existing.id,
        },
      });
      return existing;
    } catch (e) {
      if (!isUniqueViolation(e)) throw wrapStudyUnexpected(e, 'attach participant alias');
      const receipt = await this.findReceipt(args.idempotencyKey);
      if (!receipt)
        throw wrapStudyUnexpected(e, 'attach participant alias (missing after conflict)');
      assertReceiptRequestHash({
        operationScope: PARTICIPANT_REGISTER_OPERATION_SCOPE,
        idempotencyKey: args.idempotencyKey,
        existingRequestHash: receipt.requestHash,
        attemptedRequestHash: args.requestHash,
      });
      const dto = await this.findById(receipt.participantId);
      if (!dto) throw new StudyInvariantError('participant alias resolved to missing participant');
      return dto;
    }
  }
}

/** Default repository over the shared Prisma client. */
export const studyParticipantRepository = new StudyParticipantRepository();

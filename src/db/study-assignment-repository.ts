// PagaMenos · src/db — ExperimentAssignment repository (spec §7/§9). INTERNAL.
//
// The ONLY write path to `experiment_assignment` + `experiment_assignment_receipt`. Enrollment is the
// trusted system clock (supplied by the service, never the caller); `observationStartAt = enrolledAt`.
// Population uniqueness is `UNIQUE(experimentId, participantId)`; a duplicate resolves to the single
// existing assignment. The row is immutable and never deleted on withdrawal (DB triggers).
//
// Owning sanctioned service (module-capability AST test): `services/study-assignment-admin.ts`.
import { type PrismaClient } from '@prisma/client';

import { ASSIGN_PARTICIPANT_OPERATION_SCOPE, StudyInvariantError } from '@/study';

import { prisma as defaultPrisma } from './client';
import { assertReceiptRequestHash, isUniqueViolation, wrapStudyUnexpected } from './study-support';

export interface ExperimentAssignmentDto {
  id: string;
  experimentId: string;
  participantId: string;
  enrolledAt: string;
  observationStartAt: string;
  createdAt: string;
}

export interface AssignParticipantArgs {
  experimentId: string;
  participantId: string;
  /** Trusted enrollment instant (system clock). `observationStartAt` is set equal to it. */
  enrolledAt: Date;
  idempotencyKey: string;
  requestHash: string;
}

function rowToDto(row: {
  id: string;
  experimentId: string;
  participantId: string;
  enrolledAt: Date;
  observationStartAt: Date;
  createdAt: Date;
}): ExperimentAssignmentDto {
  return {
    id: row.id,
    experimentId: row.experimentId,
    participantId: row.participantId,
    enrolledAt: row.enrolledAt.toISOString(),
    observationStartAt: row.observationStartAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

export interface AssignmentStore {
  assign(args: AssignParticipantArgs): Promise<ExperimentAssignmentDto>;
  findById(id: string): Promise<ExperimentAssignmentDto | null>;
  findByExperimentParticipant(
    experimentId: string,
    participantId: string,
  ): Promise<ExperimentAssignmentDto | null>;
}

export class ExperimentAssignmentRepository implements AssignmentStore {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async findById(id: string): Promise<ExperimentAssignmentDto | null> {
    const row = await this.prisma.experimentAssignment.findUnique({ where: { id } });
    return row ? rowToDto(row) : null;
  }

  async findByExperimentParticipant(
    experimentId: string,
    participantId: string,
  ): Promise<ExperimentAssignmentDto | null> {
    const row = await this.prisma.experimentAssignment.findUnique({
      where: { experimentId_participantId: { experimentId, participantId } },
    });
    return row ? rowToDto(row) : null;
  }

  private async findReceipt(key: string) {
    return this.prisma.experimentAssignmentReceipt.findUnique({
      where: {
        operationScope_idempotencyKey: {
          operationScope: ASSIGN_PARTICIPANT_OPERATION_SCOPE,
          idempotencyKey: key,
        },
      },
    });
  }

  async assign(args: AssignParticipantArgs): Promise<ExperimentAssignmentDto> {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const row = await this.prisma.$transaction(async (tx) => {
          const assignment = await tx.experimentAssignment.create({
            data: {
              experimentId: args.experimentId,
              participantId: args.participantId,
              enrolledAt: args.enrolledAt,
              observationStartAt: args.enrolledAt,
            },
          });
          await tx.experimentAssignmentReceipt.create({
            data: {
              operationScope: ASSIGN_PARTICIPANT_OPERATION_SCOPE,
              idempotencyKey: args.idempotencyKey,
              requestHash: args.requestHash,
              assignmentId: assignment.id,
            },
          });
          return assignment;
        });
        return rowToDto(row);
      } catch (e) {
        if (!isUniqueViolation(e)) throw wrapStudyUnexpected(e, 'assign participant');
        const resolved = await this.reconcile(args);
        if (resolved) return resolved;
      }
    }
    throw new StudyInvariantError(
      `unique violation assigning participant but no conflict could be resolved`,
    );
  }

  private async reconcile(args: AssignParticipantArgs): Promise<ExperimentAssignmentDto | null> {
    const receipt = await this.findReceipt(args.idempotencyKey);
    if (receipt) {
      assertReceiptRequestHash({
        operationScope: ASSIGN_PARTICIPANT_OPERATION_SCOPE,
        idempotencyKey: args.idempotencyKey,
        existingRequestHash: receipt.requestHash,
        attemptedRequestHash: args.requestHash,
      });
      const dto = await this.findById(receipt.assignmentId);
      if (!dto) throw new StudyInvariantError('assignment receipt references missing assignment');
      return dto;
    }
    const existing = await this.findByExperimentParticipant(args.experimentId, args.participantId);
    if (existing) {
      return this.attachAlias(args, existing);
    }
    return null;
  }

  private async attachAlias(
    args: AssignParticipantArgs,
    existing: ExperimentAssignmentDto,
  ): Promise<ExperimentAssignmentDto> {
    try {
      await this.prisma.experimentAssignmentReceipt.create({
        data: {
          operationScope: ASSIGN_PARTICIPANT_OPERATION_SCOPE,
          idempotencyKey: args.idempotencyKey,
          requestHash: args.requestHash,
          assignmentId: existing.id,
        },
      });
      return existing;
    } catch (e) {
      if (!isUniqueViolation(e)) throw wrapStudyUnexpected(e, 'attach assignment alias');
      const receipt = await this.findReceipt(args.idempotencyKey);
      if (!receipt) throw wrapStudyUnexpected(e, 'attach assignment alias (missing after conflict)');
      assertReceiptRequestHash({
        operationScope: ASSIGN_PARTICIPANT_OPERATION_SCOPE,
        idempotencyKey: args.idempotencyKey,
        existingRequestHash: receipt.requestHash,
        attemptedRequestHash: args.requestHash,
      });
      const dto = await this.findById(receipt.assignmentId);
      if (!dto) throw new StudyInvariantError('assignment alias resolved to missing assignment');
      return dto;
    }
  }
}

/** Default repository over the shared Prisma client. */
export const experimentAssignmentRepository = new ExperimentAssignmentRepository();

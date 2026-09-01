// PagaMenos · src/db — Experiment repository (spec §4/§9). INTERNAL.
//
// The ONLY write path to `experiment` + `experiment_create_receipt`. An experiment references exactly
// one FROZEN AnalysisProtocol; this repository pre-checks the protocol lifecycle for a typed error and
// the DB insert-guard trigger is the backstop. Creation inserts the experiment + its receipt
// atomically; idempotency/domain reconciliation follow the accepted M3.5A pattern.
//
// Owning sanctioned service (module-capability AST test): `services/study-experiment-admin.ts`.
import { Prisma, type PrismaClient } from '@prisma/client';

import {
  EXPERIMENT_CREATE_OPERATION_SCOPE,
  StudyDomainConflictError,
  StudyInvariantError,
  StudyProtocolNotFrozenError,
} from '@/study';

import { prisma as defaultPrisma } from './client';
import { assertReceiptRequestHash, isUniqueViolation, wrapStudyUnexpected } from './study-support';

export interface ExperimentDto {
  id: string;
  experimentCode: string;
  frozenProtocolId: string;
  createdAt: string;
}

export interface CreateExperimentArgs {
  experimentCode: string;
  frozenProtocolId: string;
  idempotencyKey: string;
  requestHash: string;
}

type ExperimentRow = Prisma.ExperimentGetPayload<Record<string, never>>;

function rowToDto(row: ExperimentRow): ExperimentDto {
  return {
    id: row.id,
    experimentCode: row.experimentCode,
    frozenProtocolId: row.frozenProtocolId,
    createdAt: row.createdAt.toISOString(),
  };
}

export interface ExperimentStore {
  create(args: CreateExperimentArgs): Promise<ExperimentDto>;
  findById(id: string): Promise<ExperimentDto | null>;
  findByCode(experimentCode: string): Promise<ExperimentDto | null>;
}

export class ExperimentRepository implements ExperimentStore {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async findById(id: string): Promise<ExperimentDto | null> {
    const row = await this.prisma.experiment.findUnique({ where: { id } });
    return row ? rowToDto(row) : null;
  }

  async findByCode(experimentCode: string): Promise<ExperimentDto | null> {
    const row = await this.prisma.experiment.findUnique({ where: { experimentCode } });
    return row ? rowToDto(row) : null;
  }

  private async findReceipt(key: string) {
    return this.prisma.experimentCreateReceipt.findUnique({
      where: {
        operationScope_idempotencyKey: {
          operationScope: EXPERIMENT_CREATE_OPERATION_SCOPE,
          idempotencyKey: key,
        },
      },
    });
  }

  /** Fail closed with a typed error unless the referenced protocol exists and is FROZEN (spec §4). */
  private async assertProtocolFrozen(protocolId: string): Promise<void> {
    const proto = await this.prisma.analysisProtocol.findUnique({
      where: { id: protocolId },
      select: { lifecycleStatus: true },
    });
    if (!proto) throw new StudyInvariantError(`experiment references unknown protocol ${protocolId}`);
    if (proto.lifecycleStatus !== 'FROZEN') throw new StudyProtocolNotFrozenError(protocolId);
  }

  async create(args: CreateExperimentArgs): Promise<ExperimentDto> {
    await this.assertProtocolFrozen(args.frozenProtocolId);
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const row = await this.prisma.$transaction(async (tx) => {
          const experiment = await tx.experiment.create({
            data: { experimentCode: args.experimentCode, frozenProtocolId: args.frozenProtocolId },
          });
          await tx.experimentCreateReceipt.create({
            data: {
              operationScope: EXPERIMENT_CREATE_OPERATION_SCOPE,
              idempotencyKey: args.idempotencyKey,
              requestHash: args.requestHash,
              experimentId: experiment.id,
            },
          });
          return experiment;
        });
        return rowToDto(row);
      } catch (e) {
        if (!isUniqueViolation(e)) throw wrapStudyUnexpected(e, 'create experiment');
        const resolved = await this.reconcile(args);
        if (resolved) return resolved;
      }
    }
    throw new StudyInvariantError(
      `unique violation creating experiment '${args.experimentCode}' but no conflict could be resolved`,
    );
  }

  private async reconcile(args: CreateExperimentArgs): Promise<ExperimentDto | null> {
    const receipt = await this.findReceipt(args.idempotencyKey);
    if (receipt) {
      assertReceiptRequestHash({
        operationScope: EXPERIMENT_CREATE_OPERATION_SCOPE,
        idempotencyKey: args.idempotencyKey,
        existingRequestHash: receipt.requestHash,
        attemptedRequestHash: args.requestHash,
      });
      const dto = await this.findById(receipt.experimentId);
      if (!dto) throw new StudyInvariantError(`experiment receipt references missing experiment`);
      return dto;
    }
    const existing = await this.findByCode(args.experimentCode);
    if (existing) {
      if (existing.frozenProtocolId === args.frozenProtocolId) {
        return this.attachAlias(args, existing);
      }
      throw new StudyDomainConflictError(
        args.experimentCode,
        existing.frozenProtocolId,
        args.frozenProtocolId,
      );
    }
    return null;
  }

  private async attachAlias(
    args: CreateExperimentArgs,
    existing: ExperimentDto,
  ): Promise<ExperimentDto> {
    try {
      await this.prisma.experimentCreateReceipt.create({
        data: {
          operationScope: EXPERIMENT_CREATE_OPERATION_SCOPE,
          idempotencyKey: args.idempotencyKey,
          requestHash: args.requestHash,
          experimentId: existing.id,
        },
      });
      return existing;
    } catch (e) {
      if (!isUniqueViolation(e)) throw wrapStudyUnexpected(e, 'attach experiment alias');
      const receipt = await this.findReceipt(args.idempotencyKey);
      if (!receipt) throw wrapStudyUnexpected(e, 'attach experiment alias (missing after conflict)');
      assertReceiptRequestHash({
        operationScope: EXPERIMENT_CREATE_OPERATION_SCOPE,
        idempotencyKey: args.idempotencyKey,
        existingRequestHash: receipt.requestHash,
        attemptedRequestHash: args.requestHash,
      });
      const dto = await this.findById(receipt.experimentId);
      if (!dto) throw new StudyInvariantError('experiment alias resolved to missing experiment');
      return dto;
    }
  }
}

/** Default repository over the shared Prisma client. */
export const experimentRepository = new ExperimentRepository();

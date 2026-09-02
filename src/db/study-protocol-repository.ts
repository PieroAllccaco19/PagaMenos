// PagaMenos · src/db — AnalysisProtocol repository (spec §2/§2.2/§9). INTERNAL.
//
// The ONLY write path to `analysis_protocol` + `analysis_protocol_command_receipt`. Registration
// inserts a complete DRAFT + REGISTER receipt atomically; freeze performs the ONE permitted UPDATE
// (DRAFT→FROZEN, frozenAt NULL→trusted) under a `SELECT … FOR UPDATE` row lock that serializes
// concurrent freezes, plus a FREEZE receipt. Idempotency + domain reconciliation follow the accepted
// M3.5A pattern (real unique constraints, P2002 race reconciliation). The DB freeze-guard trigger is
// the backstop; this repository never attempts a forbidden UPDATE.
//
// Owning sanctioned services (module-capability AST test): `services/study-protocol-admin.ts` (write)
// and `services/study-analysis.ts` (read). No other module may import this repository.
import { Prisma, type PrismaClient } from '@prisma/client';

import {
  PROTOCOL_FREEZE_OPERATION_SCOPE,
  PROTOCOL_REGISTER_OPERATION_SCOPE,
  StudyDomainConflictError,
  StudyInvariantError,
  StudyProtocolAlreadyFrozenError,
  StudyProtocolDigestMismatchError,
  verifyProtocolDefinition,
} from '@/study';

import { prisma as defaultPrisma } from './client';
import { assertReceiptRequestHash, isUniqueViolation, wrapStudyUnexpected } from './study-support';

export interface AnalysisProtocolDto {
  id: string;
  protocolVersion: string;
  definitionSchemaVersion: string;
  canonicalizationVersion: string;
  definitionJson: unknown;
  definitionDigest: string;
  lifecycleStatus: 'DRAFT' | 'FROZEN';
  frozenAt: string | null;
  createdAt: string;
}

export interface RegisterProtocolDraftArgs {
  protocolVersion: string;
  definitionSchemaVersion: string;
  canonicalizationVersion: string;
  definitionJson: Record<string, unknown>;
  definitionDigest: string;
  idempotencyKey: string;
  requestHash: string;
}

export interface FreezeProtocolArgs {
  protocolId: string;
  frozenAt: Date;
  idempotencyKey: string;
  requestHash: string;
}

export interface ProtocolReceiptRecord {
  operationScope: string;
  idempotencyKey: string;
  requestHash: string;
  analysisProtocolId: string;
}

type ProtocolRow = Prisma.AnalysisProtocolGetPayload<Record<string, never>>;

function rowToDto(row: ProtocolRow): AnalysisProtocolDto {
  return {
    id: row.id,
    protocolVersion: row.protocolVersion,
    definitionSchemaVersion: row.definitionSchemaVersion,
    canonicalizationVersion: row.canonicalizationVersion,
    definitionJson: row.definitionJson,
    definitionDigest: row.definitionDigest,
    lifecycleStatus: row.lifecycleStatus,
    frozenAt: row.frozenAt ? row.frozenAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

export interface ProtocolStore {
  registerDraft(args: RegisterProtocolDraftArgs): Promise<AnalysisProtocolDto>;
  freeze(args: FreezeProtocolArgs): Promise<AnalysisProtocolDto>;
  findById(id: string): Promise<AnalysisProtocolDto | null>;
  findByVersion(protocolVersion: string): Promise<AnalysisProtocolDto | null>;
}

export class AnalysisProtocolRepository implements ProtocolStore {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async findById(id: string): Promise<AnalysisProtocolDto | null> {
    const row = await this.prisma.analysisProtocol.findUnique({ where: { id } });
    return row ? rowToDto(row) : null;
  }

  async findByVersion(protocolVersion: string): Promise<AnalysisProtocolDto | null> {
    const row = await this.prisma.analysisProtocol.findUnique({ where: { protocolVersion } });
    return row ? rowToDto(row) : null;
  }

  private async findRegisterReceipt(key: string): Promise<ProtocolReceiptRecord | null> {
    const row = await this.prisma.analysisProtocolCommandReceipt.findUnique({
      where: {
        operationScope_idempotencyKey: {
          operationScope: PROTOCOL_REGISTER_OPERATION_SCOPE,
          idempotencyKey: key,
        },
      },
    });
    return row
      ? {
          operationScope: row.operationScope,
          idempotencyKey: row.idempotencyKey,
          requestHash: row.requestHash,
          analysisProtocolId: row.analysisProtocolId,
        }
      : null;
  }

  private async findFreezeReceipt(
    tx: Prisma.TransactionClient,
    key: string,
  ): Promise<ProtocolReceiptRecord | null> {
    const row = await tx.analysisProtocolCommandReceipt.findUnique({
      where: {
        operationScope_idempotencyKey: {
          operationScope: PROTOCOL_FREEZE_OPERATION_SCOPE,
          idempotencyKey: key,
        },
      },
    });
    return row
      ? {
          operationScope: row.operationScope,
          idempotencyKey: row.idempotencyKey,
          requestHash: row.requestHash,
          analysisProtocolId: row.analysisProtocolId,
        }
      : null;
  }

  async registerDraft(args: RegisterProtocolDraftArgs): Promise<AnalysisProtocolDto> {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const row = await this.prisma.$transaction(async (tx) => {
          const protocol = await tx.analysisProtocol.create({
            data: {
              protocolVersion: args.protocolVersion,
              definitionSchemaVersion: args.definitionSchemaVersion,
              canonicalizationVersion: args.canonicalizationVersion,
              definitionJson: args.definitionJson as unknown as Prisma.InputJsonValue,
              definitionDigest: args.definitionDigest,
              lifecycleStatus: 'DRAFT',
            },
          });
          await tx.analysisProtocolCommandReceipt.create({
            data: {
              operationScope: PROTOCOL_REGISTER_OPERATION_SCOPE,
              idempotencyKey: args.idempotencyKey,
              requestHash: args.requestHash,
              analysisProtocolId: protocol.id,
            },
          });
          return protocol;
        });
        return rowToDto(row);
      } catch (e) {
        if (!isUniqueViolation(e)) throw wrapStudyUnexpected(e, 'register analysis protocol draft');
        const resolved = await this.reconcileRegister(args);
        if (resolved) return resolved;
        // Both keys momentarily absent (the racing writer rolled back) — retry the insert once.
      }
    }
    throw new StudyInvariantError(
      `unique violation registering protocol '${args.protocolVersion}' but no conflict could be resolved`,
    );
  }

  private async reconcileRegister(
    args: RegisterProtocolDraftArgs,
  ): Promise<AnalysisProtocolDto | null> {
    const receipt = await this.findRegisterReceipt(args.idempotencyKey);
    if (receipt) {
      assertReceiptRequestHash({
        operationScope: PROTOCOL_REGISTER_OPERATION_SCOPE,
        idempotencyKey: args.idempotencyKey,
        existingRequestHash: receipt.requestHash,
        attemptedRequestHash: args.requestHash,
      });
      const dto = await this.findById(receipt.analysisProtocolId);
      if (!dto) {
        throw new StudyInvariantError(
          `register receipt references missing protocol ${receipt.analysisProtocolId}`,
        );
      }
      return dto;
    }
    const existing = await this.findByVersion(args.protocolVersion);
    if (existing) {
      const sameContent =
        existing.definitionDigest === args.definitionDigest &&
        existing.definitionSchemaVersion === args.definitionSchemaVersion &&
        existing.canonicalizationVersion === args.canonicalizationVersion;
      if (sameContent) {
        return this.attachRegisterAlias(args, existing);
      }
      throw new StudyDomainConflictError(
        args.protocolVersion,
        existing.definitionDigest,
        args.definitionDigest,
      );
    }
    return null;
  }

  private async attachRegisterAlias(
    args: RegisterProtocolDraftArgs,
    existing: AnalysisProtocolDto,
  ): Promise<AnalysisProtocolDto> {
    try {
      await this.prisma.analysisProtocolCommandReceipt.create({
        data: {
          operationScope: PROTOCOL_REGISTER_OPERATION_SCOPE,
          idempotencyKey: args.idempotencyKey,
          requestHash: args.requestHash,
          analysisProtocolId: existing.id,
        },
      });
      return existing;
    } catch (e) {
      if (!isUniqueViolation(e)) throw wrapStudyUnexpected(e, 'attach protocol register alias');
      const receipt = await this.findRegisterReceipt(args.idempotencyKey);
      if (!receipt) throw wrapStudyUnexpected(e, 'attach protocol register alias (missing after conflict)');
      assertReceiptRequestHash({
        operationScope: PROTOCOL_REGISTER_OPERATION_SCOPE,
        idempotencyKey: args.idempotencyKey,
        existingRequestHash: receipt.requestHash,
        attemptedRequestHash: args.requestHash,
      });
      const dto = await this.findById(receipt.analysisProtocolId);
      if (!dto) throw new StudyInvariantError('protocol register alias resolved to missing protocol');
      return dto;
    }
  }

  async freeze(args: FreezeProtocolArgs): Promise<AnalysisProtocolDto> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Serialize concurrent freezes of THIS protocol by locking its row first, loading the FULL
        // persisted state needed to re-verify the digest under the lock (A1-CODE-04, no TOCTOU).
        const locked = await tx.$queryRaw<
          Array<{
            id: string;
            lifecycleStatus: string;
            protocolVersion: string;
            definitionSchemaVersion: string;
            canonicalizationVersion: string;
            definitionJson: unknown;
            definitionDigest: string;
          }>
        >(Prisma.sql`SELECT "id", "lifecycleStatus"::text AS "lifecycleStatus", "protocolVersion", "definitionSchemaVersion", "canonicalizationVersion", "definitionJson", "definitionDigest" FROM "analysis_protocol" WHERE "id" = ${args.protocolId}::uuid FOR UPDATE`);
        if (locked.length === 0) {
          throw new StudyInvariantError(`freeze references unknown protocol ${args.protocolId}`);
        }
        const row = locked[0]!;

        // Exact transport replay for THIS freeze key.
        const receipt = await this.findFreezeReceipt(tx, args.idempotencyKey);
        if (receipt) {
          assertReceiptRequestHash({
            operationScope: PROTOCOL_FREEZE_OPERATION_SCOPE,
            idempotencyKey: args.idempotencyKey,
            existingRequestHash: receipt.requestHash,
            attemptedRequestHash: args.requestHash,
          });
          return this.loadInTx(tx, receipt.analysisProtocolId);
        }

        if (row.lifecycleStatus === 'FROZEN') {
          // A1-CODE-06: a different-key retry of a semantically-equivalent freeze reconciles to the
          // existing successful freeze — durable K2 alias receipt, no second protocol, no mutation.
          const existingFreeze = await tx.analysisProtocolCommandReceipt.findFirst({
            where: {
              analysisProtocolId: args.protocolId,
              operationScope: PROTOCOL_FREEZE_OPERATION_SCOPE,
            },
          });
          if (!existingFreeze) {
            // Frozen without any sanctioned freeze receipt (e.g. a raw/out-of-band transition) — there
            // is nothing to reconcile against; the one-way lifecycle forbids a re-freeze.
            throw new StudyProtocolAlreadyFrozenError(args.protocolId);
          }
          // A materially different freeze request for the same protocol → conflict (never alias).
          assertReceiptRequestHash({
            operationScope: PROTOCOL_FREEZE_OPERATION_SCOPE,
            idempotencyKey: args.idempotencyKey,
            existingRequestHash: existingFreeze.requestHash,
            attemptedRequestHash: args.requestHash,
          });
          await tx.analysisProtocolCommandReceipt.create({
            data: {
              operationScope: PROTOCOL_FREEZE_OPERATION_SCOPE,
              idempotencyKey: args.idempotencyKey,
              requestHash: args.requestHash,
              analysisProtocolId: args.protocolId,
            },
          });
          return this.loadInTx(tx, args.protocolId);
        }

        // DRAFT: A1-CODE-04 — re-verify the persisted definition digest against the SAME locked row
        // BEFORE the transition. A digest-invalid DRAFT can NEVER be frozen and NO receipt is written.
        verifyProtocolDefinition({
          definitionSchemaVersion: row.definitionSchemaVersion,
          canonicalizationVersion: row.canonicalizationVersion,
          definitionJson: row.definitionJson,
          definitionDigest: row.definitionDigest,
          protocolRef: args.protocolId,
        });

        // The one permitted UPDATE: DRAFT→FROZEN, frozenAt NULL→trusted, nothing else.
        const updated = await tx.analysisProtocol.updateMany({
          where: { id: args.protocolId, lifecycleStatus: 'DRAFT' },
          data: { lifecycleStatus: 'FROZEN', frozenAt: args.frozenAt },
        });
        if (updated.count !== 1) {
          throw new StudyInvariantError(
            `freeze UPDATE affected ${updated.count} rows for protocol ${args.protocolId}`,
          );
        }
        await tx.analysisProtocolCommandReceipt.create({
          data: {
            operationScope: PROTOCOL_FREEZE_OPERATION_SCOPE,
            idempotencyKey: args.idempotencyKey,
            requestHash: args.requestHash,
            analysisProtocolId: args.protocolId,
          },
        });
        return this.loadInTx(tx, args.protocolId);
      });
    } catch (e) {
      if (
        e instanceof StudyInvariantError ||
        e instanceof StudyProtocolAlreadyFrozenError ||
        e instanceof StudyProtocolDigestMismatchError ||
        e instanceof StudyDomainConflictError ||
        (e as { name?: string })?.name === 'StudyIdempotencyConflictError'
      ) {
        throw e;
      }
      throw wrapStudyUnexpected(e, 'freeze analysis protocol');
    }
  }

  private async loadInTx(tx: Prisma.TransactionClient, id: string): Promise<AnalysisProtocolDto> {
    const row = await tx.analysisProtocol.findUnique({ where: { id } });
    if (!row) throw new StudyInvariantError(`protocol ${id} vanished during freeze`);
    return rowToDto(row);
  }
}

/** Default repository over the shared Prisma client. */
export const analysisProtocolRepository = new AnalysisProtocolRepository();

// PagaMenos · src/db — DecisionSnapshot repository (§10/§11/§16/§26/§30).
//
// The ONLY write path to the immutable decision table. It provides race-safe idempotent insertion
// keyed on two independent unique columns (transport `idempotencyKey`, domain `businessDecisionKey`)
// and translates known PostgreSQL failures into typed persistence errors — application code never
// parses raw driver strings. There is intentionally NO update/delete method; immutability is ALSO
// enforced at the DB level by triggers (defense in depth, §12).
import { Prisma, type PrismaClient } from '@prisma/client';

import {
  BusinessDecisionConflictError,
  IdempotencyConflictError,
  PersistenceInvariantError,
  parseDecisionSnapshotDto,
  type DecisionSnapshotDraft,
  type DecisionSnapshotDto,
} from '@/persistence';

import { prisma as defaultPrisma } from './client';

type Row = Prisma.DecisionSnapshotGetPayload<Record<string, never>>;

/** Map a persisted row to a validated DTO (dates → ISO strings; strict schema re-validation, §7). */
function rowToDto(row: Row): DecisionSnapshotDto {
  return parseDecisionSnapshotDto({
    id: row.id,
    businessDecisionKey: row.businessDecisionKey,
    idempotencyKey: row.idempotencyKey,
    snapshotSchemaVersion: row.snapshotSchemaVersion,
    engineInputSchemaVersion: row.engineInputSchemaVersion,
    engineOutputSchemaVersion: row.engineOutputSchemaVersion,
    engineContractVersion: row.engineContractVersion,
    corpusVersion: row.corpusVersion,
    merchantId: row.merchantId,
    selectedScopeId: row.selectedScopeId,
    decisionStatus: row.decisionStatus,
    evaluatedAt: row.evaluatedAt.toISOString(),
    intendedTransactionAt: row.intendedTransactionAt.toISOString(),
    engineInputJson: row.engineInputJson,
    engineOutputJson: row.engineOutputJson,
    inputHash: row.inputHash,
    outputHash: row.outputHash,
    gitSha: row.gitSha,
    buildId: row.buildId,
    createdAt: row.createdAt.toISOString(),
  });
}

function toCreateData(draft: DecisionSnapshotDraft): Prisma.DecisionSnapshotCreateInput {
  return {
    businessDecisionKey: draft.businessDecisionKey,
    idempotencyKey: draft.idempotencyKey,
    snapshotSchemaVersion: draft.snapshotSchemaVersion,
    engineInputSchemaVersion: draft.engineInputSchemaVersion,
    engineOutputSchemaVersion: draft.engineOutputSchemaVersion,
    engineContractVersion: draft.engineContractVersion,
    corpusVersion: draft.corpusVersion,
    merchantId: draft.merchantId,
    selectedScopeId: draft.selectedScopeId,
    decisionStatus: draft.decisionStatus,
    evaluatedAt: new Date(draft.evaluatedAt),
    intendedTransactionAt: new Date(draft.intendedTransactionAt),
    // Stored verbatim as JSONB (the historical truth). Canonicalization drops undefined keys exactly
    // as JSONB does, so a reloaded record re-hashes identically to the stored inputHash/outputHash.
    engineInputJson: draft.engineInputJson as unknown as Prisma.InputJsonValue,
    engineOutputJson: draft.engineOutputJson as unknown as Prisma.InputJsonValue,
    inputHash: draft.inputHash,
    outputHash: draft.outputHash,
    gitSha: draft.gitSha,
    buildId: draft.buildId,
  };
}

function isUniqueViolation(e: unknown): e is Prisma.PrismaClientKnownRequestError {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
}

export class DecisionSnapshotRepository {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  /**
   * Idempotently persist an immutable decision snapshot (§10/§11/§16/§26).
   *
   * First write of a key pair ⇒ create. An EXACT retry (same idempotencyKey, same business key, same
   * input/output hashes) ⇒ the existing row is returned, no duplicate. A conflicting reuse ⇒ a typed
   * conflict error, and the historical row is NEVER overwritten:
   *   • same idempotencyKey, different payload ⇒ `IdempotencyConflictError`;
   *   • same businessDecisionKey, different payload ⇒ `BusinessDecisionConflictError`.
   *
   * Race safety rests on the DB unique constraints (not an in-memory check): concurrent identical
   * writes → one insert wins, the loser catches P2002 and resolves to the winner's committed row.
   */
  async persist(draft: DecisionSnapshotDraft): Promise<DecisionSnapshotDto> {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const row = await this.prisma.decisionSnapshot.create({ data: toCreateData(draft) });
        return rowToDto(row);
      } catch (e) {
        if (!isUniqueViolation(e)) throw wrapUnexpected(e, 'persist decision snapshot');
        const resolved = await this.reconcile(draft);
        if (resolved) return resolved;
        // A conflicting row existed at insert time but is now absent (the other writer rolled back);
        // retry the insert once before giving up.
      }
    }
    throw new PersistenceInvariantError(
      `unique violation on persist for idempotencyKey '${draft.idempotencyKey}' but no conflicting ` +
        `row could be resolved after retry`,
    );
  }

  /**
   * Reconcile a unique-violation against the already-committed row. Returns the existing DTO for an
   * exact retry / safe duplicate, throws the appropriate typed conflict for a genuine mismatch, or
   * returns null when neither key resolves (the conflicting writer rolled back — caller may retry).
   */
  private async reconcile(draft: DecisionSnapshotDraft): Promise<DecisionSnapshotDto | null> {
    const byIdem = await this.prisma.decisionSnapshot.findUnique({
      where: { idempotencyKey: draft.idempotencyKey },
    });
    if (byIdem) {
      const sameDecision =
        byIdem.inputHash === draft.inputHash &&
        byIdem.outputHash === draft.outputHash &&
        byIdem.businessDecisionKey === draft.businessDecisionKey;
      if (sameDecision) return rowToDto(byIdem); // exact retry — return existing, no duplicate
      throw new IdempotencyConflictError(
        draft.idempotencyKey,
        byIdem.inputHash,
        byIdem.outputHash,
        draft.inputHash,
        draft.outputHash,
      );
    }
    const byBiz = await this.prisma.decisionSnapshot.findUnique({
      where: { businessDecisionKey: draft.businessDecisionKey },
    });
    if (byBiz) {
      // Same historical decision reached via a different transport key ⇒ safe duplicate (§11).
      if (byBiz.inputHash === draft.inputHash && byBiz.outputHash === draft.outputHash) {
        return rowToDto(byBiz);
      }
      throw new BusinessDecisionConflictError(
        draft.businessDecisionKey,
        byBiz.inputHash,
        byBiz.outputHash,
        draft.inputHash,
        draft.outputHash,
      );
    }
    return null;
  }

  /** Load a snapshot by id, or null if absent. */
  async findById(id: string): Promise<DecisionSnapshotDto | null> {
    const row = await this.prisma.decisionSnapshot
      .findUnique({ where: { id } })
      .catch((e: unknown) => {
        throw wrapUnexpected(e, `find decision snapshot ${id}`);
      });
    return row ? rowToDto(row) : null;
  }

  /** Load a snapshot by transport idempotency key, or null if absent. */
  async findByIdempotencyKey(idempotencyKey: string): Promise<DecisionSnapshotDto | null> {
    const row = await this.prisma.decisionSnapshot.findUnique({ where: { idempotencyKey } });
    return row ? rowToDto(row) : null;
  }

  /** Load a snapshot by domain business decision key, or null if absent. */
  async findByBusinessDecisionKey(
    businessDecisionKey: string,
  ): Promise<DecisionSnapshotDto | null> {
    const row = await this.prisma.decisionSnapshot.findUnique({ where: { businessDecisionKey } });
    return row ? rowToDto(row) : null;
  }
}

function wrapUnexpected(e: unknown, whileDoing: string): PersistenceInvariantError {
  if (e instanceof PersistenceInvariantError) return e;
  const message = e instanceof Error ? e.message : String(e);
  return new PersistenceInvariantError(
    `unexpected database failure while ${whileDoing}: ${message}`,
    {
      cause: e,
    },
  );
}

/** Default repository over the shared client. */
export const decisionSnapshotRepository = new DecisionSnapshotRepository();

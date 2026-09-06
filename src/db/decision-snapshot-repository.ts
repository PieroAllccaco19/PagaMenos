// PagaMenos · src/db — decision persistence repository (§10/§11/§16/§26/§30, P35A-01).
//
// The ONLY write path to the immutable decision tables. It persists a snapshot together with its
// INITIAL durable idempotency receipt atomically, and durably aliases additional transport keys to an
// existing snapshot. Idempotency + business uniqueness are enforced by real unique constraints
// (transport `(operationScope, idempotencyKey)` on receipts; domain `businessDecisionKey` on
// snapshots), reconciled race-safely on conflict. Known PostgreSQL failures are translated into typed
// persistence errors. There is intentionally NO update/delete method; both tables are also immutable
// at the DB level (triggers).
//
// INTERNAL module (P35A-02): imported only by the sanctioned service (and infra/tests), never by
// normal application code — enforced by ESLint + boundary tests.
import { Prisma, type PrismaClient } from '@prisma/client';

import { BusinessDecisionConflictError, PersistenceInvariantError } from '@/persistence/errors';
import {
  assertReceiptMatchesRequest,
  parseDecisionSnapshotDto,
  type AttachAliasArgs,
  type CreateDecisionArgs,
  type DecisionPersistenceStore,
  type DecisionReceiptRecord,
  type DecisionSnapshotDraft,
} from '@/persistence/snapshot';
import type { DecisionSnapshotDto } from '@/persistence/schema';

import { prisma as defaultPrisma } from './client';
import { classifyUniqueViolation, isUniqueViolation, type UniqueConstraintSpec } from './p2002';

/**
 * The exact unique constraints the decision-persistence writes can collide on (Sol Closure 4). Field
 * sets are the Prisma schema field names reported in `P2002.meta.target` (empirically an array). Any
 * P2002 not matching one of these EXACTLY is UNKNOWN → the caller fails closed.
 */
const SNAPSHOT_BUSINESS_KEY: UniqueConstraintSpec = {
  id: 'SNAPSHOT_BUSINESS_KEY',
  fields: ['businessDecisionKey'],
};
const RECEIPT_IDEMPOTENCY: UniqueConstraintSpec = {
  id: 'RECEIPT_IDEMPOTENCY',
  fields: ['operationScope', 'idempotencyKey'],
};

/** Diagnostic emitted when a P2002 reconciliation path is actually ENTERED (Sol Closure 4 catch proof). */
export interface UniqueReconcileEvent {
  op: 'createDecision' | 'attachAliasReceipt';
  constraint: string;
  outcome: 'equivalent-reuse' | 'conflict' | 'retry';
}

type SnapshotRow = Prisma.DecisionSnapshotGetPayload<Record<string, never>>;
type ReceiptRow = Prisma.DecisionIdempotencyReceiptGetPayload<Record<string, never>>;

/** Map a persisted snapshot row to a validated DTO (dates → ISO strings; version-dispatched, §28). */
function rowToDto(row: SnapshotRow): DecisionSnapshotDto {
  return parseDecisionSnapshotDto({
    id: row.id,
    businessDecisionKey: row.businessDecisionKey,
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

function receiptRowToRecord(row: ReceiptRow): DecisionReceiptRecord {
  return {
    operationScope: row.operationScope,
    idempotencyKey: row.idempotencyKey,
    requestHash: row.requestHash,
    decisionSnapshotId: row.decisionSnapshotId,
  };
}

function snapshotCreateData(draft: DecisionSnapshotDraft): Prisma.DecisionSnapshotCreateInput {
  return {
    businessDecisionKey: draft.businessDecisionKey,
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
    // Stored verbatim as JSONB (historical truth). Canonicalization drops undefined keys exactly as
    // JSONB does, so a reloaded record re-hashes identically to the stored inputHash/outputHash.
    engineInputJson: draft.engineInputJson as unknown as Prisma.InputJsonValue,
    engineOutputJson: draft.engineOutputJson as unknown as Prisma.InputJsonValue,
    inputHash: draft.inputHash,
    outputHash: draft.outputHash,
    gitSha: draft.gitSha,
    buildId: draft.buildId,
  };
}

export class DecisionSnapshotRepository implements DecisionPersistenceStore {
  /**
   * @param prisma The client (default: shared).
   * @param onReconcile INTERNAL diagnostic sink invoked when a P2002 reconciliation path is actually
   *   entered — used by tests to PROVE the loser took the intended catch (Sol Closure 4). No-op default;
   *   never affects production behavior.
   */
  constructor(
    private readonly prisma: PrismaClient = defaultPrisma,
    private readonly onReconcile: (event: UniqueReconcileEvent) => void = () => {},
  ) {}

  async findReceipt(
    operationScope: string,
    idempotencyKey: string,
  ): Promise<DecisionReceiptRecord | null> {
    const row = await this.prisma.decisionIdempotencyReceipt.findUnique({
      where: { operationScope_idempotencyKey: { operationScope, idempotencyKey } },
    });
    return row ? receiptRowToRecord(row) : null;
  }

  async findSnapshotById(id: string): Promise<DecisionSnapshotDto | null> {
    const row = await this.prisma.decisionSnapshot
      .findUnique({ where: { id } })
      .catch((e: unknown) => {
        throw wrapUnexpected(e, `find decision snapshot ${id}`);
      });
    return row ? rowToDto(row) : null;
  }

  async findSnapshotByBusinessKey(
    businessDecisionKey: string,
  ): Promise<DecisionSnapshotDto | null> {
    const row = await this.prisma.decisionSnapshot.findUnique({ where: { businessDecisionKey } });
    return row ? rowToDto(row) : null;
  }

  /**
   * Read the receipt, its linked snapshot, and the business-key snapshot in ONE consistent snapshot
   * (Sol Closure 2). Runs at REPEATABLE READ so all statements observe a single MVCC snapshot: because
   * M3.5A commits the decision snapshot and its initial receipt atomically (createDecision, one
   * transaction), this view sees NEITHER or BOTH — never a cross-statement mixed timeline. Read-only.
   */
  async readHistoricalObservation(args: {
    operationScope: string;
    idempotencyKey: string;
    businessDecisionKey: string;
  }): Promise<{
    receipt: DecisionReceiptRecord | null;
    snapshotByReceipt: DecisionSnapshotDto | null;
    snapshotByBusinessKey: DecisionSnapshotDto | null;
  }> {
    const { operationScope, idempotencyKey, businessDecisionKey } = args;
    return this.prisma
      .$transaction(
        async (tx) => {
          const receiptRow = await tx.decisionIdempotencyReceipt.findUnique({
            where: { operationScope_idempotencyKey: { operationScope, idempotencyKey } },
          });
          const receipt = receiptRow ? receiptRowToRecord(receiptRow) : null;
          const bizRow = await tx.decisionSnapshot.findUnique({
            where: { businessDecisionKey },
          });
          const snapshotByBusinessKey = bizRow ? rowToDto(bizRow) : null;
          let snapshotByReceipt: DecisionSnapshotDto | null = null;
          if (receipt) {
            const linked = await tx.decisionSnapshot.findUnique({
              where: { id: receipt.decisionSnapshotId },
            });
            snapshotByReceipt = linked ? rowToDto(linked) : null;
          }
          return { receipt, snapshotByReceipt, snapshotByBusinessKey };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
      )
      .catch((e: unknown) => {
        throw wrapUnexpected(e, `read historical observation for ${businessDecisionKey}`);
      });
  }

  /**
   * Persist a NEW decision: snapshot + its initial receipt atomically (§16/§51). On a unique
   * violation, race-reconcile to the already-committed state: an existing receipt for this key
   * resolves the idempotency (same request → return its snapshot; different → IdempotencyConflict); an
   * existing snapshot for this business key resolves the business decision (same request → alias +
   * return; different → BusinessDecisionConflict). Neither present ⇒ the other writer rolled back ⇒
   * retry once.
   */
  async createDecision(args: CreateDecisionArgs): Promise<DecisionSnapshotDto> {
    const { draft, operationScope, idempotencyKey, requestHash } = args;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const row = await this.prisma.$transaction(async (tx) => {
          const snapshot = await tx.decisionSnapshot.create({ data: snapshotCreateData(draft) });
          await tx.decisionIdempotencyReceipt.create({
            data: { operationScope, idempotencyKey, requestHash, decisionSnapshotId: snapshot.id },
          });
          return snapshot;
        });
        return rowToDto(row);
      } catch (e) {
        if (!isUniqueViolation(e)) throw wrapUnexpected(e, 'persist new decision');
        // Exact classification (Sol Closure 4): the P2002 MUST be one of the two constraints this write
        // can collide on; any other target is an unexpected integrity fault → fail closed.
        const cls = classifyUniqueViolation(e, [SNAPSHOT_BUSINESS_KEY, RECEIPT_IDEMPOTENCY]);
        if (!cls.matched) {
          throw wrapUnexpected(e, `persist new decision (unexpected unique target: ${cls.reason})`);
        }
        const resolved = await this.reconcileCreate(args, cls.id);
        if (resolved) return resolved;
        // Both keys momentarily absent (the conflicting writer rolled back) — retry the insert once.
        this.onReconcile({ op: 'createDecision', constraint: cls.id, outcome: 'retry' });
      }
    }
    throw new PersistenceInvariantError(
      `unique violation persisting decision for idempotencyKey '${idempotencyKey}' but no ` +
        `conflicting row could be resolved after retry`,
    );
  }

  /**
   * Reload-and-prove reconciliation, keyed on the EXACT constraint that fired (Sol Closure 4). Reloads
   * the authoritative winner by the collided scientific identity, proves complete material equivalence,
   * and returns it (equivalent) or raises the exact domain conflict (non-equivalent). `classifiedId` is
   * the constraint the classifier matched; the reconciliation checks BOTH families regardless (they are
   * the only two possible), but the diagnostic is stamped with the constraint that actually fired.
   */
  private async reconcileCreate(
    args: CreateDecisionArgs,
    classifiedId: string,
  ): Promise<DecisionSnapshotDto | null> {
    const { operationScope, idempotencyKey, requestHash, draft } = args;

    // 1. Idempotency: an existing receipt for this transport key wins — but ONLY if it resolves the
    //    SAME request (hash) AND the SAME businessDecisionKey (P35A-07). A concurrent same-key/
    //    same-input/different-business writer must NOT receive the other business's snapshot.
    const receipt = await this.findReceipt(operationScope, idempotencyKey);
    if (receipt) {
      const snapshot = await this.findSnapshotById(receipt.decisionSnapshotId);
      if (!snapshot) {
        throw new PersistenceInvariantError(
          `receipt ${operationScope}/${idempotencyKey} references missing snapshot ${receipt.decisionSnapshotId}`,
        );
      }
      assertReceiptMatchesRequest({
        receipt,
        snapshot,
        requestedBusinessDecisionKey: draft.businessDecisionKey,
        requestedRequestHash: requestHash,
      });
      this.onReconcile({
        op: 'createDecision',
        constraint: classifiedId,
        outcome: 'equivalent-reuse',
      });
      return snapshot; // exact retry / concurrent duplicate — no new snapshot
    }

    // 2. Business decision: an existing snapshot for this business key is the historical truth.
    const existing = await this.findSnapshotByBusinessKey(draft.businessDecisionKey);
    if (existing) {
      // requestHash === inputHash (frozen, §5), so the stored column IS the historical request hash.
      const existingRequestHash = existing.inputHash;
      if (existingRequestHash === requestHash) {
        // Same historical decision reached via a new/racing key ⇒ durably alias, then return it.
        this.onReconcile({
          op: 'createDecision',
          constraint: classifiedId,
          outcome: 'equivalent-reuse',
        });
        return this.attachAliasReceipt({
          operationScope,
          idempotencyKey,
          requestHash,
          snapshot: existing,
        });
      }
      this.onReconcile({ op: 'createDecision', constraint: classifiedId, outcome: 'conflict' });
      throw new BusinessDecisionConflictError(
        draft.businessDecisionKey,
        existingRequestHash,
        requestHash,
      );
    }

    return null;
  }

  /**
   * Durably consume a new transport key as an alias of an existing snapshot (§9/§11). Race-safe: a
   * concurrent identical alias resolves to the same snapshot; a concurrent same-key/different-request
   * alias raises IdempotencyConflict.
   */
  async attachAliasReceipt(args: AttachAliasArgs): Promise<DecisionSnapshotDto> {
    const { operationScope, idempotencyKey, requestHash, snapshot } = args;
    try {
      await this.prisma.decisionIdempotencyReceipt.create({
        data: { operationScope, idempotencyKey, requestHash, decisionSnapshotId: snapshot.id },
      });
      return snapshot;
    } catch (e) {
      if (!isUniqueViolation(e)) throw wrapUnexpected(e, 'attach alias receipt');
      // Exact classification: the only constraint an alias insert can hit is the receipt idempotency
      // pair; any other target is fail-closed (Sol Closure 4).
      const cls = classifyUniqueViolation(e, [RECEIPT_IDEMPOTENCY]);
      if (!cls.matched) {
        throw wrapUnexpected(e, `attach alias receipt (unexpected unique target: ${cls.reason})`);
      }
      const receipt = await this.findReceipt(operationScope, idempotencyKey);
      if (!receipt) throw wrapUnexpected(e, 'attach alias receipt (missing after conflict)');
      this.onReconcile({
        op: 'attachAliasReceipt',
        constraint: cls.id,
        outcome: 'equivalent-reuse',
      });
      // The racing receipt must resolve the SAME request AND the SAME business decision (§4) —
      // verify against the receipt's OWN linked snapshot, not merely the intended alias target.
      const linked = await this.findSnapshotById(receipt.decisionSnapshotId);
      if (!linked) {
        throw new PersistenceInvariantError(
          `receipt ${operationScope}/${idempotencyKey} references missing snapshot ${receipt.decisionSnapshotId}`,
        );
      }
      assertReceiptMatchesRequest({
        receipt,
        snapshot: linked,
        requestedBusinessDecisionKey: snapshot.businessDecisionKey,
        requestedRequestHash: requestHash,
      });
      return snapshot; // concurrent identical alias (same business, same request)
    }
  }
}

function wrapUnexpected(e: unknown, whileDoing: string): PersistenceInvariantError {
  if (e instanceof PersistenceInvariantError) return e;
  const message = e instanceof Error ? e.message : String(e);
  return new PersistenceInvariantError(
    `unexpected database failure while ${whileDoing}: ${message}`,
    { cause: e },
  );
}

/** Default repository over the shared client. */
export const decisionSnapshotRepository = new DecisionSnapshotRepository();

// PagaMenos · src/db — M3.5B-B1 Opportunity Identity (PurchaseOccasion) repository. INTERNAL.
//
// The ONLY write path to the B1 identity tables (`purchase_occasion` and its materialization receipt).
//
// LOCK MODEL. Materialization is INTERNAL PROCESSING over already-durable A2 facts — exactly the
// accepted Case-C `freezeDecisionRequestUnderLock` shape (A2 Sol Closure 5 / A2-DG-06): it collects no
// new participant data, so it takes the PurchaseIntent ROOT lock ONLY and performs NO current-consent
// read. That matters scientifically: if materialization were consent-gated on CURRENT consent, a later
// withdrawal would retroactively erase already-collected opportunities from the denominator, which
// RT-11 D/E forbid (missingness must never make GREEN easier; withdrawal is handled by conservative
// sensitivity, never by deleting outcomes). Taking only the intent root is also deadlock-safe against
// A2 operations that lock `assignment -> intent`: B1 never acquires the assignment after the intent.
//
// IDENTITY MODEL. `id` is DB-generated; the immutable identity facts are READ from the accepted A2
// authorities inside the locked transaction (never accepted from the caller) and are re-proven at
// INSERT by the cross-table coherence trigger. The `UNIQUE(originIntentId)` index is the authoritative
// uniqueness boundary; the in-transaction reload-and-prove is an optimisation on top of it, never a
// substitute (a P2002 that escapes is classified EXACTLY by field set and fails closed).
//
// Owning sanctioned service (module-capability AST test): `services/study-purchase-occasion.ts`.
import { Prisma, type PrismaClient } from '@prisma/client';

import {
  assertOccasionIdentityCoherent,
  B1_OCCASION_SCHEMA_VERSION_V1,
  computeOccasionIdentityDigest,
  normalizeOccasionIdentityFacts,
  PurchaseIntentInvalidatedError,
  PurchaseIntentNotFinalizedError,
  PurchaseIntentOwnershipError,
  PurchaseOccasionCoherenceError,
  PurchaseOccasionConflictError,
  PurchaseOccasionIdempotencyConflictError,
  PurchaseOccasionInvariantError,
  type OccasionIdentityFacts,
} from '@/study';

import { prisma as defaultPrisma } from './client';
import { classifyUniqueViolation, isUniqueViolation, type UniqueConstraintSpec } from './p2002';

type Tx = Prisma.TransactionClient;

function wrapOccasionUnexpected(e: unknown, whileDoing: string): PurchaseOccasionInvariantError {
  if (e instanceof PurchaseOccasionInvariantError) return e;
  const message = e instanceof Error ? e.message : String(e);
  return new PurchaseOccasionInvariantError(
    `unexpected database failure while ${whileDoing}: ${message}`,
    { cause: e },
  );
}

/**
 * The EXACT unique constraints a materialization insert can collide on (accepted Sol Closure 4
 * discipline: classify by field set, never by message substring; an unrecognized target fails closed).
 */
const OCC_ORIGIN_INTENT: UniqueConstraintSpec = {
  id: 'OCC_ORIGIN_INTENT',
  fields: ['originIntentId'],
};
const OCC_ORIGIN_FINALIZATION: UniqueConstraintSpec = {
  id: 'OCC_ORIGIN_FINALIZATION',
  fields: ['originFinalizationId'],
};
const OCC_ORIGIN_CONTEXT: UniqueConstraintSpec = {
  id: 'OCC_ORIGIN_CONTEXT',
  fields: ['originContextVersionId'],
};
const OCC_RECEIPT_SCOPE_KEY: UniqueConstraintSpec = {
  id: 'OCC_RECEIPT_SCOPE_KEY',
  fields: ['operationScope', 'idempotencyKey'],
};
const MATERIALIZE_CONSTRAINTS = [
  OCC_ORIGIN_INTENT,
  OCC_ORIGIN_FINALIZATION,
  OCC_ORIGIN_CONTEXT,
  OCC_RECEIPT_SCOPE_KEY,
] as const;

/** Transport idempotency: a receipt resolves a command ONLY if its frozen requestHash matches. */
function assertReceiptHash(args: {
  operationScope: string;
  idempotencyKey: string;
  existingRequestHash: string;
  attemptedRequestHash: string;
}): void {
  if (args.existingRequestHash !== args.attemptedRequestHash) {
    throw new PurchaseOccasionIdempotencyConflictError(
      args.operationScope,
      args.idempotencyKey,
      args.existingRequestHash,
      args.attemptedRequestHash,
    );
  }
}

// ── Argument / result shapes ─────────────────────────────────────────────────────────────────────
export interface MaterializeOccasionArgs {
  /** Trusted actor assignment (ownership authority); proven against the intent capture token. */
  assignmentId: string;
  /** The origin A2 PurchaseIntent — the SOLE caller-chosen material and the uniqueness boundary. */
  intentId: string;
  operationScope: string;
  idempotencyKey: string;
  requestHash: string;
}

export interface MaterializeOccasionResult {
  occasionId: string;
  resultKind: 'MATERIALIZED' | 'OCCASION_ALIAS';
  /** Transient: true when a same-transport-key replay resolved an existing receipt (no new row). */
  replayed: boolean;
}

/** The durable opportunity identity as downstream (B2/C1) will hold it. Read-only projection. */
export interface PurchaseOccasionRecord {
  occasionId: string;
  occasionSchemaVersion: string;
  originIntentId: string;
  originFinalizationId: string;
  originContextVersionId: string;
  assignmentId: string;
  merchantId: string;
  intendedTransactionAt: string;
  identityDigest: string;
  materializedAt: string;
  createdAt: string;
}

interface OccasionRow {
  id: string;
  occasionSchemaVersion: string;
  originIntentId: string;
  originFinalizationId: string;
  originContextVersionId: string;
  assignmentId: string;
  merchantId: string;
  intendedTransactionAt: Date;
  identityDigest: string;
  materializedAt: Date;
  createdAt: Date;
}

function toRecord(row: OccasionRow): PurchaseOccasionRecord {
  return {
    occasionId: row.id,
    occasionSchemaVersion: row.occasionSchemaVersion,
    originIntentId: row.originIntentId,
    originFinalizationId: row.originFinalizationId,
    originContextVersionId: row.originContextVersionId,
    assignmentId: row.assignmentId,
    merchantId: row.merchantId,
    intendedTransactionAt: row.intendedTransactionAt.toISOString(),
    identityDigest: row.identityDigest,
    materializedAt: row.materializedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

function storedFactsOf(row: OccasionRow): OccasionIdentityFacts {
  return normalizeOccasionIdentityFacts({
    occasionSchemaVersion: row.occasionSchemaVersion,
    originIntentId: row.originIntentId,
    originFinalizationId: row.originFinalizationId,
    originContextVersionId: row.originContextVersionId,
    assignmentId: row.assignmentId,
    merchantId: row.merchantId,
    intendedTransactionAt: row.intendedTransactionAt,
  });
}

export class PurchaseOccasionRepository {
  /**
   * @param now Trusted server clock for `materializedAt`, sampled UNDER the PurchaseIntent root lock.
   *   Injectable for deterministic tests (INTERNAL only — never reachable through a public surface).
   */
  constructor(
    private readonly prisma: PrismaClient = defaultPrisma,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** The owning participant of an assignment (ownership check), or null if absent. */
  async findAssignmentParticipantId(assignmentId: string): Promise<string | null> {
    const row = await this.prisma.experimentAssignment.findUnique({
      where: { id: assignmentId },
      select: { participantId: true },
    });
    return row ? row.participantId : null;
  }

  /**
   * Materialize (or idempotently resolve) THE opportunity identity of one finalized A2 PurchaseIntent.
   *
   * Ordering inside the PurchaseIntent root lock:
   *   1. lock the intent root + prove ownership against its capture token assignment;
   *   2. transport replay — an existing receipt for `(scope, key)` resolves ONLY on an exact
   *      requestHash match, else a typed idempotency conflict;
   *   3. domain alias — an occasion already exists for this intent: prove the origin MATERIALIZED
   *      receipt carries the SAME material request, then append an OCCASION_ALIAS receipt;
   *   4. genuinely NEW identity — re-check the A2 state authoritatively under the lock (finalized, not
   *      invalidated), derive every identity fact from the A2 rows, digest it, and INSERT.
   */
  async materializeOccasion(args: MaterializeOccasionArgs): Promise<MaterializeOccasionResult> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.lockIntentOwnedBy(tx, args.intentId, args.assignmentId);

        // (2) Transport replay: same key + same material request ⇒ the frozen outcome, no new row.
        const receipt = await tx.purchaseOccasionMaterializationReceipt.findUnique({
          where: {
            operationScope_idempotencyKey: {
              operationScope: args.operationScope,
              idempotencyKey: args.idempotencyKey,
            },
          },
        });
        if (receipt) {
          assertReceiptHash({
            operationScope: args.operationScope,
            idempotencyKey: args.idempotencyKey,
            existingRequestHash: receipt.requestHash,
            attemptedRequestHash: args.requestHash,
          });
          // A receipt is a POINTER, never an authority: prove the occasion it resolves to really is
          // this intent's before handing it back. `INSERT` on the receipt table is not (and cannot
          // meaningfully be) forbidden, so a forged receipt row carrying a victim's `(scope, key,
          // requestHash)` but a foreign `occasionId` would otherwise redirect a legitimate retry to
          // somebody else's opportunity. Fail closed instead.
          const resolved = await tx.purchaseOccasion.findUnique({
            where: { id: receipt.occasionId },
            select: { originIntentId: true },
          });
          if (!resolved || resolved.originIntentId !== args.intentId) {
            throw new PurchaseOccasionCoherenceError(
              'ORIGIN_INTENT_MISSING',
              `receipt ${JSON.stringify(args.idempotencyKey)} resolves to occasion ` +
                `${receipt.occasionId}, which does not belong to intent ${args.intentId}`,
            );
          }
          return {
            occasionId: receipt.occasionId,
            resultKind: receipt.resultKind as 'MATERIALIZED' | 'OCCASION_ALIAS',
            replayed: true,
          };
        }

        // (3) Domain alias: one intent already has its identity — a different key never mints a second.
        const existing = await tx.purchaseOccasion.findUnique({
          where: { originIntentId: args.intentId },
          select: { id: true },
        });
        if (existing) {
          const origin = await tx.purchaseOccasionMaterializationReceipt.findFirst({
            where: { occasionId: existing.id, resultKind: 'MATERIALIZED' },
            select: { requestHash: true },
            orderBy: { createdAt: 'asc' },
          });
          if (!origin) {
            throw new PurchaseOccasionInvariantError(
              `occasion ${existing.id} has no MATERIALIZED origin receipt`,
            );
          }
          if (origin.requestHash !== args.requestHash) {
            throw new PurchaseOccasionConflictError(
              'one origin intent cannot yield two materially different occasions',
            );
          }
          await tx.purchaseOccasionMaterializationReceipt.create({
            data: {
              operationScope: args.operationScope,
              idempotencyKey: args.idempotencyKey,
              requestHash: args.requestHash,
              resultKind: 'OCCASION_ALIAS',
              occasionId: existing.id,
            },
          });
          return { occasionId: existing.id, resultKind: 'OCCASION_ALIAS', replayed: false };
        }

        // (4) Genuinely NEW identity — authoritative A2 state re-check UNDER the root lock.
        const derived = await this.deriveIdentityFactsUnderLock(tx, args.intentId);
        const materializedAt = this.now();
        const row = await tx.purchaseOccasion.create({
          data: {
            occasionSchemaVersion: derived.occasionSchemaVersion,
            originIntentId: derived.originIntentId,
            originFinalizationId: derived.originFinalizationId,
            originContextVersionId: derived.originContextVersionId,
            assignmentId: derived.assignmentId,
            merchantId: derived.merchantId,
            intendedTransactionAt: new Date(derived.intendedTransactionAt),
            identityDigest: computeOccasionIdentityDigest(derived),
            materializedAt,
          },
          select: { id: true },
        });
        await tx.purchaseOccasionMaterializationReceipt.create({
          data: {
            operationScope: args.operationScope,
            idempotencyKey: args.idempotencyKey,
            requestHash: args.requestHash,
            resultKind: 'MATERIALIZED',
            occasionId: row.id,
          },
        });
        return { occasionId: row.id, resultKind: 'MATERIALIZED', replayed: false };
      });
    } catch (e) {
      if (!isUniqueViolation(e)) throw e; // a typed domain error thrown inside the tx — propagate
      const cls = classifyUniqueViolation(e, MATERIALIZE_CONSTRAINTS);
      if (!cls.matched) {
        throw wrapOccasionUnexpected(e, `materialize occasion (unexpected unique: ${cls.reason})`);
      }
      // Cross-connection backstop for the DB-enforced uniqueness boundary: the intent already has its
      // one durable identity ⇒ adopt the winner. The alias receipt is intentionally NOT written here:
      // this path is a lost race, not a command that reached the alias branch.
      if (cls.id !== OCC_RECEIPT_SCOPE_KEY.id) {
        const winner = await this.findOccasionByIntent(args.intentId);
        if (winner) {
          return { occasionId: winner.occasionId, resultKind: 'OCCASION_ALIAS', replayed: true };
        }
      }
      // A receipt-key collision (or a winner that vanished) after the in-lock reload proves the
      // serialization assumption was violated — fail closed, never report idempotent success.
      throw wrapOccasionUnexpected(e, `materialize occasion (constraint ${cls.id})`);
    }
  }

  /**
   * Load one durable opportunity identity by its id, re-proving its stored identity facts against the
   * accepted A2 authorities. Fail-closed: a row whose facts drifted is never returned as valid.
   */
  async loadOccasion(occasionId: string): Promise<PurchaseOccasionRecord | null> {
    const row = await this.prisma.purchaseOccasion.findUnique({ where: { id: occasionId } });
    if (!row) return null;
    await this.assertRecordCoherent(row);
    return toRecord(row);
  }

  /** Load the occasion of one origin intent (the uniqueness boundary), with the same coherence proof. */
  async findOccasionByIntent(intentId: string): Promise<PurchaseOccasionRecord | null> {
    const row = await this.prisma.purchaseOccasion.findUnique({
      where: { originIntentId: intentId },
    });
    if (!row) return null;
    await this.assertRecordCoherent(row);
    return toRecord(row);
  }

  // ── internal helpers ──────────────────────────────────────────────────────────────────────────

  /**
   * Lock the PurchaseIntent ROOT row (FOR UPDATE) and verify ownership. This is the SOLE B1
   * serialization point — the same row A2 finalize/invalidate/freeze contend on, so a concurrent
   * invalidation can never interleave between the state re-check and the insert.
   */
  private async lockIntentOwnedBy(tx: Tx, intentId: string, assignmentId: string): Promise<void> {
    const locked = await tx.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT "id" FROM "purchase_intent" WHERE "id" = ${intentId}::uuid FOR UPDATE`,
    );
    if (locked.length === 0) {
      throw new PurchaseOccasionInvariantError(`purchase intent ${intentId} not found`);
    }
    const owner = await tx.purchaseIntent.findUnique({
      where: { id: intentId },
      select: { captureToken: { select: { assignmentId: true } } },
    });
    if (!owner || owner.captureToken.assignmentId !== assignmentId) {
      throw new PurchaseIntentOwnershipError();
    }
  }

  /**
   * Derive the complete immutable identity-fact set from the accepted A2 authorities, under the intent
   * root lock. Rejects an intent A2 excludes: not finalized, or already invalidated (invalidation is
   * reported first — it is the terminal A2 state).
   */
  private async deriveIdentityFactsUnderLock(
    tx: Tx,
    intentId: string,
  ): Promise<OccasionIdentityFacts> {
    const invalidation = await tx.purchaseIntentInvalidation.findUnique({
      where: { invalidatedIntentId: intentId },
      select: { id: true },
    });
    if (invalidation) throw new PurchaseIntentInvalidatedError();

    const finalization = await tx.purchaseIntentFinalization.findUnique({
      where: { intentId },
      select: {
        id: true,
        contextVersion: {
          select: { id: true, intentId: true, merchantId: true, intendedTransactionAt: true },
        },
      },
    });
    if (!finalization) throw new PurchaseIntentNotFinalizedError();
    if (finalization.contextVersion.intentId !== intentId) {
      throw new PurchaseOccasionInvariantError(
        `finalization of intent ${intentId} pins a context version of another intent`,
      );
    }

    const intent = await tx.purchaseIntent.findUnique({
      where: { id: intentId },
      select: { captureToken: { select: { assignmentId: true } } },
    });
    if (!intent) {
      throw new PurchaseOccasionInvariantError(`purchase intent ${intentId} vanished under lock`);
    }

    return normalizeOccasionIdentityFacts({
      occasionSchemaVersion: B1_OCCASION_SCHEMA_VERSION_V1,
      originIntentId: intentId,
      originFinalizationId: finalization.id,
      originContextVersionId: finalization.contextVersion.id,
      assignmentId: intent.captureToken.assignmentId,
      merchantId: finalization.contextVersion.merchantId,
      intendedTransactionAt: finalization.contextVersion.intendedTransactionAt,
    });
  }

  /**
   * Re-prove a durable row against the CURRENT accepted A2 authorities (read path defence-in-depth on
   * top of the insert-time trigger). Deliberately does NOT consider invalidation: an occasion
   * materialized before its origin intent was invalidated stays a valid historical identity — the
   * scientific non-effectiveness is derived downstream from the A2 invalidation row, never here.
   */
  private async assertRecordCoherent(row: OccasionRow): Promise<void> {
    const finalization = await this.prisma.purchaseIntentFinalization.findUnique({
      where: { intentId: row.originIntentId },
      select: {
        id: true,
        contextVersion: {
          select: { id: true, intentId: true, merchantId: true, intendedTransactionAt: true },
        },
      },
    });
    if (!finalization) {
      throw new PurchaseOccasionInvariantError(
        `occasion ${row.id} origin intent ${row.originIntentId} has no finalization`,
      );
    }
    const intent = await this.prisma.purchaseIntent.findUnique({
      where: { id: row.originIntentId },
      select: { captureToken: { select: { assignmentId: true } } },
    });
    if (!intent) {
      throw new PurchaseOccasionInvariantError(
        `occasion ${row.id} origin intent ${row.originIntentId} not found`,
      );
    }
    assertOccasionIdentityCoherent({
      occasionId: row.id,
      stored: storedFactsOf(row),
      storedIdentityDigest: row.identityDigest,
      derived: normalizeOccasionIdentityFacts({
        occasionSchemaVersion: row.occasionSchemaVersion,
        originIntentId: row.originIntentId,
        originFinalizationId: finalization.id,
        originContextVersionId: finalization.contextVersion.id,
        assignmentId: intent.captureToken.assignmentId,
        merchantId: finalization.contextVersion.merchantId,
        intendedTransactionAt: finalization.contextVersion.intendedTransactionAt,
      }),
    });
  }
}

/** Default repository over the shared Prisma client (real system clock). */
export const purchaseOccasionRepository = new PurchaseOccasionRepository();

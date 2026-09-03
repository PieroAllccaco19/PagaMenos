// PagaMenos · src/db — M3.5B-A2 PurchaseIntent lifecycle repository (A2 §5/§8/§9/§10/§20/§24). INTERNAL.
//
// The ONLY write path to the immutable A2 intent tables (capture token, intent, context version,
// eligibility profile version, finalization, invalidation) and their durable idempotency receipts.
// Every lifecycle mutation runs under the correct row lock (the capture token for create; the intent
// for context/finalize; the assignment for profile/invalidate) so monotonic sequence allocation and
// state gating are serialized. Two idempotency layers are enforced by REAL unique constraints and
// reconciled race-safely on P2002:
//   • transport: `(operationScope, idempotencyKey)` on each receipt (exact command replay), and
//   • domain correlation: the client-held capture key (`clientCorrelationNonce` / `contextCaptureKey`
//     / `profileCaptureKey`) — a second transport key bearing the SAME capture key + SAME material
//     ALIASES the existing row; the SAME capture key + DIFFERENT material is a typed conflict.
// The alias-vs-conflict decision compares the attempted requestHash to the ORIGIN receipt's frozen
// requestHash (the CREATED/APPENDED/FINALIZED/INVALIDATED receipt), so it reuses the frozen request
// identity rather than re-deriving material equality. No update/delete; all tables are DB-immutable.
//
// Owning sanctioned service (module-capability AST test): `services/study-purchase-intent.ts`.
import { Prisma, type PrismaClient } from '@prisma/client';

import {
  EligibilityProfileConflictError,
  PurchaseIntentCaptureConflictError,
  PurchaseIntentContextAfterFinalizationError,
  PurchaseIntentContextConflictError,
  PurchaseIntentFinalizationConflictError,
  PurchaseIntentIdempotencyConflictError,
  PurchaseIntentInvalidatedError,
  PurchaseIntentInvalidationConflictError,
  PurchaseIntentInvalidationCycleError,
  PurchaseIntentInvariantError,
  PurchaseIntentOwnershipError,
} from '@/study';
import { canonicalHash } from '@/persistence/hash';

import { prisma as defaultPrisma } from './client';
import { isUniqueViolation } from './study-support';

type Tx = Prisma.TransactionClient;

function wrapPiUnexpected(e: unknown, whileDoing: string): PurchaseIntentInvariantError {
  if (e instanceof PurchaseIntentInvariantError) return e;
  const message = e instanceof Error ? e.message : String(e);
  return new PurchaseIntentInvariantError(
    `unexpected database failure while ${whileDoing}: ${message}`,
    { cause: e },
  );
}

/** Transport idempotency: a receipt resolves a command ONLY if its frozen requestHash matches (A2 §24). */
function assertReceiptHash(args: {
  operationScope: string;
  idempotencyKey: string;
  existingRequestHash: string;
  attemptedRequestHash: string;
}): void {
  if (args.existingRequestHash !== args.attemptedRequestHash) {
    throw new PurchaseIntentIdempotencyConflictError(
      args.operationScope,
      args.idempotencyKey,
      args.existingRequestHash,
      args.attemptedRequestHash,
    );
  }
}

// ── Result shapes ───────────────────────────────────────────────────────────────────────────────
export interface IssueCaptureTokenArgs {
  assignmentId: string;
  clientCorrelationNonce: string;
  intentCaptureKey: string; // server-minted opaque identity (never client-chosen)
  entrySource: Prisma.PurchaseIntentCaptureTokenCreateInput['entrySource'];
}
export interface CaptureTokenRecord {
  id: string;
  intentCaptureKey: string;
  entrySource: string;
  assignmentId: string;
  replayed: boolean;
}

export interface CreatePurchaseIntentArgs {
  assignmentId: string; // trusted actor's assignment (ownership authority)
  intentCaptureKey: string;
  intentType: Prisma.PurchaseIntentCreateInput['intentType'];
  initiatedAt: string; // ISO-8601
  operationScope: string;
  idempotencyKey: string;
  requestHash: string;
}
export interface CreatePurchaseIntentResult {
  intentId: string;
  resultKind: 'CREATED' | 'CAPTURE_ALIAS';
  replayed: boolean;
}

export interface AppendContextArgs {
  assignmentId: string;
  intentId: string;
  contextCaptureKey: string;
  contextSchemaVersion: string;
  merchantId: string;
  signatureKind: Prisma.PurchaseIntentContextVersionCreateInput['signatureKind'];
  intendedTransactionAt: string;
  purchaseSignatureJson: unknown;
  capturedAt: string;
  operationScope: string;
  idempotencyKey: string;
  requestHash: string;
}
export interface AppendContextResult {
  contextVersionId: string;
  contextSeq: number;
  resultKind: 'APPENDED' | 'CONTEXT_ALIAS';
  replayed: boolean;
}

export interface AppendEligibilityProfileArgs {
  assignmentId: string;
  profileCaptureKey: string;
  portfolioSchemaVersion: string;
  portfolioJson: unknown;
  capturedAt: string;
  operationScope: string;
  idempotencyKey: string;
  requestHash: string;
}
export interface AppendEligibilityProfileResult {
  eligibilityProfileVersionId: string;
  profileSeq: number;
  resultKind: 'APPENDED' | 'PROFILE_ALIAS';
  replayed: boolean;
}

export interface FinalizeArgs {
  assignmentId: string;
  intentId: string;
  contextVersionId: string;
  eligibilityProfileVersionId: string;
  finalizedAt: string;
  operationScope: string;
  idempotencyKey: string;
  requestHash: string;
}
export interface FinalizeResult {
  finalizationId: string;
  contextVersionId: string;
  eligibilityProfileVersionId: string;
  resultKind: 'FINALIZED' | 'FINALIZE_ALIAS';
  replayed: boolean;
}

export interface InvalidateArgs {
  assignmentId: string;
  invalidatedIntentId: string;
  replacementIntentId?: string | null;
  reasonCode?: Prisma.PurchaseIntentInvalidationCreateInput['reasonCode'];
  invalidatedAt: string;
  operationScope: string;
  idempotencyKey: string;
  requestHash: string;
}
export interface InvalidateResult {
  invalidationId: string;
  resultKind: 'INVALIDATED' | 'INVALIDATE_ALIAS';
  replayed: boolean;
}

/** The trusted assignment that owns an intent, reached ONLY via its capture token (A2 §5/§20). */
async function assignmentOfIntent(tx: Tx, intentId: string): Promise<string> {
  const intent = await tx.purchaseIntent.findUnique({
    where: { id: intentId },
    select: { captureToken: { select: { assignmentId: true } } },
  });
  if (!intent) {
    throw new PurchaseIntentInvariantError(`purchase intent ${intentId} not found under lock`);
  }
  return intent.captureToken.assignmentId;
}

/** Read-only projection the decision saga needs to freeze a request (A2 §11/§12/§21). */
export interface FinalizedDecisionAuthorities {
  intentId: string;
  assignmentId: string;
  intentType: string;
  entrySource: string;
  invalidated: boolean;
  finalization: {
    finalizationId: string;
    finalizedAt: string;
    contextVersion: {
      id: string;
      contextSchemaVersion: string;
      merchantId: string;
      signatureKind: string;
      intendedTransactionAt: string;
      purchaseSignatureJson: unknown;
    };
    eligibilityProfileVersion: {
      id: string;
      portfolioSchemaVersion: string;
      portfolioJson: unknown;
    };
  } | null;
}

export class PurchaseIntentRepository {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  /** The owning participant of an assignment (A2 §5/§7 ownership check), or null if absent. */
  async findAssignmentParticipantId(assignmentId: string): Promise<string | null> {
    const row = await this.prisma.experimentAssignment.findUnique({
      where: { id: assignmentId },
      select: { participantId: true },
    });
    return row ? row.participantId : null;
  }

  /**
   * Load the finalized decision authorities for an intent (A2 §11/§21), read-only. Returns the pinned
   * context + eligibility-profile versions (the exact frozen authorities) plus invalidation state, or a
   * null finalization when the intent is not finalized. No lock — the finalization tables are immutable.
   */
  async loadFinalizedDecisionAuthorities(
    intentId: string,
  ): Promise<FinalizedDecisionAuthorities | null> {
    const intent = await this.prisma.purchaseIntent.findUnique({
      where: { id: intentId },
      select: {
        id: true,
        intentType: true,
        captureToken: { select: { assignmentId: true, entrySource: true } },
        invalidationAsInvalidated: { select: { id: true } },
        finalization: {
          select: {
            id: true,
            finalizedAt: true,
            contextVersion: {
              select: {
                id: true,
                contextSchemaVersion: true,
                merchantId: true,
                signatureKind: true,
                intendedTransactionAt: true,
                purchaseSignatureJson: true,
              },
            },
            eligibilityProfileVersion: {
              select: { id: true, portfolioSchemaVersion: true, portfolioJson: true },
            },
          },
        },
      },
    });
    if (!intent) return null;
    return {
      intentId: intent.id,
      assignmentId: intent.captureToken.assignmentId,
      intentType: intent.intentType,
      entrySource: intent.captureToken.entrySource,
      invalidated: intent.invalidationAsInvalidated !== null,
      finalization: intent.finalization
        ? {
            finalizationId: intent.finalization.id,
            finalizedAt: intent.finalization.finalizedAt.toISOString(),
            contextVersion: {
              id: intent.finalization.contextVersion.id,
              contextSchemaVersion: intent.finalization.contextVersion.contextSchemaVersion,
              merchantId: intent.finalization.contextVersion.merchantId,
              signatureKind: intent.finalization.contextVersion.signatureKind,
              intendedTransactionAt:
                intent.finalization.contextVersion.intendedTransactionAt.toISOString(),
              purchaseSignatureJson: intent.finalization.contextVersion.purchaseSignatureJson,
            },
            eligibilityProfileVersion: {
              id: intent.finalization.eligibilityProfileVersion.id,
              portfolioSchemaVersion:
                intent.finalization.eligibilityProfileVersion.portfolioSchemaVersion,
              portfolioJson: intent.finalization.eligibilityProfileVersion.portfolioJson,
            },
          }
        : null,
    };
  }

  /**
   * Issue (or idempotently return) a durable capture token for a trusted assignment (A2 §5). Idempotent
   * on `(assignmentId, clientCorrelationNonce)`: the FIRST resolution is authoritative forever — a
   * re-presented nonce returns the existing token verbatim (its intentCaptureKey + immutable entrySource).
   */
  async issueCaptureToken(args: IssueCaptureTokenArgs): Promise<CaptureTokenRecord> {
    try {
      const row = await this.prisma.purchaseIntentCaptureToken.create({
        data: {
          assignmentId: args.assignmentId,
          clientCorrelationNonce: args.clientCorrelationNonce,
          intentCaptureKey: args.intentCaptureKey,
          entrySource: args.entrySource,
        },
      });
      return {
        id: row.id,
        intentCaptureKey: row.intentCaptureKey,
        entrySource: row.entrySource,
        assignmentId: row.assignmentId,
        replayed: false,
      };
    } catch (e) {
      if (!isUniqueViolation(e)) throw wrapPiUnexpected(e, 'issue capture token');
      const existing = await this.prisma.purchaseIntentCaptureToken.findUnique({
        where: {
          assignmentId_clientCorrelationNonce: {
            assignmentId: args.assignmentId,
            clientCorrelationNonce: args.clientCorrelationNonce,
          },
        },
      });
      if (!existing) throw wrapPiUnexpected(e, 'issue capture token (missing after conflict)');
      return {
        id: existing.id,
        intentCaptureKey: existing.intentCaptureKey,
        entrySource: existing.entrySource,
        assignmentId: existing.assignmentId,
        replayed: true,
      };
    }
  }

  /**
   * Create the immutable PurchaseIntent for a capture token (A2 §5.2/§20). Under the capture-token row
   * lock: transport replay via the create receipt; a second create on the SAME token ALIASES the existing
   * intent iff the frozen create requestHash matches (else CaptureConflict). One token → at most one
   * intent (DB unique + lock).
   */
  async createPurchaseIntent(args: CreatePurchaseIntentArgs): Promise<CreatePurchaseIntentResult> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const locked = await tx.$queryRaw<Array<{ id: string; assignment_id: string }>>(
          Prisma.sql`SELECT "id", "assignmentId" AS assignment_id FROM "purchase_intent_capture_token" WHERE "intentCaptureKey" = ${args.intentCaptureKey} FOR UPDATE`,
        );
        const token = locked[0];
        if (!token) {
          throw new PurchaseIntentInvariantError(
            `create references unknown capture key ${JSON.stringify(args.intentCaptureKey)}`,
          );
        }
        if (token.assignment_id !== args.assignmentId) throw new PurchaseIntentOwnershipError();

        const receipt = await tx.purchaseIntentCreateReceipt.findUnique({
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
          return {
            intentId: receipt.intentId,
            resultKind: receipt.resultKind as 'CREATED' | 'CAPTURE_ALIAS',
            replayed: true,
          };
        }

        // A different transport key: does the token already carry an intent? (one capture → one intent)
        const existingIntent = await tx.purchaseIntent.findUnique({
          where: { captureTokenId: token.id },
          select: { id: true },
        });
        if (existingIntent) {
          const origin = await tx.purchaseIntentCreateReceipt.findFirst({
            where: { intentId: existingIntent.id, resultKind: 'CREATED' },
            select: { requestHash: true },
          });
          if (!origin) {
            throw new PurchaseIntentInvariantError(
              `intent ${existingIntent.id} has no CREATED origin receipt`,
            );
          }
          if (origin.requestHash !== args.requestHash) {
            throw new PurchaseIntentCaptureConflictError(
              'one capture cannot yield two materially different intents',
            );
          }
          await tx.purchaseIntentCreateReceipt.create({
            data: {
              operationScope: args.operationScope,
              idempotencyKey: args.idempotencyKey,
              requestHash: args.requestHash,
              resultKind: 'CAPTURE_ALIAS',
              intentId: existingIntent.id,
            },
          });
          return { intentId: existingIntent.id, resultKind: 'CAPTURE_ALIAS', replayed: false };
        }

        const intent = await tx.purchaseIntent.create({
          data: {
            captureTokenId: token.id,
            intentType: args.intentType,
            initiatedAt: new Date(args.initiatedAt),
          },
        });
        await tx.purchaseIntentCreateReceipt.create({
          data: {
            operationScope: args.operationScope,
            idempotencyKey: args.idempotencyKey,
            requestHash: args.requestHash,
            resultKind: 'CREATED',
            intentId: intent.id,
          },
        });
        return { intentId: intent.id, resultKind: 'CREATED', replayed: false };
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError || !(e instanceof Error)) {
        throw wrapPiUnexpected(e, 'create purchase intent');
      }
      throw e;
    }
  }

  /**
   * Append a corrigible context version (A2 §8). Under the intent row lock: forbidden once finalized or
   * invalidated; transport replay via receipt; a repeated contextCaptureKey ALIASES iff the frozen
   * append requestHash matches (else ContextConflict); otherwise a fresh contextSeq is allocated.
   */
  async appendContext(args: AppendContextArgs): Promise<AppendContextResult> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.lockIntent(tx, args.intentId, args.assignmentId);

        const receipt = await tx.purchaseIntentContextCommandReceipt.findUnique({
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
          const cv = await tx.purchaseIntentContextVersion.findUniqueOrThrow({
            where: { id: receipt.contextVersionId },
            select: { id: true, contextSeq: true },
          });
          return {
            contextVersionId: cv.id,
            contextSeq: cv.contextSeq,
            resultKind: receipt.resultKind as 'APPENDED' | 'CONTEXT_ALIAS',
            replayed: true,
          };
        }

        // State gates (checked UNDER the lock): finalized ⇒ no append; invalidated ⇒ no append.
        const [finalization, invalidation] = await Promise.all([
          tx.purchaseIntentFinalization.findUnique({
            where: { intentId: args.intentId },
            select: { id: true },
          }),
          tx.purchaseIntentInvalidation.findUnique({
            where: { invalidatedIntentId: args.intentId },
            select: { id: true },
          }),
        ]);
        if (finalization) throw new PurchaseIntentContextAfterFinalizationError();
        if (invalidation) throw new PurchaseIntentInvalidatedError();

        const priorSameKey = await tx.purchaseIntentContextVersion.findUnique({
          where: {
            intentId_contextCaptureKey: {
              intentId: args.intentId,
              contextCaptureKey: args.contextCaptureKey,
            },
          },
          select: { id: true, contextSeq: true },
        });
        if (priorSameKey) {
          const origin = await tx.purchaseIntentContextCommandReceipt.findFirst({
            where: { contextVersionId: priorSameKey.id, resultKind: 'APPENDED' },
            select: { requestHash: true },
          });
          if (!origin) {
            throw new PurchaseIntentInvariantError(
              `context version ${priorSameKey.id} has no APPENDED origin receipt`,
            );
          }
          if (origin.requestHash !== args.requestHash) {
            throw new PurchaseIntentContextConflictError(
              'context capture key reused for a materially different context payload',
            );
          }
          await tx.purchaseIntentContextCommandReceipt.create({
            data: {
              operationScope: args.operationScope,
              idempotencyKey: args.idempotencyKey,
              requestHash: args.requestHash,
              resultKind: 'CONTEXT_ALIAS',
              contextVersionId: priorSameKey.id,
            },
          });
          return {
            contextVersionId: priorSameKey.id,
            contextSeq: priorSameKey.contextSeq,
            resultKind: 'CONTEXT_ALIAS',
            replayed: false,
          };
        }

        const agg = await tx.purchaseIntentContextVersion.aggregate({
          where: { intentId: args.intentId },
          _max: { contextSeq: true },
        });
        const contextSeq = (agg._max.contextSeq ?? 0) + 1;
        const cv = await tx.purchaseIntentContextVersion.create({
          data: {
            intentId: args.intentId,
            contextSeq,
            contextCaptureKey: args.contextCaptureKey,
            contextSchemaVersion: args.contextSchemaVersion,
            merchantId: args.merchantId,
            signatureKind: args.signatureKind,
            intendedTransactionAt: new Date(args.intendedTransactionAt),
            purchaseSignatureJson: args.purchaseSignatureJson as Prisma.InputJsonValue,
            capturedAt: new Date(args.capturedAt),
          },
        });
        await tx.purchaseIntentContextCommandReceipt.create({
          data: {
            operationScope: args.operationScope,
            idempotencyKey: args.idempotencyKey,
            requestHash: args.requestHash,
            resultKind: 'APPENDED',
            contextVersionId: cv.id,
          },
        });
        return {
          contextVersionId: cv.id,
          contextSeq,
          resultKind: 'APPENDED',
          replayed: false,
        };
      });
    } catch (e) {
      if (isUniqueViolation(e)) throw wrapPiUnexpected(e, 'append purchase-intent context');
      throw e;
    }
  }

  /**
   * Append an assignment-scoped eligibility profile version (A2 §10). Under the assignment row lock:
   * transport replay; a repeated profileCaptureKey ALIASES iff the frozen append requestHash matches
   * (else EligibilityProfileConflict); otherwise a fresh profileSeq is allocated.
   */
  async appendEligibilityProfile(
    args: AppendEligibilityProfileArgs,
  ): Promise<AppendEligibilityProfileResult> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.lockAssignment(tx, args.assignmentId);

        const receipt = await tx.eligibilityProfileCommandReceipt.findUnique({
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
          const pv = await tx.eligibilityProfileVersion.findUniqueOrThrow({
            where: { id: receipt.eligibilityProfileVersionId },
            select: { id: true, profileSeq: true },
          });
          return {
            eligibilityProfileVersionId: pv.id,
            profileSeq: pv.profileSeq,
            resultKind: receipt.resultKind as 'APPENDED' | 'PROFILE_ALIAS',
            replayed: true,
          };
        }

        const priorSameKey = await tx.eligibilityProfileVersion.findUnique({
          where: {
            assignmentId_profileCaptureKey: {
              assignmentId: args.assignmentId,
              profileCaptureKey: args.profileCaptureKey,
            },
          },
          select: { id: true, profileSeq: true },
        });
        if (priorSameKey) {
          const origin = await tx.eligibilityProfileCommandReceipt.findFirst({
            where: { eligibilityProfileVersionId: priorSameKey.id, resultKind: 'APPENDED' },
            select: { requestHash: true },
          });
          if (!origin) {
            throw new PurchaseIntentInvariantError(
              `eligibility profile ${priorSameKey.id} has no APPENDED origin receipt`,
            );
          }
          if (origin.requestHash !== args.requestHash) {
            throw new EligibilityProfileConflictError(
              'profile capture key reused for a materially different portfolio',
            );
          }
          await tx.eligibilityProfileCommandReceipt.create({
            data: {
              operationScope: args.operationScope,
              idempotencyKey: args.idempotencyKey,
              requestHash: args.requestHash,
              resultKind: 'PROFILE_ALIAS',
              eligibilityProfileVersionId: priorSameKey.id,
            },
          });
          return {
            eligibilityProfileVersionId: priorSameKey.id,
            profileSeq: priorSameKey.profileSeq,
            resultKind: 'PROFILE_ALIAS',
            replayed: false,
          };
        }

        const agg = await tx.eligibilityProfileVersion.aggregate({
          where: { assignmentId: args.assignmentId },
          _max: { profileSeq: true },
        });
        const profileSeq = (agg._max.profileSeq ?? 0) + 1;
        const pv = await tx.eligibilityProfileVersion.create({
          data: {
            assignmentId: args.assignmentId,
            profileSeq,
            profileCaptureKey: args.profileCaptureKey,
            portfolioSchemaVersion: args.portfolioSchemaVersion,
            portfolioJson: args.portfolioJson as Prisma.InputJsonValue,
            capturedAt: new Date(args.capturedAt),
          },
        });
        await tx.eligibilityProfileCommandReceipt.create({
          data: {
            operationScope: args.operationScope,
            idempotencyKey: args.idempotencyKey,
            requestHash: args.requestHash,
            resultKind: 'APPENDED',
            eligibilityProfileVersionId: pv.id,
          },
        });
        return {
          eligibilityProfileVersionId: pv.id,
          profileSeq,
          resultKind: 'APPENDED',
          replayed: false,
        };
      });
    } catch (e) {
      if (isUniqueViolation(e)) throw wrapPiUnexpected(e, 'append eligibility profile');
      throw e;
    }
  }

  /**
   * Finalize an intent (A2 §9): pin the exact context + eligibility profile versions. Under the intent
   * row lock: forbidden if invalidated; transport replay; a second finalize ALIASES iff it pins the
   * SAME (context, profile) — a different pin is FinalizationConflict. Cross-assignment coherence of the
   * pinned versions is additionally enforced by an insert-time DB trigger.
   */
  async finalize(args: FinalizeArgs): Promise<FinalizeResult> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.lockIntent(tx, args.intentId, args.assignmentId);

        const receipt = await tx.purchaseIntentFinalizationReceipt.findUnique({
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
          const f = await tx.purchaseIntentFinalization.findUniqueOrThrow({
            where: { id: receipt.finalizationId },
            select: { id: true, contextVersionId: true, eligibilityProfileVersionId: true },
          });
          return {
            finalizationId: f.id,
            contextVersionId: f.contextVersionId,
            eligibilityProfileVersionId: f.eligibilityProfileVersionId,
            resultKind: receipt.resultKind as 'FINALIZED' | 'FINALIZE_ALIAS',
            replayed: true,
          };
        }

        const invalidation = await tx.purchaseIntentInvalidation.findUnique({
          where: { invalidatedIntentId: args.intentId },
          select: { id: true },
        });
        if (invalidation) throw new PurchaseIntentInvalidatedError();

        const existing = await tx.purchaseIntentFinalization.findUnique({
          where: { intentId: args.intentId },
          select: { id: true, contextVersionId: true, eligibilityProfileVersionId: true },
        });
        if (existing) {
          const same =
            existing.contextVersionId === args.contextVersionId &&
            existing.eligibilityProfileVersionId === args.eligibilityProfileVersionId;
          if (!same) {
            throw new PurchaseIntentFinalizationConflictError(
              'finalization re-pointed to a different context/eligibility version',
            );
          }
          await tx.purchaseIntentFinalizationReceipt.create({
            data: {
              operationScope: args.operationScope,
              idempotencyKey: args.idempotencyKey,
              requestHash: args.requestHash,
              resultKind: 'FINALIZE_ALIAS',
              finalizationId: existing.id,
            },
          });
          return {
            finalizationId: existing.id,
            contextVersionId: existing.contextVersionId,
            eligibilityProfileVersionId: existing.eligibilityProfileVersionId,
            resultKind: 'FINALIZE_ALIAS',
            replayed: false,
          };
        }

        // Verify the pinned versions belong to this intent / its assignment (defense-in-depth; the DB
        // trigger is the hard guarantee).
        await this.assertPinBelongs(tx, args);

        const f = await tx.purchaseIntentFinalization.create({
          data: {
            intentId: args.intentId,
            contextVersionId: args.contextVersionId,
            eligibilityProfileVersionId: args.eligibilityProfileVersionId,
            finalizedAt: new Date(args.finalizedAt),
          },
        });
        await tx.purchaseIntentFinalizationReceipt.create({
          data: {
            operationScope: args.operationScope,
            idempotencyKey: args.idempotencyKey,
            requestHash: args.requestHash,
            resultKind: 'FINALIZED',
            finalizationId: f.id,
          },
        });
        return {
          finalizationId: f.id,
          contextVersionId: args.contextVersionId,
          eligibilityProfileVersionId: args.eligibilityProfileVersionId,
          resultKind: 'FINALIZED',
          replayed: false,
        };
      });
    } catch (e) {
      if (isUniqueViolation(e)) throw wrapPiUnexpected(e, 'finalize purchase intent');
      throw e;
    }
  }

  /**
   * Invalidate an intent (A2 §10/§23). Under the assignment row lock: transport replay; a second
   * invalidation of the same intent ALIASES iff the frozen requestHash matches (else
   * InvalidationConflict). A replacement must live in the SAME assignment and must not create a cycle
   * or self-link (checked here by an acyclic walk; also enforced by CHECK + trigger).
   */
  async invalidate(args: InvalidateArgs): Promise<InvalidateResult> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.lockAssignment(tx, args.assignmentId);
        // The invalidated intent must belong to the locked assignment.
        const ownerAssignment = await assignmentOfIntent(tx, args.invalidatedIntentId);
        if (ownerAssignment !== args.assignmentId) throw new PurchaseIntentOwnershipError();

        const receipt = await tx.purchaseIntentInvalidationReceipt.findUnique({
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
          return {
            invalidationId: receipt.invalidationId,
            resultKind: receipt.resultKind as 'INVALIDATED' | 'INVALIDATE_ALIAS',
            replayed: true,
          };
        }

        const existing = await tx.purchaseIntentInvalidation.findUnique({
          where: { invalidatedIntentId: args.invalidatedIntentId },
          select: { id: true },
        });
        if (existing) {
          const origin = await tx.purchaseIntentInvalidationReceipt.findFirst({
            where: { invalidationId: existing.id, resultKind: 'INVALIDATED' },
            select: { requestHash: true },
          });
          if (!origin) {
            throw new PurchaseIntentInvariantError(
              `invalidation ${existing.id} has no INVALIDATED origin receipt`,
            );
          }
          if (origin.requestHash !== args.requestHash) {
            throw new PurchaseIntentInvalidationConflictError(
              'intent already invalidated with a materially different reason/replacement',
            );
          }
          await tx.purchaseIntentInvalidationReceipt.create({
            data: {
              operationScope: args.operationScope,
              idempotencyKey: args.idempotencyKey,
              requestHash: args.requestHash,
              resultKind: 'INVALIDATE_ALIAS',
              invalidationId: existing.id,
            },
          });
          return { invalidationId: existing.id, resultKind: 'INVALIDATE_ALIAS', replayed: false };
        }

        const replacementId = args.replacementIntentId ?? null;
        if (replacementId !== null) {
          if (replacementId === args.invalidatedIntentId) {
            throw new PurchaseIntentInvalidationCycleError('an intent cannot replace itself');
          }
          const replacementAssignment = await assignmentOfIntent(tx, replacementId);
          if (replacementAssignment !== args.assignmentId) {
            throw new PurchaseIntentInvalidationCycleError(
              'replacement intent belongs to a different assignment',
            );
          }
          await this.assertNoInvalidationCycle(tx, args.invalidatedIntentId, replacementId);
        }

        const inv = await tx.purchaseIntentInvalidation.create({
          data: {
            invalidatedIntentId: args.invalidatedIntentId,
            replacementIntentId: replacementId,
            invalidatedAt: new Date(args.invalidatedAt),
            reasonCode: args.reasonCode ?? null,
          },
        });
        await tx.purchaseIntentInvalidationReceipt.create({
          data: {
            operationScope: args.operationScope,
            idempotencyKey: args.idempotencyKey,
            requestHash: args.requestHash,
            resultKind: 'INVALIDATED',
            invalidationId: inv.id,
          },
        });
        return { invalidationId: inv.id, resultKind: 'INVALIDATED', replayed: false };
      });
    } catch (e) {
      if (isUniqueViolation(e)) throw wrapPiUnexpected(e, 'invalidate purchase intent');
      throw e;
    }
  }

  // ── internal helpers ────────────────────────────────────────────────────────────────────────────

  private async lockIntent(tx: Tx, intentId: string, assignmentId: string): Promise<void> {
    const locked = await tx.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT "id" FROM "purchase_intent" WHERE "id" = ${intentId}::uuid FOR UPDATE`,
    );
    if (locked.length === 0) {
      throw new PurchaseIntentInvariantError(`purchase intent ${intentId} not found`);
    }
    const owner = await assignmentOfIntent(tx, intentId);
    if (owner !== assignmentId) throw new PurchaseIntentOwnershipError();
  }

  private async lockAssignment(tx: Tx, assignmentId: string): Promise<void> {
    const locked = await tx.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT "id" FROM "experiment_assignment" WHERE "id" = ${assignmentId}::uuid FOR UPDATE`,
    );
    if (locked.length === 0) {
      throw new PurchaseIntentInvariantError(`unknown assignment ${assignmentId}`);
    }
  }

  /** Defense-in-depth: the pinned context/profile must belong to this intent / its assignment. */
  private async assertPinBelongs(tx: Tx, args: FinalizeArgs): Promise<void> {
    const cv = await tx.purchaseIntentContextVersion.findUnique({
      where: { id: args.contextVersionId },
      select: { intentId: true },
    });
    if (!cv || cv.intentId !== args.intentId) {
      throw new PurchaseIntentFinalizationConflictError(
        'pinned context version does not belong to the intent',
      );
    }
    const pv = await tx.eligibilityProfileVersion.findUnique({
      where: { id: args.eligibilityProfileVersionId },
      select: { assignmentId: true },
    });
    if (!pv || pv.assignmentId !== args.assignmentId) {
      throw new PurchaseIntentFinalizationConflictError(
        'pinned eligibility profile does not belong to the intent assignment',
      );
    }
  }

  /**
   * Walk the replacement chain from `replacementId`; a back-reference to `invalidatedIntentId` is a
   * cycle (A2 §23). Bounded by the finite invalidation graph in the assignment.
   */
  private async assertNoInvalidationCycle(
    tx: Tx,
    invalidatedIntentId: string,
    replacementId: string,
  ): Promise<void> {
    const seen = new Set<string>([invalidatedIntentId]);
    let cursor: string | null = replacementId;
    while (cursor !== null) {
      if (seen.has(cursor)) {
        throw new PurchaseIntentInvalidationCycleError(
          'invalidation replacement chain would form a cycle',
        );
      }
      seen.add(cursor);
      const next: { replacementIntentId: string | null } | null =
        await tx.purchaseIntentInvalidation.findUnique({
          where: { invalidatedIntentId: cursor },
          select: { replacementIntentId: true },
        });
      cursor = next?.replacementIntentId ?? null;
    }
  }
}

/** Deterministic material fingerprint helper (exported for the owning service's request-hash checks). */
export function purchaseIntentMaterialHash(material: unknown): string {
  return canonicalHash(material);
}

/** Default repository over the shared Prisma client. */
export const purchaseIntentRepository = new PurchaseIntentRepository();

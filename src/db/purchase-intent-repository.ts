// PagaMenos · src/db — M3.5B-A2 PurchaseIntent lifecycle repository (A2 §5–§10/§21/§24). INTERNAL.
//
// The ONLY write path to the immutable A2 intent tables (capture token, intent, context version,
// eligibility-profile version, finalization, invalidation) and their durable idempotency receipts.
//
// LOCK ORDER (A2 §21, Sol Finding 8): every intent-scoped mutation acquires the authoritative
// ExperimentAssignment row FIRST (`SELECT … FOR UPDATE`), then — for operations that transition an
// intent — the PurchaseIntent root row. This single global order (assignment → intent) (a) establishes
// the authoritative assignment identity, (b) makes the assignment row the shared serialization point
// between an A2 fact creation and an A1 consent change (Consent Model A, §7), and (c) forces finalize
// and invalidate onto the SAME intent lock so they can never both commit against one intent.
//
// CONSENT MODEL A (A2 §7, Sol Finding 2): every operation that creates a NEW scientific fact samples
// the trusted collection time UNDER the assignment lock and, before inserting, evaluates the accepted
// A1 authority `wasCollectionAuthorizedAtKnownTime` over the consent events read in the same locked
// transaction. Because A1 consent writes also lock the assignment, a concurrent withdrawal cannot
// interleave: it either commits before (A2 sees closed consent → reject) or after (A2's sampled time
// was authorized). Caller-supplied time is never used; historical consent is never rewritten by a later
// snapshot. Transport replays / domain-key aliases create no new fact and therefore skip the check.
//
// TWO idempotency layers (transport receipt `(operationScope, idempotencyKey)`; client capture key)
// are enforced by REAL unique constraints and reconciled by explicit reload-and-prove keyed on the
// EXACT constraint that fired (never a generic P2002 catch-all). No update/delete; DB-immutable.
//
// Owning sanctioned service (module-capability AST test): `services/study-purchase-intent.ts`
// (write ops) and, read-only, `services/study-intent-decision.ts` (finalized-authorities load).
import { Prisma, type PrismaClient } from '@prisma/client';

import {
  EligibilityProfileConflictError,
  PurchaseIntentCaptureConflictError,
  PurchaseIntentConsentNotAuthorizedError,
  PurchaseIntentContextAfterFinalizationError,
  PurchaseIntentContextConflictError,
  PurchaseIntentFinalizationConflictError,
  PurchaseIntentIdempotencyConflictError,
  PurchaseIntentInvalidatedError,
  PurchaseIntentInvalidationConflictError,
  PurchaseIntentInvalidationCycleError,
  PurchaseIntentInvariantError,
  PurchaseIntentOwnershipError,
  wasCollectionAuthorizedAtKnownTime,
} from '@/study';

import { prisma as defaultPrisma } from './client';
import { isUniqueViolation, readConsentAuthorizationFacts } from './study-support';

type Tx = Prisma.TransactionClient;

function wrapPiUnexpected(e: unknown, whileDoing: string): PurchaseIntentInvariantError {
  if (e instanceof PurchaseIntentInvariantError) return e;
  const message = e instanceof Error ? e.message : String(e);
  return new PurchaseIntentInvariantError(
    `unexpected database failure while ${whileDoing}: ${message}`,
    { cause: e },
  );
}

/** The unique constraint(s) a P2002 fired on (Prisma reports the index fields in `meta.target`). */
function violatedConstraint(e: unknown): string {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
    const target = (e.meta as { target?: unknown } | undefined)?.target;
    if (Array.isArray(target)) return target.join(',');
    if (typeof target === 'string') return target;
  }
  return '';
}
const hitConstraint = (e: unknown, ...fields: string[]): boolean => {
  const c = violatedConstraint(e);
  return fields.some((f) => c.includes(f));
};

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
  operationScope: string;
  idempotencyKey: string;
  requestHash: string;
}
export interface InvalidateResult {
  invalidationId: string;
  resultKind: 'INVALIDATED' | 'INVALIDATE_ALIAS';
  replayed: boolean;
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

/** The owning assignment of an intent, reached ONLY via its capture token (A2 §5/§20). */
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

export class PurchaseIntentRepository {
  /**
   * @param now Trusted server clock, sampled UNDER the row lock for every stored `*At` fact and for the
   *   consent collection instant. Injectable for deterministic tests (INTERNAL only — never reachable
   *   through a public participant-facing surface, Sol Finding 1). Defaults to the real system clock.
   */
  constructor(
    private readonly prisma: PrismaClient = defaultPrisma,
    private readonly now: () => Date = () => new Date(),
  ) {}

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
   * The assignment row is locked so a concurrent identical issuance converges on one token.
   */
  async issueCaptureToken(args: IssueCaptureTokenArgs): Promise<CaptureTokenRecord> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.lockAssignment(tx, args.assignmentId);
        const existing = await tx.purchaseIntentCaptureToken.findUnique({
          where: {
            assignmentId_clientCorrelationNonce: {
              assignmentId: args.assignmentId,
              clientCorrelationNonce: args.clientCorrelationNonce,
            },
          },
        });
        if (existing) {
          return {
            id: existing.id,
            intentCaptureKey: existing.intentCaptureKey,
            entrySource: existing.entrySource,
            assignmentId: existing.assignmentId,
            replayed: true,
          };
        }
        const row = await tx.purchaseIntentCaptureToken.create({
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
      });
    } catch (e) {
      if (!isUniqueViolation(e)) throw wrapPiUnexpected(e, 'issue capture token');
      // Reload-and-prove on the EXACT nonce/key constraints.
      const existing = await this.prisma.purchaseIntentCaptureToken.findUnique({
        where: {
          assignmentId_clientCorrelationNonce: {
            assignmentId: args.assignmentId,
            clientCorrelationNonce: args.clientCorrelationNonce,
          },
        },
      });
      if (existing) {
        return {
          id: existing.id,
          intentCaptureKey: existing.intentCaptureKey,
          entrySource: existing.entrySource,
          assignmentId: existing.assignmentId,
          replayed: true,
        };
      }
      throw wrapPiUnexpected(e, 'issue capture token (missing after conflict)');
    }
  }

  /**
   * Create the immutable PurchaseIntent for a capture token (A2 §5.2/§20). Assignment-first lock; a
   * NEW intent is consent-gated (Consent Model A). Transport replay via the create receipt; a second
   * create on the SAME token ALIASES the existing intent iff the frozen create requestHash matches
   * (else CaptureConflict). One token → at most one intent (DB unique + assignment lock serialization).
   */
  async createPurchaseIntent(args: CreatePurchaseIntentArgs): Promise<CreatePurchaseIntentResult> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.lockAssignment(tx, args.assignmentId);

        const token = await tx.purchaseIntentCaptureToken.findUnique({
          where: { intentCaptureKey: args.intentCaptureKey },
          select: { id: true, assignmentId: true },
        });
        if (!token) {
          throw new PurchaseIntentInvariantError(
            `create references unknown capture key ${JSON.stringify(args.intentCaptureKey)}`,
          );
        }
        if (token.assignmentId !== args.assignmentId) throw new PurchaseIntentOwnershipError();

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

        // Genuinely new fact → Consent Model A gate under the assignment lock.
        const collectionAt = this.now();
        await this.assertCollectionAuthorized(tx, args.assignmentId, collectionAt);

        const intent = await tx.purchaseIntent.create({
          data: {
            captureTokenId: token.id,
            intentType: args.intentType,
            initiatedAt: collectionAt,
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
      if (hitConstraint(e, 'captureTokenId', 'operationScope', 'idempotencyKey')) {
        throw wrapPiUnexpected(e, 'create purchase intent (unexpected create race)');
      }
      throw e;
    }
  }

  /**
   * Append a corrigible context version (A2 §8). Assignment-first then intent-root lock; forbidden once
   * finalized or invalidated; a NEW version is consent-gated. Transport replay via receipt; a repeated
   * contextCaptureKey ALIASES iff the frozen append requestHash matches (else ContextConflict).
   */
  async appendContext(args: AppendContextArgs): Promise<AppendContextResult> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.lockAssignment(tx, args.assignmentId);
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

        const collectionAt = this.now();
        await this.assertCollectionAuthorized(tx, args.assignmentId, collectionAt);

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
            capturedAt: collectionAt,
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
        return { contextVersionId: cv.id, contextSeq, resultKind: 'APPENDED', replayed: false };
      });
    } catch (e) {
      if (hitConstraint(e, 'contextSeq', 'contextCaptureKey', 'operationScope', 'idempotencyKey')) {
        throw wrapPiUnexpected(e, 'append purchase-intent context (unexpected race)');
      }
      throw e;
    }
  }

  /**
   * Append an assignment-scoped eligibility profile version (A2 §10). Assignment lock; a NEW version is
   * consent-gated. Transport replay; a repeated profileCaptureKey ALIASES iff the frozen append
   * requestHash matches (else EligibilityProfileConflict).
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

        const collectionAt = this.now();
        await this.assertCollectionAuthorized(tx, args.assignmentId, collectionAt);

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
            capturedAt: collectionAt,
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
      if (hitConstraint(e, 'profileSeq', 'profileCaptureKey', 'operationScope', 'idempotencyKey')) {
        throw wrapPiUnexpected(e, 'append eligibility profile (unexpected race)');
      }
      throw e;
    }
  }

  /**
   * Finalize an intent (A2 §9): pin the exact context + eligibility profile versions. Assignment-first
   * then intent-root lock (so finalize and invalidate serialize on the SAME intent — never both
   * commit). Forbidden if invalidated; a NEW finalization is consent-gated. Transport replay; a second
   * finalize ALIASES iff it pins the SAME (context, profile) — a different pin is FinalizationConflict.
   * Cross-assignment coherence of the pins is additionally enforced by an insert-time DB trigger.
   */
  async finalize(args: FinalizeArgs): Promise<FinalizeResult> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.lockAssignment(tx, args.assignmentId);
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

        await this.assertPinBelongs(tx, args);
        const collectionAt = this.now();
        await this.assertCollectionAuthorized(tx, args.assignmentId, collectionAt);

        const f = await tx.purchaseIntentFinalization.create({
          data: {
            intentId: args.intentId,
            contextVersionId: args.contextVersionId,
            eligibilityProfileVersionId: args.eligibilityProfileVersionId,
            finalizedAt: collectionAt,
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
      if (hitConstraint(e, 'intentId', 'operationScope', 'idempotencyKey')) {
        throw wrapPiUnexpected(e, 'finalize purchase intent (unexpected race)');
      }
      throw e;
    }
  }

  /**
   * Invalidate an intent (A2 §10/§23). Assignment-first then intent-root lock (serializes with
   * finalize); a NEW invalidation is consent-gated. Transport replay; a second invalidation of the same
   * intent ALIASES iff the frozen requestHash matches (else InvalidationConflict). A replacement must
   * live in the SAME assignment and must not create a cycle or self-link (acyclic walk under the locks;
   * also enforced by CHECK + trigger).
   */
  async invalidate(args: InvalidateArgs): Promise<InvalidateResult> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.lockAssignment(tx, args.assignmentId);
        await this.lockIntent(tx, args.invalidatedIntentId, args.assignmentId);

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

        const collectionAt = this.now();
        await this.assertCollectionAuthorized(tx, args.assignmentId, collectionAt);

        const inv = await tx.purchaseIntentInvalidation.create({
          data: {
            invalidatedIntentId: args.invalidatedIntentId,
            replacementIntentId: replacementId,
            invalidatedAt: collectionAt,
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
      if (hitConstraint(e, 'invalidatedIntentId', 'operationScope', 'idempotencyKey')) {
        throw wrapPiUnexpected(e, 'invalidate purchase intent (unexpected race)');
      }
      throw e;
    }
  }

  // ── internal helpers ────────────────────────────────────────────────────────────────────────────

  /** Lock the authoritative assignment row FIRST (A2 §21). Also the Consent Model A serialization point. */
  private async lockAssignment(tx: Tx, assignmentId: string): Promise<void> {
    const locked = await tx.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT "id" FROM "experiment_assignment" WHERE "id" = ${assignmentId}::uuid FOR UPDATE`,
    );
    if (locked.length === 0) {
      throw new PurchaseIntentInvariantError(`unknown assignment ${assignmentId}`);
    }
  }

  /** Lock the PurchaseIntent root (assignment must already be locked) + verify ownership (A2 §21). */
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

  /**
   * Consent Model A gate (A2 §7): the participant's consent MUST be authorized at the trusted collection
   * instant sampled under the assignment lock. Reads the append-only consent stream in the SAME locked
   * transaction (so a concurrent withdrawal cannot interleave) and evaluates the accepted A1 authority.
   * Never uses caller-supplied time; never rewrites historical authority with a later snapshot.
   */
  private async assertCollectionAuthorized(
    tx: Tx,
    assignmentId: string,
    collectionAt: Date,
  ): Promise<void> {
    // Sanctioned Consent Model A facts via the single internal facade (never raw-row reinterpretation),
    // read under the held assignment lock (READ COMMITTED). Decision = accepted A1 pure authority.
    const events = await readConsentAuthorizationFacts(tx, assignmentId);
    const authorized = wasCollectionAuthorizedAtKnownTime({
      events,
      collectionAt: collectionAt.toISOString(),
    });
    if (!authorized) throw new PurchaseIntentConsentNotAuthorizedError();
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
   * cycle (A2 §23/§44). Bounded by the finite invalidation graph in the assignment (walked under the
   * assignment lock, so no concurrent invalidation can extend the chain mid-walk).
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

/** Default repository over the shared Prisma client (real system clock). */
export const purchaseIntentRepository = new PurchaseIntentRepository();

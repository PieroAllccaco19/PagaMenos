// PagaMenos · src/db — StudyConsent repository (spec §8.6/§8.9/§8.10/§8.13). INTERNAL.
//
// The ONLY write path to `study_consent_event` + `study_consent_command_receipt`. It owns the consent
// SERIALIZATION (spec §8.10): inside ONE transaction it locks the `experiment_assignment` row FOR
// UPDATE, reloads the effective consent state, evaluates the (pure, caller-supplied) state machine,
// allocates `consentSeq` and samples trusted `capturedAt` UNDER the lock, appends an event only when
// state-changing, and appends the command receipt with its `resultKind` (§8.9). Row lock + sequence
// are the ONLY concurrency/order authority — never an unlocked `MAX(consentSeq)+1` (§8.10/§20).
//
// Owning sanctioned service (module-capability AST test): `services/study-consent.ts`.
import { Prisma, type PrismaClient } from '@prisma/client';

import {
  CONSENT_GRANT_OPERATION_SCOPE,
  CONSENT_WITHDRAW_OPERATION_SCOPE,
  StudyInvariantError,
  type ConsentEventFact,
  type ConsentTransition,
} from '@/study';

import { prisma as defaultPrisma } from './client';
import { assertReceiptRequestHash, isUniqueViolation, wrapStudyUnexpected } from './study-support';

export type ConsentResultKind =
  'EVENT_APPENDED' | 'NO_OP_EFFECTIVE_STATE' | 'CORRECTION_NOT_APPLIED';

/** The durable outcome of a consent command (spec §8.9). `consentEventId` references the event
 * representing the durable effective state (created, or the pre-existing effective event). */
export interface ConsentCommandResult {
  resultKind: ConsentResultKind;
  consentEventId: string;
  /** True when this exact transport key was already recorded (historical receipt replay). */
  replayed: boolean;
}

export interface RecordConsentCommandArgs {
  operationScope: typeof CONSENT_GRANT_OPERATION_SCOPE | typeof CONSENT_WITHDRAW_OPERATION_SCOPE;
  assignmentId: string;
  idempotencyKey: string;
  requestHash: string;
  /** GRANT provenance to persist on an appended GRANTED event. */
  grantProvenance?: {
    consentVersion: string;
    privacyNoticeVersion: string;
    optionalEvidenceConsent: boolean;
  };
  /** Asserted effective instant to persist on an appended WITHDRAWN event (may be null). */
  assertedEffectiveAt?: Date | null;
  /** Pure state-machine evaluation over the reloaded, sequence-ordered events (spec §8.3). */
  evaluate: (events: ConsentEventFact[]) => ConsentTransition;
}

type ConsentEventRow = Prisma.StudyConsentEventGetPayload<Record<string, never>>;

function rowToFact(row: ConsentEventRow): ConsentEventFact {
  return {
    consentSeq: row.consentSeq,
    action: row.action,
    consentVersion: row.consentVersion,
    privacyNoticeVersion: row.privacyNoticeVersion,
    optionalEvidenceConsent: row.optionalEvidenceConsent,
    assertedEffectiveAt: row.assertedEffectiveAt ? row.assertedEffectiveAt.toISOString() : null,
    capturedAt: row.capturedAt.toISOString(),
    recordedAt: row.recordedAt.toISOString(),
  };
}

export interface ConsentStore {
  recordConsentCommand(args: RecordConsentCommandArgs): Promise<ConsentCommandResult>;
  findAssignmentParticipantId(assignmentId: string): Promise<string | null>;
  listEvents(assignmentId: string): Promise<ConsentEventFact[]>;
}

export class StudyConsentRepository implements ConsentStore {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  /** The owning participant of an assignment (for the trusted own-assignment check, spec §12). */
  async findAssignmentParticipantId(assignmentId: string): Promise<string | null> {
    const row = await this.prisma.experimentAssignment.findUnique({
      where: { id: assignmentId },
      select: { participantId: true },
    });
    return row ? row.participantId : null;
  }

  async listEvents(assignmentId: string): Promise<ConsentEventFact[]> {
    const rows = await this.prisma.studyConsentEvent.findMany({
      where: { assignmentId },
      orderBy: { consentSeq: 'asc' },
    });
    return rows.map(rowToFact);
  }

  private async findReceipt(operationScope: string, key: string) {
    return this.prisma.studyConsentCommandReceipt.findUnique({
      where: { operationScope_idempotencyKey: { operationScope, idempotencyKey: key } },
    });
  }

  async recordConsentCommand(args: RecordConsentCommandArgs): Promise<ConsentCommandResult> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Lock the assignment row FOR UPDATE — the sole concurrency/order authority (spec §8.10).
        const locked = await tx.$queryRaw<Array<{ id: string }>>(
          Prisma.sql`SELECT "id" FROM "experiment_assignment" WHERE "id" = ${args.assignmentId}::uuid FOR UPDATE`,
        );
        if (locked.length === 0) {
          throw new StudyInvariantError(
            `consent references unknown assignment ${args.assignmentId}`,
          );
        }

        // Exact transport replay for a VALID request (schema already validated by the service, §8.10).
        const receipt = await tx.studyConsentCommandReceipt.findUnique({
          where: {
            operationScope_idempotencyKey: {
              operationScope: args.operationScope,
              idempotencyKey: args.idempotencyKey,
            },
          },
        });
        if (receipt) {
          assertReceiptRequestHash({
            operationScope: args.operationScope,
            idempotencyKey: args.idempotencyKey,
            existingRequestHash: receipt.requestHash,
            attemptedRequestHash: args.requestHash,
          });
          return {
            resultKind: receipt.resultKind as ConsentResultKind,
            consentEventId: receipt.consentEventId,
            replayed: true,
          };
        }

        // Reload effective state (ordered by consentSeq) and evaluate the pure transition.
        const events = (
          await tx.studyConsentEvent.findMany({
            where: { assignmentId: args.assignmentId },
            orderBy: { consentSeq: 'asc' },
          })
        ).map(rowToFact);
        const decision = args.evaluate(events);

        if (decision.kind === 'REJECT_INVALID_TRANSITION') {
          throw new ConsentTransitionRejection(
            'INVALID_TRANSITION',
            decision.command,
            decision.fromState,
          );
        }
        if (decision.kind === 'REJECT_UPDATE_NOT_SUPPORTED') {
          throw new ConsentTransitionRejection('UPDATE_NOT_SUPPORTED');
        }

        // No-op / correction: reference the current effective event; append NO event (spec §8.5/§8.9).
        if (
          decision.kind === 'NO_OP_EFFECTIVE_STATE' ||
          decision.kind === 'CORRECTION_NOT_APPLIED'
        ) {
          const last = events[events.length - 1];
          if (!last) throw new StudyInvariantError('no-op/correction with no effective event');
          const effective = await tx.studyConsentEvent.findFirst({
            where: { assignmentId: args.assignmentId, consentSeq: last.consentSeq },
            select: { id: true },
          });
          if (!effective)
            throw new StudyInvariantError('effective consent event vanished under lock');
          const resultKind: ConsentResultKind =
            decision.kind === 'NO_OP_EFFECTIVE_STATE'
              ? 'NO_OP_EFFECTIVE_STATE'
              : 'CORRECTION_NOT_APPLIED';
          await tx.studyConsentCommandReceipt.create({
            data: {
              operationScope: args.operationScope,
              idempotencyKey: args.idempotencyKey,
              requestHash: args.requestHash,
              resultKind,
              consentEventId: effective.id,
            },
          });
          return { resultKind, consentEventId: effective.id, replayed: false };
        }

        // APPEND: allocate consentSeq and sample capturedAt UNDER the lock (spec §8.10).
        const maxRow = await tx.studyConsentEvent.aggregate({
          where: { assignmentId: args.assignmentId },
          _max: { consentSeq: true },
        });
        const consentSeq = (maxRow._max.consentSeq ?? 0) + 1;
        const capturedAt = new Date(); // trusted time, sampled while the lock is held

        const isGrant = decision.action === 'GRANTED';
        if (isGrant && !args.grantProvenance) {
          throw new StudyInvariantError('GRANTED append requires grant provenance');
        }
        const created = await tx.studyConsentEvent.create({
          data: {
            assignmentId: args.assignmentId,
            consentSeq,
            action: decision.action,
            consentVersion: isGrant ? args.grantProvenance!.consentVersion : null,
            privacyNoticeVersion: isGrant ? args.grantProvenance!.privacyNoticeVersion : null,
            optionalEvidenceConsent: isGrant ? args.grantProvenance!.optionalEvidenceConsent : null,
            assertedEffectiveAt: isGrant ? null : (args.assertedEffectiveAt ?? null),
            capturedAt,
          },
        });
        await tx.studyConsentCommandReceipt.create({
          data: {
            operationScope: args.operationScope,
            idempotencyKey: args.idempotencyKey,
            requestHash: args.requestHash,
            resultKind: 'EVENT_APPENDED',
            consentEventId: created.id,
          },
        });
        return { resultKind: 'EVENT_APPENDED', consentEventId: created.id, replayed: false };
      });
    } catch (e) {
      if (e instanceof ConsentTransitionRejection) throw e;
      if (e instanceof StudyInvariantError) throw e;
      if ((e as { name?: string })?.name === 'StudyIdempotencyConflictError') throw e;
      if (isUniqueViolation(e)) {
        // A concurrent command with the SAME transport key committed first — reconcile to it.
        const receipt = await this.findReceipt(args.operationScope, args.idempotencyKey);
        if (receipt) {
          assertReceiptRequestHash({
            operationScope: args.operationScope,
            idempotencyKey: args.idempotencyKey,
            existingRequestHash: receipt.requestHash,
            attemptedRequestHash: args.requestHash,
          });
          return {
            resultKind: receipt.resultKind as ConsentResultKind,
            consentEventId: receipt.consentEventId,
            replayed: true,
          };
        }
      }
      throw wrapStudyUnexpected(e, 'record consent command');
    }
  }
}

/** Internal signal carrying a rejected consent transition; the service maps it to a typed error. */
export class ConsentTransitionRejection extends Error {
  constructor(
    public readonly reason: 'INVALID_TRANSITION' | 'UPDATE_NOT_SUPPORTED',
    public readonly command?: 'GRANT' | 'WITHDRAW',
    public readonly fromState?: string,
  ) {
    super(`consent transition rejected: ${reason}`);
    this.name = 'ConsentTransitionRejection';
  }
}

/** Default repository over the shared Prisma client. */
export const studyConsentRepository = new StudyConsentRepository();

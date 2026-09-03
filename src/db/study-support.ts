// PagaMenos · src/db — shared internal helpers for the A1 study repositories.
//
// INTERNAL (P35A-02 convention): part of the `src/db` layer, unreachable from arbitrary application
// code (ESLint blocks `@/db/**`; the module-capability AST test additionally restricts each raw study
// repository to its single owning sanctioned service). This module carries no capability of its own —
// only error/violation translation and small mappers shared by the study repositories.
import { Prisma } from '@prisma/client';

import { StudyIdempotencyConflictError, StudyInvariantError, type ConsentEventFact } from '@/study';

/**
 * Sanctioned INTERNAL Consent Model A read facade (A2 §7; Sol Correction 3). The SINGLE place that maps
 * raw `study_consent_event` rows into the accepted `ConsentEventFact` shape, so no scientific-write path
 * ever re-interprets raw consent rows itself. It is db-layer internal (never on the public `@/services`
 * barrel) and is called by the A2 write boundary WITHIN its assignment-locked transaction, giving the
 * accepted READ COMMITTED behavior: the ordered committed consent stream is read while the assignment
 * row lock is held, so a concurrent withdrawal cannot interleave. The authorization DECISION is the
 * accepted pure A1 authority `wasCollectionAuthorizedAtKnownTime`, applied by the caller to these facts.
 */
export async function readConsentAuthorizationFacts(
  tx: Prisma.TransactionClient,
  assignmentId: string,
): Promise<ConsentEventFact[]> {
  const rows = await tx.studyConsentEvent.findMany({
    where: { assignmentId },
    orderBy: { consentSeq: 'asc' },
  });
  return rows.map((r) => ({
    consentSeq: r.consentSeq,
    action: r.action,
    consentVersion: r.consentVersion,
    privacyNoticeVersion: r.privacyNoticeVersion,
    optionalEvidenceConsent: r.optionalEvidenceConsent,
    assertedEffectiveAt: r.assertedEffectiveAt ? r.assertedEffectiveAt.toISOString() : null,
    capturedAt: r.capturedAt.toISOString(),
    recordedAt: r.recordedAt.toISOString(),
  }));
}

/** A Prisma unique-constraint (P2002) violation — the race-reconciliation signal. */
export function isUniqueViolation(e: unknown): e is Prisma.PrismaClientKnownRequestError {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
}

/** Wrap an unexpected driver/database failure as a typed study invariant error (never leak driver text). */
export function wrapStudyUnexpected(e: unknown, whileDoing: string): StudyInvariantError {
  if (e instanceof StudyInvariantError) return e;
  const message = e instanceof Error ? e.message : String(e);
  return new StudyInvariantError(`unexpected database failure while ${whileDoing}: ${message}`, {
    cause: e,
  });
}

/**
 * The single transport-idempotency identity invariant: a receipt resolves a request successfully ONLY
 * when its frozen `requestHash` equals the attempted one. Otherwise the same key was reused for a
 * materially different request → typed conflict (spec §10). Used by every receipt-replay path.
 */
export function assertReceiptRequestHash(args: {
  operationScope: string;
  idempotencyKey: string;
  existingRequestHash: string;
  attemptedRequestHash: string;
}): void {
  if (args.existingRequestHash !== args.attemptedRequestHash) {
    throw new StudyIdempotencyConflictError(
      args.operationScope,
      args.idempotencyKey,
      args.existingRequestHash,
      args.attemptedRequestHash,
    );
  }
}

/** ISO-8601 string for a nullable timestamptz column. */
export function isoOrNull(d: Date | null): string | null {
  return d === null ? null : d.toISOString();
}

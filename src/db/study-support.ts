// PagaMenos · src/db — shared internal helpers for the A1 study repositories.
//
// INTERNAL (P35A-02 convention): part of the `src/db` layer, unreachable from arbitrary application
// code (ESLint blocks `@/db/**`; the module-capability AST test additionally restricts each raw study
// repository to its single owning sanctioned service). This module carries no capability of its own —
// only error/violation translation and small mappers shared by the study repositories.
import { Prisma } from '@prisma/client';

import { StudyIdempotencyConflictError, StudyInvariantError } from '@/study';

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

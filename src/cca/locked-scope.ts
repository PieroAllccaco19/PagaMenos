// PagaMenos · src/cca — LockedCollectionScope (Amendment 01 §13, §14, §21).
//
// The structural assignment boundary of one authorized collection. It is minted ONLY by the CCA
// engine, AFTER `ExperimentAssignment ... FOR UPDATE` and the participant-ownership re-proof, and is
// passed only to the fixed executor and the tracked adapter; it never reaches the business caller.
// Authority is membership in a module-private WeakSet (the accepted participant-context pattern):
// a spread, clone, JSON round-trip or cast is not a scope. The minting primitive is
// capability-restricted to src/db/cca-engine.ts by the module-capability test.
import { CcaError } from './errors';
import type { CollectionConsentPolicy } from './policy';

export interface LockedCollectionScope {
  /** The assignment locked FOR UPDATE by the CCA engine and re-proved against the trusted context. */
  readonly assignmentId: string;
  readonly participantId: string;
  readonly operationId: string;
  readonly policy: CollectionConsentPolicy;
  /** The single trusted-service-clock sample taken under the lock (§8.2 CCA-CLOCK), ISO-8601. */
  readonly collectionAt: string;
}

const minted = new WeakSet<object>();

export function isLockedCollectionScope(value: unknown): value is LockedCollectionScope {
  return typeof value === 'object' && value !== null && minted.has(value);
}

/** INTERNAL — CCA engine only (§13 step 5). */
export function mintLockedCollectionScope(fields: LockedCollectionScope): LockedCollectionScope {
  const scope: LockedCollectionScope = Object.freeze({
    assignmentId: fields.assignmentId,
    participantId: fields.participantId,
    operationId: fields.operationId,
    policy: fields.policy,
    collectionAt: fields.collectionAt,
  });
  minted.add(scope);
  return scope;
}

/**
 * Relational re-proof helper for tracked-adapter implementations (§12.1, §14 B): the assignment
 * that upstream material belongs to MUST equal the locked assignment. A mismatch throws, which rolls
 * the whole CCA transaction back (§49).
 */
export function requireLockedAssignment(
  scope: LockedCollectionScope,
  provenAssignmentId: string | null | undefined,
): void {
  if (!isLockedCollectionScope(scope)) {
    throw new CcaError('CCA_ASSIGNMENT_SCOPE_MISMATCH', 'not a CCA-minted locked scope');
  }
  if (provenAssignmentId !== scope.assignmentId) {
    throw new CcaError(
      'CCA_ASSIGNMENT_SCOPE_MISMATCH',
      'operation material does not belong to the locked assignment',
    );
  }
}

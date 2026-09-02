// PagaMenos · src/services — SANCTIONED public surface for decision persistence (§29/§43).
//
// Normal application code uses ONLY these one-argument functions to persist/read historical
// decisions. `decideAndPersist(request)` binds the TRUSTED production dependencies — provenance/build
// providers and the repository are NOT injectable through the public surface (P35A-05 §21). Historical
// reads go through `loadDecisionSnapshot` / `replayDecisionSnapshot`, which verify hash integrity +
// column↔payload coherence. The raw db client, repository, draft constructor, providers, and the
// injectable `*WithDeps` / `DecideAndPersistDeps` surface are deliberately NOT re-exported here.
export {
  decideAndPersist,
  loadDecisionSnapshot,
  replayDecisionSnapshot,
  type DecideAndPersistRequest,
} from './decide-and-persist';

// Types + typed errors consumers need to handle results/failures (read-only; no write capability).
export type { DecisionSnapshotDto, ReplayComparison } from '@/persistence';
export {
  PersistenceError,
  IdempotencyConflictError,
  BusinessDecisionConflictError,
  SnapshotIntegrityError,
  SnapshotCoherenceError,
  UnsupportedSnapshotVersionError,
  CorpusProvenanceError,
  BuildProvenanceError,
  PersistenceInvariantError,
} from '@/persistence';

// ---------------------------------------------------------------------------------------------------
// M3.5B-A1 PARTICIPANT-FACING / READ surface. The consent surface operates only through a TRUSTED
// participant context (§12). The trusted ADMIN write capabilities (protocol/experiment/recruitment/
// assignment) are intentionally NOT re-exported here — they live behind `@/services/study-admin`, off
// limits to participant-facing/app code (module-capability AST test).
export {
  recordConsentGrant,
  recordConsentWithdrawal,
  type RecordConsentGrantRequest,
  type RecordConsentWithdrawalRequest,
  type ConsentCommandResult,
  type ConsentResultKind,
} from './study-consent';
export { loadFrozenProtocolForAnalysis, type LoadFrozenProtocolRef } from './study-analysis';

// The trusted participant context TYPE (erased) and the pure A1 helpers + typed study errors that
// consumers need to interpret results/failures (no write capability). The context CREATION primitive
// is intentionally NOT exported here — it lives behind the trusted session adapter (A1-CODE-01).
export {
  deriveConsentAuthorizationIntervals,
  wasCollectionAuthorizedAtKnownTime,
  effectiveConsentState,
  type TrustedParticipantContext,
  type ConsentEventFact,
  type AuthorizationInterval,
  StudyError,
  StudyValidationError,
  StudyIdempotencyConflictError,
  StudyDomainConflictError,
  StudyConsentInvalidTransitionError,
  StudyConsentUpdateNotSupportedError,
  StudyProtocolNotFrozenError,
  StudyProtocolDigestMismatchError,
  StudyProtocolAlreadyFrozenError,
  UnsupportedStudyVersionError,
  StudyRecruitmentResolutionError,
  StudyAssignmentOwnershipError,
  StudyInvariantError,
} from '@/study';

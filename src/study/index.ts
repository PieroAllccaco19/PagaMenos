// PagaMenos · src/study — CURATED pure-domain surface for M3.5B-A1.
//
// Like `@/persistence`, this barrel exposes ONLY read-safe/pure helpers: typed errors, version
// constants, the protocol canonicalization/digest path, the pure consent state machine + interval
// algorithm, the input schemas, the request-hash contract, the recruitment resolver boundary, and the
// trusted participant context. It holds NO database access and NO write capability — the raw study
// repositories live in `src/db/study-*` (internal) and the sanctioned write services in
// `src/services/study-*`. Nothing here can persist a row.

export {
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
} from './errors';

export {
  DEFINITION_SCHEMA_VERSION_V1,
  CANONICALIZATION_VERSION_V1,
  RECRUITMENT_KEY_VERSION_V1,
  PROTOCOL_REGISTER_OPERATION_SCOPE,
  PROTOCOL_FREEZE_OPERATION_SCOPE,
  EXPERIMENT_CREATE_OPERATION_SCOPE,
  PARTICIPANT_REGISTER_OPERATION_SCOPE,
  ASSIGN_PARTICIPANT_OPERATION_SCOPE,
  CONSENT_GRANT_OPERATION_SCOPE,
  CONSENT_WITHDRAW_OPERATION_SCOPE,
} from './versions';

export {
  analysisProtocolDefinitionV1Schema,
  buildProtocolDefinition,
  verifyProtocolDefinition,
  type AnalysisProtocolDefinitionV1,
  type NormalizedProtocolDefinition,
} from './protocol-definition';

export {
  orderBySeq,
  effectiveEvent,
  effectiveConsentState,
  grantProvenanceEquals,
  withdrawalAssertionEquals,
  evaluateGrant,
  evaluateWithdraw,
  deriveConsentAuthorizationIntervals,
  wasCollectionAuthorizedAtKnownTime,
  type ConsentEventFact,
  type EffectiveConsentState,
  type ConsentGrantProvenance,
  type ConsentTransition,
  type AuthorizationInterval,
} from './consent-state';

export {
  registerProtocolInputSchema,
  freezeProtocolInputSchema,
  createExperimentInputSchema,
  registerParticipantInputSchema,
  assignParticipantInputSchema,
  consentGrantPayloadSchema,
  consentWithdrawPayloadSchema,
  parseStudyInput,
  type RegisterProtocolInput,
  type FreezeProtocolInput,
  type CreateExperimentInput,
  type RegisterParticipantInput,
  type AssignParticipantInput,
  type ConsentGrantPayload,
  type ConsentWithdrawPayload,
} from './schema';

export {
  protocolRegisterRequestHash,
  protocolFreezeRequestHash,
  experimentCreateRequestHash,
  participantRegisterRequestHash,
  assignParticipantRequestHash,
  consentGrantRequestHash,
  consentWithdrawRequestHash,
  type TrustedContext,
} from './request-hash';

export {
  InMemoryRecruitmentResolver,
  type RecruitmentResolver,
  type ResolvedRecruitmentSubject,
} from './recruitment';

export {
  mintTrustedParticipantContext,
  isTrustedParticipantContext,
  type TrustedParticipantContext,
} from './participant-context';

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

export { type RecruitmentResolver, type ResolvedRecruitmentSubject } from './recruitment';

// The CREATION primitive is intentionally NOT re-exported here — it is reachable only from the trusted
// session adapter (`services/study-participant-session.ts`) and tests (A1-CODE-01). Only the
// runtime-unforgeable checker and the type are public.
export { isTrustedParticipantContext, type TrustedParticipantContext } from './participant-context';

// ── M3.5B-A2 pure-domain surface (PurchaseIntent lifecycle, deterministic decision freeze) ──────────
export {
  PurchaseIntentError,
  PurchaseIntentValidationError,
  PurchaseIntentConsentNotAuthorizedError,
  PurchaseIntentOwnershipError,
  PurchaseIntentCaptureConflictError,
  PurchaseIntentContextConflictError,
  PurchaseIntentContextSignatureError,
  PurchaseIntentContextAfterFinalizationError,
  EligibilityProfileConflictError,
  PurchaseIntentInvalidationConflictError,
  PurchaseIntentFinalizationConflictError,
  PurchaseIntentInvalidatedError,
  PurchaseIntentNotFinalizedError,
  PurchaseIntentInvalidationCycleError,
  PurchaseIntentSemanticDriftError,
  PurchaseIntentDecisionRequestIntegrityError,
  PurchaseIntentUnsupportedInputSchemaError,
  PurchaseIntentBindingCoherenceError,
  PurchaseIntentHistoricalConflictError,
  TrustedEntrySourceError,
  PurchaseIntentIdempotencyConflictError,
  PurchaseIntentInvariantError,
} from './purchase-intent-errors';

export {
  A2_HOLIDAY_CALENDAR_VERSION_V1,
  A2_HOLIDAY_CALENDAR_DIGEST_V1,
  A2_HOLIDAY_CALENDAR_FIXTURE_V1,
  resolveHolidayCalendarFixture,
  computeHolidayContentDigest,
  limaLocalDateOf,
  assertIntendedDateWithinCoverage,
  HolidayFixtureIntegrityError,
  UnsupportedHolidayCalendarVersionError,
  HolidayCoverageError,
  type HolidayCalendarFixtureV1,
} from './holiday-fixture';

export {
  A2_CORPUS_PROJECTION_VERSION_V1,
  A2_ACCEPTED_CORPUS_ID,
  A2_ACCEPTED_CORPUS_SEMANTIC_DIGEST_V1,
  RUNTIME_CORPUS_AUTHORITY,
  normalizeCorpusSemanticProjection,
  computeCorpusSemanticDigest,
  assertCorpusAuthority,
  CorpusAuthorityMismatchError,
  type RuntimeCorpusAuthorityDeclaration,
} from './corpus-authority';

export {
  A2_BUSINESS_DECISION_KEY_PREFIX,
  A2_M3_5A_IDEMPOTENCY_KEY_PREFIX,
  deriveBusinessDecisionKey,
  deriveM3_5aIdempotencyKey,
} from './purchase-intent-keys';

export {
  A2_PORTFOLIO_SCHEMA_VERSION_V1,
  normalizeEligibilityPortfolioV1,
  compareUnicodeCodePointStrings,
  compareNormalizedEligibilityInstrumentV1,
  canonicalMembershipsSerialized,
  EligibilityProfileNormalizedKeyCollisionError,
  EligibilityProfileInstrumentComparatorInvariantError,
} from './eligibility-portfolio';

// NOTE: the pure precedence resolver is intentionally NOT on the barrel — trusted entry provenance is
// minted only via the session adapter's `resolveTrustedEntrySource` (branded `ResolvedEntrySource`).
export {
  ENTRY_SOURCES,
  type EntrySource as A2EntrySource,
  type TrustedEntryEvidence,
} from './purchase-intent-entry-source';

// The trusted resolved-entry-source TYPE + runtime-unforgeable validator (A2 §8). The CREATION
// primitive (`createResolvedEntrySource`) is intentionally NOT exported here — it lives behind the
// trusted session adapter (mirrors the participant-context creation primitive, A1-CODE-01).
export { isResolvedEntrySource, type ResolvedEntrySource } from './entry-source-context';

export {
  A2_CONTEXT_SCHEMA_VERSION_V1,
  normalizeA2PurchaseSignatureV1,
  flattenToPurchaseContext,
  buildDecideInputFromFinalizedAuthorities,
  computeDecideInputHash,
  type A2PurchaseSignature,
  type A2SignatureKind,
  type BuildDecideInputArgs,
} from './purchase-intent-decide-input';

export {
  INTENT_CREATE_OPERATION_SCOPE,
  INTENT_CONTEXT_APPEND_OPERATION_SCOPE,
  ELIGIBILITY_PROFILE_APPEND_OPERATION_SCOPE,
  INTENT_FINALIZE_OPERATION_SCOPE,
  INTENT_INVALIDATE_OPERATION_SCOPE,
  createPurchaseIntentRequestHash,
  appendContextRequestHash,
  appendEligibilityProfileRequestHash,
  finalizeRequestHash,
  invalidateRequestHash,
  type A2TrustedContext,
} from './purchase-intent-request-hash';

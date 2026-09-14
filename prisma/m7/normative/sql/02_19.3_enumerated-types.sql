CREATE TYPE m7."M7OutcomeStatusLabel"      AS ENUM ('INTENDED','ATTEMPTED','SELF_REPORTED','FAILED','ABANDONED');
CREATE TYPE m7."M7AssertionKind"           AS ENUM ('ORIGINAL','CORRECTION','RETRACTION');
CREATE TYPE m7."M7OccurrenceAssertion"     AS ENUM ('NONE','ATTEMPTED_PURCHASE','REALIZED_PURCHASE');
CREATE TYPE m7."M7MerchantAssertionKind"   AS ENUM ('NOT_ASSERTED','VOCABULARY_MERCHANT','UNLISTED_MERCHANT');
CREATE TYPE m7."M7EventTimeAssertionKind"  AS ENUM ('NOT_ASSERTED','INSTANT','LIMA_DATE');
CREATE TYPE m7."M7OutcomeResultKind"       AS ENUM ('RECORDED','CAPTURE_ALIAS');
CREATE TYPE m7."M7EvidenceResultKind"      AS ENUM ('SUBMITTED','SUBMISSION_ALIAS');
CREATE TYPE m7."M7UploadIntentState"       AS ENUM ('ISSUED','PROCESSING','VALIDATED','CONSUMED',
                                                    'REJECTED_CONTENT','EXPIRED','TERMINAL_FAILURE');
CREATE TYPE m7."M7ContentRejectionReason"  AS ENUM ('SIZE_EXCEEDED','MAGIC_BYTES_MISMATCH','DECODE_FAILED',
                                                    'PIXEL_LIMIT_EXCEEDED','REENCODE_FAILED');
CREATE TYPE m7."M7TerminalFailureReason"   AS ENUM ('CANONICAL_KEY_CONFLICT','READBACK_FAILED','PROVIDER_PERMANENT_ERROR');
CREATE TYPE m7."M7ArtifactState"           AS ENUM ('AVAILABLE','DELETION_SCHEDULED','DELETED','MISSING');
CREATE TYPE m7."M7ObjectZone"              AS ENUM ('STAGING','CANONICAL');
CREATE TYPE m7."M7StorageEffectKind"       AS ENUM ('DELETE_OBJECT');
CREATE TYPE m7."M7OutboxState"             AS ENUM ('PENDING','LEASED','CONFIRMED','FAILED_PERMANENT');
CREATE TYPE m7."M7EffectAttemptResult"     AS ENUM ('ABSENT_CONFIRMED','STILL_PRESENT',
                                                    'PROVIDER_ERROR_RETRYABLE','PROVIDER_ERROR_PERMANENT');
CREATE TYPE m7."M7IntegrityFindingKind"    AS ENUM ('CANONICAL_OBJECT_MISSING','CANONICAL_DIGEST_MISMATCH');
CREATE TYPE m7."M7ReconciliationFindingKind" AS ENUM ('UNISSUED_KEY_OBJECT','ORPHAN_STAGING_OBJECT',
                                                    'ORPHAN_CANONICAL_OBJECT','SUPERSEDED_GENERATION_OBJECT',
                                                    'CANONICAL_OBJECT_PRESENT_AFTER_DELETION');
CREATE TYPE m7."M7SessionRevocationReason" AS ENUM ('LOGOUT','ROTATED','REAUTHENTICATION_REQUIRED','ADMINISTRATIVE');
CREATE TYPE m7."M7DeletionBasis"           AS ENUM ('CONSENT_WITHDRAWAL','RETENTION_EXPIRY','LEGAL_PRIVACY_OBLIGATION');
CREATE TYPE m7."M7DeletionMechanism"       AS ENUM ('RAW_OBJECT_DELETE','ROW_REDACT','ROW_PURGE');
CREATE TYPE m7."M7DeletionTargetKind"      AS ENUM ('EVIDENCE_SUBMISSION','ASSIGNMENT_M7_DATA');
CREATE TYPE m7."M7LegalBasisCode"          AS ENUM ('CONSENT_INSTRUMENT_REQUIREMENT','STATUTORY_ERASURE_OBLIGATION',
                                                    'GRANTED_PARTICIPANT_ERASURE_REQUEST','COMPETENT_AUTHORITY_ORDER');
CREATE TYPE m7."M7UploadTransport"         AS ENUM ('PRESIGNED_PUT','SERVER_MEDIATED');
CREATE TYPE m7."M7StorageProviderClass"    AS ENUM ('VERCEL_BLOB','S3_COMPATIBLE','AZURE_BLOB','GCS','CONFORMANCE_DOUBLE');
CREATE TYPE m7."M7ConditionalCreateMode"   AS ENUM ('IF_NONE_MATCH_STAR','PROVIDER_ATOMIC_CREATE');
-- §11.7 XF-2: the KIND of exact-key write capability a profile can mint. No secret, URL or token is ever stored.
CREATE TYPE m7."M7WriteCapabilityMode"     AS ENUM ('EXACT_KEY_PRESIGNED_PUT','EXACT_KEY_SCOPED_TOKEN');
-- XF-11 / XF-GOAL: the operation component of a capability envelope. One label, deliberately: M7 mints
-- capabilities for exactly one operation and a type with one label makes "canonical create only" a
-- TYPE fact rather than a CHECK a future migration could widen. Adding a label is a schema change the
-- exact-set catalog verifier reports (EN-EXTRA), which is the point.
CREATE TYPE m7."M7CapabilityOperation"     AS ENUM ('CANONICAL_CREATE');
-- 11.7.4: WHICH LAYER holds the authorization envelope on this backend. PROVIDER_IAM = the provider's
-- own delegation system pins operation/key/backend/expiry and no derived credential can widen them
-- (class E-D). SIGNER_TOPOLOGY = the provider only signs a caller-supplied key and expiry, so the
-- envelope is held by M7's own capability topology (class E-E, residual M7-R-12). It is part of
-- profileSha256, so the classification cannot drift silently.
CREATE TYPE m7."M7EnvelopeEnforcement"     AS ENUM ('PROVIDER_IAM','SIGNER_TOPOLOGY');
-- §15.11.6 DL-5: which family's chain resolves an outbox row's BOUND policy.
CREATE TYPE m7."M7OutboxPolicyBinding"     AS ENUM ('DELETION_EXECUTION','UPLOAD_INTENT','RECONCILIATION_RUN');
-- §15.11.6 DL-8: why a deletion execution is on record as having failed its budget.
CREATE TYPE m7."M7SlaFailureKind"          AS ENUM ('EFFECT_FAILED_PERMANENT','COMPLETION_BUDGET_ELAPSED',
                                                    'REQUEUED_AFTER_BUDGET_EXHAUSTION');
CREATE TYPE m7."M7CatalogObjectKind"       AS ENUM ('CONSTRAINT','INDEX','TRIGGER');

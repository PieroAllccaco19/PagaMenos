CREATE TABLE m7.m7_participant_erasure_request (
    "id"                   UUID           NOT NULL,
    "assignmentId"         UUID           NOT NULL,
    "participantSessionId" UUID           NOT NULL,
    "clientRequestKey"     TEXT           NOT NULL,
    "requestedAt"          TIMESTAMPTZ(6) NOT NULL,
    "generationPath"       TEXT           NOT NULL,
    CONSTRAINT m7_participant_erasure_request_pkey PRIMARY KEY ("id"),
    CONSTRAINT m7_participant_erasure_request_key_key UNIQUE ("assignmentId", "clientRequestKey"),
    CONSTRAINT m7_participant_erasure_request_assignment_id_key UNIQUE ("assignmentId", "id"),
    CONSTRAINT m7_participant_erasure_request_assignment_fkey FOREIGN KEY ("assignmentId")
        REFERENCES public.experiment_assignment ("id") ON DELETE RESTRICT,
    CONSTRAINT m7_participant_erasure_request_session_fkey FOREIGN KEY ("participantSessionId")
        REFERENCES m7.m7_participant_session ("id") ON DELETE RESTRICT,
    CONSTRAINT m7_participant_erasure_request_key_ck CHECK ("clientRequestKey" ~ '^[A-Za-z0-9_-]{16,128}$'),
    CONSTRAINT m7_participant_erasure_request_path_ck CHECK ("generationPath" = 'M7_PRIVACY_REQUEST_V1')
);

CREATE TABLE m7.m7_deletion_authorization (
    "id"                     UUID           NOT NULL,
    "basisCode"              m7."M7LegalBasisCode" NOT NULL,
    "assignmentId"           UUID           NOT NULL,
    "erasureRequestId"       UUID,
    "targetKind"             m7."M7DeletionTargetKind" NOT NULL,
    "targetSubmissionId"     UUID,            -- opaque after purge; verified at insert (§19.10)
    "mechanism"              m7."M7DeletionMechanism" NOT NULL,
    "retainDeletionHistory"  BOOLEAN        NOT NULL,
    "decisionRecordSha256"   TEXT           NOT NULL,
    "retentionPolicyVersion" TEXT           NOT NULL,   -- the policy whose deadline model applies (§15.11.3)
    "authorizedAt"           TIMESTAMPTZ(6) NOT NULL,
    "authorizedBy"           NAME           NOT NULL,
    "installationId"         UUID           NOT NULL,
    "generationPath"         TEXT           NOT NULL,
    CONSTRAINT m7_deletion_authorization_pkey PRIMARY KEY ("id"),
    CONSTRAINT m7_deletion_authorization_assignment_fkey FOREIGN KEY ("assignmentId")
        REFERENCES public.experiment_assignment ("id") ON DELETE RESTRICT,
    CONSTRAINT m7_deletion_authorization_request_fkey FOREIGN KEY ("assignmentId", "erasureRequestId")
        REFERENCES m7.m7_participant_erasure_request ("assignmentId", "id") ON DELETE RESTRICT,
    CONSTRAINT m7_deletion_authorization_policy_fkey FOREIGN KEY ("retentionPolicyVersion")
        REFERENCES m7.m7_retention_policy ("policyVersion") ON DELETE RESTRICT,
    CONSTRAINT m7_deletion_authorization_installation_fkey FOREIGN KEY ("installationId")
        REFERENCES m7.m7_control_plane_installation ("id") ON DELETE RESTRICT,
    CONSTRAINT m7_deletion_authorization_request_ck CHECK (
        ("basisCode" = 'GRANTED_PARTICIPANT_ERASURE_REQUEST') = ("erasureRequestId" IS NOT NULL)),
    CONSTRAINT m7_deletion_authorization_target_ck CHECK (
        ("targetKind" = 'EVIDENCE_SUBMISSION') = ("targetSubmissionId" IS NOT NULL)),
    CONSTRAINT m7_deletion_authorization_purge_scope_ck CHECK ("mechanism" <> 'ROW_PURGE' OR "targetKind" = 'ASSIGNMENT_M7_DATA'),
    CONSTRAINT m7_deletion_authorization_history_ck CHECK ("mechanism" = 'ROW_PURGE' OR "retainDeletionHistory"),
    CONSTRAINT m7_deletion_authorization_digest_ck CHECK ("decisionRecordSha256" ~ '^sha256:[0-9a-f]{64}$'),
    CONSTRAINT m7_deletion_authorization_path_ck CHECK ("generationPath" = 'M7_MINT_DELETION_AUTHORIZATION_V1')
);

CREATE TABLE m7.m7_deletion_execution (
    "id"                     UUID           NOT NULL,
    "basis"                  m7."M7DeletionBasis" NOT NULL,
    "assignmentId"           UUID           NOT NULL,
    "consentEventId"         UUID,
    "retentionPolicyVersion" TEXT,           -- basis discriminator: NOT NULL iff RETENTION_EXPIRY
    "deadlinePolicyVersion"  TEXT           NOT NULL,  -- the policy that produced hardDueAt / budget
    "authorizationId"        UUID,
    "targetKind"             m7."M7DeletionTargetKind" NOT NULL,
    "targetSubmissionId"     UUID,           -- opaque after purge; verified at insert
    "mechanism"              m7."M7DeletionMechanism" NOT NULL,
    "scheduledAt"            TIMESTAMPTZ(6) NOT NULL,
    "scheduledBy"            NAME           NOT NULL,
    -- §15.11 deadline model
    "hardDueAt"              TIMESTAMPTZ(6) NOT NULL,
    "completionBudgetDueAt"  TIMESTAMPTZ(6) NOT NULL,
    "budgetSatisfied"        BOOLEAN        NOT NULL,
    "generationPath"         TEXT           NOT NULL,
    CONSTRAINT m7_deletion_execution_pkey PRIMARY KEY ("id"),
    -- DL-5 DELETION_EXECUTION family: the outbox composite-FKs this pair, so an effect physically
    -- cannot carry a policy other than the one that produced its execution's budget
    CONSTRAINT m7_deletion_execution_id_policy_key UNIQUE ("id", "deadlinePolicyVersion"),
    CONSTRAINT m7_deletion_execution_assignment_fkey FOREIGN KEY ("assignmentId")
        REFERENCES public.experiment_assignment ("id") ON DELETE RESTRICT,
    CONSTRAINT m7_deletion_execution_consent_fkey FOREIGN KEY ("consentEventId")
        REFERENCES public.study_consent_event ("id") ON DELETE RESTRICT,
    CONSTRAINT m7_deletion_execution_policy_fkey FOREIGN KEY ("retentionPolicyVersion")
        REFERENCES m7.m7_retention_policy ("policyVersion") ON DELETE RESTRICT,
    CONSTRAINT m7_deletion_execution_deadline_policy_fkey FOREIGN KEY ("deadlinePolicyVersion")
        REFERENCES m7.m7_retention_policy ("policyVersion") ON DELETE RESTRICT,
    CONSTRAINT m7_deletion_execution_authorization_fkey FOREIGN KEY ("authorizationId")
        REFERENCES m7.m7_deletion_authorization ("id") ON DELETE RESTRICT,
    CONSTRAINT m7_deletion_execution_basis_ck CHECK (
        ("basis" = 'CONSENT_WITHDRAWAL')       = ("consentEventId" IS NOT NULL)
    AND ("basis" = 'RETENTION_EXPIRY')         = ("retentionPolicyVersion" IS NOT NULL)
    AND ("basis" = 'LEGAL_PRIVACY_OBLIGATION') = ("authorizationId" IS NOT NULL)),
    CONSTRAINT m7_deletion_execution_system_basis_ck CHECK (
        "basis" = 'LEGAL_PRIVACY_OBLIGATION'
        OR ("mechanism" = 'RAW_OBJECT_DELETE' AND "targetKind" = 'EVIDENCE_SUBMISSION')),
    CONSTRAINT m7_deletion_execution_target_ck CHECK (("targetKind" = 'EVIDENCE_SUBMISSION') = ("targetSubmissionId" IS NOT NULL)),
    CONSTRAINT m7_deletion_execution_raw_scope_ck CHECK ("mechanism" <> 'RAW_OBJECT_DELETE' OR "targetKind" = 'EVIDENCE_SUBMISSION'),
    CONSTRAINT m7_deletion_execution_purge_scope_ck CHECK ("mechanism" <> 'ROW_PURGE' OR "targetKind" = 'ASSIGNMENT_M7_DATA'),
    CONSTRAINT m7_deletion_execution_budget_ck CHECK (
        "completionBudgetDueAt" > "scheduledAt"
        AND "budgetSatisfied" = ("completionBudgetDueAt" <= "hardDueAt")),
    CONSTRAINT m7_deletion_execution_path_ck CHECK ("generationPath" = 'M7_WORKER_DELETION_V1')
);
CREATE UNIQUE INDEX m7_deletion_execution_one_raw_delete
    ON m7.m7_deletion_execution ("targetSubmissionId") WHERE "mechanism" = 'RAW_OBJECT_DELETE';
CREATE UNIQUE INDEX m7_deletion_execution_one_row_mechanism
    ON m7.m7_deletion_execution ("authorizationId", "mechanism") WHERE "mechanism" <> 'RAW_OBJECT_DELETE';
CREATE INDEX m7_deletion_execution_assignment_idx ON m7.m7_deletion_execution ("assignmentId");
CREATE INDEX m7_deletion_execution_hard_due_idx ON m7.m7_deletion_execution ("hardDueAt");

CREATE TABLE m7.m7_storage_outbox (
    "id"                      UUID           NOT NULL,
    "effectKind"              m7."M7StorageEffectKind" NOT NULL,
    "zone"                    m7."M7ObjectZone" NOT NULL,
    -- routing identity (SI-1): the effect is bound to ONE physical authority, forever
    "backendSha256"           TEXT           NOT NULL,
    -- provenance of the enqueue only. Routing at execution time is resolved fresh by
    -- i_require_routable_profile(backendSha256); nothing trusts this column to route (SI-3, §11.1.4).
    "enqueuedProfileId"       UUID           NOT NULL,
    -- DL-5: the policy every timing and retry parameter of THIS effect is read from, for its whole
    -- life. Never the active manifest's.
    "boundPolicyVersion"      TEXT           NOT NULL,
    "policyBinding"           m7."M7OutboxPolicyBinding" NOT NULL,
    "objectKey"               TEXT           NOT NULL,
    "deletionExecutionId"     UUID,
    "uploadIntentId"          UUID,
    "generationLeaseEpoch"    BIGINT,
    "reconciliationFindingId" UUID,
    "state"                   m7."M7OutboxState" NOT NULL,
    "stateVersion"            BIGINT         NOT NULL,
    -- lifetime attempt count; NEVER reset (DL-6)
    "attempts"                INTEGER        NOT NULL,
    -- the attempt count at which the current budget window opened; raised only by an operator requeue
    "attemptBudgetBase"       INTEGER        NOT NULL,
    -- XF-5: at least the target object's write fence, so no absence proof can race a permitted write
    "notBefore"               TIMESTAMPTZ(6) NOT NULL,
    "nextAttemptAt"           TIMESTAMPTZ(6) NOT NULL,
    "leaseOwner"              TEXT,
    "leaseEpoch"              BIGINT         NOT NULL,
    "leaseExpiresAt"          TIMESTAMPTZ(6),
    "createdAt"               TIMESTAMPTZ(6) NOT NULL,
    "updatedAt"               TIMESTAMPTZ(6) NOT NULL,
    "confirmedAt"             TIMESTAMPTZ(6),
    "generationPath"          TEXT           NOT NULL,
    CONSTRAINT m7_storage_outbox_pkey PRIMARY KEY ("id"),
    -- lets the attempt row composite-FK "this attempt is about this backend"
    CONSTRAINT m7_storage_outbox_id_backend_key UNIQUE ("id", "backendSha256"),
    CONSTRAINT m7_storage_outbox_execution_fkey FOREIGN KEY ("deletionExecutionId")
        REFERENCES m7.m7_deletion_execution ("id") ON DELETE RESTRICT,
    CONSTRAINT m7_storage_outbox_intent_fkey FOREIGN KEY ("uploadIntentId")
        REFERENCES m7.m7_evidence_upload_intent ("id") ON DELETE RESTRICT,
    CONSTRAINT m7_storage_outbox_generation_fkey FOREIGN KEY ("uploadIntentId", "generationLeaseEpoch", "backendSha256")
        REFERENCES m7.m7_canonical_generation ("uploadIntentId", "leaseEpoch", "backendSha256") ON DELETE NO ACTION,
    CONSTRAINT m7_storage_outbox_finding_fkey FOREIGN KEY ("reconciliationFindingId")
        REFERENCES m7.m7_reconciliation_finding ("id") ON DELETE RESTRICT,
    CONSTRAINT m7_storage_outbox_profile_fkey FOREIGN KEY ("enqueuedProfileId", "backendSha256")
        REFERENCES m7.m7_storage_profile ("id", "backendSha256") ON DELETE RESTRICT,
    CONSTRAINT m7_storage_outbox_policy_fkey FOREIGN KEY ("boundPolicyVersion")
        REFERENCES m7.m7_retention_policy ("policyVersion") ON DELETE RESTRICT,
    -- DL-5, declaratively, one foreign key per family. MATCH SIMPLE means each is enforced exactly
    -- when that family's discriminator is non-null, and the basis_ck below makes exactly one non-null.
    CONSTRAINT m7_storage_outbox_bound_execution_fkey FOREIGN KEY ("deletionExecutionId", "boundPolicyVersion")
        REFERENCES m7.m7_deletion_execution ("id", "deadlinePolicyVersion") ON DELETE RESTRICT,
    CONSTRAINT m7_storage_outbox_bound_intent_fkey FOREIGN KEY ("uploadIntentId", "boundPolicyVersion")
        REFERENCES m7.m7_evidence_upload_intent ("id", "retentionPolicyVersion") ON DELETE RESTRICT,
    CONSTRAINT m7_storage_outbox_bound_finding_fkey FOREIGN KEY ("reconciliationFindingId", "boundPolicyVersion")
        REFERENCES m7.m7_reconciliation_finding ("id", "boundPolicyVersion") ON DELETE RESTRICT,
    CONSTRAINT m7_storage_outbox_basis_ck CHECK (
        pg_catalog.num_nonnulls("deletionExecutionId", "uploadIntentId", "reconciliationFindingId") = 1),
    -- the discriminator and the declared binding must agree, so the three FKs above are exhaustive
    CONSTRAINT m7_storage_outbox_binding_ck CHECK (
        ("policyBinding" = 'DELETION_EXECUTION') = ("deletionExecutionId" IS NOT NULL)
        AND ("policyBinding" = 'UPLOAD_INTENT')  = ("uploadIntentId" IS NOT NULL)
        AND ("policyBinding" = 'RECONCILIATION_RUN') = ("reconciliationFindingId" IS NOT NULL)),
    -- a generation epoch is meaningful only for a canonical, intent-based effect
    CONSTRAINT m7_storage_outbox_generation_ck CHECK (
        "generationLeaseEpoch" IS NULL
        OR ("uploadIntentId" IS NOT NULL AND "zone" = 'CANONICAL' AND "generationLeaseEpoch" >= 1)),
    CONSTRAINT m7_storage_outbox_key_ck CHECK (pg_catalog.length("objectKey") BETWEEN 4 AND 1024),
    CONSTRAINT m7_storage_outbox_counters_ck CHECK (
        "attempts" >= 0 AND "leaseEpoch" >= 0 AND "stateVersion" >= 1
        -- DL-6: the budget window can only ever be re-opened at a point already reached
        AND "attemptBudgetBase" >= 0 AND "attemptBudgetBase" <= "attempts"),
    CONSTRAINT m7_storage_outbox_lease_ck CHECK (
        ("state" = 'LEASED') = ("leaseOwner" IS NOT NULL)
        AND ("leaseOwner" IS NULL) = ("leaseExpiresAt" IS NULL)),
    CONSTRAINT m7_storage_outbox_lease_owner_ck CHECK ("leaseOwner" IS NULL OR "leaseOwner" ~ '^[A-Za-z0-9_.:-]{1,128}$'),
    CONSTRAINT m7_storage_outbox_confirmed_ck CHECK (("state" = 'CONFIRMED') = ("confirmedAt" IS NOT NULL)),
    CONSTRAINT m7_storage_outbox_path_ck CHECK (
        "generationPath" IN ('M7_WORKER_UPLOAD_V1','M7_WORKER_DELETION_V1','M7_WORKER_RECONCILIATION_V1'))
);
-- one open effect per key PER BACKEND: the same key on two backends is two different objects
CREATE UNIQUE INDEX m7_storage_outbox_one_open_effect
    ON m7.m7_storage_outbox ("effectKind", "backendSha256", "objectKey") WHERE "state" IN ('PENDING','LEASED');
CREATE INDEX m7_storage_outbox_due_idx ON m7.m7_storage_outbox ("nextAttemptAt")
    WHERE "state" IN ('PENDING','LEASED');
CREATE INDEX m7_storage_outbox_backend_open_idx ON m7.m7_storage_outbox ("backendSha256")
    WHERE "state" <> 'CONFIRMED';

CREATE TABLE m7.m7_storage_outbox_transition (
    "id"           UUID           NOT NULL,
    "outboxId"     UUID           NOT NULL,
    "stateVersion" BIGINT         NOT NULL,
    "fromState"    m7."M7OutboxState",
    "toState"      m7."M7OutboxState" NOT NULL,
    "leaseEpoch"   BIGINT         NOT NULL,
    "attempts"     INTEGER        NOT NULL,
    "writePath"    TEXT           NOT NULL,
    "actor"        NAME           NOT NULL,
    "recordedAt"   TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT m7_storage_outbox_transition_pkey PRIMARY KEY ("id"),
    CONSTRAINT m7_storage_outbox_transition_version_key UNIQUE ("outboxId", "stateVersion"),
    CONSTRAINT m7_storage_outbox_transition_outbox_fkey FOREIGN KEY ("outboxId")
        REFERENCES m7.m7_storage_outbox ("id") ON DELETE RESTRICT
);

CREATE TABLE m7.m7_storage_effect_attempt (
    "id"                     UUID           NOT NULL,
    "outboxId"               UUID           NOT NULL,
    "attemptNo"              INTEGER        NOT NULL,
    "leaseEpoch"             BIGINT         NOT NULL,
    "result"                 m7."M7EffectAttemptResult" NOT NULL,
    -- WHICH authority this attempt actually addressed (SI-3). Composite FK proves backend equality.
    "executingProfileId"     UUID           NOT NULL,
    "executingBackendSha256" TEXT           NOT NULL,
    "providerStatusCode"     INTEGER,
    "attemptedAt"            TIMESTAMPTZ(6) NOT NULL,
    "recordedBy"             NAME           NOT NULL,
    "generationPath"         TEXT           NOT NULL,
    CONSTRAINT m7_storage_effect_attempt_pkey PRIMARY KEY ("id"),
    CONSTRAINT m7_storage_effect_attempt_no_key UNIQUE ("outboxId", "attemptNo"),
    -- THE routing proof: an attempt can only reference its outbox row together with THAT row's backend
    CONSTRAINT m7_storage_effect_attempt_outbox_fkey FOREIGN KEY ("outboxId", "executingBackendSha256")
        REFERENCES m7.m7_storage_outbox ("id", "backendSha256") ON DELETE RESTRICT,
    CONSTRAINT m7_storage_effect_attempt_profile_fkey FOREIGN KEY ("executingProfileId", "executingBackendSha256")
        REFERENCES m7.m7_storage_profile ("id", "backendSha256") ON DELETE RESTRICT,
    CONSTRAINT m7_storage_effect_attempt_counters_ck CHECK ("attemptNo" >= 1 AND "leaseEpoch" >= 1),
    CONSTRAINT m7_storage_effect_attempt_status_ck CHECK ("providerStatusCode" IS NULL OR "providerStatusCode" BETWEEN 100 AND 599),
    CONSTRAINT m7_storage_effect_attempt_path_ck CHECK ("generationPath" = 'M7_WORKER_EFFECT_V1')
);

CREATE TABLE m7.m7_deletion_execution_completion (
    "id"                 UUID           NOT NULL,
    "executionId"        UUID           NOT NULL,
    "confirmingOutboxId" UUID,
    "affectedRowCount"   INTEGER,
    "completedAt"        TIMESTAMPTZ(6) NOT NULL,
    -- DL-7: a completion is never refused for being late, and can never be mistaken for a timely one.
    -- Both are derived from the execution's own bound deadlines by t_completion_coherence.
    "withinCompletionBudget" BOOLEAN    NOT NULL,
    "withinHardDeadline"     BOOLEAN    NOT NULL,
    "completedBy"        NAME           NOT NULL,
    "generationPath"     TEXT           NOT NULL,
    CONSTRAINT m7_deletion_execution_completion_pkey PRIMARY KEY ("id"),
    CONSTRAINT m7_deletion_execution_completion_execution_key UNIQUE ("executionId"),
    CONSTRAINT m7_deletion_execution_completion_execution_fkey FOREIGN KEY ("executionId")
        REFERENCES m7.m7_deletion_execution ("id") ON DELETE RESTRICT,
    CONSTRAINT m7_deletion_execution_completion_outbox_fkey FOREIGN KEY ("confirmingOutboxId")
        REFERENCES m7.m7_storage_outbox ("id") ON DELETE RESTRICT,
    CONSTRAINT m7_deletion_execution_completion_kind_ck CHECK (
        pg_catalog.num_nonnulls("confirmingOutboxId", "affectedRowCount") = 1
        AND ("affectedRowCount" IS NULL OR "affectedRowCount" >= 0)),
    CONSTRAINT m7_deletion_execution_completion_path_ck CHECK (
        "generationPath" IN ('M7_WORKER_EFFECT_V1','M7_ROW_REDACTION_V1','M7_ROW_PURGE_V1'))
);

-- ---------------------------------------------------------------------------------------------
-- OUTBOX REQUEUE RECORD — DL-6. A manual requeue is recovery, not continued compliance, and it is
-- recorded as such. Note that no column resets anything: the outbox keeps its lifetime attempt count
-- and merely opens a new, named budget window.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE m7.m7_outbox_requeue_record (
    "id"                  UUID           NOT NULL,
    "outboxId"            UUID           NOT NULL,
    "requeueSeq"          INTEGER        NOT NULL,
    "attemptsAtRequeue"   INTEGER        NOT NULL,
    "boundPolicyVersion"  TEXT           NOT NULL,
    "budgetExhausted"     BOOLEAN        NOT NULL,
    "pastHardDueAt"       BOOLEAN        NOT NULL,
    "justificationSha256" TEXT           NOT NULL,
    "requestedAt"         TIMESTAMPTZ(6) NOT NULL,
    "requestedBy"         NAME           NOT NULL,
    "generationPath"      TEXT           NOT NULL,
    CONSTRAINT m7_outbox_requeue_record_pkey PRIMARY KEY ("id"),
    CONSTRAINT m7_outbox_requeue_record_seq_key UNIQUE ("outboxId", "requeueSeq"),
    CONSTRAINT m7_outbox_requeue_record_outbox_fkey FOREIGN KEY ("outboxId")
        REFERENCES m7.m7_storage_outbox ("id") ON DELETE RESTRICT,
    CONSTRAINT m7_outbox_requeue_record_policy_fkey FOREIGN KEY ("boundPolicyVersion")
        REFERENCES m7.m7_retention_policy ("policyVersion") ON DELETE RESTRICT,
    CONSTRAINT m7_outbox_requeue_record_counters_ck CHECK ("requeueSeq" >= 1 AND "attemptsAtRequeue" >= 0),
    CONSTRAINT m7_outbox_requeue_record_digest_ck CHECK ("justificationSha256" ~ '^sha256:[0-9a-f]{64}$'),
    CONSTRAINT m7_outbox_requeue_record_path_ck CHECK ("generationPath" = 'M7_WORKER_EFFECT_V1')
);

-- ---------------------------------------------------------------------------------------------
-- DELETION SLA FAILURE — DL-8. A durable, append-only fact that an execution failed its bound
-- budget. It exists so that "the deletion eventually completed" can never be read as "the deletion
-- completed inside its guarantee".
-- ---------------------------------------------------------------------------------------------
CREATE TABLE m7.m7_deletion_sla_failure (
    "id"                 UUID           NOT NULL,
    "executionId"        UUID           NOT NULL,
    "failureKind"        m7."M7SlaFailureKind" NOT NULL,
    "boundPolicyVersion" TEXT           NOT NULL,
    "observedAt"         TIMESTAMPTZ(6) NOT NULL,
    "observedBy"         NAME           NOT NULL,
    "generationPath"     TEXT           NOT NULL,
    CONSTRAINT m7_deletion_sla_failure_pkey PRIMARY KEY ("id"),
    CONSTRAINT m7_deletion_sla_failure_kind_key UNIQUE ("executionId", "failureKind"),
    CONSTRAINT m7_deletion_sla_failure_execution_fkey FOREIGN KEY ("executionId", "boundPolicyVersion")
        REFERENCES m7.m7_deletion_execution ("id", "deadlinePolicyVersion") ON DELETE RESTRICT,
    CONSTRAINT m7_deletion_sla_failure_path_ck CHECK (
        "generationPath" IN ('M7_WORKER_EFFECT_V1','M7_WORKER_DELETION_V1'))
);
CREATE INDEX m7_deletion_sla_failure_execution_idx ON m7.m7_deletion_sla_failure ("executionId");

-- Deferred foreign keys (targets created above)
ALTER TABLE m7.m7_outcome_assertion ADD CONSTRAINT m7_outcome_assertion_redaction_fkey
    FOREIGN KEY ("redactionExecutionId") REFERENCES m7.m7_deletion_execution ("id") ON DELETE RESTRICT;
ALTER TABLE m7.m7_storage_observation ADD CONSTRAINT m7_storage_observation_redaction_fkey
    FOREIGN KEY ("redactionExecutionId") REFERENCES m7.m7_deletion_execution ("id") ON DELETE RESTRICT;

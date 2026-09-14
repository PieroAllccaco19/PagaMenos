CREATE TABLE m7.m7_outcome (
    "id"                UUID           NOT NULL,
    "decisionBindingId" UUID           NOT NULL,
    "assignmentId"      UUID           NOT NULL,
    "createdAt"         TIMESTAMPTZ(6) NOT NULL,
    "generationPath"    TEXT           NOT NULL,
    CONSTRAINT m7_outcome_pkey PRIMARY KEY ("id"),
    CONSTRAINT m7_outcome_binding_key UNIQUE ("decisionBindingId"),
    CONSTRAINT m7_outcome_assignment_id_key UNIQUE ("assignmentId", "id"),
    CONSTRAINT m7_outcome_binding_fkey FOREIGN KEY ("decisionBindingId")
        REFERENCES public.purchase_intent_decision_binding ("id") ON DELETE RESTRICT,
    CONSTRAINT m7_outcome_assignment_fkey FOREIGN KEY ("assignmentId")
        REFERENCES public.experiment_assignment ("id") ON DELETE RESTRICT,
    CONSTRAINT m7_outcome_path_ck CHECK ("generationPath" IN ('M7_RECORD_OUTCOME_ASSERTION_V1','M7_FINALIZE_EVIDENCE_V1'))
);

CREATE TABLE m7.m7_outcome_assertion (
    "id"                        UUID           NOT NULL,
    "outcomeId"                 UUID           NOT NULL,
    "assertionSeq"              INTEGER        NOT NULL,
    "clientCaptureKey"          TEXT           NOT NULL,
    "assertionSchemaVersion"    TEXT           NOT NULL,
    "assertionKind"             m7."M7AssertionKind" NOT NULL,
    "supersedesAssertionId"     UUID,
    "statusLabel"               m7."M7OutcomeStatusLabel",
    "occurrenceAssertion"       m7."M7OccurrenceAssertion",
    "merchantAssertionKind"     m7."M7MerchantAssertionKind",
    "merchantVocabularyVersion" TEXT,
    "merchantRef"               TEXT,
    "eventTimeAssertionKind"    m7."M7EventTimeAssertionKind",
    "assertedEventAt"           TIMESTAMPTZ(6),
    "assertedEventLimaDate"     DATE,
    "participantSessionId"      UUID           NOT NULL,
    "capturedAt"                TIMESTAMPTZ(6) NOT NULL,
    "recordedAt"                TIMESTAMPTZ(6) NOT NULL,
    "generationPath"            TEXT           NOT NULL,
    "redactedAt"                TIMESTAMPTZ(6),
    "redactionExecutionId"      UUID,
    CONSTRAINT m7_outcome_assertion_pkey PRIMARY KEY ("id"),
    CONSTRAINT m7_outcome_assertion_outcome_id_key UNIQUE ("outcomeId", "id"),
    CONSTRAINT m7_outcome_assertion_seq_key UNIQUE ("outcomeId", "assertionSeq"),
    CONSTRAINT m7_outcome_assertion_capture_key UNIQUE ("outcomeId", "clientCaptureKey"),
    CONSTRAINT m7_outcome_assertion_outcome_fkey FOREIGN KEY ("outcomeId")
        REFERENCES m7.m7_outcome ("id") ON DELETE RESTRICT,
    -- same-Outcome supersession, DB-enforced (MATCH SIMPLE: unchecked when supersedesAssertionId IS NULL)
    -- NO ACTION (checked at statement end) so an authorized single-statement purge of a whole chain succeeds
    CONSTRAINT m7_outcome_assertion_supersedes_fkey FOREIGN KEY ("outcomeId", "supersedesAssertionId")
        REFERENCES m7.m7_outcome_assertion ("outcomeId", "id") ON DELETE NO ACTION,
    CONSTRAINT m7_outcome_assertion_merchant_fkey FOREIGN KEY ("merchantVocabularyVersion", "merchantRef")
        REFERENCES m7.m7_merchant_vocabulary_entry ("vocabularyVersion", "merchantRef") ON DELETE RESTRICT,
    CONSTRAINT m7_outcome_assertion_session_fkey FOREIGN KEY ("participantSessionId")
        REFERENCES m7.m7_participant_session ("id") ON DELETE RESTRICT,
    CONSTRAINT m7_outcome_assertion_seq_ck CHECK ("assertionSeq" > 0),
    CONSTRAINT m7_outcome_assertion_capture_ck CHECK ("clientCaptureKey" ~ '^[A-Za-z0-9_-]{16,128}$'),
    CONSTRAINT m7_outcome_assertion_schema_ck CHECK ("assertionSchemaVersion" = 'pagamenos.m7.outcome-assertion.v1'),
    CONSTRAINT m7_outcome_assertion_path_ck CHECK ("generationPath" = 'M7_RECORD_OUTCOME_ASSERTION_V1'),
    CONSTRAINT m7_outcome_assertion_kind_ck CHECK (("assertionKind" = 'ORIGINAL') = ("supersedesAssertionId" IS NULL)),
    CONSTRAINT m7_outcome_assertion_redaction_pair_ck CHECK (("redactedAt" IS NULL) = ("redactionExecutionId" IS NULL)),
    CONSTRAINT m7_outcome_assertion_content_ck CHECK (
        (   -- redacted, or a retraction: no participant payload at all
            ("redactedAt" IS NOT NULL OR "assertionKind" = 'RETRACTION')
            AND "statusLabel" IS NULL AND "occurrenceAssertion" IS NULL
            AND "merchantAssertionKind" IS NULL AND "merchantVocabularyVersion" IS NULL AND "merchantRef" IS NULL
            AND "eventTimeAssertionKind" IS NULL AND "assertedEventAt" IS NULL AND "assertedEventLimaDate" IS NULL
        )
        OR
        (   -- live ORIGINAL / CORRECTION
            "redactedAt" IS NULL AND "assertionKind" <> 'RETRACTION'
            AND "statusLabel" IS NOT NULL AND "occurrenceAssertion" IS NOT NULL
            AND "merchantAssertionKind" IS NOT NULL AND "eventTimeAssertionKind" IS NOT NULL
            AND (("merchantVocabularyVersion" IS NULL) = ("merchantRef" IS NULL))
            AND (("merchantAssertionKind" = 'VOCABULARY_MERCHANT') = ("merchantRef" IS NOT NULL))
            AND (("eventTimeAssertionKind" = 'INSTANT')   = ("assertedEventAt" IS NOT NULL))
            AND (("eventTimeAssertionKind" = 'LIMA_DATE') = ("assertedEventLimaDate" IS NOT NULL))
            AND ("occurrenceAssertion" <> 'NONE'
                 OR ("merchantAssertionKind" = 'NOT_ASSERTED' AND "eventTimeAssertionKind" = 'NOT_ASSERTED'))
        )
    )
);
CREATE UNIQUE INDEX m7_outcome_assertion_single_successor
    ON m7.m7_outcome_assertion ("supersedesAssertionId") WHERE "supersedesAssertionId" IS NOT NULL;
CREATE INDEX m7_outcome_assertion_session_idx ON m7.m7_outcome_assertion ("participantSessionId");

CREATE TABLE m7.m7_outcome_command_receipt (
    "id"                        UUID           NOT NULL,
    "operationScope"            TEXT           NOT NULL,
    "assignmentId"              UUID           NOT NULL,
    "idempotencyKey"            TEXT           NOT NULL,
    "requestHash"               TEXT           NOT NULL,
    "resultKind"                m7."M7OutcomeResultKind" NOT NULL,
    "outcomeId"                 UUID           NOT NULL,
    "assertionId"               UUID           NOT NULL,
    "participantSessionId"      UUID           NOT NULL,
    -- CP facts resolved for THIS operation (§9.5 RP-2). Never inputs to requestHash.
    "resolvedVocabularyVersion" TEXT,
    "resolvedInstallationId"    UUID           NOT NULL,
    "createdAt"                 TIMESTAMPTZ(6) NOT NULL,
    "generationPath"            TEXT           NOT NULL,
    CONSTRAINT m7_outcome_command_receipt_pkey PRIMARY KEY ("id"),
    CONSTRAINT m7_outcome_command_receipt_transport_key UNIQUE ("operationScope", "assignmentId", "idempotencyKey"),
    CONSTRAINT m7_outcome_command_receipt_assertion_fkey FOREIGN KEY ("outcomeId", "assertionId")
        REFERENCES m7.m7_outcome_assertion ("outcomeId", "id") ON DELETE RESTRICT,
    CONSTRAINT m7_outcome_command_receipt_outcome_fkey FOREIGN KEY ("assignmentId", "outcomeId")
        REFERENCES m7.m7_outcome ("assignmentId", "id") ON DELETE RESTRICT,
    CONSTRAINT m7_outcome_command_receipt_session_fkey FOREIGN KEY ("participantSessionId")
        REFERENCES m7.m7_participant_session ("id") ON DELETE RESTRICT,
    CONSTRAINT m7_outcome_command_receipt_vocab_fkey FOREIGN KEY ("resolvedVocabularyVersion")
        REFERENCES m7.m7_merchant_vocabulary ("vocabularyVersion") ON DELETE RESTRICT,
    CONSTRAINT m7_outcome_command_receipt_installation_fkey FOREIGN KEY ("resolvedInstallationId")
        REFERENCES m7.m7_control_plane_installation ("id") ON DELETE RESTRICT,
    CONSTRAINT m7_outcome_command_receipt_scope_ck CHECK ("operationScope" = 'M7_OUTCOME_ASSERTION_RECORD_V1'),
    CONSTRAINT m7_outcome_command_receipt_key_ck CHECK ("idempotencyKey" ~ '^[A-Za-z0-9_-]{16,128}$'),
    CONSTRAINT m7_outcome_command_receipt_hash_ck CHECK ("requestHash" ~ '^sha256:[0-9a-f]{64}$'),
    CONSTRAINT m7_outcome_command_receipt_path_ck CHECK ("generationPath" = 'M7_RECORD_OUTCOME_ASSERTION_V1')
);
-- exactly one originating receipt per assertion: the JBA "M7 idempotency key" (§7.2)
CREATE UNIQUE INDEX m7_outcome_command_receipt_one_origin
    ON m7.m7_outcome_command_receipt ("assertionId") WHERE "resultKind" = 'RECORDED';

-- CCA §30 steps F–G for every M7 sealed operation.
CREATE FUNCTION m7.p_lock_and_prove_assignment_v1(
    p_manifest_sha256 text, p_session_secret bytea, p_participant_id uuid, p_assignment_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
    PERFORM m7.i_assert_control_plane(p_manifest_sha256);
    PERFORM m7.i_lock_owned_assignment(p_assignment_id, p_participant_id);
    PERFORM m7.i_require_session(p_session_secret, p_participant_id);
END
$fn$;

-- Pre-CCA optimistic replay lookup for SO-1 (CCA §28). Read-only.
-- RP-1: the hash is computed from caller material ONLY, so rotation cannot turn a replay into a conflict.
CREATE FUNCTION m7.p_lookup_outcome_receipt_v1(
    p_manifest_sha256 text, p_session_secret bytea, p_participant_id uuid, p_purchase_intent_id uuid,
    p_client_capture_key text, p_idempotency_key text,
    p_assertion_kind m7."M7AssertionKind", p_supersedes_assertion_id uuid,
    p_status_label m7."M7OutcomeStatusLabel", p_occurrence m7."M7OccurrenceAssertion",
    p_merchant_kind m7."M7MerchantAssertionKind", p_merchant_ref text,
    p_event_time_kind m7."M7EventTimeAssertionKind", p_event_at_text text, p_event_lima_date date)
    RETURNS TABLE (lookup_status text, outcome_id uuid, assertion_id uuid, result_kind m7."M7OutcomeResultKind")
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v_asg uuid; v_hash text; v_rc m7.m7_outcome_command_receipt; v_event_at timestamptz;
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
    PERFORM m7.i_assert_control_plane(p_manifest_sha256);
    PERFORM m7.i_require_session(p_session_secret, p_participant_id);
    v_asg := m7.i_assignment_for_intent(p_purchase_intent_id);
    IF v_asg IS NULL OR NOT EXISTS (SELECT 1 FROM public.experiment_assignment a
                                    WHERE a."id" = v_asg AND a."participantId" = p_participant_id) THEN
        RAISE EXCEPTION 'M7_DECISION_NOT_AVAILABLE' USING ERRCODE = 'M7008';
    END IF;
    IF p_event_time_kind = 'INSTANT' AND p_event_at_text ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$' THEN
        v_event_at := p_event_at_text::timestamptz;
    END IF;
    v_hash := m7.i_outcome_request_hash(v_asg, p_purchase_intent_id, p_client_capture_key, p_assertion_kind,
        p_supersedes_assertion_id, p_status_label, p_occurrence, p_merchant_kind, p_merchant_ref,
        p_event_time_kind, v_event_at, p_event_lima_date);
    SELECT * INTO v_rc FROM m7.m7_outcome_command_receipt r
     WHERE r."operationScope" = 'M7_OUTCOME_ASSERTION_RECORD_V1' AND r."assignmentId" = v_asg
       AND r."idempotencyKey" = p_idempotency_key;
    IF v_rc."id" IS NULL THEN
        RETURN QUERY SELECT 'NONE'::text, NULL::uuid, NULL::uuid, NULL::m7."M7OutcomeResultKind";
    ELSIF v_rc."requestHash" = v_hash THEN
        RETURN QUERY SELECT 'MATCH'::text, v_rc."outcomeId", v_rc."assertionId", v_rc."resultKind";
    ELSE
        RETURN QUERY SELECT 'CONFLICT'::text, NULL::uuid, NULL::uuid, NULL::m7."M7OutcomeResultKind";
    END IF;
END
$fn$;

-- SO-1 (§9.2): the single DB function behind executeOutcomeAssertionCollection.
CREATE FUNCTION m7.p_record_outcome_assertion_v1(
    p_manifest_sha256 text, p_session_secret bytea, p_participant_id uuid, p_assignment_id uuid,
    p_purchase_intent_id uuid, p_captured_at timestamptz,
    p_client_capture_key text, p_idempotency_key text,
    p_assertion_kind m7."M7AssertionKind", p_supersedes_assertion_id uuid,
    p_status_label m7."M7OutcomeStatusLabel", p_occurrence m7."M7OccurrenceAssertion",
    p_merchant_kind m7."M7MerchantAssertionKind", p_merchant_ref text,
    p_event_time_kind m7."M7EventTimeAssertionKind", p_event_at_text text, p_event_lima_date date)
    RETURNS TABLE (outcome_id uuid, assertion_id uuid, result_kind m7."M7OutcomeResultKind", replayed boolean)
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE
    v_inst m7.m7_control_plane_installation; v_man m7.m7_control_plane_manifest;
    v_session uuid; v_binding uuid; v_outcome uuid;
    v_event_at timestamptz; v_vocab text; v_hash text; v_origin_hash text; v_now timestamptz;
    v_rc m7.m7_outcome_command_receipt; v_existing uuid; v_new uuid; v_seq integer;
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', 'M7_RECORD_OUTCOME_ASSERTION_V1', true);
    v_inst := m7.i_assert_control_plane(p_manifest_sha256);
    v_man  := m7.i_manifest(v_inst);
    PERFORM m7.i_lock_owned_assignment(p_assignment_id, p_participant_id);         -- lock class 1
    v_session := m7.i_require_session(p_session_secret, p_participant_id);          -- lock class 2
    v_binding := m7.i_binding_for_intent(p_purchase_intent_id, p_assignment_id);

    IF p_client_capture_key !~ '^[A-Za-z0-9_-]{16,128}$' OR p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$'
       OR (p_event_time_kind = 'INSTANT') <> (p_event_at_text IS NOT NULL)
       OR (p_event_at_text IS NOT NULL
           AND p_event_at_text !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$') THEN
        RAISE EXCEPTION 'M7_INVALID_INPUT' USING ERRCODE = 'M7007';
    END IF;
    IF p_event_at_text IS NOT NULL THEN
        v_event_at := p_event_at_text::timestamptz;   -- parsed in PostgreSQL; explicit offset required
    END IF;
    -- CP resolution (RP-4): the vocabulary is derived from the ACTIVE manifest and stored, never hashed.
    v_vocab := CASE WHEN p_merchant_kind = 'VOCABULARY_MERCHANT' THEN v_man."vocabularyVersion" END;
    v_hash  := m7.i_outcome_request_hash(p_assignment_id, p_purchase_intent_id, p_client_capture_key, p_assertion_kind,
                   p_supersedes_assertion_id, p_status_label, p_occurrence, p_merchant_kind, p_merchant_ref,
                   p_event_time_kind, v_event_at, p_event_lima_date);

    INSERT INTO m7.m7_outcome ("id","decisionBindingId","assignmentId","createdAt","generationPath")
    VALUES (pg_catalog.gen_random_uuid(), v_binding, p_assignment_id, pg_catalog.clock_timestamp(), 'M7_RECORD_OUTCOME_ASSERTION_V1')
    ON CONFLICT ("decisionBindingId") DO NOTHING;
    SELECT o."id" INTO STRICT v_outcome FROM m7.m7_outcome o WHERE o."decisionBindingId" = v_binding FOR UPDATE;  -- class 3

    -- transport replay (in-transaction recheck, CCA §28)
    SELECT * INTO v_rc FROM m7.m7_outcome_command_receipt r
     WHERE r."operationScope" = 'M7_OUTCOME_ASSERTION_RECORD_V1' AND r."assignmentId" = p_assignment_id
       AND r."idempotencyKey" = p_idempotency_key;
    IF v_rc."id" IS NOT NULL THEN
        IF v_rc."requestHash" <> v_hash THEN
            RAISE EXCEPTION 'M7_IDEMPOTENCY_CONFLICT' USING ERRCODE = 'M7001';
        END IF;
        PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
        RETURN QUERY SELECT v_rc."outcomeId", v_rc."assertionId", v_rc."resultKind", true;   -- RS from history (RP-3)
        RETURN;
    END IF;

    -- domain identity (different transport key)
    SELECT a."id" INTO v_existing FROM m7.m7_outcome_assertion a
     WHERE a."outcomeId" = v_outcome AND a."clientCaptureKey" = p_client_capture_key;
    IF v_existing IS NOT NULL THEN
        SELECT r."requestHash" INTO STRICT v_origin_hash FROM m7.m7_outcome_command_receipt r
         WHERE r."assertionId" = v_existing AND r."resultKind" = 'RECORDED';
        IF v_origin_hash <> v_hash THEN
            RAISE EXCEPTION 'M7_DOMAIN_CONFLICT' USING ERRCODE = 'M7002';
        END IF;
        INSERT INTO m7.m7_outcome_command_receipt
            ("id","operationScope","assignmentId","idempotencyKey","requestHash","resultKind","outcomeId","assertionId",
             "participantSessionId","resolvedVocabularyVersion","resolvedInstallationId","createdAt","generationPath")
        VALUES (pg_catalog.gen_random_uuid(), 'M7_OUTCOME_ASSERTION_RECORD_V1', p_assignment_id, p_idempotency_key, v_hash,
                'CAPTURE_ALIAS', v_outcome, v_existing, v_session, v_vocab, v_inst."id",
                pg_catalog.clock_timestamp(), 'M7_RECORD_OUTCOME_ASSERTION_V1');
        PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
        RETURN QUERY SELECT v_outcome, v_existing, 'CAPTURE_ALIAS'::m7."M7OutcomeResultKind", false;
        RETURN;
    END IF;

    IF p_supersedes_assertion_id IS NOT NULL AND EXISTS (
         SELECT 1 FROM m7.m7_outcome_assertion a WHERE a."supersedesAssertionId" = p_supersedes_assertion_id) THEN
        RAISE EXCEPTION 'M7_CORRECTION_TARGET_ALREADY_SUPERSEDED' USING ERRCODE = 'M7003';
    END IF;

    SELECT COALESCE(pg_catalog.max(a."assertionSeq"), 0) + 1 INTO v_seq
      FROM m7.m7_outcome_assertion a WHERE a."outcomeId" = v_outcome;
    v_new := pg_catalog.gen_random_uuid();
    v_now := pg_catalog.clock_timestamp();
    INSERT INTO m7.m7_outcome_assertion
        ("id","outcomeId","assertionSeq","clientCaptureKey","assertionSchemaVersion","assertionKind","supersedesAssertionId",
         "statusLabel","occurrenceAssertion","merchantAssertionKind","merchantVocabularyVersion","merchantRef",
         "eventTimeAssertionKind","assertedEventAt","assertedEventLimaDate","participantSessionId",
         "capturedAt","recordedAt","generationPath","redactedAt","redactionExecutionId")
    VALUES (v_new, v_outcome, v_seq, p_client_capture_key, 'pagamenos.m7.outcome-assertion.v1', p_assertion_kind,
            p_supersedes_assertion_id, p_status_label, p_occurrence, p_merchant_kind, v_vocab, p_merchant_ref,
            p_event_time_kind, v_event_at, p_event_lima_date, v_session,
            p_captured_at, v_now, 'M7_RECORD_OUTCOME_ASSERTION_V1', NULL, NULL);
    INSERT INTO m7.m7_outcome_command_receipt
        ("id","operationScope","assignmentId","idempotencyKey","requestHash","resultKind","outcomeId","assertionId",
         "participantSessionId","resolvedVocabularyVersion","resolvedInstallationId","createdAt","generationPath")
    VALUES (pg_catalog.gen_random_uuid(), 'M7_OUTCOME_ASSERTION_RECORD_V1', p_assignment_id, p_idempotency_key, v_hash,
            'RECORDED', v_outcome, v_new, v_session, v_vocab, v_inst."id", v_now, 'M7_RECORD_OUTCOME_ASSERTION_V1');

    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
    RETURN QUERY SELECT v_outcome, v_new, 'RECORDED'::m7."M7OutcomeResultKind", false;
END
$fn$;

-- SO-2 (§9.2): executeEvidenceUploadAuthorization.
-- RP-3: a replay returns the intent's OWN transport and staging key, not the active manifest's.
CREATE FUNCTION m7.p_begin_evidence_upload_v1(
    p_manifest_sha256 text, p_session_secret bytea, p_participant_id uuid, p_assignment_id uuid,
    p_purchase_intent_id uuid, p_captured_at timestamptz, p_client_correlation_nonce text)
    RETURNS TABLE (upload_intent_id uuid, staging_object_key text, upload_expires_at text, max_bytes integer,
                   intent_state m7."M7UploadIntentState", upload_transport m7."M7UploadTransport",
                   storage_profile_version text, credential_profile_id text)
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE
    v_inst m7.m7_control_plane_installation; v_man m7.m7_control_plane_manifest; v_pol m7.m7_retention_policy;
    v_pr m7.m7_storage_profile; v_be m7.m7_storage_backend; v_bound m7.m7_storage_profile;
    v_session uuid; v_binding uuid; v_i m7.m7_evidence_upload_intent;
    v_id uuid := pg_catalog.gen_random_uuid(); v_now timestamptz;
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', 'M7_BEGIN_EVIDENCE_UPLOAD_V1', true);
    v_inst := m7.i_assert_control_plane(p_manifest_sha256);
    v_man  := m7.i_manifest(v_inst);
    v_pol  := m7.i_policy(v_man);
    PERFORM m7.i_lock_owned_assignment(p_assignment_id, p_participant_id);
    v_session := m7.i_require_session(p_session_secret, p_participant_id);
    v_binding := m7.i_binding_for_intent(p_purchase_intent_id, p_assignment_id);
    IF p_client_correlation_nonce !~ '^[A-Za-z0-9_-]{22,128}$' THEN
        RAISE EXCEPTION 'M7_INVALID_INPUT' USING ERRCODE = 'M7007';
    END IF;

    SELECT * INTO v_i FROM m7.m7_evidence_upload_intent i
     WHERE i."decisionBindingId" = v_binding AND i."clientCorrelationNonce" = p_client_correlation_nonce;
    IF v_i."id" IS NULL THEN
        v_pr := m7.i_active_storage_profile(v_man);                  -- SI-2: bind the ACTIVE profile, once
        -- WC-1 / BL-2: class 10, taken LAST, immediately before the creating INSERT. An ISSUED intent is
        -- a new obligation on this backend (drain classes 2, 5 and 7). THIS IS THE PATH ROUND 2's RC-19
        -- CLAIMED WAS SERIALIZED AND WAS NOT: it read the active profile and the backend row and
        -- inserted, without ever taking the lock c_retire_* held. §11.10.1(b), §11.10.6.
        v_be := m7.i_hold_backend_liveness(v_pr."backendSha256");
        v_now := pg_catalog.clock_timestamp();
        INSERT INTO m7.m7_evidence_upload_intent
            ("id","decisionBindingId","assignmentId","participantSessionId","clientCorrelationNonce",
             "issuanceProfileId","backendSha256","stagingObjectKey","maxBytes","mediaPolicyVersion","issuedAt",
             "uploadExpiresAt","intentDeadlineAt","stagingWriteFenceAt","capturedAt","retentionPolicyVersion",
             "installationId","generationPath","state","stateVersion","leaseOwner","leaseEpoch","leaseExpiresAt",
             "acceptedLeaseEpoch","rejectionReason","failureReason","updatedAt")
        VALUES (v_id, v_binding, p_assignment_id, v_session, p_client_correlation_nonce,
                v_pr."id", v_pr."backendSha256",
                v_be."stagingPrefix" || v_id::text || '/' || pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', ''),
                v_pol."maxUploadBytes", v_pol."mediaPolicyVersion", v_now, v_now + v_pol."uploadUrlTtl",
                v_now + v_pol."uploadUrlTtl" + v_pol."finalizeWindow",
                -- SI-5: the staging write fence, derived from THIS backend's W and THIS policy's skew
                v_now + v_pol."uploadUrlTtl" + v_be."providerWriteCompletionWindow" + v_pol."writeFenceSkewAllowance",
                p_captured_at, v_pol."policyVersion", v_inst."id",
                'M7_BEGIN_EVIDENCE_UPLOAD_V1', 'ISSUED', 1, NULL, 0, NULL, NULL, NULL, NULL, v_now)
        RETURNING * INTO v_i;
    END IF;

    -- SI-1 / RP-3: the RESULT is derived from the intent's own ISSUANCE profile, whatever the active
    -- manifest now says. This is the one place the issuance profile is authoritative (EP-8).
    SELECT * INTO STRICT v_bound FROM m7.m7_storage_profile WHERE "id" = v_i."issuanceProfileId";
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
    RETURN QUERY SELECT v_i."id", v_i."stagingObjectKey", m7.i_ts(v_i."uploadExpiresAt"), v_i."maxBytes",
                        v_i."state", v_bound."uploadTransport", v_bound."storageProfileVersion",
                        v_bound."credentialProfileId";
END
$fn$;

-- Pre-CCA optimistic replay lookup for SO-3. Read-only.
CREATE FUNCTION m7.p_lookup_evidence_receipt_v1(
    p_manifest_sha256 text, p_session_secret bytea, p_participant_id uuid, p_upload_intent_id uuid,
    p_client_capture_key text, p_idempotency_key text, p_supersedes_evidence_id uuid)
    RETURNS TABLE (lookup_status text, submission_id uuid, result_kind m7."M7EvidenceResultKind")
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v_asg uuid; v_hash text; v_rc m7.m7_evidence_submission_receipt;
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
    PERFORM m7.i_assert_control_plane(p_manifest_sha256);
    PERFORM m7.i_require_session(p_session_secret, p_participant_id);
    SELECT i."assignmentId" INTO v_asg FROM m7.m7_evidence_upload_intent i
      JOIN public.experiment_assignment a ON a."id" = i."assignmentId"
     WHERE i."id" = p_upload_intent_id AND a."participantId" = p_participant_id;
    IF v_asg IS NULL THEN
        RAISE EXCEPTION 'M7_UPLOAD_INTENT_NOT_CONSUMABLE' USING ERRCODE = 'M7004';
    END IF;
    v_hash := m7.i_evidence_request_hash(v_asg, p_upload_intent_id, p_client_capture_key, p_supersedes_evidence_id);
    SELECT * INTO v_rc FROM m7.m7_evidence_submission_receipt r
     WHERE r."operationScope" = 'M7_EVIDENCE_SUBMISSION_V1' AND r."assignmentId" = v_asg
       AND r."idempotencyKey" = p_idempotency_key;
    IF v_rc."id" IS NULL THEN
        RETURN QUERY SELECT 'NONE'::text, NULL::uuid, NULL::m7."M7EvidenceResultKind";
    ELSIF v_rc."requestHash" = v_hash THEN
        RETURN QUERY SELECT 'MATCH'::text, v_rc."submissionId", v_rc."resultKind";
    ELSE
        RETURN QUERY SELECT 'CONFLICT'::text, NULL::uuid, NULL::m7."M7EvidenceResultKind";
    END IF;
END
$fn$;

-- SO-3 (§9.2): executeSavingEvidenceCollection. Consumes the one-use upload intent (U8).
CREATE FUNCTION m7.p_finalize_evidence_submission_v1(
    p_manifest_sha256 text, p_session_secret bytea, p_participant_id uuid, p_assignment_id uuid,
    p_upload_intent_id uuid, p_captured_at timestamptz,
    p_client_capture_key text, p_idempotency_key text, p_supersedes_evidence_id uuid)
    RETURNS TABLE (outcome_id uuid, submission_id uuid, result_kind m7."M7EvidenceResultKind", replayed boolean)
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE
    v_inst m7.m7_control_plane_installation;
    v_session uuid; v_binding uuid; v_outcome uuid; v_hash text; v_origin_hash text; v_now timestamptz;
    v_i m7.m7_evidence_upload_intent; v_g m7.m7_canonical_generation; v_pol m7.m7_retention_policy;
    v_rc m7.m7_evidence_submission_receipt; v_existing uuid; v_obs uuid; v_seq integer; v_new uuid;
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', 'M7_FINALIZE_EVIDENCE_V1', true);
    v_inst := m7.i_assert_control_plane(p_manifest_sha256);
    PERFORM m7.i_lock_owned_assignment(p_assignment_id, p_participant_id);         -- lock class 1
    v_session := m7.i_require_session(p_session_secret, p_participant_id);          -- lock class 2
    IF p_client_capture_key !~ '^[A-Za-z0-9_-]{16,128}$' OR p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$' THEN
        RAISE EXCEPTION 'M7_INVALID_INPUT' USING ERRCODE = 'M7007';
    END IF;
    SELECT i."decisionBindingId" INTO v_binding FROM m7.m7_evidence_upload_intent i
     WHERE i."id" = p_upload_intent_id AND i."assignmentId" = p_assignment_id;
    IF v_binding IS NULL THEN
        RAISE EXCEPTION 'M7_UPLOAD_INTENT_NOT_CONSUMABLE' USING ERRCODE = 'M7004';
    END IF;
    v_hash := m7.i_evidence_request_hash(p_assignment_id, p_upload_intent_id, p_client_capture_key, p_supersedes_evidence_id);

    INSERT INTO m7.m7_outcome ("id","decisionBindingId","assignmentId","createdAt","generationPath")
    VALUES (pg_catalog.gen_random_uuid(), v_binding, p_assignment_id, pg_catalog.clock_timestamp(), 'M7_FINALIZE_EVIDENCE_V1')
    ON CONFLICT ("decisionBindingId") DO NOTHING;
    SELECT o."id" INTO STRICT v_outcome FROM m7.m7_outcome o WHERE o."decisionBindingId" = v_binding FOR UPDATE;   -- class 3
    SELECT * INTO STRICT v_i FROM m7.m7_evidence_upload_intent i WHERE i."id" = p_upload_intent_id FOR UPDATE;      -- class 4
    -- WC-4 / BL-2: P2, class 10. SO-3 creates the live m7_evidence_artifact, which is drain class 1 -- the
    -- heaviest obligation M7 can put on a backend. Taken after the class-4 intent lock, before the
    -- receipt read, so the whole finalize is serialized against retirement of the intent's backend.
    PERFORM m7.i_hold_backend_liveness(v_i."backendSha256");

    SELECT * INTO v_rc FROM m7.m7_evidence_submission_receipt r
     WHERE r."operationScope" = 'M7_EVIDENCE_SUBMISSION_V1' AND r."assignmentId" = p_assignment_id
       AND r."idempotencyKey" = p_idempotency_key;
    IF v_rc."id" IS NOT NULL THEN
        IF v_rc."requestHash" <> v_hash THEN
            RAISE EXCEPTION 'M7_IDEMPOTENCY_CONFLICT' USING ERRCODE = 'M7001';
        END IF;
        PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
        RETURN QUERY SELECT v_outcome, v_rc."submissionId", v_rc."resultKind", true;
        RETURN;
    END IF;

    SELECT s."id" INTO v_existing FROM m7.m7_evidence_submission s WHERE s."uploadIntentId" = p_upload_intent_id;
    IF v_existing IS NOT NULL THEN
        SELECT r."requestHash" INTO STRICT v_origin_hash FROM m7.m7_evidence_submission_receipt r
         WHERE r."submissionId" = v_existing AND r."resultKind" = 'SUBMITTED';
        IF v_origin_hash <> v_hash THEN
            RAISE EXCEPTION 'M7_DOMAIN_CONFLICT' USING ERRCODE = 'M7002';
        END IF;
        INSERT INTO m7.m7_evidence_submission_receipt
            ("id","operationScope","assignmentId","idempotencyKey","requestHash","resultKind","submissionId",
             "participantSessionId","resolvedActiveProfileId","resolvedInstallationId","createdAt","generationPath")
        VALUES (pg_catalog.gen_random_uuid(), 'M7_EVIDENCE_SUBMISSION_V1', p_assignment_id, p_idempotency_key, v_hash,
                'SUBMISSION_ALIAS', v_existing, v_session, v_i."issuanceProfileId", v_inst."id",
                pg_catalog.clock_timestamp(), 'M7_FINALIZE_EVIDENCE_V1');
        PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
        RETURN QUERY SELECT v_outcome, v_existing, 'SUBMISSION_ALIAS'::m7."M7EvidenceResultKind", false;
        RETURN;
    END IF;

    IF EXISTS (SELECT 1 FROM m7.m7_evidence_submission s
                WHERE s."outcomeId" = v_outcome AND s."clientCaptureKey" = p_client_capture_key) THEN
        RAISE EXCEPTION 'M7_DOMAIN_CONFLICT' USING ERRCODE = 'M7002';
    END IF;
    IF v_i."state" <> 'VALIDATED' OR v_i."acceptedLeaseEpoch" IS NULL
       OR pg_catalog.clock_timestamp() >= v_i."intentDeadlineAt" THEN
        RAISE EXCEPTION 'M7_UPLOAD_INTENT_NOT_CONSUMABLE' USING ERRCODE = 'M7004';
    END IF;
    IF p_supersedes_evidence_id IS NOT NULL AND EXISTS (
         SELECT 1 FROM m7.m7_evidence_submission s WHERE s."supersedesEvidenceId" = p_supersedes_evidence_id) THEN
        RAISE EXCEPTION 'M7_CORRECTION_TARGET_ALREADY_SUPERSEDED' USING ERRCODE = 'M7003';
    END IF;

    SELECT * INTO STRICT v_g FROM m7.m7_canonical_generation                                                     -- class 5
     WHERE "uploadIntentId" = p_upload_intent_id AND "leaseEpoch" = v_i."acceptedLeaseEpoch";
    SELECT ob."id" INTO STRICT v_obs FROM m7.m7_storage_observation ob WHERE ob."uploadIntentId" = p_upload_intent_id;
    SELECT * INTO STRICT v_pol FROM m7.m7_retention_policy WHERE "policyVersion" = v_i."retentionPolicyVersion";
    SELECT COALESCE(pg_catalog.max(s."evidenceSeq"), 0) + 1 INTO v_seq
      FROM m7.m7_evidence_submission s WHERE s."outcomeId" = v_outcome;
    v_new := pg_catalog.gen_random_uuid();
    v_now := pg_catalog.clock_timestamp();

    INSERT INTO m7.m7_evidence_submission
        ("id","outcomeId","assignmentId","evidenceSeq","uploadIntentId","observationId","clientCaptureKey",
         "supersedesEvidenceId","participantSessionId","retentionPolicyVersion","capturedAt","recordedAt",
         "rawDeleteScheduleByAt","rawDeleteHardDueAt","generationPath")
    VALUES (v_new, v_outcome, p_assignment_id, v_seq, p_upload_intent_id, v_obs, p_client_capture_key,
            p_supersedes_evidence_id, v_session, v_i."retentionPolicyVersion", p_captured_at, v_now,
            v_now + v_pol."rawDeleteScheduleAfterNeverVerified", v_now + v_pol."rawDeleteHardDeadlineNeverVerified",
            'M7_FINALIZE_EVIDENCE_V1');
    INSERT INTO m7.m7_evidence_artifact
        ("submissionId","uploadIntentId","acceptedLeaseEpoch","canonicalObjectKey","acceptedExecutingProfileId","backendSha256",
         "state","stateVersion","updatedAt","deletedConfirmedAt","generationPath")
    -- EP-5: the artifact's profile comes from the ACCEPTED GENERATION, never from the intent
    VALUES (v_new, p_upload_intent_id, v_i."acceptedLeaseEpoch", v_g."canonicalObjectKey", v_g."executingProfileId",
            v_i."backendSha256", 'AVAILABLE', 1, v_now, NULL, 'M7_FINALIZE_EVIDENCE_V1');                          -- class 7
    UPDATE m7.m7_evidence_upload_intent
       SET "state" = 'CONSUMED', "stateVersion" = "stateVersion" + 1, "updatedAt" = v_now
     WHERE "id" = p_upload_intent_id;
    INSERT INTO m7.m7_evidence_submission_receipt
        ("id","operationScope","assignmentId","idempotencyKey","requestHash","resultKind","submissionId",
         "participantSessionId","resolvedActiveProfileId","resolvedInstallationId","createdAt","generationPath")
    VALUES (pg_catalog.gen_random_uuid(), 'M7_EVIDENCE_SUBMISSION_V1', p_assignment_id, p_idempotency_key, v_hash,
            'SUBMITTED', v_new, v_session, v_i."issuanceProfileId", v_inst."id", v_now, 'M7_FINALIZE_EVIDENCE_V1');

    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
    RETURN QUERY SELECT v_outcome, v_new, 'SUBMITTED'::m7."M7EvidenceResultKind", false;
END
$fn$;

-- --- generic guards -------------------------------------------------------------------------

CREATE FUNCTION m7.t_guard_insert() RETURNS trigger
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE
    v_path text := pg_catalog.current_setting('pagamenos.m7.write_path', true);
BEGIN
    IF current_user <> 'pagamenos_m7_owner'::name THEN
        RAISE EXCEPTION 'M7_GUARD: INSERT on m7.% requires owner context', TG_TABLE_NAME USING ERRCODE = '42501';
    END IF;
    IF v_path IS NULL OR v_path = '' OR NOT (v_path = ANY (TG_ARGV)) THEN
        RAISE EXCEPTION 'M7_GUARD: write path % not permitted for INSERT on m7.%',
            COALESCE(v_path, '<unset>'), TG_TABLE_NAME USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END
$fn$;

CREATE FUNCTION m7.t_forbid_mutation() RETURNS trigger
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
BEGIN
    IF TG_OP = 'DELETE'
       AND TG_ARGV[0] = 'PURGEABLE'
       AND current_user = 'pagamenos_m7_owner'::name
       AND pg_catalog.current_setting('pagamenos.m7.write_path', true) = 'M7_ROW_PURGE_V1' THEN
        RETURN OLD;
    END IF;
    RAISE EXCEPTION 'M7_IMMUTABLE: % is forbidden on m7.%', TG_OP, TG_TABLE_NAME USING ERRCODE = 'restrict_violation';
END
$fn$;

-- --- control-plane identity guards: one-way retirement only ----------------------------------

CREATE FUNCTION m7.t_storage_backend_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
BEGIN
    IF current_user <> 'pagamenos_m7_owner'::name
       OR pg_catalog.current_setting('pagamenos.m7.write_path', true) IS DISTINCT FROM 'M7_CONTROL_PLANE_INSTALL_V1'
       OR OLD."retiredAt" IS NOT NULL OR NEW."retiredAt" IS NULL
       OR (NEW."backendSha256", NEW."providerClass", NEW."containerId", NEW."regionId", NEW."endpointIdentity",
           NEW."stagingPrefix", NEW."evidencePrefix", NEW."registeredAt", NEW."registeredBy", NEW."generationPath")
          IS DISTINCT FROM
          (OLD."backendSha256", OLD."providerClass", OLD."containerId", OLD."regionId", OLD."endpointIdentity",
           OLD."stagingPrefix", OLD."evidencePrefix", OLD."registeredAt", OLD."registeredBy", OLD."generationPath") THEN
        RAISE EXCEPTION 'M7_CONTROL_PLANE: a storage backend may only be retired once, never altered'
            USING ERRCODE = 'restrict_violation';
    END IF;
    RETURN NEW;
END
$fn$;

CREATE FUNCTION m7.t_storage_profile_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
BEGIN
    IF current_user <> 'pagamenos_m7_owner'::name
       OR pg_catalog.current_setting('pagamenos.m7.write_path', true) IS DISTINCT FROM 'M7_CONTROL_PLANE_INSTALL_V1'
       OR OLD."retiredAt" IS NOT NULL OR NEW."retiredAt" IS NULL
       OR (NEW."id", NEW."storageProfileVersion", NEW."profileSha256", NEW."backendSha256",
           NEW."credentialProfileId", NEW."credentialGeneration", NEW."uploadTransport",
           NEW."decoderGeneration", NEW."encoderGeneration", NEW."storageCapabilityVersion",
           NEW."conditionalCreateMode", NEW."registeredAt", NEW."registeredBy", NEW."generationPath")
          IS DISTINCT FROM
          (OLD."id", OLD."storageProfileVersion", OLD."profileSha256", OLD."backendSha256",
           OLD."credentialProfileId", OLD."credentialGeneration", OLD."uploadTransport",
           OLD."decoderGeneration", OLD."encoderGeneration", OLD."storageCapabilityVersion",
           OLD."conditionalCreateMode", OLD."registeredAt", OLD."registeredBy", OLD."generationPath") THEN
        RAISE EXCEPTION 'M7_CONTROL_PLANE: a storage profile may only be retired once, never altered'
            USING ERRCODE = 'restrict_violation';
    END IF;
    RETURN NEW;
END
$fn$;

CREATE FUNCTION m7.t_installation_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
BEGIN
    IF current_user <> 'pagamenos_m7_owner'::name
       OR pg_catalog.current_setting('pagamenos.m7.write_path', true) IS DISTINCT FROM 'M7_CONTROL_PLANE_INSTALL_V1'
       OR OLD."retiredAt" IS NOT NULL OR NEW."retiredAt" IS NULL
       OR (NEW."id", NEW."installationSeq", NEW."manifestVersion", NEW."installedAt", NEW."installedBy",
           NEW."generationPath")
          IS DISTINCT FROM
          (OLD."id", OLD."installationSeq", OLD."manifestVersion", OLD."installedAt", OLD."installedBy",
           OLD."generationPath") THEN
        RAISE EXCEPTION 'M7_CONTROL_PLANE: installation rows may only be retired once' USING ERRCODE = 'restrict_violation';
    END IF;
    RETURN NEW;
END
$fn$;

-- --- redaction guards (the only in-place change to fact rows) --------------------------------

CREATE FUNCTION m7.t_assertion_redaction_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
BEGIN
    IF current_user <> 'pagamenos_m7_owner'::name
       OR pg_catalog.current_setting('pagamenos.m7.write_path', true) IS DISTINCT FROM 'M7_ROW_REDACTION_V1' THEN
        RAISE EXCEPTION 'M7_IMMUTABLE: UPDATE is forbidden on m7.m7_outcome_assertion' USING ERRCODE = 'restrict_violation';
    END IF;
    IF OLD."redactedAt" IS NOT NULL OR NEW."redactedAt" IS NULL THEN
        RAISE EXCEPTION 'M7_REDACTION: redaction is one-way and single' USING ERRCODE = 'restrict_violation';
    END IF;
    IF (NEW."id", NEW."outcomeId", NEW."assertionSeq", NEW."clientCaptureKey", NEW."assertionSchemaVersion",
        NEW."assertionKind", NEW."supersedesAssertionId", NEW."participantSessionId", NEW."capturedAt",
        NEW."recordedAt", NEW."generationPath")
       IS DISTINCT FROM
       (OLD."id", OLD."outcomeId", OLD."assertionSeq", OLD."clientCaptureKey", OLD."assertionSchemaVersion",
        OLD."assertionKind", OLD."supersedesAssertionId", OLD."participantSessionId", OLD."capturedAt",
        OLD."recordedAt", OLD."generationPath") THEN
        RAISE EXCEPTION 'M7_REDACTION: identity and provenance columns are immutable' USING ERRCODE = 'restrict_violation';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM m7.m7_deletion_execution e
                   JOIN m7.m7_outcome o ON o."id" = NEW."outcomeId"
                   WHERE e."id" = NEW."redactionExecutionId" AND e."mechanism" = 'ROW_REDACT'
                     AND e."targetKind" = 'ASSIGNMENT_M7_DATA' AND e."assignmentId" = o."assignmentId") THEN
        RAISE EXCEPTION 'M7_REDACTION: no in-scope ROW_REDACT execution' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;  -- payload nullness is enforced by m7_outcome_assertion_content_ck
END
$fn$;

CREATE FUNCTION m7.t_observation_redaction_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
BEGIN
    IF current_user <> 'pagamenos_m7_owner'::name
       OR pg_catalog.current_setting('pagamenos.m7.write_path', true) IS DISTINCT FROM 'M7_ROW_REDACTION_V1' THEN
        RAISE EXCEPTION 'M7_IMMUTABLE: UPDATE is forbidden on m7.m7_storage_observation' USING ERRCODE = 'restrict_violation';
    END IF;
    IF OLD."redactedAt" IS NOT NULL OR NEW."redactedAt" IS NULL THEN
        RAISE EXCEPTION 'M7_REDACTION: redaction is one-way and single' USING ERRCODE = 'restrict_violation';
    END IF;
    IF (NEW."id", NEW."uploadIntentId", NEW."leaseEpoch", NEW."objectKey", NEW."executingProfileId",
        NEW."backendSha256", NEW."observedAt", NEW."observedBy", NEW."generationPath")
       IS DISTINCT FROM
       (OLD."id", OLD."uploadIntentId", OLD."leaseEpoch", OLD."objectKey", OLD."executingProfileId",
        OLD."backendSha256", OLD."observedAt", OLD."observedBy", OLD."generationPath") THEN
        RAISE EXCEPTION 'M7_REDACTION: identity, provenance and storage-binding columns are immutable'
            USING ERRCODE = 'restrict_violation';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM m7.m7_deletion_execution e
                   JOIN m7.m7_evidence_upload_intent i ON i."id" = NEW."uploadIntentId"
                   LEFT JOIN m7.m7_evidence_submission s ON s."uploadIntentId" = i."id"
                   WHERE e."id" = NEW."redactionExecutionId" AND e."mechanism" = 'ROW_REDACT'
                     AND e."assignmentId" = i."assignmentId"
                     AND (e."targetKind" = 'ASSIGNMENT_M7_DATA' OR e."targetSubmissionId" = s."id")) THEN
        RAISE EXCEPTION 'M7_REDACTION: no in-scope ROW_REDACT execution' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END
$fn$;

-- --- state-machine guards -----------------------------------------------------------------------

CREATE FUNCTION m7.t_upload_intent_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE
    v_path text := pg_catalog.current_setting('pagamenos.m7.write_path', true);
    v_now  timestamptz := pg_catalog.clock_timestamp();
    v_withdrawn boolean;
    v_ok   boolean := false;
BEGIN
    IF current_user <> 'pagamenos_m7_owner'::name THEN
        RAISE EXCEPTION 'M7_GUARD: UPDATE on m7.m7_evidence_upload_intent requires owner context' USING ERRCODE = '42501';
    END IF;
    IF (NEW."id", NEW."decisionBindingId", NEW."assignmentId", NEW."participantSessionId", NEW."clientCorrelationNonce",
        NEW."issuanceProfileId", NEW."backendSha256", NEW."stagingObjectKey", NEW."maxBytes", NEW."mediaPolicyVersion",
        NEW."issuedAt", NEW."uploadExpiresAt", NEW."intentDeadlineAt", NEW."stagingWriteFenceAt", NEW."capturedAt",
        NEW."retentionPolicyVersion", NEW."installationId", NEW."generationPath")
       IS DISTINCT FROM
       (OLD."id", OLD."decisionBindingId", OLD."assignmentId", OLD."participantSessionId", OLD."clientCorrelationNonce",
        OLD."issuanceProfileId", OLD."backendSha256", OLD."stagingObjectKey", OLD."maxBytes", OLD."mediaPolicyVersion",
        OLD."issuedAt", OLD."uploadExpiresAt", OLD."intentDeadlineAt", OLD."stagingWriteFenceAt", OLD."capturedAt",
        OLD."retentionPolicyVersion", OLD."installationId", OLD."generationPath") THEN
        RAISE EXCEPTION 'M7_STATE: immutable upload-intent columns changed (issuance binding and staging fence included)'
            USING ERRCODE = 'restrict_violation';
    END IF;
    IF NEW."stateVersion" <> OLD."stateVersion" + 1 THEN
        RAISE EXCEPTION 'M7_STATE: stateVersion must advance by exactly 1' USING ERRCODE = 'restrict_violation';
    END IF;
    -- GF-5: acceptedLeaseEpoch is written exactly once, only by U5, and never changed afterwards
    IF v_path IS DISTINCT FROM 'M7_WORKER_UPLOAD_V1' OR OLD."state" IS DISTINCT FROM 'PROCESSING'
       OR NEW."state" IS DISTINCT FROM 'VALIDATED' THEN
        IF NEW."acceptedLeaseEpoch" IS DISTINCT FROM OLD."acceptedLeaseEpoch" THEN
            RAISE EXCEPTION 'M7_STATE: acceptedLeaseEpoch may only be set by the U5 transition'
                USING ERRCODE = 'restrict_violation';
        END IF;
    END IF;
    v_withdrawn := EXISTS (SELECT 1 FROM public.study_consent_event ce
                           WHERE ce."assignmentId" = OLD."assignmentId" AND ce."action" = 'WITHDRAWN');

    IF v_path = 'M7_WORKER_UPLOAD_V1' THEN
        v_ok :=
            (OLD."state" = 'ISSUED' AND NEW."state" = 'PROCESSING'                               -- U2
                AND NEW."leaseEpoch" = OLD."leaseEpoch" + 1 AND v_now < OLD."intentDeadlineAt" AND NOT v_withdrawn
                AND EXISTS (SELECT 1 FROM m7.m7_canonical_generation g
                            WHERE g."uploadIntentId" = OLD."id" AND g."leaseEpoch" = NEW."leaseEpoch"))
         OR (OLD."state" = 'PROCESSING' AND NEW."state" = 'PROCESSING'                           -- U3
                AND NEW."leaseEpoch" = OLD."leaseEpoch" + 1 AND OLD."leaseExpiresAt" <= v_now
                AND v_now < OLD."intentDeadlineAt" AND NOT v_withdrawn
                AND EXISTS (SELECT 1 FROM m7.m7_canonical_generation g
                            WHERE g."uploadIntentId" = OLD."id" AND g."leaseEpoch" = NEW."leaseEpoch"))
         OR (OLD."state" = 'PROCESSING' AND NEW."state" = 'ISSUED'                               -- U4
                AND NEW."leaseEpoch" = OLD."leaseEpoch" AND v_now < OLD."uploadExpiresAt")
         OR (OLD."state" = 'PROCESSING' AND NEW."state" = 'VALIDATED'                            -- U5
                AND NEW."leaseEpoch" = OLD."leaseEpoch" AND v_now < OLD."intentDeadlineAt"
                AND NEW."acceptedLeaseEpoch" = OLD."leaseEpoch"
                AND EXISTS (SELECT 1 FROM m7.m7_storage_observation ob
                            WHERE ob."uploadIntentId" = OLD."id" AND ob."leaseEpoch" = OLD."leaseEpoch"))
         OR (OLD."state" = 'PROCESSING' AND NEW."state" IN ('REJECTED_CONTENT','TERMINAL_FAILURE') -- U6, U7
                AND NEW."leaseEpoch" = OLD."leaseEpoch")
         OR (NEW."state" = 'EXPIRED' AND NEW."leaseEpoch" = OLD."leaseEpoch"                      -- U9
                AND (OLD."state" IN ('ISSUED','VALIDATED')
                     OR (OLD."state" = 'PROCESSING' AND OLD."leaseExpiresAt" <= v_now))
                AND (v_now >= OLD."intentDeadlineAt" OR v_withdrawn));
    ELSIF v_path = 'M7_FINALIZE_EVIDENCE_V1' THEN
        v_ok := OLD."state" = 'VALIDATED' AND NEW."state" = 'CONSUMED'                            -- U8
                AND NEW."leaseEpoch" = OLD."leaseEpoch" AND v_now < OLD."intentDeadlineAt"
                AND NEW."acceptedLeaseEpoch" = OLD."acceptedLeaseEpoch"
                AND EXISTS (SELECT 1 FROM m7.m7_evidence_submission s WHERE s."uploadIntentId" = OLD."id");
    END IF;

    IF NOT COALESCE(v_ok, false) THEN
        RAISE EXCEPTION 'M7_STATE: illegal upload-intent transition % -> % on path %',
            OLD."state", NEW."state", COALESCE(v_path, '<unset>') USING ERRCODE = 'restrict_violation';
    END IF;
    RETURN NEW;
END
$fn$;

CREATE FUNCTION m7.t_artifact_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE
    v_path text := pg_catalog.current_setting('pagamenos.m7.write_path', true);
    v_ok   boolean := false;
BEGIN
    IF current_user <> 'pagamenos_m7_owner'::name THEN
        RAISE EXCEPTION 'M7_GUARD: UPDATE on m7.m7_evidence_artifact requires owner context' USING ERRCODE = '42501';
    END IF;
    IF (NEW."submissionId", NEW."uploadIntentId", NEW."acceptedLeaseEpoch", NEW."canonicalObjectKey",
        NEW."acceptedExecutingProfileId", NEW."backendSha256", NEW."generationPath")
       IS DISTINCT FROM
       (OLD."submissionId", OLD."uploadIntentId", OLD."acceptedLeaseEpoch", OLD."canonicalObjectKey",
        OLD."acceptedExecutingProfileId", OLD."backendSha256", OLD."generationPath")
       OR NEW."stateVersion" <> OLD."stateVersion" + 1 THEN
        RAISE EXCEPTION 'M7_STATE: artifact identity or storage binding changed, or version not advanced'
            USING ERRCODE = 'restrict_violation';
    END IF;
    IF v_path = 'M7_WORKER_DELETION_V1' THEN                                                    -- A2
        v_ok := OLD."state" IN ('AVAILABLE','MISSING') AND NEW."state" = 'DELETION_SCHEDULED'
            AND EXISTS (SELECT 1 FROM m7.m7_deletion_execution e
                        WHERE e."targetSubmissionId" = OLD."submissionId" AND e."mechanism" = 'RAW_OBJECT_DELETE');
    ELSIF v_path = 'M7_WORKER_EFFECT_V1' THEN                                                   -- A3
        -- SI-3: the confirming outbox row must be bound to THIS artifact's backend, and its
        -- confirming attempt must have executed on that same backend.
        v_ok := OLD."state" = 'DELETION_SCHEDULED' AND NEW."state" = 'DELETED'
            AND EXISTS (SELECT 1
                          FROM m7.m7_deletion_execution e
                          JOIN m7.m7_storage_outbox ob ON ob."deletionExecutionId" = e."id"
                          JOIN m7.m7_storage_effect_attempt at
                            ON at."outboxId" = ob."id" AND at."attemptNo" = ob."attempts"
                         WHERE e."targetSubmissionId" = OLD."submissionId"
                           AND e."mechanism" = 'RAW_OBJECT_DELETE'
                           AND ob."state" = 'CONFIRMED'
                           AND ob."backendSha256" = OLD."backendSha256"
                           AND ob."objectKey" = OLD."canonicalObjectKey"
                           AND at."result" = 'ABSENT_CONFIRMED'
                           AND at."executingBackendSha256" = OLD."backendSha256");
    ELSIF v_path = 'M7_WORKER_RECONCILIATION_V1' THEN                                           -- A4
        v_ok := OLD."state" = 'AVAILABLE' AND NEW."state" = 'MISSING'
            AND EXISTS (SELECT 1 FROM m7.m7_evidence_integrity_finding f
                        WHERE f."submissionId" = OLD."submissionId" AND f."findingKind" = 'CANONICAL_OBJECT_MISSING'
                          AND f."backendSha256" = OLD."backendSha256");
    END IF;
    IF NOT COALESCE(v_ok, false) THEN
        RAISE EXCEPTION 'M7_STATE: illegal artifact transition % -> %', OLD."state", NEW."state" USING ERRCODE = 'restrict_violation';
    END IF;
    RETURN NEW;
END
$fn$;

CREATE FUNCTION m7.t_outbox_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE
    v_path text := pg_catalog.current_setting('pagamenos.m7.write_path', true);
    v_now  timestamptz := pg_catalog.clock_timestamp();
    v_result m7."M7EffectAttemptResult";
    v_attempt_backend text;
    v_ok   boolean := false;
BEGIN
    IF current_user <> 'pagamenos_m7_owner'::name OR v_path IS DISTINCT FROM 'M7_WORKER_EFFECT_V1' THEN
        RAISE EXCEPTION 'M7_GUARD: outbox UPDATE requires owner context and M7_WORKER_EFFECT_V1' USING ERRCODE = '42501';
    END IF;
    IF (NEW."id", NEW."effectKind", NEW."zone", NEW."backendSha256", NEW."enqueuedProfileId", NEW."objectKey",
        NEW."boundPolicyVersion", NEW."policyBinding",
        NEW."deletionExecutionId", NEW."uploadIntentId", NEW."generationLeaseEpoch", NEW."reconciliationFindingId",
        NEW."notBefore", NEW."createdAt", NEW."generationPath")
       IS DISTINCT FROM
       (OLD."id", OLD."effectKind", OLD."zone", OLD."backendSha256", OLD."enqueuedProfileId", OLD."objectKey",
        OLD."boundPolicyVersion", OLD."policyBinding",
        OLD."deletionExecutionId", OLD."uploadIntentId", OLD."generationLeaseEpoch", OLD."reconciliationFindingId",
        OLD."notBefore", OLD."createdAt", OLD."generationPath")
       OR NEW."stateVersion" <> OLD."stateVersion" + 1 THEN
        RAISE EXCEPTION 'M7_STATE: outbox identity, routing, bound policy or fence changed, or version not advanced'
            USING ERRCODE = 'restrict_violation';
    END IF;
    -- DL-6: the lifetime attempt counter never decreases, and the budget window can only be re-opened
    -- forward, by M7_WORKER_EFFECT_V1, at a point already reached.
    IF NEW."attempts" < OLD."attempts" OR NEW."attemptBudgetBase" < OLD."attemptBudgetBase"
       OR NEW."attemptBudgetBase" > NEW."attempts" THEN
        RAISE EXCEPTION 'M7_STATE: outbox attempt counters may not be reset or moved backwards'
            USING ERRCODE = 'restrict_violation';
    END IF;
    SELECT a."result", a."executingBackendSha256" INTO v_result, v_attempt_backend
      FROM m7.m7_storage_effect_attempt a
     WHERE a."outboxId" = OLD."id" AND a."attemptNo" = NEW."attempts" AND a."leaseEpoch" = OLD."leaseEpoch";

    v_ok :=
        (OLD."state" = 'PENDING' AND NEW."state" = 'LEASED'                                     -- O2
            AND NEW."leaseEpoch" = OLD."leaseEpoch" + 1 AND NEW."attempts" = OLD."attempts"
            AND OLD."nextAttemptAt" <= v_now AND OLD."notBefore" <= v_now
            AND EXISTS (SELECT 1 FROM m7.m7_storage_profile p
                        WHERE p."backendSha256" = OLD."backendSha256" AND p."retiredAt" IS NULL))
     OR (OLD."state" = 'LEASED' AND NEW."state" = 'LEASED' AND NEW."attempts" = OLD."attempts"
            AND ((NEW."leaseEpoch" = OLD."leaseEpoch" + 1 AND OLD."leaseExpiresAt" <= v_now                -- O3
                  AND EXISTS (SELECT 1 FROM m7.m7_storage_profile p
                              WHERE p."backendSha256" = OLD."backendSha256" AND p."retiredAt" IS NULL))
              OR (NEW."leaseEpoch" = OLD."leaseEpoch" AND OLD."leaseExpiresAt" > v_now                     -- O4
                  AND NEW."leaseExpiresAt" > OLD."leaseExpiresAt" AND NEW."leaseOwner" = OLD."leaseOwner")))
     OR (OLD."state" = 'LEASED' AND NEW."state" = 'PENDING'                                     -- O5
            AND NEW."leaseEpoch" = OLD."leaseEpoch" AND NEW."attempts" = OLD."attempts" + 1
            AND v_result IN ('STILL_PRESENT','PROVIDER_ERROR_RETRYABLE'))
     OR (OLD."state" = 'LEASED' AND NEW."state" = 'CONFIRMED'                                   -- O6
            AND NEW."leaseEpoch" = OLD."leaseEpoch" AND NEW."attempts" = OLD."attempts" + 1
            AND v_result = 'ABSENT_CONFIRMED'
            AND v_attempt_backend = OLD."backendSha256")            -- SI-3, re-checked at the state change
     OR (OLD."state" = 'LEASED' AND NEW."state" = 'FAILED_PERMANENT'                            -- O7
            AND NEW."leaseEpoch" = OLD."leaseEpoch" AND NEW."attempts" = OLD."attempts" + 1
            AND v_result IS NOT NULL AND v_result <> 'ABSENT_CONFIRMED')
     OR (OLD."state" = 'FAILED_PERMANENT' AND NEW."state" = 'PENDING'                           -- O8
            -- A.2.3 #46: round 3 required attempts = 0 here while DL-6 above forbids attempts from moving
            -- backwards, so every requeue of an effect with attempts > 0 was unexecutable. A requeue keeps
            -- the lifetime count and re-opens the budget window exactly at it (DL-6, T-154).
            AND NEW."leaseEpoch" = OLD."leaseEpoch" AND NEW."attempts" = OLD."attempts"
            AND NEW."attemptBudgetBase" = OLD."attempts"
            AND EXISTS (SELECT 1 FROM m7.m7_storage_profile p
                        WHERE p."backendSha256" = OLD."backendSha256" AND p."retiredAt" IS NULL));

    IF NOT COALESCE(v_ok, false) THEN
        RAISE EXCEPTION 'M7_STATE: illegal outbox transition % -> %', OLD."state", NEW."state" USING ERRCODE = 'restrict_violation';
    END IF;
    RETURN NEW;
END
$fn$;

-- --- transition logs (AFTER) --------------------------------------------------------------------

CREATE FUNCTION m7.t_upload_intent_log() RETURNS trigger
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v_from m7."M7UploadIntentState";
BEGIN
    IF TG_OP = 'UPDATE' THEN v_from := OLD."state"; END IF;
    INSERT INTO m7.m7_upload_intent_transition
        ("id","uploadIntentId","stateVersion","fromState","toState","leaseEpoch","acceptedLeaseEpoch",
         "rejectionReason","failureReason","writePath","actor","recordedAt")
    VALUES (pg_catalog.gen_random_uuid(), NEW."id", NEW."stateVersion", v_from, NEW."state", NEW."leaseEpoch",
            NEW."acceptedLeaseEpoch", NEW."rejectionReason", NEW."failureReason",
            pg_catalog.current_setting('pagamenos.m7.write_path', true), session_user, pg_catalog.clock_timestamp());
    RETURN NULL;
END
$fn$;

CREATE FUNCTION m7.t_artifact_log() RETURNS trigger
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v_from m7."M7ArtifactState";
BEGIN
    IF TG_OP = 'UPDATE' THEN v_from := OLD."state"; END IF;
    INSERT INTO m7.m7_evidence_artifact_transition
        ("id","submissionId","stateVersion","fromState","toState","writePath","actor","recordedAt")
    VALUES (pg_catalog.gen_random_uuid(), NEW."submissionId", NEW."stateVersion", v_from, NEW."state",
            pg_catalog.current_setting('pagamenos.m7.write_path', true), session_user, pg_catalog.clock_timestamp());
    RETURN NULL;
END
$fn$;

CREATE FUNCTION m7.t_outbox_log() RETURNS trigger
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v_from m7."M7OutboxState";
BEGIN
    IF TG_OP = 'UPDATE' THEN v_from := OLD."state"; END IF;
    INSERT INTO m7.m7_storage_outbox_transition
        ("id","outboxId","stateVersion","fromState","toState","leaseEpoch","attempts","writePath","actor","recordedAt")
    VALUES (pg_catalog.gen_random_uuid(), NEW."id", NEW."stateVersion", v_from, NEW."state", NEW."leaseEpoch",
            NEW."attempts", pg_catalog.current_setting('pagamenos.m7.write_path', true), session_user,
            pg_catalog.clock_timestamp());
    RETURN NULL;
END
$fn$;

-- --- insert-time coherence (BEFORE INSERT, after the guard) -----------------------------------

CREATE FUNCTION m7.t_session_coherence() RETURNS trigger
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v_inst uuid; v_ttl interval;
BEGIN
    SELECT i."id", p."sessionTtl" INTO v_inst, v_ttl
      FROM m7.m7_control_plane_installation i
      JOIN m7.m7_control_plane_manifest m ON m."manifestVersion" = i."manifestVersion"
      JOIN m7.m7_retention_policy p ON p."policyVersion" = m."retentionPolicyVersion"
     WHERE i."retiredAt" IS NULL;
    IF v_inst IS DISTINCT FROM NEW."installationId"
       OR (NEW."expiresAt" - NEW."issuedAt") IS DISTINCT FROM v_ttl THEN
        RAISE EXCEPTION 'M7_COHERENCE: session not bound to active control plane/policy' USING ERRCODE = '23000';
    END IF;
    RETURN NEW;
END
$fn$;

-- Tables carrying both "participantSessionId" and "assignmentId".
CREATE FUNCTION m7.t_session_assignment_coherence() RETURNS trigger
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v_sp uuid; v_ap uuid;
BEGIN
    SELECT s."participantId" INTO v_sp FROM m7.m7_participant_session s WHERE s."id" = NEW."participantSessionId";
    SELECT a."participantId" INTO v_ap FROM public.experiment_assignment a WHERE a."id" = NEW."assignmentId";
    IF v_sp IS NULL OR v_sp IS DISTINCT FROM v_ap THEN
        RAISE EXCEPTION 'M7_COHERENCE: session participant does not own assignment on m7.%', TG_TABLE_NAME USING ERRCODE = '23000';
    END IF;
    RETURN NEW;
END
$fn$;

CREATE FUNCTION m7.t_outcome_coherence() RETURNS trigger
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v_asg uuid;
BEGIN
    SELECT tok."assignmentId" INTO v_asg
      FROM public.purchase_intent_decision_binding b
      JOIN public.purchase_intent_decision_request r ON r."id" = b."decisionRequestId"
      JOIN public.purchase_intent pi ON pi."id" = r."intentId"
      JOIN public.purchase_intent_capture_token tok ON tok."id" = pi."captureTokenId"
     WHERE b."id" = NEW."decisionBindingId";
    IF v_asg IS NULL OR v_asg IS DISTINCT FROM NEW."assignmentId" THEN
        RAISE EXCEPTION 'M7_COHERENCE: m7_outcome.assignmentId does not match the Decision chain' USING ERRCODE = '23000';
    END IF;
    RETURN NEW;
END
$fn$;

CREATE FUNCTION m7.t_assertion_coherence() RETURNS trigger
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE
    v_out m7.m7_outcome; v_sp uuid; v_ap uuid; v_next integer; v_target_kind m7."M7AssertionKind";
    v_vocab text; v_skew interval; v_now timestamptz := pg_catalog.clock_timestamp();
BEGIN
    SELECT * INTO v_out FROM m7.m7_outcome WHERE "id" = NEW."outcomeId";
    SELECT s."participantId" INTO v_sp FROM m7.m7_participant_session s WHERE s."id" = NEW."participantSessionId";
    SELECT a."participantId" INTO v_ap FROM public.experiment_assignment a WHERE a."id" = v_out."assignmentId";
    IF v_sp IS NULL OR v_sp IS DISTINCT FROM v_ap THEN
        RAISE EXCEPTION 'M7_COHERENCE: assertion session participant does not own the Outcome' USING ERRCODE = '23000';
    END IF;
    SELECT COALESCE(pg_catalog.max(x."assertionSeq"), 0) + 1 INTO v_next
      FROM m7.m7_outcome_assertion x WHERE x."outcomeId" = NEW."outcomeId";
    IF NEW."assertionSeq" <> v_next THEN
        RAISE EXCEPTION 'M7_COHERENCE: assertionSeq must be the next allocation' USING ERRCODE = '23000';
    END IF;
    IF NEW."supersedesAssertionId" IS NOT NULL THEN
        SELECT x."assertionKind" INTO v_target_kind FROM m7.m7_outcome_assertion x
         WHERE x."id" = NEW."supersedesAssertionId" AND x."outcomeId" = NEW."outcomeId";
        IF v_target_kind IS NULL OR v_target_kind = 'RETRACTION' THEN
            RAISE EXCEPTION 'M7_COHERENCE: correction target missing or is a RETRACTION' USING ERRCODE = '23000';
        END IF;
    END IF;
    SELECT m."vocabularyVersion", p."captureSkewTolerance" INTO v_vocab, v_skew
      FROM m7.m7_control_plane_installation i
      JOIN m7.m7_control_plane_manifest m ON m."manifestVersion" = i."manifestVersion"
      JOIN m7.m7_retention_policy p ON p."policyVersion" = m."retentionPolicyVersion"
     WHERE i."retiredAt" IS NULL;
    -- CP resolution, not caller input (§9.5): the vocabulary must be the ACTIVE one at insert time
    IF NEW."merchantVocabularyVersion" IS NOT NULL
       AND NEW."merchantVocabularyVersion" IS DISTINCT FROM v_vocab THEN
        RAISE EXCEPTION 'M7_COHERENCE: merchant vocabulary is not the active version' USING ERRCODE = '23000';
    END IF;
    IF NEW."redactedAt" IS NOT NULL
       OR NEW."capturedAt" > v_now + INTERVAL '5 seconds'
       OR (v_now - NEW."capturedAt") > v_skew THEN
        RAISE EXCEPTION 'M7_COHERENCE: capturedAt outside tolerance or row pre-redacted' USING ERRCODE = '23000';
    END IF;
    RETURN NEW;
END
$fn$;

CREATE FUNCTION m7.t_upload_intent_coherence() RETURNS trigger
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE
    v_asg uuid; v_inst uuid; v_profile_version text; v_pol m7.m7_retention_policy;
    v_be m7.m7_storage_backend; v_pr m7.m7_storage_profile;
    v_now timestamptz := pg_catalog.clock_timestamp();
BEGIN
    SELECT tok."assignmentId" INTO v_asg
      FROM public.purchase_intent_decision_binding b
      JOIN public.purchase_intent_decision_request r ON r."id" = b."decisionRequestId"
      JOIN public.purchase_intent pi ON pi."id" = r."intentId"
      JOIN public.purchase_intent_capture_token tok ON tok."id" = pi."captureTokenId"
     WHERE b."id" = NEW."decisionBindingId";

    SELECT i."id", m."storageProfileVersion" INTO v_inst, v_profile_version
      FROM m7.m7_control_plane_installation i
      JOIN m7.m7_control_plane_manifest m ON m."manifestVersion" = i."manifestVersion"
     WHERE i."retiredAt" IS NULL;
    SELECT * INTO v_pol FROM m7.m7_retention_policy WHERE "policyVersion" = NEW."retentionPolicyVersion";
    SELECT * INTO v_pr  FROM m7.m7_storage_profile  WHERE "id" = NEW."issuanceProfileId";
    SELECT * INTO v_be  FROM m7.m7_storage_backend  WHERE "backendSha256" = NEW."backendSha256";

    IF v_asg IS NULL OR v_asg IS DISTINCT FROM NEW."assignmentId"
       OR NEW."installationId" IS DISTINCT FROM v_inst
       OR NEW."maxBytes" <> v_pol."maxUploadBytes"
       OR NEW."mediaPolicyVersion" IS DISTINCT FROM v_pol."mediaPolicyVersion"
       OR (NEW."uploadExpiresAt" - NEW."issuedAt") IS DISTINCT FROM v_pol."uploadUrlTtl"
       OR (NEW."intentDeadlineAt" - NEW."uploadExpiresAt") IS DISTINCT FROM v_pol."finalizeWindow"
       OR NEW."state" <> 'ISSUED' OR NEW."stateVersion" <> 1 OR NEW."leaseEpoch" <> 0
       OR NEW."acceptedLeaseEpoch" IS NOT NULL
       OR NEW."capturedAt" > v_now + INTERVAL '5 seconds'
       OR (v_now - NEW."capturedAt") > v_pol."captureSkewTolerance" THEN
        RAISE EXCEPTION 'M7_COHERENCE: upload intent not coherent with Decision chain, policy or initial state'
            USING ERRCODE = '23000';
    END IF;
    -- SI-2: a NEW intent binds exactly the ACTIVE manifest's profile as its ISSUANCE profile,
    -- and that profile must be live
    IF v_pr."id" IS NULL OR v_pr."retiredAt" IS NOT NULL
       OR v_pr."storageProfileVersion" IS DISTINCT FROM v_profile_version
       OR v_be."backendSha256" IS NULL OR v_be."retiredAt" IS NOT NULL THEN
        RAISE EXCEPTION 'M7_COHERENCE: upload intent must bind the active, live storage profile'
            USING ERRCODE = '23000';
    END IF;
    -- SI-5 / XF-5: the staging write fence is derived, never supplied
    IF NEW."stagingWriteFenceAt" IS DISTINCT FROM
       (NEW."uploadExpiresAt" + v_be."providerWriteCompletionWindow" + v_pol."writeFenceSkewAllowance") THEN
        RAISE EXCEPTION 'M7_COHERENCE: staging write fence does not match the bound backend and policy'
            USING ERRCODE = '23000';
    END IF;
    -- the staging key prefix belongs to THIS backend (the CHECK pins only the row-local shape)
    IF NOT pg_catalog.starts_with(NEW."stagingObjectKey", v_be."stagingPrefix")
       OR NEW."stagingObjectKey" <> v_be."stagingPrefix" || NEW."id"::text || '/'
            || pg_catalog.substring(NEW."stagingObjectKey" FROM '[0-9a-f]{32}$') THEN
        RAISE EXCEPTION 'M7_COHERENCE: staging key does not belong to the bound backend prefix' USING ERRCODE = '23000';
    END IF;
    RETURN NEW;
END
$fn$;

CREATE FUNCTION m7.t_generation_coherence() RETURNS trigger
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE
    v_i m7.m7_evidence_upload_intent; v_be m7.m7_storage_backend;
    v_pr m7.m7_storage_profile; v_pol m7.m7_retention_policy; v_prev m7.m7_canonical_generation;
BEGIN
    SELECT * INTO v_i  FROM m7.m7_evidence_upload_intent WHERE "id" = NEW."uploadIntentId";
    SELECT * INTO v_be FROM m7.m7_storage_backend WHERE "backendSha256" = NEW."backendSha256";
    SELECT * INTO v_pr FROM m7.m7_storage_profile WHERE "id" = NEW."executingProfileId";
    SELECT * INTO v_pol FROM m7.m7_retention_policy WHERE "policyVersion" = v_i."retentionPolicyVersion";
    -- GF-1/GF-3: a generation is allocated only for the epoch the claim is about to take, on the
    -- intent's own immutable BACKEND (SI-1). Its EXECUTING profile must be a LIVE profile of that
    -- backend, and is deliberately NOT required to equal the intent's issuance profile (EP-1/EP-2).
    IF v_i."id" IS NULL
       OR NEW."backendSha256" IS DISTINCT FROM v_i."backendSha256"
       OR v_pr."id" IS NULL OR v_pr."retiredAt" IS NOT NULL
       OR v_pr."backendSha256" IS DISTINCT FROM NEW."backendSha256"
       OR NEW."leaseEpoch" <> v_i."leaseEpoch" + 1
       OR v_i."state" NOT IN ('ISSUED','PROCESSING')
       OR v_be."retiredAt" IS NOT NULL THEN
        RAISE EXCEPTION 'M7_COHERENCE: canonical generation must be the next epoch of a claimable intent, on its own live backend, under a live executing profile of that backend'
            USING ERRCODE = '23000';
    END IF;
    -- XF-3: both fence instants are DERIVED here, never supplied, and XF-DL-1 is re-checked so no
    -- policy value can issue a fence that outlives the lease it is issued with.
    IF NEW."grantExpiresAt" IS DISTINCT FROM (NEW."allocatedAt" + v_pol."generationWriteGrantTtl")
       OR NEW."writeFenceAt" IS DISTINCT FROM
          (NEW."grantExpiresAt" + v_be."providerWriteCompletionWindow" + v_pol."writeFenceSkewAllowance")
       OR (v_pol."generationWriteGrantTtl" + v_be."providerWriteCompletionWindow"
           + v_pol."writeFenceSkewAllowance") > v_pol."workerLease" THEN
        RAISE EXCEPTION 'M7_GENERATION_NOT_FENCED: generation fence is not the derived value, or violates XF-DL-1'
            USING ERRCODE = 'M7012';
    END IF;
    -- XF-6: a reclaim may not allocate epoch e+1 while epoch e is still writable
    SELECT * INTO v_prev FROM m7.m7_canonical_generation
     WHERE "uploadIntentId" = NEW."uploadIntentId" AND "leaseEpoch" = NEW."leaseEpoch" - 1;
    IF v_prev."uploadIntentId" IS NOT NULL AND v_prev."writeFenceAt" > NEW."allocatedAt" THEN
        RAISE EXCEPTION 'M7_GENERATION_NOT_FENCED: previous generation is still writable until %',
            v_prev."writeFenceAt" USING ERRCODE = 'M7012';
    END IF;
    IF NOT pg_catalog.starts_with(NEW."canonicalObjectKey", v_be."evidencePrefix")
       OR NEW."canonicalObjectKey" <> v_be."evidencePrefix" || NEW."uploadIntentId"::text || '/g'
            || NEW."leaseEpoch"::text || '/' || pg_catalog.substring(NEW."canonicalObjectKey" FROM '[0-9a-f]{32}$') THEN
        RAISE EXCEPTION 'M7_COHERENCE: canonical key does not belong to the bound backend prefix' USING ERRCODE = '23000';
    END IF;
    RETURN NEW;
END
$fn$;

CREATE FUNCTION m7.t_observation_coherence() RETURNS trigger
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v_i m7.m7_evidence_upload_intent; v_g m7.m7_canonical_generation;
BEGIN
    SELECT * INTO v_i FROM m7.m7_evidence_upload_intent WHERE "id" = NEW."uploadIntentId";
    SELECT * INTO v_g FROM m7.m7_canonical_generation
     WHERE "uploadIntentId" = NEW."uploadIntentId" AND "leaseEpoch" = NEW."leaseEpoch";
    -- GF-4 + EP-3: the observation names the CURRENT epoch's generation key and that generation's
    -- EXECUTING profile. Equality with the intent's issuance profile is NOT required and NOT checked
    -- (EP-2); the profile/encoder bindings are foreign keys, re-asserted here for a typed message.
    IF v_i."state" IS DISTINCT FROM 'PROCESSING'
       OR v_i."leaseEpoch" <> NEW."leaseEpoch"
       OR v_g."canonicalObjectKey" IS NULL
       OR NEW."objectKey" IS DISTINCT FROM v_g."canonicalObjectKey"
       OR NEW."executingProfileId" IS DISTINCT FROM v_g."executingProfileId"
       OR NEW."backendSha256" IS DISTINCT FROM v_g."backendSha256"
       OR NEW."byteSize" > v_i."maxBytes"
       OR NEW."redactedAt" IS NOT NULL THEN
        RAISE EXCEPTION 'M7_COHERENCE: observation not bound to the current generation, lease and executing profile'
            USING ERRCODE = '23000';
    END IF;
    -- EP-4 restated with a typed message; the composite FK to (id, encoderGeneration) is authoritative
    IF NEW."encoderGeneration" IS DISTINCT FROM
       (SELECT p."encoderGeneration" FROM m7.m7_storage_profile p WHERE p."id" = NEW."executingProfileId") THEN
        RAISE EXCEPTION 'M7_COHERENCE: observed encoder generation is not the executing profile''s pinned encoder'
            USING ERRCODE = '23000';
    END IF;
    RETURN NEW;
END
$fn$;

CREATE FUNCTION m7.t_submission_coherence() RETURNS trigger
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE
    v_i m7.m7_evidence_upload_intent; v_o m7.m7_outcome; v_next integer; v_pol m7.m7_retention_policy;
    v_now timestamptz := pg_catalog.clock_timestamp();
BEGIN
    SELECT * INTO v_i FROM m7.m7_evidence_upload_intent WHERE "id" = NEW."uploadIntentId";
    SELECT * INTO v_o FROM m7.m7_outcome WHERE "id" = NEW."outcomeId";
    SELECT * INTO v_pol FROM m7.m7_retention_policy WHERE "policyVersion" = v_i."retentionPolicyVersion";
    SELECT COALESCE(pg_catalog.max(x."evidenceSeq"), 0) + 1 INTO v_next
      FROM m7.m7_evidence_submission x WHERE x."outcomeId" = NEW."outcomeId";
    IF v_i."state" IS DISTINCT FROM 'VALIDATED'
       OR v_i."acceptedLeaseEpoch" IS NULL
       OR v_i."decisionBindingId" IS DISTINCT FROM v_o."decisionBindingId"
       OR NEW."retentionPolicyVersion" IS DISTINCT FROM v_i."retentionPolicyVersion"
       OR NEW."evidenceSeq" <> v_next
       OR NEW."capturedAt" > v_now + INTERVAL '5 seconds'
       OR (v_now - NEW."capturedAt") > v_pol."captureSkewTolerance" THEN
        RAISE EXCEPTION 'M7_COHERENCE: submission not coherent with validated intent, Outcome or policy'
            USING ERRCODE = '23000';
    END IF;
    -- §15.11.3: per-row deletion deadlines are derived from THIS row's own bound policy
    IF NEW."rawDeleteScheduleByAt" IS DISTINCT FROM (NEW."recordedAt" + v_pol."rawDeleteScheduleAfterNeverVerified")
       OR NEW."rawDeleteHardDueAt" IS DISTINCT FROM (NEW."recordedAt" + v_pol."rawDeleteHardDeadlineNeverVerified") THEN
        RAISE EXCEPTION 'M7_COHERENCE: submission deletion deadlines do not match the bound policy' USING ERRCODE = '23000';
    END IF;
    RETURN NEW;
END
$fn$;

CREATE FUNCTION m7.t_artifact_coherence() RETURNS trigger
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v_i m7.m7_evidence_upload_intent; v_g m7.m7_canonical_generation;
BEGIN
    SELECT i.* INTO v_i FROM m7.m7_evidence_upload_intent i
      JOIN m7.m7_evidence_submission s ON s."uploadIntentId" = i."id"
     WHERE s."id" = NEW."submissionId";
    SELECT * INTO v_g FROM m7.m7_canonical_generation
     WHERE "uploadIntentId" = NEW."uploadIntentId" AND "leaseEpoch" = NEW."acceptedLeaseEpoch";
    -- GF-6 + EP-5: the artifact binds the intent's ACCEPTED generation, its key, and THAT
    -- GENERATION's executing profile. The intent's issuance profile is not consulted at all here,
    -- and the composite FK makes copying it unrepresentable.
    IF NEW."state" <> 'AVAILABLE' OR NEW."stateVersion" <> 1
       OR v_i."id" IS NULL
       OR NEW."uploadIntentId" IS DISTINCT FROM v_i."id"
       OR NEW."acceptedLeaseEpoch" IS DISTINCT FROM v_i."acceptedLeaseEpoch"
       OR v_g."canonicalObjectKey" IS NULL
       OR NEW."canonicalObjectKey" IS DISTINCT FROM v_g."canonicalObjectKey"
       OR NEW."acceptedExecutingProfileId" IS DISTINCT FROM v_g."executingProfileId"
       OR NEW."backendSha256" IS DISTINCT FROM v_g."backendSha256" THEN
        RAISE EXCEPTION 'M7_COHERENCE: artifact must start AVAILABLE at its accepted generation key, under that generation''s executing profile'
            USING ERRCODE = '23000';
    END IF;
    RETURN NEW;
END
$fn$;

CREATE FUNCTION m7.t_integrity_finding_coherence() RETURNS trigger
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM m7.m7_evidence_artifact a
                    WHERE a."submissionId" = NEW."submissionId" AND a."backendSha256" = NEW."backendSha256") THEN
        RAISE EXCEPTION 'M7_COHERENCE: integrity finding must name the artifact''s own backend' USING ERRCODE = '23000';
    END IF;
    RETURN NEW;
END
$fn$;

CREATE FUNCTION m7.t_reconciliation_finding_coherence() RETURNS trigger
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v_be m7.m7_storage_backend; v_pr m7.m7_storage_profile; v_active text;
BEGIN
    SELECT * INTO v_be FROM m7.m7_storage_backend WHERE "backendSha256" = NEW."backendSha256";
    SELECT * INTO v_pr FROM m7.m7_storage_profile WHERE "id" = NEW."executingProfileId";
    IF v_be."backendSha256" IS NULL
       OR NOT ((NEW."zone" = 'STAGING'   AND pg_catalog.starts_with(NEW."objectKey", v_be."stagingPrefix"))
            OR (NEW."zone" = 'CANONICAL' AND pg_catalog.starts_with(NEW."objectKey", v_be."evidencePrefix"))) THEN
        RAISE EXCEPTION 'M7_COHERENCE: finding key does not belong to the named backend zone' USING ERRCODE = '23000';
    END IF;
    -- EP-6: the listing ran under a LIVE profile of this backend
    IF v_pr."id" IS NULL OR v_pr."retiredAt" IS NOT NULL
       OR v_pr."backendSha256" IS DISTINCT FROM NEW."backendSha256" THEN
        RAISE EXCEPTION 'M7_STORAGE_ROUTING_MISMATCH: finding must name a live executing profile of its backend'
            USING ERRCODE = 'M7011';
    END IF;
    -- DL-5 RECONCILIATION_RUN: the bound policy is the one in force at listing time, recorded once
    SELECT m."retentionPolicyVersion" INTO v_active
      FROM m7.m7_control_plane_installation i
      JOIN m7.m7_control_plane_manifest m ON m."manifestVersion" = i."manifestVersion"
     WHERE i."retiredAt" IS NULL;
    IF NEW."boundPolicyVersion" IS DISTINCT FROM v_active THEN
        RAISE EXCEPTION 'M7_COHERENCE: finding bound policy must be the policy active at listing time'
            USING ERRCODE = '23000';
    END IF;
    IF NEW."leaseEpoch" IS NOT NULL AND NOT EXISTS (
         SELECT 1 FROM m7.m7_canonical_generation g
          WHERE g."uploadIntentId" = NEW."uploadIntentId" AND g."leaseEpoch" = NEW."leaseEpoch"
            AND g."canonicalObjectKey" = NEW."objectKey") THEN
        RAISE EXCEPTION 'M7_COHERENCE: finding epoch does not name that generation''s key' USING ERRCODE = '23000';
    END IF;
    RETURN NEW;
END
$fn$;

CREATE FUNCTION m7.t_outbox_coherence() RETURNS trigger
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v_be m7.m7_storage_backend; v_fence timestamptz;
BEGIN
    IF NEW."state" <> 'PENDING' OR NEW."stateVersion" <> 1 OR NEW."attempts" <> 0 OR NEW."leaseEpoch" <> 0
       OR NEW."attemptBudgetBase" <> 0 THEN
        RAISE EXCEPTION 'M7_COHERENCE: outbox rows start PENDING' USING ERRCODE = '23000';
    END IF;
    -- SI-5 / XF-5: an effect against an object M7 could still be permitted to write is not schedulable.
    -- i_enqueue_delete already raises notBefore to this instant; re-checked here so that a future
    -- enqueue path, or a direct owner-class INSERT, cannot produce an early absence proof.
    v_fence := m7.i_object_write_fence(NEW."backendSha256", NEW."objectKey");
    IF v_fence IS NOT NULL AND NEW."notBefore" < v_fence THEN
        RAISE EXCEPTION 'M7_GENERATION_NOT_FENCED: effect would execute before the object write fence %',
            v_fence USING ERRCODE = 'M7012';
    END IF;
    SELECT * INTO v_be FROM m7.m7_storage_backend WHERE "backendSha256" = NEW."backendSha256";
    IF v_be."backendSha256" IS NULL
       OR NOT ((NEW."zone" = 'STAGING'   AND pg_catalog.starts_with(NEW."objectKey", v_be."stagingPrefix"))
            OR (NEW."zone" = 'CANONICAL' AND pg_catalog.starts_with(NEW."objectKey", v_be."evidencePrefix"))) THEN
        RAISE EXCEPTION 'M7_COHERENCE: effect key does not belong to the routed backend zone' USING ERRCODE = '23000';
    END IF;
    -- intent-based hygiene deletes: staging key of a non-owning state, or a generation key
    IF NEW."uploadIntentId" IS NOT NULL AND NEW."zone" = 'STAGING' AND NOT EXISTS (
         SELECT 1 FROM m7.m7_evidence_upload_intent i
          WHERE i."id" = NEW."uploadIntentId" AND i."backendSha256" = NEW."backendSha256"
            AND i."stagingObjectKey" = NEW."objectKey"
            AND i."state" IN ('VALIDATED','CONSUMED','REJECTED_CONTENT','EXPIRED','TERMINAL_FAILURE')) THEN
        RAISE EXCEPTION 'M7_COHERENCE: staging delete targets a key the intent still owns' USING ERRCODE = '23000';
    END IF;
    IF NEW."uploadIntentId" IS NOT NULL AND NEW."zone" = 'CANONICAL' AND NOT EXISTS (
         SELECT 1 FROM m7.m7_canonical_generation g
          JOIN m7.m7_evidence_upload_intent i ON i."id" = g."uploadIntentId"
          WHERE g."uploadIntentId" = NEW."uploadIntentId" AND g."leaseEpoch" = NEW."generationLeaseEpoch"
            AND g."canonicalObjectKey" = NEW."objectKey" AND g."backendSha256" = NEW."backendSha256"
            -- GF-7: a generation may be deleted only when it is neither the accepted nor the live one
            AND (i."acceptedLeaseEpoch" IS NULL OR i."acceptedLeaseEpoch" <> g."leaseEpoch"
                 OR i."state" IN ('EXPIRED','REJECTED_CONTENT','TERMINAL_FAILURE'))
            AND NOT (i."state" = 'PROCESSING' AND i."leaseEpoch" = g."leaseEpoch")) THEN
        RAISE EXCEPTION 'M7_COHERENCE: canonical delete targets an owned or live generation' USING ERRCODE = '23000';
    END IF;
    IF NEW."deletionExecutionId" IS NOT NULL AND NOT EXISTS (
         SELECT 1 FROM m7.m7_deletion_execution e
           JOIN m7.m7_evidence_artifact a ON a."submissionId" = e."targetSubmissionId"
          WHERE e."id" = NEW."deletionExecutionId" AND e."mechanism" = 'RAW_OBJECT_DELETE'
            AND NEW."zone" = 'CANONICAL' AND a."canonicalObjectKey" = NEW."objectKey"
            AND a."backendSha256" = NEW."backendSha256") THEN
        RAISE EXCEPTION 'M7_COHERENCE: execution-based delete must target the artifact key on its own backend'
            USING ERRCODE = '23000';
    END IF;
    IF NEW."reconciliationFindingId" IS NOT NULL AND NOT EXISTS (
         SELECT 1 FROM m7.m7_reconciliation_finding f
          WHERE f."id" = NEW."reconciliationFindingId" AND f."objectKey" = NEW."objectKey"
            AND f."zone" = NEW."zone" AND f."backendSha256" = NEW."backendSha256") THEN
        RAISE EXCEPTION 'M7_COHERENCE: finding-based delete must target the finding key on its backend' USING ERRCODE = '23000';
    END IF;
    -- DL-5: the bound policy is the FAMILY's policy, never the active manifest's. The three composite
    -- foreign keys of §19.9 already make a wrong value unrepresentable; this restates it with a typed
    -- message and covers the one case a MATCH SIMPLE foreign key cannot see, a NULL discriminator.
    IF NEW."boundPolicyVersion" IS DISTINCT FROM (
         CASE NEW."policyBinding"
           WHEN 'DELETION_EXECUTION'  THEN (SELECT e."deadlinePolicyVersion" FROM m7.m7_deletion_execution e
                                             WHERE e."id" = NEW."deletionExecutionId")
           WHEN 'UPLOAD_INTENT'       THEN (SELECT i."retentionPolicyVersion" FROM m7.m7_evidence_upload_intent i
                                             WHERE i."id" = NEW."uploadIntentId")
           WHEN 'RECONCILIATION_RUN'  THEN (SELECT f."boundPolicyVersion" FROM m7.m7_reconciliation_finding f
                                             WHERE f."id" = NEW."reconciliationFindingId")
         END) THEN
        RAISE EXCEPTION 'M7_COHERENCE: outbox bound policy does not resolve through its own family (DL-5)'
            USING ERRCODE = '23000';
    END IF;
    RETURN NEW;
END
$fn$;

CREATE FUNCTION m7.t_effect_attempt_coherence() RETURNS trigger
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v_ob m7.m7_storage_outbox; v_pr m7.m7_storage_profile;
BEGIN
    SELECT * INTO v_ob FROM m7.m7_storage_outbox WHERE "id" = NEW."outboxId";
    SELECT * INTO v_pr FROM m7.m7_storage_profile WHERE "id" = NEW."executingProfileId";
    -- SI-3: the attempt must have executed on the SAME physical authority the effect is bound to,
    -- under a profile that is still live, and under the current lease epoch.
    IF v_ob."id" IS NULL OR v_ob."state" IS DISTINCT FROM 'LEASED'
       OR v_ob."leaseEpoch" <> NEW."leaseEpoch"
       OR NEW."attemptNo" <> v_ob."attempts" + 1
       OR NEW."executingBackendSha256" IS DISTINCT FROM v_ob."backendSha256"
       OR v_pr."id" IS NULL OR v_pr."retiredAt" IS NOT NULL
       OR v_pr."backendSha256" IS DISTINCT FROM v_ob."backendSha256" THEN
        RAISE EXCEPTION 'M7_STORAGE_ROUTING_MISMATCH: attempt is not bound to the effect''s own live backend'
            USING ERRCODE = 'M7011';
    END IF;
    RETURN NEW;
END
$fn$;

-- XF-2 / XF-9: exactly one grant per generation, naming that generation's own key and its own
-- grant expiry. The composite foreign keys already force both; this adds the mode check, the
-- "the generation must be the intent's current epoch" check, and a typed message.
CREATE FUNCTION m7.t_write_grant_coherence() RETURNS trigger
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v_g m7.m7_canonical_generation; v_pr m7.m7_storage_profile; v_i m7.m7_evidence_upload_intent;
BEGIN
    SELECT * INTO v_g FROM m7.m7_canonical_generation
     WHERE "uploadIntentId" = NEW."uploadIntentId" AND "leaseEpoch" = NEW."leaseEpoch";
    SELECT * INTO v_i FROM m7.m7_evidence_upload_intent WHERE "id" = NEW."uploadIntentId";
    SELECT * INTO v_pr FROM m7.m7_storage_profile WHERE "id" = v_g."executingProfileId";
    IF v_g."uploadIntentId" IS NULL
       OR NEW."canonicalObjectKey" IS DISTINCT FROM v_g."canonicalObjectKey"
       OR NEW."grantExpiresAt" IS DISTINCT FROM v_g."grantExpiresAt"
       OR NEW."backendSha256" IS DISTINCT FROM v_g."backendSha256"
       OR NEW."capabilityOperation" IS DISTINCT FROM 'CANONICAL_CREATE'
       OR NEW."capabilityMode" IS DISTINCT FROM v_pr."writeCapabilityMode"
       OR NEW."envelopeEnforcement" IS DISTINCT FROM v_pr."envelopeEnforcement"
       OR v_i."state" IS DISTINCT FROM 'PROCESSING'
       OR v_i."leaseEpoch" <> NEW."leaseEpoch" THEN
        RAISE EXCEPTION 'M7_COHERENCE: a write grant envelope must be its own generation''s operation, key, backend and expiry, under its executing profile''s capability mode and envelope enforcement'
            USING ERRCODE = '23000';
    END IF;
    RETURN NEW;
END
$fn$;

-- XF-11 / XF-14 / XF-15 / XF-17, the non-declarative half. The nine provenance components and the signing
-- profile's backend and kind are already FK-bound, so this trigger does NOT carry that proof; it
--   (1) STAMPS "mintedAt" from its own clock (M7V11R4-AUD-04): the instant is read at INSERT time, after
--       every lock the minting function took, and whatever the INSERT supplied is discarded;
--   (2) checks what a foreign key cannot express: the digest the envelope actually hashes to, a contiguous
--       mint sequence, a current epoch of a PROCESSING intent, a live backend and a LIVE signing profile;
--   (3) re-compares generation identity with the grant's as defence in depth (the FK is the proof).
-- The expiry itself is left to m7_generation_capability_mint_expiry_ck, which runs after this trigger.
CREATE FUNCTION m7.t_capability_mint_coherence() RETURNS trigger
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE
    v_gr m7.m7_generation_write_grant; v_i m7.m7_evidence_upload_intent;
    v_be m7.m7_storage_backend; v_sp m7.m7_storage_profile; v_prev integer;
BEGIN
    NEW."mintedAt" := pg_catalog.clock_timestamp();                                             -- (1)
    SELECT * INTO v_gr FROM m7.m7_generation_write_grant WHERE "id" = NEW."grantId";
    SELECT * INTO v_i  FROM m7.m7_evidence_upload_intent WHERE "id" = v_gr."uploadIntentId";
    SELECT * INTO v_be FROM m7.m7_storage_backend WHERE "backendSha256" = v_gr."backendSha256";
    SELECT * INTO v_sp FROM m7.m7_storage_profile WHERE "id" = NEW."signingProfileId";
    SELECT pg_catalog.max("mintSeq") INTO v_prev FROM m7.m7_generation_capability_mint
     WHERE "grantId" = NEW."grantId" AND "id" <> NEW."id";
    IF v_gr."id" IS NULL
       OR NEW."uploadIntentId" IS DISTINCT FROM v_gr."uploadIntentId"                            -- (3)
       OR NEW."leaseEpoch" IS DISTINCT FROM v_gr."leaseEpoch"                                    -- (3)
       OR NEW."envelopeSha256" IS DISTINCT FROM m7.i_capability_envelope_digest(v_gr)
       OR NEW."mintSeq" IS DISTINCT FROM pg_catalog.coalesce(v_prev, 0) + 1
       OR v_i."state" IS DISTINCT FROM 'PROCESSING'
       OR v_i."leaseEpoch" IS DISTINCT FROM v_gr."leaseEpoch"
       OR v_be."retiredAt" IS NOT NULL
       OR v_sp."id" IS NULL OR v_sp."retiredAt" IS NOT NULL THEN                                 -- XF-17
        RAISE EXCEPTION 'M7_COHERENCE: a capability mint must carry its grant''s own generation and envelope digest, the next mint sequence, a current epoch on a live backend, and a live signing profile'
            USING ERRCODE = '23000';
    END IF;
    RETURN NEW;
END
$fn$;

-- DL-6: a requeue record must describe the state the outbox row is actually in.
CREATE FUNCTION m7.t_requeue_record_coherence() RETURNS trigger
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v_ob m7.m7_storage_outbox; v_pol m7.m7_retention_policy; v_e m7.m7_deletion_execution; v_next integer;
BEGIN
    SELECT * INTO v_ob FROM m7.m7_storage_outbox WHERE "id" = NEW."outboxId";
    SELECT COALESCE(pg_catalog.max(r."requeueSeq"), 0) + 1 INTO v_next
      FROM m7.m7_outbox_requeue_record r WHERE r."outboxId" = NEW."outboxId";
    IF v_ob."id" IS NULL OR v_ob."state" IS DISTINCT FROM 'FAILED_PERMANENT'
       OR NEW."requeueSeq" <> v_next
       OR NEW."attemptsAtRequeue" <> v_ob."attempts"
       OR NEW."boundPolicyVersion" IS DISTINCT FROM v_ob."boundPolicyVersion" THEN
        RAISE EXCEPTION 'M7_COHERENCE: requeue record does not describe its effect''s current state'
            USING ERRCODE = '23000';
    END IF;
    v_pol := m7.i_outbox_bound_policy(v_ob);
    IF NEW."budgetExhausted" IS DISTINCT FROM
       ((v_ob."attempts" - v_ob."attemptBudgetBase") >= v_pol."outboxMaxAttempts") THEN
        RAISE EXCEPTION 'M7_COHERENCE: budgetExhausted must be derived from the BOUND policy'
            USING ERRCODE = '23000';
    END IF;
    SELECT * INTO v_e FROM m7.m7_deletion_execution WHERE "id" = v_ob."deletionExecutionId";
    IF NEW."pastHardDueAt" IS DISTINCT FROM
       (v_e."id" IS NOT NULL AND v_e."hardDueAt" < NEW."requestedAt") THEN
        RAISE EXCEPTION 'M7_COHERENCE: pastHardDueAt must be derived from the bound execution deadline'
            USING ERRCODE = '23000';
    END IF;
    RETURN NEW;
END
$fn$;

-- DL-8: an SLA-failure row may be asserted only when the condition it names actually holds.
CREATE FUNCTION m7.t_sla_failure_coherence() RETURNS trigger
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v_e m7.m7_deletion_execution; v_ok boolean;
BEGIN
    SELECT * INTO v_e FROM m7.m7_deletion_execution WHERE "id" = NEW."executionId";
    IF v_e."id" IS NULL OR NEW."boundPolicyVersion" IS DISTINCT FROM v_e."deadlinePolicyVersion" THEN
        RAISE EXCEPTION 'M7_COHERENCE: SLA failure must bind its execution''s own deadline policy'
            USING ERRCODE = '23000';
    END IF;
    v_ok := CASE NEW."failureKind"
        WHEN 'EFFECT_FAILED_PERMANENT' THEN EXISTS (
            SELECT 1 FROM m7.m7_storage_outbox ob
             WHERE ob."deletionExecutionId" = NEW."executionId" AND ob."state" = 'FAILED_PERMANENT')
        WHEN 'COMPLETION_BUDGET_ELAPSED' THEN
            v_e."completionBudgetDueAt" < NEW."observedAt"
            AND NOT EXISTS (SELECT 1 FROM m7.m7_deletion_execution_completion c
                             WHERE c."executionId" = NEW."executionId")
        WHEN 'REQUEUED_AFTER_BUDGET_EXHAUSTION' THEN EXISTS (
            SELECT 1 FROM m7.m7_outbox_requeue_record r
              JOIN m7.m7_storage_outbox ob ON ob."id" = r."outboxId"
             WHERE ob."deletionExecutionId" = NEW."executionId"
               AND (r."budgetExhausted" OR r."pastHardDueAt"))
    END;
    IF NOT COALESCE(v_ok, false) THEN
        RAISE EXCEPTION 'M7_COHERENCE: asserted SLA failure condition does not hold' USING ERRCODE = '23000';
    END IF;
    RETURN NEW;
END
$fn$;

CREATE FUNCTION m7.t_deletion_authorization_coherence() RETURNS trigger
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v_inst uuid; v_policy text;
BEGIN
    SELECT i."id", m."retentionPolicyVersion" INTO v_inst, v_policy
      FROM m7.m7_control_plane_installation i
      JOIN m7.m7_control_plane_manifest m ON m."manifestVersion" = i."manifestVersion"
     WHERE i."retiredAt" IS NULL;
    IF NEW."installationId" IS DISTINCT FROM v_inst
       OR NEW."retentionPolicyVersion" IS DISTINCT FROM v_policy
       OR (NEW."targetSubmissionId" IS NOT NULL AND NOT EXISTS (
             SELECT 1 FROM m7.m7_evidence_submission s
              WHERE s."id" = NEW."targetSubmissionId" AND s."assignmentId" = NEW."assignmentId")) THEN
        RAISE EXCEPTION 'M7_COHERENCE: authorization target or policy outside its assignment/control-plane scope'
            USING ERRCODE = '23000';
    END IF;
    RETURN NEW;
END
$fn$;

-- The verifiable deletion predicate (§15.3) and the §15.11 deadline derivation.
CREATE FUNCTION m7.t_deletion_execution_verify() RETURNS trigger
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE
    v_ok boolean := false; v_sub m7.m7_evidence_submission; v_auth m7.m7_deletion_authorization;
    v_pol m7.m7_retention_policy; v_event_at timestamptz; v_hard timestamptz;
BEGIN
    IF NEW."targetSubmissionId" IS NOT NULL THEN
        SELECT * INTO v_sub FROM m7.m7_evidence_submission WHERE "id" = NEW."targetSubmissionId";
        IF v_sub."id" IS NULL OR v_sub."assignmentId" IS DISTINCT FROM NEW."assignmentId" THEN
            RAISE EXCEPTION 'M7_DELETION: target submission missing or outside assignment' USING ERRCODE = '42501';
        END IF;
    END IF;
    SELECT * INTO v_pol FROM m7.m7_retention_policy WHERE "policyVersion" = NEW."deadlinePolicyVersion";
    IF v_pol."policyVersion" IS NULL THEN
        RAISE EXCEPTION 'M7_DELETION: deadline policy missing' USING ERRCODE = '42501';
    END IF;

    IF NEW."basis" = 'CONSENT_WITHDRAWAL' THEN
        SELECT ce."recordedAt" INTO v_event_at FROM public.study_consent_event ce
         WHERE ce."id" = NEW."consentEventId" AND ce."action" = 'WITHDRAWN'
           AND ce."assignmentId" = NEW."assignmentId";
        v_ok := v_event_at IS NOT NULL
            AND NEW."deadlinePolicyVersion" = v_sub."retentionPolicyVersion";
        v_hard := v_event_at + v_pol."rawDeleteHardDeadlineWithdrawal";
    ELSIF NEW."basis" = 'RETENTION_EXPIRY' THEN
        v_ok := NEW."retentionPolicyVersion" = v_sub."retentionPolicyVersion"
            AND NEW."deadlinePolicyVersion" = v_sub."retentionPolicyVersion"
            AND v_sub."rawDeleteScheduleByAt" <= pg_catalog.clock_timestamp();
        v_hard := v_sub."rawDeleteHardDueAt";
    ELSIF NEW."basis" = 'LEGAL_PRIVACY_OBLIGATION' THEN
        SELECT * INTO v_auth FROM m7.m7_deletion_authorization WHERE "id" = NEW."authorizationId";
        v_ok := v_auth."id" IS NOT NULL
            AND v_auth."generationPath" = 'M7_MINT_DELETION_AUTHORIZATION_V1'
            AND v_auth."assignmentId" = NEW."assignmentId"
            AND NEW."deadlinePolicyVersion" = v_auth."retentionPolicyVersion"
            AND (   (NEW."mechanism" = v_auth."mechanism" AND NEW."targetKind" = v_auth."targetKind"
                     AND NEW."targetSubmissionId" IS NOT DISTINCT FROM v_auth."targetSubmissionId")
                 OR (NEW."mechanism" = 'RAW_OBJECT_DELETE'          -- raw bytes first, within scope
                     AND (v_auth."targetKind" = 'ASSIGNMENT_M7_DATA'
                          OR NEW."targetSubmissionId" = v_auth."targetSubmissionId")));
        v_hard := v_auth."authorizedAt" + v_pol."authorizedDeletionHardDeadline";
    END IF;

    IF NOT COALESCE(v_ok, false) THEN
        RAISE EXCEPTION 'M7_DELETION: basis predicate not satisfied for %', NEW."basis" USING ERRCODE = '42501';
    END IF;
    -- §15.11.3: the deadline fields are DERIVED, never supplied. budgetSatisfied is a fact, not a veto.
    IF NEW."hardDueAt" IS DISTINCT FROM v_hard
       OR NEW."completionBudgetDueAt" IS DISTINCT FROM (NEW."scheduledAt" + v_pol."effectCompletionBudget")
       OR NEW."budgetSatisfied" IS DISTINCT FROM (NEW."completionBudgetDueAt" <= NEW."hardDueAt") THEN
        RAISE EXCEPTION 'M7_DELETION: deadline fields do not match the derivation for basis %', NEW."basis"
            USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END
$fn$;

CREATE FUNCTION m7.t_completion_coherence() RETURNS trigger
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v_e m7.m7_deletion_execution;
BEGIN
    SELECT * INTO v_e FROM m7.m7_deletion_execution e WHERE e."id" = NEW."executionId";
    IF (v_e."mechanism" = 'RAW_OBJECT_DELETE' AND NOT EXISTS (
            SELECT 1 FROM m7.m7_storage_outbox ob
             WHERE ob."id" = NEW."confirmingOutboxId" AND ob."deletionExecutionId" = NEW."executionId"
               AND ob."state" = 'CONFIRMED'))
       OR (v_e."mechanism" IN ('ROW_REDACT','ROW_PURGE') AND NEW."affectedRowCount" IS NULL)
       OR v_e."mechanism" IS NULL THEN
        RAISE EXCEPTION 'M7_DELETION: completion not evidenced' USING ERRCODE = '23000';
    END IF;
    -- DL-7: lateness is DERIVED from this execution's own bound deadlines, never supplied. A late
    -- completion is recorded, not refused: refusing it would leave the system asserting that an
    -- object still exists when it does not.
    IF NEW."withinCompletionBudget" IS DISTINCT FROM (NEW."completedAt" <= v_e."completionBudgetDueAt")
       OR NEW."withinHardDeadline" IS DISTINCT FROM (NEW."completedAt" <= v_e."hardDueAt") THEN
        RAISE EXCEPTION 'M7_DELETION: completion lateness flags do not match the execution''s bound deadlines'
            USING ERRCODE = '23000';
    END IF;
    RETURN NEW;
END
$fn$;

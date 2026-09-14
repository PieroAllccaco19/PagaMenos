-- One attempt report per call. ABSENT_CONFIRMED means: DELETE issued, then HEAD observed not-found (§17.2),
-- ON THE BACKEND THE ROW IS BOUND TO. The worker must declare the profile it executed under; a profile on
-- any other backend is refused with M7011 and can never produce a confirmation.
CREATE FUNCTION m7.w_record_effect_attempt_v1(
    p_manifest_sha256 text, p_outbox_id uuid, p_lease_epoch bigint, p_executing_profile_id uuid,
    p_result m7."M7EffectAttemptResult", p_provider_status_code integer) RETURNS m7."M7OutboxState"
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE
    v_pol m7.m7_retention_policy;
    v_peek m7.m7_storage_outbox; v_ob m7.m7_storage_outbox; v_pr m7.m7_storage_profile;
    v_e m7.m7_deletion_execution;
    v_sub uuid; v_now timestamptz; v_no integer; v_used integer;
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', 'M7_WORKER_EFFECT_V1', true);
    PERFORM m7.i_assert_control_plane(p_manifest_sha256);
    IF p_result IS NULL OR p_executing_profile_id IS NULL THEN
        RAISE EXCEPTION 'M7_INVALID_INPUT' USING ERRCODE = 'M7007';
    END IF;

    -- lock order: artifact (class 7) before outbox (class 8), §16.2
    SELECT * INTO v_peek FROM m7.m7_storage_outbox WHERE "id" = p_outbox_id;
    IF v_peek."deletionExecutionId" IS NOT NULL THEN
        SELECT e."targetSubmissionId" INTO v_sub FROM m7.m7_deletion_execution e WHERE e."id" = v_peek."deletionExecutionId";
        PERFORM 1 FROM m7.m7_evidence_artifact a WHERE a."submissionId" = v_sub FOR UPDATE;
    END IF;
    SELECT * INTO v_ob FROM m7.m7_storage_outbox WHERE "id" = p_outbox_id FOR UPDATE;
    IF v_ob."state" IS DISTINCT FROM 'LEASED' OR v_ob."leaseEpoch" <> p_lease_epoch THEN
        RAISE EXCEPTION 'M7_STALE_LEASE' USING ERRCODE = 'M7005';
    END IF;
    -- DL-5: the attempt ceiling and the backoff cap come from THIS effect's bound policy, which for a
    -- deletion-linked effect is the policy that produced its execution's budget, not the active one.
    v_pol := m7.i_outbox_bound_policy(v_ob);

    -- NW-3: NO class-10 lock. LEASED -> PENDING / FAILED_PERMANENT stays in drain class 3 and LEASED ->
    -- CONFIRMED only reduces it (BL-9); round 3 took FOR SHARE here, which the property does not require.
    -- P1 was artifact (class 7) -> outbox (class 8); everything below is P3.
    -- ***** SI-3 *****
    SELECT * INTO v_pr FROM m7.m7_storage_profile WHERE "id" = p_executing_profile_id;
    IF v_pr."id" IS NULL OR v_pr."retiredAt" IS NOT NULL
       OR v_pr."backendSha256" IS DISTINCT FROM v_ob."backendSha256" THEN
        RAISE EXCEPTION 'M7_STORAGE_ROUTING_MISMATCH: executing profile is not a live profile of the effect''s backend'
            USING ERRCODE = 'M7011';
    END IF;

    v_now  := pg_catalog.clock_timestamp();
    v_no   := v_ob."attempts" + 1;
    v_used := v_no - v_ob."attemptBudgetBase";     -- attempts inside the CURRENT budget window (DL-6)
    INSERT INTO m7.m7_storage_effect_attempt
        ("id","outboxId","attemptNo","leaseEpoch","result","executingProfileId","executingBackendSha256",
         "providerStatusCode","attemptedAt","recordedBy","generationPath")
    VALUES (pg_catalog.gen_random_uuid(), p_outbox_id, v_no, p_lease_epoch, p_result, p_executing_profile_id,
            v_pr."backendSha256", p_provider_status_code, v_now, session_user, 'M7_WORKER_EFFECT_V1');

    IF p_result = 'ABSENT_CONFIRMED' THEN
        UPDATE m7.m7_storage_outbox
           SET "state" = 'CONFIRMED', "stateVersion" = "stateVersion" + 1, "attempts" = v_no, "leaseOwner" = NULL,
               "leaseExpiresAt" = NULL, "confirmedAt" = v_now, "updatedAt" = v_now
         WHERE "id" = p_outbox_id RETURNING * INTO v_ob;
        IF v_ob."deletionExecutionId" IS NOT NULL THEN
            UPDATE m7.m7_evidence_artifact
               SET "state" = 'DELETED', "stateVersion" = "stateVersion" + 1, "deletedConfirmedAt" = v_now,
                   "updatedAt" = v_now
             WHERE "submissionId" = v_sub AND "state" = 'DELETION_SCHEDULED';
            SELECT * INTO v_e FROM m7.m7_deletion_execution WHERE "id" = v_ob."deletionExecutionId";
            -- DL-7: lateness is recorded, never used to refuse the completion
            INSERT INTO m7.m7_deletion_execution_completion
                ("id","executionId","confirmingOutboxId","affectedRowCount","completedAt",
                 "withinCompletionBudget","withinHardDeadline","completedBy","generationPath")
            VALUES (pg_catalog.gen_random_uuid(), v_ob."deletionExecutionId", v_ob."id", NULL, v_now,
                    v_now <= v_e."completionBudgetDueAt", v_now <= v_e."hardDueAt", session_user,
                    'M7_WORKER_EFFECT_V1')
            ON CONFLICT ("executionId") DO NOTHING;
        END IF;
    ELSIF p_result IN ('STILL_PRESENT','PROVIDER_ERROR_RETRYABLE') AND v_used < v_pol."outboxMaxAttempts" THEN
        UPDATE m7.m7_storage_outbox
           SET "state" = 'PENDING', "stateVersion" = "stateVersion" + 1, "attempts" = v_no, "leaseOwner" = NULL,
               "leaseExpiresAt" = NULL, "updatedAt" = v_now,
               "nextAttemptAt" = v_now + LEAST(pg_catalog.make_interval(secs => pg_catalog.power(2, v_used)::double precision),
                                               v_pol."outboxBackoffCap")
         WHERE "id" = p_outbox_id RETURNING * INTO v_ob;
    ELSE
        UPDATE m7.m7_storage_outbox
           SET "state" = 'FAILED_PERMANENT', "stateVersion" = "stateVersion" + 1, "attempts" = v_no,
               "leaseOwner" = NULL, "leaseExpiresAt" = NULL, "updatedAt" = v_now
         WHERE "id" = p_outbox_id RETURNING * INTO v_ob;
        -- DL-8: a permanent failure of a deletion-linked effect is a DURABLE fact, not a view predicate
        PERFORM m7.i_record_sla_failure(v_ob."deletionExecutionId", 'EFFECT_FAILED_PERMANENT');
    END IF;

    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
    RETURN v_ob."state";
END
$fn$;

-- DL-6. An operator requeue is RECOVERY AFTER AN SLA FAILURE, and is recorded as such. It does not
-- reset the lifetime attempt count, and it does not restore the original DL-4 guarantee: it opens a
-- new, named budget window and, where the bound budget was already spent, asserts a durable
-- m7_deletion_sla_failure fact. p_justification_sha256 is the digest of the operator's written reason,
-- held outside the database; no free text enters M7.
CREATE FUNCTION m7.w_requeue_failed_effect_v1(
    p_manifest_sha256 text, p_outbox_id uuid, p_justification_sha256 text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE
    v_ob m7.m7_storage_outbox; v_pol m7.m7_retention_policy; v_e m7.m7_deletion_execution;
    v_now timestamptz; v_seq integer; v_exhausted boolean; v_past boolean;
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', 'M7_WORKER_EFFECT_V1', true);
    PERFORM m7.i_assert_control_plane(p_manifest_sha256);
    IF p_justification_sha256 !~ '^sha256:[0-9a-f]{64}$' THEN
        RAISE EXCEPTION 'M7_INVALID_INPUT' USING ERRCODE = 'M7007';
    END IF;
    SELECT * INTO v_ob FROM m7.m7_storage_outbox WHERE "id" = p_outbox_id FOR UPDATE;
    IF v_ob."state" IS DISTINCT FROM 'FAILED_PERMANENT' THEN
        RAISE EXCEPTION 'M7_LEASE_UNAVAILABLE' USING ERRCODE = 'M7006';
    END IF;
    PERFORM m7.i_require_routable_profile(v_ob."backendSha256");     -- refuse to requeue an unroutable effect
    -- NW-4: NO class-10 lock. FAILED_PERMANENT already blocks drain class 3, so FAILED_PERMANENT -> PENDING
    -- re-opens nothing (BL-9); round 3 called this a re-open and locked. A retired backend has no live
    -- profile, so the routability check above already refuses it (M7011).
    v_pol := m7.i_outbox_bound_policy(v_ob);                          -- DL-5
    v_now := pg_catalog.clock_timestamp();
    SELECT COALESCE(pg_catalog.max(r."requeueSeq"), 0) + 1 INTO v_seq
      FROM m7.m7_outbox_requeue_record r WHERE r."outboxId" = p_outbox_id;
    v_exhausted := (v_ob."attempts" - v_ob."attemptBudgetBase") >= v_pol."outboxMaxAttempts";
    SELECT * INTO v_e FROM m7.m7_deletion_execution WHERE "id" = v_ob."deletionExecutionId";
    v_past := v_e."id" IS NOT NULL AND v_e."hardDueAt" < v_now;

    INSERT INTO m7.m7_outbox_requeue_record
        ("id","outboxId","requeueSeq","attemptsAtRequeue","boundPolicyVersion","budgetExhausted",
         "pastHardDueAt","justificationSha256","requestedAt","requestedBy","generationPath")
    VALUES (pg_catalog.gen_random_uuid(), p_outbox_id, v_seq, v_ob."attempts", v_ob."boundPolicyVersion",
            v_exhausted, v_past, p_justification_sha256, v_now, session_user, 'M7_WORKER_EFFECT_V1');
    IF v_exhausted OR v_past THEN
        PERFORM m7.i_record_sla_failure(v_ob."deletionExecutionId", 'REQUEUED_AFTER_BUDGET_EXHAUSTION');
    END IF;

    -- attempts is NOT reset; the budget window is re-opened at the point already reached
    UPDATE m7.m7_storage_outbox
       SET "state" = 'PENDING', "stateVersion" = "stateVersion" + 1,
           "attemptBudgetBase" = v_ob."attempts", "nextAttemptAt" = v_now, "updatedAt" = v_now
     WHERE "id" = p_outbox_id;
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
END
$fn$;

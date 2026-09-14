CREATE FUNCTION m7.w_schedule_withdrawal_deletions_v1(p_manifest_sha256 text, p_limit integer) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v_subs uuid[]; r record; v_exec uuid; v_now timestamptz; v_n integer := 0;
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', 'M7_WORKER_DELETION_V1', true);
    PERFORM m7.i_assert_control_plane(p_manifest_sha256);
    v_now := pg_catalog.clock_timestamp();
    -- P1 (class 7): the whole batch of artifacts, SKIP LOCKED
    SELECT pg_catalog.array_agg(q."submissionId") INTO v_subs
      FROM (SELECT a."submissionId"
              FROM m7.m7_evidence_artifact a
              JOIN m7.m7_evidence_submission s ON s."id" = a."submissionId"
              JOIN m7.m7_retention_policy p ON p."policyVersion" = s."retentionPolicyVersion"
              JOIN public.study_consent_event ce ON ce."id" = m7.i_withdrawal_event(s."assignmentId")
             WHERE a."state" IN ('AVAILABLE','MISSING')
               AND ce."recordedAt" + p."rawDeleteScheduleAfterWithdrawal" <= v_now
               AND NOT EXISTS (SELECT 1 FROM m7.m7_deletion_execution e
                                WHERE e."targetSubmissionId" = a."submissionId" AND e."mechanism" = 'RAW_OBJECT_DELETE')
             ORDER BY a."backendSha256" COLLATE "C", ce."recordedAt", a."submissionId"
             LIMIT GREATEST(LEAST(p_limit, 500), 1)
               FOR UPDATE OF a SKIP LOCKED) q;
    IF v_subs IS NULL THEN
        PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
        RETURN 0;
    END IF;
    -- P2 (class 10): WC-9, BL-4
    PERFORM m7.i_hold_backends_liveness(ARRAY(SELECT a."backendSha256" FROM m7.m7_evidence_artifact a
                                               WHERE a."submissionId" = ANY (v_subs)));
    -- P3. The execution INSERT's foreign key takes FOR KEY SHARE on the assignment (IW-1, §16.2.7).
    -- LG-8 (round 5): the loop is ordered by assignmentId so those implicit locks ASCEND; round 4 ordered it
    -- by backend, which let two schedulers reference two assignments in opposite orders (§16.2.8 Cor. 3).
    FOR r IN
        SELECT a."submissionId", a."canonicalObjectKey", a."backendSha256", a."acceptedExecutingProfileId",
               s."assignmentId", s."retentionPolicyVersion",
               ce."id" AS consent_event_id, ce."recordedAt" AS event_at,
               p."rawDeleteHardDeadlineWithdrawal" AS hard, p."rawDeleteScheduleAfterWithdrawal" AS sched,
               p."effectCompletionBudget" AS budget
          FROM m7.m7_evidence_artifact a
          JOIN m7.m7_evidence_submission s ON s."id" = a."submissionId"
          JOIN m7.m7_retention_policy p ON p."policyVersion" = s."retentionPolicyVersion"
          JOIN public.study_consent_event ce ON ce."id" = m7.i_withdrawal_event(s."assignmentId")
         WHERE a."submissionId" = ANY (v_subs)
           AND a."state" IN ('AVAILABLE','MISSING')
           AND NOT EXISTS (SELECT 1 FROM m7.m7_deletion_execution e
                            WHERE e."targetSubmissionId" = a."submissionId" AND e."mechanism" = 'RAW_OBJECT_DELETE')
         ORDER BY s."assignmentId", a."submissionId"
    LOOP
        v_exec := pg_catalog.gen_random_uuid();
        INSERT INTO m7.m7_deletion_execution
            ("id","basis","assignmentId","consentEventId","retentionPolicyVersion","deadlinePolicyVersion",
             "authorizationId","targetKind","targetSubmissionId","mechanism","scheduledAt","scheduledBy",
             "hardDueAt","completionBudgetDueAt","budgetSatisfied","generationPath")
        VALUES (v_exec, 'CONSENT_WITHDRAWAL', r."assignmentId", r.consent_event_id, NULL, r."retentionPolicyVersion",
                NULL, 'EVIDENCE_SUBMISSION', r."submissionId", 'RAW_OBJECT_DELETE', v_now, session_user,
                r.event_at + r.hard, v_now + r.budget, (v_now + r.budget) <= (r.event_at + r.hard),
                'M7_WORKER_DELETION_V1');
        UPDATE m7.m7_evidence_artifact
           SET "state" = 'DELETION_SCHEDULED', "stateVersion" = "stateVersion" + 1, "updatedAt" = v_now
         WHERE "submissionId" = r."submissionId";
        -- SI-1: the effect is routed to the ARTIFACT's own backend, never the active one
        PERFORM m7.i_enqueue_delete('CANONICAL', r."backendSha256", r."acceptedExecutingProfileId", r."canonicalObjectKey",
                                    v_now, v_exec, NULL, NULL, NULL);
        v_n := v_n + 1;
    END LOOP;
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
    RETURN v_n;
END
$fn$;

-- §15.11: selection is by rawDeleteScheduleByAt (S), NOT by the RT-17 hard deadline (H).
CREATE FUNCTION m7.w_schedule_retention_deletions_v1(p_manifest_sha256 text, p_limit integer) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v_subs uuid[]; r record; v_exec uuid; v_now timestamptz; v_n integer := 0;
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', 'M7_WORKER_DELETION_V1', true);
    PERFORM m7.i_assert_control_plane(p_manifest_sha256);
    v_now := pg_catalog.clock_timestamp();
    -- P1 (class 7): the whole batch of artifacts, SKIP LOCKED
    SELECT pg_catalog.array_agg(q."submissionId") INTO v_subs
      FROM (SELECT a."submissionId"
              FROM m7.m7_evidence_artifact a
              JOIN m7.m7_evidence_submission s ON s."id" = a."submissionId"
             WHERE a."state" IN ('AVAILABLE','MISSING')
               AND s."rawDeleteScheduleByAt" <= v_now
               AND NOT EXISTS (SELECT 1 FROM m7.m7_deletion_execution e
                                WHERE e."targetSubmissionId" = a."submissionId" AND e."mechanism" = 'RAW_OBJECT_DELETE')
             ORDER BY a."backendSha256" COLLATE "C", s."rawDeleteScheduleByAt", a."submissionId"
             LIMIT GREATEST(LEAST(p_limit, 500), 1)
               FOR UPDATE OF a SKIP LOCKED) q;
    IF v_subs IS NULL THEN
        PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
        RETURN 0;
    END IF;
    -- P2 (class 10): WC-9, BL-4
    PERFORM m7.i_hold_backends_liveness(ARRAY(SELECT a."backendSha256" FROM m7.m7_evidence_artifact a
                                               WHERE a."submissionId" = ANY (v_subs)));
    -- P3 (IW-1 on the execution INSERT), ascending assignmentId (LG-8)
    FOR r IN
        SELECT a."submissionId", a."canonicalObjectKey", a."backendSha256", a."acceptedExecutingProfileId",
               s."assignmentId", s."retentionPolicyVersion", s."rawDeleteHardDueAt",
               p."effectCompletionBudget" AS budget
          FROM m7.m7_evidence_artifact a
          JOIN m7.m7_evidence_submission s ON s."id" = a."submissionId"
          JOIN m7.m7_retention_policy p ON p."policyVersion" = s."retentionPolicyVersion"
         WHERE a."submissionId" = ANY (v_subs)
           AND a."state" IN ('AVAILABLE','MISSING')
           AND NOT EXISTS (SELECT 1 FROM m7.m7_deletion_execution e
                            WHERE e."targetSubmissionId" = a."submissionId" AND e."mechanism" = 'RAW_OBJECT_DELETE')
         ORDER BY s."assignmentId", a."submissionId"
    LOOP
        v_exec := pg_catalog.gen_random_uuid();
        INSERT INTO m7.m7_deletion_execution
            ("id","basis","assignmentId","consentEventId","retentionPolicyVersion","deadlinePolicyVersion",
             "authorizationId","targetKind","targetSubmissionId","mechanism","scheduledAt","scheduledBy",
             "hardDueAt","completionBudgetDueAt","budgetSatisfied","generationPath")
        VALUES (v_exec, 'RETENTION_EXPIRY', r."assignmentId", NULL, r."retentionPolicyVersion",
                r."retentionPolicyVersion", NULL, 'EVIDENCE_SUBMISSION', r."submissionId", 'RAW_OBJECT_DELETE',
                v_now, session_user, r."rawDeleteHardDueAt", v_now + r.budget,
                (v_now + r.budget) <= r."rawDeleteHardDueAt", 'M7_WORKER_DELETION_V1');
        UPDATE m7.m7_evidence_artifact
           SET "state" = 'DELETION_SCHEDULED', "stateVersion" = "stateVersion" + 1, "updatedAt" = v_now
         WHERE "submissionId" = r."submissionId";
        PERFORM m7.i_enqueue_delete('CANONICAL', r."backendSha256", r."acceptedExecutingProfileId", r."canonicalObjectKey",
                                    v_now, v_exec, NULL, NULL, NULL);
        v_n := v_n + 1;
    END LOOP;
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
    RETURN v_n;
END
$fn$;

CREATE FUNCTION m7.w_schedule_authorized_deletion_v1(p_manifest_sha256 text, p_authorization_id uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE
    v_auth m7.m7_deletion_authorization; v_pol m7.m7_retention_policy; r record; v_subs uuid[];
    v_exec uuid; v_now timestamptz; v_hard timestamptz; v_n integer := 0;
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', 'M7_WORKER_DELETION_V1', true);
    PERFORM m7.i_assert_control_plane(p_manifest_sha256);
    SELECT * INTO v_auth FROM m7.m7_deletion_authorization WHERE "id" = p_authorization_id;
    IF v_auth."id" IS NULL THEN
        RAISE EXCEPTION 'M7_DELETION_PRECONDITION' USING ERRCODE = 'M7009';
    END IF;
    SELECT * INTO STRICT v_pol FROM m7.m7_retention_policy WHERE "policyVersion" = v_auth."retentionPolicyVersion";
    v_now  := pg_catalog.clock_timestamp();
    v_hard := v_auth."authorizedAt" + v_pol."authorizedDeletionHardDeadline";

    -- P1 (class 7): WAITING locks, in the one declared key order (LG-2); the only function that waits for
    -- several rows of one class
    SELECT pg_catalog.array_agg(q."submissionId") INTO v_subs
      FROM (SELECT a."submissionId"
              FROM m7.m7_evidence_artifact a
              JOIN m7.m7_evidence_submission s ON s."id" = a."submissionId"
             WHERE s."assignmentId" = v_auth."assignmentId"
               AND (v_auth."targetKind" = 'ASSIGNMENT_M7_DATA' OR s."id" = v_auth."targetSubmissionId")
               AND a."state" IN ('AVAILABLE','MISSING')
               AND NOT EXISTS (SELECT 1 FROM m7.m7_deletion_execution e
                                WHERE e."targetSubmissionId" = a."submissionId" AND e."mechanism" = 'RAW_OBJECT_DELETE')
             ORDER BY a."backendSha256" COLLATE "C", a."submissionId"
               FOR UPDATE OF a) q;

    IF v_subs IS NOT NULL THEN
        -- P2 (class 10): WC-9, BL-4 -- only when raw deletes are about to be enqueued
        PERFORM m7.i_hold_backends_liveness(ARRAY(SELECT a."backendSha256" FROM m7.m7_evidence_artifact a
                                                   WHERE a."submissionId" = ANY (v_subs)));
        -- P3: raw bytes first, for every in-scope artifact without a raw-delete execution
        FOR r IN
            SELECT a."submissionId", a."canonicalObjectKey", a."backendSha256", a."acceptedExecutingProfileId"
              FROM m7.m7_evidence_artifact a
             WHERE a."submissionId" = ANY (v_subs)
               AND a."state" IN ('AVAILABLE','MISSING')
               AND NOT EXISTS (SELECT 1 FROM m7.m7_deletion_execution e
                                WHERE e."targetSubmissionId" = a."submissionId" AND e."mechanism" = 'RAW_OBJECT_DELETE')
             ORDER BY a."backendSha256" COLLATE "C", a."submissionId"
        LOOP
            v_exec := pg_catalog.gen_random_uuid();
            INSERT INTO m7.m7_deletion_execution
                ("id","basis","assignmentId","consentEventId","retentionPolicyVersion","deadlinePolicyVersion",
                 "authorizationId","targetKind","targetSubmissionId","mechanism","scheduledAt","scheduledBy",
                 "hardDueAt","completionBudgetDueAt","budgetSatisfied","generationPath")
            VALUES (v_exec, 'LEGAL_PRIVACY_OBLIGATION', v_auth."assignmentId", NULL, NULL,
                    v_auth."retentionPolicyVersion", v_auth."id", 'EVIDENCE_SUBMISSION', r."submissionId",
                    'RAW_OBJECT_DELETE', v_now, session_user, v_hard, v_now + v_pol."effectCompletionBudget",
                    (v_now + v_pol."effectCompletionBudget") <= v_hard, 'M7_WORKER_DELETION_V1');
            UPDATE m7.m7_evidence_artifact
               SET "state" = 'DELETION_SCHEDULED', "stateVersion" = "stateVersion" + 1, "updatedAt" = v_now
             WHERE "submissionId" = r."submissionId";
            PERFORM m7.i_enqueue_delete('CANONICAL', r."backendSha256", r."acceptedExecutingProfileId", r."canonicalObjectKey",
                                        v_now, v_exec, NULL, NULL, NULL);
            v_n := v_n + 1;
        END LOOP;
    END IF;

    -- P3: the row mechanism itself (executed later by w_execute_row_redaction_v1 / w_execute_row_purge_v1).
    -- Not a drain obligation, so it needs no class-10 lock.
    IF v_auth."mechanism" IN ('ROW_REDACT','ROW_PURGE') AND NOT EXISTS (
         SELECT 1 FROM m7.m7_deletion_execution e
          WHERE e."authorizationId" = v_auth."id" AND e."mechanism" = v_auth."mechanism") THEN
        INSERT INTO m7.m7_deletion_execution
            ("id","basis","assignmentId","consentEventId","retentionPolicyVersion","deadlinePolicyVersion",
             "authorizationId","targetKind","targetSubmissionId","mechanism","scheduledAt","scheduledBy",
             "hardDueAt","completionBudgetDueAt","budgetSatisfied","generationPath")
        VALUES (pg_catalog.gen_random_uuid(), 'LEGAL_PRIVACY_OBLIGATION', v_auth."assignmentId", NULL, NULL,
                v_auth."retentionPolicyVersion", v_auth."id", v_auth."targetKind", v_auth."targetSubmissionId",
                v_auth."mechanism", v_now, session_user, v_hard, v_now + v_pol."effectCompletionBudget",
                (v_now + v_pol."effectCompletionBudget") <= v_hard, 'M7_WORKER_DELETION_V1');
        v_n := v_n + 1;
    END IF;

    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
    RETURN v_n;
END
$fn$;

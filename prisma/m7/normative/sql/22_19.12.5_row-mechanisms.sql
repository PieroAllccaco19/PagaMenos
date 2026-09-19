CREATE FUNCTION m7.w_execute_row_redaction_v1(p_manifest_sha256 text, p_execution_id uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE
    v_e m7.m7_deletion_execution; v_now timestamptz; v_n1 integer := 0; v_n2 integer := 0; v_done integer;
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', 'M7_ROW_REDACTION_V1', true);
    PERFORM m7.i_assert_control_plane(p_manifest_sha256);
    SELECT * INTO v_e FROM m7.m7_deletion_execution WHERE "id" = p_execution_id;
    IF v_e."id" IS NULL THEN
        -- RM-4/RM-5: never created, or removed by a residue-prohibited purge of this assignment
        RAISE EXCEPTION 'M7_DELETION_PRECONDITION' USING ERRCODE = 'M7009', DETAIL = 'EXECUTION_ABSENT';
    END IF;
    IF v_e."mechanism" <> 'ROW_REDACT' THEN
        RAISE EXCEPTION 'M7_DELETION_PRECONDITION' USING ERRCODE = 'M7009';
    END IF;
    SELECT c."affectedRowCount" INTO v_done FROM m7.m7_deletion_execution_completion c WHERE c."executionId" = v_e."id";
    IF v_done IS NOT NULL THEN
        PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
        RETURN v_done;                                                             -- RM-2: sequential replay
    END IF;

    PERFORM m7.i_lock_assignment_for_row_mechanism(v_e."assignmentId");            -- LO-1 / RC-13: FIRST lock (P1, class 1)

    -- RM-1 (M7V11R5-AUD-02): re-read UNDER the class-1 lock. Every writer of a completion for an execution of
    -- this assignment holds the same lock, so a duplicate that committed while this call waited is visible
    -- now and an uncommitted one cannot exist. Round 4 checked only before the lock, so a concurrent
    -- duplicate reached the completion INSERT and failed 23505 (RC-29).
    PERFORM 1 FROM m7.m7_deletion_execution e WHERE e."id" = v_e."id";
    IF NOT FOUND THEN
        RAISE EXCEPTION 'M7_DELETION_PRECONDITION' USING ERRCODE = 'M7009', DETAIL = 'EXECUTION_ABSENT';
    END IF;
    SELECT c."affectedRowCount" INTO v_done FROM m7.m7_deletion_execution_completion c WHERE c."executionId" = v_e."id";
    IF v_done IS NOT NULL THEN
        PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
        RETURN v_done;                                                             -- RM-2: concurrent replay
    END IF;

    IF EXISTS (SELECT 1 FROM m7.m7_evidence_artifact a JOIN m7.m7_evidence_submission s ON s."id" = a."submissionId"
                WHERE s."assignmentId" = v_e."assignmentId"
                  AND (v_e."targetKind" = 'ASSIGNMENT_M7_DATA' OR s."id" = v_e."targetSubmissionId")
                  AND a."state" <> 'DELETED')
       OR (v_e."targetKind" = 'ASSIGNMENT_M7_DATA' AND EXISTS (
             SELECT 1 FROM m7.m7_evidence_upload_intent i
              WHERE i."assignmentId" = v_e."assignmentId"
                AND (i."state" IN ('ISSUED','PROCESSING','VALIDATED')
                     OR EXISTS (SELECT 1 FROM m7.m7_storage_outbox ob
                                 WHERE ob."uploadIntentId" = i."id" AND ob."state" <> 'CONFIRMED')))) THEN
        RAISE EXCEPTION 'M7_DELETION_PRECONDITION' USING ERRCODE = 'M7009';        -- raw bytes must be confirmed gone first
    END IF;

    -- P1 continued (LG-5): every row this redaction will update, FOR UPDATE NOWAIT, class 6. After the
    -- assignment lock a row mechanism never waits; a busy target is retried later, never waited on.
    BEGIN
        IF v_e."targetKind" = 'ASSIGNMENT_M7_DATA' THEN
            PERFORM 1 FROM m7.m7_outcome_assertion x
             WHERE x."redactedAt" IS NULL
               AND x."outcomeId" IN (SELECT o."id" FROM m7.m7_outcome o WHERE o."assignmentId" = v_e."assignmentId")
             ORDER BY x."id" FOR UPDATE NOWAIT;
        END IF;
        PERFORM 1 FROM m7.m7_storage_observation ob
         WHERE ob."redactedAt" IS NULL
           AND ob."uploadIntentId" IN (
                 SELECT i."id" FROM m7.m7_evidence_upload_intent i
                   LEFT JOIN m7.m7_evidence_submission s ON s."uploadIntentId" = i."id"
                  WHERE i."assignmentId" = v_e."assignmentId"
                    AND (v_e."targetKind" = 'ASSIGNMENT_M7_DATA' OR s."id" = v_e."targetSubmissionId"))
         ORDER BY ob."id" FOR UPDATE NOWAIT;
    EXCEPTION WHEN lock_not_available THEN
        RAISE EXCEPTION 'M7_DELETION_PRECONDITION' USING ERRCODE = 'M7009', DETAIL = 'ROW_MECHANISM_TARGET_BUSY';
    END;

    -- P3
    v_now := pg_catalog.clock_timestamp();
    IF v_e."targetKind" = 'ASSIGNMENT_M7_DATA' THEN
        UPDATE m7.m7_outcome_assertion x
           SET "statusLabel" = NULL, "occurrenceAssertion" = NULL, "merchantAssertionKind" = NULL,
               "merchantVocabularyVersion" = NULL, "merchantRef" = NULL, "eventTimeAssertionKind" = NULL,
               "assertedEventAt" = NULL, "assertedEventLimaDate" = NULL,
               "redactedAt" = v_now, "redactionExecutionId" = v_e."id"
         WHERE x."redactedAt" IS NULL
           AND x."outcomeId" IN (SELECT o."id" FROM m7.m7_outcome o WHERE o."assignmentId" = v_e."assignmentId");
        GET DIAGNOSTICS v_n1 = ROW_COUNT;
    END IF;
    UPDATE m7.m7_storage_observation ob
       SET "byteSize" = NULL, "contentSha256" = NULL, "mediaType" = NULL, "encoderGeneration" = NULL,
           "providerEtag" = NULL, "redactedAt" = v_now, "redactionExecutionId" = v_e."id"
     WHERE ob."redactedAt" IS NULL
       AND ob."uploadIntentId" IN (
             SELECT i."id" FROM m7.m7_evidence_upload_intent i
               LEFT JOIN m7.m7_evidence_submission s ON s."uploadIntentId" = i."id"
              WHERE i."assignmentId" = v_e."assignmentId"
                AND (v_e."targetKind" = 'ASSIGNMENT_M7_DATA' OR s."id" = v_e."targetSubmissionId"));
    GET DIAGNOSTICS v_n2 = ROW_COUNT;

    INSERT INTO m7.m7_deletion_execution_completion
        ("id","executionId","confirmingOutboxId","affectedRowCount","completedAt","withinCompletionBudget","withinHardDeadline","completedBy","generationPath")
    VALUES (pg_catalog.gen_random_uuid(), v_e."id", NULL, v_n1 + v_n2, v_now, v_now <= v_e."completionBudgetDueAt", v_now <= v_e."hardDueAt", session_user, 'M7_ROW_REDACTION_V1');
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
    RETURN v_n1 + v_n2;
END
$fn$;

CREATE FUNCTION m7.w_execute_row_purge_v1(p_manifest_sha256 text, p_execution_id uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE
    v_e m7.m7_deletion_execution; v_auth m7.m7_deletion_authorization; v_now timestamptz;
    v_asg uuid; v_n integer := 0; v_k integer; v_done integer;
    v_intents uuid[]; v_subs uuid[]; v_outcomes uuid[]; v_execs uuid[]; v_participant uuid;
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', 'M7_ROW_PURGE_V1', true);
    PERFORM m7.i_assert_control_plane(p_manifest_sha256);
    SELECT * INTO v_e FROM m7.m7_deletion_execution WHERE "id" = p_execution_id;
    IF v_e."id" IS NULL THEN
        -- RM-4/RM-5 (M7V11R5-AUD-02): after a committed purge with retainDeletionHistory = false the execution
        -- identity intentionally no longer exists. The response is identical to an id that never existed; no
        -- count is returned, nothing is written, no residue is recreated.
        RAISE EXCEPTION 'M7_DELETION_PRECONDITION' USING ERRCODE = 'M7009', DETAIL = 'EXECUTION_ABSENT';
    END IF;
    IF v_e."mechanism" <> 'ROW_PURGE' OR v_e."targetKind" <> 'ASSIGNMENT_M7_DATA' THEN
        RAISE EXCEPTION 'M7_DELETION_PRECONDITION' USING ERRCODE = 'M7009';
    END IF;
    -- not STRICT: a concurrent residue-prohibited purge may commit between the two reads
    SELECT * INTO v_auth FROM m7.m7_deletion_authorization WHERE "id" = v_e."authorizationId";
    IF v_auth."id" IS NULL THEN
        RAISE EXCEPTION 'M7_DELETION_PRECONDITION' USING ERRCODE = 'M7009', DETAIL = 'EXECUTION_ABSENT';
    END IF;
    -- RM-3: sequential replay with retainDeletionHistory = true returns the stored count. Round 4 had no
    -- replay check here, so the replay reached the completion INSERT again and failed 23505.
    SELECT c."affectedRowCount" INTO v_done FROM m7.m7_deletion_execution_completion c WHERE c."executionId" = v_e."id";
    IF v_done IS NOT NULL THEN
        PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
        RETURN v_done;
    END IF;
    v_asg := v_e."assignmentId";
    v_participant := m7.i_lock_assignment_for_row_mechanism(v_asg);                -- LO-1 / RC-13: FIRST lock

    -- RM-1: re-read UNDER the class-1 lock (RC-29). A duplicate that committed while this call waited is
    -- visible now: with retainDeletionHistory = true its completion; with false, the absence of the execution.
    PERFORM 1 FROM m7.m7_deletion_execution e WHERE e."id" = v_e."id";
    IF NOT FOUND THEN
        RAISE EXCEPTION 'M7_DELETION_PRECONDITION' USING ERRCODE = 'M7009', DETAIL = 'EXECUTION_ABSENT';
    END IF;
    SELECT c."affectedRowCount" INTO v_done FROM m7.m7_deletion_execution_completion c WHERE c."executionId" = v_e."id";
    IF v_done IS NOT NULL THEN
        PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
        RETURN v_done;
    END IF;

    v_intents  := ARRAY(SELECT i."id" FROM m7.m7_evidence_upload_intent i WHERE i."assignmentId" = v_asg);
    v_subs     := ARRAY(SELECT s."id" FROM m7.m7_evidence_submission s WHERE s."assignmentId" = v_asg);
    v_outcomes := ARRAY(SELECT o."id" FROM m7.m7_outcome o WHERE o."assignmentId" = v_asg);

    -- P1 continued (LG-5, M7V11R4-AUD-02): EVERY row this purge will delete, FOR UPDATE NOWAIT, in class order
    -- 2 -> 9, before the precondition and before any DELETE. After the assignment lock this function never waits: a DELETE below touches
    -- only rows it already holds (PG-2), and a busy row raises and the purge is retried. Round 3 deleted in
    -- descending and mixed class order, taking each row lock implicitly inside the DELETE.
    BEGIN
        PERFORM 1 FROM m7.m7_participant_session s                                                      -- class 2
         WHERE s."participantId" = v_participant ORDER BY s."id" FOR UPDATE NOWAIT;
        PERFORM 1 FROM m7.m7_participant_session_revocation r
         WHERE r."sessionId" IN (SELECT s."id" FROM m7.m7_participant_session s WHERE s."participantId" = v_participant)
         ORDER BY r."id" FOR UPDATE NOWAIT;
        PERFORM 1 FROM m7.m7_outcome o WHERE o."id" = ANY (v_outcomes) ORDER BY o."id" FOR UPDATE NOWAIT;  -- class 3
        PERFORM 1 FROM m7.m7_evidence_upload_intent i                                                   -- class 4
         WHERE i."id" = ANY (v_intents) ORDER BY i."id" FOR UPDATE NOWAIT;
        PERFORM 1 FROM m7.m7_canonical_generation g                                                     -- class 5
         WHERE g."uploadIntentId" = ANY (v_intents) ORDER BY g."uploadIntentId", g."leaseEpoch" FOR UPDATE NOWAIT;
        PERFORM 1 FROM m7.m7_generation_write_grant w
         WHERE w."uploadIntentId" = ANY (v_intents) ORDER BY w."uploadIntentId", w."leaseEpoch" FOR UPDATE NOWAIT;
        PERFORM 1 FROM m7.m7_outcome_assertion x                                                        -- class 6
         WHERE x."outcomeId" = ANY (v_outcomes) ORDER BY x."id" FOR UPDATE NOWAIT;
        PERFORM 1 FROM m7.m7_evidence_submission s WHERE s."id" = ANY (v_subs) ORDER BY s."id" FOR UPDATE NOWAIT;
        PERFORM 1 FROM m7.m7_storage_observation ob
         WHERE ob."uploadIntentId" = ANY (v_intents) ORDER BY ob."id" FOR UPDATE NOWAIT;
        PERFORM 1 FROM m7.m7_evidence_artifact a                                                        -- class 7
         WHERE a."submissionId" = ANY (v_subs) ORDER BY a."submissionId" FOR UPDATE NOWAIT;
        PERFORM 1 FROM m7.m7_storage_outbox ob                                                          -- class 8
         WHERE ob."uploadIntentId" = ANY (v_intents)
            OR ob."reconciliationFindingId" IN (SELECT f."id" FROM m7.m7_reconciliation_finding f
                                                 WHERE f."uploadIntentId" = ANY (v_intents))
            OR (NOT v_auth."retainDeletionHistory"
                AND ob."deletionExecutionId" IN (SELECT e."id" FROM m7.m7_deletion_execution e WHERE e."assignmentId" = v_asg))
         ORDER BY ob."id" FOR UPDATE NOWAIT;
        -- class 9: every append-only record the steps below remove
        PERFORM 1 FROM m7.m7_generation_capability_mint mm
         WHERE mm."uploadIntentId" = ANY (v_intents) ORDER BY mm."id" FOR UPDATE NOWAIT;
        PERFORM 1 FROM m7.m7_upload_intent_transition t
         WHERE t."uploadIntentId" = ANY (v_intents) ORDER BY t."id" FOR UPDATE NOWAIT;
        PERFORM 1 FROM m7.m7_reconciliation_finding f
         WHERE f."uploadIntentId" = ANY (v_intents) ORDER BY f."id" FOR UPDATE NOWAIT;
        PERFORM 1 FROM m7.m7_storage_effect_attempt at
         WHERE at."outboxId" IN (SELECT ob."id" FROM m7.m7_storage_outbox ob
                                  WHERE ob."uploadIntentId" = ANY (v_intents)
                                     OR ob."reconciliationFindingId" IN (SELECT f."id" FROM m7.m7_reconciliation_finding f
                                                                          WHERE f."uploadIntentId" = ANY (v_intents))
                                     OR (NOT v_auth."retainDeletionHistory"
                                         AND ob."deletionExecutionId" IN (SELECT e."id" FROM m7.m7_deletion_execution e
                                                                           WHERE e."assignmentId" = v_asg)))
         ORDER BY at."id" FOR UPDATE NOWAIT;
        PERFORM 1 FROM m7.m7_storage_outbox_transition t
         WHERE t."outboxId" IN (SELECT ob."id" FROM m7.m7_storage_outbox ob
                                 WHERE ob."uploadIntentId" = ANY (v_intents)
                                    OR ob."reconciliationFindingId" IN (SELECT f."id" FROM m7.m7_reconciliation_finding f
                                                                         WHERE f."uploadIntentId" = ANY (v_intents))
                                    OR (NOT v_auth."retainDeletionHistory"
                                        AND ob."deletionExecutionId" IN (SELECT e."id" FROM m7.m7_deletion_execution e
                                                                          WHERE e."assignmentId" = v_asg)))
         ORDER BY t."id" FOR UPDATE NOWAIT;
        PERFORM 1 FROM m7.m7_outbox_requeue_record q
         WHERE q."outboxId" IN (SELECT ob."id" FROM m7.m7_storage_outbox ob
                                 WHERE ob."uploadIntentId" = ANY (v_intents)
                                    OR ob."reconciliationFindingId" IN (SELECT f."id" FROM m7.m7_reconciliation_finding f
                                                                         WHERE f."uploadIntentId" = ANY (v_intents))
                                    OR (NOT v_auth."retainDeletionHistory"
                                        AND ob."deletionExecutionId" IN (SELECT e."id" FROM m7.m7_deletion_execution e
                                                                          WHERE e."assignmentId" = v_asg)))
         ORDER BY q."id" FOR UPDATE NOWAIT;
        PERFORM 1 FROM m7.m7_evidence_integrity_finding f
         WHERE f."submissionId" = ANY (v_subs) ORDER BY f."id" FOR UPDATE NOWAIT;
        PERFORM 1 FROM m7.m7_evidence_artifact_transition t
         WHERE t."submissionId" = ANY (v_subs) ORDER BY t."id" FOR UPDATE NOWAIT;
        PERFORM 1 FROM m7.m7_evidence_submission_receipt r
         WHERE r."submissionId" = ANY (v_subs) ORDER BY r."id" FOR UPDATE NOWAIT;
        PERFORM 1 FROM m7.m7_outcome_command_receipt r
         WHERE r."outcomeId" = ANY (v_outcomes) ORDER BY r."id" FOR UPDATE NOWAIT;
        IF NOT v_auth."retainDeletionHistory" THEN
            PERFORM 1 FROM m7.m7_deletion_execution e
             WHERE e."assignmentId" = v_asg ORDER BY e."id" FOR UPDATE NOWAIT;
            PERFORM 1 FROM m7.m7_deletion_execution_completion c
             WHERE c."executionId" IN (SELECT e."id" FROM m7.m7_deletion_execution e WHERE e."assignmentId" = v_asg)
             ORDER BY c."id" FOR UPDATE NOWAIT;
            PERFORM 1 FROM m7.m7_deletion_sla_failure sf
             WHERE sf."executionId" IN (SELECT e."id" FROM m7.m7_deletion_execution e WHERE e."assignmentId" = v_asg)
             ORDER BY sf."id" FOR UPDATE NOWAIT;
            PERFORM 1 FROM m7.m7_deletion_authorization au
             WHERE au."assignmentId" = v_asg ORDER BY au."id" FOR UPDATE NOWAIT;
            PERFORM 1 FROM m7.m7_participant_erasure_request er
             WHERE er."assignmentId" = v_asg ORDER BY er."id" FOR UPDATE NOWAIT;
        END IF;
    EXCEPTION WHEN lock_not_available THEN
        RAISE EXCEPTION 'M7_DELETION_PRECONDITION' USING ERRCODE = 'M7009', DETAIL = 'ROW_MECHANISM_TARGET_BUSY';
    END;

    -- The precondition is evaluated AFTER the lock phase, on rows this transaction holds. Round 3 evaluated it
    -- with no lock but the assignment's, so an effect or finding committed between the check and the DELETEs
    -- (by a classification or enqueue holding only the intent) escaped it. Every such writer needs a class 4
    -- or class 7 row this purge now holds, so the state below cannot change before commit.
    IF EXISTS (SELECT 1 FROM m7.m7_evidence_artifact a WHERE a."submissionId" = ANY (v_subs) AND a."state" <> 'DELETED')
       OR EXISTS (SELECT 1 FROM m7.m7_evidence_upload_intent i
                   WHERE i."id" = ANY (v_intents) AND i."state" IN ('ISSUED','PROCESSING','VALIDATED'))
       -- XF-7: a purge may not remove the fence rows of an object that could still be written
       OR EXISTS (SELECT 1 FROM m7.m7_canonical_generation g
                   WHERE g."uploadIntentId" = ANY (v_intents)
                     AND g."writeFenceAt" > pg_catalog.clock_timestamp())
       OR EXISTS (SELECT 1 FROM m7.m7_evidence_upload_intent i
                   WHERE i."id" = ANY (v_intents)
                     AND i."stagingWriteFenceAt" > pg_catalog.clock_timestamp())
       OR EXISTS (SELECT 1 FROM m7.m7_storage_outbox ob
                   WHERE ob."state" <> 'CONFIRMED'
                     AND (ob."uploadIntentId" = ANY (v_intents)
                          OR ob."reconciliationFindingId" IN (SELECT f."id" FROM m7.m7_reconciliation_finding f
                                                               WHERE f."uploadIntentId" = ANY (v_intents))
                          OR ob."deletionExecutionId" IN (SELECT e."id" FROM m7.m7_deletion_execution e
                                                           WHERE e."assignmentId" = v_asg))) THEN
        RAISE EXCEPTION 'M7_DELETION_PRECONDITION' USING ERRCODE = 'M7009';
    END IF;

    -- (1) storage-hygiene rows tied to this assignment's intents.
    -- Requeue records are removed with the effect rows they describe, so §11.9 classes 6 and 7 never
    -- see a generation or intent whose evidencing effect row has been purged out from under it.
    DELETE FROM m7.m7_outbox_requeue_record WHERE "outboxId" IN (
        SELECT ob."id" FROM m7.m7_storage_outbox ob
         WHERE ob."uploadIntentId" = ANY (v_intents)
            OR ob."reconciliationFindingId" IN (SELECT f."id" FROM m7.m7_reconciliation_finding f WHERE f."uploadIntentId" = ANY (v_intents)));
    GET DIAGNOSTICS v_k = ROW_COUNT; v_n := v_n + v_k;
    DELETE FROM m7.m7_storage_effect_attempt WHERE "outboxId" IN (
        SELECT ob."id" FROM m7.m7_storage_outbox ob
         WHERE ob."uploadIntentId" = ANY (v_intents)
            OR ob."reconciliationFindingId" IN (SELECT f."id" FROM m7.m7_reconciliation_finding f WHERE f."uploadIntentId" = ANY (v_intents)));
    GET DIAGNOSTICS v_k = ROW_COUNT; v_n := v_n + v_k;
    DELETE FROM m7.m7_storage_outbox_transition WHERE "outboxId" IN (
        SELECT ob."id" FROM m7.m7_storage_outbox ob
         WHERE ob."uploadIntentId" = ANY (v_intents)
            OR ob."reconciliationFindingId" IN (SELECT f."id" FROM m7.m7_reconciliation_finding f WHERE f."uploadIntentId" = ANY (v_intents)));
    GET DIAGNOSTICS v_k = ROW_COUNT; v_n := v_n + v_k;
    DELETE FROM m7.m7_storage_outbox ob
     WHERE ob."uploadIntentId" = ANY (v_intents)
        OR ob."reconciliationFindingId" IN (SELECT f."id" FROM m7.m7_reconciliation_finding f WHERE f."uploadIntentId" = ANY (v_intents));
    GET DIAGNOSTICS v_k = ROW_COUNT; v_n := v_n + v_k;
    DELETE FROM m7.m7_reconciliation_finding WHERE "uploadIntentId" = ANY (v_intents);
    GET DIAGNOSTICS v_k = ROW_COUNT; v_n := v_n + v_k;

    -- (2) SavingEvidence and its storage lifecycle, generations included
    DELETE FROM m7.m7_evidence_integrity_finding WHERE "submissionId" = ANY (v_subs);   GET DIAGNOSTICS v_k = ROW_COUNT; v_n := v_n + v_k;
    DELETE FROM m7.m7_evidence_artifact_transition WHERE "submissionId" = ANY (v_subs); GET DIAGNOSTICS v_k = ROW_COUNT; v_n := v_n + v_k;
    DELETE FROM m7.m7_evidence_artifact WHERE "submissionId" = ANY (v_subs);            GET DIAGNOSTICS v_k = ROW_COUNT; v_n := v_n + v_k;
    DELETE FROM m7.m7_evidence_submission_receipt WHERE "submissionId" = ANY (v_subs);  GET DIAGNOSTICS v_k = ROW_COUNT; v_n := v_n + v_k;
    DELETE FROM m7.m7_evidence_submission WHERE "id" = ANY (v_subs);                    GET DIAGNOSTICS v_k = ROW_COUNT; v_n := v_n + v_k;
    DELETE FROM m7.m7_storage_observation WHERE "uploadIntentId" = ANY (v_intents);     GET DIAGNOSTICS v_k = ROW_COUNT; v_n := v_n + v_k;
    -- NW-6: NO class-10 lock. A purge only REMOVES obligations (kind D), so it can neither race a retirement
    -- unsafely nor be refused by one; round 3's p_allow_retired exception existed only to take a lock here
    -- that the property does not require, and it did so with an unordered PERFORM ... FROM (... ORDER BY 1).
    -- mints reference grants, so they go first (§11.9.2: purged rows must contribute to neither side
    -- of drain classes 6 and 7, and a left-behind mint row would keep a grant undeletable)
    DELETE FROM m7.m7_generation_capability_mint WHERE "uploadIntentId" = ANY (v_intents);  GET DIAGNOSTICS v_k = ROW_COUNT; v_n := v_n + v_k;
    DELETE FROM m7.m7_generation_write_grant WHERE "uploadIntentId" = ANY (v_intents);  GET DIAGNOSTICS v_k = ROW_COUNT; v_n := v_n + v_k;
    DELETE FROM m7.m7_canonical_generation WHERE "uploadIntentId" = ANY (v_intents);    GET DIAGNOSTICS v_k = ROW_COUNT; v_n := v_n + v_k;
    DELETE FROM m7.m7_upload_intent_transition WHERE "uploadIntentId" = ANY (v_intents); GET DIAGNOSTICS v_k = ROW_COUNT; v_n := v_n + v_k;
    DELETE FROM m7.m7_evidence_upload_intent WHERE "id" = ANY (v_intents);              GET DIAGNOSTICS v_k = ROW_COUNT; v_n := v_n + v_k;

    -- (3) Outcome
    DELETE FROM m7.m7_outcome_command_receipt WHERE "outcomeId" = ANY (v_outcomes);     GET DIAGNOSTICS v_k = ROW_COUNT; v_n := v_n + v_k;
    DELETE FROM m7.m7_outcome_assertion WHERE "outcomeId" = ANY (v_outcomes);           GET DIAGNOSTICS v_k = ROW_COUNT; v_n := v_n + v_k;
    DELETE FROM m7.m7_outcome WHERE "id" = ANY (v_outcomes);                            GET DIAGNOSTICS v_k = ROW_COUNT; v_n := v_n + v_k;

    -- (4) deletion history, only where the authority forbids residue (JBA §16.6.1 Case 2)
    IF NOT v_auth."retainDeletionHistory" THEN
        v_execs := ARRAY(SELECT e."id" FROM m7.m7_deletion_execution e WHERE e."assignmentId" = v_asg);
        DELETE FROM m7.m7_deletion_execution_completion WHERE "executionId" = ANY (v_execs);
        DELETE FROM m7.m7_deletion_sla_failure WHERE "executionId" = ANY (v_execs);
        DELETE FROM m7.m7_outbox_requeue_record WHERE "outboxId" IN (SELECT ob."id" FROM m7.m7_storage_outbox ob WHERE ob."deletionExecutionId" = ANY (v_execs));
        DELETE FROM m7.m7_storage_effect_attempt WHERE "outboxId" IN (SELECT ob."id" FROM m7.m7_storage_outbox ob WHERE ob."deletionExecutionId" = ANY (v_execs));
        DELETE FROM m7.m7_storage_outbox_transition WHERE "outboxId" IN (SELECT ob."id" FROM m7.m7_storage_outbox ob WHERE ob."deletionExecutionId" = ANY (v_execs));
        DELETE FROM m7.m7_storage_outbox WHERE "deletionExecutionId" = ANY (v_execs);
        DELETE FROM m7.m7_deletion_execution WHERE "id" = ANY (v_execs);
        DELETE FROM m7.m7_deletion_authorization WHERE "assignmentId" = v_asg;
        DELETE FROM m7.m7_participant_erasure_request WHERE "assignmentId" = v_asg;
    END IF;

    -- (5) sessions of the participant that nothing references any more
    DELETE FROM m7.m7_participant_session_revocation r
     WHERE r."sessionId" IN (SELECT s."id" FROM m7.m7_participant_session s
                              WHERE s."participantId" = v_participant
                                AND NOT EXISTS (SELECT 1 FROM m7.m7_outcome_assertion x WHERE x."participantSessionId" = s."id")
                                AND NOT EXISTS (SELECT 1 FROM m7.m7_outcome_command_receipt x WHERE x."participantSessionId" = s."id")
                                AND NOT EXISTS (SELECT 1 FROM m7.m7_evidence_upload_intent x WHERE x."participantSessionId" = s."id")
                                AND NOT EXISTS (SELECT 1 FROM m7.m7_evidence_submission x WHERE x."participantSessionId" = s."id")
                                AND NOT EXISTS (SELECT 1 FROM m7.m7_evidence_submission_receipt x WHERE x."participantSessionId" = s."id")
                                AND NOT EXISTS (SELECT 1 FROM m7.m7_participant_erasure_request x WHERE x."participantSessionId" = s."id"));
    DELETE FROM m7.m7_participant_session s
     WHERE s."participantId" = v_participant
       AND NOT EXISTS (SELECT 1 FROM m7.m7_participant_session_revocation r WHERE r."sessionId" = s."id")
       AND NOT EXISTS (SELECT 1 FROM m7.m7_outcome_assertion x WHERE x."participantSessionId" = s."id")
       AND NOT EXISTS (SELECT 1 FROM m7.m7_outcome_command_receipt x WHERE x."participantSessionId" = s."id")
       AND NOT EXISTS (SELECT 1 FROM m7.m7_evidence_upload_intent x WHERE x."participantSessionId" = s."id")
       AND NOT EXISTS (SELECT 1 FROM m7.m7_evidence_submission x WHERE x."participantSessionId" = s."id")
       AND NOT EXISTS (SELECT 1 FROM m7.m7_evidence_submission_receipt x WHERE x."participantSessionId" = s."id")
       AND NOT EXISTS (SELECT 1 FROM m7.m7_participant_erasure_request x WHERE x."participantSessionId" = s."id");

    IF v_auth."retainDeletionHistory" THEN
        v_now := pg_catalog.clock_timestamp();
        INSERT INTO m7.m7_deletion_execution_completion
            ("id","executionId","confirmingOutboxId","affectedRowCount","completedAt","withinCompletionBudget","withinHardDeadline","completedBy","generationPath")
        VALUES (pg_catalog.gen_random_uuid(), v_e."id", NULL, v_n, v_now, v_now <= v_e."completionBudgetDueAt", v_now <= v_e."hardDueAt", session_user, 'M7_ROW_PURGE_V1');
    END IF;
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
    RETURN v_n;   -- in the residue-prohibited case this count is returned to the caller only and never persisted;
                  -- a later call naming this execution gets EXECUTION_ABSENT, never this count (RM-4, RM-5)
END
$fn$;

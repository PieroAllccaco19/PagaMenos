-- §14.2 canonical resolution: explicit edges only. UNION (not UNION ALL) guarantees termination even on a
-- corrupted cyclic graph written by an owner-class actor; no depth limit exists.
CREATE VIEW m7.v_outcome_assertion_resolution AS
WITH RECURSIVE lineage ("originId", "memberId") AS (
    SELECT a."id", a."id" FROM m7.m7_outcome_assertion a WHERE a."assertionKind" = 'ORIGINAL'
    UNION
    SELECT l."originId", c."id"
      FROM lineage l JOIN m7.m7_outcome_assertion c ON c."supersedesAssertionId" = l."memberId"
)
SELECT t."outcomeId", l."originId", t."id" AS "unsupersededMemberId", t."assertionKind" AS "terminalKind",
       CASE WHEN t."assertionKind" = 'RETRACTION' THEN 'RETRACTED' ELSE 'ACTIVE_CONTENT' END AS "resolution"
  FROM lineage l
  JOIN m7.m7_outcome_assertion t ON t."id" = l."memberId"
 WHERE NOT EXISTS (SELECT 1 FROM m7.m7_outcome_assertion n WHERE n."supersedesAssertionId" = t."id");

-- §15.11.4 (1) EARLY signal: the scheduler is behind, well before any RT-17 bound is at risk.
CREATE VIEW m7.v_deletion_schedule_lag AS
SELECT s."id" AS "submissionId", 'RETENTION_EXPIRY'::text AS "basis",
       s."rawDeleteScheduleByAt" AS "scheduleByAt", s."rawDeleteHardDueAt" AS "hardDueAt", a."state" AS "artifactState",
       a."backendSha256"
  FROM m7.m7_evidence_submission s
  JOIN m7.m7_evidence_artifact a ON a."submissionId" = s."id"
 WHERE a."state" IN ('AVAILABLE','MISSING')
   AND s."rawDeleteScheduleByAt" < pg_catalog.clock_timestamp()
   AND NOT EXISTS (SELECT 1 FROM m7.m7_deletion_execution e
                    WHERE e."targetSubmissionId" = s."id" AND e."mechanism" = 'RAW_OBJECT_DELETE')
UNION ALL
SELECT s."id", 'CONSENT_WITHDRAWAL'::text,
       ce."recordedAt" + p."rawDeleteScheduleAfterWithdrawal", ce."recordedAt" + p."rawDeleteHardDeadlineWithdrawal",
       a."state", a."backendSha256"
  FROM m7.m7_evidence_submission s
  JOIN m7.m7_evidence_artifact a ON a."submissionId" = s."id"
  JOIN m7.m7_retention_policy p ON p."policyVersion" = s."retentionPolicyVersion"
  JOIN public.study_consent_event ce ON ce."assignmentId" = s."assignmentId" AND ce."action" = 'WITHDRAWN'
 WHERE a."state" IN ('AVAILABLE','MISSING')
   AND ce."recordedAt" + p."rawDeleteScheduleAfterWithdrawal" < pg_catalog.clock_timestamp()
   AND NOT EXISTS (SELECT 1 FROM m7.m7_deletion_execution e
                    WHERE e."targetSubmissionId" = s."id" AND e."mechanism" = 'RAW_OBJECT_DELETE');

-- §15.11.4 (2) AT-RISK / FAILED: a permanent failure or an unroutable backend lands HERE,
-- never in a DELETED artifact and never in a CONFIRMED outbox row.
CREATE VIEW m7.v_deletion_sla_critical AS
SELECT e."id" AS "executionId", e."basis", e."targetSubmissionId", e."hardDueAt", e."completionBudgetDueAt",
       'BUDGET_EXCEEDS_HARD_DEADLINE'::text AS "concern", NULL::text AS "backendSha256"
  FROM m7.m7_deletion_execution e
 WHERE NOT e."budgetSatisfied"
   AND NOT EXISTS (SELECT 1 FROM m7.m7_deletion_execution_completion c WHERE c."executionId" = e."id")
UNION ALL
SELECT e."id", e."basis", e."targetSubmissionId", e."hardDueAt", e."completionBudgetDueAt",
       'BUDGET_ELAPSED'::text, ob."backendSha256"
  FROM m7.m7_deletion_execution e
  LEFT JOIN m7.m7_storage_outbox ob ON ob."deletionExecutionId" = e."id"
 WHERE e."completionBudgetDueAt" < pg_catalog.clock_timestamp()
   AND NOT EXISTS (SELECT 1 FROM m7.m7_deletion_execution_completion c WHERE c."executionId" = e."id")
UNION ALL
SELECT e."id", e."basis", e."targetSubmissionId", e."hardDueAt", e."completionBudgetDueAt",
       'EFFECT_FAILED_PERMANENT'::text, ob."backendSha256"
  FROM m7.m7_deletion_execution e
  JOIN m7.m7_storage_outbox ob ON ob."deletionExecutionId" = e."id"
 WHERE ob."state" = 'FAILED_PERMANENT'
UNION ALL
SELECT e."id", e."basis", e."targetSubmissionId", e."hardDueAt", e."completionBudgetDueAt",
       'UNROUTABLE_BACKEND'::text, ob."backendSha256"
  FROM m7.m7_deletion_execution e
  JOIN m7.m7_storage_outbox ob ON ob."deletionExecutionId" = e."id"
 WHERE ob."state" <> 'CONFIRMED'
   AND NOT EXISTS (SELECT 1 FROM m7.m7_storage_profile p
                    WHERE p."backendSha256" = ob."backendSha256" AND p."retiredAt" IS NULL)
UNION ALL
-- DL-8: the DURABLE record, which survives a later completion. Without this row an execution that
-- blew its budget and was then requeued into eventual success would read as compliant.
SELECT e."id", e."basis", e."targetSubmissionId", e."hardDueAt", e."completionBudgetDueAt",
       'RECORDED_SLA_FAILURE:' || f."failureKind"::text, NULL::text
  FROM m7.m7_deletion_execution e
  JOIN m7.m7_deletion_sla_failure f ON f."executionId" = e."id"
UNION ALL
-- DL-6: a completion that landed outside its own bound budget is reported, not hidden
SELECT e."id", e."basis", e."targetSubmissionId", e."hardDueAt", e."completionBudgetDueAt",
       'COMPLETED_OUTSIDE_BUDGET'::text, NULL::text
  FROM m7.m7_deletion_execution e
  JOIN m7.m7_deletion_execution_completion c ON c."executionId" = e."id"
 WHERE NOT c."withinCompletionBudget";

-- §15.11.4 (3) ACTUAL BREACH of the RT-17 completion bound.
CREATE VIEW m7.v_deletion_sla_breach AS
SELECT e."id" AS "executionId", e."basis", e."targetSubmissionId", e."hardDueAt", a."state" AS "artifactState",
       a."backendSha256"
  FROM m7.m7_deletion_execution e
  LEFT JOIN m7.m7_evidence_artifact a ON a."submissionId" = e."targetSubmissionId"
 WHERE e."hardDueAt" < pg_catalog.clock_timestamp()
   AND NOT EXISTS (SELECT 1 FROM m7.m7_deletion_execution_completion c WHERE c."executionId" = e."id");

-- DL-8. Monitoring (w_list_deletion_sla_v1) stays strictly read-only; this is the separate, scheduled
-- step that turns an observed budget overrun into a DURABLE fact. It records failures and nothing
-- else: it never deletes, never completes, and never changes an artifact or an outbox row.
CREATE FUNCTION m7.w_assert_deletion_sla_failures_v1(p_manifest_sha256 text, p_limit integer) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE r record; v_n integer := 0;
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', 'M7_WORKER_DELETION_V1', true);
    PERFORM m7.i_assert_control_plane(p_manifest_sha256);
    FOR r IN
        SELECT e."id"
          FROM m7.m7_deletion_execution e
         WHERE e."completionBudgetDueAt" < pg_catalog.clock_timestamp()
           AND NOT EXISTS (SELECT 1 FROM m7.m7_deletion_execution_completion c WHERE c."executionId" = e."id")
           AND NOT EXISTS (SELECT 1 FROM m7.m7_deletion_sla_failure f
                            WHERE f."executionId" = e."id" AND f."failureKind" = 'COMPLETION_BUDGET_ELAPSED')
         -- IW-5 ordered: every instance inserts (executionId, kind) keys in the same total order. Round 3
         -- ordered by completionBudgetDueAt alone, so two concurrent runs could insert tied keys in
         -- opposite orders and deadlock on unique-insertion waits (A.2.3 #47).
         ORDER BY e."completionBudgetDueAt", e."id"
         LIMIT GREATEST(LEAST(p_limit, 500), 1)
    LOOP
        PERFORM m7.i_record_sla_failure(r."id", 'COMPLETION_BUDGET_ELAPSED');
        v_n := v_n + 1;
    END LOOP;
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
    RETURN v_n;
END
$fn$;

CREATE FUNCTION m7.w_list_deletion_sla_v1(p_manifest_sha256 text)
    RETURNS TABLE (severity text, execution_id uuid, submission_id uuid, basis text, concern text,
                   due_at text, backend_sha256 text)
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
    PERFORM m7.i_assert_control_plane(p_manifest_sha256);
    RETURN QUERY
    SELECT 'BREACH'::text, v."executionId", v."targetSubmissionId", v."basis"::text, 'HARD_DEADLINE_MISSED'::text,
           m7.i_ts(v."hardDueAt"), v."backendSha256"
      FROM m7.v_deletion_sla_breach v
    UNION ALL
    SELECT 'CRITICAL'::text, v."executionId", v."targetSubmissionId", v."basis"::text, v."concern",
           m7.i_ts(v."completionBudgetDueAt"), v."backendSha256"
      FROM m7.v_deletion_sla_critical v
    UNION ALL
    SELECT 'LAG'::text, NULL::uuid, v."submissionId", v."basis", 'NOT_SCHEDULED_BY_DEADLINE'::text,
           m7.i_ts(v."scheduleByAt"), v."backendSha256"
      FROM m7.v_deletion_schedule_lag v
    ORDER BY 1, 6, 3;
END
$fn$;

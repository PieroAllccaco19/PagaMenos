-- Generic guards on every M7 table: INSERT path allowlist, UPDATE/DELETE/TRUNCATE protection.
DO $triggers$
DECLARE
    r record;
    v_args text;
BEGIN
    FOR r IN SELECT * FROM (VALUES
        ('m7_storage_backend',               ARRAY['M7_CONTROL_PLANE_INSTALL_V1'], false, false),
        ('m7_storage_profile',               ARRAY['M7_CONTROL_PLANE_INSTALL_V1'], false, false),
        ('m7_retention_policy',              ARRAY['M7_CONTROL_PLANE_INSTALL_V1'], false, true),
        ('m7_merchant_vocabulary',           ARRAY['M7_CONTROL_PLANE_INSTALL_V1'], false, true),
        ('m7_merchant_vocabulary_entry',     ARRAY['M7_CONTROL_PLANE_INSTALL_V1'], false, true),
        ('m7_control_plane_manifest',        ARRAY['M7_CONTROL_PLANE_INSTALL_V1'], false, true),
        ('m7_control_plane_installation',    ARRAY['M7_CONTROL_PLANE_INSTALL_V1'], false, false),
        ('m7_expected_relation',             ARRAY['M7_CONTROL_PLANE_INSTALL_V1'], false, true),
        ('m7_expected_relation_object',      ARRAY['M7_CONTROL_PLANE_INSTALL_V1'], false, true),
        ('m7_expected_function',             ARRAY['M7_CONTROL_PLANE_INSTALL_V1'], false, true),
        ('m7_expected_function_grant',       ARRAY['M7_CONTROL_PLANE_INSTALL_V1'], false, true),
        ('m7_expected_role',                 ARRAY['M7_CONTROL_PLANE_INSTALL_V1'], false, true),
        ('m7_expected_role_member',          ARRAY['M7_CONTROL_PLANE_INSTALL_V1'], false, true),
        ('m7_participant_session',           ARRAY['M7_ISSUE_SESSION_V1'], true, true),
        ('m7_participant_session_revocation', ARRAY['M7_REVOKE_SESSION_V1'], true, true),
        ('m7_outcome',                       ARRAY['M7_RECORD_OUTCOME_ASSERTION_V1','M7_FINALIZE_EVIDENCE_V1'], true, true),
        ('m7_outcome_assertion',             ARRAY['M7_RECORD_OUTCOME_ASSERTION_V1'], true, false),
        ('m7_outcome_command_receipt',       ARRAY['M7_RECORD_OUTCOME_ASSERTION_V1'], true, true),
        ('m7_evidence_upload_intent',        ARRAY['M7_BEGIN_EVIDENCE_UPLOAD_V1'], true, false),
        ('m7_canonical_generation',          ARRAY['M7_WORKER_UPLOAD_V1'], true, true),
        ('m7_generation_write_grant',        ARRAY['M7_WORKER_UPLOAD_V1'], true, true),
        ('m7_upload_intent_transition',      ARRAY['M7_BEGIN_EVIDENCE_UPLOAD_V1','M7_WORKER_UPLOAD_V1','M7_FINALIZE_EVIDENCE_V1'], true, true),
        ('m7_storage_observation',           ARRAY['M7_WORKER_UPLOAD_V1'], true, false),
        ('m7_evidence_submission',           ARRAY['M7_FINALIZE_EVIDENCE_V1'], true, true),
        ('m7_evidence_submission_receipt',   ARRAY['M7_FINALIZE_EVIDENCE_V1'], true, true),
        ('m7_evidence_artifact',             ARRAY['M7_FINALIZE_EVIDENCE_V1'], true, false),
        ('m7_evidence_artifact_transition',  ARRAY['M7_FINALIZE_EVIDENCE_V1','M7_WORKER_DELETION_V1','M7_WORKER_EFFECT_V1','M7_WORKER_RECONCILIATION_V1'], true, true),
        ('m7_evidence_integrity_finding',    ARRAY['M7_WORKER_RECONCILIATION_V1'], true, true),
        ('m7_reconciliation_finding',        ARRAY['M7_WORKER_RECONCILIATION_V1'], true, true),
        ('m7_participant_erasure_request',   ARRAY['M7_PRIVACY_REQUEST_V1'], true, true),
        ('m7_deletion_authorization',        ARRAY['M7_MINT_DELETION_AUTHORIZATION_V1'], true, true),
        ('m7_deletion_execution',            ARRAY['M7_WORKER_DELETION_V1'], true, true),
        ('m7_storage_outbox',                ARRAY['M7_WORKER_UPLOAD_V1','M7_WORKER_DELETION_V1','M7_WORKER_RECONCILIATION_V1'], true, false),
        ('m7_storage_outbox_transition',     ARRAY['M7_WORKER_UPLOAD_V1','M7_WORKER_DELETION_V1','M7_WORKER_RECONCILIATION_V1','M7_WORKER_EFFECT_V1'], true, true),
        ('m7_storage_effect_attempt',        ARRAY['M7_WORKER_EFFECT_V1'], true, true),
        ('m7_deletion_execution_completion', ARRAY['M7_WORKER_EFFECT_V1','M7_ROW_REDACTION_V1','M7_ROW_PURGE_V1'], true, true),
        ('m7_outbox_requeue_record',         ARRAY['M7_WORKER_EFFECT_V1'], true, true),
        ('m7_deletion_sla_failure',          ARRAY['M7_WORKER_EFFECT_V1','M7_WORKER_DELETION_V1'], true, true),
        ('m7_generation_capability_mint',    ARRAY['M7_CAPABILITY_MINT_V1'], true, true)
    ) AS t(tbl, paths, purgeable, forbid_update)
    LOOP
        SELECT pg_catalog.string_agg(pg_catalog.quote_literal(p), ', ') INTO v_args FROM pg_catalog.unnest(r.paths) AS p;
        EXECUTE pg_catalog.format('CREATE TRIGGER %I BEFORE INSERT ON m7.%I FOR EACH ROW EXECUTE FUNCTION m7.t_guard_insert(%s)',
                                  r.tbl || '_a_guard_insert', r.tbl, v_args);
        EXECUTE pg_catalog.format('CREATE TRIGGER %I BEFORE DELETE ON m7.%I FOR EACH ROW EXECUTE FUNCTION m7.t_forbid_mutation(%L)',
                                  r.tbl || '_a_guard_delete', r.tbl, CASE WHEN r.purgeable THEN 'PURGEABLE' ELSE 'IMMUTABLE' END);
        EXECUTE pg_catalog.format('CREATE TRIGGER %I BEFORE TRUNCATE ON m7.%I FOR EACH STATEMENT EXECUTE FUNCTION m7.t_forbid_mutation(%L)',
                                  r.tbl || '_a_guard_truncate', r.tbl, 'IMMUTABLE');
        IF r.forbid_update THEN
            EXECUTE pg_catalog.format('CREATE TRIGGER %I BEFORE UPDATE ON m7.%I FOR EACH ROW EXECUTE FUNCTION m7.t_forbid_mutation(%L)',
                                      r.tbl || '_a_guard_update', r.tbl, 'IMMUTABLE');
        END IF;
    END LOOP;
END
$triggers$;

-- Specific UPDATE guards (tables whose forbid_update = false above).
CREATE TRIGGER m7_storage_backend_a_guard_update BEFORE UPDATE ON m7.m7_storage_backend
    FOR EACH ROW EXECUTE FUNCTION m7.t_storage_backend_guard();
CREATE TRIGGER m7_storage_profile_a_guard_update BEFORE UPDATE ON m7.m7_storage_profile
    FOR EACH ROW EXECUTE FUNCTION m7.t_storage_profile_guard();
CREATE TRIGGER m7_control_plane_installation_a_guard_update BEFORE UPDATE ON m7.m7_control_plane_installation
    FOR EACH ROW EXECUTE FUNCTION m7.t_installation_guard();
CREATE TRIGGER m7_outcome_assertion_a_guard_update BEFORE UPDATE ON m7.m7_outcome_assertion
    FOR EACH ROW EXECUTE FUNCTION m7.t_assertion_redaction_guard();
CREATE TRIGGER m7_storage_observation_a_guard_update BEFORE UPDATE ON m7.m7_storage_observation
    FOR EACH ROW EXECUTE FUNCTION m7.t_observation_redaction_guard();
CREATE TRIGGER m7_evidence_upload_intent_a_guard_update BEFORE UPDATE ON m7.m7_evidence_upload_intent
    FOR EACH ROW EXECUTE FUNCTION m7.t_upload_intent_guard();
CREATE TRIGGER m7_evidence_artifact_a_guard_update BEFORE UPDATE ON m7.m7_evidence_artifact
    FOR EACH ROW EXECUTE FUNCTION m7.t_artifact_guard();
CREATE TRIGGER m7_storage_outbox_a_guard_update BEFORE UPDATE ON m7.m7_storage_outbox
    FOR EACH ROW EXECUTE FUNCTION m7.t_outbox_guard();

-- Coherence (BEFORE INSERT; the "_b_"/"_c_" prefixes order them after "_a_guard_insert").
CREATE TRIGGER m7_participant_session_b_coherence BEFORE INSERT ON m7.m7_participant_session
    FOR EACH ROW EXECUTE FUNCTION m7.t_session_coherence();
CREATE TRIGGER m7_outcome_b_coherence BEFORE INSERT ON m7.m7_outcome
    FOR EACH ROW EXECUTE FUNCTION m7.t_outcome_coherence();
CREATE TRIGGER m7_outcome_assertion_b_coherence BEFORE INSERT ON m7.m7_outcome_assertion
    FOR EACH ROW EXECUTE FUNCTION m7.t_assertion_coherence();
CREATE TRIGGER m7_outcome_command_receipt_b_coherence BEFORE INSERT ON m7.m7_outcome_command_receipt
    FOR EACH ROW EXECUTE FUNCTION m7.t_session_assignment_coherence();
CREATE TRIGGER m7_evidence_upload_intent_b_coherence BEFORE INSERT ON m7.m7_evidence_upload_intent
    FOR EACH ROW EXECUTE FUNCTION m7.t_upload_intent_coherence();
CREATE TRIGGER m7_evidence_upload_intent_c_session BEFORE INSERT ON m7.m7_evidence_upload_intent
    FOR EACH ROW EXECUTE FUNCTION m7.t_session_assignment_coherence();
CREATE TRIGGER m7_generation_capability_mint_b_coherence BEFORE INSERT ON m7.m7_generation_capability_mint
    FOR EACH ROW EXECUTE FUNCTION m7.t_capability_mint_coherence();
CREATE TRIGGER m7_generation_write_grant_b_coherence BEFORE INSERT ON m7.m7_generation_write_grant
    FOR EACH ROW EXECUTE FUNCTION m7.t_write_grant_coherence();
CREATE TRIGGER m7_outbox_requeue_record_b_coherence BEFORE INSERT ON m7.m7_outbox_requeue_record
    FOR EACH ROW EXECUTE FUNCTION m7.t_requeue_record_coherence();
CREATE TRIGGER m7_deletion_sla_failure_b_coherence BEFORE INSERT ON m7.m7_deletion_sla_failure
    FOR EACH ROW EXECUTE FUNCTION m7.t_sla_failure_coherence();
CREATE TRIGGER m7_canonical_generation_b_coherence BEFORE INSERT ON m7.m7_canonical_generation
    FOR EACH ROW EXECUTE FUNCTION m7.t_generation_coherence();
CREATE TRIGGER m7_storage_observation_b_coherence BEFORE INSERT ON m7.m7_storage_observation
    FOR EACH ROW EXECUTE FUNCTION m7.t_observation_coherence();
CREATE TRIGGER m7_evidence_submission_b_coherence BEFORE INSERT ON m7.m7_evidence_submission
    FOR EACH ROW EXECUTE FUNCTION m7.t_submission_coherence();
CREATE TRIGGER m7_evidence_submission_c_session BEFORE INSERT ON m7.m7_evidence_submission
    FOR EACH ROW EXECUTE FUNCTION m7.t_session_assignment_coherence();
CREATE TRIGGER m7_evidence_submission_receipt_b_coherence BEFORE INSERT ON m7.m7_evidence_submission_receipt
    FOR EACH ROW EXECUTE FUNCTION m7.t_session_assignment_coherence();
CREATE TRIGGER m7_evidence_artifact_b_coherence BEFORE INSERT ON m7.m7_evidence_artifact
    FOR EACH ROW EXECUTE FUNCTION m7.t_artifact_coherence();
CREATE TRIGGER m7_evidence_integrity_finding_b_coherence BEFORE INSERT ON m7.m7_evidence_integrity_finding
    FOR EACH ROW EXECUTE FUNCTION m7.t_integrity_finding_coherence();
CREATE TRIGGER m7_reconciliation_finding_b_coherence BEFORE INSERT ON m7.m7_reconciliation_finding
    FOR EACH ROW EXECUTE FUNCTION m7.t_reconciliation_finding_coherence();
CREATE TRIGGER m7_participant_erasure_request_b_coherence BEFORE INSERT ON m7.m7_participant_erasure_request
    FOR EACH ROW EXECUTE FUNCTION m7.t_session_assignment_coherence();
CREATE TRIGGER m7_deletion_authorization_b_coherence BEFORE INSERT ON m7.m7_deletion_authorization
    FOR EACH ROW EXECUTE FUNCTION m7.t_deletion_authorization_coherence();
CREATE TRIGGER m7_deletion_execution_b_verify BEFORE INSERT ON m7.m7_deletion_execution
    FOR EACH ROW EXECUTE FUNCTION m7.t_deletion_execution_verify();
CREATE TRIGGER m7_storage_outbox_b_coherence BEFORE INSERT ON m7.m7_storage_outbox
    FOR EACH ROW EXECUTE FUNCTION m7.t_outbox_coherence();
CREATE TRIGGER m7_storage_effect_attempt_b_coherence BEFORE INSERT ON m7.m7_storage_effect_attempt
    FOR EACH ROW EXECUTE FUNCTION m7.t_effect_attempt_coherence();
CREATE TRIGGER m7_deletion_execution_completion_b_coherence BEFORE INSERT ON m7.m7_deletion_execution_completion
    FOR EACH ROW EXECUTE FUNCTION m7.t_completion_coherence();

-- Transition logs (AFTER; one log row per INSERT and per UPDATE).
CREATE TRIGGER m7_evidence_upload_intent_z_log AFTER INSERT OR UPDATE ON m7.m7_evidence_upload_intent
    FOR EACH ROW EXECUTE FUNCTION m7.t_upload_intent_log();
CREATE TRIGGER m7_evidence_artifact_z_log AFTER INSERT OR UPDATE ON m7.m7_evidence_artifact
    FOR EACH ROW EXECUTE FUNCTION m7.t_artifact_log();
CREATE TRIGGER m7_storage_outbox_z_log AFTER INSERT OR UPDATE ON m7.m7_storage_outbox
    FOR EACH ROW EXECUTE FUNCTION m7.t_outbox_log();

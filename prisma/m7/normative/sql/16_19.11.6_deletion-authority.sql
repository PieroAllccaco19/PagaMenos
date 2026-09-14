CREATE FUNCTION m7.a_mint_deletion_authorization_v1(
    p_manifest_sha256 text, p_basis_code m7."M7LegalBasisCode", p_assignment_id uuid, p_erasure_request_id uuid,
    p_target_kind m7."M7DeletionTargetKind", p_target_submission_id uuid, p_mechanism m7."M7DeletionMechanism",
    p_retain_deletion_history boolean, p_decision_record_sha256 text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE
    v_inst m7.m7_control_plane_installation; v_man m7.m7_control_plane_manifest;
    v_id uuid := pg_catalog.gen_random_uuid();
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', 'M7_MINT_DELETION_AUTHORIZATION_V1', true);
    v_inst := m7.i_assert_control_plane(p_manifest_sha256);
    v_man  := m7.i_manifest(v_inst);
    INSERT INTO m7.m7_deletion_authorization
        ("id","basisCode","assignmentId","erasureRequestId","targetKind","targetSubmissionId","mechanism",
         "retainDeletionHistory","decisionRecordSha256","retentionPolicyVersion","authorizedAt","authorizedBy",
         "installationId","generationPath")
    VALUES (v_id, p_basis_code, p_assignment_id, p_erasure_request_id, p_target_kind, p_target_submission_id, p_mechanism,
            p_retain_deletion_history, p_decision_record_sha256, v_man."retentionPolicyVersion",
            pg_catalog.clock_timestamp(), session_user, v_inst."id", 'M7_MINT_DELETION_AUTHORIZATION_V1');
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
    RETURN v_id;
END
$fn$;

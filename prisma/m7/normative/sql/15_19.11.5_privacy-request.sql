CREATE FUNCTION m7.r_record_erasure_request_v1(
    p_manifest_sha256 text, p_session_secret bytea, p_participant_id uuid, p_assignment_id uuid,
    p_client_request_key text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v_session uuid; v_id uuid;
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', 'M7_PRIVACY_REQUEST_V1', true);
    PERFORM m7.i_assert_control_plane(p_manifest_sha256);
    v_session := m7.i_require_session(p_session_secret, p_participant_id);
    -- LO-1: TO-3 must NOT lock experiment_assignment; relational re-proof only (LO-2 permits the read).
    IF NOT EXISTS (SELECT 1 FROM public.experiment_assignment a
                    WHERE a."id" = p_assignment_id AND a."participantId" = p_participant_id) THEN
        RAISE EXCEPTION 'M7_SESSION_INVALID' USING ERRCODE = '28000';
    END IF;
    IF p_client_request_key !~ '^[A-Za-z0-9_-]{16,128}$' THEN
        RAISE EXCEPTION 'M7_INVALID_INPUT' USING ERRCODE = 'M7007';
    END IF;
    INSERT INTO m7.m7_participant_erasure_request
        ("id","assignmentId","participantSessionId","clientRequestKey","requestedAt","generationPath")
    VALUES (pg_catalog.gen_random_uuid(), p_assignment_id, v_session, p_client_request_key,
            pg_catalog.clock_timestamp(), 'M7_PRIVACY_REQUEST_V1')
    ON CONFLICT ("assignmentId", "clientRequestKey") DO NOTHING
    RETURNING "id" INTO v_id;
    IF v_id IS NULL THEN
        SELECT e."id" INTO STRICT v_id FROM m7.m7_participant_erasure_request e
         WHERE e."assignmentId" = p_assignment_id AND e."clientRequestKey" = p_client_request_key;
    END IF;
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
    RETURN v_id;
END
$fn$;

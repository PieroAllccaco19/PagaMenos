CREATE FUNCTION m7.s_issue_participant_session_v1(
    p_manifest_sha256 text, p_participant_id uuid, p_handle_sha256 bytea)
    RETURNS TABLE (session_id uuid, expires_at text)
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE
    v_inst m7.m7_control_plane_installation; v_man m7.m7_control_plane_manifest; v_pol m7.m7_retention_policy;
    v_id uuid := pg_catalog.gen_random_uuid(); v_now timestamptz;
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', 'M7_ISSUE_SESSION_V1', true);
    v_inst := m7.i_assert_control_plane(p_manifest_sha256);
    v_man  := m7.i_manifest(v_inst);
    v_pol  := m7.i_policy(v_man);
    IF p_handle_sha256 IS NULL OR pg_catalog.octet_length(p_handle_sha256) <> 32
       OR NOT EXISTS (SELECT 1 FROM public.study_participant sp WHERE sp."id" = p_participant_id) THEN
        RAISE EXCEPTION 'M7_INVALID_INPUT' USING ERRCODE = 'M7007';
    END IF;
    v_now := pg_catalog.clock_timestamp();
    INSERT INTO m7.m7_participant_session
        ("id","participantId","handleSha256","issuedAt","expiresAt","issuedBy","installationId","generationPath")
    VALUES (v_id, p_participant_id, p_handle_sha256, v_now, v_now + v_pol."sessionTtl", session_user, v_inst."id",
            'M7_ISSUE_SESSION_V1');
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
    RETURN QUERY SELECT v_id, m7.i_ts(v_now + v_pol."sessionTtl");
END
$fn$;

-- RV-1..RV-5 (§8.2). Round 4 took the session row FOR UPDATE and WAITED for every FOR SHARE validator. Under the
-- conservative PG-1 that waiting request is a queue head: SO-1/2/3 (holding the assignment) could queue their
-- session FOR SHARE behind it while r_record_erasure_request_v1 (holding the session FOR SHARE) waited on the
-- assignment -- a cycle (§16.2.8 Corollary 2). The revocation is now written first and never waits.
CREATE FUNCTION m7.s_revoke_participant_session_v1(
    p_manifest_sha256 text, p_session_id uuid, p_reason m7."M7SessionRevocationReason") RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v_state text;
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', 'M7_REVOKE_SESSION_V1', true);
    PERFORM m7.i_assert_control_plane(p_manifest_sha256);
    IF NOT EXISTS (SELECT 1 FROM m7.m7_participant_session s WHERE s."id" = p_session_id) THEN
        RAISE EXCEPTION 'M7_INVALID_INPUT' USING ERRCODE = 'M7007';
    END IF;
    -- RV-1: effective at commit for every later validation. The foreign key's FOR KEY SHARE on the session can
    -- conflict only with FOR UPDATE, held only by TO-5 or by another revocation's probe, neither of which waits
    -- (§16.2.8 LV-2). A concurrent first revocation of the same session is an IW-5 single wait (LV-4).
    INSERT INTO m7.m7_participant_session_revocation ("id","sessionId","reason","revokedAt","revokedBy","generationPath")
    VALUES (pg_catalog.gen_random_uuid(), p_session_id, p_reason, pg_catalog.clock_timestamp(), session_user, 'M7_REVOKE_SESSION_V1')
    ON CONFLICT ("sessionId") DO NOTHING;
    -- RV-3: quiescence probe. NOWAIT (LG-10): this transaction is never a waiter on the session row (PG-3).
    -- Acquired => no transaction holding a validation of this session is in flight, and any later validator
    -- waits for this commit and then sees the revocation row.
    BEGIN
        PERFORM 1 FROM m7.m7_participant_session s WHERE s."id" = p_session_id FOR UPDATE NOWAIT;
        v_state := 'QUIESCENT';
    EXCEPTION WHEN lock_not_available THEN
        v_state := 'DRAINING';                                  -- RV-2 / RV-4: the session module re-invokes
    END;
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
    RETURN v_state;
END
$fn$;

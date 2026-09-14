-- Revoke everything from PUBLIC, then grant EXECUTE strictly by capability. c_* gets NO grantee (RS-8).
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA m7 FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA m7 FROM PUBLIC;
DO $grants$
DECLARE r record;
BEGIN
    FOR r IN
        SELECT p.oid::regprocedure AS fn,
               CASE pg_catalog.substring(p.proname FROM 1 FOR 2)
                    WHEN 'p_' THEN 'pagamenos_m7_participant_rt'
                    WHEN 's_' THEN 'pagamenos_m7_session_issuer_rt'
                    WHEN 'r_' THEN 'pagamenos_m7_privacy_request_rt'
                    WHEN 'w_' THEN 'pagamenos_m7_storage_worker_rt'
                    WHEN 'a_' THEN 'pagamenos_m7_deletion_authority_rt'
                    -- XF-13 / IA-14: the sealed signer edge. Exactly one x_* function, exactly one
                    -- grantee, and that grantee holds EXECUTE on nothing else in schema m7.
                    WHEN 'x_' THEN 'pagamenos_m7_capability_signer_rt'
               END AS grantee
          FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'm7' AND p.proname ~ '^[psrwax]_'
    LOOP
        EXECUTE pg_catalog.format('GRANT EXECUTE ON FUNCTION %s TO %I', r.fn, r.grantee);
    END LOOP;
END
$grants$;

-- Bind the reviewed control-plane manifest (§23). The migration contains exactly ONE such sequence,
-- whose literal arguments equal the reviewed manifest's "database.controlPlaneInstall" object. Its values
-- are NOT asserted by this document.
--   SELECT m7.c_register_storage_backend_v1(...);           -- returns backendSha256
--   SELECT m7.c_register_storage_profile_v1(...);
--   SELECT m7.c_register_retention_policy_v1(...);
--   SELECT m7.c_register_merchant_vocabulary_v1(...);
--   SELECT m7.c_register_manifest_v1(<manifestVersion>, <manifestSha256>, ...);
--   SELECT m7.c_load_catalog_expectations_v1(<manifestVersion>, ...);
--   SELECT m7.c_activate_manifest_v1(<manifestVersion>, <manifestSha256>);

-- IA-06, IA-09..IA-13: final fail-closed catalog assertion, against the manifest just activated.
DO $final$
DECLARE v text; v_mv text;
BEGIN
    SELECT i."manifestVersion" INTO v_mv FROM m7.m7_control_plane_installation i WHERE i."retiredAt" IS NULL;
    IF v_mv IS NULL THEN
        RAISE EXCEPTION 'M7_INSTALL: no active control-plane installation';
    END IF;
    FOR v IN SELECT * FROM m7.i_catalog_violations(v_mv) LOOP
        RAISE EXCEPTION 'M7_INSTALL catalog violation: %', v;
    END LOOP;
END
$final$;

RESET ROLE;
COMMIT;

BEGIN;

-- ---------------------------------------------------------------------------------------------
-- IA-01 .. IA-08 : fail-closed provisioning assertions (§18.4)
-- ---------------------------------------------------------------------------------------------
DO $install$
DECLARE
    v_login  CONSTANT text[] := ARRAY[
        'pagamenos_m7_participant_rt', 'pagamenos_m7_session_issuer_rt',
        'pagamenos_m7_privacy_request_rt', 'pagamenos_m7_storage_worker_rt',
        'pagamenos_m7_deletion_authority_rt', 'pagamenos_m7_capability_signer_rt'];
    v_role text;
BEGIN
    IF pg_catalog.current_setting('server_version_num')::integer < 150000 THEN
        RAISE EXCEPTION 'M7_INSTALL IA-08: PostgreSQL >= 15 required';
    END IF;

    FOREACH v_role IN ARRAY (v_login || ARRAY['pagamenos_m7_owner']) LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = v_role) THEN
            RAISE EXCEPTION 'M7_INSTALL IA-01: role % does not exist', v_role;
        END IF;
    END LOOP;

    IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles
               WHERE rolname = 'pagamenos_m7_owner'
                 AND (rolcanlogin OR rolsuper OR rolcreatedb OR rolcreaterole
                      OR rolreplication OR rolbypassrls)) THEN
        RAISE EXCEPTION 'M7_INSTALL IA-02: pagamenos_m7_owner attributes invalid';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles
               WHERE rolname = ANY (v_login)
                 AND (NOT rolcanlogin OR rolsuper OR rolcreatedb OR rolcreaterole
                      OR rolreplication OR rolbypassrls OR rolinherit)) THEN
        RAISE EXCEPTION 'M7_INSTALL IA-03: M7 login role attributes invalid';
    END IF;

    IF EXISTS (SELECT 1
               FROM pg_catalog.pg_auth_members m
               JOIN pg_catalog.pg_roles g ON g.oid = m.roleid
               JOIN pg_catalog.pg_roles u ON u.oid = m.member
               WHERE g.rolname = ANY (v_login) OR u.rolname = ANY (v_login)) THEN
        RAISE EXCEPTION 'M7_INSTALL IA-04: M7 login roles must have no memberships';
    END IF;

    IF EXISTS (SELECT 1
               FROM pg_catalog.pg_auth_members m
               JOIN pg_catalog.pg_roles g ON g.oid = m.roleid
               JOIN pg_catalog.pg_roles u ON u.oid = m.member
               WHERE g.rolname = 'pagamenos_m7_owner' AND u.rolname <> session_user)
       OR NOT EXISTS (SELECT 1
               FROM pg_catalog.pg_auth_members m
               JOIN pg_catalog.pg_roles g ON g.oid = m.roleid
               JOIN pg_catalog.pg_roles u ON u.oid = m.member
               WHERE g.rolname = 'pagamenos_m7_owner' AND u.rolname = session_user) THEN
        RAISE EXCEPTION 'M7_INSTALL IA-05: members of pagamenos_m7_owner must be exactly the migration role';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_catalog.pg_namespace WHERE nspname = 'm7') THEN
        RAISE EXCEPTION 'M7_INSTALL IA-07: schema m7 already exists; re-install refused (rotation is §23.7)';
    END IF;
END
$install$;

-- ---------------------------------------------------------------------------------------------
-- Schema and the minimum additive grants on accepted A1/A2 relations (RS-5).
-- Executed by the migration role, which owns the accepted relations.
-- ---------------------------------------------------------------------------------------------
CREATE SCHEMA m7 AUTHORIZATION pagamenos_m7_owner;
REVOKE ALL ON SCHEMA m7 FROM PUBLIC;
GRANT USAGE ON SCHEMA m7 TO pagamenos_m7_participant_rt, pagamenos_m7_session_issuer_rt,
    pagamenos_m7_privacy_request_rt, pagamenos_m7_storage_worker_rt, pagamenos_m7_deletion_authority_rt,
    pagamenos_m7_capability_signer_rt;

GRANT USAGE ON SCHEMA public TO pagamenos_m7_owner;
GRANT SELECT ON TABLE
    public.study_participant, public.experiment_assignment, public.study_consent_event,
    public.purchase_intent_capture_token, public.purchase_intent,
    public.purchase_intent_decision_request, public.purchase_intent_decision_binding
  TO pagamenos_m7_owner;
GRANT REFERENCES ("id") ON TABLE public.study_participant                TO pagamenos_m7_owner;
GRANT REFERENCES ("id") ON TABLE public.experiment_assignment            TO pagamenos_m7_owner;
GRANT REFERENCES ("id") ON TABLE public.study_consent_event              TO pagamenos_m7_owner;
GRANT REFERENCES ("id") ON TABLE public.purchase_intent_decision_binding TO pagamenos_m7_owner;
-- Required only so that SELECT ... FOR UPDATE may lock the assignment row (PostgreSQL requires
-- UPDATE privilege on at least one column for row-locking clauses). Every actual UPDATE remains
-- rejected by the accepted A1 trigger "experiment_assignment_no_update".
GRANT UPDATE ("id") ON TABLE public.experiment_assignment TO pagamenos_m7_owner;

-- Everything below is created by, and owned by, pagamenos_m7_owner.
SET LOCAL ROLE pagamenos_m7_owner;

ALTER DEFAULT PRIVILEGES IN SCHEMA m7 REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA m7 REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA m7 REVOKE ALL ON SEQUENCES FROM PUBLIC;

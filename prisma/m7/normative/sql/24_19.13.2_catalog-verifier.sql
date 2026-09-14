CREATE FUNCTION m7.i_catalog_violations(p_manifest_version text) RETURNS SETOF text
    LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE
    v_owner oid := (SELECT r.oid FROM pg_catalog.pg_roles r WHERE r.rolname = 'pagamenos_m7_owner');
    v_ns    oid := (SELECT n.oid FROM pg_catalog.pg_namespace n WHERE n.nspname = 'm7');
    v_login CONSTANT text[] := ARRAY['pagamenos_m7_participant_rt','pagamenos_m7_session_issuer_rt',
        'pagamenos_m7_privacy_request_rt','pagamenos_m7_storage_worker_rt','pagamenos_m7_deletion_authority_rt',
        'pagamenos_m7_capability_signer_rt'];
BEGIN
    IF v_owner IS NULL OR v_ns IS NULL THEN
        RETURN NEXT 'PRE: owner role or schema m7 absent';
        RETURN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM m7.m7_expected_function WHERE "manifestVersion" = p_manifest_version) THEN
        RETURN NEXT 'PRE: no catalog expectation set for manifest ' || p_manifest_version;
        RETURN;
    END IF;

    -- ---------------------------------------------------------------- functions: exact set + properties
    RETURN QUERY
    WITH actual AS (
        SELECT p.oid,
               p.oid::regprocedure::text AS sig,
               p.prosecdef,
               COALESCE(pg_catalog.array_to_string(p.proconfig, '|'), '') AS cfg,
               p.proowner,
               'sha256:' || pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.prosrc, 'UTF8')), 'hex') AS src
          FROM pg_catalog.pg_proc p WHERE p.pronamespace = v_ns),
    expected AS (
        SELECT f."functionSignature" AS sig, f."isSecurityDefiner", f."proconfigText", f."sourceSha256"
          FROM m7.m7_expected_function f WHERE f."manifestVersion" = p_manifest_version)
    SELECT 'FN-MISSING: ' || e.sig FROM expected e WHERE NOT EXISTS (SELECT 1 FROM actual a WHERE a.sig = e.sig)
    UNION ALL
    SELECT 'FN-EXTRA: ' || a.sig FROM actual a WHERE NOT EXISTS (SELECT 1 FROM expected e WHERE e.sig = a.sig)
    UNION ALL
    SELECT 'FN-DRIFT: ' || a.sig
      FROM actual a JOIN expected e ON e.sig = a.sig
     WHERE a.proowner <> v_owner
        OR a.prosecdef <> e."isSecurityDefiner"
        OR a.cfg IS DISTINCT FROM e."proconfigText"
        OR a.src IS DISTINCT FROM e."sourceSha256";

    -- ------------------------------------------------- function EXECUTE grants: exact set, both directions
    RETURN QUERY
    WITH actual AS (
        SELECT p.oid::regprocedure::text AS sig, COALESCE(r.rolname::text, 'PUBLIC') AS grantee
          FROM pg_catalog.pg_proc p
          CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))) x
          LEFT JOIN pg_catalog.pg_roles r ON r.oid = x.grantee
         WHERE p.pronamespace = v_ns AND x.privilege_type = 'EXECUTE' AND x.grantee <> v_owner),
    expected AS (
        SELECT g."functionSignature" AS sig, g."granteeRole"::text AS grantee
          FROM m7.m7_expected_function_grant g WHERE g."manifestVersion" = p_manifest_version)
    SELECT 'GRANT-MISSING: ' || e.sig || ' -> ' || e.grantee
      FROM expected e WHERE NOT EXISTS (SELECT 1 FROM actual a WHERE a.sig = e.sig AND a.grantee = e.grantee)
    UNION ALL
    SELECT 'GRANT-EXTRA: ' || a.sig || ' -> ' || a.grantee
      FROM actual a WHERE NOT EXISTS (SELECT 1 FROM expected e WHERE e.sig = a.sig AND e.grantee = a.grantee);

    -- ------------------------------------------------------------------- relations: exact set + ownership
    RETURN QUERY
    WITH actual AS (
        SELECT c.relname AS rel, c.relkind, c.relowner
          FROM pg_catalog.pg_class c WHERE c.relnamespace = v_ns AND c.relkind IN ('r','v','S','m','p')),
    expected AS (
        SELECT e."relationName" AS rel, e."relKind" FROM m7.m7_expected_relation e
         WHERE e."manifestVersion" = p_manifest_version)
    SELECT 'REL-MISSING: ' || e.rel::text FROM expected e WHERE NOT EXISTS (SELECT 1 FROM actual a WHERE a.rel = e.rel)
    UNION ALL
    SELECT 'REL-EXTRA: ' || a.rel::text FROM actual a WHERE NOT EXISTS (SELECT 1 FROM expected e WHERE e.rel = a.rel)
    UNION ALL
    SELECT 'REL-DRIFT: ' || a.rel::text
      FROM actual a JOIN expected e ON e.rel = a.rel
     WHERE a.relkind <> e."relKind" OR a.relowner <> v_owner;

    -- ------------------------------------------------- relation ACLs: nothing to anyone but the owner
    RETURN QUERY
    SELECT 'REL-ACL: ' || c.relname::text || ' -> ' || COALESCE(r.rolname::text, 'PUBLIC') || ' ' || x.privilege_type
      FROM pg_catalog.pg_class c
      CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(c.relacl, pg_catalog.acldefault(
                 CASE WHEN c.relkind = 'S' THEN 's' ELSE 'r' END, c.relowner))) x
      LEFT JOIN pg_catalog.pg_roles r ON r.oid = x.grantee
     WHERE c.relnamespace = v_ns AND c.relkind IN ('r','v','S','m','p') AND x.grantee <> v_owner;

    -- ------------------------------------------------------- COLUMN ACLs: none may exist at all (AUD-06)
    RETURN QUERY
    SELECT 'COL-ACL: ' || c.relname::text || '.' || att.attname::text || ' -> '
           || COALESCE(r.rolname::text, 'PUBLIC') || ' ' || x.privilege_type
      FROM pg_catalog.pg_attribute att
      JOIN pg_catalog.pg_class c ON c.oid = att.attrelid
      CROSS JOIN LATERAL pg_catalog.aclexplode(att.attacl) x
      LEFT JOIN pg_catalog.pg_roles r ON r.oid = x.grantee
     WHERE c.relnamespace = v_ns AND att.attacl IS NOT NULL;

    -- ------------------------------------------------------------------ schema ACL: exact expected set
    RETURN QUERY
    WITH actual AS (
        SELECT COALESCE(r.rolname::text, 'PUBLIC') AS grantee, x.privilege_type AS priv
          FROM pg_catalog.pg_namespace n
          CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(n.nspacl, pg_catalog.acldefault('n', n.nspowner))) x
          LEFT JOIN pg_catalog.pg_roles r ON r.oid = x.grantee
         WHERE n.oid = v_ns AND x.grantee <> v_owner),
    expected AS (
        SELECT e."roleName"::text AS grantee, 'USAGE'::text AS priv
          FROM m7.m7_expected_role e
         WHERE e."manifestVersion" = p_manifest_version AND e."hasSchemaUsage")
    SELECT 'SCHEMA-ACL-MISSING: ' || e.grantee || ' ' || e.priv
      FROM expected e WHERE NOT EXISTS (SELECT 1 FROM actual a WHERE a.grantee = e.grantee AND a.priv = e.priv)
    UNION ALL
    SELECT 'SCHEMA-ACL-EXTRA: ' || a.grantee || ' ' || a.priv
      FROM actual a WHERE NOT EXISTS (SELECT 1 FROM expected e WHERE e.grantee = a.grantee AND e.priv = a.priv);

    -- ----------------------------------------------- default ACLs in m7: nothing granted to anyone but owner
    RETURN QUERY
    SELECT 'DEFACL: ' || d.defaclobjtype::text || ' -> ' || COALESCE(r.rolname::text, 'PUBLIC') || ' ' || x.privilege_type
      FROM pg_catalog.pg_default_acl d
      CROSS JOIN LATERAL pg_catalog.aclexplode(d.defaclacl) x
      LEFT JOIN pg_catalog.pg_roles r ON r.oid = x.grantee
     WHERE d.defaclnamespace = v_ns AND x.grantee <> v_owner;

    -- ------------------------------------ triggers / constraints / indexes: exact sets, both directions
    RETURN QUERY
    WITH actual AS (
        SELECT c.relname AS rel, 'TRIGGER'::m7."M7CatalogObjectKind" AS kind, t.tgname AS obj, NULL::boolean AS uniq
          FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
         WHERE c.relnamespace = v_ns AND NOT t.tgisinternal
        UNION ALL
        SELECT c.relname, 'CONSTRAINT'::m7."M7CatalogObjectKind", con.conname, NULL::boolean
          FROM pg_catalog.pg_constraint con JOIN pg_catalog.pg_class c ON c.oid = con.conrelid
         WHERE c.relnamespace = v_ns
        UNION ALL
        SELECT c.relname, 'INDEX'::m7."M7CatalogObjectKind", ic.relname, ix.indisunique
          FROM pg_catalog.pg_index ix
          JOIN pg_catalog.pg_class ic ON ic.oid = ix.indexrelid
          JOIN pg_catalog.pg_class c  ON c.oid  = ix.indrelid
         WHERE c.relnamespace = v_ns),
    expected AS (
        SELECT o."relationName" AS rel, o."objectKind" AS kind, o."objectName" AS obj, o."isUnique" AS uniq
          FROM m7.m7_expected_relation_object o WHERE o."manifestVersion" = p_manifest_version)
    SELECT 'OBJ-MISSING: ' || e.kind::text || ' ' || e.rel::text || '.' || e.obj::text
      FROM expected e WHERE NOT EXISTS (SELECT 1 FROM actual a WHERE a.rel = e.rel AND a.kind = e.kind AND a.obj = e.obj)
    UNION ALL
    SELECT 'OBJ-EXTRA: ' || a.kind::text || ' ' || a.rel::text || '.' || a.obj::text
      FROM actual a WHERE NOT EXISTS (SELECT 1 FROM expected e WHERE e.rel = a.rel AND e.kind = a.kind AND e.obj = a.obj)
    UNION ALL
    SELECT 'OBJ-DRIFT: INDEX ' || a.rel::text || '.' || a.obj::text
      FROM actual a JOIN expected e ON e.rel = a.rel AND e.kind = a.kind AND e.obj = a.obj
     WHERE a.kind = 'INDEX' AND a.uniq IS DISTINCT FROM e.uniq;

    -- ------------------------------------------------------------------ triggers must all be enabled
    RETURN QUERY
    SELECT 'TRG-DISABLED: ' || t.tgname::text
      FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
     WHERE c.relnamespace = v_ns AND NOT t.tgisinternal AND t.tgenabled <> 'O';

    -- --------------------------------------------------------- roles: exact set, attributes, memberships
    RETURN QUERY
    WITH expected AS (
        SELECT e."roleName"::text AS role, e."canLogin", e."inheritsPrivileges"
          FROM m7.m7_expected_role e WHERE e."manifestVersion" = p_manifest_version)
    SELECT 'ROLE-MISSING: ' || e.role FROM expected e
     WHERE NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles r WHERE r.rolname = e.role)
    UNION ALL
    SELECT 'ROLE-DRIFT: ' || r.rolname::text
      FROM pg_catalog.pg_roles r JOIN expected e ON e.role = r.rolname::text
     WHERE r.rolcanlogin <> e."canLogin" OR r.rolinherit <> e."inheritsPrivileges"
        OR r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls;

    RETURN QUERY
    WITH actual AS (
        SELECT g.rolname::text AS grp, u.rolname::text AS mem
          FROM pg_catalog.pg_auth_members m
          JOIN pg_catalog.pg_roles g ON g.oid = m.roleid
          JOIN pg_catalog.pg_roles u ON u.oid = m.member
         WHERE g.rolname::text IN (SELECT e."roleName"::text FROM m7.m7_expected_role e
                                    WHERE e."manifestVersion" = p_manifest_version)
            OR u.rolname::text IN (SELECT e."roleName"::text FROM m7.m7_expected_role e
                                    WHERE e."manifestVersion" = p_manifest_version)),
    expected AS (
        SELECT e."roleName"::text AS grp, e."memberName"::text AS mem
          FROM m7.m7_expected_role_member e WHERE e."manifestVersion" = p_manifest_version)
    SELECT 'MEMBER-MISSING: ' || e.grp || ' <- ' || e.mem
      FROM expected e WHERE NOT EXISTS (SELECT 1 FROM actual a WHERE a.grp = e.grp AND a.mem = e.mem)
    UNION ALL
    SELECT 'MEMBER-EXTRA: ' || a.grp || ' <- ' || a.mem
      FROM actual a WHERE NOT EXISTS (SELECT 1 FROM expected e WHERE e.grp = a.grp AND e.mem = a.mem);

    -- -------------------------------------------------------- IA-06: authority vs execution separation
    RETURN QUERY
    SELECT 'IA-06: ' || r.rolname::text
      FROM pg_catalog.pg_roles r
     WHERE r.rolname <> 'pagamenos_m7_owner'
       AND EXISTS (SELECT 1 FROM pg_catalog.pg_proc p
                    WHERE p.pronamespace = v_ns AND p.proname = 'a_mint_deletion_authorization_v1'
                      AND pg_catalog.has_function_privilege(r.oid, p.oid, 'EXECUTE'))
       AND EXISTS (SELECT 1 FROM pg_catalog.pg_proc p
                    WHERE p.pronamespace = v_ns AND p.proname LIKE 'w\_%'
                      AND pg_catalog.has_function_privilege(r.oid, p.oid, 'EXECUTE'));

    -- ------------------------------------------------------ c_* functions must have NO login grantee (RS-8)
    RETURN QUERY
    SELECT 'RS-8: ' || p.oid::regprocedure::text || ' -> ' || COALESCE(r.rolname::text, 'PUBLIC')
      FROM pg_catalog.pg_proc p
      CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))) x
      LEFT JOIN pg_catalog.pg_roles r ON r.oid = x.grantee
     WHERE p.pronamespace = v_ns AND p.proname LIKE 'c\_%' AND x.grantee <> v_owner;

    -- ------------------------------------------------- IA-13: the active control plane must be coherent
    RETURN QUERY
    SELECT 'IA-13: ' || msg FROM (
        SELECT 'no active installation' AS msg
         WHERE NOT EXISTS (SELECT 1 FROM m7.m7_control_plane_installation WHERE "retiredAt" IS NULL)
        UNION ALL
        SELECT 'more than one active installation'
         WHERE (SELECT pg_catalog.count(*) FROM m7.m7_control_plane_installation WHERE "retiredAt" IS NULL) > 1
        UNION ALL
        SELECT 'active manifest storage profile or backend retired'
          FROM m7.m7_control_plane_installation i
          JOIN m7.m7_control_plane_manifest m ON m."manifestVersion" = i."manifestVersion"
          JOIN m7.m7_storage_profile p ON p."storageProfileVersion" = m."storageProfileVersion"
          JOIN m7.m7_storage_backend b ON b."backendSha256" = p."backendSha256"
         WHERE i."retiredAt" IS NULL AND (p."retiredAt" IS NOT NULL OR b."retiredAt" IS NOT NULL)
        UNION ALL
        SELECT 'live artifact bound to a retired backend'
          FROM m7.m7_evidence_artifact a JOIN m7.m7_storage_backend b ON b."backendSha256" = a."backendSha256"
         WHERE a."state" <> 'DELETED' AND b."retiredAt" IS NOT NULL
        UNION ALL
        SELECT 'live artifact with no routable storage profile'
          FROM m7.m7_evidence_artifact a
         WHERE a."state" <> 'DELETED'
           AND NOT EXISTS (SELECT 1 FROM m7.m7_storage_profile p
                            WHERE p."backendSha256" = a."backendSha256" AND p."retiredAt" IS NULL)
    ) q;
END
$fn$;

CREATE FUNCTION m7.w_verify_control_plane_catalog_v1(p_manifest_sha256 text) RETURNS SETOF text
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v_inst m7.m7_control_plane_installation;
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
    v_inst := m7.i_assert_control_plane(p_manifest_sha256);
    RETURN QUERY SELECT * FROM m7.i_catalog_violations(v_inst."manifestVersion");
END
$fn$;

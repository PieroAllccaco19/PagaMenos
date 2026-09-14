CREATE TABLE m7.m7_expected_relation (
    "manifestVersion" TEXT NOT NULL,
    "relationName"    NAME NOT NULL,
    "relKind"         "char" NOT NULL,
    CONSTRAINT m7_expected_relation_pkey PRIMARY KEY ("manifestVersion","relationName"),
    CONSTRAINT m7_expected_relation_manifest_fkey FOREIGN KEY ("manifestVersion")
        REFERENCES m7.m7_control_plane_manifest ("manifestVersion") ON DELETE RESTRICT,
    CONSTRAINT m7_expected_relation_kind_ck CHECK ("relKind" IN ('r','v','S','m','p'))
);

CREATE TABLE m7.m7_expected_relation_object (
    "manifestVersion" TEXT NOT NULL,
    "relationName"    NAME NOT NULL,
    "objectKind"      m7."M7CatalogObjectKind" NOT NULL,
    "objectName"      NAME NOT NULL,
    "isUnique"        BOOLEAN,
    CONSTRAINT m7_expected_relation_object_pkey PRIMARY KEY ("manifestVersion","relationName","objectKind","objectName"),
    CONSTRAINT m7_expected_relation_object_relation_fkey FOREIGN KEY ("manifestVersion","relationName")
        REFERENCES m7.m7_expected_relation ("manifestVersion","relationName") ON DELETE RESTRICT,
    CONSTRAINT m7_expected_relation_object_unique_ck CHECK (("objectKind" = 'INDEX') = ("isUnique" IS NOT NULL))
);

CREATE TABLE m7.m7_expected_function (
    "manifestVersion"   TEXT    NOT NULL,
    "functionSignature" TEXT    NOT NULL,
    "isSecurityDefiner" BOOLEAN NOT NULL,
    "proconfigText"     TEXT    NOT NULL,
    "sourceSha256"      TEXT    NOT NULL,
    CONSTRAINT m7_expected_function_pkey PRIMARY KEY ("manifestVersion","functionSignature"),
    CONSTRAINT m7_expected_function_manifest_fkey FOREIGN KEY ("manifestVersion")
        REFERENCES m7.m7_control_plane_manifest ("manifestVersion") ON DELETE RESTRICT,
    CONSTRAINT m7_expected_function_signature_ck CHECK (pg_catalog.length("functionSignature") BETWEEN 4 AND 1024),
    CONSTRAINT m7_expected_function_proconfig_ck CHECK (
        "proconfigText" = 'search_path=pg_catalog, pg_temp|lock_timeout=5s'),
    CONSTRAINT m7_expected_function_source_ck CHECK ("sourceSha256" ~ '^sha256:[0-9a-f]{64}$')
);

CREATE TABLE m7.m7_expected_function_grant (
    "manifestVersion"   TEXT NOT NULL,
    "functionSignature" TEXT NOT NULL,
    "granteeRole"       NAME NOT NULL,
    CONSTRAINT m7_expected_function_grant_pkey PRIMARY KEY ("manifestVersion","functionSignature","granteeRole"),
    CONSTRAINT m7_expected_function_grant_function_fkey FOREIGN KEY ("manifestVersion","functionSignature")
        REFERENCES m7.m7_expected_function ("manifestVersion","functionSignature") ON DELETE RESTRICT
);

CREATE TABLE m7.m7_expected_role (
    "manifestVersion"  TEXT    NOT NULL,
    "roleName"         NAME    NOT NULL,
    "canLogin"         BOOLEAN NOT NULL,
    "inheritsPrivileges" BOOLEAN NOT NULL,
    "hasSchemaUsage"   BOOLEAN NOT NULL,
    CONSTRAINT m7_expected_role_pkey PRIMARY KEY ("manifestVersion","roleName"),
    CONSTRAINT m7_expected_role_manifest_fkey FOREIGN KEY ("manifestVersion")
        REFERENCES m7.m7_control_plane_manifest ("manifestVersion") ON DELETE RESTRICT
);

CREATE TABLE m7.m7_expected_role_member (
    "manifestVersion" TEXT NOT NULL,
    "roleName"        NAME NOT NULL,
    "memberName"      NAME NOT NULL,
    CONSTRAINT m7_expected_role_member_pkey PRIMARY KEY ("manifestVersion","roleName","memberName"),
    CONSTRAINT m7_expected_role_member_role_fkey FOREIGN KEY ("manifestVersion","roleName")
        REFERENCES m7.m7_expected_role ("manifestVersion","roleName") ON DELETE RESTRICT
);

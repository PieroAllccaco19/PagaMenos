-- PagaMenos · M7 V1.1 — S02 cluster-level role provisioning TEMPLATE (test harness).
--
-- Provisions the seven M7 roles of V1.1 §18.2 (one NOLOGIN owner + the six login runtime roles that
-- Erratum 01 ER-02 aligns §24.3 / T-08b to) and the harness's named, NON-superuser migration role.
-- Role provisioning is a separately governed step, never part of a migration (§18.1 RS-6, §18.4).
--
-- THIS FILE CONTAINS NO SECRET. Every credential is a `{{SECRET:<role>}}` / `{{MIGRATION_ROLE_SECRET}}`
-- placeholder that the harness
-- (src/m7/testkit/provision.ts) substitutes at run time with an ephemeral random value that is never
-- written to disk, logged or committed. The rendered text is executed once, by the ephemeral cluster's
-- bootstrap administrator, inside one transaction; any failure rolls every role back.
--
-- This file creates ROLES ONLY. It creates no schema, table, function, grant on any relation, or any
-- other M7 §19 object — installing M7 is S03, not S02.

BEGIN;

-- The owner of schema m7 and of every M7 object (RS-1). §18.2: LOGIN NO; not SUPERUSER, CREATEDB,
-- CREATEROLE, REPLICATION, BYPASSRLS.
CREATE ROLE pagamenos_m7_owner
  NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;

-- The six login runtime roles. §18.2: NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
-- NOINHERIT, CONNECTION LIMIT set, no role memberships, granted to no role.
CREATE ROLE pagamenos_m7_participant_rt
  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT
  CONNECTION LIMIT {{CONNECTION_LIMIT}} PASSWORD {{SECRET:pagamenos_m7_participant_rt}};
CREATE ROLE pagamenos_m7_session_issuer_rt
  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT
  CONNECTION LIMIT {{CONNECTION_LIMIT}} PASSWORD {{SECRET:pagamenos_m7_session_issuer_rt}};
CREATE ROLE pagamenos_m7_privacy_request_rt
  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT
  CONNECTION LIMIT {{CONNECTION_LIMIT}} PASSWORD {{SECRET:pagamenos_m7_privacy_request_rt}};
CREATE ROLE pagamenos_m7_storage_worker_rt
  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT
  CONNECTION LIMIT {{CONNECTION_LIMIT}} PASSWORD {{SECRET:pagamenos_m7_storage_worker_rt}};
CREATE ROLE pagamenos_m7_deletion_authority_rt
  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT
  CONNECTION LIMIT {{CONNECTION_LIMIT}} PASSWORD {{SECRET:pagamenos_m7_deletion_authority_rt}};
CREATE ROLE pagamenos_m7_capability_signer_rt
  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT
  CONNECTION LIMIT {{CONNECTION_LIMIT}} PASSWORD {{SECRET:pagamenos_m7_capability_signer_rt}};

-- The named migration role: LOGIN, explicitly NOT SUPERUSER (nor CREATEDB / CREATEROLE / REPLICATION /
-- BYPASSRLS). It replays the accepted migrations and therefore owns the accepted relations (§19.2
-- "executed by the migration role, which owns the accepted relations").
CREATE ROLE {{MIGRATION_ROLE}}
  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT
  PASSWORD {{MIGRATION_ROLE_SECRET}};

-- IA-05: the members of pagamenos_m7_owner are exactly the migration role. VBA-PV-1 / VBA-PV-3
-- (PostgreSQL >= 16, the harness floor of VFC-PG-1): exactly one direct edge with INHERIT TRUE (the
-- pre-`SET LOCAL ROLE` §19.2 statements exercise the owner's privileges through inheritance) and
-- SET TRUE (`SET LOCAL ROLE pagamenos_m7_owner`), without ADMIN OPTION. The explicit edge options
-- govern this edge; the migration role itself stays NOINHERIT. No login runtime role is granted
-- anything here.
GRANT pagamenos_m7_owner
TO {{MIGRATION_ROLE}}
WITH INHERIT TRUE, SET TRUE;

COMMIT;

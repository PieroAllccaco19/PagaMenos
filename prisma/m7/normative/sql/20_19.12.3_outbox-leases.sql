-- O2 / O3. Hands the worker the routing identity of the effect. A row whose backend has no live
-- profile is NOT leased: it stays visible in v_deletion_sla_critical instead of being confirmed.
-- DL-5: the lease duration comes from EACH ROW's bound policy, resolved inside the loop, so a batch
-- spanning two policies leases every row under its own. The active manifest is asserted (fail-closed
-- deployment check, §23.6) but supplies NO timing value here.
-- NW-1 / lock profile: P1 the whole batch, FOR UPDATE SKIP LOCKED -> P3. NO class-10 lock: leasing changes
-- the state of a committed class-3 obligation and creates none (BL-9). Round 3 took class 10 per row.
CREATE FUNCTION m7.w_lease_outbox_v1(p_manifest_sha256 text, p_worker_id text, p_limit integer)
    RETURNS TABLE (outbox_id uuid, zone m7."M7ObjectZone", object_key text, lease_epoch bigint,
                   lease_expires_at text, backend_sha256 text, storage_profile_version text,
                   credential_profile_id text, container_id text, region_id text, endpoint_identity text,
                   bound_policy_version text)
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE
    v_ids uuid[]; r m7.m7_storage_outbox; v_pol m7.m7_retention_policy;
    v_pr m7.m7_storage_profile; v_be m7.m7_storage_backend; v_now timestamptz;
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', 'M7_WORKER_EFFECT_V1', true);
    PERFORM m7.i_assert_control_plane(p_manifest_sha256);
    IF p_worker_id !~ '^[A-Za-z0-9_.:-]{1,128}$' THEN
        RAISE EXCEPTION 'M7_INVALID_INPUT' USING ERRCODE = 'M7007';
    END IF;
    v_now := pg_catalog.clock_timestamp();
    -- P1 (class 8)
    SELECT pg_catalog.array_agg(q."id") INTO v_ids
      FROM (SELECT ob."id" FROM m7.m7_storage_outbox ob
             WHERE ((ob."state" = 'PENDING' AND ob."nextAttemptAt" <= v_now AND ob."notBefore" <= v_now)
                 OR (ob."state" = 'LEASED' AND ob."leaseExpiresAt" <= v_now))
               AND EXISTS (SELECT 1 FROM m7.m7_storage_profile p
                            WHERE p."backendSha256" = ob."backendSha256" AND p."retiredAt" IS NULL)
             ORDER BY ob."backendSha256" COLLATE "C", ob."nextAttemptAt", ob."id"
             LIMIT GREATEST(LEAST(p_limit, 500), 1)
               FOR UPDATE SKIP LOCKED) q;
    IF v_ids IS NULL THEN
        PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
        RETURN;
    END IF;
    -- P3
    FOR r IN
        SELECT ob.* FROM m7.m7_storage_outbox ob
         WHERE ob."id" = ANY (v_ids)
         ORDER BY ob."backendSha256" COLLATE "C", ob."nextAttemptAt", ob."id"
    LOOP
        v_pr  := m7.i_require_routable_profile(r."backendSha256");
        SELECT * INTO STRICT v_be FROM m7.m7_storage_backend WHERE "backendSha256" = r."backendSha256";  -- plain read
        v_pol := m7.i_outbox_bound_policy(r);                       -- DL-5, per row
        UPDATE m7.m7_storage_outbox
           SET "state" = 'LEASED', "stateVersion" = "stateVersion" + 1, "leaseOwner" = p_worker_id,
               "leaseEpoch" = "leaseEpoch" + 1, "leaseExpiresAt" = v_now + v_pol."workerLease", "updatedAt" = v_now
         WHERE "id" = r."id"
         RETURNING * INTO r;
        RETURN QUERY SELECT r."id", r."zone", r."objectKey", r."leaseEpoch", m7.i_ts(r."leaseExpiresAt"),
                            r."backendSha256", v_pr."storageProfileVersion", v_pr."credentialProfileId",
                            v_be."containerId", v_be."regionId", v_be."endpointIdentity",
                            r."boundPolicyVersion";
    END LOOP;
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
END
$fn$;

CREATE FUNCTION m7.w_renew_outbox_lease_v1(p_manifest_sha256 text, p_outbox_id uuid, p_lease_epoch bigint) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE
    v_pol m7.m7_retention_policy; v_ob m7.m7_storage_outbox; v_now timestamptz;
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', 'M7_WORKER_EFFECT_V1', true);
    PERFORM m7.i_assert_control_plane(p_manifest_sha256);
    SELECT * INTO v_ob FROM m7.m7_storage_outbox WHERE "id" = p_outbox_id FOR UPDATE;
    v_now := pg_catalog.clock_timestamp();
    -- the identity checks come first, so an unknown or unleased row reports M7005 rather than being
    -- reported as an unresolvable bound policy
    IF v_ob."id" IS NULL OR v_ob."state" IS DISTINCT FROM 'LEASED' OR v_ob."leaseEpoch" <> p_lease_epoch
       OR v_ob."leaseExpiresAt" <= v_now THEN
        RAISE EXCEPTION 'M7_STALE_LEASE' USING ERRCODE = 'M7005';
    END IF;
    v_pol := m7.i_outbox_bound_policy(v_ob);                        -- DL-5
    IF v_now + v_pol."workerLease" <= v_ob."leaseExpiresAt" THEN
        RAISE EXCEPTION 'M7_STALE_LEASE' USING ERRCODE = 'M7005';   -- renewal would not extend
    END IF;
    UPDATE m7.m7_storage_outbox
       SET "stateVersion" = "stateVersion" + 1, "leaseExpiresAt" = v_now + v_pol."workerLease", "updatedAt" = v_now
     WHERE "id" = p_outbox_id
     RETURNING * INTO v_ob;
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
    RETURN m7.i_ts(v_ob."leaseExpiresAt");
END
$fn$;

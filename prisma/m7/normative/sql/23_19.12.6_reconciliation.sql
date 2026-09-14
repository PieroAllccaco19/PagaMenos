-- Which (profile, backend) pairs the sweeper must enumerate. A backend with no live profile is NOT
-- listed: it cannot be swept, and its open effects surface in v_deletion_sla_critical instead.
CREATE FUNCTION m7.w_list_storage_scopes_for_sweep_v1(p_manifest_sha256 text)
    RETURNS TABLE (backend_sha256 text, executing_profile_id uuid, storage_profile_version text,
                   credential_profile_id text, staging_prefix text, evidence_prefix text,
                   container_id text, region_id text, endpoint_identity text)
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
    PERFORM m7.i_assert_control_plane(p_manifest_sha256);
    RETURN QUERY
    SELECT b."backendSha256", p."id", p."storageProfileVersion", p."credentialProfileId",
           b."stagingPrefix", b."evidencePrefix", b."containerId", b."regionId", b."endpointIdentity"
      FROM m7.m7_storage_backend b
      JOIN LATERAL (SELECT * FROM m7.m7_storage_profile q
                     WHERE q."backendSha256" = b."backendSha256" AND q."retiredAt" IS NULL
                     ORDER BY q."credentialGeneration" DESC, q."registeredAt" DESC, q."id" LIMIT 1) p ON TRUE
     WHERE b."retiredAt" IS NULL
     ORDER BY b."backendSha256";
END
$fn$;

CREATE FUNCTION m7.w_classify_object_key_v1(
    p_manifest_sha256 text, p_backend_sha256 text, p_zone m7."M7ObjectZone", p_object_key text,
    p_listing_run_id text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE
    v_pol m7.m7_retention_policy; v_pr m7.m7_storage_profile; v_be m7.m7_storage_backend;
    v_id_text text; v_epoch_text text; v_i m7.m7_evidence_upload_intent; v_g m7.m7_canonical_generation;
    v_art m7."M7ArtifactState"; v_kind m7."M7ReconciliationFindingKind";
    v_not_before timestamptz; v_now timestamptz; v_finding uuid; v_epoch bigint;
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', 'M7_WORKER_RECONCILIATION_V1', true);
    PERFORM m7.i_assert_control_plane(p_manifest_sha256);
    v_pr := m7.i_require_routable_profile(p_backend_sha256);
    SELECT * INTO STRICT v_be FROM m7.m7_storage_backend WHERE "backendSha256" = p_backend_sha256;   -- plain read
    SELECT p.* INTO STRICT v_pol
      FROM m7.m7_control_plane_installation i
      JOIN m7.m7_control_plane_manifest m ON m."manifestVersion" = i."manifestVersion"
      JOIN m7.m7_retention_policy p ON p."policyVersion" = m."retentionPolicyVersion"
     WHERE i."retiredAt" IS NULL;
    IF p_listing_run_id !~ '^[A-Za-z0-9_.:-]{8,128}$' OR pg_catalog.length(p_object_key) NOT BETWEEN 4 AND 1024
       OR NOT ((p_zone = 'STAGING'   AND pg_catalog.starts_with(p_object_key, v_be."stagingPrefix"))
            OR (p_zone = 'CANONICAL' AND pg_catalog.starts_with(p_object_key, v_be."evidencePrefix"))) THEN
        RAISE EXCEPTION 'M7_INVALID_INPUT' USING ERRCODE = 'M7007';
    END IF;

    -- P1 (class 4): the owning intent, when the key names one -- BEFORE class 10 (M7V11R4-AUD-02; round 3
    -- took class 10 first and then waited on this lock)
    IF p_zone = 'STAGING' THEN
        v_id_text := pg_catalog.substring(p_object_key FROM '/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/[0-9a-f]{32}$');
    ELSE
        v_id_text    := pg_catalog.substring(p_object_key FROM '/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/g[0-9]+/[0-9a-f]{32}$');
        v_epoch_text := pg_catalog.substring(p_object_key FROM '/g([0-9]+)/[0-9a-f]{32}$');
    END IF;
    IF v_id_text IS NOT NULL AND (p_zone = 'STAGING' OR v_epoch_text IS NOT NULL) THEN
        SELECT * INTO v_i FROM m7.m7_evidence_upload_intent WHERE "id" = v_id_text::uuid FOR UPDATE;
    END IF;

    -- P2 (class 10): WC-10 / BL-2. THIS IS THE ONE PATH THAT CAN OPEN AN EFFECT ON AN OTHERWISE FULLY
    -- DRAINED BACKEND: a listed key may have no generation row at all (UNISSUED_KEY_OBJECT). T-176.
    PERFORM m7.i_hold_backend_liveness(p_backend_sha256);
    v_now := pg_catalog.clock_timestamp();

    IF p_zone = 'STAGING' THEN
        IF v_i."id" IS NULL OR v_i."backendSha256" <> p_backend_sha256 OR p_object_key <> v_i."stagingObjectKey" THEN
            v_kind := 'UNISSUED_KEY_OBJECT';
            v_not_before := v_now + v_pol."orphanGrace";
        ELSIF v_i."state" IN ('ISSUED','PROCESSING') THEN
            PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
            RETURN 'OWNED';
        ELSE
            v_kind := 'ORPHAN_STAGING_OBJECT';
            v_not_before := GREATEST(v_now, v_i."uploadExpiresAt");
        END IF;
    ELSE
        IF v_i."id" IS NOT NULL THEN
            v_epoch := v_epoch_text::bigint;
            SELECT * INTO v_g FROM m7.m7_canonical_generation
             WHERE "uploadIntentId" = v_i."id" AND "leaseEpoch" = v_epoch;
        END IF;
        IF v_i."id" IS NULL OR v_g."canonicalObjectKey" IS NULL
           OR v_g."canonicalObjectKey" <> p_object_key OR v_g."backendSha256" <> p_backend_sha256 THEN
            v_kind := 'UNISSUED_KEY_OBJECT';
            v_not_before := v_now + v_pol."orphanGrace";
        ELSIF v_i."state" = 'PROCESSING' AND v_i."leaseEpoch" = v_epoch THEN
            PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
            RETURN 'OWNED';                                        -- the live generation
        ELSIF v_i."acceptedLeaseEpoch" IS NOT NULL AND v_i."acceptedLeaseEpoch" = v_epoch THEN
            IF v_i."state" = 'VALIDATED' THEN
                PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
                RETURN 'OWNED';
            END IF;
            SELECT a."state" INTO v_art FROM m7.m7_evidence_artifact a
              JOIN m7.m7_evidence_submission s ON s."id" = a."submissionId"
             WHERE s."uploadIntentId" = v_i."id";
            IF v_i."state" = 'CONSUMED' AND v_art IS DISTINCT FROM 'DELETED' THEN
                PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
                RETURN 'OWNED';
            ELSIF v_i."state" = 'CONSUMED' THEN
                v_kind := 'CANONICAL_OBJECT_PRESENT_AFTER_DELETION';
            ELSE
                v_kind := 'ORPHAN_CANONICAL_OBJECT';               -- accepted, then the intent expired
            END IF;
            v_not_before := v_now;
        ELSE
            v_kind := 'SUPERSEDED_GENERATION_OBJECT';              -- GF-7: a stale epoch's own object
            v_not_before := v_now;
        END IF;
    END IF;

    -- P3
    INSERT INTO m7.m7_reconciliation_finding
        ("id","findingKind","zone","backendSha256","executingProfileId","boundPolicyVersion","objectKey","uploadIntentId","leaseEpoch",
         "listingRunId","observedAt","observedBy","generationPath")
    VALUES (pg_catalog.gen_random_uuid(), v_kind, p_zone, p_backend_sha256, v_pr."id",
            -- DL-5 RECONCILIATION_RUN: the policy in force at listing time, fixed on the finding and
            -- inherited by every effect it enqueues
            v_pol."policyVersion", p_object_key,
            CASE WHEN v_kind = 'UNISSUED_KEY_OBJECT' THEN NULL ELSE v_i."id" END,
            CASE WHEN p_zone = 'CANONICAL' AND v_kind <> 'UNISSUED_KEY_OBJECT' THEN v_epoch END,
            p_listing_run_id, v_now, session_user, 'M7_WORKER_RECONCILIATION_V1')
    ON CONFLICT ("listingRunId", "backendSha256", "objectKey") DO NOTHING
    RETURNING "id" INTO v_finding;
    IF v_finding IS NULL THEN
        SELECT f."id" INTO STRICT v_finding FROM m7.m7_reconciliation_finding f
         WHERE f."listingRunId" = p_listing_run_id AND f."backendSha256" = p_backend_sha256
           AND f."objectKey" = p_object_key;
    END IF;
    -- XF-5: i_enqueue_delete raises notBefore to m7.i_object_write_fence() regardless, so a sweep that
    -- mis-computes v_not_before still cannot schedule an absence proof against a writable object.
    PERFORM m7.i_enqueue_delete(p_zone, p_backend_sha256, v_pr."id", p_object_key,
                                GREATEST(v_not_before,
                                         COALESCE(m7.i_object_write_fence(p_backend_sha256, p_object_key),
                                                  v_not_before)),
                                NULL, NULL, NULL, v_finding);
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
    RETURN v_kind::text;
END
$fn$;

CREATE FUNCTION m7.w_list_artifacts_for_audit_v1(p_manifest_sha256 text, p_limit integer)
    RETURNS TABLE (submission_id uuid, canonical_object_key text, content_sha256 text,
                   backend_sha256 text, storage_profile_version text, credential_profile_id text)
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
    PERFORM m7.i_assert_control_plane(p_manifest_sha256);
    RETURN QUERY
    SELECT a."submissionId", a."canonicalObjectKey", ob."contentSha256", a."backendSha256",
           p."storageProfileVersion", p."credentialProfileId"
      FROM m7.m7_evidence_artifact a
      JOIN m7.m7_evidence_submission s ON s."id" = a."submissionId"
      JOIN m7.m7_storage_observation ob ON ob."id" = s."observationId"
      JOIN LATERAL (SELECT * FROM m7.m7_storage_profile q
                     WHERE q."backendSha256" = a."backendSha256" AND q."retiredAt" IS NULL
                     ORDER BY q."credentialGeneration" DESC, q."registeredAt" DESC, q."id" LIMIT 1) p ON TRUE
     WHERE a."state" = 'AVAILABLE'
     ORDER BY a."updatedAt", a."submissionId"
     LIMIT GREATEST(LEAST(p_limit, 500), 1);
END
$fn$;

CREATE FUNCTION m7.w_record_canonical_missing_v1(p_manifest_sha256 text, p_submission_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v_a m7.m7_evidence_artifact; v_now timestamptz;
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', 'M7_WORKER_RECONCILIATION_V1', true);
    PERFORM m7.i_assert_control_plane(p_manifest_sha256);
    SELECT * INTO v_a FROM m7.m7_evidence_artifact a WHERE a."submissionId" = p_submission_id FOR UPDATE;
    IF v_a."state" IS DISTINCT FROM 'AVAILABLE' THEN
        RAISE EXCEPTION 'M7_LEASE_UNAVAILABLE' USING ERRCODE = 'M7006';
    END IF;
    PERFORM m7.i_require_routable_profile(v_a."backendSha256");     -- absence is only meaningful on the bound backend
    -- NW-5: no class-10 lock; AVAILABLE -> MISSING keeps drain class 1 blocking (BL-9)
    v_now := pg_catalog.clock_timestamp();
    INSERT INTO m7.m7_evidence_integrity_finding
        ("id","submissionId","findingKind","backendSha256","observedAt","observedBy","generationPath")
    VALUES (pg_catalog.gen_random_uuid(), p_submission_id, 'CANONICAL_OBJECT_MISSING', v_a."backendSha256",
            v_now, session_user, 'M7_WORKER_RECONCILIATION_V1')
    ON CONFLICT ("submissionId", "findingKind") DO NOTHING;
    UPDATE m7.m7_evidence_artifact
       SET "state" = 'MISSING', "stateVersion" = "stateVersion" + 1, "updatedAt" = v_now
     WHERE "submissionId" = p_submission_id;
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
END
$fn$;

CREATE FUNCTION m7.w_record_canonical_digest_mismatch_v1(
    p_manifest_sha256 text, p_submission_id uuid, p_observed_sha256 text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v_bound text; v_backend text;
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', 'M7_WORKER_RECONCILIATION_V1', true);
    PERFORM m7.i_assert_control_plane(p_manifest_sha256);
    SELECT ob."contentSha256", a."backendSha256" INTO v_bound, v_backend
      FROM m7.m7_evidence_submission s
      JOIN m7.m7_storage_observation ob ON ob."id" = s."observationId"
      JOIN m7.m7_evidence_artifact a ON a."submissionId" = s."id"
     WHERE s."id" = p_submission_id;
    IF p_observed_sha256 !~ '^[0-9a-f]{64}$' OR v_bound IS NULL OR v_bound = p_observed_sha256 THEN
        RAISE EXCEPTION 'M7_INVALID_INPUT' USING ERRCODE = 'M7007';   -- the DB verifies the claim IS a mismatch
    END IF;
    PERFORM m7.i_require_routable_profile(v_backend);
    -- NW-5: no class-10 lock; a finding on an artifact that already blocks drain class 1 (BL-9)
    INSERT INTO m7.m7_evidence_integrity_finding
        ("id","submissionId","findingKind","backendSha256","observedAt","observedBy","generationPath")
    VALUES (pg_catalog.gen_random_uuid(), p_submission_id, 'CANONICAL_DIGEST_MISMATCH', v_backend,
            pg_catalog.clock_timestamp(), session_user, 'M7_WORKER_RECONCILIATION_V1')
    ON CONFLICT ("submissionId", "findingKind") DO NOTHING;
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
END
$fn$;

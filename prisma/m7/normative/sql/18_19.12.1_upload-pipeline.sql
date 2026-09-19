CREATE FUNCTION m7.w_list_claimable_upload_intents_v1(p_manifest_sha256 text, p_limit integer)
    RETURNS TABLE (upload_intent_id uuid)
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
    PERFORM m7.i_assert_control_plane(p_manifest_sha256);
    RETURN QUERY
    SELECT i."id" FROM m7.m7_evidence_upload_intent i
     WHERE (i."state" = 'ISSUED' OR (i."state" = 'PROCESSING' AND i."leaseExpiresAt" <= pg_catalog.clock_timestamp()))
       AND i."intentDeadlineAt" > pg_catalog.clock_timestamp()
       -- SI-3: only work whose own backend is still addressable
       AND EXISTS (SELECT 1 FROM m7.m7_storage_profile p
                    WHERE p."backendSha256" = i."backendSha256" AND p."retiredAt" IS NULL)
     ORDER BY i."issuedAt", i."id"
     LIMIT GREATEST(LEAST(p_limit, 500), 1);
END
$fn$;

-- U2 / U3. Allocates the canonical generation for the epoch it is about to take (GF-1), derives that
-- generation's write fence (XF-3), and mints its ONE exact-key write grant (XF-2, XF-9).
-- Returns the intent's OWN backend and the LIVE EXECUTING profile (SI-4): the worker never derives a
-- backend or a profile itself, and never receives a capability for any other key.
CREATE FUNCTION m7.w_claim_upload_intent_v1(p_manifest_sha256 text, p_upload_intent_id uuid, p_worker_id text)
    RETURNS TABLE (lease_epoch bigint, staging_object_key text, canonical_object_key text, max_bytes integer,
                   canonical_media_type text, max_pixels integer, lease_expires_at text,
                   executing_profile_id uuid, storage_profile_version text, credential_profile_id text,
                   backend_sha256 text, decoder_generation text, encoder_generation text,
                   conditional_create_mode m7."M7ConditionalCreateMode",
                   write_capability_mode m7."M7WriteCapabilityMode",
                   generation_grant_id uuid, grant_expires_at text, write_fence_at text)
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE
    v_i m7.m7_evidence_upload_intent; v_pol m7.m7_retention_policy; v_pr m7.m7_storage_profile;
    v_be m7.m7_storage_backend; v_now timestamptz; v_epoch bigint; v_key text;
    v_prev m7.m7_canonical_generation; v_grant_exp timestamptz; v_fence timestamptz;
    v_grant_id uuid := pg_catalog.gen_random_uuid();
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', 'M7_WORKER_UPLOAD_V1', true);
    PERFORM m7.i_assert_control_plane(p_manifest_sha256);
    IF p_worker_id !~ '^[A-Za-z0-9_.:-]{1,128}$' THEN
        RAISE EXCEPTION 'M7_INVALID_INPUT' USING ERRCODE = 'M7007';
    END IF;
    SELECT * INTO v_i FROM m7.m7_evidence_upload_intent WHERE "id" = p_upload_intent_id FOR UPDATE;   -- class 4
    v_now := pg_catalog.clock_timestamp();
    IF v_i."id" IS NULL
       OR NOT (v_i."state" = 'ISSUED' OR (v_i."state" = 'PROCESSING' AND v_i."leaseExpiresAt" <= v_now))
       OR v_now >= v_i."intentDeadlineAt"
       OR m7.i_withdrawal_event(v_i."assignmentId") IS NOT NULL THEN
        RAISE EXCEPTION 'M7_LEASE_UNAVAILABLE' USING ERRCODE = 'M7006';
    END IF;
    -- SI-1 / SI-3: route by the INTENT's binding. SI-4: the profile returned here is the LIVE one,
    -- which after a rotation is NOT the intent's issuance profile, and it is what the generation records.
    v_pr := m7.i_require_routable_profile(v_i."backendSha256");
    -- WC-2 / BL-2: class 10. A generation and its envelope are new backend-scoped obligations (drain
    -- classes 4 and 6), so this transaction must be serialized against retirement and must refuse a
    -- retired backend. It also supersedes the plain read of the backend row that stood here.
    v_be  := m7.i_hold_backend_liveness(v_i."backendSha256");
    SELECT * INTO STRICT v_pol FROM m7.m7_retention_policy WHERE "policyVersion" = v_i."retentionPolicyVersion";

    -- XF-DL-1, re-verified per allocation: a fence must never outlive the lease it is issued with
    IF (v_pol."generationWriteGrantTtl" + v_be."providerWriteCompletionWindow"
        + v_pol."writeFenceSkewAllowance") > v_pol."workerLease" THEN
        RAISE EXCEPTION 'M7_GENERATION_NOT_FENCED: XF-DL-1 violated for policy % on backend %',
            v_pol."policyVersion", v_be."backendSha256" USING ERRCODE = 'M7012';
    END IF;
    -- XF-6: a reclaim may not proceed while the previous epoch can still write its own key
    SELECT * INTO v_prev FROM m7.m7_canonical_generation
     WHERE "uploadIntentId" = v_i."id" AND "leaseEpoch" = v_i."leaseEpoch";
    IF v_prev."uploadIntentId" IS NOT NULL AND v_prev."writeFenceAt" > v_now THEN
        RAISE EXCEPTION 'M7_GENERATION_NOT_FENCED: epoch % is writable until %',
            v_prev."leaseEpoch", v_prev."writeFenceAt" USING ERRCODE = 'M7012';
    END IF;

    v_epoch     := v_i."leaseEpoch" + 1;
    v_grant_exp := v_now + v_pol."generationWriteGrantTtl";
    v_fence     := v_grant_exp + v_be."providerWriteCompletionWindow" + v_pol."writeFenceSkewAllowance";
    v_key := v_be."evidencePrefix" || v_i."id"::text || '/g' || v_epoch::text || '/'
             || pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', '');
    INSERT INTO m7.m7_canonical_generation                                                            -- class 5
        ("uploadIntentId","leaseEpoch","canonicalObjectKey","executingProfileId","backendSha256",
         "allocatedAt","grantExpiresAt","writeFenceAt","allocatedBy","generationPath")
    VALUES (v_i."id", v_epoch, v_key, v_pr."id", v_i."backendSha256", v_now, v_grant_exp, v_fence,
            session_user, 'M7_WORKER_UPLOAD_V1');
    UPDATE m7.m7_evidence_upload_intent
       SET "state" = 'PROCESSING', "stateVersion" = "stateVersion" + 1, "leaseOwner" = p_worker_id,
           "leaseEpoch" = v_epoch, "leaseExpiresAt" = v_now + v_pol."workerLease", "updatedAt" = v_now
     WHERE "id" = p_upload_intent_id
     RETURNING * INTO v_i;

    -- XF-2 / XF-9 / XF-11: allocate the ONE authorization envelope for this generation, addressable by
    -- one opaque generationGrantId. Every component is derived here from immutable rows; no caller
    -- supplies any of them, and no function can ever alter them (t_forbid_mutation). A second claim on
    -- this epoch is a primary-key violation.
    -- NOTE what this function does NOT do: it does not mint a capability, does not return capability
    -- material, and does not touch a signing credential. Round 2 had the claim return the grant material
    -- to the worker; §11.7.0 is why that is retired. The worker receives an opaque id and hands it to
    -- the sealed signer (§19.11.7), which is the only function that resolves it into an envelope.
    INSERT INTO m7.m7_generation_write_grant
        ("id","uploadIntentId","leaseEpoch","capabilityOperation","canonicalObjectKey","backendSha256",
         "grantExpiresAt","capabilityMode","envelopeEnforcement","allocatedAt","allocatedBy","generationPath")
    VALUES (v_grant_id, v_i."id", v_epoch, 'CANONICAL_CREATE', v_key, v_i."backendSha256",
            v_grant_exp, v_pr."writeCapabilityMode", v_pr."envelopeEnforcement", v_now, session_user,
            'M7_WORKER_UPLOAD_V1');

    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
    RETURN QUERY SELECT v_i."leaseEpoch", v_i."stagingObjectKey", v_key, v_i."maxBytes",
                        v_pol."canonicalMediaType", v_pol."maxPixels", m7.i_ts(v_i."leaseExpiresAt"),
                        v_pr."id", v_pr."storageProfileVersion", v_pr."credentialProfileId", v_pr."backendSha256",
                        v_pr."decoderGeneration", v_pr."encoderGeneration", v_pr."conditionalCreateMode",
                        v_pr."writeCapabilityMode", v_grant_id, m7.i_ts(v_grant_exp), m7.i_ts(v_fence);
    -- The two instants are returned as SCHEDULING information (the worker must know when to abandon the
    -- epoch, M7-R-11) and are not capability material: possessing grantExpiresAt confers nothing,
    -- because the only path to a capability resolves it from the row anyway (XF-12).
END
$fn$;

-- U4. The released generation becomes superseded and is enqueued for deletion (GF-7).
-- Lock profile: P1 intent (4) -> P2 backend (10) -> P3. WC-6: it enqueues, so it is a kind-C writer; round 3
-- took class 10 only inside the enqueue helper AFTER the intent UPDATE, and omitted it from §11.10.4.
CREATE FUNCTION m7.w_release_upload_intent_v1(p_manifest_sha256 text, p_upload_intent_id uuid, p_lease_epoch bigint)
    RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v_i m7.m7_evidence_upload_intent; v_now timestamptz;
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', 'M7_WORKER_UPLOAD_V1', true);
    PERFORM m7.i_assert_control_plane(p_manifest_sha256);
    SELECT * INTO v_i FROM m7.m7_evidence_upload_intent WHERE "id" = p_upload_intent_id FOR UPDATE;   -- P1: class 4
    v_now := pg_catalog.clock_timestamp();
    IF v_i."state" IS DISTINCT FROM 'PROCESSING' OR v_i."leaseEpoch" <> p_lease_epoch THEN
        RAISE EXCEPTION 'M7_STALE_LEASE' USING ERRCODE = 'M7005';
    END IF;
    IF v_now >= v_i."uploadExpiresAt" THEN
        RAISE EXCEPTION 'M7_LEASE_UNAVAILABLE' USING ERRCODE = 'M7006';   -- let the lease lapse; U9 expires the intent
    END IF;
    PERFORM m7.i_hold_backend_liveness(v_i."backendSha256");            -- P2: WC-6 / BL-2, before the first write
    UPDATE m7.m7_evidence_upload_intent
       SET "state" = 'ISSUED', "stateVersion" = "stateVersion" + 1, "leaseOwner" = NULL, "leaseExpiresAt" = NULL,
           "updatedAt" = v_now
     WHERE "id" = p_upload_intent_id
     RETURNING * INTO v_i;
    PERFORM m7.i_enqueue_superseded_generations(v_i, v_now, false);
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
END
$fn$;

-- U5. GF-4/GF-5: the observation may only name the CURRENT epoch's generation key, and it fixes
-- acceptedLeaseEpoch. A stale epoch's external write is therefore never observable here.
CREATE FUNCTION m7.w_record_validated_observation_v1(
    p_manifest_sha256 text, p_upload_intent_id uuid, p_lease_epoch bigint, p_byte_size integer,
    p_content_sha256 text, p_media_type text, p_executing_profile_id uuid, p_encoder_generation text,
    p_provider_etag text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE
    v_i m7.m7_evidence_upload_intent; v_pol m7.m7_retention_policy; v_g m7.m7_canonical_generation;
    v_pr m7.m7_storage_profile; v_now timestamptz; v_obs uuid := pg_catalog.gen_random_uuid();
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', 'M7_WORKER_UPLOAD_V1', true);
    PERFORM m7.i_assert_control_plane(p_manifest_sha256);
    SELECT * INTO v_i FROM m7.m7_evidence_upload_intent WHERE "id" = p_upload_intent_id FOR UPDATE;
    v_now := pg_catalog.clock_timestamp();
    IF v_i."state" IS DISTINCT FROM 'PROCESSING' OR v_i."leaseEpoch" <> p_lease_epoch THEN
        RAISE EXCEPTION 'M7_STALE_LEASE' USING ERRCODE = 'M7005';
    END IF;
    IF v_now >= v_i."intentDeadlineAt" THEN
        RAISE EXCEPTION 'M7_LEASE_UNAVAILABLE' USING ERRCODE = 'M7006';
    END IF;
    PERFORM m7.i_require_routable_profile(v_i."backendSha256");     -- SI-3: the backend is still addressable
    PERFORM m7.i_hold_backend_liveness(v_i."backendSha256");        -- WC-5 / BL-2: P2, class 10, before the first write
    SELECT * INTO STRICT v_g FROM m7.m7_canonical_generation
     WHERE "uploadIntentId" = p_upload_intent_id AND "leaseEpoch" = p_lease_epoch;
    -- SI-4 / EP-3: the observation is recorded against the profile the GENERATION ran under, which the
    -- worker must declare and which need not be the intent's issuance profile, nor the profile that
    -- happens to be live right now.
    SELECT * INTO STRICT v_pr FROM m7.m7_storage_profile WHERE "id" = v_g."executingProfileId";
    SELECT * INTO STRICT v_pol FROM m7.m7_retention_policy WHERE "policyVersion" = v_i."retentionPolicyVersion";
    IF p_executing_profile_id IS DISTINCT FROM v_g."executingProfileId" THEN
        RAISE EXCEPTION 'M7_STORAGE_ROUTING_MISMATCH: declared executing profile is not this generation''s'
            USING ERRCODE = 'M7011';
    END IF;
    IF p_media_type IS DISTINCT FROM v_pol."canonicalMediaType" OR p_byte_size IS NULL
       OR p_byte_size < 1 OR p_byte_size > v_i."maxBytes"
       OR p_encoder_generation IS DISTINCT FROM v_pr."encoderGeneration" THEN      -- EP-4
        RAISE EXCEPTION 'M7_INVALID_INPUT' USING ERRCODE = 'M7007';
    END IF;
    INSERT INTO m7.m7_storage_observation
        ("id","uploadIntentId","leaseEpoch","objectKey","executingProfileId","backendSha256","byteSize","contentSha256",
         "mediaType","encoderGeneration","providerEtag","observedAt","observedBy","generationPath",
         "redactedAt","redactionExecutionId")
    VALUES (v_obs, v_i."id", p_lease_epoch, v_g."canonicalObjectKey", v_g."executingProfileId", v_g."backendSha256",
            p_byte_size, p_content_sha256, p_media_type, p_encoder_generation, p_provider_etag, v_now, session_user,
            'M7_WORKER_UPLOAD_V1', NULL, NULL);
    UPDATE m7.m7_evidence_upload_intent
       SET "state" = 'VALIDATED', "stateVersion" = "stateVersion" + 1, "leaseOwner" = NULL, "leaseExpiresAt" = NULL,
           "acceptedLeaseEpoch" = p_lease_epoch, "updatedAt" = v_now
     WHERE "id" = p_upload_intent_id
     RETURNING * INTO v_i;
    -- XF-5: the staging delete cannot execute before the staging write fence
    PERFORM m7.i_enqueue_delete('STAGING', v_i."backendSha256", v_i."issuanceProfileId", v_i."stagingObjectKey",
                                v_i."stagingWriteFenceAt", NULL, v_i."id", NULL, NULL);
    PERFORM m7.i_enqueue_superseded_generations(v_i, v_now, false);        -- every non-accepted generation
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
    RETURN v_obs;
END
$fn$;

CREATE FUNCTION m7.w_record_content_rejected_v1(
    p_manifest_sha256 text, p_upload_intent_id uuid, p_lease_epoch bigint, p_reason m7."M7ContentRejectionReason")
    RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v_i m7.m7_evidence_upload_intent; v_now timestamptz;
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', 'M7_WORKER_UPLOAD_V1', true);
    PERFORM m7.i_assert_control_plane(p_manifest_sha256);
    SELECT * INTO v_i FROM m7.m7_evidence_upload_intent WHERE "id" = p_upload_intent_id FOR UPDATE;   -- P1: class 4
    IF v_i."state" IS DISTINCT FROM 'PROCESSING' OR v_i."leaseEpoch" <> p_lease_epoch OR p_reason IS NULL THEN
        RAISE EXCEPTION 'M7_STALE_LEASE' USING ERRCODE = 'M7005';
    END IF;
    PERFORM m7.i_hold_backend_liveness(v_i."backendSha256");            -- P2: WC-6 / BL-2, before the first write
    v_now := pg_catalog.clock_timestamp();
    UPDATE m7.m7_evidence_upload_intent
       SET "state" = 'REJECTED_CONTENT', "stateVersion" = "stateVersion" + 1, "leaseOwner" = NULL,
           "leaseExpiresAt" = NULL, "rejectionReason" = p_reason, "updatedAt" = v_now
     WHERE "id" = p_upload_intent_id
     RETURNING * INTO v_i;
    PERFORM m7.i_enqueue_delete('STAGING', v_i."backendSha256", v_i."issuanceProfileId", v_i."stagingObjectKey",
                                GREATEST(v_now, v_i."stagingWriteFenceAt"), NULL, v_i."id", NULL, NULL);
    PERFORM m7.i_enqueue_superseded_generations(v_i, v_now, true);        -- no accepted generation exists
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
END
$fn$;

CREATE FUNCTION m7.w_record_terminal_failure_v1(
    p_manifest_sha256 text, p_upload_intent_id uuid, p_lease_epoch bigint, p_reason m7."M7TerminalFailureReason")
    RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v_i m7.m7_evidence_upload_intent; v_now timestamptz;
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', 'M7_WORKER_UPLOAD_V1', true);
    PERFORM m7.i_assert_control_plane(p_manifest_sha256);
    SELECT * INTO v_i FROM m7.m7_evidence_upload_intent WHERE "id" = p_upload_intent_id FOR UPDATE;   -- P1: class 4
    IF v_i."state" IS DISTINCT FROM 'PROCESSING' OR v_i."leaseEpoch" <> p_lease_epoch OR p_reason IS NULL THEN
        RAISE EXCEPTION 'M7_STALE_LEASE' USING ERRCODE = 'M7005';
    END IF;
    PERFORM m7.i_hold_backend_liveness(v_i."backendSha256");            -- P2: WC-6 / BL-2, before the first write
    v_now := pg_catalog.clock_timestamp();
    UPDATE m7.m7_evidence_upload_intent
       SET "state" = 'TERMINAL_FAILURE', "stateVersion" = "stateVersion" + 1, "leaseOwner" = NULL,
           "leaseExpiresAt" = NULL, "failureReason" = p_reason, "updatedAt" = v_now
     WHERE "id" = p_upload_intent_id
     RETURNING * INTO v_i;
    PERFORM m7.i_enqueue_delete('STAGING', v_i."backendSha256", v_i."issuanceProfileId", v_i."stagingObjectKey",
                                GREATEST(v_now, v_i."stagingWriteFenceAt"), NULL, v_i."id", NULL, NULL);
    PERFORM m7.i_enqueue_superseded_generations(v_i, v_now, true);
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
END
$fn$;

-- U9: deadline expiry and withdrawal expiry. Deletes the staging object AND every generation.
-- Lock profile (§16.2.6): P1 the WHOLE batch of intents, FOR UPDATE SKIP LOCKED -> P2 the batch's backends,
-- ordered -> P3. Round 3 fetched and locked row n+1 while already holding class 10 for row n.
CREATE FUNCTION m7.w_expire_upload_intents_v1(p_manifest_sha256 text, p_limit integer) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v_ids uuid[]; r m7.m7_evidence_upload_intent; v_i m7.m7_evidence_upload_intent; v_now timestamptz; v_n integer := 0;
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', 'M7_WORKER_UPLOAD_V1', true);
    PERFORM m7.i_assert_control_plane(p_manifest_sha256);
    v_now := pg_catalog.clock_timestamp();
    -- P1 (class 4): SKIP LOCKED never waits (PG-3)
    SELECT pg_catalog.array_agg(q."id") INTO v_ids
      FROM (SELECT i."id" FROM m7.m7_evidence_upload_intent i
             WHERE i."state" IN ('ISSUED','PROCESSING','VALIDATED')
               AND (i."state" <> 'PROCESSING' OR i."leaseExpiresAt" <= v_now)
               AND (i."intentDeadlineAt" <= v_now OR m7.i_withdrawal_event(i."assignmentId") IS NOT NULL)
             ORDER BY i."backendSha256" COLLATE "C", i."intentDeadlineAt", i."id"
             LIMIT GREATEST(LEAST(p_limit, 500), 1)
               FOR UPDATE SKIP LOCKED) q;
    IF v_ids IS NULL THEN
        PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
        RETURN 0;
    END IF;
    -- P2 (class 10): WC-7, BL-4
    PERFORM m7.i_hold_backends_liveness(ARRAY(SELECT i."backendSha256" FROM m7.m7_evidence_upload_intent i
                                               WHERE i."id" = ANY (v_ids)));
    -- P3: writes on rows this transaction already holds
    FOR r IN
        SELECT i.* FROM m7.m7_evidence_upload_intent i
         WHERE i."id" = ANY (v_ids)
         ORDER BY i."backendSha256" COLLATE "C", i."intentDeadlineAt", i."id"
    LOOP
        UPDATE m7.m7_evidence_upload_intent
           SET "state" = 'EXPIRED', "stateVersion" = "stateVersion" + 1, "leaseOwner" = NULL, "leaseExpiresAt" = NULL,
               "updatedAt" = v_now
         WHERE "id" = r."id"
         RETURNING * INTO v_i;
        PERFORM m7.i_enqueue_delete('STAGING', v_i."backendSha256", v_i."issuanceProfileId", v_i."stagingObjectKey",
                                    GREATEST(v_now, v_i."stagingWriteFenceAt"), NULL, v_i."id", NULL, NULL);
        PERFORM m7.i_enqueue_superseded_generations(v_i, GREATEST(v_now, v_i."stagingWriteFenceAt"), true);
        v_n := v_n + 1;
    END LOOP;
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
    RETURN v_n;
END
$fn$;

-- GF-7 sweep without listing: enqueue deletes for generations that are neither accepted nor live.
-- Lock profile: P1 the owning intents of a bounded candidate set, FOR UPDATE SKIP LOCKED -> P2 ordered
-- backends -> P3. Round 3 took a WAITING intent lock per row inside the loop, after class 10 for earlier rows.
CREATE FUNCTION m7.w_sweep_superseded_generations_v1(p_manifest_sha256 text, p_limit integer) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v_ids uuid[]; r record; v_now timestamptz; v_n integer := 0;
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', 'M7_WORKER_RECONCILIATION_V1', true);
    PERFORM m7.i_assert_control_plane(p_manifest_sha256);
    v_now := pg_catalog.clock_timestamp();
    -- P1 (class 4)
    SELECT pg_catalog.array_agg(q."id") INTO v_ids
      FROM (SELECT i."id" FROM m7.m7_evidence_upload_intent i
             WHERE i."id" IN (
                   SELECT g."uploadIntentId"
                     FROM m7.m7_canonical_generation g
                     JOIN m7.m7_evidence_upload_intent c ON c."id" = g."uploadIntentId"
                    WHERE (c."acceptedLeaseEpoch" IS NULL OR g."leaseEpoch" <> c."acceptedLeaseEpoch")
                      AND NOT (c."state" = 'PROCESSING' AND g."leaseEpoch" = c."leaseEpoch")
                      AND EXISTS (SELECT 1 FROM m7.m7_storage_profile p
                                   WHERE p."backendSha256" = g."backendSha256" AND p."retiredAt" IS NULL)
                      AND NOT EXISTS (SELECT 1 FROM m7.m7_storage_outbox ob
                                       WHERE ob."effectKind" = 'DELETE_OBJECT' AND ob."backendSha256" = g."backendSha256"
                                         AND ob."objectKey" = g."canonicalObjectKey")
                    ORDER BY g."backendSha256" COLLATE "C", g."uploadIntentId", g."leaseEpoch"
                    LIMIT GREATEST(LEAST(p_limit, 500), 1))
             ORDER BY i."id"
               FOR UPDATE SKIP LOCKED) q;
    IF v_ids IS NULL THEN
        PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
        RETURN 0;
    END IF;
    -- P2 (class 10): WC-8, BL-4
    PERFORM m7.i_hold_backends_liveness(ARRAY(SELECT i."backendSha256" FROM m7.m7_evidence_upload_intent i
                                               WHERE i."id" = ANY (v_ids)));
    -- P3: the predicate is re-evaluated on intents this transaction now holds
    FOR r IN
        SELECT g."uploadIntentId", g."leaseEpoch", g."canonicalObjectKey", g."backendSha256",
               g."executingProfileId", g."writeFenceAt"
          FROM m7.m7_canonical_generation g
          JOIN m7.m7_evidence_upload_intent i ON i."id" = g."uploadIntentId"
         WHERE i."id" = ANY (v_ids)
           AND (i."acceptedLeaseEpoch" IS NULL OR g."leaseEpoch" <> i."acceptedLeaseEpoch")
           AND NOT (i."state" = 'PROCESSING' AND g."leaseEpoch" = i."leaseEpoch")
           AND NOT EXISTS (SELECT 1 FROM m7.m7_storage_outbox ob
                            WHERE ob."effectKind" = 'DELETE_OBJECT' AND ob."backendSha256" = g."backendSha256"
                              AND ob."objectKey" = g."canonicalObjectKey")
         ORDER BY g."backendSha256" COLLATE "C", g."uploadIntentId", g."leaseEpoch"
    LOOP
        -- XF-5: never before this generation's fence
        PERFORM m7.i_enqueue_delete('CANONICAL', r."backendSha256", r."executingProfileId", r."canonicalObjectKey",
                                    GREATEST(v_now, r."writeFenceAt"), NULL, r."uploadIntentId", r."leaseEpoch", NULL);
        v_n := v_n + 1;
    END LOOP;
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
    RETURN v_n;
END
$fn$;

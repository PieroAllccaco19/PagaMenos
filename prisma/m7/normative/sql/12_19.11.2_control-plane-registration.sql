CREATE FUNCTION m7.c_register_storage_backend_v1(
    p_provider_class m7."M7StorageProviderClass", p_container_id text, p_region_id text,
    p_endpoint_identity text, p_staging_prefix text, p_evidence_prefix text,
    p_write_completion_window interval) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v_digest text; v_existing m7.m7_storage_backend;
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', 'M7_CONTROL_PLANE_INSTALL_V1', true);
    v_digest := m7.i_backend_digest(p_provider_class, p_container_id, p_region_id,
                                    p_endpoint_identity, p_staging_prefix, p_evidence_prefix,
                                    p_write_completion_window);
    -- LG-4: a registration PROBE is FOR SHARE. Round 3 took FOR UPDATE, which conflicted with every class-10
    -- FOR SHARE holder for no reason: the row is immutable apart from retirement.
    SELECT * INTO v_existing FROM m7.m7_storage_backend WHERE "backendSha256" = v_digest FOR SHARE;
    IF v_existing."backendSha256" IS NULL THEN
        INSERT INTO m7.m7_storage_backend
            ("backendSha256","providerClass","containerId","regionId","endpointIdentity","stagingPrefix",
             "evidencePrefix","providerWriteCompletionWindow","registeredAt","registeredBy","retiredAt",
             "retiredBy","generationPath")
        VALUES (v_digest, p_provider_class, p_container_id, p_region_id, p_endpoint_identity, p_staging_prefix,
                p_evidence_prefix, p_write_completion_window, pg_catalog.clock_timestamp(), session_user,
                NULL, NULL, 'M7_CONTROL_PLANE_INSTALL_V1');
    ELSIF (v_existing."providerClass", v_existing."containerId", v_existing."regionId",
           v_existing."endpointIdentity", v_existing."stagingPrefix", v_existing."evidencePrefix",
           v_existing."providerWriteCompletionWindow")
          IS DISTINCT FROM
          (p_provider_class, p_container_id, p_region_id, p_endpoint_identity, p_staging_prefix,
           p_evidence_prefix, p_write_completion_window) THEN
        -- unreachable while i_backend_digest covers every identity field; kept as a defence in depth
        RAISE EXCEPTION 'M7_CONTROL_PLANE: backend digest collision with different content' USING ERRCODE = '55000';
    END IF;
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
    RETURN v_digest;
END
$fn$;

CREATE FUNCTION m7.c_register_storage_profile_v1(
    p_storage_profile_version text, p_backend_sha256 text, p_credential_profile_id text,
    p_credential_generation integer, p_upload_transport m7."M7UploadTransport",
    p_decoder_generation text, p_encoder_generation text, p_storage_capability_version text,
    p_conditional_create_mode m7."M7ConditionalCreateMode",
    p_write_capability_mode m7."M7WriteCapabilityMode",
    p_envelope_enforcement m7."M7EnvelopeEnforcement") RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v m7.m7_storage_profile; v_digest text; v_id uuid := pg_catalog.gen_random_uuid(); v_be m7.m7_storage_backend;
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', 'M7_CONTROL_PLANE_INSTALL_V1', true);
    SELECT * INTO v_be FROM m7.m7_storage_backend WHERE "backendSha256" = p_backend_sha256 FOR SHARE;
    IF v_be."backendSha256" IS NULL OR v_be."retiredAt" IS NOT NULL THEN
        RAISE EXCEPTION 'M7_CONTROL_PLANE: storage profile must name a live registered backend' USING ERRCODE = '55000';
    END IF;
    v_digest := m7.i_profile_digest(p_storage_profile_version, p_backend_sha256, p_credential_profile_id,
                                    p_credential_generation, p_upload_transport, p_decoder_generation,
                                    p_encoder_generation, p_storage_capability_version, p_conditional_create_mode,
                                    p_write_capability_mode, p_envelope_enforcement);
    SELECT * INTO v FROM m7.m7_storage_profile WHERE "storageProfileVersion" = p_storage_profile_version FOR SHARE;  -- LG-4 probe
    IF v."id" IS NOT NULL THEN
        -- §23.8: reusing a versioned identity with different immutable content MUST fail
        IF v."profileSha256" IS DISTINCT FROM v_digest THEN
            RAISE EXCEPTION 'M7_CONTROL_PLANE: storage profile version % already exists with different content',
                p_storage_profile_version USING ERRCODE = '55000';
        END IF;
        PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
        RETURN v."id";
    END IF;
    INSERT INTO m7.m7_storage_profile
        ("id","storageProfileVersion","profileSha256","backendSha256","credentialProfileId","credentialGeneration",
         "uploadTransport","decoderGeneration","encoderGeneration","storageCapabilityVersion","conditionalCreateMode",
         "writeCapabilityMode","envelopeEnforcement","registeredAt","registeredBy","retiredAt","retiredBy","generationPath")
    VALUES (v_id, p_storage_profile_version, v_digest, p_backend_sha256, p_credential_profile_id,
            p_credential_generation, p_upload_transport, p_decoder_generation, p_encoder_generation,
            p_storage_capability_version, p_conditional_create_mode, p_write_capability_mode,
            p_envelope_enforcement,
            pg_catalog.clock_timestamp(), session_user, NULL, NULL, 'M7_CONTROL_PLANE_INSTALL_V1');
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
    RETURN v_id;
END
$fn$;

-- Credential rotation retires the OLD profile; another live profile over the same backend must remain,
-- or the backend must itself be drained (§11.1.5, §11.9).
-- M7V11R2-AUD-04: the "or drained" branch is the SHARED m7.i_backend_is_drained predicate, the same
-- one c_retire_storage_backend_v1 uses. There is no second, weaker definition here.
-- M7V11R3-AUD-02 / LG-4: the backend row (class 10) is taken FOR UPDATE **FIRST** -- before the profile
-- row (class 0) -- as in every c_* function (BL-3). Round 2 took the profile first, and round 3's activation
-- still did, which is the profile<->backend inversion M7V11R4-AUD-02 names; activation now follows the same
-- order (RC-22). Every function that creates a drain obligation or mints authority takes the same row
-- FOR SHARE in phase P2 (BL-2, §11.10.4), so this FOR UPDATE is a real two-sided serialization point and
-- the BL-THEOREM of §11.10.6 applies.
CREATE FUNCTION m7.c_retire_storage_profile_v1(p_storage_profile_version text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v m7.m7_storage_profile; v_be text; v_live integer; v_reason text;
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', 'M7_CONTROL_PLANE_INSTALL_V1', true);
    -- resolve the backend WITHOUT a lock, so the first lock taken can be the backend row itself
    SELECT p."backendSha256" INTO v_be FROM m7.m7_storage_profile p
     WHERE p."storageProfileVersion" = p_storage_profile_version;
    IF v_be IS NULL THEN
        RAISE EXCEPTION 'M7_CONTROL_PLANE: unknown or already retired storage profile' USING ERRCODE = '55000';
    END IF;
    -- BL-3: class 10 / class-0 first element. Held across the predicate AND the update, so no
    -- work-creating transaction can commit an obligation in between (BL-THEOREM, §11.10.6).
    -- LG-10 / M7V11R5-AUD-01: both locks are NOWAIT. A retirement is never a waiter on the backend or
    -- profile row, so no later FOR SHARE can queue behind it, whatever PostgreSQL's queueing policy (PG-1).
    -- Contention resolves against the retirement at once (BL-7); the pipeline retries (RR-1..RR-7).
    BEGIN
        PERFORM 1 FROM m7.m7_storage_backend WHERE "backendSha256" = v_be FOR UPDATE NOWAIT;
    EXCEPTION WHEN lock_not_available THEN
        RAISE EXCEPTION 'M7_RETIREMENT_BUSY' USING ERRCODE = 'M7014', DETAIL = 'BACKEND_LIVENESS_HELD';
    END;
    BEGIN
        SELECT * INTO v FROM m7.m7_storage_profile
         WHERE "storageProfileVersion" = p_storage_profile_version FOR UPDATE NOWAIT;          -- class 0
    EXCEPTION WHEN lock_not_available THEN
        RAISE EXCEPTION 'M7_RETIREMENT_BUSY' USING ERRCODE = 'M7014', DETAIL = 'PROFILE_ROW_HELD';
    END;
    IF v."id" IS NULL OR v."retiredAt" IS NOT NULL THEN
        RAISE EXCEPTION 'M7_CONTROL_PLANE: unknown or already retired storage profile' USING ERRCODE = '55000';
    END IF;
    -- RT-1: the active manifest's own profile is never retirable
    IF EXISTS (SELECT 1 FROM m7.m7_control_plane_installation i
                JOIN m7.m7_control_plane_manifest m ON m."manifestVersion" = i."manifestVersion"
               WHERE i."retiredAt" IS NULL AND m."storageProfileVersion" = p_storage_profile_version) THEN
        RAISE EXCEPTION 'M7_CONTROL_PLANE: cannot retire the profile of the active manifest' USING ERRCODE = '55000';
    END IF;
    SELECT pg_catalog.count(*) INTO v_live FROM m7.m7_storage_profile p
     WHERE p."backendSha256" = v."backendSha256" AND p."retiredAt" IS NULL AND p."id" <> v."id";
    IF v_live = 0 THEN
        -- this is the LAST live profile: nothing on this backend would remain addressable afterwards,
        -- so the backend must already satisfy the one canonical drain predicate (§11.9)
        v_reason := m7.i_backend_is_drained(v."backendSha256");
        IF v_reason IS NOT NULL THEN
            RAISE EXCEPTION
                'M7_STORAGE_ROUTING_MISMATCH: retiring the last live profile of a backend that is not drained'
                USING ERRCODE = 'M7011', DETAIL = v_reason;
        END IF;
    END IF;
    -- RT-5: a NON-last retirement is ordinary credential rotation. It consults neither the drain
    -- predicate nor RT-2, because the backend keeps routing through the remaining live profile (EP-7).
    UPDATE m7.m7_storage_profile SET "retiredAt" = pg_catalog.clock_timestamp(), "retiredBy" = session_user
     WHERE "id" = v."id";
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
END
$fn$;

-- A backend is DRAINED, never reassigned. Every byte M7 wrote there must be confirmed gone first.
-- M7V11R3-AUD-02, two repairs:
--  (RT-2) it refuses the backend the ACTIVE manifest routes to, BEFORE consulting the drain predicate
--         and with a distinct error. Round 2 refused only the active PROFILE in the profile function
--         and had no equivalent here -- yet this function retires EVERY profile of the backend,
--         including the active manifest's, so a drained active backend could be retired out from
--         under the live installation. A freshly rotated-to backend with no evidence yet IS drained,
--         so that was the easiest state to reach, not an exotic one.
--  (BL-3) it holds the backend row FOR UPDATE across the coherence check, the drain predicate and both
--         updates, and every work-creating path takes the same row FOR SHARE (BL-2). The round-2
--         serialization claim -- that this FOR UPDATE alone serialized issuance and enqueueing -- is
--         withdrawn; it did not follow, because p_begin_evidence_upload_v1 never took the lock.
CREATE FUNCTION m7.c_retire_storage_backend_v1(p_backend_sha256 text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v m7.m7_storage_backend; v_now timestamptz; v_reason text; v_active text;
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', 'M7_CONTROL_PLANE_INSTALL_V1', true);
    -- BL-3: class 10, FIRST lock, held to commit. LG-10 / M7V11R5-AUD-01: NOWAIT, so this transaction never
    -- waits and is never a queue head behind which a work transaction's FOR SHARE could wait (§16.2.8 Cor. 1).
    BEGIN
        SELECT * INTO v FROM m7.m7_storage_backend WHERE "backendSha256" = p_backend_sha256 FOR UPDATE NOWAIT;
    EXCEPTION WHEN lock_not_available THEN
        RAISE EXCEPTION 'M7_RETIREMENT_BUSY' USING ERRCODE = 'M7014', DETAIL = 'BACKEND_LIVENESS_HELD';
    END;
    IF v."backendSha256" IS NULL OR v."retiredAt" IS NOT NULL THEN
        RAISE EXCEPTION 'M7_CONTROL_PLANE: unknown or already retired backend' USING ERRCODE = '55000';
    END IF;
    -- LG-4: every profile of this backend, FOR UPDATE, in id order, BEFORE any predicate or read. Round 3
    -- locked them implicitly, in physical scan order, inside the UPDATE at the end. LG-10: NOWAIT.
    BEGIN
        PERFORM 1 FROM m7.m7_storage_profile p WHERE p."backendSha256" = p_backend_sha256
         ORDER BY p."id" FOR UPDATE NOWAIT;
    EXCEPTION WHEN lock_not_available THEN
        RAISE EXCEPTION 'M7_RETIREMENT_BUSY' USING ERRCODE = 'M7014', DETAIL = 'PROFILE_ROW_HELD';
    END;
    -- RT-2: active-control-plane coherence. Checked BEFORE the drain predicate and reported distinctly,
    -- because "this is the backend the active installation routes to" is not a drain question and must
    -- not be reported as one. T-172.
    SELECT p."backendSha256" INTO v_active
      FROM m7.m7_control_plane_installation i
      JOIN m7.m7_control_plane_manifest m ON m."manifestVersion" = i."manifestVersion"
      JOIN m7.m7_storage_profile p ON p."storageProfileVersion" = m."storageProfileVersion"
     WHERE i."retiredAt" IS NULL;
    IF v_active IS NOT NULL AND v_active = p_backend_sha256 THEN
        RAISE EXCEPTION 'M7_CONTROL_PLANE: cannot retire the backend of the active manifest'
            USING ERRCODE = '55000',
                  DETAIL = 'rotate to a successor backend and activate it first (RT-3): register backend, register profile, c_activate_manifest_v1, drain, then retire';
    END IF;
    -- §11.9: the ONE definition of drained, shared with c_retire_storage_profile_v1, and evaluated
    -- under the liveness lock so nothing uncommitted can extend the state it reports (BL-THEOREM).
    v_reason := m7.i_backend_is_drained(p_backend_sha256);
    IF v_reason IS NOT NULL THEN
        RAISE EXCEPTION 'M7_DELETION_PRECONDITION: backend is not drained'
            USING ERRCODE = 'M7009', DETAIL = v_reason;
    END IF;
    v_now := pg_catalog.clock_timestamp();
    -- RT-4: every profile over the backend is retired with it, and by RT-2 none of them is active
    UPDATE m7.m7_storage_profile SET "retiredAt" = v_now, "retiredBy" = session_user
     WHERE "backendSha256" = p_backend_sha256 AND "retiredAt" IS NULL;
    UPDATE m7.m7_storage_backend SET "retiredAt" = v_now, "retiredBy" = session_user
     WHERE "backendSha256" = p_backend_sha256;
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
END
$fn$;

CREATE FUNCTION m7.c_register_retention_policy_v1(
    p_policy_version text,
    p_hard_withdrawal interval, p_hard_never_verified interval, p_hard_authorized interval,
    p_schedule_withdrawal interval, p_schedule_never_verified interval, p_schedule_authorized interval,
    p_scheduler_worst_case_lag interval, p_effect_completion_budget interval,
    p_generation_write_grant_ttl interval, p_write_fence_skew_allowance interval,
    p_upload_url_ttl interval, p_finalize_window interval, p_worker_lease interval, p_session_ttl interval,
    p_capture_skew_tolerance interval, p_orphan_grace interval, p_outbox_backoff_cap interval,
    p_outbox_max_attempts integer, p_max_upload_bytes integer, p_max_pixels integer,
    p_canonical_media_type text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v m7.m7_retention_policy; v_candidate m7.m7_retention_policy; v_digest text; v_span interval;
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', 'M7_CONTROL_PLANE_INSTALL_V1', true);
    v_candidate := ROW(p_policy_version, p_hard_withdrawal, p_hard_never_verified, p_hard_authorized,
        p_schedule_withdrawal, p_schedule_never_verified, p_schedule_authorized,
        p_scheduler_worst_case_lag, p_effect_completion_budget,
        p_generation_write_grant_ttl, p_write_fence_skew_allowance, p_upload_url_ttl, p_finalize_window,
        p_worker_lease, p_session_ttl, p_capture_skew_tolerance, p_orphan_grace, p_outbox_backoff_cap,
        p_outbox_max_attempts, p_max_upload_bytes, p_max_pixels, p_canonical_media_type,
        'pagamenos.m7.media.jpeg-png-webp.v1', '', pg_catalog.clock_timestamp(),
        'M7_CONTROL_PLANE_INSTALL_V1')::m7.m7_retention_policy;
    v_digest := m7.i_policy_digest(v_candidate);

    -- DL-4: the completion budget must dominate the retry schedule this very policy will execute.
    v_span := m7.i_worst_case_retry_span(v_candidate);
    IF p_effect_completion_budget < v_span THEN
        RAISE EXCEPTION 'M7_CONTROL_PLANE: effectCompletionBudget % is smaller than the worst-case retry span %',
            p_effect_completion_budget, v_span USING ERRCODE = '55000';
    END IF;

    SELECT * INTO v FROM m7.m7_retention_policy WHERE "policyVersion" = p_policy_version FOR SHARE;           -- LG-4 probe
    IF v."policyVersion" IS NOT NULL THEN
        IF v."policySha256" IS DISTINCT FROM v_digest THEN
            RAISE EXCEPTION 'M7_CONTROL_PLANE: policy version % already exists with different content', p_policy_version
                USING ERRCODE = '55000';
        END IF;
        PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
        RETURN p_policy_version;
    END IF;
    INSERT INTO m7.m7_retention_policy
        ("policyVersion","rawDeleteHardDeadlineWithdrawal","rawDeleteHardDeadlineNeverVerified",
         "authorizedDeletionHardDeadline","rawDeleteScheduleAfterWithdrawal","rawDeleteScheduleAfterNeverVerified",
         "authorizedDeletionScheduleAfter","schedulerWorstCaseLag","effectCompletionBudget",
         "generationWriteGrantTtl","writeFenceSkewAllowance","uploadUrlTtl",
         "finalizeWindow","workerLease","sessionTtl","captureSkewTolerance","orphanGrace","outboxBackoffCap",
         "outboxMaxAttempts","maxUploadBytes","maxPixels","canonicalMediaType","mediaPolicyVersion",
         "policySha256","createdAt","generationPath")
    VALUES (p_policy_version, p_hard_withdrawal, p_hard_never_verified, p_hard_authorized,
            p_schedule_withdrawal, p_schedule_never_verified, p_schedule_authorized,
            p_scheduler_worst_case_lag, p_effect_completion_budget,
            p_generation_write_grant_ttl, p_write_fence_skew_allowance, p_upload_url_ttl, p_finalize_window,
            p_worker_lease, p_session_ttl, p_capture_skew_tolerance, p_orphan_grace, p_outbox_backoff_cap,
            p_outbox_max_attempts, p_max_upload_bytes, p_max_pixels, p_canonical_media_type,
            'pagamenos.m7.media.jpeg-png-webp.v1', v_digest, pg_catalog.clock_timestamp(),
            'M7_CONTROL_PLANE_INSTALL_V1');
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
    RETURN p_policy_version;
END
$fn$;

CREATE FUNCTION m7.c_register_merchant_vocabulary_v1(
    p_vocabulary_version text, p_corpus_id text, p_merchant_refs text[], p_entries_sha256 text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v m7.m7_merchant_vocabulary; v_count integer; v_entries text; v_supplied text; v_digest text;
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', 'M7_CONTROL_PLANE_INSTALL_V1', true);
    SELECT * INTO v FROM m7.m7_merchant_vocabulary WHERE "vocabularyVersion" = p_vocabulary_version FOR SHARE;  -- LG-4 probe
    IF v."vocabularyVersion" IS NULL THEN
        SELECT pg_catalog.count(*) INTO v_count FROM (SELECT DISTINCT r FROM pg_catalog.unnest(p_merchant_refs) AS r) d;
        IF v_count = 0 OR v_count <> pg_catalog.cardinality(p_merchant_refs) THEN
            RAISE EXCEPTION 'M7_CONTROL_PLANE: merchant vocabulary empty or contains duplicates' USING ERRCODE = '55000';
        END IF;
        -- the entries digest of the SUPPLIED refs, in exactly the canonical form i_vocabulary_entries_digest
        -- recomputes from stored rows (sorted COLLATE "C", newline-joined, SHA-256)
        SELECT 'sha256:' || pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
                   pg_catalog.string_agg(r, E'\n' ORDER BY r COLLATE "C"), 'UTF8')), 'hex')
          INTO v_supplied FROM pg_catalog.unnest(p_merchant_refs) AS r;
        IF v_supplied IS DISTINCT FROM p_entries_sha256 THEN
            RAISE EXCEPTION 'M7_CONTROL_PLANE: merchant vocabulary entries digest mismatch' USING ERRCODE = '55000';
        END IF;
        v_digest := m7.i_vocabulary_digest(p_vocabulary_version, p_corpus_id, v_count, v_supplied);
        -- A.2.3 #45: the PARENT row first. m7_merchant_vocabulary_entry_version_fkey is NOT DEFERRABLE, so
        -- round 3's entries-first order failed every registration with 23503 at the end of the entry INSERT.
        -- Parent-first also makes a concurrent registration of the same version wait on this key before
        -- either transaction inserts a single entry (IW-5, single).
        INSERT INTO m7.m7_merchant_vocabulary
            ("vocabularyVersion","corpusId","entryCount","entriesSha256","vocabularySha256","createdAt","generationPath")
        VALUES (p_vocabulary_version, p_corpus_id, v_count, v_supplied, v_digest, pg_catalog.clock_timestamp(),
                'M7_CONTROL_PLANE_INSTALL_V1');
        INSERT INTO m7.m7_merchant_vocabulary_entry ("vocabularyVersion", "merchantRef")
            SELECT p_vocabulary_version, r FROM pg_catalog.unnest(p_merchant_refs) AS r;
        -- R-B-14 preserved: PostgreSQL still recomputes the digest FROM THE STORED ROWS, and it must agree
        v_entries := m7.i_vocabulary_entries_digest(p_vocabulary_version);
        IF v_entries IS DISTINCT FROM v_supplied THEN
            RAISE EXCEPTION 'M7_CONTROL_PLANE: stored merchant vocabulary entries do not reproduce the digest' USING ERRCODE = '55000';
        END IF;
    ELSE
        -- §3 of the audit brief: reuse with ANY different immutable content must fail, corpusId included.
        v_entries := m7.i_vocabulary_entries_digest(p_vocabulary_version);
        SELECT pg_catalog.count(*) INTO v_count FROM m7.m7_merchant_vocabulary_entry e
         WHERE e."vocabularyVersion" = p_vocabulary_version;
        v_digest := m7.i_vocabulary_digest(p_vocabulary_version, p_corpus_id, v_count, p_entries_sha256);
        IF v."corpusId" IS DISTINCT FROM p_corpus_id
           OR v."entriesSha256" IS DISTINCT FROM p_entries_sha256
           OR v."entriesSha256" IS DISTINCT FROM v_entries
           OR v."entryCount" <> v_count
           OR v."entryCount" <> pg_catalog.cardinality(p_merchant_refs)
           OR v."vocabularySha256" IS DISTINCT FROM v_digest
           OR EXISTS (SELECT r FROM pg_catalog.unnest(p_merchant_refs) AS r
                      EXCEPT SELECT e."merchantRef" FROM m7.m7_merchant_vocabulary_entry e
                              WHERE e."vocabularyVersion" = p_vocabulary_version) THEN
            RAISE EXCEPTION 'M7_CONTROL_PLANE: vocabulary version % already exists with different content',
                p_vocabulary_version USING ERRCODE = '55000';
        END IF;
    END IF;
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
    RETURN p_vocabulary_version;
END
$fn$;

CREATE FUNCTION m7.c_register_manifest_v1(
    p_manifest_version text, p_manifest_sha256 text, p_policy_version text,
    p_vocabulary_version text, p_storage_profile_version text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v m7.m7_control_plane_manifest; v_other text;
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', 'M7_CONTROL_PLANE_INSTALL_V1', true);
    SELECT * INTO v FROM m7.m7_control_plane_manifest WHERE "manifestVersion" = p_manifest_version FOR SHARE;  -- LG-4 probe
    IF v."manifestVersion" IS NOT NULL THEN
        IF (v."manifestSha256", v."retentionPolicyVersion", v."vocabularyVersion", v."storageProfileVersion")
           IS DISTINCT FROM (p_manifest_sha256, p_policy_version, p_vocabulary_version, p_storage_profile_version) THEN
            RAISE EXCEPTION 'M7_CONTROL_PLANE: manifest version % already exists with different content',
                p_manifest_version USING ERRCODE = '55000';
        END IF;
        PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
        RETURN p_manifest_version;                                   -- idempotent re-registration
    END IF;
    SELECT "manifestVersion" INTO v_other FROM m7.m7_control_plane_manifest WHERE "manifestSha256" = p_manifest_sha256;
    IF v_other IS NOT NULL THEN
        RAISE EXCEPTION 'M7_CONTROL_PLANE: digest already bound to manifest version %', v_other USING ERRCODE = '55000';
    END IF;
    INSERT INTO m7.m7_control_plane_manifest
        ("manifestVersion","manifestSha256","retentionPolicyVersion","vocabularyVersion","storageProfileVersion",
         "registeredAt","registeredBy","generationPath")
    VALUES (p_manifest_version, p_manifest_sha256, p_policy_version, p_vocabulary_version, p_storage_profile_version,
            pg_catalog.clock_timestamp(), session_user, 'M7_CONTROL_PLANE_INSTALL_V1');
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
    RETURN p_manifest_version;
END
$fn$;

-- Activation = an INSTALLATION EVENT. Repeatable for the same manifest, which is what makes
-- A -> B -> A rollback executable (closes M7V11-AUD-03).
-- M7V11R4-AUD-02 / RC-22: the rows are RESOLVED without locks (every column read for the resolution is
-- immutable) and then LOCKED in the one control-plane order of LG-4: class 10 backend -> profile -> policy ->
-- manifest -> installation. Round 3 locked manifest -> profile -> backend, which inverted backend <= profile
-- against c_retire_storage_profile_v1 (backend FOR UPDATE -> profile FOR UPDATE) and could deadlock.
-- RC-23: the active installation row is taken FOR NO KEY UPDATE, so two activations serialize on it without
-- conflicting with the FOR KEY SHARE that in-flight intent, receipt and session inserts hold on it.
CREATE FUNCTION m7.c_activate_manifest_v1(p_manifest_version text, p_manifest_sha256 text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE
    v_m m7.m7_control_plane_manifest; v_p m7.m7_storage_profile; v_be m7.m7_storage_backend;
    v_pol m7.m7_retention_policy; v_cur m7.m7_control_plane_installation; v_backend text;
    v_id uuid := pg_catalog.gen_random_uuid(); v_seq bigint; v_now timestamptz;
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', 'M7_CONTROL_PLANE_INSTALL_V1', true);
    -- resolution, no locks
    SELECT p."backendSha256" INTO v_backend
      FROM m7.m7_control_plane_manifest m
      JOIN m7.m7_storage_profile p ON p."storageProfileVersion" = m."storageProfileVersion"
     WHERE m."manifestVersion" = p_manifest_version;
    IF v_backend IS NULL THEN
        RAISE EXCEPTION 'M7_CONTROL_PLANE: manifest not registered, or digest does not match its version'
            USING ERRCODE = '55000';
    END IF;
    -- LG-4, in order
    SELECT * INTO v_be FROM m7.m7_storage_backend WHERE "backendSha256" = v_backend FOR SHARE;         -- class 10
    SELECT p.* INTO v_p
      FROM m7.m7_storage_profile p
      JOIN m7.m7_control_plane_manifest m ON m."storageProfileVersion" = p."storageProfileVersion"
     WHERE m."manifestVersion" = p_manifest_version
       FOR SHARE OF p;                                                                                 -- profile
    SELECT pol.* INTO v_pol
      FROM m7.m7_retention_policy pol
      JOIN m7.m7_control_plane_manifest m ON m."retentionPolicyVersion" = pol."policyVersion"
     WHERE m."manifestVersion" = p_manifest_version
       FOR SHARE OF pol;                                                                               -- policy
    SELECT * INTO v_m FROM m7.m7_control_plane_manifest WHERE "manifestVersion" = p_manifest_version FOR SHARE;  -- manifest
    IF v_m."manifestVersion" IS NULL OR v_m."manifestSha256" <> p_manifest_sha256 THEN
        RAISE EXCEPTION 'M7_CONTROL_PLANE: manifest not registered, or digest does not match its version'
            USING ERRCODE = '55000';
    END IF;
    IF v_p."id" IS NULL OR v_p."retiredAt" IS NOT NULL OR v_be."backendSha256" IS NULL OR v_be."retiredAt" IS NOT NULL THEN
        -- rollback may not resurrect a retired storage identity
        RAISE EXCEPTION 'M7_STORAGE_ROUTING_MISMATCH: manifest storage profile or backend is retired'
            USING ERRCODE = 'M7011';
    END IF;
    -- XF-DL-1: G + W + Lambda <= workerLease. This relation spans the policy (G, Lambda, workerLease)
    -- and the backend (W), so it cannot be a CHECK. Activation is the one place that binds exactly one
    -- of each, and it refuses rather than issuing fences that could outlive their leases.
    IF v_pol."policyVersion" IS NULL
       OR (v_pol."generationWriteGrantTtl" + v_be."providerWriteCompletionWindow"
           + v_pol."writeFenceSkewAllowance") > v_pol."workerLease" THEN
        RAISE EXCEPTION 'M7_GENERATION_NOT_FENCED: policy % and backend % violate XF-DL-1 (G + W + skew > workerLease)',
            v_m."retentionPolicyVersion", v_be."backendSha256" USING ERRCODE = 'M7012';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM m7.m7_expected_function f WHERE f."manifestVersion" = p_manifest_version) THEN
        RAISE EXCEPTION 'M7_CONTROL_PLANE: catalog expectation set not loaded for manifest %', p_manifest_version
            USING ERRCODE = '55000';
    END IF;
    -- installation (last element of LG-4). If this statement waited on a concurrent activation that then
    -- committed, READ COMMITTED re-evaluates "retiredAt IS NULL" on the new row version and returns no row,
    -- while the other activation's new row is invisible to this statement (PG-3). That is detected and
    -- refused rather than producing a second active installation.
    SELECT * INTO v_cur FROM m7.m7_control_plane_installation WHERE "retiredAt" IS NULL FOR NO KEY UPDATE;
    IF v_cur."id" IS NULL AND EXISTS (SELECT 1 FROM m7.m7_control_plane_installation) THEN
        RAISE EXCEPTION 'M7_CONTROL_PLANE: concurrent activation; no installation is active after waiting'
            USING ERRCODE = '55000';
    END IF;
    v_now := pg_catalog.clock_timestamp();
    SELECT COALESCE(pg_catalog.max("installationSeq"), 0) + 1 INTO v_seq FROM m7.m7_control_plane_installation;
    UPDATE m7.m7_control_plane_installation SET "retiredAt" = v_now, "retiredBy" = session_user
     WHERE "id" = v_cur."id";
    INSERT INTO m7.m7_control_plane_installation
        ("id","installationSeq","manifestVersion","installedAt","installedBy","retiredAt","retiredBy","generationPath")
    VALUES (v_id, v_seq, p_manifest_version, v_now, session_user, NULL, NULL, 'M7_CONTROL_PLANE_INSTALL_V1');
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
    RETURN v_id;
END
$fn$;

-- Loads the manifest's expected catalog state (§19.5). Arrays are parallel; the rotation script
-- emits them from the reviewed manifest, and §19.13 compares them with pg_catalog by symmetric difference.
CREATE FUNCTION m7.c_load_catalog_expectations_v1(
    p_manifest_version text,
    p_relation_names name[], p_relation_kinds "char"[],
    p_object_relations name[], p_object_kinds m7."M7CatalogObjectKind"[], p_object_names name[], p_object_unique boolean[],
    p_function_signatures text[], p_function_definer boolean[], p_function_proconfig text[], p_function_source_sha256 text[],
    p_grant_signatures text[], p_grant_roles name[],
    p_role_names name[], p_role_can_login boolean[], p_role_inherits boolean[], p_role_schema_usage boolean[],
    p_member_roles name[], p_member_names name[]) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v_n integer := 0;
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', 'M7_CONTROL_PLANE_INSTALL_V1', true);
    -- RC-23 / LG-4: serialize loads of one manifest with each other and with its activation (which takes
    -- the same row FOR SHARE), so no activation ever sees a half-loaded expectation set and two loads with
    -- differently ordered arrays cannot interleave their inserts.
    PERFORM 1 FROM m7.m7_control_plane_manifest WHERE "manifestVersion" = p_manifest_version FOR NO KEY UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'M7_CONTROL_PLANE: expectations for an unregistered manifest' USING ERRCODE = '55000';
    END IF;
    IF EXISTS (SELECT 1 FROM m7.m7_expected_relation WHERE "manifestVersion" = p_manifest_version) THEN
        PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
        RETURN 0;                                                    -- already loaded; immutable
    END IF;
    INSERT INTO m7.m7_expected_relation ("manifestVersion","relationName","relKind")
        SELECT p_manifest_version, a, b FROM pg_catalog.unnest(p_relation_names, p_relation_kinds) AS t(a,b);
    GET DIAGNOSTICS v_n = ROW_COUNT;
    INSERT INTO m7.m7_expected_relation_object ("manifestVersion","relationName","objectKind","objectName","isUnique")
        SELECT p_manifest_version, a, b, c, d
          FROM pg_catalog.unnest(p_object_relations, p_object_kinds, p_object_names, p_object_unique) AS t(a,b,c,d);
    INSERT INTO m7.m7_expected_function ("manifestVersion","functionSignature","isSecurityDefiner","proconfigText","sourceSha256")
        SELECT p_manifest_version, a, b, c, d
          FROM pg_catalog.unnest(p_function_signatures, p_function_definer, p_function_proconfig,
                                 p_function_source_sha256) AS t(a,b,c,d);
    INSERT INTO m7.m7_expected_function_grant ("manifestVersion","functionSignature","granteeRole")
        SELECT p_manifest_version, a, b FROM pg_catalog.unnest(p_grant_signatures, p_grant_roles) AS t(a,b);
    INSERT INTO m7.m7_expected_role ("manifestVersion","roleName","canLogin","inheritsPrivileges","hasSchemaUsage")
        SELECT p_manifest_version, a, b, c, d
          FROM pg_catalog.unnest(p_role_names, p_role_can_login, p_role_inherits, p_role_schema_usage) AS t(a,b,c,d);
    INSERT INTO m7.m7_expected_role_member ("manifestVersion","roleName","memberName")
        SELECT p_manifest_version, a, b FROM pg_catalog.unnest(p_member_roles, p_member_names) AS t(a,b);
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
    RETURN v_n;
END
$fn$;

CREATE FUNCTION m7.i_ts(p_ts timestamptz) RETURNS text
    LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
BEGIN
    RETURN pg_catalog.to_char(p_ts AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"');
END
$fn$;

CREATE FUNCTION m7.i_request_hash(p_material jsonb) RETURNS text
    LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
BEGIN
    RETURN 'sha256:' || pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p_material::text, 'UTF8')), 'hex');
END
$fn$;

-- The single active installation, proved against the caller's expected manifest digest.
-- The digest lives on the MANIFEST (immutable identity); the installation is only the event.
CREATE FUNCTION m7.i_assert_control_plane(p_manifest_sha256 text) RETURNS m7.m7_control_plane_installation
    LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v m7.m7_control_plane_installation; v_digest text; r record;
BEGIN
    SELECT i AS inst, m."manifestSha256" AS digest INTO r
      FROM m7.m7_control_plane_installation i
      JOIN m7.m7_control_plane_manifest m ON m."manifestVersion" = i."manifestVersion"
     WHERE i."retiredAt" IS NULL;
    v := r.inst;
    v_digest := r.digest;
    IF v."id" IS NULL OR p_manifest_sha256 IS NULL OR v_digest <> p_manifest_sha256 THEN
        RAISE EXCEPTION 'M7_CONTROL_PLANE_MISMATCH' USING ERRCODE = '55000';
    END IF;
    RETURN v;
END
$fn$;

CREATE FUNCTION m7.i_manifest(p_installation m7.m7_control_plane_installation)
    RETURNS m7.m7_control_plane_manifest
    LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v m7.m7_control_plane_manifest;
BEGIN
    SELECT * INTO STRICT v FROM m7.m7_control_plane_manifest
     WHERE "manifestVersion" = p_installation."manifestVersion";
    RETURN v;
END
$fn$;

CREATE FUNCTION m7.i_policy(p_manifest m7.m7_control_plane_manifest) RETURNS m7.m7_retention_policy
    LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v m7.m7_retention_policy;
BEGIN
    SELECT * INTO STRICT v FROM m7.m7_retention_policy WHERE "policyVersion" = p_manifest."retentionPolicyVersion";
    RETURN v;
END
$fn$;

-- SI-2: the profile a NEW upload intent must bind. Live-checked.
CREATE FUNCTION m7.i_active_storage_profile(p_manifest m7.m7_control_plane_manifest) RETURNS m7.m7_storage_profile
    LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v m7.m7_storage_profile;
BEGIN
    SELECT * INTO v FROM m7.m7_storage_profile
     WHERE "storageProfileVersion" = p_manifest."storageProfileVersion" AND "retiredAt" IS NULL;
    IF v."id" IS NULL THEN
        RAISE EXCEPTION 'M7_STORAGE_ROUTING_MISMATCH: active manifest names a retired or missing storage profile'
            USING ERRCODE = 'M7011';
    END IF;
    RETURN v;
END
$fn$;

-- SI-3: the profile under which an EXISTING object of backend p_backend may be addressed.
-- Credential rotation is transparent here; backend rotation is not, and must not be.
CREATE FUNCTION m7.i_require_routable_profile(p_backend_sha256 text) RETURNS m7.m7_storage_profile
    LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v m7.m7_storage_profile;
BEGIN
    SELECT * INTO v FROM m7.m7_storage_profile
     WHERE "backendSha256" = p_backend_sha256 AND "retiredAt" IS NULL
     ORDER BY "credentialGeneration" DESC, "registeredAt" DESC, "id"
     LIMIT 1;
    IF v."id" IS NULL THEN
        RAISE EXCEPTION 'M7_STORAGE_ROUTING_MISMATCH: no live storage profile for the bound backend'
            USING ERRCODE = 'M7011';
    END IF;
    RETURN v;
END
$fn$;

-- Assignment lock + ownership re-proof. First lock in every participant write, and the FIRST lock
-- of the two row-mechanism worker functions (LO-1). No other function may call it.
CREATE FUNCTION m7.i_lock_owned_assignment(p_assignment_id uuid, p_participant_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v_pid uuid;
BEGIN
    SELECT a."participantId" INTO v_pid FROM public.experiment_assignment a
     WHERE a."id" = p_assignment_id FOR UPDATE;
    IF v_pid IS NULL OR p_participant_id IS NULL OR v_pid <> p_participant_id THEN
        RAISE EXCEPTION 'M7_SESSION_INVALID' USING ERRCODE = '28000';
    END IF;
END
$fn$;

-- LO-1 exception path: lock the assignment row without a participant to prove ownership against.
CREATE FUNCTION m7.i_lock_assignment_for_row_mechanism(p_assignment_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v_pid uuid;
BEGIN
    SELECT a."participantId" INTO v_pid FROM public.experiment_assignment a
     WHERE a."id" = p_assignment_id FOR UPDATE;
    IF v_pid IS NULL THEN
        RAISE EXCEPTION 'M7_DELETION_PRECONDITION' USING ERRCODE = 'M7009';
    END IF;
    RETURN v_pid;
END
$fn$;

-- Session capability validation (§8.2). Second lock class.
CREATE FUNCTION m7.i_require_session(p_session_secret bytea, p_participant_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v_id uuid; v_pid uuid; v_exp timestamptz;
BEGIN
    IF p_session_secret IS NULL OR pg_catalog.octet_length(p_session_secret) <> 32 OR p_participant_id IS NULL THEN
        RAISE EXCEPTION 'M7_SESSION_INVALID' USING ERRCODE = '28000';
    END IF;
    SELECT s."id", s."participantId", s."expiresAt" INTO v_id, v_pid, v_exp
      FROM m7.m7_participant_session s
     WHERE s."handleSha256" = pg_catalog.sha256(p_session_secret)
     FOR SHARE;
    IF v_id IS NULL OR v_pid <> p_participant_id OR v_exp <= pg_catalog.clock_timestamp()
       OR EXISTS (SELECT 1 FROM m7.m7_participant_session_revocation r WHERE r."sessionId" = v_id) THEN
        RAISE EXCEPTION 'M7_SESSION_INVALID' USING ERRCODE = '28000';
    END IF;
    RETURN v_id;
END
$fn$;

CREATE FUNCTION m7.i_binding_for_intent(p_purchase_intent_id uuid, p_assignment_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v uuid;
BEGIN
    SELECT b."id" INTO v
      FROM public.purchase_intent pi
      JOIN public.purchase_intent_capture_token tok ON tok."id" = pi."captureTokenId"
      JOIN public.purchase_intent_decision_request r ON r."intentId" = pi."id"
      JOIN public.purchase_intent_decision_binding b ON b."decisionRequestId" = r."id"
     WHERE pi."id" = p_purchase_intent_id AND tok."assignmentId" = p_assignment_id;
    IF v IS NULL THEN
        RAISE EXCEPTION 'M7_DECISION_NOT_AVAILABLE' USING ERRCODE = 'M7008';
    END IF;
    RETURN v;
END
$fn$;

CREATE FUNCTION m7.i_assignment_for_intent(p_purchase_intent_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v uuid;
BEGIN
    SELECT tok."assignmentId" INTO v
      FROM public.purchase_intent pi
      JOIN public.purchase_intent_capture_token tok ON tok."id" = pi."captureTokenId"
     WHERE pi."id" = p_purchase_intent_id;
    RETURN v;
END
$fn$;

-- A1 WITHDRAWN fact used ONLY as the RT-17 deletion/expiry trigger, never as collection authorization
-- (AC-06). Read without any locking clause: LO-2 permits this everywhere.
CREATE FUNCTION m7.i_withdrawal_event(p_assignment_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v uuid;
BEGIN
    SELECT ce."id" INTO v FROM public.study_consent_event ce
     WHERE ce."assignmentId" = p_assignment_id AND ce."action" = 'WITHDRAWN'
     ORDER BY ce."consentSeq" ASC LIMIT 1;
    RETURN v;
END
$fn$;

-- §9.5 RP-1: CALLER REQUEST MATERIAL ONLY. No control-plane selector is a parameter of either hash.
CREATE FUNCTION m7.i_outcome_request_hash(
    p_assignment_id uuid, p_purchase_intent_id uuid, p_client_capture_key text,
    p_assertion_kind m7."M7AssertionKind", p_supersedes_assertion_id uuid,
    p_status_label m7."M7OutcomeStatusLabel", p_occurrence m7."M7OccurrenceAssertion",
    p_merchant_kind m7."M7MerchantAssertionKind", p_merchant_ref text,
    p_event_time_kind m7."M7EventTimeAssertionKind", p_event_at timestamptz, p_event_lima_date date) RETURNS text
    LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
BEGIN
    RETURN m7.i_request_hash(pg_catalog.jsonb_build_array(
        'M7_OUTCOME_ASSERTION_RECORD_V1', p_assignment_id::text, p_purchase_intent_id::text, p_client_capture_key,
        p_assertion_kind::text, p_supersedes_assertion_id::text, p_status_label::text, p_occurrence::text,
        p_merchant_kind::text, p_merchant_ref, p_event_time_kind::text,
        m7.i_ts(p_event_at), p_event_lima_date::text));
END
$fn$;

CREATE FUNCTION m7.i_evidence_request_hash(
    p_assignment_id uuid, p_upload_intent_id uuid, p_client_capture_key text, p_supersedes_evidence_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
BEGIN
    RETURN m7.i_request_hash(pg_catalog.jsonb_build_array(
        'M7_EVIDENCE_SUBMISSION_V1', p_assignment_id::text, p_upload_intent_id::text, p_client_capture_key,
        p_supersedes_evidence_id::text));
END
$fn$;

-- Content digests recomputed by PostgreSQL (R-B-14 principle), used to refuse identity reuse
-- with different content (§23.8).
-- XF-10: providerWriteCompletionWindow is inside the digest, so lowering it is a NEW backend and
-- cannot retroactively shorten a fence any existing absence proof was taken against.
CREATE FUNCTION m7.i_backend_digest(
    p_provider_class m7."M7StorageProviderClass", p_container_id text, p_region_id text,
    p_endpoint_identity text, p_staging_prefix text, p_evidence_prefix text,
    p_write_completion_window interval) RETURNS text
    LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
BEGIN
    RETURN m7.i_request_hash(pg_catalog.jsonb_build_array(
        'M7_STORAGE_BACKEND_V1', p_provider_class::text, p_container_id, p_region_id,
        p_endpoint_identity, p_staging_prefix, p_evidence_prefix,
        pg_catalog.extract('epoch', p_write_completion_window)::text));
END
$fn$;

CREATE FUNCTION m7.i_profile_digest(
    p_storage_profile_version text, p_backend_sha256 text, p_credential_profile_id text,
    p_credential_generation integer, p_upload_transport m7."M7UploadTransport",
    p_decoder_generation text, p_encoder_generation text, p_storage_capability_version text,
    p_conditional_create_mode m7."M7ConditionalCreateMode",
    p_write_capability_mode m7."M7WriteCapabilityMode",
    p_envelope_enforcement m7."M7EnvelopeEnforcement") RETURNS text
    LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
BEGIN
    RETURN m7.i_request_hash(pg_catalog.jsonb_build_array(
        'M7_STORAGE_PROFILE_V1', p_storage_profile_version, p_backend_sha256, p_credential_profile_id,
        p_credential_generation::text, p_upload_transport::text, p_decoder_generation, p_encoder_generation,
        p_storage_capability_version, p_conditional_create_mode::text, p_write_capability_mode::text,
        p_envelope_enforcement::text));
END
$fn$;

CREATE FUNCTION m7.i_policy_digest(p_policy m7.m7_retention_policy) RETURNS text
    LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
BEGIN
    RETURN m7.i_request_hash(pg_catalog.jsonb_build_array(
        'M7_RETENTION_POLICY_V1', p_policy."policyVersion",
        p_policy."rawDeleteHardDeadlineWithdrawal"::text, p_policy."rawDeleteHardDeadlineNeverVerified"::text,
        p_policy."authorizedDeletionHardDeadline"::text, p_policy."rawDeleteScheduleAfterWithdrawal"::text,
        p_policy."rawDeleteScheduleAfterNeverVerified"::text, p_policy."authorizedDeletionScheduleAfter"::text,
        p_policy."schedulerWorstCaseLag"::text, p_policy."effectCompletionBudget"::text,
        p_policy."uploadUrlTtl"::text, p_policy."finalizeWindow"::text, p_policy."workerLease"::text,
        p_policy."sessionTtl"::text, p_policy."captureSkewTolerance"::text, p_policy."orphanGrace"::text,
        p_policy."outboxBackoffCap"::text, p_policy."outboxMaxAttempts"::text,
        p_policy."maxUploadBytes"::text, p_policy."maxPixels"::text,
        p_policy."canonicalMediaType", p_policy."mediaPolicyVersion"));
END
$fn$;

CREATE FUNCTION m7.i_vocabulary_entries_digest(p_vocabulary_version text) RETURNS text
    LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v text;
BEGIN
    SELECT 'sha256:' || pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
               pg_catalog.string_agg(e."merchantRef", E'\n' ORDER BY e."merchantRef" COLLATE "C"), 'UTF8')), 'hex')
      INTO v FROM m7.m7_merchant_vocabulary_entry e WHERE e."vocabularyVersion" = p_vocabulary_version;
    RETURN v;
END
$fn$;

CREATE FUNCTION m7.i_vocabulary_digest(p_vocabulary_version text, p_corpus_id text,
                                       p_entry_count integer, p_entries_sha256 text) RETURNS text
    LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
BEGIN
    RETURN m7.i_request_hash(pg_catalog.jsonb_build_array(
        'M7_MERCHANT_VOCABULARY_V1', p_vocabulary_version, p_corpus_id, p_entry_count::text, p_entries_sha256));
END
$fn$;

-- DL-4: the worst-case time the outbox may take, given its own retry schedule.
--   sum_{n=1..maxAttempts} min(2^n s, backoffCap) + maxAttempts * workerLease
CREATE FUNCTION m7.i_worst_case_retry_span(p_policy m7.m7_retention_policy) RETURNS interval
    LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v interval := INTERVAL '0'; n integer;
BEGIN
    FOR n IN 1 .. p_policy."outboxMaxAttempts" LOOP
        v := v + LEAST(pg_catalog.make_interval(secs => pg_catalog.power(2, n)::double precision),
                       p_policy."outboxBackoffCap");
    END LOOP;
    RETURN v + (p_policy."outboxMaxAttempts" * p_policy."workerLease");
END
$fn$;

-- SI-5 / XF-5. The write fence of an object, resolved from the KEY alone so that every enqueue path
-- (intent hygiene, generation sweep, artifact deletion, reconciliation) gets the same answer.
-- NULL means M7 never issued a capability for this key (an UNISSUED_KEY_OBJECT), so there is nothing
-- to fence; any other value is an instant before which no absence proof for that key is admissible.
CREATE FUNCTION m7.i_object_write_fence(p_backend_sha256 text, p_object_key text) RETURNS timestamptz
    LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v timestamptz;
BEGIN
    SELECT g."writeFenceAt" INTO v FROM m7.m7_canonical_generation g
     WHERE g."canonicalObjectKey" = p_object_key AND g."backendSha256" = p_backend_sha256;
    IF v IS NOT NULL THEN
        RETURN v;
    END IF;
    SELECT i."stagingWriteFenceAt" INTO v FROM m7.m7_evidence_upload_intent i
     WHERE i."stagingObjectKey" = p_object_key AND i."backendSha256" = p_backend_sha256;
    RETURN v;
END
$fn$;

-- DL-5. THE policy resolution for an outbox effect. Every timing and retry parameter of an effect's
-- execution is read from here, and from nowhere else. It deliberately takes no manifest argument, so
-- an implementation cannot accidentally pass the active one.
CREATE FUNCTION m7.i_outbox_bound_policy(p_outbox m7.m7_storage_outbox) RETURNS m7.m7_retention_policy
    LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v m7.m7_retention_policy;
BEGIN
    SELECT * INTO v FROM m7.m7_retention_policy WHERE "policyVersion" = p_outbox."boundPolicyVersion";
    IF v."policyVersion" IS NULL THEN
        -- unreachable while the FK stands; kept so a corrupted row fails closed rather than silently
        -- falling back to any other policy
        RAISE EXCEPTION 'M7_CONTROL_PLANE: outbox row has no resolvable bound policy' USING ERRCODE = '55000';
    END IF;
    RETURN v;
END
$fn$;

-- XF-15. The canonical digest of one generation's AUTHORIZATION ENVELOPE, computed from the grant's own
-- immutable columns and nothing else. It is what m7.x_mint_generation_capability_v1 records on every mint
-- and what t_capability_mint_coherence re-derives, so two mints of one grant are provably byte-identical
-- in their envelope (T-169) and a mint claiming a different envelope cannot be recorded at all.
-- NOTE: it deliberately does NOT cover capabilityMode or envelopeEnforcement. Those say HOW the envelope
-- is carried and enforced; the envelope itself is the four components of XF-GOAL.
CREATE FUNCTION m7.i_capability_envelope_digest(p_grant m7.m7_generation_write_grant) RETURNS text
    LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
BEGIN
    RETURN m7.i_request_hash(pg_catalog.jsonb_build_array(
        'M7_CAPABILITY_ENVELOPE_V1',
        p_grant."capabilityOperation"::text,
        p_grant."canonicalObjectKey",
        p_grant."backendSha256",
        m7.i_ts(p_grant."grantExpiresAt")));
END
$fn$;

-- §11.10.3 BL-2 / BL-6 / SD-12. THE backend liveness lock. Taken FOR SHARE in phase P2 by EXACTLY the
-- functions of §11.10.4 -- those that create a drain obligation (kind C) or mint external write authority
-- (kind M) -- and by nothing that only mutates or removes an obligation (NW-1 .. NW-6).
-- FOR SHARE is self-compatible, so concurrent normal operation is uncontended; it conflicts with the
-- FOR UPDATE both retirement functions take. The re-read of "retiredAt" AFTER acquiring the lock is
-- load-bearing (BL-6). Round 3's p_allow_retired parameter is REMOVED: its only caller was the purge, which
-- only removes obligations and therefore takes no liveness lock at all (NW-6).
CREATE FUNCTION m7.i_hold_backend_liveness(p_backend_sha256 text)
    RETURNS m7.m7_storage_backend
    LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v m7.m7_storage_backend;
BEGIN
    SELECT * INTO v FROM m7.m7_storage_backend
     WHERE "backendSha256" = p_backend_sha256 FOR SHARE;                          -- class 10
    IF v."backendSha256" IS NULL THEN
        RAISE EXCEPTION 'M7_STORAGE_ROUTING_MISMATCH: unknown storage backend' USING ERRCODE = 'M7011';
    END IF;
    IF v."retiredAt" IS NOT NULL THEN
        RAISE EXCEPTION 'M7_STORAGE_ROUTING_MISMATCH: backend % is retired; no new backend-scoped work may be created on it',
            p_backend_sha256 USING ERRCODE = 'M7011';
    END IF;
    RETURN v;
END
$fn$;

-- BL-4 / LG-3. THE only way to take liveness on more than one backend: de-duplicated and acquired one at a
-- time in ascending "backendSha256" COLLATE "C" order, so the order is a property of this helper and not
-- of each caller's query plan. Round 3's purge used PERFORM ... FROM (... ORDER BY 1), which does not fix
-- the order in which the function calls are evaluated.
CREATE FUNCTION m7.i_hold_backends_liveness(p_backends text[]) RETURNS integer
    LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v_b text; v_n integer := 0;
BEGIN
    FOR v_b IN
        SELECT DISTINCT u.b COLLATE "C" AS b
          FROM pg_catalog.unnest(p_backends) AS u(b)
         WHERE u.b IS NOT NULL
         ORDER BY 1
    LOOP
        PERFORM m7.i_hold_backend_liveness(v_b);
        v_n := v_n + 1;
    END LOOP;
    RETURN v_n;
END
$fn$;

-- XF-17. Signer routing WITHOUT a caller-selected credential. Called by m7.x_mint_generation_capability_v1
-- AFTER its class-10 FOR SHARE, so no concurrent retirement can retire the profile it returns (retirement
-- needs class-10 FOR UPDATE). Returns the generation's executing profile if it is still live; otherwise the
-- live profile over the SAME backend with the SAME capability kind, newest credential first; otherwise an
-- all-NULL row, on which the caller refuses. The envelope is not an input to the choice and is not changed
-- by it; a credential rotation changes which credential signs, never what is authorized.
CREATE FUNCTION m7.i_signing_profile(p_grant m7.m7_generation_write_grant) RETURNS m7.m7_storage_profile
    LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v m7.m7_storage_profile;
BEGIN
    SELECT p.* INTO v
      FROM m7.m7_canonical_generation g
      JOIN m7.m7_storage_profile p ON p."id" = g."executingProfileId"
     WHERE g."uploadIntentId" = p_grant."uploadIntentId" AND g."leaseEpoch" = p_grant."leaseEpoch"
       AND p."retiredAt" IS NULL
       AND p."backendSha256" = p_grant."backendSha256"
       AND p."writeCapabilityMode" = p_grant."capabilityMode"
       AND p."envelopeEnforcement" = p_grant."envelopeEnforcement";
    IF v."id" IS NOT NULL THEN
        RETURN v;
    END IF;
    SELECT p.* INTO v
      FROM m7.m7_storage_profile p
     WHERE p."backendSha256" = p_grant."backendSha256" AND p."retiredAt" IS NULL
       AND p."writeCapabilityMode" = p_grant."capabilityMode"
       AND p."envelopeEnforcement" = p_grant."envelopeEnforcement"
     ORDER BY p."credentialGeneration" DESC, p."registeredAt" DESC, p."id"
     LIMIT 1;
    RETURN v;
END
$fn$;

-- §11.9. THE definition of "this backend is drained". Returns NULL when drained, else a reason
-- naming the blocking class and its row count. Called by BOTH retirement functions; there is no
-- second definition anywhere in this specification.
CREATE FUNCTION m7.i_backend_is_drained(p_backend_sha256 text) RETURNS text
    LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v_n bigint; v_now timestamptz := pg_catalog.clock_timestamp();
BEGIN
    -- class 1 : live raw evidence
    SELECT pg_catalog.count(*) INTO v_n FROM m7.m7_evidence_artifact a
     WHERE a."backendSha256" = p_backend_sha256 AND a."state" <> 'DELETED';
    IF v_n > 0 THEN RETURN 'CLASS_1_LIVE_ARTIFACTS=' || v_n::text; END IF;
    -- class 2 : capabilities that may still be exercised
    SELECT pg_catalog.count(*) INTO v_n FROM m7.m7_evidence_upload_intent i
     WHERE i."backendSha256" = p_backend_sha256 AND i."state" IN ('ISSUED','PROCESSING','VALIDATED');
    IF v_n > 0 THEN RETURN 'CLASS_2_OPEN_INTENTS=' || v_n::text; END IF;
    -- class 3 : irreversible effects not yet evidenced as complete (PENDING, LEASED, FAILED_PERMANENT)
    SELECT pg_catalog.count(*) INTO v_n FROM m7.m7_storage_outbox ob
     WHERE ob."backendSha256" = p_backend_sha256 AND ob."state" <> 'CONFIRMED';
    IF v_n > 0 THEN RETURN 'CLASS_3_OPEN_EFFECTS=' || v_n::text; END IF;
    -- class 4 : XF-7 canonical write quiescence
    SELECT pg_catalog.count(*) INTO v_n FROM m7.m7_canonical_generation g
     WHERE g."backendSha256" = p_backend_sha256 AND g."writeFenceAt" > v_now;
    IF v_n > 0 THEN RETURN 'CLASS_4_UNFENCED_GENERATIONS=' || v_n::text; END IF;
    -- class 5 : XF-7 staging write quiescence
    SELECT pg_catalog.count(*) INTO v_n FROM m7.m7_evidence_upload_intent i
     WHERE i."backendSha256" = p_backend_sha256 AND i."stagingWriteFenceAt" > v_now;
    IF v_n > 0 THEN RETURN 'CLASS_5_UNFENCED_STAGING=' || v_n::text; END IF;
    -- class 6 : every canonical key M7 wrote here must have an EVIDENCED absence
    SELECT pg_catalog.count(*) INTO v_n FROM m7.m7_canonical_generation g
     WHERE g."backendSha256" = p_backend_sha256
       AND NOT EXISTS (SELECT 1 FROM m7.m7_storage_outbox ob
                        WHERE ob."effectKind" = 'DELETE_OBJECT' AND ob."state" = 'CONFIRMED'
                          AND ob."backendSha256" = g."backendSha256"
                          AND ob."objectKey" = g."canonicalObjectKey");
    IF v_n > 0 THEN RETURN 'CLASS_6_UNEVIDENCED_CANONICAL_KEYS=' || v_n::text; END IF;
    -- NOTE (BL-5): this function contains NO locking clause of any kind, by design. See 11.10.5: it is
    -- what keeps the retirement side from ever waiting on a class 1-9 lock, and therefore what makes the
    -- liveness protocol deadlock-free. T-180 asserts it at source level.
    -- NOTE (XF-14, Corollary 3): capability mints need no class of their own. A mint requires
    -- now < grantExpiresAt < writeFenceAt, so class 4 is already blocking whenever one is possible.
    -- class 7 : the same for every staging key
    SELECT pg_catalog.count(*) INTO v_n FROM m7.m7_evidence_upload_intent i
     WHERE i."backendSha256" = p_backend_sha256
       AND NOT EXISTS (SELECT 1 FROM m7.m7_storage_outbox ob
                        WHERE ob."effectKind" = 'DELETE_OBJECT' AND ob."state" = 'CONFIRMED'
                          AND ob."backendSha256" = i."backendSha256"
                          AND ob."objectKey" = i."stagingObjectKey");
    IF v_n > 0 THEN RETURN 'CLASS_7_UNEVIDENCED_STAGING_KEYS=' || v_n::text; END IF;
    RETURN NULL;
END
$fn$;

-- DL-8. Assert an SLA-failure fact idempotently. Never deletes, never downgrades.
CREATE FUNCTION m7.i_record_sla_failure(p_execution_id uuid, p_kind m7."M7SlaFailureKind") RETURNS void
    LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE v_pol text;
BEGIN
    IF p_execution_id IS NULL THEN
        RETURN;
    END IF;
    SELECT e."deadlinePolicyVersion" INTO v_pol FROM m7.m7_deletion_execution e WHERE e."id" = p_execution_id;
    INSERT INTO m7.m7_deletion_sla_failure
        ("id","executionId","failureKind","boundPolicyVersion","observedAt","observedBy","generationPath")
    VALUES (pg_catalog.gen_random_uuid(), p_execution_id, p_kind, v_pol, pg_catalog.clock_timestamp(),
            session_user, pg_catalog.current_setting('pagamenos.m7.write_path', true))
    ON CONFLICT ("executionId", "failureKind") DO NOTHING;
END
$fn$;

-- Enqueue (or reuse) an open DELETE_OBJECT effect, ROUTED to one immutable backend (SI-1).
CREATE FUNCTION m7.i_enqueue_delete(
    p_zone m7."M7ObjectZone", p_backend_sha256 text, p_enqueued_profile_id uuid, p_object_key text,
    p_not_before timestamptz, p_execution_id uuid, p_upload_intent_id uuid,
    p_generation_lease_epoch bigint, p_finding_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE
    v_id  uuid := pg_catalog.gen_random_uuid();
    v_now timestamptz := pg_catalog.clock_timestamp();
    v_got uuid;
    v_fence timestamptz;
    v_binding m7."M7OutboxPolicyBinding";
    v_policy text;
BEGIN
    -- WC-11 / BL-2: FAIL-SAFE re-acquisition of class 10. A PENDING effect is a kind-C write (drain class 3),
    -- and every caller (WC-5 .. WC-10) has ALREADY taken this lock in its phase P2, before its first write
    -- (LG-1); re-requesting a held FOR SHARE is a no-op (PG-2). The call stays so that a future caller that
    -- forgets P2 still cannot create an unserialized obligation -- and T-181 rejects that caller anyway.
    PERFORM m7.i_hold_backend_liveness(p_backend_sha256);
    -- DL-5: the bound policy is derived HERE, from the effect's own family, so no caller can choose it
    -- and no caller can pass the active manifest's. t_outbox_coherence and three composite foreign
    -- keys re-verify the result.
    IF p_execution_id IS NOT NULL THEN
        v_binding := 'DELETION_EXECUTION';
        SELECT e."deadlinePolicyVersion" INTO v_policy FROM m7.m7_deletion_execution e WHERE e."id" = p_execution_id;
    ELSIF p_upload_intent_id IS NOT NULL THEN
        v_binding := 'UPLOAD_INTENT';
        SELECT i."retentionPolicyVersion" INTO v_policy FROM m7.m7_evidence_upload_intent i
         WHERE i."id" = p_upload_intent_id;
    ELSE
        v_binding := 'RECONCILIATION_RUN';
        SELECT f."boundPolicyVersion" INTO v_policy FROM m7.m7_reconciliation_finding f WHERE f."id" = p_finding_id;
    END IF;
    -- XF-5: an effect is never schedulable before its target object's write fence. Raising it here
    -- means a caller cannot produce an early absence proof even by passing a wrong p_not_before.
    v_fence := m7.i_object_write_fence(p_backend_sha256, p_object_key);
    INSERT INTO m7.m7_storage_outbox
        ("id","effectKind","zone","backendSha256","enqueuedProfileId","boundPolicyVersion","policyBinding",
         "objectKey","deletionExecutionId",
         "uploadIntentId","generationLeaseEpoch","reconciliationFindingId","state","stateVersion","attempts",
         "attemptBudgetBase","notBefore","nextAttemptAt","leaseOwner","leaseEpoch","leaseExpiresAt",
         "createdAt","updatedAt","confirmedAt","generationPath")
    VALUES (v_id, 'DELETE_OBJECT', p_zone, p_backend_sha256, p_enqueued_profile_id, v_policy, v_binding,
            p_object_key, p_execution_id,
            p_upload_intent_id, p_generation_lease_epoch, p_finding_id, 'PENDING', 1, 0, 0,
            GREATEST(p_not_before, v_now, COALESCE(v_fence, '-infinity'::timestamptz)), v_now, NULL, 0, NULL,
            v_now, v_now, NULL,
            pg_catalog.current_setting('pagamenos.m7.write_path', true))
    ON CONFLICT ("effectKind", "backendSha256", "objectKey") WHERE "state" IN ('PENDING','LEASED') DO NOTHING
    RETURNING "id" INTO v_got;
    IF v_got IS NOT NULL THEN
        RETURN v_got;
    END IF;
    IF p_execution_id IS NOT NULL THEN
        RAISE EXCEPTION 'M7_OPEN_EFFECT_EXISTS' USING ERRCODE = 'M7010';
    END IF;
    SELECT ob."id" INTO STRICT v_got FROM m7.m7_storage_outbox ob
     WHERE ob."effectKind" = 'DELETE_OBJECT' AND ob."backendSha256" = p_backend_sha256
       AND ob."objectKey" = p_object_key AND ob."state" IN ('PENDING','LEASED');
    RETURN v_got;
END
$fn$;

-- GF-7: enqueue deletes for every generation of an intent that is neither accepted nor live.
CREATE FUNCTION m7.i_enqueue_superseded_generations(
    p_intent m7.m7_evidence_upload_intent, p_not_before timestamptz, p_include_accepted boolean) RETURNS integer
    LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE g m7.m7_canonical_generation; v_n integer := 0;
BEGIN
    FOR g IN SELECT * FROM m7.m7_canonical_generation
              WHERE "uploadIntentId" = p_intent."id" ORDER BY "leaseEpoch"
    LOOP
        CONTINUE WHEN (NOT p_include_accepted)
                  AND p_intent."acceptedLeaseEpoch" IS NOT NULL
                  AND g."leaseEpoch" = p_intent."acceptedLeaseEpoch";
        CONTINUE WHEN p_intent."state" = 'PROCESSING' AND g."leaseEpoch" = p_intent."leaseEpoch";
        -- XF-5: never before this generation's own fence. i_enqueue_delete raises it anyway; passing
        -- it explicitly keeps the intent of the caller visible.
        PERFORM m7.i_enqueue_delete('CANONICAL', g."backendSha256", g."executingProfileId", g."canonicalObjectKey",
                                    GREATEST(p_not_before, g."writeFenceAt"), NULL, p_intent."id",
                                    g."leaseEpoch", NULL);
        v_n := v_n + 1;
    END LOOP;
    RETURN v_n;
END
$fn$;

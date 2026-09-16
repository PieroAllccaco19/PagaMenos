-- XF-2 / XF-11 / XF-12 / XF-14 / XF-15 / XF-16 / XF-17. THE ONLY function in schema m7 that returns a
-- capability envelope, and the only member of the x_* family. Transaction owner TO-8 (§16.2.3).
--
-- WHAT IT DELIBERATELY DOES NOT ACCEPT: an object key, a key prefix, a backendSha256, an expiry, an
-- interval, an operation, a storage profile or a credential identifier. There is no
-- mintCapability(key, validUntil) here or anywhere else (SD-13). The caller holds an OPAQUE grant id and
-- nothing else, so there is no envelope component and no signing authority it could vary.
--
-- LOCK PROFILE (§16.2.6, M7V11R4-AUD-02): P1 intent FOR UPDATE (class 4) -> P2 backend FOR SHARE (class 10)
-- -> P3 the mint INSERT. Round 3 took class 10 BEFORE class 4.
--
-- CLOCK (XF-14, M7V11R4-AUD-04): the refusal instant is read AFTER both blocking locks. Round 3 read it
-- before them, so a call could start before grantExpiresAt, wait across it and mint on the stale instant.
--
-- WHAT IT RETURNS: exactly the four envelope components of XF-GOAL, resolved from immutable rows, plus the
-- capability mode, the envelope digest, the mint sequence and the SIGNING profile's identity (XF-17). No
-- secret is read, written or returned. The signer MUST commit before signing (XF-16).
CREATE FUNCTION m7.x_mint_generation_capability_v1(p_manifest_sha256 text, p_generation_grant_id uuid)
    RETURNS TABLE (capability_operation m7."M7CapabilityOperation", canonical_object_key text,
                   backend_sha256 text, valid_until text,
                   capability_mode m7."M7WriteCapabilityMode",
                   envelope_enforcement m7."M7EnvelopeEnforcement",
                   envelope_sha256 text, mint_seq integer,
                   signing_profile_version text, signing_credential_profile_id text)
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'
AS $fn$
DECLARE
    v_gr m7.m7_generation_write_grant; v_i m7.m7_evidence_upload_intent; v_sp m7.m7_storage_profile;
    v_now timestamptz; v_seq integer; v_digest text;
BEGIN
    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', 'M7_CAPABILITY_MINT_V1', true);
    PERFORM m7.i_assert_control_plane(p_manifest_sha256);                                  -- SD-7

    -- resolution read of an immutable row; no lock
    SELECT * INTO v_gr FROM m7.m7_generation_write_grant WHERE "id" = p_generation_grant_id;
    IF v_gr."id" IS NULL THEN
        -- indistinguishable from every other refusal on purpose: an unknown id must not be an oracle
        RAISE EXCEPTION 'M7_CAPABILITY_REFUSED' USING ERRCODE = 'M7013';
    END IF;

    -- P1, class 4. Serializes this mint against the claim, reclaim, observation, release, rejection and
    -- expiry of the same intent, and against other mints of the same grant (consecutive mintSeq).
    SELECT * INTO v_i FROM m7.m7_evidence_upload_intent WHERE "id" = v_gr."uploadIntentId" FOR UPDATE;

    -- P2, class 10. WC-3 / BL-2 kind M: minting is the creation of external write authority on this
    -- backend. A retired backend is refused with the same M7013 as every other refusal.
    BEGIN
        PERFORM m7.i_hold_backend_liveness(v_gr."backendSha256");
    EXCEPTION WHEN SQLSTATE 'M7011' THEN
        RAISE EXCEPTION 'M7_CAPABILITY_REFUSED' USING ERRCODE = 'M7013';
    END;

    -- XF-14: the authoritative instant, read AFTER every blocking lock and immediately before the predicate
    v_now := pg_catalog.clock_timestamp();
    IF v_i."id" IS NULL
       OR v_i."state" <> 'PROCESSING'
       OR v_i."leaseEpoch" <> v_gr."leaseEpoch"
       OR v_now >= v_gr."grantExpiresAt" THEN
        RAISE EXCEPTION 'M7_CAPABILITY_REFUSED' USING ERRCODE = 'M7013';
    END IF;

    -- XF-17: the signing authority, resolved by the database, after class 10, from immutable and locked
    -- facts only. Neither the worker nor the signer names it.
    v_sp := m7.i_signing_profile(v_gr);
    IF v_sp."id" IS NULL THEN
        RAISE EXCEPTION 'M7_CAPABILITY_REFUSED' USING ERRCODE = 'M7013';
    END IF;

    -- XF-15: every mint is evidenced, and a re-mint is visible rather than silent. The envelope digest is
    -- derived from the grant, so two mints of one grant are byte-identical in it (T-169) and a mint of a
    -- DIFFERENT envelope, generation or kind cannot be recorded: its tuple has no referent (23503).
    v_digest := m7.i_capability_envelope_digest(v_gr);
    SELECT COALESCE(pg_catalog.max(mm."mintSeq"), 0) + 1 INTO v_seq
      FROM m7.m7_generation_capability_mint mm WHERE mm."grantId" = v_gr."id";
    -- P3. "mintedAt" is supplied for completeness only: t_capability_mint_coherence replaces it with the
    -- trigger's own clock, and m7_generation_capability_mint_expiry_ck then compares THAT instant.
    INSERT INTO m7.m7_generation_capability_mint
        ("id","grantId","mintSeq","uploadIntentId","leaseEpoch","capabilityOperation","canonicalObjectKey",
         "backendSha256","grantExpiresAt","capabilityMode","envelopeEnforcement","signingProfileId",
         "envelopeSha256","mintedAt","mintedBy","generationPath")
    VALUES (pg_catalog.gen_random_uuid(), v_gr."id", v_seq, v_gr."uploadIntentId", v_gr."leaseEpoch",
            v_gr."capabilityOperation", v_gr."canonicalObjectKey", v_gr."backendSha256",
            v_gr."grantExpiresAt", v_gr."capabilityMode", v_gr."envelopeEnforcement", v_sp."id",
            v_digest, v_now, session_user, 'M7_CAPABILITY_MINT_V1');

    PERFORM pg_catalog.set_config('pagamenos.m7.write_path', '', true);
    RETURN QUERY SELECT v_gr."capabilityOperation", v_gr."canonicalObjectKey", v_gr."backendSha256",
                        m7.i_ts(v_gr."grantExpiresAt"), v_gr."capabilityMode",
                        v_gr."envelopeEnforcement", v_digest, v_seq,
                        v_sp."storageProfileVersion", v_sp."credentialProfileId";
END
$fn$;

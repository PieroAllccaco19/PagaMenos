CREATE TABLE m7.m7_evidence_upload_intent (
    "id"                     UUID           NOT NULL,
    "decisionBindingId"      UUID           NOT NULL,
    "assignmentId"           UUID           NOT NULL,
    "participantSessionId"   UUID           NOT NULL,
    "clientCorrelationNonce" TEXT           NOT NULL,
    -- immutable ISSUANCE identity (SI-2): chosen once, from the ACTIVE manifest, never re-resolved,
    -- and never mistaken for the profile that later EXECUTES anything (SI-4, §11.8)
    "issuanceProfileId"      UUID           NOT NULL,
    "backendSha256"          TEXT           NOT NULL,
    "stagingObjectKey"       TEXT           NOT NULL,
    "maxBytes"               INTEGER        NOT NULL,
    "mediaPolicyVersion"     TEXT           NOT NULL,
    "issuedAt"               TIMESTAMPTZ(6) NOT NULL,
    "uploadExpiresAt"        TIMESTAMPTZ(6) NOT NULL,
    "intentDeadlineAt"       TIMESTAMPTZ(6) NOT NULL,
    -- SI-5 / XF-5: uploadExpiresAt + backend.providerWriteCompletionWindow + policy.writeFenceSkewAllowance.
    -- No staging delete effect is executable before it.
    "stagingWriteFenceAt"    TIMESTAMPTZ(6) NOT NULL,
    "capturedAt"             TIMESTAMPTZ(6) NOT NULL,
    "retentionPolicyVersion" TEXT           NOT NULL,
    "installationId"         UUID           NOT NULL,
    "generationPath"         TEXT           NOT NULL,
    -- guarded mutable state (§12.1)
    "state"                  m7."M7UploadIntentState" NOT NULL,
    "stateVersion"           BIGINT         NOT NULL,
    "leaseOwner"             TEXT,
    "leaseEpoch"             BIGINT         NOT NULL,
    "leaseExpiresAt"         TIMESTAMPTZ(6),
    "acceptedLeaseEpoch"     BIGINT,
    "rejectionReason"        m7."M7ContentRejectionReason",
    "failureReason"          m7."M7TerminalFailureReason",
    "updatedAt"              TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT m7_evidence_upload_intent_pkey PRIMARY KEY ("id"),
    CONSTRAINT m7_evidence_upload_intent_nonce_key UNIQUE ("decisionBindingId", "clientCorrelationNonce"),
    CONSTRAINT m7_evidence_upload_intent_assignment_id_key UNIQUE ("assignmentId", "id"),
    -- lets children composite-FK "this row is on this backend" without a mutable join path (SI-1)
    CONSTRAINT m7_evidence_upload_intent_id_backend_key UNIQUE ("id", "backendSha256"),
    -- DL-5 UPLOAD_INTENT family: lets an outbox row composite-FK "this effect carries its intent's
    -- own bound policy", so the binding is a foreign key rather than a trigger opinion
    CONSTRAINT m7_evidence_upload_intent_id_policy_key UNIQUE ("id", "retentionPolicyVersion"),
    CONSTRAINT m7_evidence_upload_intent_staging_key UNIQUE ("stagingObjectKey"),
    CONSTRAINT m7_evidence_upload_intent_binding_fkey FOREIGN KEY ("decisionBindingId")
        REFERENCES public.purchase_intent_decision_binding ("id") ON DELETE RESTRICT,
    CONSTRAINT m7_evidence_upload_intent_assignment_fkey FOREIGN KEY ("assignmentId")
        REFERENCES public.experiment_assignment ("id") ON DELETE RESTRICT,
    CONSTRAINT m7_evidence_upload_intent_session_fkey FOREIGN KEY ("participantSessionId")
        REFERENCES m7.m7_participant_session ("id") ON DELETE RESTRICT,
    CONSTRAINT m7_evidence_upload_intent_profile_fkey FOREIGN KEY ("issuanceProfileId", "backendSha256")
        REFERENCES m7.m7_storage_profile ("id", "backendSha256") ON DELETE RESTRICT,
    CONSTRAINT m7_evidence_upload_intent_policy_fkey FOREIGN KEY ("retentionPolicyVersion")
        REFERENCES m7.m7_retention_policy ("policyVersion") ON DELETE RESTRICT,
    CONSTRAINT m7_evidence_upload_intent_installation_fkey FOREIGN KEY ("installationId")
        REFERENCES m7.m7_control_plane_installation ("id") ON DELETE RESTRICT,
    CONSTRAINT m7_evidence_upload_intent_nonce_ck CHECK ("clientCorrelationNonce" ~ '^[A-Za-z0-9_-]{22,128}$'),
    -- shape only; the PREFIX is verified against the bound backend by m7.t_upload_intent_coherence
    CONSTRAINT m7_evidence_upload_intent_staging_shape_ck CHECK (
        "stagingObjectKey" ~ ('/' || "id"::text || '/[0-9a-f]{32}$')
        AND pg_catalog.length("stagingObjectKey") BETWEEN 8 AND 1024),
    CONSTRAINT m7_evidence_upload_intent_bytes_ck CHECK ("maxBytes" BETWEEN 1024 AND 10485760),
    CONSTRAINT m7_evidence_upload_intent_media_ck CHECK ("mediaPolicyVersion" = 'pagamenos.m7.media.jpeg-png-webp.v1'),
    CONSTRAINT m7_evidence_upload_intent_window_ck CHECK (
        "uploadExpiresAt" > "issuedAt" AND ("uploadExpiresAt" - "issuedAt") <= INTERVAL '300 seconds'
        AND "intentDeadlineAt" > "uploadExpiresAt" AND ("intentDeadlineAt" - "uploadExpiresAt") <= INTERVAL '900 seconds'),
    -- XF-5 shape: the staging fence is strictly after the write window and bounded by W + Lambda.
    -- Its exact value is recomputed against the bound backend and policy by t_upload_intent_coherence.
    CONSTRAINT m7_evidence_upload_intent_staging_fence_ck CHECK (
        "stagingWriteFenceAt" > "uploadExpiresAt"
        AND ("stagingWriteFenceAt" - "uploadExpiresAt") <= INTERVAL '90 seconds'),
    CONSTRAINT m7_evidence_upload_intent_path_ck CHECK ("generationPath" = 'M7_BEGIN_EVIDENCE_UPLOAD_V1'),
    CONSTRAINT m7_evidence_upload_intent_version_ck CHECK ("stateVersion" >= 1 AND "leaseEpoch" >= 0),
    CONSTRAINT m7_evidence_upload_intent_lease_owner_ck CHECK ("leaseOwner" IS NULL OR "leaseOwner" ~ '^[A-Za-z0-9_.:-]{1,128}$'),
    CONSTRAINT m7_evidence_upload_intent_lease_ck CHECK (
        ("state" = 'PROCESSING') = ("leaseOwner" IS NOT NULL)
        AND ("leaseOwner" IS NULL) = ("leaseExpiresAt" IS NULL)),
    -- An accepted generation appears only at VALIDATED and is required while VALIDATED/CONSUMED.
    -- A terminal state MAY retain it, because U9 from VALIDATED must not erase which generation was
    -- accepted; it is never present before some epoch was validated (GF-5).
    CONSTRAINT m7_evidence_upload_intent_accepted_ck CHECK (
        (   ("state" IN ('ISSUED','PROCESSING')  AND "acceptedLeaseEpoch" IS NULL)
         OR ("state" IN ('VALIDATED','CONSUMED') AND "acceptedLeaseEpoch" IS NOT NULL)
         OR  "state" IN ('EXPIRED','REJECTED_CONTENT','TERMINAL_FAILURE'))
        AND ("acceptedLeaseEpoch" IS NULL OR ("acceptedLeaseEpoch" >= 1 AND "acceptedLeaseEpoch" <= "leaseEpoch"))),
    CONSTRAINT m7_evidence_upload_intent_reason_ck CHECK (
        ("state" = 'REJECTED_CONTENT') = ("rejectionReason" IS NOT NULL)
        AND ("state" = 'TERMINAL_FAILURE') = ("failureReason" IS NOT NULL))
);
CREATE INDEX m7_evidence_upload_intent_open_deadline_idx ON m7.m7_evidence_upload_intent ("intentDeadlineAt")
    WHERE "state" IN ('ISSUED','PROCESSING','VALIDATED');
CREATE INDEX m7_evidence_upload_intent_assignment_idx ON m7.m7_evidence_upload_intent ("assignmentId");
CREATE INDEX m7_evidence_upload_intent_backend_idx ON m7.m7_evidence_upload_intent ("backendSha256");

-- ---------------------------------------------------------------------------------------------
-- CANONICAL GENERATION — the external fence.  (closes M7V11-AUD-02)
-- One row per (intent, lease epoch); each owns ONE globally unique canonical object key.
-- A stale epoch can only ever create ITS OWN key, which no later epoch can observe or adopt.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE m7.m7_canonical_generation (
    "uploadIntentId"     UUID           NOT NULL,
    "leaseEpoch"         BIGINT         NOT NULL,
    "canonicalObjectKey" TEXT           NOT NULL,
    -- SI-4 / EP-1: the LIVE profile this generation is actually executed under. NOT the intent's
    -- issuance profile, and no constraint anywhere requires the two to be equal (EP-2).
    "executingProfileId" UUID           NOT NULL,
    "backendSha256"      TEXT           NOT NULL,
    "allocatedAt"        TIMESTAMPTZ(6) NOT NULL,
    -- SI-5 / XF-3: derived at allocation, immutable, and the basis of every absence proof for this key
    "grantExpiresAt"     TIMESTAMPTZ(6) NOT NULL,
    "writeFenceAt"       TIMESTAMPTZ(6) NOT NULL,
    "allocatedBy"        NAME           NOT NULL,
    "generationPath"     TEXT           NOT NULL,
    CONSTRAINT m7_canonical_generation_pkey PRIMARY KEY ("uploadIntentId", "leaseEpoch"),
    CONSTRAINT m7_canonical_generation_key_key UNIQUE ("canonicalObjectKey"),
    -- lets the outbox composite-FK (uploadIntentId, leaseEpoch, backendSha256)
    CONSTRAINT m7_canonical_generation_backend_key UNIQUE ("uploadIntentId", "leaseEpoch", "backendSha256"),
    -- EP-3 / EP-5: lets the observation and the artifact composite-FK the EXECUTING profile, so neither
    -- can name a profile this generation did not run under
    CONSTRAINT m7_canonical_generation_executing_key UNIQUE
        ("uploadIntentId", "leaseEpoch", "executingProfileId", "backendSha256"),
    -- XF-2: lets the write grant composite-FK the generation's own grant expiry, so a grant cannot
    -- claim a validity the fence was not computed from
    CONSTRAINT m7_canonical_generation_grant_key UNIQUE ("uploadIntentId", "leaseEpoch", "grantExpiresAt"),
    CONSTRAINT m7_canonical_generation_intent_fkey FOREIGN KEY ("uploadIntentId", "backendSha256")
        REFERENCES m7.m7_evidence_upload_intent ("id", "backendSha256") ON DELETE NO ACTION,
    CONSTRAINT m7_canonical_generation_profile_fkey FOREIGN KEY ("executingProfileId", "backendSha256")
        REFERENCES m7.m7_storage_profile ("id", "backendSha256") ON DELETE RESTRICT,
    CONSTRAINT m7_canonical_generation_epoch_ck CHECK ("leaseEpoch" >= 1),
    -- XF-3 shape: G >= 5s, and the fence strictly follows the grant expiry by W + Lambda (<= 90s).
    -- The exact values are recomputed from the bound policy and backend by t_generation_coherence.
    CONSTRAINT m7_canonical_generation_fence_ck CHECK (
        "grantExpiresAt" > "allocatedAt"
        AND ("grantExpiresAt" - "allocatedAt") >= INTERVAL '5 seconds'
        AND "writeFenceAt" > "grantExpiresAt"
        AND ("writeFenceAt" - "grantExpiresAt") <= INTERVAL '90 seconds'),
    -- shape only; the PREFIX is verified against the bound backend by m7.t_generation_coherence
    CONSTRAINT m7_canonical_generation_key_shape_ck CHECK (
        "canonicalObjectKey" ~ ('/' || "uploadIntentId"::text || '/g' || "leaseEpoch"::text || '/[0-9a-f]{32}$')
        AND pg_catalog.length("canonicalObjectKey") BETWEEN 8 AND 1024),
    CONSTRAINT m7_canonical_generation_path_ck CHECK ("generationPath" = 'M7_WORKER_UPLOAD_V1')
);
CREATE INDEX m7_canonical_generation_backend_idx ON m7.m7_canonical_generation ("backendSha256");
-- §11.9 class 4: "is any generation of this backend still writable?"
CREATE INDEX m7_canonical_generation_fence_idx ON m7.m7_canonical_generation ("backendSha256", "writeFenceAt");

-- ---------------------------------------------------------------------------------------------
-- GENERATION WRITE GRANT — the AUTHORIZATION ENVELOPE of one generation's canonical write.
-- (closes M7V11R2-AUD-01; re-derived for M7V11R3-AUD-01)
--
-- Exactly ONE ENVELOPE per generation, ever (XF-9), allocated in the claim and never alterable.
-- Read the scope of that claim carefully: this row does NOT and CANNOT establish that only one
-- physical capability was ever signed for this key -- the signature is produced outside PostgreSQL,
-- so no PRIMARY KEY here observes a second one (§11.7.0, the round-3 finding). What it establishes,
-- together with m7_generation_capability_mint's envelope FK, is that NOTHING M7 CAN MINT IS WIDER:
-- every capability M7 issues for this key names this operation, this key, this backend and this
-- absolute expiry, because a mint row naming anything else has no referent (23503, XF-11).
--
-- Records WHAT may be authorized, never the signature or token: there is deliberately no column that
-- could hold a secret (XF-8). "id" is the opaque generationGrantId handed to the worker.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE m7.m7_generation_write_grant (
    -- "id" is the generationGrantId: the ONLY thing a caller ever holds or passes (XF-12). It is opaque,
    -- and it is the single parameter of m7.x_mint_generation_capability_v1 beyond the control-plane digest.
    "id"                  UUID           NOT NULL,
    "uploadIntentId"      UUID           NOT NULL,
    "leaseEpoch"          BIGINT         NOT NULL,
    -- ---- the AUTHORIZATION ENVELOPE. Four components, immutable, never caller-supplied (XF-GOAL) ----
    "capabilityOperation" m7."M7CapabilityOperation" NOT NULL,   -- canonical create only
    "canonicalObjectKey"  TEXT           NOT NULL,               -- one exact key
    "backendSha256"       TEXT           NOT NULL,               -- one storage authority
    "grantExpiresAt"      TIMESTAMPTZ(6) NOT NULL,               -- one absolute validity end
    -- ---------------------------------------------------------------------------------------------
    "capabilityMode"      m7."M7WriteCapabilityMode" NOT NULL,
    "envelopeEnforcement" m7."M7EnvelopeEnforcement" NOT NULL,
    "allocatedAt"         TIMESTAMPTZ(6) NOT NULL,
    "allocatedBy"         NAME           NOT NULL,
    "generationPath"      TEXT           NOT NULL,
    CONSTRAINT m7_generation_write_grant_pkey PRIMARY KEY ("uploadIntentId", "leaseEpoch"),
    -- XF-9: one envelope per generation, addressable by one opaque id
    CONSTRAINT m7_generation_write_grant_id_key UNIQUE ("id"),
    CONSTRAINT m7_generation_write_grant_key_key UNIQUE ("canonicalObjectKey"),
    -- XF-11: the referenced side of the mint table's ONE provenance FK. Round 3 keyed this UNIQUE by
    -- (id + envelope) and proved (uploadIntentId, leaseEpoch) with a SECOND, separate FK, so nothing tied
    -- the two references to the same grant row (M7V11R4-AUD-05): an owner-class mint could combine grant
    -- A's id and envelope with grant B's generation. This UNIQUE now spans grant identity, generation
    -- identity, the four envelope components and the capability kind, so ONE referential edge proves
    -- all of them designate the same row. Any splice, a wider key, another key, another backend, another
    -- operation, a later absolute expiry or another kind has NO REFERENT and is 23503.
    CONSTRAINT m7_generation_write_grant_envelope_key UNIQUE
        ("id", "uploadIntentId", "leaseEpoch", "canonicalObjectKey", "backendSha256", "grantExpiresAt",
         "capabilityOperation", "capabilityMode", "envelopeEnforcement"),
    -- XF-2: the envelope's expiry must be the generation's own grantExpiresAt, so the fence the DB
    -- computed and the validity the provider enforces are the same instant by construction
    CONSTRAINT m7_generation_write_grant_generation_fkey
        FOREIGN KEY ("uploadIntentId", "leaseEpoch", "grantExpiresAt")
        REFERENCES m7.m7_canonical_generation ("uploadIntentId", "leaseEpoch", "grantExpiresAt") ON DELETE NO ACTION,
    -- and it must name that same generation's key
    CONSTRAINT m7_generation_write_grant_object_fkey FOREIGN KEY ("canonicalObjectKey")
        REFERENCES m7.m7_canonical_generation ("canonicalObjectKey") ON DELETE NO ACTION,
    -- and that same generation's backend: the envelope's backend component cannot drift from the
    -- generation's physical home (referenced UNIQUE already exists as _backend_key)
    CONSTRAINT m7_generation_write_grant_backend_fkey
        FOREIGN KEY ("uploadIntentId", "leaseEpoch", "backendSha256")
        REFERENCES m7.m7_canonical_generation ("uploadIntentId", "leaseEpoch", "backendSha256") ON DELETE NO ACTION,
    CONSTRAINT m7_generation_write_grant_epoch_ck CHECK ("leaseEpoch" >= 1),
    CONSTRAINT m7_generation_write_grant_mint_ck CHECK ("grantExpiresAt" > "allocatedAt"),
    CONSTRAINT m7_generation_write_grant_path_ck CHECK ("generationPath" = 'M7_WORKER_UPLOAD_V1')
);

-- ---------------------------------------------------------------------------------------------
-- GENERATION CAPABILITY MINT — the evidence leg of the sealed signer edge. (closes M7V11R3-AUD-01)
-- One append-only row per mint of one generation's envelope. It holds NO secret (XF-8): the envelope
-- it names is FK-bound, component by component, to the grant's own envelope, so a mint can never
-- record -- and therefore the signer can never be handed -- anything wider than the grant.
-- Re-minting is deliberately REPRESENTABLE and deliberately VISIBLE: mintSeq > 1 with an identical
-- envelopeSha256 is the safe case (XF-15, Corollary 4); a mint with a different envelope does not
-- exist, because the tuple has no referent.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE m7.m7_generation_capability_mint (
    "id"                  UUID           NOT NULL,
    "grantId"             UUID           NOT NULL,
    "mintSeq"             INTEGER        NOT NULL,
    "uploadIntentId"      UUID           NOT NULL,
    "leaseEpoch"          BIGINT         NOT NULL,
    -- the envelope AS MINTED. Every component is FK-bound to the grant's; none is caller-supplied.
    "capabilityOperation" m7."M7CapabilityOperation" NOT NULL,
    "canonicalObjectKey"  TEXT           NOT NULL,
    "backendSha256"       TEXT           NOT NULL,
    "grantExpiresAt"      TIMESTAMPTZ(6) NOT NULL,
    -- the capability KIND the envelope is carried as, FK-bound to the grant's and to the signing profile's
    "capabilityMode"      m7."M7WriteCapabilityMode" NOT NULL,
    "envelopeEnforcement" m7."M7EnvelopeEnforcement" NOT NULL,
    -- XF-17: the live profile whose signing credential signs THIS mint. Resolved by m7.i_signing_profile
    -- after the liveness lock; never supplied by the worker or the signer. Not part of the envelope digest.
    "signingProfileId"    UUID           NOT NULL,
    "envelopeSha256"      TEXT           NOT NULL,
    -- XF-14: stamped by t_capability_mint_coherence from the trigger's own clock; any supplied value is discarded
    "mintedAt"            TIMESTAMPTZ(6) NOT NULL,
    "mintedBy"            NAME           NOT NULL,
    "generationPath"      TEXT           NOT NULL,
    CONSTRAINT m7_generation_capability_mint_pkey PRIMARY KEY ("id"),
    -- XF-15: a monotone, gapless-per-grant mint sequence. Mints of one grant serialize on the intent lock
    -- (P1), so this UNIQUE is the backstop against an owner-class duplicate, not a concurrency mechanism.
    CONSTRAINT m7_generation_capability_mint_seq_key UNIQUE ("grantId", "mintSeq"),
    -- XF-11, THE load-bearing constraint, widened in round 4 (M7V11R4-AUD-05): grant identity, generation
    -- identity, the four envelope components and the capability kind in ONE foreign key, so all of them
    -- designate the SAME grant row. It subsumes round 3's separate m7_generation_capability_mint_generation_fkey,
    -- which is removed: two independent edges could each be satisfied by a different grant.
    CONSTRAINT m7_generation_capability_mint_envelope_fkey
        FOREIGN KEY ("grantId", "uploadIntentId", "leaseEpoch", "canonicalObjectKey", "backendSha256",
                     "grantExpiresAt", "capabilityOperation", "capabilityMode", "envelopeEnforcement")
        REFERENCES m7.m7_generation_write_grant
            ("id", "uploadIntentId", "leaseEpoch", "canonicalObjectKey", "backendSha256",
             "grantExpiresAt", "capabilityOperation", "capabilityMode", "envelopeEnforcement")
        ON DELETE NO ACTION,
    -- XF-17: the signing profile is a profile of THIS backend and of THIS capability kind
    CONSTRAINT m7_generation_capability_mint_signing_profile_fkey
        FOREIGN KEY ("signingProfileId", "backendSha256", "capabilityMode", "envelopeEnforcement")
        REFERENCES m7.m7_storage_profile ("id", "backendSha256", "writeCapabilityMode", "envelopeEnforcement")
        ON DELETE RESTRICT,
    CONSTRAINT m7_generation_capability_mint_seq_ck CHECK ("mintSeq" >= 1),
    CONSTRAINT m7_generation_capability_mint_digest_ck CHECK ("envelopeSha256" ~ '^sha256:[0-9a-f]{64}$'),
    -- XF-14: no capability is mintable at or after the envelope's own expiry. Strict, and evaluated AFTER
    -- the BEFORE trigger has replaced "mintedAt" with its own clock, so neither a stale function instant nor
    -- a caller-supplied instant can satisfy it.
    CONSTRAINT m7_generation_capability_mint_expiry_ck CHECK ("mintedAt" < "grantExpiresAt"),
    CONSTRAINT m7_generation_capability_mint_path_ck CHECK ("generationPath" = 'M7_CAPABILITY_MINT_V1')
);
-- the purge (§19.12.5) and operational review scan mints by backend
CREATE INDEX m7_generation_capability_mint_backend_idx
    ON m7.m7_generation_capability_mint ("backendSha256");

CREATE TABLE m7.m7_upload_intent_transition (
    "id"                 UUID           NOT NULL,
    "uploadIntentId"     UUID           NOT NULL,
    "stateVersion"       BIGINT         NOT NULL,
    "fromState"          m7."M7UploadIntentState",
    "toState"            m7."M7UploadIntentState" NOT NULL,
    "leaseEpoch"         BIGINT         NOT NULL,
    "acceptedLeaseEpoch" BIGINT,
    "rejectionReason"    m7."M7ContentRejectionReason",
    "failureReason"      m7."M7TerminalFailureReason",
    "writePath"          TEXT           NOT NULL,
    "actor"              NAME           NOT NULL,
    "recordedAt"         TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT m7_upload_intent_transition_pkey PRIMARY KEY ("id"),
    CONSTRAINT m7_upload_intent_transition_version_key UNIQUE ("uploadIntentId", "stateVersion"),
    CONSTRAINT m7_upload_intent_transition_intent_fkey FOREIGN KEY ("uploadIntentId")
        REFERENCES m7.m7_evidence_upload_intent ("id") ON DELETE RESTRICT
);

CREATE TABLE m7.m7_storage_observation (
    "id"                   UUID           NOT NULL,
    "uploadIntentId"       UUID           NOT NULL,
    "leaseEpoch"           BIGINT         NOT NULL,
    "objectKey"            TEXT           NOT NULL,
    -- SI-4 / EP-3: the profile the generation actually executed under, copied from the generation row
    "executingProfileId"   UUID           NOT NULL,
    "backendSha256"        TEXT           NOT NULL,
    "byteSize"             INTEGER,
    "contentSha256"        TEXT,
    "mediaType"            TEXT,
    "encoderGeneration"    TEXT,
    "providerEtag"         TEXT,
    "observedAt"           TIMESTAMPTZ(6) NOT NULL,
    "observedBy"           NAME           NOT NULL,
    "generationPath"       TEXT           NOT NULL,
    "redactedAt"           TIMESTAMPTZ(6),
    "redactionExecutionId" UUID,
    CONSTRAINT m7_storage_observation_pkey PRIMARY KEY ("id"),
    CONSTRAINT m7_storage_observation_intent_key UNIQUE ("uploadIntentId"),
    CONSTRAINT m7_storage_observation_intent_id_key UNIQUE ("uploadIntentId", "id"),
    -- GF-4 + EP-3: the observation is bound to ONE generation, on THAT generation's backend, and
    -- under THAT generation's executing profile. Four columns, one foreign key, no trigger needed.
    CONSTRAINT m7_storage_observation_generation_fkey
        FOREIGN KEY ("uploadIntentId", "leaseEpoch", "executingProfileId", "backendSha256")
        REFERENCES m7.m7_canonical_generation
            ("uploadIntentId", "leaseEpoch", "executingProfileId", "backendSha256") ON DELETE NO ACTION,
    CONSTRAINT m7_storage_observation_profile_fkey FOREIGN KEY ("executingProfileId", "backendSha256")
        REFERENCES m7.m7_storage_profile ("id", "backendSha256") ON DELETE RESTRICT,
    -- EP-4: the recorded encoder generation MUST be the executing profile's pinned one. MATCH SIMPLE
    -- leaves this unenforced exactly when encoderGeneration is NULL, i.e. after redaction, which is
    -- the only state in which the row legitimately no longer carries an encoder.
    CONSTRAINT m7_storage_observation_encoder_fkey FOREIGN KEY ("executingProfileId", "encoderGeneration")
        REFERENCES m7.m7_storage_profile ("id", "encoderGeneration") ON DELETE RESTRICT,
    CONSTRAINT m7_storage_observation_epoch_ck CHECK ("leaseEpoch" >= 1),
    CONSTRAINT m7_storage_observation_path_ck CHECK ("generationPath" = 'M7_WORKER_UPLOAD_V1'),
    CONSTRAINT m7_storage_observation_redaction_pair_ck CHECK (("redactedAt" IS NULL) = ("redactionExecutionId" IS NULL)),
    CONSTRAINT m7_storage_observation_content_ck CHECK (
        ("redactedAt" IS NULL
            AND "byteSize" > 0
            AND "contentSha256" ~ '^[0-9a-f]{64}$'
            AND "mediaType" IN ('image/jpeg','image/png','image/webp')
            AND "encoderGeneration" ~ '^[A-Za-z0-9_.:+-]{1,128}$'
            AND ("providerEtag" IS NULL OR pg_catalog.length("providerEtag") <= 256))
        OR
        ("redactedAt" IS NOT NULL
            AND "byteSize" IS NULL AND "contentSha256" IS NULL AND "mediaType" IS NULL
            AND "encoderGeneration" IS NULL AND "providerEtag" IS NULL))
);
-- RT-09 reuse DETECTION (not uniqueness)
CREATE INDEX m7_storage_observation_digest_idx ON m7.m7_storage_observation ("contentSha256")
    WHERE "contentSha256" IS NOT NULL;

CREATE TABLE m7.m7_evidence_submission (
    "id"                     UUID           NOT NULL,
    "outcomeId"              UUID           NOT NULL,
    "assignmentId"           UUID           NOT NULL,
    "evidenceSeq"            INTEGER        NOT NULL,
    "uploadIntentId"         UUID           NOT NULL,
    "observationId"          UUID           NOT NULL,
    "clientCaptureKey"       TEXT           NOT NULL,
    "supersedesEvidenceId"   UUID,
    "participantSessionId"   UUID           NOT NULL,
    "retentionPolicyVersion" TEXT           NOT NULL,
    "capturedAt"             TIMESTAMPTZ(6) NOT NULL,
    "recordedAt"             TIMESTAMPTZ(6) NOT NULL,
    -- §15.11 per-row deadlines, derived from THIS row's bound policy and never re-derived
    "rawDeleteScheduleByAt"  TIMESTAMPTZ(6) NOT NULL,
    "rawDeleteHardDueAt"     TIMESTAMPTZ(6) NOT NULL,
    "generationPath"         TEXT           NOT NULL,
    CONSTRAINT m7_evidence_submission_pkey PRIMARY KEY ("id"),
    CONSTRAINT m7_evidence_submission_intent_key UNIQUE ("uploadIntentId"),
    CONSTRAINT m7_evidence_submission_observation_key UNIQUE ("observationId"),
    CONSTRAINT m7_evidence_submission_outcome_id_key UNIQUE ("outcomeId", "id"),
    CONSTRAINT m7_evidence_submission_assignment_id_key UNIQUE ("assignmentId", "id"),
    CONSTRAINT m7_evidence_submission_seq_key UNIQUE ("outcomeId", "evidenceSeq"),
    CONSTRAINT m7_evidence_submission_capture_key UNIQUE ("outcomeId", "clientCaptureKey"),
    CONSTRAINT m7_evidence_submission_outcome_fkey FOREIGN KEY ("assignmentId", "outcomeId")
        REFERENCES m7.m7_outcome ("assignmentId", "id") ON DELETE RESTRICT,
    CONSTRAINT m7_evidence_submission_intent_fkey FOREIGN KEY ("assignmentId", "uploadIntentId")
        REFERENCES m7.m7_evidence_upload_intent ("assignmentId", "id") ON DELETE RESTRICT,
    CONSTRAINT m7_evidence_submission_observation_fkey FOREIGN KEY ("uploadIntentId", "observationId")
        REFERENCES m7.m7_storage_observation ("uploadIntentId", "id") ON DELETE RESTRICT,
    CONSTRAINT m7_evidence_submission_supersedes_fkey FOREIGN KEY ("outcomeId", "supersedesEvidenceId")
        REFERENCES m7.m7_evidence_submission ("outcomeId", "id") ON DELETE NO ACTION,
    CONSTRAINT m7_evidence_submission_session_fkey FOREIGN KEY ("participantSessionId")
        REFERENCES m7.m7_participant_session ("id") ON DELETE RESTRICT,
    CONSTRAINT m7_evidence_submission_policy_fkey FOREIGN KEY ("retentionPolicyVersion")
        REFERENCES m7.m7_retention_policy ("policyVersion") ON DELETE RESTRICT,
    CONSTRAINT m7_evidence_submission_seq_ck CHECK ("evidenceSeq" > 0),
    CONSTRAINT m7_evidence_submission_capture_ck CHECK ("clientCaptureKey" ~ '^[A-Za-z0-9_-]{16,128}$'),
    CONSTRAINT m7_evidence_submission_path_ck CHECK ("generationPath" = 'M7_FINALIZE_EVIDENCE_V1'),
    -- DL-1/DL-2 restated at row level: schedule strictly before hard; hard within the RT-17 ceiling
    CONSTRAINT m7_evidence_submission_deadline_ck CHECK (
        "rawDeleteScheduleByAt" > "recordedAt"
        AND "rawDeleteScheduleByAt" < "rawDeleteHardDueAt"
        AND ("rawDeleteHardDueAt" - "recordedAt") <= INTERVAL '30 days')
);
CREATE UNIQUE INDEX m7_evidence_submission_single_successor
    ON m7.m7_evidence_submission ("supersedesEvidenceId") WHERE "supersedesEvidenceId" IS NOT NULL;
CREATE INDEX m7_evidence_submission_schedule_by_idx ON m7.m7_evidence_submission ("rawDeleteScheduleByAt");
CREATE INDEX m7_evidence_submission_hard_due_idx ON m7.m7_evidence_submission ("rawDeleteHardDueAt");

CREATE TABLE m7.m7_evidence_submission_receipt (
    "id"                       UUID           NOT NULL,
    "operationScope"           TEXT           NOT NULL,
    "assignmentId"             UUID           NOT NULL,
    "idempotencyKey"           TEXT           NOT NULL,
    "requestHash"              TEXT           NOT NULL,
    "resultKind"               m7."M7EvidenceResultKind" NOT NULL,
    "submissionId"             UUID           NOT NULL,
    "participantSessionId"     UUID           NOT NULL,
    -- CP facts resolved for THIS operation (§9.5 RP-2). "Active", not "executing": SO-3 executes no
    -- provider call, so this is an operation fact, never an execution fact (EP-8).
    "resolvedActiveProfileId"  UUID           NOT NULL,
    "resolvedInstallationId"   UUID           NOT NULL,
    "createdAt"                TIMESTAMPTZ(6) NOT NULL,
    "generationPath"           TEXT           NOT NULL,
    CONSTRAINT m7_evidence_submission_receipt_pkey PRIMARY KEY ("id"),
    CONSTRAINT m7_evidence_submission_receipt_transport_key UNIQUE ("operationScope", "assignmentId", "idempotencyKey"),
    CONSTRAINT m7_evidence_submission_receipt_submission_fkey FOREIGN KEY ("assignmentId", "submissionId")
        REFERENCES m7.m7_evidence_submission ("assignmentId", "id") ON DELETE RESTRICT,
    CONSTRAINT m7_evidence_submission_receipt_session_fkey FOREIGN KEY ("participantSessionId")
        REFERENCES m7.m7_participant_session ("id") ON DELETE RESTRICT,
    CONSTRAINT m7_evidence_submission_receipt_profile_fkey FOREIGN KEY ("resolvedActiveProfileId")
        REFERENCES m7.m7_storage_profile ("id") ON DELETE RESTRICT,
    CONSTRAINT m7_evidence_submission_receipt_installation_fkey FOREIGN KEY ("resolvedInstallationId")
        REFERENCES m7.m7_control_plane_installation ("id") ON DELETE RESTRICT,
    CONSTRAINT m7_evidence_submission_receipt_scope_ck CHECK ("operationScope" = 'M7_EVIDENCE_SUBMISSION_V1'),
    CONSTRAINT m7_evidence_submission_receipt_key_ck CHECK ("idempotencyKey" ~ '^[A-Za-z0-9_-]{16,128}$'),
    CONSTRAINT m7_evidence_submission_receipt_hash_ck CHECK ("requestHash" ~ '^sha256:[0-9a-f]{64}$'),
    CONSTRAINT m7_evidence_submission_receipt_path_ck CHECK ("generationPath" = 'M7_FINALIZE_EVIDENCE_V1')
);
CREATE UNIQUE INDEX m7_evidence_submission_receipt_one_origin
    ON m7.m7_evidence_submission_receipt ("submissionId") WHERE "resultKind" = 'SUBMITTED';

CREATE TABLE m7.m7_evidence_artifact (
    "submissionId"       UUID           NOT NULL,
    "uploadIntentId"     UUID           NOT NULL,
    "acceptedLeaseEpoch" BIGINT         NOT NULL,
    "canonicalObjectKey" TEXT           NOT NULL,
    -- SI-4 / EP-5: the profile that PRODUCED these bytes, resolved from the accepted generation.
    -- There is no column here that could hold the intent's issuance profile.
    "acceptedExecutingProfileId" UUID    NOT NULL,
    "backendSha256"      TEXT           NOT NULL,
    "state"              m7."M7ArtifactState" NOT NULL,
    "stateVersion"       BIGINT         NOT NULL,
    "updatedAt"          TIMESTAMPTZ(6) NOT NULL,
    "deletedConfirmedAt" TIMESTAMPTZ(6),
    "generationPath"     TEXT           NOT NULL,
    CONSTRAINT m7_evidence_artifact_pkey PRIMARY KEY ("submissionId"),
    CONSTRAINT m7_evidence_artifact_key_key UNIQUE ("canonicalObjectKey"),
    CONSTRAINT m7_evidence_artifact_generation_key UNIQUE ("uploadIntentId", "acceptedLeaseEpoch"),
    CONSTRAINT m7_evidence_artifact_submission_fkey FOREIGN KEY ("submissionId")
        REFERENCES m7.m7_evidence_submission ("id") ON DELETE RESTRICT,
    -- GF-6 + EP-5: the artifact binds EXACTLY ONE generation, on that generation's backend, under
    -- that generation's executing profile. Copying the intent's issuance profile here is not
    -- representable: this foreign key would reject it.
    CONSTRAINT m7_evidence_artifact_generation_fkey
        FOREIGN KEY ("uploadIntentId", "acceptedLeaseEpoch", "acceptedExecutingProfileId", "backendSha256")
        REFERENCES m7.m7_canonical_generation
            ("uploadIntentId", "leaseEpoch", "executingProfileId", "backendSha256") ON DELETE NO ACTION,
    CONSTRAINT m7_evidence_artifact_profile_fkey FOREIGN KEY ("acceptedExecutingProfileId", "backendSha256")
        REFERENCES m7.m7_storage_profile ("id", "backendSha256") ON DELETE RESTRICT,
    CONSTRAINT m7_evidence_artifact_epoch_ck CHECK ("acceptedLeaseEpoch" >= 1),
    CONSTRAINT m7_evidence_artifact_version_ck CHECK ("stateVersion" >= 1),
    CONSTRAINT m7_evidence_artifact_deleted_ck CHECK (("state" = 'DELETED') = ("deletedConfirmedAt" IS NOT NULL)),
    CONSTRAINT m7_evidence_artifact_path_ck CHECK ("generationPath" = 'M7_FINALIZE_EVIDENCE_V1')
);
CREATE INDEX m7_evidence_artifact_live_idx ON m7.m7_evidence_artifact ("state") WHERE "state" <> 'DELETED';
CREATE INDEX m7_evidence_artifact_backend_idx ON m7.m7_evidence_artifact ("backendSha256");

CREATE TABLE m7.m7_evidence_artifact_transition (
    "id"           UUID           NOT NULL,
    "submissionId" UUID           NOT NULL,
    "stateVersion" BIGINT         NOT NULL,
    "fromState"    m7."M7ArtifactState",
    "toState"      m7."M7ArtifactState" NOT NULL,
    "writePath"    TEXT           NOT NULL,
    "actor"        NAME           NOT NULL,
    "recordedAt"   TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT m7_evidence_artifact_transition_pkey PRIMARY KEY ("id"),
    CONSTRAINT m7_evidence_artifact_transition_version_key UNIQUE ("submissionId", "stateVersion"),
    CONSTRAINT m7_evidence_artifact_transition_artifact_fkey FOREIGN KEY ("submissionId")
        REFERENCES m7.m7_evidence_artifact ("submissionId") ON DELETE RESTRICT
);

CREATE TABLE m7.m7_evidence_integrity_finding (
    "id"             UUID           NOT NULL,
    "submissionId"   UUID           NOT NULL,
    "findingKind"    m7."M7IntegrityFindingKind" NOT NULL,
    "backendSha256"  TEXT           NOT NULL,
    "observedAt"     TIMESTAMPTZ(6) NOT NULL,
    "observedBy"     NAME           NOT NULL,
    "generationPath" TEXT           NOT NULL,
    CONSTRAINT m7_evidence_integrity_finding_pkey PRIMARY KEY ("id"),
    CONSTRAINT m7_evidence_integrity_finding_kind_key UNIQUE ("submissionId", "findingKind"),
    CONSTRAINT m7_evidence_integrity_finding_submission_fkey FOREIGN KEY ("submissionId")
        REFERENCES m7.m7_evidence_submission ("id") ON DELETE RESTRICT,
    CONSTRAINT m7_evidence_integrity_finding_backend_fkey FOREIGN KEY ("backendSha256")
        REFERENCES m7.m7_storage_backend ("backendSha256") ON DELETE RESTRICT,
    CONSTRAINT m7_evidence_integrity_finding_path_ck CHECK ("generationPath" = 'M7_WORKER_RECONCILIATION_V1')
);

CREATE TABLE m7.m7_reconciliation_finding (
    "id"               UUID           NOT NULL,
    "findingKind"      m7."M7ReconciliationFindingKind" NOT NULL,
    "zone"             m7."M7ObjectZone" NOT NULL,
    "backendSha256"      TEXT         NOT NULL,
    -- SI-4 / EP-6: the live profile the listing ran under
    "executingProfileId" UUID         NOT NULL,
    -- DL-5 RECONCILIATION_RUN: the policy in force at listing time, immutable, and the bound policy
    -- of every effect this finding enqueues
    "boundPolicyVersion" TEXT         NOT NULL,
    "objectKey"        TEXT           NOT NULL,
    "uploadIntentId"   UUID,
    "leaseEpoch"       BIGINT,
    "listingRunId"     TEXT           NOT NULL,
    "observedAt"       TIMESTAMPTZ(6) NOT NULL,
    "observedBy"       NAME           NOT NULL,
    "generationPath"   TEXT           NOT NULL,
    CONSTRAINT m7_reconciliation_finding_pkey PRIMARY KEY ("id"),
    CONSTRAINT m7_reconciliation_finding_run_key UNIQUE ("listingRunId", "backendSha256", "objectKey"),
    CONSTRAINT m7_reconciliation_finding_intent_fkey FOREIGN KEY ("uploadIntentId")
        REFERENCES m7.m7_evidence_upload_intent ("id") ON DELETE RESTRICT,
    CONSTRAINT m7_reconciliation_finding_profile_fkey FOREIGN KEY ("executingProfileId", "backendSha256")
        REFERENCES m7.m7_storage_profile ("id", "backendSha256") ON DELETE RESTRICT,
    CONSTRAINT m7_reconciliation_finding_policy_fkey FOREIGN KEY ("boundPolicyVersion")
        REFERENCES m7.m7_retention_policy ("policyVersion") ON DELETE RESTRICT,
    -- lets an outbox row composite-FK "this effect carries its finding's bound policy" (DL-5)
    CONSTRAINT m7_reconciliation_finding_id_policy_key UNIQUE ("id", "boundPolicyVersion"),
    CONSTRAINT m7_reconciliation_finding_key_ck CHECK (pg_catalog.length("objectKey") BETWEEN 4 AND 1024),
    CONSTRAINT m7_reconciliation_finding_epoch_ck CHECK ("leaseEpoch" IS NULL OR "leaseEpoch" >= 1),
    CONSTRAINT m7_reconciliation_finding_run_ck CHECK ("listingRunId" ~ '^[A-Za-z0-9_.:-]{8,128}$'),
    CONSTRAINT m7_reconciliation_finding_path_ck CHECK ("generationPath" = 'M7_WORKER_RECONCILIATION_V1')
);

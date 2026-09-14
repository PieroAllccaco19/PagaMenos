-- ---------------------------------------------------------------------------------------------
-- Storage backend: WHERE the bytes physically are. Immutable identity; one-way retirement only.
-- backendSha256 is recomputed by PostgreSQL from the seven identity fields (§19.11.2).
-- providerWriteCompletionWindow (W, SP-9) is an IDENTITY field: every write fence M7 ever computed
-- depends on it, so changing it is a NEW backend and no existing fence is retroactively weakened (XF-10).
-- ---------------------------------------------------------------------------------------------
CREATE TABLE m7.m7_storage_backend (
    "backendSha256"    TEXT           NOT NULL,
    "providerClass"    m7."M7StorageProviderClass" NOT NULL,
    "containerId"      TEXT           NOT NULL,
    "regionId"         TEXT           NOT NULL,
    "endpointIdentity" TEXT           NOT NULL,
    "stagingPrefix"    TEXT           NOT NULL,
    "evidencePrefix"   TEXT           NOT NULL,
    "providerWriteCompletionWindow" INTERVAL NOT NULL,
    "registeredAt"     TIMESTAMPTZ(6) NOT NULL,
    "registeredBy"     NAME           NOT NULL,
    "retiredAt"        TIMESTAMPTZ(6),
    "retiredBy"        NAME,
    "generationPath"   TEXT           NOT NULL,
    CONSTRAINT m7_storage_backend_pkey PRIMARY KEY ("backendSha256"),
    CONSTRAINT m7_storage_backend_identity_key UNIQUE
        ("providerClass","containerId","regionId","endpointIdentity","stagingPrefix","evidencePrefix",
         "providerWriteCompletionWindow"),
    CONSTRAINT m7_storage_backend_digest_ck CHECK ("backendSha256" ~ '^sha256:[0-9a-f]{64}$'),
    CONSTRAINT m7_storage_backend_container_ck CHECK ("containerId" ~ '^[A-Za-z0-9_.:-]{1,128}$'),
    CONSTRAINT m7_storage_backend_region_ck CHECK ("regionId" ~ '^[A-Za-z0-9_.:-]{1,64}$'),
    CONSTRAINT m7_storage_backend_endpoint_ck CHECK ("endpointIdentity" ~ '^[A-Za-z0-9_.:-]{1,253}$'),
    CONSTRAINT m7_storage_backend_staging_prefix_ck CHECK ("stagingPrefix" ~ '^[A-Za-z0-9_./-]{2,128}/$'),
    CONSTRAINT m7_storage_backend_evidence_prefix_ck CHECK ("evidencePrefix" ~ '^[A-Za-z0-9_./-]{2,128}/$'),
    -- Zones must be disjoint namespaces, so classification can never confuse them.
    CONSTRAINT m7_storage_backend_prefix_disjoint_ck CHECK (
        "stagingPrefix" <> "evidencePrefix"
        AND NOT pg_catalog.starts_with("stagingPrefix", "evidencePrefix")
        AND NOT pg_catalog.starts_with("evidencePrefix", "stagingPrefix")),
    -- SP-9: W must be positive and small enough that some (G, Lambda) can satisfy XF-DL-1 inside a worker lease
    CONSTRAINT m7_storage_backend_write_window_ck CHECK (
        "providerWriteCompletionWindow" >= INTERVAL '1 second'
        AND "providerWriteCompletionWindow" <= INTERVAL '60 seconds'),
    CONSTRAINT m7_storage_backend_retire_pair_ck CHECK (("retiredAt" IS NULL) = ("retiredBy" IS NULL)),
    CONSTRAINT m7_storage_backend_retire_order_ck CHECK ("retiredAt" IS NULL OR "retiredAt" >= "registeredAt"),
    CONSTRAINT m7_storage_backend_path_ck CHECK ("generationPath" = 'M7_CONTROL_PLANE_INSTALL_V1')
);

-- ---------------------------------------------------------------------------------------------
-- Storage profile: HOW the server is entitled and equipped to act on ONE backend.
-- Credential rotation = a new profile over the SAME backendSha256.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE m7.m7_storage_profile (
    "id"                       UUID           NOT NULL,
    "storageProfileVersion"    TEXT           NOT NULL,
    "profileSha256"            TEXT           NOT NULL,
    "backendSha256"            TEXT           NOT NULL,
    "credentialProfileId"      TEXT           NOT NULL,
    "credentialGeneration"     INTEGER        NOT NULL,
    "uploadTransport"          m7."M7UploadTransport" NOT NULL,
    "decoderGeneration"        TEXT           NOT NULL,
    "encoderGeneration"        TEXT           NOT NULL,
    "storageCapabilityVersion" TEXT           NOT NULL,
    "conditionalCreateMode"    m7."M7ConditionalCreateMode" NOT NULL,
    "writeCapabilityMode"      m7."M7WriteCapabilityMode" NOT NULL,
    -- 11.7.4: declared, digest-bound classification of where the envelope is enforced
    "envelopeEnforcement"      m7."M7EnvelopeEnforcement" NOT NULL,
    "registeredAt"             TIMESTAMPTZ(6) NOT NULL,
    "registeredBy"             NAME           NOT NULL,
    "retiredAt"                TIMESTAMPTZ(6),
    "retiredBy"                NAME,
    "generationPath"           TEXT           NOT NULL,
    CONSTRAINT m7_storage_profile_pkey PRIMARY KEY ("id"),
    CONSTRAINT m7_storage_profile_version_key UNIQUE ("storageProfileVersion"),
    CONSTRAINT m7_storage_profile_digest_key UNIQUE ("profileSha256"),
    -- needed by composite FKs that must prove "this profile is on this backend"
    CONSTRAINT m7_storage_profile_id_backend_key UNIQUE ("id","backendSha256"),
    -- EP-4: lets an observation composite-FK (executingProfileId, encoderGeneration), so a recorded
    -- encoder generation CANNOT belong to a profile the row does not name. Declarative, not a trigger.
    CONSTRAINT m7_storage_profile_id_encoder_key UNIQUE ("id","encoderGeneration"),
    -- XF-17: lets a capability mint composite-FK its SIGNING profile together with the backend and the
    -- capability kind, so a mint signed under another backend's or another kind's credential is 23503.
    CONSTRAINT m7_storage_profile_id_capability_kind_key UNIQUE
        ("id","backendSha256","writeCapabilityMode","envelopeEnforcement"),
    CONSTRAINT m7_storage_profile_credential_key UNIQUE ("backendSha256","credentialProfileId","credentialGeneration"),
    CONSTRAINT m7_storage_profile_backend_fkey FOREIGN KEY ("backendSha256")
        REFERENCES m7.m7_storage_backend ("backendSha256") ON DELETE RESTRICT,
    CONSTRAINT m7_storage_profile_version_ck CHECK ("storageProfileVersion" ~ '^pagamenos\.m7\.storage-profile\.[a-z0-9.-]{1,64}$'),
    CONSTRAINT m7_storage_profile_digest_ck CHECK ("profileSha256" ~ '^sha256:[0-9a-f]{64}$'),
    CONSTRAINT m7_storage_profile_credential_id_ck CHECK ("credentialProfileId" ~ '^[A-Za-z0-9_.:-]{1,128}$'),
    CONSTRAINT m7_storage_profile_credential_gen_ck CHECK ("credentialGeneration" >= 1),
    CONSTRAINT m7_storage_profile_decoder_ck CHECK ("decoderGeneration" ~ '^[A-Za-z0-9_.:+-]{1,128}$'),
    CONSTRAINT m7_storage_profile_encoder_ck CHECK ("encoderGeneration" ~ '^[A-Za-z0-9_.:+-]{1,128}$'),
    CONSTRAINT m7_storage_profile_capability_ck CHECK ("storageCapabilityVersion" ~ '^[A-Za-z0-9_.:+-]{1,128}$'),
    CONSTRAINT m7_storage_profile_retire_pair_ck CHECK (("retiredAt" IS NULL) = ("retiredBy" IS NULL)),
    CONSTRAINT m7_storage_profile_retire_order_ck CHECK ("retiredAt" IS NULL OR "retiredAt" >= "registeredAt"),
    CONSTRAINT m7_storage_profile_path_ck CHECK ("generationPath" = 'M7_CONTROL_PLANE_INSTALL_V1')
);
-- routability lookup: "is there a LIVE profile over this backend?"  (SI-3)
CREATE INDEX m7_storage_profile_live_backend_idx ON m7.m7_storage_profile ("backendSha256")
    WHERE "retiredAt" IS NULL;

-- ---------------------------------------------------------------------------------------------
-- Retention policy, including the §15.11 deletion deadline budget model.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE m7.m7_retention_policy (
    "policyVersion"                       TEXT           NOT NULL,
    -- RT-17 completion bounds (H)
    "rawDeleteHardDeadlineWithdrawal"     INTERVAL       NOT NULL,
    "rawDeleteHardDeadlineNeverVerified"  INTERVAL       NOT NULL,
    "authorizedDeletionHardDeadline"      INTERVAL       NOT NULL,
    -- schedule deadlines (S)
    "rawDeleteScheduleAfterWithdrawal"    INTERVAL       NOT NULL,
    "rawDeleteScheduleAfterNeverVerified" INTERVAL       NOT NULL,
    "authorizedDeletionScheduleAfter"     INTERVAL       NOT NULL,
    -- scheduler lag (L) and effect completion budget (B)
    "schedulerWorstCaseLag"               INTERVAL       NOT NULL,
    "effectCompletionBudget"              INTERVAL       NOT NULL,
    -- §11.7 external write fencing: grant TTL (G) and clock-skew allowance (Lambda)
    "generationWriteGrantTtl"             INTERVAL       NOT NULL,
    "writeFenceSkewAllowance"             INTERVAL       NOT NULL,
    -- operational windows
    "uploadUrlTtl"                        INTERVAL       NOT NULL,
    "finalizeWindow"                      INTERVAL       NOT NULL,
    "workerLease"                         INTERVAL       NOT NULL,
    "sessionTtl"                          INTERVAL       NOT NULL,
    "captureSkewTolerance"                INTERVAL       NOT NULL,
    "orphanGrace"                         INTERVAL       NOT NULL,
    "outboxBackoffCap"                    INTERVAL       NOT NULL,
    "outboxMaxAttempts"                   INTEGER        NOT NULL,
    -- content policy
    "maxUploadBytes"                      INTEGER        NOT NULL,
    "maxPixels"                           INTEGER        NOT NULL,
    "canonicalMediaType"                  TEXT           NOT NULL,
    "mediaPolicyVersion"                  TEXT           NOT NULL,
    -- identity
    "policySha256"                        TEXT           NOT NULL,
    "createdAt"                           TIMESTAMPTZ(6) NOT NULL,
    "generationPath"                      TEXT           NOT NULL,
    CONSTRAINT m7_retention_policy_pkey PRIMARY KEY ("policyVersion"),
    CONSTRAINT m7_retention_policy_digest_key UNIQUE ("policySha256"),
    CONSTRAINT m7_retention_policy_version_ck CHECK ("policyVersion" ~ '^pagamenos\.m7\.policy\.[a-z0-9.-]{1,64}$'),
    CONSTRAINT m7_retention_policy_digest_ck CHECK ("policySha256" ~ '^sha256:[0-9a-f]{64}$'),
    -- DL-2 : RT-17 ceilings on the HARD (completion) deadlines
    CONSTRAINT m7_retention_policy_hard_withdrawal_ck CHECK (
        "rawDeleteHardDeadlineWithdrawal" > INTERVAL '0'
        AND "rawDeleteHardDeadlineWithdrawal" <= INTERVAL '24 hours'),
    CONSTRAINT m7_retention_policy_hard_never_verified_ck CHECK (
        "rawDeleteHardDeadlineNeverVerified" > INTERVAL '0'
        AND "rawDeleteHardDeadlineNeverVerified" <= INTERVAL '30 days'),
    CONSTRAINT m7_retention_policy_hard_authorized_ck CHECK (
        "authorizedDeletionHardDeadline" > INTERVAL '0'
        AND "authorizedDeletionHardDeadline" <= INTERVAL '30 days'),
    -- DL-3 : schedule offsets
    CONSTRAINT m7_retention_policy_schedule_sign_ck CHECK (
        "rawDeleteScheduleAfterWithdrawal" >= INTERVAL '0'
        AND "authorizedDeletionScheduleAfter" >= INTERVAL '0'
        AND "rawDeleteScheduleAfterNeverVerified" > INTERVAL '0'),
    CONSTRAINT m7_retention_policy_lag_ck CHECK (
        "schedulerWorstCaseLag" > INTERVAL '0' AND "schedulerWorstCaseLag" <= INTERVAL '6 hours'),
    CONSTRAINT m7_retention_policy_budget_ck CHECK (
        "effectCompletionBudget" > INTERVAL '0' AND "effectCompletionBudget" <= INTERVAL '7 days'),
    -- DL-1 : S + L + B <= H, for each of the three bases
    CONSTRAINT m7_retention_policy_dl1_withdrawal_ck CHECK (
        "rawDeleteScheduleAfterWithdrawal" + "schedulerWorstCaseLag" + "effectCompletionBudget"
        <= "rawDeleteHardDeadlineWithdrawal"),
    CONSTRAINT m7_retention_policy_dl1_never_verified_ck CHECK (
        "rawDeleteScheduleAfterNeverVerified" + "schedulerWorstCaseLag" + "effectCompletionBudget"
        <= "rawDeleteHardDeadlineNeverVerified"),
    CONSTRAINT m7_retention_policy_dl1_authorized_ck CHECK (
        "authorizedDeletionScheduleAfter" + "schedulerWorstCaseLag" + "effectCompletionBudget"
        <= "authorizedDeletionHardDeadline"),
    -- operational windows
    CONSTRAINT m7_retention_policy_url_ttl_ck CHECK ("uploadUrlTtl" >= INTERVAL '30 seconds' AND "uploadUrlTtl" <= INTERVAL '300 seconds'),
    CONSTRAINT m7_retention_policy_finalize_ck CHECK ("finalizeWindow" >= INTERVAL '60 seconds' AND "finalizeWindow" <= INTERVAL '900 seconds'),
    CONSTRAINT m7_retention_policy_lease_ck CHECK ("workerLease" >= INTERVAL '10 seconds' AND "workerLease" <= INTERVAL '120 seconds'),
    CONSTRAINT m7_retention_policy_session_ck CHECK ("sessionTtl" >= INTERVAL '5 minutes' AND "sessionTtl" <= INTERVAL '24 hours'),
    CONSTRAINT m7_retention_policy_skew_ck CHECK ("captureSkewTolerance" >= INTERVAL '1 second' AND "captureSkewTolerance" <= INTERVAL '120 seconds'),
    CONSTRAINT m7_retention_policy_orphan_ck CHECK ("orphanGrace" >= INTERVAL '10 minutes' AND "orphanGrace" <= INTERVAL '24 hours'),
    CONSTRAINT m7_retention_policy_backoff_ck CHECK ("outboxBackoffCap" >= INTERVAL '60 seconds' AND "outboxBackoffCap" <= INTERVAL '3600 seconds'),
    -- XF-DL-1a : the single-table half of G + W + Lambda <= workerLease. The full relation spans
    -- m7_storage_backend (W) and is verified by c_activate_manifest_v1 and per allocation (M7012).
    CONSTRAINT m7_retention_policy_grant_ttl_ck CHECK (
        "generationWriteGrantTtl" >= INTERVAL '5 seconds'
        AND "writeFenceSkewAllowance" >= INTERVAL '1 second'
        AND "writeFenceSkewAllowance" <= INTERVAL '30 seconds'
        AND "generationWriteGrantTtl" + "writeFenceSkewAllowance" < "workerLease"),
    CONSTRAINT m7_retention_policy_attempts_ck CHECK ("outboxMaxAttempts" BETWEEN 1 AND 50),
    CONSTRAINT m7_retention_policy_bytes_ck CHECK ("maxUploadBytes" BETWEEN 1024 AND 10485760),
    CONSTRAINT m7_retention_policy_pixels_ck CHECK ("maxPixels" BETWEEN 1 AND 40000000),
    CONSTRAINT m7_retention_policy_media_ck CHECK ("canonicalMediaType" IN ('image/jpeg','image/png','image/webp')),
    CONSTRAINT m7_retention_policy_media_policy_ck CHECK ("mediaPolicyVersion" = 'pagamenos.m7.media.jpeg-png-webp.v1'),
    CONSTRAINT m7_retention_policy_path_ck CHECK ("generationPath" = 'M7_CONTROL_PLANE_INSTALL_V1')
);

-- ---------------------------------------------------------------------------------------------
-- Merchant vocabulary (governed, versioned; never a fixed CHECK). §13.4
-- ---------------------------------------------------------------------------------------------
CREATE TABLE m7.m7_merchant_vocabulary (
    "vocabularyVersion"  TEXT           NOT NULL,
    "corpusId"           TEXT           NOT NULL,
    "entryCount"         INTEGER        NOT NULL,
    "entriesSha256"      TEXT           NOT NULL,
    "vocabularySha256"   TEXT           NOT NULL,
    "createdAt"          TIMESTAMPTZ(6) NOT NULL,
    "generationPath"     TEXT           NOT NULL,
    CONSTRAINT m7_merchant_vocabulary_pkey PRIMARY KEY ("vocabularyVersion"),
    CONSTRAINT m7_merchant_vocabulary_digest_key UNIQUE ("vocabularySha256"),
    CONSTRAINT m7_merchant_vocabulary_version_ck CHECK ("vocabularyVersion" ~ '^pagamenos\.m7\.merchant-vocabulary\.[a-z0-9.-]{1,64}$'),
    CONSTRAINT m7_merchant_vocabulary_corpus_ck CHECK ("corpusId" ~ '^[A-Za-z0-9_.:-]{1,128}$'),
    CONSTRAINT m7_merchant_vocabulary_count_ck CHECK ("entryCount" >= 1),
    CONSTRAINT m7_merchant_vocabulary_entries_digest_ck CHECK ("entriesSha256" ~ '^sha256:[0-9a-f]{64}$'),
    CONSTRAINT m7_merchant_vocabulary_digest_ck CHECK ("vocabularySha256" ~ '^sha256:[0-9a-f]{64}$'),
    CONSTRAINT m7_merchant_vocabulary_path_ck CHECK ("generationPath" = 'M7_CONTROL_PLANE_INSTALL_V1')
);

CREATE TABLE m7.m7_merchant_vocabulary_entry (
    "vocabularyVersion" TEXT NOT NULL,
    "merchantRef"       TEXT NOT NULL,
    CONSTRAINT m7_merchant_vocabulary_entry_pkey PRIMARY KEY ("vocabularyVersion", "merchantRef"),
    CONSTRAINT m7_merchant_vocabulary_entry_version_fkey FOREIGN KEY ("vocabularyVersion")
        REFERENCES m7.m7_merchant_vocabulary ("vocabularyVersion") ON DELETE RESTRICT,
    CONSTRAINT m7_merchant_vocabulary_entry_ref_ck CHECK ("merchantRef" ~ '^[A-Za-z0-9_.:-]{1,128}$')
);

-- ---------------------------------------------------------------------------------------------
-- Control-plane MANIFEST: immutable reviewed identity.  (closes M7V11-AUD-03, part 1)
-- One manifestVersion <-> exactly one digest, forever. Never retired, never reused with new content.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE m7.m7_control_plane_manifest (
    "manifestVersion"        TEXT           NOT NULL,
    "manifestSha256"         TEXT           NOT NULL,
    "retentionPolicyVersion" TEXT           NOT NULL,
    "vocabularyVersion"      TEXT           NOT NULL,
    "storageProfileVersion"  TEXT           NOT NULL,
    "registeredAt"           TIMESTAMPTZ(6) NOT NULL,
    "registeredBy"           NAME           NOT NULL,
    "generationPath"         TEXT           NOT NULL,
    CONSTRAINT m7_control_plane_manifest_pkey PRIMARY KEY ("manifestVersion"),
    CONSTRAINT m7_control_plane_manifest_digest_key UNIQUE ("manifestSha256"),
    CONSTRAINT m7_control_plane_manifest_policy_fkey FOREIGN KEY ("retentionPolicyVersion")
        REFERENCES m7.m7_retention_policy ("policyVersion") ON DELETE RESTRICT,
    CONSTRAINT m7_control_plane_manifest_vocab_fkey FOREIGN KEY ("vocabularyVersion")
        REFERENCES m7.m7_merchant_vocabulary ("vocabularyVersion") ON DELETE RESTRICT,
    CONSTRAINT m7_control_plane_manifest_profile_fkey FOREIGN KEY ("storageProfileVersion")
        REFERENCES m7.m7_storage_profile ("storageProfileVersion") ON DELETE RESTRICT,
    CONSTRAINT m7_control_plane_manifest_version_ck CHECK ("manifestVersion" ~ '^pagamenos\.m7\.control-plane\.[a-z0-9.-]{1,64}$'),
    CONSTRAINT m7_control_plane_manifest_digest_ck CHECK ("manifestSha256" ~ '^sha256:[0-9a-f]{64}$'),
    CONSTRAINT m7_control_plane_manifest_path_ck CHECK ("generationPath" = 'M7_CONTROL_PLANE_INSTALL_V1')
);

-- ---------------------------------------------------------------------------------------------
-- Control-plane INSTALLATION: an EVENT of making a registered manifest active.
-- Repeatable for the same manifestVersion -> A -> B -> A rollback is executable.
-- There is deliberately NO UNIQUE(manifestSha256) here.  (closes M7V11-AUD-03, part 2)
-- ---------------------------------------------------------------------------------------------
CREATE TABLE m7.m7_control_plane_installation (
    "id"              UUID           NOT NULL,
    "installationSeq" BIGINT         NOT NULL,
    "manifestVersion" TEXT           NOT NULL,
    "installedAt"     TIMESTAMPTZ(6) NOT NULL,
    "installedBy"     NAME           NOT NULL,
    "retiredAt"       TIMESTAMPTZ(6),
    "retiredBy"       NAME,
    "generationPath"  TEXT           NOT NULL,
    CONSTRAINT m7_control_plane_installation_pkey PRIMARY KEY ("id"),
    CONSTRAINT m7_control_plane_installation_seq_key UNIQUE ("installationSeq"),
    CONSTRAINT m7_control_plane_installation_manifest_fkey FOREIGN KEY ("manifestVersion")
        REFERENCES m7.m7_control_plane_manifest ("manifestVersion") ON DELETE RESTRICT,
    CONSTRAINT m7_control_plane_installation_seq_ck CHECK ("installationSeq" >= 1),
    CONSTRAINT m7_control_plane_installation_retire_pair_ck CHECK (("retiredAt" IS NULL) = ("retiredBy" IS NULL)),
    CONSTRAINT m7_control_plane_installation_retire_order_ck CHECK ("retiredAt" IS NULL OR "retiredAt" >= "installedAt"),
    CONSTRAINT m7_control_plane_installation_path_ck CHECK ("generationPath" = 'M7_CONTROL_PLANE_INSTALL_V1')
);
-- At most one active installation (the indexed expression is always TRUE inside the predicate).
CREATE UNIQUE INDEX m7_control_plane_installation_one_active
    ON m7.m7_control_plane_installation ((("retiredAt" IS NULL))) WHERE "retiredAt" IS NULL;
CREATE INDEX m7_control_plane_installation_manifest_idx
    ON m7.m7_control_plane_installation ("manifestVersion");

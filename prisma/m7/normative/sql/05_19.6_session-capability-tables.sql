CREATE TABLE m7.m7_participant_session (
    "id"             UUID           NOT NULL,
    "participantId"  UUID           NOT NULL,
    "handleSha256"   BYTEA          NOT NULL,
    "issuedAt"       TIMESTAMPTZ(6) NOT NULL,
    "expiresAt"      TIMESTAMPTZ(6) NOT NULL,
    "issuedBy"       NAME           NOT NULL,
    "installationId" UUID           NOT NULL,
    "generationPath" TEXT           NOT NULL,
    CONSTRAINT m7_participant_session_pkey PRIMARY KEY ("id"),
    CONSTRAINT m7_participant_session_handle_key UNIQUE ("handleSha256"),
    CONSTRAINT m7_participant_session_participant_fkey FOREIGN KEY ("participantId")
        REFERENCES public.study_participant ("id") ON DELETE RESTRICT,
    CONSTRAINT m7_participant_session_installation_fkey FOREIGN KEY ("installationId")
        REFERENCES m7.m7_control_plane_installation ("id") ON DELETE RESTRICT,
    CONSTRAINT m7_participant_session_handle_ck CHECK (pg_catalog.octet_length("handleSha256") = 32),
    CONSTRAINT m7_participant_session_ttl_ck CHECK ("expiresAt" > "issuedAt" AND ("expiresAt" - "issuedAt") <= INTERVAL '24 hours'),
    CONSTRAINT m7_participant_session_path_ck CHECK ("generationPath" = 'M7_ISSUE_SESSION_V1')
);
CREATE INDEX m7_participant_session_participant_idx ON m7.m7_participant_session ("participantId");

CREATE TABLE m7.m7_participant_session_revocation (
    "id"             UUID           NOT NULL,
    "sessionId"      UUID           NOT NULL,
    "reason"         m7."M7SessionRevocationReason" NOT NULL,
    "revokedAt"      TIMESTAMPTZ(6) NOT NULL,
    "revokedBy"      NAME           NOT NULL,
    "generationPath" TEXT           NOT NULL,
    CONSTRAINT m7_participant_session_revocation_pkey PRIMARY KEY ("id"),
    CONSTRAINT m7_participant_session_revocation_session_key UNIQUE ("sessionId"),
    CONSTRAINT m7_participant_session_revocation_session_fkey FOREIGN KEY ("sessionId")
        REFERENCES m7.m7_participant_session ("id") ON DELETE RESTRICT,
    CONSTRAINT m7_participant_session_revocation_path_ck CHECK ("generationPath" = 'M7_REVOKE_SESSION_V1')
);

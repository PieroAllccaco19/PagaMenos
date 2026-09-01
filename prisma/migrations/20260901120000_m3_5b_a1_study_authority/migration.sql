-- PagaMenos · M3.5B-A1 — Protocol / Experiment / Assignment / Consent authority (spec V2.1).
--
-- ADDITIVE over accepted M3.5A: this migration creates NEW tables/enums only and never ALTERs the
-- accepted `decision_snapshot` / `decision_idempotency_receipt` tables (SCI-24). The base DDL (enums,
-- tables, indexes, FKs) is exactly what `prisma migrate diff` emits for the schema delta; the
-- DATABASE-LEVEL enforcement that Prisma cannot express is appended and gated by `db:migrate:check`:
--
--   • AnalysisProtocol freeze-guard: the ONLY permitted UPDATE is DRAFT→FROZEN with frozenAt
--     NULL→timestamp and EVERY other column unchanged; a FROZEN row rejects all UPDATE; DELETE and
--     TRUNCATE are rejected (spec §2.2).
--   • Experiment must reference a FROZEN protocol at INSERT (cross-table ⇒ trigger, not CHECK), and is
--     immutable immediately (no UPDATE/DELETE/TRUNCATE) (spec §4/§4.1).
--   • StudyParticipant / ExperimentAssignment / StudyConsentEvent and all five receipt tables are
--     append-only (BEFORE UPDATE/DELETE/TRUNCATE RAISE) (spec §10 preamble, §7, §8).
--   • StudyConsentEvent single-table CHECK ties action ↔ provenance ↔ assertedEffectiveAt (spec §8.11).
--   • Each receipt table CHECK-restricts operationScope to its trusted constant(s) (spec §9/§21).
--
-- ATOMIC: the whole install runs in one transaction, so a failure at any step leaves NO partial A1
-- schema behind. `gen_random_uuid()` is PostgreSQL core (≥ 13); no extension is required.

BEGIN;

-- ===================================================================================================
-- 1. Enums
-- ===================================================================================================

-- CreateEnum
CREATE TYPE "AnalysisProtocolLifecycle" AS ENUM ('DRAFT', 'FROZEN');

-- CreateEnum
CREATE TYPE "StudyConsentAction" AS ENUM ('GRANTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "StudyConsentResultKind" AS ENUM ('EVENT_APPENDED', 'NO_OP_EFFECTIVE_STATE', 'CORRECTION_NOT_APPLIED');

-- ===================================================================================================
-- 2. Tables
-- ===================================================================================================

-- CreateTable
CREATE TABLE "analysis_protocol" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "protocolVersion" TEXT NOT NULL,
    "definitionSchemaVersion" TEXT NOT NULL,
    "canonicalizationVersion" TEXT NOT NULL,
    "definitionJson" JSONB NOT NULL,
    "definitionDigest" TEXT NOT NULL,
    "lifecycleStatus" "AnalysisProtocolLifecycle" NOT NULL,
    "frozenAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_protocol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "experimentCode" TEXT NOT NULL,
    "frozenProtocolId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_participant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recruitmentSubjectKey" TEXT NOT NULL,
    "recruitmentKeyVersion" TEXT NOT NULL,
    "participantCode" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "study_participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiment_assignment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "experimentId" UUID NOT NULL,
    "participantId" UUID NOT NULL,
    "enrolledAt" TIMESTAMPTZ(6) NOT NULL,
    "observationStartAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experiment_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_consent_event" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assignmentId" UUID NOT NULL,
    "consentSeq" INTEGER NOT NULL,
    "action" "StudyConsentAction" NOT NULL,
    "consentVersion" TEXT,
    "privacyNoticeVersion" TEXT,
    "optionalEvidenceConsent" BOOLEAN,
    "assertedEffectiveAt" TIMESTAMPTZ(6),
    "capturedAt" TIMESTAMPTZ(6) NOT NULL,
    "recordedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "study_consent_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_protocol_command_receipt" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "operationScope" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "analysisProtocolId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_protocol_command_receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiment_create_receipt" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "operationScope" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "experimentId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experiment_create_receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_participant_registration_receipt" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "operationScope" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "participantId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "study_participant_registration_receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiment_assignment_receipt" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "operationScope" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "assignmentId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experiment_assignment_receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_consent_command_receipt" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "operationScope" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "resultKind" "StudyConsentResultKind" NOT NULL,
    "consentEventId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "study_consent_command_receipt_pkey" PRIMARY KEY ("id")
);

-- ===================================================================================================
-- 3. Indexes
-- ===================================================================================================

-- CreateIndex
CREATE UNIQUE INDEX "analysis_protocol_protocolVersion_key" ON "analysis_protocol"("protocolVersion");

-- CreateIndex
CREATE INDEX "analysis_protocol_lifecycleStatus_idx" ON "analysis_protocol"("lifecycleStatus");

-- CreateIndex
CREATE UNIQUE INDEX "experiment_experimentCode_key" ON "experiment"("experimentCode");

-- CreateIndex
CREATE INDEX "experiment_frozenProtocolId_idx" ON "experiment"("frozenProtocolId");

-- CreateIndex
CREATE UNIQUE INDEX "study_participant_recruitmentSubjectKey_key" ON "study_participant"("recruitmentSubjectKey");

-- CreateIndex
CREATE UNIQUE INDEX "study_participant_participantCode_key" ON "study_participant"("participantCode");

-- CreateIndex
CREATE INDEX "experiment_assignment_experimentId_idx" ON "experiment_assignment"("experimentId");

-- CreateIndex
CREATE INDEX "experiment_assignment_participantId_idx" ON "experiment_assignment"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "experiment_assignment_experimentId_participantId_key" ON "experiment_assignment"("experimentId", "participantId");

-- CreateIndex
CREATE INDEX "study_consent_event_assignmentId_idx" ON "study_consent_event"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "study_consent_event_assignmentId_consentSeq_key" ON "study_consent_event"("assignmentId", "consentSeq");

-- CreateIndex
CREATE INDEX "analysis_protocol_command_receipt_analysisProtocolId_idx" ON "analysis_protocol_command_receipt"("analysisProtocolId");

-- CreateIndex
CREATE UNIQUE INDEX "analysis_protocol_command_receipt_operationScope_idempotenc_key" ON "analysis_protocol_command_receipt"("operationScope", "idempotencyKey");

-- CreateIndex
CREATE INDEX "experiment_create_receipt_experimentId_idx" ON "experiment_create_receipt"("experimentId");

-- CreateIndex
CREATE UNIQUE INDEX "experiment_create_receipt_operationScope_idempotencyKey_key" ON "experiment_create_receipt"("operationScope", "idempotencyKey");

-- CreateIndex
CREATE INDEX "study_participant_registration_receipt_participantId_idx" ON "study_participant_registration_receipt"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "study_participant_registration_receipt_operationScope_idemp_key" ON "study_participant_registration_receipt"("operationScope", "idempotencyKey");

-- CreateIndex
CREATE INDEX "experiment_assignment_receipt_assignmentId_idx" ON "experiment_assignment_receipt"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "experiment_assignment_receipt_operationScope_idempotencyKey_key" ON "experiment_assignment_receipt"("operationScope", "idempotencyKey");

-- CreateIndex
CREATE INDEX "study_consent_command_receipt_consentEventId_idx" ON "study_consent_command_receipt"("consentEventId");

-- CreateIndex
CREATE UNIQUE INDEX "study_consent_command_receipt_operationScope_idempotencyKey_key" ON "study_consent_command_receipt"("operationScope", "idempotencyKey");

-- ===================================================================================================
-- 4. Foreign keys
-- ===================================================================================================

-- AddForeignKey
ALTER TABLE "experiment" ADD CONSTRAINT "experiment_frozenProtocolId_fkey" FOREIGN KEY ("frozenProtocolId") REFERENCES "analysis_protocol"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiment_assignment" ADD CONSTRAINT "experiment_assignment_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "experiment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiment_assignment" ADD CONSTRAINT "experiment_assignment_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "study_participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_consent_event" ADD CONSTRAINT "study_consent_event_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "experiment_assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_protocol_command_receipt" ADD CONSTRAINT "analysis_protocol_command_receipt_analysisProtocolId_fkey" FOREIGN KEY ("analysisProtocolId") REFERENCES "analysis_protocol"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiment_create_receipt" ADD CONSTRAINT "experiment_create_receipt_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "experiment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_participant_registration_receipt" ADD CONSTRAINT "study_participant_registration_receipt_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "study_participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiment_assignment_receipt" ADD CONSTRAINT "experiment_assignment_receipt_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "experiment_assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_consent_command_receipt" ADD CONSTRAINT "study_consent_command_receipt_consentEventId_fkey" FOREIGN KEY ("consentEventId") REFERENCES "study_consent_event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ===================================================================================================
-- 5. CHECK constraints (single-table, legal — spec §8.11, §9/§21)
-- ===================================================================================================

-- Consent provenance ↔ action ↔ assertedEffectiveAt (spec §8.11). GRANTED carries all provenance and
-- a NULL asserted effective instant; WITHDRAWN carries NULL provenance (assertedEffectiveAt free).
ALTER TABLE "study_consent_event" ADD CONSTRAINT "study_consent_event_action_provenance_ck" CHECK (
    ("action" = 'GRANTED'
        AND "consentVersion" IS NOT NULL
        AND "privacyNoticeVersion" IS NOT NULL
        AND "optionalEvidenceConsent" IS NOT NULL
        AND "assertedEffectiveAt" IS NULL)
    OR
    ("action" = 'WITHDRAWN'
        AND "consentVersion" IS NULL
        AND "privacyNoticeVersion" IS NULL
        AND "optionalEvidenceConsent" IS NULL)
);

-- Receipt operationScope is a trusted constant, never caller data (spec §9). Restrict each table to
-- exactly its sanctioned scope(s); resultKind on the consent receipt is already an enum type.
ALTER TABLE "analysis_protocol_command_receipt" ADD CONSTRAINT "analysis_protocol_command_receipt_scope_ck"
    CHECK ("operationScope" IN ('PROTOCOL_REGISTER_V1', 'PROTOCOL_FREEZE_V1'));
ALTER TABLE "experiment_create_receipt" ADD CONSTRAINT "experiment_create_receipt_scope_ck"
    CHECK ("operationScope" = 'EXPERIMENT_CREATE_V1');
ALTER TABLE "study_participant_registration_receipt" ADD CONSTRAINT "study_participant_registration_receipt_scope_ck"
    CHECK ("operationScope" = 'PARTICIPANT_REGISTER_V1');
ALTER TABLE "experiment_assignment_receipt" ADD CONSTRAINT "experiment_assignment_receipt_scope_ck"
    CHECK ("operationScope" = 'ASSIGN_PARTICIPANT_V1');
ALTER TABLE "study_consent_command_receipt" ADD CONSTRAINT "study_consent_command_receipt_scope_ck"
    CHECK ("operationScope" IN ('CONSENT_GRANT_V1', 'CONSENT_WITHDRAW_V1'));

-- ===================================================================================================
-- 6. AnalysisProtocol freeze-guard (spec §2.2)
--    The ONLY permitted UPDATE is the one-way DRAFT→FROZEN transition with frozenAt NULL→timestamp and
--    every other column unchanged. A FROZEN row rejects every UPDATE; DELETE is rejected; TRUNCATE is
--    rejected (§7 below). There is intentionally NO DRAFT-editing path.
-- ===================================================================================================

CREATE OR REPLACE FUNCTION "analysis_protocol_freeze_guard"() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'analysis_protocol is delete-protected (freeze-guard): DELETE is forbidden'
            USING ERRCODE = 'restrict_violation';
    END IF;

    -- TG_OP = 'UPDATE' from here.
    IF OLD."lifecycleStatus" = 'FROZEN' THEN
        RAISE EXCEPTION 'analysis_protocol % is FROZEN and immutable: no UPDATE is permitted', OLD."id"
            USING ERRCODE = 'restrict_violation';
    END IF;

    -- OLD is DRAFT: accept ONLY the exact DRAFT→FROZEN lifecycle transition (lifecycleStatus →FROZEN,
    -- frozenAt NULL→NOT NULL) with every other column byte/semantically unchanged.
    IF NEW."lifecycleStatus" = 'FROZEN'
        AND OLD."frozenAt" IS NULL
        AND NEW."frozenAt" IS NOT NULL
        AND NEW."id" = OLD."id"
        AND NEW."protocolVersion" = OLD."protocolVersion"
        AND NEW."definitionSchemaVersion" = OLD."definitionSchemaVersion"
        AND NEW."canonicalizationVersion" = OLD."canonicalizationVersion"
        AND NEW."definitionJson" = OLD."definitionJson"
        AND NEW."definitionDigest" = OLD."definitionDigest"
        AND NEW."createdAt" = OLD."createdAt"
    THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'analysis_protocol UPDATE is restricted to the one-way DRAFT->FROZEN transition (only lifecycleStatus DRAFT->FROZEN and frozenAt NULL->timestamp may change; all other columns must be unchanged)'
        USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "analysis_protocol_freeze_guard_update"
    BEFORE UPDATE ON "analysis_protocol"
    FOR EACH ROW EXECUTE FUNCTION "analysis_protocol_freeze_guard"();

CREATE TRIGGER "analysis_protocol_freeze_guard_delete"
    BEFORE DELETE ON "analysis_protocol"
    FOR EACH ROW EXECUTE FUNCTION "analysis_protocol_freeze_guard"();

-- ===================================================================================================
-- 7. Experiment must reference a FROZEN protocol at INSERT (cross-table ⇒ trigger, spec §4)
-- ===================================================================================================

CREATE OR REPLACE FUNCTION "experiment_requires_frozen_protocol"() RETURNS trigger AS $$
DECLARE
    status text;
BEGIN
    SELECT "lifecycleStatus"::text INTO status
        FROM "analysis_protocol" WHERE "id" = NEW."frozenProtocolId";
    IF status IS NULL THEN
        RAISE EXCEPTION 'experiment.frozenProtocolId % references a non-existent analysis_protocol', NEW."frozenProtocolId"
            USING ERRCODE = 'foreign_key_violation';
    END IF;
    IF status <> 'FROZEN' THEN
        RAISE EXCEPTION 'experiment.frozenProtocolId % must reference a FROZEN analysis_protocol (found %)', NEW."frozenProtocolId", status
            USING ERRCODE = 'restrict_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "experiment_frozen_protocol_guard"
    BEFORE INSERT ON "experiment"
    FOR EACH ROW EXECUTE FUNCTION "experiment_requires_frozen_protocol"();

-- ===================================================================================================
-- 8. Append-only / immutability guards (spec §7, §8, §4.1, §10 preamble)
--    One shared RAISE function; per-table BEFORE UPDATE/DELETE/TRUNCATE triggers. `experiment` is
--    immutable immediately after insert; the scientific tables and every receipt table are append-only.
--    AnalysisProtocol is intentionally NOT here (freeze-guard above); only its TRUNCATE is added below.
-- ===================================================================================================

CREATE OR REPLACE FUNCTION "study_forbid_mutation"() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION '% is append-only/immutable: % is forbidden on this study table', TG_TABLE_NAME, TG_OP
        USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

-- AnalysisProtocol: TRUNCATE always forbidden (UPDATE/DELETE handled by the freeze-guard above).
CREATE TRIGGER "analysis_protocol_no_truncate"
    BEFORE TRUNCATE ON "analysis_protocol"
    FOR EACH STATEMENT EXECUTE FUNCTION "study_forbid_mutation"();

-- Experiment: immutable immediately after insert.
CREATE TRIGGER "experiment_no_update"
    BEFORE UPDATE ON "experiment" FOR EACH ROW EXECUTE FUNCTION "study_forbid_mutation"();
CREATE TRIGGER "experiment_no_delete"
    BEFORE DELETE ON "experiment" FOR EACH ROW EXECUTE FUNCTION "study_forbid_mutation"();
CREATE TRIGGER "experiment_no_truncate"
    BEFORE TRUNCATE ON "experiment" FOR EACH STATEMENT EXECUTE FUNCTION "study_forbid_mutation"();

-- StudyParticipant: append-only.
CREATE TRIGGER "study_participant_no_update"
    BEFORE UPDATE ON "study_participant" FOR EACH ROW EXECUTE FUNCTION "study_forbid_mutation"();
CREATE TRIGGER "study_participant_no_delete"
    BEFORE DELETE ON "study_participant" FOR EACH ROW EXECUTE FUNCTION "study_forbid_mutation"();
CREATE TRIGGER "study_participant_no_truncate"
    BEFORE TRUNCATE ON "study_participant" FOR EACH STATEMENT EXECUTE FUNCTION "study_forbid_mutation"();

-- ExperimentAssignment: append-only; never deleted on withdrawal (§7).
CREATE TRIGGER "experiment_assignment_no_update"
    BEFORE UPDATE ON "experiment_assignment" FOR EACH ROW EXECUTE FUNCTION "study_forbid_mutation"();
CREATE TRIGGER "experiment_assignment_no_delete"
    BEFORE DELETE ON "experiment_assignment" FOR EACH ROW EXECUTE FUNCTION "study_forbid_mutation"();
CREATE TRIGGER "experiment_assignment_no_truncate"
    BEFORE TRUNCATE ON "experiment_assignment" FOR EACH STATEMENT EXECUTE FUNCTION "study_forbid_mutation"();

-- StudyConsentEvent: append-only event stream (§8).
CREATE TRIGGER "study_consent_event_no_update"
    BEFORE UPDATE ON "study_consent_event" FOR EACH ROW EXECUTE FUNCTION "study_forbid_mutation"();
CREATE TRIGGER "study_consent_event_no_delete"
    BEFORE DELETE ON "study_consent_event" FOR EACH ROW EXECUTE FUNCTION "study_forbid_mutation"();
CREATE TRIGGER "study_consent_event_no_truncate"
    BEFORE TRUNCATE ON "study_consent_event" FOR EACH STATEMENT EXECUTE FUNCTION "study_forbid_mutation"();

-- Receipt tables: append-only (§9).
CREATE TRIGGER "analysis_protocol_command_receipt_no_update"
    BEFORE UPDATE ON "analysis_protocol_command_receipt" FOR EACH ROW EXECUTE FUNCTION "study_forbid_mutation"();
CREATE TRIGGER "analysis_protocol_command_receipt_no_delete"
    BEFORE DELETE ON "analysis_protocol_command_receipt" FOR EACH ROW EXECUTE FUNCTION "study_forbid_mutation"();
CREATE TRIGGER "analysis_protocol_command_receipt_no_truncate"
    BEFORE TRUNCATE ON "analysis_protocol_command_receipt" FOR EACH STATEMENT EXECUTE FUNCTION "study_forbid_mutation"();

CREATE TRIGGER "experiment_create_receipt_no_update"
    BEFORE UPDATE ON "experiment_create_receipt" FOR EACH ROW EXECUTE FUNCTION "study_forbid_mutation"();
CREATE TRIGGER "experiment_create_receipt_no_delete"
    BEFORE DELETE ON "experiment_create_receipt" FOR EACH ROW EXECUTE FUNCTION "study_forbid_mutation"();
CREATE TRIGGER "experiment_create_receipt_no_truncate"
    BEFORE TRUNCATE ON "experiment_create_receipt" FOR EACH STATEMENT EXECUTE FUNCTION "study_forbid_mutation"();

CREATE TRIGGER "study_participant_registration_receipt_no_update"
    BEFORE UPDATE ON "study_participant_registration_receipt" FOR EACH ROW EXECUTE FUNCTION "study_forbid_mutation"();
CREATE TRIGGER "study_participant_registration_receipt_no_delete"
    BEFORE DELETE ON "study_participant_registration_receipt" FOR EACH ROW EXECUTE FUNCTION "study_forbid_mutation"();
CREATE TRIGGER "study_participant_registration_receipt_no_truncate"
    BEFORE TRUNCATE ON "study_participant_registration_receipt" FOR EACH STATEMENT EXECUTE FUNCTION "study_forbid_mutation"();

CREATE TRIGGER "experiment_assignment_receipt_no_update"
    BEFORE UPDATE ON "experiment_assignment_receipt" FOR EACH ROW EXECUTE FUNCTION "study_forbid_mutation"();
CREATE TRIGGER "experiment_assignment_receipt_no_delete"
    BEFORE DELETE ON "experiment_assignment_receipt" FOR EACH ROW EXECUTE FUNCTION "study_forbid_mutation"();
CREATE TRIGGER "experiment_assignment_receipt_no_truncate"
    BEFORE TRUNCATE ON "experiment_assignment_receipt" FOR EACH STATEMENT EXECUTE FUNCTION "study_forbid_mutation"();

CREATE TRIGGER "study_consent_command_receipt_no_update"
    BEFORE UPDATE ON "study_consent_command_receipt" FOR EACH ROW EXECUTE FUNCTION "study_forbid_mutation"();
CREATE TRIGGER "study_consent_command_receipt_no_delete"
    BEFORE DELETE ON "study_consent_command_receipt" FOR EACH ROW EXECUTE FUNCTION "study_forbid_mutation"();
CREATE TRIGGER "study_consent_command_receipt_no_truncate"
    BEFORE TRUNCATE ON "study_consent_command_receipt" FOR EACH STATEMENT EXECUTE FUNCTION "study_forbid_mutation"();

COMMIT;

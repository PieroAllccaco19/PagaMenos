-- PagaMenos · M3.5B-A2 — PurchaseIntent lifecycle · deterministic decision freeze · exact binding.
--
-- ADDITIVE over accepted A1/M3.5A: creates NEW tables/enums only; never ALTERs decision_snapshot /
-- experiment_assignment / A1 tables (the two Prisma virtual back-relations add NO SQL columns).
-- Base DDL (enums, tables, indexes, FKs) is exactly what `prisma migrate diff` emits for the schema
-- delta; the DATABASE-LEVEL enforcement Prisma cannot express is appended and gated by db:migrate:check:
--   • every A2 table is append-only (BEFORE UPDATE/DELETE/TRUNCATE RAISE);
--   • each receipt table CHECK-restricts operationScope to its trusted constant;
--   • invalidation self-link CHECK (replacement <> invalidated);
--   • finalization insert-time coherence: context + eligibility profile belong to the intent/assignment;
--   • invalidation insert-time coherence: replacement belongs to the invalidated intent's assignment.
-- ATOMIC: one transaction.

BEGIN;

-- CreateEnum
CREATE TYPE "EntrySource" AS ENUM ('DIRECT', 'CONTENT', 'SHARED_LINK', 'RESEARCH_LINK', 'AUTH_LINK', 'SAVED_DECISION', 'OTHER');

-- CreateEnum
CREATE TYPE "PurchaseIntentType" AS ENUM ('BUYING_NOW', 'BUYING_TODAY', 'CONSIDERING_LATER', 'EXPLORATORY');

-- CreateEnum
CREATE TYPE "PurchaseSignatureKindA2" AS ENUM ('BILL', 'TICKETS', 'EXACT_ITEMS', 'NOMINAL_PACKAGE');

-- CreateEnum
CREATE TYPE "PurchaseIntentInvalidationReason" AS ENUM ('SUPERSEDED_BY_REPLACEMENT', 'PARTICIPANT_CORRECTION', 'DATA_ENTRY_ERROR', 'OTHER');

-- CreateEnum
CREATE TYPE "PurchaseIntentCreateResultKind" AS ENUM ('CREATED', 'CAPTURE_ALIAS');

-- CreateEnum
CREATE TYPE "PurchaseIntentContextResultKind" AS ENUM ('APPENDED', 'CONTEXT_ALIAS');

-- CreateEnum
CREATE TYPE "EligibilityProfileResultKind" AS ENUM ('APPENDED', 'PROFILE_ALIAS');

-- CreateEnum
CREATE TYPE "PurchaseIntentFinalizationResultKind" AS ENUM ('FINALIZED', 'FINALIZE_ALIAS');

-- CreateEnum
CREATE TYPE "PurchaseIntentInvalidationResultKind" AS ENUM ('INVALIDATED', 'INVALIDATE_ALIAS');

-- CreateTable
CREATE TABLE "purchase_intent_capture_token" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assignmentId" UUID NOT NULL,
    "clientCorrelationNonce" TEXT NOT NULL,
    "intentCaptureKey" TEXT NOT NULL,
    "entrySource" "EntrySource" NOT NULL,
    "issuedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_intent_capture_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_intent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "captureTokenId" UUID NOT NULL,
    "intentType" "PurchaseIntentType" NOT NULL,
    "initiatedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_intent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_intent_context_version" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "intentId" UUID NOT NULL,
    "contextSeq" INTEGER NOT NULL,
    "contextCaptureKey" TEXT NOT NULL,
    "contextSchemaVersion" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "signatureKind" "PurchaseSignatureKindA2" NOT NULL,
    "intendedTransactionAt" TIMESTAMPTZ(6) NOT NULL,
    "purchaseSignatureJson" JSONB NOT NULL,
    "capturedAt" TIMESTAMPTZ(6) NOT NULL,
    "recordedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_intent_context_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eligibility_profile_version" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assignmentId" UUID NOT NULL,
    "profileSeq" INTEGER NOT NULL,
    "profileCaptureKey" TEXT NOT NULL,
    "portfolioSchemaVersion" TEXT NOT NULL,
    "portfolioJson" JSONB NOT NULL,
    "capturedAt" TIMESTAMPTZ(6) NOT NULL,
    "recordedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eligibility_profile_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_intent_finalization" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "intentId" UUID NOT NULL,
    "contextVersionId" UUID NOT NULL,
    "eligibilityProfileVersionId" UUID NOT NULL,
    "finalizedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "purchase_intent_finalization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_intent_invalidation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invalidatedIntentId" UUID NOT NULL,
    "replacementIntentId" UUID,
    "invalidatedAt" TIMESTAMPTZ(6) NOT NULL,
    "reasonCode" "PurchaseIntentInvalidationReason",

    CONSTRAINT "purchase_intent_invalidation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_intent_decision_request" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "intentId" UUID NOT NULL,
    "finalizationId" UUID NOT NULL,
    "decisionRequestSchemaVersion" TEXT NOT NULL,
    "exactValidatedDecideInputJson" JSONB NOT NULL,
    "decideInputHash" TEXT NOT NULL,
    "expectedEngineInputSchemaVersion" TEXT NOT NULL,
    "expectedEngineContractVersion" TEXT NOT NULL,
    "expectedCorpusVersion" TEXT NOT NULL,
    "holidayCalendarVersion" TEXT NOT NULL,
    "businessDecisionKey" TEXT NOT NULL,
    "m3_5aIdempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_intent_decision_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_intent_decision_binding" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "decisionRequestId" UUID NOT NULL,
    "snapshotId" UUID NOT NULL,
    "boundAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_intent_decision_binding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_intent_create_receipt" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "operationScope" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "resultKind" "PurchaseIntentCreateResultKind" NOT NULL,
    "intentId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_intent_create_receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_intent_context_command_receipt" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "operationScope" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "resultKind" "PurchaseIntentContextResultKind" NOT NULL,
    "contextVersionId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_intent_context_command_receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eligibility_profile_command_receipt" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "operationScope" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "resultKind" "EligibilityProfileResultKind" NOT NULL,
    "eligibilityProfileVersionId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eligibility_profile_command_receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_intent_finalization_receipt" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "operationScope" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "resultKind" "PurchaseIntentFinalizationResultKind" NOT NULL,
    "finalizationId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_intent_finalization_receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_intent_invalidation_receipt" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "operationScope" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "resultKind" "PurchaseIntentInvalidationResultKind" NOT NULL,
    "invalidationId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_intent_invalidation_receipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "purchase_intent_capture_token_intentCaptureKey_key" ON "purchase_intent_capture_token"("intentCaptureKey");

-- CreateIndex
CREATE INDEX "purchase_intent_capture_token_assignmentId_idx" ON "purchase_intent_capture_token"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_intent_capture_token_assignmentId_clientCorrelatio_key" ON "purchase_intent_capture_token"("assignmentId", "clientCorrelationNonce");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_intent_captureTokenId_key" ON "purchase_intent"("captureTokenId");

-- CreateIndex
CREATE INDEX "purchase_intent_context_version_intentId_idx" ON "purchase_intent_context_version"("intentId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_intent_context_version_intentId_contextSeq_key" ON "purchase_intent_context_version"("intentId", "contextSeq");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_intent_context_version_intentId_contextCaptureKey_key" ON "purchase_intent_context_version"("intentId", "contextCaptureKey");

-- CreateIndex
CREATE INDEX "eligibility_profile_version_assignmentId_idx" ON "eligibility_profile_version"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "eligibility_profile_version_assignmentId_profileSeq_key" ON "eligibility_profile_version"("assignmentId", "profileSeq");

-- CreateIndex
CREATE UNIQUE INDEX "eligibility_profile_version_assignmentId_profileCaptureKey_key" ON "eligibility_profile_version"("assignmentId", "profileCaptureKey");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_intent_finalization_intentId_key" ON "purchase_intent_finalization"("intentId");

-- CreateIndex
CREATE INDEX "purchase_intent_finalization_contextVersionId_idx" ON "purchase_intent_finalization"("contextVersionId");

-- CreateIndex
CREATE INDEX "purchase_intent_finalization_eligibilityProfileVersionId_idx" ON "purchase_intent_finalization"("eligibilityProfileVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_intent_invalidation_invalidatedIntentId_key" ON "purchase_intent_invalidation"("invalidatedIntentId");

-- CreateIndex
CREATE INDEX "purchase_intent_invalidation_replacementIntentId_idx" ON "purchase_intent_invalidation"("replacementIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_intent_decision_request_intentId_key" ON "purchase_intent_decision_request"("intentId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_intent_decision_request_finalizationId_key" ON "purchase_intent_decision_request"("finalizationId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_intent_decision_request_businessDecisionKey_key" ON "purchase_intent_decision_request"("businessDecisionKey");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_intent_decision_request_m3_5aIdempotencyKey_key" ON "purchase_intent_decision_request"("m3_5aIdempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_intent_decision_binding_decisionRequestId_key" ON "purchase_intent_decision_binding"("decisionRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_intent_decision_binding_snapshotId_key" ON "purchase_intent_decision_binding"("snapshotId");

-- CreateIndex
CREATE INDEX "purchase_intent_create_receipt_intentId_idx" ON "purchase_intent_create_receipt"("intentId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_intent_create_receipt_operationScope_idempotencyKe_key" ON "purchase_intent_create_receipt"("operationScope", "idempotencyKey");

-- CreateIndex
CREATE INDEX "purchase_intent_context_command_receipt_contextVersionId_idx" ON "purchase_intent_context_command_receipt"("contextVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_intent_context_command_receipt_operationScope_idem_key" ON "purchase_intent_context_command_receipt"("operationScope", "idempotencyKey");

-- CreateIndex
CREATE INDEX "eligibility_profile_command_receipt_eligibilityProfileVersi_idx" ON "eligibility_profile_command_receipt"("eligibilityProfileVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "eligibility_profile_command_receipt_operationScope_idempote_key" ON "eligibility_profile_command_receipt"("operationScope", "idempotencyKey");

-- CreateIndex
CREATE INDEX "purchase_intent_finalization_receipt_finalizationId_idx" ON "purchase_intent_finalization_receipt"("finalizationId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_intent_finalization_receipt_operationScope_idempot_key" ON "purchase_intent_finalization_receipt"("operationScope", "idempotencyKey");

-- CreateIndex
CREATE INDEX "purchase_intent_invalidation_receipt_invalidationId_idx" ON "purchase_intent_invalidation_receipt"("invalidationId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_intent_invalidation_receipt_operationScope_idempot_key" ON "purchase_intent_invalidation_receipt"("operationScope", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "purchase_intent_capture_token" ADD CONSTRAINT "purchase_intent_capture_token_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "experiment_assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_intent" ADD CONSTRAINT "purchase_intent_captureTokenId_fkey" FOREIGN KEY ("captureTokenId") REFERENCES "purchase_intent_capture_token"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_intent_context_version" ADD CONSTRAINT "purchase_intent_context_version_intentId_fkey" FOREIGN KEY ("intentId") REFERENCES "purchase_intent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eligibility_profile_version" ADD CONSTRAINT "eligibility_profile_version_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "experiment_assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_intent_finalization" ADD CONSTRAINT "purchase_intent_finalization_intentId_fkey" FOREIGN KEY ("intentId") REFERENCES "purchase_intent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_intent_finalization" ADD CONSTRAINT "purchase_intent_finalization_contextVersionId_fkey" FOREIGN KEY ("contextVersionId") REFERENCES "purchase_intent_context_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_intent_finalization" ADD CONSTRAINT "purchase_intent_finalization_eligibilityProfileVersionId_fkey" FOREIGN KEY ("eligibilityProfileVersionId") REFERENCES "eligibility_profile_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_intent_invalidation" ADD CONSTRAINT "purchase_intent_invalidation_invalidatedIntentId_fkey" FOREIGN KEY ("invalidatedIntentId") REFERENCES "purchase_intent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_intent_invalidation" ADD CONSTRAINT "purchase_intent_invalidation_replacementIntentId_fkey" FOREIGN KEY ("replacementIntentId") REFERENCES "purchase_intent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_intent_decision_request" ADD CONSTRAINT "purchase_intent_decision_request_intentId_fkey" FOREIGN KEY ("intentId") REFERENCES "purchase_intent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_intent_decision_request" ADD CONSTRAINT "purchase_intent_decision_request_finalizationId_fkey" FOREIGN KEY ("finalizationId") REFERENCES "purchase_intent_finalization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_intent_decision_binding" ADD CONSTRAINT "purchase_intent_decision_binding_decisionRequestId_fkey" FOREIGN KEY ("decisionRequestId") REFERENCES "purchase_intent_decision_request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_intent_decision_binding" ADD CONSTRAINT "purchase_intent_decision_binding_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "decision_snapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_intent_create_receipt" ADD CONSTRAINT "purchase_intent_create_receipt_intentId_fkey" FOREIGN KEY ("intentId") REFERENCES "purchase_intent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_intent_context_command_receipt" ADD CONSTRAINT "purchase_intent_context_command_receipt_contextVersionId_fkey" FOREIGN KEY ("contextVersionId") REFERENCES "purchase_intent_context_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eligibility_profile_command_receipt" ADD CONSTRAINT "eligibility_profile_command_receipt_eligibilityProfileVers_fkey" FOREIGN KEY ("eligibilityProfileVersionId") REFERENCES "eligibility_profile_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_intent_finalization_receipt" ADD CONSTRAINT "purchase_intent_finalization_receipt_finalizationId_fkey" FOREIGN KEY ("finalizationId") REFERENCES "purchase_intent_finalization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_intent_invalidation_receipt" ADD CONSTRAINT "purchase_intent_invalidation_receipt_invalidationId_fkey" FOREIGN KEY ("invalidationId") REFERENCES "purchase_intent_invalidation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ===================================================================================================
-- Append-only immutability (all A2 tables): UPDATE / DELETE / TRUNCATE rejected at the DB level.
-- ===================================================================================================
CREATE OR REPLACE FUNCTION "purchase_intent_forbid_mutation"() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION '% is forbidden on append-only A2 table %', TG_OP, TG_TABLE_NAME
        USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'purchase_intent_capture_token','purchase_intent','purchase_intent_context_version',
    'eligibility_profile_version','purchase_intent_finalization','purchase_intent_invalidation',
    'purchase_intent_decision_request','purchase_intent_decision_binding',
    'purchase_intent_create_receipt','purchase_intent_context_command_receipt',
    'eligibility_profile_command_receipt','purchase_intent_finalization_receipt',
    'purchase_intent_invalidation_receipt'
  ] LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION "purchase_intent_forbid_mutation"();', t || '_no_update', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE DELETE ON %I FOR EACH ROW EXECUTE FUNCTION "purchase_intent_forbid_mutation"();', t || '_no_delete', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE TRUNCATE ON %I FOR EACH STATEMENT EXECUTE FUNCTION "purchase_intent_forbid_mutation"();', t || '_no_truncate', t);
  END LOOP;
END $$;

-- ===================================================================================================
-- Receipt operationScope CHECK constraints (trusted constants, A2 §24) + invalidation self-link CHECK.
-- ===================================================================================================
ALTER TABLE "purchase_intent_create_receipt"
  ADD CONSTRAINT "purchase_intent_create_receipt_scope_chk" CHECK ("operationScope" = 'INTENT_CREATE_V1');
ALTER TABLE "purchase_intent_context_command_receipt"
  ADD CONSTRAINT "purchase_intent_context_command_receipt_scope_chk" CHECK ("operationScope" = 'INTENT_CONTEXT_APPEND_V1');
ALTER TABLE "eligibility_profile_command_receipt"
  ADD CONSTRAINT "eligibility_profile_command_receipt_scope_chk" CHECK ("operationScope" = 'ELIGIBILITY_PROFILE_APPEND_V1');
ALTER TABLE "purchase_intent_finalization_receipt"
  ADD CONSTRAINT "purchase_intent_finalization_receipt_scope_chk" CHECK ("operationScope" = 'INTENT_FINALIZE_V1');
ALTER TABLE "purchase_intent_invalidation_receipt"
  ADD CONSTRAINT "purchase_intent_invalidation_receipt_scope_chk" CHECK ("operationScope" = 'INTENT_INVALIDATE_V1');
ALTER TABLE "purchase_intent_invalidation"
  ADD CONSTRAINT "purchase_intent_invalidation_no_self_link_chk"
  CHECK ("replacementIntentId" IS NULL OR "replacementIntentId" <> "invalidatedIntentId");

-- ===================================================================================================
-- Finalization insert-time coherence (cross-table trigger, A2 §9/§25).
-- ===================================================================================================
CREATE OR REPLACE FUNCTION "purchase_intent_finalization_coherence"() RETURNS trigger AS $$
DECLARE ctx_intent uuid; intent_asg uuid; profile_asg uuid;
BEGIN
    SELECT "intentId" INTO ctx_intent FROM "purchase_intent_context_version" WHERE "id" = NEW."contextVersionId";
    IF ctx_intent IS DISTINCT FROM NEW."intentId" THEN
        RAISE EXCEPTION 'finalization contextVersion does not belong to intent'
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    SELECT tok."assignmentId" INTO intent_asg
      FROM "purchase_intent" pi
      JOIN "purchase_intent_capture_token" tok ON tok."id" = pi."captureTokenId"
      WHERE pi."id" = NEW."intentId";
    SELECT "assignmentId" INTO profile_asg
      FROM "eligibility_profile_version" WHERE "id" = NEW."eligibilityProfileVersionId";
    IF profile_asg IS DISTINCT FROM intent_asg THEN
        RAISE EXCEPTION 'finalization eligibility profile assignment mismatch for intent'
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "purchase_intent_finalization_coherence_ins"
    BEFORE INSERT ON "purchase_intent_finalization"
    FOR EACH ROW EXECUTE FUNCTION "purchase_intent_finalization_coherence"();

-- ===================================================================================================
-- Invalidation insert-time coherence (A2 §10/§23): replacement belongs to the same assignment.
-- ===================================================================================================
CREATE OR REPLACE FUNCTION "purchase_intent_invalidation_same_assignment"() RETURNS trigger AS $$
DECLARE inv_asg uuid; rep_asg uuid;
BEGIN
    IF NEW."replacementIntentId" IS NULL THEN RETURN NEW; END IF;
    SELECT tok."assignmentId" INTO inv_asg
      FROM "purchase_intent" pi
      JOIN "purchase_intent_capture_token" tok ON tok."id" = pi."captureTokenId"
      WHERE pi."id" = NEW."invalidatedIntentId";
    SELECT tok."assignmentId" INTO rep_asg
      FROM "purchase_intent" pi
      JOIN "purchase_intent_capture_token" tok ON tok."id" = pi."captureTokenId"
      WHERE pi."id" = NEW."replacementIntentId";
    IF rep_asg IS DISTINCT FROM inv_asg THEN
        RAISE EXCEPTION 'replacement intent must belong to the same assignment as the invalidated intent'
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "purchase_intent_invalidation_same_assignment_ins"
    BEFORE INSERT ON "purchase_intent_invalidation"
    FOR EACH ROW EXECUTE FUNCTION "purchase_intent_invalidation_same_assignment"();

COMMIT;

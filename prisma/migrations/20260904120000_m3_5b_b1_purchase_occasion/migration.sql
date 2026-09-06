-- PagaMenos · M3.5B-B1 — Opportunity Identity (PurchaseOccasion).
--
-- ADDITIVE over accepted M3.5A / A1 / A2: creates NEW tables + one enum only. It NEVER alters
-- decision_snapshot, any A1 table, or any A2 table (the four Prisma virtual back-relations add NO SQL
-- column). No accepted migration is edited; this is a new, forward-only migration in the chain.
--
-- Base DDL (enum, tables, indexes, FKs) is exactly what `prisma migrate diff` emits for the schema
-- delta. The DATABASE-LEVEL enforcement Prisma cannot express is appended below and gated offline by
-- `pnpm db:migrate:check`:
--   * both B1 tables are append-only (BEFORE UPDATE/DELETE/TRUNCATE RAISE) — identity never mutates;
--   * the receipt CHECK-restricts operationScope to its trusted constant;
--   * CHECKs reject a malformed identity (unknown schema version, blank merchant, non-sha256 digest);
--   * an insert-time cross-table trigger PROVES every immutable identity fact against the accepted A2
--     authorities (finalization belongs to the intent, pins exactly this context version, the context
--     belongs to the intent, the assignment is the intent capture token assignment, merchant and
--     intended instant equal the pinned context) and REJECTS an origin intent A2 already invalidated.
-- ATOMIC: one transaction.

BEGIN;

-- CreateEnum
CREATE TYPE "PurchaseOccasionResultKind" AS ENUM ('MATERIALIZED', 'OCCASION_ALIAS');

-- CreateTable
CREATE TABLE "purchase_occasion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "occasionSchemaVersion" TEXT NOT NULL,
    "originIntentId" UUID NOT NULL,
    "originFinalizationId" UUID NOT NULL,
    "originContextVersionId" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "merchantId" TEXT NOT NULL,
    "intendedTransactionAt" TIMESTAMPTZ(6) NOT NULL,
    "identityDigest" TEXT NOT NULL,
    "materializedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_occasion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_occasion_materialization_receipt" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "operationScope" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "resultKind" "PurchaseOccasionResultKind" NOT NULL,
    "occasionId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_occasion_materialization_receipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "purchase_occasion_originIntentId_key" ON "purchase_occasion"("originIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_occasion_originFinalizationId_key" ON "purchase_occasion"("originFinalizationId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_occasion_originContextVersionId_key" ON "purchase_occasion"("originContextVersionId");

-- CreateIndex
CREATE INDEX "purchase_occasion_assignmentId_idx" ON "purchase_occasion"("assignmentId");

-- CreateIndex
CREATE INDEX "purchase_occasion_merchantId_idx" ON "purchase_occasion"("merchantId");

-- CreateIndex
CREATE INDEX "purchase_occasion_intendedTransactionAt_idx" ON "purchase_occasion"("intendedTransactionAt");

-- CreateIndex
CREATE INDEX "purchase_occasion_materialization_receipt_occasionId_idx" ON "purchase_occasion_materialization_receipt"("occasionId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_occasion_materialization_receipt_operationScope_id_key" ON "purchase_occasion_materialization_receipt"("operationScope", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "purchase_occasion" ADD CONSTRAINT "purchase_occasion_originIntentId_fkey" FOREIGN KEY ("originIntentId") REFERENCES "purchase_intent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_occasion" ADD CONSTRAINT "purchase_occasion_originFinalizationId_fkey" FOREIGN KEY ("originFinalizationId") REFERENCES "purchase_intent_finalization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_occasion" ADD CONSTRAINT "purchase_occasion_originContextVersionId_fkey" FOREIGN KEY ("originContextVersionId") REFERENCES "purchase_intent_context_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_occasion" ADD CONSTRAINT "purchase_occasion_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "experiment_assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_occasion_materialization_receipt" ADD CONSTRAINT "purchase_occasion_materialization_receipt_occasionId_fkey" FOREIGN KEY ("occasionId") REFERENCES "purchase_occasion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ===================================================================================================
-- Append-only immutability (both B1 tables): UPDATE / DELETE / TRUNCATE rejected at the DB level.
-- An opportunity identity, once assigned, can never mutate — not even to "correct" a later fact.
-- Trigger names are LITERAL (never a dynamic DO-loop) so the offline db:migrate:check guard can grep
-- each one by name and fail if it is ever silently dropped.
-- ===================================================================================================
CREATE OR REPLACE FUNCTION "purchase_occasion_forbid_mutation"() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION '% is forbidden on append-only B1 table %', TG_OP, TG_TABLE_NAME
        USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "purchase_occasion_no_update"
    BEFORE UPDATE ON "purchase_occasion"
    FOR EACH ROW EXECUTE FUNCTION "purchase_occasion_forbid_mutation"();
CREATE TRIGGER "purchase_occasion_no_delete"
    BEFORE DELETE ON "purchase_occasion"
    FOR EACH ROW EXECUTE FUNCTION "purchase_occasion_forbid_mutation"();
CREATE TRIGGER "purchase_occasion_no_truncate"
    BEFORE TRUNCATE ON "purchase_occasion"
    FOR EACH STATEMENT EXECUTE FUNCTION "purchase_occasion_forbid_mutation"();

CREATE TRIGGER "purchase_occasion_materialization_receipt_no_update"
    BEFORE UPDATE ON "purchase_occasion_materialization_receipt"
    FOR EACH ROW EXECUTE FUNCTION "purchase_occasion_forbid_mutation"();
CREATE TRIGGER "purchase_occasion_materialization_receipt_no_delete"
    BEFORE DELETE ON "purchase_occasion_materialization_receipt"
    FOR EACH ROW EXECUTE FUNCTION "purchase_occasion_forbid_mutation"();
CREATE TRIGGER "purchase_occasion_materialization_receipt_no_truncate"
    BEFORE TRUNCATE ON "purchase_occasion_materialization_receipt"
    FOR EACH STATEMENT EXECUTE FUNCTION "purchase_occasion_forbid_mutation"();

-- ===================================================================================================
-- Trusted receipt scope + malformed-identity CHECKs.
-- ===================================================================================================
ALTER TABLE "purchase_occasion_materialization_receipt"
  ADD CONSTRAINT "purchase_occasion_materialization_receipt_scope_ck"
  CHECK ("operationScope" = 'OCCASION_MATERIALIZE_V1');

ALTER TABLE "purchase_occasion"
  ADD CONSTRAINT "purchase_occasion_schema_version_ck"
  CHECK ("occasionSchemaVersion" = 'pagamenos.purchase-occasion.v1');

ALTER TABLE "purchase_occasion"
  ADD CONSTRAINT "purchase_occasion_merchant_nonblank_ck"
  CHECK (btrim("merchantId") <> '');

ALTER TABLE "purchase_occasion"
  ADD CONSTRAINT "purchase_occasion_identity_digest_ck"
  CHECK ("identityDigest" ~ '^[0-9a-f]{64}$');

-- ===================================================================================================
-- Insert-time identity coherence (cross-table trigger). Every immutable identity fact is PROVEN
-- against the accepted A2 authorities; nothing is taken on the application word. An occasion whose
-- stored facts disagree with A2 is therefore not representable in the database.
-- ===================================================================================================
CREATE OR REPLACE FUNCTION "purchase_occasion_identity_coherence"() RETURNS trigger AS $$
DECLARE
    fin_intent uuid;
    fin_ctx    uuid;
    ctx_intent uuid;
    ctx_merch  text;
    ctx_at     timestamptz;
    intent_asg uuid;
    inv_id     uuid;
BEGIN
    -- (1) the pinned finalization must belong to the origin intent, and (2) pin exactly this context.
    SELECT "intentId", "contextVersionId" INTO fin_intent, fin_ctx
      FROM "purchase_intent_finalization" WHERE "id" = NEW."originFinalizationId";
    IF fin_intent IS NULL THEN
        RAISE EXCEPTION 'occasion references unknown finalization'
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    IF fin_intent IS DISTINCT FROM NEW."originIntentId" THEN
        RAISE EXCEPTION 'occasion finalization does not belong to the origin intent'
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    IF fin_ctx IS DISTINCT FROM NEW."originContextVersionId" THEN
        RAISE EXCEPTION 'occasion context version is not the one pinned by the finalization'
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    -- (3) the pinned context must belong to the origin intent and (5)(6) supply merchant + instant.
    SELECT "intentId", "merchantId", "intendedTransactionAt" INTO ctx_intent, ctx_merch, ctx_at
      FROM "purchase_intent_context_version" WHERE "id" = NEW."originContextVersionId";
    IF ctx_intent IS DISTINCT FROM NEW."originIntentId" THEN
        RAISE EXCEPTION 'occasion context version does not belong to the origin intent'
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    IF ctx_merch IS DISTINCT FROM NEW."merchantId" THEN
        RAISE EXCEPTION 'occasion merchantId does not equal the pinned context version merchantId'
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    IF ctx_at IS DISTINCT FROM NEW."intendedTransactionAt" THEN
        RAISE EXCEPTION 'occasion intendedTransactionAt does not equal the pinned context instant'
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    -- (4) the A1 cohort anchor must be the origin intent capture-token assignment (A2 5/20: the
    --     assignment is reachable ONLY through the token; B1 never asserts an independent one).
    SELECT tok."assignmentId" INTO intent_asg
      FROM "purchase_intent" pi
      JOIN "purchase_intent_capture_token" tok ON tok."id" = pi."captureTokenId"
      WHERE pi."id" = NEW."originIntentId";
    IF intent_asg IS DISTINCT FROM NEW."assignmentId" THEN
        RAISE EXCEPTION 'occasion assignment does not match the origin intent capture-token assignment'
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    -- (7) A2 invalidation is exclusion: an already-invalidated intent may never mint a NEW identity.
    --     (An occasion materialized BEFORE the invalidation is never deleted — the scientific
    --     non-effectiveness stays a DERIVED property of the A2 invalidation row, A2 10.)
    SELECT "id" INTO inv_id
      FROM "purchase_intent_invalidation" WHERE "invalidatedIntentId" = NEW."originIntentId";
    IF inv_id IS NOT NULL THEN
        RAISE EXCEPTION 'origin intent is invalidated and cannot mint a new occasion identity'
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "purchase_occasion_identity_coherence_ins"
    BEFORE INSERT ON "purchase_occasion"
    FOR EACH ROW EXECUTE FUNCTION "purchase_occasion_identity_coherence"();

COMMIT;

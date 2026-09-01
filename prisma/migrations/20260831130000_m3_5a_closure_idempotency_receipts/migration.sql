-- PagaMenos · M3.5A closure — durable idempotency receipts (P35A-01).
--
-- Transport idempotency is moved OFF the snapshot (a single unique column could not durably alias two
-- successful keys to one decision) INTO an append-only DecisionIdempotencyReceipt table: every key
-- under which the operation returned success is permanently consumed, and several keys may point to
-- one snapshot. UNIQUE(operationScope, idempotencyKey) scopes the key namespace to the trusted
-- operation. The receipt table is immutable at the DB level, exactly like the snapshot table.
--
-- The repository has never been deployed, so the obsolete snapshot-level idempotency column carries no
-- data and no backfill is required; it is dropped cleanly. The chain (base migration + this migration)
-- applies from an empty database via `prisma migrate deploy`.

-- DropObsoleteSnapshotIdempotency (moved to receipts).
DROP INDEX "decision_snapshot_idempotencyKey_key";
ALTER TABLE "decision_snapshot" DROP COLUMN "idempotencyKey";

-- CreateTable
CREATE TABLE "decision_idempotency_receipt" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "operationScope" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "decisionSnapshotId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decision_idempotency_receipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "decision_idempotency_receipt_decisionSnapshotId_idx" ON "decision_idempotency_receipt"("decisionSnapshotId");

-- CreateIndex
CREATE UNIQUE INDEX "decision_idempotency_receipt_operationScope_idempotencyKey_key" ON "decision_idempotency_receipt"("operationScope", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "decision_idempotency_receipt" ADD CONSTRAINT "decision_idempotency_receipt_decisionSnapshotId_fkey" FOREIGN KEY ("decisionSnapshotId") REFERENCES "decision_snapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ImmutabilityGuard (§12/P35A-01): a consumed idempotency key is append-only. UPDATE / DELETE /
-- TRUNCATE are rejected at the DB level so a key can never silently become reusable.
CREATE OR REPLACE FUNCTION "decision_idempotency_receipt_forbid_mutation"() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'decision_idempotency_receipt is append-only: % is forbidden on this immutable receipt table', TG_OP
        USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "decision_idempotency_receipt_no_update"
    BEFORE UPDATE ON "decision_idempotency_receipt"
    FOR EACH ROW EXECUTE FUNCTION "decision_idempotency_receipt_forbid_mutation"();

CREATE TRIGGER "decision_idempotency_receipt_no_delete"
    BEFORE DELETE ON "decision_idempotency_receipt"
    FOR EACH ROW EXECUTE FUNCTION "decision_idempotency_receipt_forbid_mutation"();

CREATE TRIGGER "decision_idempotency_receipt_no_truncate"
    BEFORE TRUNCATE ON "decision_idempotency_receipt"
    FOR EACH STATEMENT EXECUTE FUNCTION "decision_idempotency_receipt_forbid_mutation"();

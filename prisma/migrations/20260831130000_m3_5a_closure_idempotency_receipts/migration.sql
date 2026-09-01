-- PagaMenos · M3.5A closure — durable idempotency receipts (P35A-01), DATA-PRESERVING.
--
-- SECOND-CLOSURE CORRECTION (pre-acceptance / pre-deployment): the first version of THIS unreleased
-- migration dropped the snapshot-level idempotency column BEFORE preserving its meaning, so an
-- upgrade of an already-populated database would silently lose every historical idempotency key
-- (a HIGH historical-idempotency failure, P35A-01). No later migration can reconstruct a dropped key,
-- so this unreleased migration file is corrected in place. It is not accepted, not pushed, not
-- deployed; correcting it now is the only way to preserve the data on first real deployment.
--
-- Transport idempotency moves off the snapshot into an append-only DecisionIdempotencyReceipt table:
-- every key under which the operation returned success is durably consumed, and several keys may
-- alias one snapshot. requestHash is FROZEN as the snapshot's inputHash (SHA-256 of the canonical
-- validated DecideInput, §5), which makes the backfill a deterministic column copy — no in-database
-- canonical hashing is attempted.
--
-- ATOMIC (§6/§7): the whole transformation runs in one transaction. Backfill happens BEFORE the old
-- column/constraint are dropped, so a failure at any step leaves the historical idempotency key fully
-- recoverable — the DROP can never commit independently of the receipt backfill.

BEGIN;

-- 1. CreateTable
CREATE TABLE "decision_idempotency_receipt" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "operationScope" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "decisionSnapshotId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decision_idempotency_receipt_pkey" PRIMARY KEY ("id")
);

-- 2. Constraints / indexes / FK
CREATE INDEX "decision_idempotency_receipt_decisionSnapshotId_idx" ON "decision_idempotency_receipt"("decisionSnapshotId");
CREATE UNIQUE INDEX "decision_idempotency_receipt_operationScope_idempotencyKey_key" ON "decision_idempotency_receipt"("operationScope", "idempotencyKey");
ALTER TABLE "decision_idempotency_receipt" ADD CONSTRAINT "decision_idempotency_receipt_decisionSnapshotId_fkey" FOREIGN KEY ("decisionSnapshotId") REFERENCES "decision_snapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3. Backfill EVERY existing snapshot's idempotency key as a durable receipt BEFORE any DROP.
--    requestHash := snapshot.inputHash (frozen §5); createdAt preserved from the snapshot.
INSERT INTO "decision_idempotency_receipt"
    ("operationScope", "idempotencyKey", "requestHash", "decisionSnapshotId", "createdAt")
SELECT 'DECISION_PERSIST_V1', "idempotencyKey", "inputHash", "id", "createdAt"
FROM "decision_snapshot";

-- 4. Install receipt immutability triggers (append-only, §12/§50). INSERT above is already done.
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

-- 5. ONLY NOW that every key is durably preserved: drop the obsolete snapshot idempotency column.
DROP INDEX "decision_snapshot_idempotencyKey_key";
ALTER TABLE "decision_snapshot" DROP COLUMN "idempotencyKey";

COMMIT;

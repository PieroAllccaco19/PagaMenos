-- PagaMenos · M3.5A — immutable DecisionSnapshot persistence boundary.
--
-- Creates the append-only historical decision table plus DATABASE-LEVEL immutability (§12): a
-- BEFORE UPDATE / BEFORE DELETE / BEFORE TRUNCATE trigger RAISES so historical rows can never be
-- edited or removed through ordinary repository operations. Any future retention/privacy deletion
-- must be an explicit, separately-authorized process — never ordinary record editing.
--
-- `gen_random_uuid()` is PostgreSQL core (≥ 13); no extension is required.

-- CreateTable
CREATE TABLE "decision_snapshot" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "businessDecisionKey" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "snapshotSchemaVersion" TEXT NOT NULL,
    "engineInputSchemaVersion" TEXT NOT NULL,
    "engineOutputSchemaVersion" TEXT NOT NULL,
    "engineContractVersion" TEXT NOT NULL,
    "corpusVersion" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "selectedScopeId" TEXT,
    "decisionStatus" TEXT NOT NULL,
    "evaluatedAt" TIMESTAMPTZ(6) NOT NULL,
    "intendedTransactionAt" TIMESTAMPTZ(6) NOT NULL,
    "engineInputJson" JSONB NOT NULL,
    "engineOutputJson" JSONB NOT NULL,
    "inputHash" TEXT NOT NULL,
    "outputHash" TEXT NOT NULL,
    "gitSha" TEXT NOT NULL,
    "buildId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decision_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "decision_snapshot_businessDecisionKey_key" ON "decision_snapshot"("businessDecisionKey");

-- CreateIndex
CREATE UNIQUE INDEX "decision_snapshot_idempotencyKey_key" ON "decision_snapshot"("idempotencyKey");

-- CreateIndex
CREATE INDEX "decision_snapshot_merchantId_idx" ON "decision_snapshot"("merchantId");

-- CreateIndex
CREATE INDEX "decision_snapshot_corpusVersion_idx" ON "decision_snapshot"("corpusVersion");

-- CreateIndex
CREATE INDEX "decision_snapshot_decisionStatus_idx" ON "decision_snapshot"("decisionStatus");

-- CreateIndex
CREATE INDEX "decision_snapshot_evaluatedAt_idx" ON "decision_snapshot"("evaluatedAt");

-- CreateIndex
CREATE INDEX "decision_snapshot_intendedTransactionAt_idx" ON "decision_snapshot"("intendedTransactionAt");

-- ImmutabilityGuard (§12): append-only. UPDATE / DELETE / TRUNCATE are rejected at the DB level.
CREATE OR REPLACE FUNCTION "decision_snapshot_forbid_mutation"() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'decision_snapshot is append-only: % is forbidden on this immutable historical table', TG_OP
        USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "decision_snapshot_no_update"
    BEFORE UPDATE ON "decision_snapshot"
    FOR EACH ROW EXECUTE FUNCTION "decision_snapshot_forbid_mutation"();

CREATE TRIGGER "decision_snapshot_no_delete"
    BEFORE DELETE ON "decision_snapshot"
    FOR EACH ROW EXECUTE FUNCTION "decision_snapshot_forbid_mutation"();

CREATE TRIGGER "decision_snapshot_no_truncate"
    BEFORE TRUNCATE ON "decision_snapshot"
    FOR EACH STATEMENT EXECUTE FUNCTION "decision_snapshot_forbid_mutation"();

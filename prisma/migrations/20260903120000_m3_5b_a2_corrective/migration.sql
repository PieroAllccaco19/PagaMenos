-- PagaMenos · M3.5B-A2 CORRECTIVE (additive) migration — Sol closure re-gate.
--
-- Additive-only. It does NOT rewrite the rejected candidate migration
-- (20260902120000_m3_5b_a2_purchase_intent), which is preserved byte-for-byte as audit history.
-- This migration binds the corpus semantic authority (Finding 5) and the exact holiday-fixture
-- content digest (Finding 6) into the immutable frozen DecisionRequest, so a historical corpusId /
-- holiday version binds the exact authority the decision was frozen against.
--
-- The target table is append-only (BEFORE UPDATE/DELETE/TRUNCATE trigger). ALTER TABLE ADD COLUMN is
-- DDL, not a row UPDATE, so the immutability trigger does not fire; the append-only guarantee is
-- unchanged. In the fresh migration chain this runs immediately after the base A2 migration, when the
-- table is empty, so the NOT NULL columns need no backfill/default.

BEGIN;

ALTER TABLE "purchase_intent_decision_request"
  ADD COLUMN "expectedCorpusSemanticDigest" TEXT NOT NULL,
  ADD COLUMN "holidayCalendarDigest" TEXT NOT NULL;

COMMIT;

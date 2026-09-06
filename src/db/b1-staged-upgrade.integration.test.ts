// PagaMenos · M3.5B-B1 STAGED existing-data upgrade regression. REAL PostgreSQL.
//
// Proves the B1 migration is a correct FORWARD step over the ACCEPTED prior state, not just over a
// clean database: the full accepted chain (M3.5A x2 + A1 + A2 + A2 corrective) is deployed ALONE, real
// A2 data is created through the sanctioned services, and only THEN is the B1 migration deployed.
//
// The specific hazard closed here is "migration allows legacy duplicate state": pre-existing finalized
// intents must become materializable EXACTLY ONCE each, with the uniqueness boundary and the
// identity-coherence trigger active from the first insert — no grandfathered duplicates, no backfill
// that could mint two identities for one intent.
//
// Runs ONLY under the ephemeral-Postgres orchestrator against its own `pagamenos_b1_upgrade` database
// (DATABASE_URL is set by the orchestrator). The DB starts EMPTY — this test applies the migrations.
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '@/db/client';
import {
  assignParticipant,
  createExperiment,
  freezeAnalysisProtocol,
  registerAnalysisProtocolDraft,
  registerStudyParticipant,
  resolveTrustedEntrySource,
  resolveTrustedParticipantContext,
} from '@/services/study-admin';
import { recordConsentGrant } from '@/services';
import {
  appendEligibilityProfile,
  appendPurchaseIntentContext,
  captureIntentToken,
  createPurchaseIntent,
  finalizePurchaseIntent,
} from '@/services/study-purchase-intent';
import { materializePurchaseOccasion } from '@/services/study-purchase-occasion';
import {
  B1_OCCASION_SCHEMA_VERSION_V1,
  RECRUITMENT_KEY_VERSION_V1,
  type ResolvedEntrySource,
  type TrustedParticipantContext,
} from '@/study';

const MIGRATIONS_DIR = join(process.cwd(), 'prisma', 'migrations');
/** The ACCEPTED chain at merge 81b1cc6 — everything except the new B1 migration. */
const ACCEPTED_CHAIN = [
  '20260831120000_m3_5a_decision_snapshot',
  '20260831130000_m3_5a_closure_idempotency_receipts',
  '20260901120000_m3_5b_a1_study_authority',
  '20260902120000_m3_5b_a2_purchase_intent',
  '20260903120000_m3_5b_a2_corrective',
];
const B1_MIGRATION = '20260904120000_m3_5b_b1_purchase_occasion';

const uid = () => randomUUID().slice(0, 8);
const DEF = {
  observationWindowWeeks: 6,
  contaminationWindowHours: 48,
  minimumVerifiedLevel: 'CORROBORATED',
  minimumIndependentOccasions: 2,
};
const DIRECT: ResolvedEntrySource = resolveTrustedEntrySource([{ kind: 'DIRECT' }]);
const BILL = {
  kind: 'BILL',
  merchantId: 'm_fridays',
  channel: 'SALON',
  wholeBillCentimos: 10000,
  foodCentimos: 8000,
  nonAlcoholicBeverageCentimos: 1500,
  purchaseDomain: 'RESTAURANT_BILL',
};
const PORTFOLIO = { instruments: [{ family: 'IBK_PLIN', memberships: ['A'] }] };
const INTENDED_AT = '2026-07-28T12:00:00-05:00';

let stageDir: string;
let context: TrustedParticipantContext;
let assignmentId: string;
/** Two PRE-EXISTING finalized intents, created before B1 existed in the database. */
const legacyIntentIds: string[] = [];

function deploy(schemaPath: string): void {
  const res = spawnSync(`npx prisma migrate deploy --schema "${schemaPath}"`, {
    stdio: 'pipe',
    shell: true,
    env: process.env,
    encoding: 'utf8',
  });
  if (res.status !== 0) {
    throw new Error(`prisma migrate deploy failed:\n${res.stdout}\n${res.stderr}`);
  }
}

beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set for the B1 staged upgrade');

  // Stage A — deploy ONLY the accepted chain (no B1 migration in the staging directory).
  stageDir = mkdtempSync(join(tmpdir(), 'pagamenos-b1-stage-'));
  cpSync(join(process.cwd(), 'prisma', 'schema.prisma'), join(stageDir, 'schema.prisma'));
  const migDir = join(stageDir, 'migrations');
  cpSync(join(MIGRATIONS_DIR, 'migration_lock.toml'), join(migDir, 'migration_lock.toml'), {
    recursive: true,
  });
  for (const m of ACCEPTED_CHAIN) {
    cpSync(join(MIGRATIONS_DIR, m), join(migDir, m), { recursive: true });
  }
  deploy(join(stageDir, 'schema.prisma'));

  // Stage B — create genuine A2 data through the sanctioned services, while B1 does not yet exist.
  const draft = await registerAnalysisProtocolDraft({
    input: { protocolVersion: `P-${uid()}`, definition: DEF },
    idempotencyKey: `reg-${uid()}`,
  });
  const frozen = await freezeAnalysisProtocol({
    input: { protocolId: draft.protocol.id },
    idempotencyKey: `frz-${uid()}`,
  });
  const experiment = await createExperiment({
    input: { experimentCode: `E-${uid()}`, frozenProtocolId: frozen.protocol.id },
    idempotencyKey: `exp-${uid()}`,
  });
  const participant = await registerStudyParticipant({
    input: {
      recruitmentSubjectKey: `sk-${uid()}`,
      recruitmentKeyVersion: RECRUITMENT_KEY_VERSION_V1,
    },
    idempotencyKey: `par-${uid()}`,
  });
  const assignment = await assignParticipant({
    input: { experimentId: experiment.experiment.id, participantId: participant.participant.id },
    idempotencyKey: `asg-${uid()}`,
  });
  assignmentId = assignment.assignment.id;
  context = resolveTrustedParticipantContext({
    authenticatedParticipantId: participant.participant.id,
  });
  await recordConsentGrant({
    trustedParticipantContext: context,
    assignmentId,
    consentPayload: {
      consentVersion: 'cv1',
      privacyNoticeVersion: 'pv1',
      optionalEvidenceConsent: true,
    },
    idempotencyKey: `cg-${uid()}`,
  });

  // Two DISTINCT captures with IDENTICAL business facts — the A2 non-collapse shape that a naive
  // backfill would be most tempted to merge.
  for (let i = 0; i < 2; i += 1) {
    const token = await captureIntentToken({
      trustedParticipantContext: context,
      assignmentId,
      clientCorrelationNonce: `nonce-${uid()}`,
      resolvedEntrySource: DIRECT,
    });
    const intent = await createPurchaseIntent({
      trustedParticipantContext: context,
      assignmentId,
      intentCaptureKey: token.intentCaptureKey,
      intentType: 'BUYING_NOW',
      idempotencyKey: `ci-${uid()}`,
    });
    const ctx = await appendPurchaseIntentContext({
      trustedParticipantContext: context,
      assignmentId,
      intentId: intent.intentId,
      contextCaptureKey: `cc-${uid()}`,
      signature: BILL,
      intendedTransactionAt: INTENDED_AT,
      idempotencyKey: `ac-${uid()}`,
    });
    const prof = await appendEligibilityProfile({
      trustedParticipantContext: context,
      assignmentId,
      profileCaptureKey: `pc-${uid()}`,
      portfolio: PORTFOLIO,
      idempotencyKey: `ap-${uid()}`,
    });
    await finalizePurchaseIntent({
      trustedParticipantContext: context,
      assignmentId,
      intentId: intent.intentId,
      contextVersionId: ctx.contextVersionId,
      eligibilityProfileVersionId: prof.eligibilityProfileVersionId,
      idempotencyKey: `fin-${uid()}`,
    });
    legacyIntentIds.push(intent.intentId);
  }

  // Stage C — add the B1 migration to the staging directory and deploy it over the populated DB.
  cpSync(join(MIGRATIONS_DIR, B1_MIGRATION), join(stageDir, 'migrations', B1_MIGRATION), {
    recursive: true,
  });
  deploy(join(stageDir, 'schema.prisma'));
}, 120_000);

afterAll(async () => {
  await prisma.$disconnect();
  if (stageDir) {
    try {
      rmSync(stageDir, { recursive: true, force: true });
    } catch {
      /* a leftover temp dir is harmless */
    }
  }
});

describe('B1 staged upgrade over the accepted A1/A2 state (§14 H)', () => {
  it('adds the B1 tables and their guards without touching the pre-existing A2 rows', async () => {
    const tables = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name LIKE 'purchase_occasion%'`,
    );
    expect(tables.map((t) => t.table_name).sort()).toEqual([
      'purchase_occasion',
      'purchase_occasion_materialization_receipt',
    ]);
    // The pre-existing A2 facts survived the upgrade untouched.
    expect(await prisma.purchaseIntent.count()).toBe(2);
    expect(await prisma.purchaseIntentFinalization.count()).toBe(2);
    // ...and the upgrade created no opportunity behind the application back (no implicit backfill).
    expect(await prisma.purchaseOccasion.count()).toBe(0);
  });

  it('the uniqueness boundary + coherence trigger are active from the first insert', async () => {
    const triggers = await prisma.$queryRawUnsafe<Array<{ tgname: string }>>(
      `SELECT tgname FROM pg_trigger WHERE tgrelid = '"purchase_occasion"'::regclass AND NOT tgisinternal`,
    );
    expect(triggers.map((t) => t.tgname).sort()).toEqual(
      [
        'purchase_occasion_identity_coherence_ins',
        'purchase_occasion_no_delete',
        'purchase_occasion_no_truncate',
        'purchase_occasion_no_update',
      ].sort(),
    );
    const uniques = await prisma.$queryRawUnsafe<Array<{ indexname: string }>>(
      `SELECT indexname FROM pg_indexes WHERE tablename = 'purchase_occasion'`,
    );
    expect(uniques.map((u) => u.indexname)).toContain('purchase_occasion_originIntentId_key');
  });

  it('each PRE-EXISTING finalized intent materializes exactly once — no legacy duplicate state', async () => {
    const ids: string[] = [];
    for (const intentId of legacyIntentIds) {
      const first = await materializePurchaseOccasion({
        trustedParticipantContext: context,
        assignmentId,
        intentId,
        idempotencyKey: `occ-${uid()}`,
      });
      expect(first.resultKind).toBe('MATERIALIZED');
      // A second attempt under a different transport key aliases, never duplicates.
      const alias = await materializePurchaseOccasion({
        trustedParticipantContext: context,
        assignmentId,
        intentId,
        idempotencyKey: `occ-${uid()}`,
      });
      expect(alias.occasionId).toBe(first.occasionId);
      expect(alias.resultKind).toBe('OCCASION_ALIAS');
      ids.push(first.occasionId);
    }
    // Two legacy intents with IDENTICAL business facts ⇒ two distinct identities (A2 non-collapse).
    expect(new Set(ids).size).toBe(2);
    expect(await prisma.purchaseOccasion.count()).toBe(2);
    const rows = await prisma.purchaseOccasion.findMany();
    for (const row of rows) {
      expect(row.occasionSchemaVersion).toBe(B1_OCCASION_SCHEMA_VERSION_V1);
      expect(row.assignmentId).toBe(assignmentId);
      expect(row.merchantId).toBe(BILL.merchantId);
      expect(row.identityDigest).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});

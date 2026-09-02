// PagaMenos · offline migration validation (§23/§37).
//
// A DB-free, CI-safe guard on the migration history. It does NOT connect to PostgreSQL; it asserts
// the load-bearing structural facts that a schema-only `prisma validate` cannot see:
//   • the migration lock declares the postgresql provider;
//   • at least one migration exists and every migration.sql is non-empty;
//   • the immutable DecisionSnapshot AND DecisionIdempotencyReceipt tables are created; and
//   • their append-only immutability triggers (no UPDATE / DELETE / TRUNCATE) are present.
//
// This catches the highest-impact regression — someone silently dropping the immutability triggers —
// before it can reach a database.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS_DIR = join(process.cwd(), 'prisma', 'migrations');

function fail(message: string): never {
  console.error(`[db:migrate:check] FAIL: ${message}`);
  process.exit(1);
}

function main(): void {
  const lockPath = join(MIGRATIONS_DIR, 'migration_lock.toml');
  const lock = readFileSync(lockPath, 'utf8');
  if (!/provider\s*=\s*"postgresql"/.test(lock)) {
    fail('migration_lock.toml does not declare provider = "postgresql"');
  }

  const dirs = readdirSync(MIGRATIONS_DIR).filter((name) => {
    const full = join(MIGRATIONS_DIR, name);
    return statSync(full).isDirectory();
  });
  if (dirs.length === 0) fail('no migration directories found');

  // Each immutable table must be created AND carry no-update/delete/truncate triggers.
  // Append-only tables (M3.5A decision tables + M3.5B-A1 study tables). `analysis_protocol` is
  // freeze-guarded rather than plain append-only, so it is checked separately below.
  const immutableTables: Record<string, string[]> = {
    decision_snapshot: [
      'decision_snapshot_no_update',
      'decision_snapshot_no_delete',
      'decision_snapshot_no_truncate',
    ],
    decision_idempotency_receipt: [
      'decision_idempotency_receipt_no_update',
      'decision_idempotency_receipt_no_delete',
      'decision_idempotency_receipt_no_truncate',
    ],
    experiment: ['experiment_no_update', 'experiment_no_delete', 'experiment_no_truncate'],
    study_participant: [
      'study_participant_no_update',
      'study_participant_no_delete',
      'study_participant_no_truncate',
    ],
    experiment_assignment: [
      'experiment_assignment_no_update',
      'experiment_assignment_no_delete',
      'experiment_assignment_no_truncate',
    ],
    study_consent_event: [
      'study_consent_event_no_update',
      'study_consent_event_no_delete',
      'study_consent_event_no_truncate',
    ],
    analysis_protocol_command_receipt: [
      'analysis_protocol_command_receipt_no_update',
      'analysis_protocol_command_receipt_no_delete',
      'analysis_protocol_command_receipt_no_truncate',
    ],
    experiment_create_receipt: [
      'experiment_create_receipt_no_update',
      'experiment_create_receipt_no_delete',
      'experiment_create_receipt_no_truncate',
    ],
    study_participant_registration_receipt: [
      'study_participant_registration_receipt_no_update',
      'study_participant_registration_receipt_no_delete',
      'study_participant_registration_receipt_no_truncate',
    ],
    experiment_assignment_receipt: [
      'experiment_assignment_receipt_no_update',
      'experiment_assignment_receipt_no_delete',
      'experiment_assignment_receipt_no_truncate',
    ],
    study_consent_command_receipt: [
      'study_consent_command_receipt_no_update',
      'study_consent_command_receipt_no_delete',
      'study_consent_command_receipt_no_truncate',
    ],
    recruitment_subject_identity: [
      'recruitment_subject_identity_no_update',
      'recruitment_subject_identity_no_delete',
      'recruitment_subject_identity_no_truncate',
    ],
    recruitment_credential_link: [
      'recruitment_credential_link_no_update',
      'recruitment_credential_link_no_delete',
      'recruitment_credential_link_no_truncate',
    ],
  };
  const seen = new Set<string>();

  let sawReceiptBackfill = false;
  let allSql = '';

  for (const dir of dirs) {
    const sqlPath = join(MIGRATIONS_DIR, dir, 'migration.sql');
    const sql = readFileSync(sqlPath, 'utf8');
    if (sql.trim().length === 0) fail(`migration ${dir} has an empty migration.sql`);
    allSql += `\n${sql}`;

    // The migration that DROPS the old snapshot idempotency column must preserve every key first
    // (P35A-01 §6/§42): a backfill INSERT from decision_snapshot into the receipt table, inside an
    // explicit transaction, positioned BEFORE the DROP.
    const dropIdx = sql.search(/DROP\s+COLUMN\s+"idempotencyKey"/i);
    if (dropIdx !== -1) {
      const backfill =
        /INSERT\s+INTO\s+"decision_idempotency_receipt"[\s\S]*?FROM\s+"decision_snapshot"/i;
      const m = backfill.exec(sql);
      if (!m) {
        fail(
          `migration ${dir} drops decision_snapshot.idempotencyKey without backfilling it into ` +
            `decision_idempotency_receipt`,
        );
      }
      if (m.index > dropIdx) {
        fail(`migration ${dir} backfills the receipt AFTER dropping the old key column`);
      }
      if (!/\bBEGIN;/i.test(sql) || !/\bCOMMIT;/i.test(sql)) {
        fail(
          `migration ${dir} performs the data-preserving upgrade without an explicit transaction`,
        );
      }
      if (!/'DECISION_PERSIST_V1'/.test(sql)) {
        fail(`migration ${dir} backfill does not scope receipts to DECISION_PERSIST_V1`);
      }
      sawReceiptBackfill = true;
    }

    for (const [table, triggers] of Object.entries(immutableTables)) {
      if (new RegExp(`CREATE TABLE\\s+"${table}"`, 'i').test(sql)) {
        seen.add(table);
        const missing = triggers.filter((t) => !sql.includes(t));
        if (missing.length > 0) {
          fail(
            `migration ${dir} creates ${table} but is missing immutability trigger(s): ` +
              missing.join(', '),
          );
        }
        if (!/RAISE EXCEPTION/i.test(sql)) {
          fail(`migration ${dir} immutability function for ${table} does not RAISE EXCEPTION`);
        }
      }
    }
  }

  for (const table of Object.keys(immutableTables)) {
    if (!seen.has(table)) fail(`no migration creates the immutable ${table} table`);
  }
  if (!sawReceiptBackfill) {
    fail('no migration drops the snapshot idempotency column with a preserving receipt backfill');
  }

  // M3.5B-A1 (spec §2.2/§4/§8.11/§9): the freeze-guard, the FROZEN-protocol experiment guard, the
  // single-table consent CHECK, and each receipt operationScope CHECK must all be present.
  if (!/CREATE TABLE\s+"analysis_protocol"/i.test(allSql)) {
    fail('no migration creates the analysis_protocol table');
  }
  const requiredA1Objects = [
    'analysis_protocol_freeze_guard', // freeze-guard function (§2.2)
    'analysis_protocol_freeze_guard_update',
    'analysis_protocol_freeze_guard_delete',
    'analysis_protocol_no_truncate',
    'experiment_requires_frozen_protocol', // FROZEN-protocol INSERT guard (§4)
    'experiment_frozen_protocol_guard',
    'study_consent_event_action_provenance_ck', // §8.11 single-table CHECK
    'analysis_protocol_lifecycle_frozenat_ck', // A1-CODE-03 lifecycle↔frozenAt coherence
    'experiment_assignment_anchor_eq_ck', // A1-CODE-05 observationStartAt == enrolledAt
    'analysis_protocol_command_receipt_scope_ck', // receipt operationScope CHECKs (§9)
    'experiment_create_receipt_scope_ck',
    'study_participant_registration_receipt_scope_ck',
    'experiment_assignment_receipt_scope_ck',
    'study_consent_command_receipt_scope_ck',
  ];
  const missingA1 = requiredA1Objects.filter((name) => !allSql.includes(name));
  if (missingA1.length > 0) {
    fail(
      `M3.5B-A1 migration is missing required guard/constraint object(s): ${missingA1.join(', ')}`,
    );
  }
  // The freeze-guard must permit ONLY the DRAFT→FROZEN transition (a literal check that the guard
  // constrains the lifecycle transition, not merely that a trigger exists).
  if (!/DRAFT->FROZEN|DRAFT→FROZEN/i.test(allSql)) {
    fail(
      'analysis_protocol freeze-guard does not document/enforce the one-way DRAFT->FROZEN transition',
    );
  }

  console.log(
    `[db:migrate:check] OK — ${dirs.length} migration(s); append-only triggers present for ` +
      `${Object.keys(immutableTables).length} tables; analysis_protocol freeze-guard + experiment ` +
      `FROZEN-protocol guard + consent §8.11 CHECK + receipt scope CHECKs present; receipt backfill ` +
      `precedes the key drop.`,
  );
}

main();

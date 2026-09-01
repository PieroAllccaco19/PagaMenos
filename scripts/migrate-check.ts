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
  };
  const seen = new Set<string>();

  for (const dir of dirs) {
    const sqlPath = join(MIGRATIONS_DIR, dir, 'migration.sql');
    const sql = readFileSync(sqlPath, 'utf8');
    if (sql.trim().length === 0) fail(`migration ${dir} has an empty migration.sql`);

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

  console.log(
    `[db:migrate:check] OK — ${dirs.length} migration(s); append-only triggers present for ` +
      `${Object.keys(immutableTables).join(', ')}.`,
  );
}

main();

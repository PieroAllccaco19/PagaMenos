// PagaMenos · M7 V1.1 — S02 real-PostgreSQL harness orchestrator.
//
//   pnpm m7:pg                 all S02 checks (self-test + accepted-migration replay + A1/A2 regression)
//   pnpm m7:pg --self-test     cluster, roles, negative controls, migration replay, driver self-tests
//   pnpm m7:pg --regression    cluster, roles, migration replay, accepted A1/A2 suites (unchanged)
//   … [--evidence <file>]      write the sanitized JSON evidence report to <file>
//
// Boots a THROWAWAY PostgreSQL cluster (SCRAM auth, loopback), provisions the seven M7 roles of V1.1
// §18.2 plus a named NON-superuser migration role from scripts/m7/provision/roles.template.sql with
// run-time credentials, replays the repository's accepted migrations AS THAT MIGRATION ROLE, runs the
// requested suites, proves no M7 §19 object exists anywhere, and tears everything down.
//
// It installs NO M7: it never reads prisma/m7/normative/, never creates schema m7, and never writes a
// migration. Outcomes are PASS / FAIL / NOT EXECUTED; missing PostgreSQL binaries are NOT EXECUTED
// (exit 2), never PASS. Requires the PostgreSQL server binaries on PATH or in PG_BIN.
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import pg from 'pg';

import { M7_V1_1, M7_V1_1_ERRATUM_01, gitBlobId, sha256Hex } from '../../src/m7/normative/source';
import {
  EphemeralCluster,
  resolvePgBinaries,
  type PgBinaries,
  type ServerIdentity,
} from '../../src/m7/testkit/cluster';
import { HARNESS_CONTEXT_ENV, type HarnessContext } from '../../src/m7/testkit/context';
import {
  isClearOfM7,
  probeNoM7Installation,
  type M7InstallationProbe,
} from '../../src/m7/testkit/fixtures';
import {
  NotExecutedError,
  aggregate,
  exitCodeFor,
  runCheck,
  type CheckResult,
} from '../../src/m7/testkit/outcome';
import {
  HARNESS_CONNECTION_LIMIT,
  HARNESS_MIGRATION_ROLE,
  generateSecret,
  readRolesTemplate,
  redactSecrets,
  renderRolesTemplate,
} from '../../src/m7/testkit/provision';
import {
  deriveM7RoleExpectations,
  observeMemberships,
  observeRoles,
  verifyMigrationRole,
  verifyRoles,
  type M7RoleExpectations,
} from '../../src/m7/testkit/roles';

const ROOT = process.cwd();
const DB_MIGRATED = 'pagamenos_m7_harness';
const DB_UPGRADE = 'pagamenos_m7_upgrade';
const DB_SELFTEST = 'm7_harness_selftest';
const TEST_GIT_SHA = '0123456789abcdef0123456789abcdef01234567';

// The accepted A1/A2 PostgreSQL integration suites, exactly as scripts/pg-integration.ts runs them.
const A1A2_STAGED = ['src/db/staged-upgrade.integration.test.ts'];
const A1A2_MAIN = [
  'src/db/decision-snapshot.integration.test.ts',
  'src/db/study-authority.integration.test.ts',
  'src/db/purchase-intent.integration.test.ts',
];

type Mode = 'all' | 'self-test' | 'regression';

interface Args {
  readonly mode: Mode;
  readonly evidence: string | undefined;
}

function parseArgs(argv: string[]): Args {
  let mode: Mode = 'all';
  let evidence: string | undefined;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]!;
    if (a === '--self-test') mode = mode === 'regression' ? 'all' : 'self-test';
    else if (a === '--regression') mode = mode === 'self-test' ? 'all' : 'regression';
    else if (a === '--evidence' && argv[i + 1]) evidence = resolve(argv[(i += 1)]!);
    else {
      console.error(`[m7:pg] unknown argument: ${a}`);
      process.exit(2);
    }
  }
  return { mode, evidence };
}

/** The checks S02 requires for each mode; any not reached is NOT EXECUTED. */
function requiredChecks(mode: Mode): string[] {
  const base = [
    'H01-pg-binaries',
    'H02-cluster-start-connect',
    'H03-server-version',
    'H04-role-expectations-derived',
    'H05-roles-provisioned',
    'H06-m7-roles-verified',
    'H07-migration-role-non-superuser',
    'H08-accepted-migrations-replayed-as-migration-role',
  ];
  const selfTest = ['H09-m7-pg-self-test-suite'];
  const regression = ['H10-a1a2-staged-upgrade-suite', 'H11-a1a2-main-suites'];
  const post = ['H12-no-m7-installation', 'H13-roles-unchanged-after-run'];
  return [
    ...base,
    ...(mode === 'regression' ? [] : selfTest),
    ...(mode === 'self-test' ? [] : regression),
    ...post,
  ];
}

interface VitestCounts {
  readonly files: number;
  readonly tests: number;
  readonly passed: number;
  readonly failed: number;
  readonly skipped: number;
  readonly todo: number;
  readonly success: boolean;
}

function runVitest(
  config: string,
  files: string[],
  env: NodeJS.ProcessEnv,
  label: string,
): VitestCounts {
  const outDir = mkdtempSync(join(tmpdir(), 'pagamenos-m7-s02-vitest-'));
  const outFile = join(outDir, 'report.json');
  try {
    const cmd =
      `npx vitest run -c ${config} --reporter=default --reporter=json --outputFile.json="${outFile}"` +
      (files.length ? ` ${files.join(' ')}` : '');
    const res = spawnSync(cmd, { stdio: 'inherit', env, shell: true });
    if (res.error) throw new Error(`${label}: failed to spawn vitest: ${res.error.message}`);
    if (!existsSync(outFile))
      throw new Error(`${label}: vitest produced no JSON report (exit ${res.status})`);
    const report = JSON.parse(readFileSync(outFile, 'utf8')) as {
      numTotalTestSuites: number;
      numTotalTests: number;
      numPassedTests: number;
      numFailedTests: number;
      numPendingTests: number;
      numTodoTests: number;
      success: boolean;
      testResults: unknown[];
    };
    return {
      files: report.testResults.length,
      tests: report.numTotalTests,
      passed: report.numPassedTests,
      failed: report.numFailedTests,
      skipped: report.numPendingTests,
      todo: report.numTodoTests,
      success: report.success && res.status === 0,
    };
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
}

function assertGreen(label: string, c: VitestCounts, expectedFiles: number): string {
  const summary = `${c.files} file(s), ${c.tests} tests: ${c.passed} passed, ${c.failed} failed, ${c.skipped} skipped, ${c.todo} todo`;
  if (!c.success || c.failed > 0) throw new Error(`${label}: ${summary}`);
  if (c.tests === 0 || c.passed !== c.tests)
    throw new Error(`${label}: not every test passed — ${summary}`);
  if (c.files !== expectedFiles)
    throw new Error(`${label}: expected ${expectedFiles} file(s) — ${summary}`);
  return summary;
}

function acceptedMigrationNames(): string[] {
  const dir = join(ROOT, 'prisma', 'migrations');
  return readdirSync(dir)
    .filter((n) => statSync(join(dir, n)).isDirectory())
    .sort();
}

function databaseUrl(
  cluster: EphemeralCluster,
  role: string,
  password: string,
  db: string,
): string {
  return `postgresql://${role}:${encodeURIComponent(password)}@127.0.0.1:${cluster.port}/${db}?schema=public`;
}

async function withRole<T>(
  cluster: EphemeralCluster,
  role: string,
  password: string,
  db: string,
  fn: (c: pg.Client) => Promise<T>,
): Promise<T> {
  const c = new pg.Client({
    host: '127.0.0.1',
    port: cluster.port,
    database: db,
    user: role,
    password,
    application_name: `m7s02:harness:${role}`,
  });
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  const checks: CheckResult[] = [];
  const evidence: Record<string, unknown> = {
    slice: 'M7 V1.1 — S02 real-PostgreSQL harness',
    mode: args.mode,
    generatedAt: new Date().toISOString(),
    platform: `${process.platform}/${process.arch} node ${process.version}`,
    authority: {
      m7v11: { path: M7_V1_1.path, gitBlob: M7_V1_1.gitBlob, sha256: M7_V1_1.sha256 },
      erratum01: {
        path: M7_V1_1_ERRATUM_01.path,
        gitBlob: M7_V1_1_ERRATUM_01.gitBlob,
        sha256: M7_V1_1_ERRATUM_01.sha256,
      },
    },
    notClaimed: [
      'M7 §19 installation (S03)',
      'IMP-01 / IMP-06 / IMP-21 global satisfaction (Gate 2)',
      'hosted required-check surface (S04)',
    ],
  };
  const secrets: string[] = [];
  const record = (r: CheckResult) => {
    checks.push(r);
    const line = `[m7:pg] ${r.status.padEnd(12)} ${r.id} — ${r.detail}`;
    console.log(redactSecrets(line, secrets));
  };

  let cluster: EphemeralCluster | undefined;
  const evidenceDir = mkdtempSync(join(tmpdir(), 'pagamenos-m7-s02-evidence-'));
  try {
    // H01 — prerequisite probe.
    let binaries: PgBinaries | undefined;
    record(
      await runCheck('H01-pg-binaries', () => {
        binaries = resolvePgBinaries(process.env.PG_BIN);
        evidence.pgBinaries = { source: binaries.source, binaryVersion: binaries.binaryVersion };
        return `${binaries.source}: ${binaries.binaryVersion}`;
      }),
    );
    if (!binaries) return finish();

    // H02 — start and connect.
    let identity: ServerIdentity | undefined;
    record(
      await runCheck('H02-cluster-start-connect', async () => {
        cluster = await EphemeralCluster.start(binaries!);
        secrets.push(...cluster.secrets());
        identity = await cluster.identity();
        return 'ephemeral cluster started (scram-sha-256, loopback) and bootstrap admin connected';
      }),
    );
    if (!cluster || !identity) return finish();

    // H03 — the ACTUAL server version, queried from the running server.
    record(
      await runCheck('H03-server-version', () => {
        evidence.server = identity;
        if (identity!.serverVersionNum < 150000) {
          throw new Error(
            `server_version_num ${identity!.serverVersionNum} < 150000 (IA-08 precondition)`,
          );
        }
        return `server_version=${identity!.serverVersion} server_version_num=${identity!.serverVersionNum}`;
      }),
    );

    // H04 — expectations from the accepted bytes.
    let expectations: M7RoleExpectations | undefined;
    record(
      await runCheck('H04-role-expectations-derived', () => {
        const bytes = readFileSync(join(ROOT, M7_V1_1.path));
        expectations = deriveM7RoleExpectations(bytes);
        evidence.roleExpectationSource = { gitBlob: gitBlobId(bytes), sha256: sha256Hex(bytes) };
        return `${expectations.all.length} roles (owner ${expectations.owner.name}; ${expectations.login.length} login)`;
      }),
    );
    if (!expectations) return finish();

    // H05 — provision (bootstrap admin executes the rendered template once, in one transaction).
    const credentials: Record<string, string> = {};
    for (const role of [...expectations.login.map((r) => r.name), HARNESS_MIGRATION_ROLE]) {
      credentials[role] = generateSecret();
      secrets.push(credentials[role]!);
    }
    record(
      await runCheck('H05-roles-provisioned', async () => {
        const sql = renderRolesTemplate({
          template: readRolesTemplate(ROOT),
          expectations: expectations!,
          migrationRole: HARNESS_MIGRATION_ROLE,
          secrets: new Map(Object.entries(credentials)),
          connectionLimit: HARNESS_CONNECTION_LIMIT,
        });
        try {
          await cluster!.withAdmin('postgres', (c) => c.query(sql));
        } catch (error) {
          throw new Error(
            redactSecrets(error instanceof Error ? error.message : String(error), secrets),
          );
        }
        return `template rendered with ${Object.keys(credentials).length} run-time credentials; 8 roles created`;
      }),
    );

    // H06 / H07 — verify.
    record(
      await runCheck('H06-m7-roles-verified', async () => {
        const mismatches = await cluster!.withAdmin('postgres', (c) =>
          verifyRoles(c, expectations!.all, HARNESS_MIGRATION_ROLE),
        );
        const names = [...expectations!.all.map((e) => e.name), HARNESS_MIGRATION_ROLE];
        evidence.roles = await cluster!.withAdmin('postgres', async (c) => ({
          observed: await observeRoles(c, names),
          memberships: await observeMemberships(c, names),
          mismatches,
        }));
        if (mismatches.length > 0)
          throw new Error(`role mismatches: ${JSON.stringify(mismatches)}`);
        return `7 M7 roles verified against §18.2 with 0 mismatches`;
      }),
    );
    record(
      await runCheck('H07-migration-role-non-superuser', async () => {
        const mismatches = await cluster!.withAdmin('postgres', (c) =>
          verifyMigrationRole(c, HARNESS_MIGRATION_ROLE, expectations!.owner.name),
        );
        if (mismatches.length > 0)
          throw new Error(`migration role mismatches: ${JSON.stringify(mismatches)}`);
        return `${HARNESS_MIGRATION_ROLE}: LOGIN, NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOREPLICATION, NOBYPASSRLS, member of ${expectations!.owner.name}`;
      }),
    );
    if (checks.some((c) => c.status !== 'PASS')) return finish();

    // Databases owned by the migration role (created by the bootstrap admin; the migration role has
    // no CREATEDB). As database owner it may create in `public` (PostgreSQL ≥ 15 pg_database_owner).
    await cluster.withAdmin('postgres', async (c) => {
      for (const db of [DB_MIGRATED, DB_UPGRADE, DB_SELFTEST]) {
        await c.query(`CREATE DATABASE ${db} OWNER ${HARNESS_MIGRATION_ROLE} ENCODING 'UTF8'`);
      }
    });
    const migratorPw = credentials[HARNESS_MIGRATION_ROLE]!;

    // H08 — replay the accepted migrations as the migration role.
    record(
      await runCheck('H08-accepted-migrations-replayed-as-migration-role', async () => {
        const before = await withRole(
          cluster!,
          HARNESS_MIGRATION_ROLE,
          migratorPw,
          DB_MIGRATED,
          async (c) =>
            (await c.query(`SELECT session_user, current_setting('is_superuser') AS is_superuser`))
              .rows[0],
        );
        if (before.is_superuser !== 'off')
          throw new Error('migration connection is superuser; refused');
        const res = spawnSync('npx prisma migrate deploy', {
          stdio: 'inherit',
          shell: true,
          env: {
            ...process.env,
            DATABASE_URL: databaseUrl(cluster!, HARNESS_MIGRATION_ROLE, migratorPw, DB_MIGRATED),
          },
        });
        if (res.status !== 0) {
          throw new Error(
            `prisma migrate deploy as ${HARNESS_MIGRATION_ROLE} exited ${res.status}`,
          );
        }
        const accepted = acceptedMigrationNames();
        const replay = await withRole(
          cluster!,
          HARNESS_MIGRATION_ROLE,
          migratorPw,
          DB_MIGRATED,
          async (c) => {
            const applied = (
              await c.query<{
                migration_name: string;
                finished: boolean;
                rolled_back: boolean;
                applied_steps_count: number;
              }>(
                `SELECT migration_name, finished_at IS NOT NULL AS finished, rolled_back_at IS NOT NULL AS rolled_back,
                      applied_steps_count
                 FROM public._prisma_migrations ORDER BY migration_name`,
              )
            ).rows;
            const owners = (
              await c.query<{ owner: string; n: number }>(
                `SELECT pg_catalog.pg_get_userbyid(c.relowner) AS owner, count(*)::int AS n
                 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = 'public' GROUP BY 1 ORDER BY 1`,
              )
            ).rows;
            const functions = (
              await c.query<{ owner: string; n: number }>(
                `SELECT pg_catalog.pg_get_userbyid(p.proowner) AS owner, count(*)::int AS n
                 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
                WHERE n.nspname = 'public' GROUP BY 1 ORDER BY 1`,
              )
            ).rows;
            const triggers = (
              await c.query<{ n: number }>(
                `SELECT count(*)::int AS n FROM pg_catalog.pg_trigger t
                 JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
                 JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = 'public' AND NOT t.tgisinternal`,
              )
            ).rows[0]!.n;
            return { applied, owners, functions, triggers };
          },
        );
        evidence.migrationReplay = {
          executedAs: before,
          database: DB_MIGRATED,
          acceptedMigrations: accepted,
          ...replay,
        };
        const appliedNames = replay.applied.map((a) => a.migration_name);
        if (JSON.stringify(appliedNames) !== JSON.stringify(accepted)) {
          throw new Error(`applied ${appliedNames.join(',')} ≠ accepted ${accepted.join(',')}`);
        }
        if (replay.applied.some((a) => !a.finished || a.rolled_back)) {
          throw new Error('a migration is unfinished or rolled back');
        }
        const foreignOwners = [...replay.owners, ...replay.functions].filter(
          (o) => o.owner !== HARNESS_MIGRATION_ROLE,
        );
        if (foreignOwners.length > 0) {
          throw new Error(
            `objects in public not owned by the migration role: ${JSON.stringify(foreignOwners)}`,
          );
        }
        return `${accepted.length} accepted migrations applied by session_user=${before.session_user} (is_superuser=off); every public relation/function owned by ${HARNESS_MIGRATION_ROLE}`;
      }),
    );
    if (checks.some((c) => c.status !== 'PASS')) return finish();

    // H09 — the real-PG harness self-test suite.
    if (args.mode !== 'regression') {
      record(
        await runCheck('H09-m7-pg-self-test-suite', () => {
          const context: HarnessContext = {
            host: '127.0.0.1',
            port: cluster!.port,
            adminUser: cluster!.adminUser,
            adminPassword: cluster!.secrets()[0]!,
            migrationRole: HARNESS_MIGRATION_ROLE,
            credentials,
            databases: { selftest: DB_SELFTEST },
            serverVersion: identity!.serverVersion,
            evidenceDir,
          };
          const counts = runVitest(
            'vitest.m7-pg.config.ts',
            [],
            { ...process.env, [HARNESS_CONTEXT_ENV]: JSON.stringify(context) },
            'm7-pg self-test',
          );
          evidence.selfTestSuite = counts;
          return assertGreen('m7-pg self-test', counts, 2);
        }),
      );
    }

    // H10 / H11 — accepted A1/A2 suites, unchanged, against the harness-prepared databases, connected
    // as the non-superuser migration role.
    if (args.mode !== 'self-test') {
      record(
        await runCheck('H10-a1a2-staged-upgrade-suite', () => {
          const counts = runVitest(
            'vitest.integration.config.ts',
            A1A2_STAGED,
            {
              ...process.env,
              DATABASE_URL: databaseUrl(cluster!, HARNESS_MIGRATION_ROLE, migratorPw, DB_UPGRADE),
            },
            'A1/A2 staged-upgrade',
          );
          evidence.a1a2Staged = {
            suiteFiles: A1A2_STAGED,
            connectedAs: HARNESS_MIGRATION_ROLE,
            ...counts,
          };
          return assertGreen('A1/A2 staged-upgrade', counts, A1A2_STAGED.length);
        }),
      );
      record(
        await runCheck('H11-a1a2-main-suites', () => {
          const counts = runVitest(
            'vitest.integration.config.ts',
            A1A2_MAIN,
            {
              ...process.env,
              DATABASE_URL: databaseUrl(cluster!, HARNESS_MIGRATION_ROLE, migratorPw, DB_MIGRATED),
              PAGAMENOS_GIT_SHA: TEST_GIT_SHA,
            },
            'A1/A2 main',
          );
          evidence.a1a2Main = {
            suiteFiles: A1A2_MAIN,
            connectedAs: HARNESS_MIGRATION_ROLE,
            ...counts,
          };
          return assertGreen('A1/A2 main', counts, A1A2_MAIN.length);
        }),
      );
    }

    // H12 — no M7 §19 object exists in any database of the cluster.
    record(
      await runCheck('H12-no-m7-installation', async () => {
        const probes: M7InstallationProbe[] = [];
        for (const db of ['postgres', DB_MIGRATED, DB_UPGRADE, DB_SELFTEST]) {
          probes.push(
            await cluster!.withAdmin(db, (c) => probeNoM7Installation(c, expectations!.owner.name)),
          );
        }
        evidence.noM7Installation = probes;
        const dirty = probes.filter((p) => !isClearOfM7(p));
        if (dirty.length > 0) throw new Error(`M7 objects found: ${JSON.stringify(dirty)}`);
        return `schema m7 absent and 0 objects owned by ${expectations!.owner.name} in ${probes.length} databases`;
      }),
    );

    // H13 — the provisioned roles are unchanged after every suite (negative controls were disposable).
    record(
      await runCheck('H13-roles-unchanged-after-run', async () => {
        const m = await cluster!.withAdmin('postgres', (c) =>
          verifyRoles(c, expectations!.all, HARNESS_MIGRATION_ROLE),
        );
        const mm = await cluster!.withAdmin('postgres', (c) =>
          verifyMigrationRole(c, HARNESS_MIGRATION_ROLE, expectations!.owner.name),
        );
        const leftovers = await cluster!.withAdmin(
          'postgres',
          async (c) =>
            (
              await c.query<{ n: number }>(
                `SELECT count(*)::int AS n FROM pg_catalog.pg_roles WHERE rolname LIKE 's02\\_%'`,
              )
            ).rows[0]!.n,
        );
        evidence.rolesAfterRun = {
          mismatches: m,
          migrationRoleMismatches: mm,
          disposableRolesRemaining: leftovers,
        };
        if (m.length || mm.length || leftovers)
          throw new Error(JSON.stringify(evidence.rolesAfterRun));
        return '0 mismatches; 0 disposable negative-control roles remain';
      }),
    );

    return finish();
  } catch (error) {
    record({
      id: 'H00-harness',
      status: error instanceof NotExecutedError ? 'NOT_EXECUTED' : 'FAIL',
      detail: redactSecrets(
        error instanceof Error ? (error.stack ?? error.message) : String(error),
        secrets,
      ),
    });
    return finish();
  } finally {
    cluster?.stop();
  }

  function finish(): number {
    const reached = new Set(checks.map((c) => c.id));
    const firstBlocker = checks.find((c) => c.status !== 'PASS');
    for (const id of requiredChecks(args.mode)) {
      if (!reached.has(id)) {
        checks.push({
          id,
          status: 'NOT_EXECUTED',
          detail: `not reached${firstBlocker ? ` (blocked by ${firstBlocker.id})` : ''}`,
          missingPrerequisite:
            firstBlocker?.missingPrerequisite ?? `prior check ${firstBlocker?.id ?? '?'}`,
        });
      }
    }
    const status = aggregate(checks);
    evidence.checks = checks;
    evidence.status = status;
    const fragments: Record<string, unknown> = {};
    if (existsSync(evidenceDir)) {
      for (const f of readdirSync(evidenceDir)
        .filter((n) => n.endsWith('.json'))
        .sort()) {
        fragments[f.replace(/\.json$/, '')] = JSON.parse(
          readFileSync(join(evidenceDir, f), 'utf8'),
        );
      }
      rmSync(evidenceDir, { recursive: true, force: true });
    }
    evidence.suiteEvidence = fragments;

    let text = `${JSON.stringify(evidence, null, 2)}\n`;
    text = redactSecrets(text, secrets);
    if (cluster)
      text = text
        .split(`:${cluster.port}`)
        .join(':<port>')
        .split(`"port": ${cluster.port}`)
        .join('"port": "<port>"');
    if (args.evidence) {
      writeFileSync(args.evidence, text);
      console.log(`[m7:pg] evidence written to ${args.evidence}`);
    }
    console.log('\n[m7:pg] ─── S02 summary ───');
    for (const c of checks) {
      const extra = c.missingPrerequisite ? ` [missing: ${c.missingPrerequisite}]` : '';
      console.log(redactSecrets(`[m7:pg] ${c.status.padEnd(12)} ${c.id}${extra}`, secrets));
    }
    console.log(`[m7:pg] OVERALL: ${status === 'NOT_EXECUTED' ? 'NOT EXECUTED' : status}`);
    return exitCodeFor(status);
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

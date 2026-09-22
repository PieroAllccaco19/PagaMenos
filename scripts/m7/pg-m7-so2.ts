// PagaMenos · M7 V1.1 — SO-2 EVIDENCE UPLOAD AUTHORIZATION real-PostgreSQL orchestrator.
//
//   pnpm m7:so2  [--evidence <file>] [--suite-evidence <file>]
//
// Boots a THROWAWAY PostgreSQL cluster, provisions the M7 roles through the ACCEPTED VBA-S02-1
// template, replays the accepted migrations AS the migration role, installs the M7 §19 normative
// DDL, activates plane A of the M7 SO2 RUNTIME TEST FIXTURE, builds A1/A2 rows through the SANCTIONED
// A1/A2 services (with a per-participant optionalEvidenceConsent), hands the suite the two M7 role
// credentials and the expected control-plane digest, runs the SO-2 runtime suite against REAL
// PostgreSQL, and then destroys the cluster and verifies the destruction.
//
// ── WHAT THIS IS NOT ───────────────────────────────────────────────────────────────────────────
// The control planes it installs (and the A → B rotation the suite performs) are a DISPOSABLE TEST
// FIXTURE (src/m7/so2/__fixtures__/so2-runtime-control-plane.ts):
//     NOT A PRODUCTION MANIFEST · NOT AUTHORITY · NOT LC-3 ACCEPTED · NOT PUBLISHED
//     NOT A SELECTOR VALUE · NOT A SELECTOR ROTATION · NOT LIFECYCLE EVIDENCE
// It writes no migration and publishes nothing under authority/.
//
// Missing PostgreSQL binaries are NOT EXECUTED (exit 2), never PASS.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { M7_V1_1 } from '../../src/m7/normative/source';
import {
  destroyEnvironment,
  databaseUrl,
  freshMigratedDatabase,
  startProvisionedEnvironment,
  withLogin,
  type S03Environment,
  type TeardownEvidence,
} from '../../src/m7/s03/environment';
import { deriveCatalog } from '../../src/m7/s03/expectations';
import { partitionF26 } from '../../src/m7/s03/orchestration';
import { loadS03Sources } from '../../src/m7/s03/sources';
import {
  SO2_FIXTURE_KIND,
  SO2_IDENTITIES,
  installSo2Plane,
  so2DriftedDigest,
  so2FixtureDigest,
} from '../../src/m7/so2/__fixtures__/so2-runtime-control-plane';
import { resolvePgBinaries } from '../../src/m7/testkit/cluster';
import { deriveM7RoleExpectations } from '../../src/m7/testkit/roles';
import { buildSo2A1A2Participants, A2_TEST_BUILD_GIT_SHA } from './pg-m7-so2-a1a2';

const ROOT = resolve(import.meta.dirname, '..', '..');

/** The environment variable through which the orchestrator hands its context to the suite. */
export const SO2_CONTEXT_ENV = 'M7_SO2_CONTEXT';
/** Where the suite writes its structured evidence (JSON). */
export const SO2_SUITE_EVIDENCE_ENV = 'M7_SO2_SUITE_EVIDENCE';

/** Participant plan: label → intents, optionalEvidenceConsent, purpose in the suite. */
const PLAN = [
  { label: 'A', intents: 8, optionalEvidenceConsent: true }, // happy paths, replay, rotation
  { label: 'B', intents: 1, optionalEvidenceConsent: true }, // foreign participant
  { label: 'N', intents: 1, optionalEvidenceConsent: false }, // AGR refusal
  { label: 'W', intents: 1, optionalEvidenceConsent: true }, // withdrawn BEFORE any SO-2
  { label: 'R', intents: 1, optionalEvidenceConsent: true }, // replay after withdrawal
  { label: 'SA', intents: 1, optionalEvidenceConsent: true }, // serialization case A
  { label: 'SB', intents: 1, optionalEvidenceConsent: true }, // serialization case B
] as const;

class NotExecuted extends Error {}

function log(message: string): void {
  console.log(`[m7:so2] ${message}`);
}

/** Installs the M7 §19 DDL and activates fixture plane A, in ONE transaction (F01 BEGIN). */
async function installM7(
  env: S03Environment,
  database: string,
): Promise<{ manifestSha256: string }> {
  const sources = loadS03Sources(ROOT);
  const partition = partitionF26(sources.fragments[25]!.sql);
  const fragments = sources.fragments.slice(0, 25);
  if (sources.fragments.length !== 26 || sources.fragments[25]!.id !== 'F26') {
    throw new Error('the normative fragment set is not F01 … F26');
  }
  deriveCatalog(sources);
  return withLogin(
    env.cluster,
    env.migrationRole,
    env.credentials.get(env.migrationRole)!,
    database,
    async (client) => {
      for (const f of fragments) await client.query(f.sql);
      await client.query(partition.prefixText);
      const install = await installSo2Plane(client, sources, 'A');
      await client.query(partition.suffixText);
      log(`M7 installed; fixture plane A manifest ${install.manifestSha256}`);
      return { manifestSha256: install.manifestSha256 };
    },
  );
}

async function assertActiveInstallation(
  env: S03Environment,
  database: string,
  manifestSha256: string,
): Promise<void> {
  const rows = await withLogin(
    env.cluster,
    env.migrationRole,
    env.credentials.get(env.migrationRole)!,
    database,
    async (c) =>
      (
        await c.query<{ mv: string; digest: string; n: string }>(
          `SELECT i."manifestVersion" AS mv, m."manifestSha256" AS digest,
                  (SELECT pg_catalog.count(*) FROM m7.m7_control_plane_installation
                    WHERE "retiredAt" IS NULL)::text AS n
             FROM m7.m7_control_plane_installation i
             JOIN m7.m7_control_plane_manifest m ON m."manifestVersion" = i."manifestVersion"
            WHERE i."retiredAt" IS NULL`,
        )
      ).rows,
  );
  const row = rows[0];
  if (
    rows.length !== 1 ||
    row === undefined ||
    row.n !== '1' ||
    row.mv !== SO2_IDENTITIES.A.manifestVersion ||
    row.digest !== manifestSha256
  ) {
    throw new Error('the SO-2 fixture plane A is not the single active installation');
  }
  log(`active installation verified: ${row.mv}`);
}

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<number> {
  const evidencePath = argValue('--evidence');
  const suiteEvidencePath =
    argValue('--suite-evidence') ?? resolve(tmpdir(), `m7-so2-suite-evidence-${process.pid}.json`);

  let binaries;
  try {
    binaries = resolvePgBinaries(process.env.PG_BIN);
  } catch (e) {
    throw new NotExecuted((e as Error).message);
  }

  const sources = loadS03Sources(ROOT);
  const v11 = sources.s1.find((s) => s.path === M7_V1_1.path)!;
  const roleExpectations = deriveM7RoleExpectations(Buffer.from(v11.text, 'utf8'));
  const migrationRole = deriveCatalog(sources).migrationRole;
  const database = 'pagamenos_m7_so2';

  let env: S03Environment | undefined;
  let teardown: TeardownEvidence | undefined;
  let suiteOk = false;
  try {
    log('booting a throwaway cluster and provisioning the accepted M7 roles');
    env = await startProvisionedEnvironment('so2', binaries, roleExpectations, migrationRole, ROOT);
    log(`cluster on 127.0.0.1:${env.cluster.port}; migration role ${migrationRole}`);

    const applied = await freshMigratedDatabase(env, database, ROOT);
    log(`accepted migrations replayed as the migration role (${applied.length})`);

    const { manifestSha256 } = await installM7(env, database);
    await assertActiveInstallation(env, database, manifestSha256);

    const applicationUrl = databaseUrl(env, migrationRole, database);
    log('building A1/A2 rows through the SANCTIONED A1/A2 services');
    const built = await buildSo2A1A2Participants(applicationUrl, PLAN);
    if (built.length !== PLAN.length) throw new Error('A1/A2 fixture build produced no rows');
    const participants = Object.fromEntries(
      built.map((p) => [
        p.label,
        {
          label: p.label,
          participantId: p.participantId,
          assignmentId: p.assignmentId,
          intentIds: [...p.intentIds],
          decisionBindingIds: [...p.decisionBindingIds],
          optionalEvidenceConsent: p.optionalEvidenceConsent,
        },
      ]),
    );

    const context = {
      fixtureKind: SO2_FIXTURE_KIND,
      manifestSha256,
      rotationManifestSha256: so2FixtureDigest('B'),
      driftedManifestSha256: so2DriftedDigest(),
      database,
      port: env.cluster.port,
      migrationRole,
      participants,
      urls: {
        application: applicationUrl,
        participant: databaseUrl(env, 'pagamenos_m7_participant_rt', database),
        sessionIssuer: databaseUrl(env, 'pagamenos_m7_session_issuer_rt', database),
      },
    };

    log('running the SO-2 runtime suite against real PostgreSQL');
    const run = spawnSync('npx vitest run -c vitest.m7-so2.config.ts', {
      stdio: 'inherit',
      shell: true,
      cwd: ROOT,
      env: {
        ...process.env,
        DATABASE_URL: context.urls.application,
        M7_PARTICIPANT_DATABASE_URL: context.urls.participant,
        M7_SESSION_ISSUER_DATABASE_URL: context.urls.sessionIssuer,
        M7_CONTROL_PLANE_MANIFEST_SHA256: manifestSha256,
        PAGAMENOS_GIT_SHA: A2_TEST_BUILD_GIT_SHA,
        [SO2_CONTEXT_ENV]: JSON.stringify(context),
        [SO2_SUITE_EVIDENCE_ENV]: suiteEvidencePath,
      },
    });
    suiteOk = run.status === 0;

    if (evidencePath !== undefined) {
      const suiteEvidence: unknown = existsSync(suiteEvidencePath)
        ? JSON.parse(readFileSync(suiteEvidencePath, 'utf8'))
        : null;
      writeFileSync(
        evidencePath,
        `${JSON.stringify(
          {
            harness: 'M7 SO-2 EVIDENCE UPLOAD AUTHORIZATION',
            fixtureKind: SO2_FIXTURE_KIND,
            notAProductionManifest: true,
            notAuthority: true,
            notPublished: true,
            notASelectorValue: true,
            notASelectorRotation: true,
            notLifecycleEvidence: true,
            serverVersion: env.identity.versionString,
            migrationRole,
            appliedMigrations: applied,
            planeA: { manifestVersion: SO2_IDENTITIES.A.manifestVersion, manifestSha256 },
            planeB: {
              manifestVersion: SO2_IDENTITIES.B.manifestVersion,
              manifestSha256: so2FixtureDigest('B'),
            },
            provisioning: env.provisioning,
            suite: suiteOk ? 'PASS' : 'FAIL',
            suiteEvidence,
          },
          null,
          2,
        )}\n`,
        'utf8',
      );
      log(`evidence written to ${evidencePath}`);
    }
    return suiteOk ? 0 : 1;
  } finally {
    if (env !== undefined) {
      teardown = await destroyEnvironment(env);
      log(
        `teardown: stopped=${teardown.serverStopped} dataDirRemoved=${teardown.dataDirectoryRemoved} ` +
          `surviving=${String(teardown.survivingProcesses)}`,
      );
    }
  }
}

main()
  .then((code) => process.exit(code))
  .catch((e: unknown) => {
    if (e instanceof NotExecuted) {
      console.error(
        `\n[m7:so2] PostgreSQL server binaries not found (${e.message}).\n` +
          `[m7:so2] The M7 SO-2 real-PostgreSQL gate is NOT EXECUTED.\n` +
          `[m7:so2] Install PostgreSQL (initdb/pg_ctl) on PATH or set PG_BIN, then re-run.\n`,
      );
      process.exit(2);
    }
    console.error(e);
    process.exit(1);
  });

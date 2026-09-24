// PagaMenos · M7 V1.1 — CAPABILITY SIGNER / TO-8 DB FOUNDATION real-PostgreSQL orchestrator.
//
//   pnpm m7:signer  [--evidence <file>] [--suite-evidence <file>] [--provider-suite-evidence <file>]
//
// Boots a THROWAWAY PostgreSQL cluster, provisions the M7 roles through the ACCEPTED VBA-S02-1
// template, replays the accepted migrations AS the migration role, installs the M7 §19 normative
// DDL, activates plane A1 of the M7 SIGNER RUNTIME TEST FIXTURE, builds A1/A2 rows through the
// SANCTIONED A1/A2 services (the accepted SO-2 builder, unchanged), hands the suite the M7 role
// credentials and the expected control-plane digest, runs the signer suite against REAL PostgreSQL,
// then (PPC-1) the provider-capability suite in the SAME cluster, and then destroys the cluster and
// verifies the destruction. The two suites run as two sequential vitest invocations so their order is
// fixed: the accepted foundation suite first (planes A1 → A2 → K), then PPC-1 (planes S1 → S2 on a
// second fixture backend).
//
// ── WHAT THIS IS NOT ───────────────────────────────────────────────────────────────────────────
// The control planes it installs (and the A1 → A2 → K rotations the suite performs) are a DISPOSABLE
// TEST FIXTURE (src/m7/signer/__fixtures__/signer-runtime-control-plane.ts):
//     NOT A PRODUCTION MANIFEST · NOT AUTHORITY · NOT LC-3 ACCEPTED · NOT PUBLISHED
//     NOT A SELECTOR VALUE · NOT A SELECTOR ROTATION · NOT LIFECYCLE EVIDENCE
// PPC-1: the provider suite signs with the REAL signing library and TEST credentials the suite itself
// generates (random, `.invalid` endpoints) — no provider, emulator or conformance double, no real
// provider credential. It writes no migration and publishes nothing under authority/.
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
  SIGNER_FIXTURE_KIND,
  SIGNER_IDENTITIES,
  installSignerPlaneA1,
  signerDriftedDigest,
  signerFixtureDigest,
  signerProviderFixtureDigest,
} from '../../src/m7/signer/__fixtures__/signer-runtime-control-plane';
import { resolvePgBinaries } from '../../src/m7/testkit/cluster';
import { deriveM7RoleExpectations } from '../../src/m7/testkit/roles';
import { buildSo2A1A2Participants, A2_TEST_BUILD_GIT_SHA } from './pg-m7-so2-a1a2';

const ROOT = resolve(import.meta.dirname, '..', '..');

/** The environment variable through which the orchestrator hands its context to the suite. */
export const SIGNER_CONTEXT_ENV = 'M7_SIGNER_CONTEXT';
/** Where the suite writes its structured evidence (JSON). */
export const SIGNER_SUITE_EVIDENCE_ENV = 'M7_SIGNER_SUITE_EVIDENCE';
/** Where the PPC-1 provider suite writes its structured evidence (JSON). */
export const SIGNER_PROVIDER_SUITE_EVIDENCE_ENV = 'M7_SIGNER_PROVIDER_SUITE_EVIDENCE';

/** Participants with enough purchase intents for one fresh generation grant per case: S for the
 *  accepted foundation suite, P for the PPC-1 provider suite. */
const PLAN = [
  { label: 'S', intents: 24, optionalEvidenceConsent: true },
  { label: 'P', intents: 24, optionalEvidenceConsent: true },
] as const;

/** Every M7 login role of §18.2 (the suite probes the signer's and the worker's ACLs against them). */
const M7_LOGIN_ROLES = [
  'pagamenos_m7_participant_rt',
  'pagamenos_m7_session_issuer_rt',
  'pagamenos_m7_privacy_request_rt',
  'pagamenos_m7_storage_worker_rt',
  'pagamenos_m7_deletion_authority_rt',
  'pagamenos_m7_capability_signer_rt',
] as const;

class NotExecuted extends Error {}

function log(message: string): void {
  console.log(`[m7:signer] ${message}`);
}

/** Installs the M7 §19 DDL and activates fixture plane A1, in ONE transaction (F01 BEGIN). */
async function installM7(
  env: S03Environment,
  database: string,
): Promise<{ manifestSha256: string; backendSha256: string }> {
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
      const install = await installSignerPlaneA1(client, sources);
      await client.query(partition.suffixText);
      log(`M7 installed; fixture plane A1 manifest ${install.manifestSha256}`);
      return { manifestSha256: install.manifestSha256, backendSha256: install.backendSha256 };
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
    row.mv !== SIGNER_IDENTITIES.A1.manifestVersion ||
    row.digest !== manifestSha256
  ) {
    throw new Error('the signer fixture plane A1 is not the single active installation');
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
    argValue('--suite-evidence') ??
    resolve(tmpdir(), `m7-signer-suite-evidence-${process.pid}.json`);
  const providerSuiteEvidencePath =
    argValue('--provider-suite-evidence') ??
    resolve(tmpdir(), `m7-signer-provider-suite-evidence-${process.pid}.json`);

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
  const database = 'pagamenos_m7_signer';

  let env: S03Environment | undefined;
  let teardown: TeardownEvidence | undefined;
  let suiteOk = false;
  let providerSuiteOk = false;
  try {
    log('booting a throwaway cluster and provisioning the accepted M7 roles');
    env = await startProvisionedEnvironment(
      'signer',
      binaries,
      roleExpectations,
      migrationRole,
      ROOT,
    );
    log(`cluster on 127.0.0.1:${env.cluster.port}; migration role ${migrationRole}`);

    const applied = await freshMigratedDatabase(env, database, ROOT);
    log(`accepted migrations replayed as the migration role (${applied.length})`);

    const { manifestSha256, backendSha256 } = await installM7(env, database);
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
        },
      ]),
    );

    const roleUrls = Object.fromEntries(
      M7_LOGIN_ROLES.map((r) => [r, databaseUrl(env!, r, database)]),
    );
    const context = {
      fixtureKind: SIGNER_FIXTURE_KIND,
      manifestSha256,
      backendSha256,
      rotationManifestSha256: { A2: signerFixtureDigest('A2'), K: signerFixtureDigest('K') },
      providerManifestSha256: {
        S1: signerProviderFixtureDigest('S1'),
        S2: signerProviderFixtureDigest('S2'),
      },
      driftedManifestSha256: signerDriftedDigest(),
      database,
      port: env.cluster.port,
      serverVersion: env.identity.versionString,
      migrationRole,
      participants,
      urls: { application: applicationUrl, roles: roleUrls },
    };

    const suiteEnv = {
      ...process.env,
      DATABASE_URL: context.urls.application,
      M7_PARTICIPANT_DATABASE_URL: roleUrls.pagamenos_m7_participant_rt,
      M7_SESSION_ISSUER_DATABASE_URL: roleUrls.pagamenos_m7_session_issuer_rt,
      M7_CAPABILITY_SIGNER_DATABASE_URL: roleUrls.pagamenos_m7_capability_signer_rt,
      M7_CONTROL_PLANE_MANIFEST_SHA256: manifestSha256,
      PAGAMENOS_GIT_SHA: A2_TEST_BUILD_GIT_SHA,
      [SIGNER_CONTEXT_ENV]: JSON.stringify(context),
      [SIGNER_SUITE_EVIDENCE_ENV]: suiteEvidencePath,
      [SIGNER_PROVIDER_SUITE_EVIDENCE_ENV]: providerSuiteEvidencePath,
    };
    log('running the signer foundation suite against real PostgreSQL');
    const run = spawnSync(
      'npx vitest run -c vitest.m7-signer.config.ts src/m7/signer/signer-runtime.m7-signer.test.ts',
      { stdio: 'inherit', shell: true, cwd: ROOT, env: suiteEnv },
    );
    suiteOk = run.status === 0;
    log('running the PPC-1 provider-capability suite against real PostgreSQL (same cluster)');
    const runProvider = spawnSync(
      'npx vitest run -c vitest.m7-signer.config.ts src/m7/signer/signer-provider.m7-signer.test.ts',
      { stdio: 'inherit', shell: true, cwd: ROOT, env: suiteEnv },
    );
    providerSuiteOk = runProvider.status === 0;

    if (evidencePath !== undefined) {
      const suiteEvidence: unknown = existsSync(suiteEvidencePath)
        ? JSON.parse(readFileSync(suiteEvidencePath, 'utf8'))
        : null;
      const providerSuiteEvidence: unknown = existsSync(providerSuiteEvidencePath)
        ? JSON.parse(readFileSync(providerSuiteEvidencePath, 'utf8'))
        : null;
      writeFileSync(
        evidencePath,
        `${JSON.stringify(
          {
            harness: 'M7 CAPABILITY SIGNER / TO-8 DB FOUNDATION + PPC-1 PROVIDER CAPABILITY',
            fixtureKind: SIGNER_FIXTURE_KIND,
            notAProductionManifest: true,
            notAuthority: true,
            notPublished: true,
            notASelectorValue: true,
            notASelectorRotation: true,
            notLifecycleEvidence: true,
            noProviderInvolved: true,
            testCredentialsOnly: true,
            notFamilyQ: true,
            serverVersion: env.identity.versionString,
            migrationRole,
            appliedMigrations: applied,
            planeA1: { manifestVersion: SIGNER_IDENTITIES.A1.manifestVersion, manifestSha256 },
            provisioning: env.provisioning,
            suite: suiteOk ? 'PASS' : 'FAIL',
            providerSuite: providerSuiteOk ? 'PASS' : 'FAIL',
            suiteEvidence,
            providerSuiteEvidence,
          },
          null,
          2,
        )}\n`,
        'utf8',
      );
      log(`evidence written to ${evidencePath}`);
    }
    return suiteOk && providerSuiteOk ? 0 : 1;
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
        `\n[m7:signer] PostgreSQL server binaries not found (${e.message}).\n` +
          `[m7:signer] The M7 capability-signer real-PostgreSQL gate is NOT EXECUTED.\n` +
          `[m7:signer] Install PostgreSQL (initdb/pg_ctl) on PATH or set PG_BIN, then re-run.\n`,
      );
      process.exit(2);
    }
    console.error(e);
    process.exit(1);
  });

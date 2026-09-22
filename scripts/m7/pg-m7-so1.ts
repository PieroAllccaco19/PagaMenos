// PagaMenos · M7 V1.1 — SO-1 PARTICIPANT RUNTIME real-PostgreSQL orchestrator.
//
//   pnpm m7:so1  [--evidence <file>]
//
// Boots a THROWAWAY PostgreSQL cluster, provisions the M7 roles through the ACCEPTED VBA-S02-1
// template, replays the accepted migrations AS the migration role, installs the M7 §19 normative
// DDL, activates the M7 SO1 RUNTIME TEST FIXTURE control plane, builds A1/A2 rows through the
// SANCTIONED A1/A2 services, hands the suite the two M7 role credentials and the expected
// control-plane digest, runs the SO-1 runtime suite against REAL PostgreSQL, and then destroys the
// cluster and verifies the destruction.
//
// ── WHAT THIS IS NOT ───────────────────────────────────────────────────────────────────────────
// The control plane it installs is a DISPOSABLE TEST FIXTURE
// (src/m7/so1/__fixtures__/so1-runtime-control-plane.ts):
//     NOT A PRODUCTION MANIFEST · NOT AUTHORITY · NOT LC-3 ACCEPTED · NOT PUBLISHED
//     NOT A SELECTOR VALUE · NOT LIFECYCLE EVIDENCE
// It writes no migration, publishes nothing under authority/, and reinterprets M7-S03-VBCP as
// nothing at all: it carries its own marker namespace, identities and digest.
//
// Missing PostgreSQL binaries are NOT EXECUTED (exit 2), never PASS.
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import pg from 'pg';

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
  SO1_FIXTURE_KIND,
  SO1_IDENTITIES,
  SO1_MERCHANT_REFS,
  installSo1ControlPlane,
  so1DriftedDigest,
} from '../../src/m7/so1/__fixtures__/so1-runtime-control-plane';
import { resolvePgBinaries } from '../../src/m7/testkit/cluster';
import { deriveM7RoleExpectations } from '../../src/m7/testkit/roles';
import { buildA1A2Participants, A2_TEST_BUILD_GIT_SHA } from './pg-m7-s03-a1a2';

const ROOT = resolve(import.meta.dirname, '..', '..');

/** The environment variable through which the orchestrator hands its context to the suite. */
export const SO1_CONTEXT_ENV = 'M7_SO1_CONTEXT';

export interface So1HarnessContext {
  readonly fixtureKind: typeof SO1_FIXTURE_KIND;
  readonly manifestSha256: string;
  readonly driftedManifestSha256: string;
  readonly merchantRefs: readonly string[];
  readonly database: string;
  readonly port: number;
  readonly participants: {
    readonly A: SerializedParticipant;
    readonly B: SerializedParticipant;
    readonly C: SerializedParticipant;
  };
  readonly urls: {
    readonly application: string;
    readonly participant: string;
    readonly sessionIssuer: string;
  };
}

export interface SerializedParticipant {
  readonly label: string;
  readonly participantId: string;
  readonly assignmentId: string;
  readonly intentIds: readonly string[];
}

class NotExecuted extends Error {}

function log(message: string): void {
  console.log(`[m7:so1] ${message}`);
}

/** Installs the M7 §19 DDL and activates the fixture control plane, in ONE transaction (F01 BEGIN). */
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
  // The catalog is derived from the ACCEPTED normative SQL, so the fixture cannot drift from it.
  deriveCatalog(sources);

  return withLogin(
    env.cluster,
    env.migrationRole,
    env.credentials.get(env.migrationRole)!,
    database,
    async (client) => {
      for (const f of fragments) await client.query(f.sql);
      await client.query(partition.prefixText);
      const install = await installSo1ControlPlane(client, sources);
      await client.query(partition.suffixText);
      log(`M7 installed; fixture manifest ${install.manifestSha256}`);
      return { manifestSha256: install.manifestSha256 };
    },
  );
}

/** Proves the fixture control plane is the single ACTIVE installation before the suite runs. */
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
    row.mv !== SO1_IDENTITIES.manifestVersion ||
    row.digest !== manifestSha256
  ) {
    throw new Error(`the SO-1 fixture control plane is not the single active installation`);
  }
  log(`active installation verified: ${row.mv}`);
}

async function main(): Promise<number> {
  const evidenceIndex = process.argv.indexOf('--evidence');
  const evidencePath = evidenceIndex >= 0 ? process.argv[evidenceIndex + 1] : undefined;

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
  const database = 'pagamenos_m7_so1';

  let env: S03Environment | undefined;
  let teardown: TeardownEvidence | undefined;
  let suiteOk = false;
  try {
    log('booting a throwaway cluster and provisioning the accepted M7 roles');
    env = await startProvisionedEnvironment('so1', binaries, roleExpectations, migrationRole, ROOT);
    log(`cluster on 127.0.0.1:${env.cluster.port}; migration role ${migrationRole}`);

    const applied = await freshMigratedDatabase(env, database, ROOT);
    log(`accepted migrations replayed as the migration role (${applied.length})`);

    const { manifestSha256 } = await installM7(env, database);
    await assertActiveInstallation(env, database, manifestSha256);

    const applicationUrl = databaseUrl(env, migrationRole, database);
    log('building A1/A2 rows through the SANCTIONED A1/A2 services');
    const built = await buildA1A2Participants(applicationUrl, [
      { label: 'A', intents: 5 },
      { label: 'B', intents: 1 },
      // C is used by the withdrawal-serialization case, which permanently withdraws its consent.
      { label: 'C', intents: 1 },
    ]);
    const [A, B, C] = built;
    if (A === undefined || B === undefined || C === undefined) {
      throw new Error('A1/A2 fixture build produced no rows');
    }
    const serialize = (p: typeof A): SerializedParticipant => ({
      label: p.label,
      participantId: p.participantId,
      assignmentId: p.assignmentId,
      intentIds: [...p.intentIds],
    });

    const context: So1HarnessContext = {
      fixtureKind: SO1_FIXTURE_KIND,
      manifestSha256,
      driftedManifestSha256: so1DriftedDigest(),
      merchantRefs: [...SO1_MERCHANT_REFS],
      database,
      port: env.cluster.port,
      participants: { A: serialize(A), B: serialize(B), C: serialize(C) },
      urls: {
        application: applicationUrl,
        participant: databaseUrl(env, 'pagamenos_m7_participant_rt', database),
        sessionIssuer: databaseUrl(env, 'pagamenos_m7_session_issuer_rt', database),
      },
    };

    log('running the SO-1 runtime suite against real PostgreSQL');
    const run = spawnSync('npx vitest run -c vitest.m7-so1.config.ts', {
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
        [SO1_CONTEXT_ENV]: JSON.stringify(context),
      },
    });
    suiteOk = run.status === 0;

    if (evidencePath !== undefined) {
      writeFileSync(
        evidencePath,
        `${JSON.stringify(
          {
            harness: 'M7 SO-1 PARTICIPANT RUNTIME',
            fixtureKind: SO1_FIXTURE_KIND,
            notAProductionManifest: true,
            notAuthority: true,
            notPublished: true,
            notASelectorValue: true,
            serverVersion: env.identity.versionString,
            migrationRole,
            appliedMigrations: applied,
            manifestVersion: SO1_IDENTITIES.manifestVersion,
            manifestSha256,
            provisioning: env.provisioning,
            suite: suiteOk ? 'PASS' : 'FAIL',
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
    // Every M7 role credential was generated per run and is discarded with the cluster.
  }
}

// A stray pooled connection must never keep the orchestrator alive after the verdict.
main()
  .then((code) => process.exit(code))
  .catch((e: unknown) => {
    if (e instanceof NotExecuted) {
      console.error(
        `\n[m7:so1] PostgreSQL server binaries not found (${e.message}).\n` +
          `[m7:so1] The M7 SO-1 real-PostgreSQL gate is NOT EXECUTED.\n` +
          `[m7:so1] Install PostgreSQL (initdb/pg_ctl) on PATH or set PG_BIN, then re-run.\n`,
      );
      process.exit(2);
    }
    console.error(e);
    process.exit(1);
  });

export type { pg };

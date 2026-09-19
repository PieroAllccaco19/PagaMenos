// M7 V1.1 — S03 verification bootstrap: disposable environments (VBA-01 §10 VBA-TX-5 / VBA-TX-6).
//
// Verification tooling only. Each environment is a THROWAWAY cluster from the accepted S02 testkit, gated
// by the VFC-PG-1 floor (H03, before anything is provisioned), provisioned ONLY by the accepted
// VBA-S02-1 template (no ad-hoc grant, no role alteration), and destroyed afterwards with the destruction
// verified. Databases are created by the bootstrap administrator, owned by the migration role, and carry
// the accepted migrations replayed AS the migration role.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { createConnection } from 'node:net';
import { join } from 'node:path';

import pg from 'pg';

import { EphemeralCluster, type PgBinaries, type ServerIdentity } from '../testkit/cluster';
import {
  HARNESS_CONNECTION_LIMIT,
  assertHarnessServerVersion,
  generateSecret,
  readRolesTemplate,
  renderRolesTemplate,
} from '../testkit/provision';
import {
  type M7RoleExpectations,
  type ObservedOwnerAccess,
  type ObservedOwnerEdge,
  evaluateMigrationSession,
  observeMigrationSession,
  observeOwnerAccess,
  observeOwnerEdges,
  observeRoles,
  verifyMigrationRole,
  verifyRoles,
} from '../testkit/roles';

export class EnvironmentError extends Error {
  constructor(message: string) {
    super(`M7-S03 ENVIRONMENT: ${message}`);
    this.name = 'EnvironmentError';
  }
}

export interface ProvisioningEvidence {
  readonly version: string;
  readonly serverVersion: string;
  readonly serverVersionNum: number;
  readonly h03: {
    readonly floor: number;
    readonly pass: true;
    readonly checkedBeforeProvisioning: true;
  };
  readonly migrationRole: string;
  readonly migrationRoleAttributes: Record<string, unknown>;
  readonly ownerEdges: readonly ObservedOwnerEdge[];
  readonly ownerAccess: ObservedOwnerAccess;
  readonly migrationSession: Record<string, unknown>;
  readonly roleMismatches: readonly unknown[];
  readonly migrationRoleMismatches: readonly unknown[];
}

export interface S03Environment {
  readonly label: string;
  readonly cluster: EphemeralCluster;
  readonly identity: ServerIdentity;
  readonly credentials: Map<string, string>;
  readonly secrets: string[];
  readonly migrationRole: string;
  readonly expectations: M7RoleExpectations;
  readonly provisioning: ProvisioningEvidence;
  dataDirectory: string;
}

/** Boots, gates (H03 / VFC-PG-1) and provisions one throwaway cluster through the accepted template. */
export async function startProvisionedEnvironment(
  label: string,
  binaries: PgBinaries,
  expectations: M7RoleExpectations,
  migrationRole: string,
  root: string,
): Promise<S03Environment> {
  const cluster = await EphemeralCluster.start(binaries);
  const secrets = [...cluster.secrets()];
  try {
    const identity = await cluster.identity();
    // H03 before anything is provisioned: a server below 160000 is refused here (VFC-PG-1).
    assertHarnessServerVersion(identity.serverVersionNum);
    const dataDirectory = await cluster.withAdmin('postgres', async (c) =>
      String((await c.query(`SELECT pg_catalog.current_setting('data_directory') AS d`)).rows[0].d),
    );
    const credentials = new Map<string, string>();
    for (const role of [...expectations.login.map((r) => r.name), migrationRole]) {
      const s = generateSecret();
      credentials.set(role, s);
      secrets.push(s);
    }
    const sql = renderRolesTemplate({
      template: readRolesTemplate(root),
      expectations,
      migrationRole,
      secrets: credentials,
      connectionLimit: HARNESS_CONNECTION_LIMIT,
    });
    await cluster.withAdmin('postgres', (c) => c.query(sql));
    const owner = expectations.owner.name;
    const roleMismatches = await cluster.withAdmin('postgres', (c) =>
      verifyRoles(c, expectations.all, migrationRole),
    );
    const migrationRoleMismatches = await cluster.withAdmin('postgres', (c) =>
      verifyMigrationRole(c, migrationRole, owner),
    );
    const ownerEdges = await cluster.withAdmin('postgres', (c) => observeOwnerEdges(c, owner));
    const ownerAccess = await cluster.withAdmin('postgres', (c) =>
      observeOwnerAccess(c, migrationRole, owner),
    );
    const attrs = (await cluster.withAdmin('postgres', (c) => observeRoles(c, [migrationRole])))[0];
    const session = await withLogin(
      cluster,
      migrationRole,
      credentials.get(migrationRole)!,
      'postgres',
      (c) => observeMigrationSession(c, owner),
    );
    const sessionMismatches = evaluateMigrationSession(migrationRole, session);
    if (roleMismatches.length || migrationRoleMismatches.length || sessionMismatches.length) {
      throw new EnvironmentError(
        `accepted provisioning not verified: ${JSON.stringify({ roleMismatches, migrationRoleMismatches, sessionMismatches })}`,
      );
    }
    return {
      label,
      cluster,
      identity,
      credentials,
      secrets,
      migrationRole,
      expectations,
      dataDirectory,
      provisioning: {
        version: identity.versionString,
        serverVersion: identity.serverVersion,
        serverVersionNum: identity.serverVersionNum,
        h03: { floor: 160000, pass: true, checkedBeforeProvisioning: true },
        migrationRole,
        migrationRoleAttributes: { ...attrs },
        ownerEdges,
        ownerAccess,
        migrationSession: { ...session },
        roleMismatches,
        migrationRoleMismatches,
      },
    };
  } catch (error) {
    cluster.stop();
    throw error;
  }
}

export async function withLogin<T>(
  cluster: EphemeralCluster,
  role: string,
  password: string,
  database: string,
  fn: (c: pg.Client) => Promise<T>,
): Promise<T> {
  const c = new pg.Client({
    host: '127.0.0.1',
    port: cluster.port,
    database,
    user: role,
    password,
    application_name: `m7s03:${role}`.slice(0, 63),
  });
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
}

export function databaseUrl(env: S03Environment, role: string, database: string): string {
  const pw = env.credentials.get(role);
  if (pw === undefined) throw new EnvironmentError(`no credential for ${role}`);
  return `postgresql://${role}:${encodeURIComponent(pw)}@127.0.0.1:${env.cluster.port}/${database}?schema=public`;
}

export function acceptedMigrationNames(root: string): string[] {
  const dir = join(root, 'prisma', 'migrations');
  return readdirSync(dir)
    .filter((n) => statSync(join(dir, n)).isDirectory())
    .sort();
}

/** CREATE DATABASE (bootstrap admin, owner = migration role) + accepted migrations replayed as that role. */
export async function freshMigratedDatabase(
  env: S03Environment,
  name: string,
  root: string,
): Promise<string[]> {
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(name)) throw new EnvironmentError(`bad database name ${name}`);
  await env.cluster.withAdmin('postgres', (c) =>
    c.query(`CREATE DATABASE ${name} OWNER ${env.migrationRole} ENCODING 'UTF8'`),
  );
  const res = spawnSync('npx prisma migrate deploy', {
    stdio: 'ignore',
    shell: true,
    cwd: root,
    env: { ...process.env, DATABASE_URL: databaseUrl(env, env.migrationRole, name) },
  });
  if (res.status !== 0)
    throw new EnvironmentError(`prisma migrate deploy into ${name} exited ${res.status}`);
  const applied = await withLogin(
    env.cluster,
    env.migrationRole,
    env.credentials.get(env.migrationRole)!,
    name,
    async (c) =>
      (
        await c.query<{ n: string }>(
          `SELECT migration_name AS n FROM public._prisma_migrations
          WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name`,
        )
      ).rows.map((r) => r.n),
  );
  const accepted = acceptedMigrationNames(root);
  if (JSON.stringify(applied) !== JSON.stringify(accepted)) {
    throw new EnvironmentError(
      `${name}: applied ${applied.join(',')} ≠ accepted ${accepted.join(',')}`,
    );
  }
  return applied;
}

async function portClosed(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const s = createConnection({ host: '127.0.0.1', port });
    s.once('connect', () => {
      s.destroy();
      resolve(false);
    });
    s.once('error', () => resolve(true));
  });
}

export interface TeardownEvidence {
  readonly label: string;
  readonly serverStopped: boolean;
  readonly portClosed: boolean;
  readonly dataDirectoryRemoved: boolean;
  readonly credentialsDiscarded: boolean;
  /** postgres processes whose command line names this cluster's data directory (must be 0). */
  readonly survivingProcesses: number | null;
}

/** Counts live postgres processes started on `dataDirectory` (null when the platform probe is unavailable). */
function survivingPostgresProcesses(dataDirectory: string): number | null {
  const norm = (text: string) => text.replace(/\\/g, '/').toLowerCase();
  const needle = norm(dataDirectory);
  if (process.platform === 'win32') {
    const r = spawnSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        'Get-CimInstance Win32_Process -Filter "Name=\'postgres.exe\'" | ForEach-Object { $_.CommandLine }',
      ],
      { encoding: 'utf8' },
    );
    if (r.status !== 0) return null;
    return r.stdout.split(/\r?\n/).filter((l) => norm(l).includes(needle)).length;
  }
  const r = spawnSync('ps', ['-eo', 'args'], { encoding: 'utf8' });
  if (r.status !== 0) return null;
  return r.stdout.split('\n').filter((l) => norm(l).includes(needle)).length;
}

/** Stops the cluster, removes its data directory (retrying on Windows), and verifies both. */
export async function destroyEnvironment(env: S03Environment): Promise<TeardownEvidence> {
  const port = env.cluster.port;
  env.cluster.stop();
  for (let i = 0; i < 20 && existsSync(env.dataDirectory); i += 1) {
    try {
      rmSync(env.dataDirectory, { recursive: true, force: true });
    } catch {
      // a Windows handle may linger briefly after stop
    }
    if (existsSync(env.dataDirectory)) await new Promise((r) => setTimeout(r, 250));
  }
  const closed = await portClosed(port);
  env.credentials.clear();
  return {
    label: env.label,
    serverStopped: closed,
    portClosed: closed,
    dataDirectoryRemoved: !existsSync(env.dataDirectory),
    credentialsDiscarded: env.credentials.size === 0,
    survivingProcesses: survivingPostgresProcesses(env.dataDirectory),
  };
}

// M7 V1.1 — S02 real-PostgreSQL harness: ephemeral cluster lifecycle and prerequisite probe.
//
// Test infrastructure only. Boots a THROWAWAY PostgreSQL cluster with password (SCRAM) authentication
// on loopback, so the role credentials the harness provisions are genuinely exercised rather than
// bypassed by `trust`. The bootstrap administrator's password is generated at run time, handed to
// initdb through a private temporary file that is deleted as soon as initdb returns, and kept only in
// memory afterwards.
//
// Missing server binaries are a missing execution prerequisite → NotExecutedError (NOT EXECUTED),
// never a pass. Binaries that exist but fail to initialise or start are a FAIL.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import pg from 'pg';

import { NotExecutedError } from './outcome';
import { generateSecret } from './provision';
import type { ConnectionSpec } from './sessions';

const IS_WIN = process.platform === 'win32';

/** The server binaries the harness needs. Client binaries (psql, createdb) are NOT used. */
export const REQUIRED_PG_BINARIES = ['initdb', 'pg_ctl', 'postgres'] as const;

export interface PgBinaries {
  readonly initdb: string;
  readonly pg_ctl: string;
  readonly postgres: string;
  /** `postgres --version` output of the resolved server binary (the running server is re-queried). */
  readonly binaryVersion: string;
  readonly source: 'PG_BIN' | 'PATH';
}

function exeName(name: string): string {
  return IS_WIN ? `${name}.exe` : name;
}

/**
 * Resolves the PostgreSQL server binaries from `pgBin` (the `PG_BIN` directory) or from PATH. Throws
 * NotExecutedError naming the exact missing binary if any is absent.
 */
export function resolvePgBinaries(pgBin: string | undefined): PgBinaries {
  const dir = pgBin?.trim() ? pgBin.trim() : undefined;
  const resolved: Record<string, string> = {};
  for (const name of REQUIRED_PG_BINARIES) {
    const cmd = dir ? join(dir, exeName(name)) : exeName(name);
    if (dir && !existsSync(cmd)) {
      throw new NotExecutedError(`PostgreSQL server binary '${name}' not found in PG_BIN=${dir}`);
    }
    const probe = spawnSync(cmd, ['--version'], { encoding: 'utf8', shell: false });
    if (probe.error) {
      const code = (probe.error as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        throw new NotExecutedError(
          dir
            ? `PostgreSQL server binary '${name}' not executable in PG_BIN=${dir}`
            : `PostgreSQL server binary '${name}' not found on PATH (set PG_BIN)`,
        );
      }
      throw new NotExecutedError(`PostgreSQL server binary '${name}' failed to spawn: ${code}`);
    }
    if (probe.status !== 0) {
      throw new NotExecutedError(
        `PostgreSQL server binary '${name}' --version exited ${probe.status}`,
      );
    }
    resolved[name] = cmd;
  }
  const version = spawnSync(resolved.postgres!, ['--version'], { encoding: 'utf8', shell: false });
  return {
    initdb: resolved.initdb!,
    pg_ctl: resolved.pg_ctl!,
    postgres: resolved.postgres!,
    binaryVersion: (version.stdout ?? '').trim(),
    source: dir ? 'PG_BIN' : 'PATH',
  };
}

async function freeLoopbackPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      if (addr && typeof addr === 'object') {
        const { port } = addr;
        srv.close(() => resolve(port));
      } else {
        srv.close(() => reject(new Error('could not determine a free loopback port')));
      }
    });
  });
}

function run(
  cmd: string,
  args: string[],
  label: string,
  secrets: string[] = [],
  stdio: 'pipe' | 'ignore' = 'pipe',
): void {
  // `pg_ctl start` leaves the postmaster holding the inherited stdio handles; with pipes, spawnSync
  // would wait on them forever (observed on Windows). Server output goes to `-l` instead.
  const res = spawnSync(cmd, args, { encoding: 'utf8', shell: false, stdio });
  if (res.error) {
    if ((res.error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new NotExecutedError(`PostgreSQL binary not found at run time: ${cmd}`);
    }
    throw new Error(`${label} failed to spawn: ${res.error.message}`);
  }
  if (res.status !== 0) {
    let out = `${res.stdout ?? ''}\n${res.stderr ?? ''}`;
    for (const s of secrets) out = out.split(s).join('[REDACTED]');
    throw new Error(`${label} exited with status ${res.status}:\n${out.trim()}`);
  }
}

export interface ServerIdentity {
  readonly serverVersion: string;
  readonly serverVersionNum: number;
  readonly versionString: string;
  readonly deadlockTimeout: string;
  readonly passwordEncryption: string;
}

export class EphemeralCluster {
  private stopped = false;

  private constructor(
    private readonly binaries: PgBinaries,
    private readonly dataDir: string,
    readonly port: number,
    readonly adminUser: string,
    private readonly adminPassword: string,
  ) {}

  /** initdb (SCRAM, UTF8) + pg_ctl start on 127.0.0.1:<free port>. */
  static async start(binaries: PgBinaries): Promise<EphemeralCluster> {
    const dataDir = mkdtempSync(join(tmpdir(), 'pagamenos-m7-s02-pg-'));
    const pwDir = mkdtempSync(join(tmpdir(), 'pagamenos-m7-s02-pw-'));
    const adminUser = 'postgres';
    const adminPassword = generateSecret();
    const pwFile = join(pwDir, 'pw');
    try {
      writeFileSync(pwFile, `${adminPassword}\n`, { mode: 0o600 });
      run(
        binaries.initdb,
        [
          '-D',
          dataDir,
          '-U',
          adminUser,
          `--pwfile=${pwFile}`,
          '--auth-local=scram-sha-256',
          '--auth-host=scram-sha-256',
          '--encoding=UTF8',
          '--no-instructions',
        ],
        'initdb',
        [adminPassword],
      );
    } catch (error) {
      rmSync(dataDir, { recursive: true, force: true });
      throw error;
    } finally {
      rmSync(pwDir, { recursive: true, force: true });
    }

    const port = await freeLoopbackPort();
    const cluster = new EphemeralCluster(binaries, dataDir, port, adminUser, adminPassword);
    try {
      run(
        binaries.pg_ctl,
        [
          '-D',
          dataDir,
          '-o',
          `-p ${port} -c listen_addresses=127.0.0.1`,
          '-w',
          '-t',
          '60',
          '-l',
          join(dataDir, 'server.log'),
          'start',
        ],
        'pg_ctl start',
        [],
        'ignore',
      );
    } catch (error) {
      const log = join(dataDir, 'server.log');
      const tail = existsSync(log) ? readFileSync(log, 'utf8').slice(-2000) : '(no server.log)';
      cluster.removeDataDir();
      throw new Error(`${error instanceof Error ? error.message : String(error)}
${tail}`);
    }
    return cluster;
  }

  /** Bootstrap-administrator connection spec (used only for provisioning and negative controls). */
  adminSpec(database = 'postgres'): ConnectionSpec {
    return {
      host: '127.0.0.1',
      port: this.port,
      database,
      user: this.adminUser,
      password: this.adminPassword,
    };
  }

  /** Secrets this cluster holds, for redaction. */
  secrets(): string[] {
    return [this.adminPassword];
  }

  async withAdmin<T>(database: string, fn: (client: pg.Client) => Promise<T>): Promise<T> {
    const client = new pg.Client({ ...this.adminSpec(database), application_name: 'm7s02:admin' });
    await client.connect();
    try {
      return await fn(client);
    } finally {
      await client.end();
    }
  }

  async identity(): Promise<ServerIdentity> {
    return this.withAdmin('postgres', async (c) => {
      const { rows } = await c.query<{
        server_version: string;
        server_version_num: string;
        version: string;
        deadlock_timeout: string;
        password_encryption: string;
      }>(
        `SELECT current_setting('server_version') AS server_version,
                current_setting('server_version_num') AS server_version_num,
                version() AS version,
                current_setting('deadlock_timeout') AS deadlock_timeout,
                current_setting('password_encryption') AS password_encryption`,
      );
      const r = rows[0]!;
      return {
        serverVersion: r.server_version,
        serverVersionNum: Number(r.server_version_num),
        versionString: r.version,
        deadlockTimeout: r.deadlock_timeout,
        passwordEncryption: r.password_encryption,
      };
    });
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    try {
      run(
        this.binaries.pg_ctl,
        ['-D', this.dataDir, '-m', 'fast', '-w', 'stop'],
        'pg_ctl stop',
        [],
        'ignore',
      );
    } catch {
      try {
        run(
          this.binaries.pg_ctl,
          ['-D', this.dataDir, '-m', 'immediate', 'stop'],
          'pg_ctl stop',
          [],
          'ignore',
        );
      } catch {
        // already stopped
      }
    }
    this.removeDataDir();
  }

  private removeDataDir(): void {
    try {
      rmSync(this.dataDir, { recursive: true, force: true });
    } catch {
      // Windows may briefly hold a handle after stop; a leftover temp dir holds no secret.
    }
  }
}

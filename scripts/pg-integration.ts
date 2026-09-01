// PagaMenos · ephemeral-PostgreSQL integration orchestrator (§25/§26).
//
// Boots a THROWAWAY PostgreSQL cluster (initdb), applies the M3.5A migration from a CLEAN database
// via `prisma migrate deploy` (an explicit deployment operation — never startup auto-migrate, §24),
// then runs the integration suite against it and tears everything down. Requires PostgreSQL server
// binaries (initdb / pg_ctl) on PATH, or a directory in `PG_BIN`.
//
// If the server binaries are NOT available, it prints a clear NOT-EXECUTED notice and exits non-zero
// WITHOUT weakening any invariant — the caller reports the real-Postgres gate as NOT EXECUTED (§25).
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const IS_WIN = process.platform === 'win32';
const PG_BIN = process.env.PG_BIN?.trim();

/** Resolve a PostgreSQL server executable (append .exe on Windows; honor PG_BIN if set). */
function pgExe(name: string): string {
  const exe = IS_WIN ? `${name}.exe` : name;
  return PG_BIN ? join(PG_BIN, exe) : exe;
}

/** Run a PostgreSQL binary directly (no shell) so a space-bearing arg like `-o "-p N ..."` is intact. */
function runPg(
  cmd: string,
  args: string[],
  opts: { env?: NodeJS.ProcessEnv; allowFail?: boolean; label: string },
): { ok: boolean; status: number | null } {
  const res = spawnSync(cmd, args, {
    stdio: 'inherit',
    env: opts.env ?? process.env,
    shell: false,
  });
  if (res.error) {
    if ((res.error as NodeJS.ErrnoException).code === 'ENOENT') throw new BinariesMissingError(cmd);
    throw new Error(`${opts.label} failed to spawn: ${res.error.message}`);
  }
  const ok = res.status === 0;
  if (!ok && !opts.allowFail) throw new Error(`${opts.label} exited with status ${res.status}`);
  return { ok, status: res.status };
}

/** Run a Node tool (prisma / vitest) via the platform shell so `.cmd` shims resolve on Windows. */
function runTool(
  command: string,
  opts: { env?: NodeJS.ProcessEnv; allowFail?: boolean; label: string },
): { ok: boolean; status: number | null } {
  const res = spawnSync(command, { stdio: 'inherit', env: opts.env ?? process.env, shell: true });
  if (res.error) throw new Error(`${opts.label} failed to spawn: ${res.error.message}`);
  const ok = res.status === 0;
  if (!ok && !opts.allowFail) throw new Error(`${opts.label} exited with status ${res.status}`);
  return { ok, status: res.status };
}

class BinariesMissingError extends Error {
  constructor(public readonly cmd: string) {
    super(`PostgreSQL binary not found: ${cmd}`);
    this.name = 'BinariesMissingError';
  }
}

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      if (addr && typeof addr === 'object') {
        const { port } = addr;
        srv.close(() => resolve(port));
      } else {
        srv.close(() => reject(new Error('could not determine a free port')));
      }
    });
  });
}

async function main(): Promise<number> {
  const dataDir = mkdtempSync(join(tmpdir(), 'pagamenos-pg-'));
  let started = false;
  try {
    // 1. initdb a throwaway cluster (trust auth — local ephemeral only).
    runPg(pgExe('initdb'), ['-D', dataDir, '-U', 'postgres', '-A', 'trust', '--encoding=UTF8'], {
      label: 'initdb',
    });

    const port = await freePort();

    // 2. Start the server bound to loopback on the chosen port.
    runPg(
      pgExe('pg_ctl'),
      [
        '-D',
        dataDir,
        '-o',
        `-p ${port} -c listen_addresses=127.0.0.1`,
        '-w',
        '-l',
        join(dataDir, 'server.log'),
        'start',
      ],
      { label: 'pg_ctl start' },
    );
    started = true;

    // 3. Create the test database.
    runPg(
      pgExe('createdb'),
      ['-h', '127.0.0.1', '-p', String(port), '-U', 'postgres', 'pagamenos_test'],
      {
        label: 'createdb',
      },
    );

    const databaseUrl = `postgresql://postgres@127.0.0.1:${port}/pagamenos_test?schema=public`;
    const env: NodeJS.ProcessEnv = { ...process.env, DATABASE_URL: databaseUrl };

    // 4. Apply the migration from a CLEAN database (explicit deploy; §24). Proves §25.1.
    runTool('npx prisma migrate deploy', { env, label: 'prisma migrate deploy' });

    // 5. Run the integration suite against the ephemeral database.
    const test = runTool('npx vitest run -c vitest.integration.config.ts', {
      env,
      label: 'vitest integration',
      allowFail: true,
    });

    return test.ok ? 0 : 1;
  } finally {
    if (started) {
      runPg(pgExe('pg_ctl'), ['-D', dataDir, '-m', 'immediate', 'stop'], {
        label: 'pg_ctl stop',
        allowFail: true,
      });
    }
    if (existsSync(dataDir)) {
      try {
        rmSync(dataDir, { recursive: true, force: true });
      } catch {
        // Windows may briefly hold a file handle after stop; a leftover temp dir is harmless.
      }
    }
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    if (err instanceof BinariesMissingError) {
      console.error(
        `\n[integration] PostgreSQL server binaries not found (${err.cmd}).\n` +
          `[integration] The real-PostgreSQL integration gate is NOT EXECUTED.\n` +
          `[integration] Install PostgreSQL (initdb/pg_ctl) on PATH or set PG_BIN, then re-run.\n`,
      );
      process.exit(2);
    }
    console.error(err);
    process.exit(1);
  });

// M7 V1.1 — S02 real-PostgreSQL harness: the context handed from the orchestrator to the real-PG suite.
//
// Test infrastructure only. `scripts/m7/pg-m7-harness.ts` passes the ephemeral cluster's connection
// facts and run-time credentials to the `*.m7-pg.test.ts` suite through one environment variable of the
// child process. They exist only in memory and in that child's environment; nothing is written to
// disk except sanitized evidence (no password, no port).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { NotExecutedError } from './outcome';
import type { ConnectionSpec } from './sessions';

export const HARNESS_CONTEXT_ENV = 'M7_PG_HARNESS_CONTEXT';

export interface HarnessContext {
  readonly host: string;
  readonly port: number;
  readonly adminUser: string;
  readonly adminPassword: string;
  readonly migrationRole: string;
  /** role name → ephemeral password (the six login roles and the migration role). */
  readonly credentials: Readonly<Record<string, string>>;
  readonly databases: { readonly selftest: string };
  readonly serverVersion: string;
  readonly evidenceDir: string;
}

/**
 * Loads the harness context. Absent context is a missing execution prerequisite: the real-PG suite
 * throws NotExecutedError, so running it outside the harness can never report a pass.
 */
export function loadHarnessContext(env: NodeJS.ProcessEnv = process.env): HarnessContext {
  const raw = env[HARNESS_CONTEXT_ENV];
  if (!raw) {
    throw new NotExecutedError(
      `${HARNESS_CONTEXT_ENV} is not set — the real-PostgreSQL suite runs only under \`pnpm m7:pg\``,
    );
  }
  return JSON.parse(raw) as HarnessContext;
}

export function specFor(ctx: HarnessContext, role: string, database: string): ConnectionSpec {
  const password = role === ctx.adminUser ? ctx.adminPassword : ctx.credentials[role];
  if (password === undefined) throw new Error(`no run-time credential for role ${role}`);
  return { host: ctx.host, port: ctx.port, database, user: role, password };
}

/** Writes one sanitized evidence fragment; refuses if it contains any credential of the context. */
export function writeEvidence(ctx: HarnessContext, name: string, data: unknown): void {
  const text = `${JSON.stringify(data, null, 2)}\n`;
  const secrets = [ctx.adminPassword, ...Object.values(ctx.credentials)];
  if (secrets.some((s) => s.length > 0 && text.includes(s))) {
    throw new Error(`evidence fragment ${name} would contain a credential; refused`);
  }
  mkdirSync(ctx.evidenceDir, { recursive: true });
  writeFileSync(join(ctx.evidenceDir, `${name}.json`), text);
}

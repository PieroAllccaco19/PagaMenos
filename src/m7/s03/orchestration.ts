// M7 V1.1 — S03 verification bootstrap: F26 partition and install orchestration (VBA-01 §8).
//
// Verification tooling only. F26 stays byte-identical (VBA-OR-1): it is partitioned in memory at its one
// `DO $final$` line and both parts are executed verbatim. The positive installation executes F01 … F25,
// F26-prefix, the seven accepted `m7.c_*` calls and F26-suffix, each exactly once, in one session and one
// transaction (the one F01's BEGIN opens), with no statement between the first call and the end of
// F26-suffix (VBA-OR-3, VBA-TX-1). The control run executes F01 … F26 verbatim with no bootstrap
// (VBA-OR-6). No SQL is generated, rewritten, normalized, skipped or stored in altered form.
import { createHash } from 'node:crypto';

import type pg from 'pg';

import type { DerivedCatalog, ExpectationPayload } from './expectations';
import type { CallDescriptor, ResolvedCall } from './fixture';
import { resolveCall } from './fixture';
import type { FragmentSource } from './sources';

export class OrchestrationError extends Error {
  constructor(message: string) {
    super(`M7-S03 ORCHESTRATION: ${message}`);
    this.name = 'OrchestrationError';
  }
}

export const F26_PARTITION_LINE = 'DO $final$';

export interface BytesIdentity {
  readonly sha256: string;
  readonly bytes: number;
}

export interface F26Partition {
  readonly original: BytesIdentity;
  readonly prefix: BytesIdentity;
  readonly suffix: BytesIdentity;
  /** 1-based F26 line of `DO $final$`. */
  readonly partitionLine: number;
  readonly concatenationIdentical: boolean;
  readonly prefixText: string;
  readonly suffixText: string;
}

function identity(text: string): BytesIdentity {
  const buf = Buffer.from(text, 'utf8');
  return { sha256: createHash('sha256').update(buf).digest('hex'), bytes: buf.byteLength };
}

/** VBA-OR-2: exactly one column-0 `DO $final$` line; prefix ‖ suffix byte-identical to F26. */
export function partitionF26(f26: string): F26Partition {
  const lines = f26.split('\n');
  const hits = lines.map((l, i) => (l === F26_PARTITION_LINE ? i : -1)).filter((i) => i >= 0);
  if (hits.length !== 1) {
    throw new OrchestrationError(
      `F26 has ${hits.length} lines equal to "${F26_PARTITION_LINE}", not 1`,
    );
  }
  const offset = lines.slice(0, hits[0]).reduce((n, l) => n + Buffer.byteLength(l, 'utf8') + 1, 0);
  const buf = Buffer.from(f26, 'utf8');
  const prefixText = buf.subarray(0, offset).toString('utf8');
  const suffixText = buf.subarray(offset).toString('utf8');
  const concatenationIdentical = Buffer.concat([
    Buffer.from(prefixText, 'utf8'),
    Buffer.from(suffixText, 'utf8'),
  ]).equals(buf);
  if (!concatenationIdentical || !suffixText.startsWith(`${F26_PARTITION_LINE}\n`)) {
    throw new OrchestrationError('F26-prefix ‖ F26-suffix is not byte-identical to F26');
  }
  return {
    original: identity(f26),
    prefix: identity(prefixText),
    suffix: identity(suffixText),
    partitionLine: hits[0]! + 1,
    concatenationIdentical,
    prefixText,
    suffixText,
  };
}

// ---------------------------------------------------------------------------------------------------
// Statement journal
// ---------------------------------------------------------------------------------------------------

export type JournalKind =
  'fragment' | 'fragment-part' | 'vbcp-call' | 'checkpoint' | 'transaction-control';

export interface JournalEntry {
  readonly seq: number;
  readonly label: string;
  readonly kind: JournalKind;
  readonly outcome: 'ok' | 'error';
  readonly sqlstate?: string;
  readonly message?: string;
}

type PgError = Error & { code?: string };

/** One installing session: every statement sent over it is journaled, in order, by label. */
export class JournaledSession {
  readonly journal: JournalEntry[] = [];
  constructor(private readonly client: pg.Client) {}

  async send(
    label: string,
    kind: JournalKind,
    sql: string,
    params?: readonly string[],
  ): Promise<pg.QueryResult | pg.QueryResult[]> {
    const seq = this.journal.length + 1;
    try {
      const res = params
        ? await this.client.query(sql, params as string[])
        : await this.client.query(sql);
      this.journal.push({ seq, label, kind, outcome: 'ok' });
      return res as pg.QueryResult | pg.QueryResult[];
    } catch (error) {
      const e = error as PgError;
      this.journal.push({
        seq,
        label,
        kind,
        outcome: 'error',
        sqlstate: e.code ?? '?',
        message: e.message,
      });
      throw error;
    }
  }

  async checkpoint(label: string): Promise<{ sessionUser: string; currentUser: string }> {
    const res = (await this.send(
      `checkpoint:${label}`,
      'checkpoint',
      'SELECT session_user::text AS "sessionUser", current_user::text AS "currentUser"',
    )) as pg.QueryResult<{ sessionUser: string; currentUser: string }>;
    return res.rows[0]!;
  }
}

export interface Checkpoint {
  readonly at: string;
  readonly sessionUser: string;
  readonly currentUser: string;
  readonly domain: 'ACTUAL DATABASE OBSERVATION';
  /** How the value was observed (the final checkpoint is projected by the seventh bootstrap statement). */
  readonly observedBy?: string;
}

/** VBA-01 §12 VBA-EV: the checkpoint "immediately before F26-suffix". */
export const CHECKPOINT_BEFORE_F26_SUFFIX = 'immediately-before-F26-suffix';

/** The seventh (last) bootstrap call, whose one statement also projects the final checkpoint. */
export const FINAL_BOOTSTRAP_CALL = 'm7.c_activate_manifest_v1';

const RESULT_TAIL = ') AS result';
const SESSION_PROJECTION =
  ', session_user::text AS "sessionUser", current_user::text AS "currentUser"';

/**
 * Extends the resolved seventh call statement `SELECT m7.c_activate_manifest_v1($1::…, …) AS result` so the
 * SAME single statement also projects `session_user` and `current_user` (VBA-EV final checkpoint; AUD-S03-E05-01).
 * The call stays exactly one `c_activate_manifest_v1` invocation with the same bind parameters; no statement
 * is added between the bootstrap sequence and F26-suffix.
 */
export function withSessionIdentityProjection(sql: string): string {
  const head = `SELECT ${FINAL_BOOTSTRAP_CALL}(`;
  if (
    !sql.startsWith(head) ||
    !sql.endsWith(RESULT_TAIL) ||
    sql.split(`${FINAL_BOOTSTRAP_CALL}(`).length !== 2 ||
    sql.includes(';')
  ) {
    throw new OrchestrationError(`unexpected seventh-call statement: ${sql}`);
  }
  return `${sql}${SESSION_PROJECTION}`;
}

export interface InstallFailure {
  readonly step: string;
  readonly sqlstate: string;
  readonly message: string;
}

// ---------------------------------------------------------------------------------------------------
// VBA-OR-6: the no-bootstrap control run
// ---------------------------------------------------------------------------------------------------

export interface ControlRunResult {
  readonly checkpoints: readonly Checkpoint[];
  readonly failure: InstallFailure | null;
  readonly rolledBack: boolean;
  readonly journal: readonly JournalEntry[];
}

/** Executes F01 … F26 verbatim with no bootstrap; returns the first failure (null if none). */
export async function runControlInstall(
  client: pg.Client,
  fragments: readonly FragmentSource[],
): Promise<ControlRunResult> {
  const s = new JournaledSession(client);
  const checkpoints: Checkpoint[] = [];
  const cp = async (at: string) =>
    checkpoints.push({ at, ...(await s.checkpoint(at)), domain: 'ACTUAL DATABASE OBSERVATION' });
  await cp('connection');
  await cp('before-F01');
  let failure: InstallFailure | null = null;
  for (const f of fragments) {
    try {
      await s.send(f.id, 'fragment', f.sql);
    } catch (error) {
      const e = error as PgError;
      failure = { step: f.id, sqlstate: e.code ?? '?', message: e.message };
      break;
    }
    if (f.id === 'F01') await cp('after-F01-SET-LOCAL-ROLE');
  }
  let rolledBack = false;
  if (failure) {
    await s.send('ROLLBACK', 'transaction-control', 'ROLLBACK');
    rolledBack = true;
  }
  return { checkpoints, failure, rolledBack, journal: s.journal };
}

// ---------------------------------------------------------------------------------------------------
// VBA-OR-3: the positive installation with the M7-S03-VBCP bootstrap
// ---------------------------------------------------------------------------------------------------

export interface CallRecord {
  readonly order: number;
  readonly function: string;
  readonly arguments: ResolvedCall['arguments'];
  readonly outcome: 'ok' | 'error' | 'not-reached';
  /** Return value (ACTUAL DATABASE OBSERVATION; for call 1 also the RUNTIME CHAINING VALUE). */
  readonly returned?: string | number | null;
  readonly sqlstate?: string;
  readonly message?: string;
}

export interface RuntimeBindingRecord {
  readonly producer: string;
  readonly returnedValue: string;
  readonly consumer: string;
  readonly consumerParameter: string;
  readonly sentValue: string;
  readonly byteIdentical: boolean;
  readonly domain: 'RUNTIME CHAINING VALUE';
}

export interface PositiveInstallResult {
  readonly checkpoints: readonly Checkpoint[];
  /** The direct immediately-before-F26-suffix checkpoint (null only if the seventh call did not return). */
  readonly finalCheckpoint: Checkpoint | null;
  readonly calls: readonly CallRecord[];
  readonly runtimeBinding: RuntimeBindingRecord | null;
  readonly failure: InstallFailure | null;
  readonly committed: boolean;
  readonly journal: readonly JournalEntry[];
}

export interface PositiveInstallInput {
  readonly fragments: readonly FragmentSource[];
  readonly partition: F26Partition;
  readonly install: readonly CallDescriptor[];
  readonly catalog: DerivedCatalog;
  readonly payload: ExpectationPayload;
  readonly fixtureDigest: string;
  readonly entriesSha256: string;
}

export async function runPositiveInstall(
  client: pg.Client,
  input: PositiveInstallInput,
): Promise<PositiveInstallResult> {
  const s = new JournaledSession(client);
  const checkpoints: Checkpoint[] = [];
  const cp = async (at: string) =>
    checkpoints.push({ at, ...(await s.checkpoint(at)), domain: 'ACTUAL DATABASE OBSERVATION' });
  const calls: CallRecord[] = [];
  let finalCheckpoint: Checkpoint | null = null;
  const runtime = new Map<string, string>();
  const state: { failure: InstallFailure | null } = { failure: null };
  const fail = (step: string, error: unknown) => {
    const e = error as PgError;
    state.failure = { step, sqlstate: e.code ?? '?', message: e.message };
  };

  await cp('connection');
  await cp('before-F01');
  const [f26, ...rest] = [...input.fragments].reverse();
  const ordered = rest.reverse();
  if (f26?.id !== 'F26' || ordered.length !== 25)
    throw new OrchestrationError('fragment set is not F01 … F26');

  for (const f of ordered) {
    try {
      await s.send(f.id, 'fragment', f.sql);
    } catch (error) {
      fail(f.id, error);
      break;
    }
    if (f.id === 'F01') await cp('after-F01-SET-LOCAL-ROLE');
  }
  if (!state.failure) {
    try {
      await s.send('F26-prefix', 'fragment-part', input.partition.prefixText);
    } catch (error) {
      fail('F26-prefix', error);
    }
  }
  if (!state.failure) await cp('before-first-VBCP-call');

  // From here to the end of F26-suffix: the seven calls and F26-suffix only (VBA-TX-1).
  for (const [i, call] of input.install.entries()) {
    if (state.failure) {
      calls.push({ order: i + 1, function: call.function, arguments: [], outcome: 'not-reached' });
      continue;
    }
    const resolved = resolveCall(
      call,
      input.catalog,
      {
        payload: input.payload,
        fixtureDigest: input.fixtureDigest,
        entriesSha256: input.entriesSha256,
      },
      runtime,
    );
    const isFinal = i === input.install.length - 1;
    if (isFinal && call.function !== FINAL_BOOTSTRAP_CALL) {
      throw new OrchestrationError(
        `the seventh call is ${call.function}, not ${FINAL_BOOTSTRAP_CALL}`,
      );
    }
    const sql = isFinal ? withSessionIdentityProjection(resolved.sql) : resolved.sql;
    try {
      const res = (await s.send(
        `vbcp:${i + 1}:${call.function}`,
        'vbcp-call',
        sql,
        resolved.arguments.map((a) => a.bindText),
      )) as pg.QueryResult<{
        result: string | number | null;
        sessionUser?: string;
        currentUser?: string;
      }>;
      if (res.rows.length !== 1)
        throw new OrchestrationError(`${call.function}: ${res.rows.length} rows`);
      const returned = res.rows[0]!.result;
      if (isFinal) {
        finalCheckpoint = {
          at: CHECKPOINT_BEFORE_F26_SUFFIX,
          sessionUser: String(res.rows[0]!.sessionUser),
          currentUser: String(res.rows[0]!.currentUser),
          domain: 'ACTUAL DATABASE OBSERVATION',
          observedBy:
            'DIRECT: projected by the single seventh bootstrap statement (one m7.c_activate_manifest_v1 call); the next statement is F26-suffix. Not registeredBy / installedBy provenance.',
        };
        checkpoints.push(finalCheckpoint);
      }
      calls.push({
        order: i + 1,
        function: call.function,
        arguments: resolved.arguments,
        outcome: 'ok',
        returned,
      });
      if (i === 0) runtime.set(call.function, String(returned));
      if (
        isFinal &&
        (finalCheckpoint?.sessionUser !== input.catalog.migrationRole ||
          finalCheckpoint.currentUser !== input.catalog.ownerRole)
      ) {
        state.failure = {
          step: `checkpoint:${CHECKPOINT_BEFORE_F26_SUFFIX}`,
          sqlstate: 'S03-CHECKPOINT',
          message: `INSTALLATION FAIL: session_user=${finalCheckpoint?.sessionUser} (expected ${input.catalog.migrationRole}), current_user=${finalCheckpoint?.currentUser} (expected ${input.catalog.ownerRole})`,
        };
      }
    } catch (error) {
      const e = error as PgError;
      calls.push({
        order: i + 1,
        function: call.function,
        arguments: resolved.arguments,
        outcome: 'error',
        sqlstate: e.code ?? '?',
        message: e.message,
      });
      fail(`vbcp:${i + 1}:${call.function}`, error);
    }
  }
  let committed = false;
  if (!state.failure) {
    try {
      await s.send('F26-suffix', 'fragment-part', input.partition.suffixText);
      committed = true;
    } catch (error) {
      fail('F26-suffix', error);
    }
  }
  if (state.failure) await s.send('ROLLBACK', 'transaction-control', 'ROLLBACK');

  let runtimeBinding: RuntimeBindingRecord | null = null;
  const producer = calls[0];
  const consumer = calls[1];
  const sent = consumer?.arguments.find((a) => a.class === 'RUNTIME_BINDING');
  if (producer?.outcome === 'ok' && sent) {
    const returnedValue = String(producer.returned);
    runtimeBinding = {
      producer: producer.function,
      returnedValue,
      consumer: consumer!.function,
      consumerParameter: sent.parameter,
      sentValue: sent.bindText,
      byteIdentical: Buffer.from(returnedValue, 'utf8').equals(Buffer.from(sent.bindText, 'utf8')),
      domain: 'RUNTIME CHAINING VALUE',
    };
  }
  return {
    checkpoints,
    finalCheckpoint,
    calls,
    runtimeBinding,
    failure: state.failure,
    committed,
    journal: s.journal,
  };
}

/** VBA-TX-1: the journal proves nothing ran between the first VBCP call and the end of F26-suffix. */
export function assertNoInterleaving(journal: readonly JournalEntry[]): void {
  const first = journal.findIndex((j) => j.kind === 'vbcp-call');
  if (first === -1) return;
  const suffix = journal.findIndex((j) => j.label === 'F26-suffix');
  const end = suffix === -1 ? journal.length : suffix;
  const between = journal.slice(first, end).filter((j) => j.kind !== 'vbcp-call');
  if (between.length > 0) {
    throw new OrchestrationError(
      `statements interleaved with the bootstrap: ${between.map((j) => j.label)}`,
    );
  }
}

// ---------------------------------------------------------------------------------------------------
// Residue probe (control run, failing installs): no schema m7, no owner-owned object, no owner grant on
// an accepted relation, no default ACL.
// ---------------------------------------------------------------------------------------------------

export interface ResidueProbe {
  readonly database: string;
  readonly m7Schema: number;
  readonly ownerOwnedObjects: number;
  readonly ownerGrantsOnPublic: number;
  readonly defaultAcls: number;
}

export async function probeResidue(db: pg.Client, owner: string): Promise<ResidueProbe> {
  const { rows } = await db.query<ResidueProbe>(
    `SELECT current_database()::text AS database,
            (SELECT count(*)::int FROM pg_catalog.pg_namespace WHERE nspname = 'm7') AS "m7Schema",
            ((SELECT count(*) FROM pg_catalog.pg_namespace n JOIN pg_catalog.pg_roles r ON r.oid = n.nspowner WHERE r.rolname = $1)
           + (SELECT count(*) FROM pg_catalog.pg_class c JOIN pg_catalog.pg_roles r ON r.oid = c.relowner WHERE r.rolname = $1)
           + (SELECT count(*) FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_roles r ON r.oid = p.proowner WHERE r.rolname = $1)
           + (SELECT count(*) FROM pg_catalog.pg_type t JOIN pg_catalog.pg_roles r ON r.oid = t.typowner WHERE r.rolname = $1))::int
              AS "ownerOwnedObjects",
            ((SELECT count(*) FROM pg_catalog.pg_class c
                JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                CROSS JOIN LATERAL pg_catalog.aclexplode(c.relacl) x
                JOIN pg_catalog.pg_roles r ON r.oid = x.grantee
               WHERE n.nspname = 'public' AND r.rolname = $1)
           + (SELECT count(*) FROM pg_catalog.pg_attribute a
                JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
                JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                CROSS JOIN LATERAL pg_catalog.aclexplode(a.attacl) x
                JOIN pg_catalog.pg_roles r ON r.oid = x.grantee
               WHERE n.nspname = 'public' AND r.rolname = $1)
           + (SELECT count(*) FROM pg_catalog.pg_namespace n
                CROSS JOIN LATERAL pg_catalog.aclexplode(n.nspacl) x
                JOIN pg_catalog.pg_roles r ON r.oid = x.grantee
               WHERE n.nspname = 'public' AND r.rolname = $1))::int AS "ownerGrantsOnPublic",
            (SELECT count(*)::int FROM pg_catalog.pg_default_acl) AS "defaultAcls"`,
    [owner],
  );
  return rows[0]!;
}

export function isResidueFree(p: ResidueProbe): boolean {
  return (
    p.m7Schema === 0 &&
    p.ownerOwnedObjects === 0 &&
    p.ownerGrantsOnPublic === 0 &&
    p.defaultAcls === 0
  );
}

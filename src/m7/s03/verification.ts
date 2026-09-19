// M7 V1.1 — S03 verification bootstrap: the verification context and the §25 case families VBA-01 §11
// authorizes (T-01 … T-09, T-74 … T-80, T-130 … T-137b; T-81 / T-82 live in `provisioning-cases.ts`).
//
// Verification tooling only. Every role-scoped case connects with that role's OWN credentials (VBA-TX-4);
// `SET ROLE` never substitutes. Injections follow VBA-TX-3: zero-row verifier baseline in the case, inject
// as an owner-class actor (the bootstrap administrator only where PostgreSQL privileges require it), check
// the exact expected delta, reverse, and re-establish zero. Expected values come only from the accepted
// case text and pre-derived expectations; an observation never becomes an expectation (VBA-AX-2/5). No test
// semantics are changed: a failing expected result is recorded as FAIL.
import pg from 'pg';

import type { DerivedCatalog, DerivedFunction } from './expectations';
import { referencingClosure } from './expectations';
import type { CaseResult, SessionIdentity, Verdict } from './evidence';

export interface VerificationTarget {
  readonly host: string;
  readonly port: number;
  readonly database: string;
  readonly adminUser: string;
  readonly adminPassword: string;
  /** role → run-time password (login roles, migration role, disposable login roles). */
  readonly credentials: ReadonlyMap<string, string>;
}

export interface AttemptResult {
  readonly ok: boolean;
  readonly rows: Record<string, unknown>[];
  readonly sqlstate: string | null;
  readonly message: string | null;
}

type PgError = Error & { code?: string };

export interface RoleSession {
  readonly client: pg.Client;
  readonly identity: SessionIdentity;
}

async function identify(client: pg.Client, role: string): Promise<SessionIdentity> {
  const { rows } = await client.query<{ s: string; c: string; pid: number; app: string }>(
    `SELECT session_user::text AS s, current_user::text AS c, pg_catalog.pg_backend_pid() AS pid,
            pg_catalog.current_setting('application_name') AS app`,
  );
  const r = rows[0]!;
  return { role, sessionUser: r.s, currentUser: r.c, backendPid: r.pid, applicationName: r.app };
}

export async function attempt(
  client: pg.Client,
  sql: string,
  params?: readonly unknown[],
): Promise<AttemptResult> {
  try {
    const res = params ? await client.query(sql, params as unknown[]) : await client.query(sql);
    const rows = Array.isArray(res) ? (res.at(-1)?.rows ?? []) : res.rows;
    return { ok: true, rows: rows as Record<string, unknown>[], sqlstate: null, message: null };
  } catch (error) {
    const e = error as PgError;
    return { ok: false, rows: [], sqlstate: e.code ?? '?', message: e.message };
  }
}

/** Thrown by the first FAIL: the run stops, tears down, and reports the defect. */
export class S03DefectStop extends Error {
  constructor(readonly result: CaseResult) {
    super(`M7-S03 STOP ON FAIL: ${result.id} — ${result.observed}`);
    this.name = 'S03DefectStop';
  }
}

export const ACTOR_ROLE = {
  participant: 'pagamenos_m7_participant_rt',
  issuer: 'pagamenos_m7_session_issuer_rt',
  privacy: 'pagamenos_m7_privacy_request_rt',
  worker: 'pagamenos_m7_storage_worker_rt',
  authority: 'pagamenos_m7_deletion_authority_rt',
  signer: 'pagamenos_m7_capability_signer_rt',
} as const;

/** The verification context of one committed disposable database (VBA-TX-2). */
export class VerificationContext {
  readonly results: CaseResult[] = [];
  private readonly sessions = new Map<string, RoleSession>();
  private dirty: string | null = null;

  constructor(
    readonly target: VerificationTarget,
    readonly catalog: DerivedCatalog,
    readonly fixtureDigest: string,
    readonly migrationRole: string,
  ) {}

  /** A connection authenticated with `role`'s own credentials (cached per role). */
  async session(role: string, label = role): Promise<RoleSession> {
    const key = `${role}#${label}`;
    const cached = this.sessions.get(key);
    if (cached) return cached;
    const password = this.target.credentials.get(role);
    if (password === undefined) throw new Error(`no run-time credential for ${role}`);
    const client = new pg.Client({
      host: this.target.host,
      port: this.target.port,
      database: this.target.database,
      user: role,
      password,
      application_name: `m7s03:${label}`.slice(0, 63),
    });
    await client.connect();
    const s = { client, identity: await identify(client, role) };
    this.sessions.set(key, s);
    return s;
  }

  /** Closes and forgets one cached session (used when a case needs a fresh session). */
  async drop(role: string, label = role): Promise<void> {
    const key = `${role}#${label}`;
    const s = this.sessions.get(key);
    this.sessions.delete(key);
    if (s) await s.client.end().catch(() => undefined);
  }

  /** The bootstrap administrator (injections that need privileges no owner-class role holds). */
  async admin(): Promise<RoleSession> {
    const key = '__admin__';
    const cached = this.sessions.get(key);
    if (cached) return cached;
    const client = new pg.Client({
      host: this.target.host,
      port: this.target.port,
      database: this.target.database,
      user: this.target.adminUser,
      password: this.target.adminPassword,
      application_name: 'm7s03:bootstrap-admin',
    });
    await client.connect();
    const s = { client, identity: await identify(client, this.target.adminUser) };
    this.sessions.set(key, s);
    return s;
  }

  /**
   * The owner-class actor: the migration role's own session, executing as `pagamenos_m7_owner` via
   * `SET ROLE` (E03 §6.1 note: object-creating injections are executed as that role). Restored after.
   */
  async asOwner<T>(fn: (c: pg.Client, identity: SessionIdentity) => Promise<T>): Promise<T> {
    const s = await this.session(this.migrationRole, 'owner-class');
    await s.client.query(`SET ROLE ${this.catalog.ownerRole}`);
    try {
      const id = await identify(s.client, this.migrationRole);
      return await fn(s.client, id);
    } finally {
      await s.client.query('RESET ROLE');
    }
  }

  /** Read-only owner-class inspection (actual side only, VBA-AX-4). */
  async inspect<R extends Record<string, unknown>>(
    sql: string,
    params?: readonly unknown[],
  ): Promise<R[]> {
    const s = await this.session(this.migrationRole, 'owner-class-inspect');
    const res = await s.client.query(sql, params as unknown[] | undefined);
    return res.rows as R[];
  }

  /** `m7.w_verify_control_plane_catalog_v1(<fixtureDigest>)` as `pagamenos_m7_storage_worker_rt`. */
  async verifyAsWorker(
    digest = this.fixtureDigest,
  ): Promise<AttemptResult & { violations: string[] }> {
    const s = await this.session(ACTOR_ROLE.worker, 'worker-verifier');
    const r = await attempt(
      s.client,
      'SELECT v FROM m7.w_verify_control_plane_catalog_v1($1) AS v',
      [digest],
    );
    return { ...r, violations: r.rows.map((x) => String(x.v)).sort() };
  }

  /**
   * Records one case. A FAIL of an authorized case is a discovered defect (or a harness bug to be
   * diagnosed): verification stops at once — no further family runs to accumulate passes (authorization
   * §8, E05 §11 item 5).
   */
  record(r: CaseResult): CaseResult {
    this.results.push(r);
    if (r.verdict === 'FAIL') throw new S03DefectStop(r);
    return r;
  }

  /** After a failed reversal nothing downstream is trustworthy: every later injection is BLOCKED. */
  markDirty(reason: string): void {
    this.dirty ??= reason;
  }
  get dirtyReason(): string | null {
    return this.dirty;
  }

  async close(): Promise<void> {
    for (const s of this.sessions.values()) await s.client.end().catch(() => undefined);
    this.sessions.clear();
  }

  fn(name: string): DerivedFunction {
    const f = this.catalog.functions.find((x) => x.name === name);
    if (!f) throw new Error(`unknown function ${name}`);
    return f;
  }
}

// ---------------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------------

/** `SELECT m7.<fn>(NULL::t1, …)`: exercises the privilege check only (arguments are never evaluated). */
export function nullCall(f: DerivedFunction): string {
  return `SELECT m7.${f.name}(${f.argTypes.map((t) => `NULL::${t}`).join(', ')})`;
}

function verdictOf(pass: boolean): Verdict {
  return pass ? 'PASS' : 'FAIL';
}

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  return JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
}

function describe(r: AttemptResult): string {
  return r.ok ? `ok (${r.rows.length} row(s))` : `SQLSTATE ${r.sqlstate}: ${r.message}`;
}

interface SubAttempt {
  readonly role: string;
  readonly target: string;
  readonly sqlstate: string | null;
  readonly pass: boolean;
}

/** Aggregates many privilege sub-attempts into one case; the note lists every failing sub-attempt. */
function aggregateCase(
  base: Omit<CaseResult, 'observed' | 'sqlstate' | 'verdict' | 'note'>,
  subs: readonly SubAttempt[],
): CaseResult {
  const failing = subs.filter((s) => !s.pass);
  const states = [...new Set(subs.map((s) => s.sqlstate ?? 'ok'))].sort();
  return {
    ...base,
    observed: `${subs.length} attempts; SQLSTATEs {${states.join(', ')}}; ${failing.length} not as expected`,
    sqlstate: states.length === 1 ? states[0]! : states.join('|'),
    verdict: verdictOf(subs.length > 0 && failing.length === 0),
    note:
      failing.length === 0
        ? `all ${subs.length} sub-attempts as expected`
        : `unexpected: ${failing
            .slice(0, 20)
            .map((s) => `${s.role}→${s.target}=${s.sqlstate ?? 'ok'}`)
            .join('; ')}${failing.length > 20 ? ' …' : ''}`,
  };
}

// ---------------------------------------------------------------------------------------------------
// §25.2 family A — T-01 … T-09
// ---------------------------------------------------------------------------------------------------

export interface AssertionHandle {
  /** An existing, live m7_outcome_assertion row (created by the positive paths). */
  readonly assertionId: string;
}

export async function runFamilyA(ctx: VerificationContext, h: AssertionHandle): Promise<void> {
  const P = ACTOR_ROLE.participant;
  const count = async (table: string) =>
    Number((await ctx.inspect<{ n: string }>(`SELECT count(*) AS n FROM m7.${table}`))[0]!.n);

  // T-01
  {
    const s = await ctx.session(P);
    const before = await count('m7_outcome_assertion');
    const r = await attempt(s.client, 'INSERT INTO m7.m7_outcome_assertion DEFAULT VALUES');
    const after = await count('m7_outcome_assertion');
    ctx.record({
      id: 'T-01',
      clause: 'V1.1 §25.2 T-01 (M7-I01)',
      actor: 'participant',
      session: s.identity,
      operation: 'INSERT INTO m7.m7_outcome_assertion DEFAULT VALUES',
      expected: '42501 permission denied for table; persisted state unchanged',
      observed: `${describe(r)}; rows ${before}→${after}`,
      sqlstate: r.sqlstate,
      verdict: verdictOf(
        r.sqlstate === '42501' &&
          /permission denied for table/.test(r.message ?? '') &&
          before === after,
      ),
    });
  }

  // T-03 (E05-04): before any T-02-style grant exists — the installed privilege model only.
  await runT03(ctx, h);

  // T-06 (a): without any grant.
  {
    const s = await ctx.session(P, 'participant-t06');
    await s.client.query('BEGIN');
    const cfg = await attempt(
      s.client,
      `SELECT pg_catalog.set_config('pagamenos.m7.write_path', 'M7_RECORD_OUTCOME_ASSERTION_V1', true)`,
    );
    const r = await attempt(s.client, 'INSERT INTO m7.m7_outcome_assertion DEFAULT VALUES');
    await s.client.query('ROLLBACK');
    ctx.record({
      id: 'T-06a',
      clause: 'V1.1 §25.2 T-06 (M7-I05), without T-02 grant',
      actor: 'participant',
      session: s.identity,
      operation:
        "set_config('pagamenos.m7.write_path','M7_RECORD_OUTCOME_ASSERTION_V1',true) then direct INSERT",
      expected: '42501 (no privilege); no row',
      observed: `set_config ${describe(cfg)}; INSERT ${describe(r)}`,
      sqlstate: r.sqlstate,
      verdict: verdictOf(
        cfg.ok && r.sqlstate === '42501' && /permission denied for table/.test(r.message ?? ''),
      ),
    });
  }

  // T-02 and T-06 (b): the mistaken grant, then a perfectly coherent row from the participant.
  await injection(ctx, {
    id: 'T-02/recovery-rel-acl',
    clause: 'V1.1 §25.2 T-02 (M7-I02); recovery: verifier reports REL-ACL',
    injectActor: 'owner-class',
    inject: `GRANT INSERT ON m7.m7_outcome_assertion TO ${P}`,
    reverse: `REVOKE INSERT ON m7.m7_outcome_assertion FROM ${P}`,
    expectedRows: [`REL-ACL: m7_outcome_assertion -> ${P} INSERT`],
    during: async () => {
      // A perfectly coherent row: a live assertion's own values (read as text), with a fresh id, a fresh
      // capture key and the next assertionSeq. Column types are read from the catalog only to cast.
      const src = (
        await ctx.inspect<{ j: Record<string, unknown> }>(
          `SELECT pg_catalog.to_jsonb(a) AS j FROM m7.m7_outcome_assertion a WHERE a."id" = $1`,
          [h.assertionId],
        )
      )[0]!.j;
      const typed = await ctx.inspect<{ attname: string; t: string }>(
        `SELECT a.attname::text AS attname, pg_catalog.format_type(a.atttypid, a.atttypmod) AS t
           FROM pg_catalog.pg_attribute a
          WHERE a.attrelid = 'm7.m7_outcome_assertion'::regclass AND a.attnum > 0 AND NOT a.attisdropped
          ORDER BY a.attnum`,
      );
      const nextSeq = Number(
        (
          await ctx.inspect<{ n: string }>(
            `SELECT COALESCE(max("assertionSeq"),0)+1 AS n FROM m7.m7_outcome_assertion WHERE "outcomeId" = $1`,
            [src.outcomeId],
          )
        )[0]!.n,
      );
      const rowFor = (id: string, key: string) =>
        typed.map((t) =>
          t.attname === 'id'
            ? id
            : t.attname === 'clientCaptureKey'
              ? key
              : t.attname === 'assertionSeq'
                ? String(nextSeq)
                : (src[t.attname] ?? null),
        );
      const castSql =
        `INSERT INTO m7.m7_outcome_assertion (${typed.map((t) => `"${t.attname}"`).join(',')}) ` +
        `VALUES (${typed.map((t, i) => `$${i + 1}::${t.t}`).join(', ')})`;
      const newId = '00000000-0000-4000-8000-00000000c002';
      const s = await ctx.session(P, 'participant-t02');
      const r = await attempt(s.client, castSql, rowFor(newId, 's03vb-t02-coherent-key'));
      const exists = (
        await ctx.inspect(`SELECT 1 FROM m7.m7_outcome_assertion WHERE "id" = $1`, [newId])
      ).length;
      ctx.record({
        id: 'T-02',
        clause: 'V1.1 §25.2 T-02 (M7-I02)',
        actor: 'participant (after owner-class GRANT INSERT)',
        session: s.identity,
        operation:
          'direct INSERT of a coherent m7_outcome_assertion row (copied from a live assertion)',
        expected: '42501 M7_GUARD (current_user ≠ owner); no row',
        observed: `${describe(r)}; row present=${exists}`,
        sqlstate: r.sqlstate,
        verdict: verdictOf(
          r.sqlstate === '42501' && /^M7_GUARD/.test(r.message ?? '') && exists === 0,
        ),
      });
      // T-06 (b): with T-02's grant.
      const s6 = await ctx.session(P, 'participant-t06b');
      await s6.client.query('BEGIN');
      const cfg = await attempt(
        s6.client,
        `SELECT pg_catalog.set_config('pagamenos.m7.write_path', 'M7_RECORD_OUTCOME_ASSERTION_V1', true)`,
      );
      const r6 = await attempt(
        s6.client,
        castSql,
        rowFor('00000000-0000-4000-8000-00000000c006', 's03vb-t06-coherent-key'),
      );
      await s6.client.query('ROLLBACK');
      ctx.record({
        id: 'T-06b',
        clause: "V1.1 §25.2 T-06 (M7-I05), with T-02's grant",
        actor: 'participant (after owner-class GRANT INSERT)',
        session: s6.identity,
        operation:
          "set_config(write_path='M7_RECORD_OUTCOME_ASSERTION_V1') then direct coherent INSERT",
        expected: '42501 M7_GUARD; no row',
        observed: `set_config ${describe(cfg)}; INSERT ${describe(r6)}`,
        sqlstate: r6.sqlstate,
        verdict: verdictOf(cfg.ok && r6.sqlstate === '42501' && /^M7_GUARD/.test(r6.message ?? '')),
      });
    },
  });

  // T-04: the row names no actor; the owner-class actor is the one that reaches the guard layer
  // (E03-08 reasoning). The participant's observation is recorded as an informative sub-result.
  {
    const present = async () =>
      (await ctx.inspect(`SELECT 1 FROM m7.m7_outcome_assertion WHERE "id" = $1`, [h.assertionId]))
        .length;
    const ro = await ctx.asOwner(async (c, id) => ({
      id,
      r: await attempt(c, `DELETE FROM m7.m7_outcome_assertion WHERE "id" = $1`, [h.assertionId]),
    }));
    const p1 = await present();
    ctx.record({
      id: 'T-04',
      clause: 'V1.1 §25.2 T-04 (M7-I03)',
      actor: 'owner-class (executing as pagamenos_m7_owner); the case text names no actor',
      session: ro.id,
      operation: 'DELETE FROM m7.m7_outcome_assertion WHERE id = <live assertion>',
      expected: 'restrict_violation (23001) M7_IMMUTABLE; row present',
      observed: `${describe(ro.r)}; row present=${p1}`,
      sqlstate: ro.r.sqlstate,
      verdict: verdictOf(
        ro.r.sqlstate === '23001' && /M7_IMMUTABLE/.test(ro.r.message ?? '') && p1 === 1,
      ),
    });
    const s = await ctx.session(P, 'participant-t04');
    const rp = await attempt(s.client, `DELETE FROM m7.m7_outcome_assertion WHERE "id" = $1`, [
      h.assertionId,
    ]);
    ctx.record({
      id: 'T-04/participant-informative',
      clause: 'V1.1 §25.2 T-04 (informative; actor not named by the case)',
      actor: 'participant',
      session: s.identity,
      operation: 'DELETE FROM m7.m7_outcome_assertion WHERE id = <live assertion>',
      expected: 'informative only — no accepted expectation for this actor',
      observed: `${describe(rp)}; row present=${await present()}`,
      sqlstate: rp.sqlstate,
      verdict: 'NOT_EXECUTED',
      note: 'recorded as an observation, not a verdict: T-04 names no actor; the primary verdict is T-04 (owner-class)',
    });
  }

  await runT05(ctx);
  await runPrivilegeMatrices(ctx);
}

/** E05-04: the accepted, corrected T-03 contract (V1.1 §25.2 row T-03 as amended by Erratum 05). */
export const E05_04_T03 = {
  clause: 'V1.1 §25.2 T-03 as amended by Erratum 05 E05-04 (M7-I23; M7-I01)',
  operation: `UPDATE m7.m7_outcome_assertion SET "statusLabel" = 'FAILED' WHERE "id" = $1`,
  participant: { sqlstate: '42501', message: 'permission denied for table m7_outcome_assertion' },
  ownerClass: {
    sqlstate: '23001',
    message: 'M7_IMMUTABLE: UPDATE is forbidden on m7.m7_outcome_assertion',
    guard: 'm7.t_assertion_redaction_guard',
  },
} as const;

/**
 * T-03 per E05-04. Setup: one assertion exists; the installed privilege model only (no T-02-style grant —
 * proved by `has_table_privilege`). (a) participant, own credentials → 42501; (b) owner-class executing as
 * pagamenos_m7_owner with `pagamenos.m7.write_path` unset → 23001 M7_IMMUTABLE from the redaction guard.
 * For both: the full assertion row is identical, and the assertion row set is unchanged.
 */
async function runT03(ctx: VerificationContext, h: AssertionHandle): Promise<void> {
  const P = ACTOR_ROLE.participant;
  const C = E05_04_T03;
  const rowDigest = async () =>
    (
      await ctx.inspect<{ d: string }>(
        `SELECT pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.to_jsonb(a)::text, 'UTF8')), 'hex') AS d
           FROM m7.m7_outcome_assertion a WHERE a."id" = $1`,
        [h.assertionId],
      )
    )[0]?.d ?? null;
  const setDigest = async () =>
    (
      await ctx.inspect<{ n: string; d: string }>(
        `SELECT count(*)::text AS n,
                pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
                  COALESCE(pg_catalog.string_agg(a."id"::text, ',' ORDER BY a."id"), ''), 'UTF8')), 'hex') AS d
           FROM m7.m7_outcome_assertion a`,
      )
    )[0]!;
  const privileges = (
    await ctx.inspect<{ p: boolean; o: boolean }>(
      `SELECT pg_catalog.has_table_privilege($1, 'm7.m7_outcome_assertion', 'UPDATE') AS p,
              pg_catalog.has_table_privilege($2, 'm7.m7_outcome_assertion', 'UPDATE') AS o`,
      [P, ctx.catalog.ownerRole],
    )
  )[0]!;
  const noGrant = privileges.p === false && privileges.o === true;
  const row0 = await rowDigest();
  const set0 = await setDigest();

  // (a) participant, own connection.
  const s = await ctx.session(P, 'participant-t03');
  const ra = await attempt(s.client, C.operation, [h.assertionId]);
  const rowA = await rowDigest();
  const setA = await setDigest();
  const stateA = row0 !== null && rowA === row0 && setA.n === set0.n && setA.d === set0.d;
  ctx.record({
    id: 'T-03/a-participant',
    clause: C.clause,
    actor: `participant (${P}, own credentials)`,
    session: s.identity,
    operation: `${C.operation.replace('$1', '<live assertion>')}; installed privilege model only`,
    expected: `${C.participant.sqlstate} ${C.participant.message} (privilege check precedes the trigger); assertion row identical; no row added or removed`,
    observed: `${describe(ra)}; participant UPDATE privilege=${privileges.p}; row digest ${row0} → ${rowA}; rows ${set0.n} → ${setA.n}`,
    sqlstate: ra.sqlstate,
    verdict: verdictOf(
      noGrant &&
        ra.sqlstate === C.participant.sqlstate &&
        ra.message === C.participant.message &&
        stateA,
    ),
  });

  // (b) owner-class as pagamenos_m7_owner, fresh session, write path unset.
  await ctx.drop(ctx.migrationRole, 'owner-class');
  const rb = await ctx.asOwner(async (c, id) => {
    const wp = (
      await c.query<{ wp: string | null }>(
        `SELECT pg_catalog.current_setting('pagamenos.m7.write_path', true) AS wp`,
      )
    ).rows[0]!.wp;
    return { id, wp, r: await attempt(c, C.operation, [h.assertionId]) };
  });
  const rowB = await rowDigest();
  const setB = await setDigest();
  const stateB = rowB === row0 && setB.n === set0.n && setB.d === set0.d;
  const unset = rb.wp === null || rb.wp === '';
  ctx.record({
    id: 'T-03/b-owner-class',
    clause: C.clause,
    actor:
      'owner-class (migration role, own credentials, executing as pagamenos_m7_owner via SET ROLE)',
    session: rb.id,
    operation: `${C.operation.replace('$1', '<live assertion>')}; pagamenos.m7.write_path unset`,
    expected: `restrict_violation ${C.ownerClass.sqlstate} ${C.ownerClass.message} from ${C.ownerClass.guard}; assertion row identical; no row added or removed`,
    observed: `${describe(rb.r)}; current_user=${rb.id.currentUser}; write_path=${JSON.stringify(rb.wp)}; row digest ${row0} → ${rowB}; rows ${set0.n} → ${setB.n}`,
    sqlstate: rb.r.sqlstate,
    verdict: verdictOf(
      unset &&
        rb.id.currentUser === ctx.catalog.ownerRole &&
        rb.r.sqlstate === C.ownerClass.sqlstate &&
        rb.r.message === C.ownerClass.message &&
        stateB,
    ),
  });
}

/** E03-08 T-05: owner-class as pagamenos_m7_owner; (a) single-table and (b) closure TRUNCATE, never CASCADE. */
async function runT05(ctx: VerificationContext): Promise<void> {
  const ref = referencingClosure(ctx.catalog);
  const counts = async () => {
    const out: Record<string, number> = {};
    for (const t of ctx.catalog.loopTables) {
      out[t] = Number(
        (await ctx.inspect<{ n: string }>(`SELECT count(*) AS n FROM m7.${t}`))[0]!.n,
      );
    }
    return out;
  };
  const before = await counts();
  const s = await ctx.session(ctx.migrationRole, 'owner-class-t05');
  const subs: SubAttempt[] = [];
  let identity: SessionIdentity | null = null;
  for (const t of ctx.catalog.loopTables) {
    const closure = ref.get(t) ?? [];
    for (const form of ['a', 'b'] as const) {
      const stmt =
        form === 'a'
          ? `TRUNCATE m7.${t}`
          : `TRUNCATE ${[t, ...closure].map((x) => `m7.${x}`).join(', ')}`;
      await s.client.query('BEGIN');
      await s.client.query(`SET LOCAL ROLE ${ctx.catalog.ownerRole}`);
      identity ??= { ...(await identify(s.client, ctx.migrationRole)) };
      const r = await attempt(s.client, stmt);
      await s.client.query('ROLLBACK');
      const namesT = new RegExp(`M7_IMMUTABLE: TRUNCATE is forbidden on m7\\.${t}$`).test(
        r.message ?? '',
      );
      const pass =
        form === 'a' && closure.length > 0
          ? r.sqlstate === '0A000'
          : r.sqlstate === '23001' && namesT;
      subs.push({
        role: `(${form}) |Ref|=${closure.length}`,
        target: t,
        sqlstate: r.sqlstate,
        pass,
      });
    }
  }
  const after = await counts();
  const unchanged = JSON.stringify(before) === JSON.stringify(after);
  const res = aggregateCase(
    {
      id: 'T-05',
      clause: 'V1.1 §25.2 T-05 as amended by Erratum 03 E03-08 (M7-I04)',
      actor:
        'owner-class, executing as pagamenos_m7_owner (SET LOCAL ROLE), one transaction per statement',
      session: identity,
      operation: `for each of the ${ctx.catalog.loopTables.length} §19.10.1 tables: (a) TRUNCATE m7.T; (b) TRUNCATE m7.T, Ref(T)… (T first, no CASCADE)`,
      expected:
        '(a) 0A000 when Ref(T) ≠ ∅, restrict_violation naming T when Ref(T) = ∅; (b) restrict_violation naming T for all; all rows present',
    },
    [
      ...subs,
      { role: 'persisted', target: 'row counts of all tables', sqlstate: null, pass: unchanged },
    ],
  );
  ctx.record(res);
}

async function runPrivilegeMatrices(ctx: VerificationContext): Promise<void> {
  const byPrefix = (p: string) => ctx.catalog.functions.filter((f) => f.prefix === p);
  const expect42501 = async (role: string, label: string, fns: readonly DerivedFunction[]) => {
    const s = await ctx.session(role, label);
    const out: SubAttempt[] = [];
    for (const f of fns) {
      const r = await attempt(s.client, nullCall(f));
      out.push({
        role,
        target: f.name,
        sqlstate: r.sqlstate,
        pass:
          r.sqlstate === '42501' && /permission denied for (function|schema)/.test(r.message ?? ''),
      });
    }
    return { subs: out, identity: s.identity };
  };

  // T-07: every login role × all 32 i_*.
  {
    const subs: SubAttempt[] = [];
    for (const role of ctx.catalog.loginRoles)
      subs.push(...(await expect42501(role, `${role}-t07`, byPrefix('i'))).subs);
    ctx.record(
      aggregateCase(
        {
          id: 'T-07',
          clause: 'V1.1 §25.2 T-07 (M7-I06)',
          actor: 'each of the six login roles (own connections)',
          session: null,
          operation: `each login role calls every m7.i_* (${byPrefix('i').length}) with NULL arguments`,
          expected: '42501 permission denied for function, for all 32 i_* and every login role',
        },
        subs,
      ),
    );
  }
  // T-08: per-capability separation.
  {
    const A = ACTOR_ROLE;
    const matrix: [string, string[]][] = [
      [A.participant, ['w', 'a', 'c']],
      [A.worker, ['p', 'a', 'c']],
      [A.authority, ['w', 'c']],
      [A.issuer, ['p']],
      [A.privacy, ['p']],
    ];
    const subs: SubAttempt[] = [];
    for (const [role, prefixes] of matrix) {
      subs.push(...(await expect42501(role, `${role}-t08`, prefixes.flatMap(byPrefix))).subs);
    }
    ctx.record(
      aggregateCase(
        {
          id: 'T-08',
          clause: 'V1.1 §25.2 T-08 (M7-I07)',
          actor: 'participant, worker, authority, issuer, privacy (own connections)',
          session: null,
          operation:
            'participant→w_*/a_*/c_*; worker→p_*/a_*/c_*; authority→w_*/c_*; issuer→p_*; privacy→p_*',
          expected: '42501 for every combination',
        },
        subs,
      ),
    );
  }
  // T-08b (Erratum 01 ER-02): six login roles × nine c_*.
  {
    const subs: SubAttempt[] = [];
    for (const role of ctx.catalog.loginRoles)
      subs.push(...(await expect42501(role, `${role}-t08b`, byPrefix('c'))).subs);
    ctx.record(
      aggregateCase(
        {
          id: 'T-08b',
          clause: 'V1.1 §25.2 T-08b as corrected by Erratum 01 ER-02 (M7-I87, RS-8)',
          actor: 'each of the six login roles (own connections)',
          session: null,
          operation: 'each login role calls every m7.c_* (9)',
          expected: '42501 for all 9 × 6',
        },
        subs,
      ),
    );
  }
}

/** T-09: the (disposable) legacy runtime role has no M7 reach. */
export async function runT09(ctx: VerificationContext, legacyRole: string): Promise<void> {
  const s = await ctx.session(legacyRole, 'legacy-t09');
  const subs: SubAttempt[] = [];
  for (const t of ctx.catalog.loopTables) {
    const r = await attempt(s.client, `SELECT * FROM m7.${t} LIMIT 1`);
    subs.push({
      role: 'legacy',
      target: `SELECT m7.${t}`,
      sqlstate: r.sqlstate,
      pass: r.sqlstate === '42501' || r.sqlstate === '3F000',
    });
  }
  for (const f of ctx.catalog.functions) {
    const r = await attempt(s.client, nullCall(f));
    subs.push({
      role: 'legacy',
      target: `EXECUTE ${f.name}`,
      sqlstate: r.sqlstate,
      pass: r.sqlstate === '42501' || r.sqlstate === '3F000',
    });
  }
  ctx.record(
    aggregateCase(
      {
        id: 'T-09',
        clause: 'V1.1 §25.2 T-09 (M7-I08); legacy role per VBA-01 §9.3',
        actor: `legacy (${legacyRole}, disposable, not in the expectation set)`,
        session: s.identity,
        operation: `SELECT from each of the ${ctx.catalog.loopTables.length} M7 tables; EXECUTE each of the ${ctx.catalog.functions.length} M7 functions`,
        expected: '42501 (or 3F000 for schema) in every case',
      },
      subs,
    ),
  );
}

// ---------------------------------------------------------------------------------------------------
// §25.9 family H — T-77 … T-80 (T-74 … T-76 need the participant fixture: positive-paths.ts)
// ---------------------------------------------------------------------------------------------------

export async function runT77(ctx: VerificationContext, probeRole: string): Promise<void> {
  const s = await ctx.session(probeRole, 'probe-t77');
  const subs: SubAttempt[] = [];
  for (const f of ctx.catalog.functions) {
    const r = await attempt(s.client, nullCall(f));
    subs.push({
      role: probeRole,
      target: f.name,
      sqlstate: r.sqlstate,
      pass: r.sqlstate === '42501',
    });
  }
  ctx.record(
    aggregateCase(
      {
        id: 'T-77',
        clause: 'V1.1 §25.9 T-77 (M7-I74)',
        actor: `a brand-new role with no grants (${probeRole})`,
        session: s.identity,
        operation: `calls every m7.* function (${ctx.catalog.functions.length})`,
        expected: '42501 for all 110',
      },
      subs,
    ),
  );
}

export async function runT79(ctx: VerificationContext): Promise<void> {
  // (1) connect as the owner: refused.
  const c = new pg.Client({
    host: ctx.target.host,
    port: ctx.target.port,
    database: ctx.target.database,
    user: ctx.catalog.ownerRole,
    password: 'not-a-credential-of-the-owner',
    application_name: 'm7s03:t79-owner-login',
  });
  let refused: AttemptResult;
  try {
    await c.connect();
    refused = { ok: true, rows: [], sqlstate: null, message: null };
    await c.end();
  } catch (error) {
    const e = error as PgError;
    refused = { ok: false, rows: [], sqlstate: e.code ?? '?', message: e.message };
  }
  ctx.record({
    id: 'T-79/connect-as-owner',
    clause: 'V1.1 §25.9 T-79 (M7-I76)',
    actor: `connection attempt as ${ctx.catalog.ownerRole}`,
    session: null,
    operation: `connect as ${ctx.catalog.ownerRole}`,
    expected: 'connection refused',
    observed: refused.ok
      ? 'connection ESTABLISHED'
      : `refused: SQLSTATE ${refused.sqlstate}: ${refused.message}`,
    sqlstate: refused.sqlstate,
    verdict: verdictOf(!refused.ok),
    note: 'the owner is NOLOGIN and has no password; either authentication (28P01) or the LOGIN check (28000) refuses',
  });
  // (2) SET ROLE owner from each login role.
  const subs: SubAttempt[] = [];
  for (const role of ctx.catalog.loginRoles) {
    const s = await ctx.session(role, `${role}-t79`);
    const r = await attempt(s.client, `SET ROLE ${ctx.catalog.ownerRole}`);
    subs.push({
      role,
      target: 'SET ROLE owner',
      sqlstate: r.sqlstate,
      pass: r.sqlstate === '42501',
    });
  }
  ctx.record(
    aggregateCase(
      {
        id: 'T-79/set-role',
        clause: 'V1.1 §25.9 T-79 (M7-I76)',
        actor: 'each of the six login roles (own connections)',
        session: null,
        operation: `SET ROLE ${ctx.catalog.ownerRole}`,
        expected: '42501 on SET ROLE',
      },
      subs,
    ),
  );
}

export async function runT80(ctx: VerificationContext): Promise<void> {
  const definer = ctx.fn('w_list_deletion_sla_v1');
  const ops = [
    'ALTER TABLE m7.m7_outcome_assertion DISABLE TRIGGER m7_outcome_assertion_a_guard_insert',
    'DROP TRIGGER m7_outcome_assertion_a_guard_insert ON m7.m7_outcome_assertion',
    `ALTER FUNCTION ${definer.signature} SECURITY INVOKER`,
    'ALTER TABLE m7.m7_outcome_assertion DROP CONSTRAINT m7_outcome_assertion_seq_ck',
  ];
  const subs: SubAttempt[] = [];
  for (const role of ctx.catalog.loginRoles) {
    const s = await ctx.session(role, `${role}-t80`);
    for (const op of ops) {
      const r = await attempt(s.client, op);
      subs.push({
        role,
        target: op.split(' ').slice(0, 3).join(' '),
        sqlstate: r.sqlstate,
        pass: r.sqlstate === '42501',
      });
    }
  }
  const v = await ctx.verifyAsWorker();
  subs.push({
    role: 'worker',
    target: 'verifier after T-80',
    sqlstate: v.sqlstate,
    pass: v.ok && v.violations.length === 0,
  });
  ctx.record(
    aggregateCase(
      {
        id: 'T-80',
        clause: 'V1.1 §25.9 T-80 (M7-I77)',
        actor: 'each of the six login roles (own connections)',
        session: null,
        operation:
          'ALTER TABLE … DISABLE TRIGGER; DROP TRIGGER; ALTER FUNCTION … SECURITY INVOKER; ALTER TABLE … DROP CONSTRAINT',
        expected: '42501 for every attempt; catalog unchanged (verifier zero rows)',
      },
      subs,
    ),
  );
}

// ---------------------------------------------------------------------------------------------------
// VBA-TX-3 injections: T-78 and §25.17 family P
// ---------------------------------------------------------------------------------------------------

export interface InjectionSpec {
  readonly id: string;
  readonly clause: string;
  /** 'owner-class' (migration role as pagamenos_m7_owner) or 'bootstrap-admin' (VBA-TX-3 exception). */
  readonly injectActor: 'owner-class' | 'bootstrap-admin';
  readonly inject: string | ((c: pg.Client) => Promise<void>);
  readonly reverse: string | ((c: pg.Client) => Promise<void>) | null;
  /** The exact expected verifier row set after the injection (pre-derived from the case text). */
  readonly expectedRows: readonly string[];
  /** Who calls the verifier after the injection (default: worker). */
  readonly verifierActor?: 'worker' | 'owner-class';
  /** Extra observations while the injection is in place. */
  readonly during?: () => Promise<void>;
  readonly note?: string;
}

async function runAs(
  ctx: VerificationContext,
  actor: InjectionSpec['injectActor'],
  action: InjectionSpec['inject'],
) {
  if (actor === 'bootstrap-admin') {
    const a = await ctx.admin();
    if (typeof action === 'string') await a.client.query(action);
    else await action(a.client);
    return a.identity;
  }
  return ctx.asOwner(async (c, id) => {
    if (typeof action === 'string') await c.query(action);
    else await action(c);
    return id;
  });
}

async function verifyAsOwnerClass(
  ctx: VerificationContext,
): Promise<AttemptResult & { violations: string[] }> {
  return ctx.asOwner(async (c) => {
    const r = await attempt(c, 'SELECT v FROM m7.w_verify_control_plane_catalog_v1($1) AS v', [
      ctx.fixtureDigest,
    ]);
    return { ...r, violations: r.rows.map((x) => String(x.v)).sort() };
  });
}

export async function injection(ctx: VerificationContext, spec: InjectionSpec): Promise<void> {
  const base = {
    id: `${spec.id}`,
    clause: spec.clause,
    actor: `inject: ${spec.injectActor}; verifier: ${spec.verifierActor ?? 'worker'}`,
    operation: typeof spec.inject === 'string' ? spec.inject : `${spec.id} injection (see note)`,
    expected: `zero rows before; exactly {${spec.expectedRows.join(' | ')}} after; zero rows after reversal`,
  };
  if (ctx.dirtyReason) {
    ctx.record({
      ...base,
      session: null,
      observed: '—',
      sqlstate: null,
      verdict: 'BLOCKED',
      note: `environment dirty: ${ctx.dirtyReason}`,
    });
    return;
  }
  const baseline = await ctx.verifyAsWorker();
  if (!baseline.ok || baseline.violations.length > 0) {
    ctx.record({
      ...base,
      session: null,
      observed: `baseline not zero: ${baseline.ok ? baseline.violations.join(' | ') : describe(baseline)}`,
      sqlstate: baseline.sqlstate,
      verdict: 'BLOCKED',
    });
    ctx.markDirty(`${spec.id}: baseline not zero`);
    return;
  }
  let injected: SessionIdentity;
  try {
    injected = await runAs(ctx, spec.injectActor, spec.inject);
  } catch (error) {
    ctx.record({
      ...base,
      session: null,
      observed: `injection failed: ${(error as Error).message}`,
      sqlstate: (error as PgError).code ?? null,
      verdict: 'FAIL',
    });
    return;
  }
  const after =
    spec.verifierActor === 'owner-class'
      ? await verifyAsOwnerClass(ctx)
      : await ctx.verifyAsWorker();
  if (spec.during) await spec.during();
  let reversedZero: boolean | null = null;
  let reverseNote = 'not reversible here; the case is terminal for its disposable database';
  if (spec.reverse !== null) {
    try {
      await runAs(ctx, spec.injectActor, spec.reverse);
      const re = await ctx.verifyAsWorker();
      reversedZero = re.ok && re.violations.length === 0;
      reverseNote = reversedZero
        ? 'reversed; verifier zero rows again'
        : `reversal left: ${re.violations.join(' | ') || describe(re)}`;
    } catch (error) {
      reversedZero = false;
      reverseNote = `reversal failed: ${(error as Error).message}`;
    }
    if (!reversedZero) ctx.markDirty(`${spec.id}: ${reverseNote}`);
  }
  const exact = after.ok && sameSet(after.violations, spec.expectedRows);
  ctx.record({
    ...base,
    session: injected,
    observed: `baseline 0 rows; after: ${after.ok ? `{${after.violations.join(' | ')}}` : describe(after)}; ${reverseNote}`,
    sqlstate: after.sqlstate,
    verdict: verdictOf(exact && reversedZero !== false),
    ...(spec.note ? { note: spec.note } : {}),
  });
}

/** Re-creates a dropped object from its exact accepted DDL statement (reversal of a DROP injection). */
export function acceptedStatement(
  ctx: VerificationContext,
  kind: 'TRIGGER' | 'INDEX' | 'CONSTRAINT',
  name: string,
): string {
  const o = ctx.catalog.objects.find((x) => x.kind === kind && x.name === name);
  if (!o?.statement) throw new Error(`no accepted statement for ${kind} ${name}`);
  return o.statement;
}

/** `ALTER TABLE … ADD CONSTRAINT <name> …` rebuilt from the accepted CREATE TABLE clause text. */
export function addConstraintFromTable(
  ctx: VerificationContext,
  table: string,
  constraint: string,
): string {
  const f = ctx.catalog.objects.find(
    (o) => o.kind === 'CONSTRAINT' && o.name === constraint && o.relation === table,
  );
  if (!f) throw new Error(`unknown constraint ${constraint}`);
  const fragment = ctx.catalog.tableDdl.get(table);
  if (!fragment) throw new Error(`no accepted DDL for ${table}`);
  const start = fragment.indexOf(`CONSTRAINT ${constraint}`);
  if (start === -1) throw new Error(`constraint ${constraint} not in the accepted DDL of ${table}`);
  // the clause ends at the next top-level comma or the closing parenthesis of the table body
  let depth = 0;
  let end = start;
  for (; end < fragment.length; end += 1) {
    const ch = fragment[end]!;
    if (ch === '(') depth += 1;
    else if (ch === ')') {
      if (depth === 0) break;
      depth -= 1;
    } else if (ch === ',' && depth === 0) break;
  }
  return `ALTER TABLE m7.${table} ADD ${fragment.slice(start, end).trim()}`;
}

export function createOrReplace(f: DerivedFunction, body?: string): string {
  const stmt = f.statement.replace(/^CREATE FUNCTION /, 'CREATE OR REPLACE FUNCTION ');
  if (body === undefined) return stmt;
  const at = stmt.indexOf('\nAS $fn$') + '\nAS $fn$'.length;
  const end = stmt.lastIndexOf('$fn$;');
  return `${stmt.slice(0, at)}${body}${stmt.slice(end)}`;
}

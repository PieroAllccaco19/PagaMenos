// M7 V1.1 — S03 verification bootstrap: rollback-only installation cases (VBA-01 VBA-TX-1): the VBA-OR-6
// no-bootstrap control run, T-81 (§25.9 M7-I78) and T-82 (§25.9 as amended by Erratum 03 E03-09).
//
// Verification tooling only. Each case runs in a fresh database of the control environment, executes the
// accepted F01 … F26 verbatim as the migration role, and must fail closed with full rollback and zero M7
// residue. Role-level faults are injected by the disposable cluster's bootstrap administrator (VBA-TX-3),
// reversed, and the accepted provisioning re-verified; the one fault that cannot be reversed without
// re-provisioning (a missing role) runs last and ends the environment.
import type pg from 'pg';

import { verifyMigrationRole, verifyRoles } from '../testkit/roles';
import { DISPOSABLE_VERIFICATION_ROLES } from './fixture';
import type { CaseResult, SessionIdentity } from './evidence';
import { type S03Environment, freshMigratedDatabase, withLogin } from './environment';
import {
  type ControlRunResult,
  type ResidueProbe,
  isResidueFree,
  probeResidue,
  runControlInstall,
} from './orchestration';
import type { FragmentSource } from './sources';

export const CONTROL_EXPECTED = {
  step: 'F26',
  sqlstate: 'P0001',
  message: 'M7_INSTALL: no active control-plane installation',
} as const;

async function install(
  env: S03Environment,
  db: string,
  fragments: readonly FragmentSource[],
): Promise<{ run: ControlRunResult; residue: ResidueProbe; identity: SessionIdentity }> {
  const pw = env.credentials.get(env.migrationRole)!;
  return withLogin(env.cluster, env.migrationRole, pw, db, async (c: pg.Client) => {
    const id = (
      await c.query<{ s: string; c: string; pid: number }>(
        `SELECT session_user::text AS s, current_user::text AS c, pg_catalog.pg_backend_pid() AS pid`,
      )
    ).rows[0]!;
    const run = await runControlInstall(c, fragments);
    const residue = await probeResidue(c, env.expectations.owner.name);
    return {
      run,
      residue,
      identity: {
        role: env.migrationRole,
        sessionUser: id.s,
        currentUser: id.c,
        backendPid: id.pid,
        applicationName: `m7s03:${env.migrationRole}`,
      },
    };
  });
}

async function dropDatabase(env: S03Environment, db: string): Promise<void> {
  await env.cluster.withAdmin('postgres', (c) => c.query(`DROP DATABASE ${db} WITH (FORCE)`));
}

/** VBA-OR-6: F01 … F26 verbatim, no bootstrap: must end P0001 with zero residue in every database. */
export async function runControlRun(
  env: S03Environment,
  fragments: readonly FragmentSource[],
  root: string,
): Promise<{
  result: CaseResult;
  run: ControlRunResult;
  residue: ResidueProbe[];
  migrations: string[];
}> {
  const db = 's03_control';
  const migrations = await freshMigratedDatabase(env, db, root);
  const { run, residue, identity } = await install(env, db, fragments);
  const all: ResidueProbe[] = [residue];
  all.push(
    await env.cluster.withAdmin('postgres', (c) => probeResidue(c, env.expectations.owner.name)),
  );
  const f = run.failure;
  const pass =
    f !== null &&
    f.step === CONTROL_EXPECTED.step &&
    f.sqlstate === CONTROL_EXPECTED.sqlstate &&
    f.message === CONTROL_EXPECTED.message &&
    run.rolledBack &&
    all.every(isResidueFree);
  const result: CaseResult = {
    id: 'VBA-OR-6',
    clause: 'VBA-01 VBA-OR-6 (no-bootstrap control run); V1.1 §19.13.4 fail-closed completion',
    actor: `migration role ${env.migrationRole} (non-superuser)`,
    session: identity,
    operation: 'F01 … F26 verbatim in one session, no M7-S03-VBCP bootstrap',
    expected: `${CONTROL_EXPECTED.sqlstate} ${CONTROL_EXPECTED.message} at F26; full rollback; zero M7 residue`,
    observed: f
      ? `${f.step}: SQLSTATE ${f.sqlstate}: ${f.message}; rolled back=${run.rolledBack}; residue ${JSON.stringify(all)}`
      : 'INSTALLATION SUCCEEDED',
    sqlstate: f?.sqlstate ?? null,
    verdict: pass ? 'PASS' : 'FAIL',
  };
  await dropDatabase(env, db);
  return { result, run, residue: all, migrations };
}

interface T81Variant {
  readonly id: string;
  readonly ia: string;
  readonly fault: string;
  readonly inject: string[];
  readonly reverse: string[] | null;
  /** Statements run by the bootstrap administrator inside the fresh database itself. */
  readonly inDatabase?: string[];
}

/** T-81 (all executable variants) and T-82; returns the case results in execution order. */
export async function runProvisioningFailureCases(
  env: S03Environment,
  fragments: readonly FragmentSource[],
  root: string,
): Promise<CaseResult[]> {
  const out: CaseResult[] = [];
  const owner = env.expectations.owner.name;
  const signer = 'pagamenos_m7_capability_signer_rt';
  const participant = 'pagamenos_m7_participant_rt';
  const group = DISPOSABLE_VERIFICATION_ROLES.group.name;
  const extra = DISPOSABLE_VERIFICATION_ROLES.extraMember.name;
  const variants: T81Variant[] = [
    {
      id: 'T-81/pre-existing-schema-m7',
      ia: 'IA-07',
      fault: 'pre-existing schema m7',
      inject: [],
      reverse: [],
      inDatabase: ['CREATE SCHEMA m7'],
    },
    {
      id: 'T-81/owner-with-login',
      ia: 'IA-02',
      fault: 'owner with LOGIN',
      inject: [`ALTER ROLE ${owner} LOGIN`],
      reverse: [`ALTER ROLE ${owner} NOLOGIN`],
    },
    {
      id: 'T-81/login-role-rolinherit',
      ia: 'IA-03',
      fault: 'a login role with rolinherit',
      inject: [`ALTER ROLE ${participant} INHERIT`],
      reverse: [`ALTER ROLE ${participant} NOINHERIT`],
    },
    {
      id: 'T-81/login-role-in-group',
      ia: 'IA-04',
      fault: 'a login role in a group',
      inject: [`CREATE ROLE ${group} NOLOGIN`, `GRANT ${group} TO ${participant}`],
      reverse: [`REVOKE ${group} FROM ${participant}`, `DROP ROLE ${group}`],
    },
    {
      id: 'T-81/owner-members',
      ia: 'IA-05',
      fault: 'owner members ≠ the migration role',
      inject: [`CREATE ROLE ${extra} NOLOGIN`, `GRANT ${owner} TO ${extra}`],
      reverse: [`REVOKE ${owner} FROM ${extra}`, `DROP ROLE ${extra}`],
    },
    // Terminal: re-creating a dropped M7 role would be a provisioning action of S03's own; the environment
    // is destroyed after this case instead.
    {
      id: 'T-81/missing-role',
      ia: 'IA-01',
      fault: `a missing role (${signer} dropped)`,
      inject: [`DROP ROLE ${signer}`],
      reverse: null,
    },
  ];

  let n = 0;
  const runVariant = async (v: T81Variant) => {
    n += 1;
    const db = `s03_t81_${n}`;
    await freshMigratedDatabase(env, db, root);
    for (const q of v.inDatabase ?? []) await env.cluster.withAdmin(db, (c) => c.query(q));
    for (const q of v.inject) await env.cluster.withAdmin('postgres', (c) => c.query(q));
    const { run, residue, identity } = await install(env, db, fragments);
    let reversal = 'terminal (environment destroyed next)';
    if (v.reverse) {
      for (const q of v.reverse) await env.cluster.withAdmin('postgres', (c) => c.query(q));
      const mm = await env.cluster.withAdmin('postgres', async (c) => [
        ...(await verifyRoles(c, env.expectations.all, env.migrationRole)),
        ...(await verifyMigrationRole(c, env.migrationRole, owner)),
      ]);
      reversal =
        mm.length === 0
          ? 'reversed; accepted provisioning re-verified (0 mismatches)'
          : `REVERSAL LEFT ${JSON.stringify(mm)}`;
    }
    // Pre-existing schema m7 is the injected fault itself; residue is judged on everything else.
    const residueOk =
      v.ia === 'IA-07'
        ? residue.ownerOwnedObjects === 0 &&
          residue.ownerGrantsOnPublic === 0 &&
          residue.defaultAcls === 0
        : isResidueFree(residue);
    const f = run.failure;
    const pass =
      f !== null &&
      f.step === 'F01' &&
      f.sqlstate === 'P0001' &&
      f.message.startsWith(`M7_INSTALL ${v.ia}:`) &&
      run.rolledBack &&
      residueOk &&
      !reversal.startsWith('REVERSAL LEFT');
    out.push({
      id: v.id,
      clause:
        'V1.1 §25.9 T-81 (M7-I78); VBA-TX-1 rollback-only; VBA-TX-3 bootstrap-admin injection',
      actor: `inject: bootstrap administrator; install: migration role ${env.migrationRole}`,
      session: identity,
      operation: `${v.fault}; run F01 … F26 verbatim`,
      expected: `RAISE with ${v.ia} (P0001 "M7_INSTALL ${v.ia}: …") and full rollback; no schema m7 (other than an injected one), no partial install`,
      observed: f
        ? `${f.step}: SQLSTATE ${f.sqlstate}: ${f.message}; rolled back=${run.rolledBack}; residue ${JSON.stringify(residue)}; ${reversal}`
        : 'INSTALLATION SUCCEEDED',
      sqlstate: f?.sqlstate ?? null,
      verdict: pass ? 'PASS' : 'FAIL',
    });
    await dropDatabase(env, db);
  };

  for (const v of variants.filter((x) => x.reverse !== null)) await runVariant(v);

  // T-82 (E03-09): an isolated NOLOGIN owner of public.study_participant; the migration role holds nothing on it.
  {
    const db = 's03_t82';
    const t82 = DISPOSABLE_VERIFICATION_ROLES.t82Owner.name;
    await freshMigratedDatabase(env, db, root);
    await env.cluster.withAdmin('postgres', (c) => c.query(`CREATE ROLE ${t82} NOLOGIN`));
    await env.cluster.withAdmin(db, (c) =>
      c.query(`ALTER TABLE public.study_participant OWNER TO ${t82}`),
    );
    const privs = await env.cluster.withAdmin(
      db,
      async (c) =>
        (
          await c.query<{ p: string; has: boolean }>(
            `SELECT p, pg_catalog.has_table_privilege($1, 'public.study_participant', p) AS has
             FROM unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) AS p`,
            [env.migrationRole],
          )
        ).rows,
    );
    const memberships = await env.cluster.withAdmin('postgres', async (c) =>
      Number(
        (
          await c.query<{ n: string }>(
            `SELECT count(*)::text AS n FROM pg_catalog.pg_auth_members m JOIN pg_catalog.pg_roles r ON r.oid IN (m.roleid, m.member)
              WHERE r.rolname = $1`,
            [t82],
          )
        ).rows[0]!.n,
      ),
    );
    const { run, residue, identity } = await install(env, db, fragments);
    const f = run.failure;
    const noPrivilege = privs.every((x) => !x.has) && memberships === 0;
    const pass =
      noPrivilege &&
      f !== null &&
      f.step === 'F01' &&
      f.sqlstate === '42501' &&
      f.message === 'permission denied for table study_participant' &&
      run.rolledBack &&
      isResidueFree(residue);
    out.push({
      id: 'T-82',
      clause: 'V1.1 §25.9 T-82 as amended by Erratum 03 E03-09 (M7-I79); VBA-TX-1',
      actor: `setup: bootstrap administrator (adversarial test setup — not conforming provisioning); install: migration role ${env.migrationRole}`,
      session: identity,
      operation: `ALTER TABLE public.study_participant OWNER TO ${t82} (isolated NOLOGIN, no memberships); run F01 … F26 verbatim`,
      expected:
        'migration role holds no privilege on public.study_participant; the first failing statement is the §19.2 GRANT SELECT ON TABLE public.study_participant, … with 42501; transaction aborts; no schema m7, no owner-owned object, no privilege to pagamenos_m7_owner on any accepted relation',
      observed: `migration-role privileges on study_participant: ${JSON.stringify(privs)}; ${t82} memberships=${memberships}; ${f ? `${f.step}: SQLSTATE ${f.sqlstate}: ${f.message}` : 'INSTALLATION SUCCEEDED'}; rolled back=${run.rolledBack}; residue ${JSON.stringify(residue)}`,
      sqlstate: f?.sqlstate ?? null,
      verdict: pass ? 'PASS' : 'FAIL',
      note: 'F01 is sent as one simple-query message: the first error aborts it; the only earlier F01 statements (BEGIN, the IA DO block, CREATE SCHEMA, the two schema-m7 ACL statements, GRANT USAGE ON SCHEMA public) do not name study_participant, so a 42501 naming study_participant identifies the GRANT SELECT statement',
    });
    await dropDatabase(env, db);
    await env.cluster.withAdmin('postgres', (c) => c.query(`DROP ROLE ${t82}`));
  }

  // Terminal variant last.
  for (const v of variants.filter((x) => x.reverse === null)) await runVariant(v);

  out.push({
    id: 'T-81/postgresql-14',
    clause: 'V1.1 §25.9 T-81 (M7-I78), PostgreSQL 14 sub-case; VBA-01 VBA-SC-3',
    actor: '—',
    session: null,
    operation: 'run the migration on PostgreSQL 14',
    expected: 'RAISE IA-08 and full rollback',
    observed: '—',
    sqlstate: null,
    verdict: 'NOT_EXECUTED',
    note: 'NOT_EXECUTED — no PostgreSQL 14 binary is available; VBA-SC-3 excludes the PostgreSQL 14 sub-case without one, and VFC-PG-1 scopes S03 to PostgreSQL ≥ 16',
  });
  return out;
}

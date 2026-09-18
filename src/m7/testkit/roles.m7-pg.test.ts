// M7 S02 — REAL PostgreSQL: the seven provisioned M7 roles, the migration role, credentials, and the
// wrong-role-attribute negative controls. Runs ONLY under `pnpm m7:pg` (scripts/m7/pg-m7-harness.ts).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { M7_V1_1 } from '../normative/source';
import { loadHarnessContext, specFor, writeEvidence } from './context';
import { generateSecret } from './provision';
import {
  deriveM7RoleExpectations,
  evaluateMigrationSession,
  observeMemberships,
  observeMigrationSession,
  observeOwnerAccess,
  observeOwnerEdges,
  observeRoles,
  retarget,
  verifyMigrationRole,
  verifyRoles,
  type RoleExpectation,
  type RoleMismatch,
} from './roles';

// Outside the harness this throws NotExecutedError: the suite fails to load, it never passes.
const ctx = loadHarnessContext();
const expectations = deriveM7RoleExpectations(readFileSync(join(process.cwd(), M7_V1_1.path)));
const NEGCTL_PREFIX = 's02_negctl_';

async function connect(role: string, database: string): Promise<pg.Client> {
  const client = new pg.Client({
    ...specFor(ctx, role, database),
    application_name: `m7s02:${role}`,
  });
  await client.connect();
  return client;
}

async function sqlstateOf(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p;
    return undefined;
  } catch (error) {
    return (error as { code?: string }).code;
  }
}

describe('S02 M7 role provisioning (real PostgreSQL)', () => {
  let admin: pg.Client;

  beforeAll(async () => {
    admin = await connect(ctx.adminUser, ctx.databases.selftest);
  });

  afterAll(async () => {
    await admin?.end();
  });

  it('R-01 the seven §18.2 roles exist with exactly the asserted attributes (zero mismatches)', async () => {
    const mismatches = await verifyRoles(admin, expectations.all, ctx.migrationRole);
    const names = [...expectations.all.map((e) => e.name), ctx.migrationRole];
    const observed = await observeRoles(admin, names);
    const memberships = await observeMemberships(admin, names);
    const versionNum = Number(
      (await admin.query<{ server_version_num: string }>('SHOW server_version_num')).rows[0]!
        .server_version_num,
    );
    // PostgreSQL 16 added per-membership INHERIT / SET options; record them where they exist.
    const { rows: memberOptions } = await admin.query(
      versionNum >= 160000
        ? `SELECT g.rolname AS role, u.rolname AS member, m.admin_option, m.inherit_option, m.set_option
             FROM pg_catalog.pg_auth_members m
             JOIN pg_catalog.pg_roles g ON g.oid = m.roleid JOIN pg_catalog.pg_roles u ON u.oid = m.member
            WHERE g.rolname = ANY ($1::text[]) OR u.rolname = ANY ($1::text[])`
        : `SELECT g.rolname AS role, u.rolname AS member, m.admin_option
             FROM pg_catalog.pg_auth_members m
             JOIN pg_catalog.pg_roles g ON g.oid = m.roleid JOIN pg_catalog.pg_roles u ON u.oid = m.member
            WHERE g.rolname = ANY ($1::text[]) OR u.rolname = ANY ($1::text[])`,
      [names],
    );
    writeEvidence(ctx, 'roles-provisioning', {
      derivedFrom: { path: M7_V1_1.path, gitBlob: M7_V1_1.gitBlob, sha256: M7_V1_1.sha256 },
      expectations: expectations.all,
      observedRoles: observed,
      observedMemberships: memberships,
      membershipOptions: memberOptions,
      mismatches,
    });
    expect(observed.map((r) => r.rolname).sort()).toEqual([...names].sort());
    expect(mismatches).toEqual([]);
    expect(expectations.login).toHaveLength(6);
  });

  it('R-02 the migration role is LOGIN, NOT SUPERUSER, and the only member of the owner', async () => {
    const mismatches = await verifyMigrationRole(admin, ctx.migrationRole, expectations.owner.name);
    const [observed] = await observeRoles(admin, [ctx.migrationRole]);
    writeEvidence(ctx, 'roles-migration-role', {
      migrationRole: ctx.migrationRole,
      observed,
      mismatches,
    });
    expect(mismatches).toEqual([]);
    expect(observed!.rolsuper).toBe(false);
    expect(observed!.rolcanlogin).toBe(true);
  });

  it('R-02a VBA-PV-1 (≥ 16): exactly one direct owner edge INHERIT/SET true, ADMIN false; MEMBER/USAGE/SET; role stays NOINHERIT', async () => {
    const { rows: version } = await admin.query<{ v: string; n: string }>(
      `SELECT current_setting('server_version') AS v, current_setting('server_version_num') AS n`,
    );
    const edges = await observeOwnerEdges(admin, expectations.owner.name);
    const access = await observeOwnerAccess(admin, ctx.migrationRole, expectations.owner.name);
    const [observed] = await observeRoles(admin, [ctx.migrationRole]);
    writeEvidence(ctx, 'roles-owner-membership-vba-pv-1', {
      server: { serverVersion: version[0]!.v, serverVersionNum: Number(version[0]!.n) },
      ownerEdges: edges,
      effectiveAccess: access,
      migrationRoleRolinherit: observed!.rolinherit,
    });
    expect(Number(version[0]!.n)).toBeGreaterThanOrEqual(160000);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({
      member: ctx.migrationRole,
      inheritOption: true,
      setOption: true,
      adminOption: false,
    });
    expect(access).toEqual({ member: true, usage: true, set: true });
    // The explicit edge options realize VBA-PV-1; the role's own attribute is unchanged (NOINHERIT).
    expect(observed!.rolinherit).toBe(false);
    expect(observed!.rolcreatedb).toBe(false);
    expect(observed!.rolcreaterole).toBe(false);
  });

  it('R-02b VBA-PV-1 from the migration role session: session_user = current_user until SET LOCAL ROLE; access holds', async () => {
    const c = await connect(ctx.migrationRole, ctx.databases.selftest);
    try {
      const before = await observeMigrationSession(c, expectations.owner.name);
      await c.query('BEGIN');
      await c.query(`SET LOCAL ROLE ${expectations.owner.name}`);
      const afterSet = await observeMigrationSession(c, expectations.owner.name);
      await c.query('ROLLBACK');
      const afterRollback = await observeMigrationSession(c, expectations.owner.name);
      writeEvidence(ctx, 'roles-migration-session-vba-pv-1', { before, afterSet, afterRollback });
      expect(evaluateMigrationSession(ctx.migrationRole, before)).toEqual([]);
      expect(before.sessionUser).toBe(ctx.migrationRole);
      expect(before.currentUser).toBe(ctx.migrationRole);
      // SET is effective, and an already-SET role is exactly what item 2 excludes before F01.
      expect(afterSet.currentUser).toBe(expectations.owner.name);
      expect(evaluateMigrationSession(ctx.migrationRole, afterSet).map((m) => m.check)).toEqual([
        'current_user',
      ]);
      expect(evaluateMigrationSession(ctx.migrationRole, afterRollback)).toEqual([]);
    } finally {
      await c.end();
    }
  });

  it('R-03 each login role and the migration role authenticate with their run-time credential', async () => {
    const identities: unknown[] = [];
    for (const role of [...expectations.login.map((r) => r.name), ctx.migrationRole]) {
      const c = await connect(role, ctx.databases.selftest);
      try {
        const { rows } = await c.query<{ session_user: string; is_superuser: string; pid: number }>(
          `SELECT session_user, current_setting('is_superuser') AS is_superuser,
                  pg_catalog.pg_backend_pid() AS pid`,
        );
        expect(rows[0]!.session_user).toBe(role);
        expect(rows[0]!.is_superuser).toBe('off');
        identities.push({
          role,
          sessionUser: rows[0]!.session_user,
          isSuperuser: rows[0]!.is_superuser,
        });
      } finally {
        await c.end();
      }
    }
    writeEvidence(ctx, 'roles-login-identities', identities);
    expect(identities).toHaveLength(7);
  });

  it('R-04 the owner cannot open a session; NOLOGIN is enforced (28000); a wrong credential is refused (28P01)', async () => {
    // The owner holds no credential at all, so SCRAM authentication refuses it (28P01) before the
    // NOLOGIN check is reached. Its rolcanlogin = false is asserted by R-01.
    const owner = new pg.Client({
      ...specFor(ctx, ctx.migrationRole, ctx.databases.selftest),
      user: expectations.owner.name,
    });
    const ownerCode = await sqlstateOf(owner.connect());
    await owner.end().catch(() => undefined);

    // NOLOGIN enforcement itself: a disposable NOLOGIN role that DOES hold a (run-time) credential
    // authenticates and is then refused with 28000.
    const probeRole = `${NEGCTL_PREFIX}nologin_probe`;
    const probeSecret = generateSecret();
    await admin.query(`CREATE ROLE ${probeRole} NOLOGIN PASSWORD '${probeSecret}'`);
    let nologinCode: string | undefined;
    try {
      const probe = new pg.Client({
        ...specFor(ctx, ctx.migrationRole, ctx.databases.selftest),
        user: probeRole,
        password: probeSecret,
      });
      nologinCode = await sqlstateOf(probe.connect());
      await probe.end().catch(() => undefined);
    } finally {
      await admin.query(`DROP ROLE ${probeRole}`);
    }

    const wrong = new pg.Client({
      ...specFor(ctx, 'pagamenos_m7_participant_rt', ctx.databases.selftest),
      password: 'not-the-run-time-credential-000000000',
    });
    const wrongCode = await sqlstateOf(wrong.connect());
    await wrong.end().catch(() => undefined);
    writeEvidence(ctx, 'roles-authentication-refusals', {
      ownerSessionAttempt: { role: expectations.owner.name, sqlstate: ownerCode },
      nologinWithCredential: { role: probeRole, sqlstate: nologinCode },
      wrongCredential: { role: 'pagamenos_m7_participant_rt', sqlstate: wrongCode },
    });
    expect(ownerCode).toBe('28P01');
    expect(nologinCode).toBe('28000');
    expect(wrongCode).toBe('28P01');
  });

  describe('wrong-role-attribute negative controls (disposable roles; accepted expectation unchanged)', () => {
    const loginShape = expectations.login[0]!;
    const ownerShape = expectations.owner;
    const results: { case: string; role: string; mismatches: RoleMismatch[] }[] = [];

    const LOGIN_OK =
      'LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT CONNECTION LIMIT 4';
    const OWNER_OK =
      'NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT';

    async function negctl(
      label: string,
      shape: RoleExpectation,
      suffix: string,
      setup: string[],
    ): Promise<RoleMismatch[]> {
      for (const sql of setup) await admin.query(sql);
      const role = `${NEGCTL_PREFIX}${suffix}`;
      const mismatches = await verifyRoles(admin, [retarget(shape, role)], ctx.migrationRole);
      results.push({ case: label, role, mismatches });
      return mismatches;
    }

    afterAll(async () => {
      const { rows } = await admin.query<{ rolname: string }>(
        `SELECT rolname FROM pg_catalog.pg_roles WHERE rolname LIKE $1 ORDER BY rolname`,
        [`${NEGCTL_PREFIX}%`],
      );
      for (const r of rows) await admin.query(`DROP ROLE "${r.rolname}"`);
      const { rows: left } = await admin.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM pg_catalog.pg_roles WHERE rolname LIKE $1`,
        [`${NEGCTL_PREFIX}%`],
      );
      const accepted = await verifyRoles(admin, expectations.all, ctx.migrationRole);
      const acceptedMigrator = await verifyMigrationRole(
        admin,
        ctx.migrationRole,
        expectations.owner.name,
      );
      writeEvidence(ctx, 'roles-negative-controls', {
        cases: results,
        cleanup: { droppedRoles: rows.map((r) => r.rolname), remaining: left[0]!.n },
        acceptedRolesReverifiedAfterControls: { mismatches: accepted },
        acceptedMigrationRoleReverifiedAfterControls: { mismatches: acceptedMigrator },
        acceptedExpectationUnchanged:
          JSON.stringify(expectations) ===
          JSON.stringify(deriveM7RoleExpectations(readFileSync(join(process.cwd(), M7_V1_1.path)))),
      });
      expect(left[0]!.n).toBe(0);
      expect(accepted).toEqual([]);
      expect(acceptedMigrator).toEqual([]);
    });

    it('N-00 control: a correctly shaped disposable login role verifies clean', async () => {
      const m = await negctl('control-login-correct', loginShape, 'login_ok', [
        `CREATE ROLE ${NEGCTL_PREFIX}login_ok ${LOGIN_OK}`,
      ]);
      expect(m).toEqual([]);
    });

    it('N-01 login role with INHERIT is detected (rolinherit)', async () => {
      const m = await negctl('login-with-INHERIT', loginShape, 'inherit', [
        `CREATE ROLE ${NEGCTL_PREFIX}inherit ${LOGIN_OK.replace('NOINHERIT', 'INHERIT')}`,
      ]);
      expect(m).toEqual([
        {
          role: `${NEGCTL_PREFIX}inherit`,
          check: 'rolinherit',
          expected: 'false',
          observed: 'true',
        },
      ]);
    });

    it('N-02 login role with SUPERUSER is detected (rolsuper)', async () => {
      const m = await negctl('login-with-SUPERUSER', loginShape, 'superuser', [
        `CREATE ROLE ${NEGCTL_PREFIX}superuser ${LOGIN_OK.replace('NOSUPERUSER', 'SUPERUSER')}`,
      ]);
      expect(m.map((x) => x.check)).toContain('rolsuper');
    });

    it('N-03 login role with CREATEDB is detected (rolcreatedb)', async () => {
      const m = await negctl('login-with-CREATEDB', loginShape, 'createdb', [
        `CREATE ROLE ${NEGCTL_PREFIX}createdb ${LOGIN_OK.replace('NOCREATEDB', 'CREATEDB')}`,
      ]);
      expect(m).toEqual([
        {
          role: `${NEGCTL_PREFIX}createdb`,
          check: 'rolcreatedb',
          expected: 'false',
          observed: 'true',
        },
      ]);
    });

    it('N-04 login role without a CONNECTION LIMIT is detected (rolconnlimit)', async () => {
      const m = await negctl('login-without-CONNECTION-LIMIT', loginShape, 'nolimit', [
        `CREATE ROLE ${NEGCTL_PREFIX}nolimit ${LOGIN_OK.replace(' CONNECTION LIMIT 4', '')}`,
      ]);
      expect(m.map((x) => x.check)).toEqual(['rolconnlimit']);
    });

    it('N-05 login role that is a member of another role is detected (memberships)', async () => {
      const m = await negctl('login-with-membership', loginShape, 'member', [
        `CREATE ROLE ${NEGCTL_PREFIX}group NOLOGIN`,
        `CREATE ROLE ${NEGCTL_PREFIX}member ${LOGIN_OK}`,
        `GRANT ${NEGCTL_PREFIX}group TO ${NEGCTL_PREFIX}member`,
      ]);
      expect(m).toEqual([
        {
          role: `${NEGCTL_PREFIX}member`,
          check: 'memberships',
          expected: 'none',
          observed: `${NEGCTL_PREFIX}group <- ${NEGCTL_PREFIX}member`,
        },
      ]);
    });

    it('N-06 login-role shape applied to a NOLOGIN role is detected (rolcanlogin)', async () => {
      const m = await negctl('login-shape-on-NOLOGIN', loginShape, 'nologin', [
        `CREATE ROLE ${NEGCTL_PREFIX}nologin ${LOGIN_OK.replace('LOGIN NOSUPERUSER', 'NOLOGIN NOSUPERUSER')}`,
      ]);
      expect(m.map((x) => x.check)).toEqual(['rolcanlogin']);
    });

    it('N-07 control: a correctly shaped disposable owner (members = migration role) verifies clean', async () => {
      const m = await negctl('control-owner-correct', ownerShape, 'owner_ok', [
        `CREATE ROLE ${NEGCTL_PREFIX}owner_ok ${OWNER_OK}`,
        `GRANT ${NEGCTL_PREFIX}owner_ok TO ${ctx.migrationRole}`,
      ]);
      expect(m).toEqual([]);
    });

    it('N-08 owner-shaped role with LOGIN is detected (rolcanlogin)', async () => {
      const m = await negctl('owner-with-LOGIN', ownerShape, 'owner_login', [
        `CREATE ROLE ${NEGCTL_PREFIX}owner_login ${OWNER_OK.replace('NOLOGIN', 'LOGIN')}`,
        `GRANT ${NEGCTL_PREFIX}owner_login TO ${ctx.migrationRole}`,
      ]);
      expect(m).toEqual([
        {
          role: `${NEGCTL_PREFIX}owner_login`,
          check: 'rolcanlogin',
          expected: 'false',
          observed: 'true',
        },
      ]);
    });

    it('N-09 owner-shaped role with a member other than the migration role is detected (members)', async () => {
      const m = await negctl('owner-with-extra-member', ownerShape, 'owner_extra', [
        `CREATE ROLE ${NEGCTL_PREFIX}owner_extra ${OWNER_OK}`,
        `CREATE ROLE ${NEGCTL_PREFIX}intruder ${LOGIN_OK}`,
        `GRANT ${NEGCTL_PREFIX}owner_extra TO ${ctx.migrationRole}`,
        `GRANT ${NEGCTL_PREFIX}owner_extra TO ${NEGCTL_PREFIX}intruder`,
      ]);
      expect(m.map((x) => x.check)).toEqual(['members']);
    });

    it('N-10 a missing role is detected (exists)', async () => {
      const m = await negctl('missing-role', loginShape, 'absent', []);
      expect(m).toEqual([
        { role: `${NEGCTL_PREFIX}absent`, check: 'exists', expected: 'true', observed: 'false' },
      ]);
    });

    it('N-11 a SUPERUSER migration role is detected by the migration-role verifier', async () => {
      await admin.query(
        `CREATE ROLE ${NEGCTL_PREFIX}migrator_su LOGIN SUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`,
      );
      await admin.query(`GRANT ${expectations.owner.name} TO ${NEGCTL_PREFIX}migrator_su`);
      const m = await verifyMigrationRole(
        admin,
        `${NEGCTL_PREFIX}migrator_su`,
        expectations.owner.name,
      );
      results.push({
        case: 'migration-role-SUPERUSER',
        role: `${NEGCTL_PREFIX}migrator_su`,
        mismatches: m,
      });
      // Remove the extra owner member immediately so the accepted IA-05 shape is restored.
      await admin.query(`REVOKE ${expectations.owner.name} FROM ${NEGCTL_PREFIX}migrator_su`);
      expect(m.map((x) => x.check)).toContain('rolsuper');
    });

    // VBA-PV-1 owner-membership controls: a disposable owner-shaped role and a disposable migration
    // role shaped exactly like the harness migration role (NOINHERIT), varying only the edge(s).
    const MIGRATOR_OK =
      'LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT';

    async function pvControl(
      label: string,
      suffix: string,
      grants: (owner: string, migrator: string) => string[],
      extra = '',
    ): Promise<{ owner: string; migrator: string; mismatches: RoleMismatch[] }> {
      const owner = `${NEGCTL_PREFIX}pv_${suffix}_owner`;
      const migrator = `${NEGCTL_PREFIX}pv_${suffix}_migrator`;
      await admin.query(`CREATE ROLE ${owner} ${OWNER_OK}`);
      await admin.query(`CREATE ROLE ${migrator} ${MIGRATOR_OK}${extra}`);
      for (const sql of grants(owner, migrator)) await admin.query(sql);
      const mismatches = await verifyMigrationRole(admin, migrator, owner);
      results.push({ case: label, role: migrator, mismatches });
      return { owner, migrator, mismatches };
    }

    it('N-12 control: the canonical grant WITH INHERIT TRUE, SET TRUE verifies clean; role stays NOINHERIT', async () => {
      const { owner, migrator, mismatches } = await pvControl('pv-canonical', 'ok', (o, m) => [
        `GRANT ${o} TO ${m} WITH INHERIT TRUE, SET TRUE`,
      ]);
      expect(mismatches).toEqual([]);
      const [edge] = await observeOwnerEdges(admin, owner);
      expect(edge).toMatchObject({ inheritOption: true, setOption: true, adminOption: false });
      expect((await observeRoles(admin, [migrator]))[0]!.rolinherit).toBe(false);
    });

    it('N-13 the pre-VBA option-less grant to a NOINHERIT role is detected (inherit_option, USAGE)', async () => {
      const { mismatches } = await pvControl('pv-plain-grant', 'plain', (o, m) => [
        `GRANT ${o} TO ${m}`,
      ]);
      expect(mismatches.map((x) => x.check)).toEqual(['inherit_option', 'pg_has_role-USAGE']);
    });

    it('N-14 SET FALSE is detected (set_option, SET)', async () => {
      const { mismatches } = await pvControl('pv-set-false', 'noset', (o, m) => [
        `GRANT ${o} TO ${m} WITH INHERIT TRUE, SET FALSE`,
      ]);
      expect(mismatches.map((x) => x.check)).toEqual(['set_option', 'pg_has_role-SET']);
    });

    it('N-15 ADMIN OPTION is detected (admin_option)', async () => {
      const { mismatches } = await pvControl('pv-admin', 'admin', (o, m) => [
        `GRANT ${o} TO ${m} WITH ADMIN TRUE, INHERIT TRUE, SET TRUE`,
      ]);
      expect(mismatches.map((x) => x.check)).toEqual(['admin_option']);
    });

    it('N-16 a duplicate owner edge (second grantor) is detected', async () => {
      const grantor = `${NEGCTL_PREFIX}pv_dup_grantor`;
      await admin.query(`CREATE ROLE ${grantor} NOLOGIN NOINHERIT`);
      const { migrator, mismatches } = await pvControl('pv-duplicate-edge', 'dup', (o, m) => [
        `GRANT ${o} TO ${m} WITH INHERIT TRUE, SET TRUE`,
        `GRANT ${o} TO ${grantor} WITH ADMIN TRUE`,
        `GRANT ${o} TO ${m} WITH INHERIT TRUE, SET TRUE GRANTED BY ${grantor}`,
      ]);
      // The grantor's edge must go before the grantor itself can be dropped.
      await admin.query(`DROP ROLE ${migrator}`);
      await admin.query(`DROP ROLE ${grantor}`);
      expect(mismatches.map((x) => x.check)).toEqual(['owner-edge-count', 'owner-members']);
    });

    it('N-17 an extra owner member is detected', async () => {
      const { mismatches } = await pvControl('pv-extra-member', 'extra', (o, m) => [
        `GRANT ${o} TO ${m} WITH INHERIT TRUE, SET TRUE`,
        `CREATE ROLE ${NEGCTL_PREFIX}pv_extra_intruder ${LOGIN_OK}`,
        `GRANT ${o} TO ${NEGCTL_PREFIX}pv_extra_intruder`,
      ]);
      expect(mismatches.map((x) => x.check)).toEqual(['owner-members']);
    });

    it('N-18 an indirect path is no substitute for the direct edge (effective access alone is refused)', async () => {
      const via = `${NEGCTL_PREFIX}pv_indirect_via`;
      await admin.query(`CREATE ROLE ${via} NOLOGIN INHERIT`);
      const { migrator, owner, mismatches } = await pvControl('pv-indirect', 'indirect', (o, m) => [
        `GRANT ${o} TO ${via} WITH INHERIT TRUE, SET TRUE`,
        `GRANT ${via} TO ${m} WITH INHERIT TRUE, SET TRUE`,
      ]);
      expect(await observeOwnerAccess(admin, migrator, owner)).toEqual({
        member: true,
        usage: true,
        set: true,
      });
      expect(mismatches.map((x) => x.check)).toEqual([
        'member-of',
        'owner-edge-count',
        'owner-members',
      ]);
    });

    it('N-19 from its own session, a plain-grant migration role lacks USAGE; a SET role breaks current_user = session_user', async () => {
      const secret = generateSecret();
      const plain = await pvControl(
        'pv-session-plain',
        'sess_plain',
        (o, m) => [`GRANT ${o} TO ${m}`],
        ` PASSWORD '${secret}'`,
      );
      const ok = await pvControl(
        'pv-session-canonical',
        'sess_ok',
        (o, m) => [`GRANT ${o} TO ${m} WITH INHERIT TRUE, SET TRUE`],
        ` PASSWORD '${secret}'`,
      );
      const open = async (role: string) => {
        const c = new pg.Client({
          ...specFor(ctx, ctx.migrationRole, ctx.databases.selftest),
          user: role,
          password: secret,
        });
        await c.connect();
        return c;
      };
      const cp = await open(plain.migrator);
      const co = await open(ok.migrator);
      try {
        const plainObs = await observeMigrationSession(cp, plain.owner);
        const okObs = await observeMigrationSession(co, ok.owner);
        await co.query('BEGIN');
        await co.query(`SET LOCAL ROLE ${ok.owner}`);
        const setObs = await observeMigrationSession(co, ok.owner);
        await co.query('ROLLBACK');
        results.push(
          {
            case: 'pv-session-plain(session)',
            role: plain.migrator,
            mismatches: evaluateMigrationSession(plain.migrator, plainObs),
          },
          {
            case: 'pv-session-canonical-after-SET(session)',
            role: ok.migrator,
            mismatches: evaluateMigrationSession(ok.migrator, setObs),
          },
        );
        expect(evaluateMigrationSession(plain.migrator, plainObs).map((x) => x.check)).toEqual([
          'session-pg_has_role-USAGE',
        ]);
        expect(evaluateMigrationSession(ok.migrator, okObs)).toEqual([]);
        expect(evaluateMigrationSession(ok.migrator, setObs).map((x) => x.check)).toEqual([
          'current_user',
        ]);
      } finally {
        await cp.end();
        await co.end();
      }
    });
  });
});

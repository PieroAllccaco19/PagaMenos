// M7 S02 — the §18.2 role expectations are derived mechanically from the accepted bytes (offline).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  REPO_ROOT,
  editLines,
  replaceOnce,
  v11Bytes,
  v11Text,
} from '../normative/__fixtures__/accepted-sources';
import { SourceIdentityError, SourceStructureError } from '../normative/source';
import {
  MIGRATION_ROLE_ATTRIBUTES,
  deriveM7RoleExpectations,
  deriveM7RoleExpectationsFromText,
  evaluateMigrationSession,
  evaluateOwnerMembership,
  retarget,
  type ObservedMigrationSession,
  type ObservedOwnerAccess,
  type ObservedOwnerEdge,
} from './roles';

const LOGIN_ROLES = [
  'pagamenos_m7_participant_rt',
  'pagamenos_m7_session_issuer_rt',
  'pagamenos_m7_privacy_request_rt',
  'pagamenos_m7_storage_worker_rt',
  'pagamenos_m7_deletion_authority_rt',
  'pagamenos_m7_capability_signer_rt',
];

describe('S02 M7 role expectations (derived from V1.1 §18.2, cross-checked with §18.4)', () => {
  const exp = deriveM7RoleExpectations(v11Bytes);

  it('yields exactly seven roles: one NOLOGIN owner and six login roles (Erratum 01 ER-02)', () => {
    expect(exp.all).toHaveLength(7);
    expect(exp.owner.name).toBe('pagamenos_m7_owner');
    expect(exp.login.map((r) => r.name)).toEqual(LOGIN_ROLES);
  });

  it('matches the S01 committed INVENTORY.json role derivation exactly', () => {
    const inventory = JSON.parse(
      readFileSync(join(REPO_ROOT, 'prisma/m7/normative/INVENTORY.json'), 'utf8'),
    ) as { inventory: { roles: { all: string[]; login: string[] } } };
    expect(exp.all.map((r) => r.name)).toEqual(inventory.inventory.roles.all);
    expect(exp.login.map((r) => r.name)).toEqual(inventory.inventory.roles.login);
  });

  it('owner: NOLOGIN, not SUPERUSER/CREATEDB/CREATEROLE/REPLICATION/BYPASSRLS, members = migration role', () => {
    expect(exp.owner.attributes).toEqual({
      rolcanlogin: false,
      rolsuper: false,
      rolcreatedb: false,
      rolcreaterole: false,
      rolreplication: false,
      rolbypassrls: false,
    });
    expect(exp.owner.memberships).toBe('members-exactly-migration-role');
    expect(exp.owner.connectionLimitSet).toBe(false);
  });

  it('login roles: LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT, limit set, no memberships', () => {
    for (const r of exp.login) {
      expect(r.attributes).toEqual({
        rolcanlogin: true,
        rolsuper: false,
        rolcreatedb: false,
        rolcreaterole: false,
        rolreplication: false,
        rolbypassrls: false,
        rolinherit: false,
      });
      expect(r.connectionLimitSet).toBe(true);
      expect(r.memberships).toBe('none');
    }
  });

  it('cites the accepted source lines', () => {
    for (const r of exp.all) {
      for (const line of r.sourceLines) {
        expect(v11Text.split('\n')[line - 1]).toMatch(
          /pagamenos_m7_|^\| Role \||^Every login role:/,
        );
      }
    }
  });

  it('retarget keeps the asserted definition and changes only the name', () => {
    const t = retarget(exp.login[0]!, 's02_negctl_x');
    expect({ ...t, name: exp.login[0]!.name }).toEqual(exp.login[0]);
  });

  describe('fails closed on structural drift (mutated COPIES only)', () => {
    it('refuses bytes that are not the accepted V1.1', () => {
      const mutated = new TextEncoder().encode(v11Text.replace('NOINHERIT', 'INHERIT'));
      expect(() => deriveM7RoleExpectations(mutated)).toThrow(SourceIdentityError);
    });

    it('refuses the superseded five-login-role shape', () => {
      const text = editLines(v11Text, (lines) => {
        const i = lines.findIndex((l) => l.startsWith('| `pagamenos_m7_deletion_authority_rt` |'));
        lines.splice(i, 1);
      });
      expect(() => deriveM7RoleExpectationsFromText(text)).toThrow(/expected 6 login roles/);
    });

    it('refuses a LOGIN cell that is neither YES nor NO', () => {
      const text = replaceOnce(
        v11Text,
        '| `pagamenos_m7_privacy_request_rt` | YES |',
        '| `pagamenos_m7_privacy_request_rt` | MAYBE |',
      );
      expect(() => deriveM7RoleExpectationsFromText(text)).toThrow(SourceStructureError);
    });

    it('refuses a §18.2 login attribute list that disagrees with §18.4 IA-03', () => {
      const text = replaceOnce(v11Text, 'NOBYPASSRLS NOINHERIT`', 'NOBYPASSRLS`');
      expect(() => deriveM7RoleExpectationsFromText(text)).toThrow(/IA-03/);
    });

    it('refuses an owner row whose forbidden list disagrees with §18.4 IA-02', () => {
      const text = replaceOnce(
        v11Text,
        '| SUPERUSER, CREATEDB, CREATEROLE, REPLICATION, BYPASSRLS; any member',
        '| SUPERUSER, CREATEDB, REPLICATION, BYPASSRLS; any member',
      );
      expect(() => deriveM7RoleExpectationsFromText(text)).toThrow(/IA-02/);
    });
  });
});

describe('VBA-PV-1 owner-membership predicate (pure; PostgreSQL ≥ 16 edge options)', () => {
  const MIGRATOR = 'pagamenos_migrator';
  const OWNER = 'pagamenos_m7_owner';
  const edge = (over: Partial<ObservedOwnerEdge> = {}): ObservedOwnerEdge => ({
    member: MIGRATOR,
    grantor: 'bootstrap',
    inheritOption: true,
    setOption: true,
    adminOption: false,
    ...over,
  });
  const FULL: ObservedOwnerAccess = { member: true, usage: true, set: true };
  const checks = (edges: ObservedOwnerEdge[], access: ObservedOwnerAccess = FULL) =>
    evaluateOwnerMembership(MIGRATOR, OWNER, edges, access).map((m) => m.check);

  it('the canonical edge with full effective access has zero mismatches', () => {
    expect(evaluateOwnerMembership(MIGRATOR, OWNER, [edge()], FULL)).toEqual([]);
  });

  it('inherit_option = false is detected (the pre-VBA S02 edge: MEMBER, SET but no USAGE)', () => {
    expect(
      checks([edge({ inheritOption: false })], { member: true, usage: false, set: true }),
    ).toEqual(['inherit_option', 'pg_has_role-USAGE']);
  });

  it('set_option = false is detected', () => {
    expect(checks([edge({ setOption: false })], { member: true, usage: true, set: false })).toEqual(
      ['set_option', 'pg_has_role-SET'],
    );
  });

  it('admin_option = true is detected', () => {
    expect(checks([edge({ adminOption: true })])).toEqual(['admin_option']);
  });

  it('a duplicate owner edge (second grantor) is detected, and each edge is checked', () => {
    expect(checks([edge(), edge({ grantor: 'other', adminOption: true })])).toEqual([
      'owner-edge-count',
      'admin_option',
    ]);
  });

  it('an extra owner member is detected', () => {
    const m = evaluateOwnerMembership(
      MIGRATOR,
      OWNER,
      [edge(), edge({ member: 'intruder' })],
      FULL,
    );
    expect(m).toEqual([
      {
        role: OWNER,
        check: 'owner-members',
        expected: `exactly {${MIGRATOR}}`,
        observed: `{intruder, ${MIGRATOR}}`,
      },
    ]);
  });

  it('an indirect path is no substitute for the direct edge', () => {
    // Effective access through an intermediate role, but the owner's only direct member is that role.
    expect(checks([edge({ member: 'intermediate' })])).toEqual([
      'owner-edge-count',
      'owner-members',
    ]);
    expect(checks([], { member: false, usage: false, set: false })).toEqual([
      'owner-edge-count',
      'pg_has_role-MEMBER',
      'pg_has_role-USAGE',
      'pg_has_role-SET',
    ]);
  });

  it('each false effective-access predicate is reported', () => {
    expect(checks([edge()], { member: false, usage: false, set: false })).toEqual([
      'pg_has_role-MEMBER',
      'pg_has_role-USAGE',
      'pg_has_role-SET',
    ]);
  });

  it('the migration role verifier never asserts or requires rolinherit (VFC-PG16-1)', () => {
    expect(MIGRATION_ROLE_ATTRIBUTES.rolinherit).toBeUndefined();
    expect(MIGRATION_ROLE_ATTRIBUTES.rolsuper).toBe(false);
  });
});

describe('VBA-PV-1 migration-role session predicate (pure)', () => {
  const MIGRATOR = 'pagamenos_migrator';
  const ok: ObservedMigrationSession = {
    sessionUser: MIGRATOR,
    currentUser: MIGRATOR,
    isSuperuser: 'off',
    access: { member: true, usage: true, set: true },
  };
  const checks = (o: Partial<ObservedMigrationSession>) =>
    evaluateMigrationSession(MIGRATOR, { ...ok, ...o }).map((m) => m.check);

  it('session_user = current_user = migration role, non-superuser, full access: zero mismatches', () => {
    expect(evaluateMigrationSession(MIGRATOR, ok)).toEqual([]);
  });

  it('detects a different session_user, a role already SET, a superuser session, missing access', () => {
    expect(checks({ sessionUser: 'postgres', currentUser: 'postgres' })).toEqual(['session_user']);
    expect(checks({ currentUser: 'pagamenos_m7_owner' })).toEqual(['current_user']);
    expect(checks({ isSuperuser: 'on' })).toEqual(['is_superuser']);
    expect(checks({ access: { member: true, usage: false, set: false } })).toEqual([
      'session-pg_has_role-USAGE',
      'session-pg_has_role-SET',
    ]);
  });
});

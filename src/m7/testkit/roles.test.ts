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
import { deriveM7RoleExpectations, deriveM7RoleExpectationsFromText, retarget } from './roles';

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

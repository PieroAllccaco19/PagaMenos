// M7 S02 — the role-provisioning template holds no secret, provisions exactly the §18.2 role set plus
// the migration role, and renders credentials only in memory (offline).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { REPO_ROOT, v11Bytes } from '../normative/__fixtures__/accepted-sources';
import {
  HARNESS_CONNECTION_LIMIT,
  HARNESS_MIGRATION_ROLE,
  HARNESS_MIN_SERVER_VERSION_NUM,
  OWNER_GRANT_OPTIONS,
  ProvisioningTemplateError,
  assertHarnessServerVersion,
  generateSecret,
  readRolesTemplate,
  readTemplateStructure,
  redactSecrets,
  renderRolesTemplate,
} from './provision';
import { deriveM7RoleExpectations } from './roles';

const expectations = deriveM7RoleExpectations(v11Bytes);
const template = readRolesTemplate();

function secretsFor(roles: string[]): Map<string, string> {
  return new Map(roles.map((r) => [r, generateSecret()]));
}
const allSecrets = () =>
  secretsFor([...expectations.login.map((r) => r.name), HARNESS_MIGRATION_ROLE]);

const render = (overrides: Partial<Parameters<typeof renderRolesTemplate>[0]> = {}) =>
  renderRolesTemplate({
    template,
    expectations,
    migrationRole: HARNESS_MIGRATION_ROLE,
    secrets: allSecrets(),
    connectionLimit: HARNESS_CONNECTION_LIMIT,
    ...overrides,
  });

describe('S02 roles.template.sql', () => {
  it('contains no literal credential and only role statements', () => {
    expect(template).not.toMatch(/PASSWORD\s+'/i);
    const s = readTemplateStructure(
      template.replaceAll('{{MIGRATION_ROLE}}', 'pagamenos_migrator'),
    );
    expect([...s.createdRoles.keys()].sort()).toEqual(
      [...expectations.all.map((e) => e.name), HARNESS_MIGRATION_ROLE].sort(),
    );
    expect(s.grants).toEqual([
      {
        role: 'pagamenos_m7_owner',
        member: HARNESS_MIGRATION_ROLE,
        options: { inherit: true, set: true },
      },
    ]);
  });

  it('VBA-PV-3 (≥ 16): the owner edge is exactly WITH INHERIT TRUE, SET TRUE — no ADMIN, no PG15 path', () => {
    const code = template.replace(/--[^\n]*/g, '');
    expect(code).toContain(
      'GRANT pagamenos_m7_owner\nTO {{MIGRATION_ROLE}}\nWITH INHERIT TRUE, SET TRUE;',
    );
    expect(code.match(/\bGRANT\b/g)).toHaveLength(1);
    expect(code).not.toMatch(/\bADMIN\b|GRANTED\s+BY/i);
    // No version-conditional realization and no role-attribute change (VFC-PG15-1).
    expect(code).not.toMatch(/ALTER\s+ROLE|server_version|\bDO\b|\\if/i);
    expect(OWNER_GRANT_OPTIONS).toEqual({ inherit: true, set: true });
  });

  it('the migration role stays LOGIN NOINHERIT and non-elevated (attributes unchanged)', () => {
    const code = template.replace(/--[^\n]*/g, '');
    expect(code).toMatch(
      /CREATE ROLE \{\{MIGRATION_ROLE\}\}\s+LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT\s+PASSWORD \{\{MIGRATION_ROLE_SECRET\}\};/,
    );
    const rendered = render();
    expect(rendered).toMatch(
      /CREATE ROLE pagamenos_migrator\s+LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT\s/,
    );
    expect(rendered).toContain(
      'GRANT pagamenos_m7_owner\nTO pagamenos_migrator\nWITH INHERIT TRUE, SET TRUE;',
    );
  });

  it('creates no schema, table, function or other §19 object and reads no normative SQL', () => {
    const code = template.replace(/--[^\n]*/g, '');
    expect(code).not.toMatch(/CREATE\s+(SCHEMA|TABLE|FUNCTION|TYPE|VIEW|TRIGGER|INDEX)/i);
    expect(code).not.toMatch(/\\i|\\ir|normative/);
  });

  it('the migration role is explicitly NOSUPERUSER and the login roles NOINHERIT with a limit', () => {
    const code = template.replace(/--[^\n]*/g, '');
    expect(code).toMatch(
      /CREATE ROLE \{\{MIGRATION_ROLE\}\}\s+LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE/,
    );
    expect(code).not.toMatch(/(^|\s)SUPERUSER(\s|;)/);
    for (const r of expectations.login) {
      expect(code).toMatch(
        new RegExp(
          `CREATE ROLE ${r.name}\\s+LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT\\s+CONNECTION LIMIT \\{\\{CONNECTION_LIMIT\\}\\}`,
        ),
      );
    }
  });

  it('renders every run-time secret in memory; the template itself never contains them', () => {
    const secrets = allSecrets();
    const sql = render({ secrets });
    for (const s of secrets.values()) {
      expect(sql).toContain(`'${s}'`);
      expect(template).not.toContain(s);
    }
    expect(sql).not.toContain('{{');
    expect(redactSecrets(sql, secrets.values())).not.toMatch(/PASSWORD '[A-Za-z0-9_-]{32,}'/);
  });

  it('generates distinct 192-bit base64url secrets', () => {
    const a = generateSecret();
    expect(a).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(generateSecret()).not.toBe(a);
  });

  describe('refuses', () => {
    it('a missing run-time secret', () => {
      const secrets = allSecrets();
      secrets.delete('pagamenos_m7_capability_signer_rt');
      expect(() => render({ secrets })).toThrow(/no run-time secret/);
    });

    it('a malformed secret (quote injection)', () => {
      const secrets = allSecrets();
      secrets.set(
        'pagamenos_m7_participant_rt',
        `x'; ALTER ROLE postgres NOLOGIN; --aaaaaaaaaaaaaaaa`,
      );
      expect(() => render({ secrets })).toThrow(ProvisioningTemplateError);
    });

    it('a five-login-role template', () => {
      const five = template.replace(/CREATE ROLE pagamenos_m7_capability_signer_rt[\s\S]*?;\n/, '');
      expect(() => render({ template: five })).toThrow(/role set/);
    });

    it('a template with a literal password', () => {
      const bad = template.replace(
        '{{SECRET:pagamenos_m7_participant_rt}}',
        "'hunter2hunter2hunter2hunter2hunter2'",
      );
      expect(() => render({ template: bad })).toThrow(/literal PASSWORD/);
    });

    it('a template that also grants to a login role', () => {
      const bad = template.replace(
        'COMMIT;',
        'GRANT pagamenos_m7_owner TO pagamenos_m7_storage_worker_rt;\nCOMMIT;',
      );
      expect(() => render({ template: bad })).toThrow(/only grant/);
    });

    it('a template that installs anything besides roles', () => {
      const bad = template.replace(
        'COMMIT;',
        'CREATE SCHEMA m7 AUTHORIZATION pagamenos_m7_owner;\nCOMMIT;',
      );
      expect(() => render({ template: bad })).toThrow(/non-role statement/);
    });

    it('a template that makes the migration role SUPERUSER', () => {
      const bad = template.replace(
        'CREATE ROLE {{MIGRATION_ROLE}}\n  LOGIN NOSUPERUSER',
        'CREATE ROLE {{MIGRATION_ROLE}}\n  LOGIN SUPERUSER',
      );
      expect(bad).not.toBe(template);
      expect(() => render({ template: bad })).toThrow(/elevated attribute\(s\) SUPERUSER/);
    });

    const GRANT = 'GRANT pagamenos_m7_owner\nTO {{MIGRATION_ROLE}}\nWITH INHERIT TRUE, SET TRUE;';
    const withGrant = (g: string) => {
      const t = template.replace(GRANT, g);
      expect(t).not.toBe(template);
      return t;
    };

    it.each([
      ['the pre-VBA option-less grant', 'GRANT pagamenos_m7_owner TO {{MIGRATION_ROLE}};'],
      [
        'INHERIT FALSE',
        'GRANT pagamenos_m7_owner TO {{MIGRATION_ROLE}} WITH INHERIT FALSE, SET TRUE;',
      ],
      ['SET FALSE', 'GRANT pagamenos_m7_owner TO {{MIGRATION_ROLE}} WITH INHERIT TRUE, SET FALSE;'],
      ['a missing SET option', 'GRANT pagamenos_m7_owner TO {{MIGRATION_ROLE}} WITH INHERIT TRUE;'],
      [
        'ADMIN OPTION',
        'GRANT pagamenos_m7_owner TO {{MIGRATION_ROLE}} WITH ADMIN OPTION, INHERIT TRUE, SET TRUE;',
      ],
      [
        'ADMIN TRUE',
        'GRANT pagamenos_m7_owner TO {{MIGRATION_ROLE}} WITH ADMIN TRUE, INHERIT TRUE, SET TRUE;',
      ],
    ])('an owner grant with %s', (_, g) => {
      expect(() => render({ template: withGrant(g) })).toThrow(/owner grant options/);
    });

    it('a grant it cannot parse completely (GRANTED BY, unknown or repeated option)', () => {
      for (const g of [
        'GRANT pagamenos_m7_owner TO {{MIGRATION_ROLE}} WITH INHERIT TRUE, SET TRUE GRANTED BY postgres;',
        'GRANT pagamenos_m7_owner TO {{MIGRATION_ROLE}} WITH INHERIT TRUE, SET TRUE, BYPASS TRUE;',
        'GRANT pagamenos_m7_owner TO {{MIGRATION_ROLE}} WITH INHERIT TRUE, INHERIT TRUE, SET TRUE;',
      ]) {
        expect(() => render({ template: withGrant(g) })).toThrow(ProvisioningTemplateError);
      }
    });

    it('a duplicate owner grant', () => {
      expect(() => render({ template: withGrant(`${GRANT}\n${GRANT}`) })).toThrow(/only grant/);
    });

    it('a template that alters the migration role (e.g. a PostgreSQL 15 INHERIT realization)', () => {
      const bad = template.replace('COMMIT;', 'ALTER ROLE {{MIGRATION_ROLE}} INHERIT;\nCOMMIT;');
      expect(() => render({ template: bad })).toThrow(/non-role statement/);
    });
  });
});

describe('H03 — VFC-PG-1 verification-harness floor (server_version_num >= 160000)', () => {
  it('is 160000', () => {
    expect(HARNESS_MIN_SERVER_VERSION_NUM).toBe(160000);
  });

  it.each([
    ['18.4', 180004],
    ['17.0', 170000],
    ['16.0', 160000],
  ])('admits PostgreSQL %s (%d)', (_, n) => {
    expect(() => assertHarnessServerVersion(n)).not.toThrow();
  });

  it.each([159999, 150013, 150000, 140011])(
    'refuses %d, citing 160000 and VFC-PG-1 (not IA-08)',
    (n) => {
      expect(() => assertHarnessServerVersion(n)).toThrow(
        `server_version_num ${n} < 160000 (VFC-PG-1 verification-harness precondition)`,
      );
      expect(() => assertHarnessServerVersion(n)).not.toThrow(/IA-08/);
    },
  );

  describe('the harness stops at a non-PASS H03, before any provisioning', () => {
    const harness = readFileSync(join(REPO_ROOT, 'scripts/m7/pg-m7-harness.ts'), 'utf8');
    const at = (s: string) => {
      const i = harness.indexOf(s);
      expect(i, s).toBeGreaterThan(-1);
      return i;
    };
    const GUARD = `if (checks.some((c) => c.status !== 'PASS')) return finish();`;

    it('H03 applies the VFC-PG-1 predicate and no 150000 floor remains', () => {
      const h03 = harness.slice(
        at("runCheck('H03-server-version'"),
        at("runCheck('H04-role-expectations-derived'"),
      );
      expect(h03).toContain('assertHarnessServerVersion(identity!.serverVersionNum)');
      expect(harness).not.toMatch(/150000/);
    });

    it('the existing finish() guard directly follows the H03 record, ahead of H04 / H05 / the template', () => {
      const h03 = at("runCheck('H03-server-version'");
      const guard = harness.indexOf(GUARD, h03);
      expect(guard).toBeGreaterThan(h03);
      // Nothing but the end of the H03 record lies between H03 and the guard.
      expect(harness.slice(h03 + 'runCheck('.length, guard)).not.toMatch(
        /record\(|runCheck\(|withAdmin|query\(/,
      );
      for (const later of [
        "runCheck('H04-role-expectations-derived'",
        'readRolesTemplate(ROOT)',
        'renderRolesTemplate(',
        "runCheck('H05-roles-provisioned'",
      ]) {
        expect(at(later), later).toBeGreaterThan(guard);
      }
      // H03 is still a required check in its original position (no new status or check id).
      expect(harness).toMatch(
        /'H02-cluster-start-connect',\s+'H03-server-version',\s+'H04-role-expectations-derived',/,
      );
    });
  });
});

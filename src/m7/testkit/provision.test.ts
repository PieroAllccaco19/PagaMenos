// M7 S02 — the role-provisioning template holds no secret, provisions exactly the §18.2 role set plus
// the migration role, and renders credentials only in memory (offline).
import { describe, expect, it } from 'vitest';

import { v11Bytes } from '../normative/__fixtures__/accepted-sources';
import {
  HARNESS_CONNECTION_LIMIT,
  HARNESS_MIGRATION_ROLE,
  ProvisioningTemplateError,
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
    expect(s.grants).toEqual([{ role: 'pagamenos_m7_owner', member: HARNESS_MIGRATION_ROLE }]);
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
  });
});

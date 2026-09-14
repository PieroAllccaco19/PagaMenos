// M7 V1.1 — S02 real-PostgreSQL harness: rendering the role-provisioning template.
//
// Test infrastructure only. `scripts/m7/provision/roles.template.sql` holds no secret; this module
// substitutes ephemeral, run-time-generated credentials into it in memory. It also cross-checks the
// template against the §18.2-derived expectations, so the template cannot silently provision a
// different role set (for example the superseded five-login-role interpretation).
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { M7RoleExpectations } from './roles';

export const ROLES_TEMPLATE_PATH = 'scripts/m7/provision/roles.template.sql';

/** The harness's named, non-superuser migration role (an implementation choice; not a §18.2 row). */
export const HARNESS_MIGRATION_ROLE = 'pagamenos_migrator';

/** Per-login-role connection limit the harness provisions (§18.2 only requires that one is set). */
export const HARNESS_CONNECTION_LIMIT = 16;

const IDENTIFIER = /^[a-z_][a-z0-9_]{0,62}$/;
const SECRET = /^[A-Za-z0-9_-]{32,128}$/;

export class ProvisioningTemplateError extends Error {
  constructor(message: string) {
    super(`M7-S02 PROVISIONING TEMPLATE: ${message}`);
    this.name = 'ProvisioningTemplateError';
  }
}

/** An ephemeral credential: 192 random bits, base64url (never contains a quote or backslash). */
export function generateSecret(): string {
  return randomBytes(24).toString('base64url');
}

export function readRolesTemplate(root: string = process.cwd()): string {
  return readFileSync(join(root, ROLES_TEMPLATE_PATH), 'utf8');
}

/** Removes `--` comments so structural checks see only executable text. */
function stripComments(sql: string): string {
  return sql.replace(/--[^\n]*/g, '');
}

export interface TemplateStructure {
  /** role name → whether its CREATE ROLE says LOGIN. */
  readonly createdRoles: ReadonlyMap<string, boolean>;
  readonly grants: readonly { role: string; member: string }[];
}

/** Structural reading of the (unrendered or rendered) template. */
export function readTemplateStructure(sql: string): TemplateStructure {
  const code = stripComments(sql);
  if (/\bPASSWORD\s+'/i.test(code)) {
    // Detects a literal credential in an UNRENDERED template.
    throw new ProvisioningTemplateError('template contains a literal PASSWORD');
  }
  const createdRoles = new Map<string, boolean>();
  for (const m of code.matchAll(/CREATE\s+ROLE\s+([^\s;]+)\s+([^;]*);/gi)) {
    const name = m[1]!;
    if (createdRoles.has(name)) throw new ProvisioningTemplateError(`duplicate role ${name}`);
    const tokens = m[2]!.split(/\s+/);
    const elevated = tokens.filter((t) =>
      ['SUPERUSER', 'CREATEDB', 'CREATEROLE', 'REPLICATION', 'BYPASSRLS'].includes(t.toUpperCase()),
    );
    if (elevated.length > 0) {
      throw new ProvisioningTemplateError(`${name}: elevated attribute(s) ${elevated.join(', ')}`);
    }
    createdRoles.set(name, tokens.includes('LOGIN'));
  }
  const grants = [...code.matchAll(/GRANT\s+([^\s;]+)\s+TO\s+([^\s;]+)\s*;/gi)].map((m) => ({
    role: m[1]!,
    member: m[2]!,
  }));
  const statements = code
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (const s of statements) {
    if (!/^(BEGIN|COMMIT|CREATE\s+ROLE\s|GRANT\s+[^\s]+\s+TO\s)/i.test(s)) {
      throw new ProvisioningTemplateError(`non-role statement refused: ${s.split('\n')[0]}`);
    }
  }
  return { createdRoles, grants };
}

export interface RenderInput {
  readonly template: string;
  readonly expectations: M7RoleExpectations;
  readonly migrationRole: string;
  /** role name → ephemeral secret; must cover every login role and the migration role. */
  readonly secrets: ReadonlyMap<string, string>;
  readonly connectionLimit: number;
}

/**
 * Renders the template in memory. Refuses if: the template contains a literal credential or a
 * non-role statement; its role set is not exactly the seven §18.2 roles plus the migration role; a
 * role's LOGIN-ness disagrees with §18.2; its only grant is not owner → migration role; or any
 * placeholder is left unresolved.
 */
export function renderRolesTemplate(input: RenderInput): string {
  const { template, expectations, migrationRole, secrets, connectionLimit } = input;
  if (!IDENTIFIER.test(migrationRole)) throw new ProvisioningTemplateError('bad migration role');
  if (!Number.isInteger(connectionLimit) || connectionLimit < 1) {
    throw new ProvisioningTemplateError('connection limit must be a positive integer');
  }
  for (const [role, secret] of secrets) {
    if (!SECRET.test(secret)) throw new ProvisioningTemplateError(`malformed secret for ${role}`);
  }

  const withRole = template.replaceAll('{{MIGRATION_ROLE}}', migrationRole);
  const structure = readTemplateStructure(withRole);

  const expected = new Map<string, boolean>(
    expectations.all.map((e) => [e.name, e.kind === 'login']),
  );
  expected.set(migrationRole, true);
  const actualNames = [...structure.createdRoles.keys()].sort();
  const expectedNames = [...expected.keys()].sort();
  if (JSON.stringify(actualNames) !== JSON.stringify(expectedNames)) {
    throw new ProvisioningTemplateError(
      `role set ${actualNames.join(',')} ≠ expected ${expectedNames.join(',')}`,
    );
  }
  for (const [name, login] of structure.createdRoles) {
    if (expected.get(name) !== login) {
      throw new ProvisioningTemplateError(`${name}: LOGIN=${login} disagrees with §18.2`);
    }
  }
  if (
    structure.grants.length !== 1 ||
    structure.grants[0]!.role !== expectations.owner.name ||
    structure.grants[0]!.member !== migrationRole
  ) {
    throw new ProvisioningTemplateError('the only grant must be the owner to the migration role');
  }

  const secretFor = (role: string): string => {
    const s = secrets.get(role);
    if (!s) throw new ProvisioningTemplateError(`no run-time secret supplied for ${role}`);
    return `'${s}'`;
  };
  // Only executable text is rendered: comments (which name the placeholders) are dropped.
  const rendered = stripComments(withRole)
    .replaceAll('{{MIGRATION_ROLE_SECRET}}', secretFor(migrationRole))
    .replaceAll('{{CONNECTION_LIMIT}}', String(connectionLimit))
    .replace(/\{\{SECRET:([a-z0-9_]+)\}\}/g, (_, role: string) => secretFor(role));
  if (rendered.includes('{{')) throw new ProvisioningTemplateError('unresolved placeholder');
  return rendered;
}

/** Replaces every occurrence of any secret in `text` (for error messages and evidence). */
export function redactSecrets(text: string, secrets: Iterable<string>): string {
  let out = text;
  for (const s of secrets) out = out.split(s).join('[REDACTED]');
  return out;
}

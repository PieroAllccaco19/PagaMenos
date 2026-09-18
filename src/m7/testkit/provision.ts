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

/**
 * VFC-PG-1: the minimum `server_version_num` of the running server for the VBA-S02-1 provisioning
 * realization (per-membership INHERIT / SET options exist from PostgreSQL 16). A harness precondition
 * only (H03): it is not IA-08 and not a product-wide PostgreSQL support floor.
 */
export const HARNESS_MIN_SERVER_VERSION_NUM = 160000;

/** H03: refuses a running server below the VFC-PG-1 floor (throws; the check is then FAIL). */
export function assertHarnessServerVersion(serverVersionNum: number): void {
  if (serverVersionNum < HARNESS_MIN_SERVER_VERSION_NUM) {
    throw new Error(
      `server_version_num ${serverVersionNum} < ${HARNESS_MIN_SERVER_VERSION_NUM} (VFC-PG-1 verification-harness precondition)`,
    );
  }
}

/** A membership option stated on a GRANT (`WITH { ADMIN | INHERIT | SET } { TRUE | FALSE | OPTION }`). */
export type GrantOption = 'admin' | 'inherit' | 'set';

/** VBA-PV-3 (PostgreSQL ≥ 16): the only admissible options of the owner → migration role grant. */
export const OWNER_GRANT_OPTIONS: Readonly<Partial<Record<GrantOption, boolean>>> = {
  inherit: true,
  set: true,
};

export interface TemplateGrant {
  readonly role: string;
  readonly member: string;
  /** Exactly the options the statement states; an unstated option is absent. */
  readonly options: Readonly<Partial<Record<GrantOption, boolean>>>;
}

export interface TemplateStructure {
  /** role name → whether its CREATE ROLE says LOGIN. */
  readonly createdRoles: ReadonlyMap<string, boolean>;
  readonly grants: readonly TemplateGrant[];
}

const GRANT_STATEMENT = /^GRANT\s+([^\s;,]+)\s+TO\s+([^\s;,]+)(?:\s+WITH\s+([\s\S]+))?$/i;

function parseGrantOptions(text: string | undefined, statement: string): TemplateGrant['options'] {
  const options: Partial<Record<GrantOption, boolean>> = {};
  if (text === undefined) return options;
  for (const clause of text.split(',').map((c) => c.trim())) {
    const m = /^(ADMIN|INHERIT|SET)\s+(TRUE|FALSE|OPTION)$/i.exec(clause);
    if (!m) throw new ProvisioningTemplateError(`unrecognized grant option in: ${statement}`);
    const option = m[1]!.toLowerCase() as GrantOption;
    if (option in options) throw new ProvisioningTemplateError(`repeated grant option ${option}`);
    options[option] = m[2]!.toUpperCase() !== 'FALSE';
  }
  return options;
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
  const grants: TemplateGrant[] = [];
  const statements = code
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (const s of statements) {
    if (/^GRANT\s/i.test(s)) {
      // Every GRANT must parse completely (e.g. a GRANTED BY clause is refused, never skipped).
      const m = GRANT_STATEMENT.exec(s);
      if (!m) throw new ProvisioningTemplateError(`unrecognized grant: ${s.split('\n')[0]}`);
      grants.push({ role: m[1]!, member: m[2]!, options: parseGrantOptions(m[3], s) });
    } else if (!/^(BEGIN|COMMIT|CREATE\s+ROLE\s)/i.test(s)) {
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
 * role's LOGIN-ness disagrees with §18.2; its only grant is not owner → migration role stating
 * exactly `WITH INHERIT TRUE, SET TRUE` (VBA-PV-3); or any placeholder is left unresolved.
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
  const options = structure.grants[0]!.options;
  if (
    JSON.stringify(Object.entries(options).sort()) !==
    JSON.stringify(Object.entries(OWNER_GRANT_OPTIONS).sort())
  ) {
    throw new ProvisioningTemplateError(
      `owner grant options ${JSON.stringify(options)} ≠ WITH INHERIT TRUE, SET TRUE (VBA-PV-3)`,
    );
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

// M7 V1.1 — S02 real-PostgreSQL harness: M7 role expectations and the role verifier.
//
// Test infrastructure only. The seven M7 role names and their asserted attributes are derived
// MECHANICALLY from the accepted §18.2 bytes (identity-verified before anything is read), so the
// verifier cannot drift from the specification by hand-editing a list. §18.2 already carries the six
// login roles that Erratum 01 ER-02 aligns §24.3 and T-08b to; the superseded five-role count is not
// representable here. The verifier only OBSERVES pg_catalog and reports every mismatch; it grants,
// alters and creates nothing.
import {
  M7_V1_1,
  SourceStructureError,
  parseMarkdown,
  sectionLines,
  tableRowIds,
  verifyBoundArtifact,
} from '../normative/source';

/** The pg_roles boolean attribute columns §18.2 / §18.4 assert. */
export type PgRoleAttribute =
  | 'rolcanlogin'
  | 'rolsuper'
  | 'rolcreatedb'
  | 'rolcreaterole'
  | 'rolreplication'
  | 'rolbypassrls'
  | 'rolinherit';

/** §18.2 keyword → pg_roles column. */
const KEYWORD_COLUMN: Readonly<Record<string, PgRoleAttribute>> = {
  LOGIN: 'rolcanlogin',
  SUPERUSER: 'rolsuper',
  CREATEDB: 'rolcreatedb',
  CREATEROLE: 'rolcreaterole',
  REPLICATION: 'rolreplication',
  BYPASSRLS: 'rolbypassrls',
  INHERIT: 'rolinherit',
};

export interface RoleExpectation {
  readonly name: string;
  readonly kind: 'owner' | 'login';
  /** Exactly the attributes the authority asserts; an attribute it does not assert is absent. */
  readonly attributes: Readonly<Partial<Record<PgRoleAttribute, boolean>>>;
  /** §18.2 "CONNECTION LIMIT set" (login roles): `rolconnlimit` must not be -1 (unlimited). */
  readonly connectionLimitSet: boolean;
  /**
   * `none`: the role is granted to no role and no role is granted to it (§18.2, IA-04).
   * `members-exactly-migration-role`: the role's members are exactly the migration role (§18.2
   * owner row, IA-05).
   */
  readonly memberships: 'none' | 'members-exactly-migration-role';
  /** Source line citations in the accepted V1.1 bytes. */
  readonly sourceLines: readonly number[];
}

export interface M7RoleExpectations {
  readonly owner: RoleExpectation;
  readonly login: readonly RoleExpectation[];
  readonly all: readonly RoleExpectation[];
}

const EXPECTED_HEADER = [
  'Role',
  'LOGIN',
  'Owns',
  'Schema USAGE',
  'Table / sequence privileges',
  'EXECUTE',
  'Forbidden (asserted)',
];

function splitCells(text: string): string[] {
  return text
    .slice(1, text.endsWith('|') ? -1 : undefined)
    .split(/(?<!\\)\|/)
    .map((c) => c.trim());
}

function keywordColumn(keyword: string, line: number): PgRoleAttribute {
  const column = KEYWORD_COLUMN[keyword];
  if (!column)
    throw new SourceStructureError(`§18.2 line ${line}: unknown role keyword ${keyword}`);
  return column;
}

/**
 * Derives the M7 role expectations from the accepted V1.1 text. Every structural surprise refuses
 * (fail closed): a changed header, a LOGIN cell other than YES/NO, a missing login-role attribute
 * sentence, or a role count that is not 1 owner + 6 login roles.
 */
export function deriveM7RoleExpectationsFromText(v11Text: string): M7RoleExpectations {
  const structure = parseMarkdown(v11Text);
  const section = sectionLines(structure, '### 18.2 ', 3);

  const header = section.find((l) => l.text.startsWith('| Role |'));
  if (!header) throw new SourceStructureError('§18.2: role table header not found');
  const headerCells = splitCells(header.text);
  if (JSON.stringify(headerCells) !== JSON.stringify(EXPECTED_HEADER)) {
    throw new SourceStructureError(`§18.2 line ${header.line}: unexpected role table header`);
  }

  // "Every login role: `NOSUPERUSER … NOINHERIT`, `CONNECTION LIMIT` set, no role memberships …"
  const everyLogin = section.filter((l) => l.text.startsWith('Every login role:'));
  if (everyLogin.length !== 1) {
    throw new SourceStructureError('§18.2: expected exactly one "Every login role:" sentence');
  }
  const loginSentence = everyLogin[0]!;
  const attrSpan = /^Every login role: `([A-Z ]+)`/.exec(loginSentence.text);
  if (!attrSpan) {
    throw new SourceStructureError(`§18.2 line ${loginSentence.line}: attribute list not found`);
  }
  const loginAttributes: Partial<Record<PgRoleAttribute, boolean>> = { rolcanlogin: true };
  for (const token of attrSpan[1]!.trim().split(/\s+/)) {
    if (!token.startsWith('NO')) {
      throw new SourceStructureError(`§18.2 line ${loginSentence.line}: non-negated ${token}`);
    }
    loginAttributes[keywordColumn(token.slice(2), loginSentence.line)] = false;
  }
  const connectionLimitSet = loginSentence.text.includes('`CONNECTION LIMIT` set');
  if (!connectionLimitSet || !loginSentence.text.includes('no role memberships')) {
    throw new SourceStructureError(
      `§18.2 line ${loginSentence.line}: CONNECTION LIMIT / membership clause not found`,
    );
  }
  if (!loginSentence.text.includes('**None of them is granted to or granted any other role.**')) {
    throw new SourceStructureError(`§18.2 line ${loginSentence.line}: no-membership rule missing`);
  }

  const rows = tableRowIds(section, /pagamenos_m7_[a-z_]+/);
  const owners: RoleExpectation[] = [];
  const logins: RoleExpectation[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (row.cells.length !== EXPECTED_HEADER.length) {
      throw new SourceStructureError(`§18.2 line ${row.line}: ${row.cells.length} cells`);
    }
    if (seen.has(row.id)) throw new SourceStructureError(`§18.2: duplicate role ${row.id}`);
    seen.add(row.id);
    const login = row.cells[1]!.replace(/\*\*/g, '').trim();
    if (login === 'NO') {
      // Owner row: "SUPERUSER, CREATEDB, …; any member other than the migration role(s) …"
      const forbidden = row.cells[6]!;
      const [attrPart, memberPart] = forbidden.split(';');
      if (!memberPart?.includes('any member other than the migration role')) {
        throw new SourceStructureError(`§18.2 line ${row.line}: owner membership rule missing`);
      }
      const attributes: Partial<Record<PgRoleAttribute, boolean>> = { rolcanlogin: false };
      for (const kw of attrPart!.split(',').map((s) => s.trim())) {
        attributes[keywordColumn(kw, row.line)] = false;
      }
      owners.push({
        name: row.id,
        kind: 'owner',
        attributes,
        connectionLimitSet: false,
        memberships: 'members-exactly-migration-role',
        sourceLines: [header.line, row.line],
      });
    } else if (login === 'YES') {
      logins.push({
        name: row.id,
        kind: 'login',
        attributes: { ...loginAttributes },
        connectionLimitSet: true,
        memberships: 'none',
        sourceLines: [header.line, row.line, loginSentence.line],
      });
    } else {
      throw new SourceStructureError(`§18.2 line ${row.line}: LOGIN cell ${JSON.stringify(login)}`);
    }
  }

  // RS-1 names the owner; §18.2 must yield exactly one owner and six login roles (ER-02 cardinality).
  if (owners.length !== 1 || owners[0]!.name !== 'pagamenos_m7_owner') {
    throw new SourceStructureError(`§18.2: expected exactly the owner pagamenos_m7_owner`);
  }
  if (logins.length !== 6) {
    throw new SourceStructureError(`§18.2: expected 6 login roles, derived ${logins.length}`);
  }
  const owner = owners[0]!;

  // Independent second derivation from §18.4: IA-02 (owner) and IA-03 (login roles) must assert
  // exactly the same attribute sets, or the derivation refuses.
  const ia = tableRowIds(sectionLines(structure, '### 18.4 ', 3), /IA-0[23]/);
  const iaAttributes = (id: string): Partial<Record<PgRoleAttribute, boolean>> => {
    const row = ia.filter((r) => r.id === id);
    if (row.length !== 1) throw new SourceStructureError(`§18.4: expected exactly one ${id} row`);
    const cell = row[0]!.cells[1]!;
    const out: Partial<Record<PgRoleAttribute, boolean>> = {};
    const login = /`rolcanlogin = (true|false)`/.exec(cell);
    const negated = /not ([a-z]+(?:\/[a-z]+)+)/.exec(cell);
    if (!login || !negated) {
      throw new SourceStructureError(
        `§18.4 line ${row[0]!.line}: ${id} attribute clause not found`,
      );
    }
    out.rolcanlogin = login[1] === 'true';
    for (const kw of negated[1]!.split('/'))
      out[keywordColumn(kw.toUpperCase(), row[0]!.line)] = false;
    if (cell.includes('`rolinherit = false`')) out.rolinherit = false;
    return out;
  };
  const sameAttributes = (
    a: Partial<Record<PgRoleAttribute, boolean>>,
    b: Partial<Record<PgRoleAttribute, boolean>>,
  ): boolean =>
    JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());
  if (!sameAttributes(owner.attributes, iaAttributes('IA-02'))) {
    throw new SourceStructureError('§18.2 owner attributes disagree with §18.4 IA-02');
  }
  if (!sameAttributes(loginAttributes, iaAttributes('IA-03'))) {
    throw new SourceStructureError('§18.2 login-role attributes disagree with §18.4 IA-03');
  }

  return { owner, login: logins, all: [owner, ...logins] };
}

/** Derives the expectations from the accepted V1.1 BYTES, verifying their identity first. */
export function deriveM7RoleExpectations(v11Bytes: Uint8Array): M7RoleExpectations {
  return deriveM7RoleExpectationsFromText(verifyBoundArtifact(M7_V1_1, v11Bytes));
}

/**
 * The same asserted definition applied to a different (disposable) role name. Used only by negative
 * controls: the accepted expectation is never altered, it is re-targeted.
 */
export function retarget(expectation: RoleExpectation, name: string): RoleExpectation {
  return { ...expectation, name };
}

// ---------------------------------------------------------------------------------------------------
// Observation and verification
// ---------------------------------------------------------------------------------------------------

/** The minimal query surface the verifier needs (satisfied by `pg.Client`). */
export interface Queryable {
  query<R extends object = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: R[] }>;
}

export interface ObservedRole {
  readonly rolname: string;
  readonly rolcanlogin: boolean;
  readonly rolsuper: boolean;
  readonly rolcreatedb: boolean;
  readonly rolcreaterole: boolean;
  readonly rolreplication: boolean;
  readonly rolbypassrls: boolean;
  readonly rolinherit: boolean;
  readonly rolconnlimit: number;
  readonly hasValidUntil: boolean;
}

export interface ObservedMembership {
  readonly role: string;
  readonly member: string;
  readonly adminOption: boolean;
}

export interface RoleMismatch {
  readonly role: string;
  readonly check: string;
  readonly expected: string;
  readonly observed: string;
}

export async function observeRoles(
  db: Queryable,
  names: readonly string[],
): Promise<ObservedRole[]> {
  const { rows } = await db.query<ObservedRole>(
    `SELECT r.rolname, r.rolcanlogin, r.rolsuper, r.rolcreatedb, r.rolcreaterole, r.rolreplication,
            r.rolbypassrls, r.rolinherit, r.rolconnlimit, (r.rolvaliduntil IS NOT NULL) AS "hasValidUntil"
       FROM pg_catalog.pg_roles r
      WHERE r.rolname = ANY ($1::text[])
      ORDER BY r.rolname COLLATE "C"`,
    [names],
  );
  return rows;
}

export async function observeMemberships(
  db: Queryable,
  names: readonly string[],
): Promise<ObservedMembership[]> {
  const { rows } = await db.query<ObservedMembership>(
    `SELECT g.rolname AS role, u.rolname AS member, m.admin_option AS "adminOption"
       FROM pg_catalog.pg_auth_members m
       JOIN pg_catalog.pg_roles g ON g.oid = m.roleid
       JOIN pg_catalog.pg_roles u ON u.oid = m.member
      WHERE g.rolname = ANY ($1::text[]) OR u.rolname = ANY ($1::text[])
      ORDER BY g.rolname COLLATE "C", u.rolname COLLATE "C"`,
    [names],
  );
  return rows;
}

/**
 * Verifies `expectations` against pg_catalog and returns EVERY mismatch (empty = verified). Checks:
 * existence, each asserted boolean attribute, the connection limit, and the membership rule.
 */
export async function verifyRoles(
  db: Queryable,
  expectations: readonly RoleExpectation[],
  migrationRole: string,
): Promise<RoleMismatch[]> {
  const names = expectations.map((e) => e.name);
  const roles = new Map((await observeRoles(db, names)).map((r) => [r.rolname, r]));
  const memberships = await observeMemberships(db, names);
  const mismatches: RoleMismatch[] = [];

  for (const exp of expectations) {
    const observed = roles.get(exp.name);
    if (!observed) {
      mismatches.push({ role: exp.name, check: 'exists', expected: 'true', observed: 'false' });
      continue;
    }
    for (const [column, expected] of Object.entries(exp.attributes) as [
      PgRoleAttribute,
      boolean,
    ][]) {
      if (observed[column] !== expected) {
        mismatches.push({
          role: exp.name,
          check: column,
          expected: String(expected),
          observed: String(observed[column]),
        });
      }
    }
    if (exp.connectionLimitSet && observed.rolconnlimit < 0) {
      mismatches.push({
        role: exp.name,
        check: 'rolconnlimit',
        expected: '>= 0 (CONNECTION LIMIT set)',
        observed: String(observed.rolconnlimit),
      });
    }
    if (exp.memberships === 'none') {
      for (const m of memberships.filter((x) => x.role === exp.name || x.member === exp.name)) {
        mismatches.push({
          role: exp.name,
          check: 'memberships',
          expected: 'none',
          observed: `${m.role} <- ${m.member}`,
        });
      }
    } else {
      const members = memberships
        .filter((x) => x.role === exp.name)
        .map((x) => x.member)
        .sort();
      if (members.length !== 1 || members[0] !== migrationRole) {
        mismatches.push({
          role: exp.name,
          check: 'members',
          expected: `exactly {${migrationRole}}`,
          observed: `{${members.join(', ')}}`,
        });
      }
    }
  }
  return mismatches;
}

/**
 * The harness migration role (owner-class, §19.2 "executed by the migration role"): LOGIN, never
 * SUPERUSER / CREATEDB / CREATEROLE / REPLICATION / BYPASSRLS, and a member of the M7 owner so the
 * future install can `CREATE SCHEMA … AUTHORIZATION` / `SET LOCAL ROLE` it (IA-05). This is a harness
 * provisioning requirement, not a §18.2 row.
 */
export const MIGRATION_ROLE_ATTRIBUTES: Readonly<Record<PgRoleAttribute, boolean | undefined>> = {
  rolcanlogin: true,
  rolsuper: false,
  rolcreatedb: false,
  rolcreaterole: false,
  rolreplication: false,
  rolbypassrls: false,
  rolinherit: undefined,
};

export async function verifyMigrationRole(
  db: Queryable,
  migrationRole: string,
  ownerRole: string,
): Promise<RoleMismatch[]> {
  const [observed] = await observeRoles(db, [migrationRole]);
  if (!observed) {
    return [{ role: migrationRole, check: 'exists', expected: 'true', observed: 'false' }];
  }
  const mismatches: RoleMismatch[] = [];
  for (const [column, expected] of Object.entries(MIGRATION_ROLE_ATTRIBUTES) as [
    PgRoleAttribute,
    boolean | undefined,
  ][]) {
    if (expected !== undefined && observed[column] !== expected) {
      mismatches.push({
        role: migrationRole,
        check: column,
        expected: String(expected),
        observed: String(observed[column]),
      });
    }
  }
  const memberships = await observeMemberships(db, [migrationRole]);
  if (!memberships.some((m) => m.role === ownerRole && m.member === migrationRole)) {
    mismatches.push({
      role: migrationRole,
      check: 'member-of',
      expected: ownerRole,
      observed: memberships.map((m) => m.role).join(', ') || '(none)',
    });
  }
  return mismatches;
}

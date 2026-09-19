// M7 V1.1 — S03 verification bootstrap: the expectation payload E (VBA-01 §9, VBA-FX-5).
//
// Verification tooling only. E is a pure, deterministic function of S1 … S3 (VBA-AX-1, VBA-AX-3): object
// names, headers and bodies are read from the integrated S01 fragment bytes (S2 — proven equal to a
// regeneration from S1 by `loadS03Sources`), role rows from the accepted §18.2 bytes (S1), and exactly two
// provisioning facts from the pinned S02 / VBA-S02-1 inputs (S3). No catalog, error message, earlier run or
// runtime observation is an input. Every structural surprise throws: a value that cannot be derived is
// never guessed (VBA-AX-6).
import { createHash } from 'node:crypto';

import { deriveM7RoleExpectationsFromText } from '../testkit/roles';
import { M7_V1_1, parseMarkdown, sectionLines, tableRowIds } from '../normative/source';
import type { FragmentSource, S03Sources } from './sources';
import { normalizeSpace, splitParenthesised, splitStatements } from './sql';

export class ExpectationDerivationError extends Error {
  constructor(message: string) {
    super(`M7-S03 EXPECTATION DERIVATION: ${message}`);
    this.name = 'ExpectationDerivationError';
  }
}

/** VBA-01 §9.3: the single admissible `proconfig` rendering (`m7_expected_function_proconfig_ck`). */
export const EXPECTED_PROCONFIG = 'search_path=pg_catalog, pg_temp|lock_timeout=5s';
const HEADER_SET_CLAUSES = "SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'";

/** The expectation payload E: `manifestVersion` plus the eighteen arrays, named after the parameters. */
export interface ExpectationPayload {
  readonly manifestVersion: string;
  readonly p_relation_names: readonly string[];
  readonly p_relation_kinds: readonly string[];
  readonly p_object_relations: readonly string[];
  readonly p_object_kinds: readonly string[];
  readonly p_object_names: readonly string[];
  readonly p_object_unique: readonly (boolean | null)[];
  readonly p_function_signatures: readonly string[];
  readonly p_function_definer: readonly boolean[];
  readonly p_function_proconfig: readonly string[];
  readonly p_function_source_sha256: readonly string[];
  readonly p_grant_signatures: readonly string[];
  readonly p_grant_roles: readonly string[];
  readonly p_role_names: readonly string[];
  readonly p_role_can_login: readonly boolean[];
  readonly p_role_inherits: readonly boolean[];
  readonly p_role_schema_usage: readonly boolean[];
  readonly p_member_roles: readonly string[];
  readonly p_member_names: readonly string[];
}

/** The eighteen array parameters of `m7.c_load_catalog_expectations_v1`, in declared order. */
export const EXPECTATION_ARRAY_PARAMETERS = [
  'p_relation_names',
  'p_relation_kinds',
  'p_object_relations',
  'p_object_kinds',
  'p_object_names',
  'p_object_unique',
  'p_function_signatures',
  'p_function_definer',
  'p_function_proconfig',
  'p_function_source_sha256',
  'p_grant_signatures',
  'p_grant_roles',
  'p_role_names',
  'p_role_can_login',
  'p_role_inherits',
  'p_role_schema_usage',
  'p_member_roles',
  'p_member_names',
] as const;

export type ConstraintClass = 'PRIMARY KEY' | 'UNIQUE' | 'FOREIGN KEY' | 'CHECK';

export interface DerivedRelation {
  readonly name: string;
  readonly kind: 'r' | 'v';
  readonly fragment: string;
}

export interface DerivedObject {
  readonly relation: string;
  readonly kind: 'TRIGGER' | 'CONSTRAINT' | 'INDEX';
  readonly name: string;
  readonly unique: boolean | null;
  readonly fragment: string;
  /** CONSTRAINT class, `loop` / `explicit` for triggers, `index` for indexes. */
  readonly detail: ConstraintClass | 'loop' | 'explicit' | 'index';
  /** FOREIGN KEY target, schema-qualified as written (`m7.<t>` or `public.<t>`). */
  readonly references?: string;
  /** The exact accepted DDL statement that creates the object (explicit triggers, indexes, ALTER-added FKs). */
  readonly statement?: string;
}

export interface DerivedFunction {
  readonly name: string;
  readonly prefix: string;
  readonly signature: string;
  /** Declared parameter names, in order. */
  readonly argNames: readonly string[];
  /** Declared parameter types as written in the accepted header. */
  readonly declaredTypes: readonly string[];
  /** §9.4 renderings of the declared types. */
  readonly argTypes: readonly string[];
  readonly definer: boolean;
  readonly sourceSha256: string;
  readonly body: string;
  /** The exact accepted `CREATE FUNCTION … $fn$;` statement. */
  readonly statement: string;
  readonly fragment: string;
}

export interface DerivedRole {
  readonly name: string;
  readonly canLogin: boolean;
  readonly inherits: boolean;
  readonly schemaUsage: boolean;
}

export interface DerivedCatalog {
  readonly relations: readonly DerivedRelation[];
  readonly objects: readonly DerivedObject[];
  readonly functions: readonly DerivedFunction[];
  readonly grants: readonly { readonly signature: string; readonly role: string }[];
  readonly roles: readonly DerivedRole[];
  readonly members: readonly { readonly role: string; readonly member: string }[];
  /** The 39 tables in §19.10.1 loop order. */
  readonly loopTables: readonly string[];
  /** Prefix → grantee (F26 grant mapping). */
  readonly grantMapping: Readonly<Record<string, string>>;
  readonly ownerRole: string;
  readonly loginRoles: readonly string[];
  readonly migrationRole: string;
  readonly ownerRolinherit: boolean;
  /** The exact accepted CREATE TABLE statement of every M7 table (reversal of constraint injections). */
  readonly tableDdl: ReadonlyMap<string, string>;
}

export interface Derivation {
  readonly payload: ExpectationPayload;
  readonly catalog: DerivedCatalog;
  readonly inventory: readonly InventoryCheck[];
}

// ---------------------------------------------------------------------------------------------------
// §9.4 signature rendering
// ---------------------------------------------------------------------------------------------------

const UNCHANGED_TYPES = new Set([
  'bigint',
  'boolean',
  'boolean[]',
  'bytea',
  'date',
  'integer',
  'interval',
  'jsonb',
  'name[]',
  'text',
  'text[]',
  'uuid',
]);

/** VBA-01 §9.4, closed over the accepted argument types; anything else blocks derivation. */
export function renderArgType(
  declared: string,
  enumTypes: ReadonlySet<string>,
  tables: ReadonlySet<string>,
): string {
  const t = normalizeSpace(declared);
  if (t === 'timestamptz') return 'timestamp with time zone';
  if (t === '"char"[]') return '"char"[]';
  if (UNCHANGED_TYPES.has(t)) return t;
  const en = /^m7\."([A-Za-z0-9]+)"(\[\])?$/.exec(t);
  if (en && enumTypes.has(en[1]!)) return t;
  const row = /^m7\.([a-z0-9_]+)$/.exec(t);
  if (row && tables.has(row[1]!)) return t;
  throw new ExpectationDerivationError(
    `argument type ${JSON.stringify(t)} is outside the §9.4 table`,
  );
}

// ---------------------------------------------------------------------------------------------------
// Derivation
// ---------------------------------------------------------------------------------------------------

function sha256Prefixed(text: string): string {
  return `sha256:${createHash('sha256').update(text, 'utf8').digest('hex')}`;
}

interface ParsedFunction {
  readonly name: string;
  readonly argNames: readonly string[];
  readonly args: readonly string[];
  readonly definer: boolean;
  readonly body: string;
}

function parseFunction(text: string, fragment: string): ParsedFunction {
  const head = /^CREATE FUNCTION m7\.([a-z][a-z0-9_]*)\(/.exec(text);
  if (!head) throw new ExpectationDerivationError(`${fragment}: unreadable function header`);
  const name = head[1]!;
  const open = head[0].length - 1;
  const { items, close } = splitParenthesised(text.slice(open));
  const asAt = text.indexOf('\nAS $fn$', open + close);
  if (asAt === -1) throw new ExpectationDerivationError(`${name}: no "AS $fn$" line`);
  const headerTail = normalizeSpace(text.slice(open + close + 1, asAt));
  const security = headerTail.match(/\bSECURITY (DEFINER|INVOKER)\b/g) ?? [];
  if (security.length !== 1) {
    throw new ExpectationDerivationError(`${name}: header has ${security.length} SECURITY clauses`);
  }
  if (
    !headerTail.includes(HEADER_SET_CLAUSES) ||
    (headerTail.match(/\bSET\b/g) ?? []).length !== 2 ||
    !/\bRETURNS\b/.test(headerTail) ||
    !/\bLANGUAGE plpgsql\b/.test(headerTail)
  ) {
    throw new ExpectationDerivationError(
      `${name}: header SET / RETURNS / LANGUAGE clauses not as accepted`,
    );
  }
  const parsedArgs = items.map((raw) => {
    const a = normalizeSpace(raw);
    const m = /^([a-z_][a-z0-9_]*) (.+)$/.exec(a);
    if (!m || /^(IN|OUT|INOUT|VARIADIC)$/i.test(m[1]!) || /\bDEFAULT\b|=/i.test(m[2]!)) {
      throw new ExpectationDerivationError(
        `${name}: argument ${JSON.stringify(a)} has a mode or default`,
      );
    }
    return { name: m[1]!, type: m[2]! };
  });
  // prosrc = the exact text between the opening `$fn$` (exclusive) and the matching closing `$fn$`.
  const bodyStart = asAt + '\nAS $fn$'.length;
  const bodyEnd = text.indexOf('$fn$', bodyStart);
  if (bodyEnd === -1 || text.slice(bodyEnd) !== '$fn$;' || text[bodyEnd - 1] !== '\n') {
    throw new ExpectationDerivationError(`${name}: body is not closed by a final "$fn$;" line`);
  }
  return {
    name,
    argNames: parsedArgs.map((a) => a.name),
    args: parsedArgs.map((a) => a.type),
    definer: security[0] === 'SECURITY DEFINER',
    body: text.slice(bodyStart, bodyEnd),
  };
}

const LOOP_ROW =
  /^\s*\('(m7_[a-z0-9_]+)',\s*ARRAY\[([^\]]*)\],\s*(true|false),\s*(true|false)\),?\s*$/;
const LOOP_FORMAT = /EXECUTE pg_catalog\.format\('(CREATE TRIGGER [^']*)',\s*([^;]*?)\);/g;

interface LoopRow {
  readonly table: string;
  readonly paths: readonly string[];
  readonly purgeable: boolean;
  readonly forbidUpdate: boolean;
}

function quoteIdent(name: string): string {
  if (!/^[a-z_][a-z0-9_]*$/.test(name))
    throw new ExpectationDerivationError(`identifier ${name} needs quoting`);
  return name;
}

function quoteLiteral(text: string): string {
  if (text.includes('\\'))
    throw new ExpectationDerivationError(`literal ${text} contains a backslash`);
  return `'${text.replace(/'/g, "''")}'`;
}

/** Evaluates one argument expression of a §19.10.1 `format(...)` call for one loop row. */
function loopArg(expr: string, row: LoopRow): string {
  const e = normalizeSpace(expr);
  let m: RegExpExecArray | null;
  if (e === 'r.tbl') return row.table;
  if ((m = /^r\.tbl \|\| '([a-z_]+)'$/.exec(e))) return row.table + m[1]!;
  if (e === 'v_args') return row.paths.map(quoteLiteral).join(', ');
  if ((m = /^'([A-Z_]+)'$/.exec(e))) return m[1]!;
  if ((m = /^CASE WHEN r\.purgeable THEN '([A-Z_]+)' ELSE '([A-Z_]+)' END$/.exec(e))) {
    return row.purgeable ? m[1]! : m[2]!;
  }
  throw new ExpectationDerivationError(`unreadable loop format argument ${JSON.stringify(e)}`);
}

/** pg_catalog.format() over %I / %s / %L, exactly as the loop executes it. */
function renderFormat(fmt: string, args: readonly string[]): string {
  let i = 0;
  const out = fmt.replace(/%([IsL])/g, (_, k: string) => {
    const v = args[i++];
    if (v === undefined) throw new ExpectationDerivationError(`format ${fmt}: too few arguments`);
    return k === 'I' ? quoteIdent(v) : k === 'L' ? quoteLiteral(v) : v;
  });
  if (i !== args.length)
    throw new ExpectationDerivationError(`format ${fmt}: ${args.length - i} unused argument(s)`);
  return out;
}

/** §19.10.1: rows of the generic-guard loop and its trigger templates, applied mechanically. */
function loopTriggers(
  statement: string,
  fragment: string,
): {
  tables: string[];
  triggers: { relation: string; name: string; statement: string }[];
} {
  const lines = statement.split('\n');
  const start = lines.findIndex((l) => /FOR r IN SELECT \* FROM \(VALUES\s*$/.test(l));
  const end = lines.findIndex((l) => /^\s*\) AS t\(([^)]*)\)\s*$/.test(l));
  if (start < 0 || end <= start)
    throw new ExpectationDerivationError(`${fragment}: loop VALUES not found`);
  const columns = /\) AS t\(([^)]*)\)/
    .exec(lines[end]!)![1]!
    .split(',')
    .map((c) => c.trim());
  if (JSON.stringify(columns) !== JSON.stringify(['tbl', 'paths', 'purgeable', 'forbid_update'])) {
    throw new ExpectationDerivationError(`${fragment}: loop column list ${columns.join(',')}`);
  }
  const rows: LoopRow[] = lines.slice(start + 1, end).map((l) => {
    const m = LOOP_ROW.exec(l);
    if (!m)
      throw new ExpectationDerivationError(
        `${fragment}: unparseable loop row ${JSON.stringify(l)}`,
      );
    const paths = [...m[2]!.matchAll(/'([A-Z0-9_]+)'/g)].map((p) => p[1]!);
    return { table: m[1]!, paths, purgeable: m[3] === 'true', forbidUpdate: m[4] === 'true' };
  });
  const body = lines.slice(end + 1).join('\n');
  const guardOpen = body.indexOf('IF r.forbid_update THEN');
  const guardClose = guardOpen === -1 ? -1 : body.indexOf('END IF;', guardOpen);
  const templates = [...body.matchAll(LOOP_FORMAT)].map((m) => {
    const { items } = splitParenthesised(`(${m[2]!})`);
    const nameArg = normalizeSpace(items[0] ?? '');
    const suffix = /^r\.tbl \|\| '([a-z_]+)'$/.exec(nameArg)?.[1];
    if (!suffix || normalizeSpace(items[1] ?? '') !== 'r.tbl') {
      throw new ExpectationDerivationError(
        `${fragment}: loop template not named r.tbl || '<suffix>' ON r.tbl`,
      );
    }
    return {
      format: m[1]!,
      args: items,
      suffix,
      guarded: guardOpen !== -1 && m.index > guardOpen && m.index < guardClose,
    };
  });
  if ((body.match(/format\('CREATE TRIGGER /g) ?? []).length !== templates.length) {
    throw new ExpectationDerivationError(
      `${fragment}: a loop CREATE TRIGGER template is unreadable`,
    );
  }
  const triggers: { relation: string; name: string; statement: string }[] = [];
  for (const row of rows) {
    for (const t of templates) {
      if (t.guarded && !row.forbidUpdate) continue;
      triggers.push({
        relation: row.table,
        name: row.table + t.suffix,
        statement: renderFormat(
          t.format,
          t.args.map((a) => loopArg(a, row)),
        ),
      });
    }
  }
  return { tables: rows.map((r) => r.table), triggers };
}

const NAMED_CONSTRAINT =
  /\bCONSTRAINT\s+([a-z0-9_]+)\s+(PRIMARY\s+KEY|UNIQUE|FOREIGN\s+KEY|CHECK)\b/g;

function constraintsOf(
  code: string,
  text: string,
): { name: string; cls: ConstraintClass; references?: string }[] {
  const out: { name: string; cls: ConstraintClass; references?: string }[] = [];
  for (const m of code.matchAll(NAMED_CONSTRAINT)) {
    const cls = normalizeSpace(m[2]!) as ConstraintClass;
    let references: string | undefined;
    if (cls === 'FOREIGN KEY') {
      const tail = text.slice(m.index + m[0].length);
      const r = /^\s*\([^)]*\)\s*REFERENCES\s+([a-z0-9_]+\.[a-z0-9_]+)/.exec(tail);
      if (!r) throw new ExpectationDerivationError(`FK ${m[1]} has no readable REFERENCES target`);
      references = r[1]!;
    }
    out.push(references ? { name: m[1]!, cls, references } : { name: m[1]!, cls });
  }
  return out;
}

/** Every constraint keyword must belong to a named CONSTRAINT clause (no auto-named constraint). */
function assertNoUnnamedConstraints(code: string, relation: string): void {
  const named = [...code.matchAll(NAMED_CONSTRAINT)].map((m) => normalizeSpace(m[2]!));
  const count = (re: RegExp) => (code.match(re) ?? []).length;
  const pairs: [string, number][] = [
    ['PRIMARY KEY', count(/\bPRIMARY\s+KEY\b/g)],
    ['UNIQUE', count(/\bUNIQUE\b/g)],
    ['FOREIGN KEY', count(/\bFOREIGN\s+KEY\b/g)],
    ['CHECK', count(/\bCHECK\b/g)],
  ];
  for (const [cls, n] of pairs) {
    if (named.filter((c) => c === cls).length !== n) {
      throw new ExpectationDerivationError(
        `${relation}: ${cls} occurs outside a named CONSTRAINT clause`,
      );
    }
  }
  if (count(/\bREFERENCES\b/g) !== named.filter((c) => c === 'FOREIGN KEY').length) {
    throw new ExpectationDerivationError(
      `${relation}: REFERENCES occurs outside a named FOREIGN KEY`,
    );
  }
}

function roleTableCells(v11Text: string): Map<string, string[]> {
  const rows = tableRowIds(
    sectionLines(parseMarkdown(v11Text), '### 18.2 ', 3),
    /pagamenos_m7_[a-z_]+/,
  );
  return new Map(rows.map((r) => [r.id, r.cells]));
}

/** S3: the `rolinherit` the pinned provisioning template gives `pagamenos_m7_owner`. */
export function ownerRolinheritFromTemplate(template: string, owner: string): boolean {
  const code = template.replace(/--[^\n]*/g, '');
  const m = new RegExp(`CREATE\\s+ROLE\\s+${owner}\\s+([^;]*);`).exec(code);
  if (!m) throw new ExpectationDerivationError(`S3: template does not create ${owner}`);
  const tokens = m[1]!.split(/\s+/).map((t) => t.toUpperCase());
  const inherit = tokens.includes('INHERIT');
  const noinherit = tokens.includes('NOINHERIT');
  if (inherit && noinherit)
    throw new ExpectationDerivationError(`S3: ${owner} both INHERIT and NOINHERIT`);
  // PostgreSQL default for CREATE ROLE is INHERIT.
  return !noinherit;
}

/** S3: the migration role name as bound in the pinned provisioning module bytes. */
export function migrationRoleFromProvisionModule(text: string): string {
  const m = /^export const HARNESS_MIGRATION_ROLE = '([a-z_][a-z0-9_]{0,62})';$/m.exec(text);
  if (!m)
    throw new ExpectationDerivationError('S3: HARNESS_MIGRATION_ROLE not found in provision.ts');
  return m[1]!;
}

export function deriveCatalog(sources: S03Sources): DerivedCatalog {
  const v11 = sources.s1.find((s) => s.path === M7_V1_1.path);
  if (!v11) throw new ExpectationDerivationError('S1: V1.1 bytes absent');

  const enumTypes = new Set<string>();
  const tables = new Set<string>();
  const relations: DerivedRelation[] = [];
  const objects: DerivedObject[] = [];
  const tableDdl = new Map<string, string>();
  const parsedFunctions: (ParsedFunction & { fragment: string; statement: string })[] = [];
  let loop: ReturnType<typeof loopTriggers> | undefined;
  let grantMapping: Record<string, string> | undefined;
  let grantFilter: string | undefined;

  const visit = (f: FragmentSource): void => {
    for (const st of splitStatements(f.sql)) {
      const code = normalizeSpace(st.code);
      let m: RegExpExecArray | null;
      if ((m = /^CREATE TYPE m7\."([A-Za-z0-9]+)" AS ENUM/.exec(code))) {
        enumTypes.add(m[1]!);
      } else if ((m = /^CREATE TABLE m7\.([a-z0-9_]+) \(/.exec(code))) {
        const rel = m[1]!;
        tables.add(rel);
        tableDdl.set(rel, st.text);
        relations.push({ name: rel, kind: 'r', fragment: f.id });
        assertNoUnnamedConstraints(st.code, rel);
        for (const c of constraintsOf(st.code, st.text)) {
          objects.push({
            relation: rel,
            kind: 'CONSTRAINT',
            name: c.name,
            unique: null,
            fragment: f.id,
            detail: c.cls,
            ...(c.references ? { references: c.references } : {}),
          });
        }
      } else if ((m = /^ALTER TABLE m7\.([a-z0-9_]+) ADD CONSTRAINT /.exec(code))) {
        const rel = m[1]!;
        const found = constraintsOf(st.code, st.text);
        if (found.length !== 1)
          throw new ExpectationDerivationError(`${f.id}: ALTER TABLE ${rel} unreadable`);
        const c = found[0]!;
        objects.push({
          relation: rel,
          kind: 'CONSTRAINT',
          name: c.name,
          unique: null,
          fragment: f.id,
          detail: c.cls,
          ...(c.references ? { references: c.references } : {}),
          statement: st.text,
        });
      } else if ((m = /^CREATE VIEW m7\.([a-z0-9_]+) AS /.exec(code))) {
        relations.push({ name: m[1]!, kind: 'v', fragment: f.id });
      } else if ((m = /^CREATE (UNIQUE )?INDEX ([a-z0-9_]+) ON m7\.([a-z0-9_]+)\b/.exec(code))) {
        objects.push({
          relation: m[3]!,
          kind: 'INDEX',
          name: m[2]!,
          unique: m[1] !== undefined,
          fragment: f.id,
          detail: 'index',
          statement: st.text,
        });
      } else if (
        (m = /^CREATE TRIGGER ([a-z0-9_]+) (?:BEFORE|AFTER) .*? ON m7\.([a-z0-9_]+) /.exec(code))
      ) {
        objects.push({
          relation: m[2]!,
          kind: 'TRIGGER',
          name: m[1]!,
          unique: null,
          fragment: f.id,
          detail: 'explicit',
          statement: st.text,
        });
      } else if (/^DO \$triggers\$/.test(code)) {
        if (loop) throw new ExpectationDerivationError('two §19.10.1 trigger loops');
        loop = loopTriggers(st.text, f.id);
        for (const t of loop.triggers) {
          objects.push({ ...t, kind: 'TRIGGER', unique: null, fragment: f.id, detail: 'loop' });
        }
      } else if (/^CREATE FUNCTION m7\./.test(code)) {
        parsedFunctions.push({
          ...parseFunction(st.text, f.id),
          fragment: f.id,
          statement: st.text,
        });
      } else if (/^DO \$grants\$/.test(code)) {
        grantMapping = {};
        for (const g of st.code.matchAll(/WHEN '([a-z])_' THEN '([a-z0-9_]+)'/g)) {
          grantMapping[g[1]!] = g[2]!;
        }
        grantFilter = /p\.proname ~ '\^\[([a-z]+)\]_'/.exec(st.code)?.[1];
      } else if (/^CREATE /.test(code) && !/^CREATE SCHEMA m7 /.test(code)) {
        throw new ExpectationDerivationError(
          `${f.id} line ${st.line}: unclassified CREATE statement`,
        );
      }
    }
  };
  for (const f of sources.fragments) visit(f);

  if (!loop) throw new ExpectationDerivationError('§19.10.1 trigger loop not found');
  if (!grantMapping || !grantFilter)
    throw new ExpectationDerivationError('F26 grant mapping not found');
  if ([...grantFilter].sort().join('') !== Object.keys(grantMapping).sort().join('')) {
    throw new ExpectationDerivationError('F26 grant filter and CASE mapping disagree');
  }
  // The loop list is the table list (§19.14.1: TABLES == LOOP ROWS).
  if ([...loop.tables].sort().join() !== [...tables].sort().join()) {
    throw new ExpectationDerivationError('§19.10.1 loop rows ≠ CREATE TABLE set');
  }

  const functions: DerivedFunction[] = parsedFunctions.map((p) => {
    const argTypes = p.args.map((a) => renderArgType(a, enumTypes, tables));
    return {
      name: p.name,
      prefix: p.name.slice(0, 1),
      signature: `m7.${p.name}(${argTypes.join(',')})`,
      argNames: p.argNames,
      declaredTypes: p.args.map((a) => normalizeSpace(a)),
      argTypes,
      definer: p.definer,
      sourceSha256: sha256Prefixed(p.body),
      body: p.body,
      statement: p.statement,
      fragment: p.fragment,
    };
  });
  if (new Set(functions.map((f) => f.signature)).size !== functions.length) {
    throw new ExpectationDerivationError('duplicate function signature');
  }

  // Roles (S1 §18.2, via the S02 role derivation, which cross-checks §18.4 IA-02 / IA-03).
  const roleExp = deriveM7RoleExpectationsFromText(v11.text);
  const cells = roleTableCells(v11.text);
  const migrationRole = migrationRoleFromProvisionModule(sources.provisionModule.text);
  const ownerRolinherit = ownerRolinheritFromTemplate(
    sources.rolesTemplate.text,
    roleExp.owner.name,
  );
  const roles: DerivedRole[] = roleExp.all.map((r) => {
    if (r.kind === 'owner') {
      return { name: r.name, canLogin: false, inherits: ownerRolinherit, schemaUsage: false };
    }
    if (r.attributes.rolcanlogin !== true || r.attributes.rolinherit !== false) {
      throw new ExpectationDerivationError(`${r.name}: §18.2 login attributes not as required`);
    }
    if (cells.get(r.name)?.[3] !== '`m7`') {
      throw new ExpectationDerivationError(`${r.name}: §18.2 Schema USAGE cell is not \`m7\``);
    }
    return { name: r.name, canLogin: true, inherits: false, schemaUsage: true };
  });
  const loginRoles = roleExp.login.map((r) => r.name);

  // Grant mapping: six prefixes onto the six login roles, bijectively, cross-checked with §18.2 EXECUTE.
  const mappedRoles = Object.values(grantMapping);
  if (
    new Set(mappedRoles).size !== 6 ||
    [...mappedRoles].sort().join() !== [...loginRoles].sort().join()
  ) {
    throw new ExpectationDerivationError(
      'F26 grant mapping is not a bijection onto the §18.2 login roles',
    );
  }
  for (const [prefix, role] of Object.entries(grantMapping)) {
    const cell = cells.get(role)?.[5] ?? '';
    const named = [...cell.matchAll(/`m7\.([a-z]_[a-z0-9_]+)`/g)].map((m) => m[1]!);
    const derived = functions.filter((f) => f.prefix === prefix).map((f) => f.name);
    const listed = named.length > 0 && named.every((n) => n.startsWith(`${prefix}_`));
    const ok = listed
      ? [...named].sort().join() === [...derived].sort().join()
      : cell.includes(`every \`m7.${prefix}_*\` function`);
    if (!ok)
      throw new ExpectationDerivationError(
        `§18.2 EXECUTE column of ${role} ≠ derived ${prefix}_* set`,
      );
  }
  const grants = functions
    .filter((f) => grantMapping![f.prefix] !== undefined)
    .map((f) => ({ signature: f.signature, role: grantMapping![f.prefix]! }));

  return {
    relations,
    objects,
    functions,
    grants,
    roles,
    members: [{ role: roleExp.owner.name, member: migrationRole }],
    loopTables: loop.tables,
    grantMapping,
    ownerRole: roleExp.owner.name,
    loginRoles,
    migrationRole,
    ownerRolinherit,
    tableDdl,
  };
}

export function payloadOf(catalog: DerivedCatalog, manifestVersion: string): ExpectationPayload {
  return {
    manifestVersion,
    p_relation_names: catalog.relations.map((r) => r.name),
    p_relation_kinds: catalog.relations.map((r) => r.kind),
    p_object_relations: catalog.objects.map((o) => o.relation),
    p_object_kinds: catalog.objects.map((o) => o.kind),
    p_object_names: catalog.objects.map((o) => o.name),
    p_object_unique: catalog.objects.map((o) => o.unique),
    p_function_signatures: catalog.functions.map((f) => f.signature),
    p_function_definer: catalog.functions.map((f) => f.definer),
    p_function_proconfig: catalog.functions.map(() => EXPECTED_PROCONFIG),
    p_function_source_sha256: catalog.functions.map((f) => f.sourceSha256),
    p_grant_signatures: catalog.grants.map((g) => g.signature),
    p_grant_roles: catalog.grants.map((g) => g.role),
    p_role_names: catalog.roles.map((r) => r.name),
    p_role_can_login: catalog.roles.map((r) => r.canLogin),
    p_role_inherits: catalog.roles.map((r) => r.inherits),
    p_role_schema_usage: catalog.roles.map((r) => r.schemaUsage),
    p_member_roles: catalog.members.map((m) => m.role),
    p_member_names: catalog.members.map((m) => m.member),
  };
}

// ---------------------------------------------------------------------------------------------------
// VBA-EX-2 / work-package §12: the pre-execution inventory self-check
// ---------------------------------------------------------------------------------------------------

/** The accepted §19.14 counts as corrected by Erratum 03 (VBA-01 §9.2; work-package §12). */
export const ACCEPTED_S03_INVENTORY = {
  relations: 43,
  tables: 39,
  views: 4,
  triggers: 183,
  triggersLoop: 148,
  triggersExplicit: 35,
  constraints: 346,
  primaryKeys: 39,
  uniqueConstraints: 57,
  foreignKeys: 92,
  checkConstraints: 158,
  indexes: 28,
  indexesUnique: 8,
  indexesNonUnique: 20,
  functions: 110,
  functionsDefiner: 45,
  functionsInvoker: 65,
  functionsByPrefix: { c: 9, s: 2, r: 1, p: 6, a: 1, w: 25, x: 1, i: 32, t: 33 },
  executeGrants: 36,
  roles: 7,
  ownerMemberships: 1,
} as const;

export interface InventoryCheck {
  readonly name: string;
  readonly expected: unknown;
  readonly observed: unknown;
  readonly pass: boolean;
}

export function inventorySelfCheck(p: ExpectationPayload, c: DerivedCatalog): InventoryCheck[] {
  const A = ACCEPTED_S03_INVENTORY;
  const objs = (kind: string, detail?: string) =>
    c.objects.filter((o) => o.kind === kind && (detail === undefined || o.detail === detail))
      .length;
  const byPrefix: Record<string, number> = {};
  for (const k of Object.keys(A.functionsByPrefix)) {
    byPrefix[k] = c.functions.filter((f) => f.prefix === k).length;
  }
  const rows: [string, unknown, unknown][] = [
    ['relations', A.relations, p.p_relation_names.length],
    ['relations.tables', A.tables, p.p_relation_kinds.filter((k) => k === 'r').length],
    ['relations.views', A.views, p.p_relation_kinds.filter((k) => k === 'v').length],
    ['triggers', A.triggers, objs('TRIGGER')],
    ['triggers.loop', A.triggersLoop, objs('TRIGGER', 'loop')],
    ['triggers.explicit', A.triggersExplicit, objs('TRIGGER', 'explicit')],
    ['constraints', A.constraints, objs('CONSTRAINT')],
    ['constraints.primaryKey', A.primaryKeys, objs('CONSTRAINT', 'PRIMARY KEY')],
    ['constraints.unique', A.uniqueConstraints, objs('CONSTRAINT', 'UNIQUE')],
    ['constraints.foreignKey', A.foreignKeys, objs('CONSTRAINT', 'FOREIGN KEY')],
    ['constraints.check', A.checkConstraints, objs('CONSTRAINT', 'CHECK')],
    ['indexes', A.indexes, objs('INDEX')],
    ['indexes.unique', A.indexesUnique, p.p_object_unique.filter((u) => u === true).length],
    ['indexes.nonUnique', A.indexesNonUnique, p.p_object_unique.filter((u) => u === false).length],
    ['functions', A.functions, p.p_function_signatures.length],
    ['functions.definer', A.functionsDefiner, p.p_function_definer.filter((d) => d).length],
    ['functions.invoker', A.functionsInvoker, p.p_function_definer.filter((d) => !d).length],
    ['functions.byPrefix', A.functionsByPrefix, byPrefix],
    ['executeGrants', A.executeGrants, p.p_grant_signatures.length],
    ['roles', A.roles, p.p_role_names.length],
    ['ownerMemberships', A.ownerMemberships, p.p_member_roles.length],
  ];
  return rows.map(([name, expected, observed]) => ({
    name,
    expected,
    observed,
    pass: JSON.stringify(expected) === JSON.stringify(observed),
  }));
}

export class InventoryReproductionError extends Error {
  constructor(readonly failures: readonly InventoryCheck[]) {
    super(
      'STOP — S03 EXPECTATION DERIVATION DOES NOT REPRODUCE ACCEPTED INVENTORY: ' +
        failures
          .map((f) => `${f.name} ${JSON.stringify(f.observed)} ≠ ${JSON.stringify(f.expected)}`)
          .join('; '),
    );
    this.name = 'InventoryReproductionError';
  }
}

/** Derives E and refuses (before any connection) unless it reproduces the accepted inventory. */
export function deriveExpectations(sources: S03Sources, manifestVersion: string): Derivation {
  const catalog = deriveCatalog(sources);
  const payload = payloadOf(catalog, manifestVersion);
  const inventory = inventorySelfCheck(payload, catalog);
  const failures = inventory.filter((c) => !c.pass);
  if (failures.length > 0) throw new InventoryReproductionError(failures);
  return { payload, catalog, inventory };
}

// ---------------------------------------------------------------------------------------------------
// E03-08 T-05: Ref(T), the M7 tables referencing T through a §19.4–§19.9 FOREIGN KEY, transitively.
// ---------------------------------------------------------------------------------------------------

/** Ref(T) for every table (self-references are not edges); a pre-execution derived expectation. */
export function referencingClosure(catalog: DerivedCatalog): Map<string, string[]> {
  const referencedBy = new Map<string, Set<string>>();
  for (const o of catalog.objects) {
    if (o.detail !== 'FOREIGN KEY' || !o.references?.startsWith('m7.')) continue;
    const target = o.references.slice(3);
    if (target === o.relation) continue;
    if (!referencedBy.has(target)) referencedBy.set(target, new Set());
    referencedBy.get(target)!.add(o.relation);
  }
  const out = new Map<string, string[]>();
  for (const t of catalog.loopTables) {
    const seen = new Set<string>();
    const stack = [...(referencedBy.get(t) ?? [])];
    while (stack.length > 0) {
      const u = stack.pop()!;
      if (u === t || seen.has(u)) continue;
      seen.add(u);
      stack.push(...(referencedBy.get(u) ?? []));
    }
    out.set(t, [...seen].sort());
  }
  return out;
}

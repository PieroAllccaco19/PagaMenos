// M7 V1.1 — S01: mechanical inventory reconciliation.
//
// Every observed value is produced by running a derivation rule over the accepted bytes: the DDL rules
// are those of V1.1 §19.14.1 (scope §19.2–§19.13, the §19.14 table itself excluded), the identifier
// registers are the data rows of the tables that define them. The accepted values below are authority
// constants (V1.1 §19.14, §19.14.1; Erratum 01 §10.1). A mismatch is never "fixed" here: it is reported
// as a SPEC-DEFECT and generation refuses.
import type { FragmentSelection } from './fragments';
import {
  type MarkdownStructure,
  SourceStructureError,
  parseMarkdown,
  sectionLines,
  tableRowIds,
  uniqueHeadingByPrefix,
} from './source';

export const ACCEPTED_INVENTORY = {
  tables: 39,
  tablesBySection: { '19.4': 7, '19.5': 6, '19.6': 2, '19.7': 3, '19.8': 12, '19.9': 9 },
  schemas: 1,
  enums: 31,
  views: 4,
  functions: 110,
  functionsByPrefix: { c: 9, s: 2, r: 1, p: 6, a: 1, w: 25, x: 1, i: 32, t: 33 },
  functionsDefiner: 45,
  functionsInvoker: 65,
  primaryKeys: 39,
  uniqueConstraints: 57,
  foreignKeys: 92,
  foreignKeysInline: 90,
  foreignKeysAlterTable: 2,
  checkConstraints: 158,
  indexes: 28,
  indexesNonUnique: 20,
  indexesUnique: 8,
  triggersExplicit: 35,
  triggersExplicitBeforeUpdate: 8,
  triggersExplicitBeforeInsert: 24,
  triggersExplicitAfter: 3,
  triggersLoopRows: 39,
  triggersLoopForbidUpdateRows: 31,
  triggersLoop: 148,
  triggersTotal: 183,
  writePaths: 15,
  roles: 7,
  loginRoles: 6,
  databaseCredentialEnvKeys: 6,
  sqlStates: { prefix: 'M7', first: 1, last: 14, pad: 3 },
  verificationCases: 209,
  invariants: { prefix: 'M7-I', first: 1, last: 129, pad: 2 },
  implementationPrerequisites: { prefix: 'IMP-', first: 1, last: 22, pad: 2 },
  manifestGates: { prefix: 'MA-', first: 1, last: 18, pad: 0 },
  residuals: { prefix: 'M7-R-', first: 1, last: 17, pad: 2 },
  races: { prefix: 'RC-', first: 1, last: 29, pad: 2 },
  crashBoundaries: { prefix: 'CB-', first: 1, last: 24, pad: 2 },
  retirementRetry: { prefix: 'RR-', first: 1, last: 7, pad: 0 },
  transactionOwners: { prefix: 'TO-', first: 1, last: 8, pad: 0 },
} as const;

export interface IdRange {
  readonly prefix: string;
  readonly first: number;
  readonly last: number;
  readonly pad: number;
}

export function expandRange(range: IdRange): string[] {
  const out: string[] = [];
  for (let n = range.first; n <= range.last; n += 1) {
    out.push(`${range.prefix}${String(n).padStart(range.pad, '0')}`);
  }
  return out;
}

export class SpecDefectError extends Error {
  readonly failures: readonly ReconciliationCheck[];
  constructor(failures: readonly ReconciliationCheck[]) {
    super(
      `BLOCKED — SPEC-DEFECT: ${failures.length} inventory reconciliation check(s) failed:\n` +
        failures
          .map(
            (f) =>
              `  ${f.name} [${f.source}]: observed ${JSON.stringify(f.observed)} ≠ expected ${JSON.stringify(f.expected)}`,
          )
          .join('\n'),
    );
    this.name = 'SpecDefectError';
    this.failures = failures;
  }
}

export interface ReconciliationCheck {
  readonly name: string;
  readonly source: string;
  readonly observed: unknown;
  readonly expected: unknown;
  readonly pass: boolean;
}

interface Line {
  readonly line: number;
  readonly text: string;
}

function linesMatching(lines: readonly Line[], re: RegExp): Line[] {
  return lines.filter((l) => re.test(l.text));
}

function occurrences(
  lines: readonly Line[],
  re: RegExp,
): { line: number; match: RegExpExecArray }[] {
  const global = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
  const out: { line: number; match: RegExpExecArray }[] = [];
  for (const l of lines) {
    for (const m of l.text.matchAll(global))
      out.push({ line: l.line, match: m as RegExpExecArray });
  }
  return out;
}

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

/** The §19.2–§19.13 DDL scope of §19.14.1: from `### 19.2` up to, excluding, `### 19.14`. */
function ddlScope(structure: MarkdownStructure): Line[] {
  const start = uniqueHeadingByPrefix(structure, '### 19.2 ');
  const end = uniqueHeadingByPrefix(structure, '### 19.14 ');
  const out: Line[] = [];
  for (let l = start.line; l < end.line; l += 1)
    out.push({ line: l, text: structure.lines[l - 1]! });
  return out;
}

function fragmentLines(selection: FragmentSelection): Line[] {
  const out: Line[] = [];
  for (const f of selection.fragments) {
    f.sql
      .slice(0, -1)
      .split('\n')
      .forEach((text, i) => out.push({ line: f.bodyFirstLine + i, text }));
  }
  return out;
}

interface FunctionHeader {
  readonly name: string;
  readonly prefix: string;
  readonly security: 'DEFINER' | 'INVOKER';
  readonly line: number;
}

function functionHeaders(lines: readonly Line[]): FunctionHeader[] {
  const out: FunctionHeader[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const m = /^CREATE FUNCTION m7\.(([a-z])_[a-z0-9_]+)\(/.exec(lines[i]!.text);
    if (!m) continue;
    const found: string[] = [];
    let j = i;
    for (; j < lines.length && !/^AS \$/.test(lines[j]!.text); j += 1) {
      for (const s of lines[j]!.text.matchAll(/SECURITY (DEFINER|INVOKER)/g)) found.push(s[1]!);
    }
    if (j === lines.length) {
      throw new SourceStructureError(`function ${m[1]} at line ${lines[i]!.line} has no AS $ body`);
    }
    if (found.length !== 1) {
      throw new SourceStructureError(
        `function ${m[1]} at line ${lines[i]!.line} header has ${found.length} SECURITY clauses`,
      );
    }
    out.push({
      name: m[1]!,
      prefix: m[2]!,
      security: found[0] as 'DEFINER' | 'INVOKER',
      line: lines[i]!.line,
    });
  }
  return out;
}

interface LoopRow {
  readonly table: string;
  readonly forbidUpdate: boolean;
  readonly line: number;
}

/** Parses the §19.10.1 generic-guard `VALUES` list and the column that decides the UPDATE guard. */
function loopRows(selection: FragmentSelection): {
  rows: LoopRow[];
  loopCreateTriggerStatements: number;
  guardedByForbidUpdate: number;
} {
  const fragment = selection.fragments.find((f) => f.anchor.clause === '19.10.1');
  if (!fragment) throw new SourceStructureError('§19.10.1 fragment not selected');
  const lines = fragment.sql.slice(0, -1).split('\n');
  const start = lines.findIndex((l) => /FOR r IN SELECT \* FROM \(VALUES\s*$/.test(l));
  const end = lines.findIndex((l) => /^\s*\) AS t\(([^)]*)\)\s*$/.test(l));
  if (start < 0 || end < 0 || end <= start) {
    throw new SourceStructureError('§19.10.1: VALUES list or column list not found');
  }
  const columns = /\) AS t\(([^)]*)\)/
    .exec(lines[end]!)![1]!
    .split(',')
    .map((c) => c.trim());
  const forbidIndex = columns.indexOf('forbid_update');
  if (columns.length !== 4 || columns[0] !== 'tbl' || forbidIndex < 2) {
    throw new SourceStructureError(`§19.10.1: unexpected column list ${columns.join(', ')}`);
  }
  const rows: LoopRow[] = [];
  for (let i = start + 1; i < end; i += 1) {
    const m =
      /^\s*\('(m7_[a-z0-9_]+)',\s*ARRAY\[[^\]]*\],\s*(true|false),\s*(true|false)\),?\s*$/.exec(
        lines[i]!,
      );
    if (!m)
      throw new SourceStructureError(
        `§19.10.1: unparseable VALUES row ${JSON.stringify(lines[i])}`,
      );
    const flags = [m[2], m[3]];
    rows.push({
      table: m[1]!,
      forbidUpdate: flags[forbidIndex - 2] === 'true',
      line: fragment.bodyFirstLine + i,
    });
  }
  const block = lines.slice(end + 1);
  const blockEnd = block.findIndex((l) => /^\$triggers\$;$/.test(l));
  const loopBody = block.slice(0, blockEnd).join('\n');
  const loopCreateTriggerStatements = (loopBody.match(/format\('CREATE TRIGGER /g) ?? []).length;
  const guarded =
    /IF r\.forbid_update THEN\s*\n\s*EXECUTE pg_catalog\.format\('CREATE TRIGGER [^\n]*\n[^\n]*\n\s*END IF;/g;
  const guardedByForbidUpdate = (loopBody.match(guarded) ?? []).length;
  return { rows, loopCreateTriggerStatements, guardedByForbidUpdate };
}

export interface IdFamily {
  readonly source: string;
  readonly rows: number;
  readonly distinct: number;
  readonly ids: readonly string[];
  readonly missing: readonly string[];
  readonly unexpected: readonly string[];
  readonly duplicates: readonly string[];
}

function idFamily(source: string, ids: readonly string[], range?: IdRange): IdFamily {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) duplicates.push(id);
    seen.add(id);
  }
  const expected = range ? expandRange(range) : [];
  return {
    source,
    rows: ids.length,
    distinct: seen.size,
    ids: [...ids],
    missing: range ? expected.filter((id) => !seen.has(id)) : [],
    unexpected: range ? [...seen].filter((id) => !expected.includes(id)) : [],
    duplicates: sortedUnique(duplicates),
  };
}

export interface Inventory {
  readonly scope: {
    readonly ddlFirstLine: number;
    readonly ddlLastLine: number;
    readonly rule: string;
  };
  readonly ddl: {
    readonly tables: number;
    readonly tablesBySection: Record<string, number>;
    readonly tableNames: readonly string[];
    readonly schemas: number;
    readonly enums: number;
    readonly views: number;
    readonly viewNames: readonly string[];
    readonly functions: number;
    readonly functionsByPrefix: Record<string, number>;
    readonly functionsDefiner: number;
    readonly functionsInvoker: number;
    readonly functionsWithPrefixSecurityMismatch: readonly string[];
    readonly primaryKeys: number;
    readonly uniqueConstraints: number;
    readonly foreignKeys: number;
    readonly foreignKeysInline: number;
    readonly foreignKeysAlterTable: number;
    readonly checkConstraints: number;
    readonly indexes: number;
    readonly indexesNonUnique: number;
    readonly indexesUnique: number;
    readonly triggersExplicit: number;
    readonly triggersExplicitBeforeUpdate: number;
    readonly triggersExplicitBeforeInsert: number;
    readonly triggersExplicitAfter: number;
    readonly triggersLoopRows: number;
    readonly triggersLoopTables: readonly string[];
    readonly triggersLoopWithoutForbidUpdateTables: readonly string[];
    readonly triggersExplicitBeforeUpdateTables: readonly string[];
    readonly triggersLoopForbidUpdateRows: number;
    readonly triggersLoopStatementsPerRow: number;
    readonly triggersLoopStatementsGuardedByForbidUpdate: number;
    readonly triggersLoop: number;
    readonly triggersTotal: number;
    readonly writePaths: readonly string[];
    /** Counts of the same DDL rules run over the 26 extracted fragments only (must equal the scope). */
    readonly fragmentScopeAgreement: Record<string, { scope: number; fragments: number }>;
  };
  readonly sqlStates: IdFamily;
  readonly roles: { readonly all: readonly string[]; readonly login: readonly string[] };
  readonly databaseCredentialEnvKeys: readonly string[];
  readonly verificationCases: IdFamily;
  readonly invariants: IdFamily;
  readonly implementationPrerequisites: IdFamily;
  readonly manifestGates: IdFamily;
  readonly residuals: IdFamily;
  readonly races: IdFamily;
  readonly crashBoundaries: IdFamily;
  readonly retirementRetry: IdFamily;
  readonly transactionOwners: { readonly s16_2_3: IdFamily; readonly s18_6: IdFamily };
}

interface DdlCounts {
  tables: number;
  schemas: number;
  enums: number;
  views: number;
  functions: number;
  primaryKeys: number;
  uniqueConstraints: number;
  foreignKeys: number;
  checkConstraints: number;
  indexes: number;
  triggersExplicit: number;
}

function ddlCounts(lines: readonly Line[]): DdlCounts {
  return {
    tables: linesMatching(lines, /^CREATE TABLE m7\./).length,
    schemas: linesMatching(lines, /^CREATE SCHEMA/).length,
    enums: linesMatching(lines, /^CREATE TYPE m7\./).length,
    views: linesMatching(lines, /^CREATE VIEW m7\./).length,
    functions: linesMatching(lines, /^CREATE FUNCTION m7\./).length,
    primaryKeys: occurrences(lines, /CONSTRAINT \S+_pkey PRIMARY KEY/).length,
    uniqueConstraints: occurrences(lines, /CONSTRAINT \S+ UNIQUE(?![A-Za-z0-9_])/).length,
    foreignKeys: new Set(occurrences(lines, /CONSTRAINT (\S+_fkey)(?!\S)/).map((o) => o.match[1]))
      .size,
    checkConstraints: occurrences(lines, /CONSTRAINT \S+_ck CHECK/).length,
    indexes: linesMatching(lines, /^CREATE (UNIQUE )?INDEX/).length,
    triggersExplicit: linesMatching(lines, /^CREATE TRIGGER/).length,
  };
}

/** Derives the inventory from identity-verified V1.1 text and its fragment selection. */
export function deriveInventory(v11Text: string, selection: FragmentSelection): Inventory {
  const structure = parseMarkdown(v11Text);
  const scope = ddlScope(structure);
  const frag = fragmentLines(selection);

  const tablesBySection: Record<string, number> = {};
  for (const clause of ['19.4', '19.5', '19.6', '19.7', '19.8', '19.9']) {
    tablesBySection[clause] = linesMatching(
      sectionLines(structure, `### ${clause} `, 3),
      /^CREATE TABLE m7\./,
    ).length;
  }
  const tableNames = linesMatching(scope, /^CREATE TABLE m7\./).map(
    (l) => /^CREATE TABLE m7\.([a-z0-9_]+)/.exec(l.text)![1]!,
  );

  const headers = functionHeaders(scope);
  const functionsByPrefix: Record<string, number> = {};
  for (const p of ['c', 's', 'r', 'p', 'a', 'w', 'x', 'i', 't']) {
    functionsByPrefix[p] = headers.filter((h) => h.prefix === p).length;
  }
  const definerPrefixes = new Set(['c', 's', 'r', 'p', 'a', 'w', 'x']);
  const functionsWithPrefixSecurityMismatch = headers
    .filter((h) => definerPrefixes.has(h.prefix) !== (h.security === 'DEFINER'))
    .map((h) => h.name);
  const unknownPrefix = headers.filter((h) => !(h.prefix in functionsByPrefix));
  if (unknownPrefix.length > 0) {
    throw new SourceStructureError(
      `functions with unknown prefix: ${unknownPrefix.map((h) => h.name)}`,
    );
  }

  const fkOccurrences = occurrences(scope, /CONSTRAINT (\S+_fkey)(?!\S)/);
  const fkAlter = new Set(
    fkOccurrences
      .filter((o) => /^ALTER TABLE m7\./.test(structure.lines[o.line - 1]!))
      .map((o) => o.match[1]),
  );
  const fkAll = new Set(fkOccurrences.map((o) => o.match[1]));

  const explicitTriggers = linesMatching(scope, /^CREATE TRIGGER/);
  const loop = loopRows(selection);
  const loopForbid = loop.rows.filter((r) => r.forbidUpdate).length;
  const unconditional = loop.loopCreateTriggerStatements - loop.guardedByForbidUpdate;
  const triggersLoop = loop.rows.length * unconditional + loopForbid * loop.guardedByForbidUpdate;

  const writePaths = sortedUnique(
    occurrences(scope, /set_config\('pagamenos\.m7\.write_path',\s*'([^']+)'/).map(
      (o) => o.match[1]!,
    ),
  );

  const scopeCounts = ddlCounts(scope);
  const fragmentCounts = ddlCounts(frag);
  const fragmentScopeAgreement: Record<string, { scope: number; fragments: number }> = {};
  for (const key of Object.keys(scopeCounts) as (keyof DdlCounts)[]) {
    fragmentScopeAgreement[key] = { scope: scopeCounts[key], fragments: fragmentCounts[key] };
  }

  const s19110 = sectionLines(structure, '#### 19.11.0 ', 4);
  const sqlStateRows = tableRowIds(s19110, /M7\d{3}/).map((r) => r.id);
  const sqlStateText = sortedUnique(s19110.flatMap((l) => l.text.match(/M7\d{3}/g) ?? []));
  if (!sameList(sortedUnique(sqlStateRows), sqlStateText)) {
    throw new SourceStructureError('§19.11.0: SQLSTATE rows and SQLSTATE mentions disagree');
  }

  const roleRows = tableRowIds(sectionLines(structure, '### 18.2 ', 3), /pagamenos_m7_[a-z_]+/);
  const credentialKeys: string[] = [];
  for (const l of sectionLines(structure, '### 18.3 ', 4)) {
    if (!l.text.startsWith('|')) continue;
    const first = l.text.split('|')[1] ?? '';
    const m = /`(M7_[A-Z_]+_DATABASE_URL)`/.exec(first);
    if (m) credentialKeys.push(m[1]!);
  }

  const tIds = tableRowIds(sectionLines(structure, '## 25. ', 2), /T-\d{2,3}[a-z]?/).map(
    (r) => r.id,
  );
  // Rows are kept in source order so a T-ID that begins more than one row stays visible; the accepted
  // rule counts DISTINCT identifiers.
  const tFamily = idFamily('V1.1 §25 (data rows beginning with a T-ID)', tIds);

  const rows = (prefix: string, level: number, id: RegExp): string[] =>
    tableRowIds(sectionLines(structure, prefix, level), id).map((r) => r.id);

  return {
    scope: {
      ddlFirstLine: scope[0]!.line,
      ddlLastLine: scope[scope.length - 1]!.line,
      rule: 'V1.1 §19.14.1: DDL rules run over §19.2–§19.13 (from "### 19.2" up to, excluding, "### 19.14")',
    },
    ddl: {
      tables: scopeCounts.tables,
      tablesBySection,
      tableNames,
      schemas: scopeCounts.schemas,
      enums: scopeCounts.enums,
      views: scopeCounts.views,
      viewNames: linesMatching(scope, /^CREATE VIEW m7\./).map(
        (l) => /^CREATE VIEW m7\.([a-z0-9_]+)/.exec(l.text)![1]!,
      ),
      functions: scopeCounts.functions,
      functionsByPrefix,
      functionsDefiner: headers.filter((h) => h.security === 'DEFINER').length,
      functionsInvoker: headers.filter((h) => h.security === 'INVOKER').length,
      functionsWithPrefixSecurityMismatch,
      primaryKeys: scopeCounts.primaryKeys,
      uniqueConstraints: scopeCounts.uniqueConstraints,
      foreignKeys: fkAll.size,
      foreignKeysInline: [...fkAll].filter((n) => !fkAlter.has(n)).length,
      foreignKeysAlterTable: fkAlter.size,
      checkConstraints: scopeCounts.checkConstraints,
      indexes: scopeCounts.indexes,
      indexesNonUnique: linesMatching(scope, /^CREATE INDEX/).length,
      indexesUnique: linesMatching(scope, /^CREATE UNIQUE INDEX/).length,
      triggersExplicit: explicitTriggers.length,
      triggersExplicitBeforeUpdate: explicitTriggers.filter((l) => / BEFORE UPDATE /.test(l.text))
        .length,
      triggersExplicitBeforeInsert: explicitTriggers.filter((l) => / BEFORE INSERT /.test(l.text))
        .length,
      triggersExplicitAfter: explicitTriggers.filter((l) => / AFTER /.test(l.text)).length,
      triggersLoopRows: loop.rows.length,
      triggersLoopTables: loop.rows.map((r) => r.table),
      triggersLoopWithoutForbidUpdateTables: loop.rows
        .filter((r) => !r.forbidUpdate)
        .map((r) => r.table),
      triggersExplicitBeforeUpdateTables: explicitTriggers
        .filter((l) => / BEFORE UPDATE /.test(l.text))
        .map((l) => / BEFORE UPDATE ON m7\.([a-z0-9_]+)/.exec(l.text)?.[1] ?? `?line ${l.line}`),
      triggersLoopForbidUpdateRows: loopForbid,
      triggersLoopStatementsPerRow: unconditional,
      triggersLoopStatementsGuardedByForbidUpdate: loop.guardedByForbidUpdate,
      triggersLoop,
      triggersTotal: triggersLoop + explicitTriggers.length,
      writePaths,
      fragmentScopeAgreement,
    },
    sqlStates: idFamily('V1.1 §19.11.0 table', sqlStateRows, ACCEPTED_INVENTORY.sqlStates),
    roles: {
      all: roleRows.map((r) => r.id),
      login: roleRows.filter((r) => /\bYES\b/.test(r.cells[1] ?? '')).map((r) => r.id),
    },
    databaseCredentialEnvKeys: credentialKeys,
    verificationCases: tFamily,
    invariants: idFamily(
      'V1.1 §26 table',
      rows('## 26. ', 3, /M7-I\d{2,3}/),
      ACCEPTED_INVENTORY.invariants,
    ),
    implementationPrerequisites: idFamily(
      'V1.1 §28.1 table',
      rows('### 28.1 ', 3, /IMP-\d{2}/),
      ACCEPTED_INVENTORY.implementationPrerequisites,
    ),
    manifestGates: idFamily(
      'V1.1 §24.2 table',
      rows('### 24.2 ', 3, /MA-\d{1,2}/),
      ACCEPTED_INVENTORY.manifestGates,
    ),
    residuals: idFamily(
      'V1.1 §28.3 table',
      rows('### 28.3 ', 3, /M7-R-\d{2}/),
      ACCEPTED_INVENTORY.residuals,
    ),
    races: idFamily('V1.1 §16.3 table', rows('### 16.3 ', 4, /RC-\d{2}/), ACCEPTED_INVENTORY.races),
    crashBoundaries: idFamily(
      'V1.1 §17.3 table',
      rows('### 17.3 ', 3, /CB-\d{2}/),
      ACCEPTED_INVENTORY.crashBoundaries,
    ),
    retirementRetry: idFamily(
      'V1.1 §11.10.8 table',
      rows('#### 11.10.8 ', 4, /RR-\d/),
      ACCEPTED_INVENTORY.retirementRetry,
    ),
    transactionOwners: {
      s16_2_3: idFamily(
        'V1.1 §16.2.3 table',
        rows('#### 16.2.3 ', 4, /TO-\d/),
        ACCEPTED_INVENTORY.transactionOwners,
      ),
      s18_6: idFamily(
        'V1.1 §18.6 table',
        rows('### 18.6 ', 3, /TO-\d/),
        ACCEPTED_INVENTORY.transactionOwners,
      ),
    },
  };
}

function check(
  name: string,
  source: string,
  observed: unknown,
  expected: unknown,
): ReconciliationCheck {
  return {
    name,
    source,
    observed,
    expected,
    pass: JSON.stringify(observed) === JSON.stringify(expected),
  };
}

function familyChecks(name: string, family: IdFamily, range: IdRange): ReconciliationCheck[] {
  const count = range.last - range.first + 1;
  return [
    check(`${name}.rows`, family.source, family.rows, count),
    check(`${name}.set`, family.source, [...family.ids].sort(), expandRange(range).sort()),
    check(`${name}.duplicates`, family.source, family.duplicates, []),
  ];
}

/** Every reconciliation check S01 runs; generation refuses unless all pass. */
export function reconcileInventory(inv: Inventory): ReconciliationCheck[] {
  const A = ACCEPTED_INVENTORY;
  const d = inv.ddl;
  const r1914 = 'V1.1 §19.14 / §19.14.1';
  const sectionSum = Object.values(d.tablesBySection).reduce((a, b) => a + b, 0);
  const prefixSum = Object.values(d.functionsByPrefix).reduce((a, b) => a + b, 0);
  const checks: ReconciliationCheck[] = [
    check('tables', r1914, d.tables, A.tables),
    check('tables.bySection', r1914, d.tablesBySection, A.tablesBySection),
    check('tables.sectionSum', r1914, sectionSum, A.tables),
    check('schemas', r1914, d.schemas, A.schemas),
    check('enums', r1914, d.enums, A.enums),
    check('views', r1914, d.views, A.views),
    check('functions', r1914, d.functions, A.functions),
    check('functions.byPrefix', r1914, d.functionsByPrefix, A.functionsByPrefix),
    check('functions.prefixSum', r1914, prefixSum, A.functions),
    check('functions.definer', r1914, d.functionsDefiner, A.functionsDefiner),
    check('functions.invoker', r1914, d.functionsInvoker, A.functionsInvoker),
    check(
      'functions.definerPlusInvoker',
      r1914,
      d.functionsDefiner + d.functionsInvoker,
      A.functions,
    ),
    check(
      'functions.prefixSecurityMismatch',
      'V1.1 §18.5 SD-10, §19.14.1',
      d.functionsWithPrefixSecurityMismatch,
      [],
    ),
    check('primaryKeys', r1914, d.primaryKeys, A.primaryKeys),
    check('uniqueConstraints', r1914, d.uniqueConstraints, A.uniqueConstraints),
    check('foreignKeys', r1914, d.foreignKeys, A.foreignKeys),
    check('foreignKeys.inline', r1914, d.foreignKeysInline, A.foreignKeysInline),
    check('foreignKeys.alterTable', r1914, d.foreignKeysAlterTable, A.foreignKeysAlterTable),
    check('checkConstraints', r1914, d.checkConstraints, A.checkConstraints),
    check('indexes', r1914, d.indexes, A.indexes),
    check('indexes.nonUnique', r1914, d.indexesNonUnique, A.indexesNonUnique),
    check('indexes.unique', r1914, d.indexesUnique, A.indexesUnique),
    check('triggers.explicit', r1914, d.triggersExplicit, A.triggersExplicit),
    check(
      'triggers.explicit.beforeUpdate',
      r1914,
      d.triggersExplicitBeforeUpdate,
      A.triggersExplicitBeforeUpdate,
    ),
    check(
      'triggers.explicit.beforeInsert',
      r1914,
      d.triggersExplicitBeforeInsert,
      A.triggersExplicitBeforeInsert,
    ),
    check('triggers.explicit.after', r1914, d.triggersExplicitAfter, A.triggersExplicitAfter),
    check('triggers.loop.rows', r1914, d.triggersLoopRows, A.triggersLoopRows),
    check(
      'triggers.loop.forbidUpdateRows',
      r1914,
      d.triggersLoopForbidUpdateRows,
      A.triggersLoopForbidUpdateRows,
    ),
    check('triggers.loop.statementsPerRow', 'V1.1 §19.10.1', d.triggersLoopStatementsPerRow, 3),
    check(
      'triggers.loop.guardedStatements',
      'V1.1 §19.10.1',
      d.triggersLoopStatementsGuardedByForbidUpdate,
      1,
    ),
    check('triggers.loop', r1914, d.triggersLoop, A.triggersLoop),
    check('triggers.total', r1914, d.triggersTotal, A.triggersTotal),
    check(
      'triggers.loop.tablesEqualCreateTable',
      'V1.1 §19.14.1 (TABLES == LOOP ROWS)',
      [...d.triggersLoopTables].sort(),
      [...d.tableNames].sort(),
    ),
    check(
      'triggers.specificUpdateGuardsEqualNonForbidRows',
      'V1.1 §19.10.1 ("tables whose forbid_update = false above")',
      [...d.triggersExplicitBeforeUpdateTables].sort(),
      [...d.triggersLoopWithoutForbidUpdateTables].sort(),
    ),
    check('primaryKeys.equalTables', 'V1.1 §19.14.1 equality line 1', d.primaryKeys, d.tables),
    check('writePaths', r1914, d.writePaths.length, A.writePaths),
    check('roles', 'V1.1 §18.2', inv.roles.all.length, A.roles),
    check('roles.login', 'V1.1 §18.2', inv.roles.login.length, A.loginRoles),
    check(
      'databaseCredentialEnvKeys',
      'V1.1 §18.3',
      sortedUnique(inv.databaseCredentialEnvKeys).length,
      A.databaseCredentialEnvKeys,
    ),
    check(
      'verificationCases.distinct',
      'V1.1 §19.14.1 / §25',
      inv.verificationCases.distinct,
      A.verificationCases,
    ),
    // Observed, not repaired: T-118 is stated in full in §25.15 and cross-referenced by a second row in
    // §25.19 ("see §25.15 (family N), where it is stated in full"). One case, two rows.
    check(
      'verificationCases.idsBeginningMoreThanOneRow',
      'V1.1 §25.15 row T-118 and its §25.19 cross-reference row',
      inv.verificationCases.duplicates,
      ['T-118'],
    ),
    ...familyChecks('sqlStates', inv.sqlStates, A.sqlStates),
    ...familyChecks('invariants', inv.invariants, A.invariants),
    ...familyChecks(
      'implementationPrerequisites',
      inv.implementationPrerequisites,
      A.implementationPrerequisites,
    ),
    ...familyChecks('manifestGates', inv.manifestGates, A.manifestGates),
    ...familyChecks('residuals', inv.residuals, A.residuals),
    ...familyChecks('races', inv.races, A.races),
    ...familyChecks('crashBoundaries', inv.crashBoundaries, A.crashBoundaries),
    ...familyChecks('retirementRetry', inv.retirementRetry, A.retirementRetry),
    ...familyChecks('transactionOwners.16.2.3', inv.transactionOwners.s16_2_3, A.transactionOwners),
    ...familyChecks('transactionOwners.18.6', inv.transactionOwners.s18_6, A.transactionOwners),
  ];
  for (const [key, v] of Object.entries(d.fragmentScopeAgreement)) {
    checks.push(
      check(
        `fragmentScopeAgreement.${key}`,
        'S01: no DDL object outside the 26 fences',
        v.fragments,
        v.scope,
      ),
    );
  }
  return checks;
}

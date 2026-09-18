// M7 V1.1 — S01: the Erratum 04 occurrence-scoped SQL invocation-syntax corrections (E04-01 … E04-06).
//
// Accepted Erratum 04 corrects exactly six SQL occurrences (Erratum 04 §6.3, §7), all in fragment F12, all
// in `m7.c_load_catalog_expectations_v1`: each schema-qualified multi-array `pg_catalog.unnest(a₁, …, aₖ)`
// FROM item becomes `ROWS FROM (pg_catalog.unnest(a₁), …, pg_catalog.unnest(aₖ))`. Each "After" statement
// replaces exactly its quoted "Before" statement at exactly the named V1.1 lines; no line is added, removed
// or reordered (Erratum 04 §4 item 2). Every block is READ from the identity-verified Erratum 04 bytes (§7
// Before/After fences, statement and line SHA-256 tables, §6 census, §7.7 and §11 pin tables) and
// cross-checked against the V1.1 bytes, the Erratum 02 / Erratum 03 occurrences, a mechanical `unnest`
// census of the effective fragments and the authority constants below. No SQL text is written here by
// hand, and no broader rewrite than the six accepted occurrences is derived. Any disagreement refuses
// generation (Erratum 04 §4 item 8).
import type { Erratum02Correction } from './erratum-02-corrections';
import {
  type E03EffectiveFragment,
  type E03EffectiveSelection,
  type Erratum03Correction,
  countBlockOccurrences,
} from './erratum-03-corrections';
import {
  type MarkdownStructure,
  countOccurrences,
  parseMarkdown,
  sectionLines,
  sha256Hex,
  tableRowIds,
} from './source';

/** Authority constants: the six occurrences as enumerated by Erratum 04 §6.3 and §7.7. */
export const ACCEPTED_ERRATUM_04_OCCURRENCES: readonly {
  readonly id: string;
  readonly fragment: string;
  readonly firstLine: number;
  readonly lastLine: number;
  readonly changedLines: readonly number[];
  readonly arrays: number;
  readonly targetTable: string;
}[] = [
  {
    id: 'E04-01',
    fragment: 'F12',
    firstLine: 6298,
    lastLine: 6299,
    changedLines: [6299],
    arrays: 2,
    targetTable: 'm7.m7_expected_relation',
  },
  {
    id: 'E04-02',
    fragment: 'F12',
    firstLine: 6301,
    lastLine: 6303,
    changedLines: [6303],
    arrays: 4,
    targetTable: 'm7.m7_expected_relation_object',
  },
  {
    id: 'E04-03',
    fragment: 'F12',
    firstLine: 6304,
    lastLine: 6307,
    changedLines: [6306, 6307],
    arrays: 4,
    targetTable: 'm7.m7_expected_function',
  },
  {
    id: 'E04-04',
    fragment: 'F12',
    firstLine: 6308,
    lastLine: 6309,
    changedLines: [6309],
    arrays: 2,
    targetTable: 'm7.m7_expected_function_grant',
  },
  {
    id: 'E04-05',
    fragment: 'F12',
    firstLine: 6310,
    lastLine: 6312,
    changedLines: [6312],
    arrays: 4,
    targetTable: 'm7.m7_expected_role',
  },
  {
    id: 'E04-06',
    fragment: 'F12',
    firstLine: 6313,
    lastLine: 6314,
    changedLines: [6314],
    arrays: 2,
    targetTable: 'm7.m7_expected_role_member',
  },
];

/** Erratum 04 §6.3 / §11 item 3. */
export const ERRATUM_04_AFFECTED_FRAGMENTS = ['F12'] as const;

/** Erratum 04 §2.2 / §6.3: the only function whose text changes. */
export const ERRATUM_04_ENCLOSING_FUNCTION = 'm7.c_load_catalog_expectations_v1';

/**
 * Erratum 04 §6.3: the single-array qualified `unnest` calls, valid and unaffected (fragment, fragment line
 * of the effective fragment, V1.1 line). The four F12 calls MUST remain unchanged.
 */
export const ERRATUM_04_PRESERVED_SINGLE_ARRAY_CALLS: readonly {
  readonly fragment: string;
  readonly fragmentLine: number;
  readonly specLine: number;
}[] = [
  { fragment: 'F10', fragmentLine: 49, specLine: 5092 },
  { fragment: 'F11', fragmentLine: 404, specLine: 5613 },
  { fragment: 'F12', fragmentLine: 286, specLine: 6106 },
  { fragment: 'F12', fragmentLine: 294, specLine: 6114 },
  { fragment: 'F12', fragmentLine: 308, specLine: 6128 },
  { fragment: 'F12', fragmentLine: 326, specLine: 6146 },
];

/** Effective F12 identity before (V1.1 + E01 + E02 + E03) and after Erratum 04 (§7.7, §11 item 3). */
export const ERRATUM_04_F12_PINS = {
  before: {
    sha256: '572a9cf7182772f01b263ec367f993522c39e81e27edc74e59ea1ba65b6dd5a9',
    bytes: 34_526,
    lines: 498,
  },
  after: {
    sha256: 'c154aee0e1d441d405f5a0e7c25d883aa643b40fc0458a99061d9f9145c147da',
    bytes: 34_819,
    lines: 498,
  },
} as const;

export class Erratum04DefectError extends Error {
  constructor(message: string) {
    super(`M7-S01 ERRATUM 04: ${message}`);
    this.name = 'Erratum04DefectError';
  }
}

export interface E04Evidence {
  readonly check: string;
  readonly observed: unknown;
  readonly expected: unknown;
  readonly pass: boolean;
}

function ev(check: string, observed: unknown, expected: unknown): E04Evidence {
  return { check, observed, expected, pass: JSON.stringify(observed) === JSON.stringify(expected) };
}

function utf8Length(text: string): number {
  return new TextEncoder().encode(text).byteLength;
}

function splitLines(sql: string): string[] {
  return sql.slice(0, -1).split('\n');
}

function normalizeSpace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function range(first: number, last: number): string {
  return first === last ? `${first}` : `${first}–${last}`;
}

// ---------------------------------------------------------------------------------------------------------
// Lexical `unnest` census (Erratum 04 §6.1).
// ---------------------------------------------------------------------------------------------------------

/**
 * `sql` with `--` comments, block comments and single-quoted literals blanked to spaces (newlines and
 * offsets preserved). Double-quoted identifiers and dollar-quoted bodies are kept and scanned.
 */
export function maskSql(sql: string): string {
  const out = sql.split('');
  let i = 0;
  const blank = (from: number, to: number): void => {
    for (let k = from; k < to; k += 1) if (out[k] !== '\n') out[k] = ' ';
  };
  while (i < sql.length) {
    const c = sql[i]!;
    if (c === '-' && sql[i + 1] === '-') {
      const end = sql.indexOf('\n', i);
      const stop = end === -1 ? sql.length : end;
      blank(i, stop);
      i = stop;
    } else if (c === '/' && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2);
      if (end === -1) throw new Erratum04DefectError('unterminated block comment in fragment');
      blank(i, end + 2);
      i = end + 2;
    } else if (c === "'") {
      let j = i + 1;
      for (;;) {
        if (j >= sql.length) throw new Erratum04DefectError('unterminated string literal');
        if (sql[j] === "'" && sql[j + 1] === "'") j += 2;
        else if (sql[j] === "'") break;
        else j += 1;
      }
      blank(i, j + 1);
      i = j + 1;
    } else if (c === '"') {
      const end = sql.indexOf('"', i + 1);
      if (end === -1) throw new Erratum04DefectError('unterminated quoted identifier');
      i = end + 1;
    } else {
      i += 1;
    }
  }
  return out.join('');
}

export interface UnnestCall {
  /** Schema qualifier as written, or `null` for an unqualified call. */
  readonly schema: string | null;
  /** 1-based first and last line of the call within the fragment. */
  readonly line: number;
  readonly endLine: number;
  /** Exact call bytes, from the qualifier (or name) through the closing parenthesis. */
  readonly text: string;
  /** Whitespace-normalised call. */
  readonly normalized: string;
  /** Top-level arguments, whitespace-normalised, in order. */
  readonly args: readonly string[];
}

export interface UnnestCensus {
  readonly calls: readonly UnnestCall[];
  readonly rawUnnestTokens: number;
  readonly maskedUnnestTokens: number;
  readonly rowsFrom: number;
  /** 1-based lines of each `ROWS FROM` token. */
  readonly rowsFromLines: readonly number[];
}

function lineAt(text: string, offset: number): number {
  let n = 1;
  for (let i = 0; i < offset; i += 1) if (text.charCodeAt(i) === 10) n += 1;
  return n;
}

/** Every `unnest(` call of the fragment (qualified by any schema, or unqualified), in source order. */
export function censusUnnest(sql: string): UnnestCensus {
  const masked = maskSql(sql);
  const calls: UnnestCall[] = [];
  for (const m of masked.matchAll(/(?<![A-Za-z0-9_$"])unnest\s*\(/gi)) {
    // Walk back over optional whitespace, a `.` and a schema identifier (plain or double-quoted).
    let start = m.index;
    let schema: string | null = null;
    let k = start - 1;
    while (k >= 0 && /\s/.test(masked[k]!)) k -= 1;
    if (k >= 0 && masked[k] === '.') {
      k -= 1;
      while (k >= 0 && /\s/.test(masked[k]!)) k -= 1;
      const end = k + 1;
      if (masked[k] === '"') {
        k = masked.lastIndexOf('"', k - 1) - 1;
      } else {
        while (k >= 0 && /[A-Za-z0-9_$]/.test(masked[k]!)) k -= 1;
      }
      schema = sql.slice(k + 1, end).replace(/^"|"$/g, '');
      if (schema === '') throw new Erratum04DefectError(`unreadable unnest qualifier at ${start}`);
      start = k + 1;
    }
    const open = m.index + m[0].length - 1;
    let depth = 0;
    let close = -1;
    const commas: number[] = [];
    for (let k = open; k < masked.length; k += 1) {
      const ch = masked[k];
      if (ch === '(') depth += 1;
      else if (ch === ')') {
        depth -= 1;
        if (depth === 0) {
          close = k;
          break;
        }
      } else if (ch === ',' && depth === 1) commas.push(k);
    }
    if (close === -1) throw new Erratum04DefectError(`unbalanced unnest( call at offset ${start}`);
    const bounds = [open, ...commas, close];
    const args = bounds
      .slice(0, -1)
      .map((b, i) => normalizeSpace(sql.slice(b + 1, bounds[i + 1])))
      .filter((a, i, all) => !(all.length === 1 && a === '' && i === 0));
    const text = sql.slice(start, close + 1);
    calls.push({
      schema,
      line: lineAt(sql, start),
      endLine: lineAt(sql, close),
      text,
      normalized: normalizeSpace(text),
      args,
    });
  }
  const rowsFromMatches = [...masked.matchAll(/\bROWS\s+FROM\b/gi)];
  return {
    calls,
    rawUnnestTokens: [...sql.matchAll(/\bunnest\b/gi)].length,
    maskedUnnestTokens: [...masked.matchAll(/\bunnest\b/gi)].length,
    rowsFrom: rowsFromMatches.length,
    rowsFromLines: rowsFromMatches.map((m) => lineAt(sql, m.index)),
  };
}

function isQualifiedMultiArray(c: UnnestCall): boolean {
  return c.schema !== null && c.args.length >= 2;
}

function isPgCatalogSingleArray(c: UnnestCall): boolean {
  return c.schema === 'pg_catalog' && c.args.length === 1;
}

/** The enclosing `CREATE FUNCTION <name>` or `DO $tag$` of fragment line `line`. */
export function enclosingObject(sql: string, line: number): string | null {
  const lines = splitLines(sql);
  for (let l = line; l >= 1; l -= 1) {
    const text = lines[l - 1] ?? '';
    const fn = /^CREATE (?:OR REPLACE )?FUNCTION ([A-Za-z0-9_."]+)\s*\(/.exec(text);
    if (fn) return fn[1]!;
    const block = /^DO (\$[A-Za-z0-9_]*\$)/.exec(text);
    if (block) return `DO ${block[1]}`;
  }
  return null;
}

// ---------------------------------------------------------------------------------------------------------
// Reading the accepted Erratum 04 document.
// ---------------------------------------------------------------------------------------------------------

function tableCells(text: string): string[] {
  return text
    .slice(1, text.endsWith('|') ? -1 : undefined)
    .split(/(?<!\\)\|/)
    .map((c) => c.trim());
}

function code(cell: string): string {
  return cell.replace(/`/g, '').trim();
}

function num(cell: string): number {
  return Number(cell.replace(/[ ,]/g, ''));
}

interface CensusRow {
  readonly line: number;
  readonly fragmentClause: string;
  readonly fragmentLine: string;
  readonly specLine: string;
  readonly enclosing: string;
  readonly args: number;
  readonly call: string;
  readonly classification: string;
}

function readCensusTable(e04: MarkdownStructure): CensusRow[] {
  return tableRowIds(sectionLines(e04, '### 6.3 ', 3), /\d+/).map((r) => {
    if (r.cells.length !== 8) {
      throw new Erratum04DefectError(`§6.3 row ${r.id}: ${r.cells.length} cells, expected 8`);
    }
    return {
      line: r.line,
      fragmentClause: r.cells[1]!,
      fragmentLine: r.cells[2]!,
      specLine: r.cells[3]!,
      enclosing: r.cells[4]!,
      args: Number(r.cells[5]),
      call: code(r.cells[6]!),
      classification: r.cells[7]!,
    };
  });
}

interface OccurrenceSection {
  readonly headingLine: number;
  readonly heading: string;
  readonly items: ReadonlyMap<string, string>;
  readonly before: readonly string[];
  readonly after: readonly string[];
  readonly labels: readonly string[];
}

const BEFORE_LABEL = 'Before (complete statement):';
const AFTER_LABEL = 'After (complete statement):';

function readOccurrenceSection(e04: MarkdownStructure, n: number, id: string): OccurrenceSection {
  const prefix = `### 7.${n} \`${id}\` — `;
  const section = sectionLines(e04, prefix, 3);
  const first = section[0]!.line;
  const last = section[section.length - 1]!.line;
  const items = new Map<string, string>();
  for (const { text } of section) {
    if (!text.startsWith('| ')) continue;
    const cells = tableCells(text);
    if (cells.length !== 2 || cells[0] === 'Item' || /^:?-+/.test(cells[0]!)) continue;
    if (items.has(cells[0]!)) {
      throw new Erratum04DefectError(`§7.${n}: duplicate item ${JSON.stringify(cells[0])}`);
    }
    items.set(cells[0]!, cells[1]!);
  }
  const fences = e04.fences.filter((f) => f.openLine > first && f.closeLine <= last);
  if (fences.length !== 2 || fences.some((f) => f.info !== 'sql')) {
    throw new Erratum04DefectError(`§7.${n}: expected exactly two sql fences (Before, After)`);
  }
  const labelOf = (openLine: number): string => {
    for (let l = openLine - 1; l > first; l -= 1) {
      const t = e04.lines[l - 1]!;
      if (t !== '') return t;
    }
    return '';
  };
  return {
    headingLine: first,
    heading: section[0]!.text,
    items,
    before: fences[0]!.body,
    after: fences[1]!.body,
    labels: [labelOf(fences[0]!.openLine), labelOf(fences[1]!.openLine)],
  };
}

function parseLineSpec(value: string): { first: number; last: number; changed: number[] } | null {
  const m = /^(\d+)(?:–(\d+))? \(changed: ([\d, ]+)\)$/.exec(value);
  if (!m) return null;
  return {
    first: Number(m[1]),
    last: Number(m[2] ?? m[1]),
    changed: m[3]!.split(',').map((x) => Number(x.trim())),
  };
}

function parseStatementSha(value: string | undefined): { sha256: string; bytes: number } | null {
  const m = /^`([0-9a-f]{64})` \((\d+) bytes\)$/.exec(value ?? '');
  return m ? { sha256: m[1]!, bytes: Number(m[2]) } : null;
}

function parseLineSha(
  value: string | undefined,
): { before: string; after: string; delta: number } | null {
  const m = /^`([0-9a-f]{64})` → `([0-9a-f]{64})` \(([+\-−])(\d+) bytes\)$/.exec(value ?? '');
  return m ? { before: m[1]!, after: m[2]!, delta: (m[3] === '+' ? 1 : -1) * Number(m[4]) } : null;
}

function parseDelta(value: string | undefined): number {
  const m = /^([+\-−])(\d+)$/.exec(value ?? '');
  return m ? (m[1] === '+' ? 1 : -1) * Number(m[2]) : Number.NaN;
}

export interface Erratum04LineChange {
  readonly specLine: number;
  readonly fragmentLine: number;
  readonly beforeLine: string;
  readonly afterLine: string;
  readonly beforeLineSha256: string;
  readonly afterLineSha256: string;
  readonly byteDelta: number;
}

export interface Erratum04Correction {
  readonly id: string;
  readonly fragment: string;
  readonly clause: string;
  readonly enclosingFunction: string;
  readonly targetTable: string;
  readonly arrays: number;
  readonly firstLine: number;
  readonly lastLine: number;
  /** 1-based lines of the quoted statement inside the (effective) fragment. */
  readonly fragmentFirstLine: number;
  readonly fragmentLastLine: number;
  readonly beforeBlock: readonly string[];
  readonly afterBlock: readonly string[];
  /** The defective FROM-item call, exact bytes, and its arguments in order. */
  readonly beforeCall: string;
  readonly arguments: readonly string[];
  /** The corrected FROM item, whitespace-normalised. */
  readonly afterFromItem: string;
  readonly beforeStatementSha256: string;
  readonly afterStatementSha256: string;
  readonly beforeStatementBytes: number;
  readonly afterStatementBytes: number;
  readonly byteDelta: number;
  readonly lineChanges: readonly Erratum04LineChange[];
  readonly evidence: readonly E04Evidence[];
  readonly pass: boolean;
}

export interface Erratum04CensusEntry {
  readonly fragment: string;
  readonly fragmentLine: string;
  readonly specLine: string;
  readonly enclosingObject: string | null;
  readonly args: number;
  readonly call: string;
  readonly classification: string;
}

export interface Erratum04PreservedCall {
  readonly fragment: string;
  readonly fragmentLine: number;
  readonly specLine: number;
  readonly lineText: string;
  readonly call: string;
}

export interface Erratum04Reading {
  readonly corrections: readonly Erratum04Correction[];
  readonly checks: readonly E04Evidence[];
  /** Mechanical census of the Erratum 03-effective fragments (pre-Erratum 04). */
  readonly census: readonly Erratum04CensusEntry[];
  readonly preservedCalls: readonly Erratum04PreservedCall[];
}

function derivedClassification(c: UnnestCall, defectIndex: number): string {
  if (isPgCatalogSingleArray(c)) return 'VALID';
  if (isQualifiedMultiArray(c)) return `**DEFECT \`E04-0${defectIndex}\`**`;
  return 'UNCLASSIFIED';
}

/**
 * Reads the six corrections from identity-verified Erratum 04 text and verifies each against the V1.1
 * bytes, the Erratum 02 / Erratum 03 occurrences, the (Erratum 03-effective) fragment selection and a
 * mechanical census. Pure; never throws for a failed check — callers refuse on any `pass: false`. Throws
 * only on unreadable structure.
 */
export function readErratum04Corrections(
  v11Text: string,
  e04Text: string,
  v11Selection: { readonly fragments: readonly { anchor: { id: string }; sql: string }[] },
  selection: E03EffectiveSelection,
  e02Corrections: readonly Erratum02Correction[],
  e03Corrections: readonly Erratum03Correction[],
): Erratum04Reading {
  const e04 = parseMarkdown(e04Text);
  const v11Lines = v11Text.slice(0, -1).split('\n');
  const ids = ACCEPTED_ERRATUM_04_OCCURRENCES.map((o) => o.id);
  const byId = new Map(selection.fragments.map((f) => [f.anchor.id, f]));
  const insideBody = (line: number): string | null =>
    selection.fragments.find((f) => line >= f.bodyFirstLine && line <= f.bodyLastLine)?.anchor.id ??
    null;

  // --- Mechanical census of the Erratum 03-effective fragments, paired with the V1.1 bodies. ---
  const census: Erratum04CensusEntry[] = [];
  const preservedCalls: Erratum04PreservedCall[] = [];
  const censusChecks: E04Evidence[] = [];
  let defectIndex = 0;
  const totals = {
    qualified: 0,
    single: 0,
    multi: 0,
    f12Qualified: 0,
    otherSchema: 0,
    unqualified: 0,
    rowsFrom: 0,
    multiOutsideF12: 0,
  };
  const tokenMismatch: string[] = [];
  for (const f of selection.fragments) {
    const eff = censusUnnest(f.sql);
    const v11Fragment = v11Selection.fragments.find((x) => x.anchor.id === f.anchor.id);
    const v11 = censusUnnest(v11Fragment?.sql ?? '');
    if (eff.rawUnnestTokens !== eff.maskedUnnestTokens) tokenMismatch.push(f.anchor.id);
    censusChecks.push(
      ev(
        `${f.anchor.id}: unnest calls identical in the V1.1 body and the Erratum 03-effective fragment`,
        eff.calls.map((c) => c.normalized),
        v11.calls.map((c) => c.normalized),
      ),
    );
    totals.rowsFrom += eff.rowsFrom;
    eff.calls.forEach((c, i) => {
      if (c.schema === null) totals.unqualified += 1;
      else if (c.schema !== 'pg_catalog') totals.otherSchema += 1;
      if (c.schema !== null) totals.qualified += 1;
      if (c.schema !== null && f.anchor.id === 'F12') totals.f12Qualified += 1;
      if (isPgCatalogSingleArray(c)) totals.single += 1;
      if (isQualifiedMultiArray(c)) {
        totals.multi += 1;
        defectIndex += 1;
        if (f.anchor.id !== 'F12') totals.multiOutsideF12 += 1;
      }
      const v = v11.calls[i];
      const specFirst = v ? f.bodyFirstLine + v.line - 1 : Number.NaN;
      const specLast = v ? f.bodyFirstLine + v.endLine - 1 : Number.NaN;
      census.push({
        fragment: f.anchor.id,
        fragmentLine: range(c.line, c.endLine),
        specLine: range(specFirst, specLast),
        enclosingObject: enclosingObject(f.sql, c.line),
        args: c.args.length,
        call: c.normalized,
        classification: derivedClassification(c, defectIndex),
      });
      if (isPgCatalogSingleArray(c)) {
        preservedCalls.push({
          fragment: f.anchor.id,
          fragmentLine: c.line,
          specLine: specFirst,
          lineText: splitLines(f.sql)[c.line - 1]!,
          call: c.text,
        });
      }
    });
  }

  const table = readCensusTable(e04);
  const results = tableRowIds(sectionLines(e04, '### 6.2 ', 3), /.+/)
    .filter((r) => r.id !== 'Measure' && !/^:?-+/.test(r.id))
    .map((r) => /\*\*([^*]+)\*\*/.exec(r.cells[1] ?? '')?.[1] ?? '');
  const header = e04.fences[0]?.body ?? [];
  const headerValue = (key: string): string =>
    header.find((l) => l.startsWith(key))?.replace(/^[^:]*:\s*/, '') ?? '';
  const allChanged = ACCEPTED_ERRATUM_04_OCCURRENCES.flatMap((o) => o.changedLines);
  const e04Tokens = [...new Set([...e04Text.matchAll(/\bE04-\d{2}\b/g)].map((m) => m[0]))].sort();

  const checks: E04Evidence[] = [
    ev('census: raw and masked unnest token counts equal in every fragment', tokenMismatch, []),
    ...censusChecks,
    ev(
      '§6.3 census table == mechanical census of the Erratum 03-effective fragments',
      table.map((r) => [
        r.fragmentClause,
        r.fragmentLine,
        r.specLine,
        r.args,
        r.call,
        r.classification,
      ]),
      census.map((c) => [
        `${c.fragment} / §${byId.get(c.fragment)!.anchor.clause}`,
        c.fragmentLine,
        c.specLine,
        c.args,
        c.call,
        c.classification,
      ]),
    ),
    ev(
      '§6.3 enclosing objects == mechanical enclosing object',
      table.map((r) => {
        const named = /`([^`]+)`/.exec(r.enclosing)?.[1] ?? '';
        return named.replace(/\(.*$/, '');
      }),
      census.map((c) => c.enclosingObject),
    ),
    ev('§6.2 census results', results, [
      `${selection.fragments.length} / 26`,
      `${totals.qualified}`,
      `${totals.single}`,
      `${totals.multi}`,
      `${totals.f12Qualified}`,
      `${totals.otherSchema}`,
      `${totals.unqualified}`,
      `${totals.rowsFrom}`,
      `${totals.multiOutsideF12}`,
    ]),
    ev(
      'census: qualified multi-array calls == the six registered occurrences, in order, all in F12',
      census
        .filter((c) => c.classification.startsWith('**DEFECT'))
        .map((c) => [c.fragment, c.specLine]),
      ACCEPTED_ERRATUM_04_OCCURRENCES.map((o) => [
        o.fragment,
        range(o.changedLines[0]!, o.changedLines[o.changedLines.length - 1]!),
      ]),
    ),
    ev(
      'census: preserved single-array calls == registry',
      preservedCalls.map((p) => [p.fragment, p.fragmentLine, p.specLine]),
      ERRATUM_04_PRESERVED_SINGLE_ARRAY_CALLS.map((p) => [p.fragment, p.fragmentLine, p.specLine]),
    ),
    ev(
      'census: no unqualified, other-schema or ROWS FROM form before Erratum 04',
      [totals.unqualified, totals.otherSchema, totals.rowsFrom],
      [0, 0, 0],
    ),
    ev(
      'every E04-nn identifier in the document is a registered occurrence',
      e04Tokens,
      [...ids].sort(),
    ),
    ev(
      'Before / After statement labels in the document',
      [
        e04.lines.filter((l) => l === BEFORE_LABEL).length,
        e04.lines.filter((l) => l === AFTER_LABEL).length,
      ],
      [ids.length, ids.length],
    ),
    ev(
      'header: SQL occurrences corrected',
      headerValue('SQL OCCURRENCES CORRECTED').split(' ')[0],
      `${ids.length}`,
    ),
    ev(
      'header: V1.1 lines superseded; lines added / removed',
      headerValue('V1.1 LINES SUPERSEDED'),
      `${allChanged.length} (${allChanged.join(', ')}); LINES ADDED / REMOVED : 0 / 0`,
    ),
  ];

  // --- The six occurrences. ---
  const summary = tableRowIds(sectionLines(e04, '### 7.7 ', 3), /E04-\d{2}/);
  const corrections = ACCEPTED_ERRATUM_04_OCCURRENCES.map((occ, index): Erratum04Correction => {
    const fragment = byId.get(occ.fragment);
    if (!fragment)
      throw new Erratum04DefectError(`${occ.id}: fragment ${occ.fragment} not selected`);
    const s = readOccurrenceSection(e04, index + 1, occ.id);
    const lineSpec = parseLineSpec(s.items.get('V1.1 statement lines') ?? '');
    const fragSpec = parseLineSpec(s.items.get('F12 fragment lines') ?? '');
    const beforeSha = parseStatementSha(s.items.get('Statement SHA-256 (original)'));
    const afterSha = parseStatementSha(s.items.get('Statement SHA-256 (corrected)'));
    const offset = fragment.bodyFirstLine - 1;
    const fragmentFirstLine = occ.firstLine - offset;
    const fragmentLastLine = occ.lastLine - offset;
    const effLines = splitLines(fragment.sql);
    const n = occ.lastLine - occ.firstLine + 1;

    const beforeStatement = s.before.join('\n');
    const afterStatement = s.after.join('\n');
    const beforeCalls = censusUnnest(`${beforeStatement}\n`).calls;
    const afterCensus = censusUnnest(`${afterStatement}\n`);
    const call = beforeCalls[0];
    const args = call?.args ?? [];
    const expectedFromItem = `ROWS FROM (${args.map((a) => `pg_catalog.unnest(${a})`).join(', ')})`;
    // Byte-exact outside the FROM item: the prefix before the defective call and the suffix after it.
    const callAt = call ? beforeStatement.indexOf(call.text) : -1;
    const prefix = callAt >= 0 ? beforeStatement.slice(0, callAt) : '\0';
    const suffix = call && callAt >= 0 ? beforeStatement.slice(callAt + call.text.length) : '\0';
    const afterMiddle =
      afterStatement.startsWith(prefix) && afterStatement.endsWith(suffix)
        ? afterStatement.slice(prefix.length, afterStatement.length - suffix.length)
        : null;

    const differing: number[] = [];
    for (let i = 0; i < Math.min(s.before.length, s.after.length); i += 1) {
      if (s.before[i] !== s.after[i]) differing.push(occ.firstLine + i);
    }
    const lineChanges = occ.changedLines.map((specLine): Erratum04LineChange => {
      const i = specLine - occ.firstLine;
      const sha = parseLineSha(s.items.get(`Line ${specLine} SHA-256`));
      return {
        specLine,
        fragmentLine: specLine - offset,
        beforeLine: s.before[i] ?? '',
        afterLine: s.after[i] ?? '',
        beforeLineSha256: sha?.before ?? '',
        afterLineSha256: sha?.after ?? '',
        byteDelta: sha?.delta ?? Number.NaN,
      };
    });
    const summaryRow = summary.find((r) => r.id === occ.id);
    const censusRow = census.filter((c) => c.classification === `**DEFECT \`${occ.id}\`**`);
    const e02Lines = e02Corrections.map((c) => c.specLine);
    const lineItems = [...s.items.keys()].filter((k) => /^Line \d+ SHA-256$/.test(k));

    const evidence: E04Evidence[] = [
      ev('§7 heading names the E04 id and fragment', s.items.get('E04 ID'), `\`${occ.id}\``),
      ev(
        '§7 clause == fragment anchor clause',
        s.items.get('V1.1 / effective clause'),
        `§${fragment.anchor.clause} — fragment ${occ.fragment}`,
      ),
      ev('§7 V1.1 statement lines == registry', lineSpec, {
        first: occ.firstLine,
        last: occ.lastLine,
        changed: [...occ.changedLines],
      }),
      ev('§7 F12 fragment lines == V1.1 lines − fragment offset', fragSpec, {
        first: fragmentFirstLine,
        last: fragmentLastLine,
        changed: occ.changedLines.map((l) => l - offset),
      }),
      ev(
        '§7 enclosing function',
        /^`([^(`]+)\(/.exec(s.items.get('Enclosing function') ?? '')?.[1],
        ERRATUM_04_ENCLOSING_FUNCTION,
      ),
      ev('§7 arrays combined == registry', Number(s.items.get('Arrays combined')), occ.arrays),
      ev('Before / After labels', [...s.labels], [BEFORE_LABEL, AFTER_LABEL]),
      ev(
        'statement lies inside the fragment body',
        [insideBody(occ.firstLine), insideBody(occ.lastLine)],
        [occ.fragment, occ.fragment],
      ),
      ev(
        `statement lies inside ${ERRATUM_04_ENCLOSING_FUNCTION}`,
        [
          enclosingObject(fragment.sql, fragmentFirstLine),
          enclosingObject(fragment.sql, fragmentLastLine),
        ],
        [ERRATUM_04_ENCLOSING_FUNCTION, ERRATUM_04_ENCLOSING_FUNCTION],
      ),
      ev(
        'Before statement == V1.1 lines (byte-exact)',
        s.before,
        v11Lines.slice(occ.firstLine - 1, occ.lastLine),
      ),
      ev(
        'Before statement == Erratum 03-effective fragment lines (byte-exact)',
        s.before,
        effLines.slice(fragmentFirstLine - 1, fragmentLastLine),
      ),
      ev(
        'Before statement occurs exactly once in V1.1',
        countBlockOccurrences(v11Text, s.before),
        1,
      ),
      ev(
        'Before statement occurs exactly once in the effective fragments',
        selection.fragments.reduce((k, f) => k + countBlockOccurrences(f.sql, s.before), 0),
        1,
      ),
      ev(
        'Before statement: first line is the INSERT into the registered table',
        s.before[0]?.trim().split(' ').slice(0, 3).join(' '),
        `INSERT INTO ${occ.targetTable}`,
      ),
      ev('Before statement: exactly one unnest call', beforeCalls.length, 1),
      ev(
        'Before call is schema-qualified pg_catalog.unnest with the registered number of arrays',
        [call?.schema, args.length],
        ['pg_catalog', occ.arrays],
      ),
      ev(
        'Before call occurs exactly once in V1.1',
        call ? countOccurrences(v11Text, call.text) : 0,
        1,
      ),
      ev(
        'Before call matches the §6.3 DEFECT row of this id',
        censusRow.map((c) => [c.call, c.args, c.specLine]),
        call
          ? [
              [
                call.normalized,
                args.length,
                range(occ.firstLine + call.line - 1, occ.firstLine + call.endLine - 1),
              ],
            ]
          : [],
      ),
      ev(
        'After == Before outside the FROM item (byte-exact prefix and suffix)',
        afterMiddle !== null,
        true,
      ),
      ev(
        'After FROM item == ROWS FROM of one pg_catalog.unnest per array, same order (whitespace-normalised)',
        afterMiddle === null ? null : normalizeSpace(afterMiddle),
        expectedFromItem,
      ),
      ev(
        'After statement: unnest calls are single-array pg_catalog.unnest over the Before arrays, in order',
        afterCensus.calls.map((c) => [c.schema, c.args]),
        args.map((a) => ['pg_catalog', [a]]),
      ),
      ev('After statement: exactly one ROWS FROM', afterCensus.rowsFrom, 1),
      ev('After line count == Before line count (no line added or removed)', s.after.length, n),
      ev('lines differing == registered changed lines', differing, [...occ.changedLines]),
      ev(
        'line SHA-256 items cover exactly the changed lines',
        lineItems,
        occ.changedLines.map((l) => `Line ${l} SHA-256`),
      ),
      ...lineChanges.flatMap((c) => [
        ev(
          `line ${c.specLine}: Before line SHA-256 reproduces`,
          sha256Hex(c.beforeLine),
          c.beforeLineSha256,
        ),
        ev(
          `line ${c.specLine}: After line SHA-256 reproduces`,
          sha256Hex(c.afterLine),
          c.afterLineSha256,
        ),
        ev(
          `line ${c.specLine}: stated byte delta == len(After) − len(Before)`,
          utf8Length(c.afterLine) - utf8Length(c.beforeLine),
          c.byteDelta,
        ),
        ev(
          `line ${c.specLine}: changed Before line occurs exactly once in V1.1`,
          countBlockOccurrences(v11Text, [c.beforeLine]),
          1,
        ),
      ]),
      ev('statement SHA-256 (original) and bytes reproduce', beforeSha, {
        sha256: sha256Hex(beforeStatement),
        bytes: utf8Length(beforeStatement),
      }),
      ev('statement SHA-256 (corrected) and bytes reproduce', afterSha, {
        sha256: sha256Hex(afterStatement),
        bytes: utf8Length(afterStatement),
      }),
      ev(
        'stated byte delta == statement delta == sum of line deltas',
        [parseDelta(s.items.get('Byte delta')), lineChanges.reduce((k, c) => k + c.byteDelta, 0)],
        [
          utf8Length(afterStatement) - utf8Length(beforeStatement),
          utf8Length(afterStatement) - utf8Length(beforeStatement),
        ],
      ),
      ev(
        '§7.7 summary row',
        summaryRow
          ? [
              summaryRow.cells[1],
              summaryRow.cells[2],
              summaryRow.cells[3],
              code(summaryRow.cells[4] ?? ''),
              Number(summaryRow.cells[5]),
              summaryRow.cells[7],
            ]
          : null,
        [
          `§${fragment.anchor.clause}`,
          `${range(occ.firstLine, occ.lastLine)} (${occ.changedLines.join(', ')})`,
          `${range(fragmentFirstLine, fragmentLastLine)} (${occ.changedLines.map((l) => l - offset).join(', ')})`,
          occ.targetTable,
          occ.arrays,
          `+${utf8Length(afterStatement) - utf8Length(beforeStatement)}`,
        ],
      ),
      ev(
        '§7.7 summary statement SHA-256 prefixes',
        /^`([0-9a-f]{16})…` → `([0-9a-f]{16})…`$/.exec(summaryRow?.cells[6] ?? '')?.slice(1),
        [sha256Hex(beforeStatement).slice(0, 16), sha256Hex(afterStatement).slice(0, 16)],
      ),
      ev(
        'no Erratum 02 occurrence lies inside the statement',
        e02Lines.filter((l) => l >= occ.firstLine && l <= occ.lastLine),
        [],
      ),
      ev(
        'no Erratum 03 block overlaps the statement',
        e03Corrections
          .filter((c) => c.firstLine <= occ.lastLine && c.lastLine >= occ.firstLine)
          .map((c) => c.id),
        [],
      ),
      ev(
        'After block contains no CR and no fence marker',
        s.after.some((l) => /\r/.test(l) || /^\s*(```|~~~)/.test(l)),
        false,
      ),
    ];
    return {
      id: occ.id,
      fragment: occ.fragment,
      clause: fragment.anchor.clause,
      enclosingFunction: ERRATUM_04_ENCLOSING_FUNCTION,
      targetTable: occ.targetTable,
      arrays: occ.arrays,
      firstLine: occ.firstLine,
      lastLine: occ.lastLine,
      fragmentFirstLine,
      fragmentLastLine,
      beforeBlock: s.before,
      afterBlock: s.after,
      beforeCall: call?.text ?? '',
      arguments: args,
      afterFromItem: afterMiddle === null ? '' : normalizeSpace(afterMiddle),
      beforeStatementSha256: sha256Hex(beforeStatement),
      afterStatementSha256: sha256Hex(afterStatement),
      beforeStatementBytes: utf8Length(beforeStatement),
      afterStatementBytes: utf8Length(afterStatement),
      byteDelta: utf8Length(afterStatement) - utf8Length(beforeStatement),
      lineChanges,
      evidence,
      pass: evidence.every((e) => e.pass),
    };
  });

  const blocks = [...corrections].sort((a, b) => a.firstLine - b.firstLine);
  checks.push(
    ev(
      '§7 subsections in order',
      e04.headings
        .filter((h) => /^### 7\.\d+ `E04-/.test(h.text))
        .map((h) => /`(E04-\d{2})`/.exec(h.text)?.[1]),
      [...ids],
    ),
    ev(
      '§7.7 summary rows',
      summary.map((r) => r.id),
      [...ids],
    ),
    ev(
      'statements are pairwise disjoint and in source order',
      corrections.map((c) => c.id),
      blocks.filter((c, i) => i === 0 || c.firstLine > blocks[i - 1]!.lastLine).map((c) => c.id),
    ),
    ev(
      'total byte delta',
      corrections.reduce((k, c) => k + c.byteDelta, 0),
      ERRATUM_04_F12_PINS.after.bytes - ERRATUM_04_F12_PINS.before.bytes,
    ),
  );
  return { corrections, checks, census, preservedCalls };
}

// ---------------------------------------------------------------------------------------------------------
// Application, post-conditions, pin cross-check, stale-byte scan.
// ---------------------------------------------------------------------------------------------------------

/** A normative fragment as read under M7 V1.1 + accepted Erratum 01 + 02 + 03 + 04. */
export interface E04EffectiveFragment extends E03EffectiveFragment {
  /** The fragment after the Erratum 03 stage (`sql` / `sha256` are the final effective bytes). */
  readonly erratum03Sql: string;
  readonly erratum03Sha256: string;
  readonly erratum04Corrections: readonly string[];
}

export interface E04EffectiveSelection extends E03EffectiveSelection {
  readonly fragments: readonly E04EffectiveFragment[];
}

/**
 * Applies exactly the six verified statement replacements over the Erratum 03-effective fragments. The
 * quoted Before lines must be present unchanged at their fragment lines; line counts never change.
 */
export function applyErratum04Corrections(
  selection: E03EffectiveSelection,
  corrections: readonly Erratum04Correction[],
): E04EffectiveSelection {
  const fragments = selection.fragments.map((f): E04EffectiveFragment => {
    const lines = splitLines(f.sql);
    const own = corrections.filter((c) => c.fragment === f.anchor.id);
    for (const c of [...own].sort((a, b) => b.firstLine - a.firstLine)) {
      const at = c.fragmentFirstLine - 1;
      const current = lines.slice(at, at + c.beforeBlock.length);
      if (
        c.afterBlock.length !== c.beforeBlock.length ||
        JSON.stringify(current) !== JSON.stringify(c.beforeBlock)
      ) {
        throw new Erratum04DefectError(
          `${c.id}: fragment lines ${at + 1}–${at + c.beforeBlock.length} are not the Before statement`,
        );
      }
      lines.splice(at, c.beforeBlock.length, ...c.afterBlock);
    }
    const sql = `${lines.join('\n')}\n`;
    return {
      ...f,
      sql,
      sha256: sha256Hex(sql),
      erratum03Sql: f.sql,
      erratum03Sha256: f.sha256,
      erratum04Corrections: own.map((c) => c.id),
    };
  });
  return { ...selection, fragments };
}

/**
 * Post-conditions over the final effective fragments (Erratum 04 §11 items 3–5): every After statement at
 * its occurrence, no stale Before statement or changed Before line, no qualified multi-array `unnest`
 * anywhere, the preserved single-array calls byte-identical, `ROWS FROM` exactly at the six occurrences, the
 * inverse replacement reproducing the Erratum 03-effective bytes exactly, exactly F12 changed, no line
 * count changed, and every fragment equal to its pin.
 */
export function auditErratum04Fragments(
  effective: E04EffectiveSelection,
  reading: Pick<Erratum04Reading, 'corrections' | 'preservedCalls'>,
): E04Evidence[] {
  const { corrections, preservedCalls } = reading;
  const checks: E04Evidence[] = [];
  const byId = new Map(effective.fragments.map((f) => [f.anchor.id, f]));
  for (const c of corrections) {
    const f = byId.get(c.fragment)!;
    const lines = splitLines(f.sql);
    const at = c.fragmentFirstLine - 1;
    checks.push(
      ev(
        `${c.id}: effective ${c.fragment} lines ${at + 1}–${at + c.afterBlock.length} == After statement`,
        lines.slice(at, at + c.afterBlock.length),
        c.afterBlock,
      ),
      ev(
        `${c.id}: After statement occurs exactly once in the effective fragments`,
        effective.fragments.reduce((n, x) => n + countBlockOccurrences(x.sql, c.afterBlock), 0),
        1,
      ),
      ev(
        `${c.id}: stale Before statement occurrences in effective fragments`,
        effective.fragments.reduce((n, x) => n + countBlockOccurrences(x.sql, c.beforeBlock), 0),
        0,
      ),
      ...c.lineChanges.map((lc) =>
        ev(
          `${c.id}: line ${lc.specLine} stale Before line occurrences in effective fragments`,
          effective.fragments.reduce(
            (n, x) => n + countBlockOccurrences(x.sql, [lc.beforeLine]),
            0,
          ),
          0,
        ),
      ),
    );
  }

  const censuses = effective.fragments.map((f) => [f.anchor.id, censusUnnest(f.sql)] as const);
  const expectedRowsFrom = ERRATUM_04_AFFECTED_FRAGMENTS.map((id) => [
    id,
    corrections
      .filter((c) => c.fragment === id)
      .map((c) => {
        const k = c.afterBlock.findIndex((l) => /\bROWS\s+FROM\b/i.test(l));
        return c.fragmentFirstLine + k;
      }),
  ]);
  const inverse = effective.fragments
    .filter((f) => {
      const lines = splitLines(f.sql);
      for (const c of corrections.filter((x) => x.fragment === f.anchor.id)) {
        lines.splice(c.fragmentFirstLine - 1, c.afterBlock.length, ...c.beforeBlock);
      }
      return `${lines.join('\n')}\n` !== f.erratum03Sql;
    })
    .map((f) => f.anchor.id);
  const f12 = byId.get('F12')!;

  checks.push(
    ev(
      'qualified multi-array unnest calls in the effective fragments',
      censuses.flatMap(([id, c]) =>
        c.calls.filter(isQualifiedMultiArray).map((x) => `${id}:${x.line}`),
      ),
      [],
    ),
    ev(
      'unqualified or non-pg_catalog unnest calls in the effective fragments',
      censuses.flatMap(([id, c]) =>
        c.calls.filter((x) => x.schema !== 'pg_catalog').map((x) => `${id}:${x.line}`),
      ),
      [],
    ),
    ev(
      'preserved single-array calls byte-identical at their fragment lines',
      preservedCalls.map((p) => splitLines(byId.get(p.fragment)!.sql)[p.fragmentLine - 1]),
      preservedCalls.map((p) => p.lineText),
    ),
    ev(
      'F12 qualified unnest calls: total, single-array, multi-array',
      (() => {
        const c = censuses.find(([id]) => id === 'F12')![1].calls.filter((x) => x.schema !== null);
        return [
          c.length,
          c.filter((x) => x.args.length === 1).length,
          c.filter(isQualifiedMultiArray).length,
        ];
      })(),
      [
        preservedCalls.filter((p) => p.fragment === 'F12').length +
          corrections.reduce((n, c) => n + c.arrays, 0),
        preservedCalls.filter((p) => p.fragment === 'F12').length +
          corrections.reduce((n, c) => n + c.arrays, 0),
        0,
      ],
    ),
    ev(
      'ROWS FROM lines per fragment == the six After statements',
      censuses.filter(([, c]) => c.rowsFrom > 0).map(([id, c]) => [id, [...c.rowsFromLines]]),
      expectedRowsFrom,
    ),
    ev(
      'inverse replacement of the After statements reproduces the Erratum 03-effective bytes (no other byte changed)',
      inverse,
      [],
    ),
    ev(
      'fragments whose bytes changed under Erratum 04',
      effective.fragments.filter((f) => f.sql !== f.erratum03Sql).map((f) => f.anchor.id),
      [...ERRATUM_04_AFFECTED_FRAGMENTS],
    ),
    ev(
      'fragments whose line count changed under Erratum 04',
      effective.fragments
        .filter((f) => splitLines(f.sql).length !== splitLines(f.erratum03Sql).length)
        .map((f) => f.anchor.id),
      [],
    ),
    ev('fragment count', effective.fragments.length, 26),
    ev(
      'F12 Erratum 03-stage identity == pinned (sha256, bytes, lines)',
      [f12.erratum03Sha256, utf8Length(f12.erratum03Sql), splitLines(f12.erratum03Sql).length],
      [
        ERRATUM_04_F12_PINS.before.sha256,
        ERRATUM_04_F12_PINS.before.bytes,
        ERRATUM_04_F12_PINS.before.lines,
      ],
    ),
    ev(
      'F12 effective identity == pinned Erratum 04 (sha256, bytes, lines)',
      [f12.sha256, utf8Length(f12.sql), splitLines(f12.sql).length],
      [
        ERRATUM_04_F12_PINS.after.sha256,
        ERRATUM_04_F12_PINS.after.bytes,
        ERRATUM_04_F12_PINS.after.lines,
      ],
    ),
    ev(
      'every other fragment matches its pinned Erratum 03 effective SHA-256',
      effective.fragments
        .filter((f) => f.anchor.id !== 'F12' && f.sha256 !== f.anchor.erratum03EffectiveSha256)
        .map((f) => f.anchor.id),
      [],
    ),
  );
  return checks;
}

/**
 * Cross-check of the informative Erratum 04 §7.7 and §11 item 3 pin tables against the derived bytes. The
 * substitution rule, not these tables, is normative; a mismatch is an erratum defect and refuses.
 */
export function crossCheckErratum04Pins(
  e04Text: string,
  effective: E04EffectiveSelection,
): E04Evidence[] {
  const e04 = parseMarkdown(e04Text);
  const f = effective.fragments.find((x) => x.anchor.id === 'F12')!;
  const derived = {
    before: [f.erratum03Sha256, utf8Length(f.erratum03Sql), splitLines(f.erratum03Sql).length],
    after: [f.sha256, utf8Length(f.sql), splitLines(f.sql).length],
  };
  const s77 = sectionLines(e04, '### 7.7 ', 3)
    .map((l) => l.text)
    .filter((t) => t.startsWith('| effective F12'))
    .map(tableCells);
  const s11 = sectionLines(e04, '## 11. ', 2)
    .map((l) => l.text.trim())
    .filter((t) => /^\| F\d{2} \|/.test(t))
    .map(tableCells);
  const checks: E04Evidence[] = [
    ev('§7.7 F12 pin rows', s77.length, 2),
    ev(
      '§7.7 effective F12 before Erratum 04: sha256, bytes, lines',
      s77[0] ? [code(s77[0][1]!), num(s77[0][2]!), num(s77[0][3]!)] : null,
      derived.before,
    ),
    ev(
      '§7.7 effective F12 after Erratum 04: sha256, bytes, lines',
      s77[1] ? [code(s77[1][1]!), num(s77[1][2]!), num(s77[1][3]!)] : null,
      derived.after,
    ),
    ev(
      '§11 pin table fragments',
      s11.map((r) => r[0]),
      [...ERRATUM_04_AFFECTED_FRAGMENTS],
    ),
  ];
  const r = s11[0];
  const own = f.erratum04Corrections;
  checks.push(
    ev(
      '§11 F12: file, current SHA-256, bytes, lines, SHA-256 after, bytes after, lines after, occurrences',
      r && r.length === 9
        ? [
            code(r[1]!),
            code(r[2]!),
            num(r[3]!),
            num(r[4]!),
            code(r[5]!),
            num(r[6]!),
            num(r[7]!),
            r[8],
          ]
        : null,
      [
        `sql/${f.anchor.file}`,
        ...derived.before,
        ...derived.after,
        `\`${own[0]}\` … \`${own[own.length - 1]}\``,
      ],
    ),
    ev(
      '§11 occurrence range is exactly the six contiguous ids',
      [...own],
      ACCEPTED_ERRATUM_04_OCCURRENCES.map((o) => o.id),
    ),
  );
  return checks;
}

/**
 * Stale-byte scan of `sql/` artifact texts (`path → text`): any qualified multi-array `unnest` call
 * (pre-Erratum-04 bytes), any Before statement or changed Before line, any After statement missing from its
 * occurrence (partial or misplaced correction), any `ROWS FROM` outside the six F12 occurrences (a correction
 * outside F12 or at the wrong occurrence), and any altered preserved single-array call. Diagnostic companion
 * of the drift check — a stale file also always fails the byte comparison.
 */
export function findStaleErratum04Bytes(
  files: ReadonlyMap<string, string>,
  reading: Pick<Erratum04Reading, 'corrections' | 'preservedCalls'>,
): string[] {
  const { corrections, preservedCalls } = reading;
  const out: string[] = [];
  const prefixOf = (fragment: string): string => `sql/${fragment.slice(1)}_`;
  for (const [path, text] of files) {
    if (!path.startsWith('sql/')) continue;
    const own = corrections.filter((c) => path.startsWith(prefixOf(c.fragment)));
    const lines = splitLines(text);
    const census = censusUnnest(text);
    for (const call of census.calls.filter(isQualifiedMultiArray)) {
      const c = own.find(
        (x) => call.line >= x.fragmentFirstLine && call.line <= x.fragmentLastLine,
      );
      out.push(
        `${path}: ${c ? `${c.id} ` : ''}stale pre-Erratum-04 multi-array qualified unnest at line ${call.line}`,
      );
    }
    const expectedRowsFrom: number[] = [];
    for (const c of own) {
      const at = c.fragmentFirstLine - 1;
      const k = c.afterBlock.findIndex((l) => /\bROWS\s+FROM\b/i.test(l));
      expectedRowsFrom.push(c.fragmentFirstLine + k);
      const blocks = countBlockOccurrences(text, c.beforeBlock);
      if (blocks > 0) out.push(`${path}: ${c.id} stale pre-Erratum-04 statement ×${blocks}`);
      for (const lc of c.lineChanges) {
        const extra = countBlockOccurrences(text, [lc.beforeLine]);
        if (blocks === 0 && extra > 0) {
          out.push(`${path}: ${c.id} stale pre-Erratum-04 line ${lc.specLine} ×${extra}`);
        }
      }
      if (
        JSON.stringify(lines.slice(at, at + c.afterBlock.length)) !== JSON.stringify(c.afterBlock)
      ) {
        out.push(
          `${path}: ${c.id} After statement not at fragment lines ${c.fragmentFirstLine}–${c.fragmentLastLine}`,
        );
      }
    }
    const rowsFromLines = census.rowsFromLines.filter((l) => !expectedRowsFrom.includes(l));
    if (rowsFromLines.length > 0) {
      out.push(
        `${path}: ROWS FROM outside the Erratum 04 occurrences at line(s) ${rowsFromLines.join(', ')}`,
      );
    }
    for (const p of preservedCalls.filter((x) => path.startsWith(prefixOf(x.fragment)))) {
      if (lines[p.fragmentLine - 1] !== p.lineText) {
        out.push(`${path}: preserved single-array unnest call at line ${p.fragmentLine} altered`);
      }
    }
    const singles = census.calls.filter(isPgCatalogSingleArray).length;
    const expectedSingles =
      preservedCalls.filter((x) => path.startsWith(prefixOf(x.fragment))).length +
      own.reduce((n, c) => n + c.arrays, 0);
    if (singles !== expectedSingles) {
      out.push(
        `${path}: ${singles} single-array pg_catalog.unnest calls ≠ expected ${expectedSingles}`,
      );
    }
  }
  return out;
}

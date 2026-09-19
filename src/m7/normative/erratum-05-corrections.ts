// M7 V1.1 — S01: the Erratum 05 occurrence-scoped SQL corrections (E05-01, E05-02, E05-03).
//
// Accepted Erratum 05 corrects exactly four occurrences (Erratum 05 §4). Exactly three of them are normative
// SQL inside the §19 fence bodies (Erratum 05 §10 item 1): E05-01 re-orders a 20-line block of
// `m7.w_claim_upload_intent_v1` (fragment F18) so that the intent transition precedes the write-grant
// INSERT; E05-02 and E05-03 add the two NOT NULL lateness columns, with the F21 derivation expressions, to
// the completion INSERTs of `m7.w_execute_row_redaction_v1` and `m7.w_execute_row_purge_v1` (fragment F22).
// The fourth, E05-04, rewrites V1.1 §25.2 row T-03: prose outside every fence body, recognized and verified
// here but never applied to any fragment. Each "After" block replaces exactly its quoted "Before" block at
// exactly the named V1.1 lines; no line is added or removed (Erratum 05 §3 item 2). Every block is READ from
// the identity-verified Erratum 05 bytes (§4 occurrence map, §5.3 / §6.3 / §7.2 Before/After fences and
// SHA-256 tables, §8 census, §10 pin table) and cross-checked against the V1.1 bytes, the Erratum 02–04
// occurrences, the Erratum 04-effective fragments and the authority constants below. No SQL text is written
// here by hand. Any disagreement refuses generation (Erratum 05 §3 item 8).
import type { Erratum02Correction } from './erratum-02-corrections';
import { type Erratum03Correction, countBlockOccurrences } from './erratum-03-corrections';
import {
  type E04EffectiveFragment,
  type E04EffectiveSelection,
  ERRATUM_04_F12_PINS,
  type Erratum04Correction,
  enclosingObject,
  maskSql,
} from './erratum-04-corrections';
import {
  type MarkdownStructure,
  countOccurrences,
  gitBlobId,
  parseMarkdown,
  sectionLines,
  sha256Hex,
  tableRowIds,
} from './source';

/** Authority constants: the four occurrences as enumerated by Erratum 05 §4 (in row order). */
export const ACCEPTED_ERRATUM_05_OCCURRENCES: readonly {
  readonly id: string;
  readonly defectClass: string;
  readonly kind: 'SQL' | 'PROSE';
  /** Fragment of a SQL occurrence; `null` for the prose occurrence. */
  readonly fragment: string | null;
  readonly firstLine: number;
  readonly lastLine: number;
  readonly changedLines: readonly number[];
  readonly enclosingFunction: string | null;
}[] = [
  {
    id: 'E05-01',
    defectClass: 'A',
    kind: 'SQL',
    fragment: 'F18',
    firstLine: 7038,
    lastLine: 7057,
    changedLines: Array.from({ length: 20 }, (_, i) => 7038 + i),
    enclosingFunction: 'm7.w_claim_upload_intent_v1',
  },
  {
    id: 'E05-02',
    defectClass: 'B',
    kind: 'SQL',
    fragment: 'F22',
    firstLine: 7891,
    lastLine: 7893,
    changedLines: [7892, 7893],
    enclosingFunction: 'm7.w_execute_row_redaction_v1',
  },
  {
    id: 'E05-03',
    defectClass: 'B',
    kind: 'SQL',
    fragment: 'F22',
    firstLine: 8149,
    lastLine: 8151,
    changedLines: [8150, 8151],
    enclosingFunction: 'm7.w_execute_row_purge_v1',
  },
  {
    id: 'E05-04',
    defectClass: 'C',
    kind: 'PROSE',
    fragment: null,
    firstLine: 9412,
    lastLine: 9412,
    changedLines: [9412],
    enclosingFunction: null,
  },
];

/** Erratum 05 §4 / §10 item 1: the three occurrences inside normative SQL fence bodies. */
export const ACCEPTED_ERRATUM_05_SQL_OCCURRENCES = ACCEPTED_ERRATUM_05_OCCURRENCES.filter(
  (o) => o.kind === 'SQL',
);

/** Erratum 05 §4 / §10 item 1: `E05-04` is prose only and changes no S01 fragment. */
export const ACCEPTED_ERRATUM_05_PROSE_OCCURRENCES: readonly string[] = ['E05-04'];

/** Erratum 05 §10 item 3. */
export const ERRATUM_05_AFFECTED_FRAGMENTS = ['F18', 'F22'] as const;

/** Effective identities before (V1.1 + E01 … E04) and after Erratum 05 (§10 item 3). */
export const ERRATUM_05_FRAGMENT_PINS: Readonly<
  Record<
    (typeof ERRATUM_05_AFFECTED_FRAGMENTS)[number],
    {
      readonly before: { readonly sha256: string; readonly bytes: number; readonly lines: number };
      readonly after: { readonly sha256: string; readonly bytes: number; readonly lines: number };
    }
  >
> = {
  F18: {
    before: {
      sha256: '8d88295459c55853396637e26fc350a00cbfd8a4118be11c2e46396bffae0a45',
      bytes: 23_867,
      lines: 370,
    },
    after: {
      sha256: '1d30664bb00da96e24fbc9e75299e89a95a70778bedc82dc86d903aca683373d',
      bytes: 23_867,
      lines: 370,
    },
  },
  F22: {
    before: {
      sha256: 'cce8a66a8155c2dbee904ee21e87c97093ceaa15bf8da5b5aa32114009b97999',
      bytes: 26_982,
      lines: 362,
    },
    after: {
      sha256: 'afe1c1302e973d360a3e7a7a0fe8477647ee52feb2a1d0fbd963850afb3b99e8',
      bytes: 27_202,
      lines: 362,
    },
  },
};

/** The table whose required columns E05-02 / E05-03 supply (Erratum 05 §6.1). */
export const ERRATUM_05_COMPLETION_TABLE = 'm7.m7_deletion_execution_completion';

/** The conforming writer whose derivation expressions E05-02 / E05-03 reuse (Erratum 05 §6.2, F21). */
export const ERRATUM_05_DERIVATION_FRAGMENT = 'F21';

export class Erratum05DefectError extends Error {
  constructor(message: string) {
    super(`M7-S01 ERRATUM 05: ${message}`);
    this.name = 'Erratum05DefectError';
  }
}

export interface E05Evidence {
  readonly check: string;
  readonly observed: unknown;
  readonly expected: unknown;
  readonly pass: boolean;
}

function ev(check: string, observed: unknown, expected: unknown): E05Evidence {
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

function lines(first: number, last: number): number[] {
  const out: number[] = [];
  for (let l = first; l <= last; l += 1) out.push(l);
  return out;
}

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

function signed(cell: string | undefined): number {
  const m = /^([+\-−]?)(\d+)$/.exec((cell ?? '').trim());
  return m ? (m[1] === '-' || m[1] === '−' ? -1 : 1) * Number(m[2]) : Number.NaN;
}

// ---------------------------------------------------------------------------------------------------------
// SQL helpers: top-level list splitting, INSERT parsing, function extents and `prosrc`.
// ---------------------------------------------------------------------------------------------------------

/** Splits `text` at commas outside parentheses, single-quoted literals and double-quoted identifiers. */
export function splitTopLevel(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i]!;
    if (c === "'" || c === '"') {
      const end = text.indexOf(c, i + 1);
      if (end === -1) throw new Erratum05DefectError(`unterminated ${c} in list`);
      i = end;
    } else if (c === '(') depth += 1;
    else if (c === ')') depth -= 1;
    else if (c === ',' && depth === 0) {
      out.push(normalizeSpace(text.slice(start, i)));
      start = i + 1;
    }
  }
  out.push(normalizeSpace(text.slice(start)));
  return out;
}

/** Offset of the `)` that closes the `(` at `open` in `masked` text, or -1. */
function closingParen(masked: string, open: number): number {
  let depth = 0;
  for (let k = open; k < masked.length; k += 1) {
    if (masked[k] === '(') depth += 1;
    else if (masked[k] === ')') {
      depth -= 1;
      if (depth === 0) return k;
    }
  }
  return -1;
}

export interface InsertStatement {
  /** 1-based line of the `INSERT INTO` token within the text. */
  readonly line: number;
  readonly table: string;
  readonly columns: readonly string[];
  readonly values: readonly string[];
}

function lineAt(text: string, offset: number): number {
  let n = 1;
  for (let i = 0; i < offset; i += 1) if (text.charCodeAt(i) === 10) n += 1;
  return n;
}

/**
 * Every `INSERT INTO <table> (<columns>) VALUES (<values>)` into `table` in `sql`, with the column and value
 * lists split at top level and whitespace-normalised. Comments and literals never start a match.
 */
export function findInserts(sql: string, table: string): InsertStatement[] {
  const masked = maskSql(sql);
  const escaped = table.replace(/\./g, '\\.');
  const out: InsertStatement[] = [];
  for (const m of masked.matchAll(new RegExp(`\\bINSERT\\s+INTO\\s+${escaped}\\s*\\(`, 'g'))) {
    const colOpen = m.index + m[0].length - 1;
    const colClose = closingParen(masked, colOpen);
    const values = /^\s*VALUES\s*\(/.exec(masked.slice(colClose + 1));
    if (colClose === -1 || !values) {
      throw new Erratum05DefectError(`unreadable INSERT INTO ${table} at offset ${m.index}`);
    }
    const valOpen = colClose + 1 + values[0].length - 1;
    const valClose = closingParen(masked, valOpen);
    if (valClose === -1) throw new Erratum05DefectError(`unbalanced VALUES at offset ${valOpen}`);
    out.push({
      line: lineAt(sql, m.index),
      table,
      columns: splitTopLevel(sql.slice(colOpen + 1, colClose)),
      values: splitTopLevel(sql.slice(valOpen + 1, valClose)),
    });
  }
  return out;
}

/** Names of the functions a fragment creates, with their 1-based first line, in source order. */
export function functionExtents(sql: string): { name: string; first: number; last: number }[] {
  const all = splitLines(sql);
  const starts: { name: string; first: number }[] = [];
  all.forEach((text, i) => {
    const fn = /^CREATE (?:OR REPLACE )?FUNCTION ([A-Za-z0-9_."]+)\s*\(/.exec(text);
    if (fn) starts.push({ name: fn[1]!, first: i + 1 });
  });
  return starts.map((s, i) => ({
    ...s,
    last: i + 1 < starts.length ? starts[i + 1]!.first - 1 : all.length,
  }));
}

/** The text between `AS $fn$` and the closing `$fn$` of function `name` (PostgreSQL `prosrc`). */
export function functionSource(sql: string, name: string): string | null {
  const head = sql.indexOf(`FUNCTION ${name}(`);
  if (head === -1) return null;
  const open = sql.indexOf('AS $fn$', head);
  if (open === -1) return null;
  const from = open + 'AS $fn$'.length;
  const close = sql.indexOf('$fn$', from);
  return close === -1 ? null : sql.slice(from, close);
}

/** Required columns of `CREATE TABLE <table>`: declared NOT NULL and without DEFAULT, in order. */
export function requiredColumns(sql: string, table: string): string[] | null {
  const all = splitLines(sql);
  const start = all.findIndex((l) => l === `CREATE TABLE ${table} (`);
  if (start === -1) return null;
  const out: string[] = [];
  for (let i = start + 1; i < all.length && !/^\);/.test(all[i]!); i += 1) {
    const col = /^\s+"([A-Za-z0-9_]+)"\s+(.*?),?$/.exec(all[i]!);
    if (col && /\bNOT NULL\b/.test(col[2]!) && !/\bDEFAULT\b/.test(col[2]!)) out.push(col[1]!);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------
// Reading the accepted Erratum 05 document.
// ---------------------------------------------------------------------------------------------------------

interface MapRow {
  readonly line: number;
  readonly id: string;
  readonly defectClass: string;
  readonly clause: string;
  readonly quoted: string;
  readonly changed: string;
  readonly addedRemoved: string;
  readonly fragment: string;
  readonly shaPrefixes: readonly string[];
  readonly delta: number;
}

function readOccurrenceMap(e05: MarkdownStructure): MapRow[] {
  return tableRowIds(sectionLines(e05, '## 4. ', 2), /E05-\d{2}/).map((r) => {
    if (r.cells.length !== 9) {
      throw new Erratum05DefectError(`§4 ${r.id}: ${r.cells.length} cells, expected 9`);
    }
    return {
      line: r.line,
      id: r.id,
      defectClass: r.cells[1]!,
      clause: r.cells[2]!,
      quoted: r.cells[3]!,
      changed: r.cells[4]!,
      addedRemoved: r.cells[5]!,
      fragment: r.cells[6]!,
      shaPrefixes: [...r.cells[7]!.matchAll(/`([0-9a-f]{16})…`/g)].map((m) => m[1]!),
      delta: signed(r.cells[8]),
    };
  });
}

const BEFORE_LABEL = /^Before \(V1\.1 lines? (\d+)(?:–(\d+))?, byte-exact\):$/;
const AFTER_LABEL = /^After(?: \(replaces V1\.1 lines? (\d+)(?:–(\d+))?\))?:$/;
const OWNER = /^(?:#{3} .*?|\*\*)`(E05-\d{2})`/;

interface BlockPair {
  readonly owner: string;
  readonly ownerLine: number;
  readonly labelLine: number;
  readonly firstLine: number;
  readonly lastLine: number;
  readonly afterLabel: string;
  /** The range an "After (replaces V1.1 lines a–b):" label names, or `null` for a bare "After:". */
  readonly afterRange: { first: number; last: number } | null;
  readonly beforeInfo: string;
  readonly afterInfo: string;
  readonly before: readonly string[];
  readonly after: readonly string[];
  /** Two-column `| Item | Value |` rows between the owner line and the Before label. */
  readonly items: ReadonlyMap<string, string>;
}

/** Every Before/After pair of the erratum, attributed to the nearest preceding `E05-nn` owner line. */
function readBlockPairs(e05: MarkdownStructure): BlockPair[] {
  const out: BlockPair[] = [];
  e05.lines.forEach((text, index) => {
    const m = BEFORE_LABEL.exec(text);
    if (!m) return;
    const labelLine = index + 1;
    const [before, after] = e05.fences.filter((f) => f.openLine > labelLine).slice(0, 2);
    const between = (from: number, to: number): string[] =>
      e05.lines.slice(from, to - 1).filter((l) => l !== '');
    const middle = before && after ? between(before.closeLine, after.openLine) : [];
    const afterMatch = middle.length === 1 ? AFTER_LABEL.exec(middle[0]!) : null;
    if (!before || !after || between(labelLine, before.openLine).length !== 0 || !afterMatch) {
      throw new Erratum05DefectError(
        `line ${labelLine}: Before label is not followed by a fence, an After label and a fence`,
      );
    }
    let ownerLine = 0;
    let owner = '';
    for (let l = labelLine - 1; l >= 1; l -= 1) {
      const o = OWNER.exec(e05.lines[l - 1]!);
      if (o) {
        owner = o[1]!;
        ownerLine = l;
        break;
      }
    }
    if (!owner) throw new Erratum05DefectError(`line ${labelLine}: Before block has no E05 owner`);
    const items = new Map<string, string>();
    for (let l = ownerLine + 1; l < labelLine; l += 1) {
      const t = e05.lines[l - 1]!;
      if (!t.startsWith('| ')) continue;
      const cells = tableCells(t);
      if (cells.length !== 2 || cells[0] === 'Item' || /^:?-+/.test(cells[0]!)) continue;
      if (items.has(cells[0]!)) {
        throw new Erratum05DefectError(`${owner}: duplicate item ${JSON.stringify(cells[0])}`);
      }
      items.set(cells[0]!, cells[1]!);
    }
    out.push({
      owner,
      ownerLine,
      labelLine,
      firstLine: Number(m[1]),
      lastLine: Number(m[2] ?? m[1]),
      afterLabel: middle[0]!,
      afterRange: afterMatch[1]
        ? { first: Number(afterMatch[1]), last: Number(afterMatch[2] ?? afterMatch[1]) }
        : null,
      beforeInfo: before.info,
      afterInfo: after.info,
      before: before.body,
      after: after.body,
      items,
    });
  });
  return out;
}

function parseBlockSha(value: string | undefined): { sha256: string; bytes: number } | null {
  const m = /^`([0-9a-f]{64})` \(([\d ]+) bytes\)$/.exec(value ?? '');
  return m ? { sha256: m[1]!, bytes: num(m[2]!) } : null;
}

function parseBlockShaPair(
  value: string | undefined,
): { before: string; beforeBytes: number; after: string; afterBytes: number } | null {
  const m =
    /^`([0-9a-f]{64})` \(([\d ]+) bytes\) → `([0-9a-f]{64})` \(([\d ]+) bytes\)(?:, ([+\-−]\d+))?$/.exec(
      value ?? '',
    );
  return m
    ? { before: m[1]!, beforeBytes: num(m[2]!), after: m[3]!, afterBytes: num(m[4]!) }
    : null;
}

function parseLineSha(
  value: string | undefined,
): { before: string; after: string; delta: number } | null {
  const m = /^`([0-9a-f]{64})` → `([0-9a-f]{64})` \(([+\-−])(\d+) bytes\)$/.exec(value ?? '');
  return m ? { before: m[1]!, after: m[2]!, delta: (m[3] === '+' ? 1 : -1) * Number(m[4]) } : null;
}

function parseRange(value: string): { first: number; last: number } | null {
  const m = /^(\d+)(?:–(\d+))?$/.exec(value.trim());
  return m ? { first: Number(m[1]), last: Number(m[2] ?? m[1]) } : null;
}

/** Every integer, and every `a–b` range expanded, in `text` (after removing `(+n inserted)` notes). */
function citedLines(text: string): number[] {
  const out: number[] = [];
  for (const m of text.replace(/\(\+\d+ inserted\)/g, '').matchAll(/(\d+)(?:–(\d+))?/g)) {
    out.push(...lines(Number(m[1]), Number(m[2] ?? m[1])));
  }
  return out;
}

export interface Erratum05LineChange {
  readonly specLine: number;
  readonly fragmentLine: number;
  readonly beforeLine: string;
  readonly afterLine: string;
  readonly beforeLineSha256: string;
  readonly afterLineSha256: string;
  readonly byteDelta: number;
}

export interface Erratum05Correction {
  readonly id: string;
  readonly defectClass: string;
  readonly fragment: string;
  readonly clause: string;
  readonly enclosingFunction: string;
  /** `STATEMENT_REORDER` (E05-01) or `REQUIRED_COLUMN_INSERTION` (E05-02, E05-03). */
  readonly nature: 'STATEMENT_REORDER' | 'REQUIRED_COLUMN_INSERTION';
  readonly firstLine: number;
  readonly lastLine: number;
  /** 1-based lines of the quoted block inside the (effective) fragment. */
  readonly fragmentFirstLine: number;
  readonly fragmentLastLine: number;
  readonly changedLines: readonly number[];
  readonly beforeBlock: readonly string[];
  readonly afterBlock: readonly string[];
  readonly beforeBlockSha256: string;
  readonly afterBlockSha256: string;
  readonly beforeBlockBytes: number;
  readonly afterBlockBytes: number;
  readonly byteDelta: number;
  /** E05-01: the V1.1 source line of each After line (a permutation of the quoted lines); else `null`. */
  readonly permutation: readonly number[] | null;
  /** E05-02 / E05-03: the inserted column names and value expressions, in order; else empty. */
  readonly insertedColumns: readonly string[];
  readonly insertedValues: readonly string[];
  /** Line SHA-256 statements (E05-02 / E05-03); empty for the block re-order. */
  readonly lineChanges: readonly Erratum05LineChange[];
  readonly evidence: readonly E05Evidence[];
  readonly pass: boolean;
}

export interface Erratum05ProseOccurrence {
  readonly id: string;
  readonly defectClass: string;
  readonly clause: string;
  readonly specLine: number;
  readonly beforeLine: string;
  readonly afterLine: string;
  readonly beforeLineSha256: string;
  readonly afterLineSha256: string;
  readonly beforeBytes: number;
  readonly afterBytes: number;
  readonly byteDelta: number;
  /** Always `null`: a prose occurrence lies in no normative fragment and is never applied. */
  readonly fragment: null;
  readonly evidence: readonly E05Evidence[];
  readonly pass: boolean;
}

export interface Erratum05Reading {
  readonly corrections: readonly Erratum05Correction[];
  readonly proseOccurrences: readonly Erratum05ProseOccurrence[];
  readonly checks: readonly E05Evidence[];
}

type EffectiveFragmentLike = E04EffectiveFragment;

/**
 * Reads the three SQL corrections and the prose occurrence from identity-verified Erratum 05 text and
 * verifies each against the V1.1 bytes, the Erratum 02 / 03 / 04 occurrences and the (Erratum 04-effective)
 * fragment selection. Pure; never throws for a failed check — callers refuse on any `pass: false`. Throws
 * only on unreadable structure.
 */
export function readErratum05Corrections(
  v11Text: string,
  e05Text: string,
  selection: E04EffectiveSelection,
  e02Corrections: readonly Erratum02Correction[],
  e03Corrections: readonly Erratum03Correction[],
  e04Corrections: readonly Erratum04Correction[],
): Erratum05Reading {
  const e05 = parseMarkdown(e05Text);
  const v11 = parseMarkdown(v11Text);
  const v11Lines = v11.lines;
  const ids = ACCEPTED_ERRATUM_05_OCCURRENCES.map((o) => o.id);
  const sqlIds = ACCEPTED_ERRATUM_05_SQL_OCCURRENCES.map((o) => o.id);
  const byId = new Map<string, EffectiveFragmentLike>(
    selection.fragments.map((f) => [f.anchor.id, f]),
  );
  const insideBody = (line: number): string | null =>
    selection.fragments.find((f) => line >= f.bodyFirstLine && line <= f.bodyLastLine)?.anchor.id ??
    null;
  const insideFence = (line: number): string | null => {
    const f = v11.fences.find((x) => line > x.openLine && line < x.closeLine);
    return f ? `${f.info || '(none)'}@${f.openLine}` : null;
  };
  const map = readOccurrenceMap(e05);
  const pairs = readBlockPairs(e05);
  const header = e05.fences[0]?.body ?? [];
  const headerValue = (key: string): string =>
    header.find((l) => l.startsWith(key))?.replace(/^[^:]*:\s*/, '') ?? '';
  const e05Tokens = [...new Set([...e05Text.matchAll(/\bE05-\d{2}\b/g)].map((m) => m[0]))].sort();
  const s10 = sectionLines(e05, '## 10. ', 2).map((l) => l.text);
  const item1 = s10.find((t) => t.startsWith('1. ')) ?? '';

  // --- Earlier errata, mechanically: every V1.1 line they amend, insert after or quote. ---
  const e02Lines = e02Corrections.map((c) => c.specLine);
  const e03Lines = e03Corrections.flatMap((c) => lines(c.firstLine, c.lastLine));
  const e04Lines = e04Corrections.flatMap((c) => lines(c.firstLine, c.lastLine));
  const s8 = new Map(
    tableRowIds(sectionLines(e05, '## 8. ', 2), /E0[1-4]/).map((r) => [r.id, r.cells] as const),
  );
  const s8Lines = (id: string): number[] =>
    [
      ...(s8.get(id)?.[1] ?? '').matchAll(
        /\blines? ((?:\d+(?:–\d+)?(?: \(\+\d+ inserted\))?(?:, (?=\d))?)+)/g,
      ),
    ].flatMap((m) => citedLines(m[1]!));
  const e05AllLines = ACCEPTED_ERRATUM_05_OCCURRENCES.flatMap((o) =>
    lines(o.firstLine, o.lastLine),
  );

  const checks: E05Evidence[] = [
    ev(
      '§4 occurrence ids (in order)',
      map.map((r) => r.id),
      [...ids],
    ),
    ev(
      '§4 rows with a fragment == the three SQL occurrences',
      map.filter((r) => r.fragment !== '— (prose only)').map((r) => r.id),
      [...sqlIds],
    ),
    ev(
      '§4 rows without a fragment == the prose occurrences',
      map.filter((r) => r.fragment === '— (prose only)').map((r) => r.id),
      [...ACCEPTED_ERRATUM_05_PROSE_OCCURRENCES],
    ),
    ev(
      '§4 affected fragments',
      [
        ...new Set(
          map.filter((r) => r.fragment !== '— (prose only)').map((r) => r.fragment.slice(0, 3)),
        ),
      ],
      [...ERRATUM_05_AFFECTED_FRAGMENTS],
    ),
    ev(
      'every E05-nn identifier in the document is a registered occurrence',
      e05Tokens,
      [...ids].sort(),
    ),
    ev(
      'Before/After pairs: owners in document order',
      pairs.map((p) => p.owner),
      [...ids],
    ),
    ev(
      'Before/After pair ranges == §4 quoted ranges',
      pairs.map((p) => range(p.firstLine, p.lastLine)),
      map.map((r) => r.quoted),
    ),
    ev(
      'Before/After fence kinds: sql for SQL occurrences, text for prose',
      pairs.map((p) => [p.owner, p.beforeInfo, p.afterInfo]),
      ACCEPTED_ERRATUM_05_OCCURRENCES.map((o) => [
        o.id,
        o.kind === 'SQL' ? 'sql' : 'text',
        o.kind === 'SQL' ? 'sql' : 'text',
      ]),
    ),
    ev(
      'header: SQL occurrences corrected',
      headerValue('SQL OCCURRENCES CORRECTED'),
      (() => {
        const per = ERRATUM_05_AFFECTED_FRAGMENTS.map(
          (f) =>
            `${f}: ${ACCEPTED_ERRATUM_05_SQL_OCCURRENCES.filter((o) => o.fragment === f).length}`,
        );
        return `${sqlIds.length} (${per.join('; ')}); ${selection.fragments.length - ERRATUM_05_AFFECTED_FRAGMENTS.length} fragments byte-unaffected`;
      })(),
    ),
    ev(
      'header: prose occurrences corrected',
      headerValue('PROSE OCCURRENCES CORRECTED').split(' ')[0],
      `${ACCEPTED_ERRATUM_05_PROSE_OCCURRENCES.length}`,
    ),
    ev(
      'header: V1.1 lines superseded; lines added / removed',
      headerValue('V1.1 LINES SUPERSEDED'),
      `${ACCEPTED_ERRATUM_05_OCCURRENCES.flatMap((o) => o.changedLines).length} (${ACCEPTED_ERRATUM_05_OCCURRENCES.map(
        (o) => (o.id === 'E05-01' ? range(o.firstLine, o.lastLine) : o.changedLines.join(', ')),
      ).join('; ')}); LINES ADDED / REMOVED : 0 / 0`,
    ),
    ev(
      '§10 item 1: exactly E05-01 … E05-03 applied; E05-04 prose only',
      [
        item1.includes(
          `applying \`${sqlIds[0]}\` … \`${sqlIds[sqlIds.length - 1]}\` exactly as §3 item 2 defines them`,
        ),
        item1.includes(
          `\`${ACCEPTED_ERRATUM_05_PROSE_OCCURRENCES[0]}\` is prose only and changes no S01 fragment`,
        ),
      ],
      [true, true],
    ),
    ev(
      '§8 E02 lines == the mechanical Erratum 02 occurrences',
      s8Lines('E02'),
      [...e02Lines].sort((a, b) => a - b),
    ),
    ev(
      '§8 E04 lines == the mechanical Erratum 04 changed lines',
      s8Lines('E04'),
      e04Corrections.flatMap((c) => c.lineChanges.map((l) => l.specLine)),
    ),
    ev(
      '§8 E03 lines include every Erratum 03 SQL changed line',
      e03Corrections
        .flatMap((c) => c.lineChanges.map((l) => l.specLine))
        .filter((l) => !s8Lines('E03').includes(l)),
      [],
    ),
    ev(
      'no E05 line is an E01 … E04 cited line (§8)',
      e05AllLines.filter((l) => ['E01', 'E02', 'E03', 'E04'].some((id) => s8Lines(id).includes(l))),
      [],
    ),
    ev(
      'no E05 line lies in an Erratum 02 occurrence, Erratum 03 block or Erratum 04 statement',
      e05AllLines.filter(
        (l) => e02Lines.includes(l) || e03Lines.includes(l) || e04Lines.includes(l),
      ),
      [],
    ),
    ev(
      'no fragment carrying an E05 SQL occurrence carries an Erratum 02 / 03 / 04 correction',
      ERRATUM_05_AFFECTED_FRAGMENTS.map((id) => {
        const f = byId.get(id);
        return f
          ? [...f.erratum02Corrections, ...f.erratum03Corrections, ...f.erratum04Corrections]
          : null;
      }),
      ERRATUM_05_AFFECTED_FRAGMENTS.map(() => []),
    ),
  ];

  // --- Mechanical derivation sources for E05-02 / E05-03 (Erratum 05 §6.1, §6.2). ---
  const required =
    selection.fragments
      .map((f) => requiredColumns(f.sql, ERRATUM_05_COMPLETION_TABLE))
      .find((r) => r !== null) ?? [];
  const derivation = byId.get(ERRATUM_05_DERIVATION_FRAGMENT);
  const f21Inserts = derivation ? findInserts(derivation.sql, ERRATUM_05_COMPLETION_TABLE) : [];
  checks.push(
    ev(
      `${ERRATUM_05_DERIVATION_FRAGMENT}: exactly one ${ERRATUM_05_COMPLETION_TABLE} INSERT (the conforming writer)`,
      f21Inserts.length,
      1,
    ),
    ev(
      `${ERRATUM_05_DERIVATION_FRAGMENT}: its INSERT supplies every required column`,
      required.filter((c) => !(f21Inserts[0]?.columns ?? []).includes(`"${c}"`)),
      [],
    ),
  );
  const derivedValue = (column: string): string | null => {
    const ins = f21Inserts[0];
    const k = ins ? ins.columns.indexOf(`"${column}"`) : -1;
    return ins && k >= 0 ? (ins.values[k] ?? null) : null;
  };

  const sectionOwner = (id: string): BlockPair => {
    const found = pairs.filter((p) => p.owner === id);
    if (found.length !== 1) {
      throw new Erratum05DefectError(`${id}: ${found.length} Before/After pairs, expected 1`);
    }
    return found[0]!;
  };

  // --- The three SQL occurrences. ---
  const corrections = ACCEPTED_ERRATUM_05_SQL_OCCURRENCES.map((occ): Erratum05Correction => {
    const fragment = byId.get(occ.fragment!);
    if (!fragment) {
      throw new Erratum05DefectError(`${occ.id}: fragment ${occ.fragment} not selected`);
    }
    const row = map.find((r) => r.id === occ.id);
    const pair = sectionOwner(occ.id);
    const offset = fragment.bodyFirstLine - 1;
    const fragmentFirstLine = occ.firstLine - offset;
    const fragmentLastLine = occ.lastLine - offset;
    const effLines = splitLines(fragment.sql);
    const n = occ.lastLine - occ.firstLine + 1;
    const beforeText = pair.before.join('\n');
    const afterText = pair.after.join('\n');
    const differing: number[] = [];
    for (let i = 0; i < Math.min(pair.before.length, pair.after.length); i += 1) {
      if (pair.before[i] !== pair.after[i]) differing.push(occ.firstLine + i);
    }
    const reorder = occ.id === 'E05-01';
    const blockShas = reorder
      ? {
          before: parseBlockSha(pair.items.get('Block SHA-256 (Before)')),
          after: parseBlockSha(pair.items.get('Block SHA-256 (After)')),
        }
      : (() => {
          const p = parseBlockShaPair(pair.items.get('Block SHA-256'));
          return {
            before: p ? { sha256: p.before, bytes: p.beforeBytes } : null,
            after: p ? { sha256: p.after, bytes: p.afterBytes } : null,
          };
        })();
    const quotedItem = reorder
      ? pair.items.get('V1.1 lines quoted and replaced')
      : pair.items.get('V1.1 lines quoted / changed');
    const fragmentItem = pair.items.get(`${occ.fragment} fragment lines`);

    const evidence: E05Evidence[] = [
      ev('§4 class == registry', row?.defectClass, occ.defectClass),
      ev(
        '§4 clause names the enclosing function',
        row?.clause,
        `§${fragment.anchor.clause} \`${occ.enclosingFunction}\``,
      ),
      ev('§4 quoted lines == registry', row?.quoted, range(occ.firstLine, occ.lastLine)),
      ev(
        '§4 changed lines == registry',
        row?.changed,
        reorder
          ? `${range(occ.firstLine, occ.lastLine)} (block re-ordered)`
          : occ.changedLines.join(', '),
      ),
      ev('§4 lines added / removed', row?.addedRemoved, '0 / 0'),
      ev(
        '§4 fragment (fragment lines) == anchor and V1.1 body offsets',
        row?.fragment,
        `${occ.fragment} (${range(fragmentFirstLine, fragmentLastLine)})`,
      ),
      ev('§4 block SHA-256 prefixes', row?.shaPrefixes, [
        sha256Hex(beforeText).slice(0, 16),
        sha256Hex(afterText).slice(0, 16),
      ]),
      ev('§4 byte delta', row?.delta, utf8Length(afterText) - utf8Length(beforeText)),
      ev(
        'quoted-lines item == registry',
        quotedItem,
        reorder
          ? `${range(occ.firstLine, occ.lastLine)} (${n} lines)`
          : `${range(occ.firstLine, occ.lastLine)} / ${occ.changedLines.join(', ')}`,
      ),
      ev(
        'fragment-lines item == V1.1 lines − fragment offset',
        fragmentItem,
        range(fragmentFirstLine, fragmentLastLine),
      ),
      ev(
        'After label',
        pair.afterRange,
        reorder ? { first: occ.firstLine, last: occ.lastLine } : null,
      ),
      ev(
        'quoted block lies inside the fragment body',
        [insideBody(occ.firstLine), insideBody(occ.lastLine)],
        [occ.fragment, occ.fragment],
      ),
      ev(
        `quoted block lies inside ${occ.enclosingFunction}`,
        [
          enclosingObject(fragment.sql, fragmentFirstLine),
          enclosingObject(fragment.sql, fragmentLastLine),
        ],
        [occ.enclosingFunction, occ.enclosingFunction],
      ),
      ev(
        'Before block == V1.1 lines (byte-exact)',
        pair.before,
        v11Lines.slice(occ.firstLine - 1, occ.lastLine),
      ),
      ev(
        'Before block == Erratum 04-effective fragment lines (byte-exact)',
        pair.before,
        effLines.slice(fragmentFirstLine - 1, fragmentLastLine),
      ),
      ev(
        'Before block occurs exactly once in V1.1',
        countBlockOccurrences(v11Text, pair.before),
        1,
      ),
      ev(
        'Before block occurs exactly once in the effective fragments',
        selection.fragments.reduce((k, f) => k + countBlockOccurrences(f.sql, pair.before), 0),
        1,
      ),
      ev('After block occurs nowhere in V1.1', countBlockOccurrences(v11Text, pair.after), 0),
      ev(
        'After block occurs nowhere in the Erratum 04-effective fragments',
        selection.fragments.reduce((k, f) => k + countBlockOccurrences(f.sql, pair.after), 0),
        0,
      ),
      ev('After line count == Before line count (no line added or removed)', pair.after.length, n),
      ev('lines differing == registered changed lines', differing, [...occ.changedLines]),
      ev('block SHA-256 (Before) and bytes reproduce', blockShas.before, {
        sha256: sha256Hex(beforeText),
        bytes: utf8Length(beforeText),
      }),
      ev('block SHA-256 (After) and bytes reproduce', blockShas.after, {
        sha256: sha256Hex(afterText),
        bytes: utf8Length(afterText),
      }),
      ev(
        'After block contains no CR and no fence marker',
        pair.after.some((l) => /\r/.test(l) || /^\s*(```|~~~)/.test(l)),
        false,
      ),
      ev(
        'no Erratum 02 occurrence lies inside the quoted block',
        e02Lines.filter((l) => l >= occ.firstLine && l <= occ.lastLine),
        [],
      ),
      ev(
        'no Erratum 03 block overlaps the quoted block',
        e03Corrections
          .filter((c) => c.firstLine <= occ.lastLine && c.lastLine >= occ.firstLine)
          .map((c) => c.id),
        [],
      ),
      ev(
        'no Erratum 04 statement overlaps the quoted block',
        e04Corrections
          .filter((c) => c.firstLine <= occ.lastLine && c.lastLine >= occ.firstLine)
          .map((c) => c.id),
        [],
      ),
    ];

    let permutation: number[] | null = null;
    let insertedColumns: string[] = [];
    let insertedValues: string[] = [];
    let lineChanges: Erratum05LineChange[] = [];

    if (reorder) {
      // Erratum 05 §5.3 "Nature": the After block is the stated permutation of the quoted lines.
      const nature =
        /the (\d+) lines of U \(V1\.1 (\d+)–(\d+)\), then the blank line \((\d+)\), then the (\d+) lines of the grant comment and W \((\d+)–(\d+)\)/.exec(
          pair.items.get('Nature') ?? '',
        );
      permutation = nature
        ? [
            ...lines(Number(nature[2]), Number(nature[3])),
            Number(nature[4]),
            ...lines(Number(nature[6]), Number(nature[7])),
          ]
        : [];
      const steps = new Map(
        tableRowIds(sectionLines(e05, '### 5.1 ', 3), /[GWU]/).map(
          (r) => [r.id, parseRange(r.cells[1]!)] as const,
        ),
      );
      const stepOpens = (step: string, pattern: RegExp): boolean => {
        const s = steps.get(step);
        return s ? pattern.test((v11Lines[s.first - 1] ?? '').trim()) : false;
      };
      const afterInsert = findInserts(`${afterText}\n`, 'm7.m7_generation_write_grant');
      const beforeInsert = findInserts(`${beforeText}\n`, 'm7.m7_generation_write_grant');
      evidence.push(
        ev(
          '§5.3 nature: stated line counts',
          nature ? [Number(nature[1]), Number(nature[5])] : null,
          nature
            ? [Number(nature[3]) - Number(nature[2]) + 1, Number(nature[7]) - Number(nature[6]) + 1]
            : [],
        ),
        ev(
          'permutation covers each quoted line exactly once',
          [...permutation].sort((a, b) => a - b),
          lines(occ.firstLine, occ.lastLine),
        ),
        ev(
          'After block == the quoted V1.1 lines in the stated permuted order (byte-exact)',
          pair.after,
          permutation.map((l) => v11Lines[l - 1]),
        ),
        ev(
          'After block is a permutation of the Before block (same multiset of lines)',
          [...pair.after].sort(),
          [...pair.before].sort(),
        ),
        ev(
          '§5.1 step statements: G, W, U open with the registered writes',
          [
            stepOpens('G', /^INSERT INTO m7\.m7_canonical_generation\b/),
            stepOpens('W', /^INSERT INTO m7\.m7_generation_write_grant$/),
            stepOpens('U', /^UPDATE m7\.m7_evidence_upload_intent$/),
          ],
          [true, true, true],
        ),
        ev(
          '§5.1 W and U lie inside the quoted block; G precedes it',
          [
            steps.get('W')!.first >= occ.firstLine && steps.get('W')!.last <= occ.lastLine,
            steps.get('U')!.first >= occ.firstLine && steps.get('U')!.last <= occ.lastLine,
            steps.get('G')!.last < occ.firstLine,
          ],
          [true, true, true],
        ),
        ev(
          'permutation moves U (and only U with the blank line) ahead of the grant comment and W',
          permutation.slice(0, 6),
          [...lines(steps.get('U')!.first, steps.get('U')!.last), steps.get('U')!.first - 1],
        ),
        ev(
          'the write-grant INSERT is unchanged (same columns and values)',
          afterInsert.map((i) => [i.columns, i.values]),
          beforeInsert.map((i) => [i.columns, i.values]),
        ),
      );
    } else {
      // Erratum 05 §6.3: the After INSERT supplies exactly the required columns the Before omits, with the
      // F21 derivation expressions, inserted after "completedAt" on the same lines.
      const before = findInserts(`${beforeText}\n`, ERRATUM_05_COMPLETION_TABLE);
      const after = findInserts(`${afterText}\n`, ERRATUM_05_COMPLETION_TABLE);
      const b = before[0];
      const a = after[0];
      const missing = required.filter((c) => !(b?.columns ?? []).includes(`"${c}"`));
      const at = b ? b.columns.indexOf('"completedAt"') + 1 : -1;
      insertedColumns = missing.map((c) => `"${c}"`);
      insertedValues = missing.map((c) => derivedValue(c) ?? '');
      const expectedColumns = b
        ? [...b.columns.slice(0, at), ...insertedColumns, ...b.columns.slice(at)]
        : [];
      const expectedValues = b
        ? [...b.values.slice(0, at), ...insertedValues, ...b.values.slice(at)]
        : [];
      const pureInsertion = (x: string, y: string): boolean => {
        let p = 0;
        while (p < x.length && x[p] === y[p]) p += 1;
        let s = 0;
        while (s < x.length - p && x[x.length - 1 - s] === y[y.length - 1 - s]) s += 1;
        return p + s === x.length && y.length > x.length;
      };
      const itemLines = [...pair.items.keys()].filter((k) => /^Line \d+ SHA-256$/.test(k));
      lineChanges = occ.changedLines.map((specLine): Erratum05LineChange => {
        const i = specLine - occ.firstLine;
        const sha = parseLineSha(pair.items.get(`Line ${specLine} SHA-256`));
        return {
          specLine,
          fragmentLine: specLine - offset,
          beforeLine: pair.before[i] ?? '',
          afterLine: pair.after[i] ?? '',
          beforeLineSha256: sha?.before ?? '',
          afterLineSha256: sha?.after ?? '',
          byteDelta: sha?.delta ?? Number.NaN,
        };
      });
      evidence.push(
        ev(
          'Before and After: exactly one completion INSERT each',
          [before.length, after.length],
          [1, 1],
        ),
        ev('required columns the Before INSERT omits (declared NOT NULL, no DEFAULT)', missing, [
          'withinCompletionBudget',
          'withinHardDeadline',
        ]),
        ev(
          `each omitted column's value is the ${ERRATUM_05_DERIVATION_FRAGMENT} derivation expression`,
          insertedValues.every((v) => v !== ''),
          true,
        ),
        ev(
          `the completedAt value is the one ${ERRATUM_05_DERIVATION_FRAGMENT} derives from`,
          b ? b.values[b.columns.indexOf('"completedAt"')] : null,
          derivedValue('completedAt'),
        ),
        ev(
          'After columns == Before columns with the omitted required columns inserted after "completedAt"',
          a?.columns,
          expectedColumns,
        ),
        ev(
          'After values == Before values with the derivation expressions inserted at the same position',
          a?.values,
          expectedValues,
        ),
        ev(
          'After supplies every required column',
          required.filter((c) => !(a?.columns ?? []).includes(`"${c}"`)),
          [],
        ),
        ev(
          'every changed line is a pure insertion into its Before line',
          lineChanges.map((c) => pureInsertion(c.beforeLine, c.afterLine)),
          lineChanges.map(() => true),
        ),
        ev(
          'the function declares v_e as its own m7.m7_deletion_execution row',
          (() => {
            const ext = functionExtents(fragment.sql).find((x) => x.name === occ.enclosingFunction);
            return ext
              ? effLines
                  .slice(ext.first - 1, fragmentFirstLine - 1)
                  .some((l) => /\bv_e m7\.m7_deletion_execution;/.test(l))
              : false;
          })(),
          true,
        ),
        ev(
          'line SHA-256 items cover exactly the changed lines',
          itemLines,
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
          ev(
            `line ${c.specLine}: changed After line occurs nowhere in V1.1`,
            countBlockOccurrences(v11Text, [c.afterLine]),
            0,
          ),
        ]),
        ev(
          'block byte delta == sum of line deltas',
          utf8Length(afterText) - utf8Length(beforeText),
          lineChanges.reduce((k, c) => k + c.byteDelta, 0),
        ),
      );
    }

    return {
      id: occ.id,
      defectClass: occ.defectClass,
      fragment: occ.fragment!,
      clause: fragment.anchor.clause,
      enclosingFunction: occ.enclosingFunction!,
      nature: reorder ? 'STATEMENT_REORDER' : 'REQUIRED_COLUMN_INSERTION',
      firstLine: occ.firstLine,
      lastLine: occ.lastLine,
      fragmentFirstLine,
      fragmentLastLine,
      changedLines: [...occ.changedLines],
      beforeBlock: pair.before,
      afterBlock: pair.after,
      beforeBlockSha256: sha256Hex(beforeText),
      afterBlockSha256: sha256Hex(afterText),
      beforeBlockBytes: utf8Length(beforeText),
      afterBlockBytes: utf8Length(afterText),
      byteDelta: utf8Length(afterText) - utf8Length(beforeText),
      permutation,
      insertedColumns,
      insertedValues,
      lineChanges,
      evidence,
      pass: evidence.every((e) => e.pass),
    };
  });

  // --- The prose occurrence (recognized, verified, never applied). ---
  const proseOccurrences = ACCEPTED_ERRATUM_05_OCCURRENCES.filter((o) => o.kind === 'PROSE').map(
    (occ): Erratum05ProseOccurrence => {
      const row = map.find((r) => r.id === occ.id);
      const pair = sectionOwner(occ.id);
      const beforeLine = pair.before.length === 1 ? pair.before[0]! : '';
      const afterLine = pair.after.length === 1 ? pair.after[0]! : '';
      const sha = parseBlockShaPair(pair.items.get('Line SHA-256'));
      const stated = /, ([+\-−]\d+)$/.exec(pair.items.get('Line SHA-256') ?? '')?.[1];
      const cells = (t: string): number => tableCells(t).length;
      const tableHeading = [...v11.headings].reverse().find((h) => h.line < occ.firstLine);
      const headerLine = v11Lines
        .slice(0, occ.firstLine - 1)
        .map((t, i) => ({ t, line: i + 1 }))
        .filter((x) => tableHeading && x.line > tableHeading.line && x.t.startsWith('| ID |'));
      const evidence: E05Evidence[] = [
        ev('§4 class == registry', row?.defectClass, occ.defectClass),
        ev('§4 clause', row?.clause, '§25.2 row T-03'),
        ev(
          '§4 quoted / changed lines',
          [row?.quoted, row?.changed],
          [`${occ.firstLine}`, `${occ.firstLine}`],
        ),
        ev('§4 lines added / removed', row?.addedRemoved, '0 / 0'),
        ev('§4 fragment: prose only', row?.fragment, '— (prose only)'),
        ev('§4 line SHA-256 prefixes', row?.shaPrefixes, [
          sha256Hex(beforeLine).slice(0, 16),
          sha256Hex(afterLine).slice(0, 16),
        ]),
        ev('§4 byte delta', row?.delta, utf8Length(afterLine) - utf8Length(beforeLine)),
        ev('§7.2 V1.1 line item', pair.items.get('V1.1 line'), `${occ.firstLine} (unique in V1.1)`),
        ev('Before and After are single lines', [pair.before.length, pair.after.length], [1, 1]),
        ev('Before line == V1.1 line (byte-exact)', beforeLine, v11Lines[occ.firstLine - 1]),
        ev(
          'Before line occurs exactly once in V1.1',
          countBlockOccurrences(v11Text, [beforeLine]),
          1,
        ),
        ev('After line occurs nowhere in V1.1', countBlockOccurrences(v11Text, [afterLine]), 0),
        ev('line SHA-256 and bytes reproduce', sha, {
          before: sha256Hex(beforeLine),
          beforeBytes: utf8Length(beforeLine),
          after: sha256Hex(afterLine),
          afterBytes: utf8Length(afterLine),
        }),
        ev('stated byte delta', signed(stated), utf8Length(afterLine) - utf8Length(beforeLine)),
        ev(
          'the line is the §25.2 table row T-03',
          [
            tableHeading?.text.startsWith('### 25.2 '),
            beforeLine.startsWith('| T-03 |'),
            afterLine.startsWith('| T-03 |'),
          ],
          [true, true, true],
        ),
        ev(
          'column count unchanged and equal to the §25.2 table header',
          [cells(beforeLine), cells(afterLine)],
          headerLine.length > 0
            ? [
                cells(headerLine[headerLine.length - 1]!.t),
                cells(headerLine[headerLine.length - 1]!.t),
              ]
            : [-1, -1],
        ),
        ev('the line lies in no normative fragment body', insideBody(occ.firstLine), null),
        ev('the line lies inside no V1.1 fence', insideFence(occ.firstLine), null),
        ev(
          'Before / After text occurs in no Erratum 04-effective fragment',
          selection.fragments
            .filter(
              (f) =>
                countOccurrences(f.sql, beforeLine) + countOccurrences(f.sql, afterLine) > 0 ||
                f.sql.includes('| T-03 |'),
            )
            .map((f) => f.anchor.id),
          [],
        ),
        ev('no Erratum 03 occurrence quotes the line', e03Lines.includes(occ.firstLine), false),
      ];
      return {
        id: occ.id,
        defectClass: occ.defectClass,
        clause: '§25.2 row T-03',
        specLine: occ.firstLine,
        beforeLine,
        afterLine,
        beforeLineSha256: sha256Hex(beforeLine),
        afterLineSha256: sha256Hex(afterLine),
        beforeBytes: utf8Length(beforeLine),
        afterBytes: utf8Length(afterLine),
        byteDelta: utf8Length(afterLine) - utf8Length(beforeLine),
        fragment: null,
        evidence,
        pass: evidence.every((e) => e.pass),
      };
    },
  );

  const blocks = [...corrections].sort((a, b) => a.firstLine - b.firstLine);
  checks.push(
    ev(
      'SQL quoted blocks are pairwise disjoint and in source order',
      corrections.map((c) => c.id),
      blocks.filter((c, i) => i === 0 || c.firstLine > blocks[i - 1]!.lastLine).map((c) => c.id),
    ),
    ev(
      'total F18 / F22 byte delta == pinned',
      ERRATUM_05_AFFECTED_FRAGMENTS.map((f) =>
        corrections.filter((c) => c.fragment === f).reduce((k, c) => k + c.byteDelta, 0),
      ),
      ERRATUM_05_AFFECTED_FRAGMENTS.map(
        (f) => ERRATUM_05_FRAGMENT_PINS[f].after.bytes - ERRATUM_05_FRAGMENT_PINS[f].before.bytes,
      ),
    ),
  );
  return { corrections, proseOccurrences, checks };
}

// ---------------------------------------------------------------------------------------------------------
// Application, post-conditions, pin cross-check, stale-byte scan.
// ---------------------------------------------------------------------------------------------------------

/** A normative fragment as read under M7 V1.1 + accepted Erratum 01 + 02 + 03 + 04 + 05. */
export interface E05EffectiveFragment extends E04EffectiveFragment {
  /** The fragment after the Erratum 04 stage (`sql` / `sha256` are the final effective bytes). */
  readonly erratum04Sql: string;
  readonly erratum04Sha256: string;
  readonly erratum05Corrections: readonly string[];
}

export interface E05EffectiveSelection extends E04EffectiveSelection {
  readonly fragments: readonly E05EffectiveFragment[];
}

/**
 * Applies exactly the three verified block replacements over the Erratum 04-effective fragments. The quoted
 * Before lines must be present unchanged at their fragment lines; line counts never change. The prose
 * occurrence is never applied.
 */
export function applyErratum05Corrections(
  selection: E04EffectiveSelection,
  corrections: readonly Erratum05Correction[],
): E05EffectiveSelection {
  const unknown = corrections.filter(
    (c) => !ACCEPTED_ERRATUM_05_SQL_OCCURRENCES.some((o) => o.id === c.id),
  );
  if (unknown.length > 0) {
    throw new Erratum05DefectError(
      `not an Erratum 05 SQL occurrence: ${unknown.map((c) => c.id).join(', ')}`,
    );
  }
  const fragments = selection.fragments.map((f): E05EffectiveFragment => {
    const all = splitLines(f.sql);
    const own = corrections.filter((c) => c.fragment === f.anchor.id);
    for (const c of [...own].sort((a, b) => b.firstLine - a.firstLine)) {
      const at = c.fragmentFirstLine - 1;
      const current = all.slice(at, at + c.beforeBlock.length);
      if (
        c.afterBlock.length !== c.beforeBlock.length ||
        JSON.stringify(current) !== JSON.stringify(c.beforeBlock)
      ) {
        throw new Erratum05DefectError(
          `${c.id}: fragment lines ${at + 1}–${at + c.beforeBlock.length} are not the Before block`,
        );
      }
      all.splice(at, c.beforeBlock.length, ...c.afterBlock);
    }
    const sql = `${all.join('\n')}\n`;
    return {
      ...f,
      sql,
      sha256: sha256Hex(sql),
      erratum04Sql: f.sql,
      erratum04Sha256: f.sha256,
      erratum05Corrections: own.map((c) => c.id),
    };
  });
  return { ...selection, fragments };
}

/** Completion INSERTs of every fragment: `[fragment, fragment line, supplies every required column]`. */
function completionCensus(
  fragments: readonly { anchor: { id: string }; sql: string }[],
  required: readonly string[],
): [string, number, boolean][] {
  return fragments.flatMap((f) =>
    findInserts(f.sql, ERRATUM_05_COMPLETION_TABLE).map((i): [string, number, boolean] => [
      f.anchor.id,
      i.line,
      required.every((c) => i.columns.includes(`"${c}"`)),
    ]),
  );
}

/** Fragment lines of the claim function's G, U and W writes (`-1` when absent or not unique). */
export function claimWriteOrder(sql: string): { G: number; U: number; W: number } {
  const fn = functionExtents(sql).find((x) => x.name === 'm7.w_claim_upload_intent_v1');
  const at = (pattern: RegExp): number => {
    if (!fn) return -1;
    const hits = splitLines(sql)
      .slice(fn.first - 1, fn.last)
      .map((l, i) => (pattern.test(l) ? fn.first + i : -1))
      .filter((l) => l !== -1);
    return hits.length === 1 ? hits[0]! : -1;
  };
  return {
    G: at(/^\s*INSERT INTO m7\.m7_canonical_generation\b/),
    U: at(/^\s*UPDATE m7\.m7_evidence_upload_intent\b/),
    W: at(/^\s*INSERT INTO m7\.m7_generation_write_grant\b/),
  };
}

function prosrcTable(sql: string): [string, string][] {
  return functionExtents(sql).map((x) => [x.name, sha256Hex(functionSource(sql, x.name) ?? '')]);
}

/**
 * Post-conditions over the final effective fragments (Erratum 05 §10 items 3–6): every After block at its
 * occurrence and nowhere else, no stale Before block or changed Before line, the claim writes in the unique
 * admissible order G → U → W, every completion INSERT supplying every required column, the inverse
 * replacement reproducing the Erratum 04-effective bytes exactly, only the three corrected functions'
 * `prosrc` changed, exactly F18 / F22 changed, no line count changed, the prose occurrence absent from every
 * fragment, and every fragment equal to its pin.
 */
export function auditErratum05Fragments(
  effective: E05EffectiveSelection,
  reading: Pick<Erratum05Reading, 'corrections' | 'proseOccurrences'>,
): E05Evidence[] {
  const { corrections, proseOccurrences } = reading;
  const checks: E05Evidence[] = [];
  const byId = new Map(effective.fragments.map((f) => [f.anchor.id, f]));
  for (const c of corrections) {
    const f = byId.get(c.fragment)!;
    const at = c.fragmentFirstLine - 1;
    checks.push(
      ev(
        `${c.id}: effective ${c.fragment} lines ${at + 1}–${at + c.afterBlock.length} == After block`,
        splitLines(f.sql).slice(at, at + c.afterBlock.length),
        c.afterBlock,
      ),
      ev(
        `${c.id}: After block occurs exactly once in the effective fragments`,
        effective.fragments.reduce((n, x) => n + countBlockOccurrences(x.sql, c.afterBlock), 0),
        1,
      ),
      ev(
        `${c.id}: stale Before block occurrences in effective fragments`,
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

  const required =
    effective.fragments
      .map((f) => requiredColumns(f.sql, ERRATUM_05_COMPLETION_TABLE))
      .find((r) => r !== null) ?? [];
  const before = completionCensus(
    effective.fragments.map((f) => ({ anchor: f.anchor, sql: f.erratum04Sql })),
    required,
  );
  const after = completionCensus(effective.fragments, required);
  const inverse = effective.fragments
    .filter((f) => {
      const all = splitLines(f.sql);
      for (const c of corrections.filter((x) => x.fragment === f.anchor.id)) {
        all.splice(c.fragmentFirstLine - 1, c.afterBlock.length, ...c.beforeBlock);
      }
      return `${all.join('\n')}\n` !== f.erratum04Sql;
    })
    .map((f) => f.anchor.id);
  const changedFunctions = ERRATUM_05_AFFECTED_FRAGMENTS.flatMap((id) => {
    const f = byId.get(id)!;
    const was = new Map(prosrcTable(f.erratum04Sql));
    return prosrcTable(f.sql)
      .filter(([name, sha]) => was.get(name) !== sha)
      .map(([name]) => name);
  });
  const pinnedOther = (f: E05EffectiveFragment): string =>
    f.anchor.id === 'F12' ? ERRATUM_04_F12_PINS.after.sha256 : f.anchor.erratum03EffectiveSha256;
  const f18 = byId.get('F18')!;

  checks.push(
    ev(
      'F18 claim writes before Erratum 05: G < W < U (the defective order)',
      (() => {
        const o = claimWriteOrder(f18.erratum04Sql);
        return o.G > 0 && o.G < o.W && o.W < o.U;
      })(),
      true,
    ),
    ev(
      'F18 claim writes after Erratum 05: G < U < W (the unique admissible order)',
      (() => {
        const o = claimWriteOrder(f18.sql);
        return o.G > 0 && o.G < o.U && o.U < o.W;
      })(),
      true,
    ),
    ev(
      'completion INSERTs omitting a required column before Erratum 05 == the E05-02 / E05-03 statements',
      before.filter(([, , ok]) => !ok).map(([id, line]) => [id, line]),
      corrections
        .filter((c) => c.nature === 'REQUIRED_COLUMN_INSERTION')
        .map((c) => [c.fragment, c.fragmentFirstLine]),
    ),
    ev(
      'completion INSERTs omitting a required column after Erratum 05',
      after.filter(([, , ok]) => !ok).map(([id, line]) => [id, line]),
      [],
    ),
    ev(
      'completion INSERT sites unchanged by Erratum 05',
      after.map(([id, line]) => [id, line]),
      before.map(([id, line]) => [id, line]),
    ),
    ev(
      'inverse replacement of the After blocks reproduces the Erratum 04-effective bytes (no other byte changed)',
      inverse,
      [],
    ),
    ev(
      'functions whose prosrc changed under Erratum 05 == the three enclosing functions',
      changedFunctions,
      corrections.map((c) => c.enclosingFunction),
    ),
    ev(
      'fragments whose bytes changed under Erratum 05',
      effective.fragments.filter((f) => f.sql !== f.erratum04Sql).map((f) => f.anchor.id),
      [...ERRATUM_05_AFFECTED_FRAGMENTS],
    ),
    ev(
      'fragments whose line count changed under Erratum 05',
      effective.fragments
        .filter((f) => splitLines(f.sql).length !== splitLines(f.erratum04Sql).length)
        .map((f) => f.anchor.id),
      [],
    ),
    ev('fragment count', effective.fragments.length, 26),
    ...ERRATUM_05_AFFECTED_FRAGMENTS.flatMap((id) => {
      const f = byId.get(id)!;
      const pin = ERRATUM_05_FRAGMENT_PINS[id];
      return [
        ev(
          `${id} Erratum 04-stage identity == pinned (sha256, bytes, lines)`,
          [f.erratum04Sha256, utf8Length(f.erratum04Sql), splitLines(f.erratum04Sql).length],
          [pin.before.sha256, pin.before.bytes, pin.before.lines],
        ),
        ev(
          `${id} effective identity == pinned Erratum 05 (sha256, bytes, lines)`,
          [f.sha256, utf8Length(f.sql), splitLines(f.sql).length],
          [pin.after.sha256, pin.after.bytes, pin.after.lines],
        ),
      ];
    }),
    ev(
      'every other fragment is byte-identical to its Erratum 04-stage bytes and matches its pin',
      effective.fragments
        .filter((f) => !(ERRATUM_05_AFFECTED_FRAGMENTS as readonly string[]).includes(f.anchor.id))
        .filter((f) => f.sql !== f.erratum04Sql || f.sha256 !== pinnedOther(f))
        .map((f) => f.anchor.id),
      [],
    ),
    ev(
      'prose occurrences are applied to no fragment',
      effective.fragments
        .filter((f) =>
          proseOccurrences.some(
            (p) =>
              countOccurrences(f.sql, p.beforeLine) + countOccurrences(f.sql, p.afterLine) > 0 ||
              f.sql.includes('| T-03 |'),
          ),
        )
        .map((f) => f.anchor.id),
      [],
    ),
  );
  return checks;
}

/**
 * Cross-check of the informative Erratum 05 §1.3, §5.4 / §6.4 (`prosrc`) and §10 pin statements against the
 * derived bytes. The replacement rule, not these tables, is normative; a mismatch is an erratum defect and
 * refuses.
 */
export function crossCheckErratum05Pins(
  e05Text: string,
  effective: E05EffectiveSelection,
): E05Evidence[] {
  const e05 = parseMarkdown(e05Text);
  const byId = new Map(effective.fragments.map((f) => [f.anchor.id, f]));
  const s10 = sectionLines(e05, '## 10. ', 2).map((l) => l.text);
  const rows = s10
    .map((t) => t.trim())
    .filter((t) => /^\| F\d{2} \|/.test(t))
    .map(tableCells);
  const checks: E05Evidence[] = [
    ev(
      '§10 pin table fragments',
      rows.map((r) => r[0]),
      [...ERRATUM_05_AFFECTED_FRAGMENTS],
    ),
  ];
  for (const r of rows) {
    const f = byId.get(r[0]!);
    if (!f || r.length !== 10) {
      checks.push(ev(`§10 row ${r[0]} readable`, false, true));
      continue;
    }
    const bytes = utf8Length(f.sql);
    const was = utf8Length(f.erratum04Sql);
    const d = bytes - was;
    checks.push(
      ev(
        `§10 ${f.anchor.id}: file, current SHA-256, bytes, lines, SHA-256 after, bytes after, lines after, Δ, occurrences`,
        [
          code(r[1]!),
          code(r[2]!),
          num(r[3]!),
          num(r[4]!),
          code(r[5]!),
          num(r[6]!),
          num(r[7]!),
          r[8],
          r[9]!.split(',').map(code),
        ],
        [
          `sql/${f.anchor.file}`,
          f.erratum04Sha256,
          was,
          splitLines(f.erratum04Sql).length,
          f.sha256,
          bytes,
          splitLines(f.sql).length,
          `${d > 0 ? '+' : ''}${d} / ${splitLines(f.sql).length - splitLines(f.erratum04Sql).length}`,
          [...f.erratum05Corrections],
        ],
      ),
    );
  }

  const item4 = s10.find((t) => t.includes('**Unaffected fragments: exactly')) ?? '';
  const item4Count = /exactly (\d+)\*\*/.exec(item4)?.[1];
  const item4Pins = [...item4.matchAll(/(F\d{2}) `([0-9a-f]{8})…`/g)].map((m) => [m[1]!, m[2]!]);
  const status = sectionLines(e05, '## 10. ', 2)
    .map((l) => l.text)
    .find((t) => t.startsWith('EXISTING S01 EXTRACTION'));
  const statusPins = [...(status ?? '').matchAll(/(F\d{2}) ([0-9a-f]{8})…/g)].map((m) => [
    m[1]!,
    m[2]!,
  ]);
  checks.push(
    ev(
      '§10 item 4 unaffected fragment count',
      Number(item4Count),
      effective.fragments.filter((f) => f.erratum05Corrections.length === 0).length,
    ),
    ev(
      '§10 item 4 preserved pins are prefixes of the effective (unchanged) fragment identities',
      item4Pins.map(([id]) => [
        id,
        byId.get(id!)?.sha256.slice(0, 8),
        byId.get(id!)?.erratum05Corrections,
      ]),
      item4Pins.map(([id, p]) => [id, p, []]),
    ),
    ev(
      '§10 status: F18 / F22 existing identities == Erratum 04-stage bytes',
      statusPins.map(([id, p]) => [id, p]),
      ERRATUM_05_AFFECTED_FRAGMENTS.map((id) => [id, byId.get(id)!.erratum04Sha256.slice(0, 8)]),
    ),
  );

  // §1.3: the Erratum 04-stage F09 / F18 / F21 / F22 identities the erratum was authored against.
  const s13 = new Map(
    tableRowIds(sectionLines(e05, '### 1.3 ', 3), /F\d{2} \(sql\/[^)]+\)/).map(
      (r) => [/^F\d{2}/.exec(r.id)![0], r.cells[1]!] as const,
    ),
  );
  for (const [id, cell] of s13) {
    const f = byId.get(id);
    const body =
      /body V1\.1 lines (\d+)–(\d+); ([\d ]+) lines; ([\d ]+) bytes; SHA-256 `([0-9a-f]{64})`(?:; Git blob `([0-9a-f]{40})`)?/.exec(
        cell,
      );
    checks.push(
      ev(
        `§1.3 ${id}: body lines, line count, bytes, SHA-256 (, Git blob) of the Erratum 04-stage bytes`,
        body
          ? [
              Number(body[1]),
              Number(body[2]),
              num(body[3]!),
              num(body[4]!),
              body[5],
              body[6] ?? null,
            ]
          : null,
        f
          ? [
              f.bodyFirstLine,
              f.bodyLastLine,
              splitLines(f.erratum04Sql).length,
              utf8Length(f.erratum04Sql),
              f.erratum04Sha256,
              body?.[6] ? gitBlobId(new TextEncoder().encode(f.erratum04Sql)) : null,
            ]
          : null,
      ),
    );
  }
  checks.push(ev('§1.3 fragment rows', [...s13.keys()], ['F09', 'F18', 'F21', 'F22']));

  // §5.4 / §6.4: informative `prosrc` identities of the three corrected functions.
  const prosrcStatements = [
    ...sectionLines(e05, '### 5.4 ', 3),
    ...sectionLines(e05, '### 6.4 ', 3),
  ]
    .map((l) => l.text)
    .join('\n');
  const stated = [
    ...prosrcStatements.matchAll(
      /`sha256:([0-9a-f]{64})`(?: \(([\d ]+) bytes\))? → `sha256:([0-9a-f]{64})` \(([\d ]+) bytes(?: both)?\)/g,
    ),
  ].map((m) => [m[1], m[2] ? num(m[2]) : num(m[4]!), m[3], num(m[4]!)]);
  const functions = [
    ['F18', 'm7.w_claim_upload_intent_v1'],
    ['F22', 'm7.w_execute_row_redaction_v1'],
    ['F22', 'm7.w_execute_row_purge_v1'],
  ] as const;
  checks.push(
    ev(
      '§5.4 / §6.4 prosrc SHA-256 and bytes of the corrected functions (before → after)',
      stated,
      functions.map(([id, name]) => {
        const f = byId.get(id)!;
        const was = functionSource(f.erratum04Sql, name) ?? '';
        const now = functionSource(f.sql, name) ?? '';
        return [sha256Hex(was), utf8Length(was), sha256Hex(now), utf8Length(now)];
      }),
    ),
  );
  return checks;
}

/**
 * Stale-byte scan of `sql/` artifact texts (`path → text`): any pre-Erratum-05 Before block or changed Before
 * line; any After block missing from its occurrence (partial or misplaced correction), duplicated, or present
 * in another fragment; the claim writes out of the G → U → W order; any completion INSERT omitting a required
 * column; and any Erratum 05 prose text in a SQL fragment. Diagnostic companion of the drift check — a stale
 * file also always fails the byte comparison.
 */
export function findStaleErratum05Bytes(
  files: ReadonlyMap<string, string>,
  reading: Pick<Erratum05Reading, 'corrections' | 'proseOccurrences'>,
): string[] {
  const { corrections, proseOccurrences } = reading;
  const out: string[] = [];
  const prefixOf = (fragment: string): string => `sql/${fragment.slice(1)}_`;
  const required = [...files.values()]
    .map((t) => requiredColumns(t, ERRATUM_05_COMPLETION_TABLE))
    .find((r) => r !== null);
  for (const [path, text] of files) {
    if (!path.startsWith('sql/')) continue;
    const all = splitLines(text);
    for (const c of corrections) {
      const own = path.startsWith(prefixOf(c.fragment));
      const blocks = countBlockOccurrences(text, c.beforeBlock);
      if (blocks > 0) out.push(`${path}: ${c.id} stale pre-Erratum-05 block ×${blocks}`);
      for (const lc of c.lineChanges) {
        const extra = countBlockOccurrences(text, [lc.beforeLine]);
        if (blocks === 0 && extra > 0) {
          out.push(`${path}: ${c.id} stale pre-Erratum-05 line ${lc.specLine} ×${extra}`);
        }
        const afterLines = countBlockOccurrences(text, [lc.afterLine]);
        if (afterLines > (own ? 1 : 0)) {
          out.push(
            own
              ? `${path}: ${c.id} changed line ${lc.specLine} duplicated ×${afterLines}`
              : `${path}: ${c.id} changed line ${lc.specLine} outside ${c.fragment} ×${afterLines}`,
          );
        }
      }
      const afters = countBlockOccurrences(text, c.afterBlock);
      if (own) {
        const at = c.fragmentFirstLine - 1;
        if (
          JSON.stringify(all.slice(at, at + c.afterBlock.length)) !== JSON.stringify(c.afterBlock)
        ) {
          out.push(
            `${path}: ${c.id} After block not at fragment lines ${c.fragmentFirstLine}–${c.fragmentLastLine}`,
          );
        }
        if (afters > 1) out.push(`${path}: ${c.id} After block duplicated ×${afters}`);
      } else if (afters > 0) {
        out.push(`${path}: ${c.id} After block outside ${c.fragment} ×${afters}`);
      }
      if (own && c.nature === 'STATEMENT_REORDER') {
        const o = claimWriteOrder(text);
        if (!(o.G > 0 && o.G < o.U && o.U < o.W)) {
          out.push(
            `${path}: ${c.id} ${c.enclosingFunction} writes not in the order G → U → W (G ${o.G}, U ${o.U}, W ${o.W})`,
          );
        }
      }
    }
    if (required) {
      for (const i of findInserts(text, ERRATUM_05_COMPLETION_TABLE)) {
        const missing = required.filter((c) => !i.columns.includes(`"${c}"`));
        if (missing.length > 0) {
          out.push(
            `${path}: ${ERRATUM_05_COMPLETION_TABLE} INSERT at line ${i.line} omits ${missing.join(', ')}`,
          );
        }
      }
    }
    for (const p of proseOccurrences) {
      if (
        countOccurrences(text, p.beforeLine) + countOccurrences(text, p.afterLine) > 0 ||
        text.includes('| T-03 |')
      ) {
        out.push(`${path}: ${p.id} prose occurrence text in a SQL fragment`);
      }
    }
  }
  return out;
}

// M7 V1.1 — S01: the Erratum 02 occurrence-scoped SQL corrections (E02-01…E02-09).
//
// Accepted Erratum 02 supersedes exactly nine "Before" substrings on nine named V1.1 lines, in fragments
// F09, F11, F17, F23 and F26, and nothing else (Erratum 02 §4, §6; Register §14). Every substitution is
// READ from the identity-verified Erratum 02 bytes — the §6 Before/After lines and line SHA-256 values
// and the §5.3 verbatim expressions — and cross-checked against the V1.1 bytes, the anchor registry and
// the authority constants below. No substitution text is written here by hand. Any disagreement refuses
// generation (an erratum defect is reported, never resolved by interpretation — Erratum 02 §4 rule 6).
import type { FragmentSelection, NormativeFragment } from './fragments';
import {
  type Fence,
  type MarkdownStructure,
  countOccurrences,
  parseMarkdown,
  sectionLines,
  sha256Hex,
  tableRowIds,
} from './source';

/** Authority constants: the nine occurrences as enumerated by Erratum 02 §5.3 (id, fragment, V1.1 line). */
export const ACCEPTED_ERRATUM_02_OCCURRENCES: readonly {
  readonly id: string;
  readonly fragment: string;
  readonly specLine: number;
}[] = [
  { id: 'E02-01', fragment: 'F09', specLine: 4494 },
  { id: 'E02-02', fragment: 'F09', specLine: 4545 },
  { id: 'E02-03', fragment: 'F09', specLine: 4853 },
  { id: 'E02-04', fragment: 'F11', specLine: 5442 },
  { id: 'E02-05', fragment: 'F17', specLine: 6912 },
  { id: 'E02-06', fragment: 'F23', specLine: 8219 },
  { id: 'E02-07', fragment: 'F23', specLine: 8221 },
  { id: 'E02-08', fragment: 'F23', specLine: 8222 },
  { id: 'E02-09', fragment: 'F26', specLine: 8826 },
];

/** Erratum 02 §5.3 scan conclusion / §9 item 5. */
export const ERRATUM_02_AFFECTED_FRAGMENTS = ['F09', 'F11', 'F17', 'F23', 'F26'] as const;

export class Erratum02DefectError extends Error {
  constructor(message: string) {
    super(`M7-S01 ERRATUM 02: ${message}`);
    this.name = 'Erratum02DefectError';
  }
}

export interface E02Evidence {
  readonly check: string;
  readonly observed: unknown;
  readonly expected: unknown;
  readonly pass: boolean;
}

function ev(check: string, observed: unknown, expected: unknown): E02Evidence {
  return { check, observed, expected, pass: JSON.stringify(observed) === JSON.stringify(expected) };
}

export interface Erratum02Correction {
  readonly id: string;
  readonly fragment: string;
  readonly clause: string;
  readonly specLine: number;
  readonly fragmentLine: number;
  readonly enclosingObject: string;
  readonly subClass: string;
  readonly beforeExpression: string;
  readonly afterExpression: string;
  readonly beforeLine: string;
  readonly afterLine: string;
  readonly beforeLineSha256: string;
  readonly afterLineSha256: string;
  readonly byteDelta: number;
  readonly evidence: readonly E02Evidence[];
  readonly pass: boolean;
}

function utf8Length(text: string): number {
  return new TextEncoder().encode(text).byteLength;
}

function stripCode(cell: string): string {
  return cell.replace(/`/g, '').trim();
}

/** A cell whose whole content is one inline-code span: the span's exact text. */
function codeSpan(cell: string): string | null {
  const m = /^`([^`]+)`$/.exec(cell);
  return m ? m[1]! : null;
}

interface SectionSixEntry {
  readonly id: string;
  readonly headingLine: number;
  readonly specLine: number;
  readonly clause: string;
  readonly beforeLine: string;
  readonly afterLine: string;
  readonly beforeLineSha256: string;
  readonly afterLineSha256: string;
  readonly byteDelta: number;
}

const SIX_HEADING = /^### 6\.(\d+) `(E02-\d{2})` — V1\.1 line (\d+), §([0-9.]+), /;
const LINE_SHA =
  /^Line SHA-256: before `([0-9a-f]{64})` → after `([0-9a-f]{64})` \(([−+]?)(\d+) bytes\)\./;

function readSectionSix(e02: MarkdownStructure): SectionSixEntry[] {
  const out: SectionSixEntry[] = [];
  for (const h of e02.headings.filter((x) => x.level === 3 && SIX_HEADING.test(x.text))) {
    const m = SIX_HEADING.exec(h.text)!;
    const section = sectionLines(e02, `### 6.${m[1]} `, 3);
    const last = section[section.length - 1]!.line;
    const fences = e02.fences.filter((f: Fence) => f.openLine > h.line && f.closeLine <= last);
    if (fences.length !== 2 || fences.some((f) => f.info !== 'text' || f.body.length !== 1)) {
      throw new Erratum02DefectError(
        `§6.${m[1]} (${m[2]}): expected exactly two one-line text fences (Before, After)`,
      );
    }
    const label = (f: Fence): string => {
      for (let l = f.openLine - 1; l > h.line; l -= 1) {
        const t = e02.lines[l - 1]!;
        if (t !== '') return t;
      }
      return '';
    };
    if (label(fences[0]!) !== 'Before:' || label(fences[1]!) !== 'After:') {
      throw new Erratum02DefectError(
        `§6.${m[1]} (${m[2]}): fences are not labelled Before:/After:`,
      );
    }
    const shaLines = section.filter((l) => LINE_SHA.test(l.text));
    if (shaLines.length !== 1) {
      throw new Erratum02DefectError(`§6.${m[1]} (${m[2]}): Line SHA-256 statement not found once`);
    }
    const s = LINE_SHA.exec(shaLines[0]!.text)!;
    out.push({
      id: m[2]!,
      headingLine: h.line,
      specLine: Number(m[3]),
      clause: m[4]!,
      beforeLine: fences[0]!.body[0]!,
      afterLine: fences[1]!.body[0]!,
      beforeLineSha256: s[1]!,
      afterLineSha256: s[2]!,
      byteDelta: (s[3] === '−' ? -1 : 1) * Number(s[4]),
    });
  }
  return out;
}

interface InventoryRow {
  readonly id: string;
  readonly line: number;
  readonly fragment: string;
  readonly clause: string;
  readonly specLine: number;
  readonly fragmentLine: number;
  readonly enclosingObject: string;
  readonly expression: string;
  readonly subClass: string;
  readonly ordinaryForm: string;
}

function readSectionFiveThree(e02: MarkdownStructure): InventoryRow[] {
  const section = sectionLines(e02, '### 5.3 ', 3);
  return tableRowIds(section, /E02-\d{2}/).map((r) => {
    if (r.cells.length !== 8) {
      throw new Erratum02DefectError(`§5.3 ${r.id}: ${r.cells.length} cells, expected 8`);
    }
    const where = /^(F\d{2}) \/ §([0-9.]+)$/.exec(r.cells[1]!);
    const lines = /^(\d+) \((\d+)\)$/.exec(r.cells[2]!);
    const expression = codeSpan(r.cells[4]!);
    if (!where || !lines || expression === null) {
      throw new Erratum02DefectError(`§5.3 ${r.id}: unparseable row`);
    }
    return {
      id: r.id,
      line: r.line,
      fragment: where[1]!,
      clause: where[2]!,
      specLine: Number(lines[1]),
      fragmentLine: Number(lines[2]),
      enclosingObject: stripCode(r.cells[3]!),
      expression,
      subClass: r.cells[5]!,
      ordinaryForm: r.cells[7]!,
    };
  });
}

/** The After expression the §5.3 "Ordinary-form equivalent" cell denotes, or `null` if unreadable. */
function ordinaryFormExpression(row: InventoryRow): string | null {
  const verbatim = /^`([^`]+)` → /.exec(row.ordinaryForm);
  if (verbatim) return verbatim[1]!;
  if (row.ordinaryForm.startsWith('same pattern, `, ` for ` FROM ` → ')) {
    return countOccurrences(row.expression, ' FROM ') === 1
      ? row.expression.replace(' FROM ', ', ')
      : null;
  }
  return null;
}

export interface Erratum02Reading {
  readonly corrections: readonly Erratum02Correction[];
  /** Document-level checks (row sets, ids, registry agreement). */
  readonly checks: readonly E02Evidence[];
}

/**
 * Reads E02-01…E02-09 from identity-verified Erratum 02 text and verifies each against the V1.1 bytes
 * and the V1.1 fragment selection (Erratum 02 §4 rules 3 and 5, §6.10). Pure; never throws for a
 * failed check — callers refuse on any `pass: false`. Throws only on unreadable structure.
 */
export function readErratum02Corrections(
  v11Text: string,
  e02Text: string,
  selection: FragmentSelection,
): Erratum02Reading {
  const e02 = parseMarkdown(e02Text);
  const v11Lines = v11Text.slice(0, -1).split('\n');
  const six = readSectionSix(e02);
  const table = readSectionFiveThree(e02);
  const registryIds = ACCEPTED_ERRATUM_02_OCCURRENCES.map((o) => o.id);

  const checks: E02Evidence[] = [
    ev(
      '§6 correction ids (E02-01…E02-09, in order)',
      six.map((s) => s.id),
      registryIds,
    ),
    ev(
      '§5.3 defect inventory ids (in order)',
      table.map((t) => t.id),
      registryIds,
    ),
    ev(
      '§5.3 affected fragments == registry',
      [...new Set(table.map((t) => t.fragment))],
      [...ERRATUM_02_AFFECTED_FRAGMENTS],
    ),
  ];

  const corrections = ACCEPTED_ERRATUM_02_OCCURRENCES.map((occ): Erratum02Correction => {
    const s = six.find((x) => x.id === occ.id);
    const t = table.find((x) => x.id === occ.id);
    if (!s || !t) throw new Erratum02DefectError(`${occ.id}: missing from §6 or §5.3`);
    const fragment = selection.fragments.find((f) => f.anchor.id === occ.fragment);
    if (!fragment)
      throw new Erratum02DefectError(`${occ.id}: fragment ${occ.fragment} not selected`);

    const before = t.expression;
    const at = s.beforeLine.indexOf(before);
    const prefix = at >= 0 ? s.beforeLine.slice(0, at) : '';
    const suffix = at >= 0 ? s.beforeLine.slice(at + before.length) : '';
    const shapeOk =
      at >= 0 &&
      s.afterLine.length >= prefix.length + suffix.length &&
      s.afterLine.startsWith(prefix) &&
      s.afterLine.endsWith(suffix);
    const after = shapeOk
      ? s.afterLine.slice(prefix.length, s.afterLine.length - suffix.length)
      : '';

    const evidence = [
      ev('§6 heading V1.1 line == registry', s.specLine, occ.specLine),
      ev('§5.3 V1.1 line == registry', t.specLine, occ.specLine),
      ev('§5.3 fragment == registry', t.fragment, occ.fragment),
      ev(
        '§6 clause == §5.3 clause == anchor clause',
        [s.clause, t.clause],
        [fragment.anchor.clause, fragment.anchor.clause],
      ),
      ev(
        'V1.1 line lies inside the fragment body',
        occ.specLine >= fragment.bodyFirstLine && occ.specLine <= fragment.bodyLastLine,
        true,
      ),
      ev(
        '§5.3 fragment line == V1.1 line − bodyFirstLine + 1',
        t.fragmentLine,
        occ.specLine - fragment.bodyFirstLine + 1,
      ),
      ev('§6 Before line == V1.1 line (byte-exact)', s.beforeLine, v11Lines[occ.specLine - 1]),
      ev('Before line SHA-256 reproduces', sha256Hex(s.beforeLine), s.beforeLineSha256),
      ev('After line SHA-256 reproduces', sha256Hex(s.afterLine), s.afterLineSha256),
      ev(
        'Before expression occurs exactly once on its line',
        countOccurrences(s.beforeLine, before),
        1,
      ),
      ev('Before expression occurs exactly once in V1.1', countOccurrences(v11Text, before), 1),
      ev('After line differs from Before line only inside the Before expression', shapeOk, true),
      ev('After expression differs from Before expression', after !== before && after !== '', true),
      ev('After expression == §5.3 ordinary-form equivalent', after, ordinaryFormExpression(t)),
      ev(
        'line byte delta == len(After) − len(Before) == stated delta',
        [
          utf8Length(s.afterLine) - utf8Length(s.beforeLine),
          utf8Length(after) - utf8Length(before),
        ],
        [s.byteDelta, s.byteDelta],
      ),
      ev('After line contains no line break', /[\r\n]/.test(s.afterLine), false),
    ];
    return {
      id: occ.id,
      fragment: occ.fragment,
      clause: fragment.anchor.clause,
      specLine: occ.specLine,
      fragmentLine: occ.specLine - fragment.bodyFirstLine + 1,
      enclosingObject: t.enclosingObject,
      subClass: t.subClass,
      beforeExpression: before,
      afterExpression: after,
      beforeLine: s.beforeLine,
      afterLine: s.afterLine,
      beforeLineSha256: s.beforeLineSha256,
      afterLineSha256: s.afterLineSha256,
      byteDelta: s.byteDelta,
      evidence,
      pass: evidence.every((e) => e.pass),
    };
  });

  return { corrections, checks };
}

/** A normative fragment as read under the current conformance target. */
export interface EffectiveFragment extends NormativeFragment {
  /** The accepted V1.1 fence body and its SHA-256 (`sql` / `sha256` are the effective bytes). */
  readonly v11Sql: string;
  readonly v11Sha256: string;
  readonly erratum02Corrections: readonly string[];
}

export interface EffectiveSelection extends FragmentSelection {
  readonly fragments: readonly EffectiveFragment[];
}

/**
 * Applies exactly the nine verified substitutions: for each, the Before expression is replaced by the
 * After expression on exactly its named line; no line is added, removed or reordered.
 */
export function applyErratum02Corrections(
  selection: FragmentSelection,
  corrections: readonly Erratum02Correction[],
): EffectiveSelection {
  const fragments = selection.fragments.map((f): EffectiveFragment => {
    const lines = f.sql.slice(0, -1).split('\n');
    const own = corrections.filter((c) => c.fragment === f.anchor.id);
    for (const c of own) {
      const index = c.specLine - f.bodyFirstLine;
      if (lines[index] !== c.beforeLine) {
        throw new Erratum02DefectError(
          `${c.id}: fragment line ${index + 1} is not the Before line`,
        );
      }
      lines[index] = c.afterLine;
    }
    const sql = `${lines.join('\n')}\n`;
    return {
      ...f,
      sql,
      sha256: sha256Hex(sql),
      v11Sql: f.sql,
      v11Sha256: f.sha256,
      erratum02Corrections: own.map((c) => c.id),
    };
  });
  return { ...selection, fragments };
}

function lineCount(sql: string): number {
  return sql.slice(0, -1).split('\n').length;
}

/**
 * Post-conditions over the effective fragments (Erratum 02 §9 items 3–5): every correction present
 * exactly at its occurrence, no stale Before expression anywhere, exactly nine changed lines and no
 * tenth, exactly the five affected fragments changed, line counts unchanged, and every fragment equal
 * to its pinned effective SHA-256.
 */
export function auditEffectiveFragments(
  effective: EffectiveSelection,
  corrections: readonly Erratum02Correction[],
): E02Evidence[] {
  const checks: E02Evidence[] = [];
  const allSql = effective.fragments.map((f) => f.sql).join('');
  for (const c of corrections) {
    const f = effective.fragments.find((x) => x.anchor.id === c.fragment)!;
    const line = f.sql.slice(0, -1).split('\n')[c.fragmentLine - 1];
    checks.push(
      ev(
        `${c.id}: effective ${c.fragment} line ${c.fragmentLine} == After line`,
        line,
        c.afterLine,
      ),
      ev(
        `${c.id}: stale Before expression occurrences in effective fragments`,
        countOccurrences(allSql, c.beforeExpression),
        0,
      ),
      ev(
        `${c.id}: After expression occurrences on its effective line`,
        countOccurrences(line ?? '', c.afterExpression),
        1,
      ),
    );
  }
  const changedLines: string[] = [];
  for (const f of effective.fragments) {
    const a = f.v11Sql.slice(0, -1).split('\n');
    const b = f.sql.slice(0, -1).split('\n');
    a.forEach((text, i) => {
      if (text !== b[i]) changedLines.push(`${f.anchor.id}:${f.bodyFirstLine + i}`);
    });
  }
  checks.push(
    ev(
      'changed lines (fragment:V1.1 line) == the nine registered occurrences, no tenth',
      changedLines,
      corrections.map((c) => `${c.fragment}:${c.specLine}`),
    ),
    ev(
      'fragments whose bytes changed',
      effective.fragments.filter((f) => f.sql !== f.v11Sql).map((f) => f.anchor.id),
      [...ERRATUM_02_AFFECTED_FRAGMENTS],
    ),
    ev(
      'line count unchanged in every fragment',
      effective.fragments
        .filter((f) => lineCount(f.sql) !== lineCount(f.v11Sql))
        .map((f) => f.anchor.id),
      [],
    ),
    ev('fragment count', effective.fragments.length, 26),
    ev(
      'every fragment matches its pinned effective SHA-256',
      effective.fragments
        .filter((f) => f.sha256 !== f.anchor.effectiveSha256)
        .map((f) => `${f.anchor.id}: ${f.sha256} ≠ pinned ${f.anchor.effectiveSha256}`),
      [],
    ),
    ev(
      'pinned effective SHA-256 differs from V1.1 pin exactly for the affected fragments',
      effective.fragments
        .filter((f) => f.anchor.effectiveSha256 !== f.anchor.bodySha256)
        .map((f) => f.anchor.id),
      [...ERRATUM_02_AFFECTED_FRAGMENTS],
    ),
  );
  return checks;
}

/**
 * Cross-check of the informative Erratum 02 §9 item 3 pin table against the derived bytes. The
 * substitution rule, not this table, is normative; a mismatch is an erratum defect and refuses.
 */
export function crossCheckInformativePins(
  e02Text: string,
  effective: EffectiveSelection,
): E02Evidence[] {
  const e02 = parseMarkdown(e02Text);
  const rows = sectionLines(e02, '## 9. ', 2)
    .map((l) => ({ line: l.line, text: l.text.trim() }))
    .filter((l) => /^\| F\d{2} \|/.test(l.text))
    .map((l) =>
      l.text
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim()),
    );
  const num = (cell: string): number => Number(cell.replace(/ /g, ''));
  const checks: E02Evidence[] = [
    ev(
      '§9 pin table fragments',
      rows.map((r) => r[0]),
      [...ERRATUM_02_AFFECTED_FRAGMENTS],
    ),
  ];
  for (const r of rows) {
    const f = effective.fragments.find((x) => x.anchor.id === r[0]);
    if (!f || r.length !== 7) {
      checks.push(ev(`§9 row ${r[0]} readable`, false, true));
      continue;
    }
    checks.push(
      ev(
        `§9 ${f.anchor.id}: file, V1.1 pin, bytes, effective SHA-256, bytes after, lines`,
        [stripCode(r[1]!), stripCode(r[2]!), num(r[3]!), stripCode(r[4]!), num(r[5]!), num(r[6]!)],
        [
          `sql/${f.anchor.file}`,
          f.v11Sha256,
          utf8Length(f.v11Sql),
          f.sha256,
          utf8Length(f.sql),
          lineCount(f.sql),
        ],
      ),
    );
  }
  return checks;
}

/**
 * Stale-byte scan of `sql/` artifact texts (`path → text`): every pre-Erratum-02 Before expression found.
 * Diagnostic companion of the drift check — a stale file also always fails the byte comparison.
 */
export function findStaleErratum02Bytes(
  files: ReadonlyMap<string, string>,
  corrections: readonly Erratum02Correction[],
): string[] {
  const out: string[] = [];
  for (const [path, text] of files) {
    if (!path.startsWith('sql/')) continue;
    for (const c of corrections) {
      const n = countOccurrences(text, c.beforeExpression);
      if (n > 0) out.push(`${path}: ${c.id} stale pre-Erratum-02 expression ×${n}`);
    }
  }
  return out;
}

// M7 V1.1 — S01: the Erratum 03 occurrence-scoped SQL corrections (E03-01, E03-02, E03-03a, E03-04a,
// E03-05a, E03-06a).
//
// Accepted Erratum 03 corrects fourteen occurrences (Erratum 03 §4). Exactly six of them are normative SQL
// inside the §19 fence bodies, in fragments F01, F11 and F24 (Erratum 03 §10 item 1); the other eight are
// prose or verification-case rows outside every fence body and contribute nothing to the extraction. Each
// SQL correction replaces exactly its quoted "Before" block of V1.1 lines by its "After" block; an After
// block longer than its Before block inserts the extra lines immediately after the last quoted line, and no
// line is removed or reordered (Erratum 03 §3 item 2). Every block is READ from the identity-verified
// Erratum 03 bytes (§5 Before/After fences, line SHA-256 statements, §4 occurrence map) and cross-checked
// against the V1.1 bytes, the Erratum 02 occurrences and the authority constants below. No SQL text is
// written here by hand. Any disagreement refuses generation (Erratum 03 §3 item 6).
import type {
  Erratum02Correction,
  EffectiveFragment,
  EffectiveSelection,
} from './erratum-02-corrections';
import {
  type MarkdownStructure,
  parseMarkdown,
  sectionLines,
  sha256Hex,
  tableRowIds,
} from './source';

/** Authority constants: the six SQL occurrences as enumerated by Erratum 03 §4 and §10 item 1. */
export const ACCEPTED_ERRATUM_03_SQL_OCCURRENCES: readonly {
  readonly id: string;
  readonly correctionClass: string;
  readonly fragment: string;
  readonly firstLine: number;
  readonly lastLine: number;
  readonly changedLines: readonly number[];
  readonly insertedLines: number;
}[] = [
  {
    id: 'E03-01',
    correctionClass: 'A',
    fragment: 'F11',
    firstLine: 5233,
    lastLine: 5238,
    changedLines: [5233, 5235],
    insertedLines: 2,
  },
  {
    id: 'E03-02',
    correctionClass: 'B',
    fragment: 'F24',
    firstLine: 8495,
    lastLine: 8496,
    changedLines: [8496],
    insertedLines: 0,
  },
  {
    id: 'E03-03a',
    correctionClass: 'C',
    fragment: 'F24',
    firstLine: 8605,
    lastLine: 8607,
    changedLines: [8607],
    insertedLines: 0,
  },
  {
    id: 'E03-04a',
    correctionClass: 'D',
    fragment: 'F24',
    firstLine: 8543,
    lastLine: 8545,
    changedLines: [8545],
    insertedLines: 0,
  },
  {
    id: 'E03-05a',
    correctionClass: 'E',
    fragment: 'F24',
    firstLine: 8547,
    lastLine: 8551,
    changedLines: [8551],
    insertedLines: 3,
  },
  {
    id: 'E03-06a',
    correctionClass: 'F',
    fragment: 'F01',
    firstLine: 2469,
    lastLine: 2471,
    changedLines: [2471],
    insertedLines: 0,
  },
];

/** The eight Erratum 03 §4 occurrences that are prose or verification-case rows (no fragment). */
export const ACCEPTED_ERRATUM_03_PROSE_OCCURRENCES: readonly string[] = [
  'E03-03b',
  'E03-04b',
  'E03-04c',
  'E03-05b',
  'E03-06b',
  'E03-07',
  'E03-08',
  'E03-09',
];

/** Erratum 03 §4 row order. */
export const ERRATUM_03_OCCURRENCE_ORDER: readonly string[] = [
  'E03-01',
  'E03-02',
  'E03-03a',
  'E03-03b',
  'E03-04a',
  'E03-04b',
  'E03-04c',
  'E03-05a',
  'E03-05b',
  'E03-06a',
  'E03-06b',
  'E03-07',
  'E03-08',
  'E03-09',
];

/** Erratum 03 §10 item 3 / §4. */
export const ERRATUM_03_AFFECTED_FRAGMENTS = ['F01', 'F11', 'F24'] as const;

export class Erratum03DefectError extends Error {
  constructor(message: string) {
    super(`M7-S01 ERRATUM 03: ${message}`);
    this.name = 'Erratum03DefectError';
  }
}

export interface E03Evidence {
  readonly check: string;
  readonly observed: unknown;
  readonly expected: unknown;
  readonly pass: boolean;
}

function ev(check: string, observed: unknown, expected: unknown): E03Evidence {
  return { check, observed, expected, pass: JSON.stringify(observed) === JSON.stringify(expected) };
}

export interface Erratum03LineChange {
  readonly specLine: number;
  readonly beforeLine: string;
  readonly afterLine: string;
  readonly beforeLineSha256: string;
  readonly afterLineSha256: string;
  readonly byteDelta: number;
}

export interface Erratum03Correction {
  readonly id: string;
  readonly correctionClass: string;
  readonly fragment: string;
  readonly clause: string;
  readonly firstLine: number;
  readonly lastLine: number;
  /** 1-based lines of the quoted block inside the V1.1 fence body. */
  readonly fragmentFirstLine: number;
  readonly fragmentLastLine: number;
  readonly insertedLines: number;
  readonly beforeBlock: readonly string[];
  readonly afterBlock: readonly string[];
  readonly lineChanges: readonly Erratum03LineChange[];
  readonly evidence: readonly E03Evidence[];
  readonly pass: boolean;
}

function utf8Length(text: string): number {
  return new TextEncoder().encode(text).byteLength;
}

/** Non-overlapping occurrences of `lines` as whole consecutive lines of `text` (LF-terminated). */
export function countBlockOccurrences(text: string, lines: readonly string[]): number {
  const hay = `\n${text}`;
  const needle = `\n${lines.join('\n')}\n`;
  let n = 0;
  for (let i = hay.indexOf(needle); i !== -1; i = hay.indexOf(needle, i + needle.length - 1))
    n += 1;
  return n;
}

interface BlockPair {
  readonly labelLine: number;
  readonly firstLine: number;
  readonly lastLine: number;
  readonly before: readonly string[];
  readonly after: readonly string[];
  readonly lineShas: readonly {
    specLine: number;
    before: string;
    after: string;
    delta: number;
  }[];
  readonly inserted: { count: number; afterLine: number } | null;
  readonly uniquenessStated: boolean;
}

const BEFORE_LABEL = /^Before \(V1\.1 lines? (\d+)(?:–(\d+))?, byte-exact\):$/;
const LINE_SHA =
  /^- V1\.1 line (\d+): SHA-256 `([0-9a-f]{64})` → `([0-9a-f]{64})` \(([+\-−])(\d+) bytes\)[;.]$/;
const INSERTED = /^- (\d+) line\(s\) inserted after V1\.1 line (\d+); no line removed\.$/;

/** Every Before/After pair of the erratum, with the statements that follow its After fence. */
function readBlockPairs(e03: MarkdownStructure): BlockPair[] {
  const out: BlockPair[] = [];
  e03.lines.forEach((text, index) => {
    const m = BEFORE_LABEL.exec(text);
    if (!m) return;
    const labelLine = index + 1;
    const fences = e03.fences.filter((f) => f.openLine > labelLine).slice(0, 3);
    const [before, after, next] = fences;
    const between = (from: number, to: number): string[] =>
      e03.lines.slice(from, to - 1).filter((l) => l !== '');
    if (
      !before ||
      !after ||
      before.info !== 'text' ||
      after.info !== 'text' ||
      between(labelLine, before.openLine).length !== 0 ||
      JSON.stringify(between(before.closeLine, after.openLine)) !== JSON.stringify(['After:'])
    ) {
      throw new Erratum03DefectError(
        `line ${labelLine}: Before label is not followed by a text fence, "After:" and a text fence`,
      );
    }
    const nextHeading = e03.headings.find((h) => h.line > after.closeLine)?.line ?? Infinity;
    const nextLabel =
      e03.lines.findIndex((l, i) => i + 1 > after.closeLine && BEFORE_LABEL.test(l)) + 1 ||
      Infinity;
    const end = Math.min(nextHeading, nextLabel, next?.openLine ?? Infinity);
    const tail = e03.lines.slice(after.closeLine, Number.isFinite(end) ? end - 1 : undefined);
    const bullets = tail.filter((l) => l.startsWith('- '));
    const lineShas = bullets
      .map((l) => LINE_SHA.exec(l))
      .filter((x): x is RegExpExecArray => x !== null)
      .map((s) => ({
        specLine: Number(s[1]),
        before: s[2]!,
        after: s[3]!,
        delta: (s[4] === '+' ? 1 : -1) * Number(s[5]),
      }));
    const inserted = bullets.map((l) => INSERTED.exec(l)).filter((x) => x !== null);
    if (inserted.length > 1) {
      throw new Erratum03DefectError(`line ${labelLine}: more than one inserted-lines statement`);
    }
    out.push({
      labelLine,
      firstLine: Number(m[1]),
      lastLine: Number(m[2] ?? m[1]),
      before: before.body,
      after: after.body,
      lineShas,
      inserted: inserted[0]
        ? { count: Number(inserted[0][1]), afterLine: Number(inserted[0][2]) }
        : null,
      uniquenessStated: bullets.includes(
        '- the Before block occurs exactly once in the accepted V1.1 bytes;',
      ),
    });
  });
  return out;
}

interface MapRow {
  readonly id: string;
  readonly correctionClass: string;
  readonly quoted: string;
  readonly changed: string;
  readonly inserted: string;
  readonly fragment: string;
}

function readOccurrenceMap(e03: MarkdownStructure): MapRow[] {
  return tableRowIds(sectionLines(e03, '## 4. ', 2), /E03-\d{2}[a-z]?/).map((r) => {
    if (r.cells.length !== 7) {
      throw new Erratum03DefectError(`§4 ${r.id}: ${r.cells.length} cells, expected 7`);
    }
    return {
      id: r.id,
      correctionClass: r.cells[1]!,
      quoted: r.cells[3]!,
      changed: r.cells[4]!,
      inserted: r.cells[5]!,
      fragment: r.cells[6]!,
    };
  });
}

function range(first: number, last: number): string {
  return first === last ? `${first}` : `${first}–${last}`;
}

export interface Erratum03Reading {
  readonly corrections: readonly Erratum03Correction[];
  readonly checks: readonly E03Evidence[];
}

/**
 * Reads the six SQL corrections from identity-verified Erratum 03 text and verifies each against the V1.1
 * bytes, the Erratum 02 occurrences and the (Erratum 02-effective) fragment selection. Pure; never throws
 * for a failed check — callers refuse on any `pass: false`. Throws only on unreadable structure.
 */
export function readErratum03Corrections(
  v11Text: string,
  e03Text: string,
  selection: EffectiveSelection,
  e02Corrections: readonly Erratum02Correction[],
): Erratum03Reading {
  const e03 = parseMarkdown(e03Text);
  const v11Lines = v11Text.slice(0, -1).split('\n');
  const pairs = readBlockPairs(e03);
  const map = readOccurrenceMap(e03);
  const sqlIds = ACCEPTED_ERRATUM_03_SQL_OCCURRENCES.map((o) => o.id);
  const insideBody = (line: number): string | null =>
    selection.fragments.find((f) => line >= f.bodyFirstLine && line <= f.bodyLastLine)?.anchor.id ??
    null;

  const proseRows = map.filter((r) => ACCEPTED_ERRATUM_03_PROSE_OCCURRENCES.includes(r.id));
  const proseLines = proseRows.flatMap((r) => {
    const q = /^(\d+)(?:–(\d+))?$/.exec(r.quoted);
    if (!q) return [];
    const out: number[] = [];
    for (let l = Number(q[1]); l <= Number(q[2] ?? q[1]); l += 1) out.push(l);
    return out;
  });
  const s10 = sectionLines(e03, '## 10. ', 2)
    .map((l) => l.text)
    .find((t) => t.startsWith('1. '));

  const checks: E03Evidence[] = [
    ev(
      '§4 occurrence ids (in order)',
      map.map((r) => r.id),
      [...ERRATUM_03_OCCURRENCE_ORDER],
    ),
    ev(
      '§4 rows with a fragment == the six SQL occurrences',
      map.filter((r) => r.fragment !== '—').map((r) => r.id),
      [...sqlIds],
    ),
    ev(
      '§4 affected fragments',
      [...new Set(map.filter((r) => r.fragment !== '—').map((r) => r.fragment.slice(0, 3)))].sort(),
      [...ERRATUM_03_AFFECTED_FRAGMENTS],
    ),
    ev(
      'Before/After block ranges == §4 quoted ranges (one block per occurrence)',
      pairs.map((p) => range(p.firstLine, p.lastLine)).sort(),
      map.map((r) => r.quoted).sort(),
    ),
    ev(
      'prose / verification-case occurrences lie in no fragment body',
      proseLines.filter((l) => insideBody(l) !== null),
      [],
    ),
    ev(
      'prose / verification-case occurrence rows readable',
      proseRows.length,
      ACCEPTED_ERRATUM_03_PROSE_OCCURRENCES.length,
    ),
    ev(
      '§10 item 1 names exactly the six SQL occurrences',
      [...(s10 ?? '').matchAll(/`(E03-\d{2}[a-z]?)`/g)].map((x) => x[1]),
      [...sqlIds],
    ),
  ];

  const corrections = ACCEPTED_ERRATUM_03_SQL_OCCURRENCES.map((occ): Erratum03Correction => {
    const row = map.find((r) => r.id === occ.id);
    const matching = pairs.filter(
      (p) => p.firstLine === occ.firstLine && p.lastLine === occ.lastLine,
    );
    if (!row || matching.length !== 1) {
      throw new Erratum03DefectError(
        `${occ.id}: missing from §4 or without exactly one Before/After block`,
      );
    }
    const pair = matching[0]!;
    const fragment = selection.fragments.find((f) => f.anchor.id === occ.fragment);
    if (!fragment)
      throw new Erratum03DefectError(`${occ.id}: fragment ${occ.fragment} not selected`);

    const n = occ.lastLine - occ.firstLine + 1;
    const differing: number[] = [];
    for (let i = 0; i < Math.min(n, pair.after.length); i += 1) {
      if (pair.after[i] !== pair.before[i]) differing.push(occ.firstLine + i);
    }
    const lineChanges = occ.changedLines.map((specLine): Erratum03LineChange => {
      const i = specLine - occ.firstLine;
      const sha = pair.lineShas.find((s) => s.specLine === specLine);
      return {
        specLine,
        beforeLine: pair.before[i] ?? '',
        afterLine: pair.after[i] ?? '',
        beforeLineSha256: sha?.before ?? '',
        afterLineSha256: sha?.after ?? '',
        byteDelta: sha?.delta ?? Number.NaN,
      };
    });
    const fragmentFirstLine = occ.firstLine - fragment.bodyFirstLine + 1;
    const fragmentLastLine = occ.lastLine - fragment.bodyFirstLine + 1;
    const e02Lines = e02Corrections.map((c) => c.specLine);

    const evidence = [
      ev('§4 class == registry', row.correctionClass, occ.correctionClass),
      ev('§4 quoted lines == registry', row.quoted, range(occ.firstLine, occ.lastLine)),
      ev('§4 changed lines == registry', row.changed, occ.changedLines.join(', ')),
      ev('§4 inserted lines == registry', row.inserted, `${occ.insertedLines}`),
      ev(
        '§4 fragment (fragment lines) == anchor and V1.1 body offsets',
        row.fragment,
        `${occ.fragment} (${fragmentFirstLine}–${fragmentLastLine})`,
      ),
      ev(
        'quoted block lies inside the fragment body',
        [insideBody(occ.firstLine), insideBody(occ.lastLine)],
        [occ.fragment, occ.fragment],
      ),
      ev(
        'Before block == V1.1 lines (byte-exact)',
        pair.before,
        v11Lines.slice(occ.firstLine - 1, occ.lastLine),
      ),
      ev(
        'Before block occurs exactly once in V1.1',
        countBlockOccurrences(v11Text, pair.before),
        1,
      ),
      ev('uniqueness statement present', pair.uniquenessStated, true),
      ev(
        'After block length == Before length + inserted lines',
        pair.after.length,
        n + occ.insertedLines,
      ),
      ev('lines differing inside the quoted block == registered changed lines', differing, [
        ...occ.changedLines,
      ]),
      ev(
        'stated line SHA-256 statements cover exactly the changed lines',
        pair.lineShas.map((s) => s.specLine),
        [...occ.changedLines],
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
      ev(
        'inserted-lines statement == registry',
        pair.inserted,
        occ.insertedLines === 0 ? null : { count: occ.insertedLines, afterLine: occ.lastLine },
      ),
      ev(
        'no Erratum 02 occurrence lies inside the quoted block',
        e02Lines.filter((l) => l >= occ.firstLine && l <= occ.lastLine),
        [],
      ),
      ev(
        'After block contains no CR and no fence marker',
        pair.after.some((l) => /\r/.test(l) || /^\s*(```|~~~)/.test(l)),
        false,
      ),
    ];
    return {
      id: occ.id,
      correctionClass: occ.correctionClass,
      fragment: occ.fragment,
      clause: fragment.anchor.clause,
      firstLine: occ.firstLine,
      lastLine: occ.lastLine,
      fragmentFirstLine,
      fragmentLastLine,
      insertedLines: occ.insertedLines,
      beforeBlock: pair.before,
      afterBlock: pair.after,
      lineChanges,
      evidence,
      pass: evidence.every((e) => e.pass),
    };
  });

  const blocks = [...corrections].sort((a, b) => a.firstLine - b.firstLine);
  checks.push(
    ev(
      'quoted blocks are pairwise disjoint',
      blocks
        .slice(1)
        .filter((c, i) => c.firstLine <= blocks[i]!.lastLine)
        .map((c) => c.id),
      [],
    ),
  );
  return { corrections, checks };
}

/** A normative fragment as read under M7 V1.1 + accepted Erratum 01 + Erratum 02 + Erratum 03. */
export interface E03EffectiveFragment extends EffectiveFragment {
  /** The fragment after the Erratum 02 stage (`sql` / `sha256` are the final effective bytes). */
  readonly erratum02Sql: string;
  readonly erratum02Sha256: string;
  readonly erratum03Corrections: readonly string[];
}

export interface E03EffectiveSelection extends EffectiveSelection {
  readonly fragments: readonly E03EffectiveFragment[];
}

function splitLines(sql: string): string[] {
  return sql.slice(0, -1).split('\n');
}

/** Lines inserted by the fragment's own corrections strictly before V1.1 line `specLine`. */
function shiftBefore(
  corrections: readonly Erratum03Correction[],
  fragment: string,
  specLine: number,
): number {
  return corrections
    .filter((c) => c.fragment === fragment && c.lastLine < specLine)
    .reduce((n, c) => n + c.insertedLines, 0);
}

/**
 * Applies exactly the six verified block replacements over the Erratum 02-effective fragments, bottom-up
 * within each fragment so that V1.1 line offsets stay valid. The quoted lines must be present unchanged.
 */
export function applyErratum03Corrections(
  selection: EffectiveSelection,
  corrections: readonly Erratum03Correction[],
): E03EffectiveSelection {
  const fragments = selection.fragments.map((f): E03EffectiveFragment => {
    const lines = splitLines(f.sql);
    const own = corrections.filter((c) => c.fragment === f.anchor.id);
    for (const c of [...own].sort((a, b) => b.firstLine - a.firstLine)) {
      const at = c.firstLine - f.bodyFirstLine;
      const current = lines.slice(at, at + c.beforeBlock.length);
      if (JSON.stringify(current) !== JSON.stringify(c.beforeBlock)) {
        throw new Erratum03DefectError(
          `${c.id}: fragment lines ${at + 1}–${at + c.beforeBlock.length} are not the Before block`,
        );
      }
      lines.splice(at, c.beforeBlock.length, ...c.afterBlock);
    }
    const sql = `${lines.join('\n')}\n`;
    return {
      ...f,
      sql,
      sha256: sha256Hex(sql),
      erratum02Sql: f.sql,
      erratum02Sha256: f.sha256,
      // Registry (Erratum 03 §4 / §10) order, not source order.
      erratum03Corrections: own.map((c) => c.id),
    };
  });
  return { ...selection, fragments };
}

/**
 * Post-conditions over the final effective fragments (Erratum 03 §10 items 3–6): every After block at its
 * occurrence, no stale Before block or changed Before line, the inverse replacement reproducing the
 * Erratum 02-effective bytes exactly (so no other byte changed), exactly F01/F11/F24 changed, line counts
 * grown by exactly the inserted lines, Erratum 02 corrections still materialized, and every fragment equal
 * to its pinned Erratum 03 effective SHA-256.
 */
export function auditErratum03Fragments(
  effective: E03EffectiveSelection,
  corrections: readonly Erratum03Correction[],
  e02Corrections: readonly Erratum02Correction[],
): E03Evidence[] {
  const checks: E03Evidence[] = [];
  const byId = new Map(effective.fragments.map((f) => [f.anchor.id, f]));
  for (const c of corrections) {
    const f = byId.get(c.fragment)!;
    const lines = splitLines(f.sql);
    const at = c.fragmentFirstLine - 1 + shiftBefore(corrections, c.fragment, c.firstLine);
    const ownAfter = corrections
      .filter((x) => x.fragment === c.fragment)
      .flatMap((x) => x.afterBlock);
    checks.push(
      ev(
        `${c.id}: effective ${c.fragment} lines ${at + 1}–${at + c.afterBlock.length} == After block`,
        lines.slice(at, at + c.afterBlock.length),
        c.afterBlock,
      ),
      ev(
        `${c.id}: stale Before block occurrences in effective fragments`,
        effective.fragments.reduce((n, x) => n + countBlockOccurrences(x.sql, c.beforeBlock), 0),
        0,
      ),
      ...c.lineChanges.map((lc) =>
        ev(
          `${c.id}: line ${lc.specLine} stale Before line occurrences in ${c.fragment} beyond After blocks`,
          countBlockOccurrences(f.sql, [lc.beforeLine]),
          ownAfter.filter((l) => l === lc.beforeLine).length,
        ),
      ),
    );
  }

  const inverse = effective.fragments
    .filter((f) => {
      const lines = splitLines(f.sql);
      const own = corrections.filter((c) => c.fragment === f.anchor.id);
      for (const c of [...own].sort((a, b) => b.firstLine - a.firstLine)) {
        const at = c.fragmentFirstLine - 1 + shiftBefore(corrections, c.fragment, c.firstLine);
        lines.splice(at, c.afterBlock.length, ...c.beforeBlock);
      }
      return `${lines.join('\n')}\n` !== f.erratum02Sql;
    })
    .map((f) => f.anchor.id);

  const lineGrowth = effective.fragments
    .map(
      (f) => [f.anchor.id, splitLines(f.sql).length - splitLines(f.erratum02Sql).length] as const,
    )
    .filter(([, d]) => d !== 0);
  const expectedGrowth = ERRATUM_03_AFFECTED_FRAGMENTS.map(
    (id) =>
      [
        id,
        corrections.filter((c) => c.fragment === id).reduce((n, c) => n + c.insertedLines, 0),
      ] as const,
  ).filter(([, d]) => d !== 0);

  const e02Preserved = e02Corrections
    .filter((c) => {
      const f = byId.get(c.fragment)!;
      const line = splitLines(f.sql)[
        c.fragmentLine - 1 + shiftBefore(corrections, c.fragment, c.specLine)
      ];
      return line !== c.afterLine || f.sql.includes(c.beforeExpression);
    })
    .map((c) => c.id);

  checks.push(
    ev(
      'inverse replacement of the After blocks reproduces the Erratum 02-effective bytes (no other byte changed)',
      inverse,
      [],
    ),
    ev(
      'fragments whose bytes changed under Erratum 03',
      effective.fragments.filter((f) => f.sql !== f.erratum02Sql).map((f) => f.anchor.id),
      [...ERRATUM_03_AFFECTED_FRAGMENTS],
    ),
    ev('line count growth per fragment == inserted lines', lineGrowth, expectedGrowth),
    ev('Erratum 02 corrections not materialized at their (shifted) lines', e02Preserved, []),
    ev('fragment count', effective.fragments.length, 26),
    ev(
      'every fragment matches its pinned Erratum 03 effective SHA-256',
      effective.fragments
        .filter((f) => f.sha256 !== f.anchor.erratum03EffectiveSha256)
        .map((f) => `${f.anchor.id}: ${f.sha256} ≠ pinned ${f.anchor.erratum03EffectiveSha256}`),
      [],
    ),
    ev(
      'pinned Erratum 03 SHA-256 differs from the Erratum 02 pin exactly for the affected fragments',
      effective.fragments
        .filter((f) => f.anchor.erratum03EffectiveSha256 !== f.anchor.effectiveSha256)
        .map((f) => f.anchor.id),
      [...ERRATUM_03_AFFECTED_FRAGMENTS],
    ),
  );
  return checks;
}

function lineCount(sql: string): number {
  return splitLines(sql).length;
}

/**
 * Cross-check of the informative Erratum 03 §10 item 3 pin table against the derived bytes. The
 * replacement rule, not this table, is normative; a mismatch is an erratum defect and refuses.
 */
export function crossCheckErratum03Pins(
  e03Text: string,
  effective: E03EffectiveSelection,
): E03Evidence[] {
  const e03 = parseMarkdown(e03Text);
  const rows = sectionLines(e03, '## 10. ', 2)
    .map((l) => l.text.trim())
    .filter((t) => /^\| F\d{2} \|/.test(t))
    .map((t) =>
      t
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim()),
    );
  const code = (cell: string): string => cell.replace(/`/g, '').trim();
  const num = (cell: string): number => Number(cell.replace(/ /g, ''));
  const checks: E03Evidence[] = [
    ev(
      '§10 pin table fragments',
      rows.map((r) => r[0]),
      [...ERRATUM_03_AFFECTED_FRAGMENTS],
    ),
  ];
  for (const r of rows) {
    const f = effective.fragments.find((x) => x.anchor.id === r[0]);
    if (!f || r.length !== 9) {
      checks.push(ev(`§10 row ${r[0]} readable`, false, true));
      continue;
    }
    checks.push(
      ev(
        `§10 ${f.anchor.id}: file, current SHA-256, bytes, lines, SHA-256 after, bytes after, lines after, occurrences`,
        [
          code(r[1]!),
          code(r[2]!),
          num(r[3]!),
          num(r[4]!),
          code(r[5]!),
          num(r[6]!),
          num(r[7]!),
          r[8]!.split(',').map(code),
        ],
        [
          `sql/${f.anchor.file}`,
          f.erratum02Sha256,
          utf8Length(f.erratum02Sql),
          lineCount(f.erratum02Sql),
          f.sha256,
          utf8Length(f.sql),
          lineCount(f.sql),
          [...f.erratum03Corrections],
        ],
      ),
    );
  }
  return checks;
}

/**
 * Stale-byte scan of `sql/` artifact texts (`path → text`): every pre-Erratum-03 Before block, and every
 * changed Before line present more often than the fragment's own After blocks account for. Diagnostic
 * companion of the drift check — a stale file also always fails the byte comparison.
 */
export function findStaleErratum03Bytes(
  files: ReadonlyMap<string, string>,
  corrections: readonly Erratum03Correction[],
): string[] {
  const out: string[] = [];
  for (const [path, text] of files) {
    if (!path.startsWith('sql/')) continue;
    for (const c of corrections) {
      if (!path.startsWith(`sql/${c.fragment.slice(1)}_`)) continue;
      const blocks = countBlockOccurrences(text, c.beforeBlock);
      if (blocks > 0) out.push(`${path}: ${c.id} stale pre-Erratum-03 block ×${blocks}`);
      const ownAfter = corrections
        .filter((x) => x.fragment === c.fragment)
        .flatMap((x) => x.afterBlock);
      for (const lc of c.lineChanges) {
        const extra =
          countBlockOccurrences(text, [lc.beforeLine]) -
          ownAfter.filter((l) => l === lc.beforeLine).length;
        if (blocks === 0 && extra > 0) {
          out.push(`${path}: ${c.id} stale pre-Erratum-03 line ${lc.specLine} ×${extra}`);
        }
      }
    }
  }
  return out;
}

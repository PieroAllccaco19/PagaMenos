// M7 V1.1 — S01 normative DDL extraction: source identity and Markdown structure.
//
// Tooling only. Nothing here is M7 runtime, installs anything into PostgreSQL, or is a migration.
// Every function is a total, deterministic procedure over the exact accepted specification bytes;
// any structural surprise is a thrown error (fail closed), never a best-effort guess.
import { createHash } from 'node:crypto';

/** An accepted documentation-authority artifact whose exact bytes S01 is bound to. */
export interface BoundArtifact {
  readonly path: string;
  readonly gitBlob: string;
  readonly sha256: string;
  readonly bytes: number;
  readonly lines: number;
}

/** M7 V1.1 — the accepted base specification (Register §10.1; Erratum 01 §1.2). */
export const M7_V1_1: BoundArtifact = {
  path: 'PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1.md',
  gitBlob: '06e103b0d5e8cfcbb96ab21134d5605b0aae9b26',
  sha256: '457f51778fb5d5890b3e3478376e413072f15aef7da88125b5e78963f49394bd',
  bytes: 1_143_725,
  lines: 10_626,
};

/** M7 V1.1 Erratum 01 — accepted and protected-integrated, clause-scoped (Register §12). */
export const M7_V1_1_ERRATUM_01: BoundArtifact = {
  path: 'PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_01.md',
  gitBlob: '15ee22090d3e37b6a63dd25914f8abb0f4fa9d4b',
  sha256: 'f381cb015adadc7a22463060da7ff55e8711b8ab13879c60f93cabf53eb863e8',
  bytes: 82_027,
  lines: 604,
};

/** M7 V1.1 Erratum 02 — accepted and protected-integrated, occurrence-scoped (Register §14). */
export const M7_V1_1_ERRATUM_02: BoundArtifact = {
  path: 'PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_02.md',
  gitBlob: 'a0e6fa6720f23ac08485ab7cb696ab9ba4b7e83f',
  sha256: 'b7b3440ad04181356770f243a6e2870e004aba604d2a62afdefd5330c85c170f',
  bytes: 44_295,
  lines: 515,
};

/** The current M7 conformance target (Register §14.5; Erratum 02 §4 rule 7). */
export const CONFORMANCE_TARGET = 'M7 V1.1 + accepted Erratum 01 + accepted Erratum 02';

export class SourceIdentityError extends Error {
  constructor(message: string) {
    super(`M7-S01 SOURCE IDENTITY: ${message}`);
    this.name = 'SourceIdentityError';
  }
}

export class SourceStructureError extends Error {
  constructor(message: string) {
    super(`M7-S01 SOURCE STRUCTURE: ${message}`);
    this.name = 'SourceStructureError';
  }
}

export function sha256Hex(data: Uint8Array | string): string {
  return createHash('sha256').update(data).digest('hex');
}

/** Git's blob object id: SHA-1 over `blob <byteLength>\0<bytes>`. */
export function gitBlobId(data: Uint8Array): string {
  return createHash('sha1').update(`blob ${data.byteLength}\0`).update(data).digest('hex');
}

function lineCount(text: string): number {
  // `wc -l` semantics: number of LF bytes.
  let n = 0;
  for (let i = 0; i < text.length; i += 1) if (text.charCodeAt(i) === 10) n += 1;
  return n;
}

/**
 * Verifies the exact bytes of a bound artifact BEFORE anything is read from them, and returns the
 * decoded text. A mismatch in any of blob id, SHA-256, byte length or line count refuses.
 */
export function verifyBoundArtifact(artifact: BoundArtifact, data: Uint8Array): string {
  const observed = {
    gitBlob: gitBlobId(data),
    sha256: sha256Hex(data),
    bytes: data.byteLength,
  };
  if (observed.gitBlob !== artifact.gitBlob) {
    throw new SourceIdentityError(
      `${artifact.path}: git blob ${observed.gitBlob} ≠ expected ${artifact.gitBlob}`,
    );
  }
  if (observed.sha256 !== artifact.sha256) {
    throw new SourceIdentityError(
      `${artifact.path}: sha256 ${observed.sha256} ≠ expected ${artifact.sha256}`,
    );
  }
  if (observed.bytes !== artifact.bytes) {
    throw new SourceIdentityError(
      `${artifact.path}: ${observed.bytes} bytes ≠ expected ${artifact.bytes}`,
    );
  }
  const text = new TextDecoder('utf-8', { fatal: true }).decode(data);
  if (text.includes('\r')) {
    throw new SourceIdentityError(`${artifact.path}: contains CR bytes (LF-only bytes expected)`);
  }
  const lines = lineCount(text);
  if (lines !== artifact.lines) {
    throw new SourceIdentityError(`${artifact.path}: ${lines} lines ≠ expected ${artifact.lines}`);
  }
  return text;
}

export interface Heading {
  /** 1-based source line number. */
  readonly line: number;
  readonly level: number;
  /** The exact full heading line, including the leading `#` characters. */
  readonly text: string;
}

export interface Fence {
  /** 1-based line of the opening ``` marker. */
  readonly openLine: number;
  /** 1-based line of the closing ``` marker. */
  readonly closeLine: number;
  readonly info: string;
  /** Body lines, exactly as in the source, without the fence markers. */
  readonly body: readonly string[];
}

export interface MarkdownStructure {
  /** `lines[i]` is source line `i + 1`. */
  readonly lines: readonly string[];
  readonly headings: readonly Heading[];
  readonly fences: readonly Fence[];
}

const FENCE_OPEN = /^```([A-Za-z0-9_-]*)$/;
const FENCE_CLOSE = /^```$/;
const HEADING = /^(#{1,6}) \S/;

/**
 * Parses the fence and heading structure of the accepted documents. The accepted bytes use only
 * column-0 backtick fences with no indentation, no tildes and no trailing text; anything else is
 * refused rather than interpreted, so the parser cannot silently select a different block.
 */
export function parseMarkdown(text: string): MarkdownStructure {
  if (!text.endsWith('\n')) throw new SourceStructureError('document does not end with LF');
  const lines = text.slice(0, -1).split('\n');
  const headings: Heading[] = [];
  const fences: Fence[] = [];
  let open: { line: number; info: string; body: string[] } | null = null;

  lines.forEach((line, index) => {
    const lineNo = index + 1;
    if (open) {
      if (FENCE_CLOSE.test(line)) {
        fences.push({ openLine: open.line, closeLine: lineNo, info: open.info, body: open.body });
        open = null;
      } else {
        if (/^\s*(```|~~~)/.test(line)) {
          throw new SourceStructureError(`line ${lineNo}: nested or malformed fence marker`);
        }
        open.body.push(line);
      }
      return;
    }
    if (/^\s*(```|~~~)/.test(line)) {
      const m = FENCE_OPEN.exec(line);
      if (!m) throw new SourceStructureError(`line ${lineNo}: unsupported fence marker`);
      open = { line: lineNo, info: m[1] ?? '', body: [] };
      return;
    }
    const h = HEADING.exec(line);
    if (h) headings.push({ line: lineNo, level: h[1]!.length, text: line });
  });
  if (open) throw new SourceStructureError('unterminated fence at end of document');
  return { lines, headings, fences };
}

/** The unique heading whose full line text equals `text`; refuses on zero or several. */
export function uniqueHeading(structure: MarkdownStructure, text: string): Heading {
  const found = structure.headings.filter((h) => h.text === text);
  if (found.length !== 1) {
    throw new SourceStructureError(`heading ${JSON.stringify(text)} occurs ${found.length} times`);
  }
  return found[0]!;
}

/** The unique heading whose line text starts with `prefix`; refuses on zero or several. */
export function uniqueHeadingByPrefix(structure: MarkdownStructure, prefix: string): Heading {
  const found = structure.headings.filter((h) => h.text.startsWith(prefix));
  if (found.length !== 1) {
    throw new SourceStructureError(
      `heading prefix ${JSON.stringify(prefix)} occurs ${found.length} times`,
    );
  }
  return found[0]!;
}

/**
 * Lines of the section that starts at the heading with `startPrefix` and ends before the next
 * heading whose level is ≤ `endLevel` (default: the start heading's own level). Returned as
 * `{ line, text }` pairs so every derived fact can cite its source line.
 */
export function sectionLines(
  structure: MarkdownStructure,
  startPrefix: string,
  endLevel?: number,
): { line: number; text: string }[] {
  const start = uniqueHeadingByPrefix(structure, startPrefix);
  const limit = endLevel ?? start.level;
  const next = structure.headings.find((h) => h.line > start.line && h.level <= limit);
  const endExclusive = next ? next.line : structure.lines.length + 1;
  const out: { line: number; text: string }[] = [];
  for (let l = start.line; l < endExclusive; l += 1)
    out.push({ line: l, text: structure.lines[l - 1]! });
  return out;
}

/**
 * First-cell identifiers of the Markdown table data rows in `section`: every line beginning with `|`
 * whose first cell, with `**` emphasis and backticks removed, matches `idPattern` in full.
 */
export function tableRowIds(
  section: readonly { line: number; text: string }[],
  idPattern: RegExp,
): { line: number; id: string; cells: string[] }[] {
  const anchored = new RegExp(`^(?:${idPattern.source})$`);
  const rows: { line: number; id: string; cells: string[] }[] = [];
  for (const { line, text } of section) {
    if (!text.startsWith('|')) continue;
    const cells = text
      .slice(1, text.endsWith('|') ? -1 : undefined)
      .split(/(?<!\\)\|/)
      .map((c) => c.trim());
    const first = (cells[0] ?? '').replace(/\*\*/g, '').replace(/`/g, '').trim();
    if (anchored.test(first)) rows.push({ line, id: first, cells });
  }
  return rows;
}

/** Non-overlapping occurrence count of `needle` in `haystack`. */
export function countOccurrences(haystack: string, needle: string): number {
  if (needle.length === 0) throw new Error('empty needle');
  let n = 0;
  for (
    let i = haystack.indexOf(needle);
    i !== -1;
    i = haystack.indexOf(needle, i + needle.length)
  ) {
    n += 1;
  }
  return n;
}

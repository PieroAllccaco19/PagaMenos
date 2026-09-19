// M7 V1.1 — S03 verification bootstrap: a minimal, fail-closed lexical reader of the accepted fragments.
//
// Verification tooling only. It splits a fragment into its top-level statements (respecting `--` and
// block comments, single-quoted literals, double-quoted identifiers and dollar-quoted bodies) so the
// expectation derivation (VBA-01 §9.3) can read object names, headers and bodies from the exact accepted
// bytes. It never rewrites SQL; any lexical surprise throws.

export class SqlLexError extends Error {
  constructor(message: string) {
    super(`M7-S03 SQL LEXER: ${message}`);
    this.name = 'SqlLexError';
  }
}

export interface TopLevelStatement {
  /** Offset of the first non-blank character of the statement within the fragment. */
  readonly start: number;
  /** Offset one past the terminating `;` (or the end of the text for an unterminated tail). */
  readonly end: number;
  /** Exact statement bytes, from `start` up to and including the `;`. */
  readonly text: string;
  /** `text` with comments blanked to spaces (offsets and newlines preserved); literals kept. */
  readonly code: string;
  /** 1-based fragment line of `start`. */
  readonly line: number;
}

const DOLLAR_TAG = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/;

/** Splits `sql` into top-level statements. Comment-only / blank tails are dropped. */
export function splitStatements(sql: string): TopLevelStatement[] {
  const code = sql.split('');
  const blank = (from: number, to: number): void => {
    for (let k = from; k < to; k += 1) if (code[k] !== '\n') code[k] = ' ';
  };
  const out: TopLevelStatement[] = [];
  let stmtStart = 0;
  let i = 0;
  const push = (endExclusive: number): void => {
    // Leading comments belong to no statement: the statement starts at its first non-blank code byte.
    const masked = code.slice(stmtStart, endExclusive).join('');
    const lead = masked.length - masked.trimStart().length;
    if (masked.trim().length > 0) {
      const start = stmtStart + lead;
      out.push({
        start,
        end: endExclusive,
        text: sql.slice(start, endExclusive),
        code: masked.slice(lead),
        line: sql.slice(0, start).split('\n').length,
      });
    }
    stmtStart = endExclusive;
  };
  while (i < sql.length) {
    const c = sql[i]!;
    if (c === '-' && sql[i + 1] === '-') {
      const nl = sql.indexOf('\n', i);
      const stop = nl === -1 ? sql.length : nl;
      blank(i, stop);
      i = stop;
    } else if (c === '/' && sql[i + 1] === '*') {
      const stop = sql.indexOf('*/', i + 2);
      if (stop === -1) throw new SqlLexError(`unterminated block comment at offset ${i}`);
      blank(i, stop + 2);
      i = stop + 2;
    } else if (c === "'") {
      let j = i + 1;
      for (;;) {
        if (j >= sql.length) throw new SqlLexError(`unterminated literal at offset ${i}`);
        if (sql[j] === "'" && sql[j + 1] === "'") j += 2;
        else if (sql[j] === "'") break;
        else j += 1;
      }
      i = j + 1;
    } else if (c === '"') {
      const stop = sql.indexOf('"', i + 1);
      if (stop === -1) throw new SqlLexError(`unterminated quoted identifier at offset ${i}`);
      i = stop + 1;
    } else if (c === '$' && (i === 0 || !/[A-Za-z0-9_]/.test(sql[i - 1]!))) {
      const m = DOLLAR_TAG.exec(sql.slice(i));
      if (!m) {
        i += 1;
        continue;
      }
      const tag = m[0];
      const close = sql.indexOf(tag, i + tag.length);
      if (close === -1) throw new SqlLexError(`unterminated dollar quote ${tag} at offset ${i}`);
      i = close + tag.length;
    } else if (c === ';') {
      push(i + 1);
      i += 1;
    } else {
      i += 1;
    }
  }
  push(sql.length);
  return out;
}

/** Collapses every whitespace run to one space and trims. */
export function normalizeSpace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Splits a parenthesised list at its top-level commas. `text` starts at the opening parenthesis; returns
 * the items (untrimmed) and the offset of the matching closing parenthesis.
 */
export function splitParenthesised(text: string): { items: string[]; close: number } {
  if (text[0] !== '(') throw new SqlLexError('expected an opening parenthesis');
  let depth = 0;
  let quote: string | null = null;
  const bounds: number[] = [0];
  for (let k = 0; k < text.length; k += 1) {
    const ch = text[k]!;
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '(') depth += 1;
    else if (ch === ')') {
      depth -= 1;
      if (depth === 0) {
        bounds.push(k);
        const items = bounds.slice(0, -1).map((b, idx) => text.slice(b + 1, bounds[idx + 1]));
        return { items: items.length === 1 && items[0]!.trim() === '' ? [] : items, close: k };
      }
    } else if (ch === ',' && depth === 1) bounds.push(k);
  }
  throw new SqlLexError('unbalanced parenthesis');
}

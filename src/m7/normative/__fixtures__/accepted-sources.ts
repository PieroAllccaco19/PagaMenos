// Test fixture: the accepted M7 V1.1 and Erratum 01 bytes as committed in the repository, and a helper
// that applies line-level mutations to COPIES of them (negative controls never touch the files).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { M7_V1_1, M7_V1_1_ERRATUM_01 } from '../source';

export const REPO_ROOT = process.cwd();

export const v11Bytes: Uint8Array = readFileSync(join(REPO_ROOT, M7_V1_1.path));
export const e01Bytes: Uint8Array = readFileSync(join(REPO_ROOT, M7_V1_1_ERRATUM_01.path));
export const v11Text = new TextDecoder().decode(v11Bytes);
export const e01Text = new TextDecoder().decode(e01Bytes);

/**
 * Returns `text` with `edit` applied to its lines. `lines[i]` is source line `i + 1`; the edit may
 * replace, insert or delete lines. The trailing LF is preserved.
 */
export function editLines(text: string, edit: (lines: string[]) => void): string {
  const lines = text.slice(0, -1).split('\n');
  edit(lines);
  return `${lines.join('\n')}\n`;
}

/** Replaces exactly one occurrence of `from`; throws if it is absent or ambiguous. */
export function replaceOnce(text: string, from: string, to: string): string {
  const first = text.indexOf(from);
  if (first < 0 || text.indexOf(from, first + from.length) >= 0) {
    throw new Error(`replaceOnce: ${JSON.stringify(from.slice(0, 60))} is not unique`);
  }
  return text.slice(0, first) + to + text.slice(first + from.length);
}

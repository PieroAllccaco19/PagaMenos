// M7 S01 — anchored selection of the 26 normative SQL fences of V1.1 §19.2–§19.13. Every negative case
// mutates a COPY of the accepted text and must be refused.
import { describe, expect, it } from 'vitest';

import { editLines, replaceOnce, v11Text } from './__fixtures__/accepted-sources';
import { FRAGMENT_ANCHORS, FragmentSelectionError, selectNormativeFragments } from './fragments';
import { SourceStructureError, sha256Hex } from './source';

// Opening/closing fence lines, independently read off the accepted bytes (`grep -n '^```'`).
const EXPECTED_SPANS: [string, string, number, number][] = [
  ['F01', '19.2', 2378, 2474],
  ['F02', '19.3', 2478, 2529],
  ['F03', '19.4', 2535, 2811],
  ['F04', '19.5', 2819, 2885],
  ['F05', '19.6', 2891, 2926],
  ['F06', '19.7', 2932, 3051],
  ['F07', '19.8', 3054, 3581],
  ['F08', '19.9', 3587, 3905],
  ['F09', '19.10', 3914, 5039],
  ['F10', '19.10.1', 5043, 5182],
  ['F11', '19.11.1', 5211, 5816],
  ['F12', '19.11.2', 5820, 6319],
  ['F13', '19.11.3', 6323, 6385],
  ['F14', '19.11.4', 6389, 6765],
  ['F15', '19.11.5', 6769, 6802],
  ['F16', '19.11.6', 6806, 6831],
  ['F17', '19.11.7', 6839, 6932],
  ['F18', '19.12.1', 6952, 7323],
  ['F19', '19.12.2', 7327, 7544],
  ['F20', '19.12.3', 7548, 7638],
  ['F21', '19.12.4', 7642, 7789],
  ['F22', '19.12.5', 7795, 8158],
  ['F23', '19.12.6', 8166, 8385],
  ['F24', '19.13.2', 8414, 8662],
  ['F25', '19.13.3', 8666, 8813],
  ['F26', '19.13.4', 8817, 8871],
];

describe('normative fragment selection — accepted bytes', () => {
  const selection = selectNormativeFragments(v11Text);

  it('selects exactly the 26 anchored fences, in source order', () => {
    expect(
      selection.fragments.map((f) => [
        f.anchor.id,
        f.anchor.clause,
        f.fenceOpenLine,
        f.fenceCloseLine,
      ]),
    ).toEqual(EXPECTED_SPANS);
    expect(selection.regionStartLine).toBe(2365);
    expect(selection.regionEndLine).toBe(8873);
  });

  it('each fragment is the exact fence body of the source lines, with a pinned SHA-256', () => {
    const lines = v11Text.split('\n');
    for (const f of selection.fragments) {
      const body = `${lines.slice(f.fenceOpenLine, f.fenceCloseLine - 1).join('\n')}\n`;
      expect(f.sql).toBe(body);
      expect(sha256Hex(body)).toBe(f.anchor.bodySha256);
      expect(lines[f.fenceOpenLine - 1]).toBe('```sql');
      expect(lines[f.fenceCloseLine - 1]).toBe('```');
    }
  });

  it('the registry has unique ids, headings and file names, all within §19.2–§19.13', () => {
    expect(new Set(FRAGMENT_ANCHORS.map((a) => a.id)).size).toBe(26);
    expect(new Set(FRAGMENT_ANCHORS.map((a) => a.heading)).size).toBe(26);
    expect(new Set(FRAGMENT_ANCHORS.map((a) => a.file)).size).toBe(26);
    for (const a of FRAGMENT_ANCHORS) {
      expect(a.heading).toMatch(/^#{3,4} 19\.(1[0-3]|[2-9])(\.\d+)? /);
      expect(a.file.startsWith(`${a.id.slice(1)}_${a.clause}_`)).toBe(true);
    }
  });

  it('the accepted document has no sql fence outside the normative region', () => {
    expect(selection.sqlFencesOutsideRegion).toBe(0);
  });
});

describe('normative fragment selection — fail closed', () => {
  it('refuses an unexpected extra fence inside the region', () => {
    const text = editLines(v11Text, (l) => l.splice(2531, 0, '```sql', 'SELECT 1;', '```'));
    expect(() => selectNormativeFragments(text)).toThrow(/27 fences, expected exactly 26/);
  });

  it('refuses a missing fence', () => {
    const text = editLines(v11Text, (l) => {
      l.splice(5181, 1); // closing marker of F10
      l.splice(5042, 1); // opening marker of F10
    });
    expect(() => selectNormativeFragments(text)).toThrow(/25 fences, expected exactly 26/);
  });

  it('refuses a duplicated anchor heading', () => {
    const text = editLines(v11Text, (l) => l.splice(2531, 0, '### 19.3 Enumerated types'));
    expect(() => selectNormativeFragments(text)).toThrow(SourceStructureError);
  });

  it('refuses reordered fragments (two fence bodies swapped)', () => {
    const text = editLines(v11Text, (l) => {
      const f05 = l.slice(2891, 2925);
      const f06 = l.slice(2932, 3050);
      l.splice(2932, 118, ...f05);
      l.splice(2891, 34, ...f06);
    });
    expect(() => selectNormativeFragments(text)).toThrow(FragmentSelectionError);
  });

  it('refuses a reordered anchor registry', () => {
    const swapped = [...FRAGMENT_ANCHORS];
    [swapped[4], swapped[5]] = [swapped[5]!, swapped[4]!];
    expect(() => selectNormativeFragments(v11Text, swapped)).toThrow(
      /out of order|not directly under/,
    );
  });

  it('refuses a registry with a missing or duplicated anchor', () => {
    expect(() => selectNormativeFragments(v11Text, FRAGMENT_ANCHORS.slice(1))).toThrow(/25 rows/);
    const dup = [...FRAGMENT_ANCHORS];
    dup[1] = { ...dup[0]! };
    expect(() => selectNormativeFragments(v11Text, dup)).toThrow(/duplicate/);
  });

  it('refuses a normative fence whose info string is not sql', () => {
    const text = editLines(v11Text, (l) => {
      l[2477] = '```text';
    });
    expect(() => selectNormativeFragments(text)).toThrow(/expected "sql"/);
  });

  it('refuses a fence re-anchored under a different heading', () => {
    // Inserted immediately before F02's opening marker (source line 2478).
    const text = editLines(v11Text, (l) => l.splice(2477, 0, '#### 19.3.9 Interposed note', ''));
    expect(() => selectNormativeFragments(text)).toThrow(/not directly under/);
  });

  it('refuses a single drifted byte inside a fragment body', () => {
    const text = replaceOnce(
      v11Text,
      "CREATE TYPE m7.\"M7ObjectZone\"              AS ENUM ('STAGING','CANONICAL');",
      "CREATE TYPE m7.\"M7ObjectZone\"              AS ENUM ('STAGING','CANONICAl');",
    );
    expect(() => selectNormativeFragments(text)).toThrow(/F02: body sha256/);
  });

  it('never selects explanatory SQL outside the normative region', () => {
    const text = editLines(v11Text, (l) =>
      l.splice(2300, 0, '```sql', 'CREATE TABLE m7.explanatory_example ();', '```'),
    );
    const selection = selectNormativeFragments(text);
    expect(selection.fragments).toHaveLength(26);
    expect(selection.sqlFencesOutsideRegion).toBe(1);
    expect(selection.fragments.some((f) => f.sql.includes('explanatory_example'))).toBe(false);
  });
});

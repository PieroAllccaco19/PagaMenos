// M7 S01 — Erratum 04 occurrence-scoped SQL invocation-syntax corrections (E04-01 … E04-06), read from the
// accepted erratum bytes and verified against V1.1, the Erratum 03-effective fragments and a mechanical
// `unnest` census. Every negative case mutates a COPY of the accepted text or of the derived fragments and
// must be refused.
import { describe, expect, it } from 'vitest';

import { e02Text, e03Text, e04Text, replaceOnce, v11Text } from './__fixtures__/accepted-sources';
import { applyErratum02Corrections, readErratum02Corrections } from './erratum-02-corrections';
import { applyErratum03Corrections, readErratum03Corrections } from './erratum-03-corrections';
import {
  ACCEPTED_ERRATUM_04_OCCURRENCES,
  type E04EffectiveSelection,
  ERRATUM_04_F12_PINS,
  ERRATUM_04_PRESERVED_SINGLE_ARRAY_CALLS,
  Erratum04DefectError,
  applyErratum04Corrections,
  auditErratum04Fragments,
  censusUnnest,
  crossCheckErratum04Pins,
  maskSql,
  readErratum04Corrections,
} from './erratum-04-corrections';
import { selectNormativeFragments } from './fragments';
import { deriveInventory } from './inventory';
import { sha256Hex } from './source';

const v11Selection = selectNormativeFragments(v11Text);
const e02 = readErratum02Corrections(v11Text, e02Text, v11Selection);
const e02Selection = applyErratum02Corrections(v11Selection, e02.corrections);
const e03 = readErratum03Corrections(v11Text, e03Text, e02Selection, e02.corrections);
const e03Selection = applyErratum03Corrections(e02Selection, e03.corrections);
const reading = readErratum04Corrections(
  v11Text,
  e04Text,
  v11Selection,
  e03Selection,
  e02.corrections,
  e03.corrections,
);
const effective = applyErratum04Corrections(e03Selection, reading.corrections);

function failures(e04: string): string[] {
  const r = readErratum04Corrections(
    v11Text,
    e04,
    v11Selection,
    e03Selection,
    e02.corrections,
    e03.corrections,
  );
  return [
    ...r.checks.filter((c) => !c.pass).map((c) => c.check),
    ...r.corrections.flatMap((c) =>
      c.evidence.filter((e) => !e.pass).map((e) => `${c.id} ${e.check}`),
    ),
  ];
}

function failedAudit(selection: E04EffectiveSelection): string[] {
  return auditErratum04Fragments(selection, reading)
    .filter((c) => !c.pass)
    .map((c) => c.check);
}

function withFragment(id: string, edit: (sql: string) => string): E04EffectiveSelection {
  return {
    ...effective,
    fragments: effective.fragments.map((f) => {
      if (f.anchor.id !== id) return f;
      const sql = edit(f.sql);
      return { ...f, sql, sha256: sha256Hex(sql) };
    }),
  };
}

describe('Erratum 04 — accepted bytes', () => {
  it('reads exactly the six registered occurrences and every check passes', () => {
    expect(reading.checks.filter((c) => !c.pass)).toEqual([]);
    expect(
      reading.corrections.map((c) => [
        c.id,
        c.fragment,
        c.firstLine,
        c.lastLine,
        c.fragmentFirstLine,
        c.fragmentLastLine,
        c.lineChanges.map((l) => [l.specLine, l.fragmentLine]),
        c.arrays,
        c.targetTable,
        c.byteDelta,
      ]),
    ).toEqual([
      ['E04-01', 'F12', 6298, 6299, 478, 479, [[6299, 479]], 2, 'm7.m7_expected_relation', 31],
      [
        'E04-02',
        'F12',
        6301,
        6303,
        481,
        483,
        [[6303, 483]],
        4,
        'm7.m7_expected_relation_object',
        69,
      ],
      [
        'E04-03',
        'F12',
        6304,
        6307,
        484,
        487,
        [
          [6306, 486],
          [6307, 487],
        ],
        4,
        'm7.m7_expected_function',
        62,
      ],
      [
        'E04-04',
        'F12',
        6308,
        6309,
        488,
        489,
        [[6309, 489]],
        2,
        'm7.m7_expected_function_grant',
        31,
      ],
      ['E04-05', 'F12', 6310, 6312, 490, 492, [[6312, 492]], 4, 'm7.m7_expected_role', 69],
      ['E04-06', 'F12', 6313, 6314, 493, 494, [[6314, 494]], 2, 'm7.m7_expected_role_member', 31],
    ]);
    for (const c of reading.corrections) {
      expect(c.evidence.filter((e) => !e.pass)).toEqual([]);
      expect(c.pass).toBe(true);
      expect(c.enclosingFunction).toBe('m7.c_load_catalog_expectations_v1');
    }
    expect(reading.corrections.map((c) => c.id)).toEqual(
      ACCEPTED_ERRATUM_04_OCCURRENCES.map((o) => o.id),
    );
  });

  it('every After statement is the ROWS FROM form of exactly the Before arrays, in order', () => {
    for (const c of reading.corrections) {
      expect(c.arguments).toHaveLength(c.arrays);
      expect(c.afterFromItem).toBe(
        `ROWS FROM (${c.arguments.map((a) => `pg_catalog.unnest(${a})`).join(', ')})`,
      );
      expect(c.beforeCall.replace(/\s+/g, ' ')).toBe(
        `pg_catalog.unnest(${c.arguments.join(', ')})`,
      );
    }
    expect(reading.corrections.find((c) => c.id === 'E04-03')!.arguments).toEqual([
      'p_function_signatures',
      'p_function_definer',
      'p_function_proconfig',
      'p_function_source_sha256',
    ]);
  });

  it('the census of the Erratum 03-effective fragments reproduces §6: 12 qualified calls, 6 defects, all in F12', () => {
    expect(reading.census.map((c) => [c.fragment, c.fragmentLine, c.specLine, c.args])).toEqual([
      ['F10', '49', '5092', 1],
      ['F11', '404', '5613', 1],
      ['F12', '286', '6106', 1],
      ['F12', '294', '6114', 1],
      ['F12', '308', '6128', 1],
      ['F12', '326', '6146', 1],
      ['F12', '479', '6299', 2],
      ['F12', '483', '6303', 4],
      ['F12', '486–487', '6306–6307', 4],
      ['F12', '489', '6309', 2],
      ['F12', '492', '6312', 4],
      ['F12', '494', '6314', 2],
    ]);
    expect(reading.preservedCalls.map((p) => [p.fragment, p.fragmentLine, p.specLine])).toEqual(
      ERRATUM_04_PRESERVED_SINGLE_ARRAY_CALLS.map((p) => [p.fragment, p.fragmentLine, p.specLine]),
    );
  });

  it('applies to F12 only, keeps every line count, and yields the pinned F12 identity', () => {
    expect(failedAudit(effective)).toEqual([]);
    expect(crossCheckErratum04Pins(e04Text, effective).filter((c) => !c.pass)).toEqual([]);
    const f12 = effective.fragments.find((f) => f.anchor.id === 'F12')!;
    expect([
      f12.sha256,
      new TextEncoder().encode(f12.sql).byteLength,
      f12.sql.split('\n').length - 1,
    ]).toEqual([
      ERRATUM_04_F12_PINS.after.sha256,
      ERRATUM_04_F12_PINS.after.bytes,
      ERRATUM_04_F12_PINS.after.lines,
    ]);
    expect(f12.erratum03Sha256).toBe(ERRATUM_04_F12_PINS.before.sha256);
    expect(f12.erratum04Corrections).toEqual([
      'E04-01',
      'E04-02',
      'E04-03',
      'E04-04',
      'E04-05',
      'E04-06',
    ]);
    for (const f of effective.fragments.filter((x) => x.anchor.id !== 'F12')) {
      expect(f.sql).toBe(f.erratum03Sql);
      expect(f.sha256).toBe(f.anchor.erratum03EffectiveSha256);
      expect(f.erratum04Corrections).toEqual([]);
    }
  });

  it('the F12 census after Erratum 04: 10 unnest call sites = 4 single-array + 6 ROWS FROM; 0 multi-array', () => {
    const f12 = effective.fragments.find((f) => f.anchor.id === 'F12')!;
    const census = censusUnnest(f12.sql);
    expect(census.calls.filter((c) => c.schema !== 'pg_catalog')).toEqual([]);
    expect(census.calls.filter((c) => c.args.length !== 1)).toEqual([]);
    expect(census.rowsFromLines).toEqual([479, 483, 486, 489, 492, 494]);
    const insideRowsFrom = census.calls.filter((c) => c.line >= 478);
    const standalone = census.calls.filter((c) => c.line < 478);
    expect(standalone.map((c) => [c.line, c.text])).toEqual([
      [286, 'pg_catalog.unnest(p_merchant_refs)'],
      [294, 'pg_catalog.unnest(p_merchant_refs)'],
      [308, 'pg_catalog.unnest(p_merchant_refs)'],
      [326, 'pg_catalog.unnest(p_merchant_refs)'],
    ]);
    expect(insideRowsFrom).toHaveLength(18);
    expect(standalone.length + census.rowsFrom).toBe(10);
  });

  it('the mechanical inventory is unchanged by Erratum 04', () => {
    expect(deriveInventory(v11Text, effective)).toEqual(deriveInventory(v11Text, e03Selection));
  });
});

describe('Erratum 04 — lexical census', () => {
  it('ignores unnest text inside comments and string literals, and reads qualifiers', () => {
    const sql = [
      "SELECT 'pg_catalog.unnest(a, b)' -- pg_catalog.unnest(x, y)",
      '/* unnest(q) */ FROM pg_catalog . unnest ( a , b ) AS t(x,y);',
      'SELECT * FROM "s".unnest(z), unnest(a, b), foo_unnest(c);',
      'SELECT * FROM ROWS FROM (pg_catalog.unnest(a)) AS r;',
    ].join('\n');
    const c = censusUnnest(`${sql}\n`);
    expect(c.calls.map((x) => [x.schema, x.line, x.args])).toEqual([
      ['pg_catalog', 2, ['a', 'b']],
      ['s', 3, ['z']],
      [null, 3, ['a', 'b']],
      ['pg_catalog', 4, ['a']],
    ]);
    expect(c.rowsFromLines).toEqual([4]);
    expect(c.rawUnnestTokens).not.toBe(c.maskedUnnestTokens);
    expect(maskSql("a 'x''y' b")).toBe('a        b');
  });

  it('refuses an unterminated literal or unbalanced call instead of guessing', () => {
    expect(() => censusUnnest("SELECT 'x\n")).toThrow(Erratum04DefectError);
    expect(() => censusUnnest('SELECT pg_catalog.unnest(a\n')).toThrow(Erratum04DefectError);
  });
});

describe('Erratum 04 — refusal of mutated erratum text (fail closed)', () => {
  const before01 =
    '        SELECT p_manifest_version, a, b FROM pg_catalog.unnest(p_relation_names, p_relation_kinds) AS t(a,b);';
  const after01 =
    '        SELECT p_manifest_version, a, b FROM ROWS FROM (pg_catalog.unnest(p_relation_names), pg_catalog.unnest(p_relation_kinds)) AS t(a,b);';

  it('an After statement that reorders the arrays is refused', () => {
    const mutated = replaceOnce(
      e04Text,
      after01,
      '        SELECT p_manifest_version, a, b FROM ROWS FROM (pg_catalog.unnest(p_relation_kinds), pg_catalog.unnest(p_relation_names)) AS t(a,b);',
    );
    expect(failures(mutated)).toEqual(
      expect.arrayContaining([
        'E04-01 After FROM item == ROWS FROM of one pg_catalog.unnest per array, same order (whitespace-normalised)',
      ]),
    );
  });

  it('an After statement that changes a byte outside the FROM item is refused', () => {
    const mutated = replaceOnce(e04Text, after01, after01.replace('AS t(a,b)', 'AS t(b,a)'));
    expect(failures(mutated)).toEqual(
      expect.arrayContaining([
        'E04-01 After == Before outside the FROM item (byte-exact prefix and suffix)',
      ]),
    );
  });

  it('a Before statement that is not the V1.1 bytes is refused', () => {
    const mutated = replaceOnce(
      e04Text,
      `\`\`\`sql\n    INSERT INTO m7.m7_expected_relation ("manifestVersion","relationName","relKind")\n${before01}`,
      `\`\`\`sql\n    INSERT INTO m7.m7_expected_relation ("manifestVersion","relationName","relKind")\n${before01} `,
    );
    expect(failures(mutated)).toEqual(
      expect.arrayContaining(['E04-01 Before statement == V1.1 lines (byte-exact)']),
    );
  });

  it('a wrong named V1.1 line is refused', () => {
    const mutated = replaceOnce(
      e04Text,
      '| V1.1 statement lines | 6298–6299 (changed: 6299) |',
      '| V1.1 statement lines | 6297–6298 (changed: 6298) |',
    );
    expect(failures(mutated)).toEqual(
      expect.arrayContaining(['E04-01 §7 V1.1 statement lines == registry']),
    );
  });

  it('a wrong stated statement or line SHA-256 is refused', () => {
    const mutated = replaceOnce(
      e04Text,
      '`1b802600156dd584ed693358e2fd9c2d0dc454ee128ce1b7995a57327231d522` (225 bytes)',
      '`1b802600156dd584ed693358e2fd9c2d0dc454ee128ce1b7995a57327231d523` (225 bytes)',
    );
    expect(failures(mutated)).toEqual(
      expect.arrayContaining(['E04-01 statement SHA-256 (corrected) and bytes reproduce']),
    );
  });

  it('an additional E04 occurrence named in the document is refused', () => {
    const mutated = replaceOnce(
      e04Text,
      'Total delta: +293 bytes',
      'Total delta (see also `E04-07`): +293 bytes',
    );
    expect(failures(mutated)).toEqual(
      expect.arrayContaining([
        'every E04-nn identifier in the document is a registered occurrence',
      ]),
    );
  });

  it('a census row that reclassifies a single-array F12 call is refused', () => {
    const mutated = replaceOnce(
      e04Text,
      '| 3 | F12 / §19.11.2 | 286 | 6106 | `m7.c_register_merchant_vocabulary_v1` | 1 | `pg_catalog.unnest(p_merchant_refs)` | VALID |',
      '| 3 | F12 / §19.11.2 | 286 | 6106 | `m7.c_register_merchant_vocabulary_v1` | 1 | `pg_catalog.unnest(p_merchant_refs)` | **DEFECT `E04-00`** |',
    );
    expect(failures(mutated)).toEqual(
      expect.arrayContaining([
        '§6.3 census table == mechanical census of the Erratum 03-effective fragments',
      ]),
    );
  });

  it('a wrong informative F12 pin is refused', () => {
    const mutated = e04Text.replace(
      /c154aee0e1d441d405f5a0e7c25d883aa643b40fc0458a99061d9f9145c147da/g,
      'c154aee0e1d441d405f5a0e7c25d883aa643b40fc0458a99061d9f9145c147db',
    );
    expect(
      crossCheckErratum04Pins(mutated, effective)
        .filter((c) => !c.pass)
        .map((c) => c.check),
    ).toEqual([
      '§7.7 effective F12 after Erratum 04: sha256, bytes, lines',
      '§11 F12: file, current SHA-256, bytes, lines, SHA-256 after, bytes after, lines after, occurrences',
    ]);
  });

  it('a missing §7 occurrence section refuses to read', () => {
    const mutated = replaceOnce(e04Text, '### 7.4 `E04-04` — ', '### 7.4 `E04-4` — ');
    expect(() => failures(mutated)).toThrow();
  });
});

describe('Erratum 04 — post-condition audit (fail closed)', () => {
  const F12 = 'F12';
  it('a remaining multi-array qualified call is refused', () => {
    const c = reading.corrections[0]!;
    const mutated = withFragment(F12, (sql) =>
      sql.replace(c.afterBlock.join('\n'), () => c.beforeBlock.join('\n')),
    );
    expect(failedAudit(mutated)).toEqual(
      expect.arrayContaining([
        'qualified multi-array unnest calls in the effective fragments',
        'E04-01: stale Before statement occurrences in effective fragments',
        'E04-01: effective F12 lines 478–479 == After statement',
        'F12 effective identity == pinned Erratum 04 (sha256, bytes, lines)',
      ]),
    );
  });

  it('a changed preserved single-array call is refused', () => {
    const mutated = withFragment(F12, (sql) =>
      sql.replace(
        'INTO v_supplied FROM pg_catalog.unnest(p_merchant_refs) AS r;',
        'INTO v_supplied FROM ROWS FROM (pg_catalog.unnest(p_merchant_refs)) AS r;',
      ),
    );
    expect(failedAudit(mutated)).toEqual(
      expect.arrayContaining([
        'preserved single-array calls byte-identical at their fragment lines',
        'ROWS FROM lines per fragment == the six After statements',
        'inverse replacement of the After statements reproduces the Erratum 03-effective bytes (no other byte changed)',
      ]),
    );
  });

  it('a second changed fragment is refused', () => {
    const mutated = withFragment('F13', (sql) => `${sql}-- drift\n`);
    expect(failedAudit(mutated)).toEqual(
      expect.arrayContaining([
        'fragments whose bytes changed under Erratum 04',
        'fragments whose line count changed under Erratum 04',
        'every other fragment matches its pinned Erratum 03 effective SHA-256',
      ]),
    );
  });

  it('refuses to apply over a fragment whose Before statement is absent', () => {
    expect(() => applyErratum04Corrections(effective, reading.corrections)).toThrow(
      Erratum04DefectError,
    );
  });
});

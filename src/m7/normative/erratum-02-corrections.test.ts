// M7 S01 — Erratum 02 occurrence-scoped corrections E02-01…E02-09, read from the accepted erratum bytes
// and verified against V1.1. Every negative case mutates a COPY of the accepted text or of the derived
// fragments and must be refused.
import { describe, expect, it } from 'vitest';

import { e02Text, replaceOnce, v11Text } from './__fixtures__/accepted-sources';
import {
  ACCEPTED_ERRATUM_02_OCCURRENCES,
  type EffectiveSelection,
  type Erratum02Correction,
  applyErratum02Corrections,
  auditEffectiveFragments,
  crossCheckInformativePins,
  readErratum02Corrections,
} from './erratum-02-corrections';
import { FRAGMENT_ANCHORS, selectNormativeFragments } from './fragments';
import { deriveInventory, reconcileInventory } from './inventory';
import { checkMdMgPreconditions, toCheckedFragments } from './manifest-digest-preconditions';
import { sha256Hex } from './source';

const v11Selection = selectNormativeFragments(v11Text);
const reading = readErratum02Corrections(v11Text, e02Text, v11Selection);
const effective = applyErratum02Corrections(v11Selection, reading.corrections);

function failures(e02: string): string[] {
  const r = readErratum02Corrections(v11Text, e02, v11Selection);
  return [
    ...r.checks.filter((c) => !c.pass).map((c) => c.check),
    ...r.corrections.flatMap((c) =>
      c.evidence.filter((e) => !e.pass).map((e) => `${c.id} ${e.check}`),
    ),
  ];
}

function failedAudit(selection: EffectiveSelection, corrections = reading.corrections): string[] {
  return auditEffectiveFragments(selection, corrections)
    .filter((c) => !c.pass)
    .map((c) => c.check);
}

function withFragment(id: string, edit: (sql: string) => string): EffectiveSelection {
  return {
    ...effective,
    fragments: effective.fragments.map((f) => {
      if (f.anchor.id !== id) return f;
      const sql = edit(f.sql);
      return { ...f, sql, sha256: sha256Hex(sql) };
    }),
  };
}

describe('Erratum 02 — accepted bytes', () => {
  it('reads exactly the nine registered occurrences and every check passes', () => {
    expect(reading.checks.filter((c) => !c.pass)).toEqual([]);
    expect(reading.corrections.map((c) => [c.id, c.fragment, c.specLine, c.fragmentLine])).toEqual([
      ['E02-01', 'F09', 4494, 580],
      ['E02-02', 'F09', 4545, 631],
      ['E02-03', 'F09', 4853, 939],
      ['E02-04', 'F11', 5442, 231],
      ['E02-05', 'F17', 6912, 73],
      ['E02-06', 'F23', 8219, 53],
      ['E02-07', 'F23', 8221, 55],
      ['E02-08', 'F23', 8222, 56],
      ['E02-09', 'F26', 8826, 9],
    ]);
    for (const c of reading.corrections) {
      expect(
        c.evidence.filter((e) => !e.pass),
        c.id,
      ).toEqual([]);
      expect(c.pass).toBe(true);
    }
    expect(reading.corrections.map((c) => c.subClass)).toEqual([
      'SX-P',
      'SX-P',
      'SX-R',
      'SX-P',
      'SX-R',
      'SX-P',
      'SX-P',
      'SX-P',
      'SX-P',
    ]);
  });

  it('the substituted expressions are exactly the Erratum 02 §6 invocation-syntax corrections', () => {
    expect(
      reading.corrections.map((c) => [c.beforeExpression, c.afterExpression, c.byteDelta]),
    ).toEqual([
      [
        `pg_catalog.substring(NEW."stagingObjectKey" FROM '[0-9a-f]{32}$')`,
        `pg_catalog.substring(NEW."stagingObjectKey", '[0-9a-f]{32}$')`,
        -4,
      ],
      [
        `pg_catalog.substring(NEW."canonicalObjectKey" FROM '[0-9a-f]{32}$')`,
        `pg_catalog.substring(NEW."canonicalObjectKey", '[0-9a-f]{32}$')`,
        -4,
      ],
      ['pg_catalog.coalesce(v_prev, 0)', 'COALESCE(v_prev, 0)', -11],
      [
        'pg_catalog.extract(epoch FROM p_write_completion_window)',
        "pg_catalog.extract('epoch', p_write_completion_window)",
        -2,
      ],
      [
        'pg_catalog.coalesce(pg_catalog.max(mm."mintSeq"), 0)',
        'COALESCE(pg_catalog.max(mm."mintSeq"), 0)',
        -11,
      ],
      [
        "pg_catalog.substring(p_object_key FROM '/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/[0-9a-f]{32}$')",
        "pg_catalog.substring(p_object_key, '/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/[0-9a-f]{32}$')",
        -4,
      ],
      [
        "pg_catalog.substring(p_object_key FROM '/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/g[0-9]+/[0-9a-f]{32}$')",
        "pg_catalog.substring(p_object_key, '/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/g[0-9]+/[0-9a-f]{32}$')",
        -4,
      ],
      [
        "pg_catalog.substring(p_object_key FROM '/g([0-9]+)/[0-9a-f]{32}$')",
        "pg_catalog.substring(p_object_key, '/g([0-9]+)/[0-9a-f]{32}$')",
        -4,
      ],
      ['pg_catalog.substring(p.proname FROM 1 FOR 2)', 'pg_catalog.substring(p.proname, 1, 2)', -7],
    ]);
  });

  it('effective fragments: nine changed lines, five changed fragments, pins and §9 table reproduce', () => {
    expect(failedAudit(effective)).toEqual([]);
    expect(crossCheckInformativePins(e02Text, effective).filter((c) => !c.pass)).toEqual([]);
    expect(
      effective.fragments.filter((f) => f.sql !== f.v11Sql).map((f) => [f.anchor.id, f.sha256]),
    ).toEqual([
      ['F09', 'c2bb8b38feaf6cbb1559ae0c1396d34344094008a75e81f7406f9a239225c75c'],
      ['F11', '4803e194d62b3b3926e3b98a84d00ede902a485e04aed5de73533207f950be0a'],
      ['F17', 'ca844588d08e5eb3e40d82676daf4dbf767539d576902372738b9f15b715175c'],
      ['F23', '1e0891b67d2aff6deea2db244a464b0de4dd1e0da5415c9048f861d04fcc75c5'],
      ['F26', '3a463c0c3b9602daccfef772da49420fea2284304947bad1d8973bf0358a449f'],
    ]);
    for (const f of effective.fragments.filter((x) => x.erratum02Corrections.length === 0)) {
      expect(f.sql).toBe(f.v11Sql);
      expect(f.sha256).toBe(f.anchor.bodySha256);
    }
  });

  it('the inventory and MD/MG preconditions are unchanged over the effective fragments', () => {
    const inv = deriveInventory(v11Text, effective);
    expect(reconcileInventory(inv).filter((c) => !c.pass)).toEqual([]);
    expect(inv).toEqual(deriveInventory(v11Text, v11Selection));
    expect(checkMdMgPreconditions(toCheckedFragments(effective.fragments))).toEqual(
      checkMdMgPreconditions(toCheckedFragments(v11Selection.fragments)),
    );
  });

  it('the registry pins exactly nine occurrences in exactly the five affected fragments', () => {
    expect(ACCEPTED_ERRATUM_02_OCCURRENCES).toHaveLength(9);
    expect(
      FRAGMENT_ANCHORS.filter((a) => a.effectiveSha256 !== a.bodySha256).map((a) => a.id),
    ).toEqual(['F09', 'F11', 'F17', 'F23', 'F26']);
  });
});

describe('Erratum 02 — fail closed (mutated erratum text)', () => {
  it('refuses a Before line that no longer equals the V1.1 line', () => {
    const e02 = replaceOnce(
      e02Text,
      '               CASE pg_catalog.substring(p.proname FROM 1 FOR 2)\n',
      '              CASE pg_catalog.substring(p.proname FROM 1 FOR 2)\n',
    );
    expect(failures(e02)).toContain('E02-09 §6 Before line == V1.1 line (byte-exact)');
  });

  it('refuses an After line that changes a byte outside the Before expression', () => {
    const e02 = replaceOnce(
      e02Text,
      "        v_epoch_text := pg_catalog.substring(p_object_key, '/g([0-9]+)/[0-9a-f]{32}$');\n",
      "        v_epoch_text  := pg_catalog.substring(p_object_key, '/g([0-9]+)/[0-9a-f]{32}$');\n",
    );
    const f = failures(e02);
    expect(f).toContain(
      'E02-08 After line differs from Before line only inside the Before expression',
    );
  });

  it('refuses an After expression that differs from the §5.3 ordinary form (e.g. a partial correction)', () => {
    const e02 = replaceOnce(
      e02Text,
      "        pg_catalog.extract('epoch', p_write_completion_window)::text));\n",
      '        pg_catalog.extract(epoch, p_write_completion_window)::text));\n',
    );
    const f = failures(e02);
    expect(f).toContain('E02-04 After expression == §5.3 ordinary-form equivalent');
    expect(f).toContain('E02-04 After line SHA-256 reproduces');
  });

  it('refuses an occurrence moved to a different V1.1 line', () => {
    const e02 = replaceOnce(
      e02Text,
      '### 6.3 `E02-03` — V1.1 line 4853,',
      '### 6.3 `E02-03` — V1.1 line 4854,',
    );
    expect(failures(e02)).toContain('E02-03 §6 heading V1.1 line == registry');
  });

  it('refuses a wrong stated line SHA-256 or byte delta', () => {
    const sha = replaceOnce(
      e02Text,
      'after `4d02a69ae295f224ae94fb640891af3f1325b9583b2951e0f0f69bf91e4d0cb9`',
      `after \`${'0'.repeat(64)}\``,
    );
    expect(failures(sha)).toContain('E02-08 After line SHA-256 reproduces');
    const delta = replaceOnce(e02Text, '(−7 bytes)', '(−6 bytes)');
    expect(failures(delta)).toContain(
      'E02-09 line byte delta == len(After) − len(Before) == stated delta',
    );
  });

  it('refuses a missing correction', () => {
    const e02 = replaceOnce(e02Text, '### 6.5 `E02-05`', '### 6.5 `E02-5`');
    expect(() => failures(e02)).toThrow(/E02-05: missing from §6 or §5.3/);
    const row = replaceOnce(e02Text, '| `E02-05` | F17 /', '| `E02-5` | F17 /');
    expect(() => failures(row)).toThrow(/E02-05: missing from §6 or §5.3/);
  });

  it('refuses an informative §9 pin that does not reproduce', () => {
    const e02 = replaceOnce(e02Text, '| 12 885 | 218 |', '| 12 886 | 218 |');
    expect(
      crossCheckInformativePins(e02, effective)
        .filter((c) => !c.pass)
        .map((c) => c.check),
    ).toEqual(['§9 F23: file, V1.1 pin, bytes, effective SHA-256, bytes after, lines']);
  });
});

describe('Erratum 02 — fail closed (mutated effective fragments)', () => {
  it.each(reading.corrections.map((c) => [c.id, c] as const))(
    'refuses %s reverted to its stale spelling',
    (_id, c: Erratum02Correction) => {
      const mutated = withFragment(c.fragment, (sql) =>
        replaceOnce(sql, c.afterLine, c.beforeLine),
      );
      const failed = failedAudit(mutated);
      expect(failed).toContain(
        `${c.id}: stale Before expression occurrences in effective fragments`,
      );
      expect(failed).toContain('every fragment matches its pinned effective SHA-256');
    },
  );

  it('refuses a tenth substitution', () => {
    const mutated = withFragment('F21', (sql) =>
      replaceOnce(sql, 'COALESCE(', 'pg_catalog.coalesce('),
    );
    const failed = failedAudit(mutated);
    expect(failed).toContain(
      'changed lines (fragment:V1.1 line) == the nine registered occurrences, no tenth',
    );
    expect(failed).toContain('fragments whose bytes changed');
  });

  it('refuses a correction applied at an incorrect occurrence', () => {
    const c = reading.corrections.find((x) => x.id === 'E02-07')!;
    const mutated = withFragment('F23', (sql) => {
      const lines = sql.split('\n');
      const at = c.fragmentLine - 1;
      [lines[at], lines[at + 1]] = [lines[at + 1]!, lines[at]!];
      return lines.join('\n');
    });
    expect(failedAudit(mutated)).toContain('E02-07: effective F23 line 55 == After line');
  });

  it('refuses a corrupted affected-fragment pin', () => {
    const mutated: EffectiveSelection = {
      ...effective,
      fragments: effective.fragments.map((f) =>
        f.anchor.id === 'F17'
          ? { ...f, anchor: { ...f.anchor, effectiveSha256: f.anchor.bodySha256 } }
          : f,
      ),
    };
    const failed = failedAudit(mutated);
    expect(failed).toContain('every fragment matches its pinned effective SHA-256');
    expect(failed).toContain(
      'pinned effective SHA-256 differs from V1.1 pin exactly for the affected fragments',
    );
  });

  it('refuses a single altered byte in an unaffected fragment', () => {
    const mutated = withFragment('F10', (sql) => `${sql.slice(0, -2)} \n`);
    const failed = failedAudit(mutated);
    expect(failed).toContain('every fragment matches its pinned effective SHA-256');
    expect(failed).toContain('fragments whose bytes changed');
  });
});

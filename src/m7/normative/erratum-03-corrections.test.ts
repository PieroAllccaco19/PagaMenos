// M7 S01 — Erratum 03 occurrence-scoped SQL block replacements (E03-01, E03-02, E03-03a, E03-04a, E03-05a,
// E03-06a), read from the accepted erratum bytes and verified against V1.1 and the Erratum 02-effective
// fragments. Every negative case mutates a COPY of the accepted text or of the derived fragments and must be
// refused.
import { describe, expect, it } from 'vitest';

import { e02Text, e03Text, replaceOnce, v11Text } from './__fixtures__/accepted-sources';
import {
  applyErratum02Corrections,
  auditEffectiveFragments,
  readErratum02Corrections,
} from './erratum-02-corrections';
import {
  ACCEPTED_ERRATUM_03_SQL_OCCURRENCES,
  type E03EffectiveSelection,
  applyErratum03Corrections,
  auditErratum03Fragments,
  countBlockOccurrences,
  crossCheckErratum03Pins,
  readErratum03Corrections,
} from './erratum-03-corrections';
import { FRAGMENT_ANCHORS, selectNormativeFragments } from './fragments';
import { deriveInventory, reconcileInventory } from './inventory';
import { checkMdMgPreconditions, toCheckedFragments } from './manifest-digest-preconditions';
import { sha256Hex } from './source';

const v11Selection = selectNormativeFragments(v11Text);
const e02 = readErratum02Corrections(v11Text, e02Text, v11Selection);
const e02Selection = applyErratum02Corrections(v11Selection, e02.corrections);
const reading = readErratum03Corrections(v11Text, e03Text, e02Selection, e02.corrections);
const effective = applyErratum03Corrections(e02Selection, reading.corrections);

function failures(e03: string): string[] {
  const r = readErratum03Corrections(v11Text, e03, e02Selection, e02.corrections);
  return [
    ...r.checks.filter((c) => !c.pass).map((c) => c.check),
    ...r.corrections.flatMap((c) =>
      c.evidence.filter((e) => !e.pass).map((e) => `${c.id} ${e.check}`),
    ),
  ];
}

function failedAudit(selection: E03EffectiveSelection): string[] {
  return auditErratum03Fragments(selection, reading.corrections, e02.corrections)
    .filter((c) => !c.pass)
    .map((c) => c.check);
}

function withFragment(id: string, edit: (sql: string) => string): E03EffectiveSelection {
  return {
    ...effective,
    fragments: effective.fragments.map((f) => {
      if (f.anchor.id !== id) return f;
      const sql = edit(f.sql);
      return { ...f, sql, sha256: sha256Hex(sql) };
    }),
  };
}

describe('Erratum 03 — accepted bytes', () => {
  it('reads exactly the six registered SQL occurrences and every check passes', () => {
    expect(reading.checks.filter((c) => !c.pass)).toEqual([]);
    expect(
      reading.corrections.map((c) => [
        c.id,
        c.correctionClass,
        c.fragment,
        c.firstLine,
        c.lastLine,
        c.fragmentFirstLine,
        c.fragmentLastLine,
        c.insertedLines,
      ]),
    ).toEqual([
      ['E03-01', 'A', 'F11', 5233, 5238, 22, 27, 2],
      ['E03-02', 'B', 'F24', 8495, 8496, 81, 82, 0],
      ['E03-03a', 'C', 'F24', 8605, 8607, 191, 193, 0],
      ['E03-04a', 'D', 'F24', 8543, 8545, 129, 131, 0],
      ['E03-05a', 'E', 'F24', 8547, 8551, 133, 137, 3],
      ['E03-06a', 'F', 'F01', 2469, 2471, 91, 93, 0],
    ]);
    for (const c of reading.corrections) {
      expect(
        c.evidence.filter((e) => !e.pass),
        c.id,
      ).toEqual([]);
      expect(c.pass).toBe(true);
    }
  });

  it('the changed lines are exactly the Erratum 03 SQL corrections', () => {
    expect(
      reading.corrections.flatMap((c) =>
        c.lineChanges.map((l) => [c.id, l.specLine, l.afterLine, l.byteDelta]),
      ),
    ).toEqual([
      ['E03-01', 5233, 'DECLARE v m7.m7_control_plane_installation; v_digest text; r record;', 10],
      ['E03-01', 5235, '    SELECT i AS inst, m."manifestSha256" AS digest INTO r', 6],
      [
        'E03-02',
        8496,
        `                 (CASE WHEN c.relkind = 'S' THEN 's' ELSE 'r' END)::"char", c.relowner))) x`,
        10,
      ],
      [
        'E03-03a',
        8607,
        "     WHERE NOT r.rolsuper AND NOT pg_catalog.pg_has_role(r.oid, v_owner, 'MEMBER')",
        38,
      ],
      [
        'E03-04a',
        8545,
        "         WHERE c.relnamespace = v_ns AND con.contype IN ('p', 'u', 'f', 'c')",
        40,
      ],
      ['E03-05a', 8551, '         WHERE c.relnamespace = v_ns', -2],
      [
        'E03-06a',
        2471,
        'ALTER DEFAULT PRIVILEGES FOR ROLE pagamenos_m7_owner REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;',
        15,
      ],
    ]);
    expect(
      reading.corrections
        .filter((c) => c.insertedLines > 0)
        .map((c) => [c.id, c.afterBlock.slice(c.afterBlock.length - c.insertedLines)]),
    ).toEqual([
      ['E03-01', ['    v := r.inst;', '    v_digest := r.digest;']],
      [
        'E03-05a',
        [
          '           AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint k',
          '                            WHERE k.conrelid = ix.indrelid AND k.conindid = ix.indexrelid',
          "                              AND k.contype IN ('p', 'u'))),",
        ],
      ],
    ]);
  });

  it('effective fragments: exactly F01/F11/F24 changed, pins and the §10 table reproduce', () => {
    expect(failedAudit(effective)).toEqual([]);
    expect(crossCheckErratum03Pins(e03Text, effective).filter((c) => !c.pass)).toEqual([]);
    expect(
      effective.fragments
        .filter((f) => f.sql !== f.erratum02Sql)
        .map((f) => [
          f.anchor.id,
          f.sha256,
          new TextEncoder().encode(f.sql).byteLength,
          f.sql.split('\n').length - 1,
        ]),
    ).toEqual([
      ['F01', 'f75c45ab8110c3fe5bce5379e77a08a51bc2e3d0561e887310d9c9361d02a6be', 5074, 95],
      ['F11', 'c9f5777fcc699fd9411427e4b17fd3f28258068f925bbb8fcbe3a935fbec75a9', 31403, 606],
      ['F24', 'f68eeea9d1f6a3b192b64163949385d89cd0b0fa369b168d8160d3eaa7006fff', 14628, 250],
    ]);
    for (const f of effective.fragments.filter((x) => x.erratum03Corrections.length === 0)) {
      expect(f.sql).toBe(f.erratum02Sql);
      expect(f.sha256).toBe(f.anchor.effectiveSha256);
    }
  });

  it('Erratum 02 remains materialized: the Erratum 02 stage and its audit are unchanged', () => {
    expect(auditEffectiveFragments(e02Selection, e02.corrections).filter((c) => !c.pass)).toEqual(
      [],
    );
    const f11 = effective.fragments.find((f) => f.anchor.id === 'F11')!;
    expect(f11.erratum02Sha256).toBe(
      '4803e194d62b3b3926e3b98a84d00ede902a485e04aed5de73533207f950be0a',
    );
    const e0204 = e02.corrections.find((c) => c.id === 'E02-04')!;
    // E03-01 inserts two lines above E02-04 (V1.1 line 5442 > 5238).
    expect(f11.sql.split('\n')[e0204.fragmentLine - 1 + 2]).toBe(e0204.afterLine);
    for (const c of e02.corrections) {
      expect(effective.fragments.map((f) => f.sql).join('')).not.toContain(c.beforeExpression);
    }
  });

  it('the inventory and MD/MG preconditions are unchanged over the Erratum 03-effective fragments', () => {
    const inv = deriveInventory(v11Text, effective);
    expect(reconcileInventory(inv).filter((c) => !c.pass)).toEqual([]);
    expect(inv).toEqual(deriveInventory(v11Text, e02Selection));
    expect(checkMdMgPreconditions(toCheckedFragments(effective.fragments))).toEqual(
      checkMdMgPreconditions(toCheckedFragments(e02Selection.fragments)),
    );
  });

  it('the registry pins exactly six SQL occurrences in exactly F01, F11 and F24', () => {
    expect(ACCEPTED_ERRATUM_03_SQL_OCCURRENCES).toHaveLength(6);
    expect(
      FRAGMENT_ANCHORS.filter((a) => a.erratum03EffectiveSha256 !== a.effectiveSha256).map(
        (a) => a.id,
      ),
    ).toEqual(['F01', 'F11', 'F24']);
  });

  it('whole-line block matching does not match a prefix of a longer line', () => {
    expect(countBlockOccurrences('a\nbc\n', ['b'])).toBe(0);
    expect(countBlockOccurrences('a\nb\nb\n', ['b'])).toBe(2);
    expect(countBlockOccurrences('a\nb\n', ['a', 'b'])).toBe(1);
  });
});

describe('Erratum 03 — fail closed (mutated erratum text)', () => {
  it('refuses a Before block that no longer equals the V1.1 lines', () => {
    const e03 = replaceOnce(
      e03Text,
      "                 CASE WHEN c.relkind = 'S' THEN 's' ELSE 'r' END, c.relowner))) x\n",
      "                 CASE WHEN c.relkind = 'S' THEN 's' ELSE 'r' END,  c.relowner))) x\n",
    );
    expect(failures(e03)).toContain('E03-02 Before block == V1.1 lines (byte-exact)');
  });

  it('refuses an After block that changes a line the occurrence map does not name', () => {
    const e03 = replaceOnce(
      e03Text,
      'SET LOCAL ROLE pagamenos_m7_owner;\n\nALTER DEFAULT PRIVILEGES FOR ROLE',
      'SET LOCAL ROLE  pagamenos_m7_owner;\n\nALTER DEFAULT PRIVILEGES FOR ROLE',
    );
    expect(failures(e03)).toContain(
      'E03-06a lines differing inside the quoted block == registered changed lines',
    );
  });

  it('refuses a semantically different IA-06 domain (stated SHA-256 no longer reproduces)', () => {
    const e03 = replaceOnce(
      e03Text,
      "     WHERE NOT r.rolsuper AND NOT pg_catalog.pg_has_role(r.oid, v_owner, 'MEMBER')\n```",
      "     WHERE NOT r.rolsuper AND r.rolname <> 'pagamenos_m7_owner'\n```",
    );
    const f = failures(e03);
    expect(f).toContain('E03-03a line 8607: After line SHA-256 reproduces');
    expect(f).toContain('E03-03a line 8607: stated byte delta == len(After) − len(Before)');
  });

  it("refuses a constraint domain that admits PostgreSQL 18 contype 'n'", () => {
    const e03 = replaceOnce(
      e03Text,
      "AND con.contype IN ('p', 'u', 'f', 'c')\n```",
      "AND con.contype IN ('p', 'u', 'f', 'c', 'n')\n```",
    );
    expect(failures(e03)).toContain('E03-04a line 8545: After line SHA-256 reproduces');
  });

  it('refuses a broadened index exclusion (any constraint-related index)', () => {
    const e03 = replaceOnce(
      e03Text,
      "                              AND k.contype IN ('p', 'u'))),\n```",
      '                              )),\n```',
    );
    // Inserted lines carry no per-line SHA-256 statement; the pinned effective fragment identity and
    // the §10 table are what refuse them.
    const r = readErratum03Corrections(v11Text, e03, e02Selection, e02.corrections);
    const sel = applyErratum03Corrections(e02Selection, r.corrections);
    const failed = auditErratum03Fragments(sel, r.corrections, e02.corrections)
      .filter((c) => !c.pass)
      .map((c) => c.check);
    expect(failed).toContain('every fragment matches its pinned Erratum 03 effective SHA-256');
    expect(
      crossCheckErratum03Pins(e03, sel)
        .filter((c) => !c.pass)
        .map((c) => c.check),
    ).toEqual([
      '§10 F24: file, current SHA-256, bytes, lines, SHA-256 after, bytes after, lines after, occurrences',
    ]);
  });

  it('refuses a wrong stated line SHA-256 or inserted-line count', () => {
    const sha = replaceOnce(
      e03Text,
      '→ `502e2c57f0fc9a120b942a4a8fcee66e59348bf7842e716431ba0fee6f436e5d`',
      `→ \`${'0'.repeat(64)}\``,
    );
    expect(failures(sha)).toContain('E03-06a line 2471: After line SHA-256 reproduces');
    const inserted = replaceOnce(
      e03Text,
      '- 3 line(s) inserted after V1.1 line 8551; no line removed.',
      '- 2 line(s) inserted after V1.1 line 8551; no line removed.',
    );
    expect(failures(inserted)).toContain('E03-05a inserted-lines statement == registry');
  });

  it('refuses an occurrence-map row that disagrees with the registry', () => {
    const e03 = replaceOnce(e03Text, '| `E03-04a` | D |', '| `E03-04a` | E |');
    expect(failures(e03)).toContain('E03-04a §4 class == registry');
    const frag = replaceOnce(e03Text, '| F24 (191–193) |', '| F24 (190–192) |');
    expect(failures(frag)).toContain(
      'E03-03a §4 fragment (fragment lines) == anchor and V1.1 body offsets',
    );
  });

  it('refuses an occurrence moved to different V1.1 lines', () => {
    const e03 = replaceOnce(
      e03Text,
      'Before (V1.1 lines 8543–8545, byte-exact):',
      'Before (V1.1 lines 8544–8546, byte-exact):',
    );
    expect(() => failures(e03)).toThrow(/E03-04a: missing from §4 or without exactly one/);
  });

  it('refuses an informative §10 pin that does not reproduce', () => {
    const e03 = replaceOnce(e03Text, '| 14 628 | 250 |', '| 14 629 | 250 |');
    expect(
      crossCheckErratum03Pins(e03, effective)
        .filter((c) => !c.pass)
        .map((c) => c.check),
    ).toEqual([
      '§10 F24: file, current SHA-256, bytes, lines, SHA-256 after, bytes after, lines after, occurrences',
    ]);
  });
});

describe('Erratum 03 — fail closed (mutated effective fragments)', () => {
  it.each(reading.corrections.map((c) => [c.id, c] as const))(
    'refuses %s reverted to its stale block',
    (_id, c) => {
      const mutated = withFragment(c.fragment, (sql) =>
        replaceOnce(sql, `${c.afterBlock.join('\n')}\n`, `${c.beforeBlock.join('\n')}\n`),
      );
      const failed = failedAudit(mutated);
      expect(failed).toContain(`${c.id}: stale Before block occurrences in effective fragments`);
      expect(failed).toContain('every fragment matches its pinned Erratum 03 effective SHA-256');
    },
  );

  it('refuses an extra change outside every Erratum 03 block', () => {
    const mutated = withFragment('F24', (sql) =>
      replaceOnce(sql, "'OBJ-MISSING: '", "'OBJ-MISSING:  '"),
    );
    const failed = failedAudit(mutated);
    expect(failed).toContain(
      'inverse replacement of the After blocks reproduces the Erratum 02-effective bytes (no other byte changed)',
    );
    expect(failed).toContain('every fragment matches its pinned Erratum 03 effective SHA-256');
  });

  it('refuses an inserted line at an incorrect position', () => {
    const mutated = withFragment('F11', (sql) =>
      replaceOnce(
        sql,
        '    v := r.inst;\n    v_digest := r.digest;\n',
        '    v_digest := r.digest;\n    v := r.inst;\n',
      ),
    );
    expect(failedAudit(mutated)).toContain('E03-01: effective F11 lines 22–29 == After block');
  });

  it('refuses a regressed Erratum 02 correction in an Erratum 03 fragment', () => {
    const c = e02.corrections.find((x) => x.id === 'E02-04')!;
    const mutated = withFragment('F11', (sql) => replaceOnce(sql, c.afterLine, c.beforeLine));
    const failed = failedAudit(mutated);
    expect(failed).toContain('Erratum 02 corrections not materialized at their (shifted) lines');
  });

  it('refuses a single altered byte in a fragment Erratum 03 does not touch', () => {
    const mutated = withFragment('F10', (sql) => `${sql.slice(0, -2)} \n`);
    const failed = failedAudit(mutated);
    expect(failed).toContain('fragments whose bytes changed under Erratum 03');
    expect(failed).toContain('every fragment matches its pinned Erratum 03 effective SHA-256');
  });

  it('refuses a corrupted Erratum 03 pin', () => {
    const mutated: E03EffectiveSelection = {
      ...effective,
      fragments: effective.fragments.map((f) =>
        f.anchor.id === 'F01'
          ? { ...f, anchor: { ...f.anchor, erratum03EffectiveSha256: f.anchor.effectiveSha256 } }
          : f,
      ),
    };
    const failed = failedAudit(mutated);
    expect(failed).toContain('every fragment matches its pinned Erratum 03 effective SHA-256');
    expect(failed).toContain(
      'pinned Erratum 03 SHA-256 differs from the Erratum 02 pin exactly for the affected fragments',
    );
  });

  it('refuses to apply a correction whose Before block is not present', () => {
    const drifted = {
      ...e02Selection,
      fragments: e02Selection.fragments.map((f) =>
        f.anchor.id === 'F01'
          ? { ...f, sql: f.sql.replace('SET LOCAL ROLE', 'SET  LOCAL ROLE') }
          : f,
      ),
    };
    expect(() => applyErratum03Corrections(drifted, reading.corrections)).toThrow(
      /E03-06a: fragment lines 91–93 are not the Before block/,
    );
  });
});

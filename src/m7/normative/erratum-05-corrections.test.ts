// M7 S01 — Erratum 05 occurrence-scoped SQL corrections (E05-01 in F18; E05-02, E05-03 in F22) and the
// prose-only occurrence E05-04, read from the accepted erratum bytes and verified against V1.1, the
// Erratum 04-effective fragments and Errata 02–04. Every negative case mutates a COPY of the accepted text or
// of the derived fragments and must be refused.
import { describe, expect, it } from 'vitest';

import {
  e02Text,
  e03Text,
  e04Text,
  e05Text,
  replaceOnce,
  v11Text,
} from './__fixtures__/accepted-sources';
import { applyErratum02Corrections, readErratum02Corrections } from './erratum-02-corrections';
import { applyErratum03Corrections, readErratum03Corrections } from './erratum-03-corrections';
import { applyErratum04Corrections, readErratum04Corrections } from './erratum-04-corrections';
import {
  ACCEPTED_ERRATUM_05_OCCURRENCES,
  ACCEPTED_ERRATUM_05_PROSE_OCCURRENCES,
  type E05EffectiveSelection,
  ERRATUM_05_AFFECTED_FRAGMENTS,
  ERRATUM_05_FRAGMENT_PINS,
  Erratum05DefectError,
  applyErratum05Corrections,
  auditErratum05Fragments,
  claimWriteOrder,
  crossCheckErratum05Pins,
  findInserts,
  readErratum05Corrections,
  splitTopLevel,
} from './erratum-05-corrections';
import { selectNormativeFragments } from './fragments';
import { deriveInventory } from './inventory';
import { sha256Hex } from './source';

const v11Selection = selectNormativeFragments(v11Text);
const e02 = readErratum02Corrections(v11Text, e02Text, v11Selection);
const e02Selection = applyErratum02Corrections(v11Selection, e02.corrections);
const e03 = readErratum03Corrections(v11Text, e03Text, e02Selection, e02.corrections);
const e03Selection = applyErratum03Corrections(e02Selection, e03.corrections);
const e04 = readErratum04Corrections(
  v11Text,
  e04Text,
  v11Selection,
  e03Selection,
  e02.corrections,
  e03.corrections,
);
const e04Selection = applyErratum04Corrections(e03Selection, e04.corrections);
const reading = readErratum05Corrections(
  v11Text,
  e05Text,
  e04Selection,
  e02.corrections,
  e03.corrections,
  e04.corrections,
);
const effective = applyErratum05Corrections(e04Selection, reading.corrections);

function failures(e05: string): string[] {
  const r = readErratum05Corrections(
    v11Text,
    e05,
    e04Selection,
    e02.corrections,
    e03.corrections,
    e04.corrections,
  );
  return [
    ...r.checks.filter((c) => !c.pass).map((c) => c.check),
    ...r.corrections.flatMap((c) =>
      c.evidence.filter((e) => !e.pass).map((e) => `${c.id} ${e.check}`),
    ),
    ...r.proseOccurrences.flatMap((p) =>
      p.evidence.filter((e) => !e.pass).map((e) => `${p.id} ${e.check}`),
    ),
  ];
}

function failedAudit(selection: E05EffectiveSelection): string[] {
  return auditErratum05Fragments(selection, reading)
    .filter((c) => !c.pass)
    .map((c) => c.check);
}

function withFragment(id: string, edit: (sql: string) => string): E05EffectiveSelection {
  return {
    ...effective,
    fragments: effective.fragments.map((f) => {
      if (f.anchor.id !== id) return f;
      const sql = edit(f.sql);
      return { ...f, sql, sha256: sha256Hex(sql) };
    }),
  };
}

const byId = (id: string) => reading.corrections.find((c) => c.id === id)!;

describe('Erratum 05 — accepted bytes', () => {
  it('reads exactly four occurrences: three SQL (F18, F22) and one prose; every check passes', () => {
    expect(reading.checks.filter((c) => !c.pass)).toEqual([]);
    expect(ACCEPTED_ERRATUM_05_OCCURRENCES.map((o) => [o.id, o.kind, o.fragment])).toEqual([
      ['E05-01', 'SQL', 'F18'],
      ['E05-02', 'SQL', 'F22'],
      ['E05-03', 'SQL', 'F22'],
      ['E05-04', 'PROSE', null],
    ]);
    expect(
      reading.corrections.map((c) => [
        c.id,
        c.defectClass,
        c.fragment,
        c.enclosingFunction,
        c.nature,
        c.firstLine,
        c.lastLine,
        c.fragmentFirstLine,
        c.fragmentLastLine,
        c.changedLines.length,
        c.beforeBlockBytes,
        c.afterBlockBytes,
        c.byteDelta,
      ]),
    ).toEqual([
      [
        'E05-01',
        'A',
        'F18',
        'm7.w_claim_upload_intent_v1',
        'STATEMENT_REORDER',
        7038,
        7057,
        86,
        105,
        20,
        1562,
        1562,
        0,
      ],
      [
        'E05-02',
        'B',
        'F22',
        'm7.w_execute_row_redaction_v1',
        'REQUIRED_COLUMN_INSERTION',
        7891,
        7893,
        96,
        98,
        2,
        281,
        391,
        110,
      ],
      [
        'E05-03',
        'B',
        'F22',
        'm7.w_execute_row_purge_v1',
        'REQUIRED_COLUMN_INSERTION',
        8149,
        8151,
        354,
        356,
        2,
        281,
        391,
        110,
      ],
    ]);
    for (const c of [...reading.corrections, ...reading.proseOccurrences]) {
      expect(c.evidence.filter((e) => !e.pass)).toEqual([]);
      expect(c.pass).toBe(true);
    }
    expect(
      reading.proseOccurrences.map((p) => [p.id, p.specLine, p.fragment, p.byteDelta]),
    ).toEqual([['E05-04', 9412, null, 518]]);
    expect(ACCEPTED_ERRATUM_05_PROSE_OCCURRENCES).toEqual(['E05-04']);
  });

  it('E05-01 is the stated permutation of the same 20 lines: U, the blank line, then the grant comment and W', () => {
    const c = byId('E05-01');
    expect(c.permutation).toEqual([
      7053, 7054, 7055, 7056, 7057, 7052, 7038, 7039, 7040, 7041, 7042, 7043, 7044, 7045, 7046,
      7047, 7048, 7049, 7050, 7051,
    ]);
    expect([...c.afterBlock].sort()).toEqual([...c.beforeBlock].sort());
    expect(c.beforeBlockSha256).toBe(
      '36754783bd38f57aaf03a7653a37ac387b3b8f99f9ea6c3f724b972f1aa86418',
    );
    expect(c.afterBlockSha256).toBe(
      'fc88bb989b8603f2b5212a36fdfe9a0aebf3bbcfc5670b214e679941b811a5ee',
    );
    expect(c.lineChanges).toEqual([]);
    expect(c.insertedColumns).toEqual([]);
  });

  it('E05-02 / E05-03 insert exactly the two required columns with the F21 derivation expressions', () => {
    for (const id of ['E05-02', 'E05-03']) {
      const c = byId(id);
      expect(c.insertedColumns).toEqual(['"withinCompletionBudget"', '"withinHardDeadline"']);
      expect(c.insertedValues).toEqual([
        'v_now <= v_e."completionBudgetDueAt"',
        'v_now <= v_e."hardDueAt"',
      ]);
      expect(c.lineChanges.map((l) => [l.specLine - c.firstLine, l.byteDelta])).toEqual([
        [1, 46],
        [2, 64],
      ]);
      expect(c.permutation).toBeNull();
    }
    expect(byId('E05-02').lineChanges.map((l) => l.fragmentLine)).toEqual([97, 98]);
    expect(byId('E05-03').lineChanges.map((l) => l.fragmentLine)).toEqual([355, 356]);
  });

  it('applies to F18 and F22 only, keeps every line count, and yields the pinned identities', () => {
    expect(failedAudit(effective)).toEqual([]);
    expect(crossCheckErratum05Pins(e05Text, effective).filter((c) => !c.pass)).toEqual([]);
    for (const id of ERRATUM_05_AFFECTED_FRAGMENTS) {
      const f = effective.fragments.find((x) => x.anchor.id === id)!;
      const pin = ERRATUM_05_FRAGMENT_PINS[id];
      expect([f.erratum04Sha256, new TextEncoder().encode(f.erratum04Sql).byteLength]).toEqual([
        pin.before.sha256,
        pin.before.bytes,
      ]);
      expect([
        f.sha256,
        new TextEncoder().encode(f.sql).byteLength,
        f.sql.split('\n').length - 1,
      ]).toEqual([pin.after.sha256, pin.after.bytes, pin.after.lines]);
    }
    expect(
      effective.fragments
        .filter((f) => f.erratum05Corrections.length > 0)
        .map((f) => [f.anchor.id, f.erratum05Corrections]),
    ).toEqual([
      ['F18', ['E05-01']],
      ['F22', ['E05-02', 'E05-03']],
    ]);
    const unchanged = effective.fragments.filter((f) => f.erratum05Corrections.length === 0);
    expect(unchanged).toHaveLength(24);
    for (const f of unchanged) expect(f.sql).toBe(f.erratum04Sql);
    const pins = Object.fromEntries(effective.fragments.map((f) => [f.anchor.id, f.sha256]));
    expect([pins.F01, pins.F09, pins.F11, pins.F12, pins.F21, pins.F24]).toEqual([
      'f75c45ab8110c3fe5bce5379e77a08a51bc2e3d0561e887310d9c9361d02a6be',
      'c2bb8b38feaf6cbb1559ae0c1396d34344094008a75e81f7406f9a239225c75c',
      'c9f5777fcc699fd9411427e4b17fd3f28258068f925bbb8fcbe3a935fbec75a9',
      'c154aee0e1d441d405f5a0e7c25d883aa643b40fc0458a99061d9f9145c147da',
      '163d2c7af596a285e3d21378ea9849b7c79b18d537d6c76b01802a8b328bb8e2',
      'f68eeea9d1f6a3b192b64163949385d89cd0b0fa369b168d8160d3eaa7006fff',
    ]);
  });

  it('the claim writes move from G → W → U to the unique admissible order G → U → W', () => {
    const f18 = effective.fragments.find((f) => f.anchor.id === 'F18')!;
    expect(claimWriteOrder(f18.erratum04Sql)).toEqual({ G: 81, W: 94, U: 101 });
    expect(claimWriteOrder(f18.sql)).toEqual({ G: 81, U: 86, W: 100 });
  });

  it('every completion INSERT supplies both lateness columns after Erratum 05, and only the two E05 ones did not before', () => {
    const census = (pick: (f: (typeof effective.fragments)[number]) => string) =>
      effective.fragments.flatMap((f) =>
        findInserts(pick(f), 'm7.m7_deletion_execution_completion').map((i) => [
          f.anchor.id,
          i.line,
          i.columns.includes('"withinCompletionBudget"') &&
            i.columns.includes('"withinHardDeadline"'),
        ]),
      );
    expect(census((f) => f.erratum04Sql)).toEqual([
      ['F21', 67, true],
      ['F22', 96, false],
      ['F22', 354, false],
    ]);
    expect(census((f) => f.sql)).toEqual([
      ['F21', 67, true],
      ['F22', 96, true],
      ['F22', 354, true],
    ]);
  });

  it('the mechanical inventory is unchanged by Erratum 05', () => {
    expect(deriveInventory(v11Text, effective)).toEqual(deriveInventory(v11Text, e04Selection));
  });
});

describe('Erratum 05 — SQL list helpers', () => {
  it('splits only at top-level commas, respecting parentheses and quotes', () => {
    expect(splitTopLevel(`a, f(b, c), 'x,y', "q,r", v_now <= v_e."hardDueAt"`)).toEqual([
      'a',
      'f(b, c)',
      "'x,y'",
      '"q,r"',
      'v_now <= v_e."hardDueAt"',
    ]);
    expect(() => splitTopLevel("a, 'b")).toThrow(Erratum05DefectError);
  });

  it('ignores INSERT text inside comments and literals', () => {
    const sql = [
      '-- INSERT INTO m7.t (a) VALUES (1)',
      "SELECT 'INSERT INTO m7.t (a) VALUES (1)';",
      'INSERT INTO m7.t ("a", "b")',
      '    VALUES (1, pg_catalog.f(2, 3));',
    ].join('\n');
    expect(findInserts(`${sql}\n`, 'm7.t').map((i) => [i.line, i.columns, i.values])).toEqual([
      [3, ['"a"', '"b"'], ['1', 'pg_catalog.f(2, 3)']],
    ]);
  });
});

describe('Erratum 05 — refusal of mutated erratum text (fail closed)', () => {
  const e0502After =
    '    VALUES (pg_catalog.gen_random_uuid(), v_e."id", NULL, v_n1 + v_n2, v_now, v_now <= v_e."completionBudgetDueAt", v_now <= v_e."hardDueAt", session_user, \'M7_ROW_REDACTION_V1\');';

  it('an E05-01 After block that is not the stated permutation is refused', () => {
    const mutated = replaceOnce(
      e05Text,
      '     RETURNING * INTO v_i;\n\n    -- XF-2 / XF-9 / XF-11: allocate the ONE authorization envelope for this generation, addressable by\n',
      '     RETURNING * INTO v_i;\n    -- XF-2 / XF-9 / XF-11: allocate the ONE authorization envelope for this generation, addressable by\n\n',
    );
    expect(failures(mutated)).toEqual(
      expect.arrayContaining([
        'E05-01 After block == the quoted V1.1 lines in the stated permuted order (byte-exact)',
        'E05-01 block SHA-256 (After) and bytes reproduce',
      ]),
    );
  });

  it('an E05-01 After block that alters a statement (not a permutation) is refused', () => {
    const mutated = replaceOnce(
      e05Text,
      '    VALUES (v_grant_id, v_i."id", v_epoch, \'CANONICAL_CREATE\', v_key, v_i."backendSha256",\n            v_grant_exp, v_pr."writeCapabilityMode", v_pr."envelopeEnforcement", v_now, session_user,\n            \'M7_WORKER_UPLOAD_V1\');\n```\n\n### 5.4',
      '    VALUES (v_grant_id, v_i."id", v_epoch + 1, \'CANONICAL_CREATE\', v_key, v_i."backendSha256",\n            v_grant_exp, v_pr."writeCapabilityMode", v_pr."envelopeEnforcement", v_now, session_user,\n            \'M7_WORKER_UPLOAD_V1\');\n```\n\n### 5.4',
    );
    expect(failures(mutated)).toEqual(
      expect.arrayContaining([
        'E05-01 After block is a permutation of the Before block (same multiset of lines)',
        'E05-01 the write-grant INSERT is unchanged (same columns and values)',
      ]),
    );
  });

  it('an E05-02 After that supplies a caller-controlled or wrong lateness expression is refused', () => {
    const mutated = replaceOnce(
      e05Text,
      e0502After,
      e0502After.replace('v_now <= v_e."hardDueAt"', 'true'),
    );
    expect(failures(mutated)).toEqual(
      expect.arrayContaining([
        'E05-02 After values == Before values with the derivation expressions inserted at the same position',
        'E05-02 line 7893: After line SHA-256 reproduces',
      ]),
    );
  });

  it('an E05-02 After that changes a neighbouring value is refused', () => {
    const mutated = replaceOnce(e05Text, e0502After, e0502After.replace('v_n1 + v_n2', 'v_n1'));
    expect(failures(mutated)).toEqual(
      expect.arrayContaining([
        'E05-02 After values == Before values with the derivation expressions inserted at the same position',
        'E05-02 every changed line is a pure insertion into its Before line',
      ]),
    );
  });

  it('a partial E05-03 After (only one of the two columns) is refused', () => {
    const mutated = replaceOnce(
      e05Text,
      '            ("id","executionId","confirmingOutboxId","affectedRowCount","completedAt","withinCompletionBudget","withinHardDeadline","completedBy","generationPath")\n        VALUES (pg_catalog.gen_random_uuid(), v_e."id", NULL, v_n, v_now, v_now <= v_e."completionBudgetDueAt", v_now <= v_e."hardDueAt"',
      '            ("id","executionId","confirmingOutboxId","affectedRowCount","completedAt","withinCompletionBudget","completedBy","generationPath")\n        VALUES (pg_catalog.gen_random_uuid(), v_e."id", NULL, v_n, v_now, v_now <= v_e."completionBudgetDueAt"',
    );
    expect(failures(mutated)).toEqual(
      expect.arrayContaining([
        'E05-03 After columns == Before columns with the omitted required columns inserted after "completedAt"',
        'E05-03 After supplies every required column',
      ]),
    );
  });

  it('a Before block that is not the V1.1 bytes is refused', () => {
    const mutated = replaceOnce(
      e05Text,
      '        VALUES (pg_catalog.gen_random_uuid(), v_e."id", NULL, v_n, v_now, session_user, \'M7_ROW_PURGE_V1\');',
      '        VALUES (pg_catalog.gen_random_uuid(), v_e."id", NULL, v_n, v_now, session_user, \'M7_ROW_PURGE_V1\'); ',
    );
    expect(failures(mutated)).toEqual(
      expect.arrayContaining([
        'E05-03 Before block == V1.1 lines (byte-exact)',
        'E05-03 Before block occurs exactly once in V1.1',
      ]),
    );
  });

  it('a relocated quoted range (neighbouring statement) is refused', () => {
    const mutated = replaceOnce(
      e05Text,
      '| `E05-02` | B | §19.12.5 `m7.w_execute_row_redaction_v1` | 7891–7893 |',
      '| `E05-02` | B | §19.12.5 `m7.w_execute_row_redaction_v1` | 7890–7892 |',
    );
    expect(failures(mutated)).toEqual(
      expect.arrayContaining(['E05-02 §4 quoted lines == registry']),
    );
  });

  it('a wrong stated block or line SHA-256 is refused', () => {
    const mutated = replaceOnce(
      e05Text,
      '`fc88bb989b8603f2b5212a36fdfe9a0aebf3bbcfc5670b214e679941b811a5ee` (1 562 bytes)',
      '`fc88bb989b8603f2b5212a36fdfe9a0aebf3bbcfc5670b214e679941b811a5ef` (1 562 bytes)',
    );
    expect(failures(mutated)).toEqual(
      expect.arrayContaining(['E05-01 block SHA-256 (After) and bytes reproduce']),
    );
  });

  it('an additional E05 occurrence named in the document is refused', () => {
    const mutated = replaceOnce(
      e05Text,
      '**Decision: approach A.**',
      '**Decision: approach A (`E05-05`).**',
    );
    expect(failures(mutated)).toEqual(
      expect.arrayContaining([
        'every E05-nn identifier in the document is a registered occurrence',
      ]),
    );
  });

  it('E05-04 presented as a SQL occurrence (in a fragment) is refused', () => {
    const mutated = replaceOnce(
      e05Text,
      '| 9412 | 9412 | 0 / 0 | — (prose only) |',
      '| 9412 | 9412 | 0 / 0 | F26 (1) |',
    );
    expect(failures(mutated)).toEqual(
      expect.arrayContaining([
        '§4 rows with a fragment == the three SQL occurrences',
        '§4 rows without a fragment == the prose occurrences',
        'E05-04 §4 fragment: prose only',
      ]),
    );
  });

  it('E05-04 with a sql fence is refused', () => {
    const at = e05Text.indexOf('### 7.2 ');
    const mutated = `${e05Text.slice(0, at)}${e05Text.slice(at).replace('```text\n| T-03', '```sql\n| T-03')}`;
    expect(failures(mutated)).toEqual(
      expect.arrayContaining(['Before/After fence kinds: sql for SQL occurrences, text for prose']),
    );
  });

  it('a wrong informative F18 / F22 pin is refused', () => {
    const mutated = e05Text.replace(
      /afe1c1302e973d360a3e7a7a0fe8477647ee52feb2a1d0fbd963850afb3b99e8/g,
      'afe1c1302e973d360a3e7a7a0fe8477647ee52feb2a1d0fbd963850afb3b99e9',
    );
    expect(
      crossCheckErratum05Pins(mutated, effective)
        .filter((c) => !c.pass)
        .map((c) => c.check),
    ).toEqual([
      '§10 F22: file, current SHA-256, bytes, lines, SHA-256 after, bytes after, lines after, Δ, occurrences',
    ]);
  });

  it('a wrong informative prosrc identity is refused', () => {
    const mutated = replaceOnce(
      e05Text,
      '`sha256:8cf2bd873752d044220d98f68bc111fec4ec4c598cd8900c32fbef2cbae7022a`',
      '`sha256:8cf2bd873752d044220d98f68bc111fec4ec4c598cd8900c32fbef2cbae7022b`',
    );
    expect(
      crossCheckErratum05Pins(mutated, effective)
        .filter((c) => !c.pass)
        .map((c) => c.check),
    ).toEqual(['§5.4 / §6.4 prosrc SHA-256 and bytes of the corrected functions (before → after)']);
  });

  it('a missing Before/After pair refuses to read', () => {
    const mutated = replaceOnce(
      e05Text,
      'Before (V1.1 lines 8149–8151, byte-exact):',
      'Before (V1.1 lines 8149–8151):',
    );
    expect(() => failures(mutated)).toThrow(Erratum05DefectError);
  });
});

describe('Erratum 05 — post-condition audit (fail closed)', () => {
  it('a reverted E05-01 (grant before transition) is refused', () => {
    const c = byId('E05-01');
    const mutated = withFragment('F18', (sql) =>
      sql.replace(c.afterBlock.join('\n'), () => c.beforeBlock.join('\n')),
    );
    expect(failedAudit(mutated)).toEqual(
      expect.arrayContaining([
        'E05-01: stale Before block occurrences in effective fragments',
        'F18 claim writes after Erratum 05: G < U < W (the unique admissible order)',
        'F18 effective identity == pinned Erratum 05 (sha256, bytes, lines)',
      ]),
    );
  });

  it('a reverted E05-03 (completion without lateness flags) is refused', () => {
    const c = byId('E05-03');
    const mutated = withFragment('F22', (sql) =>
      sql.replace(c.afterBlock.join('\n'), () => c.beforeBlock.join('\n')),
    );
    expect(failedAudit(mutated)).toEqual(
      expect.arrayContaining([
        'E05-03: stale Before block occurrences in effective fragments',
        'completion INSERTs omitting a required column after Erratum 05',
        'F22 effective identity == pinned Erratum 05 (sha256, bytes, lines)',
      ]),
    );
  });

  it('a change in a neighbouring statement of a corrected function is refused', () => {
    const mutated = withFragment('F22', (sql) =>
      sql.replace('    RETURN v_n1 + v_n2;\n', '    RETURN v_n1;\n'),
    );
    expect(failedAudit(mutated)).toEqual(
      expect.arrayContaining([
        'inverse replacement of the After blocks reproduces the Erratum 04-effective bytes (no other byte changed)',
      ]),
    );
  });

  it('an E05-like change in an unaffected fragment is refused', () => {
    const mutated = withFragment('F21', (sql) =>
      sql.replace('v_now <= v_e."hardDueAt", session_user,', 'true, session_user,'),
    );
    expect(failedAudit(mutated)).toEqual(
      expect.arrayContaining([
        'fragments whose bytes changed under Erratum 05',
        'every other fragment is byte-identical to its Erratum 04-stage bytes and matches its pin',
      ]),
    );
  });

  it('E05-04 prose text in a fragment is refused', () => {
    const p = reading.proseOccurrences[0]!;
    const mutated = withFragment('F26', (sql) => `${sql}-- ${p.afterLine}\n`);
    expect(failedAudit(mutated)).toEqual(
      expect.arrayContaining(['prose occurrences are applied to no fragment']),
    );
  });

  it('refuses to apply over a fragment whose Before block is absent (no duplicate application)', () => {
    expect(() => applyErratum05Corrections(effective, reading.corrections)).toThrow(
      Erratum05DefectError,
    );
  });

  it('refuses to apply a correction that is not a registered SQL occurrence', () => {
    const forged = { ...byId('E05-02'), id: 'E05-04' };
    expect(() => applyErratum05Corrections(e04Selection, [forged])).toThrow(Erratum05DefectError);
  });
});

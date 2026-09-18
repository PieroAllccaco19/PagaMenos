// M7 S01 — the committed prisma/m7/normative/ artifacts are exactly a fresh deterministic generation
// from the accepted bytes (the unit-suite twin of `pnpm m7:ddl:check`).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  REPO_ROOT,
  e01Bytes,
  e02Bytes,
  e02Text,
  e03Bytes,
  e03Text,
  e04Bytes,
  e04Text,
  v11Bytes,
  v11Text,
} from './__fixtures__/accepted-sources';
import {
  applyErratum02Corrections,
  findStaleErratum02Bytes,
  readErratum02Corrections,
} from './erratum-02-corrections';
import {
  applyErratum03Corrections,
  findStaleErratum03Bytes,
  readErratum03Corrections,
} from './erratum-03-corrections';
import { findStaleErratum04Bytes, readErratum04Corrections } from './erratum-04-corrections';
import { selectNormativeFragments } from './fragments';
import {
  NORMATIVE_OUTPUT_DIR,
  diffArtifacts,
  generateNormativeArtifacts,
  isClean,
} from './generate';
import { SourceIdentityError, sha256Hex } from './source';

function readCommitted(): Map<string, string> {
  const root = join(REPO_ROOT, NORMATIVE_OUTPUT_DIR);
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) =>
      statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)],
    );
  return new Map(
    walk(root).map((abs) => [relative(root, abs).replace(/\\/g, '/'), readFileSync(abs, 'utf8')]),
  );
}

const generated = generateNormativeArtifacts(v11Bytes, e01Bytes, e02Bytes, e03Bytes, e04Bytes);
const v11Selection = selectNormativeFragments(v11Text);
const { corrections } = readErratum02Corrections(v11Text, e02Text, v11Selection);
const e02Selection = applyErratum02Corrections(v11Selection, corrections);
const { corrections: e03Corrections } = readErratum03Corrections(
  v11Text,
  e03Text,
  e02Selection,
  corrections,
);
const e04 = readErratum04Corrections(
  v11Text,
  e04Text,
  v11Selection,
  applyErratum03Corrections(e02Selection, e03Corrections),
  corrections,
  e03Corrections,
);
const e04Corrections = e04.corrections;
const F12 = 'sql/12_19.11.2_control-plane-registration.sql';

interface IndexFragment {
  id: string;
  file: string;
  fenceOpenLine: number;
  fenceCloseLine: number;
  bodyLines: number;
  v11BodyBytes: number;
  v11BodySha256: string;
  erratum02Corrections: string[];
  erratum02Sha256: string;
  erratum03Corrections: string[];
  erratum03Sha256: string;
  erratum04Corrections: string[];
  lines: number;
  bytes: number;
  sha256: string;
}

describe('S01 generated artifacts', () => {
  it('generation is deterministic', () => {
    const again = generateNormativeArtifacts(v11Bytes, e01Bytes, e02Bytes, e03Bytes, e04Bytes);
    expect([...again.files.entries()]).toEqual([...generated.files.entries()]);
  });

  it('the committed directory has no drift, no missing and no extra file', () => {
    const drift = diffArtifacts(generated.files, readCommitted());
    expect(drift).toEqual({ missing: [], unexpected: [], changed: [] });
    expect(generated.files.size).toBe(34);
    expect(findStaleErratum02Bytes(readCommitted(), corrections)).toEqual([]);
    expect(findStaleErratum03Bytes(readCommitted(), e03Corrections)).toEqual([]);
    expect(findStaleErratum04Bytes(readCommitted(), e04)).toEqual([]);
  });

  it('the index records the current conformance target and all five accepted source identities', () => {
    const index = JSON.parse(generated.files.get('EXTRACTION_INDEX.json')!) as {
      schema: string;
      conformanceTarget: string;
      sources: Record<string, { path: string; gitBlob: string; sha256: string }>;
    };
    expect(index.schema).toBe('pagamenos.m7.s01.normative-ddl-extraction.v4');
    expect(index.conformanceTarget).toBe(
      'M7 V1.1 + accepted Erratum 01 + accepted Erratum 02 + accepted Erratum 03 + accepted Erratum 04',
    );
    expect(Object.entries(index.sources).map(([k, s]) => [k, s.path, s.gitBlob, s.sha256])).toEqual(
      [
        [
          'specification',
          'PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1.md',
          '06e103b0d5e8cfcbb96ab21134d5605b0aae9b26',
          '457f51778fb5d5890b3e3478376e413072f15aef7da88125b5e78963f49394bd',
        ],
        [
          'erratum01',
          'PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_01.md',
          '15ee22090d3e37b6a63dd25914f8abb0f4fa9d4b',
          'f381cb015adadc7a22463060da7ff55e8711b8ab13879c60f93cabf53eb863e8',
        ],
        [
          'erratum02',
          'PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_02.md',
          'a0e6fa6720f23ac08485ab7cb696ab9ba4b7e83f',
          'b7b3440ad04181356770f243a6e2870e004aba604d2a62afdefd5330c85c170f',
        ],
        [
          'erratum03',
          'PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_03.md',
          '8ba87adc9b87cee749c214d9326b0aa750ceabf0',
          'b4debcb5a02e777e780e14002c5e9cdbb90f2140f5b7516592b8e05e67366160',
        ],
        [
          'erratum04',
          'PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_04.md',
          'c839db3948608c875c984a73e366c039c0a5e2dd',
          '3b07d30958aa5c7783fe7458236b8170d1f5a47c0f765e7aa95e5ae68bab00f4',
        ],
      ],
    );
  });

  it('every sql/ file is its V1.1 fence body with exactly its Erratum 02, 03 and 04 corrections applied', () => {
    const index = JSON.parse(generated.files.get('EXTRACTION_INDEX.json')!) as {
      fragments: IndexFragment[];
    };
    const lines = v11Text.split('\n');
    expect(index.fragments).toHaveLength(26);
    for (const f of index.fragments) {
      const v11Body = lines.slice(f.fenceOpenLine, f.fenceCloseLine - 1);
      expect(sha256Hex(`${v11Body.join('\n')}\n`)).toBe(f.v11BodySha256);
      const effective = [...v11Body];
      for (const c of corrections.filter((x) => x.fragment === f.id)) {
        const i = c.specLine - f.fenceOpenLine - 1;
        expect(effective[i]!.split(c.beforeExpression)).toHaveLength(2);
        effective[i] = effective[i]!.replace(c.beforeExpression, () => c.afterExpression);
      }
      expect(sha256Hex(`${effective.join('\n')}\n`)).toBe(f.erratum02Sha256);
      // Erratum 03: whole quoted V1.1 blocks, bottom-up so earlier line offsets stay valid.
      const own = e03Corrections.filter((x) => x.fragment === f.id);
      for (const c of [...own].sort((a, b) => b.firstLine - a.firstLine)) {
        const i = c.firstLine - f.fenceOpenLine - 1;
        expect(effective.slice(i, i + c.beforeBlock.length)).toEqual(c.beforeBlock);
        effective.splice(i, c.beforeBlock.length, ...c.afterBlock);
      }
      expect(sha256Hex(`${effective.join('\n')}\n`)).toBe(f.erratum03Sha256);
      // Erratum 04: whole quoted V1.1 statements, same line count.
      const own04 = e04Corrections.filter((x) => x.fragment === f.id);
      for (const c of own04) {
        const i = c.firstLine - f.fenceOpenLine - 1;
        expect(effective.slice(i, i + c.beforeBlock.length)).toEqual(c.beforeBlock);
        effective.splice(i, c.beforeBlock.length, ...c.afterBlock);
      }
      const body = `${effective.join('\n')}\n`;
      expect(generated.files.get(f.file)).toBe(body);
      expect(sha256Hex(body)).toBe(f.sha256);
      expect(new TextEncoder().encode(body).byteLength).toBe(f.bytes);
      expect(body.split('\n').length - 1).toBe(f.lines);
      expect(f.bodyLines).toBe(v11Body.length);
      expect(f.lines - f.bodyLines).toBe(own.reduce((n, c) => n + c.insertedLines, 0));
      expect(f.erratum02Corrections).toEqual(
        corrections.filter((x) => x.fragment === f.id).map((x) => x.id),
      );
      expect(f.erratum03Corrections).toEqual(own.map((x) => x.id));
      expect(f.erratum04Corrections).toEqual(own04.map((x) => x.id));
      expect(f.erratum03Sha256 !== f.erratum02Sha256).toBe(f.erratum03Corrections.length > 0);
      expect(f.sha256 !== f.erratum03Sha256).toBe(f.erratum04Corrections.length > 0);
      expect(f.erratum02Sha256 !== f.v11BodySha256).toBe(f.erratum02Corrections.length > 0);
    }
    expect(
      index.fragments.filter((f) => f.erratum02Corrections.length > 0).map((f) => f.id),
    ).toEqual(['F09', 'F11', 'F17', 'F23', 'F26']);
    expect(
      index.fragments.filter((f) => f.erratum03Corrections.length > 0).map((f) => f.id),
    ).toEqual(['F01', 'F11', 'F24']);
    expect(
      index.fragments.filter((f) => f.erratum04Corrections.length > 0).map((f) => f.id),
    ).toEqual(['F12']);
    expect(
      index.fragments
        .filter((f) => f.erratum04Corrections.length > 0)
        .map((f) => [f.id, f.erratum02Corrections, f.erratum03Corrections, f.erratum04Corrections]),
    ).toEqual([['F12', [], [], ['E04-01', 'E04-02', 'E04-03', 'E04-04', 'E04-05', 'E04-06']]]);
    expect(
      index.fragments
        .filter((f) => f.erratum04Corrections.length > 0)
        .map((f) => [f.id, f.erratum03Sha256, f.sha256, f.bytes, f.lines]),
    ).toEqual([
      [
        'F12',
        '572a9cf7182772f01b263ec367f993522c39e81e27edc74e59ea1ba65b6dd5a9',
        'c154aee0e1d441d405f5a0e7c25d883aa643b40fc0458a99061d9f9145c147da',
        34819,
        498,
      ],
    ]);
    expect(
      index.fragments
        .filter((f) => f.erratum03Corrections.length > 0)
        .map((f) => [f.id, f.sha256, f.bytes, f.lines]),
    ).toEqual([
      ['F01', 'f75c45ab8110c3fe5bce5379e77a08a51bc2e3d0561e887310d9c9361d02a6be', 5074, 95],
      ['F11', 'c9f5777fcc699fd9411427e4b17fd3f28258068f925bbb8fcbe3a935fbec75a9', 31403, 606],
      ['F24', 'f68eeea9d1f6a3b192b64163949385d89cd0b0fa369b168d8160d3eaa7006fff', 14628, 250],
    ]);
  });

  it('the index lists every other artifact with its SHA-256', () => {
    const index = JSON.parse(generated.files.get('EXTRACTION_INDEX.json')!) as {
      files: { path: string; sha256: string }[];
    };
    expect(index.files.map((f) => f.path)).toEqual(
      [...generated.files.keys()].filter((p) => p !== 'EXTRACTION_INDEX.json'),
    );
    for (const f of index.files) expect(sha256Hex(generated.files.get(f.path)!)).toBe(f.sha256);
  });

  it('writes only inside prisma/m7/normative (never prisma/migrations)', () => {
    expect(NORMATIVE_OUTPUT_DIR).toBe('prisma/m7/normative');
    for (const p of generated.files.keys()) {
      expect(p).not.toMatch(/(^|\/)\.\.(\/|$)|^\//);
      expect(p).not.toMatch(/migration/i);
    }
    expect([...generated.files.keys()].some((p) => /manifest/i.test(p))).toBe(false);
  });

  it('a controlled drift (changed, missing, extra file) is detected, and restoration is clean', () => {
    const committed = readCommitted();
    const mutated = new Map(committed);
    mutated.set(
      'sql/02_19.3_enumerated-types.sql',
      `${committed.get('sql/02_19.3_enumerated-types.sql')}-- drift\n`,
    );
    mutated.delete('INVENTORY.json');
    mutated.set('sql/27_extra.sql', 'SELECT 1;\n');
    expect(diffArtifacts(generated.files, mutated)).toEqual({
      missing: ['INVENTORY.json'],
      unexpected: ['sql/27_extra.sql'],
      changed: ['sql/02_19.3_enumerated-types.sql'],
    });
    expect(isClean(diffArtifacts(generated.files, committed))).toBe(true);
  });

  it.each(corrections.map((c) => [c.id, c] as const))(
    'restoring the stale pre-Erratum-02 spelling of %s is rejected',
    (_id, c) => {
      const committed = readCommitted();
      const path = [...committed.keys()].find((p) => p.startsWith(`sql/${c.fragment.slice(1)}_`))!;
      const mutated = new Map(committed);
      mutated.set(
        path,
        committed.get(path)!.replace(c.afterLine, () => c.beforeLine),
      );
      expect(mutated.get(path)).not.toBe(committed.get(path));
      expect(diffArtifacts(generated.files, mutated).changed).toEqual([path]);
      expect(findStaleErratum02Bytes(mutated, corrections)).toEqual([
        `${path}: ${c.id} stale pre-Erratum-02 expression ×1`,
      ]);
    },
  );

  it.each(e03Corrections.map((c) => [c.id, c] as const))(
    'restoring the stale pre-Erratum-03 block of %s is rejected',
    (_id, c) => {
      const committed = readCommitted();
      const path = [...committed.keys()].find((p) => p.startsWith(`sql/${c.fragment.slice(1)}_`))!;
      const mutated = new Map(committed);
      mutated.set(
        path,
        committed.get(path)!.replace(c.afterBlock.join('\n'), () => c.beforeBlock.join('\n')),
      );
      expect(mutated.get(path)).not.toBe(committed.get(path));
      expect(diffArtifacts(generated.files, mutated).changed).toEqual([path]);
      expect(findStaleErratum03Bytes(mutated, e03Corrections)).toEqual([
        `${path}: ${c.id} stale pre-Erratum-03 block ×1`,
      ]);
    },
  );

  it('a partially reverted Erratum 03 block is rejected and named', () => {
    const committed = readCommitted();
    const c = e03Corrections.find((x) => x.id === 'E03-01')!;
    const f11 = 'sql/11_19.11.1_internal-helpers.sql';
    const change = c.lineChanges[1]!;
    const mutated = new Map(committed);
    mutated.set(
      f11,
      committed.get(f11)!.replace(change.afterLine, () => change.beforeLine),
    );
    expect(diffArtifacts(generated.files, mutated).changed).toEqual([f11]);
    expect(findStaleErratum03Bytes(mutated, e03Corrections)).toEqual([
      `${f11}: E03-01 stale pre-Erratum-03 line 5235 ×1`,
    ]);
  });

  it.each(e04Corrections.map((c) => [c.id, c] as const))(
    'restoring the stale pre-Erratum-04 statement of %s is rejected',
    (_id, c) => {
      const committed = readCommitted();
      const mutated = new Map(committed);
      mutated.set(
        F12,
        committed.get(F12)!.replace(c.afterBlock.join('\n'), () => c.beforeBlock.join('\n')),
      );
      expect(mutated.get(F12)).not.toBe(committed.get(F12));
      expect(diffArtifacts(generated.files, mutated).changed).toEqual([F12]);
      const stale = findStaleErratum04Bytes(mutated, e04);
      expect(stale).toContain(
        `${F12}: ${c.id} stale pre-Erratum-04 multi-array qualified unnest at line ${c.lineChanges[0]!.fragmentLine}`,
      );
      expect(stale).toContain(`${F12}: ${c.id} stale pre-Erratum-04 statement ×1`);
    },
  );

  it('a partially applied Erratum 04 correction (E04-03, one of two lines) is rejected and named', () => {
    const committed = readCommitted();
    const c = e04Corrections.find((x) => x.id === 'E04-03')!;
    const change = c.lineChanges[1]!;
    const mutated = new Map(committed);
    mutated.set(
      F12,
      committed.get(F12)!.replace(change.afterLine, () => change.beforeLine),
    );
    expect(diffArtifacts(generated.files, mutated).changed).toEqual([F12]);
    const stale = findStaleErratum04Bytes(mutated, e04);
    expect(stale).toContain(`${F12}: E04-03 stale pre-Erratum-04 line 6307 ×1`);
    expect(stale).toContain(`${F12}: E04-03 After statement not at fragment lines 484–487`);
  });

  it('an Erratum 04 correction at the wrong occurrence is rejected', () => {
    const committed = readCommitted();
    const lines = committed.get(F12)!.split('\n');
    // Swap the corrected E04-01 and E04-04 FROM lines: each ROWS FROM now sits at the other occurrence.
    const a = e04Corrections.find((x) => x.id === 'E04-01')!.lineChanges[0]!.fragmentLine - 1;
    const b = e04Corrections.find((x) => x.id === 'E04-04')!.lineChanges[0]!.fragmentLine - 1;
    [lines[a], lines[b]] = [lines[b]!, lines[a]!];
    const mutated = new Map(committed);
    mutated.set(F12, lines.join('\n'));
    expect(diffArtifacts(generated.files, mutated).changed).toEqual([F12]);
    expect(findStaleErratum04Bytes(mutated, e04)).toEqual([
      `${F12}: E04-01 After statement not at fragment lines 478–479`,
      `${F12}: E04-04 After statement not at fragment lines 488–489`,
    ]);
  });

  it('an Erratum 04 correction outside F12 is rejected', () => {
    const committed = readCommitted();
    const f11 = 'sql/11_19.11.1_internal-helpers.sql';
    const mutated = new Map(committed);
    mutated.set(
      f11,
      committed
        .get(f11)!
        .replace(
          'FROM pg_catalog.unnest(p_backends) AS u(b)',
          'FROM ROWS FROM (pg_catalog.unnest(p_backends)) AS u(b)',
        ),
    );
    expect(diffArtifacts(generated.files, mutated).changed).toEqual([f11]);
    expect(findStaleErratum04Bytes(mutated, e04)).toEqual([
      `${f11}: ROWS FROM outside the Erratum 04 occurrences at line(s) 404`,
      `${f11}: preserved single-array unnest call at line 404 altered`,
    ]);
  });

  it.each([286, 294, 308, 326])(
    'an accidental change of the preserved single-array F12 unnest call at line %i is rejected',
    (line) => {
      const committed = readCommitted();
      const lines = committed.get(F12)!.split('\n');
      lines[line - 1] = lines[line - 1]!.replace(
        'pg_catalog.unnest(p_merchant_refs)',
        'ROWS FROM (pg_catalog.unnest(p_merchant_refs))',
      );
      const mutated = new Map(committed);
      mutated.set(F12, lines.join('\n'));
      expect(diffArtifacts(generated.files, mutated).changed).toEqual([F12]);
      expect(findStaleErratum04Bytes(mutated, e04)).toEqual([
        `${F12}: ROWS FROM outside the Erratum 04 occurrences at line(s) ${line}`,
        `${F12}: preserved single-array unnest call at line ${line} altered`,
      ]);
    },
  );

  it('a multi-array qualified unnest introduced into any other fragment is rejected', () => {
    const committed = readCommitted();
    const f10 = 'sql/10_19.10.1_trigger-installation.sql';
    const mutated = new Map(committed);
    mutated.set(
      f10,
      committed
        .get(f10)!
        .replace('pg_catalog.unnest(r.paths)', 'pg_catalog.unnest(r.paths, r.paths)'),
    );
    expect(findStaleErratum04Bytes(mutated, e04)).toEqual([
      `${f10}: stale pre-Erratum-04 multi-array qualified unnest at line 49`,
      `${f10}: preserved single-array unnest call at line 49 altered`,
      `${f10}: 0 single-array pg_catalog.unnest calls ≠ expected 1`,
    ]);
  });

  it('a partial or relocated correction is rejected', () => {
    const committed = readCommitted();
    const f23 = 'sql/23_19.12.6_reconciliation.sql';
    const partial = new Map(committed);
    partial.set(f23, committed.get(f23)!.replace("p_object_key, '/g(", "p_object_key,'/g("));
    expect(diffArtifacts(generated.files, partial).changed).toEqual([f23]);

    const relocated = new Map(committed);
    const f26 = 'sql/26_19.13.4_grants-and-completion.sql';
    // The corrected expression moved to another line (appended to line 1), the named line left stale.
    const lines = committed
      .get(f26)!
      .replace(
        'pg_catalog.substring(p.proname, 1, 2)',
        'pg_catalog.substring(p.proname FROM 1 FOR 2)',
      )
      .split('\n');
    lines[0] = `${lines[0]} -- pg_catalog.substring(p.proname, 1, 2)`;
    relocated.set(f26, lines.join('\n'));
    expect(diffArtifacts(generated.files, relocated).changed).toEqual([f26]);
    expect(findStaleErratum02Bytes(relocated, corrections)).toHaveLength(1);
  });

  it('refuses to generate from bytes that are not the accepted specification or errata', () => {
    const mutated = Uint8Array.from(v11Bytes);
    mutated[mutated.length - 2] = 0x20;
    expect(() =>
      generateNormativeArtifacts(mutated, e01Bytes, e02Bytes, e03Bytes, e04Bytes),
    ).toThrow(SourceIdentityError);
    expect(() =>
      generateNormativeArtifacts(e01Bytes, v11Bytes, e02Bytes, e03Bytes, e04Bytes),
    ).toThrow(SourceIdentityError);
    const e02Mutated = Uint8Array.from(e02Bytes);
    e02Mutated[1000] = e02Mutated[1000] === 0x61 ? 0x62 : 0x61;
    expect(() =>
      generateNormativeArtifacts(v11Bytes, e01Bytes, e02Mutated, e03Bytes, e04Bytes),
    ).toThrow(SourceIdentityError);
    expect(() =>
      generateNormativeArtifacts(v11Bytes, e01Bytes, e01Bytes, e03Bytes, e04Bytes),
    ).toThrow(SourceIdentityError);
    const e03Mutated = Uint8Array.from(e03Bytes);
    e03Mutated[2000] = e03Mutated[2000] === 0x61 ? 0x62 : 0x61;
    expect(() =>
      generateNormativeArtifacts(v11Bytes, e01Bytes, e02Bytes, e03Mutated, e04Bytes),
    ).toThrow(SourceIdentityError);
    expect(() =>
      generateNormativeArtifacts(v11Bytes, e01Bytes, e02Bytes, e02Bytes, e04Bytes),
    ).toThrow(SourceIdentityError);
    const e04Mutated = Uint8Array.from(e04Bytes);
    e04Mutated[2500] = e04Mutated[2500] === 0x61 ? 0x62 : 0x61;
    expect(() =>
      generateNormativeArtifacts(v11Bytes, e01Bytes, e02Bytes, e03Bytes, e04Mutated),
    ).toThrow(SourceIdentityError);
    expect(() =>
      generateNormativeArtifacts(v11Bytes, e01Bytes, e02Bytes, e03Bytes, e03Bytes),
    ).toThrow(SourceIdentityError);
  });
});

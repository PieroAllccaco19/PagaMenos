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
  v11Bytes,
  v11Text,
} from './__fixtures__/accepted-sources';
import { findStaleErratum02Bytes, readErratum02Corrections } from './erratum-02-corrections';
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

const generated = generateNormativeArtifacts(v11Bytes, e01Bytes, e02Bytes);
const { corrections } = readErratum02Corrections(
  v11Text,
  e02Text,
  selectNormativeFragments(v11Text),
);

interface IndexFragment {
  id: string;
  file: string;
  fenceOpenLine: number;
  fenceCloseLine: number;
  bodyLines: number;
  v11BodyBytes: number;
  v11BodySha256: string;
  erratum02Corrections: string[];
  bytes: number;
  sha256: string;
}

describe('S01 generated artifacts', () => {
  it('generation is deterministic', () => {
    const again = generateNormativeArtifacts(v11Bytes, e01Bytes, e02Bytes);
    expect([...again.files.entries()]).toEqual([...generated.files.entries()]);
  });

  it('the committed directory has no drift, no missing and no extra file', () => {
    const drift = diffArtifacts(generated.files, readCommitted());
    expect(drift).toEqual({ missing: [], unexpected: [], changed: [] });
    expect(generated.files.size).toBe(32);
    expect(findStaleErratum02Bytes(readCommitted(), corrections)).toEqual([]);
  });

  it('the index records the current conformance target and all three accepted source identities', () => {
    const index = JSON.parse(generated.files.get('EXTRACTION_INDEX.json')!) as {
      schema: string;
      conformanceTarget: string;
      sources: Record<string, { path: string; gitBlob: string; sha256: string }>;
    };
    expect(index.schema).toBe('pagamenos.m7.s01.normative-ddl-extraction.v2');
    expect(index.conformanceTarget).toBe('M7 V1.1 + accepted Erratum 01 + accepted Erratum 02');
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
      ],
    );
  });

  it('every sql/ file is its V1.1 fence body with exactly its Erratum 02 substitutions applied', () => {
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
      const body = `${effective.join('\n')}\n`;
      expect(generated.files.get(f.file)).toBe(body);
      expect(sha256Hex(body)).toBe(f.sha256);
      expect(new TextEncoder().encode(body).byteLength).toBe(f.bytes);
      expect(body.split('\n').length - 1).toBe(f.bodyLines);
      expect(f.erratum02Corrections).toEqual(
        corrections.filter((x) => x.fragment === f.id).map((x) => x.id),
      );
      expect(f.sha256 !== f.v11BodySha256).toBe(f.erratum02Corrections.length > 0);
    }
    expect(
      index.fragments.filter((f) => f.erratum02Corrections.length > 0).map((f) => f.id),
    ).toEqual(['F09', 'F11', 'F17', 'F23', 'F26']);
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
    expect(() => generateNormativeArtifacts(mutated, e01Bytes, e02Bytes)).toThrow(
      SourceIdentityError,
    );
    expect(() => generateNormativeArtifacts(e01Bytes, v11Bytes, e02Bytes)).toThrow(
      SourceIdentityError,
    );
    const e02Mutated = Uint8Array.from(e02Bytes);
    e02Mutated[1000] = e02Mutated[1000] === 0x61 ? 0x62 : 0x61;
    expect(() => generateNormativeArtifacts(v11Bytes, e01Bytes, e02Mutated)).toThrow(
      SourceIdentityError,
    );
    expect(() => generateNormativeArtifacts(v11Bytes, e01Bytes, e01Bytes)).toThrow(
      SourceIdentityError,
    );
  });
});

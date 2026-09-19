import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { M7_V1_1_ERRATUM_05, gitBlobId, sha256Hex } from '../normative/source';
import { E05_FRAGMENT_PINS, EXTRACTION_INDEX_PIN, S03SourceError, loadS03Sources } from './sources';
import { E05_04_T03 } from './verification';

const ROOT = process.cwd();
const sources = loadS03Sources(ROOT);

describe('M7-S03 input binding: V1.1 + E01–E05 and the E05-regenerated S01 corpus', () => {
  it('binds S1 to V1.1 and Errata 01–05, including the accepted E05 identity', () => {
    expect(sources.s1.map((s) => s.path)).toHaveLength(6);
    const e05 = sources.s1.find((s) => s.path === M7_V1_1_ERRATUM_05.path)!;
    expect(e05.gitBlob).toBe('49651e77f24538f9122c9173f2d0201823d61366');
    expect(e05.sha256).toBe('7d0c0e639e9cda3010d2c2a67b18170accdf3ce18a2f465f98824ca4ac820e95');
  });

  it('consumes exactly 26 fragments, with F18 / F22 at their accepted E05 identities', () => {
    expect(sources.fragments).toHaveLength(26);
    expect(sources.extractionIndex.gitBlob).toBe(EXTRACTION_INDEX_PIN.gitBlob);
    for (const [id, pin] of Object.entries(E05_FRAGMENT_PINS)) {
      const f = sources.fragments.find((x) => x.id === id)!;
      const bytes = readFileSync(join(ROOT, pin.path));
      expect(sha256Hex(bytes)).toBe(pin.sha256);
      expect(bytes.byteLength).toBe(pin.bytes);
      expect(f.lines).toBe(pin.lines);
      expect(f.erratum05Corrections).toEqual(pin.corrections);
      expect(f.identity.gitBlob).toBe(gitBlobId(bytes));
    }
  });

  it('leaves the other 24 fragments byte-identical to their E04-effective identities', () => {
    const others = sources.fragments.filter((f) => f.id !== 'F18' && f.id !== 'F22');
    expect(others).toHaveLength(24);
    for (const f of others) {
      expect(f.erratum05Corrections).toEqual([]);
      expect(f.identity.sha256).toBe(f.erratum04Sha256);
    }
  });

  it('refuses a locally patched fragment (no private "fixed" variant is ever consumed)', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'm7-s03-e05-'));
    try {
      const paths = [
        ...sources.s1.map((s) => s.path),
        ...sources.governing.map((g) => g.path),
        sources.extractionIndex.path,
        ...sources.fragments.map((f) => f.path),
        sources.rolesTemplate.path,
        sources.provisionModule.path,
        sources.canonicalSerializer.path,
      ];
      for (const p of paths) {
        mkdirSync(dirname(join(tmp, p)), { recursive: true });
        copyFileSync(join(ROOT, p), join(tmp, p));
      }
      expect(() => loadS03Sources(tmp)).not.toThrow();
      const f18 = join(tmp, E05_FRAGMENT_PINS.F18.path);
      writeFileSync(
        f18,
        readFileSync(f18, 'utf8').replace('-- ', '--  '), // one byte, same line count
      );
      expect(() => loadS03Sources(tmp)).toThrow(S03SourceError);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('E05-04: the corrected T-03 contract', () => {
  it('expects 42501 for the participant and restrict_violation M7_IMMUTABLE for owner-class', () => {
    expect(E05_04_T03.participant).toEqual({
      sqlstate: '42501',
      message: 'permission denied for table m7_outcome_assertion',
    });
    expect(E05_04_T03.ownerClass.sqlstate).toBe('23001');
    expect(E05_04_T03.ownerClass.message).toBe(
      'M7_IMMUTABLE: UPDATE is forbidden on m7.m7_outcome_assertion',
    );
    expect(E05_04_T03.ownerClass.guard).toBe('m7.t_assertion_redaction_guard');
    expect(E05_04_T03.clause).toContain('E05-04');
  });

  it('is the text Erratum 05 §7.2 fixes (read from the accepted bytes)', () => {
    const e05 = sources.s1.find((s) => s.path === M7_V1_1_ERRATUM_05.path)!.text;
    const after = e05
      .split('\n')
      .find((l) => l.startsWith('| T-03 |') && l.includes('(a) `participant`'));
    expect(after).toBeDefined();
    expect(after).toContain('(a) `42501` permission denied for table `m7_outcome_assertion`');
    expect(after).toContain(
      '(b) `restrict_violation M7_IMMUTABLE` from `m7.t_assertion_redaction_guard`',
    );
    expect(after).toContain('`pagamenos.m7.write_path` unset');
    expect(after).toContain('no T-02-style grant is made');
    expect(after).toContain('no row added or removed');
  });
});

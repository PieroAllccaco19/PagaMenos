// M7 S01 — source identity and Markdown structure. Identity is verified before anything is extracted;
// every structural surprise is refused rather than interpreted.
import { describe, expect, it } from 'vitest';

import { e01Bytes, e02Bytes, e03Bytes, e04Bytes, v11Bytes } from './__fixtures__/accepted-sources';
import {
  CONFORMANCE_TARGET,
  M7_V1_1,
  M7_V1_1_ERRATUM_01,
  M7_V1_1_ERRATUM_02,
  M7_V1_1_ERRATUM_03,
  M7_V1_1_ERRATUM_04,
  SourceIdentityError,
  SourceStructureError,
  gitBlobId,
  parseMarkdown,
  sha256Hex,
  verifyBoundArtifact,
} from './source';

describe('bound artifact identity', () => {
  it('computes Git blob ids exactly as git does', () => {
    // `git hash-object /dev/null` and `printf 'hello\n' | git hash-object --stdin`.
    expect(gitBlobId(new Uint8Array())).toBe('e69de29bb2d1d6434b8b29ae775ad8c2e48c5391');
    expect(gitBlobId(new TextEncoder().encode('hello\n'))).toBe(
      'ce013625030ba8dba906f756967f9e9ca394464a',
    );
  });

  it('the committed V1.1 bytes are the accepted bytes (blob, SHA-256, size, lines)', () => {
    expect(gitBlobId(v11Bytes)).toBe('06e103b0d5e8cfcbb96ab21134d5605b0aae9b26');
    expect(sha256Hex(v11Bytes)).toBe(
      '457f51778fb5d5890b3e3478376e413072f15aef7da88125b5e78963f49394bd',
    );
    expect(() => verifyBoundArtifact(M7_V1_1, v11Bytes)).not.toThrow();
  });

  it('the committed Erratum 01 bytes are the accepted bytes', () => {
    expect(gitBlobId(e01Bytes)).toBe('15ee22090d3e37b6a63dd25914f8abb0f4fa9d4b');
    expect(sha256Hex(e01Bytes)).toBe(
      'f381cb015adadc7a22463060da7ff55e8711b8ab13879c60f93cabf53eb863e8',
    );
    expect(() => verifyBoundArtifact(M7_V1_1_ERRATUM_01, e01Bytes)).not.toThrow();
  });

  it('the committed Erratum 02 bytes are the accepted bytes (blob, SHA-256, size, lines)', () => {
    expect(gitBlobId(e02Bytes)).toBe('a0e6fa6720f23ac08485ab7cb696ab9ba4b7e83f');
    expect(sha256Hex(e02Bytes)).toBe(
      'b7b3440ad04181356770f243a6e2870e004aba604d2a62afdefd5330c85c170f',
    );
    expect(M7_V1_1_ERRATUM_02).toEqual({
      path: 'PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_02.md',
      gitBlob: 'a0e6fa6720f23ac08485ab7cb696ab9ba4b7e83f',
      sha256: 'b7b3440ad04181356770f243a6e2870e004aba604d2a62afdefd5330c85c170f',
      bytes: 44_295,
      lines: 515,
    });
    expect(() => verifyBoundArtifact(M7_V1_1_ERRATUM_02, e02Bytes)).not.toThrow();
  });

  it('the committed Erratum 03 bytes are the accepted bytes (blob, SHA-256, size, lines)', () => {
    expect(gitBlobId(e03Bytes)).toBe('8ba87adc9b87cee749c214d9326b0aa750ceabf0');
    expect(sha256Hex(e03Bytes)).toBe(
      'b4debcb5a02e777e780e14002c5e9cdbb90f2140f5b7516592b8e05e67366160',
    );
    expect(M7_V1_1_ERRATUM_03).toEqual({
      path: 'PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_03.md',
      gitBlob: '8ba87adc9b87cee749c214d9326b0aa750ceabf0',
      sha256: 'b4debcb5a02e777e780e14002c5e9cdbb90f2140f5b7516592b8e05e67366160',
      bytes: 72_201,
      lines: 779,
    });
    expect(() => verifyBoundArtifact(M7_V1_1_ERRATUM_03, e03Bytes)).not.toThrow();
    expect(() => verifyBoundArtifact(M7_V1_1_ERRATUM_03, e02Bytes)).toThrow(SourceIdentityError);
    const wrong = { ...M7_V1_1_ERRATUM_03, gitBlob: 'a0e6fa6720f23ac08485ab7cb696ab9ba4b7e83f' };
    expect(() => verifyBoundArtifact(wrong, e03Bytes)).toThrow(/git blob/);
  });

  it('the committed Erratum 04 bytes are the accepted bytes (blob, SHA-256, size, lines, LF-only)', () => {
    expect(gitBlobId(e04Bytes)).toBe('c839db3948608c875c984a73e366c039c0a5e2dd');
    expect(sha256Hex(e04Bytes)).toBe(
      '3b07d30958aa5c7783fe7458236b8170d1f5a47c0f765e7aa95e5ae68bab00f4',
    );
    expect(M7_V1_1_ERRATUM_04).toEqual({
      path: 'PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_04.md',
      gitBlob: 'c839db3948608c875c984a73e366c039c0a5e2dd',
      sha256: '3b07d30958aa5c7783fe7458236b8170d1f5a47c0f765e7aa95e5ae68bab00f4',
      bytes: 60_164,
      lines: 660,
    });
    expect(() => verifyBoundArtifact(M7_V1_1_ERRATUM_04, e04Bytes)).not.toThrow();
    expect(() => verifyBoundArtifact(M7_V1_1_ERRATUM_04, e03Bytes)).toThrow(SourceIdentityError);
    const wrong = { ...M7_V1_1_ERRATUM_04, gitBlob: '8ba87adc9b87cee749c214d9326b0aa750ceabf0' };
    expect(() => verifyBoundArtifact(wrong, e04Bytes)).toThrow(/git blob/);
    const wrongSha = { ...M7_V1_1_ERRATUM_04, sha256: '0'.repeat(64) };
    expect(() => verifyBoundArtifact(wrongSha, e04Bytes)).toThrow(/sha256/);
    const wrongLines = { ...M7_V1_1_ERRATUM_04, lines: 661 };
    expect(() => verifyBoundArtifact(wrongLines, e04Bytes)).toThrow(/lines/);
    const mutated = Uint8Array.from(e04Bytes);
    mutated[3000] = mutated[3000] === 0x61 ? 0x62 : 0x61;
    expect(() => verifyBoundArtifact(M7_V1_1_ERRATUM_04, mutated)).toThrow(SourceIdentityError);
    const crlf = new TextEncoder().encode(
      new TextDecoder().decode(e04Bytes).replace(/\n/g, '\r\n'),
    );
    expect(() => verifyBoundArtifact(M7_V1_1_ERRATUM_04, crlf)).toThrow(SourceIdentityError);
  });

  it('the conformance target is V1.1 + accepted Erratum 01 + 02 + 03 + 04', () => {
    expect(CONFORMANCE_TARGET).toBe(
      'M7 V1.1 + accepted Erratum 01 + accepted Erratum 02 + accepted Erratum 03 + accepted Erratum 04',
    );
  });

  it('refuses a recorded Erratum 02 identity that is not the accepted one', () => {
    const wrong = { ...M7_V1_1_ERRATUM_02, gitBlob: '15ee22090d3e37b6a63dd25914f8abb0f4fa9d4b' };
    expect(() => verifyBoundArtifact(wrong, e02Bytes)).toThrow(/git blob/);
    const wrongSha = { ...M7_V1_1_ERRATUM_02, sha256: '0'.repeat(64) };
    expect(() => verifyBoundArtifact(wrongSha, e02Bytes)).toThrow(/sha256/);
    expect(() => verifyBoundArtifact(M7_V1_1_ERRATUM_02, e01Bytes)).toThrow(SourceIdentityError);
  });

  it('refuses a single changed byte before extracting anything', () => {
    const mutated = Uint8Array.from(v11Bytes);
    mutated[5000] = mutated[5000] === 0x61 ? 0x62 : 0x61;
    expect(() => verifyBoundArtifact(M7_V1_1, mutated)).toThrow(SourceIdentityError);
  });

  it('refuses the erratum bytes presented as the specification', () => {
    expect(() => verifyBoundArtifact(M7_V1_1, e01Bytes)).toThrow(/git blob/);
  });

  it('refuses CRLF-converted bytes', () => {
    const crlf = new TextEncoder().encode(
      new TextDecoder().decode(v11Bytes).replace(/\n/g, '\r\n'),
    );
    expect(() => verifyBoundArtifact(M7_V1_1, crlf)).toThrow(SourceIdentityError);
  });
});

describe('Markdown structure parser (fail closed)', () => {
  it('parses headings and fences with exact line numbers', () => {
    const s = parseMarkdown('# A\n\n```sql\nSELECT 1;\n# not a heading\n```\n## B\n');
    expect(s.headings.map((h) => [h.line, h.level, h.text])).toEqual([
      [1, 1, '# A'],
      [7, 2, '## B'],
    ]);
    expect(s.fences).toEqual([
      { openLine: 3, closeLine: 6, info: 'sql', body: ['SELECT 1;', '# not a heading'] },
    ]);
  });

  it('refuses an unterminated fence', () => {
    expect(() => parseMarkdown('```sql\nSELECT 1;\n')).toThrow(SourceStructureError);
  });

  it('refuses indented, tilde or trailing-text fence markers instead of guessing', () => {
    expect(() => parseMarkdown('  ```sql\nx\n  ```\n')).toThrow(SourceStructureError);
    expect(() => parseMarkdown('~~~sql\nx\n~~~\n')).toThrow(SourceStructureError);
    expect(() => parseMarkdown('```sql extra\nx\n```\n')).toThrow(SourceStructureError);
    expect(() => parseMarkdown('```sql\n  ```\n```\n')).toThrow(SourceStructureError);
  });
});

// PagaMenos · persistence — hash tests (§8/§32).
//
// NON-TAUTOLOGICAL (§32): the expected digests are precomputed INDEPENDENTLY (out-of-band, via a
// standard SHA-256 of the exact canonical bytes) and hard-coded here as literal vectors. The test
// does NOT recompute the expectation with the same helper it is checking. It also proves the two-step
// property: canonicalHash(value) === sha256Hex(canonicalize(value)).
import { describe, expect, it } from 'vitest';

import { canonicalize } from './canonical';
import { canonicalHash, sha256Hex } from './hash';

// Independent SHA-256 vectors of the exact UTF-8 canonical strings (verified out-of-band).
const VECTORS: ReadonlyArray<{ value: unknown; canonical: string; sha256: string }> = [
  {
    value: {},
    canonical: '{}',
    sha256: '44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a',
  },
  {
    value: { b: 1, a: 2 },
    canonical: '{"a":2,"b":1}',
    sha256: 'd3626ac30a87e6f7a6428233b3c68299976865fa5508e4267c5415c76af7a772',
  },
  {
    value: [1, 2, 3],
    canonical: '[1,2,3]',
    sha256: 'a615eeaee21de5179de080de8c3052c8da901138406ba71c38c032845f7d54f4',
  },
  {
    value: 'pagamenos',
    canonical: '"pagamenos"',
    sha256: 'eb160b2b6edf1839fa987e8c138d538627c9b52545d5483f94138ea0197cd72e',
  },
  {
    value: { nested: { z: 1, a: [true, null] } },
    canonical: '{"nested":{"a":[true,null],"z":1}}',
    sha256: '390b2d0f10a412ae9298685858c47eeb564477948807006ca383d80272f41dfd',
  },
];

describe('sha256Hex — literal vectors', () => {
  it('matches the independently-computed digest of the empty-object canonical string', () => {
    expect(sha256Hex('{}')).toBe(
      '44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a',
    );
  });
  it('produces lowercase 64-hex output', () => {
    expect(sha256Hex('anything')).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('canonicalHash — end-to-end against independent vectors', () => {
  for (const v of VECTORS) {
    it(`hashes ${JSON.stringify(v.value)} to its independent vector`, () => {
      // 1. our canonical form equals the independently-constructed literal string
      expect(canonicalize(v.value)).toBe(v.canonical);
      // 2. the SHA-256 of that literal string equals the out-of-band vector
      expect(sha256Hex(v.canonical)).toBe(v.sha256);
      // 3. the composed helper agrees
      expect(canonicalHash(v.value)).toBe(v.sha256);
    });
  }
});

describe('canonicalHash — order invariance', () => {
  it('object-key order does not change the hash', () => {
    expect(canonicalHash({ a: 1, b: 2 })).toBe(canonicalHash({ b: 2, a: 1 }));
  });
  it('array order DOES change the hash', () => {
    expect(canonicalHash([1, 2])).not.toBe(canonicalHash([2, 1]));
  });
});

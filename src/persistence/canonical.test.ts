// PagaMenos · persistence — canonical serialization tests (§31/§32).
//
// Non-tautological: canonical output is asserted against INDEPENDENTLY-CONSTRUCTED literal strings,
// not against a second call of the same helper. Array order is proven significant; object-key order
// is proven insignificant; undefined handling is proven to match JSON round-trips.
import { describe, expect, it } from 'vitest';

import { canonicalize } from './canonical';
import { PersistenceInvariantError } from './errors';

describe('canonicalize — object-key order does not change output', () => {
  it('sorts keys by code point regardless of insertion order', () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
    expect(canonicalize({ a: 2, b: 1 })).toBe('{"a":2,"b":1}');
  });

  it('two semantically-identical objects (different key order) canonicalize identically', () => {
    const x = {
      merchant: 'm_chinawok',
      status: 'BEST_CONFIRMED',
      delta: { amount: 100, kind: 'C' },
    };
    const y = {
      delta: { kind: 'C', amount: 100 },
      status: 'BEST_CONFIRMED',
      merchant: 'm_chinawok',
    };
    expect(canonicalize(x)).toBe(canonicalize(y));
  });

  it('nested object canonicalization is stable and recursive', () => {
    expect(canonicalize({ nested: { z: 1, a: [true, null] } })).toBe(
      '{"nested":{"a":[true,null],"z":1}}',
    );
  });
});

describe('canonicalize — array order IS semantically significant', () => {
  it('different array orders produce different output', () => {
    expect(canonicalize([1, 2, 3])).toBe('[1,2,3]');
    expect(canonicalize([3, 2, 1])).toBe('[3,2,1]');
    expect(canonicalize([1, 2, 3])).not.toBe(canonicalize([3, 2, 1]));
  });

  it('arrays of objects preserve order while sorting each object internally', () => {
    expect(
      canonicalize([
        { b: 1, a: 2 },
        { d: 4, c: 3 },
      ]),
    ).toBe('[{"a":2,"b":1},{"c":3,"d":4}]');
  });
});

describe('canonicalize — undefined handling matches JSON round-trip', () => {
  it('drops undefined-valued object keys (parity with JSONB round-trip)', () => {
    expect(canonicalize({ a: 1, b: undefined })).toBe('{"a":1}');
    expect(canonicalize({ a: 1, b: undefined })).toBe(canonicalize({ a: 1 }));
    // A JSONB round-trip (JSON.stringify → parse) drops the same key ⇒ a reloaded record re-hashes
    // identically to what was stored.
    expect(canonicalize(JSON.parse(JSON.stringify({ a: 1, b: undefined })))).toBe('{"a":1}');
  });

  it('maps undefined inside an array to null (JSON.stringify parity)', () => {
    expect(canonicalize([1, undefined, 3])).toBe('[1,null,3]');
    expect(canonicalize([1, undefined, 3])).toBe(JSON.stringify([1, undefined, 3]));
  });
});

describe('canonicalize — determinism & string escaping', () => {
  it('is deterministic across repeated calls', () => {
    const v = { x: [1, { y: 'z\n"q"' }], w: 'å' };
    expect(canonicalize(v)).toBe(canonicalize(v));
  });
  it('escapes strings via JSON semantics', () => {
    expect(canonicalize('a"b\n')).toBe('"a\\"b\\n"');
    expect(canonicalize('pagamenos')).toBe('"pagamenos"');
  });
  it('normalizes -0 to 0', () => {
    expect(canonicalize(-0)).toBe('0');
  });
});

describe('canonicalize — rejects non-finite / non-JSON values (fail-closed)', () => {
  it('throws on NaN', () => {
    expect(() => canonicalize(NaN)).toThrow(PersistenceInvariantError);
  });
  it('throws on Infinity', () => {
    expect(() => canonicalize(Infinity)).toThrow(PersistenceInvariantError);
    expect(() => canonicalize(-Infinity)).toThrow(PersistenceInvariantError);
  });
  it('throws on bigint / function / symbol', () => {
    expect(() => canonicalize(1n)).toThrow(PersistenceInvariantError);
    expect(() => canonicalize(() => 1)).toThrow(PersistenceInvariantError);
    expect(() => canonicalize(Symbol('s'))).toThrow(PersistenceInvariantError);
  });
  it('throws on a non-finite number nested deep in the structure, naming the path', () => {
    expect(() => canonicalize({ a: { b: [1, NaN] } })).toThrow(/a\.b\[1\]/);
  });
});

describe('canonicalize — rejects non-plain prototypes (§23/§25)', () => {
  it('throws on a Date instance', () => {
    expect(() => canonicalize(new Date())).toThrow(PersistenceInvariantError);
    expect(() => canonicalize({ at: new Date() })).toThrow(PersistenceInvariantError);
  });

  it('throws on a class instance', () => {
    class Widget {
      x = 1;
    }
    expect(() => canonicalize(new Widget())).toThrow(PersistenceInvariantError);
  });

  it('throws on Map / Set', () => {
    expect(() => canonicalize(new Map())).toThrow(PersistenceInvariantError);
    expect(() => canonicalize(new Set())).toThrow(PersistenceInvariantError);
  });

  it('throws on an object whose prototype carries toJSON (exact adversarial shape)', () => {
    const evil = Object.create({
      toJSON() {
        return { hacked: true };
      },
    }) as Record<string, unknown>;
    evil.merchantId = 'm_chinawok';
    expect(() => canonicalize(evil)).toThrow(PersistenceInvariantError);
  });

  it('accepts a null-prototype plain object', () => {
    const obj = Object.assign(Object.create(null), { a: 1, b: 2 });
    expect(canonicalize(obj)).toBe('{"a":1,"b":2}');
  });
});

describe('canonicalize — rejects sparse arrays (§24)', () => {
  it('throws on a hole', () => {
    // eslint-disable-next-line no-sparse-arrays
    expect(() => canonicalize([1, , 3])).toThrow(PersistenceInvariantError);
    expect(() => canonicalize(Array(1))).toThrow(PersistenceInvariantError);
  });

  it('accepts explicit null and explicit undefined (→ null) elements', () => {
    expect(canonicalize([1, null, 3])).toBe('[1,null,3]');
    expect(canonicalize([1, undefined, 3])).toBe('[1,null,3]');
  });
});

// PagaMenos · src/persistence — deterministic canonical JSON serialization (§8/§31).
//
// The hash fingerprints (§8) MUST be stable across semantically-identical snapshots. Plain
// `JSON.stringify` is NOT safe for this: object-key insertion order changes its output, so two
// structurally-equal objects could hash differently. This serializer removes that ambiguity:
//
//   • object keys are emitted in Unicode code-point order (recursively);
//   • ARRAY order is preserved — arrays are semantically ordered in the engine contract
//     (candidate lists, top-set refs, holiday calendars) and reordering them is a real change;
//   • `undefined`-valued object keys are DROPPED (matching JSON semantics), so an explicitly-absent
//     optional field (`winnerRef: undefined`) canonicalizes identically to its DB round-trip, where
//     JSONB has already elided it — the in-memory hash and the reloaded hash therefore agree;
//   • `undefined` inside an array becomes `null` (again matching `JSON.stringify`);
//   • non-finite numbers (NaN / ±Infinity), bigint, function and symbol values are REJECTED — a
//     snapshot must be a pure finite JSON value, never a lossy or environment-dependent one.
//
// No I/O, no crypto here — pure string construction. Hashing lives in `./hash`.
import { PersistenceInvariantError } from './errors';

/** A value that is safe to canonicalize (finite JSON). */
export type Canonicalizable =
  | null
  | boolean
  | number
  | string
  | Canonicalizable[]
  | { [key: string]: Canonicalizable | undefined };

function encode(value: unknown, path: string): string {
  if (value === null) return 'null';

  const t = typeof value;
  if (t === 'boolean') return value ? 'true' : 'false';
  if (t === 'string') return JSON.stringify(value);
  if (t === 'number') {
    if (!Number.isFinite(value as number)) {
      throw new PersistenceInvariantError(
        `non-finite number at ${path}: ${String(value)} cannot be canonicalized`,
      );
    }
    // JSON.stringify of a finite number is a stable canonical decimal form (and normalizes -0 → 0).
    return JSON.stringify(value);
  }
  if (t === 'bigint') {
    throw new PersistenceInvariantError(`bigint at ${path} cannot be canonicalized`);
  }
  if (t === 'function' || t === 'symbol' || t === 'undefined') {
    throw new PersistenceInvariantError(`${t} at ${path} cannot be canonicalized`);
  }

  if (Array.isArray(value)) {
    // Sparse arrays serialize inconsistently and are a corruption vector — reject them (§24). Every
    // index in [0, length) must be a real own element; explicit `null` is fine, a hole is not.
    for (let i = 0; i < value.length; i++) {
      if (!(i in value)) {
        throw new PersistenceInvariantError(
          `sparse array at ${path}[${i}] cannot be canonicalized`,
        );
      }
    }
    // Array order is significant and preserved; an explicit `undefined` element becomes null (JSON
    // parity) — a HOLE was already rejected above.
    const parts = value.map((el, i) => (el === undefined ? 'null' : encode(el, `${path}[${i}]`)));
    return `[${parts.join(',')}]`;
  }

  // Only PLAIN objects (Object.prototype or null prototype) are canonicalizable (§23/§25). A Date, a
  // Map/Set, a class instance, or any object carrying a prototype `toJSON`/getters could serialize
  // differently later (e.g. through JSONB) — fail closed rather than store a value that will not
  // round-trip to the same bytes.
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    throw new PersistenceInvariantError(
      `non-plain object (prototype ${proto?.constructor?.name ?? 'unknown'}) at ${path} cannot be canonicalized`,
    );
  }

  // Plain object: sort keys by code point, drop undefined-valued keys.
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  const parts = keys.map((k) => `${JSON.stringify(k)}:${encode(obj[k], `${path}.${k}`)}`);
  return `{${parts.join(',')}}`;
}

/**
 * Deterministic canonical JSON string for `value`. Semantically-identical values (differing only in
 * object-key order or in the presence of `undefined`-valued keys) produce byte-identical output.
 * Accepts `unknown` and validates structurally at runtime — throws `PersistenceInvariantError` for
 * any non-finite / non-JSON value.
 */
export function canonicalize(value: unknown): string {
  return encode(value, '$');
}

/**
 * Fail closed if `value` is not pure, plain, finite JSON (§23/§26): a Date, class instance, Map/Set,
 * prototype-`toJSON` object, sparse array, non-finite number, bigint, function or symbol anywhere in
 * the structure throws `PersistenceInvariantError`. Used at the write boundary to reject an
 * adversarial/non-plain request BEFORE any engine or DB work. Returns void.
 */
export function assertCanonicalizable(value: unknown): void {
  encode(value, '$');
}

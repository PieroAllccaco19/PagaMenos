// PagaMenos · src/persistence — SHA-256 fingerprints over canonical JSON (§8/§28).
//
// Hashing belongs OUTSIDE the pure engine (§8): Node's crypto is used here at the persistence
// boundary only. The engine never imports crypto. SHA-256 is sufficient for tamper/corruption
// detection of an immutable historical snapshot; these are integrity fingerprints, not secrets.
import { createHash } from 'node:crypto';

import { canonicalize } from './canonical';

/** Lowercase hex SHA-256 of a UTF-8 string. */
export function sha256Hex(input: string): string {
  return createHash('sha256').update(Buffer.from(input, 'utf8')).digest('hex');
}

/** Canonicalize `value` then SHA-256 it — the exact fingerprint stored as inputHash / outputHash. */
export function canonicalHash(value: unknown): string {
  return sha256Hex(canonicalize(value));
}

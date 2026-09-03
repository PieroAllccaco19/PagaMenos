// PagaMenos · src/db — exact Prisma P2002 (unique-violation) classifier (Sol Closure 4). INTERNAL.
//
// OBSERVED REPRESENTATION (empirically verified against this repository's Prisma 6.19 / PostgreSQL
// stack via an ephemeral-cluster probe): a P2002 carries
//     e.code === 'P2002'
//     e.meta === { modelName: '<Model>', target: ['<field>', '<field>', …] }
// i.e. `meta.target` is an ARRAY OF THE PRISMA SCHEMA FIELD NAMES of the violated unique index — NOT a
// DB constraint-name string and NOT a message substring. Classification therefore compares the exact
// SET of field names; there is NO substring matching. Any P2002 whose target is not an array of strings,
// or whose field set does not EXACTLY equal one of the constraints the caller expected, is UNKNOWN and
// the caller MUST fail closed (never treat an arbitrary P2002 as idempotent success).
import { Prisma } from '@prisma/client';

/** A unique constraint the caller is prepared to reconcile: a stable id + its exact field set. */
export interface UniqueConstraintSpec {
  /** Caller-stable logical id for the constraint (used to branch reconciliation). */
  readonly id: string;
  /** The EXACT Prisma field names composing the unique index (order-independent). */
  readonly fields: readonly string[];
}

export type P2002Classification =
  | { matched: true; id: string; fields: string[] }
  | { matched: false; reason: string; target: unknown };

/** A Prisma unique-constraint (P2002) violation. */
export function isUniqueViolation(e: unknown): e is Prisma.PrismaClientKnownRequestError {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
}

/** The raw `meta.target` as a normalized sorted field array, or null if not the observed array shape. */
export function uniqueViolationTargetFields(e: unknown): string[] | null {
  if (!isUniqueViolation(e)) return null;
  const target = (e.meta as { target?: unknown } | undefined)?.target;
  if (Array.isArray(target) && target.every((t) => typeof t === 'string')) {
    return [...(target as string[])].sort();
  }
  return null;
}

const sortedEqual = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((x, i) => x === b[i]);

/**
 * Classify a P2002 against the EXACT unique constraints the caller expected. Returns the matched
 * constraint's id, or `{ matched: false }` — never a fuzzy/substring guess. `{ matched: false }` (unknown
 * or unexpected target) MUST be handled by the caller as fail-closed (rethrow), per Sol Closure 4.
 */
export function classifyUniqueViolation(
  e: unknown,
  expected: readonly UniqueConstraintSpec[],
): P2002Classification {
  const target = (e as { meta?: { target?: unknown } } | undefined)?.meta?.target;
  const fields = uniqueViolationTargetFields(e);
  if (fields === null) {
    return {
      matched: false,
      reason: 'P2002 target is not the expected array-of-field-names',
      target,
    };
  }
  for (const spec of expected) {
    if (sortedEqual(fields, [...spec.fields].sort())) {
      return { matched: true, id: spec.id, fields };
    }
  }
  return { matched: false, reason: 'P2002 target matches no expected constraint', target };
}

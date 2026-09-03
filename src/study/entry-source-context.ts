// PagaMenos · src/study — trusted entry-source provenance (A2 §5/§6/§8; mirrors A1-CODE-01).
//
// A2 records a TRUSTED entry provenance (`entrySource`) on the capture token. That provenance is a
// scientific fact and MUST NOT be caller-chosen: a participant-facing request cannot be permitted to
// submit `{ kind: 'RESEARCH_LINK', researchLinkId: 'chosen' }` and thereby acquire trusted RESEARCH
// provenance. Authority here is a MODULE-PRIVATE `WeakSet` registry, exactly like the trusted
// participant context: a `ResolvedEntrySource` is valid ONLY if THIS module minted it. Runtime
// validation (`isResolvedEntrySource`) tests registry membership, NOT the object's shape — so a plain
// object, a spread/clone, a JSON round-trip, or an `as unknown as ResolvedEntrySource` cast is REJECTED.
//
// The CREATION primitive (`createResolvedEntrySource`) is NOT re-exported by the pure `@/study` barrel
// nor by the public `@/services` barrel. It is reachable only from the trusted session adapter
// (`services/study-participant-session.ts`) and tests — enforced by ESLint + the module-capability AST
// test. The trusted server layer resolves entry evidence from trusted server signals (never caller
// JSON) and mints the `ResolvedEntrySource`; participant-facing code can only forward one it was given.
import {
  resolveTrustedEntrySource,
  type TrustedEntryEvidence,
} from './purchase-intent-entry-source';
import type { EntrySource } from './purchase-intent-entry-source';

/** A trusted, resolved entry provenance (A2 §8). Validity = registry membership below, not shape. */
export interface ResolvedEntrySource {
  readonly entrySource: EntrySource;
}

/** Module-private authority: only objects this module minted are ever members. Not exported. */
const resolvedRegistry = new WeakSet<object>();

/**
 * Resolve trusted entry evidence to a registered `ResolvedEntrySource`. INTERNAL creation primitive —
 * reachable only from the trusted session adapter and tests (never the public barrels). The evidence
 * is supplied by the trusted server layer from trusted signals, never chosen by participant-facing code.
 */
export function createResolvedEntrySource(
  evidence: readonly TrustedEntryEvidence[],
): ResolvedEntrySource {
  const entrySource = resolveTrustedEntrySource(evidence);
  // Frozen so the caller cannot mutate it; registered so membership — not shape — is the authority.
  const resolved: ResolvedEntrySource = Object.freeze({ entrySource });
  resolvedRegistry.add(resolved);
  return resolved;
}

/**
 * Runtime-unforgeable validation: `value` is a genuine resolved entry source ONLY if THIS module
 * minted it. Shape, own-symbols, prototype, and type assertions are irrelevant — a non-registered
 * object is rejected regardless of how convincingly it mimics one (A2 §8, mirrors A1-CODE-01).
 */
export function isResolvedEntrySource(value: unknown): value is ResolvedEntrySource {
  return typeof value === 'object' && value !== null && resolvedRegistry.has(value as object);
}

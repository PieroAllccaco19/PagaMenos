// PagaMenos · src/study — trusted participant context / own-assignment binding (spec §12/§13; A1-CODE-01).
//
// Consent operations MUST NOT trust an `assignmentId` — nor a participant identity — chosen by an
// arbitrary request. Authority here is a MODULE-PRIVATE `WeakSet` registry: a context is valid ONLY if
// this module registered it. Runtime validation (`isTrustedParticipantContext`) tests membership in
// that inaccessible registry, NOT the object's shape, symbols, or type. Therefore a plain object, a
// spread/clone, a symbol copy, a JSON round-trip, or an `as unknown as TrustedParticipantContext`
// cast is REJECTED (never registered), and a legitimate context for participant A cannot be mutated
// (it is frozen) or transformed into one for B (any derived object is a different, unregistered
// reference). The context body is immutable from the caller's perspective.
//
// The CREATION primitive (`createTrustedParticipantContext`) is NOT re-exported by the pure `@/study`
// barrel nor by the public `@/services` barrel. It is reachable only from the trusted session adapter
// (`services/study-participant-session.ts`) and tests — enforced by ESLint + the module-capability AST
// test. Participant-facing code therefore cannot mint a context, and cannot select `participantId`.

/** A trusted, resolved participant actor context (spec §12). Validity = registry membership below. */
export interface TrustedParticipantContext {
  readonly participantId: string;
}

/** Module-private authority: only objects this module created are ever members. Not exported. */
const trustedRegistry = new WeakSet<object>();

/**
 * Create a trusted participant context and register it as authoritative. INTERNAL creation primitive
 * — reachable only from the trusted session adapter and tests (never the public barrels). The
 * `participantId` is supplied by the trusted adapter from an authenticated identity, never chosen by
 * participant-facing code.
 */
export function createTrustedParticipantContext(participantId: string): TrustedParticipantContext {
  const id = participantId.trim();
  if (id.length === 0) {
    throw new Error('createTrustedParticipantContext requires a non-empty participantId');
  }
  // Frozen so the caller cannot mutate the authoritative identity; registered so membership — not
  // shape — is the authority. A spread/clone of this object is a different, unregistered reference.
  const context: TrustedParticipantContext = Object.freeze({ participantId: id });
  trustedRegistry.add(context);
  return context;
}

/**
 * Runtime-unforgeable validation: `value` is a genuine trusted context ONLY if THIS module registered
 * it. Shape, own-symbols, prototype, and type assertions are irrelevant — a non-registered object is
 * rejected regardless of how convincingly it mimics a context (A1-CODE-01).
 */
export function isTrustedParticipantContext(value: unknown): value is TrustedParticipantContext {
  return typeof value === 'object' && value !== null && trustedRegistry.has(value as object);
}

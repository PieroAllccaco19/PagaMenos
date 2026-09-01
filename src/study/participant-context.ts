// PagaMenos · src/study — trusted participant context / own-assignment binding (spec §12/§13).
//
// Consent operations MUST NOT trust an `assignmentId` from an arbitrary request. A trusted participant
// actor/session context carries the resolved participant identity; the consent service honors an
// opaque assignment reference ONLY if it belongs to that participant. Full authentication is out of
// A1 scope; this is the trusted-context ownership binding the spec requires.
//
// NOMINAL BRAND: the context value is stamped with a MODULE-PRIVATE symbol, so a valid context can be
// produced ONLY by `mintTrustedParticipantContext` here — arbitrary code importing the type cannot
// fabricate one via an object literal (it cannot name the symbol). Participant-facing code obtains a
// context for its OWN authenticated participant; it can never mint one for another participant.

const TRUSTED_PARTICIPANT_CONTEXT = Symbol('pagamenos.study.TrustedParticipantContext');

/** A trusted, resolved participant actor context (spec §12). Nominal — see module note. */
export interface TrustedParticipantContext {
  readonly [TRUSTED_PARTICIPANT_CONTEXT]: true;
  /** The resolved participant this context speaks for. */
  readonly participantId: string;
}

/** Mint a trusted participant context (trusted adapter; stands in for authenticated session). */
export function mintTrustedParticipantContext(args: { participantId: string }): TrustedParticipantContext {
  const participantId = args.participantId.trim();
  if (participantId.length === 0) {
    throw new Error('mintTrustedParticipantContext requires a non-empty participantId');
  }
  return { [TRUSTED_PARTICIPANT_CONTEXT]: true, participantId };
}

/** Type guard: a value is a genuine (branded) trusted participant context. */
export function isTrustedParticipantContext(value: unknown): value is TrustedParticipantContext {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Record<symbol, unknown>)[TRUSTED_PARTICIPANT_CONTEXT] === true &&
    typeof (value as { participantId?: unknown }).participantId === 'string'
  );
}

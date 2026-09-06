// PagaMenos · src/services — trusted participant session adapter (spec §12; A1-CODE-01). SANCTIONED.
//
// The ONLY sanctioned construction path for a `TrustedParticipantContext`. It maps a runtime-trusted,
// already-authenticated participant identity to a registry-backed context (the creation primitive is
// module-private to `@/study/participant-context`). This adapter is the seam a trusted server-side
// session/auth layer calls; it is NOT re-exported by the public `@/services` barrel and is off-limits
// to participant-facing/app code (ESLint + module-capability AST test), so arbitrary code can neither
// import it nor choose an authoritative `participantId`.
//
// A1 does not implement full authentication (out of scope, spec §12). `authenticatedParticipantId`
// MUST be resolved by a trusted caller from a genuine authenticated identity — never taken from an
// untrusted request body.
// Import the creation primitive DIRECTLY from the restricted submodule — it is intentionally NOT on
// the `@/study` barrel. This module is one of the only sanctioned importers (module-capability test).
import {
  createTrustedParticipantContext,
  type TrustedParticipantContext,
} from '@/study/participant-context';
// The entry-source creation primitive is likewise module-private to `@/study/entry-source-context`;
// this trusted adapter is one of the only sanctioned importers (module-capability AST test).
import { createResolvedEntrySource, type ResolvedEntrySource } from '@/study/entry-source-context';
import type { TrustedEntryEvidence } from '@/study';

export interface ResolveTrustedParticipantContextArgs {
  /** A participant identity already authenticated by a trusted caller (never an untrusted request). */
  authenticatedParticipantId: string;
}

/** Resolve a trusted participant context from an authenticated identity (trusted callers only). */
export function resolveTrustedParticipantContext(
  args: ResolveTrustedParticipantContextArgs,
): TrustedParticipantContext {
  return createTrustedParticipantContext(args.authenticatedParticipantId);
}

/**
 * Resolve TRUSTED entry-source evidence to a registry-backed `ResolvedEntrySource` (A2 §8). The
 * evidence is derived by the trusted server layer from trusted signals (research/auth links, saved
 * decisions, share tokens, content tokens) — never from a participant-facing request body. This is the
 * ONLY sanctioned construction path for trusted entry provenance; participant-facing code cannot mint
 * one, so it cannot self-assign RESEARCH/AUTH/etc. provenance.
 */
export function resolveTrustedEntrySource(
  evidence: readonly TrustedEntryEvidence[],
): ResolvedEntrySource {
  return createResolvedEntrySource(evidence);
}

// PagaMenos · src/study — M3.5B-A2 trusted entry-source provenance (A2 §8; DG-03).
//
// entrySource is TRUSTED server-resolved provenance, never participant-selected. A closed discriminated
// `TrustedEntryEvidence` union carries only server-resolved route/token/session state; the resolver
// maps + de-duplicates + applies a frozen precedence to yield exactly one `EntrySource`. This is
// trusted CAPTURE provenance, explicitly NOT later B entry-source adjudication/contamination.
import { TrustedEntrySourceError } from './purchase-intent-errors';

/** Accepted entry-source categories (Phase 0A §29). */
export const ENTRY_SOURCES = [
  'DIRECT',
  'CONTENT',
  'SHARED_LINK',
  'RESEARCH_LINK',
  'AUTH_LINK',
  'SAVED_DECISION',
  'OTHER',
] as const;
export type EntrySource = (typeof ENTRY_SOURCES)[number];

/** Closed discriminated union of TRUSTED server-resolved capture evidence (A2 §16). */
export type TrustedEntryEvidence =
  | { kind: 'RESEARCH_LINK'; researchLinkId: string }
  | { kind: 'AUTH_LINK'; authMessageId: string }
  | { kind: 'SAVED_DECISION'; savedDecisionId: string }
  | { kind: 'SHARED_LINK'; shareTokenId: string }
  | { kind: 'CONTENT'; contentTokenId: string }
  | { kind: 'DIRECT' }
  | { kind: 'UNCLASSIFIED' };

/** Frozen precedence, highest first (A2 §17). */
const PRECEDENCE: ReadonlyArray<TrustedEntryEvidence['kind']> = [
  'RESEARCH_LINK',
  'AUTH_LINK',
  'SAVED_DECISION',
  'SHARED_LINK',
  'CONTENT',
  'DIRECT',
  'UNCLASSIFIED',
];

/** Exact mapping from evidence kind to entry source (A2 §17). */
function mapKind(kind: TrustedEntryEvidence['kind']): EntrySource {
  switch (kind) {
    case 'RESEARCH_LINK':
      return 'RESEARCH_LINK';
    case 'AUTH_LINK':
      return 'AUTH_LINK';
    case 'SAVED_DECISION':
      return 'SAVED_DECISION';
    case 'SHARED_LINK':
      return 'SHARED_LINK';
    case 'CONTENT':
      return 'CONTENT';
    case 'DIRECT':
      return 'DIRECT';
    case 'UNCLASSIFIED':
      return 'OTHER';
    default: {
      const _exhaustive: never = kind;
      throw new TrustedEntrySourceError(`unhandled evidence kind ${String(_exhaustive)}`);
    }
  }
}

/** True iff an id-bearing evidence variant carries a non-empty trusted id. */
function hasValidId(e: TrustedEntryEvidence): boolean {
  switch (e.kind) {
    case 'RESEARCH_LINK':
      return e.researchLinkId.trim().length > 0;
    case 'AUTH_LINK':
      return e.authMessageId.trim().length > 0;
    case 'SAVED_DECISION':
      return e.savedDecisionId.trim().length > 0;
    case 'SHARED_LINK':
      return e.shareTokenId.trim().length > 0;
    case 'CONTENT':
      return e.contentTokenId.trim().length > 0;
    case 'DIRECT':
    case 'UNCLASSIFIED':
      return true;
    default: {
      const _exhaustive: never = e;
      return Boolean(_exhaustive);
    }
  }
}

/**
 * Resolve exactly one trusted `EntrySource` from a set of server-resolved evidence (A2 §18). Invalid
 * or unrecognized evidence → OTHER. A participant-declared fallback is never accepted. Deterministic:
 * dedup by kind, then apply the frozen precedence.
 */
export function resolveTrustedEntrySource(evidence: readonly TrustedEntryEvidence[]): EntrySource {
  const recognizedKinds = new Set<TrustedEntryEvidence['kind']>();
  for (const e of evidence) {
    if (PRECEDENCE.includes(e.kind) && hasValidId(e)) recognizedKinds.add(e.kind);
  }
  if (recognizedKinds.size === 0) return 'OTHER';
  for (const kind of PRECEDENCE) {
    if (recognizedKinds.has(kind)) return mapKind(kind);
  }
  return 'OTHER';
}

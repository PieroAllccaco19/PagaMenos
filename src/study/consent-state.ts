// PagaMenos · src/study — pure consent state machine + authorization intervals (spec §8/§15/§16).
//
// PURE and deterministic: no I/O, no clock, no DB. Consumes A1 consent facts (ordered by `consentSeq`,
// NEVER by asserted timestamps, spec §8.6) and derives the state machine transition, the retrospective
// authorization intervals (§16), and the collection-time authorization contract (§8.8). These are the
// contracts A2+/C2 consume; A1 introduces no new scientific authority here.

/** A recorded consent fact (the fields A1 persists). Instants are ISO-8601 strings. */
export interface ConsentEventFact {
  consentSeq: number;
  action: 'GRANTED' | 'WITHDRAWN';
  consentVersion: string | null;
  privacyNoticeVersion: string | null;
  optionalEvidenceConsent: boolean | null;
  /** Meaningful only on WITHDRAWN (may narrow retrospective authorization, §8.6). NULL on GRANTED. */
  assertedEffectiveAt: string | null;
  /** Trusted authorization instant (opens a grant / closes a withdrawal, §8.6). */
  capturedAt: string;
  /** Knowledge time — when the fact was recorded (§8.8). */
  recordedAt: string;
}

/** Effective (as-of) consent state (spec §8.3). */
export type EffectiveConsentState = 'NO_CONSENT' | 'GRANTED' | 'WITHDRAWN';

/** Grant provenance carried by a GRANT command (spec §8.4). */
export interface ConsentGrantProvenance {
  consentVersion: string;
  privacyNoticeVersion: string;
  optionalEvidenceConsent: boolean;
}

/** Parse an ISO instant to epoch milliseconds for ORDERING/`min` only (never for event ordering). */
function ms(iso: string): number {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) throw new Error(`invalid instant: ${JSON.stringify(iso)}`);
  return t;
}

/** Events sorted by `consentSeq` — the ONLY ordering authority (spec §8.6). Returns a new array. */
export function orderBySeq(events: readonly ConsentEventFact[]): ConsentEventFact[] {
  return [...events].sort((a, b) => a.consentSeq - b.consentSeq);
}

/** The effective (last-sequenced) event, or null for an empty history. */
export function effectiveEvent(events: readonly ConsentEventFact[]): ConsentEventFact | null {
  const ordered = orderBySeq(events);
  return ordered.length === 0 ? null : ordered[ordered.length - 1]!;
}

/** The effective consent state derived by `consentSeq` order (spec §8.3). */
export function effectiveConsentState(events: readonly ConsentEventFact[]): EffectiveConsentState {
  const last = effectiveEvent(events);
  if (!last) return 'NO_CONSENT';
  return last.action === 'GRANTED' ? 'GRANTED' : 'WITHDRAWN';
}

// ---------------------------------------------------------------------------------------------------
// State-machine transition evaluation (spec §8.3/§15). PURE — decides append/no-op/correction/reject.
// The service composes this with row-lock serialization + sequence allocation (§8.10); this function
// makes no timestamp-equality decision (spec §8.7: same-instant rule removed).
// ---------------------------------------------------------------------------------------------------

export type ConsentTransition =
  | { kind: 'APPEND'; action: 'GRANTED' | 'WITHDRAWN' }
  | { kind: 'NO_OP_EFFECTIVE_STATE' }
  | { kind: 'CORRECTION_NOT_APPLIED' }
  | {
      kind: 'REJECT_INVALID_TRANSITION';
      command: 'GRANT' | 'WITHDRAW';
      fromState: EffectiveConsentState;
    }
  | { kind: 'REJECT_UPDATE_NOT_SUPPORTED' };

/** Whether a GRANT provenance exactly equals a prior GRANTED event's provenance (spec §8.4). */
export function grantProvenanceEquals(
  event: ConsentEventFact,
  provenance: ConsentGrantProvenance,
): boolean {
  return (
    event.action === 'GRANTED' &&
    event.consentVersion === provenance.consentVersion &&
    event.privacyNoticeVersion === provenance.privacyNoticeVersion &&
    event.optionalEvidenceConsent === provenance.optionalEvidenceConsent
  );
}

/** Whether a WITHDRAW's asserted instant equals a prior WITHDRAWN event's (spec §8.13). Compared by
 * INSTANT (offset-robust), so `null`/absent are equal and equivalent instants under different offsets
 * are equal — a mere string-representation difference is not a "changed" assertion. */
export function withdrawalAssertionEquals(
  event: ConsentEventFact,
  assertedEffectiveAt: string | null,
): boolean {
  if (event.action !== 'WITHDRAWN') return false;
  const a = event.assertedEffectiveAt;
  const b = assertedEffectiveAt;
  if (a === null || b === null) return a === b; // both null ⇒ equal; exactly one null ⇒ different
  return ms(a) === ms(b);
}

/** Evaluate a GRANT against the current history (spec §8.3). */
export function evaluateGrant(
  events: readonly ConsentEventFact[],
  provenance: ConsentGrantProvenance,
): ConsentTransition {
  const state = effectiveConsentState(events);
  if (state === 'NO_CONSENT') return { kind: 'APPEND', action: 'GRANTED' };
  if (state === 'WITHDRAWN')
    return { kind: 'REJECT_INVALID_TRANSITION', command: 'GRANT', fromState: state };
  // GRANTED: exact repeat is a no-op; any material difference is not an update.
  const last = effectiveEvent(events)!;
  return grantProvenanceEquals(last, provenance)
    ? { kind: 'NO_OP_EFFECTIVE_STATE' }
    : { kind: 'REJECT_UPDATE_NOT_SUPPORTED' };
}

/** Evaluate a WITHDRAW against the current history (spec §8.3). A legal GRANTED→WITHDRAW ALWAYS
 * appends (§8.6); the interval algorithm — not this function — decides the resulting interval. */
export function evaluateWithdraw(
  events: readonly ConsentEventFact[],
  assertedEffectiveAt: string | null,
): ConsentTransition {
  const state = effectiveConsentState(events);
  if (state === 'NO_CONSENT')
    return { kind: 'REJECT_INVALID_TRANSITION', command: 'WITHDRAW', fromState: state };
  if (state === 'GRANTED') return { kind: 'APPEND', action: 'WITHDRAWN' };
  // WITHDRAWN: exact repeat is a no-op; a changed/earlier assertion is a correction that is NOT applied.
  const last = effectiveEvent(events)!;
  return withdrawalAssertionEquals(last, assertedEffectiveAt)
    ? { kind: 'NO_OP_EFFECTIVE_STATE' }
    : { kind: 'CORRECTION_NOT_APPLIED' };
}

// ---------------------------------------------------------------------------------------------------
// Authorization intervals (spec §16) — the normative pure derivation, restricted to a visible set.
// ---------------------------------------------------------------------------------------------------

/** A derived authorization interval. `endAt === null` denotes +∞ (an open grant with no withdrawal). */
export type AuthorizationInterval =
  { kind: 'INTERVAL'; startAt: string; endAt: string | null } | { kind: 'EMPTY' };

/**
 * Derive authorization intervals over the visible events (spec §16). Ordered by `consentSeq` (NEVER by
 * asserted time). A GRANT G opens at `G.capturedAt`; its next sequenced WITHDRAW W closes at
 * `min(W.capturedAt, W.assertedEffectiveAt ?? W.capturedAt)`; `closeAt > startAt ⇒ [startAt, closeAt)`
 * else EMPTY. A trailing open grant yields `[capturedAt, +∞)`. Fails closed on an impossible history
 * (a second GRANT while open, or a WITHDRAW with no open grant) — impossible after §8.3 validation.
 */
export function deriveConsentAuthorizationIntervals(
  events: readonly ConsentEventFact[],
): AuthorizationInterval[] {
  const ordered = orderBySeq(events);
  const intervals: AuthorizationInterval[] = [];
  let openGrant: ConsentEventFact | null = null;

  for (const e of ordered) {
    if (e.action === 'GRANTED') {
      if (openGrant !== null) {
        throw new Error(
          'invalid consent history: GRANTED while a grant is already open (no re-consent)',
        );
      }
      openGrant = e;
    } else {
      if (openGrant === null) {
        throw new Error('invalid consent history: WITHDRAWN with no open grant');
      }
      const startAt = openGrant.capturedAt;
      const assertedMs =
        e.assertedEffectiveAt !== null ? ms(e.assertedEffectiveAt) : ms(e.capturedAt);
      const closeMs = Math.min(ms(e.capturedAt), assertedMs);
      const closeAt = closeMs === ms(e.capturedAt) ? e.capturedAt : e.assertedEffectiveAt!;
      intervals.push(
        closeMs > ms(startAt) ? { kind: 'INTERVAL', startAt, endAt: closeAt } : { kind: 'EMPTY' },
      );
      openGrant = null;
    }
  }
  if (openGrant !== null)
    intervals.push({ kind: 'INTERVAL', startAt: openGrant.capturedAt, endAt: null });
  return intervals;
}

/**
 * Collection-time authorization (spec §8.8). At collection time only facts already RECORDED by
 * `asOfKnowledgeAt` are known — a later-recorded withdrawal cannot retroactively prevent a collection
 * that already occurred. Returns whether `collectionAt` fell inside an authorized interval derived
 * from ONLY the events visible at `asOfKnowledgeAt` (defaults to `collectionAt`). Distinct from
 * `deriveConsentAuthorizationIntervals`, which is the full retrospective (as-of, C2-deferred) view.
 */
export function wasCollectionAuthorizedAtKnownTime(args: {
  events: readonly ConsentEventFact[];
  collectionAt: string;
  asOfKnowledgeAt?: string;
}): boolean {
  const asOf = args.asOfKnowledgeAt ?? args.collectionAt;
  const asOfMs = ms(asOf);
  const visible = args.events.filter((e) => ms(e.recordedAt) <= asOfMs);
  const at = ms(args.collectionAt);
  for (const interval of deriveConsentAuthorizationIntervals(visible)) {
    if (interval.kind !== 'INTERVAL') continue;
    const startMs = ms(interval.startAt);
    if (at < startMs) continue;
    if (interval.endAt === null) return true; // [start, +∞)
    if (at < ms(interval.endAt)) return true; // half-open [start, end)
  }
  return false;
}

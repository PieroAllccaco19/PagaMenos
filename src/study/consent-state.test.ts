// PagaMenos · src/study — pure consent state machine + interval algorithm tests (spec §8/§15/§16/§17).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  deriveConsentAuthorizationIntervals,
  effectiveConsentState,
  evaluateGrant,
  evaluateWithdraw,
  wasCollectionAuthorizedAtKnownTime,
  type ConsentEventFact,
  type ConsentGrantProvenance,
} from './consent-state';

/** UTC instant `min` minutes past a fixed base. */
const t = (min: number): string => new Date(Date.UTC(2026, 8, 1, 0, min, 0)).toISOString();

const PROV: ConsentGrantProvenance = {
  consentVersion: 'cv1',
  privacyNoticeVersion: 'pv1',
  optionalEvidenceConsent: true,
};

function granted(seq: number, capturedMin: number, recordedMin = capturedMin): ConsentEventFact {
  return {
    consentSeq: seq,
    action: 'GRANTED',
    consentVersion: PROV.consentVersion,
    privacyNoticeVersion: PROV.privacyNoticeVersion,
    optionalEvidenceConsent: PROV.optionalEvidenceConsent,
    assertedEffectiveAt: null,
    capturedAt: t(capturedMin),
    recordedAt: t(recordedMin),
  };
}

function withdrawn(
  seq: number,
  capturedMin: number,
  assertedMin: number | null,
  recordedMin = capturedMin,
): ConsentEventFact {
  return {
    consentSeq: seq,
    action: 'WITHDRAWN',
    consentVersion: null,
    privacyNoticeVersion: null,
    optionalEvidenceConsent: null,
    assertedEffectiveAt: assertedMin === null ? null : t(assertedMin),
    capturedAt: t(capturedMin),
    recordedAt: t(recordedMin),
  };
}

describe('effective consent state (ordered by consentSeq)', () => {
  it('is NO_CONSENT for an empty history', () => {
    expect(effectiveConsentState([])).toBe('NO_CONSENT');
  });
  it('is GRANTED after a grant and WITHDRAWN after a withdrawal', () => {
    expect(effectiveConsentState([granted(1, 10)])).toBe('GRANTED');
    expect(effectiveConsentState([granted(1, 10), withdrawn(2, 30, null)])).toBe('WITHDRAWN');
  });
  it('orders by consentSeq, never by array order or timestamps', () => {
    const events = [withdrawn(2, 5, null), granted(1, 99)]; // out-of-order array, misleading times
    expect(effectiveConsentState(events)).toBe('WITHDRAWN');
  });
});

describe('state machine (spec §8.3/§15)', () => {
  it('NO_CONSENT + GRANT → APPEND GRANTED', () => {
    expect(evaluateGrant([], PROV)).toEqual({ kind: 'APPEND', action: 'GRANTED' });
  });
  it('NO_CONSENT + WITHDRAW → REJECT invalid transition', () => {
    expect(evaluateWithdraw([], null).kind).toBe('REJECT_INVALID_TRANSITION');
  });
  it('GRANTED + exact same GRANT → NO_OP_EFFECTIVE_STATE', () => {
    expect(evaluateGrant([granted(1, 10)], PROV).kind).toBe('NO_OP_EFFECTIVE_STATE');
  });
  it('GRANTED + materially different GRANT → REJECT update-not-supported', () => {
    const diff = { ...PROV, optionalEvidenceConsent: false };
    expect(evaluateGrant([granted(1, 10)], diff).kind).toBe('REJECT_UPDATE_NOT_SUPPORTED');
  });
  it('GRANTED + WITHDRAW → ALWAYS APPEND WITHDRAWN', () => {
    expect(evaluateWithdraw([granted(1, 10)], null)).toEqual({ kind: 'APPEND', action: 'WITHDRAWN' });
    expect(evaluateWithdraw([granted(1, 10)], t(5))).toEqual({ kind: 'APPEND', action: 'WITHDRAWN' }); // backdated
    expect(evaluateWithdraw([granted(1, 10)], t(10))).toEqual({ kind: 'APPEND', action: 'WITHDRAWN' }); // same instant
  });
  it('WITHDRAWN + GRANT → REJECT (no re-consent)', () => {
    expect(evaluateGrant([granted(1, 10), withdrawn(2, 30, null)], PROV).kind).toBe(
      'REJECT_INVALID_TRANSITION',
    );
  });
  it('WITHDRAWN + exact same WITHDRAW → NO_OP; changed assertion → CORRECTION_NOT_APPLIED', () => {
    const hist = [granted(1, 10), withdrawn(2, 30, 20)];
    expect(evaluateWithdraw(hist, t(20)).kind).toBe('NO_OP_EFFECTIVE_STATE'); // same asserted instant
    expect(evaluateWithdraw(hist, t(15)).kind).toBe('CORRECTION_NOT_APPLIED'); // changed/earlier
    expect(evaluateWithdraw(hist, null).kind).toBe('CORRECTION_NOT_APPLIED'); // changed (asserted→absent)
  });
});

describe('authorization intervals (spec §8.6/§16/§17)', () => {
  it('G@T10, W captured T30 asserted T20 → [T10, T20)', () => {
    const iv = deriveConsentAuthorizationIntervals([granted(1, 10), withdrawn(2, 30, 20)]);
    expect(iv).toEqual([{ kind: 'INTERVAL', startAt: t(10), endAt: t(20) }]);
  });
  it('G@T10, W captured T30 asserted T5 → EMPTY (append happened; state WITHDRAWN)', () => {
    const iv = deriveConsentAuthorizationIntervals([granted(1, 10), withdrawn(2, 30, 5)]);
    expect(iv).toEqual([{ kind: 'EMPTY' }]);
  });
  it('G@T10, W closeAt T10 (asserted T10) → EMPTY (not rejected)', () => {
    const iv = deriveConsentAuthorizationIntervals([granted(1, 10), withdrawn(2, 30, 10)]);
    expect(iv).toEqual([{ kind: 'EMPTY' }]);
  });
  it('G@T10, W asserted NULL captured T30 → [T10, T30)', () => {
    const iv = deriveConsentAuthorizationIntervals([granted(1, 10), withdrawn(2, 30, null)]);
    expect(iv).toEqual([{ kind: 'INTERVAL', startAt: t(10), endAt: t(30) }]);
  });
  it('open grant with no withdrawal → [T10, +inf)', () => {
    const iv = deriveConsentAuthorizationIntervals([granted(1, 10)]);
    expect(iv).toEqual([{ kind: 'INTERVAL', startAt: t(10), endAt: null }]);
  });
  it('orders by consentSeq, NEVER by asserted time (backdated withdrawal cannot re-open)', () => {
    // Same events, shuffled array order; asserted time is earlier than grant — must still resolve by seq.
    const iv = deriveConsentAuthorizationIntervals([withdrawn(2, 30, 5), granted(1, 10)]);
    expect(iv).toEqual([{ kind: 'EMPTY' }]);
  });
  it('fails closed on an impossible history (withdrawal with no open grant)', () => {
    expect(() => deriveConsentAuthorizationIntervals([withdrawn(1, 10, null)])).toThrow();
  });
});

describe('collection-time authorization vs retrospective usability (spec §8.8)', () => {
  // Grant recorded at T10; a backdated withdrawal RECORDED at T50 asserting effective T20.
  const events = [granted(1, 10, 10), withdrawn(2, 50, 20, 50)];

  it('a later-RECORDED withdrawal cannot retroactively de-authorize a collection already made', () => {
    // As of collection time, the not-yet-recorded withdrawal is invisible → the collection at T25 WAS
    // authorized when it occurred (the withdrawal is only known from T50).
    expect(wasCollectionAuthorizedAtKnownTime({ events, collectionAt: t(25), asOfKnowledgeAt: t(25) })).toBe(
      true,
    );
    // A collection at T15 as of T15 (only the grant visible) is likewise authorized.
    expect(wasCollectionAuthorizedAtKnownTime({ events, collectionAt: t(15), asOfKnowledgeAt: t(15) })).toBe(
      true,
    );
  });

  it('once the backdated withdrawal is KNOWN, retrospective usability narrows to [T10, T20)', () => {
    // As of T60 (after the withdrawal is recorded), T15 is still usable but T25 is not.
    expect(wasCollectionAuthorizedAtKnownTime({ events, collectionAt: t(15), asOfKnowledgeAt: t(60) })).toBe(
      true,
    );
    expect(wasCollectionAuthorizedAtKnownTime({ events, collectionAt: t(25), asOfKnowledgeAt: t(60) })).toBe(
      false,
    );
    // The full retrospective interval algorithm agrees: authorization is [T10, T20).
    expect(deriveConsentAuthorizationIntervals(events)).toEqual([
      { kind: 'INTERVAL', startAt: t(10), endAt: t(20) },
    ]);
  });
});

// --------------------------------------------------------------------------------------------------
// Property / invariant tests (spec §31).
// --------------------------------------------------------------------------------------------------

/** Build a valid A1 history by applying random commands through the pure state machine. */
function buildValidHistory(commands: Array<{ kind: 'G' | 'W'; asserted: number | null }>): ConsentEventFact[] {
  const events: ConsentEventFact[] = [];
  let seq = 0;
  let clock = 0;
  for (const c of commands) {
    clock += 1;
    if (c.kind === 'G') {
      if (evaluateGrant(events, PROV).kind === 'APPEND') events.push(granted(++seq, clock));
    } else {
      if (evaluateWithdraw(events, c.asserted === null ? null : t(c.asserted)).kind === 'APPEND') {
        events.push(withdrawn(++seq, clock, c.asserted));
      }
    }
  }
  return events;
}

const commandArb = fc.record({
  kind: fc.constantFrom<'G' | 'W'>('G', 'W'),
  asserted: fc.oneof(fc.constant(null), fc.integer({ min: 0, max: 200 })),
});

describe('invariants (property-based, spec §31)', () => {
  it('consentSeq is strictly increasing and a valid history never has GRANTED after WITHDRAWN', () => {
    fc.assert(
      fc.property(fc.array(commandArb, { maxLength: 12 }), (cmds) => {
        const events = buildValidHistory(cmds);
        for (let i = 1; i < events.length; i++) {
          expect(events[i]!.consentSeq).toBeGreaterThan(events[i - 1]!.consentSeq);
        }
        let withdrawnSeen = false;
        for (const e of events) {
          if (e.action === 'WITHDRAWN') withdrawnSeen = true;
          else if (withdrawnSeen) throw new Error('GRANTED appeared after WITHDRAWN');
        }
      }),
    );
  });

  it('authorization never begins before the grant capturedAt, and a valid withdrawal never widens it', () => {
    fc.assert(
      fc.property(fc.array(commandArb, { maxLength: 12 }), (cmds) => {
        const events = buildValidHistory(cmds);
        const grant = events.find((e) => e.action === 'GRANTED');
        const intervals = deriveConsentAuthorizationIntervals(events);
        for (const iv of intervals) {
          if (iv.kind !== 'INTERVAL') continue;
          expect(iv.startAt).toBe(grant!.capturedAt); // opens exactly at grant capturedAt
          if (iv.endAt !== null) {
            expect(Date.parse(iv.endAt)).toBeGreaterThan(Date.parse(iv.startAt)); // half-open, non-empty
          }
        }
      }),
    );
  });
});

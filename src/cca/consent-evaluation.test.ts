// PagaMenos · CCA canonical consent evaluation (Amendment 01 §8.1–§8.3). Reuse, not a second algorithm.
import { describe, expect, it } from 'vitest';

import { wasCollectionAuthorizedAtKnownTime, type ConsentEventFact } from '@/study';

import { applyAgr, evaluateCollectionConsent } from './consent-evaluation';

const iso = (ms: number) => new Date(ms).toISOString();

function grant(seq: number, at: number, optional: boolean, recordedAt = at): ConsentEventFact {
  return {
    consentSeq: seq,
    action: 'GRANTED',
    consentVersion: 'cv1',
    privacyNoticeVersion: 'pv1',
    optionalEvidenceConsent: optional,
    assertedEffectiveAt: null,
    capturedAt: iso(at),
    recordedAt: iso(recordedAt),
  };
}

function withdraw(
  seq: number,
  at: number,
  recordedAt = at,
  asserted: number | null = null,
): ConsentEventFact {
  return {
    consentSeq: seq,
    action: 'WITHDRAWN',
    consentVersion: null,
    privacyNoticeVersion: null,
    optionalEvidenceConsent: null,
    assertedEffectiveAt: asserted === null ? null : iso(asserted),
    capturedAt: iso(at),
    recordedAt: iso(recordedAt),
  };
}

describe('CCA-SEM / CCA-PRED — the accepted A1 §8.8 predicate is the decision (§8.1, §8.2)', () => {
  const histories: ConsentEventFact[][] = [
    [],
    [grant(1, 1_000, true)],
    [grant(1, 1_000, false)],
    [grant(1, 1_000, true), withdraw(2, 2_000)],
    [grant(1, 1_000, true), withdraw(2, 2_000), grant(3, 3_000, false)],
    [grant(1, 1_000, true), withdraw(2, 5_000, 5_000, 1_500)],
    [grant(1, 1_000, true), withdraw(2, 2_000, 9_000)], // withdrawal recorded later
  ];

  it('GENERAL_COLLECTION equals the accepted predicate for every history and instant', () => {
    for (const events of histories) {
      for (const at of [0, 500, 1_000, 1_500, 2_000, 2_500, 3_000, 4_000, 6_000, 10_000]) {
        const expected = wasCollectionAuthorizedAtKnownTime({ events, collectionAt: iso(at) });
        expect(
          evaluateCollectionConsent('GENERAL_COLLECTION', events, new Date(at)),
          `history ${JSON.stringify(events.map((e) => e.consentSeq))} at ${at}`,
        ).toBe(expected);
      }
    }
  });

  it('OPTIONAL_EVIDENCE never authorizes where the general predicate refuses', () => {
    for (const events of histories) {
      for (const at of [0, 1_000, 1_500, 2_500, 3_500, 10_000]) {
        const general = wasCollectionAuthorizedAtKnownTime({ events, collectionAt: iso(at) });
        if (general) continue;
        expect(evaluateCollectionConsent('OPTIONAL_EVIDENCE', events, new Date(at))).toBe(false);
      }
    }
  });
});

describe('AGR — RT-17 optional-evidence authorization (§8.3)', () => {
  it('returns the containing grant’s optionalEvidenceConsent', () => {
    const open = [grant(1, 1_000, true)];
    expect(applyAgr(open, new Date(1_500))).toBe(true);
    const closed = [grant(1, 1_000, false)];
    expect(applyAgr(closed, new Date(1_500))).toBe(false);
  });

  it('uses the grant that actually contains the instant across re-consent', () => {
    const events = [grant(1, 1_000, true), withdraw(2, 2_000), grant(3, 3_000, false)];
    expect(applyAgr(events, new Date(1_500))).toBe(true);
    expect(applyAgr(events, new Date(3_500))).toBe(false);
    expect(evaluateCollectionConsent('OPTIONAL_EVIDENCE', events, new Date(1_500))).toBe(true);
    expect(evaluateCollectionConsent('OPTIONAL_EVIDENCE', events, new Date(3_500))).toBe(false);
  });

  it('AGR-1: a later-RECORDED withdrawal is invisible to an earlier collection instant', () => {
    const events = [grant(1, 1_000, true), withdraw(2, 2_000, 9_000)];
    expect(applyAgr(events, new Date(1_500))).toBe(true);
    expect(evaluateCollectionConsent('OPTIONAL_EVIDENCE', events, new Date(1_500))).toBe(true);
  });

  it('AGR-6: no containing interval is an integrity failure, not a silent false', () => {
    const events = [grant(1, 1_000, true), withdraw(2, 2_000)];
    expect(() => applyAgr(events, new Date(5_000))).toThrow(
      /CCA_CONSENT_HISTORY_INTEGRITY_FAILURE/,
    );
  });

  it('AGR-7: a non-boolean optionalEvidenceConsent on the containing grant fails closed', () => {
    const broken = [{ ...grant(1, 1_000, true), optionalEvidenceConsent: null }];
    expect(() => applyAgr(broken, new Date(1_500))).toThrow(
      /CCA_CONSENT_HISTORY_INTEGRITY_FAILURE/,
    );
  });

  it('dec(): an undecodable instant throws instead of silently comparing NaN', () => {
    const broken = [{ ...grant(1, 1_000, true), recordedAt: 'not-a-date' }];
    expect(() => applyAgr(broken, new Date(1_500))).toThrow(
      /CCA_CONSENT_HISTORY_INTEGRITY_FAILURE/,
    );
  });

  it('GENERAL_COLLECTION ignores optionalEvidenceConsent entirely', () => {
    const events = [grant(1, 1_000, false)];
    expect(evaluateCollectionConsent('GENERAL_COLLECTION', events, new Date(1_500))).toBe(true);
    expect(evaluateCollectionConsent('OPTIONAL_EVIDENCE', events, new Date(1_500))).toBe(false);
  });
});

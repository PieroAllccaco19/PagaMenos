// PagaMenos · the exact SO-1 caller input grammar (V1.1 §9.3). Offline; no database.
import { describe, expect, it } from 'vitest';

import {
  M7InputError,
  SO1_INPUT_KEYS,
  parseOutcomeAssertionInput,
  type M7OutcomeAssertionInput,
} from './outcome-assertion-input';

const INTENT = '11111111-2222-4333-8444-555555555555';
const SUPERSEDES = '99999999-8888-4777-8666-555555555555';
const KEY = 'so1-capture-key-0001';
const IDEM = 'so1-idempotency-key-0001';

function original(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    purchaseIntentId: INTENT,
    clientCaptureKey: KEY,
    idempotencyKey: IDEM,
    assertionKind: 'ORIGINAL',
    statusLabel: 'SELF_REPORTED',
    occurrenceAssertion: 'REALIZED_PURCHASE',
    merchant: { kind: 'VOCABULARY_MERCHANT', merchantRef: 'so1:merchant-a' },
    eventTime: { kind: 'LIMA_DATE', date: '2026-07-28' },
    ...overrides,
  };
}

function rejects(raw: unknown, field: string): void {
  expect(() => parseOutcomeAssertionInput(raw)).toThrowError(M7InputError);
  try {
    parseOutcomeAssertionInput(raw);
  } catch (e) {
    expect((e as M7InputError).field).toBe(field);
  }
}

describe('§9.3 — the caller key set is CLOSED', () => {
  it('is exactly the nine accepted keys', () => {
    expect([...SO1_INPUT_KEYS].sort()).toEqual(
      [
        'assertionKind',
        'clientCaptureKey',
        'eventTime',
        'idempotencyKey',
        'merchant',
        'occurrenceAssertion',
        'purchaseIntentId',
        'statusLabel',
        'supersedesAssertionId',
      ].sort(),
    );
  });

  it('rejects an unknown key before anything else runs', () => {
    rejects(original({ extra: 1 }), 'input');
  });

  // §9.3 "Forbidden in every input" — each is rejected structurally by the closed key set.
  it.each([
    'participantId',
    'assignmentId',
    'sessionSecret',
    'capturedAt',
    'manifestSha256',
    'manifestVersion',
    'vocabularyVersion',
    'policy',
    'operationId',
    'executor',
    'callback',
    'transaction',
    'objectKey',
    'digest',
    'storageProfile',
    'backend',
    'leaseEpoch',
    'selector',
  ])('rejects the forbidden caller input %s', (key) => {
    rejects(original({ [key]: 'anything' }), 'input');
  });

  it('rejects a non-object, an array and a symbol key', () => {
    expect(() => parseOutcomeAssertionInput(null)).toThrowError(M7InputError);
    expect(() => parseOutcomeAssertionInput([])).toThrowError(M7InputError);
    const withSymbol = original();
    (withSymbol as Record<symbol, unknown>)[Symbol('x')] = 1;
    rejects(withSymbol, 'input');
  });
});

describe('§9.3 — lexical rules derived from the accepted bytes', () => {
  it('accepts a well-formed ORIGINAL and freezes it', () => {
    const parsed = parseOutcomeAssertionInput(original());
    expect(parsed.assertionKind).toBe('ORIGINAL');
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(parsed.supersedesAssertionId).toBeUndefined();
  });

  it('rejects a non-uuid purchaseIntentId', () => {
    rejects(original({ purchaseIntentId: 'not-a-uuid' }), 'purchaseIntentId');
  });

  it.each([
    ['too short', 'a'.repeat(15)],
    ['too long', 'a'.repeat(129)],
    ['illegal character', `${'a'.repeat(15)}!`],
  ])('rejects a clientCaptureKey that is %s', (_label, value) => {
    rejects(original({ clientCaptureKey: value }), 'clientCaptureKey');
  });

  it('accepts a transport key at both bounds', () => {
    expect(() =>
      parseOutcomeAssertionInput(original({ clientCaptureKey: 'a'.repeat(16) })),
    ).not.toThrow();
    expect(() =>
      parseOutcomeAssertionInput(original({ idempotencyKey: 'a'.repeat(128) })),
    ).not.toThrow();
  });

  it('rejects an idempotencyKey that is not a string', () => {
    rejects(original({ idempotencyKey: 1234567890123456 }), 'idempotencyKey');
  });

  it('rejects an unknown assertionKind and an unknown statusLabel', () => {
    rejects(original({ assertionKind: 'AMENDMENT' }), 'assertionKind');
    rejects(original({ statusLabel: 'EVIDENCE_VERIFIED' }), 'statusLabel');
  });

  it('accepts exactly the five §6.4 participant-assertable labels', () => {
    for (const statusLabel of ['INTENDED', 'ATTEMPTED', 'SELF_REPORTED', 'FAILED', 'ABANDONED']) {
      expect(() => parseOutcomeAssertionInput(original({ statusLabel }))).not.toThrow();
    }
  });
});

describe('§9.3 / m7_outcome_assertion_kind_ck — supersedes pairing', () => {
  it('requires supersedesAssertionId for CORRECTION and RETRACTION', () => {
    rejects(original({ assertionKind: 'CORRECTION' }), 'supersedesAssertionId');
    rejects(
      {
        purchaseIntentId: INTENT,
        clientCaptureKey: KEY,
        idempotencyKey: IDEM,
        assertionKind: 'RETRACTION',
      },
      'supersedesAssertionId',
    );
  });

  it('forbids supersedesAssertionId on an ORIGINAL', () => {
    rejects(original({ supersedesAssertionId: SUPERSEDES }), 'supersedesAssertionId');
  });

  it('accepts a CORRECTION carrying both the target and the full payload', () => {
    const parsed = parseOutcomeAssertionInput(
      original({ assertionKind: 'CORRECTION', supersedesAssertionId: SUPERSEDES }),
    );
    expect(parsed.supersedesAssertionId).toBe(SUPERSEDES);
  });
});

describe('§9.3 / m7_outcome_assertion_content_ck — payload presence', () => {
  it('accepts a RETRACTION with NO participant payload', () => {
    const parsed: M7OutcomeAssertionInput = parseOutcomeAssertionInput({
      purchaseIntentId: INTENT,
      clientCaptureKey: KEY,
      idempotencyKey: IDEM,
      assertionKind: 'RETRACTION',
      supersedesAssertionId: SUPERSEDES,
    });
    expect(parsed.statusLabel).toBeUndefined();
    expect(parsed.occurrenceAssertion).toBeUndefined();
    expect(parsed.merchant).toBeUndefined();
    expect(parsed.eventTime).toBeUndefined();
  });

  it.each(['statusLabel', 'occurrenceAssertion', 'merchant', 'eventTime'])(
    'forbids %s on a RETRACTION',
    (key) => {
      const payload: Record<string, unknown> = {
        statusLabel: 'FAILED',
        occurrenceAssertion: 'NONE',
        merchant: { kind: 'NOT_ASSERTED' },
        eventTime: { kind: 'NOT_ASSERTED' },
      };
      rejects(
        {
          purchaseIntentId: INTENT,
          clientCaptureKey: KEY,
          idempotencyKey: IDEM,
          assertionKind: 'RETRACTION',
          supersedesAssertionId: SUPERSEDES,
          [key]: payload[key],
        },
        key,
      );
    },
  );

  it.each(['statusLabel', 'occurrenceAssertion', 'merchant', 'eventTime'])(
    'requires %s on an ORIGINAL',
    (key) => {
      const raw = original();
      delete raw[key];
      rejects(raw, key);
    },
  );

  it('occurrence NONE requires merchant and eventTime NOT_ASSERTED', () => {
    rejects(original({ occurrenceAssertion: 'NONE' }), 'occurrenceAssertion');
    expect(() =>
      parseOutcomeAssertionInput(
        original({
          occurrenceAssertion: 'NONE',
          merchant: { kind: 'NOT_ASSERTED' },
          eventTime: { kind: 'NOT_ASSERTED' },
        }),
      ),
    ).not.toThrow();
  });
});

describe('§13.4 — merchant assertion', () => {
  it('accepts the three accepted shapes', () => {
    for (const merchant of [
      { kind: 'NOT_ASSERTED' },
      { kind: 'UNLISTED_MERCHANT' },
      { kind: 'VOCABULARY_MERCHANT', merchantRef: 'corpus:merchant.a-1' },
    ]) {
      expect(() => parseOutcomeAssertionInput(original({ merchant }))).not.toThrow();
    }
  });

  it('requires merchantRef for VOCABULARY_MERCHANT and forbids it otherwise', () => {
    rejects(original({ merchant: { kind: 'VOCABULARY_MERCHANT' } }), 'merchant');
    rejects(original({ merchant: { kind: 'NOT_ASSERTED', merchantRef: 'x' } }), 'merchant');
  });

  it('rejects a merchantRef outside ^[A-Za-z0-9_.:-]{1,128}$ and an unknown kind', () => {
    rejects(
      original({ merchant: { kind: 'VOCABULARY_MERCHANT', merchantRef: 'has space' } }),
      'merchant.merchantRef',
    );
    rejects(
      original({ merchant: { kind: 'VOCABULARY_MERCHANT', merchantRef: 'a'.repeat(129) } }),
      'merchant.merchantRef',
    );
    rejects(original({ merchant: { kind: 'ANY_MERCHANT' } }), 'merchant.kind');
  });
});

describe('§13.5 — asserted event time', () => {
  it('accepts the three accepted shapes', () => {
    for (const eventTime of [
      { kind: 'NOT_ASSERTED' },
      { kind: 'INSTANT', at: '2026-07-28T12:00:00-05:00' },
      { kind: 'INSTANT', at: '2026-07-28T12:00:00.123456Z' },
      { kind: 'LIMA_DATE', date: '2026-02-29' },
    ]) {
      // 2026 is not a leap year; the leap case is asserted separately below.
      if (eventTime.kind === 'LIMA_DATE') continue;
      expect(() => parseOutcomeAssertionInput(original({ eventTime }))).not.toThrow();
    }
    expect(() =>
      parseOutcomeAssertionInput(
        original({ eventTime: { kind: 'LIMA_DATE', date: '2024-02-29' } }),
      ),
    ).not.toThrow();
  });

  it('rejects an INSTANT without an explicit offset', () => {
    rejects(
      original({ eventTime: { kind: 'INSTANT', at: '2026-07-28T12:00:00' } }),
      'eventTime.at',
    );
  });

  it('rejects an INSTANT with more than 6 fractional digits', () => {
    rejects(
      original({ eventTime: { kind: 'INSTANT', at: '2026-07-28T12:00:00.1234567Z' } }),
      'eventTime.at',
    );
  });

  it('rejects a LIMA_DATE that is not a calendar date', () => {
    rejects(original({ eventTime: { kind: 'LIMA_DATE', date: '2026-02-30' } }), 'eventTime.date');
    rejects(original({ eventTime: { kind: 'LIMA_DATE', date: '2026-13-01' } }), 'eventTime.date');
    rejects(original({ eventTime: { kind: 'LIMA_DATE', date: '2026-7-28' } }), 'eventTime.date');
    // A non-leap year rejects 29 February.
    rejects(original({ eventTime: { kind: 'LIMA_DATE', date: '2026-02-29' } }), 'eventTime.date');
  });

  it('rejects a mismatched payload key and an unknown kind', () => {
    rejects(original({ eventTime: { kind: 'INSTANT', date: '2026-07-28' } }), 'eventTime');
    rejects(original({ eventTime: { kind: 'CLOCK' } }), 'eventTime.kind');
  });
});

import { describe, expect, it } from 'vitest';

import { canonicalize } from '@/persistence/canonical';

import {
  compareNormalizedEligibilityInstrumentV1,
  compareUnicodeCodePointStrings,
  EligibilityProfileNormalizedKeyCollisionError,
  normalizeEligibilityPortfolioV1,
} from './eligibility-portfolio';
import {
  resolveTrustedEntrySource,
  type TrustedEntryEvidence,
} from './purchase-intent-entry-source';
import { PurchaseIntentValidationError } from './purchase-intent-errors';
import {
  A2_BUSINESS_DECISION_KEY_PREFIX,
  A2_M3_5A_IDEMPOTENCY_KEY_PREFIX,
  deriveBusinessDecisionKey,
  deriveM3_5aIdempotencyKey,
} from './purchase-intent-keys';

const norm = (p: unknown) => canonicalize(normalizeEligibilityPortfolioV1(p));

describe('A2 businessDecisionKey / m3_5a idempotency derivation (§11/§15)', () => {
  it('derives deterministically from the immutable intent id', () => {
    expect(deriveBusinessDecisionKey('abc')).toBe(A2_BUSINESS_DECISION_KEY_PREFIX + 'abc');
    expect(deriveM3_5aIdempotencyKey('abc')).toBe(A2_M3_5A_IDEMPOTENCY_KEY_PREFIX + 'abc');
    expect(deriveBusinessDecisionKey('abc')).toBe(deriveBusinessDecisionKey('abc'));
    expect(deriveBusinessDecisionKey('x')).not.toBe(deriveBusinessDecisionKey('y'));
    // distinct namespaces
    expect(deriveBusinessDecisionKey('id')).not.toBe(deriveM3_5aIdempotencyKey('id'));
  });
  it('rejects empty intent id', () => {
    expect(() => deriveBusinessDecisionKey('   ')).toThrow(PurchaseIntentValidationError);
    expect(() => deriveM3_5aIdempotencyKey('')).toThrow(PurchaseIntentValidationError);
  });
});

describe('A2 eligibility portfolio normalization (§9)', () => {
  it('converges under instrument + membership permutation and duplicates', () => {
    const a = {
      instruments: [
        { family: 'IBK_PLIN', memberships: ['B', 'A', 'A'] },
        { family: 'DINERS', network: 'VISA' },
      ],
    };
    const b = {
      instruments: [
        { family: 'DINERS', network: 'VISA' },
        { family: 'IBK_PLIN', memberships: ['A', 'B'] },
      ],
    };
    expect(norm(a)).toBe(norm(b));
  });
  it('treats absent vs empty containers identically (omit)', () => {
    expect(norm({ instruments: [{ family: 'IBK_PLIN', memberships: [] }] })).toBe(
      norm({ instruments: [{ family: 'IBK_PLIN' }] }),
    );
    expect(norm({ instruments: [], privateStates: {} })).toBe(norm({ instruments: [] }));
    expect(norm({ instruments: [], declarations: {} })).toBe(norm({ instruments: [] }));
  });
  it('map key order permutation converges', () => {
    const a = { instruments: [], privateStates: { qore_active: 'YES', other_key: 'NO' } };
    const b = { instruments: [], privateStates: { other_key: 'NO', qore_active: 'YES' } };
    expect(norm(a)).toBe(norm(b));
  });
  it('rejects post-trim key collisions (privateStates and declarations)', () => {
    expect(() =>
      normalizeEligibilityPortfolioV1({
        instruments: [],
        privateStates: { k: 'YES', ' k ': 'YES' },
      }),
    ).toThrow(EligibilityProfileNormalizedKeyCollisionError);
    expect(() =>
      normalizeEligibilityPortfolioV1({ instruments: [], declarations: { m: 'NO', ' m ': 'NO' } }),
    ).toThrow(EligibilityProfileNormalizedKeyCollisionError);
  });
  it('rejects blank membership and blank tier', () => {
    expect(() =>
      normalizeEligibilityPortfolioV1({
        instruments: [{ family: 'IBK_PLIN', memberships: ['   '] }],
      }),
    ).toThrow(PurchaseIntentValidationError);
    expect(() =>
      normalizeEligibilityPortfolioV1({ instruments: [{ family: 'IBK_PLIN', tier: '  ' }] }),
    ).toThrow(PurchaseIntentValidationError);
  });
  it('diverges on any semantic change', () => {
    const base = {
      instruments: [{ family: 'IBK_PLIN', network: 'VISA', tier: 'GOLD', memberships: ['X'] }],
    };
    expect(norm(base)).not.toBe(
      norm({
        instruments: [{ family: 'DINERS', network: 'VISA', tier: 'GOLD', memberships: ['X'] }],
      }),
    );
    expect(norm(base)).not.toBe(
      norm({
        instruments: [{ family: 'IBK_PLIN', network: 'MC', tier: 'GOLD', memberships: ['X'] }],
      }),
    );
    expect(norm(base)).not.toBe(
      norm({
        instruments: [{ family: 'IBK_PLIN', network: 'VISA', tier: 'PLAT', memberships: ['X'] }],
      }),
    );
    expect(norm(base)).not.toBe(
      norm({
        instruments: [{ family: 'IBK_PLIN', network: 'VISA', tier: 'GOLD', memberships: ['Y'] }],
      }),
    );
  });
  it('rejects unknown fields and bad enums', () => {
    expect(() => normalizeEligibilityPortfolioV1({ instruments: [], bogus: 1 })).toThrow(
      PurchaseIntentValidationError,
    );
    expect(() => normalizeEligibilityPortfolioV1({ instruments: [{ family: 'NOPE' }] })).toThrow(
      PurchaseIntentValidationError,
    );
    expect(() =>
      normalizeEligibilityPortfolioV1({
        instruments: [{ family: 'IBK_PLIN', network: 'DISCOVER' }],
      }),
    ).toThrow(PurchaseIntentValidationError);
    expect(() =>
      normalizeEligibilityPortfolioV1({ instruments: [], privateStates: { k: 'MAYBE' } }),
    ).toThrow(PurchaseIntentValidationError);
  });
  it('comparator: delimiter-style memberships are injective (no collision)', () => {
    const a = { family: 'IBK_PLIN', memberships: ['A,B'] } as const;
    const b = { family: 'IBK_PLIN', memberships: ['A', 'B'] } as const;
    expect(compareNormalizedEligibilityInstrumentV1({ ...a }, { ...b })).not.toBe(0);
  });
  it('code-point comparator orders by scalar value, not locale', () => {
    expect(compareUnicodeCodePointStrings('A', 'a')).toBe(-1); // 'A'(65) < 'a'(97)
    expect(compareUnicodeCodePointStrings('a', 'a')).toBe(0);
    expect(compareUnicodeCodePointStrings('b', 'a')).toBe(1);
  });
});

describe('A2 trusted entry-source resolution (§8/§17/§18)', () => {
  const ev = (e: TrustedEntryEvidence[]) => resolveTrustedEntrySource(e);
  it('maps each recognized variant', () => {
    expect(ev([{ kind: 'RESEARCH_LINK', researchLinkId: 'r1' }])).toBe('RESEARCH_LINK');
    expect(ev([{ kind: 'AUTH_LINK', authMessageId: 'a1' }])).toBe('AUTH_LINK');
    expect(ev([{ kind: 'SAVED_DECISION', savedDecisionId: 's1' }])).toBe('SAVED_DECISION');
    expect(ev([{ kind: 'SHARED_LINK', shareTokenId: 'h1' }])).toBe('SHARED_LINK');
    expect(ev([{ kind: 'CONTENT', contentTokenId: 'c1' }])).toBe('CONTENT');
    expect(ev([{ kind: 'DIRECT' }])).toBe('DIRECT');
    expect(ev([{ kind: 'UNCLASSIFIED' }])).toBe('OTHER');
  });
  it('applies frozen precedence when multiple evidence coexist', () => {
    expect(
      ev([
        { kind: 'CONTENT', contentTokenId: 'c' },
        { kind: 'AUTH_LINK', authMessageId: 'a' },
        { kind: 'RESEARCH_LINK', researchLinkId: 'r' },
      ]),
    ).toBe('RESEARCH_LINK');
    expect(
      ev([
        { kind: 'DIRECT' },
        { kind: 'SHARED_LINK', shareTokenId: 'h' },
        { kind: 'CONTENT', contentTokenId: 'c' },
      ]),
    ).toBe('SHARED_LINK');
  });
  it('invalid/blank ids are ignored; empty or all-invalid → OTHER', () => {
    expect(ev([])).toBe('OTHER');
    expect(ev([{ kind: 'RESEARCH_LINK', researchLinkId: '   ' }])).toBe('OTHER');
    expect(
      ev([
        { kind: 'RESEARCH_LINK', researchLinkId: '  ' },
        { kind: 'CONTENT', contentTokenId: 'c' },
      ]),
    ).toBe('CONTENT');
  });
});

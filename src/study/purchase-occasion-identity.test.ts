// PagaMenos · M3.5B-B1 — focused unit proof of the PURE Opportunity-Identity contract.
//
// Everything here is I/O-free: canonicalization, the identity digest, the coherence predicate, and the
// material request hash. The DB-enforced half of the contract (uniqueness, FKs, triggers, concurrency)
// is proven separately against real PostgreSQL in `src/db/purchase-occasion.integration.test.ts`.
import { describe, expect, it } from 'vitest';

import {
  assertOccasionIdentityCoherent,
  B1_OCCASION_SCHEMA_VERSION_V1,
  canonicalOccasionInstant,
  computeOccasionIdentityDigest,
  materializeOccasionRequestHash,
  normalizeOccasionIdentityFacts,
  OCCASION_MATERIALIZE_OPERATION_SCOPE,
  PurchaseOccasionCoherenceError,
  PurchaseOccasionValidationError,
  type OccasionIdentityFacts,
} from '@/study';

const BASE = {
  occasionSchemaVersion: B1_OCCASION_SCHEMA_VERSION_V1,
  originIntentId: '11111111-1111-4111-8111-111111111111',
  originFinalizationId: '22222222-2222-4222-8222-222222222222',
  originContextVersionId: '33333333-3333-4333-8333-333333333333',
  assignmentId: '44444444-4444-4444-8444-444444444444',
  merchantId: 'm_fridays',
  intendedTransactionAt: '2026-07-28T12:00:00-05:00',
};

const facts = (over: Partial<typeof BASE> = {}): OccasionIdentityFacts =>
  normalizeOccasionIdentityFacts({ ...BASE, ...over });

describe('B1 identity facts — normalization + canonical serialization', () => {
  it('canonicalizes the intended instant to UTC, so equivalent representations agree', () => {
    const offsetForm = facts({ intendedTransactionAt: '2026-07-28T12:00:00-05:00' });
    const utcForm = facts({ intendedTransactionAt: '2026-07-28T17:00:00Z' });
    const dateForm = facts({
      intendedTransactionAt: new Date('2026-07-28T17:00:00.000Z') as unknown as string,
    });
    expect(offsetForm.intendedTransactionAt).toBe('2026-07-28T17:00:00.000Z');
    expect(utcForm).toEqual(offsetForm);
    expect(dateForm).toEqual(offsetForm);
    expect(computeOccasionIdentityDigest(utcForm)).toBe(computeOccasionIdentityDigest(offsetForm));
    expect(computeOccasionIdentityDigest(dateForm)).toBe(computeOccasionIdentityDigest(offsetForm));
  });

  it('rejects a missing / blank identity fact rather than digesting an incomplete identity', () => {
    for (const key of [
      'occasionSchemaVersion',
      'originIntentId',
      'originFinalizationId',
      'originContextVersionId',
      'assignmentId',
      'merchantId',
    ] as const) {
      expect(() => facts({ [key]: '   ' } as Partial<typeof BASE>), key).toThrow(
        PurchaseOccasionValidationError,
      );
      expect(() => facts({ [key]: undefined as unknown as string }), key).toThrow(
        PurchaseOccasionValidationError,
      );
    }
    expect(() => facts({ intendedTransactionAt: 'not-a-date' })).toThrow(
      PurchaseOccasionValidationError,
    );
    expect(() => canonicalOccasionInstant(new Date('nope'), 'x')).toThrow(
      PurchaseOccasionValidationError,
    );
  });
});

describe('B1 identity digest — integrity fingerprint, never an identity', () => {
  it('is a lowercase sha-256 hex and is stable across key-insertion order', () => {
    const a = computeOccasionIdentityDigest(facts());
    // Rebuild the same facts through a differently-ordered literal: canonicalization must erase it.
    const reordered = normalizeOccasionIdentityFacts({
      intendedTransactionAt: BASE.intendedTransactionAt,
      merchantId: BASE.merchantId,
      assignmentId: BASE.assignmentId,
      originContextVersionId: BASE.originContextVersionId,
      originFinalizationId: BASE.originFinalizationId,
      originIntentId: BASE.originIntentId,
      occasionSchemaVersion: BASE.occasionSchemaVersion,
    });
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(computeOccasionIdentityDigest(reordered)).toBe(a);
  });

  it('changes when ANY identity fact changes (no field silently outside the fingerprint)', () => {
    const base = computeOccasionIdentityDigest(facts());
    const mutations: Array<Partial<typeof BASE>> = [
      { originIntentId: '11111111-1111-4111-8111-11111111111a' },
      { originFinalizationId: '22222222-2222-4222-8222-22222222222a' },
      { originContextVersionId: '33333333-3333-4333-8333-33333333333a' },
      { assignmentId: '44444444-4444-4444-8444-44444444444a' },
      { merchantId: 'm_chinawok' },
      { intendedTransactionAt: '2026-07-28T17:00:01Z' },
      { occasionSchemaVersion: 'pagamenos.purchase-occasion.v2' },
    ];
    for (const m of mutations) {
      expect(computeOccasionIdentityDigest(facts(m)), JSON.stringify(m)).not.toBe(base);
    }
  });
});

describe('B1 coherence predicate — fail-closed, field-exact', () => {
  const coherent = (
    stored: OccasionIdentityFacts,
    derived: OccasionIdentityFacts,
    digest = computeOccasionIdentityDigest(stored),
  ): void =>
    assertOccasionIdentityCoherent({
      occasionId: 'occ-1',
      stored,
      storedIdentityDigest: digest,
      derived,
    });

  it('accepts stored facts that equal the derived A2 authorities', () => {
    expect(() => coherent(facts(), facts())).not.toThrow();
    // ...including when the derived instant arrives in a different but equivalent representation.
    expect(() =>
      coherent(facts(), facts({ intendedTransactionAt: '2026-07-28T17:00:00.000Z' })),
    ).not.toThrow();
  });

  it('rejects every single-field divergence with its exact reason', () => {
    const cases: Array<[Partial<typeof BASE>, string]> = [
      [{ originFinalizationId: '22222222-2222-4222-8222-22222222222a' }, 'FINALIZATION_MISMATCH'],
      [
        { originContextVersionId: '33333333-3333-4333-8333-33333333333a' },
        'CONTEXT_VERSION_MISMATCH',
      ],
      [{ assignmentId: '44444444-4444-4444-8444-44444444444a' }, 'ASSIGNMENT_MISMATCH'],
      [{ merchantId: 'm_chinawok' }, 'MERCHANT_MISMATCH'],
      [{ intendedTransactionAt: '2026-07-28T18:00:00Z' }, 'INTENDED_TRANSACTION_AT_MISMATCH'],
      [{ originIntentId: '11111111-1111-4111-8111-11111111111a' }, 'ORIGIN_INTENT_MISSING'],
    ];
    for (const [drift, reason] of cases) {
      let caught: unknown;
      try {
        coherent(facts(), facts(drift));
      } catch (e) {
        caught = e;
      }
      expect(caught, reason).toBeInstanceOf(PurchaseOccasionCoherenceError);
      expect((caught as PurchaseOccasionCoherenceError).reason).toBe(reason);
    }
  });

  it('rejects an unsupported stored schema version before comparing anything else', () => {
    const stored = facts({ occasionSchemaVersion: 'pagamenos.purchase-occasion.v99' });
    expect(() => coherent(stored, stored)).toThrow(PurchaseOccasionCoherenceError);
    try {
      coherent(stored, stored);
    } catch (e) {
      expect((e as PurchaseOccasionCoherenceError).reason).toBe(
        'UNSUPPORTED_OCCASION_SCHEMA_VERSION',
      );
    }
  });

  it('rejects a stored digest that does not fingerprint its own stored facts', () => {
    let caught: unknown;
    try {
      coherent(facts(), facts(), 'f'.repeat(64));
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(PurchaseOccasionCoherenceError);
    expect((caught as PurchaseOccasionCoherenceError).reason).toBe('IDENTITY_DIGEST_MISMATCH');
  });
});

describe('B1 material request hash — operation + origin intent + trusted actor', () => {
  const ctx = { participantId: 'p-1' };

  it('is stable across key order and identical for the same material', () => {
    const a = materializeOccasionRequestHash({ intentId: 'i-1', context: ctx });
    const b = materializeOccasionRequestHash({
      context: { participantId: 'p-1' },
      intentId: 'i-1',
    });
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(b).toBe(a);
  });

  it('differs for a different origin intent or a different trusted actor', () => {
    const a = materializeOccasionRequestHash({ intentId: 'i-1', context: ctx });
    expect(materializeOccasionRequestHash({ intentId: 'i-2', context: ctx })).not.toBe(a);
    expect(
      materializeOccasionRequestHash({ intentId: 'i-1', context: { participantId: 'p-2' } }),
    ).not.toBe(a);
  });

  it('is discriminated by its operation scope (a key can never cross operations)', () => {
    // The scope is baked into the hash material, so the same intent under a different op cannot match.
    const withScope = materializeOccasionRequestHash({ intentId: 'i-1', context: ctx });
    expect(OCCASION_MATERIALIZE_OPERATION_SCOPE).toBe('OCCASION_MATERIALIZE_V1');
    // Sanity: the hash is not merely a hash of the intent id.
    expect(withScope).not.toBe(
      materializeOccasionRequestHash({ intentId: 'OCCASION_MATERIALIZE_V1', context: ctx }),
    );
  });

  it('rejects blank material rather than hashing an incomplete request', () => {
    expect(() => materializeOccasionRequestHash({ intentId: '  ', context: ctx })).toThrow(
      PurchaseOccasionValidationError,
    );
    expect(() =>
      materializeOccasionRequestHash({ intentId: 'i-1', context: { participantId: '' } }),
    ).toThrow(PurchaseOccasionValidationError);
  });
});

describe('B1 scope guard — identity carries no B2/C1/C2 semantics', () => {
  it('the identity-fact set is exactly the seven immutable identity fields', () => {
    expect(Object.keys(facts()).sort()).toEqual(
      [
        'assignmentId',
        'intendedTransactionAt',
        'merchantId',
        'occasionSchemaVersion',
        'originContextVersionId',
        'originFinalizationId',
        'originIntentId',
      ].sort(),
    );
  });

  it('no B2/C1/C2 field leaks into the identity (exposure, evidence, effectiveness, thresholds)', () => {
    const keys = Object.keys(facts());
    for (const forbidden of [
      'actualTransactionAt',
      'purchaseFingerprint',
      'verifiedValue',
      'exposure',
      'reconciled',
      'effective',
      'invalidated',
      'thresholdStatus',
      'opportunityCount',
    ]) {
      expect(keys, forbidden).not.toContain(forbidden);
    }
  });

  it('no B1-owned timestamp participates in the identity fingerprint', () => {
    // `materializedAt` / `createdAt` are deliberately NOT identity facts: a re-materialization attempt
    // at a different instant must not be able to mint a different identity.
    const keys = Object.keys(facts());
    expect(keys).not.toContain('materializedAt');
    expect(keys).not.toContain('createdAt');
  });
});

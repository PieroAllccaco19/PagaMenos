// PagaMenos · M3.5B-B1 — trust-boundary unit proof for the Opportunity-Identity public surface.
//
// Mirrors the accepted `a2-trust-boundary.test.ts`: the PUBLIC B1 functions take exactly ONE request
// argument, the public barrel exposes no `*WithDeps` injection seam, and a forged trusted participant
// context is rejected before any persistence work. No database is touched.
import { describe, expect, it } from 'vitest';

import * as barrel from '@/services';
import {
  loadPurchaseOccasion,
  materializePurchaseOccasion,
  materializePurchaseOccasionWithDeps,
} from '@/services/study-purchase-occasion';
import { resolveTrustedParticipantContext } from '@/services/study-admin';
import {
  PurchaseIntentOwnershipError,
  PurchaseOccasionValidationError,
  B1_OCCASION_SCHEMA_VERSION_V1,
} from '@/study';
import type { PurchaseOccasionRepository } from '@/db/purchase-occasion-repository';

const ASSIGNMENT = '00000000-0000-4000-8000-000000000001';
const INTENT = '00000000-0000-4000-8000-000000000002';

/** A repository stub that FAILS the test if any write path is reached. */
function noWriteRepository(participantId: string | null): PurchaseOccasionRepository {
  return {
    findAssignmentParticipantId: async () => participantId,
    materializeOccasion: async () => {
      throw new Error('materializeOccasion must not be reached');
    },
    loadOccasion: async () => {
      throw new Error('loadOccasion must not be reached');
    },
    findOccasionByIntent: async () => null,
  } as unknown as PurchaseOccasionRepository;
}

describe('B1 public surface — no caller dependency injection', () => {
  it('every public B1 function has arity 1 (no second dependency argument in the signature)', () => {
    for (const fn of [materializePurchaseOccasion, loadPurchaseOccasion]) {
      expect(fn.length).toBe(1);
    }
  });

  it('the public @/services barrel exposes NO *WithDeps injection surface', () => {
    expect(Object.keys(barrel).filter((k) => k.endsWith('WithDeps'))).toEqual([]);
  });

  it('the public barrel exposes the B1 identity surface and its typed errors', () => {
    for (const name of [
      'materializePurchaseOccasion',
      'loadPurchaseOccasion',
      'PurchaseOccasionError',
      'PurchaseOccasionValidationError',
      'PurchaseOccasionConflictError',
      'PurchaseOccasionCoherenceError',
      'PurchaseOccasionIdempotencyConflictError',
      'PurchaseOccasionInvariantError',
    ]) {
      expect(Object.keys(barrel), name).toContain(name);
    }
    expect(barrel.B1_OCCASION_SCHEMA_VERSION_V1).toBe(B1_OCCASION_SCHEMA_VERSION_V1);
  });
});

describe('B1 trusted context — a forged context never reaches persistence', () => {
  it('rejects a plain object masquerading as a trusted participant context', async () => {
    await expect(
      materializePurchaseOccasionWithDeps(
        {
          trustedParticipantContext: { participantId: 'p-forge' } as never,
          assignmentId: ASSIGNMENT,
          intentId: INTENT,
          idempotencyKey: 'k-1',
        },
        { repository: noWriteRepository('p-forge') },
      ),
    ).rejects.toBeInstanceOf(PurchaseOccasionValidationError);
  });

  it('rejects blank material before touching the repository', async () => {
    const context = resolveTrustedParticipantContext({ authenticatedParticipantId: 'p-1' });
    for (const bad of [
      { intentId: '   ', idempotencyKey: 'k-1' },
      { intentId: INTENT, idempotencyKey: '' },
    ]) {
      await expect(
        materializePurchaseOccasionWithDeps(
          {
            trustedParticipantContext: context,
            assignmentId: ASSIGNMENT,
            intentId: bad.intentId,
            idempotencyKey: bad.idempotencyKey,
          },
          { repository: noWriteRepository('p-1') },
        ),
      ).rejects.toBeInstanceOf(PurchaseOccasionValidationError);
    }
  });

  it('rejects an assignment the trusted actor does not own, before any write', async () => {
    const context = resolveTrustedParticipantContext({ authenticatedParticipantId: 'p-1' });
    // The assignment belongs to somebody else...
    await expect(
      materializePurchaseOccasionWithDeps(
        {
          trustedParticipantContext: context,
          assignmentId: ASSIGNMENT,
          intentId: INTENT,
          idempotencyKey: 'k-1',
        },
        { repository: noWriteRepository('p-other') },
      ),
    ).rejects.toBeInstanceOf(PurchaseIntentOwnershipError);
    // ...or does not exist at all.
    await expect(
      materializePurchaseOccasionWithDeps(
        {
          trustedParticipantContext: context,
          assignmentId: ASSIGNMENT,
          intentId: INTENT,
          idempotencyKey: 'k-1',
        },
        { repository: noWriteRepository(null) },
      ),
    ).rejects.toBeInstanceOf(PurchaseIntentOwnershipError);
  });
});

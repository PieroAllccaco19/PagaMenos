import { describe, expect, it } from 'vitest';

import * as barrel from '@/services';
import {
  captureIntentToken,
  createPurchaseIntent,
  appendPurchaseIntentContext,
  appendEligibilityProfile,
  finalizePurchaseIntent,
  invalidatePurchaseIntent,
} from '@/services/study-purchase-intent';
import { requestPurchaseIntentDecision } from '@/services/study-intent-decision';
import {
  resolveTrustedEntrySource,
  resolveTrustedParticipantContext,
} from '@/services/study-admin';
import { isResolvedEntrySource } from '@/study';
import { PurchaseIntentValidationError } from '@/study';

// ── Finding 1: public surface accepts ONE request argument; NO dependency injection ────────────────
describe('A2 public surface — no caller dependency injection (Sol Finding 1)', () => {
  it('every public A2 function has arity 1 (a second dependency argument is not part of the signature)', () => {
    for (const fn of [
      captureIntentToken,
      createPurchaseIntent,
      appendPurchaseIntentContext,
      appendEligibilityProfile,
      finalizePurchaseIntent,
      invalidatePurchaseIntent,
      requestPurchaseIntentDecision,
    ]) {
      expect(fn.length).toBe(1);
    }
  });

  it('the public @/services barrel exposes NO *WithDeps injection surface', () => {
    const withDeps = Object.keys(barrel).filter((k) => k.endsWith('WithDeps'));
    expect(withDeps).toEqual([]);
  });
});

// ── Finding 3: trusted entry provenance is unforgeable (branded; minted only server-side) ──────────
describe('A2 trusted entry provenance — caller-unforgeable (Sol Finding 3)', () => {
  it('a plain / structurally-matching object is NOT a valid ResolvedEntrySource', () => {
    expect(isResolvedEntrySource({ entrySource: 'RESEARCH_LINK' })).toBe(false);
    expect(isResolvedEntrySource({ kind: 'RESEARCH_LINK', researchLinkId: 'chosen' })).toBe(false);
    expect(isResolvedEntrySource(null)).toBe(false);
    expect(isResolvedEntrySource('RESEARCH_LINK')).toBe(false);
  });

  it('only the trusted session adapter can mint a valid ResolvedEntrySource', () => {
    const trusted = resolveTrustedEntrySource([{ kind: 'RESEARCH_LINK', researchLinkId: 'r1' }]);
    expect(isResolvedEntrySource(trusted)).toBe(true);
    expect(trusted.entrySource).toBe('RESEARCH_LINK');
    // A structural clone loses the brand (registry membership), so it is rejected.
    expect(isResolvedEntrySource({ ...trusted })).toBe(false);
  });

  it('captureIntentToken rejects a forged resolvedEntrySource before any persistence work', async () => {
    const context = resolveTrustedParticipantContext({ authenticatedParticipantId: 'p-forge' });
    await expect(
      captureIntentToken({
        trustedParticipantContext: context,
        assignmentId: '00000000-0000-0000-0000-000000000000',
        clientCorrelationNonce: 'n1',
        // A forged object masquerading as trusted evidence.
        resolvedEntrySource: { entrySource: 'RESEARCH_LINK' } as never,
      }),
    ).rejects.toBeInstanceOf(PurchaseIntentValidationError);
  });
});

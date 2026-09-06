// PagaMenos · src/study — M3.5B-A2 request-hash contract (A2 §23/§25). Reuses the accepted canonical
// hasher. Each fingerprint carries an `op` discriminator + the resolved trusted actor/context identity
// so one transport key can never acknowledge a materially different operation or another actor's request.
import { canonicalHash } from '@/persistence/hash';

import type { A2PurchaseSignature } from './purchase-intent-decide-input';

/** Trusted operation scopes (must match the receipt CHECK constants in the A2 migration). */
export const INTENT_CREATE_OPERATION_SCOPE = 'INTENT_CREATE_V1';
export const INTENT_CONTEXT_APPEND_OPERATION_SCOPE = 'INTENT_CONTEXT_APPEND_V1';
export const ELIGIBILITY_PROFILE_APPEND_OPERATION_SCOPE = 'ELIGIBILITY_PROFILE_APPEND_V1';
export const INTENT_FINALIZE_OPERATION_SCOPE = 'INTENT_FINALIZE_V1';
export const INTENT_INVALIDATE_OPERATION_SCOPE = 'INTENT_INVALIDATE_V1';

/** Stable trusted calling context (resolved by the trusted adapter; never caller-authored). */
export interface A2TrustedContext {
  participantId: string;
}

/** createPurchaseIntent material identity (A2 §25). entrySource is the token's (immutable) — bound via key. */
export function createPurchaseIntentRequestHash(material: {
  intentCaptureKey: string;
  intentType: string;
  context: A2TrustedContext;
}): string {
  return canonicalHash({
    op: INTENT_CREATE_OPERATION_SCOPE,
    intentCaptureKey: material.intentCaptureKey,
    intentType: material.intentType,
    context: material.context,
  });
}

/** appendPurchaseIntentContext material identity (A2 §25). */
export function appendContextRequestHash(material: {
  intentId: string;
  contextCaptureKey: string;
  contextSchemaVersion: string;
  intendedTransactionAt: string;
  signature: A2PurchaseSignature;
  context: A2TrustedContext;
}): string {
  return canonicalHash({
    op: INTENT_CONTEXT_APPEND_OPERATION_SCOPE,
    intentId: material.intentId,
    contextCaptureKey: material.contextCaptureKey,
    contextSchemaVersion: material.contextSchemaVersion,
    intendedTransactionAt: material.intendedTransactionAt,
    signature: material.signature as unknown as Record<string, unknown>,
    context: material.context,
  });
}

/** appendEligibilityProfile material identity (A2 §25). `portfolio` MUST be already normalized. */
export function appendEligibilityProfileRequestHash(material: {
  assignmentId: string;
  profileCaptureKey: string;
  portfolioSchemaVersion: string;
  portfolio: unknown;
  context: A2TrustedContext;
}): string {
  return canonicalHash({
    op: ELIGIBILITY_PROFILE_APPEND_OPERATION_SCOPE,
    assignmentId: material.assignmentId,
    profileCaptureKey: material.profileCaptureKey,
    portfolioSchemaVersion: material.portfolioSchemaVersion,
    portfolio: material.portfolio,
    context: material.context,
  });
}

/** finalizePurchaseIntent material identity (A2 §25). */
export function finalizeRequestHash(material: {
  intentId: string;
  contextVersionId: string;
  eligibilityProfileVersionId: string;
  context: A2TrustedContext;
}): string {
  return canonicalHash({
    op: INTENT_FINALIZE_OPERATION_SCOPE,
    intentId: material.intentId,
    contextVersionId: material.contextVersionId,
    eligibilityProfileVersionId: material.eligibilityProfileVersionId,
    context: material.context,
  });
}

/** invalidatePurchaseIntent material identity (A2 §25). `reasonCode` is material. */
export function invalidateRequestHash(material: {
  intentId: string;
  replacementIntentId?: string | null;
  reasonCode?: string | null;
  context: A2TrustedContext;
}): string {
  return canonicalHash({
    op: INTENT_INVALIDATE_OPERATION_SCOPE,
    intentId: material.intentId,
    replacementIntentId: material.replacementIntentId ?? null,
    reasonCode: material.reasonCode ?? null,
    context: material.context,
  });
}

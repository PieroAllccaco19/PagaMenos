// PagaMenos · src/cca — the two fixed collection consent policies (Amendment 01 §6, §7).
//
// A policy is bound to a sealed operation at DEFINITION (composition) time and is never a runtime
// argument of the business call. Accepted mapping, fixed by §7 (productive leaves: deferred to M7):
//   Outcome collection      → GENERAL_COLLECTION  (A1 §8.8)
//   SavingEvidence upload   → OPTIONAL_EVIDENCE   (A1 §8.8 + RT-17 optionalEvidenceConsent, via AGR)
// This module defines no consent meaning; it only names the two accepted compositions.

export const COLLECTION_CONSENT_POLICIES = Object.freeze([
  'GENERAL_COLLECTION',
  'OPTIONAL_EVIDENCE',
] as const);

export type CollectionConsentPolicy = (typeof COLLECTION_CONSENT_POLICIES)[number];

export function isCollectionConsentPolicy(value: unknown): value is CollectionConsentPolicy {
  return (
    typeof value === 'string' && (COLLECTION_CONSENT_POLICIES as readonly string[]).includes(value)
  );
}

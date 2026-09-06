// PagaMenos · src/study — M3.5B-A2 deterministic decision identity derivation (A2 §11/§15).
//
// businessDecisionKey and the M3.5A idempotency key are PURE functions of the immutable PurchaseIntent
// id — never caller-, merchant-, amount-, session-, or timestamp-derived. Same intent ⇒ same keys
// forever; a replacement intent (new id) ⇒ different keys. Distinct namespaces so the two derived keys
// can never be confused.
import { PurchaseIntentValidationError } from './purchase-intent-errors';

/** Namespace for the domain-level completed-decision occurrence key (A2 §11). */
export const A2_BUSINESS_DECISION_KEY_PREFIX = 'pagamenos:study-intent-decision:v1:';

/** Namespace for the internal M3.5A transport idempotency key (A2 §15). */
export const A2_M3_5A_IDEMPOTENCY_KEY_PREFIX = 'pagamenos:study-intent-decision-idem:v1:';

function requireIntentId(intentId: string): string {
  const id = typeof intentId === 'string' ? intentId.trim() : '';
  if (id.length === 0) {
    throw new PurchaseIntentValidationError('intentId must be a non-empty string to derive keys');
  }
  return id;
}

/** `businessDecisionKey = "pagamenos:study-intent-decision:v1:" + PurchaseIntent.id` (A2 §11). */
export function deriveBusinessDecisionKey(intentId: string): string {
  return A2_BUSINESS_DECISION_KEY_PREFIX + requireIntentId(intentId);
}

/** `m3_5aIdempotencyKey = "pagamenos:study-intent-decision-idem:v1:" + PurchaseIntent.id` (A2 §15). */
export function deriveM3_5aIdempotencyKey(intentId: string): string {
  return A2_M3_5A_IDEMPOTENCY_KEY_PREFIX + requireIntentId(intentId);
}

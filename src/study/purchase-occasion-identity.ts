// PagaMenos · src/study — M3.5B-B1 Opportunity (PurchaseOccasion) IDENTITY contract. PURE module.
//
// WHAT A PURCHASE OCCASION IS (RT-11 §6.A, the frozen Phase-0A analysis contract): "one real-world
// attempted/realized purchase, not one app request". B1 gives that unit ONE durable, unambiguous,
// immutable identity that B2 (exposure/reconciliation) and C1 (evidence/attribution) can hold forever
// as their join target.
//
// WHAT B1 IS NOT. B1 asserts NO B2/C1/C2 semantics: no reconciliation/merge of several captures into
// one economic opportunity (A2 §38/§44 reserve that for B2), no exposure, no evidence, no
// "meaningful opportunity" threshold (Phase 0A §34 H-P0-01 — that is C2 analysis over the frozen
// protocol), no denominator, no counts.
//
// THE UNIQUENESS BOUNDARY IS THE ORIGIN INTENT — AND ONLY THAT.
//   • one accepted A2 `PurchaseIntent` ⇒ AT MOST ONE `PurchaseOccasion` (DB `UNIQUE(originIntentId)`);
//   • genuinely distinct intents ⇒ ALWAYS distinct occasions.
// It is deliberately NOT `(participant, merchant, coarse time)`: A2's accepted non-collapse invariant
// (§5/§38) forbids treating two distinct captures as one economic opportunity, and doing so here would
// be implementing B2 reconciliation. B2 may later RELATE occasions; it never rewrites a B1 identity.
//
// IDENTITY vs ATTRIBUTES. The durable identifier is the DB-generated `PurchaseOccasion.id` (uuid) —
// never a concatenation of business fields, never a timestamp, never a hash of mutable data. The
// immutable identity FACTS below are copied verbatim from the accepted A2 authorities and are proven,
// not asserted; `identityDigest` fingerprints them for integrity only and is NOT an identity/uniqueness
// key. Descriptive later facts (actualTransactionAt, purchaseFingerprint, evidence, exposure) belong
// to B2/C1 and are deliberately absent.
import { canonicalHash } from '@/persistence/hash';

import {
  PurchaseOccasionCoherenceError,
  PurchaseOccasionValidationError,
} from './purchase-occasion-errors';

/** Frozen version of the B1 occasion-identity shape. Bumped (never silently redefined) on change. */
export const B1_OCCASION_SCHEMA_VERSION_V1 = 'pagamenos.purchase-occasion.v1';

/** Trusted operation identity scoping the B1 idempotency-key namespace. Never request-controlled. */
export const OCCASION_MATERIALIZE_OPERATION_SCOPE = 'OCCASION_MATERIALIZE_V1';

/** Stable trusted calling context (resolved by the trusted adapter; never caller-authored). */
export interface B1TrustedContext {
  participantId: string;
}

/**
 * The complete set of IMMUTABLE identity facts of one opportunity. Every field is derived server-side
 * from the accepted A2 authorities under a lock — none is caller-supplied. `intendedTransactionAt` is
 * an upstream A2 fact preserved verbatim (canonicalized to UTC); it is NOT a B1 temporal conclusion and
 * it participates in NO uniqueness key.
 */
export interface OccasionIdentityFacts {
  occasionSchemaVersion: string;
  /** The sole logical uniqueness boundary: the originating A2 PurchaseIntent. */
  originIntentId: string;
  /** The accepted A2 finalization that pinned the exact context (1:1 with the intent). */
  originFinalizationId: string;
  /** The exact A2 context version the finalization pinned (supplies merchant + intended instant). */
  originContextVersionId: string;
  /** The A1 cohort anchor, reached through the intent's capture token (never independently asserted). */
  assignmentId: string;
  /** Lifted from the pinned context version for query/integrity; the A2 row remains the truth. */
  merchantId: string;
  /** Canonical UTC ISO-8601 of the pinned context version's intended transaction instant. */
  intendedTransactionAt: string;
}

const FACT_KEYS: readonly (keyof OccasionIdentityFacts)[] = [
  'occasionSchemaVersion',
  'originIntentId',
  'originFinalizationId',
  'originContextVersionId',
  'assignmentId',
  'merchantId',
  'intendedTransactionAt',
];

function requireNonEmpty(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new PurchaseOccasionValidationError(`${label} must be a non-empty string`);
  }
  return value;
}

/**
 * Canonicalize an ISO-8601 instant to UTC so two semantically-identical wire/DB representations
 * (`2026-07-28T12:00:00-05:00` and `2026-07-28T17:00:00Z`) produce ONE canonical form, one digest, and
 * one coherence verdict (B1 canonical-serialization requirement).
 */
export function canonicalOccasionInstant(value: unknown, label: string): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new PurchaseOccasionValidationError(`${label} must be a valid instant`);
    }
    return value.toISOString();
  }
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw new PurchaseOccasionValidationError(`${label} must be an ISO-8601 timestamp string`);
  }
  return new Date(value).toISOString();
}

/**
 * Validate + canonicalize a complete identity-fact set. Rejects any missing/blank field, so an
 * incomplete identity can never be persisted, digested, or compared.
 */
export function normalizeOccasionIdentityFacts(input: {
  occasionSchemaVersion: string;
  originIntentId: string;
  originFinalizationId: string;
  originContextVersionId: string;
  assignmentId: string;
  merchantId: string;
  intendedTransactionAt: string | Date;
}): OccasionIdentityFacts {
  return {
    occasionSchemaVersion: requireNonEmpty(input.occasionSchemaVersion, 'occasionSchemaVersion'),
    originIntentId: requireNonEmpty(input.originIntentId, 'originIntentId'),
    originFinalizationId: requireNonEmpty(input.originFinalizationId, 'originFinalizationId'),
    originContextVersionId: requireNonEmpty(input.originContextVersionId, 'originContextVersionId'),
    assignmentId: requireNonEmpty(input.assignmentId, 'assignmentId'),
    merchantId: requireNonEmpty(input.merchantId, 'merchantId'),
    intendedTransactionAt: canonicalOccasionInstant(
      input.intendedTransactionAt,
      'intendedTransactionAt',
    ),
  };
}

/**
 * SHA-256 over the canonical serialization of the complete identity-fact set. An INTEGRITY fingerprint
 * only: it is deliberately NOT unique-indexed and is never used as the durable identifier, so a digest
 * can never become a second, competing identity for the same opportunity.
 */
export function computeOccasionIdentityDigest(facts: OccasionIdentityFacts): string {
  // An explicit key projection (not a spread) so an accidentally-widened object can never silently
  // change the digest input.
  const material: Record<string, string> = {};
  for (const k of FACT_KEYS) material[k] = facts[k];
  return canonicalHash(material);
}

/**
 * Prove a durable occasion's stored identity facts still equal the facts derived from the accepted A2
 * authorities. Fail-closed and field-exact — the first divergence is reported with its reason, never
 * collapsed to a generic failure and never repaired.
 */
export function assertOccasionIdentityCoherent(args: {
  occasionId: string;
  stored: OccasionIdentityFacts;
  storedIdentityDigest: string;
  derived: OccasionIdentityFacts;
}): void {
  const { stored, derived } = args;
  if (stored.occasionSchemaVersion !== B1_OCCASION_SCHEMA_VERSION_V1) {
    throw new PurchaseOccasionCoherenceError(
      'UNSUPPORTED_OCCASION_SCHEMA_VERSION',
      `occasion ${args.occasionId} carries unsupported schema version ${JSON.stringify(
        stored.occasionSchemaVersion,
      )}`,
    );
  }
  if (stored.originIntentId !== derived.originIntentId) {
    throw new PurchaseOccasionCoherenceError(
      'ORIGIN_INTENT_MISSING',
      `occasion ${args.occasionId} originIntentId ${JSON.stringify(stored.originIntentId)} does ` +
        `not match the loaded intent ${JSON.stringify(derived.originIntentId)}`,
    );
  }
  const checks: ReadonlyArray<
    readonly [
      keyof OccasionIdentityFacts,
      (
        | 'FINALIZATION_MISMATCH'
        | 'CONTEXT_VERSION_MISMATCH'
        | 'ASSIGNMENT_MISMATCH'
        | 'MERCHANT_MISMATCH'
        | 'INTENDED_TRANSACTION_AT_MISMATCH'
      ),
    ]
  > = [
    ['originFinalizationId', 'FINALIZATION_MISMATCH'],
    ['originContextVersionId', 'CONTEXT_VERSION_MISMATCH'],
    ['assignmentId', 'ASSIGNMENT_MISMATCH'],
    ['merchantId', 'MERCHANT_MISMATCH'],
    ['intendedTransactionAt', 'INTENDED_TRANSACTION_AT_MISMATCH'],
  ];
  for (const [field, reason] of checks) {
    if (stored[field] !== derived[field]) {
      throw new PurchaseOccasionCoherenceError(
        reason,
        `occasion ${args.occasionId} ${field} ${JSON.stringify(stored[field])} does not match the ` +
          `accepted A2 authority ${JSON.stringify(derived[field])}`,
      );
    }
  }
  const recomputed = computeOccasionIdentityDigest(stored);
  if (recomputed !== args.storedIdentityDigest) {
    throw new PurchaseOccasionCoherenceError(
      'IDENTITY_DIGEST_MISMATCH',
      `occasion ${args.occasionId} identityDigest does not fingerprint its own stored identity facts`,
    );
  }
}

/**
 * The material request identity of `materializePurchaseOccasion`. It carries the `op` discriminator (so
 * one transport key can never acknowledge a materially different operation), the origin intent (the
 * ONLY caller-chosen material), and the resolved trusted actor — so a caller asking to materialize
 * intent A can never be handed the occasion of intent B under a reused key. Sampled/derived outputs
 * (occasion id, materializedAt, createdAt, identityDigest) are deliberately excluded.
 */
export function materializeOccasionRequestHash(material: {
  intentId: string;
  context: B1TrustedContext;
}): string {
  return canonicalHash({
    op: OCCASION_MATERIALIZE_OPERATION_SCOPE,
    intentId: requireNonEmpty(material.intentId, 'intentId'),
    context: { participantId: requireNonEmpty(material.context?.participantId, 'participantId') },
  });
}

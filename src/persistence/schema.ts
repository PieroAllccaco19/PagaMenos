// PagaMenos · src/persistence — FROZEN v1 runtime schemas for persisted engine payloads (§7/§19).
//
// These Zod schemas validate the exact `engineInputJson` / `engineOutputJson` payloads at both the
// write boundary (reject a malformed or secret-bearing payload before it is stored) and the read
// boundary (a defensive guard when reloading history).
//
// WHY A FROZEN LOCAL COPY (not the live `@/corpus` corpusSchema): a persisted decision must remain
// self-describing forever (§3) — its validity must NOT depend on how the *current* corpus schema
// happens to look. So the v1 payload shape is pinned here and only ever paired with
// ENGINE_INPUT_SCHEMA_VERSION / ENGINE_OUTPUT_SCHEMA_VERSION = *.v1. When the engine contract
// changes, a v2 schema is ADDED beside this one; v1 history keeps parsing under v1. The ultimate
// integrity anchor is still the stored SHA-256 (§8) over the exact canonical bytes — Zod is the
// structural guard, the hash is the truth.
//
// STRICT everywhere: unknown keys are REJECTED, so an arbitrary secret-like field (card number, CVV,
// token — §19) can never ride along inside a snapshot payload.
//
// Only stable primitives are imported from `@/corpus` (enum token arrays + the instant validator);
// the structural shapes are declared locally so corpus-schema evolution cannot retroactively rewrite
// how a v1 record validates.
import { z } from 'zod';

import type { DecideInput, EngineEvaluation } from '@/engine';

import {
  AVAILABILITY_STATES,
  CHANNELS,
  COMPARISON_BASES,
  CONFIDENCE_LEVELS,
  CONTEXT_REQS,
  ELIGIBILITY_CLASSES,
  ELIGIBLE_SPEND_SELECTORS,
  HOLIDAY_POLICIES,
  isValidInstant,
  MERCHANT_IDS,
  NOMINAL_UNITS,
  PROVIDER_FAMILIES,
  PUBLICATION_STATES,
  PURCHASE_DOMAINS,
  PURCHASE_SIGNATURE_KINDS,
  ROUNDING_RULES,
  SOURCE_QUALITY_STATES,
  WEEKDAYS,
} from '@/corpus';

import {
  ENGINE_INPUT_SCHEMA_VERSION,
  ENGINE_OUTPUT_SCHEMA_VERSION,
  SNAPSHOT_SCHEMA_VERSION,
} from './versions';

// ---- Shared leaf schemas (mirror the accepted M3 contract; SAFE integers, §RTM3-11) ----
const safeInt = (schema: z.ZodNumber) =>
  schema.refine(Number.isSafeInteger, { message: 'must be a safe integer (|value| ≤ 2^53−1)' });
const centimos = safeInt(z.number().int().nonnegative());
const nominalMinorUnits = safeInt(z.number().int().positive());
const strictInstant = z.string().refine(isValidInstant, {
  message: 'invalid ISO-8601 instant; a zone-qualified date-time (Z or ±HH:MM) is required',
});
const merchantId = z.enum(MERCHANT_IDS);
const selector = z.enum(ELIGIBLE_SPEND_SELECTORS);
const tri = z.enum(['YES', 'NO', 'UNKNOWN']);
const nominalUnit = z.enum(NOMINAL_UNITS);

// ---- Corpus-typed input sub-shapes (frozen v1 copies) ----
const capSchema = z.union([
  z.strictObject({ kind: z.literal('AMOUNT'), centimos }),
  z.strictObject({ kind: z.literal('UNKNOWN_NOT_STATED') }),
]);

const benefitSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('PERCENT'),
    percentBps: z.number().int().positive(),
    rounding: z.enum(ROUNDING_RULES),
  }),
  z.strictObject({
    type: z.literal('FIXED_DISCOUNT'),
    fixedDiscountCentimos: centimos,
    amountDependent: z.boolean(),
  }),
  z.strictObject({
    type: z.literal('FIXED_PRICE'),
    fixedPriceCentimos: centimos,
    regularReferenceCentimos: centimos.optional(),
  }),
  z.strictObject({
    type: z.literal('TWO_FOR_ONE'),
    pay: z.number().int().positive(),
    of: z.number().int().positive(),
  }),
  z.strictObject({
    type: z.literal('FIXED_BUNDLE'),
    bundlePriceCentimos: centimos,
    regularReferenceCentimos: centimos.optional(),
  }),
  z.strictObject({
    type: z.literal('CASHBACK'),
    valueCentimos: centimos,
    settlementDelay: z.string().min(1),
  }),
  z.strictObject({
    type: z.literal('NON_CASH_NOMINAL'),
    nominalMinorUnits,
    nominalUnit,
    cashAcquisitionCostCentimos: centimos.optional(),
  }),
]);

const temporalSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('LOCAL_DATE_RANGE'),
    startDateInclusive: z.string(),
    endDateInclusive: z.string(),
  }),
  z.strictObject({
    kind: z.literal('LOCAL_DATETIME_RANGE'),
    startInclusive: strictInstant,
    endExclusive: strictInstant,
  }),
  z.strictObject({
    kind: z.literal('OBSERVED_ACTIVE_UNTIL'),
    observedActiveAt: z.string(),
    endDateInclusive: z.string(),
  }),
]);

const constraintsSchema = z.strictObject({
  temporal: temporalSchema,
  weekdays: z.array(z.enum(WEEKDAYS)).optional(),
  timeWindow: z.strictObject({ from: z.string(), to: z.string() }).optional(),
  holidayPolicy: z.enum(HOLIDAY_POLICIES),
  specificBlackoutDates: z.array(z.string()).optional(),
  minimumSpend: z.strictObject({ minimumSpendCentimos: centimos, basis: selector }).optional(),
  cap: capSchema.optional(),
  channels: z.array(z.enum(CHANNELS)).optional(),
  locations: z
    .strictObject({
      include: z.array(z.string()).optional(),
      exclude: z.array(z.string()).optional(),
    })
    .optional(),
  products: z
    .strictObject({
      includeSku: z.array(z.string()).optional(),
      excludeSku: z.array(z.string()).optional(),
    })
    .optional(),
  useLimit: z
    .strictObject({
      per: z.enum(['DAY', 'ORDER', 'MONTH', 'CAMPAIGN']),
      count: z.number().int().positive(),
    })
    .optional(),
  stock: z
    .strictObject({ known: z.boolean(), remaining: z.number().int().nonnegative().optional() })
    .optional(),
  cardNetwork: z.enum(['AMEX', 'VISA', 'MC', 'ANY']).optional(),
  cardTier: z.string().optional(),
  membership: z.string().optional(),
  providerPrivateKey: z.string().optional(),
  preRedemptionVerifiable: z.boolean().optional(),
  combinability: z.enum(['NO', 'UNKNOWN', 'YES']),
});

const canonicalItemSchema = z.strictObject({ itemKey: z.string().min(1), qty: z.number().int() });

const signatureSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('EXACT_BUNDLE'),
    merchantId,
    canonicalItems: z.array(canonicalItemSchema).min(1),
  }),
  z.strictObject({
    kind: z.literal('ELIGIBLE_BILL'),
    merchantId,
    purchaseDomain: z.enum(PURCHASE_DOMAINS),
  }),
  z.strictObject({
    kind: z.literal('TICKETS'),
    merchantId,
    ticketCount: z.number().int().positive(),
    ticketClass: z.string().min(1),
  }),
  z.strictObject({
    kind: z.literal('NOMINAL_PACKAGE'),
    merchantId,
    cashAcquisitionCostCentimos: centimos,
    nominalUnit,
  }),
]);

const ruleVersionSchema = z.strictObject({
  ruleId: z.string().min(1),
  version: z.number().int().positive(),
  campaignId: z.string().min(1),
  merchantIds: z.array(merchantId).min(1),
  providerFamily: z.enum(PROVIDER_FAMILIES),
  benefit: benefitSchema,
  eligibleSpendSelector: selector,
  canonicalItems: z.array(canonicalItemSchema).min(1).optional(),
  ticketContext: z
    .strictObject({ ticketCount: z.number().int().positive(), ticketClass: z.string().min(1) })
    .optional(),
  constraints: constraintsSchema,
  eligibilityClass: z.enum(ELIGIBILITY_CLASSES),
  confidence: z.enum(CONFIDENCE_LEVELS),
  comparisonScopeRefs: z.array(z.string().min(1)).min(1),
  signatureKind: z.enum(PURCHASE_SIGNATURE_KINDS),
  provenance: z.strictObject({
    sourceId: z.string().min(1),
    url: z.string().min(1),
    observedAt: z.string().min(1),
  }),
});

const comparisonScopeSchema = z.strictObject({
  scopeId: z.string().min(1),
  merchantId,
  comparisonBasis: z.enum(COMPARISON_BASES),
  equivalenceGroup: z.string().min(1),
  purchaseKind: z.string().min(1),
  requiredContext: z.array(z.enum(CONTEXT_REQS)),
  allowedSelectors: z.array(selector).min(1),
  signature: signatureSchema,
});

const ruleOperationalStateSchema = z.strictObject({
  ruleId: z.string().min(1),
  version: z.number().int().positive(),
  publicationState: z.enum(PUBLICATION_STATES),
  sourceQualityState: z.enum(SOURCE_QUALITY_STATES),
  availability: z.enum(AVAILABILITY_STATES),
  asOf: z.string().min(1),
  note: z.string().optional(),
});

const portfolioSchema = z.strictObject({
  instruments: z.array(
    z.strictObject({
      family: z.enum(PROVIDER_FAMILIES),
      network: z.enum(['AMEX', 'VISA', 'MC']).optional(),
      tier: z.string().optional(),
      memberships: z.array(z.string()).optional(),
    }),
  ),
  privateStates: z.record(z.string(), tri).optional(),
  declarations: z.record(z.string(), tri).optional(),
});

const purchaseContextSchema = z.strictObject({
  merchantId,
  channel: z.enum(CHANNELS).optional(),
  branch: z.string().optional(),
  wholeBillCentimos: centimos.optional(),
  foodCentimos: centimos.optional(),
  nonAlcoholicBeverageCentimos: centimos.optional(),
  ticketUnitPriceCentimos: centimos.optional(),
  ticketCount: z.number().int().positive().optional(),
  ticketClass: z.string().optional(),
  exactItems: z.array(canonicalItemSchema).optional(),
  purchaseDomain: z.enum(PURCHASE_DOMAINS).optional(),
  nominalPackage: z.strictObject({ cashAcquisitionCostCentimos: centimos, nominalUnit }).optional(),
});

/** Frozen v1 schema for the persisted `engineInputJson` payload (the exact effective decide() input). */
export const engineInputV1Schema = z.strictObject({
  rules: z.array(ruleVersionSchema),
  operationalStates: z.array(ruleOperationalStateSchema),
  scopes: z.array(comparisonScopeSchema),
  portfolio: portfolioSchema,
  context: purchaseContextSchema,
  evaluatedAt: strictInstant,
  intendedTransactionAt: strictInstant,
  selectedScopeId: z.string().optional(),
  holidayCalendar: z.array(z.string()).optional(),
  baselineByScopeId: z.record(z.string(), centimos).optional(),
});

// ---- Engine output sub-shapes (frozen v1 copies) ----
const ruleRefSchema = z.strictObject({ ruleId: z.string().min(1), version: z.number().int() });

const boundProofSchema = z.strictObject({
  kind: z.enum([
    'CURRENT_EXPLICIT_LIMIT',
    'CURRENT_UNCAPPED_FUNCTION_BOUND',
    'CURRENT_CONFIRMED_ZERO_AVAILABILITY',
  ]),
  proofRef: z.string(),
  sourceCheckId: z.string(),
  reviewedBy: z.string(),
  reviewedAt: z.string(),
  derivation: z.string(),
});

const plausibleBoundSchema = z.union([
  z.strictObject({
    basis: z.literal('EFFECTIVE_OUT_OF_POCKET_COST'),
    kind: z.literal('KNOWN_BOUND'),
    minPlausibleCostCentimos: centimos,
    proof: boundProofSchema,
  }),
  z.strictObject({
    basis: z.literal('NOMINAL_VALUE_SAME_UNIT'),
    kind: z.literal('KNOWN_BOUND'),
    maxPlausibleValueMinorUnits: safeInt(z.number().int()),
    unit: nominalUnit,
    proof: boundProofSchema,
  }),
  z.strictObject({ kind: z.literal('UNKNOWN_OR_UNBOUNDED'), reason: z.string() }),
]);

const rankDeltaSchema = z
  .union([
    z.strictObject({ kind: z.literal('COST_CENTIMOS'), amountCentimos: safeInt(z.number().int()) }),
    z.strictObject({
      kind: z.literal('NOMINAL_VALUE'),
      amountMinorUnits: safeInt(z.number().int()),
      unit: nominalUnit,
    }),
  ])
  .nullable();

const decisionStatusSchema = z.enum([
  'BEST_CONFIRMED',
  'CONFIRMED_TIE',
  'LIKELY',
  'VERIFY_FIRST',
  'NO_SAFE_WINNER',
  'NO_APPLICABLE_BENEFIT',
  'SOURCE_STALE',
  'SOURCE_CONFLICT',
]);

const candidateAdvisorySchema = z.enum([
  'VERIFY_FIRST',
  'STALE_CANDIDATE',
  'CONFLICTED_CANDIDATE',
  'NON_COMPARABLE',
  'NON_EQUIVALENT_PURCHASE',
  'DYNAMIC_AVAILABILITY',
  'UNKNOWN_CAP',
  'UNKNOWN_COMBINABILITY',
  'MISSING_CONTEXT',
]);

const decisionCandidateSchema = z.strictObject({
  ruleRef: ruleRefSchema,
  scopeId: z.string(),
  comparisonBasis: z.enum(COMPARISON_BASES),
  eligibility: z.enum(['ELIGIBLE', 'INELIGIBLE', 'UNKNOWN']),
  rankable: z.boolean(),
  effectiveCostCentimos: centimos.optional(),
  nominalValue: z
    .strictObject({ minorUnits: safeInt(z.number().int()), unit: nominalUnit })
    .optional(),
  cashbackCentimos: centimos.optional(),
  penSavedCentimos: centimos.optional(),
  baselineRef: z.string().optional(),
  plausibleBound: plausibleBoundSchema,
  couldChangeDecision: z.boolean(),
  couldImproveBestOutcome: z.boolean(),
  couldChangeTopSet: z.boolean(),
  confidence: z.enum(CONFIDENCE_LEVELS),
  advisories: z.array(candidateAdvisorySchema),
  rejectionReason: z.string().optional(),
});

const engineDecisionResultSchema = z.strictObject({
  scopeId: z.string(),
  merchantId,
  comparisonBasis: z.enum(COMPARISON_BASES),
  status: decisionStatusSchema,
  winnerRef: ruleRefSchema.optional(),
  runnerUpRef: ruleRefSchema.optional(),
  delta: rankDeltaSchema,
  confirmedTopRuleRefs: z.array(ruleRefSchema),
  possibleAdditionalTopRuleRefs: z.array(ruleRefSchema),
  topSetComplete: z.boolean(),
  candidates: z.array(decisionCandidateSchema),
  advisories: z.array(decisionCandidateSchema),
  explanation: z.string(),
});

const scopeDecisionResultSchema = z.strictObject({
  scopeId: z.string(),
  merchantId,
  comparisonBasis: z.enum(COMPARISON_BASES),
  decision: engineDecisionResultSchema,
});

/** Frozen v1 schema for the persisted `engineOutputJson` payload (the exact EngineEvaluation). */
export const engineOutputV1Schema = z.strictObject({
  merchantId,
  matchedScopes: z.array(scopeDecisionResultSchema),
  requiresScopeSelection: z.boolean(),
  selectedScopeId: z.string().optional(),
  final: engineDecisionResultSchema.optional(),
  evaluatedAt: strictInstant,
  intendedTransactionAt: strictInstant,
});

// ---- Persisted DecisionSnapshot envelope (the JSON-facing record shape) ----
/**
 * Runtime schema for a persisted DecisionSnapshot as a plain object (the DTO returned by the
 * repository and accepted by the integrity verifier). The versioned payloads are validated
 * *strictly*; `engineInputJson` / `engineOutputJson` must be current-version and structurally valid,
 * so an unknown/unversioned payload is never silently treated as current (§7).
 */
export const decisionSnapshotDtoSchema = z.strictObject({
  id: z.string(),
  businessDecisionKey: z.string().min(1),
  idempotencyKey: z.string().min(1),
  snapshotSchemaVersion: z.literal(SNAPSHOT_SCHEMA_VERSION),
  engineInputSchemaVersion: z.literal(ENGINE_INPUT_SCHEMA_VERSION),
  engineOutputSchemaVersion: z.literal(ENGINE_OUTPUT_SCHEMA_VERSION),
  engineContractVersion: z.string().min(1),
  corpusVersion: z.string().min(1),
  merchantId,
  selectedScopeId: z.string().nullable(),
  decisionStatus: z.string().min(1),
  evaluatedAt: strictInstant,
  intendedTransactionAt: strictInstant,
  engineInputJson: engineInputV1Schema,
  engineOutputJson: engineOutputV1Schema,
  inputHash: z.string().regex(/^[0-9a-f]{64}$/, 'inputHash must be lowercase SHA-256 hex'),
  outputHash: z.string().regex(/^[0-9a-f]{64}$/, 'outputHash must be lowercase SHA-256 hex'),
  gitSha: z.string().min(1),
  buildId: z.string().nullable(),
  createdAt: z.string(),
});

export type EngineInputV1 = z.infer<typeof engineInputV1Schema>;
export type EngineOutputV1 = z.infer<typeof engineOutputV1Schema>;

// The DTO's payload fields carry the AUTHORITATIVE engine types (DecideInput / EngineEvaluation), not
// the structurally-equivalent Zod-inferred types — the schema validated the exact same shape, so this
// is a safe re-typing that lets a reloaded snapshot feed straight back into `decide()` for replay.
export type DecisionSnapshotDto = Omit<
  z.infer<typeof decisionSnapshotDtoSchema>,
  'engineInputJson' | 'engineOutputJson'
> & {
  engineInputJson: DecideInput;
  engineOutputJson: EngineEvaluation;
};

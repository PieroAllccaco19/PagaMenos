// PagaMenos · src/persistence — FROZEN v1 runtime schemas for persisted engine payloads (§7/§19).
//
// These Zod schemas validate the exact `engineInputJson` / `engineOutputJson` payloads at the write
// boundary (reject a malformed or secret-bearing payload before storage) and the read boundary (a
// defensive guard when reloading history).
//
// FROZEN LOCALLY (P35A-04): a persisted decision must remain self-describing forever (§3). The v1
// payload shape is pinned here and paired only with `*.v1` versions; every enum token comes from the
// frozen `./tokens-v1` copies and every instant from `./instant-v1` — NEVER the mutable live corpus
// arrays/validators — so a future live-domain change cannot retroactively rewrite how a v1 record
// validates. A source-boundary test enforces the no-live-import rule. The ultimate integrity anchor
// is still the stored SHA-256 (§8) over the exact canonical bytes.
//
// STRICT everywhere: unknown keys are REJECTED, so a secret-like field can never ride inside a payload.
import { z } from 'zod';

import type { DecideInput, EngineEvaluation } from '@/engine';

import { isValidInstantV1 } from './instant-v1';
import {
  AVAILABILITY_STATES_V1,
  CANDIDATE_ADVISORIES_V1,
  CARD_NETWORKS_V1,
  CHANNELS_V1,
  COMBINABILITY_V1,
  COMPARISON_BASES_V1,
  CONFIDENCE_LEVELS_V1,
  CONTEXT_REQS_V1,
  DECISION_STATUSES_V1,
  ELIGIBILITY_CLASSES_V1,
  ELIGIBLE_SPEND_SELECTORS_V1,
  HOLIDAY_POLICIES_V1,
  INSTRUMENT_NETWORKS_V1,
  MERCHANT_IDS_V1,
  NOMINAL_UNITS_V1,
  PROVIDER_FAMILIES_V1,
  PUBLICATION_STATES_V1,
  PURCHASE_DOMAINS_V1,
  PURCHASE_SIGNATURE_KINDS_V1,
  ROUNDING_RULES_V1,
  SOURCE_QUALITY_STATES_V1,
  TRI_V1,
  USE_LIMIT_PERIODS_V1,
  WEEKDAYS_V1,
} from './tokens-v1';
import {
  ENGINE_CONTRACT_VERSION,
  ENGINE_INPUT_SCHEMA_VERSION,
  ENGINE_OUTPUT_SCHEMA_VERSION,
  SNAPSHOT_SCHEMA_VERSION,
} from './versions';
import { UnsupportedSnapshotVersionError } from './errors';

// ---- Shared leaf schemas (frozen v1; SAFE integers, §RTM3-11) ----
const safeInt = (schema: z.ZodNumber) =>
  schema.refine(Number.isSafeInteger, { message: 'must be a safe integer (|value| ≤ 2^53−1)' });
const centimos = safeInt(z.number().int().nonnegative());
const nominalMinorUnits = safeInt(z.number().int().positive());
const strictInstant = z.string().refine(isValidInstantV1, {
  message: 'invalid ISO-8601 instant; a zone-qualified date-time (Z or ±HH:MM) is required',
});
const merchantId = z.enum(MERCHANT_IDS_V1);
const selector = z.enum(ELIGIBLE_SPEND_SELECTORS_V1);
const tri = z.enum(TRI_V1);
const nominalUnit = z.enum(NOMINAL_UNITS_V1);

// ---- Corpus-typed input sub-shapes (frozen v1 copies) ----
const capSchema = z.union([
  z.strictObject({ kind: z.literal('AMOUNT'), centimos }),
  z.strictObject({ kind: z.literal('UNKNOWN_NOT_STATED') }),
]);

const benefitSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('PERCENT'),
    percentBps: z.number().int().positive(),
    rounding: z.enum(ROUNDING_RULES_V1),
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
  weekdays: z.array(z.enum(WEEKDAYS_V1)).optional(),
  timeWindow: z.strictObject({ from: z.string(), to: z.string() }).optional(),
  holidayPolicy: z.enum(HOLIDAY_POLICIES_V1),
  specificBlackoutDates: z.array(z.string()).optional(),
  minimumSpend: z.strictObject({ minimumSpendCentimos: centimos, basis: selector }).optional(),
  cap: capSchema.optional(),
  channels: z.array(z.enum(CHANNELS_V1)).optional(),
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
    .strictObject({ per: z.enum(USE_LIMIT_PERIODS_V1), count: z.number().int().positive() })
    .optional(),
  stock: z
    .strictObject({ known: z.boolean(), remaining: z.number().int().nonnegative().optional() })
    .optional(),
  cardNetwork: z.enum(CARD_NETWORKS_V1).optional(),
  cardTier: z.string().optional(),
  membership: z.string().optional(),
  providerPrivateKey: z.string().optional(),
  preRedemptionVerifiable: z.boolean().optional(),
  combinability: z.enum(COMBINABILITY_V1),
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
    purchaseDomain: z.enum(PURCHASE_DOMAINS_V1),
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
  providerFamily: z.enum(PROVIDER_FAMILIES_V1),
  benefit: benefitSchema,
  eligibleSpendSelector: selector,
  canonicalItems: z.array(canonicalItemSchema).min(1).optional(),
  ticketContext: z
    .strictObject({ ticketCount: z.number().int().positive(), ticketClass: z.string().min(1) })
    .optional(),
  constraints: constraintsSchema,
  eligibilityClass: z.enum(ELIGIBILITY_CLASSES_V1),
  confidence: z.enum(CONFIDENCE_LEVELS_V1),
  comparisonScopeRefs: z.array(z.string().min(1)).min(1),
  signatureKind: z.enum(PURCHASE_SIGNATURE_KINDS_V1),
  provenance: z.strictObject({
    sourceId: z.string().min(1),
    url: z.string().min(1),
    observedAt: z.string().min(1),
  }),
});

const comparisonScopeSchema = z.strictObject({
  scopeId: z.string().min(1),
  merchantId,
  comparisonBasis: z.enum(COMPARISON_BASES_V1),
  equivalenceGroup: z.string().min(1),
  purchaseKind: z.string().min(1),
  requiredContext: z.array(z.enum(CONTEXT_REQS_V1)),
  allowedSelectors: z.array(selector).min(1),
  signature: signatureSchema,
});

const ruleOperationalStateSchema = z.strictObject({
  ruleId: z.string().min(1),
  version: z.number().int().positive(),
  publicationState: z.enum(PUBLICATION_STATES_V1),
  sourceQualityState: z.enum(SOURCE_QUALITY_STATES_V1),
  availability: z.enum(AVAILABILITY_STATES_V1),
  asOf: z.string().min(1),
  note: z.string().optional(),
});

const portfolioSchema = z.strictObject({
  instruments: z.array(
    z.strictObject({
      family: z.enum(PROVIDER_FAMILIES_V1),
      network: z.enum(INSTRUMENT_NETWORKS_V1).optional(),
      tier: z.string().optional(),
      memberships: z.array(z.string()).optional(),
    }),
  ),
  privateStates: z.record(z.string(), tri).optional(),
  declarations: z.record(z.string(), tri).optional(),
});

const purchaseContextSchema = z.strictObject({
  merchantId,
  channel: z.enum(CHANNELS_V1).optional(),
  branch: z.string().optional(),
  wholeBillCentimos: centimos.optional(),
  foodCentimos: centimos.optional(),
  nonAlcoholicBeverageCentimos: centimos.optional(),
  ticketUnitPriceCentimos: centimos.optional(),
  ticketCount: z.number().int().positive().optional(),
  ticketClass: z.string().optional(),
  exactItems: z.array(canonicalItemSchema).optional(),
  purchaseDomain: z.enum(PURCHASE_DOMAINS_V1).optional(),
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

const decisionStatusSchema = z.enum(DECISION_STATUSES_V1);
const candidateAdvisorySchema = z.enum(CANDIDATE_ADVISORIES_V1);

const decisionCandidateSchema = z.strictObject({
  ruleRef: ruleRefSchema,
  scopeId: z.string(),
  comparisonBasis: z.enum(COMPARISON_BASES_V1),
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
  confidence: z.enum(CONFIDENCE_LEVELS_V1),
  advisories: z.array(candidateAdvisorySchema),
  rejectionReason: z.string().optional(),
});

const engineDecisionResultSchema = z.strictObject({
  scopeId: z.string(),
  merchantId,
  comparisonBasis: z.enum(COMPARISON_BASES_V1),
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
  comparisonBasis: z.enum(COMPARISON_BASES_V1),
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
 * Runtime schema for a persisted DecisionSnapshot as a plain object. The versioned payloads are
 * validated STRICTLY, and EVERY version field (snapshot / input / output / engine contract) is an
 * exact literal (P35A-04) — an unknown/unversioned payload is never silently treated as current (§7).
 */
export const decisionSnapshotDtoSchema = z.strictObject({
  id: z.string(),
  businessDecisionKey: z.string().min(1),
  snapshotSchemaVersion: z.literal(SNAPSHOT_SCHEMA_VERSION),
  engineInputSchemaVersion: z.literal(ENGINE_INPUT_SCHEMA_VERSION),
  engineOutputSchemaVersion: z.literal(ENGINE_OUTPUT_SCHEMA_VERSION),
  engineContractVersion: z.literal(ENGINE_CONTRACT_VERSION),
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

/**
 * Version-dispatched historical decode (P35A-04 §28). A record is parsed ONLY under a parser that
 * matches its `snapshotSchemaVersion`; an unknown/absent version throws
 * `UnsupportedSnapshotVersionError` rather than falling into current parsing. Within v1, every inner
 * version (input/output/engine contract) is an exact literal enforced by the schema above.
 */
export function parseDecisionSnapshot(raw: unknown): DecisionSnapshotDto {
  const version =
    typeof raw === 'object' && raw !== null
      ? (raw as { snapshotSchemaVersion?: unknown }).snapshotSchemaVersion
      : undefined;
  switch (version) {
    case SNAPSHOT_SCHEMA_VERSION:
      return decisionSnapshotDtoSchema.parse(raw) as unknown as DecisionSnapshotDto;
    default:
      throw new UnsupportedSnapshotVersionError(version);
  }
}

// PagaMenos · Zod schema for the serialized corpus (syntactic/shape validity).
// Strict objects REJECT unknown keys — this is where superseded fields
// (minSpendCentimos, Benefit.minimumSpendCentimos, minimumSpendBasis) are rejected.
// Semantic validity (RT-04/RT-06 invariants) lives in lint.ts, not here.
import { z } from 'zod';

import {
  AVAILABILITY_STATES,
  CHANNELS,
  COMPARISON_BASES,
  CONFIDENCE_LEVELS,
  CONTEXT_REQS,
  DECISION_CLASSES,
  ELIGIBILITY_CLASSES,
  ELIGIBLE_SPEND_SELECTORS,
  HOLIDAY_POLICIES,
  MERCHANT_IDS,
  NOMINAL_UNITS,
  OVERLAP_CLASSES,
  PROVIDER_FAMILIES,
  PUBLICATION_STATES,
  PURCHASE_DOMAINS,
  PURCHASE_SIGNATURE_KINDS,
  ROUNDING_RULES,
  SOURCE_QUALITY_STATES,
  WEEKDAYS,
} from './ids';
import { isValidInstant } from './instant';
import type { Corpus } from './types';

// RTM3-11: monetary/nominal integers must be SAFE integers — `z.number().int()` accepts values above
// Number.MAX_SAFE_INTEGER (still "integers") where arithmetic silently loses precision.
const safeInt = (schema: z.ZodNumber) =>
  schema.refine(Number.isSafeInteger, { message: 'must be a safe integer (|value| ≤ 2^53−1)' });
const centimos = safeInt(z.number().int().nonnegative());
const nominalMinorUnits = safeInt(z.number().int().positive());
const strictInstant = z.string().refine(isValidInstant, {
  message: 'invalid ISO-8601 instant; a zone-qualified date-time (Z or ±HH:MM) is required',
});
const merchantId = z.enum(MERCHANT_IDS);
const selector = z.enum(ELIGIBLE_SPEND_SELECTORS);

/** True iff `s` is a real YYYY-MM-DD calendar date (interpreted on the America/Lima calendar). */
export function isValidLocalDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  // Reconstruct via UTC (calendar-only; no zone math) and require the parts to round-trip,
  // rejecting overflow dates like 2026-02-30 or 2026-13-01.
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

const localDate = z.string().refine(isValidLocalDate, {
  message: 'invalid local (America/Lima) calendar date, expected YYYY-MM-DD',
});

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
    nominalUnit: z.enum(NOMINAL_UNITS),
    // Optional ⇒ absent models an explicit UNKNOWN cost; a present value must be a valid céntimo.
    cashAcquisitionCostCentimos: centimos.optional(),
  }),
]);

const spendThresholdSchema = z.strictObject({ minimumSpendCentimos: centimos, basis: selector });

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
  // Start unknown, but observed active until a published end. `observedActiveAt` is provenance,
  // NOT a provider-declared campaign start; both dates must be valid Lima calendar dates.
  z.strictObject({
    kind: z.literal('OBSERVED_ACTIVE_UNTIL'),
    observedActiveAt: localDate,
    endDateInclusive: localDate,
  }),
]);

const constraintsSchema = z.strictObject({
  temporal: temporalSchema,
  weekdays: z.array(z.enum(WEEKDAYS)).optional(),
  timeWindow: z.strictObject({ from: z.string(), to: z.string() }).optional(),
  holidayPolicy: z.enum(HOLIDAY_POLICIES),
  specificBlackoutDates: z.array(z.string()).optional(),
  minimumSpend: spendThresholdSchema.optional(),
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
    nominalUnit: z.enum(NOMINAL_UNITS),
  }),
]);

const scopeSchema = z.strictObject({
  scopeId: z.string().min(1),
  merchantId,
  comparisonBasis: z.enum(COMPARISON_BASES),
  equivalenceGroup: z.string().min(1),
  purchaseKind: z.string().min(1),
  requiredContext: z.array(z.enum(CONTEXT_REQS)),
  allowedSelectors: z.array(selector).min(1),
  signature: signatureSchema,
});

const provenanceSchema = z.strictObject({
  sourceId: z.string().min(1),
  url: z.string().min(1),
  observedAt: z.string().min(1),
});

const ruleSchema = z.strictObject({
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
  provenance: provenanceSchema,
});

const operationalSchema = z.strictObject({
  ruleId: z.string().min(1),
  version: z.number().int().positive(),
  publicationState: z.enum(PUBLICATION_STATES),
  sourceQualityState: z.enum(SOURCE_QUALITY_STATES),
  availability: z.enum(AVAILABILITY_STATES),
  asOf: z.string().min(1),
  note: z.string().optional(),
});

const merchantSchema = z.strictObject({
  merchantId,
  displayName: z.string().min(1),
  category: z.enum(['FOOD', 'ENTERTAINMENT']),
  aliases: z.array(z.string()).optional(),
});

const sourceSchema = z.strictObject({
  sourceId: z.string().min(1),
  providerFamily: z.enum(PROVIDER_FAMILIES),
  url: z.string().min(1),
  label: z.string().min(1),
});

const researchMetaSchema = z.strictObject({
  merchantId,
  overlapClass: z.enum(OVERLAP_CLASSES),
  decisionClass: z.enum(DECISION_CLASSES),
  verifyFirstOverlay: z.boolean(),
});

export const corpusSchema = z.strictObject({
  corpusId: z.string().min(1),
  freezeTimestamp: z.string().min(1),
  merchants: z.array(merchantSchema),
  sources: z.array(sourceSchema),
  scopes: z.array(scopeSchema),
  activeRules: z.array(ruleSchema),
  operationalStates: z.array(operationalSchema),
  researchMeta: z.array(researchMetaSchema),
  excludedRules: z.array(
    z.strictObject({ rule: ruleSchema, operational: operationalSchema, reason: z.string().min(1) }),
  ),
});

/** Validate the serialized corpus shape (throws ZodError on failure). */
export function parseCorpus(raw: unknown): Corpus {
  return corpusSchema.parse(raw) as Corpus;
}

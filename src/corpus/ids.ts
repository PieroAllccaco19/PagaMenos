// PagaMenos · Corpus v1 canonical reference vocabularies.
// Pure, frozen, corpus-controlled. Adding generic/LATAM abstractions here is out of scope.

export const PROVIDER_FAMILIES = ['IBK_PLIN', 'DINERS', 'BCP_QORE', 'SIP_OH'] as const;
export type ProviderFamily = (typeof PROVIDER_FAMILIES)[number];

/** The exact 14 retained merchants (stable IDs, separate from display names). */
export const MERCHANT_IDS = [
  'm_papa_johns',
  'm_chinawok',
  'm_baco_y_vaca',
  'm_granja_azul',
  'm_fridays',
  'm_uvk',
  'm_popeyes',
  'm_cineplanet',
  'm_coney_park',
  'm_coney_active',
  'm_embarcadero_41',
  'm_issei',
  'm_perroquet',
  'm_villa_chicken',
] as const;
export type MerchantId = (typeof MERCHANT_IDS)[number];

/** Merchants removed during hardening — MUST NOT appear in the active corpus. */
export const REMOVED_MERCHANT_KEYS = [
  'don_belisario',
  'pizza_hut',
  'la_bistecca',
  'la_nacional',
] as const;

export const ELIGIBILITY_CLASSES = [
  'DETERMINISTIC_PUBLIC',
  'USER_DECLARABLE',
  'DYNAMIC_EXTERNAL',
  'PROVIDER_PRIVATE',
] as const;
export type EligibilityClass = (typeof ELIGIBILITY_CLASSES)[number];

export const BENEFIT_TYPES = [
  'PERCENT',
  'FIXED_DISCOUNT',
  'FIXED_PRICE',
  'TWO_FOR_ONE',
  'FIXED_BUNDLE',
  'CASHBACK',
  'NON_CASH_NOMINAL',
] as const;
export type BenefitType = (typeof BENEFIT_TYPES)[number];

export const ELIGIBLE_SPEND_SELECTORS = [
  'WHOLE_BILL',
  'FOOD_ONLY',
  'FOOD_PLUS_NONALCOHOLIC',
  'EXACT_SKU_BUNDLE',
  'TICKET_UNIT',
  'NON_EQUIVALENT_PURCHASE',
] as const;
export type EligibleSpendSelector = (typeof ELIGIBLE_SPEND_SELECTORS)[number];

export const ROUNDING_RULES = [
  'FLOOR_TO_CENT',
  'ROUND_HALF_UP_TO_CENT',
  'EXACT_FIXED',
  'UNKNOWN',
] as const;
export type RoundingRule = (typeof ROUNDING_RULES)[number];

/** Publication axis (rankability-at-time). Distinct from source quality. */
export const PUBLICATION_STATES = ['ACTIVE', 'FUTURE', 'EXPIRED', 'QUARANTINED'] as const;
export type PublicationState = (typeof PUBLICATION_STATES)[number];

/** Source-quality axis. Distinct from publication. */
export const SOURCE_QUALITY_STATES = [
  'FRESH',
  'STALE',
  'INACCESSIBLE',
  'CONFLICTED',
  'UNKNOWN',
] as const;
export type SourceQualityState = (typeof SOURCE_QUALITY_STATES)[number];

export const AVAILABILITY_STATES = [
  'CONFIRMED_AVAILABLE',
  'CONFIRMED_UNAVAILABLE',
  'UNKNOWN',
  'NOT_APPLICABLE',
] as const;
export type AvailabilityState = (typeof AVAILABILITY_STATES)[number];

export const HOLIDAY_POLICIES = ['NONE', 'EXCLUDED', 'SPECIFIC_DATES', 'UNKNOWN'] as const;
export type HolidayPolicy = (typeof HOLIDAY_POLICIES)[number];

export const CHANNELS = [
  'SALON',
  'TAKEAWAY',
  'DELIVERY',
  'WEB_APP',
  'BOX_OFFICE',
  'PICKUP',
] as const;
export type Channel = (typeof CHANNELS)[number];

export const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const CONFIDENCE_LEVELS = ['HIGH', 'MEDIUM', 'LOW'] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

export const CONTEXT_REQS = [
  'AMOUNT',
  'BASKET',
  'TICKET_PRICE',
  'CHANNEL',
  'LOCATION_OR_BRANCH',
  'DATE_TIME',
] as const;
export type ContextReq = (typeof CONTEXT_REQS)[number];

export const COMPARISON_BASES = [
  'EFFECTIVE_OUT_OF_POCKET_COST',
  'NOMINAL_VALUE_SAME_UNIT',
  'NON_COMPARABLE',
] as const;
export type ComparisonBasis = (typeof COMPARISON_BASES)[number];

export const PURCHASE_SIGNATURE_KINDS = [
  'EXACT_BUNDLE',
  'ELIGIBLE_BILL',
  'TICKETS',
  'NOMINAL_PACKAGE',
] as const;
export type PurchaseSignatureKind = (typeof PURCHASE_SIGNATURE_KINDS)[number];

/** Corpus-controlled nominal units (RT-06). Kept intentionally tiny. */
export const NOMINAL_UNITS = ['CONEY_PLAY_BALANCE'] as const;
export type NominalUnit = (typeof NOMINAL_UNITS)[number];

/** Corpus-controlled purchase domains for ELIGIBLE_BILL signatures (RT-04). Tiny + explicit. */
export const PURCHASE_DOMAINS = [
  'RESTAURANT_BILL',
  'RESTAURANT_FOOD',
  'SIT_DOWN_MEAL',
  'CINEMA_CANDYBAR',
  'UVK_RESTOBAR',
  'UVK_OPERA',
  'VILLA_A_LA_CARTE',
] as const;
export type PurchaseDomain = (typeof PURCHASE_DOMAINS)[number];

/** Research overlap / decision-value labels — kept OUT of engine predicates (§14). */
export const OVERLAP_CLASSES = ['O2', 'O3', 'O4_CONFIRMED'] as const;
export type OverlapClass = (typeof OVERLAP_CLASSES)[number];

export const DECISION_CLASSES = [
  'DECISION_ENGINE_CORE',
  'DECISION_ASSIST',
  'DIRECTORY_SUFFICIENT',
] as const;
export type DecisionClass = (typeof DECISION_CLASSES)[number];

export const CORPUS_ID = 'PAGAMENOS_VALIDATION_CORPUS_v1_2026-08-30T1800-0500';
export const FREEZE_TIMESTAMP = '2026-08-30T18:00:00-05:00';
export const OBSERVED_AT = '2026-08-30';

/** Frozen reconciliation targets (Phase 0A-1B). */
export const EXPECTED = {
  merchants: 14,
  activeRules: 46,
  foodMerchants: 10,
  entertainmentMerchants: 4,
  providerDistribution: { IBK_PLIN: 16, DINERS: 12, BCP_QORE: 10, SIP_OH: 8 } as const,
  providerPrivateOverlays: 2,
  overlap: { O2: 8, O3: 2, O4_CONFIRMED: 4 } as const,
  decision: { DECISION_ENGINE_CORE: 7, DECISION_ASSIST: 3, DIRECTORY_SUFFICIENT: 4 } as const,
} as const;

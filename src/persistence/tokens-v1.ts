// PagaMenos · persistence — FROZEN v1 enum token sets (P35A-04 §29/§31).
//
// These are LOCAL, frozen copies of every enum vocabulary used by the persisted v1 payload format,
// pinned to the exact CURRENT accepted values at the time v1 was frozen. Historical v1 parsing sources
// its `z.enum(...)` tokens from HERE, never from the live `@/corpus` runtime arrays — so if a future
// live-domain edit adds a token, frozen v1 history keeps validating exactly as it did (a deliberate
// v2 would be required to accept the new token). A source-boundary test asserts this module and the v1
// schema do not runtime-import the live domain arrays. Type-only imports stay compile-compatible.
import type {
  AvailabilityState,
  ComparisonBasis,
  Confidence,
  ContextReq,
  EligibilityClass,
  EligibleSpendSelector,
  HolidayPolicy,
  MerchantId,
  NominalUnit,
  ProviderFamily,
  PublicationState,
  PurchaseDomain,
  PurchaseSignatureKind,
  RoundingRule,
  SourceQualityState,
  Weekday,
} from '@/corpus';

/** Compile-time guard: a frozen array must stay assignable to the live union (drift is caught by tsc). */
type FrozenOf<T extends string> = readonly [T, ...T[]];

export const PROVIDER_FAMILIES_V1 = [
  'IBK_PLIN',
  'DINERS',
  'BCP_QORE',
  'SIP_OH',
] as const satisfies FrozenOf<ProviderFamily>;

export const MERCHANT_IDS_V1 = [
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
] as const satisfies FrozenOf<MerchantId>;

export const ELIGIBILITY_CLASSES_V1 = [
  'DETERMINISTIC_PUBLIC',
  'USER_DECLARABLE',
  'DYNAMIC_EXTERNAL',
  'PROVIDER_PRIVATE',
] as const satisfies FrozenOf<EligibilityClass>;

export const ELIGIBLE_SPEND_SELECTORS_V1 = [
  'WHOLE_BILL',
  'FOOD_ONLY',
  'FOOD_PLUS_NONALCOHOLIC',
  'EXACT_SKU_BUNDLE',
  'TICKET_UNIT',
  'NON_EQUIVALENT_PURCHASE',
] as const satisfies FrozenOf<EligibleSpendSelector>;

export const ROUNDING_RULES_V1 = [
  'FLOOR_TO_CENT',
  'ROUND_HALF_UP_TO_CENT',
  'EXACT_FIXED',
  'UNKNOWN',
] as const satisfies FrozenOf<RoundingRule>;

export const PUBLICATION_STATES_V1 = [
  'ACTIVE',
  'FUTURE',
  'EXPIRED',
  'QUARANTINED',
] as const satisfies FrozenOf<PublicationState>;

export const SOURCE_QUALITY_STATES_V1 = [
  'FRESH',
  'STALE',
  'INACCESSIBLE',
  'CONFLICTED',
  'UNKNOWN',
] as const satisfies FrozenOf<SourceQualityState>;

export const AVAILABILITY_STATES_V1 = [
  'CONFIRMED_AVAILABLE',
  'CONFIRMED_UNAVAILABLE',
  'UNKNOWN',
  'NOT_APPLICABLE',
] as const satisfies FrozenOf<AvailabilityState>;

export const HOLIDAY_POLICIES_V1 = [
  'NONE',
  'EXCLUDED',
  'SPECIFIC_DATES',
  'UNKNOWN',
] as const satisfies FrozenOf<HolidayPolicy>;

export const CHANNELS_V1 = [
  'SALON',
  'TAKEAWAY',
  'DELIVERY',
  'WEB_APP',
  'BOX_OFFICE',
  'PICKUP',
] as const;

export const WEEKDAYS_V1 = [
  'MON',
  'TUE',
  'WED',
  'THU',
  'FRI',
  'SAT',
  'SUN',
] as const satisfies FrozenOf<Weekday>;

export const CONFIDENCE_LEVELS_V1 = [
  'HIGH',
  'MEDIUM',
  'LOW',
] as const satisfies FrozenOf<Confidence>;

export const CONTEXT_REQS_V1 = [
  'AMOUNT',
  'BASKET',
  'TICKET_PRICE',
  'CHANNEL',
  'LOCATION_OR_BRANCH',
  'DATE_TIME',
] as const satisfies FrozenOf<ContextReq>;

export const COMPARISON_BASES_V1 = [
  'EFFECTIVE_OUT_OF_POCKET_COST',
  'NOMINAL_VALUE_SAME_UNIT',
  'NON_COMPARABLE',
] as const satisfies FrozenOf<ComparisonBasis>;

export const PURCHASE_SIGNATURE_KINDS_V1 = [
  'EXACT_BUNDLE',
  'ELIGIBLE_BILL',
  'TICKETS',
  'NOMINAL_PACKAGE',
] as const satisfies FrozenOf<PurchaseSignatureKind>;

export const NOMINAL_UNITS_V1 = ['CONEY_PLAY_BALANCE'] as const satisfies FrozenOf<NominalUnit>;

export const PURCHASE_DOMAINS_V1 = [
  'RESTAURANT_BILL',
  'RESTAURANT_FOOD',
  'SIT_DOWN_MEAL',
  'CINEMA_CANDYBAR',
  'UVK_RESTOBAR',
  'UVK_OPERA',
  'VILLA_A_LA_CARTE',
] as const satisfies FrozenOf<PurchaseDomain>;

// Small closed literal sets used inside constraints/portfolio (frozen locally).
export const CARD_NETWORKS_V1 = ['AMEX', 'VISA', 'MC', 'ANY'] as const;
export const INSTRUMENT_NETWORKS_V1 = ['AMEX', 'VISA', 'MC'] as const;
export const USE_LIMIT_PERIODS_V1 = ['DAY', 'ORDER', 'MONTH', 'CAMPAIGN'] as const;
export const COMBINABILITY_V1 = ['NO', 'UNKNOWN', 'YES'] as const;
export const TRI_V1 = ['YES', 'NO', 'UNKNOWN'] as const;
export const BENEFIT_TYPES_V1 = [
  'PERCENT',
  'FIXED_DISCOUNT',
  'FIXED_PRICE',
  'TWO_FOR_ONE',
  'FIXED_BUNDLE',
  'CASHBACK',
  'NON_CASH_NOMINAL',
] as const;
export const DECISION_STATUSES_V1 = [
  'BEST_CONFIRMED',
  'CONFIRMED_TIE',
  'LIKELY',
  'VERIFY_FIRST',
  'NO_SAFE_WINNER',
  'NO_APPLICABLE_BENEFIT',
  'SOURCE_STALE',
  'SOURCE_CONFLICT',
] as const;
export const CANDIDATE_ADVISORIES_V1 = [
  'VERIFY_FIRST',
  'STALE_CANDIDATE',
  'CONFLICTED_CANDIDATE',
  'NON_COMPARABLE',
  'NON_EQUIVALENT_PURCHASE',
  'DYNAMIC_AVAILABILITY',
  'UNKNOWN_CAP',
  'UNKNOWN_COMBINABILITY',
  'MISSING_CONTEXT',
] as const;
export const TEMPORAL_KINDS_V1 = [
  'LOCAL_DATE_RANGE',
  'LOCAL_DATETIME_RANGE',
  'OBSERVED_ACTIVE_UNTIL',
] as const;

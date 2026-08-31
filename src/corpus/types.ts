// PagaMenos · Corpus v1 typed domain model. Pure & deterministic (no I/O).
//
// Separation of concerns (§12): `RuleVersion` is IMMUTABLE SEMANTIC content only. Operational
// state (publication / source-quality / availability) lives in `RuleOperationalState`, never
// inside `RuleVersion`, so M2 cannot conflate "what the rule means" with "is it live now".
//
// Money is integer céntimos; nominal value is integer minor units. No settlement math here.
import type {
  AvailabilityState,
  Channel,
  ComparisonBasis,
  Confidence,
  ContextReq,
  DecisionClass,
  EligibilityClass,
  EligibleSpendSelector,
  HolidayPolicy,
  MerchantId,
  NominalUnit,
  OverlapClass,
  ProviderFamily,
  PublicationState,
  PurchaseDomain,
  PurchaseSignatureKind,
  RoundingRule,
  SourceQualityState,
  Weekday,
} from './ids';

export type Centimos = number; // integer, ≥ 0 (validated in schema)

/** Cap on a percentage/fixed-discount benefit. `UNKNOWN_NOT_STATED` = QA-04 (Baco IBK). */
export type Cap = { kind: 'AMOUNT'; centimos: Centimos } | { kind: 'UNKNOWN_NOT_STATED' };

// ---- Benefit (discriminated union; only corpus-required types) ----
export interface PercentBenefit {
  type: 'PERCENT';
  percentBps: number; // basis points, e.g. 2000 = 20%
  rounding: RoundingRule;
}
export interface FixedDiscountBenefit {
  type: 'FIXED_DISCOUNT';
  fixedDiscountCentimos: Centimos;
  amountDependent: boolean; // whether applicability/value depends on transaction amount
}
export interface FixedPriceBenefit {
  type: 'FIXED_PRICE';
  fixedPriceCentimos: Centimos;
  regularReferenceCentimos?: Centimos; // provider-declared; NOT a ranking input
}
export interface TwoForOneBenefit {
  type: 'TWO_FOR_ONE';
  pay: number;
  of: number;
}
export interface FixedBundleBenefit {
  type: 'FIXED_BUNDLE';
  bundlePriceCentimos: Centimos;
  regularReferenceCentimos?: Centimos;
}
export interface CashbackBenefit {
  type: 'CASHBACK';
  valueCentimos: Centimos;
  settlementDelay: string;
}
export interface NonCashNominalBenefit {
  type: 'NON_CASH_NOMINAL';
  nominalMinorUnits: number;
  nominalUnit: NominalUnit;
  /**
   * Cash paid to acquire the nominal package. OPTIONAL to model an explicit UNKNOWN acquisition
   * cost (absent ⇒ unknown ⇒ RT-06 prerequisites unprovable ⇒ NON_COMPARABLE). A present value
   * MUST be a finite integer ≥ 0 (invalid numbers are domain errors, never "unknown"). Every
   * active Corpus-v1 nominal rule supplies a known valid cost.
   */
  cashAcquisitionCostCentimos?: Centimos;
}
export type Benefit =
  | PercentBenefit
  | FixedDiscountBenefit
  | FixedPriceBenefit
  | TwoForOneBenefit
  | FixedBundleBenefit
  | CashbackBenefit
  | NonCashNominalBenefit;

// ---- Minimum spend (Rev-2 canonical; legacy fields forbidden by schema) ----
export interface SpendThreshold {
  minimumSpendCentimos: Centimos;
  basis: EligibleSpendSelector;
}

// ---- Temporal (America/Lima) ----
export interface LocalDateRange {
  kind: 'LOCAL_DATE_RANGE';
  startDateInclusive: string; // YYYY-MM-DD, Lima calendar
  endDateInclusive: string; // inclusive
}
export interface LocalDateTimeRange {
  kind: 'LOCAL_DATETIME_RANGE';
  startInclusive: string; // ISO w/ zone
  endExclusive: string;
}
/**
 * Start date UNKNOWN, but the campaign was observed active at a given Lima date. `observedActiveAt`
 * is evidence/provenance (when we saw it live) — it is NOT a provider-declared campaign start and
 * MUST NOT be treated as one. The provider-published `endDateInclusive` remains authoritative; no
 * earlier start date is invented. M2 conservative temporal evaluation is permitted only within
 * `[observedActiveAt, endDateInclusive]` (Lima) unless stronger start evidence later exists.
 */
export interface LocalObservedActiveUntil {
  kind: 'OBSERVED_ACTIVE_UNTIL';
  observedActiveAt: string; // YYYY-MM-DD, Lima calendar — provenance, NOT a claimed campaign start
  endDateInclusive: string; // inclusive, provider-published authoritative end
}
export type TemporalRange = LocalDateRange | LocalDateTimeRange | LocalObservedActiveUntil;

export interface Constraints {
  temporal: TemporalRange;
  weekdays?: Weekday[];
  timeWindow?: { from: string; to: string };
  holidayPolicy: HolidayPolicy;
  specificBlackoutDates?: string[];
  minimumSpend?: SpendThreshold;
  cap?: Cap;
  channels?: Channel[];
  locations?: { include?: string[]; exclude?: string[] };
  products?: { includeSku?: string[]; excludeSku?: string[] };
  useLimit?: { per: 'DAY' | 'ORDER' | 'MONTH' | 'CAMPAIGN'; count: number };
  stock?: { known: boolean; remaining?: number };
  cardNetwork?: 'AMEX' | 'VISA' | 'MC' | 'ANY';
  cardTier?: string;
  membership?: string;
  providerPrivateKey?: string;
  /**
   * Rule-semantic (RT-01): whether the participant can verify dynamic availability (stock/fund/
   * code) BEFORE payment. Part of the promotion, NOT a caller override. Absent ⇒ false; the engine
   * never infers true. No active Corpus-v1 rule sets this (no frozen pre-verification evidence).
   */
  preRedemptionVerifiable?: boolean;
  combinability: 'NO' | 'UNKNOWN' | 'YES';
}

// ---- Comparison scope / purchase signature (RT-04) ----
export interface CanonicalItemQty {
  itemKey: string;
  qty: number; // positive integer
}
export type PurchaseSignature =
  | { kind: 'EXACT_BUNDLE'; merchantId: MerchantId; canonicalItems: CanonicalItemQty[] }
  | { kind: 'ELIGIBLE_BILL'; merchantId: MerchantId; purchaseDomain: PurchaseDomain }
  | { kind: 'TICKETS'; merchantId: MerchantId; ticketCount: number; ticketClass: string }
  | {
      kind: 'NOMINAL_PACKAGE';
      merchantId: MerchantId;
      cashAcquisitionCostCentimos: Centimos;
      nominalUnit: NominalUnit;
    };

export interface ComparisonScope {
  scopeId: string;
  merchantId: MerchantId;
  comparisonBasis: ComparisonBasis;
  equivalenceGroup: string;
  purchaseKind: string;
  requiredContext: ContextReq[];
  allowedSelectors: EligibleSpendSelector[];
  signature: PurchaseSignature;
}

// ---- Rule (immutable semantics) ----
export interface Provenance {
  sourceId: string;
  url: string;
  observedAt: string;
}
export interface RuleVersion {
  ruleId: string;
  version: number;
  campaignId: string;
  /** Usually one merchant; the Coney Sip campaign spans two (QA-06). */
  merchantIds: MerchantId[];
  providerFamily: ProviderFamily;
  benefit: Benefit;
  eligibleSpendSelector: EligibleSpendSelector;
  /** Item composition for EXACT_BUNDLE-kind rules (RT-04 structural check). */
  canonicalItems?: CanonicalItemQty[];
  /** Ticket structure for TICKETS-kind rules. */
  ticketContext?: { ticketCount: number; ticketClass: string };
  constraints: Constraints;
  eligibilityClass: EligibilityClass;
  confidence: Confidence;
  /** Scope keys this rule participates in; usually one, Coney Sip two. */
  comparisonScopeRefs: string[];
  signatureKind: PurchaseSignatureKind; // authored, but MUST equal deriveRequiredSignatureKind(rule)
  provenance: Provenance;
}

// ---- Operational state (separate axes; not part of RuleVersion) ----
export interface RuleOperationalState {
  ruleId: string;
  version: number;
  publicationState: PublicationState;
  sourceQualityState: SourceQualityState;
  availability: AvailabilityState;
  asOf: string;
  note?: string;
}

// ---- Registries & research metadata ----
export interface Merchant {
  merchantId: MerchantId;
  displayName: string;
  category: 'FOOD' | 'ENTERTAINMENT';
  aliases?: string[];
}
export interface Source {
  sourceId: string;
  providerFamily: ProviderFamily;
  url: string;
  label: string;
}
export interface MerchantResearchMeta {
  merchantId: MerchantId;
  overlapClass: OverlapClass;
  decisionClass: DecisionClass;
  verifyFirstOverlay: boolean;
}

export interface ExcludedRule {
  rule: RuleVersion;
  operational: RuleOperationalState;
  reason: string;
}

export interface Corpus {
  corpusId: string;
  freezeTimestamp: string;
  merchants: Merchant[];
  sources: Source[];
  scopes: ComparisonScope[];
  activeRules: RuleVersion[];
  operationalStates: RuleOperationalState[];
  researchMeta: MerchantResearchMeta[];
  /** History only (e.g. stale Cineplanet Sip). MUST NOT count toward the 46 active rules. */
  excludedRules: ExcludedRule[];
}

// PagaMenos · engine/golden — TEST-ONLY synthetic domain builders for the M3 property and
// adversarial suites. These construct valid in-memory RuleVersion / ComparisonScope /
// RuleOperationalState objects OUTSIDE Corpus v1 (they never enter CORPUS_V1, never affect
// reconciliation, and are never exported as production corpus, §25). Pure: types only, no I/O.
import type {
  Benefit,
  Cap,
  ComparisonScope,
  Confidence,
  ContextReq,
  EligibilityClass,
  EligibleSpendSelector,
  MerchantId,
  NominalUnit,
  ProviderFamily,
  PurchaseSignatureKind,
  RuleOperationalState,
  RuleVersion,
  TemporalRange,
} from '@/corpus';

const ALWAYS: TemporalRange = {
  kind: 'LOCAL_DATE_RANGE',
  startDateInclusive: '2026-01-01',
  endDateInclusive: '2026-12-31',
};

export const SYN_MERCHANT: MerchantId = 'm_fridays';

export interface SynRuleOpts {
  merchantIds?: MerchantId[];
  scopeRefs?: string[];
  selector?: EligibleSpendSelector;
  signatureKind?: PurchaseSignatureKind;
  eligibilityClass?: EligibilityClass;
  confidence?: Confidence;
  cap?: Cap;
  cardNetwork?: 'AMEX' | 'VISA' | 'MC' | 'ANY';
  membership?: string;
  providerPrivateKey?: string;
  combinability?: 'NO' | 'UNKNOWN' | 'YES';
  minimumSpend?: { minimumSpendCentimos: number; basis: EligibleSpendSelector };
}

function build(
  ruleId: string,
  family: ProviderFamily,
  benefit: Benefit,
  o: SynRuleOpts,
): RuleVersion {
  const selector = o.selector ?? 'EXACT_SKU_BUNDLE';
  const rule: RuleVersion = {
    ruleId,
    version: 1,
    campaignId: `cmp_${ruleId}`,
    merchantIds: o.merchantIds ?? [SYN_MERCHANT],
    providerFamily: family,
    benefit,
    eligibleSpendSelector: selector,
    canonicalItems: [{ itemKey: 'syn_item', qty: 1 }],
    constraints: {
      temporal: ALWAYS,
      holidayPolicy: 'NONE',
      combinability: o.combinability ?? 'NO',
      ...(o.cap ? { cap: o.cap } : {}),
      ...(o.cardNetwork ? { cardNetwork: o.cardNetwork } : {}),
      ...(o.membership ? { membership: o.membership } : {}),
      ...(o.providerPrivateKey ? { providerPrivateKey: o.providerPrivateKey } : {}),
      ...(o.minimumSpend ? { minimumSpend: o.minimumSpend } : {}),
    },
    eligibilityClass: o.eligibilityClass ?? 'DETERMINISTIC_PUBLIC',
    confidence: o.confidence ?? 'HIGH',
    comparisonScopeRefs: o.scopeRefs ?? ['syn_cost'],
    signatureKind: o.signatureKind ?? 'EXACT_BUNDLE',
    provenance: { sourceId: 'syn', url: 'test-only', observedAt: '2026-08-30' },
  };
  return rule;
}

/** A synthetic fixed-price cost rule (EXACT_SKU_BUNDLE by default). */
export function fixedRule(
  ruleId: string,
  family: ProviderFamily,
  priceCentimos: number,
  o: SynRuleOpts = {},
): RuleVersion {
  return build(ruleId, family, { type: 'FIXED_PRICE', fixedPriceCentimos: priceCentimos }, o);
}

/** A synthetic percentage cost rule over the whole bill (default), with optional cap. */
export function percentRule(
  ruleId: string,
  family: ProviderFamily,
  bps: number,
  o: SynRuleOpts = {},
): RuleVersion {
  return build(
    ruleId,
    family,
    { type: 'PERCENT', percentBps: bps, rounding: 'FLOOR_TO_CENT' },
    {
      selector: 'WHOLE_BILL',
      signatureKind: 'ELIGIBLE_BILL',
      ...o,
    },
  );
}

/** A synthetic cashback cost rule (immediate cost = full bill). */
export function cashbackRule(
  ruleId: string,
  family: ProviderFamily,
  valueCentimos: number,
  o: SynRuleOpts = {},
): RuleVersion {
  return build(
    ruleId,
    family,
    { type: 'CASHBACK', valueCentimos, settlementDelay: '30d' },
    { selector: 'WHOLE_BILL', signatureKind: 'ELIGIBLE_BILL', ...o },
  );
}

/** A synthetic non-cash nominal rule (NOMINAL_VALUE_SAME_UNIT). */
export function nominalRule(
  ruleId: string,
  family: ProviderFamily,
  minorUnits: number,
  cashAcquisitionCostCentimos: number | undefined,
  o: SynRuleOpts = {},
  unit: NominalUnit = 'CONEY_PLAY_BALANCE',
): RuleVersion {
  return build(
    ruleId,
    family,
    {
      type: 'NON_CASH_NOMINAL',
      nominalMinorUnits: minorUnits,
      nominalUnit: unit,
      ...(cashAcquisitionCostCentimos !== undefined ? { cashAcquisitionCostCentimos } : {}),
    },
    {
      selector: 'EXACT_SKU_BUNDLE',
      signatureKind: 'NOMINAL_PACKAGE',
      scopeRefs: ['syn_nom'],
      ...o,
    },
  );
}

/** A synthetic EFFECTIVE_OUT_OF_POCKET_COST exact-bundle scope. */
export function costScope(
  scopeId = 'syn_cost',
  merchantId: MerchantId = SYN_MERCHANT,
  requiredContext: ContextReq[] = ['BASKET', 'DATE_TIME'],
  allowedSelectors: EligibleSpendSelector[] = ['EXACT_SKU_BUNDLE'],
): ComparisonScope {
  return {
    scopeId,
    merchantId,
    comparisonBasis: 'EFFECTIVE_OUT_OF_POCKET_COST',
    equivalenceGroup: `${scopeId}_grp`,
    purchaseKind: scopeId.toUpperCase(),
    requiredContext,
    allowedSelectors,
    signature: {
      kind: 'EXACT_BUNDLE',
      merchantId,
      canonicalItems: [{ itemKey: 'syn_item', qty: 1 }],
    },
  };
}

/** A synthetic ELIGIBLE_BILL scope (composition is not the promotion identity; matches by merchant). */
export function billScope(
  scopeId = 'syn_bill',
  merchantId: MerchantId = SYN_MERCHANT,
  allowedSelectors: EligibleSpendSelector[] = ['WHOLE_BILL'],
): ComparisonScope {
  return {
    scopeId,
    merchantId,
    comparisonBasis: 'EFFECTIVE_OUT_OF_POCKET_COST',
    equivalenceGroup: `${scopeId}_grp`,
    purchaseKind: scopeId.toUpperCase(),
    requiredContext: ['AMOUNT', 'DATE_TIME'],
    allowedSelectors,
    signature: { kind: 'ELIGIBLE_BILL', merchantId, purchaseDomain: 'RESTAURANT_BILL' },
  };
}

/** A synthetic NOMINAL_VALUE_SAME_UNIT package scope. */
export function nominalScope(
  scopeId = 'syn_nom',
  merchantId: MerchantId = 'm_coney_park',
  cashAcquisitionCostCentimos = 4500,
  unit: NominalUnit = 'CONEY_PLAY_BALANCE',
): ComparisonScope {
  return {
    scopeId,
    merchantId,
    comparisonBasis: 'NOMINAL_VALUE_SAME_UNIT',
    equivalenceGroup: `${scopeId}_grp`,
    purchaseKind: scopeId.toUpperCase(),
    requiredContext: ['DATE_TIME'],
    allowedSelectors: ['EXACT_SKU_BUNDLE'],
    signature: {
      kind: 'NOMINAL_PACKAGE',
      merchantId,
      cashAcquisitionCostCentimos,
      nominalUnit: unit,
    },
  };
}

/** A synthetic operational snapshot (ACTIVE · FRESH · CONFIRMED_AVAILABLE by default). */
export function synOp(
  ruleId: string,
  over: Partial<RuleOperationalState> = {},
): RuleOperationalState {
  return {
    ruleId,
    version: 1,
    publicationState: 'ACTIVE',
    sourceQualityState: 'FRESH',
    availability: 'CONFIRMED_AVAILABLE',
    asOf: '2026-09-01T00:00:00-05:00',
    ...over,
  };
}

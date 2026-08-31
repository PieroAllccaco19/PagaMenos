// PagaMenos · engine — the pure deterministic decision evaluator (§4/§5/§9).
// Side-effect-free. Order-invariant (candidates are sorted by ruleId before ranking). Fail-closed:
// impossible domain combinations throw typed invariant errors rather than defaulting to a winner.
import {
  canonicalItemsEqual,
  deriveRequiredContext,
  expectedBasis,
  parseStrictInstantMs,
} from '@/corpus';
import type {
  Centimos,
  ComparisonScope,
  ContextReq,
  NominalUnit,
  PurchaseSignature,
  RuleOperationalState,
  RuleVersion,
} from '@/corpus';

import {
  confidenceRankable,
  evaluateEligibility,
  resolveAvailability,
  resolvePublication,
  resolveSourceQuality,
} from './eligibility';
import {
  CanonicalInputError,
  ComparisonBasisMismatchError,
  CrossMerchantMembershipError,
  SettlementInvariantError,
  TemporalInputError,
} from './errors';
import {
  applyKnownCap,
  assertSafeCentimos,
  cashbackCentimos as cashbackOf,
  fixedPriceTicketCostCentimos,
  minimumSpendMet,
  percentDiscountCentimos,
  twoForOneCostCentimos,
} from './money';
import { evaluateHoliday, withinTemporalRange, withinTimeWindow, withinWeekdays } from './time';
import type {
  BoundProof,
  CandidateAdvisory,
  DecideInput,
  DecisionCandidate,
  EngineDecisionResult,
  EngineEvaluation,
  PlausibleBound,
  PurchaseContext,
  RankDelta,
  RuleRef,
  ScopeDecisionResult,
} from './types';

// ---- Runtime PurchaseSignature matcher (RTM3-01) ----
// A boolean cannot prove WHICH bundle/ticket a participant is buying. The scope's frozen
// PurchaseSignature is matched against the ACTUAL runtime purchase before any rule may rank.
type SignatureMatch =
  | { kind: 'MATCH' }
  | { kind: 'MISSING'; missing: ContextReq[] }
  | { kind: 'NO_MATCH'; reason: string };

function matchPurchaseSignature(
  signature: PurchaseSignature,
  ctx: PurchaseContext,
): SignatureMatch {
  switch (signature.kind) {
    case 'EXACT_BUNDLE': {
      if (ctx.exactItems === undefined) return { kind: 'MISSING', missing: ['BASKET'] };
      // Same normalization as M1 (stable key, positive-int qty, no duplicates, exact (key,qty)
      // equality); malformed runtime items throw (fail-closed) rather than matching loosely.
      return canonicalItemsEqual(ctx.exactItems, signature.canonicalItems)
        ? { kind: 'MATCH' }
        : { kind: 'NO_MATCH', reason: 'purchase items do not match the exact-bundle signature' };
    }
    case 'TICKETS': {
      if (ctx.ticketCount === undefined || ctx.ticketClass === undefined) {
        return { kind: 'MISSING', missing: ['TICKET_PRICE'] };
      }
      if (ctx.ticketCount !== signature.ticketCount) {
        return {
          kind: 'NO_MATCH',
          reason: `ticket count ${ctx.ticketCount} ≠ signature ${signature.ticketCount}`,
        };
      }
      if (ctx.ticketClass !== signature.ticketClass) {
        return {
          kind: 'NO_MATCH',
          reason: `ticket class ${ctx.ticketClass} ≠ signature ${signature.ticketClass}`,
        };
      }
      return { kind: 'MATCH' };
    }
    case 'ELIGIBLE_BILL': {
      // RTM3-01 (2nd closure): merchant is NOT sufficient — the runtime purchaseDomain must equal the
      // scope's frozen domain (e.g. UVK candy-bar vs UVK opera must not be interchangeable).
      if (signature.merchantId !== ctx.merchantId) {
        return { kind: 'NO_MATCH', reason: 'merchant mismatch' };
      }
      if (ctx.purchaseDomain === undefined) return { kind: 'MISSING', missing: ['AMOUNT'] };
      return ctx.purchaseDomain === signature.purchaseDomain
        ? { kind: 'MATCH' }
        : {
            kind: 'NO_MATCH',
            reason: `purchase domain ${ctx.purchaseDomain} ≠ signature ${signature.purchaseDomain}`,
          };
    }
    case 'NOMINAL_PACKAGE': {
      // RTM3-01 (2nd closure): structured nominal-package proof (cash acquisition cost + unit) must
      // match the frozen signature — merchant alone cannot distinguish a nominal package.
      if (signature.merchantId !== ctx.merchantId) {
        return { kind: 'NO_MATCH', reason: 'merchant mismatch' };
      }
      if (ctx.nominalPackage === undefined) return { kind: 'MISSING', missing: ['BASKET'] };
      if (
        ctx.nominalPackage.cashAcquisitionCostCentimos !== signature.cashAcquisitionCostCentimos
      ) {
        return {
          kind: 'NO_MATCH',
          reason: `nominal acquisition cost ${ctx.nominalPackage.cashAcquisitionCostCentimos} ≠ signature ${signature.cashAcquisitionCostCentimos}`,
        };
      }
      if (ctx.nominalPackage.nominalUnit !== signature.nominalUnit) {
        return {
          kind: 'NO_MATCH',
          reason: `nominal unit ${ctx.nominalPackage.nominalUnit} ≠ signature ${signature.nominalUnit}`,
        };
      }
      return { kind: 'MATCH' };
    }
    default: {
      const _e: never = signature;
      throw new SettlementInvariantError(`unhandled PurchaseSignature: ${JSON.stringify(_e)}`);
    }
  }
}

// ---- Money / identity / instant input validation (RTM3-04/05/06/11) ----
function validateContextMoney(ctx: PurchaseContext): void {
  for (const [v, label] of [
    [ctx.wholeBillCentimos, 'wholeBillCentimos'],
    [ctx.foodCentimos, 'foodCentimos'],
    [ctx.nonAlcoholicBeverageCentimos, 'nonAlcoholicBeverageCentimos'],
    [ctx.ticketUnitPriceCentimos, 'ticketUnitPriceCentimos'],
  ] as const) {
    if (v !== undefined) assertSafeCentimos(v, label);
  }
  if (
    ctx.ticketCount !== undefined &&
    (!Number.isSafeInteger(ctx.ticketCount) || ctx.ticketCount <= 0)
  ) {
    throw new SettlementInvariantError(
      `ticketCount must be a positive safe integer: ${ctx.ticketCount}`,
    );
  }
  // Runtime nominal-package proof: the acquisition cost must be a safe non-negative integer (RTM3-11).
  if (ctx.nominalPackage !== undefined) {
    assertSafeCentimos(
      ctx.nominalPackage.cashAcquisitionCostCentimos,
      'nominalPackage.cashAcquisitionCostCentimos',
    );
  }
  // Subtotal consistency (RTM3-11): food/beverage are disjoint subtotals of the same payable bill.
  const wb = ctx.wholeBillCentimos;
  const fd = ctx.foodCentimos;
  const nb = ctx.nonAlcoholicBeverageCentimos;
  if (wb !== undefined) {
    if (fd !== undefined && fd > wb) {
      throw new SettlementInvariantError(`foodCentimos ${fd} exceeds wholeBillCentimos ${wb}`);
    }
    if (nb !== undefined && nb > wb) {
      throw new SettlementInvariantError(
        `nonAlcoholicBeverageCentimos ${nb} exceeds wholeBillCentimos ${wb}`,
      );
    }
    if (fd !== undefined && nb !== undefined && fd + nb > wb) {
      throw new SettlementInvariantError(
        `foodCentimos + nonAlcoholicBeverageCentimos (${fd + nb}) exceeds wholeBillCentimos ${wb}`,
      );
    }
  }
}

function assertStrictInstant(iso: string, label: string): void {
  if (parseStrictInstantMs(iso) === null) {
    throw new TemporalInputError(
      `${label} must be a zone-qualified ISO-8601 instant (Z or ±HH:MM): ${iso}`,
    );
  }
}

/** RTM3-05: reject duplicate rule/scope identities and 0/>1/orphan operational states. */
function buildValidatedOpMap(input: DecideInput): Map<string, RuleOperationalState> {
  const ruleKeys = new Set<string>();
  for (const r of input.rules) {
    const key = `${r.ruleId}@${r.version}`;
    if (ruleKeys.has(key)) {
      throw new CanonicalInputError(`duplicate rule identity in decision input: ${key}`);
    }
    ruleKeys.add(key);
  }
  const scopeIds = new Set<string>();
  for (const s of input.scopes) {
    if (scopeIds.has(s.scopeId)) {
      throw new CanonicalInputError(`duplicate scopeId in decision input: ${s.scopeId}`);
    }
    scopeIds.add(s.scopeId);
  }
  const opMap = new Map<string, RuleOperationalState>();
  for (const op of input.operationalStates) {
    const key = `${op.ruleId}@${op.version}`;
    if (opMap.has(key)) {
      throw new CanonicalInputError(`duplicate operational state for ${key} (no last-write-wins)`);
    }
    if (!ruleKeys.has(key)) {
      throw new CanonicalInputError(`operational state references no supplied rule: ${key}`);
    }
    opMap.set(key, op);
  }
  return opMap;
}

// ---- Selector quantities (§16) ----
function selectorQuantity(
  selector: RuleVersion['eligibleSpendSelector'],
  ctx: PurchaseContext,
): number | undefined {
  switch (selector) {
    case 'WHOLE_BILL':
      return ctx.wholeBillCentimos;
    case 'FOOD_ONLY':
      return ctx.foodCentimos;
    case 'FOOD_PLUS_NONALCOHOLIC':
      return ctx.foodCentimos !== undefined && ctx.nonAlcoholicBeverageCentimos !== undefined
        ? ctx.foodCentimos + ctx.nonAlcoholicBeverageCentimos
        : undefined;
    case 'TICKET_UNIT':
      return ctx.ticketUnitPriceCentimos !== undefined && ctx.ticketCount !== undefined
        ? ctx.ticketUnitPriceCentimos * ctx.ticketCount
        : undefined;
    case 'EXACT_SKU_BUNDLE':
      return ctx.wholeBillCentimos; // exact-bundle percentage would apply to the bundle price
    case 'NON_EQUIVALENT_PURCHASE':
      return undefined;
    default: {
      const _e: never = selector;
      throw new SettlementInvariantError(`unhandled selector: ${String(_e)}`);
    }
  }
}

// ---- Economics outcome (per candidate, pre-scope-comparison) ----
type Econ =
  | { state: 'REJECTED'; reason: string }
  | { state: 'MISSING_CONTEXT'; missing: ContextReq[] }
  | { state: 'NON_EQUIVALENT' }
  | { state: 'UNKNOWN_CAP'; optimisticCostCentimos: Centimos }
  | {
      state: 'RANKABLE_COST';
      effectiveCostCentimos: Centimos;
      optimisticCostCentimos: Centimos;
      roundingAmbiguous: boolean;
      cashbackCentimos: Centimos;
    }
  | {
      state: 'RANKABLE_NOMINAL';
      minorUnits: number;
      unit: NominalUnit;
      /** Undefined ⇒ explicit UNKNOWN acquisition cost (RT-06 prerequisite unprovable). */
      cashAcquisitionCostCentimos: Centimos | undefined;
    };

function missingContextFor(rule: RuleVersion, ctx: PurchaseContext): ContextReq[] {
  const required = deriveRequiredContext(rule);
  const missing: ContextReq[] = [];
  const c = rule.constraints;
  for (const req of required) {
    switch (req) {
      case 'AMOUNT':
        if (
          selectorQuantity(rule.eligibleSpendSelector, ctx) === undefined &&
          ctx.wholeBillCentimos === undefined
        ) {
          missing.push('AMOUNT');
        }
        break;
      case 'BASKET':
        // EXACT_SKU_BUNDLE identity is proven by the scope PurchaseSignature matcher (RTM3-01), so
        // no per-rule BASKET check is needed here. General-bill selectors still need their subtotal.
        if (rule.eligibleSpendSelector === 'EXACT_SKU_BUNDLE') {
          // handled by matchPurchaseSignature
        } else if (selectorQuantity(rule.eligibleSpendSelector, ctx) === undefined) {
          missing.push('BASKET');
        }
        break;
      case 'TICKET_PRICE':
        if (ctx.ticketUnitPriceCentimos === undefined || ctx.ticketCount === undefined)
          missing.push('TICKET_PRICE');
        break;
      case 'CHANNEL':
        if (c.channels && c.channels.length > 0 && ctx.channel === undefined)
          missing.push('CHANNEL');
        break;
      case 'LOCATION_OR_BRANCH':
        if (
          c.locations &&
          (c.locations.include?.length || c.locations.exclude?.length) &&
          ctx.branch === undefined
        ) {
          missing.push('LOCATION_OR_BRANCH');
        }
        break;
      case 'DATE_TIME':
        break; // intendedTransactionAt is always supplied
      default: {
        const _e: never = req;
        throw new SettlementInvariantError(`unhandled ContextReq: ${String(_e)}`);
      }
    }
  }
  return missing;
}

/** Clean context mismatch (provided but excludes the rule) — a definite rejection, not uncertainty. */
function contextMismatch(rule: RuleVersion, ctx: PurchaseContext): string | undefined {
  const c = rule.constraints;
  if (
    c.channels &&
    c.channels.length > 0 &&
    ctx.channel !== undefined &&
    !c.channels.includes(ctx.channel)
  ) {
    return `channel ${ctx.channel} not allowed`;
  }
  if (c.locations && ctx.branch !== undefined) {
    if (
      c.locations.include &&
      c.locations.include.length > 0 &&
      !c.locations.include.includes(ctx.branch)
    ) {
      return `branch ${ctx.branch} not in include list`;
    }
    if (c.locations.exclude?.includes(ctx.branch)) return `branch ${ctx.branch} excluded`;
  }
  return undefined;
}

function computeEconomics(rule: RuleVersion, ctx: PurchaseContext): Econ {
  if (rule.eligibleSpendSelector === 'NON_EQUIVALENT_PURCHASE') return { state: 'NON_EQUIVALENT' };

  const mismatch = contextMismatch(rule, ctx);
  if (mismatch) return { state: 'REJECTED', reason: mismatch };

  const missing = missingContextFor(rule, ctx);
  if (missing.length > 0) return { state: 'MISSING_CONTEXT', missing };

  const c = rule.constraints;
  const b = rule.benefit;

  // Minimum-spend threshold (RT-02) against the declared basis quantity.
  if (c.minimumSpend) {
    const q = selectorQuantity(c.minimumSpend.basis, ctx);
    if (q === undefined) return { state: 'MISSING_CONTEXT', missing: ['AMOUNT'] };
    if (!minimumSpendMet(c, q)) return { state: 'REJECTED', reason: 'minimum spend not met' };
  }

  switch (b.type) {
    case 'NON_CASH_NOMINAL':
      return {
        state: 'RANKABLE_NOMINAL',
        minorUnits: b.nominalMinorUnits,
        unit: b.nominalUnit,
        cashAcquisitionCostCentimos: b.cashAcquisitionCostCentimos,
      };
    case 'PERCENT': {
      const eligible = selectorQuantity(rule.eligibleSpendSelector, ctx);
      const base = ctx.wholeBillCentimos;
      if (eligible === undefined || base === undefined)
        return { state: 'MISSING_CONTEXT', missing: ['AMOUNT'] };
      const band = percentDiscountCentimos(eligible, b.percentBps, b.rounding);
      if (c.cap && c.cap.kind === 'UNKNOWN_NOT_STATED') {
        // Unknown cap ⇒ non-rankable; optimistic (uncapped) cost is the lowest plausible cost.
        return { state: 'UNKNOWN_CAP', optimisticCostCentimos: base - band.upper };
      }
      const capC = c.cap && c.cap.kind === 'AMOUNT' ? c.cap.centimos : undefined;
      const discount = capC !== undefined ? applyKnownCap(band.value, capC) : band.value;
      const optimisticDiscount = capC !== undefined ? applyKnownCap(band.upper, capC) : band.upper;
      return {
        state: 'RANKABLE_COST',
        effectiveCostCentimos: base - discount,
        optimisticCostCentimos: base - optimisticDiscount,
        roundingAmbiguous: band.ambiguous,
        cashbackCentimos: 0,
      };
    }
    case 'FIXED_DISCOUNT': {
      const base = ctx.wholeBillCentimos;
      if (base === undefined) return { state: 'MISSING_CONTEXT', missing: ['AMOUNT'] };
      const discount =
        c.cap && c.cap.kind === 'AMOUNT'
          ? applyKnownCap(b.fixedDiscountCentimos, c.cap.centimos)
          : b.fixedDiscountCentimos;
      const cost = base - discount;
      // A fixed discount larger than the bill would imply a negative payable — fail closed (RTM3-04),
      // never clamp silently to zero.
      if (cost < 0) {
        throw new SettlementInvariantError(
          `fixed discount ${discount} exceeds bill ${base} ⇒ negative effective cost`,
        );
      }
      return {
        state: 'RANKABLE_COST',
        effectiveCostCentimos: cost,
        optimisticCostCentimos: cost,
        roundingAmbiguous: false,
        cashbackCentimos: 0,
      };
    }
    case 'FIXED_PRICE': {
      // A FIXED_PRICE over a TICKET_UNIT scope is a per-ticket price: total = price × ticketCount
      // (e.g. UVK Diners S/9.90/ticket × 2 = S/19.80). An exact-bundle FIXED_PRICE is the flat
      // bundle price. (M3 FIX05 exposed that the flat-price path ignored the ticket count.)
      if (rule.eligibleSpendSelector === 'TICKET_UNIT') {
        if (ctx.ticketCount === undefined) {
          return { state: 'MISSING_CONTEXT', missing: ['TICKET_PRICE'] };
        }
        const cost = fixedPriceTicketCostCentimos(b.fixedPriceCentimos, ctx.ticketCount);
        return {
          state: 'RANKABLE_COST',
          effectiveCostCentimos: cost,
          optimisticCostCentimos: cost,
          roundingAmbiguous: false,
          cashbackCentimos: 0,
        };
      }
      return {
        state: 'RANKABLE_COST',
        effectiveCostCentimos: b.fixedPriceCentimos,
        optimisticCostCentimos: b.fixedPriceCentimos,
        roundingAmbiguous: false,
        cashbackCentimos: 0,
      };
    }
    case 'FIXED_BUNDLE':
      return {
        state: 'RANKABLE_COST',
        effectiveCostCentimos: b.bundlePriceCentimos,
        optimisticCostCentimos: b.bundlePriceCentimos,
        roundingAmbiguous: false,
        cashbackCentimos: 0,
      };
    case 'TWO_FOR_ONE': {
      if (ctx.ticketUnitPriceCentimos === undefined || ctx.ticketCount === undefined) {
        return { state: 'MISSING_CONTEXT', missing: ['TICKET_PRICE'] };
      }
      const cost = twoForOneCostCentimos(ctx.ticketUnitPriceCentimos, ctx.ticketCount, b.pay, b.of);
      return {
        state: 'RANKABLE_COST',
        effectiveCostCentimos: cost,
        optimisticCostCentimos: cost,
        roundingAmbiguous: false,
        cashbackCentimos: 0,
      };
    }
    case 'CASHBACK': {
      // Cashback NEVER reduces immediate payable cost (§14): effectiveCost = full base.
      const base = ctx.wholeBillCentimos;
      if (base === undefined) return { state: 'MISSING_CONTEXT', missing: ['AMOUNT'] };
      return {
        state: 'RANKABLE_COST',
        effectiveCostCentimos: base,
        optimisticCostCentimos: base,
        roundingAmbiguous: false,
        cashbackCentimos: cashbackOf(b),
      };
    }
    default: {
      const _e: never = b;
      throw new SettlementInvariantError(`unhandled benefit: ${JSON.stringify(_e)}`);
    }
  }
}

// ---- Internal per-candidate working record ----
interface Working {
  rule: RuleVersion;
  ref: RuleRef;
  advisories: CandidateAdvisory[];
  // classification
  bucket: 'RANKABLE_COST' | 'RANKABLE_NOMINAL' | 'UNCERTAIN' | 'REJECTED';
  effectiveCostCentimos?: Centimos;
  optimisticCostCentimos?: Centimos;
  roundingAmbiguous?: boolean;
  cashbackCentimos?: Centimos;
  nominalMinorUnits?: number;
  nominalUnit?: NominalUnit;
  cashAcquisitionCostCentimos?: Centimos | undefined;
  // uncertainty metadata
  providerPrivate?: boolean;
  availabilityUncertain?: boolean;
  preRedemptionVerifiable?: boolean;
  unknownCap?: boolean;
  unknownCombinability?: boolean;
  missingContext?: ContextReq[];
  sourceUncertainty?: 'STALE' | 'CONFLICTED' | 'UNKNOWN' | undefined;
  holidayUncertain?: boolean;
  eligibility: 'ELIGIBLE' | 'INELIGIBLE' | 'UNKNOWN';
  sourceFresh: boolean;
  provenanceRef: string;
  rejectionReason?: string | undefined;
  // Materiality scratch (populated during resolveDecision).
  __bound?: PlausibleBound;
  /** Optimistic bound could STRICTLY improve the best outcome (beat the best value). */
  __improve?: boolean;
  /** Optimistic bound could enter the top set (equal-or-beat the best value) = couldChangeDecision. */
  __changeTopSet?: boolean;
}

function syntheticProof(
  kind: BoundProof['kind'],
  ruleId: string,
  provenanceRef: string,
  derivation: string,
): BoundProof {
  // Deterministic, evidence-bearing proof synthesized ONLY from the rule's own current (FRESH)
  // constraint — never from a stale/inaccessible last-known value (RT-05).
  return {
    kind,
    proofRef: `rule:${ruleId}`,
    sourceCheckId: provenanceRef,
    reviewedBy: 'engine:deterministic',
    reviewedAt: provenanceRef,
    derivation,
  };
}

function boundFor(w: Working, basis: ComparisonScope['comparisonBasis']): PlausibleBound {
  // RT-05 core: a non-FRESH last-known value can NEVER establish a conservative current bound.
  if (!w.sourceFresh) {
    return {
      kind: 'UNKNOWN_OR_UNBOUNDED',
      reason: 'source not FRESH; last-known value cannot bound current value',
    };
  }
  if (w.missingContext && w.missingContext.length > 0) {
    return {
      kind: 'UNKNOWN_OR_UNBOUNDED',
      reason: `missing required context: ${w.missingContext.join(',')}`,
    };
  }
  if (w.unknownCombinability) {
    return {
      kind: 'UNKNOWN_OR_UNBOUNDED',
      reason: 'combinability UNKNOWN; potential stacked upside unbounded',
    };
  }
  if (w.providerPrivate) {
    return {
      kind: 'UNKNOWN_OR_UNBOUNDED',
      reason: 'provider-private benefit value not computable',
    };
  }
  if (w.holidayUncertain) {
    return { kind: 'UNKNOWN_OR_UNBOUNDED', reason: 'holiday policy UNKNOWN on a holiday date' };
  }
  if (basis === 'EFFECTIVE_OUT_OF_POCKET_COST') {
    if (w.unknownCap && w.optimisticCostCentimos !== undefined) {
      return {
        basis,
        kind: 'KNOWN_BOUND',
        minPlausibleCostCentimos: w.optimisticCostCentimos,
        proof: syntheticProof(
          'CURRENT_UNCAPPED_FUNCTION_BOUND',
          w.ref.ruleId,
          w.provenanceRef,
          'uncapped percentage function ≥ true saving ⇒ uncapped cost ≤ true cost',
        ),
      };
    }
    if (w.availabilityUncertain && w.effectiveCostCentimos !== undefined) {
      return {
        basis,
        kind: 'KNOWN_BOUND',
        minPlausibleCostCentimos: w.effectiveCostCentimos,
        proof: syntheticProof(
          'CURRENT_EXPLICIT_LIMIT',
          w.ref.ruleId,
          w.provenanceRef,
          'price is current (FRESH); only stock availability is uncertain',
        ),
      };
    }
  }
  if (basis === 'NOMINAL_VALUE_SAME_UNIT') {
    if (
      w.availabilityUncertain &&
      w.nominalMinorUnits !== undefined &&
      w.nominalUnit !== undefined
    ) {
      return {
        basis,
        kind: 'KNOWN_BOUND',
        maxPlausibleValueMinorUnits: w.nominalMinorUnits,
        unit: w.nominalUnit,
        proof: syntheticProof(
          'CURRENT_EXPLICIT_LIMIT',
          w.ref.ruleId,
          w.provenanceRef,
          'nominal value is current (FRESH); only availability uncertain',
        ),
      };
    }
  }
  return { kind: 'UNKNOWN_OR_UNBOUNDED', reason: 'no current-evidence bound available' };
}

// RTM3-03/§8: two independent questions.
//   couldImproveBestOutcome — the optimistic bound STRICTLY beats the best value (cost <, nominal >).
//   couldChangeTopSet       — the optimistic bound can equal-or-beat the best value (could join top).
// Equality is ALWAYS material to the top set (couldChangeDecision = couldChangeTopSet), regardless of
// whether the current confirmed top set has one candidate or many. The STATUS resolution (not the
// materiality flag) decides whether an equal-only candidate forces NO_SAFE_WINNER (a unique winner
// could become a tie ⇒ unsafe) or is tolerated (an existing tie merely widens ⇒ CONFIRMED_TIE with
// an incomplete top set).
interface BoundMateriality {
  improve: boolean;
  changeTopSet: boolean;
}
function boundMateriality(
  bound: PlausibleBound,
  basis: ComparisonScope['comparisonBasis'],
  winnerCost: Centimos | undefined,
  winnerNominal: number | undefined,
): BoundMateriality {
  if (bound.kind === 'UNKNOWN_OR_UNBOUNDED') return { improve: true, changeTopSet: true };
  if (
    basis === 'EFFECTIVE_OUT_OF_POCKET_COST' &&
    bound.kind === 'KNOWN_BOUND' &&
    'minPlausibleCostCentimos' in bound
  ) {
    if (winnerCost === undefined) return { improve: true, changeTopSet: true };
    const b = bound.minPlausibleCostCentimos;
    return { improve: b < winnerCost, changeTopSet: b <= winnerCost };
  }
  if (
    basis === 'NOMINAL_VALUE_SAME_UNIT' &&
    bound.kind === 'KNOWN_BOUND' &&
    'maxPlausibleValueMinorUnits' in bound
  ) {
    if (winnerNominal === undefined) return { improve: true, changeTopSet: true };
    const v = bound.maxPlausibleValueMinorUnits;
    return { improve: v > winnerNominal, changeTopSet: v >= winnerNominal };
  }
  return { improve: true, changeTopSet: true };
}

function advisoriesFor(w: Working): CandidateAdvisory[] {
  const a = new Set<CandidateAdvisory>(w.advisories);
  if (w.providerPrivate) a.add('VERIFY_FIRST');
  if (w.availabilityUncertain) a.add('DYNAMIC_AVAILABILITY');
  if (w.unknownCap) a.add('UNKNOWN_CAP');
  if (w.unknownCombinability) a.add('UNKNOWN_COMBINABILITY');
  if (w.missingContext && w.missingContext.length > 0) a.add('MISSING_CONTEXT');
  if (w.holidayUncertain) a.add('MISSING_CONTEXT');
  if (w.sourceUncertainty === 'CONFLICTED') a.add('CONFLICTED_CANDIDATE');
  // STALE covers INACCESSIBLE (mapped to 'STALE'). Source UNKNOWN is NOT relabeled as stale —
  // it is insufficient source knowledge, surfaced via couldChangeDecision + rejectionReason.
  if (w.sourceUncertainty === 'STALE') a.add('STALE_CANDIDATE');
  return [...a];
}

/**
 * A candidate is safely user-resolvable ONLY if EVERY material blocking axis can be verified before
 * payment (RTM3-10). One resolvable axis must NOT mask another unresolvable one: source quality is
 * never user-verifiable; unknown combinability, holiday-policy uncertainty and missing context are
 * system-unresolvable; availability is resolvable iff the rule is `preRedemptionVerifiable`;
 * provider-private eligibility is user-resolvable. A public winner may stand over a candidate only
 * when all of that candidate's blocking axes are resolvable.
 */
function isUserResolvable(w: Working): boolean {
  if (w.sourceUncertainty) return false;
  if (w.unknownCap) return false; // the cap value is unknown; not user-verifiable before payment
  if (w.unknownCombinability) return false;
  if (w.holidayUncertain) return false;
  if (w.missingContext && w.missingContext.length > 0) return false;
  if (w.availabilityUncertain && !w.preRedemptionVerifiable) return false;
  // Remaining axes — provider-private, availability with pre-redemption verifiability — are resolvable.
  return true;
}

export function evaluateScope(
  scope: ComparisonScope,
  members: RuleVersion[],
  opStateByKey: Map<string, RuleOperationalState>,
  input: DecideInput,
): EngineDecisionResult {
  const basis = scope.comparisonBasis;
  const holidayCalendar = new Set(input.holidayCalendar ?? []);

  // RTM3-01: prove the ACTUAL runtime purchase matches this scope's frozen PurchaseSignature BEFORE
  // any member rule may rank. A scope-wide gate: NO_MATCH ⇒ every member is a clean rejection (the
  // scope is not this purchase); MISSING ⇒ every member is non-rankable pending context.
  const sigMatch = matchPurchaseSignature(scope.signature, input.context);

  // Deterministic order (§35): sort members by ruleId before any classification/ranking.
  const sorted = [...members].sort((a, b) =>
    a.ruleId < b.ruleId ? -1 : a.ruleId > b.ruleId ? 1 : 0,
  );

  const workings: Working[] = [];

  for (const rule of sorted) {
    // Cross-merchant guard (§3): a rule may only be a member of a scope it actually serves.
    if (!rule.merchantIds.includes(scope.merchantId)) {
      throw new CrossMerchantMembershipError(
        rule.ruleId,
        rule.merchantIds,
        scope.scopeId,
        scope.merchantId,
      );
    }
    // Basis guard (fail-closed): derived basis must equal the scope's declared basis.
    if (expectedBasis(rule) !== basis) {
      throw new ComparisonBasisMismatchError(
        rule.ruleId,
        expectedBasis(rule),
        scope.scopeId,
        basis,
      );
    }

    const ref: RuleRef = { ruleId: rule.ruleId, version: rule.version };
    const op = opStateByKey.get(`${rule.ruleId}@${rule.version}`);
    if (!op) {
      // Unreachable when decide() validated canonical identity, but fail closed defensively (§RTM3-05).
      throw new CanonicalInputError(
        `evaluated rule ${rule.ruleId}@${rule.version} has no operational state`,
      );
    }

    const w: Working = {
      rule,
      ref,
      advisories: [],
      bucket: 'REJECTED',
      eligibility: 'INELIGIBLE',
      sourceFresh: op.sourceQualityState === 'FRESH',
      provenanceRef: rule.provenance.observedAt,
    };

    // 0. PurchaseSignature gate (RTM3-01) — the purchase must be this scope's signature.
    if (sigMatch.kind === 'NO_MATCH') {
      w.rejectionReason = `scope not applicable: ${sigMatch.reason}`;
      workings.push(w);
      continue;
    }
    if (sigMatch.kind === 'MISSING') {
      w.missingContext = sigMatch.missing;
      w.bucket = 'UNCERTAIN';
      workings.push(w);
      continue;
    }

    // 1. Publication (§25).
    const pub = resolvePublication(op.publicationState);
    if (!pub.rankable) {
      w.rejectionReason = pub.rejectionReason;
      workings.push(w);
      continue;
    }

    // 2. Temporal (§18) vs intendedTransactionAt.
    if (!withinTemporalRange(rule.constraints.temporal, input.intendedTransactionAt)) {
      w.rejectionReason = 'outside temporal range';
      workings.push(w);
      continue;
    }
    if (!withinWeekdays(rule.constraints.weekdays, input.intendedTransactionAt)) {
      w.rejectionReason = 'weekday not eligible';
      workings.push(w);
      continue;
    }
    if (!withinTimeWindow(rule.constraints.timeWindow, input.intendedTransactionAt)) {
      w.rejectionReason = 'outside time window';
      workings.push(w);
      continue;
    }
    const holiday = evaluateHoliday(rule.constraints, input.intendedTransactionAt, holidayCalendar);
    if (holiday === 'BLOCKED') {
      w.rejectionReason = 'holiday excluded';
      workings.push(w);
      continue;
    }
    if (holiday === 'UNCERTAIN') w.holidayUncertain = true;

    // 3. Eligibility (§7/§20/§21/§22).
    const elig = evaluateEligibility(rule, input.portfolio);
    w.eligibility = elig.eligibility;
    if (elig.eligibility === 'INELIGIBLE') {
      w.rejectionReason = elig.rejectionReason;
      workings.push(w);
      continue;
    }
    if (elig.providerPrivate) {
      w.providerPrivate = true; // non-rankable, user-resolvable VERIFY_FIRST (§21)
    } else if (elig.eligibility === 'UNKNOWN') {
      // Non-private UNKNOWN ⇒ an undeclared USER_DECLARABLE fact. Never silently YES (§22): the
      // candidate is not ranked (user-resolvable by declaring the fact), never a material blocker.
      w.rejectionReason =
        elig.rejectionReason ?? 'eligibility UNKNOWN (user-declarable fact undeclared)';
      workings.push(w);
      continue;
    }

    // 4. Confidence (§24): LOW is never participant-rankable.
    if (!confidenceRankable(rule.confidence)) {
      w.rejectionReason = 'LOW confidence (review-only)';
      workings.push(w);
      continue;
    }

    // 5. Availability (§23).
    // Pre-redemption verifiability is a RULE SEMANTIC (RT-01), never a caller override.
    const avail = resolveAvailability(
      op.availability,
      rule.constraints.preRedemptionVerifiable === true,
    );
    if (!avail.rankable && !avail.uncertain) {
      w.rejectionReason = avail.rejectionReason;
      workings.push(w);
      continue;
    }
    if (avail.uncertain) {
      w.availabilityUncertain = true;
      w.preRedemptionVerifiable = avail.preRedemptionVerifiable;
    }

    // 6. Combinability uncertainty (§28 UNKNOWN_COMBINABILITY).
    if (rule.constraints.combinability === 'UNKNOWN') w.unknownCombinability = true;

    // 7. Economics (§6/§10/§16).
    const econ = computeEconomics(rule, input.context);
    if (econ.state === 'REJECTED') {
      w.rejectionReason = econ.reason;
      workings.push(w);
      continue;
    }
    if (econ.state === 'NON_EQUIVALENT') {
      w.advisories.push('NON_EQUIVALENT_PURCHASE');
      w.rejectionReason = 'NON_EQUIVALENT_PURCHASE';
      workings.push(w);
      continue;
    }
    if (econ.state === 'MISSING_CONTEXT') {
      w.missingContext = econ.missing;
      w.bucket = 'UNCERTAIN';
      workings.push(w);
      continue;
    }
    if (econ.state === 'UNKNOWN_CAP') {
      w.unknownCap = true;
      w.optimisticCostCentimos = econ.optimisticCostCentimos;
      w.bucket = 'UNCERTAIN';
      workings.push(w);
      continue;
    }

    if (econ.state === 'RANKABLE_NOMINAL') {
      w.nominalMinorUnits = econ.minorUnits;
      w.nominalUnit = econ.unit;
      w.cashAcquisitionCostCentimos = econ.cashAcquisitionCostCentimos;
    } else {
      // A participant-rankable effective cost MUST be a valid non-negative céntimo value (RTM3-04).
      assertSafeCentimos(econ.effectiveCostCentimos, `effectiveCostCentimos for ${rule.ruleId}`);
      w.effectiveCostCentimos = econ.effectiveCostCentimos;
      w.optimisticCostCentimos = econ.optimisticCostCentimos;
      w.roundingAmbiguous = econ.roundingAmbiguous;
      w.cashbackCentimos = econ.cashbackCentimos;
    }

    // Non-FRESH source ⇒ uncertain (never rankable); provider-private / availability-unknown /
    // combinability-unknown / holiday-uncertain ⇒ uncertain; else confirmed rankable.
    const src = resolveSourceQuality(op.sourceQualityState);
    if (!src.rankable) {
      w.sourceUncertainty = src.uncertainty;
      // RTM3-25: a source-uncertain candidate (incl. UNKNOWN) always carries an explicit reason, so
      // it never disappears from the audit output without explanation.
      if (!w.rejectionReason) w.rejectionReason = src.rejectionReason;
    }

    const uncertain =
      !!w.sourceUncertainty ||
      !!w.providerPrivate ||
      !!w.availabilityUncertain ||
      !!w.unknownCombinability ||
      !!w.holidayUncertain;
    if (uncertain) {
      w.bucket = 'UNCERTAIN';
    } else {
      w.bucket = econ.state === 'RANKABLE_NOMINAL' ? 'RANKABLE_NOMINAL' : 'RANKABLE_COST';
      w.eligibility = 'ELIGIBLE';
    }
    workings.push(w);
  }

  return resolveDecision(scope, workings, input);
}

// The status-precedence table (§10) is inherently branchy but each branch is a distinct rule.
function resolveDecision(
  scope: ComparisonScope,
  workings: Working[],
  input: DecideInput,
): EngineDecisionResult {
  const basis = scope.comparisonBasis;
  const baseline = input.baselineByScopeId?.[scope.scopeId];

  // ---- Nominal comparability grouping (RT-06) ----
  let rankable: Working[];
  const nominalRefused: Working[] = [];
  if (basis === 'NOMINAL_VALUE_SAME_UNIT') {
    const noms = workings.filter((w) => w.bucket === 'RANKABLE_NOMINAL');
    // RTM3-11: both nominal economic values must be SAFE integers (isSafeInteger, not isInteger) —
    // an unsafe/NaN/negative/fractional value is a domain error (fail-closed), never a winner. A
    // PRESENT cash acquisition cost must additionally be ≥ 0; absence is the explicit unknown.
    for (const w of noms) {
      if (w.nominalMinorUnits !== undefined && !Number.isSafeInteger(w.nominalMinorUnits)) {
        throw new SettlementInvariantError(
          `invalid nominal minor units for ${w.ref.ruleId}: ${w.nominalMinorUnits} (must be a safe integer)`,
        );
      }
      const cost = w.cashAcquisitionCostCentimos;
      if (cost !== undefined && (!Number.isSafeInteger(cost) || cost < 0)) {
        throw new SettlementInvariantError(
          `invalid cash acquisition cost for ${w.ref.ruleId}: ${cost} (must be a safe integer ≥ 0)`,
        );
      }
    }
    const units = new Set(noms.map((w) => w.nominalUnit));
    const costs = new Set(noms.map((w) => w.cashAcquisitionCostCentimos));
    // RT-06: prerequisites hold only when every candidate's cost is KNOWN (present) and equal.
    const costsKnown = noms.every((w) => w.cashAcquisitionCostCentimos !== undefined);
    const comparable = noms.length > 0 && units.size === 1 && costsKnown && costs.size === 1;
    if (comparable) {
      rankable = noms;
    } else {
      rankable = [];
      for (const w of noms) {
        w.advisories.push('NON_COMPARABLE');
        nominalRefused.push(w);
      }
    }
  } else {
    rankable = workings.filter((w) => w.bucket === 'RANKABLE_COST');
  }

  const uncertain = workings.filter((w) => w.bucket === 'UNCERTAIN');

  // ---- Rank within basis ----
  let winner: Working | undefined;
  let runnerUp: Working | undefined;
  let tie = false;
  let winnerCost: Centimos | undefined;
  let winnerNominal: number | undefined;
  let delta: RankDelta = null;

  if (rankable.length > 0) {
    if (basis === 'EFFECTIVE_OUT_OF_POCKET_COST') {
      const sortedR = [...rankable].sort(
        (a, b) =>
          a.effectiveCostCentimos! - b.effectiveCostCentimos! ||
          (a.ref.ruleId < b.ref.ruleId ? -1 : 1),
      );
      winner = sortedR[0];
      winnerCost = winner!.effectiveCostCentimos!;
      const top = sortedR.filter((w) => w.effectiveCostCentimos === winnerCost);
      tie = top.length > 1;
      runnerUp = sortedR.find((w) => w.effectiveCostCentimos !== winnerCost);
      if (!tie && runnerUp)
        delta = {
          kind: 'COST_CENTIMOS',
          amountCentimos: runnerUp.effectiveCostCentimos! - winnerCost,
        };
      else if (tie) delta = { kind: 'COST_CENTIMOS', amountCentimos: 0 };
    } else {
      // NOMINAL_VALUE_SAME_UNIT → argmax minorUnits.
      const sortedR = [...rankable].sort(
        (a, b) =>
          b.nominalMinorUnits! - a.nominalMinorUnits! || (a.ref.ruleId < b.ref.ruleId ? -1 : 1),
      );
      winner = sortedR[0];
      winnerNominal = winner!.nominalMinorUnits!;
      const top = sortedR.filter((w) => w.nominalMinorUnits === winnerNominal);
      tie = top.length > 1;
      runnerUp = sortedR.find((w) => w.nominalMinorUnits !== winnerNominal);
      const unit = winner!.nominalUnit!;
      if (!tie && runnerUp) {
        const amountMinorUnits = winnerNominal - runnerUp.nominalMinorUnits!;
        // RTM3-11 §19: even two individually-safe values must yield a safe-integer difference.
        if (!Number.isSafeInteger(amountMinorUnits)) {
          throw new SettlementInvariantError(
            `nominal rank delta not a safe integer: ${amountMinorUnits}`,
          );
        }
        delta = { kind: 'NOMINAL_VALUE', amountMinorUnits, unit };
      } else if (tie) delta = { kind: 'NOMINAL_VALUE', amountMinorUnits: 0, unit };
    }
  }

  // ---- Materiality of uncertain candidates + rounding-ambiguity of non-winner rankables ----
  // Partition system-unresolvable material candidates into "could strictly improve the best" vs
  // "could only equal the best" (join the top set). User-resolvable material candidates never force
  // NO_SAFE_WINNER (they are advisory), but they may leave the top set incomplete.
  const systemImprovers: Working[] = []; // could strictly beat the best value ⇒ hard block
  const systemEqualOnly: Working[] = []; // could only equal the best value ⇒ could join the top set
  const userResolvableMaterial: Working[] = [];
  for (const w of uncertain) {
    const bound = boundFor(w, basis);
    const { improve, changeTopSet } = boundMateriality(bound, basis, winnerCost, winnerNominal);
    w.__bound = bound;
    w.__improve = improve;
    w.__changeTopSet = changeTopSet;
    if (!changeTopSet) continue;
    if (isUserResolvable(w)) userResolvableMaterial.push(w);
    else if (improve) systemImprovers.push(w);
    else systemEqualOnly.push(w);
  }
  // Rounding ambiguity: a non-winner rankable whose optimistic (rounded-up) cost could beat or equal
  // the winner is system-unresolvable (the ambiguity is intrinsic, not user-verifiable).
  if (basis === 'EFFECTIVE_OUT_OF_POCKET_COST' && winner && winnerCost !== undefined) {
    for (const w of rankable) {
      if (w === winner) continue;
      if (w.roundingAmbiguous && w.optimisticCostCentimos !== undefined) {
        const oc = w.optimisticCostCentimos;
        w.__improve = oc < winnerCost;
        w.__changeTopSet = oc <= winnerCost;
        if (oc < winnerCost) systemImprovers.push(w);
        else if (oc === winnerCost) systemEqualOnly.push(w);
      }
    }
  }

  // ---- Status resolution (§10 precedence + RTM3-03 top-set semantics) ----
  const status = ((): EngineDecisionResult['status'] => {
    if (rankable.length > 0) {
      // A candidate that could STRICTLY beat the best is a hard block.
      if (systemImprovers.length > 0) return 'NO_SAFE_WINNER';
      if (systemEqualOnly.length > 0) {
        // A candidate that could only TIE the best: safe iff the best is ALREADY a tie (widening a
        // tie does not change the decision). Against a UNIQUE winner, being tie-able means uniqueness
        // is not safe ⇒ NO_SAFE_WINNER (RTM3-03 §10).
        return tie ? 'CONFIRMED_TIE' : 'NO_SAFE_WINNER';
      }
      if (tie) return 'CONFIRMED_TIE';
      return winner!.rule.confidence === 'MEDIUM' ? 'LIKELY' : 'BEST_CONFIRMED';
    }
    // Rankable set empty — frozen precedence: SOURCE_CONFLICT > SOURCE_STALE > NO_SAFE_WINNER >
    // NO_APPLICABLE_BENEFIT. STALE/INACCESSIBLE ⇒ SOURCE_STALE; source UNKNOWN is NOT stale —
    // insufficient knowledge falls through to NO_SAFE_WINNER.
    const conflicted = uncertain.some(
      (w) => w.sourceUncertainty === 'CONFLICTED' && w.__changeTopSet,
    );
    if (conflicted) return 'SOURCE_CONFLICT';
    const staleLike = uncertain.some((w) => w.sourceUncertainty === 'STALE' && w.__changeTopSet);
    if (staleLike) return 'SOURCE_STALE';
    const systemBlockers = systemImprovers.length + systemEqualOnly.length;
    const anyMaterial = systemBlockers > 0 || userResolvableMaterial.length > 0;
    const onlyPrivate =
      anyMaterial && systemBlockers === 0 && userResolvableMaterial.every((w) => w.providerPrivate);
    if (onlyPrivate) return 'VERIFY_FIRST';
    if (anyMaterial) return 'NO_SAFE_WINNER';
    // Nothing applicable/uncertain remained.
    const anyApplicable = rankable.length + uncertain.length + nominalRefused.length > 0;
    return anyApplicable ? 'NO_SAFE_WINNER' : 'NO_APPLICABLE_BENEFIT';
  })();

  // A confirmed status must not carry a stale winner value; the confirmed top set is only surfaced
  // when the best value stands (BEST_CONFIRMED / LIKELY / CONFIRMED_TIE).
  const winnerStands =
    status === 'BEST_CONFIRMED' || status === 'CONFIRMED_TIE' || status === 'LIKELY';
  // RTM3-03 (2nd closure): `winnerRef` denotes a UNIQUE confirmed best. A CONFIRMED_TIE has no single
  // winner — its truth is `confirmedTopRuleRefs` — so `winnerRef`/`runnerUpRef` are omitted for a tie.
  const hasUniqueWinner = (status === 'BEST_CONFIRMED' || status === 'LIKELY') && !tie;

  // ---- Top set (RTM3-03 §9): the confirmed best members, plus any candidate that could still join.
  const atBest = (w: Working): boolean =>
    basis === 'EFFECTIVE_OUT_OF_POCKET_COST'
      ? w.effectiveCostCentimos === winnerCost
      : w.nominalMinorUnits === winnerNominal;
  const confirmedTop = winnerStands ? rankable.filter(atBest) : [];
  const confirmedSet = new Set(confirmedTop);
  const possibleAdditional = winnerStands
    ? workings.filter((w) => w.__changeTopSet === true && !confirmedSet.has(w))
    : [];
  const topSetComplete = winnerStands && possibleAdditional.length === 0;

  const materialBlockers = [...systemImprovers, ...systemEqualOnly];
  const candidates = workings.map((w) => toCandidate(w, scope, basis, baseline));
  const advisories = candidates.filter((c) => c.advisories.length > 0);

  const explanation = buildExplanation(
    status,
    scope,
    winner,
    runnerUp,
    delta,
    materialBlockers,
    tie,
  );

  return {
    scopeId: scope.scopeId,
    merchantId: scope.merchantId,
    comparisonBasis: basis,
    status,
    winnerRef: hasUniqueWinner ? winner?.ref : undefined,
    runnerUpRef: hasUniqueWinner ? runnerUp?.ref : undefined,
    delta: winnerStands ? delta : null,
    confirmedTopRuleRefs: confirmedTop.map((w) => w.ref),
    possibleAdditionalTopRuleRefs: possibleAdditional.map((w) => w.ref),
    topSetComplete,
    candidates,
    advisories,
    explanation,
  };
}

function toCandidate(
  w: Working,
  scope: ComparisonScope,
  basis: ComparisonScope['comparisonBasis'],
  baseline: Centimos | undefined,
): DecisionCandidate {
  const bound: PlausibleBound = w.__bound ?? {
    kind: 'UNKNOWN_OR_UNBOUNDED',
    reason: 'not an uncertain candidate',
  };
  const isRankable = w.bucket === 'RANKABLE_COST' || w.bucket === 'RANKABLE_NOMINAL';
  // couldChangeDecision = couldChangeTopSet (RTM3-03/§8): the optimistic bound could equal-or-beat
  // the confirmed best. couldImproveBestOutcome is the strict-beat subset. Both are populated for
  // uncertain candidates and for rounding-ambiguous rankable non-winners.
  const couldChangeTopSet = !!w.__changeTopSet;
  const couldImproveBestOutcome = !!w.__improve;
  const penSaved =
    isRankable &&
    basis === 'EFFECTIVE_OUT_OF_POCKET_COST' &&
    baseline !== undefined &&
    w.effectiveCostCentimos !== undefined &&
    baseline - w.effectiveCostCentimos > 0
      ? baseline - w.effectiveCostCentimos
      : undefined;
  return {
    ruleRef: w.ref,
    scopeId: scope.scopeId,
    comparisonBasis: basis,
    eligibility: w.eligibility,
    rankable: isRankable,
    effectiveCostCentimos: w.effectiveCostCentimos,
    nominalValue:
      w.nominalMinorUnits !== undefined && w.nominalUnit !== undefined
        ? { minorUnits: w.nominalMinorUnits, unit: w.nominalUnit }
        : undefined,
    cashbackCentimos: w.cashbackCentimos,
    penSavedCentimos: penSaved,
    baselineRef: penSaved !== undefined ? `scope-baseline:${scope.scopeId}` : undefined,
    plausibleBound: bound,
    couldChangeDecision: couldChangeTopSet,
    couldImproveBestOutcome,
    couldChangeTopSet,
    confidence: w.rule.confidence,
    advisories: advisoriesFor(w),
    rejectionReason: w.rejectionReason,
  };
}

function buildExplanation(
  status: EngineDecisionResult['status'],
  scope: ComparisonScope,
  winner: Working | undefined,
  runnerUp: Working | undefined,
  delta: RankDelta,
  blockers: Working[],
  tie: boolean,
): string {
  const base = `[${scope.scopeId} · ${scope.comparisonBasis}] ${status}`;
  switch (status) {
    case 'BEST_CONFIRMED':
    case 'LIKELY':
      return `${base}: winner ${winner?.ref.ruleId}${winner?.effectiveCostCentimos !== undefined ? ` cost=${winner.effectiveCostCentimos}` : ''}${winner?.nominalMinorUnits !== undefined ? ` nominal=${winner.nominalMinorUnits}` : ''}${runnerUp ? `; runnerUp ${runnerUp.ref.ruleId}` : ''}${delta ? `; delta ${JSON.stringify(delta)}` : ''}`;
    case 'CONFIRMED_TIE':
      return `${base}: tie at top by ${scope.comparisonBasis}`;
    case 'NO_SAFE_WINNER':
      return `${base}: rankable winner ${winner?.ref.ruleId ?? '(none)'} blocked by ${blockers.length} material system-unresolvable candidate(s): ${blockers.map((b) => b.ref.ruleId).join(',') || '—'}${tie ? ' (top was a tie)' : ''}`;
    case 'SOURCE_STALE':
      return `${base}: no fresh rankable option; a material candidate is stale/inaccessible/source-unknown`;
    case 'SOURCE_CONFLICT':
      return `${base}: no fresh rankable option; a material candidate has a conflicted source`;
    case 'VERIFY_FIRST':
      return `${base}: sole path is a user-resolvable provider-private option`;
    case 'NO_APPLICABLE_BENEFIT':
      return `${base}: no rule applies to this merchant+context`;
    default:
      return base;
  }
}

/**
 * Pure decision evaluator. Returns an auditable EngineEvaluation with per-scope results and, when a
 * single materially-distinct scope matches (or one is selected), a `final` decision. No global
 * ranking across separate purchase scopes; the engine never picks a scope by largest saving.
 */
export function decide(input: DecideInput): EngineEvaluation {
  // ---- Fail-closed input validation (RTM3-04/05/06/11) BEFORE any economic reasoning ----
  assertStrictInstant(input.evaluatedAt, 'evaluatedAt');
  assertStrictInstant(input.intendedTransactionAt, 'intendedTransactionAt');
  validateContextMoney(input.context);
  const opStateByKey = buildValidatedOpMap(input);

  const merchantId = input.context.merchantId;
  const merchantScopes = input.scopes.filter((s) => s.merchantId === merchantId);

  const scopeResults: ScopeDecisionResult[] = [];
  for (const scope of merchantScopes) {
    const members = input.rules.filter((r) => r.comparisonScopeRefs.includes(scope.scopeId));
    if (members.length === 0) continue;
    // Every evaluated rule must have exactly one operational state (RTM3-05; buildValidatedOpMap
    // already rejected duplicates/orphans — this closes the missing-state case).
    for (const r of members) {
      if (!opStateByKey.has(`${r.ruleId}@${r.version}`)) {
        throw new CanonicalInputError(
          `evaluated rule ${r.ruleId}@${r.version} has no operational state`,
        );
      }
    }
    const decision = evaluateScope(scope, members, opStateByKey, input);
    scopeResults.push({
      scopeId: scope.scopeId,
      merchantId,
      comparisonBasis: scope.comparisonBasis,
      decision,
    });
  }

  // A scope "matched" iff it yielded a rankable or (material) uncertain candidate.
  const matchedScopes = scopeResults.filter((s) => scopeMatched(s.decision));

  if (input.selectedScopeId) {
    const chosen =
      matchedScopes.find((s) => s.scopeId === input.selectedScopeId) ??
      scopeResults.find((s) => s.scopeId === input.selectedScopeId);
    return {
      merchantId,
      matchedScopes,
      requiresScopeSelection: false,
      selectedScopeId: input.selectedScopeId,
      final: chosen?.decision,
      evaluatedAt: input.evaluatedAt,
      intendedTransactionAt: input.intendedTransactionAt,
    };
  }

  if (matchedScopes.length > 1) {
    return {
      merchantId,
      matchedScopes,
      requiresScopeSelection: true,
      final: undefined,
      evaluatedAt: input.evaluatedAt,
      intendedTransactionAt: input.intendedTransactionAt,
    };
  }

  if (matchedScopes.length === 1) {
    return {
      merchantId,
      matchedScopes,
      requiresScopeSelection: false,
      final: matchedScopes[0]!.decision,
      evaluatedAt: input.evaluatedAt,
      intendedTransactionAt: input.intendedTransactionAt,
    };
  }

  // No matched scope.
  return {
    merchantId,
    matchedScopes: [],
    requiresScopeSelection: false,
    final: {
      scopeId: '(none)',
      merchantId,
      comparisonBasis: 'NON_COMPARABLE',
      status: 'NO_APPLICABLE_BENEFIT',
      delta: null,
      confirmedTopRuleRefs: [],
      possibleAdditionalTopRuleRefs: [],
      topSetComplete: true,
      candidates: scopeResults.flatMap((s) => s.decision.candidates),
      advisories: [],
      explanation: `[${merchantId}] NO_APPLICABLE_BENEFIT: no scope matched merchant+context`,
    },
    evaluatedAt: input.evaluatedAt,
    intendedTransactionAt: input.intendedTransactionAt,
  };
}

function scopeMatched(d: EngineDecisionResult): boolean {
  if (d.status === 'NO_APPLICABLE_BENEFIT') return false;
  return d.candidates.some((c) => c.rankable || c.couldChangeDecision);
}

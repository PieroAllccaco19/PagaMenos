// PagaMenos · engine — the pure deterministic decision evaluator (§4/§5/§9).
// Side-effect-free. Order-invariant (candidates are sorted by ruleId before ranking). Fail-closed:
// impossible domain combinations throw typed invariant errors rather than defaulting to a winner.
import { deriveRequiredContext, expectedBasis } from '@/corpus';
import type {
  Centimos,
  ComparisonScope,
  ContextReq,
  NominalUnit,
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
  ComparisonBasisMismatchError,
  CrossMerchantMembershipError,
  SettlementInvariantError,
} from './errors';
import {
  applyKnownCap,
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
        if (rule.eligibleSpendSelector === 'EXACT_SKU_BUNDLE') {
          if (ctx.hasExactBundle === undefined) missing.push('BASKET');
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
      return {
        state: 'RANKABLE_COST',
        effectiveCostCentimos: base - discount,
        optimisticCostCentimos: base - discount,
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
  __material?: boolean;
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

function boundIsMaterial(
  bound: PlausibleBound,
  basis: ComparisonScope['comparisonBasis'],
  winnerCost: Centimos | undefined,
  winnerNominal: number | undefined,
  winnerIsTie: boolean,
): boolean {
  if (bound.kind === 'UNKNOWN_OR_UNBOUNDED') return true; // material by default (§28)
  // Materiality = "could change the DECISION". A bound that STRICTLY beats the winner could make a
  // new sole/joint winner ⇒ material. A bound that only EQUALS the winner is material iff the winner
  // is currently UNIQUE (equality would convert BEST_CONFIRMED → CONFIRMED_TIE); if the winner set is
  // ALREADY a tie, an equal bound merely joins/does-not-join a tie WITHOUT changing the decision
  // status ⇒ non-material (M3 FIX03; consistent with §21's "confirmed UNIQUE winner" wording).
  if (
    basis === 'EFFECTIVE_OUT_OF_POCKET_COST' &&
    bound.kind === 'KNOWN_BOUND' &&
    'minPlausibleCostCentimos' in bound
  ) {
    if (winnerCost === undefined) return true;
    if (bound.minPlausibleCostCentimos < winnerCost) return true;
    if (bound.minPlausibleCostCentimos === winnerCost) return !winnerIsTie;
    return false;
  }
  if (
    basis === 'NOMINAL_VALUE_SAME_UNIT' &&
    bound.kind === 'KNOWN_BOUND' &&
    'maxPlausibleValueMinorUnits' in bound
  ) {
    if (winnerNominal === undefined) return true;
    if (bound.maxPlausibleValueMinorUnits > winnerNominal) return true;
    if (bound.maxPlausibleValueMinorUnits === winnerNominal) return !winnerIsTie;
    return false;
  }
  return true;
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

/** User-resolvable uncertainty (does NOT block a confirmed public winner, §11/§21/§23). */
function isUserResolvable(w: Working): boolean {
  if (w.providerPrivate) return true;
  if (w.availabilityUncertain && w.preRedemptionVerifiable) return true;
  return false;
}

export function evaluateScope(
  scope: ComparisonScope,
  members: RuleVersion[],
  opStateByKey: Map<string, RuleOperationalState>,
  input: DecideInput,
): EngineDecisionResult {
  const basis = scope.comparisonBasis;
  const holidayCalendar = new Set(input.holidayCalendar ?? []);

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
      workings.push({
        rule,
        ref,
        advisories: [],
        bucket: 'REJECTED',
        eligibility: 'UNKNOWN',
        sourceFresh: false,
        provenanceRef: rule.provenance.observedAt,
        rejectionReason: 'no operational state',
      });
      continue;
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
      w.effectiveCostCentimos = econ.effectiveCostCentimos;
      w.optimisticCostCentimos = econ.optimisticCostCentimos;
      w.roundingAmbiguous = econ.roundingAmbiguous;
      w.cashbackCentimos = econ.cashbackCentimos;
    }

    // Non-FRESH source ⇒ uncertain (never rankable); provider-private / availability-unknown /
    // combinability-unknown / holiday-uncertain ⇒ uncertain; else confirmed rankable.
    const src = resolveSourceQuality(op.sourceQualityState);
    if (!src.rankable) w.sourceUncertainty = src.uncertainty;

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
    // A PRESENT cash acquisition cost must be a finite integer ≥ 0 — an invalid number is a domain
    // error (fail-closed), NOT an "unknown" value. Absence (undefined) is the explicit unknown.
    for (const w of noms) {
      const cost = w.cashAcquisitionCostCentimos;
      if (cost !== undefined && (!Number.isFinite(cost) || !Number.isInteger(cost) || cost < 0)) {
        throw new SettlementInvariantError(
          `invalid cash acquisition cost for ${w.ref.ruleId}: ${cost} (must be a finite integer ≥ 0)`,
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
      if (!tie && runnerUp)
        delta = {
          kind: 'NOMINAL_VALUE',
          amountMinorUnits: winnerNominal - runnerUp.nominalMinorUnits!,
          unit,
        };
      else if (tie) delta = { kind: 'NOMINAL_VALUE', amountMinorUnits: 0, unit };
    }
  }

  // ---- Materiality of uncertain candidates + rounding-ambiguity of non-winner rankables ----
  const materialBlockers: Working[] = [];
  const materialUserResolvable: Working[] = [];
  for (const w of uncertain) {
    const bound = boundFor(w, basis);
    const material = boundIsMaterial(bound, basis, winnerCost, winnerNominal, tie);
    w.__bound = bound;
    w.__material = material;
    if (!material) continue;
    if (isUserResolvable(w)) materialUserResolvable.push(w);
    else materialBlockers.push(w);
  }
  // Rounding ambiguity: a non-winner rankable whose optimistic (rounded-up) cost could beat, or
  // (against a unique winner) tie, the winner. Against an already-tied winner an equal optimistic
  // cost only joins the tie ⇒ non-material (same "could change the decision" rule as above).
  if (basis === 'EFFECTIVE_OUT_OF_POCKET_COST' && winner && winnerCost !== undefined) {
    for (const w of rankable) {
      if (w === winner) continue;
      if (w.roundingAmbiguous && w.optimisticCostCentimos !== undefined) {
        const oc = w.optimisticCostCentimos;
        if (oc < winnerCost || (oc === winnerCost && !tie)) materialBlockers.push(w);
      }
    }
  }

  // ---- Status resolution (§10 precedence) ----
  const status = ((): EngineDecisionResult['status'] => {
    if (rankable.length > 0) {
      if (materialBlockers.length > 0) return 'NO_SAFE_WINNER';
      if (tie) return 'CONFIRMED_TIE';
      return winner!.rule.confidence === 'MEDIUM' ? 'LIKELY' : 'BEST_CONFIRMED';
    }
    // Rankable set empty — frozen precedence: SOURCE_CONFLICT > SOURCE_STALE > NO_SAFE_WINNER >
    // NO_APPLICABLE_BENEFIT. STALE/INACCESSIBLE ⇒ SOURCE_STALE; source UNKNOWN is NOT stale —
    // insufficient knowledge falls through to NO_SAFE_WINNER.
    const conflicted = uncertain.some((w) => w.sourceUncertainty === 'CONFLICTED' && w.__material);
    if (conflicted) return 'SOURCE_CONFLICT';
    const staleLike = uncertain.some((w) => w.sourceUncertainty === 'STALE' && w.__material);
    if (staleLike) return 'SOURCE_STALE';
    const anyMaterial = materialBlockers.length > 0 || materialUserResolvable.length > 0;
    const onlyPrivate =
      anyMaterial &&
      materialBlockers.length === 0 &&
      materialUserResolvable.every((w) => w.providerPrivate);
    if (onlyPrivate) return 'VERIFY_FIRST';
    if (anyMaterial) return 'NO_SAFE_WINNER';
    // Nothing applicable/uncertain remained.
    const anyApplicable = rankable.length + uncertain.length + nominalRefused.length > 0;
    return anyApplicable ? 'NO_SAFE_WINNER' : 'NO_APPLICABLE_BENEFIT';
  })();

  // A confirmed status must not carry a stale winner value; winner is only surfaced when it stands.
  const winnerStands =
    status === 'BEST_CONFIRMED' || status === 'CONFIRMED_TIE' || status === 'LIKELY';

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
    winnerRef: winnerStands ? winner?.ref : undefined,
    runnerUpRef: winnerStands && !tie ? runnerUp?.ref : undefined,
    delta: winnerStands ? delta : null,
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
  const couldChange = w.bucket === 'UNCERTAIN' ? !!w.__material : false;
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
    couldChangeDecision: couldChange,
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
  const opStateByKey = new Map<string, RuleOperationalState>();
  for (const op of input.operationalStates) opStateByKey.set(`${op.ruleId}@${op.version}`, op);

  const merchantId = input.context.merchantId;
  const merchantScopes = input.scopes.filter((s) => s.merchantId === merchantId);

  const scopeResults: ScopeDecisionResult[] = [];
  for (const scope of merchantScopes) {
    const members = input.rules.filter((r) => r.comparisonScopeRefs.includes(scope.scopeId));
    if (members.length === 0) continue;
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

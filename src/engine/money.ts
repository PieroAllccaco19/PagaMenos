// PagaMenos · engine — integer settlement (§10 money, §12 cap, §13 fixed/bundle/2x1, §14 cashback).
// ALL PEN monetary computation is integer céntimos. No floating point for economic settlement.
import type { Benefit, Centimos, Constraints } from '@/corpus';
import type { RoundingRule } from '@/corpus';

import { SettlementInvariantError } from './errors';

/** Result of a percentage-discount computation with an explicit ambiguity band for UNKNOWN rounding. */
export interface DiscountBand {
  /** The value the engine uses conservatively (smallest discount ⇒ highest cost). */
  value: Centimos;
  /** Smallest plausible discount (== value). */
  lower: Centimos;
  /** Largest plausible discount (optimistic; == value unless rounding is UNKNOWN). */
  upper: Centimos;
  /** True iff lower !== upper (rounding genuinely ambiguous). */
  ambiguous: boolean;
}

/**
 * Canonical Phase-0A percentage discount, integer-only:
 *   rawDiscount = floor(eligibleSpendCentimos * percentBps / 10_000)
 * with the frozen RoundingRule semantics. EXACT_FIXED is invalid for a percentage (fail-closed).
 */
export function percentDiscountCentimos(
  eligibleSpendCentimos: Centimos,
  percentBps: number,
  rounding: RoundingRule,
): DiscountBand {
  if (!Number.isInteger(eligibleSpendCentimos) || eligibleSpendCentimos < 0) {
    throw new SettlementInvariantError(
      `eligibleSpendCentimos must be a non-negative integer: ${eligibleSpendCentimos}`,
    );
  }
  if (!Number.isInteger(percentBps) || percentBps <= 0) {
    throw new SettlementInvariantError(`percentBps must be a positive integer: ${percentBps}`);
  }
  const scaled = eligibleSpendCentimos * percentBps; // integer
  const floorV = Math.floor(scaled / 10_000);
  const halfUpV = Math.floor((scaled + 5_000) / 10_000); // round-half-up to the céntimo
  switch (rounding) {
    case 'FLOOR_TO_CENT':
      return { value: floorV, lower: floorV, upper: floorV, ambiguous: false };
    case 'ROUND_HALF_UP_TO_CENT':
      return { value: halfUpV, lower: halfUpV, upper: halfUpV, ambiguous: false };
    case 'UNKNOWN':
      // Conservative primary value = floor (smallest discount ⇒ highest, safest cost). The band
      // spans floor..halfUp so materiality can see whether the ≤1-céntimo ambiguity matters.
      return { value: floorV, lower: floorV, upper: halfUpV, ambiguous: floorV !== halfUpV };
    case 'EXACT_FIXED':
      throw new SettlementInvariantError('EXACT_FIXED rounding is not valid for a PERCENT benefit');
    default: {
      const _exhaustive: never = rounding;
      throw new SettlementInvariantError(`unhandled RoundingRule: ${String(_exhaustive)}`);
    }
  }
}

/** Apply a known cap: discount = min(rawDiscount, capCentimos). */
export function applyKnownCap(rawDiscountCentimos: Centimos, capCentimos: Centimos): Centimos {
  if (!Number.isInteger(capCentimos) || capCentimos < 0) {
    throw new SettlementInvariantError(
      `capCentimos must be a non-negative integer: ${capCentimos}`,
    );
  }
  return Math.min(rawDiscountCentimos, capCentimos);
}

/**
 * TWO_FOR_ONE settlement over a ticket count (the accepted ticket scope semantics): for every
 * `of` units the participant pays `pay` unit prices; the remainder is paid in full. This does NOT
 * generalize to arbitrary promotional algebra beyond what the frozen corpus needs.
 */
export function twoForOneCostCentimos(
  unitPriceCentimos: Centimos,
  count: number,
  pay: number,
  of: number,
): Centimos {
  if (!Number.isInteger(count) || count <= 0) {
    throw new SettlementInvariantError(`ticket count must be a positive integer: ${count}`);
  }
  if (!Number.isInteger(pay) || !Number.isInteger(of) || pay <= 0 || of <= 0 || pay > of) {
    throw new SettlementInvariantError(`invalid TWO_FOR_ONE pay/of: ${pay}/${of}`);
  }
  const fullGroups = Math.floor(count / of);
  const remainder = count % of;
  const paidUnits = fullGroups * pay + remainder;
  return unitPriceCentimos * paidUnits;
}

/** Whether a rule's minimumSpend threshold is met by the eligible-spend quantity (RT-02). */
export function minimumSpendMet(
  constraints: Constraints,
  eligibleSpendCentimos: Centimos,
): boolean {
  const ms = constraints.minimumSpend;
  if (!ms) return true; // no minimum ⇒ always met
  // Canonical: eligible iff quantity(basis) >= minimumSpendCentimos. Exactly-equal is eligible.
  return eligibleSpendCentimos >= ms.minimumSpendCentimos;
}

/** Cashback value in céntimos, or 0 — NEVER folded into immediate effective cost (§14). */
export function cashbackCentimos(benefit: Benefit): Centimos {
  return benefit.type === 'CASHBACK' ? benefit.valueCentimos : 0;
}

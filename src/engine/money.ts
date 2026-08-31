// PagaMenos · engine — integer settlement (§10 money, §12 cap, §13 fixed/bundle/2x1, §14 cashback).
// ALL PEN monetary computation is integer céntimos. No floating point for economic settlement.
import type { Benefit, Centimos, Constraints } from '@/corpus';
import type { RoundingRule } from '@/corpus';

import { SettlementInvariantError } from './errors';

/** The largest percentage a discount benefit may express: 100% (RTM3-04). */
export const MAX_PERCENT_BPS = 10_000;

/**
 * Assert a PEN céntimo value is finite, a SAFE integer, and non-negative (RTM3-04/11). `isInteger`
 * alone permits values above `Number.MAX_SAFE_INTEGER` where integer arithmetic silently loses
 * precision; `isSafeInteger` closes that. Fail-closed — invalid money never reaches settlement.
 */
export function assertSafeCentimos(value: number, label: string): void {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new SettlementInvariantError(
      `${label} must be a finite, safe, non-negative integer céntimo value: ${value}`,
    );
  }
}

/** Exact non-negative integer multiply via BigInt, rejecting a product outside the safe range. */
function safeIntMul(a: number, b: number, label: string): number {
  const product = BigInt(a) * BigInt(b);
  if (product > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new SettlementInvariantError(
      `${label} product exceeds the safe integer range: ${product}`,
    );
  }
  return Number(product);
}

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
  assertSafeCentimos(eligibleSpendCentimos, 'eligibleSpendCentimos');
  if (!Number.isSafeInteger(percentBps) || percentBps <= 0 || percentBps > MAX_PERCENT_BPS) {
    throw new SettlementInvariantError(
      `percentBps must be an integer in (0, ${MAX_PERCENT_BPS}]: ${percentBps}`,
    );
  }
  // Exact BigInt arithmetic: the quotient is bounded by eligibleSpendCentimos (a safe integer),
  // so no MAX_SAFE_INTEGER rounding artefact is possible even for very large bills.
  const scaled = BigInt(eligibleSpendCentimos) * BigInt(percentBps);
  const floorV = Number(scaled / 10_000n);
  const halfUpV = Number((scaled + 5_000n) / 10_000n); // round-half-up to the céntimo
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
  assertSafeCentimos(capCentimos, 'capCentimos');
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
  assertSafeCentimos(unitPriceCentimos, 'unitPriceCentimos');
  if (!Number.isSafeInteger(count) || count <= 0) {
    throw new SettlementInvariantError(`ticket count must be a positive safe integer: ${count}`);
  }
  if (!Number.isSafeInteger(pay) || !Number.isSafeInteger(of) || pay <= 0 || of <= 0 || pay > of) {
    throw new SettlementInvariantError(`invalid TWO_FOR_ONE pay/of: ${pay}/${of}`);
  }
  const fullGroups = Math.floor(count / of);
  const remainder = count % of;
  const paidUnits = fullGroups * pay + remainder;
  return safeIntMul(unitPriceCentimos, paidUnits, 'unitPrice*paidUnits');
}

/**
 * FIXED_PRICE settlement over a ticket purchase: a fixed per-ticket price paid `count` times.
 * A single-ticket scope (count = 1) collapses to the flat fixed price; a 2-ticket scope pays the
 * fixed price twice (UVK Diners S/9.90/ticket × 2 = S/19.80). Independent of the ticket unit price.
 */
export function fixedPriceTicketCostCentimos(
  fixedPricePerTicketCentimos: Centimos,
  count: number,
): Centimos {
  assertSafeCentimos(fixedPricePerTicketCentimos, 'fixedPricePerTicketCentimos');
  if (!Number.isSafeInteger(count) || count <= 0) {
    throw new SettlementInvariantError(`ticket count must be a positive safe integer: ${count}`);
  }
  return safeIntMul(fixedPricePerTicketCentimos, count, 'fixedPrice*ticketCount');
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

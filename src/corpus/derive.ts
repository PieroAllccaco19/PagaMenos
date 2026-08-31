// PagaMenos · pure, deterministic corpus derivations (RT-04 / RT-06).
// Signature kind and required context are CONSEQUENCES of rule semantics, never free authoring.
import type { CanonicalItemQty, RuleVersion } from './types';
import type { ContextReq, PurchaseSignatureKind } from './ids';

/** Structured error thrown when a derivation cannot be made safely (fail-closed). */
export class SignatureDerivationError extends Error {
  constructor(
    public readonly ruleId: string,
    message: string,
  ) {
    super(message);
    this.name = 'SignatureDerivationError';
  }
}

const GENERAL_BILL_SELECTORS = new Set(['WHOLE_BILL', 'FOOD_ONLY', 'FOOD_PLUS_NONALCOHOLIC']);

/**
 * Deterministic, fail-closed derivation of the required PurchaseSignatureKind from rule
 * semantics. Precedence: NOMINAL_PACKAGE > TICKETS > EXACT_BUNDLE > ELIGIBLE_BILL.
 * `signature.kind` is NOT a free corpus-authoring choice; the linter asserts equality.
 */
export function deriveRequiredSignatureKind(rule: RuleVersion): PurchaseSignatureKind {
  const b = rule.benefit;

  // 1. Nominal package (non-cash, same-unit).
  if (b.type === 'NON_CASH_NOMINAL') return 'NOMINAL_PACKAGE';

  // 2. Ticket-structured economics.
  if (rule.eligibleSpendSelector === 'TICKET_UNIT') return 'TICKETS';

  // 3. Exact product/package composition.
  if (
    rule.eligibleSpendSelector === 'EXACT_SKU_BUNDLE' ||
    b.type === 'FIXED_BUNDLE' ||
    b.type === 'FIXED_PRICE'
  ) {
    return 'EXACT_BUNDLE';
  }

  // 4. Genuine bill/subtotal promotion (composition is not the promotion identity).
  if (
    GENERAL_BILL_SELECTORS.has(rule.eligibleSpendSelector) &&
    (b.type === 'PERCENT' || b.type === 'FIXED_DISCOUNT' || b.type === 'CASHBACK')
  ) {
    return 'ELIGIBLE_BILL';
  }

  // Undeterminable ⇒ fail closed (corpus lint failure).
  throw new SignatureDerivationError(
    rule.ruleId,
    `cannot derive a safe PurchaseSignatureKind for benefit=${b.type} selector=${rule.eligibleSpendSelector}`,
  );
}

/** Deterministic derivation of required purchase context from rule semantics (RT-04). */
export function deriveRequiredContext(rule: RuleVersion): Set<ContextReq> {
  const req = new Set<ContextReq>();
  const b = rule.benefit;
  const c = rule.constraints;
  const sel = rule.eligibleSpendSelector;

  // Non-cash nominal packages pay a fixed cash amount for a fixed nominal value: no AMOUNT,
  // no BASKET, no TICKET_PRICE. Only temporal + channel/location gating matters.
  if (b.type === 'NON_CASH_NOMINAL') {
    req.add('DATE_TIME');
    if (c.channels && c.channels.length > 0) req.add('CHANNEL');
    if (c.locations && (c.locations.include?.length || c.locations.exclude?.length)) {
      req.add('LOCATION_OR_BRANCH');
    }
    return req;
  }

  // AMOUNT — value/applicability depends on the transaction amount.
  if (b.type === 'PERCENT') req.add('AMOUNT');
  if (b.type === 'FIXED_DISCOUNT' && b.amountDependent) req.add('AMOUNT');
  if (c.minimumSpend) req.add('AMOUNT');
  if (c.cap) req.add('AMOUNT'); // cap materiality
  if (GENERAL_BILL_SELECTORS.has(sel)) req.add('AMOUNT');

  // BASKET — composition drives eligibility/value.
  if (sel === 'EXACT_SKU_BUNDLE') req.add('BASKET');
  if (sel === 'FOOD_ONLY' || sel === 'FOOD_PLUS_NONALCOHOLIC') req.add('BASKET');
  if (c.products && (c.products.includeSku?.length || c.products.excludeSku?.length)) {
    req.add('BASKET');
  }

  // TICKET_PRICE — ticket-price-dependent economics (UVK / Cineplanet).
  if (sel === 'TICKET_UNIT') req.add('TICKET_PRICE');

  // CHANNEL — any channel constraint.
  if (c.channels && c.channels.length > 0) req.add('CHANNEL');

  // LOCATION_OR_BRANCH — branch inclusion/exclusion.
  if (c.locations && (c.locations.include?.length || c.locations.exclude?.length)) {
    req.add('LOCATION_OR_BRANCH');
  }

  // DATE_TIME — any temporal constraint affects eligibility (a date range is always present).
  req.add('DATE_TIME');

  return req;
}

/** Compare a required-context set against an authored superset (scope.requiredContext). */
export function isContextSuperset(authored: ContextReq[], required: Set<ContextReq>): boolean {
  const have = new Set(authored);
  for (const r of required) if (!have.has(r)) return false;
  return true;
}

export class CanonicalItemError extends Error {}

/**
 * Deterministic normalization for exact-bundle comparison: positive-integer quantities,
 * duplicate item keys REJECTED, sorted by itemKey. Two unequal bundles never normalize equal.
 */
export function normalizeCanonicalItems(items: CanonicalItemQty[]): CanonicalItemQty[] {
  const seen = new Set<string>();
  for (const it of items) {
    if (!it.itemKey || it.itemKey.trim().length === 0) {
      throw new CanonicalItemError('empty itemKey');
    }
    if (!Number.isInteger(it.qty) || it.qty <= 0) {
      throw new CanonicalItemError(`invalid qty for ${it.itemKey}: ${it.qty}`);
    }
    if (seen.has(it.itemKey)) {
      throw new CanonicalItemError(`duplicate itemKey: ${it.itemKey}`);
    }
    seen.add(it.itemKey);
  }
  return [...items].sort((a, b) => (a.itemKey < b.itemKey ? -1 : a.itemKey > b.itemKey ? 1 : 0));
}

/** Structural equality of two canonical item lists after normalization. */
export function canonicalItemsEqual(a: CanonicalItemQty[], b: CanonicalItemQty[]): boolean {
  const na = normalizeCanonicalItems(a);
  const nb = normalizeCanonicalItems(b);
  if (na.length !== nb.length) return false;
  return na.every((it, i) => {
    const other = nb[i];
    return other !== undefined && it.itemKey === other.itemKey && it.qty === other.qty;
  });
}

// PagaMenos · src/study — M3.5B-A2 complete-signature capture + deterministic DecideInput freeze.
//
// COMPLETE-SIGNATURE-ONLY (A2 §1/§3): A2 admits ONLY a context that instantiates exactly one complete
// supported purchase-signature family (single discriminant). This is a stricter A2 capture contract
// than the generic engine PurchaseContext; it does not change M3 engine semantics.
//
// `buildDecideInputFromFinalizedAuthorities` is a PURE, deterministic function of the finalized context
// signature + pinned normalized portfolio + accepted corpus snapshot + trusted evaluatedAt + pinned
// holiday dates (A2 §11/§12). It selects the COMPLETE relevant Corpus scope/rule/op-state set exactly
// as the accepted M3.5A provenance verifier expects, canonicalizes deterministically, and is persisted
// verbatim into the DecisionRequest; a retry never re-runs it. `selectedScopeId`/`baselineByScopeId`
// are omitted by fixed Phase-0A policy (A2 §12.1/§12.3).
import type { DecideInput, EligibilityPortfolio, PurchaseContext } from '@/engine';
import {
  canonicalItemsEqual,
  CHANNELS,
  MERCHANT_IDS,
  NOMINAL_UNITS,
  PURCHASE_DOMAINS,
  type CanonicalItemQty,
  type Channel,
  type ComparisonScope,
  type Corpus,
  type MerchantId,
  type NominalUnit,
  type PurchaseDomain,
  type PurchaseSignature,
  type RuleOperationalState,
  type RuleVersion,
} from '@/corpus';
import { canonicalHash } from '@/persistence/hash';
import { engineInputV1Schema } from '@/persistence/schema';

import { compareUnicodeCodePointStrings } from './eligibility-portfolio';
import {
  PurchaseIntentContextSignatureError,
  PurchaseIntentInvariantError,
} from './purchase-intent-errors';

/** A2 context-capture schema version (A2 §8). */
export const A2_CONTEXT_SCHEMA_VERSION_V1 = 'pagamenos.a2-context.v1';

/** A2 complete-signature discriminant (persisted as `signatureKind`). */
export type A2SignatureKind = 'BILL' | 'TICKETS' | 'EXACT_ITEMS' | 'NOMINAL_PACKAGE';

/** The normalized discriminated purchase signature stored in `purchaseSignatureJson` (A2 §9-context). */
export type A2PurchaseSignature =
  | {
      kind: 'BILL';
      merchantId: MerchantId;
      channel?: Channel;
      branch?: string;
      wholeBillCentimos: number;
      foodCentimos?: number;
      nonAlcoholicBeverageCentimos?: number;
      purchaseDomain: PurchaseDomain;
    }
  | {
      kind: 'TICKETS';
      merchantId: MerchantId;
      channel?: Channel;
      branch?: string;
      ticketUnitPriceCentimos: number;
      ticketCount: number;
      ticketClass: string;
    }
  | {
      kind: 'EXACT_ITEMS';
      merchantId: MerchantId;
      channel?: Channel;
      branch?: string;
      exactItems: CanonicalItemQty[];
    }
  | {
      kind: 'NOMINAL_PACKAGE';
      merchantId: MerchantId;
      channel?: Channel;
      branch?: string;
      nominalPackage: { cashAcquisitionCostCentimos: number; nominalUnit: NominalUnit };
    };

const MERCHANTS = new Set<string>(MERCHANT_IDS);
const CHANNEL_SET = new Set<string>(CHANNELS);
const DOMAINS = new Set<string>(PURCHASE_DOMAINS);
const UNITS = new Set<string>(NOMINAL_UNITS);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function reqCentimos(v: unknown, label: string): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || !Number.isSafeInteger(v)) {
    throw new PurchaseIntentContextSignatureError(
      `${label} must be a non-negative safe integer (céntimos)`,
    );
  }
  return v;
}
function optCentimos(v: unknown, label: string): number | undefined {
  return v === undefined ? undefined : reqCentimos(v, label);
}
function reqPosInt(v: unknown, label: string): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v <= 0 || !Number.isSafeInteger(v)) {
    throw new PurchaseIntentContextSignatureError(`${label} must be a positive safe integer`);
  }
  return v;
}
function reqNonEmptyStr(v: unknown, label: string): string {
  if (typeof v !== 'string' || v.length === 0) {
    throw new PurchaseIntentContextSignatureError(`${label} must be a non-empty string`);
  }
  return v;
}
function optChannel(v: unknown): Channel | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== 'string' || !CHANNEL_SET.has(v)) {
    throw new PurchaseIntentContextSignatureError(`channel must be a valid Channel`);
  }
  return v as Channel;
}
function optBranch(v: unknown): string | undefined {
  if (v === undefined) return undefined;
  return reqNonEmptyStr(v, 'branch');
}
function reqMerchant(v: unknown): MerchantId {
  if (typeof v !== 'string' || !MERCHANTS.has(v)) {
    throw new PurchaseIntentContextSignatureError(`merchantId must be a Corpus MerchantId`);
  }
  return v as MerchantId;
}
function normExactItems(v: unknown): CanonicalItemQty[] {
  if (!Array.isArray(v) || v.length === 0) {
    throw new PurchaseIntentContextSignatureError('exactItems must be a non-empty array');
  }
  const seen = new Set<string>();
  const items: CanonicalItemQty[] = v.map((raw) => {
    if (!isPlainObject(raw))
      throw new PurchaseIntentContextSignatureError('exactItems entry must be an object');
    const itemKey = reqNonEmptyStr(raw['itemKey'], 'exactItems.itemKey');
    const qty = reqPosInt(raw['qty'], 'exactItems.qty');
    if (seen.has(itemKey))
      throw new PurchaseIntentContextSignatureError(
        `duplicate exactItems itemKey ${JSON.stringify(itemKey)}`,
      );
    seen.add(itemKey);
    return { itemKey, qty };
  });
  items.sort((a, b) => compareUnicodeCodePointStrings(a.itemKey, b.itemKey));
  return items;
}

/**
 * Validate + normalize a raw A2 purchase signature under the COMPLETE-SIGNATURE-ONLY policy (A2 §3).
 * Rejects unknown fields, missing required fields, and mixed families (single discriminant).
 */
export function normalizeA2PurchaseSignatureV1(raw: unknown): A2PurchaseSignature {
  if (!isPlainObject(raw))
    throw new PurchaseIntentContextSignatureError('signature must be an object');
  const kind = raw['kind'];
  const allowedCommon = ['kind', 'merchantId', 'channel', 'branch'];
  const merchantId = reqMerchant(raw['merchantId']);
  const channel = optChannel(raw['channel']);
  const branch = optBranch(raw['branch']);
  const common = <T extends object>(
    extra: T,
  ): { merchantId: MerchantId; channel?: Channel; branch?: string } & T => {
    const base: { merchantId: MerchantId; channel?: Channel; branch?: string } = { merchantId };
    if (channel !== undefined) base.channel = channel;
    if (branch !== undefined) base.branch = branch;
    return { ...base, ...extra };
  };
  const checkKeys = (allowed: string[]) => {
    for (const k of Object.keys(raw)) {
      if (!allowed.includes(k))
        throw new PurchaseIntentContextSignatureError(
          `unknown/forbidden signature field ${JSON.stringify(k)} for kind ${String(kind)}`,
        );
    }
  };
  switch (kind) {
    case 'BILL': {
      checkKeys([
        ...allowedCommon,
        'wholeBillCentimos',
        'foodCentimos',
        'nonAlcoholicBeverageCentimos',
        'purchaseDomain',
      ]);
      const wholeBillCentimos = reqCentimos(raw['wholeBillCentimos'], 'wholeBillCentimos');
      const foodCentimos = optCentimos(raw['foodCentimos'], 'foodCentimos');
      const nonAlcoholicBeverageCentimos = optCentimos(
        raw['nonAlcoholicBeverageCentimos'],
        'nonAlcoholicBeverageCentimos',
      );
      if (
        foodCentimos !== undefined &&
        nonAlcoholicBeverageCentimos !== undefined &&
        foodCentimos + nonAlcoholicBeverageCentimos > wholeBillCentimos
      ) {
        throw new PurchaseIntentContextSignatureError(
          'food + nonAlcoholicBeverage exceeds wholeBill',
        );
      }
      const pd = raw['purchaseDomain'];
      if (typeof pd !== 'string' || !DOMAINS.has(pd))
        throw new PurchaseIntentContextSignatureError(
          'purchaseDomain required (Corpus PurchaseDomain) for BILL',
        );
      return common({
        kind: 'BILL' as const,
        wholeBillCentimos,
        ...(foodCentimos !== undefined ? { foodCentimos } : {}),
        ...(nonAlcoholicBeverageCentimos !== undefined ? { nonAlcoholicBeverageCentimos } : {}),
        purchaseDomain: pd as PurchaseDomain,
      });
    }
    case 'TICKETS': {
      checkKeys([...allowedCommon, 'ticketUnitPriceCentimos', 'ticketCount', 'ticketClass']);
      return common({
        kind: 'TICKETS' as const,
        ticketUnitPriceCentimos: reqCentimos(
          raw['ticketUnitPriceCentimos'],
          'ticketUnitPriceCentimos',
        ),
        ticketCount: reqPosInt(raw['ticketCount'], 'ticketCount'),
        ticketClass: reqNonEmptyStr(raw['ticketClass'], 'ticketClass'),
      });
    }
    case 'EXACT_ITEMS': {
      checkKeys([...allowedCommon, 'exactItems']);
      return common({
        kind: 'EXACT_ITEMS' as const,
        exactItems: normExactItems(raw['exactItems']),
      });
    }
    case 'NOMINAL_PACKAGE': {
      checkKeys([...allowedCommon, 'nominalPackage']);
      const np = raw['nominalPackage'];
      if (!isPlainObject(np))
        throw new PurchaseIntentContextSignatureError('nominalPackage must be an object');
      const unit = np['nominalUnit'];
      if (typeof unit !== 'string' || !UNITS.has(unit))
        throw new PurchaseIntentContextSignatureError(
          'nominalPackage.nominalUnit must be a Corpus NominalUnit',
        );
      return common({
        kind: 'NOMINAL_PACKAGE' as const,
        nominalPackage: {
          cashAcquisitionCostCentimos: reqCentimos(
            np['cashAcquisitionCostCentimos'],
            'nominalPackage.cashAcquisitionCostCentimos',
          ),
          nominalUnit: unit as NominalUnit,
        },
      });
    }
    default:
      throw new PurchaseIntentContextSignatureError(
        `unknown signature kind ${JSON.stringify(kind)}`,
      );
  }
}

/** Flatten a normalized A2 signature to the accepted engine PurchaseContext (A2 §11.1). */
export function flattenToPurchaseContext(sig: A2PurchaseSignature): PurchaseContext {
  const ctx: PurchaseContext = { merchantId: sig.merchantId };
  if (sig.channel !== undefined) ctx.channel = sig.channel;
  if (sig.branch !== undefined) ctx.branch = sig.branch;
  switch (sig.kind) {
    case 'BILL':
      ctx.wholeBillCentimos = sig.wholeBillCentimos;
      if (sig.foodCentimos !== undefined) ctx.foodCentimos = sig.foodCentimos;
      if (sig.nonAlcoholicBeverageCentimos !== undefined)
        ctx.nonAlcoholicBeverageCentimos = sig.nonAlcoholicBeverageCentimos;
      ctx.purchaseDomain = sig.purchaseDomain;
      break;
    case 'TICKETS':
      ctx.ticketUnitPriceCentimos = sig.ticketUnitPriceCentimos;
      ctx.ticketCount = sig.ticketCount;
      ctx.ticketClass = sig.ticketClass;
      break;
    case 'EXACT_ITEMS':
      ctx.exactItems = sig.exactItems.map((i) => ({ itemKey: i.itemKey, qty: i.qty }));
      break;
    case 'NOMINAL_PACKAGE':
      ctx.nominalPackage = {
        cashAcquisitionCostCentimos: sig.nominalPackage.cashAcquisitionCostCentimos,
        nominalUnit: sig.nominalPackage.nominalUnit,
      };
      break;
    default: {
      const _e: never = sig;
      throw new PurchaseIntentInvariantError(`unhandled signature ${JSON.stringify(_e)}`);
    }
  }
  return ctx;
}

const ruleKeyOf = (r: Pick<RuleVersion, 'ruleId' | 'version'>): string =>
  `${r.ruleId}@${r.version}`;

/** Mirror of the accepted M3.5A provenance `signatureRelevant` (A2 §12; over corpus types only). */
function signatureRelevant(sig: PurchaseSignature, ctx: PurchaseContext): boolean {
  switch (sig.kind) {
    case 'EXACT_BUNDLE':
      return (
        ctx.exactItems === undefined || canonicalItemsEqual(ctx.exactItems, sig.canonicalItems)
      );
    case 'TICKETS':
      if (ctx.ticketCount === undefined || ctx.ticketClass === undefined) return true;
      return ctx.ticketCount === sig.ticketCount && ctx.ticketClass === sig.ticketClass;
    case 'ELIGIBLE_BILL':
      if (sig.merchantId !== ctx.merchantId) return false;
      if (ctx.purchaseDomain === undefined) return true;
      return ctx.purchaseDomain === sig.purchaseDomain;
    case 'NOMINAL_PACKAGE':
      if (sig.merchantId !== ctx.merchantId) return false;
      if (ctx.nominalPackage === undefined) return true;
      return (
        ctx.nominalPackage.cashAcquisitionCostCentimos === sig.cashAcquisitionCostCentimos &&
        ctx.nominalPackage.nominalUnit === sig.nominalUnit
      );
    default: {
      const _e: never = sig;
      throw new PurchaseIntentInvariantError(`unhandled PurchaseSignature ${JSON.stringify(_e)}`);
    }
  }
}

export interface BuildDecideInputArgs {
  signature: A2PurchaseSignature;
  intendedTransactionAt: string;
  portfolio: EligibilityPortfolio;
  corpus: Corpus;
  evaluatedAt: string;
  holidayCalendar: readonly string[];
}

/**
 * Build the exact validated DecideInput from frozen A2 authorities + the accepted corpus snapshot
 * (A2 §11.2/§12). Deterministic: relevant scopes for the merchant (signatureRelevant), the COMPLETE
 * active rule set for those scopes, their operational states — all canonically ordered. Validated
 * against `engineInputV1Schema`. `selectedScopeId`/`baselineByScopeId` omitted (Phase-0A policy).
 */
export function buildDecideInputFromFinalizedAuthorities(args: BuildDecideInputArgs): DecideInput {
  const context = flattenToPurchaseContext(args.signature);
  const merchant = context.merchantId;
  const relevantScopes = args.corpus.scopes
    .filter((s) => s.merchantId === merchant && signatureRelevant(s.signature, context))
    .slice()
    .sort((a, b) => compareUnicodeCodePointStrings(a.scopeId, b.scopeId));
  const requiredScopeIds = new Set(relevantScopes.map((s) => s.scopeId));
  const rules = args.corpus.activeRules
    .filter((r) => r.comparisonScopeRefs.some((ref) => requiredScopeIds.has(ref)))
    .slice()
    .sort((a, b) => compareUnicodeCodePointStrings(a.ruleId, b.ruleId) || a.version - b.version);
  const includedRuleKeys = new Set(rules.map(ruleKeyOf));
  const stateByKey = new Map<string, RuleOperationalState[]>();
  for (const os of args.corpus.operationalStates) {
    const k = ruleKeyOf(os);
    const arr = stateByKey.get(k);
    if (arr) arr.push(os);
    else stateByKey.set(k, [os]);
  }
  const operationalStates: RuleOperationalState[] = [];
  for (const key of includedRuleKeys) {
    const arr = stateByKey.get(key) ?? [];
    if (arr.length !== 1) {
      throw new PurchaseIntentInvariantError(
        `corpus operational-state cardinality violation for ${key}: expected exactly 1, got ${arr.length}`,
      );
    }
    operationalStates.push(arr[0]!);
  }
  operationalStates.sort(
    (a, b) => compareUnicodeCodePointStrings(a.ruleId, b.ruleId) || a.version - b.version,
  );

  const input: DecideInput = {
    rules: rules as RuleVersion[],
    operationalStates,
    scopes: relevantScopes as ComparisonScope[],
    portfolio: args.portfolio,
    context,
    evaluatedAt: args.evaluatedAt,
    intendedTransactionAt: args.intendedTransactionAt,
    holidayCalendar: [...args.holidayCalendar],
  };
  // Validate the exact payload that will be frozen (accepted frozen v1 contract).
  engineInputV1Schema.parse(input);
  return input;
}

/** The frozen input hash = SHA-256(canonical(validated DecideInput)) == M3.5A inputHash/requestHash. */
export function computeDecideInputHash(input: DecideInput): string {
  return canonicalHash(input);
}

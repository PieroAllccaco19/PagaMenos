// PagaMenos · src/study — M3.5B-A2 total EligibilityPortfolio normalization (A2 §9; V4.3/V4.5).
//
// `normalizeEligibilityPortfolioV1` is a TOTAL function over valid raw input, else a deterministic
// typed rejection. Applied BEFORE persistence / requestHash / domain reconciliation / DecideInput
// construction — no raw-order payload is ever scientific authority. Matching in the accepted engine is
// existential + case-sensitive (`===`/`.includes`), so instruments/memberships are SET-LIKE and case is
// preserved; maps are keyed lookups. Ordering is by an explicit Unicode code-point comparator (never
// `localeCompare`), over the frozen tuple [family, network ?? "", tier ?? "", canonicalize(memberships)].
import type { EligibilityPortfolio, PortfolioInstrument, Tri } from '@/engine';
import { PROVIDER_FAMILIES } from '@/corpus';
import { canonicalize } from '@/persistence/canonical';

import { PurchaseIntentError, PurchaseIntentValidationError } from './purchase-intent-errors';

/** Strict portfolio schema version (A2 §10). */
export const A2_PORTFOLIO_SCHEMA_VERSION_V1 = 'pagamenos.a2-portfolio.v1';

const MAX_TOKEN_LEN = 128;
const NETWORKS = new Set<PortfolioInstrument['network']>(['AMEX', 'VISA', 'MC']);
const TRI_VALUES = new Set<Tri>(['YES', 'NO', 'UNKNOWN']);
const FAMILIES = new Set<string>(PROVIDER_FAMILIES);

/** A distinct raw key trimmed to a normalized key that collides with another raw key (A2 §9). */
export class EligibilityProfileNormalizedKeyCollisionError extends PurchaseIntentError {
  constructor(
    public readonly mapName: 'privateStates' | 'declarations',
    public readonly normalizedKey: string,
  ) {
    super(
      'ELIGIBILITY_PROFILE_KEY_COLLISION',
      `${mapName}: two distinct raw keys normalize to ${JSON.stringify(normalizedKey)}`,
    );
    this.name = 'EligibilityProfileNormalizedKeyCollisionError';
  }
}

/** The comparator returned equality for two instruments that are not structurally identical (A2 §9). */
export class EligibilityProfileInstrumentComparatorInvariantError extends PurchaseIntentError {
  constructor() {
    super(
      'ELIGIBILITY_PROFILE_COMPARATOR_INVARIANT',
      'instrument comparator returned 0 for non-identical normalized instruments',
    );
    this.name = 'EligibilityProfileInstrumentComparatorInvariantError';
  }
}

/** Frozen Unicode code-point string comparator (A2 §4.2). Never locale-sensitive. */
export function compareUnicodeCodePointStrings(a: string, b: string): -1 | 0 | 1 {
  const A = Array.from(a);
  const B = Array.from(b);
  const n = Math.min(A.length, B.length);
  for (let i = 0; i < n; i++) {
    const x = A[i]!.codePointAt(0)!;
    const y = B[i]!.codePointAt(0)!;
    if (x < y) return -1;
    if (x > y) return 1;
  }
  if (A.length < B.length) return -1;
  if (A.length > B.length) return 1;
  return 0;
}

/** Canonical serialization of an instrument's already-normalized memberships (A2 §4.1). Injective. */
export function canonicalMembershipsSerialized(memberships: readonly string[] | undefined): string {
  return canonicalize(memberships ? [...memberships] : []);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function normalizeToken(raw: unknown, label: string): string {
  if (typeof raw !== 'string') {
    throw new PurchaseIntentValidationError(`${label} must be a string`);
  }
  const t = raw.trim();
  if (t.length === 0)
    throw new PurchaseIntentValidationError(`${label} must be non-empty after trim`);
  if (t.length > MAX_TOKEN_LEN) {
    throw new PurchaseIntentValidationError(`${label} exceeds ${MAX_TOKEN_LEN} chars`);
  }
  return t; // exact case preserved (engine matching is case-sensitive)
}

function normalizeMemberships(raw: unknown): string[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) throw new PurchaseIntentValidationError('memberships must be an array');
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of raw) {
    const t = normalizeToken(m, 'membership'); // blank rejected (not silently dropped)
    if (!seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  if (out.length === 0) return undefined; // empty ≡ absent → omit
  out.sort(compareUnicodeCodePointStrings);
  return out;
}

function normalizeInstrument(raw: unknown): PortfolioInstrument {
  if (!isPlainObject(raw)) throw new PurchaseIntentValidationError('instrument must be an object');
  const allowed = new Set(['family', 'network', 'tier', 'memberships']);
  for (const k of Object.keys(raw)) {
    if (!allowed.has(k))
      throw new PurchaseIntentValidationError(`unknown instrument field ${JSON.stringify(k)}`);
  }
  const family = raw['family'];
  if (typeof family !== 'string' || !FAMILIES.has(family)) {
    throw new PurchaseIntentValidationError(`instrument.family must be a ProviderFamily`);
  }
  const network = raw['network'];
  if (network !== undefined && !NETWORKS.has(network as PortfolioInstrument['network'])) {
    throw new PurchaseIntentValidationError(`instrument.network must be AMEX|VISA|MC`);
  }
  const tier =
    raw['tier'] === undefined ? undefined : normalizeToken(raw['tier'], 'instrument.tier');
  const memberships = normalizeMemberships(raw['memberships']);
  const inst: PortfolioInstrument = { family: family as PortfolioInstrument['family'] };
  if (network !== undefined) inst.network = network as 'AMEX' | 'VISA' | 'MC';
  if (tier !== undefined) inst.tier = tier;
  if (memberships !== undefined) inst.memberships = memberships;
  return inst;
}

function instrumentSortTuple(i: PortfolioInstrument): [string, string, string, string] {
  return [i.family, i.network ?? '', i.tier ?? '', canonicalMembershipsSerialized(i.memberships)];
}

/** Component-wise Unicode code-point instrument comparator (A2 §4.3). */
export function compareNormalizedEligibilityInstrumentV1(
  a: PortfolioInstrument,
  b: PortfolioInstrument,
): -1 | 0 | 1 {
  const A = instrumentSortTuple(a);
  const B = instrumentSortTuple(b);
  for (let i = 0; i < 4; i++) {
    const c = compareUnicodeCodePointStrings(A[i]!, B[i]!);
    if (c !== 0) return c;
  }
  // Equality invariant (A2 §4.4): equal tuple ⇒ structurally identical normalized instrument.
  if (canonicalize(a) !== canonicalize(b)) {
    throw new EligibilityProfileInstrumentComparatorInvariantError();
  }
  return 0;
}

function normalizeTriMap(
  raw: unknown,
  mapName: 'privateStates' | 'declarations',
): Record<string, Tri> | undefined {
  if (raw === undefined) return undefined;
  if (!isPlainObject(raw)) throw new PurchaseIntentValidationError(`${mapName} must be an object`);
  const byNorm = new Map<string, { rawKey: string; value: Tri }>();
  for (const [rawKey, value] of Object.entries(raw)) {
    const key = normalizeToken(rawKey, `${mapName} key`);
    if (!TRI_VALUES.has(value as Tri)) {
      throw new PurchaseIntentValidationError(
        `${mapName}[${JSON.stringify(rawKey)}] must be YES|NO|UNKNOWN`,
      );
    }
    const existing = byNorm.get(key);
    if (existing && existing.rawKey !== rawKey) {
      throw new EligibilityProfileNormalizedKeyCollisionError(mapName, key);
    }
    byNorm.set(key, { rawKey, value: value as Tri });
  }
  if (byNorm.size === 0) return undefined; // empty ≡ absent → omit
  const out: Record<string, Tri> = {};
  for (const key of [...byNorm.keys()].sort(compareUnicodeCodePointStrings)) {
    out[key] = byNorm.get(key)!.value;
  }
  return out;
}

/**
 * Normalize a raw eligibility portfolio to the canonical A2 form (A2 §9), or throw a typed rejection.
 * Deterministic and input-order-independent; the returned object is the ONLY scientific authority.
 */
export function normalizeEligibilityPortfolioV1(raw: unknown): EligibilityPortfolio {
  if (!isPlainObject(raw)) throw new PurchaseIntentValidationError('portfolio must be an object');
  const allowed = new Set(['instruments', 'privateStates', 'declarations']);
  for (const k of Object.keys(raw)) {
    if (!allowed.has(k))
      throw new PurchaseIntentValidationError(`unknown portfolio field ${JSON.stringify(k)}`);
  }
  const rawInstruments = raw['instruments'];
  if (!Array.isArray(rawInstruments)) {
    throw new PurchaseIntentValidationError('portfolio.instruments must be an array');
  }
  const normalized = rawInstruments.map(normalizeInstrument);
  // Structural dedup over the canonical representation (A2 §4.5).
  const seen = new Set<string>();
  const deduped: PortfolioInstrument[] = [];
  for (const inst of normalized) {
    const key = canonicalize(inst);
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(inst);
    }
  }
  deduped.sort(compareNormalizedEligibilityInstrumentV1);
  const privateStates = normalizeTriMap(raw['privateStates'], 'privateStates');
  const declarations = normalizeTriMap(raw['declarations'], 'declarations');
  return {
    instruments: deduped,
    ...(privateStates !== undefined ? { privateStates } : {}),
    ...(declarations !== undefined ? { declarations } : {}),
  };
}

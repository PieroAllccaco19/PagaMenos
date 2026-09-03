// PagaMenos · src/study — M3.5B-A2 corpus semantic authority projection + digest (V4.5 §4/§5/§11/§12).
//
// This is the EXACT accepted `pagamenos.corpus-semantic-projection.v1` projection, reproduced from the
// accepted external authority manifest (authority/v1/AUTHORITY_BASELINE_MANIFEST_V1.json at
// PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA = 84a7a1a…). Included top-level collections are exactly
// `scopes`, `activeRules`, `operationalStates`; every other top-level corpus field (corpusId,
// freezeTimestamp, merchants, sources, researchMeta, excludedRules) is EXCLUDED, and `corpusId` is
// therefore never part of the digest preimage. RuleVersion provenance is FULL (sourceId + url +
// observedAt); RuleOperationalState carries all seven fields (note INCLUDED WHEN PRESENT).
//
// TOP-LEVEL ORDER: scopes by scopeId; activeRules by (ruleId, version); operationalStates by
// (ruleId, version). SET-LIKE ARRAY NORMALIZATION (duplicates are invalid → fail): canonical code-point
// sort for requiredContext, allowedSelectors, merchantIds, comparisonScopeRefs, constraints.channels /
// specificBlackoutDates / locations.include / locations.exclude / products.includeSku / products.excludeSku;
// canonicalItems (scope.signature.canonicalItems and rule.canonicalItems) sorted by itemKey; weekdays
// sorted by MON..SUN index. Serialized with the accepted canonicalizer (sha256(canonical(projection))).
// Over the frozen corpus this deterministically reproduces the accepted digest (56639 canonical bytes).
//
// RUNTIME / PRE-FREEZE AUTHORITY GATE (Sol Finding 5): `assertCorpusAuthority` requires the corpus's
// declared `corpusId` to equal the accepted id AND the RECOMPUTED digest to equal the accepted ledger
// anchor `A2_ACCEPTED_CORPUS_SEMANTIC_DIGEST_V1`. The anchor is a FIXED constant equal to the digest in
// the EXTERNAL protected ledger at PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA (asserted in the test suite by
// reading that immutable authority blob) — a candidate-local edit of the corpus source changes the
// recompute and fails the gate, while a candidate-local edit of THIS constant is caught by the external
// ledger equality test / the CI authority-gate. A mutated corpus can therefore never self-approve under
// the same historical corpusId.
import {
  loadCorpus,
  type ComparisonScope,
  type Corpus,
  type RuleOperationalState,
  type RuleVersion,
} from '@/corpus';
import { canonicalHash } from '@/persistence/hash';

import { compareUnicodeCodePointStrings } from './eligibility-portfolio';
import { PurchaseIntentError } from './purchase-intent-errors';

/** The accepted corpus semantic-projection version (metadata; NOT part of the digest preimage). */
export const A2_CORPUS_PROJECTION_VERSION_V1 = 'pagamenos.corpus-semantic-projection.v1';

/** The accepted historical corpusId this authority binds. */
export const A2_ACCEPTED_CORPUS_ID = 'PAGAMENOS_VALIDATION_CORPUS_v1_2026-08-30T1800-0500';

/** The external protected authority anchor (PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA). Documentary; the
 * runtime never reads git — the test suite proves the digest constant equals this authority's ledger. */
export const A2_ACCEPTED_AUTHORITY_BASE_SHA = '84a7a1a30545b1c61ce2b372a95da9005ea46b6c';

/** Raised when the current corpus's identity/recomputed semantic digest ≠ the accepted authority. */
export class CorpusAuthorityMismatchError extends PurchaseIntentError {
  constructor(
    public readonly expectedDigest: string,
    public readonly actualDigest: string,
    message?: string,
  ) {
    super(
      'PURCHASE_INTENT_CORPUS_AUTHORITY_MISMATCH',
      message ??
        `corpus semantic digest ${actualDigest} does not match the accepted authority ${expectedDigest}`,
    );
    this.name = 'CorpusAuthorityMismatchError';
  }
}

const WEEKDAY_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const weekdayIndex = (w: string): number => {
  const i = WEEKDAY_ORDER.indexOf(w);
  return i < 0 ? WEEKDAY_ORDER.length : i;
};

/** Code-point-sort a set-like string array; duplicates are invalid (V4.5). */
function sortStringSet(arr: readonly string[], where: string): string[] {
  const sorted = arr.slice().sort(compareUnicodeCodePointStrings);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1]) {
      throw new CorpusAuthorityMismatchError(
        A2_ACCEPTED_CORPUS_SEMANTIC_DIGEST_V1,
        'duplicate',
        `set-like array ${where} contains a duplicate (${JSON.stringify(sorted[i])})`,
      );
    }
  }
  return sorted;
}

/** Sort canonicalItems by itemKey (code-point). */
function sortItems<T extends { itemKey: string }>(arr: readonly T[]): T[] {
  return arr.slice().sort((a, b) => compareUnicodeCodePointStrings(a.itemKey, b.itemKey));
}

const byRuleKey = (
  a: { ruleId: string; version: number },
  b: { ruleId: string; version: number },
) => compareUnicodeCodePointStrings(a.ruleId, b.ruleId) || a.version - b.version;

/** Normalize one ComparisonScope's set-like arrays (full object preserved). */
function projectScope(s: ComparisonScope): Record<string, unknown> {
  const scope = structuredClone(s) as unknown as Record<string, unknown>;
  scope['requiredContext'] = sortStringSet(
    s.requiredContext as unknown as string[],
    'scope.requiredContext',
  );
  scope['allowedSelectors'] = sortStringSet(
    s.allowedSelectors as unknown as string[],
    'scope.allowedSelectors',
  );
  const sig = scope['signature'] as { canonicalItems?: Array<{ itemKey: string }> } | undefined;
  if (sig?.canonicalItems) sig.canonicalItems = sortItems(sig.canonicalItems);
  return scope;
}

/** Normalize one RuleVersion's set-like arrays (full object incl. full provenance preserved). */
function projectRule(r: RuleVersion): Record<string, unknown> {
  const rule = structuredClone(r) as unknown as Record<string, unknown>;
  rule['merchantIds'] = sortStringSet(r.merchantIds as unknown as string[], 'rule.merchantIds');
  rule['comparisonScopeRefs'] = sortStringSet(r.comparisonScopeRefs, 'rule.comparisonScopeRefs');
  if (r.canonicalItems) rule['canonicalItems'] = sortItems(r.canonicalItems);
  const k = rule['constraints'] as
    | {
        weekdays?: string[];
        channels?: string[];
        specificBlackoutDates?: string[];
        locations?: { include?: string[]; exclude?: string[] };
        products?: { includeSku?: string[]; excludeSku?: string[] };
      }
    | undefined;
  if (k) {
    if (k.weekdays)
      k.weekdays = k.weekdays.slice().sort((a, b) => weekdayIndex(a) - weekdayIndex(b));
    if (k.channels) k.channels = sortStringSet(k.channels, 'constraints.channels');
    if (k.specificBlackoutDates)
      k.specificBlackoutDates = sortStringSet(k.specificBlackoutDates, 'constraints.blackoutDates');
    if (k.locations?.include)
      k.locations.include = sortStringSet(k.locations.include, 'constraints.locations.include');
    if (k.locations?.exclude)
      k.locations.exclude = sortStringSet(k.locations.exclude, 'constraints.locations.exclude');
    if (k.products?.includeSku)
      k.products.includeSku = sortStringSet(
        k.products.includeSku,
        'constraints.products.includeSku',
      );
    if (k.products?.excludeSku)
      k.products.excludeSku = sortStringSet(
        k.products.excludeSku,
        'constraints.products.excludeSku',
      );
  }
  return rule;
}

/** Full RuleOperationalState (all seven fields; `note` INCLUDED WHEN PRESENT via canonicalizer drop). */
function projectOperationalState(o: RuleOperationalState): Record<string, unknown> {
  return structuredClone(o) as unknown as Record<string, unknown>;
}

/**
 * The exact accepted `pagamenos.corpus-semantic-projection.v1` projection (V4.5 §11). Top-level arrays
 * are sorted by scopeId / (ruleId,version); set-like inner arrays are normalized per the accepted spec;
 * `corpusId` and every other top-level corpus field are excluded from the preimage.
 */
export function normalizeCorpusSemanticProjection(corpus: Corpus): Record<string, unknown> {
  const scopes = corpus.scopes
    .slice()
    .sort((a, b) => compareUnicodeCodePointStrings(a.scopeId, b.scopeId))
    .map(projectScope);
  const activeRules = corpus.activeRules.slice().sort(byRuleKey).map(projectRule);
  const operationalStates = corpus.operationalStates
    .slice()
    .sort(byRuleKey)
    .map(projectOperationalState);
  return { scopes, activeRules, operationalStates };
}

/** The SHA-256 semantic digest over the canonical corpus projection (excludes corpusId). */
export function computeCorpusSemanticDigest(corpus: Corpus): string {
  return `sha256:${canonicalHash(normalizeCorpusSemanticProjection(corpus))}`;
}

/**
 * The accepted ledger anchor — a FIXED constant equal to the digest recorded in the EXTERNAL protected
 * corpus release ledger at PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA (84a7a1a…). Recomputed at load and
 * asserted below; the test suite additionally asserts it equals the external ledger blob, so this
 * constant cannot be locally redefined to launder a mutated corpus.
 */
export const A2_ACCEPTED_CORPUS_SEMANTIC_DIGEST_V1 =
  'sha256:ff178a52bf3c3c3492828ae5cc7b8f3e7ca7b843a235ad7671ea2760803aed18';

/**
 * Load-time self-check: the shipped corpus MUST reproduce the accepted ledger anchor under its accepted
 * id. A drift here means an un-ledgered corpus edit reached the build — fail fast rather than freeze
 * decisions under it.
 */
{
  const corpus = loadCorpus();
  const actual = computeCorpusSemanticDigest(corpus);
  if (
    corpus.corpusId !== A2_ACCEPTED_CORPUS_ID ||
    actual !== A2_ACCEPTED_CORPUS_SEMANTIC_DIGEST_V1
  ) {
    throw new CorpusAuthorityMismatchError(A2_ACCEPTED_CORPUS_SEMANTIC_DIGEST_V1, actual);
  }
}

/**
 * Runtime / pre-freeze authority gate (A2 §5; Sol Finding 5). The corpus's declared identity MUST equal
 * the accepted corpusId AND its RECOMPUTED semantic digest MUST equal the accepted external ledger
 * anchor. A mutation to any projected corpus-owned field breaks this equality under an unchanged
 * corpusId ⇒ fail closed before any DecisionRequest is frozen.
 */
export function assertCorpusAuthority(
  corpus: Corpus,
  acceptedDigest: string = A2_ACCEPTED_CORPUS_SEMANTIC_DIGEST_V1,
  acceptedCorpusId: string = A2_ACCEPTED_CORPUS_ID,
): string {
  if (corpus.corpusId !== acceptedCorpusId) {
    throw new CorpusAuthorityMismatchError(
      acceptedDigest,
      computeCorpusSemanticDigest(corpus),
      `corpusId ${corpus.corpusId} is not the accepted authority id ${acceptedCorpusId}`,
    );
  }
  const actual = computeCorpusSemanticDigest(corpus);
  if (actual !== acceptedDigest) {
    throw new CorpusAuthorityMismatchError(acceptedDigest, actual);
  }
  return actual;
}

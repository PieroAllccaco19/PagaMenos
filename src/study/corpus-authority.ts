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
// RUNTIME / PRE-FREEZE AUTHORITY GATE (Sol Finding 5; Sol Closure 1): the accepted corpus identity,
// projection version, and semantic digest are declared ONCE, as DATA, in the immutable runtime
// authority manifest `runtime-corpus-authority.v1.json`. That SAME file is what the CI `authority-gate`
// job compares to the EXTERNAL protected historical ledger selected by
// PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA (see scripts/runtime-authority-check.cjs) — so there is exactly
// ONE candidate runtime authority declaration, consumed by runtime here and externally verified by CI.
//
// The runtime NEVER reads Git, the Git CLI, GitHub, the network, or the protected variable: the
// protected external authority is a BUILD/CI trust root, not a runtime I/O dependency. `assertCorpusAuthority`
// takes ONLY the corpus (no caller-supplied accepted-id/digest overrides): it recomputes the actual
// current corpus projection and requires the corpus's declared `corpusId` to equal the runtime
// declaration's `corpusId` AND the recomputed digest to equal the runtime declaration's digest. A
// candidate-local edit of the corpus source changes the recompute and fails the gate; a candidate-local
// edit of the corpus AND the runtime declaration together (kept internally self-consistent under the
// same historical corpusId) is caught by the CI authority-gate, because the external ledger digest is
// unchanged. A mutated corpus can therefore never self-approve under the same historical corpusId.
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
import runtimeAuthorityDeclaration from './runtime-corpus-authority.v1.json';

/**
 * The single immutable runtime authority declaration (DATA, not editable-in-two-places source). This
 * exact object is also what the CI authority-gate compares to the external historical ledger.
 */
export interface RuntimeCorpusAuthorityDeclaration {
  readonly declarationVersion: string;
  readonly corpusId: string;
  readonly corpusSemanticProjectionVersion: string;
  readonly corpusSemanticDigest: string;
}

/** The frozen accepted runtime authority declaration consumed by every production authority check. */
export const RUNTIME_CORPUS_AUTHORITY: RuntimeCorpusAuthorityDeclaration = Object.freeze(
  runtimeAuthorityDeclaration as RuntimeCorpusAuthorityDeclaration,
);

/** The accepted corpus semantic-projection version (metadata; NOT part of the digest preimage). */
export const A2_CORPUS_PROJECTION_VERSION_V1 =
  RUNTIME_CORPUS_AUTHORITY.corpusSemanticProjectionVersion;

/** The accepted historical corpusId this authority binds (from the single runtime declaration). */
export const A2_ACCEPTED_CORPUS_ID = RUNTIME_CORPUS_AUTHORITY.corpusId;

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
 * The accepted corpus semantic digest — sourced from the SINGLE runtime authority declaration, which
 * the CI authority-gate binds to the digest recorded in the EXTERNAL protected corpus release ledger at
 * PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA. There is no independently-editable second copy; a local edit of
 * the declaration (to launder a mutated corpus) is caught by the CI authority-gate against the ledger.
 */
export const A2_ACCEPTED_CORPUS_SEMANTIC_DIGEST_V1 = RUNTIME_CORPUS_AUTHORITY.corpusSemanticDigest;

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
 * Runtime / pre-freeze authority gate (A2 §5; Sol Finding 5 / Sol Closure 1). Takes ONLY the corpus —
 * NO caller-supplied accepted-id/digest overrides. The corpus's declared identity MUST equal the SINGLE
 * runtime authority declaration's corpusId AND its RECOMPUTED semantic digest MUST equal the runtime
 * declaration's digest. A mutation to any projected corpus-owned field breaks this equality under an
 * unchanged corpusId ⇒ fail closed before any DecisionRequest is frozen. Production callers cannot
 * substitute an alternate accepted authority.
 */
export function assertCorpusAuthority(corpus: Corpus): string {
  return assertCorpusAuthorityAgainst(corpus, RUNTIME_CORPUS_AUTHORITY);
}

/**
 * INTERNAL / TEST-ONLY seam (NOT re-exported by the public `@/study` barrel). Verifies a corpus against
 * an EXPLICIT runtime authority declaration. Production code uses {@link assertCorpusAuthority}, which
 * binds the single accepted declaration; this seam exists solely so tests can exercise alternate/adversarial
 * declarations without a public runtime path being able to inject one.
 */
export function assertCorpusAuthorityAgainst(
  corpus: Corpus,
  declaration: RuntimeCorpusAuthorityDeclaration,
): string {
  if (corpus.corpusId !== declaration.corpusId) {
    throw new CorpusAuthorityMismatchError(
      declaration.corpusSemanticDigest,
      computeCorpusSemanticDigest(corpus),
      `corpusId ${corpus.corpusId} is not the accepted authority id ${declaration.corpusId}`,
    );
  }
  const actual = computeCorpusSemanticDigest(corpus);
  if (actual !== declaration.corpusSemanticDigest) {
    throw new CorpusAuthorityMismatchError(declaration.corpusSemanticDigest, actual);
  }
  return actual;
}

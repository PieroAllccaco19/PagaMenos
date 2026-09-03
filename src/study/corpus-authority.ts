// PagaMenos · src/study — M3.5B-A2 corpus semantic authority projection + digest (A2 §5/§11; V4.5 §3-§11).
//
// The CORPUS-OWNED inputs to the frozen validated DecideInput are `scopes` (ComparisonScope, ALL fields
// incl. `signature`), `activeRules` (RuleVersion, ALL fields incl. full `provenance` = sourceId + url +
// observedAt), and `operationalStates` (RuleOperationalState, ALL SEVEN fields: ruleId, version,
// publicationState, sourceQualityState, availability, asOf, and note WHEN PRESENT). A historical
// `corpusId` MUST bind every one of these values (V4.5 §5). `corpusSemanticDigest` is the deterministic
// SHA-256 over the canonical projection of exactly these fields; `corpusId` itself is EXCLUDED.
//
// RUNTIME AUTHORITY GATE (Sol Finding 5): `assertCorpusAuthority` RE-COMPUTES the current digest and
// compares it to the accepted ledger anchor `A2_ACCEPTED_CORPUS_SEMANTIC_DIGEST_V1`. Any mutation of any
// projected field (e.g. provenance.url, operationalState.asOf/note) changes the recomputed digest ⇒ the
// gate fails closed under an unchanged corpusId. The digest is RECOMPUTED (never a hard-coded
// substitute); the accepted constant is only the ledger value it is checked against. The external
// protected historical-ledger comparison anchored by `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA` is CI's
// responsibility and is deliberately kept separate; this module is the A2 runtime/pre-freeze invariant.
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

/** A2 corpus authority projection version (bumped only if the projection field set changes). */
export const A2_CORPUS_PROJECTION_VERSION_V1 = 'pagamenos.a2-corpus-projection.v1';

/** Raised when the current corpus's recomputed semantic digest ≠ the accepted ledger anchor. */
export class CorpusAuthorityMismatchError extends PurchaseIntentError {
  constructor(
    public readonly expectedDigest: string,
    public readonly actualDigest: string,
  ) {
    super(
      'PURCHASE_INTENT_CORPUS_AUTHORITY_MISMATCH',
      `corpus semantic digest ${actualDigest} does not match the accepted authority ${expectedDigest}`,
    );
    this.name = 'CorpusAuthorityMismatchError';
  }
}

const byRuleKey = (
  a: { ruleId: string; version: number },
  b: { ruleId: string; version: number },
) => compareUnicodeCodePointStrings(a.ruleId, b.ruleId) || a.version - b.version;

/** Project one ComparisonScope (all fields; deterministic). */
function projectScope(s: ComparisonScope): Record<string, unknown> {
  return {
    scopeId: s.scopeId,
    merchantId: s.merchantId,
    comparisonBasis: s.comparisonBasis,
    equivalenceGroup: s.equivalenceGroup,
    purchaseKind: s.purchaseKind,
    requiredContext: s.requiredContext,
    allowedSelectors: s.allowedSelectors,
    signature: s.signature as unknown as Record<string, unknown>,
  };
}

/** Project one RuleVersion (all fields incl. full provenance; deterministic). */
function projectRule(r: RuleVersion): Record<string, unknown> {
  const out: Record<string, unknown> = {
    ruleId: r.ruleId,
    version: r.version,
    campaignId: r.campaignId,
    merchantIds: r.merchantIds,
    providerFamily: r.providerFamily,
    benefit: r.benefit as unknown,
    eligibleSpendSelector: r.eligibleSpendSelector,
    constraints: r.constraints as unknown,
    eligibilityClass: r.eligibilityClass,
    confidence: r.confidence as unknown,
    comparisonScopeRefs: r.comparisonScopeRefs,
    signatureKind: r.signatureKind,
    provenance: {
      sourceId: r.provenance.sourceId,
      url: r.provenance.url,
      observedAt: r.provenance.observedAt,
    },
  };
  if (r.canonicalItems !== undefined) out['canonicalItems'] = r.canonicalItems;
  if (r.ticketContext !== undefined) out['ticketContext'] = r.ticketContext;
  return out;
}

/** Project one RuleOperationalState (all seven fields; `note` only WHEN PRESENT — V4.5 §4/§7). */
function projectOperationalState(o: RuleOperationalState): Record<string, unknown> {
  const out: Record<string, unknown> = {
    ruleId: o.ruleId,
    version: o.version,
    publicationState: o.publicationState,
    sourceQualityState: o.sourceQualityState,
    availability: o.availability,
    asOf: o.asOf,
  };
  if (o.note !== undefined) out['note'] = o.note; // INCLUDE WHEN PRESENT
  return out;
}

/**
 * Deterministic semantic projection of the corpus-owned frozen-input authority (V4.5 §11). Arrays are
 * sorted by their stable identity (scopeId; ruleId@version) so the projection is independent of the
 * corpus authoring order. `corpusId` is intentionally excluded (V4.5 §4).
 */
export function normalizeCorpusSemanticProjection(corpus: Corpus): Record<string, unknown> {
  const scopes = corpus.scopes
    .slice()
    .sort((a, b) => compareUnicodeCodePointStrings(a.scopeId, b.scopeId))
    .map(projectScope);
  const rules = corpus.activeRules.slice().sort(byRuleKey).map(projectRule);
  const operationalStates = corpus.operationalStates
    .slice()
    .sort(byRuleKey)
    .map(projectOperationalState);
  return {
    projectionVersion: A2_CORPUS_PROJECTION_VERSION_V1,
    scopes,
    rules,
    operationalStates,
  };
}

/** The SHA-256 semantic digest over the canonical corpus projection (excludes corpusId). */
export function computeCorpusSemanticDigest(corpus: Corpus): string {
  return `sha256:${canonicalHash(normalizeCorpusSemanticProjection(corpus))}`;
}

/**
 * The accepted ledger anchor for the corpus authority — a FIXED constant (not recomputed from the live
 * corpus, or a corpus mutation could never be detected). Editing any projected corpus-owned field
 * changes `computeCorpusSemanticDigest(loadCorpus())` but NOT this literal, so the runtime gate fails.
 * Updating this value is a deliberate, ledger-anchored authority change (external `PAGAMENOS_ACCEPTED_
 * AUTHORITY_BASE_SHA` governance / CI authority-gate), never a silent local edit.
 */
export const A2_ACCEPTED_CORPUS_SEMANTIC_DIGEST_V1 =
  'sha256:40f6b2f6a16e2d0e70dd173e1d2de7e2fd31d7a3700ed39079cb378d1880379d';

/**
 * Load-time self-check: the shipped corpus MUST match the accepted ledger anchor. A drift here means an
 * un-ledgered corpus edit reached the build — fail fast rather than freeze decisions under it.
 */
{
  const actual = computeCorpusSemanticDigest(loadCorpus());
  if (actual !== A2_ACCEPTED_CORPUS_SEMANTIC_DIGEST_V1) {
    throw new CorpusAuthorityMismatchError(A2_ACCEPTED_CORPUS_SEMANTIC_DIGEST_V1, actual);
  }
}

/**
 * Runtime / pre-freeze authority gate (A2 §5; Sol Finding 5). Recompute the corpus semantic digest and
 * require it to equal the accepted ledger anchor. A mutation to any projected corpus-owned field breaks
 * this equality under an unchanged corpusId ⇒ fail closed before any DecisionRequest is frozen.
 */
export function assertCorpusAuthority(
  corpus: Corpus,
  acceptedDigest: string = A2_ACCEPTED_CORPUS_SEMANTIC_DIGEST_V1,
): string {
  const actual = computeCorpusSemanticDigest(corpus);
  if (actual !== acceptedDigest) {
    throw new CorpusAuthorityMismatchError(acceptedDigest, actual);
  }
  return actual;
}

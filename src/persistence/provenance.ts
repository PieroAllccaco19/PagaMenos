// PagaMenos · persistence — trusted provenance providers (P35A-05 §32–37).
//
// `corpusVersion`, `gitSha`, `buildId` are TRUSTED SYSTEM PROVENANCE, never request/user data. The
// sanctioned write path resolves them from these providers, not from the request. Providers are
// injectable so tests supply a trusted TEST provider — injection is a trusted dependency of service
// construction, NOT a request field. A production request therefore has no way to choose provenance.
import { canonicalItemsEqual, loadCorpus } from '@/corpus';
import type { ComparisonScope, PurchaseSignature, RuleVersion } from '@/corpus';
import type { DecideInput } from '@/engine';

import { resolveBuildMetadata, type BuildMetadata } from './build-meta';
import { CorpusProvenanceError } from './errors';
import { canonicalHash } from './hash';

type PurchaseContext = DecideInput['context'];

// ---- Build metadata provider ----
export interface BuildMetadataProvider {
  /** Resolve validated build metadata (git sha required + format-checked) or throw. */
  resolve(): BuildMetadata;
}

/** Production provider: resolve+validate build metadata from the trusted environment. */
export function envBuildMetadataProvider(
  source?: Record<string, string | undefined>,
): BuildMetadataProvider {
  return { resolve: () => resolveBuildMetadata({}, source) };
}

/**
 * Trusted INJECTION provider (tests / controlled service construction): supply explicit build
 * metadata. Still format-validated via resolveBuildMetadata so tests use realistic Git object ids.
 */
export function fixedBuildMetadataProvider(meta: Partial<BuildMetadata>): BuildMetadataProvider {
  return { resolve: () => resolveBuildMetadata(meta, {}) };
}

// ---- Corpus provenance provider ----

/** The subset of a validated DecideInput needed to verify corpus authenticity + completeness. */
export type CorpusProvenanceInput = Pick<
  DecideInput,
  'rules' | 'scopes' | 'context' | 'selectedScopeId'
>;

export interface CorpusProvenanceProvider {
  /**
   * Verify the static rules/scopes supplied for a NEW decision are (a) AUTHENTIC exact members of the
   * claimed authoritative corpus, and (b) a COMPLETE candidate set for the evaluated comparison —
   * every authoritative candidate that belongs in an evaluated scope is present (§18–§22). Returns the
   * corpus version label; throws `CorpusProvenanceError` otherwise. Operational state is dynamic and
   * NOT checked (§26/§35).
   */
  verify(input: CorpusProvenanceInput): string;
}

function ruleKey(r: Pick<RuleVersion, 'ruleId' | 'version'>): string {
  return `${r.ruleId}@${r.version}`;
}

function setEq(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

/**
 * Whether a scope's frozen PurchaseSignature is RELEVANT to the runtime purchase context (P35A-05
 * §22/§24). This mirrors the accepted engine's identity matcher (MATCH or MISSING ⇒ relevant; a
 * definite NO_MATCH ⇒ irrelevant) using ONLY canonical PurchaseSignature identity semantics — it does
 * NOT evaluate any economic settlement / eligibility / ranking, and it does not touch `src/engine`.
 * `canonicalItemsEqual` is reused from the corpus so EXACT_BUNDLE identity stays byte-identical.
 */
function signatureRelevant(sig: PurchaseSignature, ctx: PurchaseContext): boolean {
  switch (sig.kind) {
    case 'EXACT_BUNDLE':
      // Context missing the basket ⇒ MISSING (relevant); otherwise relevant iff the items match.
      return (
        ctx.exactItems === undefined || canonicalItemsEqual(ctx.exactItems, sig.canonicalItems)
      );
    case 'TICKETS':
      if (ctx.ticketCount === undefined || ctx.ticketClass === undefined) return true; // MISSING
      return ctx.ticketCount === sig.ticketCount && ctx.ticketClass === sig.ticketClass;
    case 'ELIGIBLE_BILL':
      if (sig.merchantId !== ctx.merchantId) return false;
      if (ctx.purchaseDomain === undefined) return true; // MISSING
      return ctx.purchaseDomain === sig.purchaseDomain;
    case 'NOMINAL_PACKAGE':
      if (sig.merchantId !== ctx.merchantId) return false;
      if (ctx.nominalPackage === undefined) return true; // MISSING
      return (
        ctx.nominalPackage.cashAcquisitionCostCentimos === sig.cashAcquisitionCostCentimos &&
        ctx.nominalPackage.nominalUnit === sig.nominalUnit
      );
    default: {
      const _e: never = sig;
      throw new CorpusProvenanceError(`unhandled PurchaseSignature: ${JSON.stringify(_e)}`);
    }
  }
}

/**
 * Production provider: AUTHENTICITY + COMPLETENESS against the authoritative Corpus v1.
 *
 * Authenticity (§30/§36): every supplied rule/scope is an EXACT member (canonical-hash equality) —
 * unknown or mutated ⇒ reject.
 *
 * Completeness (§18–§25): membership is not enough. For every REQUIRED scope the COMPLETE set of
 * currently-active Corpus-v1 rules belonging to that scope must be present (exact `ruleId@version`
 * set equality, order-invariant). Required scopes: the selected scope when `selectedScopeId` is set
 * (its full candidate set must be present; other scopes are not forced, §21); otherwise every
 * Corpus-v1 scope for the runtime merchant whose PurchaseSignature is RELEVANT to the context, and
 * every such relevant scope must be present in the input (§22) so a caller cannot hide a scope to
 * dodge scope-selection. Only the frozen ACTIVE corpus is used (excluded/quarantined history is never
 * an active candidate, §25); dynamic operational state is not consulted (§26).
 */
export function corpusV1ProvenanceProvider(): CorpusProvenanceProvider {
  const corpus = loadCorpus();
  const ruleHashes = new Map<string, string>();
  for (const r of corpus.activeRules) ruleHashes.set(ruleKey(r), canonicalHash(r));
  const scopeHashes = new Map<string, string>();
  for (const s of corpus.scopes) scopeHashes.set(s.scopeId, canonicalHash(s));

  /** The complete active Corpus-v1 rule set (ruleId@version) belonging to a scope. */
  const activeRulesForScope = (scopeId: string): Set<string> =>
    new Set(corpus.activeRules.filter((r) => r.comparisonScopeRefs.includes(scopeId)).map(ruleKey));

  return {
    verify(input): string {
      // 1. AUTHENTICITY — every supplied rule/scope is an exact Corpus-v1 member.
      for (const rule of input.rules) {
        const expected = ruleHashes.get(ruleKey(rule));
        if (expected === undefined) {
          throw new CorpusProvenanceError(
            `rule ${ruleKey(rule)} is not a member of ${corpus.corpusId}`,
          );
        }
        if (canonicalHash(rule) !== expected) {
          throw new CorpusProvenanceError(
            `rule ${ruleKey(rule)} does not match the authoritative ${corpus.corpusId} definition ` +
              `(mutated static field)`,
          );
        }
      }
      for (const scope of input.scopes as ComparisonScope[]) {
        const expected = scopeHashes.get(scope.scopeId);
        if (expected === undefined) {
          throw new CorpusProvenanceError(
            `scope ${scope.scopeId} is not a member of ${corpus.corpusId}`,
          );
        }
        if (canonicalHash(scope) !== expected) {
          throw new CorpusProvenanceError(
            `scope ${scope.scopeId} does not match the authoritative ${corpus.corpusId} definition`,
          );
        }
      }

      // 2. COMPLETENESS — determine the required scope set.
      const merchant = input.context.merchantId;
      const providedScopeIds = new Set(input.scopes.map((s) => s.scopeId));
      const corpusMerchantScopes = corpus.scopes.filter((s) => s.merchantId === merchant);

      let requiredScopeIds: string[];
      if (input.selectedScopeId !== undefined) {
        const sel = corpusMerchantScopes.find((s) => s.scopeId === input.selectedScopeId);
        if (!sel) {
          throw new CorpusProvenanceError(
            `selectedScopeId ${input.selectedScopeId} is not a Corpus-v1 scope for merchant ${merchant}`,
          );
        }
        if (!providedScopeIds.has(sel.scopeId)) {
          throw new CorpusProvenanceError(`selected scope ${sel.scopeId} missing from input`);
        }
        requiredScopeIds = [sel.scopeId];
      } else {
        const relevant = corpusMerchantScopes.filter((s) =>
          signatureRelevant(s.signature, input.context),
        );
        for (const s of relevant) {
          if (!providedScopeIds.has(s.scopeId)) {
            throw new CorpusProvenanceError(
              `Corpus-v1 candidate scope ${s.scopeId} is relevant to this purchase but omitted from ` +
                `the input (incomplete comparison set)`,
            );
          }
        }
        requiredScopeIds = relevant.map((s) => s.scopeId);
      }

      // 3. Per-scope rule completeness for every required scope (order-invariant set equality, §29).
      for (const scopeId of requiredScopeIds) {
        const expected = activeRulesForScope(scopeId);
        const provided = new Set(
          input.rules.filter((r) => r.comparisonScopeRefs.includes(scopeId)).map(ruleKey),
        );
        if (!setEq(expected, provided)) {
          const missing = [...expected].filter((k) => !provided.has(k));
          throw new CorpusProvenanceError(
            `incomplete candidate set for scope ${scopeId}: expected {${[...expected].sort().join(', ')}}, ` +
              `missing {${missing.sort().join(', ')}}`,
          );
        }
      }

      return corpus.corpusId;
    },
  };
}

/**
 * Trusted INJECTION provider (tests / controlled construction ONLY): label the decision with a fixed
 * corpus version WITHOUT corpus-membership verification, for suites that intentionally use synthetic
 * rules. This is a trusted service-construction dependency, NOT a request field — it never
 * reintroduces `request.corpusVersion` (§37).
 */
export function fixedCorpusProvenanceProvider(label: string): CorpusProvenanceProvider {
  if (label.trim().length === 0) {
    throw new CorpusProvenanceError('fixed corpus provenance label must be non-empty');
  }
  return { verify: () => label };
}

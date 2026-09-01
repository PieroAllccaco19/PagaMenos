// PagaMenos · persistence — trusted provenance providers (P35A-05 §32–37).
//
// `corpusVersion`, `gitSha`, `buildId` are TRUSTED SYSTEM PROVENANCE, never request/user data. The
// sanctioned write path resolves them from these providers, not from the request. Providers are
// injectable so tests supply a trusted TEST provider — injection is a trusted dependency of service
// construction, NOT a request field. A production request therefore has no way to choose provenance.
import { loadCorpus } from '@/corpus';
import type { ComparisonScope, RuleVersion } from '@/corpus';
import type { DecideInput } from '@/engine';

import { resolveBuildMetadata, type BuildMetadata } from './build-meta';
import { CorpusProvenanceError } from './errors';
import { canonicalHash } from './hash';

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
export interface CorpusProvenanceProvider {
  /**
   * Verify the static rules/scopes supplied for a NEW decision genuinely originate from the claimed
   * authoritative corpus, and return the corpus version label. Throws `CorpusProvenanceError` if any
   * supplied rule/scope is not an exact member. Operational state is dynamic and NOT checked (§35).
   */
  verify(input: Pick<DecideInput, 'rules' | 'scopes'>): string;
}

function ruleKey(r: Pick<RuleVersion, 'ruleId' | 'version'>): string {
  return `${r.ruleId}@${r.version}`;
}

/**
 * Production provider: verify every supplied static rule/scope is an EXACT member of the authoritative
 * Corpus v1 (by canonical-hash equality). A decision may evaluate any SUBSET of the corpus (§36); it
 * need not contain all rules. An unknown or mutated rule/scope fails provenance — arbitrary rules can
 * never receive the Corpus-v1 label.
 */
export function corpusV1ProvenanceProvider(): CorpusProvenanceProvider {
  const corpus = loadCorpus();
  const ruleHashes = new Map<string, string>();
  for (const r of corpus.activeRules) ruleHashes.set(ruleKey(r), canonicalHash(r));
  const scopeHashes = new Map<string, string>();
  for (const s of corpus.scopes) scopeHashes.set(s.scopeId, canonicalHash(s));

  return {
    verify(input): string {
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

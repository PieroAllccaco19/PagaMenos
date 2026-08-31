// PagaMenos · src/corpus — Corpus v1 typed domain, derivations, schema, linter & loader.
// Pure & deterministic (no db/app/Next/Prisma, no I/O). Domain behavior for M2+ is NOT here.
export * from './ids';
export * from './types';
export * from './derive';
export * from './instant';
export * from './lint';
export { parseCorpus, corpusSchema } from './schema';
export { CORPUS_V1 } from './data';

import { EXPECTED } from './ids';
import type { DecisionClass, OverlapClass, ProviderFamily } from './ids';
import type { Corpus } from './types';
import { CORPUS_V1 } from './data';

/** Load the frozen Corpus v1 (in-memory, pure). */
export function loadCorpus(): Corpus {
  return CORPUS_V1;
}

export interface ReconcileResult {
  merchants: number;
  activeRules: number;
  foodMerchants: number;
  entertainmentMerchants: number;
  providerDistribution: Record<ProviderFamily, number>;
  providerPrivateOverlays: number;
  overlap: Record<OverlapClass, number>;
  decision: Record<DecisionClass, number>;
  removedMerchantsPresent: string[];
  staleCineplanetActive: boolean;
  excludedCount: number;
  mismatches: string[];
}

const REMOVED_HINTS = ['belisario', 'pizza_hut', 'bistecca', 'nacional'];

/** Reconcile the corpus against the frozen Phase 0A-1B targets. `mismatches` empty ⇒ OK. */
export function reconcileCorpus(corpus: Corpus): ReconcileResult {
  const providerDistribution: Record<ProviderFamily, number> = {
    IBK_PLIN: 0,
    DINERS: 0,
    BCP_QORE: 0,
    SIP_OH: 0,
  };
  for (const r of corpus.activeRules) providerDistribution[r.providerFamily] += 1;

  const overlap: Record<OverlapClass, number> = { O2: 0, O3: 0, O4_CONFIRMED: 0 };
  const decision: Record<DecisionClass, number> = {
    DECISION_ENGINE_CORE: 0,
    DECISION_ASSIST: 0,
    DIRECTORY_SUFFICIENT: 0,
  };
  for (const m of corpus.researchMeta) {
    overlap[m.overlapClass] += 1;
    decision[m.decisionClass] += 1;
  }

  const foodMerchants = corpus.merchants.filter((m) => m.category === 'FOOD').length;
  const entertainmentMerchants = corpus.merchants.filter(
    (m) => m.category === 'ENTERTAINMENT',
  ).length;
  const providerPrivateOverlays = corpus.activeRules.filter(
    (r) => r.eligibilityClass === 'PROVIDER_PRIVATE',
  ).length;
  const removedMerchantsPresent = corpus.merchants
    .filter((m) =>
      REMOVED_HINTS.some(
        (h) => m.merchantId.includes(h) || m.displayName.toLowerCase().includes(h),
      ),
    )
    .map((m) => m.merchantId);
  const staleCineplanetActive = corpus.activeRules.some((r) => r.ruleId === 'CIN-SIP-STALE');

  const mismatches: string[] = [];
  const eq = (label: string, got: number, want: number): void => {
    if (got !== want) mismatches.push(`${label}: got ${got}, expected ${want}`);
  };
  eq('merchants', corpus.merchants.length, EXPECTED.merchants);
  eq('activeRules', corpus.activeRules.length, EXPECTED.activeRules);
  eq('foodMerchants', foodMerchants, EXPECTED.foodMerchants);
  eq('entertainmentMerchants', entertainmentMerchants, EXPECTED.entertainmentMerchants);
  eq('providerPrivateOverlays', providerPrivateOverlays, EXPECTED.providerPrivateOverlays);
  for (const fam of ['IBK_PLIN', 'DINERS', 'BCP_QORE', 'SIP_OH'] as const) {
    eq(`provider:${fam}`, providerDistribution[fam], EXPECTED.providerDistribution[fam]);
  }
  for (const k of ['O2', 'O3', 'O4_CONFIRMED'] as const) {
    eq(`overlap:${k}`, overlap[k], EXPECTED.overlap[k]);
  }
  for (const k of ['DECISION_ENGINE_CORE', 'DECISION_ASSIST', 'DIRECTORY_SUFFICIENT'] as const) {
    eq(`decision:${k}`, decision[k], EXPECTED.decision[k]);
  }
  if (removedMerchantsPresent.length > 0) {
    mismatches.push(`removed merchants present: ${removedMerchantsPresent.join(', ')}`);
  }
  if (staleCineplanetActive) mismatches.push('stale Cineplanet Sip rule is active');
  if (corpus.researchMeta.length !== corpus.merchants.length) {
    mismatches.push(
      `researchMeta count ${corpus.researchMeta.length} != merchants ${corpus.merchants.length}`,
    );
  }

  return {
    merchants: corpus.merchants.length,
    activeRules: corpus.activeRules.length,
    foodMerchants,
    entertainmentMerchants,
    providerDistribution,
    providerPrivateOverlays,
    overlap,
    decision,
    removedMerchantsPresent,
    staleCineplanetActive,
    excludedCount: corpus.excludedRules.length,
    mismatches,
  };
}

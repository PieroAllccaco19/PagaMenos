// PagaMenos · engine/golden — shared harness for the M3 canonical golden fixtures.
//
// Golden fixtures use the FROZEN Corpus v1 RULE SEMANTICS (prices, items, providers, constraints)
// pulled by id from CORPUS_V1, and supply a per-fixture OPERATIONAL SNAPSHOT (publication /
// source-quality / availability) plus purchase context, portfolio, and evaluation instants.
//
// Operational state is a SEPARATE runtime axis of the engine's `decide()` input — NOT a corpus
// fact. The corpus ships a conservative default snapshot (dynamic-stock promos default to
// availability=UNKNOWN); a fixture that exercises a confirmed economic comparison legitimately
// supplies a CONFIRMED_AVAILABLE snapshot, exactly as a live source check would. No corpus rule
// value is ever mutated here (verified by the M3 corpus-mutation audit).
import { CORPUS_V1 } from '@/corpus';
import type { ComparisonScope, RuleOperationalState, RuleVersion } from '@/corpus';

import { decide } from '../decide';
import type {
  DecideInput,
  DecisionCandidate,
  EligibilityPortfolio,
  EngineDecisionResult,
  PurchaseContext,
} from '../types';

/** Fetch a frozen active rule by id (throws if absent — a fixture typo must fail loudly). */
export function frozenRule(ruleId: string): RuleVersion {
  const r = CORPUS_V1.activeRules.find((x) => x.ruleId === ruleId);
  if (!r) throw new Error(`golden harness: no active rule '${ruleId}' in Corpus v1`);
  return r;
}

/** Fetch a frozen excluded (history) rule + its operational state by id. */
export function frozenExcluded(ruleId: string): { rule: RuleVersion; op: RuleOperationalState } {
  const ex = CORPUS_V1.excludedRules.find((x) => x.rule.ruleId === ruleId);
  if (!ex) throw new Error(`golden harness: no excluded rule '${ruleId}' in Corpus v1`);
  return { rule: ex.rule, op: ex.operational };
}

/** Fetch a frozen comparison scope by id. */
export function frozenScope(scopeId: string): ComparisonScope {
  const s = CORPUS_V1.scopes.find((x) => x.scopeId === scopeId);
  if (!s) throw new Error(`golden harness: no scope '${scopeId}' in Corpus v1`);
  return s;
}

/**
 * Build an operational snapshot for a rule. Defaults model a live, confirmed check
 * (ACTIVE · FRESH · CONFIRMED_AVAILABLE) so a fixture that does not vary operational state
 * exercises the pure economic comparison. Any axis may be overridden per fixture.
 */
export function opState(
  ruleId: string,
  over: Partial<RuleOperationalState> = {},
): RuleOperationalState {
  return {
    ruleId,
    version: 1,
    publicationState: 'ACTIVE',
    sourceQualityState: 'FRESH',
    availability: 'CONFIRMED_AVAILABLE',
    asOf: '2026-09-01T00:00:00-05:00',
    ...over,
  };
}

/** The full four-family portfolio (participant holds an instrument of every provider family). */
export const PORTFOLIO_ALL: EligibilityPortfolio = {
  instruments: [
    { family: 'IBK_PLIN' },
    { family: 'DINERS' },
    { family: 'BCP_QORE' },
    { family: 'SIP_OH' },
  ],
};

export interface GoldenCase {
  rules: RuleVersion[];
  operationalStates: RuleOperationalState[];
  scopes: ComparisonScope[];
  context: PurchaseContext;
  portfolio?: EligibilityPortfolio;
  evaluatedAt?: string;
  intendedTransactionAt?: string;
  selectedScopeId?: string;
  holidayCalendar?: string[];
  baselineByScopeId?: Record<string, number>;
}

/** Assemble a DecideInput from a GoldenCase with sensible fixture defaults. */
export function toInput(c: GoldenCase): DecideInput {
  const at = c.intendedTransactionAt ?? '2026-09-01T12:00:00-05:00';
  return {
    rules: c.rules,
    operationalStates: c.operationalStates,
    scopes: c.scopes,
    portfolio: c.portfolio ?? PORTFOLIO_ALL,
    context: c.context,
    evaluatedAt: c.evaluatedAt ?? at,
    intendedTransactionAt: at,
    ...(c.selectedScopeId !== undefined ? { selectedScopeId: c.selectedScopeId } : {}),
    ...(c.holidayCalendar !== undefined ? { holidayCalendar: c.holidayCalendar } : {}),
    ...(c.baselineByScopeId !== undefined ? { baselineByScopeId: c.baselineByScopeId } : {}),
  };
}

/** Run the engine over a GoldenCase and return the full evaluation. */
export function runGolden(c: GoldenCase) {
  return decide(toInput(c));
}

/** Convenience: the `final` decision of a single-scope golden case. */
export function finalOf(c: GoldenCase) {
  return runGolden(c).final;
}

/** Look up a candidate in a decision by ruleId. */
export function candidate(
  decision: EngineDecisionResult | undefined,
  ruleId: string,
): DecisionCandidate | undefined {
  return decision?.candidates.find((x) => x.ruleRef.ruleId === ruleId);
}

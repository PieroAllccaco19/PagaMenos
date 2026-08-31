// PagaMenos · blocking corpus linter (fail-closed). Semantic validity beyond schema shape.
// Any returned error MUST block seed acceptance. Never silently normalizes substantive errors.
import {
  canonicalItemsEqual,
  deriveRequiredContext,
  deriveRequiredSignatureKind,
  isContextSuperset,
  normalizeCanonicalItems,
  SignatureDerivationError,
} from './derive';
import { MERCHANT_IDS } from './ids';
import type { ComparisonBasis } from './ids';
import type { ComparisonScope, Corpus, RuleVersion } from './types';

export interface LintError {
  code: string;
  message: string;
  ruleId?: string;
  scopeId?: string;
}

const MERCHANT_ID_SET = new Set<string>(MERCHANT_IDS);

/** Expected ranking basis implied by a rule's benefit (nominal vs cash). */
export function expectedBasis(rule: RuleVersion): ComparisonBasis {
  return rule.benefit.type === 'NON_CASH_NOMINAL'
    ? 'NOMINAL_VALUE_SAME_UNIT'
    : 'EFFECTIVE_OUT_OF_POCKET_COST';
}

function lintTemporal(rule: RuleVersion, errs: LintError[]): void {
  const t = rule.constraints.temporal;
  if (t.kind === 'LOCAL_DATE_RANGE') {
    if (t.startDateInclusive > t.endDateInclusive) {
      errs.push({
        code: 'MALFORMED_TEMPORAL_RANGE',
        ruleId: rule.ruleId,
        message: `date range inverted: ${t.startDateInclusive} > ${t.endDateInclusive}`,
      });
    }
  } else if (t.kind === 'OBSERVED_ACTIVE_UNTIL') {
    // observedActiveAt is provenance, not a start; it must still precede the published end.
    if (t.observedActiveAt > t.endDateInclusive) {
      errs.push({
        code: 'MALFORMED_TEMPORAL_RANGE',
        ruleId: rule.ruleId,
        message: `observed active after published end: ${t.observedActiveAt} > ${t.endDateInclusive}`,
      });
    }
  } else if (t.startInclusive >= t.endExclusive) {
    errs.push({
      code: 'MALFORMED_TEMPORAL_RANGE',
      ruleId: rule.ruleId,
      message: `datetime range not increasing: ${t.startInclusive} >= ${t.endExclusive}`,
    });
  }
}

function lintRuleScopePair(rule: RuleVersion, scope: ComparisonScope, errs: LintError[]): void {
  const tag = { ruleId: rule.ruleId, scopeId: scope.scopeId };

  if (!rule.merchantIds.includes(scope.merchantId)) {
    errs.push({
      code: 'SCOPE_MERCHANT_MISMATCH',
      ...tag,
      message: `scope merchant ${scope.merchantId} not in rule merchants [${rule.merchantIds.join(',')}]`,
    });
  }
  if (scope.comparisonBasis !== expectedBasis(rule)) {
    errs.push({
      code: 'COMPARISON_BASIS_MISMATCH',
      ...tag,
      message: `scope basis ${scope.comparisonBasis} != expected ${expectedBasis(rule)}`,
    });
  }
  if (scope.signature.kind !== rule.signatureKind) {
    errs.push({
      code: 'SIGNATURE_KIND_MISMATCH',
      ...tag,
      message: `scope signature ${scope.signature.kind} != rule signatureKind ${rule.signatureKind}`,
    });
  }
  if (!scope.allowedSelectors.includes(rule.eligibleSpendSelector)) {
    errs.push({
      code: 'SELECTOR_NOT_ALLOWED',
      ...tag,
      message: `selector ${rule.eligibleSpendSelector} not in scope.allowedSelectors [${scope.allowedSelectors.join(',')}]`,
    });
  }
  if (!isContextSuperset(scope.requiredContext, deriveRequiredContext(rule))) {
    const missing = [...deriveRequiredContext(rule)].filter(
      (r) => !scope.requiredContext.includes(r),
    );
    errs.push({
      code: 'REQUIRED_CONTEXT_OMITTED',
      ...tag,
      message: `scope.requiredContext missing [${missing.join(',')}]`,
    });
  }
  if (rule.eligibleSpendSelector === 'NON_EQUIVALENT_PURCHASE') {
    errs.push({
      code: 'NON_EQUIVALENT_IN_RANKABLE_SCOPE',
      ...tag,
      message: 'NON_EQUIVALENT_PURCHASE rule cannot join a rankable scope',
    });
  }

  const sig = scope.signature;
  if (sig.merchantId !== scope.merchantId) {
    errs.push({
      code: 'SIGNATURE_MERCHANT_MISMATCH',
      ...tag,
      message: `signature merchant ${sig.merchantId} != scope merchant ${scope.merchantId}`,
    });
  }
  if (sig.kind === 'EXACT_BUNDLE') {
    if (!rule.canonicalItems) {
      errs.push({
        code: 'EXACT_BUNDLE_MISSING_ITEMS',
        ...tag,
        message: 'rule lacks canonicalItems for EXACT_BUNDLE scope',
      });
    } else if (!canonicalItemsEqual(rule.canonicalItems, sig.canonicalItems)) {
      errs.push({
        code: 'EXACT_BUNDLE_ITEM_MISMATCH',
        ...tag,
        message: 'rule canonicalItems != scope signature canonicalItems',
      });
    }
  } else if (sig.kind === 'TICKETS') {
    if (!rule.ticketContext) {
      errs.push({
        code: 'TICKETS_MISSING_CONTEXT',
        ...tag,
        message: 'rule lacks ticketContext for TICKETS scope',
      });
    } else if (
      rule.ticketContext.ticketCount !== sig.ticketCount ||
      rule.ticketContext.ticketClass !== sig.ticketClass
    ) {
      errs.push({
        code: 'TICKETS_MISMATCH',
        ...tag,
        message: `ticketContext (${rule.ticketContext.ticketCount}/${rule.ticketContext.ticketClass}) != scope (${sig.ticketCount}/${sig.ticketClass})`,
      });
    }
  } else if (sig.kind === 'NOMINAL_PACKAGE') {
    if (rule.benefit.type !== 'NON_CASH_NOMINAL') {
      errs.push({
        code: 'NOMINAL_BENEFIT_MISMATCH',
        ...tag,
        message: 'NOMINAL_PACKAGE scope requires a NON_CASH_NOMINAL benefit',
      });
    } else {
      if (rule.benefit.nominalUnit !== sig.nominalUnit) {
        errs.push({
          code: 'NOMINAL_UNIT_MISMATCH',
          ...tag,
          message: `nominal unit ${rule.benefit.nominalUnit} != scope unit ${sig.nominalUnit}`,
        });
      }
      if (rule.benefit.cashAcquisitionCostCentimos !== sig.cashAcquisitionCostCentimos) {
        errs.push({
          code: 'NOMINAL_ACQUISITION_COST_MISMATCH',
          ...tag,
          message: `cash acquisition cost ${rule.benefit.cashAcquisitionCostCentimos} != scope ${sig.cashAcquisitionCostCentimos}`,
        });
      }
    }
  }
}

/** Full corpus lint. Returns [] when the corpus is acceptable. */
export function lintCorpus(corpus: Corpus): LintError[] {
  const errs: LintError[] = [];
  const merchantIds = new Set(corpus.merchants.map((m) => m.merchantId));
  const sourceIds = new Set(corpus.sources.map((s) => s.sourceId));
  const scopeById = new Map(corpus.scopes.map((s) => [s.scopeId, s]));
  const opByKey = new Map(corpus.operationalStates.map((o) => [`${o.ruleId}@${o.version}`, o]));

  // Scope-level structural checks.
  const scopeIds = new Set<string>();
  for (const scope of corpus.scopes) {
    if (scopeIds.has(scope.scopeId)) {
      errs.push({
        code: 'DUPLICATE_SCOPE_ID',
        scopeId: scope.scopeId,
        message: 'duplicate scopeId',
      });
    }
    scopeIds.add(scope.scopeId);
    if (!merchantIds.has(scope.merchantId)) {
      errs.push({
        code: 'SCOPE_UNKNOWN_MERCHANT',
        scopeId: scope.scopeId,
        message: `unknown merchant ${scope.merchantId}`,
      });
    }
    if (scope.allowedSelectors.length === 0) {
      errs.push({
        code: 'SCOPE_NO_SELECTORS',
        scopeId: scope.scopeId,
        message: 'allowedSelectors empty',
      });
    }
    if (scope.equivalenceGroup.trim().length === 0) {
      errs.push({
        code: 'SCOPE_NO_EQUIVALENCE_GROUP',
        scopeId: scope.scopeId,
        message: 'equivalenceGroup empty',
      });
    }
    if (
      scope.comparisonBasis === 'NOMINAL_VALUE_SAME_UNIT' &&
      scope.signature.kind !== 'NOMINAL_PACKAGE'
    ) {
      errs.push({
        code: 'NOMINAL_BASIS_REQUIRES_NOMINAL_SIGNATURE',
        scopeId: scope.scopeId,
        message: 'nominal basis requires NOMINAL_PACKAGE signature',
      });
    }
  }

  // Rule-level + rule×scope checks.
  const ruleVersionKeys = new Set<string>();
  const ruleIds = new Set<string>();
  for (const rule of corpus.activeRules) {
    if (!rule.ruleId || rule.ruleId.trim().length === 0) {
      errs.push({ code: 'MISSING_RULE_ID', message: 'empty ruleId' });
      continue;
    }
    const vkey = `${rule.ruleId}@${rule.version}`;
    if (ruleVersionKeys.has(vkey)) {
      errs.push({
        code: 'DUPLICATE_RULE_VERSION',
        ruleId: rule.ruleId,
        message: `duplicate ${vkey}`,
      });
    }
    ruleVersionKeys.add(vkey);
    if (ruleIds.has(rule.ruleId)) {
      errs.push({
        code: 'DUPLICATE_RULE_ID',
        ruleId: rule.ruleId,
        message: 'duplicate ruleId in active corpus',
      });
    }
    ruleIds.add(rule.ruleId);

    if (!rule.campaignId || rule.campaignId.trim().length === 0) {
      errs.push({ code: 'MISSING_CAMPAIGN_ID', ruleId: rule.ruleId, message: 'empty campaignId' });
    }
    if (rule.merchantIds.length === 0) {
      errs.push({ code: 'RULE_NO_MERCHANT', ruleId: rule.ruleId, message: 'no merchantIds' });
    }
    for (const m of rule.merchantIds) {
      if (!MERCHANT_ID_SET.has(m) || !merchantIds.has(m)) {
        errs.push({
          code: 'RULE_UNKNOWN_MERCHANT',
          ruleId: rule.ruleId,
          message: `unknown merchant ${m}`,
        });
      }
    }
    if (!rule.provenance || !sourceIds.has(rule.provenance.sourceId)) {
      errs.push({
        code: 'UNKNOWN_SOURCE',
        ruleId: rule.ruleId,
        message: `unknown sourceId ${rule.provenance?.sourceId}`,
      });
    }
    if (!rule.provenance?.url || rule.provenance.url.trim().length === 0) {
      errs.push({
        code: 'MISSING_PROVENANCE_URL',
        ruleId: rule.ruleId,
        message: 'empty provenance.url',
      });
    }
    if (!rule.provenance?.observedAt) {
      errs.push({
        code: 'MISSING_PROVENANCE_OBSERVED_AT',
        ruleId: rule.ruleId,
        message: 'empty provenance.observedAt',
      });
    }
    if (rule.comparisonScopeRefs.length === 0) {
      errs.push({ code: 'RULE_NO_SCOPE', ruleId: rule.ruleId, message: 'no comparisonScopeRefs' });
    }
    if (rule.eligibilityClass === 'PROVIDER_PRIVATE' && !rule.constraints.providerPrivateKey) {
      errs.push({
        code: 'PRIVATE_MISSING_KEY',
        ruleId: rule.ruleId,
        message: 'PROVIDER_PRIVATE rule lacks providerPrivateKey',
      });
    }

    // Signature kind must be derived, not authored freely.
    try {
      const derived = deriveRequiredSignatureKind(rule);
      if (derived !== rule.signatureKind) {
        errs.push({
          code: 'SIGNATURE_KIND_NOT_DERIVED',
          ruleId: rule.ruleId,
          message: `authored ${rule.signatureKind} != derived ${derived}`,
        });
      }
    } catch (e) {
      const msg = e instanceof SignatureDerivationError ? e.message : String(e);
      errs.push({ code: 'SIGNATURE_UNDETERMINABLE', ruleId: rule.ruleId, message: msg });
    }

    // Canonical items well-formed (dup key / invalid qty).
    if (rule.canonicalItems) {
      try {
        normalizeCanonicalItems(rule.canonicalItems);
      } catch (e) {
        errs.push({
          code: 'INVALID_CANONICAL_ITEMS',
          ruleId: rule.ruleId,
          message: String(e instanceof Error ? e.message : e),
        });
      }
    }

    lintTemporal(rule, errs);

    // Operational state present + ACTIVE for active corpus.
    const op = opByKey.get(vkey);
    if (!op) {
      errs.push({
        code: 'MISSING_OPERATIONAL_STATE',
        ruleId: rule.ruleId,
        message: `no operational state for ${vkey}`,
      });
    } else if (op.publicationState !== 'ACTIVE') {
      errs.push({
        code: 'ACTIVE_RULE_NOT_PUBLISHED',
        ruleId: rule.ruleId,
        message: `publicationState ${op.publicationState} != ACTIVE`,
      });
    }

    // Rule × scope.
    for (const ref of rule.comparisonScopeRefs) {
      const scope = scopeById.get(ref);
      if (!scope) {
        errs.push({
          code: 'UNKNOWN_SCOPE_REF',
          ruleId: rule.ruleId,
          message: `unknown scope ${ref}`,
        });
        continue;
      }
      lintRuleScopePair(rule, scope, errs);
    }
  }

  // Excluded rules must NOT be active, and must be quarantined/conflicted/stale.
  for (const ex of corpus.excludedRules) {
    if (ruleIds.has(ex.rule.ruleId)) {
      errs.push({
        code: 'EXCLUDED_RULE_IS_ACTIVE',
        ruleId: ex.rule.ruleId,
        message: 'excluded rule also present in active corpus',
      });
    }
    const okState =
      ex.operational.publicationState === 'QUARANTINED' ||
      ex.operational.publicationState === 'EXPIRED' ||
      ex.operational.sourceQualityState === 'CONFLICTED' ||
      ex.operational.sourceQualityState === 'STALE';
    if (!okState) {
      errs.push({
        code: 'EXCLUDED_RULE_STILL_LIVE',
        ruleId: ex.rule.ruleId,
        message: 'excluded rule not quarantined/expired/conflicted/stale',
      });
    }
  }

  return errs;
}

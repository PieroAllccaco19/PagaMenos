// PagaMenos · engine — tri-state eligibility, availability, source-quality & publication resolvers.
// Conservative (§20/§21/§22/§23/§24/§25/§26). Every reachable enum combination is resolved
// explicitly — no default fallthrough may silently produce a rankable candidate.
import type {
  AvailabilityState,
  Confidence,
  ProviderFamily,
  PublicationState,
  RuleVersion,
  SourceQualityState,
} from '@/corpus';

import { EngineInvariantError } from './errors';
import type { EligibilityPortfolio, Tri } from './types';

export interface EligibilityVerdict {
  eligibility: 'ELIGIBLE' | 'INELIGIBLE' | 'UNKNOWN';
  /** True only when the participant is confirmed eligible AND the candidate may enter ranking. */
  rankable: boolean;
  /** Set when eligibility is UNKNOWN due to a user-resolvable provider-private benefit (§21). */
  providerPrivate?: boolean;
  rejectionReason?: string;
}

function hasFamily(portfolio: EligibilityPortfolio, family: ProviderFamily): boolean {
  return portfolio.instruments.some((i) => i.family === family);
}

// RTM3-07: network/tier facts are PROVIDER-SCOPED. A fact about provider B (e.g. a BCP AMEX card, or
// a global `network:AMEX` declaration) MUST NOT satisfy an IBK AMEX condition. We look only at
// instruments of the relevant family, and declarations keyed to that family (`network:<FAMILY>:AMEX`).
// A held family instrument with a defined, contradictory value beats any declaration (instrument wins).
function resolveNetwork(
  portfolio: EligibilityPortfolio,
  family: ProviderFamily,
  required: string,
): Tri {
  const fam = portfolio.instruments.filter((i) => i.family === family);
  if (fam.some((i) => i.network === required)) return 'YES';
  // Every held instrument of this family has a defined, different network ⇒ the participant does not
  // hold a qualifying card for THIS provider — a declaration cannot override that contradiction.
  if (fam.length > 0 && fam.every((i) => i.network !== undefined && i.network !== required)) {
    return 'NO';
  }
  const decl = portfolio.declarations?.[`network:${family}:${required}`];
  if (decl === 'YES') return 'YES';
  if (decl === 'NO') return 'NO';
  return 'UNKNOWN';
}

function resolveTier(
  portfolio: EligibilityPortfolio,
  family: ProviderFamily,
  required: string,
): Tri {
  const fam = portfolio.instruments.filter((i) => i.family === family);
  if (fam.some((i) => i.tier === required)) return 'YES';
  if (fam.length > 0 && fam.every((i) => i.tier !== undefined && i.tier !== required)) return 'NO';
  const decl = portfolio.declarations?.[`tier:${family}:${required}`];
  if (decl === 'YES') return 'YES';
  if (decl === 'NO') return 'NO';
  return 'UNKNOWN';
}

function resolveMembership(portfolio: EligibilityPortfolio, required: string): Tri {
  if (portfolio.instruments.some((i) => i.memberships?.includes(required))) return 'YES';
  const decl = portfolio.declarations?.[`membership:${required}`];
  if (decl === 'YES') return 'YES';
  if (decl === 'NO') return 'NO';
  return 'UNKNOWN';
}

/**
 * Conservative tri-state eligibility. Provider-private YES *or* UNKNOWN is never rankable in M2 —
 * it can only ever surface as a VERIFY_FIRST advisory (§21). Ordinary USER_DECLARABLE facts rank
 * only when explicitly YES; UNKNOWN is never silently YES (§22). Owning one instrument never
 * implies a private benefit on another (privateStates are looked up independently, §20).
 */
export function evaluateEligibility(
  rule: RuleVersion,
  portfolio: EligibilityPortfolio,
): EligibilityVerdict {
  if (!hasFamily(portfolio, rule.providerFamily)) {
    return {
      eligibility: 'INELIGIBLE',
      rankable: false,
      rejectionReason: `provider family ${rule.providerFamily} not held`,
    };
  }

  if (rule.eligibilityClass === 'PROVIDER_PRIVATE') {
    const key = rule.constraints.providerPrivateKey;
    const state: Tri = (key && portfolio.privateStates?.[key]) || 'UNKNOWN';
    if (state === 'NO') {
      return {
        eligibility: 'INELIGIBLE',
        rankable: false,
        rejectionReason: `provider-private ${key ?? '?'} = NO`,
      };
    }
    // YES or UNKNOWN ⇒ non-rankable, user-resolvable VERIFY_FIRST advisory.
    return { eligibility: 'UNKNOWN', rankable: false, providerPrivate: true };
  }

  // Required declared facts from the rule's constraints.
  const facts: Tri[] = [];
  const c = rule.constraints;
  if (c.cardNetwork && c.cardNetwork !== 'ANY')
    facts.push(resolveNetwork(portfolio, rule.providerFamily, c.cardNetwork));
  if (c.cardTier) facts.push(resolveTier(portfolio, rule.providerFamily, c.cardTier));
  if (c.membership) facts.push(resolveMembership(portfolio, c.membership));

  if (facts.some((t) => t === 'NO')) {
    return {
      eligibility: 'INELIGIBLE',
      rankable: false,
      rejectionReason: 'required instrument/membership fact = NO',
    };
  }
  if (facts.some((t) => t === 'UNKNOWN')) {
    // Undeclared user-declarable fact — never silently treated as YES (§22).
    return {
      eligibility: 'UNKNOWN',
      rankable: false,
      rejectionReason: 'required user-declarable fact = UNKNOWN',
    };
  }
  return { eligibility: 'ELIGIBLE', rankable: true };
}

// ---- Publication resolver (§25) — total, no default ----
export interface PublicationVerdict {
  rankable: boolean;
  rejectionReason?: string;
}
export function resolvePublication(state: PublicationState): PublicationVerdict {
  switch (state) {
    case 'ACTIVE':
      return { rankable: true };
    case 'FUTURE':
      return { rankable: false, rejectionReason: 'publication FUTURE (not yet live)' };
    case 'EXPIRED':
      return { rankable: false, rejectionReason: 'publication EXPIRED' };
    case 'QUARANTINED':
      return { rankable: false, rejectionReason: 'publication QUARANTINED' };
    default: {
      const _exhaustive: never = state;
      throw new EngineInvariantError(
        'PUBLICATION_STATE',
        `unhandled PublicationState: ${String(_exhaustive)}`,
      );
    }
  }
}

// ---- Source-quality resolver (§26) — total, no default ----
export interface SourceVerdict {
  rankable: boolean;
  /** Uncertainty class carried forward for status precedence (SOURCE_CONFLICT > SOURCE_STALE). */
  uncertainty?: 'STALE' | 'CONFLICTED' | 'UNKNOWN';
  rejectionReason?: string;
}
export function resolveSourceQuality(state: SourceQualityState): SourceVerdict {
  switch (state) {
    case 'FRESH':
      return { rankable: true };
    case 'STALE':
      return { rankable: false, uncertainty: 'STALE', rejectionReason: 'source STALE' };
    case 'INACCESSIBLE':
      // Treated conservatively as stale/source-uncertainty.
      return { rankable: false, uncertainty: 'STALE', rejectionReason: 'source INACCESSIBLE' };
    case 'CONFLICTED':
      return { rankable: false, uncertainty: 'CONFLICTED', rejectionReason: 'source CONFLICTED' };
    case 'UNKNOWN':
      return { rankable: false, uncertainty: 'UNKNOWN', rejectionReason: 'source UNKNOWN' };
    default: {
      const _exhaustive: never = state;
      throw new EngineInvariantError(
        'SOURCE_QUALITY_STATE',
        `unhandled SourceQualityState: ${String(_exhaustive)}`,
      );
    }
  }
}

// ---- Availability resolver (§23) — total, no default ----
export interface AvailabilityVerdict {
  rankable: boolean;
  /** UNKNOWN availability that is not confirmed — carries a DYNAMIC_AVAILABILITY uncertainty. */
  uncertain: boolean;
  preRedemptionVerifiable: boolean;
  rejectionReason?: string;
}
export function resolveAvailability(
  state: AvailabilityState,
  preRedemptionVerifiable: boolean,
): AvailabilityVerdict {
  switch (state) {
    case 'CONFIRMED_AVAILABLE':
      return { rankable: true, uncertain: false, preRedemptionVerifiable };
    case 'NOT_APPLICABLE':
      return { rankable: true, uncertain: false, preRedemptionVerifiable };
    case 'CONFIRMED_UNAVAILABLE':
      return {
        rankable: false,
        uncertain: false,
        preRedemptionVerifiable,
        rejectionReason: 'CONFIRMED_UNAVAILABLE',
      };
    case 'UNKNOWN':
      // UNKNOWN availability is uncertainty — it MUST NOT create LIKELY; materiality decides.
      return { rankable: false, uncertain: true, preRedemptionVerifiable };
    default: {
      const _exhaustive: never = state;
      throw new EngineInvariantError(
        'AVAILABILITY_STATE',
        `unhandled AvailabilityState: ${String(_exhaustive)}`,
      );
    }
  }
}

/** LOW confidence is never participant-rankable (§24). */
export function confidenceRankable(confidence: Confidence): boolean {
  return confidence === 'HIGH' || confidence === 'MEDIUM';
}

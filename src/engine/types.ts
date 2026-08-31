// PagaMenos · engine — pure input/output types (§4/§5/§6/§7/§9/§10/§27/§30).
// Build-free: NO gitSha / buildId / env / persistence fields. Money is integer céntimos;
// nominal value is integer minor units in a named unit; the two are never conflated.
import type {
  Centimos,
  Channel,
  ComparisonBasis,
  Confidence,
  MerchantId,
  NominalUnit,
  ProviderFamily,
} from '@/corpus';

// ---- Eligibility portfolio (declarative, card-number-free; §7) ----
export type Tri = 'YES' | 'NO' | 'UNKNOWN';

export interface PortfolioInstrument {
  family: ProviderFamily;
  network?: 'AMEX' | 'VISA' | 'MC';
  tier?: string;
  memberships?: string[];
}

export interface EligibilityPortfolio {
  instruments: PortfolioInstrument[];
  /** Provider-private on/off snapshots, e.g. { qore_active: 'UNKNOWN' }. Independent per key. */
  privateStates?: Record<string, Tri>;
  /** Explicit user-declarable facts, canonical tokens e.g. "membership:CINEPLANET_SOCIO":'YES'. */
  declarations?: Record<string, Tri>;
}

// ---- Purchase context (§16/§17) ----
export interface PurchaseContext {
  merchantId: MerchantId;
  channel?: Channel;
  branch?: string;
  wholeBillCentimos?: Centimos;
  foodCentimos?: Centimos;
  nonAlcoholicBeverageCentimos?: Centimos;
  ticketUnitPriceCentimos?: Centimos;
  ticketCount?: number;
  /** Whether the exact bundle that a FIXED_PRICE/FIXED_BUNDLE/EXACT_SKU rule identifies is present. */
  hasExactBundle?: boolean;
}

// ---- Bounds / materiality (§27/§28, RT-05) ----
export type BoundProof =
  | {
      kind: 'CURRENT_EXPLICIT_LIMIT';
      proofRef: string;
      sourceCheckId: string;
      reviewedBy: string;
      reviewedAt: string;
      derivation: string;
    }
  | {
      kind: 'CURRENT_UNCAPPED_FUNCTION_BOUND';
      proofRef: string;
      sourceCheckId: string;
      reviewedBy: string;
      reviewedAt: string;
      derivation: string;
    }
  | {
      kind: 'CURRENT_CONFIRMED_ZERO_AVAILABILITY';
      proofRef: string;
      sourceCheckId: string;
      reviewedBy: string;
      reviewedAt: string;
      derivation: string;
    };

export type PlausibleBound =
  | {
      basis: 'EFFECTIVE_OUT_OF_POCKET_COST';
      kind: 'KNOWN_BOUND';
      minPlausibleCostCentimos: Centimos;
      proof: BoundProof;
    }
  | {
      basis: 'NOMINAL_VALUE_SAME_UNIT';
      kind: 'KNOWN_BOUND';
      maxPlausibleValueMinorUnits: number;
      unit: NominalUnit;
      proof: BoundProof;
    }
  | { kind: 'UNKNOWN_OR_UNBOUNDED'; reason: string };

// ---- Rank delta (basis-aware; NEVER a bare differenceCentimos, §9) ----
export type RankDelta =
  | { kind: 'COST_CENTIMOS'; amountCentimos: Centimos }
  | { kind: 'NOMINAL_VALUE'; amountMinorUnits: number; unit: NominalUnit }
  | null;

// ---- Decision & advisory vocabularies (§6/§7) ----
export type DecisionStatus =
  | 'BEST_CONFIRMED'
  | 'CONFIRMED_TIE'
  | 'LIKELY'
  | 'VERIFY_FIRST'
  | 'NO_SAFE_WINNER'
  | 'NO_APPLICABLE_BENEFIT'
  | 'SOURCE_STALE'
  | 'SOURCE_CONFLICT';

export type CandidateAdvisory =
  | 'VERIFY_FIRST'
  | 'STALE_CANDIDATE'
  | 'CONFLICTED_CANDIDATE'
  | 'NON_COMPARABLE'
  | 'NON_EQUIVALENT_PURCHASE'
  | 'DYNAMIC_AVAILABILITY'
  | 'UNKNOWN_CAP'
  | 'UNKNOWN_COMBINABILITY'
  | 'MISSING_CONTEXT';

export interface RuleRef {
  ruleId: string;
  version: number;
}

// ---- Per-candidate audit record (§30) ----
export interface DecisionCandidate {
  ruleRef: RuleRef;
  scopeId: string;
  comparisonBasis: ComparisonBasis;
  eligibility: 'ELIGIBLE' | 'INELIGIBLE' | 'UNKNOWN';
  /** True iff this candidate was placed in the rankable set (a confirmable economic value). */
  rankable: boolean;
  effectiveCostCentimos?: Centimos | undefined;
  nominalValue?: { minorUnits: number; unit: NominalUnit } | undefined;
  cashbackCentimos?: Centimos | undefined;
  /** Explanation / VS3 / RIVSR only — NEVER a ranking key. */
  penSavedCentimos?: Centimos | undefined;
  baselineRef?: string | undefined;
  plausibleBound: PlausibleBound;
  couldChangeDecision: boolean;
  confidence: Confidence;
  advisories: CandidateAdvisory[];
  rejectionReason?: string | undefined;
}

// ---- Per-scope decision (§5) ----
export interface EngineDecisionResult {
  scopeId: string;
  merchantId: MerchantId;
  comparisonBasis: ComparisonBasis;
  status: DecisionStatus;
  winnerRef?: RuleRef | undefined;
  runnerUpRef?: RuleRef | undefined;
  delta: RankDelta;
  candidates: DecisionCandidate[];
  advisories: DecisionCandidate[];
  explanation: string;
}

export interface ScopeDecisionResult {
  scopeId: string;
  merchantId: MerchantId;
  comparisonBasis: ComparisonBasis;
  decision: EngineDecisionResult;
}

// ---- Top-level evaluation (§5) ----
export interface EngineEvaluation {
  merchantId: MerchantId;
  matchedScopes: ScopeDecisionResult[];
  requiresScopeSelection: boolean;
  selectedScopeId?: string | undefined;
  final?: EngineDecisionResult | undefined;
  evaluatedAt: string;
  intendedTransactionAt: string;
}

// ---- decide() input (§4) ----
export interface DecideInput {
  rules: import('@/corpus').RuleVersion[];
  operationalStates: import('@/corpus').RuleOperationalState[];
  scopes: import('@/corpus').ComparisonScope[];
  portfolio: EligibilityPortfolio;
  context: PurchaseContext;
  evaluatedAt: string;
  intendedTransactionAt: string;
  selectedScopeId?: string;
  /** Authoritative explicit Lima holiday dates (YYYY-MM-DD); no external lookup. */
  holidayCalendar?: string[];
  /** Common independent baselines for display-only penSaved, keyed by scopeId (§15). */
  baselineByScopeId?: Record<string, Centimos>;
}

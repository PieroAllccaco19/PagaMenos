// PagaMenos · src/engine — pure, deterministic decision engine (M2).
//
// INVARIANT (mechanically enforced by eslint.config.mjs + src/lib/boundary.test.ts):
// this layer MUST NOT import db / app / analytics / sourcemon / services, Next, React,
// Prisma, or perform any I/O (fs / net / http / process / env / git). Build metadata is
// attached only at the persistence boundary (M3.5), never read inside the engine.
//
// Deliberately small public surface (§39): the evaluator entry points, the input/output
// types, and the typed invariant errors. Arithmetic/eligibility/source/bounds internals stay
// private (they are unit-tested directly by the engine test suite via relative imports).
export { decide, evaluateScope } from './decide';

export {
  EngineInvariantError,
  CrossMerchantMembershipError,
  ComparisonBasisMismatchError,
  SettlementInvariantError,
  TemporalInputError,
} from './errors';

export type {
  Tri,
  PortfolioInstrument,
  EligibilityPortfolio,
  PurchaseContext,
  RuntimeNominalPackage,
  BoundProof,
  PlausibleBound,
  RankDelta,
  DecisionStatus,
  CandidateAdvisory,
  RuleRef,
  DecisionCandidate,
  EngineDecisionResult,
  ScopeDecisionResult,
  EngineEvaluation,
  DecideInput,
} from './types';

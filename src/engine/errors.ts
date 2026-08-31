// PagaMenos · engine — typed domain-invariant errors (fail-closed, §36).
// The pure evaluator NEVER catches these and defaults to a winner; an impossible domain
// combination surfaces as an explicit typed throw at the pure boundary.

/** Base class for all engine invariant violations. */
export class EngineInvariantError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'EngineInvariantError';
  }
}

/** A rule was offered to a scope whose merchant it does not serve (cross-merchant membership). */
export class CrossMerchantMembershipError extends EngineInvariantError {
  constructor(
    ruleId: string,
    ruleMerchants: readonly string[],
    scopeId: string,
    scopeMerchant: string,
  ) {
    super(
      'CROSS_MERCHANT_MEMBERSHIP',
      `rule ${ruleId} (merchants [${ruleMerchants.join(',')}]) cannot be a member of scope ${scopeId} (merchant ${scopeMerchant})`,
    );
    this.name = 'CrossMerchantMembershipError';
  }
}

/** A candidate's derived comparison basis disagrees with its scope's declared basis. */
export class ComparisonBasisMismatchError extends EngineInvariantError {
  constructor(ruleId: string, ruleBasis: string, scopeId: string, scopeBasis: string) {
    super(
      'COMPARISON_BASIS_MISMATCH',
      `rule ${ruleId} basis ${ruleBasis} disagrees with scope ${scopeId} basis ${scopeBasis}`,
    );
    this.name = 'ComparisonBasisMismatchError';
  }
}

/** A settlement input is structurally impossible (e.g. EXACT_FIXED rounding on a percentage). */
export class SettlementInvariantError extends EngineInvariantError {
  constructor(message: string) {
    super('SETTLEMENT_INVARIANT', message);
    this.name = 'SettlementInvariantError';
  }
}

/** A temporal value could not be parsed as a valid instant/local date. */
export class TemporalInputError extends EngineInvariantError {
  constructor(message: string) {
    super('TEMPORAL_INPUT', message);
    this.name = 'TemporalInputError';
  }
}

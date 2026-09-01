// PagaMenos · src/persistence — snapshot & contract version constants (§5/§7).
//
// These strings pin the *meaning* of a persisted decision. They are stamped onto every
// DecisionSnapshot and are the coordinate a future reader uses to select the correct historical
// parser. They MUST be bumped (never silently redefined) whenever the shape or semantics of a
// persisted payload changes, so that an unknown/older payload is never parsed as if it were current.
//
// PURITY: this module holds constants only (no engine import, no I/O). The engine deliberately does
// NOT know its own contract version (build/version metadata lives at the persistence boundary, §9).

/** Structural version of the whole DecisionSnapshot record (envelope + column set). */
export const SNAPSHOT_SCHEMA_VERSION = 'pagamenos.decision-snapshot.v1';

/** Version of the serialized `engineInputJson` payload contract. */
export const ENGINE_INPUT_SCHEMA_VERSION = 'pagamenos.engine-input.v1';

/** Version of the serialized `engineOutputJson` payload contract. */
export const ENGINE_OUTPUT_SCHEMA_VERSION = 'pagamenos.engine-output.v1';

/**
 * Version of the pure engine decision *contract* (the accepted M3 semantics: DecideInput →
 * EngineEvaluation). A change to the engine's economic behavior/shape must bump this so a persisted
 * record records which contract produced it. Distinct from `gitSha` (which build persisted it) and
 * from `corpusVersion` (which factual corpus it evaluated).
 */
export const ENGINE_CONTRACT_VERSION = 'pagamenos.engine.m3.v1';

// PagaMenos · src/persistence — CURATED public surface (P35A-02 §14/§43).
//
// This barrel exposes ONLY read-safe helpers, versioned schemas (for validation), typed errors, and
// types. It deliberately does NOT export the write constructors or provenance providers — the draft
// constructor `buildDecisionSnapshotDraft`, the `DecisionPersistenceStore` implementation, and the
// trusted build/corpus providers live in internal modules (`./snapshot`, `./provenance`,
// `./build-meta`) imported ONLY by the sanctioned service (and infra), so normal application code
// cannot assemble/persist an arbitrary snapshot by importing this barrel. The engine/corpus purity
// boundary is unaffected (persistence may import the engine; the reverse is forbidden).
export { canonicalize, assertCanonicalizable, type Canonicalizable } from './canonical';
export { sha256Hex, canonicalHash } from './hash';

export {
  SNAPSHOT_SCHEMA_VERSION,
  ENGINE_INPUT_SCHEMA_VERSION,
  ENGINE_OUTPUT_SCHEMA_VERSION,
  ENGINE_CONTRACT_VERSION,
} from './versions';

// Read/validation-only schema surface (no write capability).
export {
  engineInputV1Schema,
  engineOutputV1Schema,
  decisionSnapshotDtoSchema,
  parseDecisionSnapshot,
  type EngineInputV1,
  type EngineOutputV1,
  type DecisionSnapshotDto,
} from './schema';

// Read-side integrity/coherence + diagnostic replay (never mutate history).
export {
  verifySnapshotIntegrity,
  verifyHistoricalSnapshot,
  replayWithCurrentEngine,
  type ReplayComparison,
} from './integrity';

export { verifySnapshotCoherence, type DecisionSnapshotDraft } from './snapshot';

export type { BuildMetadata } from './build-meta';

export {
  PersistenceError,
  IdempotencyConflictError,
  BusinessDecisionConflictError,
  SnapshotIntegrityError,
  SnapshotCoherenceError,
  UnsupportedSnapshotVersionError,
  CorpusProvenanceError,
  BuildProvenanceError,
  PersistenceInvariantError,
} from './errors';

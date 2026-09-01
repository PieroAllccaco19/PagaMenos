// PagaMenos · src/persistence — public surface for immutable decision persistence (M3.5A).
//
// Pure/near-pure helpers: canonical serialization, hashing, frozen v1 payload schemas, snapshot
// assembly, integrity + diagnostic replay, build metadata, and the typed persistence errors. This
// layer may import the pure engine (§29 allows persistence → engine) and Node crypto; it holds no
// Prisma/DB client (that is `src/db`). The engine/corpus purity boundary is unaffected.
export { canonicalize, type Canonicalizable } from './canonical';
export { sha256Hex, canonicalHash } from './hash';

export {
  SNAPSHOT_SCHEMA_VERSION,
  ENGINE_INPUT_SCHEMA_VERSION,
  ENGINE_OUTPUT_SCHEMA_VERSION,
  ENGINE_CONTRACT_VERSION,
} from './versions';

export {
  engineInputV1Schema,
  engineOutputV1Schema,
  decisionSnapshotDtoSchema,
  type EngineInputV1,
  type EngineOutputV1,
  type DecisionSnapshotDto,
} from './schema';

export {
  buildDecisionSnapshotDraft,
  parseDecisionSnapshotDto,
  deriveDecisionStatus,
  REQUIRES_SCOPE_SELECTION,
  type DecisionSnapshotDraft,
  type DecisionSnapshotStore,
  type BuildDraftArgs,
} from './snapshot';

export {
  verifySnapshotIntegrity,
  replayWithCurrentEngine,
  type ReplayComparison,
} from './integrity';

export { resolveBuildMetadata, type BuildMetadata } from './build-meta';

export {
  PersistenceError,
  IdempotencyConflictError,
  BusinessDecisionConflictError,
  SnapshotIntegrityError,
  PersistenceInvariantError,
} from './errors';

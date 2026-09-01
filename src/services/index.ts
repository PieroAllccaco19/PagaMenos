// PagaMenos · src/services — SANCTIONED public surface for decision persistence (§29/§43).
//
// Normal application code uses ONLY these one-argument functions to persist/read historical
// decisions. `decideAndPersist(request)` binds the TRUSTED production dependencies — provenance/build
// providers and the repository are NOT injectable through the public surface (P35A-05 §21). Historical
// reads go through `loadDecisionSnapshot` / `replayDecisionSnapshot`, which verify hash integrity +
// column↔payload coherence. The raw db client, repository, draft constructor, providers, and the
// injectable `*WithDeps` / `DecideAndPersistDeps` surface are deliberately NOT re-exported here.
export {
  decideAndPersist,
  loadDecisionSnapshot,
  replayDecisionSnapshot,
  type DecideAndPersistRequest,
} from './decide-and-persist';

// Types + typed errors consumers need to handle results/failures (read-only; no write capability).
export type { DecisionSnapshotDto, ReplayComparison } from '@/persistence';
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
} from '@/persistence';

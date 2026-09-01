// PagaMenos · src/services — SANCTIONED public surface for decision persistence (§29/§43).
//
// Normal application code uses ONLY these functions to persist/read historical decisions. Write goes
// through `decideAndPersist` (validate → decide once → trusted provenance → atomic persist);
// historical reads go through `loadDecisionSnapshot` / `replayDecisionSnapshot`, which verify hash
// integrity + column↔payload coherence. The raw db client, repository write API and snapshot draft
// constructor are NOT reachable from here.
export {
  decideAndPersist,
  loadDecisionSnapshot,
  replayDecisionSnapshot,
  type DecideAndPersistRequest,
  type DecideAndPersistDeps,
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

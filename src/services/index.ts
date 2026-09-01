// PagaMenos · src/services — use-case orchestration over engine + db + persistence (§29).
// May import the pure engine/corpus layers and the db/persistence layers. M3.5A implements the
// decide-and-persist use case for immutable decision snapshots.
export {
  decideAndPersist,
  loadDecisionSnapshot,
  replayDecisionSnapshot,
  type DecideAndPersistRequest,
  type DecideAndPersistDeps,
} from './decide-and-persist';

// PagaMenos · src/services — decide-and-persist orchestration (§14/§15/§16/§27/§28).
//
// The SANCTIONED public path: validate the engine input, run the accepted pure `decide` ONCE, then
// persist the EXACT (input, output) pair as one immutable snapshot. There is no lower-level
// "persist these two unrelated blobs" path exposed — input/output can only diverge if a caller
// hand-builds a draft, which this module never does. Nothing is recomputed or reloaded between
// deciding and persisting (§15); the stored pair is exactly what the engine produced.
//
// This layer may import the pure engine + corpus and the db/persistence layers (§29). The
// engine/corpus purity boundary is untouched.
import { loadCorpus } from '@/corpus';
import { decisionSnapshotRepository } from '@/db';
import { decide, type DecideInput } from '@/engine';
import {
  buildDecisionSnapshotDraft,
  engineInputV1Schema,
  replayWithCurrentEngine,
  resolveBuildMetadata,
  verifySnapshotIntegrity,
  type BuildMetadata,
  type DecisionSnapshotDto,
  type DecisionSnapshotStore,
  type ReplayComparison,
} from '@/persistence';

export interface DecideAndPersistRequest {
  /** The exact engine input to evaluate and (with its output) persist. */
  input: DecideInput;
  /** Domain-level completed-decision occurrence key (§11). M3.5B binds its construction. */
  businessDecisionKey: string;
  /** Transport/request idempotency key (§10). */
  idempotencyKey: string;
  /** Factual corpus label (§6). Defaults to the currently-loaded corpus id. */
  corpusVersion?: string;
  /** Application build metadata override (§9); otherwise resolved from the environment. */
  build?: Partial<BuildMetadata>;
}

export interface DecideAndPersistDeps {
  repository?: DecisionSnapshotStore;
  /** Environment source for build metadata (defaults to process.env inside resolveBuildMetadata). */
  buildSource?: Record<string, string | undefined>;
}

/**
 * Evaluate `input` with the pure engine and persist the immutable decision snapshot. Idempotent and
 * race-safe via the repository. Returns the persisted (or existing, on exact retry) snapshot DTO.
 * Throws a typed conflict error on a genuine key collision; the historical record is never rewritten.
 */
export async function decideAndPersist(
  request: DecideAndPersistRequest,
  deps: DecideAndPersistDeps = {},
): Promise<DecisionSnapshotDto> {
  const repository = deps.repository ?? decisionSnapshotRepository;

  // 1. Validate the engine input at the boundary (§14) — fail fast, and reject any secret-like extra
  //    key (§19) before it can reach the engine or the store.
  engineInputV1Schema.parse(request.input);

  // 2. Invoke the accepted pure engine exactly once (§4/§14).
  const output = decide(request.input);

  // 3. Resolve build metadata at the persistence boundary (§9) and the corpus label (§6).
  const build = resolveBuildMetadata(request.build ?? {}, deps.buildSource);
  const corpusVersion = request.corpusVersion ?? loadCorpus().corpusId;

  // 4. Canonicalize + hash the EXACT input/output pair and assemble the immutable draft (§8/§15).
  const draft = buildDecisionSnapshotDraft({
    input: request.input,
    output,
    corpusVersion,
    build,
    businessDecisionKey: request.businessDecisionKey,
    idempotencyKey: request.idempotencyKey,
  });

  // 5. Persist atomically (§16) with idempotency + business-uniqueness handling (§10/§11).
  return repository.persist(draft);
}

/**
 * Load a persisted snapshot by id and verify its stored hashes match its stored payloads (§28).
 * Returns null if absent; throws `SnapshotIntegrityError` if the stored record is corrupted.
 */
export async function loadDecisionSnapshot(
  id: string,
  deps: DecideAndPersistDeps = {},
): Promise<DecisionSnapshotDto | null> {
  const repository = deps.repository ?? decisionSnapshotRepository;
  const dto = await repository.findById(id);
  return dto ? verifySnapshotIntegrity(dto) : null;
}

/**
 * DIAGNOSTIC (§27): load a snapshot (integrity-checked) and re-run the CURRENT engine over its stored
 * historical input, returning both outputs distinctly. Never mutates history. Returns null if absent.
 */
export async function replayDecisionSnapshot(
  id: string,
  deps: DecideAndPersistDeps = {},
): Promise<ReplayComparison | null> {
  const repository = deps.repository ?? decisionSnapshotRepository;
  const dto = await repository.findById(id);
  if (!dto) return null;
  verifySnapshotIntegrity(dto);
  return replayWithCurrentEngine(dto);
}

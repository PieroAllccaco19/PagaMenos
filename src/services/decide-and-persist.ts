// PagaMenos · src/services — decide-and-persist orchestration (§8–§11/§14–§22/§38–§41).
//
// The SANCTIONED public write path. Order of operations closes P35A-01/02/03/05:
//   1. reject a non-plain/adversarial request up front (§23/§26), then PARSE the input ONCE (§21);
//   2. compute the request fingerprint and resolve an exact-retry receipt BEFORE any engine/corpus/
//      build work (§8/§38) — a completed operation stays valid across deployments;
//   3. resolve a business-alias BEFORE recomputing (§9/§39) — a new key durably aliases the existing
//      snapshot without re-deciding or relabelling its original provenance;
//   4. only for a genuinely new decision: run the accepted pure engine ONCE, validate its output,
//      resolve TRUSTED corpus/build provenance (never caller-authored, §32), and persist the exact
//      (parsed input, parsed output) pair with its initial receipt atomically (§10/§16).
//
// The request carries ONLY domain/transport data (input + two keys). Provenance is never a request
// field. This module imports the internal persistence/db modules directly (the sanctioned boundary);
// normal application code cannot reach those write APIs.
import { decide, type DecideInput, type EngineEvaluation } from '@/engine';

import { decisionSnapshotRepository } from '@/db/decision-snapshot-repository';
import { assertCanonicalizable } from '@/persistence/canonical';
import {
  BusinessDecisionConflictError,
  IdempotencyConflictError,
  PersistenceInvariantError,
} from '@/persistence/errors';
import {
  replayWithCurrentEngine,
  verifyHistoricalSnapshot,
  type ReplayComparison,
} from '@/persistence/integrity';
import {
  buildDecisionSnapshotDraft,
  computeRequestHash,
  DECISION_PERSIST_OPERATION_SCOPE,
  type DecisionPersistenceStore,
} from '@/persistence/snapshot';
import { engineInputV1Schema, engineOutputV1Schema } from '@/persistence/schema';
import type { DecisionSnapshotDto } from '@/persistence/schema';
import {
  corpusV1ProvenanceProvider,
  envBuildMetadataProvider,
  type BuildMetadataProvider,
  type CorpusProvenanceProvider,
} from '@/persistence/provenance';

export interface DecideAndPersistRequest {
  /** The exact engine input to evaluate and (with its output) persist. */
  input: DecideInput;
  /** Domain-level completed-decision occurrence key (§11). M3.5B binds its construction. */
  businessDecisionKey: string;
  /** Transport/request idempotency key (§10). */
  idempotencyKey: string;
}

export interface DecideAndPersistDeps {
  /** Persistence store (defaults to the shared repository). Injected in tests. */
  repository?: DecisionPersistenceStore;
  /**
   * FACTORY for the trusted corpus-provenance provider (§10/§11). It is invoked ONLY on the truly
   * NEW-decision path — never for an exact retry or a business alias — so a completed operation never
   * loads/hashes the current corpus. Defaults to `corpusV1ProvenanceProvider`.
   */
  corpusProvenanceFactory?: () => CorpusProvenanceProvider;
  /**
   * FACTORY for the trusted build-metadata provider (§10/§11). Invoked ONLY on the new-decision path.
   * Defaults to `envBuildMetadataProvider`.
   */
  buildProviderFactory?: () => BuildMetadataProvider;
}

function requireNonEmpty(value: string, label: string): string {
  const v = typeof value === 'string' ? value.trim() : '';
  if (v.length === 0) throw new PersistenceInvariantError(`${label} must be a non-empty string`);
  return v;
}

/**
 * Evaluate `input` with the pure engine and persist the immutable decision snapshot, idempotently and
 * race-safely. Returns the persisted (or existing, on retry/alias) snapshot DTO. Throws a typed
 * conflict on a genuine key collision; the historical record is never rewritten.
 */
export async function decideAndPersist(
  request: DecideAndPersistRequest,
  deps: DecideAndPersistDeps = {},
): Promise<DecisionSnapshotDto> {
  const repository = deps.repository ?? decisionSnapshotRepository;
  // NOTE: providers are NOT constructed here — only lazily on the new-decision path (§10/§11), so an
  // exact retry / business alias never loads the current corpus or resolves the current build.
  const corpusProvenanceFactory = deps.corpusProvenanceFactory ?? corpusV1ProvenanceProvider;
  const buildProviderFactory = deps.buildProviderFactory ?? envBuildMetadataProvider;

  const businessDecisionKey = requireNonEmpty(request.businessDecisionKey, 'businessDecisionKey');
  const idempotencyKey = requireNonEmpty(request.idempotencyKey, 'idempotencyKey');
  const operationScope = DECISION_PERSIST_OPERATION_SCOPE;

  // 1. Reject a non-plain / adversarial request BEFORE any engine or DB work (§23/§26), then PARSE
  //    ONCE — every later step uses `parsedInput`, never the caller's object (§21).
  assertCanonicalizable(request.input);
  const parsedInput = engineInputV1Schema.parse(request.input) as unknown as DecideInput;
  // requestHash === inputHash (frozen, §5); businessDecisionKey is always checked separately.
  const requestHash = computeRequestHash(parsedInput);

  // 2. Exact-retry: a durable receipt resolves the operation without deciding/corpus/build (§8/§38).
  const receipt = await repository.findReceipt(operationScope, idempotencyKey);
  if (receipt) {
    const snapshot = await repository.findSnapshotById(receipt.decisionSnapshotId);
    if (!snapshot) {
      throw new PersistenceInvariantError(
        `idempotency receipt '${idempotencyKey}' references missing snapshot ${receipt.decisionSnapshotId}`,
      );
    }
    if (
      receipt.requestHash === requestHash &&
      snapshot.businessDecisionKey === businessDecisionKey
    ) {
      return verifyHistoricalSnapshot(snapshot); // historical truth; engine NOT called
    }
    throw new IdempotencyConflictError(idempotencyKey, receipt.requestHash, requestHash);
  }

  // 3. Business-alias: an existing snapshot for this business key is durably aliased, not recomputed
  //    or relabelled (§9/§39).
  const existing = await repository.findSnapshotByBusinessKey(businessDecisionKey);
  if (existing) {
    verifyHistoricalSnapshot(existing);
    // requestHash === inputHash (frozen, §5); the verified snapshot's stored inputHash is its request.
    const existingRequestHash = existing.inputHash;
    if (existingRequestHash === requestHash) {
      return repository.attachAliasReceipt({
        operationScope,
        idempotencyKey,
        requestHash,
        snapshot: existing,
      });
    }
    throw new BusinessDecisionConflictError(businessDecisionKey, existingRequestHash, requestHash);
  }

  // 4. New decision: construct TRUSTED providers lazily (§11), verify authenticity + candidate-set
  //    completeness, decide ONCE, validate the output, then persist atomically.
  const corpusVersion = corpusProvenanceFactory().verify({
    rules: parsedInput.rules,
    scopes: parsedInput.scopes,
    context: parsedInput.context,
    ...(parsedInput.selectedScopeId !== undefined
      ? { selectedScopeId: parsedInput.selectedScopeId }
      : {}),
  });
  const build = buildProviderFactory().resolve();
  const parsedOutput = engineOutputV1Schema.parse(
    decide(parsedInput),
  ) as unknown as EngineEvaluation;
  const draft = buildDecisionSnapshotDraft({
    input: parsedInput,
    output: parsedOutput,
    corpusVersion,
    build,
    businessDecisionKey,
  });
  const dto = await repository.createDecision({
    draft,
    operationScope,
    idempotencyKey,
    requestHash,
  });
  return verifyHistoricalSnapshot(dto);
}

/**
 * Load a persisted snapshot by id and fully verify it (§41): version-dispatched parse (in the
 * repository), hash integrity, and column↔payload coherence. Returns null if absent; throws
 * `SnapshotIntegrityError` / `SnapshotCoherenceError` on a corrupted or contradictory record.
 */
export async function loadDecisionSnapshot(
  id: string,
  deps: DecideAndPersistDeps = {},
): Promise<DecisionSnapshotDto | null> {
  const repository = deps.repository ?? decisionSnapshotRepository;
  const dto = await repository.findSnapshotById(id);
  return dto ? verifyHistoricalSnapshot(dto) : null;
}

/**
 * DIAGNOSTIC (§27): load a snapshot (fully verified) and re-run the CURRENT engine over its stored
 * historical input, returning both outputs distinctly. Never mutates history. Returns null if absent.
 */
export async function replayDecisionSnapshot(
  id: string,
  deps: DecideAndPersistDeps = {},
): Promise<ReplayComparison | null> {
  const repository = deps.repository ?? decisionSnapshotRepository;
  const dto = await repository.findSnapshotById(id);
  if (!dto) return null;
  verifyHistoricalSnapshot(dto);
  return replayWithCurrentEngine(dto);
}

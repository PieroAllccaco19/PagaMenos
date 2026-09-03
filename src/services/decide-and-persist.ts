// PagaMenos · src/services — the SANCTIONED decision-persistence implementation (§8–§22/§38–§41).
//
// TWO API TIERS (P35A-05 §19/§20):
//   • PUBLIC — `decideAndPersist(request)`, `loadDecisionSnapshot(id)`, `replayDecisionSnapshot(id)`:
//     ONE argument each, no dependency injection. They bind the TRUSTED production dependencies
//     (Corpus-v1 provenance, environment build provider, production repository, accepted engine) so a
//     production caller cannot substitute a fake provider and mislabel an incomplete comparison as
//     Corpus-v1. These are the only surface re-exported by `src/services/index.ts`.
//   • INTERNAL `*WithDeps` — injectable for deterministic tests / provider-call counters / race
//     testing. They are NOT re-exported by the barrel, and this module's raw-capability specifier
//     `@/services/decide-and-persist` is blocked (ESLint + the module-capability boundary test) for
//     ordinary app/lib/service code, so DI is reachable only from the sanctioned file and tests.
//
// Order of operations: reject a non-plain request + parse once (§21/§23/§26); resolve an exact-retry
// receipt BEFORE any engine/corpus/build work (§8/§38); resolve a business-alias without recomputing
// (§9/§39); only for a genuinely new decision construct the TRUSTED providers lazily (§10/§11),
// verify authenticity + candidate-set completeness, decide ONCE, and persist atomically (§16). Every
// receipt-return path uses the single `assertReceiptMatchesRequest` identity invariant (§4/§5).
import { decide, type DecideInput, type EngineEvaluation } from '@/engine';

import { decisionSnapshotRepository } from '@/db/decision-snapshot-repository';
import { assertCanonicalizable } from '@/persistence/canonical';
import { BusinessDecisionConflictError, PersistenceInvariantError } from '@/persistence/errors';
import {
  replayWithCurrentEngine,
  verifyHistoricalSnapshot,
  type ReplayComparison,
} from '@/persistence/integrity';
import {
  assertReceiptMatchesRequest,
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

/** PUBLIC request — ONLY authorized domain/transport data. No provenance, deps, engine, or output. */
export interface DecideAndPersistRequest {
  /** The exact engine input to evaluate and (with its output) persist. */
  input: DecideInput;
  /** Domain-level completed-decision occurrence key (§11). M3.5B binds its construction. */
  businessDecisionKey: string;
  /** Transport/request idempotency key (§10). */
  idempotencyKey: string;
}

/**
 * INTERNAL injectable dependencies (§20). NOT part of the public request and NOT re-exported by the
 * barrel; only tests / the sanctioned implementation may reach the `*WithDeps` functions that accept
 * this. Every field defaults to the trusted production dependency.
 */
export interface DecideAndPersistDeps {
  /** Persistence store (defaults to the production repository). */
  repository?: DecisionPersistenceStore;
  /**
   * FACTORY for the trusted corpus-provenance provider — invoked ONLY on the truly NEW-decision path
   * (§10/§11), never for an exact retry or a business alias. Defaults to `corpusV1ProvenanceProvider`.
   */
  corpusProvenanceFactory?: () => CorpusProvenanceProvider;
  /**
   * FACTORY for the trusted build-metadata provider — invoked ONLY on the new-decision path.
   * Defaults to `envBuildMetadataProvider`.
   */
  buildProviderFactory?: () => BuildMetadataProvider;
}

function requireNonEmpty(value: string, label: string): string {
  const v = typeof value === 'string' ? value.trim() : '';
  if (v.length === 0) throw new PersistenceInvariantError(`${label} must be a non-empty string`);
  return v;
}

// ---------------------------------------------------------------------------------------------------
// INTERNAL (injectable) implementations. Reachable only from the sanctioned file + tests (boundary).
// ---------------------------------------------------------------------------------------------------

/** INTERNAL: decide + persist with injectable trusted dependencies. See `decideAndPersist`. */
export async function decideAndPersistWithDeps(
  request: DecideAndPersistRequest,
  deps: DecideAndPersistDeps = {},
): Promise<DecisionSnapshotDto> {
  const repository = deps.repository ?? decisionSnapshotRepository;
  // Providers are NOT constructed here — only lazily on the new-decision path (§10/§11).
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

  // 2. Exact-retry: a durable receipt resolves the operation without deciding/corpus/build (§8/§38) —
  //    but ONLY when it resolves the SAME request AND the SAME businessDecisionKey (§4/§5/P35A-07).
  const receipt = await repository.findReceipt(operationScope, idempotencyKey);
  if (receipt) {
    const snapshot = await repository.findSnapshotById(receipt.decisionSnapshotId);
    if (!snapshot) {
      throw new PersistenceInvariantError(
        `idempotency receipt '${idempotencyKey}' references missing snapshot ${receipt.decisionSnapshotId}`,
      );
    }
    assertReceiptMatchesRequest({
      receipt,
      snapshot,
      requestedBusinessDecisionKey: businessDecisionKey,
      requestedRequestHash: requestHash,
    });
    return verifyHistoricalSnapshot(snapshot); // historical truth; engine NOT called
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
 * INTERNAL: read-only exact-historical lookup by business key (M3.5B-A2 §18). Loads + fully verifies
 * the existing snapshot for a completed-decision business key WITHOUT deciding, corpus/build work, or
 * any write. Returns null when no decision was ever persisted for the key. Never rewrites history.
 */
export async function findExactHistoricalDecisionWithDeps(
  businessDecisionKey: string,
  deps: DecideAndPersistDeps = {},
): Promise<DecisionSnapshotDto | null> {
  const repository = deps.repository ?? decisionSnapshotRepository;
  const key = requireNonEmpty(businessDecisionKey, 'businessDecisionKey');
  const existing = await repository.findSnapshotByBusinessKey(key);
  return existing ? verifyHistoricalSnapshot(existing) : null;
}

/** INTERNAL: load with an injectable store. See `loadDecisionSnapshot`. */
export async function loadDecisionSnapshotWithDeps(
  id: string,
  deps: DecideAndPersistDeps = {},
): Promise<DecisionSnapshotDto | null> {
  const repository = deps.repository ?? decisionSnapshotRepository;
  const dto = await repository.findSnapshotById(id);
  return dto ? verifyHistoricalSnapshot(dto) : null;
}

/** INTERNAL: replay with an injectable store. See `replayDecisionSnapshot`. */
export async function replayDecisionSnapshotWithDeps(
  id: string,
  deps: DecideAndPersistDeps = {},
): Promise<ReplayComparison | null> {
  const repository = deps.repository ?? decisionSnapshotRepository;
  const dto = await repository.findSnapshotById(id);
  if (!dto) return null;
  verifyHistoricalSnapshot(dto);
  return replayWithCurrentEngine(dto);
}

// ---------------------------------------------------------------------------------------------------
// PUBLIC (trusted, one-argument) API — the only surface re-exported by src/services/index.ts.
// ---------------------------------------------------------------------------------------------------

/**
 * Evaluate `request.input` with the accepted engine and persist the immutable decision snapshot,
 * idempotently and race-safely, using TRUSTED production dependencies (no injection possible). Returns
 * the persisted (or existing, on retry/alias) snapshot. Throws a typed conflict on a genuine key
 * collision or an incomplete/inauthentic Corpus-v1 candidate set; history is never rewritten.
 */
export function decideAndPersist(request: DecideAndPersistRequest): Promise<DecisionSnapshotDto> {
  return decideAndPersistWithDeps(request);
}

/**
 * Load a persisted snapshot by id and fully verify it (§41): version-dispatched parse, hash
 * integrity, and column↔payload coherence. Returns null if absent; throws on a corrupted/contradictory
 * record.
 */
export function loadDecisionSnapshot(id: string): Promise<DecisionSnapshotDto | null> {
  return loadDecisionSnapshotWithDeps(id);
}

/**
 * Read-only exact-historical decision lookup by completed-decision business key (M3.5B-A2 §18), using
 * TRUSTED production dependencies. Returns the fully-verified persisted snapshot, or null if none was
 * ever recorded for the key. Decides nothing and writes nothing.
 */
export function findExactHistoricalDecision(
  businessDecisionKey: string,
): Promise<DecisionSnapshotDto | null> {
  return findExactHistoricalDecisionWithDeps(businessDecisionKey);
}

/**
 * DIAGNOSTIC (§27): load a snapshot (fully verified) and re-run the CURRENT engine over its stored
 * historical input, returning both outputs distinctly. Never mutates history. Returns null if absent.
 */
export function replayDecisionSnapshot(id: string): Promise<ReplayComparison | null> {
  return replayDecisionSnapshotWithDeps(id);
}

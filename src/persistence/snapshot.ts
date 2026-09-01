// PagaMenos · src/persistence — snapshot draft assembly, request fingerprint & coherence (§6/§8/§21).
//
// Given the EXACT (parsed input, parsed output) pair from a single completed `decide()` invocation,
// `buildDecisionSnapshotDraft` builds the insertable snapshot draft: it re-validates both payloads
// against the frozen v1 schemas, canonicalizes + SHA-256-hashes each (§8), and lifts the queryable
// metadata from the OUTPUT (source of truth, §17). It does NOT call the engine and never reloads
// corpus/DB state (§15). Transport idempotency is NOT part of the snapshot — it lives in receipts.
//
// This module is INTERNAL: the draft constructor is deliberately not on the public barrel (P35A-02).
import type { DecideInput, EngineEvaluation } from '@/engine';

import { PersistenceInvariantError, SnapshotCoherenceError } from './errors';
import { canonicalHash } from './hash';
import { sameInstantV1 } from './instant-v1';
import {
  engineInputV1Schema,
  engineOutputV1Schema,
  parseDecisionSnapshot,
  type DecisionSnapshotDto,
} from './schema';
import {
  ENGINE_CONTRACT_VERSION,
  ENGINE_INPUT_SCHEMA_VERSION,
  ENGINE_OUTPUT_SCHEMA_VERSION,
  SNAPSHOT_SCHEMA_VERSION,
} from './versions';
import type { BuildMetadata } from './build-meta';

/** Sentinel decision status for an evaluation that returned no single `final` (scope selection). */
export const REQUIRES_SCOPE_SELECTION = 'REQUIRES_SCOPE_SELECTION';

/** The trusted operation identity scoping idempotency keys for the decision-persist use case (§4). */
export const DECISION_PERSIST_OPERATION_SCOPE = 'DECISION_PERSIST_V1';

/** Insertable snapshot record — DB assigns `id` + `createdAt`. No transport idempotency key here. */
export interface DecisionSnapshotDraft {
  businessDecisionKey: string;
  snapshotSchemaVersion: string;
  engineInputSchemaVersion: string;
  engineOutputSchemaVersion: string;
  engineContractVersion: string;
  corpusVersion: string;
  merchantId: string;
  selectedScopeId: string | null;
  decisionStatus: string;
  evaluatedAt: string;
  intendedTransactionAt: string;
  engineInputJson: DecideInput;
  engineOutputJson: EngineEvaluation;
  inputHash: string;
  outputHash: string;
  gitSha: string;
  buildId: string | null;
}

/** A durable idempotency receipt row (aliasing one transport key to one snapshot). */
export interface DecisionReceiptRecord {
  operationScope: string;
  idempotencyKey: string;
  requestHash: string;
  decisionSnapshotId: string;
}

/** Arguments for creating a brand-new decision (snapshot + its initial receipt), atomically. */
export interface CreateDecisionArgs {
  draft: DecisionSnapshotDraft;
  operationScope: string;
  idempotencyKey: string;
  requestHash: string;
}

/** Arguments for attaching an alias receipt (new key) to an EXISTING snapshot. */
export interface AttachAliasArgs {
  operationScope: string;
  idempotencyKey: string;
  requestHash: string;
  snapshot: DecisionSnapshotDto;
}

/**
 * The write/read contract the service depends on (structural). The db repository implements it; tests
 * may substitute an in-memory double without pulling Prisma into a DB-free run. All methods are
 * race-safe by construction (DB unique constraints, not in-memory checks).
 */
export interface DecisionPersistenceStore {
  findReceipt(
    operationScope: string,
    idempotencyKey: string,
  ): Promise<DecisionReceiptRecord | null>;
  findSnapshotById(id: string): Promise<DecisionSnapshotDto | null>;
  findSnapshotByBusinessKey(businessDecisionKey: string): Promise<DecisionSnapshotDto | null>;
  /** Persist snapshot + initial receipt atomically; race-reconcile to existing on conflict. */
  createDecision(args: CreateDecisionArgs): Promise<DecisionSnapshotDto>;
  /** Durably consume a new key as an alias of an existing snapshot; race-safe. */
  attachAliasReceipt(args: AttachAliasArgs): Promise<DecisionSnapshotDto>;
}

export interface BuildDraftArgs {
  input: DecideInput;
  output: EngineEvaluation;
  corpusVersion: string;
  build: BuildMetadata;
  businessDecisionKey: string;
}

/** The domain-level status recorded for query: `final.status`, or the scope-selection sentinel. */
export function deriveDecisionStatus(output: EngineEvaluation): string {
  if (output.requiresScopeSelection) return REQUIRES_SCOPE_SELECTION;
  if (output.final) return output.final.status;
  throw new PersistenceInvariantError(
    'engine output has neither requiresScopeSelection nor a final decision',
  );
}

/** The deterministic query metadata derived from an engine output (the single derivation, §17/§40). */
export function deriveQueryMetadata(output: EngineEvaluation): {
  merchantId: string;
  selectedScopeId: string | null;
  decisionStatus: string;
  evaluatedAt: string;
  intendedTransactionAt: string;
} {
  return {
    merchantId: output.merchantId,
    selectedScopeId: output.selectedScopeId ?? null,
    decisionStatus: deriveDecisionStatus(output),
    evaluatedAt: output.evaluatedAt,
    intendedTransactionAt: output.intendedTransactionAt,
  };
}

/**
 * The deterministic REQUEST fingerprint (P35A-01 §7): a canonical hash of the effective request —
 * `{businessDecisionKey, input}` — and NOTHING else. It excludes the engine output, git sha, buildId,
 * and every deployment detail, so a retry after a deployment/engine change still resolves to the same
 * completed operation. The idempotency key is NOT part of its own payload hash.
 */
export function computeRequestHash(businessDecisionKey: string, input: DecideInput): string {
  return canonicalHash({ businessDecisionKey, input });
}

/**
 * Build the immutable snapshot draft. Validates input+output against the frozen v1 schemas (rejecting
 * unknown/secret-like keys, §19), hashes the exact canonical bytes, and derives ALL query metadata
 * from the output (never caller-authored, §17/§40). `businessDecisionKey`/`corpusVersion` non-empty.
 */
export function buildDecisionSnapshotDraft(args: BuildDraftArgs): DecisionSnapshotDraft {
  const { input, output, build } = args;
  const businessDecisionKey = args.businessDecisionKey.trim();
  const corpusVersion = args.corpusVersion.trim();
  if (businessDecisionKey.length === 0) {
    throw new PersistenceInvariantError('businessDecisionKey must be a non-empty string');
  }
  if (corpusVersion.length === 0) {
    throw new PersistenceInvariantError('corpusVersion must be a non-empty string');
  }

  // Strict runtime validation of the EXACT payloads that will be stored (§7/§19).
  engineInputV1Schema.parse(input);
  engineOutputV1Schema.parse(output);

  const inputHash = canonicalHash(input);
  const outputHash = canonicalHash(output);
  const meta = deriveQueryMetadata(output);

  return {
    businessDecisionKey,
    snapshotSchemaVersion: SNAPSHOT_SCHEMA_VERSION,
    engineInputSchemaVersion: ENGINE_INPUT_SCHEMA_VERSION,
    engineOutputSchemaVersion: ENGINE_OUTPUT_SCHEMA_VERSION,
    engineContractVersion: ENGINE_CONTRACT_VERSION,
    corpusVersion,
    merchantId: meta.merchantId,
    selectedScopeId: meta.selectedScopeId,
    decisionStatus: meta.decisionStatus,
    evaluatedAt: meta.evaluatedAt,
    intendedTransactionAt: meta.intendedTransactionAt,
    engineInputJson: input,
    engineOutputJson: output,
    inputHash,
    outputHash,
    gitSha: build.gitSha,
    buildId: build.buildId ?? null,
  };
}

/**
 * Verify a loaded snapshot's queryable columns agree with its historical payload (§18/§41). Any
 * contradiction is an explicit `SnapshotCoherenceError` — a read never silently prefers column or JSON.
 */
export function verifySnapshotCoherence(dto: DecisionSnapshotDto): DecisionSnapshotDto {
  const meta = deriveQueryMetadata(dto.engineOutputJson);
  // Plain string columns must match exactly.
  const stringChecks: Array<[string, unknown, unknown]> = [
    ['merchantId', dto.merchantId, meta.merchantId],
    ['selectedScopeId', dto.selectedScopeId, meta.selectedScopeId],
    ['decisionStatus', dto.decisionStatus, meta.decisionStatus],
  ];
  for (const [field, columnValue, payloadValue] of stringChecks) {
    if (columnValue !== payloadValue) {
      throw new SnapshotCoherenceError(field, columnValue, payloadValue, dto.id);
    }
  }
  // Instant columns are stored as timestamptz and round-trip as UTC, while the JSON payload keeps its
  // original offset — they must denote the SAME INSTANT, not the same string.
  const instantChecks: Array<[string, string, string]> = [
    ['evaluatedAt', dto.evaluatedAt, meta.evaluatedAt],
    ['intendedTransactionAt', dto.intendedTransactionAt, meta.intendedTransactionAt],
  ];
  for (const [field, columnValue, payloadValue] of instantChecks) {
    if (!sameInstantV1(columnValue, payloadValue)) {
      throw new SnapshotCoherenceError(field, columnValue, payloadValue, dto.id);
    }
  }
  return dto;
}

/**
 * Parse+validate a plain object (e.g. a DB row mapped to JSON) as a DecisionSnapshotDto via explicit
 * version dispatch (§28). Re-exported convenience over the schema's `parseDecisionSnapshot`.
 */
export function parseDecisionSnapshotDto(raw: unknown): DecisionSnapshotDto {
  return parseDecisionSnapshot(raw);
}

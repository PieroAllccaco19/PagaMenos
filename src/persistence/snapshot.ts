// PagaMenos · src/persistence — assemble an immutable DecisionSnapshot draft (§6/§8/§14/§21).
//
// Given the EXACT (input, output) pair from a single completed `decide()` invocation, this builds
// the insertable snapshot draft: it validates both payloads against their frozen v1 schemas (§7/§19),
// canonicalizes and SHA-256-hashes each (§8), and lifts the queryable metadata from the OUTPUT —
// the output is the source of truth for merchant / status / instants (§17). It does NOT call the
// engine and never reloads corpus/DB state (§15); packaging is side-effect-free.
//
// A `DecisionSnapshotDraft` carries everything a row needs EXCEPT `id` and `createdAt`, which the
// database assigns on insert.
import type { DecideInput, EngineEvaluation } from '@/engine';

import { PersistenceInvariantError } from './errors';
import { canonicalHash } from './hash';
import {
  decisionSnapshotDtoSchema,
  engineInputV1Schema,
  engineOutputV1Schema,
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

/**
 * The write/read contract the service depends on (structural). The db `DecisionSnapshotRepository`
 * implements it; tests may substitute an in-memory double without pulling Prisma into a DB-free run.
 */
export interface DecisionSnapshotStore {
  persist(draft: DecisionSnapshotDraft): Promise<DecisionSnapshotDto>;
  findById(id: string): Promise<DecisionSnapshotDto | null>;
}

/** Insertable snapshot record — DB assigns `id` + `createdAt`. */
export interface DecisionSnapshotDraft {
  businessDecisionKey: string;
  idempotencyKey: string;
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

export interface BuildDraftArgs {
  input: DecideInput;
  output: EngineEvaluation;
  corpusVersion: string;
  build: BuildMetadata;
  businessDecisionKey: string;
  idempotencyKey: string;
}

/** The domain-level status recorded for query: `final.status`, or the scope-selection sentinel. */
export function deriveDecisionStatus(output: EngineEvaluation): string {
  if (output.requiresScopeSelection) return REQUIRES_SCOPE_SELECTION;
  if (output.final) return output.final.status;
  // A non-selection evaluation always carries a `final` (decide() guarantees it); fail closed.
  throw new PersistenceInvariantError(
    'engine output has neither requiresScopeSelection nor a final decision',
  );
}

/**
 * Build the immutable snapshot draft. Validates input+output against the frozen v1 schemas (rejecting
 * unknown/secret-like keys, §19), hashes the exact canonical bytes, and derives query metadata from
 * the output. `businessDecisionKey` / `idempotencyKey` are non-empty (fail-closed).
 */
export function buildDecisionSnapshotDraft(args: BuildDraftArgs): DecisionSnapshotDraft {
  const { input, output, corpusVersion, build } = args;
  const businessDecisionKey = args.businessDecisionKey.trim();
  const idempotencyKey = args.idempotencyKey.trim();
  if (businessDecisionKey.length === 0) {
    throw new PersistenceInvariantError('businessDecisionKey must be a non-empty string');
  }
  if (idempotencyKey.length === 0) {
    throw new PersistenceInvariantError('idempotencyKey must be a non-empty string');
  }
  if (corpusVersion.trim().length === 0) {
    throw new PersistenceInvariantError('corpusVersion must be a non-empty string');
  }

  // Strict runtime validation of the EXACT payloads that will be stored (§7/§19). ZodError bubbles
  // up as a validation failure; the payloads are never partially coerced.
  const validatedInput = engineInputV1Schema.parse(input);
  const validatedOutput = engineOutputV1Schema.parse(output);

  // Hash the exact canonical bytes of the validated payloads (§8). Canonicalization drops
  // undefined-valued keys, matching the JSONB round-trip so a reloaded record re-hashes identically.
  const inputHash = canonicalHash(validatedInput);
  const outputHash = canonicalHash(validatedOutput);

  return {
    businessDecisionKey,
    idempotencyKey,
    snapshotSchemaVersion: SNAPSHOT_SCHEMA_VERSION,
    engineInputSchemaVersion: ENGINE_INPUT_SCHEMA_VERSION,
    engineOutputSchemaVersion: ENGINE_OUTPUT_SCHEMA_VERSION,
    engineContractVersion: ENGINE_CONTRACT_VERSION,
    corpusVersion: corpusVersion.trim(),
    merchantId: output.merchantId,
    selectedScopeId: output.selectedScopeId ?? null,
    decisionStatus: deriveDecisionStatus(output),
    evaluatedAt: output.evaluatedAt,
    intendedTransactionAt: output.intendedTransactionAt,
    engineInputJson: input,
    engineOutputJson: output,
    inputHash,
    outputHash,
    gitSha: build.gitSha,
    buildId: build.buildId ?? null,
  };
}

/**
 * Parse+validate a plain object (e.g. a DB row mapped to JSON) as a DecisionSnapshotDto. The
 * versioned payloads are validated strictly; a wrong/absent version is rejected (§7).
 */
export function parseDecisionSnapshotDto(raw: unknown): DecisionSnapshotDto {
  // Structurally validated by the schema; re-typed to the authoritative engine payload types.
  return decisionSnapshotDtoSchema.parse(raw) as unknown as DecisionSnapshotDto;
}

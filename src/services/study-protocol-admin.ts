// PagaMenos · src/services — ProtocolAdministrationCapability (spec §2/§11/§19). SANCTIONED.
//
// The only sanctioned surface for `registerAnalysisProtocolDraft` / `freezeAnalysisProtocol`. It owns
// the versioned canonicalization + digest (via `@/study`) and the trusted freeze timestamp; the raw
// `study-protocol-repository` is reachable ONLY from here (write) and `study-analysis` (read) — the
// module-capability AST test forbids any other importer. Participant-facing/app code cannot reach it.
import {
  analysisProtocolRepository,
  type ProtocolStore,
} from '@/db/study-protocol-repository';
import {
  buildProtocolDefinition,
  freezeProtocolInputSchema,
  parseStudyInput,
  protocolFreezeRequestHash,
  protocolRegisterRequestHash,
  registerProtocolInputSchema,
  StudyDomainConflictError,
  StudyInvariantError,
  type RegisterProtocolInput,
  type FreezeProtocolInput,
  type TrustedContext,
} from '@/study';
import type { AnalysisProtocolDto } from '@/db/study-protocol-repository';

/** Stable trusted calling context for this capability (participates in every request hash, §10/§26). */
const PROTOCOL_ADMIN_CONTEXT: TrustedContext = { capability: 'ProtocolAdministrationCapability' };

export interface ProtocolAdminDeps {
  repository?: ProtocolStore;
}

export interface RegisterAnalysisProtocolDraftRequest {
  input: RegisterProtocolInput;
  idempotencyKey: string;
}

export interface FreezeAnalysisProtocolRequest {
  input: FreezeProtocolInput;
  idempotencyKey: string;
}

/** Register a complete DRAFT protocol (single insert + REGISTER receipt). No DRAFT editing exists. */
export async function registerAnalysisProtocolDraft(
  request: RegisterAnalysisProtocolDraftRequest,
  deps: ProtocolAdminDeps = {},
): Promise<{ protocol: AnalysisProtocolDto }> {
  const repository = deps.repository ?? analysisProtocolRepository;
  const parsed = parseStudyInput(
    registerProtocolInputSchema,
    request.input,
    'analysis-protocol registration input',
  );
  const normalized = buildProtocolDefinition({
    definition: parsed.definition,
    ...(parsed.definitionSchemaVersion !== undefined
      ? { definitionSchemaVersion: parsed.definitionSchemaVersion }
      : {}),
    ...(parsed.canonicalizationVersion !== undefined
      ? { canonicalizationVersion: parsed.canonicalizationVersion }
      : {}),
  });
  const requestHash = protocolRegisterRequestHash({
    protocolVersion: parsed.protocolVersion,
    definitionSchemaVersion: normalized.definitionSchemaVersion,
    canonicalizationVersion: normalized.canonicalizationVersion,
    normalizedDefinition: normalized.definitionJson,
    context: PROTOCOL_ADMIN_CONTEXT,
  });
  const protocol = await repository.registerDraft({
    protocolVersion: parsed.protocolVersion,
    definitionSchemaVersion: normalized.definitionSchemaVersion,
    canonicalizationVersion: normalized.canonicalizationVersion,
    definitionJson: normalized.definitionJson,
    definitionDigest: normalized.definitionDigest,
    idempotencyKey: request.idempotencyKey,
    requestHash,
  });
  return { protocol };
}

/**
 * Freeze a DRAFT protocol (the ONLY permitted UPDATE). The freeze request hash pins the protocol's
 * identity + its unchanged digest under a fixed DRAFT precondition, so one freeze key cannot
 * acknowledge freezing a materially different protocol state, and a same-key replay is stable across
 * the DRAFT→FROZEN transition (the digest does not change at freeze).
 */
export async function freezeAnalysisProtocol(
  request: FreezeAnalysisProtocolRequest,
  deps: ProtocolAdminDeps = {},
): Promise<{ protocol: AnalysisProtocolDto }> {
  const repository = deps.repository ?? analysisProtocolRepository;
  const parsed = parseStudyInput(
    freezeProtocolInputSchema,
    request.input,
    'analysis-protocol freeze input',
  );
  const current = await repository.findById(parsed.protocolId);
  if (!current) {
    throw new StudyInvariantError(`freeze references unknown protocol ${parsed.protocolId}`);
  }
  // A1-CODE-06/§25: an OPTIONAL caller precondition. If the caller asserts an expected digest, it must
  // match the persisted state — otherwise the freeze the caller intends targets a materially different
  // protocol state, and must NOT proceed (and NOT alias to this frozen protocol).
  if (
    parsed.expectedDefinitionDigest !== undefined &&
    parsed.expectedDefinitionDigest !== current.definitionDigest
  ) {
    throw new StudyDomainConflictError(
      current.protocolVersion,
      current.definitionDigest,
      parsed.expectedDefinitionDigest,
    );
  }
  const requestHash = protocolFreezeRequestHash({
    protocolVersion: current.protocolVersion,
    expectedDefinitionDigest: current.definitionDigest,
    expectedLifecycleStatus: 'DRAFT', // fixed precondition marker (stable across freeze)
    context: PROTOCOL_ADMIN_CONTEXT,
  });
  const protocol = await repository.freeze({
    protocolId: parsed.protocolId,
    frozenAt: new Date(), // trusted freeze timestamp
    idempotencyKey: request.idempotencyKey,
    requestHash,
  });
  return { protocol };
}

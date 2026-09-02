// PagaMenos · src/services — frozen-protocol analysis load (spec §2.1/§19). SANCTIONED (read-only).
//
// `loadFrozenProtocolForAnalysis` loads a FROZEN protocol and RE-VERIFIES it fail-closed: it recomputes
// the digest from the persisted `definitionJson` using the row's OWN version tags and compares to the
// stored `definitionDigest` (never a current-constant fallback, spec §2.1). It reads through the
// protocol repository's read methods only — no write capability.
import {
  analysisProtocolRepository,
  type AnalysisProtocolDto,
  type ProtocolStore,
} from '@/db/study-protocol-repository';
import {
  StudyInvariantError,
  StudyProtocolNotFrozenError,
  verifyProtocolDefinition,
} from '@/study';

export interface AnalysisDeps {
  repository?: ProtocolStore;
}

export type LoadFrozenProtocolRef = { protocolId: string } | { protocolVersion: string };

/** Load + fail-closed re-verify a FROZEN protocol for analysis (spec §2.1/§19). */
export async function loadFrozenProtocolForAnalysis(
  ref: LoadFrozenProtocolRef,
  deps: AnalysisDeps = {},
): Promise<{ protocol: AnalysisProtocolDto; definition: Record<string, unknown> }> {
  const repository = deps.repository ?? analysisProtocolRepository;
  const protocol =
    'protocolId' in ref
      ? await repository.findById(ref.protocolId)
      : await repository.findByVersion(ref.protocolVersion);
  const refLabel = 'protocolId' in ref ? ref.protocolId : ref.protocolVersion;
  if (!protocol)
    throw new StudyInvariantError(`analysis load references unknown protocol ${refLabel}`);
  if (protocol.lifecycleStatus !== 'FROZEN') throw new StudyProtocolNotFrozenError(refLabel);
  const definition = verifyProtocolDefinition({
    definitionSchemaVersion: protocol.definitionSchemaVersion,
    canonicalizationVersion: protocol.canonicalizationVersion,
    definitionJson: protocol.definitionJson,
    definitionDigest: protocol.definitionDigest,
    protocolRef: refLabel,
  });
  return { protocol, definition };
}

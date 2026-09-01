// PagaMenos · src/services — TRUSTED study-administration barrel (spec §11/§13). SANCTIONED SURFACE.
//
// Aggregates the trusted research/system write capabilities: protocol administration, experiment
// administration, recruitment provisioning, and assignment administration. This barrel is the ONLY
// sanctioned way a future trusted admin entrypoint reaches these operations; the module-capability AST
// test forbids participant-facing/app modules and arbitrary services from importing it or the
// underlying admin service modules. It deliberately does NOT export the participant consent surface.
export {
  registerAnalysisProtocolDraft,
  freezeAnalysisProtocol,
  type RegisterAnalysisProtocolDraftRequest,
  type FreezeAnalysisProtocolRequest,
} from './study-protocol-admin';

export { createExperiment, type CreateExperimentRequest } from './study-experiment-admin';

export {
  registerStudyParticipant,
  type RegisterStudyParticipantRequest,
} from './study-recruitment';

export { assignParticipant, type AssignParticipantRequest } from './study-assignment-admin';

// Read-only analysis load is safe to expose alongside admin (no write capability).
export {
  loadFrozenProtocolForAnalysis,
  type LoadFrozenProtocolRef,
} from './study-analysis';

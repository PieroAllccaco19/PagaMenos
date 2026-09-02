// PagaMenos · src/services — ExperimentAdministrationCapability (spec §4/§11/§19). SANCTIONED.
//
// The only sanctioned surface for `createExperiment`. An experiment references exactly one FROZEN
// protocol (repository pre-check + DB trigger). The raw `study-experiment-repository` is reachable
// ONLY from here (module-capability AST test); participant-facing/app code cannot reach it.
import {
  experimentRepository,
  type ExperimentDto,
  type ExperimentStore,
} from '@/db/study-experiment-repository';
import {
  createExperimentInputSchema,
  experimentCreateRequestHash,
  parseStudyInput,
  type CreateExperimentInput,
  type TrustedContext,
} from '@/study';

const EXPERIMENT_ADMIN_CONTEXT: TrustedContext = {
  capability: 'ExperimentAdministrationCapability',
};

export interface ExperimentAdminDeps {
  repository?: ExperimentStore;
}

export interface CreateExperimentRequest {
  input: CreateExperimentInput;
  idempotencyKey: string;
}

/** Create an experiment bound to a FROZEN protocol (single insert + receipt). No `recruitmentPolicy`. */
export async function createExperiment(
  request: CreateExperimentRequest,
  deps: ExperimentAdminDeps = {},
): Promise<{ experiment: ExperimentDto }> {
  const repository = deps.repository ?? experimentRepository;
  const parsed = parseStudyInput(
    createExperimentInputSchema,
    request.input,
    'experiment creation input',
  );
  const requestHash = experimentCreateRequestHash({
    experimentCode: parsed.experimentCode,
    frozenProtocolId: parsed.frozenProtocolId,
    context: EXPERIMENT_ADMIN_CONTEXT,
  });
  const experiment = await repository.create({
    experimentCode: parsed.experimentCode,
    frozenProtocolId: parsed.frozenProtocolId,
    idempotencyKey: request.idempotencyKey,
    requestHash,
  });
  return { experiment };
}

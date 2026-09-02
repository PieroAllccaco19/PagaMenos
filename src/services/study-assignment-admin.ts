// PagaMenos · src/services — AssignmentAdministrationCapability (spec §7/§11/§19). SANCTIONED.
//
// The only sanctioned surface for `assignParticipant`. `enrolledAt` is the trusted system clock and
// `observationStartAt = enrolledAt`; the caller supplies NO anchor/window/protocol id. The raw
// `study-assignment-repository` is reachable ONLY from here (module-capability AST test).
import {
  experimentAssignmentRepository,
  type AssignmentStore,
  type ExperimentAssignmentDto,
} from '@/db/study-assignment-repository';
import {
  assignParticipantInputSchema,
  assignParticipantRequestHash,
  parseStudyInput,
  type AssignParticipantInput,
  type TrustedContext,
} from '@/study';

const ASSIGNMENT_ADMIN_CONTEXT: TrustedContext = {
  capability: 'AssignmentAdministrationCapability',
};

export interface AssignmentAdminDeps {
  repository?: AssignmentStore;
}

export interface AssignParticipantRequest {
  input: AssignParticipantInput;
  idempotencyKey: string;
}

/** Enroll a participant into an experiment (trusted clock; immutable official-population membership). */
export async function assignParticipant(
  request: AssignParticipantRequest,
  deps: AssignmentAdminDeps = {},
): Promise<{ assignment: ExperimentAssignmentDto }> {
  const repository = deps.repository ?? experimentAssignmentRepository;
  const parsed = parseStudyInput(assignParticipantInputSchema, request.input, 'assignment input');
  const requestHash = assignParticipantRequestHash({
    experimentId: parsed.experimentId,
    participantId: parsed.participantId,
    context: ASSIGNMENT_ADMIN_CONTEXT,
  });
  const assignment = await repository.assign({
    experimentId: parsed.experimentId,
    participantId: parsed.participantId,
    enrolledAt: new Date(), // trusted enrollment instant; observationStartAt is set equal to it
    idempotencyKey: request.idempotencyKey,
    requestHash,
  });
  return { assignment };
}

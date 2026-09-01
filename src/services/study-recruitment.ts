// PagaMenos · src/services — RecruitmentProvisioningCapability (spec §5/§6/§11). SANCTIONED.
//
// The only sanctioned surface for the trusted recruitment resolver + `registerStudyParticipant`. It
// resolves a rotating credential (or a directly-supplied trusted stable key) to the STABLE
// `recruitmentSubjectKey`, then registers/deduplicates on that key — so credential/transport rotation
// for the same subject converges to one participant. The material request hash uses only the stable
// key + version (never the rotating credential, §10). The raw `study-participant-repository` is
// reachable ONLY from here (module-capability AST test).
import {
  studyParticipantRepository,
  type ParticipantStore,
  type StudyParticipantDto,
} from '@/db/study-participant-repository';
import {
  InMemoryRecruitmentResolver,
  parseStudyInput,
  participantRegisterRequestHash,
  registerParticipantInputSchema,
  type RecruitmentResolver,
  type RegisterParticipantInput,
  type TrustedContext,
} from '@/study';

const RECRUITMENT_CONTEXT: TrustedContext = { capability: 'RecruitmentProvisioningCapability' };

/** Default resolver: production has no rotating-credential registry yet, so it supports only
 * directly-supplied trusted stable keys; a rotating credential fails closed. Tests inject a linked
 * `InMemoryRecruitmentResolver` to exercise credential rotation → same subject. */
const defaultResolver = new InMemoryRecruitmentResolver();

export interface RecruitmentDeps {
  repository?: ParticipantStore;
  resolver?: RecruitmentResolver;
}

export interface RegisterStudyParticipantRequest {
  input: RegisterParticipantInput;
  idempotencyKey: string;
}

/** Register (or idempotently resolve) a study participant by stable recruitment subject identity. */
export async function registerStudyParticipant(
  request: RegisterStudyParticipantRequest,
  deps: RecruitmentDeps = {},
): Promise<{ participant: StudyParticipantDto }> {
  const repository = deps.repository ?? studyParticipantRepository;
  const resolver = deps.resolver ?? defaultResolver;
  const parsed = parseStudyInput(
    registerParticipantInputSchema,
    request.input,
    'participant registration input',
  );

  const resolved =
    'recruitmentCredential' in parsed
      ? await resolver.resolveCredential(parsed.recruitmentCredential)
      : resolver.resolveDirectKey(parsed.recruitmentSubjectKey, parsed.recruitmentKeyVersion);

  const requestHash = participantRegisterRequestHash({
    recruitmentSubjectKey: resolved.recruitmentSubjectKey,
    recruitmentKeyVersion: resolved.recruitmentKeyVersion,
    context: RECRUITMENT_CONTEXT,
  });
  const participant = await repository.register({
    recruitmentSubjectKey: resolved.recruitmentSubjectKey,
    recruitmentKeyVersion: resolved.recruitmentKeyVersion,
    idempotencyKey: request.idempotencyKey,
    requestHash,
  });
  return { participant };
}

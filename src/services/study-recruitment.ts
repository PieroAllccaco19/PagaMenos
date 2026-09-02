// PagaMenos · src/services — RecruitmentProvisioningCapability (spec §5/§6/§11/§13; A1-CODE-02). SANCTIONED.
//
// The only sanctioned surface for the trusted recruitment resolver + `registerStudyParticipant`, plus
// the durable credential-provisioning (`linkRecruitmentCredential`). Identity is DURABLE: once a
// subject anchor is issued a `(recruitmentSubjectKey, recruitmentKeyVersion)`, the resolver consults
// that stored authority BEFORE applying current/default derivation — so rotated credentials, expired
// invites, and a later default key-version advance all still resolve the SAME subject to the SAME
// stable key/version. The raw recruitment + participant repositories are reachable ONLY from here.
import { sha256Hex } from '@/persistence';
import {
  studyRecruitmentRepository,
  type RecruitmentIdentityStore,
} from '@/db/study-recruitment-repository';
import {
  studyParticipantRepository,
  type ParticipantStore,
  type StudyParticipantDto,
} from '@/db/study-participant-repository';
import {
  parseStudyInput,
  participantRegisterRequestHash,
  RECRUITMENT_KEY_VERSION_V1,
  registerParticipantInputSchema,
  StudyRecruitmentResolutionError,
  UnsupportedStudyVersionError,
  type RecruitmentResolver,
  type RegisterParticipantInput,
  type ResolvedRecruitmentSubject,
  type TrustedContext,
} from '@/study';

const RECRUITMENT_CONTEXT: TrustedContext = { capability: 'RecruitmentProvisioningCapability' };

/** Default subject-key derivation: version-scoped so distinct default versions derive distinct keys
 * for a never-issued anchor. Once issued, the DURABLE stored key is authoritative regardless. */
function defaultDeriveSubjectKey(subjectAnchor: string, recruitmentKeyVersion: string): string {
  return sha256Hex(`${recruitmentKeyVersion}|${subjectAnchor}`);
}

/**
 * The production trusted recruitment resolver (spec §5/§6/§13; A1-CODE-02). Backed by durable storage,
 * so identity survives process restart (it holds no authoritative in-memory state). A rotating
 * credential must first be provisioned via `linkRecruitmentCredential`; resolving it returns the
 * durable subject identity (issuing one on first resolve of a never-issued anchor).
 */
export class DurableRecruitmentResolver implements RecruitmentResolver {
  private readonly currentKeyVersion: string;
  private readonly deriveKey: (subjectAnchor: string, version: string) => string;

  constructor(
    private readonly repository: RecruitmentIdentityStore = studyRecruitmentRepository,
    opts: {
      currentKeyVersion?: string;
      deriveKey?: (subjectAnchor: string, version: string) => string;
    } = {},
  ) {
    this.currentKeyVersion = opts.currentKeyVersion ?? RECRUITMENT_KEY_VERSION_V1;
    this.deriveKey = opts.deriveKey ?? defaultDeriveSubjectKey;
  }

  async resolveCredential(recruitmentCredential: string): Promise<ResolvedRecruitmentSubject> {
    const subjectAnchor = await this.repository.findCredentialAnchor(recruitmentCredential);
    if (subjectAnchor === null) {
      throw new StudyRecruitmentResolutionError(
        'recruitment credential is not provisioned to a trusted subject',
      );
    }
    return this.resolveDurableIdentity(subjectAnchor);
  }

  resolveDirectKey(
    recruitmentSubjectKey: string,
    recruitmentKeyVersion: string,
  ): ResolvedRecruitmentSubject {
    if (recruitmentKeyVersion !== RECRUITMENT_KEY_VERSION_V1) {
      throw new UnsupportedStudyVersionError('recruitmentKeyVersion', recruitmentKeyVersion);
    }
    const key = recruitmentSubjectKey.trim();
    if (key.length === 0) {
      throw new StudyRecruitmentResolutionError(
        'recruitmentSubjectKey must be a non-empty stable key',
      );
    }
    return { recruitmentSubjectKey: key, recruitmentKeyVersion };
  }

  /** Consult durable issuance BEFORE deriving: an already-issued anchor keeps its original key/version. */
  private async resolveDurableIdentity(subjectAnchor: string): Promise<ResolvedRecruitmentSubject> {
    const existing = await this.repository.findSubjectIdentityByAnchor(subjectAnchor);
    if (existing) return existing;
    const recruitmentSubjectKey = this.deriveKey(subjectAnchor, this.currentKeyVersion);
    return this.repository.issueSubjectIdentity({
      subjectAnchor,
      recruitmentSubjectKey,
      recruitmentKeyVersion: this.currentKeyVersion,
    });
  }
}

/** The production default resolver (durable). */
const defaultResolver = new DurableRecruitmentResolver();

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

export interface LinkRecruitmentCredentialRequest {
  credential: string;
  subjectAnchor: string;
}

export interface RecruitmentProvisioningDeps {
  identityRepository?: RecruitmentIdentityStore;
}

/** Durably provision a rotating credential → subject anchor binding (trusted provisioning; spec §13).
 * Idempotent for the same anchor; a credential already bound to a different subject is a conflict. */
export async function linkRecruitmentCredential(
  request: LinkRecruitmentCredentialRequest,
  deps: RecruitmentProvisioningDeps = {},
): Promise<void> {
  const repository = deps.identityRepository ?? studyRecruitmentRepository;
  const credential = request.credential.trim();
  const subjectAnchor = request.subjectAnchor.trim();
  if (credential.length === 0 || subjectAnchor.length === 0) {
    throw new StudyRecruitmentResolutionError('credential and subjectAnchor must be non-empty');
  }
  await repository.linkCredential(credential, subjectAnchor);
}

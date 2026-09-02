// PagaMenos · src/db — durable recruitment identity repository (spec §5/§11/§13; A1-CODE-02). INTERNAL.
//
// The trusted recruitment/identity boundary's durable storage: `recruitment_subject_identity`
// (subjectAnchor → issued recruitmentSubjectKey + recruitmentKeyVersion, authoritative forever) and
// `recruitment_credential_link` (rotating credential → subjectAnchor, no silent reassignment). No PII
// / no study truth. Both append-only (DB triggers). Issuance is race-safe (UNIQUE + P2002).
//
// Owning sanctioned service (module-capability AST test): `services/study-recruitment.ts`.
import { type PrismaClient } from '@prisma/client';

import { StudyRecruitmentResolutionError } from '@/study';

import { prisma as defaultPrisma } from './client';
import { isUniqueViolation, wrapStudyUnexpected } from './study-support';

export interface DurableSubjectIdentity {
  recruitmentSubjectKey: string;
  recruitmentKeyVersion: string;
}

export interface RecruitmentIdentityStore {
  findSubjectIdentityByAnchor(subjectAnchor: string): Promise<DurableSubjectIdentity | null>;
  issueSubjectIdentity(args: {
    subjectAnchor: string;
    recruitmentSubjectKey: string;
    recruitmentKeyVersion: string;
  }): Promise<DurableSubjectIdentity>;
  findCredentialAnchor(credential: string): Promise<string | null>;
  linkCredential(credential: string, subjectAnchor: string): Promise<void>;
}

export class StudyRecruitmentRepository implements RecruitmentIdentityStore {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async findSubjectIdentityByAnchor(subjectAnchor: string): Promise<DurableSubjectIdentity | null> {
    const row = await this.prisma.recruitmentSubjectIdentity.findUnique({
      where: { subjectAnchor },
    });
    return row
      ? {
          recruitmentSubjectKey: row.recruitmentSubjectKey,
          recruitmentKeyVersion: row.recruitmentKeyVersion,
        }
      : null;
  }

  /** Issue a durable identity for a NEVER-issued anchor; race-safe (a concurrent issuance wins and is
   * returned). The stored (key, version) is authoritative forever after. */
  async issueSubjectIdentity(args: {
    subjectAnchor: string;
    recruitmentSubjectKey: string;
    recruitmentKeyVersion: string;
  }): Promise<DurableSubjectIdentity> {
    try {
      const row = await this.prisma.recruitmentSubjectIdentity.create({ data: args });
      return {
        recruitmentSubjectKey: row.recruitmentSubjectKey,
        recruitmentKeyVersion: row.recruitmentKeyVersion,
      };
    } catch (e) {
      if (!isUniqueViolation(e)) throw wrapStudyUnexpected(e, 'issue recruitment subject identity');
      // A concurrent issuance for the same anchor committed first — return the durable authority.
      const existing = await this.findSubjectIdentityByAnchor(args.subjectAnchor);
      if (existing) return existing;
      throw wrapStudyUnexpected(e, 'issue recruitment subject identity (missing after conflict)');
    }
  }

  async findCredentialAnchor(credential: string): Promise<string | null> {
    const row = await this.prisma.recruitmentCredentialLink.findUnique({ where: { credential } });
    return row ? row.subjectAnchor : null;
  }

  /** Durably bind a credential to a subject anchor. Idempotent for the same anchor; a credential
   * already bound to a DIFFERENT anchor is a conflict (no silent reassignment, spec §13). */
  async linkCredential(credential: string, subjectAnchor: string): Promise<void> {
    const existing = await this.findCredentialAnchor(credential);
    if (existing !== null) {
      if (existing === subjectAnchor) return; // idempotent
      throw new StudyRecruitmentResolutionError(
        'recruitment credential is already bound to a different subject (reassignment forbidden)',
      );
    }
    try {
      await this.prisma.recruitmentCredentialLink.create({ data: { credential, subjectAnchor } });
    } catch (e) {
      if (!isUniqueViolation(e)) throw wrapStudyUnexpected(e, 'link recruitment credential');
      // Concurrent link for the same credential — accept iff it resolved to the SAME anchor.
      const now = await this.findCredentialAnchor(credential);
      if (now === subjectAnchor) return;
      throw new StudyRecruitmentResolutionError(
        'recruitment credential is already bound to a different subject (reassignment forbidden)',
      );
    }
  }
}

/** Default repository over the shared Prisma client. */
export const studyRecruitmentRepository = new StudyRecruitmentRepository();

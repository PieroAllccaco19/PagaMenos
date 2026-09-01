// PagaMenos · src/study — trusted recruitment resolver boundary (spec §5/§6).
//
// A reissuable invitation/magic-link credential MUST NOT be the domain identity. The trusted
// recruitment resolver lives OUTSIDE study truth (the restricted recruitment/identity boundary) and
// maps a rotating credential → a STABLE, research-issued, pseudonymous `recruitmentSubjectKey` issued
// once per recruited subject: reissued/rotated invites for the same subject resolve to the SAME key;
// distinct subjects → distinct keys; normalized under a frozen `recruitmentKeyVersion`. No PII and no
// raw email ever crosses into the study domain (spec §5).
//
// A1 models the resolver as an interface plus an in-memory implementation for dev/tests. Its concrete
// mapping (which invite belongs to which subject) is the identity boundary's responsibility; A1's
// study domain only ever sees the resolved stable key + version.
import { sha256Hex } from '@/persistence';

import { StudyRecruitmentResolutionError, UnsupportedStudyVersionError } from './errors';
import { RECRUITMENT_KEY_VERSION_V1 } from './versions';

/** The stable, pseudonymous subject identity the study domain consumes (spec §5). */
export interface ResolvedRecruitmentSubject {
  recruitmentSubjectKey: string;
  recruitmentKeyVersion: string;
}

/** The trusted recruitment resolver boundary (spec §6). Implemented inside the identity boundary. */
export interface RecruitmentResolver {
  /** Resolve a rotating credential → stable subject key (fail closed if untrusted/unresolvable). */
  resolveCredential(recruitmentCredential: string): Promise<ResolvedRecruitmentSubject>;
  /** Validate a directly-supplied trusted stable key + version (fail closed on unknown version). */
  resolveDirectKey(recruitmentSubjectKey: string, recruitmentKeyVersion: string): ResolvedRecruitmentSubject;
}

/** Derive the stable pseudonymous key from a subject anchor (opaque; no PII). */
function deriveSubjectKey(subjectAnchor: string): string {
  return sha256Hex(`${RECRUITMENT_KEY_VERSION_V1}|${subjectAnchor}`);
}

/**
 * In-memory recruitment resolver for dev/tests. `link(credential, subjectAnchor)` records that an
 * invite belongs to a recruited subject; multiple (rotated) credentials linked to the SAME anchor
 * resolve to the SAME `recruitmentSubjectKey`; distinct anchors → distinct keys. An unlinked/unknown
 * credential fails closed. This stands in for the production identity boundary's credential↔subject map.
 */
export class InMemoryRecruitmentResolver implements RecruitmentResolver {
  private readonly credentialToAnchor = new Map<string, string>();

  /** Register (or re-register) that `credential` was issued for `subjectAnchor`. */
  link(credential: string, subjectAnchor: string): void {
    this.credentialToAnchor.set(credential, subjectAnchor);
  }

  async resolveCredential(recruitmentCredential: string): Promise<ResolvedRecruitmentSubject> {
    const anchor = this.credentialToAnchor.get(recruitmentCredential);
    if (anchor === undefined) {
      throw new StudyRecruitmentResolutionError(
        `recruitment credential could not be resolved to a trusted subject`,
      );
    }
    return {
      recruitmentSubjectKey: deriveSubjectKey(anchor),
      recruitmentKeyVersion: RECRUITMENT_KEY_VERSION_V1,
    };
  }

  resolveDirectKey(recruitmentSubjectKey: string, recruitmentKeyVersion: string): ResolvedRecruitmentSubject {
    if (recruitmentKeyVersion !== RECRUITMENT_KEY_VERSION_V1) {
      throw new UnsupportedStudyVersionError('recruitmentKeyVersion', recruitmentKeyVersion);
    }
    const key = recruitmentSubjectKey.trim();
    if (key.length === 0) {
      throw new StudyRecruitmentResolutionError('recruitmentSubjectKey must be a non-empty stable key');
    }
    return { recruitmentSubjectKey: key, recruitmentKeyVersion };
  }
}

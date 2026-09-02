// PagaMenos · src/study — trusted recruitment resolver boundary CONTRACT (spec §5/§6; A1-CODE-02).
//
// A reissuable invitation/magic-link credential MUST NOT be the domain identity. The trusted
// recruitment resolver lives OUTSIDE study truth (the restricted recruitment/identity boundary) and
// maps a rotating credential → a STABLE, research-issued, pseudonymous `recruitmentSubjectKey` issued
// once per recruited subject: reissued/rotated invites for the same subject resolve to the SAME key;
// distinct subjects → distinct keys; normalized under a frozen `recruitmentKeyVersion`. No PII and no
// raw email ever crosses into the study domain (spec §5).
//
// This module defines only the CONTRACT (types). The production implementation is the DURABLE,
// storage-backed `DurableRecruitmentResolver` in `services/study-recruitment.ts` (A1-CODE-02): a
// resolver whose issued identity survives credential rotation, key-version evolution, and process
// restart. There is intentionally NO in-memory/non-durable default resolver.

/** The stable, pseudonymous subject identity the study domain consumes (spec §5). */
export interface ResolvedRecruitmentSubject {
  recruitmentSubjectKey: string;
  recruitmentKeyVersion: string;
}

/** The trusted recruitment resolver boundary (spec §6). Implemented durably in the recruitment service. */
export interface RecruitmentResolver {
  /** Resolve a rotating credential → stable subject key (fail closed if untrusted/unresolvable). */
  resolveCredential(recruitmentCredential: string): Promise<ResolvedRecruitmentSubject>;
  /** Validate a directly-supplied trusted stable key + version (fail closed on unknown version). */
  resolveDirectKey(recruitmentSubjectKey: string, recruitmentKeyVersion: string): ResolvedRecruitmentSubject;
}

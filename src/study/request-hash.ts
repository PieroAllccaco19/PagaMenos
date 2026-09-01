// PagaMenos · src/study — canonical material request fingerprints (spec §10/§26).
//
// `requestHash = canonical(complete normalized MATERIAL caller request + stable trusted context)`,
// reusing the accepted M3.5A canonical hasher. It EXCLUDES sampled/derived outputs: DB id, createdAt,
// recordedAt, enrolledAt, participantCode, consentSeq, capturedAt (spec §10). Each fingerprint carries
// an `op` discriminator so one transport key can never match a materially different operation, and the
// resolved stable trusted context/actor identity, so a caller requesting B never receives A.
import { canonicalHash } from '@/persistence';

import {
  ASSIGN_PARTICIPANT_OPERATION_SCOPE,
  CONSENT_GRANT_OPERATION_SCOPE,
  CONSENT_WITHDRAW_OPERATION_SCOPE,
  EXPERIMENT_CREATE_OPERATION_SCOPE,
  PARTICIPANT_REGISTER_OPERATION_SCOPE,
  PROTOCOL_FREEZE_OPERATION_SCOPE,
  PROTOCOL_REGISTER_OPERATION_SCOPE,
} from './versions';

/** Stable trusted calling context (resolved by a trusted adapter, never caller-authored). */
export type TrustedContext = Record<string, string>;

/** Protocol registration hash (spec §26): protocol identity + full normalized definition + versions. */
export function protocolRegisterRequestHash(material: {
  protocolVersion: string;
  definitionSchemaVersion: string;
  canonicalizationVersion: string;
  normalizedDefinition: Record<string, unknown>;
  context: TrustedContext;
}): string {
  return canonicalHash({
    op: PROTOCOL_REGISTER_OPERATION_SCOPE,
    protocolVersion: material.protocolVersion,
    definitionSchemaVersion: material.definitionSchemaVersion,
    canonicalizationVersion: material.canonicalizationVersion,
    normalizedDefinition: material.normalizedDefinition,
    context: material.context,
  });
}

/** Protocol freeze hash (spec §26): protocol identity + expected current digest/version so one key
 * cannot acknowledge freezing a materially different protocol state. */
export function protocolFreezeRequestHash(material: {
  protocolVersion: string;
  expectedDefinitionDigest: string;
  expectedLifecycleStatus: string;
  context: TrustedContext;
}): string {
  return canonicalHash({
    op: PROTOCOL_FREEZE_OPERATION_SCOPE,
    protocolVersion: material.protocolVersion,
    expectedDefinitionDigest: material.expectedDefinitionDigest,
    expectedLifecycleStatus: material.expectedLifecycleStatus,
    context: material.context,
  });
}

/** Experiment creation hash (spec §26): experimentCode + frozenProtocolId + context. No policy. */
export function experimentCreateRequestHash(material: {
  experimentCode: string;
  frozenProtocolId: string;
  context: TrustedContext;
}): string {
  return canonicalHash({
    op: EXPERIMENT_CREATE_OPERATION_SCOPE,
    experimentCode: material.experimentCode,
    frozenProtocolId: material.frozenProtocolId,
    context: material.context,
  });
}

/** Participant registration hash (spec §10/§26): stable recruitmentSubjectKey + version (never the
 * rotating credential) + context. */
export function participantRegisterRequestHash(material: {
  recruitmentSubjectKey: string;
  recruitmentKeyVersion: string;
  context: TrustedContext;
}): string {
  return canonicalHash({
    op: PARTICIPANT_REGISTER_OPERATION_SCOPE,
    recruitmentSubjectKey: material.recruitmentSubjectKey,
    recruitmentKeyVersion: material.recruitmentKeyVersion,
    context: material.context,
  });
}

/** Assignment hash (spec §26): experimentId + participantId + context. */
export function assignParticipantRequestHash(material: {
  experimentId: string;
  participantId: string;
  context: TrustedContext;
}): string {
  return canonicalHash({
    op: ASSIGN_PARTICIPANT_OPERATION_SCOPE,
    experimentId: material.experimentId,
    participantId: material.participantId,
    context: material.context,
  });
}

/** GRANT hash (spec §10/§26): resolved own assignment identity + ALL provenance + stable trusted
 * participant/context identity. There is NO `assertedEffectiveAt` to hash for GRANT. */
export function consentGrantRequestHash(material: {
  assignmentId: string;
  consentVersion: string;
  privacyNoticeVersion: string;
  optionalEvidenceConsent: boolean;
  context: TrustedContext;
}): string {
  return canonicalHash({
    op: CONSENT_GRANT_OPERATION_SCOPE,
    assignmentId: material.assignmentId,
    consentVersion: material.consentVersion,
    privacyNoticeVersion: material.privacyNoticeVersion,
    optionalEvidenceConsent: material.optionalEvidenceConsent,
    context: material.context,
  });
}

/** WITHDRAW hash (spec §10/§26): resolved own assignment identity + `assertedEffectiveAt` if present
 * (material) + stable trusted participant/context identity. */
export function consentWithdrawRequestHash(material: {
  assignmentId: string;
  assertedEffectiveAt: string | null;
  context: TrustedContext;
}): string {
  return canonicalHash({
    op: CONSENT_WITHDRAW_OPERATION_SCOPE,
    assignmentId: material.assignmentId,
    // Present vs absent is material; a canonical `null` distinguishes "no asserted instant".
    assertedEffectiveAt: material.assertedEffectiveAt,
    context: material.context,
  });
}

// PagaMenos · src/study — A1 operation input schemas (spec §6/§8.2/§17/§19).
//
// These validate CALLER MATERIAL input only (never trusted context or sampled outputs). The most
// load-bearing is `consentGrantPayloadSchema`: it is `.strict()`, so a GRANT bearing the forbidden
// `assertedEffectiveAt` (or any extra key) is rejected at schema validation — which the service runs
// BEFORE receipt lookup (spec §8.2/§8.10), so an invalid GRANT can never replay a prior valid receipt.
import { z } from 'zod';

import { StudyValidationError } from './errors';

/** An offset-bearing ISO-8601 instant (zone-qualified, spec conventions). */
const isoInstant = z.string().datetime({ offset: true });

const nonEmpty = z.string().trim().min(1);

/** Protocol registration material input (spec §19). `definition` is validated downstream by the
 * frozen definition schema; version tags are optional (default to current v1). */
export const registerProtocolInputSchema = z
  .object({
    protocolVersion: nonEmpty,
    definition: z.record(z.string(), z.unknown()),
    definitionSchemaVersion: nonEmpty.optional(),
    canonicalizationVersion: nonEmpty.optional(),
  })
  .strict();
export type RegisterProtocolInput = z.infer<typeof registerProtocolInputSchema>;

/** Protocol freeze material input (spec §19): the protocol identity only; frozenAt is trusted. */
export const freezeProtocolInputSchema = z.object({ protocolId: nonEmpty }).strict();
export type FreezeProtocolInput = z.infer<typeof freezeProtocolInputSchema>;

/** Experiment creation material input (spec §4/§19). No `recruitmentPolicy` field exists. */
export const createExperimentInputSchema = z
  .object({ experimentCode: nonEmpty, frozenProtocolId: nonEmpty })
  .strict();
export type CreateExperimentInput = z.infer<typeof createExperimentInputSchema>;

/** Participant registration material input (spec §6): a rotating credential OR a directly-supplied
 * trusted stable key (with its version). Exactly one form. `participantCode` is NEVER caller input. */
export const registerParticipantInputSchema = z.union([
  z.object({ recruitmentCredential: nonEmpty }).strict(),
  z.object({ recruitmentSubjectKey: nonEmpty, recruitmentKeyVersion: nonEmpty }).strict(),
]);
export type RegisterParticipantInput = z.infer<typeof registerParticipantInputSchema>;

/** Assignment material input (spec §7/§19). No caller anchor/window/protocol id is accepted. */
export const assignParticipantInputSchema = z
  .object({ experimentId: nonEmpty, participantId: nonEmpty })
  .strict();
export type AssignParticipantInput = z.infer<typeof assignParticipantInputSchema>;

/**
 * GRANT consent payload (spec §8.2). `.strict()` — a GRANT bearing `assertedEffectiveAt` (or any other
 * extra key) fails validation. GRANT has NO asserted effective instant; authorization opens only at
 * trusted `capturedAt`.
 */
export const consentGrantPayloadSchema = z
  .object({
    consentVersion: nonEmpty,
    privacyNoticeVersion: nonEmpty,
    optionalEvidenceConsent: z.boolean(),
  })
  .strict();
export type ConsentGrantPayload = z.infer<typeof consentGrantPayloadSchema>;

/** WITHDRAW consent payload (spec §8/§18). `assertedEffectiveAt` is optional and material (it can
 * narrow retrospective authorization, §8.6, and participates in the withdrawal request hash, §10). */
export const consentWithdrawPayloadSchema = z
  .object({ assertedEffectiveAt: isoInstant.optional() })
  .strict();
export type ConsentWithdrawPayload = z.infer<typeof consentWithdrawPayloadSchema>;

/** Parse with a schema, translating any failure into a typed `StudyValidationError` (spec §8.2). */
export function parseStudyInput<T>(schema: z.ZodType<T>, value: unknown, label: string): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new StudyValidationError(`invalid ${label}`, result.error.issues);
  }
  return result.data;
}

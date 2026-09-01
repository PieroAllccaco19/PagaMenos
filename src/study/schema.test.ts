// PagaMenos · src/study — A1 input schema tests (spec §8.2/§17/§19).
import { describe, expect, it } from 'vitest';

import { StudyValidationError } from './errors';
import {
  consentGrantPayloadSchema,
  consentWithdrawPayloadSchema,
  parseStudyInput,
  registerParticipantInputSchema,
} from './schema';

describe('GRANT payload schema (spec §8.2 — reject assertedEffectiveAt before receipt lookup)', () => {
  const valid = { consentVersion: 'cv1', privacyNoticeVersion: 'pv1', optionalEvidenceConsent: true };

  it('accepts a valid GRANT payload', () => {
    expect(consentGrantPayloadSchema.safeParse(valid).success).toBe(true);
  });

  it('REJECTS a GRANT bearing assertedEffectiveAt (strict)', () => {
    const withForbidden = { ...valid, assertedEffectiveAt: '2026-09-01T00:00:00.000Z' };
    expect(consentGrantPayloadSchema.safeParse(withForbidden).success).toBe(false);
    expect(() => parseStudyInput(consentGrantPayloadSchema, withForbidden, 'grant')).toThrow(
      StudyValidationError,
    );
  });

  it('rejects any other extra key and missing provenance', () => {
    expect(consentGrantPayloadSchema.safeParse({ ...valid, sneaky: 1 }).success).toBe(false);
    expect(consentGrantPayloadSchema.safeParse({ consentVersion: 'cv1', optionalEvidenceConsent: true }).success).toBe(
      false,
    );
  });
});

describe('WITHDRAW payload schema (spec §18)', () => {
  it('accepts empty and an assertedEffectiveAt instant', () => {
    expect(consentWithdrawPayloadSchema.safeParse({}).success).toBe(true);
    expect(
      consentWithdrawPayloadSchema.safeParse({ assertedEffectiveAt: '2026-09-01T00:00:00.000Z' }).success,
    ).toBe(true);
  });
  it('rejects a non-instant asserted value and extra keys', () => {
    expect(consentWithdrawPayloadSchema.safeParse({ assertedEffectiveAt: 'not-a-date' }).success).toBe(false);
    expect(consentWithdrawPayloadSchema.safeParse({ extra: 1 }).success).toBe(false);
  });
});

describe('participant registration input (spec §6)', () => {
  it('accepts a credential form OR a direct trusted-key form', () => {
    expect(registerParticipantInputSchema.safeParse({ recruitmentCredential: 'invite-abc' }).success).toBe(
      true,
    );
    expect(
      registerParticipantInputSchema.safeParse({ recruitmentSubjectKey: 'sk', recruitmentKeyVersion: 'v1' })
        .success,
    ).toBe(true);
  });
  it('rejects a participantCode (never caller input) and an empty payload', () => {
    expect(registerParticipantInputSchema.safeParse({ participantCode: 'PC1' }).success).toBe(false);
    expect(registerParticipantInputSchema.safeParse({}).success).toBe(false);
  });
});

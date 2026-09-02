// PagaMenos · src/study — request-hash contract tests (spec §10/§26).
import { describe, expect, it } from 'vitest';

import {
  assignParticipantRequestHash,
  consentGrantRequestHash,
  consentWithdrawRequestHash,
  experimentCreateRequestHash,
  participantRegisterRequestHash,
  protocolFreezeRequestHash,
  protocolRegisterRequestHash,
} from './request-hash';

const CTX = { capability: 'X' };

describe('GRANT hash (spec §10)', () => {
  const base = {
    assignmentId: 'a1',
    consentVersion: 'cv1',
    privacyNoticeVersion: 'pv1',
    optionalEvidenceConsent: true,
    context: CTX,
  };
  it('is stable for identical material', () => {
    expect(consentGrantRequestHash(base)).toBe(consentGrantRequestHash({ ...base }));
  });
  it('differs when ANY provenance field differs (no omitted persisted field)', () => {
    expect(consentGrantRequestHash({ ...base, consentVersion: 'cv2' })).not.toBe(
      consentGrantRequestHash(base),
    );
    expect(consentGrantRequestHash({ ...base, privacyNoticeVersion: 'pv2' })).not.toBe(
      consentGrantRequestHash(base),
    );
    expect(consentGrantRequestHash({ ...base, optionalEvidenceConsent: false })).not.toBe(
      consentGrantRequestHash(base),
    );
  });
  it('differs when the resolved own assignment or trusted context differs', () => {
    expect(consentGrantRequestHash({ ...base, assignmentId: 'a2' })).not.toBe(
      consentGrantRequestHash(base),
    );
    expect(consentGrantRequestHash({ ...base, context: { capability: 'Y' } })).not.toBe(
      consentGrantRequestHash(base),
    );
  });
});

describe('WITHDRAW hash (spec §10/§18)', () => {
  const base = { assignmentId: 'a1', assertedEffectiveAt: null as string | null, context: CTX };
  it('present vs absent assertedEffectiveAt is material', () => {
    expect(
      consentWithdrawRequestHash({ ...base, assertedEffectiveAt: '2026-09-01T00:00:00.000Z' }),
    ).not.toBe(consentWithdrawRequestHash(base));
  });
  it('different asserted instants differ; identical are stable', () => {
    const a = consentWithdrawRequestHash({
      ...base,
      assertedEffectiveAt: '2026-09-01T00:00:00.000Z',
    });
    const b = consentWithdrawRequestHash({
      ...base,
      assertedEffectiveAt: '2026-09-01T00:05:00.000Z',
    });
    expect(a).not.toBe(b);
    expect(a).toBe(
      consentWithdrawRequestHash({ ...base, assertedEffectiveAt: '2026-09-01T00:00:00.000Z' }),
    );
  });
});

describe('participant hash uses stable subject key + version (spec §10)', () => {
  it('differs by subject key and by version, stable otherwise', () => {
    const base = { recruitmentSubjectKey: 'sk1', recruitmentKeyVersion: 'v1', context: CTX };
    expect(participantRegisterRequestHash(base)).toBe(participantRegisterRequestHash({ ...base }));
    expect(participantRegisterRequestHash({ ...base, recruitmentSubjectKey: 'sk2' })).not.toBe(
      participantRegisterRequestHash(base),
    );
    expect(participantRegisterRequestHash({ ...base, recruitmentKeyVersion: 'v2' })).not.toBe(
      participantRegisterRequestHash(base),
    );
  });
});

describe('cross-operation discriminator (no collision across operations)', () => {
  it('register / freeze / experiment / assignment hashes are mutually distinct for overlapping fields', () => {
    const hashes = new Set([
      protocolRegisterRequestHash({
        protocolVersion: 'P1',
        definitionSchemaVersion: 'ds',
        canonicalizationVersion: 'cz',
        normalizedDefinition: { a: 1 },
        context: CTX,
      }),
      protocolFreezeRequestHash({
        protocolVersion: 'P1',
        expectedDefinitionDigest: 'd',
        expectedLifecycleStatus: 'DRAFT',
        context: CTX,
      }),
      experimentCreateRequestHash({ experimentCode: 'P1', frozenProtocolId: 'x', context: CTX }),
      assignParticipantRequestHash({ experimentId: 'P1', participantId: 'x', context: CTX }),
    ]);
    expect(hashes.size).toBe(4);
  });
});

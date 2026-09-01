// PagaMenos · src/study — protocol canonicalization/digest/verify tests (spec §2/§2.1).
import { describe, expect, it } from 'vitest';

import {
  StudyProtocolDigestMismatchError,
  StudyValidationError,
  UnsupportedStudyVersionError,
} from './errors';
import { buildProtocolDefinition, verifyProtocolDefinition } from './protocol-definition';
import { CANONICALIZATION_VERSION_V1, DEFINITION_SCHEMA_VERSION_V1 } from './versions';

const DEF = {
  observationWindowWeeks: 6,
  contaminationWindowHours: 48,
  minimumVerifiedLevel: 'CORROBORATED',
  minimumIndependentOccasions: 2,
};

describe('buildProtocolDefinition', () => {
  it('produces a digest independent of object key order (canonicalization)', () => {
    const a = buildProtocolDefinition({ definition: DEF });
    const b = buildProtocolDefinition({
      definition: {
        minimumIndependentOccasions: 2,
        minimumVerifiedLevel: 'CORROBORATED',
        contaminationWindowHours: 48,
        observationWindowWeeks: 6,
      },
    });
    expect(a.definitionDigest).toBe(b.definitionDigest);
    expect(a.definitionSchemaVersion).toBe(DEFINITION_SCHEMA_VERSION_V1);
    expect(a.canonicalizationVersion).toBe(CANONICALIZATION_VERSION_V1);
  });

  it('rejects a malformed definition (missing/extra field) with StudyValidationError', () => {
    expect(() => buildProtocolDefinition({ definition: { observationWindowWeeks: 6 } })).toThrow(
      StudyValidationError,
    );
    expect(() => buildProtocolDefinition({ definition: { ...DEF, extra: 1 } })).toThrow(
      StudyValidationError,
    );
  });

  it('fails closed for an unknown definitionSchemaVersion / canonicalizationVersion', () => {
    expect(() =>
      buildProtocolDefinition({ definition: DEF, definitionSchemaVersion: 'unknown.vX' }),
    ).toThrow(UnsupportedStudyVersionError);
    expect(() =>
      buildProtocolDefinition({ definition: DEF, canonicalizationVersion: 'unknown.vX' }),
    ).toThrow(UnsupportedStudyVersionError);
  });
});

describe('verifyProtocolDefinition (fail closed, spec §2.1)', () => {
  it('returns the normalized definition when the digest matches', () => {
    const built = buildProtocolDefinition({ definition: DEF });
    const normalized = verifyProtocolDefinition({
      definitionSchemaVersion: built.definitionSchemaVersion,
      canonicalizationVersion: built.canonicalizationVersion,
      definitionJson: built.definitionJson,
      definitionDigest: built.definitionDigest,
    });
    expect(normalized).toEqual(DEF);
  });

  it('throws on a digest mismatch (tampered definitionJson) — no silent trust', () => {
    const built = buildProtocolDefinition({ definition: DEF });
    expect(() =>
      verifyProtocolDefinition({
        definitionSchemaVersion: built.definitionSchemaVersion,
        canonicalizationVersion: built.canonicalizationVersion,
        definitionJson: { ...DEF, observationWindowWeeks: 999 }, // tampered
        definitionDigest: built.definitionDigest, // stale digest
      }),
    ).toThrow(StudyProtocolDigestMismatchError);
  });

  it('dispatches by the ROW version tags and fails closed on an unknown version (no current fallback)', () => {
    const built = buildProtocolDefinition({ definition: DEF });
    expect(() =>
      verifyProtocolDefinition({
        definitionSchemaVersion: 'future.v2',
        canonicalizationVersion: built.canonicalizationVersion,
        definitionJson: built.definitionJson,
        definitionDigest: built.definitionDigest,
      }),
    ).toThrow(UnsupportedStudyVersionError);
  });
});

// PagaMenos · persistence — frozen v1 schema & version-gate tests (§7/§19/§27/§28/§47).
import { describe, expect, it } from 'vitest';

import { chinawokDecision, CORPUS_VERSION, TEST_GIT_SHA } from './__fixtures__/decision-fixture';
import { UnsupportedSnapshotVersionError } from './errors';
import { buildDecisionSnapshotDraft } from './snapshot';
import {
  decisionSnapshotDtoSchema,
  engineInputV1Schema,
  engineOutputV1Schema,
  parseDecisionSnapshot,
} from './schema';

const { input, output } = chinawokDecision();

function validDtoObject() {
  const draft = buildDecisionSnapshotDraft({
    input,
    output,
    corpusVersion: CORPUS_VERSION,
    build: { gitSha: TEST_GIT_SHA },
    businessDecisionKey: 'bdk-1',
  });
  return {
    ...draft,
    id: '00000000-0000-0000-0000-000000000000',
    createdAt: '2026-09-01T17:00:00.000Z',
  };
}

describe('engine input/output v1 schemas — round-trip real engine payloads', () => {
  it('accepts a genuine DecideInput', () => {
    expect(() => engineInputV1Schema.parse(input)).not.toThrow();
  });
  it('accepts a genuine EngineEvaluation', () => {
    expect(() => engineOutputV1Schema.parse(output)).not.toThrow();
  });
});

describe('strict schemas reject secret-like / unknown keys (§19)', () => {
  it('rejects a card-number key smuggled into the purchase context', () => {
    const tainted = { ...input, context: { ...input.context, cardNumber: '4111111111111111' } };
    expect(() => engineInputV1Schema.parse(tainted)).toThrow();
  });
  it('rejects an unknown top-level key on the input', () => {
    expect(() => engineInputV1Schema.parse({ ...input, cvv: '123' })).toThrow();
  });
  it('rejects an unknown key on a portfolio instrument', () => {
    const tainted = {
      ...input,
      portfolio: {
        ...input.portfolio,
        instruments: [{ family: 'DINERS', pan: '4111111111111111' }],
      },
    };
    expect(() => engineInputV1Schema.parse(tainted)).toThrow();
  });
});

describe('DecisionSnapshot DTO — exact version gate (§7/§27/§47)', () => {
  it('accepts a well-formed current-version DTO', () => {
    expect(() => decisionSnapshotDtoSchema.parse(validDtoObject())).not.toThrow();
  });

  for (const field of [
    'snapshotSchemaVersion',
    'engineInputSchemaVersion',
    'engineOutputSchemaVersion',
    'engineContractVersion',
  ] as const) {
    it(`rejects an unknown ${field}`, () => {
      expect(() =>
        decisionSnapshotDtoSchema.parse({ ...validDtoObject(), [field]: 'unknown' }),
      ).toThrow();
    });
    it(`rejects a missing ${field}`, () => {
      const { [field]: _omitted, ...rest } = validDtoObject();
      void _omitted;
      expect(() => decisionSnapshotDtoSchema.parse(rest)).toThrow();
    });
  }

  it('rejects a malformed hash', () => {
    expect(() =>
      decisionSnapshotDtoSchema.parse({ ...validDtoObject(), inputHash: 'not-a-sha' }),
    ).toThrow();
  });
});

describe('version-dispatched historical decode (§28)', () => {
  it('parses a current-version record', () => {
    expect(() => parseDecisionSnapshot(validDtoObject())).not.toThrow();
  });
  it('throws UnsupportedSnapshotVersionError for an unknown snapshot version', () => {
    const stale = { ...validDtoObject(), snapshotSchemaVersion: 'pagamenos.decision-snapshot.v0' };
    expect(() => parseDecisionSnapshot(stale)).toThrow(UnsupportedSnapshotVersionError);
  });
  it('throws UnsupportedSnapshotVersionError for a missing snapshot version', () => {
    const { snapshotSchemaVersion: _omit, ...rest } = validDtoObject();
    void _omit;
    expect(() => parseDecisionSnapshot(rest)).toThrow(UnsupportedSnapshotVersionError);
  });
});

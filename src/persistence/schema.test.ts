// PagaMenos · persistence — frozen v1 schema & version-gate tests (§7/§19).
import { describe, expect, it } from 'vitest';

import { chinawokDecision, CORPUS_VERSION } from './__fixtures__/decision-fixture';
import { buildDecisionSnapshotDraft } from './snapshot';
import { decisionSnapshotDtoSchema, engineInputV1Schema, engineOutputV1Schema } from './schema';

const { input, output } = chinawokDecision();

function validDtoObject() {
  const draft = buildDecisionSnapshotDraft({
    input,
    output,
    corpusVersion: CORPUS_VERSION,
    build: { gitSha: 'abc123' },
    businessDecisionKey: 'bdk-1',
    idempotencyKey: 'idem-1',
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
    const tainted = {
      ...input,
      context: { ...input.context, cardNumber: '4111111111111111' },
    };
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

describe('DecisionSnapshot DTO — version gate (§7)', () => {
  it('accepts a well-formed current-version DTO', () => {
    expect(() => decisionSnapshotDtoSchema.parse(validDtoObject())).not.toThrow();
  });

  it('rejects a snapshot whose schema version is not current', () => {
    const stale = { ...validDtoObject(), snapshotSchemaVersion: 'pagamenos.decision-snapshot.v0' };
    expect(() => decisionSnapshotDtoSchema.parse(stale)).toThrow();
  });

  it('rejects a snapshot whose input-payload version is not current', () => {
    const stale = { ...validDtoObject(), engineInputSchemaVersion: 'something.else' };
    expect(() => decisionSnapshotDtoSchema.parse(stale)).toThrow();
  });

  it('rejects a DTO with a missing version field (unversioned payload not treated as current)', () => {
    const { snapshotSchemaVersion, ...rest } = validDtoObject();
    void snapshotSchemaVersion;
    expect(() => decisionSnapshotDtoSchema.parse(rest)).toThrow();
  });

  it('rejects a malformed hash', () => {
    const bad = { ...validDtoObject(), inputHash: 'not-a-sha' };
    expect(() => decisionSnapshotDtoSchema.parse(bad)).toThrow();
  });
});

// PagaMenos · persistence — snapshot assembly, coherence, integrity & replay tests (§6/§8/§18/§21/§27).
import { describe, expect, it } from 'vitest';

import { chinawokDecision, CORPUS_VERSION, TEST_GIT_SHA } from './__fixtures__/decision-fixture';
import { canonicalHash } from './hash';
import {
  replayWithCurrentEngine,
  verifyHistoricalSnapshot,
  verifySnapshotIntegrity,
} from './integrity';
import { SnapshotCoherenceError, SnapshotIntegrityError } from './errors';
import {
  buildDecisionSnapshotDraft,
  computeRequestHash,
  parseDecisionSnapshotDto,
  verifySnapshotCoherence,
} from './snapshot';
import {
  ENGINE_CONTRACT_VERSION,
  ENGINE_INPUT_SCHEMA_VERSION,
  ENGINE_OUTPUT_SCHEMA_VERSION,
  SNAPSHOT_SCHEMA_VERSION,
} from './versions';

const { input, output } = chinawokDecision();

function draft() {
  return buildDecisionSnapshotDraft({
    input,
    output,
    corpusVersion: CORPUS_VERSION,
    build: { gitSha: TEST_GIT_SHA, buildId: 'build-42' },
    businessDecisionKey: 'bdk-1',
  });
}

function dtoFromDraft() {
  return parseDecisionSnapshotDto({
    ...draft(),
    id: '11111111-1111-1111-1111-111111111111',
    createdAt: '2026-09-01T17:00:00.000Z',
  });
}

describe('buildDecisionSnapshotDraft — versions, hashes & lifted metadata', () => {
  it('stamps all frozen version constants', () => {
    const d = draft();
    expect(d.snapshotSchemaVersion).toBe(SNAPSHOT_SCHEMA_VERSION);
    expect(d.engineInputSchemaVersion).toBe(ENGINE_INPUT_SCHEMA_VERSION);
    expect(d.engineOutputSchemaVersion).toBe(ENGINE_OUTPUT_SCHEMA_VERSION);
    expect(d.engineContractVersion).toBe(ENGINE_CONTRACT_VERSION);
    expect(d.corpusVersion).toBe(CORPUS_VERSION);
  });

  it('hashes are the canonical hash of the exact stored payloads', () => {
    const d = draft();
    expect(d.inputHash).toBe(canonicalHash(d.engineInputJson));
    expect(d.outputHash).toBe(canonicalHash(d.engineOutputJson));
    expect(d.inputHash).toMatch(/^[0-9a-f]{64}$/);
    expect(d.outputHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('lifts queryable metadata from the OUTPUT (source of truth, §17/§21)', () => {
    const d = draft();
    expect(d.merchantId).toBe(output.merchantId);
    expect(d.merchantId).toBe('m_chinawok');
    expect(d.decisionStatus).toBe(output.final?.status);
    expect(d.decisionStatus).toBe('BEST_CONFIRMED');
    expect(d.evaluatedAt).toBe(output.evaluatedAt);
    expect(d.intendedTransactionAt).toBe(output.intendedTransactionAt);
  });

  it('carries application build metadata (§9)', () => {
    const d = draft();
    expect(d.gitSha).toBe(TEST_GIT_SHA);
    expect(d.buildId).toBe('build-42');
  });

  it('preserves the exact input & output round-trip', () => {
    const d = draft();
    expect(d.engineInputJson).toEqual(input);
    expect(d.engineOutputJson).toEqual(output);
  });

  it('rejects an empty business key (fail-closed)', () => {
    expect(() =>
      buildDecisionSnapshotDraft({
        input,
        output,
        corpusVersion: CORPUS_VERSION,
        build: { gitSha: TEST_GIT_SHA },
        businessDecisionKey: '   ',
      }),
    ).toThrow();
  });
});

describe('computeRequestHash (P35A-01 §5): equals the snapshot inputHash', () => {
  it('is the canonical hash of the input and equals draft.inputHash', () => {
    expect(computeRequestHash(input)).toBe(computeRequestHash(input));
    expect(computeRequestHash(input)).toMatch(/^[0-9a-f]{64}$/);
    expect(computeRequestHash(input)).toBe(canonicalHash(input));
    expect(computeRequestHash(input)).toBe(draft().inputHash);
  });
});

describe('verifySnapshotIntegrity / verifyHistoricalSnapshot (§28/§41)', () => {
  it('passes for an intact snapshot', () => {
    expect(() => verifyHistoricalSnapshot(dtoFromDraft())).not.toThrow();
  });

  it('throws SnapshotIntegrityError when the stored input no longer matches its hash', () => {
    const dto = dtoFromDraft();
    const corrupted = {
      ...dto,
      engineInputJson: {
        ...dto.engineInputJson,
        context: { ...dto.engineInputJson.context, branch: 'TAMPERED' },
      },
    };
    expect(() => verifySnapshotIntegrity(corrupted)).toThrow(SnapshotIntegrityError);
  });
});

describe('verifySnapshotCoherence (§18) — columns must agree with the payload', () => {
  it('passes for a coherent snapshot', () => {
    expect(() => verifySnapshotCoherence(dtoFromDraft())).not.toThrow();
  });

  it('throws SnapshotCoherenceError when merchantId column contradicts the payload', () => {
    const dto = dtoFromDraft();
    const contradictory = { ...dto, merchantId: 'm_popeyes' as typeof dto.merchantId };
    expect(() => verifySnapshotCoherence(contradictory)).toThrow(SnapshotCoherenceError);
  });

  it('throws SnapshotCoherenceError when decisionStatus column contradicts the payload', () => {
    const dto = dtoFromDraft();
    const contradictory = { ...dto, decisionStatus: 'NO_SAFE_WINNER' };
    expect(() => verifyHistoricalSnapshot(contradictory)).toThrow(SnapshotCoherenceError);
  });
});

describe('replayWithCurrentEngine (§27) — historical truth vs current replay are distinct', () => {
  it('reproduces the historical output with the current engine and keeps them separate', () => {
    const r = replayWithCurrentEngine(dtoFromDraft());
    expect(r.historicalOutput).toEqual(output);
    expect(r.matchesHistorical).toBe(true);
    expect(r.currentOutputHash).toBe(r.historicalOutputHash);
    expect(r.currentEngineReplayOutput).not.toBe(r.historicalOutput);
  });
});

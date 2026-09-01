// PagaMenos · persistence — snapshot assembly, integrity & replay tests (§6/§8/§21/§27/§28).
import { describe, expect, it } from 'vitest';

import { chinawokDecision, CORPUS_VERSION } from './__fixtures__/decision-fixture';
import { canonicalHash } from './hash';
import { replayWithCurrentEngine, verifySnapshotIntegrity } from './integrity';
import { SnapshotIntegrityError } from './errors';
import { parseDecisionSnapshotDto } from './snapshot';
import { buildDecisionSnapshotDraft } from './snapshot';
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
    build: { gitSha: 'deadbeef', buildId: 'build-42' },
    businessDecisionKey: 'bdk-1',
    idempotencyKey: 'idem-1',
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
    expect(d.gitSha).toBe('deadbeef');
    expect(d.buildId).toBe('build-42');
  });

  it('preserves the exact input & output round-trip', () => {
    const d = draft();
    expect(d.engineInputJson).toEqual(input);
    expect(d.engineOutputJson).toEqual(output);
  });

  it('rejects an empty business/idempotency key (fail-closed)', () => {
    expect(() =>
      buildDecisionSnapshotDraft({
        input,
        output,
        corpusVersion: CORPUS_VERSION,
        build: { gitSha: 'x' },
        businessDecisionKey: '   ',
        idempotencyKey: 'idem-1',
      }),
    ).toThrow();
  });
});

describe('verifySnapshotIntegrity (§28)', () => {
  it('passes for an intact snapshot', () => {
    expect(() => verifySnapshotIntegrity(dtoFromDraft())).not.toThrow();
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

  it('throws SnapshotIntegrityError when the recorded outputHash is altered', () => {
    const dto = dtoFromDraft();
    const corrupted = { ...dto, outputHash: 'f'.repeat(64) };
    expect(() => verifySnapshotIntegrity(corrupted)).toThrow(SnapshotIntegrityError);
  });
});

describe('replayWithCurrentEngine (§27) — historical truth vs current replay are distinct', () => {
  it('reproduces the historical output with the current engine and keeps them separate', () => {
    const r = replayWithCurrentEngine(dtoFromDraft());
    expect(r.historicalOutput).toEqual(output);
    expect(r.matchesHistorical).toBe(true);
    expect(r.currentOutputHash).toBe(r.historicalOutputHash);
    // historicalOutput is the immutable stored value; currentEngineReplayOutput is a fresh run.
    expect(r.currentEngineReplayOutput).not.toBe(r.historicalOutput);
  });

  it('fails closed on a corrupted stored input before replaying', () => {
    const dto = dtoFromDraft();
    const corrupted = {
      ...dto,
      engineInputJson: {
        ...dto.engineInputJson,
        context: { ...dto.engineInputJson.context, branch: 'TAMPERED' },
      },
    };
    expect(() => replayWithCurrentEngine(corrupted)).toThrow(SnapshotIntegrityError);
  });
});

// M7 S02 — a missing real-PostgreSQL prerequisite is NOT EXECUTED, never PASS (offline).
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { resolvePgBinaries } from './cluster';
import { HARNESS_CONTEXT_ENV, loadHarnessContext } from './context';
import { NotExecutedError, aggregate, exitCodeFor, runCheck, type CheckResult } from './outcome';

const pass = (id: string): CheckResult => ({ id, status: 'PASS', detail: '' });
const notExecuted = (id: string): CheckResult => ({
  id,
  status: 'NOT_EXECUTED',
  detail: '',
  missingPrerequisite: 'x',
});
const fail = (id: string): CheckResult => ({ id, status: 'FAIL', detail: '' });

describe('S02 outcome model', () => {
  it('only a non-empty all-PASS set aggregates to PASS', () => {
    expect(aggregate([pass('a'), pass('b')])).toBe('PASS');
    expect(aggregate([])).toBe('NOT_EXECUTED');
    expect(aggregate([pass('a'), notExecuted('b')])).toBe('NOT_EXECUTED');
    expect(aggregate([notExecuted('a'), fail('b')])).toBe('FAIL');
  });

  it('NOT_EXECUTED never exits 0', () => {
    expect(exitCodeFor('PASS')).toBe(0);
    expect(exitCodeFor('FAIL')).toBe(1);
    expect(exitCodeFor('NOT_EXECUTED')).toBe(2);
  });

  it('runCheck classifies NotExecutedError as NOT_EXECUTED and any other throw as FAIL', async () => {
    expect((await runCheck('a', () => 'ok')).status).toBe('PASS');
    const ne = await runCheck('b', () => {
      throw new NotExecutedError('initdb');
    });
    expect(ne).toMatchObject({ status: 'NOT_EXECUTED', missingPrerequisite: 'initdb' });
    expect((await runCheck('c', () => Promise.reject(new Error('boom')))).status).toBe('FAIL');
  });
});

describe('S02 missing-environment simulation', () => {
  const emptyBin = mkdtempSync(join(tmpdir(), 'pagamenos-m7-s02-nopg-'));
  afterAll(() => rmSync(emptyBin, { recursive: true, force: true }));

  it('an empty PG_BIN is NOT EXECUTED naming the missing server binary', async () => {
    expect(() => resolvePgBinaries(emptyBin)).toThrow(NotExecutedError);
    const result = await runCheck('H01-pg-binaries', () => {
      resolvePgBinaries(emptyBin);
      return 'resolved';
    });
    expect(result.status).toBe('NOT_EXECUTED');
    expect(result.missingPrerequisite).toMatch(/'initdb' not found in PG_BIN=/);
    expect(aggregate([result])).toBe('NOT_EXECUTED');
    expect(exitCodeFor(aggregate([result]))).not.toBe(0);
  });

  it('a nonexistent PG_BIN directory is NOT EXECUTED', () => {
    expect(() => resolvePgBinaries(join(emptyBin, 'does-not-exist'))).toThrow(NotExecutedError);
  });

  it('the real-PG suite without harness context is NOT EXECUTED, not a pass', () => {
    expect(() => loadHarnessContext({} as NodeJS.ProcessEnv)).toThrow(NotExecutedError);
    expect(() => loadHarnessContext({} as NodeJS.ProcessEnv)).toThrow(HARNESS_CONTEXT_ENV);
  });
});

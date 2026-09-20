// PagaMenos · sealed operation surface, operation-input channel and composition-time binding
// (Amendment 01 §6, §7, §9, §9.1, §11, §12, §19, §28). Offline: every case here is refused BEFORE
// the CCA transaction opens, proven by the DatabaseExecutionContext transaction counter.
import { describe, expect, it } from 'vitest';

import { defineSealedOperation } from '@/db/cca-engine';
import { createTrustedParticipantContext } from '@/study/participant-context';

import { isCcaError } from './errors';
import { readDatabaseExecutionDiagnostics } from './execution-context';
import { defineLockOrder } from './lock-order';
import {
  NOT_AUTHORIZED,
  deepFreeze,
  sealOperation,
  snapshotOperationInput,
} from './sealed-operation';
import { REPLAY_MISS } from './replay';

const ASSIGNMENT = '00000000-0000-4000-8000-0000000000aa';
const LOCK_ORDER = defineLockOrder(['ROOT']);

interface Input {
  readonly assignmentId: string;
  readonly note: string;
}
interface Api {
  persist(note: string): Promise<string>;
}

let executorCalls = 0;
let parsed: unknown[] = [];

function makeOperation(overrides: Record<string, unknown> = {}) {
  return defineSealedOperation<Input, string, Api>({
    operationId: 'cca.test.sealed',
    policy: 'GENERAL_COLLECTION',
    parseInput: (raw: unknown): Input => {
      parsed.push(raw);
      const o = raw as Record<string, unknown>;
      if (typeof o.assignmentId !== 'string' || typeof o.note !== 'string' || o.note === '') {
        throw new Error('malformed operation material');
      }
      return { assignmentId: o.assignmentId, note: o.note };
    },
    assignmentRef: (input: Readonly<Input>) => input.assignmentId,
    lockOrder: LOCK_ORDER,
    adapter: { persist: async (_tx: unknown, _b: unknown, note: string) => note },
    executor: async (input: Readonly<Input>, _scope: unknown, adapter: Api) => {
      executorCalls++;
      return adapter.persist(input.note);
    },
    ...overrides,
  } as never);
}

const context = createTrustedParticipantContext('participant-1');

function ccaCount(): number {
  return readDatabaseExecutionDiagnostics().ccaTransactions;
}

describe('composition-time definition (§14, §19)', () => {
  it('refuses an unknown definition key (no callback/purpose/port smuggling)', () => {
    for (const key of ['callback', 'purpose', 'port', 'client', 'prisma']) {
      expect(() => makeOperation({ [key]: () => undefined })).toThrow(/CCA_INVALID_DEFINITION/);
    }
  });

  it('refuses an unknown policy, a missing executor and an invalid lock order', () => {
    expect(() => makeOperation({ policy: 'ANYTHING' })).toThrow(/CCA_INVALID_DEFINITION/);
    expect(() => makeOperation({ policy: undefined })).toThrow(/CCA_INVALID_DEFINITION/);
    expect(() => makeOperation({ executor: 'not-a-function' })).toThrow(/CCA_INVALID_DEFINITION/);
    expect(() => makeOperation({ lockOrder: { ranks: ['ROOT'] } })).toThrow(
      /CCA_INVALID_DEFINITION/,
    );
  });

  it('refuses a non-function replay lookup', () => {
    expect(() => makeOperation({ preCcaReplayLookup: {} })).toThrow(/CCA_INVALID_DEFINITION/);
  });
});

describe('sealed surface (§6, §11, §12)', () => {
  it('exposes only execute, on a frozen null-prototype object', () => {
    const op = makeOperation();
    expect(Reflect.ownKeys(op)).toEqual(['execute']);
    expect(Object.getPrototypeOf(op)).toBeNull();
    expect(Object.isFrozen(op)).toBe(true);
    expect(() => {
      (op as unknown as Record<string, unknown>).execute = () => undefined;
    }).toThrow(TypeError);
  });

  it('rejects any extra argument — a caller cannot supply a callback, executor or policy', async () => {
    const op = makeOperation();
    const before = ccaCount();
    for (const extra of [() => undefined, 'OPTIONAL_EVIDENCE', { policy: 'OPTIONAL_EVIDENCE' }]) {
      await expect(
        (op.execute as unknown as (...a: unknown[]) => Promise<unknown>)(
          context,
          { assignmentId: ASSIGNMENT, note: 'n' },
          extra,
        ),
      ).rejects.toSatisfy((e) => isCcaError(e, 'CCA_SEALED_SURFACE_VIOLATION'));
    }
    expect(ccaCount()).toBe(before);
  });

  it('requires a trusted participant context — before any database access', async () => {
    const op = makeOperation();
    const before = ccaCount();
    for (const forged of [
      { participantId: 'participant-1' },
      null,
      'participant-1',
      { ...context },
    ]) {
      await expect(
        op.execute(forged as never, { assignmentId: ASSIGNMENT, note: 'n' }),
      ).rejects.toSatisfy((e) => isCcaError(e, 'CCA_UNTRUSTED_PARTICIPANT_CONTEXT'));
    }
    expect(ccaCount()).toBe(before);
  });
});

describe('operation input channel (§9.1, §12)', () => {
  it('rejects non-data input (functions/callbacks cannot ride in the input)', async () => {
    const op = makeOperation();
    const before = ccaCount();
    await expect(
      op.execute(context, {
        assignmentId: ASSIGNMENT,
        note: 'n',
        hook: () => undefined,
      } as never),
    ).rejects.toSatisfy((e) => isCcaError(e, 'CCA_INVALID_OPERATION_INPUT'));
    await expect(op.execute(context, 'not-an-object' as never)).rejects.toSatisfy((e) =>
      isCcaError(e, 'CCA_INVALID_OPERATION_INPUT'),
    );
    expect(ccaCount()).toBe(before);
  });

  it('malformed operation material → CCA never runs and the executor is never called', async () => {
    const op = makeOperation();
    const before = ccaCount();
    executorCalls = 0;
    await expect(op.execute(context, { assignmentId: ASSIGNMENT, note: '' })).rejects.toSatisfy(
      (e) => isCcaError(e, 'CCA_INVALID_OPERATION_INPUT'),
    );
    expect(executorCalls).toBe(0);
    expect(ccaCount()).toBe(before);
  });

  it('rejects an assignment reference that is not a uuid', async () => {
    const op = makeOperation();
    const before = ccaCount();
    await expect(op.execute(context, { assignmentId: 'all', note: 'n' })).rejects.toSatisfy((e) =>
      isCcaError(e, 'CCA_INVALID_OPERATION_INPUT'),
    );
    expect(ccaCount()).toBe(before);
  });

  it('snapshots the input: later caller mutation cannot change what the operation saw', async () => {
    const op = makeOperation();
    parsed = [];
    const mutable = { assignmentId: ASSIGNMENT, note: 'original' };
    await op.execute(context, mutable).catch(() => undefined);
    mutable.note = 'mutated';
    expect((parsed[0] as { note: string }).note).toBe('original');
    expect(Object.isFrozen(parsed[0])).toBe(true);
  });

  it('snapshotOperationInput freezes deeply and rejects non-data values', () => {
    const snap = snapshotOperationInput({ a: { b: [1, 2] } }) as { a: { b: number[] } };
    expect(Object.isFrozen(snap)).toBe(true);
    expect(Object.isFrozen(snap.a)).toBe(true);
    expect(Object.isFrozen(snap.a.b)).toBe(true);
    expect(() => snapshotOperationInput({ f: () => 1 })).toThrow(/CCA_INVALID_OPERATION_INPUT/);
    expect(() => snapshotOperationInput({ s: Symbol('x') })).toThrow(/CCA_INVALID_OPERATION_INPUT/);
    expect(deepFreeze({ x: { y: 1 } }).x).toEqual({ y: 1 });
  });
});

describe('replay contract (§28)', () => {
  it('a pre-CCA lookup hit returns without opening the CCA transaction', async () => {
    const op = makeOperation({
      preCcaReplayLookup: async () => 'durable-existing-result',
    });
    const before = ccaCount();
    executorCalls = 0;
    await expect(op.execute(context, { assignmentId: ASSIGNMENT, note: 'n' })).resolves.toBe(
      'durable-existing-result',
    );
    expect(ccaCount()).toBe(before);
    expect(executorCalls).toBe(0);
  });

  it('a lookup may never answer NOT_AUTHORIZED (replay is not a consent probe)', async () => {
    const op = makeOperation({ preCcaReplayLookup: async () => NOT_AUTHORIZED });
    await expect(op.execute(context, { assignmentId: ASSIGNMENT, note: 'n' })).rejects.toSatisfy(
      (e) => isCcaError(e, 'CCA_REPLAY_CONTRACT_VIOLATION'),
    );
  });

  it('a lookup may never answer null/undefined', async () => {
    for (const answer of [null, undefined]) {
      const op = makeOperation({ preCcaReplayLookup: async () => answer });
      await expect(op.execute(context, { assignmentId: ASSIGNMENT, note: 'n' })).rejects.toSatisfy(
        (e) => isCcaError(e, 'CCA_REPLAY_CONTRACT_VIOLATION'),
      );
    }
  });

  it('REPLAY_MISS and NOT_AUTHORIZED are frozen, distinct sentinels', () => {
    expect(Object.isFrozen(NOT_AUTHORIZED)).toBe(true);
    expect(Object.isFrozen(REPLAY_MISS)).toBe(true);
    expect(NOT_AUTHORIZED).not.toBe(REPLAY_MISS);
  });
});

describe('sealOperation (§19)', () => {
  it('cannot be re-pointed, extended or replaced after definition', async () => {
    const sealed = sealOperation<Record<string, never>, string, unknown>(async () => 'bound');
    const original = sealed.execute;
    expect(await sealed.execute({}, {})).toBe('bound');
    expect(Reflect.ownKeys(sealed)).toEqual(['execute']);
    expect(Object.getOwnPropertyDescriptor(sealed, 'execute')).toMatchObject({
      writable: false,
      configurable: false,
    });
    expect(() => {
      (sealed as unknown as Record<string, unknown>).execute = async () => 'replaced';
    }).toThrow(TypeError);
    expect(() => {
      (sealed as unknown as Record<string, unknown>).extra = async () => 'plugin';
    }).toThrow(TypeError);
    expect(Object.isFrozen(original)).toBe(true);
    expect(sealed.execute).toBe(original);
  });
});

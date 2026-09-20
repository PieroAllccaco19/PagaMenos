// PagaMenos · CCA tracked adapter, activeCount and zero-in-flight gate (Amendment 01 §17, §21–§24, §45, §49).
//
// Offline: the gate is exercised through the SAME functions the CCA engine calls
// (constructTrackedAdapter + executeUnderZeroInFlightGate) over a sentinel transaction object; the
// real-PostgreSQL commit/rollback consequences are proven in cca-engine.integration.test.ts.
import { EventEmitter } from 'node:events';

import { describe, expect, it } from 'vitest';

import { isCcaError } from './errors';
import { createLockSequencer, defineLockOrder } from './lock-order';
import { mintLockedCollectionScope, type LockedCollectionScope } from './locked-scope';
import {
  constructTrackedAdapter,
  executeUnderZeroInFlightGate,
  freezeAdapterSpec,
  type AdapterImplementation,
  type TrackedAdapterHandle,
} from './tracked-adapter';

const HIDDEN_TX = Object.freeze({ hiddenTransactionClient: true });
type Tx = typeof HIDDEN_TX;

interface Api {
  slow(label: string, ms: number): Promise<string>;
  fast(label: string): Promise<string>;
  fail(): Promise<void>;
  throwSync(): Promise<void>;
  observeCount(): Promise<number>;
}

function scope(): LockedCollectionScope {
  return mintLockedCollectionScope({
    assignmentId: '00000000-0000-4000-8000-000000000001',
    participantId: 'p',
    operationId: 'op',
    policy: 'GENERAL_COLLECTION',
    collectionAt: new Date(0).toISOString(),
  });
}

/** Builds a handle whose implementation logs every entry together with the gate state. */
function harness() {
  const entries: string[] = [];
  const effects: string[] = [];
  let handle: TrackedAdapterHandle<Api> | null = null;
  const impl: AdapterImplementation<Tx, Api> = {
    slow: (tx, _b, label, ms) => {
      entries.push(`slow:${label}:${handle!.gate.state()}`);
      expect(tx).toBe(HIDDEN_TX);
      return new Promise((resolve) =>
        setTimeout(() => {
          effects.push(label);
          resolve(label);
        }, ms),
      );
    },
    fast: async (_tx, _b, label) => {
      entries.push(`fast:${label}:${handle!.gate.state()}`);
      effects.push(label);
      return label;
    },
    fail: async () => {
      throw new Error('driver failure');
    },
    throwSync: () => {
      throw new Error('synchronous failure');
    },
    observeCount: async () => handle!.gate.activeCount(),
  };
  const spec = freezeAdapterSpec<Tx, Api>(impl);
  handle = constructTrackedAdapter<Tx, Api>(HIDDEN_TX, spec, {
    scope: scope(),
    locks: createLockSequencer(defineLockOrder(['R']), () => undefined),
  });
  return { handle, adapter: handle.adapter as Api, entries, effects };
}

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

async function settle<R>(h: TrackedAdapterHandle<Api>, run: () => Promise<R>) {
  try {
    return { committed: true as const, value: await executeUnderZeroInFlightGate(h, run) };
  } catch (error) {
    return { committed: false as const, error };
  }
}

describe('activeCount accounting (§22)', () => {
  it('increments BEFORE the database operation starts', async () => {
    const { adapter } = harness();
    expect(await adapter.observeCount()).toBe(1);
  });

  it('decrements only after settlement — fulfilled', async () => {
    const { handle, adapter } = harness();
    const p = adapter.slow('a', 20);
    expect(handle.gate.activeCount()).toBe(1);
    await tick(5);
    expect(handle.gate.activeCount()).toBe(1);
    await p;
    expect(handle.gate.activeCount()).toBe(0);
  });

  it('accounts rejected operations (async rejection and synchronous throw)', async () => {
    const { handle, adapter } = harness();
    await expect(adapter.fail()).rejects.toThrow('driver failure');
    expect(handle.gate.activeCount()).toBe(0);
    await expect(adapter.throwSync()).rejects.toThrow('synchronous failure');
    expect(handle.gate.activeCount()).toBe(0);
    expect(handle.gate.firstFailure()).not.toBeNull();
  });
});

describe('zero-in-flight commit gate (§22, §30 P–R)', () => {
  it('commits only with activeCount == 0 and ends CLOSED', async () => {
    const { handle, adapter } = harness();
    const r = await settle(handle, async () => adapter.slow('x', 5));
    expect(r).toEqual({ committed: true, value: 'x' });
    expect(handle.gate.state()).toBe('CLOSED');
  });

  it('void adapterMethod() → activeCount non-zero → refuses commit', async () => {
    const { handle, adapter } = harness();
    const r = await settle(handle, async () => {
      void adapter.slow('floating', 30);
      return 'returned-early';
    });
    expect(r.committed).toBe(false);
    expect(isCcaError((r as { error: unknown }).error, 'CCA_IN_FLIGHT_AT_SETTLEMENT')).toBe(true);
    expect(handle.gate.state()).toBe('CLOSING');
    expect(handle.gate.activeCount()).toBe(1);
  });

  it('an adapter failure swallowed by the executor still refuses commit (§49)', async () => {
    const { handle, adapter } = harness();
    const r = await settle(handle, async () => {
      await adapter.fail().catch(() => undefined);
      return 'swallowed';
    });
    expect(r.committed).toBe(false);
    expect(isCcaError((r as { error: unknown }).error, 'CCA_ADAPTER_OPERATION_FAILED')).toBe(true);
  });

  it('an executor error refuses commit', async () => {
    const { handle } = harness();
    const r = await settle(handle, async () => {
      throw new Error('executor error');
    });
    expect(r.committed).toBe(false);
  });

  it('close() is impossible while ACTIVE or with operations in flight', async () => {
    const { handle, adapter } = harness();
    expect(() => handle.gate.close()).toThrow();
    const p = adapter.slow('y', 10);
    handle.gate.beginClosing();
    expect(() => handle.gate.close()).toThrow();
    await p;
    handle.gate.close();
    expect(handle.gate.state()).toBe('CLOSED');
  });
});

describe('adapter lifecycle: CLOSING / CLOSED (§22–§24)', () => {
  it('rejects use once CLOSING begins — before the implementation runs', async () => {
    const { handle, adapter, entries } = harness();
    handle.gate.beginClosing();
    await expect(adapter.fast('late')).rejects.toSatisfy((e) =>
      isCcaError(e, 'CCA_ADAPTER_NOT_ACTIVE'),
    );
    expect(entries).toEqual([]);
    expect(handle.gate.rejectedWhileInactive()).toBe(1);
  });

  it('rejects use after CLOSED — before the implementation runs', async () => {
    const { handle, adapter, entries } = harness();
    await settle(handle, async () => 'done');
    expect(handle.gate.state()).toBe('CLOSED');
    await expect(adapter.fast('after')).rejects.toSatisfy((e) =>
      isCcaError(e, 'CCA_ADAPTER_NOT_ACTIVE'),
    );
    expect(entries).toEqual([]);
  });
});

describe('async escape (§23 microtask, §24 timer/background)', () => {
  it('queueMicrotask escape is counted before settlement → no commit', async () => {
    const { handle, adapter } = harness();
    const r = await settle(handle, async () => {
      queueMicrotask(() => void adapter.slow('microtask', 20));
      return 'returned';
    });
    expect(r.committed).toBe(false);
    expect(isCcaError((r as { error: unknown }).error, 'CCA_IN_FLIGHT_AT_SETTLEMENT')).toBe(true);
  });

  it('Promise.then escape is counted before settlement → no commit', async () => {
    const { handle, adapter } = harness();
    const r = await settle(handle, async () => {
      void Promise.resolve().then(() => adapter.slow('then', 20));
      return 'returned';
    });
    expect(r.committed).toBe(false);
  });

  it('a deep promise-chain escape is either counted (no commit) or rejected before DB access', async () => {
    for (const depth of [1, 2, 3, 5, 8, 13]) {
      const { handle, adapter, entries, effects } = harness();
      let lateError: unknown = null;
      const r = await settle(handle, async () => {
        let p: Promise<unknown> = Promise.resolve();
        for (let i = 0; i < depth; i++) p = p.then(() => undefined);
        void p.then(() => adapter.fast(`chain${depth}`).catch((e) => (lateError = e)));
        return 'returned';
      });
      await tick(5);
      if (r.committed) {
        // Started after CLOSING: rejected, implementation never entered.
        expect(isCcaError(lateError, 'CCA_ADAPTER_NOT_ACTIVE')).toBe(true);
        expect(entries).toEqual([]);
        expect(effects).toEqual([]);
      } else {
        expect(entries.every((e) => e.endsWith(':ACTIVE'))).toBe(true);
      }
    }
  });

  it('setTimeout escape is rejected before database access', async () => {
    const { handle, adapter, entries } = harness();
    let lateError: unknown = null;
    const r = await settle(handle, async () => {
      setTimeout(() => void adapter.fast('timer').catch((e) => (lateError = e)), 0);
      return 'returned';
    });
    expect(r.committed).toBe(true);
    await tick(10);
    expect(isCcaError(lateError, 'CCA_ADAPTER_NOT_ACTIVE')).toBe(true);
    expect(entries).toEqual([]);
  });

  it('setImmediate escape is rejected before database access', async () => {
    const { handle, adapter, entries } = harness();
    let lateError: unknown = null;
    await settle(handle, async () => {
      setImmediate(() => void adapter.fast('immediate').catch((e) => (lateError = e)));
      return 'returned';
    });
    await tick(10);
    expect(isCcaError(lateError, 'CCA_ADAPTER_NOT_ACTIVE')).toBe(true);
    expect(entries).toEqual([]);
  });

  it('event-listener / background escape is rejected before database access', async () => {
    const { handle, adapter, entries } = harness();
    const bus = new EventEmitter();
    let lateError: unknown = null;
    await settle(handle, async () => {
      bus.on('later', () => void adapter.fast('listener').catch((e) => (lateError = e)));
      return 'returned';
    });
    bus.emit('later');
    await tick(5);
    expect(isCcaError(lateError, 'CCA_ADAPTER_NOT_ACTIVE')).toBe(true);
    expect(entries).toEqual([]);
  });

  it('a detached rejected call never becomes an unhandled rejection', async () => {
    const { handle, adapter } = harness();
    handle.gate.finalize();
    const unhandled: unknown[] = [];
    const onUnhandled = (e: unknown) => unhandled.push(e);
    process.on('unhandledRejection', onUnhandled);
    try {
      void adapter.fast('detached');
      await tick(10);
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
    expect(unhandled).toEqual([]);
  });
});

describe('no escape property / no generic primitive (§17, §21, §45)', () => {
  it('exposes ONLY the modeled methods on a frozen null-prototype object', () => {
    const { adapter } = harness();
    expect(Object.getPrototypeOf(adapter)).toBeNull();
    expect(Object.isFrozen(adapter)).toBe(true);
    expect(Reflect.ownKeys(adapter).sort()).toEqual(
      ['fail', 'fast', 'observeCount', 'slow', 'throwSync'].sort(),
    );
    for (const k of ['$transaction', '$queryRaw', 'tx', 'client', 'prisma', 'query', 'raw']) {
      expect(k in adapter).toBe(false);
    }
    expect(() => {
      (adapter as unknown as Record<string, unknown>).tx = HIDDEN_TX;
    }).toThrow(TypeError);
  });

  it('the hidden transaction client is not reachable from the adapter object graph', () => {
    const { adapter } = harness();
    const seen = new Set<unknown>();
    const reach = (v: unknown): boolean => {
      if (v === HIDDEN_TX) return true;
      if ((typeof v !== 'object' && typeof v !== 'function') || v === null || seen.has(v)) {
        return false;
      }
      seen.add(v);
      for (const key of Reflect.ownKeys(v as object)) {
        const d = Object.getOwnPropertyDescriptor(v as object, key)!;
        if ('value' in d && reach(d.value)) return true;
      }
      return false;
    };
    expect(reach(adapter)).toBe(false);
    for (const key of Reflect.ownKeys(adapter)) {
      const fn = (adapter as unknown as Record<PropertyKey, unknown>)[key] as object;
      expect(Object.isFrozen(fn)).toBe(true);
    }
  });

  it('definition-time snapshot: later mutation of the implementation object has no effect', async () => {
    const impl: Record<string, unknown> = { op: async () => 'original' };
    const spec = freezeAdapterSpec<Tx, { op(): Promise<string> }>(
      impl as unknown as AdapterImplementation<Tx, { op(): Promise<string> }>,
    );
    impl.op = async () => 'replaced';
    impl.extra = async () => 'plugin';
    const h = constructTrackedAdapter<Tx, { op(): Promise<string> }>(HIDDEN_TX, spec, {
      scope: scope(),
      locks: createLockSequencer(defineLockOrder(['R']), () => undefined),
    });
    expect(await h.adapter.op()).toBe('original');
    expect('extra' in h.adapter).toBe(false);
  });

  it('refuses generic/raw method names at definition time', () => {
    for (const name of [
      '$transaction',
      '$queryRaw',
      'query',
      'raw',
      'lock',
      'then',
      'tx',
      'execute',
    ]) {
      expect(() => freezeAdapterSpec({ [name]: async () => undefined } as never)).toThrow(
        /CCA_INVALID_DEFINITION/,
      );
    }
  });

  it('refuses a scope that the CCA engine did not mint', () => {
    const spec = freezeAdapterSpec<Tx, { op(): Promise<void> }>({ op: async () => undefined });
    const forged = { ...scope() };
    expect(() =>
      constructTrackedAdapter(HIDDEN_TX, spec, {
        scope: forged,
        locks: createLockSequencer(defineLockOrder(['R']), () => undefined),
      }),
    ).toThrow(/CCA_ASSIGNMENT_SCOPE_MISMATCH/);
  });
});

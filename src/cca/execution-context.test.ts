// PagaMenos · DatabaseExecutionContext (Amendment 01 §29, §29.1, §30 B–D/T, §35, §40).
//
// Offline: governance is installed on a sentinel client that records every forwarded call, so
// "rejected BEFORE any database access" is proven by the original method never being invoked. The
// same guarantees over the real accepted A1/A2 owners are proven in cca-engine.integration.test.ts.
import { describe, expect, it } from 'vitest';

import { isCcaError } from './errors';
import {
  installTransactionGovernance,
  readDatabaseExecutionState,
  runCcaTransaction,
  type TransactionCapableClient,
} from './execution-context';

const FAKE_TX = Object.freeze({ fakeTransactionClient: true });

function fakeClient() {
  const calls: unknown[][] = [];
  const client = {
    $transaction: async (...args: unknown[]): Promise<unknown> => {
      calls.push(args);
      const [first] = args;
      if (typeof first === 'function') return (first as (tx: unknown) => unknown)(FAKE_TX);
      return first;
    },
  };
  return { client: client as unknown as TransactionCapableClient, calls };
}

function governed() {
  const f = fakeClient();
  installTransactionGovernance(f.client);
  return f;
}

describe('accepted-owner registration is transparent (§35, §40)', () => {
  it('forwards the callback, the options and the result unchanged', async () => {
    const { client, calls } = governed();
    const options = { isolationLevel: 'ReadCommitted' };
    const result = await (client.$transaction as unknown as (...a: unknown[]) => Promise<unknown>)(
      async (tx: unknown) => {
        expect(tx).toBe(FAKE_TX);
        return { rows: 3 };
      },
      options,
    );
    expect(result).toEqual({ rows: 3 });
    expect(calls).toHaveLength(1);
    expect(calls[0]![1]).toBe(options);
  });

  it('forwards the batch form unchanged (no application code runs inside it)', async () => {
    const { client, calls } = governed();
    const batch = [Promise.resolve(1), Promise.resolve(2)];
    await (client.$transaction as unknown as (...a: unknown[]) => Promise<unknown>)(batch);
    expect(calls[0]![0]).toBe(batch);
  });

  it('propagates errors unchanged', async () => {
    const { client } = governed();
    await expect(
      (client.$transaction as unknown as (...a: unknown[]) => Promise<unknown>)(async () => {
        throw new Error('owner failure');
      }),
    ).rejects.toThrow('owner failure');
    expect(readDatabaseExecutionState().transactionActive).toBe(false);
  });

  it('is idempotent', () => {
    const { client, calls } = governed();
    installTransactionGovernance(client);
    installTransactionGovernance(client);
    expect(calls).toHaveLength(0);
  });

  it('marks an accepted-owner transaction active for the callback and clears it afterwards', async () => {
    const { client } = governed();
    expect(readDatabaseExecutionState()).toMatchObject({
      transactionActive: false,
      transactionAuthority: 'NONE',
      ccaActive: false,
    });
    await (client.$transaction as unknown as (...a: unknown[]) => Promise<unknown>)(async () => {
      expect(readDatabaseExecutionState()).toMatchObject({
        transactionActive: true,
        transactionAuthority: 'ACCEPTED_OWNER',
        ccaActive: false,
      });
    });
    expect(readDatabaseExecutionState().transactionActive).toBe(false);
  });
});

describe('CCA entry conditions (§30 B–D)', () => {
  it('rejects an outer application transaction BEFORE any database access', async () => {
    const { client, calls } = governed();
    let rejection: unknown = null;
    await (client.$transaction as unknown as (...a: unknown[]) => Promise<unknown>)(async () => {
      rejection = await runCcaTransaction(client, {}, async () => 'must not run').catch((e) => e);
    });
    expect(isCcaError(rejection, 'CCA_TOP_LEVEL_TRANSACTION_REQUIRED')).toBe(true);
    expect(calls).toHaveLength(1); // only the outer transaction reached the client
  });

  it('rejects CCA re-entry BEFORE any database access (§29.1)', async () => {
    const { client, calls } = governed();
    const inner = await runCcaTransaction(client, {}, async () =>
      runCcaTransaction(client, {}, async () => 'nested').catch((e: unknown) => e),
    );
    expect(isCcaError(inner, 'CCA_REENTRY_FORBIDDEN')).toBe(true);
    expect(calls).toHaveLength(1);
  });

  it('rejects re-entry from a timer/microtask that escaped an ACTIVE CCA execution', async () => {
    const { client } = governed();
    let escaped: unknown = null;
    await runCcaTransaction(client, {}, async () => {
      await new Promise<void>((resolve) =>
        setTimeout(() => {
          void runCcaTransaction(client, {}, async () => 'escaped')
            .catch((e: unknown) => (escaped = e))
            .finally(resolve);
        }, 0),
      );
      return 'done';
    });
    expect(isCcaError(escaped, 'CCA_REENTRY_FORBIDDEN')).toBe(true);
  });

  it('rejects an accepted-owner transaction opened while CCA is active', async () => {
    const { client, calls } = governed();
    const nested = await runCcaTransaction(client, {}, async () =>
      (client.$transaction as unknown as (...a: unknown[]) => Promise<unknown>)(
        async () => 'nested owner',
      ).catch((e: unknown) => e),
    );
    expect(isCcaError(nested, 'CCA_NESTED_TRANSACTION_FORBIDDEN')).toBe(true);
    expect(calls).toHaveLength(1);
  });

  it('refuses to run on an ungoverned client (fail closed)', async () => {
    const { client } = fakeClient();
    await expect(runCcaTransaction(client, {}, async () => 'x')).rejects.toSatisfy((e) =>
      isCcaError(e, 'CCA_UNGOVERNED_CLIENT'),
    );
  });

  it('clears the CCA frame in finally, including on failure (§30 T)', async () => {
    const { client } = governed();
    await expect(
      runCcaTransaction(client, {}, async () => {
        throw new Error('body failure');
      }),
    ).rejects.toThrow('body failure');
    expect(readDatabaseExecutionState()).toMatchObject({
      transactionActive: false,
      ccaActive: false,
      lockRankFloor: -1,
    });
  });

  it('records the CCA lock rank floor while the transaction is open', async () => {
    const { client } = governed();
    await runCcaTransaction(client, {}, async (_tx, frame) => {
      frame.noteLockRank(0);
      expect(readDatabaseExecutionState().lockRankFloor).toBe(0);
      frame.noteLockRank(2);
      frame.noteLockRank(1);
      expect(readDatabaseExecutionState().lockRankFloor).toBe(2);
      return 'ok';
    });
  });
});

describe('context integrity', () => {
  it('exposes no primitive that clears or weakens an active context', async () => {
    const module = (await import('./execution-context')) as Record<string, unknown>;
    expect(Object.keys(module).sort()).toEqual(
      [
        'installTransactionGovernance',
        'readDatabaseExecutionDiagnostics',
        'readDatabaseExecutionState',
        'runCcaTransaction',
      ].sort(),
    );
  });

  it('a state snapshot is frozen and carries no database capability', () => {
    const state = readDatabaseExecutionState();
    expect(Object.isFrozen(state)).toBe(true);
    expect(
      Object.values(state).every((v) => typeof v !== 'function' && typeof v !== 'object'),
    ).toBe(true);
  });

  it('RESIDUAL (§40.2, documented): a continuation REGISTERED before a transaction runs in the outer context', async () => {
    // JavaScript semantics: a `.then` registered outside the transaction resumes in the context
    // captured at registration. The CCA call it makes cannot share the outer transaction's
    // connection, so consent evaluation and ordering stay correct; the residual is liveness only
    // (the outer transaction's own timeout bounds it). Recorded here so the evidence is executable.
    const { client } = governed();
    let trigger: (() => void) | null = null;
    const deferred = new Promise<void>((resolve) => (trigger = resolve));
    let observed: { transactionActive: boolean } | null = null;
    const continuation = deferred.then(() => {
      observed = { transactionActive: readDatabaseExecutionState().transactionActive };
    });
    await (client.$transaction as unknown as (...a: unknown[]) => Promise<unknown>)(async () => {
      trigger!();
      await continuation;
    });
    expect(observed).toEqual({ transactionActive: false });
  });
});

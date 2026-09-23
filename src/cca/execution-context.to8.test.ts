// PagaMenos · DatabaseExecutionContext — TO-8, the M7 capability-signer owner kind (M7 V1.1 §16.2.3,
// §18.6; XF-16; signer AUTH §8–§10, §13, §25).
//
// Offline, with sentinel clients that record every forwarded call: "refused BEFORE any database
// access" is proven by the captured original `$transaction` never being invoked. The same properties
// against real PostgreSQL through the productive signer module are proven by `pnpm m7:signer`.
import { describe, expect, it } from 'vitest';

import { isCcaError } from './errors';
import {
  M7CapabilitySignerTransactionError,
  installTransactionGovernance,
  readDatabaseExecutionDiagnostics,
  readDatabaseExecutionState,
  runCcaTransaction,
  runM7CapabilitySignerTransaction,
  sealM7CapabilitySignerClient,
  type TransactionCapableClient,
} from './execution-context';

const FAKE_TX = Object.freeze({ fakeTransactionClient: true });

type Mode = 'commit' | 'commit-rejects';

/** A sentinel client. `commit-rejects` resolves the callback, then rejects as a failed COMMIT would. */
function fakeClient(mode: Mode = 'commit') {
  const calls: unknown[][] = [];
  const client = {
    $transaction: async (...args: unknown[]): Promise<unknown> => {
      calls.push(args);
      const [first] = args;
      if (typeof first !== 'function') return first;
      const value = await (first as (tx: unknown) => unknown)(FAKE_TX);
      if (mode === 'commit-rejects') throw new Error('simulated COMMIT failure');
      return value;
    },
  };
  return { client: client as unknown as TransactionCapableClient, calls };
}

function sealed(mode: Mode = 'commit') {
  const f = fakeClient(mode);
  sealM7CapabilitySignerClient(f.client);
  return f;
}

function governed() {
  const f = fakeClient();
  installTransactionGovernance(f.client);
  return f;
}

const isTo8 = (e: unknown, code: string): boolean =>
  e instanceof M7CapabilitySignerTransactionError && e.code === code;

const callTx = (c: TransactionCapableClient, ...a: unknown[]): Promise<unknown> =>
  (c.$transaction as unknown as (...x: unknown[]) => Promise<unknown>)(...a);

describe('TO-8 registers as its OWN owner kind (§16.2.3, §18.6)', () => {
  it('reports M7_CAPABILITY_SIGNER as the transaction authority inside the signer transaction', async () => {
    const { client, calls } = sealed();
    const before = readDatabaseExecutionDiagnostics().m7CapabilitySignerTransactions;
    const inside = await runM7CapabilitySignerTransaction(client, { timeout: 1 }, async (tx) => {
      expect(tx).toBe(FAKE_TX);
      return readDatabaseExecutionState();
    });
    expect(inside.transactionActive).toBe(true);
    expect(inside.transactionAuthority).toBe('M7_CAPABILITY_SIGNER');
    expect(inside.ccaActive).toBe(false);
    expect(inside.openDepth).toBe(1);
    expect(calls).toHaveLength(1);
    expect(calls[0]![1]).toEqual({ timeout: 1 });
    expect(readDatabaseExecutionDiagnostics().m7CapabilitySignerTransactions).toBe(before + 1);
  });

  it('closes the frame in finally — after success AND after failure', async () => {
    const { client } = sealed();
    await runM7CapabilitySignerTransaction(client, {}, async () => 1);
    expect(readDatabaseExecutionState().transactionActive).toBe(false);
    await expect(
      runM7CapabilitySignerTransaction(client, {}, async () => {
        throw new Error('body failed');
      }),
    ).rejects.toThrow('body failed');
    expect(readDatabaseExecutionState()).toMatchObject({
      transactionActive: false,
      transactionAuthority: 'NONE',
      openDepth: 0,
    });
  });

  it('is distinct from ACCEPTED_OWNER and from CCA', async () => {
    const g = governed();
    const inAccepted = (await callTx(g.client, async () => readDatabaseExecutionState())) as {
      transactionAuthority: string;
    };
    expect(inAccepted.transactionAuthority).toBe('ACCEPTED_OWNER');
    const c = governed();
    const inCca = await runCcaTransaction(c.client, {}, async () => readDatabaseExecutionState());
    expect(inCca.transactionAuthority).toBe('CCA');
    const s = sealed();
    const inSigner = await runM7CapabilitySignerTransaction(s.client, {}, async () =>
      readDatabaseExecutionState(),
    );
    expect(inSigner.transactionAuthority).toBe('M7_CAPABILITY_SIGNER');
  });
});

describe('TO-8 refuses to open while ANY registered transaction is active — before DB access', () => {
  it('inside ACCEPTED_OWNER → TO8_TRANSACTION_ALREADY_ACTIVE, signer client never invoked', async () => {
    const g = governed();
    const s = sealed();
    const before = readDatabaseExecutionDiagnostics().m7CapabilitySignerRejectedBeforeDatabase;
    let caught: unknown;
    await callTx(g.client, async () => {
      try {
        await runM7CapabilitySignerTransaction(s.client, {}, async () => 'must not run');
      } catch (e) {
        caught = e;
      }
    });
    expect(isTo8(caught, 'TO8_TRANSACTION_ALREADY_ACTIVE')).toBe(true);
    expect(s.calls).toHaveLength(0);
    expect(readDatabaseExecutionDiagnostics().m7CapabilitySignerRejectedBeforeDatabase).toBe(
      before + 1,
    );
  });

  it('inside CCA → TO8_TRANSACTION_ALREADY_ACTIVE, signer client never invoked', async () => {
    const c = governed();
    const s = sealed();
    let caught: unknown;
    await runCcaTransaction(c.client, {}, async () => {
      try {
        await runM7CapabilitySignerTransaction(s.client, {}, async () => 'must not run');
      } catch (e) {
        caught = e;
      }
    });
    expect(isTo8(caught, 'TO8_TRANSACTION_ALREADY_ACTIVE')).toBe(true);
    expect(s.calls).toHaveLength(0);
  });

  it('inside an active TO-8 → re-entry refused, the second client never invoked', async () => {
    const outer = sealed();
    const inner = sealed();
    let caught: unknown;
    await runM7CapabilitySignerTransaction(outer.client, {}, async () => {
      try {
        await runM7CapabilitySignerTransaction(inner.client, {}, async () => 'must not run');
      } catch (e) {
        caught = e;
      }
    });
    expect(isTo8(caught, 'TO8_TRANSACTION_ALREADY_ACTIVE')).toBe(true);
    expect(inner.calls).toHaveLength(0);
    expect(outer.calls).toHaveLength(1);
  });

  it('re-entry on the SAME sealed client is refused too', async () => {
    const s = sealed();
    let caught: unknown;
    await runM7CapabilitySignerTransaction(s.client, {}, async () => {
      try {
        await runM7CapabilitySignerTransaction(s.client, {}, async () => 'must not run');
      } catch (e) {
        caught = e;
      }
    });
    expect(isTo8(caught, 'TO8_TRANSACTION_ALREADY_ACTIVE')).toBe(true);
    expect(s.calls).toHaveLength(1);
  });

  it('refuses an unsealed client before any access', async () => {
    const f = fakeClient();
    await expect(runM7CapabilitySignerTransaction(f.client, {}, async () => 1)).rejects.toSatisfy(
      (e: unknown) => isTo8(e, 'TO8_UNSEALED_CLIENT'),
    );
    expect(f.calls).toHaveLength(0);
  });

  it('refuses a governed (accepted-owner) client as the signer client', () => {
    const g = governed();
    expect(() => sealM7CapabilitySignerClient(g.client)).toThrow(
      M7CapabilitySignerTransactionError,
    );
  });
});

describe('CCA rejects while a TO-8 transaction is active (§16.2.3)', () => {
  it('runCcaTransaction inside TO-8 → CCA_TOP_LEVEL_TRANSACTION_REQUIRED, CCA client never invoked', async () => {
    const s = sealed();
    const c = governed();
    const before = readDatabaseExecutionDiagnostics().ccaRejectedBeforeDatabase;
    let caught: unknown;
    await runM7CapabilitySignerTransaction(s.client, {}, async () => {
      try {
        await runCcaTransaction(c.client, {}, async () => 'must not run');
      } catch (e) {
        caught = e;
      }
    });
    expect(isCcaError(caught, 'CCA_TOP_LEVEL_TRANSACTION_REQUIRED')).toBe(true);
    expect(c.calls).toHaveLength(0);
    expect(readDatabaseExecutionDiagnostics().ccaRejectedBeforeDatabase).toBe(before + 1);
  });

  it('accepted CCA re-entry and top-level semantics are unchanged', async () => {
    const c = governed();
    let reentry: unknown;
    await runCcaTransaction(c.client, {}, async () => {
      try {
        await runCcaTransaction(c.client, {}, async () => 1);
      } catch (e) {
        reentry = e;
      }
    });
    expect(isCcaError(reentry, 'CCA_REENTRY_FORBIDDEN')).toBe(true);
    const g = governed();
    let topLevel: unknown;
    await callTx(g.client, async () => {
      try {
        await runCcaTransaction(c.client, {}, async () => 1);
      } catch (e) {
        topLevel = e;
      }
    });
    expect(isCcaError(topLevel, 'CCA_TOP_LEVEL_TRANSACTION_REQUIRED')).toBe(true);
  });
});

describe('the sealed signer client has NO route around TO-8 registration', () => {
  it('its own $transaction refuses, and the original is never reached', async () => {
    const s = sealed();
    await expect(callTx(s.client, async () => 'bypass')).rejects.toSatisfy((e: unknown) =>
      isTo8(e, 'TO8_DIRECT_TRANSACTION_FORBIDDEN'),
    );
    expect(s.calls).toHaveLength(0);
  });

  it('sealing is idempotent and keeps the original captured once', async () => {
    const s = sealed();
    sealM7CapabilitySignerClient(s.client);
    await runM7CapabilitySignerTransaction(s.client, {}, async () => 1);
    expect(s.calls).toHaveLength(1);
  });
});

describe('XF-16 (DB half): the result exists ONLY after the transaction committed', () => {
  it('a body failure (rollback) returns NOTHING — the caller receives only the rejection', async () => {
    const s = sealed();
    let produced: unknown = null;
    let returned: unknown = 'unset';
    await expect(
      (async () => {
        returned = await runM7CapabilitySignerTransaction(s.client, {}, async () => {
          produced = { envelope: 'produced inside, before commit' };
          throw new Error('deliberate rollback after the function returned');
        });
      })(),
    ).rejects.toThrow('deliberate rollback');
    expect(produced).not.toBeNull();
    expect(returned).toBe('unset');
  });

  it('a rejected COMMIT returns NOTHING, even though the body produced a value', async () => {
    const s = sealed('commit-rejects');
    let returned: unknown = 'unset';
    await expect(
      (async () => {
        returned = await runM7CapabilitySignerTransaction(s.client, {}, async () => ({
          envelope: 'would-be result',
        }));
      })(),
    ).rejects.toThrow('simulated COMMIT failure');
    expect(returned).toBe('unset');
    expect(readDatabaseExecutionState().transactionActive).toBe(false);
  });

  it('the value resolves only after the transaction promise resolved', async () => {
    const order: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const client = {
      $transaction: async (...args: unknown[]): Promise<unknown> => {
        const v = await (args[0] as (tx: unknown) => Promise<unknown>)(FAKE_TX);
        order.push('body-returned');
        await gate;
        order.push('commit');
        return v;
      },
    } as unknown as TransactionCapableClient;
    sealM7CapabilitySignerClient(client);
    const p = runM7CapabilitySignerTransaction(client, {}, async () => 'row').then((v) => {
      order.push(`caller-received:${v}`);
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(order).toEqual(['body-returned']);
    release();
    await p;
    expect(order).toEqual(['body-returned', 'commit', 'caller-received:row']);
  });
});

describe('no generic owner selector and no context escape', () => {
  it('the runner has exactly three parameters and no owner-kind argument', () => {
    expect(runM7CapabilitySignerTransaction.length).toBe(3);
    expect(sealM7CapabilitySignerClient.length).toBe(1);
  });
});

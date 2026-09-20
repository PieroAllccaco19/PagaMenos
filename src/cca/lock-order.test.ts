// PagaMenos · CCA canonical lock-order infrastructure (Amendment 01 §26, §27).
import { describe, expect, it } from 'vitest';

import { isCcaError } from './errors';
import { createLockSequencer, defineLockOrder, EXPERIMENT_ASSIGNMENT_RANK } from './lock-order';

const PLAN = defineLockOrder(['ROOT', 'CHILD', 'RECEIPT']);

function sequencer() {
  const acquired: string[] = [];
  const ranks: number[] = [];
  const seq = createLockSequencer(PLAN, (r) => ranks.push(r));
  const lock = (label: string) => async () => {
    acquired.push(label);
  };
  return { seq, acquired, ranks, lock };
}

describe('lock order plan', () => {
  it('always begins at the ExperimentAssignment rank held by the engine', () => {
    expect(PLAN.ranks[0]).toBe(EXPERIMENT_ASSIGNMENT_RANK);
    expect(Object.isFrozen(PLAN)).toBe(true);
    expect(Object.isFrozen(PLAN.ranks)).toBe(true);
  });

  it('refuses an empty, duplicate or reserved rank list', () => {
    expect(() => defineLockOrder([])).toThrow(/CCA_INVALID_DEFINITION/);
    expect(() => defineLockOrder(['A', 'A'])).toThrow(/CCA_INVALID_DEFINITION/);
    expect(() => defineLockOrder([EXPERIMENT_ASSIGNMENT_RANK])).toThrow(/CCA_INVALID_DEFINITION/);
  });
});

describe('canonical sequencing', () => {
  it('accepts the canonical order and reports the held rank', async () => {
    const { seq, acquired, ranks, lock } = sequencer();
    await seq.acquire('ROOT', 'r1', lock('root'));
    await seq.acquire('CHILD', 'c1', lock('child'));
    await seq.acquire('RECEIPT', 'x1', lock('receipt'));
    expect(acquired).toEqual(['root', 'child', 'receipt']);
    expect(ranks).toEqual([1, 2, 3]);
  });

  it('refuses inversion BEFORE the lock statement runs', async () => {
    const { seq, acquired, lock } = sequencer();
    await seq.acquire('CHILD', 'c1', lock('child'));
    await expect(seq.acquire('ROOT', 'r1', lock('root'))).rejects.toSatisfy((e) =>
      isCcaError(e, 'CCA_LOCK_ORDER_VIOLATION'),
    );
    expect(acquired).toEqual(['child']);
  });

  it('orders peers deterministically regardless of the order supplied', async () => {
    const a = sequencer();
    await a.seq.acquirePeers('CHILD', ['delta', 'alpha', 'charlie'], async (k) => {
      a.acquired.push(k);
    });
    const b = sequencer();
    await b.seq.acquirePeers('CHILD', ['charlie', 'delta', 'alpha'], async (k) => {
      b.acquired.push(k);
    });
    expect(a.acquired).toEqual(['alpha', 'charlie', 'delta']);
    expect(b.acquired).toEqual(a.acquired);
  });

  it('de-duplicates peer keys', async () => {
    const { seq, acquired } = sequencer();
    await seq.acquirePeers('CHILD', ['a', 'a', 'b'], async (k) => {
      acquired.push(k);
    });
    expect(acquired).toEqual(['a', 'b']);
  });

  it('refuses a descending peer at the same rank', async () => {
    const { seq, lock } = sequencer();
    await seq.acquire('CHILD', 'b', lock('b'));
    await expect(seq.acquire('CHILD', 'a', lock('a'))).rejects.toSatisfy((e) =>
      isCcaError(e, 'CCA_LOCK_ORDER_VIOLATION'),
    );
  });

  it('refuses a rank outside the operation plan and overlapping acquisitions', async () => {
    const { seq, lock } = sequencer();
    await expect(seq.acquire('UNKNOWN' as 'ROOT', 'k', lock('x'))).rejects.toSatisfy((e) =>
      isCcaError(e, 'CCA_LOCK_ORDER_VIOLATION'),
    );
    await expect(
      seq.acquire(EXPERIMENT_ASSIGNMENT_RANK as 'ROOT', 'k', lock('assignment')),
    ).rejects.toSatisfy((e) => isCcaError(e, 'CCA_LOCK_ORDER_VIOLATION'));
    const slow = seq.acquire('ROOT', 'r', () => new Promise((r) => setTimeout(r, 20)));
    await expect(seq.acquire('CHILD', 'c', lock('c'))).rejects.toSatisfy((e) =>
      isCcaError(e, 'CCA_LOCK_ORDER_VIOLATION'),
    );
    await slow;
  });

  it('exposes no generic lock(table, id) or SQL primitive', () => {
    const { seq } = sequencer();
    expect(Object.keys(seq).sort()).toEqual(['acquire', 'acquirePeers']);
    expect(Object.isFrozen(seq)).toBe(true);
  });
});

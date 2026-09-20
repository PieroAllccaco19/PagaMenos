// PagaMenos · src/cca — operation-specific canonical lock order (Amendment 01 §26, §27).
//
// A `LockOrderPlan` is a FIXED, frozen rank sequence bound to a sealed operation at definition time.
// Rank 0 is always the ExperimentAssignment row, already held by the CCA engine before the adapter
// exists (§13). A `LockSequencer` is created by the engine per execution and handed ONLY to the
// tracked-adapter implementation — never to the executor — so the executor cannot compose or select a
// lock sequence. The sequencer performs no SQL: the adapter implementation supplies the concrete lock
// statement for each step, and the sequencer refuses, BEFORE that statement runs, any step that would:
//   * go to a LOWER rank than one already held (inversion);
//   * repeat a rank with a non-ascending peer key (non-deterministic peer ordering);
//   * overlap a still-pending acquisition (ordering must be sequential to be deterministic).
// There is deliberately no generic `lock(table, id)` and no SQL surface here.
import { CcaError } from './errors';

export const EXPERIMENT_ASSIGNMENT_RANK = 'EXPERIMENT_ASSIGNMENT' as const;

export interface LockOrderPlan<R extends string = string> {
  /** Canonical order; index 0 is always EXPERIMENT_ASSIGNMENT. */
  readonly ranks: readonly (R | typeof EXPERIMENT_ASSIGNMENT_RANK)[];
}

/** Define a fixed canonical order following the implicit ExperimentAssignment rank (§27). */
export function defineLockOrder<const R extends readonly string[]>(
  ranks: R,
): LockOrderPlan<R[number]> {
  if (ranks.length === 0) throw new CcaError('CCA_INVALID_DEFINITION', 'empty lock order');
  const seen = new Set<string>([EXPERIMENT_ASSIGNMENT_RANK]);
  for (const r of ranks) {
    if (typeof r !== 'string' || r.length === 0 || seen.has(r)) {
      throw new CcaError('CCA_INVALID_DEFINITION', `invalid or duplicate lock rank ${String(r)}`);
    }
    seen.add(r);
  }
  return Object.freeze({ ranks: Object.freeze([EXPERIMENT_ASSIGNMENT_RANK, ...ranks]) });
}

export interface LockSequencer<R extends string = string> {
  /** Acquire one lock at `rank` for `key`; `lock` is the adapter's own statement. */
  acquire(rank: R, key: string, lock: () => Promise<unknown>): Promise<void>;
  /** Acquire peers at one rank in canonical (ascending, de-duplicated) key order. */
  acquirePeers(
    rank: R,
    keys: readonly string[],
    lock: (key: string) => Promise<unknown>,
  ): Promise<void>;
}

/** INTERNAL — CCA engine only. `onRank` reports the held rank to DatabaseExecutionContext. */
export function createLockSequencer<R extends string>(
  plan: LockOrderPlan<R>,
  onRank: (rankIndex: number) => void,
): LockSequencer<R> {
  const ranks = plan.ranks as readonly string[];
  let heldIndex = 0; // ExperimentAssignment already held by the engine
  let lastKeyAtHeld: string | null = null;
  let pending = false;

  const check = (rank: string, key: string): number => {
    const index = ranks.indexOf(rank);
    if (index <= 0) {
      throw new CcaError('CCA_LOCK_ORDER_VIOLATION', `rank ${rank} is not in the operation plan`);
    }
    if (pending) {
      throw new CcaError('CCA_LOCK_ORDER_VIOLATION', 'overlapping lock acquisition');
    }
    if (index < heldIndex) {
      throw new CcaError(
        'CCA_LOCK_ORDER_VIOLATION',
        `inversion: ${rank} requested after ${ranks[heldIndex]}`,
      );
    }
    if (index === heldIndex && lastKeyAtHeld !== null && !(key > lastKeyAtHeld)) {
      throw new CcaError('CCA_LOCK_ORDER_VIOLATION', `peer order: ${key} after ${lastKeyAtHeld}`);
    }
    return index;
  };

  const acquireOne = async (
    rank: string,
    key: string,
    lock: () => Promise<unknown>,
  ): Promise<void> => {
    const index = check(rank, key);
    pending = true;
    try {
      await lock();
    } finally {
      pending = false;
    }
    if (index !== heldIndex) lastKeyAtHeld = null;
    heldIndex = index;
    lastKeyAtHeld = key;
    onRank(index);
  };

  return Object.freeze({
    acquire: (rank: R, key: string, lock: () => Promise<unknown>) => acquireOne(rank, key, lock),
    async acquirePeers(rank: R, keys: readonly string[], lock: (key: string) => Promise<unknown>) {
      const ordered = [...new Set(keys)].sort();
      for (const key of ordered) await acquireOne(rank, key, () => lock(key));
    },
  });
}

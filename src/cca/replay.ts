// PagaMenos · src/cca — replay mechanics (Amendment 01 §28, §28.1). NO M7 idempotency semantics.
//
// This module only fixes the SHAPE of replay so it cannot become a consent oracle or a write bypass:
//   * the lock-free, read-only pre-CCA lookup (a leaf-definition hook, never a caller argument)
//     answers either an existing durable result or REPLAY_MISS — it can never answer NOT_AUTHORIZED
//     or anything consent-shaped, and it runs only AFTER operation-input validation (§9.1);
//   * inside CCA, the operation-specific adapter re-checks under the root/replay lock and reports
//     EXISTING (no new domain write) or CREATED.
// What identifies "the same" operation, and whether an existing replay may be returned without
// current consent, is M7 idempotency authority — DEFERRED TO PRODUCTIVE M7 LEAF INTEGRATION.
import { CcaError } from './errors';
import { NOT_AUTHORIZED } from './sealed-operation';

export const REPLAY_MISS = Object.freeze({ kind: 'REPLAY_MISS' as const });
export type ReplayMiss = typeof REPLAY_MISS;

/** Leaf-defined pre-CCA lookup. Receives only the validated, frozen operation input. */
export type PreCcaReplayLookup<I, R> = (input: Readonly<I>) => Promise<R | ReplayMiss>;

/** In-CCA re-check result reported by an operation-specific adapter method (§28 steps 3–4). */
export type InCcaReplayOutcome<R> =
  | { readonly kind: 'EXISTING'; readonly result: R }
  | { readonly kind: 'CREATED'; readonly result: R };

/** Classify a pre-CCA lookup answer; anything consent-shaped or empty is a contract violation. */
export function classifyPreCcaReplay<R>(
  answer: R | ReplayMiss,
): { readonly hit: true; readonly result: R } | { readonly hit: false } {
  if (answer === REPLAY_MISS) return { hit: false };
  if ((answer as unknown) === NOT_AUTHORIZED || answer === undefined || answer === null) {
    throw new CcaError(
      'CCA_REPLAY_CONTRACT_VIOLATION',
      'a replay lookup may answer only an existing durable result or REPLAY_MISS',
    );
  }
  return { hit: true, result: answer as R };
}

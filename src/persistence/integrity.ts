// PagaMenos · src/persistence — snapshot integrity + diagnostic replay (§27/§28).
//
// Integrity (§28): recompute the canonical SHA-256 of the stored input/output and compare against the
// recorded `inputHash` / `outputHash`. A mismatch is an explicit `SnapshotIntegrityError`, never a
// silently-returned corrupted snapshot.
//
// Replay (§27): a diagnostic that re-runs the CURRENT pure engine over the stored historical input
// and reports how today's output compares to the frozen historical output. It NEVER mutates or
// redefines history — `historicalOutput` is immutable truth; `currentEngineReplayOutput` is a
// separate, clearly-labelled observation.
import { decide, type EngineEvaluation } from '@/engine';

import { SnapshotIntegrityError } from './errors';
import { canonicalHash } from './hash';
import type { DecisionSnapshotDto } from './schema';

/**
 * Verify a snapshot's stored hashes match a fresh canonical hash of its stored payloads. Returns the
 * dto unchanged on success; throws `SnapshotIntegrityError` (identifying the offending field) on any
 * mismatch.
 */
export function verifySnapshotIntegrity(dto: DecisionSnapshotDto): DecisionSnapshotDto {
  const inputHash = canonicalHash(dto.engineInputJson);
  if (inputHash !== dto.inputHash) {
    throw new SnapshotIntegrityError('inputHash', dto.inputHash, inputHash, dto.id);
  }
  const outputHash = canonicalHash(dto.engineOutputJson);
  if (outputHash !== dto.outputHash) {
    throw new SnapshotIntegrityError('outputHash', dto.outputHash, outputHash, dto.id);
  }
  return dto;
}

export interface ReplayComparison {
  /** The immutable historical engine output as persisted — the source of truth. */
  historicalOutput: EngineEvaluation;
  /** A fresh run of the CURRENT engine over the stored historical input — diagnostic only. */
  currentEngineReplayOutput: EngineEvaluation;
  /** True iff the current engine reproduces the historical output byte-for-byte (canonical hash). */
  matchesHistorical: boolean;
  /** The stored historical output hash (unchanged). */
  historicalOutputHash: string;
  /** The canonical hash of the current replay output. */
  currentOutputHash: string;
}

/**
 * DIAGNOSTIC replay (§27): run the current engine over the stored historical input and compare. This
 * verifies input integrity first (a corrupted stored input cannot yield a meaningful replay), then
 * returns both outputs distinctly. It does not — and must not — write anything.
 */
export function replayWithCurrentEngine(dto: DecisionSnapshotDto): ReplayComparison {
  // A corrupt stored input would make the replay meaningless; fail closed on input integrity.
  const inputHash = canonicalHash(dto.engineInputJson);
  if (inputHash !== dto.inputHash) {
    throw new SnapshotIntegrityError('inputHash', dto.inputHash, inputHash, dto.id);
  }
  const currentEngineReplayOutput = decide(dto.engineInputJson);
  const currentOutputHash = canonicalHash(currentEngineReplayOutput);
  return {
    historicalOutput: dto.engineOutputJson,
    currentEngineReplayOutput,
    matchesHistorical: currentOutputHash === dto.outputHash,
    historicalOutputHash: dto.outputHash,
    currentOutputHash,
  };
}

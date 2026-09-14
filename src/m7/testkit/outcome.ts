// M7 V1.1 — S02 real-PostgreSQL harness: the three-valued check outcome.
//
// Test infrastructure only. A real-PostgreSQL check is PASS only when it actually ran against a real
// server and every assertion held. A missing execution prerequisite (PostgreSQL binaries, a server
// that cannot be started, a harness context that was never supplied) is NOT_EXECUTED — never PASS —
// and a run that contains any NOT_EXECUTED required check can never aggregate to PASS.

export type CheckStatus = 'PASS' | 'FAIL' | 'NOT_EXECUTED';

export interface CheckResult {
  readonly id: string;
  readonly status: CheckStatus;
  readonly detail: string;
  /** Set exactly when `status` is NOT_EXECUTED: the exact missing prerequisite. */
  readonly missingPrerequisite?: string;
}

/** Thrown when a real-PostgreSQL check cannot run; carries the exact missing prerequisite. */
export class NotExecutedError extends Error {
  constructor(public readonly missingPrerequisite: string) {
    super(`NOT EXECUTED — missing prerequisite: ${missingPrerequisite}`);
    this.name = 'NotExecutedError';
  }
}

/**
 * Aggregates required checks. Any FAIL is FAIL; otherwise any NOT_EXECUTED (or an empty set, which
 * proves nothing) is NOT_EXECUTED; only a non-empty set of PASS results is PASS.
 */
export function aggregate(results: readonly CheckResult[]): CheckStatus {
  if (results.some((r) => r.status === 'FAIL')) return 'FAIL';
  if (results.length === 0 || results.some((r) => r.status === 'NOT_EXECUTED')) {
    return 'NOT_EXECUTED';
  }
  return 'PASS';
}

/** Process exit code for an aggregate status: PASS 0, FAIL 1, NOT_EXECUTED 2 (never 0). */
export function exitCodeFor(status: CheckStatus): 0 | 1 | 2 {
  return status === 'PASS' ? 0 : status === 'FAIL' ? 1 : 2;
}

/** Runs `fn` as check `id`, classifying NotExecutedError as NOT_EXECUTED and any other throw as FAIL. */
export async function runCheck(
  id: string,
  fn: () => Promise<string> | string,
): Promise<CheckResult> {
  try {
    return { id, status: 'PASS', detail: await fn() };
  } catch (error) {
    if (error instanceof NotExecutedError) {
      return {
        id,
        status: 'NOT_EXECUTED',
        detail: error.message,
        missingPrerequisite: error.missingPrerequisite,
      };
    }
    return { id, status: 'FAIL', detail: error instanceof Error ? error.message : String(error) };
  }
}

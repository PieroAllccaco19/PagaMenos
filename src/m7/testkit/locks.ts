// M7 V1.1 — S02 real-PostgreSQL harness: observing blocked / blocking sessions from PostgreSQL state.
//
// Test infrastructure only; this is NOT the S09 lock-graph semantics. A session is "blocked" only when
// PostgreSQL itself says so, observed from a separate observer session:
//   • pg_stat_activity: the backend's wait_event_type is 'Lock' (with its wait_event);
//   • pg_locks: the backend has an ungranted lock request;
//   • pg_blocking_pids(pid): contains every expected blocker's backend pid.
// Elapsed time is never evidence. The poll loop below only re-reads PostgreSQL state until that state
// holds or a deadline passes; a deadline passing is a FAILURE (BlockingNotObservedError), and a
// statement that completes or fails instead of waiting is a FAILURE (NotBlockedError).
import { DeadlockDetectedError, type PendingStatement, type Session } from './sessions';

export interface BackendActivity {
  readonly pid: number;
  readonly applicationName: string;
  readonly usename: string;
  readonly datname: string;
  readonly state: string | null;
  readonly waitEventType: string | null;
  readonly waitEvent: string | null;
  readonly backendXid: string | null;
  readonly query: string;
}

export interface LockRow {
  readonly pid: number;
  readonly locktype: string;
  readonly mode: string;
  readonly granted: boolean;
  readonly relation: string | null;
  readonly transactionid: string | null;
  readonly virtualxid: string | null;
  readonly page: number | null;
  readonly tuple: number | null;
}

export interface BlockingObservation {
  readonly blockedLabel: string;
  readonly blockedPid: number;
  readonly activity: BackendActivity;
  readonly blockingPids: readonly number[];
  readonly blockerLabels: readonly string[];
  readonly waitingLocks: readonly LockRow[];
  readonly blockerGrantedLocks: readonly LockRow[];
  /** Number of observer reads taken before the state held (diagnostic only, not evidence). */
  readonly observations: number;
}

export class NotBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotBlockedError';
  }
}

export class BlockingNotObservedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BlockingNotObservedError';
  }
}

export async function observeActivity(
  observer: Session,
  pids: readonly number[],
): Promise<BackendActivity[]> {
  const rows = await observer.query(
    `SELECT a.pid, a.application_name AS "applicationName", a.usename, a.datname, a.state,
            a.wait_event_type AS "waitEventType", a.wait_event AS "waitEvent",
            a.backend_xid::text AS "backendXid", a.query
       FROM pg_catalog.pg_stat_activity a
      WHERE a.pid = ANY ($1::int[])
      ORDER BY a.pid`,
    [pids],
    'observe pg_stat_activity',
  );
  return rows as unknown as BackendActivity[];
}

export async function observeLocks(observer: Session, pids: readonly number[]): Promise<LockRow[]> {
  const rows = await observer.query(
    `SELECT l.pid, l.locktype, l.mode, l.granted, l.relation::regclass::text AS relation,
            l.transactionid::text AS transactionid, l.virtualxid, l.page, l.tuple
       FROM pg_catalog.pg_locks l
      WHERE l.pid = ANY ($1::int[])
      ORDER BY l.pid, l.granted, l.locktype, l.mode`,
    [pids],
    'observe pg_locks',
  );
  return rows as unknown as LockRow[];
}

export async function observeBlockingPids(observer: Session, pid: number): Promise<number[]> {
  const rows = await observer.query(
    'SELECT pg_catalog.pg_blocking_pids($1::int) AS pids',
    [pid],
    'observe pg_blocking_pids',
  );
  return ((rows[0]?.pids as number[] | null) ?? []).slice().sort((a, b) => a - b);
}

/** True when two lock rows name the same lockable object. */
function sameTarget(a: LockRow, b: LockRow): boolean {
  return (
    a.locktype === b.locktype &&
    a.relation === b.relation &&
    a.transactionid === b.transactionid &&
    a.virtualxid === b.virtualxid &&
    a.page === b.page &&
    a.tuple === b.tuple
  );
}

export interface WaitOptions {
  /** Upper bound on observation; reaching it is a failure, never evidence. Default 15 s. */
  readonly deadlineMs?: number;
}

/**
 * Waits until PostgreSQL reports that `pending`'s session is waiting on a lock AND that every session
 * in `blockers` is among its blocking pids. Returns the observation that satisfied the condition.
 */
export async function waitUntilBlocked(
  observer: Session,
  pending: PendingStatement,
  blockers: readonly Session[],
  options: WaitOptions = {},
): Promise<BlockingObservation> {
  const blocked = pending.session;
  if (blockers.length === 0)
    throw new Error('waitUntilBlocked needs at least one expected blocker');
  if (observer === blocked || blockers.includes(observer)) {
    throw new Error(
      'the observer must be a session independent of the blocked and blocking sessions',
    );
  }
  const deadline = Date.now() + (options.deadlineMs ?? 15_000);
  const expected = blockers.map((b) => b.pid).sort((a, b) => a - b);
  let observations = 0;
  let last = '';
  for (;;) {
    if (pending.settled) {
      const { state, error } = await pending.outcome();
      if (error instanceof DeadlockDetectedError) throw error;
      throw new NotBlockedError(
        `[${blocked.label}] "${pending.label}" was expected to block on ${blockers
          .map((b) => b.label)
          .join(', ')} but ${state === 'fulfilled' ? 'completed' : `failed: ${String(error)}`}`,
      );
    }
    observations += 1;
    const [activity] = await observeActivity(observer, [blocked.pid]);
    const blockingPids = await observeBlockingPids(observer, blocked.pid);
    const locks = await observeLocks(observer, [blocked.pid, ...expected]);
    const waitingLocks = locks.filter((l) => l.pid === blocked.pid && !l.granted);
    const holdsAll = expected.every((p) => blockingPids.includes(p));
    if (activity && activity.waitEventType === 'Lock' && waitingLocks.length > 0 && holdsAll) {
      // Re-check the statement is still pending: the observation must describe a live wait.
      if (!pending.settled) {
        const blockerGrantedLocks = locks.filter(
          (l) => l.pid !== blocked.pid && l.granted && waitingLocks.some((w) => sameTarget(w, l)),
        );
        return {
          blockedLabel: blocked.label,
          blockedPid: blocked.pid,
          activity,
          blockingPids,
          blockerLabels: blockers.map((b) => b.label),
          waitingLocks,
          blockerGrantedLocks,
          observations,
        };
      }
      continue;
    }
    last =
      `wait_event_type=${activity?.waitEventType ?? 'null'} state=${activity?.state ?? 'null'} ` +
      `blocking=[${blockingPids.join(',')}] ungranted=${waitingLocks.length}`;
    if (Date.now() > deadline) {
      throw new BlockingNotObservedError(
        `[${blocked.label}] "${pending.label}": PostgreSQL never reported a lock wait on ` +
          `[${expected.join(',')}] before the deadline (last: ${last})`,
      );
    }
    // Yield between reads; the cadence is irrelevant to the result, which is PostgreSQL state.
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

/** Asserts PostgreSQL reports `session` is NOT waiting on any lock right now. */
export async function assertNotWaiting(
  observer: Session,
  session: Session,
): Promise<BackendActivity> {
  const [activity] = await observeActivity(observer, [session.pid]);
  const ungranted = (await observeLocks(observer, [session.pid])).filter((l) => !l.granted);
  if (!activity)
    throw new Error(`[${session.label}] backend ${session.pid} not in pg_stat_activity`);
  if (activity.waitEventType === 'Lock' || ungranted.length > 0) {
    throw new Error(
      `[${session.label}] expected no lock wait, observed wait_event_type=${activity.waitEventType} ` +
        `ungranted=${ungranted.length}`,
    );
  }
  return activity;
}

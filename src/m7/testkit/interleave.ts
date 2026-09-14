// M7 V1.1 — S02 real-PostgreSQL harness: explicit, reviewable statement interleaving.
//
// Test infrastructure only (VC-4 groundwork). An Interleaving is a strictly ordered script over
// independent sessions: every step completes — or is PROVEN blocked by PostgreSQL state (locks.ts) —
// before the next step is issued, and every step is appended to a trace carrying the session label,
// backend pid, statement and outcome. There is no timing-based step. A 40P01 anywhere fails the
// interleaving (DeadlockDetectedError), including one surfacing on a statement not currently awaited.
import { waitUntilBlocked, type BlockingObservation, type WaitOptions } from './locks';
import {
  DeadlockDetectedError,
  expectSqlState,
  type MultiSessionDriver,
  type PendingStatement,
  type Session,
} from './sessions';

/** An explicit gate for JS-side orchestration: tasks `wait()` until the script `release()`s it. */
export class Barrier {
  private released = false;
  private readonly waiters: (() => void)[] = [];
  private arrivals = 0;
  private readonly arrivalListeners: { count: number; resolve: () => void }[] = [];

  constructor(readonly label: string) {}

  /** Resolves once the barrier is released. */
  wait(): Promise<void> {
    this.arrivals += 1;
    for (let i = this.arrivalListeners.length - 1; i >= 0; i -= 1) {
      if (this.arrivalListeners[i]!.count <= this.arrivals)
        this.arrivalListeners.splice(i, 1)[0]!.resolve();
    }
    if (this.released) return Promise.resolve();
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  /** Resolves once at least `count` tasks have reached `wait()` (an arrival fact, not a delay). */
  arrived(count: number): Promise<void> {
    if (this.arrivals >= count) return Promise.resolve();
    return new Promise((resolve) => this.arrivalListeners.push({ count, resolve }));
  }

  release(): void {
    this.released = true;
    for (const w of this.waiters.splice(0)) w();
  }
}

export type TraceOutcome = 'completed' | 'blocked' | 'unblocked-completed' | `sqlstate:${string}`;

export interface TraceEntry {
  readonly seq: number;
  readonly step: string;
  readonly session: string;
  readonly pid: number;
  readonly outcome: TraceOutcome;
  readonly observation?: BlockingObservation;
}

export class Interleaving {
  private readonly entries: TraceEntry[] = [];

  constructor(
    private readonly driver: MultiSessionDriver,
    private readonly observer: Session,
  ) {}

  get trace(): readonly TraceEntry[] {
    return this.entries;
  }

  private record(entry: Omit<TraceEntry, 'seq'>): void {
    this.entries.push({ seq: this.entries.length + 1, ...entry });
  }

  /** Runs a statement that must complete (any error, a 40P01 in particular, fails the step). */
  async exec(
    session: Session,
    sql: string,
    step: string = sql,
    params?: unknown[],
  ): Promise<Record<string, unknown>[]> {
    this.driver.assertNoDeadlock(`before step "${step}"`);
    const rows = await session.query(sql, params, step);
    this.record({ step, session: session.label, pid: session.pid, outcome: 'completed' });
    return rows;
  }

  /** Issues a statement that must BLOCK on `blockers`, proven from pg_stat_activity / pg_locks. */
  async blocks(
    session: Session,
    sql: string,
    blockers: readonly Session[],
    step: string = sql,
    options?: WaitOptions,
  ): Promise<PendingStatement> {
    this.driver.assertNoDeadlock(`before step "${step}"`);
    const pending = session.start(sql, undefined, step);
    const observation = await waitUntilBlocked(this.observer, pending, blockers, options);
    this.record({
      step,
      session: session.label,
      pid: session.pid,
      outcome: 'blocked',
      observation,
    });
    return pending;
  }

  /** Issues a statement that is expected to raise a deadlock-free error, leaving it pending. */
  start(session: Session, sql: string, step: string = sql): PendingStatement {
    this.driver.assertNoDeadlock(`before step "${step}"`);
    return session.start(sql, undefined, step);
  }

  /** Awaits a previously blocked statement, which must now complete. */
  async completes(pending: PendingStatement): Promise<Record<string, unknown>[]> {
    const rows = await pending.result();
    this.record({
      step: pending.label,
      session: pending.session.label,
      pid: pending.session.pid,
      outcome: 'unblocked-completed',
    });
    return rows;
  }

  /** Awaits a statement that must fail with `sqlstate` (never 40P01 — see expectSqlState). */
  async failsWith(pending: PendingStatement, sqlstate: string): Promise<void> {
    await expectSqlState(pending, sqlstate);
    this.record({
      step: pending.label,
      session: pending.session.label,
      pid: pending.session.pid,
      outcome: `sqlstate:${sqlstate}`,
    });
  }

  /**
   * Awaits every still-pending statement and fails if any deadlocked. Call at the end of a schedule;
   * `MultiSessionDriver.closeAll()` repeats the ledger check.
   */
  async settle(pendings: readonly PendingStatement[]): Promise<void> {
    const outcomes = await Promise.all(pendings.map((p) => p.outcome()));
    const deadlocks = outcomes
      .map((o) => o.error)
      .filter((e): e is DeadlockDetectedError => e instanceof DeadlockDetectedError);
    if (deadlocks.length > 0) {
      throw new DeadlockDetectedError(
        deadlocks.flatMap((d) => d.occurrences),
        'interleaving settled with a deadlock',
      );
    }
    this.driver.assertNoDeadlock('interleaving settle');
  }
}

/** Every ordering of `items` (VC-4 "run both orders"; n! orderings, deterministic order). */
export function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [items.slice()];
  return items.flatMap((item, i) =>
    permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]),
  );
}

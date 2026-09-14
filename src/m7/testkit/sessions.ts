// M7 V1.1 — S02 real-PostgreSQL harness: the multi-session driver.
//
// Test infrastructure only (VC-3 / VC-4 groundwork; implements no M7 case). Each Session is its own
// `pg.Client`, i.e. its own TCP connection and its own PostgreSQL backend, identified by the backend
// pid PostgreSQL reports and by a unique `application_name` visible in `pg_stat_activity`.
//
// Load-bearing deadlock rule (VC-4, IMP-21): SQLSTATE 40P01 is NEVER swallowed, translated into a
// success, or accepted as an expected outcome. Every 40P01 any session observes — including one on a
// statement nobody is currently awaiting — is recorded in the driver's ledger and surfaced as a
// DeadlockDetectedError, both where it occurred and again when the driver is closed.
import pg from 'pg';

export const DEADLOCK_SQLSTATE = '40P01';

export interface ConnectionSpec {
  readonly host: string;
  readonly port: number;
  readonly database: string;
  readonly user: string;
  readonly password: string;
}

/** A statement error carrying its SQLSTATE and the session / statement it came from. */
export class SqlStateError extends Error {
  constructor(
    readonly sqlstate: string,
    readonly sessionLabel: string,
    readonly statementLabel: string,
    serverMessage: string,
  ) {
    super(`[${sessionLabel}] ${statementLabel}: SQLSTATE ${sqlstate}: ${serverMessage}`);
    this.name = 'SqlStateError';
  }
}

/** A PostgreSQL deadlock (40P01). Always a failure; there is no API that accepts it as expected. */
export class DeadlockDetectedError extends Error {
  readonly sqlstate = DEADLOCK_SQLSTATE;
  constructor(
    readonly occurrences: readonly DeadlockOccurrence[],
    context: string,
  ) {
    super(
      `DEADLOCK (SQLSTATE 40P01) — ${context}: ` +
        occurrences
          .map((o) => `[${o.sessionLabel} pid=${o.pid}] ${o.statementLabel}: ${o.serverMessage}`)
          .join('; '),
    );
    this.name = 'DeadlockDetectedError';
  }
}

export interface DeadlockOccurrence {
  readonly sessionLabel: string;
  readonly pid: number;
  readonly statementLabel: string;
  readonly sqlstate: typeof DEADLOCK_SQLSTATE;
  readonly serverMessage: string;
  readonly serverDetail: string | undefined;
}

type PgError = Error & { code?: string; detail?: string };

export type StatementState = 'pending' | 'fulfilled' | 'rejected';

/** A statement issued without awaiting it, so that it can be observed while it waits on a lock. */
export class PendingStatement {
  private stateValue: StatementState = 'pending';
  private rowsValue: Record<string, unknown>[] | undefined;
  private errorValue: SqlStateError | DeadlockDetectedError | Error | undefined;
  readonly settledPromise: Promise<void>;

  constructor(
    readonly session: Session,
    readonly label: string,
    run: Promise<Record<string, unknown>[]>,
  ) {
    // Attach handlers immediately: a rejection is recorded, never left unhandled, never dropped.
    this.settledPromise = run.then(
      (rows) => {
        this.stateValue = 'fulfilled';
        this.rowsValue = rows;
      },
      (error: Error) => {
        this.stateValue = 'rejected';
        this.errorValue = error;
      },
    );
  }

  get state(): StatementState {
    return this.stateValue;
  }

  get settled(): boolean {
    return this.stateValue !== 'pending';
  }

  /** The SQLSTATE of a rejected statement, if any. */
  get sqlstate(): string | undefined {
    const e = this.errorValue;
    return e instanceof SqlStateError || e instanceof DeadlockDetectedError
      ? e.sqlstate
      : undefined;
  }

  /** Awaits completion; rethrows the statement's error (a 40P01 as DeadlockDetectedError). */
  async result(): Promise<Record<string, unknown>[]> {
    await this.settledPromise;
    if (this.stateValue === 'rejected') throw this.errorValue!;
    return this.rowsValue!;
  }

  /** Awaits settlement without throwing; returns the error, if any. */
  async outcome(): Promise<{
    state: StatementState;
    error?: Error;
    rows?: Record<string, unknown>[];
  }> {
    await this.settledPromise;
    return this.stateValue === 'rejected'
      ? { state: 'rejected', error: this.errorValue! }
      : { state: 'fulfilled', rows: this.rowsValue! };
  }
}

/** One independent PostgreSQL session (connection + backend). */
export class Session {
  private inFlight: PendingStatement | undefined;
  private closed = false;

  private constructor(
    private readonly driver: MultiSessionDriver,
    private readonly client: pg.Client,
    readonly label: string,
    readonly pid: number,
    readonly sessionUser: string,
    readonly applicationName: string,
  ) {}

  /** @internal — use MultiSessionDriver.open. */
  static async connect(
    driver: MultiSessionDriver,
    label: string,
    spec: ConnectionSpec,
    applicationName: string,
  ): Promise<Session> {
    const client = new pg.Client({ ...spec, application_name: applicationName });
    // A connection-level error (e.g. the backend is terminated) must not crash the process; the
    // statement that was running rejects with it and is recorded like any other error.
    client.on('error', () => undefined);
    await client.connect();
    const { rows } = await client.query<{ pid: number; session_user: string }>(
      'SELECT pg_catalog.pg_backend_pid() AS pid, session_user',
    );
    return new Session(driver, client, label, rows[0]!.pid, rows[0]!.session_user, applicationName);
  }

  private issue(sql: string, params: unknown[] | undefined, statementLabel: string) {
    if (this.closed) throw new Error(`[${this.label}] session is closed`);
    if (this.inFlight && !this.inFlight.settled) {
      // Determinism: one statement per session at a time; never let pg queue a second one silently.
      throw new Error(
        `[${this.label}] cannot issue "${statementLabel}" while "${this.inFlight.label}" is pending`,
      );
    }
    return this.client.query(sql, params).then(
      (r) => r.rows as Record<string, unknown>[],
      (error: PgError) => {
        throw this.driver.classify(this, statementLabel, error);
      },
    );
  }

  /** Issues `sql` and returns without awaiting it. */
  start(sql: string, params?: unknown[], statementLabel: string = sql): PendingStatement {
    const pending = new PendingStatement(
      this,
      statementLabel,
      this.issue(sql, params, statementLabel),
    );
    this.inFlight = pending;
    return pending;
  }

  /** Issues `sql` and awaits it (a 40P01 rejects with DeadlockDetectedError). */
  async query(
    sql: string,
    params?: unknown[],
    statementLabel: string = sql,
  ): Promise<Record<string, unknown>[]> {
    return this.start(sql, params, statementLabel).result();
  }

  /** @internal */
  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    if (this.inFlight && !this.inFlight.settled) {
      // Closing the connection terminates the backend, which rolls back and releases its locks; the
      // pending statement then rejects and is recorded (a 40P01 already recorded stays recorded).
      await this.client.end().catch(() => undefined);
      await this.inFlight.settledPromise;
      return;
    }
    await this.client.end();
  }
}

/**
 * Owns a set of independent sessions plus the 40P01 ledger. `closeAll()` always closes every session
 * and THEN throws DeadlockDetectedError if any session ever observed 40P01.
 */
export class MultiSessionDriver {
  private readonly sessions: Session[] = [];
  private readonly deadlocks: DeadlockOccurrence[] = [];

  constructor(private readonly runId: string = Math.random().toString(36).slice(2, 10)) {}

  async open(label: string, spec: ConnectionSpec): Promise<Session> {
    if (this.sessions.some((s) => s.label === label)) throw new Error(`duplicate session ${label}`);
    const session = await Session.connect(this, label, spec, `m7s02:${this.runId}:${label}`);
    this.sessions.push(session);
    return session;
  }

  get openSessions(): readonly Session[] {
    return this.sessions;
  }

  get deadlockLedger(): readonly DeadlockOccurrence[] {
    return this.deadlocks;
  }

  /** @internal — classifies a driver error; records and converts every 40P01. */
  classify(session: Session, statementLabel: string, error: PgError): Error {
    if (error.code === DEADLOCK_SQLSTATE) {
      const occurrence: DeadlockOccurrence = {
        sessionLabel: session.label,
        pid: session.pid,
        statementLabel,
        sqlstate: DEADLOCK_SQLSTATE,
        serverMessage: error.message,
        serverDetail: error.detail,
      };
      this.deadlocks.push(occurrence);
      return new DeadlockDetectedError([occurrence], 'statement failed with deadlock_detected');
    }
    if (typeof error.code === 'string' && /^[0-9A-Z]{5}$/.test(error.code)) {
      return new SqlStateError(error.code, session.label, statementLabel, error.message);
    }
    return error;
  }

  /** Throws DeadlockDetectedError if any 40P01 was observed so far. */
  assertNoDeadlock(context = 'driver ledger'): void {
    if (this.deadlocks.length > 0) throw new DeadlockDetectedError([...this.deadlocks], context);
  }

  async closeAll(): Promise<void> {
    const sessions = this.sessions.splice(0);
    await Promise.all(sessions.map((s) => s.close()));
    this.assertNoDeadlock('closeAll: a deadlock was observed during this driver run');
  }
}

/**
 * Asserts that `pending` failed with exactly `sqlstate`. 40P01 can never be expected: asking for it is
 * a programming error, and a statement that actually deadlocked rethrows DeadlockDetectedError.
 */
export async function expectSqlState(
  pending: PendingStatement,
  sqlstate: string,
): Promise<SqlStateError> {
  if (sqlstate === DEADLOCK_SQLSTATE) {
    throw new Error('40P01 deadlock_detected can never be an expected outcome (VC-4)');
  }
  const { state, error } = await pending.outcome();
  if (error instanceof DeadlockDetectedError) throw error;
  if (state !== 'rejected' || !(error instanceof SqlStateError)) {
    throw new Error(
      `[${pending.session.label}] ${pending.label}: expected SQLSTATE ${sqlstate}, got ${
        state === 'rejected' ? String(error) : 'success'
      }`,
    );
  }
  if (error.sqlstate !== sqlstate) {
    throw new Error(
      `[${pending.session.label}] ${pending.label}: expected SQLSTATE ${sqlstate}, got ${error.sqlstate}`,
    );
  }
  return error;
}

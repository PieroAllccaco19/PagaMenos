// M7 S02 — REAL PostgreSQL: the multi-session driver proves itself on a disposable, non-M7 fixture.
// Independent sessions, lock waits observed from pg_stat_activity / pg_locks / pg_blocking_pids (never
// from elapsed time), a seeded 40P01 deadlock that the driver surfaces as a failure, and NOWAIT.
// Runs ONLY under `pnpm m7:pg` (scripts/m7/pg-m7-harness.ts).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { loadHarnessContext, specFor, writeEvidence } from './context';
import {
  SELFTEST_SCHEMA,
  SELFTEST_TABLE,
  createSelfTestFixture,
  dropSelfTestFixture,
  isClearOfM7,
  probeNoM7Installation,
} from './fixtures';
import { Barrier, Interleaving } from './interleave';
import {
  BlockingNotObservedError,
  NotBlockedError,
  assertNotWaiting,
  observeActivity,
  observeLocks,
  waitUntilBlocked,
} from './locks';
import {
  DEADLOCK_SQLSTATE,
  DeadlockDetectedError,
  MultiSessionDriver,
  expectSqlState,
  type Session,
} from './sessions';

// Outside the harness this throws NotExecutedError: the suite fails to load, it never passes.
const ctx = loadHarnessContext();
const DB = ctx.databases.selftest;
const OWNER = 'pagamenos_m7_owner';
const sessionsUsed: {
  test: string;
  label: string;
  pid: number;
  sessionUser: string;
  applicationName: string;
}[] = [];

async function withDriver<T>(
  test: string,
  labels: string[],
  fn: (driver: MultiSessionDriver, s: Record<string, Session>, observer: Session) => Promise<T>,
): Promise<T> {
  const driver = new MultiSessionDriver();
  const s: Record<string, Session> = {};
  try {
    for (const label of labels)
      s[label] = await driver.open(label, specFor(ctx, ctx.migrationRole, DB));
    const observer = await driver.open('observer', specFor(ctx, ctx.migrationRole, DB));
    for (const x of driver.openSessions) {
      sessionsUsed.push({
        test,
        label: x.label,
        pid: x.pid,
        sessionUser: x.sessionUser,
        applicationName: x.applicationName,
      });
    }
    return await fn(driver, s, observer);
  } finally {
    // closeAll rethrows DeadlockDetectedError if any 40P01 was observed; tests that seed a deadlock
    // assert that themselves and call closeAll inside fn.
    if (driver.openSessions.length > 0) await driver.closeAll();
  }
}

describe('S02 multi-session driver (real PostgreSQL, disposable non-M7 fixture)', () => {
  beforeAll(async () => {
    const driver = new MultiSessionDriver();
    const setup = await driver.open('fixture-setup', specFor(ctx, ctx.migrationRole, DB));
    await createSelfTestFixture({
      query: async (sql, params) => ({ rows: (await setup.query(sql, params)) as never[] }),
    });
    await driver.closeAll();
  });

  afterAll(async () => {
    const driver = new MultiSessionDriver();
    const s = await driver.open('fixture-teardown', specFor(ctx, ctx.migrationRole, DB));
    const q = {
      query: async (sql: string, params?: unknown[]) => ({
        rows: (await s.query(sql, params)) as never[],
      }),
    };
    const cleanup = await dropSelfTestFixture(q);
    const probe = await probeNoM7Installation(q, OWNER);
    await driver.closeAll();
    writeEvidence(ctx, 'sessions-fixture-cleanup', {
      schema: SELFTEST_SCHEMA,
      cleanup,
      noM7InstallationInSelftestDb: probe,
      sessionsUsed,
      distinctBackendPids: new Set(sessionsUsed.map((x) => x.pid)).size,
    });
    expect(isClearOfM7(probe)).toBe(true);
  });

  it('D-01 sessions are genuinely independent backends and transactions', async () => {
    await withDriver('D-01', ['A', 'B', 'C'], async (driver, { A, B, C }, observer) => {
      const pids = [A!.pid, B!.pid, C!.pid, observer.pid];
      expect(new Set(pids).size).toBe(4);
      const activity = await observeActivity(observer, pids);
      expect(activity.map((a) => a.pid).sort()).toEqual([...pids].sort());
      expect(new Set(activity.map((a) => a.applicationName)).size).toBe(4);

      // Transaction isolation between sessions: A's uncommitted write is invisible to B.
      const il = new Interleaving(driver, observer);
      await il.exec(A!, 'BEGIN');
      await il.exec(
        A!,
        `UPDATE ${SELFTEST_TABLE} SET v = 42 WHERE id = 3`,
        'A updates row 3 (uncommitted)',
      );
      const seenByB = await il.exec(
        B!,
        `SELECT v FROM ${SELFTEST_TABLE} WHERE id = 3`,
        'B reads row 3',
      );
      const { rows: xids } = {
        rows: await A!.query('SELECT pg_catalog.pg_current_xact_id()::text AS xid'),
      };
      const cXid = await C!.query(
        'SELECT pg_catalog.pg_current_xact_id_if_assigned()::text AS xid',
      );
      await il.exec(A!, 'ROLLBACK');
      expect(seenByB[0]!.v).toBe(0);
      expect(cXid[0]!.xid).toBeNull();
      writeEvidence(ctx, 'sessions-independence', {
        sessions: activity.map((a) => ({
          pid: a.pid,
          applicationName: a.applicationName,
          usename: a.usename,
        })),
        uncommittedWriteVisibleToOtherSession: seenByB[0]!.v !== 0,
        writerXidAssigned: xids[0]!.xid !== null,
        trace: il.trace,
      });
    });
  });

  it('D-02 a lock wait is detected from pg_stat_activity / pg_locks / pg_blocking_pids', async () => {
    await withDriver('D-02', ['holder', 'waiter'], async (driver, { holder, waiter }, observer) => {
      const il = new Interleaving(driver, observer);
      await il.exec(holder!, 'BEGIN');
      await il.exec(
        holder!,
        `SELECT id FROM ${SELFTEST_TABLE} WHERE id = 1 FOR UPDATE`,
        'holder locks row 1',
      );
      await il.exec(waiter!, 'BEGIN');
      const pending = await il.blocks(
        waiter!,
        `SELECT id FROM ${SELFTEST_TABLE} WHERE id = 1 FOR UPDATE`,
        [holder!],
        'waiter requests row 1 FOR UPDATE',
      );
      const observation = il.trace.at(-1)!.observation!;
      expect(pending.settled).toBe(false);
      expect(observation.activity.waitEventType).toBe('Lock');
      expect(observation.blockingPids).toEqual([holder!.pid]);
      expect(observation.waitingLocks.every((l) => !l.granted && l.pid === waiter!.pid)).toBe(true);
      expect(observation.blockerGrantedLocks.length).toBeGreaterThan(0);
      expect(observation.blockerGrantedLocks.every((l) => l.pid === holder!.pid && l.granted)).toBe(
        true,
      );

      await il.exec(holder!, 'COMMIT', 'holder commits');
      await il.completes(pending);
      await il.exec(waiter!, 'COMMIT', 'waiter commits');
      await assertNotWaiting(observer, waiter!);
      await il.settle([pending]);
      writeEvidence(ctx, 'sessions-blocking-observation', {
        holder: { label: holder!.label, pid: holder!.pid },
        waiter: { label: waiter!.label, pid: waiter!.pid },
        observer: { label: observer.label, pid: observer.pid },
        pgStatActivity: observation.activity,
        pgBlockingPids: observation.blockingPids,
        pgLocksWaiting: observation.waitingLocks,
        pgLocksHeldByBlocker: observation.blockerGrantedLocks,
        trace: il.trace.map((t) => ({
          seq: t.seq,
          step: t.step,
          session: t.session,
          pid: t.pid,
          outcome: t.outcome,
        })),
      });
    });
  });

  it('D-03 negative: a statement that does not wait is NOT reported as blocked', async () => {
    await withDriver('D-03', ['holder', 'other'], async (driver, { holder, other }, observer) => {
      const il = new Interleaving(driver, observer);
      await il.exec(holder!, 'BEGIN');
      await il.exec(holder!, `SELECT id FROM ${SELFTEST_TABLE} WHERE id = 1 FOR UPDATE`);
      await il.exec(other!, 'BEGIN');
      const pending = other!.start(
        `SELECT id FROM ${SELFTEST_TABLE} WHERE id = 2 FOR UPDATE`,
        undefined,
        'other locks row 2',
      );
      await expect(waitUntilBlocked(observer, pending, [holder!])).rejects.toBeInstanceOf(
        NotBlockedError,
      );
      await il.exec(other!, 'COMMIT');
      await il.exec(holder!, 'COMMIT');
    });
  });

  it('D-04 negative: a long-running statement that holds no lock wait is NOT blocked (deadline fails)', async () => {
    await withDriver('D-04', ['holder', 'busy'], async (_driver, { holder, busy }, observer) => {
      await holder!.query('BEGIN');
      await holder!.query(`SELECT id FROM ${SELFTEST_TABLE} WHERE id = 1 FOR UPDATE`);
      // pg_sleep is the object under test here (busy but not lock-waiting), never evidence of blocking.
      const pending = busy!.start('SELECT pg_catalog.pg_sleep(120)', undefined, 'busy sleeps');
      const error = await waitUntilBlocked(observer, pending, [holder!], { deadlineMs: 750 }).catch(
        (e) => e,
      );
      expect(error).toBeInstanceOf(BlockingNotObservedError);
      const [act] = await observeActivity(observer, [busy!.pid]);
      expect(act!.waitEventType).not.toBe('Lock');
      await observer.query('SELECT pg_catalog.pg_cancel_backend($1)', [busy!.pid]);
      await expectSqlState(pending, '57014');
      await holder!.query('COMMIT');
    });
  });

  it('D-05 seeded deadlock: 40P01 is detected and surfaced as a failure, never as success', async () => {
    const driver = new MultiSessionDriver();
    const A = await driver.open('A', specFor(ctx, ctx.migrationRole, DB));
    const B = await driver.open('B', specFor(ctx, ctx.migrationRole, DB));
    const observer = await driver.open('observer', specFor(ctx, ctx.migrationRole, DB));
    for (const x of driver.openSessions) {
      sessionsUsed.push({
        test: 'D-05',
        label: x.label,
        pid: x.pid,
        sessionUser: x.sessionUser,
        applicationName: x.applicationName,
      });
    }
    const il = new Interleaving(driver, observer);
    await il.exec(A, 'BEGIN');
    await il.exec(A, `UPDATE ${SELFTEST_TABLE} SET v = v + 1 WHERE id = 1`, 'A updates row 1');
    await il.exec(B, 'BEGIN');
    await il.exec(B, `UPDATE ${SELFTEST_TABLE} SET v = v + 1 WHERE id = 2`, 'B updates row 2');
    const aWaits = await il.blocks(
      A,
      `UPDATE ${SELFTEST_TABLE} SET v = v + 1 WHERE id = 2`,
      [B],
      'A updates row 2 (waits on B)',
    );
    const firstWait = il.trace.at(-1)!.observation!;
    // Close the cycle: B now requests row 1, held by A, which waits on B.
    const bCloses = il.start(
      B,
      `UPDATE ${SELFTEST_TABLE} SET v = v + 1 WHERE id = 1`,
      'B updates row 1 (closes cycle)',
    );

    const settleError = await il.settle([aWaits, bCloses]).catch((e: unknown) => e);
    expect(settleError).toBeInstanceOf(DeadlockDetectedError);
    const deadlock = settleError as DeadlockDetectedError;
    expect(deadlock.sqlstate).toBe(DEADLOCK_SQLSTATE);
    expect(deadlock.occurrences).toHaveLength(1);
    expect(deadlock.occurrences[0]!.sqlstate).toBe('40P01');

    const outcomes = await Promise.all([aWaits.outcome(), bCloses.outcome()]);
    const victims = outcomes.filter((o) => o.error instanceof DeadlockDetectedError);
    const survivors = outcomes.filter((o) => o.state === 'fulfilled');
    expect(victims).toHaveLength(1);
    expect(survivors).toHaveLength(1);

    // 40P01 can never be requested as an expected outcome, and the victim's statement rethrows it.
    const victim = [aWaits, bCloses].find((p) => p.sqlstate === DEADLOCK_SQLSTATE)!;
    await expect(expectSqlState(victim, DEADLOCK_SQLSTATE)).rejects.toThrow(
      /can never be an expected outcome/,
    );
    await expect(expectSqlState(victim, '55P03')).rejects.toBeInstanceOf(DeadlockDetectedError);
    await expect(victim.result()).rejects.toBeInstanceOf(DeadlockDetectedError);
    // Every later step and the driver itself keep refusing.
    await expect(il.exec(observer, 'SELECT 1', 'step after deadlock')).rejects.toBeInstanceOf(
      DeadlockDetectedError,
    );
    expect(() => driver.assertNoDeadlock()).toThrow(DeadlockDetectedError);

    const survivorSession = victim === aWaits ? B : A;
    const victimSession = victim === aWaits ? A : B;
    await victimSession.query('ROLLBACK');
    await survivorSession.query('ROLLBACK');
    const closeError = await driver.closeAll().catch((e: unknown) => e);
    expect(closeError).toBeInstanceOf(DeadlockDetectedError);

    writeEvidence(ctx, 'sessions-seeded-deadlock', {
      fixture: SELFTEST_TABLE,
      sessions: { A: A.pid, B: B.pid, observer: observer.pid },
      preCycleWaitObservation: {
        blocked: firstWait.blockedLabel,
        waitEventType: firstWait.activity.waitEventType,
        waitEvent: firstWait.activity.waitEvent,
        blockingPids: firstWait.blockingPids,
        waitingLocks: firstWait.waitingLocks,
      },
      deadlockLedger: driver.deadlockLedger,
      observedSqlstate: deadlock.occurrences[0]!.sqlstate,
      victim: victimSession.label,
      survivor: survivorSession.label,
      settleRejectedWith: deadlock.name,
      expectSqlState40P01Refused: true,
      closeAllRejectedWith: (closeError as Error).name,
      surfacedAsFailure: true,
    });
  });

  it('D-06 NOWAIT raises 55P03 and leaves no waiting lock request behind', async () => {
    await withDriver('D-06', ['holder', 'nowait'], async (driver, { holder, nowait }, observer) => {
      const il = new Interleaving(driver, observer);
      await il.exec(holder!, 'BEGIN');
      await il.exec(holder!, `SELECT id FROM ${SELFTEST_TABLE} WHERE id = 3 FOR UPDATE`);
      await il.exec(nowait!, 'BEGIN');
      const p = il.start(
        nowait!,
        `SELECT id FROM ${SELFTEST_TABLE} WHERE id = 3 FOR UPDATE NOWAIT`,
        'nowait request',
      );
      await il.failsWith(p, '55P03');
      const ungranted = (await observeLocks(observer, [nowait!.pid])).filter((l) => !l.granted);
      await assertNotWaiting(observer, nowait!);
      expect(ungranted).toEqual([]);
      await il.exec(nowait!, 'ROLLBACK');
      await il.exec(holder!, 'COMMIT');
      writeEvidence(ctx, 'sessions-nowait', {
        sqlstate: '55P03',
        ungrantedAfter: ungranted.length,
        trace: il.trace,
      });
    });
  });

  it('D-07 barriers line up concurrent tasks; completion is still proven by PostgreSQL results', async () => {
    await withDriver('D-07', ['t1', 't2'], async (_driver, { t1, t2 }) => {
      const gate = new Barrier('start');
      const task = async (s: Session, id: number) => {
        await gate.wait();
        return s.query(`SELECT id FROM ${SELFTEST_TABLE} WHERE id = $1`, [id]);
      };
      const r1 = task(t1!, 1);
      const r2 = task(t2!, 2);
      await gate.arrived(2);
      gate.release();
      const [a, b] = await Promise.all([r1, r2]);
      expect(a[0]!.id).toBe(1);
      expect(b[0]!.id).toBe(2);
    });
  });
});

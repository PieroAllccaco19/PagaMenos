// PagaMenos · the exact M7 consumer-boundary error mapping (V1.1 §19.11.0). Offline; no database.
import { describe, expect, it } from 'vitest';

import {
  M7ControlPlaneMismatchError,
  M7CorrectionTargetAlreadySupersededError,
  M7DomainConflictError,
  M7IdempotencyConflictError,
  M7OperationUnavailableError,
  disposeM7Error,
  m7TokenOf,
  sqlStateOf,
} from './m7-errors';

/** A driver error in the pg shape. */
function pgError(code: string, message = 'server said so'): Error {
  return Object.assign(new Error(message), { code });
}

/** A driver error in the Prisma P2010 shape (SQLSTATE under `meta`). */
function prismaRawError(code: string, message = 'raw query failed'): Error {
  return Object.assign(new Error(message), { code: 'P2010', meta: { code, message } });
}

describe('SQLSTATE extraction', () => {
  it('reads the pg shape and the Prisma raw shape', () => {
    expect(sqlStateOf(pgError('28000'))).toBe('28000');
    expect(sqlStateOf(prismaRawError('M7001'))).toBe('M7001');
    expect(sqlStateOf(new Error('nothing'))).toBeNull();
    expect(sqlStateOf(null)).toBeNull();
    // A Prisma code matches the five-character shape but is NOT a SQLSTATE: accepting it would
    // downgrade every raw-query failure (including M7001/M7002/M7003) to UNAVAILABLE.
    expect(sqlStateOf({ code: 'P2010' })).toBeNull();
    expect(sqlStateOf({ code: 'P2002' })).toBeNull();
    expect(disposeM7Error(prismaRawError('M7002')).kind).toBe('THROW');
  });

  it('recognizes only the FIXED accepted message tokens', () => {
    expect(m7TokenOf(new Error('ERROR: M7_IDEMPOTENCY_CONFLICT'))).toBe('M7_IDEMPOTENCY_CONFLICT');
    expect(m7TokenOf(new Error('ERROR: M7_SESSION_INVALID'))).toBe('M7_SESSION_INVALID');
    expect(m7TokenOf(new Error('some unrelated failure'))).toBeNull();
  });
});

describe('§19.11.0 — everything except M7001–M7003 is generic', () => {
  it('maps 28000 M7_SESSION_INVALID to the generic NOT_AUTHORIZED sentinel', () => {
    expect(disposeM7Error(pgError('28000')).kind).toBe('NOT_AUTHORIZED');
  });

  it('maps M7008 M7_DECISION_NOT_AVAILABLE to the SAME generic answer', () => {
    expect(disposeM7Error(pgError('M7008')).kind).toBe('NOT_AUTHORIZED');
  });

  it('makes session-invalid and decision-not-available indistinguishable', () => {
    expect(disposeM7Error(pgError('28000'))).toEqual(disposeM7Error(pgError('M7008')));
  });
});

describe('§19.11.0 — M7001–M7003 stay explicit and are never a consent denial', () => {
  it.each([
    ['M7001', M7IdempotencyConflictError, 'M7_IDEMPOTENCY_CONFLICT'],
    ['M7002', M7DomainConflictError, 'M7_DOMAIN_CONFLICT'],
    ['M7003', M7CorrectionTargetAlreadySupersededError, 'M7_CORRECTION_TARGET_ALREADY_SUPERSEDED'],
  ])('maps %s to its typed error', (state, ctor, token) => {
    const d = disposeM7Error(pgError(state));
    expect(d.kind).toBe('THROW');
    if (d.kind !== 'THROW') throw new Error('unreachable');
    expect(d.error).toBeInstanceOf(ctor as never);
    expect(d.error.token).toBe(token);
  });

  it('does NOT collapse an idempotency conflict into NOT_AUTHORIZED', () => {
    expect(disposeM7Error(pgError('M7001')).kind).not.toBe('NOT_AUTHORIZED');
  });
});

describe('§23.6 — a drifted control plane is UNAVAILABLE, not an authorization answer', () => {
  it('maps 55000 to the typed control-plane mismatch', () => {
    const d = disposeM7Error(pgError('55000'));
    expect(d.kind).toBe('THROW');
    if (d.kind !== 'THROW') throw new Error('unreachable');
    expect(d.error).toBeInstanceOf(M7ControlPlaneMismatchError);
  });
});

describe('fail-closed and oracle-free', () => {
  it.each(['M7004', 'M7007', 'M7011', '23514', '42883'])(
    'maps the unmodelled SQLSTATE %s to UNAVAILABLE, never to an authorization answer',
    (state) => {
      const d = disposeM7Error(pgError(state));
      expect(d.kind).toBe('THROW');
      if (d.kind !== 'THROW') throw new Error('unreachable');
      expect(d.error).toBeInstanceOf(M7OperationUnavailableError);
    },
  );

  it('maps an entirely unrecognized failure to UNAVAILABLE', () => {
    const d = disposeM7Error(new Error('connection reset'));
    expect(d.kind).toBe('THROW');
    if (d.kind !== 'THROW') throw new Error('unreachable');
    expect(d.error).toBeInstanceOf(M7OperationUnavailableError);
  });

  it('classifies through the cause chain (the CCA settlement gate wraps adapter failures)', () => {
    const wrapped = new Error('CCA_ADAPTER_OPERATION_FAILED: an adapter operation failed', {
      cause: pgError('M7001'),
    });
    const d = disposeM7Error(wrapped);
    expect(d.kind).toBe('THROW');
    if (d.kind !== 'THROW') throw new Error('unreachable');
    expect(d.error).toBeInstanceOf(M7IdempotencyConflictError);
  });

  it('survives a cyclic cause chain without hanging', () => {
    const a = new Error('a') as Error & { cause?: unknown };
    const b = new Error('b') as Error & { cause?: unknown };
    a.cause = b;
    b.cause = a;
    expect(disposeM7Error(a).kind).toBe('THROW');
  });

  it('never exposes raw driver text, consent material or a session reason', () => {
    const raw =
      'db error: ERROR: M7_SESSION_INVALID; participant 123 withdrew consent; optionalEvidenceConsent=false; SELECT * FROM study_consent_event';
    for (const state of ['M7001', 'M7002', 'M7003', '55000', 'M7004']) {
      const d = disposeM7Error(pgError(state, raw));
      if (d.kind !== 'THROW') throw new Error('unreachable');
      const text = `${d.error.message} ${JSON.stringify(d.error)}`;
      for (const forbidden of [
        'study_consent_event',
        'optionalEvidenceConsent',
        'withdrew',
        'SELECT',
        'db error',
      ]) {
        expect(text).not.toContain(forbidden);
      }
      expect((d.error as Error & { cause?: unknown }).cause).toBeUndefined();
    }
  });
});

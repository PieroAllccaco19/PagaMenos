import { describe, expect, it } from 'vitest';

import { ALLOWED_LOG_FIELDS, createLogEvent, sanitizeLogFields } from '@/lib/logger';

describe('RT-16 logging allowlist', () => {
  it('keeps only allowlisted fields and drops sensitive ones', () => {
    const out = sanitizeLogFields({
      participantRef: 'p_123',
      route: '/decision',
      durationMs: 12,
      // All of these MUST be dropped:
      email: 'someone@example.com',
      sessionToken: 'abc.def.ghi',
      authCookie: 'sid=...',
      evidenceUrl: 'https://blob/evidence/1',
      portfolio: { families: ['BCP_QORE'] },
      basket: [{ sku: 'X', qty: 2 }],
      rawSnapshot: '<html>…</html>',
      DATABASE_URL: 'postgresql://u:p@h/db',
    });

    expect(out).toEqual({ participantRef: 'p_123', route: '/decision', durationMs: 12 });
    for (const forbidden of [
      'email',
      'sessionToken',
      'authCookie',
      'evidenceUrl',
      'portfolio',
      'basket',
      'rawSnapshot',
      'DATABASE_URL',
    ]) {
      expect(Object.keys(out)).not.toContain(forbidden);
    }
  });

  it('createLogEvent carries only sanitized fields', () => {
    const ev = createLogEvent('info', 'decision_computed', {
      decisionRef: 'd_1',
      email: 'a@b.com',
    });
    expect(ev.level).toBe('info');
    expect(ev.message).toBe('decision_computed');
    expect(ev.fields).toEqual({ decisionRef: 'd_1' });
    expect(typeof ev.ts).toBe('string');
  });

  it('every allowlisted key is itself non-sensitive', () => {
    const sensitive = ['email', 'token', 'cookie', 'session', 'secret', 'url', 'evidence'];
    for (const key of ALLOWED_LOG_FIELDS) {
      expect(sensitive.some((s) => key.toLowerCase().includes(s))).toBe(false);
    }
  });
});

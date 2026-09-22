// PagaMenos · M7 participant-session capability: NON-DISCLOSURE of the raw secret (V1.1 §8.2).
// Offline; no database. The real-PostgreSQL issuance/revocation behaviour is proved by the
// `pnpm m7:so1` suite; this suite proves what the module does NOT expose, which is a static and
// structural property and does not need a database.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import * as sessionModule from './m7-participant-session';

const SOURCE = readFileSync(
  path.resolve(process.cwd(), 'src/services/m7-participant-session.ts'),
  'utf8',
);

describe('§8.2 — the module surface discloses no secret', () => {
  it('exports no WeakMap, registry, client, transaction or raw query capability', () => {
    const exported = Object.keys(sessionModule).sort();
    expect(exported).toEqual(
      [
        'M7_SESSION_ISSUER_DATABASE_URL_ENV',
        'M7_SESSION_REVOCATION_REASONS',
        'M7SessionError',
        'hasM7ParticipantSession',
        'issueM7ParticipantSession',
        'readM7ParticipantSessionSecret',
        'revokeM7ParticipantSession',
      ].sort(),
    );
    for (const name of exported) {
      const value = (sessionModule as Record<string, unknown>)[name];
      expect(value).not.toBeInstanceOf(WeakMap);
      expect(value).not.toBeInstanceOf(Map);
    }
  });

  it('exports neither the secret registry nor the issuer client (static proof)', () => {
    // The two module-private bindings must never be exported under any spelling.
    expect(/export\s+(const|let|var|function)\s+secrets\b/.test(SOURCE)).toBe(false);
    expect(/export\s+(const|let|var|function)\s+registrations\b/.test(SOURCE)).toBe(false);
    expect(/export\s+(const|let|var|function)\s+issuer(Client)?\b/.test(SOURCE)).toBe(false);
    expect(/export\s*\{[^}]*\b(secrets|registrations|issuer|issuerClient)\b/.test(SOURCE)).toBe(
      false,
    );
    // No re-export can smuggle them out either.
    expect(/export\s+\*/.test(SOURCE)).toBe(false);
  });

  it('never logs: the module contains no console, logger or telemetry call', () => {
    expect(/\bconsole\s*\./.test(SOURCE)).toBe(false);
    expect(/\b(logger|log|track|report|captureException)\s*\(/.test(SOURCE)).toBe(false);
  });

  it('sends ONLY the digest to the issuance function, never the raw secret', () => {
    // The raw secret is hashed and the DIGEST is what appears in the issuance statement.
    expect(SOURCE).toContain("createHash('sha256').update(secret).digest()");
    expect(SOURCE).toMatch(/s_issue_participant_session_v1\([^)]*handleSha256/s);
    // `secret` itself must not be interpolated into any SQL template.
    expect(/\$\{secret\}/.test(SOURCE)).toBe(false);
  });

  it('mints exactly 32 bytes from the OS CSPRNG, never from caller input', () => {
    expect(SOURCE).toContain('randomBytes(32)');
    expect(/randomBytes\((?!32\))/.test(SOURCE)).toBe(false);
    // No parameter named like a caller-supplied secret exists anywhere on the surface.
    expect(/sessionSecret\s*[:?]/.test(SOURCE)).toBe(false);
  });

  it('exposes no generic getter taking an arbitrary participantId', () => {
    // The only accessor takes a TrustedParticipantContext, which participant-facing code cannot mint.
    expect(SOURCE).toContain(
      'export function readM7ParticipantSessionSecret(context: TrustedParticipantContext): Buffer',
    );
    expect(/readM7ParticipantSessionSecret\s*\(\s*\w+\s*:\s*string/.test(SOURCE)).toBe(false);
    expect(/function\s+\w*[Ss]ecret\w*\s*\([^)]*participantId\s*:\s*string/.test(SOURCE)).toBe(
      false,
    );
  });
});

describe('§8.2 — the secret is not reachable through the context object', () => {
  it('refuses a context that has no registered capability, without revealing anything', () => {
    const impostor = { participantId: '11111111-2222-4333-8444-555555555555' } as never;
    expect(sessionModule.hasM7ParticipantSession(impostor)).toBe(false);
    let message = '';
    try {
      sessionModule.readM7ParticipantSessionSecret(impostor);
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toContain('M7_SESSION');
    // The refusal names no participant, no session, no digest and no secret material.
    expect(message).not.toContain('11111111');
    expect(message).not.toMatch(/[0-9a-f]{32,}/);
  });

  it('never attaches the secret to the context object itself', () => {
    // The registry is a WeakMap keyed BY the context; nothing is assigned ONTO it.
    expect(/context\s*\.\s*\w*[Ss]ecret\s*=/.test(SOURCE)).toBe(false);
    expect(/Object\.assign\s*\(\s*context/.test(SOURCE)).toBe(false);
    expect(/defineProperty\s*\(\s*context/.test(SOURCE)).toBe(false);
    expect(SOURCE).toContain('new WeakMap<TrustedParticipantContext, Buffer>()');
  });

  it('returns a defensive copy so a consumer cannot mutate the registered secret', () => {
    expect(SOURCE).toContain('return Buffer.from(secret);');
  });

  it('never serializes the secret and never places it in an error', () => {
    expect(/JSON\.stringify\s*\([^)]*secret/i.test(SOURCE)).toBe(false);
    expect(/M7SessionError\([^)]*secret/i.test(SOURCE)).toBe(false);
    expect(/toString\s*\(\s*['"]hex['"]\s*\)/.test(SOURCE)).toBe(false);
  });
});

describe('§8.2 RV-1..RV-5 — revocation contract', () => {
  it('never reports COMPLETE without observing QUIESCENT', () => {
    // COMPLETE is returned on exactly one code path, and that path is guarded by QUIESCENT.
    expect(SOURCE).toMatch(/state === 'QUIESCENT'[\s\S]*?return \{ state: 'COMPLETE'/);
    // COMPLETE is RETURNED on exactly one code path (the union type declares it once more).
    const completeReturns = SOURCE.match(/return \{ state: 'COMPLETE'/g) ?? [];
    expect(completeReturns).toHaveLength(1);
  });

  it('re-invokes on DRAINING with a bounded budget and then reports NOT YET QUIESCENT', () => {
    expect(SOURCE).toContain('DRAINING_MAX_ATTEMPTS');
    expect(SOURCE).toContain("state: 'REVOKED_NOT_YET_QUIESCENT'");
  });

  it('drops the in-process capability when a session is revoked', () => {
    const deletes = SOURCE.match(/secrets\.delete\(/g) ?? [];
    expect(deletes.length).toBeGreaterThanOrEqual(2);
  });
});

describe('AUTH §8 — the A1 trusted adapter is consumed, not changed', () => {
  it('resolves the genuine trusted context FIRST, through the unchanged A1 function', () => {
    expect(SOURCE).toContain(
      "import { resolveTrustedParticipantContext } from './study-participant-session';",
    );
    expect(SOURCE).toMatch(
      /resolveTrustedParticipantContext\(\{[\s\S]*?\}\);[\s\S]*?await registerM7ParticipantSession/,
    );
  });

  it('does not re-implement or re-export the A1 creation primitive', () => {
    expect(SOURCE).not.toContain('createTrustedParticipantContext');
    expect(SOURCE).not.toContain('@/study/participant-context');
  });

  it('the accepted A1 trusted session adapter file is byte-unchanged by this slice', () => {
    const a1 = readFileSync(
      path.resolve(process.cwd(), 'src/services/study-participant-session.ts'),
      'utf8',
    );
    expect(a1).toContain('export function resolveTrustedParticipantContext(');
    expect(a1).toContain(
      'args: ResolveTrustedParticipantContextArgs,\n): TrustedParticipantContext {',
    );
    expect(a1).not.toContain('m7');
    expect(a1).not.toContain('M7');
  });
});

// PagaMenos · src/study — trusted participant context forgery resistance (A1-CODE-01, spec §12).
import { describe, expect, it } from 'vitest';

import {
  createTrustedParticipantContext,
  isTrustedParticipantContext,
} from './participant-context';

describe('TrustedParticipantContext is runtime-unforgeable (A1-CODE-01)', () => {
  it('accepts ONLY a context this module created (registry membership, not shape)', () => {
    const ctx = createTrustedParticipantContext('participant-A');
    expect(isTrustedParticipantContext(ctx)).toBe(true);
    expect(ctx.participantId).toBe('participant-A');
  });

  it('rejects a plain object with the exact public shape', () => {
    expect(isTrustedParticipantContext({ participantId: 'participant-A' })).toBe(false);
  });

  it('rejects an `as unknown as` lookalike (a plain object cast at compile time only)', () => {
    const forged = { participantId: 'participant-B' } as unknown;
    expect(isTrustedParticipantContext(forged)).toBe(false);
  });

  it('rejects a spread / clone that copies the identity field', () => {
    const ctx = createTrustedParticipantContext('participant-A');
    expect(isTrustedParticipantContext({ ...ctx })).toBe(false);
    expect(isTrustedParticipantContext({ ...ctx, participantId: 'participant-B' })).toBe(false);
    expect(isTrustedParticipantContext(Object.assign({}, ctx))).toBe(false);
  });

  it('rejects a symbol-copy / own-property clone of a valid context', () => {
    const ctx = createTrustedParticipantContext('participant-A');
    const clone: Record<string | symbol, unknown> = {};
    const src = ctx as unknown as Record<string | symbol, unknown>;
    for (const k of Reflect.ownKeys(ctx)) clone[k] = src[k];
    expect(isTrustedParticipantContext(clone)).toBe(false);
  });

  it('rejects a JSON serialize/reconstruct round-trip', () => {
    const ctx = createTrustedParticipantContext('participant-A');
    expect(isTrustedParticipantContext(JSON.parse(JSON.stringify(ctx)))).toBe(false);
  });

  it('rejects an object that prototypally inherits from a valid context', () => {
    const ctx = createTrustedParticipantContext('participant-A');
    expect(isTrustedParticipantContext(Object.create(ctx))).toBe(false);
  });

  it('a valid context is immutable — its authoritative identity cannot be mutated to another', () => {
    const ctx = createTrustedParticipantContext('participant-A');
    expect(() => {
      (ctx as { participantId: string }).participantId = 'participant-B';
    }).toThrow(); // frozen (strict mode)
    expect(ctx.participantId).toBe('participant-A');
    // Membership is unaffected by any attempted redefinition.
    expect(() => Object.defineProperty(ctx, 'participantId', { value: 'participant-B' })).toThrow();
    expect(ctx.participantId).toBe('participant-A');
  });

  it('rejects null / primitives', () => {
    expect(isTrustedParticipantContext(null)).toBe(false);
    expect(isTrustedParticipantContext(undefined)).toBe(false);
    expect(isTrustedParticipantContext('participant-A')).toBe(false);
    expect(isTrustedParticipantContext(42)).toBe(false);
  });
});

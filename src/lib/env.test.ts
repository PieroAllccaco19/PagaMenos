import { describe, expect, it } from 'vitest';

import { parsePublicEnv, parseServerEnv } from '@/lib/env';

describe('environment validation', () => {
  it('accepts a valid server environment', () => {
    const env = parseServerEnv({
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    });
    expect(env.NODE_ENV).toBe('test');
    expect(env.DATABASE_URL).toBe('postgresql://user:pass@localhost:5432/db');
  });

  it('defaults NODE_ENV and tolerates an absent DATABASE_URL in M0', () => {
    const env = parseServerEnv({});
    expect(env.NODE_ENV).toBe('development');
    expect(env.DATABASE_URL).toBeUndefined();
  });

  it('rejects a malformed DATABASE_URL', () => {
    expect(() => parseServerEnv({ NODE_ENV: 'test', DATABASE_URL: 'not-a-url' })).toThrow();
  });

  it('defaults the public app name', () => {
    expect(parsePublicEnv({}).NEXT_PUBLIC_APP_NAME).toBe('PagaMenos (validation)');
  });
});

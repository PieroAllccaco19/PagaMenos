// PagaMenos · persistence — build metadata resolution tests (§9/§34). Never touches the real env.
import { describe, expect, it } from 'vitest';

import { resolveBuildMetadata, assertValidGitSha } from './build-meta';
import { BuildProvenanceError } from './errors';

const SHA1 = '0123456789abcdef0123456789abcdef01234567'; // 40-hex
const SHA256 = 'a'.repeat(64); // 64-hex

describe('resolveBuildMetadata', () => {
  it('reads gitSha and buildId from an injected environment source', () => {
    const meta = resolveBuildMetadata({}, { GIT_SHA: SHA1, BUILD_ID: 'b-1' });
    expect(meta).toEqual({ gitSha: SHA1, buildId: 'b-1' });
  });

  it('accepts a 64-hex (SHA-256) git object id', () => {
    expect(resolveBuildMetadata({}, { GIT_SHA: SHA256 }).gitSha).toBe(SHA256);
  });

  it('honors priority order for gitSha', () => {
    const meta = resolveBuildMetadata({}, { GITHUB_SHA: 'b'.repeat(40), PAGAMENOS_GIT_SHA: SHA1 });
    expect(meta.gitSha).toBe(SHA1);
  });

  it('an explicit override wins over the environment', () => {
    const meta = resolveBuildMetadata({ gitSha: SHA1 }, { GIT_SHA: 'c'.repeat(40) });
    expect(meta.gitSha).toBe(SHA1);
  });

  it('omits buildId when neither override nor environment supplies one', () => {
    const meta = resolveBuildMetadata({}, { GIT_SHA: SHA1 });
    expect(meta).toEqual({ gitSha: SHA1 });
    expect('buildId' in meta).toBe(false);
  });

  it('fails closed when no gitSha can be resolved', () => {
    expect(() => resolveBuildMetadata({}, {})).toThrow(BuildProvenanceError);
  });

  it('rejects a placeholder / non-hex git sha (§34)', () => {
    expect(() => resolveBuildMetadata({}, { GIT_SHA: 'dev' })).toThrow(BuildProvenanceError);
    expect(() => resolveBuildMetadata({}, { GIT_SHA: 'unknown' })).toThrow(BuildProvenanceError);
    expect(() => assertValidGitSha('deadbeef')).toThrow(BuildProvenanceError); // 8-hex is too short
  });

  it('treats blank/whitespace values as absent', () => {
    expect(() => resolveBuildMetadata({}, { GIT_SHA: '   ' })).toThrow(BuildProvenanceError);
  });
});

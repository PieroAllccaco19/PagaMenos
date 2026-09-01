// PagaMenos · persistence — build metadata resolution tests (§9). Never touches the real env.
import { describe, expect, it } from 'vitest';

import { resolveBuildMetadata } from './build-meta';
import { PersistenceInvariantError } from './errors';

describe('resolveBuildMetadata', () => {
  it('reads gitSha and buildId from an injected environment source', () => {
    const meta = resolveBuildMetadata({}, { GIT_SHA: 'abc123', BUILD_ID: 'b-1' });
    expect(meta).toEqual({ gitSha: 'abc123', buildId: 'b-1' });
  });

  it('honors priority order for gitSha', () => {
    const meta = resolveBuildMetadata({}, { GITHUB_SHA: 'gh', PAGAMENOS_GIT_SHA: 'primary' });
    expect(meta.gitSha).toBe('primary');
  });

  it('an explicit override wins over the environment', () => {
    const meta = resolveBuildMetadata({ gitSha: 'override' }, { GIT_SHA: 'env' });
    expect(meta.gitSha).toBe('override');
  });

  it('omits buildId when neither override nor environment supplies one', () => {
    const meta = resolveBuildMetadata({}, { GIT_SHA: 'abc' });
    expect(meta).toEqual({ gitSha: 'abc' });
    expect('buildId' in meta).toBe(false);
  });

  it('fails closed when no gitSha can be resolved', () => {
    expect(() => resolveBuildMetadata({}, {})).toThrow(PersistenceInvariantError);
  });

  it('treats blank/whitespace values as absent', () => {
    expect(() => resolveBuildMetadata({}, { GIT_SHA: '   ' })).toThrow(PersistenceInvariantError);
  });
});

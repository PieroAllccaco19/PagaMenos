// PagaMenos · src/persistence — application build metadata at the boundary (§9).
//
// The accepted specification deliberately kept `gitSha` / `buildId` OUT of the pure engine (the
// engine must be build-free and env-free, §9). This module is where they legitimately enter: it
// reads the deployment environment ONLY at the persistence boundary (never from `src/engine`).
//
// Resolution is explicit and injectable (a plain source record, defaulting to `process.env`) so
// tests and tooling never depend on the ambient environment. `gitSha` is REQUIRED — a decision
// record must record which application build persisted it — so an unresolved gitSha fails closed
// rather than storing an empty/placeholder value. `buildId` is optional (only if the environment
// supplies one).
import { PersistenceInvariantError } from './errors';

export interface BuildMetadata {
  gitSha: string;
  buildId?: string | undefined;
}

/** Environment variables consulted for the commit SHA, in priority order. */
const GIT_SHA_KEYS = [
  'PAGAMENOS_GIT_SHA',
  'GIT_SHA',
  'GITHUB_SHA',
  'VERCEL_GIT_COMMIT_SHA',
] as const;
/** Environment variables consulted for a deployment build id, in priority order. */
const BUILD_ID_KEYS = ['PAGAMENOS_BUILD_ID', 'BUILD_ID', 'VERCEL_DEPLOYMENT_ID'] as const;

function firstNonEmpty(
  source: Record<string, string | undefined>,
  keys: readonly string[],
): string | undefined {
  for (const k of keys) {
    const v = source[k];
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  }
  return undefined;
}

/**
 * Resolve build metadata from an environment source (default `process.env`). An explicit override
 * wins over the environment. Throws `PersistenceInvariantError` when no gitSha can be determined —
 * a historical decision must never be stored without recording the build that persisted it.
 */
export function resolveBuildMetadata(
  override: Partial<BuildMetadata> = {},
  source: Record<string, string | undefined> = process.env,
): BuildMetadata {
  const gitSha =
    (typeof override.gitSha === 'string' && override.gitSha.trim().length > 0
      ? override.gitSha.trim()
      : undefined) ?? firstNonEmpty(source, GIT_SHA_KEYS);
  if (!gitSha) {
    throw new PersistenceInvariantError(
      `cannot resolve gitSha for the persistence boundary; set one of ${GIT_SHA_KEYS.join(', ')} ` +
        `or pass an explicit gitSha`,
    );
  }
  const buildId =
    (typeof override.buildId === 'string' && override.buildId.trim().length > 0
      ? override.buildId.trim()
      : undefined) ?? firstNonEmpty(source, BUILD_ID_KEYS);
  return buildId === undefined ? { gitSha } : { gitSha, buildId };
}

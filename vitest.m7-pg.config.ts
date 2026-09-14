// PagaMenos · vitest config for the M7 S02 REAL-PostgreSQL harness self-test suite.
//
// Runs ONLY `src/m7/**/*.m7-pg.test.ts`, and only when driven by `scripts/m7/pg-m7-harness.ts`, which
// boots an ephemeral cluster, provisions the M7 roles, and passes the connection context through
// M7_PG_HARNESS_CONTEXT. Without that context the suite fails to load (NOT EXECUTED), never passes.
// Kept out of the default offline `pnpm test` (see vitest.config.ts).
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/m7/**/*.m7-pg.test.ts'],
    // One ephemeral cluster with cluster-level roles is shared; run files serially so role and lock
    // observations are deterministic.
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});

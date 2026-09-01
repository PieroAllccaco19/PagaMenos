// PagaMenos · vitest config for the REAL-PostgreSQL integration suite.
//
// Runs ONLY `*.integration.test.ts`, and only when driven by `scripts/pg-integration.ts` (which
// initdb's an ephemeral cluster, applies the migration from clean, sets DATABASE_URL, and tears
// down). Kept out of the default `pnpm test` so that suite stays fully offline, exactly like CI.
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
    include: ['src/**/*.integration.test.ts'],
    // A single ephemeral database is shared; run the integration files serially to keep the DB-level
    // assertions (row counts, concurrency) deterministic.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});

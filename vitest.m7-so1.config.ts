// PagaMenos · vitest config for the M7 SO-1 REAL-PostgreSQL participant-runtime suite.
//
// Runs ONLY `src/m7/so1/**/*.m7-so1.test.ts`, and only when driven by `scripts/m7/pg-m7-so1.ts`,
// which boots an ephemeral cluster, replays the accepted migrations as the migration role, installs
// the M7 §19 normative DDL, activates the M7 SO1 RUNTIME TEST FIXTURE control plane, builds the
// A1/A2 rows through the SANCTIONED services, and passes the two M7 role credentials plus the
// expected control-plane digest through the environment. Without that environment the suite fails
// to load (NOT EXECUTED) — it never passes by default.
//
// Kept out of the default offline `pnpm test` (see vitest.config.ts), exactly like the accepted
// integration and M7 S02 harness suites.
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
    include: ['src/m7/so1/**/*.m7-so1.test.ts'],
    // One ephemeral cluster, one installed control plane and one set of A1/A2 rows are shared; run
    // serially so the row-count, replay and concurrency assertions stay deterministic.
    fileParallelism: false,
    testTimeout: 120_000, // the expired-session case sets its own 420 s timeout
    hookTimeout: 120_000,
  },
});

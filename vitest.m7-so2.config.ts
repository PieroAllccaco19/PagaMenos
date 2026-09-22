// PagaMenos · vitest config for the M7 SO-2 REAL-PostgreSQL evidence-upload-authorization suite.
//
// Runs ONLY `src/m7/so2/**/*.m7-so2.test.ts`, and only when driven by `scripts/m7/pg-m7-so2.ts`,
// which boots an ephemeral cluster, replays the accepted migrations as the migration role, installs
// the M7 §19 normative DDL, activates plane A of the M7 SO2 RUNTIME TEST FIXTURE, builds the A1/A2
// rows through the SANCTIONED services, and passes the two M7 role credentials plus the expected
// control-plane digest through the environment. Without that environment the suite fails to load
// (NOT EXECUTED) — it never passes by default.
//
// Kept out of the default offline `pnpm test` (see vitest.config.ts), exactly like the accepted
// integration, M7 S02 harness and M7 SO-1 suites.
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
    include: ['src/m7/so2/**/*.m7-so2.test.ts'],
    // One ephemeral cluster, one control plane and one set of A1/A2 rows are shared, and the suite
    // rotates that control plane A -> B -> A; run serially so row counts, replay, rotation and the
    // lock-interleaving cases stay deterministic.
    fileParallelism: false,
    sequence: { concurrent: false },
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});

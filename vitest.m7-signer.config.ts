// PagaMenos · vitest config for the M7 CAPABILITY SIGNER / TO-8 DB FOUNDATION real-PostgreSQL suite.
//
// Runs ONLY `src/m7/signer/**/*.m7-signer.test.ts`, and only when driven by `scripts/m7/pg-m7-signer.ts`,
// which boots an ephemeral cluster, replays the accepted migrations as the migration role, installs
// the M7 §19 normative DDL, activates plane A1 of the M7 SIGNER RUNTIME TEST FIXTURE, builds the A1/A2
// rows through the SANCTIONED services, and passes the M7 role credentials plus the expected
// control-plane digest through the environment. Without that environment the suite fails to load
// (NOT EXECUTED) — it never passes by default.
//
// Kept out of the default offline `pnpm test` (see vitest.config.ts), exactly like the accepted
// integration, M7 S02 harness, SO-1 and SO-2 suites.
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
    include: ['src/m7/signer/**/*.m7-signer.test.ts'],
    // One ephemeral cluster, one control plane and one set of A1/A2 rows are shared, and the suite
    // rotates that control plane A1 -> A2 -> K; run serially so mint sequences, expiry timing and the
    // lock-interleaving cases stay deterministic.
    fileParallelism: false,
    sequence: { concurrent: false },
    testTimeout: 120_000,
    hookTimeout: 180_000,
  },
});

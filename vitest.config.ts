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
    include: ['src/**/*.test.ts'],
    // Real-PostgreSQL integration tests run in a separate suite (vitest.integration.config.ts) driven
    // by an ephemeral DB; they are excluded here so the default suite stays fully offline (as CI is).
    // The M7 S02 real-PostgreSQL harness suite (vitest.m7-pg.config.ts, `pnpm m7:pg`) likewise.
    exclude: [
      '**/node_modules/**',
      '**/*.integration.test.ts',
      '**/*.m7-pg.test.ts',
      // The M7 SO-1 real-PostgreSQL runtime suite (vitest.m7-so1.config.ts, `pnpm m7:so1`) needs an
      // installed M7 control plane and the two M7 role credentials; it is driven by its own
      // orchestrator, exactly like the two suites above, so this suite stays fully offline.
      '**/*.m7-so1.test.ts',
      // The M7 SO-2 real-PostgreSQL suite (vitest.m7-so2.config.ts, `pnpm m7:so2`), likewise.
      '**/*.m7-so2.test.ts',
      // The M7 capability-signer / TO-8 real-PostgreSQL suite (vitest.m7-signer.config.ts,
      // `pnpm m7:signer`), likewise.
      '**/*.m7-signer.test.ts',
    ],
    // The boundary self-test spins up ESLint programmatically; give it room.
    testTimeout: 30_000,
  },
});

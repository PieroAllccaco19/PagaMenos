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
    exclude: ['**/node_modules/**', '**/*.integration.test.ts', '**/*.m7-pg.test.ts'],
    // The boundary self-test spins up ESLint programmatically; give it room.
    testTimeout: 30_000,
  },
});

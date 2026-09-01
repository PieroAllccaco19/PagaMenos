// PagaMenos — flat ESLint config.
// Primary purpose beyond style: mechanically enforce the architectural purity boundary
// (src/engine and src/corpus must not import db/app/analytics/sourcemon/services, Next,
// React, Prisma, or perform I/O). Enforcement is verified by src/lib/boundary.test.ts.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/** Import patterns forbidden inside the pure layers (src/engine, src/corpus). */
const FORBIDDEN_FOR_PURE_LAYER = [
  { group: ['next', 'next/*'], message: 'engine/corpus MUST NOT import Next.js.' },
  {
    group: ['react', 'react/*', 'react-dom', 'react-dom/*'],
    message: 'engine/corpus MUST NOT import React/UI.',
  },
  {
    group: ['@prisma/client', '@prisma/*', '.prisma', '.prisma/*'],
    message: 'engine/corpus MUST NOT import Prisma.',
  },
  {
    group: [
      '@/db',
      '@/db/*',
      '@/db/**',
      '@/app',
      '@/app/*',
      '@/app/**',
      '@/analytics',
      '@/analytics/*',
      '@/analytics/**',
      '@/sourcemon',
      '@/sourcemon/*',
      '@/sourcemon/**',
      '@/services',
      '@/services/*',
      '@/services/**',
      '@/persistence',
      '@/persistence/*',
      '@/persistence/**',
    ],
    message:
      'engine/corpus MUST NOT import the db/app/analytics/sourcemon/services/persistence layers.',
  },
  {
    group: ['**/db', '**/db/*', '**/analytics', '**/sourcemon', '**/services', '**/persistence'],
    message: 'engine/corpus MUST NOT reach application/DB/UI layers via relative paths.',
  },
  {
    group: [
      'fs',
      'fs/*',
      'node:fs',
      'node:fs/*',
      'net',
      'node:net',
      'http',
      'node:http',
      'https',
      'node:https',
      'child_process',
      'node:child_process',
      'crypto',
      'node:crypto',
      'os',
      'node:os',
      'process',
      'node:process',
      'dns',
      'node:dns',
      'tls',
      'node:tls',
    ],
    message:
      'engine/corpus MUST be I/O-free (no fs/net/http/child_process/os/process/crypto). ' +
      'Hashing/build metadata belong at the persistence boundary (§8/§9).',
  },
];

/**
 * The internal persistence WRITE/READ-RAW surface (P35A-02 §12–§17): the raw Prisma client, the
 * decision repository, the snapshot draft constructor, and the trusted provenance/build providers.
 * The ONLY sanctioned access is the decision-persistence implementation file
 * (`src/services/decide-and-persist.ts`); EVERYTHING else — normal app layers AND arbitrary other
 * `src/services/**` files — is blocked. Patterns catch BOTH alias (`@/db/...`, `@/persistence/...`)
 * AND relative-traversal (`../db/...`, `../../persistence/...`) specifiers (§14). Tests/fixtures are
 * exempted separately (they are infrastructure, not production application code).
 */
const FORBIDDEN_WRITE_INTERNALS = [
  {
    group: [
      '@prisma/client',
      '@prisma/*',
      '@/db',
      '@/db/*',
      '@/db/**',
      '**/db/decision-snapshot-repository',
      '**/db/client',
      '**/db/index',
    ],
    message:
      'Only src/services/decide-and-persist.ts may touch the raw Prisma client or db repository. ' +
      'Persist via decideAndPersist(); read via loadDecisionSnapshot()/replayDecisionSnapshot().',
  },
  {
    group: [
      '@/persistence/snapshot',
      '@/persistence/provenance',
      '@/persistence/build-meta',
      '**/persistence/snapshot',
      '**/persistence/provenance',
      '**/persistence/build-meta',
    ],
    message:
      'Only src/services/decide-and-persist.ts may import the snapshot draft constructor, the store ' +
      'implementation, or the provenance/build providers. Use the sanctioned service instead.',
  },
];

export default tseslint.config(
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'coverage/**',
      'dist/**',
      'next-env.d.ts',
      'prisma/generated/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Pure layers: purity boundary + no ambient I/O globals.
    files: ['src/engine/**/*.{ts,tsx}', 'src/corpus/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: FORBIDDEN_FOR_PURE_LAYER }],
      'no-restricted-globals': [
        'error',
        { name: 'process', message: 'engine/corpus MUST NOT read process/env.' },
        { name: '__dirname', message: 'engine/corpus MUST be location-independent.' },
        { name: '__filename', message: 'engine/corpus MUST be location-independent.' },
        { name: 'fetch', message: 'engine/corpus MUST be I/O-free (no network).' },
      ],
    },
  },
  {
    // Non-sanctioned application layers may not bypass the write boundary (P35A-02).
    files: [
      'src/app/**/*.{ts,tsx}',
      'src/analytics/**/*.{ts,tsx}',
      'src/sourcemon/**/*.{ts,tsx}',
      'src/lib/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': ['error', { patterns: FORBIDDEN_WRITE_INTERNALS }],
    },
  },
  {
    // P35A-02 §13: ARBITRARY services are ALSO blocked from the raw write internals — an arbitrary
    // service must not be able to import the repository/draft/providers and persist forged history.
    files: ['src/services/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: FORBIDDEN_WRITE_INTERNALS }],
    },
  },
  {
    // The ONLY sanctioned decision-persistence implementation file may reach the raw write internals.
    // load/replay live in this same file and use repository READ methods, so this one exemption
    // covers the entire sanctioned surface (§13/§17).
    files: ['src/services/decide-and-persist.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    // Test + tooling files may use Node builtins, looser typing, and the internal modules
    // (infrastructure, not production application code).
    files: ['**/*.test.ts', 'vitest.config.ts', 'vitest.integration.config.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-restricted-imports': 'off',
    },
  },
);

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
 * The internal persistence WRITE surface (P35A-02 §14/§15): the raw Prisma client, the decision
 * repository write API, the snapshot draft constructor, and the trusted provenance providers. Normal
 * application layers MUST NOT import these — the ONLY sanctioned write path is `decideAndPersist` in
 * src/services. The sanctioned service + infrastructure (scripts, tests, fixtures) are exempt by not
 * being matched by this rule's file globs.
 */
const FORBIDDEN_WRITE_INTERNALS = [
  {
    group: ['@prisma/client', '@prisma/*', '@/db', '@/db/*', '@/db/**'],
    message:
      'Normal application code MUST NOT touch the raw Prisma client or db repository. Persist via ' +
      'decideAndPersist(); read via loadDecisionSnapshot()/replayDecisionSnapshot() (src/services).',
  },
  {
    group: ['@/persistence/snapshot', '@/persistence/provenance', '@/persistence/build-meta'],
    message:
      'Normal application code MUST NOT import the snapshot draft constructor or provenance ' +
      'providers. Use the sanctioned service (src/services) instead.',
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
    // Non-sanctioned application layers may not bypass the write boundary (P35A-02). The sanctioned
    // service (src/services), the internal db layer (src/db), scripts and tests are NOT matched here.
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
    // Test + tooling files may use Node builtins and looser typing.
    files: ['**/*.test.ts', 'vitest.config.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);

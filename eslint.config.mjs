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

/**
 * The decision-persistence implementation MODULE itself (P35A-05 §19/§20): importing it directly
 * exposes the injectable `*WithDeps` surface (fake provenance/build providers). Ordinary code must use
 * the public `@/services` barrel instead. Only the barrel (`src/services/index.ts`) and tests may
 * import this deep module. The module-capability boundary test additionally covers dynamic import(),
 * relative paths and `.js`/`.ts` suffixes, which `no-restricted-imports` cannot see reliably (§11).
 */
const FORBIDDEN_DEEP_SERVICE = [
  {
    group: [
      '@/services/decide-and-persist',
      '@/services/decide-and-persist.js',
      '@/services/decide-and-persist.ts',
      '**/services/decide-and-persist',
    ],
    message:
      'Import the public @/services barrel (decideAndPersist / loadDecisionSnapshot / ' +
      'replayDecisionSnapshot). The decide-and-persist module exposes injectable deps and is off-limits.',
  },
];

const FORBIDDEN_WRITE_AND_DEEP = [...FORBIDDEN_WRITE_INTERNALS, ...FORBIDDEN_DEEP_SERVICE];

/**
 * M3.5B-A1 trusted study-administration surface (spec §11/§13): the protocol/experiment/recruitment/
 * assignment admin service modules and their aggregating barrel `@/services/study-admin`. These are
 * off-limits to participant-facing/app code and to arbitrary services; only a trusted admin entrypoint
 * (or the study-admin barrel + tests) may import them. Raw study repositories (`@/db/study-*`) are
 * already covered by the `@/db/**` write-internal patterns above. Enforcement of operation-specific
 * ownership is completed by the module-capability AST test (dynamic import / relative / suffix proof).
 */
const FORBIDDEN_STUDY_ADMIN = [
  {
    group: [
      '@/services/study-protocol-admin',
      '@/services/study-experiment-admin',
      '@/services/study-recruitment',
      '@/services/study-assignment-admin',
      '@/services/study-participant-session',
      '@/services/study-admin',
      '**/services/study-protocol-admin',
      '**/services/study-experiment-admin',
      '**/services/study-recruitment',
      '**/services/study-assignment-admin',
      '**/services/study-participant-session',
      '**/services/study-admin',
    ],
    message:
      'The trusted study-admin write capabilities (protocol/experiment/recruitment/assignment) and ' +
      'the trusted participant-session adapter are off-limits to participant-facing/app code. Reach ' +
      'them only via @/services/study-admin from a trusted entrypoint; participant-facing code uses ' +
      'the @/services barrel (consent/read).',
  },
  {
    // A1-CODE-01: the participant-context CREATION primitive submodule. Ordinary code must never
    // reach it (it would let a caller mint an authoritative context / choose participantId). Only the
    // trusted session adapter and the study barrel (unrestricted src/study) may import it.
    group: ['@/study/participant-context', '**/study/participant-context'],
    message:
      'The trusted participant-context creation primitive is off-limits. Participant-facing code uses ' +
      'isTrustedParticipantContext / the TrustedParticipantContext type from @/study; contexts are ' +
      'constructed only by the trusted session adapter (@/services/study-admin).',
  },
];

/** The sanctioned M3.5B-A1 study implementation files that may reach their own raw study repositories
 * (analogous to the decision-persistence sanctioned file). Operation-specific ownership between them is
 * enforced by the module-capability AST test, not by ESLint. */
const SANCTIONED_STUDY_IMPL_FILES = [
  'src/services/study-protocol-admin.ts',
  'src/services/study-experiment-admin.ts',
  'src/services/study-recruitment.ts',
  'src/services/study-assignment-admin.ts',
  'src/services/study-consent.ts',
  'src/services/study-analysis.ts',
  'src/services/study-participant-session.ts',
  'src/services/study-admin.ts',
];

/** M3.5B-A2: the sanctioned intent-lifecycle + decision-saga service files. Each may reach its OWN raw
 * A2 repository; operation-specific ownership is enforced by the module-capability AST test. */
const SANCTIONED_A2_IMPL_FILES = [
  'src/services/study-purchase-intent.ts',
  'src/services/study-intent-decision.ts',
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
    // Non-sanctioned application layers may not bypass the write boundary NOR the deep DI module.
    files: [
      'src/app/**/*.{ts,tsx}',
      'src/analytics/**/*.{ts,tsx}',
      'src/sourcemon/**/*.{ts,tsx}',
      'src/lib/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [...FORBIDDEN_WRITE_AND_DEEP, ...FORBIDDEN_STUDY_ADMIN] },
      ],
    },
  },
  {
    // P35A-02 §13 / P35A-05 §20: ARBITRARY services are blocked from the raw write internals AND from
    // the deep DI module — they must use the public @/services barrel. M3.5B-A1: also blocked from the
    // trusted study-admin surface (the sanctioned study impl files are exempted below).
    files: ['src/services/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [...FORBIDDEN_WRITE_AND_DEEP, ...FORBIDDEN_STUDY_ADMIN] },
      ],
    },
  },
  {
    // The public barrel re-exports the public API from the deep module — allow the deep module here,
    // but still forbid raw write internals.
    files: ['src/services/index.ts'],
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
    // The sanctioned M3.5B-A1 study implementation files may reach their OWN raw study repositories
    // (and the study-admin barrel may aggregate the admin services). Operation-specific ownership is
    // enforced mechanically by the module-capability AST test (src/lib/module-capability.test.ts).
    files: SANCTIONED_STUDY_IMPL_FILES,
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    // The sanctioned M3.5B-A2 intent-lifecycle + decision-saga services may reach their OWN raw A2
    // repositories. Operation-specific ownership is enforced by the module-capability AST test.
    files: SANCTIONED_A2_IMPL_FILES,
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

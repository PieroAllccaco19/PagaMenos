// PagaMenos · CCA FOUNDATION TEST FIXTURE — operation-specific tracked-adapter interface (§15 item 3).
//
// NOT M7. A dedicated fixture operation over TEST-ONLY tables created by the integration test inside
// its ephemeral database (cca_fixture_root / cca_fixture_child / cca_fixture_marker). It carries no
// Outcome/SavingEvidence field, retention, custody, correction, deletion or idempotency semantics.
// Types only: this is the executor's single permitted DB-reaching edge.

export interface FixtureCollectionArgs {
  readonly rootKey: string;
  readonly childKeys: readonly string[];
  /** Optional pause inside each peer lock (contention tests). */
  readonly pauseMs?: number;
}

export interface FixtureCollectionResult {
  readonly kind: 'EXISTING' | 'CREATED';
  readonly rootId: string;
}

export interface FoundationFixtureAdapter {
  /** Atomic: root/replay lock → replay re-check → root → canonically ordered children (§26–§28). */
  recordFixtureCollection(args: FixtureCollectionArgs): Promise<FixtureCollectionResult>;
  /** Relational re-proof: upstream root must belong to the locked assignment (§12.1, §14 B). */
  proveUpstreamOwnership(upstreamRootId: string): Promise<void>;
  /** Slow write used by in-flight / async-escape tests. */
  slowMarker(label: string, sleepMs: number): Promise<string>;
  /** Deliberately acquires CHILD before ROOT; the sequencer must refuse before the second lock. */
  attemptLockInversion(rootKey: string, childKey: string): Promise<void>;
}

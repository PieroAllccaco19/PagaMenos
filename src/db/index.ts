// PagaMenos · src/db — persistence layer barrel (P35A-02).
//
// Deliberately exposes NO public surface. The Prisma client and the DecisionSnapshotRepository write
// API are internal implementation details: the ONLY sanctioned way for application code to persist a
// decision is `decideAndPersist` in `src/services`, and the only sanctioned way to read one is
// `loadDecisionSnapshot` / `replayDecisionSnapshot`. The sanctioned service and infrastructure
// (scripts, tests) import the internal modules (`./client`, `./decision-snapshot-repository`)
// directly; ESLint + boundary tests forbid normal application layers from importing them.
export {};

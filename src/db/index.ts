// PagaMenos · src/db — Prisma client + repositories. The only layer permitted to persist engine
// outputs (§29). M3.5A introduces the immutable DecisionSnapshot repository.
export { prisma } from './client';
export {
  DecisionSnapshotRepository,
  decisionSnapshotRepository,
} from './decision-snapshot-repository';

// PagaMenos · CCA FOUNDATION TEST FIXTURE — fixed trusted executor (§14–§20). NOT M7.
//
// Its entire dependency closure is type-only: the input/scope contracts and its ONE adapter
// interface. It holds no Prisma, client, repository, SQL, transaction, locator or registry.
import type { LockedCollectionScope } from '@/cca/locked-scope';

import type {
  FixtureCollectionResult,
  FoundationFixtureAdapter,
} from './foundation.cca-adapter-interface';

export interface FoundationFixtureInput {
  readonly assignmentId: string;
  readonly rootKey: string;
  readonly childKeys: readonly string[];
}

export async function foundationFixtureExecutor(
  input: Readonly<FoundationFixtureInput>,
  _scope: LockedCollectionScope,
  adapter: FoundationFixtureAdapter,
): Promise<FixtureCollectionResult> {
  return adapter.recordFixtureCollection({ rootKey: input.rootKey, childKeys: input.childKeys });
}

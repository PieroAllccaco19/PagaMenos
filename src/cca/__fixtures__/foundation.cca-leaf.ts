// PagaMenos · CCA FOUNDATION TEST FIXTURE — sealed operation leaf (§6, §10). NOT M7.
//
// Exactly one module-scope definition binding: operation identity, the fixed GENERAL_COLLECTION
// policy, the input grammar, the canonical lock order, the adapter implementation and the ONE
// executor. Callers receive only `execute(trustedParticipantContext, input)`.
import { defineSealedOperation } from '@/db/cca-engine';

import { foundationFixtureAdapter, foundationFixtureLockOrder } from './foundation.cca-adapter';
import { foundationFixtureExecutor, type FoundationFixtureInput } from './foundation.cca-executor';

function parseFoundationFixtureInput(raw: unknown): FoundationFixtureInput {
  const o = raw as Record<string, unknown>;
  const keys = Object.keys(o).sort().join(',');
  if (keys !== 'assignmentId,childKeys,rootKey') throw new Error('fixture input: exact keys');
  if (typeof o.assignmentId !== 'string' || typeof o.rootKey !== 'string' || o.rootKey === '') {
    throw new Error('fixture input: assignmentId/rootKey');
  }
  if (!Array.isArray(o.childKeys) || !o.childKeys.every((k) => typeof k === 'string')) {
    throw new Error('fixture input: childKeys');
  }
  return {
    assignmentId: o.assignmentId,
    rootKey: o.rootKey,
    childKeys: o.childKeys as string[],
  };
}

export const recordFoundationFixture = defineSealedOperation({
  operationId: 'cca.fixture.foundation-collection',
  policy: 'GENERAL_COLLECTION',
  parseInput: parseFoundationFixtureInput,
  assignmentRef: (input) => input.assignmentId,
  lockOrder: foundationFixtureLockOrder,
  adapter: foundationFixtureAdapter,
  executor: foundationFixtureExecutor,
});

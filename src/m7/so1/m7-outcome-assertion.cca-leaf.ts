// PagaMenos · src/db — SO-1 sealed operation leaf: recordAuthorizedOutcomeAssertion (V1.1 §9.2).
//
// Exactly ONE module-scope definition binding: the operation identity, the FIXED Outcome-collection
// policy, the §9.3 input grammar, the canonical lock order, the tracked-adapter implementation and
// the ONE fixed executor. A business caller receives only
// `execute(trustedParticipantContext, input)`.
//
// LEAF DIRECT DB CAPABILITY = NONE. This module imports no database client, no repository, no raw
// query facility, no replay implementation and no session secret; its only `src/db` edge is the
// private M7 participant CCA engine. The pre-CCA replay of §9.5.2 is owned by that engine and is
// statically bound to the Outcome receipt lookup, so there is nothing here to select, override or
// inject — and no Evidence leaf, executor or adapter is reachable from here.
//
// NOT PUBLICLY WIRED (AUTH §30). This is an INTERNAL pre-LC-1 path: no Next.js route, no public API
// route, no UI, no client hook and no `@/services` barrel export composes it. A later composition
// step, under final runtime authority and behind the §23.6 control-plane startup gate, exposes the
// business boundary. Until then an incomplete M7 runtime cannot be accidentally deployed as
// accepted M7.
import { defineSealedOutcomeAssertionOperation } from '@/db/m7-participant-cca-engine';
import { parseOutcomeAssertionInput } from '@/m7/so1/outcome-assertion-input';

import {
  m7OutcomeAssertionAdapter,
  m7OutcomeAssertionLockOrder,
} from './m7-outcome-assertion.cca-adapter';
import { m7OutcomeAssertionExecutor } from './m7-outcome-assertion.cca-executor';

export const recordAuthorizedOutcomeAssertion = defineSealedOutcomeAssertionOperation({
  operationId: 'm7.so1.record-authorized-outcome-assertion',
  policy: 'GENERAL_COLLECTION',
  parseInput: parseOutcomeAssertionInput,
  lockOrder: m7OutcomeAssertionLockOrder,
  adapter: m7OutcomeAssertionAdapter,
  executor: m7OutcomeAssertionExecutor,
});

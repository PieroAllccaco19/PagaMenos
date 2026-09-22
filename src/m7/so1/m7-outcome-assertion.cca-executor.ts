// PagaMenos · src/db — SO-1 fixed trusted executor (CCA §14–§20).
//
// Its ENTIRE dependency closure is type-only: the SO-1 input/result contract, the CCA
// `LockedCollectionScope` contract, and its ONE adapter interface. It holds no Prisma, no client, no
// repository, no SQL, no transaction, no service locator, no registry and no constructor-injected
// database capability, and it is reachable only from its own leaf.
//
// What it does is deliberately the whole of SO-1's application logic: forward exactly the §9.3
// caller fields (RQ) to the single modeled adapter operation. It adds no control-plane fact, no
// timestamp, no participant, no assignment and no session material — those belong to the engine and
// the adapter — which is what keeps the request-hash input free of CP values (§9.5.1 RP-1).
import type { LockedCollectionScope } from '@/cca/locked-scope';
import type {
  M7OutcomeAssertionInput,
  M7OutcomeAssertionResult,
} from '@/m7/so1/outcome-assertion-input';

import type { M7OutcomeAssertionAdapter } from './m7-outcome-assertion.cca-adapter-interface';

export async function m7OutcomeAssertionExecutor(
  input: Readonly<M7OutcomeAssertionInput>,
  _scope: LockedCollectionScope,
  adapter: M7OutcomeAssertionAdapter,
): Promise<M7OutcomeAssertionResult> {
  return adapter.executeOutcomeAssertionCollection({
    purchaseIntentId: input.purchaseIntentId,
    clientCaptureKey: input.clientCaptureKey,
    idempotencyKey: input.idempotencyKey,
    assertionKind: input.assertionKind,
    supersedesAssertionId: input.supersedesAssertionId,
    statusLabel: input.statusLabel,
    occurrenceAssertion: input.occurrenceAssertion,
    merchant: input.merchant,
    eventTime: input.eventTime,
  });
}

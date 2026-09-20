// PagaMenos · src/db — PRIVATE A1 CCA engine (Amendment 01 §13, §29, §30, §33 class B, §39). INTERNAL.
//
// The single new transaction/assignment-lock owner. Reachable ONLY from sealed leaf modules
// (`*.cca-leaf.ts`) and tests (module-capability test). A leaf calls `defineSealedOperation` ONCE, at
// module scope, binding — at composition time and never per request — the operation identity, its
// fixed consent policy, its input grammar, its canonical lock order, its tracked-adapter
// implementation and its ONE trusted executor. The business caller receives only `execute`.
//
// Canonical procedure (§30), implemented literally:
//   A  validate the trusted context + operation input (snapshot, freeze, grammar) — before CCA
//      (optional leaf-defined pre-CCA replay lookup runs here: read-only, answers result|MISS, §28)
//   B  no active application transaction   ┐ DatabaseExecutionContext, BEFORE any database access
//   C  no active CCA context                ┘ (src/cca/execution-context.ts)
//   D  enter CCA context   E  open READ COMMITTED transaction (original client method)
//   F  lock ExperimentAssignment FOR UPDATE   G  re-prove participant ownership
//   H  mint LockedCollectionScope   I  sample the accepted service clock once, under the lock
//   J  read facts via the accepted reader   K/L  accepted predicate (+ AGR for OPTIONAL_EVIDENCE)
//   M  unauthorized → rollback → generic NOT_AUTHORIZED
//   N  construct the hidden tracked adapter (here, and nowhere else)
//   O  run the fixed executor(input, scope, adapter interface)
//   P–R  CLOSING, activeCount == 0, else rollback   S  commit   T  context cleared in finally
// No domain database operation precedes step N.
import { Prisma } from '@prisma/client';

import { evaluateCollectionConsent } from '@/cca/consent-evaluation';
import { CcaError } from '@/cca/errors';
import { runCcaTransaction } from '@/cca/execution-context';
import { createLockSequencer, type LockOrderPlan } from '@/cca/lock-order';
import { mintLockedCollectionScope, type LockedCollectionScope } from '@/cca/locked-scope';
import { isCollectionConsentPolicy, type CollectionConsentPolicy } from '@/cca/policy';
import { classifyPreCcaReplay, type PreCcaReplayLookup } from '@/cca/replay';
import {
  deepFreeze,
  NOT_AUTHORIZED,
  sealOperation,
  snapshotOperationInput,
  type NotAuthorized,
  type SealedOperation,
} from '@/cca/sealed-operation';
import {
  constructTrackedAdapter,
  executeUnderZeroInFlightGate,
  freezeAdapterSpec,
  type AdapterImplementation,
} from '@/cca/tracked-adapter';
import { isTrustedParticipantContext, type TrustedParticipantContext } from '@/study';

import { prisma } from './client';
import { readConsentAuthorizationFacts } from './study-support';

export interface SealedOperationDefinition<I, R, M> {
  readonly operationId: string;
  readonly policy: CollectionConsentPolicy;
  /** §9.1 operation grammar. Throws on malformed/empty material → CCA never runs. */
  readonly parseInput: (snapshot: unknown) => I;
  /** §13 step 2: the target assignment reference (honored only after lock + re-proof). */
  readonly assignmentRef: (input: Readonly<I>) => string;
  readonly lockOrder: LockOrderPlan;
  readonly adapter: AdapterImplementation<Prisma.TransactionClient, M>;
  readonly executor: (input: Readonly<I>, scope: LockedCollectionScope, adapter: M) => Promise<R>;
  readonly preCcaReplayLookup?: PreCcaReplayLookup<I, R>;
}

const DEFINITION_KEYS = new Set([
  'operationId',
  'policy',
  'parseInput',
  'assignmentRef',
  'lockOrder',
  'adapter',
  'executor',
  'preCcaReplayLookup',
]);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Private rollback signal for step M (never escapes this module). */
class NotAuthorizedRollback extends Error {}

function invalidDefinition(detail: string): CcaError {
  return new CcaError('CCA_INVALID_DEFINITION', detail);
}

/** Composition-time definition of ONE sealed operation (§6, §10, §14, §19). */
export function defineSealedOperation<I, R, M>(
  definition: SealedOperationDefinition<I, R, M>,
): SealedOperation<I, R, TrustedParticipantContext> {
  for (const key of Object.keys(definition)) {
    if (!DEFINITION_KEYS.has(key)) throw invalidDefinition(`unknown definition key ${key}`);
  }
  const { operationId, policy, parseInput, assignmentRef, lockOrder, executor } = definition;
  const lookup = definition.preCcaReplayLookup;
  if (typeof operationId !== 'string' || operationId.length === 0) {
    throw invalidDefinition('operationId');
  }
  if (!isCollectionConsentPolicy(policy)) throw invalidDefinition('policy');
  if (typeof parseInput !== 'function') throw invalidDefinition('parseInput');
  if (typeof assignmentRef !== 'function') throw invalidDefinition('assignmentRef');
  if (typeof executor !== 'function') throw invalidDefinition('executor');
  if (lookup !== undefined && typeof lookup !== 'function') {
    throw invalidDefinition('preCcaReplayLookup');
  }
  if (!Object.isFrozen(lockOrder) || !Array.isArray(lockOrder.ranks)) {
    throw invalidDefinition('lockOrder');
  }
  const adapterSpec = freezeAdapterSpec<Prisma.TransactionClient, M>(definition.adapter);

  return sealOperation<I, R, TrustedParticipantContext>(async (context, rawInput) => {
    // ── A ───────────────────────────────────────────────────────────────────────────────────────
    if (!isTrustedParticipantContext(context)) {
      throw new CcaError(
        'CCA_UNTRUSTED_PARTICIPANT_CONTEXT',
        'trusted participant context required',
      );
    }
    const snapshot = snapshotOperationInput(rawInput);
    let input: Readonly<I>;
    try {
      input = deepFreeze(parseInput(snapshot));
    } catch (cause) {
      throw new CcaError('CCA_INVALID_OPERATION_INPUT', 'operation input rejected', { cause });
    }
    if (typeof input !== 'object' || input === null) {
      throw new CcaError('CCA_INVALID_OPERATION_INPUT', 'operation grammar produced no material');
    }
    const assignmentId = assignmentRef(input);
    if (typeof assignmentId !== 'string' || !UUID.test(assignmentId)) {
      throw new CcaError('CCA_INVALID_OPERATION_INPUT', 'assignment reference is not a uuid');
    }
    if (lookup !== undefined) {
      const replay = classifyPreCcaReplay(await lookup(input));
      if (replay.hit) return replay.result;
    }

    // ── B–T ─────────────────────────────────────────────────────────────────────────────────────
    try {
      return await runCcaTransaction(
        prisma,
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
        async (rawTx, frame): Promise<R> => {
          const tx = rawTx as Prisma.TransactionClient;
          // F — the assignment lock (rank 0 of every canonical order).
          const locked = await tx.$queryRaw<Array<{ id: string; participantId: string }>>(
            Prisma.sql`SELECT "id", "participantId" FROM "experiment_assignment" WHERE "id" = ${assignmentId}::uuid FOR UPDATE`,
          );
          frame.noteLockRank(0);
          // G — ownership re-proof under the lock (missing and foreign are indistinguishable).
          if (locked.length !== 1 || locked[0]!.participantId !== context.participantId) {
            throw new CcaError('CCA_ASSIGNMENT_OWNERSHIP', 'assignment not owned by participant');
          }
          // I — accepted trusted service clock, sampled once, after the lock.
          const collectionAt = new Date();
          // H
          const scope = mintLockedCollectionScope({
            assignmentId,
            participantId: context.participantId,
            operationId,
            policy,
            collectionAt: collectionAt.toISOString(),
          });
          // J — accepted fact reader, same transaction, lock held (READ COMMITTED).
          const facts = await readConsentAuthorizationFacts(tx, assignmentId);
          // K/L — accepted predicate (+ AGR); M — refusal rolls back.
          if (!evaluateCollectionConsent(policy, facts, collectionAt)) {
            throw new NotAuthorizedRollback();
          }
          // N — the hidden tracked adapter; the executor sees only its interface.
          const handle = constructTrackedAdapter<Prisma.TransactionClient, M>(tx, adapterSpec, {
            scope,
            locks: createLockSequencer(lockOrder, frame.noteLockRank),
          });
          try {
            // O–R
            return await executeUnderZeroInFlightGate(handle, () =>
              executor(input, scope, handle.adapter as M),
            );
          } finally {
            handle.gate.finalize();
          }
        },
      );
    } catch (e) {
      if (e instanceof NotAuthorizedRollback) return NOT_AUTHORIZED as NotAuthorized;
      throw e;
    }
  });
}

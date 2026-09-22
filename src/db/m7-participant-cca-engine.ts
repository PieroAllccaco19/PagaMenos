// PagaMenos · src/db — PRIVATE M7 PARTICIPANT CCA ENGINE (V1.1 §9.4, §9.5.2; CCA §33 class B). INTERNAL.
//
// The productive M7 specialization of the private CCA engine, and the M7 participant transaction
// owner (TO-1). It does NOT replace, weaken or re-decide the accepted CCA foundation: it consumes
// `cca/execution-context`, `cca/locked-scope`, `cca/tracked-adapter`, `cca/lock-order`,
// `cca/sealed-operation`, `cca/replay`, `cca/policy` and `cca/consent-evaluation` unchanged, and the
// accepted foundation engine (`src/db/cca-engine.ts`) is untouched by this slice.
//
// ─── THE TWO CONNECTIONS (V1.1 §9.4 E / F / J) ──────────────────────────────────────────────────
// SO-1 deliberately uses two different database access purposes, and conflating them would break a
// specification rule in each direction:
//
//   A. the ACCEPTED A1/A2 APPLICATION connection (`src/db/client.ts`)
//        * read-only resolution of the target assignment from the accepted A2 purchase-intent chain;
//        * the ACCEPTED consent-fact reader (`readConsentAuthorizationFacts`).
//      It performs NO M7 participant write. §12/§18.3.1: the M7 participant role MUST NOT become an
//      A1 consent reader, there is no second consent algorithm, no copied consent SQL and no direct
//      M7 read of `study_consent_event`.
//
//   B. the HIDDEN M7 PARTICIPANT connection (built here, from M7_PARTICIPANT_DATABASE_URL,
//      authenticating as `pagamenos_m7_participant_rt`)
//        * the short pre-CCA `m7.p_lookup_outcome_receipt_v1` replay lookup;
//        * the authorized CCA transaction;
//        * `m7.p_lock_and_prove_assignment_v1` inside it;
//        * the tracked adapter's single `m7.p_record_outcome_assertion_v1` write (SO-1), or the
//          SO-2 tracked adapter's single `m7.p_begin_evidence_upload_v1` call. SO-2 has NO pre-CCA
//          lookup at all (§9.5.2): its idempotency is UNIQUE(decisionBindingId, nonce) inside the
//          function, so an exact SO-2 retry always re-enters CCA and re-evaluates current consent.
//
// WHY READING CONSENT ON THE OTHER CONNECTION IS STILL CORRECTLY SERIALIZED. The accepted foundation
// reads consent inside the same transaction that holds the assignment lock. Here the lock is held by
// the hidden transaction and the read happens on the application connection, so the argument has to
// be made explicitly:
//   1. `m7.p_lock_and_prove_assignment_v1` takes `public.experiment_assignment FOR UPDATE` and the
//      engine only samples the clock and reads consent AFTER it returns;
//   2. every accepted A1 consent write — grant AND withdrawal — takes that same assignment row
//      `FOR UPDATE` inside its own transaction (`src/db/study-consent-repository.ts`, A1 §8.10);
//   3. therefore, while this CCA transaction holds the row, no consent event can commit. A consent
//      event that committed BEFORE the lock is visible to the read; one that has not committed is
//      blocked behind the lock and serializes AFTER this collection commits or rolls back.
//   4. the write function itself re-takes the assignment lock and re-validates the session (§9.6,
//      CS-4), so the ordering does not depend on the engine alone.
// A single `findMany` is its own READ COMMITTED statement, which is what §9.4 J asks for ("its own
// READ COMMITTED connection"); opening an application transaction here is impossible by
// construction anyway — the accepted DatabaseExecutionContext refuses one while CCA is active.
//
// ─── CAPABILITY BOUNDARY (§18.3 CS-1, AUTH §10, §13, §20) ───────────────────────────────────────
// The hidden participant client is constructed ONLY here and is NEVER exported. This module exports
// exactly TWO definition entry points — `defineSealedOutcomeAssertionOperation` (SO-1) and
// `defineSealedEvidenceUploadOperation` (SO-2) — plus the name of its credential key, and therefore
// exports no `PrismaClient`, no `TransactionClient`, no `$queryRaw`/`$executeRaw`/`$transaction`, no
// raw SQL, no repository, no generic query callback and no DB facade.
//
// ─── TWO SEALED FAMILIES, NO GENERIC DISPATCH (SO-2 AUTH §9, §10) ───────────────────────────────
// Each entry point is statically bound to ONE policy, ONE input type, ONE adapter context type and
// ONE result type, and each seals its own implementation. There is no `defineM7Operation(policy,
// ...)`, no operation enum, no registry and no purpose parameter: a caller of one family cannot
// reach, select or switch into the other. The two implementations share only the module-private,
// capability-free pieces both already needed (the entry-topology preflight, the hidden client
// constructor, the assignment-reference read and the refusal mapping). The SO-1 implementation is
// unchanged by the addition of SO-2.
//
// The pre-CCA replay of §9.5.2 is implemented HERE, by this engine, statically bound to the Outcome
// receipt lookup. The leaf supplies NO replay function and receives no database capability, so
// LEAF DIRECT DB CAPABILITY = NONE holds. There is deliberately no generic `query(sql)`,
// `execute(fn)`, `runRaw(...)`, repository, transaction callback or DB port anywhere on this
// module's surface, no caller-selectable replay implementation, and no runtime registry.
import { Prisma, PrismaClient } from '@prisma/client';

import { evaluateCollectionConsent } from '@/cca/consent-evaluation';
import { CcaError } from '@/cca/errors';
import {
  installTransactionGovernance,
  readDatabaseExecutionState,
  runCcaTransaction,
} from '@/cca/execution-context';
import { createLockSequencer, type LockOrderPlan } from '@/cca/lock-order';
import { mintLockedCollectionScope, type LockedCollectionScope } from '@/cca/locked-scope';
import type { CollectionConsentPolicy } from '@/cca/policy';
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
import { expectedControlPlaneManifestDigest } from '@/m7/runtime/control-plane-digest';
import {
  disposeM7Error,
  M7IdempotencyConflictError,
  M7OperationError,
} from '@/m7/runtime/m7-errors';
import type { M7ParticipantOperationContext } from '@/m7/so1/m7-participant-operation-context';
import type {
  M7OutcomeAssertionInput,
  M7OutcomeAssertionResult,
} from '@/m7/so1/outcome-assertion-input';
import type {
  M7EvidenceUploadAuthorization,
  M7EvidenceUploadInput,
} from '@/m7/so2/evidence-upload-input';
import type { M7EvidenceUploadOperationContext } from '@/m7/so2/m7-evidence-upload-operation-context';
import { readM7ParticipantSessionSecret } from '@/services/m7-participant-session';
import { isTrustedParticipantContext, type TrustedParticipantContext } from '@/study';

import { prisma } from './client';
import { readConsentAuthorizationFacts } from './study-support';

export const M7_PARTICIPANT_DATABASE_URL_ENV = 'M7_PARTICIPANT_DATABASE_URL';

/** SO-1 is sealed to the Outcome-collection policy at composition time (V1.1 §9.2, CCA §7). */
const SO1_POLICY: CollectionConsentPolicy = 'GENERAL_COLLECTION';

/**
 * SO-2 is sealed to the SavingEvidence upload policy at composition time (V1.1 §9.2 "A1 §8.8 +
 * RT-17", AC-07, CCA §7): the general A1 predicate first, then AGR. Never GENERAL_COLLECTION, never
 * caller-selectable.
 */
const SO2_POLICY: CollectionConsentPolicy = 'OPTIONAL_EVIDENCE';

/** Private rollback signal for CCA §30 step M (never escapes this module). */
class NotAuthorizedRollback extends Error {}

/**
 * CCA §30 steps B–C as a PREFLIGHT, over the ACCEPTED DatabaseExecutionContext state
 * (`readDatabaseExecutionState`, src/cca/execution-context.ts — not a second async-context
 * implementation). Semantics and precedence are exactly those of the accepted
 * `runCcaTransaction`: an active CCA execution first (§29.1 re-entry), then any active
 * application transaction (§29, §40.1). It performs no I/O. `runCcaTransaction` keeps its own,
 * unchanged check at transaction entry; this preflight exists so that NO database-reaching work of
 * the SO-1 entry — including the pre-CCA replay, whose MATCH returns without ever reaching
 * `runCcaTransaction` — can run under a forbidden topology (AUD-M7-SO1-01).
 */
function assertCcaEntryTopology(): void {
  const state = readDatabaseExecutionState();
  if (state.ccaActive) {
    throw new CcaError('CCA_REENTRY_FORBIDDEN', 'a sealed operation is already executing');
  }
  if (state.transactionActive) {
    throw new CcaError(
      'CCA_TOP_LEVEL_TRANSACTION_REQUIRED',
      'a sealed operation must not run inside an application transaction',
    );
  }
}

function invalidDefinition(detail: string): CcaError {
  return new CcaError('CCA_INVALID_DEFINITION', detail);
}

// ---------------------------------------------------------------------------------------------------
// The hidden M7 participant client (§18.3 CS-1). MODULE-PRIVATE; NEVER EXPORTED.
// ---------------------------------------------------------------------------------------------------

let participantClient: PrismaClient | null = null;

/**
 * Built lazily and governed, so that (a) an ordinary build or offline unit test that never executes
 * a sealed M7 operation neither needs the credential nor crashes unrelated application modules, and
 * (b) `runCcaTransaction` can reach the ORIGINAL `$transaction` while every other transaction on
 * this client is registered with the accepted DatabaseExecutionContext.
 */
function participant(): PrismaClient {
  if (participantClient !== null) return participantClient;
  const url = process.env[M7_PARTICIPANT_DATABASE_URL_ENV];
  if (url === undefined || url === '') {
    throw new CcaError(
      'CCA_UNGOVERNED_CLIENT',
      `${M7_PARTICIPANT_DATABASE_URL_ENV} is not configured`,
    );
  }
  participantClient = installTransactionGovernance(new PrismaClient({ datasourceUrl: url }));
  return participantClient;
}

// ---------------------------------------------------------------------------------------------------
// A — read-only target assignment resolution on the ACCEPTED application connection (§9.4 F–H, §11)
// ---------------------------------------------------------------------------------------------------

/**
 * The assignment is DERIVED from the caller's `purchaseIntentId` through the accepted A2 chain
 * (`purchase_intent` → `purchase_intent_capture_token.assignmentId`) — never supplied by the caller,
 * never added to the input, and never trusted on its own: it is only a reference until
 * `m7.p_lock_and_prove_assignment_v1` proves ownership under the lock. A missing intent answers
 * `null`, which the caller sees as the generic refusal — the same answer as another participant's
 * intent (§19.11.0 M7008).
 */
async function resolveAssignmentReference(purchaseIntentId: string): Promise<string | null> {
  const intent = await prisma.purchaseIntent.findUnique({
    where: { id: purchaseIntentId },
    select: { captureToken: { select: { assignmentId: true } } },
  });
  return intent?.captureToken.assignmentId ?? null;
}

// ---------------------------------------------------------------------------------------------------
// The narrowly operation-specific pre-CCA replay facility (§9.5.2, CCA §28, AUTH §13)
// ---------------------------------------------------------------------------------------------------

type LookupStatus = 'NONE' | 'MATCH' | 'CONFLICT';

interface OutcomeReceiptLookupRow {
  readonly lookup_status: LookupStatus;
  readonly outcome_id: string | null;
  readonly assertion_id: string | null;
  readonly result_kind: 'RECORDED' | 'CAPTURE_ALIAS' | null;
}

/**
 * The ONLY pre-CCA lookup this engine can perform, statically bound to
 * `m7.p_lookup_outcome_receipt_v1` and to the SO-1 input type. It is a short, read-only,
 * session-validated single statement on the hidden participant connection — not a transaction it
 * keeps open, not a repository, not a generic query helper, and not selectable by any caller.
 *
 * RP-1: the DB computes the request hash from caller material ONLY, so a control-plane rotation can
 * never turn an exact replay into a conflict. The application does NOT reimplement
 * `m7.i_outcome_request_hash`; there is no second application-side request hash anywhere.
 */
async function lookupOutcomeReceipt(
  expectedManifestSha256: string,
  sessionSecret: Buffer,
  participantId: string,
  input: Readonly<M7OutcomeAssertionInput>,
): Promise<OutcomeReceiptLookupRow> {
  const merchant = input.merchant;
  const eventTime = input.eventTime;
  const rows = await participant().$queryRaw<OutcomeReceiptLookupRow[]>`
    SELECT * FROM m7.p_lookup_outcome_receipt_v1(
      ${expectedManifestSha256}::text,
      ${sessionSecret}::bytea,
      ${participantId}::uuid,
      ${input.purchaseIntentId}::uuid,
      ${input.clientCaptureKey}::text,
      ${input.idempotencyKey}::text,
      ${input.assertionKind}::m7."M7AssertionKind",
      ${input.supersedesAssertionId ?? null}::uuid,
      ${input.statusLabel ?? null}::m7."M7OutcomeStatusLabel",
      ${input.occurrenceAssertion ?? null}::m7."M7OccurrenceAssertion",
      ${merchant?.kind ?? null}::m7."M7MerchantAssertionKind",
      ${merchant !== undefined && merchant.kind === 'VOCABULARY_MERCHANT' ? merchant.merchantRef : null}::text,
      ${eventTime?.kind ?? null}::m7."M7EventTimeAssertionKind",
      ${eventTime !== undefined && eventTime.kind === 'INSTANT' ? eventTime.at : null}::text,
      ${eventTime !== undefined && eventTime.kind === 'LIMA_DATE' ? eventTime.date : null}::date)`;
  const row = rows[0];
  if (rows.length !== 1 || row === undefined) {
    throw new CcaError('CCA_REPLAY_CONTRACT_VIOLATION', 'the receipt lookup returned no row');
  }
  return row;
}

// ---------------------------------------------------------------------------------------------------
// The definition surface
// ---------------------------------------------------------------------------------------------------

export interface SealedOutcomeAssertionDefinition<M> {
  readonly operationId: string;
  /** Declared at composition time and REQUIRED to be the sealed SO-1 policy. Never a parameter. */
  readonly policy: CollectionConsentPolicy;
  /** CCA §9.1 operation grammar; throws on malformed material → CCA never runs. */
  readonly parseInput: (snapshot: unknown) => M7OutcomeAssertionInput;
  readonly lockOrder: LockOrderPlan;
  readonly adapter: AdapterImplementation<M7ParticipantOperationContext, M>;
  readonly executor: (
    input: Readonly<M7OutcomeAssertionInput>,
    scope: LockedCollectionScope,
    adapter: M,
  ) => Promise<M7OutcomeAssertionResult>;
}

const DEFINITION_KEYS = new Set([
  'operationId',
  'policy',
  'parseInput',
  'lockOrder',
  'adapter',
  'executor',
]);

/**
 * Composition-time definition of the ONE sealed M7 Outcome-assertion operation (SO-1).
 *
 * Note what is NOT in the definition, by design: no replay function (the engine owns the Outcome
 * lookup), no assignment reference function (the assignment is derived from the A2 chain, never
 * supplied), no connection, no client, no policy choice at call time, and no callback.
 */
export function defineSealedOutcomeAssertionOperation<M>(
  definition: SealedOutcomeAssertionDefinition<M>,
): SealedOperation<M7OutcomeAssertionInput, M7OutcomeAssertionResult, TrustedParticipantContext> {
  for (const key of Object.keys(definition)) {
    if (!DEFINITION_KEYS.has(key)) throw invalidDefinition(`unknown definition key ${key}`);
  }
  const { operationId, policy, parseInput, lockOrder, executor } = definition;
  if (typeof operationId !== 'string' || operationId.length === 0) {
    throw invalidDefinition('operationId');
  }
  if (policy !== SO1_POLICY) throw invalidDefinition(`SO-1 policy must be ${SO1_POLICY}`);
  if (typeof parseInput !== 'function') throw invalidDefinition('parseInput');
  if (typeof executor !== 'function') throw invalidDefinition('executor');
  if (!Object.isFrozen(lockOrder) || !Array.isArray(lockOrder.ranks)) {
    throw invalidDefinition('lockOrder');
  }
  const adapterSpec = freezeAdapterSpec<M7ParticipantOperationContext, M>(definition.adapter);

  return sealOperation<
    M7OutcomeAssertionInput,
    M7OutcomeAssertionResult,
    TrustedParticipantContext
  >(async (context, rawInput) => {
    // ── A — trusted context, immutable input, exact grammar; all BEFORE any database access ────
    if (!isTrustedParticipantContext(context)) {
      throw new CcaError(
        'CCA_UNTRUSTED_PARTICIPANT_CONTEXT',
        'trusted participant context required',
      );
    }
    const snapshot = snapshotOperationInput(rawInput);
    let input: Readonly<M7OutcomeAssertionInput>;
    try {
      input = deepFreeze(parseInput(snapshot));
    } catch (cause) {
      throw new CcaError('CCA_INVALID_OPERATION_INPUT', 'operation input rejected', { cause });
    }
    if (typeof input !== 'object' || input === null) {
      throw new CcaError('CCA_INVALID_OPERATION_INPUT', 'operation grammar produced no material');
    }

    // ── B–C — CCA ENTRY TOPOLOGY, IMMEDIATELY AFTER A AND BEFORE ANY DATABASE ACCESS ────────────
    // (AUD-M7-SO1-01). An active CCA execution or an active application transaction is refused
    // here, before the control-plane digest is read, before the session capability is read, before
    // the participant client is touched, before the pre-CCA replay and before assignment
    // resolution — so neither a missing environment value nor a missing session can mask the
    // topology fault, and an exact-replay MATCH can never return from inside an outer transaction.
    // runCcaTransaction re-checks the same state before it opens its transaction (second check).
    assertCcaEntryTopology();

    // §23.6: never caller input, fail closed, one controlled reader.
    const expectedManifestSha256 = expectedControlPlaneManifestDigest();
    // §8.2: the raw secret, obtained from the M7 session module's module-private registry against
    // the GENUINE trusted context. It is never an operation input and never a return value.
    const sessionSecret = readM7ParticipantSessionSecret(context);

    // ── §9.5.2 — pre-CCA optimistic replay, before any consent evaluation and any write ────────
    // The accepted lookup derives the assignment it needs from purchaseIntentId inside PostgreSQL,
    // so NO application-side assignment resolution happens on this path: MATCH and CONFLICT never
    // resolve an assignment at all.
    let lookup: OutcomeReceiptLookupRow;
    try {
      lookup = await lookupOutcomeReceipt(
        expectedManifestSha256,
        sessionSecret,
        context.participantId,
        input,
      );
    } catch (e) {
      return refuse(e);
    }
    if (lookup.lookup_status === 'MATCH') {
      // RS from history: return it WITHOUT evaluating current consent, WITHOUT entering the CCA
      // write transaction and WITHOUT creating any row (§9.5.2, CCA §28.1).
      if (
        lookup.outcome_id === null ||
        lookup.assertion_id === null ||
        lookup.result_kind === null
      ) {
        throw new CcaError('CCA_REPLAY_CONTRACT_VIOLATION', 'a MATCH carried no historical row');
      }
      return {
        outcomeId: lookup.outcome_id,
        assertionId: lookup.assertion_id,
        resultKind: lookup.result_kind,
        replayed: true,
      };
    }
    if (lookup.lookup_status === 'CONFLICT') {
      // The exact V1.1 idempotency conflict: same transport key, materially different RQ. It is
      // NEVER collapsed into a consent denial, and no CCA write transaction is entered.
      throw new M7IdempotencyConflictError();
    }

    // ── B–T ────────────────────────────────────────────────────────────────────────────────────
    try {
      return await runCcaTransaction(
        participant(),
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
        async (rawTx, frame): Promise<M7OutcomeAssertionResult> => {
          const tx = rawTx as Prisma.TransactionClient;
          // F–H (V1.1 §9.4) — the target assignment reference is resolved read-only from the
          // accepted A2 chain on the APPLICATION connection, only now, inside the authorized phase.
          // Absent → roll back → the generic refusal (indistinguishable from M7008).
          const assignmentId = await resolveAssignmentReference(input.purchaseIntentId);
          if (assignmentId === null) throw new NotAuthorizedRollback();
          // F–G — the M7 participant-role lock and ownership/session proof, as ONE accepted
          // function. It is deliberately NOT replaced by direct participant-role SQL against
          // public.experiment_assignment (§18.3.1 CS-4).
          //
          // `$executeRaw`, not `$queryRaw`: the accepted function RETURNS void, and the driver
          // cannot deserialize a void column. The call is a statement, not a query — it either
          // completes (assignment locked, ownership and session proved) or raises 28000 / 55000.
          await tx.$executeRaw`
              SELECT m7.p_lock_and_prove_assignment_v1(
                ${expectedManifestSha256}::text,
                ${sessionSecret}::bytea,
                ${context.participantId}::uuid,
                ${assignmentId}::uuid)`;
          frame.noteLockRank(0);
          // I — the accepted trusted service clock, sampled once, after the lock/proof.
          const collectionAt = new Date();
          // H — the proved assignment identity becomes the LockedCollectionScope assignment.
          const scope = mintLockedCollectionScope({
            assignmentId,
            participantId: context.participantId,
            operationId,
            policy,
            collectionAt: collectionAt.toISOString(),
          });
          // J — the ACCEPTED A1 reader, on the ACCEPTED application connection. Not the M7 role,
          // not an M7 function, not a second consent algorithm (§12, §18.3.1).
          const facts = await readConsentAuthorizationFacts(prisma, assignmentId);
          // K — the unchanged A1 §8.8 predicate. SO-1 is GENERAL_COLLECTION, so AGR (L) does not
          // apply. M — a refusal rolls the whole transaction back.
          if (!evaluateCollectionConsent(policy, facts, collectionAt)) {
            throw new NotAuthorizedRollback();
          }
          // N — the hidden tracked adapter, constructed here and nowhere else. The context it
          // captures is frozen and never reaches the executor or the business caller.
          const operationContext: M7ParticipantOperationContext = Object.freeze({
            tx,
            sessionSecret,
            expectedManifestSha256,
          });
          const handle = constructTrackedAdapter<M7ParticipantOperationContext, M>(
            operationContext,
            adapterSpec,
            { scope, locks: createLockSequencer(lockOrder, frame.noteLockRank) },
          );
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
      return refuse(e);
    }
  });
}

// ---------------------------------------------------------------------------------------------------
// SO-2 — beginAuthorizedEvidenceUpload (V1.1 §9.2, §9.4, §9.5.2, §10, §19.11.4)
// ---------------------------------------------------------------------------------------------------

export interface SealedEvidenceUploadDefinition<M> {
  readonly operationId: string;
  /** Declared at composition time and REQUIRED to be the sealed SO-2 policy. Never a parameter. */
  readonly policy: CollectionConsentPolicy;
  /** CCA §9.1 operation grammar; throws on malformed material → CCA never runs. */
  readonly parseInput: (snapshot: unknown) => M7EvidenceUploadInput;
  readonly lockOrder: LockOrderPlan;
  readonly adapter: AdapterImplementation<M7EvidenceUploadOperationContext, M>;
  readonly executor: (
    input: Readonly<M7EvidenceUploadInput>,
    scope: LockedCollectionScope,
    adapter: M,
  ) => Promise<M7EvidenceUploadAuthorization>;
}

/**
 * Composition-time definition of the ONE sealed M7 evidence-upload authorization operation (SO-2).
 *
 * Not in the definition, by design: no replay function and no receipt lookup (SO-2 has none —
 * §9.5.2), no assignment reference function (derived from the A2 chain inside CCA), no connection, no
 * client, no storage profile, no policy choice at call time, and no callback.
 *
 * The procedure, in the only order it can run:
 *   A    trusted context + exact immutable input (before any database access)
 *   B–C  the SAME private entry-topology preflight as SO-1 (AUD-M7-SO1-01): re-entry, then an
 *        outer application transaction — before the digest, the secret, the client, the assignment
 *        and consent
 *   E    runCcaTransaction on the hidden participant client (its own B–C check is the second check)
 *   F–H  assignment derived from purchaseIntentId, then `m7.p_lock_and_prove_assignment_v1`
 *   I    the trusted service clock, sampled ONCE, after the proof → LockedCollectionScope.collectionAt
 *   J–M  the accepted A1 reader, then the UNCHANGED `evaluateCollectionConsent(OPTIONAL_EVIDENCE, …)`
 *        — general A1 §8.8 first, AGR second; refusal → rollback → generic NOT_AUTHORIZED
 *   N–S  fixed executor → SO-2 tracked adapter → ONE `m7.p_begin_evidence_upload_v1` call → commit
 */
export function defineSealedEvidenceUploadOperation<M>(
  definition: SealedEvidenceUploadDefinition<M>,
): SealedOperation<
  M7EvidenceUploadInput,
  M7EvidenceUploadAuthorization,
  TrustedParticipantContext
> {
  for (const key of Object.keys(definition)) {
    if (!DEFINITION_KEYS.has(key)) throw invalidDefinition(`unknown definition key ${key}`);
  }
  const { operationId, policy, parseInput, lockOrder, executor } = definition;
  if (typeof operationId !== 'string' || operationId.length === 0) {
    throw invalidDefinition('operationId');
  }
  if (policy !== SO2_POLICY) throw invalidDefinition(`SO-2 policy must be ${SO2_POLICY}`);
  if (typeof parseInput !== 'function') throw invalidDefinition('parseInput');
  if (typeof executor !== 'function') throw invalidDefinition('executor');
  if (!Object.isFrozen(lockOrder) || !Array.isArray(lockOrder.ranks)) {
    throw invalidDefinition('lockOrder');
  }
  const adapterSpec = freezeAdapterSpec<M7EvidenceUploadOperationContext, M>(definition.adapter);

  return sealOperation<
    M7EvidenceUploadInput,
    M7EvidenceUploadAuthorization,
    TrustedParticipantContext
  >(async (context, rawInput) => {
    // ── A — trusted context, immutable input, exact grammar; all BEFORE any database access ────
    if (!isTrustedParticipantContext(context)) {
      throw new CcaError(
        'CCA_UNTRUSTED_PARTICIPANT_CONTEXT',
        'trusted participant context required',
      );
    }
    const snapshot = snapshotOperationInput(rawInput);
    let input: Readonly<M7EvidenceUploadInput>;
    try {
      input = deepFreeze(parseInput(snapshot));
    } catch (cause) {
      throw new CcaError('CCA_INVALID_OPERATION_INPUT', 'operation input rejected', { cause });
    }
    if (typeof input !== 'object' || input === null) {
      throw new CcaError('CCA_INVALID_OPERATION_INPUT', 'operation grammar produced no material');
    }

    // ── B–C — CCA ENTRY TOPOLOGY, IMMEDIATELY AFTER A AND BEFORE ANY DATABASE ACCESS ────────────
    // The accepted AUD-M7-SO1-01 order, inherited unchanged: nothing below — not the digest, not
    // the session capability, not the participant client, not assignment resolution, not consent —
    // can run under a forbidden topology. runCcaTransaction re-checks at transaction entry.
    assertCcaEntryTopology();

    // §23.6: never caller input, fail closed, one controlled reader.
    const expectedManifestSha256 = expectedControlPlaneManifestDigest();
    // §8.2: the raw secret, from the M7 session module's registry, against the GENUINE context.
    const sessionSecret = readM7ParticipantSessionSecret(context);

    // §9.5.2: SO-2 has NO pre-CCA replay. Every call — first attempt and exact retry alike — goes
    // straight into the CCA transaction and is evaluated against CURRENT consent.
    try {
      return await runCcaTransaction(
        participant(),
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
        async (rawTx, frame): Promise<M7EvidenceUploadAuthorization> => {
          const tx = rawTx as Prisma.TransactionClient;
          // F–H — the target assignment reference, derived read-only from the accepted A2 chain,
          // only now, inside the authorized phase. Absent → roll back → generic refusal.
          const derivedAssignmentId = await resolveAssignmentReference(input.purchaseIntentId);
          if (derivedAssignmentId === null) throw new NotAuthorizedRollback();
          // F–G — the M7 participant-role lock and ownership/session proof, as ONE accepted
          // function (void → `$executeRaw`). Raises 28000 / 55000 on failure.
          await tx.$executeRaw`
              SELECT m7.p_lock_and_prove_assignment_v1(
                ${expectedManifestSha256}::text,
                ${sessionSecret}::bytea,
                ${context.participantId}::uuid,
                ${derivedAssignmentId}::uuid)`;
          frame.noteLockRank(0);
          // I — the accepted trusted service clock, sampled ONCE, after the lock/proof. It is the
          // consent-evaluation instant AND the adapter's `p_captured_at`.
          const evidenceCollectionAt = new Date();
          // H — only the PROVED assignment becomes the LockedCollectionScope assignment.
          const scope = mintLockedCollectionScope({
            assignmentId: derivedAssignmentId,
            participantId: context.participantId,
            operationId,
            policy,
            collectionAt: evidenceCollectionAt.toISOString(),
          });
          // J — the ACCEPTED A1 reader, on the ACCEPTED application connection (§12, §18.3.1).
          const facts = await readConsentAuthorizationFacts(prisma, derivedAssignmentId);
          // K–L — the UNCHANGED accepted evaluation for the sealed OPTIONAL_EVIDENCE policy: the
          // A1 §8.8 general predicate FIRST, then AGR (RT-17). This engine never reads
          // optional-evidence consent itself and has no second AGR. M — refusal rolls back.
          if (!evaluateCollectionConsent(policy, facts, evidenceCollectionAt)) {
            throw new NotAuthorizedRollback();
          }
          // N — the hidden SO-2 tracked adapter, constructed here and nowhere else.
          const operationContext: M7EvidenceUploadOperationContext = Object.freeze({
            tx,
            sessionSecret,
            expectedManifestSha256,
          });
          const handle = constructTrackedAdapter<M7EvidenceUploadOperationContext, M>(
            operationContext,
            adapterSpec,
            { scope, locks: createLockSequencer(lockOrder, frame.noteLockRank) },
          );
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
      return refuse(e);
    }
  });
}

/**
 * §19.11.0 at the consumer boundary. CCA topology errors and already-typed M7 errors propagate
 * unchanged; every PostgreSQL failure is classified by the single accepted mapping, so an
 * authorization-shaped refusal is indistinguishable from a consent refusal and an idempotency
 * conflict is never reported as one.
 */
function refuse(e: unknown): never | NotAuthorized {
  if (e instanceof CcaError || e instanceof M7OperationError) throw e;
  const disposition = disposeM7Error(e);
  if (disposition.kind === 'NOT_AUTHORIZED') return NOT_AUTHORIZED as NotAuthorized;
  throw disposition.error;
}

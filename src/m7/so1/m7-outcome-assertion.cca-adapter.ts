// PagaMenos · src/db — SO-1 private tracked-adapter implementation (CCA §17, §21, §26; V1.1 §9.4).
//
// The ONLY capability class that touches the hidden transaction client for an authorized Outcome
// collection, and it holds it ONLY as the per-execution context the private M7 engine passes in. It
// cannot obtain a second database capability: it imports no client, no repository, no generic query
// helper and no Prisma VALUE (the Prisma types it needs arrive through a types-only module), it
// never opens a transaction, and it cannot reach another adapter, the engine, an executor or a leaf.
//
// V1.1 §9.4 "Adapter-to-function binding", implemented literally: EXACTLY ONE
// `SELECT ... m7.p_record_outcome_assertion_v1(...)` statement, passing the session secret, the
// LockedCollectionScope participant and assignment, `capturedAt`, the expected control-plane
// manifest digest and the §9.3 input fields — and nothing else. There is no second persistence
// statement, no generic transaction operation and no orderable low-level method, because the
// function is atomic and internally lock-ordered (§16.2): it re-takes the assignment lock,
// re-validates the session, re-checks the receipt and the domain identity, and creates at most one
// assertion, all inside this one call.
import { defineLockOrder } from '@/cca/lock-order';
import { requireLockedAssignment } from '@/cca/locked-scope';
import type { AdapterImplementation } from '@/cca/tracked-adapter';
import type { M7ParticipantOperationContext } from '@/m7/so1/m7-participant-operation-context';

import type { M7OutcomeAssertionAdapter } from './m7-outcome-assertion.cca-adapter-interface';

/**
 * CCA §27 requires a fixed canonical order following the implicit assignment rank. SO-1 composes no
 * lock sequence of its own: the whole lock class sequence of §16.2 (assignment, session, outcome
 * root) is taken INSIDE `m7.p_record_outcome_assertion_v1`, atomically, in the accepted order. The
 * single rank below names that atomic step; the engine-owned LockSequencer is therefore never used
 * by this adapter, which is exactly why no low-level lock method is exposed (§9.4).
 */
export const m7OutcomeAssertionLockOrder = defineLockOrder(['M7_OUTCOME_ASSERTION_ATOMIC']);

/** The exact shape `m7.p_record_outcome_assertion_v1` returns (§19.11.4). */
interface OutcomeAssertionRow {
  readonly outcome_id: string;
  readonly assertion_id: string;
  readonly result_kind: 'RECORDED' | 'CAPTURE_ALIAS';
  readonly replayed: boolean;
}

export const m7OutcomeAssertionAdapter: AdapterImplementation<
  M7ParticipantOperationContext,
  M7OutcomeAssertionAdapter
> = {
  async executeOutcomeAssertionCollection(context, { scope }, args) {
    // §12.1 / §14 B: prove this is a CCA-minted scope before any database access, and bind the
    // write to the locked assignment rather than to anything the caller supplied.
    requireLockedAssignment(scope, scope.assignmentId);

    const merchant = args.merchant;
    const eventTime = args.eventTime;
    const rows = await context.tx.$queryRaw<OutcomeAssertionRow[]>`
      SELECT * FROM m7.p_record_outcome_assertion_v1(
        ${context.expectedManifestSha256}::text,
        ${context.sessionSecret}::bytea,
        ${scope.participantId}::uuid,
        ${scope.assignmentId}::uuid,
        ${args.purchaseIntentId}::uuid,
        ${scope.collectionAt}::timestamptz,
        ${args.clientCaptureKey}::text,
        ${args.idempotencyKey}::text,
        ${args.assertionKind}::m7."M7AssertionKind",
        ${args.supersedesAssertionId ?? null}::uuid,
        ${args.statusLabel ?? null}::m7."M7OutcomeStatusLabel",
        ${args.occurrenceAssertion ?? null}::m7."M7OccurrenceAssertion",
        ${merchant?.kind ?? null}::m7."M7MerchantAssertionKind",
        ${merchant !== undefined && merchant.kind === 'VOCABULARY_MERCHANT' ? merchant.merchantRef : null}::text,
        ${eventTime?.kind ?? null}::m7."M7EventTimeAssertionKind",
        ${eventTime !== undefined && eventTime.kind === 'INSTANT' ? eventTime.at : null}::text,
        ${eventTime !== undefined && eventTime.kind === 'LIMA_DATE' ? eventTime.date : null}::date)`;

    const row = rows[0];
    if (rows.length !== 1 || row === undefined) {
      // Cannot happen for a function returning exactly one row; failing here rolls the CCA
      // transaction back rather than inventing a result (CCA §49).
      throw new Error('M7_OUTCOME_ASSERTION_NO_ROW');
    }
    return {
      outcomeId: row.outcome_id,
      assertionId: row.assertion_id,
      resultKind: row.result_kind,
      replayed: row.replayed,
    };
  },
};

// PagaMenos · src/m7/so2 — SO-2 private tracked-adapter implementation (CCA §17, §21, §26; V1.1 §9.4).
//
// The ONLY capability class that touches the hidden transaction client for an authorized evidence
// upload authorization, and it holds it ONLY as the per-execution context the private M7 engine
// passes in. It cannot obtain a second database capability: it imports no client, no repository, no
// generic query helper and no Prisma VALUE (the Prisma types it needs arrive through a types-only
// module), it never opens a transaction, and it cannot reach another adapter, the engine, an
// executor, a leaf, or anything of SO-1.
//
// V1.1 §9.4 "Adapter-to-function binding", implemented literally: EXACTLY ONE
// `SELECT * FROM m7.p_begin_evidence_upload_v1(...)` statement with EXACTLY the seven accepted
// arguments — the expected control-plane manifest digest, the session secret, the
// LockedCollectionScope participant and assignment, the caller's purchaseIntentId, `capturedAt`
// (the CCA-sampled collection instant) and the caller's clientCorrelationNonce — and nothing else.
//
// It sends NO storage fact. The active storage profile, the backend, the staging prefix, the policy,
// maxBytes, the transport and the credential profile are DATABASE AUTHORITY: the function resolves
// them (for a new intent, from the ACTIVE manifest — SI-2 / RP-4) and returns them (always from the
// intent's OWN issuance profile — RP-3). This adapter maps the eight returned columns verbatim and
// never re-derives, re-queries or overrides any of them.
//
// It performs NO object-store PUT, signs NO URL and reads NO provider credential. §11.4 places URL
// issuance AFTER SO-2 commits, in the M7 business layer, which does not exist in this slice.
import { defineLockOrder } from '@/cca/lock-order';
import { requireLockedAssignment } from '@/cca/locked-scope';
import type { AdapterImplementation } from '@/cca/tracked-adapter';
import type { M7EvidenceUploadOperationContext } from '@/m7/so2/m7-evidence-upload-operation-context';

import type { M7EvidenceUploadAdapter } from './m7-evidence-upload.cca-adapter-interface';

/**
 * CCA §27 requires a fixed canonical order following the implicit assignment rank. SO-2 composes no
 * lock sequence of its own: the whole §16.2 TO-1 sequence (assignment, session, then the class-10
 * backend liveness lock taken last, immediately before the creating INSERT) is taken INSIDE
 * `m7.p_begin_evidence_upload_v1`, atomically. The single rank below names that atomic step; the
 * engine-owned LockSequencer is never used by this adapter, which is exactly why no low-level lock
 * method is exposed (§9.4).
 */
export const m7EvidenceUploadLockOrder = defineLockOrder([
  'M7_EVIDENCE_UPLOAD_AUTHORIZATION_ATOMIC',
]);

/** The exact shape `m7.p_begin_evidence_upload_v1` returns (§19.11.4). */
interface EvidenceUploadAuthorizationRow {
  readonly upload_intent_id: string;
  readonly staging_object_key: string;
  readonly upload_expires_at: string;
  readonly max_bytes: number;
  readonly intent_state:
    | 'ISSUED'
    | 'PROCESSING'
    | 'VALIDATED'
    | 'CONSUMED'
    | 'REJECTED_CONTENT'
    | 'EXPIRED'
    | 'TERMINAL_FAILURE';
  readonly upload_transport: 'PRESIGNED_PUT' | 'SERVER_MEDIATED';
  readonly storage_profile_version: string;
  readonly credential_profile_id: string;
}

export const m7EvidenceUploadAdapter: AdapterImplementation<
  M7EvidenceUploadOperationContext,
  M7EvidenceUploadAdapter
> = {
  async executeEvidenceUploadAuthorization(context, { scope }, args) {
    // §12.1 / §14 B: prove this is a CCA-minted scope before any database access, and bind the
    // write to the locked assignment rather than to anything the caller supplied.
    requireLockedAssignment(scope, scope.assignmentId);

    const rows = await context.tx.$queryRaw<EvidenceUploadAuthorizationRow[]>`
      SELECT * FROM m7.p_begin_evidence_upload_v1(
        ${context.expectedManifestSha256}::text,
        ${context.sessionSecret}::bytea,
        ${scope.participantId}::uuid,
        ${scope.assignmentId}::uuid,
        ${args.purchaseIntentId}::uuid,
        ${scope.collectionAt}::timestamptz,
        ${args.clientCorrelationNonce}::text)`;

    const row = rows[0];
    if (rows.length !== 1 || row === undefined) {
      // Cannot happen for a function returning exactly one row; failing here rolls the CCA
      // transaction back rather than inventing a result (CCA §49).
      throw new Error('M7_EVIDENCE_UPLOAD_AUTHORIZATION_NO_ROW');
    }
    // Committed historical facts, mapped verbatim under explicit names. Nothing is recomputed.
    return Object.freeze({
      uploadIntentId: row.upload_intent_id,
      stagingObjectKey: row.staging_object_key,
      uploadExpiresAt: row.upload_expires_at,
      maxBytes: row.max_bytes,
      intentState: row.intent_state,
      uploadTransport: row.upload_transport,
      storageProfileVersion: row.storage_profile_version,
      credentialProfileId: row.credential_profile_id,
    });
  },
};

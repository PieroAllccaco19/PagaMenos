// PagaMenos · src/db — the M7 CAPABILITY SIGNER, TO-8 DATABASE FOUNDATION (V1.1 §11.7.3, §16.2.3, §18.3,
// §18.6, §19.11.7). PRE-LC-1. INTERNAL: no route, UI, barrel, SO-1/SO-2 or worker code imports it.
//
// What this module is — exactly one operation:
//
//     generationGrantId
//       → TO-8 transaction (runM7CapabilitySignerTransaction: refuses while ANY registered
//         transaction is active, registers the TO-8 frame, closes it in finally)
//       → m7.x_mint_generation_capability_v1(<expected manifest digest>, generationGrantId)
//       → PostgreSQL COMMIT
//       → only then: a frozen, verbatim copy of the committed envelope is returned.
//
// XF-12 / XC-6: the ONLY business argument is an opaque generationGrantId. No object key, prefix,
// backend, expiry, TTL, interval, operation, capability mode, enforcement, storage / signing /
// credential profile, provider credential, transaction, callback, SQL, repository or worker id is
// accepted — the database resolves every envelope component and the signing profile (XF-17) from
// immutable, locked rows. The expected manifest digest is trusted runtime state (§23.6), never an
// argument. PostgreSQL owns every lock, the post-lock clock, the epoch / PROCESSING / liveness checks,
// signing-profile resolution and grant expiry; none of it is reproduced here.
//
// XF-16 (DB half): the envelope never leaves the TO-8 callback before COMMIT succeeded — the callback
// returns the rows, the runner resolves only with the committed transaction's value, and a rollback or
// a rejected commit yields NO envelope.
//
// §18.3: this module is the SINGLE productive reader of M7_CAPABILITY_SIGNER_DATABASE_URL. Its client
// is module-private, built lazily, sealed as the TO-8 client (its own `$transaction` refuses), and
// NEVER exported: no PrismaClient, TransactionClient, $queryRaw / $executeRaw / $transaction, generic
// query, repository or DB facade leaves this module. It never imports the CCA engine (TO-8 row).
//
// ────────────────────────────────────────────────────────────────────────────────────────────────
// NOT IMPLEMENTED HERE, DELIBERATELY: provider signing. No provider SDK, no signing credential, no
// token, no presigned URL, no real provider capability. XF-16 "sign after commit" on a real provider,
// XC-7 credential routing, the signer's own production process (IMP-20) and IMP-18 remain OPEN.
// ────────────────────────────────────────────────────────────────────────────────────────────────
import { Prisma, PrismaClient } from '@prisma/client';

import {
  M7CapabilitySignerTransactionError,
  runM7CapabilitySignerTransaction,
  sealM7CapabilitySignerClient,
} from '@/cca/execution-context';
import {
  M7CapabilitySignerError,
  type M7CommittedGenerationEnvelope,
} from '@/m7/runtime/capability-signer-contract';
import { expectedControlPlaneManifestDigest } from '@/m7/runtime/control-plane-digest';
import { sqlStateOf } from '@/m7/runtime/m7-errors';

const SIGNER_DATABASE_URL_ENV = 'M7_CAPABILITY_SIGNER_DATABASE_URL';

/** A canonical 8-4-4-4-12 UUID. Anything else is refused before any database access. */
const GENERATION_GRANT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Fixed TO-8 transaction options. `timeout` exceeds the function's own `lock_timeout = '5s'` so a
 * legitimate P1/P2 wait ends in PostgreSQL's governed answer, not in a client-side abort.
 */
const TO8_TRANSACTION_OPTIONS = Object.freeze({
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
  maxWait: 5_000,
  timeout: 15_000,
});

// ---------------------------------------------------------------------------------------------------
// The module-private, sealed signer connection (§18.3). NOT EXPORTED.
// ---------------------------------------------------------------------------------------------------

let signerClient: PrismaClient | null = null;

function signer(): PrismaClient {
  if (signerClient !== null) return signerClient;
  const url = process.env[SIGNER_DATABASE_URL_ENV];
  if (url === undefined || url === '') throw new M7CapabilitySignerError('UNAVAILABLE');
  signerClient = sealM7CapabilitySignerClient(new PrismaClient({ datasourceUrl: url }));
  return signerClient;
}

/** The row exactly as `m7.x_mint_generation_capability_v1` returns it (enums as text labels). */
interface MintRow {
  capability_operation: unknown;
  canonical_object_key: unknown;
  backend_sha256: unknown;
  valid_until: unknown;
  capability_mode: unknown;
  envelope_enforcement: unknown;
  envelope_sha256: unknown;
  mint_seq: unknown;
  signing_profile_version: unknown;
  signing_credential_profile_id: unknown;
}

function text(v: unknown): string {
  if (typeof v !== 'string' || v === '') throw new M7CapabilitySignerError('UNAVAILABLE');
  return v;
}

/** A verbatim, frozen copy of the ONE committed row. Nothing is derived; a malformed row fails closed. */
function committedEnvelope(rows: readonly MintRow[]): M7CommittedGenerationEnvelope {
  const row = rows[0];
  if (rows.length !== 1 || row === undefined) throw new M7CapabilitySignerError('UNAVAILABLE');
  if (typeof row.mint_seq !== 'number' || !Number.isSafeInteger(row.mint_seq) || row.mint_seq < 1) {
    throw new M7CapabilitySignerError('UNAVAILABLE');
  }
  return Object.freeze({
    capabilityOperation: text(row.capability_operation),
    canonicalObjectKey: text(row.canonical_object_key),
    backendSha256: text(row.backend_sha256),
    validUntil: text(row.valid_until),
    capabilityMode: text(row.capability_mode),
    envelopeEnforcement: text(row.envelope_enforcement),
    envelopeSha256: text(row.envelope_sha256),
    mintSeq: row.mint_seq,
    signingProfileVersion: text(row.signing_profile_version),
    signingCredentialProfileId: text(row.signing_credential_profile_id),
  });
}

/** §19.11.0-style mapping. The two governed refusals keep their SQLSTATE; nothing else is surfaced. */
function refusalOf(e: unknown): Error {
  if (e instanceof M7CapabilitySignerTransactionError || e instanceof M7CapabilitySignerError) {
    return e;
  }
  const state = sqlStateOf(e);
  if (state === 'M7013') return new M7CapabilitySignerError('CAPABILITY_REFUSED', 'M7013');
  if (state === '55000') return new M7CapabilitySignerError('CONTROL_PLANE_MISMATCH', '55000');
  return new M7CapabilitySignerError('UNAVAILABLE');
}

/**
 * THE one operation. Mints one COMMITTED generation envelope for an opaque `generationGrantId` and
 * returns it only after the TO-8 transaction committed. Repeat calls for one grant are permitted and
 * return the identical envelope (`envelopeSha256`) with an incremented `mintSeq`.
 */
export async function mintCommittedGenerationEnvelope(
  generationGrantId: string,
): Promise<M7CommittedGenerationEnvelope> {
  // A second argument (an "options bag") is refused at runtime too, not only by the type.
  if (
    arguments.length !== 1 ||
    typeof generationGrantId !== 'string' ||
    !GENERATION_GRANT_ID.test(generationGrantId)
  ) {
    throw new M7CapabilitySignerError('INVALID_GENERATION_GRANT_ID');
  }
  const manifestSha256 = expectedControlPlaneManifestDigest();
  const rows = await runM7CapabilitySignerTransaction(
    signer(),
    TO8_TRANSACTION_OPTIONS,
    (tx) =>
      (tx as Prisma.TransactionClient).$queryRaw<
        MintRow[]
      >`SELECT m.capability_operation::text AS capability_operation, m.canonical_object_key, m.backend_sha256, m.valid_until, m.capability_mode::text AS capability_mode, m.envelope_enforcement::text AS envelope_enforcement, m.envelope_sha256, m.mint_seq, m.signing_profile_version, m.signing_credential_profile_id FROM m7.x_mint_generation_capability_v1(${manifestSha256}::text, ${generationGrantId}::uuid) AS m`,
  ).catch((e: unknown) => {
    throw refusalOf(e);
  });
  return committedEnvelope(rows);
}

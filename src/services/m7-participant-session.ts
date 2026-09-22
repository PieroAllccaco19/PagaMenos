// PagaMenos · src/services — the M7 participant-session capability module (V1.1 §8.2). SANCTIONED.
//
// This is the issuer named by §8.2: "the M7 session module (services/m7-participant-session.ts),
// invoked by the trusted session adapter immediately after A1 resolveTrustedParticipantContext
// succeeds for an authenticated request; it calls m7.s_issue_participant_session_v1 over a
// connection authenticated as pagamenos_m7_session_issuer_rt".
//
// SECURITY TOPOLOGY (the part that may not vary):
//   * the session secret is exactly 32 bytes from the OS CSPRNG (`node:crypto` randomBytes), and it
//     NEVER comes from caller input;
//   * ONLY sha256(secret) is ever sent to PostgreSQL; the raw secret is never persisted, never sent
//     to the issuance function, never serialized, never logged, never returned to an application or
//     public caller, and never placed in an error (§8.2 "Logging": the secret, its digest and
//     cookies are forbidden log fields, RT-16);
//   * in process, the raw secret lives ONLY in the module-private WeakMap below, keyed by the
//     GENUINE `TrustedParticipantContext` — the accepted A1 unforgeable registration. The WeakMap is
//     not exported, and it is never a property of the context object, so a spread, clone, JSON
//     round-trip or cast of the context carries no secret (§8.2 "Represented to the process");
//   * there is NO generic getter taking an arbitrary participantId: the only accessor requires a
//     genuine context, which participant-facing code cannot mint (A1 §12, unchanged).
//
// A1 INTEGRATION (AUTH §8): `src/services/study-participant-session.ts` is NOT modified. Its
// `resolveTrustedParticipantContext` signature and semantics are untouched and every existing caller
// is unaffected. The M7-aware composition is ADDITIVE and lives here: it obtains the genuine trusted
// context through that unchanged function FIRST, and only then issues the M7 session. Participant-
// facing code can neither mint a `TrustedParticipantContext` nor reach the raw M7 session issuer.
//
// CREDENTIAL BOUNDARY (§18.3): this module is the SINGLE productive reader of
// M7_SESSION_ISSUER_DATABASE_URL. The client it builds is module-private, built LAZILY so that an
// ordinary build or offline unit test that never issues a session neither needs the credential nor
// crashes unrelated modules, and it is NEVER exported — no PrismaClient, no TransactionClient, no
// $queryRaw/$executeRaw/$transaction and no generic query capability leaves this module.
//
// SCOPE HONESTY: RV-1..RV-5 are implemented here as §8.2 states them, and the DRAINING re-invocation
// budget is real. The full T-191 hosted-concurrency obligation is NOT claimed closed by this slice;
// it requires execution under the hosted environment that obligation names.
import { createHash, randomBytes } from 'node:crypto';

import { PrismaClient, Prisma } from '@prisma/client';

import { expectedControlPlaneManifestDigest } from '@/m7/runtime/control-plane-digest';
import type { TrustedParticipantContext } from '@/study';

import { resolveTrustedParticipantContext } from './study-participant-session';

export const M7_SESSION_ISSUER_DATABASE_URL_ENV = 'M7_SESSION_ISSUER_DATABASE_URL';

/** §19.3 `M7SessionRevocationReason`. */
export const M7_SESSION_REVOCATION_REASONS = Object.freeze([
  'LOGOUT',
  'ROTATED',
  'REAUTHENTICATION_REQUIRED',
  'ADMINISTRATIVE',
] as const);
export type M7SessionRevocationReason = (typeof M7_SESSION_REVOCATION_REASONS)[number];

/** An M7 session capability could not be established or revoked. Carries no secret and no digest. */
export class M7SessionError extends Error {
  constructor(detail: string) {
    super(`M7_SESSION: ${detail}`);
    this.name = 'M7SessionError';
  }
}

/**
 * What a trusted caller receives. Deliberately NOT the secret: the capability is represented to the
 * process by the registration below, not by a value the caller can carry, store or forward.
 */
export interface M7ParticipantSessionHandle {
  readonly trustedParticipantContext: TrustedParticipantContext;
  readonly sessionId: string;
  /** ISO-8601 from `m7.i_ts`; informational only — freshness is decided inside PostgreSQL. */
  readonly expiresAt: string;
}

export type M7SessionRevocationOutcome =
  /** RV-3: the revocation committed and no validated transaction was in flight. */
  | { readonly state: 'COMPLETE'; readonly attempts: number }
  /** RV-4: revoked, but quiescence was not observed within the budget. NEVER reported as complete. */
  | { readonly state: 'REVOKED_NOT_YET_QUIESCENT'; readonly attempts: number };

// ---------------------------------------------------------------------------------------------------
// The module-private secret registry (§8.2). NOT EXPORTED.
// ---------------------------------------------------------------------------------------------------

const secrets = new WeakMap<TrustedParticipantContext, Buffer>();

// ---------------------------------------------------------------------------------------------------
// The module-private session-issuer connection (§18.3). NOT EXPORTED.
// ---------------------------------------------------------------------------------------------------

let issuerClient: PrismaClient | null = null;

function issuer(): PrismaClient {
  if (issuerClient !== null) return issuerClient;
  const url = process.env[M7_SESSION_ISSUER_DATABASE_URL_ENV];
  if (url === undefined || url === '') {
    throw new M7SessionError(`${M7_SESSION_ISSUER_DATABASE_URL_ENV} is not configured`);
  }
  issuerClient = new PrismaClient({ datasourceUrl: url });
  return issuerClient;
}

// ---------------------------------------------------------------------------------------------------
// Issuance (§8.2)
// ---------------------------------------------------------------------------------------------------

export interface IssueM7ParticipantSessionArgs {
  /** A participant identity already authenticated by a trusted caller — never a request body. */
  readonly authenticatedParticipantId: string;
}

/**
 * The additive M7-aware trusted composition (AUTH §8). The genuine `TrustedParticipantContext` is
 * resolved FIRST, through the unchanged A1 adapter; M7 session issuance happens only after that
 * succeeds. Participant identity therefore still originates only from trusted authentication.
 */
export async function issueM7ParticipantSession(
  args: IssueM7ParticipantSessionArgs,
): Promise<M7ParticipantSessionHandle> {
  const trustedParticipantContext = resolveTrustedParticipantContext({
    authenticatedParticipantId: args.authenticatedParticipantId,
  });
  await registerM7ParticipantSession(trustedParticipantContext);
  const registered = registrationOf(trustedParticipantContext);
  return {
    trustedParticipantContext,
    sessionId: registered.sessionId,
    expiresAt: registered.expiresAt,
  };
}

interface Registration {
  readonly sessionId: string;
  readonly expiresAt: string;
}

const registrations = new WeakMap<TrustedParticipantContext, Registration>();

function registrationOf(context: TrustedParticipantContext): Registration {
  const r = registrations.get(context);
  if (r === undefined) throw new M7SessionError('no M7 session is registered for this context');
  return r;
}

/**
 * Mint 32 CSPRNG bytes, send ONLY the digest to `m7.s_issue_participant_session_v1`, and register
 * the raw secret against the genuine context for the lifetime of this request.
 */
async function registerM7ParticipantSession(context: TrustedParticipantContext): Promise<void> {
  const expectedManifestSha256 = expectedControlPlaneManifestDigest();
  const secret = randomBytes(32);
  const handleSha256 = createHash('sha256').update(secret).digest();
  let rows: Array<{ session_id: string; expires_at: string }>;
  try {
    rows = await issuer().$queryRaw<Array<{ session_id: string; expires_at: string }>>(
      Prisma.sql`SELECT * FROM m7.s_issue_participant_session_v1(${expectedManifestSha256}::text, ${context.participantId}::uuid, ${handleSha256}::bytea)`,
    );
  } catch {
    // The driver message could name the digest column or the participant; it is never surfaced.
    throw new M7SessionError('the M7 participant session could not be issued');
  }
  const row = rows[0];
  if (rows.length !== 1 || row === undefined) {
    throw new M7SessionError('the M7 participant session could not be issued');
  }
  secrets.set(context, secret);
  registrations.set(context, {
    sessionId: String(row.session_id),
    expiresAt: String(row.expires_at),
  });
}

// ---------------------------------------------------------------------------------------------------
// Revocation (§8.2 RV-1 .. RV-5)
// ---------------------------------------------------------------------------------------------------

/** RV-4: a bounded re-invocation budget. `ON CONFLICT DO NOTHING` makes every retry insert nothing. */
const DRAINING_MAX_ATTEMPTS = 8;
const DRAINING_BACKOFF_MS = [10, 20, 40, 80, 160, 320, 640] as const;

export interface RevokeM7ParticipantSessionArgs {
  readonly trustedParticipantContext: TrustedParticipantContext;
  readonly reason: M7SessionRevocationReason;
}

/**
 * RV-1: the revocation row is written first and is effective at its commit. RV-3: `QUIESCENT` means
 * the function acquired the session row `FOR UPDATE NOWAIT` in the same transaction as the committed
 * revocation. RV-4: while the function answers `DRAINING` this module re-invokes it with bounded
 * backoff and, if the budget is exhausted, reports REVOKED_NOT_YET_QUIESCENT — never COMPLETE.
 * RV-5 is a property of the accepted function, which never waits; this module adds no waiting of its
 * own beyond its own backoff between separate calls.
 */
export async function revokeM7ParticipantSession(
  args: RevokeM7ParticipantSessionArgs,
): Promise<M7SessionRevocationOutcome> {
  const expectedManifestSha256 = expectedControlPlaneManifestDigest();
  const { sessionId } = registrationOf(args.trustedParticipantContext);
  for (let attempt = 1; attempt <= DRAINING_MAX_ATTEMPTS; attempt += 1) {
    let state: string;
    try {
      const rows = await issuer().$queryRaw<Array<{ s_revoke_participant_session_v1: string }>>(
        Prisma.sql`SELECT m7.s_revoke_participant_session_v1(${expectedManifestSha256}::text, ${sessionId}::uuid, ${args.reason}::m7."M7SessionRevocationReason")`,
      );
      const row = rows[0];
      if (rows.length !== 1 || row === undefined) {
        throw new M7SessionError('the M7 participant session revocation returned no state');
      }
      state = String(row.s_revoke_participant_session_v1);
    } catch (e) {
      if (e instanceof M7SessionError) throw e;
      throw new M7SessionError('the M7 participant session could not be revoked');
    }
    if (state === 'QUIESCENT') {
      // The capability is gone from this process too, not only from the database.
      secrets.delete(args.trustedParticipantContext);
      registrations.delete(args.trustedParticipantContext);
      return { state: 'COMPLETE', attempts: attempt };
    }
    const backoff = DRAINING_BACKOFF_MS[attempt - 1];
    if (backoff !== undefined && attempt < DRAINING_MAX_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }
  // RV-4: revoked (the row is committed), but quiescence was not observed. NOT complete.
  secrets.delete(args.trustedParticipantContext);
  registrations.delete(args.trustedParticipantContext);
  return { state: 'REVOKED_NOT_YET_QUIESCENT', attempts: DRAINING_MAX_ATTEMPTS };
}

// ---------------------------------------------------------------------------------------------------
// The capability-restricted secret accessor (AUTH §20)
// ---------------------------------------------------------------------------------------------------

/**
 * INTERNAL — the private M7 participant CCA engine only, which must pass the secret to the approved
 * `m7.p_*` functions (§8.2 "Consumers"). The capability test restricts the set of modules that may
 * import this symbol to exactly that engine; there is deliberately NO overload taking a
 * participantId, so possession of a genuine `TrustedParticipantContext` is required and
 * participant-facing code — which cannot mint one — cannot obtain a secret for anybody.
 *
 * The returned Buffer is a defensive copy, so a consumer cannot mutate the registered secret.
 */
export function readM7ParticipantSessionSecret(context: TrustedParticipantContext): Buffer {
  const secret = secrets.get(context);
  if (secret === undefined) {
    throw new M7SessionError('no M7 session capability is registered for this participant context');
  }
  return Buffer.from(secret);
}

/** Whether a capability is registered. Answers a boolean only — never the secret. */
export function hasM7ParticipantSession(context: TrustedParticipantContext): boolean {
  return secrets.has(context);
}

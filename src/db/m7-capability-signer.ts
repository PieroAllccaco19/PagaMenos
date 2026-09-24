// PagaMenos · src/db — the M7 CAPABILITY SIGNER: TO-8 database foundation + PPC-1 physical provider
// capability (V1.1 §11.7.3, §16.2.3, §18.3, §18.6, §19.11.7; XF-12, XF-16, XF-17, XC-3, XC-5–XC-7).
// PRE-LC-1. INTERNAL: no route, UI, barrel, SO-1/SO-2 or worker code imports it.
//
// What this module is — exactly one exported operation:
//
//     generationGrantId
//       → the provider-credential registry is parsed (malformed / absent → refused, no DB access)
//       → mintCommittedGenerationEnvelope (MODULE-PRIVATE; the accepted TO-8 foundation, unchanged):
//           TO-8 transaction (runM7CapabilitySignerTransaction: refuses while ANY registered
//           transaction is active, registers the TO-8 frame, closes it in finally)
//           → m7.x_mint_generation_capability_v1(<expected manifest digest>, generationGrantId)
//           → PostgreSQL COMMIT → a frozen, verbatim copy of the committed envelope
//       → only then: signCommittedEnvelope — the ONLY place the provider-signing library is reached:
//           fidelity gate → exact credential for signing_credential_profile_id (no fallback) →
//           backend literal check → key transportability → expiry floored to validUntil →
//           S3-compatible SigV4 query presign (PUT, exact key) → structural self-check
//       → a redacted M7GenerationWriteCapability.
//
// XF-12 / XC-6: the ONLY business argument is an opaque generationGrantId. No object key, prefix,
// backend, expiry, TTL, interval, operation, capability mode, enforcement, storage / signing /
// credential profile, provider credential, transaction, callback, SQL, repository or worker id is
// accepted — the database resolves every envelope component and the signing profile (XF-17) from
// immutable, locked rows. The expected manifest digest is trusted runtime state (§23.6), never an
// argument. PostgreSQL owns every lock, the post-lock clock, the epoch / PROCESSING / liveness checks,
// signing-profile resolution and grant expiry; none of it is reproduced here.
//
// XF-16 / CB-23: nothing is signed until the TO-8 transaction promise has RESOLVED after COMMIT. A
// rollback, a rejected commit or an unknown commit outcome rejects that promise, and the signing step
// is never reached. No callback of any kind runs inside the TO-8 transaction.
//
// XC-7: the credential is looked up by EXACTLY the committed `signing_credential_profile_id` in a Map
// built from one strict registry — no default, fallback, prefix, wildcard, case folding or "first
// entry". A missing credential is a deployment defect: the mint stays committed (harmless, Corollary
// 4) and nothing is signed. `backendSha256` is NEVER recomputed (`i_request_hash` is not a cross-system
// identity, V1.1 §16): it is compared with the literal provisioned beside the credential.
//
// §18.3 / IMP-18 (source half): this module is the SINGLE productive reader of
// M7_CAPABILITY_SIGNER_DATABASE_URL and of M7_CAPABILITY_SIGNER_PROVIDER_CREDENTIALS, and the SINGLE
// productive importer of any provider-signing package (the reviewed allowlist:
// @aws-sdk/s3-request-presigner, @smithy/hash-node). It holds no HTTP client, performs no request,
// never logs, and exports nothing but the one operation. Its client is module-private, built lazily,
// sealed as the TO-8 client, and NEVER exported. It never imports the CCA engine (TO-8 row).
//
// ────────────────────────────────────────────────────────────────────────────────────────────────
// PPC-1 SCOPE: a provider-PROTOCOL implementation of exactly one capability kind — S3_COMPATIBLE ×
// EXACT_KEY_PRESIGNED_PUT × SIGNER_TOPOLOGY (M7-R-12 stays: envelope fidelity is held HERE, not by the
// provider). PROVIDER_IAM, EXACT_KEY_SCOPED_TOKEN and temporary/session credentials are refused.
// CANONICAL_CREATE is a CONDITIONAL create (SP-4, §11.3, Corollary 4, T-169; PPC-1 R2, AUD-M7-PPC1-01):
// `If-None-Match: *` is part of the SigV4 SIGNED-HEADER set, so no valid signature exists for a plain
// (overwriting) PUT. That is a source-level signing fact only — that a real provider enforces SP-4 is
// Family Q, NOT EXECUTED. It does NOT select or verify a real provider: Family Q, T-171b/c/d on a
// deployment, the signer's own process (IMP-20) and the credential inventory (MA-15) remain OPEN.
// ────────────────────────────────────────────────────────────────────────────────────────────────
import { S3RequestPresigner } from '@aws-sdk/s3-request-presigner';
import { Prisma, PrismaClient } from '@prisma/client';
import { Hash } from '@smithy/hash-node';

import {
  M7CapabilitySignerTransactionError,
  runM7CapabilitySignerTransaction,
  sealM7CapabilitySignerClient,
} from '@/cca/execution-context';
import {
  M7CapabilitySignerError,
  type M7CommittedGenerationEnvelope,
  type M7GenerationWriteCapability,
} from '@/m7/runtime/capability-signer-contract';
import { expectedControlPlaneManifestDigest } from '@/m7/runtime/control-plane-digest';
import { sqlStateOf } from '@/m7/runtime/m7-errors';

const SIGNER_DATABASE_URL_ENV = 'M7_CAPABILITY_SIGNER_DATABASE_URL';
const PROVIDER_CREDENTIALS_ENV = 'M7_CAPABILITY_SIGNER_PROVIDER_CREDENTIALS';

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
 * The accepted TO-8 step — MODULE-PRIVATE since PPC-1 (XC-6: one entry point). Mints one COMMITTED
 * generation envelope for an opaque `generationGrantId` and returns it only after the TO-8 transaction
 * committed. Repeat calls for one grant are permitted and return the identical envelope
 * (`envelopeSha256`) with an incremented `mintSeq`. Body unchanged from the accepted foundation.
 */
async function mintCommittedGenerationEnvelope(
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

// ───────────────────────────────────────────────────────────────────────────────────────────────────
// PPC-1 — the provider-credential registry (§18.3; XC-7). Parsed on every call, never cached, never
// exported, never logged. Strict: any defect rejects the WHOLE registry (no partial use).
// ───────────────────────────────────────────────────────────────────────────────────────────────────

/** One provisioned long-lived SigV4 signing credential and the ONE backend it may sign for. */
interface SigningCredential {
  /** The literal provisioned for this credential; compared, never recomputed. */
  readonly backendSha256: string;
  readonly protocol: 'https:';
  readonly hostname: string;
  /** Explicit non-default port, or undefined. */
  readonly port: number | undefined;
  readonly region: string;
  readonly bucket: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
}

/** The exact record shape. `sessionToken` is deliberately NOT a field: temporary credentials are out. */
const CREDENTIAL_FIELDS = [
  'accessKeyId',
  'backendSha256',
  'bucket',
  'endpoint',
  'providerClass',
  'region',
  'secretAccessKey',
] as const;

/** The DDL alphabet of `m7_storage_profile."credentialProfileId"` (V1.1 L2621). */
const CREDENTIAL_PROFILE_ID = /^[A-Za-z0-9_.:-]{1,128}$/;
/** Names that must never become registry keys, whatever the alphabet admits. */
const RESERVED_KEYS: ReadonlySet<string> = new Set(['__proto__', 'constructor', 'prototype']);
const BACKEND_SHA256 = /^sha256:[0-9a-f]{64}$/;
const REGION = /^[a-z0-9-]{1,64}$/;
const BUCKET = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;
const ACCESS_KEY_ID = /^[A-Za-z0-9]{16,128}$/;
const SECRET_ACCESS_KEY = /^[\x21-\x7e]{16,256}$/;

function credentialsUnavailable(): M7CapabilitySignerError {
  return new M7CapabilitySignerError('PROVIDER_CREDENTIALS_UNAVAILABLE');
}

function isPlainRecord(v: unknown): v is Record<string, unknown> {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    Object.getPrototypeOf(v) === Object.prototype
  );
}

function stringField(record: Record<string, unknown>, field: string, pattern: RegExp): string {
  const v = record[field];
  if (typeof v !== 'string' || !pattern.test(v)) throw credentialsUnavailable();
  return v;
}

/** `https://host[:port]` exactly — no path, query, fragment or userinfo; the canonical origin form. */
function endpointOf(v: unknown): Pick<SigningCredential, 'protocol' | 'hostname' | 'port'> {
  if (typeof v !== 'string') throw credentialsUnavailable();
  let url: URL;
  try {
    url = new URL(v);
  } catch {
    throw credentialsUnavailable();
  }
  if (
    url.protocol !== 'https:' ||
    url.username !== '' ||
    url.password !== '' ||
    url.pathname !== '/' ||
    url.search !== '' ||
    url.hash !== '' ||
    url.origin !== v ||
    url.hostname === ''
  ) {
    throw credentialsUnavailable();
  }
  return {
    protocol: 'https:',
    hostname: url.hostname,
    port: url.port === '' ? undefined : Number(url.port),
  };
}

function signingCredentialOf(v: unknown): SigningCredential {
  if (!isPlainRecord(v)) throw credentialsUnavailable();
  const fields = Object.keys(v).sort();
  if (JSON.stringify(fields) !== JSON.stringify([...CREDENTIAL_FIELDS])) {
    throw credentialsUnavailable();
  }
  if (v.providerClass !== 'S3_COMPATIBLE') throw credentialsUnavailable();
  const bucket = stringField(v, 'bucket', BUCKET);
  if (bucket.includes('..')) throw credentialsUnavailable();
  return Object.freeze({
    backendSha256: stringField(v, 'backendSha256', BACKEND_SHA256),
    ...endpointOf(v.endpoint),
    region: stringField(v, 'region', REGION),
    bucket,
    accessKeyId: stringField(v, 'accessKeyId', ACCESS_KEY_ID),
    secretAccessKey: stringField(v, 'secretAccessKey', SECRET_ACCESS_KEY),
  });
}

/**
 * The registry, keyed EXACTLY (case-sensitively) by credential profile id. Absent, unparsable or
 * malformed in any entry → PROVIDER_CREDENTIALS_UNAVAILABLE. The parser's own error text (which may
 * quote the secret) is discarded, never propagated.
 */
function providerCredentials(): ReadonlyMap<string, SigningCredential> {
  const raw = process.env[PROVIDER_CREDENTIALS_ENV];
  if (raw === undefined || raw === '') throw credentialsUnavailable();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw credentialsUnavailable();
  }
  if (!isPlainRecord(parsed)) throw credentialsUnavailable();
  const ids = Object.keys(parsed);
  if (ids.length === 0) throw credentialsUnavailable();
  const registry = new Map<string, SigningCredential>();
  for (const id of ids) {
    if (!CREDENTIAL_PROFILE_ID.test(id) || RESERVED_KEYS.has(id)) throw credentialsUnavailable();
    registry.set(id, signingCredentialOf(parsed[id]));
  }
  return registry;
}

// ───────────────────────────────────────────────────────────────────────────────────────────────────
// PPC-1 — the physical signing step. Reached ONLY from the exported operation, ONLY with the value the
// committed TO-8 transaction resolved with. The ONLY code that touches the provider-signing library.
// ───────────────────────────────────────────────────────────────────────────────────────────────────

/** SigV4 query-presign bounds (seconds). */
const MIN_EXPIRES_IN = 1;
const MAX_EXPIRES_IN = 604_800;

/** `m7.i_ts` form: `YYYY-MM-DDTHH:MM:SS.ffffffZ`. */
const VALID_UNTIL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{6})Z$/;

/**
 * A committed key is carried VERBATIM: every character must be RFC 3986 unreserved or `/` (so S3's
 * single URI encoding is the identity and no escaping or double-escaping can occur), and no segment
 * may be empty, `.` or `..` (which URL normalization would rewrite). Anything else is refused.
 */
const TRANSPORTABLE_KEY = /^[A-Za-z0-9._~-]+(\/[A-Za-z0-9._~-]+)*$/;

/** `validUntil` → epoch milliseconds, floored from microseconds; malformed or non-round-trip → null. */
function validUntilMillis(validUntil: string): number | null {
  const m = VALID_UNTIL.exec(validUntil);
  if (m === null) return null;
  const [, y, mo, d, h, mi, s, us] = m;
  const ms = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s));
  if (!Number.isFinite(ms)) return null;
  if (new Date(ms).toISOString().slice(0, 19) !== validUntil.slice(0, 19)) return null;
  return ms + Math.floor(Number(us) / 1000);
}

/** RFC 3986 strict percent-encoding (SigV4 `UriEncode`) of one query component. */
function encodeQueryComponent(v: string): string {
  return encodeURIComponent(v).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/** `YYYYMMDDTHHMMSSZ` of a whole-second instant. */
function amzDate(ms: number): string {
  return new Date(ms)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

const REDACTED = '[M7_GENERATION_WRITE_CAPABILITY_V1 redacted]';

/**
 * SP-4 / §11.3 / Corollary 4 / T-169: the ONE request header the capability REQUIRES. It is signed (it is
 * in `X-Amz-SignedHeaders`), so omitting it or changing its value invalidates the signature. Frozen and
 * shared; it is information for the authorized consumer, never a caller-selectable option.
 */
const REQUIRED_HEADERS: Readonly<{ 'if-none-match': '*' }> = Object.freeze({
  'if-none-match': '*',
} as const);

/** The redacted capability. `url` lives in a private field behind a deliberate accessor. */
class GenerationWriteCapability implements M7GenerationWriteCapability {
  readonly kind = 'M7_GENERATION_WRITE_CAPABILITY_V1' as const;
  readonly method = 'PUT' as const;
  readonly requiredHeaders = REQUIRED_HEADERS;
  readonly #url: string;

  constructor(
    url: string,
    readonly expiresAt: string,
    readonly mintSeq: number,
  ) {
    this.#url = url;
    Object.freeze(this);
  }

  get url(): string {
    return this.#url;
  }

  toJSON(): { kind: 'M7_GENERATION_WRITE_CAPABILITY_V1'; redacted: true } {
    return { kind: this.kind, redacted: true };
  }

  toString(): string {
    return REDACTED;
  }

  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return REDACTED;
  }
}
Object.freeze(GenerationWriteCapability.prototype);

/**
 * Translates ONE committed envelope into ONE physical capability — or refuses. Never widens: the
 * method is PUT, the create is CONDITIONAL (`If-None-Match: *`, signed), the path is
 * `/<bucket>/<canonicalObjectKey>` verbatim, the credential is exactly the
 * returned profile's, and `X-Amz-Date + X-Amz-Expires <= validUntil` by construction.
 */
async function signCommittedEnvelope(
  envelope: M7CommittedGenerationEnvelope,
  credentials: ReadonlyMap<string, SigningCredential>,
): Promise<M7GenerationWriteCapability> {
  // Fidelity gate: exactly the one kind PPC-1 implements.
  if (
    envelope.capabilityOperation !== 'CANONICAL_CREATE' ||
    envelope.capabilityMode !== 'EXACT_KEY_PRESIGNED_PUT' ||
    envelope.envelopeEnforcement !== 'SIGNER_TOPOLOGY'
  ) {
    throw new M7CapabilitySignerError('UNSUPPORTED_CAPABILITY_KIND');
  }
  // XC-7: exactly the committed identifier; no fallback of any kind.
  const credential = credentials.get(envelope.signingCredentialProfileId);
  if (credential === undefined) throw new M7CapabilitySignerError('SIGNING_CREDENTIAL_MISSING');
  if (credential.backendSha256 !== envelope.backendSha256) {
    throw new M7CapabilitySignerError('SIGNING_CREDENTIAL_BACKEND_MISMATCH');
  }
  const key = envelope.canonicalObjectKey;
  if (
    key.length > 1024 ||
    !TRANSPORTABLE_KEY.test(key) ||
    key.split('/').some((segment) => segment === '.' || segment === '..')
  ) {
    throw new M7CapabilitySignerError('CANONICAL_KEY_NOT_TRANSPORTABLE');
  }

  // Expiry: floored, never rounded or clamped upward.
  const validUntil = validUntilMillis(envelope.validUntil);
  const now = Date.now();
  const signingMillis = now - (now % 1000);
  const expiresIn =
    validUntil === null ? Number.NaN : Math.floor((validUntil - signingMillis) / 1000);
  if (
    validUntil === null ||
    !Number.isSafeInteger(expiresIn) ||
    expiresIn < MIN_EXPIRES_IN ||
    expiresIn > MAX_EXPIRES_IN ||
    signingMillis + expiresIn * 1000 > validUntil
  ) {
    throw new M7CapabilitySignerError('SIGNING_WINDOW_INVALID');
  }

  const host =
    credential.port === undefined
      ? credential.hostname
      : `${credential.hostname}:${credential.port}`;
  const path = `/${credential.bucket}/${key}`;
  // The ONE presign call site. The presigner is constructed with EXPLICIT static credentials and
  // region — no credential/region provider chain, no environment, no shared config — and no HTTP
  // client exists anywhere in this module. Any library error is replaced, never propagated.
  const signed = await (async () =>
    new S3RequestPresigner({
      credentials: {
        accessKeyId: credential.accessKeyId,
        secretAccessKey: credential.secretAccessKey,
      },
      region: credential.region,
      service: 's3',
      sha256: Hash.bind(null, 'sha256'),
      uriEscapePath: false,
      applyChecksum: false,
    }).presign(
      {
        method: 'PUT',
        protocol: credential.protocol,
        hostname: credential.hostname,
        ...(credential.port === undefined ? {} : { port: credential.port }),
        path,
        query: {},
        // SP-4 / T-169: the conditional create is SIGNED (a plain overwrite PUT does not verify).
        headers: { host, 'if-none-match': '*' },
      },
      { signingDate: new Date(signingMillis), expiresIn },
    ))().catch(() => {
    throw new M7CapabilitySignerError('SIGNING_FAILED');
  });

  // Structural self-check: the library's output is exactly the envelope, or nothing is returned.
  const query = signed.query ?? {};
  const date = amzDate(signingMillis);
  const expectedQuery: Readonly<Record<string, string>> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Content-Sha256': 'UNSIGNED-PAYLOAD',
    'X-Amz-Credential': `${credential.accessKeyId}/${date.slice(0, 8)}/${credential.region}/s3/aws4_request`,
    'X-Amz-Date': date,
    'X-Amz-Expires': String(expiresIn),
    'X-Amz-SignedHeaders': 'host;if-none-match',
  };
  const signature = query['X-Amz-Signature'];
  if (
    signed.method !== 'PUT' ||
    signed.protocol !== credential.protocol ||
    signed.hostname !== credential.hostname ||
    signed.port !== credential.port ||
    signed.path !== path ||
    JSON.stringify(Object.keys(signed.headers).sort()) !==
      JSON.stringify(['host', 'if-none-match']) ||
    signed.headers.host !== host ||
    signed.headers['if-none-match'] !== REQUIRED_HEADERS['if-none-match'] ||
    JSON.stringify(Object.keys(query).sort()) !==
      JSON.stringify([...Object.keys(expectedQuery), 'X-Amz-Signature'].sort()) ||
    Object.entries(expectedQuery).some(([k, v]) => query[k] !== v) ||
    typeof signature !== 'string' ||
    !/^[0-9a-f]{64}$/.test(signature)
  ) {
    throw new M7CapabilitySignerError('SIGNING_FAILED');
  }
  const search = Object.keys(query)
    .sort()
    .map((k) => `${encodeQueryComponent(k)}=${encodeQueryComponent(String(query[k]))}`)
    .join('&');
  const url = `${credential.protocol}//${host}${path}?${search}`;
  const reparsed = new URL(url);
  if (reparsed.host !== host || reparsed.pathname !== path || reparsed.search !== `?${search}`) {
    throw new M7CapabilitySignerError('SIGNING_FAILED');
  }
  const expiresAt = new Date(signingMillis + expiresIn * 1000).toISOString();
  return new GenerationWriteCapability(url, expiresAt, envelope.mintSeq);
}

/**
 * THE one operation (XC-6). Mints one COMMITTED generation envelope for an opaque
 * `generationGrantId` and, only after the TO-8 transaction committed, signs exactly that envelope
 * with exactly the credential PostgreSQL named. Repeat calls for one grant are permitted: each appends
 * a new committed mint with the identical envelope and yields a fresh capability for the same key,
 * never a later expiry.
 */
export async function issueGenerationWriteCapability(
  generationGrantId: string,
): Promise<M7GenerationWriteCapability> {
  if (
    arguments.length !== 1 ||
    typeof generationGrantId !== 'string' ||
    !GENERATION_GRANT_ID.test(generationGrantId)
  ) {
    throw new M7CapabilitySignerError('INVALID_GENERATION_GRANT_ID');
  }
  const credentials = providerCredentials();
  const envelope = await mintCommittedGenerationEnvelope(generationGrantId);
  return signCommittedEnvelope(envelope, credentials);
}

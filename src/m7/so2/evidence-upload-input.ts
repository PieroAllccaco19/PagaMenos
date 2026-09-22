// PagaMenos · src/m7/so2 — the exact SO-2 caller input grammar and internal result (V1.1 §9.3, §9.5).
//
// PURE. No database, no clock, no environment, no capability. This module is the COMPLETE definition
// of SO-2 *caller request material* (RQ, §9.5.1): exactly the two §9.3 SO-2 rows, and no other key.
// It is applied by the sealed leaf BEFORE CCA runs (CCA §9.1), so malformed material never reaches
// the consent boundary or the database.
//
// Every lexical rule here is DERIVED from the accepted bytes and none is invented:
//   purchaseIntentId         §9.3 "UUID"
//   clientCorrelationNonce   §9.3 "22–128 chars [A-Za-z0-9_-]", m7_evidence_upload_intent_nonce_ck and
//                            the p_begin_evidence_upload_v1 guard: ^[A-Za-z0-9_-]{22,128}$
//
// ─── THE NONCE ENTROPY CLAIM, STATED HONESTLY ───────────────────────────────────────────────────
// §9.3 also says "≥ 128 bits entropy (A2 §14.1 pattern)". That is a property of how the CLIENT
// GENERATED the value, and no parser can prove it by inspecting a string: a 22-character string of
// the right alphabet is equally well a CSPRNG draw or a constant. This module therefore enforces the
// exact LEXICAL contract only, does NOT run any statistical "entropy check", and does NOT claim that
// passing it proves 128 bits of entropy. CSPRNG generation remains a caller/client contract, and
// because this slice has no public client wiring it is DEFERRED to the future business/client
// composition boundary (NONCE_ENTROPY_STATUS below).
//
// §9.3 "Forbidden in every input" is enforced STRUCTURALLY: the key set is CLOSED, so participantId,
// assignmentId, sessionSecret, capturedAt, manifest/policy/media/retention versions, storage and
// credential profile, backend, staging key, transport, expiry, maxBytes, installation, policy,
// operation id, executor, callback, transaction, object key, provider credential and signed URL are
// all rejected by construction.

/** §9.3 SO-2: the complete, closed set of caller keys. Nothing else is accepted. */
export const SO2_INPUT_KEYS = Object.freeze([
  'purchaseIntentId',
  'clientCorrelationNonce',
] as const);

export type So2InputKey = (typeof SO2_INPUT_KEYS)[number];

/** What the SO-2 grammar can and cannot establish about the nonce (AUTH §7). */
export const NONCE_ENTROPY_STATUS = Object.freeze({
  lexicalContract: '^[A-Za-z0-9_-]{22,128}$',
  lexicalContractEnforced: true,
  entropyProvableByParser: false,
  clientCsprngGeneration: 'DEFERRED_TO_BUSINESS_CLIENT_COMPOSITION_BOUNDARY',
} as const);

export interface M7EvidenceUploadInput {
  readonly purchaseIntentId: string;
  readonly clientCorrelationNonce: string;
}

/** §19.3 M7UploadIntentState, as p_begin_evidence_upload_v1 may report it. */
export type M7UploadIntentState =
  | 'ISSUED'
  | 'PROCESSING'
  | 'VALIDATED'
  | 'CONSUMED'
  | 'REJECTED_CONTENT'
  | 'EXPIRED'
  | 'TERMINAL_FAILURE';

/** §19.3 M7UploadTransport. */
export type M7UploadTransport = 'PRESIGNED_PUT' | 'SERVER_MEDIATED';

/**
 * The committed SO-2 authorization material (RS, §9.5.1 / RP-3), read from the intent row and from
 * the intent's OWN issuance profile by `m7.p_begin_evidence_upload_v1`, never recomputed from the
 * active manifest. INTERNAL ONLY: this is not a participant-facing response, it is never logged,
 * and it is consumed by a later M7 business/storage composition layer (§11.4) — which does not
 * exist in this slice. It is NOT a signed URL and grants no upload by itself.
 */
export interface M7EvidenceUploadAuthorization {
  readonly uploadIntentId: string;
  readonly stagingObjectKey: string;
  /** `m7.i_ts(uploadExpiresAt)`: the canonical text instant the database returned. */
  readonly uploadExpiresAt: string;
  readonly maxBytes: number;
  readonly intentState: M7UploadIntentState;
  readonly uploadTransport: M7UploadTransport;
  readonly storageProfileVersion: string;
  readonly credentialProfileId: string;
}

/** Malformed SO-2 caller material. Carries no consent material and no database text. */
export class M7EvidenceUploadInputError extends Error {
  constructor(
    readonly field: string,
    detail: string,
  ) {
    super(`M7_SO2_INVALID_INPUT: ${field}: ${detail}`);
    this.name = 'M7EvidenceUploadInputError';
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CORRELATION_NONCE = /^[A-Za-z0-9_-]{22,128}$/;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const proto = Object.getPrototypeOf(v) as unknown;
  return proto === Object.prototype || proto === null;
}

function requireString(raw: Record<string, unknown>, field: So2InputKey): string {
  const v = raw[field];
  if (typeof v !== 'string') throw new M7EvidenceUploadInputError(field, 'must be a string');
  return v;
}

/**
 * §9.3 SO-2, fail closed. Returns a NEW object carrying exactly the two accepted fields; the caller's
 * object is never retained.
 */
export function parseEvidenceUploadInput(raw: unknown): M7EvidenceUploadInput {
  if (!isPlainObject(raw)) {
    throw new M7EvidenceUploadInputError('(input)', 'must be a plain object');
  }
  const allowed: ReadonlySet<string> = new Set(SO2_INPUT_KEYS);
  for (const k of Reflect.ownKeys(raw)) {
    if (typeof k !== 'string' || !allowed.has(k)) {
      throw new M7EvidenceUploadInputError(String(k), 'unknown key');
    }
  }
  const purchaseIntentId = requireString(raw, 'purchaseIntentId');
  if (!UUID.test(purchaseIntentId)) {
    throw new M7EvidenceUploadInputError('purchaseIntentId', 'must be a UUID');
  }
  const clientCorrelationNonce = requireString(raw, 'clientCorrelationNonce');
  if (!CORRELATION_NONCE.test(clientCorrelationNonce)) {
    throw new M7EvidenceUploadInputError(
      'clientCorrelationNonce',
      'must be 22–128 characters of [A-Za-z0-9_-]',
    );
  }
  return { purchaseIntentId, clientCorrelationNonce };
}

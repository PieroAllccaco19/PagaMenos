// PagaMenos · src/m7/so1 — the exact SO-1 caller input grammar (V1.1 §9.3, §6.4, §13.4, §13.5).
//
// PURE. No database, no clock, no environment, no capability. This module is the COMPLETE
// definition of SO-1 *caller request material* (RQ, §9.5.1) and nothing more: every field below is
// a §9.3 row, and no other key may appear. It is applied by the sealed leaf BEFORE CCA runs
// (CCA §9.1), so malformed material never reaches the consent boundary or the database.
//
// Every lexical rule here is DERIVED from the accepted bytes — the §9.3 table read together with
// the normative SQL of §19.7 / §19.11.4 — and none is invented:
//   clientCaptureKey / idempotencyKey   m7_outcome_assertion_capture_ck and the p_* guard:
//                                       ^[A-Za-z0-9_-]{16,128}$
//   merchantRef                         m7_merchant_vocabulary_entry_ref_ck:
//                                       ^[A-Za-z0-9_.:-]{1,128}$
//   eventTime INSTANT at                the p_* guard, verbatim (RFC 3339, explicit offset,
//                                       at most 6 fractional digits)
//   statusLabel                         the five §6.4 participant-assertable labels
//   kind / supersedes pairing           m7_outcome_assertion_kind_ck:
//                                       (assertionKind = ORIGINAL) = (supersedesAssertionId IS NULL)
//   RETRACTION carries no payload;      m7_outcome_assertion_content_ck, both branches — including
//   ORIGINAL / CORRECTION carry all of  the coupling "occurrence NONE implies merchant
//   statusLabel, occurrenceAssertion,   NOT_ASSERTED and eventTime NOT_ASSERTED"
//   merchant and eventTime
//
// §9.3 "Forbidden in every input" is enforced STRUCTURALLY rather than by a deny-list: the key set
// is CLOSED, so participantId, assignmentId, session secret, capturedAt, manifest / vocabulary /
// policy version, storage profile, backend, lease epoch, object key, digest, policy, operation id,
// executor, callback and transaction are rejected by construction.

/** §9.3 SO-1: the complete, closed set of caller keys. Nothing else is accepted. */
export const SO1_INPUT_KEYS = Object.freeze([
  'purchaseIntentId',
  'clientCaptureKey',
  'idempotencyKey',
  'assertionKind',
  'supersedesAssertionId',
  'statusLabel',
  'occurrenceAssertion',
  'merchant',
  'eventTime',
] as const);

export type So1InputKey = (typeof SO1_INPUT_KEYS)[number];

export const M7_ASSERTION_KINDS = Object.freeze(['ORIGINAL', 'CORRECTION', 'RETRACTION'] as const);
export type M7AssertionKind = (typeof M7_ASSERTION_KINDS)[number];

/** §6.4: the five labels a participant can assert. */
export const M7_OUTCOME_STATUS_LABELS = Object.freeze([
  'INTENDED',
  'ATTEMPTED',
  'SELF_REPORTED',
  'FAILED',
  'ABANDONED',
] as const);
export type M7OutcomeStatusLabel = (typeof M7_OUTCOME_STATUS_LABELS)[number];

export const M7_OCCURRENCE_ASSERTIONS = Object.freeze([
  'NONE',
  'ATTEMPTED_PURCHASE',
  'REALIZED_PURCHASE',
] as const);
export type M7OccurrenceAssertion = (typeof M7_OCCURRENCE_ASSERTIONS)[number];

/** §13.4 — a merchant assertion without a fixed merchant universe. */
export type M7MerchantAssertion =
  | { readonly kind: 'NOT_ASSERTED' }
  | { readonly kind: 'VOCABULARY_MERCHANT'; readonly merchantRef: string }
  | { readonly kind: 'UNLISTED_MERCHANT' };

/** §13.5 — the participant-asserted event time, the ONLY timestamp a caller may supply. */
export type M7EventTimeAssertion =
  | { readonly kind: 'NOT_ASSERTED' }
  | { readonly kind: 'INSTANT'; readonly at: string }
  | { readonly kind: 'LIMA_DATE'; readonly date: string };

export interface M7OutcomeAssertionInput {
  readonly purchaseIntentId: string;
  readonly clientCaptureKey: string;
  readonly idempotencyKey: string;
  readonly assertionKind: M7AssertionKind;
  /** Present iff assertionKind is not ORIGINAL. */
  readonly supersedesAssertionId?: string | undefined;
  /** Present iff assertionKind is not RETRACTION. */
  readonly statusLabel?: M7OutcomeStatusLabel | undefined;
  /** Present iff assertionKind is not RETRACTION. */
  readonly occurrenceAssertion?: M7OccurrenceAssertion | undefined;
  /** Present iff assertionKind is not RETRACTION. */
  readonly merchant?: M7MerchantAssertion | undefined;
  /** Present iff assertionKind is not RETRACTION. */
  readonly eventTime?: M7EventTimeAssertion | undefined;
}

/** §19.7 M7OutcomeResultKind. */
export type M7OutcomeResultKind = 'RECORDED' | 'CAPTURE_ALIAS';

/** RS — replay result material (§9.5.1): read from historical rows, never recomputed. */
export interface M7OutcomeAssertionResult {
  readonly outcomeId: string;
  readonly assertionId: string;
  readonly resultKind: M7OutcomeResultKind;
  readonly replayed: boolean;
}

/** Malformed SO-1 caller material. Carries no consent material and no database text. */
export class M7InputError extends Error {
  constructor(
    readonly field: string,
    detail: string,
  ) {
    super(`M7_SO1_INVALID_INPUT: ${field}: ${detail}`);
    this.name = 'M7InputError';
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TRANSPORT_KEY = /^[A-Za-z0-9_-]{16,128}$/;
const MERCHANT_REF = /^[A-Za-z0-9_.:-]{1,128}$/;
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/;
const LIMA_DATE = /^\d{4}-\d{2}-\d{2}$/;

function reject(field: string, detail: string): never {
  throw new M7InputError(field, detail);
}

function requireObject(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    reject(field, 'must be an object');
  }
  return value as Record<string, unknown>;
}

/** Exactly `keys`, no more and no fewer. Symbol keys are rejected outright. */
function requireExactKeys(
  o: Record<string, unknown>,
  field: string,
  keys: readonly string[],
): void {
  if (Object.getOwnPropertySymbols(o).length > 0) reject(field, 'symbol keys are not accepted');
  const allowed = new Set(keys);
  for (const k of Object.keys(o)) if (!allowed.has(k)) reject(field, `unknown key ${k}`);
  for (const k of keys) {
    if (!Object.prototype.hasOwnProperty.call(o, k)) reject(field, `missing key ${k}`);
  }
}

function requireString(o: Record<string, unknown>, key: string, field: string): string {
  const v = o[key];
  if (typeof v !== 'string') reject(field, 'must be a string');
  return v;
}

function matching(value: string, pattern: RegExp, field: string, detail: string): string {
  if (!pattern.test(value)) reject(field, detail);
  return value;
}

function member<T extends string>(value: string, set: readonly T[], field: string): T {
  if (!(set as readonly string[]).includes(value)) {
    reject(field, `must be one of ${set.join(' | ')}`);
  }
  return value as T;
}

/** YYYY-MM-DD that is a real calendar date (a DATE column rejects 2026-02-30 with 22008). */
function requireCalendarDate(value: string, field: string): string {
  matching(value, LIMA_DATE, field, 'must be YYYY-MM-DD');
  const [y, m, d] = value.split('-').map((p) => Number.parseInt(p, 10)) as [number, number, number];
  if (m < 1 || m > 12 || d < 1) reject(field, 'is not a calendar date');
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const lengths = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (d > lengths[m - 1]!) reject(field, 'is not a calendar date');
  return value;
}

function parseMerchant(raw: unknown): M7MerchantAssertion {
  const o = requireObject(raw, 'merchant');
  const kind = requireString(o, 'kind', 'merchant.kind');
  switch (kind) {
    case 'NOT_ASSERTED':
    case 'UNLISTED_MERCHANT':
      requireExactKeys(o, 'merchant', ['kind']);
      return Object.freeze({ kind });
    case 'VOCABULARY_MERCHANT': {
      requireExactKeys(o, 'merchant', ['kind', 'merchantRef']);
      const merchantRef = matching(
        requireString(o, 'merchantRef', 'merchant.merchantRef'),
        MERCHANT_REF,
        'merchant.merchantRef',
        'must match ^[A-Za-z0-9_.:-]{1,128}$',
      );
      return Object.freeze({ kind, merchantRef });
    }
    default:
      return reject(
        'merchant.kind',
        'must be one of NOT_ASSERTED | VOCABULARY_MERCHANT | UNLISTED_MERCHANT',
      );
  }
}

function parseEventTime(raw: unknown): M7EventTimeAssertion {
  const o = requireObject(raw, 'eventTime');
  const kind = requireString(o, 'kind', 'eventTime.kind');
  switch (kind) {
    case 'NOT_ASSERTED':
      requireExactKeys(o, 'eventTime', ['kind']);
      return Object.freeze({ kind });
    case 'INSTANT': {
      requireExactKeys(o, 'eventTime', ['kind', 'at']);
      const at = matching(
        requireString(o, 'at', 'eventTime.at'),
        INSTANT,
        'eventTime.at',
        'must be RFC 3339 with an explicit offset and at most 6 fractional digits',
      );
      return Object.freeze({ kind, at });
    }
    case 'LIMA_DATE': {
      requireExactKeys(o, 'eventTime', ['kind', 'date']);
      const date = requireCalendarDate(
        requireString(o, 'date', 'eventTime.date'),
        'eventTime.date',
      );
      return Object.freeze({ kind, date });
    }
    default:
      return reject('eventTime.kind', 'must be one of NOT_ASSERTED | INSTANT | LIMA_DATE');
  }
}

/**
 * §9.3 SO-1 grammar. `raw` is the immutable, data-only snapshot CCA §12 already produced; this
 * function only decides whether it is admissible SO-1 caller material and returns the frozen,
 * normalized value. It never consults a clock, a database, the environment or the control plane.
 */
export function parseOutcomeAssertionInput(raw: unknown): M7OutcomeAssertionInput {
  const o = requireObject(raw, 'input');
  if (Object.getOwnPropertySymbols(o).length > 0) reject('input', 'symbol keys are not accepted');
  const allowed = new Set<string>(SO1_INPUT_KEYS);
  for (const k of Object.keys(o)) if (!allowed.has(k)) reject('input', `unknown key ${k}`);

  const purchaseIntentId = matching(
    requireString(o, 'purchaseIntentId', 'purchaseIntentId'),
    UUID,
    'purchaseIntentId',
    'must be a uuid',
  );
  const clientCaptureKey = matching(
    requireString(o, 'clientCaptureKey', 'clientCaptureKey'),
    TRANSPORT_KEY,
    'clientCaptureKey',
    'must match ^[A-Za-z0-9_-]{16,128}$',
  );
  const idempotencyKey = matching(
    requireString(o, 'idempotencyKey', 'idempotencyKey'),
    TRANSPORT_KEY,
    'idempotencyKey',
    'must match ^[A-Za-z0-9_-]{16,128}$',
  );
  const assertionKind = member(
    requireString(o, 'assertionKind', 'assertionKind'),
    M7_ASSERTION_KINDS,
    'assertionKind',
  );

  const present = (k: So1InputKey): boolean => Object.prototype.hasOwnProperty.call(o, k);

  // m7_outcome_assertion_kind_ck: supersedesAssertionId present exactly when kind is not ORIGINAL.
  const supersedesRequired = assertionKind !== 'ORIGINAL';
  if (present('supersedesAssertionId') !== supersedesRequired) {
    reject(
      'supersedesAssertionId',
      supersedesRequired
        ? `is required when assertionKind is ${assertionKind}`
        : 'must be absent when assertionKind is ORIGINAL',
    );
  }
  const supersedesAssertionId = supersedesRequired
    ? matching(
        requireString(o, 'supersedesAssertionId', 'supersedesAssertionId'),
        UUID,
        'supersedesAssertionId',
        'must be a uuid',
      )
    : undefined;

  // m7_outcome_assertion_content_ck: a RETRACTION carries no participant payload at all; a live
  // ORIGINAL / CORRECTION carries all four payload fields.
  const payloadRequired = assertionKind !== 'RETRACTION';
  for (const k of ['statusLabel', 'occurrenceAssertion', 'merchant', 'eventTime'] as const) {
    if (present(k) !== payloadRequired) {
      reject(
        k,
        payloadRequired
          ? `is required when assertionKind is ${assertionKind}`
          : 'must be absent when assertionKind is RETRACTION',
      );
    }
  }

  if (!payloadRequired) {
    return Object.freeze({
      purchaseIntentId,
      clientCaptureKey,
      idempotencyKey,
      assertionKind,
      supersedesAssertionId,
    }) as M7OutcomeAssertionInput;
  }

  const statusLabel = member(
    requireString(o, 'statusLabel', 'statusLabel'),
    M7_OUTCOME_STATUS_LABELS,
    'statusLabel',
  );
  const occurrenceAssertion = member(
    requireString(o, 'occurrenceAssertion', 'occurrenceAssertion'),
    M7_OCCURRENCE_ASSERTIONS,
    'occurrenceAssertion',
  );
  const merchant = parseMerchant(o.merchant);
  const eventTime = parseEventTime(o.eventTime);

  // m7_outcome_assertion_content_ck, last conjunct: asserting NO occurrence forbids asserting a
  // merchant or an event time for that occurrence.
  if (
    occurrenceAssertion === 'NONE' &&
    !(merchant.kind === 'NOT_ASSERTED' && eventTime.kind === 'NOT_ASSERTED')
  ) {
    reject('occurrenceAssertion', 'NONE requires merchant NOT_ASSERTED and eventTime NOT_ASSERTED');
  }

  return Object.freeze({
    purchaseIntentId,
    clientCaptureKey,
    idempotencyKey,
    assertionKind,
    supersedesAssertionId,
    statusLabel,
    occurrenceAssertion,
    merchant,
    eventTime,
  }) as M7OutcomeAssertionInput;
}

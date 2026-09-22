// PagaMenos · src/m7/runtime — the exact M7 consumer-boundary error mapping (V1.1 §19.11.0).
//
// The accepted error contract says, verbatim: "callers map to typed errors; participant-facing
// surfaces map everything except M7001-M7003 to generic NOT_AUTHORIZED / UNAVAILABLE". This module
// is the single implementation of that sentence, and it is deliberately narrow:
//
//   28000 M7_SESSION_INVALID        -> the generic CCA NOT_AUTHORIZED sentinel.
//   M7008 M7_DECISION_NOT_AVAILABLE -> the generic CCA NOT_AUTHORIZED sentinel.
//        Both are authorization-shaped and MUST be indistinguishable from a consent refusal and
//        from each other: 28000 deliberately conflates unknown / expired / revoked session,
//        participant mismatch and "assignment not owned" (§8.2, §19.11.0), and M7008 explicitly
//        "includes another participant's intent". Distinguishing them would rebuild the consent
//        oracle §9.2 exists to prevent.
//
//   M7001 M7_IDEMPOTENCY_CONFLICT                   -> explicit typed error
//   M7002 M7_DOMAIN_CONFLICT                        -> explicit typed error
//   M7003 M7_CORRECTION_TARGET_ALREADY_SUPERSEDED   -> explicit typed error
//        These three are preserved EXACTLY, and an idempotency conflict is NEVER collapsed into a
//        consent denial: a caller that reused a transport key for different material must learn
//        that, and it says nothing about consent (§9.5.3).
//
//   55000 M7_CONTROL_PLANE_MISMATCH -> typed control-plane error (UNAVAILABLE class). A drifted
//        deployment is an operational fault, not an authorization answer (§23.6 item 5).
//
//   everything else                 -> typed UNAVAILABLE.
//
// NOTHING here carries: NO_CONSENT, WITHDRAWN, optionalEvidenceConsent, a grant identity, a consent
// sequence, an interval, a session reason, an ownership reason, or raw Prisma / PostgreSQL error
// text. Classified errors deliberately do NOT retain the driver error as `cause`, so the raw server
// message cannot be read back off the error at the consumer boundary.

/** Base class for every typed M7 operation error. Never carries consent material. */
export abstract class M7OperationError extends Error {
  protected constructor(
    readonly token: string,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** M7001 — same transport key, materially different caller request material (RQ). */
export class M7IdempotencyConflictError extends M7OperationError {
  constructor() {
    super(
      'M7_IDEMPOTENCY_CONFLICT',
      'M7_IDEMPOTENCY_CONFLICT: this idempotency key was already used for different request material',
    );
  }
}

/** M7002 — same domain identity, materially different caller request material. */
export class M7DomainConflictError extends M7OperationError {
  constructor() {
    super(
      'M7_DOMAIN_CONFLICT',
      'M7_DOMAIN_CONFLICT: this capture key already identifies a different assertion',
    );
  }
}

/** M7003 — the correction/retraction target already has a successor (§14.2). */
export class M7CorrectionTargetAlreadySupersededError extends M7OperationError {
  constructor() {
    super(
      'M7_CORRECTION_TARGET_ALREADY_SUPERSEDED',
      'M7_CORRECTION_TARGET_ALREADY_SUPERSEDED: the target assertion has already been superseded',
    );
  }
}

/** 55000 — the deployment's expected manifest digest is not the active installation's (§23.6). */
export class M7ControlPlaneMismatchError extends M7OperationError {
  constructor() {
    super(
      'M7_CONTROL_PLANE_MISMATCH',
      'M7_CONTROL_PLANE_MISMATCH: this deployment does not match the active M7 control plane',
    );
  }
}

/** Every other failure. Deliberately opaque: no SQLSTATE detail, no driver text. */
export class M7OperationUnavailableError extends M7OperationError {
  constructor() {
    super('M7_UNAVAILABLE', 'M7_UNAVAILABLE: the M7 operation could not be completed');
  }
}

/**
 * How the private M7 engine must answer one PostgreSQL failure.
 *  - NOT_AUTHORIZED: return the generic CCA sentinel (indistinguishable from a consent refusal).
 *  - THROW:          throw `error`.
 */
export type M7ErrorDisposition =
  | { readonly kind: 'NOT_AUTHORIZED' }
  | { readonly kind: 'THROW'; readonly error: M7OperationError };

/** SQLSTATEs (and their message tokens) the participant path may observe. */
const NOT_AUTHORIZED_STATES = new Set(['28000', 'M7008']);
const NOT_AUTHORIZED_TOKENS = new Set(['M7_SESSION_INVALID', 'M7_DECISION_NOT_AVAILABLE']);

const TYPED: Readonly<Record<string, () => M7OperationError>> = {
  M7001: () => new M7IdempotencyConflictError(),
  M7002: () => new M7DomainConflictError(),
  M7003: () => new M7CorrectionTargetAlreadySupersededError(),
  '55000': () => new M7ControlPlaneMismatchError(),
};

const TYPED_TOKENS: Readonly<Record<string, () => M7OperationError>> = {
  M7_IDEMPOTENCY_CONFLICT: () => new M7IdempotencyConflictError(),
  M7_DOMAIN_CONFLICT: () => new M7DomainConflictError(),
  M7_CORRECTION_TARGET_ALREADY_SUPERSEDED: () => new M7CorrectionTargetAlreadySupersededError(),
  M7_CONTROL_PLANE_MISMATCH: () => new M7ControlPlaneMismatchError(),
};

const SQLSTATE = /^[0-9A-Z]{5}$/;
/** Prisma's OWN error codes (P1001, P2002, P2010, …). These are never PostgreSQL SQLSTATEs. */
const PRISMA_CODE = /^P\d{4}$/;

/**
 * The SQLSTATE of a driver error, without importing Prisma. Prisma surfaces a raw-query failure as
 * `code = 'P2010'` with the real SQLSTATE under `meta.code`; the pg driver puts the SQLSTATE
 * directly on `code`. `meta.code` is therefore read FIRST, and a Prisma `P####` code is explicitly
 * NOT accepted as a SQLSTATE — it matches the five-character shape, so reading `code` first would
 * classify every raw-query failure as `P2010` and silently downgrade a genuine M7001/M7002/M7003 to
 * UNAVAILABLE.
 */
export function sqlStateOf(e: unknown): string | null {
  if (typeof e !== 'object' || e === null) return null;
  const meta = (e as { meta?: unknown }).meta;
  if (typeof meta === 'object' && meta !== null) {
    const nested = (meta as { code?: unknown }).code;
    if (typeof nested === 'string' && SQLSTATE.test(nested) && !PRISMA_CODE.test(nested)) {
      return nested;
    }
  }
  const direct = (e as { code?: unknown }).code;
  if (typeof direct === 'string' && SQLSTATE.test(direct) && !PRISMA_CODE.test(direct)) {
    return direct;
  }
  return null;
}

/**
 * The accepted M7 message token carried by a RAISE, when the SQLSTATE did not survive the driver.
 * Only the FIXED accepted tokens are recognized; no other part of the message is ever read, kept or
 * surfaced.
 */
export function m7TokenOf(e: unknown): string | null {
  const message = e instanceof Error ? e.message : typeof e === 'string' ? e : '';
  if (message === '') return null;
  for (const token of [
    ...NOT_AUTHORIZED_TOKENS,
    ...Object.keys(TYPED_TOKENS),
    'M7_INVALID_INPUT',
  ]) {
    if (message.includes(token)) return token;
  }
  return null;
}

/** The error and its `cause` chain, outermost first, with a hard depth bound against cycles. */
function chainOf(e: unknown): unknown[] {
  const out: unknown[] = [];
  const seen = new Set<unknown>();
  let current: unknown = e;
  for (let depth = 0; depth < 16 && current !== undefined && current !== null; depth += 1) {
    if (seen.has(current)) break;
    seen.add(current);
    out.push(current);
    current = typeof current === 'object' ? (current as { cause?: unknown }).cause : undefined;
  }
  return out;
}

/**
 * §19.11.0 applied to one failure raised by an `m7.*` function on the participant path.
 *
 * The whole `cause` chain is inspected, because an error raised inside a tracked adapter method may
 * reach the engine wrapped by the accepted CCA settlement gate (`CCA_ADAPTER_OPERATION_FAILED`
 * carries the driver error as its `cause`). Classifying only the outermost error would silently turn
 * every M7001/M7002/M7003 into UNAVAILABLE.
 *
 * Unrecognized failures fall through to UNAVAILABLE — fail closed, and never to an authorization
 * answer, so an unexpected driver fault can never be mistaken for a consent refusal.
 */
export function disposeM7Error(e: unknown): M7ErrorDisposition {
  for (const link of chainOf(e)) {
    const state = sqlStateOf(link);
    if (state !== null) {
      if (NOT_AUTHORIZED_STATES.has(state)) return { kind: 'NOT_AUTHORIZED' };
      const typed = TYPED[state];
      if (typed !== undefined) return { kind: 'THROW', error: typed() };
      return { kind: 'THROW', error: new M7OperationUnavailableError() };
    }
    const token = m7TokenOf(link);
    if (token !== null) {
      if (NOT_AUTHORIZED_TOKENS.has(token)) return { kind: 'NOT_AUTHORIZED' };
      const typed = TYPED_TOKENS[token];
      if (typed !== undefined) return { kind: 'THROW', error: typed() };
      return { kind: 'THROW', error: new M7OperationUnavailableError() };
    }
  }
  return { kind: 'THROW', error: new M7OperationUnavailableError() };
}

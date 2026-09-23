// PagaMenos · src/cca — application-wide DatabaseExecutionContext (Amendment 01 §29, §29.1, §30 B–D/T, §40).
//
// ONE async-context model that makes application transaction topology mechanically observable:
//   * whether execution is currently inside an application transaction, and of which authority —
//     an accepted existing A1/A2 owner (§34, class A) or the private CCA engine (§33, class B);
//   * whether a CCA execution is active (the §29.1 re-entry flag);
//   * the canonical lock rank floor held by the active CCA transaction (§27).
//
// Technology: Node's built-in `AsyncLocalStorage` (node:async_hooks, Node >= 20) — no new dependency.
// The storage instance is MODULE-PRIVATE. This module exports NO primitive that runs code with a
// cleared or weakened context: every transition only ADDS an open frame, so no caller can forge its
// way OUT of an active transaction (the only thing forging could do is make CCA reject). Imports of
// `node:async_hooks` elsewhere in production source are forbidden by the capability test, closing
// `AsyncLocalStorage.snapshot()` / `AsyncResource` / `exit()` context-escape routes statically.
//
// Registration of the accepted owners is TRANSPARENT (§35, §40): `installTransactionGovernance` wraps
// the shared client's `$transaction` once, at its single construction point (src/db/client.ts). The
// wrapper forwards the exact arguments and returns the exact result of the original method; for an
// interactive callback it only runs that callback inside an ACCEPTED_OWNER frame. Isolation, lock
// order, contents and outputs of the 15 accepted transaction sites are untouched.
//
// Scope of the guarantee (§40.2, §45): the in-process accepted capability model. Code that defers a
// continuation registered OUTSIDE a transaction and resumes it from inside one executes in the outer
// (transaction-free) async context by JavaScript semantics; such a continuation cannot share the
// outer transaction's connection, so it cannot corrupt consent or ordering — at worst it waits on a
// row lock until the outer transaction's timeout. This residual is recorded, not hidden.
//
// M7 V1.1 §16.2.3 / §18.6 TO-8 (ADDITIVE): the M7 capability signer registers as its OWN owner kind,
// 'M7_CAPABILITY_SIGNER', in the SAME storage below — there is still exactly one AsyncLocalStorage.
// A TO-8 frame is an ordinary open frame, so `readDatabaseExecutionState().transactionActive` is true
// inside it and the unchanged `runCcaTransaction` rejects with CCA_TOP_LEVEL_TRANSACTION_REQUIRED
// ("CCA rejects if a TO-8 transaction is active"). The TO-8 runner itself refuses before any database
// access while ANY registered transaction is active. The owner kind is a fixed literal: there is no
// generic owner selector, and nothing here clears or weakens a context.
import { AsyncLocalStorage } from 'node:async_hooks';

import { CcaError } from './errors';

/** Who owns the innermost open application transaction. */
export type TransactionAuthority = 'NONE' | 'ACCEPTED_OWNER' | 'CCA' | 'M7_CAPABILITY_SIGNER';

/** Module-private frame. `open` flips to false when the frame's transaction/execution ends (§30 T). */
interface Frame {
  readonly authority: 'ACCEPTED_OWNER' | 'CCA' | 'M7_CAPABILITY_SIGNER';
  readonly parent: Frame | undefined;
  open: boolean;
  lockRankFloor: number;
}

const storage = new AsyncLocalStorage<Frame>();

/** Read-only snapshot of the current execution context. Contains no DB capability. */
export interface DatabaseExecutionState {
  readonly transactionActive: boolean;
  readonly transactionAuthority: TransactionAuthority;
  readonly ccaActive: boolean;
  /** Highest canonical lock rank held by the active CCA transaction; -1 when none. */
  readonly lockRankFloor: number;
  /** Number of open frames in the current async lineage. */
  readonly openDepth: number;
}

function openFrames(): Frame[] {
  const out: Frame[] = [];
  for (let f = storage.getStore(); f !== undefined; f = f.parent) if (f.open) out.push(f);
  return out;
}

export function readDatabaseExecutionState(): DatabaseExecutionState {
  const frames = openFrames();
  const innermost = frames[0];
  const cca = frames.find((f) => f.authority === 'CCA');
  return Object.freeze({
    transactionActive: frames.length > 0,
    transactionAuthority: innermost ? innermost.authority : 'NONE',
    ccaActive: cca !== undefined,
    lockRankFloor: cca ? cca.lockRankFloor : -1,
    openDepth: frames.length,
  });
}

// ---------------------------------------------------------------------------------------------------
// Diagnostics (read-only counters; evidence for "rejected before any database access").
// ---------------------------------------------------------------------------------------------------
const counters = {
  acceptedOwnerTransactions: 0,
  ccaTransactions: 0,
  ccaRejectedBeforeDatabase: 0,
  nestedTransactionRejections: 0,
  // M7 V1.1 TO-8 (additive).
  m7CapabilitySignerTransactions: 0,
  m7CapabilitySignerRejectedBeforeDatabase: 0,
};

export function readDatabaseExecutionDiagnostics(): Readonly<typeof counters> {
  return Object.freeze({ ...counters });
}

// ---------------------------------------------------------------------------------------------------
// Transparent registration of the accepted owners (§35, §40).
// ---------------------------------------------------------------------------------------------------

/** The structural surface governed here. Deliberately NOT a Prisma type (this module is DB-free). */
export interface TransactionCapableClient {
  $transaction: (...args: never[]) => Promise<unknown>;
}

type RawTransaction = (...args: unknown[]) => Promise<unknown>;

/** client → its original (ungoverned) `$transaction`, bound. Module-private; never exported. */
const rawTransactions = new WeakMap<object, RawTransaction>();

/**
 * Install transparent DatabaseExecutionContext registration on the shared client. Idempotent.
 * Capability-restricted: only src/db/client.ts may call it (module-capability test).
 */
export function installTransactionGovernance<C extends TransactionCapableClient>(client: C): C {
  if (rawTransactions.has(client)) return client;
  const original = (client.$transaction as unknown as RawTransaction).bind(client);
  rawTransactions.set(client, original);

  const governedTransaction = function governedTransaction(...args: unknown[]): Promise<unknown> {
    // A CCA transaction is active: an application transaction opened now would be a second
    // connection nested under the CCA transaction (§29.1). This topology cannot exist at baseline.
    if (readDatabaseExecutionState().ccaActive) {
      counters.nestedTransactionRejections++;
      return Promise.reject(
        new CcaError(
          'CCA_NESTED_TRANSACTION_FORBIDDEN',
          'an application transaction may not be opened while a CCA transaction is active',
        ),
      );
    }
    const [first, ...rest] = args;
    // Batch form ($transaction([...])): no application code runs inside it — forwarded unchanged.
    if (typeof first !== 'function') return original(...args);
    counters.acceptedOwnerTransactions++;
    const callback = first as (tx: unknown) => unknown;
    return original(
      (tx: unknown) => {
        const frame: Frame = {
          authority: 'ACCEPTED_OWNER',
          parent: storage.getStore(),
          open: true,
          lockRankFloor: -1,
        };
        return storage.run(frame, async () => {
          try {
            return await callback(tx);
          } finally {
            frame.open = false;
          }
        });
      },
      ...rest,
    );
  };
  (client as unknown as { $transaction: RawTransaction }).$transaction = governedTransaction;
  return client;
}

// ---------------------------------------------------------------------------------------------------
// The CCA transaction (class B, §33) — capability-restricted to src/db/cca-engine.ts.
// ---------------------------------------------------------------------------------------------------

/** Handle given to the CCA body. Records lock rank; carries no DB capability. */
export interface CcaFrameHandle {
  noteLockRank(rank: number): void;
}

/**
 * §30 steps B–E and T. Rejects BEFORE any database access when a CCA execution (re-entry, §29.1) or
 * any registered application transaction (§29, §40.1) is active in the current async lineage; then
 * enters the CCA frame, opens the transaction through the ORIGINAL client method (never registering
 * as an accepted owner), and closes the frame in `finally`.
 */
export async function runCcaTransaction<T>(
  client: TransactionCapableClient,
  options: Readonly<Record<string, unknown>>,
  body: (tx: unknown, frame: CcaFrameHandle) => Promise<T>,
): Promise<T> {
  const state = readDatabaseExecutionState();
  if (state.ccaActive) {
    counters.ccaRejectedBeforeDatabase++;
    throw new CcaError('CCA_REENTRY_FORBIDDEN', 'a sealed operation is already executing');
  }
  if (state.transactionActive) {
    counters.ccaRejectedBeforeDatabase++;
    throw new CcaError(
      'CCA_TOP_LEVEL_TRANSACTION_REQUIRED',
      'a sealed operation must not run inside an application transaction',
    );
  }
  const original = rawTransactions.get(client);
  if (original === undefined) {
    counters.ccaRejectedBeforeDatabase++;
    throw new CcaError('CCA_UNGOVERNED_CLIENT', 'the CCA engine requires the governed client');
  }
  const frame: Frame = {
    authority: 'CCA',
    parent: storage.getStore(),
    open: true,
    lockRankFloor: -1,
  };
  const handle: CcaFrameHandle = Object.freeze({
    noteLockRank(rank: number): void {
      if (rank > frame.lockRankFloor) frame.lockRankFloor = rank;
    },
  });
  return storage.run(frame, async () => {
    try {
      counters.ccaTransactions++;
      return (await original(
        // Re-enter the same frame inside the callback so registration never depends on context
        // propagation through the driver's internals.
        (tx: unknown) => storage.run(frame, () => body(tx, handle)),
        options,
      )) as T;
    } finally {
      frame.open = false;
    }
  });
}

// ---------------------------------------------------------------------------------------------------
// TO-8 — the M7 capability-signer transaction (M7 V1.1 §16.2.3, §18.6; XF-16).
// Capability-restricted to src/db/m7-capability-signer.ts (capability analyzer, T7/T8 + TO-8 rules).
// ---------------------------------------------------------------------------------------------------

export type M7CapabilitySignerTransactionErrorCode =
  | 'TO8_TRANSACTION_ALREADY_ACTIVE'
  | 'TO8_UNSEALED_CLIENT'
  | 'TO8_CLIENT_ALREADY_GOVERNED'
  | 'TO8_DIRECT_TRANSACTION_FORBIDDEN';

/** A TO-8 topology refusal. Carries no envelope component and no database material. */
export class M7CapabilitySignerTransactionError extends Error {
  constructor(
    public readonly code: M7CapabilitySignerTransactionErrorCode,
    message: string,
  ) {
    super(`${code}: ${message}`);
    this.name = 'M7CapabilitySignerTransactionError';
  }
}

/** signer client → its original `$transaction`, bound. Module-private; never exported. */
const signerRawTransactions = new WeakMap<object, RawTransaction>();

/**
 * Seal the hidden signer client as the TO-8 client. Idempotent. The client's own `$transaction` is
 * captured here and REPLACED by a rejecting stub, so the only way to open a transaction on it is
 * `runM7CapabilitySignerTransaction`, which registers the TO-8 frame. A client already governed as
 * the shared accepted-owner client can never become the signer client.
 */
export function sealM7CapabilitySignerClient<C extends TransactionCapableClient>(client: C): C {
  if (signerRawTransactions.has(client)) return client;
  if (rawTransactions.has(client)) {
    throw new M7CapabilitySignerTransactionError(
      'TO8_CLIENT_ALREADY_GOVERNED',
      'the governed accepted-owner client cannot be the capability-signer client',
    );
  }
  signerRawTransactions.set(
    client,
    (client.$transaction as unknown as RawTransaction).bind(client),
  );
  (client as unknown as { $transaction: RawTransaction }).$transaction =
    function sealedSignerTransaction(): Promise<unknown> {
      return Promise.reject(
        new M7CapabilitySignerTransactionError(
          'TO8_DIRECT_TRANSACTION_FORBIDDEN',
          'the capability-signer client opens transactions only through the TO-8 runner',
        ),
      );
    };
  return client;
}

/**
 * The TO-8 transaction. Rejects BEFORE any database access when ANY registered transaction —
 * ACCEPTED_OWNER, CCA or another TO-8 — is active in the current async lineage; then enters the
 * TO-8 frame, opens the transaction through the sealed client's ORIGINAL method, and closes the frame
 * in `finally`. It resolves only with the value the transaction resolved with, i.e. only after
 * PostgreSQL COMMIT succeeded; a rollback or a rejected commit rejects and returns nothing.
 */
export async function runM7CapabilitySignerTransaction<T>(
  client: TransactionCapableClient,
  options: Readonly<Record<string, unknown>>,
  body: (tx: unknown) => Promise<T>,
): Promise<T> {
  const state = readDatabaseExecutionState();
  if (state.transactionActive) {
    counters.m7CapabilitySignerRejectedBeforeDatabase++;
    throw new M7CapabilitySignerTransactionError(
      'TO8_TRANSACTION_ALREADY_ACTIVE',
      'the capability signer never opens a transaction while a registered transaction is active',
    );
  }
  const original = signerRawTransactions.get(client);
  if (original === undefined) {
    counters.m7CapabilitySignerRejectedBeforeDatabase++;
    throw new M7CapabilitySignerTransactionError(
      'TO8_UNSEALED_CLIENT',
      'the TO-8 runner requires the sealed capability-signer client',
    );
  }
  const frame: Frame = {
    authority: 'M7_CAPABILITY_SIGNER',
    parent: storage.getStore(),
    open: true,
    lockRankFloor: -1,
  };
  return storage.run(frame, async () => {
    try {
      counters.m7CapabilitySignerTransactions++;
      return (await original((tx: unknown) => storage.run(frame, () => body(tx)), options)) as T;
    } finally {
      frame.open = false;
    }
  });
}

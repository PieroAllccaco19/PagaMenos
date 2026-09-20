// PagaMenos · src/cca — tracked adapter + zero-in-flight commit gate (Amendment 01 §17, §21–§24, §45, §49).
//
// The ONLY capability class that holds the hidden transaction client for an authorized collection
// (§17). Its implementation functions are fixed and frozen at sealed-operation definition time
// (`freezeAdapterSpec`); per execution the CCA engine alone calls `constructTrackedAdapter`, which
// captures the transaction client and the LockedCollectionScope in a closure and returns:
//   * `adapter` — a frozen, null-prototype object whose ONLY own properties are the modeled operation
//     methods. No transaction client, delegate, `$transaction`, raw SQL or generic query property
//     exists on it or on its (frozen) method functions (§21, §45);
//   * `gate` — the lifecycle, held by the engine only.
// Every adapter method (§22):
//     assert ACTIVE (else reject BEFORE any DB access) → activeCount++ → run → activeCount-- on
//     settlement (fulfilled OR rejected; a synchronous throw is counted and settled too).
// `executeUnderZeroInFlightGate` (§22, §30 O–R): when the executor's promise settles it synchronously
// enters CLOSING (no await in between), requires activeCount == 0, and only then allows CLOSED and
// commit. A floating operation therefore either was counted (→ rollback) or starts after CLOSING
// (→ rejected before DB access). Any adapter-operation failure, even one the executor swallowed,
// rolls back (§49).
import { CcaError } from './errors';
import type { LockSequencer } from './lock-order';
import { isLockedCollectionScope, type LockedCollectionScope } from './locked-scope';

export type AdapterState = 'ACTIVE' | 'CLOSING' | 'CLOSED';

/** What an implementation method receives besides the hidden transaction client. */
export interface BoundAdapterContext {
  readonly scope: LockedCollectionScope;
  readonly locks: LockSequencer;
}

type AsyncMethod = (...args: never[]) => Promise<unknown>;

/** Implementation map for the operation-specific interface `M` over transaction type `Tx`. */
export type AdapterImplementation<Tx, M> = {
  readonly [K in keyof M]: M[K] extends (...args: infer A) => Promise<infer R>
    ? (tx: Tx, bound: BoundAdapterContext, ...args: A) => Promise<R>
    : never;
};

/** Frozen, validated implementation map (opaque to everything but this module). */
export interface FrozenAdapterSpec<Tx, M> {
  readonly __ccaFrozenAdapterSpec: true;
  readonly methodNames: readonly (keyof M & string)[];
  /** Phantom marker only; never populated. */
  readonly __types?: { tx: Tx; m: M };
}

/** Method names that would amount to a generic/raw capability rather than a modeled operation. */
const FORBIDDEN_METHOD_NAME =
  /^(\$.*|then|catch|finally|constructor|prototype|__proto__|tx|client|prisma|transaction|raw|sql|query|queryRaw|executeRaw|execute|lock|unlock|delegate|db|connection)$/i;

const specImpls = new WeakMap<object, Readonly<Record<string, AnyImpl>>>();
type AnyImpl = (tx: unknown, bound: BoundAdapterContext, ...args: unknown[]) => Promise<unknown>;

/** Validate + snapshot an implementation map at definition time (§19: no later replacement). */
export function freezeAdapterSpec<Tx, M>(
  impl: AdapterImplementation<Tx, M>,
): FrozenAdapterSpec<Tx, M> {
  if (typeof impl !== 'object' || impl === null) {
    throw new CcaError('CCA_INVALID_DEFINITION', 'adapter implementation must be an object');
  }
  const snapshot: Record<string, AnyImpl> = Object.create(null);
  const names = Object.keys(impl);
  if (names.length === 0 || Object.getOwnPropertySymbols(impl).length > 0) {
    throw new CcaError('CCA_INVALID_DEFINITION', 'adapter must model at least one named method');
  }
  for (const name of names) {
    const fn = (impl as Record<string, unknown>)[name];
    if (typeof fn !== 'function' || FORBIDDEN_METHOD_NAME.test(name)) {
      throw new CcaError(
        'CCA_INVALID_DEFINITION',
        `adapter method ${name} is not a modeled operation`,
      );
    }
    snapshot[name] = fn as AnyImpl;
  }
  const spec: FrozenAdapterSpec<Tx, M> = Object.freeze({
    __ccaFrozenAdapterSpec: true as const,
    methodNames: Object.freeze(names) as readonly (keyof M & string)[],
  });
  specImpls.set(spec, Object.freeze(snapshot));
  return spec;
}

/** Engine-only lifecycle view. */
export interface SettlementGate {
  state(): AdapterState;
  activeCount(): number;
  firstFailure(): { readonly error: unknown } | null;
  rejectedWhileInactive(): number;
  beginClosing(): void;
  close(): void;
  /** Post-transaction: unconditionally CLOSED (rollback or commit already decided). */
  finalize(): void;
}

export interface TrackedAdapterHandle<M> {
  readonly adapter: Readonly<M>;
  readonly gate: SettlementGate;
}

const noop = (): void => undefined;

/** INTERNAL — CCA engine only (§17, §30 N). */
export function constructTrackedAdapter<Tx, M>(
  tx: Tx,
  spec: FrozenAdapterSpec<Tx, M>,
  bound: BoundAdapterContext,
): TrackedAdapterHandle<M> {
  const impls = specImpls.get(spec);
  if (impls === undefined) throw new CcaError('CCA_INVALID_DEFINITION', 'unfrozen adapter spec');
  if (!isLockedCollectionScope(bound.scope)) {
    throw new CcaError('CCA_ASSIGNMENT_SCOPE_MISMATCH', 'adapter requires a CCA-minted scope');
  }
  const boundCtx: BoundAdapterContext = Object.freeze({ scope: bound.scope, locks: bound.locks });

  let state: AdapterState = 'ACTIVE';
  let active = 0;
  let failure: { readonly error: unknown } | null = null;
  let rejected = 0;

  const adapter = Object.create(null) as Record<string, AsyncMethod>;
  for (const name of spec.methodNames) {
    const impl = impls[name]!;
    const method = function trackedAdapterMethod(...args: unknown[]): Promise<unknown> {
      if (state !== 'ACTIVE') {
        rejected++;
        const refused = Promise.reject(
          new CcaError('CCA_ADAPTER_NOT_ACTIVE', `adapter method ${name} called while ${state}`),
        );
        refused.catch(noop); // never an unhandled rejection for a detached caller
        return refused;
      }
      active++;
      let pending: Promise<unknown>;
      try {
        pending = Promise.resolve(impl(tx, boundCtx, ...args));
      } catch (error) {
        pending = Promise.reject(error);
      }
      const tracked = pending.then(
        (value) => {
          active--;
          return value;
        },
        (error: unknown) => {
          active--;
          if (failure === null) failure = Object.freeze({ error });
          throw error;
        },
      );
      tracked.catch(noop);
      return tracked;
    };
    Object.freeze(method);
    Object.defineProperty(adapter, name, {
      value: method,
      enumerable: true,
      writable: false,
      configurable: false,
    });
  }
  Object.freeze(adapter);

  const gate: SettlementGate = Object.freeze({
    state: () => state,
    activeCount: () => active,
    firstFailure: () => failure,
    rejectedWhileInactive: () => rejected,
    beginClosing(): void {
      if (state === 'ACTIVE') state = 'CLOSING';
    },
    close(): void {
      if (state === 'ACTIVE' || active !== 0) {
        throw new CcaError(
          'CCA_IN_FLIGHT_AT_SETTLEMENT',
          'close requires CLOSING and zero in flight',
        );
      }
      state = 'CLOSED';
    },
    finalize(): void {
      state = 'CLOSED';
    },
  });

  return Object.freeze({ adapter: adapter as unknown as Readonly<M>, gate });
}

/**
 * §22 / §30 O–R. Runs the executor, then — synchronously upon its settlement — CLOSING, the
 * zero-in-flight check, the adapter-failure check, and CLOSED. Throwing here inside the transaction
 * callback is what rolls the CCA transaction back.
 */
export async function executeUnderZeroInFlightGate<R>(
  handle: TrackedAdapterHandle<unknown>,
  run: () => Promise<R>,
): Promise<R> {
  let outcome: { ok: true; value: R } | { ok: false; error: unknown };
  try {
    outcome = { ok: true, value: await run() };
  } catch (error) {
    outcome = { ok: false, error };
  }
  // No await between settlement and CLOSING: nothing can enter the adapter in between.
  handle.gate.beginClosing();
  const inFlight = handle.gate.activeCount();
  if (inFlight !== 0) {
    throw new CcaError(
      'CCA_IN_FLIGHT_AT_SETTLEMENT',
      `${inFlight} adapter operation(s) still in flight at executor settlement`,
    );
  }
  if (!outcome.ok) throw outcome.error;
  const failed = handle.gate.firstFailure();
  if (failed !== null) {
    throw new CcaError('CCA_ADAPTER_OPERATION_FAILED', 'an adapter operation failed', {
      cause: failed.error,
    });
  }
  handle.gate.close();
  return outcome.value;
}

// PagaMenos · src/cca — sealed-operation surface + operation-input channel (Amendment 01 §6, §9, §11, §12).
//
// What a business caller receives for one consent-conditioned operation is EXACTLY:
//     execute(trustedParticipantContext, input) → Promise<R | NOT_AUTHORIZED>
// on a frozen, null-prototype object with no other property. There is no purpose/policy argument,
// no callback, no executor, no transaction and no detachable authorization result. A call with any
// extra argument (a callback, an executor, a policy) is rejected before anything else runs.
//
// Input channel (§12): the raw input is snapshotted by `structuredClone` — which REJECTS functions,
// symbols and other non-data values, and evaluates any getter/proxy exactly once — then deep-frozen,
// so the material seen by validation is the material used inside the transaction.
import { CcaError } from './errors';

/** The generic consumer-visible refusal (§9.2). Identical for every policy and every reason. */
export const NOT_AUTHORIZED = Object.freeze({ kind: 'NOT_AUTHORIZED' as const });
export type NotAuthorized = typeof NOT_AUTHORIZED;

export interface SealedOperation<I, R, C = unknown> {
  execute(trustedParticipantContext: C, input: Readonly<I>): Promise<R | NotAuthorized>;
}

export function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Reflect.ownKeys(value as object)) {
      deepFreeze((value as Record<PropertyKey, unknown>)[key]);
    }
  }
  return value;
}

/** §12: immutable, data-only snapshot of the caller's input. */
export function snapshotOperationInput(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null) {
    throw new CcaError('CCA_INVALID_OPERATION_INPUT', 'operation input must be a non-null object');
  }
  let copy: unknown;
  try {
    copy = structuredClone(raw);
  } catch (cause) {
    throw new CcaError('CCA_INVALID_OPERATION_INPUT', 'operation input must be plain data', {
      cause,
    });
  }
  return deepFreeze(copy);
}

/**
 * Wrap an implementation as the sealed surface. `impl` is fixed here, at definition time; the
 * returned object cannot be extended, re-pointed or given another executor (§19).
 */
export function sealOperation<I, R, C>(
  impl: (context: C, input: Readonly<I>) => Promise<R | NotAuthorized>,
): SealedOperation<I, R, C> {
  const surface = Object.create(null) as SealedOperation<I, R, C>;
  const execute = function execute(this: unknown, ...args: unknown[]): Promise<R | NotAuthorized> {
    if (args.length !== 2) {
      return Promise.reject(
        new CcaError(
          'CCA_SEALED_SURFACE_VIOLATION',
          'execute takes exactly (trustedParticipantContext, input)',
        ),
      );
    }
    return impl(args[0] as C, args[1] as Readonly<I>);
  };
  Object.freeze(execute);
  Object.defineProperty(surface, 'execute', {
    value: execute,
    enumerable: true,
    writable: false,
    configurable: false,
  });
  return Object.freeze(surface);
}

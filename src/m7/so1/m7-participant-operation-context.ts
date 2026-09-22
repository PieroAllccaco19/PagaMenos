// PagaMenos · src/m7/so1 — the per-execution M7 participant operation context (V1.1 §9.4). TYPES ONLY.
//
// V1.1 §9.4 "Adapter-to-function binding" requires the tracked-adapter method itself to issue
// exactly one `SELECT m7.p_..._v1(...)` via `$queryRaw` on the HIDDEN TransactionClient, passing the
// session secret, the LockedCollectionScope participant/assignment, `capturedAt`, the expected
// control-plane manifest digest and the §9.3 input fields and nothing else. The adapter therefore
// needs the hidden client and the secret — but it may only ever RECEIVE them, never import them:
//
//   * the hidden participant Prisma client is constructed only inside the private M7 CCA engine and
//     is never exported (§18.3 CS-1);
//   * the raw session secret is held only by the M7 session module's module-private WeakMap and is
//     reachable only by that module and the private engine (§8.2, AUTH §20);
//   * this module declares only the SHAPE of what the engine hands the adapter per execution.
//
// It is declared HERE rather than in the engine because the accepted CCA adapter capability closure
// classifies ANY adapter -> ENGINE edge, including `import type`, as FORBIDDEN_DB_CAPABLE. A
// types-only module carries no runtime capability: there is nothing here to call, construct or
// re-export, and the capability test proves mechanically that this file contains type declarations
// only.
import type { Prisma } from '@prisma/client';

/**
 * Constructed ONLY by the private M7 participant CCA engine, once per authorized execution, frozen,
 * and passed ONLY to the tracked adapter that the engine itself constructs (CCA §17, §30 N). It is
 * never returned to a business caller, never reaches the fixed executor, and is never serialized.
 */
export interface M7ParticipantOperationContext {
  /** The hidden TransactionClient of the CCA transaction opened as `pagamenos_m7_participant_rt`. */
  readonly tx: Prisma.TransactionClient;
  /** The 32-byte raw session secret (§8.2). Passed to the approved `m7.p_*` function; never logged. */
  readonly sessionSecret: Buffer;
  /** The expected control-plane manifest digest (§23.6). Never caller input. */
  readonly expectedManifestSha256: string;
}

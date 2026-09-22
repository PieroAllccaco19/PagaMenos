// PagaMenos · src/m7/so2 — the per-execution SO-2 operation context (V1.1 §9.4). TYPES ONLY.
//
// The SO-2 tracked-adapter method itself issues the one `SELECT m7.p_begin_evidence_upload_v1(...)`
// on the HIDDEN TransactionClient, passing the session secret and the expected control-plane
// manifest digest (§9.4 "Adapter-to-function binding"). It may only RECEIVE those, never import
// them: the hidden participant client exists only inside the private M7 CCA engine, and the raw
// secret only inside the M7 session module and that engine (§8.2, §18.3 CS-1).
//
// This is the SO-2-LOCAL declaration of that shape. It deliberately does NOT reuse the SO-1
// declaration in src/m7/so1: a productive SO-2 → SO-1 edge would couple the two sealed families
// (AUTH §23), and a shared "generic" context would be the first step towards a multi-operation
// engine. It carries no runtime capability — the capability analyzer proves this file contains type
// declarations only — so there is nothing here to call, construct or re-export.
import type { Prisma } from '@prisma/client';

/**
 * Constructed ONLY by the private M7 participant CCA engine, once per authorized SO-2 execution,
 * frozen, and passed ONLY to the SO-2 tracked adapter the engine itself constructs (CCA §17, §30 N).
 * Never returned to a business caller, never seen by the executor, never serialized or logged.
 */
export interface M7EvidenceUploadOperationContext {
  /** The hidden TransactionClient of the CCA transaction opened as `pagamenos_m7_participant_rt`. */
  readonly tx: Prisma.TransactionClient;
  /** The 32-byte raw session secret (§8.2). Passed to the approved `m7.p_*` function; never logged. */
  readonly sessionSecret: Buffer;
  /** The expected control-plane manifest digest (§23.6). Never caller input. */
  readonly expectedManifestSha256: string;
}

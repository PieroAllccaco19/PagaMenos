// PagaMenos · src/db — M3.5B-A2 decision-request / binding repository (A2 §12/§16/§17/§19). INTERNAL.
//
// The ONLY write path to the two immutable A2 decision tables:
//   • purchase_intent_decision_request — the EXACT frozen decision request (the validated DecideInput +
//     its hash + pinned semantic versions + derived businessDecisionKey / m3_5aIdempotencyKey), frozen
//     ONCE per intent BEFORE M3.5A runs. Self-verified on every load (§19): the stored decideInputHash
//     MUST equal canonicalHash(exactValidatedDecideInputJson).
//   • purchase_intent_decision_binding — the exact 1:1 request↔snapshot binding (§16). The intent is
//     reachable only via decisionRequestId, so a snapshot can never be cross-wired to the wrong intent.
// Both are append-only (DB triggers) and freeze/bind are idempotent + race-safe via real UNIQUE
// constraints reconciled on P2002. This repository performs NO engine/corpus work — the saga service
// runs M3.5A between freeze and bind.
//
// Owning sanctioned service (module-capability AST test): `services/study-intent-decision.ts`.
import { Prisma, type PrismaClient } from '@prisma/client';

import {
  PurchaseIntentBindingCoherenceError,
  PurchaseIntentDecisionRequestIntegrityError,
  PurchaseIntentHistoricalConflictError,
  PurchaseIntentInvariantError,
} from '@/study';
import { canonicalHash } from '@/persistence/hash';

import { prisma as defaultPrisma } from './client';
import { isUniqueViolation } from './study-support';

export interface FrozenDecisionRequest {
  id: string;
  intentId: string;
  finalizationId: string;
  decisionRequestSchemaVersion: string;
  exactValidatedDecideInputJson: unknown;
  decideInputHash: string;
  expectedEngineInputSchemaVersion: string;
  expectedEngineContractVersion: string;
  expectedCorpusVersion: string;
  holidayCalendarVersion: string;
  businessDecisionKey: string;
  m3_5aIdempotencyKey: string;
}

export interface FreezeDecisionRequestArgs {
  intentId: string;
  finalizationId: string;
  decisionRequestSchemaVersion: string;
  exactValidatedDecideInputJson: unknown;
  decideInputHash: string;
  expectedEngineInputSchemaVersion: string;
  expectedEngineContractVersion: string;
  expectedCorpusVersion: string;
  holidayCalendarVersion: string;
  businessDecisionKey: string;
  m3_5aIdempotencyKey: string;
}

export interface BindSnapshotArgs {
  decisionRequestId: string;
  snapshotId: string;
  /** The frozen request's decideInputHash (must equal the snapshot's inputHash). */
  requestDecideInputHash: string;
  /** The frozen request's businessDecisionKey (must equal the snapshot's businessDecisionKey). */
  requestBusinessDecisionKey: string;
  /** The bound snapshot's stored inputHash + businessDecisionKey (from the verified DTO). */
  snapshotInputHash: string;
  snapshotBusinessDecisionKey: string;
}

export interface BindingRecord {
  id: string;
  decisionRequestId: string;
  snapshotId: string;
  replayed: boolean;
}

type RequestRow = Prisma.PurchaseIntentDecisionRequestGetPayload<Record<string, never>>;

function rowToRequest(row: RequestRow): FrozenDecisionRequest {
  return {
    id: row.id,
    intentId: row.intentId,
    finalizationId: row.finalizationId,
    decisionRequestSchemaVersion: row.decisionRequestSchemaVersion,
    exactValidatedDecideInputJson: row.exactValidatedDecideInputJson,
    decideInputHash: row.decideInputHash,
    expectedEngineInputSchemaVersion: row.expectedEngineInputSchemaVersion,
    expectedEngineContractVersion: row.expectedEngineContractVersion,
    expectedCorpusVersion: row.expectedCorpusVersion,
    holidayCalendarVersion: row.holidayCalendarVersion,
    businessDecisionKey: row.businessDecisionKey,
    m3_5aIdempotencyKey: row.m3_5aIdempotencyKey,
  };
}

/** Self-integrity (§19): the stored hash MUST equal the canonical hash of the stored input. */
function assertRequestSelfIntegrity(req: FrozenDecisionRequest): FrozenDecisionRequest {
  const recomputed = canonicalHash(req.exactValidatedDecideInputJson);
  if (recomputed !== req.decideInputHash) {
    throw new PurchaseIntentDecisionRequestIntegrityError(
      `frozen decision request ${req.id} failed self-integrity: stored decideInputHash ` +
        `${req.decideInputHash} != canonicalHash(exactValidatedDecideInputJson) ${recomputed}`,
    );
  }
  return req;
}

function wrapPiUnexpected(e: unknown, whileDoing: string): PurchaseIntentInvariantError {
  if (e instanceof PurchaseIntentInvariantError) return e;
  const message = e instanceof Error ? e.message : String(e);
  return new PurchaseIntentInvariantError(
    `unexpected database failure while ${whileDoing}: ${message}`,
    { cause: e },
  );
}

export class PurchaseIntentDecisionRepository {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async findDecisionRequestByIntent(intentId: string): Promise<FrozenDecisionRequest | null> {
    const row = await this.prisma.purchaseIntentDecisionRequest.findUnique({ where: { intentId } });
    return row ? assertRequestSelfIntegrity(rowToRequest(row)) : null;
  }

  /**
   * Freeze the exact decision request for a finalized intent (§12), ONCE. The caller must have already
   * verified `decideInputHash === canonicalHash(exactValidatedDecideInputJson)`; we re-assert it here
   * (defense-in-depth) and again on every reload. Idempotent + race-safe: a concurrent/earlier freeze
   * for the SAME intent is reconciled and returned iff it is byte-identical in every frozen field
   * (else a typed historical conflict — history is never rewritten).
   */
  async freezeDecisionRequest(args: FreezeDecisionRequestArgs): Promise<FrozenDecisionRequest> {
    const recomputed = canonicalHash(args.exactValidatedDecideInputJson);
    if (recomputed !== args.decideInputHash) {
      throw new PurchaseIntentDecisionRequestIntegrityError(
        `refusing to freeze: decideInputHash ${args.decideInputHash} != canonicalHash(input) ${recomputed}`,
      );
    }
    try {
      const row = await this.prisma.purchaseIntentDecisionRequest.create({
        data: {
          intentId: args.intentId,
          finalizationId: args.finalizationId,
          decisionRequestSchemaVersion: args.decisionRequestSchemaVersion,
          exactValidatedDecideInputJson:
            args.exactValidatedDecideInputJson as Prisma.InputJsonValue,
          decideInputHash: args.decideInputHash,
          expectedEngineInputSchemaVersion: args.expectedEngineInputSchemaVersion,
          expectedEngineContractVersion: args.expectedEngineContractVersion,
          expectedCorpusVersion: args.expectedCorpusVersion,
          holidayCalendarVersion: args.holidayCalendarVersion,
          businessDecisionKey: args.businessDecisionKey,
          m3_5aIdempotencyKey: args.m3_5aIdempotencyKey,
        },
      });
      return assertRequestSelfIntegrity(rowToRequest(row));
    } catch (e) {
      if (!isUniqueViolation(e)) throw wrapPiUnexpected(e, 'freeze decision request');
      const existing = await this.findDecisionRequestByIntent(args.intentId);
      if (!existing) {
        // The conflict was on businessDecisionKey / m3_5aIdempotencyKey against a DIFFERENT intent —
        // a derived-key collision across intents is a hard integrity fault (keys are intent-scoped).
        throw new PurchaseIntentHistoricalConflictError(
          'BUSINESS_KEY_CONFLICT',
          'derived decision key already frozen for a different intent',
        );
      }
      this.assertFreezeMatches(existing, args);
      return existing;
    }
  }

  private assertFreezeMatches(
    existing: FrozenDecisionRequest,
    args: FreezeDecisionRequestArgs,
  ): void {
    const mismatch =
      existing.finalizationId !== args.finalizationId ||
      existing.decisionRequestSchemaVersion !== args.decisionRequestSchemaVersion ||
      existing.decideInputHash !== args.decideInputHash ||
      existing.expectedEngineInputSchemaVersion !== args.expectedEngineInputSchemaVersion ||
      existing.expectedEngineContractVersion !== args.expectedEngineContractVersion ||
      existing.expectedCorpusVersion !== args.expectedCorpusVersion ||
      existing.holidayCalendarVersion !== args.holidayCalendarVersion ||
      existing.businessDecisionKey !== args.businessDecisionKey ||
      existing.m3_5aIdempotencyKey !== args.m3_5aIdempotencyKey;
    if (mismatch) {
      throw new PurchaseIntentHistoricalConflictError(
        'SEMANTIC_MISMATCH',
        `an incompatible decision request is already frozen for intent ${args.intentId}`,
      );
    }
  }

  async findBindingByRequest(decisionRequestId: string): Promise<BindingRecord | null> {
    const row = await this.prisma.purchaseIntentDecisionBinding.findUnique({
      where: { decisionRequestId },
    });
    return row
      ? {
          id: row.id,
          decisionRequestId: row.decisionRequestId,
          snapshotId: row.snapshotId,
          replayed: true,
        }
      : null;
  }

  /**
   * Bind the M3.5A snapshot to the frozen request (§16/§17). Coherence is verified BEFORE the write:
   * the snapshot's businessDecisionKey and inputHash MUST equal the request's businessDecisionKey and
   * decideInputHash (the frozen requestHash === inputHash contract). Idempotent + race-safe: a binding
   * that already resolves the SAME snapshot is returned; a different snapshot for the same request is a
   * typed coherence fault.
   */
  async bindSnapshot(args: BindSnapshotArgs): Promise<BindingRecord> {
    if (args.snapshotBusinessDecisionKey !== args.requestBusinessDecisionKey) {
      throw new PurchaseIntentBindingCoherenceError(
        'BUSINESS_KEY',
        `snapshot businessDecisionKey ${args.snapshotBusinessDecisionKey} != request ` +
          `${args.requestBusinessDecisionKey}`,
      );
    }
    if (args.snapshotInputHash !== args.requestDecideInputHash) {
      throw new PurchaseIntentBindingCoherenceError(
        'INPUT_HASH',
        `snapshot inputHash ${args.snapshotInputHash} != request decideInputHash ` +
          `${args.requestDecideInputHash}`,
      );
    }
    try {
      const row = await this.prisma.purchaseIntentDecisionBinding.create({
        data: { decisionRequestId: args.decisionRequestId, snapshotId: args.snapshotId },
      });
      return {
        id: row.id,
        decisionRequestId: row.decisionRequestId,
        snapshotId: row.snapshotId,
        replayed: false,
      };
    } catch (e) {
      if (!isUniqueViolation(e)) throw wrapPiUnexpected(e, 'bind decision snapshot');
      const existing = await this.findBindingByRequest(args.decisionRequestId);
      if (existing) {
        if (existing.snapshotId !== args.snapshotId) {
          throw new PurchaseIntentBindingCoherenceError(
            'REQUEST_LINK',
            `request ${args.decisionRequestId} is already bound to a different snapshot`,
          );
        }
        return existing;
      }
      // The conflict was on snapshotId unique: the same snapshot is already bound to a DIFFERENT request.
      throw new PurchaseIntentBindingCoherenceError(
        'REQUEST_LINK',
        `snapshot ${args.snapshotId} is already bound to a different decision request`,
      );
    }
  }
}

/** Default repository over the shared Prisma client. */
export const purchaseIntentDecisionRepository = new PurchaseIntentDecisionRepository();

// PagaMenos · src/db — M3.5B-A2 decision-request / binding repository (A2 §12/§16/§17/§19). INTERNAL.
//
// The ONLY write path to the two immutable A2 decision tables. Both are append-only (DB triggers);
// freeze/bind are idempotent + race-safe via REAL unique constraints reconciled by explicit
// reload-and-prove. This repository performs NO engine/corpus work.
//
// HISTORICAL PARSER / SELF-INTEGRITY (Sol Finding 7): a frozen DecisionRequest is loaded through a
// RETAINED, VERSION-DISPATCHED parser — never an unsafe cast. On load it independently re-verifies:
// the retained schema version; the frozen DecideInput under the accepted `engineInputV1Schema`; the
// decideInputHash == canonicalHash(frozen input); the derived businessDecisionKey / m3_5aIdempotencyKey
// from the immutable intentId; the retained holiday fixture (resolvable + its content digest ==
// stored) and that the frozen holiday material equals the retained fixture dates; and that the corpus
// semantic-digest pin is present. Loading a historical version stays possible after the CURRENT
// creation version advances (retention); an UNKNOWN current creation version is refused at freeze; an
// UNKNOWN historical version is refused on load.
//
// AUTHORITATIVE BINDING (Sol Finding 4): `bindSnapshot` accepts only IDENTITIES + a sanctioned snapshot
// loader. It INDEPENDENTLY loads the frozen request row (through the parser) and the actual
// DecisionSnapshot (through the loader, which fully verifies it), then proves coherence from those
// AUTHORITATIVE rows — never from caller-described hashes/keys. A caller can therefore never cross-wire
// an unrelated snapshot to a request.
//
// Owning sanctioned service (module-capability AST test): `services/study-intent-decision.ts`.
import { Prisma, type PrismaClient } from '@prisma/client';

import {
  computeHolidayContentDigest,
  deriveBusinessDecisionKey,
  deriveM3_5aIdempotencyKey,
  PurchaseIntentBindingCoherenceError,
  PurchaseIntentDecisionRequestIntegrityError,
  PurchaseIntentHistoricalConflictError,
  PurchaseIntentInvariantError,
  PurchaseIntentUnsupportedInputSchemaError,
  resolveHolidayCalendarFixture,
} from '@/study';
import { canonicalHash } from '@/persistence/hash';
import { engineInputV1Schema } from '@/persistence/schema';
import type { DecisionSnapshotDto } from '@/persistence/schema';

import { prisma as defaultPrisma } from './client';
import { isUniqueViolation } from './study-support';

/** The A2 decision-request schema version created by NEW freezes. */
export const A2_DECISION_REQUEST_SCHEMA_VERSION_V1 = 'pagamenos.a2-decision-request.v1';
/** The version a NEW DecisionRequest is stamped with (separate from the retained set for loads). */
export const CURRENT_A2_DECISION_REQUEST_SCHEMA_VERSION = A2_DECISION_REQUEST_SCHEMA_VERSION_V1;
/** Retained parser versions — a historical request in any of these remains loadable forever. */
const RETAINED_DECISION_REQUEST_SCHEMA_VERSIONS = new Set<string>([
  A2_DECISION_REQUEST_SCHEMA_VERSION_V1,
]);

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
  expectedCorpusSemanticDigest: string;
  holidayCalendarVersion: string;
  holidayCalendarDigest: string;
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
  expectedCorpusSemanticDigest: string;
  holidayCalendarVersion: string;
  holidayCalendarDigest: string;
  businessDecisionKey: string;
  m3_5aIdempotencyKey: string;
}

export interface BindSnapshotArgs {
  decisionRequestId: string;
  snapshotId: string;
  /** Sanctioned authoritative snapshot loader (the M3.5A `loadDecisionSnapshot`); wired by the saga. */
  loadSnapshot: (id: string) => Promise<DecisionSnapshotDto | null>;
}

export interface BindingRecord {
  id: string;
  decisionRequestId: string;
  snapshotId: string;
  replayed: boolean;
}

type RequestRow = Prisma.PurchaseIntentDecisionRequestGetPayload<Record<string, never>>;

/**
 * Version-dispatched retained parser + full self-integrity verification (A2 §19; Sol Finding 7). Throws
 * a typed error on an unknown version or any integrity failure. Never casts stored JSON blindly.
 */
function parseFrozenDecisionRequest(row: RequestRow): FrozenDecisionRequest {
  if (!RETAINED_DECISION_REQUEST_SCHEMA_VERSIONS.has(row.decisionRequestSchemaVersion)) {
    throw new PurchaseIntentUnsupportedInputSchemaError(row.decisionRequestSchemaVersion);
  }
  // 1. The frozen DecideInput MUST parse under the accepted retained engine-input schema.
  let parsedInput: unknown;
  try {
    parsedInput = engineInputV1Schema.parse(row.exactValidatedDecideInputJson);
  } catch (e) {
    throw new PurchaseIntentDecisionRequestIntegrityError(
      `frozen DecideInput for request ${row.id} failed schema validation: ${
        e instanceof Error ? e.message : String(e)
      }`,
    );
  }
  // 2. decideInputHash == canonicalHash(frozen input) (self-integrity over the exact stored payload).
  const recomputed = canonicalHash(row.exactValidatedDecideInputJson);
  if (recomputed !== row.decideInputHash) {
    throw new PurchaseIntentDecisionRequestIntegrityError(
      `request ${row.id} decideInputHash ${row.decideInputHash} != canonicalHash(frozen input) ${recomputed}`,
    );
  }
  // 3. Derived identities MUST reproduce from the immutable intentId (§11/§15).
  if (row.businessDecisionKey !== deriveBusinessDecisionKey(row.intentId)) {
    throw new PurchaseIntentDecisionRequestIntegrityError(
      `request ${row.id} businessDecisionKey does not derive from its intentId`,
    );
  }
  if (row.m3_5aIdempotencyKey !== deriveM3_5aIdempotencyKey(row.intentId)) {
    throw new PurchaseIntentDecisionRequestIntegrityError(
      `request ${row.id} m3_5aIdempotencyKey does not derive from its intentId`,
    );
  }
  // 4. Retained holiday fixture: resolvable by version, content digest reproduces, and the frozen
  //    holiday material equals the retained fixture dates.
  const fixture = resolveHolidayCalendarFixture(row.holidayCalendarVersion); // throws if unretained
  const fixtureDigest = computeHolidayContentDigest(fixture);
  if (fixtureDigest !== row.holidayCalendarDigest) {
    throw new PurchaseIntentDecisionRequestIntegrityError(
      `request ${row.id} holidayCalendarDigest ${row.holidayCalendarDigest} != retained fixture digest ${fixtureDigest}`,
    );
  }
  const frozenHoliday = (parsedInput as { holidayCalendar?: unknown }).holidayCalendar;
  if (
    !Array.isArray(frozenHoliday) ||
    canonicalHash(frozenHoliday) !== canonicalHash([...fixture.normalizedDates])
  ) {
    throw new PurchaseIntentDecisionRequestIntegrityError(
      `request ${row.id} frozen holiday material does not equal retained fixture ${row.holidayCalendarVersion}`,
    );
  }
  // 5. The corpus semantic-authority pin must be present (freeze-time recomputed anchor).
  if (
    typeof row.expectedCorpusSemanticDigest !== 'string' ||
    row.expectedCorpusSemanticDigest.length === 0
  ) {
    throw new PurchaseIntentDecisionRequestIntegrityError(
      `request ${row.id} is missing its corpus semantic-authority pin`,
    );
  }
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
    expectedCorpusSemanticDigest: row.expectedCorpusSemanticDigest,
    holidayCalendarVersion: row.holidayCalendarVersion,
    holidayCalendarDigest: row.holidayCalendarDigest,
    businessDecisionKey: row.businessDecisionKey,
    m3_5aIdempotencyKey: row.m3_5aIdempotencyKey,
  };
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
    return row ? parseFrozenDecisionRequest(row) : null;
  }

  async findDecisionRequestById(id: string): Promise<FrozenDecisionRequest | null> {
    const row = await this.prisma.purchaseIntentDecisionRequest.findUnique({ where: { id } });
    return row ? parseFrozenDecisionRequest(row) : null;
  }

  /**
   * Freeze the exact decision request for a finalized intent (§12), ONCE. Only the CURRENT creation
   * schema version may be frozen; the caller must have verified `decideInputHash ==
   * canonicalHash(exactValidatedDecideInputJson)` (re-asserted here and on every reload). Idempotent +
   * race-safe: a concurrent/earlier freeze for the SAME intent is reconciled and returned iff it is
   * byte-identical in every frozen field (else a typed historical conflict — history is never rewritten).
   */
  async freezeDecisionRequest(args: FreezeDecisionRequestArgs): Promise<FrozenDecisionRequest> {
    if (args.decisionRequestSchemaVersion !== CURRENT_A2_DECISION_REQUEST_SCHEMA_VERSION) {
      throw new PurchaseIntentUnsupportedInputSchemaError(args.decisionRequestSchemaVersion);
    }
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
          expectedCorpusSemanticDigest: args.expectedCorpusSemanticDigest,
          holidayCalendarVersion: args.holidayCalendarVersion,
          holidayCalendarDigest: args.holidayCalendarDigest,
          businessDecisionKey: args.businessDecisionKey,
          m3_5aIdempotencyKey: args.m3_5aIdempotencyKey,
        },
      });
      return parseFrozenDecisionRequest(row);
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
      existing.expectedCorpusSemanticDigest !== args.expectedCorpusSemanticDigest ||
      existing.holidayCalendarVersion !== args.holidayCalendarVersion ||
      existing.holidayCalendarDigest !== args.holidayCalendarDigest ||
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
   * Bind the M3.5A snapshot to the frozen request (§16/§17; Sol Finding 4). Loads BOTH authoritative
   * rows independently — the frozen request (through the version-dispatched parser) and the actual
   * DecisionSnapshot (through the sanctioned loader, which fully verifies it) — and proves coherence
   * from those rows, NOT from any caller-described hash/key. Coherence: snapshot.businessDecisionKey ==
   * request.businessDecisionKey AND snapshot.inputHash == request.decideInputHash. Idempotent +
   * race-safe: a binding already resolving the SAME snapshot is returned; a different snapshot for this
   * request, or this snapshot for a different request, is a typed coherence fault.
   */
  async bindSnapshot(args: BindSnapshotArgs): Promise<BindingRecord> {
    const request = await this.findDecisionRequestById(args.decisionRequestId);
    if (!request) {
      throw new PurchaseIntentInvariantError(
        `decision request ${args.decisionRequestId} not found for binding`,
      );
    }
    const snapshot = await args.loadSnapshot(args.snapshotId);
    if (!snapshot) {
      throw new PurchaseIntentBindingCoherenceError(
        'SEMANTIC',
        `snapshot ${args.snapshotId} not found / unloadable for binding`,
      );
    }
    this.assertSnapshotCoheres(request, snapshot);

    try {
      const row = await this.prisma.purchaseIntentDecisionBinding.create({
        data: { decisionRequestId: request.id, snapshotId: snapshot.id },
      });
      return {
        id: row.id,
        decisionRequestId: row.decisionRequestId,
        snapshotId: row.snapshotId,
        replayed: false,
      };
    } catch (e) {
      if (!isUniqueViolation(e)) throw wrapPiUnexpected(e, 'bind decision snapshot');
      // Reload-and-prove BOTH sides on the exact uniqueness that fired.
      const existing = await this.findBindingByRequest(request.id);
      if (existing) {
        if (existing.snapshotId !== snapshot.id) {
          throw new PurchaseIntentBindingCoherenceError(
            'REQUEST_LINK',
            `request ${request.id} is already bound to a different snapshot`,
          );
        }
        return existing;
      }
      throw new PurchaseIntentBindingCoherenceError(
        'REQUEST_LINK',
        `snapshot ${snapshot.id} is already bound to a different decision request`,
      );
    }
  }

  private assertSnapshotCoheres(
    request: FrozenDecisionRequest,
    snapshot: DecisionSnapshotDto,
  ): void {
    if (snapshot.businessDecisionKey !== request.businessDecisionKey) {
      throw new PurchaseIntentBindingCoherenceError(
        'BUSINESS_KEY',
        `snapshot businessDecisionKey ${snapshot.businessDecisionKey} != request ${request.businessDecisionKey}`,
      );
    }
    if (snapshot.inputHash !== request.decideInputHash) {
      throw new PurchaseIntentBindingCoherenceError(
        'INPUT_HASH',
        `snapshot inputHash ${snapshot.inputHash} != request decideInputHash ${request.decideInputHash}`,
      );
    }
  }
}

/** Default repository over the shared Prisma client. */
export const purchaseIntentDecisionRepository = new PurchaseIntentDecisionRepository();

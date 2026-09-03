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
  A2_CONTEXT_SCHEMA_VERSION_V1,
  A2_PORTFOLIO_SCHEMA_VERSION_V1,
  computeHolidayContentDigest,
  deriveBusinessDecisionKey,
  deriveM3_5aIdempotencyKey,
  normalizeA2PurchaseSignatureV1,
  normalizeEligibilityPortfolioV1,
  PurchaseIntentBindingCoherenceError,
  PurchaseIntentDecisionRequestIntegrityError,
  PurchaseIntentHistoricalConflictError,
  PurchaseIntentInvalidatedError,
  PurchaseIntentInvariantError,
  PurchaseIntentNotFinalizedError,
  PurchaseIntentOwnershipError,
  PurchaseIntentUnsupportedInputSchemaError,
  resolveHolidayCalendarFixture,
} from '@/study';
import { canonicalHash } from '@/persistence/hash';
import { engineInputV1Schema } from '@/persistence/schema';
import type { DecisionSnapshotDto } from '@/persistence/schema';
import { ENGINE_INPUT_SCHEMA_VERSION } from '@/persistence';
import type { DecideInput } from '@/engine';

import { prisma as defaultPrisma } from './client';
import { classifyUniqueViolation, isUniqueViolation, type UniqueConstraintSpec } from './p2002';

/**
 * The exact unique constraints the A2 decision-request / binding writes can collide on (Sol Closure 4).
 * `P2002.meta.target` is an array of these Prisma field names; classification is by exact field set, and
 * any other target fails closed.
 */
const DR_INTENT: UniqueConstraintSpec = { id: 'DR_INTENT', fields: ['intentId'] };
const DR_FINALIZATION: UniqueConstraintSpec = { id: 'DR_FINALIZATION', fields: ['finalizationId'] };
const DR_BUSINESS_KEY: UniqueConstraintSpec = {
  id: 'DR_BUSINESS_KEY',
  fields: ['businessDecisionKey'],
};
const DR_IDEMPOTENCY: UniqueConstraintSpec = {
  id: 'DR_IDEMPOTENCY',
  fields: ['m3_5aIdempotencyKey'],
};
const FREEZE_CONSTRAINTS = [DR_INTENT, DR_FINALIZATION, DR_BUSINESS_KEY, DR_IDEMPOTENCY];
const BINDING_REQUEST: UniqueConstraintSpec = {
  id: 'BINDING_REQUEST',
  fields: ['decisionRequestId'],
};
const BINDING_SNAPSHOT: UniqueConstraintSpec = { id: 'BINDING_SNAPSHOT', fields: ['snapshotId'] };

/** Diagnostic emitted when an A2 P2002 reconciliation path is actually ENTERED (Sol Closure 4 proof). */
export interface A2UniqueReconcileEvent {
  op: 'freezeUnderLock' | 'freeze' | 'bindSnapshot';
  constraint: string;
  outcome: 'adopt-winner' | 'equivalent-reuse' | 'conflict';
}

/** The A2 decision-request schema version created by NEW freezes. */
export const A2_DECISION_REQUEST_SCHEMA_VERSION_V1 = 'pagamenos.a2-decision-request.v1';
/** The version a NEW DecisionRequest is stamped with (separate from the retained set for loads). */
export const CURRENT_A2_DECISION_REQUEST_SCHEMA_VERSION = A2_DECISION_REQUEST_SCHEMA_VERSION_V1;
/** Retained parser versions — a historical request in any of these remains loadable forever. */
const RETAINED_DECISION_REQUEST_SCHEMA_VERSIONS = new Set<string>([
  A2_DECISION_REQUEST_SCHEMA_VERSION_V1,
]);

/**
 * Retained, version-dispatched engine-input parsers (Sol Correction 6). `expectedEngineInputSchemaVersion`
 * SELECTS the parser that actually validates the frozen DecideInput — it is never a mere label. An
 * unknown version fails closed on load. Each parser validates + returns a typed DecideInput, so no load
 * path performs an unsafe `as DecideInput` cast.
 */
const RETAINED_ENGINE_INPUT_PARSERS: Record<string, (value: unknown) => DecideInput> = {
  // The value is VALIDATED by the accepted v1 schema before the type bridge — never a blind cast of raw
  // persisted JSON (Sol Closure 6). `.parse()` throws on any schema drift.
  [ENGINE_INPUT_SCHEMA_VERSION]: (value) =>
    engineInputV1Schema.parse(value) as unknown as DecideInput,
};

/**
 * Retained, version-dispatched parsers for the STORED PurchaseIntentContextVersion payload (Sol Closure
 * 6). Keyed by the row's own `contextSchemaVersion`; an unknown version fails closed. Each parser
 * re-validates the exact stored `purchaseSignatureJson` — a historical context row is never assumed to
 * be the current schema.
 */
const RETAINED_CONTEXT_PARSERS: Record<string, (json: unknown) => void> = {
  [A2_CONTEXT_SCHEMA_VERSION_V1]: (json) => {
    normalizeA2PurchaseSignatureV1(json);
  },
};

/**
 * Retained, version-dispatched parsers for the STORED EligibilityProfileVersion payload (Sol Closure 6).
 * Keyed by the row's own `portfolioSchemaVersion`; an unknown version fails closed.
 */
const RETAINED_PROFILE_PARSERS: Record<string, (json: unknown) => void> = {
  [A2_PORTFOLIO_SCHEMA_VERSION_V1]: (json) => {
    normalizeEligibilityPortfolioV1(json);
  },
};

/** Permitted characters for a historical schema/version/key label (V4.5 label grammar; Sol Closure 6). */
const LABEL_GRAMMAR = /^[A-Za-z0-9._:+-]+$/;
const MAX_LABEL_LENGTH = 128;

/**
 * Enforce the V4.5 historical label/version grammar (Sol Closure 6): trimmed, non-empty, ≤128 chars, and
 * (for schema/version/key identifiers) drawn from the permitted identifier charset. A label that is
 * internally hash-consistent but malformed is still rejected. `hashLike` allows the `sha256:<hex>` and
 * derived-key forms (same charset). Throws a typed integrity error.
 */
function assertHistoricalLabel(value: unknown, field: string, requestId: string): string {
  if (typeof value !== 'string') {
    throw new PurchaseIntentDecisionRequestIntegrityError(
      `request ${requestId} label ${field} is not a string`,
    );
  }
  if (value !== value.trim()) {
    throw new PurchaseIntentDecisionRequestIntegrityError(
      `request ${requestId} label ${field} is not trimmed`,
    );
  }
  if (value.length === 0 || value.length > MAX_LABEL_LENGTH) {
    throw new PurchaseIntentDecisionRequestIntegrityError(
      `request ${requestId} label ${field} length ${value.length} not in [1, ${MAX_LABEL_LENGTH}]`,
    );
  }
  if (!LABEL_GRAMMAR.test(value)) {
    throw new PurchaseIntentDecisionRequestIntegrityError(
      `request ${requestId} label ${field} contains characters outside the permitted grammar`,
    );
  }
  return value;
}

export interface FrozenDecisionRequest {
  id: string;
  intentId: string;
  finalizationId: string;
  decisionRequestSchemaVersion: string;
  exactValidatedDecideInputJson: unknown;
  /** The VALIDATED, version-dispatched-parsed DecideInput (never an unsafe cast). */
  parsedDecideInput: DecideInput;
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

/** The read-only §18 exact-historical finder (authoritative receipt+snapshot verification). Carries the
 * COMPLETE expected M3.5A material pins (Sol Closure 3) so the finder proves EXACT/NONE/CONFLICT itself. */
export type FindExactHistoricalDecisionFn = (query: {
  businessDecisionKey: string;
  idempotencyKey: string;
  inputHash: string;
  expectedEngineContractVersion: string;
  expectedEngineInputSchemaVersion: string;
  expectedCorpusVersion: string;
}) => Promise<{ kind: 'NONE' } | { kind: 'FOUND'; snapshot: DecisionSnapshotDto }>;

export interface BindSnapshotArgs {
  decisionRequestId: string;
  snapshotId: string;
  /**
   * Sanctioned §18 finder — the authoritative snapshot+receipt loader/verifier (wired by the saga to
   * the trusted `findExactHistoricalDecision`). bindSnapshot uses it to load the snapshot by the
   * request's own derived identity and to prove the M3.5A receipt/idempotency + integrity clauses.
   */
  findExact: FindExactHistoricalDecisionFn;
}

export interface BindingRecord {
  id: string;
  decisionRequestId: string;
  snapshotId: string;
  replayed: boolean;
}

/** The deterministic freeze material a saga produces for a sampled trusted `evaluatedAt` (A2 §13). */
export interface FrozenRequestMaterial {
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

export interface FreezeUnderLockArgs {
  intentId: string;
  assignmentId: string;
  /**
   * Deterministic build of the exact validated DecideInput + pins for the given trusted `evaluatedAt`.
   * Invoked at most ONCE — under the intent-root lock, for the freeze winner only. Every field it
   * produces except the winner's `evaluatedAt` is a deterministic function of the frozen authorities.
   */
  buildFreeze: (evaluatedAt: string, finalizationId: string) => FrozenRequestMaterial;
}

type RequestRow = Prisma.PurchaseIntentDecisionRequestGetPayload<Record<string, never>>;

/**
 * Version-dispatched retained parser + full self-integrity verification (A2 §19; Sol Finding 7). Throws
 * a typed error on an unknown version or any integrity failure. Never casts stored JSON blindly.
 */
function parseFrozenDecisionRequest(row: RequestRow): FrozenDecisionRequest {
  // 0. Label/version grammar (Sol Closure 6): every stored label is trimmed, non-empty, ≤128, and drawn
  //    from the permitted identifier charset — a hash-consistent but malformed label is still rejected.
  for (const field of [
    'decisionRequestSchemaVersion',
    'expectedEngineInputSchemaVersion',
    'expectedEngineContractVersion',
    'expectedCorpusVersion',
    'expectedCorpusSemanticDigest',
    'holidayCalendarVersion',
    'holidayCalendarDigest',
    'businessDecisionKey',
    'm3_5aIdempotencyKey',
    'decideInputHash',
  ] as const) {
    assertHistoricalLabel(row[field], field, row.id);
  }
  if (!RETAINED_DECISION_REQUEST_SCHEMA_VERSIONS.has(row.decisionRequestSchemaVersion)) {
    throw new PurchaseIntentUnsupportedInputSchemaError(row.decisionRequestSchemaVersion);
  }
  // 1. `expectedEngineInputSchemaVersion` SELECTS the retained engine-input parser (Sol Correction 6);
  //    an unknown version fails closed. The selected parser VALIDATES + returns the typed DecideInput.
  const engineParser = RETAINED_ENGINE_INPUT_PARSERS[row.expectedEngineInputSchemaVersion];
  if (!engineParser) {
    throw new PurchaseIntentUnsupportedInputSchemaError(row.expectedEngineInputSchemaVersion);
  }
  let parsedInput: DecideInput;
  try {
    parsedInput = engineParser(row.exactValidatedDecideInputJson);
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
  const frozenHoliday: unknown = parsedInput.holidayCalendar;
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
    parsedDecideInput: parsedInput,
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

/** Freeze-time well-formedness: only the CURRENT creation version, and hash == canonicalHash(input). */
function assertMaterialWellFormed(m: FrozenRequestMaterial): void {
  if (m.decisionRequestSchemaVersion !== CURRENT_A2_DECISION_REQUEST_SCHEMA_VERSION) {
    throw new PurchaseIntentUnsupportedInputSchemaError(m.decisionRequestSchemaVersion);
  }
  const recomputed = canonicalHash(m.exactValidatedDecideInputJson);
  if (recomputed !== m.decideInputHash) {
    throw new PurchaseIntentDecisionRequestIntegrityError(
      `refusing to freeze: decideInputHash ${m.decideInputHash} != canonicalHash(input) ${recomputed}`,
    );
  }
}

function wrapPiUnexpected(e: unknown, whileDoing: string): PurchaseIntentInvariantError {
  if (e instanceof PurchaseIntentInvariantError) return e;
  const message = e instanceof Error ? e.message : String(e);
  return new PurchaseIntentInvariantError(
    `unexpected database failure while ${whileDoing}: ${message}`,
    { cause: e },
  );
}

type Tx = Prisma.TransactionClient;

export class PurchaseIntentDecisionRepository {
  /**
   * @param now Trusted service clock, sampled UNDER the intent-root lock at the authoritative first
   *   freeze (A2 §13 evaluatedAt). Injectable for deterministic tests (INTERNAL only). Real clock default.
   */
  constructor(
    private readonly prisma: PrismaClient = defaultPrisma,
    private readonly now: () => Date = () => new Date(),
    /**
     * INTERNAL diagnostic sink invoked when a P2002 reconciliation path is actually entered — used by
     * tests to PROVE the loser took the intended catch (Sol Closure 4). No-op default; never affects
     * production behavior.
     */
    private readonly onReconcile: (event: A2UniqueReconcileEvent) => void = () => {},
  ) {}

  /**
   * Freeze the exact decision request UNDER the PurchaseIntent ROOT lock ONLY (A2 §13/§20 Case C; Sol
   * Closure 5). This decision-request/repair operation is NOT a new consent-gated collection fact, so it
   * must NOT acquire the ExperimentAssignment lock merely because lifecycle writes do — it serializes on
   * the intent root alone. Ownership is still verified (a read, not a lock). Because finalize and
   * invalidate also take the intent root (after the assignment), the root lock serializes freeze against
   * them: the Case-C state (finalized + NOT invalidated) is RE-CHECKED under the root lock, so a
   * concurrent invalidation cannot interleave after a stale inspection and no stale pre-invalidation
   * freeze is possible. Acquiring only the root also avoids the assignment→intent lock inversion the
   * lifecycle ops would otherwise create. The trusted `evaluatedAt` is sampled ONCE under the lock for
   * the freeze winner only; concurrent entries find the winner's frozen request and ADOPT it verbatim. A
   * cross-connection race is a P2002 backstop that also adopts the winner (same intent) or fails closed
   * on a derived-key collision across intents.
   */
  async freezeDecisionRequestUnderLock(args: FreezeUnderLockArgs): Promise<FrozenDecisionRequest> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // ROOT-ONLY serialization (Sol Closure 5): lock the PurchaseIntent root + verify ownership; do
        // NOT lock the assignment (this is not a consent-gated collection fact).
        await this.lockIntentOwnedBy(tx, args.intentId, args.assignmentId);

        // Case C authoritative state re-check UNDER the intent root lock.
        const invalidation = await tx.purchaseIntentInvalidation.findUnique({
          where: { invalidatedIntentId: args.intentId },
          select: { id: true },
        });
        if (invalidation) throw new PurchaseIntentInvalidatedError();
        const finalization = await tx.purchaseIntentFinalization.findUnique({
          where: { intentId: args.intentId },
          select: { id: true },
        });
        if (!finalization) throw new PurchaseIntentNotFinalizedError();

        const existing = await tx.purchaseIntentDecisionRequest.findUnique({
          where: { intentId: args.intentId },
        });
        if (existing) return parseFrozenDecisionRequest(existing); // adopt the freeze winner verbatim

        // Trusted freeze instant sampled ONCE, under the lock, for the winner (§13).
        const evaluatedAt = this.now().toISOString();
        const material = args.buildFreeze(evaluatedAt, finalization.id);
        assertMaterialWellFormed(material);
        const row = await tx.purchaseIntentDecisionRequest.create({
          data: {
            intentId: args.intentId,
            finalizationId: finalization.id,
            decisionRequestSchemaVersion: material.decisionRequestSchemaVersion,
            exactValidatedDecideInputJson:
              material.exactValidatedDecideInputJson as Prisma.InputJsonValue,
            decideInputHash: material.decideInputHash,
            expectedEngineInputSchemaVersion: material.expectedEngineInputSchemaVersion,
            expectedEngineContractVersion: material.expectedEngineContractVersion,
            expectedCorpusVersion: material.expectedCorpusVersion,
            expectedCorpusSemanticDigest: material.expectedCorpusSemanticDigest,
            holidayCalendarVersion: material.holidayCalendarVersion,
            holidayCalendarDigest: material.holidayCalendarDigest,
            businessDecisionKey: material.businessDecisionKey,
            m3_5aIdempotencyKey: material.m3_5aIdempotencyKey,
          },
        });
        return parseFrozenDecisionRequest(row);
      });
    } catch (e) {
      if (!isUniqueViolation(e)) throw e;
      // Exact classification (Sol Closure 4): a freeze insert may only collide on intentId /
      // finalizationId / businessDecisionKey / m3_5aIdempotencyKey; anything else is fail-closed.
      const cls = classifyUniqueViolation(e, FREEZE_CONSTRAINTS);
      if (!cls.matched)
        throw wrapPiUnexpected(e, `freeze under lock (unexpected unique: ${cls.reason})`);
      // Cross-connection backstop: the intent's request already exists → adopt the winner (equivalent).
      const existing = await this.findDecisionRequestByIntent(args.intentId);
      if (existing) {
        this.onReconcile({ op: 'freezeUnderLock', constraint: cls.id, outcome: 'adopt-winner' });
        return existing;
      }
      // The collision was on a DERIVED key (businessDecisionKey / m3_5aIdempotencyKey) against a
      // DIFFERENT intent — the intent-scoped derived keys collided across intents: integrity fault.
      this.onReconcile({ op: 'freezeUnderLock', constraint: cls.id, outcome: 'conflict' });
      throw new PurchaseIntentHistoricalConflictError(
        'BUSINESS_KEY_CONFLICT',
        'derived decision key already frozen for a different intent',
      );
    }
  }

  /**
   * Lock the PurchaseIntent ROOT row (FOR UPDATE) and verify ownership (a read). This is the SOLE
   * serialization point for a Case-C freeze (Sol Closure 5) — no assignment lock is taken here.
   */
  private async lockIntentOwnedBy(tx: Tx, intentId: string, assignmentId: string): Promise<void> {
    const locked = await tx.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT "id" FROM "purchase_intent" WHERE "id" = ${intentId}::uuid FOR UPDATE`,
    );
    if (locked.length === 0) {
      throw new PurchaseIntentInvariantError(`purchase intent ${intentId} not found`);
    }
    const owner = await tx.purchaseIntent.findUnique({
      where: { id: intentId },
      select: { captureToken: { select: { assignmentId: true } } },
    });
    if (!owner || owner.captureToken.assignmentId !== assignmentId) {
      throw new PurchaseIntentOwnershipError();
    }
  }

  async findDecisionRequestByIntent(intentId: string): Promise<FrozenDecisionRequest | null> {
    const row = await this.prisma.purchaseIntentDecisionRequest.findUnique({ where: { intentId } });
    if (!row) return null;
    const request = parseFrozenDecisionRequest(row);
    await this.assertRequestCrossTableCoherence(request);
    return request;
  }

  async findDecisionRequestById(id: string): Promise<FrozenDecisionRequest | null> {
    const row = await this.prisma.purchaseIntentDecisionRequest.findUnique({ where: { id } });
    if (!row) return null;
    const request = parseFrozenDecisionRequest(row);
    await this.assertRequestCrossTableCoherence(request);
    return request;
  }

  /**
   * Authoritative-load cross-table self-integrity (Sol Closure 6): the DecisionRequest loader itself
   * verifies coherence against the authoritative PurchaseIntent / Finalization / exact context version /
   * exact eligibility-profile version / ExperimentAssignment rows — validation is NOT postponed to
   * snapshot binding. It (a) reloads the finalization the request pins and proves it belongs to the
   * intent, (b) proves the pinned context version belongs to the intent and the pinned eligibility
   * profile belongs to the intent's assignment, (c) re-parses BOTH stored payloads through their
   * RETAINED, version-dispatched parsers (a historical row is never assumed current schema), and (d)
   * enforces the label grammar on the stored context/profile schema versions. Any failure is a typed
   * integrity/relationship fault. Binding re-verifies relationship independently (defense in depth).
   */
  private async assertRequestCrossTableCoherence(request: FrozenDecisionRequest): Promise<void> {
    const fin = await this.prisma.purchaseIntentFinalization.findUnique({
      where: { id: request.finalizationId },
      select: {
        intentId: true,
        contextVersion: {
          select: {
            intentId: true,
            contextSchemaVersion: true,
            purchaseSignatureJson: true,
          },
        },
        eligibilityProfileVersion: {
          select: {
            assignmentId: true,
            portfolioSchemaVersion: true,
            portfolioJson: true,
          },
        },
      },
    });
    const intent = await this.prisma.purchaseIntent.findUnique({
      where: { id: request.intentId },
      select: { captureToken: { select: { assignmentId: true } } },
    });
    if (!fin || !intent) {
      throw new PurchaseIntentDecisionRequestIntegrityError(
        `request ${request.id} finalization/intent rows missing at authoritative load`,
      );
    }
    // (a)+(b) Relationship coherence from authoritative rows.
    if (
      fin.intentId !== request.intentId ||
      fin.contextVersion.intentId !== request.intentId ||
      fin.eligibilityProfileVersion.assignmentId !== intent.captureToken.assignmentId
    ) {
      throw new PurchaseIntentDecisionRequestIntegrityError(
        `request ${request.id} finalization/context/profile do not cohere with its intent/assignment`,
      );
    }
    // (d) Label grammar on the stored context/profile schema versions.
    assertHistoricalLabel(
      fin.contextVersion.contextSchemaVersion,
      'contextSchemaVersion',
      request.id,
    );
    assertHistoricalLabel(
      fin.eligibilityProfileVersion.portfolioSchemaVersion,
      'portfolioSchemaVersion',
      request.id,
    );
    // (c) Retained, version-dispatched re-parse of BOTH stored payloads (fail closed on unknown version).
    const ctxParser = RETAINED_CONTEXT_PARSERS[fin.contextVersion.contextSchemaVersion];
    if (!ctxParser) {
      throw new PurchaseIntentUnsupportedInputSchemaError(fin.contextVersion.contextSchemaVersion);
    }
    const profParser =
      RETAINED_PROFILE_PARSERS[fin.eligibilityProfileVersion.portfolioSchemaVersion];
    if (!profParser) {
      throw new PurchaseIntentUnsupportedInputSchemaError(
        fin.eligibilityProfileVersion.portfolioSchemaVersion,
      );
    }
    try {
      ctxParser(fin.contextVersion.purchaseSignatureJson);
      profParser(fin.eligibilityProfileVersion.portfolioJson);
    } catch (e) {
      throw new PurchaseIntentDecisionRequestIntegrityError(
        `request ${request.id} stored context/profile payload failed retained re-validation: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }
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
      const cls = classifyUniqueViolation(e, FREEZE_CONSTRAINTS);
      if (!cls.matched)
        throw wrapPiUnexpected(e, `freeze decision request (unexpected unique: ${cls.reason})`);
      const existing = await this.findDecisionRequestByIntent(args.intentId);
      if (!existing) {
        // The conflict was on businessDecisionKey / m3_5aIdempotencyKey against a DIFFERENT intent —
        // a derived-key collision across intents is a hard integrity fault (keys are intent-scoped).
        this.onReconcile({ op: 'freeze', constraint: cls.id, outcome: 'conflict' });
        throw new PurchaseIntentHistoricalConflictError(
          'BUSINESS_KEY_CONFLICT',
          'derived decision key already frozen for a different intent',
        );
      }
      this.assertFreezeMatches(existing, args);
      this.onReconcile({ op: 'freeze', constraint: cls.id, outcome: 'equivalent-reuse' });
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
    const snapshot = await this.proveCoherentSnapshot(request, args.snapshotId, args.findExact);

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
      // Exact classification (Sol Closure 4): a binding insert can only collide on decisionRequestId or
      // snapshotId; anything else fails closed.
      const cls = classifyUniqueViolation(e, [BINDING_REQUEST, BINDING_SNAPSHOT]);
      if (!cls.matched)
        throw wrapPiUnexpected(e, `bind decision snapshot (unexpected unique: ${cls.reason})`);
      // Reload-and-prove: rerun the COMPLETE predicate against the persisted winner (Sol Correction 4).
      const existing = await this.findBindingByRequest(request.id);
      if (existing) {
        if (existing.snapshotId !== snapshot.id) {
          this.onReconcile({ op: 'bindSnapshot', constraint: cls.id, outcome: 'conflict' });
          throw new PurchaseIntentBindingCoherenceError(
            'REQUEST_LINK',
            `request ${request.id} is already bound to a different snapshot`,
          );
        }
        await this.proveCoherentSnapshot(request, existing.snapshotId, args.findExact);
        this.onReconcile({ op: 'bindSnapshot', constraint: cls.id, outcome: 'equivalent-reuse' });
        return existing;
      }
      // Constraint fired on snapshotId → this snapshot is already bound to a DIFFERENT request.
      this.onReconcile({ op: 'bindSnapshot', constraint: cls.id, outcome: 'conflict' });
      throw new PurchaseIntentBindingCoherenceError(
        'REQUEST_LINK',
        `snapshot ${snapshot.id} is already bound to a different decision request`,
      );
    }
  }

  /**
   * The COMPLETE V4.5 §17 nine-clause snapshot/request coherence predicate (Sol Correction 4). Proves,
   * from AUTHORITATIVE persisted rows only, that `snapshotId` is exactly the M3.5A decision for `request`.
   * No partial-match snapshot (matching a subset of clauses) can bind.
   */
  private async proveCoherentSnapshot(
    request: FrozenDecisionRequest,
    snapshotId: string,
    findExact: FindExactHistoricalDecisionFn,
  ): Promise<DecisionSnapshotDto> {
    // Clauses 1 (M3.5A receipt/idempotency identity) + 8 (snapshot self-integrity): the §18 finder
    // loads the snapshot from the receipt for (DECISION_PERSIST_V1, m3_5aIdempotencyKey), asserts
    // receipt.requestHash == inputHash and snapshot.businessDecisionKey == businessDecisionKey, and runs
    // verifyHistoricalSnapshot. It is keyed on the REQUEST's own derived identity, never a caller value.
    const found = await findExact({
      businessDecisionKey: request.businessDecisionKey,
      idempotencyKey: request.m3_5aIdempotencyKey,
      inputHash: request.decideInputHash,
      expectedEngineContractVersion: request.expectedEngineContractVersion,
      expectedEngineInputSchemaVersion: request.expectedEngineInputSchemaVersion,
      expectedCorpusVersion: request.expectedCorpusVersion,
    });
    if (found.kind !== 'FOUND') {
      throw new PurchaseIntentBindingCoherenceError(
        'IDEMPOTENCY',
        `no exact historical decision for request ${request.id} identity`,
      );
    }
    const snapshot = found.snapshot;
    if (snapshot.id !== snapshotId) {
      throw new PurchaseIntentBindingCoherenceError(
        'IDEMPOTENCY',
        `finder snapshot ${snapshot.id} != requested snapshot ${snapshotId}`,
      );
    }
    // Clause 2 businessDecisionKey.
    if (snapshot.businessDecisionKey !== request.businessDecisionKey) {
      throw new PurchaseIntentBindingCoherenceError(
        'BUSINESS_KEY',
        `snapshot businessDecisionKey ${snapshot.businessDecisionKey} != request ${request.businessDecisionKey}`,
      );
    }
    // Clause 3 DecideInput / inputHash.
    if (snapshot.inputHash !== request.decideInputHash) {
      throw new PurchaseIntentBindingCoherenceError(
        'INPUT_HASH',
        `snapshot inputHash ${snapshot.inputHash} != request decideInputHash ${request.decideInputHash}`,
      );
    }
    // Clause 4 engine contract version / stamp.
    if (snapshot.engineContractVersion !== request.expectedEngineContractVersion) {
      throw new PurchaseIntentBindingCoherenceError(
        'ENGINE_CONTRACT',
        `snapshot engineContractVersion ${snapshot.engineContractVersion} != request ${request.expectedEngineContractVersion}`,
      );
    }
    // Clause 5 engine-input schema version.
    if (snapshot.engineInputSchemaVersion !== request.expectedEngineInputSchemaVersion) {
      throw new PurchaseIntentBindingCoherenceError(
        'ENGINE_INPUT_SCHEMA',
        `snapshot engineInputSchemaVersion ${snapshot.engineInputSchemaVersion} != request ${request.expectedEngineInputSchemaVersion}`,
      );
    }
    // Clause 6 corpus authority / version (+ the A2 semantic-digest pin must be present).
    if (snapshot.corpusVersion !== request.expectedCorpusVersion) {
      throw new PurchaseIntentBindingCoherenceError(
        'CORPUS',
        `snapshot corpusVersion ${snapshot.corpusVersion} != request ${request.expectedCorpusVersion}`,
      );
    }
    if (!request.expectedCorpusSemanticDigest) {
      throw new PurchaseIntentBindingCoherenceError(
        'CORPUS',
        `request ${request.id} is missing its corpus semantic-authority pin`,
      );
    }
    // Clause 7 request ↔ finalization ↔ context ↔ profile ↔ intent/assignment relationship.
    await this.assertRequestRelationships(request);
    // Clause 9 derived-key reproduction (businessDecisionKey / m3_5aIdempotencyKey from intentId) is
    // enforced by the version-dispatched parser on every request load (findDecisionRequestById above).
    return snapshot;
  }

  /** Clause 7: the request's finalization/context/profile all belong to its intent + assignment. */
  private async assertRequestRelationships(request: FrozenDecisionRequest): Promise<void> {
    const fin = await this.prisma.purchaseIntentFinalization.findUnique({
      where: { id: request.finalizationId },
      select: {
        intentId: true,
        contextVersion: { select: { intentId: true } },
        eligibilityProfileVersion: { select: { assignmentId: true } },
      },
    });
    const intent = await this.prisma.purchaseIntent.findUnique({
      where: { id: request.intentId },
      select: { captureToken: { select: { assignmentId: true } } },
    });
    if (!fin || !intent) {
      throw new PurchaseIntentBindingCoherenceError(
        'RELATIONSHIP',
        `request ${request.id} finalization/intent rows missing`,
      );
    }
    if (
      fin.intentId !== request.intentId ||
      fin.contextVersion.intentId !== request.intentId ||
      fin.eligibilityProfileVersion.assignmentId !== intent.captureToken.assignmentId
    ) {
      throw new PurchaseIntentBindingCoherenceError(
        'RELATIONSHIP',
        `request ${request.id} finalization/context/profile do not cohere with its intent/assignment`,
      );
    }
  }
}

/** Default repository over the shared Prisma client. */
export const purchaseIntentDecisionRepository = new PurchaseIntentDecisionRepository();

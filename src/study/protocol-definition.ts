// PagaMenos · src/study — AnalysisProtocol definition schema, canonicalization & digest (spec §2/§2.1).
//
// A protocol's scientific semantics live ENTIRELY in its verified `definitionJson` — there are no
// lifted authoritative scalar columns (spec §2). This module owns the ONE versioned application
// canonicalization path:
//
//   builder input → parse (frozen local schema @definitionSchemaVersion) → normalized definition
//     → canonical JSON (@canonicalizationVersion, reusing the accepted M3.5A serializer) → SHA-256
//     → digest
//
// and the historical load/verify path, which selects the parser + canonicalizer by the ROW's OWN
// stored version tags and recomputes the digest, FAILING CLOSED on mismatch or on an unknown version
// (spec §2.1: no hard-coded runtime fallback to "current constants", no second canonicalizer).
//
// A1 treats the definition body as OPAQUE, well-formed scientific parameters: it is validated for
// structural well-formedness and round-trips, but nothing in A1 consumes it as behavioral authority.
// Production Protocol v1 stays deferred (spec §3); tests use synthetic complete definitions.
import { z } from 'zod';

import { canonicalize, sha256Hex } from '@/persistence';

import {
  StudyProtocolDigestMismatchError,
  StudyValidationError,
  UnsupportedStudyVersionError,
} from './errors';
import { CANONICALIZATION_VERSION_V1, DEFINITION_SCHEMA_VERSION_V1 } from './versions';

/**
 * Frozen v1 analysis-protocol definition schema. `.strict()` rejects unknown keys so the persisted
 * normalized JSON is exactly the accepted shape. These fields are validated for well-formedness only
 * — A1 never lifts them to authoritative columns nor consumes them (spec §2/§3).
 */
export const analysisProtocolDefinitionV1Schema = z
  .object({
    observationWindowWeeks: z.number().int().positive(),
    contaminationWindowHours: z.number().int().nonnegative(),
    minimumVerifiedLevel: z.string().min(1),
    minimumIndependentOccasions: z.number().int().positive(),
  })
  .strict();

export type AnalysisProtocolDefinitionV1 = z.infer<typeof analysisProtocolDefinitionV1Schema>;

/** A normalized, persist-ready definition plus the version tags and digest that pin it forever. */
export interface NormalizedProtocolDefinition {
  definitionSchemaVersion: string;
  canonicalizationVersion: string;
  definitionJson: Record<string, unknown>;
  definitionDigest: string;
}

/** Parse + normalize a raw definition body under a frozen schema version (fail closed on unknown). */
function parseDefinition(
  definitionSchemaVersion: string,
  rawDefinition: unknown,
): Record<string, unknown> {
  if (definitionSchemaVersion !== DEFINITION_SCHEMA_VERSION_V1) {
    throw new UnsupportedStudyVersionError('definitionSchemaVersion', definitionSchemaVersion);
  }
  const result = analysisProtocolDefinitionV1Schema.safeParse(rawDefinition);
  if (!result.success) {
    throw new StudyValidationError('invalid analysis-protocol definition', result.error.issues);
  }
  // The parsed object IS the normalized definition (a plain, finite-JSON object).
  return result.data as Record<string, unknown>;
}

/** Canonicalize a normalized definition under a canonicalization version (fail closed on unknown). */
function canonicalizeDefinition(
  canonicalizationVersion: string,
  normalized: Record<string, unknown>,
): string {
  if (canonicalizationVersion !== CANONICALIZATION_VERSION_V1) {
    throw new UnsupportedStudyVersionError('canonicalizationVersion', canonicalizationVersion);
  }
  // v1 = the accepted M3.5A canonical JSON serializer (Unicode-ordered keys, dropped-undefined, …).
  return canonicalize(normalized);
}

/**
 * Build a normalized, persist-ready protocol definition from trusted builder input. Parses under the
 * given (frozen) schema version, canonicalizes under the given canonicalization version, and computes
 * the SHA-256 digest. Version tags default to the current v1 constants but are explicit in the result
 * so the persisted row records exactly how to read itself.
 */
export function buildProtocolDefinition(input: {
  definitionSchemaVersion?: string;
  canonicalizationVersion?: string;
  definition: unknown;
}): NormalizedProtocolDefinition {
  const definitionSchemaVersion = input.definitionSchemaVersion ?? DEFINITION_SCHEMA_VERSION_V1;
  const canonicalizationVersion = input.canonicalizationVersion ?? CANONICALIZATION_VERSION_V1;
  const definitionJson = parseDefinition(definitionSchemaVersion, input.definition);
  const definitionDigest = sha256Hex(
    canonicalizeDefinition(canonicalizationVersion, definitionJson),
  );
  return { definitionSchemaVersion, canonicalizationVersion, definitionJson, definitionDigest };
}

/**
 * Re-verify a persisted protocol row FAIL-CLOSED (spec §2.1). Re-parses `definitionJson` with the
 * row's OWN `definitionSchemaVersion`, canonicalizes with its OWN `canonicalizationVersion`, recomputes
 * the digest, and compares to the stored `definitionDigest`. Throws `UnsupportedStudyVersionError` for
 * an unknown version and `StudyProtocolDigestMismatchError` on any mismatch — never returns a tampered
 * definition and never falls back to current constants.
 */
export function verifyProtocolDefinition(row: {
  definitionSchemaVersion: string;
  canonicalizationVersion: string;
  definitionJson: unknown;
  definitionDigest: string;
  protocolRef?: string;
}): Record<string, unknown> {
  const normalized = parseDefinition(row.definitionSchemaVersion, row.definitionJson);
  const recomputed = sha256Hex(canonicalizeDefinition(row.canonicalizationVersion, normalized));
  if (recomputed !== row.definitionDigest) {
    throw new StudyProtocolDigestMismatchError(row.definitionDigest, recomputed, row.protocolRef);
  }
  return normalized;
}

// PagaMenos · src/study — A1 version constants and trusted operation scopes (spec §2.1/§9).
//
// These strings pin the MEANING of persisted A1 facts and the identity of each write operation. Like
// the M3.5A persistence versions, they must be bumped (never silently redefined) when a shape or
// semantics changes, so an unknown/older payload is never handled as if it were current. The protocol
// load path selects its historical parser/canonicalizer by the row's OWN stored version tags — never
// by these current constants (spec §2.1: no hard-coded runtime fallback).

/** Frozen local schema version used to parse a protocol `definitionJson` (spec §2.1). */
export const DEFINITION_SCHEMA_VERSION_V1 = 'pagamenos.analysis-protocol-definition.v1';

/** Canonicalization version used to serialize a protocol definition for its digest (spec §2.1).
 * v1 reuses the accepted M3.5A canonical JSON serializer (no second canonicalizer, spec §9). */
export const CANONICALIZATION_VERSION_V1 = 'pagamenos.study.canonicalization.v1';

/** Normalization version of the stable pseudonymous recruitment-subject key (spec §5). */
export const RECRUITMENT_KEY_VERSION_V1 = 'pagamenos.recruitment-subject-key.v1';

/** Trusted operation identities scoping idempotency keys (spec §9). Never request-controlled. */
export const PROTOCOL_REGISTER_OPERATION_SCOPE = 'PROTOCOL_REGISTER_V1';
export const PROTOCOL_FREEZE_OPERATION_SCOPE = 'PROTOCOL_FREEZE_V1';
export const EXPERIMENT_CREATE_OPERATION_SCOPE = 'EXPERIMENT_CREATE_V1';
export const PARTICIPANT_REGISTER_OPERATION_SCOPE = 'PARTICIPANT_REGISTER_V1';
export const ASSIGN_PARTICIPANT_OPERATION_SCOPE = 'ASSIGN_PARTICIPANT_V1';
export const CONSENT_GRANT_OPERATION_SCOPE = 'CONSENT_GRANT_V1';
export const CONSENT_WITHDRAW_OPERATION_SCOPE = 'CONSENT_WITHDRAW_V1';

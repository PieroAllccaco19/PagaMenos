// ═══════════════════════════════════════════════════════════════════════════════════════════════
// M7 SIGNER RUNTIME TEST FIXTURE
//
//     NOT A PRODUCTION MANIFEST
//     NOT AUTHORITY
//     NOT LC-3 ACCEPTED
//     NOT PUBLISHED
//     NOT A SELECTOR VALUE
//     NOT SELECTOR ROTATION
//     NOT LIFECYCLE EVIDENCE
//
// Disposable, internally coherent M7 control planes, installed ONLY for the duration of one
// `pnpm m7:signer` run into a throwaway PostgreSQL cluster that is destroyed afterwards. ONE backend,
// ONE policy, ONE vocabulary, and three storage profiles over that backend:
//
//   A1 — EXACT_KEY_SCOPED_TOKEN / PROVIDER_IAM, credential generation 1   (installed + active)
//   A2 — EXACT_KEY_SCOPED_TOKEN / PROVIDER_IAM, credential generation 2   (signer-routing rotation:
//        same backend, same writeCapabilityMode, same envelopeEnforcement, new credential)
//   K  — EXACT_KEY_PRESIGNED_PUT / PROVIDER_IAM, credential generation 3  (a live profile of a
//        DIFFERENT capability kind, used to prove XF-17 refuses rather than cross kinds)
//
// Each profile is bound by its own fixture manifest, because RT-1 forbids retiring the active
// manifest's profile. Activating A2 / K here is a TEST-FIXTURE control-plane rotation inside a
// disposable database — not production manifest authority, not LC-3, not a selector rotation and not
// lifecycle evidence. The credential profile identifiers are opaque test strings: NO credential, key
// or secret of any provider exists behind them, and nothing is ever signed with them.
//
// The CATALOG EXPECTATIONS are not invented: they are derived mechanically from the accepted §19
// normative SQL by the accepted S03 derivation (`deriveCatalog` / `payloadOf`). Interval values are
// arbitrary disposable test values chosen only so the accepted CHECK constraints and XF-DL-1
// (G + W + skew <= workerLease) hold.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
import { createHash } from 'node:crypto';

import type pg from 'pg';

import { canonicalize } from '../../../persistence/canonical';
import { deriveCatalog, payloadOf, type DerivedCatalog } from '../../s03/expectations';
import type { S03Sources } from '../../s03/sources';

export const SIGNER_FIXTURE_KIND = 'M7_SIGNER_RUNTIME_TEST_FIXTURE_NOT_A_MANIFEST' as const;
export const SIGNER_MARKER = 'signer-runtime-test-fixture';
export const SIGNER_DOMAIN_TAG = 'PAGAMENOS/M7/SIGNER-RUNTIME-TEST-FIXTURE/V1\n';

export type SignerPlane = 'A1' | 'A2' | 'K';

export const SIGNER_VOCABULARY_VERSION = `pagamenos.m7.merchant-vocabulary.${SIGNER_MARKER}.v1`;
export const SIGNER_MERCHANT_REFS = [`${SIGNER_MARKER}:merchant-a`] as const;
export const SIGNER_POLICY_VERSION = `pagamenos.m7.policy.${SIGNER_MARKER}.v1`;

/** The disposable generation-write-grant TTL (G). Every expiry case waits on exactly this. */
export const SIGNER_GRANT_TTL_SECONDS = 15;

export interface SignerPlaneIdentity {
  readonly manifestVersion: string;
  readonly storageProfileVersion: string;
  readonly credentialProfileId: string;
  readonly credentialGeneration: number;
  readonly uploadTransport: 'SERVER_MEDIATED' | 'PRESIGNED_PUT';
  readonly writeCapabilityMode: 'EXACT_KEY_SCOPED_TOKEN' | 'EXACT_KEY_PRESIGNED_PUT';
  readonly envelopeEnforcement: 'PROVIDER_IAM';
}

export const SIGNER_IDENTITIES: Readonly<Record<SignerPlane, SignerPlaneIdentity>> = {
  A1: {
    manifestVersion: `pagamenos.m7.control-plane.${SIGNER_MARKER}.a1.v1`,
    storageProfileVersion: `pagamenos.m7.storage-profile.${SIGNER_MARKER}.a1.v1`,
    credentialProfileId: `${SIGNER_MARKER}.credential-profile-a1`,
    credentialGeneration: 1,
    uploadTransport: 'SERVER_MEDIATED',
    writeCapabilityMode: 'EXACT_KEY_SCOPED_TOKEN',
    envelopeEnforcement: 'PROVIDER_IAM',
  },
  A2: {
    manifestVersion: `pagamenos.m7.control-plane.${SIGNER_MARKER}.a2.v1`,
    storageProfileVersion: `pagamenos.m7.storage-profile.${SIGNER_MARKER}.a2.v1`,
    credentialProfileId: `${SIGNER_MARKER}.credential-profile-a2`,
    credentialGeneration: 2,
    uploadTransport: 'SERVER_MEDIATED',
    writeCapabilityMode: 'EXACT_KEY_SCOPED_TOKEN',
    envelopeEnforcement: 'PROVIDER_IAM',
  },
  K: {
    manifestVersion: `pagamenos.m7.control-plane.${SIGNER_MARKER}.k.v1`,
    storageProfileVersion: `pagamenos.m7.storage-profile.${SIGNER_MARKER}.k.v1`,
    credentialProfileId: `${SIGNER_MARKER}.credential-profile-k`,
    credentialGeneration: 3,
    uploadTransport: 'PRESIGNED_PUT',
    writeCapabilityMode: 'EXACT_KEY_PRESIGNED_PUT',
    envelopeEnforcement: 'PROVIDER_IAM',
  },
};

const BACKEND = {
  p_provider_class: 'CONFORMANCE_DOUBLE',
  p_container_id: `${SIGNER_MARKER}.container`,
  p_region_id: `${SIGNER_MARKER}.region`,
  p_endpoint_identity: `${SIGNER_MARKER}.endpoint.invalid`,
  p_staging_prefix: `${SIGNER_MARKER}/staging/`,
  p_evidence_prefix: `${SIGNER_MARKER}/evidence/`,
  p_write_completion_window: '5 seconds',
} as const;

const POLICY = {
  p_policy_version: SIGNER_POLICY_VERSION,
  p_hard_withdrawal: '24 hours',
  p_hard_never_verified: '30 days',
  p_hard_authorized: '30 days',
  p_schedule_withdrawal: '0 seconds',
  p_schedule_never_verified: '1 hour',
  p_schedule_authorized: '0 seconds',
  p_scheduler_worst_case_lag: '1 hour',
  p_effect_completion_budget: '6 hours',
  p_generation_write_grant_ttl: `${SIGNER_GRANT_TTL_SECONDS} seconds`,
  p_write_fence_skew_allowance: '5 seconds',
  p_upload_url_ttl: '120 seconds',
  p_finalize_window: '600 seconds',
  p_worker_lease: '60 seconds',
  p_session_ttl: '30 minutes',
  p_capture_skew_tolerance: '120 seconds',
  p_orphan_grace: '1 hour',
  p_outbox_backoff_cap: '60 seconds',
  p_outbox_max_attempts: 5,
  p_max_upload_bytes: 1_048_576,
  p_max_pixels: 12_000_000,
  p_canonical_media_type: 'image/jpeg',
} as const;

function profileValues(plane: SignerPlane): Record<string, unknown> {
  const id = SIGNER_IDENTITIES[plane];
  return {
    p_storage_profile_version: id.storageProfileVersion,
    p_credential_profile_id: id.credentialProfileId,
    p_credential_generation: id.credentialGeneration,
    p_upload_transport: id.uploadTransport,
    p_decoder_generation: `${SIGNER_MARKER}.decoder.v1`,
    p_encoder_generation: `${SIGNER_MARKER}.encoder.v1`,
    p_storage_capability_version: `${SIGNER_MARKER}.capability-${plane.toLowerCase()}.v1`,
    p_conditional_create_mode: 'IF_NONE_MATCH_STAR',
    p_write_capability_mode: id.writeCapabilityMode,
    p_envelope_enforcement: id.envelopeEnforcement,
  };
}

/** `m7.i_vocabulary_entries_digest`, recomputed: sha256 over the C-ordered refs joined by LF. */
function entriesSha256(refs: readonly string[]): string {
  const sorted = [...refs].sort((a, b) =>
    Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8')),
  );
  return `sha256:${createHash('sha256').update(sorted.join('\n'), 'utf8').digest('hex')}`;
}

/**
 * The plane's own digest, in the EXACT accepted lexical form (`^sha256:[0-9a-f]{64}$`), derived from
 * this fixture's content under its own domain tag — it can collide with no other digest and be
 * mistaken for no reviewed manifest's digest.
 */
export function signerFixtureDigest(plane: SignerPlane): string {
  const body = canonicalize({
    fixtureKind: SIGNER_FIXTURE_KIND,
    plane,
    identity: SIGNER_IDENTITIES[plane],
    backend: BACKEND,
    policy: POLICY,
    profile: profileValues(plane),
  });
  return `sha256:${createHash('sha256').update(SIGNER_DOMAIN_TAG, 'utf8').update(body, 'utf8').digest('hex')}`;
}

/** A digest of the accepted form that is NOT any installation's (the §23.6 drift control). */
export function signerDriftedDigest(): string {
  return `sha256:${createHash('sha256').update(`${SIGNER_DOMAIN_TAG}drifted`, 'utf8').digest('hex')}`;
}

function fn(catalog: DerivedCatalog, name: string) {
  const f = catalog.functions.find((x) => x.name === name);
  if (f === undefined) throw new Error(`m7.${name} is not an accepted function`);
  return f;
}

/** `SELECT * FROM m7.<name>($1::t1, …)` with the accepted declared types, in declared order. */
async function callControlFn(
  client: pg.Client,
  catalog: DerivedCatalog,
  name: string,
  values: Readonly<Record<string, unknown>>,
): Promise<Record<string, unknown>[]> {
  const f = fn(catalog, name);
  const args = f.argNames.map((p) => {
    if (!Object.prototype.hasOwnProperty.call(values, p)) {
      throw new Error(`m7.${name}: no value supplied for declared parameter ${p}`);
    }
    return values[p];
  });
  const sql = `SELECT * FROM m7.${name}(${f.declaredTypes.map((t, i) => `$${i + 1}::${t}`).join(', ')})`;
  const { rows } = await client.query(sql, args as unknown[]);
  return rows as Record<string, unknown>[];
}

async function registerProfileAndManifest(
  client: pg.Client,
  catalog: DerivedCatalog,
  plane: SignerPlane,
  backendSha256: string,
): Promise<{ manifestSha256: string; installationId: string }> {
  const id = SIGNER_IDENTITIES[plane];
  const manifestSha256 = signerFixtureDigest(plane);
  await callControlFn(client, catalog, 'c_register_storage_profile_v1', {
    ...profileValues(plane),
    p_backend_sha256: backendSha256,
  });
  await callControlFn(client, catalog, 'c_register_manifest_v1', {
    p_manifest_version: id.manifestVersion,
    p_manifest_sha256: manifestSha256,
    p_policy_version: SIGNER_POLICY_VERSION,
    p_vocabulary_version: SIGNER_VOCABULARY_VERSION,
    p_storage_profile_version: id.storageProfileVersion,
  });
  await callControlFn(client, catalog, 'c_load_catalog_expectations_v1', {
    p_manifest_version: id.manifestVersion,
    ...payloadOf(catalog, id.manifestVersion),
  });
  const activation = await callControlFn(client, catalog, 'c_activate_manifest_v1', {
    p_manifest_version: id.manifestVersion,
    p_manifest_sha256: manifestSha256,
  });
  return { manifestSha256, installationId: String(Object.values(activation[0]!)[0]) };
}

export interface SignerPlaneInstall {
  readonly plane: SignerPlane;
  readonly manifestSha256: string;
  readonly backendSha256: string;
  readonly installationId: string;
}

/**
 * Registers the backend, policy and vocabulary, then profile + manifest A1, and ACTIVATES A1 — inside
 * the caller's OPEN install transaction (between F26-prefix and F26-suffix, as §19.13.4 documents).
 */
export async function installSignerPlaneA1(
  client: pg.Client,
  sources: S03Sources,
): Promise<SignerPlaneInstall> {
  const catalog = deriveCatalog(sources);
  const backendRows = await callControlFn(
    client,
    catalog,
    'c_register_storage_backend_v1',
    BACKEND,
  );
  const backendSha256 = String(Object.values(backendRows[0]!)[0]);
  await callControlFn(client, catalog, 'c_register_retention_policy_v1', POLICY);
  await callControlFn(client, catalog, 'c_register_merchant_vocabulary_v1', {
    p_vocabulary_version: SIGNER_VOCABULARY_VERSION,
    p_corpus_id: `${SIGNER_MARKER}.corpus`,
    p_merchant_refs: [...SIGNER_MERCHANT_REFS],
    p_entries_sha256: entriesSha256(SIGNER_MERCHANT_REFS),
  });
  const a1 = await registerProfileAndManifest(client, catalog, 'A1', backendSha256);
  return { plane: 'A1', backendSha256, ...a1 };
}

/**
 * The disposable TEST rotation: registers profile + manifest `plane` over the SAME backend and
 * activates it, as the migration (owner-class) role. Registers no backend and no policy.
 */
export async function rotateSignerPlane(
  client: pg.Client,
  sources: S03Sources,
  plane: 'A2' | 'K',
  backendSha256: string,
): Promise<SignerPlaneInstall> {
  const catalog = deriveCatalog(sources);
  const r = await registerProfileAndManifest(client, catalog, plane, backendSha256);
  return { plane, backendSha256, ...r };
}

/** Retires one fixture profile through the accepted `c_retire_storage_profile_v1` (RT-1, RT-5). */
export async function retireSignerProfile(
  client: pg.Client,
  sources: S03Sources,
  plane: SignerPlane,
): Promise<void> {
  await callControlFn(client, deriveCatalog(sources), 'c_retire_storage_profile_v1', {
    p_storage_profile_version: SIGNER_IDENTITIES[plane].storageProfileVersion,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// PPC-1 ADDITIVE PLANES S1 / S2 — same TEST-FIXTURE status as A1 / A2 / K (NOT A MANIFEST, NOT
// AUTHORITY, NOT LC-3, NOT A SELECTOR, NOT LIFECYCLE EVIDENCE). A1 / A2 / K and everything above are
// unchanged. S1 / S2 live on a SECOND fixture backend (B) so that plane K's "only live profile of
// backend A" case is untouched. Both are the one kind PPC-1 implements:
//
//   S1 — EXACT_KEY_PRESIGNED_PUT / SIGNER_TOPOLOGY, credential generation 1 on backend B
//   S2 — EXACT_KEY_PRESIGNED_PUT / SIGNER_TOPOLOGY, credential generation 2 on backend B
//        (signer-routing rotation: same backend, same kind, new credential)
//
// providerClass is S3_COMPATIBLE because that is the PROTOCOL the signer speaks; the endpoint
// identity is under `.invalid` and no object store exists behind it. Nothing here is provider
// evidence.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

export type SignerProviderPlane = 'S1' | 'S2';

export interface SignerProviderPlaneIdentity {
  readonly manifestVersion: string;
  readonly storageProfileVersion: string;
  readonly credentialProfileId: string;
  readonly credentialGeneration: number;
  readonly uploadTransport: 'SERVER_MEDIATED';
  readonly writeCapabilityMode: 'EXACT_KEY_PRESIGNED_PUT';
  readonly envelopeEnforcement: 'SIGNER_TOPOLOGY';
}

export const SIGNER_PROVIDER_IDENTITIES: Readonly<
  Record<SignerProviderPlane, SignerProviderPlaneIdentity>
> = {
  S1: {
    manifestVersion: `pagamenos.m7.control-plane.${SIGNER_MARKER}.s1.v1`,
    storageProfileVersion: `pagamenos.m7.storage-profile.${SIGNER_MARKER}.s1.v1`,
    credentialProfileId: `${SIGNER_MARKER}.credential-profile-s1`,
    credentialGeneration: 1,
    uploadTransport: 'SERVER_MEDIATED',
    writeCapabilityMode: 'EXACT_KEY_PRESIGNED_PUT',
    envelopeEnforcement: 'SIGNER_TOPOLOGY',
  },
  S2: {
    manifestVersion: `pagamenos.m7.control-plane.${SIGNER_MARKER}.s2.v1`,
    storageProfileVersion: `pagamenos.m7.storage-profile.${SIGNER_MARKER}.s2.v1`,
    credentialProfileId: `${SIGNER_MARKER}.credential-profile-s2`,
    credentialGeneration: 2,
    uploadTransport: 'SERVER_MEDIATED',
    writeCapabilityMode: 'EXACT_KEY_PRESIGNED_PUT',
    envelopeEnforcement: 'SIGNER_TOPOLOGY',
  },
};

const BACKEND_B = {
  p_provider_class: 'S3_COMPATIBLE',
  p_container_id: `${SIGNER_MARKER}.provider-container`,
  p_region_id: `${SIGNER_MARKER}.provider-region`,
  p_endpoint_identity: `${SIGNER_MARKER}.provider-endpoint.invalid`,
  p_staging_prefix: `${SIGNER_MARKER}/provider-staging/`,
  p_evidence_prefix: `${SIGNER_MARKER}/provider-evidence/`,
  p_write_completion_window: '5 seconds',
} as const;

function providerProfileValues(plane: SignerProviderPlane): Record<string, unknown> {
  const id = SIGNER_PROVIDER_IDENTITIES[plane];
  return {
    p_storage_profile_version: id.storageProfileVersion,
    p_credential_profile_id: id.credentialProfileId,
    p_credential_generation: id.credentialGeneration,
    p_upload_transport: id.uploadTransport,
    p_decoder_generation: `${SIGNER_MARKER}.decoder.v1`,
    p_encoder_generation: `${SIGNER_MARKER}.encoder.v1`,
    p_storage_capability_version: `${SIGNER_MARKER}.capability-${plane.toLowerCase()}.v1`,
    p_conditional_create_mode: 'IF_NONE_MATCH_STAR',
    p_write_capability_mode: id.writeCapabilityMode,
    p_envelope_enforcement: id.envelopeEnforcement,
  };
}

/** Plane S1 / S2's own digest, in the accepted lexical form, under this fixture's domain tag. */
export function signerProviderFixtureDigest(plane: SignerProviderPlane): string {
  const body = canonicalize({
    fixtureKind: SIGNER_FIXTURE_KIND,
    plane,
    identity: SIGNER_PROVIDER_IDENTITIES[plane],
    backend: BACKEND_B,
    policy: POLICY,
    profile: providerProfileValues(plane),
  });
  return `sha256:${createHash('sha256').update(SIGNER_DOMAIN_TAG, 'utf8').update(body, 'utf8').digest('hex')}`;
}

async function registerProviderProfileAndManifest(
  client: pg.Client,
  catalog: DerivedCatalog,
  plane: SignerProviderPlane,
  backendSha256: string,
): Promise<{ manifestSha256: string; installationId: string }> {
  const id = SIGNER_PROVIDER_IDENTITIES[plane];
  const manifestSha256 = signerProviderFixtureDigest(plane);
  await callControlFn(client, catalog, 'c_register_storage_profile_v1', {
    ...providerProfileValues(plane),
    p_backend_sha256: backendSha256,
  });
  await callControlFn(client, catalog, 'c_register_manifest_v1', {
    p_manifest_version: id.manifestVersion,
    p_manifest_sha256: manifestSha256,
    p_policy_version: SIGNER_POLICY_VERSION,
    p_vocabulary_version: SIGNER_VOCABULARY_VERSION,
    p_storage_profile_version: id.storageProfileVersion,
  });
  await callControlFn(client, catalog, 'c_load_catalog_expectations_v1', {
    p_manifest_version: id.manifestVersion,
    ...payloadOf(catalog, id.manifestVersion),
  });
  const activation = await callControlFn(client, catalog, 'c_activate_manifest_v1', {
    p_manifest_version: id.manifestVersion,
    p_manifest_sha256: manifestSha256,
  });
  return { manifestSha256, installationId: String(Object.values(activation[0]!)[0]) };
}

export interface SignerProviderPlaneInstall {
  readonly plane: SignerProviderPlane;
  readonly manifestSha256: string;
  readonly backendSha256: string;
  readonly installationId: string;
}

/**
 * Registers fixture backend B, then profile + manifest S1 over it, and ACTIVATES S1 — as the migration
 * (owner-class) role, after the accepted suite's planes. Reuses the accepted policy and vocabulary.
 */
export async function installSignerProviderPlaneS1(
  client: pg.Client,
  sources: S03Sources,
): Promise<SignerProviderPlaneInstall> {
  const catalog = deriveCatalog(sources);
  const backendRows = await callControlFn(
    client,
    catalog,
    'c_register_storage_backend_v1',
    BACKEND_B,
  );
  const backendSha256 = String(Object.values(backendRows[0]!)[0]);
  const s1 = await registerProviderProfileAndManifest(client, catalog, 'S1', backendSha256);
  return { plane: 'S1', backendSha256, ...s1 };
}

/** The disposable TEST rotation S1 → S2 over the SAME backend B. */
export async function rotateSignerProviderPlane(
  client: pg.Client,
  sources: S03Sources,
  plane: 'S2',
  backendSha256: string,
): Promise<SignerProviderPlaneInstall> {
  const r = await registerProviderProfileAndManifest(
    client,
    deriveCatalog(sources),
    plane,
    backendSha256,
  );
  return { plane, backendSha256, ...r };
}

/** Retires one S-plane profile through the accepted `c_retire_storage_profile_v1`. */
export async function retireSignerProviderProfile(
  client: pg.Client,
  sources: S03Sources,
  plane: SignerProviderPlane,
): Promise<void> {
  await callControlFn(client, deriveCatalog(sources), 'c_retire_storage_profile_v1', {
    p_storage_profile_version: SIGNER_PROVIDER_IDENTITIES[plane].storageProfileVersion,
  });
}

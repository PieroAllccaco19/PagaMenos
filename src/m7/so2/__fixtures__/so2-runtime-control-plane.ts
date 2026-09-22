// ═══════════════════════════════════════════════════════════════════════════════════════════════
// M7 SO2 RUNTIME TEST FIXTURE
//
//     NOT A PRODUCTION MANIFEST
//     NOT AUTHORITY
//     NOT LC-3 ACCEPTED
//     NOT PUBLISHED
//     NOT A SELECTOR VALUE
//     NOT SELECTOR ROTATION
//     NOT LIFECYCLE EVIDENCE
//
// Two disposable, internally coherent M7 control planes, installed ONLY for the duration of one
// `pnpm m7:so2` run into a throwaway PostgreSQL cluster that is destroyed afterwards:
//
//   plane A — backend A, storage profile A (SERVER_MEDIATED), policy A, manifest A   (installed)
//   plane B — backend B, storage profile B (PRESIGNED_PUT),   policy B, manifest B   (rotation target)
//
// Plane B exists ONLY so the SO-2 suite can exercise RP-3 / SI-2 against REAL PostgreSQL: an exact
// SO-2 replay after a control-plane rotation must return the intent's OWN (A) issuance facts, while a
// new nonce binds B. Activating B here is a TEST-FIXTURE control-plane rotation inside a disposable
// database — it is not production manifest authority, not LC-3, not a selector rotation and not
// lifecycle evidence. Nothing here is published and nothing is under `authority/`.
//
// The two planes deliberately differ in EVERY field SO-2 returns (staging prefix, transport,
// credential profile, profile version, maxBytes, upload TTL), so a replay that leaked the active
// plane's values would be observable. The interval and numeric values are arbitrary disposable test
// values chosen only so the accepted CHECK constraints and XF-DL-1 (G + W + skew <= workerLease) hold.
//
// The CATALOG EXPECTATIONS are not invented: they are derived mechanically from the accepted §19
// normative SQL by the accepted S03 derivation (`deriveCatalog` / `payloadOf`).
// ═══════════════════════════════════════════════════════════════════════════════════════════════
import { createHash } from 'node:crypto';

import type pg from 'pg';

import { canonicalize } from '../../../persistence/canonical';
import { deriveCatalog, payloadOf, type DerivedCatalog } from '../../s03/expectations';
import type { S03Sources } from '../../s03/sources';

export const SO2_FIXTURE_KIND = 'M7_SO2_RUNTIME_TEST_FIXTURE_NOT_A_MANIFEST' as const;
export const SO2_MARKER = 'so2-runtime-test-fixture';
export const SO2_DOMAIN_TAG = 'PAGAMENOS/M7/SO2-RUNTIME-TEST-FIXTURE/V1\n';

export type So2Plane = 'A' | 'B';

export const SO2_VOCABULARY_VERSION = `pagamenos.m7.merchant-vocabulary.${SO2_MARKER}.v1`;
export const SO2_MERCHANT_REFS = [`${SO2_MARKER}:merchant-a`] as const;

export const SO2_IDENTITIES: Readonly<
  Record<
    So2Plane,
    {
      readonly manifestVersion: string;
      readonly policyVersion: string;
      readonly storageProfileVersion: string;
      readonly credentialProfileId: string;
      readonly stagingPrefix: string;
      readonly uploadTransport: 'SERVER_MEDIATED' | 'PRESIGNED_PUT';
      readonly maxUploadBytes: number;
      readonly uploadUrlTtlSeconds: number;
      readonly finalizeWindowSeconds: number;
      readonly writeCompletionWindowSeconds: number;
      readonly writeFenceSkewSeconds: number;
    }
  >
> = {
  A: {
    manifestVersion: `pagamenos.m7.control-plane.${SO2_MARKER}.a.v1`,
    policyVersion: `pagamenos.m7.policy.${SO2_MARKER}.a.v1`,
    storageProfileVersion: `pagamenos.m7.storage-profile.${SO2_MARKER}.a.v1`,
    credentialProfileId: `${SO2_MARKER}.credential-profile-a`,
    stagingPrefix: `${SO2_MARKER}/a/staging/`,
    uploadTransport: 'SERVER_MEDIATED',
    maxUploadBytes: 1_048_576,
    uploadUrlTtlSeconds: 120,
    finalizeWindowSeconds: 300,
    writeCompletionWindowSeconds: 5,
    writeFenceSkewSeconds: 5,
  },
  B: {
    manifestVersion: `pagamenos.m7.control-plane.${SO2_MARKER}.b.v1`,
    policyVersion: `pagamenos.m7.policy.${SO2_MARKER}.b.v1`,
    storageProfileVersion: `pagamenos.m7.storage-profile.${SO2_MARKER}.b.v1`,
    credentialProfileId: `${SO2_MARKER}.credential-profile-b`,
    stagingPrefix: `${SO2_MARKER}/b/staging/`,
    uploadTransport: 'PRESIGNED_PUT',
    maxUploadBytes: 2_097_152,
    uploadUrlTtlSeconds: 180,
    finalizeWindowSeconds: 600,
    writeCompletionWindowSeconds: 7,
    writeFenceSkewSeconds: 6,
  },
};

/** The FIXED arguments of one plane's registration calls (§19.11.2). */
export function so2FixedValues(plane: So2Plane): Readonly<Record<string, Record<string, unknown>>> {
  const id = SO2_IDENTITIES[plane];
  const p = plane.toLowerCase();
  return {
    c_register_storage_backend_v1: {
      p_provider_class: 'CONFORMANCE_DOUBLE',
      p_container_id: `${SO2_MARKER}.container-${p}`,
      p_region_id: `${SO2_MARKER}.region-${p}`,
      p_endpoint_identity: `${SO2_MARKER}.endpoint-${p}.invalid`,
      p_staging_prefix: id.stagingPrefix,
      p_evidence_prefix: `${SO2_MARKER}/${p}/evidence/`,
      p_write_completion_window: `${id.writeCompletionWindowSeconds} seconds`,
    },
    c_register_storage_profile_v1: {
      p_storage_profile_version: id.storageProfileVersion,
      p_credential_profile_id: id.credentialProfileId,
      p_credential_generation: 1,
      p_upload_transport: id.uploadTransport,
      p_decoder_generation: `${SO2_MARKER}.decoder-${p}.v1`,
      p_encoder_generation: `${SO2_MARKER}.encoder-${p}.v1`,
      p_storage_capability_version: `${SO2_MARKER}.capability-${p}.v1`,
      p_conditional_create_mode: 'IF_NONE_MATCH_STAR',
      p_write_capability_mode:
        id.uploadTransport === 'PRESIGNED_PUT'
          ? 'EXACT_KEY_PRESIGNED_PUT'
          : 'EXACT_KEY_SCOPED_TOKEN',
      p_envelope_enforcement: 'PROVIDER_IAM',
    },
    c_register_retention_policy_v1: {
      p_policy_version: id.policyVersion,
      p_hard_withdrawal: '24 hours',
      p_hard_never_verified: '30 days',
      p_hard_authorized: '30 days',
      p_schedule_withdrawal: '0 seconds',
      p_schedule_never_verified: '1 hour',
      p_schedule_authorized: '0 seconds',
      p_scheduler_worst_case_lag: '1 hour',
      p_effect_completion_budget: '6 hours',
      p_generation_write_grant_ttl: '10 seconds',
      p_write_fence_skew_allowance: `${id.writeFenceSkewSeconds} seconds`,
      p_upload_url_ttl: `${id.uploadUrlTtlSeconds} seconds`,
      p_finalize_window: `${id.finalizeWindowSeconds} seconds`,
      p_worker_lease: '60 seconds',
      p_session_ttl: '30 minutes',
      p_capture_skew_tolerance: '120 seconds',
      p_orphan_grace: '1 hour',
      p_outbox_backoff_cap: '60 seconds',
      p_outbox_max_attempts: 5,
      p_max_upload_bytes: id.maxUploadBytes,
      p_max_pixels: 12_000_000,
      p_canonical_media_type: 'image/jpeg',
    },
    c_register_merchant_vocabulary_v1: {
      p_vocabulary_version: SO2_VOCABULARY_VERSION,
      p_corpus_id: `${SO2_MARKER}.corpus`,
      p_merchant_refs: [...SO2_MERCHANT_REFS],
    },
    c_register_manifest_v1: {
      p_manifest_version: id.manifestVersion,
      p_policy_version: id.policyVersion,
      p_vocabulary_version: SO2_VOCABULARY_VERSION,
      p_storage_profile_version: id.storageProfileVersion,
    },
    c_load_catalog_expectations_v1: { p_manifest_version: id.manifestVersion },
    c_activate_manifest_v1: { p_manifest_version: id.manifestVersion },
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
 * this fixture's own content under its own domain tag — it can collide with no other digest and be
 * mistaken for no reviewed manifest's digest.
 */
export function so2FixtureDigest(plane: So2Plane): string {
  const body = canonicalize({
    fixtureKind: SO2_FIXTURE_KIND,
    plane,
    identities: SO2_IDENTITIES[plane],
    fixedValues: so2FixedValues(plane),
  });
  return `sha256:${createHash('sha256').update(SO2_DOMAIN_TAG, 'utf8').update(body, 'utf8').digest('hex')}`;
}

/** A digest of the accepted form that is NOT any installation's (the §23.6 drift control). */
export function so2DriftedDigest(): string {
  return `sha256:${createHash('sha256').update(`${SO2_DOMAIN_TAG}drifted`, 'utf8').digest('hex')}`;
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

export interface So2PlaneInstall {
  readonly plane: So2Plane;
  readonly manifestSha256: string;
  readonly backendSha256: string;
  readonly installationId: string;
}

/**
 * Registers and ACTIVATES one plane through the seven accepted `c_*` calls, in the accepted order.
 * Plane A runs inside the caller's OPEN install transaction (between F26-prefix and F26-suffix,
 * exactly as §19.13.4 documents). Plane B runs later, as the migration (owner-class) role, as the
 * disposable TEST rotation.
 */
export async function installSo2Plane(
  client: pg.Client,
  sources: S03Sources,
  plane: So2Plane,
): Promise<So2PlaneInstall> {
  const catalog = deriveCatalog(sources);
  const values = so2FixedValues(plane);
  const manifestSha256 = so2FixtureDigest(plane);

  const backendRows = await callControlFn(
    client,
    catalog,
    'c_register_storage_backend_v1',
    values.c_register_storage_backend_v1!,
  );
  const backendSha256 = String(Object.values(backendRows[0]!)[0]);
  await callControlFn(client, catalog, 'c_register_storage_profile_v1', {
    ...values.c_register_storage_profile_v1!,
    p_backend_sha256: backendSha256,
  });
  await callControlFn(
    client,
    catalog,
    'c_register_retention_policy_v1',
    values.c_register_retention_policy_v1!,
  );
  // The vocabulary is shared; its registration is idempotent for identical content.
  await callControlFn(client, catalog, 'c_register_merchant_vocabulary_v1', {
    ...values.c_register_merchant_vocabulary_v1!,
    p_entries_sha256: entriesSha256(SO2_MERCHANT_REFS),
  });
  await callControlFn(client, catalog, 'c_register_manifest_v1', {
    ...values.c_register_manifest_v1!,
    p_manifest_sha256: manifestSha256,
  });
  await callControlFn(client, catalog, 'c_load_catalog_expectations_v1', {
    ...values.c_load_catalog_expectations_v1!,
    ...payloadOf(catalog, SO2_IDENTITIES[plane].manifestVersion),
  });
  const activation = await callControlFn(client, catalog, 'c_activate_manifest_v1', {
    ...values.c_activate_manifest_v1!,
    p_manifest_sha256: manifestSha256,
  });
  return {
    plane,
    manifestSha256,
    backendSha256,
    installationId: String(Object.values(activation[0]!)[0]),
  };
}

/**
 * Re-activates an ALREADY registered plane (A → B → A rollback is an accepted installation event,
 * M7V11-AUD-03). Registers nothing.
 */
export async function reactivateSo2Plane(
  client: pg.Client,
  sources: S03Sources,
  plane: So2Plane,
): Promise<string> {
  const catalog = deriveCatalog(sources);
  const activation = await callControlFn(client, catalog, 'c_activate_manifest_v1', {
    ...so2FixedValues(plane).c_activate_manifest_v1!,
    p_manifest_sha256: so2FixtureDigest(plane),
  });
  return String(Object.values(activation[0]!)[0]);
}

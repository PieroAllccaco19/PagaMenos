// ═══════════════════════════════════════════════════════════════════════════════════════════════
// M7 SO1 RUNTIME TEST FIXTURE
//
//     NOT A PRODUCTION MANIFEST
//     NOT AUTHORITY
//     NOT LC-3 ACCEPTED
//     NOT PUBLISHED
//     NOT A SELECTOR VALUE
//     NOT LIFECYCLE EVIDENCE
//
// A disposable, internally coherent M7 control plane, installed ONLY for the duration of one
// `pnpm m7:so1` run, into a throwaway PostgreSQL cluster that is destroyed afterwards. It exists so
// the productive SO-1 path can be exercised against REAL PostgreSQL instead of mocks. Nothing here
// is published, nothing here is under `authority/`, and nothing here may be read as evidence that a
// reviewed M7 control-plane manifest exists — none does, which is exactly why LC-1 has not occurred.
//
// It is DISTINCT from `M7-S03-VBCP`, and this file does not reinterpret that verification fixture as
// production authority: it carries its own marker namespace, its own identities and its own digest.
// The interval and numeric values below are arbitrary disposable test values, chosen only so the
// accepted CHECK constraints and the XF-DL-1 relation (G + W + skew <= workerLease) hold; they
// assert nothing about any deployment.
//
// The CATALOG EXPECTATIONS, by contrast, are not invented here at all: they are derived
// mechanically from the accepted §19 normative SQL by the accepted S03 derivation
// (`deriveCatalog` / `payloadOf`), so the fixture cannot drift from the installed schema.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
import { createHash } from 'node:crypto';

import type pg from 'pg';

import { canonicalize } from '../../../persistence/canonical';
import { deriveCatalog, payloadOf, type DerivedCatalog } from '../../s03/expectations';
import type { S03Sources } from '../../s03/sources';

export const SO1_FIXTURE_KIND = 'M7_SO1_RUNTIME_TEST_FIXTURE_NOT_A_MANIFEST' as const;
export const SO1_MARKER = 'so1-runtime-test-fixture';
export const SO1_DOMAIN_TAG = 'PAGAMENOS/M7/SO1-RUNTIME-TEST-FIXTURE/V1\n';

export const SO1_IDENTITIES = {
  manifestVersion: `pagamenos.m7.control-plane.${SO1_MARKER}.v1`,
  policyVersion: `pagamenos.m7.policy.${SO1_MARKER}.v1`,
  vocabularyVersion: `pagamenos.m7.merchant-vocabulary.${SO1_MARKER}.v1`,
  storageProfileVersion: `pagamenos.m7.storage-profile.${SO1_MARKER}.v1`,
} as const;

/** Vocabulary entries a VOCABULARY_MERCHANT assertion may name in this disposable plane. */
export const SO1_MERCHANT_REFS = [`${SO1_MARKER}:merchant-a`, `${SO1_MARKER}:merchant-b`] as const;

/** `m7.i_vocabulary_entries_digest`, recomputed here: sha256 over the C-ordered refs joined by LF. */
export function entriesSha256(refs: readonly string[]): string {
  const sorted = [...refs].sort((a, b) =>
    Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8')),
  );
  return `sha256:${createHash('sha256').update(sorted.join('\n'), 'utf8').digest('hex')}`;
}

/** The FIXED arguments of the seven control-plane registration calls (§19.11.2). */
export const SO1_FIXED_VALUES: Readonly<Record<string, Readonly<Record<string, unknown>>>> = {
  c_register_storage_backend_v1: {
    p_provider_class: 'CONFORMANCE_DOUBLE',
    p_container_id: `${SO1_MARKER}.container`,
    p_region_id: `${SO1_MARKER}.region`,
    p_endpoint_identity: `${SO1_MARKER}.endpoint.invalid`,
    p_staging_prefix: `${SO1_MARKER}/staging/`,
    p_evidence_prefix: `${SO1_MARKER}/evidence/`,
    p_write_completion_window: '5 seconds',
  },
  c_register_storage_profile_v1: {
    p_storage_profile_version: SO1_IDENTITIES.storageProfileVersion,
    p_credential_profile_id: `${SO1_MARKER}.credential-profile`,
    p_credential_generation: 1,
    p_upload_transport: 'SERVER_MEDIATED',
    p_decoder_generation: `${SO1_MARKER}.decoder.v1`,
    p_encoder_generation: `${SO1_MARKER}.encoder.v1`,
    p_storage_capability_version: `${SO1_MARKER}.capability.v1`,
    p_conditional_create_mode: 'IF_NONE_MATCH_STAR',
    p_write_capability_mode: 'EXACT_KEY_SCOPED_TOKEN',
    p_envelope_enforcement: 'PROVIDER_IAM',
  },
  c_register_retention_policy_v1: {
    p_policy_version: SO1_IDENTITIES.policyVersion,
    p_hard_withdrawal: '24 hours',
    p_hard_never_verified: '30 days',
    p_hard_authorized: '30 days',
    p_schedule_withdrawal: '0 seconds',
    p_schedule_never_verified: '1 hour',
    p_schedule_authorized: '0 seconds',
    p_scheduler_worst_case_lag: '1 hour',
    p_effect_completion_budget: '6 hours',
    p_generation_write_grant_ttl: '10 seconds',
    p_write_fence_skew_allowance: '5 seconds',
    p_upload_url_ttl: '120 seconds',
    p_finalize_window: '300 seconds',
    p_worker_lease: '60 seconds',
    // The accepted CHECK minimum (m7_retention_policy_session_ck: 5 minutes .. 24 hours). Every
    // case but one completes in seconds; the EXPIRED-session case waits out this real TTL rather
    // than faking time or altering any normative expiry rule.
    p_session_ttl: '5 minutes',
    p_capture_skew_tolerance: '120 seconds',
    p_orphan_grace: '1 hour',
    p_outbox_backoff_cap: '60 seconds',
    p_outbox_max_attempts: 5,
    p_max_upload_bytes: 1_048_576,
    p_max_pixels: 12_000_000,
    p_canonical_media_type: 'image/jpeg',
  },
  c_register_merchant_vocabulary_v1: {
    p_vocabulary_version: SO1_IDENTITIES.vocabularyVersion,
    p_corpus_id: `${SO1_MARKER}.corpus`,
    p_merchant_refs: [...SO1_MERCHANT_REFS],
  },
  c_register_manifest_v1: {
    p_manifest_version: SO1_IDENTITIES.manifestVersion,
    p_policy_version: SO1_IDENTITIES.policyVersion,
    p_vocabulary_version: SO1_IDENTITIES.vocabularyVersion,
    p_storage_profile_version: SO1_IDENTITIES.storageProfileVersion,
  },
  c_load_catalog_expectations_v1: { p_manifest_version: SO1_IDENTITIES.manifestVersion },
  c_activate_manifest_v1: { p_manifest_version: SO1_IDENTITIES.manifestVersion },
};

/**
 * The fixture's own digest, in the EXACT lexical form the accepted
 * `m7_control_plane_manifest_digest_ck` requires (`^sha256:[0-9a-f]{64}$`). It is derived from this
 * fixture's own content under its own domain tag, so it can collide with no other digest and can be
 * mistaken for no reviewed manifest's digest.
 */
export function so1FixtureDigest(): string {
  const body = canonicalize({
    fixtureKind: SO1_FIXTURE_KIND,
    identities: SO1_IDENTITIES,
    merchantRefs: [...SO1_MERCHANT_REFS],
    fixedValues: SO1_FIXED_VALUES,
  });
  return `sha256:${createHash('sha256').update(SO1_DOMAIN_TAG, 'utf8').update(body, 'utf8').digest('hex')}`;
}

/** A digest of the accepted form that is NOT the active installation's (the §23.6 drift control). */
export function so1DriftedDigest(): string {
  return `sha256:${createHash('sha256').update(`${SO1_DOMAIN_TAG}drifted`, 'utf8').digest('hex')}`;
}

// ---------------------------------------------------------------------------------------------------
// Calling the accepted functions with their DECLARED argument types
// ---------------------------------------------------------------------------------------------------

function fn(catalog: DerivedCatalog, name: string) {
  const f = catalog.functions.find((x) => x.name === name);
  if (f === undefined) throw new Error(`m7.${name} is not an accepted function`);
  return f;
}

/** `SELECT * FROM m7.<name>($1::t1, …)` with the accepted declared types, in declared order. */
export async function callControlFn(
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

export interface So1ControlPlaneInstall {
  readonly manifestSha256: string;
  readonly backendSha256: string;
  readonly installationId: string;
}

/**
 * Runs the seven accepted `c_*` registration calls, in the accepted order, inside the caller's OPEN
 * install transaction (between F26-prefix and F26-suffix, exactly as §19.13.4 documents).
 */
export async function installSo1ControlPlane(
  client: pg.Client,
  sources: S03Sources,
): Promise<So1ControlPlaneInstall> {
  const catalog = deriveCatalog(sources);
  const manifestSha256 = so1FixtureDigest();

  const backendRows = await callControlFn(
    client,
    catalog,
    'c_register_storage_backend_v1',
    SO1_FIXED_VALUES.c_register_storage_backend_v1!,
  );
  const backendSha256 = String(Object.values(backendRows[0]!)[0]);

  await callControlFn(client, catalog, 'c_register_storage_profile_v1', {
    ...SO1_FIXED_VALUES.c_register_storage_profile_v1!,
    p_backend_sha256: backendSha256,
  });
  await callControlFn(
    client,
    catalog,
    'c_register_retention_policy_v1',
    SO1_FIXED_VALUES.c_register_retention_policy_v1!,
  );
  await callControlFn(client, catalog, 'c_register_merchant_vocabulary_v1', {
    ...SO1_FIXED_VALUES.c_register_merchant_vocabulary_v1!,
    p_entries_sha256: entriesSha256(SO1_MERCHANT_REFS),
  });
  await callControlFn(client, catalog, 'c_register_manifest_v1', {
    ...SO1_FIXED_VALUES.c_register_manifest_v1!,
    p_manifest_sha256: manifestSha256,
  });
  await callControlFn(client, catalog, 'c_load_catalog_expectations_v1', {
    ...SO1_FIXED_VALUES.c_load_catalog_expectations_v1!,
    ...payloadOf(catalog, SO1_IDENTITIES.manifestVersion),
  });
  const activation = await callControlFn(client, catalog, 'c_activate_manifest_v1', {
    ...SO1_FIXED_VALUES.c_activate_manifest_v1!,
    p_manifest_sha256: manifestSha256,
  });

  return {
    manifestSha256,
    backendSha256,
    installationId: String(Object.values(activation[0]!)[0]),
  };
}

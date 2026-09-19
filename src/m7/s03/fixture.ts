// M7 V1.1 — S03 verification bootstrap: the VBCP fixture document F and its digests (VBA-01 §7).
//
// Verification tooling only. `M7-S03-VBCP` is a VERIFICATION FIXTURE — never a manifest, never lifecycle
// authority, never evidence that a reviewed manifest exists (VBA-LB-1 … VBA-LB-3). Every value here is a
// PRE-EXECUTION FIXED INPUT or a PRE-EXECUTION DERIVED EXPECTATION (VBA-AX-7); the one RUNTIME CHAINING
// VALUE (`backendSha256`) is named symbolically and never enters E, F or a digest.
import { createHash } from 'node:crypto';

import { canonicalize } from '../../persistence/canonical';
import type { DerivedCatalog, DerivedFunction, ExpectationPayload } from './expectations';
import { EXPECTATION_ARRAY_PARAMETERS } from './expectations';
import type { S03Sources, SourceIdentity } from './sources';

export class FixtureError extends Error {
  constructor(message: string) {
    super(`M7-S03-VBCP FIXTURE: ${message}`);
    this.name = 'FixtureError';
  }
}

/** VBA-FX-1: the marker of the M7-S03-VBCP namespace. */
export const VBCP_MARKER = 's03-verification-bootstrap';
/** VBA-FX-2: one deterministic positive decimal N, identical in all four identities. */
export const VBCP_N = 1;

export const VBCP_IDENTITIES = {
  manifestVersion: `pagamenos.m7.control-plane.${VBCP_MARKER}.v${VBCP_N}`,
  policyVersion: `pagamenos.m7.policy.${VBCP_MARKER}.v${VBCP_N}`,
  vocabularyVersion: `pagamenos.m7.merchant-vocabulary.${VBCP_MARKER}.v${VBCP_N}`,
  storageProfileVersion: `pagamenos.m7.storage-profile.${VBCP_MARKER}.v${VBCP_N}`,
} as const;

export const FIXTURE_SCHEMA_VERSION = 'pagamenos.m7.s03-verification-bootstrap-fixture.v1';
export const FIXTURE_KIND = 'S03_VERIFICATION_BOOTSTRAP_NOT_A_MANIFEST';
export const EXPECTATIONS_DOMAIN_TAG = 'PAGAMENOS/M7/S03-VBCP/EXPECTATIONS/V1\n';
export const FIXTURE_DOMAIN_TAG = 'PAGAMENOS/M7/S03-VBCP/FIXTURE/V1\n';

/** VBA-FX-4: member names F may not contain at any depth. */
export const FORBIDDEN_FIXTURE_MEMBERS = [
  'manifestSha256',
  'authority',
  'database',
  'retention',
  'storage',
  'deployment',
  'compatibility',
] as const;

/** The seven accepted control-plane calls of VBA-01 §4.1, in order. */
export const VBCP_CALL_ORDER = [
  'm7.c_register_storage_backend_v1',
  'm7.c_register_storage_profile_v1',
  'm7.c_register_retention_policy_v1',
  'm7.c_register_merchant_vocabulary_v1',
  'm7.c_register_manifest_v1',
  'm7.c_load_catalog_expectations_v1',
  'm7.c_activate_manifest_v1',
] as const;

export const VBCP_MERCHANT_REFS = [
  `${VBCP_MARKER}:merchant-a`,
  `${VBCP_MARKER}:merchant-b`,
  `${VBCP_MARKER}:merchant-c`,
] as const;

/**
 * The FIXED arguments (VBA-FX-3). No value is a timestamp, a random value, a Git identifier, a selector
 * value or a production-intended value; every identity-bearing value carries the marker; nothing names,
 * resolves to or authenticates against a real provider (the `.invalid` suffix is reserved, RFC 2606).
 * Interval values are PostgreSQL interval input strings; integers are JSON numbers.
 */
export const VBCP_FIXED_VALUES: Readonly<Record<string, Readonly<Record<string, unknown>>>> = {
  'm7.c_register_storage_backend_v1': {
    p_provider_class: 'CONFORMANCE_DOUBLE',
    p_container_id: `${VBCP_MARKER}.container`,
    p_region_id: `${VBCP_MARKER}.region`,
    p_endpoint_identity: `${VBCP_MARKER}.endpoint.invalid`,
    p_staging_prefix: `${VBCP_MARKER}/staging/`,
    p_evidence_prefix: `${VBCP_MARKER}/evidence/`,
    p_write_completion_window: '5 seconds',
  },
  'm7.c_register_storage_profile_v1': {
    p_storage_profile_version: VBCP_IDENTITIES.storageProfileVersion,
    p_credential_profile_id: `${VBCP_MARKER}.credential-profile`,
    p_credential_generation: 1,
    p_upload_transport: 'SERVER_MEDIATED',
    p_decoder_generation: `${VBCP_MARKER}.decoder.v1`,
    p_encoder_generation: `${VBCP_MARKER}.encoder.v1`,
    p_storage_capability_version: `${VBCP_MARKER}.capability.v1`,
    p_conditional_create_mode: 'IF_NONE_MATCH_STAR',
    p_write_capability_mode: 'EXACT_KEY_SCOPED_TOKEN',
    p_envelope_enforcement: 'PROVIDER_IAM',
  },
  'm7.c_register_retention_policy_v1': {
    p_policy_version: VBCP_IDENTITIES.policyVersion,
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
    p_session_ttl: '1 hour',
    p_capture_skew_tolerance: '120 seconds',
    p_orphan_grace: '1 hour',
    p_outbox_backoff_cap: '60 seconds',
    p_outbox_max_attempts: 5,
    p_max_upload_bytes: 1_048_576,
    p_max_pixels: 12_000_000,
    p_canonical_media_type: 'image/jpeg',
  },
  'm7.c_register_merchant_vocabulary_v1': {
    p_vocabulary_version: VBCP_IDENTITIES.vocabularyVersion,
    p_corpus_id: `${VBCP_MARKER}.corpus`,
    p_merchant_refs: [...VBCP_MERCHANT_REFS],
  },
  'm7.c_register_manifest_v1': {
    p_manifest_version: VBCP_IDENTITIES.manifestVersion,
    p_policy_version: VBCP_IDENTITIES.policyVersion,
    p_vocabulary_version: VBCP_IDENTITIES.vocabularyVersion,
    p_storage_profile_version: VBCP_IDENTITIES.storageProfileVersion,
  },
  'm7.c_load_catalog_expectations_v1': {
    p_manifest_version: VBCP_IDENTITIES.manifestVersion,
  },
  'm7.c_activate_manifest_v1': {
    p_manifest_version: VBCP_IDENTITIES.manifestVersion,
  },
};

type DerivedName = 'entriesSha256' | 'fixtureDigest' | `expectationPayload.${string}`;

/** VBA-FX-8 classification of the non-FIXED parameters (everything not listed here is FIXED). */
const NON_FIXED: Readonly<
  Record<string, Readonly<Record<string, { derived: DerivedName } | { returnOf: string }>>>
> = {
  'm7.c_register_storage_profile_v1': {
    p_backend_sha256: { returnOf: 'm7.c_register_storage_backend_v1' },
  },
  'm7.c_register_merchant_vocabulary_v1': { p_entries_sha256: { derived: 'entriesSha256' } },
  'm7.c_register_manifest_v1': { p_manifest_sha256: { derived: 'fixtureDigest' } },
  'm7.c_load_catalog_expectations_v1': Object.fromEntries(
    EXPECTATION_ARRAY_PARAMETERS.map((p) => [
      p,
      { derived: `expectationPayload.${p}` as DerivedName },
    ]),
  ),
  'm7.c_activate_manifest_v1': { p_manifest_sha256: { derived: 'fixtureDigest' } },
};

export type ArgumentDescriptor =
  | { readonly parameter: string; readonly class: 'FIXED'; readonly value: unknown }
  | { readonly parameter: string; readonly class: 'PRE_DERIVED'; readonly derived: DerivedName }
  | {
      readonly parameter: string;
      readonly class: 'RUNTIME_BINDING';
      readonly binding: { readonly returnOf: string };
    };

export interface CallDescriptor {
  readonly function: string;
  readonly arguments: readonly ArgumentDescriptor[];
}

export interface FixtureDocument {
  readonly fixtureSchemaVersion: string;
  readonly fixtureKind: string;
  readonly sources: {
    readonly S1: readonly Pick<SourceIdentity, 'path' | 'gitBlob' | 'sha256'>[];
    readonly S2: readonly Pick<SourceIdentity, 'path' | 'gitBlob' | 'sha256'>[];
    readonly S3: readonly Pick<SourceIdentity, 'path' | 'gitBlob' | 'sha256'>[];
  };
  readonly provisioning: {
    readonly migrationRole: { readonly value: string; readonly source: string };
    readonly ownerRolinherit: { readonly value: boolean; readonly source: string };
    readonly disposableVerificationRoles: Readonly<
      Record<string, { readonly name: string; readonly purpose: string }>
    >;
  };
  readonly controlPlaneInstall: readonly CallDescriptor[];
  readonly expectationPayloadSha256: string;
}

/**
 * Disposable roles S03 itself creates in its throwaway clusters (bootstrap administrator, VBA-TX-3). None
 * is loaded into the expectation set; none is an M7 role or the migration role.
 */
export const DISPOSABLE_VERIFICATION_ROLES = {
  legacy: {
    name: 's03_verification_bootstrap_legacy',
    purpose: 'T-09 legacy runtime role (VBA-01 §9.3); T-133 "some other role"',
  },
  probe: {
    name: 's03_verification_bootstrap_probe',
    purpose: 'T-77 brand-new role with no grants',
  },
  group: { name: 's03_verification_bootstrap_group', purpose: 'T-81 "a login role in a group"' },
  extraMember: {
    name: 's03_verification_bootstrap_extra_member',
    purpose: 'T-81 "owner members ≠ the migration role"',
  },
  t82Owner: {
    name: 's03_verification_bootstrap_t82_owner',
    purpose: 'T-82 (E03-09) isolated NOLOGIN owner of public.study_participant',
  },
} as const;

function pick(id: SourceIdentity): Pick<SourceIdentity, 'path' | 'gitBlob' | 'sha256'> {
  return { path: id.path, gitBlob: id.gitBlob, sha256: id.sha256 };
}

function findFunction(catalog: DerivedCatalog, qualified: string): DerivedFunction {
  const name = qualified.replace(/^m7\./, '');
  const f = catalog.functions.find((x) => x.name === name);
  if (!f) throw new FixtureError(`${qualified} is not an accepted function`);
  return f;
}

/** VBA-FX-8: one descriptor per declared parameter of each of the seven calls, in declared order. */
export function buildControlPlaneInstall(catalog: DerivedCatalog): CallDescriptor[] {
  return VBCP_CALL_ORDER.map((fn) => {
    const f = findFunction(catalog, fn);
    const fixed = VBCP_FIXED_VALUES[fn] ?? {};
    const nonFixed = NON_FIXED[fn] ?? {};
    const declared = new Set(f.argNames);
    for (const p of [...Object.keys(fixed), ...Object.keys(nonFixed)]) {
      if (!declared.has(p)) throw new FixtureError(`${fn}: ${p} is not a declared parameter`);
    }
    const args: ArgumentDescriptor[] = f.argNames.map((parameter) => {
      const inFixed = Object.prototype.hasOwnProperty.call(fixed, parameter);
      const other = nonFixed[parameter];
      if (inFixed === (other !== undefined)) {
        throw new FixtureError(`${fn}: ${parameter} must have exactly one class`);
      }
      if (inFixed) return { parameter, class: 'FIXED', value: fixed[parameter] };
      if ('derived' in other!) return { parameter, class: 'PRE_DERIVED', derived: other.derived };
      return { parameter, class: 'RUNTIME_BINDING', binding: { returnOf: other!.returnOf } };
    });
    return { function: fn, arguments: args };
  });
}

export interface Census {
  readonly declared: number;
  readonly FIXED: number;
  readonly PRE_DERIVED: number;
  readonly RUNTIME_BINDING: number;
  readonly perCall: readonly {
    readonly function: string;
    readonly declared: number;
    readonly FIXED: number;
    readonly PRE_DERIVED: number;
    readonly RUNTIME_BINDING: number;
  }[];
}

export function censusOf(install: readonly CallDescriptor[]): Census {
  const perCall = install.map((c) => ({
    function: c.function,
    declared: c.arguments.length,
    FIXED: c.arguments.filter((a) => a.class === 'FIXED').length,
    PRE_DERIVED: c.arguments.filter((a) => a.class === 'PRE_DERIVED').length,
    RUNTIME_BINDING: c.arguments.filter((a) => a.class === 'RUNTIME_BINDING').length,
  }));
  const sum = (k: 'declared' | 'FIXED' | 'PRE_DERIVED' | 'RUNTIME_BINDING') =>
    perCall.reduce((n, c) => n + c[k], 0);
  return {
    declared: sum('declared'),
    FIXED: sum('FIXED'),
    PRE_DERIVED: sum('PRE_DERIVED'),
    RUNTIME_BINDING: sum('RUNTIME_BINDING'),
    perCall,
  };
}

/** VBA-FX-8 required totals. */
export const REQUIRED_CENSUS = {
  declared: 70,
  FIXED: 48,
  PRE_DERIVED: 21,
  RUNTIME_BINDING: 1,
} as const;

export function assertCensus(c: Census): void {
  for (const k of Object.keys(REQUIRED_CENSUS) as (keyof typeof REQUIRED_CENSUS)[]) {
    if (c[k] !== REQUIRED_CENSUS[k]) {
      throw new FixtureError(`census ${k} = ${c[k]} ≠ ${REQUIRED_CENSUS[k]} (VBA-FX-8)`);
    }
  }
}

function digest(tag: string, value: unknown): string {
  return `sha256:${createHash('sha256').update(tag, 'utf8').update(canonicalize(value), 'utf8').digest('hex')}`;
}

/** VBA-FX-5: expectationPayloadSha256. */
export function expectationPayloadDigest(e: ExpectationPayload): string {
  return digest(EXPECTATIONS_DOMAIN_TAG, e);
}

/** VBA-FX-5: fixtureDigest (F never contains it). */
export function fixtureDigestOf(f: FixtureDocument): string {
  return digest(FIXTURE_DOMAIN_TAG, f);
}

/** V1.1 §19.11.2 entries digest: refs sorted COLLATE "C" (bytewise), LF-joined, SHA-256. */
export function entriesSha256Of(refs: readonly string[]): string {
  const sorted = [...refs].sort((a, b) =>
    Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8')),
  );
  return `sha256:${createHash('sha256').update(sorted.join('\n'), 'utf8').digest('hex')}`;
}

/** Every object member name of `value`, at any depth. */
export function memberNames(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) value.forEach((v) => memberNames(v, out));
  else if (value !== null && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      out.add(k);
      memberNames(v, out);
    }
  }
  return out;
}

/** VBA-FX-4 structural refusals, plus the marker rules of VBA-FX-1 … VBA-FX-3. */
export function assertFixtureShape(f: FixtureDocument): void {
  const top = Object.keys(f).sort();
  const want = [
    'controlPlaneInstall',
    'expectationPayloadSha256',
    'fixtureKind',
    'fixtureSchemaVersion',
    'provisioning',
    'sources',
  ];
  if (JSON.stringify(top) !== JSON.stringify(want)) {
    throw new FixtureError(`top-level members ${top.join(',')} ≠ ${want.join(',')}`);
  }
  if (f.fixtureSchemaVersion !== FIXTURE_SCHEMA_VERSION || f.fixtureKind !== FIXTURE_KIND) {
    throw new FixtureError('fixtureSchemaVersion / fixtureKind not as VBA-FX-4 requires');
  }
  const names = memberNames(f);
  for (const bad of FORBIDDEN_FIXTURE_MEMBERS) {
    if (names.has(bad)) throw new FixtureError(`forbidden member ${bad} present`);
  }
  for (const id of Object.values(VBCP_IDENTITIES)) {
    if (!id.includes(VBCP_MARKER)) throw new FixtureError(`identity ${id} lacks the marker`);
  }
  const backend = VBCP_FIXED_VALUES['m7.c_register_storage_backend_v1']!;
  const profile = VBCP_FIXED_VALUES['m7.c_register_storage_profile_v1']!;
  const vocab = VBCP_FIXED_VALUES['m7.c_register_merchant_vocabulary_v1']!;
  for (const v of [
    backend.p_container_id,
    backend.p_region_id,
    backend.p_endpoint_identity,
    profile.p_credential_profile_id,
    vocab.p_corpus_id,
  ]) {
    if (typeof v !== 'string' || !v.includes(VBCP_MARKER))
      throw new FixtureError(`${String(v)} lacks the marker`);
  }
  for (const p of [backend.p_staging_prefix, backend.p_evidence_prefix]) {
    if (typeof p !== 'string' || !p.startsWith(`${VBCP_MARKER}/`))
      throw new FixtureError(`prefix ${String(p)}`);
  }
  if (
    backend.p_provider_class !== 'CONFORMANCE_DOUBLE' ||
    profile.p_upload_transport !== 'SERVER_MEDIATED'
  ) {
    throw new FixtureError('providerClass / uploadTransport not as VBA-FX-3 requires');
  }
  for (const r of vocab.p_merchant_refs as string[]) {
    if (!r.startsWith(`${VBCP_MARKER}:`))
      throw new FixtureError(`merchantRef ${r} lacks the marker prefix`);
  }
  if (JSON.stringify(f).includes('backendSha256')) {
    throw new FixtureError('F names the runtime chaining value itself');
  }
}

export interface FixtureBuild {
  readonly fixture: FixtureDocument;
  readonly expectationPayloadSha256: string;
  readonly fixtureDigest: string;
  readonly entriesSha256: string;
  readonly census: Census;
}

/** VBA-FX-5 computation order: E → expectationPayloadSha256 → F → fixtureDigest. */
export function buildFixture(
  sources: S03Sources,
  catalog: DerivedCatalog,
  payload: ExpectationPayload,
): FixtureBuild {
  if (payload.manifestVersion !== VBCP_IDENTITIES.manifestVersion) {
    throw new FixtureError('E.manifestVersion is not the FIXED manifestVersion');
  }
  const expectationPayloadSha256 = expectationPayloadDigest(payload);
  const controlPlaneInstall = buildControlPlaneInstall(catalog);
  const census = censusOf(controlPlaneInstall);
  assertCensus(census);
  const fixture: FixtureDocument = {
    fixtureSchemaVersion: FIXTURE_SCHEMA_VERSION,
    fixtureKind: FIXTURE_KIND,
    sources: {
      S1: sources.s1.map(pick),
      S2: [...sources.fragments.map((f) => pick(f.identity)), pick(sources.extractionIndex)],
      S3: [pick(sources.rolesTemplate), pick(sources.provisionModule)],
    },
    provisioning: {
      migrationRole: {
        value: catalog.migrationRole,
        source: `${sources.provisionModule.path} HARNESS_MIGRATION_ROLE (S3)`,
      },
      ownerRolinherit: {
        value: catalog.ownerRolinherit,
        source: `${sources.rolesTemplate.path} CREATE ROLE ${catalog.ownerRole} … NOINHERIT (S3)`,
      },
      disposableVerificationRoles: DISPOSABLE_VERIFICATION_ROLES,
    },
    controlPlaneInstall,
    expectationPayloadSha256,
  };
  assertFixtureShape(fixture);
  return {
    fixture,
    expectationPayloadSha256,
    fixtureDigest: fixtureDigestOf(fixture),
    entriesSha256: entriesSha256Of(VBCP_MERCHANT_REFS),
    census,
  };
}

// ---------------------------------------------------------------------------------------------------
// The recorded JSON → SQL mapping (VBA-FX-8 `value`)
// ---------------------------------------------------------------------------------------------------

/**
 * One deterministic mapping from a JSON argument value to the text of one bind parameter, which the call
 * statement casts explicitly to the parameter's declared type: a string is sent as is; an integer as its
 * decimal text; a boolean as `true` / `false`; an array as a PostgreSQL array literal whose elements are
 * double-quoted with `\` and `"` escaped and whose JSON null elements are `NULL`.
 */
export function toBindText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) throw new FixtureError(`non-integer number ${value}`);
    return String(value);
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) {
    const el = (v: unknown): string => {
      if (v === null) return 'NULL';
      if (Array.isArray(v) || (typeof v === 'object' && v !== null)) {
        throw new FixtureError('nested array element');
      }
      return `"${toBindText(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
    };
    return `{${value.map(el).join(',')}}`;
  }
  throw new FixtureError(`unmappable argument value ${JSON.stringify(value)}`);
}

export interface ResolvedArgument {
  readonly parameter: string;
  readonly class: ArgumentDescriptor['class'];
  readonly domain:
    'PRE-EXECUTION FIXED INPUT' | 'PRE-EXECUTION DERIVED EXPECTATION' | 'RUNTIME CHAINING VALUE';
  readonly declaredType: string;
  readonly bindText: string;
}

export interface ResolvedCall {
  readonly function: string;
  readonly sql: string;
  readonly arguments: readonly ResolvedArgument[];
}

/**
 * Resolves one call descriptor into its statement and bind values. PRE_DERIVED values come only from
 * `derived`; the RUNTIME_BINDING value only from `runtime` (the recorded return of its producer).
 */
export function resolveCall(
  call: CallDescriptor,
  catalog: DerivedCatalog,
  derived: {
    readonly payload: ExpectationPayload;
    readonly fixtureDigest: string;
    readonly entriesSha256: string;
  },
  runtime: ReadonlyMap<string, string>,
): ResolvedCall {
  const f = findFunction(catalog, call.function);
  const args: ResolvedArgument[] = call.arguments.map((a, i) => {
    if (a.parameter !== f.argNames[i])
      throw new FixtureError(`${call.function}: argument order drift`);
    const declaredType = f.declaredTypes[i]!;
    if (a.class === 'FIXED') {
      return {
        parameter: a.parameter,
        class: a.class,
        domain: 'PRE-EXECUTION FIXED INPUT',
        declaredType,
        bindText: toBindText(a.value),
      };
    }
    if (a.class === 'PRE_DERIVED') {
      let value: unknown;
      if (a.derived === 'fixtureDigest') value = derived.fixtureDigest;
      else if (a.derived === 'entriesSha256') value = derived.entriesSha256;
      else
        value = (derived.payload as unknown as Record<string, unknown>)[
          a.derived.slice('expectationPayload.'.length)
        ];
      if (value === undefined) throw new FixtureError(`${call.function}: ${a.derived} unresolved`);
      return {
        parameter: a.parameter,
        class: a.class,
        domain: 'PRE-EXECUTION DERIVED EXPECTATION',
        declaredType,
        bindText: toBindText(value),
      };
    }
    const bound = runtime.get(a.binding.returnOf);
    if (bound === undefined)
      throw new FixtureError(`${call.function}: runtime binding not yet produced`);
    return {
      parameter: a.parameter,
      class: a.class,
      domain: 'RUNTIME CHAINING VALUE',
      declaredType,
      bindText: bound,
    };
  });
  const placeholders = args.map((a, i) => `$${i + 1}::${a.declaredType}`).join(', ');
  return {
    function: call.function,
    sql: `SELECT ${call.function}(${placeholders}) AS result`,
    arguments: args,
  };
}

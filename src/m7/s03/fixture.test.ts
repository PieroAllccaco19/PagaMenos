import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { canonicalize } from '../../persistence/canonical';
import { deriveExpectations } from './expectations';
import {
  FIXTURE_DOMAIN_TAG,
  FIXTURE_KIND,
  FIXTURE_SCHEMA_VERSION,
  FORBIDDEN_FIXTURE_MEMBERS,
  FixtureError,
  REQUIRED_CENSUS,
  VBCP_CALL_ORDER,
  VBCP_IDENTITIES,
  VBCP_MARKER,
  VBCP_MERCHANT_REFS,
  assertFixtureShape,
  buildFixture,
  entriesSha256Of,
  expectationPayloadDigest,
  fixtureDigestOf,
  memberNames,
  resolveCall,
  toBindText,
} from './fixture';
import { loadS03Sources } from './sources';

const sources = loadS03Sources(process.cwd());
const { payload, catalog } = deriveExpectations(sources, VBCP_IDENTITIES.manifestVersion);
const build = buildFixture(sources, catalog, payload);
const F = build.fixture;

describe('M7-S03-VBCP fixture document F (VBA-01 §7)', () => {
  it('has exactly the six VBA-FX-4 members and the non-manifest schema / kind', () => {
    expect(Object.keys(F).sort()).toEqual(
      [
        'controlPlaneInstall',
        'expectationPayloadSha256',
        'fixtureKind',
        'fixtureSchemaVersion',
        'provisioning',
        'sources',
      ].sort(),
    );
    expect(F.fixtureSchemaVersion).toBe(FIXTURE_SCHEMA_VERSION);
    expect(F.fixtureKind).toBe(FIXTURE_KIND);
  });

  it('contains no forbidden member at any depth, no digest of itself, no expectation array', () => {
    const names = memberNames(F);
    for (const m of FORBIDDEN_FIXTURE_MEMBERS) expect(names.has(m)).toBe(false);
    const text = JSON.stringify(F);
    expect(text).not.toContain(build.fixtureDigest);
    expect(text).not.toContain(payload.p_function_source_sha256[0]!);
    expect(() =>
      assertFixtureShape({ ...F, sources: { ...F.sources, storage: [] } as never }),
    ).toThrow(FixtureError);
  });

  it('uses the exact VBA-FX-2 versioned identities with one N and the marker everywhere required', () => {
    expect(VBCP_IDENTITIES).toEqual({
      manifestVersion: 'pagamenos.m7.control-plane.s03-verification-bootstrap.v1',
      policyVersion: 'pagamenos.m7.policy.s03-verification-bootstrap.v1',
      vocabularyVersion: 'pagamenos.m7.merchant-vocabulary.s03-verification-bootstrap.v1',
      storageProfileVersion: 'pagamenos.m7.storage-profile.s03-verification-bootstrap.v1',
    });
    expect(VBCP_MERCHANT_REFS.every((r) => r.startsWith(`${VBCP_MARKER}:`))).toBe(true);
    // the only Git object ids in F are the source blob pins VBA-FX-4 requires (no commit, no HEAD, no selector)
    const blobs = new Set(
      [...F.sources.S1, ...F.sources.S2, ...F.sources.S3].map((s) => s.gitBlob),
    );
    const ids = JSON.stringify(F).match(/\b[0-9a-f]{40}\b/g) ?? [];
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.every((id) => blobs.has(id))).toBe(true);
  });

  it('classifies the 70 declared parameters as 48 FIXED / 21 PRE_DERIVED / 1 RUNTIME_BINDING (VBA-FX-8)', () => {
    expect(F.controlPlaneInstall.map((c) => c.function)).toEqual([...VBCP_CALL_ORDER]);
    expect({
      declared: build.census.declared,
      FIXED: build.census.FIXED,
      PRE_DERIVED: build.census.PRE_DERIVED,
      RUNTIME_BINDING: build.census.RUNTIME_BINDING,
    }).toEqual(REQUIRED_CENSUS);
    const binding = F.controlPlaneInstall.flatMap((c) =>
      c.arguments.filter((a) => a.class === 'RUNTIME_BINDING'),
    );
    expect(binding).toEqual([
      {
        parameter: 'p_backend_sha256',
        class: 'RUNTIME_BINDING',
        binding: { returnOf: 'm7.c_register_storage_backend_v1' },
      },
    ]);
  });

  it('computes both digests with their domain tags, without recursion', () => {
    expect(F.expectationPayloadSha256).toBe(expectationPayloadDigest(payload));
    const manual = `sha256:${createHash('sha256')
      .update(FIXTURE_DOMAIN_TAG + canonicalize(F), 'utf8')
      .digest('hex')}`;
    expect(build.fixtureDigest).toBe(manual);
    expect(fixtureDigestOf(F)).toBe(build.fixtureDigest);
    expect(build.fixtureDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
    // VBA-FX-6: the preimage begins with 'P', a production manifest preimage with '{'
    expect(FIXTURE_DOMAIN_TAG.charCodeAt(0)).toBe(0x50);
    // a change to E changes both digests
    const e2 = { ...payload, p_role_names: [...payload.p_role_names].reverse() };
    const b2 = buildFixture(sources, catalog, e2);
    expect(b2.expectationPayloadSha256).not.toBe(build.expectationPayloadSha256);
    expect(b2.fixtureDigest).not.toBe(build.fixtureDigest);
  });

  it('derives entriesSha256 as V1.1 §19.11.2 states (COLLATE "C" sort, LF join)', () => {
    const want = `sha256:${createHash('sha256')
      .update([...VBCP_MERCHANT_REFS].sort().join('\n'))
      .digest('hex')}`;
    expect(build.entriesSha256).toBe(want);
    expect(entriesSha256Of(['b', 'B', 'a'])).toBe(
      `sha256:${createHash('sha256').update('B\na\nb').digest('hex')}`,
    );
  });

  it('maps JSON values to bind text deterministically', () => {
    expect(toBindText('5 seconds')).toBe('5 seconds');
    expect(toBindText(7)).toBe('7');
    expect(toBindText([true, null, false])).toBe('{"true",NULL,"false"}');
    expect(toBindText(['m7.f(m7."E",text)', 'a\\b'])).toBe('{"m7.f(m7.\\"E\\",text)","a\\\\b"}');
    expect(() => toBindText(1.5)).toThrow(FixtureError);
  });

  it('resolves calls only from F / E, and the runtime binding only from the producer return', () => {
    const derived = {
      payload,
      fixtureDigest: build.fixtureDigest,
      entriesSha256: build.entriesSha256,
    };
    const profileCall = F.controlPlaneInstall[1]!;
    expect(() => resolveCall(profileCall, catalog, derived, new Map())).toThrow(FixtureError);
    const r = resolveCall(
      profileCall,
      catalog,
      derived,
      new Map([['m7.c_register_storage_backend_v1', 'sha256:x']]),
    );
    expect(r.arguments[1]).toMatchObject({
      parameter: 'p_backend_sha256',
      domain: 'RUNTIME CHAINING VALUE',
      bindText: 'sha256:x',
    });
    const manifest = resolveCall(F.controlPlaneInstall[4]!, catalog, derived, new Map());
    expect(manifest.arguments.find((a) => a.parameter === 'p_manifest_sha256')!.bindText).toBe(
      build.fixtureDigest,
    );
    expect(manifest.sql).toBe(
      'SELECT m7.c_register_manifest_v1($1::text, $2::text, $3::text, $4::text, $5::text) AS result',
    );
  });
});

import { describe, expect, it } from 'vitest';

import { assertOutsideRepository, sanitize } from './evidence';
import { deriveExpectations } from './expectations';
import { VBCP_IDENTITIES, buildFixture, resolveCall } from './fixture';
import {
  CHECKPOINT_BEFORE_F26_SUFFIX,
  FINAL_BOOTSTRAP_CALL,
  type JournalEntry,
  OrchestrationError,
  assertNoInterleaving,
  partitionF26,
  withSessionIdentityProjection,
} from './orchestration';
import { loadS03Sources } from './sources';

const f26 = loadS03Sources(process.cwd()).fragments[25]!.sql;

describe('VBA-OR-2 F26 partition', () => {
  it('partitions F26 at its one DO $final$ line into the VBA-01 informative pins', () => {
    const p = partitionF26(f26);
    expect(p.concatenationIdentical).toBe(true);
    expect(p.original).toEqual({
      sha256: '3a463c0c3b9602daccfef772da49420fea2284304947bad1d8973bf0358a449f',
      bytes: 2534,
    });
    // VBA-01 VBA-OR-2 prints "2 094 bytes" for the prefix: an informative typo dispositioned by Erratum 05
    // §12.1 (2 094 characters = 2 095 UTF-8 bytes, one two-byte `§`). The SHA-256 pins and the exact
    // recomposition are controlling.
    expect(p.prefix).toEqual({
      sha256: 'e671ed4fc4c030a56bfe641514f8ab86277ae67dfcbb6c2b17b8742ee164480b',
      bytes: 2095,
    });
    expect(p.suffix).toEqual({
      sha256: 'c000c8085dec7d8b69b495776704e1d94800efe8c3b997c0cadbc3ad272ff7e8',
      bytes: 439,
    });
    expect(p.prefixText + p.suffixText).toBe(f26);
  });

  it('refuses zero or several partition lines', () => {
    expect(() => partitionF26(f26.replace('DO $final$\n', 'DO $other$\n'))).toThrow(
      OrchestrationError,
    );
    expect(() => partitionF26(`${f26}DO $final$\n`)).toThrow(OrchestrationError);
    expect(() => partitionF26(f26.replace('DO $final$\n', ' DO $final$\n'))).toThrow(
      OrchestrationError,
    );
  });
});

describe('VBA-TX-1 no interleaving', () => {
  const e = (label: string, kind: JournalEntry['kind']): JournalEntry => ({
    seq: 0,
    label,
    kind,
    outcome: 'ok',
  });
  it('accepts only the seven calls between the first call and F26-suffix', () => {
    const good = [
      e('F26-prefix', 'fragment-part'),
      e('checkpoint:x', 'checkpoint'),
      e('vbcp:1', 'vbcp-call'),
      e('vbcp:2', 'vbcp-call'),
      e('F26-suffix', 'fragment-part'),
    ];
    expect(() => assertNoInterleaving(good)).not.toThrow();
    const bad = [
      e('vbcp:1', 'vbcp-call'),
      e('checkpoint:y', 'checkpoint'),
      e('vbcp:2', 'vbcp-call'),
      e('F26-suffix', 'fragment-part'),
    ];
    expect(() => assertNoInterleaving(bad)).toThrow(OrchestrationError);
  });
});

describe('S03 evidence hygiene', () => {
  it('redacts credentials and the ephemeral port', () => {
    expect(
      sanitize('postgresql://u:s3cret@127.0.0.1:54321/db "port": 54321', ['s3cret'], [54321]),
    ).toBe('postgresql://u:[REDACTED]@127.0.0.1:<port>/db "port": "<port>"');
  });
  it('refuses an evidence path inside the repository', () => {
    expect(() => assertOutsideRepository(`${process.cwd()}/evidence`, process.cwd())).toThrow();
    expect(() =>
      assertOutsideRepository(`${process.cwd()}/../elsewhere`, process.cwd()),
    ).not.toThrow();
  });
});

describe('AUD-S03-E05-01: direct immediately-before-F26-suffix checkpoint', () => {
  const sources = loadS03Sources(process.cwd());
  const { payload, catalog } = deriveExpectations(sources, VBCP_IDENTITIES.manifestVersion);
  const build = buildFixture(sources, catalog, payload);
  const seventh = build.fixture.controlPlaneInstall[6]!;
  const resolved = resolveCall(
    seventh,
    catalog,
    { payload, fixtureDigest: build.fixtureDigest, entriesSha256: build.entriesSha256 },
    new Map(),
  );

  it('the seventh call is c_activate_manifest_v1 and stays ONE statement with ONE call', () => {
    expect(seventh.function).toBe(FINAL_BOOTSTRAP_CALL);
    const sql = withSessionIdentityProjection(resolved.sql);
    expect(sql.startsWith(resolved.sql)).toBe(true);
    expect(sql.split('m7.c_activate_manifest_v1(')).toHaveLength(2);
    expect(sql).not.toContain(';');
    expect(sql).toMatch(
      /, session_user::text AS "sessionUser", current_user::text AS "currentUser"$/,
    );
    // bind parameters unchanged: the same placeholders, the same values
    expect(sql.match(/\$\d+::/g)).toEqual(resolved.sql.match(/\$\d+::/g));
    expect(CHECKPOINT_BEFORE_F26_SUFFIX).toBe('immediately-before-F26-suffix');
  });

  it('refuses to project onto any other statement shape', () => {
    expect(() => withSessionIdentityProjection('SELECT 1 AS result')).toThrow(OrchestrationError);
    expect(() =>
      withSessionIdentityProjection(
        `${resolved.sql}; SELECT m7.c_activate_manifest_v1($1) AS result`,
      ),
    ).toThrow(OrchestrationError);
  });
});

// M7 S01 — Erratum 01 ER-01 extraction preconditions over the accepted template. No manifest digest and
// no migrationSha256 is computed anywhere in S01.
import { describe, expect, it } from 'vitest';

import { v11Text } from './__fixtures__/accepted-sources';
import { selectNormativeFragments } from './fragments';
import {
  PLACEHOLDER_P,
  checkMdMgPreconditions,
  functionBodies,
  runNegativeControls,
  toCheckedFragments,
} from './manifest-digest-preconditions';

const fragments = toCheckedFragments(selectNormativeFragments(v11Text).fragments);

describe('MD/MG preconditions — accepted fragments', () => {
  const result = checkMdMgPreconditions(fragments);

  it('holds with no violation', () => {
    expect(result.violations).toEqual([]);
  });

  it('P is the 71-byte MD-1 placeholder and occurs nowhere in the fragments', () => {
    expect(PLACEHOLDER_P).toBe(
      'sha256:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    );
    expect(result.placeholder.byteLength).toBe(71);
    expect(result.placeholder.matchesDigestPattern).toBe(false);
    expect(result.placeholder.occurrencesInFragments).toBe(0);
  });

  it('exactly two <manifestSha256> template arguments, at the two designated §19.13.4 slots', () => {
    expect(result.manifestSha256Template.occurrencesInFragments).toBe(2);
    expect(
      result.manifestSha256Template.locations.map((l) => [
        l.fragment,
        l.clause,
        l.sourceLine,
        l.call,
        l.argumentIndex,
      ]),
    ).toEqual([
      ['F26', '19.13.4', 8851, 'c_register_manifest_v1', 1],
      ['F26', '19.13.4', 8853, 'c_activate_manifest_v1', 1],
    ]);
    expect(v11Text.split('\n')[8850]).toBe(
      '--   SELECT m7.c_register_manifest_v1(<manifestVersion>, <manifestSha256>, ...);',
    );
    expect(v11Text.split('\n')[8852]).toBe(
      '--   SELECT m7.c_activate_manifest_v1(<manifestVersion>, <manifestSha256>);',
    );
  });

  it('§19.11.2 names the designated parameter p_manifest_sha256 in both functions', () => {
    expect(result.parameterNames.c_register_manifest_v1[1]).toBe('p_manifest_sha256');
    expect(result.parameterNames.c_activate_manifest_v1).toEqual([
      'p_manifest_version',
      'p_manifest_sha256',
    ]);
  });

  it('no concrete digest literal in any normative SQL or in any of the 110 function bodies', () => {
    expect(result.concreteDigestScan).toEqual({
      prefixedDigestLiteralsInFragments: 0,
      bareHex64InFragments: 0,
      functionBodiesScanned: 110,
      prefixedDigestLiteralsInFunctionBodies: 0,
      bareHex64InFunctionBodies: 0,
    });
    expect(functionBodies(fragments)).toHaveLength(110);
  });
});

describe('MD/MG preconditions — negative controls', () => {
  const controls = runNegativeControls(fragments);

  it('every control is refused', () => {
    expect(controls.map((c) => c.id)).toEqual([
      'NC-1',
      'NC-2',
      'NC-3',
      'NC-4',
      'NC-5',
      'NC-6',
      'NC-7',
      'NC-8',
    ]);
    for (const c of controls) expect(c.failed, `${c.id}: ${c.mutation}`).toBe(true);
  });

  it('cardinality 3, 1 and misplaced-2 are each refused for the template reason', () => {
    const byId = new Map(controls.map((c) => [c.id, c.violations.join(' | ')]));
    expect(byId.get('NC-1')).toMatch(/3 <manifestSha256> template arguments, expected exactly 2/);
    expect(byId.get('NC-2')).toMatch(/1 <manifestSha256> template arguments, expected exactly 2/);
    expect(byId.get('NC-3')).toMatch(/outside a designated slot/);
    expect(byId.get('NC-4')).toMatch(/3 <manifestSha256>/);
    expect(byId.get('NC-5')).toMatch(/P occurs 1 time/);
    expect(byId.get('NC-6')).toMatch(/concrete sha256: digest literal/);
    expect(byId.get('NC-7')).toMatch(/designated slots are/);
    expect(byId.get('NC-8')).toMatch(/c_activate_manifest_v1 second parameter/);
  });

  it('controls mutate copies only: the accepted fragments still pass afterwards', () => {
    expect(checkMdMgPreconditions(fragments).violations).toEqual([]);
  });
});

// M7 S01 — the Erratum 01 override table (ER-01…ER-05), verified against both accepted documents.
import { describe, expect, it } from 'vitest';

import { e01Text, replaceOnce, v11Text } from './__fixtures__/accepted-sources';
import { type OverrideInputs, verifyErratum01Overrides } from './erratum-01-overrides';
import { selectNormativeFragments } from './fragments';
import { deriveInventory } from './inventory';
import {
  checkMdMgPreconditions,
  runNegativeControls,
  toCheckedFragments,
} from './manifest-digest-preconditions';

const selection = selectNormativeFragments(v11Text);
const checked = toCheckedFragments(selection.fragments);
const base: OverrideInputs = {
  v11Text,
  e01Text,
  fragments: selection.fragments,
  inventory: deriveInventory(v11Text, selection),
  preconditions: checkMdMgPreconditions(checked),
  negativeControls: runNegativeControls(checked),
};

function byId(inputs: OverrideInputs) {
  return new Map(verifyErratum01Overrides(inputs).map((r) => [r.id, r]));
}

describe('Erratum 01 overrides — accepted bytes', () => {
  const records = byId(base);

  it('ER-01…ER-05 all pass', () => {
    expect([...records.keys()]).toEqual(['ER-01', 'ER-02', 'ER-03', 'ER-04', 'ER-05']);
    for (const r of records.values()) {
      expect(
        r.evidence.filter((e) => !e.pass),
        r.id,
      ).toEqual([]);
      expect(r.pass).toBe(true);
    }
  });

  it('ER-02: six credential keys, six login roles, 9 × 6 denials, 209 T-IDs', () => {
    const s = records.get('ER-02')!.s01Reading;
    expect(s.section24_3CredentialEnvKeys).toEqual([
      'M7_CAPABILITY_SIGNER_DATABASE_URL',
      'M7_DELETION_AUTHORITY_DATABASE_URL',
      'M7_PARTICIPANT_DATABASE_URL',
      'M7_PRIVACY_REQUEST_DATABASE_URL',
      'M7_SESSION_ISSUER_DATABASE_URL',
      'M7_STORAGE_WORKER_DATABASE_URL',
    ]);
    expect(s.t08bLoginRoleCount).toBe(6);
    expect(s.t08bExpectedDenials).toEqual({
      cFunctions: 9,
      loginRoles: 6,
      total: 54,
      sqlstate: '42501',
    });
    expect(s.distinctTIdCount).toBe(209);
  });

  it('ER-03: PA-1 includes experiment_assignment, purchase_intent and analysis_protocol; no A1/A2 code change', () => {
    const s = records.get('ER-03')!.s01Reading;
    expect(s.pa1ExplicitlyLockedRelations).toEqual([
      'public.experiment_assignment',
      'public.purchase_intent',
      'public.analysis_protocol',
    ]);
    expect(s.a1A2RuntimeCodeChangedByS01).toBe(false);
  });

  it('ER-01: no fixed-point hashing, raw checksum is not migrationSha256, nothing computed', () => {
    const s = records.get('ER-01')!.s01Reading;
    expect(s.fixedPointHashing).toBe(false);
    expect(s.rawMigrationFileChecksumIsMigrationSha256).toBe(false);
    expect(s.finalManifestDigestComputedByS01).toBe(false);
    expect(s.migrationSha256ComputedByS01).toBe(false);
  });

  it('ER-04: baselineCommit is governed by BC-1…BC-6 and not chosen by S01', () => {
    const s = records.get('ER-04')!.s01Reading;
    expect(s.governedBy).toBe('BC-1…BC-6');
    expect(s.baselineCommit).toBeNull();
    expect(s.chosenOrHardCodedByS01).toBe(false);
  });

  it('ER-05: LC-1…LC-7 recorded, corrected MA-6, no lifecycle event executed', () => {
    const s = records.get('ER-05')!.s01Reading as {
      lifecycleEvents: { id: string }[];
      lifecycleEventsExecutedByS01: [];
    };
    expect(s.lifecycleEvents.map((e) => e.id)).toEqual([
      'LC-1',
      'LC-2',
      'LC-3',
      'LC-4',
      'LC-5',
      'LC-6',
      'LC-7',
    ]);
    expect(s.lifecycleEventsExecutedByS01).toEqual([]);
  });
});

describe('Erratum 01 overrides — negative controls', () => {
  it('ER-02 fails if the T-08b After cardinality reverts to 9 × 5', () => {
    const e01 = replaceOnce(
      e01Text,
      '| `42501` for all 9 × 6 | unchanged |',
      '| `42501` for all 9 × 5 | unchanged |',
    );
    expect(byId({ ...base, e01Text: e01 }).get('ER-02')!.pass).toBe(false);
  });

  it('ER-02 fails if the V1.1 T-08b row no longer equals the Erratum Before row', () => {
    const v11 = replaceOnce(
      v11Text,
      'each of the five login roles calls every',
      'each of the 5 login roles calls every',
    );
    expect(byId({ ...base, v11Text: v11 }).get('ER-02')!.pass).toBe(false);
  });

  it('ER-03 fails if analysis_protocol is dropped from the PA-1 After row', () => {
    const e01 = replaceOnce(
      e01Text,
      '(iii) public.analysis_protocol (FOR UPDATE',
      '(iii) public.other_relation (FOR UPDATE',
    );
    expect(byId({ ...base, e01Text: e01 }).get('ER-03')!.pass).toBe(false);
  });

  it('ER-01 fails if an MD/MG precondition is violated', () => {
    const preconditions = { ...base.preconditions, violations: ['synthetic'] };
    expect(byId({ ...base, preconditions }).get('ER-01')!.pass).toBe(false);
  });

  it('ER-04 fails if a BC rule is missing', () => {
    const e01 = replaceOnce(e01Text, '- **BC-6 (exclusions).**', '- BC-6 (exclusions).');
    expect(byId({ ...base, e01Text: e01 }).get('ER-04')!.pass).toBe(false);
  });

  it('ER-05 fails if a lifecycle event is renamed', () => {
    const e01 = replaceOnce(
      e01Text,
      '| **LC-5** | **PRIVILEGED SELECTOR ROTATION** |',
      '| **LC-5** | **SELECTOR ROTATION** |',
    );
    expect(byId({ ...base, e01Text: e01 }).get('ER-05')!.pass).toBe(false);
  });
});

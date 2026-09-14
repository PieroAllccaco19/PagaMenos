// M7 S01 — mechanical inventory reconciliation against the accepted counts (V1.1 §19.14, §19.14.1;
// Erratum 01 §10.1). Negative cases prove a mismatch surfaces as a SPEC-DEFECT instead of being absorbed.
import { describe, expect, it } from 'vitest';

import { editLines, replaceOnce, v11Text } from './__fixtures__/accepted-sources';
import { selectNormativeFragments } from './fragments';
import {
  ACCEPTED_INVENTORY,
  SpecDefectError,
  deriveInventory,
  expandRange,
  reconcileInventory,
} from './inventory';

const selection = selectNormativeFragments(v11Text);
const inventory = deriveInventory(v11Text, selection);

describe('M7 inventory — accepted bytes reconcile exactly', () => {
  it('every reconciliation check passes', () => {
    const failed = reconcileInventory(inventory).filter((c) => !c.pass);
    expect(failed).toEqual([]);
  });

  it('DDL object counts', () => {
    const d = inventory.ddl;
    expect(d.tables).toBe(39);
    expect(d.tablesBySection).toEqual({
      '19.4': 7,
      '19.5': 6,
      '19.6': 2,
      '19.7': 3,
      '19.8': 12,
      '19.9': 9,
    });
    expect(d.enums).toBe(31);
    expect(d.views).toBe(4);
    expect(d.functions).toBe(110);
    expect(d.functionsDefiner).toBe(45);
    expect(d.functionsInvoker).toBe(65);
    expect(d.functionsByPrefix).toEqual({
      c: 9,
      s: 2,
      r: 1,
      p: 6,
      a: 1,
      w: 25,
      x: 1,
      i: 32,
      t: 33,
    });
    expect([d.primaryKeys, d.uniqueConstraints, d.foreignKeys, d.checkConstraints]).toEqual([
      39, 57, 92, 158,
    ]);
    expect([d.foreignKeysInline, d.foreignKeysAlterTable]).toEqual([90, 2]);
    expect([d.indexes, d.indexesNonUnique, d.indexesUnique]).toEqual([28, 20, 8]);
    expect([d.triggersExplicit, d.triggersLoop, d.triggersTotal]).toEqual([35, 148, 183]);
    expect([
      d.triggersExplicitBeforeUpdate,
      d.triggersExplicitBeforeInsert,
      d.triggersExplicitAfter,
    ]).toEqual([8, 24, 3]);
    expect([d.triggersLoopRows, d.triggersLoopForbidUpdateRows]).toEqual([39, 31]);
  });

  it('the same DDL rules give the same counts over the 26 fragments as over §19.2–§19.13', () => {
    for (const [key, v] of Object.entries(inventory.ddl.fragmentScopeAgreement)) {
      expect(v.fragments, key).toBe(v.scope);
    }
  });

  it('identifier registers', () => {
    expect(inventory.sqlStates.ids).toEqual(expandRange(ACCEPTED_INVENTORY.sqlStates));
    expect(inventory.sqlStates.ids[0]).toBe('M7001');
    expect(inventory.sqlStates.ids[13]).toBe('M7014');
    expect(inventory.verificationCases.distinct).toBe(209);
    expect(inventory.verificationCases.duplicates).toEqual(['T-118']);
    expect([...inventory.invariants.ids].sort()).toEqual(
      expandRange(ACCEPTED_INVENTORY.invariants).sort(),
    );
    expect(inventory.implementationPrerequisites.distinct).toBe(22);
    expect(inventory.manifestGates.distinct).toBe(18);
    expect(inventory.residuals.distinct).toBe(17);
    expect(inventory.races.ids).toEqual(expandRange(ACCEPTED_INVENTORY.races));
    expect([...inventory.crashBoundaries.ids].sort()).toEqual(
      expandRange(ACCEPTED_INVENTORY.crashBoundaries),
    );
    expect(inventory.retirementRetry.ids).toEqual([
      'RR-1',
      'RR-2',
      'RR-3',
      'RR-4',
      'RR-5',
      'RR-6',
      'RR-7',
    ]);
    expect(inventory.transactionOwners.s16_2_3.ids).toEqual(
      expandRange(ACCEPTED_INVENTORY.transactionOwners),
    );
    expect(inventory.transactionOwners.s18_6.ids).toEqual(inventory.transactionOwners.s16_2_3.ids);
  });
});

describe('M7 inventory — a mismatch is a SPEC-DEFECT, never absorbed', () => {
  it('an extra table outside the fences is detected (scope count ≠ fragment count, 40 ≠ 39)', () => {
    // Replace one prose line of §19.3 (same line count, so fragment line numbers stay valid).
    const mutated = editLines(v11Text, (l) => {
      expect(l[2530]).toMatch(/^`M7LegalBasisCode` classifies/);
      l[2530] = 'CREATE TABLE m7.m7_shadow (';
    });
    const failed = reconcileInventory(deriveInventory(mutated, selection)).filter((c) => !c.pass);
    // §19.3 is not one of the six subtotal sections, so the section sum stays 39 and the defect surfaces
    // through the total, the TABLES == LOOP ROWS == PRIMARY KEYS equalities and the fence-scope agreement.
    expect(failed.map((c) => c.name)).toEqual([
      'tables',
      'triggers.loop.tablesEqualCreateTable',
      'primaryKeys.equalTables',
      'fragmentScopeAgreement.tables',
    ]);
    const error = new SpecDefectError(failed);
    expect(error.message).toMatch(/^BLOCKED — SPEC-DEFECT/);
    expect(error.message).toContain('V1.1 §19.14 / §19.14.1');
    expect(error.failures).toEqual(failed);
  });

  it('a renumbered race identifier is detected as missing + duplicate', () => {
    const mutated = replaceOnce(
      v11Text,
      '| **RC-29** | **two runs of one row-mechanism',
      '| **RC-28** | **two runs of one row-mechanism',
    );
    const races = deriveInventory(mutated, selection).races;
    expect(races.missing).toEqual(['RC-29']);
    expect(races.duplicates).toEqual(['RC-28']);
  });

  it('a changed accepted count is not silently accepted', () => {
    const checks = reconcileInventory({
      ...inventory,
      ddl: { ...inventory.ddl, checkConstraints: 157 },
    });
    expect(checks.filter((c) => !c.pass).map((c) => c.name)).toEqual(['checkConstraints']);
  });
});

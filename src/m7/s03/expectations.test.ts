import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { canonicalize } from '../../persistence/canonical';
import { M7_V1_1_ERRATUM_03 } from '../normative/source';
import {
  ACCEPTED_S03_INVENTORY,
  EXPECTATION_ARRAY_PARAMETERS,
  EXPECTED_PROCONFIG,
  ExpectationDerivationError,
  InventoryReproductionError,
  deriveCatalog,
  deriveExpectations,
  inventorySelfCheck,
  migrationRoleFromProvisionModule,
  ownerRolinheritFromTemplate,
  payloadOf,
  referencingClosure,
  renderArgType,
} from './expectations';
import { VBCP_IDENTITIES } from './fixture';
import { loadS03Sources } from './sources';

const ROOT = process.cwd();
const sources = loadS03Sources(ROOT);
const derivation = deriveExpectations(sources, VBCP_IDENTITIES.manifestVersion);
const { payload: E, catalog } = derivation;

describe('M7-S03 expectation payload E (VBA-01 §9)', () => {
  it('reproduces every accepted §19.14 / Erratum 03 inventory count before any connection (VBA-EX-2)', () => {
    expect(derivation.inventory.every((c) => c.pass)).toBe(true);
    expect(E.p_relation_names).toHaveLength(ACCEPTED_S03_INVENTORY.relations);
    expect(E.p_object_names).toHaveLength(183 + 346 + 28);
    expect(E.p_grant_signatures).toHaveLength(36);
    expect(E.p_role_names).toHaveLength(7);
    expect(E.p_member_roles).toEqual(['pagamenos_m7_owner']);
    expect(E.p_member_names).toEqual(['pagamenos_migrator']);
  });

  it('names exactly manifestVersion and the eighteen c_load_catalog_expectations_v1 arrays', () => {
    expect(Object.keys(E).sort()).toEqual(
      ['manifestVersion', ...EXPECTATION_ARRAY_PARAMETERS].sort(),
    );
    const load = catalog.functions.find((f) => f.name === 'c_load_catalog_expectations_v1')!;
    expect(load.argNames.slice(1)).toEqual([...EXPECTATION_ARRAY_PARAMETERS]);
    for (const p of [
      'p_relation_names',
      'p_object_names',
      'p_function_signatures',
      'p_grant_signatures',
      'p_role_names',
      'p_member_roles',
    ] as const) {
      expect(new Set((E as unknown as Record<string, unknown[]>)[p]).size).toBeGreaterThan(0);
    }
  });

  it('keeps the parallel arrays aligned', () => {
    expect(E.p_relation_kinds).toHaveLength(E.p_relation_names.length);
    for (const k of ['p_object_kinds', 'p_object_names', 'p_object_unique'] as const) {
      expect(E[k]).toHaveLength(E.p_object_relations.length);
    }
    for (const k of [
      'p_function_definer',
      'p_function_proconfig',
      'p_function_source_sha256',
    ] as const) {
      expect(E[k]).toHaveLength(E.p_function_signatures.length);
    }
    expect(E.p_function_proconfig.every((c) => c === EXPECTED_PROCONFIG)).toBe(true);
    expect(E.p_function_source_sha256.every((s) => /^sha256:[0-9a-f]{64}$/.test(s))).toBe(true);
    // m7_expected_relation_object_unique_ck: isUnique is non-null exactly for INDEX
    E.p_object_kinds.forEach((k, i) => expect(k === 'INDEX').toBe(E.p_object_unique[i] !== null));
  });

  it('renders signatures as regprocedure text under search_path = pg_catalog, pg_temp (§9.4)', () => {
    expect(E.p_function_signatures).toContain('m7.i_ts(timestamp with time zone)');
    expect(E.p_function_signatures).toContain('m7.t_guard_insert()');
    expect(E.p_function_signatures).toContain(
      'm7.c_register_storage_backend_v1(m7."M7StorageProviderClass",text,text,text,text,text,interval)',
    );
    const enums = new Set(['X']);
    const tables = new Set(['m7_t']);
    expect(renderArgType('m7."X"[]', enums, tables)).toBe('m7."X"[]');
    expect(renderArgType('m7.m7_t', enums, tables)).toBe('m7.m7_t');
    expect(() => renderArgType('int', enums, tables)).toThrow(ExpectationDerivationError);
    expect(() => renderArgType('m7."Y"', enums, tables)).toThrow(ExpectationDerivationError);
  });

  it('grants EXECUTE only on p_/s_/r_/w_/a_/x_ functions, to the F26 mapping, never on c_/i_/t_', () => {
    expect(E.p_grant_signatures.every((s) => /^m7\.[psrwax]_/.test(s))).toBe(true);
    expect(new Set(E.p_grant_roles).size).toBe(6);
  });

  it('takes the owner rolinherit and the migration role from the pinned S3 bytes', () => {
    expect(ownerRolinheritFromTemplate('CREATE ROLE o NOLOGIN NOINHERIT;', 'o')).toBe(false);
    expect(ownerRolinheritFromTemplate('CREATE ROLE o NOLOGIN;', 'o')).toBe(true);
    expect(() => ownerRolinheritFromTemplate('CREATE ROLE o INHERIT NOINHERIT;', 'o')).toThrow();
    expect(migrationRoleFromProvisionModule("export const HARNESS_MIGRATION_ROLE = 'm_x';\n")).toBe(
      'm_x',
    );
    expect(E.p_role_inherits[E.p_role_names.indexOf('pagamenos_m7_owner')]).toBe(false);
    expect(E.p_role_schema_usage.filter(Boolean)).toHaveLength(6);
  });

  it('is deterministic: a second derivation is canonically byte-identical', () => {
    const again = deriveExpectations(loadS03Sources(ROOT), VBCP_IDENTITIES.manifestVersion).payload;
    expect(canonicalize(again)).toBe(canonicalize(E));
  });

  it('refuses (before any connection) when the derivation would not reproduce the inventory', () => {
    const c = deriveCatalog(sources);
    const broken = payloadOf({ ...c, relations: c.relations.slice(1) }, 'x');
    expect(
      inventorySelfCheck(broken, { ...c, relations: c.relations.slice(1) }).some((r) => !r.pass),
    ).toBe(true);
    expect(
      new InventoryReproductionError([
        { name: 'relations', expected: 43, observed: 42, pass: false },
      ]).message,
    ).toMatch(/^STOP — S03 EXPECTATION DERIVATION DOES NOT REPRODUCE ACCEPTED INVENTORY/);
  });

  it('renders loop triggers exactly as the §19.10.1 format templates do', () => {
    const t = catalog.objects.find((o) => o.name === 'm7_storage_outbox_a_guard_insert')!;
    expect(t.statement).toBe(
      "CREATE TRIGGER m7_storage_outbox_a_guard_insert BEFORE INSERT ON m7.m7_storage_outbox FOR EACH ROW EXECUTE FUNCTION m7.t_guard_insert('M7_WORKER_UPLOAD_V1', 'M7_WORKER_DELETION_V1', 'M7_WORKER_RECONCILIATION_V1')",
    );
  });
});

describe('E03-08 T-05 Ref(T)', () => {
  it('equals the informative Ref(T) sizes of Erratum 03 §6.2 for all 39 tables', () => {
    const e03 = readFileSync(join(ROOT, M7_V1_1_ERRATUM_03.path), 'utf8');
    const rows = [...e03.matchAll(/^\| `(m7_[a-z_]+)` \| (?:yes|no) \| (\d+) \|/gm)].map(
      (m) => [m[1]!, Number(m[2])] as const,
    );
    expect(rows).toHaveLength(39);
    const ref = referencingClosure(catalog);
    for (const [t, n] of rows) expect([t, ref.get(t)?.length]).toEqual([t, n]);
  });
});

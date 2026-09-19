// M7 V1.1 — S01: deterministic generation of the normative extraction artifacts.
//
// A pure function from the six accepted documents' bytes (M7 V1.1, Erratum 01, Erratum 02, Erratum 03,
// Erratum 04, Erratum 05) to a map
// `relative path → file text`. The same bytes always yield the same map (fixed key order, source-order
// arrays, LF line endings, no timestamps, no environment input). The artifacts are extraction evidence
// for later slices: they are NOT a migration, NOT a control-plane manifest, and nothing here installs
// anything.
import {
  EXPECTED_FRAGMENT_COUNT,
  NORMATIVE_REGION_END,
  NORMATIVE_REGION_START,
  selectNormativeFragments,
} from './fragments';
import { SpecDefectError, deriveInventory, reconcileInventory } from './inventory';
import {
  checkMdMgPreconditions,
  runNegativeControls,
  toCheckedFragments,
} from './manifest-digest-preconditions';
import { verifyErratum01Overrides } from './erratum-01-overrides';
import {
  type E02Evidence,
  ERRATUM_02_AFFECTED_FRAGMENTS,
  applyErratum02Corrections,
  auditEffectiveFragments,
  crossCheckInformativePins,
  readErratum02Corrections,
} from './erratum-02-corrections';
import {
  ACCEPTED_ERRATUM_03_PROSE_OCCURRENCES,
  type E03Evidence,
  ERRATUM_03_AFFECTED_FRAGMENTS,
  applyErratum03Corrections,
  auditErratum03Fragments,
  crossCheckErratum03Pins,
  readErratum03Corrections,
} from './erratum-03-corrections';
import {
  ERRATUM_04_AFFECTED_FRAGMENTS,
  type E04Evidence,
  applyErratum04Corrections,
  auditErratum04Fragments,
  crossCheckErratum04Pins,
  readErratum04Corrections,
} from './erratum-04-corrections';
import {
  ACCEPTED_ERRATUM_05_PROSE_OCCURRENCES,
  ERRATUM_05_AFFECTED_FRAGMENTS,
  type E05Evidence,
  applyErratum05Corrections,
  auditErratum05Fragments,
  crossCheckErratum05Pins,
  readErratum05Corrections,
} from './erratum-05-corrections';
import {
  CONFORMANCE_TARGET,
  M7_V1_1,
  M7_V1_1_ERRATUM_01,
  M7_V1_1_ERRATUM_02,
  M7_V1_1_ERRATUM_03,
  M7_V1_1_ERRATUM_04,
  M7_V1_1_ERRATUM_05,
  sha256Hex,
  verifyBoundArtifact,
} from './source';

/** Repository-relative output directory of the S01 artifacts. */
export const NORMATIVE_OUTPUT_DIR = 'prisma/m7/normative';

export const ORDERING_RULE =
  'Fragments are emitted in ascending source position of their opening fence, which equals the ' +
  'order of the S01 anchor registry (F01…F26); each file name carries its two-digit ordinal and ' +
  'clause. File bodies are the exact fence body lines, with only the Erratum 02 E02-01…E02-09 ' +
  'substitutions applied at their named lines and then only the six Erratum 03 SQL block ' +
  'replacements applied at their quoted lines, and then only the six Erratum 04 E04-01…E04-06 ' +
  'statement replacements applied at their quoted lines, and then only the three Erratum 05 ' +
  'E05-01…E05-03 SQL block replacements applied at their quoted lines (the prose occurrence E05-04 ' +
  'is never applied), joined by LF with a final LF. JSON members ' +
  'are written in a fixed order, identifier lists in source order, and the file index in ' +
  'lexicographic path order.';

export class ExtractionRefusedError extends Error {
  constructor(message: string) {
    super(`M7-S01 EXTRACTION REFUSED: ${message}`);
    this.name = 'ExtractionRefusedError';
  }
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

const STATUS = [
  'S01 EXTRACTION ARTIFACT — GENERATED; DO NOT EDIT BY HAND',
  'NOT A MIGRATION; NOT INSTALLED INTO POSTGRESQL; NOT A CONTROL-PLANE MANIFEST',
  'SATISFIES NO IMP-* OR MA-* ITEM; M7 GATE 2 NOT SATISFIED',
];

export interface GeneratedArtifacts {
  readonly files: ReadonlyMap<string, string>;
}

export function generateNormativeArtifacts(
  v11Bytes: Uint8Array,
  e01Bytes: Uint8Array,
  e02Bytes: Uint8Array,
  e03Bytes: Uint8Array,
  e04Bytes: Uint8Array,
  e05Bytes: Uint8Array,
): GeneratedArtifacts {
  // 1. Identity first: nothing is read from bytes that are not the accepted bytes.
  const v11Text = verifyBoundArtifact(M7_V1_1, v11Bytes);
  const e01Text = verifyBoundArtifact(M7_V1_1_ERRATUM_01, e01Bytes);
  const e02Text = verifyBoundArtifact(M7_V1_1_ERRATUM_02, e02Bytes);
  const e03Text = verifyBoundArtifact(M7_V1_1_ERRATUM_03, e03Bytes);
  const e04Text = verifyBoundArtifact(M7_V1_1_ERRATUM_04, e04Bytes);
  const e05Text = verifyBoundArtifact(M7_V1_1_ERRATUM_05, e05Bytes);

  // 2. Anchored, fail-closed selection of the accepted V1.1 fence bodies.
  const v11Selection = selectNormativeFragments(v11Text);

  // 2a. Erratum 02 — the nine occurrence-scoped substitutions, read from the accepted erratum bytes,
  // applied at exactly their occurrences, then audited against the pinned effective identities.
  const e02 = readErratum02Corrections(v11Text, e02Text, v11Selection);
  const e02Selection = applyErratum02Corrections(v11Selection, e02.corrections);
  const postconditions = auditEffectiveFragments(e02Selection, e02.corrections);
  const informativePins = crossCheckInformativePins(e02Text, e02Selection);
  const e02Failures = [
    ...e02.checks.filter((c) => !c.pass).map(describe),
    ...e02.corrections.flatMap((c) =>
      c.evidence.filter((e) => !e.pass).map((e) => `${c.id} ${describe(e)}`),
    ),
    ...postconditions.filter((c) => !c.pass).map(describe),
    ...informativePins.filter((c) => !c.pass).map(describe),
  ];
  if (e02Failures.length > 0) {
    throw new ExtractionRefusedError(`Erratum 02 verification failed: ${e02Failures.join('; ')}`);
  }

  // 2b. Erratum 03 — the six occurrence-scoped SQL block replacements, read from the accepted erratum
  // bytes, applied over the Erratum 02-effective fragments at exactly their quoted lines, then audited
  // against the pinned Erratum 03 effective identities.
  const e03 = readErratum03Corrections(v11Text, e03Text, e02Selection, e02.corrections);
  const e03Selection = applyErratum03Corrections(e02Selection, e03.corrections);
  const e03Postconditions = auditErratum03Fragments(e03Selection, e03.corrections, e02.corrections);
  const e03InformativePins = crossCheckErratum03Pins(e03Text, e03Selection);
  const e03Failures = [
    ...e03.checks.filter((c) => !c.pass).map(describe),
    ...e03.corrections.flatMap((c) =>
      c.evidence.filter((e) => !e.pass).map((e) => `${c.id} ${describe(e)}`),
    ),
    ...e03Postconditions.filter((c) => !c.pass).map(describe),
    ...e03InformativePins.filter((c) => !c.pass).map(describe),
  ];
  if (e03Failures.length > 0) {
    throw new ExtractionRefusedError(`Erratum 03 verification failed: ${e03Failures.join('; ')}`);
  }

  // 2c. Erratum 04 — the six occurrence-scoped SQL statement replacements (invocation syntax only), read
  // from the accepted erratum bytes, applied over the Erratum 03-effective fragments at exactly their
  // quoted lines, then audited against the mechanical `unnest` census and the pinned F12 identity.
  const e04 = readErratum04Corrections(
    v11Text,
    e04Text,
    v11Selection,
    e03Selection,
    e02.corrections,
    e03.corrections,
  );
  const e04Selection = applyErratum04Corrections(e03Selection, e04.corrections);
  const e04Postconditions = auditErratum04Fragments(e04Selection, e04);
  const e04InformativePins = crossCheckErratum04Pins(e04Text, e04Selection);
  const e04Failures = [
    ...e04.checks.filter((c) => !c.pass).map(describe),
    ...e04.corrections.flatMap((c) =>
      c.evidence.filter((e) => !e.pass).map((e) => `${c.id} ${describe(e)}`),
    ),
    ...e04Postconditions.filter((c) => !c.pass).map(describe),
    ...e04InformativePins.filter((c) => !c.pass).map(describe),
  ];
  if (e04Failures.length > 0) {
    throw new ExtractionRefusedError(`Erratum 04 verification failed: ${e04Failures.join('; ')}`);
  }

  // 2d. Erratum 05 — the three occurrence-scoped SQL block replacements (E05-01 statement re-order in F18;
  // E05-02 / E05-03 required-column insertions in F22), read from the accepted erratum bytes, applied over
  // the Erratum 04-effective fragments at exactly their quoted lines, then audited against the pinned F18 /
  // F22 identities. The prose occurrence E05-04 is verified to lie outside every fragment and never applied.
  const e05 = readErratum05Corrections(
    v11Text,
    e05Text,
    e04Selection,
    e02.corrections,
    e03.corrections,
    e04.corrections,
  );
  const selection = applyErratum05Corrections(e04Selection, e05.corrections);
  const e05Postconditions = auditErratum05Fragments(selection, e05);
  const e05InformativePins = crossCheckErratum05Pins(e05Text, selection);
  const e05Failures = [
    ...e05.checks.filter((c) => !c.pass).map(describe),
    ...e05.corrections.flatMap((c) =>
      c.evidence.filter((e) => !e.pass).map((e) => `${c.id} ${describe(e)}`),
    ),
    ...e05.proseOccurrences.flatMap((p) =>
      p.evidence.filter((e) => !e.pass).map((e) => `${p.id} ${describe(e)}`),
    ),
    ...e05Postconditions.filter((c) => !c.pass).map(describe),
    ...e05InformativePins.filter((c) => !c.pass).map(describe),
  ];
  if (e05Failures.length > 0) {
    throw new ExtractionRefusedError(`Erratum 05 verification failed: ${e05Failures.join('; ')}`);
  }

  // 3. Mechanical inventory over the effective fragments; a mismatch is a SPEC-DEFECT, never repaired.
  const inventory = deriveInventory(v11Text, selection);
  const checks = reconcileInventory(inventory);
  const failed = checks.filter((c) => !c.pass);
  if (failed.length > 0) throw new SpecDefectError(failed);
  // Erratum 03 §10 item 6, Erratum 04 §11 item 6 and Erratum 05 §10 item 6: no object is added, removed
  // or renamed.
  const e03Inventory = deriveInventory(v11Text, e03Selection);
  const e04Inventory = deriveInventory(v11Text, e04Selection);
  const inventoryUnchanged = ev03(
    'mechanical inventory over the Erratum 03-effective fragments == over the Erratum 02-effective fragments',
    e03Inventory,
    deriveInventory(v11Text, e02Selection),
  );
  if (!inventoryUnchanged.pass) {
    throw new ExtractionRefusedError(`Erratum 03 verification failed: ${inventoryUnchanged.check}`);
  }
  const e04InventoryUnchanged = ev03(
    'mechanical inventory over the Erratum 04-effective fragments == over the Erratum 03-effective fragments',
    e04Inventory,
    e03Inventory,
  );
  if (!e04InventoryUnchanged.pass) {
    throw new ExtractionRefusedError(
      `Erratum 04 verification failed: ${e04InventoryUnchanged.check}`,
    );
  }
  const e05InventoryUnchanged = ev03(
    'mechanical inventory over the Erratum 05-effective fragments == over the Erratum 04-effective fragments',
    inventory,
    e04Inventory,
  );
  if (!e05InventoryUnchanged.pass) {
    throw new ExtractionRefusedError(
      `Erratum 05 verification failed: ${e05InventoryUnchanged.check}`,
    );
  }

  // 4. ER-01 extraction preconditions and their negative controls.
  const checked = toCheckedFragments(selection.fragments);
  const preconditions = checkMdMgPreconditions(checked);
  const negativeControls = runNegativeControls(checked);
  if (preconditions.violations.length > 0) {
    throw new ExtractionRefusedError(
      `MD/MG preconditions violated: ${preconditions.violations.join('; ')}`,
    );
  }
  const unrefused = negativeControls.filter((c) => !c.failed);
  if (unrefused.length > 0) {
    throw new ExtractionRefusedError(
      `negative controls not refused: ${unrefused.map((c) => c.id).join(', ')}`,
    );
  }

  // 5. Erratum 01 override table.
  const overrides = verifyErratum01Overrides({
    v11Text,
    e01Text,
    fragments: selection.fragments,
    inventory,
    preconditions,
    negativeControls,
  });
  const failedOverrides = overrides.filter((o) => !o.pass);
  if (failedOverrides.length > 0) {
    throw new ExtractionRefusedError(
      `Erratum 01 override verification failed: ${failedOverrides
        .map(
          (o) =>
            `${o.id} [${o.evidence
              .filter((e) => !e.pass)
              .map((e) => e.check)
              .join(' | ')}]`,
        )
        .join('; ')}`,
    );
  }

  const files = new Map<string, string>();
  for (const f of selection.fragments) files.set(`sql/${f.anchor.file}`, f.sql);

  files.set(
    'INVENTORY.json',
    json({
      schema: 'pagamenos.m7.s01.inventory.v1',
      status: STATUS,
      derivation:
        'V1.1 §19.14.1 rules over the accepted bytes; identifier registers from their defining tables',
      inventory,
      checks,
      allChecksPass: true,
    }),
  );
  files.set(
    'MD_MG_PRECONDITIONS.json',
    json({
      schema: 'pagamenos.m7.s01.md-mg-preconditions.v1',
      status: STATUS,
      scope:
        'Erratum 01 ER-01 extraction preconditions only. No manifest digest D and no migrationSha256 is computed.',
      result: preconditions,
      negativeControls,
      allPreconditionsHold: true,
      allNegativeControlsRefused: true,
    }),
  );
  files.set(
    'ERRATUM_01_OVERRIDES.json',
    json({
      schema: 'pagamenos.m7.s01.erratum-01-overrides.v1',
      status: STATUS,
      conformanceTarget: CONFORMANCE_TARGET,
      readingRule:
        'An Erratum 01 "After" text controls only the clause it names (Erratum 01 §4; Register §12). Every other clause is read from the accepted V1.1 bytes.',
      records: overrides,
      allPass: true,
    }),
  );
  files.set(
    'ERRATUM_02_CORRECTIONS.json',
    json({
      schema: 'pagamenos.m7.s01.erratum-02-corrections.v1',
      status: STATUS,
      conformanceTarget: CONFORMANCE_TARGET,
      source: M7_V1_1_ERRATUM_02,
      readingRule:
        'An Erratum 02 "After" text replaces exactly the "Before" substring on exactly the named V1.1 line, for that occurrence only (Erratum 02 §4; Register §14). Every other byte is read from the accepted V1.1 bytes read with Erratum 01.',
      correctionCount: e02.corrections.length,
      affectedFragments: [...ERRATUM_02_AFFECTED_FRAGMENTS],
      unaffectedFragments: selection.fragments
        .filter((f) => f.erratum02Corrections.length === 0)
        .map((f) => f.anchor.id),
      documentChecks: e02.checks,
      records: e02.corrections,
      postconditions,
      informativePinCrossCheck: informativePins,
      allPass: true,
    }),
  );
  files.set(
    'ERRATUM_03_CORRECTIONS.json',
    json({
      schema: 'pagamenos.m7.s01.erratum-03-corrections.v1',
      status: STATUS,
      conformanceTarget: CONFORMANCE_TARGET,
      source: M7_V1_1_ERRATUM_03,
      readingRule:
        'An Erratum 03 "After" block replaces exactly its quoted "Before" block of V1.1 lines, at exactly the named lines; extra After lines are inserted immediately after the last quoted line; no line is removed or reordered (Erratum 03 §3 item 2; Register §15.2). Only the six SQL occurrences inside §19 fence bodies affect the extraction (Erratum 03 §10 item 1); every other byte is read from the accepted V1.1 bytes read with Erratum 01 and Erratum 02.',
      sqlCorrectionCount: e03.corrections.length,
      proseOccurrencesOutsideFragments: [...ACCEPTED_ERRATUM_03_PROSE_OCCURRENCES],
      affectedFragments: [...ERRATUM_03_AFFECTED_FRAGMENTS],
      unaffectedFragments: selection.fragments
        .filter((f) => f.erratum03Corrections.length === 0)
        .map((f) => f.anchor.id),
      documentChecks: e03.checks,
      records: e03.corrections,
      postconditions: [...e03Postconditions, inventoryUnchanged],
      informativePinCrossCheck: e03InformativePins,
      allPass: true,
    }),
  );
  files.set(
    'ERRATUM_04_CORRECTIONS.json',
    json({
      schema: 'pagamenos.m7.s01.erratum-04-corrections.v1',
      status: STATUS,
      conformanceTarget: CONFORMANCE_TARGET,
      source: M7_V1_1_ERRATUM_04,
      readingRule:
        'An Erratum 04 "After" statement replaces exactly its quoted "Before" statement of V1.1 lines, at exactly the named lines; only the named changed lines differ; no line is added, removed or reordered (Erratum 04 §4 item 2; Register §18.2). Each correction rewrites only the invocation syntax of one FROM item: pg_catalog.unnest(a1, …, ak) becomes ROWS FROM (pg_catalog.unnest(a1), …, pg_catalog.unnest(ak)). Every other byte is read from the accepted V1.1 bytes read with Erratum 01, Erratum 02 and Erratum 03.',
      correctionCount: e04.corrections.length,
      affectedFragments: [...ERRATUM_04_AFFECTED_FRAGMENTS],
      unaffectedFragments: selection.fragments
        .filter((f) => f.erratum04Corrections.length === 0)
        .map((f) => f.anchor.id),
      documentChecks: e04.checks,
      census: e04.census,
      preservedSingleArrayCalls: e04.preservedCalls,
      records: e04.corrections,
      postconditions: [...e04Postconditions, e04InventoryUnchanged],
      informativePinCrossCheck: e04InformativePins,
      resultingFragments: selection.fragments
        .filter((f) => f.erratum04Corrections.length > 0)
        .map((f) => ({
          id: f.anchor.id,
          file: `sql/${f.anchor.file}`,
          before: {
            sha256: f.erratum03Sha256,
            bytes: new TextEncoder().encode(f.erratum03Sql).byteLength,
            lines: f.erratum03Sql.slice(0, -1).split('\n').length,
          },
          after: {
            sha256: f.erratum04Sha256,
            bytes: new TextEncoder().encode(f.erratum04Sql).byteLength,
            lines: f.erratum04Sql.slice(0, -1).split('\n').length,
          },
          erratum04Corrections: f.erratum04Corrections,
        })),
      allPass: true,
    }),
  );
  files.set(
    'ERRATUM_05_CORRECTIONS.json',
    json({
      schema: 'pagamenos.m7.s01.erratum-05-corrections.v1',
      status: STATUS,
      conformanceTarget: CONFORMANCE_TARGET,
      source: M7_V1_1_ERRATUM_05,
      readingRule:
        'An Erratum 05 "After" block replaces exactly its quoted "Before" block of V1.1 lines, at exactly the named lines; every After block has the same number of lines as its Before block; no line is added or removed (Erratum 05 §3 item 2; Register §19.2). E05-01 re-orders the quoted lines of m7.w_claim_upload_intent_v1 (a permutation of the same 20 lines); E05-02 and E05-03 insert, on the same lines, the two required completion columns and the F21 derivation expressions. Only these three SQL occurrences inside §19 fence bodies affect the extraction; E05-04 (§25.2 row T-03) is prose only and changes no fragment (Erratum 05 §10 item 1). Every other byte is read from the accepted V1.1 bytes read with Errata 01–04.',
      occurrenceCount: e05.corrections.length + e05.proseOccurrences.length,
      sqlCorrectionCount: e05.corrections.length,
      proseOccurrencesOutsideFragments: [...ACCEPTED_ERRATUM_05_PROSE_OCCURRENCES],
      affectedFragments: [...ERRATUM_05_AFFECTED_FRAGMENTS],
      unaffectedFragments: selection.fragments
        .filter((f) => f.erratum05Corrections.length === 0)
        .map((f) => f.anchor.id),
      documentChecks: e05.checks,
      records: e05.corrections,
      proseRecords: e05.proseOccurrences,
      postconditions: [...e05Postconditions, e05InventoryUnchanged],
      informativePinCrossCheck: e05InformativePins,
      resultingFragments: selection.fragments
        .filter((f) => f.erratum05Corrections.length > 0)
        .map((f) => ({
          id: f.anchor.id,
          file: `sql/${f.anchor.file}`,
          before: {
            sha256: f.erratum04Sha256,
            bytes: new TextEncoder().encode(f.erratum04Sql).byteLength,
            lines: f.erratum04Sql.slice(0, -1).split('\n').length,
          },
          after: {
            sha256: f.sha256,
            bytes: new TextEncoder().encode(f.sql).byteLength,
            lines: f.sql.slice(0, -1).split('\n').length,
          },
          erratum05Corrections: f.erratum05Corrections,
        })),
      allPass: true,
    }),
  );
  files.set('README.md', readme());

  const index = {
    schema: 'pagamenos.m7.s01.normative-ddl-extraction.v5',
    status: STATUS,
    generator: 'scripts/m7/extract-normative-ddl.ts',
    conformanceTarget: CONFORMANCE_TARGET,
    sources: {
      specification: M7_V1_1,
      erratum01: M7_V1_1_ERRATUM_01,
      erratum02: M7_V1_1_ERRATUM_02,
      erratum03: M7_V1_1_ERRATUM_03,
      erratum04: M7_V1_1_ERRATUM_04,
      erratum05: M7_V1_1_ERRATUM_05,
    },
    fragmentBytesRule:
      'Each sql/ file is the accepted V1.1 fence body (v11Body*) with exactly the Erratum 02 §6 substitutions listed in erratum02Corrections applied at their named lines (erratum02Sha256), and then exactly the Erratum 03 SQL block replacements listed in erratum03Corrections applied at their quoted lines (erratum03Sha256), and then exactly the Erratum 04 statement replacements listed in erratum04Corrections applied at their quoted lines (erratum04Sha256), and then exactly the Erratum 05 SQL block replacements listed in erratum05Corrections applied at their quoted lines. Line spans and bodyLines are those of V1.1; lines, bytes and sha256 are the effective (written) file bytes.',
    normativeRegion: {
      startHeading: NORMATIVE_REGION_START,
      startLine: selection.regionStartLine,
      endHeadingExclusive: NORMATIVE_REGION_END,
      endLine: selection.regionEndLine,
      fragmentCount: EXPECTED_FRAGMENT_COUNT,
      fencesInDocument: selection.fencesInDocument,
      sqlFencesOutsideRegion: selection.sqlFencesOutsideRegion,
    },
    orderingRule: ORDERING_RULE,
    fragments: selection.fragments.map((f) => ({
      id: f.anchor.id,
      clause: f.anchor.clause,
      heading: f.anchor.heading,
      headingLine: f.headingLine,
      fenceOpenLine: f.fenceOpenLine,
      fenceCloseLine: f.fenceCloseLine,
      bodyFirstLine: f.bodyFirstLine,
      bodyLastLine: f.bodyLastLine,
      bodyLines: f.bodyLastLine - f.bodyFirstLine + 1,
      v11BodyBytes: new TextEncoder().encode(f.v11Sql).byteLength,
      v11BodySha256: f.v11Sha256,
      erratum02Corrections: f.erratum02Corrections,
      erratum02Sha256: f.erratum02Sha256,
      erratum03Corrections: f.erratum03Corrections,
      erratum03Sha256: f.erratum03Sha256,
      erratum04Corrections: f.erratum04Corrections,
      erratum04Sha256: f.erratum04Sha256,
      erratum05Corrections: f.erratum05Corrections,
      lines: f.sql.slice(0, -1).split('\n').length,
      bytes: new TextEncoder().encode(f.sql).byteLength,
      sha256: f.sha256,
      file: `sql/${f.anchor.file}`,
    })),
    files: [...files.keys()].sort().map((path) => ({ path, sha256: sha256Hex(files.get(path)!) })),
  };
  files.set('EXTRACTION_INDEX.json', json(index));

  return { files: new Map([...files.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) };
}

function ev03(check: string, observed: unknown, expected: unknown): E03Evidence {
  return { check, observed, expected, pass: JSON.stringify(observed) === JSON.stringify(expected) };
}

function describe(e: E02Evidence | E03Evidence | E04Evidence | E05Evidence): string {
  return `${e.check}: observed ${JSON.stringify(e.observed)} ≠ expected ${JSON.stringify(e.expected)}`;
}

function readme(): string {
  return [
    '# M7 V1.1 — S01 normative DDL extraction (generated)',
    '',
    '```',
    ...STATUS,
    '```',
    '',
    'This directory is generated by `pnpm m7:ddl:extract` from the exact accepted bytes of',
    `\`${M7_V1_1.path}\` (blob \`${M7_V1_1.gitBlob}\`) read together with`,
    `\`${M7_V1_1_ERRATUM_01.path}\` (blob \`${M7_V1_1_ERRATUM_01.gitBlob}\`),`,
    `\`${M7_V1_1_ERRATUM_02.path}\` (blob \`${M7_V1_1_ERRATUM_02.gitBlob}\`),`,
    `\`${M7_V1_1_ERRATUM_03.path}\` (blob \`${M7_V1_1_ERRATUM_03.gitBlob}\`),`,
    `\`${M7_V1_1_ERRATUM_04.path}\` (blob \`${M7_V1_1_ERRATUM_04.gitBlob}\`) and`,
    `\`${M7_V1_1_ERRATUM_05.path}\` (blob \`${M7_V1_1_ERRATUM_05.gitBlob}\`):`,
    'six accepted authority documents.',
    `Conformance target: **${CONFORMANCE_TARGET}**.`,
    '`pnpm m7:ddl:check` fails on any drift, missing file or extra file, and names any stale',
    'pre-Erratum-02 expression, pre-Erratum-03 block, pre-Erratum-04 statement or pre-Erratum-05 block it',
    'finds.',
    '',
    '- `sql/` — the 26 normative SQL fence bodies of V1.1 §19.2–§19.13, one file per anchor: byte-for-byte',
    '  the V1.1 body, except the nine Erratum 02 occurrences E02-01…E02-09 (F09, F11, F17, F23, F26),',
    '  the six Erratum 03 SQL occurrences E03-01, E03-02, E03-03a, E03-04a, E03-05a, E03-06a (F01, F11, F24),',
    '  the six Erratum 04 occurrence-scoped SQL invocation-syntax corrections E04-01…E04-06, all in F12,',
    '  and the three Erratum 05 SQL occurrences E05-01 (F18) and E05-02, E05-03 (F22).',
    '- `EXTRACTION_INDEX.json` — source identities, anchors, source line spans, V1.1 and effective SHA-256.',
    '- `INVENTORY.json` — the mechanical inventory reconciliation (V1.1 §19.14.1).',
    '- `ERRATUM_01_OVERRIDES.json` — the clauses read differently under accepted Erratum 01 (ER-01…ER-05).',
    '- `ERRATUM_02_CORRECTIONS.json` — the nine occurrence-scoped Erratum 02 substitutions and their audit.',
    '- `ERRATUM_03_CORRECTIONS.json` — the six occurrence-scoped Erratum 03 SQL block replacements and their audit.',
    '- `ERRATUM_04_CORRECTIONS.json` — the six occurrence-scoped Erratum 04 SQL invocation-syntax corrections',
    '  (all in F12), the `unnest` census and their audit.',
    '- `ERRATUM_05_CORRECTIONS.json` — the three occurrence-scoped Erratum 05 SQL block replacements (F18, F22),',
    '  the prose-only occurrence E05-04 (never applied) and their audit.',
    '- `MD_MG_PRECONDITIONS.json` — ER-01 extraction preconditions and negative controls.',
    '',
    'The fragments are not concatenated into, and must not be mistaken for, the M7 migration: the',
    'migration and the control-plane manifest are produced later under Erratum 01 MD-6 / MG-6.',
    '',
  ].join('\n');
}

export interface ArtifactDrift {
  readonly missing: readonly string[];
  readonly unexpected: readonly string[];
  readonly changed: readonly string[];
}

/** Compares the expected artifacts with the files actually present (`path → text`). */
export function diffArtifacts(
  expected: ReadonlyMap<string, string>,
  actual: ReadonlyMap<string, string>,
): ArtifactDrift {
  return {
    missing: [...expected.keys()].filter((p) => !actual.has(p)).sort(),
    unexpected: [...actual.keys()].filter((p) => !expected.has(p)).sort(),
    changed: [...expected.keys()]
      .filter((p) => actual.has(p) && actual.get(p) !== expected.get(p))
      .sort(),
  };
}

export function isClean(drift: ArtifactDrift): boolean {
  return drift.missing.length === 0 && drift.unexpected.length === 0 && drift.changed.length === 0;
}

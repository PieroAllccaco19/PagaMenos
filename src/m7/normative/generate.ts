// M7 V1.1 — S01: deterministic generation of the normative extraction artifacts.
//
// A pure function from the two accepted documents' bytes to a map `relative path → file text`. The
// same bytes always yield the same map (fixed key order, source-order arrays, LF line endings, no
// timestamps, no environment input). The artifacts are extraction evidence for later slices: they are
// NOT a migration, NOT a control-plane manifest, and nothing here installs anything.
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
import { M7_V1_1, M7_V1_1_ERRATUM_01, sha256Hex, verifyBoundArtifact } from './source';

/** Repository-relative output directory of the S01 artifacts. */
export const NORMATIVE_OUTPUT_DIR = 'prisma/m7/normative';

export const ORDERING_RULE =
  'Fragments are emitted in ascending source position of their opening fence, which equals the ' +
  'order of the S01 anchor registry (F01…F26); each file name carries its two-digit ordinal and ' +
  'clause. File bodies are the exact fence body lines joined by LF with a final LF. JSON members ' +
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
): GeneratedArtifacts {
  // 1. Identity first: nothing is read from bytes that are not the accepted bytes.
  const v11Text = verifyBoundArtifact(M7_V1_1, v11Bytes);
  const e01Text = verifyBoundArtifact(M7_V1_1_ERRATUM_01, e01Bytes);

  // 2. Anchored, fail-closed fragment selection.
  const selection = selectNormativeFragments(v11Text);

  // 3. Mechanical inventory; a mismatch is a SPEC-DEFECT, never repaired.
  const inventory = deriveInventory(v11Text, selection);
  const checks = reconcileInventory(inventory);
  const failed = checks.filter((c) => !c.pass);
  if (failed.length > 0) throw new SpecDefectError(failed);

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
      conformanceTarget: 'M7 V1.1 + accepted Erratum 01',
      readingRule:
        'An Erratum 01 "After" text controls only the clause it names (Erratum 01 §4; Register §12). Every other clause is read from the accepted V1.1 bytes.',
      records: overrides,
      allPass: true,
    }),
  );
  files.set('README.md', readme());

  const index = {
    schema: 'pagamenos.m7.s01.normative-ddl-extraction.v1',
    status: STATUS,
    generator: 'scripts/m7/extract-normative-ddl.ts',
    conformanceTarget: 'M7 V1.1 + accepted Erratum 01',
    sources: { specification: M7_V1_1, erratum01: M7_V1_1_ERRATUM_01 },
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
      bodyBytes: new TextEncoder().encode(f.sql).byteLength,
      sha256: f.sha256,
      file: `sql/${f.anchor.file}`,
    })),
    files: [...files.keys()].sort().map((path) => ({ path, sha256: sha256Hex(files.get(path)!) })),
  };
  files.set('EXTRACTION_INDEX.json', json(index));

  return { files: new Map([...files.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) };
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
    `\`${M7_V1_1_ERRATUM_01.path}\` (blob \`${M7_V1_1_ERRATUM_01.gitBlob}\`).`,
    '`pnpm m7:ddl:check` fails on any drift, missing file or extra file.',
    '',
    '- `sql/` — the 26 normative SQL fence bodies of V1.1 §19.2–§19.13, byte-for-byte, one file per anchor.',
    '- `EXTRACTION_INDEX.json` — source identities, anchors, source line spans, per-file SHA-256.',
    '- `INVENTORY.json` — the mechanical inventory reconciliation (V1.1 §19.14.1).',
    '- `ERRATUM_01_OVERRIDES.json` — the clauses read differently under accepted Erratum 01 (ER-01…ER-05).',
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

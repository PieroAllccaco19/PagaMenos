// M7 V1.1 — S03 verification bootstrap: the pre-execution input set S1 … S3 (VBA-01 §6 VBA-AX-1).
//
// Verification tooling only. Reads the accepted bytes from the repository tree, verifies every identity
// BEFORE anything is read from it, and proves S2 is the deterministic function of S1 by regenerating the
// S01 extraction in memory and requiring byte equality with the integrated fragments. It opens no
// database connection and consults no Git history, branch, selector or runtime observation.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { generateNormativeArtifacts } from '../normative/generate';
import {
  M7_V1_1,
  M7_V1_1_ERRATUM_01,
  M7_V1_1_ERRATUM_02,
  M7_V1_1_ERRATUM_03,
  M7_V1_1_ERRATUM_04,
  M7_V1_1_ERRATUM_05,
  type BoundArtifact,
  gitBlobId,
  sha256Hex,
  verifyBoundArtifact,
} from '../normative/source';

export class S03SourceError extends Error {
  constructor(message: string) {
    super(`M7-S03 SOURCE: ${message}`);
    this.name = 'S03SourceError';
  }
}

/** Identity of one input file as recorded in F.sources and the evidence. */
export interface SourceIdentity {
  readonly path: string;
  readonly gitBlob: string;
  readonly sha256: string;
  readonly bytes: number;
}

/** S1: the accepted V1.1 and Errata 01–05 (the E05-conforming S03 reading). */
export const S1_ARTIFACTS: readonly BoundArtifact[] = [
  M7_V1_1,
  M7_V1_1_ERRATUM_01,
  M7_V1_1_ERRATUM_02,
  M7_V1_1_ERRATUM_03,
  M7_V1_1_ERRATUM_04,
  M7_V1_1_ERRATUM_05,
];

/**
 * Governing contracts: they constrain how S03 runs but contribute no expected value (VBA-AX-1 admits
 * S1 … S4 only). Pinned by Git blob and required unchanged.
 */
export const GOVERNING_CONTRACTS: readonly {
  readonly id: string;
  readonly path: string;
  readonly gitBlob: string;
}[] = [
  {
    id: 'VBA-01',
    path: 'PAGAMENOS_M7_S03_VERIFICATION_BOOTSTRAP_AMENDMENT_01.md',
    gitBlob: 'd10d59cac8f0d77304b88c6df0e06b89d710141d',
  },
  {
    id: 'VFC-01',
    path: 'PAGAMENOS_M7_VBA_S02_1_POSTGRESQL_VERSION_FLOOR_CLARIFICATION_01.md',
    gitBlob: '7613c8a669bcaee9418a0e5f207192fdb5c45b75',
  },
  {
    id: 'CCA',
    path: 'PAGAMENOS_A1_A2_M7_CONSENT_COMPATIBILITY_AMENDMENT_01.md',
    gitBlob: '2f0ff3c886c5ac9b1cbba797404e9024c0b83732',
  },
  {
    id: 'ROOT-REGISTER',
    path: 'PAGAMENOS_SPEC_AUTHORITY.md',
    gitBlob: '4ea438c1ae821d9b1feacfdef62ad1fe5beed314',
  },
];

export const NORMATIVE_DIR = 'prisma/m7/normative';
export const EXTRACTION_INDEX_PATH = `${NORMATIVE_DIR}/EXTRACTION_INDEX.json`;

/** The integrated, independently accepted E05-regenerated S01 extraction index (staging 4f3ebc1). */
export const EXTRACTION_INDEX_PIN = {
  gitBlob: '8c806851efd2d5cfdfd77fd9aece78ddcfd7a6d5',
  sha256: '2d407373d6e1d14f05dcfd15e41a030da67b80b22eb4b84e6f5d9ce86331e3e7',
} as const;

/** The accepted E04 F12 identity (unchanged by E05, E05 §10 item 4). */
export const F12_PIN = {
  path: `${NORMATIVE_DIR}/sql/12_19.11.2_control-plane-registration.sql`,
  gitBlob: '9ad88ebfe657cbb3d57493379db053aaf308fda0',
  sha256: 'c154aee0e1d441d405f5a0e7c25d883aa643b40fc0458a99061d9f9145c147da',
  bytes: 34_819,
  lines: 498,
} as const;

/** The accepted E05-regenerated F18 / F22 identities (authorization §4; E05 §10 item 3). */
export const E05_FRAGMENT_PINS = {
  F18: {
    path: `${NORMATIVE_DIR}/sql/18_19.12.1_upload-pipeline.sql`,
    sha256: '1d30664bb00da96e24fbc9e75299e89a95a70778bedc82dc86d903aca683373d',
    bytes: 23_867,
    lines: 370,
    corrections: ['E05-01'],
  },
  F22: {
    path: `${NORMATIVE_DIR}/sql/22_19.12.5_row-mechanisms.sql`,
    sha256: 'afe1c1302e973d360a3e7a7a0fe8477647ee52feb2a1d0fbd963850afb3b99e8',
    bytes: 27_202,
    lines: 362,
    corrections: ['E05-02', 'E05-03'],
  },
} as const;

/** S3: the integrated S02 + VBA-S02-1 provisioning inputs. */
export const S3_PINS = {
  rolesTemplate: {
    path: 'scripts/m7/provision/roles.template.sql',
    gitBlob: '20f96245b975dea8a2bcae8159dd6445990845f5',
  },
  provisionModule: {
    path: 'src/m7/testkit/provision.ts',
    gitBlob: 'dd2deaeafb954c4ca7e01d2af603385139876626',
  },
} as const;

/** The accepted canonical serializer VBA-FX-5 names (recorded, not an expectation source). */
export const CANONICAL_SERIALIZER_PIN = {
  path: 'src/persistence/canonical.ts',
  gitBlob: '7f9424ed93543026c20b7700ebc0af26012d065a',
} as const;

export interface FragmentSource {
  /** `F01` … `F26`. */
  readonly id: string;
  readonly clause: string;
  readonly path: string;
  readonly identity: SourceIdentity;
  readonly lines: number;
  readonly sql: string;
  /** Erratum 04 corrections the index lists for this fragment. */
  readonly erratum04Corrections: readonly string[];
  /** Erratum 05 corrections the index lists for this fragment. */
  readonly erratum05Corrections: readonly string[];
  /** The index's post-Erratum-03 sha256. */
  readonly erratum03Sha256: string;
  /** The index's post-Erratum-04 sha256 (equal to `sha256` for every fragment E05 does not touch). */
  readonly erratum04Sha256: string;
}

export interface S03Sources {
  readonly s1: readonly (SourceIdentity & { readonly lines: number; readonly text: string })[];
  readonly governing: readonly (SourceIdentity & { readonly id: string })[];
  readonly extractionIndex: SourceIdentity;
  readonly fragments: readonly FragmentSource[];
  readonly rolesTemplate: SourceIdentity & { readonly text: string };
  readonly provisionModule: SourceIdentity & { readonly text: string };
  readonly canonicalSerializer: SourceIdentity;
  /** Result of regenerating S2 from S1 in memory: every file equal to the integrated bytes. */
  readonly regeneration: { readonly files: number; readonly equal: true };
}

function identityOf(path: string, bytes: Uint8Array): SourceIdentity {
  return { path, gitBlob: gitBlobId(bytes), sha256: sha256Hex(bytes), bytes: bytes.byteLength };
}

function readPinned(
  root: string,
  path: string,
  gitBlob: string,
): { id: SourceIdentity; bytes: Buffer } {
  const bytes = readFileSync(join(root, path));
  const id = identityOf(path, bytes);
  if (id.gitBlob !== gitBlob) {
    throw new S03SourceError(`${path}: git blob ${id.gitBlob} ≠ pinned ${gitBlob}`);
  }
  return { id, bytes };
}

function lfLines(text: string): number {
  let n = 0;
  for (let i = 0; i < text.length; i += 1) if (text.charCodeAt(i) === 10) n += 1;
  return n;
}

interface IndexFragment {
  id: string;
  clause: string;
  file: string;
  sha256: string;
  bytes: number;
  lines: number;
  erratum03Sha256: string;
  erratum04Sha256: string;
  erratum04Corrections: string[];
  erratum05Corrections: string[];
}

/**
 * Loads and verifies S1 … S3 from `root`. Throws on any identity drift, on any fragment not equal to
 * its index pin, and unless an in-memory S01 regeneration from S1 reproduces every integrated file.
 */
export function loadS03Sources(root: string = process.cwd()): S03Sources {
  const s1 = S1_ARTIFACTS.map((a) => {
    const bytes = readFileSync(join(root, a.path));
    const text = verifyBoundArtifact(a, bytes);
    return { ...identityOf(a.path, bytes), lines: a.lines, text };
  });

  const governing = GOVERNING_CONTRACTS.map((g) => ({
    id: g.id,
    ...readPinned(root, g.path, g.gitBlob).id,
  }));

  const index = readPinned(root, EXTRACTION_INDEX_PATH, EXTRACTION_INDEX_PIN.gitBlob);
  if (index.id.sha256 !== EXTRACTION_INDEX_PIN.sha256) {
    throw new S03SourceError(`${EXTRACTION_INDEX_PATH}: sha256 drift`);
  }
  const parsed = JSON.parse(index.bytes.toString('utf8')) as { fragments: IndexFragment[] };
  if (parsed.fragments.length !== 26) {
    throw new S03SourceError(`extraction index lists ${parsed.fragments.length} fragments, not 26`);
  }
  const fragments: FragmentSource[] = parsed.fragments.map((f, i) => {
    const expectedId = `F${String(i + 1).padStart(2, '0')}`;
    if (f.id !== expectedId)
      throw new S03SourceError(`index row ${i} is ${f.id}, not ${expectedId}`);
    const path = `${NORMATIVE_DIR}/${f.file}`;
    const bytes = readFileSync(join(root, path));
    const id = identityOf(path, bytes);
    const sql = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (id.sha256 !== f.sha256 || id.bytes !== f.bytes || lfLines(sql) !== f.lines) {
      throw new S03SourceError(`${f.id} ${path}: bytes differ from the extraction index pin`);
    }
    if (sql.includes('\r')) throw new S03SourceError(`${f.id}: CR byte present`);
    return {
      id: f.id,
      clause: f.clause,
      path,
      identity: id,
      lines: f.lines,
      sql,
      erratum04Corrections: f.erratum04Corrections,
      erratum05Corrections: f.erratum05Corrections,
      erratum03Sha256: f.erratum03Sha256,
      erratum04Sha256: f.erratum04Sha256,
    };
  });

  const f12 = fragments[11]!;
  if (
    f12.path !== F12_PIN.path ||
    f12.identity.gitBlob !== F12_PIN.gitBlob ||
    f12.identity.sha256 !== F12_PIN.sha256 ||
    f12.identity.bytes !== F12_PIN.bytes ||
    f12.lines !== F12_PIN.lines
  ) {
    throw new S03SourceError('F12 is not the accepted E04 identity');
  }
  for (const [id, pin] of Object.entries(E05_FRAGMENT_PINS)) {
    const f = fragments.find((x) => x.id === id)!;
    if (
      f.path !== pin.path ||
      f.identity.sha256 !== pin.sha256 ||
      f.identity.bytes !== pin.bytes ||
      f.lines !== pin.lines ||
      JSON.stringify(f.erratum05Corrections) !== JSON.stringify(pin.corrections)
    ) {
      throw new S03SourceError(`${id} is not the accepted E05-regenerated identity`);
    }
  }
  for (const f of fragments) {
    if (f.id in E05_FRAGMENT_PINS) continue;
    if (f.erratum05Corrections.length !== 0 || f.identity.sha256 !== f.erratum04Sha256) {
      throw new S03SourceError(`${f.id} changed under Erratum 05 (only F18 and F22 may)`);
    }
  }

  // S2 = f(S1): regenerate the S01 artifacts from the accepted bytes and require byte equality.
  const generated = generateNormativeArtifacts(
    readFileSync(join(root, M7_V1_1.path)),
    readFileSync(join(root, M7_V1_1_ERRATUM_01.path)),
    readFileSync(join(root, M7_V1_1_ERRATUM_02.path)),
    readFileSync(join(root, M7_V1_1_ERRATUM_03.path)),
    readFileSync(join(root, M7_V1_1_ERRATUM_04.path)),
    readFileSync(join(root, M7_V1_1_ERRATUM_05.path)),
  );
  const regenerated = [
    ...fragments.map((f) => ({ rel: f.path.slice(NORMATIVE_DIR.length + 1), actual: f.sql })),
    { rel: 'EXTRACTION_INDEX.json', actual: index.bytes.toString('utf8') },
  ];
  for (const { rel, actual } of regenerated) {
    if (generated.files.get(rel) !== actual) {
      throw new S03SourceError(`S01 regeneration from S1 does not reproduce ${rel}`);
    }
  }

  const template = readPinned(root, S3_PINS.rolesTemplate.path, S3_PINS.rolesTemplate.gitBlob);
  const provision = readPinned(root, S3_PINS.provisionModule.path, S3_PINS.provisionModule.gitBlob);
  const canonical = readPinned(
    root,
    CANONICAL_SERIALIZER_PIN.path,
    CANONICAL_SERIALIZER_PIN.gitBlob,
  );

  return {
    s1: s1.map(({ text, ...rest }) => ({ ...rest, text })),
    governing,
    extractionIndex: index.id,
    fragments,
    rolesTemplate: { ...template.id, text: template.bytes.toString('utf8') },
    provisionModule: { ...provision.id, text: provision.bytes.toString('utf8') },
    canonicalSerializer: canonical.id,
    regeneration: { files: regenerated.length, equal: true },
  };
}

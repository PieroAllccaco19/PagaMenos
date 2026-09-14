// M7 V1.1 — S01: the 26 normative SQL fragments of V1.1 §19.2–§19.13.
//
// Selection is by EXPLICIT anchor, never by heuristic. Each registry row names the exact accepted
// heading under which exactly one `sql` fence is normative. The extractor refuses unless the fences
// inside the normative region (the `## 19.` heading up to, excluding, `### 19.14`) are exactly these
// 26, in this order, each under its own anchor, each with the pinned body SHA-256. §19.1 (conventions)
// and §19.14 (inventory, which quotes derivation patterns) contribute no fragment; SQL-looking text
// anywhere else in the document is explanatory and never selected.
import {
  type Fence,
  type MarkdownStructure,
  SourceStructureError,
  parseMarkdown,
  sha256Hex,
  uniqueHeading,
} from './source';

export interface FragmentAnchor {
  /** Stable fragment id; also the ordinal prefix of the extracted file. */
  readonly id: string;
  /** Specification clause number, e.g. `19.10.1`. */
  readonly clause: string;
  /** The exact accepted heading line. */
  readonly heading: string;
  /** Extracted file name under the normative output directory's `sql/`. */
  readonly file: string;
  /** SHA-256 of the fence body bytes (body lines joined by LF, plus a final LF). */
  readonly bodySha256: string;
}

export const NORMATIVE_REGION_START = '## 19. Complete normative DDL';
export const NORMATIVE_REGION_END =
  '### 19.14 Object inventory (every normative object defined above)';

export const FRAGMENT_ANCHORS: readonly FragmentAnchor[] = [
  {
    id: 'F01',
    clause: '19.2',
    heading: '### 19.2 Preamble — install assertions, schema, accepted-table grants',
    file: '01_19.2_preamble.sql',
    bodySha256: '0d6a919d5aa40d4031bf540868f549b88732ac24ff27c731e7442dcae4e1f1e3',
  },
  {
    id: 'F02',
    clause: '19.3',
    heading: '### 19.3 Enumerated types',
    file: '02_19.3_enumerated-types.sql',
    bodySha256: '02b51d24aabed73e7c2d1390c620f7660729ac971426329e08110061c529f0ff',
  },
  {
    id: 'F03',
    clause: '19.4',
    heading: '### 19.4 Control-plane identity tables',
    file: '03_19.4_control-plane-identity-tables.sql',
    bodySha256: '5c09af0076a536b1c7b44f552bdcb4beb8721b36bfd136987c915e284dc214e3',
  },
  {
    id: 'F04',
    clause: '19.5',
    heading: '### 19.5 Catalog expectation set (manifest-driven, exact)',
    file: '04_19.5_catalog-expectation-set.sql',
    bodySha256: 'bdca4c13560257555f810ff213afb1aeb763a651bf1f3e9c63a9ef56fa10bc59',
  },
  {
    id: 'F05',
    clause: '19.6',
    heading: '### 19.6 Session capability tables',
    file: '05_19.6_session-capability-tables.sql',
    bodySha256: '8d5ba82eabb4bd9789dc6469c2973fdd509d6069a8c071656e5c700a9aafd7cc',
  },
  {
    id: 'F06',
    clause: '19.7',
    heading: '### 19.7 Outcome tables',
    file: '06_19.7_outcome-tables.sql',
    bodySha256: '9d8adb7c7bf1b4a66759640a45f4138402c510c5f4f199c690f99caee794bd52',
  },
  {
    id: 'F07',
    clause: '19.8',
    heading:
      '### 19.8 Evidence candidate, canonical generations, storage and `SavingEvidence` tables',
    file: '07_19.8_evidence-generations-storage-tables.sql',
    bodySha256: '697d1d93278ae4b0a4db55ce8f144b70459e1b5dea678645d4c3f2d4fd067b0f',
  },
  {
    id: 'F08',
    clause: '19.9',
    heading: '### 19.9 Privacy, deletion and outbox tables',
    file: '08_19.9_privacy-deletion-outbox-tables.sql',
    bodySha256: 'd5c8827cd16c70de9020da9b93ba35f8cc7da94ca0f127be92a861b3236effa0',
  },
  {
    id: 'F09',
    clause: '19.10',
    heading: '### 19.10 Trigger functions and triggers',
    file: '09_19.10_trigger-functions.sql',
    bodySha256: 'fa1c25f12a203ef616384141d8c5f9d29a7f704776bfb8ca43730f676a507f86',
  },
  {
    id: 'F10',
    clause: '19.10.1',
    heading: '#### 19.10.1 Trigger installation',
    file: '10_19.10.1_trigger-installation.sql',
    bodySha256: 'c2b0fd5bbc71c713572f2571e57909532b5ea4a90cc1adcd4c5a82ce76926c41',
  },
  {
    id: 'F11',
    clause: '19.11.1',
    heading: '#### 19.11.1 Internal helpers (SECURITY INVOKER; no EXECUTE grants)',
    file: '11_19.11.1_internal-helpers.sql',
    bodySha256: '76bdc866222b501df746f27d5e6d4ed6301c338f105b0822514ecda0cdc2e352',
  },
  {
    id: 'F12',
    clause: '19.11.2',
    heading:
      '#### 19.11.2 Control-plane registration and activation (owner-class only; **no login grantee**)',
    file: '12_19.11.2_control-plane-registration.sql',
    bodySha256: '572a9cf7182772f01b263ec367f993522c39e81e27edc74e59ea1ba65b6dd5a9',
  },
  {
    id: 'F13',
    clause: '19.11.3',
    heading: '#### 19.11.3 Session issuer functions (`pagamenos_m7_session_issuer_rt`)',
    file: '13_19.11.3_session-issuer.sql',
    bodySha256: 'f3adfbcf898828e1abcbf134c25ac3509c1c7f3f3b9bf7c86518f8f471d587eb',
  },
  {
    id: 'F14',
    clause: '19.11.4',
    heading:
      '#### 19.11.4 Participant functions (`pagamenos_m7_participant_rt`; reached only through the CCA engine)',
    file: '14_19.11.4_participant.sql',
    bodySha256: '0835ba74fba500c36357508ab485b2e1a96a1bbce33938bc9d108740d010ff8a',
  },
  {
    id: 'F15',
    clause: '19.11.5',
    heading:
      '#### 19.11.5 Participant privacy request (`pagamenos_m7_privacy_request_rt`; not consent-conditioned)',
    file: '15_19.11.5_privacy-request.sql',
    bodySha256: '7688c488cfbbef2434f636f0de80530fcdf6ebc784b208b71477f95671f67a06',
  },
  {
    id: 'F16',
    clause: '19.11.6',
    heading: '#### 19.11.6 Deletion authority (`pagamenos_m7_deletion_authority_rt`)',
    file: '16_19.11.6_deletion-authority.sql',
    bodySha256: '093d3f315dd8ac94fd4a6704899c2e0bd2e181c37c2897351cb906b9030fd943',
  },
  {
    id: 'F17',
    clause: '19.11.7',
    heading:
      '#### 19.11.7 Capability signer (`pagamenos_m7_capability_signer_rt`) — the sealed signer edge',
    file: '17_19.11.7_capability-signer.sql',
    bodySha256: 'eacf99ec3e728cd32881bd339478777935a57c6ad3385373f9a0692b490ece95',
  },
  {
    id: 'F18',
    clause: '19.12.1',
    heading: '#### 19.12.1 Upload pipeline',
    file: '18_19.12.1_upload-pipeline.sql',
    bodySha256: '8d88295459c55853396637e26fc350a00cbfd8a4118be11c2e46396bffae0a45',
  },
  {
    id: 'F19',
    clause: '19.12.2',
    heading: '#### 19.12.2 Deletion scheduling',
    file: '19_19.12.2_deletion-scheduling.sql',
    bodySha256: 'e79c9a264a3719d8079a49df3910e7cd2987dda70f147fd6b20f34715611062a',
  },
  {
    id: 'F20',
    clause: '19.12.3',
    heading: '#### 19.12.3 Outbox leases',
    file: '20_19.12.3_outbox-leases.sql',
    bodySha256: '5be17cfce152379d4ecbdf711a65dd1da30d70dd8799f3ca706ce5c8c29ffc83',
  },
  {
    id: 'F21',
    clause: '19.12.4',
    heading: '#### 19.12.4 Effect confirmation — the load-bearing routing check (SI-3)',
    file: '21_19.12.4_effect-confirmation.sql',
    bodySha256: '163d2c7af596a285e3d21378ea9849b7c79b18d537d6c76b01802a8b328bb8e2',
  },
  {
    id: 'F22',
    clause: '19.12.5',
    heading:
      '#### 19.12.5 Row mechanisms — the two functions permitted to lock `experiment_assignment` (LO-1)',
    file: '22_19.12.5_row-mechanisms.sql',
    bodySha256: 'cce8a66a8155c2dbee904ee21e87c97093ceaa15bf8da5b5aa32114009b97999',
  },
  {
    id: 'F23',
    clause: '19.12.6',
    heading: '#### 19.12.6 Reconciliation',
    file: '23_19.12.6_reconciliation.sql',
    bodySha256: '020a61c24cca1430c21153bb62acca962ae97a2598afb658da1cea00caf7c162',
  },
  {
    id: 'F24',
    clause: '19.13.2',
    heading: '#### 19.13.2 The verifier',
    file: '24_19.13.2_catalog-verifier.sql',
    bodySha256: '13b7d08196e87109ac6f82be3aa2256aa7c62226aec2f5688a8dc6678bb2a77c',
  },
  {
    id: 'F25',
    clause: '19.13.3',
    heading: '#### 19.13.3 Views (owner-only; no grants in V1.1)',
    file: '25_19.13.3_views.sql',
    bodySha256: 'ff8dce51a83832e2468f383c9c05634fdb535be6a7d6261dfd184c9de22513f1',
  },
  {
    id: 'F26',
    clause: '19.13.4',
    heading: '#### 19.13.4 Grants and fail-closed completion',
    file: '26_19.13.4_grants-and-completion.sql',
    bodySha256: 'f24554d93b606d87fa65d53209fc4c66af327467e91a110e042539e0f24af732',
  },
];

export const EXPECTED_FRAGMENT_COUNT = 26;

export interface NormativeFragment {
  readonly anchor: FragmentAnchor;
  readonly headingLine: number;
  readonly fenceOpenLine: number;
  readonly fenceCloseLine: number;
  /** First and last body line in the source (1-based, inclusive). */
  readonly bodyFirstLine: number;
  readonly bodyLastLine: number;
  /** Exact body bytes as text: body lines joined by LF, plus a final LF. */
  readonly sql: string;
  readonly sha256: string;
}

export class FragmentSelectionError extends SourceStructureError {
  constructor(message: string) {
    super(`fragment selection: ${message}`);
    this.name = 'FragmentSelectionError';
  }
}

function fenceBody(fence: Fence): string {
  return fence.body.length === 0 ? '' : `${fence.body.join('\n')}\n`;
}

function nearestHeadingLine(structure: MarkdownStructure, line: number): number {
  let found = 0;
  for (const h of structure.headings) {
    if (h.line < line) found = h.line;
    else break;
  }
  return found;
}

export interface FragmentSelection {
  readonly fragments: readonly NormativeFragment[];
  readonly regionStartLine: number;
  readonly regionEndLine: number;
  /** Fences outside the normative region whose info string is `sql` (never selected). */
  readonly sqlFencesOutsideRegion: number;
  readonly fencesInDocument: number;
}

/**
 * Selects exactly the 26 normative fragments from already identity-verified V1.1 text. Refuses on a
 * missing, duplicate, reordered, re-anchored, non-`sql` or unexpected fence, or on any body drift.
 */
export function selectNormativeFragments(
  text: string,
  anchors: readonly FragmentAnchor[] = FRAGMENT_ANCHORS,
): FragmentSelection {
  if (anchors.length !== EXPECTED_FRAGMENT_COUNT) {
    throw new FragmentSelectionError(
      `anchor registry has ${anchors.length} rows, expected ${EXPECTED_FRAGMENT_COUNT}`,
    );
  }
  const ids = new Set(anchors.map((a) => a.id));
  const headingsSeen = new Set(anchors.map((a) => a.heading));
  if (ids.size !== anchors.length || headingsSeen.size !== anchors.length) {
    throw new FragmentSelectionError('anchor registry contains a duplicate id or heading');
  }

  const structure = parseMarkdown(text);
  const regionStart = uniqueHeading(structure, NORMATIVE_REGION_START);
  const regionEnd = uniqueHeading(structure, NORMATIVE_REGION_END);
  if (regionEnd.line <= regionStart.line) {
    throw new FragmentSelectionError('normative region end precedes its start');
  }

  const inRegion = structure.fences.filter(
    (f) => f.openLine > regionStart.line && f.closeLine < regionEnd.line,
  );
  const straddling = structure.fences.filter(
    (f) =>
      (f.openLine < regionStart.line && f.closeLine > regionStart.line) ||
      (f.openLine < regionEnd.line && f.closeLine > regionEnd.line),
  );
  if (straddling.length > 0) {
    throw new FragmentSelectionError('a fence straddles a normative region boundary');
  }
  if (inRegion.length !== anchors.length) {
    throw new FragmentSelectionError(
      `normative region contains ${inRegion.length} fences, expected exactly ${anchors.length}`,
    );
  }

  const fragments: NormativeFragment[] = [];
  let previousHeadingLine = regionStart.line;
  anchors.forEach((anchor, index) => {
    const fence = inRegion[index]!;
    const heading = uniqueHeading(structure, anchor.heading);
    if (heading.line <= regionStart.line || heading.line >= regionEnd.line) {
      throw new FragmentSelectionError(`${anchor.id}: anchor heading is outside the region`);
    }
    if (heading.line <= previousHeadingLine) {
      throw new FragmentSelectionError(`${anchor.id}: anchor headings are out of order`);
    }
    previousHeadingLine = heading.line;
    if (fence.info !== 'sql') {
      throw new FragmentSelectionError(
        `${anchor.id}: fence at line ${fence.openLine} has info ${JSON.stringify(fence.info)}, expected "sql"`,
      );
    }
    const owner = nearestHeadingLine(structure, fence.openLine);
    if (owner !== heading.line) {
      throw new FragmentSelectionError(
        `${anchor.id}: fence at line ${fence.openLine} is not directly under ${JSON.stringify(anchor.heading)}`,
      );
    }
    const sql = fenceBody(fence);
    const sha256 = sha256Hex(sql);
    if (sha256 !== anchor.bodySha256) {
      throw new FragmentSelectionError(
        `${anchor.id}: body sha256 ${sha256} ≠ pinned ${anchor.bodySha256}`,
      );
    }
    fragments.push({
      anchor,
      headingLine: heading.line,
      fenceOpenLine: fence.openLine,
      fenceCloseLine: fence.closeLine,
      bodyFirstLine: fence.openLine + 1,
      bodyLastLine: fence.closeLine - 1,
      sql,
      sha256,
    });
  });

  return {
    fragments,
    regionStartLine: regionStart.line,
    regionEndLine: regionEnd.line,
    sqlFencesOutsideRegion: structure.fences.filter(
      (f) => f.info === 'sql' && (f.closeLine < regionStart.line || f.openLine > regionEnd.line),
    ).length,
    fencesInDocument: structure.fences.length,
  };
}

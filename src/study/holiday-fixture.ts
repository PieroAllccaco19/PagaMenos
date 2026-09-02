// PagaMenos · src/study — M3.5B-A2 Holiday Calendar Fixture v1 (runtime projection of accepted authority).
//
// This module is a NARROW, VERSIONED, READ-ONLY runtime PROJECTION/COPY of the externally accepted
// historical authority (authority commit 84a7a1a…, corpus/holiday ledger governed by CI via
// PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA). It is NOT an independent source of truth. Decision execution
// MUST NOT read Git objects / a remote / GitHub / credentials; the exact holiday dates are frozen into
// the DecideInput at DecisionRequest freeze (A2 §3.10), and this module supplies those dates by version.
//
// INVARIANT (fail closed): the fixture's semantic content digest is COMPUTED here from the actual data
// via the accepted canonical serializer + SHA-256, and asserted equal to the accepted digest at module
// load. Any change to a date / version / jurisdiction / policy / coverage / ordering / duplication that
// does not reproduce the accepted digest makes this module throw on import — decisions fail closed.
import { canonicalHash } from '@/persistence/hash';

/** The single accepted A2 holiday calendar version (A2 §3.7). */
export const A2_HOLIDAY_CALENDAR_VERSION_V1 =
  'pagamenos.holiday.pe-lima-callao.private-commerce.v1';

/** The accepted content digest (A2 §3.8) — the fixture's data must reproduce this exactly. */
export const A2_HOLIDAY_CALENDAR_DIGEST_V1 =
  'sha256:6d65409665d176d40390be4ed8414dc22e4ab9d11b40ede1d38abb7b258460d8';

/** Exact accepted normalized dates (32; sorted unique YYYY-MM-DD; 2026–2027). */
const NORMALIZED_DATES_V1 = [
  '2026-01-01',
  '2026-04-02',
  '2026-04-03',
  '2026-05-01',
  '2026-06-07',
  '2026-06-29',
  '2026-07-23',
  '2026-07-28',
  '2026-07-29',
  '2026-08-06',
  '2026-08-30',
  '2026-10-08',
  '2026-11-01',
  '2026-12-08',
  '2026-12-09',
  '2026-12-25',
  '2027-01-01',
  '2027-03-25',
  '2027-03-26',
  '2027-05-01',
  '2027-06-07',
  '2027-06-29',
  '2027-07-23',
  '2027-07-28',
  '2027-07-29',
  '2027-08-06',
  '2027-08-30',
  '2027-10-08',
  '2027-11-01',
  '2027-12-08',
  '2027-12-09',
  '2027-12-25',
] as const;

/** A resolved, read-only holiday calendar fixture (A2 §3.1). */
export interface HolidayCalendarFixtureV1 {
  readonly version: string;
  readonly jurisdiction: string;
  readonly legalPolicyVersion: string;
  readonly coverageStartDate: string;
  readonly coverageEndDate: string;
  readonly normalizedDates: readonly string[];
  readonly contentDigest: string;
}

/** Raised when the runtime fixture data does not reproduce the accepted authority digest (fail closed). */
export class HolidayFixtureIntegrityError extends Error {
  constructor(
    public readonly version: string,
    public readonly expectedDigest: string,
    public readonly computedDigest: string,
  ) {
    super(
      `holiday fixture ${version} content digest mismatch: expected ${expectedDigest}, ` +
        `computed ${computedDigest} — runtime projection diverged from accepted authority`,
    );
    this.name = 'HolidayFixtureIntegrityError';
  }
}

/** Raised when a decision requests an unknown/unsupported holiday calendar version (A2 §3.10). */
export class UnsupportedHolidayCalendarVersionError extends Error {
  constructor(public readonly version: string) {
    super(`no retained holiday calendar fixture for version ${JSON.stringify(version)}`);
    this.name = 'UnsupportedHolidayCalendarVersionError';
  }
}

/** Raised when an intended transaction date falls outside a fixture's coverage (A2 §3.5, fail closed). */
export class HolidayCoverageError extends Error {
  constructor(
    public readonly version: string,
    public readonly limaDate: string,
    public readonly coverageStartDate: string,
    public readonly coverageEndDate: string,
  ) {
    super(
      `intended Lima date ${limaDate} is outside holiday fixture ${version} coverage ` +
        `[${coverageStartDate}, ${coverageEndDate}]`,
    );
    this.name = 'HolidayCoverageError';
  }
}

/** Compute the fixture's semantic content digest from its ACTUAL data (accepted preimage shape, §3.8). */
export function computeHolidayContentDigest(fixture: {
  legalPolicyVersion: string;
  jurisdiction: string;
  coverageStartDate: string;
  coverageEndDate: string;
  normalizedDates: readonly string[];
}): string {
  // Preimage field names are the accepted semantic payload (A2 §3.8): `versionedPolicy` = policy value.
  return (
    'sha256:' +
    canonicalHash({
      versionedPolicy: fixture.legalPolicyVersion,
      jurisdiction: fixture.jurisdiction,
      coverageStartDate: fixture.coverageStartDate,
      coverageEndDate: fixture.coverageEndDate,
      normalizedDates: [...fixture.normalizedDates],
    })
  );
}

function buildV1(): HolidayCalendarFixtureV1 {
  const base = {
    version: A2_HOLIDAY_CALENDAR_VERSION_V1,
    jurisdiction: 'PE-LIMA-CALLAO-PRIVATE-COMMERCE',
    legalPolicyVersion: 'dl713-art6+ley31381+ley31530+ley31788+ley31822.v1',
    coverageStartDate: '2026-01-01',
    coverageEndDate: '2027-12-31',
    normalizedDates: NORMALIZED_DATES_V1,
  };
  // Structural self-checks (defense in depth) before the digest assertion.
  for (let i = 1; i < base.normalizedDates.length; i++) {
    if (!(base.normalizedDates[i - 1]! < base.normalizedDates[i]!)) {
      throw new HolidayFixtureIntegrityError(
        base.version,
        A2_HOLIDAY_CALENDAR_DIGEST_V1,
        'unsorted-or-duplicate',
      );
    }
  }
  const contentDigest = computeHolidayContentDigest(base);
  if (contentDigest !== A2_HOLIDAY_CALENDAR_DIGEST_V1) {
    throw new HolidayFixtureIntegrityError(
      base.version,
      A2_HOLIDAY_CALENDAR_DIGEST_V1,
      contentDigest,
    );
  }
  return Object.freeze({
    ...base,
    normalizedDates: Object.freeze([...base.normalizedDates]),
    contentDigest,
  });
}

/** The frozen, digest-verified v1 fixture (computed + asserted at module load; immutable). */
export const A2_HOLIDAY_CALENDAR_FIXTURE_V1: HolidayCalendarFixtureV1 = buildV1();

const REGISTRY: ReadonlyMap<string, HolidayCalendarFixtureV1> = new Map([
  [A2_HOLIDAY_CALENDAR_VERSION_V1, A2_HOLIDAY_CALENDAR_FIXTURE_V1],
]);

/** Resolve a retained holiday fixture by version, or throw (unsupported version → fail closed). */
export function resolveHolidayCalendarFixture(version: string): HolidayCalendarFixtureV1 {
  const f = REGISTRY.get(version);
  if (!f) throw new UnsupportedHolidayCalendarVersionError(version);
  return f;
}

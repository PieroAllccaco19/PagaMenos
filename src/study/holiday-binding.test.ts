import { describe, expect, it } from 'vitest';

import {
  A2_HOLIDAY_CALENDAR_DIGEST_V1,
  A2_HOLIDAY_CALENDAR_FIXTURE_V1,
  assertIntendedDateWithinCoverage,
  computeHolidayContentDigest,
  HolidayCoverageError,
  limaLocalDateOf,
} from './holiday-fixture';

const fx = A2_HOLIDAY_CALENDAR_FIXTURE_V1;

describe('A2 holiday binding / coverage (Sol Finding 6)', () => {
  it('derives the America/Lima local date (UTC−5) from an instant', () => {
    expect(limaLocalDateOf('2026-07-28T23:30:00-05:00')).toBe('2026-07-28');
    // 02:00Z on the 29th is 21:00 on the 28th in Lima.
    expect(limaLocalDateOf('2026-07-29T02:00:00Z')).toBe('2026-07-28');
    expect(limaLocalDateOf('2026-07-28T12:00:00-05:00')).toBe('2026-07-28');
  });

  it('accepts the coverage start and end boundaries', () => {
    expect(assertIntendedDateWithinCoverage(fx, '2026-01-01T00:00:00-05:00')).toBe('2026-01-01');
    expect(assertIntendedDateWithinCoverage(fx, '2027-12-31T23:59:00-05:00')).toBe('2027-12-31');
  });

  it('rejects a Lima date before coverage', () => {
    expect(() => assertIntendedDateWithinCoverage(fx, '2025-12-31T23:00:00-05:00')).toThrow(
      HolidayCoverageError,
    );
  });

  it('rejects a Lima date after coverage', () => {
    expect(() => assertIntendedDateWithinCoverage(fx, '2028-01-01T00:00:00-05:00')).toThrow(
      HolidayCoverageError,
    );
    // 05:00Z on 2028-01-01 is 00:00 on 2028-01-01 in Lima (UTC−5) — just past coverage end.
    expect(limaLocalDateOf('2028-01-01T05:00:00Z')).toBe('2028-01-01');
    expect(() => assertIntendedDateWithinCoverage(fx, '2028-01-01T05:00:00Z')).toThrow(
      HolidayCoverageError,
    );
  });

  it('the fixture content digest reproduces the accepted authority (bound at freeze)', () => {
    expect(computeHolidayContentDigest(fx)).toBe(A2_HOLIDAY_CALENDAR_DIGEST_V1);
    expect(fx.contentDigest).toBe(A2_HOLIDAY_CALENDAR_DIGEST_V1);
  });

  it('a mutated date / digest no longer reproduces the accepted digest', () => {
    const mutated = { ...fx, normalizedDates: [...fx.normalizedDates, '2026-01-02'] };
    expect(computeHolidayContentDigest(mutated)).not.toBe(A2_HOLIDAY_CALENDAR_DIGEST_V1);
  });
});

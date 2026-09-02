import { describe, expect, it } from 'vitest';

import {
  A2_HOLIDAY_CALENDAR_DIGEST_V1,
  A2_HOLIDAY_CALENDAR_FIXTURE_V1,
  A2_HOLIDAY_CALENDAR_VERSION_V1,
  computeHolidayContentDigest,
  resolveHolidayCalendarFixture,
  UnsupportedHolidayCalendarVersionError,
} from './holiday-fixture';

describe('A2 holiday fixture v1 (runtime projection of accepted authority)', () => {
  it('binds the accepted version + digest and reproduces the digest from its own data', () => {
    expect(A2_HOLIDAY_CALENDAR_FIXTURE_V1.version).toBe(A2_HOLIDAY_CALENDAR_VERSION_V1);
    expect(A2_HOLIDAY_CALENDAR_FIXTURE_V1.contentDigest).toBe(A2_HOLIDAY_CALENDAR_DIGEST_V1);
    expect(computeHolidayContentDigest(A2_HOLIDAY_CALENDAR_FIXTURE_V1)).toBe(
      A2_HOLIDAY_CALENDAR_DIGEST_V1,
    );
  });

  it('carries exactly 32 sorted-unique dates over 2026-2027 coverage', () => {
    const d = A2_HOLIDAY_CALENDAR_FIXTURE_V1.normalizedDates;
    expect(d).toHaveLength(32);
    expect([...d]).toEqual([...d].sort());
    expect(new Set(d).size).toBe(32);
    expect(A2_HOLIDAY_CALENDAR_FIXTURE_V1.coverageStartDate).toBe('2026-01-01');
    expect(A2_HOLIDAY_CALENDAR_FIXTURE_V1.coverageEndDate).toBe('2027-12-31');
    expect(d).toContain('2026-07-28'); // Fiestas Patrias
    expect(d).toContain('2026-04-03'); // Viernes Santo 2026
    expect(d).not.toContain('2026-07-27'); // public-sector día no laborable — excluded
  });

  it('is immutable to callers (frozen)', () => {
    expect(Object.isFrozen(A2_HOLIDAY_CALENDAR_FIXTURE_V1)).toBe(true);
    expect(Object.isFrozen(A2_HOLIDAY_CALENDAR_FIXTURE_V1.normalizedDates)).toBe(true);
    expect(() => {
      // @ts-expect-error runtime immutability check
      A2_HOLIDAY_CALENDAR_FIXTURE_V1.normalizedDates[0] = '2000-01-01';
    }).toThrow();
  });

  it('any date/policy/coverage change fails to reproduce the accepted digest', () => {
    const base = A2_HOLIDAY_CALENDAR_FIXTURE_V1;
    const changedDate = computeHolidayContentDigest({
      ...base,
      normalizedDates: ['2099-01-01', ...base.normalizedDates.slice(1)],
    });
    expect(changedDate).not.toBe(A2_HOLIDAY_CALENDAR_DIGEST_V1);
    const changedPolicy = computeHolidayContentDigest({ ...base, legalPolicyVersion: 'other.v1' });
    expect(changedPolicy).not.toBe(A2_HOLIDAY_CALENDAR_DIGEST_V1);
    const changedCoverage = computeHolidayContentDigest({ ...base, coverageEndDate: '2028-12-31' });
    expect(changedCoverage).not.toBe(A2_HOLIDAY_CALENDAR_DIGEST_V1);
  });

  it('resolves the retained version and rejects unknown versions (fail closed)', () => {
    expect(resolveHolidayCalendarFixture(A2_HOLIDAY_CALENDAR_VERSION_V1).contentDigest).toBe(
      A2_HOLIDAY_CALENDAR_DIGEST_V1,
    );
    expect(() => resolveHolidayCalendarFixture('pagamenos.holiday.other.v2')).toThrow(
      UnsupportedHolidayCalendarVersionError,
    );
  });
});

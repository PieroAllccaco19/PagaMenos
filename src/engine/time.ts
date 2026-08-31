// PagaMenos · engine — America/Lima temporal evaluation (§18/§19).
// Peru (America/Lima) is a fixed UTC−05:00 offset year-round (no DST), so Lima calendar math is
// deterministic: shift the instant by −5h and read UTC fields. No host-timezone dependency, no
// external holiday API — only explicit corpus holiday facts/policies are honoured.
import { parseStrictInstantMs } from '@/corpus';
import type { Constraints, TemporalRange, Weekday } from '@/corpus';

import { TemporalInputError } from './errors';

const LIMA_OFFSET_MS = 5 * 60 * 60 * 1000; // UTC−05:00
const WEEKDAY_BY_INDEX: Weekday[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/**
 * Parse a STRICT ISO-8601 instant (RTM3-06) to epoch ms; throws on anything permissive `Date.parse`
 * would have silently accepted — an offsetless value (`2026-09-01`, `2026-09-01T12:00:00`) or an
 * impossible date (`2026-02-30`). A zone (`Z` or ±HH:MM) is REQUIRED; components are range-validated.
 */
export function epochMs(iso: string): number {
  const ms = parseStrictInstantMs(iso);
  if (ms === null) {
    throw new TemporalInputError(
      `invalid ISO-8601 instant: ${iso} (a zone-qualified date-time is required)`,
    );
  }
  return ms;
}

/** The Lima civil date (YYYY-MM-DD) of an instant. */
export function limaDate(iso: string): string {
  const shifted = new Date(epochMs(iso) - LIMA_OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth() + 1;
  const d = shifted.getUTCDate();
  return `${y.toString().padStart(4, '0')}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
}

/** The Lima weekday of an instant. */
export function limaWeekday(iso: string): Weekday {
  const shifted = new Date(epochMs(iso) - LIMA_OFFSET_MS);
  return WEEKDAY_BY_INDEX[shifted.getUTCDay()]!;
}

/** The Lima wall-clock time as "HH:MM" (24h) of an instant. */
export function limaTimeHHMM(iso: string): string {
  const shifted = new Date(epochMs(iso) - LIMA_OFFSET_MS);
  const hh = shifted.getUTCHours().toString().padStart(2, '0');
  const mm = shifted.getUTCMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Whether the intended instant falls inside the rule's temporal range (Lima semantics). */
export function withinTemporalRange(range: TemporalRange, intendedTransactionAt: string): boolean {
  switch (range.kind) {
    case 'LOCAL_DATE_RANGE': {
      const d = limaDate(intendedTransactionAt);
      return range.startDateInclusive <= d && d <= range.endDateInclusive;
    }
    case 'OBSERVED_ACTIVE_UNTIL': {
      // Conservative M1-closure contract: applicable only within the evidence-supported interval
      // [observedActiveAt, endDateInclusive]. observedActiveAt is provenance, not a claimed start,
      // so NO earlier applicability may be inferred.
      const d = limaDate(intendedTransactionAt);
      return range.observedActiveAt <= d && d <= range.endDateInclusive;
    }
    case 'LOCAL_DATETIME_RANGE': {
      const t = epochMs(intendedTransactionAt);
      return epochMs(range.startInclusive) <= t && t < epochMs(range.endExclusive);
    }
    default: {
      const _exhaustive: never = range;
      throw new TemporalInputError(`unhandled TemporalRange: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

/** Whether the intended instant satisfies an optional weekday restriction. */
export function withinWeekdays(
  weekdays: Weekday[] | undefined,
  intendedTransactionAt: string,
): boolean {
  if (!weekdays || weekdays.length === 0) return true;
  return weekdays.includes(limaWeekday(intendedTransactionAt));
}

/** Whether the intended instant satisfies an optional Lima time window. */
export function withinTimeWindow(
  window: { from: string; to: string } | undefined,
  intendedTransactionAt: string,
): boolean {
  if (!window) return true;
  const t = limaTimeHHMM(intendedTransactionAt);
  return window.from <= t && t <= window.to;
}

/** Holiday evaluation outcome: whether the date is blocked, or whether it is uncertain. */
export type HolidayOutcome = 'ALLOWED' | 'BLOCKED' | 'UNCERTAIN';

/**
 * Evaluate the holiday policy against the intended Lima date. `holidayCalendar` is the authoritative
 * (explicit) set of Lima holiday dates supplied to the evaluator; there is no external lookup.
 * UNKNOWN policy is conservative: it is only UNCERTAIN when the date is actually a holiday —
 * on a non-holiday the policy cannot change applicability.
 */
export function evaluateHoliday(
  constraints: Constraints,
  intendedTransactionAt: string,
  holidayCalendar: ReadonlySet<string>,
): HolidayOutcome {
  const d = limaDate(intendedTransactionAt);
  const isHoliday = holidayCalendar.has(d);
  switch (constraints.holidayPolicy) {
    case 'NONE':
      return 'ALLOWED';
    case 'EXCLUDED':
      return isHoliday ? 'BLOCKED' : 'ALLOWED';
    case 'SPECIFIC_DATES':
      return (constraints.specificBlackoutDates ?? []).includes(d) ? 'BLOCKED' : 'ALLOWED';
    case 'UNKNOWN':
      // Uncertainty only bites on an actual holiday; otherwise the policy is irrelevant that day.
      return isHoliday ? 'UNCERTAIN' : 'ALLOWED';
    default: {
      const _exhaustive: never = constraints.holidayPolicy;
      throw new TemporalInputError(`unhandled HolidayPolicy: ${String(_exhaustive)}`);
    }
  }
}

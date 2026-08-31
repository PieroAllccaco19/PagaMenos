// PagaMenos · strict ISO-8601 instant validation (RTM3-06). Pure, deterministic, no I/O.
//
// `Date.parse` is permissive: it accepts offsetless strings (assigning the host timezone) and
// silently normalizes impossible dates (2026-02-30 → March). Neither is acceptable for a
// timezone-critical, fail-closed engine. This validator requires a full date-time WITH an explicit
// zone (`Z` or ±HH:MM) and rejects impossible calendar components before computing an epoch.

const INSTANT_RE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:\d{2})$/;

function daysInMonth(year: number, month1: number): number {
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const table = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return table[month1 - 1] ?? 0;
}

/**
 * Parse a strict ISO-8601 instant to epoch milliseconds, or return `null` if it is not a valid
 * zone-qualified instant. Rejects: offsetless values (`2026-09-01`, `2026-09-01T12:00:00`),
 * impossible dates (`2026-02-30`), and out-of-range time/offset components. Leap years are honoured.
 */
export function parseStrictInstantMs(iso: string): number | null {
  if (typeof iso !== 'string') return null;
  const m = INSTANT_RE.exec(iso);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour = Number(m[4]);
  const minute = Number(m[5]);
  const second = Number(m[6]);
  const frac = m[7] ?? '';
  const zone = m[8]!;

  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  if (hour > 23 || minute > 59 || second > 59) return null;

  let offsetMinutes = 0;
  if (zone !== 'Z') {
    const sign = zone[0] === '-' ? -1 : 1;
    const offHour = Number(zone.slice(1, 3));
    const offMin = Number(zone.slice(4, 6));
    if (offHour > 23 || offMin > 59) return null;
    offsetMinutes = sign * (offHour * 60 + offMin);
  }

  // Milliseconds from the fractional second (only the first 3 digits are significant here).
  const ms = frac ? Math.floor(Number(`0.${frac}`) * 1000) : 0;
  const wallClockUtc = Date.UTC(year, month - 1, day, hour, minute, second, ms);
  return wallClockUtc - offsetMinutes * 60 * 1000;
}

/** Whether `iso` is a valid strict zone-qualified ISO-8601 instant. */
export function isValidInstant(iso: string): boolean {
  return parseStrictInstantMs(iso) !== null;
}

// PagaMenos · persistence — FROZEN v1 strict instant validator (P35A-04 §30).
//
// Historical v1 payloads MUST validate by a rule that never drifts. This is a persistence-v1-owned
// copy of the accepted strict ISO-8601 instant grammar (zone-qualified date-time, `Z` or ±HH:MM,
// impossible calendar dates rejected). It intentionally does NOT import the live corpus validator, so
// a future live-domain change cannot silently alter how frozen v1 history is parsed. The semantics
// are identical to the accepted M0–M3 instant format; only the ownership is frozen here.
const INSTANT_V1_RE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:\d{2})$/;

function daysInMonth(year: number, month1: number): number {
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const table = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return table[month1 - 1] ?? 0;
}

/**
 * Parse a strict zone-qualified ISO-8601 instant to epoch milliseconds, or null if invalid. Two
 * strings that denote the SAME instant in different offsets (`...T12:00:00-05:00` and `...T17:00:00Z`)
 * map to the same epoch — used for instant-equality coherence checks where a timestamptz column
 * round-trips as UTC while the JSON payload keeps its original offset.
 */
export function instantV1ToEpochMs(iso: string): number | null {
  if (typeof iso !== 'string') return null;
  const m = INSTANT_V1_RE.exec(iso);
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
  const ms = frac ? Math.floor(Number(`0.${frac}`) * 1000) : 0;
  return Date.UTC(year, month - 1, day, hour, minute, second, ms) - offsetMinutes * 60 * 1000;
}

/** Whether `iso` is a valid strict zone-qualified ISO-8601 instant under the frozen v1 grammar. */
export function isValidInstantV1(iso: string): boolean {
  return instantV1ToEpochMs(iso) !== null;
}

/** Whether two instant strings denote the SAME instant (offset-insensitive). */
export function sameInstantV1(a: string, b: string): boolean {
  const ea = instantV1ToEpochMs(a);
  const eb = instantV1ToEpochMs(b);
  return ea !== null && eb !== null && ea === eb;
}

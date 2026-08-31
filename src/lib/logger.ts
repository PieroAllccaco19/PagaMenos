// PagaMenos · RT-16 logging/telemetry privacy control.
//
// Contract (see docs/LOGGING_PRIVACY_POLICY.md): application telemetry uses an ALLOWLIST of
// structured fields — "log allowlisted fields", never "log everything and redact later".
// Any field not on the allowlist is dropped, and a defensive substring scan drops anything
// whose key still looks sensitive. This module is the single sanctioned entry point for
// building log records; raw objects must never be logged directly.

/** The only field keys permitted to leave the application in telemetry/logs. */
export const ALLOWED_LOG_FIELDS = [
  'event',
  'route',
  'method',
  'statusCode',
  'durationMs',
  'participantRef', // opaque pseudonymous reference only — never email/identity
  'decisionRef',
  'ruleRef',
  'sourceCheckId',
  'wave',
  'corpusVersion',
  'engineSemanticVersion',
] as const;

export type AllowedLogField = (typeof ALLOWED_LOG_FIELDS)[number];

const ALLOWED = new Set<string>(ALLOWED_LOG_FIELDS);

/**
 * Key substrings that must never appear in telemetry, even if an allowlisted-looking key
 * were added by mistake. Defense in depth behind the allowlist.
 */
const FORBIDDEN_KEY_SUBSTRINGS = [
  'email',
  'token',
  'cookie',
  'session',
  'password',
  'secret',
  'authorization',
  'credential',
  'apikey',
  'api_key',
  'evidence',
  'portfolio',
  'basket',
  'snapshot',
  'url',
  'magiclink',
  'magic_link',
];

function isForbiddenKey(key: string): boolean {
  const lower = key.toLowerCase();
  return FORBIDDEN_KEY_SUBSTRINGS.some((s) => lower.includes(s));
}

/** Drop every field that is not explicitly allowlisted (and not sensitive-looking). */
export function sanitizeLogFields(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(input)) {
    if (!ALLOWED.has(key)) continue;
    if (isForbiddenKey(key)) continue;
    out[key] = input[key];
  }
  return out;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEvent {
  level: LogLevel;
  message: string;
  ts: string;
  fields: Record<string, unknown>;
}

/** Build a log record whose payload is guaranteed to carry only allowlisted fields. */
export function createLogEvent(
  level: LogLevel,
  message: string,
  fields: Record<string, unknown> = {},
): LogEvent {
  return {
    level,
    message,
    ts: new Date().toISOString(),
    fields: sanitizeLogFields(fields),
  };
}

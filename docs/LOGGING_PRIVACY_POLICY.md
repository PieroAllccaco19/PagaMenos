# Logging & Telemetry Privacy Policy (RT-16)

**Status:** normative · established at M0, before any application logging exists.
**Enforcement:** `src/lib/logger.ts` (allowlist) + `src/lib/logger.test.ts` (automated check).

## Principle

Application telemetry and error logging use an **allowlist of structured fields** — *log
allowlisted fields*, never *log everything and redact later*. Any field not explicitly
allowlisted is dropped before it can leave the process.

## MUST NOT be sent to logs, error telemetry, or analytics

- participant email or any identity value;
- magic-link / auth token; session token; cookies;
- signed evidence URLs; raw evidence;
- raw provider snapshots;
- credentials / secrets / API keys / `DATABASE_URL`;
- full eligibility portfolio (unless explicitly sanitized and required);
- full purchase basket / context (unless explicitly sanitized and required).

## Allowlisted structured fields

Only the keys in `ALLOWED_LOG_FIELDS` (`src/lib/logger.ts`) may be logged, e.g. `event`,
`route`, `method`, `statusCode`, `durationMs`, `participantRef` (opaque pseudonymous
reference only), `decisionRef`, `ruleRef`, `sourceCheckId`, `wave`, `corpusVersion`,
`engineSemanticVersion`. A defensive substring scan additionally drops any key that looks
sensitive. Raw objects are never logged directly — all records go through
`createLogEvent(...)` / `sanitizeLogFields(...)`.

## Error-tracking (Sentry) contract — when introduced (deferred; not installed at M0)

- scrub request bodies, headers, and query strings; do not transmit them blindly;
- **do not** enable session replay;
- disable default PII capture (`sendDefaultPii = false`);
- add automated config/tests asserting this contract before enabling in any environment.

Sentry is intentionally **not** installed at M0 (no unnecessary telemetry). This policy is
the precondition that must hold before it, or any application logging, is added.

// M7 V1.1 — S03 verification bootstrap: evidence records (VBA-01 §12 VBA-EV, VBA-AX-7).
//
// Verification tooling only. Evidence is written OUTSIDE the repository tree, sanitized (no credential,
// no port), and every recorded value carries exactly one VBA-AX-7 domain. Evidence is not authority,
// never a manifest, and satisfies no MA / IMP / Gate-2 item (VBA-LB-1).
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';

export type ValueDomain =
  | 'PRE-EXECUTION FIXED INPUT'
  | 'PRE-EXECUTION DERIVED EXPECTATION'
  | 'RUNTIME CHAINING VALUE'
  | 'ACTUAL DATABASE OBSERVATION';

export interface Labeled<T> {
  readonly domain: ValueDomain;
  readonly value: T;
}

export const fixedInput = <T>(value: T): Labeled<T> => ({
  domain: 'PRE-EXECUTION FIXED INPUT',
  value,
});
export const derivedExpectation = <T>(value: T): Labeled<T> => ({
  domain: 'PRE-EXECUTION DERIVED EXPECTATION',
  value,
});
export const runtimeChaining = <T>(value: T): Labeled<T> => ({
  domain: 'RUNTIME CHAINING VALUE',
  value,
});
export const observed = <T>(value: T): Labeled<T> => ({
  domain: 'ACTUAL DATABASE OBSERVATION',
  value,
});

export type Verdict = 'PASS' | 'FAIL' | 'NOT_EXECUTED' | 'BLOCKED';

export interface SessionIdentity {
  readonly role: string;
  readonly sessionUser: string;
  readonly currentUser: string;
  readonly backendPid: number;
  readonly applicationName: string;
}

/** One executed (or explicitly not executed) verification item (VBA-EV "Execution"). */
export interface CaseResult {
  readonly id: string;
  readonly clause: string;
  readonly actor: string;
  readonly session: SessionIdentity | null;
  readonly operation: string;
  readonly expected: string;
  readonly observed: string;
  readonly sqlstate: string | null;
  readonly verdict: Verdict;
  readonly note?: string;
}

/** An ordered, monotonic event log: proves what happened before the first database connection. */
export class EventLog {
  readonly events: {
    seq: number;
    at: string;
    monotonicNs: string;
    event: string;
    detail?: unknown;
  }[] = [];
  push(event: string, detail?: unknown): number {
    const seq = this.events.length + 1;
    this.events.push({
      seq,
      at: new Date().toISOString(),
      monotonicNs: process.hrtime.bigint().toString(),
      event,
      ...(detail === undefined ? {} : { detail }),
    });
    return seq;
  }
}

export function sha256OfText(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/** Replaces every secret and every occurrence of the ephemeral port. */
export function sanitize(
  text: string,
  secrets: readonly string[],
  ports: readonly number[],
): string {
  let out = text;
  for (const s of secrets) if (s.length > 0) out = out.split(s).join('[REDACTED]');
  for (const p of ports) {
    out = out.split(`:${p}`).join(':<port>').split(`"port": ${p}`).join('"port": "<port>"');
  }
  return out;
}

/** Refuses to write evidence inside `repoRoot` (evidence stays outside the implementation tree). */
export function assertOutsideRepository(path: string, repoRoot: string): void {
  const rel = relative(resolve(repoRoot), resolve(path));
  if (rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))) {
    throw new Error(`evidence path ${path} is inside the repository; refused`);
  }
}

export function writeEvidenceFile(
  path: string,
  data: unknown,
  secrets: readonly string[],
  ports: readonly number[],
): string {
  const text = sanitize(`${JSON.stringify(data, null, 2)}\n`, secrets, ports);
  if (secrets.some((s) => s.length > 0 && text.includes(s))) {
    throw new Error(`evidence ${path} would contain a credential; refused`);
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
  return sha256OfText(text);
}

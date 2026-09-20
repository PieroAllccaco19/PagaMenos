// PagaMenos · src/cca — canonical consent-evaluation reuse (Amendment 01 §8: CCA-SEM, CCA-PRED, AGR).
//
// NOT a second consent algorithm. Step K (§30) is the accepted A1 §8.8 predicate
// `wasCollectionAuthorizedAtKnownTime`, consumed unchanged from src/study/consent-state.ts. Step L
// applies AGR (§8.3) — the accepted, FAITHFUL restatement of RT-17 over the accepted grant material —
// composed ONLY from the accepted pure functions `deriveConsentAuthorizationIntervals` and
// `orderBySeq`. Facts come from the accepted reader (src/db/study-support.ts) and the instant from the
// accepted trusted service clock; both are supplied by the CCA engine. Nothing here reads a clock,
// touches a database, or exposes why an evaluation failed.
import {
  deriveConsentAuthorizationIntervals,
  orderBySeq,
  wasCollectionAuthorizedAtKnownTime,
  type ConsentEventFact,
} from '@/study';

import { CcaError } from './errors';
import type { CollectionConsentPolicy } from './policy';

function integrityFailure(detail: string): CcaError {
  return new CcaError('CCA_CONSENT_HISTORY_INTEGRITY_FAILURE', detail);
}

/** AGR `dec`: Date.parse with NaN → throw. */
function dec(iso: string): number {
  const n = Date.parse(iso);
  if (Number.isNaN(n)) throw integrityFailure('undecodable consent instant');
  return n;
}

/**
 * AGR(facts, collectionAt) — §8.3, step for step. Returns the RT-17 optional-evidence authorization
 * of the single grant whose interval contains the collection instant.
 */
export function applyAgr(facts: readonly ConsentEventFact[], collectionAt: Date): boolean {
  const iso = collectionAt.toISOString();
  const at = dec(iso);
  // AGR-1
  const visible = facts.filter((f) => dec(f.recordedAt) <= at);
  // AGR-2
  const intervals = deriveConsentAuthorizationIntervals(visible);
  // AGR-3
  const grants = orderBySeq(visible).filter((f) => f.action === 'GRANTED');
  // AGR-4
  if (intervals.length !== grants.length) throw integrityFailure('interval/grant cardinality');
  for (let i = 0; i < intervals.length; i++) {
    const interval = intervals[i]!;
    if (interval.kind === 'INTERVAL' && interval.startAt !== grants[i]!.capturedAt) {
      throw integrityFailure('interval start does not match its opening grant');
    }
  }
  // AGR-5
  const containing: number[] = [];
  intervals.forEach((interval, i) => {
    if (interval.kind !== 'INTERVAL') return;
    if (dec(interval.startAt) > at) return;
    if (interval.endAt !== null && !(at < dec(interval.endAt))) return;
    containing.push(i);
  });
  // AGR-6
  if (containing.length !== 1) throw integrityFailure('containing interval is not unique');
  // AGR-7
  const g = grants[containing[0]!]!;
  if (typeof g.optionalEvidenceConsent !== 'boolean') {
    throw integrityFailure('containing grant lacks boolean optionalEvidenceConsent');
  }
  // AGR-8
  return g.optionalEvidenceConsent === true;
}

/**
 * §30 steps K–L for a statically bound policy. `false` becomes the generic NOT_AUTHORIZED; the
 * caller never learns which step refused (§9.2).
 */
export function evaluateCollectionConsent(
  policy: CollectionConsentPolicy,
  facts: readonly ConsentEventFact[],
  collectionAt: Date,
): boolean {
  // K — unchanged A1 §8.8 predicate.
  const general = wasCollectionAuthorizedAtKnownTime({
    events: facts,
    collectionAt: collectionAt.toISOString(),
  });
  if (!general) return false;
  if (policy === 'GENERAL_COLLECTION') return true;
  // L — AGR for the optional-evidence policy only.
  return applyAgr(facts, collectionAt);
}

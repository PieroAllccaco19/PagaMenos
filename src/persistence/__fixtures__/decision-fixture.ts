// PagaMenos · persistence test fixtures — a realistic FROZEN-corpus decision (not a corpus mutation).
//
// Reuses the M3 golden harness to assemble a genuine DecideInput over Corpus v1 rule semantics and
// runs the accepted pure engine, so persistence tests exercise real engine payloads (not hand-rolled
// stubs). No corpus value is mutated. This file is NOT a test (no `.test.ts`) — it is imported by the
// persistence unit tests and the real-Postgres integration suite.
import { CORPUS_V1 } from '@/corpus';
import { decide, type DecideInput, type EngineEvaluation } from '@/engine';
import { exactItemsOf, frozenRule, frozenScope, opState, toInput } from '@/engine/golden/harness';
import { fixedBuildMetadataProvider, type BuildMetadataProvider } from '@/persistence/provenance';

const TUE = '2026-09-01T12:00:00-05:00';

/** The corpus label persisted alongside a decision made over Corpus v1. */
export const CORPUS_VERSION = CORPUS_V1.corpusId;

/** A valid 40-hex (SHA-1) test build id — passes the trusted-build format guard. */
export const TEST_GIT_SHA = '0123456789abcdef0123456789abcdef01234567';

/** Trusted build-metadata provider for tests (a trusted dependency, never a request field). */
export function testBuildProvider(): BuildMetadataProvider {
  return fixedBuildMetadataProvider({ gitSha: TEST_GIT_SHA, buildId: 'itest' });
}

/** FIX01 Chinawok: Plin fixed bundle 1590 beats Sip 1690 (BEST_CONFIRMED). */
export function chinawokInput(): DecideInput {
  const scope = frozenScope('sc_cw_chijaukay_alopobre');
  return toInput({
    rules: [frozenRule('CW-PLIN-01'), frozenRule('CW-SIP-01')],
    operationalStates: [opState('CW-PLIN-01'), opState('CW-SIP-01')],
    scopes: [scope],
    context: {
      merchantId: 'm_chinawok',
      channel: 'SALON',
      branch: 'miraflores',
      exactItems: exactItemsOf(scope),
    },
    intendedTransactionAt: TUE,
  });
}

/** The Chinawok input paired with its exact engine output. */
export function chinawokDecision(): { input: DecideInput; output: EngineEvaluation } {
  const input = chinawokInput();
  return { input, output: decide(input) };
}

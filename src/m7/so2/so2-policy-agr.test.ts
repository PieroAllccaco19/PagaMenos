// PagaMenos · src/m7/so2 — SO-2 policy / AGR productive-path evidence (SO-2 AUTH §8, §29). Offline.
//
// SO-2 is the FIRST productive use of AGR. This suite proves, on the ACCEPTED evaluation function the
// SO-2 engine path calls (not on a copy):
//   * the SO-2 policy is OPTIONAL_EVIDENCE by construction (leaf literal + engine constant + factory);
//   * `evaluateCollectionConsent` is the function the engine imports, unchanged, from cca/;
//   * the A1 §8.8 general predicate runs FIRST, and AGR runs ONLY after general authorization;
//   * optionalEvidenceConsent=false under a valid general grant refuses;
//   * no SO-2 leaf / executor / adapter / grammar / engine source names optionalEvidenceConsent or AGR.
// It does not label AG-03 closed: this is CANDIDATE EVIDENCE for a pre-LC-1 slice.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ConsentEventFact } from '@/study';

const calls: string[] = [];

vi.mock('@/study', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/study')>();
  return {
    ...actual,
    wasCollectionAuthorizedAtKnownTime: (
      ...a: Parameters<typeof actual.wasCollectionAuthorizedAtKnownTime>
    ) => {
      calls.push('GENERAL');
      return actual.wasCollectionAuthorizedAtKnownTime(...a);
    },
    deriveConsentAuthorizationIntervals: (
      ...a: Parameters<typeof actual.deriveConsentAuthorizationIntervals>
    ) => {
      calls.push('AGR');
      return actual.deriveConsentAuthorizationIntervals(...a);
    },
  };
});

const { evaluateCollectionConsent } = await import('@/cca/consent-evaluation');

const SRC = join(import.meta.dirname, '..', '..');
const source = (rel: string): string => readFileSync(join(SRC, rel), 'utf8');
const codeOnly = (rel: string): string =>
  source(rel)
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

const iso = (ms: number): string => new Date(ms).toISOString();
function grant(seq: number, at: number, optional: boolean): ConsentEventFact {
  return {
    consentSeq: seq,
    action: 'GRANTED',
    consentVersion: 'cv1',
    privacyNoticeVersion: 'pv1',
    optionalEvidenceConsent: optional,
    assertedEffectiveAt: null,
    capturedAt: iso(at),
    recordedAt: iso(at),
  };
}
function withdraw(seq: number, at: number): ConsentEventFact {
  return {
    consentSeq: seq,
    action: 'WITHDRAWN',
    consentVersion: null,
    privacyNoticeVersion: null,
    optionalEvidenceConsent: null,
    assertedEffectiveAt: null,
    capturedAt: iso(at),
    recordedAt: iso(at),
  };
}

beforeEach(() => {
  calls.length = 0;
});

describe('SO-2 policy is OPTIONAL_EVIDENCE by construction', () => {
  it('the leaf literal, the engine constant and the factory guard all say OPTIONAL_EVIDENCE', () => {
    expect(codeOnly('m7/so2/m7-evidence-upload.cca-leaf.ts')).toContain(
      "policy: 'OPTIONAL_EVIDENCE'",
    );
    const engine = codeOnly('db/m7-participant-cca-engine.ts');
    expect(engine).toContain("const SO2_POLICY: CollectionConsentPolicy = 'OPTIONAL_EVIDENCE';");
    expect(engine).toContain('if (policy !== SO2_POLICY) throw invalidDefinition(');
  });

  it('the engine evaluates consent ONLY through the accepted cca/consent-evaluation import', () => {
    const engine = codeOnly('db/m7-participant-cca-engine.ts');
    expect(engine).toContain(
      "import { evaluateCollectionConsent } from '@/cca/consent-evaluation';",
    );
    expect(engine).not.toMatch(/\bapplyAgr\b/);
    expect(engine).not.toMatch(
      /deriveConsentAuthorizationIntervals|wasCollectionAuthorizedAtKnownTime/,
    );
  });

  it('no SO-2 module and no engine source names optionalEvidenceConsent', () => {
    for (const rel of [
      'm7/so2/m7-evidence-upload.cca-leaf.ts',
      'm7/so2/m7-evidence-upload.cca-executor.ts',
      'm7/so2/m7-evidence-upload.cca-adapter.ts',
      'm7/so2/m7-evidence-upload.cca-adapter-interface.ts',
      'm7/so2/evidence-upload-input.ts',
      'm7/so2/m7-evidence-upload-operation-context.ts',
      'db/m7-participant-cca-engine.ts',
    ]) {
      expect(codeOnly(rel), rel).not.toContain('optionalEvidenceConsent');
    }
  });
});

describe('AGR on the SO-2 path — general A1 predicate FIRST, AGR only after it authorizes', () => {
  it('valid general grant + optionalEvidenceConsent=true → authorized; GENERAL ran before AGR', () => {
    expect(
      evaluateCollectionConsent('OPTIONAL_EVIDENCE', [grant(1, 1_000, true)], new Date(1_500)),
    ).toBe(true);
    expect(calls[0]).toBe('GENERAL');
    expect(calls).toContain('AGR');
    expect(calls.indexOf('GENERAL')).toBeLessThan(calls.indexOf('AGR'));
  });

  it('valid general grant + optionalEvidenceConsent=false → refused by AGR', () => {
    expect(
      evaluateCollectionConsent('OPTIONAL_EVIDENCE', [grant(1, 1_000, false)], new Date(1_500)),
    ).toBe(false);
    expect(calls[0]).toBe('GENERAL');
    expect(calls).toContain('AGR');
  });

  it('withdrawn → refused by the GENERAL predicate, and AGR never runs', () => {
    expect(
      evaluateCollectionConsent(
        'OPTIONAL_EVIDENCE',
        [grant(1, 1_000, true), withdraw(2, 2_000)],
        new Date(2_500),
      ),
    ).toBe(false);
    expect(calls).toEqual(['GENERAL']);
  });

  it('no grant at all → refused by the GENERAL predicate without AGR (AGR would have thrown)', () => {
    // AGR-6 raises an integrity failure when no interval contains the instant. The SO-2 path never
    // reaches it for a general refusal, which is exactly "AGR applies only after general auth".
    expect(evaluateCollectionConsent('OPTIONAL_EVIDENCE', [], new Date(1_500))).toBe(false);
    expect(calls).toEqual(['GENERAL']);
  });

  it('the refusal is a bare boolean — no reason, no grant identity, no AGR result is exposed', () => {
    const a = evaluateCollectionConsent(
      'OPTIONAL_EVIDENCE',
      [grant(1, 1_000, false)],
      new Date(1_500),
    );
    const b = evaluateCollectionConsent(
      'OPTIONAL_EVIDENCE',
      [grant(1, 1_000, true), withdraw(2, 2_000)],
      new Date(2_500),
    );
    expect(a).toBe(false);
    expect(b).toBe(false);
    expect(typeof a).toBe('boolean');
  });

  it('GENERAL_COLLECTION (SO-1) never runs AGR — the SO-1 path is untouched', () => {
    expect(
      evaluateCollectionConsent('GENERAL_COLLECTION', [grant(1, 1_000, false)], new Date(1_500)),
    ).toBe(true);
    expect(calls).toEqual(['GENERAL']);
  });
});

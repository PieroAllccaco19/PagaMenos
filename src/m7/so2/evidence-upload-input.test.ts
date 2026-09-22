// PagaMenos · src/m7/so2 — SO-2 caller grammar (V1.1 §9.3; SO-2 AUTH §6, §7). Offline, pure.
import { describe, expect, it } from 'vitest';

import {
  M7EvidenceUploadInputError,
  NONCE_ENTROPY_STATUS,
  SO2_INPUT_KEYS,
  parseEvidenceUploadInput,
} from './evidence-upload-input';

const INTENT = '3f2b8c1e-7d4a-4b6e-9a51-0c2d3e4f5a6b';
const NONCE = 'AbCdEfGhIjKlMnOpQrStUv'; // exactly 22 characters

describe('SO-2 grammar — the closed §9.3 key set', () => {
  it('is exactly {purchaseIntentId, clientCorrelationNonce}', () => {
    expect([...SO2_INPUT_KEYS]).toEqual(['purchaseIntentId', 'clientCorrelationNonce']);
    expect(Object.isFrozen(SO2_INPUT_KEYS)).toBe(true);
  });

  it('accepts exactly the two fields and returns a NEW object with only them', () => {
    const raw = { purchaseIntentId: INTENT, clientCorrelationNonce: NONCE };
    const parsed = parseEvidenceUploadInput(raw);
    expect(parsed).toEqual(raw);
    expect(parsed).not.toBe(raw);
  });

  it.each([
    'participantId',
    'assignmentId',
    'sessionSecret',
    'capturedAt',
    'manifestSha256',
    'manifestVersion',
    'storageProfileId',
    'credentialProfileId',
    'backendSha256',
    'stagingObjectKey',
    'uploadTransport',
    'uploadExpiresAt',
    'maxBytes',
    'mediaPolicyVersion',
    'retentionPolicyVersion',
    'installationId',
    'policy',
    'operationId',
    'executor',
    'callback',
    'transaction',
    'objectKey',
    'providerCredential',
    'signedUrl',
  ])('rejects the forbidden caller input %s', (key) => {
    expect(() =>
      parseEvidenceUploadInput({
        purchaseIntentId: INTENT,
        clientCorrelationNonce: NONCE,
        [key]: 'x',
      }),
    ).toThrowError(M7EvidenceUploadInputError);
  });

  it('rejects a symbol key, a missing field, a non-object, an array and a class instance', () => {
    expect(() =>
      parseEvidenceUploadInput({
        purchaseIntentId: INTENT,
        clientCorrelationNonce: NONCE,
        [Symbol('x')]: 1,
      }),
    ).toThrowError(M7EvidenceUploadInputError);
    expect(() => parseEvidenceUploadInput({ purchaseIntentId: INTENT })).toThrowError(
      /clientCorrelationNonce/,
    );
    expect(() => parseEvidenceUploadInput({ clientCorrelationNonce: NONCE })).toThrowError(
      /purchaseIntentId/,
    );
    for (const bad of [null, undefined, 'x', 1, [INTENT, NONCE], new Date()]) {
      expect(() => parseEvidenceUploadInput(bad)).toThrowError(M7EvidenceUploadInputError);
    }
  });
});

describe('SO-2 grammar — field lexical rules', () => {
  it.each(['', 'not-a-uuid', `${INTENT}x`, INTENT.replace(/-/g, ''), 42])(
    'rejects malformed purchaseIntentId %s',
    (purchaseIntentId) => {
      expect(() =>
        parseEvidenceUploadInput({ purchaseIntentId, clientCorrelationNonce: NONCE }),
      ).toThrowError(/purchaseIntentId/);
    },
  );

  it('accepts nonces of exactly 22 and exactly 128 characters of [A-Za-z0-9_-]', () => {
    for (const nonce of ['a'.repeat(22), 'Z9_-'.repeat(32), 'A-b_C-d_E-f_G-h_I-j_K-']) {
      expect(
        parseEvidenceUploadInput({ purchaseIntentId: INTENT, clientCorrelationNonce: nonce }),
      ).toBeTruthy();
    }
  });

  it.each([
    ['21 characters', 'a'.repeat(21)],
    ['129 characters', 'a'.repeat(129)],
    ['a space', `${'a'.repeat(21)} `],
    ['a dot', `${'a'.repeat(21)}.`],
    ['a slash', `${'a'.repeat(21)}/`],
    ['non-ASCII', `${'a'.repeat(21)}é`],
    ['a number', 1234567890123456],
  ])('rejects a nonce with %s', (_label, clientCorrelationNonce) => {
    expect(() =>
      parseEvidenceUploadInput({ purchaseIntentId: INTENT, clientCorrelationNonce }),
    ).toThrowError(/clientCorrelationNonce/);
  });
});

describe('SO-2 AUTH §7 — the entropy claim is NOT made by the parser', () => {
  it('declares lexical enforcement only, and client CSPRNG generation as DEFERRED', () => {
    expect(NONCE_ENTROPY_STATUS).toEqual({
      lexicalContract: '^[A-Za-z0-9_-]{22,128}$',
      lexicalContractEnforced: true,
      entropyProvableByParser: false,
      clientCsprngGeneration: 'DEFERRED_TO_BUSINESS_CLIENT_COMPOSITION_BOUNDARY',
    });
  });

  it('a lexically valid but obviously low-entropy nonce is ACCEPTED — honestly, no fake check', () => {
    // 22 identical characters carry ~0 bits of entropy. The parser cannot know that, and must not
    // pretend to: entropy is a property of generation, not of the string.
    expect(
      parseEvidenceUploadInput({
        purchaseIntentId: INTENT,
        clientCorrelationNonce: 'a'.repeat(22),
      }),
    ).toEqual({ purchaseIntentId: INTENT, clientCorrelationNonce: 'a'.repeat(22) });
  });
});

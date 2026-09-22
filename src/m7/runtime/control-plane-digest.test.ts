// PagaMenos · the expected control-plane manifest digest (V1.1 §23.6). Offline; no database.
import { afterEach, describe, expect, it } from 'vitest';

import {
  CONTROL_PLANE_BINDING_STATUS,
  M7ControlPlaneUnavailableError,
  M7_CONTROL_PLANE_MANIFEST_SHA256_ENV,
  expectedControlPlaneManifestDigest,
  parseControlPlaneManifestDigest,
} from './control-plane-digest';

// The accepted lexical form, from m7_control_plane_manifest_digest_ck: '^sha256:[0-9a-f]{64}$'.
const VALID = `sha256:${'a'.repeat(64)}`;
const previous = process.env[M7_CONTROL_PLANE_MANIFEST_SHA256_ENV];

afterEach(() => {
  if (previous === undefined) delete process.env[M7_CONTROL_PLANE_MANIFEST_SHA256_ENV];
  else process.env[M7_CONTROL_PLANE_MANIFEST_SHA256_ENV] = previous;
});

describe('§23.6 — fail-closed digest parsing', () => {
  it('accepts exactly the accepted sha256:<64 lowercase hex> form', () => {
    expect(parseControlPlaneManifestDigest(VALID)).toBe(VALID);
    const real = `sha256:${'0123456789abcdef'.repeat(4)}`;
    expect(parseControlPlaneManifestDigest(real)).toBe(real);
  });

  it.each([
    ['absent', undefined],
    ['empty', ''],
    ['unprefixed', 'a'.repeat(64)],
    ['too short', `sha256:${'a'.repeat(63)}`],
    ['too long', `sha256:${'a'.repeat(65)}`],
    ['uppercase', `sha256:${'A'.repeat(64)}`],
    ['non-hex', `sha256:${'a'.repeat(63)}z`],
    ['double prefixed', `sha256:sha256:${'a'.repeat(64)}`],
    ['wrong prefix', `sha512:${'a'.repeat(64)}`],
    ['whitespace padded', ` sha256:${'a'.repeat(64)} `],
  ])('refuses a %s value', (_label, value) => {
    expect(() => parseControlPlaneManifestDigest(value as string | undefined)).toThrowError(
      M7ControlPlaneUnavailableError,
    );
  });

  it('reads the environment, and refuses when it is unset', () => {
    process.env[M7_CONTROL_PLANE_MANIFEST_SHA256_ENV] = VALID;
    expect(expectedControlPlaneManifestDigest()).toBe(VALID);
    delete process.env[M7_CONTROL_PLANE_MANIFEST_SHA256_ENV];
    expect(() => expectedControlPlaneManifestDigest()).toThrowError(M7ControlPlaneUnavailableError);
  });

  it('never caches, so a later refusal cannot be served from an earlier success', () => {
    process.env[M7_CONTROL_PLANE_MANIFEST_SHA256_ENV] = VALID;
    expect(expectedControlPlaneManifestDigest()).toBe(VALID);
    process.env[M7_CONTROL_PLANE_MANIFEST_SHA256_ENV] = 'drifted';
    expect(() => expectedControlPlaneManifestDigest()).toThrowError(M7ControlPlaneUnavailableError);
  });

  it('carries no consent material and no database text in its refusal', () => {
    let message = '';
    try {
      parseControlPlaneManifestDigest(undefined);
    } catch (e) {
      message = (e as Error).message;
    }
    for (const forbidden of ['consent', 'withdraw', 'grant', 'participant', 'prisma', 'SELECT']) {
      expect(message.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
  });
});

describe('§23.6 — the PRE-LC-1 limitation is declared, not hidden', () => {
  it('records the embedded-reviewed-manifest leg as DEFERRED and the binding as INCOMPLETE', () => {
    expect(CONTROL_PLANE_BINDING_STATUS.embeddedReviewedManifest).toBe(
      'DEFERRED_TO_LC_1_NO_REVIEWED_MANIFEST_BYTES_EXIST',
    );
    expect(CONTROL_PLANE_BINDING_STATUS.threeWayBindingComplete).toBe(false);
    expect(CONTROL_PLANE_BINDING_STATUS.ma8Complete).toBe(false);
  });
});

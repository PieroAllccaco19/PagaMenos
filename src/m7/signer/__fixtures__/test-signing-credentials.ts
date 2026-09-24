// ═══════════════════════════════════════════════════════════════════════════════════════════════
// TEST-ONLY SigV4 SIGNING CREDENTIALS (PPC-1)
//
//     TEST ONLY · NOT A PROVIDER CREDENTIAL · AUTHORIZES NOTHING ON ANY OBJECT STORE
//     THE ENDPOINTS ARE UNDER `.invalid` (RFC 2606) AND CANNOT RESOLVE
//
// Builds `M7_CAPABILITY_SIGNER_PROVIDER_CREDENTIALS` registries for the offline and real-PostgreSQL
// PPC-1 suites. Access keys and secrets are either the fixed known-answer values below or random per
// run (so a leak scan can look for an exact, unguessable string).
// ═══════════════════════════════════════════════════════════════════════════════════════════════
import { randomBytes } from 'node:crypto';

export const TEST_SIGNING_CREDENTIAL_KIND =
  'TEST_ONLY_SIGV4_CREDENTIAL__NOT_A_PROVIDER_CREDENTIAL' as const;

export interface TestSigningCredential {
  providerClass: string;
  backendSha256: string;
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  [extra: string]: unknown;
}

/** A random, well-formed TEST credential for `backendSha256`. */
export function randomTestCredential(
  backendSha256: string,
  overrides: Partial<TestSigningCredential> = {},
): TestSigningCredential {
  return {
    providerClass: 'S3_COMPATIBLE',
    backendSha256,
    endpoint: 'https://s3.ppc1-test.invalid',
    region: 'us-test-1',
    bucket: 'ppc1-test-bucket',
    accessKeyId: `AKIATEST${randomBytes(8).toString('hex').toUpperCase()}`,
    secretAccessKey: `TESTSECRET${randomBytes(24).toString('base64url')}`,
    ...overrides,
  };
}

/** The registry JSON for `M7_CAPABILITY_SIGNER_PROVIDER_CREDENTIALS`. */
export function registryJson(entries: Record<string, unknown>): string {
  return JSON.stringify(entries);
}

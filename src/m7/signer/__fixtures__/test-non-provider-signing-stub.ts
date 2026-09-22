// ═══════════════════════════════════════════════════════════════════════════════════════════════
// TEST / NON-PROVIDER SIGNING STUB (signer AUTH §19)
//
//     TEST ONLY · NON-PROVIDER · ITS OUTPUT IS NOT A PROVIDER CAPABILITY · NOT A TOKEN
//     NOT A PRESIGNED URL · AUTHORIZES NOTHING ON ANY OBJECT STORE
//
// Exists ONLY to prove SEQUENCING against real PostgreSQL: a downstream "signing" step may act only on
// an envelope that is ALREADY COMMITTED — observed from a DIFFERENT connection before the stub
// computes anything. Its "signature" is an HMAC-SHA256 under a throwaway random key generated per call
// and discarded, labelled with TEST_NON_PROVIDER_STUB_KIND so it can never be mistaken for, stored as,
// or presented as a provider capability. It lives under __fixtures__, so no productive module can
// import it (capability analyzer X4 forbids every productive importer of the signer anyway).
//
// Physical provider signing — XF-16's real "sign after commit", XC-7 credential routing, T-171c /
// T-171d on a provider — is DEFERRED to the provider integration slice.
import { createHmac, randomBytes } from 'node:crypto';

import { mintCommittedGenerationEnvelope } from '../../../db/m7-capability-signer';
import type { M7CommittedGenerationEnvelope } from '../../runtime/capability-signer-contract';

export const TEST_NON_PROVIDER_STUB_KIND =
  'TEST_NON_PROVIDER_SIGNING_STUB__NOT_A_PROVIDER_CAPABILITY' as const;

export interface TestNonProviderStubOutput {
  readonly kind: typeof TEST_NON_PROVIDER_STUB_KIND;
  readonly envelope: M7CommittedGenerationEnvelope;
  /** The committed mint row was observed from another connection BEFORE the stub computed anything. */
  readonly committedObservedBeforeStub: true;
  /** HMAC under a discarded random key. Meaningless outside this test; authorizes nothing. */
  readonly testOnlyMac: string;
}

export async function testNonProviderSignAfterCommit(
  generationGrantId: string,
  observeCommittedMint: (envelope: M7CommittedGenerationEnvelope) => Promise<boolean>,
): Promise<TestNonProviderStubOutput> {
  const envelope = await mintCommittedGenerationEnvelope(generationGrantId);
  if (!(await observeCommittedMint(envelope))) {
    throw new Error('TEST STUB: the envelope is not observable as committed; nothing is signed');
  }
  const testOnlyMac = createHmac('sha256', randomBytes(32))
    .update(TEST_NON_PROVIDER_STUB_KIND)
    .update(JSON.stringify(envelope))
    .digest('hex');
  return Object.freeze({
    kind: TEST_NON_PROVIDER_STUB_KIND,
    envelope,
    committedObservedBeforeStub: true as const,
    testOnlyMac,
  });
}

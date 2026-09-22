// PagaMenos · src/m7/so2 — SO-2 fixed trusted executor (CCA §14–§20).
//
// Its ENTIRE dependency closure is type-only: the SO-2 input/result contract, the CCA
// `LockedCollectionScope` contract, and its ONE adapter interface. It holds no Prisma, no client, no
// repository, no SQL, no transaction, no service locator, no registry, no policy selector and no
// control-plane material, and it is reachable only from its own leaf.
//
// What it does is deliberately the whole of SO-2's application logic: forward exactly the two §9.3
// caller fields (RQ) to the single modeled adapter operation. It adds no timestamp, no participant,
// no assignment, no session material and no storage fact — those belong to the engine, the adapter
// and the database.
import type { LockedCollectionScope } from '@/cca/locked-scope';
import type {
  M7EvidenceUploadAuthorization,
  M7EvidenceUploadInput,
} from '@/m7/so2/evidence-upload-input';

import type { M7EvidenceUploadAdapter } from './m7-evidence-upload.cca-adapter-interface';

export async function m7EvidenceUploadExecutor(
  input: Readonly<M7EvidenceUploadInput>,
  _scope: LockedCollectionScope,
  adapter: M7EvidenceUploadAdapter,
): Promise<M7EvidenceUploadAuthorization> {
  return adapter.executeEvidenceUploadAuthorization({
    purchaseIntentId: input.purchaseIntentId,
    clientCorrelationNonce: input.clientCorrelationNonce,
  });
}

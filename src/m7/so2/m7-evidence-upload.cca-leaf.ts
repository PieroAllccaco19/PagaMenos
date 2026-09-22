// PagaMenos · src/m7/so2 — SO-2 sealed operation leaf: beginAuthorizedEvidenceUpload (V1.1 §9.2).
//
// Exactly ONE module-scope definition binding: the operation identity, the FIXED SavingEvidence
// upload policy (OPTIONAL_EVIDENCE — A1 §8.8 general authorization, then AGR), the §9.3 SO-2 input
// grammar, the canonical lock order, the SO-2 tracked-adapter implementation and the ONE fixed SO-2
// executor. A business caller receives only `execute(trustedParticipantContext, input)`; it cannot
// choose a policy, an executor, an adapter or a purpose, and it cannot switch this family into SO-1.
//
// LEAF DIRECT DB CAPABILITY = NONE. This module imports no database client, no repository, no raw
// query facility, no session secret and nothing of SO-1; its only `src/db` edge is the private M7
// participant CCA engine. SO-2 has NO pre-CCA replay (§9.5.2): an exact retry enters CCA, is
// re-evaluated against CURRENT consent, and only then returns the existing intent.
//
// NOT PUBLICLY WIRED (AUTH §16, §35). This is an INTERNAL pre-LC-1 path: no Next.js route, no API
// route, no UI, no client hook and no `@/services` barrel export composes it, and its result is not
// a participant-facing response. It ends at a committed upload intent: it performs no object-store
// PUT and issues no signed URL (§11.4 — that is the later M7 business/storage layer).
import { defineSealedEvidenceUploadOperation } from '@/db/m7-participant-cca-engine';
import { parseEvidenceUploadInput } from '@/m7/so2/evidence-upload-input';

import {
  m7EvidenceUploadAdapter,
  m7EvidenceUploadLockOrder,
} from './m7-evidence-upload.cca-adapter';
import { m7EvidenceUploadExecutor } from './m7-evidence-upload.cca-executor';

export const beginAuthorizedEvidenceUpload = defineSealedEvidenceUploadOperation({
  operationId: 'm7.so2.begin-authorized-evidence-upload',
  policy: 'OPTIONAL_EVIDENCE',
  parseInput: parseEvidenceUploadInput,
  lockOrder: m7EvidenceUploadLockOrder,
  adapter: m7EvidenceUploadAdapter,
  executor: m7EvidenceUploadExecutor,
});

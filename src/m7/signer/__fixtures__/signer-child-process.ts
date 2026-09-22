// ═══════════════════════════════════════════════════════════════════════════════════════════════
// M7 SIGNER — TEST-ONLY CHILD-PROCESS HARNESS (signer AUTH §20)
//
//     TEST INFRASTRUCTURE ONLY · NOT A DEPLOYABLE PROCESS · NOT THE SIGNER'S PRODUCTION PROCESS
//     DOES NOT CLOSE IMP-20 · NO PROVIDER CREDENTIAL · NO PROVIDER SIGNING
//
// Runs the productive signer module in a SEPARATE Node process whose environment the parent test
// builds from scratch: the signer database credential and the expected control-plane digest, and no
// other application or M7 database credential. It proves only that the module can execute
// independently with that environment. The final signer process / deployment unit and the final
// credential topology (IMP-20, XC-5, XC-7, MA-15) are DEFERRED.
//
// Protocol: prints `READY <pid> <json env census>`, reads ONE generation grant id from stdin, mints,
// prints one JSON line and exits 0 (or prints `{"error": …}` and exits 1).
import { createInterface } from 'node:readline';

import { mintCommittedGenerationEnvelope } from '../../../db/m7-capability-signer';

const CENSUS_KEYS = [
  'DATABASE_URL',
  'M7_PARTICIPANT_DATABASE_URL',
  'M7_SESSION_ISSUER_DATABASE_URL',
  'M7_PRIVACY_REQUEST_DATABASE_URL',
  'M7_STORAGE_WORKER_DATABASE_URL',
  'M7_DELETION_AUTHORITY_DATABASE_URL',
  'M7_CAPABILITY_SIGNER_DATABASE_URL',
  'M7_CONTROL_PLANE_MANIFEST_SHA256',
] as const;

const census = Object.fromEntries(
  CENSUS_KEYS.map((k) => [k, process.env[k] !== undefined && process.env[k] !== '']),
);
process.stdout.write(`READY ${process.pid} ${JSON.stringify(census)}\n`);

const rl = createInterface({ input: process.stdin });
rl.once('line', (line) => {
  rl.close();
  mintCommittedGenerationEnvelope(line.trim())
    .then((envelope) => {
      process.stdout.write(`${JSON.stringify({ pid: process.pid, envelope })}\n`);
      process.exit(0);
    })
    .catch((e: unknown) => {
      const err = e as { name?: string; reason?: string; sqlState?: string; code?: string };
      process.stdout.write(
        `${JSON.stringify({ pid: process.pid, error: { name: err.name, reason: err.reason, sqlState: err.sqlState, code: err.code } })}\n`,
      );
      process.exit(1);
    });
});

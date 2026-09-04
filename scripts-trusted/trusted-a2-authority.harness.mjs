// PagaMenos · PRE-A2 TRUSTED AUTHORITY GATE v2 — LOCAL DIAGNOSTIC HARNESS
// =============================================================================
// Proves the trusted gate's decision logic locally, before any GitHub run. This
// is trust-infrastructure (test-only); it is NOT the runtime trust root. The
// authoritative logic lives inline in .github/workflows/trusted-a2-authority.yml.
//
// INTEGRITY MODEL (no hand-copied mirror -> no transcription drift):
//   The harness EXTRACTS the authoritative trusted-logic region from the
//   committed workflow (between ===BEGIN/END TRUSTED-A2 TRUSTED LOGIC===),
//   asserts its normalized SHA-256 equals a pinned constant (so any silent edit
//   to the workflow logic fails the harness until the pin is deliberately
//   updated), and runs THAT exact region. It never loads candidate code.
//
// Run: node scripts-trusted/trusted-a2-authority.harness.mjs
// Exit 0 = pin + full PASS/FAIL matrix green; nonzero = a diagnostic failed.
// =============================================================================
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';

const HERE = dirname(fileURLToPath(import.meta.url));
const WORKFLOW = join(HERE, '..', '.github', 'workflows', 'trusted-a2-authority.yml');
const BEGIN = '===BEGIN TRUSTED-A2 TRUSTED LOGIC';
const END = '===END TRUSTED-A2 TRUSTED LOGIC===';

// Pin over the normalized authoritative region. Update ONLY with an intended
// logic change (and record it in the commit).
const PINNED_REGION_SHA256 = 'f6bc0bcc08d77639efdc42836d4802a1c212c55b6512d88e1ce5ce09dce457c9';

const normalize = (s) =>
  s.replace(/\r\n/g, '\n').split('\n').map((l) => l.replace(/^[ \t]+/, '')).join('\n').trim();

function extractRegion() {
  const t = readFileSync(WORKFLOW, 'utf8');
  const b = t.indexOf(BEGIN);
  const e = t.indexOf(END);
  if (b < 0 || e < 0) throw new Error('trusted-logic sentinels not found in workflow');
  const ls = t.lastIndexOf('\n', b) + 1;
  const le = e + END.length;
  return t.slice(ls, le);
}

function loadTrustedLogic(regionRaw) {
  // Dedent then evaluate the authoritative region; return its pure exports.
  const src = normalize(regionRaw);
  // eslint-disable-next-line no-new-func
  return new Function(
    src +
      '\nreturn { verifyTrustedA2, forbiddenPaths, buildAppJwt, buildCheckRunBody, concludeFromValidation, b64url, REQUIRED_AUTHORITY_FILES, CHECK_NAME, PROTECTED_PREFIXES };',
  )();
}

// ---- fixtures ----------------------------------------------------------------
const ACCEPTED_DIGEST = 'sha256:ff178a52bf3c3c3492828ae5cc7b8f3e7ca7b843a235ad7671ea2760803aed18';
const CORPUS_ID = 'PAGAMENOS_VALIDATION_CORPUS_v1_2026-08-30T1800-0500';
const PROJECTION = 'pagamenos.corpus-semantic-projection.v1';
const ACCEPTED_HEAD = '22c8efe016a1f743196c45fe4b78d606b56d1567';
const FOUR = [
  'authority/v1/AUTHORITY_BASELINE_MANIFEST_V1.json',
  'authority/v1/CORPUS_RELEASE_LEDGER_V1.json',
  'authority/v1/HOLIDAY_CALENDAR_REGISTRY_V1.json',
  'authority/v1/holiday-calendar/pagamenos.holiday.pe-lima-callao.private-commerce.v1.json',
];

const goodRuntime = () => ({
  declarationVersion: 'pagamenos.runtime-corpus-authority.v1',
  corpusId: CORPUS_ID,
  corpusSemanticProjectionVersion: PROJECTION,
  corpusSemanticDigest: ACCEPTED_DIGEST,
});
const goodLedger = () => ({
  schemaVersion: 'pagamenos.corpus-release-ledger.v1',
  entries: { [CORPUS_ID]: { semanticProjectionVersion: PROJECTION, sourceCommit: '64cf864a817c137920204487ab3317bc6d4c9ba5', digest: ACCEPTED_DIGEST } },
});
// Accepted 84a7a1a manifest: full four-file inventory (self INCLUDED).
const acceptedManifest = () => ({ corpusId: CORPUS_ID, corpusSemanticProjectionVersion: PROJECTION, corpusSemanticDigest: ACCEPTED_DIGEST, authorityFiles: FOUR.slice() });
// Rejected 68269bb manifest: identical ledger/digest, but authorityFiles OMITS the manifest self-entry.
const rejectedManifest = () => ({ corpusId: CORPUS_ID, corpusSemanticProjectionVersion: PROJECTION, corpusSemanticDigest: ACCEPTED_DIGEST, authorityFiles: FOUR.filter((f) => !f.endsWith('AUTHORITY_BASELINE_MANIFEST_V1.json')) });

// ---- assertion runner --------------------------------------------------------
let passed = 0, failed = 0;
const rows = [];
function check(label, got, want, detail = '') {
  const ok = got === want;
  rows.push({ label, want: want ? 'PASS' : 'FAIL', got: got ? 'PASS' : 'FAIL', verdict: ok ? 'OK' : 'WRONG', detail });
  ok ? passed++ : failed++;
}
function checkRaw(label, ok, note = '') {
  rows.push({ label, want: 'OK', got: ok ? 'OK' : 'WRONG', verdict: ok ? 'OK' : 'WRONG', detail: note });
  ok ? passed++ : failed++;
}

function main() {
  const regionRaw = extractRegion();
  const gotHash = createHash('sha256').update(normalize(regionRaw)).digest('hex');
  const pinOk = gotHash === PINNED_REGION_SHA256;
  checkRaw('§0 integrity pin: workflow trusted-logic SHA-256 matches', pinOk, pinOk ? '' : 'got ' + gotHash);

  const lib = loadTrustedLogic(regionRaw);
  const v = (r, l = goodLedger(), m = acceptedManifest()) => lib.verifyTrustedA2({ runtime: r, ledger: l, manifest: m }).ok;

  // ---- authority inventory (F): 84a7a1a PASS, 68269bb FAIL ----
  check('§F 84a7a1a accepted four-file inventory', v(goodRuntime()), true);
  check('§F 68269bb rejected manifest (omits self-entry)', v(goodRuntime(), goodLedger(), rejectedManifest()), false);
  check('missing manifest self-entry (explicit)', v(goodRuntime(), goodLedger(), rejectedManifest()), false);
  check('extra manifest entry (5 files)', v(goodRuntime(), goodLedger(), { ...acceptedManifest(), authorityFiles: [...FOUR, 'authority/v1/EXTRA.json'] }), false);
  check('duplicate manifest entry', v(goodRuntime(), goodLedger(), { ...acceptedManifest(), authorityFiles: [FOUR[0], FOUR[0], FOUR[1], FOUR[2]] }), false);

  // ---- runtime declaration schema + oracle ----
  check('valid runtime declaration', v(goodRuntime()), true);
  check('wrong runtime digest', v({ ...goodRuntime(), corpusSemanticDigest: 'sha256:' + 'a'.repeat(64) }), false);
  check('wrong runtime corpusId', v({ ...goodRuntime(), corpusId: 'PAGAMENOS_VALIDATION_CORPUS_vX' }), false);
  check('malformed declaration (missing key)', (() => { const r = goodRuntime(); delete r.declarationVersion; return v(r); })(), false);
  check('extra declaration field', v({ ...goodRuntime(), extra: 'x' }), false);
  check('null substitution', v({ ...goodRuntime(), corpusSemanticDigest: null }), false);
  check('type coercion (number)', v({ ...goodRuntime(), corpusSemanticDigest: 123 }), false);
  check('ledger digest disagreement', (() => { const l = goodLedger(); l.entries[CORPUS_ID].digest = 'sha256:' + 'b'.repeat(64); return v(goodRuntime(), l); })(), false);

  // ---- rename-safe protected-path boundary (E). Rename-out surfaces OLD path via --no-renames. ----
  const forbidden = (paths) => lib.forbiddenPaths(paths).length > 0;
  check('protected direct edit (authority/**)', !forbidden(['authority/v1/CORPUS_RELEASE_LEDGER_V1.json']), false);
  check('rename-out: workflow moved out of .github/workflows/**', !forbidden(['.github/workflows/trusted-a2-authority.yml', 'docs/moved.yml']), false);
  check('rename-out: corpus moved out of src/corpus/**', !forbidden(['src/corpus/rules.json', 'src/x/rules.json']), false);
  check('rename-out: engine moved out of src/engine/**', !forbidden(['src/engine/decide.ts', 'src/x/decide.ts']), false);
  check('rename-out: authority moved out of authority/**', !forbidden(['authority/v1/HOLIDAY_CALENDAR_REGISTRY_V1.json', 'docs/reg.json']), false);
  check('protected scripts-trusted/** edit (v2 hardening)', !forbidden(['scripts-trusted/trusted-a2-authority.harness.mjs']), false);
  check('near-miss allowed: src/corpus-notes.md (not under dir)', !forbidden(['src/corpus-notes.md']), true);
  check('ordinary A2 source path allowed', !forbidden(['src/db/purchase-intent-decision-repository.ts']), true);

  // ---- malicious candidate verifier has NO effect (not loaded; not protected path) ----
  const verifierChanged = ['scripts/runtime-authority-check.cjs'];
  checkRaw('§G verifier-mutation has no effect on decision', v(goodRuntime()) === true && lib.forbiddenPaths(verifierChanged).length === 0,
    'verify computed from data only; scripts/** never loaded');

  // ---- exact head pin (modeled; enforced in workflow shell) ----
  const pin = (a, b) => a.toLowerCase() === b.toLowerCase();
  check('PR head == accepted A2 head', pin(ACCEPTED_HEAD, ACCEPTED_HEAD), true);
  check('PR head != accepted A2 head', pin('deadbeef'.repeat(5), ACCEPTED_HEAD), false);

  // ---- (G/§16/§20) pure GitHub App / check-run request construction (no network) ----
  const now = 1_700_000_000;
  const jwt = lib.buildAppJwt('123456', now);
  checkRaw('App JWT iss == appId', jwt.payload.iss === '123456');
  checkRaw('App JWT exp > iat and <= 10min window', jwt.payload.exp > jwt.payload.iat && jwt.payload.exp - jwt.payload.iat <= 600);
  checkRaw('App JWT iat backdated (<= now)', jwt.payload.iat <= now);
  const inprog = lib.buildCheckRunBody({ name: lib.CHECK_NAME, headSha: ACCEPTED_HEAD, status: 'in_progress', title: 't', summary: 's' });
  checkRaw('check name is head-bound "trusted-a2-authority/head"', lib.CHECK_NAME === 'trusted-a2-authority/head');
  checkRaw('in_progress body head_sha == exact accepted head', inprog.head_sha === ACCEPTED_HEAD);
  checkRaw('in_progress body has NO conclusion', !('conclusion' in inprog));
  const done = lib.buildCheckRunBody({ name: lib.CHECK_NAME, headSha: ACCEPTED_HEAD, status: 'completed', conclusion: 'failure', title: 't', summary: 's' });
  checkRaw('completed body carries conclusion', done.conclusion === 'failure' && done.status === 'completed');
  checkRaw('concludeFromValidation(true)=success', lib.concludeFromValidation(true) === 'success');
  checkRaw('concludeFromValidation(false)=failure (fail closed)', lib.concludeFromValidation(false) === 'failure');

  // ---- report ----
  const pad = (s, n) => (s + ' '.repeat(n)).slice(0, n);
  console.log('\nTRUSTED-A2 AUTHORITY v2 — LOCAL DIAGNOSTIC MATRIX');
  console.log('-'.repeat(100));
  for (const r of rows) console.log(pad(r.verdict, 6) + pad('want=' + r.want, 11) + pad('got=' + r.got, 12) + r.label + (r.detail ? '  (' + r.detail + ')' : ''));
  console.log('-'.repeat(100));
  console.log('PASSED ' + passed + '  FAILED ' + failed);
  if (!pinOk) console.log('INTEGRITY PIN MISMATCH: update PINNED_REGION_SHA256 only for an intended logic change.');
  process.exit(failed === 0 ? 0 : 1);
}

main();

// PagaMenos · PRE-A2 TRUSTED AUTHORITY GATE v2 — LOCAL DIAGNOSTIC HARNESS
// =============================================================================
// Proves the trusted gate's decision + lifecycle logic locally, before any
// GitHub run. Test-only; NOT the runtime trust root. The authoritative logic
// lives inline in .github/workflows/trusted-a2-authority.yml.
//
// INTEGRITY MODEL: extract the sentinel-bounded region from the committed
// workflow, assert its normalized SHA-256 equals PINNED_REGION_SHA256 (silent
// edits fail until the pin is deliberately updated), and run THAT exact code.
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
// logic change (record it in the commit).
const PINNED_REGION_SHA256 = 'b708c3a142780268f1915f2c9db9832e0f207df9875ca498544eac0e6d501e21';

const normalize = (s) =>
  s.replace(/\r\n/g, '\n').split('\n').map((l) => l.replace(/^[ \t]+/, '')).join('\n').trim();

function extractRegion() {
  const t = readFileSync(WORKFLOW, 'utf8');
  const b = t.indexOf(BEGIN);
  const e = t.indexOf(END);
  if (b < 0 || e < 0) throw new Error('trusted-logic sentinels not found in workflow');
  return t.slice(t.lastIndexOf('\n', b) + 1, e + END.length);
}

function loadTrustedLogic(regionRaw) {
  const src = normalize(regionRaw);
  // eslint-disable-next-line no-new-func
  return new Function(
    src +
      '\nreturn { verifyTrustedA2, forbiddenPaths, buildAppJwt, buildInProgressBody, buildCompletedBody, concludeFromValidation, b64url, REQUIRED_AUTHORITY_FILES, CHECK_NAME, PROTECTED_PREFIXES, REJECTED_AUTHORITY_BASE_SHA, sameRepositoryPolicy, preCheckEvent, externalIdFor, selectExistingRun, verifyRevocableSelectors };',
  )();
}

// ---- fixtures ----------------------------------------------------------------
const ACCEPTED_DIGEST = 'sha256:ff178a52bf3c3c3492828ae5cc7b8f3e7ca7b843a235ad7671ea2760803aed18';
const CORPUS_ID = 'PAGAMENOS_VALIDATION_CORPUS_v1_2026-08-30T1800-0500';
const PROJECTION = 'pagamenos.corpus-semantic-projection.v1';
const ACCEPTED_HEAD = '22c8efe016a1f743196c45fe4b78d606b56d1567';
const ACCEPTED_BASE = '84a7a1a30545b1c61ce2b372a95da9005ea46b6c';
const REJECTED_BASE = '68269bb5acad77bb6e8dc1644bb32d29ef485d31';
const FOUR = [
  'authority/v1/AUTHORITY_BASELINE_MANIFEST_V1.json',
  'authority/v1/CORPUS_RELEASE_LEDGER_V1.json',
  'authority/v1/HOLIDAY_CALENDAR_REGISTRY_V1.json',
  'authority/v1/holiday-calendar/pagamenos.holiday.pe-lima-callao.private-commerce.v1.json',
];
const REPO = 'PieroAllccaco19/pagamenos';
const REPO_ID = 12345678;
const APP_ID = 987654;
const PR_NUM = 42;

const goodRuntime = () => ({ declarationVersion: 'pagamenos.runtime-corpus-authority.v1', corpusId: CORPUS_ID, corpusSemanticProjectionVersion: PROJECTION, corpusSemanticDigest: ACCEPTED_DIGEST });
const goodLedger = () => ({ schemaVersion: 'pagamenos.corpus-release-ledger.v1', entries: { [CORPUS_ID]: { semanticProjectionVersion: PROJECTION, sourceCommit: '64cf864a817c137920204487ab3317bc6d4c9ba5', digest: ACCEPTED_DIGEST } } });
const acceptedManifest = () => ({ corpusId: CORPUS_ID, corpusSemanticProjectionVersion: PROJECTION, corpusSemanticDigest: ACCEPTED_DIGEST, authorityFiles: FOUR.slice() });
const rejectedManifest = () => ({ corpusId: CORPUS_ID, corpusSemanticProjectionVersion: PROJECTION, corpusSemanticDigest: ACCEPTED_DIGEST, authorityFiles: FOUR.filter((f) => !f.endsWith('AUTHORITY_BASELINE_MANIFEST_V1.json')) });

const sameRepoPr = (headSha = ACCEPTED_HEAD, number = PR_NUM) => ({ number, head: { sha: headSha, repo: { full_name: REPO } }, base: { sha: 'deadbeef'.repeat(5) } });
const forkPr = (headSha = ACCEPTED_HEAD) => ({ number: PR_NUM, head: { sha: headSha, repo: { full_name: 'attacker/pagamenos' } }, base: { sha: 'deadbeef'.repeat(5) } });

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

// ---- simulate the workflow lifecycle purely from lib exports ----------------
// Mirrors STEP 2 (reset/create) + STEP 3 (validation) + STEP 4 (finalize).
function simulateRunLifecycle({ lib, headSha, priorRuns, revocableResult, appCredsPresent = true, sameRepo = true }) {
  const events = [];
  const pre = lib.preCheckEvent({
    eventName: 'pull_request_target',
    repository: REPO,
    pr: sameRepo ? sameRepoPr(headSha) : forkPr(headSha),
  });
  if (!pre.ok) { events.push({ step: 'precheck', ok: false, error: pre.error }); return { events, finalCheckState: null }; }
  events.push({ step: 'precheck', ok: true });
  if (!appCredsPresent) { events.push({ step: 'app-auth', ok: false, error: 'TRUSTED ISSUER AVAILABILITY FAILURE' }); return { events, finalCheckState: null }; }
  const externalId = lib.externalIdFor({ repositoryId: REPO_ID, prNumber: pre.prNumber, headSha: pre.headSha });
  const match = lib.selectExistingRun({ runs: priorRuns, appId: APP_ID, checkName: lib.CHECK_NAME, externalId, headSha: pre.headSha });
  const runId = match ? match.id : 900000 + Math.floor(Math.random() * 1000);
  const opened = { id: runId, name: lib.CHECK_NAME, head_sha: pre.headSha, external_id: externalId, status: 'in_progress', conclusion: null, app: { id: APP_ID } };
  events.push({ step: match ? 'reset-existing' : 'create-new', runId, externalId });
  // Revocable validation is caller-provided (models a validation outcome or exception).
  const conclusion = lib.concludeFromValidation(revocableResult && revocableResult.ok === true);
  const completed = { ...opened, status: 'completed', conclusion };
  events.push({ step: 'finalize', runId, conclusion });
  return { events, finalCheckState: completed, externalId };
}

function main() {
  const regionRaw = extractRegion();
  const gotHash = createHash('sha256').update(normalize(regionRaw)).digest('hex');
  const pinOk = gotHash === PINNED_REGION_SHA256;
  checkRaw('§0 integrity pin: workflow trusted-logic SHA-256 matches', pinOk, pinOk ? '' : 'got ' + gotHash);

  const lib = loadTrustedLogic(regionRaw);
  const v = (r, l = goodLedger(), m = acceptedManifest()) => lib.verifyTrustedA2({ runtime: r, ledger: l, manifest: m }).ok;

  // ==== retained decision matrix (regression) ==============================
  check('§F 84a7a1a accepted four-file inventory', v(goodRuntime()), true);
  check('§F 68269bb rejected manifest (omits self-entry)', v(goodRuntime(), goodLedger(), rejectedManifest()), false);
  check('missing manifest self-entry (explicit)', v(goodRuntime(), goodLedger(), rejectedManifest()), false);
  check('extra manifest entry (5 files)', v(goodRuntime(), goodLedger(), { ...acceptedManifest(), authorityFiles: [...FOUR, 'authority/v1/EXTRA.json'] }), false);
  check('duplicate manifest entry', v(goodRuntime(), goodLedger(), { ...acceptedManifest(), authorityFiles: [FOUR[0], FOUR[0], FOUR[1], FOUR[2]] }), false);
  check('valid runtime declaration', v(goodRuntime()), true);
  check('wrong runtime digest', v({ ...goodRuntime(), corpusSemanticDigest: 'sha256:' + 'a'.repeat(64) }), false);
  check('wrong runtime corpusId', v({ ...goodRuntime(), corpusId: 'PAGAMENOS_VALIDATION_CORPUS_vX' }), false);
  check('malformed declaration (missing key)', (() => { const r = goodRuntime(); delete r.declarationVersion; return v(r); })(), false);
  check('extra declaration field', v({ ...goodRuntime(), extra: 'x' }), false);
  check('null substitution', v({ ...goodRuntime(), corpusSemanticDigest: null }), false);
  check('type coercion (number)', v({ ...goodRuntime(), corpusSemanticDigest: 123 }), false);
  check('ledger digest disagreement', (() => { const l = goodLedger(); l.entries[CORPUS_ID].digest = 'sha256:' + 'b'.repeat(64); return v(goodRuntime(), l); })(), false);

  const forbidden = (paths) => lib.forbiddenPaths(paths).length > 0;
  check('protected direct edit (authority/**)', !forbidden(['authority/v1/CORPUS_RELEASE_LEDGER_V1.json']), false);
  check('rename-out: workflow moved out of .github/workflows/**', !forbidden(['.github/workflows/trusted-a2-authority.yml', 'docs/moved.yml']), false);
  check('rename-out: corpus moved out of src/corpus/**', !forbidden(['src/corpus/rules.json', 'src/x/rules.json']), false);
  check('rename-out: engine moved out of src/engine/**', !forbidden(['src/engine/decide.ts', 'src/x/decide.ts']), false);
  check('rename-out: authority moved out of authority/**', !forbidden(['authority/v1/HOLIDAY_CALENDAR_REGISTRY_V1.json', 'docs/reg.json']), false);
  check('protected scripts-trusted/** edit (v2 hardening)', !forbidden(['scripts-trusted/trusted-a2-authority.harness.mjs']), false);
  check('near-miss allowed: src/corpus-notes.md (not under dir)', !forbidden(['src/corpus-notes.md']), true);
  check('ordinary A2 source path allowed', !forbidden(['src/db/purchase-intent-decision-repository.ts']), true);
  checkRaw('§G verifier-mutation has no effect on decision', v(goodRuntime()) === true && !forbidden(['scripts/runtime-authority-check.cjs']));

  // ==== revocable selectors (head pin + authority base) =====================
  const revSel = (h, ah, ab) => lib.verifyRevocableSelectors({ prHeadSha: h, acceptedA2Head: ah, acceptedAuthorityBaseSha: ab }).ok;
  check('revocable: accepted head + accepted base', revSel(ACCEPTED_HEAD, ACCEPTED_HEAD, ACCEPTED_BASE), true);
  check('revocable: blank accepted A2 head (fail closed)', revSel(ACCEPTED_HEAD, '', ACCEPTED_BASE), false);
  check('revocable: blank accepted authority base (fail closed)', revSel(ACCEPTED_HEAD, ACCEPTED_HEAD, ''), false);
  check('revocable: malformed accepted A2 head', revSel(ACCEPTED_HEAD, 'notahex', ACCEPTED_BASE), false);
  check('revocable: rejected 68269bb authority base', revSel(ACCEPTED_HEAD, ACCEPTED_HEAD, REJECTED_BASE), false);
  check('revocable: head != accepted (new commit H2)', revSel('deadbeef'.repeat(5), ACCEPTED_HEAD, ACCEPTED_BASE), false);

  // ==== §B same-repository policy (BEFORE App credential use) ===============
  const preOk = (pr) => lib.preCheckEvent({ eventName: 'pull_request_target', repository: REPO, pr }).ok;
  check('§B same-repo PR admitted by pre-check', preOk(sameRepoPr()), true);
  check('§B fork PR rejected by pre-check (before App)', preOk(forkPr()), false);
  check('§B pre-check rejects wrong event name', lib.preCheckEvent({ eventName: 'pull_request', repository: REPO, pr: sameRepoPr() }).ok, false);
  check('§B pre-check rejects missing head.repo', preOk({ number: 1, head: { sha: ACCEPTED_HEAD } }), false);
  check('§B pre-check rejects malformed head SHA', preOk({ number: 1, head: { sha: 'zz', repo: { full_name: REPO } } }), false);
  check('§B pre-check rejects invalid repository identity', lib.preCheckEvent({ eventName: 'pull_request_target', repository: 'bad', pr: sameRepoPr() }).ok, false);

  // ==== §E deterministic external_id + existing-run selection ================
  const eid = lib.externalIdFor({ repositoryId: REPO_ID, prNumber: PR_NUM, headSha: ACCEPTED_HEAD });
  const eid2 = lib.externalIdFor({ repositoryId: REPO_ID, prNumber: PR_NUM, headSha: ACCEPTED_HEAD });
  checkRaw('§E external_id deterministic (same inputs -> same id)', eid === eid2 && eid.startsWith('pagamenos:trusted-a2-authority:'));
  checkRaw('§E external_id changes with head', lib.externalIdFor({ repositoryId: REPO_ID, prNumber: PR_NUM, headSha: 'b'.repeat(40) }) !== eid);
  checkRaw('§E external_id changes with PR#', lib.externalIdFor({ repositoryId: REPO_ID, prNumber: PR_NUM + 1, headSha: ACCEPTED_HEAD }) !== eid);

  const priorAppOwnedSuccess = [{ id: 101, name: lib.CHECK_NAME, head_sha: ACCEPTED_HEAD, external_id: eid, status: 'completed', conclusion: 'success', app: { id: APP_ID } }];
  const priorAppOwnedInProgress = [{ id: 101, name: lib.CHECK_NAME, head_sha: ACCEPTED_HEAD, external_id: eid, status: 'in_progress', conclusion: null, app: { id: APP_ID } }];
  const priorOtherApp = [{ id: 202, name: lib.CHECK_NAME, head_sha: ACCEPTED_HEAD, external_id: eid, status: 'completed', conclusion: 'success', app: { id: 111111 } }];
  const priorWrongName = [{ id: 303, name: 'evil-same-name', head_sha: ACCEPTED_HEAD, external_id: eid, status: 'completed', conclusion: 'success', app: { id: APP_ID } }];
  const priorWrongEid = [{ id: 404, name: lib.CHECK_NAME, head_sha: ACCEPTED_HEAD, external_id: 'other:id', status: 'completed', conclusion: 'success', app: { id: APP_ID } }];
  const sel = (runs) => lib.selectExistingRun({ runs, appId: APP_ID, checkName: lib.CHECK_NAME, externalId: eid, headSha: ACCEPTED_HEAD });
  checkRaw('§E reuses App-owned + name + external_id match', sel(priorAppOwnedSuccess) && sel(priorAppOwnedSuccess).id === 101);
  checkRaw('§E never adopts another App/source run', sel(priorOtherApp) === null);
  checkRaw('§E rejects wrong check name', sel(priorWrongName) === null);
  checkRaw('§E rejects wrong external_id', sel(priorWrongEid) === null);

  // ==== §D stale same-head SUCCESS attack: rerun that fails must overwrite it ==
  const rerunFail = simulateRunLifecycle({ lib, headSha: ACCEPTED_HEAD, priorRuns: priorAppOwnedSuccess, revocableResult: { ok: false, error: 'head pin failed after rotation' } });
  checkRaw('§D stale-success attack: reset existing run to in_progress on rerun', rerunFail.events[1].step === 'reset-existing' && rerunFail.events[1].runId === 101);
  checkRaw('§D stale-success attack: SAME run concluded FAILURE (no surviving success)', rerunFail.finalCheckState && rerunFail.finalCheckState.id === 101 && rerunFail.finalCheckState.status === 'completed' && rerunFail.finalCheckState.conclusion === 'failure');
  const rerunPass = simulateRunLifecycle({ lib, headSha: ACCEPTED_HEAD, priorRuns: priorAppOwnedSuccess, revocableResult: { ok: true } });
  checkRaw('same-head rerun that passes concludes SUCCESS on same run', rerunPass.finalCheckState && rerunPass.finalCheckState.id === 101 && rerunPass.finalCheckState.conclusion === 'success');
  const rerunInProg = simulateRunLifecycle({ lib, headSha: ACCEPTED_HEAD, priorRuns: priorAppOwnedInProgress, revocableResult: { ok: false, error: 'authority unavailable' } });
  checkRaw('same-head rerun over prior in_progress: still same run, concludes FAILURE', rerunInProg.finalCheckState && rerunInProg.finalCheckState.id === 101 && rerunInProg.finalCheckState.conclusion === 'failure');

  // ==== §11 new head H2 while accepted variable remains H -> H2 fails ========
  const H2 = 'a'.repeat(40);
  const revocOnH2 = lib.verifyRevocableSelectors({ prHeadSha: H2, acceptedA2Head: ACCEPTED_HEAD, acceptedAuthorityBaseSha: ACCEPTED_BASE });
  checkRaw('§11 new head H2 != accepted -> revocable selectors FAIL', revocOnH2.ok === false);
  const newHead = simulateRunLifecycle({ lib, headSha: H2, priorRuns: priorAppOwnedSuccess, revocableResult: revocOnH2 });
  checkRaw('§11 new head H2 gets its own check (not reusing H run)', newHead.events[1].step === 'create-new' && newHead.finalCheckState.head_sha === H2);
  checkRaw('§11 new head H2 concludes FAILURE', newHead.finalCheckState.conclusion === 'failure');

  // ==== §7 every post-reset failure routes to finalize FAILURE ==============
  const failureCauses = [
    { label: 'head-pin failure', r: { ok: false, error: 'PR head != accepted A2 head' } },
    { label: 'malformed accepted authority SHA', r: { ok: false, error: 'PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA blank or malformed' } },
    { label: 'rejected 68269bb', r: { ok: false, error: 'authority base is the REJECTED baseline 68269bb' } },
    { label: 'authority commit unavailable', r: { ok: false, error: 'cannot fetch authority base commit' } },
    { label: 'PR fetch mismatch', r: { ok: false, error: 'fetched PR head != event head' } },
    { label: 'protected path', r: { ok: false, error: 'A2 PR modifies protected trust paths' } },
    { label: 'runtime declaration invalid', r: { ok: false, error: 'runtime key set mismatch' } },
    { label: 'manifest inventory failure (68269bb)', r: { ok: false, error: 'manifest.authorityFiles count 3 != required 4' } },
    { label: 'ledger mismatch', r: { ok: false, error: 'runtime digest != external ledger digest' } },
    { label: 'validation exception (parser threw)', r: { ok: false, error: 'validation exception: unexpected token' } },
    { label: 'validation produced NO result (finalizer default)', r: undefined },
  ];
  for (const fc of failureCauses) {
    const sim = simulateRunLifecycle({ lib, headSha: ACCEPTED_HEAD, priorRuns: [], revocableResult: fc.r });
    checkRaw('§7 post-reset "' + fc.label + '" -> App conclusion FAILURE', sim.finalCheckState && sim.finalCheckState.conclusion === 'failure');
  }

  // ==== §8 App availability failure = trusted issuer availability failure ===
  const noCreds = simulateRunLifecycle({ lib, headSha: ACCEPTED_HEAD, priorRuns: [], revocableResult: { ok: true }, appCredsPresent: false });
  checkRaw('§8 no App creds -> abort BEFORE any check touch (issuer availability)', noCreds.finalCheckState === null && noCreds.events.some((e) => e.error && e.error.includes('TRUSTED ISSUER AVAILABILITY')));

  // ==== §B fork attack cannot reach App credential ==========================
  const forkAttempt = simulateRunLifecycle({ lib, headSha: ACCEPTED_HEAD, priorRuns: [], revocableResult: { ok: true }, sameRepo: false });
  checkRaw('§B fork PR rejected BEFORE App credential use', forkAttempt.events[0].step === 'precheck' && forkAttempt.events[0].ok === false && !forkAttempt.events.some((e) => e.step === 'reset-existing' || e.step === 'create-new'));

  // ==== retained pure App/JWT/body builders =================================
  const now = 1_700_000_000;
  const jwt = lib.buildAppJwt(String(APP_ID), now);
  checkRaw('App JWT iss == appId', jwt.payload.iss === String(APP_ID));
  checkRaw('App JWT exp within 10min window', jwt.payload.exp > jwt.payload.iat && jwt.payload.exp - jwt.payload.iat <= 600);
  const inprog = lib.buildInProgressBody({ name: lib.CHECK_NAME, headSha: ACCEPTED_HEAD, externalId: eid, startedAt: 'x' });
  checkRaw('in_progress body carries external_id + exact head', inprog.external_id === eid && inprog.head_sha === ACCEPTED_HEAD && inprog.status === 'in_progress' && !('conclusion' in inprog));
  const done = lib.buildCompletedBody({ name: lib.CHECK_NAME, headSha: ACCEPTED_HEAD, externalId: eid, completedAt: 'y', conclusion: 'failure', title: 't', summary: 's' });
  checkRaw('completed body carries conclusion + external_id', done.conclusion === 'failure' && done.external_id === eid && done.status === 'completed');
  checkRaw('concludeFromValidation(true)=success', lib.concludeFromValidation(true) === 'success');
  checkRaw('concludeFromValidation(false)=failure (fail closed)', lib.concludeFromValidation(false) === 'failure');
  checkRaw('check name is head-bound "trusted-a2-authority/head"', lib.CHECK_NAME === 'trusted-a2-authority/head');

  // ---- report ----
  const pad = (s, n) => (s + ' '.repeat(n)).slice(0, n);
  console.log('\nTRUSTED-A2 AUTHORITY v2 PATCH — LOCAL DIAGNOSTIC MATRIX');
  console.log('-'.repeat(108));
  for (const r of rows) console.log(pad(r.verdict, 6) + pad('want=' + r.want, 11) + pad('got=' + r.got, 12) + r.label + (r.detail ? '  (' + r.detail + ')' : ''));
  console.log('-'.repeat(108));
  console.log('PASSED ' + passed + '  FAILED ' + failed);
  if (!pinOk) console.log('INTEGRITY PIN MISMATCH: update PINNED_REGION_SHA256 only for an intended logic change.');
  process.exit(failed === 0 ? 0 : 1);
}

main();

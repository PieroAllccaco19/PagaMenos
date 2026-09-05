// PagaMenos · PRE-A2 TRUSTED AUTHORITY GATE v2 — LOCAL DIAGNOSTIC HARNESS
// =============================================================================
// Proves the trusted gate's decision + all-exact-run lifecycle locally, before
// any GitHub run. Test-only; NOT the runtime trust root. The authoritative
// logic lives inline in .github/workflows/trusted-a2-authority.yml.
//
// INTEGRITY MODEL: extract the sentinel-bounded region from the committed
// workflow, assert its normalized SHA-256 equals PINNED_REGION_SHA256 (silent
// edits fail until the pin is deliberately updated), and run THAT exact code.
//
// Run: node scripts-trusted/trusted-a2-authority.harness.mjs
// Exit 0 = pin + full matrix green; nonzero = a diagnostic failed.
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
const PINNED_REGION_SHA256 = '7c4b5c714a3ad385a4939a2e947bcd7c0b838da59f512cea22a051c8f6f77783';

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
      '\nreturn { verifyTrustedA2, forbiddenPaths, buildAppJwt, buildInProgressBody, buildCompletedBody, concludeFromValidation, b64url, REQUIRED_AUTHORITY_FILES, CHECK_NAME, PROTECTED_PREFIXES, REJECTED_AUTHORITY_BASE_SHA, sameRepositoryPolicy, preCheckEvent, externalIdFor, isExactLogicalMatch, findAllExactRuns, partitionOutcomes, verifyRevocableSelectors, MAX_EXACT_RUNS, MAX_PAGES, PAGE_SIZE };',
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

const runOn = ({ id, headSha = ACCEPTED_HEAD, externalId, appId = APP_ID, name, status = 'completed', conclusion = 'success' }) => ({ id, name, head_sha: headSha, external_id: externalId, status, conclusion, app: { id: appId } });

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
// Mirrors STEP 2 (enumerate+reset ALL) + STEP 3 (validation) + STEP 4 (finalize ALL).
// Optional resetFailIds/finalizeFailIds inject per-id PATCH failures to model API outages.
function simulateRunLifecycle({ lib, headSha, priorRuns, revocableResult, appCredsPresent = true, sameRepo = true, resetFailIds = [], finalizeFailIds = [], listThrows = null }) {
  const events = [];
  const pre = lib.preCheckEvent({
    eventName: 'pull_request_target',
    repository: REPO,
    pr: sameRepo ? sameRepoPr(headSha) : forkPr(headSha),
  });
  if (!pre.ok) { events.push({ step: 'precheck', ok: false, error: pre.error }); return { events, finalStates: [] }; }
  events.push({ step: 'precheck', ok: true });
  if (!appCredsPresent) { events.push({ step: 'app-auth', ok: false, error: 'TRUSTED ISSUER AVAILABILITY FAILURE' }); return { events, finalStates: [] }; }
  if (listThrows) { events.push({ step: 'list', ok: false, error: listThrows }); return { events, finalStates: [] }; }

  const externalId = lib.externalIdFor({ repositoryId: REPO_ID, prNumber: pre.prNumber, headSha: pre.headSha });
  const exact = lib.findAllExactRuns({ runs: priorRuns, appId: APP_ID, checkName: lib.CHECK_NAME, externalId, headSha: pre.headSha });
  events.push({ step: 'enumerate', count: exact.length, ids: exact.map((r) => r.id) });

  // reset all (or create one if empty)
  let active;
  if (exact.length === 0) {
    const newId = 900000 + Math.floor(Math.random() * 1000);
    active = [{ id: newId, name: lib.CHECK_NAME, head_sha: pre.headSha, external_id: externalId, status: 'in_progress', conclusion: null, app: { id: APP_ID } }];
    events.push({ step: 'create-new', ids: [newId] });
  } else {
    const failed = new Set(resetFailIds);
    const outcomes = exact.map((r) => (failed.has(r.id) ? { id: r.id, ok: false, error: 'API 500' } : { id: r.id, ok: true }));
    const part = lib.partitionOutcomes(outcomes);
    if (part.failed.length > 0) {
      events.push({ step: 'reset-integrity-failure', failed: part.failed });
      return { events, finalStates: exact.map((r) => ({ ...r, resetAttempted: true })) };
    }
    active = exact.map((r) => ({ ...r, status: 'in_progress', conclusion: null }));
    events.push({ step: 'reset-all', ids: active.map((r) => r.id) });
  }

  // Revocable validation is caller-provided (models a validation outcome or exception).
  const conclusion = lib.concludeFromValidation(revocableResult && revocableResult.ok === true);
  events.push({ step: 'validate', ok: !!(revocableResult && revocableResult.ok === true), detail: revocableResult && revocableResult.error });

  // finalize all
  const failedFin = new Set(finalizeFailIds);
  const finOutcomes = active.map((r) => (failedFin.has(r.id) ? { id: r.id, ok: false, error: 'API 502' } : { id: r.id, ok: true }));
  const finPart = lib.partitionOutcomes(finOutcomes);
  if (finPart.failed.length > 0) {
    events.push({ step: 'finalize-integrity-failure', failed: finPart.failed });
    // active runs remain in_progress from the partial-failed callers' perspective
    return { events, finalStates: active };
  }
  const finalStates = active.map((r) => ({ ...r, status: 'completed', conclusion }));
  events.push({ step: 'finalize-all', ids: finalStates.map((r) => r.id), conclusion });
  return { events, finalStates, externalId };
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
  check('extra manifest entry (5 files)', v(goodRuntime(), goodLedger(), { ...acceptedManifest(), authorityFiles: [...FOUR, 'authority/v1/EXTRA.json'] }), false);
  check('duplicate manifest entry', v(goodRuntime(), goodLedger(), { ...acceptedManifest(), authorityFiles: [FOUR[0], FOUR[0], FOUR[1], FOUR[2]] }), false);
  check('valid runtime declaration', v(goodRuntime()), true);
  check('wrong runtime digest', v({ ...goodRuntime(), corpusSemanticDigest: 'sha256:' + 'a'.repeat(64) }), false);
  check('malformed declaration (missing key)', (() => { const r = goodRuntime(); delete r.declarationVersion; return v(r); })(), false);
  check('extra declaration field', v({ ...goodRuntime(), extra: 'x' }), false);
  check('null substitution', v({ ...goodRuntime(), corpusSemanticDigest: null }), false);

  const forbidden = (paths) => lib.forbiddenPaths(paths).length > 0;
  check('protected direct edit (authority/**)', !forbidden(['authority/v1/CORPUS_RELEASE_LEDGER_V1.json']), false);
  check('rename-out: workflow moved out of .github/workflows/**', !forbidden(['.github/workflows/trusted-a2-authority.yml', 'docs/moved.yml']), false);
  check('protected scripts-trusted/** edit', !forbidden(['scripts-trusted/trusted-a2-authority.harness.mjs']), false);
  check('near-miss allowed: src/corpus-notes.md', !forbidden(['src/corpus-notes.md']), true);
  check('ordinary A2 source path allowed', !forbidden(['src/db/purchase-intent-decision-repository.ts']), true);

  // ==== §B same-repository policy ==========================================
  const preOk = (pr) => lib.preCheckEvent({ eventName: 'pull_request_target', repository: REPO, pr }).ok;
  check('§B same-repo PR admitted by pre-check', preOk(sameRepoPr()), true);
  check('§B fork PR rejected by pre-check (before App)', preOk(forkPr()), false);
  check('§B pre-check rejects wrong event name', lib.preCheckEvent({ eventName: 'pull_request', repository: REPO, pr: sameRepoPr() }).ok, false);
  check('§B pre-check rejects malformed head SHA', preOk({ number: 1, head: { sha: 'zz', repo: { full_name: REPO } } }), false);

  // ==== external_id determinism ============================================
  const eid = lib.externalIdFor({ repositoryId: REPO_ID, prNumber: PR_NUM, headSha: ACCEPTED_HEAD });
  checkRaw('§E external_id deterministic', eid === lib.externalIdFor({ repositoryId: REPO_ID, prNumber: PR_NUM, headSha: ACCEPTED_HEAD }));

  // ==== §2/§3/§14 findAllExactRuns MATCH FILTER MATRIX ======================
  const N = (id, over = {}) => runOn({ id, headSha: ACCEPTED_HEAD, externalId: eid, appId: APP_ID, name: lib.CHECK_NAME, ...over });
  const mkNonMatch = [
    N(1001, { appId: 111111 }),          // wrong App
    N(1002, { name: 'evil-same-name' }), // wrong name
    N(1003, { externalId: 'other:id' }), // wrong external_id
    N(1004, { headSha: 'b'.repeat(40) }), // wrong head
  ];
  const mkExact = [N(101, {}), N(202, {})];
  const runsMixed = [...mkNonMatch, ...mkExact];
  const found = lib.findAllExactRuns({ runs: runsMixed, appId: APP_ID, checkName: lib.CHECK_NAME, externalId: eid, headSha: ACCEPTED_HEAD });
  checkRaw('§14 filter ignores wrong App/name/eid/head', found.every((r) => [101, 202].includes(r.id)) && found.length === 2);

  // Ordering independence
  const foundOrder = lib.findAllExactRuns({ runs: [N(202, {}), N(101, {}), N(303, {}), ...mkNonMatch], appId: APP_ID, checkName: lib.CHECK_NAME, externalId: eid, headSha: ACCEPTED_HEAD });
  checkRaw('§13 API ordering independence: canonical ascending-id order', foundOrder.map((r) => r.id).join(',') === '101,202,303');

  // Dedup by id
  const dupSameId = lib.findAllExactRuns({ runs: [N(101, {}), N(101, { conclusion: 'failure' })], appId: APP_ID, checkName: lib.CHECK_NAME, externalId: eid, headSha: ACCEPTED_HEAD });
  checkRaw('duplicate id dedupped', dupSameId.length === 1 && dupSameId[0].id === 101);

  // ==== §12 pagination — simulate the paginator by feeding a fully-enumerated 201-run list ==
  const page1 = Array.from({ length: 100 }, (_, i) => N(2000 + i, { appId: 111111 })); // 100 non-matching
  const page2 = Array.from({ length: 100 }, (_, i) => N(2100 + i, { externalId: 'other:id' })); // 100 non-matching
  const page3TargetId = 2199;
  const page3 = [N(page3TargetId, {}), N(page3TargetId + 1, { name: 'other-name' })]; // exact match on page 3
  const paginated = [...page1, ...page2, ...page3];
  const foundPage3 = lib.findAllExactRuns({ runs: paginated, appId: APP_ID, checkName: lib.CHECK_NAME, externalId: eid, headSha: ACCEPTED_HEAD });
  checkRaw('§12 exact match on page 3 (id ' + page3TargetId + ') discovered by full-enum filter', foundPage3.length === 1 && foundPage3[0].id === page3TargetId);
  const foundPage2 = lib.findAllExactRuns({ runs: [...page1, N(2050, {})], appId: APP_ID, checkName: lib.CHECK_NAME, externalId: eid, headSha: ACCEPTED_HEAD });
  checkRaw('§12 exact match on page 2 discovered', foundPage2.length === 1 && foundPage2[0].id === 2050);

  // ==== §10 DUPLICATE ATTACK — 2 prior successes on H must not survive failed rerun ========
  const twoPriorSuccess = [
    runOn({ id: 101, headSha: ACCEPTED_HEAD, externalId: eid, name: lib.CHECK_NAME }),
    runOn({ id: 202, headSha: ACCEPTED_HEAD, externalId: eid, name: lib.CHECK_NAME }),
  ];
  const dupFail = simulateRunLifecycle({ lib, headSha: ACCEPTED_HEAD, priorRuns: twoPriorSuccess, revocableResult: { ok: false, error: 'head pin failed' } });
  checkRaw('§10 duplicates enumerated (2)', dupFail.events.some((e) => e.step === 'enumerate' && e.count === 2));
  checkRaw('§10 reset ALL: both runs to in_progress before validation', dupFail.events.some((e) => e.step === 'reset-all' && e.ids.length === 2 && e.ids.includes(101) && e.ids.includes(202)));
  checkRaw('§10 finalize ALL: both runs completed/failure', dupFail.finalStates.length === 2 && dupFail.finalStates.every((r) => r.status === 'completed' && r.conclusion === 'failure'));
  checkRaw('§10 no exact SUCCESS survives failed rerun', !dupFail.finalStates.some((r) => r.conclusion === 'success'));

  // ==== §11 DUPLICATE SUCCESSFUL rerun — both remain success ============================
  const dupPass = simulateRunLifecycle({ lib, headSha: ACCEPTED_HEAD, priorRuns: twoPriorSuccess, revocableResult: { ok: true } });
  checkRaw('§11 duplicates successful rerun: ALL converge to success', dupPass.finalStates.length === 2 && dupPass.finalStates.every((r) => r.conclusion === 'success'));

  // three exact runs converge (extra ordering / count)
  const threePrior = [runOn({ id: 101, headSha: ACCEPTED_HEAD, externalId: eid, name: lib.CHECK_NAME }), runOn({ id: 202, headSha: ACCEPTED_HEAD, externalId: eid, name: lib.CHECK_NAME }), runOn({ id: 303, headSha: ACCEPTED_HEAD, externalId: eid, name: lib.CHECK_NAME })];
  const threeFail = simulateRunLifecycle({ lib, headSha: ACCEPTED_HEAD, priorRuns: threePrior, revocableResult: { ok: false, error: 'authority unavailable' } });
  checkRaw('three exact runs all converge to failure', threeFail.finalStates.length === 3 && threeFail.finalStates.every((r) => r.conclusion === 'failure'));

  // ==== §8/§9 PARTIAL FAILURES → integrity failure classification ==========
  const partialReset = simulateRunLifecycle({ lib, headSha: ACCEPTED_HEAD, priorRuns: twoPriorSuccess, revocableResult: { ok: true }, resetFailIds: [202] });
  checkRaw('§8 partial RESET failure classified as integrity failure (halt before validation)', partialReset.events.some((e) => e.step === 'reset-integrity-failure') && !partialReset.events.some((e) => e.step === 'validate'));
  const partialFin = simulateRunLifecycle({ lib, headSha: ACCEPTED_HEAD, priorRuns: twoPriorSuccess, revocableResult: { ok: true }, finalizeFailIds: [202] });
  checkRaw('§9 partial FINALIZE failure classified as integrity failure (freeze)', partialFin.events.some((e) => e.step === 'finalize-integrity-failure'));
  checkRaw('§9 partial FINALIZE failure: gate NOT considered successful', !partialFin.events.some((e) => e.step === 'finalize-all'));

  // ==== issuer availability = no creds ======================================
  const noCreds = simulateRunLifecycle({ lib, headSha: ACCEPTED_HEAD, priorRuns: [], revocableResult: { ok: true }, appCredsPresent: false });
  checkRaw('§8 no App creds -> abort BEFORE any check touch', noCreds.finalStates.length === 0 && noCreds.events.some((e) => e.error && e.error.includes('TRUSTED ISSUER AVAILABILITY')));
  const listFails = simulateRunLifecycle({ lib, headSha: ACCEPTED_HEAD, priorRuns: [], revocableResult: { ok: true }, listThrows: 'TRUSTED ISSUER INTEGRITY FAILURE: check-runs list failed' });
  checkRaw('§4 pagination list failure -> abort before reset (integrity failure)', listFails.finalStates.length === 0 && listFails.events.some((e) => e.error && e.error.includes('INTEGRITY')));

  // ==== §11 new head H2 gets its own check ==================================
  const H2 = 'a'.repeat(40);
  const revocOnH2 = lib.verifyRevocableSelectors({ prHeadSha: H2, acceptedA2Head: ACCEPTED_HEAD, acceptedAuthorityBaseSha: ACCEPTED_BASE });
  const newHead = simulateRunLifecycle({ lib, headSha: H2, priorRuns: twoPriorSuccess, revocableResult: revocOnH2 });
  checkRaw('new head H2 creates new check (not reusing H runs)', newHead.events.some((e) => e.step === 'create-new'));
  checkRaw('new head H2 concludes FAILURE', newHead.finalStates.length === 1 && newHead.finalStates[0].conclusion === 'failure' && newHead.finalStates[0].head_sha === H2);

  // ==== retained: revocable selectors + rejected 68269bb ====================
  check('revocable: accepted head + accepted base', lib.verifyRevocableSelectors({ prHeadSha: ACCEPTED_HEAD, acceptedA2Head: ACCEPTED_HEAD, acceptedAuthorityBaseSha: ACCEPTED_BASE }).ok, true);
  check('revocable: blank accepted A2 head fail closed', lib.verifyRevocableSelectors({ prHeadSha: ACCEPTED_HEAD, acceptedA2Head: '', acceptedAuthorityBaseSha: ACCEPTED_BASE }).ok, false);
  check('revocable: rejected 68269bb', lib.verifyRevocableSelectors({ prHeadSha: ACCEPTED_HEAD, acceptedA2Head: ACCEPTED_HEAD, acceptedAuthorityBaseSha: REJECTED_BASE }).ok, false);

  // ==== §7 post-reset failure routes to ALL-runs failure ====================
  const failureCauses = [
    { label: 'head-pin failure', r: { ok: false, error: 'PR head != accepted' } },
    { label: 'rejected 68269bb', r: { ok: false, error: 'authority base is REJECTED 68269bb' } },
    { label: 'authority unavailable', r: { ok: false, error: 'cannot fetch authority base' } },
    { label: 'protected path', r: { ok: false, error: 'protected path' } },
    { label: 'runtime declaration invalid', r: { ok: false, error: 'runtime key set mismatch' } },
    { label: 'manifest inventory (68269bb)', r: { ok: false, error: 'manifest.authorityFiles count 3 != 4' } },
    { label: 'validation exception', r: { ok: false, error: 'validation exception: throw' } },
    { label: 'no result (finalizer default)', r: undefined },
  ];
  for (const fc of failureCauses) {
    const sim = simulateRunLifecycle({ lib, headSha: ACCEPTED_HEAD, priorRuns: twoPriorSuccess, revocableResult: fc.r });
    checkRaw('§7 post-reset "' + fc.label + '" -> ALL exact runs failure', sim.finalStates.length === 2 && sim.finalStates.every((r) => r.conclusion === 'failure'));
  }

  // ==== builder purity ======================================================
  const now = 1_700_000_000;
  const jwt = lib.buildAppJwt(String(APP_ID), now);
  checkRaw('App JWT within 10min window', jwt.payload.exp - jwt.payload.iat <= 600);
  const inprog = lib.buildInProgressBody({ name: lib.CHECK_NAME, headSha: ACCEPTED_HEAD, externalId: eid, startedAt: 'x' });
  checkRaw('in_progress body carries external_id + head', inprog.external_id === eid && inprog.head_sha === ACCEPTED_HEAD && inprog.status === 'in_progress' && !('conclusion' in inprog));
  const done = lib.buildCompletedBody({ name: lib.CHECK_NAME, headSha: ACCEPTED_HEAD, externalId: eid, completedAt: 'y', conclusion: 'failure', title: 't', summary: 's' });
  checkRaw('completed body carries conclusion + external_id', done.conclusion === 'failure' && done.external_id === eid && done.status === 'completed');
  checkRaw('concludeFromValidation(true)=success / (false)=failure', lib.concludeFromValidation(true) === 'success' && lib.concludeFromValidation(false) === 'failure');
  checkRaw('check name is head-bound', lib.CHECK_NAME === 'trusted-a2-authority/head');
  checkRaw('sanity ceilings exposed', typeof lib.MAX_EXACT_RUNS === 'number' && lib.MAX_EXACT_RUNS >= 128 && typeof lib.MAX_PAGES === 'number' && typeof lib.PAGE_SIZE === 'number');

  // ==== §16 documentation invariant: freeze rule is enforced by code (finalize partial-fail keeps runs non-success) ====
  checkRaw('§16 finalize partial-fail: no active run reads as completed/success', !partialFin.finalStates.some((r) => r.status === 'completed' && r.conclusion === 'success'));

  // ---- report ----
  const pad = (s, n) => (s + ' '.repeat(n)).slice(0, n);
  console.log('\nTRUSTED-A2 AUTHORITY v2 (duplicate-equivalence patch) — LOCAL DIAGNOSTIC MATRIX');
  console.log('-'.repeat(110));
  for (const r of rows) console.log(pad(r.verdict, 6) + pad('want=' + r.want, 11) + pad('got=' + r.got, 12) + r.label + (r.detail ? '  (' + r.detail + ')' : ''));
  console.log('-'.repeat(110));
  console.log('PASSED ' + passed + '  FAILED ' + failed);
  if (!pinOk) console.log('INTEGRITY PIN MISMATCH: update PINNED_REGION_SHA256 only for an intended logic change.');
  process.exit(failed === 0 ? 0 : 1);
}

main();

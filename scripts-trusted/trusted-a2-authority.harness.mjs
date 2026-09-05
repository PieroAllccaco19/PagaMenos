// PagaMenos · PRE-A2 TRUSTED AUTHORITY GATE v2 — LOCAL DIAGNOSTIC HARNESS
// =============================================================================
// Proves the trusted gate's decision + full canonicalization lifecycle locally,
// before any GitHub run. Test-only; NOT the runtime trust root. The
// authoritative logic lives inline in .github/workflows/trusted-a2-authority.yml.
//
// INTEGRITY MODEL: extract the sentinel-bounded region from the committed
// workflow, assert its normalized SHA-256 equals PINNED_REGION_SHA256 (silent
// edits fail until the pin is deliberately updated), and run THAT exact code.
//
// LIFECYCLE MODEL: `simulateRunLifecycle` models the workflow with per-id side
// effects that persist across PATCH failures (§17 — no fake transactional
// rollback). The canonicalization sequence mirrors STEP 4 in the workflow:
//     reset ALL exact  ->  validate  ->  if PASS:  rename ALL noncanonical
//                                         duplicates OUT of required context,
//                                         verify every rename OK, THEN promote
//                                         canonical (highest numeric id) to
//                                         required-name success.
//                                       if FAIL:  every active exact run to
//                                         required-name failure.
// Any PATCH failure => integrity failure. Earlier PATCH side effects are
// retained (a renamed duplicate STAYS renamed even if canonical fails).
//
// PAGINATOR MODEL: `listAllCheckRunsForRefWithFetcher` is exercised through a
// real fetcher stub that yields per-page canned responses — no in-region logic
// is bypassed by the harness (§16).
//
// Run: node scripts-trusted/trusted-a2-authority.harness.mjs
// Exit 0 = pin + full matrix green; nonzero = a diagnostic failed.
// =============================================================================
// This file is a Node ESM diagnostic script; declare the Node runtime globals
// it uses so the repo's flat ESLint config (no per-file env for scripts-trusted)
// does not flag them as `no-undef`. `process` is also imported explicitly so
// the reference is a value binding, not only a declaration for the linter.
/* global console */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import process from 'node:process';

const HERE = dirname(fileURLToPath(import.meta.url));
const WORKFLOW = join(HERE, '..', '.github', 'workflows', 'trusted-a2-authority.yml');
const BEGIN = '===BEGIN TRUSTED-A2 TRUSTED LOGIC';
const END = '===END TRUSTED-A2 TRUSTED LOGIC===';

// Pin over the normalized authoritative region. Update ONLY with an intended
// logic change (record it in the commit).
const PINNED_REGION_SHA256 = '9d515c5cc436896c5857480c53c36a8304bddf148e4994beafbe5490a3dbe858';

const normalize = (s) =>
  s
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.replace(/^[ \t]+/, ''))
    .join('\n')
    .trim();

function extractRegion() {
  const t = readFileSync(WORKFLOW, 'utf8');
  const b = t.indexOf(BEGIN);
  const e = t.indexOf(END);
  if (b < 0 || e < 0) throw new Error('trusted-logic sentinels not found in workflow');
  return t.slice(t.lastIndexOf('\n', b) + 1, e + END.length);
}

function loadTrustedLogic(regionRaw) {
  const src = normalize(regionRaw);
  // Executes the extracted authoritative region as CommonJS-style code and
  // returns its named exports. This is the entire point of the harness (see
  // "INTEGRITY MODEL" above) — do not attempt to lint away the `new Function`.
  return new Function(
    src +
      '\nreturn { verifyTrustedA2, forbiddenPaths, buildAppJwt, buildInProgressBody, buildCompletedBody, buildDuplicateFailureBody, concludeFromValidation, b64url, REQUIRED_AUTHORITY_FILES, CHECK_NAME, DUPLICATE_NAME_PREFIX, PROTECTED_PREFIXES, REJECTED_AUTHORITY_BASE_SHA, sameRepositoryPolicy, preCheckEvent, externalIdFor, isExactLogicalMatch, findAllExactRuns, partitionOutcomes, duplicateNameFor, chooseCanonical, partitionCanonical, detectIdMetadataConflicts, idMetadataSignature, verifyRevocableSelectors, MAX_EXACT_RUNS, MAX_PAGES, PAGE_SIZE, listAllCheckRunsForRefWithFetcher };',
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

const goodRuntime = () => ({
  declarationVersion: 'pagamenos.runtime-corpus-authority.v1',
  corpusId: CORPUS_ID,
  corpusSemanticProjectionVersion: PROJECTION,
  corpusSemanticDigest: ACCEPTED_DIGEST,
});
const goodLedger = () => ({
  schemaVersion: 'pagamenos.corpus-release-ledger.v1',
  entries: {
    [CORPUS_ID]: {
      semanticProjectionVersion: PROJECTION,
      sourceCommit: '64cf864a817c137920204487ab3317bc6d4c9ba5',
      digest: ACCEPTED_DIGEST,
    },
  },
});
const acceptedManifest = () => ({
  corpusId: CORPUS_ID,
  corpusSemanticProjectionVersion: PROJECTION,
  corpusSemanticDigest: ACCEPTED_DIGEST,
  authorityFiles: FOUR.slice(),
});
const rejectedManifest = () => ({
  corpusId: CORPUS_ID,
  corpusSemanticProjectionVersion: PROJECTION,
  corpusSemanticDigest: ACCEPTED_DIGEST,
  authorityFiles: FOUR.filter((f) => !f.endsWith('AUTHORITY_BASELINE_MANIFEST_V1.json')),
});

const sameRepoPr = (headSha = ACCEPTED_HEAD, number = PR_NUM) => ({
  number,
  head: { sha: headSha, repo: { full_name: REPO } },
  base: { sha: 'deadbeef'.repeat(5) },
});
const forkPr = (headSha = ACCEPTED_HEAD) => ({
  number: PR_NUM,
  head: { sha: headSha, repo: { full_name: 'attacker/pagamenos' } },
  base: { sha: 'deadbeef'.repeat(5) },
});

const runOn = ({
  id,
  headSha = ACCEPTED_HEAD,
  externalId,
  appId = APP_ID,
  name,
  status = 'completed',
  conclusion = 'success',
}) => ({
  id,
  name,
  head_sha: headSha,
  external_id: externalId,
  status,
  conclusion,
  app: { id: appId },
});

// ---- assertion runner --------------------------------------------------------
let passed = 0,
  failed = 0;
const rows = [];
function check(label, got, want, detail = '') {
  const ok = got === want;
  rows.push({
    label,
    want: want ? 'PASS' : 'FAIL',
    got: got ? 'PASS' : 'FAIL',
    verdict: ok ? 'OK' : 'WRONG',
    detail,
  });
  if (ok) passed++;
  else failed++;
}
function checkRaw(label, ok, note = '') {
  rows.push({
    label,
    want: 'OK',
    got: ok ? 'OK' : 'WRONG',
    verdict: ok ? 'OK' : 'WRONG',
    detail: note,
  });
  if (ok) passed++;
  else failed++;
}

// ---- true-fidelity lifecycle simulation --------------------------------------
// Models sequential per-id PATCH side effects. Once a PATCH succeeds it MUTATES
// simState; a later PATCH failure does NOT roll it back (§17). Canonicalization
// on PASS follows the exact workflow order: rename EVERY noncanonical duplicate
// first, verify every rename OK, THEN promote canonical to required-name
// success. On FAIL, every active exact run receives required-name failure.
function simulateRunLifecycle({
  lib,
  headSha,
  priorRuns,
  revocableResult,
  appCredsPresent = true,
  sameRepo = true,
  resetFailIds = [],
  renameFailIds = [], // per-id PATCH failure during noncanonical rename
  canonicalFail = false, // canonical success PATCH fails
  finalizeFailIds = [], // per-id PATCH failure during required-name failure finalization (FAIL path)
  listThrows = null,
}) {
  const events = [];
  // Per-id mutable state; only known ids ever appear here.
  const simState = new Map();
  const seed = (r) =>
    simState.set(Number(r.id), {
      id: Number(r.id),
      name: r.name,
      head_sha: r.head_sha,
      external_id: r.external_id,
      status: r.status,
      conclusion: r.conclusion,
      app: r.app,
    });
  for (const r of priorRuns) seed(r);

  const pre = lib.preCheckEvent({
    eventName: 'pull_request_target',
    repository: REPO,
    pr: sameRepo ? sameRepoPr(headSha) : forkPr(headSha),
  });
  if (!pre.ok) {
    events.push({ step: 'precheck', ok: false, error: pre.error });
    return { events, simState };
  }
  events.push({ step: 'precheck', ok: true });
  if (!appCredsPresent) {
    events.push({ step: 'app-auth', ok: false, error: 'TRUSTED ISSUER AVAILABILITY FAILURE' });
    return { events, simState };
  }
  if (listThrows) {
    events.push({ step: 'list', ok: false, error: listThrows });
    return { events, simState };
  }

  const externalId = lib.externalIdFor({
    repositoryId: REPO_ID,
    prNumber: pre.prNumber,
    headSha: pre.headSha,
  });
  const exact = lib.findAllExactRuns({
    runs: priorRuns,
    appId: APP_ID,
    checkName: lib.CHECK_NAME,
    externalId,
    headSha: pre.headSha,
  });
  events.push({ step: 'enumerate', count: exact.length, ids: exact.map((r) => r.id) });

  // Reset all (or create one if empty). Sequential per-id side effects.
  let activeIds = [];
  if (exact.length === 0) {
    const newId = 900000 + Math.floor(Math.random() * 1000);
    simState.set(newId, {
      id: newId,
      name: lib.CHECK_NAME,
      head_sha: pre.headSha,
      external_id: externalId,
      status: 'in_progress',
      conclusion: null,
      app: { id: APP_ID },
    });
    activeIds = [newId];
    events.push({ step: 'create-new', ids: [newId] });
  } else {
    const failed = new Set(resetFailIds);
    const outcomes = [];
    for (const r of exact) {
      if (failed.has(r.id)) {
        outcomes.push({ id: r.id, ok: false, error: 'API 500' });
        continue;
      }
      const s = simState.get(Number(r.id));
      s.status = 'in_progress';
      s.conclusion = null; // real mutation, retained
      outcomes.push({ id: r.id, ok: true });
    }
    const part = lib.partitionOutcomes(outcomes);
    if (part.failed.length > 0) {
      events.push({ step: 'reset-integrity-failure', failed: part.failed });
      return { events, simState, externalId };
    }
    activeIds = exact.map((r) => Number(r.id));
    events.push({ step: 'reset-all', ids: activeIds });
  }

  const ok = !!(revocableResult && revocableResult.ok === true);
  events.push({ step: 'validate', ok, detail: revocableResult && revocableResult.error });

  if (!ok) {
    // FAIL path: sequential per-id PATCH -> completed/failure with required name.
    const failed = new Set(finalizeFailIds);
    const outcomes = [];
    for (const id of activeIds) {
      if (failed.has(id)) {
        outcomes.push({ id, ok: false, error: 'API 502' });
        continue;
      }
      const s = simState.get(id);
      s.status = 'completed';
      s.conclusion = 'failure';
      s.name = lib.CHECK_NAME; // retained
      outcomes.push({ id, ok: true });
    }
    const part = lib.partitionOutcomes(outcomes);
    if (part.failed.length > 0) {
      events.push({ step: 'finalize-integrity-failure', failed: part.failed });
      return { events, simState, externalId };
    }
    events.push({ step: 'finalize-fail-all', ids: activeIds });
    return { events, simState, externalId };
  }

  // PASS path: canonicalize.
  const canonical = lib.chooseCanonical(activeIds.map((id) => ({ id })));
  const canonicalId = Number(canonical.id);
  const duplicateIds = activeIds.filter((id) => id !== canonicalId);
  events.push({ step: 'canonical-chosen', canonicalId, duplicateIds });

  // (a) rename noncanonical duplicates OUT of required context. Sequential.
  const renameFailed = new Set(renameFailIds);
  const dupOutcomes = [];
  for (const id of duplicateIds) {
    if (renameFailed.has(id)) {
      dupOutcomes.push({ id, ok: false, error: 'API 503' });
      continue;
    }
    const s = simState.get(id);
    s.name = lib.duplicateNameFor(id); // NAME leaves required context
    s.status = 'completed';
    s.conclusion = 'failure'; // retained
    dupOutcomes.push({ id, ok: true });
  }
  const dupPart = lib.partitionOutcomes(dupOutcomes);
  if (dupPart.failed.length > 0) {
    events.push({ step: 'rename-integrity-failure', failed: dupPart.failed });
    // canonical is NOT promoted to success. Side effects on earlier renames are retained.
    return { events, simState, externalId, canonicalId, duplicateIds };
  }
  events.push({ step: 'rename-all', ids: duplicateIds });

  // (b) ONLY NOW may canonical receive required-name success.
  if (canonicalFail) {
    events.push({ step: 'canonical-integrity-failure', canonicalId });
    return { events, simState, externalId, canonicalId, duplicateIds };
  }
  const s = simState.get(canonicalId);
  s.name = lib.CHECK_NAME;
  s.status = 'completed';
  s.conclusion = 'success';
  events.push({ step: 'canonical-success', canonicalId });
  return { events, simState, externalId, canonicalId, duplicateIds };
}

// Utility: enumerate ALL simState runs that currently satisfy required-context
// exact match (name = CHECK_NAME). Used for §6 / §12 invariants.
function requiredContextExact({ lib, simState, externalId, headSha }) {
  const runs = Array.from(simState.values()).map((s) => ({
    id: s.id,
    name: s.name,
    head_sha: s.head_sha,
    external_id: s.external_id,
    status: s.status,
    conclusion: s.conclusion,
    app: s.app,
  }));
  return lib.findAllExactRuns({
    runs,
    appId: APP_ID,
    checkName: lib.CHECK_NAME,
    externalId,
    headSha,
  });
}
function requiredContextSuccessCount({ lib, simState, externalId, headSha }) {
  return requiredContextExact({ lib, simState, externalId, headSha }).filter(
    (r) => r.status === 'completed' && r.conclusion === 'success',
  ).length;
}

async function main() {
  const regionRaw = extractRegion();
  const gotHash = createHash('sha256').update(normalize(regionRaw)).digest('hex');
  const pinOk = gotHash === PINNED_REGION_SHA256;
  checkRaw(
    '§0 integrity pin: workflow trusted-logic SHA-256 matches',
    pinOk,
    pinOk ? '' : 'got ' + gotHash,
  );

  // §L1 (work-propagation regression): STEP 3's shell block MUST export the
  // mktemp'd WORK path so the same-step Node child (spawned from a heredoc)
  // sees it via process.env — a $GITHUB_ENV write alone only propagates to
  // LATER steps and leaves the current-step Node process with WORK=undefined,
  // which is the exact live-activation failure this harness must guard
  // against ("validation did not produce a result (fail closed)"). This is a
  // workflow-source assertion, not an executable simulation: reproducing
  // GitHub Actions' shell-vs-heredoc-child semantics inside JS would require
  // spawning a real bash + node pair per test run, which broadens harness
  // scope beyond the trusted-logic pin. If this row goes red, the fix is to
  // add `export WORK` between the mktemp assignment and the heredoc node
  // invocation in .github/workflows/trusted-a2-authority.yml.
  const workflowText = readFileSync(WORKFLOW, 'utf8');
  const step3 = (() => {
    const m = workflowText.match(
      /Revocable validation \(routed through finalizer\)[\s\S]*?node - <<'NODE'/,
    );
    return m ? m[0] : '';
  })();
  const step3HasMktempWork = /WORK="\$\(mktemp -d\)"/.test(step3);
  const step3HasExportWork = /(^|\n)\s*export\s+WORK\b/.test(step3);
  const step3HasGithubEnvWrite = /echo\s+"WORK=\$WORK"\s+>>\s+"\$GITHUB_ENV"/.test(step3);
  checkRaw(
    '§L1 STEP 3 mktemp WORK present in workflow',
    step3HasMktempWork,
    step3HasMktempWork ? '' : 'WORK="$(mktemp -d)" not found in STEP 3',
  );
  checkRaw(
    '§L1 STEP 3 exports WORK before the same-step Node heredoc (same-step child sees WORK)',
    step3HasExportWork,
    step3HasExportWork ? '' : 'missing "export WORK" between mktemp and NODE heredoc',
  );
  checkRaw(
    '§L1 STEP 3 still writes WORK to $GITHUB_ENV (STEP 4 finalizer still receives it)',
    step3HasGithubEnvWrite,
    step3HasGithubEnvWrite ? '' : '$GITHUB_ENV write for WORK removed — STEP 4 would lose it',
  );

  const lib = loadTrustedLogic(regionRaw);
  const v = (r, l = goodLedger(), m = acceptedManifest()) =>
    lib.verifyTrustedA2({ runtime: r, ledger: l, manifest: m }).ok;

  // ==== retained decision matrix (regression) ==============================
  check('§F 84a7a1a accepted four-file inventory', v(goodRuntime()), true);
  check(
    '§F 68269bb rejected manifest (omits self-entry)',
    v(goodRuntime(), goodLedger(), rejectedManifest()),
    false,
  );
  check(
    'extra manifest entry (5 files)',
    v(goodRuntime(), goodLedger(), {
      ...acceptedManifest(),
      authorityFiles: [...FOUR, 'authority/v1/EXTRA.json'],
    }),
    false,
  );
  check('valid runtime declaration', v(goodRuntime()), true);
  check(
    'wrong runtime digest',
    v({ ...goodRuntime(), corpusSemanticDigest: 'sha256:' + 'a'.repeat(64) }),
    false,
  );
  check(
    'malformed declaration (missing key)',
    (() => {
      const r = goodRuntime();
      delete r.declarationVersion;
      return v(r);
    })(),
    false,
  );
  check('null substitution', v({ ...goodRuntime(), corpusSemanticDigest: null }), false);

  const forbidden = (paths) => lib.forbiddenPaths(paths).length > 0;
  check(
    'protected direct edit (authority/**)',
    !forbidden(['authority/v1/CORPUS_RELEASE_LEDGER_V1.json']),
    false,
  );
  check(
    'protected scripts-trusted/** edit',
    !forbidden(['scripts-trusted/trusted-a2-authority.harness.mjs']),
    false,
  );
  check(
    'ordinary A2 source path allowed',
    !forbidden(['src/db/purchase-intent-decision-repository.ts']),
    true,
  );

  // ==== §B same-repository policy ==========================================
  const preOk = (pr) =>
    lib.preCheckEvent({ eventName: 'pull_request_target', repository: REPO, pr }).ok;
  check('§B same-repo PR admitted by pre-check', preOk(sameRepoPr()), true);
  check('§B fork PR rejected by pre-check (before App)', preOk(forkPr()), false);
  check(
    '§B pre-check rejects wrong event name',
    lib.preCheckEvent({ eventName: 'pull_request', repository: REPO, pr: sameRepoPr() }).ok,
    false,
  );
  check(
    '§B pre-check rejects malformed head SHA',
    preOk({ number: 1, head: { sha: 'zz', repo: { full_name: REPO } } }),
    false,
  );

  // ==== external_id determinism ============================================
  const eid = lib.externalIdFor({
    repositoryId: REPO_ID,
    prNumber: PR_NUM,
    headSha: ACCEPTED_HEAD,
  });
  checkRaw(
    '§E external_id deterministic',
    eid === lib.externalIdFor({ repositoryId: REPO_ID, prNumber: PR_NUM, headSha: ACCEPTED_HEAD }),
  );

  // ==== match filter matrix ================================================
  const N = (id, over = {}) =>
    runOn({
      id,
      headSha: ACCEPTED_HEAD,
      externalId: eid,
      appId: APP_ID,
      name: lib.CHECK_NAME,
      ...over,
    });
  const mkNonMatch = [
    N(1001, { appId: 111111 }),
    N(1002, { name: 'evil-same-name' }),
    N(1003, { externalId: 'other:id' }),
    N(1004, { headSha: 'b'.repeat(40) }),
  ];
  const foundFiltered = lib.findAllExactRuns({
    runs: [...mkNonMatch, N(101, {}), N(202, {})],
    appId: APP_ID,
    checkName: lib.CHECK_NAME,
    externalId: eid,
    headSha: ACCEPTED_HEAD,
  });
  checkRaw(
    '§14 filter ignores wrong App/name/eid/head',
    foundFiltered
      .map((r) => r.id)
      .sort()
      .join(',') === '101,202',
  );

  const foundOrder = lib.findAllExactRuns({
    runs: [N(202, {}), N(101, {}), N(303, {}), ...mkNonMatch],
    appId: APP_ID,
    checkName: lib.CHECK_NAME,
    externalId: eid,
    headSha: ACCEPTED_HEAD,
  });
  checkRaw(
    '§13 API ordering independence: canonical ascending-id order',
    foundOrder.map((r) => r.id).join(',') === '101,202,303',
  );

  const dupSameId = lib.findAllExactRuns({
    runs: [N(101, {}), N(101, {})],
    appId: APP_ID,
    checkName: lib.CHECK_NAME,
    externalId: eid,
    headSha: ACCEPTED_HEAD,
  });
  checkRaw(
    '§18 materially-identical duplicate id dedupped',
    dupSameId.length === 1 && dupSameId[0].id === 101,
  );

  // §18 id-metadata conflict -> integrity failure
  let idConflictThrew = false;
  try {
    lib.findAllExactRuns({
      runs: [N(101, {}), { ...N(101, {}), status: 'in_progress', conclusion: null }],
      appId: APP_ID,
      checkName: lib.CHECK_NAME,
      externalId: eid,
      headSha: ACCEPTED_HEAD,
    });
  } catch (e) {
    idConflictThrew = /INTEGRITY FAILURE.*conflicting metadata/.test(e.message);
  }
  checkRaw('§18 id-metadata conflict across pages -> INTEGRITY FAILURE', idConflictThrew);

  // ==== §19 canonical selection = HIGHEST NUMERIC id (not lexicographic) ====
  const canon = lib.chooseCanonical([{ id: 2 }, { id: 10 }, { id: 100 }]);
  checkRaw('§19 canonical = numeric max (2,10,100 -> 100)', canon && Number(canon.id) === 100);
  const canonLex = lib.chooseCanonical([{ id: 9 }, { id: 100 }]);
  checkRaw(
    '§19 canonical is numeric, not string (9 vs 100 -> 100)',
    canonLex && Number(canonLex.id) === 100,
  );
  const part3 = lib.partitionCanonical([{ id: 101 }, { id: 202 }, { id: 303 }]);
  checkRaw(
    '§3 partitionCanonical selects highest + collects rest',
    Number(part3.canonical.id) === 303 &&
      part3.duplicates
        .map((r) => Number(r.id))
        .sort((a, b) => a - b)
        .join(',') === '101,202',
  );
  checkRaw(
    '§4 duplicate name shape trusted-a2-authority/duplicate/<id>',
    lib.duplicateNameFor(101) === 'trusted-a2-authority/duplicate/101',
  );

  // ==== §16 REAL PAGINATOR — injected fetcher exercises the loop ============
  // Pagination terminates when a chunk is shorter than PAGE_SIZE; the "isLast"
  // hint is not needed by the paginator, so the page builder is a plain
  // response wrapper and the callers control length explicitly.
  const buildPage = (runs) => ({ ok: true, status: 200, json: { check_runs: runs } });
  const shortEnd = (runs) => buildPage(runs); // any chunk < PAGE_SIZE terminates
  const fullPage = (runs) => buildPage(runs); // len == PAGE_SIZE keeps going
  const mkFullPage = (start, appId = 111111) =>
    Array.from({ length: 100 }, (_, i) => N(start + i, { appId }));
  const paginatorInput = { owner: 'o', repo: 'r', ref: ACCEPTED_HEAD, checkName: lib.CHECK_NAME };

  // page 2 discovery: page1 = 100 non-matching (len==100 -> continue),
  // page2 = 1 exact match then short-page (len<100 -> terminate).
  const p2Pages = [fullPage(mkFullPage(3000)), shortEnd([N(3200, {})])];
  const p2Fetcher = async (url) => {
    const m = /&page=(\d+)/.exec(url);
    return p2Pages[Number(m[1]) - 1];
  };
  const p2Res = await lib.listAllCheckRunsForRefWithFetcher(p2Fetcher, paginatorInput);
  const p2Exact = lib.findAllExactRuns({
    runs: p2Res,
    appId: APP_ID,
    checkName: lib.CHECK_NAME,
    externalId: eid,
    headSha: ACCEPTED_HEAD,
  });
  checkRaw(
    '§16 real paginator: exact match on PAGE 2 discovered (id 3200)',
    p2Exact.length === 1 && p2Exact[0].id === 3200,
  );

  // page 3 discovery
  const p3Pages = [
    fullPage(mkFullPage(4000)),
    fullPage(mkFullPage(4100, 222222)),
    shortEnd([N(4250, {})]),
  ];
  const p3Fetcher = async (url) => {
    const m = /&page=(\d+)/.exec(url);
    return p3Pages[Number(m[1]) - 1];
  };
  const p3Res = await lib.listAllCheckRunsForRefWithFetcher(p3Fetcher, paginatorInput);
  const p3Exact = lib.findAllExactRuns({
    runs: p3Res,
    appId: APP_ID,
    checkName: lib.CHECK_NAME,
    externalId: eid,
    headSha: ACCEPTED_HEAD,
  });
  checkRaw(
    '§16 real paginator: exact match on PAGE 3 discovered (id 4250)',
    p3Exact.length === 1 && p3Exact[0].id === 4250,
  );

  // API failure on page 2 -> integrity failure
  const apiFailPages = [fullPage(mkFullPage(5000)), { ok: false, status: 500, json: {} }];
  const apiFailFetcher = async (url) => {
    const m = /&page=(\d+)/.exec(url);
    return apiFailPages[Number(m[1]) - 1];
  };
  let apiFailErr = null;
  try {
    await lib.listAllCheckRunsForRefWithFetcher(apiFailFetcher, paginatorInput);
  } catch (e) {
    apiFailErr = e.message;
  }
  checkRaw(
    '§16 real paginator: page-2 API failure -> INTEGRITY FAILURE',
    apiFailErr && /INTEGRITY FAILURE/.test(apiFailErr) && /page 2/.test(apiFailErr),
  );

  // MAX_PAGES semantics: with PAGE_SIZE=100 full pages, the raw scan cap
  // (MAX_EXACT_RUNS*4 = 2048) is arithmetically reached BEFORE MAX_PAGES=100
  // could ever fire (21 pages * 100 > 2048). Verify the dominance relation
  // and that MAX_PAGES is the loop's structural upper bound.
  checkRaw(
    '§16 raw-scan cap dominates MAX_PAGES under full-page load (arithmetic invariant)',
    lib.MAX_EXACT_RUNS * 4 < lib.MAX_PAGES * lib.PAGE_SIZE,
  );
  // Actual loop-iteration count check: fetcher returning full pages runs until
  // the raw cap fires; count must be strictly less than MAX_PAGES.
  let pageCalls = 0;
  const loopBoundFetcher = async () => {
    pageCalls++;
    return fullPage(mkFullPage(6000 + pageCalls * 100));
  };
  try {
    await lib.listAllCheckRunsForRefWithFetcher(loopBoundFetcher, paginatorInput);
  } catch {
    /* raw-cap integrity failure expected */
  }
  checkRaw(
    '§16 real paginator: fetcher actually invoked N<MAX_PAGES times before raw-cap halt (loop executed)',
    pageCalls > 1 && pageCalls < lib.MAX_PAGES,
  );

  // Raw scan cap crossed -> integrity failure BEFORE MAX_PAGES (MAX_EXACT_RUNS*4 = 2048).
  // Full pages of 100 rows: 2048/100 = 20.48 -> crossed after 21st page (2100 > 2048).
  let capCalls = 0;
  const capFetcher = async () => {
    capCalls++;
    return fullPage(mkFullPage(7000 + capCalls * 100));
  };
  let capErr = null;
  try {
    await lib.listAllCheckRunsForRefWithFetcher(capFetcher, paginatorInput);
  } catch (e) {
    capErr = e.message;
  }
  checkRaw(
    '§16 real paginator: raw-scan sanity ceiling crossed -> INTEGRITY FAILURE',
    capErr && /sanity ceiling/.test(capErr) && capCalls < lib.MAX_PAGES,
  );

  // Response-shape failure -> integrity failure
  const badShapeFetcher = async () => ({ ok: true, status: 200, json: { not_check_runs: [] } });
  let shapeErr = null;
  try {
    await lib.listAllCheckRunsForRefWithFetcher(badShapeFetcher, paginatorInput);
  } catch (e) {
    shapeErr = e.message;
  }
  checkRaw(
    '§16 real paginator: unexpected response shape -> INTEGRITY FAILURE',
    shapeErr && /unexpected check-runs response shape/.test(shapeErr),
  );

  // ==== §10 PREEXISTING DUPLICATE SUCCESS ATTACK — canonicalization ========
  const threePriorSuccess = [
    runOn({ id: 101, headSha: ACCEPTED_HEAD, externalId: eid, name: lib.CHECK_NAME }),
    runOn({ id: 202, headSha: ACCEPTED_HEAD, externalId: eid, name: lib.CHECK_NAME }),
    runOn({ id: 303, headSha: ACCEPTED_HEAD, externalId: eid, name: lib.CHECK_NAME }),
  ];
  const canonPass = simulateRunLifecycle({
    lib,
    headSha: ACCEPTED_HEAD,
    priorRuns: threePriorSuccess,
    revocableResult: { ok: true },
  });
  checkRaw(
    '§10 3-way duplicate reset ALL to in_progress before validate',
    canonPass.events.some((e) => e.step === 'reset-all' && e.ids.length === 3),
  );
  checkRaw('§10 canonical chosen = 303 (highest numeric)', canonPass.canonicalId === 303);
  checkRaw(
    '§10 renamed all noncanonical [101,202] BEFORE canonical success',
    (() => {
      const rIdx = canonPass.events.findIndex((e) => e.step === 'rename-all');
      const cIdx = canonPass.events.findIndex((e) => e.step === 'canonical-success');
      return rIdx > -1 && cIdx > -1 && rIdx < cIdx;
    })(),
  );
  const canonPassRequired = requiredContextExact({
    lib,
    simState: canonPass.simState,
    externalId: canonPass.externalId,
    headSha: ACCEPTED_HEAD,
  });
  checkRaw(
    '§6 exactly ONE required-context exact run remains (canonical)',
    canonPassRequired.length === 1 && Number(canonPassRequired[0].id) === 303,
  );
  checkRaw(
    '§6 exactly ONE required-context SUCCESS published',
    requiredContextSuccessCount({
      lib,
      simState: canonPass.simState,
      externalId: canonPass.externalId,
      headSha: ACCEPTED_HEAD,
    }) === 1,
  );
  checkRaw(
    '§4 noncanonical duplicates renamed to trusted-a2-authority/duplicate/<id>',
    canonPass.simState.get(101).name === 'trusted-a2-authority/duplicate/101' &&
      canonPass.simState.get(202).name === 'trusted-a2-authority/duplicate/202',
  );
  checkRaw(
    '§5 renamed duplicates carry non-success conclusion (failure)',
    canonPass.simState.get(101).conclusion === 'failure' &&
      canonPass.simState.get(202).conclusion === 'failure',
  );

  // ==== §11 validation failure -> ALL non-success, no canonical special-case ===
  const canonFail = simulateRunLifecycle({
    lib,
    headSha: ACCEPTED_HEAD,
    priorRuns: threePriorSuccess,
    revocableResult: { ok: false, error: 'head pin failed' },
  });
  const canonFailRequired = requiredContextExact({
    lib,
    simState: canonFail.simState,
    externalId: canonFail.externalId,
    headSha: ACCEPTED_HEAD,
  });
  checkRaw(
    '§11 validation FAIL: all 3 exact runs end non-success',
    canonFailRequired.length === 3 && canonFailRequired.every((r) => r.conclusion === 'failure'),
  );
  checkRaw(
    '§11 no required-context SUCCESS after validation FAIL',
    requiredContextSuccessCount({
      lib,
      simState: canonFail.simState,
      externalId: canonFail.externalId,
      headSha: ACCEPTED_HEAD,
    }) === 0,
  );

  // ==== §12 PARTIAL-FINALIZER ATTACK (SOL REPRODUCER) =====================
  // Case A: canonical=202, duplicate=101. Rename 101 succeeds; canonical 202 success PATCH fails.
  const solA = simulateRunLifecycle({
    lib,
    headSha: ACCEPTED_HEAD,
    priorRuns: [
      runOn({ id: 101, headSha: ACCEPTED_HEAD, externalId: eid, name: lib.CHECK_NAME }),
      runOn({ id: 202, headSha: ACCEPTED_HEAD, externalId: eid, name: lib.CHECK_NAME }),
    ],
    revocableResult: { ok: true },
    canonicalFail: true,
  });
  checkRaw(
    '§12A canonical success PATCH failure -> integrity event emitted',
    solA.events.some((e) => e.step === 'canonical-integrity-failure'),
  );
  checkRaw(
    '§12A canonical 202 NEVER receives success',
    solA.simState.get(202).conclusion !== 'success',
  );
  checkRaw(
    '§12A NO required-context SUCCESS anywhere',
    requiredContextSuccessCount({
      lib,
      simState: solA.simState,
      externalId: solA.externalId,
      headSha: ACCEPTED_HEAD,
    }) === 0,
  );
  checkRaw(
    '§17 sequential fidelity: earlier duplicate rename PATCH RETAINED (101 stays renamed)',
    solA.simState.get(101).name === 'trusted-a2-authority/duplicate/101' &&
      solA.simState.get(101).conclusion === 'failure',
  );

  // Case B: duplicates=[101,202], canonical=303. Rename 101 OK; rename 202 FAILS; canonical 303 must NOT become success.
  const solB = simulateRunLifecycle({
    lib,
    headSha: ACCEPTED_HEAD,
    priorRuns: threePriorSuccess,
    revocableResult: { ok: true },
    renameFailIds: [202],
  });
  checkRaw(
    '§12B rename integrity failure emitted before canonical success',
    solB.events.some((e) => e.step === 'rename-integrity-failure') &&
      !solB.events.some((e) => e.step === 'canonical-success'),
  );
  checkRaw(
    '§12B canonical 303 NEVER promoted to success',
    solB.simState.get(303).conclusion !== 'success' &&
      solB.simState.get(303).name === lib.CHECK_NAME,
  );
  // Now the required-context set: 202 was NOT renamed (rename failed), 303 was NOT promoted -> at least 2 required-name runs, none success.
  checkRaw(
    '§12B NO required-context SUCCESS published',
    requiredContextSuccessCount({
      lib,
      simState: solB.simState,
      externalId: solB.externalId,
      headSha: ACCEPTED_HEAD,
    }) === 0,
  );
  checkRaw(
    '§17 sequential fidelity: earlier rename of 101 RETAINED despite later 202 failure',
    solB.simState.get(101).name === 'trusted-a2-authority/duplicate/101' &&
      solB.simState.get(101).conclusion === 'failure',
  );

  // ==== §8 partial RESET failure -> halt before validation ==================
  const partialReset = simulateRunLifecycle({
    lib,
    headSha: ACCEPTED_HEAD,
    priorRuns: threePriorSuccess,
    revocableResult: { ok: true },
    resetFailIds: [202],
  });
  checkRaw(
    '§8 partial RESET failure classified integrity + halt before validate',
    partialReset.events.some((e) => e.step === 'reset-integrity-failure') &&
      !partialReset.events.some((e) => e.step === 'validate'),
  );

  // ==== §7 FAIL-path partial finalize -> integrity + no success ============
  const failPathPartial = simulateRunLifecycle({
    lib,
    headSha: ACCEPTED_HEAD,
    priorRuns: threePriorSuccess,
    revocableResult: { ok: false, error: 'authority unavailable' },
    finalizeFailIds: [202],
  });
  checkRaw(
    '§7 FAIL-path partial finalize classified integrity failure',
    failPathPartial.events.some((e) => e.step === 'finalize-integrity-failure'),
  );
  checkRaw(
    '§7 FAIL-path partial finalize: NO required-context success',
    requiredContextSuccessCount({
      lib,
      simState: failPathPartial.simState,
      externalId: failPathPartial.externalId,
      headSha: ACCEPTED_HEAD,
    }) === 0,
  );
  checkRaw(
    '§17 FAIL-path sequential fidelity: earlier successful failure-PATCH retained',
    failPathPartial.simState.get(101).status === 'completed' &&
      failPathPartial.simState.get(101).conclusion === 'failure',
  );

  // ==== issuer availability ================================================
  const noCreds = simulateRunLifecycle({
    lib,
    headSha: ACCEPTED_HEAD,
    priorRuns: [],
    revocableResult: { ok: true },
    appCredsPresent: false,
  });
  checkRaw(
    '§8 no App creds -> abort with AVAILABILITY FAILURE',
    noCreds.events.some((e) => e.error && e.error.includes('AVAILABILITY')),
  );
  const listFails = simulateRunLifecycle({
    lib,
    headSha: ACCEPTED_HEAD,
    priorRuns: [],
    revocableResult: { ok: true },
    listThrows: 'TRUSTED ISSUER INTEGRITY FAILURE: check-runs list failed',
  });
  checkRaw(
    '§16 pagination failure -> abort before reset',
    listFails.events.some((e) => e.error && e.error.includes('INTEGRITY')),
  );

  // ==== §15 FUTURE RERUN — after canonicalization, next enumeration finds ONE ====
  // Reload prior runs from the previous simulation's simState and rerun. The
  // renamed duplicates no longer have `name = CHECK_NAME`, so exact filter
  // finds only the canonical (303). Result: single-element equivalence class.
  const futurePrior = Array.from(canonPass.simState.values());
  const futureExact = lib.findAllExactRuns({
    runs: futurePrior,
    appId: APP_ID,
    checkName: lib.CHECK_NAME,
    externalId: eid,
    headSha: ACCEPTED_HEAD,
  });
  checkRaw(
    '§15 future rerun: only canonical (303) enters exact required-name set',
    futureExact.length === 1 && Number(futureExact[0].id) === 303,
  );
  const futureRerun = simulateRunLifecycle({
    lib,
    headSha: ACCEPTED_HEAD,
    priorRuns: futurePrior,
    revocableResult: { ok: true },
  });
  checkRaw(
    '§15 future rerun: no duplicate explosion (1 exact run, 0 duplicates renamed)',
    futureRerun.events.some(
      (e) => e.step === 'reset-all' && e.ids.length === 1 && e.ids[0] === 303,
    ) &&
      (!futureRerun.duplicateIds || futureRerun.duplicateIds.length === 0),
  );

  // ==== new head H2 gets its own check =====================================
  const H2 = 'a'.repeat(40);
  const newHead = simulateRunLifecycle({
    lib,
    headSha: H2,
    priorRuns: threePriorSuccess,
    revocableResult: { ok: false, error: 'head pin failed' },
  });
  checkRaw(
    'new head H2 creates new check (not reusing H runs)',
    newHead.events.some((e) => e.step === 'create-new'),
  );

  // ==== retained: revocable selectors + rejected 68269bb ====================
  check(
    'revocable: accepted head + accepted base',
    lib.verifyRevocableSelectors({
      prHeadSha: ACCEPTED_HEAD,
      acceptedA2Head: ACCEPTED_HEAD,
      acceptedAuthorityBaseSha: ACCEPTED_BASE,
    }).ok,
    true,
  );
  check(
    'revocable: blank accepted A2 head fail closed',
    lib.verifyRevocableSelectors({
      prHeadSha: ACCEPTED_HEAD,
      acceptedA2Head: '',
      acceptedAuthorityBaseSha: ACCEPTED_BASE,
    }).ok,
    false,
  );
  check(
    'revocable: rejected 68269bb',
    lib.verifyRevocableSelectors({
      prHeadSha: ACCEPTED_HEAD,
      acceptedA2Head: ACCEPTED_HEAD,
      acceptedAuthorityBaseSha: REJECTED_BASE,
    }).ok,
    false,
  );

  // ==== §7 post-reset failure routes to ALL-runs failure ====================
  const failureCauses = [
    { label: 'head-pin failure', r: { ok: false, error: 'PR head != accepted' } },
    { label: 'rejected 68269bb', r: { ok: false, error: 'authority base is REJECTED 68269bb' } },
    { label: 'runtime declaration invalid', r: { ok: false, error: 'runtime key set mismatch' } },
    { label: 'validation exception', r: { ok: false, error: 'validation exception: throw' } },
    { label: 'no result (finalizer default)', r: undefined },
  ];
  for (const fc of failureCauses) {
    const sim = simulateRunLifecycle({
      lib,
      headSha: ACCEPTED_HEAD,
      priorRuns: threePriorSuccess,
      revocableResult: fc.r,
    });
    const req = requiredContextExact({
      lib,
      simState: sim.simState,
      externalId: sim.externalId,
      headSha: ACCEPTED_HEAD,
    });
    checkRaw(
      '§7 post-reset "' + fc.label + '" -> ALL exact runs failure, 0 success',
      req.length === 3 &&
        req.every((r) => r.conclusion === 'failure') &&
        requiredContextSuccessCount({
          lib,
          simState: sim.simState,
          externalId: sim.externalId,
          headSha: ACCEPTED_HEAD,
        }) === 0,
    );
  }

  // ==== builder purity ======================================================
  const now = 1_700_000_000;
  const jwt = lib.buildAppJwt(String(APP_ID), now);
  checkRaw('App JWT within 10min window', jwt.payload.exp - jwt.payload.iat <= 600);
  const inprog = lib.buildInProgressBody({
    name: lib.CHECK_NAME,
    headSha: ACCEPTED_HEAD,
    externalId: eid,
    startedAt: 'x',
  });
  checkRaw(
    'in_progress body carries external_id + head',
    inprog.external_id === eid &&
      inprog.head_sha === ACCEPTED_HEAD &&
      inprog.status === 'in_progress' &&
      !('conclusion' in inprog),
  );
  const done = lib.buildCompletedBody({
    name: lib.CHECK_NAME,
    headSha: ACCEPTED_HEAD,
    externalId: eid,
    completedAt: 'y',
    conclusion: 'failure',
    title: 't',
    summary: 's',
  });
  checkRaw(
    'completed body carries conclusion + external_id',
    done.conclusion === 'failure' && done.external_id === eid && done.status === 'completed',
  );
  const dup = lib.buildDuplicateFailureBody({
    id: 101,
    headSha: ACCEPTED_HEAD,
    externalId: eid,
    completedAt: 'z',
    canonicalId: 303,
  });
  checkRaw(
    'duplicate body renames + non-success conclusion + notes canonical',
    dup.name === 'trusted-a2-authority/duplicate/101' &&
      dup.status === 'completed' &&
      dup.conclusion === 'failure' &&
      /canonical run id = 303/.test(dup.output.summary),
  );
  checkRaw(
    'concludeFromValidation(true)=success / (false)=failure',
    lib.concludeFromValidation(true) === 'success' &&
      lib.concludeFromValidation(false) === 'failure',
  );
  checkRaw('check name is head-bound', lib.CHECK_NAME === 'trusted-a2-authority/head');
  checkRaw(
    'DUPLICATE_NAME_PREFIX distinct from CHECK_NAME',
    lib.DUPLICATE_NAME_PREFIX.startsWith('trusted-a2-authority/duplicate/') &&
      !lib.DUPLICATE_NAME_PREFIX.startsWith(lib.CHECK_NAME + '/') &&
      lib.duplicateNameFor(1) !== lib.CHECK_NAME,
  );
  checkRaw(
    'sanity ceilings exposed',
    typeof lib.MAX_EXACT_RUNS === 'number' &&
      lib.MAX_EXACT_RUNS >= 128 &&
      typeof lib.MAX_PAGES === 'number' &&
      typeof lib.PAGE_SIZE === 'number',
  );

  // ---- report ----
  const pad = (s, n) => (s + ' '.repeat(n)).slice(0, n);
  console.log(
    '\nTRUSTED-A2 AUTHORITY v2 (canonical-single-success patch) — LOCAL DIAGNOSTIC MATRIX',
  );
  console.log('-'.repeat(120));
  for (const r of rows)
    console.log(
      pad(r.verdict, 6) +
        pad('want=' + r.want, 11) +
        pad('got=' + r.got, 12) +
        r.label +
        (r.detail ? '  (' + r.detail + ')' : ''),
    );
  console.log('-'.repeat(120));
  console.log('PASSED ' + passed + '  FAILED ' + failed);
  if (!pinOk)
    console.log(
      'INTEGRITY PIN MISMATCH: update PINNED_REGION_SHA256 only for an intended logic change.',
    );
  process.exit(failed === 0 ? 0 : 1);
}

await main();

# PRE-A2 Trusted Authority Bootstrap — v2 (bounded patch on e7fb49b)

Bounded corrective on top of `e7fb49b` (preserved; not amended, not squashed).
Replacement of the earlier REJECTED `ec598b8` (also preserved as audit evidence).
Security infrastructure only — no A2 application/domain/persistence/service/test
code; `ci.yml` (`verify`, `authority-gate`) is byte-untouched.

## What this patch fixes

| ID | Fix |
|---|---|
| **[HIGH] Stale same-head SUCCESS** | Lifecycle re-ordered so the trusted head check is **reset to `in_progress` FIRST** (before any revocable validation). A single `Finalize` step always concludes the SAME App check `success` or `failure` — an old success on head H cannot survive a failed rerun on H. |
| **[MED] Same-repository policy** | Explicit predicate `pull_request.head.repo.full_name == github.repository` in the pre-check step, evaluated **before** any App credential is touched. Fork PRs are rejected fail-closed with no App/API contact. |
| **[MED] Ambiguous duplicate check runs** | Every trusted run has a deterministic `external_id` = `pagamenos:trusted-a2-authority:<repositoryId>:pr-<number>:<headSha>`. On rerun we list App-owned check runs for the exact head SHA + exact check name, select the matching `external_id` from OUR App only, and RESET that same run. Only if none exists do we create a new one. A same-name run from another App/source is never adopted. |
| **[MED] Installation-token narrowing** | The token request explicitly narrows to `repository_ids: [<this repo>]` with `permissions: { checks: 'write', metadata: 'read' }`, in addition to installing the App on this one repository only. |

## Lifecycle (§C, exact order)

```
[STEP 1] pre-check (immutable event data ONLY):
           event == pull_request_target
           PR number is a positive integer
           PR head SHA is exact 40-hex
           github.repository is valid "owner/name"
           SAME-REPOSITORY: pr.head.repo.full_name == github.repository
         FAIL here => job aborts. No App credential touched. No API call.

[STEP 2] App auth + head-check reset/open (BEFORE revocable validation):
           mint short-lived installation token (narrowed to this repo,
             checks:write + metadata:read)
           list App-owned check runs on exact head SHA + exact check name
           select ONLY App-owned + external_id match
           if match: PATCH -> status=in_progress
           else:     POST  -> status=in_progress
         FAIL here => TRUSTED ISSUER AVAILABILITY FAILURE (job fails,
           previously-completed check is not touched by us).

[STEP 3] revocable validation (any exception is CAPTURED, not thrown out):
           accepted-head equality (PAGAMENOS_ACCEPTED_A2_HEAD_SHA)
           accepted-authority selector (PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA,
             including explicit rejection of 68269bb)
           fetch PR head; assert fetched == event head
           fetch authority commit
           merge-base + rename-safe + NUL-safe protected-path diff
           strict runtime declaration (schema + oracle)
           authority-manifest inventory (exact four, self included)
           ledger comparison
         Any failure writes validation.json { ok:false, error }. No throw.

[STEP 4] SINGLE FINALIZER (always runs if a check was opened):
           read validation.json (missing/malformed -> failure)
           conclusion = success only if ok===true, else failure
           PATCH SAME check id -> status=completed, conclusion, external_id
         The job then exits nonzero on failure.
```

## Stale same-head success attack (§D — resolved)

```
Given: prior run on head H = { app: OUR, name: trusted-a2-authority/head,
                               external_id: E(H), status: completed, conclusion: success }

Rerun on H (e.g. after PAGAMENOS_ACCEPTED_A2_HEAD_SHA rotation):
  STEP 1: pre-check passes
  STEP 2: list check runs for H, name=trusted-a2-authority/head
          -> match by (App=OUR, name, external_id=E(H))
          -> PATCH id -> status=in_progress   ← old SUCCESS is now overwritten
  STEP 3: revocable head-pin check fails (H != new accepted head)
          -> validation.json = { ok:false, error:"head pin failed" }
  STEP 4: PATCH SAME id -> status=completed, conclusion=failure

Result on H: SAME run, conclusion=failure. No surviving effective success.
```

The lifecycle harness proves this exactly (`§D stale-success attack …` rows in
the matrix), for both "prior=success" and "prior=in_progress" starting states.

## Existing-run identity (§E)

* **App:** `app.id === PAGAMENOS_TRUSTED_GATE_APP_ID` (we never adopt another App/source).
* **Check name:** `trusted-a2-authority/head`.
* **`external_id`:** `pagamenos:trusted-a2-authority:<repositoryId>:pr-<number>:<headSha>` — deterministic per (repo, PR#, head).
* **`head_sha`:** exact lowercase 40-hex `github.event.pull_request.head.sha`.

## Failure finalizer (§F/§7)

Every post-reset failure routes through STEP 4 and becomes App conclusion
`failure` on the SAME run. Proven in the harness for: head-pin failure,
malformed accepted authority SHA, rejected `68269bb`, authority commit
unavailable, PR fetch mismatch, protected path, runtime declaration invalid,
manifest inventory failure, ledger mismatch, validation exception, and
"validation produced no result" (finalizer default = failure).

## App/API failure distinction (§8)

If the App itself cannot authenticate or cannot open/PATCH the check, the job
fails as `TRUSTED ISSUER AVAILABILITY FAILURE`. We do **not** claim scientific
validation invalidated an existing check. In particular:

* Changing `PAGAMENOS_ACCEPTED_A2_HEAD_SHA` or `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA` is **not** an event on any PR; it does not by itself invalidate any existing GitHub check.
* After such a change on an already-open same-head PR, the operator MUST trigger a trusted-gate rerun (`synchronize`, close/reopen, or a re-run of the workflow), which then resets the existing App check to `in_progress` and finalizes `success` or `failure` as above.
* Revoking the App credential does not magically invalidate an existing check; the check-run object persists until PATCHed by an authorized token.

## Corrected bootstrap ceremony (§12 — exact order)

1. Sol accepts the corrected bootstrap commit SHA.
2. Push the exact accepted bootstrap branch.
3. Integrate the exact accepted bootstrap SHA INTO `m3.5b-a2-integration` using the currently accepted controls.
4. Verify the trusted workflow file **exists on `m3.5b-a2-integration`**.
5. **Only then** change the repository default branch to `m3.5b-a2-integration`.
6. Confirm `m3.5b-a2-integration` is now BOTH the repository default branch AND the intended A2 PR base branch.
7. Create/install the dedicated GitHub App (Checks: write, Metadata: read) **on this one repository only**.
8. Configure the `trusted-a2-gate` environment.
9. Configure its **deployment branch restriction = `m3.5b-a2-integration`**.
10. Configure App private key (env secret `PAGAMENOS_TRUSTED_GATE_APP_PRIVATE_KEY`) and App ID (env/repo variable `PAGAMENOS_TRUSTED_GATE_APP_ID`).
11. Perform **real trusted-gate activation tests** (see §Activation below).
12. Configure ruleset required check `trusted-a2-authority/head` with the dedicated App as **expected source**.
13. Keep `verify` + `authority-gate` required.
14. Configure repository path restrictions on `.github/workflows/**` (and keep `scripts-trusted/**` gate-protected) for `m3.5b-a2-integration`, no routine bypass.
15. **Only after** successful activation, resume the A2 merge ceremony.

Do NOT ever "install the workflow on the current default branch, then change the default" — the workflow must first exist in `m3.5b-a2-integration`.

## `GITHUB_REF` (§13/§14) — operational invariant

We do **not** rely on resolving GitHub's documentation wording discrepancy about
`pull_request_target`'s ref context. Instead, the design rests on this operational
invariant:

> **Before activation, `m3.5b-a2-integration` MUST be BOTH:**
> **1. the repository default branch, AND**
> **2. the intended A2 PR base branch.**

Whether the trusted context is described as "default branch" or "base branch" in
any given source, both resolve to the same branch under this invariant, so the
environment's branch restriction (`m3.5b-a2-integration`) admits exactly the
trusted context.

**Activation check (mandatory, on the real GitHub run):** verify the live
workflow observes `GITHUB_REF == refs/heads/m3.5b-a2-integration` before
trusting the environment boundary. This has **not** been observed locally in this
offline patch.

## Environment (§14)

* **Environment:** `trusted-a2-gate`.
* **Secret:** `PAGAMENOS_TRUSTED_GATE_APP_PRIVATE_KEY`.
* **Variable:** `PAGAMENOS_TRUSTED_GATE_APP_ID`.
* **Branch restriction:** `m3.5b-a2-integration` only.
* **No secret value is logged** during activation verification (the workflow logs only `GITHUB_REF` presence and the outcome of `mintInstallationToken`, never key material).

## GitHub App installation scope (§15)

* Install the App on this **one** PagaMenos repository only.
* App permissions **only**: Checks: write; Metadata: read.
* Installation token creation is explicitly narrowed to `repository_ids: [<this repo id>]` and the same two permissions (see `mintInstallationToken`).
* No contents write; no PR/issue write; no administration write.

## Real activation tests (§18 — user must perform on real GitHub, NOT self-claimed here)

Do **not** self-claim any of the following. They require the live GitHub
environment and are the operator's responsibility during activation:

1. GitHub accepts `completed -> in_progress` PATCH on our check run.
2. The ruleset admits `trusted-a2-authority/head` from our dedicated App as the
   **expected source** (and no other source can satisfy it).
3. Duplicate/rerun semantics behave as modeled here (single logical run per
   `external_id`; a stale success on H is overwritten by a subsequent failing
   rerun on the same H).
4. Live `GITHUB_REF == refs/heads/m3.5b-a2-integration` when the environment gate
   is evaluated.

The bootstrap patch is **code-accepted pending** these operational tests.

## Retained (do not regress — §16)

`pull_request_target` from default-branch definition; no candidate code
execution; inline trusted verifier (materialized once from workflow content into
`$RUNNER_TEMP`); exact external authority; four-file manifest inventory;
structural `68269bb` rejection; strict runtime declaration; exact A2 head pin;
rename/NUL-safe protected-path diff; protected `scripts-trusted/**`; GitHub App
head-bound Check Run; expected-source ruleset design.

## Default-branch observation (v2 report §17, unchanged)

Codex Sol observed the current remote default branch as
`m3.5b-a2-authority-bootstrap-v2` — **not `master`**. This was not re-verified
in this offline patch. Operational target remains `m3.5b-a2-integration` (see
the ceremony above).

## Local diagnostics

```bash
node scripts-trusted/trusted-a2-authority.harness.mjs
```

Exit 0 = integrity pin + full PASS/FAIL matrix (incl. lifecycle simulation,
stale-success attack, fork-PR rejection, existing-run selection, post-reset
failure routing, JWT + body builders) green.

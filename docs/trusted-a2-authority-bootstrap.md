# PRE-A2 Trusted Authority Bootstrap — v2

Replacement for the **REJECTED** bootstrap `ec598b8` (preserved as audit
evidence). Security infrastructure only — **no A2 application/domain/persistence/
service/test code**, no A2 runtime manifest. `ci.yml` (`verify`, `authority-gate`)
is untouched; this gate is additive and independent.

## Why v1 was rejected

1. **Required-status SHA mismatch.** v1 implied its own `pull_request_target`
   Actions job (`trusted-a2-authority`) could be used as an ordinary PR-head
   required status check. It cannot: a `pull_request_target` job's check is
   associated with the trusted/default-branch context, **not the PR head**, so it
   does not provide head-bound merge enforcement.
2. **Rename-out bypass.** v1 used `git diff --name-only`, which is rename-blind:
   renaming a protected file *out* of a protected directory slipped past the
   boundary.
3. **`68269bb` inventory defect.** v1's authority check compared only the ledger
   and digest. The rejected baseline `68269bb` has a **byte-identical ledger and
   identical tree**, but its `AUTHORITY_BASELINE_MANIFEST_V1.json.authorityFiles`
   **omits the manifest self-entry** (three files instead of four). v1 accepted it.

## What v2 fixes

| Fix | Mechanism |
|---|---|
| Head-bound enforcement | A dedicated **GitHub App** publishes a separate check run `trusted-a2-authority/head` on the exact PR head. The `pull_request_target` job is **not** the required check. |
| Rename/NUL safety | `git diff --no-renames --name-only -z` + NUL-delimited parse; rename-out surfaces the OLD protected path as a delete. Protected prefixes now include `scripts-trusted/**`. |
| Authority inventory | Strict `authorityFiles` check: exactly the accepted four entries (manifest self-entry included), no missing/extra/duplicate → `84a7a1a` PASS, `68269bb` FAIL. Plus a defense-in-depth explicit `68269bb` guard. |

## Retained sound properties (from v1)

`pull_request_target` (definition from default branch); no execution of PR code;
PR content read only via `git show <headSHA>:<fixed path>` and `JSON.parse`d as
inert data; protected historical authority SHA; strict runtime-declaration
schema; exact A2 head pin; external historical ledger comparison; least
privilege (`contents: read`).

## Trusted validator location

The security-critical comparison logic is materialized **once** from inline
workflow content into `$RUNNER_TEMP/trusted-a2-lib.cjs` (never a repo file a
candidate could touch) and is bounded by
`===BEGIN/END TRUSTED-A2 TRUSTED LOGIC===`. The local harness extracts that exact
region, **pins its normalized SHA-256**, and runs it — so silent drift fails the
harness. `scripts-trusted/**` is a protected path, so a candidate cannot alter the
harness either. The harness is test-only; it is not part of the runtime trust
root.

## Strict runtime-declaration schema

Exact key set `{declarationVersion, corpusId, corpusSemanticProjectionVersion,
corpusSemanticDigest}` — no missing/extra keys; each a non-empty string (no
null/number/array coercion); exact `declarationVersion`; `corpusId` grammar +
equality to the required historical corpus; exact projection version;
`sha256:<64-hex>` digest grammar.

**JSON duplicate-key note (accurate):** both the runtime and the trusted gate
consume *parsed* JSON object semantics (`JSON.parse`), under which a duplicate
key resolves to its last occurrence. V4.5 does not require canonical *textual*
key-uniqueness for this declaration, so the gate does **not** claim textual
uniqueness — it validates the parsed object. (The corpus **projection** digest,
which does rely on canonicalization, is a separate accepted mechanism verified via
the ledger digest, not re-derived here.)

## Historical manifest inventory (proof)

Required `authorityFiles` (exact set, exactly four, no dup/missing/extra, self
included):

```
authority/v1/AUTHORITY_BASELINE_MANIFEST_V1.json
authority/v1/CORPUS_RELEASE_LEDGER_V1.json
authority/v1/HOLIDAY_CALENDAR_REGISTRY_V1.json
authority/v1/holiday-calendar/pagamenos.holiday.pe-lima-callao.private-commerce.v1.json
```

* `84a7a1a30545b1c61ce2b372a95da9005ea46b6c` → **PASS** (four entries, self included)
* `68269bb5acad77bb6e8dc1644bb32d29ef485d31` → **FAIL** (three entries, self-entry omitted)

## GitHub App head-bound check issuer

| Property | Value |
|---|---|
| Check name | `trusted-a2-authority/head` (distinct from the Actions job name) |
| Bound to | `github.event.pull_request.head.sha` (exact accepted head) |
| Sequence | in_progress **before** validation → conclude success only on full PASS; failure otherwise |
| API | `GET /repos/{o}/{r}/installation` → `POST /app/installations/{id}/access_tokens` → `POST/PATCH /repos/{o}/{r}/check-runs` |
| Token lifetime | short-lived installation token, minted per run (re-minted for the conclude step) |
| Stale-head safety | each run creates the check on the **current** head; a `synchronize` head must re-pass; a success on an OLD sha never satisfies a NEW sha |

### GitHub App permissions (minimum)

* **Checks: write** — publish the head-bound check.
* **Metadata: read** — required baseline.
* No contents write, no PR/issue write, no administration. Git reads use the
  workflow's existing `contents: read` token; the App is used **only** to publish
  the trusted check.

## Environment trust boundary

* **Environment:** `trusted-a2-gate`.
* **Secret:** `PAGAMENOS_TRUSTED_GATE_APP_PRIVATE_KEY` (App private key) — an
  **environment** secret, not an ordinary repo secret.
* **Variable:** `PAGAMENOS_TRUSTED_GATE_APP_ID` (App ID).
* **Branch restriction:** the environment's deployment-branch rule must allow only
  `m3.5b-a2-integration`.
* **`GITHUB_REF` semantics (critical):** for `pull_request_target`, `github.ref` is
  the **base** branch ref (the PR target = `m3.5b-a2-integration`), **not** the PR
  head. Environment branch policies evaluate `github.ref`, so restricting the
  environment to `m3.5b-a2-integration` admits only the trusted base context. The
  untrusted PR head never controls `github.ref`, so it cannot satisfy the
  environment gate and therefore cannot reach the App private key.

**Why the candidate cannot obtain the credential:** it is not in an ordinary repo
secret (so a candidate `pull_request` / same-repo push workflow cannot read it);
it is gated by the `trusted-a2-gate` environment whose branch policy admits only
the base branch; the trusted workflow definition comes from the default branch
(candidate edits do not run); and `.github/workflows/**` + `scripts-trusted/**`
are protected paths (candidate cannot add a workflow/helper to exfiltrate it).

## Candidate-code execution audit

Every PR-controlled input is: a **validated 40-hex SHA / integer** before any git
use; **inert JSON** read from a fixed trusted path via `git show`; or **inert
path strings** from `git diff -z`. No PR-controlled value is interpolated into
`eval`, shell construction, JS source, an executable path, `require`/`import`, or
an action ref. No `pnpm/npm`/package scripts, no candidate `require()`, no
candidate Actions.

## Two protection layers (do not conflate)

* **A. Trusted workflow validation** — the `pull_request_target` job runs the
  candidate-independent checks. (This job's own Actions check is *not* the merge
  gate.)
* **B. Head-bound trusted App check** — `trusted-a2-authority/head`, minted by the
  dedicated GitHub App on the exact PR head, is the artifact the branch ruleset
  requires with the App as the expected source.

## Default branch — observed fact (§17)

Codex Sol observed the current remote default branch as
**`m3.5b-a2-authority-bootstrap-v2`**. This was **not** independently re-verified
in this offline run (`refs/remotes/origin/HEAD` is unset locally and
`git remote show` needs network). It is **not** `master`. The operational target
remains `m3.5b-a2-integration`.

## Required GitHub operational setup (user — after Sol accepts bootstrap v2)

Perform in order; none is automated from the local environment:

1. **Create & install** a dedicated GitHub App (Checks: write, Metadata: read) on
   the repository.
2. **Configure the `trusted-a2-gate` environment**: add secret
   `PAGAMENOS_TRUSTED_GATE_APP_PRIVATE_KEY` and variable
   `PAGAMENOS_TRUSTED_GATE_APP_ID`; set its deployment-branch rule to
   `m3.5b-a2-integration` only.
3. **Install this trusted workflow on the default branch** (see step 4).
4. **Make `m3.5b-a2-integration` the repository default branch** (so
   `pull_request_target` uses this definition). Do not alter `master`; do not
   merge A2 into `master`.
5. **Emit one real trusted check** (open/refresh an A2 PR) so
   `trusted-a2-authority/head` exists as a selectable check source.
6. **Configure the ruleset** to require `trusted-a2-authority/head` with the
   **dedicated App as the expected source**, alongside `verify` and
   `authority-gate`. Do not require the `pull_request_target` job itself.
7. **Add path restrictions**: restrict changes to `.github/workflows/**` (and keep
   `scripts-trusted/**` protected via the gate) on `m3.5b-a2-integration`, no
   routine bypass.
8. Set `PAGAMENOS_ACCEPTED_A2_HEAD_SHA` **only after** Sol accepts a specific A2
   candidate SHA. `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA` stays `84a7a1a…`.

## Local diagnostics

```bash
node scripts-trusted/trusted-a2-authority.harness.mjs
```

Exit 0 = integrity pin + full PASS/FAIL matrix (incl. rename-out, `68269bb`
inventory, verifier-mutation, App request construction) green.

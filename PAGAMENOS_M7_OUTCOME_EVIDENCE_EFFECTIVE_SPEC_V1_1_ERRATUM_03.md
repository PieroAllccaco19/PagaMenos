# PAGAMENOS — M7 — OUTCOME + EVIDENCE — EFFECTIVE SPECIFICATION V1.1 — ERRATUM 03 (INSTALL, CATALOG-VERIFIER AND VERIFICATION-CONTRACT EXECUTABILITY)

```
AUTHOR CANDIDATE — NOT YET AUTHORITATIVE
NOT SELF-ACCEPTED — AWAITING INDEPENDENT AUDIT
M7-S03 REMAINS BLOCKED

ERRATUM KIND                 : EXECUTABILITY ERRATUM (narrow, occurrence-scoped)
ACCEPTED V1.1 BYTES EDITED   : NO
ACCEPTED ERRATUM 01 EDITED   : NO
ACCEPTED ERRATUM 02 EDITED   : NO
OCCURRENCES CORRECTED        : 14 (6 normative SQL occurrences in 3 of the 26 §19 fragments — F01, F11, F24;
                               5 normative prose occurrences in §18.1, §18.4 and §19.13.1; 3 verification-case rows in §25)
NEW CONSENT SEMANTICS        : 0
NEW A1 / A2 / CCA SEMANTICS  : 0
NEW B / C SEMANTICS          : 0
NEW TABLES / ENUMS / FUNCTIONS / SIGNATURES / CONSTRAINTS / INDEXES / TRIGGERS / VIEWS / ROLES / GRANTS : 0
T-IDS ADDED / REMOVED        : 0
LOCKS ADDED / REMOVED / REORDERED : 0
MANIFEST AUTHORED            : NO
SELECTOR ROTATION            : NOT PERFORMED
```

**Nature.** A documentation-only erratum candidate against the independently accepted M7 Outcome/Evidence Effective Specification V1.1, read together with the accepted and protected-integrated Erratum 01 and Erratum 02. It corrects **only** the fourteen occurrences enumerated in §4, in nine correction classes `E03-A` … `E03-I`. Each correction makes an accepted requirement executable on the accepted PostgreSQL ≥ 15 target without changing the requirement's intent: a PL/pgSQL target form PostgreSQL rejects (`E03-A`), a built-in argument type PostgreSQL cannot resolve (`E03-B`), an install assertion whose quantified domain makes it unsatisfiable in every PostgreSQL cluster (`E03-C`), two catalog-verifier domains that include objects the accepted exact set does not and cannot enumerate (`E03-D`, `E03-E`), a default-privilege statement PostgreSQL treats as a no-op (`E03-F`), and three verification-case contracts whose expected results PostgreSQL cannot produce (`E03-G`, `E03-H`, `E03-I`). This erratum changes no runtime code, Prisma schema, migration, test, workflow, `scripts-trusted/` file, `authority/` artifact, S01 extraction artifact, repository setting or external variable. It edits neither the accepted V1.1 bytes, nor Erratum 01, nor Erratum 02, nor the CCA, nor the root register.

**Conventions.** MUST / MUST NOT / MAY are normative. "V1.1 §n" and "V1.1 line n" = `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1.md` at the exact accepted bytes of §1.2 (1-based line numbers, LF-separated). "Erratum 01" / "Erratum 02" = the accepted files of §1.2. "Register §n" = `PAGAMENOS_SPEC_AUTHORITY.md` at the baseline of §1.1. "CCA" = `PAGAMENOS_A1_A2_M7_CONSENT_COMPATIBILITY_AMENDMENT_01.md`. "Fragment F01 … F26" = the 26 normative SQL fence bodies of V1.1 §19.2–§19.13 in ascending source order, as in Erratum 02. Identifiers introduced here carry the prefix `E03-`; full-text search of the accepted V1.1, Erratum 01, Erratum 02, CCA and register bytes returns zero matches for `E03-`.

---

## 1. Exact authority baseline

### 1.1 Protected authority tip

| Item | Value |
| :-- | :-- |
| Repository | `PieroAllccaco19/PagaMenos` |
| Protected surface | `origin/m3.5b-b-integration` |
| Baseline commit | `1be2f40216ac7093962739d4312d77219ae14d4d` (PR #25 merge, *"m7-v1.1-erratum-02-root-authority-sync"*) |
| Baseline tree | `95bb58adab0139237372c7441fbf9773c1af67b1` |
| Parents, in order | 1. `b8df77538671b957b03294fee0fae40929d29bd3` — 2. `47e0076777c1a6cf4ab9bdc88306ed5b490c69c5` |
| Lineage | this erratum candidate is a single commit whose only parent is the baseline commit, adding exactly one path: this file. The rejected historical commit `a586b3119da2cc1aa4668485b129dbe625ab5cae` is not an ancestor of the baseline |

### 1.2 Immutable accepted artifacts — exact identities (not edited)

| Artifact | Git blob at the baseline | SHA-256 |
| :-- | :-- | :-- |
| `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1.md` (10 626 lines, 1 143 725 bytes) | `06e103b0d5e8cfcbb96ab21134d5605b0aae9b26` | `457f51778fb5d5890b3e3478376e413072f15aef7da88125b5e78963f49394bd` |
| `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_01.md` (604 lines, 82 027 bytes) | `15ee22090d3e37b6a63dd25914f8abb0f4fa9d4b` | `f381cb015adadc7a22463060da7ff55e8711b8ab13879c60f93cabf53eb863e8` |
| `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_02.md` (515 lines, 44 295 bytes) | `a0e6fa6720f23ac08485ab7cb696ab9ba4b7e83f` | `b7b3440ad04181356770f243a6e2870e004aba604d2a62afdefd5330c85c170f` |
| `PAGAMENOS_A1_A2_M7_CONSENT_COMPATIBILITY_AMENDMENT_01.md` | `2f0ff3c886c5ac9b1cbba797404e9024c0b83732` | `3a6003494f4817907401a9afda5b9d9a1647ade5ff9196f2aee2ba3b1b2ca1ad` |
| `PAGAMENOS_SPEC_AUTHORITY.md` (1 803 lines, 198 442 bytes) | `162e65aeb1e7ae2f4fa04da6272f814121a57ccc` | `c008e1f7f081ea2c349cbfb138be7d42d071b579869619d6985817ed2316c4e6` |

The effective M7 conformance target at the baseline is **M7 V1.1 + accepted Erratum 01 + accepted Erratum 02** (Register §14.5). This candidate controls nothing until independently accepted (§3 item 7).

### 1.3 Implementation-line artifacts consulted (not authority; not edited)

| Item | Value |
| :-- | :-- |
| Implementation line | `origin/m7-v1.1-implementation`, tip `dd5fc7278ac4fc0607aeae1fc885bb46c181968e`, tree `670b9db8f4d9b6132f982ae2f40cb851679396ec` |
| M7-S01 extraction consulted | `prisma/m7/normative/` at that tip, conformance target recorded as `M7 V1.1 + accepted Erratum 01 + accepted Erratum 02`; `EXTRACTION_INDEX.json` SHA-256 `a4313a20b8da04cf617f251a895efc2bd0ea4a5272a74d60cc18f5109419c6d0` |
| Source identity check | the V1.1, Erratum 01, Erratum 02 and register blobs at that tip are identical to §1.2 |
| Fragment fidelity | for the three affected fragments the S01 file bytes equal V1.1 lines `bodyFirstLine…bodyLastLine` (with the Erratum 02 substitutions, none of which lies in F01 or F24; F11's `E02-04` lies at V1.1 line 5442, outside every `E03` occurrence) |

These artifacts are cited only to locate fragment lines and to state informative future pins (§10). This erratum asserts no register status for any M7 implementation-line slice.

### 1.4 Provenance of the findings

A non-authoritative M7-S03 remaining-blocker diagnostic, run against implementation staging `dd5fc72…` on scratch PostgreSQL 18.4 clusters, reported the candidate findings. **That diagnostic is not authority and is not incorporated**; its identifiers are not used here. Every correction below was re-derived by this author from the accepted bytes of §1.2 and from PostgreSQL semantics applicable to the V1.1 §19.1 target (PostgreSQL ≥ 15), and every executable claim was re-checked by this author on a fresh scratch cluster (`PostgreSQL 18.4 on x86_64-windows, compiled by msvc-19.44.35227, 64-bit`) against scratch copies of the fragments with exactly the corrections of §4 applied (§9). Diagnostic findings that are not amended are dispositioned in §8.

---

## 2. Scope

### 2.1 Correction classes in scope

| Class | Subject | Occurrences |
| :-- | :-- | :-- |
| **E03-A** | PL/pgSQL composite-variable `INTO` in `m7.i_assert_control_plane` (§19.11.1) | `E03-01` |
| **E03-B** | `pg_catalog.acldefault` first-argument type in the verifier's `REL-ACL` branch (§19.13.2) | `E03-02` |
| **E03-C** | IA-06 quantified-role domain (§19.13.2 IA-06 branch; §18.4 IA-06 row) | `E03-03a`, `E03-03b` |
| **E03-D** | constraint-class domain of the verifier (PostgreSQL 18 `contype = 'n'`) (§19.13.2; §18.4 IA-11; §19.13.1) | `E03-04a`, `E03-04b`, `E03-04c` |
| **E03-E** | index domain of the verifier (PRIMARY KEY / UNIQUE backing indexes) (§19.13.2; §19.13.1) | `E03-05a`, `E03-05b` (and `E03-04b`, shared with `E03-D`) |
| **E03-F** | default EXECUTE privilege of the M7 owner (§19.2; §18.1 RS-3) | `E03-06a`, `E03-06b` |
| **E03-G** | verification case T-137 expected rows (§25.17) | `E03-07` |
| **E03-H** | verification case T-05 actor, operation and expected result (§25.2) | `E03-08` |
| **E03-I** | verification case T-82 setup (§25.9) | `E03-09` |

### 2.2 Explicitly out of scope

- any change of consent, A1, A2, CCA, B or C semantics; any table, enum, function, function signature, trigger, constraint, index, view, role, grant, lock, lock order, transaction boundary, retention, identity, digest input, manifest field, MA/IMP gate, lifecycle event or Gate-2 requirement;
- any SQL or prose outside the fourteen occurrences of §4, including the install order of §19.2, the §19.13.4 install-sequence comment and final `DO` block, `IA-14`, `T-135`, `T-133` and every other verification case;
- the S01 regeneration, any S03 work, any manifest, `authority/`, the selector and the root register (§10–§12);
- the findings of §8, each of which is dispositioned without a normative delta.

---

## 3. Reading rule and clause-scoped precedence

1. **Accepted bytes are never edited.** V1.1, Erratum 01 and Erratum 02 remain authoritative for every byte and clause except the fourteen occurrences of §4.
2. **Supersession is occurrence-scoped.** The "After" text of an `E03-*` occurrence replaces exactly its quoted "Before" lines, at exactly the named V1.1 lines. Lines outside the quoted block are unchanged. Where an "After" block is longer than its "Before" block, the extra lines are inserted immediately after the last quoted line; no line is removed or reordered.
3. **Uniqueness.** Each "Before" block occurs exactly once in the accepted V1.1 bytes, and each changed "Before" line occurs exactly once (verified; §4), so each replacement is unambiguous.
4. **Erratum 01 and Erratum 02 are unaffected** (§7): no `E03` occurrence lies on a line or in a clause they amend, and their rules (in particular Erratum 01 MD-*/MG-* and Erratum 02 `E02-01` … `E02-09`) apply unchanged to text containing the corrections.
5. **No broader doctrine.** This erratum introduces no general amendment rule. It re-opens no neighbouring statement, function, invariant, count, proof, lock profile or test.
6. **Conflict.** If this erratum and the accepted bytes appear to conflict outside the enumerated occurrences, the accepted bytes (read with Erratum 01 and Erratum 02) control, and the conflict is an erratum defect to be reported, not resolved by interpretation.
7. **Effective reading after acceptance.** Once this erratum is independently accepted, protected-integrated and synchronized into the root register, the M7 conformance target becomes **M7 V1.1 + accepted Erratum 01 + accepted Erratum 02 + accepted Erratum 03**. Until then it remains **M7 V1.1 + accepted Erratum 01 + accepted Erratum 02**, and this candidate controls nothing.

---

## 4. Occurrence map

| ID | Class | Clause | V1.1 lines quoted | Lines changed | Lines inserted | Fragment (fragment lines) |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| `E03-01` | A | §19.11.1 `m7.i_assert_control_plane` | 5233–5238 | 5233, 5235 | 2 | F11 (22–27) |
| `E03-02` | B | §19.13.2 `REL-ACL` branch | 8495–8496 | 8496 | 0 | F24 (81–82) |
| `E03-03a` | C | §19.13.2 IA-06 branch | 8605–8607 | 8607 | 0 | F24 (191–193) |
| `E03-03b` | C | §18.4 IA-06 row | 2313 | 2313 | 0 | — |
| `E03-04a` | D | §19.13.2 constraint sub-query | 8543–8545 | 8545 | 0 | F24 (129–131) |
| `E03-04b` | D, E | §18.4 IA-11 row | 2319 | 2319 | 0 | — |
| `E03-04c` | D | §19.13.1 surface table, constraints row | 8403 | 8403 | 0 | — |
| `E03-05a` | E | §19.13.2 index sub-query | 8547–8551 | 8551 | 3 | F24 (133–137) |
| `E03-05b` | E | §19.13.1 surface table, indexes row | 8404 | 8404 | 0 | — |
| `E03-06a` | F | §19.2 default privileges | 2469–2471 | 2471 | 0 | F01 (91–93) |
| `E03-06b` | F | §18.1 RS-3 | 2231 | 2231 | 0 | — |
| `E03-07` | G | §25.17 T-137 | 9639 | 9639 | 0 | — |
| `E03-08` | H | §25.2 T-05 | 9414 | 9414 | 0 | — |
| `E03-09` | I | §25.9 T-82 | 9527 | 9527 | 0 | — |

V1.1 lines amended, in ascending order: **2231, 2313, 2319, 2471, 5233, 5235, 8403, 8404, 8496, 8545, 8551, 8607, 9414, 9527, 9639** (15 lines), plus 5 inserted lines (2 after 5238, 3 after 8551). The `E03-05a` block and the `E03-04a` block are adjacent but disjoint (8543–8545 and 8547–8551).

---

## 5. Normative SQL corrections and proofs

### 5.1 `E03-01` (class E03-A) — `m7.i_assert_control_plane`, V1.1 §19.11.1

Before (V1.1 lines 5233–5238, byte-exact):

```text
DECLARE v m7.m7_control_plane_installation; v_digest text;
BEGIN
    SELECT i.*, m."manifestSha256" INTO v, v_digest
      FROM m7.m7_control_plane_installation i
      JOIN m7.m7_control_plane_manifest m ON m."manifestVersion" = i."manifestVersion"
     WHERE i."retiredAt" IS NULL;
```

After:

```text
DECLARE v m7.m7_control_plane_installation; v_digest text; r record;
BEGIN
    SELECT i AS inst, m."manifestSha256" AS digest INTO r
      FROM m7.m7_control_plane_installation i
      JOIN m7.m7_control_plane_manifest m ON m."manifestVersion" = i."manifestVersion"
     WHERE i."retiredAt" IS NULL;
    v := r.inst;
    v_digest := r.digest;
```

- the Before block occurs exactly once in the accepted V1.1 bytes;
- V1.1 line 5233: SHA-256 `20a4f4419e84d4aa1308cb0d56110600d20c82354ff47b25c5d7d07baf52e966` → `70ede5a4c24c5bbfc630e217314dd01e0abd285cbba918af52a6110e0e8254df` (+10 bytes);
- V1.1 line 5235: SHA-256 `1401edd30d920321d84e7bb4727819b1e54e1a4fa39c04994cb883c870d2f97f` → `a226cc07e3b7ce0012e461444c427cfe28874e5f753355a9c032f69f539e0f8d` (+6 bytes);
- 2 line(s) inserted after V1.1 line 5238; no line removed.

**Defect.** `v` is declared as the composite row type `m7.m7_control_plane_installation`. PL/pgSQL's `INTO` grammar (`read_into_target`) accepts a row or record variable only as the **sole** target; a row or record variable followed by `,` is rejected when the function body is compiled, with `42601 record variable cannot be part of multiple-item INTO list`. That rule predates PostgreSQL 15, so the accepted function cannot be created on any supported version, and the one-transaction install (V1.1 §19.1) aborts at F11. Reproduced on PostgreSQL 18.4 (`pl_gram.y`, `read_into_target`) against the accepted bytes.

**Correction.** The same single `SELECT` fetches the whole installation row as one composite column (`i AS inst`, the whole-row reference of alias `i`, whose type is exactly `m7.m7_control_plane_installation`) and the manifest digest (`m."manifestSha256" AS digest`) into one local `record` variable `r`; two PL/pgSQL assignments then copy the two fetched values into the unchanged variables `v` and `v_digest`.

**Proof of zero semantic delta.**

| Property | Before (intended) | After |
| :-- | :-- | :-- |
| relations read, join, predicate | `m7_control_plane_installation i` ⋈ `m7_control_plane_manifest m` on `manifestVersion`, `WHERE i."retiredAt" IS NULL` | identical `FROM`/`JOIN`/`WHERE` bytes |
| number of SQL statements against relations | 1 | 1 (the two assignments read only the in-memory `r`; they scan no relation) |
| snapshot | one statement | the same one statement |
| cardinality / `STRICT` | non-`STRICT`: first row, or all targets `NULL` when there is none; at most one row exists (partial unique index `m7_control_plane_installation_one_active`) | non-`STRICT`: `r` receives the first row, or a row of `NULL`s when there is none |
| no-row behaviour | `v."id" IS NULL` ⇒ `55000 M7_CONTROL_PLANE_MISMATCH` | `r.inst` is `NULL` ⇒ `v := NULL` sets every field of `v` to `NULL` ⇒ same test ⇒ same `55000` (verified) |
| returned value | the active installation row | `v` holds the same composite value (same type; no coercion) |
| digest comparison | `v_digest <> p_manifest_sha256` | byte-identical `IF` line |
| locks, `SECURITY INVOKER`, `search_path`, `lock_timeout`, signature, return type | — | unchanged (no locking clause before or after; header lines 5230–5232 untouched) |

`r` is a local PL/pgSQL variable, not a schema object; no function, signature or catalog object is added. The function's `prosrc` changes (§6.4).

### 5.2 `E03-02` (class E03-B) — verifier `REL-ACL` branch, V1.1 §19.13.2

Before (V1.1 lines 8495–8496, byte-exact):

```text
      CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(c.relacl, pg_catalog.acldefault(
                 CASE WHEN c.relkind = 'S' THEN 's' ELSE 'r' END, c.relowner))) x
```

After:

```text
      CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(c.relacl, pg_catalog.acldefault(
                 (CASE WHEN c.relkind = 'S' THEN 's' ELSE 'r' END)::"char", c.relowner))) x
```

- the Before block occurs exactly once in the accepted V1.1 bytes;
- V1.1 line 8496: SHA-256 `34f9cb929e8ba612c92440083b832b24d3eb6464c1ebb8e9f23b0657b5cbbc01` → `75028f95d4baa2be37236601472d05cf77e4f09311b43f6b25005b5f4152dbca` (+10 bytes).

**Defect.** `pg_catalog.acldefault` has exactly one signature, `acldefault("char", oid)` (PostgreSQL 18.4 `pg_proc`; the same since before PostgreSQL 15). In `CASE WHEN … THEN 's' ELSE 'r' END` every result branch is an untyped literal, so the `CASE` result resolves to `text` (UNION/CASE type resolution: all inputs `unknown` ⇒ `text`). Function resolution then needs an **implicit** `text → "char"` cast, but that cast is assignment-only (`pg_cast.castcontext = 'a'`), so no candidate matches: `42883 function pg_catalog.acldefault(text, oid) does not exist`. The branch is inside a PL/pgSQL body, so the failure appears only when the verifier first executes — including inside the §19.13.4 final `DO` block and every `m7.w_verify_control_plane_catalog_v1` call. Reproduced on PostgreSQL 18.4.

**Correction and proof.** An explicit cast of the `CASE` result to `"char"`. The branch values `'s'` and `'r'` become the single-byte `"char"` values `s` and `r`, exactly the values the other `acldefault('f', …)` and `acldefault('n', …)` calls of the same function obtain from their untyped literals. `acldefault` therefore receives the same object-type code for sequences and for every other relation kind as the accepted text intends; the ACL policy, the relation domain, the owner exclusion and the emitted `REL-ACL` rows are unchanged. Verified: the branch executes and reports `REL-ACL` for a misgranted table and sequence (T-02, T-136d; §9).

### 5.3 `E03-03a`, `E03-03b` (class E03-C) — IA-06 domain

Before (V1.1 lines 8605–8607, byte-exact):

```text
    SELECT 'IA-06: ' || r.rolname::text
      FROM pg_catalog.pg_roles r
     WHERE r.rolname <> 'pagamenos_m7_owner'
```

After:

```text
    SELECT 'IA-06: ' || r.rolname::text
      FROM pg_catalog.pg_roles r
     WHERE NOT r.rolsuper AND NOT pg_catalog.pg_has_role(r.oid, v_owner, 'MEMBER')
```

- the Before block occurs exactly once in the accepted V1.1 bytes;
- V1.1 line 8607: SHA-256 `c8e1acf8935b347d98d15ed7a05ce5988d274515908ba5bcc37e2fff08c04636` → `9e123a58cb958bf23fe0b591d56fa13f4d3eb94d9a1aff5996ef00dab2e033c1` (+38 bytes).

Before (V1.1 line 2313, byte-exact):

```text
| IA-06 | no role holds EXECUTE on both `m7.a_mint_deletion_authorization_v1` and any `m7.w_*` function (checked after grants) |
```

After:

```text
| IA-06 | no role in the IA-06 quantified domain `D` holds EXECUTE on both `m7.a_mint_deletion_authorization_v1` and any `m7.w_*` function (checked after grants). `D` is exactly every role `r` of `pg_roles` with `NOT r.rolsuper` and `NOT pg_has_role(r, pagamenos_m7_owner, 'MEMBER')`; "holds" is effective privilege (`has_function_privilege`, including `PUBLIC` and inherited grants) |
```

- the Before block occurs exactly once in the accepted V1.1 bytes;
- V1.1 line 2313: SHA-256 `ca5b6a2d0bd800bd13644f564ac93ed7d38a75759c55067676f4fb73375698c2` → `b4532fcc8f10fe94c9690b0b227627d582ce21d81caefe7c3a09609ff63b48dc` (+257 bytes).

**Defect — IA-06 is unsatisfiable in every PostgreSQL cluster.** The accepted branch quantifies over every role of `pg_roles` except `pagamenos_m7_owner`, using effective privilege (`has_function_privilege`). Two classes of roles always pass both `EXISTS` tests:

1. **Superusers.** A superuser holds every privilege on every function. Every cluster has a bootstrap superuser, and PostgreSQL refuses to remove its attribute (`ALTER ROLE … NOSUPERUSER` on the bootstrap superuser ⇒ `0A000 The bootstrap superuser must have the SUPERUSER attribute`; verified on 18.4).
2. **The migration role.** IA-05 requires it to be a member of `pagamenos_m7_owner`. §19.2 runs `REVOKE ALL ON SCHEMA m7 FROM PUBLIC` and `GRANT USAGE ON SCHEMA m7 TO …` on the owner's schema **before** `SET LOCAL ROLE pagamenos_m7_owner`, which PostgreSQL permits only if the session role can exercise the owner's privileges (verified: `42501 permission denied for schema m7` otherwise). A migration role that can do so holds the owner's EXECUTE on every M7 function.

Hence the accepted branch emits at least `IA-06: <bootstrap superuser>` in every cluster, so the §19.13.4 final assertion can never pass, and every "zero rows before" requirement of §25.17 and T-78 is unreachable.

**Re-derived intent.** The accepted authority states the separation IA-06 protects, and which administrative roles hold every M7 privilege by construction:

| Source | Accepted text (excerpt) | Consequence for the domain |
| :-- | :-- | :-- |
| V1.1 §15.5 (line 1581) | "**A deployed role holding both authority and execution capability must not exist** (install assertion `IA-06`, §18.4)" | IA-06 is about a role *holding* both capabilities. A superuser, and `pagamenos_m7_owner` with its members, hold every M7 privilege by construction, so their effective privilege is not such a capability collapse |
| V1.1 §5 (line 220) | **owner-class actor** = "superuser, migration owner, member of `pagamenos_m7_owner`, or accepted-table owner"; contrasted with a **runtime-role actor** | superusers and members of `pagamenos_m7_owner` are two of the four owner-class kinds; `D` excludes exactly those two kinds (plus the owner itself). `D` is **not** the complement of the owner-class actors: an accepted-table owner that is not a member of `pagamenos_m7_owner` is owner-class under §5 and remains in `D` |
| V1.1 §26.2 / M7-R-03 (lines 9999, 10267) | no guarantee against owner-class actors is claimed; owner-class actors "can alter data, guards, functions, ACLs …" | IA-06 need not treat the privileges that superusers and owner members hold by construction as a violation. This is not a claim that IA-06 exempts every owner-class actor: a role in `D` that holds both capabilities is reported whatever else it owns |
| V1.1 §19.13.1 (line 8410) | the verifier's claim covers "schema `m7` and the six M7 roles" | the verifier's separation claims concern runtime principals |
| V1.1 §18.2, M7-I07 | per-capability EXECUTE separation; "no role holds two capability families" | detection must cover every role in `D`, including a misgranted M7 login role, any other role, and an accepted-table owner that is not a member of `pagamenos_m7_owner` |

**Normative domain (IA-06).** IA-06 quantifies over exactly the set

`D = { r ∈ pg_roles : NOT r.rolsuper AND NOT pg_has_role(r.oid, pagamenos_m7_owner, 'MEMBER') }`

and reports `IA-06: <r>` for every `r ∈ D` that has effective EXECUTE (`has_function_privilege`) on `m7.a_mint_deletion_authorization_v1` and on at least one `m7.w_*` function. `pg_has_role(…, 'MEMBER')` is true for `pagamenos_m7_owner` itself and for every direct or indirect member of it, whatever the membership's `INHERIT` option; it is also true for superusers. So `D` excludes exactly: superusers, the owner, and every member of the owner — which by IA-05 is exactly the migration role in a conforming installation. `D` does **not** exclude an accepted-table owner that is not a member of the owner: such a role holds no M7 privilege under conforming provisioning (RS-5, §19.13.4 grants), so keeping it in `D` can only ever report a genuine misgrant. `D` is therefore defined by its formula alone and is not the complement of the V1.1 §5 owner-class actors; wherever this erratum speaks of IA-06's domain, it means exactly `D`.

**Proof of the required properties** (each verified on PostgreSQL 18.4 against an expectation set derived only from the corrected text; §9):

| # | Property | Why it holds | Observed |
| :-- | :-- | :-- | :-- |
| 1 | a runtime principal holding both capabilities is reported | every M7 login role is `NOSUPERUSER`, and IA-04 forbids it any membership, so it is in `D`; effective privilege includes direct, `PUBLIC` and inherited grants | `GRANT EXECUTE ON FUNCTION m7.w_execute_row_purge_v1(text,uuid) TO pagamenos_m7_deletion_authority_rt` ⇒ `GRANT-EXTRA` + `IA-06: pagamenos_m7_deletion_authority_rt`; `a_mint` granted to the worker ⇒ `GRANT-EXTRA` + `IA-06: pagamenos_m7_storage_worker_rt` |
| 2 | a misgranted non-M7 role, and a capability collapse through role membership, are reported | such roles are neither superusers nor owner members | a new role granted both functions ⇒ two `GRANT-EXTRA` + `IA-06: <role>`; a role inheriting from both the authority and the worker role ⇒ `IA-06: <role>` + two `MEMBER-EXTRA` |
| 2a | an accepted-table owner that is not a member of `pagamenos_m7_owner`, holding both capabilities, is reported | it is not a superuser and not an owner member, so it is in `D`; table ownership is not an input of `D` | a `NOLOGIN NOSUPERUSER` role made owner of `public.experiment` and granted both functions ⇒ two `GRANT-EXTRA` + `IA-06: <role>` |
| 3 | the bootstrap superuser alone reports nothing | `rolsuper` | conforming install: zero rows |
| 4 | the migration role exercising owner privileges reports nothing | IA-05 member of the owner, with or without `INHERIT` | zero rows with an inheriting and with a non-inheriting membership |
| 5 | RS-8 and every exact grant rule are preserved | the RS-8, function, grant, role and membership branches are byte-identical | T-131, T-132, T-137 rows unchanged in kind |
| 6 | no new role, privilege or object | the branch reads `pg_roles` and calls built-in `pg_catalog.pg_has_role(oid, oid, text)` only | — |

A `PUBLIC` grant of both functions reports `IA-06` for every role in `D`. The row set of that particular adversarial injection therefore includes the cluster's predefined `pg_*` roles, whose list varies by PostgreSQL major version; no accepted verification case pins that row set, and the accompanying `GRANT-EXTRA: … -> PUBLIC` rows are version-independent.

`E03-03b` states the same domain in the §18.4 IA-06 row, so the install-assertion table and the verifier agree.

### 5.4 `E03-04a`, `E03-04b`, `E03-04c` (class E03-D) — constraint-class domain

Before (V1.1 lines 8543–8545, byte-exact):

```text
        SELECT c.relname, 'CONSTRAINT'::m7."M7CatalogObjectKind", con.conname, NULL::boolean
          FROM pg_catalog.pg_constraint con JOIN pg_catalog.pg_class c ON c.oid = con.conrelid
         WHERE c.relnamespace = v_ns
```

After:

```text
        SELECT c.relname, 'CONSTRAINT'::m7."M7CatalogObjectKind", con.conname, NULL::boolean
          FROM pg_catalog.pg_constraint con JOIN pg_catalog.pg_class c ON c.oid = con.conrelid
         WHERE c.relnamespace = v_ns AND con.contype IN ('p', 'u', 'f', 'c')
```

- the Before block occurs exactly once in the accepted V1.1 bytes;
- V1.1 line 8545: SHA-256 `3468503a708608a72096beda1d28e60f82bfa7643c3b4fb24b1d58bbe4216252` → `38590fbbb56fd0f0dc4e710fe23a13dc44ff3d8254a1b105cc3768d446e242da` (+40 bytes).

Before (V1.1 line 2319, byte-exact):

```text
| IA-11 | the **exact set** of triggers, constraints and indexes in `m7` equals the manifest's expectation set, and every trigger is `tgenabled = 'O'` |
```

After:

```text
| IA-11 | the **exact set** of triggers, of constraints whose `contype` is `p`, `u`, `f` or `c`, and of indexes that do not back a PRIMARY KEY or UNIQUE constraint of their own relation, in `m7`, equals the manifest's expectation set, and every trigger is `tgenabled = 'O'` |
```

- the Before block occurs exactly once in the accepted V1.1 bytes;
- V1.1 line 2319: SHA-256 `113d11dc0d39512030f939455819142710c4c3effd0cb8d7ceabddd955887643` → `2a7b24332e70e215bf9fb24166f05c3f63880d13b1d3c68f2c5dec5fed6c567b` (+123 bytes).

Before (V1.1 line 8403, byte-exact):

```text
| constraints | **yes** | yes | — |
```

After:

```text
| constraints (`contype` `p`, `u`, `f`, `c` only) | **yes** | yes | — |
```

- the Before block occurs exactly once in the accepted V1.1 bytes;
- V1.1 line 8403: SHA-256 `0392ba91f6188ed2aaec851afff5fac5fa11e8ebedb7075e4e4110414c391e89` → `1f573a63787b9f0b34798af55976e7cfe2397e91624a7f4d532f89a6c44e6962` (+36 bytes).

**Defect.** The accepted exact set enumerates constraints of exactly four classes — **39 PRIMARY KEY, 57 UNIQUE, 92 FOREIGN KEY and 158 CHECK** (V1.1 §19.14 table and §19.14.1 derivation rules: `CONSTRAINT \S+_pkey PRIMARY KEY`, `CONSTRAINT \S+ UNIQUE`, `CONSTRAINT \S+_fkey`, `CONSTRAINT \S+_ck CHECK`), and V1.1 line 8902 requires the expectation set to enumerate "exactly the objects listed in this table". The accepted constraint sub-query selects **every** `pg_constraint` row of an `m7` relation. PostgreSQL 18 additionally stores each column `NOT NULL` declaration as a `pg_constraint` row with `contype = 'n'` and a server-generated name. On the accepted DDL that is 370 rows, one per `attnotnull` column including primary-key columns, e.g. `m7_canonical_generation_allocatedAt_not_null`, some truncated to 63 bytes, e.g. `m7_deletion_execution_completio_withinCompletionBudget_not_null`. PostgreSQL 15–17 create no relation-level `contype = 'n'` rows. So a correctly built expectation set yields 370 `OBJ-EXTRA: CONSTRAINT …` rows on PostgreSQL 18 and zero on 15–17: the accepted exact set is unsatisfiable on PostgreSQL 18 while §19.1 accepts PostgreSQL ≥ 15.

**Correction.** The constraint sub-query is restricted to the `contype` values the accepted expectation set represents.

**Accepted `contype` set: `{'p', 'u', 'f', 'c'}`** (PRIMARY KEY, UNIQUE, FOREIGN KEY, CHECK).

**Proof.**

1. *Version independence.* Rows of `contype` `p`, `u`, `f`, `c` for the accepted DDL are identical in number and name on every supported version; relation-level `n` rows (PostgreSQL 18) are excluded; domain constraints have `conrelid = 0` and never joined. The actual constraint set therefore equals the accepted 346 on PostgreSQL 15–18 (verified on 18.4: 346 text-derived names equal the filtered catalog set exactly; 370 `n` rows excluded; dropping a column's `NOT NULL` produces no row).
2. *No authority added.* No server-generated `NOT NULL` name enters the expectation set; §19.14's counts and derivation rules are unchanged.
3. *Detection preserved.* Missing and extra `p`/`u`/`f`/`c` constraints are still reported (`T-134b` ⇒ `OBJ-MISSING: CONSTRAINT m7_evidence_artifact.m7_evidence_artifact_generation_fkey`; a dropped UNIQUE constraint ⇒ `OBJ-MISSING: CONSTRAINT …`). The two other constraint classes PostgreSQL can attach to a relation remain detected through their own objects: a constraint trigger (`contype = 't'`) is a non-internal trigger ⇒ `OBJ-EXTRA: TRIGGER …`; an exclusion constraint (`contype = 'x'`) owns an index that backs no PRIMARY KEY or UNIQUE constraint ⇒ `OBJ-EXTRA: INDEX …` under `E03-05` (both verified).
4. *Not claimed.* Column nullability is not an enumerated verifier surface (V1.1 §19.13.1) and never was on PostgreSQL 15–17; this erratum does not add it.

`E03-04b` and `E03-04c` state the same domain in the §18.4 IA-11 row and the §19.13.1 surface table (`E03-04b` also states the `E03-05` index domain).

### 5.5 `E03-05a`, `E03-05b` (class E03-E) — index domain

Before (V1.1 lines 8547–8551, byte-exact):

```text
        SELECT c.relname, 'INDEX'::m7."M7CatalogObjectKind", ic.relname, ix.indisunique
          FROM pg_catalog.pg_index ix
          JOIN pg_catalog.pg_class ic ON ic.oid = ix.indexrelid
          JOIN pg_catalog.pg_class c  ON c.oid  = ix.indrelid
         WHERE c.relnamespace = v_ns),
```

After:

```text
        SELECT c.relname, 'INDEX'::m7."M7CatalogObjectKind", ic.relname, ix.indisunique
          FROM pg_catalog.pg_index ix
          JOIN pg_catalog.pg_class ic ON ic.oid = ix.indexrelid
          JOIN pg_catalog.pg_class c  ON c.oid  = ix.indrelid
         WHERE c.relnamespace = v_ns
           AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint k
                            WHERE k.conrelid = ix.indrelid AND k.conindid = ix.indexrelid
                              AND k.contype IN ('p', 'u'))),
```

- the Before block occurs exactly once in the accepted V1.1 bytes;
- V1.1 line 8551: SHA-256 `e3f8ab7813a38c1de4354a9a613457094f155321cfd4727af56cd058e9b0408a` → `3468503a708608a72096beda1d28e60f82bfa7643c3b4fb24b1d58bbe4216252` (-2 bytes);
- 3 line(s) inserted after V1.1 line 8551; no line removed.

Before (V1.1 line 8404, byte-exact):

```text
| indexes | **yes** | yes | uniqueness flag |
```

After:

```text
| indexes not backing a PRIMARY KEY or UNIQUE constraint (a backing index is governed through its constraint) | **yes** | yes | uniqueness flag |
```

- the Before block occurs exactly once in the accepted V1.1 bytes;
- V1.1 line 8404: SHA-256 `155bc9b59e8886bc7dc8495036f470ae04d05f50c2e25b1c8216420df250b075` → `2c72750d409a290436e2cc3599fc06782a011bd172d87a75a43a44d8062ff958` (+100 bytes).

**Defect.** The accepted exact set enumerates **28 explicit indexes** — 8 `CREATE UNIQUE INDEX` and 20 `CREATE INDEX` (V1.1 §19.14; §19.14.1: "count of `^CREATE INDEX` + `^CREATE UNIQUE INDEX`"). PostgreSQL additionally creates one index for every PRIMARY KEY and UNIQUE constraint, with the constraint's name, recorded in `pg_constraint.conindid` of that constraint. The accepted index sub-query selects every `pg_index` row of an `m7` relation: 124 on the accepted DDL (28 explicit + 39 PRIMARY KEY-backing + 57 UNIQUE-backing, verified). Each PRIMARY KEY / UNIQUE constraint would be represented twice — once as a `CONSTRAINT`, once as an `INDEX` — and the accepted 28-index set is unsatisfiable on every supported version.

**Correction.** The index sub-query excludes exactly the indexes that back a PRIMARY KEY or UNIQUE constraint **of the same relation** (`k.conrelid = ix.indrelid AND k.conindid = ix.indexrelid AND k.contype IN ('p','u')`). The `conrelid` equality and the `contype` restriction are necessary: a FOREIGN KEY constraint also carries a `conindid`, pointing at the referenced relation's unique index, and must not exempt anything.

**Proof** (all verified on PostgreSQL 18.4 unless marked):

| # | Property | Reason / observation |
| :-- | :-- | :-- |
| 1 | the 28 explicit indexes form the INDEX exact set | `CREATE [UNIQUE] INDEX` creates no constraint, so no `p`/`u` row names it; the filtered catalog set equals the 28 text-derived `(relation, name, uniqueness)` triples exactly |
| 2 | a missing explicit index is `OBJ-MISSING` | `DROP INDEX m7.m7_storage_outbox_one_open_effect` ⇒ `OBJ-MISSING: INDEX m7_storage_outbox.m7_storage_outbox_one_open_effect` (T-134c) |
| 3 | an unexpected independent index is `OBJ-EXTRA` | an added `CREATE INDEX` ⇒ `OBJ-EXTRA: INDEX …`; an exclusion constraint's index ⇒ `OBJ-EXTRA: INDEX …` |
| 4 | uniqueness drift of an explicit index is detected | an explicit non-unique index replaced by a unique index of the same name ⇒ `OBJ-DRIFT: INDEX …` (the drift sub-query is unchanged) |
| 5 | PK/UNIQUE backing indexes remain governed through their constraints | a backing index cannot be dropped while its constraint exists (PostgreSQL dependency, reasoned); dropping the constraint drops the index and is reported `OBJ-MISSING: CONSTRAINT …` (verified); converting an explicit unique index into a constraint (`ADD CONSTRAINT … USING INDEX`) removes it from the INDEX set ⇒ `OBJ-MISSING: INDEX …` + `OBJ-EXTRA: CONSTRAINT …` (reasoned) |
| 6 | no count changes | §19.14 still reads 28 explicit indexes and 96 PK/UNIQUE constraints; nothing is redefined as 124 |

`E03-05b` states the domain in the §19.13.1 surface table.

### 5.6 `E03-06a`, `E03-06b` (class E03-F) — default EXECUTE privilege of the M7 owner

Before (V1.1 lines 2469–2471, byte-exact):

```text
SET LOCAL ROLE pagamenos_m7_owner;

ALTER DEFAULT PRIVILEGES IN SCHEMA m7 REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
```

After:

```text
SET LOCAL ROLE pagamenos_m7_owner;

ALTER DEFAULT PRIVILEGES FOR ROLE pagamenos_m7_owner REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
```

- the Before block occurs exactly once in the accepted V1.1 bytes;
- V1.1 line 2471: SHA-256 `a51adf7b75d59ddb089752f01c55340846c007b38dd88a4d5dcc6b3508388a2e` → `502e2c57f0fc9a120b942a4a8fcee66e59348bf7842e716431ba0fee6f436e5d` (+15 bytes).

Before (V1.1 line 2231, byte-exact):

```text
| RS-3 | Every M7 function has EXECUTE revoked from `PUBLIC`; default privileges for the owner in `m7` revoke EXECUTE from `PUBLIC` |
```

After:

```text
| RS-3 | Every M7 function has EXECUTE revoked from `PUBLIC`; the default privileges of the owner role itself, for objects it creates in any schema (`ALTER DEFAULT PRIVILEGES FOR ROLE pagamenos_m7_owner REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC`), revoke EXECUTE from `PUBLIC`, so a function subsequently created by `pagamenos_m7_owner` carries no `PUBLIC` EXECUTE |
```

- the Before block occurs exactly once in the accepted V1.1 bytes;
- V1.1 line 2231: SHA-256 `61ac05eaa5ee74d53191af799174593bcc3cb0c211a724cd6cd8b7e246224447` → `3530e18a6856f90c89b30a01cae392a79b5c6f3297d6425d53843a8911040fc4` (+231 bytes).

**Defect.** PostgreSQL's hard-wired default grants `EXECUTE` on every new function to `PUBLIC`. Per-schema default privileges (`ALTER DEFAULT PRIVILEGES IN SCHEMA …`) are *added to* the global defaults for the object type; they cannot revoke a privilege the global defaults grant. The accepted `ALTER DEFAULT PRIVILEGES IN SCHEMA m7 REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC` is therefore a no-op. Verified on 18.4: it leaves `pg_default_acl` empty, and a function subsequently created by `pagamenos_m7_owner` in `m7` has `proacl = NULL` (the default), so `pagamenos_m7_participant_rt` can execute it and the verifier reports `GRANT-EXTRA: … -> PUBLIC` in addition to `FN-EXTRA`. RS-3's "default privileges for the owner in `m7` revoke EXECUTE from `PUBLIC`" is therefore false as written.

**Correction.** The statement names the dedicated M7 owner role instead of the schema: `ALTER DEFAULT PRIVILEGES FOR ROLE pagamenos_m7_owner REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC`. A global (schema-less) default-privilege entry for a role *can* remove the hard-wired `PUBLIC` EXECUTE for functions that role creates. RS-3 is restated accordingly (`E03-06b`).

**Proof.**

| # | Property | Reason / observation |
| :-- | :-- | :-- |
| 1 | the statement is permitted at its position | it runs after `SET LOCAL ROLE pagamenos_m7_owner`; a role may alter default privileges for itself |
| 2 | future M7 functions receive no `PUBLIC` EXECUTE | `pg_default_acl` gains exactly one row: role `pagamenos_m7_owner`, namespace none (global), object type `f`, ACL `{pagamenos_m7_owner=X/pagamenos_m7_owner}`. A function then created by the owner has `proacl = {pagamenos_m7_owner=X/pagamenos_m7_owner}`, and the participant role cannot execute it (verified) |
| 3 | existing intended grants are unchanged | the §19.13.4 `REVOKE ALL ON ALL FUNCTIONS IN SCHEMA m7 FROM PUBLIC` and capability `GRANT` loop are unchanged and remain authoritative. The final `proacl` of all 110 functions is byte-identical with and without the correction (two installs compared on 18.4) |
| 4 | no application or runtime role gains capability | the entry only *removes* `PUBLIC` EXECUTE from future owner-created functions; it grants nothing |
| 5 | no unrelated owner is modified | `FOR ROLE pagamenos_m7_owner` affects only objects created by that dedicated `NOLOGIN` role (RS-1). No other role's defaults, and no ownership, change |
| 6 | the verifier is unaffected | the `DEFACL` branch examines entries whose namespace is `m7`; the global entry has none, and its only grantee is the owner. A conforming install reports zero rows; T-136c still reports `DEFACL: r -> PUBLIC SELECT` |
| 7 | atomicity | `pg_default_acl` is transactional; a failed install leaves no entry |

The adjacent statements for `TABLES` and `SEQUENCES` (V1.1 lines 2472–2473) are **not** amended: PostgreSQL's hard-wired defaults grant nothing on tables or sequences to `PUBLIC`, so RS-2 holds without them, and they remain harmless no-ops that create no `pg_default_acl` entry (verified: no `DEFACL` row).

---

## 6. Verification-contract corrections

### 6.1 `E03-07` (class E03-G) — T-137

Before (V1.1 line 9639, byte-exact):

```text
| T-137 | `GRANT EXECUTE ON FUNCTION m7.c_activate_manifest_v1(…) TO pagamenos_m7_storage_worker_rt` | `RS-8: …c_activate_manifest_v1(…) -> pagamenos_m7_storage_worker_rt` |
```

After:

```text
| T-137 | `GRANT EXECUTE ON FUNCTION m7.c_activate_manifest_v1(…) TO pagamenos_m7_storage_worker_rt` | exactly two rows: `GRANT-EXTRA: …c_activate_manifest_v1(…) -> pagamenos_m7_storage_worker_rt` and `RS-8: …c_activate_manifest_v1(…) -> pagamenos_m7_storage_worker_rt` |
```

- the Before block occurs exactly once in the accepted V1.1 bytes;
- V1.1 line 9639: SHA-256 `31828c88c502526a441855f2f36d175b4fac0e96fdbcd900d138af1384f94d11` → `5af805d118f05b3e82710e4d081099e27aa1b60556fa8306949e9f2c05fab967` (+102 bytes).

**Defect and proof.** Granting `EXECUTE` on `m7.c_activate_manifest_v1(text,text)` to `pagamenos_m7_storage_worker_rt` violates two accepted rules, each with its own mandatory detector:

- **RS-8 / §18.2:** a `c_*` function has no login grantee, so the verifier's RS-8 branch emits `RS-8: m7.c_activate_manifest_v1(text,text) -> pagamenos_m7_storage_worker_rt`.
- **IA-09:** a conforming expectation set can contain no `c_*` grant (§18.2, RS-8, IA-09), so the exact-grant branch necessarily emits `GRANT-EXTRA: m7.c_activate_manifest_v1(text,text) -> pagamenos_m7_storage_worker_rt`.

Both branches are accepted text that this erratum does not change, and no accepted clause prohibits one injected defect from being reported by two detectors (T-132 already expects `GRANT-EXTRA` together with `IA-06`). The accepted single-row expectation contradicts "exactly the named row(s)" (§25.17 preamble). The corrected contract names the complete deterministic set. Verified on 18.4: exactly these two rows. Neither detector is weakened.

### 6.2 `E03-08` (class E03-H) — T-05

Before (V1.1 line 9414, byte-exact):

```text
| T-05 | M7-I04: no truncation, ever | any table | — | `TRUNCATE m7.<each table>` for all **39** (the §19.10.1 loop list, mechanically enumerated per §19.14.1 — **not** a hand-maintained number: round 2 left this at 35 after the count had become 38, which is `M7V11R3-AUD-04`) | `restrict_violation` on every table | all rows present | — | — |
```

After:

```text
| T-05 | M7-I04: no truncation, ever | any table; actor `owner-class`, executing as `pagamenos_m7_owner` (a login role is refused earlier, with `42501`, by its missing `TRUNCATE` privilege) | — | for each of the **39** tables `T` (the §19.10.1 loop list, mechanically enumerated per §19.14.1 — **not** a hand-maintained number: round 2 left this at 35 after the count had become 38, which is `M7V11R3-AUD-04`), each statement in its own transaction and never with `CASCADE`: **(a)** `TRUNCATE m7.T`; **(b)** `TRUNCATE m7.T, m7.U1, …, m7.Uk` with `T` listed first, where `{U1 … Uk}` = `Ref(T)` is the set of M7 tables other than `T` that reference `T` through a FOREIGN KEY constraint of §19.4–§19.9, directly or transitively (a self-reference is not an edge) | (a) `restrict_violation` (`M7_IMMUTABLE`, naming `T`) when `Ref(T)` is empty; `0A000` (PostgreSQL's foreign-key precondition for `TRUNCATE`, evaluated before any trigger fires) when `Ref(T)` is non-empty. (b) `restrict_violation` (`M7_IMMUTABLE`, naming `T`) for all 39 tables | all rows present | — | — |
```

- the Before block occurs exactly once in the accepted V1.1 bytes;
- V1.1 line 9414: SHA-256 `9320e02579648acd6d1dc4538758927eccb8b042260ae63f264fcc5188beaf0f` → `4d328e2e4a3a9539016245883199a6ef5df8e9692b3d06e50e1541f9fec63de4` (+731 bytes).

**Defect.** PostgreSQL's `TRUNCATE` (without `CASCADE`) proceeds in this order:

1. lock and permission checks — a role lacking `TRUNCATE` fails `42501`;
2. the foreign-key precondition — if a table not named in the same command references a named table, `0A000 cannot truncate a table referenced in a foreign key constraint`;
3. the `BEFORE TRUNCATE` statement triggers of the named tables, in command order.

The M7 guard (`m7.t_forbid_mutation`, installed on all 39 tables by §19.10.1) is reached only in step 3. On the accepted DDL:

- **24 tables** are referenced by at least one other M7 table: a single-table `TRUNCATE` by any actor with the privilege stops at step 2 with `0A000`.
- **Login roles** stop at step 1 with `42501`.

So no actor can obtain "`restrict_violation` on every table" from `TRUNCATE m7.<each table>` (verified on 18.4).

**Correction and proof.**

- **Actor.** The actor is fixed as owner-class executing as `pagamenos_m7_owner` — the only actor that reaches step 2. This also avoids any dependence on migration-role inheritance.
- **(a) Single-table form.** Retained, with the PostgreSQL-determined outcome per table: `restrict_violation` when `Ref(T)` is empty, `0A000` otherwise.
- **(b) Closure form.** Names `T` first, followed by its whole referencing closure `Ref(T)`. Step 2 then passes by construction, and step 3 fires `T`'s own guard first, which raises `restrict_violation` naming `T`. Every one of the 39 guards is therefore proved reachable and refusing, and the transaction aborts, so all rows remain.
- **No `CASCADE` is used.** Each statement is its own transaction, and immutability is not weakened: the guard is still required to refuse on every table.
- **M7-I04 is unchanged.** Its layer (TRG) and SQLSTATE (`restrict_violation`) are exhibited for all 39 tables by (b).

`Ref(T)` is normative by its derivation rule; the values below are informative (text-derived and equal to the PostgreSQL 18.4 catalog; verified per table on 18.4 with outcome (a) and (b) as stated):

| Table `T` (§19.10.1 order) | Referenced by another M7 table | Size of `Ref(T)` | (a) observed | (b) observed |
| :-- | :-- | --: | :-- | :-- |
| `m7_storage_backend` | yes | 34 | `0A000` | `restrict_violation` naming `T` |
| `m7_storage_profile` | yes | 33 | `0A000` | `restrict_violation` naming `T` |
| `m7_retention_policy` | yes | 33 | `0A000` | `restrict_violation` naming `T` |
| `m7_merchant_vocabulary` | yes | 34 | `0A000` | `restrict_violation` naming `T` |
| `m7_merchant_vocabulary_entry` | yes | 2 | `0A000` | `restrict_violation` naming `T` |
| `m7_control_plane_manifest` | yes | 32 | `0A000` | `restrict_violation` naming `T` |
| `m7_control_plane_installation` | yes | 25 | `0A000` | `restrict_violation` naming `T` |
| `m7_expected_relation` | yes | 1 | `0A000` | `restrict_violation` naming `T` |
| `m7_expected_relation_object` | no | 0 | `restrict_violation` | `restrict_violation` naming `T` |
| `m7_expected_function` | yes | 1 | `0A000` | `restrict_violation` naming `T` |
| `m7_expected_function_grant` | no | 0 | `restrict_violation` | `restrict_violation` naming `T` |
| `m7_expected_role` | yes | 1 | `0A000` | `restrict_violation` naming `T` |
| `m7_expected_role_member` | no | 0 | `restrict_violation` | `restrict_violation` naming `T` |
| `m7_participant_session` | yes | 24 | `0A000` | `restrict_violation` naming `T` |
| `m7_participant_session_revocation` | no | 0 | `restrict_violation` | `restrict_violation` naming `T` |
| `m7_outcome` | yes | 7 | `0A000` | `restrict_violation` naming `T` |
| `m7_outcome_assertion` | yes | 1 | `0A000` | `restrict_violation` naming `T` |
| `m7_outcome_command_receipt` | no | 0 | `restrict_violation` | `restrict_violation` naming `T` |
| `m7_evidence_upload_intent` | yes | 16 | `0A000` | `restrict_violation` naming `T` |
| `m7_canonical_generation` | yes | 13 | `0A000` | `restrict_violation` naming `T` |
| `m7_generation_write_grant` | yes | 1 | `0A000` | `restrict_violation` naming `T` |
| `m7_generation_capability_mint` | no | 0 | `restrict_violation` | `restrict_violation` naming `T` |
| `m7_upload_intent_transition` | no | 0 | `restrict_violation` | `restrict_violation` naming `T` |
| `m7_storage_observation` | yes | 5 | `0A000` | `restrict_violation` naming `T` |
| `m7_evidence_submission` | yes | 4 | `0A000` | `restrict_violation` naming `T` |
| `m7_evidence_submission_receipt` | no | 0 | `restrict_violation` | `restrict_violation` naming `T` |
| `m7_evidence_artifact` | yes | 1 | `0A000` | `restrict_violation` naming `T` |
| `m7_evidence_artifact_transition` | no | 0 | `restrict_violation` | `restrict_violation` naming `T` |
| `m7_evidence_integrity_finding` | no | 0 | `restrict_violation` | `restrict_violation` naming `T` |
| `m7_reconciliation_finding` | yes | 5 | `0A000` | `restrict_violation` naming `T` |
| `m7_participant_erasure_request` | yes | 16 | `0A000` | `restrict_violation` naming `T` |
| `m7_deletion_authorization` | yes | 15 | `0A000` | `restrict_violation` naming `T` |
| `m7_deletion_execution` | yes | 14 | `0A000` | `restrict_violation` naming `T` |
| `m7_storage_outbox` | yes | 4 | `0A000` | `restrict_violation` naming `T` |
| `m7_storage_outbox_transition` | no | 0 | `restrict_violation` | `restrict_violation` naming `T` |
| `m7_storage_effect_attempt` | no | 0 | `restrict_violation` | `restrict_violation` naming `T` |
| `m7_deletion_execution_completion` | no | 0 | `restrict_violation` | `restrict_violation` naming `T` |
| `m7_outbox_requeue_record` | no | 0 | `restrict_violation` | `restrict_violation` naming `T` |
| `m7_deletion_sla_failure` | no | 0 | `restrict_violation` | `restrict_violation` naming `T` |

### 6.3 `E03-09` (class E03-I) — T-82

Before (V1.1 line 9527, byte-exact):

```text
| T-82 | M7-I79: a failed grant aborts the install | revoke the migration role's grant option on an accepted table | run the migration | `GRANT` fails; transaction aborts; no schema |
```

After:

```text
| T-82 | M7-I79: a failed grant aborts the install | **adversarial test setup — not conforming provisioning** — in a disposable database after the accepted migrations are applied: the cluster administrator creates an isolated `NOLOGIN` role that is not the migration role, is a member of no role and has no member, and executes `ALTER TABLE public.study_participant OWNER TO` that role; the case then asserts that the migration role holds no privilege of any kind on `public.study_participant` (directly, through `PUBLIC`, or through a membership) | run the migration | the first failing statement is the §19.2 `GRANT SELECT ON TABLE public.study_participant, …` statement, with `42501`; transaction aborts; no schema `m7`, no object owned by `pagamenos_m7_owner`, and no privilege granted to `pagamenos_m7_owner` on any accepted relation |
```

- the Before block occurs exactly once in the accepted V1.1 bytes;
- V1.1 line 9527: SHA-256 `a350ff7781635bbdf252920e7e6201411e58855978cfaab2fa925096583222c3` → `1818d3c72d894599cf9380983e8c13a7dfc1079fa96def8119161d0ce15d4cd1` (+664 bytes).

**Defect.** §19.2 states that the migration role "owns the accepted relations". PostgreSQL treats an object's owner as holding every grant option implicitly. Revoking the owner's own grant option (`REVOKE GRANT OPTION FOR SELECT ON public.study_participant FROM <migration role>`) therefore leaves its `GRANT` able to succeed (verified: `has_table_privilege(…, 'SELECT WITH GRANT OPTION')` stays true and the install proceeds past every §19.2 grant). The accepted setup cannot produce the intended failure.

**Designs evaluated.**

| Design | Result on PostgreSQL 18.4 | Disposition |
| :-- | :-- | :-- |
| accepted setup: revoke the owning migration role's grant option | no grant fails; install reaches its later fail-closed stage | **rejected** — cannot exercise M7-I79 |
| a non-owning migration role that still holds some privilege on the relation, without grant option | the §19.2 `GRANT`s only raise warning `01007 no privileges were granted`; the transaction fails much later (at the first M7 `CREATE TABLE` whose foreign key needs the ungranted `REFERENCES`) | **rejected** — the failure is not at the grant stage |
| a non-owning migration role with no privilege at all (changing the migration role's identity) | would conflict with §19.2's "the migration role … owns the accepted relations" and with IA-05's single migration role | **rejected** — changes the conforming actor |
| **isolated adversarial owner of one accepted relation**, migration role holding no privilege on it | the **first failing statement is the §19.2 `GRANT SELECT ON TABLE public.study_participant, …`** (6th executed statement), `42501 permission denied for table study_participant`; transaction aborted; schema `m7` absent; no object owned by `pagamenos_m7_owner`; zero privileges granted to it on accepted relations | **adopted** |

A grant by a role holding **no** privilege on the object is an error in PostgreSQL, whereas a grant by a role holding a privilege without grant option is only a warning; the adopted setup relies on the former. It is explicitly labelled an adversarial test setup in a disposable database, not conforming provisioning. The proposition tested — a failed grant in the install's privilege-grant stage aborts the single transaction and leaves no partial M7 install (M7-I79, RS-6, V1.1 §19.1) — is unchanged.

---

## 7. Interaction with Erratum 01 and Erratum 02

| Check | Result |
| :-- | :-- |
| Erratum 01 bytes / Erratum 02 bytes | unchanged (§1.2 identities) |
| Erratum 01 amended clauses — §23.3, §23.4, §23.5, §19.13.4 install-sequence comment (V1.1 lines 8844–8853), §24.2 MA-1 / MA-6, §24.3, §16.2.4 PA-1, §25.2 **T-08b** | no `E03` occurrence lies in any of them; `E03-08` amends the §25.2 **T-05** row (line 9414), a different row from T-08b; §19.13.4 is untouched |
| Erratum 01 MD-1…MD-7 / MG-1…MG-6 | apply unchanged to migration bytes containing the corrections. No `E03` text contains a manifest digest, the placeholder `P`, or a `sha256:` literal |
| Erratum 02 occurrences `E02-01` … `E02-09` (V1.1 lines 4494, 4545, 4853, 5442, 6912, 8219, 8221, 8222, 8826) | disjoint from every `E03` line (§4). F11's `E02-04` (line 5442) and F24 (no `E02` occurrence) are preserved byte-for-byte outside the `E03` blocks |
| Erratum 02 class `E02-SX` census | `E03` introduces no schema-qualified special-grammar construct. The only new `pg_catalog` call is `pg_catalog.pg_has_role(oid, oid, text)`, an ordinary function |
| Consent / A1 / A2 / CCA / B / C semantics | not touched: every `E03` occurrence is in the install preamble, the catalog verifier, install-assertion prose, or verification cases |
| tables, enums, functions, signatures, triggers, constraints, indexes, views, relations, runtime API | none added, removed or renamed (§19.14 counts unchanged) |
| lock order, LG-*, lock profiles | unchanged: `E03-01` keeps one unlocked `SELECT`; the verifier takes no row locks; no locking clause is added |
| manifest, machine authority, selector, Gate 2, LC-1, S03 | not authored / not published / not rotated / open / not occurred / blocked (§11, §12) |

---

## 8. Findings dispositioned without a normative delta

| Diagnostic finding (non-authoritative) | Re-derivation | Disposition |
| :-- | :-- | :-- |
| §19.2 schema-ACL statements run before `SET LOCAL ROLE` and fail for a non-inheriting migration role | V1.1 constrains the migration role only through IA-05 (membership) and §19.2 (owner of accepted relations); its inheritance is not a runtime-role invariant (IA-03 governs the six M7 login roles only). PostgreSQL sets inheritance per membership (`GRANT … WITH INHERIT TRUE`, PostgreSQL ≥ 16) or per member role (`rolinherit`, PostgreSQL 15). The only accepted clause the inheriting migration role conflicted with was IA-06, which `E03-C` corrects; verified on 18.4, the corrected text installs up to its fail-closed completion with an inheriting migration role and IA-06 reports nothing | **provisioning, no delta**: conforming provisioning MUST let the migration role exercise the owner's privileges before `SET LOCAL ROLE`. §19.2 is not reordered |
| T-135 fourth sub-case (`CREATE FUNCTION m7.x_extra()`) produced an extra `GRANT-EXTRA … -> PUBLIC` | a consequence of the `E03-F` defect. With `E03-06a`, a function created by `pagamenos_m7_owner` reports exactly `FN-EXTRA: m7.x_extra()` (verified) | **closed by `E03-F`, no T-135 delta**. Observation for the S03 harness: RS-1 and §19.2 create every M7 object as `pagamenos_m7_owner`, so object-creating injections are executed as that role; an injection executed under another owning identity adds ownership-derived ACL rows and is not the case T-135 specifies |
| the §19.13.4 completion requires an active control plane that a pre-LC-1 S03 cannot legitimately supply | V1.1 §23.7: "CONCRETE MANIFEST VALUES ASSERTED BY THIS DOCUMENT: NONE"; Erratum 01 fixes LC-1 (implementation candidate completion, migration and embedded manifest bytes fixed) before LC-3 (manifest acceptance) | **lifecycle / work-package sequencing, no delta**. This erratum authorizes no synthetic or test manifest and changes no LC-1 … LC-7 event. Implication recorded: S03 cannot reach the §19.13.4 completion before a control plane exists under the accepted lifecycle |
| manifest fields not yet chosen (owner role `inherit`, migration role names, `legacyRuntimeRoles[]`, normalized signatures) | V1.1 §23.4 already assigns these to the reviewed manifest; nothing is contradictory | **no delta** |
| T-133 injection actor lacks `ADMIN OPTION` on `pagamenos_m7_owner` | granting or revoking a role requires `ADMIN OPTION` (or superuser); an owner-class actor with it is compatible with IA-05 | **harness actor setup, no delta** |
| T-81 PostgreSQL 14 sub-case needs a PostgreSQL 14 binary | availability of test binaries | **harness, no delta** |
| no separately labelled IA-14 verifier branch | IA-14's grantee-set and cardinality clauses are exactly the `x_*` rows of the manifest's function-grant expectation set (MA-14), which the exact-grant branch enforces in both directions. Its "no role holds both" clause follows for any role that obtains a second capability by an explicit grant (`GRANT-EXTRA`) or by a membership involving an M7 role (`MEMBER-EXTRA`). Verified: `x_mint` granted to the worker ⇒ `GRANT-EXTRA`; a `w_*` granted to the signer ⇒ `GRANT-EXTRA`; `x_mint` revoked from the signer ⇒ `GRANT-MISSING`. Because IA-14 has no effective-privilege detector, the superuser and owner-member false violation that `E03-C` corrects for IA-06 cannot arise there | **no delta; no redundant detector added** |
| unexercised runtime paths (positive paths of control-plane, participant, worker and signer functions) | not a textual defect; they depend on an active control plane | **verification debt, no delta** |
| owner-role connection refusal reports `28P01` or `28000` depending on credential presence | both are connection refusals as T-79 requires | **non-issue** |

---

## 9. Empirical evidence (PostgreSQL 18.4; evidence, not authority)

Setup: a fresh ephemeral cluster (SCRAM, loopback); the seven V1.1 §18.2 roles and a non-superuser migration role that is a member of `pagamenos_m7_owner`; the repository's accepted migrations applied by that role. The 26 fragments were taken from §1.3 with exactly the fourteen corrections of §4 applied to scratch copies outside any repository. The verifier's expectation set was loaded into scratch copies of the §19.5 tables from values derived **only** from the corrected fragment text:
- 43 relations;
- 346 constraints, 28 explicit indexes and 183 triggers;
- 110 functions — signatures from the declared parameter types, `sourceSha256` over the text between `$fn$` delimiters, 45 `SECURITY DEFINER`;
- the §18.2 prefix grants;
- the seven roles and the owner's single member.

No control-plane row was registered and no manifest was authored; the one row every run therefore reports, `IA-13: no active installation`, is excluded below and is the lifecycle item of §8.

| Check | Result |
| :-- | :-- |
| full single-transaction install of the corrected fragments | every statement succeeds up to the §19.13.4 final `DO`, which refuses with `P0001 M7_INSTALL: no active control-plane installation`; the rollback leaves no schema `m7` and no owner-owned object |
| `E03-01` | F11 creates; `m7.i_assert_control_plane(NULL)` ⇒ `55000 M7_CONTROL_PLANE_MISMATCH` |
| `E03-02` … `E03-05` baseline | verifier rows for the conforming install: **none** |
| `E03-02` | `REL-ACL` rows for T-02 and T-136d |
| `E03-03` | as §5.3, including zero rows for an inheriting and for a non-inheriting migration role |
| `E03-04`, `E03-05` | as §5.4, §5.5 |
| `E03-06` | as §5.6; the final `proacl` of all 110 functions is identical to an install without `E03-06a` |
| other §25.17 injections, informative | T-130 ⇒ `COL-ACL` only; T-131 ⇒ `GRANT-MISSING` only; T-132 ⇒ `GRANT-EXTRA` only; T-133 (first half) ⇒ `MEMBER-EXTRA` only; T-134a/b/c ⇒ the named `OBJ-MISSING` only; T-135b/c ⇒ `FN-DRIFT` only; T-136a/b/c/d ⇒ `SCHEMA-ACL-EXTRA` / `SCHEMA-ACL-MISSING` / `DEFACL` / `REL-EXTRA` + `REL-ACL`; T-137b ⇒ `TRG-DISABLED`, `ROLE-DRIFT` |
| `E03-07`, `E03-08`, `E03-09` | as §6.1–§6.3 |

Scope. All empirical checks ran on PostgreSQL 18.4 only. The PostgreSQL 15–17 statements rest on the catalog and grammar semantics cited in §5–§6:
- the `read_into_target` rule;
- `acldefault`'s single signature and cast context;
- `pg_has_role` membership semantics;
- the absence of relation-level `contype = 'n'` before PostgreSQL 18;
- `conindid` for PRIMARY KEY/UNIQUE constraints;
- global versus per-schema default privileges;
- the `TRUNCATE` check order;
- owner grant options.

The independent auditor may re-run the checks on any supported version.

---

## 10. M7-S01 regeneration consequence (not performed)

After — and only after — this erratum is independently accepted, protected-integrated and synchronized into the root register:

1. The M7-S01 extraction artifacts MUST be regenerated from **M7 V1.1 + accepted Erratum 01 + accepted Erratum 02 + accepted Erratum 03**, applying the SQL occurrences `E03-01`, `E03-02`, `E03-03a`, `E03-04a`, `E03-05a` and `E03-06a` exactly as §3 item 2 defines them. Hand-editing generated artifacts is not a conforming regeneration.
2. The regenerated extraction MUST record the accepted identity of this erratum beside the unchanged V1.1, Erratum 01 and Erratum 02 identities.
3. Exactly the affected fragment pins change. Informative values (derived by applying §3 item 2 to the S01 bytes of §1.3; the substitution rule, not this table, is normative, and a mismatch is an erratum defect to be reported):

   | Fragment | File | Current SHA-256 (V1.1 + E01 + E02) | Bytes | Lines | SHA-256 after `E03` | Bytes after | Lines after | `E03` occurrences |
   | :-- | :-- | :-- | --: | --: | :-- | --: | --: | :-- |
   | F01 | `sql/01_19.2_preamble.sql` | `0d6a919d5aa40d4031bf540868f549b88732ac24ff27c731e7442dcae4e1f1e3` | 5 059 | 95 | `f75c45ab8110c3fe5bce5379e77a08a51bc2e3d0561e887310d9c9361d02a6be` | 5 074 | 95 | `E03-06a` |
   | F11 | `sql/11_19.11.1_internal-helpers.sql` | `4803e194d62b3b3926e3b98a84d00ede902a485e04aed5de73533207f950be0a` | 31 344 | 604 | `c9f5777fcc699fd9411427e4b17fd3f28258068f925bbb8fcbe3a935fbec75a9` | 31 403 | 606 | `E03-01` |
   | F24 | `sql/24_19.13.2_catalog-verifier.sql` | `13b7d08196e87109ac6f82be3aa2256aa7c62226aec2f5688a8dc6678bb2a77c` | 14 323 | 247 | `f68eeea9d1f6a3b192b64163949385d89cd0b0fa369b168d8160d3eaa7006fff` | 14 628 | 250 | `E03-02`, `E03-03a`, `E03-04a`, `E03-05a` |

4. F02–F10, F12–F23, F25 and F26 MUST remain byte-identical, with unchanged pins. The fragment count (26), anchors, ordering rule and fence line spans recorded over the accepted V1.1 bytes are unchanged; the effective F11 and F24 bodies gain 2 and 3 lines respectively (§4).
5. Stale bytes MUST fail the S01 deterministic checks: any artifact containing the pre-`E03` bytes of an affected SQL occurrence, or missing or misplacing a correction.
6. The mechanical inventory (V1.1 §19.14.1) counts are unchanged: no object is added, removed or renamed.
7. Function source digests change for exactly `m7.i_assert_control_plane` and `m7.i_catalog_violations`. No manifest, `prosrc` digest or `migrationSha256` has been authored; when produced under Erratum 01 MD-*/MG-*, they MUST be derived from bytes conforming to the corrected text.
8. The regenerated artifacts require independent re-acceptance before reliance.

---

## 11. M7-S03 consequence

1. M7-S03 **remains blocked**. Resumption is not authorized by authoring, auditing or accepting this erratum; it requires at least independent acceptance, protected integration and root sync of this erratum, and regeneration and independent re-acceptance of M7-S01 under §10, and is then decided by the implementation-line process.
2. A resumed M7-S03 MUST install the corrected text, MUST NOT patch normative SQL locally, and MUST stop and report any further defect.
3. The lifecycle implication of §8 stands: under the accepted lifecycle, M7-S03 cannot complete the §19.13.4 fail-closed completion without an active control plane. This erratum does not resolve that sequencing question.

---

## 12. Lifecycle and machine-authority isolation

This erratum advances no lifecycle state. At the baseline, and unchanged by this candidate:

```
M7 GATE 1                               : AUTHORIZED (implementation work only)
M7 GATE 2                               : OPEN / NOT SATISFIED
LC-1 … LC-7                             : NOT OCCURRED (in particular LC-1: NOT OCCURRED)
M7 CONTROL-PLANE MANIFEST               : NOT AUTHORED / NOT ACCEPTED / NOT PUBLISHED
MACHINE-READABLE AUTHORITY PUBLICATION  : NO
SELECTOR ROTATION                       : NO
DEPLOYMENT / WAVE 0                     : NO
CCA IMPLEMENTATION WORK                 : AUTHORIZED
CCA IMPLEMENTATION                      : NOT ACCEPTED
B1 / B2 IMPLEMENTATION                  : NO
C1 / C2                                 : NO
P-16                                    : ACTIVE
```

This erratum creates or modifies nothing under `authority/`, does not assert or infer the value of `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA`, does not rotate it, and publishes no machine-readable authority. It satisfies no `IMP-*`, `MA-*`, §24.3 CI addition, real-PostgreSQL, real-provider or real-deployment case.

---

## 13. Acceptance criteria for the independent auditor

| # | Criterion |
| :-- | :-- |
| E03-AC-1 | the candidate commit changes exactly one path, this file (added); its only parent is `1be2f40216ac7093962739d4312d77219ae14d4d`; the blobs of V1.1 (`06e103b0…`), Erratum 01 (`15ee2209…`), Erratum 02 (`a0e6fa67…`), CCA (`2f0ff3c8…`) and the register (`162e65ae…`) are unchanged; nothing under `authority/`, runtime, migration, workflow, `scripts-trusted/` or S01 artifact paths changes |
| E03-AC-2 | only the fourteen occurrences of §4 are amended; every Before block is byte-identical to the named V1.1 lines and unique in V1.1; every changed line's SHA-256 values reproduce; the amended-line list of §4 is complete |
| E03-AC-3 | F11 with `E03-01` creates successfully, and `m7.i_assert_control_plane` keeps the no-row behaviour (`55000`) and the semantics of §5.1 |
| E03-AC-4 | the `REL-ACL` branch with `E03-02` executes and reports misgranted tables and sequences |
| E03-AC-5 | with `E03-03`, the bootstrap superuser alone, and the migration role exercising owner privileges (with or without an inheriting membership), produce no `IA-06` row |
| E03-AC-6 | with `E03-03`, a deliberately misgranted M7 runtime login role holding both capabilities, a misgranted non-M7 role, an accepted-table owner that is not a member of `pagamenos_m7_owner`, and a role holding both through memberships each produce an `IA-06` row; the §5.3 domain is derived from the cited authority, and no statement of this erratum equates `D` with the complement of the owner-class actors |
| E03-AC-7 | with `E03-04`, PostgreSQL 18 `contype = 'n'` rows produce no `OBJ-EXTRA`; the accepted `contype` set is exactly `{p, u, f, c}`; missing and extra `p/u/f/c` constraints are still reported |
| E03-AC-8 | with `E03-05`, the INDEX exact set is exactly the 28 explicit indexes; a missing explicit index is `OBJ-MISSING`; an extra independent index is `OBJ-EXTRA`; uniqueness drift is `OBJ-DRIFT`; PK/UNIQUE backing indexes are governed through their constraints |
| E03-AC-9 | with `E03-06`, a function subsequently created by `pagamenos_m7_owner` carries no `PUBLIC` EXECUTE; the final ACLs of the 110 functions are unchanged; no other role's defaults or ownership change; a conforming install reports no `DEFACL` row |
| E03-AC-10 | T-137's expected rows equal the actual deterministic rows (`GRANT-EXTRA` and `RS-8`) |
| E03-AC-11 | T-05 as corrected is mechanically satisfiable on PostgreSQL 18 without `CASCADE`, proves each of the 39 guards refuses, and does not weaken M7-I04 |
| E03-AC-12 | T-82's corrected setup makes the §19.2 accepted-table `GRANT` the first failing statement, aborts the transaction and leaves no partial M7 install; the setup is labelled non-conforming |
| E03-AC-13 | §7 holds: Erratum 01 and Erratum 02 identities and occurrences are exact and untouched; no consent, A1/A2/CCA/B/C, object, signature, lock or runtime-API change |
| E03-AC-14 | §8 dispositions add no normative delta; in particular §19.2 is not reordered, no synthetic manifest is authorized, and no IA-14 detector is added |
| E03-AC-15 | §10–§12 hold: S01 regeneration and S03 not performed; S03 blocked; Gate 2 open; LC-1 not occurred; no manifest, machine authority, selector rotation or deployment; this document does not self-accept |

---

## 14. Explicit status

```
PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_03 : AUTHOR CANDIDATE — NOT YET AUTHORITATIVE
INDEPENDENT ACCEPTANCE                   : NOT PERFORMED
PROTECTED INTEGRATION                    : NOT PERFORMED
ROOT AUTHORITY SYNC                      : NOT PERFORMED
M7 CONFORMANCE TARGET (UNTIL ACCEPTED)   : M7 V1.1 + ACCEPTED ERRATUM 01 + ACCEPTED ERRATUM 02 (unchanged)

M7 SPECIFICATION (V1.1)                  : ACCEPTED — ACCEPTED BYTES NOT EDITED
M7 ERRATUM 01                            : ACCEPTED + PROTECTED-INTEGRATED — BYTES NOT EDITED, UNAFFECTED
M7 ERRATUM 02                            : ACCEPTED + PROTECTED-INTEGRATED — BYTES NOT EDITED, UNAFFECTED
M7 GATE 1                                : AUTHORIZED (unchanged)
M7 GATE 2                                : OPEN / NOT SATISFIED (unchanged)
LC-1                                     : NOT OCCURRED
M7-S01 REGENERATION UNDER ERRATUM 03     : NOT PERFORMED — REQUIRED AFTER ACCEPTANCE (§10)
M7-S03                                   : BLOCKED — RESUME NOT AUTHORIZED (§11)
IMP-01…IMP-22 / MA-1…MA-18               : OPEN
M7 CONTROL-PLANE MANIFEST                : NOT AUTHORED / NOT ACCEPTED / NOT PUBLISHED
MACHINE-READABLE AUTHORITY               : UNCHANGED — NOT PUBLISHED
PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA    : NOT ASSERTED
SELECTOR ROTATION                        : NOT PERFORMED
DEPLOYMENT / WAVE 0                      : NOT AUTHORIZED
CCA IMPLEMENTATION WORK                  : AUTHORIZED (unchanged)
CCA IMPLEMENTATION                       : NOT ACCEPTED (unchanged)
RUNTIME / SCHEMA / MIGRATIONS / TESTS / WORKFLOWS / scripts-trusted / authority / S01 ARTIFACTS : NOT MODIFIED
PAGAMENOS_SPEC_AUTHORITY.md              : NOT MODIFIED
B1 / B2 IMPLEMENTATION                   : NO
C1 / C2                                  : NO
P-16                                     : ACTIVE
```

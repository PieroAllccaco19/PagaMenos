# PAGAMENOS — M7 — OUTCOME + EVIDENCE — EFFECTIVE SPECIFICATION V1.1 — ERRATUM 04 (F12 MULTI-ARRAY UNNEST EXECUTABILITY)

```
AUTHOR CANDIDATE — NOT YET AUTHORITATIVE
NOT SELF-ACCEPTED — AWAITING INDEPENDENT AUDIT
M7-S03 REMAINS BLOCKED

ERRATUM KIND                 : SQL EXECUTABILITY ERRATUM (narrow, occurrence-scoped, invocation syntax only)
DEFECT CLASS                 : E04-MU — schema-qualified multi-array UNNEST written as an ordinary function call
ACCEPTED V1.1 BYTES EDITED   : NO
ACCEPTED ERRATUM 01 EDITED   : NO
ACCEPTED ERRATUM 02 EDITED   : NO
ACCEPTED ERRATUM 03 EDITED   : NO
CCA / VBA-01 / VFC-01 EDITED : NO
ROOT REGISTER EDITED         : NO
SQL OCCURRENCES CORRECTED    : 6 (all in fragment F12, all in m7.c_load_catalog_expectations_v1; 25 fragments byte-unaffected)
V1.1 LINES SUPERSEDED        : 7 (6299, 6303, 6306, 6307, 6309, 6312, 6314); LINES ADDED / REMOVED : 0 / 0
NEW TABLES / FUNCTIONS / CONSTRAINTS / INDEXES / TRIGGERS / VIEWS / GRANTS : 0
REMOVED FUNCTIONS            : 0
CONTROL-PLANE / EXPECTED-CATALOG / TRANSACTION / LOCKING / ROLE / LIFECYCLE SEMANTICS CHANGED : 0
MANIFEST AUTHORED            : NO
SELECTOR ROTATION            : NOT PERFORMED
```

**Nature.** A documentation-only erratum candidate against the independently accepted M7 Outcome/Evidence Effective Specification V1.1, read together with the accepted and protected-integrated Erratum 01, Erratum 02 and Erratum 03. It corrects **only** the six SQL occurrences enumerated in §7, and only their **invocation syntax**: in each, the multi-array form of `UNNEST` — which PostgreSQL provides only as a special table-function form of the *unqualified* name in a `FROM` clause — was written schema-qualified as `pg_catalog.unnest(array1, array2, …)`. PostgreSQL treats that spelling as an ordinary qualified function call and looks for a multi-argument `pg_catalog.unnest` overload, which does not exist, so each statement fails with `42883` when it is analysed at execution. Each occurrence is replaced by the explicit `ROWS FROM (pg_catalog.unnest(array1), pg_catalog.unnest(array2), …)` form, which is exactly the query tree PostgreSQL builds for the documented multi-array `UNNEST` (§8). The arrays, the column aliases, the `INSERT` column mappings, the rows produced and their order are unchanged. This erratum changes no runtime code, Prisma schema, migration, test, workflow, `scripts-trusted/` file, `authority/` artifact, S01 extraction artifact, repository setting or external variable. It edits neither the accepted V1.1 bytes, nor Erratum 01, Erratum 02 or Erratum 03, nor the CCA, VBA-01 or VFC-01, nor the root register.

**Conventions.** MUST / MUST NOT / MAY are normative. "V1.1 §n" and "V1.1 line n" = `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1.md` at the exact accepted bytes of §1.2 (1-based line numbers, LF-separated). "Erratum 01" / "Erratum 02" / "Erratum 03" = the accepted files of §1.2. "VBA-01" = `PAGAMENOS_M7_S03_VERIFICATION_BOOTSTRAP_AMENDMENT_01.md`; "VFC-01" = `PAGAMENOS_M7_VBA_S02_1_POSTGRESQL_VERSION_FLOOR_CLARIFICATION_01.md`; "CCA" = `PAGAMENOS_A1_A2_M7_CONSENT_COMPATIBILITY_AMENDMENT_01.md`; "Register §n" = `PAGAMENOS_SPEC_AUTHORITY.md` at the baseline of §1.1. "Fragment F01 … F26" = the 26 normative SQL fence bodies of V1.1 §19.2–§19.13 in ascending source order, as in Erratum 02 and Erratum 03. "Effective F*nn*" = the fragment with every accepted Erratum 02 and Erratum 03 correction applied, i.e. the bytes of the accepted M7-S01 extraction of §1.3. "Fragment line" = 1-based line within the effective fragment file. For F12, which no accepted erratum amends, fragment line = V1.1 line − 5820. Identifiers introduced here carry the prefix `E04-`; full-text search of the accepted V1.1, Erratum 01, Erratum 02, Erratum 03, CCA, VBA-01, VFC-01 and register bytes returns zero matches for `E04-`.

---

## 1. Exact authority baseline

### 1.1 Protected authority tip

| Item | Value |
| :-- | :-- |
| Repository | `PieroAllccaco19/PagaMenos` |
| Protected surface | `origin/m3.5b-b-integration` |
| Baseline commit | `a384d815e3851cb733babf5f90df53cec98426fc` (PR #36 merge, *"m7-vfc01-root-authority-sync"*) |
| Baseline tree | `88dbdf19d87626690964ab306809afc371b99fc3` |
| Parents, in order | 1. `475752e894d8468407f1f45523b870d753ed1ecd` — 2. `3ca91a49caef1c7fe043e596c7a6bfd832860086` |
| Lineage | this erratum candidate is a single non-merge commit whose only parent is the baseline commit, adding exactly one path: this file |

### 1.2 Immutable accepted artifacts — exact identities (not edited)

| Artifact | Git blob at the baseline | SHA-256 | Lines / bytes |
| :-- | :-- | :-- | :-- |
| `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1.md` (V1.1) | `06e103b0d5e8cfcbb96ab21134d5605b0aae9b26` | `457f51778fb5d5890b3e3478376e413072f15aef7da88125b5e78963f49394bd` | 10 626 / 1 143 725 |
| `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_01.md` (E01) | `15ee22090d3e37b6a63dd25914f8abb0f4fa9d4b` | `f381cb015adadc7a22463060da7ff55e8711b8ab13879c60f93cabf53eb863e8` | 604 / 82 027 |
| `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_02.md` (E02) | `a0e6fa6720f23ac08485ab7cb696ab9ba4b7e83f` | `b7b3440ad04181356770f243a6e2870e004aba604d2a62afdefd5330c85c170f` | 515 / 44 295 |
| `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_03.md` (E03) | `8ba87adc9b87cee749c214d9326b0aa750ceabf0` | `b4debcb5a02e777e780e14002c5e9cdbb90f2140f5b7516592b8e05e67366160` | 779 / 72 201 |
| `PAGAMENOS_A1_A2_M7_CONSENT_COMPATIBILITY_AMENDMENT_01.md` (CCA) | `2f0ff3c886c5ac9b1cbba797404e9024c0b83732` | `3a6003494f4817907401a9afda5b9d9a1647ade5ff9196f2aee2ba3b1b2ca1ad` | 1 091 / 58 471 |
| `PAGAMENOS_M7_S03_VERIFICATION_BOOTSTRAP_AMENDMENT_01.md` (VBA-01) | `d10d59cac8f0d77304b88c6df0e06b89d710141d` | `dca045b62b245064926c1d4cb61c53f4f4f4110c22bcbf917a159e49ce3d1033` | 559 / 63 998 |
| `PAGAMENOS_M7_VBA_S02_1_POSTGRESQL_VERSION_FLOOR_CLARIFICATION_01.md` (VFC-01) | `7613c8a669bcaee9418a0e5f207192fdb5c45b75` | `ae8dd03b57e199177610e3b40c221542d41aa1f78265b4dc5eee2d967c2ba8e7` | 476 / 28 501 |
| `PAGAMENOS_SPEC_AUTHORITY.md` (root register) | `4e82d571982375666cd3ba9787d72d30ce6de7c8` | `fc0b665b4be296594b48ced920d2edbf697d806a710976eb22eda8ded34fa545` | 2 978 / 349 947 |

The effective M7 normative-SQL conformance target at the baseline is **M7 V1.1 + accepted Erratum 01 + accepted Erratum 02 + accepted Erratum 03** (Register §15.2, reaffirmed by §17.2 and §17.12). This candidate controls nothing until independently accepted (§4 item 8).

### 1.3 Implementation-line artifacts consulted (not authority; not edited)

| Item | Value |
| :-- | :-- |
| Implementation staging | `origin/m7-v1.1-implementation`, tip `c66b70f568fa504503a5fda4b6a969820b7593d4` (PR #38 merge), tree `fde3a82e10117210b9c6ecaf9d936d7d546a7227` |
| M7-S01 extraction consulted | `prisma/m7/normative/` at that tip; `EXTRACTION_INDEX.json` SHA-256 `7e00ddc8fbbdad8f2f5cb2c0a36f79b69ec533cbb69e8d0a5a61eabe21aed665`; every one of the 26 extracted files re-verified against its pinned `sha256` |
| F12 entry of the index | clause `19.11.2`; heading line 5818; fence lines 5820–6319; body V1.1 lines **5821–6318**; 498 lines; 34 526 bytes; SHA-256 `572a9cf7182772f01b263ec367f993522c39e81e27edc74e59ea1ba65b6dd5a9`; `erratum02Corrections: []`; `erratum03Corrections: []` |
| F12 fidelity | the extracted F12 file is byte-identical to V1.1 lines 5821–6318 joined by LF with a final LF (re-verified by this author) |

These artifacts are cited only to locate the occurrences and to state informative future pins (§11). This erratum asserts no register status for any implementation-line slice.

### 1.4 Provenance of the triggering evidence (not authority)

A fresh, authorized M7-S03 execution on implementation staging `c66b70f…`, against PostgreSQL 18.4, reached call 6 of the VBA-01 seven-call `M7-S03-VBCP` sequence (VBA-01 §7.6), `m7.c_load_catalog_expectations_v1`, and failed with:

```
SQLSTATE = 42883
error    = function pg_catalog.unnest(name[], "char"[]) does not exist
```

No normative SQL was patched during that run; the installing transaction rolled back; no candidate S03 commit was created. The S03 worktree was left uncommitted and unpublished as diagnostic evidence only. **That execution is triggering evidence, not authority, and is not incorporated.** The defect, its class and every correction below were re-derived by this author from the accepted bytes of §1.2 and from PostgreSQL semantics, and every executable claim was re-checked on a fresh disposable scratch cluster (`PostgreSQL 18.4 on x86_64-windows, compiled by msvc-19.44.35227, 64-bit`, `check_function_bodies = on`) against scratch copies of the fragments outside any repository (§9).

---

## 2. Scope

### 2.1 In scope — defect class `E04-MU`

An occurrence belongs to class **`E04-MU`** if and only if all of the following hold:

1. it is inside one of the 26 effective fragments F01 … F26;
2. it is a call of the function name `unnest` written **schema-qualified** (in any schema; in practice `pg_catalog.unnest`);
3. its argument list has **two or more** top-level arguments; and
4. as a consequence it is not executable: PostgreSQL resolves it as an ordinary qualified function call, finds no `unnest` overload of that arity, and raises `42883` when the statement is analysed.

A correction is in scope only if it changes invocation syntax alone and is proven to produce the identical query tree and rows (§8).

### 2.2 Explicitly out of scope

- any single-argument `pg_catalog.unnest(…)` call — valid and unaffected (§6);
- any other set-returning function, and any other special-grammar or special-analysis form; this erratum is not broadened beyond `E04-MU`;
- any change of array construction, element values, column aliases, `INSERT` target columns, ordering, row values, `RETURN` value, `GET DIAGNOSTICS`, lock, transaction boundary, role, grant, identity, digest input, lifecycle or Gate-2 requirement;
- any SQL or prose outside the six occurrences of §7, including every other statement of `m7.c_load_catalog_expectations_v1`;
- the F26 prefix/suffix byte-count observation (2 094 / 2 095): it is unrelated to `E04-MU`; VBA-01 labels those prefix/suffix hashes and sizes as informative values, while its normative requirement is byte-exact partition/recomposition at the unique `DO $final$`. It is not an item of this erratum;
- the S01 regeneration, the root registration, the authority → staging synchronization and any S03 work (§11–§13);
- CCA, VBA-01 and VFC-01 text, `authority/`, the selector, the manifest and the root register.

---

## 3. The defect mechanism

PostgreSQL has three spellings that look alike and behave differently:

| Form | Where | What PostgreSQL does | Result |
| :-- | :-- | :-- | :-- |
| **Valid ordinary** `pg_catalog.unnest(one_array)` | anywhere | ordinary function resolution; finds the real one-argument function `pg_catalog.unnest(anyarray)` | executes |
| **Valid special** `UNNEST(array1, array2, …)` — name **unqualified** | only in `FROM` | parse analysis recognises the special table-function form and expands it into `ROWS FROM (pg_catalog.unnest(array1), pg_catalog.unnest(array2), …)` before any function lookup | executes |
| **Defective** `pg_catalog.unnest(array1, array2, …)` | anywhere | the name is qualified, so the special expansion does not apply; ordinary function resolution looks for a `pg_catalog.unnest` with *k* ≥ 2 array arguments | **`42883`** |

**No multi-argument overload exists.** On PostgreSQL 18.4, `pg_proc` has exactly three functions named `unnest`: `unnest(anyarray)`, `unnest(tsvector)` and `unnest(anymultirange)`, each with `pronargs = 1` and none variadic (§9, check A0). The multi-array form exists only as the special table-function syntax. The PostgreSQL documentation describes it (Array Functions, §9.19) as a form that expands several arrays, possibly of different types, into a set of rows, padding shorter arrays with NULLs, and that is allowed only in a query's `FROM` clause; and (Table Functions, §7.2.1.4) as behaving as if `UNNEST` had been called on each parameter separately and the results combined with `ROWS FROM`. In the parser, this expansion is performed by `transformRangeFunction` (`src/backend/parser/parse_clause.c`) only when the function name is the single, unqualified identifier `unnest`; it builds one `SystemFuncName("unnest")` — that is, `pg_catalog.unnest` — call per argument.

**Why the defect surfaces only at execution.** The qualified multi-array call is grammatically an ordinary function call, so it passes raw parsing. Function resolution happens during parse analysis. For a statement embedded in a PL/pgSQL body, `CREATE FUNCTION` with `check_function_bodies = on` performs only the raw parse, so the function is created; the statement is analysed — and fails — the first time it executes. That is exactly what the triggering run observed: the whole install, including F12, succeeded, and the failure came at the first `INSERT` of `m7.c_load_catalog_expectations_v1` during VBCP call 6. Reproduced on PostgreSQL 18.4 (§9, checks C1, F1, G2, G3):

```text
CREATE FUNCTION … AS $fn$ … FROM pg_catalog.unnest(p_n, p_k) AS t(a,b) … $fn$     -> CREATE FUNCTION
SELECT <that function>(…)                                                          -> 42883 function pg_catalog.unnest(name[], "char"[]) does not exist
                                                                                      LOCATION: ParseFuncOrColumn, parse_func.c
FROM ROWS FROM (pg_catalog.unnest(p_n), pg_catalog.unnest(p_k)) AS t(a,b)          -> executes
```

The failure depends on the invocation form, not on element types: the qualified multi-array spelling fails with `42883` for `name[]`+`"char"[]`, `integer[]`+`text[]`, `text[]`+`text[]`, `name[]`+`name[]`, `text[]`+`name[]`, `name[]`+`boolean[]`×3, `text[]`+`boolean[]`+`text[]`+`text[]` and `name[]`+enum`[]`+`name[]`+`boolean[]`, while the `ROWS FROM` form of each executes (§9, checks A1–A8, B3–B4).

---

## 4. Reading rule and occurrence-scoped precedence

1. **Accepted bytes are never edited.** V1.1, Erratum 01, Erratum 02 and Erratum 03 remain authoritative for every byte and clause except the six occurrences of §7 and the one Erratum 02 classification of §5.
2. **Supersession is occurrence-scoped.** For each `E04-nn`, the "After" block replaces exactly its quoted "Before" block at exactly the named V1.1 lines. Only the named changed lines differ; every other line of the block is quoted for context and is byte-identical in "Before" and "After". No line is added, removed or reordered, so every V1.1 line number, every fence span and every fragment line count is unchanged.
3. **Uniqueness.** Each replaced substring occurs exactly once on its named line and exactly once in the accepted V1.1 bytes (verified; §7), so each replacement is unambiguous.
4. **Erratum 01 is unaffected.** No `E04` occurrence lies in, or is cited by, a clause Erratum 01 amends (ER-01 … ER-05); MD-1 … MD-7 and MG-1 … MG-6 apply unchanged to migration bytes containing the corrections. No "Before" or "After" replacement block of the six corrected SQL occurrences `E04-01` … `E04-06` contains a manifest digest, the Erratum 01 placeholder `P` or a `sha256:` literal, so none of them introduces such a value into normative SQL. This statement concerns those six SQL occurrences only, not all prose of this document: §10.2 records two informative `prosrc` digests in `sha256:` notation as evidence, outside every replacement block.
5. **Erratum 02.** Its nine corrections `E02-01` … `E02-09` (V1.1 lines 4494, 4545, 4853, 5442, 6912, 8219, 8221, 8222, 8826) are disjoint from every `E04` line and are not reopened. Exactly one Erratum 02 classification is superseded, and only for the six `E04-MU` sites (§5).
6. **Erratum 03.** Its fourteen occurrences (V1.1 lines 2231, 2313, 2319, 2471, 5233, 5235, 8403, 8404, 8496, 8545, 8551, 8607, 9414, 9527, 9639 and the 5 inserted lines) are disjoint from every `E04` line; its semantic rules are neither reinterpreted nor weakened. Erratum 03 §10 item 4 requires F12 to remain byte-identical: that requirement governs the Erratum 03 regeneration scope and is satisfied by the accepted E03 regeneration. Erratum 04 is a **later, occurrence-scoped executability correction**; for **exactly** the seven V1.1 lines of the six `E04` occurrences it takes precedence, and for every other byte of F12 — and of F02–F10, F13–F23, F25, F26 — the Erratum 03 byte-identity requirement continues to hold unchanged. The same reading applies to Erratum 02 §9 item 5, which lists F12 among the fragments unaffected by Erratum 02.
7. **VBA-01 and VFC-01 are unaffected** (§10.2). Neither is an erratum and neither is amended. VBA-01 §13 (`S01 REGENERATION REQUIRED : NO`) and Register §17.2 (`F01–F26 AND M7-S01 PINS UNCHANGED`) were true of VBA-01 and VFC-01 and remain true of them; the F12 byte change and the S01 regeneration it requires are consequences of this erratum, not of VBA-01 or VFC-01.
8. **Conflict.** If this erratum and the accepted bytes appear to conflict outside the enumerated occurrences, the accepted bytes (read with Errata 01–03) control, and the conflict is an erratum defect to be reported, not resolved by interpretation.
9. **Effective reading after acceptance.** Once this erratum is independently accepted, protected-integrated and registered in the root register, the M7 normative-SQL conformance target becomes **M7 V1.1 + accepted Erratum 01 + accepted Erratum 02 + accepted Erratum 03 + accepted Erratum 04**. Until then it remains **M7 V1.1 + accepted Erratum 01 + accepted Erratum 02 + accepted Erratum 03**, and this candidate controls nothing.

---

## 5. Erratum 02 interaction — the original false negative

Erratum 02 §5.4 classifies as **NOT DEFECT** the row *"the remaining 330 `pg_catalog` call sites (28 ordinary functions, incl. … `unnest` with several arrays, …)"*, with the reason that every one parses, none names a category-`C`/`R` keyword, and each name has a `pg_proc` entry.

**Narrow supersession.** Erratum 04 supersedes that classification **only** for the six schema-qualified multi-array `unnest` call sites of §7: they are classified **DEFECT, class `E04-MU`**. The classification of every other call site of that row — including the six single-array `pg_catalog.unnest(…)` sites (§6) — is unchanged. Erratum 02's class `E02-SX`, its census of §5.2, its nine corrections and its proofs are not reopened, and its bytes are not edited.

**Why the scan missed it — precisely.**

1. Erratum 02 §5.1 step 5 checked every `pg_catalog` call site by **raw parse** (a `PERFORM <call>` inside a PL/pgSQL body created with `check_function_bodies = on`) — explicitly "without name resolution".
2. The schema-qualified multi-array `unnest(…)` **parses**: it is a grammatical generic function call. Verified: Erratum 02's own method creates `PERFORM pg_catalog.unnest(p_relation_names, p_relation_kinds)` successfully (§9, check G2).
3. Erratum 02 §5.1 step 6 performed **resolution** only for names that are keywords of category `C` or `R`. `unnest` is **not a keyword at all** (absent from `pg_get_keywords()`; §9, check G1), so it was never in the resolution scan.
4. The §5.4 reason "each name has a `pg_proc` entry" is true of the **name** `unnest` but not of the **arity**: every `pg_proc` entry named `unnest` takes one argument (§3).
5. Therefore ordinary function resolution of the multi-array form was never exercised, and the defect manifests only at statement analysis during execution, with `42883`.

Erratum 03 did not surface it either: its §9 evidence loaded the verifier's expectation set **directly into scratch copies of the §19.5 tables** and registered no control-plane row, so `m7.c_load_catalog_expectations_v1` was created but never executed. This is recorded as fact, not as a defect of Erratum 03.

---

## 6. Exhaustive `unnest` census (F01 … F26)

### 6.1 Method

Input: the 26 effective fragment files of §1.3, each first re-verified against its pinned SHA-256.

1. **Lexical masking.** `--` comments and single-quoted literals were blanked (offsets preserved); dollar-quoted bodies were scanned. The raw and masked `unnest` token counts are equal in every fragment (F10: 1/1, F11: 1/1, F12: 10/10, all others 0/0), so no occurrence hides in a comment or literal.
2. **Qualified calls.** Every match of `pg_catalog\s*\.\s*unnest\s*\(` (case-insensitive) was located; its balanced argument list was extracted and its top-level commas counted.
3. **Other schemas.** Every `<identifier>.unnest(` with a schema other than `pg_catalog` was searched for.
4. **Unqualified calls.** Every `unnest(` not preceded by `.`, an identifier character or `"` was searched for (the valid special form, if present, would appear here).
5. **Existing `ROWS FROM`.** Every `ROWS FROM` was searched for.

### 6.2 Results

| Measure | Result |
| :-- | :-- |
| Fragments scanned | **26 / 26** |
| Schema-qualified `pg_catalog.unnest(` calls, F01 … F26 | **12** |
| — single-array (1 argument) | **6** — F10 × 1, F11 × 1, F12 × 4 — **VALID / UNAFFECTED** |
| — multi-array (≥ 2 arguments) | **6** — F12 × 6 — **DEFECT / IN SCOPE** |
| Schema-qualified `pg_catalog.unnest(` calls in accepted effective F12 | **10** = 4 single-array + 6 multi-array |
| `unnest` qualified by any other schema | **0** |
| Unqualified `unnest(` / `UNNEST(` | **0** |
| `ROWS FROM` | **0** |
| Multi-array qualified calls outside F12 | **0** — no further member of `E04-MU` exists |

### 6.3 Occurrence table

| # | Fragment / clause | Fragment line | V1.1 line | Enclosing object | Args | Call (whitespace-normalised) | Classification |
| --: | :-- | --: | --: | :-- | --: | :-- | :-- |
| 1 | F10 / §19.10.1 | 49 | 5092 | `DO $triggers$` (§19.10.1 trigger loop) | 1 | `pg_catalog.unnest(r.paths)` | VALID |
| 2 | F11 / §19.11.1 | 404 | 5613 | `m7.i_hold_backends_liveness(p_backends text[])` | 1 | `pg_catalog.unnest(p_backends)` | VALID |
| 3 | F12 / §19.11.2 | 286 | 6106 | `m7.c_register_merchant_vocabulary_v1` | 1 | `pg_catalog.unnest(p_merchant_refs)` | VALID |
| 4 | F12 / §19.11.2 | 294 | 6114 | `m7.c_register_merchant_vocabulary_v1` | 1 | `pg_catalog.unnest(p_merchant_refs)` | VALID |
| 5 | F12 / §19.11.2 | 308 | 6128 | `m7.c_register_merchant_vocabulary_v1` | 1 | `pg_catalog.unnest(p_merchant_refs)` | VALID |
| 6 | F12 / §19.11.2 | 326 | 6146 | `m7.c_register_merchant_vocabulary_v1` | 1 | `pg_catalog.unnest(p_merchant_refs)` | VALID |
| 7 | F12 / §19.11.2 | 479 | 6299 | `m7.c_load_catalog_expectations_v1` | 2 | `pg_catalog.unnest(p_relation_names, p_relation_kinds)` | **DEFECT `E04-01`** |
| 8 | F12 / §19.11.2 | 483 | 6303 | `m7.c_load_catalog_expectations_v1` | 4 | `pg_catalog.unnest(p_object_relations, p_object_kinds, p_object_names, p_object_unique)` | **DEFECT `E04-02`** |
| 9 | F12 / §19.11.2 | 486–487 | 6306–6307 | `m7.c_load_catalog_expectations_v1` | 4 | `pg_catalog.unnest(p_function_signatures, p_function_definer, p_function_proconfig, p_function_source_sha256)` | **DEFECT `E04-03`** |
| 10 | F12 / §19.11.2 | 489 | 6309 | `m7.c_load_catalog_expectations_v1` | 2 | `pg_catalog.unnest(p_grant_signatures, p_grant_roles)` | **DEFECT `E04-04`** |
| 11 | F12 / §19.11.2 | 492 | 6312 | `m7.c_load_catalog_expectations_v1` | 4 | `pg_catalog.unnest(p_role_names, p_role_can_login, p_role_inherits, p_role_schema_usage)` | **DEFECT `E04-05`** |
| 12 | F12 / §19.11.2 | 494 | 6314 | `m7.c_load_catalog_expectations_v1` | 2 | `pg_catalog.unnest(p_member_roles, p_member_names)` | **DEFECT `E04-06`** |

F11's fragment line 404 corresponds to V1.1 line 5613 (the `E03-01` insertion of 2 lines precedes it in the effective F11). The four single-array F12 occurrences, in the merchant-vocabulary logic, **MUST remain unchanged**.

**Scan conclusion.** Class `E04-MU` has exactly six members, all in F12, all in `m7.c_load_catalog_expectations_v1`, one per multi-array `INSERT … SELECT` of that function. F01–F11 and F13–F26 contain no member.

---

## 7. Normative corrections `E04-01` … `E04-06`

Each correction replaces the `FROM` item `pg_catalog.unnest(a₁, …, aₖ) AS t(…)` with `ROWS FROM (pg_catalog.unnest(a₁), …, pg_catalog.unnest(aₖ)) AS t(…)`, keeping the arguments in the same order, the same alias `t` and the same column-alias list. "Before" and "After" quote the **complete statement** (the whole `INSERT … SELECT … ;`), byte-exact, one V1.1 line per text line (leading spaces significant). Statement SHA-256 = SHA-256 of the quoted lines joined by LF, without a final LF. Line SHA-256 = SHA-256 of one line without its terminating LF. The byte delta is the statement delta and equals the sum of the changed-line deltas.

The layout of the corrected text keeps every changed occurrence on the same V1.1 line(s) as the original, so no line is added or removed; SQL whitespace and line breaks are insignificant, so this layout is equivalent to any other layout of the same tokens.

### 7.1 `E04-01` — V1.1 §19.11.2 (effective F12), `m7.c_load_catalog_expectations_v1(…)`, INSERT into `m7.m7_expected_relation`

| Item | Value |
| :-- | :-- |
| E04 ID | `E04-01` |
| V1.1 / effective clause | §19.11.2 — fragment F12 |
| V1.1 statement lines | 6298–6299 (changed: 6299) |
| F12 fragment lines | 478–479 (changed: 479) |
| Enclosing function | `m7.c_load_catalog_expectations_v1(p_manifest_version text, …, p_member_names name[])` (18 array parameters) |
| Arrays combined | 2 |
| Statement SHA-256 (original) | `dc631d1ca6209a98bd235fd9338098c03a8fb9c5cdc6dd3d8e22a183158fb6a9` (194 bytes) |
| Statement SHA-256 (corrected) | `1b802600156dd584ed693358e2fd9c2d0dc454ee128ce1b7995a57327231d522` (225 bytes) |
| Byte delta | +31 |
| Line 6299 SHA-256 | `9976de0c8c466172d6ad271470aac2fcae92fb905ca02a9cc088036e39cba731` → `6128e880977d559dc94770db6e33b65e5b0a501b32654e5c5f393e734fa09376` (+31 bytes) |

Before (complete statement):

```sql
    INSERT INTO m7.m7_expected_relation ("manifestVersion","relationName","relKind")
        SELECT p_manifest_version, a, b FROM pg_catalog.unnest(p_relation_names, p_relation_kinds) AS t(a,b);
```

After (complete statement):

```sql
    INSERT INTO m7.m7_expected_relation ("manifestVersion","relationName","relKind")
        SELECT p_manifest_version, a, b FROM ROWS FROM (pg_catalog.unnest(p_relation_names), pg_catalog.unnest(p_relation_kinds)) AS t(a,b);
```

### 7.2 `E04-02` — V1.1 §19.11.2 (effective F12), `m7.c_load_catalog_expectations_v1(…)`, INSERT into `m7.m7_expected_relation_object`

| Item | Value |
| :-- | :-- |
| E04 ID | `E04-02` |
| V1.1 / effective clause | §19.11.2 — fragment F12 |
| V1.1 statement lines | 6301–6303 (changed: 6303) |
| F12 fragment lines | 481–483 (changed: 483) |
| Enclosing function | `m7.c_load_catalog_expectations_v1(p_manifest_version text, …, p_member_names name[])` (18 array parameters) |
| Arrays combined | 4 |
| Statement SHA-256 (original) | `579c0608d59b0f4112b54a72098321f7fa094ce61b2bbda273c1ef81c381ff49` (281 bytes) |
| Statement SHA-256 (corrected) | `ecf235c043b7768967e4d252e8f21e7abfa47bc15cd241bcf908f4d33d8fc342` (350 bytes) |
| Byte delta | +69 |
| Line 6303 SHA-256 | `28fa75d5f9b5ce4d6f819411b45e29bf81514da860024c165b04e3df54510a84` → `bc4fd7ee0a78349ab40bf80fb17b47cd26cb7beb9c78ab00919b05a0ff68ad26` (+69 bytes) |

Before (complete statement):

```sql
    INSERT INTO m7.m7_expected_relation_object ("manifestVersion","relationName","objectKind","objectName","isUnique")
        SELECT p_manifest_version, a, b, c, d
          FROM pg_catalog.unnest(p_object_relations, p_object_kinds, p_object_names, p_object_unique) AS t(a,b,c,d);
```

After (complete statement):

```sql
    INSERT INTO m7.m7_expected_relation_object ("manifestVersion","relationName","objectKind","objectName","isUnique")
        SELECT p_manifest_version, a, b, c, d
          FROM ROWS FROM (pg_catalog.unnest(p_object_relations), pg_catalog.unnest(p_object_kinds), pg_catalog.unnest(p_object_names), pg_catalog.unnest(p_object_unique)) AS t(a,b,c,d);
```

### 7.3 `E04-03` — V1.1 §19.11.2 (effective F12), `m7.c_load_catalog_expectations_v1(…)`, INSERT into `m7.m7_expected_function`

| Item | Value |
| :-- | :-- |
| E04 ID | `E04-03` |
| V1.1 / effective clause | §19.11.2 — fragment F12 |
| V1.1 statement lines | 6304–6307 (changed: 6306, 6307) |
| F12 fragment lines | 484–487 (changed: 486, 487) |
| Enclosing function | `m7.c_load_catalog_expectations_v1(p_manifest_version text, …, p_member_names name[])` (18 array parameters) |
| Arrays combined | 4 |
| Statement SHA-256 (original) | `5925e5f3976114bc731be149f53eb349c00033d301733dc17a2f06905faab848` (348 bytes) |
| Statement SHA-256 (corrected) | `bb46bdce3a359ae06d022767f68cab3c8cc3e8d518d4b17bbbf0551189aa4238` (410 bytes) |
| Byte delta | +62 |
| Line 6306 SHA-256 | `1f75abeda22c1c0aade787d6157fb122cba634da61429918119570ca95f8cfdf` → `ff83e00fcc78395b4a89dff9223b2e7dfc2ae3805829522c5c8d65f74f5715d5` (+9 bytes) |
| Line 6307 SHA-256 | `795d19f64537fe1be86c81a78fb9331a1c08d5284819808f44c99168b10256cb` → `85c728a0f67cd649ee58b213f5e99d742256f8ef408c9f651d48dd8e8051958b` (+53 bytes) |

Before (complete statement):

```sql
    INSERT INTO m7.m7_expected_function ("manifestVersion","functionSignature","isSecurityDefiner","proconfigText","sourceSha256")
        SELECT p_manifest_version, a, b, c, d
          FROM pg_catalog.unnest(p_function_signatures, p_function_definer, p_function_proconfig,
                                 p_function_source_sha256) AS t(a,b,c,d);
```

After (complete statement):

```sql
    INSERT INTO m7.m7_expected_function ("manifestVersion","functionSignature","isSecurityDefiner","proconfigText","sourceSha256")
        SELECT p_manifest_version, a, b, c, d
          FROM ROWS FROM (pg_catalog.unnest(p_function_signatures), pg_catalog.unnest(p_function_definer),
                          pg_catalog.unnest(p_function_proconfig), pg_catalog.unnest(p_function_source_sha256)) AS t(a,b,c,d);
```

### 7.4 `E04-04` — V1.1 §19.11.2 (effective F12), `m7.c_load_catalog_expectations_v1(…)`, INSERT into `m7.m7_expected_function_grant`

| Item | Value |
| :-- | :-- |
| E04 ID | `E04-04` |
| V1.1 / effective clause | §19.11.2 — fragment F12 |
| V1.1 statement lines | 6308–6309 (changed: 6309) |
| F12 fragment lines | 488–489 (changed: 489) |
| Enclosing function | `m7.c_load_catalog_expectations_v1(p_manifest_version text, …, p_member_names name[])` (18 array parameters) |
| Arrays combined | 2 |
| Statement SHA-256 (original) | `75bada66e6da87b1d0e4e3f8e46aa74194d6784ab3790245cda4df2798a9728e` (208 bytes) |
| Statement SHA-256 (corrected) | `2def08dadbb3f778419f4ecc7f7d5ea14443a4f56ed279a8dbfb1e35d021efe7` (239 bytes) |
| Byte delta | +31 |
| Line 6309 SHA-256 | `342b4a37e3638b5766304da41ae03ae60142add96c886a23f72ba50f1e2a4ee2` → `6d4e9236c2f4becfc72b9511fe1ec608f7440090576f0185b520bd95049711b9` (+31 bytes) |

Before (complete statement):

```sql
    INSERT INTO m7.m7_expected_function_grant ("manifestVersion","functionSignature","granteeRole")
        SELECT p_manifest_version, a, b FROM pg_catalog.unnest(p_grant_signatures, p_grant_roles) AS t(a,b);
```

After (complete statement):

```sql
    INSERT INTO m7.m7_expected_function_grant ("manifestVersion","functionSignature","granteeRole")
        SELECT p_manifest_version, a, b FROM ROWS FROM (pg_catalog.unnest(p_grant_signatures), pg_catalog.unnest(p_grant_roles)) AS t(a,b);
```

### 7.5 `E04-05` — V1.1 §19.11.2 (effective F12), `m7.c_load_catalog_expectations_v1(…)`, INSERT into `m7.m7_expected_role`

| Item | Value |
| :-- | :-- |
| E04 ID | `E04-05` |
| V1.1 / effective clause | §19.11.2 — fragment F12 |
| V1.1 statement lines | 6310–6312 (changed: 6312) |
| F12 fragment lines | 490–492 (changed: 492) |
| Enclosing function | `m7.c_load_catalog_expectations_v1(p_manifest_version text, …, p_member_names name[])` (18 array parameters) |
| Arrays combined | 4 |
| Statement SHA-256 (original) | `521709208bfe103928ee7ecd4e7a0525ea56ce1023ea75aca12ad5557581dc04` (279 bytes) |
| Statement SHA-256 (corrected) | `e1fb884da786f2e66ab215ab542920bfdff4fd677ba7dffa0029d519326a7e45` (348 bytes) |
| Byte delta | +69 |
| Line 6312 SHA-256 | `11dadcadb3ccd1e5726bdf0f5ec9a5ae3d60fa190cdc84e60ca4f698ae26ebc1` → `19fb51b6b33b12f72096f03d5384a3cd8faa9ef0068d922743883f9509edb893` (+69 bytes) |

Before (complete statement):

```sql
    INSERT INTO m7.m7_expected_role ("manifestVersion","roleName","canLogin","inheritsPrivileges","hasSchemaUsage")
        SELECT p_manifest_version, a, b, c, d
          FROM pg_catalog.unnest(p_role_names, p_role_can_login, p_role_inherits, p_role_schema_usage) AS t(a,b,c,d);
```

After (complete statement):

```sql
    INSERT INTO m7.m7_expected_role ("manifestVersion","roleName","canLogin","inheritsPrivileges","hasSchemaUsage")
        SELECT p_manifest_version, a, b, c, d
          FROM ROWS FROM (pg_catalog.unnest(p_role_names), pg_catalog.unnest(p_role_can_login), pg_catalog.unnest(p_role_inherits), pg_catalog.unnest(p_role_schema_usage)) AS t(a,b,c,d);
```

### 7.6 `E04-06` — V1.1 §19.11.2 (effective F12), `m7.c_load_catalog_expectations_v1(…)`, INSERT into `m7.m7_expected_role_member`

| Item | Value |
| :-- | :-- |
| E04 ID | `E04-06` |
| V1.1 / effective clause | §19.11.2 — fragment F12 |
| V1.1 statement lines | 6313–6314 (changed: 6314) |
| F12 fragment lines | 493–494 (changed: 494) |
| Enclosing function | `m7.c_load_catalog_expectations_v1(p_manifest_version text, …, p_member_names name[])` (18 array parameters) |
| Arrays combined | 2 |
| Statement SHA-256 (original) | `4381a94cf788e7db408af20b09812722dff133cbddaa4c97d44164753c796106` (192 bytes) |
| Statement SHA-256 (corrected) | `ff375406d0e4174f8fb15bd77e758cf28064252a5eaae8e98fe991600c891e62` (223 bytes) |
| Byte delta | +31 |
| Line 6314 SHA-256 | `09ebc18dc22ba3647f6cc021540273bb6ecf87147a0b495f4caf41603e2eb151` → `661b489f29b330b424e899207478c83c6ece3ce5a0c30381303777cd30b6da13` (+31 bytes) |

Before (complete statement):

```sql
    INSERT INTO m7.m7_expected_role_member ("manifestVersion","roleName","memberName")
        SELECT p_manifest_version, a, b FROM pg_catalog.unnest(p_member_roles, p_member_names) AS t(a,b);
```

After (complete statement):

```sql
    INSERT INTO m7.m7_expected_role_member ("manifestVersion","roleName","memberName")
        SELECT p_manifest_version, a, b FROM ROWS FROM (pg_catalog.unnest(p_member_roles), pg_catalog.unnest(p_member_names)) AS t(a,b);
```

### 7.7 Summary and verification of the substitutions

| ID | Clause | V1.1 statement lines (changed) | Fragment lines (changed) | Target table | Arrays | Statement SHA-256 before → after | Δ bytes |
| :-- | :-- | :-- | :-- | :-- | --: | :-- | --: |
| `E04-01` | §19.11.2 | 6298–6299 (6299) | 478–479 (479) | `m7.m7_expected_relation` | 2 | `dc631d1ca6209a98…` → `1b802600156dd584…` | +31 |
| `E04-02` | §19.11.2 | 6301–6303 (6303) | 481–483 (483) | `m7.m7_expected_relation_object` | 4 | `579c0608d59b0f41…` → `ecf235c043b77689…` | +69 |
| `E04-03` | §19.11.2 | 6304–6307 (6306, 6307) | 484–487 (486, 487) | `m7.m7_expected_function` | 4 | `5925e5f3976114bc…` → `bb46bdce3a359ae0…` | +62 |
| `E04-04` | §19.11.2 | 6308–6309 (6309) | 488–489 (489) | `m7.m7_expected_function_grant` | 2 | `75bada66e6da87b1…` → `2def08dadbb3f778…` | +31 |
| `E04-05` | §19.11.2 | 6310–6312 (6312) | 490–492 (492) | `m7.m7_expected_role` | 4 | `521709208bfe1039…` → `e1fb884da786f2e6…` | +69 |
| `E04-06` | §19.11.2 | 6313–6314 (6314) | 493–494 (494) | `m7.m7_expected_role_member` | 2 | `4381a94cf788e7db…` → `ff375406d0e4174f…` | +31 |

Verified mechanically for every row: each replaced substring occurs exactly once on its named line and exactly once in the accepted V1.1 bytes; each "After" statement differs from its "Before" statement only in its `FROM` item; the four single-array F12 calls and every other F12 byte are unchanged; the line count of F12 is unchanged (498). Applying all six corrections to the effective F12 yields:

| | SHA-256 | Bytes | Lines |
| :-- | :-- | --: | --: |
| effective F12 (accepted, V1.1 + E01 + E02 + E03) | `572a9cf7182772f01b263ec367f993522c39e81e27edc74e59ea1ba65b6dd5a9` | 34 526 | 498 |
| effective F12 after `E04-01` … `E04-06` (informative) | `c154aee0e1d441d405f5a0e7c25d883aa643b40fc0458a99061d9f9145c147da` | 34 819 | 498 |

Total delta: +293 bytes = 31 + 69 + 62 + 31 + 69 + 31.

---

## 8. Proof of semantic equivalence

### 8.1 Lemma `E04-L1` — every inner call is the real one-argument function

Each inner call `pg_catalog.unnest(aᵢ)` has one argument of an array type (`name[]`, `"char"[]`, `m7."M7CatalogObjectKind"[]`, `boolean[]`, `text[]`). Its unique resolution is `pg_catalog.unnest(anyarray)`, returning `setof anyelement`, the element type of `aᵢ`: `unnest(tsvector)` and `unnest(anymultirange)` do not accept these types. Verified: every function reference in the stored query trees of §8.3 is `unnest(anyarray)` (§9, check E2). The explicit `pg_catalog` qualification is preserved in every call, so the corrected text keeps V1.1 §A.3's full-qualification discipline and, under `SET search_path = pg_catalog, pg_temp`, cannot be shadowed.

### 8.2 Lemma `E04-L2` — `ROWS FROM` is the documented semantics of multi-array `UNNEST`

`ROWS FROM (f₁, …, fₖ)` evaluates the table functions in parallel and returns their result columns side by side; each output row *n* contains the *n*-th row of every function; when the functions return different numbers of rows, the shorter results are padded with NULLs up to the longest. The documented multi-array `UNNEST(a₁, …, aₖ)` is defined as `UNNEST` applied to each argument separately and combined with `ROWS FROM` (§3). Therefore `ROWS FROM (pg_catalog.unnest(a₁), …, pg_catalog.unnest(aₖ)) AS t(c₁, …, cₖ)` is, by definition, the relation that the multi-array form denotes: *k* columns, column *i* of type `elemtype(aᵢ)` with that type's collation, row count `max(cardinality(aᵢ))` (a NULL array contributing zero rows), elements in array storage order, and NULL where an array is exhausted or where an element is NULL.

### 8.3 Lemma `E04-L3` — identical query tree

PostgreSQL's parse analysis of the documented form `UNNEST(a₁, …, aₖ)` in `FROM` produces the same query tree as the `E04` form. Evidence (PostgreSQL 18.4, §9, checks E1–E3): views built over a table of array columns with the documented form and with the `E04` form, for the two-array shape of `E04-01` (`name[]` + `"char"[]`), the four-array shape of `E04-02` (`name[]` + enum`[]` + `name[]` + `boolean[]`), a five-array mixed shape (`text[]` + `text[]` + `integer[]` + `"char"[]` + `boolean[]`), and the exact F12 shape (no `WITH ORDINALITY`, column-alias list only), store **identical** `pg_rewrite.ev_action` trees once parse locations are removed (4 of 4 pairs identical), and `pg_get_viewdef` deparses both to the same text. The only function referenced is `unnest(anyarray)`.

### 8.4 Lemma `E04-L4` — identical rows, order, NULL padding, types and collations

Over eight cases — equal lengths; unequal lengths; all arrays empty; some arrays empty; NULL elements; NULL arrays; a multidimensional array; non-1 lower bounds — for the two-, four- and five-array shapes and the exact F12 shape (§9, checks E4–E10):

| Property | Documented form vs `E04` form |
| :-- | :-- |
| row count per case | identical in every case and shape (e.g. unequal lengths: 4 = 4; all empty: 0 = 0) |
| column count | identical (2, 4, 5 result columns) |
| element order | identical `WITH ORDINALITY` numbering; identical emitted sequence without `ORDINALITY` (0 mismatches in 8 cases) |
| NULL padding | identical (e.g. `name[]`×4 + enum`[]`×2 + `name[]`×1 + `boolean[]`×0 ⇒ rows 2–4 padded identically) |
| type identity | identical `atttypid` / `atttypmod` for every output column (`name`, `"char"`, enum, `boolean`, `text`, `integer`); identical `pg_typeof` |
| collation | identical `attcollation` (`name` → `C`, `text` → default) and identical `pg_collation_for`, including a `COLLATE "C"` `text` element |
| row-by-row identity | symmetric `EXCEPT ALL` difference 0 for every shape |

### 8.5 Lemma `E04-L5` — the corrected loader behaves as the documented form

`m7.c_load_catalog_expectations_v1` was created three times in a scratch schema holding verbatim copies of the F04 (§19.5) tables and the §19.3 enum: from the accepted F12 bytes, from the `E04`-corrected bytes, and from a reference variant that differs from the accepted bytes only by writing the six multi-array calls in the documented unqualified form `UNNEST(…)` (§9, checks F1–F7). With a representative expectation set:

- the accepted bytes fail at the first `INSERT` with `42883 function pg_catalog.unnest(name[], "char"[]) does not exist`, and no row is written;
- the corrected bytes and the reference both return `3` and write identical rows into all six expectation tables (symmetric difference 0 in each: 3 / 4 / 2 / 2 / 3 / 1 rows);
- a second call for the same manifest returns `0` (the unchanged already-loaded branch);
- with arrays of unequal length, the corrected bytes and the reference both fail identically with `23502` on `m7_expected_relation."relKind"` — the same NULL padding meeting the same accepted `NOT NULL` constraint.

All nine F12 functions are created from the accepted bytes and from the corrected bytes over F02–F04, with identical signatures, `SECURITY DEFINER`, volatility, set-returning flag, return type, `proconfig` and ACL; only the `prosrc` of `m7.c_load_catalog_expectations_v1` differs (§9, check H1).

### 8.6 Theorem `E04-T1` — no semantic redesign

For every occurrence `E04-01` … `E04-06`, the corrected `FROM` item denotes the relation that the accepted text denotes under the documented multi-array `UNNEST` semantics — the same query tree (`E04-L3`), built from the same real function (`E04-L1`) over byte-identical array arguments in the same order, with the same aliases `t(a,b)` / `t(a,b,c,d)` feeding the same `SELECT` lists and the same `INSERT` column lists. Hence each `INSERT` writes the same rows into the same table, `GET DIAGNOSTICS v_n = ROW_COUNT` after `E04-01` sees the same count, and the function returns the same value. Every other byte of the 26 fragments is unchanged (§4). Every accepted control-plane, catalog-expectation, transaction, locking, role, identity, digest, CCA-boundary, lifecycle and Gate-2 property of V1.1 read with Errata 01–03 therefore holds of the corrected text exactly as specified; the only observable difference is that the function can now execute. ∎

---

## 9. Empirical evidence (PostgreSQL 18.4; evidence, not authority)

Setup: a fresh disposable cluster initialised for this work, `PostgreSQL 18.4 on x86_64-windows, compiled by msvc-19.44.35227, 64-bit`, `check_function_bodies = on`, one scratch database per check group, dropped afterwards. Fragment bytes were taken from §1.3; corrections were applied to scratch copies outside any repository.

| Check | Result |
| :-- | :-- |
| A0 `pg_proc` rows named `unnest` | exactly `unnest(anyarray)`, `unnest(tsvector)`, `unnest(anymultirange)`; `pronargs = 1`; none variadic |
| A1 `FROM pg_catalog.unnest(name[], "char"[]) AS t(a,b)` | `42883 function pg_catalog.unnest(name[], "char"[]) does not exist` (`ParseFuncOrColumn`) |
| A2–A8 same qualified form with `integer[]`+`text[]`; `text[]`+`text[]`; `name[]`+`name[]`; `text[]`+`name[]`; `name[]`+`boolean[]`×3; `text[]`+`boolean[]`+`text[]`+`text[]`; `name[]`+enum`[]`+`name[]`+`boolean[]` | `42883` in every case — the failure is invocation-form based, not element-type based |
| B1 `pg_catalog.unnest(name[])` (single array) | executes |
| B2 `FROM UNNEST(name[], "char"[]) AS t(a,b)` (documented, unqualified) | executes |
| B3–B4 `ROWS FROM (pg_catalog.unnest(…), …)` for each of A1–A8 | executes, expected row counts |
| C1 PL/pgSQL body with the qualified multi-array form | `CREATE FUNCTION` succeeds; first execution `42883` |
| C2 same body with the `ROWS FROM` correction | creates and executes |
| D1 (informative) unqualified `unnest(a, b)` in a select list | `42883` — the multi-array form is special only in `FROM` |
| E1 stored query trees, documented form vs `E04` form, 4 shapes | identical (4 / 4) |
| E2 functions referenced in those trees | `unnest(anyarray)` only |
| E3 `pg_get_viewdef` | identical deparse |
| E4–E5 output column types, typmods, collations | identical (0 mismatching columns) |
| E6 row counts, 8 cases × 4 shapes | identical |
| E7 row-by-row with ordinality, symmetric `EXCEPT ALL` | 0 / 0 / 0 / 0 |
| E8 emitted order without ordinality | identical, 0 mismatches in 8 cases |
| E9 NULL padding, unequal-length four-array case | identical |
| E10 `pg_typeof` / `pg_collation_for` | identical (`name`/`"C"`, `"char"`, `text`/`"C"`, enum) |
| F1 loader from accepted F12 bytes | `42883` at the first `INSERT`; no row written |
| F2–F4 loader from `E04` bytes vs documented-form reference | both return `3`; identical rows in all six tables |
| F5 corrected rows | as supplied, including `isUnique` NULL for `CONSTRAINT`/`TRIGGER` and set for `INDEX` |
| F6 second load, same manifest | `0` |
| F7 unequal-length arrays | both `23502` on `relKind`, identical |
| G1 `pg_get_keywords()` | `unnest` is not a keyword; `substring`, `coalesce` are category `C` |
| G2 Erratum 02 §5.1 step-5 method on the defective call | raw parse succeeds (false negative reproduced) |
| G3 the same call analysed as a statement | `42883` |
| H1 full F12 (accepted vs `E04`) over F02–F04, one transaction | both create all 9 functions; catalog rows identical except the loader's `prosrc` (SHA-256 `b6c783cced29129b45f94d4a4a0740320a53053e9a578f8e52f02f63fa486f28` → `42a1e819b4b683be7a98580a84067b9b766d2f08025e6f037946e83d3bbfc9c4`) |

**Scope.** All empirical checks ran on PostgreSQL 18.4 only. No PostgreSQL 15, 16 or 17 execution was performed, and none is claimed. The statements for other versions rest on the documented multi-array `UNNEST` / `ROWS FROM` semantics cited in §3 and §8.2 and on `pg_proc` having no multi-argument `unnest`; the independent auditor may re-run the checks on any version. None of these checks is a full M7 installation or an S03 execution.

---

## 10. Preservation and no semantic expansion

### 10.1 Required invariants

```
NEW TABLES                          = 0
NEW FUNCTIONS                       = 0
REMOVED FUNCTIONS                   = 0
NEW CONSTRAINTS                     = 0
NEW INDEXES                         = 0
NEW TRIGGERS                        = 0
NEW VIEWS                           = 0
NEW GRANTS                          = 0

CONTROL-PLANE SEMANTICS CHANGED     = 0
EXPECTED CATALOG CONTENT CHANGED    = 0
TRANSACTION BOUNDARIES CHANGED      = 0
LOCKING CHANGED                     = 0
ROLE SEMANTICS CHANGED              = 0
LIFECYCLE SEMANTICS CHANGED         = 0
```

Only SQL invocation/expression syntax changes, in six `FROM` items of one function.

### 10.2 Preservation matrix

| Preserved | Status |
| :-- | :-- |
| array parameters, their construction, order and values; aliases `t(a,b)` / `t(a,b,c,d)`; `SELECT` lists; `INSERT` column lists | byte-identical (§7) |
| rows written to the six §19.5 expectation tables; `v_n`; return value; already-loaded branch | unchanged (`E04-L4`, `E04-L5`) |
| RC-23 / LG-4 serialization (`FOR NO KEY UPDATE` on the manifest row), `pagamenos.m7.write_path` settings, `55000` refusal, `SECURITY DEFINER`, `SET search_path = pg_catalog, pg_temp`, `SET lock_timeout = '5s'` | unchanged — no statement outside the six `FROM` items is touched |
| tables 39, enumerated types 31, functions 110 (45 + 65), relations 43, constraints 346, explicit indexes 28, triggers 183, EXECUTE grants 36, roles 7 (V1.1 §19.14 as corrected by Erratum 03; VBA-01 `VBA-EX-2`) | unchanged — no object added, removed or renamed; function signatures unchanged |
| lock order; LG-*; LO-*; lock profiles | unchanged — no locking clause or statement added, removed or reordered |
| transaction boundaries; install-in-one-transaction rule; VBA-01 `VBA-TX-*` | unchanged |
| roles, credentials, grants, memberships | unchanged |
| the four single-array F12 calls and the F10 / F11 single-array calls | unchanged |
| Erratum 01 ER-*, MD-*, MG-*; Erratum 02 `E02-01` … `E02-09`; Erratum 03 `E03-01` … `E03-09` | unchanged and not reopened |
| VBA-01 (`VBA-PV-*`, `VBA-VB-*`, `VBA-LB`, `VBA-AX-*`, `VBA-FX-*`, `VBA-OR`, `VBA-EX-*`, `VBA-TX-*`, `VBA-SC`, `VBA-EV`); VFC-01 (`VFC-*`) | unchanged; not amended. The seven-call sequence, its argument classes and the eighteen expectation arrays are unchanged |
| CCA semantics and boundary; A1 / A2; B / C | unchanged |

**Function source digest.** The corrected bytes change the source text of exactly one function, `m7.c_load_catalog_expectations_v1`. Informative values (text between the `AS $fn$` opening delimiter and the closing `$fn$`, both exclusive — the string PostgreSQL stores as `prosrc`): accepted `sha256:b6c783cced29129b45f94d4a4a0740320a53053e9a578f8e52f02f63fa486f28` (2 597 bytes) → corrected `sha256:42a1e819b4b683be7a98580a84067b9b766d2f08025e6f037946e83d3bbfc9c4` (2 890 bytes). Any `sourceSha256` expectation derived from fragment text (for example under VBA-01 §9.3) MUST be derived from the bytes of the then-accepted effective fragments. The two `prosrc` digests above are informative evidence only. No production manifest, manifest-bound accepted `sourceSha256` expectation, `migrationSha256` authority value or machine-readable authority is authored, accepted or published by this erratum; when such values are produced under Erratum 01 MD-*/MG-*, they MUST be derived from migration bytes conforming to the corrected text. How the VBA-01 source enumeration S1 (which names V1.1, E01, E02, E03) records an accepted Erratum 04 is a matter for the root registration of this erratum; this erratum does not amend VBA-01.

---

## 11. M7-S01 consequence (not performed)

**Erratum 04 itself changes no S01 file.** Until a regeneration is separately performed, independently accepted and integrated:

```
EXISTING F12 EXTRACTION : UNCHANGED (572a9cf7182772f01b263ec367f993522c39e81e27edc74e59ea1ba65b6dd5a9)
S03                     : BLOCKED
```

After — and only after — this erratum is independently accepted, protected-integrated, registered in the root register, and synchronized from authority into implementation staging:

1. The M7-S01 extraction artifacts MUST be regenerated from **M7 V1.1 + accepted Erratum 01 + accepted Erratum 02 + accepted Erratum 03 + accepted Erratum 04**, applying `E04-01` … `E04-06` exactly as §4 item 2 defines them, so that effective F12 reflects Erratum 04. Hand-editing generated artifacts is not a conforming regeneration.
2. The regenerated extraction MUST record the accepted identity (Git blob and SHA-256) of this erratum beside the unchanged V1.1, Erratum 01, Erratum 02 and Erratum 03 identities.
3. Exactly the F12 pin changes. Informative values (derived by applying §4 item 2 to the S01 bytes of §1.3; the substitution rule, not this table, is normative, and a mismatch is an erratum defect to be reported):

   | Fragment | File | Current SHA-256 (V1.1 + E01 + E02 + E03) | Bytes | Lines | SHA-256 after `E04` | Bytes after | Lines after | `E04` occurrences |
   | :-- | :-- | :-- | --: | --: | :-- | --: | --: | :-- |
   | F12 | `sql/12_19.11.2_control-plane-registration.sql` | `572a9cf7182772f01b263ec367f993522c39e81e27edc74e59ea1ba65b6dd5a9` | 34 526 | 498 | `c154aee0e1d441d405f5a0e7c25d883aa643b40fc0458a99061d9f9145c147da` | 34 819 | 498 | `E04-01` … `E04-06` |

4. F01–F11 and F13–F26 MUST remain byte-identical, with unchanged pins (including the Erratum 03 pins F01 `f75c45ab…`, F11 `c9f5777f…`, F24 `f68eeea9…`). The fragment count (26), anchors, ordering rule, fence line spans and every fragment line count are unchanged.
5. Stale bytes MUST fail the S01 deterministic checks: any artifact containing the pre-`E04` bytes of any of the six occurrences, or missing, partially applying or misplacing a correction, or altering any of the four single-array F12 calls.
6. The mechanical inventory (V1.1 §19.14.1, as corrected by Erratum 03) counts are unchanged.
7. The regenerated artifacts require independent re-acceptance before reliance.

**This regeneration is not performed by this erratum.**

---

## 12. M7-S03 consequence

1. M7-S03 **remains blocked**. Authoring, auditing or accepting this erratum does not authorize its resumption.
2. Resumption requires at least: independent acceptance of this erratum; its protected integration; its root registration; authority → implementation-staging synchronization; regeneration of M7-S01 under §11 and independent re-acceptance and integration of that regeneration; and a subsequent, separate implementation-line authorization. These are cumulative with, and no weaker than, Erratum 03 §11, VBA-01 and VFC-01, and the prerequisites recorded in the root register.
3. The triggering S03 attempt produced no candidate commit, retained no partial installation (its installing transaction rolled back), and constitutes no implementation acceptance. Its uncommitted worktree is diagnostic evidence only and is not authority.
4. A resumed M7-S03 MUST install the corrected text, MUST NOT patch normative SQL locally, and MUST stop and report any further defect, inside or outside class `E04-MU`.

---

## 13. Lifecycle and machine-authority isolation

This erratum advances no lifecycle state. At the baseline, and unchanged by this candidate:

```
M7 GATE 1                               : AUTHORIZED (implementation work only)
M7 GATE 2                               : OPEN / NOT SATISFIED
M7-S03                                  : BLOCKED
LC-1 … LC-7                             : NOT OCCURRED
PRODUCTION MANIFEST                     : NOT AUTHORED / NOT ACTIVE
MACHINE AUTHORITY                       : NOT PUBLISHED
PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA   : NOT ASSERTED
SELECTOR                                : NOT ASSERTED / NOT ROTATED
DEPLOYMENT / WAVE 0                     : NOT AUTHORIZED
CCA IMPLEMENTATION WORK                 : AUTHORIZED
CCA IMPLEMENTATION                      : NOT ACCEPTED
B1 / B2 IMPLEMENTATION                  : NO
C1 / C2                                 : NO
P-16                                    : ACTIVE
```

This erratum creates or modifies nothing under `authority/`, does not assert or infer the value of `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA`, does not rotate it, and publishes no machine-readable authority. It satisfies no `IMP-*`, `MA-*`, §24.3 CI addition, real-PostgreSQL, real-provider or real-deployment case.

---

## 14. Acceptance criteria for the independent auditor

| # | Criterion |
| :-- | :-- |
| E04-AC-1 | the candidate commit is a normal non-merge commit changing exactly one path, this file (added); its only parent is `a384d815e3851cb733babf5f90df53cec98426fc`; the blobs of V1.1 (`06e103b0…`), Erratum 01 (`15ee2209…`), Erratum 02 (`a0e6fa67…`), Erratum 03 (`8ba87adc…`), CCA (`2f0ff3c8…`), VBA-01 (`d10d59ca…`), VFC-01 (`7613c8a6…`) and the register (`4e82d571…`) are unchanged; nothing under `authority/`, runtime, Prisma, migration, test, workflow, `scripts-trusted/` or S01 artifact paths changes |
| E04-AC-2 | the triggering defect reproduces: `FROM pg_catalog.unnest(name_array, char_array)` fails with `42883`; the `ROWS FROM` correction executes; the failure recurs for other element-type combinations |
| E04-AC-3 | §3 is correct: `pg_proc` has no multi-argument `unnest`; the documented multi-array form is the unqualified special form in `FROM`; the qualified form is resolved as an ordinary call |
| E04-AC-4 | §5 is exact: the Erratum 02 false negative is reproduced (raw parse succeeds; `unnest` is not a keyword; no resolution of the multi-array arity); only the "`unnest` with several arrays" part of the Erratum 02 §5.4 `NOT DEFECT` row is superseded, and only for the six `E04` sites; `E02-01` … `E02-09` are not reopened |
| E04-AC-5 | the census of §6 reproduces: F12 has 10 qualified `unnest` calls (4 single-array, 6 multi-array); F01 … F26 have 12 (6 single-array, 6 multi-array); no other member of `E04-MU` exists |
| E04-AC-6 | each "Before" block of §7 is byte-identical to the named V1.1 lines; each replaced substring is unique on its line and in V1.1; each "After" differs only in its `FROM` item; statement and line SHA-256 values and byte deltas reproduce; the informative F12 pin of §7.7 / §11 reproduces |
| E04-AC-7 | Lemmas `E04-L1` … `E04-L5` and Theorem `E04-T1` hold: same function, same query tree, same rows, order, NULL padding, types and collations; the corrected loader writes the same rows as the documented form |
| E04-AC-8 | §10 holds: no object, grant, lock, transaction, role, control-plane, expected-catalog or lifecycle change; only the loader's `prosrc` changes |
| E04-AC-9 | §4 is occurrence-scoped: V1.1 and Errata 01–03 remain authoritative outside the seven V1.1 lines; the Erratum 03 F12 byte-identity requirement is superseded for exactly those lines and holds elsewhere; VBA-01 and VFC-01 are unaffected |
| E04-AC-10 | §11 requires regeneration from the accepted target, changes only the F12 pin, keeps F01–F11 and F13–F26 byte-identical, and is not performed here; §12 keeps M7-S03 blocked; §13 advances no lifecycle state; the F26 byte-count observation is not an item of this erratum; this document does not self-accept |

---

## 15. Explicit status

```
PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_04 : AUTHOR CANDIDATE — NOT YET AUTHORITATIVE
INDEPENDENT ACCEPTANCE                   : NOT PERFORMED
PROTECTED INTEGRATION                    : NOT PERFORMED
ROOT AUTHORITY REGISTRATION              : NOT PERFORMED
AUTHORITY → IMPLEMENTATION STAGING SYNC  : NOT PERFORMED
M7 CONFORMANCE TARGET (UNTIL ACCEPTED)   : M7 V1.1 + ACCEPTED ERRATUM 01 + ACCEPTED ERRATUM 02 + ACCEPTED ERRATUM 03 (unchanged)

M7 SPECIFICATION (V1.1)                  : ACCEPTED — ACCEPTED BYTES NOT EDITED
M7 ERRATUM 01                            : ACCEPTED + PROTECTED-INTEGRATED — BYTES NOT EDITED, UNAFFECTED
M7 ERRATUM 02                            : ACCEPTED + PROTECTED-INTEGRATED — BYTES NOT EDITED; ONE §5.4 CLASSIFICATION
                                           NARROWLY SUPERSEDED FOR THE SIX E04 SITES ONLY (§5)
M7 ERRATUM 03                            : ACCEPTED + PROTECTED-INTEGRATED — BYTES NOT EDITED, SEMANTICS UNAFFECTED
VBA-01 / VFC-01                          : ACCEPTED + PROTECTED-INTEGRATED — BYTES NOT EDITED, UNAFFECTED
CCA                                      : BYTES NOT EDITED, UNAFFECTED
M7-S01                                   : EXISTING F12 EXTRACTION UNCHANGED — REGENERATION REQUIRED AFTER ACCEPTANCE (§11)
M7-S03                                   : BLOCKED — RESUME NOT AUTHORIZED (§12)
M7 GATE 1                                : AUTHORIZED (unchanged)
M7 GATE 2                                : OPEN / NOT SATISFIED (unchanged)
LC-1 … LC-7                              : NOT OCCURRED
PRODUCTION MANIFEST                      : NOT AUTHORED / NOT ACTIVE
MACHINE-READABLE AUTHORITY               : NOT PUBLISHED
PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA    : NOT ASSERTED
SELECTOR                                 : NOT ASSERTED / NOT ROTATED
DEPLOYMENT / WAVE 0                      : NOT AUTHORIZED
RUNTIME / SCHEMA / MIGRATIONS / TESTS / WORKFLOWS / scripts-trusted / authority / S01 ARTIFACTS : NOT MODIFIED
PAGAMENOS_SPEC_AUTHORITY.md              : NOT MODIFIED
```

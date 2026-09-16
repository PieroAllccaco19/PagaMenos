# PAGAMENOS — M7 — OUTCOME + EVIDENCE — EFFECTIVE SPECIFICATION V1.1 — ERRATUM 02 (SQL EXECUTABILITY)

```
AUTHOR CANDIDATE — NOT YET AUTHORITATIVE
NOT SELF-ACCEPTED — AWAITING INDEPENDENT AUDIT
M7-S03 REMAINS BLOCKED PENDING INDEPENDENT ACCEPTANCE, PROTECTED INTEGRATION AND ROOT AUTHORITY SYNC OF THIS ERRATUM,
AND REGENERATION AND RE-ACCEPTANCE OF THE M7-S01 EXTRACTION ARTIFACTS

ERRATUM KIND                 : SQL EXECUTABILITY ERRATUM (narrow, occurrence-scoped, invocation syntax only)
ACCEPTED SPEC BYTES EDITED   : NO
ACCEPTED ERRATUM 01 EDITED   : NO
SQL OCCURRENCES CORRECTED    : 9 (in 5 of the 26 normative §19 fragments; 21 fragments byte-unaffected)
NEW CONSENT SEMANTICS        : 0
NEW A1 / A2 SEMANTICS        : 0
NEW B / C SEMANTICS          : 0
NEW TABLES / ENUMS / FUNCTIONS / CONSTRAINTS / INDEXES / TRIGGERS / VIEWS / GRANTS : 0
FUNCTIONS RESOLVED BY THE CORRECTED EXPRESSIONS CHANGED : 0
LOCKS ADDED / REMOVED / REORDERED : 0
SELECTOR ROTATION            : NOT PERFORMED
```

**Nature.** A documentation-only erratum candidate against the independently accepted M7 Outcome/Evidence Effective Specification V1.1, read together with the accepted and protected-integrated Erratum 01. It corrects **only** the nine SQL occurrences enumerated in §6, and only their **invocation syntax**: in each, a PostgreSQL construct that exists only as SQL-special grammar was written schema-qualified, which PostgreSQL cannot parse (42601) or cannot resolve (42883). Each correction is replaced by the ordinary form that PostgreSQL's own grammar produces from the SQL-standard form, so the function (or expression node) executed, its operands, its result type, its collation and its value are unchanged (§7). This erratum changes no runtime code, Prisma schema, migration, test, workflow, `scripts-trusted/` file, `authority/` artifact, S01 extraction artifact, repository setting or external variable. It edits neither the accepted V1.1 bytes, nor the accepted Erratum 01 bytes, nor the CCA, nor the root register.

**Conventions.** MUST / MUST NOT / MAY are normative. "V1.1 §n" and "V1.1 line n" = `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1.md` at the exact accepted bytes of §1.2 (1-based line numbers, LF-separated). "Erratum 01" = `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_01.md` at the exact accepted bytes of §1.2. "Register §n" = `PAGAMENOS_SPEC_AUTHORITY.md` at the baseline of §1.1. "CCA" = `PAGAMENOS_A1_A2_M7_CONSENT_COMPATIBILITY_AMENDMENT_01.md`. "Fragment F01…F26" = the 26 normative SQL fence bodies of V1.1 §19.2–§19.13, in ascending source order, exactly as enumerated by the accepted M7-S01 extraction index (§1.3). Identifiers introduced here carry the prefix `E02-`; full-text search of the accepted V1.1, Erratum 01, CCA and register bytes returns zero matches for `E02-`.

---

## 1. Exact authority baseline

### 1.1 Protected authority tip

| Item | Value |
| :-- | :-- |
| Repository | `PieroAllccaco19/PagaMenos` |
| Protected surface | `origin/m3.5b-b-integration` |
| Baseline commit | `f1fd894b60b70e07143d474992ff8b3c5dd88fe1` (PR #21 merge, *"cca-amendment-01-implementation-authorization"*) |
| Baseline tree | `eb11ad05c813e483afc4129777afbd24c751050c` |
| Parents, in order | 1. `30034041df3280286fa9c85ac937894ef767e890` — 2. `998daa506be6fbb3095c6ee7ccff6d7803d6c818` |
| Lineage | this erratum candidate is a single commit whose only parent is the baseline commit, adding exactly one path: this file |

### 1.2 Immutable accepted artifacts — exact identities (not edited)

| Artifact | Git blob at the baseline | SHA-256 |
| :-- | :-- | :-- |
| `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1.md` (10 626 lines, 1 143 725 bytes) | `06e103b0d5e8cfcbb96ab21134d5605b0aae9b26` | `457f51778fb5d5890b3e3478376e413072f15aef7da88125b5e78963f49394bd` |
| `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_01.md` (604 lines, 82 027 bytes) | `15ee22090d3e37b6a63dd25914f8abb0f4fa9d4b` | `f381cb015adadc7a22463060da7ff55e8711b8ab13879c60f93cabf53eb863e8` |
| `PAGAMENOS_A1_A2_M7_CONSENT_COMPATIBILITY_AMENDMENT_01.md` | `2f0ff3c886c5ac9b1cbba797404e9024c0b83732` | `3a6003494f4817907401a9afda5b9d9a1647ade5ff9196f2aee2ba3b1b2ca1ad` |
| `PAGAMENOS_SPEC_AUTHORITY.md` | `6e3cb3865614241ce2ccfe6b0ba520b3f689bd4c` | `90fc2bdbeafc085296ed74e3fbecbe3355ad0dd14656fb47bc4bc7713948410d` |

### 1.3 Implementation-line artifacts consulted (not authority; not edited)

| Item | Value |
| :-- | :-- |
| Implementation line | `origin/m7-v1.1-implementation`, tip `14d846abb749c4bb27a9868eb0913acd343cb64e` (PR #23, M7-S02 harness) |
| M7-S01 extraction merge | `742bfffa0aaee4e92743ca5d9d6432affbe22e62` (PR #22) |
| M7-S01 conformance target | `M7 V1.1 + accepted Erratum 01` (recorded in `prisma/m7/normative/EXTRACTION_INDEX.json`) |
| `EXTRACTION_INDEX.json` SHA-256 | `79913966699861771d1f193fe504283d547e9c7a6567ae9b391618cd2c2820e0` |
| Fragment fidelity | for all 26 fragments, the SHA-256 of V1.1 lines `bodyFirstLine…bodyLastLine` joined by LF with a final LF equals both the pinned index value and the SHA-256 of the extracted file (re-verified by this author) |

These artifacts are cited only to locate the fragments and to name the regeneration consequence (§9). This erratum asserts no register status for M7-S01 or M7-S02 and does not accept, reject or modify them.

### 1.4 Provenance of the triggering defect

An M7-S03 execution against PostgreSQL 18.4 stopped with `SQLSTATE 42601 — syntax error at or near "FROM"` while creating `m7.t_upload_intent_coherence()` from fragment F09 (`prisma/m7/normative/sql/09_19.10_trigger-functions.sql`), expression `pg_catalog.substring(NEW."stagingObjectKey" FROM '[0-9a-f]{32}$')`, identical to V1.1 line 4494. S03 stopped instead of editing accepted normative SQL. **That execution report is not authority and is not incorporated.** The defect was re-derived by this author against a scratch PostgreSQL 18.4 cluster (`PostgreSQL 18.4 on x86_64-windows, compiled by msvc-19.44.35227, 64-bit`), and the whole defect class was then scanned exhaustively (§5).

---

## 2. Scope

### 2.1 In scope — defect class `E02-SX`

An occurrence belongs to class **`E02-SX`** if and only if all of the following hold:

1. it is inside one of the 26 normative fragments F01…F26;
2. it writes, **schema-qualified**, the name of a PostgreSQL construct whose SQL-standard form is **special grammar** — a keyword of category `C` (*"unreserved (cannot be function or type name)"*) or `R` in `pg_get_keywords()` — so the qualified spelling is parsed as an ordinary function call; and
3. as a consequence it is not executable on the V1.1 target (V1.1 §19.1: PostgreSQL ≥ 15), either because
   - **`E02-SX-P` (parser)** — the argument list uses keyword infix syntax (`FROM`, `FOR`, `IN`, `PLACING`, `BOTH`, …) that is legal only in the special grammar rule, so the statement fails raw parsing with `42601`; or
   - **`E02-SX-R` (resolution)** — the construct is grammar-only with **no** `pg_proc` entry (e.g. `COALESCE`, which the parser turns into a `CoalesceExpr` node), so the qualified call parses but fails name resolution with `42883` when the statement is analysed.

A correction is in scope only if it changes invocation syntax alone and is proven to yield the identical function or expression node (§7).

### 2.2 Explicitly out of scope

- any change of regex, operand, literal, concatenation, comparison, control flow, exception, SQLSTATE, message text, lock, transaction boundary, grant, role, identity, digest input, retention, lifecycle or Gate-2 requirement;
- any SQL outside the nine occurrences of §6, including unqualified special-grammar forms (they are correct; §5.4);
- any other defect class, even if one exists; a defect outside `E02-SX` requires its own erratum;
- the S01 regeneration itself and any S03 work (§9, §10);
- CCA text, CCA implementation, `authority/`, the selector, the manifest and the root register.

---

## 3. The parser distinction

PostgreSQL implements a set of SQL-standard constructs as **dedicated grammar productions**, not as ordinary function-call syntax. In `gram.y` (`func_expr_common_subexpr`):

| SQL-standard form | Grammar result |
| :-- | :-- |
| `SUBSTRING(a FROM b)` / `SUBSTRING(a FROM b FOR c)` | `makeFuncCall(SystemFuncName("substring"), (a, b) / (a, b, c), COERCE_SQL_SYNTAX)` |
| `EXTRACT(field FROM a)` | `makeFuncCall(SystemFuncName("extract"), ('field', a), COERCE_SQL_SYNTAX)` — the field identifier becomes a lower-case string constant |
| `COALESCE(a, b, …)` | a `CoalesceExpr` node; **no function** is looked up |

`SystemFuncName` already names `pg_catalog`, so the special form is immune to `search_path`. But the keyword infix syntax (`FROM`, `FOR`) is accepted **only** after the bare keyword `SUBSTRING` / `EXTRACT`. Once the name is written `pg_catalog.substring`, the parser takes the generic `func_name '(' func_arg_list ')'` production, where `FROM` is not a valid token: **42601**. Once `COALESCE` is written `pg_catalog.coalesce`, the generic production parses it, but `pg_catalog` contains no function named `coalesce`: **42883**.

The ordinary, executable spelling of each qualified call is therefore the generic call with the argument list the grammar itself would have produced. Reproduction on PostgreSQL 18.4:

```text
PERFORM pg_catalog.substring(NEW."stagingObjectKey" FROM '[0-9a-f]{32}$')   -> 42601 syntax error at or near "FROM"
PERFORM pg_catalog.substring(NEW."stagingObjectKey", '[0-9a-f]{32}$')       -> parses
SELECT pg_catalog.coalesce(NULL::int, 0)                                   -> 42883 function pg_catalog.coalesce(integer, integer) does not exist
pg_get_keywords(): substring, extract, coalesce -> catcode C "unreserved (cannot be function or type name)"
```

`E02-SX-P` defects are detected when the enclosing object is created (PL/pgSQL's validator raw-parses every embedded statement when `check_function_bodies` is on; a `DO` block is parsed on execution). `E02-SX-R` defects in PL/pgSQL bodies are **not** detected at `CREATE FUNCTION`; they fail at the first execution of the statement — which is why the S03 install surfaced only the first `E02-SX-P` occurrence.

V1.1 itself already records `COALESCE` as *"syntax, not `pg_catalog.coalesce`"* among its fixed impossible-DDL defects (V1.1 §A.3 check 5); the two `E02-SX-R` occurrences are residual instances of exactly that accepted intent.

---

## 4. Reading rule and clause-scoped precedence

1. **The accepted V1.1 bytes are never edited.** V1.1 remains authoritative for every clause and every byte except the nine occurrences enumerated in §6.
2. **Erratum 01 remains authoritative and unaffected.** No occurrence of §6 lies in, or is cited by, a clause Erratum 01 amends (ER-01…ER-05); in particular ER-01's derivation over V1.1 §19.13.4 concerns the install-sequence comment, not the `DO $grants$` block of `E02-09`. The MD-*/MG-* rules of Erratum 01 apply unchanged to migration bytes that contain the corrected occurrences.
3. **Where this erratum supersedes an occurrence, it wins for that occurrence only.** The "After" text of an `E02-nn` row replaces exactly the "Before" substring on exactly the named V1.1 line. Every other byte of that line — leading whitespace, alignment, operators, `THEN`, `;`, casts — is unchanged, and no line is added, removed or reordered.
4. **No other §19 SQL is changed.** No neighbouring statement, function, trigger, identifier, count, proof, invariant, lock profile or test is re-opened.
5. **Uniqueness.** Each "Before" substring occurs exactly once on its named line and exactly once in the accepted V1.1 bytes (verified; §6), so the replacement is unambiguous.
6. **Conflict.** If this erratum and the accepted bytes appear to conflict outside the enumerated occurrences, the accepted bytes (read with Erratum 01) control, and the conflict is an erratum defect to be reported, not resolved by interpretation.
7. **Effective reading after acceptance.** Once this erratum is independently accepted, protected-integrated and synchronized into the root register, the M7 conformance target becomes **M7 V1.1 + accepted Erratum 01 + accepted Erratum 02**. Until then it remains **M7 V1.1 + accepted Erratum 01**, and this candidate controls nothing.

---

## 5. Exhaustive defect-class scan

### 5.1 Method

Input: the 26 fragments F01…F26 (6 275 LF-terminated lines), each first re-verified byte-identical to V1.1 (§1.3).

1. **Lexical masking.** Each fragment was scanned with `--` comments and single-quoted string literals masked (offsets preserved), so matches inside comments or strings are excluded; dollar-quoted bodies are scanned.
2. **Token census.** Every `pg_catalog` token was enumerated and classified as a call (`pg_catalog.<name>(`), a relation reference, or other.
3. **Keyword census.** Every schema-qualified call `<schema>.<name>(` in any schema was matched against `pg_get_keywords()` on PostgreSQL 18.4; every name of category other than `U` was retained as a candidate.
4. **Infix-keyword check.** For every `pg_catalog` call site the balanced argument list was extracted and checked for top-level `FROM`, `FOR`, `IN`, `PLACING`, `BOTH`, `LEADING`, `TRAILING`, `SIMILAR`, `ESCAPE`.
5. **Parser check.** Every one of the 340 `pg_catalog` call sites was submitted verbatim, in its own transaction that was rolled back, as `CREATE FUNCTION pg_temp.chk() RETURNS void LANGUAGE plpgsql AS $chk$ BEGIN PERFORM <call>; END $chk$` with `check_function_bodies = on` (raw parse of the expression without name resolution).
6. **Resolution check.** Every category-`C`/`R` qualified name found was checked for a `pg_proc` entry, and resolved on PostgreSQL 18.4.
7. **Unqualified special forms.** `COALESCE`, `GREATEST`, `LEAST`, `NULLIF`, `SUBSTRING`, `TRIM`, `POSITION`, `OVERLAY`, `EXTRACT`, `NORMALIZE`, `CAST`, `TREAT` not preceded by `.` were counted.

### 5.2 Census results

| Measure | Result |
| :-- | :-- |
| Fragments scanned | **26 / 26** |
| `pg_catalog` tokens | 389 = 340 function-call sites + 49 catalog-relation references (`pg_catalog.pg_class`, `pg_proc`, `pg_roles`, …) + 0 other (no qualified type, no `OPERATOR(pg_catalog.…)`) |
| Distinct `pg_catalog` functions called | 31 |
| Qualified calls whose name is a keyword of category `C` or `R` (any schema) | **9**: `pg_catalog.substring` × 6, `pg_catalog.extract` × 1, `pg_catalog.coalesce` × 2 |
| Qualified calls with a top-level infix keyword | 7 (the six `substring` and the one `extract`) |
| Parser check (340 sites) | 332 parse; **8 fail with 42601**: the 7 infix sites, plus one `pg_catalog.jsonb_build_array(…)` site whose failure is solely the nested `pg_catalog.extract(epoch FROM …)` (it parses once that nested call is corrected — not a separate defect) |
| Resolution check | `pg_proc` has no `coalesce`; `pg_catalog.coalesce(…)` → **42883**. `substring` and `extract` exist as ordinary `pg_catalog` functions |
| Qualified `trim` / `btrim`-with-`FROM`, `position`, `overlay`, `normalize`, `treat`, `cast`, `greatest`, `least`, `nullif`, `xml*`, `json_*` special forms | **0** |
| Unqualified special forms | `COALESCE` × 27, `GREATEST` × 17, `LEAST` × 10; all others 0 |

The 31 distinct `pg_catalog` functions called are: `acldefault`, `aclexplode`, `array_agg`, `array_to_string`, `cardinality`, `clock_timestamp`, `coalesce`, `convert_to`, `count`, `current_setting`, `encode`, `extract`, `format`, `gen_random_uuid`, `has_function_privilege`, `jsonb_build_array`, `length`, `make_interval`, `max`, `num_nonnulls`, `octet_length`, `power`, `quote_literal`, `replace`, `set_config`, `sha256`, `starts_with`, `string_agg`, `substring`, `to_char`, `unnest`.

### 5.3 Defect inventory — classified `DEFECT`

Spec line = V1.1 line; fragment line = line within the S01 fragment file (V1.1 line − `bodyFirstLine` + 1).

| ID | Fragment / clause | Spec line (frag. line) | Enclosing object | Expression (verbatim) | Sub-class | PostgreSQL 18.4 result | Ordinary-form equivalent |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| `E02-01` | F09 / §19.10 | 4494 (580) | `m7.t_upload_intent_coherence()` | `pg_catalog.substring(NEW."stagingObjectKey" FROM '[0-9a-f]{32}$')` | SX-P | 42601 at `FROM` (at `CREATE FUNCTION`) | `pg_catalog.substring(NEW."stagingObjectKey", '[0-9a-f]{32}$')` → `substring(text,text)` |
| `E02-02` | F09 / §19.10 | 4545 (631) | `m7.t_generation_coherence()` | `pg_catalog.substring(NEW."canonicalObjectKey" FROM '[0-9a-f]{32}$')` | SX-P | 42601 at `FROM` | `pg_catalog.substring(NEW."canonicalObjectKey", '[0-9a-f]{32}$')` → `substring(text,text)` |
| `E02-03` | F09 / §19.10 | 4853 (939) | `m7.t_capability_mint_coherence()` | `pg_catalog.coalesce(v_prev, 0)` | SX-R | parses; 42883 on first execution | `COALESCE(v_prev, 0)` → `CoalesceExpr` |
| `E02-04` | F11 / §19.11.1 | 5442 (231) | `m7.i_backend_digest(…)` | `pg_catalog.extract(epoch FROM p_write_completion_window)` | SX-P | 42601 at `FROM` | `pg_catalog.extract('epoch', p_write_completion_window)` → `extract(text,interval)` |
| `E02-05` | F17 / §19.11.7 | 6912 (73) | `m7.x_mint_generation_capability_v1(…)` | `pg_catalog.coalesce(pg_catalog.max(mm."mintSeq"), 0)` | SX-R | parses; 42883 on first execution | `COALESCE(pg_catalog.max(mm."mintSeq"), 0)` → `CoalesceExpr` |
| `E02-06` | F23 / §19.12.6 | 8219 (53) | `m7.w_classify_object_key_v1(…)` | `pg_catalog.substring(p_object_key FROM '/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/[0-9a-f]{32}$')` | SX-P | 42601 at `FROM` | same pattern, `, ` for ` FROM ` → `substring(text,text)` |
| `E02-07` | F23 / §19.12.6 | 8221 (55) | `m7.w_classify_object_key_v1(…)` | `pg_catalog.substring(p_object_key FROM '/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/g[0-9]+/[0-9a-f]{32}$')` | SX-P | 42601 at `FROM` | same pattern, `, ` for ` FROM ` → `substring(text,text)` |
| `E02-08` | F23 / §19.12.6 | 8222 (56) | `m7.w_classify_object_key_v1(…)` | `pg_catalog.substring(p_object_key FROM '/g([0-9]+)/[0-9a-f]{32}$')` | SX-P | 42601 at `FROM` | same pattern, `, ` for ` FROM ` → `substring(text,text)` |
| `E02-09` | F26 / §19.13.4 | 8826 (9) | `DO $grants$` block | `pg_catalog.substring(p.proname FROM 1 FOR 2)` | SX-P | 42601 at `FROM` (at `DO` execution) | `pg_catalog.substring(p.proname, 1, 2)` → `substring(text,integer,integer)` over `text(name)` |

(`E02-05`'s enclosing function is `m7.x_mint_generation_capability_v1(p_manifest_sha256 text, p_generation_grant_id uuid)`.)

### 5.4 Candidates classified `NOT DEFECT`

| Candidate | Count | Classification | Reason |
| :-- | :-- | :-- | :-- |
| `pg_catalog.jsonb_build_array(…)` in `m7.i_backend_digest` (V1.1 lines 5439–5442) | 1 | **NOT DEFECT** | its 42601 is inherited entirely from the nested `E02-04` call; with `E02-04` applied it parses. Not itself changed |
| the remaining 330 `pg_catalog` call sites (28 ordinary functions, incl. the other 6 `jsonb_build_array` sites, `count(*)`, `array_agg`, `string_agg(… ORDER BY … COLLATE "C")`, `unnest` with several arrays, `make_interval(secs => …)`) | 330 | **NOT DEFECT** | every one parses (§5.1 step 5); none names a category-`C`/`R` keyword; aggregate `ORDER BY`, `*`, named arguments and `COLLATE` are generic function-call grammar, legal after a qualified name; each name has a `pg_proc` entry |
| `pg_catalog.pg_*` catalog-relation references | 49 | **NOT DEFECT** | relation names, not special grammar |
| unqualified `COALESCE` | 27 | **NOT DEFECT** | the SQL-special form itself, correctly unqualified; not name-resolved, so not `search_path`-sensitive |
| unqualified `GREATEST` / `LEAST` | 17 / 10 | **NOT DEFECT** | same (`MinMaxExpr` grammar nodes) |
| qualified or unqualified `trim(… FROM …)`, `position(… IN …)`, `overlay(… PLACING … FROM …)`, `substring(… FOR …)` other than `E02-09`, `extract(… FROM …)` other than `E02-04`, `normalize`, `treat`, `cast`, `nullif`, `xml*`, `json_*` special forms | 0 | **NOT DEFECT** (absent) | no occurrence in any fragment |
| any schema-qualified call in a schema other than `pg_catalog` naming a category-`C`/`R` keyword (e.g. an `m7.` function) | 0 | **NOT DEFECT** (absent) | none exists |

**Scan conclusion.** Class `E02-SX` has exactly nine members in the 26 fragments — seven `E02-SX-P` and two `E02-SX-R` — located in fragments F09, F11, F17, F23 and F26. Fragments F01–F08, F10, F12–F16, F18–F22, F24 and F25 contain no member.

---

## 6. Normative corrections `E02-01` … `E02-09`

Each row supersedes one occurrence (§4). "Before" and "After" are quoted as complete V1.1 lines, byte-exact, between the fence lines (leading spaces significant). Only the substring named in §5.3 differs. Line SHA-256 values are over the line bytes without the terminating LF; they are given to make each substitution mechanically checkable.

### 6.1 `E02-01` — V1.1 line 4494, §19.10, `m7.t_upload_intent_coherence()` (the triggering occurrence)

Before:

```text
            || pg_catalog.substring(NEW."stagingObjectKey" FROM '[0-9a-f]{32}$') THEN
```

After:

```text
            || pg_catalog.substring(NEW."stagingObjectKey", '[0-9a-f]{32}$') THEN
```

Line SHA-256: before `e1037f04f0244089e6e78559fca34303a859bf0209b0ac11980a98b5f0515761` → after `b038e2cc511201b23c490c45d897ec881338a3525530ec7c495c8eca4cfbc07d` (−4 bytes).

### 6.2 `E02-02` — V1.1 line 4545, §19.10, `m7.t_generation_coherence()`

Before:

```text
            || NEW."leaseEpoch"::text || '/' || pg_catalog.substring(NEW."canonicalObjectKey" FROM '[0-9a-f]{32}$') THEN
```

After:

```text
            || NEW."leaseEpoch"::text || '/' || pg_catalog.substring(NEW."canonicalObjectKey", '[0-9a-f]{32}$') THEN
```

Line SHA-256: before `6666a59d9ed70c1c797c44840ef4f792057802b252070a9952165e184ca49b7f` → after `0189b1d52ce080b577981eea5282a448f541e314fb2a6a40e7ccafe1efdd45d6` (−4 bytes).

### 6.3 `E02-03` — V1.1 line 4853, §19.10, `m7.t_capability_mint_coherence()`

Before:

```text
       OR NEW."mintSeq" IS DISTINCT FROM pg_catalog.coalesce(v_prev, 0) + 1
```

After:

```text
       OR NEW."mintSeq" IS DISTINCT FROM COALESCE(v_prev, 0) + 1
```

Line SHA-256: before `798f622595ef184c28cb6053856e7cc0281db22a141378b111707bd4dcd8cb2d` → after `e164c507edd7c9549ca548e787b3373330f1a88ed5449f4a59a79f7d15e65597` (−11 bytes).

### 6.4 `E02-04` — V1.1 line 5442, §19.11.1, `m7.i_backend_digest(…)`

Before:

```text
        pg_catalog.extract(epoch FROM p_write_completion_window)::text));
```

After:

```text
        pg_catalog.extract('epoch', p_write_completion_window)::text));
```

Line SHA-256: before `dd796632286e7ed28fa9921c2ba1b7dfe3124c60ac0369db943e1856ca98844d` → after `1d833fd9b839119219fa4f370d5f2524cfc31d349f31d98576956a484db7e559` (−2 bytes).

### 6.5 `E02-05` — V1.1 line 6912, §19.11.7, `m7.x_mint_generation_capability_v1(…)`

Before:

```text
    SELECT pg_catalog.coalesce(pg_catalog.max(mm."mintSeq"), 0) + 1 INTO v_seq
```

After:

```text
    SELECT COALESCE(pg_catalog.max(mm."mintSeq"), 0) + 1 INTO v_seq
```

Line SHA-256: before `fcd0e533ee4834f8b6e330b21ef5165231b20e942afdd27830a368451cfb3b66` → after `8322b14049da0e6a0d1d51f9a5cdcaf55d3a8c45b8aafba463b58e525bd6f0e2` (−11 bytes).

### 6.6 `E02-06` — V1.1 line 8219, §19.12.6, `m7.w_classify_object_key_v1(…)`

Before:

```text
        v_id_text := pg_catalog.substring(p_object_key FROM '/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/[0-9a-f]{32}$');
```

After:

```text
        v_id_text := pg_catalog.substring(p_object_key, '/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/[0-9a-f]{32}$');
```

Line SHA-256: before `2437f739f6b6bb38a09b33f0da436ba320be651e2a4d49cdb5f13f40ef427a05` → after `0b5ba36209e53495aaf43d537a4485b892762428a851635c959de9a854fa838f` (−4 bytes).

### 6.7 `E02-07` — V1.1 line 8221, §19.12.6, `m7.w_classify_object_key_v1(…)`

Before:

```text
        v_id_text    := pg_catalog.substring(p_object_key FROM '/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/g[0-9]+/[0-9a-f]{32}$');
```

After:

```text
        v_id_text    := pg_catalog.substring(p_object_key, '/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/g[0-9]+/[0-9a-f]{32}$');
```

Line SHA-256: before `672f7cc4b986c74123542d048e0059831fc9289cae9f69bf054cfa0a8be2b8f6` → after `4a7361ed06a1e48634fb3f525da295cfa1756285d19eb03aca852237718a8309` (−4 bytes). The alignment spaces before `:=` are unchanged.

### 6.8 `E02-08` — V1.1 line 8222, §19.12.6, `m7.w_classify_object_key_v1(…)`

Before:

```text
        v_epoch_text := pg_catalog.substring(p_object_key FROM '/g([0-9]+)/[0-9a-f]{32}$');
```

After:

```text
        v_epoch_text := pg_catalog.substring(p_object_key, '/g([0-9]+)/[0-9a-f]{32}$');
```

Line SHA-256: before `ffc93115a621fa3cd697ce5ed07b585dd6c42b58679d364e1c9252b2c3b78275` → after `4d02a69ae295f224ae94fb640891af3f1325b9583b2951e0f0f69bf91e4d0cb9` (−4 bytes).

### 6.9 `E02-09` — V1.1 line 8826, §19.13.4, `DO $grants$`

Before:

```text
               CASE pg_catalog.substring(p.proname FROM 1 FOR 2)
```

After:

```text
               CASE pg_catalog.substring(p.proname, 1, 2)
```

Line SHA-256: before `ad96b7bfcf53565b15f6cc30c95a0042a1311cf023579f3a7a248432b8c9f48f` → after `de7f3f4cff35d294aa30467d47b13f19472505264456d9eaececf7253b9e4ac2` (−7 bytes).

### 6.10 Verification of the substitutions

For every row: the "Before" substring occurs exactly once on the named line and exactly once in the accepted V1.1 bytes; the corrected expression parses under the check of §5.1 step 5 (all nine: `parses`); the line byte delta equals `len(After substring) − len(Before substring)`; the line count of every fragment is unchanged.

---

## 7. Proof of semantic equivalence

### 7.1 Lemma `E02-L1` — `SUBSTRING(a FROM p)` ≡ `pg_catalog.substring(a, p)` (`E02-01`, `02`, `06`, `07`, `08`)

*Grammar.* `SUBSTRING '(' substr_list ')'` with `substr_list: a_expr FROM a_expr` yields `makeFuncCall(SystemFuncName("substring"), list_make2(a, p), COERCE_SQL_SYNTAX)` — the generic call `pg_catalog.substring(a, p)` with a display-only format flag. Both spellings therefore undergo the same function resolution over the same argument list: with a `text` subject and an `unknown`-typed string literal pattern, the unique match is `pg_catalog.substring(text, text)` (internal `textregexsubstr`), POSIX regular-expression extraction returning the substring matching the pattern, or the portion matching the first parenthesized subexpression when the pattern has one, or `NULL` on no match.

*Evidence (PostgreSQL 18.4).* Views built over a table `t(s text, n name, i interval, v int)` with the SQL-standard forms and with the corrected forms store, in `pg_rewrite.ev_action`, identical `funcid` sequences — `substring(text,text)`, `substring(text,text)`, `substring(text,integer,integer)`, `text(name)`, `extract(text,interval)` — and identical result column types and collations (`text`/default, `text`/default, `text`/`C`, `numeric`/-, `integer`/-). The only difference is `funcformat` (3 = `COERCE_SQL_SYNTAX` vs 0 = `COERCE_EXPLICIT_CALL`), which affects deparsing only. Over sample rows including a matching canonical key, a non-matching key, `NULL`s and an upper-case-hex non-match, all columns of both views are pairwise `IS NOT DISTINCT FROM` (4 rows, all equal).

*Operands.* Subject expressions (`NEW."stagingObjectKey"`, `NEW."canonicalObjectKey"`, `p_object_key`) and every regex literal are byte-identical before and after (§6). Hence value, type, `NULL` behaviour and capture-group semantics are identical, and so are the enclosing concatenations, `<>` comparisons, `IF … THEN RAISE … USING ERRCODE = '23000'` branches (`E02-01`, `E02-02`), and the `v_id_text` / `v_epoch_text` assignments and the `IS NOT NULL` gate that follows them (`E02-06`…`E02-08`).

### 7.2 Lemma `E02-L2` — `SUBSTRING(n FROM 1 FOR 2)` ≡ `pg_catalog.substring(n, 1, 2)` (`E02-09`)

*Grammar.* `substr_list: a_expr FROM a_expr FOR a_expr` yields `list_make3(a, b, c)` under `SystemFuncName("substring")`. With `p.proname` of type `name` and integer literals, both spellings resolve to `pg_catalog.substring(text, integer, integer)` over the implicit cast `text(name)` — the same `funcid`s in the same order (§7.1 evidence), result `text` collation `C` in both. The `CASE … WHEN 'p_' … WHEN 'x_' …` mapping, the `WHERE p.proname ~ '^[psrwax]_'` filter and every grant decision are therefore unchanged.

### 7.3 Lemma `E02-L3` — `EXTRACT(epoch FROM w)` ≡ `pg_catalog.extract('epoch', w)` (`E02-04`)

*Grammar.* Since PostgreSQL 14, `EXTRACT '(' extract_list ')'` with `extract_list: extract_arg FROM a_expr` yields `makeFuncCall(SystemFuncName("extract"), list_make2(makeStringConst(field), a), COERCE_SQL_SYNTAX)`, with the identifier `epoch` down-cased to the string `'epoch'`. The corrected form passes the same string literal and the same operand. With `p_write_completion_window interval`, both resolve to `pg_catalog.extract(text, interval)`, returning `numeric` (§7.1 evidence: identical `funcid`, type `numeric`; values `5400.500000`, `-172799.999997`, `2592000.000000`, `NULL` identical, including their `::text` renderings). V1.1 §19.1 targets PostgreSQL ≥ 15, so the SQL-standard form already denoted this function on every supported version.

*Digest preservation.* `m7.i_backend_digest` feeds `…::text` of this value into `pg_catalog.jsonb_build_array(…)` and `m7.i_request_hash(…)`. Same function, same operand ⇒ same `numeric` ⇒ same text ⇒ byte-identical JSON array ⇒ identical `backendSha256` for every input. XF-10 (the write-completion window is a digest identity component) and the V1.1 §A.3 check 5a reasoning (the function is IMMUTABLE — `provolatile = i` for `extract(text,interval)` on PostgreSQL 18.4 — and the digest uses the numeric seconds) hold unchanged, because the function is the same `pg_proc` entry.

### 7.4 Lemma `E02-L4` — `pg_catalog.coalesce(x, 0)` → `COALESCE(x, 0)` (`E02-03`, `E02-05`)

*Intent.* V1.1 §A.3 check 5 states that `COALESCE` is syntax, not `pg_catalog.coalesce`; V1.1 uses unqualified `COALESCE` at 27 other sites in the fragments, including the analogous `SELECT COALESCE(pg_catalog.max(…), 0) + 1 INTO …` sequence computations of §19.10, §19.11.2, §19.11.4 and §19.12.4. The qualified spelling has no `pg_proc` referent (§5.2), so under the accepted bytes the statement can never evaluate; the only executable reading consistent with the accepted intent is the SQL `COALESCE` expression.

*Semantics.* `COALESCE(x, 0)` returns `x` if non-`NULL`, else `0`, with the common type of `integer` operands (`v_prev integer`; `pg_catalog.max("mintSeq")` of the `integer` sequence column). Therefore `NEW."mintSeq" IS DISTINCT FROM COALESCE(v_prev, 0) + 1` and `SELECT COALESCE(pg_catalog.max(mm."mintSeq"), 0) + 1 INTO v_seq` compute exactly the "next mint sequence" the surrounding accepted text and comments describe (XF-15; `mintSeq` is `INTEGER NOT NULL`, V1.1 line 3275). No lock (the `SELECT` has no locking clause), read set or error path changes.

*Hardening.* `COALESCE` is a grammar node, never name-resolved, so it cannot be shadowed through `search_path`; the functions keep `SET search_path = pg_catalog, pg_temp` unchanged. V1.1 §A.3 check 7 (full qualification of resolvable names) is unaffected: every resolvable name in the corrected lines (`substring`, `extract`, `max`) remains `pg_catalog`-qualified.

### 7.5 Theorem `E02-T1` — no semantic redesign

For every occurrence `E02-01`…`E02-09`, the corrected expression denotes the same function (or expression node), over byte-identical operands and literals, with the same result type, collation, volatility and `NULL` behaviour as the SQL-standard form the accepted text denotes (Lemmas `E02-L1`…`E02-L4`). Every other byte of the 26 fragments is unchanged (§4). Hence every accepted business, transaction, security, identity, role, locking, retention, digest, CCA-boundary, lifecycle and Gate-2 property of V1.1 read with Erratum 01 holds of the corrected text exactly as it was specified; the only observable difference is that the enclosing objects can now be created (`E02-SX-P`) and executed (`E02-SX-R`). ∎

### 7.6 Scope of the empirical evidence

All empirical checks ran on PostgreSQL 18.4 only. Equivalence on PostgreSQL 15–17 rests on the grammar productions cited in §7.1–§7.3, which have had this form since PostgreSQL 14; the independent auditor may re-run the checks on any supported version. The parser check of §5.1 step 5 establishes the class-membership of every `pg_catalog` call site; it is not, and is not claimed to be, a full parse or installation of the 26 fragments, which remains M7-S03 work.

---

## 8. Preservation matrix

| Preserved | Status |
| :-- | :-- |
| regexes, subject operands, literals, concatenations, comparisons | byte-identical (§6) |
| trigger logic, `RAISE` texts, SQLSTATEs (`23000`, `M7007`, `M7012`, `M7013`, …) | unchanged |
| staging-key and canonical-key semantics; `w_classify_object_key_v1` classification | unchanged (`E02-L1`) |
| `backendSha256` / `i_backend_digest` output; XF-10 | unchanged (`E02-L3`) |
| mint sequence; XF-15; XF-17; T-169; sealed signer edge | unchanged (`E02-L4`) |
| capability-derived EXECUTE grants; RS-8; IA-14 | unchanged (`E02-L2`) |
| tables 39, enumerated types 31, functions 110 (45 + 65), constraints/indexes/triggers/views, custom SQLSTATEs M7001…M7014 (V1.1 §19.14.1) | unchanged — no object added, removed or renamed |
| lock order; LG-1…LG-10; LO-*; lock profiles; LG-THEOREM; T-181 source-level lock sequences | unchanged — no locking clause, liveness call, `INSERT`/`UPDATE`/`DELETE` added, removed or reordered |
| transaction boundaries; install-in-one-transaction rule (V1.1 §19.1) | unchanged |
| roles, credentials, `search_path`, `SECURITY DEFINER` / `INVOKER` settings, `proconfig` | unchanged |
| retention, deletion, outbox, reconciliation semantics | unchanged |
| invariants M7-I01…M7-I129; T-IDs (209); IMP-01…IMP-22; MA-1…MA-18; residuals M7-R-01…M7-R-17 | unchanged; none satisfied by this erratum |
| Erratum 01 ER-01…ER-05, MD-1…MD-7, MG-1…MG-6, BC-1…BC-6, LC-1…LC-7, D-13, D-06 | unchanged |
| CCA semantics and boundary; A1 / A2; B / C; S-2 | unchanged |

**`prosrc` and future digests.** The corrected bytes change the source text of the five enclosing objects. No manifest, `prosrc` digest or `migrationSha256` has been authored, accepted or published (Register §13.13); when they are produced under Erratum 01 MD-*/MG-*, they MUST be derived from migration bytes conforming to the corrected text. No function body acquires a manifest-digest literal (Erratum 01 MG-3 (d) continues to hold).

---

## 9. M7-S01 regeneration consequence

After — and only after — this erratum is independently accepted, protected-integrated and synchronized into the root register:

1. **Regeneration.** The M7-S01 normative extraction artifacts MUST be regenerated from the then-accepted conformance target **M7 V1.1 + accepted Erratum 01 + accepted Erratum 02**, with the nine substitutions of §6 applied at exactly the named occurrences. Hand-editing the generated artifacts is not a conforming regeneration.
2. **Source identities.** The regenerated extraction MUST record the accepted identity (Git blob and SHA-256) of this erratum beside the unchanged V1.1 and Erratum 01 identities.
3. **Affected pins.** The pinned per-fragment SHA-256 values of exactly the fragments whose bytes change MUST be updated. Current pinned values and the values that result from applying §6 to them are (informative; derived by applying the substitution rule of §4 item 3 to the accepted bytes — the substitution rule, not this table, is normative; a mismatch is to be reported as an erratum defect):

   | Fragment | File | Pinned SHA-256 (V1.1 + Erratum 01) | Bytes | SHA-256 after §6 | Bytes after | Lines |
   | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
   | F09 | `sql/09_19.10_trigger-functions.sql` | `fa1c25f12a203ef616384141d8c5f9d29a7f704776bfb8ca43730f676a507f86` | 64 852 | `c2bb8b38feaf6cbb1559ae0c1396d34344094008a75e81f7406f9a239225c75c` | 64 833 | 1 124 |
   | F11 | `sql/11_19.11.1_internal-helpers.sql` | `76bdc866222b501df746f27d5e6d4ed6301c338f105b0822514ecda0cdc2e352` | 31 346 | `4803e194d62b3b3926e3b98a84d00ede902a485e04aed5de73533207f950be0a` | 31 344 | 604 |
   | F17 | `sql/17_19.11.7_capability-signer.sql` | `eacf99ec3e728cd32881bd339478777935a57c6ad3385373f9a0692b490ece95` | 5 890 | `ca844588d08e5eb3e40d82676daf4dbf767539d576902372738b9f15b715175c` | 5 879 | 92 |
   | F23 | `sql/23_19.12.6_reconciliation.sql` | `020a61c24cca1430c21153bb62acca962ae97a2598afb658da1cea00caf7c162` | 12 897 | `1e0891b67d2aff6deea2db244a464b0de4dd1e0da5415c9048f861d04fcc75c5` | 12 885 | 218 |
   | F26 | `sql/26_19.13.4_grants-and-completion.sql` | `f24554d93b606d87fa65d53209fc4c66af327467e91a110e042539e0f24af732` | 2 541 | `3a463c0c3b9602daccfef772da49420fea2284304947bad1d8973bf0358a449f` | 2 534 | 53 |

4. **Stale bytes fail.** The S01 deterministic checks (`m7:ddl:check` or its successor) MUST fail against any artifact containing the pre-Erratum-02 bytes of any of the nine occurrences, and MUST fail if any of the nine corrections is missing, partial or applied at a different location.
5. **Unaffected fragments.** F01–F08, F10, F12–F16, F18–F22, F24 and F25 MUST remain byte-identical, with unchanged pinned SHA-256, byte counts and line counts; the fragment count (26), anchors, fence line spans and ordering rule MUST remain unchanged (no line is added or removed).
6. **Other S01 records.** Any other S01 artifact that is a function of the corrected bytes MUST be regenerated consistently; the mechanical inventory (V1.1 §19.14.1) counts MUST be unchanged, since no object is added, removed or renamed.
7. **Re-acceptance.** The regenerated S01 artifacts require independent re-acceptance before they are relied upon.

**This regeneration is not performed by this erratum.**

---

## 10. M7-S03 consequence

1. M7-S03 **remains blocked** until (a) this erratum is independently accepted, protected-integrated and synchronized into the root register, and (b) the M7-S01 artifacts are regenerated and independently re-accepted under §9.
2. The previous M7-S03 attempt **produced no candidate commit** (the S03 worktree remains at the S02 merge `14d846abb749c4bb27a9868eb0913acd343cb64e` with no commit beyond it and no working-tree change).
3. **No partial M7 installation was retained** by that attempt (as reported by the S03 execution, and as required by V1.1 §19.1: the install runs in one transaction, so a failure leaves no partial M7 schema).
4. **No implementation acceptance occurred.**
5. Authoring, auditing or accepting this erratum does **not** authorize resuming M7-S03; resumption is decided by the implementation-line process once item 1 holds.
6. A resumed M7-S03 MUST install the corrected text; it MUST NOT patch normative SQL locally, and if it meets a further defect (inside or outside class `E02-SX`) it MUST stop and report it.

---

## 11. Lifecycle and machine-authority isolation

This erratum advances no lifecycle state. At the baseline, and unchanged by this candidate:

```
M7 GATE 1                               : AUTHORIZED (implementation work only)
M7 GATE 2                               : OPEN / NOT SATISFIED
LC-1 … LC-7                             : NOT OCCURRED (in particular LC-1: NOT OCCURRED)
M7 CONTROL-PLANE MANIFEST PUBLICATION   : NO
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

## 12. Acceptance criteria for the independent auditor

| # | Criterion |
| :-- | :-- |
| E02-AC-1 | the candidate commit changes exactly one path, this file (added); its only parent is `f1fd894b60b70e07143d474992ff8b3c5dd88fe1`; the blobs of V1.1 (`06e103b0…`), Erratum 01 (`15ee2209…`), CCA (`2f0ff3c8…`) and the register (`6e3cb386…`) are unchanged; nothing under `authority/`, runtime, migration, workflow or S01 artifact paths changes |
| E02-AC-2 | the triggering defect reproduces: `pg_catalog.substring(NEW."stagingObjectKey" FROM '[0-9a-f]{32}$')` fails with 42601 and the corrected form parses |
| E02-AC-3 | the scan of §5 is exhaustive over all 26 fragments: the census of §5.2 reproduces, class `E02-SX` has exactly the nine members of §5.3, and every `NOT DEFECT` classification of §5.4 holds |
| E02-AC-4 | each "Before" line of §6 is byte-identical to the named V1.1 line; each "Before" substring is unique on its line and in V1.1; each "After" differs only in the enumerated substring; the line SHA-256 values reproduce |
| E02-AC-5 | Lemmas `E02-L1`…`E02-L4` and Theorem `E02-T1` hold: identical `funcid` / expression node, operands, result type, collation, `NULL` behaviour; digest and grant outcomes unchanged |
| E02-AC-6 | no regex, operand, concatenation, exception, trigger logic, staging-key semantics, lock, transaction, role, identity, retention, digest, CCA, lifecycle or Gate-2 content is changed; §8 holds |
| E02-AC-7 | §4 is clause-scoped: V1.1 remains authoritative outside the nine occurrences; Erratum 01 is unaffected; this erratum wins for those occurrences only |
| E02-AC-8 | §9 requires regeneration from the accepted target, updates exactly the affected pins, makes stale bytes fail, keeps F01–F08, F10, F12–F16, F18–F22, F24, F25 byte-identical, and is not performed here |
| E02-AC-9 | §10 keeps M7-S03 blocked and does not authorize its resumption |
| E02-AC-10 | §11 advances no lifecycle state and touches no machine authority; this document does not self-accept |

---

## 13. Explicit status

```
PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_02 : AUTHOR CANDIDATE — NOT YET AUTHORITATIVE
INDEPENDENT ACCEPTANCE                   : NOT PERFORMED
PROTECTED INTEGRATION                    : NOT PERFORMED
ROOT AUTHORITY SYNC                      : NOT PERFORMED
M7 CONFORMANCE TARGET (UNTIL ACCEPTED)   : M7 V1.1 + ACCEPTED ERRATUM 01 (unchanged)

M7 SPECIFICATION (V1.1)                  : ACCEPTED — ACCEPTED BYTES NOT EDITED
M7 ERRATUM 01                            : ACCEPTED + PROTECTED-INTEGRATED — BYTES NOT EDITED, UNAFFECTED
M7 GATE 1                                : AUTHORIZED (unchanged)
M7 GATE 2                                : OPEN / NOT SATISFIED (unchanged)
LC-1                                     : NOT OCCURRED
M7-S01 REGENERATION                      : NOT PERFORMED — REQUIRED AFTER ACCEPTANCE (§9)
M7-S03                                   : BLOCKED — RESUME NOT AUTHORIZED (§10)
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

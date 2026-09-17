# PAGAMENOS — M7 — S03 VERIFICATION BOOTSTRAP AMENDMENT 01 (INSTALL-TIME PROVISIONING INVARIANT AND S03 VERIFICATION BOOTSTRAP CONTROL PLANE)

```
AUTHOR CANDIDATE — NOT YET AUTHORITATIVE
NOT SELF-ACCEPTED — AWAITING INDEPENDENT AUDIT
M7-S03 REMAINS BLOCKED

AMENDMENT KIND                          : VERIFICATION AND PROVISIONING CONTRACT (narrow; no SQL delta)
ACCEPTED V1.1 / E01 / E02 / E03 / CCA   : NOT EDITED
NORMATIVE SQL OCCURRENCES CHANGED       : 0
S01 FRAGMENT BYTES / PINS CHANGED       : 0 / 0
S01 REGENERATION REQUIRED               : NO (§13)
S02 MODIFIED BY THIS DOCUMENT           : NO — a downstream S02 compatibility work package is identified (§14)
NEW TABLES / FUNCTIONS / GRANTS / ROLES : 0
T-ID SEMANTICS CHANGED                  : 0
PRODUCTION CONTROL-PLANE MANIFEST       : NOT AUTHORED
LC-1 … LC-7                             : NOT OCCURRED — unchanged
MACHINE-READABLE AUTHORITY              : NOT PUBLISHED
PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA   : NOT ASSERTED
SELECTOR                                : NOT ASSERTED / NOT ROTATED
DEPLOYMENT / WAVE 0                     : NOT AUTHORIZED
```

**Nature.** A documentation-only amendment candidate that resolves exactly two questions left open for the M7-S03 work package by the accepted M7 V1.1 specification read with accepted Errata 01, 02 and 03:

1. **Install-time provisioning.** Which property the migration role must have so that the accepted §19.2 statements executed *before* `SET LOCAL ROLE pagamenos_m7_owner` can succeed (non-authoritative diagnostic label **D03-04**; Erratum 03 §8 classified it as provisioning and left it without a precise rule).
2. **Verification bootstrap.** How M7-S03 may prove an installation whose accepted fail-closed completion (V1.1 §19.13.4) requires an active control-plane installation, while no reviewed production manifest exists and none may be invented (non-authoritative diagnostic label **D03-12**; Erratum 03 §8 and §11 item 3 and Register §15.6 record it as unresolved).

It answers (1) with a normative provisioning invariant and version-scoped realizations (§3), and (2) by defining one narrowly bounded verification fixture, the **S03 VERIFICATION BOOTSTRAP CONTROL PLANE** (identifier **`M7-S03-VBCP`**), together with an anti-circular expectation-source contract, a byte-invariant orchestration rule for fragment F26, transaction and session rules, and evidence requirements (§4–§12). It changes no normative SQL, no S01 artifact, no S02 file, no runtime code, no Prisma schema, no migration, no test, no workflow, no `scripts-trusted/` file, nothing under `authority/`, no repository setting and no external variable. It edits neither the accepted V1.1 bytes, nor Erratum 01, 02 or 03, nor the CCA, nor the root register.

**Conventions.** MUST / MUST NOT / MAY are normative. "V1.1 §n" and "V1.1 line n" = `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1.md` at the accepted bytes of §2.2. "E01", "E02", "E03" = the accepted errata of §2.2. "Register §n" = `PAGAMENOS_SPEC_AUTHORITY.md` at the baseline of §2.1. "F01 … F26" = the 26 normative SQL fragments of V1.1 §19.2–§19.13 in the accepted M7-S01 extraction of §2.3. "S03" = the M7-S03 PostgreSQL installation-and-verification work package. Identifiers introduced here carry the prefix `VBA-`; full-text search of the accepted V1.1, E01, E02, E03, CCA and register bytes returns zero matches for `VBA-`, for `M7-S03-VBCP` and for `s03-verification-bootstrap`. The diagnostic labels `D03-04` and `D03-12` name findings of a non-authoritative diagnostic and are used only as cross-references; they carry no authority.

---

## 1. Identity and purpose

| Item | Value |
| :-- | :-- |
| Document | `PAGAMENOS_M7_S03_VERIFICATION_BOOTSTRAP_AMENDMENT_01.md` |
| Kind | M7 verification and provisioning contract amendment; author candidate |
| Controls, once accepted | (a) the install-time provisioning invariant `VBA-PV-1` for every execution of the M7 installation script; (b) how M7-S03 — and only M7-S03 — may obtain an active control plane for verification |
| Does not control | any normative SQL byte; the production migration; the reviewed production manifest (V1.1 §23; E01 MD-*/MG-*); LC-1 … LC-7; MA-1 … MA-18; IMP-01 … IMP-22; Gate 2; machine-readable authority; the selector; deployment |
| Purpose | make M7-S03 **verifiable before** the production lifecycle event LC-1, without **simulating** any lifecycle event and without learning expected catalog truth from the database under test |

---

## 2. Preconditions and authority lineage

### 2.1 Protected authority baseline

| Item | Value |
| :-- | :-- |
| Repository | `PieroAllccaco19/PagaMenos` |
| Protected surface | `origin/m3.5b-b-integration` |
| Baseline commit | `d51393bd60c9b9b0ccd194650314312133f14ca3` (PR #29 merge, *"m7-v1.1-erratum-03-root-authority-sync"*) |
| Baseline tree | `6e0a49f7fc21669df07c0f274bad791965296f5d` |
| Lineage | this candidate is a single commit whose only parent is the baseline commit, adding exactly one path: this file. The rejected historical commit `a586b3119da2cc1aa4668485b129dbe625ab5cae` is not an ancestor of the baseline |

### 2.2 Immutable accepted artifacts — exact identities (not edited)

| Artifact | Git blob at the baseline | SHA-256 |
| :-- | :-- | :-- |
| `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1.md` (10 626 lines, 1 143 725 bytes) | `06e103b0d5e8cfcbb96ab21134d5605b0aae9b26` | `457f51778fb5d5890b3e3478376e413072f15aef7da88125b5e78963f49394bd` |
| `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_01.md` (604 lines, 82 027 bytes) | `15ee22090d3e37b6a63dd25914f8abb0f4fa9d4b` | `f381cb015adadc7a22463060da7ff55e8711b8ab13879c60f93cabf53eb863e8` |
| `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_02.md` (515 lines, 44 295 bytes) | `a0e6fa6720f23ac08485ab7cb696ab9ba4b7e83f` | `b7b3440ad04181356770f243a6e2870e004aba604d2a62afdefd5330c85c170f` |
| `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_03.md` (779 lines, 72 201 bytes) | `8ba87adc9b87cee749c214d9326b0aa750ceabf0` | `b4debcb5a02e777e780e14002c5e9cdbb90f2140f5b7516592b8e05e67366160` |
| `PAGAMENOS_A1_A2_M7_CONSENT_COMPATIBILITY_AMENDMENT_01.md` | `2f0ff3c886c5ac9b1cbba797404e9024c0b83732` | `3a6003494f4817907401a9afda5b9d9a1647ade5ff9196f2aee2ba3b1b2ca1ad` |
| `PAGAMENOS_SPEC_AUTHORITY.md` (2 157 lines, 244 840 bytes) | `9d1a4b187d12a67302ba1310c30229d70618edff` | `b230f20d6abbefc352ee22f96d197d07221e64c0213a7bf824d69d22fd6c061c` |

The effective M7 conformance target is **M7 V1.1 + accepted Erratum 01 + accepted Erratum 02 + accepted Erratum 03** (Register §15.2). This amendment adds no conformance-target component for normative SQL; once accepted it adds the contract of §3–§12 for installation provisioning and for S03 verification.

### 2.3 Implementation-line artifacts consulted (not authority; not edited; not copied)

| Item | Value |
| :-- | :-- |
| Implementation staging | `origin/m7-v1.1-implementation` tip `9cd2a61939d3e0ee6cf47ddcc9198b6c570974b0`, tree `64862ccb571aad4fd55771b5cadb06e82d5de0c9` (PR #31 merge; contains the M7-S01 Erratum 03 regeneration) |
| M7-S01 extraction | `prisma/m7/normative/` at that tip; `EXTRACTION_INDEX.json` blob `a8a085e12749e6483f8d65a215a74c5c2909484e`, SHA-256 `7e00ddc8fbbdad8f2f5cb2c0a36f79b69ec533cbb69e8d0a5a61eabe21aed665`; `INVENTORY.json` blob `14336e6266a72e16426f4266d1d03c7ae427b94d` |
| F26 | `sql/26_19.13.4_grants-and-completion.sql`, blob `e56c87a68e8c45ebb774b6ef4991a893476c591f`, SHA-256 `3a463c0c3b9602daccfef772da49420fea2284304947bad1d8973bf0358a449f` |
| Erratum 03 pins | F01 `f75c45ab8110c3fe5bce5379e77a08a51bc2e3d0561e887310d9c9361d02a6be` (5 074 bytes, 95 lines); F11 `c9f5777fcc699fd9411427e4b17fd3f28258068f925bbb8fcbe3a935fbec75a9` (31 403, 606); F24 `f68eeea9d1f6a3b192b64163949385d89cd0b0fa369b168d8160d3eaa7006fff` (14 628, 250) |
| M7-S02 provisioning inputs | `scripts/m7/provision/roles.template.sql` blob `6e790849793831089938102dd08e94286d868ad1`; `src/m7/testkit/provision.ts` blob `11a93dadee09623ffd1581e2ac3f986379510ad7` (`HARNESS_MIGRATION_ROLE = 'pagamenos_migrator'`) |

These artifacts are cited to state evidence and to identify the pre-execution inputs of §9. This amendment asserts no register status for any implementation-line slice beyond what Register §15 records.

### 2.4 Provenance of the evidence (non-authoritative)

A non-authoritative M7-S03 re-diagnosis ran against implementation staging `9cd2a61…` on fresh PostgreSQL clusters (`PostgreSQL 18.4 on x86_64-windows, compiled by msvc-19.44.35227, 64-bit`; SCRAM; loopback), with roles provisioned by the unmodified M7-S02 template and the accepted migrations replayed by the non-superuser migration role `pagamenos_migrator`. It executed the 26 accepted fragments without modifying any byte. **That diagnostic is not authority and is not incorporated**; its results motivate this amendment and are restated here only as evidence.

| Run | Provisioning | Execution | Observed |
| :-- | :-- | :-- | :-- |
| RA | M7-S02 as instantiated: owner membership of the migration role with `inherit_option = false`, `set_option = true`, `admin_option = false` (migration role `rolinherit = false`) | F01 … F26 as one query | `42501 permission denied for schema m7` in F01 (first privilege-requiring statement after `CREATE SCHEMA`, V1.1 line 2448); full rollback; no residue |
| RB | same roles; the same membership edge with `inherit_option = true` (role attributes unchanged) | F01 … F26 as one query | every statement up to the V1.1 §19.13.4 final `DO` succeeds; the final `DO` raises `P0001 M7_INSTALL: no active control-plane installation`; full rollback; no residue |
| RC | as RB | fragment by fragment on one session; F26 partitioned byte-exactly at its `DO $final$` line; rolled-back inspections; then the F26 suffix | all Erratum 03 corrections dynamically confirmed; `session_user = pagamenos_migrator`, `current_user = pagamenos_m7_owner` after F01's `SET LOCAL ROLE`; zero `IA-06` rows for the bootstrap superuser and the inheriting migration role; final `DO` again `P0001`; no residue |
| RD | as RB, with the Erratum 03 `E03-09` T-82 setup | F01 … F26 as one query | `42501 permission denied for table study_participant` in F01; full rollback; no residue |
| RP | M7-S02 as instantiated, then the provisioning statement `GRANT pagamenos_m7_owner TO pagamenos_migrator WITH INHERIT TRUE, SET TRUE` issued by the cluster bootstrap administrator | the §19.2 statements before `SET LOCAL ROLE` (V1.1 lines 2447–2466), each under a savepoint, then `SET LOCAL ROLE pagamenos_m7_owner`; rolled back | before the grant: one edge (`inherit_option = false`, `set_option = true`, `admin_option = false`), `pg_has_role(…, 'MEMBER')` = true, `'USAGE'` = **false**, `'SET'` = true; exactly the two schema-`m7` ACL statements (V1.1 lines 2448 and 2449–2451) fail `42501 permission denied for schema m7`, every other statement and `SET LOCAL ROLE` succeed. After the grant: still exactly one edge, now `inherit_option = true`, `set_option = true`, `admin_option = false`, member `rolinherit` still `false`; `'USAGE'` = **true**; every statement succeeds |

Residue = schema `m7` absent, zero objects owned by `pagamenos_m7_owner`, zero grants to it on `public` relations, zero `pg_default_acl` rows, in every database of the cluster.

---

## 3. D03-04 — install-time provisioning decision

### 3.1 Why the pre-`SET LOCAL ROLE` statements need the owner's privileges

The accepted §19.2 preamble (effective F01; V1.1 lines 2447–2466) executes, as the migration role and **before** `SET LOCAL ROLE pagamenos_m7_owner` (V1.1 line 2469):

| Statement | Privilege it requires |
| :-- | :-- |
| `CREATE SCHEMA m7 AUTHORIZATION pagamenos_m7_owner` | `CREATE` on the database, and the ability to act as the new schema owner |
| `REVOKE ALL ON SCHEMA m7 FROM PUBLIC`; `GRANT USAGE ON SCHEMA m7 TO <six login roles>` | the grant options on schema `m7`, which only its owner `pagamenos_m7_owner` holds; the migration role holds none of its own |
| `GRANT USAGE ON SCHEMA public TO pagamenos_m7_owner` | grant option on schema `public` held by the migration role itself |
| `GRANT SELECT / REFERENCES / UPDATE("id") ON TABLE public.… TO pagamenos_m7_owner` | ownership of the accepted relations, held by the migration role itself (§19.2: "executed by the migration role, which owns the accepted relations") |

The second row succeeds only if the executing role can exercise `pagamenos_m7_owner`'s privileges **without** `SET ROLE` — PostgreSQL privilege inheritance through role membership. Membership without inheritance is insufficient (RA); the same membership with inheritance is sufficient (RB, RC). The F01 bytes and their order are correct and remain unchanged (E03 §8).

### 3.2 `VBA-PV-1` — normative provisioning invariant

**`VBA-PV-1`.** Throughout every execution of the M7 installation script, and in particular while its pre-`SET LOCAL ROLE` statements execute:

1. `session_user` is the migration role, and `current_user` equals `session_user` until F01's `SET LOCAL ROLE pagamenos_m7_owner`;
2. the migration role is **not** a superuser;
3. the migration role is a **direct** member of `pagamenos_m7_owner`, and the members of `pagamenos_m7_owner` are exactly `{session_user}` (IA-05, unchanged);
4. the migration role has **effective** access to the privileges of `pagamenos_m7_owner` through that membership — `pg_catalog.pg_has_role(session_user, 'pagamenos_m7_owner', 'USAGE')` is `true` — and is permitted to `SET ROLE pagamenos_m7_owner` (on PostgreSQL ≥ 16, `pg_catalog.pg_has_role(session_user, 'pagamenos_m7_owner', 'SET')` is `true`);
5. the migration role holds, by its own ownership or grants, the privileges the §19.2 statements on accepted A1/A2 relations and on schema `public` require.

`VBA-PV-1` is a property of **provisioning**, established by the separately governed provisioning step (V1.1 RS-6, §18.4). The installation script neither establishes nor repairs it; a violation surfaces as a failed statement and a full rollback.

### 3.3 `VBA-PV-2` — properties preserved

`VBA-PV-1` changes none of: `session_user` = the migration role; the exact IA-05 membership identity; IA-03 (`rolinherit = false`, no memberships) for the six M7 login roles; IA-02 (`pagamenos_m7_owner` NOLOGIN and without SUPERUSER, CREATEDB, CREATEROLE, REPLICATION, BYPASSRLS); IA-04; the §18.2 role table; the F01 statement order; any normative SQL byte. No `ADMIN OPTION` on `pagamenos_m7_owner` is required of the migration role by `VBA-PV-1`. The installation is never executed by a superuser.

Interaction with the accepted verifier (checked against the accepted text and observed in RC): the Erratum 03 IA-06 domain `D` excludes every member of `pagamenos_m7_owner`, so an inheriting migration role produces no `IA-06` row; the membership branch compares membership *identity*, not inheritance options, so `MEMBER-*` rows are unaffected; `ROLE-DRIFT` compares `rolinherit` only for the roles of the expectation set, of which the migration role is not one (§9).

### 3.4 `VBA-PV-3` — version-scoped realizations (distinct from the invariant)

| PostgreSQL | Role-membership semantics | Realization of `VBA-PV-1` item 4 | Status under this amendment |
| :-- | :-- | :-- | :-- |
| **≥ 16** | each membership edge (`pg_auth_members`) carries `inherit_option`, `set_option`, `admin_option`; an explicit `WITH INHERIT` / `WITH SET` on the grant governs that edge, and the member's `rolinherit` supplies only the default for grants that do not state it | **exactly one** edge `(roleid = pagamenos_m7_owner, member = <migration role>)` with `inherit_option = true`, `set_option = true`, `admin_option = false`, as created by the provisioning statement `GRANT pagamenos_m7_owner TO <migration role> WITH INHERIT TRUE, SET TRUE;`. The migration role's own `rolinherit` attribute is not constrained by this realization | **canonical conforming realization for PostgreSQL ≥ 16.** Empirically demonstrated on **18.4 only** (RB, RC). PostgreSQL 16 and 17 rest on the same documented membership-option semantics and are **not** empirically demonstrated; no S03 evidence may claim them unless executed on those versions |
| **15** | no per-edge options; inheritance through a membership is governed by the **member** role's `rolinherit` attribute; `SET ROLE` is permitted by membership | a migration role with the `INHERIT` attribute, directly granted `pagamenos_m7_owner` | **documented-semantics realization only — UNVERIFIED.** No PostgreSQL 15 binary was available. This amendment does **not** declare it canonical; any reliance on PostgreSQL 15 requires its own execution evidence first |
| **≤ 14** | — | — | refused by IA-08; out of scope |
| **> 18** | not examined | none asserted | out of scope until examined |

A provisioning that satisfies `VBA-PV-1` by any other means (for example an intermediate role) is not excluded by the invariant, but it is not a realization recognized by this amendment and MUST be demonstrated on its own before S03 relies on it.

---

## 4. D03-12 — the S03 verification bootstrap control plane

### 4.1 Definition

**S03 VERIFICATION BOOTSTRAP CONTROL PLANE** (`M7-S03-VBCP`) — the set of rows created in an isolated, disposable M7-S03 PostgreSQL database **exclusively** by one execution of the accepted control-plane sequence of V1.1 §19.13.4 (`m7.c_register_storage_backend_v1` → `m7.c_register_storage_profile_v1` → `m7.c_register_retention_policy_v1` → `m7.c_register_merchant_vocabulary_v1` → `m7.c_register_manifest_v1` → `m7.c_load_catalog_expectations_v1` → `m7.c_activate_manifest_v1`), with arguments determined by a **VBCP fixture document** (§7.4) that exists before the database is created, under the argument classes of §7.6, for the sole purpose of M7-S03 verification.

`M7-S03-VBCP` is a **verification fixture**. It is not lifecycle authority, not a manifest in the sense of V1.1 §23 or E01 §5, and not evidence that any reviewed manifest exists. The database table names it occupies (`m7.m7_control_plane_manifest`, `m7.m7_control_plane_installation`, …) are cited only as table names.

### 4.2 `VBA-VB-1` — what an `M7-S03-VBCP` MAY do

An `M7-S03-VBCP`:

1. MAY exist **only** in an isolated, disposable PostgreSQL cluster or database created for one M7-S03 execution (§10);
2. MAY be loaded only after F01 … F25 and the F26 prefix of §8 have executed in the installing transaction, and before the F26 final assertion executes;
3. MAY use **only** the seven accepted `m7.c_*` calls of §4.1, each exactly once, in that order, with no other statement interleaved, so that the real control-plane code paths — digest recomputation, versioned-identity checks, DL-4, XF-DL-1, expectation loading and activation — are exercised;
4. MAY be used by M7-S03 to execute the positive and negative verification families of §11 that require an active control plane;
5. MUST be destroyed with the disposable environment (§10), which is the only teardown mechanism.

### 4.3 Scope boundary of the orchestration

The seven calls are **not** added to any fragment, to any S01 artifact, or to any file that is or becomes the production migration. They are executed by the S03 harness from the VBCP fixture document. V1.1 §19.13.4's statement that *the migration* contains exactly one such sequence, whose literal arguments equal the reviewed manifest's `database.controlPlaneInstall`, is unchanged and continues to govern the production migration (E01 MG-2, MG-3).

---

## 5. `VBA-LB` — hard lifecycle boundaries

**`VBA-LB-1`.** An `M7-S03-VBCP`, its fixture document, its expectation payload, its digests and every row it creates **MUST NOT**:

1. be called, described, recorded or treated as a control-plane manifest, a reviewed manifest, a manifest candidate, or `database.controlPlaneInstall` of any manifest;
2. satisfy, advance or be cited as evidence toward LC-1 … LC-7;
3. satisfy Gate 2, any MA-1 … MA-18 item or any IMP-01 … IMP-22 item by itself;
4. be published as, or inside, machine-readable authority, or be placed under `authority/`;
5. establish, suggest or be compared with a value of `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA`;
6. populate, rotate or inform the production selector;
7. authorize Wave 0, deployment or any runtime use;
8. be committed to any repository path as a manifest, or be embedded in any build;
9. be used outside M7-S03 verification, including in any database that is not disposable, shared, long-lived or reachable by an application deployment;
10. become, or be cited as, evidence that a reviewed production manifest exists or has any particular content.

**`VBA-LB-2`.** E01 MD-1 … MD-7 and MG-1 … MG-6 do not apply to an `M7-S03-VBCP` and are not satisfied, exercised or waived by it. No verdict about an `M7-S03-VBCP` may use the words "accepted" or "acceptance" for it (E01 §9.0 verdict naming applies by analogy).

**`VBA-LB-3`.** An `M7-S03-VBCP` is not a conformance double for the **STORE**, **2STORE** or **SIGN** tiers (V1.1 §25.1 VC-2, VC-8) and does not discharge VC-1's hosted required-check surface (`VBA-SC-3`).

---

## 6. `VBA-AX` — anti-circularity rule

**`VBA-AX-1` (admissible expected-side sources).** Every value on the *expected* side of an S03 comparison — in particular every element of the arrays passed to `m7.c_load_catalog_expectations_v1` — MUST be derived exclusively from the following pre-execution inputs, each identified by Git blob and SHA-256 in the S03 evidence:

| # | Source | Admissible for |
| :-- | :-- | :-- |
| S1 | the accepted V1.1, E01, E02, E03 bytes (§2.2) | every expectation the accepted text fixes |
| S2 | the accepted and integrated M7-S01 extraction (§2.3), whose bytes are a deterministic function of S1 pinned by Erratum 03 §10 | the normative fragment bytes from which object names, headers and bodies are read |
| S3 | the accepted and integrated M7-S02 provisioning inputs (§2.3), in the version on which S03 executes | **only** provisioning facts S1 does not fix: the migration role name and the `rolinherit` attribute of `pagamenos_m7_owner` |
| S4 | the VBCP fixture document (§7.4) | **only** the `FIXED` arguments and the argument descriptors of §7.6; never a catalog expectation |

No other source is admissible. This amendment introduces no new authority source.

**`VBA-AX-2` (prohibited sources).** No expected-side value may be read from, compared against in order to be chosen from, or adjusted to match: any PostgreSQL catalog, view, function result, error message, `pg_dump` output or server log; the database under test; any earlier S03 run, database or evidence file; or any other runtime observation. "Calibrating" an expectation against observed state is prohibited.

**`VBA-AX-3` (structural separation).** The derivation of the expectation payload and of the fixture document MUST be a pure, deterministic function of S1 … S4 that holds no database connection. Its output digests (§7.5) MUST be recorded in the S03 evidence **before** the first connection to the cluster under test is opened, and MUST be re-derived from the same inputs after teardown with byte-identical results.

**`VBA-AX-4` (actual side).** Catalog introspection, verifier output and session observations MAY be used **only** as the *actual* side of an expected-versus-actual comparison.

**`VBA-AX-5` (mismatch).** A difference between expected and actual is a verification **failure**. It MAY lead to a correction of the derivation only as a new S03 candidate change that is justified from S1 … S3 and documented PostgreSQL semantics, subject to independent audit, and never by transcribing an observed value. The failure itself is reported.

**`VBA-AX-6` (non-derivable items).** If any expected value required by a verification item cannot be derived under §9, that item is **BLOCKED / NOT EXECUTED**; it is never learned from runtime state and never reported as PASS.

**`VBA-AX-7` (four value domains).** Every value S03 handles belongs to exactly one of four domains, and S03 evidence labels it accordingly:

| Domain | Contents | May determine expected truth |
| :-- | :-- | :-- |
| **PRE-EXECUTION FIXED INPUT** | the `FIXED` arguments of `F` (§7.6) and the other `FIXED` members of `F` | yes |
| **PRE-EXECUTION DERIVED EXPECTATION** | `E` and every `PRE_DERIVED` value — `entriesSha256`, `expectationPayloadSha256`, `fixtureDigest` — derived under `VBA-AX-1` and `VBA-AX-3` | yes |
| **RUNTIME CHAINING VALUE** | a `RUNTIME_BINDING` value (§7.6): at present only the `backendSha256` returned by `m7.c_register_storage_backend_v1` | **no** — it only connects accepted APIs as their contracts require, and is verified under `VBA-FX-9`; it never enters `E`, `F`, a digest or an expected value |
| **ACTUAL DATABASE OBSERVATION** | every catalog read, function result, verifier row, SQLSTATE and session observation | **no** — actual side only (`VBA-AX-4`) |

---

## 7. `VBA-FX` — fixture identity rules

### 7.1 VBCP marker token

**`VBA-FX-1`.** The lowercase ASCII token **`s03-verification-bootstrap`** is the marker of the `M7-S03-VBCP` namespace:

1. every VBCP identity — each identity of §7.2 and each identity-bearing fixture parameter of §7.3 — MUST contain it;
2. fixture documents, S03 evidence and reports MUST use the VBCP identities exactly as fixed in the fixture document `F`, consistently throughout one execution;
3. no VBCP identity may be represented, recorded or reported as a production identity.

This rule constrains VBCP identities only. It imposes no constraint on, and creates no validity condition for, any reviewed production manifest or any identity such a manifest registers; those remain governed exclusively by V1.1 read with Errata 01, 02 and 03. Recognition of a VBCP identity never rests on the token alone (`VBA-FX-6`).

### 7.2 Versioned identities (exact forms)

**`VBA-FX-2`.** With `N` a positive decimal integer without leading zeros, identical in all four identities of one fixture document:

| Identity | Exact form | Accepted CHECK satisfied |
| :-- | :-- | :-- |
| `manifestVersion` | `pagamenos.m7.control-plane.s03-verification-bootstrap.v<N>` | `m7_control_plane_manifest_version_ck` |
| `policyVersion` | `pagamenos.m7.policy.s03-verification-bootstrap.v<N>` | `m7_retention_policy_version_ck` |
| `vocabularyVersion` | `pagamenos.m7.merchant-vocabulary.s03-verification-bootstrap.v<N>` | `m7_merchant_vocabulary_version_ck` |
| `storageProfileVersion` | `pagamenos.m7.storage-profile.s03-verification-bootstrap.v<N>` | `m7_storage_profile_version_ck` |

### 7.3 Other fixture parameters (constraints; concrete values deferred to S03)

**`VBA-FX-3`.** The concrete operational values belong to the S03 implementation and are fixed in the VBCP fixture document before execution. They MUST satisfy:

1. `providerClass` = `CONFORMANCE_DOUBLE` (an accepted `m7."M7StorageProviderClass"` label); `containerId`, `regionId`, `endpointIdentity` and `credentialProfileId` contain the marker token; `stagingPrefix` and `evidencePrefix` both begin with `s03-verification-bootstrap/` and satisfy the accepted prefix and disjointness CHECKs; no value names, resolves to or authenticates against any real provider resource, and no real credential exists for any of them;
2. `uploadTransport` = `SERVER_MEDIATED` (E01 §10.4, E01-DO-4);
3. `corpusId` contains the marker token and is **not** an entry of the accepted `CORPUS_RELEASE_LEDGER_V1` (so the fixture can never satisfy MA-4); every `merchantRef` begins with `s03-verification-bootstrap:`; `p_entries_sha256` is computed from the refs exactly as V1.1 §19.11.2 states (sorted with `COLLATE "C"`, LF-joined, SHA-256);
4. every retention-policy value satisfies every accepted CHECK of `m7.m7_retention_policy`, DL-4 as enforced by `m7.c_register_retention_policy_v1`, and — with the fixture backend's window — XF-DL-1 as enforced by `m7.c_activate_manifest_v1`;
5. no value is a timestamp, a random value, a Git commit identifier, the current `HEAD`, a value of or derived from `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA`, or a value copied from any production-intended document.

Values PostgreSQL generates during registration and activation (`gen_random_uuid()` identifiers, `clock_timestamp()` instants, `installationSeq`, `registeredBy`, `installedBy`, and the digests `backendSha256`, `profileSha256`, `policySha256`, `vocabularySha256` recomputed in SQL) are **observed evidence**, not fixture identity. The `p_backend_sha256` argument of `m7.c_register_storage_profile_v1` is not a fixture parameter: it is a runtime chaining value (§7.6).

### 7.4 The VBCP fixture document

**`VBA-FX-4`.** The VBCP fixture document `F` is a JSON object with exactly these top-level members:

| Member | Value |
| :-- | :-- |
| `fixtureSchemaVersion` | the string `pagamenos.m7.s03-verification-bootstrap-fixture.v1` |
| `fixtureKind` | the string `S03_VERIFICATION_BOOTSTRAP_NOT_A_MANIFEST` |
| `sources` | the Git blob and SHA-256 of every S1, S2 and S3 input used (§6), including `EXTRACTION_INDEX.json` |
| `provisioning` | the migration role name and the expected `rolinherit` of `pagamenos_m7_owner`, each with its S3 source |
| `controlPlaneInstall` | the seven call descriptors of `VBA-FX-8` (§7.6), in the order of §4.1, each covering every declared parameter of its call exactly once |
| `expectationPayloadSha256` | the digest of §7.5 |

`F` MUST NOT contain a member named `manifestSha256`, `authority`, `database`, `retention`, `storage`, `deployment` or `compatibility` at any depth, so that it cannot be parsed as a V1.1 §23.4 manifest. `F` MUST NOT contain its own digest, any expectation array, any value returned by PostgreSQL, or any other database observation.

### 7.5 Digests and domain separation

**`VBA-FX-5`.** Let `canonical` be the accepted project serializer `src/persistence/canonical.ts` (the serializer V1.1 §23.3 names). Let `E` be the **expectation payload**: the JSON object whose members are `manifestVersion` and the eighteen expectation arrays of §9, named after the corresponding parameters of `m7.c_load_catalog_expectations_v1`, each array in the order of §9.3.

- `expectationPayloadSha256 = 'sha256:' ‖ lowercase-hex(SHA-256(utf8("PAGAMENOS/M7/S03-VBCP/EXPECTATIONS/V1\n") ‖ utf8(canonical(E))))`
- `fixtureDigest = 'sha256:' ‖ lowercase-hex(SHA-256(utf8("PAGAMENOS/M7/S03-VBCP/FIXTURE/V1\n") ‖ utf8(canonical(F))))`

`fixtureDigest` is the value supplied as `p_manifest_sha256` to `m7.c_register_manifest_v1` and `m7.c_activate_manifest_v1`, and as `p_manifest_sha256` to `m7.w_verify_control_plane_catalog_v1` and to every entry function called during S03 verification.

**Computation order (no recursion).** (1) `E` is derived from S1 … S3; (2) `expectationPayloadSha256` is computed from `E`; (3) `F` is constructed, containing `expectationPayloadSha256` and the symbolic descriptors of §7.6 — among them the `derived` descriptor `fixtureDigest`, which names that digest without containing it; (4) `fixtureDigest` is computed from `F`; (5) both digests are recorded in the S03 evidence; (6) only then is the first connection to the cluster under test opened. `E` contains neither digest, and `F` contains `expectationPayloadSha256` but not `fixtureDigest`, so no digest is an input of itself. Neither `E` nor `F` contains a runtime chaining value or a database observation, so no value returned during execution can change `E`, `F`, `expectationPayloadSha256` or `fixtureDigest`.

**`VBA-FX-6` (proof of domain separation).** A production manifest digest is `SHA-256(utf8(canonical(M°)))` (E01 MD-5, MD-6 step 3), where `M°` is a JSON object (E01 MD-2), so its preimage's first byte is `{` (0x7B). The preimage of `fixtureDigest` begins with `P` (0x50). The preimages therefore differ, and equal digests would constitute a SHA-256 collision. `fixtureDigest` matches `^sha256:[0-9a-f]{64}$` and so differs from the E01 placeholder `P`. Recognition of an `M7-S03-VBCP` identity rests on its own positive markers: a fixture document `F` carrying the `fixtureSchemaVersion` and `fixtureKind` of `VBA-FX-4`; the recomputation of the recorded `fixtureDigest` from `F` under the domain tag above; and the markers of `VBA-FX-1` … `VBA-FX-3` (the marker token in every VBCP identity, `CONFORMANCE_DOUBLE`, a `corpusId` outside the accepted ledger). An identity is a VBCP identity only if a fixture document exists that reproduces the recorded `fixtureDigest` and contains that identity. This recognition consults no repository branch, commit or selector, and it neither requires nor asserts anything about the value domain of production identities.

**`VBA-FX-7` (naming).** Evidence, logs and reports refer to the fixture only as "S03 verification bootstrap control plane (`M7-S03-VBCP`)", its fixture document and its digests, never as a manifest.

### 7.6 Argument classes of the seven-call sequence

**`VBA-FX-8` (classes and descriptors).** Every declared parameter of the seven calls of §4.1 belongs to exactly one class:

| Class | Meaning | Fixed when |
| :-- | :-- | :-- |
| **`FIXED`** | a concrete value fixed in `F` | before any PostgreSQL connection |
| **`PRE_DERIVED`** | a value deterministically derived from S1 … S4 by a rule of this amendment | before any PostgreSQL connection |
| **`RUNTIME_BINDING`** | the value returned by one earlier call of the same seven-call sequence, passed unchanged to a named parameter of a later call, as the accepted function contracts require | during execution; never before |

`controlPlaneInstall` in `F` is a JSON array of seven call descriptors, in the order of §4.1. Each call descriptor is a JSON object with exactly two members: `function`, the schema-qualified function name; and `arguments`, a JSON array with one element per declared parameter, in declared order. Each argument element is a JSON object with exactly three members: `parameter`, the declared parameter name; `class`, one of the strings `FIXED`, `PRE_DERIVED`, `RUNTIME_BINDING`; and exactly one of:

- `value` (class `FIXED`): the argument as a JSON value; the S03 implementation defines one deterministic, recorded mapping from each JSON value to a SQL value of the declared parameter type;
- `derived` (class `PRE_DERIVED`): one of the strings `entriesSha256` (the V1.1 §19.11.2 entries digest of the `FIXED` `p_merchant_refs`), `fixtureDigest` (§7.5), or `expectationPayload.<parameter>` (the member of `E` named after that parameter);
- `binding` (class `RUNTIME_BINDING`): the JSON object `{"returnOf": "<schema-qualified producer function>"}`.

A descriptor contains no runtime-returned byte, no digest of `F`, no expectation array and no catalog-derived value.

**Classification** — derived mechanically from the accepted V1.1 §19.11.2 signatures (70 declared parameters):

| Call (count) | `FIXED` | `PRE_DERIVED` | `RUNTIME_BINDING` |
| :-- | :-- | :-- | :-- |
| `m7.c_register_storage_backend_v1` (7) | `p_provider_class`, `p_container_id`, `p_region_id`, `p_endpoint_identity`, `p_staging_prefix`, `p_evidence_prefix`, `p_write_completion_window` | — | — |
| `m7.c_register_storage_profile_v1` (11) | `p_storage_profile_version`, `p_credential_profile_id`, `p_credential_generation`, `p_upload_transport`, `p_decoder_generation`, `p_encoder_generation`, `p_storage_capability_version`, `p_conditional_create_mode`, `p_write_capability_mode`, `p_envelope_enforcement` | — | `p_backend_sha256` ← `{"returnOf": "m7.c_register_storage_backend_v1"}` |
| `m7.c_register_retention_policy_v1` (22) | `p_policy_version`, `p_hard_withdrawal`, `p_hard_never_verified`, `p_hard_authorized`, `p_schedule_withdrawal`, `p_schedule_never_verified`, `p_schedule_authorized`, `p_scheduler_worst_case_lag`, `p_effect_completion_budget`, `p_generation_write_grant_ttl`, `p_write_fence_skew_allowance`, `p_upload_url_ttl`, `p_finalize_window`, `p_worker_lease`, `p_session_ttl`, `p_capture_skew_tolerance`, `p_orphan_grace`, `p_outbox_backoff_cap`, `p_outbox_max_attempts`, `p_max_upload_bytes`, `p_max_pixels`, `p_canonical_media_type` | — | — |
| `m7.c_register_merchant_vocabulary_v1` (4) | `p_vocabulary_version`, `p_corpus_id`, `p_merchant_refs` | `p_entries_sha256` ← `entriesSha256` | — |
| `m7.c_register_manifest_v1` (5) | `p_manifest_version`, `p_policy_version`, `p_vocabulary_version`, `p_storage_profile_version` | `p_manifest_sha256` ← `fixtureDigest` | — |
| `m7.c_load_catalog_expectations_v1` (19) | `p_manifest_version` | the eighteen arrays `p_relation_names` … `p_member_names` ← `expectationPayload.<parameter>` (§9.3) | — |
| `m7.c_activate_manifest_v1` (2) | `p_manifest_version` | `p_manifest_sha256` ← `fixtureDigest` | — |
| **Total (70)** | **48** | **21** | **1** |

`p_backend_sha256` is the **only** runtime chaining value. The version arguments of `m7.c_register_manifest_v1`, `m7.c_load_catalog_expectations_v1` and `m7.c_activate_manifest_v1` are `FIXED`: each MUST equal the `FIXED` version string of the same identity in the earlier call that registers it, and the accepted producers return exactly that input string (`RETURN p_policy_version`, `RETURN p_vocabulary_version`, `RETURN p_manifest_version`). The remaining return values — the profile `uuid`, the load count and the installation `uuid` — are consumed by no later call.

**`VBA-FX-9` (runtime binding procedure).** For the runtime binding, the S03 harness MUST: (1) call the producer `m7.c_register_storage_backend_v1` with its `FIXED` arguments; (2) record the returned value as a runtime chaining value, naming its producer; (3) pass that exact value, unchanged, as `p_backend_sha256` of `m7.c_register_storage_profile_v1`, recording the value actually sent; (4) verify that the recorded returned value and the recorded sent value are byte-identical, and, once the installing transaction has committed, that the registered profile of the `FIXED` `storageProfileVersion` references that exact `backendSha256` (an actual database observation). It MUST also verify, from the results of those calls, that `m7.c_register_retention_policy_v1`, `m7.c_register_merchant_vocabulary_v1` and `m7.c_register_manifest_v1` returned exactly their `FIXED` version strings. None of these verifications adds a statement between the first bootstrap call and the end of `F26-suffix` (`VBA-VB-1` item 3, `VBA-TX-1`). A deviation is an installation FAIL. A runtime chaining value never alters `E`, `F`, `expectationPayloadSha256`, `fixtureDigest` or any expected value (`VBA-AX-7`).

---

## 8. `VBA-OR` — normative F26 byte invariance and verification orchestration

**`VBA-OR-1` (byte invariance).** The F26 bytes (§2.3) remain byte-identical. No generated F26 variant, no fragment copy with inserted statements, and no conversion of the §19.13.4 comment lines into SQL is created in, or stored as, any S01 artifact or repository file.

**`VBA-OR-2` (partition point).** Before execution, the S03 harness MUST verify that F26 contains exactly one line equal to `DO $final$` beginning at column 0 (the accepted V1.1 line 8856 inside the §19.13.4 fence), and MUST partition F26 into `F26-prefix` (every byte before that line) and `F26-suffix` (that line and every following byte), refusing unless `F26-prefix ‖ F26-suffix` is byte-identical to F26. Informative values at §2.3: `F26-prefix` SHA-256 `e671ed4fc4c030a56bfe641514f8ab86277ae67dfcbb6c2b17b8742ee164480b` (2 094 bytes), `F26-suffix` SHA-256 `c000c8085dec7d8b69b495776704e1d94800efe8c3b997c0cadbc3ad272ff7e8` (439 bytes).

**`VBA-OR-3` (installing execution).** In one session authenticated as the migration role satisfying `VBA-PV-1`, the harness executes, in this order and each exactly once: F01, F02, …, F25 (verbatim); `F26-prefix` (verbatim); the seven calls of §4.1 with their arguments resolved from `F` under §7.6 (`FIXED` values, `PRE_DERIVED` values, and the runtime binding of `VBA-FX-9`), with `current_user = pagamenos_m7_owner` as left by F01's `SET LOCAL ROLE` and no other statement interleaved; `F26-suffix` (verbatim, including its final `DO`, `RESET ROLE` and `COMMIT`). The transaction opened by F01's `BEGIN` is the only transaction.

**`VBA-OR-4` (why this is orchestration and not modification).**

1. every accepted normative byte is executed exactly once, in accepted order, in one transaction (V1.1 §19.1);
2. the only statements added are calls to accepted `m7.c_*` functions, at the exact position where V1.1 §19.13.4 places the control-plane sequence, by the owner-class actor V1.1 RS-8 designates; they create no schema object, grant, role or function;
3. no normative SQL is generated, rewritten, normalized, skipped or stored in altered form, and M7-S01 is untouched;
4. the final fail-closed assertion executes unmodified and decides the outcome; a violation aborts the entire installation exactly as it would in production;
5. the supplied values are fixture parameters bound by §5–§7, never presented as the reviewed manifest's `database.controlPlaneInstall`.

**`VBA-OR-5` (fail closed).** Positive installation evidence exists only if the `F26-suffix` completes without exception. Any exception is an installation FAIL: the transaction is rolled back by PostgreSQL, and the run MUST NOT be retried with any altered normative byte or altered expected value (`VBA-AX-5`).

**`VBA-OR-6` (control run).** Every S03 execution includes a verbatim F01 … F26 run **without** the bootstrap, which MUST end with `P0001 M7_INSTALL: no active control-plane installation` and zero residue — demonstrating that the accepted fail-closed semantics are unchanged.

---

## 9. `VBA-EX` — expectation-source contract

### 9.1 Rule

**`VBA-EX-1`.** If `m7.c_load_catalog_expectations_v1` is called, every one of its eighteen arrays MUST be the output of the derivation of §9.3 over S1 … S3, and the expectation payload `E` (§7.5) MUST be fully constructed, digested and recorded before PostgreSQL execution begins (`VBA-AX-3`). The payload is evidence input, not machine-readable authority.

### 9.2 Pre-execution self-checks

**`VBA-EX-2`.** Before execution, the derivation MUST reproduce, from its own output, the accepted §19.14 counts as corrected by Erratum 03: 43 relations (39 `r`, 4 `v`); 183 triggers (148 loop + 35 explicit); 346 constraints (39 PRIMARY KEY, 57 UNIQUE, 92 FOREIGN KEY, 158 CHECK); 28 explicit indexes (8 unique, 20 non-unique); 110 functions (45 `SECURITY DEFINER`, 65 `SECURITY INVOKER`; prefix counts `c_ s_ r_ p_ a_ w_ x_ i_ t_` = 9 / 2 / 1 / 6 / 1 / 25 / 1 / 32 / 33); 36 EXECUTE grants; 7 roles; 1 owner membership. Any disagreement blocks execution (`VBA-AX-6`).

### 9.3 Derivation, array by array

| Arrays | Derivation (sources) |
| :-- | :-- |
| `p_relation_names`, `p_relation_kinds` | one element per line matching `^CREATE TABLE m7\.` (kind `r`) or `^CREATE VIEW m7\.` (kind `v`) in F01 … F26; name = the identifier after `m7.` (S1 §19.14.1 rules over S2) |
| `p_object_relations`, `p_object_kinds`, `p_object_names`, `p_object_unique` | `TRIGGER`: every `CREATE TRIGGER <name> … ON m7.<rel>` statement, plus the triggers the §19.10.1 loop creates, obtained by applying the loop's own trigger-name and table template (as written in F10) to each row of its `VALUES` list; `CONSTRAINT`: every `CONSTRAINT <name>` clause declaring a PRIMARY KEY, UNIQUE, FOREIGN KEY or CHECK constraint (Erratum 03 `E03-04` domain), with relation = the enclosing `CREATE TABLE m7.<rel>` or the target of `ALTER TABLE m7.<rel> ADD CONSTRAINT`; `INDEX`: every `CREATE [UNIQUE] INDEX <name> ON m7.<rel>` (Erratum 03 `E03-05` domain), `isUnique` = presence of `UNIQUE`; `isUnique` is `NULL` for `TRIGGER` and `CONSTRAINT` (accepted `m7_expected_relation_object_unique_ck`) |
| `p_function_signatures` | for every `CREATE FUNCTION m7.<name>(<args>) RETURNS …` header in F01 … F26: `m7.<name>(<t1>,<t2>,…,<tk>)` — comma-separated without spaces, `m7.<name>()` when there are no arguments — where each `ti` is the declared type of argument `i` rendered by the table of §9.4; argument names are omitted and no header declares a default or a mode (verified over S2) |
| `p_function_definer` | `true` iff the header contains `SECURITY DEFINER`, `false` iff it contains `SECURITY INVOKER`; a header with neither or both blocks derivation |
| `p_function_proconfig` | the single admissible value pinned by the accepted `m7_expected_function_proconfig_ck`: `search_path=pg_catalog, pg_temp\|lock_timeout=5s` (with `\|` denoting the literal vertical bar); derivation blocks unless every header's `SET` clauses are exactly `SET search_path = pg_catalog, pg_temp SET lock_timeout = '5s'` |
| `p_function_source_sha256` | `'sha256:' ‖ lowercase-hex(SHA-256(utf8(body)))`, where `body` is the exact text between the dollar-quote opening delimiter ending the `AS $tag$` line (exclusive) and the matching closing `$tag$` (exclusive) — the string PostgreSQL stores as `prosrc`, over which the accepted verifier computes its source digest |
| `p_grant_signatures`, `p_grant_roles` | for every function whose name begins `p_`, `s_`, `r_`, `w_`, `a_` or `x_`: one element, grantee `pagamenos_m7_participant_rt`, `…_session_issuer_rt`, `…_privacy_request_rt`, `…_storage_worker_rt`, `…_deletion_authority_rt` or `…_capability_signer_rt` respectively (V1.1 §18.2 EXECUTE column; F26 grant mapping); no element for `c_`, `i_`, `t_` (RS-8) |
| `p_role_names`, `p_role_can_login`, `p_role_inherits`, `p_role_schema_usage` | the seven rows of the V1.1 §18.2 table; `canLogin` from its LOGIN column; `inheritsPrivileges` = `false` for the six login roles (§18.2, IA-03) and, for `pagamenos_m7_owner`, the `rolinherit` attribute declared for it by S3; `hasSchemaUsage` = `true` for the six login roles (§18.2 "Schema USAGE" `m7`) and `false` for `pagamenos_m7_owner`, whose rights on schema `m7` are those of its owner and which the accepted verifier excludes from the schema-ACL comparison (V1.1 §19.13.2) |
| `p_member_roles`, `p_member_names` | exactly one element: role `pagamenos_m7_owner`, member = the migration role name from S3 (IA-05) |

The pre-existing application runtime role(s) (`legacyRuntimeRoles`, §18.2, §23.4) have no array; for T-09, S03 MAY provision a disposable legacy role identified in `F`, which is not loaded into the expectation set.

### 9.4 Signature rendering table

The rendering reproduces `regprocedure` text as the accepted verifier produces it under its own `SET search_path = pg_catalog, pg_temp`, in which schema `m7` is not on the path. It is closed over the declared argument types of the accepted F01 … F26:

| Declared type | Rendering |
| :-- | :-- |
| `timestamptz` | `timestamp with time zone` |
| `"char"[]` | `"char"[]` |
| `bigint`, `boolean`, `boolean[]`, `bytea`, `date`, `integer`, `interval`, `jsonb`, `name[]`, `text`, `text[]`, `uuid` | unchanged |
| `m7."<EnumType>"`, `m7."<EnumType>"[]` (enumerated types of §19.3) | unchanged |
| `m7.<table>` (row types of §19.4–§19.9) | unchanged |

A declared argument type not listed here blocks derivation of that function's signature and of every item that depends on it (`VBA-AX-6`).

---

## 10. `VBA-TX` — transaction, commit and session rules

| Rule | Evidence obtainable | Conditions |
| :-- | :-- | :-- |
| **`VBA-TX-1` rollback-only** | failing-installation cases (T-81 variants, T-82 with the Erratum 03 `E03-09` setup, fault injections), the `VBA-OR-6` control run, and inspections performed inside a transaction that does not commit | every inspection is read-only or rolled back to a savepoint; no inspection statement is executed between the first bootstrap call and the end of `F26-suffix` |
| **`VBA-TX-2` committed disposable database** | the committed result of `VBA-OR-3`; required for cases that need independent sessions or a verifier call in another session: T-01 … T-09, T-74 … T-80, T-78 and T-130 … T-137b, and positive paths | allowed **only** when legitimate multi-session verification requires it; the database is disposable (`VBA-TX-5`); the commit is **not** LC-1, not a deployment, not an authority publication |
| **`VBA-TX-3` injections** | the §25.17 and T-78 families | every injection is performed by an owner-class actor (V1.1 §5); each case starts from a verifier result of zero rows established in that case, and either reverses its injection and re-establishes zero rows before the next case or runs in a fresh disposable database; no case relies on an unverified restoration. An injection that requires a privilege no conforming non-superuser owner-class role holds (for example `ADMIN OPTION` on `pagamenos_m7_owner` for T-133, or role-attribute changes for T-137b) MAY be performed by the disposable cluster's bootstrap administrator and is recorded as such; the installation itself is never executed by a superuser |
| **`VBA-TX-4` sessions** | role-scoped cases | each role connects with its own credentials (V1.1 §25.1 VC-3); `SET ROLE` does not substitute for a role's own connection |
| **`VBA-TX-5` destruction** | teardown evidence | after evidence collection the disposable cluster (or every disposable database and the roles provisioned for it) is destroyed; no data directory, database, role or process of the run survives |
| **`VBA-TX-6` isolation** | every run | a fresh cluster or database per run; no reuse of any database, role state or result from an earlier run |

---

## 11. `VBA-SC` — positive and negative verification scope

**`VBA-SC-1` (authorized uses).** With an `M7-S03-VBCP` active in a disposable database, S03 MAY execute, under their accepted definitions as read with Errata 01–03:

1. the installation's final fail-closed assertion (IA-06, IA-09 … IA-13 through `m7.i_catalog_violations`) with **zero** violations, and the positive IA-14 consequence of the exact grant set;
2. exact-set catalog verification: `m7.w_verify_control_plane_catalog_v1(fixtureDigest)` returning **zero** rows, called by `pagamenos_m7_storage_worker_rt`;
3. T-01 … T-09 (V1.1 §25.2, T-05 as amended by `E03-08`), T-74 … T-80 (§25.9), and T-130 … T-137b (§25.17, T-137 as amended by `E03-07`);
4. T-81 and T-82 (T-82 as amended by `E03-09`), which need no bootstrap;
5. positive paths of `p_*`, `s_*`, `r_*`, `a_*` and `w_*` functions that are not **STORE**, **2STORE** or **SIGN** cases, with `fixtureDigest` as the expected digest.

**`VBA-SC-2` (semantics unchanged).** No test identifier, setup, actor, operation or expected result is changed by this amendment. A failure is a failure; no failure is waived, downgraded or re-labelled because the control plane is a verification fixture.

**`VBA-SC-3` (outside the fixture's reach).** STORE, 2STORE and SIGN cases (VC-2, VC-8), the PostgreSQL 14 sub-case of T-81 without a PostgreSQL 14 binary, and every case requiring a real object store, a real signer or a real deployment are **NOT EXECUTED** by an `M7-S03-VBCP` run and MUST NOT be reported as PASS. Local S03 evidence does not discharge VC-1's hosted required-check surface or the §24.3 CI additions.

**`VBA-SC-4` (fixture data in accepted relations).** Rows needed in accepted A1/A2 relations for positive paths MAY be created only in the disposable database, only through operations the accepted A1/A2 schema admits, without disabling, bypassing or altering any trigger, constraint or guard. A case that cannot be set up that way is BLOCKED / NOT EXECUTED.

**`VBA-SC-5` (same checks for the fixture).** The `M7-S03-VBCP` rows are subject to every check the accepted text applies to an active control plane: IA-13 coherence, the versioned-identity rules of V1.1 §23.8, DL-4 and XF-DL-1, and `m7.i_assert_control_plane(fixtureDigest)` succeeding while any other well-formed digest raises `55000 M7_CONTROL_PLANE_MISMATCH`.

---

## 12. `VBA-EV` — required S03 evidence

Downstream S03 evidence MUST include at least:

| Group | Required content |
| :-- | :-- |
| **Provisioning** | PostgreSQL `version()` and `server_version_num`; the migration role name; `session_user` and `current_user` at: connection, immediately before F01, immediately after F01's `SET LOCAL ROLE`, immediately before the first bootstrap call, and immediately before `F26-suffix`; the `pg_auth_members` row(s) for `pagamenos_m7_owner` with `inherit_option`, `set_option`, `admin_option` (PostgreSQL ≥ 16) or the member's `rolinherit` (PostgreSQL 15); the `VBA-PV-1` item 4 predicate values; `rolsuper = false` for the migration role; the identity of any bootstrap-administrator injection (`VBA-TX-3`) |
| **Bootstrap** | `manifestVersion` and the other `VBA-FX-2` identities; `fixtureDigest`; `expectationPayloadSha256`; the `sources` of `F`; proof that `E` and `F` were derived and digested before the first connection (`VBA-AX-3`) and re-derived identically after teardown; the class of every argument of the seven calls (`VBA-FX-8`); the return value or SQLSTATE of each of the seven calls, including the relation count returned by `m7.c_load_catalog_expectations_v1` and the installation id returned by activation; for the runtime chaining value, its producer, the returned value, the consuming parameter, the value actually sent and the `VBA-FX-9` checks; every recorded value labelled with its `VBA-AX-7` domain |
| **Execution** | the Git blob and SHA-256 of each of F01 … F26 and of `EXTRACTION_INDEX.json`; the `VBA-OR-2` partition check with prefix and suffix SHA-256; the exact execution order; the final assertion's outcome; the `VBA-OR-6` control-run outcome and residue; for every executed verification item: identifier, normative clause, actor, session, operation, expected result, observed result and SQLSTATE; the verifier's zero-row baseline and each injection's delta; the statement of every item BLOCKED or NOT EXECUTED with its reason |
| **Teardown** | destruction of the disposable cluster or databases and roles; proof that no M7 object, fixture row or process survives; an explicit statement that no manifest, authority artifact, selector value or deployment state was produced |

Evidence is not authority and satisfies no MA, IMP or Gate-2 item by itself.

---

## 13. S01 consequence

```
S01 REGENERATION REQUIRED : NO
```

- F01 … F26 remain byte-identical; no normative fence occurrence of V1.1, E01, E02 or E03 changes.
- No accepted M7-S01 fragment pin changes, including the Erratum 03 pins of §2.3.
- `EXTRACTION_INDEX.json`, `INVENTORY.json`, `MD_MG_PRECONDITIONS.json` and every correction record remain valid.
- The orchestration of §8 and the bootstrap of §4 live in S03 harness code, never in S01 artifacts.

---

## 14. S02 consequence

| Layer | Statement |
| :-- | :-- |
| **Authority / provisioning invariant** | `VBA-PV-1` (§3.2) |
| **Test-harness realization (M7-S02)** | M7-S02 remains accepted and integrated for its own scope (role provisioning checks, accepted-migration replay, A1/A2 regression; it installs no M7). As instantiated at §2.3 on PostgreSQL 18.4, its template grants `pagamenos_m7_owner` to a `NOINHERIT` migration role without an explicit option, which yields `inherit_option = false` (RA). That provisioning **does not satisfy `VBA-PV-1`** and is **not** a conforming provisioning for executing the M7 installation script |
| **Production provisioning realization** | the separately governed production provisioning step (V1.1 RS-6, §18.4) MUST satisfy `VBA-PV-1`; this amendment asserts no production realization beyond the version table of §3.4 and verifies none; the manifest's `database.roles[]` field is unchanged |

**`VBA-S02-1` — downstream work package required.** An **M7-S02 provisioning compatibility micro-patch** is required before any M7-S03 execution that installs the M7 script. Its scope is limited to:

1. the owner-membership grant of the provisioning template realizing `VBA-PV-3` for the PostgreSQL version the harness pins (≥ 16: `WITH INHERIT TRUE, SET TRUE`);
2. extending the harness's role verification to assert the membership edge options and the `VBA-PV-1` item 4 predicate;
3. no other change to roles, attributes, credentials, migrations, suites or harness semantics.

It is a separately authorized, authored, independently audited and integrated work package. M7-S03 MUST NOT realize `VBA-PV-1` by an ad-hoc re-grant, role alteration or other provisioning action of its own outside that provisioning step.

---

## 15. Lifecycle consequence

This amendment advances no lifecycle state. At the baseline, and unchanged by this candidate:

```
REVIEWED PRODUCTION MANIFEST            : NOT YET AUTHORED / NOT YET ACTIVE
LC-1  IMPLEMENTATION CANDIDATE COMPLETION : NOT OCCURRED
LC-2 … LC-7                             : NOT OCCURRED
M7 GATE 1                               : AUTHORIZED (implementation work only)
M7 GATE 2                               : OPEN / NOT SATISFIED
IMP-01 … IMP-22 / MA-1 … MA-18          : OPEN
§24.3 CI ADDITIONS                      : OPEN
MACHINE-READABLE AUTHORITY              : NOT PUBLISHED
PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA   : NOT ASSERTED
SELECTOR                                : NOT ASSERTED / NOT ROTATED
DEPLOYMENT / WAVE 0                     : NOT AUTHORIZED
M7-S01 (ERRATUM 03 REGENERATION)        : ACCEPTED + INTEGRATED (implementation staging; not changed)
M7-S02                                  : ACCEPTED + INTEGRATED — UNCHANGED BY THIS DOCUMENT
M7-S03                                  : BLOCKED
```

The purpose of this amendment is to make S03 verifiable **before** LC-1, not to simulate LC-1, LC-3, LC-4 or LC-5.

---

## 16. Explicit non-authorizations

This document, as a candidate and after any acceptance, does **not**:

1. authorize M7-S03 to resume — resumption additionally requires independent acceptance of this amendment, its protected integration and root registration, synchronization of implementation staging, acceptance and integration of the `VBA-S02-1` work package, and a separate implementation-line authorization;
2. modify, regenerate or authorize changes to M7-S01 or to any normative SQL;
3. modify M7-S02, or authorize its micro-patch beyond identifying it;
4. author, accept, publish or activate a production control-plane manifest, or fix any production manifest value;
5. perform or authorize LC-1 … LC-7, Gate-2 acceptance, machine-readable authority publication or selector rotation;
6. assert, infer, default or derive `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA`;
7. authorize deployment, Wave 0 or runtime use;
8. change IA-06's domain, the constraint domain, the explicit-index domain, the default-privilege statement, T-05, T-82, T-137, or the F01, F11 or F24 pins (Erratum 03, unchanged);
9. change any consent, A1, A2, CCA, B or C semantics;
10. waive VC-1, VC-2, VC-8, any STORE, 2STORE or SIGN case, or any real-provider or real-deployment verification.

---

## 17. Acceptance criteria for the independent auditor

| # | Criterion |
| :-- | :-- |
| VBA-AC-1 | the candidate commit adds exactly one path, this file; its only parent is `d51393bd60c9b9b0ccd194650314312133f14ca3`; the six blobs of §2.2 are unchanged; no S01, S02, runtime, migration, workflow, `scripts-trusted/` or `authority/` path changes |
| VBA-AC-2 | D03-04 has a precise non-SQL provisioning rule (`VBA-PV-1`) that preserves `session_user`, IA-02 … IA-05, runtime `NOINHERIT`, owner `NOLOGIN`, no superuser installation, the F01 order and every SQL byte |
| VBA-AC-3 | the invariant is separated from its realizations; the PostgreSQL ≥ 16 realization is stated as canonical with 18.4-only empirical support; the PostgreSQL 15 realization is stated as unverified; no cross-version parity is claimed |
| VBA-AC-4 | `M7-S03-VBCP` is defined as a verification fixture confined to disposable S03 environments, created only through the seven accepted calls, and bounded by `VBA-LB-1` … `VBA-LB-3` |
| VBA-AC-5 | expected catalog truth cannot be learned from actual catalog state: `VBA-AX-1` … `VBA-AX-6` restrict expected values to pre-execution sources, require structural separation, and block non-derivable items |
| VBA-AC-6 | every expectation array has a derivation from S1 … S3 (§9.3), the signature rendering is closed over the accepted argument types (§9.4), and the pre-execution self-checks reproduce the accepted §19.14 counts |
| VBA-AC-7 | fixture identity is deterministic, positively VBCP-marked (marker token in every VBCP identity, non-manifest schema), domain-separated from production manifest digests (`VBA-FX-6`), imposes no constraint on production identities (`VBA-FX-1`), and depends on no timestamp, randomness, Git `HEAD` or selector value |
| VBA-AC-8 | F26 stays byte-identical; the partition and orchestration rules (`VBA-OR-1` … `VBA-OR-6`) execute every accepted byte once, in order, in one transaction, and explain why this is orchestration and not modification |
| VBA-AC-9 | transaction, commit and session rules distinguish rollback-only evidence, committed disposable databases and separate sessions, and require destruction |
| VBA-AC-10 | positive and negative scope covers the families blocked by D03-12 without changing any T-ID semantics or waiving any failure, and excludes STORE, 2STORE and SIGN |
| VBA-AC-11 | the required evidence covers provisioning, bootstrap, execution and teardown (§12) |
| VBA-AC-12 | S01 regeneration is not required; the S02 consequence identifies the downstream micro-patch and does not declare the instantiated M7-S02 provisioning conforming |
| VBA-AC-13 | the lifecycle block and the non-authorizations of §15–§16 hold; no manifest, machine authority, selector value, deployment or Wave-0 authorization is produced; the document does not self-accept |
| VBA-AC-14 | each of the 70 declared parameters of the seven calls has exactly one class (`VBA-FX-8`: 48 `FIXED`, 21 `PRE_DERIVED`, 1 `RUNTIME_BINDING`); `F` contains no runtime-returned value; `E`, `expectationPayloadSha256`, `F` and `fixtureDigest` are computable and recorded before the first database connection without digest recursion (`VBA-FX-5`); runtime chaining values and database observations never determine expected truth (`VBA-AX-7`) |

---

## 18. Explicit status

```
PAGAMENOS_M7_S03_VERIFICATION_BOOTSTRAP_AMENDMENT_01 : AUTHOR CANDIDATE — NOT YET AUTHORITATIVE
INDEPENDENT ACCEPTANCE                   : NOT PERFORMED
PROTECTED INTEGRATION                    : NOT PERFORMED
ROOT AUTHORITY REGISTRATION              : NOT PERFORMED
M7 CONFORMANCE TARGET                    : M7 V1.1 + ACCEPTED ERRATUM 01 + ACCEPTED ERRATUM 02 + ACCEPTED ERRATUM 03 (unchanged)

M7 SPECIFICATION (V1.1)                  : ACCEPTED — BYTES NOT EDITED
M7 ERRATA 01 / 02 / 03                   : ACCEPTED + PROTECTED-INTEGRATED — BYTES NOT EDITED
CCA                                      : ACCEPTED + PROTECTED-INTEGRATED — BYTES NOT EDITED
NORMATIVE SQL CHANGED                    : NO
M7-S01 REGENERATION                      : NOT REQUIRED
M7-S02                                   : UNCHANGED — COMPATIBILITY MICRO-PATCH REQUIRED DOWNSTREAM (VBA-S02-1)
M7-S03                                   : BLOCKED — RESUME NOT AUTHORIZED
M7-S03-VBCP                              : DEFINED BY THIS CANDIDATE — NOT INSTANTIATED
PRODUCTION CONTROL-PLANE MANIFEST        : NOT AUTHORED / NOT ACCEPTED / NOT PUBLISHED
LC-1 … LC-7                              : NOT OCCURRED
M7 GATE 2                                : OPEN / NOT SATISFIED
MACHINE-READABLE AUTHORITY               : UNCHANGED — NOT PUBLISHED
PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA    : NOT ASSERTED
SELECTOR ROTATION                        : NOT PERFORMED
DEPLOYMENT / WAVE 0                      : NOT AUTHORIZED
PAGAMENOS_SPEC_AUTHORITY.md              : NOT MODIFIED
RUNTIME / SCHEMA / MIGRATIONS / TESTS / WORKFLOWS / scripts-trusted / authority / S01 / S02 : NOT MODIFIED
```

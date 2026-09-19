# PAGAMENOS — M7 — OUTCOME + EVIDENCE — EFFECTIVE SPECIFICATION V1.1 — ERRATUM 05 (S03-DISCOVERED CLAIM ORDER, DELETION-COMPLETION LATENESS AND T-03 CONTRACT DEFECTS)

```
AUTHOR CANDIDATE — NOT YET AUTHORITATIVE
NOT SELF-ACCEPTED — AWAITING INDEPENDENT AUDIT
M7-S03 REMAINS BLOCKED

ERRATUM KIND                 : SPECIFICATION ERRATUM (narrow, occurrence-scoped; two SQL executability defects, one verification-contract defect)
DEFECT CLASSES               : E05-A — upload-claim / write-grant state-order contradiction                    (E05-01)
                               E05-B — deletion-completion lateness derivation contradiction                 (E05-02, E05-03)
                               E05-C — T-03 privilege-order / expected-result contradiction                  (E05-04)
ACCEPTED V1.1 BYTES EDITED   : NO
ACCEPTED ERRATA 01–04 EDITED : NO
CCA / VBA-01 / VFC-01 EDITED : NO
ROOT REGISTER EDITED         : NO
SQL OCCURRENCES CORRECTED    : 3 (F18: 1; F22: 2); 24 fragments byte-unaffected
PROSE OCCURRENCES CORRECTED  : 1 (V1.1 §25.2 row T-03)
V1.1 LINES SUPERSEDED        : 25 (7038–7057; 7892, 7893; 8150, 8151; 9412); LINES ADDED / REMOVED : 0 / 0
NEW TABLES / ENUMS / VIEWS / FUNCTIONS / SIGNATURES / CONSTRAINTS / INDEXES / TRIGGERS / GRANTS / ROLES : 0
REMOVED OR RENAMED OBJECTS   : 0
T-IDs ADDED / REMOVED        : 0 / 0
TRIGGER, CONSTRAINT, LOCK, TRANSACTION, ROLE, CONTROL-PLANE, MANIFEST, LIFECYCLE SEMANTICS CHANGED : 0
MANIFEST AUTHORED            : NO
SELECTOR ROTATION            : NOT PERFORMED
```

**Nature.** A documentation-only erratum candidate against the independently accepted M7 Outcome/Evidence Effective Specification V1.1, read together with the accepted, protected-integrated and root-registered Errata 01, 02, 03 and 04. It corrects exactly four occurrences, grouped into three independently auditable defect classes:

- **E05-A** (`E05-01`) — the accepted `m7.w_claim_upload_intent_v1` (§19.12.1, fragment F18) inserts the generation write grant **before** it advances the upload intent to `PROCESSING` at the new epoch, while the accepted BEFORE INSERT trigger `m7.t_write_grant_coherence` (§19.10, F09) requires the intent to be `PROCESSING` **at** that epoch. Every claim — fresh or reclaim — is therefore unsatisfiable. The correction re-orders two statements of that function body; no statement is added, removed or altered.
- **E05-B** (`E05-02`, `E05-03`) — the accepted row mechanisms `m7.w_execute_row_redaction_v1` and `m7.w_execute_row_purge_v1` (§19.12.5, F22) insert a `m7.m7_deletion_execution_completion` row without its two `NOT NULL` lateness flags, which the accepted `m7.t_completion_coherence` (F09) verifies against the execution's own bound deadlines. No `ROW_REDACT` or `ROW_PURGE` execution can ever complete. The correction supplies, inside the two function bodies, the two derived expressions the accepted effect-confirmation path (§19.12.4, F21) already supplies.
- **E05-C** (`E05-04`) — the accepted §25.2 verification row **T-03** expects `restrict_violation M7_IMMUTABLE` for an `UPDATE` by the participant, but the accepted privilege model grants no login role any table privilege (M7-I01), so PostgreSQL refuses the participant with `42501` before any trigger runs. The correction states the result for each actor separately; neither M7-I01 nor M7-I23 is weakened.

This erratum changes no runtime code, Prisma schema, migration, test, workflow, `scripts-trusted/` file, `authority/` artifact, S01 extraction artifact, repository setting or external variable. It edits neither V1.1, nor Errata 01–04, nor the CCA, VBA-01 or VFC-01, nor the root register.

**Conventions.** MUST / MUST NOT / MAY are normative. "V1.1 §n" and "V1.1 line n" = `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1.md` at the exact accepted bytes of §1.2 (1-based line numbers, LF-separated). "Erratum 01" … "Erratum 04" (E01 … E04) = the accepted files of §1.2. "VBA-01" = `PAGAMENOS_M7_S03_VERIFICATION_BOOTSTRAP_AMENDMENT_01.md`; "VFC-01" = `PAGAMENOS_M7_VBA_S02_1_POSTGRESQL_VERSION_FLOOR_CLARIFICATION_01.md`; "CCA" = `PAGAMENOS_A1_A2_M7_CONSENT_COMPATIBILITY_AMENDMENT_01.md`; "Register §n" = `PAGAMENOS_SPEC_AUTHORITY.md` at the baseline of §1.1. "Fragment F01 … F26" = the 26 normative SQL fence bodies of V1.1 §19.2–§19.13 in ascending source order, as in Errata 02–04. "Effective F*nn*" = the fragment with every accepted Erratum 02, 03 and 04 correction applied, i.e. the bytes of the accepted E04 M7-S01 extraction of §1.3. No accepted erratum amends F18 or F22, so for them "fragment line" = V1.1 line − 6952 (F18) and V1.1 line − 7795 (F22). Identifiers introduced here carry the prefix `E05-`; full-text search of the accepted V1.1, Errata 01–04, CCA, VBA-01, VFC-01 and register bytes returns zero matches for `E05-`.

---

## 1. Exact authority baseline

### 1.1 Protected authority tip

| Item | Value |
| :-- | :-- |
| Repository | `PieroAllccaco19/PagaMenos` |
| Protected surface | `origin/m3.5b-b-integration` |
| Baseline commit | `797c841e1cac110e693f2a878c9628f7d5f5a183` (PR #40 merge, *"m7-e04-root-authority-sync"*) |
| Baseline tree | `7240ad2c225fc54e9818a2bb5df881fd62a0ebdf` |
| Parents, in order | 1. `88812d107a9af0bcb6387c1fef6c22ba498d8a61` — 2. `ca77f283054f7e0ed84fade335889bb45d895e29` |
| Lineage | this erratum candidate is a single non-merge commit whose only parent is the baseline commit, adding exactly one path: this file |

### 1.2 Immutable accepted artifacts — exact identities (not edited)

| Artifact | Git blob at the baseline | SHA-256 | Lines / bytes |
| :-- | :-- | :-- | :-- |
| `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1.md` (V1.1) | `06e103b0d5e8cfcbb96ab21134d5605b0aae9b26` | `457f51778fb5d5890b3e3478376e413072f15aef7da88125b5e78963f49394bd` | 10 626 / 1 143 725 |
| `…_ERRATUM_01.md` (E01) | `15ee22090d3e37b6a63dd25914f8abb0f4fa9d4b` | `f381cb015adadc7a22463060da7ff55e8711b8ab13879c60f93cabf53eb863e8` | 604 / 82 027 |
| `…_ERRATUM_02.md` (E02) | `a0e6fa6720f23ac08485ab7cb696ab9ba4b7e83f` | `b7b3440ad04181356770f243a6e2870e004aba604d2a62afdefd5330c85c170f` | 515 / 44 295 |
| `…_ERRATUM_03.md` (E03) | `8ba87adc9b87cee749c214d9326b0aa750ceabf0` | `b4debcb5a02e777e780e14002c5e9cdbb90f2140f5b7516592b8e05e67366160` | 779 / 72 201 |
| `…_ERRATUM_04.md` (E04) | `c839db3948608c875c984a73e366c039c0a5e2dd` | `3b07d30958aa5c7783fe7458236b8170d1f5a47c0f765e7aa95e5ae68bab00f4` | 660 / 60 164 |
| `PAGAMENOS_A1_A2_M7_CONSENT_COMPATIBILITY_AMENDMENT_01.md` (CCA) | `2f0ff3c886c5ac9b1cbba797404e9024c0b83732` | `3a6003494f4817907401a9afda5b9d9a1647ade5ff9196f2aee2ba3b1b2ca1ad` | 1 091 / 58 471 |
| `PAGAMENOS_M7_S03_VERIFICATION_BOOTSTRAP_AMENDMENT_01.md` (VBA-01) | `d10d59cac8f0d77304b88c6df0e06b89d710141d` | `dca045b62b245064926c1d4cb61c53f4f4f4110c22bcbf917a159e49ce3d1033` | 559 / 63 998 |
| `PAGAMENOS_M7_VBA_S02_1_POSTGRESQL_VERSION_FLOOR_CLARIFICATION_01.md` (VFC-01) | `7613c8a669bcaee9418a0e5f207192fdb5c45b75` | `ae8dd03b57e199177610e3b40c221542d41aa1f78265b4dc5eee2d967c2ba8e7` | 476 / 28 501 |
| `PAGAMENOS_SPEC_AUTHORITY.md` (root register) | `4906f9629cd1af8cdde6ff02e4037e219203f5b2` | `2a99d86ee27509cb470c8669fbfb498ffe43fce49df423c106fdf9208cf9713a` | 3 521 / 421 949 |

The effective M7 normative-SQL conformance target at the baseline is **M7 V1.1 + accepted Erratum 01 + accepted Erratum 02 + accepted Erratum 03 + accepted Erratum 04** (Register §18.2 Layer A). The M7-S03 verification reading additionally applies **accepted VBA-01** and **accepted VFC-01 within its scoped clarification** (Register §18.2 Layer B). This candidate controls nothing until independently accepted (§3 item 9).

### 1.3 Implementation-line artifacts consulted (not authority; not edited)

| Item | Value |
| :-- | :-- |
| Implementation staging | `origin/m7-v1.1-implementation`, tip `0be3a0b2c11b465831479806e1d4b0e11a9883c2` (PR #42 merge), tree `1ffe5fc73e9ec36a0824deb9ab89e34d5ce46a1a`; parents 1. `47c6dfe8db5b63446ef629cef94681e05fb0f659` (PR #41, E04 authority → staging sync) — 2. `2a568dfeec9da8ee97bffcaa2857b19b5fc94cff` (*feat(m7): regenerate S01 extraction for Erratum 04*) |
| M7-S01 extraction consulted | `prisma/m7/normative/` at that tip; `EXTRACTION_INDEX.json` Git blob `000ec86bd7480f4bb87838161de2cb09f296eb7f`, SHA-256 `60809e57a0607a821ec0671065e9e42246c2a61f7edd69ff15d7fbb36c6d8468`, conformance target *M7 V1.1 + accepted Errata 01–04*; each of the 26 files re-verified against its pinned `sha256` |
| F09 (`sql/09_19.10_trigger-functions.sql`) | body V1.1 lines 3915–5038; 1 124 lines; 64 833 bytes; SHA-256 `c2bb8b38feaf6cbb1559ae0c1396d34344094008a75e81f7406f9a239225c75c` (E02 corrections only) |
| F18 (`sql/18_19.12.1_upload-pipeline.sql`) | body V1.1 lines 6953–7322; 370 lines; 23 867 bytes; SHA-256 `8d88295459c55853396637e26fc350a00cbfd8a4118be11c2e46396bffae0a45`; Git blob `d6898413e01a71e358f597cf90675f4faecf223e`; no erratum correction |
| F21 (`sql/21_19.12.4_effect-confirmation.sql`) | body V1.1 lines 7643–7788; 146 lines; 9 321 bytes; SHA-256 `163d2c7af596a285e3d21378ea9849b7c79b18d537d6c76b01802a8b328bb8e2`; no erratum correction |
| F22 (`sql/22_19.12.5_row-mechanisms.sql`) | body V1.1 lines 7796–8157; 362 lines; 26 982 bytes; SHA-256 `cce8a66a8155c2dbee904ee21e87c97093ceaa15bf8da5b5aa32114009b97999`; Git blob `66bd4778bc4d49bd960289961c6773e6a342e97a`; no erratum correction |
| F18 / F22 fidelity | each file is byte-identical to its V1.1 body lines joined by LF with a final LF (re-verified by this author) |

These artifacts are cited only to locate the occurrences and to state informative future pins (§10). This erratum asserts no register status for any implementation-line slice.

### 1.4 Provenance of the triggering evidence (not authority)

A fresh, separately authorized M7-S03 resume on implementation staging `0be3a0b…`, against PostgreSQL 18.4, executed the full E04-conforming install with the VBA-01 `M7-S03-VBCP` bootstrap and then ran the verification families. Recorded as **non-authoritative provenance** only:

```
STAGING BASELINE                      : 0be3a0b2c11b465831479806e1d4b0e11a9883c2
POSTGRESQL                            : 18.4 (server_version_num 180004)
E04 BOOTSTRAP SEQUENCE                : EXECUTABLE — installation committed as the migration role
HISTORICAL 42883 (E04-MU)             : ABSENT
VBCP CALL 6 (c_load_catalog_expectations_v1) : RETURNED 43
D03-12 FOUR PREDICATES                : DEMONSTRATED DIAGNOSTICALLY
THEN ENCOUNTERED                      : the three defects of §2.1
S03 CANDIDATE                         : NONE
S03 ACCEPTED EVIDENCE                 : NONE
```

The S03 run observed `23000 M7_COHERENCE: a write grant envelope must be its own generation's operation, …` on `w_claim_upload_intent_v1`; `23000 M7_DELETION: completion lateness flags do not match the execution's bound deadlines` on both row mechanisms; and `42501 permission denied for table m7_outcome_assertion` for the T-03 participant sub-case. No normative SQL was patched; each failing call rolled back; no candidate commit was created; the S03 worktree remains uncommitted diagnostic evidence. **That execution is triggering evidence, not authority, and is not incorporated.** Every defect below is proved from the accepted bytes of §1.2 and PostgreSQL semantics, and every executable claim was re-checked by this author on fresh disposable PostgreSQL 18.4 clusters against scratch copies of the fragments outside any repository (§5.5, §6.5, §7.4).

---

## 2. Scope

### 2.1 In scope — three defect classes

| Class | Subject | Clauses | Occurrences |
| :-- | :-- | :-- | :-- |
| **E05-A** | upload-claim / write-grant state-order contradiction: a statement order inside one accepted function that no accepted trigger set admits | V1.1 §19.12.1 `m7.w_claim_upload_intent_v1` (F18) | `E05-01` |
| **E05-B** | deletion-completion lateness derivation contradiction: a completion `INSERT` that omits two `NOT NULL` columns the accepted trigger verifies | V1.1 §19.12.5 `m7.w_execute_row_redaction_v1`, `m7.w_execute_row_purge_v1` (F22) | `E05-02`, `E05-03` |
| **E05-C** | T-03 privilege-order / expected-result contradiction: a verification row whose expected result PostgreSQL cannot produce for one of its two actors | V1.1 §25.2 row T-03 | `E05-04` |

The classes are independent: no occurrence belongs to two classes, and each class is proved, corrected and verified on its own (§5, §6, §7).

### 2.2 Explicitly out of scope

- any change of table, column, enumerated type, view, function signature, trigger, trigger function, constraint, index, role, grant category, lock, lock order, transaction boundary, retention, identity, digest input, manifest field, MA/IMP gate, T-ID, lifecycle event or Gate-2 requirement;
- any SQL or prose outside the four occurrences of §4 — in particular `m7.t_write_grant_coherence`, `m7.t_generation_coherence`, `m7.t_upload_intent_guard`, `m7.t_completion_coherence` (all F09), `m7.w_record_effect_attempt_v1` (F21) and every other statement of the three corrected functions;
- the VBA-01 F26-prefix byte-count observation (§12.1) and the DL-7 wording observation (§12.2): both are dispositioned without a normative delta;
- the S01 regeneration, the root registration, the authority → staging synchronization and any S03 work (§10, §11);
- CCA, VBA-01 and VFC-01 text, `authority/`, the selector, the manifest and the root register.

---

## 3. Reading rule and occurrence-scoped precedence

1. **Accepted bytes are never edited.** V1.1 and Errata 01–04 remain authoritative for every byte and clause except the four occurrences of §4.
2. **Supersession is occurrence-scoped.** For each `E05-nn`, the "After" block replaces exactly its quoted "Before" block at exactly the named V1.1 lines. Every "After" block has the same number of lines as its "Before" block. No line is added or removed, so every V1.1 line number, every fence span and every fragment line count is unchanged.
3. **Uniqueness.** Each "Before" block occurs exactly once in the accepted V1.1 bytes and exactly once in its effective fragment; no "After" block occurs in V1.1 (verified; §4). Each replacement is therefore unambiguous.
4. **Erratum 01, 02 and 04 are unaffected; Erratum 03 is a precedent only** (§8). No `E05` line lies in, or is cited by, a clause any accepted erratum amends. E01 MD-*/MG-* apply unchanged to migration bytes containing the corrections. No "Before" or "After" block contains a manifest digest, the E01 placeholder `P` or a `sha256:` literal.
5. **Byte-identity requirements of earlier regenerations.** E02 §9 item 5, E03 §10 item 4 and E04 §11 item 4 require F18 and F22 to remain byte-identical under **their** regenerations. Those requirements governed their regeneration scopes and were satisfied. Erratum 05 is a **later, occurrence-scoped correction**: for **exactly** the V1.1 lines of `E05-01` … `E05-03` it takes precedence; for every other byte of F18 and F22, and for every byte of the other 24 fragments, those byte-identity requirements continue to hold.
6. **No broader doctrine.** This erratum introduces no general amendment rule and re-opens no neighbouring statement, function, trigger, invariant, count, proof, lock profile or test.
7. **VBA-01 and VFC-01 are unaffected.** Neither is an erratum and neither is amended. The F18 / F22 byte changes and the S01 regeneration they require are consequences of this erratum, not of VBA-01 or VFC-01.
8. **Conflict.** If this erratum and the accepted bytes appear to conflict outside the enumerated occurrences, the accepted bytes (read with Errata 01–04) control, and the conflict is an erratum defect to be reported, not resolved by interpretation.
9. **Effective reading after acceptance.** Once this erratum is independently accepted, protected-integrated and registered in the root register, the M7 normative-SQL conformance target becomes **M7 V1.1 + accepted Erratum 01 + accepted Erratum 02 + accepted Erratum 03 + accepted Erratum 04 + accepted Erratum 05**, and the §25.2 T-03 row reads as `E05-04`. Until then it remains **M7 V1.1 + accepted Errata 01–04**, and this candidate controls nothing.

---

## 4. Occurrence map

| ID | Class | Clause | V1.1 lines quoted | V1.1 lines changed | Lines added / removed | Fragment (fragment lines) | Before block SHA-256 → After block SHA-256 | Δ bytes |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | --: |
| `E05-01` | A | §19.12.1 `m7.w_claim_upload_intent_v1` | 7038–7057 | 7038–7057 (block re-ordered) | 0 / 0 | F18 (86–105) | `36754783bd38f57a…` → `fc88bb989b8603f2…` | 0 |
| `E05-02` | B | §19.12.5 `m7.w_execute_row_redaction_v1` | 7891–7893 | 7892, 7893 | 0 / 0 | F22 (96–98) | `4deb571a7cbb88d0…` → `f81d34691a6434ce…` | +110 |
| `E05-03` | B | §19.12.5 `m7.w_execute_row_purge_v1` | 8149–8151 | 8150, 8151 | 0 / 0 | F22 (354–356) | `d37b4a6ba9a26bd8…` → `18ffa8d79adb8402…` | +110 |
| `E05-04` | C | §25.2 row T-03 | 9412 | 9412 | 0 / 0 | — (prose only) | `f9d35169e9d4305f…` → `ff1fc30fc9b978ee…` | +518 |

V1.1 lines superseded, in ascending order: **7038–7057** (20), **7892, 7893, 8150, 8151** (4), **9412** (1) — 25 lines. Block SHA-256 = SHA-256 of the quoted lines joined by LF, without a final LF; line SHA-256 = SHA-256 of one line without its LF. Full values are given in §5.3, §6.3 and §7.2.

---

## 5. E05-A — upload-claim / write-grant state-order contradiction (`E05-01`)

### 5.1 Static proof from the accepted bytes

`m7.w_claim_upload_intent_v1` (V1.1 lines 6976–7069) performs, after its locks and checks, three writes in this order:

| Step | V1.1 lines | Statement |
| :-- | :-- | :-- |
| **G** | 7033–7037 | `INSERT INTO m7.m7_canonical_generation (…) VALUES (v_i."id", v_epoch, …)` — `v_epoch = v_i."leaseEpoch" + 1` (line 7028) |
| **W** | 7046–7051 | `INSERT INTO m7.m7_generation_write_grant (…) VALUES (v_grant_id, v_i."id", v_epoch, …)` |
| **U** | 7053–7057 | `UPDATE m7.m7_evidence_upload_intent SET "state" = 'PROCESSING', … "leaseEpoch" = v_epoch, …` |

The accepted triggers of F09, installed by F10, constrain that order:

| # | Accepted rule | V1.1 lines | Consequence for the order |
| :-- | :-- | :-- | :-- |
| (i) | `t_generation_coherence` (BEFORE INSERT on the generation) raises `23000` unless `NEW."leaseEpoch" = v_i."leaseEpoch" + 1` and `v_i."state" IN ('ISSUED','PROCESSING')` | 4520–4521 | **G before U** — after U, `v_i."leaseEpoch" = v_epoch` and `v_epoch ≠ v_epoch + 1` |
| (ii) | `t_upload_intent_guard` U2 / U3 (BEFORE UPDATE on the intent) require `EXISTS` a generation `(OLD."id", NEW."leaseEpoch")` | 4125–4126, 4130–4131 | **G before U** |
| (iii) | the grant's composite foreign keys to the generation, and `t_write_grant_coherence`'s `v_g."uploadIntentId" IS NULL` branch | 3247–3257, 4810 | **G before W** |
| (iv) | `t_write_grant_coherence` (BEFORE INSERT on the grant) raises `23000` when `v_i."state" IS DISTINCT FROM 'PROCESSING' OR v_i."leaseEpoch" <> NEW."leaseEpoch"` | 4817–4818 | **U before W** — before U the intent is `ISSUED` (U2) or `PROCESSING` at `v_epoch − 1` (U3), so `v_i."leaseEpoch" = v_epoch − 1 ≠ NEW."leaseEpoch"` |

**Lemma `E05-L1` (unique admissible order).** (i)–(iv) are satisfied by exactly one order of the three writes: **G → U → W**. *Proof.* (i) or (ii) gives G < U; (iv) gives U < W; (iii) gives G < W and is implied. The accepted order G → W → U violates (iv). ∎

**Corollary.** On the accepted bytes, W raises `23000 M7_COHERENCE: a write grant envelope must be its own generation's operation, key, backend and expiry, under its executing profile's capability mode and envelope enforcement` for **every** claim: for U2 because the state is `ISSUED`, and for U3 because the epoch is still `v_epoch − 1`. The function aborts and its transaction rolls back. The accepted U2 lifecycle row (V1.1 line 1316) lists the claim's effects as a set, without an order, so it does not conflict with either order. No accepted clause requires W before U.

### 5.2 Correction candidates considered

| # | Candidate | Assessment |
| :-- | :-- | :-- |
| A1 | **re-order the body to G → U → W** (move the unchanged grant `INSERT`, with its unchanged comment, after the unchanged intent `UPDATE`) | satisfies (i)–(iv) (`E05-L1`); changes no statement, value, trigger, lock or object; keeps every invariant. **Selected.** |
| A2 | relax `t_write_grant_coherence` to accept the pre-transition intent (`ISSUED`, or `PROCESSING` at `NEW."leaseEpoch" − 1`) | weakens the trigger's statement that an envelope belongs to the **current** epoch of a **`PROCESSING`** intent, which `t_capability_mint_coherence` (lines 4854–4855) mirrors for every mint; changes F09 and an accepted invariant; rejected by the no-weakening requirement |
| A3 | move U before G | violates (i) and (ii); impossible |
| A4 | defer the grant check (constraint trigger, `DEFERRABLE`) | adds or re-kinds a trigger; changes the §19.14 inventory; rejected |

### 5.3 Normative correction `E05-01` — V1.1 §19.12.1 (effective F18), `m7.w_claim_upload_intent_v1`

| Item | Value |
| :-- | :-- |
| V1.1 lines quoted and replaced | 7038–7057 (20 lines) |
| F18 fragment lines | 86–105 |
| Block SHA-256 (Before) | `36754783bd38f57aaf03a7653a37ac387b3b8f99f9ea6c3f724b972f1aa86418` (1 562 bytes) |
| Block SHA-256 (After) | `fc88bb989b8603f2b5212a36fdfe9a0aebf3bbcfc5670b214e679941b811a5ee` (1 562 bytes) |
| Nature | the After block is a permutation of the Before block's 20 lines: the 5 lines of U (V1.1 7053–7057), then the blank line (7052), then the 14 lines of the grant comment and W (7038–7051). The multiset of lines, and so the byte count, is unchanged |

Before (V1.1 lines 7038–7057, byte-exact):

```sql
    -- XF-2 / XF-9 / XF-11: allocate the ONE authorization envelope for this generation, addressable by
    -- one opaque generationGrantId. Every component is derived here from immutable rows; no caller
    -- supplies any of them, and no function can ever alter them (t_forbid_mutation). A second claim on
    -- this epoch is a primary-key violation.
    -- NOTE what this function does NOT do: it does not mint a capability, does not return capability
    -- material, and does not touch a signing credential. Round 2 had the claim return the grant material
    -- to the worker; §11.7.0 is why that is retired. The worker receives an opaque id and hands it to
    -- the sealed signer (§19.11.7), which is the only function that resolves it into an envelope.
    INSERT INTO m7.m7_generation_write_grant
        ("id","uploadIntentId","leaseEpoch","capabilityOperation","canonicalObjectKey","backendSha256",
         "grantExpiresAt","capabilityMode","envelopeEnforcement","allocatedAt","allocatedBy","generationPath")
    VALUES (v_grant_id, v_i."id", v_epoch, 'CANONICAL_CREATE', v_key, v_i."backendSha256",
            v_grant_exp, v_pr."writeCapabilityMode", v_pr."envelopeEnforcement", v_now, session_user,
            'M7_WORKER_UPLOAD_V1');

    UPDATE m7.m7_evidence_upload_intent
       SET "state" = 'PROCESSING', "stateVersion" = "stateVersion" + 1, "leaseOwner" = p_worker_id,
           "leaseEpoch" = v_epoch, "leaseExpiresAt" = v_now + v_pol."workerLease", "updatedAt" = v_now
     WHERE "id" = p_upload_intent_id
     RETURNING * INTO v_i;
```

After (replaces V1.1 lines 7038–7057):

```sql
    UPDATE m7.m7_evidence_upload_intent
       SET "state" = 'PROCESSING', "stateVersion" = "stateVersion" + 1, "leaseOwner" = p_worker_id,
           "leaseEpoch" = v_epoch, "leaseExpiresAt" = v_now + v_pol."workerLease", "updatedAt" = v_now
     WHERE "id" = p_upload_intent_id
     RETURNING * INTO v_i;

    -- XF-2 / XF-9 / XF-11: allocate the ONE authorization envelope for this generation, addressable by
    -- one opaque generationGrantId. Every component is derived here from immutable rows; no caller
    -- supplies any of them, and no function can ever alter them (t_forbid_mutation). A second claim on
    -- this epoch is a primary-key violation.
    -- NOTE what this function does NOT do: it does not mint a capability, does not return capability
    -- material, and does not touch a signing credential. Round 2 had the claim return the grant material
    -- to the worker; §11.7.0 is why that is retired. The worker receives an opaque id and hands it to
    -- the sealed signer (§19.11.7), which is the only function that resolves it into an envelope.
    INSERT INTO m7.m7_generation_write_grant
        ("id","uploadIntentId","leaseEpoch","capabilityOperation","canonicalObjectKey","backendSha256",
         "grantExpiresAt","capabilityMode","envelopeEnforcement","allocatedAt","allocatedBy","generationPath")
    VALUES (v_grant_id, v_i."id", v_epoch, 'CANONICAL_CREATE', v_key, v_i."backendSha256",
            v_grant_exp, v_pr."writeCapabilityMode", v_pr."envelopeEnforcement", v_now, session_user,
            'M7_WORKER_UPLOAD_V1');
```

### 5.4 Why this is the minimum, and what it preserves

**Lemma `E05-L2` (identical values).** Every value W writes is the same in both orders. `v_grant_id`, `v_epoch`, `v_key`, `v_grant_exp`, `v_pr`, `v_now` and `session_user` are not assigned by U. U re-assigns `v_i` through `RETURNING * INTO v_i`, but W reads only `v_i."id"` and `v_i."backendSha256"`, which `t_upload_intent_guard` forbids U to change (lines 4095–4105). The `RETURN QUERY` (lines 7060–7064) follows both writes in both orders. ∎

| Dimension | Status under `E05-01` |
| :-- | :-- |
| required intent transition | U2 `ISSUED → PROCESSING` and U3 `PROCESSING → PROCESSING`, `leaseEpoch += 1` — unchanged; now reachable |
| lease-epoch ownership | U sets `leaseEpoch = v_epoch`, `leaseOwner`, `leaseExpiresAt` exactly as before; W names that epoch |
| canonical-generation existence | G still precedes U and W; `t_generation_coherence` and XF-3 / XF-6 fence derivation unchanged |
| write-grant trigger predicates | `t_write_grant_coherence` unchanged and now satisfied: generation present, envelope equal to the generation's, intent `PROCESSING` at `NEW."leaseEpoch"` |
| transition / audit | the AFTER trigger `m7_evidence_upload_intent_z_log` writes the same transition row (it references no grant) |
| lock order | lock profile row V1.1 line 1923 unchanged — P1 `4 U`, P2 `10 S`, P3 implicit waits IW-4 / IW-0 / IW-5. U updates a row already held `FOR UPDATE` since line 6997 (no new or waiting request; LG-9). W's foreign keys reference this transaction's own new generation row and the backend already held `FOR SHARE`. No locking clause follows the first P3 write (LG-1). WC-2 (class 10 after the intent lock, before G) unchanged |
| atomicity | one function body, one transaction; any failure in G, U or W rolls back all three and the transition row (§5.5, injected failure) |
| reclaim semantics | XF-6 check (lines 7021–7026) and the U3 branch unchanged; the previous generation and its grant are retained |
| foreign keys | unchanged; the grant → generation keys are satisfied as before |
| write-fence semantics | `grantExpiresAt` / `writeFenceAt` computed identically (lines 7029–7030) and verified by `t_generation_coherence`; XF-DL-1 re-check unchanged |
| caller-controlled grant material | none: the signature and parameters are unchanged; every grant component is still derived from immutable rows (XF-12) |
| XF-9 / T-144 (a) | a second grant for one generation is still `23505` on the primary key |

Only the `prosrc` of `m7.w_claim_upload_intent_v1` changes (informative, text between `AS $fn$` and the closing `$fn$`, both exclusive): `sha256:850cc4ab2b01c0dee75f44d690b02271f2e4b8bbc06881ee68de202fb50ef1f2` → `sha256:8cf2bd873752d044220d98f68bc111fec4ec4c598cd8900c32fbef2cbae7022a` (6 018 bytes both). The other seven functions of F18 are byte-identical.

### 5.5 PostgreSQL 18.4 evidence (evidence, not authority)

Two fresh disposable clusters (`PostgreSQL 18.4 on x86_64-windows, compiled by msvc-19.44.35227, 64-bit`, `server_version_num 180004`) were provisioned only through the accepted `VBA-S02-1` template. Each installed F01 … F25, F26-prefix, the seven VBA-01 `M7-S03-VBCP` calls and F26-suffix in one transaction as the migration role. **Before** = the accepted E04-effective fragments. **After** = the same fragments with `E05-01` … `E05-03` applied by the §3 item 2 substitution rule. Both installs committed; call 6 returned 43; `w_verify_control_plane_catalog_v1` returned zero rows after install, after the injection was removed, and at the end. Every operation used the actor's own login role.

| Case | Before (accepted) | After (`E05-01`) |
| :-- | :-- | :-- |
| fresh claim of an `ISSUED` intent | `23000 M7_COHERENCE: a write grant envelope must be …`; intent `ISSUED`, epoch 0, `stateVersion` 1; 0 generations, 0 grants, 1 transition — identical to before the call | returns epoch 1 and a grant id; intent `PROCESSING`, epoch 1, owner = the worker; exactly 1 generation and 1 grant at epoch 1; the grant's id equals the returned `generation_grant_id`; its key equals the generation's key and the returned key; backend, `grantExpiresAt`, `allocatedAt`, operation `CANONICAL_CREATE`, capability mode and envelope enforcement equal the generation's and its executing profile's; `grantExpiresAt = allocatedAt + generationWriteGrantTtl`; transition `ISSUED→PROCESSING@1` |
| claim while the lease is live | — | `M7006 M7_LEASE_UNAVAILABLE` |
| reclaim after the lease lapsed (U3) | — (unreachable) | returns epoch 2; intent `PROCESSING`, epoch 2, new owner; exactly 1 generation and 1 grant at epoch 2, envelope equal as above; epoch 1's generation and grant retained (2 + 2 in total); transitions `ISSUED→PROCESSING@1, PROCESSING→PROCESSING@2` |
| injected failure at W (bootstrap administrator adds a BEFORE INSERT trigger on the grant raising `P0001`; removed afterwards) | `P0001`; no residue | `P0001`; intent, generation count, grant count and transition count identical to before the call (G, U and the transition row rolled back) |
| same intent claimed after the injection is removed | `23000` (defect reproduced; no residue) | claim succeeds at epoch 1 |

---

## 6. E05-B — deletion-completion lateness derivation contradiction (`E05-02`, `E05-03`)

### 6.1 Static proof from the accepted bytes

- **Table.** `m7.m7_deletion_execution_completion` declares `"withinCompletionBudget" BOOLEAN NOT NULL` and `"withinHardDeadline" BOOLEAN NOT NULL`, with no default (V1.1 lines 3833–3834).
- **Trigger.** `m7.t_completion_coherence`, a BEFORE INSERT trigger (installed at line 5172), raises `23000 M7_DELETION: completion lateness flags do not match the execution's bound deadlines` when `NEW."withinCompletionBudget" IS DISTINCT FROM (NEW."completedAt" <= v_e."completionBudgetDueAt") OR NEW."withinHardDeadline" IS DISTINCT FROM (NEW."completedAt" <= v_e."hardDueAt")` (lines 5031–5034). The execution's `completionBudgetDueAt`, `hardDueAt` and `completedAt` are all `NOT NULL` (lines 3654–3655, 3830), so the right-hand sides are never `NULL`.
- **Writers.** `m7.w_execute_row_redaction_v1` (lines 7891–7893) and `m7.w_execute_row_purge_v1` (lines 8149–8151) insert a completion row whose column list omits both flags. The omitted columns are `NULL` in `NEW`. `NULL IS DISTINCT FROM <boolean>` is true, so the trigger raises `23000` on every such insert — before the `NOT NULL` check, which PostgreSQL applies only after BEFORE triggers.

**Consequence.** No `ROW_REDACT` execution and no `ROW_PURGE` execution with `retainDeletionHistory = true` can ever complete: each call aborts after its writes, which roll back. The third writer, `m7.w_record_effect_attempt_v1` (F21, lines 7709–7715), supplies the two derived expressions and is conforming.

### 6.2 Correction-location adjudication

The accepted contract is DL-7 (V1.1 line 1763), the derived-value table (line 1697) and M7-I115 (line 9961): lateness is derived from the execution's **own** bound deadlines against `completedAt`, is never caller-controlled, is recorded rather than refused when late, and a forged value is refused by the trigger (M7-I115: layer `TRG`, result `23000`).

| Criterion | Approach A — writers supply the derived expressions; trigger unchanged | Approach B — the trigger computes the flags and overwrites `NEW` |
| :-- | :-- | :-- |
| DL-7 / derived-value table idiom | Matches the model's uniform idiom: a trigger that "derives" a column **verifies** a deterministic expression the writing function supplies — `t_generation_coherence` (fences, lines 4526–4535), `t_submission_coherence` (lines 4609–4610), `t_deletion_execution_verify` (lines 5003–5007). The one trigger that **stamps** a value, `t_capability_mint_coherence`, says so explicitly and carries its own audit identifier (lines 4828, 4842) | Introduces a second stamping trigger that no accepted clause describes |
| M7-I115 (forged value refused with `23000` by `TRG`) | Preserved exactly: the trigger is byte-identical, so an owner-class forged or omitted value is still refused with `23000` (§6.5) | **Changes the enforcement**: a forged value would be silently corrected instead of refused, so the M7-I115 result `23000` would no longer be observable |
| F21 effect completion | Unchanged; the corrected writers use F21's own expressions (`v_now <= v_e."completionBudgetDueAt"`, `v_now <= v_e."hardDueAt"`, line 7713), so all three writers are uniform | Unchanged bytes, but its supplied values would be discarded and overwritten |
| caller-control prohibition | Holds: the functions' signatures are unchanged (`p_manifest_sha256`, `p_execution_id`); the flags are computed in the `SECURITY DEFINER` bodies from the execution row, which is update-forbidden (line 5082, `forbid_update = true`), and from the same `v_now` written as `completedAt`; the trigger re-verifies | Holds |
| `NOT NULL` | Both operands are `NOT NULL`, so both flags are `NOT NULL` | Holds (BEFORE trigger runs before the check) |
| trigger timing | unchanged | changed semantics of a BEFORE trigger |
| replay | RM-1 … RM-3 replay checks read `affectedRowCount` only and return the stored count; no second insert | same |
| deletion history | purge with `retainDeletionHistory = false` still writes no completion and still removes the execution; with `true`, one completion with both flags | same |
| consumers / verifiers | `v_deletion_sla_critical` (line 8748), `t_sla_failure_coherence` (line 4916), the §25 cases T-128 / T-154 / T-155b read the flags or the completion's existence; semantics unchanged | same readers, but a changed trigger `prosrc` |
| changed fragments | F22 only (2 statements, 4 lines) | F09 (trigger body), plus no fix to F22's column lists would be needed |

**Other options rejected:** a column default or making the columns nullable changes the table and the §19.14 inventory. A generated column cannot reference another table's row. A shared helper function adds an object.

**Decision: approach A.** It is the only correction that preserves every accepted statement — DL-7, the derived-value idiom, M7-I115's refusal of forged values, the F21 path and every trigger byte — while touching only the two defective statements. There is no second materially different valid semantics to choose from: approaches A and B record identical flag values for every non-forged completion (both equal `completedAt <= completionBudgetDueAt` and `completedAt <= hardDueAt`), and only B changes how a forged value is treated, which M7-I115 fixes.

### 6.3 Normative corrections `E05-02` and `E05-03` — V1.1 §19.12.5 (effective F22)

Each correction inserts the two column names after `"completedAt"` in the column list, and the two expressions after `v_now` in the `VALUES` list, on the same lines. `v_e` is the function's own `m7.m7_deletion_execution` row (declared at lines 7800 and 7903), whose deadline columns are immutable. `v_now` is the value written as `completedAt`.

**`E05-02` — `m7.w_execute_row_redaction_v1`**

| Item | Value |
| :-- | :-- |
| V1.1 lines quoted / changed | 7891–7893 / 7892, 7893 |
| F22 fragment lines | 96–98 |
| Block SHA-256 | `4deb571a7cbb88d071d15e56a5adb87bbf52ff943fe5376b99eeda23a537ba0b` (281 bytes) → `f81d34691a6434ce6647d014605016ffc7ce28bc53dad0e42415985ef1c8f047` (391 bytes) |
| Line 7892 SHA-256 | `2a0f6f72d7400353abb2827490dda5ac436eaac95cd131fdae269af491534c23` → `d22844c5cfb4992519136d4807c19e8035e340ff95ef75eb2d8368a582411229` (+46 bytes) |
| Line 7893 SHA-256 | `3f19d210a8078d1b8ba2e957ef01922f0debca3122d5e3292440b882ede32212` → `fb59cd27a37115c14412fe6721aba20d3427f47fcaf833b861ea9718637dec74` (+64 bytes) |

Before (V1.1 lines 7891–7893, byte-exact):

```sql
    INSERT INTO m7.m7_deletion_execution_completion
        ("id","executionId","confirmingOutboxId","affectedRowCount","completedAt","completedBy","generationPath")
    VALUES (pg_catalog.gen_random_uuid(), v_e."id", NULL, v_n1 + v_n2, v_now, session_user, 'M7_ROW_REDACTION_V1');
```

After:

```sql
    INSERT INTO m7.m7_deletion_execution_completion
        ("id","executionId","confirmingOutboxId","affectedRowCount","completedAt","withinCompletionBudget","withinHardDeadline","completedBy","generationPath")
    VALUES (pg_catalog.gen_random_uuid(), v_e."id", NULL, v_n1 + v_n2, v_now, v_now <= v_e."completionBudgetDueAt", v_now <= v_e."hardDueAt", session_user, 'M7_ROW_REDACTION_V1');
```

**`E05-03` — `m7.w_execute_row_purge_v1`**

| Item | Value |
| :-- | :-- |
| V1.1 lines quoted / changed | 8149–8151 / 8150, 8151 |
| F22 fragment lines | 354–356 |
| Block SHA-256 | `d37b4a6ba9a26bd88c82d275963d600e15c6e07911dfca4210a995c880d64e82` (281 bytes) → `18ffa8d79adb8402ef1f45e47a03c6c520bb8cede5d3118a5efaa4bb39602bd6` (391 bytes) |
| Line 8150 SHA-256 | `d0eed231c371edfc047b4fcfbdffdbcb3c42d09c019fadbc893e71de07fa8aaf` → `219894b4e593b9e9a12a2070c13439815877219daf82ecc554605373925d9a24` (+46 bytes) |
| Line 8151 SHA-256 | `43c4cdb5a03b29fe1e26f52535ee3076d287beccecc95d8babb811ef45437cf5` → `ad3c013c046de6d9dffc6287261314d954225ca33d98f704d4f30a780635166d` (+64 bytes) |

Before (V1.1 lines 8149–8151, byte-exact):

```sql
        INSERT INTO m7.m7_deletion_execution_completion
            ("id","executionId","confirmingOutboxId","affectedRowCount","completedAt","completedBy","generationPath")
        VALUES (pg_catalog.gen_random_uuid(), v_e."id", NULL, v_n, v_now, session_user, 'M7_ROW_PURGE_V1');
```

After:

```sql
        INSERT INTO m7.m7_deletion_execution_completion
            ("id","executionId","confirmingOutboxId","affectedRowCount","completedAt","withinCompletionBudget","withinHardDeadline","completedBy","generationPath")
        VALUES (pg_catalog.gen_random_uuid(), v_e."id", NULL, v_n, v_now, v_now <= v_e."completionBudgetDueAt", v_now <= v_e."hardDueAt", session_user, 'M7_ROW_PURGE_V1');
```

### 6.4 Proof and preservation

**Lemma `E05-L3` (the trigger accepts exactly the derived flags).** In each corrected statement, `NEW."completedAt" = v_now`. The trigger reads the execution by `NEW."executionId" = v_e."id"`. That row's `completionBudgetDueAt` and `hardDueAt` equal `v_e`'s, because `m7_deletion_execution` forbids `UPDATE`, and the RM-1 re-read under the class-1 lock (lines 7824–7827, 7936–7939) has already proved the row still exists. So the supplied flags equal the trigger's derivation, and the lateness branch passes. The evidence branch (lines 5020–5027) passes as before: `affectedRowCount` is non-`NULL` for both mechanisms. ∎

**Lemma `E05-L4` (late is recorded, not refused).** The corrected statements never branch on the flags. A late completion is inserted with `false` in the corresponding flag, and the trigger accepts it (DL-7). ∎

Preserved unchanged: RM-1 … RM-7, LO-1 / LG-5 (the completion insert is a P3 write guarded by the class-1 lock, IW-5), NW-6, the purge's residue-prohibited branch, return values, `t_completion_coherence`, F21, and every reader of the flags. Only the `prosrc` of the two functions changes (informative): redaction `sha256:d7c61eeaa165c929e401fb96af76471dfad0d22bb9ec2bc511cdda9722220006` (5 990 bytes) → `sha256:02472408a5da17936fb2a5552ce1047868ebc2955eb948ac94de5a7a3fb1b90f` (6 100 bytes); purge `sha256:7eec3064a22893451ff89cdf7b398324ac3ae733bba4f79fcdcee2c6fa0075c5` (20 555 bytes) → `sha256:c84aa9e6893c086d9baedb93a3c985e1ddd37c9259cbac662ca9c4b07076bd39` (20 665 bytes).

### 6.5 PostgreSQL 18.4 evidence (evidence, not authority)

The clusters, installs and actors are as in §5.5. Each execution was created through the accepted path: SO-1, then for `ROW_REDACT` an erasure request (`privacy`), then `a_mint_deletion_authorization_v1` (`authority`, `retainDeletionHistory = true`), then `w_schedule_authorized_deletion_v1` (`worker`). Execution deadlines were FIXED budget 6 h and hard deadline 30 days.

**Lateness was produced by simulated elapsed time.** The bootstrap administrator back-dated `scheduledAt`, `completionBudgetDueAt` and `hardDueAt` of that one execution by the same interval, under `session_replication_role = replica` (a test-clock device, so the three instants keep their derived relation). The mechanism itself then ran as `pagamenos_m7_storage_worker_rt` with every trigger enabled.

| Case | Before (accepted) | After (`E05-02` / `E05-03`) — flags `(withinCompletionBudget, withinHardDeadline)` |
| :-- | :-- | :-- |
| `ROW_REDACT`, on time | `23000 … lateness flags do not match …`; 0 completions | returns 1; one completion `(true, true)`; path `M7_ROW_REDACTION_V1`; both flags equal the derivation |
| `ROW_REDACT`, budget and hard deadline both past | `23000`; 0 completions | returns 1; one completion `(false, false)` — recorded, not refused |
| `ROW_PURGE`, on time | `23000`; 0 completions | returns 3; one completion `(true, true)`; path `M7_ROW_PURGE_V1` |
| `ROW_PURGE`, budget past, hard deadline not past | `23000`; 0 completions | returns 3; one completion `(false, true)` |
| replay of each completed execution | — | returns the stored count; still exactly one completion with the same `completedAt` (RM-2 / RM-3) |
| owner-class direct `INSERT` on the row-redaction path with forged flags `(false, false)` for an on-time execution; and with the flags omitted | `23000` for both; 0 completions | `23000` for both; 0 completions — M7-I115 preserved |

---

## 7. E05-C — T-03 privilege-order / expected-result contradiction (`E05-04`)

### 7.1 Static proof from the accepted bytes

- **Privilege model.** §19.13.4 revokes every table privilege from `PUBLIC` (`REVOKE ALL ON ALL TABLES IN SCHEMA m7 FROM PUBLIC`, V1.1 line 8820). The only grants the fragments make to login roles are schema `USAGE` (§19.2, line 2449) and `EXECUTE` on their capability functions (§19.13.4). Every table grant in the fragments names `pagamenos_m7_owner`, and each is on a `public` table. M7-I01 (line 9847) states that no login role holds any table privilege, and T-01 (line 9410) expects `42501` for a participant `INSERT`.
- **PostgreSQL order.** For `UPDATE`, the executor checks relation privileges at start-up, before any row is read and before any trigger fires. A role without `UPDATE` on the table fails with `42501 permission denied for table m7_outcome_assertion`.
- **The guard.** `m7_outcome_assertion_a_guard_update` (line 5114) runs `m7.t_assertion_redaction_guard` (lines 4017–4046). That trigger raises `restrict_violation 'M7_IMMUTABLE: UPDATE is forbidden on m7.m7_outcome_assertion'` unless `current_user = 'pagamenos_m7_owner'` and the write path is `M7_ROW_REDACTION_V1`.

Therefore the accepted T-03 row (line 9412) is unsatisfiable for one of its two actors. The **participant** cannot reach the guard and receives `42501`. Only the **owner-class** actor, which holds the owner's privileges, reaches the guard and receives `restrict_violation M7_IMMUTABLE`. This is the same ordering class that E03-08 corrected for T-05 (E03 §6.2), where a login role is refused earlier by its missing `TRUNCATE` privilege.

### 7.2 Corrected contract `E05-04` — V1.1 §25.2 row T-03

The two actors are adjudicated separately, both without any privilege the accepted installation does not grant. No temporary grant is made. That is T-02's purpose, and T-02 stays unchanged.

| Item | Value |
| :-- | :-- |
| V1.1 line | 9412 (unique in V1.1) |
| Line SHA-256 | `f9d35169e9d4305f0ebefadb24518ca32ba879c74c42ed154da122245c7de9ec` (270 bytes) → `ff1fc30fc9b978eec9057f416580997ea5c1d1c1c15c68c7e07999bc1b8fc08b` (788 bytes), +518 |
| Columns | 9 in both (the §25.2 table header, line 9408) |

Before (V1.1 line 9412, byte-exact):

```text
| T-03 | M7-I23: facts are not updatable | one assertion exists | — | `participant`/`owner-class` `UPDATE … SET "statusLabel"='FAILED'` | `restrict_violation M7_IMMUTABLE` (owner-class: redaction guard rejects — no redaction path) | payload unchanged | — | — |
```

After:

```text
| T-03 | M7-I23: facts are not updatable | one assertion exists; the installed privilege model only — no login role holds a table privilege (M7-I01), and no T-02-style grant is made | — | (a) `participant`: `UPDATE m7.m7_outcome_assertion SET "statusLabel"='FAILED' WHERE "id" = <that assertion>`; (b) actor `owner-class`, executing as `pagamenos_m7_owner`, with `pagamenos.m7.write_path` unset: the same `UPDATE` | (a) `42501` permission denied for table `m7_outcome_assertion` — the relation privilege check precedes every trigger, so the guard is not reached; (b) `restrict_violation M7_IMMUTABLE` from `m7.t_assertion_redaction_guard` (no redaction path) | payload unchanged: the assertion row is identical before and after both statements; no row added or removed | — | — |
```

### 7.3 M7-I01 and M7-I23 are not weakened

- **M7-I23** (line 9869: layer `TRG`, verified by T-03, result `restrict_violation`) is exhibited by sub-case (b) exactly as the accepted row intended ("owner-class: redaction guard rejects — no redaction path").
- **M7-I01** is additionally exhibited by sub-case (a). No privilege is granted, the guard is not weakened, and neither invariant's layer, case list or SQLSTATE changes.
- The owner-class actor is fixed as executing as `pagamenos_m7_owner`, as in E03-08. Its result does not depend on migration-role inheritance, because any `current_user` other than the owner is also refused `M7_IMMUTABLE` by the same guard.
- Recovery is unchanged (`—`): no state changes.

### 7.4 PostgreSQL 18.4 evidence (evidence, not authority)

Identical in the before and after installs, because T-03 exercises no corrected SQL:

| Actor | Session | Operation | SQLSTATE / message | Persisted state | Recovery |
| :-- | :-- | :-- | :-- | :-- | :-- |
| (a) participant | `pagamenos_m7_participant_rt` (own credentials) | `UPDATE m7.m7_outcome_assertion SET "statusLabel"='FAILED' WHERE "id" = <live assertion>` | `42501 permission denied for table m7_outcome_assertion` | row digest identical before and after | none needed |
| (b) owner-class | migration role, `SET ROLE pagamenos_m7_owner`, write path unset | same | `23001 M7_IMMUTABLE: UPDATE is forbidden on m7.m7_outcome_assertion` | row digest identical; assertion count unchanged | none needed |
| privilege facts | — | `has_table_privilege(…, 'UPDATE')` | participant `false`; owner `true` | — | — |

---

## 8. Interaction with Errata 01–04 — occurrence census

| Accepted erratum | Its occurrences / amended clauses | Overlap with `E05-01` … `E05-04` |
| :-- | :-- | :-- |
| **E01** | ER-01 (§23.3, §23.4, §19.13.4 install-sequence comment V1.1 lines 8844–8853, §23.5, §24.2 MA-1), ER-02 (§24.3, §25.2 row **T-08b**, line 9418), ER-03 (§16.2.4 PA-1), ER-04 (§23.4), ER-05 (§24.2 MA-6, §23.7) | **disjoint**. No E05 line lies in these clauses; `E05-04` amends §25.2 row **T-03** (line 9412), a different row from T-08b |
| **E02** | `E02-01` … `E02-09` at V1.1 lines 4494, 4545, 4853, 5442, 6912, 8219, 8221, 8222, 8826 (fragments F09, F11, F17, F23, F26) | **disjoint**. No E02 line lies in F18 or F22, and E02 §5 records F18–F22 as containing no member of class `E02-SX`, which is unaffected. E02-03 (line 4853) lies in `t_capability_mint_coherence`, which E05 does not touch |
| **E03** | `E03-01` … `E03-09` at V1.1 lines 2231, 2313, 2319, 2471, 5233, 5235 (+2 inserted), 8403, 8404, 8496, 8545, 8551 (+3 inserted), 8607, 9414, 9527, 9639 | **disjoint**. `E03-08` (T-05, line 9414) is a **conceptual precedent** for `E05-04` (privilege check before trigger) and is neither re-opened nor re-interpreted; T-05's accepted E03 text is unchanged |
| **E04** | `E04-01` … `E04-06` at V1.1 lines 6299, 6303, 6306, 6307, 6309, 6312, 6314 (F12) | **disjoint**. F12 is untouched; its E04 pin `c154aee0…` is unchanged |

The union of E05 lines {7038–7057, 7892, 7893, 8150, 8151, 9412} intersects no line amended, inserted after, or quoted as context by any of E01 … E04 (verified mechanically). The effective F18 and F22 carry no erratum correction (`erratum02Corrections`, `erratum03Corrections`, `erratum04Corrections` all empty in the index of §1.3), so no accepted correction is re-opened. E02 §9 item 5, E03 §10 item 4 and E04 §11 item 4 are read per §3 item 5.

---

## 9. Inventory and preservation

```
NEW / REMOVED / RENAMED TABLES                 = 0      (39)
NEW / REMOVED / RENAMED ENUMERATED TYPES       = 0      (31)
NEW / REMOVED / RENAMED VIEWS                  = 0      (4; relations 43)
NEW / REMOVED FUNCTIONS; CHANGED SIGNATURES    = 0      (110 = 45 SECURITY DEFINER + 65 INVOKER)
NEW / REMOVED CONSTRAINTS                      = 0      (346 = 39 PK + 57 UNIQUE + 92 FK + 158 CHECK)
NEW / REMOVED INDEXES                          = 0      (28 = 8 unique + 20 non-unique)
NEW / REMOVED TRIGGERS                         = 0      (183 = 148 loop + 35 explicit)
NEW / REMOVED EXECUTE GRANTS / GRANT CATEGORIES= 0      (36)
NEW / REMOVED ROLES                            = 0      (7; owner memberships 1)
T-IDs ADDED / REMOVED                          = 0
MANIFEST FIELDS / LIFECYCLE EVENTS             = 0
```

**Mechanical proof.** The §19.14 counts are V1.1 §19.14 as corrected by E03 (and unchanged by E04). The S03 derivation, which computes them from the fragment bytes and refuses to proceed on any mismatch, was run on the E04-effective fragments and on the E05-corrected fragments. Both produced exactly relations 43 (39 + 4), triggers 183 (148 + 35), constraints 346 (39 / 57 / 92 / 158), indexes 28 (8 / 20), functions 110 (45 / 65, with every prefix count unchanged), EXECUTE grants 36, roles 7 and owner memberships 1. The catalog verifier then returned zero rows on each installed database, against an expectation set derived from that database's own fragment bytes. Only three function bodies change, and no function signature changes. The seven VBA-01 bootstrap calls, their 70 declared parameters and their argument classes are unchanged.

| Preserved | Status |
| :-- | :-- |
| every trigger function of F09, including `t_write_grant_coherence`, `t_generation_coherence`, `t_upload_intent_guard`, `t_completion_coherence`, `t_capability_mint_coherence` | byte-identical |
| F21 `w_record_effect_attempt_v1` and its completion insert | byte-identical |
| lock classes, LG-1 … LG-10, LO-1 … LO-5, §16.2.6 lock-profile rows of the three functions | unchanged (§5.4, §6.4) |
| transaction boundaries; install-in-one-transaction; VBA-01 `VBA-TX-*` | unchanged |
| XF-1 … XF-17, GF-*, EP-*, SI-*, DL-1 … DL-8, RM-1 … RM-7, M7-I01, M7-I23, M7-I58, M7-I115 | unchanged; the three functions now realize them |
| roles, credentials, grants, memberships; CCA boundary; A1 / A2; B / C; P-16 | unchanged |

---

## 10. M7-S01 consequence (required; not performed)

```
S01 REGENERATION REQUIRED BY E05 : YES — REQUIRED
PERFORMED BY THIS ERRATUM        : NO
EXISTING S01 EXTRACTION          : UNCHANGED (index 60809e57…; F18 8d882954…; F22 cce8a66a…)
```

After — and only after — this erratum is independently accepted, protected-integrated, registered in the root register and synchronized from authority into implementation staging:

1. The M7-S01 extraction MUST be regenerated from **M7 V1.1 + accepted Errata 01–05**, applying `E05-01` … `E05-03` exactly as §3 item 2 defines them. Hand-editing generated artifacts is not a conforming regeneration. `E05-04` is prose only and changes no S01 fragment.
2. The regenerated extraction MUST record the accepted identity (Git blob and SHA-256) of this erratum beside the unchanged V1.1 and Errata 01–04 identities.
3. **Changed fragments: exactly 2.** The informative values below come from applying §3 item 2 to the S01 bytes of §1.3. The substitution rule, not this table, is normative, and a mismatch is an erratum defect to be reported.

   | Fragment | File | Current SHA-256 (V1.1 + E01–E04) | Bytes | Lines | SHA-256 after `E05` | Bytes after | Lines after | Δ bytes / Δ lines | Occurrences |
   | :-- | :-- | :-- | --: | --: | :-- | --: | --: | :-- | :-- |
   | F18 | `sql/18_19.12.1_upload-pipeline.sql` | `8d88295459c55853396637e26fc350a00cbfd8a4118be11c2e46396bffae0a45` | 23 867 | 370 | `1d30664bb00da96e24fbc9e75299e89a95a70778bedc82dc86d903aca683373d` | 23 867 | 370 | 0 / 0 | `E05-01` |
   | F22 | `sql/22_19.12.5_row-mechanisms.sql` | `cce8a66a8155c2dbee904ee21e87c97093ceaa15bf8da5b5aa32114009b97999` | 26 982 | 362 | `afe1c1302e973d360a3e7a7a0fe8477647ee52feb2a1d0fbd963850afb3b99e8` | 27 202 | 362 | +220 / 0 | `E05-02`, `E05-03` |

4. **Unaffected fragments: exactly 24** — F01–F17, F19–F21 and F23–F26. They MUST remain byte-identical with unchanged pins, including F09 `c2bb8b38…`, F12 `c154aee0…` (E04), F21 `163d2c7a…` and the E03 pins F01 `f75c45ab…`, F11 `c9f5777f…`, F24 `f68eeea9…`. The fragment count (26), anchors, ordering rule, fence line spans and every fragment line count are unchanged.
5. Stale bytes MUST fail the S01 deterministic checks: any artifact that contains a pre-`E05` Before block, or misses, partially applies or misplaces a correction.
6. The mechanical inventory counts (§9) are unchanged.
7. The regenerated artifacts require independent re-acceptance before reliance.

---

## 11. M7-S03 — provenance boundary and consequence

1. **Bootstrap result (provenance, §1.4).** The E04-conforming installation with the VBA-01 bootstrap is executable on PostgreSQL 18.4. The historical `42883` did not recur, and call 6 returned 43. After the E05 correction the same holds (§5.5).
2. **Defect-discovery boundary.** The S03 resume then encountered `E05-A`, `E05-B` and `E05-C`. Its authorization is **consumed and superseded** by that discovery. `S03 CANDIDATE: NONE`; `S03 ACCEPTED EVIDENCE: NONE`.
3. **D03-12.** The four D03-12 predicates were **demonstrated diagnostically** by that run: the final F26 assertion passed; the verifier returned zero rows as the worker; `i_assert_control_plane(fixtureDigest)` succeeded; and another well-formed digest raised `55000`. D03-12 is **NOT CLOSED as accepted S03 evidence**. It MUST be re-demonstrated in a future, separately authorized M7-S03 run. D03-12 remains a non-authoritative diagnostic label (VBA-01, preamble).
4. **State.** `M7-S03: BLOCKED`. Resumption requires at least:
   - independent acceptance of this erratum;
   - its protected integration;
   - its root registration;
   - authority → implementation-staging synchronization;
   - regeneration of M7-S01 under §10, and independent re-acceptance and integration of that regeneration;
   - then a new, separate implementation-line authorization.

   These are cumulative with, and no weaker than, E04 §11–§12, E03 §11, VBA-01 and VFC-01, and the prerequisites recorded in the root register.
5. A resumed M7-S03 MUST install the corrected text, MUST NOT patch normative SQL locally, and MUST stop and report any further defect. Its §25.2 T-03 expectation is `E05-04`.

---

## 12. Separate findings — dispositioned without a normative delta

### 12.1 VBA-01 `VBA-OR-2` informative F26-prefix byte count

VBA-01 `VBA-OR-2` (VBA-01 line 331) gives informative values: `F26-prefix` SHA-256 `e671ed4fc4c030a56bfe641514f8ab86277ae67dfcbb6c2b17b8742ee164480b` "(2 094 bytes)", and `F26-suffix` `c000c808…` (439 bytes). The bytes that hash to `e671ed4f…` are **2 095** bytes long. They are **2 094 characters**, because the prefix contains exactly one non-ASCII character, `§` (U+00A7), encoded as two UTF-8 bytes. 2 095 + 439 = 2 534 = the F26 byte count.

```
DISPOSITION : OUTSIDE E05 V1.1-ERRATUM SCOPE (VBA-01 is not a V1.1 erratum and is not amended here)
              NON-BLOCKING FOR THE THREE E05 DEFECTS (the SHA-256 values, the partition rule and the
              byte-exact recomposition requirement of VBA-OR-2 are correct and are what S03 relies on)
              REQUIRES SEPARATE VBA DOCUMENT CLEANUP IF GOVERNANCE REQUIRES BYTE-COUNT CORRECTION
```

### 12.2 DL-7 wording "CHECK-paired"

DL-7 (V1.1 line 1763) says that the two flags are "CHECK-paired so they cannot be forged". No `CHECK` constraint on `m7_deletion_execution_completion` references them (lines 3843–3847). The forgery protection is the trigger `t_completion_coherence`, as M7-I115 (layer `TRG`, line 9961) and the derived-value table (line 1697) state, and it holds (§6.5). The phrase describes the protection imprecisely but creates no obligation that the accepted SQL fails to meet.

```
DISPOSITION : NO NORMATIVE DELTA; NOT AN E05 OCCURRENCE; NON-BLOCKING
```

---

## 13. Lifecycle and machine-authority isolation

This erratum advances no lifecycle state, and its acceptance may not advance any of them. At the baseline, and unchanged by this candidate:

```
M7 GATE 1                               : AUTHORIZED — implementation work only
M7 GATE 2                               : OPEN / NOT SATISFIED
IMP-01 … IMP-22                         : OPEN
MA-1 … MA-18                            : OPEN
LC-1 … LC-7                             : NOT OCCURRED
M7-S03                                  : BLOCKED
PRODUCTION MANIFEST                     : NOT AUTHORED / NOT ACCEPTED / NOT PUBLISHED / NOT ACTIVE
MACHINE-READABLE AUTHORITY              : NOT PUBLISHED
PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA   : NOT ASSERTED
SELECTOR                                : NOT ASSERTED / NOT ROTATED
DEPLOYMENT / WAVE 0                     : NOT AUTHORIZED
CCA IMPLEMENTATION WORK                 : AUTHORIZED
CCA IMPLEMENTATION                      : NOT ACCEPTED
B1 / B2 IMPLEMENTATION                  : NO
C1 / C2                                 : NO
P-16                                    : ACTIVE
```

This erratum creates or modifies nothing under `authority/`. It does not assert or infer the value of `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA`, does not rotate it, and publishes no machine-readable authority. It satisfies no `IMP-*`, `MA-*`, §24.3 CI addition, real-PostgreSQL acceptance, real-provider or real-deployment case. The PostgreSQL evidence of §5.5, §6.5 and §7.4 is evidence for this erratum's audit only; it is not accepted S03 evidence.

---

## 14. Acceptance criteria for the independent auditor

| # | Criterion |
| :-- | :-- |
| E05-AC-1 | the candidate commit is a normal non-merge commit changing exactly one path, this file (added); its only parent is `797c841e1cac110e693f2a878c9628f7d5f5a183`; the blobs of V1.1, E01–E04, CCA, VBA-01, VFC-01 and the register (§1.2) are unchanged; nothing under `authority/`, runtime, Prisma, migration, test, workflow, `scripts-trusted/` or S01 artifact paths changes |
| E05-AC-2 | §5.1 holds: (i)–(iv) are the accepted rules at the cited lines; `E05-L1` (G → U → W is the unique admissible order); the accepted order fails every fresh claim and every reclaim with `23000` |
| E05-AC-3 | `E05-01` is exact: the Before block is byte-identical to V1.1 lines 7038–7057 and unique; the After block is a permutation of the same 20 lines; the block SHA-256 values reproduce; `E05-L2` holds; no trigger, lock profile, fence, foreign key, signature or returned value changes |
| E05-AC-4 | §6.1 holds: both row mechanisms omit two `NOT NULL` columns the BEFORE trigger verifies, so every completion fails `23000`; F21 is conforming |
| E05-AC-5 | §6.2's adjudication is sound: approach A preserves DL-7, the derived-value idiom, M7-I115's refusal of forged values, F21 and every trigger byte; approach B would change M7-I115's enforcement; no other smaller correction exists |
| E05-AC-6 | `E05-02` / `E05-03` are exact: Before blocks byte-identical to V1.1 lines 7891–7893 / 8149–8151 and unique; each After differs only by the two column names and the two F21 expressions; line and block SHA-256 values reproduce; `E05-L3` and `E05-L4` hold |
| E05-AC-7 | §7.1 holds: the participant is refused `42501` before any trigger; only the owner-class actor reaches `t_assertion_redaction_guard`; `E05-04` states both results, makes no grant, and weakens neither M7-I01 nor M7-I23; the line SHA-256 values reproduce |
| E05-AC-8 | the dynamic results of §5.5, §6.5 and §7.4 reproduce on PostgreSQL 18.4 (fresh claim, reclaim, injected rollback; on-time and late redaction and purge with exact flags; replay; forged-flag refusal; T-03 per actor with unchanged persisted state) |
| E05-AC-9 | §8 holds: every E05 occurrence is disjoint from E01–E04; E03-08 is precedent only; F12 / E04 is untouched |
| E05-AC-10 | §9 and §10 hold: §19.14 inventory unchanged; exactly F18 and F22 change, with no line-count change and the informative pins stated; 24 fragments byte-identical; regeneration required and not performed |
| E05-AC-11 | §11–§13 hold: M7-S03 blocked; D03-12 diagnostic only, not closed; VBA-01 and DL-7 findings dispositioned without a delta; no lifecycle, selector, manifest or machine-authority change; this document does not self-accept |

---

## 15. Explicit status

```
PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_05 : AUTHOR CANDIDATE — NOT YET AUTHORITATIVE
INDEPENDENT ACCEPTANCE                   : NOT PERFORMED
PROTECTED INTEGRATION                    : NOT PERFORMED
ROOT AUTHORITY REGISTRATION              : NOT PERFORMED
AUTHORITY → IMPLEMENTATION STAGING SYNC  : NOT PERFORMED
M7 CONFORMANCE TARGET (UNTIL ACCEPTED)   : M7 V1.1 + ACCEPTED ERRATA 01 / 02 / 03 / 04 (unchanged)

M7 SPECIFICATION (V1.1)                  : ACCEPTED — ACCEPTED BYTES NOT EDITED
M7 ERRATA 01 / 02 / 04                   : ACCEPTED + PROTECTED-INTEGRATED + ROOT-REGISTERED — BYTES NOT EDITED, UNAFFECTED
M7 ERRATUM 03                            : ACCEPTED + PROTECTED-INTEGRATED + ROOT-REGISTERED — BYTES NOT EDITED;
                                           E03-08 UNCHANGED (CONCEPTUAL PRECEDENT ONLY)
VBA-01 / VFC-01                          : ACCEPTED + PROTECTED-INTEGRATED + ROOT-REGISTERED — BYTES NOT EDITED, UNAFFECTED
CCA                                      : BYTES NOT EDITED, UNAFFECTED
M7-S01                                   : EXISTING EXTRACTION UNCHANGED — REGENERATION REQUIRED AFTER ACCEPTANCE (F18, F22; §10)
M7-S03                                   : BLOCKED — RESUME CONSUMED / SUPERSEDED BY E05 DEFECT DISCOVERY — NEW AUTHORIZATION REQUIRED (§11)
D03-12                                   : DEMONSTRATED DIAGNOSTICALLY — NOT CLOSED AS ACCEPTED S03 EVIDENCE
M7 GATE 1                                : AUTHORIZED (unchanged)
M7 GATE 2                                : OPEN / NOT SATISFIED (unchanged)
IMP-01 … IMP-22 / MA-1 … MA-18           : OPEN
LC-1 … LC-7                              : NOT OCCURRED
PRODUCTION MANIFEST                      : NOT AUTHORED / NOT ACCEPTED / NOT PUBLISHED / NOT ACTIVE
MACHINE-READABLE AUTHORITY               : NOT PUBLISHED
PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA    : NOT ASSERTED
SELECTOR                                 : NOT ASSERTED / NOT ROTATED
DEPLOYMENT / WAVE 0                      : NOT AUTHORIZED
RUNTIME / SCHEMA / MIGRATIONS / TESTS / WORKFLOWS / scripts-trusted / authority / S01 ARTIFACTS : NOT MODIFIED
PAGAMENOS_SPEC_AUTHORITY.md              : NOT MODIFIED
```

# PagaMenos — Specification Authority & Implementation Authorization

This file is the **root authority register**. It records which specification documents are authoritative, their precedence, the independent closure verdicts, the accepted implementation SHAs, and the current implementation authorization. It does **not** restate or modify the specifications.

**Last repaired:** the **R-B-17 authority repair** — see `PAGAMENOS_R_B_17_AUTHORITY_REPAIR_REPORT.md`.
**Latest authority progression:** **JBA V1.9 + formally integrated JBA Narrow Amendment 01** (§3.1, §3.2), through the protected `m3.5b-b-integration` surface (§8.1) at merge `d64ea203e2022b6f313bc35b32a8ea0f961caecc`; **further followed by the formally integrated A1/A2→M7 Consent Compatibility Amendment 01** (§9.1). JBA V1.9 itself is **not superseded or replaced** by Amendment 01 — see §3.2. **The A1/A2→M7 Consent Compatibility Amendment 01 is upstream compatibility/security authority only — it does NOT accept, and MUST NOT be read as accepting, any M7 effective specification; see §9.**
**Current protected authority surface:** merge `f54d95abb0a8f7988626597a0eef01d0b0ae3c95` (PR #14, `origin/m3.5b-b-integration`) — see §9.1. This advances the protected surface beyond the JBA Amendment 01 merge `d64ea203e2022b6f313bc35b32a8ea0f961caecc` cited above; neither historical merge identity is rewritten by this line.
**Controlling B semantic authority:** `PAGAMENOS_M3_5B_B_SEMANTIC_RATIFICATION_V1_3.md` (status **ACCEPTED**).
**Controlling B architecture authority:** `PAGAMENOS_M3_5B_B_ARCHITECTURE_CONTRACT_V1_9.md`, the **Joint B Architecture** (status **ACCEPTED**, formally integrated; §3.1), **as narrowly amended by** `PAGAMENOS_M3_5B_B_JBA_AMENDMENT_01_B1S_AUTHORITY.md` (status **ACCEPTED**, formally integrated; §3.2, narrow B-scoped amendment only). Both remain **subordinate to, and do not replace,** the B Semantic Ratification V1.3.

> **Reading rule.** This register uses **scope-qualified precedence, not a single universal linear ordering**: an artifact controls only within the scope it was accepted for, and two artifacts whose accepted scopes are orthogonal are never ranked against each other. Within a shared scope, when two artifacts appear to conflict, resolve in this order: (1) §1 base study authority, by its own internal precedence, controlling across every scope; (2) §2 accepted milestone specifications (A1, A2, …), each governing its own milestone's semantics; (3) §3 B semantic authority, for the B phase only and subject to §1; (4) §3.1 the Joint B Architecture, for the shared B1/B2 architecture only and subject to §3; (5) §3.2 accepted narrow JBA amendments, each controlling only within its own explicitly enumerated scope and otherwise subject to §3.1; (6) any future accepted B1S/B2S effective specification, subject to §3.1 as amended by §3.2. Orthogonal to that B-scope chain: (7) the **A1/A2→M7 Consent Compatibility Amendment 01** (§9.1) — subordinate to §1, and to A1 and A2 semantics, and controlling **only** the narrow A1/A2→M7 compatibility/security-capability boundary it explicitly enumerates (§9.1, §9.3); where it appears to alter an A1 or A2 semantic, A1/A2 control instead; (8) a **future accepted M7 effective specification** (none is accepted now — see §9.4, §9.5) — once accepted, governing the M7 Outcome/Evidence domain and M7's own physical/domain choices within its accepted scope, subject to §1, to A1/A2 where applicable, and to Amendment 01 on the compatibility boundary Amendment 01 controls; if a future M7 specification conflicts with Amendment 01 inside that boundary, Amendment 01 controls there. An artifact listed in §5 is **never** authority. No amendment in this register asserts a universal amendment doctrine: each controls strictly the scope it explicitly enumerates (see §3.2, §9.1). Nothing in (7)–(8) alters, or is superior or subordinate to, the B-scope chain (3)–(6); their scopes do not overlap.

---

## 1. Base study authority

These govern the study as a whole. Their established precedence is unchanged by any later milestone work.

| # | File | Role |
| :-- | :-- | :-- |
| 1 | `PAGAMENOS_PHASE_0A-2_RT04_MICROPATCH.md` | RT-04 final closure micro-patch |
| 2 | `PAGAMENOS_PHASE_0A-2_REDTEAM_PATCH_REV2.md` | Red-team Patch Revision 2 — closure delta (RT-02/04/05/10/11/14) |
| 3 | `PAGAMENOS_PHASE_0A-2_REDTEAM_PATCH.md` | Red-team patch (RT-01…RT-19) |
| 4 | `PAGAMENOS_PHASE_0A-2_FINAL.md` | consolidated Phase 0A-2 spec |

*(The RT-04 micro-patch is the file the authorization brief referred to provisionally as `…_RT04_FINAL_CLOSURE_MICROPATCH.md`.)*

**Precedence (highest first):**

```
RT-04 final micro-patch  >  Red-team Patch Revision 2  >  Red-team Patch  >  Phase 0A-2 FINAL
```

Earlier superseded revisions are historical evidence only and MUST NOT drive implementation.

**Authoritative background corpus/research inputs:** `PAGAMENOS_PHASE_0A.md`, `PAGAMENOS_PHASE_0A_1.md`, `PAGAMENOS_PHASE_0A-1B.md`.

**Independent closure verdict.** Codex Sol final closure gate: **A — IMPLEMENTATION GO**. RT-04 CLOSED. 0 unresolved CRITICAL/HIGH blocking M0–M3; 0 new CRITICAL/HIGH from the final micro-patch.

### 1.1 Amendments in force against Rev 2

Two sections of Rev 2 are **amended** by the accepted B semantic ratification. The amendments are printed inline in Rev 2 itself, at the amended sections, and there is an amendment notice at the top of that file.

| Amended section | Amendment | Controlling authority |
| :-- | :-- | :-- |
| **Rev 2 §6.A** (`PurchaseOccasion` identity) | Required singular `createdFromIntentId` superseded; no one-intent-per-occasion interpretation; no physical scalar-shape assumptions incompatible with the ratified logical interface. Zero/one/many source links; provenance separate from canonical identity; analysis-facing semantics follow the amended logical interface; late facts append-only rather than by mutating the canonical identity record. | `PAGAMENOS_M3_5B_B_SEMANTIC_RATIFICATION_V1_3` — **R-B-05**, **R-B-13**, **HR-B-03** |
| **Rev 2 §8** (superseded-field register, `occasionKey` row) | The `occasionKey` deletion **stands**; it MUST NOT be reinterpreted as a universal ban on all possible future deterministic identity constructions. **O-16 is CLOSED**: the accepted Joint B Architecture V1.9 holds canonical B identities to be **opaque, server-minted surrogates**, never constructed from business data or from any key pair. Physical generation mechanics remain downstream B1S/B2S representation work. | `PAGAMENOS_M3_5B_B_SEMANTIC_RATIFICATION_V1_3` — **§4.1**, **P-03**, **P-03a**; closed by `PAGAMENOS_M3_5B_B_ARCHITECTURE_CONTRACT_V1_9.md` — **O-16** (§3.1) |

Rev 2 §6.B–§6.F, §7 and all other rows of §8 are **unchanged**. Rev 2 §6.E remains controlling, including *"Legal/consent deletion overrides analysis retention."*

These annotations discharge open item **O-12**, whose owner was defined as the R-B-17 authority repair.

---

## 2. Accepted implementation / specification milestones

Each row is an accepted milestone: its normative specification, its independent verdict, and the exact accepted implementation identity.

### 2.1 M3.5A — Immutable Decision Persistence Foundation — **ACCEPTED**

| Item | Value |
| :-- | :-- |
| Accepted authority artifact | `PAGAMENOS_M3_5A_IMPLEMENTATION_REPORT.md` (verdict **PASS**) |
| **Accepted implementation SHA** | `64cf864a817c137920204487ab3317bc6d4c9ba5` |
| Corpus | `PAGAMENOS_VALIDATION_CORPUS_v1_2026-08-30T1800-0500` (frozen) |

This is the decision-persistence authority consumed by A1 and A2.

### 2.2 M3.5B-A1 — Protocol / Experiment / Assignment / Consent Authority — **ACCEPTED**

| Item | Value |
| :-- | :-- |
| **Canonical accepted specification** | `PAGAMENOS_M3_5B_A1_EFFECTIVE_SPEC_V2_1.md` |
| Implementation record | `PAGAMENOS_M3_5B_A1_IMPLEMENTATION.md` |
| Independent verdict | Codex Sol: **A — ACCEPTED**, A1 CLOSED |
| **Accepted implementation SHA** | `99f2d61bc45839d6f9506abee5fae641bfcd8b2e` |
| Documentation-only child | `7c0a3d9e0add34e4823c01f22c21542817dbc881` — changes documentation only and does **NOT** replace the accepted implementation SHA |

A1 revisions V1 and V2 are historical and non-normative; they are archived under `docs/authority/archive/m3.5b-a1/`.

### 2.3 M3.5B-A2 — Intent / Decision — **ACCEPTED**

| Item | Value |
| :-- | :-- |
| **Canonical accepted specification** | `PAGAMENOS_M3_5B_A2_EFFECTIVE_SPEC_CANONICAL_V1.md` |
| **Accepted implementation head** | `22c8efe016a1f743196c45fe4b78d606b56d1567` |
| **Accepted integration merge** | `81b1cc606df9eeff7766c5afdaa56eeddb0db1a5` |
| **Accepted integration tree** | `b6de0d7f72ef67a6d2099a5fd9d7f09b0a476f6b` |

The canonical A2 specification was created by the R-B-17 authority repair. It **consolidates the accepted chain `V4 → V4.1 → V4.2 → V4.3 → V4.4 → V4.5` without changing A2 semantics**, and carries a section-by-section provenance map (its Appendix A).

> **Why a consolidation was required.** Each of V4.1–V4.5 carried a header claiming it "fully supersedes" all earlier revisions. **That claim is literally false.** V4.5 is a 177-line two-field patch; V4 is the 779-line architecture. A gate reading only the newest file would read a two-field patch and lose the entire `PurchaseIntent` lifecycle. The accepted effective A2 authority was the ordered union of the whole chain; that union is now written once.

**The canonical A2 specification is the only active A2 normative specification.** All nine historical A2 revisions — V1, V2, V3, V4, V4.1, V4.2, V4.3, V4.4, V4.5 — are archived under `docs/authority/archive/m3.5b-a2/`, marked `HISTORICAL / NON-NORMATIVE`, with their in-document supersession claims explicitly neutralized. The full register of neutralized claims is Appendix B of the canonical specification.

### 2.4 Machine-readable authority baseline — separately selected, NOT in this tree

There are two distinct things called "authority" in this project. They must not be conflated.

| | **This repository tree — R-B-17 documentation authority** | **The machine-readable authority baseline** |
| :-- | :-- | :-- |
| What it is | the normative and archival **documents** installed by the R-B-17 repair | the machine-readable **JSON artifacts** consumed by CI gates |
| Where it lives | `PAGAMENOS_*.md` at the root, plus `docs/authority/archive/` | the `authority/` namespace of a **separately selected** authority-baseline commit |
| Selected how | by this register | by the protected external selector `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA` |
| Read by CI | **no** — no workflow or script references any `.md` path | **yes** |

> **The machine-readable authority artifacts are NOT contained in this R-B-17 repair tree.** They belong to the separately selected authority-baseline commit referenced by the protected external selector `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA`.

**Verified in this tree:** `git ls-tree -r HEAD authority/` returns **nothing**. The `authority/` namespace is absent from this repair commit *and* from its parent, the accepted A2 integration merge `81b1cc6`. Any statement that this tree contains `AUTHORITY_BASELINE_MANIFEST_V1.json`, `CORPUS_RELEASE_LEDGER_V1.json`, `HOLIDAY_CALENDAR_REGISTRY_V1.json` or the holiday-calendar fixture would be false.

**`authority/` remains a protected trust path.** `.github/workflows/trusted-a2-authority.yml` lists it in `PROTECTED_PREFIXES` alongside `src/corpus/`, `src/engine/`, `.github/workflows/` and `scripts-trusted/`. The prefix is protected *whether or not it is populated in a given tree*: it is the protected machine-authority namespace **when present in the selected authority-baseline tree**. `docs/authority/archive/` is, by contrast, documentation only, is read by no CI job, and is deliberately outside every protected prefix.

#### Exact selected authority-baseline SHA

```
Exact selected authority-baseline SHA: externally governed / not asserted by this documentation repair.
```

**Why it is not asserted here.** The selector is a GitHub Actions **repository variable**, read as `${{ vars.PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA }}` in `.github/workflows/ci.yml` and `.github/workflows/trusted-a2-authority.yml`. Its value is held in project settings **outside the repository**, is not present in any tracked file, and is rotatable by a privileged owner after acceptance without any repository change. It therefore cannot be verified from repository content, and this register does not assert it. The workflows require a 40-character lowercase hex full SHA and **fail closed** when the variable is unset, blank or malformed.

**Corroborating evidence, recorded as evidence only — NOT as the selector value.** The four machine artifacts are present at commit `84a7a1a30545b1c61ce2b372a95da9005ea46b6c` (*"m3.5b-a2: bootstrap authority baseline v2"*, 2026-09-02), the tip of `m3.5b-a2-authority-bootstrap-v2` and the current `origin/HEAD`. That commit is **not** an ancestor of this repair commit — it is a separate authority-bootstrap lineage. An accepted-baseline source comment (`src/study/corpus-authority.ts`) also records an expectation of the form `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA = 84a7a1a…`, abbreviated.

**None of that is proof of the current selector value**, and it MUST NOT be read as such: an in-tree comment is exactly the kind of candidate-controlled claim the external-selector mechanism exists to distrust (canonical A2 §34), it is abbreviated rather than the required full SHA, and `origin/HEAD` is a default-branch pointer rather than the protected variable. To establish the selected value, read the protected repository variable itself.

---

## 3. M3.5B-B semantic authority

| Item | Value |
| :-- | :-- |
| **Accepted artifact** | `PAGAMENOS_M3_5B_B_SEMANTIC_RATIFICATION_V1_3.md` |
| **Status** | **ACCEPTED** |
| Independent final verdict | `M3.5B-B SEMANTIC RATIFICATION ACCEPT` |

**Scope of its authority.** This document is authoritative for:

- its **human-ratified amendments** to the base study authority — specifically the Rev 2 §6.A and §8 amendments recorded in §1.1 above;
- the **B1/B2 phase spine** and the binding terminology that goes with it (§4 below);
- the ratified clauses **R-B-01 … R-B-17**, the corrections **HR-B-01 … HR-B-10**, the prohibition register **P-01 … P-19**, and the open register **O-01 … O-17** with their owners and deadlines.

**Subordination.** It is **explicitly subordinate to immutable higher-order study invariants** where applicable. It asserts no universal governance doctrine, and every clause in it is classified `INHERITED`, `HUMAN-RATIFIED` or `STRICT CONSEQUENCE`. Where an immutable higher-order invariant applies, that invariant controls.

**Note on its own status lines.** The body of V1.3 was authored as a *candidate* and still reads `CANDIDATE — NOT FINAL AUTHORITY` and `R-B-17 AUTHORITY REPAIR NOT EXECUTED`. Both are resolved by events: the acceptance verdict above satisfied the candidacy condition, and R-B-17 has since been executed. A clearly separated acceptance banner at the top of that file records this; the ratified body below the banner is byte-for-byte unaltered. **Everything else in V1.3 §14 remains in force** — see §6 below.

Ratification revisions **V1**, **V1.1** and **V1.2** are `SUPERSEDED HISTORICAL REVIEW ARTIFACTS — NON-NORMATIVE`, archived under `docs/authority/archive/m3.5b-b/`.

### 3.1 Accepted Joint B Architecture — V1.9

| Item | Value |
| :-- | :-- |
| Artifact | `PAGAMENOS_M3_5B_B_ARCHITECTURE_CONTRACT_V1_9.md` |
| **Status** | **ACCEPTED** |
| Independent semantic verdict | `M3.5B-B JOINT ARCHITECTURE ACCEPT` |
| Accepted JBA SHA-256 | `e10b9afdf61f8d6dc0b907cfdfc6eb00ce4059eac7dcca3cd41a1e8902ce5b1b` |
| Original accepted commit | `47123397a87304d8e7357fbd4b5dc4dd0243fd12` |
| Accepted / integrated tree | `bb9568639ceea2276c44b8e8579dcd948ceac9af` |
| Integration carrier | `6eeab5a6b12040d023c023cb59dfb6b4f032274d` |
| Formal protected integration merge | `fe8ac7af8ee7feb3963e14b8c0e9b16875c4dedf` |
| Scope | the **shared B1/B2 architecture** — semantics common to both B1 and B2 |
| Relation to §3 | **subordinate to, and does not replace,** `PAGAMENOS_M3_5B_B_SEMANTIC_RATIFICATION_V1_3`; it closes the JBA-owned open items §7's prior register assigned to it, and constructs no semantic §3 did not already require |
| Authorizes | **no B1/B2 implementation.** It authorizes downstream B1S/B2S effective-specification work only (§6, §7) |

**Supersession.** JBA V1.9 supersedes V1.8 **only because its independent acceptance condition — `M3.5B-B JOINT ARCHITECTURE ACCEPT`** — **has now been satisfied.** V1.8 and every earlier JBA candidate revision are non-normative and are not part of this repository's authoritative tree.

### 3.2 Accepted JBA Narrow Amendment 01 — formally integrated

JBA V1.9 (§3.1) **remains the accepted Joint B Architecture, unmodified and unreplaced.** Amendment 01 is a **later, narrow, B-scoped amendment** to it. It has later authority **only** for the scope it explicitly enumerates; it asserts no universal amendment doctrine.

| Item | Value |
| :-- | :-- |
| Artifact | `PAGAMENOS_M3_5B_B_JBA_AMENDMENT_01_B1S_AUTHORITY.md` |
| **Status** | **ACCEPTED AND FORMALLY INTEGRATED** |
| Accepted candidate commit | `c9d9ba69022b4ac52cb9f730a6440bb0d470bd66` |
| Candidate tree | `4fe3fc520abbaaf755855ca9e09a97f60f8b072f` |
| Artifact SHA-256 | `4cdf92f84b26c9c15320f05045c7400e0f8a132e37d75d3bf4e858700cb0f2a0` |
| Artifact Git blob | `23906cde38cd9b8b23f31e564cc2d5cfd20027d8` |
| PR | `#12` |
| Formal protected integration merge | `d64ea203e2022b6f313bc35b32a8ea0f961caecc` |
| Merge parents (in order) | 1. `dfb6c41d1ebcba7a05051302ca6bd34fc8e8b0a8` — 2. `c9d9ba69022b4ac52cb9f730a6440bb0d470bd66` |
| Merge tree | `4fe3fc520abbaaf755855ca9e09a97f60f8b072f` |
| Merged at | `2026-09-09T14:15:01Z` |
| GitHub signature | verified / valid |
| Post-merge required checks | `authority-gate` — SUCCESS; `verify` — SUCCESS (GitHub Actions app `15368`) |

**Later authority — strictly limited to two closed surfaces:**

1. **Semantic delta.** CD-3 row 25: `DecompositionManifest`(new) → `DecompositionManifest`(prior), classified **structural endpoint relation**, **eligibility edge = NO**; and the minimal `DC-06` binding of explicit manifest supersession to row 25.
2. **Consequential mechanical overlay.** M-01…M-08, exactly as accepted by Amendment 01 (count/range corrections consequential on row 25 existing; no independent semantic content).

**All other JBA V1.9 content remains unchanged.** JBA V1.9's own identity (blob, SHA-256, original formal integration merge `fe8ac7af8ee7feb3963e14b8c0e9b16875c4dedf`) is untouched — see §3.1.

**Effective CD-3 state (compact fact only; the full table is not reproduced here — see the amendment §5–§7):**

```
CD-3 effective role count: 25
  semantic citations              : rows 1–10
  structural endpoint relations   : rows 11–14 and 25
  mere provenance                 : rows 15–24
```

**§9.3.8 impact:**

```
NEW §9.3.8 PERSISTED CLASSES FROM AMENDMENT 01: 0
```

Row 25 is a reference role between already-registered `DecompositionManifest` records (§9.3.8.1 row 6 of the JBA); it adds no new persisted logical B class.

**What this does NOT do.** Amendment 01 does not authorize B1 or B2 implementation, does not accept any B1S/B2S candidate, does not resolve the B1↔B2 cross-contract gate (**P-16** — see §5.1), and does not touch B2 reconciliation, real-world distinctness, `PurchaseOccasion` establishment, candidate emission, `DB-03A`/`DB-03B`, scientific independence, C1, C2, `AnalysisProtocol`, RIVSR, numerator, denominator, opportunity threshold, legal deletion, or timestamp semantics. See §4, §6 and §6.2 below, all of which remain unchanged by this amendment.

**Prior failed candidate.** Commit `45a55c8dbfd6aa73ddfc380b809ec3e116401956` is a **NON-AUTHORITATIVE FAILED AMENDMENT CANDIDATE** (independent verdict: `JBA NARROW AMENDMENT 01 REQUIRES PATCH`). It is **not** an ancestor of the formally integrated Amendment 01 commit `c9d9ba69022b4ac52cb9f730a6440bb0d470bd66`, and carries no authority.

---

## 4. Formal B phase spine

```
A1  Protocol / Cohort                                    ACCEPTED
A2  Intent / Decision                                    ACCEPTED
B1  Purchase Observation / Occasion Candidate Identity   ARCHITECTURE ACCEPTED — JBA V1.9 as narrowly amended
                                                          by Amendment 01 (sections 3.1, 3.2)
                                                          EFFECTIVE SPEC (B1S): NOT YET ACCEPTED
                                                          IMPLEMENTATION: NOT AUTHORIZED
B2  Purchase Occasion & Exposure Reconciliation          ARCHITECTURE ACCEPTED — JBA V1.9 as narrowly amended
                                                          where applicable (sections 3.1, 3.2)
                                                          EFFECTIVE SPEC (B2S): NOT YET ACCEPTED
                                                          IMPLEMENTATION: NOT AUTHORIZED
C1  Evidence / Attribution                               NOT AUTHORIZED
C2  Analysis                                             NOT AUTHORIZED
```

> ### Superseded legacy label
>
> **`B1 Opportunity Identity` is a superseded legacy label and MUST NOT be used in new normative artifacts.**
>
> The ratified label is **`B1 — Purchase Observation / Occasion Candidate Identity`**.

**Binding terminology (do not collapse these units):**

| Unit | Owner | Never confuse with |
| :-- | :-- | :-- |
| capture — one A2 `PurchaseIntent` root | A2 | anything below |
| purchase-decision occasion — RT-09's unit | A2 (implemented) | `PurchaseOccasion` |
| purchase observation / occasion candidate | **B1** | `PurchaseOccasion`; never counted |
| `PurchaseOccasion` — one real-world attempted/realized purchase | **B2** | candidate; decision occasion |
| real-world distinctness — one purchase or several | **B2** | scientific independence |
| scientific independence — study eligibility | **C2 / `AnalysisProtocol`** | real-world distinctness |
| opportunity — a real occasion meeting the economic threshold | C2 / `AnalysisProtocol` | `PurchaseOccasion` |

---

## 5. Non-authoritative artifacts (explicit register)

**Nothing in this section is authority. Nothing here may be cited as a specification, a baseline, or a gate input.**

| Artifact | Status | Location |
| :-- | :-- | :-- |
| `PAGAMENOS_M3_5B_B1_EFFECTIVE_SPEC_V1` | **`BLOCKED DIAGNOSTIC / DECISION INPUT — NON-NORMATIVE`** | `docs/authority/archive/m3.5b-b/` |
| `PAGAMENOS_M3_5B_B_SEMANTIC_RATIFICATION_V1` | `SUPERSEDED HISTORICAL REVIEW ARTIFACT — NON-NORMATIVE` | `docs/authority/archive/m3.5b-b/` |
| `PAGAMENOS_M3_5B_B_SEMANTIC_RATIFICATION_V1_1` | `SUPERSEDED HISTORICAL REVIEW ARTIFACT — NON-NORMATIVE` | `docs/authority/archive/m3.5b-b/` |
| `PAGAMENOS_M3_5B_B_SEMANTIC_RATIFICATION_V1_2` | `SUPERSEDED HISTORICAL REVIEW ARTIFACT — NON-NORMATIVE` | `docs/authority/archive/m3.5b-b/` |
| A2 effective specs V1, V2, V3, V4, V4.1, V4.2, V4.3, V4.4, V4.5 | `HISTORICAL / NON-NORMATIVE` | `docs/authority/archive/m3.5b-a2/` |
| A1 effective specs V1, V2 | `HISTORICAL / NON-NORMATIVE` | `docs/authority/archive/m3.5b-a1/` |
| Rejected B1 implementation | **`REJECTED IMPLEMENTATION EVIDENCE — NON-AUTHORITATIVE`** | Git history — see below |
| Failed M3.5B prototype | `EVIDENCE ONLY — NOT A BASELINE` (Codex Sol: **C — NO-GO**) | commit `1ded28d28038d4a385628683da096f846439a100` |
| `PAGAMENOS_M3_5B_B1_EFFECTIVE_SPEC_V2` | **`NON-AUTHORITATIVE SPECIFICATION EVIDENCE — BLOCKED ON AUTHORITY`** | commit `9fa9d0e9ca52f88f5bb471e625cce92ac7ff47ab` — see §5.2 |

The **blocked B1 diagnostic** does **not** compete with the accepted V1.3 ratification. It is a decision input that identified authority defects; it is not a B1 effective specification.

### 5.1 Rejected B1 implementation

```
commit a586b3119da2cc1aa4668485b129dbe625ab5cae
tree   ae31d6649303d04bd334ef1bf93ec56b915d39fe
```

**Status: `REJECTED IMPLEMENTATION EVIDENCE — NON-AUTHORITATIVE`.**

- It MUST NOT be treated as **B semantic authority** (accepted V1.3 §4.4(a); prohibition **P-17**).
- It MUST NOT be used as an **implementation baseline**. The accepted baseline is the A2 integration merge `81b1cc606df9eeff7766c5afdaa56eeddb0db1a5`.
- It is **deliberately NOT deleted** from Git history, and remains reachable on `origin/m3.5b-b1-implementation`.
- Its root cause is recorded as **AUTH-06**: it was implemented with **no B1 specification**. `git diff 81b1cc6..a586b31` touches 16 paths — **nine added and seven modified** — and contains no specification or design artifact.

**Consequence, now binding:** B architecture and effective specifications require the B-scoped, independently reviewed authority process **before** implementation (**R-B-17**, prohibition **P-17a**). Beginning B1 implementation while the B1-to-B2 cross-contract is unresolved is prohibited (**P-16**).

### 5.2 Non-authoritative B1S V2 candidate

```
commit 9fa9d0e9ca52f88f5bb471e625cce92ac7ff47ab
tree   9ce36f03442fa22f3f695f46f716493e61379a83
```

| Item | Value |
| :-- | :-- |
| Artifact | `PAGAMENOS_M3_5B_B1_EFFECTIVE_SPEC_V2.md` |
| Artifact SHA-256 | `338a7120c84b24311225cd21d7a1ee777d186e4308b57ca770d246c71936595d` |
| Independent result | `M3.5B-B1 EFFECTIVE SPEC V2 BLOCKED ON AUTHORITY` |
| **Status** | **`NON-AUTHORITATIVE SPECIFICATION EVIDENCE`** |

**Reachability.** This commit is **not reachable from any `origin` branch** of this repository; it does not sit in the accepted repository's tracked history. It is recorded here only as blocked decision-input evidence, not as part of the authoritative tree.

**It MUST NOT be used as a baseline for the corrected B1S contemplated by §3.2 / §7.1 below.** A corrected B1S specification is authored fresh against JBA V1.9, Amendment 01, and the rest of the accepted authority chain — not against this blocked candidate.

---

## 6. Current implementation authorization

- **Accepted and implemented:** M0, M1, M2, M3, M3.5A, M3.5B-A1, M3.5B-A2.
- **Joint B Architecture V1.9:** **ACCEPTED AND FORMALLY INTEGRATED** (§3.1), **as narrowly amended by JBA Amendment 01** (§3.2). Downstream **B1 and B2 effective-specification** work (B1S, B2S) is now authorized to begin. See §7, §7.1.
- **Not authorized by JBA acceptance, or by Amendment 01's integration, alone:** B1 implementation; B2 implementation. Amendment 01 is a document-only authority-register synchronization; it authorizes **no** implementation and closes no implementation gate. Implementation remains unauthorized until the applicable effective specification (B1S or B2S) is **independently accepted** and every applicable gate — including §6.2's standing engineering pre-condition and prohibition **P-16** (§5.1) — is satisfied. Acceptance of a future B1S, by itself, still does **not** automatically authorize B1 implementation while P-16's cross-contract condition remains unresolved.
- **Not authorized:** C1; C2; any `AnalysisProtocol v1` freeze; deployment; Wave 0.

### 6.1 Frozen status flags

```
AnalysisProtocol v1                : UNFROZEN
  - scientific independence        : NOT FROZEN
  - UNKNOWN treatment              : NOT FROZEN
  - RIVSR                          : NOT FROZEN
  - denominator                    : NOT FROZEN
  - opportunity threshold          : NOT FROZEN
  - C2 analysis windows            : NOT FROZEN
Wave 0                             : NOT AUTHORIZED
Deployment / production Protocol v1: NOT AUTHORIZED
C1 / C2                            : NOT AUTHORIZED
```

**No artifact may freeze any element of `AnalysisProtocol v1`.** The Rev 2 §6.A amendment (§1.1) is permissible precisely **because** v1 is unfrozen and §6.B anticipates versioned change.

### 6.2 Standing engineering pre-condition for B acceptance

Before B1/B2 can be formally accepted, the **hosted required-check surface** MUST execute the authoritative real-PostgreSQL integration and adversarial suite (**R-B-16**, rationale **HR-B-10**). `db:migrate:check` or migration-text inspection is **insufficient evidence** for trigger semantics. This tracks the open item recorded as **P35A-06**.

**Amendment 01 does not satisfy this pre-condition.** The `authority-gate` and `verify` checks that ran green on Amendment 01's integration merge (§3.2) establish **Amendment 01 integration integrity only** — they are not, and are not claimed to be, the authoritative real-PostgreSQL integration/adversarial suite this section requires for B1/B2 runtime acceptance. Before actual B1/B2 runtime implementation acceptance or merge, a genuine B-scoped trusted authority mechanism must still be established as required by accepted governance; the frozen A2 exact-head trusted gate is not reused for this purpose.

---

## 7. Accepted Joint B Architecture — downstream ownership

```
M3.5B-B ARCHITECTURE CONTRACT — B1+B2   (the "Joint B Architecture")
Status: ACCEPTED AND FORMALLY INTEGRATED — V1.9 (see section 3.1),
        as narrowly amended by JBA Narrow Amendment 01 (see section 3.2)
```

The Joint B Architecture is the **first artifact of the B chain**; B1 and B2 effective specifications derive from it, and implementation derives from those. Dependencies run **one direction only**: `JBA → B1S / B2S → implementation`. This register does not restate JBA content; the JBA itself (§3.1) is authority for its own reasoning.

**Closure.** The thirteen JBA-owned open items formerly listed here — `O-01`, `O-02`, `O-03`, `O-04`, `O-06a`, `O-06b-ARCH`, `O-B-DISTINCTNESS`, `O-11`, `O-13`, `O-14`, `O-15`, `O-16`, `O-17` — are **`13 / 13` CLOSED VALIDLY**, and **`O-06a`** is separately **CLOSED VALIDLY** against its own eighteen-function standard. The hard architecture-gate condition (§8.3 of the ratification) — removing the ambiguity in *"one `Outcome` per occasion/Decision"* by distinguishing the **purchase-decision occasion** (A2 / RT-09) from the canonical **`PurchaseOccasion`** (B2) — is **closed**. **No JBA-owned semantic decision remains open for B1S or B2S to make.** Amendment 01 (§3.2) does not reopen any of these; it supplies exactly one additional structural reference role (CD-3 row 25) that the closed set did not need to resolve.

**Remaining downstream ownership (representation and enforcement, not semantics).**

**B1S owns:**

- **O-05** — exact candidate schema / physical representation;
- **O-06b-SPEC** — the physical representation of the already-accepted preservation contract (`O-06b-ARCH`, closed);
- physical trusted-generation provenance mechanisms;
- other representation/enforcement/test obligations from the JBA's Part P.1.

**B2S owns:**

- **O-06c** — the concrete reconciliation representation/algorithm conforming to the accepted architecture;
- other physical/enforcement/test obligations from the JBA's Part P.2.

**C2 remains later, and remains unauthorized:**

- **O-C-INDEPENDENCE**;
- **O-08**;
- **O-09**;
- `AnalysisProtocol` decisions.

**Separations that MUST NOT be recombined.** `O-06b-ARCH` (architecture, **closed**) and `O-06b-SPEC` (B1 representation, **open**) MUST NOT be recombined. `O-B-DISTINCTNESS` (B2, **closed**) and `O-C-INDEPENDENCE` (C2 / `AnalysisProtocol`, **open**) MUST NOT be recombined.

`O-10` opens only if a spec elects receiptless-winner recovery, defaulting to **none, fail closed**.

### 7.1 B1S status after JBA Amendment 01

- **B1S specification work remains authorized** (unchanged by Amendment 01; §6, §7 above).
- The previously produced **B1S V2 candidate did NOT achieve acceptance** — see §5.2 (`NON-AUTHORITATIVE SPECIFICATION EVIDENCE`, independent result `M3.5B-B1 EFFECTIVE SPEC V2 BLOCKED ON AUTHORITY`).
- **Amendment 01 repairs the narrow authority gap** exposed by that audit — the missing CD-3 reference role for `DC-06` manifest supersession (§3.2 above).
- A **corrected B1S specification may now be authored** against: JBA V1.9 (§3.1); JBA Amendment 01 (§3.2); and the rest of the accepted authority chain (§1–§3). It MUST NOT be baselined on the blocked B1S V2 candidate (§5.2).
- This does **not** declare **O-05** accepted, **O-06b-SPEC** accepted, **B1S** accepted, or **B1 implementation** authorized. Current state remains:

```
O-05          : B1S-owned / unresolved physically
O-06b-SPEC    : B1S-owned / unresolved physically
```

---

## 8. Repair provenance

| Item | Value |
| :-- | :-- |
| Repair | **R-B-17 — authority repair and canonicalization** |
| Mandated by | `PAGAMENOS_M3_5B_B_SEMANTIC_RATIFICATION_V1_3`, clause **R-B-17**; annotation obligation **O-12** |
| Record | `PAGAMENOS_R_B_17_AUTHORITY_REPAIR_REPORT.md` |
| Defects repaired | **AUTH-01** (A2 spec untracked), **AUTH-02** (this register stale at M0), **AUTH-03** (no B1/B2 split in formal authority), **AUTH-06** (rejected B1 had no accepted effective specification) |
| Implementation delta | **NONE.** Documentation and authority only — no runtime source, Prisma schema, migration, business logic, trusted-harness or application-behaviour change. |

### 8.1 Protected B integration provenance

| Item | Value |
| :-- | :-- |
| R-B-17 protected integration merge | `9fa869799aaa8295d5b82d4b268890ad80717a35` |
| Joint B Architecture V1.9 protected integration merge | `fe8ac7af8ee7feb3963e14b8c0e9b16875c4dedf` |
| Protected integration surface | both were integrated through the dedicated protected branch `m3.5b-b-integration` |

This entry is provenance only. It does not amend `PAGAMENOS_R_B_17_AUTHORITY_REPAIR_REPORT.md`, which remains the historical record of the R-B-17 repair as executed at the time.

---

## 9. A1/A2 → M7 Consent Compatibility Amendment 01 — upstream authority (M7 domain, not B)

This section records the **A1/A2→M7 Consent Compatibility Amendment 01** as authority in force, and the resulting status of the M7 (`Outcomes / Evidence`) domain. It is **upstream compatibility/security authority only**. It is **not** a new consent model, **not** an M7 domain specification, **not** M7 implementation authorization, **not** B authority, and **not** C authority. Nothing in this section modifies §3, §3.1, §3.2, `PAGAMENOS_M3_5B_B_SEMANTIC_RATIFICATION_V1_3`, `PAGAMENOS_M3_5B_B_ARCHITECTURE_CONTRACT_V1_9`/its Amendment 01, or **P-16**.

> **Correction notice.** An earlier root-sync candidate, `f8c7e09bc12603cdc3385606dd042b07ba1b3e9c`, is **NON-AUTHORITATIVE AUDIT EVIDENCE ONLY** (independent verdict: `POST M7 CONSENT AMENDMENT 01 ROOT AUTHORITY SYNC REQUIRES PATCH`; findings `ROOTSYNC-AUD-01`, `ROOTSYNC-AUD-02`). It incorrectly implied B1S design itself is blocked pending an M7 upstream dependency, and its reading rule omitted Amendment 01 and a future M7 specification. This section and the header reading rule supersede it; `f8c7e09…` is not an ancestor of this entry and carries no authority.

### 9.1 Accepted artifact — ACCEPTED, FORMALLY INTEGRATED

| Item | Value |
| :-- | :-- |
| Artifact | `PAGAMENOS_A1_A2_M7_CONSENT_COMPATIBILITY_AMENDMENT_01.md` |
| **Status** | **ACCEPTED — FORMALLY INTEGRATED** |
| Scope | ONLY the accepted A1/A2→M7 consent compatibility / capability boundary (§9.3 below) |
| Independent verdict | `A1/A2→M7 CONSENT COMPATIBILITY AMENDMENT 01 ACCEPT` |
| Historical capability findings | `15/15 CLOSED` (`CCA01F-AUD-01…06`, `CCA01C-AUD-01…06`, `CCA01S-AUD-01…02`, `CCA01-AUD-05`; see the artifact §46) |
| Accepted candidate commit | `d6434e4597a178fde45faf74da0298fdb5755d37` |
| Candidate / integration tree | `3a88b1f151de2aa038afdbcf9acd0ec17354ef39` |
| Artifact SHA-256 | `3a6003494f4817907401a9afda5b9d9a1647ade5ff9196f2aee2ba3b1b2ca1ad` |
| PR | `#14` |
| Formal protected integration merge | `f54d95abb0a8f7988626597a0eef01d0b0ae3c95` |
| Merge parents (in order) | 1. `a67758e6c18c692bc635db416af576356f03b48d` — 2. `d6434e4597a178fde45faf74da0298fdb5755d37` |
| Merge tree | `3a88b1f151de2aa038afdbcf9acd0ec17354ef39` |
| Post-merge required checks | `authority-gate` — SUCCESS; `verify` — SUCCESS (GitHub Actions app `15368`) |
| Protected integration surface | `origin/m3.5b-b-integration`, the same protected branch as §3.1/§3.2 (see §8.1) |

**Not to be described as:** a new consent model; an M7 domain specification; M7 implementation authorization; B authority; C authority.

Four prior candidates of this same amendment (`ce06bc9fc7cdbaa5299f84369c0b027e70d1d404`, `bc8a3a09593ed29167ca8b141d9e8a33b2e533ec`, `1a612019fff9ae9e7d6d2c2ad3ed091a26bb7136`, `c2218661581db9aae80703e99909af09cb7b9f73`) are **non-authoritative audit evidence only**; none is an ancestor of the accepted candidate `d6434e4…` (the artifact's own §2 records this exclusion). This amendment is a **later, narrow amendment** in exactly the same doctrine as §3.2: it has authority only for the scope it explicitly enumerates, and asserts no universal amendment doctrine.

### 9.2 Zero semantic delta

```
NEW CONSENT SEMANTICS           : 0
NEW A1 SEMANTICS                : 0
NEW A2 SEMANTICS                : 0
NEW M7 DOMAIN SEMANTICS         : 0
NEW B/C SEMANTICS               : 0
```

The amendment packages compatibility/security authority only — an executor capability contract (a single allowlisted DB-reaching edge) and a transaction/assignment-owner allowlist — over the already-accepted A1 consent predicate, RT-17 optional-evidence condition, and A2 capability boundary. It redesigns none of them. This correction patch restores existing B/JBA authority rather than changing it, and adds no new consent, A1, A2, M7-domain, or B/C semantics beyond §9.1's registration.

### 9.3 M7 consent-authority dependency — CLOSED

The blocked M7 V1 candidate (§9.4) recorded its consent-compatibility upstream dependency as **`DEP-03`**: *"an A1/A2 amendment adding an M7 consent capability"* (`PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1.md`, negative evidence only — see §9.4). **`DEP-03` is CLOSED** by the accepted Amendment 01 (§9.1); it is not reopened by this patch. At minimum:

- a canonical, transactional, A1-owned consent-compatibility surface is authorized (sealed operation-specific entry points; no callback, port, façade, Prisma transaction, `purpose` argument, or detachable authorization result reaches M7);
- RT-17 `optionalEvidenceConsent` authorization can be enforced internally without exposing raw consent material to M7;
- a sealed operation/capability topology is accepted (fixed trusted executor; exact operation-specific tracked-adapter interface; hidden `TransactionClient`);
- the executor DB-capability escape (`CCA01S-AUD-01`) is closed structurally — the executor's dependency closure has exactly one DB-reaching edge;
- the accepted A1/A2 owners of consent, temporal semantics, and existing transaction/assignment sites are preserved unchanged;
- all 15 historical capability findings are closed (§9.1 above).

This closure does **not** mean M7 V1 is accepted (§9.4).

### 9.4 M7 Effective Spec V1 — status unchanged

```
M7 EFFECTIVE SPEC V1: BLOCKED / NON-AUTHORITATIVE
```

`PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1.md` (candidate commit `a2d18357a5fd9a699da0efaf69b4185eb9db8b01`) remains **`BLOCKED / NON-AUTHORITATIVE`**. Closing its `DEP-03` consent-compatibility dependency (§9.3) does **not** accept it: its remaining independent-audit findings (§9.6) still require correction in a new M7 specification candidate. It is recorded here as **negative/reference evidence only** — its useful content may be re-derived or restated by a future candidate, but it is not, and does not become, an accepted ancestor.

```
a2d18357a5fd9a699da0efaf69b4185eb9db8b01 TREATED AS NON-AUTHORITATIVE: YES
```

### 9.5 M7 Effective Spec V1.1 — design authorized, implementation not authorized

```
M7 EFFECTIVE SPEC V1.1 DESIGN: AUTHORIZED
M7 IMPLEMENTATION AUTHORIZED : NO
```

A new M7 V1.1 specification candidate may now be authored, from the current accepted protected authority tip (merge `f54d95abb0a8f7988626597a0eef01d0b0ae3c95`), addressing the remaining audit obligations of §9.6. This authorizes **specification-design work only** — it is not M7 implementation authorization.

**Lineage rule.** M7 V1.1 MUST be authored fresh from the accepted protected authority lineage that contains Amendment 01 (the tip identified in §9.1). It MUST NOT descend from the blocked M7 V1 candidate `a2d18357a5fd9a699da0efaf69b4185eb9db8b01` (§9.4). That candidate's useful content may be re-derived or restated; it is not an accepted ancestor.

### 9.6 M7 V1.1 — remaining audit obligations (excluding the closed consent dependency)

Not redesigned here; recorded only as the families a corrected M7 V1.1 candidate must still address, per the prior M7 V1 independent audit, now that `DEP-03` (§9.3) is closed. **None of these is closed by this entry:**

- fixed merchant-universe overreach;
- trusted participant / uploader / object-store capability;
- `SECURITY DEFINER` / `search_path` safety (candidate identifier `CP-05` — negative evidence only);
- deletion authorization proof;
- executable / complete DDL;
- storage staging / race / reconciliation;
- evidence correction model;
- role provisioning (candidate identifier `DEP-08` — negative evidence only);
- persisted-class / candidate accounting;
- independently reviewed / published control-plane manifest and selector rotation.

### 9.7 B1S / B1 status — S-2 grounding dependency, corrected

The rejected candidate `f8c7e09…` (see the correction notice above this section) incorrectly stated that B1S itself "remains blocked on an installed/accepted M7 upstream dependency until M7 is specified, implemented, independently accepted, and formally integrated." That is **not** what the accepted Joint B Architecture V1.9 requires. JBA V1.9 already defines a complete two-path structure for **S-2** (`Outcome`, the M7 VS ladder) — this patch restates it, it does not create it:

- **Path A — S-2 grounding.** If a B1S candidate wants S-2 observations to count as grounding evidence — i.e. `SOURCE_GROUNDING_ELIGIBLE` (JBA §9.3.2) — it requires the accepted **M7 ingestion integration contract**, under which B1S obtains re-provable trusted-generation provenance (`DB-03B`) for the M7 `Outcome` write path (JBA definitions table, "M7 ingestion integration contract"; §18.4.7). That contract does not yet exist: no M7 effective specification is accepted (§9.4, §9.5).
- **Path B — S-2 non-grounding (default, complete).** If that M7 contract is unavailable, or a B1S candidate elects not to consume it, JBA V1.9 already requires **all S-2 observations to remain non-grounding**: preserved as provenance, `SOURCE_GROUNDING_ELIGIBLE = FALSE`, no candidate emitted, no occurrence support, the deficiency recorded (JBA §9.3.2, "The S-2 case, resolved"; `TE-7`; `CE-2`/`CE-3`). **This path is complete**, and B1S design MAY proceed under it without any M7 dependency.

```
ABSENT M7 TRUSTED-GENERATION CONTRACT: DEPENDENCY, NOT B1S BLOCKER
B1S DESIGN MAY PROCEED WITH S-2 NON-GROUNDING DEFAULT
B1S DESIGN: MAY PROCEED UNDER ACCEPTED NON-GROUNDING PATH
```

**This does not authorize B1 implementation.** B1S remains specification-design work; B1 **implementation** remains separately gated by **P-16** (§5.1) — the unresolved B1↔B2 cross-contract condition — regardless of which S-2 path a B1S candidate elects, and regardless of Amendment 01's integration.

```
B1 IMPLEMENTATION AUTHORIZED: NO
P-16                        : ACTIVE
```

**Scope of this correction.** It applies **only** to the JBA S-2/B1S grounding dependency. It does **not** state that M7, as a project milestone, is unnecessary: M7 retains its own authorized specification-design path (§9.5) and remains required for its own project/scientific obligations (evidence-backed outcomes, S-2 grounding for any B1S candidate that elects to use it, and every remaining audit family in §9.6). "M7 not required for the B1S non-grounding default path" MUST NOT be read as "M7 not required at all."

### 9.8 Implementation authorization matrix

```
M7 SPEC V1.1 DESIGN   : YES
M7 IMPLEMENTATION     : NO
B1S DESIGN            : YES — MAY use the accepted S-2 non-grounding default (§9.7) absent an
                         accepted M7 trusted-generation contract; MAY instead pursue Path A if
                         and when such a contract is accepted
B2S DESIGN            : per existing JBA / P-16 sequencing (§6, §7) — unchanged by this entry
B1 IMPLEMENTATION     : NO
B2 IMPLEMENTATION     : NO
C1 IMPLEMENTATION     : NO
C2 IMPLEMENTATION     : NO
P-16                  : ACTIVE
```

This matrix records status already established by §6, §7 and §9.1–§9.7; it authorizes nothing beyond them.

### 9.9 Machine-readable authority baseline — unchanged

Consistent with §2.4: this documentation sync does **not** invent or rotate `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA`. If M7 later requires selector rotation, that remains a future implementation/acceptance obligation, not asserted by this entry.

# PagaMenos — Specification Authority & Implementation Authorization

This file is the **root authority register**. It records which specification documents are authoritative, their precedence, the independent closure verdicts, the accepted implementation SHAs, and the current implementation authorization. It does **not** restate or modify the specifications.

**Last repaired:** the **R-B-17 authority repair** — see `PAGAMENOS_R_B_17_AUTHORITY_REPAIR_REPORT.md`.
**Latest authority progression:** the formal integration of the **Joint B Architecture V1.9** (§3.1), through the protected `m3.5b-b-integration` surface (§8.1).
**Controlling B semantic authority:** `PAGAMENOS_M3_5B_B_SEMANTIC_RATIFICATION_V1_3.md` (status **ACCEPTED**).
**Controlling B architecture authority:** `PAGAMENOS_M3_5B_B_ARCHITECTURE_CONTRACT_V1_9.md`, the **Joint B Architecture** (status **ACCEPTED**, formally integrated; §3.1). It is **subordinate to, and does not replace,** the B Semantic Ratification V1.3.

> **Reading rule.** When two artifacts appear to conflict, resolve in this order: (1) §1 base study authority, by its own internal precedence; (2) §2 accepted milestone specifications, each governing its own milestone; (3) §3 B semantic authority, for the B phase only and subject to §1; (4) §3.1 the Joint B Architecture, for the shared B1/B2 architecture only and subject to §3; (5) any future accepted B1S/B2S effective specification, subject to §3.1. An artifact listed in §5 is **never** authority.

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

---

## 4. Formal B phase spine

```
A1  Protocol / Cohort                                    ACCEPTED
A2  Intent / Decision                                    ACCEPTED
B1  Purchase Observation / Occasion Candidate Identity   ARCHITECTURE ACCEPTED (JBA V1.9, see section 3.1)
                                                          EFFECTIVE SPEC (B1S): NOT YET ACCEPTED
                                                          IMPLEMENTATION: NOT AUTHORIZED
B2  Purchase Occasion & Exposure Reconciliation          ARCHITECTURE ACCEPTED (JBA V1.9, see section 3.1)
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

---

## 6. Current implementation authorization

- **Accepted and implemented:** M0, M1, M2, M3, M3.5A, M3.5B-A1, M3.5B-A2.
- **Joint B Architecture V1.9:** **ACCEPTED AND FORMALLY INTEGRATED** (§3.1). Downstream **B1 and B2 effective-specification** work (B1S, B2S) is now authorized to begin. See §7.
- **Not authorized by JBA acceptance alone:** B1 implementation; B2 implementation. Implementation remains unauthorized until the applicable effective specification (B1S or B2S) is **independently accepted** and every applicable gate — including §6.2's standing engineering pre-condition — is satisfied.
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

---

## 7. Accepted Joint B Architecture — downstream ownership

```
M3.5B-B ARCHITECTURE CONTRACT — B1+B2   (the "Joint B Architecture")
Status: ACCEPTED AND FORMALLY INTEGRATED — V1.9 (see section 3.1)
```

The Joint B Architecture is the **first artifact of the B chain**; B1 and B2 effective specifications derive from it, and implementation derives from those. Dependencies run **one direction only**: `JBA → B1S / B2S → implementation`. This register does not restate JBA content; the JBA itself (§3.1) is authority for its own reasoning.

**Closure.** The thirteen JBA-owned open items formerly listed here — `O-01`, `O-02`, `O-03`, `O-04`, `O-06a`, `O-06b-ARCH`, `O-B-DISTINCTNESS`, `O-11`, `O-13`, `O-14`, `O-15`, `O-16`, `O-17` — are **`13 / 13` CLOSED VALIDLY**, and **`O-06a`** is separately **CLOSED VALIDLY** against its own eighteen-function standard. The hard architecture-gate condition (§8.3 of the ratification) — removing the ambiguity in *"one `Outcome` per occasion/Decision"* by distinguishing the **purchase-decision occasion** (A2 / RT-09) from the canonical **`PurchaseOccasion`** (B2) — is **closed**. **No JBA-owned semantic decision remains open for B1S or B2S to make.**

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

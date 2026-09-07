# PagaMenos — Authority Archive

> # HISTORICAL / NON-NORMATIVE
>
> **Everything under `docs/authority/archive/` is retained as audit evidence only.**
> No file in this tree is active authority. No file here may drive implementation, review, or gating.
> Supersession language inside these files is **non-operative**. For the historical **A2** revision chain the full neutralization register is Appendix B of `PAGAMENOS_M3_5B_A2_EFFECTIVE_SPEC_CANONICAL_V1.md`; that appendix governs the **A2 chain only**. For the **A1** and **B** families, status is recorded in `PAGAMENOS_SPEC_AUTHORITY.md` §3 and §5 and in the per-family sections below.

The active normative hierarchy is defined by **`PAGAMENOS_SPEC_AUTHORITY.md`** at the repository root. This archive exists so the historical revision chains remain auditable after the **R-B-17 authority repair** (`PAGAMENOS_R_B_17_AUTHORITY_REPAIR_REPORT.md`).

Do not confuse this documentation archive with `authority/`, the **protected trust path** that holds the machine-readable authority-baseline artifacts (`AUTHORITY_BASELINE_MANIFEST_V1.json`, `CORPUS_RELEASE_LEDGER_V1.json`, `HOLIDAY_CALENDAR_REGISTRY_V1.json` and the holiday-calendar fixture). **Those artifacts are not in this repair tree** — `git ls-tree -r HEAD authority/` returns nothing here. They live in the separately selected authority-baseline commit named by the protected external selector `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA`; see `PAGAMENOS_SPEC_AUTHORITY.md` §2.4. Nothing in this documentation archive is read by CI.

---

## Archive contents

Each archived file carries a clearly separated `R-B-17 ARCHIVAL HEADER` block. Its body below the `R-B-17 ARCHIVAL HEADER - END` marker is the original file **byte for byte**; the header records the pre-archival SHA-256 so this can be verified independently:

```bash
tail -n +23 <archived-file> | sha256sum
```

### `m3.5b-a2/` — A2 effective-specification chain

**Active replacement:** `PAGAMENOS_M3_5B_A2_EFFECTIVE_SPEC_CANONICAL_V1.md` (repository root).

| Archived file | Status | Role in the accepted chain |
| :-- | :-- | :-- |
| `PAGAMENOS_M3_5B_A2_EFFECTIVE_SPEC_V1.md` | HISTORICAL | superseded before the accepted chain |
| `PAGAMENOS_M3_5B_A2_EFFECTIVE_SPEC_V2.md` | HISTORICAL | superseded before the accepted chain |
| `PAGAMENOS_M3_5B_A2_EFFECTIVE_SPEC_V3.md` | HISTORICAL | superseded before the accepted chain |
| `PAGAMENOS_M3_5B_A2_EFFECTIVE_SPEC_V4.md` | HISTORICAL | **architectural spine** of the accepted chain |
| `PAGAMENOS_M3_5B_A2_EFFECTIVE_SPEC_V4_1.md` | HISTORICAL | bounded patch — DG-01 (Model A), DG-03, H02, H03, V4-NEW-01 |
| `PAGAMENOS_M3_5B_A2_EFFECTIVE_SPEC_V4_2.md` | HISTORICAL | bounded patch — DG-02, H03, V4-NEW-01; embeds Holiday Fixture v1 |
| `PAGAMENOS_M3_5B_A2_EFFECTIVE_SPEC_V4_3.md` | HISTORICAL | two corrections — corpus `provenance.observedAt`; portfolio comparator |
| `PAGAMENOS_M3_5B_A2_EFFECTIVE_SPEC_V4_4.md` | HISTORICAL | one correction — `provenance.sourceId` / `url` to INCLUDE |
| `PAGAMENOS_M3_5B_A2_EFFECTIVE_SPEC_V4_5.md` | HISTORICAL | one correction — `RuleOperationalState.asOf` / `note` to INCLUDE |

> **Reading warning.** V4.1 through V4.5 each claim to "fully supersede" all earlier revisions. **That claim is literally false.** V4.5 is a 177-line two-field patch; V4 is the 779-line architecture. The accepted A2 authority was the ordered union `V4 ∪ V4.1 ∪ V4.2 ∪ V4.3 ∪ V4.4 ∪ V4.5`. That union is now written once, as the canonical A2 specification. Read the canonical document, not these.

### `m3.5b-a1/` — superseded A1 drafts

**Active replacement:** `PAGAMENOS_M3_5B_A1_EFFECTIVE_SPEC_V2_1.md` (repository root, tracked since before this repair).

| Archived file | Status |
| :-- | :-- |
| `PAGAMENOS_M3_5B_A1_EFFECTIVE_SPEC_V1.md` | HISTORICAL / NON-NORMATIVE |
| `PAGAMENOS_M3_5B_A1_EFFECTIVE_SPEC_V2.md` | HISTORICAL / NON-NORMATIVE |

### `m3.5b-b/` — B ratification history and the blocked B1 diagnostic

**Accepted B semantic authority:** `PAGAMENOS_M3_5B_B_SEMANTIC_RATIFICATION_V1_3.md` (repository root).

| Archived file | Status |
| :-- | :-- |
| `PAGAMENOS_M3_5B_B_SEMANTIC_RATIFICATION_V1.md` | SUPERSEDED HISTORICAL REVIEW ARTIFACT — NON-NORMATIVE |
| `PAGAMENOS_M3_5B_B_SEMANTIC_RATIFICATION_V1_1.md` | SUPERSEDED HISTORICAL REVIEW ARTIFACT — NON-NORMATIVE |
| `PAGAMENOS_M3_5B_B_SEMANTIC_RATIFICATION_V1_2.md` | SUPERSEDED HISTORICAL REVIEW ARTIFACT — NON-NORMATIVE |
| `PAGAMENOS_M3_5B_B1_EFFECTIVE_SPEC_V1.md` | **BLOCKED DIAGNOSTIC / DECISION INPUT — NON-NORMATIVE** |

`PAGAMENOS_M3_5B_B1_EFFECTIVE_SPEC_V1.md` is a diagnostic and decision input. It is **not** a B1 effective specification, it does **not** compete with the accepted V1.3 ratification, and it MUST NOT be cited as authority. Its legacy label **`B1 Opportunity Identity` is superseded and MUST NOT be used in new normative artifacts**; the ratified label is **`B1 — Purchase Observation / Occasion Candidate Identity`**.

---

## Rejected implementation evidence (not in this archive)

The rejected B1 implementation is **not** a file. It is a commit, preserved in Git history and on `origin/m3.5b-b1-implementation`:

```
commit a586b3119da2cc1aa4668485b129dbe625ab5cae
tree   ae31d6649303d04bd334ef1bf93ec56b915d39fe
status REJECTED IMPLEMENTATION EVIDENCE - NON-AUTHORITATIVE
```

It MUST NOT be treated as B semantic authority or as an implementation baseline (accepted V1.3 §4.4(a), prohibition **P-17**). It is deliberately **not deleted** from history.

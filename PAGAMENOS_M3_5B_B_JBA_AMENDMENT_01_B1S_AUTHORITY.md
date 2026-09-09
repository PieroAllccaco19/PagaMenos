# PAGAMENOS — M3.5B-B JBA NARROW AMENDMENT 01 (CORRECTED CANDIDATE)

**Nature:** **DOCUMENT-ONLY AUTHORITY AMENDMENT CANDIDATE.** No implementation, no code, no migrations, no runtime change, no schema change, no CI change, no `authority/` namespace change. This artifact does not implement B1. It does not patch the B1 Effective Spec V2. It does not modify JBA V1.9 in place.
**Status:** **CANDIDATE — NOT FINAL AUTHORITY.** Becomes authority only on independent acceptance.
**Supersedes:** the prior, independently audited amendment candidate at commit `45a55c8dbfd6aa73ddfc380b809ec3e116401956` (verdict: `JBA NARROW AMENDMENT 01 REQUIRES PATCH`). That candidate is **non-authoritative** and is **not an ancestor of this document's commit**. This is a clean rewrite authored directly from the accepted controlling authority and the independent audit findings — it does not carry that candidate's text forward.
**Parent commit:** `dfb6c41d1ebcba7a05051302ca6bd34fc8e8b0a8` (`origin/m3.5b-b-integration`).

---

## 0. Controlling authority read in full

This amendment was authored after reading, in full, at the parent commit:

1. `PAGAMENOS_SPEC_AUTHORITY.md` — the root authority register.
2. `PAGAMENOS_M3_5B_B_SEMANTIC_RATIFICATION_V1_3.md` — the controlling B semantic authority (ACCEPTED).
3. `PAGAMENOS_M3_5B_B_ARCHITECTURE_CONTRACT_V1_9.md` — the accepted Joint B Architecture, **JBA V1.9** (ACCEPTED; the "JBA" referred to throughout this document).

**Accepted JBA V1.9 identity (verified, unchanged by this amendment):**

| Item | Value |
| :-- | :-- |
| Blob SHA-1 | `22147802489cc13cd6e8ed842e8de9c39e76a80a` |
| Content SHA-256 | `e10b9afdf61f8d6dc0b907cfdfc6eb00ce4059eac7dcca3cd41a1e8902ce5b1b` |

This amendment changes **zero bytes** of that file. Every clause below is a *reading overlay* external to it, scoped exactly as §4 states.

---

## 1. Scope of this amendment

This is a **narrow semantic amendment** to the accepted Joint B Architecture (JBA V1.9), raised against exactly four questions the independent semantic audit put to the accepted authority (Q1–Q4 below), plus the consequential §9.3.8/AM-10 question (Q5). It authorizes **no B1 implementation**, **no B1S patch**, and **no change to the B1 Effective Spec V2** (`9fa9d0e9…`, blocked). It introduces **exactly one** new CD-3 reference role and **zero** new §9.3.8 persisted classes.

---

## 2. Accepted narrow semantic delta (Q1–Q5)

### Q1 — Source correction/retraction

Source correction/retraction is represented using the **existing** CD-3 row 16 relation — *"Source-native relation record → the two assertions it relates"* (**mere provenance**) — as a **typed, ordered, source-native relation**. **No new `SourceObservation → SourceObservation` reference role is authorized.** JBA V1.9's existing row 16 already covers this; this amendment adds no row for it.

### Q2 — Candidate identity stability

**One stable candidate identity survives correction, retraction, or revision of the same underlying assertion.** Correction/retraction of a source observation does not retire or replace the `OccasionCandidate` identity grounded in it; it is represented at the source layer (Q1), not by a candidate-to-candidate edge. **No `OccasionCandidate → OccasionCandidate` supersession role is authorized.**

### Q3 — Candidate grounding and decomposition structure

**Every candidate, decomposed or direct, cites its grounding `SourceObservation` under the existing CD-3 row 1 semantic citation** (`OccasionCandidate → its grounding SourceObservation`). Where a candidate arises from decomposition, the container/member structure is carried exclusively by the existing **`DecompositionManifest → its member candidates and container observation`** structural endpoint relation (CD-3 row 13, governed by DC-02, DC-03, DB-06). **No `OccasionCandidate → DecompositionManifestMember` reference role is authorized.** A decomposed candidate's grounding citation (row 1) and its manifest membership (row 13) remain two distinct, already-classified edges; this amendment does not merge them and does not add a third.

### Q4 — Manifest supersession (the one substantive addition)

**Exactly one new reference role is required**, to represent the manifest-level supersession already required, in prose, by `DC-06` (§17.3): *"A changed decomposition … is a new operation with a new manifest, appended and explicitly superseding the prior, never an in-place edit of the member set."* `DC-06` requires this edge to exist; CD-3, as accepted, has no row for it. This amendment supplies exactly that row and nothing else.

#### CD-3 row 25 (new)

| # | Reference (from → to) | Kind | Eligibility edge? | Governing rule |
| :--: | :-- | :-- | :--: | :-- |
| **25** | **`DecompositionManifest`(new) → `DecompositionManifest`(prior)** that it explicitly supersedes | **structural endpoint relation** | **no** | `DC-06`; structural well-formedness of manifest-operation lineage |

**Normative meaning, exactly as narrowly accepted:**

- the prior target **MUST** resolve to an existing, already-persisted `DecompositionManifest`;
- the prior **MUST** be logically prior to the new manifest;
- the edge is an **`SG-R`** obligation of the new manifest (§9.4.1) — structural well-formedness, not eligibility;
- it creates **no eligibility dependency** (CD-2) and is **not** a `CitationDependencyGraph` edge;
- it has **no candidate-validity effect, no candidate-count effect, and retires no candidate** — the member candidates minted under the prior manifest (DC-03) are untouched;
- it carries **no truth/winner/current semantics** — both manifests remain equally real historical facts; there is no "current manifest" projection;
- the prior manifest **remains readable**, in full, indefinitely (subject only to §16's controlling legal-deletion override, unchanged by this amendment);
- it is **append-only**: the new manifest is a new row; the prior manifest and its member mapping are **never edited in place** (DC-04, DC-06).

**What this amendment does NOT add**, because the independent semantic audit did not accept it and the accepted `DC-06` concepts `new` and `prior` already make it unnecessary:

- no same-container requirement;
- no single-successor rule (a prior manifest may in principle be pointed to by more than one later structural record without this amendment resolving that as a conflict — `DC-06`'s own "new operation" discipline, not this row, governs when a new manifest is warranted);
- no latest-wins, preferred-manifest, or current-manifest-projection semantics;
- no winner/loser language of any kind.

`DC-06`'s own accepted vocabulary (`new`, `prior`, *"explicitly superseding"*) already renders a **self-reference** (a manifest superseding itself) and a **directed supersession cycle** (two or more manifests superseding one another in a loop) semantically invalid — a manifest cannot be logically prior to itself or to an ancestor of itself. This amendment asserts that reading; it does not invent it. **Physical enforcement of that invalidity (e.g. a write-time check analogous to `DB-08c`'s layer check) remains B1S-owned** — exactly as every other CD-3 row's physical enforcement is B1S/B2S-owned under JBA V1.9 (§9.4.1, `AM-10b`).

### Q5 — §9.3.8 persisted-class impact

```
NEW §9.3.8 PERSISTED CLASSES REQUIRED: 0
```

Row 25 connects two existing, already-registered `DecompositionManifest` records (§9.3.8.1 row 6). It mints no new logical entity. See §9 below for the full §9.3.8/AM-10 treatment.

---

## 3. What this amendment explicitly does not touch

Unchanged, not reopened, not narrowed, not extended by this amendment:

- the source taxonomy (§9.3.1 and related);
- **E-1 / E-2 / E-3**;
- **CE-1 … CE-7**;
- **DB-03A**; **DB-03B**;
- `PurchaseOccasion` establishment (B2, R-B-02, R-B-03);
- real-world distinctness (`O-B-DISTINCTNESS`, B2);
- B2 reconciliation (`O-06c`, B2S);
- legal/consent deletion (§16, O-17, P-05/P-05a);
- timestamp semantics (R-B-12, P-08);
- **C1**; **C2**; `AnalysisProtocol`; numerator; denominator; opportunity threshold (§4.5 of the ratification; P-06, P-07, P-12a).

```
NEW B2 SEMANTICS: 0
NEW C1/C2 SEMANTICS: 0
```

---

## 4. Precedence — two closed amendment surfaces

JBA V1.9 remains accepted authority in full. This amendment has later B-scoped authority **only** for:

1. **the two substantive semantic changes explicitly enumerated in §2 above** — CD-3 row 25 (Q4), and the minimal `DC-06` binding to it (§9 below); and
2. **the closed set of consequential mechanical current-reading overlays explicitly enumerated in §6 below** — each a JBA V1.9 surface whose literal count or enumerated range becomes false **purely because row 25 now exists**, with no semantic content of its own beyond restating the new total.

**Every other JBA V1.9 clause remains unchanged.** This amendment does not assert that only "semantic sections" receive later authority — the mechanical overlays in §6 are equally binding, for exactly the locations enumerated there and no others. There is no open-ended "and any other affected clauses" language anywhere in this document: the overlay set in §6 is closed, explicit, and was produced by a full-text search of the accepted JBA (§13), not by inference.

---

## 5. Exact effective CD-3 partition, after this amendment

```
RESULTING CD-3 ROLE COUNT: 25
```

| Kind | Rows |
| :-- | :-- |
| Semantic citation | 1–10 (unchanged) |
| Structural endpoint relation | 11–14 and **25** |
| Mere provenance | 15–24 (unchanged) |

Rows 1–24 are **byte-identical** to JBA V1.9 as accepted. Row 25 is newly introduced by this amendment and is a **structural endpoint relation**, not provenance.

---

## 6. Required mechanical overlay — closed set

Each row below is a JBA V1.9 location whose **literal current reading** becomes false purely as an arithmetic/enumeration consequence of row 25 existing, together with the corrected effective reading. **No other JBA location is affected.** Classification column: every row here is **mechanical** (a count/range correction); §2 carries the **semantic** content.

| # | JBA location | Baseline reading | Effective amended reading | Reason | Class |
| :-- | :-- | :-- | :-- | :-- | :-- |
| **M-01** | §9.3.5.1, CD-3 footer ("Nothing is left to…", the sentence following the CD-3 table) | "Rows 1–10 are the complete set of eligibility edges. **Rows 11–14** are structural obligations of the referring record. Rows 15–24 are preserved and inert for eligibility purposes." | "…**Rows 11–14 and 25** are structural obligations of the referring record. Rows 15–24 are preserved and inert for eligibility purposes." | Row 25 is a structural endpoint relation; the footer's structural range must include it | Mechanical |
| **M-02** | §9.3.8.2, registry row 6 (`DecompositionManifest`, column 6 "Citation participation") | "**neither** — CD-3 row 13 is structural" | "**neither** — **CD-3 rows 13 and 25 are structural**" | `DecompositionManifest` now also participates in CD-3 as the endpoint of row 25 (both as the new-side writer and as the prior-side target); the class still cites nothing semantically and has no eligibility dependency through either structural edge | Mechanical |
| **M-03** | §19.5, threat **AT-31**, clause (iii) | "A preserved provenance reference (CD-3 rows 15–24) and a structural endpoint relation (**rows 11–14**) arranged in a loop must NOT be detected as a citation cycle and must NOT affect eligibility" | "…and a structural endpoint relation (**rows 11–14 and 25**) arranged in a loop must NOT be detected as a citation cycle and must NOT affect eligibility" | A row-25 manifest-supersession loop is, like rows 11–14, not a `CitationDependencyGraph` edge at all, so AT-31(iii)'s test surface must name it. **This overlay creates no valid supersession-cycle semantics.** A malformed row-25 cycle (a manifest made logically prior to itself or to its own ancestor) fails **structural well-formedness under `SG-R`/`DC-06`** at the point it is written or read — it is rejected as a defect, exactly as an `ADJUDICATION_SUPERSESSION` self-reference is rejected under rows 11/`SG-01`…`SG-07` today. It does **not** become a `CitationDependencyGraph` cycle, because row 25 is not a citation. The citation-cycle rules themselves (CD-7, CD-8, AT-31(i)/(ii)/(iv)) are **not altered** | Mechanical |
| **M-04** | Part D, `JBA16-AUD-01` closure-matrix row, "V1.8 repair" column | "CD-3 is a closed classification table over **all twenty-four reference roles** the architecture admits, sorting each into semantic citation (rows 1–10…), mere provenance (rows 15–24…) or structural endpoint relation (**rows 11–14**, an `SG-R` obligation)" | "…over **all twenty-five reference roles**…structural endpoint relation (**rows 11–14 and 25**, an `SG-R` obligation)" | Same closed-classification claim, now stated for the current total | Mechanical |
| **M-05** | Part E, `JBA16-AUD-01` re-proof row ("Re-proof against the original defect" column) | "The edge set is now closed (CD-3 enumerates **all twenty-four** reference roles)" | "The edge set is now closed (CD-3 enumerates **all twenty-five** reference roles)" | Same closure claim, corrected total; no other content of this row changes | Mechanical |
| **M-06** | Part F §F.1, completeness matrix, row 3 ("citation dependency graph") | "CD-3's closed classification of **all twenty-four** reference roles" | "CD-3's closed classification of **all twenty-five** reference roles" | Same completeness claim, corrected total | Mechanical |
| **M-07** | Part O, **CG17-1** | "CD-3 enumerates **all twenty-four** reference roles the architecture admits and assigns each to semantic citation (rows 1–10), mere provenance (rows 15–24) or structural endpoint relation (**rows 11–14**)" | "CD-3 enumerates **all twenty-five** reference roles…or structural endpoint relation (**rows 11–14 and 25**)" | CG17-1's proof text is a direct restatement of the CD-3 total and structural range; both must carry the correction. **CG17-1's overall contradiction-gate proof is otherwise unaffected**: row 25 creates no eligibility dependency and therefore cannot introduce a contradiction into `CITATION_SOUND`'s range (CS-7, unchanged) | Mechanical |
| **M-08** | Part Q §Q.2, final status block, `JBA16-AUD-01 citation` entry | "CD-3 closed classification of **all 24** reference roles into semantic citation / mere provenance / structural endpoint" | "CD-3 closed classification of **all 25** reference roles into semantic citation / mere provenance / structural endpoint" | Same status-block total, corrected | Mechanical |

---

## 7. Required unchanged surfaces — explicitly distinguished

The following JBA V1.9 locations contain the digits/words "twenty-four" or the range "15–24" but are **NOT** part of the overlay in §6, and this amendment explicitly confirms each remains unchanged, with the reason:

| # | JBA location | Text | Why unchanged |
| :-- | :-- | :-- | :-- |
| **U-01** | Part A, V1.6-audit-acceptance sentence ("the twenty-four previously frozen areas are all accepted and carried") | "twenty-four previously frozen areas" | This counts **historically accepted audit areas** (Part E's non-regression set), not CD-3 reference roles. It is a different register entirely and is untouched by a CD-3 addition |
| **U-02** | Part E, non-regression header ("The independent audits accepted twenty-four areas…") | "twenty-four areas" | Same historical-acceptance-area count as U-01, not a CD-3 count. Unchanged |
| **U-03** | §9.3.5.1 CD-3 table and footer (M-01); AT-31(iii) (M-03); Part D (M-04); CG17-1 (M-07); O-06b-ARCH closure (U-04); CDT-4 (U-05) | "CD-3 rows 15–24" | This is the **mere-provenance range**, and it is **complete and correct as 15–24**. Row 25 is a **structural endpoint relation**, not provenance, so the provenance range is NOT extended to 15–25 anywhere in this amendment |
| **U-04** | Part F, `O-06b-ARCH` closure row ("CD-3 rows 15–24 confirm that every preserved reference is inert for eligibility") | "CD-3 rows 15–24" | Specifically discussing the **preserved-provenance** set that backs the B1→B2 preservation contract. Row 25 is structural, not a preserved provenance reference, so this statement needs no change and remains correct exactly as written |
| **U-05** | Part K.5, `CDT-4` ("a loop of preserved provenance references…CD-2, CD-3 rows 15–24, CS-7") | "CD-3 rows 15–24" | `CDT-4`'s provenance-loop case is about rows 15–24 specifically; row 25 is not a provenance reference, so `CDT-4`'s citation to "rows 15–24" remains correct. (Its sibling case — a structural-endpoint loop, now including row 25 — is exactly what M-03's AT-31(iii) overlay covers; `CDT-4` itself is not edited) |

No other "twenty-four" or "15–24" occurrence exists in JBA V1.9 beyond the eight locations disposed of in §6 and the five disposed of here — see the full-file search in §13.

---

## 8. Removed false claims

This corrected candidate contains **none** of the following claims that appeared, or could be read into, the prior non-authoritative candidate (`45a55c8…`):

- it does **not** assert "no other occurrence asserts current CD-3 totality" as a bare conclusion — §13 instead reproduces the complete search-and-classification table that proves it;
- it does **not** assert that CG17-1 is "unaffected" — §6 M-07 treats CG17-1 as a required overlay location, because CG17-1 restates both the CD-3 total and the structural row range;
- it does **not** assert that mechanical overlays "have no precedence authority" — §4 states the opposite: the closed mechanical-overlay set in §6 has later B-scoped authority exactly as the semantic edits in §2 do;
- it does **not** assert that structural endpoint relations "remain only rows 11–14" anywhere — every location that made that claim (§6 M-01, M-03, M-04, M-07) is corrected to "rows 11–14 and 25".

---

## 9. §9.3.8 / AM-10 treatment

```
NEW §9.3.8 PERSISTED CLASSES REQUIRED: 0
```

- Row 25 connects two **existing** rows of §9.3.8.1's already-registered class 6, `DecompositionManifest`. It introduces no new logical entity requiring a §9.3.8 row of its own.
- Receipts and manifest provenance remain under the existing registry/CD-3 treatment (§9.3.8.1 row 6; §17.1–§17.3); nothing here reopens receipt semantics.
- **One logical registered class may have more than one physical relation** where those relations introduce no independently meaningful B record semantics — exactly the case here: `DecompositionManifest`'s row-25 self-referential structural edge is a relation *of* the existing class, not a new class.
- Roles, functions, triggers and constraints that enforce row 25's `SG-R` well-formedness (e.g. a write-time check rejecting a self-referential or cyclic "prior" pointer) are **physical enforcement constructs**, not automatically B-persisted record classes in their own right — consistent with how `DB-08c` enforces `CD-01` for rows 1–14 today without itself being a §9.3.8 row.
- **`AM-10` remains mandatory** for any future independently meaningful persisted B class. This amendment does not relax, narrow, or reinterpret `AM-10` or `AM-10a`/`AM-10b`.

**This document does not mandate any physical PostgreSQL implementation.** Representation, constraint design, and the write-time `SG-R` check for row 25 remain **B1S-owned**, exactly as every other CD-3 row's physical enforcement is B1S/B2S-owned (§7 of `PAGAMENOS_SPEC_AUTHORITY.md`; JBA V1.9 Part P.1).

---

## 10. Minimal `DC-06` binding

Exactly the accepted narrow clarification, and nothing more:

> The explicit manifest supersession required by `DC-06` is represented by CD-3 row 25: `DecompositionManifest`(new) → `DecompositionManifest`(prior). It is a structural endpoint relation, creates no eligibility dependency, is appended with the new operation, and edits no prior manifest or candidate in place.

No same-container requirement, no single-successor rule, no latest-wins semantics, no current-manifest projection, and no preferred/winner semantics are added. See §2 Q4 for the full normative statement.

---

## 11. Scope firewall — reaffirmed

This amendment changes nothing about: source taxonomy; E-1/E-2/E-3; CE-1…CE-7; DB-03A; DB-03B; `PurchaseOccasion` establishment; real-world distinctness; B2 reconciliation; legal deletion; timestamp semantics; C1; C2; `AnalysisProtocol`; numerator; denominator; opportunity threshold.

```
NEW B2 SEMANTICS: 0
NEW C1/C2 SEMANTICS: 0
```

---

## 12. Relationship to downstream artifacts

- **B1 Effective Spec V2** (`9fa9d0e9…`) remains **BLOCKED**. This amendment does not patch it, does not revive it, and is not an ancestor relationship in either direction.
- **B1 implementation** (`a586b31…`) remains **REJECTED IMPLEMENTATION EVIDENCE — NON-AUTHORITATIVE** (root register §5.1; ratification P-17). This amendment does not rely on it, reference it as authority, or build toward it.
- This amendment authorizes **no** implementation. Downstream B1S work, if and when resumed, MUST represent CD-3 row 25 and its `SG-R` obligation per §9 above, in addition to every pre-existing B1S obligation under JBA V1.9.

---

## 13. Self-audit — full-text search and classification

The accepted JBA V1.9 (`22147802…`) and this amendment were both searched in full for the following strings. Every match is classified below. **No catch-all or generic disposition is used** — every match is individually classified.

| Search string | Matches in JBA V1.9 | Classification |
| :-- | :-- | :-- |
| `twenty-four` | Part A (1), Part D (1), Part E (1, header), Part E (1, `JBA16-AUD-01` row), Part F §F.1 row 3 (1), Part O CG17-1 (1) | Part A = **U-01** (historical, unchanged). Part E header = **U-02** (historical, unchanged). Part D row, Part E `JBA16-AUD-01` row, Part F row 3, Part O CG17-1 = **M-04, M-05, M-06, M-07** (effective overlay required) |
| `24 reference` | No literal-digit occurrence found; all occurrences are spelled "twenty-four" | N/A — covered by the `twenty-four` row above |
| `all 24` | Part Q §Q.2 final status block (1) | **M-08** (effective overlay required) |
| `rows 11–14` | §9.3.5.1 CD-3 footer (1); §19.5 AT-31(iii) (1); Part D `JBA16-AUD-01` row (1); Part O CG17-1 (1) | **M-01, M-03, M-04, M-07** (effective overlay required, each adding "and 25") |
| `rows 15–24` | §9.3.5.1 CD-3 footer (1, within M-01's sentence); §19.5 AT-31(iii) (1, within M-03's sentence); Part D `JBA16-AUD-01` row (1, within M-04's sentence); Part F `O-06b-ARCH` closure row (1); Part K.5 `CDT-4` (1); Part O CG17-1 (1, within M-07's sentence) | The provenance-range occurrences co-located with M-01/M-03/M-04/M-07 are carried unchanged (still 15–24) as part of those overlays. The standalone `O-06b-ARCH` and `CDT-4` occurrences are **U-04, U-05** (provenance-range unchanged) |
| `CG17-1` | Part O, the CG17-1 proof row (1); Part Q summary line "CG17-1 .. CG17-18" (1, range reference only, no count claim) | Proof row = **M-07** (effective overlay required). Part Q range reference makes no totality claim about CD-3 and is unchanged |
| `AT-31` | §19.5 threat-table definition (1, = M-03); AC-35 (1, pointer only, no count); M-11 (1, pointer only, no count); `CDT-3`/`CDT-4`/`CDT-6` pointers (3, no count claim); §4b enforcement row (1, no count claim); allocation row 15 (1, no count claim) | Threat-table definition = **M-03** (effective overlay required). Every other `AT-31` occurrence is a cross-reference pointer that states no CD-3 count or range and is unchanged |
| `JBA16-AUD-01` | Part A (2, historical repair-carried statements, no CD-3 count); §9.3.5.1 heading (1, no count); §9.3.6 heading (1, no count); Part D closure row (1, = M-04); Part E re-proof row (1, = M-05); K.5 heading (1, no count); Part Q status block (1, = M-08) | Part D row = **M-04**; Part E row = **M-05**; Part Q status block = **M-08**. Every other occurrence is a label/heading/pointer with no CD-3 totality claim and is unchanged |
| `citation dependency graph` | §9.3.5.1 heading and body (multiple, defines the graph, no totality claim beyond CD-3's own count, which is handled under the `twenty-four`/`rows` rows above); Part F §F.1 row 3 name (1, = M-06, already counted under `twenty-four`) | Already disposed of under `twenty-four` and `rows 11–14` rows; no additional independent match requiring its own overlay |
| `dependency totality` | Part Q §Q.2 status block, `JBA16-AUD-01 citation` line label ("dependency totality") (1) | Same location as **M-08**; the label itself states no number, only the body text one line below does (already disposed of under `all 24`) |

**Conclusion of search:** every occurrence of every searched string in accepted JBA V1.9 is disposed of above as either historical/unchanged (U-01, U-02), provenance-range/unchanged (U-03, U-04, U-05), a non-counting pointer (unchanged, no overlay needed), or an effective-overlay location (M-01 through M-08, all enumerated in §6). No occurrence was found requiring an overlay not already listed in §6, and no occurrence required here was omitted from §6.

---

## 14. Final consistency checklist

| Requirement | Status |
| :-- | :-- |
| Effective total = 25 | **YES** (§5) |
| Semantic = rows 1–10 | **YES, unchanged** (§5) |
| Structural = rows 11–14 + 25 | **YES** (§5, §6) |
| Provenance = rows 15–24 | **YES, unchanged** (§5, §7 U-03/U-04/U-05) |
| Row 25 structural | **YES** (§2 Q4) |
| Row 25 eligibility edge | **NO** (§2 Q4) |
| §9.3.8 new persisted classes | **0** (§9) |
| Precedence covers both semantic edits and explicit mechanical overlays | **YES** (§4) |
| AT-31 covered | **YES** (§6 M-03) |
| Operative `JBA16-AUD-01` (Part D) covered | **YES** (§6 M-04) |
| Later `JBA16-AUD-01` (Part E) covered | **YES** (§6 M-05) |
| Completeness matrix (Part F §F.1) covered | **YES** (§6 M-06) |
| CG17-1 covered | **YES** (§6 M-07) |
| Final status block (Part Q) covered | **YES** (§6 M-08) |
| Historical 24-area statements (U-01, U-02) untouched | **YES** (§7) |
| Provenance 15–24 ranges untouched where applicable | **YES** (§7) |
| JBA V1.9 file byte-identical | **YES** (§0 — zero bytes changed; this is an external overlay document) |

---

## 15. Authorization boundary

This document is **document-only**. It does not modify `PAGAMENOS_M3_5B_B_ARCHITECTURE_CONTRACT_V1_9.md`, `PAGAMENOS_SPEC_AUTHORITY.md`, or any other accepted authority file. It does not authorize B1 or B2 implementation. It does not alter the current implementation-authorization state recorded in `PAGAMENOS_SPEC_AUTHORITY.md` §6: B1 and B2 implementation remain **NOT AUTHORIZED** until the applicable effective specification is independently accepted.

```
JBA NARROW AMENDMENT 01 CORRECTED CANDIDATE — DOCUMENT-ONLY — AWAITING INDEPENDENT AUDIT
```

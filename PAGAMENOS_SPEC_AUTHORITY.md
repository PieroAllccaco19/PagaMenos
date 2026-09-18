# PagaMenos — Specification Authority & Implementation Authorization

This file is the **root authority register**. It records which specification documents are authoritative, their precedence, the independent closure verdicts, the accepted implementation SHAs, and the current implementation authorization. It does **not** restate or modify the specifications.

**Last repaired:** the **R-B-17 authority repair** — see `PAGAMENOS_R_B_17_AUTHORITY_REPAIR_REPORT.md`.
**Latest authority progression:** **JBA V1.9 + formally integrated JBA Narrow Amendment 01** (§3.1, §3.2), through the protected `m3.5b-b-integration` surface (§8.1) at merge `d64ea203e2022b6f313bc35b32a8ea0f961caecc`; **further followed by the formally integrated A1/A2→M7 Consent Compatibility Amendment 01** (§9.1); **further followed by the independently accepted and formally integrated M7 Outcome/Evidence Effective Specification V1.1** (§10); **further followed by the M7 V1.1 Implementation Work Authorization transition** (§11) — **Gate 1 only: permission to build, not acceptance of anything built**; **further followed by the independently accepted and protected-integrated M7 V1.1 Implementation-Readiness Erratum 01** (§12) — a **clause-scoped** erratum read **together with** the unedited accepted M7 V1.1 bytes, not a replacement of them, and **not** CCA implementation authorization (§12.7); **further followed by the A1/A2→M7 Consent Compatibility Amendment 01 Implementation Work Authorization transition** (§13) — **permission to build conforming CCA runtime/enforcement machinery only (`CCA IMPLEMENTATION WORK: AUTHORIZED`), not acceptance of anything built (`CCA IMPLEMENTATION: NOT ACCEPTED`)**; the accepted CCA bytes are not edited (§13.2). JBA V1.9 itself is **not superseded or replaced** by Amendment 01 — see §3.2. **The A1/A2→M7 Consent Compatibility Amendment 01 is upstream compatibility/security authority only — it does NOT accept, and MUST NOT be read as accepting, any M7 effective specification; see §9.** M7 V1.1 was accepted separately, by its own independent verdict, not by Amendment 01 (§10.1). **Further followed by the protected integration of the §13 CCA transition (PR #21; §14.1) and by the independently accepted and protected-integrated M7 V1.1 SQL Executability Erratum 02** (§14) — an **occurrence-scoped** erratum that supersedes **exactly nine** enumerated SQL occurrences and nothing else, read **together with** the unedited accepted M7 V1.1 bytes and the accepted Erratum 01, not a replacement of either; it makes the pre-Erratum-02 M7-S01 extraction artifacts **non-current for conformance** (§14.6) and keeps M7-S03 **blocked** (§14.7). **Further followed by the protected integration of the §14 Erratum 02 root authority synchronization (PR #25; §15.1) and by the independently accepted and protected-integrated M7 V1.1 Erratum 03** (§15; candidate `df6b4b0f9c71e5286d8925ad20cbb3fcc6b14eff`, merge `6115b843c709bbfb1d169df27bc4e3db7e0f2b8a`, PR #28) — an **occurrence-scoped** erratum that supersedes **exactly fourteen** enumerated occurrences (`E03-01…E03-09`) and nothing else, read **together with** the unedited accepted M7 V1.1 bytes, the accepted Erratum 01 and the accepted Erratum 02, not a replacement of any of them; it makes the Erratum-02-conforming M7-S01 extraction artifacts **non-current for Erratum 03 conformance** (§15.5) and keeps M7-S03 **blocked** (§15.6). **Further followed by the protected integration of the §15 Erratum 03 root authority synchronization (PR #29; §16.1) and by the independently accepted and protected-integrated M7 S03 Verification Bootstrap Amendment 01 (VBA-01)** (§16; candidate `dc6f1dfb16c3faa59dae29d6888987c8aea79bc8`, merge `b4ed5c97cbdfb0e7e031ae37653342192bd2fff2`, PR #32) — a **verification and provisioning contract** that changes **no** normative SQL and **not** the M7 normative-SQL conformance target, read **together with** M7 V1.1 and accepted Errata 01–03 **only for its expressly scoped `VBA-*` contract** (installation-time provisioning; M7-S03 verification/bootstrap orchestration); it requires **no** M7-S01 regeneration, identifies the downstream `VBA-S02-1` M7-S02 compatibility work package, and keeps M7-S03 **blocked** (§16.7). **Further followed by the protected integration of the §16 VBA-01 root authority registration (PR #33; §17.1) and by the independently accepted and protected-integrated M7 VBA-S02-1 PostgreSQL Version-Floor Clarification 01 (VFC-01)** (§17; candidate `0c973be5fcb45cb69aa5d91228fbab3ab9fbc5d8`, merge `475752e894d8468407f1f45523b870d753ed1ecd`, PR #35) — a **narrow clarification subordinate to VBA-01**, **not** an erratum, that changes **no** normative SQL and **not** the M7 normative-SQL conformance target; for `VBA-S02-1` and the corresponding M7-S03 verification realization **only**, it fixes the verification PostgreSQL floor at ≥ 16 and expressly permits the H03 threshold change `150000 → 160000` with termination before role provisioning, leaving IA-08 unchanged in its own scope and asserting no global PostgreSQL version floor (§17.2, §17.3); its existence authorizes **no** implementation rework, `VBA-S02-1` re-authoring is **not yet authorized** (§17.6), and M7-S03 remains **blocked** (§17.7).
**Protected authority surface (history, oldest first; no identity below is rewritten by a later one):** JBA Amendment 01 merge `d64ea203e2022b6f313bc35b32a8ea0f961caecc` (PR #12) → Consent Compatibility Amendment 01 merge `f54d95abb0a8f7988626597a0eef01d0b0ae3c95` (PR #14; §9.1) → post-Amendment-01 root-sync merge `8990ae0ca5af6862b741a14dedb4aa37831976b9` (PR #15) → **M7 Effective Spec V1.1 merge `f99a7e3080fdb99bd3917820d889d09694bed4af` (PR #16; §10.1)** → **Post-M7 V1.1 root authority sync merge `e7423b81edf11559d46d3bc595a491ab1a538ea6` (PR #17; §11.1)** → **M7 V1.1 Implementation Work Authorization (Gate 1) merge `ca1be1bcbef7f6a98a0396d446816bf099075c40` (PR #18; §12.1)** → **M7 V1.1 Erratum 01 merge `3ef0b3ad0fb02cba84a60d0529fe054427b9f68c` (PR #19; §12.1)** → **Post-Erratum-01 root authority sync merge `30034041df3280286fa9c85ac937894ef767e890` (PR #20; §13.1)** → **CCA Implementation Work Authorization merge `f1fd894b60b70e07143d474992ff8b3c5dd88fe1` (PR #21; §14.1)** → **M7 V1.1 SQL Executability Erratum 02 merge `b8df77538671b957b03294fee0fae40929d29bd3` (PR #24; §14.2)** → **Post-Erratum-02 root authority sync merge `1be2f40216ac7093962739d4312d77219ae14d4d` (PR #25; §15.1)** → **M7 V1.1 Erratum 03 merge `6115b843c709bbfb1d169df27bc4e3db7e0f2b8a` (PR #28; §15.1)** → **Post-Erratum-03 root authority sync merge `d51393bd60c9b9b0ccd194650314312133f14ca3` (PR #29; §16.1)** → **M7 S03 Verification Bootstrap Amendment 01 merge `b4ed5c97cbdfb0e7e031ae37653342192bd2fff2` (PR #32; §16.1)** → **Post-VBA-01 root authority sync merge `aa2799a4d04c30afb585090536db3af38cfdd345` (PR #33; §17.1)** → **M7 VFC-01 merge `475752e894d8468407f1f45523b870d753ed1ecd` (PR #35; §17.1)**, all on `origin/m3.5b-b-integration`. The VFC-01 merge is the latest **specification-authority** integration recorded by this register (a narrow clarification of VBA-01; the Erratum 03 merge remains the latest **normative-SQL** specification integration); the PR #33 merge is the latest **protected integration of this register** recorded by it. *(At PR #33 this line ended at the VBA-01 merge, named the VBA-01 merge as the latest specification-authority integration and the PR #29 merge as the latest protected integration of this register, and stated that the §16 entry recorded no merge, PR or acceptance identity of its own (§16.1); §16 has since been protected-integrated by PR #33 and VFC-01 by PR #35 — §17.1.)* *(At PR #29 this line ended at the Erratum 03 merge, named the Erratum 03 merge as the latest specification integration and the PR #25 merge as the latest protected integration of this register, and stated that the §15 entry recorded no merge, PR or acceptance identity of its own (§15.1); §15 has since been protected-integrated by PR #29 and VBA-01 by PR #32 — §16.1.)* *(At PR #25 this line ended at the Erratum 02 merge, named the Erratum 02 merge as the latest specification integration and the PR #21 merge as the latest protected integration of this register, and stated that the §14 entry recorded no merge, PR or acceptance identity of its own (§14.1); §14 has since been protected-integrated by PR #25 and Erratum 03 by PR #28 — §15.1.)* *(At PR #21 this line ended at the PR #20 merge, named the Erratum 01 merge as the latest specification integration and the PR #20 merge as the latest protected integration of this register, and stated that the §13 entry recorded no merge, PR or acceptance identity of its own (§13.1); §13 has since been protected-integrated by PR #21 and Erratum 02 by PR #24 — §14.1, §14.2.)* *(At PR #18 this line named the M7 V1.1 merge `f99a7e3…` and the PR #17 merge respectively, and stated that the §11 transition recorded no merge identity of its own; §11 has since been protected-integrated by PR #18 — §12.1.)* *(At PR #20 this line ended at the Erratum 01 merge, named the PR #18 merge as the latest protected integration of this register, and stated that the §12 entry recorded no merge, PR or acceptance identity of its own (§12.10); §12 has since been protected-integrated by PR #20 — §13.1.)* The §17 entry is **not** part of this history: it records no merge, PR or acceptance identity of its own (§17.1).
**Controlling M7 Outcome/Evidence specification authority:** `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1.md` (status **ACCEPTED**, formally integrated; §10) — the accepted **base** specification, bytes unedited — **read together with** `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_01.md` (status **ACCEPTED + PROTECTED-INTEGRATED**; §12) **for the clauses Erratum 01 normatively amends, and only for those clauses**, **and together with** `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_02.md` (status **ACCEPTED + PROTECTED-INTEGRATED**; §14) **for the nine SQL occurrences Erratum 02 enumerates, and only for those occurrences**, **and together with** `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_03.md` (status **ACCEPTED + PROTECTED-INTEGRATED**; §15) **for the fourteen occurrences Erratum 03 enumerates, and only for those occurrences** — **specification only**; **and, for M7 installation-time provisioning and M7-S03 verification/bootstrap orchestration only, together with** `PAGAMENOS_M7_S03_VERIFICATION_BOOTSTRAP_AMENDMENT_01.md` (status **ACCEPTED + PROTECTED-INTEGRATED**; §16) **for its expressly scoped `VBA-*` contract, which changes no normative SQL** (§16.2)**; and, for the `VBA-S02-1` PostgreSQL version floor, the corresponding M7-S03 verification realization and the narrowly authorized H03 consequence only, VBA-01 is further read together with** `PAGAMENOS_M7_VBA_S02_1_POSTGRESQL_VERSION_FLOOR_CLARIFICATION_01.md` (VFC-01; status **ACCEPTED + PROTECTED-INTEGRATED**; §17) **as a narrow subordinate clarification that changes no normative SQL, leaves IA-08 unchanged in its own scope and asserts no global PostgreSQL version floor** (§17.2). `M7 IMPLEMENTATION AUTHORIZED: YES` **in the Gate 1 sense only** — `M7 IMPLEMENTATION WORK: AUTHORIZED — GATE 1 ONLY (PERMISSION TO BUILD)`; `M7 IMPLEMENTATION / RUNTIME: NOT ACCEPTED — GATE 2 OPEN`; the effective M7 normative-SQL conformance target is **M7 V1.1 + accepted Erratum 01 + accepted Erratum 02 + accepted Erratum 03** (§15.2), unchanged by VBA-01 (§16.2) and by VFC-01 (§17.2); `M7-S01 ERRATUM 03 REGENERATION: INDEPENDENTLY RE-ACCEPTED + INTEGRATED IN STAGING — CURRENT CONFORMANCE ARTIFACT SET`; `S01 REGENERATION REQUIRED BY VBA-01: NO`; `S01 REGENERATION REQUIRED BY VFC-01: NO` (§17.5); `M7-S02`: accepted/integrated infrastructure, acceptance preserved (§17.6); `VBA-S02-1`: required downstream — first author candidate `7e82121b…` independent audit blocked, not accepted, not integrated; re-authoring **not yet authorized** (§17.6); `M7-S03: BLOCKED`, resume not authorized (§17.7); implementation staging `2cc15773…` contains VBA-01 but **not** VFC-01 (§17.4); nothing accepted at Gate 2, published, rotated or deployed (§11, §12, §14.8, §15.7, §16.8, §17.8). *(At PR #33 this line did not name VFC-01, which did not then exist as accepted authority, and read "the effective M7 normative-SQL conformance target is **M7 V1.1 + accepted Erratum 01 + accepted Erratum 02 + accepted Erratum 03** (§15.2), unchanged by VBA-01 (§16.2); `M7-S01 ERRATUM 03 REGENERATION: INDEPENDENTLY RE-ACCEPTED + INTEGRATED IN STAGING — CURRENT CONFORMANCE ARTIFACT SET`; `S01 REGENERATION REQUIRED BY VBA-01: NO` (§16.5); `M7-S02`: accepted/integrated infrastructure, acceptance preserved; `VBA-S02-1`: required downstream, not authorized (§16.6); `M7-S03: BLOCKED` (§16.7); nothing accepted at Gate 2, published, rotated or deployed (§11, §12, §14.8, §15.7, §16.8)."; that was true then and is superseded, for the VFC-01 scoped reading, the `VBA-S02-1` record, the implementation-staging record and the M7-S03 prerequisites only, by §17.)* *(At PR #29 this line read "the effective M7 conformance target is **M7 V1.1 + accepted Erratum 01 + accepted Erratum 02 + accepted Erratum 03** (§15.2); `M7-S01 (ERRATUM 02 REGENERATION): INDEPENDENTLY RE-ACCEPTED / INTEGRATED IN STAGING, NOW SUPERSEDED FOR ERRATUM 03 CONFORMANCE — NOT REJECTED`; `M7-S01 ERRATUM 03 REGENERATION: REQUIRED — NOT PERFORMED` (§15.5); `M7-S03: BLOCKED` (§15.6); nothing accepted at Gate 2, published, rotated or deployed (§11, §12, §14.8, §15.7)"; that was true then and is superseded, for the implementation-line slice record, the M7-S03 prerequisites and the VBA-01 scoped reading only, by §16.)* *(At PR #25 this line read "the effective M7 conformance target is **M7 V1.1 + accepted Erratum 01 + accepted Erratum 02** (§14.5); `M7-S01 PRE-ERRATUM-02 EXTRACTION: HISTORICALLY ACCEPTED, NOW SUPERSEDED FOR CURRENT CONFORMANCE` (§14.6); `M7-S03: BLOCKED` (§14.7); nothing accepted at Gate 2, published, rotated or deployed (§11, §12, §14.8)"; that was true then and is superseded, for the specification reading, the conformance target and the implementation-line slice record only, by §15.)* *(At PR #21 this line read "any future M7 implementation candidate MUST conform to **M7 V1.1 + accepted Erratum 01** (§12.6); nothing implemented, published, rotated or deployed (§11, §12)"; that was true then and is superseded, for the conformance target and the implementation-line slice record only, by §14.)* `CCA IMPLEMENTATION WORK: AUTHORIZED` — permission to build conforming runtime/enforcement machinery implementing the exact accepted CCA Amendment 01 only (§13.3); `CCA IMPLEMENTATION: NOT ACCEPTED`; `CCA RUNTIME ACCEPTANCE: NOT PERFORMED` (§13.8). *(At PR #20 this line read `CCA IMPLEMENTATION AUTHORIZATION: NOT YET GRANTED` (§12.7); that was true then and is superseded, for implementation-work authorization only, by §13.)* *(At PR #17 this line read `M7 IMPLEMENTATION AUTHORIZED: NO` (§10.7); that was true then and is superseded by §11. At PR #18 it named M7 V1.1 alone; Erratum 01 did not then exist as accepted authority.)*
**Controlling B semantic authority:** `PAGAMENOS_M3_5B_B_SEMANTIC_RATIFICATION_V1_3.md` (status **ACCEPTED**).
**Controlling B architecture authority:** `PAGAMENOS_M3_5B_B_ARCHITECTURE_CONTRACT_V1_9.md`, the **Joint B Architecture** (status **ACCEPTED**, formally integrated; §3.1), **as narrowly amended by** `PAGAMENOS_M3_5B_B_JBA_AMENDMENT_01_B1S_AUTHORITY.md` (status **ACCEPTED**, formally integrated; §3.2, narrow B-scoped amendment only). Both remain **subordinate to, and do not replace,** the B Semantic Ratification V1.3.

> **Reading rule.** This register uses **scope-qualified precedence, not a single universal linear ordering**: an artifact controls only within the scope it was accepted for, and two artifacts whose accepted scopes are orthogonal are never ranked against each other. Within a shared scope, when two artifacts appear to conflict, resolve in this order: (1) §1 base study authority, by its own internal precedence, controlling across every scope; (2) §2 accepted milestone specifications (A1, A2, …), each governing its own milestone's semantics; (3) §3 B semantic authority, for the B phase only and subject to §1; (4) §3.1 the Joint B Architecture, for the shared B1/B2 architecture only and subject to §3; (5) §3.2 accepted narrow JBA amendments, each controlling only within its own explicitly enumerated scope and otherwise subject to §3.1; (6) any future accepted B1S/B2S effective specification, subject to §3.1 as amended by §3.2. Orthogonal to that B-scope chain: (7) the **A1/A2→M7 Consent Compatibility Amendment 01** (§9.1) — subordinate to §1, and to A1 and A2 semantics, and controlling **only** the narrow A1/A2→M7 compatibility/security-capability boundary it explicitly enumerates (§9.1, §9.3); where it appears to alter an A1 or A2 semantic, A1/A2 control instead; (8) the **accepted M7 Outcome/Evidence Effective Specification V1.1** (§10; the blocked M7 V1 and every non-accepted V1.1 candidate are §5 artifacts, never authority) — governing the M7 Outcome/Evidence domain and M7's own physical/domain choices within its accepted scope, subject to §1, to A1/A2 where their semantics apply, and to Amendment 01 on the compatibility boundary Amendment 01 controls; if M7 V1.1 (or any later accepted M7 specification) conflicts with Amendment 01 inside that boundary, Amendment 01 controls there; (8a) the **accepted M7 V1.1 Erratum 01** (§12) — clause-scoped within (8): where an Erratum 01 "After" text replaces or narrows an enumerated M7 V1.1 clause, the Erratum 01 text controls **for that clause only**; every clause Erratum 01 does not enumerate is governed by the accepted M7 V1.1 bytes exactly as they are (save only the nine occurrences item (8b) assigns to Erratum 02 and the fourteen occurrences item (8c) assigns to Erratum 03, none of which lies in a clause Erratum 01 amends); and an apparent conflict outside the enumerated clauses is resolved in favour of the accepted V1.1 bytes and is an erratum defect, not a matter for interpretation (Erratum 01 §1.2, §4). Erratum 01 is subject to everything (8) is subject to and gains no scope beyond (8); (8b) the **accepted M7 V1.1 Erratum 02** (§14) — occurrence-scoped within (8) as read with (8a): where an Erratum 02 `E02-01…E02-09` "After" text replaces the enumerated "Before" substring on the named V1.1 line, the Erratum 02 text controls **for that occurrence only**; every other byte of V1.1 is governed by the accepted V1.1 bytes read with Erratum 01 (save only the fourteen occurrences item (8c) assigns to Erratum 03, none of which is an Erratum 02 occurrence), which continue to control; Erratum 01 is unaffected by Erratum 02; and an apparent conflict outside the nine enumerated occurrences is resolved in favour of the accepted V1.1 bytes read with Erratum 01 and is an erratum defect, not a matter for interpretation (Erratum 02 §4). Erratum 02 is subject to everything (8) and (8a) are subject to and gains no scope beyond (8); (8c) the **accepted M7 V1.1 Erratum 03** (§15) — occurrence-scoped within (8) as read with (8a) and (8b): where an Erratum 03 `E03-01…E03-09` "After" block replaces the enumerated "Before" lines of one of its fourteen occurrences at the named V1.1 lines, the Erratum 03 text controls **for that occurrence only**; every other byte of V1.1 is governed by the accepted V1.1 bytes read with Erratum 01 and Erratum 02, which continue to control; Erratum 01 and Erratum 02 are unaffected by Erratum 03; and an apparent conflict outside the fourteen enumerated occurrences is resolved in favour of the accepted V1.1 bytes read with Erratum 01 and Erratum 02 and is an erratum defect, not a matter for interpretation (Erratum 03 §3). Erratum 03 is subject to everything (8), (8a) and (8b) are subject to and gains no scope beyond (8); (8d) the **accepted M7 S03 Verification Bootstrap Amendment 01 (VBA-01)** (§16) — a scope-qualified supplement within (8) as read with (8a)–(8c), **not** a precedence item for normative SQL: for M7 installation-time provisioning and M7-S03 verification/bootstrap orchestration only, the effective authority is M7 V1.1 read with (8a)–(8c) **and** VBA-01 for its expressly scoped `VBA-*` contract, which is the sole authority for those clauses; VBA-01 changes no normative SQL occurrence, no fragment F01–F26 and not the conformance target of (8a)–(8c), and outside its enumerated contract it controls nothing. VBA-01 is subject to everything (8), (8a), (8b) and (8c) are subject to and gains no scope beyond (8); (8e) the **accepted M7 VBA-S02-1 PostgreSQL Version-Floor Clarification 01 (VFC-01)** (§17) — a narrow clarification **subordinate to (8d)**, **not** a precedence item for normative SQL: for the PostgreSQL version floor of `VBA-S02-1`, the M7-S03 verification realization relying on it and the narrowly authorized H03 consequence only, VBA-01 is read together with VFC-01, which is the sole authority for its `VFC-*` clauses; within the points VFC-01 expressly enumerates (the version phrase of VBA-01 §14 item 1 and one narrow exception to VBA-01 §14 item 3) VFC-01 controls, and elsewhere VBA-01 controls and an apparent conflict is a defect of VFC-01, not a matter for interpretation (VFC-01 §4); VFC-01 changes no normative SQL occurrence, no fragment F01–F26, not IA-08 and not the conformance target of (8a)–(8c), and asserts no global PostgreSQL version floor. VFC-01 is subject to everything (8)–(8d) are subject to and gains no scope beyond (8d). An artifact listed in §5 is **never** authority. No amendment in this register asserts a universal amendment doctrine: each controls strictly the scope it explicitly enumerates (see §3.2, §9.1). Nothing in (7)–(8e) alters, or is superior or subordinate to, the B-scope chain (3)–(6); their scopes do not overlap. Implementation-work authorizations recorded in this register (§11 for M7, §13 for the CCA) are lifecycle transitions, not precedence items: they add no item to, and change no scope within, (1)–(8e). Implementation-line slice artifacts (§14.6, §15.4, §16.4, §17.4) are never authority and are not precedence items.

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

*(The accepted M7 Outcome/Evidence Effective Specification V1.1 has an accepted **specification** but **no** accepted implementation and **no** implementation identity; implementation **work** on it is authorized under Gate 1 only (§11), which records nothing as built or accepted. It is therefore recorded in §10 and §11, not in this section. No M7 row may be added here until an M7 implementation has passed Gate 2.)*

*(Likewise, the A1/A2→M7 Consent Compatibility Amendment 01 has an accepted **specification** (§9.1) and implementation **work** authorized (§13), but **no** accepted implementation and **no** implementation identity. It is therefore recorded in §9 and §13, not in this section.)*

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
| `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1` | **`BLOCKED / NON-AUTHORITATIVE`** — negative/reference evidence only | commit `a2d18357a5fd9a699da0efaf69b4185eb9db8b01` — see §9.4 |
| `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1` — non-accepted author rounds (verdicts `REQUIRES PATCH`, `REQUIRES PATCH (ROUND 2)` … `(ROUND 5)`) | **`NOT ACCEPTED / NON-AUTHORITATIVE AUDIT EVIDENCE ONLY`** | commits `8e8140fd0567c167c4098e71430758ab5dcf950f`, `de2605046a1f1f034d34a00b3a6870940da150c9`, `20afa33c332fd822ce12157c87684a6e973204ea`, `bf65f3098020c733d9543575a5fb674cfd00f4ad`, `c1cbe6e77e56a3a37c9ab39776ab74845132b715` — see §10.5. Only the exact artifact bytes of §10.1 are accepted |
| `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_01` — superseded author candidates (verdicts `REQUIRES PATCH`, `REQUIRES PATCH — ROUND 2`) | **`SUPERSEDED / NOT ACCEPTED / NON-AUTHORITATIVE AUDIT EVIDENCE ONLY`** | commits `e3fde238b376eab126ebb516b62ac0955c8b16e1`, `80879ef5f79defde11f3806115568ff3f5392d05` — see §12.1. Only the exact Erratum 01 bytes of §12.1 are accepted |

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
- **M7 Outcome/Evidence Effective Specification V1.1:** **SPECIFICATION ACCEPTED AND FORMALLY INTEGRATED** (§10). Specification acceptance and integration did not by themselves authorize implementation (§10.7). **M7 implementation work is AUTHORIZED — Gate 1 only** — by the separate, explicit transition of §11: permission to build conforming implementation candidates for later independent verification. **No complete M7 implementation candidate exists (LC-1 NOT OCCURRED), and no M7 implementation is ACCEPTED (Gate 2 OPEN)**; the implementation-line slices M7-S01 and M7-S02 recorded in §14.6 and §15.4 are staging slices, not an implementation candidate and not Gate-2 acceptance; its implementation prerequisites, §24.3 CI additions, manifest/control-plane publication gates, selector rotation and runtime/provider/deployment verification all remain outstanding (§10.6, §10.7, §10.8, §11.4). *(At PR #21 this bullet read "**No M7 implementation exists, and none is ACCEPTED (Gate 2 OPEN)**"; that was true then; the M7-S01/M7-S02 slices were integrated into implementation staging afterwards — §14.6.)*
- **M7 V1.1 Implementation-Readiness Erratum 01:** **ACCEPTED AND PROTECTED-INTEGRATED** (§12) — clause-scoped; M7 V1.1 is now read together with it for the clauses it amends. It does **not** revoke Gate 1 and does **not** open, close or satisfy any Gate 2 item. *(At PR #21 this bullet ended "future M7 implementation candidates MUST conform to **M7 V1.1 + accepted Erratum 01** (§12.6)"; the conformance target is now stated in the next bullet — §14.5.)*
- **M7 V1.1 SQL Executability Erratum 02:** **ACCEPTED AND PROTECTED-INTEGRATED** (§14) — occurrence-scoped; supersedes exactly the nine SQL occurrences `E02-01…E02-09` and nothing else. It does **not** revoke Gate 1 and does **not** open, close or satisfy any Gate 2 item. *(At PR #25 this bullet continued: "Future M7 implementation candidates, and every M7 implementation-line artifact relied upon for conformance, MUST conform to **M7 V1.1 + accepted Erratum 01 + accepted Erratum 02** (§14.5). `M7-S01 PRE-ERRATUM-02 EXTRACTION: HISTORICALLY ACCEPTED, NOW SUPERSEDED FOR CURRENT CONFORMANCE` — regeneration and independent re-acceptance required (§14.6); `M7-S02`: accepted/integrated infrastructure, unchanged (§14.6); **`M7-S03: BLOCKED`** (§14.7)." That was true then; the Erratum 02 regeneration of M7-S01 has since been performed, independently re-accepted and integrated into implementation staging (§15.4), and the conformance target and slice statuses are now stated in the next bullet — §15.2, §15.5, §15.6.)*
- **M7 V1.1 Erratum 03:** **ACCEPTED AND PROTECTED-INTEGRATED** (§15) — occurrence-scoped; supersedes exactly the fourteen occurrences `E03-01…E03-09` (classes E03-A…E03-I) and nothing else. It does **not** revoke Gate 1 and does **not** open, close or satisfy any Gate 2 item. Future M7 implementation candidates, and every M7 implementation-line artifact relied upon for conformance, MUST conform to **M7 V1.1 + accepted Erratum 01 + accepted Erratum 02 + accepted Erratum 03** (§15.2). *(At PR #29 this bullet continued: "`M7-S01 (ERRATUM 02 REGENERATION): INDEPENDENTLY RE-ACCEPTED / INTEGRATED IN STAGING, NOW SUPERSEDED FOR ERRATUM 03 CONFORMANCE — NOT REJECTED`; `M7-S01 ERRATUM 03 REGENERATION: REQUIRED — NOT PERFORMED`, independent re-acceptance required (§15.5); `M7-S02`: accepted/integrated infrastructure, unchanged (§15.5); **`M7-S03: BLOCKED`** (§15.6)." That was true then; the Erratum 03 regeneration of M7-S01 has since been performed, independently re-accepted and integrated into implementation staging (§16.4), and the slice statuses are now stated in the next bullet — §16.5–§16.7.)*
- **M7 S03 Verification Bootstrap Amendment 01 (VBA-01):** **ACCEPTED AND PROTECTED-INTEGRATED** (§16) — a verification and provisioning contract; **not** an erratum; changes **no** normative SQL and **not** the M7 normative-SQL conformance target (§16.2). It does **not** revoke Gate 1 and does **not** open, close or satisfy any Gate 2 item. For M7 installation-time provisioning and M7-S03 verification/bootstrap orchestration, candidates MUST also conform to accepted VBA-01 within its expressly scoped `VBA-*` contract (§16.2). *(At PR #33 this bullet continued: "`M7-S01 ERRATUM 03 REGENERATION: INDEPENDENTLY RE-ACCEPTED + INTEGRATED IN STAGING — CURRENT CONFORMANCE ARTIFACT SET`; `S01 REGENERATION REQUIRED BY VBA-01: NO` (§16.5); `M7-S02`: accepted/integrated infrastructure, acceptance preserved; `VBA-S02-1`: required downstream — not authorized, not authored, not accepted, not integrated (§16.6); **`M7-S03: BLOCKED`**, resume not authorized (§16.7); `M7-S03-VBCP`: authorized by VBA-01 only as an S03 verification fixture — not a production manifest, not yet implemented or executed as accepted S03 evidence (§16.8)." That was true then; VBA-01 has since been root-registered (PR #33) and synchronized into implementation staging (PR #34), a first `VBA-S02-1` candidate has been authored and blocked at independent audit, and VFC-01 has been accepted and protected-integrated (§17.1, §17.4); the slice statuses are now stated in the next bullet — §17.5–§17.8.)*
- **M7 VBA-S02-1 PostgreSQL Version-Floor Clarification 01 (VFC-01):** **ACCEPTED AND PROTECTED-INTEGRATED** (§17) — a narrow clarification subordinate to VBA-01; **not** an erratum; changes **no** normative SQL, **not** the M7 normative-SQL conformance target and **not** IA-08 (§17.2); its root authority registration is the §17 entry, pending until that entry is itself independently accepted and protected-integrated (§17.1). For `VBA-S02-1` and the M7-S03 verification realization relying on it only, the verification floor is PostgreSQL ≥ 16 and the H03 threshold change `150000 → 160000`, with termination before role provisioning, is expressly permitted (§17.3); PostgreSQL 15 under VBA-01 §3.4 remains a documented-semantics realization only — unverified, not canonical; no global PostgreSQL version floor is asserted. It does **not** revoke Gate 1 and does **not** open, close or satisfy any Gate 2 item. `M7-S01 ERRATUM 03 REGENERATION: ACCEPTED + INTEGRATED — CURRENT CONFORMANCE ARTIFACT SET`; `S01 REGENERATION REQUIRED BY VBA-01 / VFC-01: NO` (§17.5); `M7-S02`: accepted/integrated infrastructure, acceptance preserved; `VBA-S02-1`: required downstream — first author candidate `7e82121b5abe7e649a2286025508ca0f115cf97a` independent audit blocked, not accepted, not integrated; **re-authoring not yet authorized** (§17.6); **`M7-S03: BLOCKED`**, resume not authorized (§17.7); `M7-S03-VBCP`: verification fixture contract only — not a production manifest, not yet executed as accepted S03 evidence (§17.8).
- **CCA implementation authorization:** **CCA IMPLEMENTATION WORK: AUTHORIZED** by the separate, explicit transition of §13 — permission to build conforming runtime/enforcement machinery implementing the exact accepted CCA Amendment 01, within the accepted CCA §50.1 scope, and to submit a future implementation candidate for independent verification. **CCA IMPLEMENTATION: NOT ACCEPTED; CCA RUNTIME ACCEPTANCE: NOT PERFORMED** (§13.8). *(At PR #20 this bullet read: "**NOT YET GRANTED** — not decided by Erratum 01, not granted by §11 or by this register; a separate authority transition decides it (§12.7)." That was true then; §13 is that separate transition.)*
- **Not authorized:** acceptance of any M7 implementation/runtime (Gate 2, §11.4); resumption of M7-S03 (§14.7, §15.6, §16.7, §17.7); authoring, re-authoring or integrating `VBA-S02-1` without its own separate authorization (§16.6, §17.6) — the existence of VFC-01 authorizes no rework; acceptance or integration of, or reuse as an implementation baseline of, `VBA-S02-1` candidate `7e82121b…` (§17.4, §17.6); reading VFC-01 as an erratum, as normative-SQL authority, or as a global, production or deployment PostgreSQL-version claim (§17.2, §17.3); use of an `M7-S03-VBCP` as, or as evidence of, a control-plane manifest or lifecycle event (§16.8, §17.8); reliance on the pre-Erratum-02 M7-S01 extraction artifacts as the current conformance artifact set (§14.6); reliance on the Erratum-02-conforming M7-S01 extraction artifacts as the Erratum 03 conformance artifact set (§15.5); M7 control-plane manifest acceptance or publication; selector rotation; acceptance of any CCA implementation or runtime (§13.8), and any change outside the accepted CCA scope (§13.6); C1; C2; any `AnalysisProtocol v1` freeze; deployment; Wave 0. *(At PR #20 the CCA item in this list read "CCA implementation (§12.7)"; implementation **work** is now authorized by §13, and acceptance remains unauthorized.)* *(At PR #33 the M7-S03, `VBA-S02-1` and `M7-S03-VBCP` items in this list read "resumption of M7-S03 (§14.7, §15.6, §16.7); authoring or integrating `VBA-S02-1` without its own separate authorization (§16.6); use of an `M7-S03-VBCP` as, or as evidence of, a control-plane manifest or lifecycle event (§16.8);"; the added references and items record §17 and change no status.)*

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

> **Reading note — later lifecycle event.** §9.4–§9.8 were written at the post-Amendment-01 root sync (merge `8990ae0ca5af6862b741a14dedb4aa37831976b9`, PR #15), **before** M7 V1.1 existed as an accepted artifact. Where they describe M7 V1.1 as not yet accepted or merely design-authorized, they are now **historical**: M7 V1.1 has since been independently accepted and formally integrated (§10). Those subsections are annotated in place below rather than silently rewritten; **§10 is the current M7 status**.

> **Reading note — CCA implementation work authorization (§13).** §9 registers the accepted CCA **specification**, and remains current for it: the §9.1 identity and scope, the §9.2 zero semantic delta and the §9.3 `DEP-03` closure are unchanged. §9.1's statement that the CCA is not to be described as M7 implementation authorization remains true, and the CCA artifact's own authored `Implementation authorized: NO` (CCA §52) remains an accurate description of what that specification itself contains; the artifact is not edited. Implementation **work** on the CCA runtime/enforcement machinery has since been authorized by the **separate root-authority transition of §13**, which supersedes that authored state **for implementation-work authorization only** — permission to build, not acceptance: `CCA IMPLEMENTATION: NOT ACCEPTED` (§13.3, §13.8).

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

### 9.4 M7 Effective Spec V1 — status unchanged (also unchanged by the acceptance of V1.1)

```
M7 EFFECTIVE SPEC V1: BLOCKED / NON-AUTHORITATIVE
```

`PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1.md` (candidate commit `a2d18357a5fd9a699da0efaf69b4185eb9db8b01`) remains **`BLOCKED / NON-AUTHORITATIVE`**. Closing its `DEP-03` consent-compatibility dependency (§9.3) does **not** accept it: its remaining independent-audit findings (§9.6) still require correction in a new M7 specification candidate. It is recorded here as **negative/reference evidence only** — its useful content may be re-derived or restated by a future candidate, but it is not, and does not become, an accepted ancestor.

```
a2d18357a5fd9a699da0efaf69b4185eb9db8b01 TREATED AS NON-AUTHORITATIVE: YES
```

**After the acceptance of M7 V1.1 (§10):** M7 V1 **remains `BLOCKED / NON-AUTHORITATIVE`**. The accepted V1.1 artifact does not descend from it (`a2d18357…` is not an ancestor of the accepted candidate `e4f6966df63a4ab575dfdf593819906db817d98b` or of merge `f99a7e3080fdb99bd3917820d889d09694bed4af`), and V1.1's acceptance confers no authority on it.

### 9.5 M7 Effective Spec V1.1 — design authorized, implementation not authorized *(historical status at PR #15; discharged by acceptance — see §10)*

```
[HISTORICAL — status as recorded at the post-Amendment-01 root sync]
M7 EFFECTIVE SPEC V1.1 DESIGN: AUTHORIZED
M7 IMPLEMENTATION AUTHORIZED : NO
```

```
[AS RECORDED AT PR #17 — see §10; implementation row superseded by §11]
M7 EFFECTIVE SPEC V1.1       : ACCEPTED — FORMALLY INTEGRATED (merge f99a7e3080fdb99bd3917820d889d09694bed4af)
M7 IMPLEMENTATION AUTHORIZED : NO
```

```
[CURRENT — see §10, §11 and §12]
M7 EFFECTIVE SPEC V1.1       : ACCEPTED — FORMALLY INTEGRATED (merge f99a7e3080fdb99bd3917820d889d09694bed4af)
M7 V1.1 ERRATUM 01           : ACCEPTED + PROTECTED-INTEGRATED (merge 3ef0b3ad0fb02cba84a60d0529fe054427b9f68c) —
                               clause-scoped; read together with V1.1 (§12)
M7 IMPLEMENTATION WORK       : AUTHORIZED — GATE 1 ONLY (§11; not revoked by Erratum 01, §12.6)
M7 IMPLEMENTATION / RUNTIME  : NOT ACCEPTED — GATE 2 OPEN (§11.4)
```

**Historical authorization (PR #15 stage).** At the post-Amendment-01 root sync, this register authorized authoring a new M7 V1.1 specification candidate from the then-current accepted protected authority lineage, which contained Amendment 01; the protected tip referenced at that stage was merge `f54d95abb0a8f7988626597a0eef01d0b0ae3c95`. That candidate was to address the remaining audit obligations then listed in §9.6. The authorization covered **specification-design work only** and was never M7 implementation authorization. It is **not** a live instruction to author any further V1.1 candidate.

**Historical lineage rule (PR #15 stage).** The register then required that M7 V1.1 be authored fresh from the accepted protected authority lineage containing Amendment 01 (the tip identified in §9.1), and that it not descend from the blocked M7 V1 candidate `a2d18357a5fd9a699da0efaf69b4185eb9db8b01` (§9.4), whose useful content could be re-derived or restated but which was not an accepted ancestor. This rule governed the authoring of the now-accepted V1.1 candidate; it is recorded here as history, not as a new instruction.

**Discharge.** This design authorization has been exercised and discharged: the accepted V1.1 candidate `e4f6966df63a4ab575dfdf593819906db817d98b` was authored from baseline `8990ae0ca5af6862b741a14dedb4aa37831976b9` (which contains `f54d95a…` as first parent), satisfied the lineage rule, and received independent specification acceptance (§10.1). It authorized, and still authorizes, **no** M7 implementation. *(M7 implementation work was later authorized, Gate 1 only, by the separate transition of §11 — not by this design authorization or by specification acceptance.)*

### 9.6 M7 V1.1 — remaining audit obligations (excluding the closed consent dependency) *(historical list at PR #15; specification-level disposition in §10.6)*

Not redesigned here; recorded only as the families a corrected M7 V1.1 candidate must still address, per the prior M7 V1 independent audit, now that `DEP-03` (§9.3) is closed. **None of these is closed by this entry** *(true of the PR #15 entry that wrote it; their later specification-level disposition, and what remains open after it, is recorded in §10.6)*:

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

- **Path A — S-2 grounding.** If a B1S candidate wants S-2 observations to count as grounding evidence — i.e. `SOURCE_GROUNDING_ELIGIBLE` (JBA §9.3.2) — it requires the accepted **M7 ingestion integration contract**, under which B1S obtains re-provable trusted-generation provenance (`DB-03B`) for the M7 `Outcome` write path (JBA definitions table, "M7 ingestion integration contract"; §18.4.7). That contract does not yet exist. *(At PR #15 this line read that no M7 effective specification was accepted; that was true then and is no longer current.)* M7 V1.1 has since been accepted (§10), and it states the M7-side trusted-generation facts it would make re-provable (M7 V1.1 §21.3, `M7-TG-1…M7-TG-11`). It does **not**, however, itself constitute or accept the M7 ingestion integration contract, and it expressly leaves to **B1S** whether those facts satisfy `DB-03B` and the contract itself (M7 V1.1 §21.3, §28.2). Those facts are also not implemented. *(At PR #17 this read "M7 implementation is not authorized (§10.7)".)* M7 implementation **work** is now authorized, Gate 1 only (§11), but no M7 implementation exists or is accepted, so none of those facts is implemented, verified or re-provable; and Gate 1 creates no M7 ingestion integration contract (§11.6). See §10.9. *(Later event: the M7-S01 extraction and M7-S02 harness slices since integrated into implementation staging (§14.6) implement none of those facts; no completed M7 implementation candidate exists and none is accepted.)*
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

**Scope of this correction.** It applies **only** to the JBA S-2/B1S grounding dependency. It does **not** state that M7, as a project milestone, is unnecessary: M7 retains its own specification path (§9.5 at PR #15; now an accepted specification, §10) and remains required for its own project/scientific obligations (evidence-backed outcomes, S-2 grounding for any B1S candidate that elects to use it, and every remaining audit family in §9.6 — closed at specification level since, but with implementation, publication and runtime obligations still open; §10.6). "M7 not required for the B1S non-grounding default path" MUST NOT be read as "M7 not required at all."

### 9.8 Implementation authorization matrix *(historical matrix at PR #15; current matrix §17.12)*

```
[HISTORICAL — as recorded at the post-Amendment-01 root sync]
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

This matrix records status already established by §6, §7 and §9.1–§9.7; it authorizes nothing beyond them. Its `M7 SPEC V1.1 DESIGN : YES` row has been discharged by acceptance (§9.5, §10); every other row is carried forward unchanged into §10.10. *(Its `M7 IMPLEMENTATION : NO` row is superseded, Gate 1 only, by §11; the current matrix is §17.12.)*

### 9.9 Machine-readable authority baseline — unchanged

Consistent with §2.4: this documentation sync does **not** invent or rotate `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA`. If M7 later requires selector rotation, that remains a future implementation/acceptance obligation, not asserted by this entry. *(M7 V1.1, now accepted, does require machine-readable control-plane publication and a later selector rotation before M7 implementation can be accepted; both remain downstream and not performed — §10.8.)*

---

## 10. M7 Outcome/Evidence Effective Specification V1.1 — ACCEPTED, FORMALLY INTEGRATED (specification only)

This section records a lifecycle transition that has **already occurred**: the independent specification acceptance and the protected integration of M7 V1.1. It registers that artifact as authority for its accepted scope. It does **not** restate, amend or re-open the specification; it does **not** authorize M7 implementation; it does **not** publish machine-readable authority or rotate any selector. Nothing in this section modifies §1, §2, §3, §3.1, §3.2, §9.1–§9.3, the B Semantic Ratification V1.3, JBA V1.9 or its Amendment 01, or **P-16**.

> **Reading note — later lifecycle event.** §10 was written at the Post-M7 V1.1 Root Authority Sync (candidate `0fcd8768bcef16711d4575054eee64e6e062c66c`, protected-integrated by merge `e7423b81edf11559d46d3bc595a491ab1a538ea6`, PR #17 — §11.1), **before** the Gate 1 transition of §11. Its statements that M7 implementation is not authorized — the IMPLEMENTATION AUTHORIZATION row of §10.2, the Gate 1 status in §10.7, and the `M7 IMPLEMENTATION AUTHORIZED` row of §10.10 — are now **historical** and are annotated in place below rather than silently rewritten. **§11 is the current M7 implementation status.** Everything else in §10 — the §10.1 identity, §10.6 open categories (b)–(e), the §10.7 Gate 2 list and the §10.8 machine-readable authority state — **remains current and unchanged** by §11.

> **Reading note — Erratum 01.** M7 V1.1 has since been read together with the accepted, protected-integrated Erratum 01 (§12). The §10.1 identity is **unchanged**: the accepted V1.1 bytes are not edited and not superseded wholesale. Wherever §10 cites an M7 V1.1 clause that Erratum 01 enumerates (V1.1 §16.2.4 PA-1, §19.13.4, §23.3, §23.4, §23.5, §24.2 MA-1 and MA-6, §24.3, §25.2 T-08b — §12.3), that clause is read as amended by Erratum 01, for that clause only. The one restatement in §10 that carried the MA-6 ambiguity Erratum 01 identified (ER-05; Erratum 01 §9.0 citing "Register §10.8") has been synchronized **in place, with its prior wording preserved as an annotation** (§10.8); the combined "publication / selector rotation" stage of §10.2 is read as the distinct lifecycle events of §12.5. No status in §10 is changed by this synchronization.

> **Reading note — Erratum 02.** M7 V1.1 is now also read together with the accepted, protected-integrated Erratum 02 (§14) for the nine SQL occurrences `E02-01…E02-09` it enumerates, and only for those occurrences (header reading rule, item (8b); §14.3). The §10.1 identity is **unchanged**; the accepted V1.1 bytes are not edited, and no errata text is flattened into them. No status in §10 is changed by this note.

> **Reading note — Erratum 03.** M7 V1.1 is now also read together with the accepted, protected-integrated Erratum 03 (§15) for the fourteen occurrences `E03-01…E03-09` it enumerates, and only for those occurrences (header reading rule, item (8c); §15.2). The §10.1 identity is **unchanged**; the accepted V1.1 bytes are not edited, and no errata text is flattened into them. No status in §10 is changed by this note.

> **Reading note — VBA-01.** For M7 installation-time provisioning and M7-S03 verification/bootstrap orchestration only, M7 V1.1 read with accepted Errata 01–03 is now also read together with the accepted, protected-integrated M7 S03 Verification Bootstrap Amendment 01 (§16) for its expressly scoped `VBA-*` contract (header reading rule, item (8d); §16.2). VBA-01 changes no normative SQL and not the M7 normative-SQL conformance target. The §10.1 identity is **unchanged**; the accepted V1.1 bytes are not edited. No status in §10 is changed by this note.

> **Reading note — VFC-01.** For the PostgreSQL version floor of `VBA-S02-1`, the M7-S03 verification realization relying on it and the narrowly authorized H03 consequence only, VBA-01 is now further read together with the accepted, protected-integrated VBA-S02-1 PostgreSQL Version-Floor Clarification 01 (VFC-01; §17; header reading rule, item (8e); §17.2). VFC-01 changes no normative SQL, not the M7 normative-SQL conformance target and not IA-08 (V1.1 §18.4), which remains unchanged in its own scope; it asserts no global PostgreSQL version floor. The §10.1 identity is **unchanged**; the accepted V1.1 bytes are not edited. No status in §10 is changed by this note.

### 10.1 Accepted artifact — exact identity

| Item | Value |
| :-- | :-- |
| Artifact | `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1.md` |
| **Status** | **ACCEPTED — FORMALLY INTEGRATED** (specification) |
| Independent verdict | `M7 EFFECTIVE SPEC V1.1 — INDEPENDENT SPECIFICATION ACCEPT` |
| Verdict binds | the **exact artifact bytes** identified by the SHA-256 and Git blob below, and no other bytes |
| **Accepted artifact SHA-256** | `457f51778fb5d5890b3e3478376e413072f15aef7da88125b5e78963f49394bd` |
| **Accepted artifact Git blob** | `06e103b0d5e8cfcbb96ab21134d5605b0aae9b26` |
| Accepted candidate commit | `e4f6966df63a4ab575dfdf593819906db817d98b` (author revision round 5) |
| Accepted candidate tree | `0b5c3464e4645123eb6ccc82fb472919171c53d4` |
| Candidate baseline | `8990ae0ca5af6862b741a14dedb4aa37831976b9` (post-Amendment-01 root-sync merge, PR #15) |
| Integration PR | `#16` |
| **Formal protected integration merge** | `f99a7e3080fdb99bd3917820d889d09694bed4af` |
| Merge parents (in order) | 1. `8990ae0ca5af6862b741a14dedb4aa37831976b9` — 2. `e4f6966df63a4ab575dfdf593819906db817d98b` |
| **Formal integration tree** | `0b5c3464e4645123eb6ccc82fb472919171c53d4` (identical to the accepted candidate tree) |
| Post-merge required checks | `authority-gate` — SUCCESS; `verify` — SUCCESS (GitHub Actions app `15368`) |
| Protected integration surface | `origin/m3.5b-b-integration`, the same protected branch as §3.1, §3.2 and §9.1 (see §8.1) |

**What the post-merge checks establish.** As §6.2 records for JBA Amendment 01, `authority-gate` and `verify` on `f99a7e3…` establish **integration integrity of this documentation merge only**. They are not the M7 real-PostgreSQL adversarial suite, the exact-set catalog verification, the manifest gates or the real-provider cases that M7 V1.1 itself requires (M7 V1.1 §24.3, §25, §28.1), and are not claimed to be.

### 10.2 Lifecycle — four distinct stages, never collapsed

| Stage | Meaning | M7 V1.1 status |
| :-- | :-- | :-- |
| **SPECIFICATION ACCEPTANCE** | an independent auditor accepted the exact artifact bytes as the controlling M7 specification | **DONE** — `M7 EFFECTIVE SPEC V1.1 — INDEPENDENT SPECIFICATION ACCEPT` (§10.1) |
| **PROTECTED INTEGRATION** | those exact bytes were merged into the protected integration branch with required checks passing | **DONE** — merge `f99a7e3080fdb99bd3917820d889d09694bed4af`, PR #16 (§10.1) |
| **IMPLEMENTATION AUTHORIZATION** | permission to begin, and to seek acceptance of, M7 runtime implementation | *[historical at PR #17]* **NOT GRANTED** — `M7 IMPLEMENTATION AUTHORIZED: NO` (§10.7). **Current:** **GRANTED — Gate 1 only** (§11): permission to begin conforming implementation work and to produce candidates for later independent verification; **no** implementation acceptance (Gate 2 — §11.2, §11.4) |
| **MACHINE-READABLE AUTHORITY PUBLICATION / SELECTOR ROTATION** | an M7 control-plane manifest published in `authority/` of an accepted authority-baseline commit, and `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA` rotated to it | **NOT PERFORMED** — downstream acceptance work (§10.8). *(Per Erratum 01 ER-05 this row names several distinct events — manifest independent review/acceptance, machine-readable authority publication, privileged selector rotation, post-rotation MA verification — never collapsed; see §12.5.)* |

Completion of an earlier stage **never** implies a later one. In particular, acceptance and integration of the Markdown specification is **not** publication of machine-readable authority, and is **not** implementation authorization.

### 10.3 Scope and precedence

Registered under the header reading rule, item (8). **No universal linear hierarchy is asserted.**

- **Governs:** the M7 Outcome/Evidence domain (`Outcome` and its append-only assertions, `SavingEvidence` and its object-storage lifecycle, correction/adjudication, withdrawal/retention/legally authorized deletion, the M7 role/privilege model, the M7 control-plane manifest definition) and M7-owned physical/domain choices, **within the scope the accepted artifact enumerates** (M7 V1.1 §2) and excluding its declared non-goals (M7 V1.1 §3).
- **Subject to:** §1 base-study authority (Phase 0A-2 chain, by its own internal precedence); A1 and A2 wherever their semantics apply; and the accepted A1/A2→M7 Consent Compatibility Amendment 01 (§9.1) inside its narrow compatibility/security boundary — **inside that boundary, Amendment 01 controls**.
- **Orthogonal to the B-scope chain** (§3, §3.1, §3.2): M7 V1.1 does not amend B, and B/JBA precedence is unchanged outside any actual overlap. Where B authority describes upstream M7 artifacts (e.g. JBA §7, §16, §18.4), M7 V1.1 conforms to it (M7 V1.1 §4.1) rather than overriding it.
- **Not authority for:** consent semantics; A1/A2 semantics; B1S/B2S decisions (including S-2 grounding and `DB-03B` sufficiency); C1 verification or `VerifiedValue`; C2 / `AnalysisProtocol`; the value of `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA` (M7 V1.1 §3, §21, §22, §28.2).

### 10.4 The artifact's authored status header is not edited

The integrated artifact still carries its authored header (`M7 EFFECTIVE SPEC V1.1: CANDIDATE / NOT ACCEPTED`, `AWAITING INDEPENDENT RE-AUDIT`) and its §29 author-side status block. **These are resolved by events, not by edits:** acceptance is an external lifecycle fact recorded by the independent verdict and by this register. The file is deliberately **not** modified — changing any byte would produce a different artifact and break the exact-byte binding of §10.1 (SHA-256 `457f5177…`, blob `06e103b0…`). Where the artifact's header or §29 says "not accepted", read this section.

The artifact's own non-acceptance statements about **other** things — M7 implementation not authorized, the control-plane manifest not accepted/published/rotated, the selector not asserted/rotated, machine-readable authority unchanged — remain **true** after acceptance, and are reaffirmed by §10.7–§10.8.

### 10.5 Non-authoritative M7 candidates

- **M7 V1** `a2d18357a5fd9a699da0efaf69b4185eb9db8b01` — **`BLOCKED / NON-AUTHORITATIVE`** (§9.4); not an ancestor of the accepted candidate.
- **Non-accepted V1.1 author rounds** — `8e8140fd0567c167c4098e71430758ab5dcf950f` (`REQUIRES PATCH`), `de2605046a1f1f034d34a00b3a6870940da150c9` (`REQUIRES PATCH (ROUND 2)`), `20afa33c332fd822ce12157c87684a6e973204ea` (`REQUIRES PATCH (ROUND 3)`), `bf65f3098020c733d9543575a5fb674cfd00f4ad` (`REQUIRES PATCH (ROUND 4)`), `c1cbe6e77e56a3a37c9ab39776ab74845132b715` (`REQUIRES PATCH (ROUND 5)`) — each **`NOT ACCEPTED / NON-AUTHORITATIVE AUDIT EVIDENCE ONLY`**, as the accepted artifact itself records (M7 V1.1 §1.1, §1.3, §29). None is an ancestor of `e4f6966…` or of `f99a7e3…`. The shared filename does not transfer acceptance: **only** the bytes of §10.1 are accepted.

### 10.6 Prior audit obligations — reconciliation

Five categories are kept distinct. **Only the first is closed by the acceptance recorded here.**

| Category | Meaning | Status after M7 V1.1 acceptance |
| :-- | :-- | :-- |
| **(a) Specification closure** | the defect is answered in the normative text of the accepted artifact | **CLOSED AT SPECIFICATION LEVEL** for the families below |
| **(b) Implementation prerequisites** | conditions that must hold before any M7 implementation is accepted (M7 V1.1 §28.1 `IMP-01…IMP-22`) | **OPEN** — none executed or verified |
| **(c) Manifest / control-plane publication gates** | review and publication of the M7 control-plane manifest and the proofs a rotation must supply (M7 V1.1 §23, §24.2 `MA-1…MA-18`, §24.3) | **OPEN** — manifest not accepted, not published |
| **(d) Selector rotation** | rotation of `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA` to an authority baseline containing the manifest (M7 V1.1 §24.2 `MA-5`, `MA-6`) | **NOT PERFORMED; NOT AUTHORIZED BY THIS ENTRY** |
| **(e) Runtime / provider / deployment verification** | facts PostgreSQL or the repository cannot establish: real-provider, real-deployment and real-PostgreSQL cases, operational attestations, residuals (M7 V1.1 §25, §26, §28.3) | **OPEN** — not executed |

**(a) Specification-level disposition of the §9.6 families** (the prior M7 V1 audit families, M7 V1.1 §27.1):

| §9.6 family | V1 ID | Specification level | Still open outside specification level |
| :-- | :-- | :-- | :-- |
| fixed merchant-universe overreach | AUD-01 | **CLOSED** | vocabulary publication in the manifest and `MA-4` (c) |
| trusted participant / uploader / object-store capability | AUD-03 | **CLOSED** | object-store ACL and credential scoping `IMP-03`, `IMP-04` (b); real-provider cases (e) |
| `SECURITY DEFINER` / `search_path` safety | AUD-04 | **CLOSED** | exact-set catalog verification against a real database `IMP-07`, `IMP-11` (b, e) |
| deletion authorization proof | AUD-05 | **CLOSED** | privacy-authority decisions `IMP-09`, `IMP-10` (b); SLA operation `IMP-08` (b, e) |
| executable / complete DDL | AUD-06 | **CLOSED** | the DDL is normative specification text, **not an executed migration**; migration authoring and verification (b, e) |
| storage staging / race / reconciliation | AUD-07 | **CLOSED** | real-PostgreSQL / real-store concurrency and crash cases `IMP-06`, `IMP-21` (e) |
| evidence correction model | AUD-08 | **CLOSED** | implementation and suite execution (b, e) |
| role provisioning | AUD-09 | **CLOSED** (fail-closed provisioning specified) | actual role creation and credential separation `IMP-01…IMP-03` (b, e) |
| persisted-class / candidate accounting | AUD-10 | **CLOSED** | — (implementation must conform) |
| independently reviewed / published control-plane manifest and selector rotation | AUD-11 | **CLOSED for the manifest's definition only** | review, publication (c) and selector rotation (d) — **explicitly external** per M7 V1.1 §27.1 |

`AUD-02 / DEP-03` (consent compatibility) remains **closed by upstream accepted authority**, not by M7 V1.1 (§9.3).

**(a) Independent V1.1 audit findings** (M7 V1.1 §27.2–§27.7): `M7V11-AUD-01…07`, `M7V11R2-AUD-01…04`, `M7V11R3-AUD-01…04`, `M7V11R4-AUD-01…06` and `M7V11R5-AUD-01…02` are **closed at specification level** by the accepted round-5 text, as that text disposes of them (including supersession of `M7V11R2-AUD-01` by `M7V11R3-AUD-01`). Two limits carried by the accepted artifact itself remain binding and are **not** converted into completed facts:

- **`M7V11R2-AUD-01` / `M7V11R3-AUD-01` are conditional closures.** Their database half is specified; their **provider half** (XC-1, SP-9, SP-10; residual `M7-R-09`; cases T-138b, T-142, T-167; `IMP-15`, `IMP-16`) and **signer half** (XC-5, XC-6; invariant `M7-I119`, class E-E; residual `M7-R-12`; case T-171b; `IMP-18`) may **not** be reported closed for any deployment that has not executed those cases on the real provider and real deployment (M7 V1.1 §28.1, §28.3, §29).
- **Residuals `M7-R-01…M7-R-17`** (M7 V1.1 §28.3) are accepted as stated bounds, not eliminated.

### 10.7 Implementation remains blocked *(Gate 1 status historical at PR #17 — current Gate 1 status §11; Gate 2 below remains current)*

```
[HISTORICAL — as recorded at PR #17; superseded, Gate 1 only, by §11]
M7 IMPLEMENTATION AUTHORIZED: NO
```

Specification acceptance and protected integration do **not** authorize M7 implementation. Two different gates apply, and they MUST NOT be collapsed into one:

**Gate 1 — permission to begin M7 implementation work (implementation authorization, §10.2).**

- **Status: NO** in this register. *(Historical at PR #17. **Current status: YES — Gate 1 only**, granted by the separate, explicit transition of §11. That transition did not rely on, and does not record, completion of any Gate 2 item.)*
- Granting it requires a **future, separate, explicit authority transition** recorded in this register.
- This entry does **not** decide, grant, schedule or pre-condition that transition. It states no prerequisite for beginning implementation beyond what accepted authority itself states; in particular, it does **not** require the Gate 2 items below to be complete before such a transition may occur, because several of them (e.g. role provisioning, the sealed signer deployment, the hosted adversarial suite) can only be satisfied by implementation and deployment work.

**Gate 2 — acceptance of an M7 implementation / runtime acceptance.** *(Current; unchanged by §11 — every item below remains OPEN.)* Per the accepted M7 V1.1 specification, before any M7 implementation is **accepted**, at minimum the following must hold and be **independently verified** — this register records them as open and authorizes none of them:

- the implementation prerequisites `IMP-01…IMP-22` (M7 V1.1 §28.1: *"must hold before any M7 implementation is accepted"*), including role provisioning, credential separation, object-store conformance per profile, capability-CI extension, the hosted real-PostgreSQL adversarial suite (the M7 analogue of R-B-16), the sealed capability-signer deployment, the lock-graph checks, and the privacy/research-authority decisions `IMP-09`, `IMP-10`;
- the CI gate additions required by M7 V1.1 §24.3, **to be added by a future M7 implementation candidate** without weakening the accepted `verify` and `authority-gate` checks — **none of these gates exists yet**;
- manifest / control-plane publication and the applicable `MA-1…MA-18` proofs (M7 V1.1 §24.2: what a later rotation must prove *"before M7 implementation can be accepted"*), and selector rotation where required (§10.8) — *as distinct lifecycle events preceding Gate-2 acceptance, per Erratum 01 ER-05 (§12.5)*;
- real-PostgreSQL, real-provider and real-deployment verification (M7 V1.1 §25, §28.1, §28.3), including the conditional provider/signer closures of §10.6;
- any other acceptance condition the accepted M7 V1.1 specification states.

No artifact of this repository — runtime source, Prisma schema, migration, test, workflow, `scripts-trusted/`, or `authority/` — has been changed by the acceptance or integration of M7 V1.1 (the PR #16 merge added exactly one Markdown file), and none is changed by this root-sync entry; in particular, **no CI workflow was changed in PR #16 or by this entry**.

### 10.8 Machine-readable authority — publication and selector rotation remain downstream

The two-authority architecture of §2.4 is **unchanged**:

- documentation authority in this protected integration lineage is **distinct** from the machine-readable authority baseline;
- machine-readable artifacts live in the `authority/` namespace of a **separately selected** authority-baseline commit/lineage; `authority/` is absent from this tree (`git ls-tree -r HEAD authority/` is empty at `f99a7e3…`) and is not added or modified by this entry;
- selection is governed solely by the protected external repository variable `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA`.

```
M7 CONTROL-PLANE MANIFEST                       : NOT ACCEPTED, NOT PUBLISHED
M7 MACHINE-READABLE AUTHORITY PUBLICATION       : NOT PERFORMED — DOWNSTREAM ACCEPTANCE WORK
PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA VALUE     : NOT ASSERTED BY THIS REGISTER (externally governed; §2.4)
SELECTOR ROTATION                               : NOT PERFORMED; NOT AUTHORIZED BY THIS ENTRY
```

This register does **not** infer, invent, default or rotate the selector, and claims no knowledge of its current value. M7 V1.1, read with Erratum 01 ER-05 (§12.5), requires that **later**, as distinct events, the M7 control-plane manifest be independently reviewed and accepted as a description of an implementation candidate, be published unchanged in an independently reviewed additive authority-baseline commit, that the selector then be rotated by a privileged owner, and that `MA-1…MA-18` be demonstrated against the rotated selector — including that `authority.specSha256` equals the accepted artifact SHA-256 of §10.1 and that `authority.specAcceptanceVerdict` names the verdict of §10.1 (`MA-2`), that pre-existing ledger/registry entries are unchanged (`MA-3`), and — as `MA-6` is amended by Erratum 01 — that the selector rotation happens only **after** the manifest's independent review and acceptance **and** the independent review of the additive authority-baseline commit that publishes it (A2 §34.1 step 8), by a privileged owner, with no force-moved tag, no branch-as-authority and no candidate-chosen base, and that the rotation **neither requires nor implies** Gate-2 implementation/runtime acceptance, which it **precedes**. That is downstream work; none of it has occurred. *(At PR #17 this paragraph read: "M7 V1.1 requires that a **later**, separately accepted rotation publish the M7 control-plane manifest and prove `MA-1…MA-18` — …, and that the rotation occurs after independent acceptance by a privileged owner with no candidate-chosen base (`MA-6`)." That restatement omitted MA-6's A2 §34.1 step 8 citation and left the object of "independent acceptance" unnamed, the ambiguity Erratum 01 ER-05 resolved; it is superseded by the wording above.)*

### 10.9 Effect on B and C — none beyond the stated S-2 fact

- **B semantic / architecture authority:** unchanged (§3, §3.1, §3.2). JBA V1.9 and its Amendment 01 are not amended.
- **B1S design:** unchanged — may proceed under the accepted S-2 non-grounding default (§9.7 Path B). **Path A** still requires an **accepted M7 ingestion integration contract**. M7 V1.1 now states, in accepted specification text, the M7-side trusted-generation facts it would make re-provable, in a form B1S may consume (M7 V1.1 §21.3) — **specified, not implemented**; whether they satisfy `DB-03B`, and the contract itself, remain **B1S-owned** and require B-scoped acceptance (M7 V1.1 §28.2). This entry does not decide either.
- **B2S design:** unchanged (§6, §7).
- **B1 / B2 implementation:** NOT AUTHORIZED. **P-16: ACTIVE** — unchanged.
- **C1 / C2:** NOT AUTHORIZED. `AnalysisProtocol v1` UNFROZEN; Wave 0 and deployment NOT AUTHORIZED (§6.1) — unchanged. M7 V1.1 persists no `VerifiedValue` and no VS level (M7 V1.1 §21.5, §22).

### 10.10 Current authorization matrix *(historical matrix at PR #17; current matrix §17.12)*

```
[HISTORICAL — as recorded at PR #17; M7 IMPLEMENTATION row superseded, Gate 1 only, by §11]
M7 EFFECTIVE SPEC V1                    : BLOCKED / NON-AUTHORITATIVE
M7 EFFECTIVE SPEC V1.1                  : ACCEPTED — SPECIFICATION ACCEPTANCE DONE, PROTECTED INTEGRATION DONE
                                          (merge f99a7e3080fdb99bd3917820d889d09694bed4af, PR #16)
M7 IMPLEMENTATION AUTHORIZED            : NO
M7 CONTROL-PLANE MANIFEST PUBLICATION   : NOT PERFORMED (downstream)
SELECTOR ROTATION                       : NOT PERFORMED; NOT AUTHORIZED BY THIS ENTRY
B1S DESIGN                              : YES — MAY use the accepted S-2 non-grounding default (§9.7); Path A only
                                          with an accepted M7 ingestion integration contract (§10.9)
B2S DESIGN                              : per existing JBA / P-16 sequencing (§6, §7) — unchanged
B1 IMPLEMENTATION                       : NO
B2 IMPLEMENTATION                       : NO
C1 IMPLEMENTATION                       : NO
C2 IMPLEMENTATION                       : NO
P-16                                    : ACTIVE
```

This matrix records status established by §6, §7, §9 and §10.1–§10.9; it authorizes nothing beyond them. Its `M7 IMPLEMENTATION AUTHORIZED : NO` row is superseded, Gate 1 only, by §11; every other row is carried forward unchanged into §11.7.

---

## 11. M7 V1.1 Implementation Work Authorization — Gate 1 transition (implementation NOT accepted)

This section is the **future, separate, explicit authority transition** that §10.7 requires before M7 implementation work may begin. It performs **Gate 1 only**. It grants permission to **build**; it accepts **nothing built**. It does **not** restate, amend or re-open the accepted M7 V1.1 specification; it does **not** implement M7; it does **not** publish machine-readable authority, create or modify `authority/`, assert or rotate `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA`, or authorize deployment. Nothing in this section modifies §1, §2, §3, §3.1, §3.2, §9.1–§9.3, §10.1, §10.6 categories (b)–(e), the §10.7 Gate 2 list, §10.8, the B Semantic Ratification V1.3, JBA V1.9 or its Amendment 01, B1S/B2S ownership, S-2 Path A / Path B, **P-16**, or C1/C2 authority.

> **Reading note — later lifecycle events (PR #18 integration; Erratum 01).** §11 was written as an author candidate against protected tip `e7423b8…`. It has since been **protected-integrated by merge `ca1be1bcbef7f6a98a0396d446816bf099075c40` (PR #18; §12.1)**; the statements of §11.1 "This entry's own status" that it records no PR or merge identity are therefore historical and are preserved rather than rewritten. The Gate 1 authorization of §11 is **unchanged and not revoked** by Erratum 01. Wherever §11 names "the accepted M7 V1.1 specification" as the conformance target of implementation work (§11.1, §11.2, §11.3, §11.4), that target is now **M7 V1.1 read together with the accepted Erratum 01 for the clauses it amends** (§12.6) — the V1.1 bytes of §11.1 remain the only accepted base bytes, and authorization still does not extend to any non-accepted bytes. The combined "MACHINE-READABLE AUTHORITY PUBLICATION / SELECTOR ROTATION" stage of §11.2 and the rotation references of §11.4 and §11.5 are read as the distinct lifecycle events of §12.5. The §11.7 matrix is historical as recorded at PR #18; the current matrix is §17.12. No Gate 2 item in §11.4 changes status. *(Later events — Erratum 02 and the M7-S01/M7-S02 slices, §14: that conformance target is now **M7 V1.1 + accepted Erratum 01 + accepted Erratum 02** (§14.5); the Gate 1 authorization of §11 is unchanged and not revoked. The §11.2 statement "NO implementation exists" and the §11.7 `no implementation exists` row were true when written; they are read with §14.6 — the implementation-line slices integrated into staging since are not a completed implementation candidate (LC-1 NOT OCCURRED), and no M7 implementation is accepted.)* *(Later events — Erratum 03, §15: that conformance target is now **M7 V1.1 + accepted Erratum 01 + accepted Erratum 02 + accepted Erratum 03** (§15.2); the Gate 1 authorization of §11 is unchanged and not revoked.)*

> **Two words that MUST NOT be interchanged.** In this register, **AUTHORIZED** (for M7 implementation) means only *permitted to build and to submit for review*. **ACCEPTED** means *independently verified and accepted*. `M7 IMPLEMENTATION WORK: AUTHORIZED` never implies, and MUST NOT be cited as evidence of, `M7 IMPLEMENTATION: ACCEPTED`. Any statement of the form "M7 is authorized" that omits which gate is meant MUST be read as Gate 1 only.

### 11.1 Starting point, controlling specification and provenance

**This entry's own status.** This entry is an **author candidate** for an authority transition. It records **no** acceptance verdict, commit, PR or merge identity of its own, and MUST NOT be read as having been independently accepted or protected-integrated by virtue of its text. As with every prior entry in this register, the transition is authority only as recorded in this register at the protected integration surface following independent acceptance of the exact register bytes; the independent auditor binds acceptance to those bytes externally.

**Starting point.** Authored against the protected tip `origin/m3.5b-b-integration` = `e7423b81edf11559d46d3bc595a491ab1a538ea6`.

**Post-M7 V1.1 Root Authority Sync — now protected-integrated** (this is the entry that wrote §10's current text):

| Item | Value |
| :-- | :-- |
| Entry | Post-M7 V1.1 Root Authority Sync — `docs(authority): register accepted M7 V1.1 specification` |
| Accepted root-sync candidate commit | `0fcd8768bcef16711d4575054eee64e6e062c66c` |
| Accepted root-sync tree | `a150f32d6e8022e2e1e6db2e2f33fd1694f1a3ce` |
| Accepted `PAGAMENOS_SPEC_AUTHORITY.md` Git blob | `2b333c5c12c28b5f60f78c81ff2e8bbc2f9e4a38` |
| Accepted register SHA-256 | `36eae72121bd058eded2c0d258c5035bd1a07e996a7ce72f410e19688756f17f` |
| PR | `#17` |
| **Formal protected integration merge** | `e7423b81edf11559d46d3bc595a491ab1a538ea6` |
| Merge parents (in order) | 1. `f99a7e3080fdb99bd3917820d889d09694bed4af` — 2. `0fcd8768bcef16711d4575054eee64e6e062c66c` |
| Merge tree | `a150f32d6e8022e2e1e6db2e2f33fd1694f1a3ce` (identical to the accepted root-sync tree) |
| Paths changed by the merge relative to `f99a7e3…` | exactly one: `PAGAMENOS_SPEC_AUTHORITY.md` |
| Post-merge verification | independently post-merge verified |
| Protected integration surface | `origin/m3.5b-b-integration` (see §8.1) |

Earlier protected identities are **not rewritten** by this entry: PR #12 merge `d64ea203e2022b6f313bc35b32a8ea0f961caecc` (§3.2); PR #14 merge `f54d95abb0a8f7988626597a0eef01d0b0ae3c95` (§9.1); PR #15 merge `8990ae0ca5af6862b741a14dedb4aa37831976b9`; PR #16 / M7 V1.1 specification merge `f99a7e3080fdb99bd3917820d889d09694bed4af` (§10.1).

**Controlling specification — exact bytes, unmodified.** The only specification this authorization applies to is the accepted artifact of §10.1:

| Item | Value |
| :-- | :-- |
| Artifact | `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1.md` |
| Independent verdict | `M7 EFFECTIVE SPEC V1.1 — INDEPENDENT SPECIFICATION ACCEPT` |
| Accepted candidate commit | `e4f6966df63a4ab575dfdf593819906db817d98b` |
| Artifact Git blob | `06e103b0d5e8cfcbb96ab21134d5605b0aae9b26` |
| Artifact SHA-256 | `457f51778fb5d5890b3e3478376e413072f15aef7da88125b5e78963f49394bd` |
| Protected specification integration | `f99a7e3080fdb99bd3917820d889d09694bed4af` (PR #16) |

This entry does not modify that artifact. Authorization does **not** extend to M7 V1 (`a2d18357…`, §9.4), to any non-accepted V1.1 author round (§10.5), or to any other bytes bearing the same filename. An implementation that departs from the accepted specification is **not** within this authorization; a change of M7 semantics requires a separately accepted specification artifact, not an implementation choice.

### 11.2 The transition — lifecycle, with Gate 1 and Gate 2 kept apart

```
M7 IMPLEMENTATION AUTHORIZED: YES
```

That line has **exactly and only** this meaning, and MUST NOT be quoted without it:

```
M7 IMPLEMENTATION AUTHORIZED: YES
  = GATE 1 GRANTED — M7 IMPLEMENTATION WORK: AUTHORIZED (PERMISSION TO BUILD)
  = permission to begin implementation work conforming to the exact independently accepted
    M7 V1.1 specification (§11.1), and to produce implementation candidates for later
    independent verification and acceptance
  ≠ GATE 2 — M7 IMPLEMENTATION / RUNTIME: NOT ACCEPTED (OPEN)
```

The §10.2 lifecycle, refined so that the two implementation gates are separate stages:

| Stage | Meaning | M7 V1.1 status |
| :-- | :-- | :-- |
| **SPECIFICATION ACCEPTANCE** | independent acceptance of the exact artifact bytes | **DONE** (§10.1) |
| **PROTECTED INTEGRATION** (specification) | those bytes merged into the protected branch | **DONE** — merge `f99a7e3…`, PR #16 (§10.1) |
| **GATE 1 — IMPLEMENTATION WORK AUTHORIZATION** | permission to build conforming implementation candidates and submit them for independent verification | **GRANTED by this entry** (subject to §11.1 "This entry's own status") |
| **IMPLEMENTATION CANDIDATE EXISTS** | an M7 implementation candidate has been produced | **NO** — none exists; none is recorded |
| **GATE 2 — IMPLEMENTATION / RUNTIME ACCEPTANCE** | every applicable acceptance condition of M7 V1.1 independently verified and the implementation accepted | **NOT DONE — OPEN** (§11.4) |
| **MACHINE-READABLE AUTHORITY PUBLICATION / SELECTOR ROTATION** | M7 control-plane manifest accepted and published in `authority/` of an accepted authority-baseline commit; selector rotated to it | **NOT PERFORMED** (§11.5) |
| **DEPLOYMENT / WAVE 0** | any deployment, production use, or study wave | **NOT AUTHORIZED** (§6.1) |

Completion of an earlier stage **never** implies a later one.

**`M7 IMPLEMENTATION AUTHORIZED: YES` does NOT mean, and MUST NOT be cited as meaning, any of the following:**

| Not implied | Status |
| :-- | :-- |
| that an M7 implementation exists | **NO implementation exists** |
| that any implementation is correct | **NOT ESTABLISHED** |
| that any implementation is accepted | **NOT ACCEPTED** |
| that any runtime is accepted | **NOT ACCEPTED** |
| that deployment is authorized | **NOT AUTHORIZED** |
| that Wave 0 is authorized | **NOT AUTHORIZED** |
| that an M7 control-plane manifest is accepted or published | **NOT ACCEPTED, NOT PUBLISHED** |
| that machine-readable authority has changed | **UNCHANGED** |
| that selector rotation has occurred | **NOT PERFORMED** |
| that any `IMP-*` is satisfied | **NONE SATISFIED** — `IMP-01…IMP-22` OPEN |
| that any `MA-*` is satisfied | **NONE SATISFIED** — `MA-1…MA-18` OPEN |
| that real-provider verification has happened | **NOT PERFORMED** |
| that real-deployment verification has happened | **NOT PERFORMED** |
| that any conditional provider/signer closure is closed for any deployment | **NOT CLOSED** for any deployment (§10.6) |
| that any B or C authorization has changed | **UNCHANGED** (§11.6) |

### 11.3 What future implementation work may produce — and what this entry contains

**When work may begin.** Once this transition is independently accepted and protected-integrated, M7 implementation work may begin on a **fresh implementation branch created from the then-current protected authority tip** of `origin/m3.5b-b-integration`. It MUST NOT be based on this transition's authoring branch, on any rejected or non-authoritative candidate (§5, §10.5), or on the rejected B1 implementation (§5.1).

**What that work may include**, as required by M7 V1.1 — each item a **candidate** subject to Gate 2, never accepted by being produced:

- schema / migration implementation of the specified DDL (M7 V1.1 §19; the DDL is specification text, not an executed migration — §10.6);
- runtime modules for the M7 sealed operations (M7 V1.1 §9.2) and write paths;
- PostgreSQL role, ownership, privilege and capability enforcement (M7 V1.1 §18), including fail-closed role provisioning;
- participant-session, privacy/withdrawal/retention/deletion, object-storage and control-plane modules;
- the separate capability-signer process and its sealed topology (M7 V1.1 §11.7, TO-8);
- tests, including the verification cases of M7 V1.1 §25;
- the real-PostgreSQL adversarial harness;
- source / capability / dependency-closure checks extended to M7 modules;
- the CI gate additions of M7 V1.1 §24.3 — **added, never weakening** the accepted `verify` and `authority-gate` checks.

**What this transition entry itself contains: none of them.** It changes exactly one file, this register. It adds or changes no runtime source, Prisma schema, migration, test, `.github/` workflow, `scripts-trusted/` file, `authority/` artifact, repository configuration or external repository variable.

**Implementation-candidate discipline carried forward (restating existing authority, adding no new gate):** an implementation candidate is not accepted by being merged, by passing `verify`/`authority-gate`, or by the self-report of its author; `verify` and `authority-gate` establish repository/integration integrity only (§6.2, §10.1). Gate 2 acceptance is an independent verification of exact bytes.

### 11.4 Gate 2 — preserved OPEN, unchanged

Implementation / runtime **acceptance remains blocked** until **all applicable accepted M7 V1.1 conditions have been independently verified** (§10.7 Gate 2, which remains current). Gate 1 does not close, satisfy, waive, reorder or pre-verify any of them:

```
GATE 2 — M7 IMPLEMENTATION / RUNTIME ACCEPTANCE                     : OPEN — NOT ACCEPTED
  IMP-01…IMP-22  (M7 V1.1 §28.1)                                    : OPEN — none satisfied
  §24.3 CI additions (none exists yet)                              : OPEN
    - hosted real-PostgreSQL adversarial verification (§25)         : OPEN — not executed
    - exact-set catalog verification against a real database (§19.13): OPEN — not executed
    - M7 capability / dependency-closure verification               : OPEN — not executed
    - manifest gates MA-1…MA-18                                     : OPEN
  control-plane manifest acceptance / publication (§23, §24.2)      : OPEN — NOT ACCEPTED, NOT PUBLISHED
  MA-1…MA-18 proofs (§24.2)                                         : OPEN — none satisfied
  selector rotation where required (MA-5, MA-6)                     : OPEN — NOT PERFORMED
  real-provider cases                                               : OPEN — not executed
  real-deployment cases                                             : OPEN — not executed
  conditional provider closure (M7V11R2-AUD-01 / M7V11R3-AUD-01)    : OPEN for every deployment (§10.6)
  conditional signer closure   (M7V11R2-AUD-01 / M7V11R3-AUD-01)    : OPEN for every deployment (§10.6)
  residuals M7-R-01…M7-R-17 (§28.3)                                 : STATED BOUNDS — not eliminated
  every other acceptance condition of accepted M7 V1.1              : OPEN
```

§10.6 categories (b) implementation prerequisites, (c) manifest/control-plane publication gates, (d) selector rotation and (e) runtime/provider/deployment verification remain exactly as recorded there: **OPEN / NOT PERFORMED**. Only category (a), specification closure, is closed, and it was closed by specification acceptance (§10.6), not by this entry.

### 11.5 Machine-readable authority — unchanged

The two-authority architecture of §2.4 and §10.8 is unchanged. `authority/` is absent from this documentation lineage and is neither created nor modified by this entry.

```
M7 CONTROL-PLANE MANIFEST                       : NOT ACCEPTED, NOT PUBLISHED
M7 MACHINE-READABLE AUTHORITY PUBLICATION       : NOT PERFORMED
PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA VALUE     : NOT ASSERTED BY THIS REGISTER (externally governed; §2.4)
SELECTOR ROTATION                               : NOT PERFORMED; NOT AUTHORIZED BY THIS ENTRY
```

This entry does **not** infer, invent, obtain, default or rotate the external selector, and claims no knowledge of its value.

**Why no M7 manifest is created now.** The accepted M7 manifest (M7 V1.1 §23.4) contains **implementation-derived facts** — among them the migration name and `migrationSha256`, the exact role, function, relation and relation-object inventories, per-function `prosrc` digests and EXECUTE grantee sets, transaction-owner and capability-signer topology, backend-liveness functions, lock profiles, storage backend/profile identities and capabilities, and deployment topology. Those facts do not exist until an implementation exists. They MUST later be **derived from the actual implementation and independently reviewed** against it, and published only by a **separately reviewed authority-baseline operation** later in the lifecycle (M7 V1.1 §23.7, §24.2). Gate 1 authorizes producing the implementation from which they will be derived; it does not authorize, and this entry does not perform, their publication.

### 11.6 B and C — unchanged; no leakage

M7 implementation-work authorization **does not leak** into B or C authorization. It does not alter the B Semantic Ratification V1.3, JBA V1.9, JBA Amendment 01, B1S/B2S ownership (§7), S-2 Path A/Path B semantics (§9.7), **P-16**, or C1/C2 authority.

- **B1S design:** may proceed under the accepted **non-grounding Path B** (§9.7) — unchanged.
- **Path A:** still requires an **accepted M7 ingestion integration contract**. Gate 1 creates no such contract; M7 implementation work does not constitute one; whether M7 facts satisfy `DB-03B` remains **B1S-owned** and requires B-scoped acceptance (§10.9; M7 V1.1 §28.2).
- **B1 implementation:** NO. **B2 implementation:** NO. **P-16: ACTIVE** — unchanged.
- **C1 implementation:** NO. **C2 implementation:** NO. `AnalysisProtocol v1`: **UNFROZEN** (§6.1) — unchanged.
- **Wave 0 / deployment:** **NOT AUTHORIZED** (§6.1) — unchanged.

### 11.7 Current authorization matrix *(historical matrix at PR #18; current matrix §17.12)*

```
M7 EFFECTIVE SPEC V1                    : BLOCKED / NON-AUTHORITATIVE
M7 SPECIFICATION (V1.1)                 : ACCEPTED — SPECIFICATION ACCEPTANCE DONE, PROTECTED INTEGRATION DONE
                                          (merge f99a7e3080fdb99bd3917820d889d09694bed4af, PR #16)
M7 IMPLEMENTATION AUTHORIZED            : YES — GATE 1 ONLY (see the next two rows; never quote this row alone)
M7 IMPLEMENTATION WORK                  : AUTHORIZED — permission to build conforming candidates for later
                                          independent verification (§11.2)
M7 IMPLEMENTATION                       : NOT ACCEPTED — GATE 2 OPEN; no implementation exists (§11.4)
M7 RUNTIME                              : NOT ACCEPTED
IMP-01…IMP-22                           : OPEN
MA-1…MA-18                              : OPEN
§24.3 CI ADDITIONS                      : OPEN — none exists
M7 CONTROL-PLANE MANIFEST               : NOT ACCEPTED / NOT PUBLISHED
M7 MACHINE-READABLE AUTHORITY           : NOT PUBLISHED
PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA   : NOT ASSERTED BY THIS REGISTER
SELECTOR ROTATION                       : NOT PERFORMED
REAL-PROVIDER VERIFICATION              : NOT PERFORMED
REAL-DEPLOYMENT VERIFICATION            : NOT PERFORMED
RESIDUALS M7-R-01…M7-R-17               : STATED BOUNDS — NOT ELIMINATED
DEPLOYMENT / WAVE 0                     : NOT AUTHORIZED
B1S DESIGN                              : YES — MAY use the accepted S-2 non-grounding default (§9.7); Path A only
                                          with an accepted M7 ingestion integration contract (§10.9, §11.6)
B2S DESIGN                              : per existing JBA / P-16 sequencing (§6, §7) — unchanged
B1 IMPLEMENTATION                       : NO
B2 IMPLEMENTATION                       : NO
C1 IMPLEMENTATION                       : NO
C2 IMPLEMENTATION                       : NO
AnalysisProtocol v1                     : UNFROZEN
P-16                                    : ACTIVE
```

This matrix records status established by §6, §7, §9, §10 and §11.1–§11.6; it authorizes nothing beyond them. The only row changed relative to §10.10 is M7 implementation authorization, and only in the Gate 1 sense; the rows added here make explicit states §10 already recorded.

---

## 12. M7 V1.1 Implementation-Readiness Erratum 01 — ACCEPTED, PROTECTED-INTEGRATED (clause-scoped; specification only)

This section records a lifecycle transition that has **already occurred**: the independent acceptance and the protected integration of Erratum 01 to the accepted M7 V1.1 specification. It synchronizes this register with that fact. It does **not** restate, amend or re-open Erratum 01 or M7 V1.1; it does **not** duplicate Erratum 01's normative algorithms; it does **not** implement M7, author a manifest, publish machine-readable authority, create or modify `authority/`, assert or rotate `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA`, or authorize CCA implementation. Nothing in this section modifies §1, §2, §3, §3.1, §3.2, §9.1–§9.3, the §10.1 identity, §10.6 categories (b)–(e), the §10.7 Gate 2 list, the Gate 1 grant of §11, the B Semantic Ratification V1.3, JBA V1.9 or its Amendment 01, the A1/A2→M7 Consent Compatibility Amendment 01, B1S/B2S ownership, S-2 Path A / Path B, **P-16**, or C1/C2 authority.

> **Reading note — later lifecycle events (PR #20 integration; §13).** §12 was written as an author candidate against protected tip `3ef0b3a…`. It has since been **protected-integrated by merge `30034041df3280286fa9c85ac937894ef767e890` (PR #20; §13.1)**; the statements of §12.10 that it records no PR or merge identity are therefore historical and are preserved rather than rewritten. **§12.7 (`CCA IMPLEMENTATION AUTHORIZATION: NOT YET GRANTED`) was true when written and is preserved as historical**; it is superseded, **for implementation-work authorization only**, by §13, which is the separate, explicit authority transition §12.7 anticipated (and addresses Erratum 01 obligation `E01-DO-6`, subject to §13.1). The last bullet of §12.6 — which left undecided whether an M7 implementation step depending on CCA runtime machinery may proceed before that transition — is read with §13.7. The §12.11 matrix is historical as recorded at PR #20; the current matrix is §17.12. Everything else in §12 — §12.1–§12.5, the M7 Gate 1 / Gate 2 statements of §12.6, §12.8 and §12.9 — **remains current and unchanged** by §13.

> **Reading note — later lifecycle events (Erratum 02; §14).** Erratum 02 does **not** amend Erratum 01 and leaves ER-01…ER-05, §12.1–§12.5, §12.8 and §12.9 unchanged. The §12.6 "Conformance target" bullet (`M7 V1.1 + accepted Erratum 01`) was true when written and is preserved as historical; the current conformance target is **M7 V1.1 + accepted Erratum 01 + accepted Erratum 02** (§14.5), and the §12.6 currency consequence applies equally to Erratum 02. The §12.5 LC-1 annotation "no M7 implementation candidate exists" and the §12.6 bullet "No implementation exists" are read with §14.6: the M7-S01 and M7-S02 implementation-line slices integrated into implementation staging after PR #21 are **not** a completed implementation candidate, and **LC-1 has NOT OCCURRED**. The Gate 1 / Gate 2 statements of §12.6 remain current.

> **Reading note — later lifecycle events (Erratum 03; §15).** Erratum 03 does **not** amend Erratum 01 and leaves ER-01…ER-05, §12.1–§12.5, §12.8 and §12.9 unchanged. The conformance-target statements of §12.6 and of the preceding note (§14.5) were true when written and are preserved as historical; the current conformance target is **M7 V1.1 + accepted Erratum 01 + accepted Erratum 02 + accepted Erratum 03** (§15.2), and the §12.6 currency consequence applies equally to Erratum 03. **LC-1 has NOT OCCURRED** (§15.7). The Gate 1 / Gate 2 statements of §12.6 remain current.

### 12.1 Exact identities

**Accepted erratum artifact.**

| Item | Value |
| :-- | :-- |
| Artifact | `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_01.md` |
| **Status** | **ACCEPTED + PROTECTED-INTEGRATED** (specification erratum; clause-scoped) |
| Independent verdict | `M7 V1.1 IMPLEMENTATION READINESS ERRATUM 01 — INDEPENDENT SPECIFICATION ERRATUM ACCEPT` |
| Verdict binds | the **exact artifact bytes** identified by the SHA-256 and Git blob below, and no other bytes |
| **Accepted erratum SHA-256** | `f381cb015adadc7a22463060da7ff55e8711b8ab13879c60f93cabf53eb863e8` |
| **Accepted erratum Git blob** | `15ee22090d3e37b6a63dd25914f8abb0f4fa9d4b` |
| Accepted author candidate commit | `16e232330c86c92285804eb55ecb18d7f3cdf309` (author revision R2) |
| Candidate tree | `1e7e2e5b2d8269c0ed8746c0cfdc15bb4f44dbef` |
| Candidate sole parent (authoring baseline) | `ca1be1bcbef7f6a98a0396d446816bf099075c40` (PR #18 merge) |
| Integration PR | `#19` — *docs(spec): integrate M7 V1.1 implementation-readiness erratum 01* |
| **Formal protected integration merge** | `3ef0b3ad0fb02cba84a60d0529fe054427b9f68c` |
| Merge parents (in order) | 1. `ca1be1bcbef7f6a98a0396d446816bf099075c40` — 2. `16e232330c86c92285804eb55ecb18d7f3cdf309` |
| **Merge tree** | `1e7e2e5b2d8269c0ed8746c0cfdc15bb4f44dbef` (identical to the accepted candidate tree) |
| Paths changed by the merge relative to `ca1be1b…` | exactly one, added: `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_01.md` |
| GitHub signature | verified |
| Post-merge required checks | `authority-gate` — SUCCESS; `verify` — SUCCESS |
| Protected integration surface | `origin/m3.5b-b-integration` (see §8.1) |

**Accepted base specification — unchanged by the erratum and by this entry.** `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1.md` remains at Git blob `06e103b0d5e8cfcbb96ab21134d5605b0aae9b26`, SHA-256 `457f51778fb5d5890b3e3478376e413072f15aef7da88125b5e78963f49394bd` (§10.1), identical at `f99a7e3…`, at `ca1be1b…` and at `3ef0b3a…`.

**PR #18 — the §11 Gate 1 transition, now protected-integrated.** Recorded from Git history as provenance only; no identity below is rewritten.

| Item | Value |
| :-- | :-- |
| Entry | M7 V1.1 Implementation Work Authorization (Gate 1) — `docs(authority): authorize M7 V1.1 implementation work` (§11) |
| Transition candidate commit | `888b0390b431a3ab249a5dbe742ea0af1c9ece2e` |
| `PAGAMENOS_SPEC_AUTHORITY.md` Git blob at the candidate and at the merge | `717f1f6185dd60632000c3c3edfdce5060b98d1f` |
| PR | `#18` |
| **Formal protected integration merge** | `ca1be1bcbef7f6a98a0396d446816bf099075c40` |
| Merge parents (in order) | 1. `e7423b81edf11559d46d3bc595a491ab1a538ea6` — 2. `888b0390b431a3ab249a5dbe742ea0af1c9ece2e` |
| Merge tree | `e7e8426c818c8766d7b8284a4f77dbf628180dea` |
| Paths changed by the merge relative to `e7423b8…` | exactly one: `PAGAMENOS_SPEC_AUTHORITY.md` |

**Superseded erratum candidates — non-authoritative.** `e3fde238b376eab126ebb516b62ac0955c8b16e1` (`REQUIRES PATCH`; `E01-AUD-01`, `E01-AUD-02`) and `80879ef5f79defde11f3806115568ff3f5392d05` (R1; `REQUIRES PATCH — ROUND 2`; `E01-AUD-03`) are **`SUPERSEDED / NOT ACCEPTED / NON-AUTHORITATIVE AUDIT EVIDENCE ONLY`** (§5), as the accepted artifact itself records (Erratum 01 revision note, §13). Neither is an ancestor of `16e2323…` or of `3ef0b3a…`. The shared filename does not transfer acceptance: **only** the bytes identified above are accepted.

**What the post-merge checks establish.** As for §6.2 and §10.1: `authority-gate` and `verify` on `3ef0b3a…` establish **integration integrity of this documentation merge only**. They are not any §24.3 CI addition, manifest gate, real-PostgreSQL, real-provider or real-deployment verification, and are not claimed to be.

### 12.2 Relation to the accepted M7 V1.1 base specification

```
M7 V1.1 BASE SPECIFICATION        : ACCEPTED — REMAINS THE ACCEPTED BASE (§10.1); BYTES NOT EDITED
M7 V1.1 SUPERSEDED WHOLESALE      : NO
ERRATUM 01                        : ACCEPTED + PROTECTED-INTEGRATED — CLAUSE-SCOPED
READING                           : M7 V1.1 READ TOGETHER WITH ERRATUM 01 FOR THE CLAUSES ERRATUM 01 NORMATIVELY AMENDS
```

- **The accepted V1.1 bytes are not edited and are not superseded wholesale.** Erratum 01 is read **beside** them (Erratum 01 §1.2).
- **Clause-scoped control.** Where an Erratum 01 "After" text replaces or narrows an enumerated V1.1 clause, the Erratum 01 text controls **for that clause only**; it re-opens no neighbouring clause, identifier, count or proof (Erratum 01 §4 rules 2–3).
- **Everything else is V1.1 exactly as accepted.** Every clause Erratum 01 does not enumerate is governed by the accepted V1.1 bytes (Erratum 01 §1.2, §10.1). An apparent conflict outside the enumerated clauses is resolved in favour of the accepted V1.1 bytes and is an erratum defect to be reported, not resolved by interpretation (Erratum 01 §4 rule 4).
- **Precedence** is registered under the header reading rule, item (8a): Erratum 01 inherits the scope and subordination of M7 V1.1 (§10.3) and gains none beyond it.
- **Authored status statements resolved by events, not edits.** The integrated erratum still carries its authored header (`AUTHOR CANDIDATE — NOT YET AUTHORITATIVE`, `NOT SELF-ACCEPTED — AWAITING INDEPENDENT AUDIT`) and its §12 author-side status block (`INDEPENDENT ACCEPTANCE : NOT PERFORMED`, `PROTECTED INTEGRATION : NOT PERFORMED`). As with M7 V1.1 (§10.4), these are resolved by the independent verdict and the protected integration recorded in §12.1; the file is deliberately **not** modified, because any byte change would break the exact-byte binding. Its statements about **other** things — no `IMP-*` or `MA-*` satisfied, manifest not authored/accepted/published, machine-readable authority unchanged, selector not asserted or rotated, CCA implementation authorization not decided, B1/B2 and C1/C2 not authorized, P-16 active — remain **true** and are reaffirmed by §12.6–§12.9. Its statement that *"M7 implementation execution remains paused pending independent acceptance and protected integration of this erratum"* names a condition that events have now satisfied; that satisfaction **starts no implementation**, and this register records none (§12.6).

### 12.3 Normative deltas incorporated — ER-01…ER-05

ER-01…ER-05 are incorporated **according to Erratum 01**, which is the sole authority for their content. This register records only their existence, subject and scope; it does **not** restate their rules, formulas, procedures or proofs, and any paraphrase below yields to the accepted erratum text.

| ID | Subject | V1.1 clauses amended (per Erratum 01 §2.1) | Registered effect |
| :-- | :-- | :-- | :-- |
| **ER-01** | manifest digest ↔ migration digest dependency cycle | §23.3 (digest row); §23.4 `database.migrationSha256` and `database.controlPlaneInstall` (derivation only); §19.13.4 install-sequence comment (derivation only); §23.5 last sentence (derivation only); §24.2 MA-1 (reproduction procedure named) | the digest cycle present in the accepted text read literally is **resolved by the accepted MD / MG derivation rules of Erratum 01 §5**, which define how the manifest digest and `migrationSha256` are derived and verified; **those rules are authority only as written in Erratum 01 and are not reproduced here**. MA-1 is reworded to name the reproduction procedures. No manifest field, function, table or gate is added |
| **ER-02** | stale five-credential / five-login-role cardinality | §24.3 third bullet; §25.2 row T-08b (cardinality only) | the count is corrected as Erratum 01 §6.2 states; T-08b keeps its ID; the distinct T-ID total remains 209; no grant or credential-separation rule changes |
| **ER-03** | PA-1 lock inventory | §16.2.4 PA-1 row and consequence (b) | PA-1's inventory is corrected as Erratum 01 §7.2 states; no lock is added, removed or reordered; the LG-THEOREM remains valid per Erratum 01 §7.1 |
| **ER-04** | meaning of `authority.baselineCommit` | §23.4 `authority` row (meaning of one field) | the field has exactly the meaning Erratum 01 §8.2 gives it; the field list is unchanged; `baselineCommit` is **not** a machine-authority commit or selector value and MUST NOT be used to infer one (Erratum 01 §8.2) |
| **ER-05** | MA-6 / selector rotation / Gate-2 lifecycle | §24.2 MA-6; lifecycle event names for §23.7 and §24.2 | MA-6 names its preconditions, and the lifecycle events are named and ordered, as Erratum 01 §9.0 states; this register's wording is synchronized accordingly (§12.5) |

**Erratum 01 §10.1 (preserved without change) remains binding as written there**, including its statements that the verification-case total, `IMP-01…IMP-22`, `MA-1…MA-18` (except the MA-1 and MA-6 rewordings), `M7-R-01…M7-R-17`, consent semantics and the CCA boundary are unchanged. This entry adds no count of its own.

### 12.4 Classification-only findings — no normative delta

| ID | Registered status |
| :-- | :-- |
| **D-13** — existing `authority-gate` four-file inventory vs a future M7 manifest | **Downstream implementation / control-plane compatibility matter** (Erratum 01 §9.1). Not an M7 V1.1 contradiction; no M7 specification amendment. If the eventual machine-readable layout requires the existing inventory to change, that is a **separate machine-readable-authority / workflow amendment** under its own authority (§2.4). This entry changes no gate, workflow, `authority/` path or selector |
| **D-06** — presigned staging URLs vs XC-6 signing-SDK ownership | **Classification only** (Erratum 01 §9.2). `SERVER_MEDIATED` is the **currently conforming implementation path**. `PRESIGNED_PUT` **remains unavailable to an implementation** until an architecture for it satisfies existing authority — XC-6 / T-171b (iv) and the accepted signer/import boundary as written; if that is not achievable, enabling it is a separate authority question. Database-level verification cases that register a `PRESIGNED_PUT` profile row remain required as written. No signer boundary is redesigned and XC-6 is not re-scoped |

### 12.5 Lifecycle terminology — synchronized with ER-05

Erratum 01 ER-05 names distinct lifecycle events and forbids collapsing them or recording any of their verdicts with the bare words "accepted" / "acceptance" (Erratum 01 §9.0, "Verdict naming"). This register adopts those names. **None of these events has occurred, and this entry performs none of them.**

```
LC-1  IMPLEMENTATION CANDIDATE COMPLETION                  : NOT OCCURRED — no M7 implementation candidate exists
LC-2  PRE-PUBLICATION TECHNICAL VERIFICATION (optional)    : NOT OCCURRED — permitted; not a required stage; confers no acceptance
LC-3  MANIFEST INDEPENDENT REVIEW AND ACCEPTANCE           : NOT OCCURRED — no manifest authored
LC-4  MACHINE-READABLE AUTHORITY PUBLICATION               : NOT OCCURRED
LC-5  PRIVILEGED SELECTOR ROTATION                         : NOT OCCURRED — NOT AUTHORIZED BY ERRATUM 01 OR BY THIS ENTRY
LC-6  POST-ROTATION MA VERIFICATION                        : NOT OCCURRED
LC-7  GATE-2 M7 IMPLEMENTATION / RUNTIME ACCEPTANCE        : NOT OCCURRED — GATE 2 OPEN
```

**Synchronized readings of earlier register wording** (no status changes):

- The single stage "MACHINE-READABLE AUTHORITY PUBLICATION / SELECTOR ROTATION" of §10.2 and §11.2 denotes, in order, manifest independent review/acceptance (LC-3), machine-readable authority publication (LC-4), privileged selector rotation (LC-5) and post-rotation MA verification (LC-6) — distinct events, none implying another.
- "Selector rotation where required (MA-5, MA-6)" in §10.6 (d), §10.7 and §11.4 is read with **MA-6 as amended by Erratum 01**: rotation occurs only after LC-3 and LC-4, precedes LC-7, and neither requires nor implies Gate-2 implementation/runtime acceptance. Rotation remains an **input** to Gate 2, as §11.4 already records.
- The §10.8 restatement of MA-6 that Erratum 01 identified as carrying the ambiguity has been replaced in place, with its PR #17 wording preserved as an annotation.
- **Implementation candidate completion (LC-1) is not an acceptance; manifest independent review and acceptance (LC-3) accepts the manifest as a description and does not accept the implementation; publication (LC-4) and rotation (LC-5) accept no implementation and authorize no deployment or Wave 0; only Gate-2 implementation/runtime acceptance (LC-7) accepts an M7 implementation.**

Erratum 01's downstream obligation `E01-DO-5` (register synchronization recording the erratum, including the MA-6 restatement of §10.8) is **addressed by this entry as an author candidate**; it is discharged only when this entry is itself independently accepted and protected-integrated (§12.10).

### 12.6 Effect on M7 implementation authorization — Gate 1 unchanged, Gate 2 open

```
M7 IMPLEMENTATION WORK: AUTHORIZED — GATE 1 ONLY
M7 IMPLEMENTATION / RUNTIME: NOT ACCEPTED — GATE 2 OPEN
```

- **Erratum 01 does not revoke Gate 1** (§11), and does not narrow, re-grant or re-condition it (Erratum 01 §1.1).
- **Conformance target.** Any future M7 implementation candidate MUST conform to **M7 V1.1 + accepted Erratum 01** — the accepted V1.1 bytes of §10.1, read together with Erratum 01 for the clauses it amends. An implementation that follows an amended V1.1 clause in a way that conflicts with Erratum 01's controlling text for that clause is **not** within the §11 authorization.
- **Currency.** Under Erratum 01 ER-04, a manifest describing an implementation candidate whose documentation-authority baseline does not incorporate this accepted erratum MUST NOT be accepted at manifest independent review (Erratum 01 §8.2, §10.5 item 4). This is consistent with §11.3's requirement that implementation work start from a fresh branch created from the then-current protected tip. This entry restates that consequence; it adds no gate.
- **No implementation exists.** No M7 implementation candidate, migration, manifest, runtime module, test, CI addition or deployment exists or is recorded.
- **Nothing in Gate 2 is closed.** `IMP-01…IMP-22`: **OPEN — none satisfied**. `MA-1…MA-18`: **OPEN — none satisfied** (MA-1 and MA-6 are reworded by Erratum 01, not satisfied). **§24.3 CI additions: NOT IMPLEMENTED — none exists.** Real-PostgreSQL, real-provider and real-deployment verification: **NOT PERFORMED**. Conditional provider and signer closures: **OPEN for every deployment** (§10.6). Residuals `M7-R-01…M7-R-17`: stated bounds, not eliminated. The §10.7 Gate 2 list and §11.4 remain current.
- **Execution.** This entry neither schedules nor starts M7 implementation execution (including any first implementation slice), and does not decide whether any M7 implementation step that depends on CCA runtime machinery may proceed before the separate CCA transition (§12.7).

### 12.7 CCA implementation authorization — NOT YET GRANTED *(historical status at PR #20; superseded, for implementation-work authorization only, by §13)*

```
[HISTORICAL — as recorded at PR #20; superseded, for implementation-work authorization only, by §13]
CCA IMPLEMENTATION AUTHORIZATION: NOT YET GRANTED
```

- **Erratum 01 does not decide it.** Erratum 01 records `CCA IMPLEMENTATION AUTHORIZATION : NOT DECIDED BY THIS ERRATUM` and states that it neither authorizes, forbids, schedules nor pre-conditions that work, and that nothing in it may be cited as CCA implementation authorization (Erratum 01 §2.3; obligation `E01-DO-6`).
- **No register entry grants it.** No entry of this register — including the §11 Gate 1 transition and this §12 entry — records a grant of implementation authorization for the A1/A2→M7 Consent Compatibility Amendment 01 runtime machinery. This entry does **not** grant it.
- **The accepted CCA specification is preserved unchanged.** `PAGAMENOS_A1_A2_M7_CONSENT_COMPATIBILITY_AMENDMENT_01.md` remains **ACCEPTED — FORMALLY INTEGRATED** with the identity and scope of §9.1–§9.3; `DEP-03` remains closed by it (§9.3); it remains "not M7 implementation authorization" (§9.1).
- **A separate, explicit authority transition**, after this root synchronization, decides CCA implementation authorization. This entry does not decide, schedule or pre-condition that transition.

### 12.8 Machine-readable authority — unchanged

The two-authority architecture of §2.4, §10.8 and §11.5 is unchanged. `authority/` is absent from this documentation lineage (`git ls-tree -r HEAD authority/` is empty at `3ef0b3a…`) and is neither created nor modified by Erratum 01 or by this entry.

```
M7 CONTROL-PLANE MANIFEST: NOT AUTHORED / NOT ACCEPTED / NOT PUBLISHED
MACHINE-READABLE AUTHORITY: UNCHANGED
PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA: NOT ASSERTED
SELECTOR ROTATION: NOT PERFORMED
```

This entry does **not** infer, invent, obtain, default or rotate the external selector, and claims no knowledge of its value. Erratum 01's ER-01 and ER-04 define how certain manifest quantities are **derived** once an implementation candidate exists; they author no manifest and publish nothing.

### 12.9 B and C — unchanged; no leakage

Erratum 01 and this entry do **not** alter the B Semantic Ratification V1.3, JBA V1.9, JBA Amendment 01, B1S/B2S ownership (§7), S-2 Path A / Path B (§9.7), **P-16**, or C1/C2 authority (Erratum 01 §10.1).

- **B1 implementation: NO. B2 implementation: NO.**
- **C1: NO. C2: NO.** `AnalysisProtocol v1`: **UNFROZEN** (§6.1). Wave 0 / deployment: **NOT AUTHORIZED**.
- **P-16: ACTIVE.** Erratum 01 is **not** a resolution of the B1↔B2 cross-contract condition and MUST NOT be read as satisfying P-16.
- **Path B** (S-2 non-grounding default): status **unchanged** — complete; B1S design may proceed under it (§9.7).
- **Path A** (S-2 grounding): still depends on the **accepted M7 ingestion integration contract** according to existing authority (§9.7, §10.9, §11.6). Erratum 01 is not that contract, creates none, and does not decide `DB-03B` sufficiency, which remains B1S-owned.

### 12.10 This entry's own status

This entry is an **author candidate** for a root authority synchronization. It records **no** acceptance verdict, commit, PR or merge identity of its own, and MUST NOT be read as independently accepted or protected-integrated by virtue of its text. As with every prior entry, it is authority only as recorded in this register at the protected integration surface following independent acceptance of the exact register bytes.

It was authored against the protected tip `origin/m3.5b-b-integration` = `3ef0b3ad0fb02cba84a60d0529fe054427b9f68c`. It changes exactly one file, this register. It changes no specification artifact (M7 V1.1, Erratum 01, the Consent Compatibility Amendment 01, JBA V1.9 or its Amendment 01, the B Semantic Ratification V1.3), and no runtime source, Prisma schema, migration, test, `.github/` workflow, `scripts-trusted/` file, `authority/` artifact, repository configuration or external repository variable.

### 12.11 Current authorization matrix *(historical matrix at PR #20; current matrix §17.12)*

```
[HISTORICAL — as recorded at PR #20; CCA IMPLEMENTATION AUTHORIZATION row superseded, implementation work only, by §13]
M7 EFFECTIVE SPEC V1                    : BLOCKED / NON-AUTHORITATIVE
M7 V1.1 BASE SPEC                       : ACCEPTED — SPECIFICATION ACCEPTANCE DONE, PROTECTED INTEGRATION DONE
                                          (merge f99a7e3080fdb99bd3917820d889d09694bed4af, PR #16); bytes unedited
M7 ERRATUM 01                           : ACCEPTED + PROTECTED-INTEGRATED — clause-scoped
                                          (candidate 16e232330c86c92285804eb55ecb18d7f3cdf309;
                                           merge 3ef0b3ad0fb02cba84a60d0529fe054427b9f68c, PR #19)
M7 SPECIFICATION READING                : M7 V1.1 + ACCEPTED ERRATUM 01 (for the clauses Erratum 01 amends)
ER-01…ER-05                             : INCORPORATED ACCORDING TO ERRATUM 01
D-13                                    : DOWNSTREAM IMPLEMENTATION / CONTROL-PLANE COMPATIBILITY MATTER
D-06                                    : CLASSIFICATION ONLY — SERVER_MEDIATED CONFORMING; PRESIGNED_PUT UNAVAILABLE
M7 IMPLEMENTATION AUTHORIZED            : YES — GATE 1 ONLY (see the next two rows; never quote this row alone)
M7 IMPLEMENTATION WORK                  : AUTHORIZED — GATE 1 (§11; not revoked by Erratum 01); candidates MUST
                                          conform to M7 V1.1 + accepted Erratum 01 (§12.6)
M7 IMPLEMENTATION / RUNTIME             : NOT ACCEPTED — GATE 2 OPEN; no implementation exists (§11.4, §12.6)
IMP-01…IMP-22                           : OPEN
MA-1…MA-18                              : OPEN
§24.3 CI ADDITIONS                      : OPEN — none exists
LC-1…LC-7                               : NONE OCCURRED (§12.5)
M7 CONTROL-PLANE MANIFEST               : NOT AUTHORED / NOT ACCEPTED / NOT PUBLISHED
MACHINE-READABLE AUTHORITY              : UNCHANGED
PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA   : NOT ASSERTED
SELECTOR ROTATION                       : NOT PERFORMED
REAL-PROVIDER VERIFICATION              : NOT PERFORMED
REAL-DEPLOYMENT VERIFICATION            : NOT PERFORMED
RESIDUALS M7-R-01…M7-R-17               : STATED BOUNDS — NOT ELIMINATED
DEPLOYMENT / WAVE 0                     : NOT AUTHORIZED
CCA SPECIFICATION (AMENDMENT 01)        : ACCEPTED — FORMALLY INTEGRATED (§9.1); unchanged
CCA IMPLEMENTATION AUTHORIZATION        : NO — NOT YET GRANTED (§12.7)
B1S DESIGN                              : YES — MAY use the accepted S-2 non-grounding default (§9.7); Path A only
                                          with an accepted M7 ingestion integration contract (§10.9, §11.6, §12.9)
B2S DESIGN                              : per existing JBA / P-16 sequencing (§6, §7) — unchanged
B1 IMPLEMENTATION                       : NO
B2 IMPLEMENTATION                       : NO
C1 IMPLEMENTATION                       : NO
C2 IMPLEMENTATION                       : NO
AnalysisProtocol v1                     : UNFROZEN
P-16                                    : ACTIVE
```

This matrix records status established by §6, §7, §9, §10, §11 and §12.1–§12.10; it authorizes nothing beyond them. Relative to §11.7, it adds rows for the reading of the accepted base specification with Erratum 01, ER-01…ER-05, D-13, D-06, the LC lifecycle, the CCA specification and CCA implementation authorization; it changes no M7 implementation, machine-readable authority, B or C status.

---

## 13. A1/A2→M7 Consent Compatibility Amendment 01 — Implementation Work Authorization (CCA implementation NOT accepted)

This section is the **separate, explicit authority transition** that §12.7 records as deciding implementation authorization for the A1/A2→M7 Consent Compatibility Amendment 01 (the "CCA", §9.1). It grants permission to **build** conforming runtime/enforcement machinery implementing the exact accepted CCA; it accepts **nothing built**. It does **not** restate, amend, re-open or edit the accepted CCA artifact; it does **not** implement the CCA or M7; it does **not** begin any M7 implementation slice, including M7-S01; it does **not** author, accept or publish any manifest, create or modify `authority/`, assert or rotate `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA`, or authorize deployment. Apart from the reading notes, annotations and pointer updates enumerated in §13.11, nothing in this section modifies §1, §2.1–§2.4, §3, §3.1, §3.2, §9.1–§9.3, the §10.1 identity, §10.6 categories (b)–(e), the §10.7 Gate 2 list, §10.8, the Gate 1 grant of §11, §11.4, §12.1–§12.6, §12.8, §12.9, the B Semantic Ratification V1.3, JBA V1.9 or its Amendment 01, M7 V1.1, Erratum 01, the A1 or A2 specifications, B1S/B2S ownership, S-2 Path A / Path B, **P-16**, or C1/C2 authority.

> **Reading note — later lifecycle events (PR #21 integration; M7-S01/M7-S02; Erratum 02; §14).** §13 was written as an author candidate against protected tip `3003404…`. It has since been **protected-integrated by merge `f1fd894b60b70e07143d474992ff8b3c5dd88fe1` (PR #21; §14.1)**; the statements of §13.1 "This entry's own status" that it records no PR or merge identity, and that the §12.7 state remains the protected state, are therefore historical and are preserved rather than rewritten. The CCA grant of §13.3–§13.10 is **unchanged**: `CCA IMPLEMENTATION WORK: AUTHORIZED`; `CCA IMPLEMENTATION: NOT ACCEPTED`. The statements that M7-S01 is not executed and that no M7 implementation slice has been executed (§13 introduction, §13.3 table, §13.7 last bullet, §13.13 `M7-S01` row) were true when written and are preserved as historical: M7-S01 and M7-S02 were subsequently executed, independently accepted and integrated into implementation staging (§14.6); neither is a completed implementation candidate (LC-1 NOT OCCURRED) or Gate-2 acceptance. Wherever §13 names **M7 V1.1 + accepted Erratum 01** as the M7 conformance target (§13.4, §13.7), that target is now **M7 V1.1 + accepted Erratum 01 + accepted Erratum 02** (§14.5). The §13.13 matrix is historical as recorded at PR #21; the current matrix is §17.12. *(Later events — Erratum 03, §15: that target is now **M7 V1.1 + accepted Erratum 01 + accepted Erratum 02 + accepted Erratum 03** (§15.2); the CCA grant of §13.3–§13.10 is unchanged.)*

> **Two words that MUST NOT be interchanged — CCA.** In this register, `CCA … ACCEPTED` (§9.1) refers to the **specification** only. `CCA IMPLEMENTATION WORK: AUTHORIZED` means only *permitted to build conforming machinery and to submit it for independent verification*. It never implies, and MUST NOT be cited as evidence of, `CCA IMPLEMENTATION: ACCEPTED` or CCA runtime acceptance. Any statement of the form "the CCA is authorized" that omits what is meant MUST be read as implementation work only; any statement of the form "the CCA is accepted" MUST be read as the specification only.

### 13.1 Starting point, provenance and this entry's own status

**This entry's own status.** This entry is an **author candidate** for an authority transition. It records **no** acceptance verdict, commit, PR or merge identity of its own, and MUST NOT be read as independently accepted or protected-integrated by virtue of its text. As with every prior entry in this register, the transition is authority only as recorded in this register at the protected integration surface following independent acceptance of the exact register bytes; the independent auditor binds acceptance to those bytes externally. Until then, the §12.7 state remains the protected state.

**Starting point.** Authored against the protected tip `origin/m3.5b-b-integration` = `30034041df3280286fa9c85ac937894ef767e890` (tree `0e29dc893d4230b85dde704a3d63f96ac67f3a80`).

**Post-Erratum-01 root authority sync — now protected-integrated** (this is the entry that wrote §12):

| Item | Value |
| :-- | :-- |
| Entry | Post-Erratum-01 root authority synchronization — `docs(authority): sync M7 V1.1 erratum 01` (§12) |
| Root-sync candidate commit | `be9c1024026bbeb2ce3776b92538e71d131146b8` |
| Candidate sole parent (authoring baseline) | `3ef0b3ad0fb02cba84a60d0529fe054427b9f68c` (PR #19 merge) |
| Candidate tree | `0e29dc893d4230b85dde704a3d63f96ac67f3a80` |
| `PAGAMENOS_SPEC_AUTHORITY.md` Git blob at the candidate and at the merge | `beae3e384027bc4a1ee59f3a89721adb41737604` |
| PR | `#20` |
| **Formal protected integration merge** | `30034041df3280286fa9c85ac937894ef767e890` |
| Merge parents (in order) | 1. `3ef0b3ad0fb02cba84a60d0529fe054427b9f68c` — 2. `be9c1024026bbeb2ce3776b92538e71d131146b8` |
| **Merge tree** | `0e29dc893d4230b85dde704a3d63f96ac67f3a80` (identical to the candidate tree) |
| Paths changed by the merge relative to `3ef0b3a…` | exactly one: `PAGAMENOS_SPEC_AUTHORITY.md` |
| GitHub signature | verified |
| Post-merge required checks | `authority-gate` — SUCCESS; `verify` — SUCCESS |
| Protected integration surface | `origin/m3.5b-b-integration` (see §8.1) |

As for §6.2, §10.1 and §12.1, `authority-gate` and `verify` on `3003404…` establish **integration integrity of that documentation merge only**. Earlier protected identities are **not rewritten** by this entry: PR #12 merge `d64ea203e2022b6f313bc35b32a8ea0f961caecc` (§3.2); PR #14 merge `f54d95abb0a8f7988626597a0eef01d0b0ae3c95` (§9.1); PR #15 merge `8990ae0ca5af6862b741a14dedb4aa37831976b9`; PR #16 merge `f99a7e3080fdb99bd3917820d889d09694bed4af` (§10.1); PR #17 merge `e7423b81edf11559d46d3bc595a491ab1a538ea6` (§11.1); PR #18 merge `ca1be1bcbef7f6a98a0396d446816bf099075c40` and PR #19 merge `3ef0b3ad0fb02cba84a60d0529fe054427b9f68c` (§12.1).

### 13.2 Controlling specification — exact CCA bytes, unmodified

The only specification this authorization applies to is the accepted artifact of §9.1:

| Item | Value |
| :-- | :-- |
| Artifact | `PAGAMENOS_A1_A2_M7_CONSENT_COMPATIBILITY_AMENDMENT_01.md` |
| Status | **ACCEPTED — FORMALLY INTEGRATED** (specification; §9.1) — `A1/A2→M7 CONSENT COMPATIBILITY AMENDMENT 01 — ACCEPTED / FORMALLY INTEGRATED` |
| Independent verdict | `A1/A2→M7 CONSENT COMPATIBILITY AMENDMENT 01 ACCEPT` |
| Accepted author candidate | `d6434e4597a178fde45faf74da0298fdb5755d37` |
| Candidate / integration tree | `3a88b1f151de2aa038afdbcf9acd0ec17354ef39` |
| **Artifact Git blob** | `2f0ff3c886c5ac9b1cbba797404e9024c0b83732` |
| **Artifact SHA-256** | `3a6003494f4817907401a9afda5b9d9a1647ade5ff9196f2aee2ba3b1b2ca1ad` |
| Protected integration PR | `#14` |
| **Formal protected integration merge** | `f54d95abb0a8f7988626597a0eef01d0b0ae3c95` |
| Merge parents (in order) | 1. `a67758e6c18c692bc635db416af576356f03b48d` — 2. `d6434e4597a178fde45faf74da0298fdb5755d37` |
| `DEP-03` | **CLOSED** (§9.3) |

The artifact Git blob is identical at `d6434e4…`, at `f54d95a…`, at `3ef0b3a…` and at `3003404…`. This entry does not modify that artifact. Authorization does **not** extend to the four superseded CCA candidates (`ce06bc9fc7cdbaa5299f84369c0b027e70d1d404`, `bc8a3a09593ed29167ca8b141d9e8a33b2e533ec`, `1a612019fff9ae9e7d6d2c2ad3ed091a26bb7136`, `c2218661581db9aae80703e99909af09cb7b9f73` — §9.1, non-authoritative audit evidence only) or to any other bytes bearing the same filename. An implementation that departs from the accepted CCA is **not** within this authorization; a change to CCA content requires a separately accepted authority artifact, not an implementation choice.

**Authored status statements — resolved by events, not edits.** The integrated artifact still carries its authored header (`A1/A2→M7 CONSENT COMPATIBILITY AMENDMENT 01 CANDIDATE ONLY — NOT SELF-ACCEPTED`, `M7 IMPLEMENTATION NOT AUTHORIZED`, `B1 IMPLEMENTATION NOT AUTHORIZED`), its "Nature" statement that it *"authorizes a security capability boundary, not an implementation"*, and its §52 status row `Implementation authorized | NO`. The file is deliberately **not** modified: any byte change would break the exact-byte binding above. They are read as follows:

- **Candidacy** — resolved by the independent acceptance and protected integration recorded in §9.1.
- **`Implementation authorized: NO` (CCA §52) and "not an implementation" (CCA "Nature")** — **true as authored, and true at every state of this register up to and including PR #20** (§12.7). The accepted CCA specification did **not** contain implementation authorization, and MUST NOT be cited as having contained it. That historical authored state is **superseded, for implementation-work authorization only, by this later protected root-authority transition**, once this entry is independently accepted and protected-integrated (§13.1). It is superseded for no other purpose: the CCA remains a specification that itself authorizes nothing, and CCA implementation acceptance remains unperformed (§13.8).
- **`M7 IMPLEMENTATION NOT AUTHORIZED`** — already superseded, Gate 1 only, by §11; unchanged by this entry.
- **`M7 EFFECTIVE SPEC V1 REMAINS BLOCKED`, `B1 IMPLEMENTATION NOT AUTHORIZED`** — remain true (§9.4, §13.10).
- **"edits no accepted specification in place, including `PAGAMENOS_SPEC_AUTHORITY.md`" and CCA §50.2 "the root authority register"** — the CCA does not govern this register. This entry is register authority; it is not CCA text and adds nothing to the CCA.

### 13.3 The transition — grant and exact meaning

```
CCA SPECIFICATION        : ACCEPTED + PROTECTED-INTEGRATED (§9.1; merge f54d95abb0a8f7988626597a0eef01d0b0ae3c95, PR #14)
CCA IMPLEMENTATION WORK  : AUTHORIZED
CCA IMPLEMENTATION       : NOT ACCEPTED
CCA RUNTIME ACCEPTANCE   : NOT PERFORMED
```

`CCA IMPLEMENTATION WORK: AUTHORIZED` has **exactly and only** this meaning, and MUST NOT be quoted without it:

```
CCA IMPLEMENTATION WORK: AUTHORIZED
  = permission to build conforming runtime / enforcement machinery implementing the exact accepted
    A1/A2→M7 Consent Compatibility Amendment 01 (§13.2), within the scope of §13.4 and §13.5,
    and to submit a future implementation candidate for independent verification (§13.8)
  ≠ CCA IMPLEMENTATION: ACCEPTED
  ≠ CCA RUNTIME ACCEPTANCE
  ≠ acceptance of any code, any implementation candidate or any runtime behaviour
```

| Stage | Meaning | CCA status |
| :-- | :-- | :-- |
| **SPECIFICATION ACCEPTANCE** | independent acceptance of the exact artifact bytes | **DONE** (§9.1) |
| **PROTECTED INTEGRATION** (specification) | those bytes merged into the protected branch | **DONE** — merge `f54d95a…`, PR #14 (§9.1) |
| **CCA IMPLEMENTATION WORK AUTHORIZATION** | permission to build conforming CCA machinery and submit it for independent verification | **GRANTED by this entry** (subject to §13.1 "This entry's own status") |
| **CCA IMPLEMENTATION CANDIDATE EXISTS** | CCA runtime/enforcement machinery has been produced | **NO** — none exists in the protected tree; none is recorded |
| **CCA IMPLEMENTATION / RUNTIME ACCEPTANCE** | independent verification of conformance to the accepted CCA (§13.8) | **NOT PERFORMED — OPEN** |
| **DEPLOYMENT / WAVE 0** | any deployment, production use, real participant traffic or study wave | **NOT AUTHORIZED** (§6.1) |

Completion of an earlier stage **never** implies a later one.

**`CCA IMPLEMENTATION WORK: AUTHORIZED` does NOT mean, and MUST NOT be cited as meaning, any of the following:**

| Not implied | Status |
| :-- | :-- |
| that CCA machinery exists | **NO CCA implementation exists** |
| that any CCA implementation is correct or conforming | **NOT ESTABLISHED** |
| that any CCA implementation is accepted | **NOT ACCEPTED** |
| that any CCA runtime behaviour is accepted | **NOT ACCEPTED** |
| that any `AG-01…AG-16` gate is satisfied | **NONE SATISFIED** — open for future implementation acceptance |
| that any §48 adversarial class has been executed | **NOT EXECUTED** |
| that the accepted CCA specification itself contained implementation authorization | **FALSE** (§13.2) |
| that M7 implementation is accepted, or any `IMP-*`, `MA-*` or Gate-2 item satisfied | **NOT ACCEPTED; NONE SATISFIED** (§13.7) |
| that any M7 implementation slice (including M7-S01) has been executed | **NOT EXECUTED** |
| that machine-readable authority, the manifest or the selector has changed | **UNCHANGED / NOT PUBLISHED / NOT ROTATED** (§13.9) |
| that the M7 ingestion integration contract exists, or `DB-03B` or P-16 is satisfied | **NO** (§13.10) |
| that deployment, Wave 0, real participant traffic or provider activation is authorized | **NOT AUTHORIZED** (§13.10) |

### 13.4 Authorized scope — the accepted CCA §50.1 scope, and only it

The authorized scope is the scope the accepted CCA itself enumerates at **CCA §50.1**. The accepted artifact is the authority for what each item requires; this register does not redesign, duplicate or restate its normative content, and any summary below yields to the accepted CCA text. Implementation work MAY build the machinery that scope requires, including:

- the accepted A1-owned consent-evaluation core (CCA §8), packaged for the sealed path **without changing its semantics** — CCA-SEM, CCA-PRED (CCA §8.2: no diff to the accepted predicate implementation is authorized), CCA-FACTS (no new reader), CCA-CLOCK, AGR (CCA §8.3) and RT-17 enforcement inside A1, exactly as accepted;
- sealed operation-specific entry points and sealed leaf modules, with policy fixed by construction and no standalone authorization probe (CCA §6, §7, §9, §10, §11);
- the immutable operation input channel, including assignment-bound input (CCA §12, §12.1);
- `LockedCollectionScope` (CCA §13);
- assignment ownership re-proof and assignment-bound persistence (CCA §13, §14, §21, §26);
- fixed trusted operation executors, non-substitutable and mutually isolated (CCA §14, §19, §20);
- the executor capability contract (CCA §15–§20);
- the exact operation-specific tracked-adapter boundary (CCA §16, §21, §31);
- hidden `TransactionClient` ownership by the private tracked-adapter implementation only (CCA §17);
- the in-flight `activeCount` tracker and zero-in-flight commit gate (CCA §22);
- microtask, timer and background-use rejection behaviour, with lint as defence in depth only (CCA §23–§25);
- atomic operation-specific adapter methods (CCA §26);
- canonical M7 lock ordering within the CCA-governed path (CCA §27);
- the accepted replay / new-collection compatibility machinery, including the lock-free pre-CCA lookup and the internal replay re-check (CCA §28), **without defining or redefining M7 idempotency** (CCA §28.1);
- the application-wide `DatabaseExecutionContext` (CCA §29, §40);
- CCA re-entry rejection (CCA §29.1), the canonical procedure (CCA §30) and the rollback rules (CCA §49);
- the module topology and module capability matrix (CCA §32, §39);
- the accepted transaction/assignment-owner allowlist, including failure on unknown new transaction owners (CCA §33–§39);
- static dependency / capability enforcement, including dependency closure and type-aware defence in depth (CCA §42–§44);
- runtime hardening (CCA §45);
- the CCA adversarial / conformance tests required by CCA §48.

**Illustrative names are not frozen.** The CCA states that names are illustrative unless it fixes them as exact (CCA "Conventions"; §6, §10, §17, §26). This entry freezes no filename, module path, function name, class name, parameter order or identifier beyond what the accepted CCA itself makes exact; where the CCA does not make something exact, this entry does not decide it.

**M7-side content consumed by the CCA path is M7 authority.** Where CCA machinery serves M7 operations, the M7 domain content and M7 physical facts it uses — among them the M7 sealed operations and write functions, the M7 schema and migration, M7 database roles and credentials (including the CCA-private participant credential), M7 transaction owners beyond CCA §34, and M7 idempotency (M7 V1.1 §9, §16.2.3, §18, §19, read with Erratum 01) — are **M7 authority**, buildable only under the §11 Gate 1 grant and conforming to M7 V1.1 + accepted Erratum 01 (§12.6). This entry authorizes none of them as CCA work and decides none of them. Inside the narrow compatibility/security boundary the CCA enumerates, the accepted CCA controls (header reading rule, item (7); §10.3).

**Baseline inventory — re-enumeration obligation preserved.** The CCA §34 inventory (15 production interactive `.$transaction(...)` sites across 8 files) was taken at `a67758e…`, and the CCA requires implementation acceptance to **re-enumerate the exact set at implementation time** (CCA §34). *Author observation, evidence only:* at `3003404…`, `.$transaction(` occurs 15 times in the same 8 production files under `src/db/`, and no path under `src`, `prisma`, `scripts-trusted`, `.github`, `package.json`, `pnpm-lock.yaml` or `eslint.config.mjs` differs from `a67758e…`. This observation does **not** discharge the CCA §34 obligation, which binds a future implementation candidate against its own baseline.

**CI and protected paths.** The static and capability checks the CCA requires will, when built, be **additions**; they MUST NOT weaken the accepted `verify` and `authority-gate` checks (consistently with §11.3). Any change under a protected prefix (`authority/`, `src/corpus/`, `src/engine/`, `.github/workflows/`, `scripts-trusted/` — §2.4) remains subject to existing protected-path governance; this entry grants no exemption from it.

**When work may begin.** Once this transition is independently accepted and protected-integrated, CCA implementation work may begin on a **fresh implementation branch created from the then-current protected tip** of `origin/m3.5b-b-integration`, consistently with §11.3. It MUST NOT be based on this transition's authoring branch, on any superseded CCA candidate (§13.2), on any other non-authoritative artifact (§5), or on the rejected B1 implementation (§5.1).

**What this transition entry itself contains: none of the above.** It changes exactly one file, this register (§13.12).

### 13.5 Accepted existing transaction owners — transparent bookkeeping only

- **Permitted.** Only the transparent `DatabaseExecutionContext` bookkeeping that the accepted CCA already allows (CCA §35, §40) around the accepted existing production transaction entry points CCA §34 enumerates — the accepted A1/A2 transaction and assignment owners (CCA §34.1) and the other accepted-baseline owners CCA §34.2 lists. Its only purpose is to make nested or pre-held transaction state mechanically observable (CCA §40).
- **Such bookkeeping MUST NOT alter:** isolation level; transaction contents; lock ownership; lock ordering; accepted consent semantics; assignment semantics; outputs; or error semantics — except where the accepted CCA explicitly requires detection or rejection of impermissible nesting (CCA §29, §29.1, §30 steps B–C, §40.1), and only to that extent.
- **No migration of A2 onto the CCA.** A2 continues on its accepted transaction/consent path (CCA §41; `AG-15`).
- **No redesign of accepted A1/A2 transaction ownership.** The accepted owners keep their existing capability unchanged, and accepted A1/A2 assignment access is unchanged (CCA §33 class A, §35, §37, §38; `AG-13`).
- **No generic transaction framework.** The private CCA engine is the new owner only of the M7 authorization transaction for sealed consent-conditioned operations (CCA §33 class B); it MUST NOT be broadened into a generic transaction framework. This entry adds no transaction owner (CCA §33 class C, §36); transaction owners added by accepted M7 V1.1 are M7 authority (§13.4).

### 13.6 Explicitly NOT authorized by this transition

This transition authorizes **no** semantic or physical change outside the accepted CCA scope. In particular it does **not** authorize changing, and MUST NOT be used to resolve:

- what consent means; `NO_CONSENT` / `GRANTED` / `WITHDRAWN` semantics; `consentSeq`;
- A1 consent predicate semantics; accepted A1 consent fact-reader semantics; accepted service-clock semantics; AGR semantics;
- A2 behaviour;
- the `StudyConsentEvent` schema; consent-related Prisma schema; a CCA-specific database migration; database roles or privileges *(M7 migrations, roles and privileges remain M7 authority under §11 Gate 1 only — §13.4)*;
- M7 `Outcome` or `SavingEvidence` domain semantics; which M7 writes count as new collection beyond the already accepted operation→policy mapping (CCA §7); M7 retention, custody, correction or deletion semantics; M7 idempotency;
- JBA; the B Semantic Ratification; B1/B2 semantics; C1/C2 semantics; `AnalysisProtocol v1`; P-16;
- the M7 ingestion integration contract, or the `DB-03B` determination;
- the bytes of the accepted CCA artifact, M7 V1.1, Erratum 01, or the A1/A2 specifications.

### 13.7 Relationship to M7 Gate 1 — cumulative but distinct

```
M7 IMPLEMENTATION WORK      : AUTHORIZED — GATE 1 (§11; unchanged)
M7 IMPLEMENTATION / RUNTIME : NOT ACCEPTED — GATE 2 OPEN (§11.4; unchanged)
CCA IMPLEMENTATION WORK     : AUTHORIZED (§13.3)
CCA IMPLEMENTATION          : NOT ACCEPTED (§13.8)
```

- **Distinct authorities.** M7 Gate 1 (§11, as read with §12.6) permits construction of a conforming M7 implementation candidate under M7 V1.1 + accepted Erratum 01. This transition permits construction of the accepted CCA compatibility/security machinery that such an M7 implementation may require. Neither grant is derived from, or narrows, the other.
- **Cumulative.** After this transition is independently accepted and protected-integrated, both work authorizations exist; the question §12.6 left open — whether an M7 implementation step that depends on CCA runtime machinery may proceed before a CCA transition — is thereby answered **at the level of work authorization only**. This entry schedules and starts no execution.
- **Neither grant accepts implementation.** Neither satisfies any `IMP-*`, `MA-*` or Gate-2 condition merely by existing. `IMP-01…IMP-22`: **OPEN**. `MA-1…MA-18`: **OPEN**. LC-1…LC-7: **none occurred** (§12.5).
- **No M7 implementation slice is executed.** M7-S01 is **not executed**; no M7 implementation candidate exists or is recorded.

### 13.8 Future CCA implementation acceptance — preserved, NOT performed

```
CCA IMPLEMENTATION / RUNTIME ACCEPTANCE          : NOT PERFORMED
AG-01…AG-16 (CCA §51)                            : OPEN FOR FUTURE IMPLEMENTATION ACCEPTANCE — none verified
§48 adversarial classes (CCA §48.1–§48.4)        : NOT YET EXECUTED
§42–§45 capability / static / runtime enforcement: NOT BUILT — NOT VERIFIED
§46 closed findings                              : CLOSED AT SPECIFICATION LEVEL — implementation conformance NOT VERIFIED
§34 re-enumeration at implementation time        : NOT PERFORMED
§49 rollback rules                               : implementation conformance NOT VERIFIED
```

- **Obligations preserved.** A future implementation dependent on the CCA MUST be **independently verified** for conformance to the accepted CCA, including the applicable `AG-01…AG-16` acceptance gates (CCA §51), the §48 adversarial test classes (*"No test count substitutes for a required class"*, CCA §48), the §42–§45 capability/static/runtime enforcement, and the §46 closed-findings invariants (no closed finding may be reopened by implementation). This entry does not weaken, delete, pre-satisfy, reorder or reinterpret any of them.
- **Authorization proves no conformance.** A CCA implementation candidate is not accepted by being produced, by being merged, by passing `verify` or `authority-gate`, or by its author's self-report; those checks establish repository/integration integrity only (§6.2, §11.3).
- **No M7 Gate-2 acceptance on unverified CCA machinery.** M7 V1.1 consumes the sealed CCA path as accepted (M7 V1.1 §9.1, §9.4), and Gate 2 requires every applicable acceptance condition to be independently verified (§10.7, §11.4). Accordingly, no M7 implementation candidate relying on CCA machinery may obtain Gate-2 M7 implementation/runtime acceptance (LC-7) on the basis of CCA machinery whose conformance to the accepted CCA has not been independently verified. This restates existing authority; it adds no Gate-2 item and does not reorder LC-1…LC-7. This entry does not decide whether that verification is performed as a separate CCA implementation acceptance or within an M7 Gate-2 review; it records only that it has not been performed.
- **No evidence is recorded.** This entry records no implementation evidence, test result, conformance finding or verdict.

### 13.9 Machine-readable authority — unchanged

The two-authority architecture of §2.4, §10.8, §11.5 and §12.8 is unchanged. `authority/` is absent from this documentation lineage (`git ls-tree -r HEAD authority/` is empty at `3003404…`) and is neither created nor modified by this entry.

```
M7 CONTROL-PLANE MANIFEST: NOT AUTHORED / NOT ACCEPTED / NOT PUBLISHED
MACHINE-READABLE AUTHORITY: UNCHANGED
PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA: NOT ASSERTED
SELECTOR ROTATION: NOT PERFORMED
MA-1…MA-18: OPEN — none satisfied
```

This entry does **not** author, accept or publish an M7 control-plane manifest, publish machine-readable authority, infer, invent, obtain, default or rotate the external selector, and claims no knowledge of its value.

### 13.10 B, C, P-16 and deployment — unchanged; no leakage

CCA implementation-work authorization **does not leak** into B or C authorization. It does not alter the B Semantic Ratification V1.3, JBA V1.9, JBA Amendment 01, B1S/B2S ownership (§7), S-2 Path A / Path B (§9.7), **P-16**, or C1/C2 authority.

```
B1 IMPLEMENTATION: NO
B2 IMPLEMENTATION: NO
C1 IMPLEMENTATION: NO
C2 IMPLEMENTATION: NO
P-16: ACTIVE
AnalysisProtocol v1: UNFROZEN
DEPLOYMENT / WAVE 0: NOT AUTHORIZED
```

- **Path B** (S-2 non-grounding default): status **unchanged** — complete; B1S design may proceed under it (§9.7).
- **Path A** (S-2 grounding): still requires the **accepted M7 ingestion integration contract** under existing B authority (§9.7, §10.9, §11.6, §12.9). CCA implementation authorization is **not** that contract, creates none, does **not** satisfy `DB-03B`, and does **not** satisfy or resolve **P-16**.
- **Development authorization only.** This transition does **not** authorize production deployment, Wave 0, real participant traffic, provider activation, selector rotation, scientific acceptance, or M7 runtime acceptance.

### 13.11 Synchronization of earlier register text — provenance preserved

No earlier entry is silently rewritten. The following edits accompany this entry; each preserves the prior wording or marks it historical, and none changes any status other than CCA implementation-work authorization:

| Location | Treatment |
| :-- | :-- |
| Header — "Latest authority progression" | §13 appended; prior text unchanged |
| Header — "Protected authority surface" | PR #20 merge appended; latest-register-integration sentence updated, with its PR #20 wording preserved in an annotation; "the §13 entry is not part of this history" replaces the corresponding §12 sentence, which is preserved in that annotation |
| Header — controlling M7 specification line | `CCA IMPLEMENTATION AUTHORIZATION: NOT YET GRANTED` replaced by the current CCA status, with the PR #20 wording preserved in an annotation |
| Header — reading rule | one sentence added: implementation-work authorizations are lifecycle transitions, not precedence items; no precedence item changed |
| §2 introduction | one note added: the CCA has no accepted implementation and no §2 row |
| §6 | CCA bullet and the CCA item of "Not authorized" updated, with PR #20 wording preserved in annotations |
| §9 | reading note added (specification registration current; implementation work authorized by §13) |
| §9.8, §10.10, §11.7 headings; §9.8 closing note; §11 reading note | navigation pointer "current matrix §12.11" / "the current matrix is §12.11" → "§13.13" only |
| §12 | reading note added (PR #20 integration; §12.7 historical; §12.6 last bullet read with §13.7) |
| §12.7 | heading annotated and code block tagged `[HISTORICAL — as recorded at PR #20 …]`; `CCA IMPLEMENTATION AUTHORIZATION: NOT YET GRANTED` and every bullet preserved verbatim |
| §12.11 | heading annotated and matrix tagged `[HISTORICAL — as recorded at PR #20 …]`; every row preserved verbatim |

### 13.12 What this entry changes

This entry changes exactly one file, this register. It changes no specification artifact — in particular not `PAGAMENOS_A1_A2_M7_CONSENT_COMPATIBILITY_AMENDMENT_01.md`, `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1.md`, `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_01.md`, the A1 or A2 specifications, JBA V1.9 or its Amendment 01, or the B Semantic Ratification V1.3 — and no runtime source, Prisma schema, migration, test, `.github/` workflow, `scripts-trusted/` file, `authority/` artifact, repository configuration or external repository variable.

### 13.13 Current authorization matrix *(historical matrix at PR #21; current matrix §17.12)*

```
[HISTORICAL — as recorded at PR #21; M7 SPECIFICATION READING, conformance-target and M7-S01 rows superseded by §14]
M7 EFFECTIVE SPEC V1                    : BLOCKED / NON-AUTHORITATIVE
M7 V1.1 BASE SPEC                       : ACCEPTED — SPECIFICATION ACCEPTANCE DONE, PROTECTED INTEGRATION DONE
                                          (merge f99a7e3080fdb99bd3917820d889d09694bed4af, PR #16); bytes unedited
M7 ERRATUM 01                           : ACCEPTED + PROTECTED-INTEGRATED — clause-scoped
                                          (candidate 16e232330c86c92285804eb55ecb18d7f3cdf309;
                                           merge 3ef0b3ad0fb02cba84a60d0529fe054427b9f68c, PR #19)
M7 SPECIFICATION READING                : M7 V1.1 + ACCEPTED ERRATUM 01 (for the clauses Erratum 01 amends)
ER-01…ER-05                             : INCORPORATED ACCORDING TO ERRATUM 01
D-13                                    : DOWNSTREAM IMPLEMENTATION / CONTROL-PLANE COMPATIBILITY MATTER
D-06                                    : CLASSIFICATION ONLY — SERVER_MEDIATED CONFORMING; PRESIGNED_PUT UNAVAILABLE
M7 IMPLEMENTATION AUTHORIZED            : YES — GATE 1 ONLY (see the next two rows; never quote this row alone)
M7 IMPLEMENTATION WORK                  : AUTHORIZED — GATE 1 (§11; not revoked by Erratum 01); candidates MUST
                                          conform to M7 V1.1 + accepted Erratum 01 (§12.6)
M7 IMPLEMENTATION / RUNTIME             : NOT ACCEPTED — GATE 2 OPEN; no implementation exists (§11.4, §12.6)
M7-S01                                  : NOT EXECUTED — no M7 implementation slice executed (§13.7)
IMP-01…IMP-22                           : OPEN
MA-1…MA-18                              : OPEN
§24.3 CI ADDITIONS                      : OPEN — none exists
LC-1…LC-7                               : NONE OCCURRED (§12.5)
M7 CONTROL-PLANE MANIFEST               : NOT AUTHORED / NOT ACCEPTED / NOT PUBLISHED
MACHINE-READABLE AUTHORITY              : UNCHANGED
PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA   : NOT ASSERTED
SELECTOR ROTATION                       : NOT PERFORMED
REAL-PROVIDER VERIFICATION              : NOT PERFORMED
REAL-DEPLOYMENT VERIFICATION            : NOT PERFORMED
RESIDUALS M7-R-01…M7-R-17               : STATED BOUNDS — NOT ELIMINATED
DEPLOYMENT / WAVE 0                     : NOT AUTHORIZED
CCA SPECIFICATION (AMENDMENT 01)        : ACCEPTED + PROTECTED-INTEGRATED (§9.1; candidate
                                          d6434e4597a178fde45faf74da0298fdb5755d37; merge
                                          f54d95abb0a8f7988626597a0eef01d0b0ae3c95, PR #14); bytes unedited
DEP-03                                  : CLOSED (§9.3)
CCA IMPLEMENTATION AUTHORIZATION        : GRANTED — IMPLEMENTATION WORK ONLY (§13; see the next two rows; never
                                          quote this row alone)
CCA IMPLEMENTATION WORK                 : AUTHORIZED — permission to build conforming machinery implementing the
                                          exact accepted CCA, within CCA §50.1 scope (§13.3–§13.5)
CCA IMPLEMENTATION                      : NOT ACCEPTED — no CCA implementation exists (§13.3, §13.8)
CCA RUNTIME ACCEPTANCE                  : NOT PERFORMED
CCA AG-01…AG-16                         : OPEN FOR FUTURE IMPLEMENTATION ACCEPTANCE
CCA §48 ADVERSARIAL IMPLEMENTATION      : NOT YET EXECUTED
CCA §42–§45 ENFORCEMENT                 : NOT BUILT — NOT VERIFIED
CCA §46 FINDINGS                        : CLOSED AT SPECIFICATION LEVEL — implementation conformance NOT VERIFIED
B1S DESIGN                              : YES — MAY use the accepted S-2 non-grounding default (§9.7); Path A only
                                          with an accepted M7 ingestion integration contract (§10.9, §11.6, §12.9, §13.10)
B2S DESIGN                              : per existing JBA / P-16 sequencing (§6, §7) — unchanged
B1 IMPLEMENTATION                       : NO
B2 IMPLEMENTATION                       : NO
C1 IMPLEMENTATION                       : NO
C2 IMPLEMENTATION                       : NO
AnalysisProtocol v1                     : UNFROZEN
P-16                                    : ACTIVE
```

This matrix records status established by §6, §7, §9, §10, §11, §12 and §13.1–§13.12; it authorizes nothing beyond them. Relative to §12.11, the only status changed is CCA implementation authorization, and only in the implementation-work sense (`NO — NOT YET GRANTED` → `GRANTED — IMPLEMENTATION WORK ONLY`); the `CCA IMPLEMENTATION WORK` and `CCA IMPLEMENTATION` rows express that change and its limit, and the other rows added — CCA runtime acceptance, AG-01…AG-16, §48, §42–§45, §46, `DEP-03` and M7-S01 — make explicit states already true. It changes no M7 implementation, Gate 2, machine-readable authority, B, C or P-16 status.

---

## 14. M7 V1.1 SQL Executability Erratum 02 — ACCEPTED, PROTECTED-INTEGRATED (occurrence-scoped; specification only) — current M7 conformance state *(current at PR #25; the current M7 conformance state is §15)*

This section records a lifecycle transition that has **already occurred**: the independent acceptance and the protected integration of Erratum 02 to the accepted M7 V1.1 specification. It synchronizes this register with that fact and with its consequence for the M7 implementation-line slices. It does **not** restate, amend or re-open Erratum 02, Erratum 01 or M7 V1.1; it does **not** reproduce Erratum 02's "Before"/"After" texts, proofs or pinned values; it does **not** implement M7, regenerate M7-S01, resume M7-S03, modify implementation staging, author a manifest, publish machine-readable authority, create or modify `authority/`, or assert or rotate `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA`. Apart from the reading notes, annotations and pointer updates enumerated in §14.12, nothing in this section modifies §1, §2, §3, §3.1, §3.2, §9.1–§9.3, the §10.1 identity, §10.6 categories (b)–(e), the §10.7 Gate 2 list, §10.8, the Gate 1 grant of §11, §11.4, §12.1–§12.5, §12.8, §12.9, the CCA grant of §13.3–§13.10, the B Semantic Ratification V1.3, JBA V1.9 or its Amendment 01, M7 V1.1, Erratum 01, the CCA, the A1 or A2 specifications, B1S/B2S ownership, S-2 Path A / Path B, **P-16**, or C1/C2 authority.

> **Reading note — later lifecycle events (PR #25 integration; PR #26 / PR #27 implementation-staging events; Erratum 03; §15).** §14 was written as an author candidate against protected tip `b8df775…`. It has since been **protected-integrated by merge `1be2f40216ac7093962739d4312d77219ae14d4d` (PR #25; §15.1)**; the statements of §14.1 "This entry's own status" that it records no PR or merge identity are therefore historical and are preserved rather than rewritten. Erratum 02 and its registration in §14.2–§14.4 are **unchanged** and remain current for the nine occurrences `E02-01…E02-09`. The §14.7 prerequisites 1–5 have since been discharged — PR #25, the Erratum 02 staging synchronization (PR #26) and the independently re-accepted Erratum 02 regeneration of M7-S01 (PR #27; §15.4) — but M7-S03 was not resumed under §14.7. The §14.5 conformance target, the §14.6 `M7-S01 CURRENT-CONFORMANCE ARTIFACT SET: NONE` and `M7-S01 REGENERATION: NOT PERFORMED` statements, the §14.7 blocking reasons and prerequisite list, the §14.10 staging tip and the §14.14 matrix were true when written and are preserved as historical; the current statements are §15.2, §15.4–§15.6 and §15.11. *(Later events — §16: the current implementation-line slice, M7-S01, M7-S02, M7-S03 and matrix statements are now §16.4–§16.7 and §16.12; the §15.2 conformance target is unchanged.)* *(Later events — §17: those statements are now §17.4–§17.7 and §17.12; the §15.2 conformance target remains unchanged.)* The §14.8, §14.9 and §14.11 lifecycle, machine-readable-authority and B/C statements remain true and are reaffirmed by §15.7–§15.8.

### 14.1 Starting point, provenance and this entry's own status

**This entry's own status.** This entry is an **author candidate** for a root authority synchronization. It records **no** acceptance verdict, commit, PR or merge identity of its own, and MUST NOT be read as independently accepted or protected-integrated by virtue of its text. As with every prior entry in this register, it is authority only as recorded in this register at the protected integration surface following independent acceptance of the exact register bytes.

**Starting point.** Authored against the protected tip `origin/m3.5b-b-integration` = `b8df77538671b957b03294fee0fae40929d29bd3` (tree `215a7d36c2ac5af631f559b59ab4c23699533d44`; parents, in order, 1. `f1fd894b60b70e07143d474992ff8b3c5dd88fe1` — 2. `f9d5591e16906a176f9a5f019f42312f502f9da4`).

**CCA Implementation Work Authorization — now protected-integrated** (this is the entry that wrote §13). Recorded from Git history as provenance only; no identity below is rewritten.

| Item | Value |
| :-- | :-- |
| Entry | A1/A2→M7 Consent Compatibility Amendment 01 Implementation Work Authorization — `docs(authority): authorize CCA Amendment 01 implementation work` (§13) |
| Transition candidate commit | `998daa506be6fbb3095c6ee7ccff6d7803d6c818` |
| Candidate sole parent (authoring baseline) | `30034041df3280286fa9c85ac937894ef767e890` (PR #20 merge) |
| Candidate tree | `eb11ad05c813e483afc4129777afbd24c751050c` |
| `PAGAMENOS_SPEC_AUTHORITY.md` Git blob at the candidate and at the merge | `6e3cb3865614241ce2ccfe6b0ba520b3f689bd4c` |
| PR | `#21` |
| **Formal protected integration merge** | `f1fd894b60b70e07143d474992ff8b3c5dd88fe1` |
| Merge parents (in order) | 1. `30034041df3280286fa9c85ac937894ef767e890` — 2. `998daa506be6fbb3095c6ee7ccff6d7803d6c818` |
| **Merge tree** | `eb11ad05c813e483afc4129777afbd24c751050c` (identical to the candidate tree) |
| Paths changed by the merge relative to `3003404…` | exactly one: `PAGAMENOS_SPEC_AUTHORITY.md` |
| Protected integration surface | `origin/m3.5b-b-integration` (see §8.1) |

Earlier protected identities are **not rewritten** by this entry (§12.1, §13.1).

### 14.2 Exact identities — Erratum 02

| Item | Value |
| :-- | :-- |
| Artifact | `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_02.md` |
| **Status** | **ACCEPTED + PROTECTED-INTEGRATED** (SQL executability erratum; occurrence-scoped; specification only) |
| Independent acceptance | **PERFORMED** — the verdict binds the **exact artifact bytes** identified by the SHA-256 and Git blob below, and no other bytes |
| **Accepted erratum SHA-256** | `b7b3440ad04181356770f243a6e2870e004aba604d2a62afdefd5330c85c170f` |
| **Accepted erratum Git blob** | `a0e6fa6720f23ac08485ab7cb696ab9ba4b7e83f` |
| Size | 44,295 bytes; 515 LF-terminated lines |
| Accepted author candidate commit | `f9d5591e16906a176f9a5f019f42312f502f9da4` |
| Candidate sole parent (authoring baseline) | `f1fd894b60b70e07143d474992ff8b3c5dd88fe1` (PR #21 merge) |
| Candidate tree | `215a7d36c2ac5af631f559b59ab4c23699533d44` |
| Integration PR | `#24` — *docs(spec): integrate M7 V1.1 SQL executability erratum 02* |
| **Formal protected integration merge** | `b8df77538671b957b03294fee0fae40929d29bd3` |
| Merge parents (in order) | 1. `f1fd894b60b70e07143d474992ff8b3c5dd88fe1` — 2. `f9d5591e16906a176f9a5f019f42312f502f9da4` |
| **Merge tree** | `215a7d36c2ac5af631f559b59ab4c23699533d44` (identical to the accepted candidate tree) |
| Paths changed by the merge relative to `f1fd894…` | exactly one, added: `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_02.md` |
| GitHub signature | signed GitHub merge commit |
| Post-merge required checks | `verify` — SUCCESS; `authority-gate` — SUCCESS |
| Corrections | **9 occurrences** (`E02-01…E02-09`) across **5 / 26** normative §19 fragments |
| Affected fragments | **F09, F11, F17, F23, F26** |
| Unaffected fragments | **21 / 26** — F01–F08, F10, F12–F16, F18–F22, F24, F25 |
| Protected integration surface | `origin/m3.5b-b-integration` (see §8.1) |

**Accepted artifacts — unchanged by Erratum 02 and by this entry.** Identical at `f1fd894…` and at `b8df775…`:

| Artifact | Git blob | SHA-256 |
| :-- | :-- | :-- |
| `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1.md` (§10.1) | `06e103b0d5e8cfcbb96ab21134d5605b0aae9b26` | `457f51778fb5d5890b3e3478376e413072f15aef7da88125b5e78963f49394bd` |
| `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_01.md` (§12.1) | `15ee22090d3e37b6a63dd25914f8abb0f4fa9d4b` | `f381cb015adadc7a22463060da7ff55e8711b8ab13879c60f93cabf53eb863e8` |
| `PAGAMENOS_A1_A2_M7_CONSENT_COMPATIBILITY_AMENDMENT_01.md` (§9.1, §13.2) | `2f0ff3c886c5ac9b1cbba797404e9024c0b83732` | `3a6003494f4817907401a9afda5b9d9a1647ade5ff9196f2aee2ba3b1b2ca1ad` |

**What the post-merge checks establish.** As for §6.2, §10.1, §12.1 and §13.1: `verify` and `authority-gate` on `b8df775…` establish **integration integrity of this documentation merge only**. They are not any §24.3 CI addition, manifest gate, real-PostgreSQL, real-provider or real-deployment verification, and do not install or execute the corrected SQL; they are not claimed to be.

### 14.3 Relation to M7 V1.1 and Erratum 01 — occurrence-scoped precedence

```
M7 V1.1 BASE SPECIFICATION        : ACCEPTED — REMAINS THE ACCEPTED BASE (§10.1); BYTES NOT EDITED
ERRATUM 01                        : ACCEPTED + PROTECTED-INTEGRATED — CLAUSE-SCOPED; UNAFFECTED BY ERRATUM 02; BYTES NOT EDITED
ERRATUM 02                        : ACCEPTED + PROTECTED-INTEGRATED — OCCURRENCE-SCOPED (E02-01…E02-09 ONLY)
READING                           : M7 V1.1 READ WITH ERRATUM 01 FOR THE CLAUSES IT AMENDS
                                    AND WITH ERRATUM 02 FOR THE NINE OCCURRENCES IT ENUMERATES
ERRATA FLATTENED INTO V1.1 BYTES  : NO
```

- **The accepted V1.1 bytes are not edited and are not superseded wholesale.** Neither erratum rewrites them; both are read **beside** them (Erratum 02 §4 rule 1; Erratum 01 §1.2).
- **Erratum 01 remains accepted and applicable.** No Erratum 02 occurrence lies in, or is cited by, a clause Erratum 01 amends; ER-01…ER-05 and Erratum 01's MD-*/MG-* rules apply unchanged, including to migration bytes that contain the corrected occurrences (Erratum 02 §4 rule 2).
- **Occurrence-scoped control.** Erratum 02 supersedes **exactly** the nine enumerated "Before" substrings on the named V1.1 lines, and **nothing else**: every other byte of each such line, and every other line, statement, function, identifier, count, proof, invariant, lock profile and test, is unchanged (Erratum 02 §4 rules 3–5).
- **Everything else is V1.1 + Erratum 01 exactly as accepted.** Outside the nine occurrences, the accepted V1.1 bytes read with Erratum 01 continue to control; an apparent conflict there is an erratum defect to be reported, not resolved by interpretation (Erratum 02 §4 rule 6).
- **Precedence** is registered under the header reading rule, item (8b): Erratum 02 inherits the scope and subordination of M7 V1.1 (§10.3) as read with Erratum 01, and gains none beyond it.
- **Authored status statements resolved by events, not edits.** The integrated erratum still carries its authored header (`AUTHOR CANDIDATE — NOT YET AUTHORITATIVE`, `NOT SELF-ACCEPTED — AWAITING INDEPENDENT AUDIT`) and its §13 author-side status block (`INDEPENDENT ACCEPTANCE : NOT PERFORMED`, `PROTECTED INTEGRATION : NOT PERFORMED`, `ROOT AUTHORITY SYNC : NOT PERFORMED`, `M7 CONFORMANCE TARGET (UNTIL ACCEPTED) : M7 V1.1 + ACCEPTED ERRATUM 01`). As with M7 V1.1 (§10.4) and Erratum 01 (§12.2), the first two are resolved by the independent acceptance and protected integration recorded in §14.2; the file is deliberately **not** modified, because any byte change would break the exact-byte binding. `ROOT AUTHORITY SYNC` and the "until accepted" conformance target are addressed by this entry, and are resolved only when this entry is itself independently accepted and protected-integrated (§14.1). Its statements about **other** things — no `IMP-*` or `MA-*` satisfied, manifest not authored/accepted/published, machine-readable authority unchanged, selector not asserted or rotated, Gate 2 open, LC-1 not occurred, M7-S01 regeneration not performed, M7-S03 blocked, CCA implementation not accepted, B1/B2 and C1/C2 not authorized, P-16 active — remain **true** and are reaffirmed by §14.6–§14.11.

### 14.4 Corrections incorporated — E02-01…E02-09

`E02-01…E02-09` are incorporated **according to Erratum 02**, which is the sole authority for their content (Erratum 02 §5.3, §6, §7). This register records only their existence, location and class; it does **not** restate their "Before"/"After" texts, line SHA-256 values, proofs or the informative pinned fragment values of Erratum 02 §9, and any paraphrase below yields to the accepted erratum text.

| ID | Fragment / V1.1 clause | V1.1 line | Enclosing object | Defect sub-class |
| :-- | :-- | :-- | :-- | :-- |
| `E02-01` | F09 / §19.10 | 4494 | `m7.t_upload_intent_coherence()` | `E02-SX-P` |
| `E02-02` | F09 / §19.10 | 4545 | `m7.t_generation_coherence()` | `E02-SX-P` |
| `E02-03` | F09 / §19.10 | 4853 | `m7.t_capability_mint_coherence()` | `E02-SX-R` |
| `E02-04` | F11 / §19.11.1 | 5442 | `m7.i_backend_digest(…)` | `E02-SX-P` |
| `E02-05` | F17 / §19.11.7 | 6912 | `m7.x_mint_generation_capability_v1(…)` | `E02-SX-R` |
| `E02-06` | F23 / §19.12.6 | 8219 | `m7.w_classify_object_key_v1(…)` | `E02-SX-P` |
| `E02-07` | F23 / §19.12.6 | 8221 | `m7.w_classify_object_key_v1(…)` | `E02-SX-P` |
| `E02-08` | F23 / §19.12.6 | 8222 | `m7.w_classify_object_key_v1(…)` | `E02-SX-P` |
| `E02-09` | F26 / §19.13.4 | 8826 | `DO $grants$` block | `E02-SX-P` |

**Registered effect.** Invocation syntax only: each correction yields the identical function or expression node over byte-identical operands, with the same result type, collation, volatility and `NULL` behaviour (Erratum 02 §7, Theorem `E02-T1`). Erratum 02 §8 (preservation matrix) remains binding as written there, including its statements that no object is added, removed or renamed, that locks, transactions, roles, digests, retention, CCA semantics and lifecycle are unchanged, and that `IMP-01…IMP-22`, `MA-1…MA-18`, T-IDs and `M7-R-01…M7-R-17` are unchanged and none satisfied. This entry adds no count of its own.

### 14.5 Effective M7 conformance target

```
M7 CONFORMANCE TARGET: M7 V1.1 + ACCEPTED ERRATUM 01 + ACCEPTED ERRATUM 02
```

- **Target.** Any M7 implementation candidate, and every M7 implementation-line artifact relied upon as conforming (including normative extraction artifacts), MUST conform to **M7 V1.1 + accepted Erratum 01 + accepted Erratum 02** — the accepted V1.1 bytes of §10.1, read together with Erratum 01 for the clauses it amends (§12.2) and with Erratum 02 for the nine occurrences it enumerates (§14.3). An artifact that carries the pre-Erratum-02 bytes of any of the nine occurrences, or applies a correction partially or at a different location, is **not** conforming.
- **Supersedes the prior target.** The prior target **M7 V1.1 + accepted Erratum 01** (§12.6; header, §6, §11 reading note, §13.4, §13.7, §13.13 as recorded at PR #21) was correct when recorded and is preserved as historical; it is superseded **for conformance purposes only**.
- **Currency.** Consistently with §12.6 and §11.3, an implementation candidate or manifest whose documentation-authority baseline does not incorporate accepted Erratum 02 does not meet the current conformance target. This entry restates that consequence; it adds no gate.
- **Gate 1 unchanged.** Erratum 02 does **not** revoke, narrow, re-grant or re-condition the §11 Gate 1 authorization; `M7 GATE 1: AUTHORIZED`.

### 14.6 M7 implementation-line slices — S01 superseded for current conformance; S02 unchanged

The M7 implementation-line slices below were produced under the §11 Gate 1 grant after PR #21 and integrated into the implementation staging branch `origin/m7-v1.1-implementation`. That branch is **not** a protected authority surface; the identities below are recorded **from Git history as provenance only**, the independent acceptance verdicts are held outside this register and are not restated here, and nothing in this subsection makes any slice artifact register authority, adds a §2 row, or constitutes LC-1 or Gate-2 acceptance.

| Item | M7-S01 — normative DDL extraction | M7-S02 — real PostgreSQL harness |
| :-- | :-- | :-- |
| Slice candidate commit | `701a3d6ea29c0b605dc8715dfdd2da55bd5dbac3` | `d5c9858b2cdad102b3d739718e403e8d9542854d` |
| Candidate tree | `b2c3a995641fee0204421fb80ac06664ae9d1efd` | `54e8c99e4aacca8ff74ef9afedc544926153856c` |
| Independent acceptance | **PERFORMED** — under the then-current conformance target **M7 V1.1 + accepted Erratum 01** | **PERFORMED** |
| Staging integration PR | `#22` | `#23` |
| Staging integration merge | `742bfffa0aaee4e92743ca5d9d6432affbe22e62` (parents 1. `f1fd894…` — 2. `701a3d6…`) | `14d846abb749c4bb27a9868eb0913acd343cb64e` (parents 1. `742bfff…` — 2. `d5c9858…`) |
| Recorded conformance target | `M7 V1.1 + accepted Erratum 01` (`prisma/m7/normative/EXTRACTION_INDEX.json`, SHA-256 `79913966699861771d1f193fe504283d547e9c7a6567ae9b391618cd2c2820e0`) | — (infrastructure) |

**M7-S01.**

```
M7-S01 PRE-ERRATUM-02 EXTRACTION: HISTORICALLY ACCEPTED, NOW SUPERSEDED FOR CURRENT CONFORMANCE
M7-S01 CURRENT-CONFORMANCE ARTIFACT SET: NONE — REGENERATION + INDEPENDENT RE-ACCEPTANCE REQUIRED
M7-S01 REGENERATION: NOT PERFORMED
```

- **History is not rewritten.** The original M7-S01 candidate was independently accepted under the conformance target then current (**M7 V1.1 + accepted Erratum 01**) and was integrated into implementation staging (PR #22). That acceptance was valid when performed; M7-S01 is **not** rejected, and its process is **not** recorded as invalid.
- **Subsequent authority change.** Erratum 02 subsequently changed the effective normative SQL at nine occurrences in fragments F09, F11, F17, F23 and F26. The integrated M7-S01 artifacts faithfully extract the accepted V1.1 bytes, and therefore do **not** contain the nine accepted substitutions.
- **Consequence.** The integrated M7-S01 artifact set is **STALE** relative to the current conformance target (§14.5) and is **no longer the current conformance artifact set**. It MUST NOT be relied upon as conforming for any later slice, installation, manifest derivation or acceptance.
- **Required.** M7-S01 MUST be **regenerated** from **M7 V1.1 + accepted Erratum 01 + accepted Erratum 02** and **independently re-accepted**, as Erratum 02 §9 requires (regeneration, not hand-editing; the accepted Erratum 02 identity recorded beside the unchanged V1.1 and Erratum 01 identities; exactly the affected pins updated; stale bytes failing the deterministic checks; the 21 unaffected fragments byte-identical; independent re-acceptance before reliance). Erratum 02 §9 is the authority for those requirements; this register does not restate or weaken them.

**M7-S02.**

```
M7-S02: INDEPENDENTLY ACCEPTED / INTEGRATED IMPLEMENTATION INFRASTRUCTURE — UNCHANGED
M7-S02 REGENERATION: NOT REQUIRED
```

- Erratum 02 changes only the invocation syntax of nine normative SQL occurrences (§14.4). It does **not** invalidate M7-S02's PostgreSQL harness, roles, migrator or multi-session infrastructure, and no authority artifact makes M7-S02 depend on the corrected bytes. M7-S02 remains usable as infrastructure for the regenerated M7-S01 and for M7-S03.
- M7-S02 acceptance remains **infrastructure acceptance only**: it is not LC-1, satisfies no `IMP-*`, `MA-*` or Gate-2 item, and is not real-PostgreSQL verification of an M7 implementation candidate.

### 14.7 M7-S03 — BLOCKED; prerequisites before resume

```
M7-S03: BLOCKED
M7-S03 RESUME: NOT AUTHORIZED BY THIS ENTRY
```

**Reason.** The current M7-S01 normative artifacts were generated before Erratum 02 and do not contain the nine accepted substitutions (§14.6). The prior M7-S03 attempt stopped at the first such occurrence (`E02-01`), produced no candidate commit and retained no partial M7 installation (Erratum 02 §1.4, §10).

**M7-S03 MAY resume only after all of the following, in this order:**

1. this Erratum 02 root authority synchronization (§14) is independently accepted and **protected-integrated**;
2. implementation staging (`origin/m7-v1.1-implementation`) is **synchronized** with the resulting authority baseline, by its own separate transition;
3. the M7-S01 artifacts are **regenerated** from **M7 V1.1 + accepted Erratum 01 + accepted Erratum 02** (§14.6; Erratum 02 §9);
4. the regenerated M7-S01 is **independently re-accepted**;
5. the regenerated M7-S01 is **integrated into implementation staging**.

These prerequisites are cumulative with, and no weaker than, Erratum 02 §10. Satisfying them makes resumption **permissible**; it does not schedule or start M7-S03. A resumed M7-S03 MUST install the corrected text, MUST NOT patch normative SQL locally, and MUST stop and report any further defect (Erratum 02 §10 item 6).

### 14.8 Lifecycle — unchanged

**None of the following changes status, and this entry performs none of the events it names.**

```
M7 GATE 1                                    : AUTHORIZED — implementation work only (§11; unchanged, not revoked)
M7 GATE 2                                    : OPEN / NOT SATISFIED (§11.4, §12.6; unchanged)
LC-1  IMPLEMENTATION CANDIDATE COMPLETION    : NOT OCCURRED — the M7-S01 / M7-S02 slices are not a completed candidate
LC-2…LC-7                                    : NOT OCCURRED (§12.5)
IMP-01…IMP-22                                : OPEN — none satisfied by Erratum 02 or by this entry
MA-1…MA-18                                   : OPEN — none satisfied by Erratum 02 or by this entry
§24.3 CI ADDITIONS                           : OPEN
REAL-PROVIDER / REAL-DEPLOYMENT VERIFICATION : NOT PERFORMED
CCA IMPLEMENTATION WORK                      : AUTHORIZED (§13.3; unchanged)
CCA IMPLEMENTATION                           : NOT ACCEPTED (§13.8; unchanged)
```

No implementation or runtime acceptance has occurred. Erratum 02, the acceptance of M7-S01 or M7-S02, and this entry each satisfy **no** `IMP-*`, `MA-*` or Gate-2 requirement.

### 14.9 Machine-readable authority — unchanged

The two-authority architecture of §2.4, §10.8, §11.5, §12.8 and §13.9 is unchanged. `authority/` is absent from this documentation lineage (`git ls-tree -r HEAD authority/` is empty at `b8df775…`) and is neither created nor modified by Erratum 02 or by this entry.

```
FINAL CONTROL-PLANE MANIFEST: NOT AUTHORED / NOT ACCEPTED / NOT PUBLISHED
MACHINE-READABLE AUTHORITY: NOT PUBLISHED — UNCHANGED
PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA: NOT ASSERTED
SELECTOR ROTATION: NOT PERFORMED
```

This entry does **not** infer, invent, obtain, default or rotate the external selector, creates no machine-readable baseline, and claims no knowledge of the selector's value. Any future manifest, `prosrc` digest or `migrationSha256` MUST be derived from migration bytes conforming to the corrected text (Erratum 02 §8), under Erratum 01 MD-*/MG-*; none has been produced.

### 14.10 Implementation staging — not modified by this entry

This entry does **not** modify `origin/m7-v1.1-implementation`, does not merge protected authority into it, and does not regenerate or edit `prisma/m7/normative/`, `src/m7/`, `scripts/m7/`, `package.json` or `pnpm-lock.yaml`. At the authoring baseline, implementation staging (tip `14d846abb749c4bb27a9868eb0913acd343cb64e`) does not contain `b8df775…`. Synchronizing the updated authority lineage into implementation staging is a **separate later transition** (§14.7 item 2).

### 14.11 B, C, P-16, CCA and deployment — unchanged; no leakage

Erratum 02 and this entry do **not** alter the B Semantic Ratification V1.3, JBA V1.9, JBA Amendment 01, B1S/B2S ownership (§7), S-2 Path A / Path B (§9.7), the CCA or its §13 implementation-work grant, **P-16**, or C1/C2 authority.

```
B1 / B2 IMPLEMENTATION: NO
C1 / C2: NO
P-16: ACTIVE
AnalysisProtocol v1: UNFROZEN
DEPLOYMENT / WAVE 0: NOT AUTHORIZED
```

- **Path B** (S-2 non-grounding default): status **unchanged** (§9.7).
- **Path A** (S-2 grounding): still requires the **accepted M7 ingestion integration contract** under existing B authority (§9.7, §10.9, §11.6, §12.9, §13.10). Erratum 02 is not that contract and does not satisfy `DB-03B` or P-16.

### 14.12 Synchronization of earlier register text — provenance preserved

No earlier entry is silently rewritten. The following edits accompany this entry; each preserves the prior wording or marks it historical, and none changes any status other than the M7 conformance target and the recorded state of the M7 implementation-line slices:

| Location | Treatment |
| :-- | :-- |
| Header — "Latest authority progression" | PR #21 integration and §14 appended; prior text unchanged |
| Header — "Protected authority surface" | PR #21 and PR #24 merges appended; latest-specification and latest-register-integration sentence updated, with its PR #21 wording preserved in an annotation; "the §14 entry is not part of this history" replaces the corresponding §13 sentence, which is preserved in that annotation |
| Header — controlling M7 specification line | Erratum 02 reading added; conformance target, M7-S01 and M7-S03 status updated, with the PR #21 wording preserved in an annotation |
| Header — reading rule | item (8b) added for Erratum 02; one parenthetical added to (8a) naming the nine occurrences; range references "(7)–(8a)" / "(1)–(8a)" → "(7)–(8b)" / "(1)–(8b)"; one sentence added: implementation-line slice artifacts are not authority or precedence items |
| §6 | M7 V1.1 bullet refined ("no complete M7 implementation candidate"; slices recorded in §14.6), with PR #21 wording preserved; Erratum 01 bullet's conformance-target clause moved to a new Erratum 02 bullet, with PR #21 wording preserved; "Not authorized" list adds M7-S03 resumption and reliance on pre-Erratum-02 M7-S01 artifacts |
| §9.8, §10.10, §11.7, §12.11 headings; §9.8 closing note; §11 and §12 reading notes | navigation pointer "current matrix §13.13" / "the current matrix is §13.13" → "§14.14" only |
| §9.7 Path A bullet | one annotation added: the M7-S01/M7-S02 slices implement none of the M7 ingestion facts; no completed M7 implementation candidate exists; prior sentence unchanged |
| §10 | reading note added (Erratum 02; §10.1 identity unchanged) |
| §11 reading note | one annotation added: conformance target now includes Erratum 02; §11.2 "NO implementation exists" and the §11.7 row read with §14.6 |
| §12 | second reading note added (Erratum 02; §12.6 conformance-target bullet historical; LC-1 / "no implementation exists" read with §14.6) |
| §13 | reading note added (PR #21 integration; §13.1 own-status historical; M7-S01 "not executed" statements historical; conformance target read with §14.5) |
| §13.13 | heading annotated and matrix tagged `[HISTORICAL — as recorded at PR #21 …]`; every row preserved verbatim |

### 14.13 What this entry changes

This entry changes exactly one file, this register. It changes no specification artifact — in particular not `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1.md`, `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_01.md`, `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_02.md`, `PAGAMENOS_A1_A2_M7_CONSENT_COMPATIBILITY_AMENDMENT_01.md`, the A1 or A2 specifications, JBA V1.9 or its Amendment 01, or the B Semantic Ratification V1.3 — and no runtime source, Prisma schema, migration, test, M7-S01 or M7-S02 artifact, `.github/` workflow, `scripts-trusted/` file, `authority/` artifact, implementation staging branch, repository configuration or external repository variable.

### 14.14 Current authorization matrix *(historical matrix at PR #25; current matrix §17.12)*

```
[HISTORICAL — as recorded at PR #25; M7 SPECIFICATION READING, conformance-target, M7-S01, M7-S01 regeneration, M7-S03 and implementation-work rows superseded by §15]
M7 EFFECTIVE SPEC V1                    : BLOCKED / NON-AUTHORITATIVE
M7 V1.1 BASE SPEC                       : ACCEPTED — SPECIFICATION ACCEPTANCE DONE, PROTECTED INTEGRATION DONE
                                          (merge f99a7e3080fdb99bd3917820d889d09694bed4af, PR #16); bytes unedited
M7 ERRATUM 01                           : ACCEPTED + PROTECTED-INTEGRATED — clause-scoped
                                          (candidate 16e232330c86c92285804eb55ecb18d7f3cdf309;
                                           merge 3ef0b3ad0fb02cba84a60d0529fe054427b9f68c, PR #19); bytes unedited
M7 ERRATUM 02                           : ACCEPTED + PROTECTED-INTEGRATED — occurrence-scoped, E02-01…E02-09 only
                                          (candidate f9d5591e16906a176f9a5f019f42312f502f9da4;
                                           merge b8df77538671b957b03294fee0fae40929d29bd3, PR #24;
                                           blob a0e6fa6720f23ac08485ab7cb696ab9ba4b7e83f;
                                           SHA-256 b7b3440ad04181356770f243a6e2870e004aba604d2a62afdefd5330c85c170f)
M7 SPECIFICATION READING                : M7 V1.1 + ACCEPTED ERRATUM 01 (for the clauses Erratum 01 amends)
                                          + ACCEPTED ERRATUM 02 (for the nine occurrences Erratum 02 enumerates)
M7 CONFORMANCE TARGET                   : M7 V1.1 + ACCEPTED ERRATUM 01 + ACCEPTED ERRATUM 02 (§14.5)
ER-01…ER-05                             : INCORPORATED ACCORDING TO ERRATUM 01
E02-01…E02-09                           : INCORPORATED ACCORDING TO ERRATUM 02 — 9 occurrences in F09, F11, F17,
                                          F23, F26; 21 / 26 fragments unaffected
D-13                                    : DOWNSTREAM IMPLEMENTATION / CONTROL-PLANE COMPATIBILITY MATTER
D-06                                    : CLASSIFICATION ONLY — SERVER_MEDIATED CONFORMING; PRESIGNED_PUT UNAVAILABLE
M7 IMPLEMENTATION AUTHORIZED            : YES — GATE 1 ONLY (see the next two rows; never quote this row alone)
M7 IMPLEMENTATION WORK                  : AUTHORIZED — GATE 1 (§11; not revoked by Erratum 01 or Erratum 02);
                                          candidates MUST conform to M7 V1.1 + accepted Erratum 01 + accepted
                                          Erratum 02 (§14.5)
M7 IMPLEMENTATION / RUNTIME             : NOT ACCEPTED — GATE 2 OPEN / NOT SATISFIED; no completed implementation
                                          candidate exists (§11.4, §14.8)
M7-S01 (PRE-ERRATUM-02 EXTRACTION)      : HISTORICALLY ACCEPTED, NOW SUPERSEDED FOR CURRENT CONFORMANCE — STALE;
                                          integrated in staging (merge 742bfffa0aaee4e92743ca5d9d6432affbe22e62,
                                          PR #22); not rejected (§14.6)
M7-S01 REGENERATION                     : REQUIRED — NOT PERFORMED; independent re-acceptance REQUIRED (§14.6)
M7-S02                                  : ACCEPTED / INTEGRATED INFRASTRUCTURE — UNCHANGED; regeneration not required
                                          (merge 14d846abb749c4bb27a9868eb0913acd343cb64e, PR #23; §14.6)
M7-S03                                  : BLOCKED — resume NOT AUTHORIZED; prerequisites §14.7
IMP-01…IMP-22                           : OPEN
MA-1…MA-18                              : OPEN
§24.3 CI ADDITIONS                      : OPEN — none exists
LC-1                                    : NOT OCCURRED
LC-2…LC-7                               : NOT OCCURRED (§12.5)
M7 CONTROL-PLANE MANIFEST               : NOT AUTHORED / NOT ACCEPTED / NOT PUBLISHED
MACHINE-READABLE AUTHORITY              : NOT PUBLISHED — UNCHANGED
PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA   : NOT ASSERTED
SELECTOR ROTATION                       : NOT PERFORMED
REAL-PROVIDER VERIFICATION              : NOT PERFORMED
REAL-DEPLOYMENT VERIFICATION            : NOT PERFORMED
RESIDUALS M7-R-01…M7-R-17               : STATED BOUNDS — NOT ELIMINATED
DEPLOYMENT / WAVE 0                     : NOT AUTHORIZED
CCA SPECIFICATION (AMENDMENT 01)        : ACCEPTED + PROTECTED-INTEGRATED (§9.1; candidate
                                          d6434e4597a178fde45faf74da0298fdb5755d37; merge
                                          f54d95abb0a8f7988626597a0eef01d0b0ae3c95, PR #14); bytes unedited
DEP-03                                  : CLOSED (§9.3)
CCA IMPLEMENTATION AUTHORIZATION        : GRANTED — IMPLEMENTATION WORK ONLY (§13; protected-integrated by PR #21,
                                          merge f1fd894b60b70e07143d474992ff8b3c5dd88fe1; see the next two rows;
                                          never quote this row alone)
CCA IMPLEMENTATION WORK                 : AUTHORIZED — permission to build conforming machinery implementing the
                                          exact accepted CCA, within CCA §50.1 scope (§13.3–§13.5)
CCA IMPLEMENTATION                      : NOT ACCEPTED — no CCA implementation exists (§13.3, §13.8)
CCA RUNTIME ACCEPTANCE                  : NOT PERFORMED
CCA AG-01…AG-16                         : OPEN FOR FUTURE IMPLEMENTATION ACCEPTANCE
CCA §48 ADVERSARIAL IMPLEMENTATION      : NOT YET EXECUTED
CCA §42–§45 ENFORCEMENT                 : NOT BUILT — NOT VERIFIED
CCA §46 FINDINGS                        : CLOSED AT SPECIFICATION LEVEL — implementation conformance NOT VERIFIED
B1S DESIGN                              : YES — MAY use the accepted S-2 non-grounding default (§9.7); Path A only
                                          with an accepted M7 ingestion integration contract (§10.9, §11.6, §12.9,
                                          §13.10, §14.11)
B2S DESIGN                              : per existing JBA / P-16 sequencing (§6, §7) — unchanged
B1 IMPLEMENTATION                       : NO
B2 IMPLEMENTATION                       : NO
C1 IMPLEMENTATION                       : NO
C2 IMPLEMENTATION                       : NO
AnalysisProtocol v1                     : UNFROZEN
P-16                                    : ACTIVE
```

This matrix records status established by §6, §7, §9, §10, §11, §12, §13 and §14.1–§14.13; it authorizes nothing beyond them. Relative to §13.13, it adds the Erratum 02, `E02-01…E02-09` and M7 conformance-target rows; extends the M7 specification-reading and implementation-work rows to Erratum 02; replaces the historical `M7-S01 : NOT EXECUTED` row with the M7-S01, M7-S01 regeneration, M7-S02 and M7-S03 rows; splits `LC-1…LC-7` into LC-1 and LC-2…LC-7 without changing either; and records the PR #21 merge on the CCA implementation-authorization row. It changes no Gate 1, Gate 2, `IMP-*`, `MA-*`, LC, manifest, machine-readable authority, selector, CCA, B, C, P-16 or deployment status.

---

## 15. M7 V1.1 Erratum 03 — ACCEPTED, PROTECTED-INTEGRATED (occurrence-scoped; specification only) — current M7 conformance state *(current at PR #29; the M7 normative-SQL conformance target of §15.2 remains current; the current M7 authority state is §17)*

This section records a lifecycle transition that has **already occurred**: the independent acceptance and the protected integration of Erratum 03 to the accepted M7 V1.1 specification. It synchronizes this register with that fact, with the protected integration of the §14 entry, and with the consequence of both for the M7 implementation-line slices. It does **not** restate, amend or re-open Erratum 03, Erratum 02, Erratum 01 or M7 V1.1; it does **not** reproduce Erratum 03's "Before"/"After" blocks, proofs, evidence or informative pinned values; it does **not** implement M7, regenerate M7-S01, resume M7-S03, modify implementation staging, author a manifest, publish machine-readable authority, create or modify `authority/`, or assert or rotate `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA`. Apart from the reading notes, annotations and pointer updates enumerated in §15.9, nothing in this section modifies §1, §2, §3, §3.1, §3.2, §9.1–§9.3, the §10.1 identity, §10.6 categories (b)–(e), the §10.7 Gate 2 list, §10.8, the Gate 1 grant of §11, §11.4, §12.1–§12.5, §12.8, §12.9, the CCA grant of §13.3–§13.10, §14.2–§14.4, the B Semantic Ratification V1.3, JBA V1.9 or its Amendment 01, M7 V1.1, Erratum 01, Erratum 02, the CCA, the A1 or A2 specifications, B1S/B2S ownership, S-2 Path A / Path B, **P-16**, or C1/C2 authority.

> **Reading note — later lifecycle events (PR #29 integration; PR #30 / PR #31 implementation-staging events; M7-S03 resume attempt; VBA-01; §16).** §15 was written as an author candidate against protected tip `6115b84…`. It has since been **protected-integrated by merge `d51393bd60c9b9b0ccd194650314312133f14ca3` (PR #29; §16.1)**; the statements of §15.1 "This entry's own status" that it records no PR or merge identity are therefore historical and are preserved rather than rewritten. Erratum 03 and its registration in §15.1–§15.3 are **unchanged**, and the §15.2 reading and M7 normative-SQL conformance target **remain current**. The §15.6 prerequisites 1–5 have since been discharged — PR #29, the Erratum 03 staging synchronization (PR #30) and the independently re-accepted Erratum 03 regeneration of M7-S01 (PR #31; §16.4) — and a separate authorization to resume M7-S03 (item 6) was given; the resumed attempt stopped as blocked and produced no candidate commit (§16.4). The §15.4 staging block, the §15.5 `M7-S01 ERRATUM 03 CURRENT-CONFORMANCE ARTIFACT SET : NONE`, `REGENERATION : REQUIRED — NOT PERFORMED` and `INDEPENDENT RE-ACCEPTANCE : REQUIRED — NOT PERFORMED` rows, the §15.6 prerequisite list and its "recorded, not resolved" paragraph, and the §15.11 matrix were true when written and are preserved as historical; the current statements are §16.4–§16.8 and §16.12. *(Later events — §17: the current implementation-line, `VBA-S02-1`, M7-S03 and matrix statements are now §17.4–§17.8 and §17.12; the §15.2 reading and conformance target remain current.)* The §15.7 and §15.8 lifecycle, machine-readable-authority and B/C statements remain true and are reaffirmed by §16.8–§16.9.

### 15.1 Protected facts — starting point, this entry's own status, and identities

**This entry's own status.** This entry is an **author candidate** for a root authority synchronization. It records **no** acceptance verdict, commit, PR or merge identity of its own, and MUST NOT be read as independently accepted or protected-integrated by virtue of its text. As with every prior entry in this register, it is authority only as recorded in this register at the protected integration surface following independent acceptance of the exact register bytes.

**Starting point.** Authored against the protected tip `origin/m3.5b-b-integration` = `6115b843c709bbfb1d169df27bc4e3db7e0f2b8a` (tree `9d85dcb91b3cc37a7c2e8df29aa94505d647133a`; parents, in order, 1. `1be2f40216ac7093962739d4312d77219ae14d4d` — 2. `df6b4b0f9c71e5286d8925ad20cbb3fcc6b14eff`). The rejected historical commit `a586b3119da2cc1aa4668485b129dbe625ab5cae` is not an ancestor of that tip.

**Erratum 02 root authority synchronization — now protected-integrated** (this is the entry that wrote §14). Recorded from Git history as provenance only; no identity below is rewritten.

| Item | Value |
| :-- | :-- |
| Entry | Post-Erratum-02 root authority synchronization — `docs(authority): sync M7 Erratum 02 acceptance` (§14) |
| Synchronization candidate commit | `47e0076777c1a6cf4ab9bdc88306ed5b490c69c5` |
| Candidate sole parent (authoring baseline) | `b8df77538671b957b03294fee0fae40929d29bd3` (PR #24 merge) |
| Candidate tree | `95bb58adab0139237372c7441fbf9773c1af67b1` |
| `PAGAMENOS_SPEC_AUTHORITY.md` Git blob at the candidate and at the merge | `162e65aeb1e7ae2f4fa04da6272f814121a57ccc` |
| PR | `#25` — *docs(authority): integrate M7 Erratum 02 root authority sync* |
| **Formal protected integration merge** | `1be2f40216ac7093962739d4312d77219ae14d4d` |
| Merge parents (in order) | 1. `b8df77538671b957b03294fee0fae40929d29bd3` — 2. `47e0076777c1a6cf4ab9bdc88306ed5b490c69c5` |
| **Merge tree** | `95bb58adab0139237372c7441fbf9773c1af67b1` (identical to the candidate tree) |
| Paths changed by the merge relative to `b8df775…` | exactly one: `PAGAMENOS_SPEC_AUTHORITY.md` |
| GitHub signature | signed GitHub merge commit |
| Post-merge `push` CI run on the protected surface | `35113637029` — SUCCESS |
| Protected integration surface | `origin/m3.5b-b-integration` (see §8.1) |

**Exact identities — Erratum 03.**

| Item | Value |
| :-- | :-- |
| Artifact | `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_03.md` |
| **Status** | **ACCEPTED + PROTECTED-INTEGRATED** (install, catalog-verifier and verification-contract executability erratum; occurrence-scoped; specification only) |
| Independent acceptance | **PERFORMED** — independent offline audit, followed by an independent differential re-audit of the reworked candidate; the verdict binds the **exact artifact bytes** identified by the SHA-256 and Git blob below, and no other bytes |
| **Accepted erratum SHA-256** | `b4debcb5a02e777e780e14002c5e9cdbb90f2140f5b7516592b8e05e67366160` |
| **Accepted erratum Git blob** | `8ba87adc9b87cee749c214d9326b0aa750ceabf0` |
| Size | 72,201 bytes; 779 LF-terminated lines |
| Accepted author candidate commit | `df6b4b0f9c71e5286d8925ad20cbb3fcc6b14eff` |
| Candidate sole parent (authoring baseline) | `1be2f40216ac7093962739d4312d77219ae14d4d` (PR #25 merge) |
| Candidate tree | `9d85dcb91b3cc37a7c2e8df29aa94505d647133a` |
| Superseded earlier candidate | `f98c2ec9daf10c5571bb72ab228081b67275daba` — received one blocking audit finding (IA-06 domain prose, class `E03-C`) and was replaced by amendment; it is **not** an ancestor of the merge and is **not** authority |
| Candidate-branch `push` CI run | `35166864639` — SUCCESS (`verify`, `authority-gate`) |
| Integration PR | `#28` — *docs(m7): add V1.1 Erratum 03 executability corrections* |
| **Formal protected integration merge** | `6115b843c709bbfb1d169df27bc4e3db7e0f2b8a` |
| Merge parents (in order) | 1. `1be2f40216ac7093962739d4312d77219ae14d4d` — 2. `df6b4b0f9c71e5286d8925ad20cbb3fcc6b14eff` |
| **Merge tree** | `9d85dcb91b3cc37a7c2e8df29aa94505d647133a` (identical to the accepted candidate tree) |
| Paths changed by the merge relative to `1be2f40…` | exactly one, added: `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_03.md` |
| GitHub signature | signed GitHub merge commit |
| Post-merge required checks | run `35167368972`: `verify` — SUCCESS; `authority-gate` — SUCCESS |
| Corrections | **14 occurrences** (`E03-01…E03-09`) in **9 correction classes** (`E03-A…E03-I`) |
| Normative SQL fragments affected | **3 / 26** — **F01, F11, F24** |
| Normative SQL fragments unaffected | **23 / 26** — F02–F10, F12–F23, F25, F26 |
| Protected integration surface | `origin/m3.5b-b-integration` (see §8.1) |

**Accepted artifacts — unchanged by Erratum 03 and by this entry.** Identical at `1be2f40…` and at `6115b84…`:

| Artifact | Git blob | SHA-256 |
| :-- | :-- | :-- |
| `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1.md` (§10.1) | `06e103b0d5e8cfcbb96ab21134d5605b0aae9b26` | `457f51778fb5d5890b3e3478376e413072f15aef7da88125b5e78963f49394bd` |
| `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_01.md` (§12.1) | `15ee22090d3e37b6a63dd25914f8abb0f4fa9d4b` | `f381cb015adadc7a22463060da7ff55e8711b8ab13879c60f93cabf53eb863e8` |
| `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_02.md` (§14.2) | `a0e6fa6720f23ac08485ab7cb696ab9ba4b7e83f` | `b7b3440ad04181356770f243a6e2870e004aba604d2a62afdefd5330c85c170f` |
| `PAGAMENOS_A1_A2_M7_CONSENT_COMPATIBILITY_AMENDMENT_01.md` (§9.1, §13.2) | `2f0ff3c886c5ac9b1cbba797404e9024c0b83732` | `3a6003494f4817907401a9afda5b9d9a1647ade5ff9196f2aee2ba3b1b2ca1ad` |

**What the checks establish.** As for §6.2, §10.1, §12.1, §13.1 and §14.2: `verify` and `authority-gate` on `1be2f40…`, `df6b4b0…` and `6115b84…` establish **integration integrity of these documentation commits only**. They are not any §24.3 CI addition, manifest gate, real-PostgreSQL, real-provider or real-deployment verification, and do not install or execute the corrected SQL; they are not claimed to be.

### 15.2 Effective reading — occurrence-scoped precedence and conformance target

```
M7 V1.1 BASE SPECIFICATION        : ACCEPTED — REMAINS THE ACCEPTED BASE (§10.1); BYTES NOT EDITED
ERRATUM 01                        : ACCEPTED + PROTECTED-INTEGRATED — CLAUSE-SCOPED; UNAFFECTED BY ERRATUM 03; BYTES NOT EDITED
ERRATUM 02                        : ACCEPTED + PROTECTED-INTEGRATED — OCCURRENCE-SCOPED (E02-01…E02-09 ONLY); UNAFFECTED BY ERRATUM 03; BYTES NOT EDITED
ERRATUM 03                        : ACCEPTED + PROTECTED-INTEGRATED — OCCURRENCE-SCOPED (E03-01…E03-09; FOURTEEN OCCURRENCES ONLY)
READING                           : M7 V1.1 READ WITH ERRATUM 01 FOR THE CLAUSES IT AMENDS,
                                    WITH ERRATUM 02 FOR THE NINE OCCURRENCES IT ENUMERATES,
                                    AND WITH ERRATUM 03 FOR THE FOURTEEN OCCURRENCES IT ENUMERATES
ERRATA FLATTENED INTO V1.1 BYTES  : NO
M7 CONFORMANCE TARGET             : M7 V1.1 + ACCEPTED ERRATUM 01 + ACCEPTED ERRATUM 02 + ACCEPTED ERRATUM 03
```

- **The accepted V1.1 bytes are not edited and are not superseded wholesale.** No erratum rewrites them; each is read **beside** them (Erratum 03 §3 rule 1; Erratum 02 §4 rule 1; Erratum 01 §1.2).
- **Erratum 01 and Erratum 02 remain accepted and applicable.** No Erratum 03 occurrence lies in a clause Erratum 01 amends or on a line Erratum 02 corrects; ER-01…ER-05, Erratum 01's MD-*/MG-* rules and `E02-01…E02-09` apply unchanged, including to migration bytes that contain the Erratum 03 corrections (Erratum 03 §3 rule 4, §7).
- **Occurrence-scoped control.** Erratum 03 supersedes **exactly** the "Before" lines of its fourteen enumerated occurrences, at the named V1.1 lines, and **nothing else**; where an "After" block is longer than its "Before" block, the extra lines are inserted immediately after the last quoted line (Erratum 03 §3 rules 2–3, 5).
- **Everything else is V1.1 + Erratum 01 + Erratum 02 exactly as accepted.** Outside the fourteen occurrences, the accepted V1.1 bytes read with Erratum 01 and Erratum 02 continue to control; an apparent conflict there is an erratum defect to be reported, not resolved by interpretation (Erratum 03 §3 rule 6). Erratum 03 introduces no broader amendment doctrine.
- **Precedence** is registered under the header reading rule, item (8c): Erratum 03 inherits the scope and subordination of M7 V1.1 (§10.3) as read with Erratum 01 and Erratum 02, and gains none beyond it.
- **Target.** Any M7 implementation candidate, and every M7 implementation-line artifact relied upon as conforming (including normative extraction artifacts), MUST conform to **M7 V1.1 + accepted Erratum 01 + accepted Erratum 02 + accepted Erratum 03**. An artifact that carries the pre-Erratum-03 bytes of any affected SQL occurrence, or applies a correction partially or at a different location, is **not** conforming.
- **Supersedes the prior target.** The prior target **M7 V1.1 + accepted Erratum 01 + accepted Erratum 02** (§14.5; header, §6, §11–§13 reading notes and §14.14 as recorded at PR #25) was correct when recorded and is preserved as historical; it is superseded **for conformance purposes only**.
- **Currency.** Consistently with §11.3, §12.6 and §14.5, an implementation candidate or manifest whose documentation-authority baseline does not incorporate accepted Erratum 03 does not meet the current conformance target. This entry restates that consequence; it adds no gate.
- **Gate 1 unchanged.** Erratum 03 does **not** revoke, narrow, re-grant or re-condition the §11 Gate 1 authorization; `M7 GATE 1: AUTHORIZED`.
- **Authored status statements resolved by events, not edits.** The integrated erratum still carries its authored header (`AUTHOR CANDIDATE — NOT YET AUTHORITATIVE`, `NOT SELF-ACCEPTED — AWAITING INDEPENDENT AUDIT`) and its §14 author-side status block (`INDEPENDENT ACCEPTANCE : NOT PERFORMED`, `PROTECTED INTEGRATION : NOT PERFORMED`, `ROOT AUTHORITY SYNC : NOT PERFORMED`, `M7 CONFORMANCE TARGET (UNTIL ACCEPTED) : M7 V1.1 + ACCEPTED ERRATUM 01 + ACCEPTED ERRATUM 02 (unchanged)`). As with M7 V1.1 (§10.4), Erratum 01 (§12.2) and Erratum 02 (§14.3), the first two are resolved by the independent acceptance and protected integration recorded in §15.1; the file is deliberately **not** modified, because any byte change would break the exact-byte binding. `ROOT AUTHORITY SYNC` and the "until accepted" conformance target are addressed by this entry, and are resolved only when this entry is itself independently accepted and protected-integrated (§15.1). Its statements about **other** things — M7-S01 regeneration under Erratum 03 not performed, M7-S03 blocked, `IMP-*` and `MA-*` open, manifest not authored/accepted/published, machine-readable authority unchanged, selector not asserted or rotated, Gate 2 open, LC-1 not occurred, deployment and Wave 0 not authorized, CCA implementation not accepted, B1/B2 and C1/C2 not authorized, P-16 active — remain **true** and are reaffirmed by §15.5–§15.8.

### 15.3 Scope of Erratum 03 — E03-01…E03-09 incorporated

`E03-01…E03-09` are incorporated **according to Erratum 03**, which is the sole authority for their content (Erratum 03 §4–§6, §8). This register records only their existence, class and location; it does **not** restate their "Before"/"After" blocks, line SHA-256 values, proofs, evidence or the informative pinned fragment values of Erratum 03 §10, and any paraphrase below yields to the accepted erratum text.

| ID | Class | V1.1 clause | V1.1 lines changed (inserted) | Normative SQL fragment |
| :-- | :-- | :-- | :-- | :-- |
| `E03-01` | E03-A — PL/pgSQL composite `INTO` | §19.11.1 `m7.i_assert_control_plane` | 5233, 5235 (+2 after 5238) | F11 |
| `E03-02` | E03-B — `acldefault` argument type | §19.13.2 `REL-ACL` branch | 8496 | F24 |
| `E03-03a` | E03-C — IA-06 quantified-role domain | §19.13.2 IA-06 branch | 8607 | F24 |
| `E03-03b` | E03-C | §18.4 IA-06 row | 2313 | — |
| `E03-04a` | E03-D — constraint-class domain (PostgreSQL 18 `NOT NULL`) | §19.13.2 constraint sub-query | 8545 | F24 |
| `E03-04b` | E03-D, E03-E | §18.4 IA-11 row | 2319 | — |
| `E03-04c` | E03-D | §19.13.1 surface table, constraints row | 8403 | — |
| `E03-05a` | E03-E — PRIMARY KEY / UNIQUE backing-index domain | §19.13.2 index sub-query | 8551 (+3 after 8551) | F24 |
| `E03-05b` | E03-E | §19.13.1 surface table, indexes row | 8404 | — |
| `E03-06a` | E03-F — M7 owner default EXECUTE privilege | §19.2 default privileges | 2471 | F01 |
| `E03-06b` | E03-F | §18.1 RS-3 | 2231 | — |
| `E03-07` | E03-G — T-137 expected rows | §25.17 | 9639 | — |
| `E03-08` | E03-H — T-05 actor, operation and expected result | §25.2 | 9414 | — |
| `E03-09` | E03-I — T-82 setup | §25.9 | 9527 | — |

**Registered effect.** Fourteen occurrences: six normative SQL occurrences in fragments F01, F11 and F24, five normative prose occurrences in §18.1, §18.4 and §19.13.1, and three verification-case rows in §25 — 15 V1.1 lines changed and 5 lines inserted. Erratum 03 §7 (interaction) and §8 (findings dispositioned without a normative delta) remain binding as written there, including their statements that no table, enum, function, function signature, trigger, constraint, index, view, role, grant, lock, lock order, runtime API, consent / A1 / A2 / CCA / B / C semantic, manifest field, `IMP-*` / `MA-*` gate or lifecycle event is added, removed or changed; that no T-ID is added or removed; that §19.2 is not reordered; that no synthetic or test manifest is authorized; and that no IA-14 detector is added. The V1.1 §19.14 object counts are unchanged. This entry adds no count of its own.

### 15.4 M7 implementation-line status — recorded as provenance

The events below occurred on the implementation staging branch `origin/m7-v1.1-implementation` after the §14 entry was authored. That branch is **not** a protected authority surface; the identities are recorded **from Git history as provenance only**, the independent acceptance verdicts are held outside this register and are not restated here, and nothing in this subsection makes any slice artifact register authority, adds a §2 row, or constitutes LC-1 or Gate-2 acceptance.

| Item | Erratum 02 authority sync into staging | M7-S01 regeneration under Erratum 02 |
| :-- | :-- | :-- |
| Candidate commit | `ef2ab3ba70e50b40f1e4293dc42289d6c644bd0a` (*chore(m7): sync Erratum 02 authority into implementation staging*; parents 1. `14d846a…` — 2. `1be2f40…`) | `60781eb599f7a385e18174adb8d0da0faf833000` (*feat(m7): regenerate S01 extraction for Erratum 02*; sole parent `0cc711e…`) |
| Candidate tree | `24b1b72159f18ae6fc52e55bef58dc9fb81dded5` | `670b9db8f4d9b6132f982ae2f40cb851679396ec` |
| Staging integration PR | `#26` | `#27` |
| Staging integration merge | `0cc711e2ab42152d0b71d9630fdfff5931fe9b6a` (parents 1. `14d846a…` — 2. `ef2ab3b…`) | `dd5fc7278ac4fc0607aeae1fc885bb46c181968e` (parents 1. `0cc711e…` — 2. `60781eb…`; tree `670b9db…`) |
| Independent acceptance | — (synchronization) | **PERFORMED** — independent re-acceptance under the then-current conformance target **M7 V1.1 + accepted Erratum 01 + accepted Erratum 02** |
| Recorded conformance target | — | `M7 V1.1 + accepted Erratum 01 + accepted Erratum 02` (`prisma/m7/normative/EXTRACTION_INDEX.json`, SHA-256 `a4313a20b8da04cf617f251a895efc2bd0ea4a5272a74d60cc18f5109419c6d0`) |

```
IMPLEMENTATION STAGING TIP        : origin/m7-v1.1-implementation = dd5fc7278ac4fc0607aeae1fc885bb46c181968e
                                    (tree 670b9db8f4d9b6132f982ae2f40cb851679396ec; PR #27)
CONTAINS PR #25 MERGE 1be2f40…    : YES (through PR #26)
CONTAINS PR #28 MERGE 6115b84…    : NO — Erratum 03 is not synchronized into implementation staging
```

- These events discharged items 1–5 of the §14.7 prerequisite list for Erratum 02. They did **not** resume M7-S03 under §14.7.
- An M7-S03 execution against `dd5fc72…` stopped with `S03 BLOCKED — SPEC-DEFECT` (fragment F11, `42601`) and produced no candidate commit; a subsequent non-authoritative M7-S03 remaining-blocker diagnostic is the evidence Erratum 03 §1.4 names. Neither is authority, and neither is recorded here as an implementation candidate.
- M7-S02 (§14.6) is unchanged.

### 15.5 M7-S01 consequence — Erratum 02 regeneration superseded for Erratum 03 conformance

```
M7-S01 PRE-ERRATUM-02 EXTRACTION (PR #22)   : HISTORICALLY ACCEPTED — SUPERSEDED (§14.6; unchanged)
M7-S01 ERRATUM 02 REGENERATION (PR #27)     : INDEPENDENTLY RE-ACCEPTED / INTEGRATED IN STAGING BEFORE ERRATUM 03 —
                                              NOW SUPERSEDED FOR ERRATUM 03 CONFORMANCE — STALE — NOT REJECTED
M7-S01 ERRATUM 03 CURRENT-CONFORMANCE ARTIFACT SET : NONE
M7-S01 ERRATUM 03 REGENERATION              : REQUIRED — NOT PERFORMED
M7-S01 ERRATUM 03 INDEPENDENT RE-ACCEPTANCE : REQUIRED — NOT PERFORMED
```

- **History is not rewritten.** The Erratum 02 regeneration of M7-S01 was independently re-accepted under the conformance target then current (**M7 V1.1 + accepted Erratum 01 + accepted Erratum 02**) and integrated into implementation staging (PR #27). That acceptance was valid when performed; the regeneration is **not** rejected, and its process is **not** recorded as invalid.
- **Subsequent authority change.** Erratum 03 changes the effective normative SQL at six occurrences in fragments **F01, F11 and F24** (`E03-06a`; `E03-01`; `E03-02`, `E03-03a`, `E03-04a`, `E03-05a`). The integrated Erratum 02 regeneration faithfully extracts V1.1 + Erratum 01 + Erratum 02, and therefore does **not** contain those corrections.
- **Consequence.** That artifact set is **STALE** relative to the current conformance target (§15.2) and is **no longer the current conformance artifact set**. It MUST NOT be relied upon as conforming for any later slice, installation, manifest derivation or acceptance.
- **Activated prerequisite.** With this synchronization, Erratum 03 §10 applies once this entry is itself independently accepted and protected-integrated: M7-S01 MUST be **regenerated only from the accepted effective authority** **M7 V1.1 + accepted Erratum 01 + accepted Erratum 02 + accepted Erratum 03** and **independently re-accepted** before reliance — regeneration, not hand-editing; the accepted Erratum 03 identity recorded beside the unchanged V1.1, Erratum 01 and Erratum 02 identities; exactly the pins of the affected fragments **F01, F11 and F24** updated; F02–F10, F12–F23, F25 and F26 byte-identical; stale bytes failing the deterministic checks; V1.1 §19.14.1 counts unchanged. Erratum 03 §10 is the authority for those requirements; this register does not restate its informative pins or weaken them.
- **Not performed here.** This entry performs no regeneration and modifies no M7-S01 artifact.

**M7-S02.**

```
M7-S02: INDEPENDENTLY ACCEPTED / INTEGRATED IMPLEMENTATION INFRASTRUCTURE — UNCHANGED
M7-S02 REGENERATION: NOT REQUIRED
```

- Erratum 03 does **not** amend M7-S02's PostgreSQL harness, roles template, migrator or multi-session infrastructure, and no authority artifact makes M7-S02 depend on the corrected bytes. Erratum 03 §8 records that a migration role able to exercise the owner's privileges before `SET LOCAL ROLE`, and object-creating or role-granting injections executed with the required owner identity or `ADMIN OPTION`, are harness/provisioning setup, not normative deltas; any such S03 harness choice is later implementation-line work and is not decided here.
- M7-S02 acceptance remains **infrastructure acceptance only**: it is not LC-1, satisfies no `IMP-*`, `MA-*` or Gate-2 item, and is not real-PostgreSQL verification of an M7 implementation candidate.

### 15.6 M7-S03 — BLOCKED; prerequisites before resume

```
M7-S03: BLOCKED
M7-S03 RESUME: NOT AUTHORIZED BY THIS ENTRY
```

**Reason.** The current M7-S01 normative artifacts do not contain the Erratum 03 corrections (§15.5), and Erratum 03 §11 keeps M7-S03 blocked. This root synchronization does **not**, by existing, authorize M7-S03.

**M7-S03 MAY resume only after at least all of the following, in this order:**

1. this Erratum 03 root authority synchronization (§15) is independently accepted and **protected-integrated**;
2. implementation staging (`origin/m7-v1.1-implementation`) is **synchronized** with the resulting authority baseline, by its own separate transition;
3. the M7-S01 artifacts are **regenerated** from **M7 V1.1 + accepted Erratum 01 + accepted Erratum 02 + accepted Erratum 03** (§15.5; Erratum 03 §10);
4. the regenerated M7-S01 is **independently re-accepted**;
5. the regenerated M7-S01 is **integrated into implementation staging**;
6. a **subsequent, separate implementation-line authorization** to resume M7-S03 is given.

These prerequisites are cumulative with, and no weaker than, Erratum 03 §10–§11. Satisfying them makes resumption **permissible**; it does not schedule or start M7-S03. A resumed M7-S03 MUST install the corrected text, MUST NOT patch normative SQL locally, and MUST stop and report any further defect (Erratum 03 §11 item 2).

**Recorded, not resolved.** Erratum 03 §8 and §11 item 3 record that, under the accepted lifecycle, M7-S03 cannot complete the V1.1 §19.13.4 fail-closed completion without an active control plane, and that Erratum 03 authorizes **no** synthetic or test manifest and changes no LC-1…LC-7 event. This entry records that implication; it does **not** resolve that work-package / lifecycle sequencing question, and satisfying items 1–6 above does not resolve it either.

### 15.7 Lifecycle isolation — unchanged

**None of the following changes status, and this entry performs none of the events it names.**

```
M7 GATE 1                                    : AUTHORIZED — implementation work only (§11; unchanged, not revoked)
M7 GATE 2                                    : OPEN / NOT SATISFIED (§11.4, §12.6; unchanged)
LC-1  IMPLEMENTATION CANDIDATE COMPLETION    : NOT OCCURRED — the implementation-line slices are not a completed candidate
LC-2…LC-7                                    : NOT OCCURRED (§12.5)
IMP-01…IMP-22                                : OPEN — none satisfied by Erratum 03 or by this entry
MA-1…MA-18                                   : OPEN — none satisfied by Erratum 03 or by this entry
§24.3 CI ADDITIONS                           : OPEN
REAL-PROVIDER / REAL-DEPLOYMENT VERIFICATION : NOT PERFORMED
FINAL CONTROL-PLANE MANIFEST                 : NOT AUTHORED / NOT ACCEPTED / NOT PUBLISHED
MACHINE-READABLE AUTHORITY                   : NOT PUBLISHED — UNCHANGED
PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA        : NOT ASSERTED
SELECTOR                                     : NOT ASSERTED / NOT ROTATED
DEPLOYMENT / WAVE 0                          : NOT AUTHORIZED
CCA IMPLEMENTATION WORK                      : AUTHORIZED (§13.3; unchanged)
CCA IMPLEMENTATION                           : NOT ACCEPTED (§13.8; unchanged)
```

No implementation or runtime acceptance has occurred. Erratum 03, the acceptance of any M7-S01 regeneration or of M7-S02, and this entry each satisfy **no** `IMP-*`, `MA-*` or Gate-2 requirement.

The two-authority architecture of §2.4, §10.8, §11.5, §12.8, §13.9 and §14.9 is unchanged. `authority/` is absent from this documentation lineage (`git ls-tree -r HEAD authority/` is empty at `6115b84…`) and is neither created nor modified by Erratum 03 or by this entry. This entry does **not** infer, invent, obtain, default or rotate the external selector, creates no machine-readable baseline, and claims no knowledge of the selector's value. Any future manifest, `prosrc` digest or `migrationSha256` MUST be derived from migration bytes conforming to the corrected text (Erratum 03 §10 item 7), under Erratum 01 MD-*/MG-*; none has been produced.

This entry does **not** modify `origin/m7-v1.1-implementation`, does not merge protected authority into it, and does not regenerate or edit `prisma/m7/normative/`, `src/m7/`, `scripts/m7/`, `package.json` or `pnpm-lock.yaml`.

### 15.8 B, C, P-16, CCA and deployment — unchanged; no leakage

Erratum 03 and this entry do **not** alter the B Semantic Ratification V1.3, JBA V1.9, JBA Amendment 01, B1S/B2S ownership (§7), S-2 Path A / Path B (§9.7), the CCA or its §13 implementation-work grant, **P-16**, or C1/C2 authority.

```
B1 / B2 IMPLEMENTATION: NO
C1 / C2: NO
P-16: ACTIVE
AnalysisProtocol v1: UNFROZEN
DEPLOYMENT / WAVE 0: NOT AUTHORIZED
```

- **Path B** (S-2 non-grounding default): status **unchanged** (§9.7).
- **Path A** (S-2 grounding): still requires the **accepted M7 ingestion integration contract** under existing B authority (§9.7, §10.9, §11.6, §12.9, §13.10, §14.11). Erratum 03 is not that contract and does not satisfy `DB-03B` or P-16.

### 15.9 Synchronization of earlier register text — provenance preserved

No earlier entry is silently rewritten. The following edits accompany this entry; each preserves the prior wording or marks it historical, and none changes any status other than the M7 specification reading, the M7 conformance target and the recorded state of the M7 implementation-line slices:

| Location | Treatment |
| :-- | :-- |
| Header — "Latest authority progression" | PR #25 integration and §15 appended; prior text unchanged |
| Header — "Protected authority surface" | PR #25 and PR #28 merges appended; latest-specification and latest-register-integration sentence updated, with its PR #25 wording preserved in an annotation; "the §15 entry is not part of this history" replaces the corresponding §14 sentence, which is preserved in that annotation |
| Header — controlling M7 specification line | Erratum 03 reading added; conformance target, M7-S01 and M7-S03 status updated, with the PR #25 wording preserved in an annotation |
| Header — reading rule | item (8c) added for Erratum 03; one parenthetical added to (8a) and one to (8b) naming the Erratum 03 occurrences; range references "(7)–(8b)" / "(1)–(8b)" → "(7)–(8c)" / "(1)–(8c)"; slice-artifact reference "(§14.6)" → "(§14.6, §15.4)" |
| §6 | M7 V1.1 bullet's slice reference extended to §15.4; Erratum 02 bullet's conformance-target and slice-status sentences moved to a new Erratum 03 bullet, with the PR #25 wording preserved in an annotation; "Not authorized" list adds reliance on the Erratum-02-conforming M7-S01 artifacts as the Erratum 03 conformance artifact set, and the M7-S03 reference adds §15.6 |
| §9.8, §10.10, §11.7, §12.11, §13.13 headings; §9.8 closing note; §11, §12 and §13 reading notes | navigation pointer "current matrix §14.14" / "the current matrix is §14.14" → "§15.11" only |
| §10 | reading note added (Erratum 03; §10.1 identity unchanged) |
| §11 reading note | one annotation added: conformance target now includes Erratum 03 |
| §12 | third reading note added (Erratum 03; §12.6 and §14.5 conformance-target statements historical; LC-1 still not occurred) |
| §13 reading note | one annotation added: conformance target now includes Erratum 03; CCA grant unchanged |
| §14 | heading annotated ("current at PR #25"); reading note added (PR #25 integration; PR #26 / PR #27 staging events; current-state statements of §14.1 own status, §14.5–§14.7 and §14.10 historical); §14.14 heading annotated and matrix tagged `[HISTORICAL — as recorded at PR #25 …]`; every row preserved verbatim |

### 15.10 What this entry changes

This entry changes exactly one file, this register. It changes no specification artifact — in particular not `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1.md`, `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_01.md`, `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_02.md`, `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_03.md`, `PAGAMENOS_A1_A2_M7_CONSENT_COMPATIBILITY_AMENDMENT_01.md`, the A1 or A2 specifications, JBA V1.9 or its Amendment 01, or the B Semantic Ratification V1.3 — and no runtime source, Prisma schema, migration, test, M7-S01, M7-S02 or M7-S03 artifact, `.github/` workflow, `scripts-trusted/` file, `authority/` artifact, implementation staging branch, repository configuration or external repository variable.

### 15.11 Current authorization matrix *(historical matrix at PR #29; current matrix §17.12)*

```
[HISTORICAL — as recorded at PR #29; M7 implementation staging, M7-S01 Erratum 03 regeneration, M7-S03, implementation/runtime and B1S rows superseded by §16; conformance-target row unchanged]
M7 EFFECTIVE SPEC V1                    : BLOCKED / NON-AUTHORITATIVE
M7 V1.1 BASE SPEC                       : ACCEPTED — SPECIFICATION ACCEPTANCE DONE, PROTECTED INTEGRATION DONE
                                          (merge f99a7e3080fdb99bd3917820d889d09694bed4af, PR #16); bytes unedited
M7 ERRATUM 01                           : ACCEPTED + PROTECTED-INTEGRATED — clause-scoped
                                          (candidate 16e232330c86c92285804eb55ecb18d7f3cdf309;
                                           merge 3ef0b3ad0fb02cba84a60d0529fe054427b9f68c, PR #19); bytes unedited
M7 ERRATUM 02                           : ACCEPTED + PROTECTED-INTEGRATED — occurrence-scoped, E02-01…E02-09 only
                                          (candidate f9d5591e16906a176f9a5f019f42312f502f9da4;
                                           merge b8df77538671b957b03294fee0fae40929d29bd3, PR #24;
                                           blob a0e6fa6720f23ac08485ab7cb696ab9ba4b7e83f;
                                           SHA-256 b7b3440ad04181356770f243a6e2870e004aba604d2a62afdefd5330c85c170f)
M7 ERRATUM 03                           : ACCEPTED + PROTECTED-INTEGRATED — occurrence-scoped, E03-01…E03-09 only
                                          (fourteen occurrences)
                                          (candidate df6b4b0f9c71e5286d8925ad20cbb3fcc6b14eff;
                                           merge 6115b843c709bbfb1d169df27bc4e3db7e0f2b8a, PR #28;
                                           blob 8ba87adc9b87cee749c214d9326b0aa750ceabf0;
                                           SHA-256 b4debcb5a02e777e780e14002c5e9cdbb90f2140f5b7516592b8e05e67366160)
M7 SPECIFICATION READING                : M7 V1.1 + ACCEPTED ERRATUM 01 (for the clauses Erratum 01 amends)
                                          + ACCEPTED ERRATUM 02 (for the nine occurrences Erratum 02 enumerates)
                                          + ACCEPTED ERRATUM 03 (for the fourteen occurrences Erratum 03 enumerates)
M7 CONFORMANCE TARGET                   : M7 V1.1 + ACCEPTED ERRATUM 01 + ACCEPTED ERRATUM 02 + ACCEPTED ERRATUM 03 (§15.2)
ER-01…ER-05                             : INCORPORATED ACCORDING TO ERRATUM 01
E02-01…E02-09                           : INCORPORATED ACCORDING TO ERRATUM 02 — 9 occurrences in F09, F11, F17,
                                          F23, F26; 21 / 26 fragments unaffected
E03-01…E03-09                           : INCORPORATED ACCORDING TO ERRATUM 03 — 14 occurrences (classes E03-A…E03-I);
                                          normative SQL in F01, F11, F24; 23 / 26 fragments unaffected
D-13                                    : DOWNSTREAM IMPLEMENTATION / CONTROL-PLANE COMPATIBILITY MATTER
D-06                                    : CLASSIFICATION ONLY — SERVER_MEDIATED CONFORMING; PRESIGNED_PUT UNAVAILABLE
M7 IMPLEMENTATION AUTHORIZED            : YES — GATE 1 ONLY (see the next two rows; never quote this row alone)
M7 IMPLEMENTATION WORK                  : AUTHORIZED — GATE 1 (§11; not revoked by Erratum 01, Erratum 02 or
                                          Erratum 03); candidates MUST conform to M7 V1.1 + accepted Erratum 01 +
                                          accepted Erratum 02 + accepted Erratum 03 (§15.2)
M7 IMPLEMENTATION / RUNTIME             : NOT ACCEPTED — GATE 2 OPEN / NOT SATISFIED; no completed implementation
                                          candidate exists (§11.4, §15.7)
M7 IMPLEMENTATION STAGING               : tip dd5fc7278ac4fc0607aeae1fc885bb46c181968e (PR #27; not an authority
                                          surface); contains PR #25 merge; does NOT contain Erratum 03 merge (§15.4)
M7-S01 (PRE-ERRATUM-02 EXTRACTION)      : HISTORICALLY ACCEPTED — SUPERSEDED; integrated in staging (merge
                                          742bfffa0aaee4e92743ca5d9d6432affbe22e62, PR #22); not rejected (§14.6)
M7-S01 (ERRATUM 02 REGENERATION)        : INDEPENDENTLY RE-ACCEPTED / INTEGRATED IN STAGING BEFORE ERRATUM 03
                                          (candidate 60781eb599f7a385e18174adb8d0da0faf833000; merge
                                          dd5fc7278ac4fc0607aeae1fc885bb46c181968e, PR #27) — NOW SUPERSEDED FOR
                                          ERRATUM 03 CONFORMANCE — STALE; not rejected (§15.5)
M7-S01 ERRATUM 03 REGENERATION          : REQUIRED — NOT PERFORMED; affected fragments F01, F11, F24;
                                          independent re-acceptance REQUIRED (§15.5)
M7-S02                                  : ACCEPTED / INTEGRATED INFRASTRUCTURE — UNCHANGED; regeneration not required
                                          (merge 14d846abb749c4bb27a9868eb0913acd343cb64e, PR #23; §14.6, §15.5)
M7-S03                                  : BLOCKED — resume NOT AUTHORIZED; prerequisites §15.6
IMP-01…IMP-22                           : OPEN
MA-1…MA-18                              : OPEN
§24.3 CI ADDITIONS                      : OPEN — none exists
LC-1                                    : NOT OCCURRED
LC-2…LC-7                               : NOT OCCURRED (§12.5)
M7 CONTROL-PLANE MANIFEST               : NOT AUTHORED / NOT ACCEPTED / NOT PUBLISHED
MACHINE-READABLE AUTHORITY              : NOT PUBLISHED — UNCHANGED
PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA   : NOT ASSERTED
SELECTOR ROTATION                       : NOT PERFORMED
REAL-PROVIDER VERIFICATION              : NOT PERFORMED
REAL-DEPLOYMENT VERIFICATION            : NOT PERFORMED
RESIDUALS M7-R-01…M7-R-17               : STATED BOUNDS — NOT ELIMINATED
DEPLOYMENT / WAVE 0                     : NOT AUTHORIZED
CCA SPECIFICATION (AMENDMENT 01)        : ACCEPTED + PROTECTED-INTEGRATED (§9.1; candidate
                                          d6434e4597a178fde45faf74da0298fdb5755d37; merge
                                          f54d95abb0a8f7988626597a0eef01d0b0ae3c95, PR #14); bytes unedited
DEP-03                                  : CLOSED (§9.3)
CCA IMPLEMENTATION AUTHORIZATION        : GRANTED — IMPLEMENTATION WORK ONLY (§13; protected-integrated by PR #21,
                                          merge f1fd894b60b70e07143d474992ff8b3c5dd88fe1; see the next two rows;
                                          never quote this row alone)
CCA IMPLEMENTATION WORK                 : AUTHORIZED — permission to build conforming machinery implementing the
                                          exact accepted CCA, within CCA §50.1 scope (§13.3–§13.5)
CCA IMPLEMENTATION                      : NOT ACCEPTED — no CCA implementation exists (§13.3, §13.8)
CCA RUNTIME ACCEPTANCE                  : NOT PERFORMED
CCA AG-01…AG-16                         : OPEN FOR FUTURE IMPLEMENTATION ACCEPTANCE
CCA §48 ADVERSARIAL IMPLEMENTATION      : NOT YET EXECUTED
CCA §42–§45 ENFORCEMENT                 : NOT BUILT — NOT VERIFIED
CCA §46 FINDINGS                        : CLOSED AT SPECIFICATION LEVEL — implementation conformance NOT VERIFIED
B1S DESIGN                              : YES — MAY use the accepted S-2 non-grounding default (§9.7); Path A only
                                          with an accepted M7 ingestion integration contract (§10.9, §11.6, §12.9,
                                          §13.10, §14.11, §15.8)
B2S DESIGN                              : per existing JBA / P-16 sequencing (§6, §7) — unchanged
B1 IMPLEMENTATION                       : NO
B2 IMPLEMENTATION                       : NO
C1 IMPLEMENTATION                       : NO
C2 IMPLEMENTATION                       : NO
AnalysisProtocol v1                     : UNFROZEN
P-16                                    : ACTIVE
```

This matrix records status established by §6, §7, §9, §10, §11, §12, §13, §14 and §15.1–§15.10; it authorizes nothing beyond them. Relative to §14.14, it adds the Erratum 03, `E03-01…E03-09` and M7 implementation-staging rows; extends the M7 specification-reading, conformance-target and implementation-work rows to Erratum 03; replaces the `M7-S01 REGENERATION : REQUIRED — NOT PERFORMED` row (which the PR #27 regeneration under Erratum 02 has since discharged for Erratum 02) with the `M7-S01 (ERRATUM 02 REGENERATION)` and `M7-S01 ERRATUM 03 REGENERATION` rows; restates the pre-Erratum-02 M7-S01 row without changing its status; and points the M7-S02, M7-S03, implementation/runtime and B1S rows at §15. It changes no Gate 1, Gate 2, `IMP-*`, `MA-*`, LC, manifest, machine-readable authority, selector, CCA, B, C, P-16 or deployment status.

## 16. M7 S03 Verification Bootstrap Amendment 01 — ACCEPTED, PROTECTED-INTEGRATED (verification and provisioning contract; no normative SQL delta) — current M7 authority state *(current at PR #33; the §16.2 normative-SQL conformance target and VBA-01 scoped reading remain current; the current M7 authority state is §17)*

> **Reading note — later lifecycle events (PR #33 integration; PR #34 implementation-staging synchronization; first `VBA-S02-1` authoring attempt; VFC-01; §17).** §16 was written as an author candidate against protected tip `b4ed5c9…`. It has since been **protected-integrated by merge `aa2799a4d04c30afb585090536db3af38cfdd345` (PR #33; §17.1)**; the statements of §16.1 "This entry's own status" that it records no PR or merge identity, and of §16.2 that VBA-01's `ROOT AUTHORITY REGISTRATION` is resolved only when §16 is itself accepted and integrated, are therefore historical (that registration is now complete) and are preserved rather than rewritten. VBA-01 and its registration in §16.1–§16.3 are **unchanged**, and the §16.2 reading and M7 normative-SQL conformance target **remain current**, VBA-01 now being read together with VFC-01 within VFC-01's scope (§17.2). The §16.7 prerequisites 1–4 have since been discharged — VBA-01 acceptance and integration, PR #33, and the VBA-01 staging synchronization (PR #34; §17.4); a first `VBA-S02-1` author candidate (`7e82121b…`) was then produced, but its independent audit was blocked on a PostgreSQL version-floor authority mismatch, which VFC-01 clarifies (§17.4, §17.6). The §16.4 staging block (tip `9cd2a61…`; `CONTAINS PR #32 MERGE b4ed5c9… : NO`), the §16.6 `VBA-S02-1 : … NOT AUTHORIZED BY THIS ROOT SYNC / NOT AUTHORED / NOT ACCEPTED / NOT INTEGRATED` row, the §16.7 prerequisite list and the §16.12 matrix were true when written and are preserved as historical; the current statements are §17.4–§17.8 and §17.12. The §16.5, §16.8 and §16.9 M7-S01, lifecycle, machine-readable-authority and B/C statements remain true and are reaffirmed by §17.5, §17.8 and §17.9.

This section records a lifecycle transition that has **already occurred**: the independent acceptance and the protected integration of the M7 S03 Verification Bootstrap Amendment 01 (**VBA-01**). It synchronizes this register with that fact, with the protected integration of the §15 entry, and with the implementation-staging events that followed §15 (the Erratum 03 staging synchronization and the independently re-accepted Erratum 03 regeneration of M7-S01). It does **not** restate, amend or re-open VBA-01, Erratum 03, Erratum 02, Erratum 01 or M7 V1.1; it does **not** reproduce VBA-01's `VBA-*` rules, tables, evidence or informative values; it does **not** implement M7, regenerate M7-S01, author or implement `VBA-S02-1`, modify M7-S02, resume M7-S03, create or execute an `M7-S03-VBCP`, modify implementation staging, author a manifest, publish machine-readable authority, create or modify `authority/`, or assert or rotate `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA`. Apart from the reading notes, annotations and pointer updates enumerated in §16.10, nothing in this section modifies §1, §2, §3, §3.1, §3.2, §9.1–§9.3, the §10.1 identity, §10.6 categories (b)–(e), the §10.7 Gate 2 list, §10.8, the Gate 1 grant of §11, §11.4, §12.1–§12.5, §12.8, §12.9, the CCA grant of §13.3–§13.10, §14.2–§14.4, §15.1–§15.3, §15.7, §15.8, the B Semantic Ratification V1.3, JBA V1.9 or its Amendment 01, M7 V1.1, Erratum 01, Erratum 02, Erratum 03, VBA-01, the CCA, the A1 or A2 specifications, B1S/B2S ownership, S-2 Path A / Path B, **P-16**, or C1/C2 authority.

### 16.1 Protected facts — starting point, this entry's own status, and identities

**This entry's own status.** This entry is an **author candidate** for a root authority synchronization. It records **no** acceptance verdict, commit, PR or merge identity of its own, and MUST NOT be read as independently accepted or protected-integrated by virtue of its text. As with every prior entry in this register, it is authority only as recorded in this register at the protected integration surface following independent acceptance of the exact register bytes.

**Starting point.** Authored against the protected tip `origin/m3.5b-b-integration` = `b4ed5c97cbdfb0e7e031ae37653342192bd2fff2` (tree `2ecfad53e05e62e5e89b967cd87044b3edad9766`; parents, in order, 1. `d51393bd60c9b9b0ccd194650314312133f14ca3` — 2. `dc6f1dfb16c3faa59dae29d6888987c8aea79bc8`). The rejected historical commit `a586b3119da2cc1aa4668485b129dbe625ab5cae` is not an ancestor of that tip.

**Erratum 03 root authority synchronization — now protected-integrated** (this is the entry that wrote §15). Recorded from Git history as provenance only; no identity below is rewritten.

| Item | Value |
| :-- | :-- |
| Entry | Post-Erratum-03 root authority synchronization (§15) |
| Synchronization candidate commit | `7a618ddaf46099f22d33e8a4e2dd00b5ae4d7b39` |
| Candidate sole parent (authoring baseline) | `6115b843c709bbfb1d169df27bc4e3db7e0f2b8a` (PR #28 merge) |
| Candidate tree | `6e0a49f7fc21669df07c0f274bad791965296f5d` |
| `PAGAMENOS_SPEC_AUTHORITY.md` Git blob at the candidate and at the merge | `9d1a4b187d12a67302ba1310c30229d70618edff` (SHA-256 `b230f20d6abbefc352ee22f96d197d07221e64c0213a7bf824d69d22fd6c061c`) |
| Candidate-branch `push` CI run | `35168831172` — SUCCESS |
| PR | `#29` — *docs(authority): integrate M7 Erratum 03 root authority sync* |
| **Formal protected integration merge** | `d51393bd60c9b9b0ccd194650314312133f14ca3` |
| Merge parents (in order) | 1. `6115b843c709bbfb1d169df27bc4e3db7e0f2b8a` — 2. `7a618ddaf46099f22d33e8a4e2dd00b5ae4d7b39` |
| **Merge tree** | `6e0a49f7fc21669df07c0f274bad791965296f5d` (identical to the candidate tree) |
| Paths changed by the merge relative to `6115b84…` | exactly one: `PAGAMENOS_SPEC_AUTHORITY.md` |
| GitHub signature | signed GitHub merge commit |
| Post-merge `push` CI run on the protected surface | `35169294068` — SUCCESS |
| Protected integration surface | `origin/m3.5b-b-integration` (see §8.1) |

**Exact identities — VBA-01.**

| Item | Value |
| :-- | :-- |
| Artifact | `PAGAMENOS_M7_S03_VERIFICATION_BOOTSTRAP_AMENDMENT_01.md` |
| **Status** | **ACCEPTED + PROTECTED-INTEGRATED** (verification and provisioning contract amendment; no normative SQL delta; documentation authority only) |
| Independent acceptance | **PERFORMED** — independent content audit, a rework round (findings `VBA-RW-01`, production-manifest scope, and `VBA-RW-02`, pre-execution fixture versus runtime chaining value), an independent content re-audit, and an independent Git-object audit reconstructed from an exported bundle; the verdict binds the **exact artifact bytes** identified by the SHA-256 and Git blob below, and no other bytes |
| **Accepted amendment SHA-256** | `dca045b62b245064926c1d4cb61c53f4f4f4110c22bcbf917a159e49ce3d1033` |
| **Accepted amendment Git blob** | `d10d59cac8f0d77304b88c6df0e06b89d710141d` |
| Size | 63,998 bytes; 559 LF-terminated lines |
| Accepted author candidate commit | `dc6f1dfb16c3faa59dae29d6888987c8aea79bc8` |
| Candidate sole parent (authoring baseline) | `d51393bd60c9b9b0ccd194650314312133f14ca3` (PR #29 merge) |
| Candidate tree | `2ecfad53e05e62e5e89b967cd87044b3edad9766` |
| Superseded earlier candidate | `05e40e2218b6e98677789bee26b73643344ea53e` — received the `REWORK` verdict (`VBA-RW-01`, `VBA-RW-02`) and was replaced by amendment; it is **not** an ancestor of the merge and is **not** authority |
| Candidate-branch `push` CI run | `35184989001` — SUCCESS (`verify`, `authority-gate`) |
| Integration PR | `#32` — *docs(m7): define S03 verification bootstrap contract* |
| **Formal protected integration merge** | `b4ed5c97cbdfb0e7e031ae37653342192bd2fff2` |
| Merge parents (in order) | 1. `d51393bd60c9b9b0ccd194650314312133f14ca3` — 2. `dc6f1dfb16c3faa59dae29d6888987c8aea79bc8` |
| **Merge tree** | `2ecfad53e05e62e5e89b967cd87044b3edad9766` (identical to the accepted candidate tree) |
| Paths changed by the merge relative to `d51393b…` | exactly one, added: `PAGAMENOS_M7_S03_VERIFICATION_BOOTSTRAP_AMENDMENT_01.md` |
| GitHub signature | signed GitHub merge commit |
| Post-merge required checks | run `35185625378` (`push`, head `b4ed5c97cbdfb0e7e031ae37653342192bd2fff2`): `verify` — SUCCESS; `authority-gate` — SUCCESS |
| Protected integration surface | `origin/m3.5b-b-integration` (see §8.1) |

**Accepted artifacts — unchanged by VBA-01 and by this entry.** Identical at `d51393b…` and at `b4ed5c9…`:

| Artifact | Git blob | SHA-256 |
| :-- | :-- | :-- |
| `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1.md` (§10.1) | `06e103b0d5e8cfcbb96ab21134d5605b0aae9b26` | `457f51778fb5d5890b3e3478376e413072f15aef7da88125b5e78963f49394bd` |
| `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_01.md` (§12.1) | `15ee22090d3e37b6a63dd25914f8abb0f4fa9d4b` | `f381cb015adadc7a22463060da7ff55e8711b8ab13879c60f93cabf53eb863e8` |
| `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_02.md` (§14.2) | `a0e6fa6720f23ac08485ab7cb696ab9ba4b7e83f` | `b7b3440ad04181356770f243a6e2870e004aba604d2a62afdefd5330c85c170f` |
| `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_03.md` (§15.1) | `8ba87adc9b87cee749c214d9326b0aa750ceabf0` | `b4debcb5a02e777e780e14002c5e9cdbb90f2140f5b7516592b8e05e67366160` |
| `PAGAMENOS_A1_A2_M7_CONSENT_COMPATIBILITY_AMENDMENT_01.md` (§9.1, §13.2) | `2f0ff3c886c5ac9b1cbba797404e9024c0b83732` | `3a6003494f4817907401a9afda5b9d9a1647ade5ff9196f2aee2ba3b1b2ca1ad` |

**What the checks establish.** As for §6.2, §10.1 and §12.1–§15.1: `verify` and `authority-gate` on `7a618dd…`, `d51393b…`, `dc6f1df…` and `b4ed5c9…` establish **integration integrity of these documentation commits only**. They are not any §24.3 CI addition, manifest gate, real-PostgreSQL, real-provider or real-deployment verification, do not install or execute M7 SQL, and do not instantiate an `M7-S03-VBCP`; they are not claimed to be.

### 16.2 Effective reading — normative-SQL conformance target unchanged; VBA-01 scoped supplement

```
M7 V1.1 BASE SPECIFICATION           : ACCEPTED — REMAINS THE ACCEPTED BASE (§10.1); BYTES NOT EDITED
ERRATA 01 / 02 / 03                  : ACCEPTED + PROTECTED-INTEGRATED — SCOPES UNCHANGED (§12, §14, §15.2); BYTES NOT EDITED
VBA-01                               : ACCEPTED + PROTECTED-INTEGRATED — VERIFICATION AND PROVISIONING CONTRACT;
                                       NOT AN ERRATUM; NO NORMATIVE SQL OCCURRENCE CHANGED; BYTES NOT EDITED
M7 NORMATIVE SQL CONFORMANCE TARGET  : M7 V1.1 + ACCEPTED ERRATUM 01 + ACCEPTED ERRATUM 02 + ACCEPTED ERRATUM 03
                                       (§15.2) — UNCHANGED BY VBA-01; F01–F26 AND M7-S01 PINS UNCHANGED
M7 INSTALLATION-TIME PROVISIONING
AND M7-S03 VERIFICATION / BOOTSTRAP
ORCHESTRATION                        : M7 V1.1 + ACCEPTED ERRATA 01–03 + ACCEPTED VBA-01 FOR ITS EXPRESSLY SCOPED VBA-* CONTRACT
```

- **VBA-01 is not a normative-SQL erratum.** It changes no normative SQL occurrence, no fragment F01–F26, no accepted M7-S01 fragment pin and no V1.1 §19.14 count, and it does not change the M7 normative-SQL conformance target of §15.2 (VBA-01 §13, header status block).
- **Scoped supplement.** For M7 installation-time provisioning (`VBA-PV-*`) and for M7-S03 verification/bootstrap orchestration (the `VBA-VB`, `VBA-LB`, `VBA-AX`, `VBA-FX`, `VBA-OR`, `VBA-EX`, `VBA-TX`, `VBA-SC`, `VBA-EV` families and `VBA-S02-1`), the effective authority is M7 V1.1 read with accepted Errata 01–03 **and** accepted VBA-01. Outside that expressly scoped contract, VBA-01 controls nothing.
- **VBA-01 is the sole authority for its clauses.** This register records only the existence and scope of the `VBA-*` families (§16.3); it does not restate them, and any paraphrase here yields to the accepted VBA-01 text.
- **Precedence** is registered under the header reading rule, item (8d): VBA-01 inherits the scope and subordination of M7 V1.1 (§10.3) as read with Errata 01–03, gains no scope beyond its enumerated contract, and is not a precedence item for normative SQL.
- **Gate 1 unchanged.** VBA-01 does **not** revoke, narrow, re-grant or re-condition the §11 Gate 1 authorization; `M7 GATE 1: AUTHORIZED`.
- **Authored status statements resolved by events, not edits.** The integrated amendment still carries its authored header (`AUTHOR CANDIDATE — NOT YET AUTHORITATIVE`, `NOT SELF-ACCEPTED — AWAITING INDEPENDENT AUDIT`, `M7-S03 REMAINS BLOCKED`) and its §18 author-side status block (`PAGAMENOS_M7_S03_VERIFICATION_BOOTSTRAP_AMENDMENT_01 : AUTHOR CANDIDATE — NOT YET AUTHORITATIVE`, `INDEPENDENT ACCEPTANCE : NOT PERFORMED`, `PROTECTED INTEGRATION : NOT PERFORMED`, `ROOT AUTHORITY REGISTRATION : NOT PERFORMED`). Those statements were correct when authored. As with M7 V1.1 (§10.4) and Errata 01–03 (§12.2, §14.3, §15.2), `INDEPENDENT ACCEPTANCE` and `PROTECTED INTEGRATION` are resolved externally by the independent acceptance and the PR #32 merge recorded in §16.1; the file is deliberately **not** modified, because any byte change would break the exact-byte binding. `ROOT AUTHORITY REGISTRATION` is addressed by this entry and is resolved only when this entry is itself independently accepted and protected-integrated (§16.1). Its statements about **other** things — no normative SQL changed, M7-S01 regeneration not required, M7-S02 unchanged with `VBA-S02-1` required downstream, M7-S03 blocked and resume not authorized, `M7-S03-VBCP` not instantiated, production manifest not authored, LC-1…LC-7 not occurred, Gate 2 open, machine-readable authority not published, selector not asserted or rotated, deployment and Wave 0 not authorized — remain **true** and are reaffirmed by §16.5–§16.9.

### 16.3 Scope of VBA-01 — registered, not restated

VBA-01 is the sole authority for the content of every `VBA-*` clause (VBA-01 §3–§17). This register records only the families and their subjects:

| Family (VBA-01 section) | Subject |
| :-- | :-- |
| `VBA-PV-1…3` (§3) | install-time provisioning invariant, preserved properties, and version-scoped realizations (PostgreSQL ≥ 16 canonical; PostgreSQL 15 unverified) |
| `VBA-VB-1`, `VBA-LB-1…3` (§4–§5) | definition of the S03 verification bootstrap control plane `M7-S03-VBCP` and its hard lifecycle boundaries |
| `VBA-AX-1…7` (§6) | anti-circularity of expected catalog truth; four value domains |
| `VBA-FX-1…9` (§7) | fixture identity, fixture document, digests and domain separation, argument classes and runtime binding |
| `VBA-OR-1…6` (§8) | F26 byte invariance and verification orchestration |
| `VBA-EX-1…2` (§9) | expectation-source contract |
| `VBA-TX-1…6`, `VBA-SC-1…5`, `VBA-EV` (§10–§12) | transaction, commit and session rules; verification scope; required S03 evidence |
| §13–§17 | S01 consequence (no regeneration), S02 consequence (`VBA-S02-1`), lifecycle consequence, non-authorizations, acceptance criteria `VBA-AC-1…14` |

**Registered effect.** VBA-01 adds no table, enum, function, signature, trigger, constraint, index, view, role, grant, lock, T-ID or `IMP-*` / `MA-*` item; changes no T-ID semantics; authorizes no manifest, LC event, machine-readable authority, selector rotation, deployment or Wave 0; and authorizes neither `VBA-S02-1` nor the resumption of M7-S03 (VBA-01 §16). This entry adds no rule of its own.

### 16.4 M7 implementation-line status — recorded as provenance

The events below occurred on the implementation staging branch `origin/m7-v1.1-implementation` after the §15 entry was authored. That branch is **not** a protected authority surface; the identities are recorded **from Git history as provenance only**, the independent acceptance verdicts are held outside this register and are not restated here, and nothing in this subsection makes any slice artifact register authority, adds a §2 row, or constitutes LC-1 or Gate-2 acceptance.

| Item | Erratum 03 authority sync into staging | M7-S01 regeneration under Erratum 03 |
| :-- | :-- | :-- |
| Candidate commit | `2fa250cb3217b1ad7986630b05cff52b81f04ed0` (*chore(m7): sync Erratum 03 authority into implementation staging*; parents 1. `dd5fc72…` — 2. `d51393b…`) | `46c3fd5eda9f5b60f3116c256e610ffae158b017` (*feat(m7): regenerate S01 extraction for Erratum 03*; sole parent `adeb36b…`) |
| Candidate tree | `0a541b34a7c6f98639be3238c49b3813adcb6a89` | `64862ccb571aad4fd55771b5cadb06e82d5de0c9` |
| Staging integration PR | `#30` | `#31` |
| Staging integration merge | `adeb36bc1e63f255cadc3a3404cbe76c410478cc` (parents 1. `dd5fc7278ac4fc0607aeae1fc885bb46c181968e` — 2. `2fa250c…`; tree `0a541b34a7c6f98639be3238c49b3813adcb6a89`) | `9cd2a61939d3e0ee6cf47ddcc9198b6c570974b0` (parents 1. `adeb36b…` — 2. `46c3fd5…`; tree `64862ccb571aad4fd55771b5cadb06e82d5de0c9`) |
| Paths changed by the merge relative to parent 1 | exactly two: `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_03.md` (added), `PAGAMENOS_SPEC_AUTHORITY.md` (modified) | 17 paths, all under `prisma/m7/normative/`, `src/m7/normative/` and `scripts/m7/extract-normative-ddl.ts` |
| Post-merge `push` CI run | `35170790348` — SUCCESS | `35181957382` — SUCCESS |
| Independent acceptance | — (synchronization) | **PERFORMED** — independent byte-level audit, reconstructed from an exported bundle, under the conformance target **M7 V1.1 + accepted Erratum 01 + accepted Erratum 02 + accepted Erratum 03** |
| Recorded conformance target | — | `M7 V1.1 + accepted Erratum 01 + accepted Erratum 02 + accepted Erratum 03` (`prisma/m7/normative/EXTRACTION_INDEX.json`, Git blob `a8a085e12749e6483f8d65a215a74c5c2909484e`, SHA-256 `7e00ddc8fbbdad8f2f5cb2c0a36f79b69ec533cbb69e8d0a5a61eabe21aed665`) |

```
IMPLEMENTATION STAGING TIP        : origin/m7-v1.1-implementation = 9cd2a61939d3e0ee6cf47ddcc9198b6c570974b0
                                    (tree 64862ccb571aad4fd55771b5cadb06e82d5de0c9; PR #31)
CONTAINS PR #29 MERGE d51393b…    : YES (through PR #30)
CONTAINS PR #32 MERGE b4ed5c9…    : NO — VBA-01 is not synchronized into implementation staging
CONTAINS THIS §16 ENTRY           : NO
```

- These events discharged items 1–5 of the §15.6 prerequisite list. A separate implementation-line authorization to resume M7-S03 (item 6) was subsequently given; the resumed attempt ran a non-authoritative re-diagnosis against `9cd2a61…`, stopped as blocked (the D03-12 control-plane bootstrap question and the D03-04 install-time provisioning question), and produced **no** candidate commit. That re-diagnosis is the evidence VBA-01 §2.4 names; it is not authority and is not recorded here as an implementation candidate.
- M7-S02 (§14.6, §15.5) is unchanged; its status under VBA-01 is §16.6.

### 16.5 M7-S01 — Erratum 03 regeneration re-accepted and integrated; no regeneration required by VBA-01

```
M7-S01 PRE-ERRATUM-02 EXTRACTION (PR #22)       : HISTORICALLY ACCEPTED — SUPERSEDED (§14.6; unchanged)
M7-S01 ERRATUM 02 REGENERATION (PR #27)         : INDEPENDENTLY RE-ACCEPTED / INTEGRATED — SUPERSEDED FOR ERRATUM 03
                                                  CONFORMANCE — NOT REJECTED (§15.5; unchanged)
M7-S01 ERRATUM 03 REGENERATION (PR #31)         : INDEPENDENTLY RE-ACCEPTED — INTEGRATED IN IMPLEMENTATION STAGING
                                                  (merge 9cd2a61939d3e0ee6cf47ddcc9198b6c570974b0)
M7-S01 CURRENT CONFORMANCE ARTIFACT SET         : THE ERRATUM 03 REGENERATION (PR #31)
S01 REGENERATION REQUIRED BY VBA-01             : NO
```

- **Current pins** of the three fragments Erratum 03 affects, as in the integrated regeneration: F01 `f75c45ab8110c3fe5bce5379e77a08a51bc2e3d0561e887310d9c9361d02a6be`; F11 `c9f5777fcc699fd9411427e4b17fd3f28258068f925bbb8fcbe3a935fbec75a9`; F24 `f68eeea9d1f6a3b192b64163949385d89cd0b0fa369b168d8160d3eaa7006fff`. The other 23 fragments are byte-identical to the Erratum 02 regeneration. These values are recorded as provenance; Erratum 03 §10 remains the authority for the regeneration requirements, and this register does not make the extraction artifacts authority.
- **History is not rewritten.** §15.5 correctly recorded, at PR #29, that the Erratum 03 regeneration was required and not performed and that no Erratum 03 current-conformance artifact set existed. Those statements were true then and are preserved as historical; they are discharged by the PR #31 events recorded in §16.4.
- **No regeneration required by VBA-01.** VBA-01 changes no normative SQL occurrence; F01–F26 and every accepted M7-S01 pin are unchanged (VBA-01 §13). This entry performs no regeneration and modifies no M7-S01 artifact.

### 16.6 M7-S02 — infrastructure acceptance preserved; `VBA-S02-1` required downstream

```
M7-S02    : INDEPENDENTLY ACCEPTED / INTEGRATED IMPLEMENTATION INFRASTRUCTURE — ACCEPTANCE PRESERVED, NOT REJECTED
VBA-S02-1 : REQUIRED DOWNSTREAM WORK PACKAGE — NOT AUTHORIZED BY THIS ROOT SYNC / NOT AUTHORED / NOT ACCEPTED / NOT INTEGRATED
```

- **Consequence recorded.** Under VBA-01 §3 and §14, the owner-membership provisioning currently instantiated by M7-S02 on PostgreSQL ≥ 16 does **not** satisfy `VBA-PV-1` for executing the M7 installation script. M7-S02 remains accepted for its own scope (role provisioning checks, accepted-migration replay, A1/A2 regression; it installs no M7); its infrastructure acceptance is **not** revoked, and M7-S02 is **not** rejected.
- **`VBA-S02-1`** — the M7-S02 provisioning compatibility micro-patch — is required before any M7-S03 execution that installs the M7 script. VBA-01 §14 is the **sole** authority for its scope. This entry does not authorize, author, accept or integrate it, and does not modify M7-S02.
- M7-S02 acceptance remains **infrastructure acceptance only**: it is not LC-1, satisfies no `IMP-*`, `MA-*` or Gate-2 item, and is not real-PostgreSQL verification of an M7 implementation candidate.

### 16.7 M7-S03 — BLOCKED; prerequisites before resume

```
M7-S03: BLOCKED
M7-S03 RESUME: NOT AUTHORIZED BY THIS ENTRY
```

**Reason.** The M7-S03 install requires a provisioning that satisfies `VBA-PV-1`, which the currently instantiated M7-S02 provisioning does not (§16.6), and the verification bootstrap contract of VBA-01 is not yet synchronized into implementation staging (§16.4). This root synchronization does **not**, by existing, authorize M7-S03, and does **not** authorize `VBA-S02-1`.

**M7-S03 MAY resume only after all of the following, in this order** (the §15.6 list is superseded by this list and preserved as historical):

| # | Prerequisite | State |
| :-- | :-- | :-- |
| 1 | VBA-01 independently accepted | **DONE** (§16.1) |
| 2 | VBA-01 protected-integrated | **DONE** (PR #32, merge `b4ed5c9…`; §16.1) |
| 3 | this VBA-01 root authority registration (§16) independently accepted and protected-integrated | PENDING |
| 4 | implementation staging (`origin/m7-v1.1-implementation`) synchronized with the resulting protected authority baseline, by its own separate transition | PENDING |
| 5 | `VBA-S02-1` separately authorized | PENDING |
| 6 | `VBA-S02-1` authored | PENDING |
| 7 | `VBA-S02-1` independently accepted | PENDING |
| 8 | `VBA-S02-1` integrated into implementation staging | PENDING |
| 9 | a subsequent, separate implementation-line authorization to resume M7-S03 | PENDING |

These prerequisites are cumulative with, and no weaker than, Erratum 03 §11 and VBA-01 §14–§16. Satisfying them makes resumption **permissible**; it does not schedule or start M7-S03. A resumed M7-S03 MUST install the corrected text of §15.2 without patching normative SQL, MUST satisfy the VBA-01 contract, and MUST stop and report any further defect.

**The §15.6 "recorded, not resolved" question.** VBA-01 now resolves, at the level of documentation authority and for M7-S03 verification only, how M7-S03 may exercise an active control plane before a reviewed production manifest exists (the `M7-S03-VBCP` contract). That resolution is usable only after items 3–9 above; it creates no LC event, manifest or production control-plane state (§16.8).

### 16.8 Control plane, manifest and lifecycle isolation — unchanged

**None of the following changes status, and this entry performs none of the events it names.**

```
M7 GATE 1                                    : AUTHORIZED — implementation work only (§11; unchanged, not revoked)
M7 GATE 2                                    : OPEN / NOT SATISFIED (§11.4, §12.6; unchanged)
REVIEWED PRODUCTION MANIFEST                 : NOT AUTHORED / NOT ACTIVE
M7-S03-VBCP                                  : AUTHORIZED BY ACCEPTED VBA-01 ONLY AS AN S03 VERIFICATION FIXTURE
                                               NOT A PRODUCTION MANIFEST
                                               NOT YET IMPLEMENTED / EXECUTED AS ACCEPTED S03 EVIDENCE
LC-1  IMPLEMENTATION CANDIDATE COMPLETION    : NOT OCCURRED
LC-2…LC-7                                    : NOT OCCURRED (§12.5)
IMP-01…IMP-22                                : OPEN — none satisfied by VBA-01 or by this entry
MA-1…MA-18                                   : OPEN — none satisfied by VBA-01 or by this entry
§24.3 CI ADDITIONS                           : OPEN
REAL-PROVIDER / REAL-DEPLOYMENT VERIFICATION : NOT PERFORMED
MACHINE-READABLE AUTHORITY                   : NOT PUBLISHED — UNCHANGED
PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA        : NOT ASSERTED
SELECTOR                                     : NOT ASSERTED / NOT ROTATED
DEPLOYMENT / WAVE 0                          : NOT AUTHORIZED
CCA IMPLEMENTATION WORK                      : AUTHORIZED (§13.3; unchanged)
CCA IMPLEMENTATION                           : NOT ACCEPTED (§13.8; unchanged)
```

No implementation or runtime acceptance has occurred. The acceptance of VBA-01, the acceptance of any M7-S01 regeneration or of M7-S02, and this entry each satisfy **no** `IMP-*`, `MA-*` or Gate-2 requirement. The acceptance of VBA-01 and the definition of `M7-S03-VBCP` constitute **no** lifecycle event.

The two-authority architecture of §2.4, §10.8, §11.5, §12.8, §13.9, §14.9 and §15.7 is unchanged. This entry changes **documentation authority only**: `authority/` is absent from this documentation lineage (`git ls-tree -r HEAD authority/` is empty at `b4ed5c9…`) and is neither created nor modified by VBA-01 or by this entry; no machine-readable authority is published; this entry does **not** know, infer, invent, obtain, default or rotate the external selector, does **not** assert `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA`, creates no manifest and rotates nothing.

This entry does **not** modify `origin/m7-v1.1-implementation`, does not merge protected authority into it, and does not regenerate or edit `prisma/m7/normative/`, `src/m7/`, `scripts/m7/`, `package.json` or `pnpm-lock.yaml`.

### 16.9 B, C, P-16, CCA and deployment — unchanged; no leakage

VBA-01 and this entry are M7-scoped documentation authority. They do **not** change the B Semantic Ratification V1.3, JBA V1.9, JBA Amendment 01, B1S/B2S ownership (§7), the S-2 Path A / Path B rules (§9.7, §10.9), the CCA specification or its implementation-work grant (§13), `CCA IMPLEMENTATION: NOT ACCEPTED`, **P-16**, C1/C2 status, `AnalysisProtocol v1` (unfrozen) or deployment status. **VBA-01 is not an M7 ingestion integration contract** for Path A (§10.9, §11.6, §12.9, §13.10, §14.11, §15.8); B1S Path A remains available only with an accepted M7 ingestion integration contract.

### 16.10 Synchronization of earlier register text — provenance preserved

No earlier entry is silently rewritten. The following edits accompany this entry; each preserves the prior wording or marks it historical, and none changes any status other than the recorded M7 authority reading, the recorded state of the M7 implementation-line slices, and the M7-S03 prerequisite list:

| Location | Treatment |
| :-- | :-- |
| Header — "Latest authority progression" | PR #29 integration and VBA-01 (§16) appended; prior text unchanged |
| Header — "Protected authority surface" | PR #29 and PR #32 merges appended; latest-integration sentence updated, with its PR #29 wording preserved in an annotation; "the §16 entry is not part of this history" replaces the corresponding §15 sentence, which is preserved in that annotation |
| Header — controlling M7 specification line | VBA-01 scoped reading added; M7-S01, M7-S02 / `VBA-S02-1` and M7-S03 status updated, with the PR #29 wording preserved in an annotation; the normative-SQL conformance target is unchanged |
| Header — reading rule | item (8d) added for VBA-01; range references "(7)–(8c)" / "(1)–(8c)" → "(7)–(8d)" / "(1)–(8d)"; slice-artifact reference "(§14.6, §15.4)" → "(§14.6, §15.4, §16.4)" |
| §6 | Erratum 03 bullet's M7-S01 and M7-S03 status sentence moved to a new VBA-01 bullet, with the PR #29 wording preserved in an annotation; "Not authorized" list adds §16.7 to the M7-S03 reference and adds `VBA-S02-1` and use of an `M7-S03-VBCP` as a manifest |
| §9.8, §10.10, §11.7, §12.11, §13.13, §14.14 headings; §9.8 closing note; §11, §12 and §13 reading notes | navigation pointer "current matrix §15.11" / "the current matrix is §15.11" → "§16.12" only |
| §10 | reading note added (VBA-01 scoped reading; §10.1 identity unchanged) |
| §14 reading note | one annotation added: the current slice and matrix statements are now §16.4–§16.7 and §16.12 |
| §15 | heading annotated ("current at PR #29"); reading note added (PR #29 integration; PR #30 / PR #31 staging events; M7-S03 resume attempt; VBA-01; current-state statements of §15.1 own status, §15.4 staging block, §15.5 Erratum 03 regeneration rows, §15.6 prerequisite list and §15.11 historical); §15.11 heading annotated and matrix tagged `[HISTORICAL — as recorded at PR #29 …]`; every row preserved verbatim |

### 16.11 What this entry changes

This entry changes exactly one file, this register. It changes no specification or amendment artifact — in particular not `PAGAMENOS_M7_S03_VERIFICATION_BOOTSTRAP_AMENDMENT_01.md`, `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1.md`, `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_01.md`, `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_02.md`, `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_03.md`, `PAGAMENOS_A1_A2_M7_CONSENT_COMPATIBILITY_AMENDMENT_01.md`, the A1 or A2 specifications, JBA V1.9 or its Amendment 01, or the B Semantic Ratification V1.3 — and no runtime source, Prisma schema, migration, test, package file, M7-S01, M7-S02 or M7-S03 artifact, `.github/` workflow, `scripts-trusted/` file, `authority/` artifact, implementation staging branch, repository configuration or external repository variable.

### 16.12 Current authorization matrix *(historical matrix at PR #33; current matrix §17.12)*

```
[HISTORICAL — as recorded at PR #33; M7 implementation staging, VBA-S02-1, M7-S03, M7-S03 RESUME, M7-S03-VBCP, implementation-work, implementation/runtime and B1S rows superseded by §17; normative-SQL conformance-target and VBA-01 identity rows unchanged]
M7 EFFECTIVE SPEC V1                    : BLOCKED / NON-AUTHORITATIVE
M7 V1.1 BASE SPEC                       : ACCEPTED — SPECIFICATION ACCEPTANCE DONE, PROTECTED INTEGRATION DONE
                                          (merge f99a7e3080fdb99bd3917820d889d09694bed4af, PR #16); bytes unedited
M7 ERRATUM 01                           : ACCEPTED + PROTECTED-INTEGRATED — clause-scoped
                                          (candidate 16e232330c86c92285804eb55ecb18d7f3cdf309;
                                           merge 3ef0b3ad0fb02cba84a60d0529fe054427b9f68c, PR #19); bytes unedited
M7 ERRATUM 02                           : ACCEPTED + PROTECTED-INTEGRATED — occurrence-scoped, E02-01…E02-09 only
                                          (candidate f9d5591e16906a176f9a5f019f42312f502f9da4;
                                           merge b8df77538671b957b03294fee0fae40929d29bd3, PR #24;
                                           blob a0e6fa6720f23ac08485ab7cb696ab9ba4b7e83f;
                                           SHA-256 b7b3440ad04181356770f243a6e2870e004aba604d2a62afdefd5330c85c170f)
M7 ERRATUM 03                           : ACCEPTED + PROTECTED-INTEGRATED — occurrence-scoped, E03-01…E03-09 only
                                          (fourteen occurrences)
                                          (candidate df6b4b0f9c71e5286d8925ad20cbb3fcc6b14eff;
                                           merge 6115b843c709bbfb1d169df27bc4e3db7e0f2b8a, PR #28;
                                           blob 8ba87adc9b87cee749c214d9326b0aa750ceabf0;
                                           SHA-256 b4debcb5a02e777e780e14002c5e9cdbb90f2140f5b7516592b8e05e67366160)
M7 S03 VBA-01                           : ACCEPTED + PROTECTED-INTEGRATED — verification and provisioning contract;
                                          no normative SQL delta
                                          (candidate dc6f1dfb16c3faa59dae29d6888987c8aea79bc8;
                                           merge b4ed5c97cbdfb0e7e031ae37653342192bd2fff2, PR #32;
                                           blob d10d59cac8f0d77304b88c6df0e06b89d710141d;
                                           SHA-256 dca045b62b245064926c1d4cb61c53f4f4f4110c22bcbf917a159e49ce3d1033)
M7 SPECIFICATION READING                : M7 V1.1 + ACCEPTED ERRATUM 01 (for the clauses Erratum 01 amends)
                                          + ACCEPTED ERRATUM 02 (for the nine occurrences Erratum 02 enumerates)
                                          + ACCEPTED ERRATUM 03 (for the fourteen occurrences Erratum 03 enumerates)
M7 NORMATIVE SQL CONFORMANCE TARGET     : M7 V1.1 + ACCEPTED ERRATUM 01 + ACCEPTED ERRATUM 02 + ACCEPTED ERRATUM 03 (§15.2)
                                          — UNCHANGED BY VBA-01
M7 INSTALL PROVISIONING / S03 VERIFICATION
AND BOOTSTRAP ORCHESTRATION READING     : M7 V1.1 + ACCEPTED ERRATA 01–03 + ACCEPTED VBA-01 FOR ITS EXPRESSLY SCOPED
                                          VBA-* CONTRACT (§16.2)
ER-01…ER-05                             : INCORPORATED ACCORDING TO ERRATUM 01
E02-01…E02-09                           : INCORPORATED ACCORDING TO ERRATUM 02 — 9 occurrences in F09, F11, F17,
                                          F23, F26; 21 / 26 fragments unaffected
E03-01…E03-09                           : INCORPORATED ACCORDING TO ERRATUM 03 — 14 occurrences (classes E03-A…E03-I);
                                          normative SQL in F01, F11, F24; 23 / 26 fragments unaffected
VBA-*                                   : INCORPORATED ACCORDING TO VBA-01 — scoped contract only; 0 SQL occurrences
D-13                                    : DOWNSTREAM IMPLEMENTATION / CONTROL-PLANE COMPATIBILITY MATTER
D-06                                    : CLASSIFICATION ONLY — SERVER_MEDIATED CONFORMING; PRESIGNED_PUT UNAVAILABLE
M7 IMPLEMENTATION AUTHORIZED            : YES — GATE 1 ONLY (see the next two rows; never quote this row alone)
M7 IMPLEMENTATION WORK                  : AUTHORIZED — GATE 1 (§11; not revoked by Erratum 01, Erratum 02, Erratum 03
                                          or VBA-01); candidates MUST conform to M7 V1.1 + accepted Erratum 01 +
                                          accepted Erratum 02 + accepted Erratum 03 (§15.2) and, within its scope,
                                          to accepted VBA-01 (§16.2)
M7 IMPLEMENTATION / RUNTIME             : NOT ACCEPTED — GATE 2 OPEN / NOT SATISFIED; no completed implementation
                                          candidate exists (§11.4, §16.8)
M7 IMPLEMENTATION STAGING               : tip 9cd2a61939d3e0ee6cf47ddcc9198b6c570974b0 (PR #31; not an authority
                                          surface); contains PR #29 merge; does NOT contain VBA-01 merge (§16.4)
M7-S01 (PRE-ERRATUM-02 EXTRACTION)      : HISTORICALLY ACCEPTED — SUPERSEDED; integrated in staging (merge
                                          742bfffa0aaee4e92743ca5d9d6432affbe22e62, PR #22); not rejected (§14.6)
M7-S01 (ERRATUM 02 REGENERATION)        : INDEPENDENTLY RE-ACCEPTED / INTEGRATED IN STAGING BEFORE ERRATUM 03
                                          (candidate 60781eb599f7a385e18174adb8d0da0faf833000; merge
                                          dd5fc7278ac4fc0607aeae1fc885bb46c181968e, PR #27) — SUPERSEDED FOR
                                          ERRATUM 03 CONFORMANCE; not rejected (§15.5)
M7-S01 ERRATUM 03 REGENERATION          : INDEPENDENTLY RE-ACCEPTED + INTEGRATED IN STAGING — CURRENT CONFORMANCE
                                          ARTIFACT SET (candidate 46c3fd5eda9f5b60f3116c256e610ffae158b017;
                                          merge 9cd2a61939d3e0ee6cf47ddcc9198b6c570974b0, PR #31); pins F01
                                          f75c45ab…, F11 c9f5777f…, F24 f68eeea9… (§16.5)
M7-S01 REGENERATION REQUIRED BY VBA-01  : NO (§16.5)
M7-S02                                  : ACCEPTED / INTEGRATED INFRASTRUCTURE — ACCEPTANCE PRESERVED
                                          (merge 14d846abb749c4bb27a9868eb0913acd343cb64e, PR #23; §14.6, §16.6)
VBA-S02-1                               : REQUIRED DOWNSTREAM — NOT AUTHORIZED / NOT AUTHORED / NOT ACCEPTED /
                                          NOT INTEGRATED (§16.6)
M7-S03                                  : BLOCKED (§16.7)
M7-S03 RESUME                           : NOT AUTHORIZED — prerequisites §16.7
M7-S03-VBCP                             : AUTHORIZED BY VBA-01 ONLY AS AN S03 VERIFICATION FIXTURE — NOT A PRODUCTION
                                          MANIFEST — NOT YET IMPLEMENTED / EXECUTED AS ACCEPTED S03 EVIDENCE (§16.8)
IMP-01…IMP-22                           : OPEN
MA-1…MA-18                              : OPEN
§24.3 CI ADDITIONS                      : OPEN — none exists
LC-1                                    : NOT OCCURRED
LC-2…LC-7                               : NOT OCCURRED (§12.5)
M7 CONTROL-PLANE MANIFEST               : NOT AUTHORED / NOT ACCEPTED / NOT PUBLISHED / NOT ACTIVE
MACHINE-READABLE AUTHORITY              : NOT PUBLISHED — UNCHANGED
PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA   : NOT ASSERTED
SELECTOR                                : NOT ASSERTED / NOT ROTATED
REAL-PROVIDER VERIFICATION              : NOT PERFORMED
REAL-DEPLOYMENT VERIFICATION            : NOT PERFORMED
RESIDUALS M7-R-01…M7-R-17               : STATED BOUNDS — NOT ELIMINATED
DEPLOYMENT / WAVE 0                     : NOT AUTHORIZED
CCA SPECIFICATION (AMENDMENT 01)        : ACCEPTED + PROTECTED-INTEGRATED (§9.1; candidate
                                          d6434e4597a178fde45faf74da0298fdb5755d37; merge
                                          f54d95abb0a8f7988626597a0eef01d0b0ae3c95, PR #14); bytes unedited
DEP-03                                  : CLOSED (§9.3)
CCA IMPLEMENTATION AUTHORIZATION        : GRANTED — IMPLEMENTATION WORK ONLY (§13; protected-integrated by PR #21,
                                          merge f1fd894b60b70e07143d474992ff8b3c5dd88fe1; see the next two rows;
                                          never quote this row alone)
CCA IMPLEMENTATION WORK                 : AUTHORIZED — permission to build conforming machinery implementing the
                                          exact accepted CCA, within CCA §50.1 scope (§13.3–§13.5)
CCA IMPLEMENTATION                      : NOT ACCEPTED — no CCA implementation exists (§13.3, §13.8)
CCA RUNTIME ACCEPTANCE                  : NOT PERFORMED
CCA AG-01…AG-16                         : OPEN FOR FUTURE IMPLEMENTATION ACCEPTANCE
CCA §48 ADVERSARIAL IMPLEMENTATION      : NOT YET EXECUTED
CCA §42–§45 ENFORCEMENT                 : NOT BUILT — NOT VERIFIED
CCA §46 FINDINGS                        : CLOSED AT SPECIFICATION LEVEL — implementation conformance NOT VERIFIED
B1S DESIGN                              : YES — MAY use the accepted S-2 non-grounding default (§9.7); Path A only
                                          with an accepted M7 ingestion integration contract (§10.9, §11.6, §12.9,
                                          §13.10, §14.11, §15.8, §16.9)
B2S DESIGN                              : per existing JBA / P-16 sequencing (§6, §7) — unchanged
B1 IMPLEMENTATION                       : NO
B2 IMPLEMENTATION                       : NO
C1 IMPLEMENTATION                       : NO
C2 IMPLEMENTATION                       : NO
AnalysisProtocol v1                     : UNFROZEN
P-16                                    : ACTIVE
```

This matrix records status established by §6, §7, §9, §10, §11, §12, §13, §14, §15 and §16.1–§16.11; it authorizes nothing beyond them. Relative to §15.11, it adds the `M7 S03 VBA-01`, VBA-01 scoped-reading, `VBA-*`, `M7-S01 REGENERATION REQUIRED BY VBA-01`, `VBA-S02-1`, `M7-S03 RESUME` and `M7-S03-VBCP` rows; renames the conformance-target row to `M7 NORMATIVE SQL CONFORMANCE TARGET` without changing its value; replaces the `M7-S01 ERRATUM 03 REGENERATION : REQUIRED — NOT PERFORMED` row with the re-accepted and integrated state; updates the implementation-staging row to `9cd2a61…`; renames the `SELECTOR ROTATION : NOT PERFORMED` row to `SELECTOR : NOT ASSERTED / NOT ROTATED`; adds `NOT ACTIVE` to the manifest row; and points the M7-S02, M7-S03, implementation/runtime and B1S rows at §16. It changes no Gate 1, Gate 2, `IMP-*`, `MA-*`, LC, manifest, machine-readable authority, selector, CCA, B, C, P-16 or deployment status.

## 17. M7 VBA-S02-1 PostgreSQL Version-Floor Clarification 01 (VFC-01) — ACCEPTED, PROTECTED-INTEGRATED (narrow clarification subordinate to VBA-01; no normative SQL delta) — root authority registration; current M7 authority state

This section records a lifecycle transition that has **already occurred**: the independent acceptance and the protected integration of the M7 VBA-S02-1 PostgreSQL Version-Floor Clarification 01 (**VFC-01**). It synchronizes this register with that fact, with the protected integration of the §16 entry, and with the implementation-staging events that followed §16 (the VBA-01 staging synchronization and the blocked first `VBA-S02-1` authoring attempt). It does **not** restate, amend or re-open VFC-01, VBA-01, Erratum 03, Erratum 02, Erratum 01 or M7 V1.1; it does **not** reproduce VFC-01's `VFC-*` rules, tables or evidence; it does **not** implement M7, regenerate M7-S01, author, re-author or implement `VBA-S02-1`, change the H03 harness check, modify M7-S02, resume M7-S03, create or execute an `M7-S03-VBCP`, modify implementation staging, author a manifest, publish machine-readable authority, create or modify `authority/`, or assert or rotate `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA`. Apart from the reading notes, annotations and pointer updates enumerated in §17.10, nothing in this section modifies §1, §2, §3, §3.1, §3.2, §9.1–§9.3, the §10.1 identity, §10.6 categories (b)–(e), the §10.7 Gate 2 list, §10.8, the Gate 1 grant of §11, §11.4, §12.1–§12.5, §12.8, §12.9, the CCA grant of §13.3–§13.10, §14.2–§14.4, §15.1–§15.3, §15.7, §15.8, §16.1–§16.3, §16.5, §16.8, §16.9, the B Semantic Ratification V1.3, JBA V1.9 or its Amendment 01, M7 V1.1, Erratum 01, Erratum 02, Erratum 03, VBA-01, VFC-01, the CCA, the A1 or A2 specifications, B1S/B2S ownership, S-2 Path A / Path B, **P-16**, or C1/C2 authority.

### 17.1 VFC-01 — independent acceptance and protected integration

**This entry's own status.** This entry is an **author candidate** for a root authority registration. It records **no** acceptance verdict, commit, PR or merge identity of its own, and MUST NOT be read as independently accepted or protected-integrated by virtue of its text. As with every prior entry in this register, it is authority only as recorded in this register at the protected integration surface following independent acceptance of the exact register bytes.

```
VFC-01 INDEPENDENT ACCEPTANCE          : PERFORMED
VFC-01 PROTECTED INTEGRATION           : PERFORMED (PR #35; merge 475752e894d8468407f1f45523b870d753ed1ecd)
VFC-01 ROOT AUTHORITY REGISTRATION     : PENDING UNTIL THIS §17 ENTRY IS
                                         INDEPENDENTLY ACCEPTED + PROTECTED-INTEGRATED
VFC-01 IMPLEMENTATION STAGING SYNC     : NOT PERFORMED (§17.4)
```

**Starting point.** Authored against the protected tip `origin/m3.5b-b-integration` = `475752e894d8468407f1f45523b870d753ed1ecd` (tree `ce7f6fd9d4d81c19e38de2eaf3c211a7581f4257`; parents, in order, 1. `aa2799a4d04c30afb585090536db3af38cfdd345` — 2. `0c973be5fcb45cb69aa5d91228fbab3ab9fbc5d8`; GitHub signature verification `valid`). The register blob replaced by this entry is `072b5b99bcfcebb94fbcda9a6f97ccf0c80099f8` (SHA-256 `21324e08dd407869cd13f5a661d55a90e8b9d0e809e78bb6b5ed7e13fac9cb36`). The rejected historical commit `a586b3119da2cc1aa4668485b129dbe625ab5cae` is not an ancestor of that tip.

**VBA-01 root authority registration — now protected-integrated** (this is the entry that wrote §16). Recorded from Git history as provenance only; no identity below is rewritten.

| Item | Value |
| :-- | :-- |
| Entry | VBA-01 root authority registration (§16) |
| Registration candidate commit | `70d15f0fb5943a4c9fcbddb4a8913f7383043d30` (*docs(authority): register M7 S03 VBA-01*) |
| Candidate sole parent (authoring baseline) | `b4ed5c97cbdfb0e7e031ae37653342192bd2fff2` (PR #32 merge) |
| Candidate tree | `5262c26a5fa0e089be1999469f472fac6b07670b` |
| `PAGAMENOS_SPEC_AUTHORITY.md` Git blob at the candidate and at the merge | `072b5b99bcfcebb94fbcda9a6f97ccf0c80099f8` (SHA-256 `21324e08dd407869cd13f5a661d55a90e8b9d0e809e78bb6b5ed7e13fac9cb36`) |
| Candidate-branch CI runs | `push` `35303992498` and `pull_request` `35304186514` — `verify` SUCCESS, `authority-gate` SUCCESS |
| PR | `#33` — *docs(authority): register M7 S03 VBA-01* |
| **Formal protected integration merge** | `aa2799a4d04c30afb585090536db3af38cfdd345` |
| Merge parents (in order) | 1. `b4ed5c97cbdfb0e7e031ae37653342192bd2fff2` — 2. `70d15f0fb5943a4c9fcbddb4a8913f7383043d30` |
| **Merge tree** | `5262c26a5fa0e089be1999469f472fac6b07670b` (identical to the candidate tree) |
| Paths changed by the merge relative to `b4ed5c9…` | exactly one: `PAGAMENOS_SPEC_AUTHORITY.md` |
| GitHub signature | signed GitHub merge commit (verification `valid`) |
| Post-merge `push` CI run on the protected surface | `35304307358` — `verify` SUCCESS, `authority-gate` SUCCESS |
| Protected integration surface | `origin/m3.5b-b-integration` (see §8.1) |

**Exact identities — VFC-01.**

| Item | Value |
| :-- | :-- |
| Artifact | `PAGAMENOS_M7_VBA_S02_1_POSTGRESQL_VERSION_FLOOR_CLARIFICATION_01.md` |
| Short identifier | `VFC-01` |
| Nature | narrow clarification subordinate to accepted VBA-01; documentation authority only; **not** an erratum; no normative SQL delta |
| **Status** | **ACCEPTED + PROTECTED-INTEGRATED** |
| Independent acceptance | **PERFORMED** — independent audit of the exact candidate; the verdict is held outside this register and binds the **exact artifact bytes** identified by the SHA-256 and Git blob below, and no other bytes |
| **Accepted clarification SHA-256** | `ae8dd03b57e199177610e3b40c221542d41aa1f78265b4dc5eee2d967c2ba8e7` |
| **Accepted clarification Git blob** | `7613c8a669bcaee9418a0e5f207192fdb5c45b75` |
| Size | 28,501 bytes; 476 LF-terminated lines |
| Accepted author candidate commit | `0c973be5fcb45cb69aa5d91228fbab3ab9fbc5d8` |
| Candidate sole parent (authoring baseline) | `aa2799a4d04c30afb585090536db3af38cfdd345` (PR #33 merge) |
| Candidate tree | `ce7f6fd9d4d81c19e38de2eaf3c211a7581f4257` |
| Candidate-branch `push` CI run | `35307847133` — `verify` SUCCESS, `authority-gate` SUCCESS |
| Integration PR | `#35` — *docs(m7): clarify VBA-S02-1 PostgreSQL version floor* |
| PR `pull_request` CI run | `35308061002` — `verify` SUCCESS, `authority-gate` SUCCESS |
| **Formal protected integration merge** | `475752e894d8468407f1f45523b870d753ed1ecd` |
| Merge parents (in order) | 1. `aa2799a4d04c30afb585090536db3af38cfdd345` — 2. `0c973be5fcb45cb69aa5d91228fbab3ab9fbc5d8` |
| **Merge tree** | `ce7f6fd9d4d81c19e38de2eaf3c211a7581f4257` (identical to the accepted candidate tree) |
| Paths changed by the merge relative to `aa2799a…` | exactly one, added: `PAGAMENOS_M7_VBA_S02_1_POSTGRESQL_VERSION_FLOOR_CLARIFICATION_01.md` |
| GitHub signature | signed GitHub merge commit (verification `valid`) |
| Post-merge required checks | run `35308174868` (`push`, head `475752e894d8468407f1f45523b870d753ed1ecd`): `verify` — SUCCESS; `authority-gate` — SUCCESS |
| Protected integration surface | `origin/m3.5b-b-integration` (see §8.1) |

**Accepted artifacts — unchanged by VFC-01 and by this entry.** Identical at `b4ed5c9…`, at `aa2799a…` and at `475752e…`:

| Artifact | Git blob | SHA-256 |
| :-- | :-- | :-- |
| `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1.md` (§10.1) | `06e103b0d5e8cfcbb96ab21134d5605b0aae9b26` | `457f51778fb5d5890b3e3478376e413072f15aef7da88125b5e78963f49394bd` |
| `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_01.md` (§12.1) | `15ee22090d3e37b6a63dd25914f8abb0f4fa9d4b` | `f381cb015adadc7a22463060da7ff55e8711b8ab13879c60f93cabf53eb863e8` |
| `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_02.md` (§14.2) | `a0e6fa6720f23ac08485ab7cb696ab9ba4b7e83f` | `b7b3440ad04181356770f243a6e2870e004aba604d2a62afdefd5330c85c170f` |
| `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_03.md` (§15.1) | `8ba87adc9b87cee749c214d9326b0aa750ceabf0` | `b4debcb5a02e777e780e14002c5e9cdbb90f2140f5b7516592b8e05e67366160` |
| `PAGAMENOS_A1_A2_M7_CONSENT_COMPATIBILITY_AMENDMENT_01.md` (§9.1, §13.2) | `2f0ff3c886c5ac9b1cbba797404e9024c0b83732` | `3a6003494f4817907401a9afda5b9d9a1647ade5ff9196f2aee2ba3b1b2ca1ad` |
| `PAGAMENOS_M7_S03_VERIFICATION_BOOTSTRAP_AMENDMENT_01.md` (§16.1) | `d10d59cac8f0d77304b88c6df0e06b89d710141d` | `dca045b62b245064926c1d4cb61c53f4f4f4110c22bcbf917a159e49ce3d1033` |

**What the checks establish.** As for §6.2, §10.1 and §12.1–§16.1: `verify` and `authority-gate` on `70d15f0…`, `aa2799a…`, `0c973be…` and `475752e…` establish **integration integrity of these documentation commits only**. They are not any §24.3 CI addition, manifest gate, real-PostgreSQL, real-provider or real-deployment verification, do not install or execute M7 SQL, do not exercise the H03 harness check, and do not instantiate an `M7-S03-VBCP`; they are not claimed to be.

### 17.2 Effective reading — normative SQL, VBA-01 and VFC-01 kept apart

```
M7 V1.1 BASE SPECIFICATION           : ACCEPTED — REMAINS THE ACCEPTED BASE (§10.1); BYTES NOT EDITED
ERRATA 01 / 02 / 03                  : ACCEPTED + PROTECTED-INTEGRATED — SCOPES UNCHANGED (§12, §14, §15.2); BYTES NOT EDITED
VBA-01                               : ACCEPTED + PROTECTED-INTEGRATED — CONTROLLING SCOPED VERIFICATION AND
                                       PROVISIONING CONTRACT (§16.2); NOT AN ERRATUM; BYTES NOT EDITED
VFC-01                               : ACCEPTED + PROTECTED-INTEGRATED — NARROW CLARIFICATION SUBORDINATE TO VBA-01;
                                       NOT AN ERRATUM; NO NORMATIVE SQL DELTA; BYTES NOT EDITED

A. M7 NORMATIVE SQL CONFORMANCE TARGET
                                     : M7 V1.1 + ACCEPTED ERRATUM 01 + ACCEPTED ERRATUM 02 + ACCEPTED ERRATUM 03
                                       (§15.2) — UNCHANGED BY VBA-01 AND BY VFC-01; F01–F26 AND M7-S01 PINS UNCHANGED
B. M7 INSTALL PROVISIONING / S03 VERIFICATION READING
                                     : M7 V1.1 + ACCEPTED ERRATA 01–03 + ACCEPTED VBA-01
                                       + ACCEPTED VFC-01 WITHIN ITS EXPRESSLY SCOPED CLARIFICATION
C. VFC-01 CONTROLS ONLY              : (i)   THE POSTGRESQL VERSION FLOOR FOR VBA-S02-1;
                                       (ii)  THE CORRESPONDING M7-S03 VERIFICATION REALIZATION;
                                       (iii) THE NARROWLY AUTHORIZED H03 THRESHOLD / EARLY-TERMINATION CONSEQUENCE
```

- **Layer A — normative SQL.** Neither VBA-01 nor VFC-01 changes any normative SQL occurrence, fragment F01–F26, accepted M7-S01 pin or V1.1 §19.14 count, and neither changes the M7 normative-SQL conformance target of §15.2 (VBA-01 §13; VFC-01 `VFC-SQL-1`).
- **Layer B — VBA-01.** VBA-01 remains the **controlling** scoped verification/provisioning contract for M7 installation-time provisioning and M7-S03 verification/bootstrap orchestration (§16.2; header reading rule, item (8d)). Every VBA-01 clause continues to control within its own scope.
- **Layer C — VFC-01.** VFC-01 is a **subordinate, narrowly scoped clarification** of VBA-01 (`VFC-REL-1`; header reading rule, item (8e)). It resolves the version phrase of VBA-01 §14 item 1 and creates one expressly enumerated exception to VBA-01 §14 item 3; outside those points VBA-01 controls, and an apparent conflict is a defect of VFC-01, not a matter for interpretation (VFC-01 §4). VFC-01 MUST NOT be presented as an **erratum**, as **normative-SQL authority**, as **global PostgreSQL-support authority**, or as **production/deployment compatibility authority**.
- **VFC-01 is the sole authority for its clauses.** This register records only the existence and subjects of the `VFC-*` clauses (§17.3); it does not restate them, and any paraphrase here yields to the accepted VFC-01 text.
- **Gate 1 unchanged.** VFC-01 does **not** revoke, narrow, re-grant or re-condition the §11 Gate 1 authorization; `M7 GATE 1: AUTHORIZED`.
- **Authored status statements resolved by events, not edits.** The integrated clarification still carries its authored header (`AUTHOR CANDIDATE — NOT YET AUTHORITATIVE`, `NOT SELF-ACCEPTED — AWAITING INDEPENDENT AUDIT`, `M7-S03 REMAINS BLOCKED`) and its §19 author-side status block (`INDEPENDENT ACCEPTANCE : NOT PERFORMED`, `PROTECTED INTEGRATION : NOT PERFORMED`, `ROOT AUTHORITY REGISTRATION : NOT PERFORMED`, `IMPLEMENTATION STAGING SYNCHRONIZATION : NOT PERFORMED`, `PAGAMENOS_SPEC_AUTHORITY.md : NOT MODIFIED`). Those statements were correct when authored. As with VBA-01 (§16.2), `INDEPENDENT ACCEPTANCE` and `PROTECTED INTEGRATION` are resolved externally by the independent acceptance and the PR #35 merge recorded in §17.1; the file is deliberately **not** modified, because any byte change would break the exact-byte binding. `ROOT AUTHORITY REGISTRATION` is addressed by this entry and is resolved only when this entry is itself independently accepted and protected-integrated (§17.1). `IMPLEMENTATION STAGING SYNCHRONIZATION : NOT PERFORMED` remains **true** (§17.4). Its statements about **other** things — no normative SQL changed, IA-08 unchanged, M7-S01 regeneration not required, candidate `7e82121b…` blocked and not accepted, no rework authorized by the document's existence, M7-S03 blocked and resume not authorized, no lifecycle advancement, machine-readable authority not published, selector not asserted or rotated, deployment and Wave 0 not authorized — remain **true** and are reaffirmed by §17.5–§17.9.

### 17.3 Scope of VFC-01 — registered, not restated

VFC-01 is the **sole** authority for the precise semantics of every `VFC-*` clause (VFC-01 §4–§18). This register records only the clause families and their subjects:

| Family (VFC-01 section) | Subject |
| :-- | :-- |
| `VFC-REL-1` (§4) | subordination to VBA-01; the enumerated points VFC-01 resolves; VBA-01 controls on any other apparent conflict |
| `VFC-SC-1` / `VFC-SC-2` (§5) | scope of the version floor (the `VBA-S02-1` harness realization and M7-S03 verification relying on it); the floor as a verification-harness precondition only |
| `VFC-PG-1` (§6) | verification-harness PostgreSQL version floor; observed server version; refusal before provisioning; no upper bound added |
| `VFC-PG15-1` (§7) | PostgreSQL 15 disposition within the VFC-01 scope; VBA-01 §3.4 characterization preserved |
| `VFC-PG16-1` (§8) | PostgreSQL ≥ 16 realization — reaffirmed, not replaced |
| `VFC-H03-1` (§9) | narrow authorization of the H03 version-floor change and of termination through the existing early-termination path |
| `VFC-H03-2` (§10) | required fail-closed behavior below the floor |
| `VFC-IA08-1` (§11) | relationship to IA-08 and to broader M7 version semantics |
| `VFC-CD-1` (§12) | disposition of the existing `VBA-S02-1` implementation candidate (provenance only) |
| `VFC-SCOPE-1` (§13) | resulting permitted `VBA-S02-1` implementation scope |
| `VFC-LC-1` (§14) | no automatic implementation authorization; transitions required before rework |
| `VFC-SQL-1` (§15) | no normative SQL consequence |
| `VFC-LC-2` (§16) | no lifecycle advancement |
| §17, `VFC-AC-1 … VFC-AC-10` (§17–§18) | explicit non-authorizations; acceptance criteria |

**PostgreSQL version semantics — registered reading.**

```
VBA-S02-1 / VBA-01 VERIFICATION FLOOR      : PostgreSQL >= 16 — ONLY IN THE VFC-01 SCOPE (VFC-SC-1, VFC-PG-1)
IA-08                                      : UNCHANGED IN ITS OWN SCOPE (VFC-IA08-1); ITS SQL IS NOT CHANGED
PostgreSQL 15 UNDER VBA-01 §3.4            : DOCUMENTED-SEMANTICS REALIZATION ONLY — UNVERIFIED — NOT CANONICAL
PostgreSQL 15 WITHIN THE VFC-01 SCOPE      : OUT OF SCOPE FOR VBA-S02-1 AND FOR M7-S03 VERIFICATION UNDER THAT
                                             REALIZATION, UNTIL SEPARATELY AUTHORIZED AND EMPIRICALLY DEMONSTRATED
                                             (VFC-PG15-1)
GLOBAL / PRODUCT POSTGRESQL VERSION FLOOR  : NONE ASSERTED — NOT BY THIS REGISTER, NOT BY VBA-01, NOT BY VFC-01
```

The ≥ 16 floor is a verification-harness precondition for the `VBA-S02-1` / VBA-01 verification realization only. It is **not** a statement about product, deployment, production-provisioning or runtime PostgreSQL support, and it does not modify IA-08 or any PostgreSQL-version statement of V1.1, the errata, the CCA or VBA-01 (`VFC-SC-2`, `VFC-IA08-1`).

**H03 — scoped authority consequence.**

```
H03 MINIMUM server_version_num (VBA-S02-1)  : 150000 -> 160000 — EXPRESSLY PERMITTED (VFC-H03-1)
NON-PASS H03                                 : MUST TERMINATE BEFORE ROLE PROVISIONING, THROUGH THE HARNESS'S EXISTING
                                               EARLY-TERMINATION PATH (VFC-H03-1 item 2; VFC-H03-2)
IMPLEMENTED BY THIS ENTRY                    : NO — NO HARNESS, TEMPLATE, TESTKIT OR TEST IS MODIFIED
```

This consequence is authority for a future, separately authorized `VBA-S02-1` only (§17.6); it is recorded here, not implemented here.

**Registered effect.** VFC-01 adds no table, enum, function, signature, trigger, constraint, index, view, role, grant, lock, T-ID, `IMP-*` / `MA-*` item or `VBA-*` rule; changes no normative SQL, IA-* rule or `M7-S03-VBCP` rule; authorizes no manifest, LC event, machine-readable authority, selector rotation, deployment or Wave 0; and authorizes neither `VBA-S02-1` rework nor the resumption of M7-S03 (VFC-01 §14–§17). This entry adds no rule of its own.

### 17.4 M7 implementation-line status — recorded as provenance

The events below occurred on the implementation staging branch `origin/m7-v1.1-implementation`, or were produced against it, after the §16 entry was authored. That branch is **not** a protected authority surface; the identities are recorded **from Git history as provenance only**, any independent verdicts are held outside this register and are not restated here, and nothing in this subsection makes any slice artifact register authority, adds a §2 row, or constitutes LC-1 or Gate-2 acceptance.

**VBA-01 authority → implementation staging synchronization (PR #34).**

| Item | Value |
| :-- | :-- |
| Candidate commit | `d16397e9d1881d4281ce74b9fb18f8f7ad83846f` (*chore(m7): sync VBA-01 authority into implementation staging*; parents 1. `9cd2a61939d3e0ee6cf47ddcc9198b6c570974b0` — 2. `aa2799a4d04c30afb585090536db3af38cfdd345`) |
| Candidate tree | `3550705824eca90da74ddf665cc5f99939011710` |
| Candidate-branch CI runs | `push` `35305175739` and `pull_request` `35305394183` — `verify` SUCCESS, `authority-gate` SUCCESS |
| Staging integration PR | `#34` |
| Staging integration merge | `2cc15773c12bd2c3d5f2826a738fcc620c9cb609` (parents 1. `9cd2a61939d3e0ee6cf47ddcc9198b6c570974b0` — 2. `d16397e9d1881d4281ce74b9fb18f8f7ad83846f`; tree `3550705824eca90da74ddf665cc5f99939011710`; signed GitHub merge commit) |
| Paths changed by the merge relative to parent 1 | exactly two: `PAGAMENOS_M7_S03_VERIFICATION_BOOTSTRAP_AMENDMENT_01.md` (added; blob `d10d59c…`), `PAGAMENOS_SPEC_AUTHORITY.md` (modified; blob `072b5b9…`) |
| Post-merge `push` CI run | `35305556086` — `verify` SUCCESS, `authority-gate` SUCCESS |

The current staging history includes, in order, the Erratum 03 authority synchronization (PR #30, merge `adeb36b…`; §16.4), the M7-S01 Erratum 03 regeneration (PR #31, merge `9cd2a61…`; §16.4) and the VBA-01 authority synchronization above (PR #34).

```
IMPLEMENTATION STAGING TIP        : origin/m7-v1.1-implementation = 2cc15773c12bd2c3d5f2826a738fcc620c9cb609
                                    (tree 3550705824eca90da74ddf665cc5f99939011710; PR #34)
CONTAINS PR #33 MERGE aa2799a…    : YES (through PR #34)
CONTAINS VBA-01                   : YES (blob d10d59cac8f0d77304b88c6df0e06b89d710141d)
CONTAINS VFC-01                   : NO — PR #35 merge 475752e… is not synchronized into implementation staging
CONTAINS THIS §17 ROOT ENTRY      : NO
```

VFC-01 is **not** synchronized into implementation staging. That synchronization is a separate, future transition (§17.7, item 8); this entry does not perform it.

**First `VBA-S02-1` authoring attempt — blocked (provenance only).**

| Item | Value |
| :-- | :-- |
| Local branch | `m7-vba-s02-1-provisioning-compat` |
| Candidate commit | `7e82121b5abe7e649a2286025508ca0f115cf97a` (*fix(m7): align S02 provisioning with VBA-PV-1*) |
| Candidate tree | `4ac96bb8cd3af5f64be38f03024f291a8890ca0a` |
| Sole parent | `2cc15773c12bd2c3d5f2826a738fcc620c9cb609` |

```
VBA-S02-1 candidate 7e82121b5abe7e649a2286025508ca0f115cf97a =
  AUTHOR CANDIDATE
  INDEPENDENT AUDIT BLOCKED
  NOT ACCEPTED
  NOT PUSHED
  NOT INTEGRATED
```

**Reason.** A PostgreSQL version-floor authority mismatch was discovered: the candidate realized the ≥ 16 provisioning grant while the harness H03 check still admitted PostgreSQL 15, and the then-controlling authority did not authorize changing H03 (VFC-01 §3, `VFC-CD-1`). VFC-01 is the clarification of that mismatch. The candidate is **not** authority, is **not** accepted by this entry, and MUST NOT be reused as an implementation baseline; future acceptance of `VBA-S02-1` is not bound to its commit, tree or diff (`VFC-CD-1`).

### 17.5 M7-S01 — unchanged; no regeneration required by VBA-01 or VFC-01

```
M7-S01 ERRATUM 03 REGENERATION (PR #31)         : ACCEPTED + INTEGRATED — CURRENT CONFORMANCE ARTIFACT SET
                                                  (merge 9cd2a61939d3e0ee6cf47ddcc9198b6c570974b0; §16.5, unchanged)
S01 REGENERATION REQUIRED BY VBA-01             : NO
S01 REGENERATION REQUIRED BY VFC-01             : NO
```

- **Pins unchanged** (provenance; Erratum 03 §10 remains the authority for the regeneration requirements): F01 `f75c45ab8110c3fe5bce5379e77a08a51bc2e3d0561e887310d9c9361d02a6be`; F11 `c9f5777fcc699fd9411427e4b17fd3f28258068f925bbb8fcbe3a935fbec75a9`; F24 `f68eeea9d1f6a3b192b64163949385d89cd0b0fa369b168d8160d3eaa7006fff`.
- The earlier M7-S01 rows of §16.5 (pre-Erratum-02 extraction; Erratum 02 regeneration) are unchanged. This entry performs no regeneration and modifies no M7-S01 artifact.

### 17.6 M7-S02 and `VBA-S02-1` — acceptance preserved; re-authoring not yet authorized

```
M7-S02                    : ACCEPTED + INTEGRATED INFRASTRUCTURE — ACCEPTANCE PRESERVED, NOT REJECTED
VBA-S02-1                 : REQUIRED DOWNSTREAM WORK PACKAGE (VBA-01 §14, as clarified by VFC-01)
                            — NOT ACCEPTED / NOT INTEGRATED
VBA-S02-1 CANDIDATE
7e82121b…                 : AUTHOR CANDIDATE — INDEPENDENT AUDIT BLOCKED — NOT ACCEPTED — NOT PUSHED — NOT INTEGRATED
                            — NOT AUTHORITY — NOT AN IMPLEMENTATION BASELINE (§17.4)
VBA-S02-1 RE-AUTHORING    : NOT YET AUTHORIZED
REASON                    : VFC-01 ROOT REGISTRATION AND AUTHORITY → IMPLEMENTATION STAGING SYNC NOT YET COMPLETE
```

- **M7-S02.** VFC-01 does **not** revoke M7-S02's infrastructure acceptance; M7-S02 is **not** rejected. The provisioning compatibility gap recorded in §16.6 remains a downstream implementation issue, to be resolved by an eventual accepted `VBA-S02-1`. M7-S02 acceptance remains infrastructure acceptance only: it is not LC-1 and satisfies no `IMP-*`, `MA-*` or Gate-2 item.
- **Critical authorization boundary.**

  ```
  VFC-01 EXISTENCE ALONE:
  DOES NOT AUTHORIZE IMPLEMENTATION REWORK.
  ```

  Even after this §17 entry is independently accepted and protected-integrated, `VBA-S02-1` re-authoring remains blocked until VFC-01 authority (with the resulting root register) is separately synchronized into `origin/m7-v1.1-implementation`, and until a separate implementation authorization is given (`VFC-LC-1`; §17.7 items 7–9).
- **Scope once authorized.** VBA-01 §14 read with VFC-01 (`VFC-SCOPE-1`) is the **sole** authority for the permitted `VBA-S02-1` scope. This entry does not authorize, author, re-author, accept or integrate `VBA-S02-1`, and does not modify M7-S02.
- **History is not rewritten.** §16.6 correctly recorded, at PR #33, `VBA-S02-1 : … NOT AUTHORIZED BY THIS ROOT SYNC / NOT AUTHORED / NOT ACCEPTED / NOT INTEGRATED`. That was true then and is preserved as historical; the current state is this subsection.

### 17.7 M7-S03 — BLOCKED; prerequisites before resume

```
M7-S03: BLOCKED
M7-S03 RESUME: NOT AUTHORIZED
```

**Reason.** The M7-S03 install requires a provisioning that satisfies `VBA-PV-1`, which the currently instantiated M7-S02 provisioning does not (§16.6); `VBA-S02-1` is not accepted, its first candidate is blocked (§17.4), and VFC-01 is neither root-registered nor synchronized into implementation staging. This entry does **not**, by existing, authorize M7-S03, and does **not** authorize `VBA-S02-1` re-authoring.

**M7-S03 MAY resume only after all of the following, in this order** (the §16.7 list is superseded by this list and preserved as historical):

| # | Prerequisite | State |
| :-- | :-- | :-- |
| 1 | VBA-01 independently accepted | **DONE** (§16.1) |
| 2 | VBA-01 protected-integrated | **DONE** (PR #32, merge `b4ed5c9…`; §16.1) |
| 3 | VBA-01 root authority registration (§16) independently accepted and protected-integrated | **DONE** (PR #33, merge `aa2799a…`; §17.1) |
| 4 | VBA-01 authority synchronized into implementation staging | **DONE** (PR #34, merge `2cc15773…`; §17.4) |
| 5 | VFC-01 independently accepted | **DONE** (§17.1) |
| 6 | VFC-01 protected-integrated | **DONE** (PR #35, merge `475752e8…`; §17.1) |
| 7 | this VFC-01 root authority registration (§17) independently accepted and protected-integrated | PENDING |
| 8 | implementation staging (`origin/m7-v1.1-implementation`) synchronized with the resulting VFC-01 / root authority baseline, by its own separate transition | PENDING |
| 9 | `VBA-S02-1` re-authoring separately authorized | PENDING |
| 10 | `VBA-S02-1` authored | PENDING |
| 11 | `VBA-S02-1` independently accepted | PENDING |
| 12 | `VBA-S02-1` integrated into implementation staging | PENDING |
| 13 | a subsequent, separate implementation-line authorization to resume M7-S03 | PENDING |

No step is collapsed into another, and none is satisfied by the registration of VFC-01 alone. These prerequisites are cumulative with, and no weaker than, Erratum 03 §11, VBA-01 §14–§16 and VFC-01 §14. Satisfying them makes resumption **permissible**; it does not schedule or start M7-S03. A resumed M7-S03 MUST install the corrected text of §15.2 without patching normative SQL, MUST satisfy the VBA-01 contract as clarified by VFC-01 within its scope, and MUST stop and report any further defect.

### 17.8 Control plane, manifest and lifecycle isolation — unchanged

**None of the following changes status, and this entry performs none of the events it names.**

```
M7 GATE 1                                    : AUTHORIZED — implementation work only (§11; unchanged, not revoked)
M7 GATE 2                                    : OPEN / NOT SATISFIED (§11.4, §12.6; unchanged)
M7-S03                                       : BLOCKED
M7-S03 RESUME                                : NOT AUTHORIZED
REVIEWED PRODUCTION MANIFEST                 : NOT AUTHORED / NOT ACTIVE
M7-S03-VBCP                                  : VERIFICATION FIXTURE CONTRACT ONLY (VBA-01)
                                               NOT PRODUCTION MANIFEST
                                               NOT YET EXECUTED AS ACCEPTED S03 EVIDENCE
LC-1 … LC-7                                  : NOT OCCURRED
IMP-01 … IMP-22                              : OPEN — none satisfied by VBA-01, VFC-01 or this entry
MA-1 … MA-18                                 : OPEN — none satisfied by VBA-01, VFC-01 or this entry
§24.3 CI ADDITIONS                           : OPEN
REAL-PROVIDER / REAL-DEPLOYMENT VERIFICATION : NOT PERFORMED
MACHINE-READABLE AUTHORITY                   : NOT PUBLISHED — UNCHANGED
PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA        : NOT ASSERTED
SELECTOR                                     : NOT ASSERTED / NOT ROTATED
DEPLOYMENT / WAVE 0                          : NOT AUTHORIZED
CCA IMPLEMENTATION WORK                      : AUTHORIZED (§13.3; unchanged)
CCA IMPLEMENTATION                           : NOT ACCEPTED (§13.8; unchanged)
```

No implementation or runtime acceptance has occurred. The acceptance of VFC-01, its protected integration and this entry each satisfy **no** `IMP-*`, `MA-*` or Gate-2 requirement and constitute **no** lifecycle event.

The two-authority architecture of §2.4, §10.8, §11.5, §12.8, §13.9, §14.9, §15.7 and §16.8 is unchanged. This entry changes **documentation authority only**: `authority/` is absent from this documentation lineage (`git ls-tree -r HEAD authority/` is empty at `475752e…`) and is neither created nor modified by VFC-01 or by this entry; no machine-readable authority is published; this entry does **not** know, infer, invent, obtain, default or rotate the external selector, does **not** assert `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA`, creates no manifest and rotates nothing.

This entry does **not** modify `origin/m7-v1.1-implementation`, does not merge protected authority into it, and does not edit `scripts/m7/` (including the harness and its H03 check), `src/m7/`, `prisma/m7/normative/`, `package.json` or `pnpm-lock.yaml`.

### 17.9 B, C, P-16, CCA and deployment — unchanged; no leakage

VFC-01 and this entry are M7-scoped documentation authority. They do **not** change the B Semantic Ratification V1.3, JBA V1.9, JBA Amendment 01, B1S/B2S ownership (§7), the S-2 Path A / Path B rules (§9.7, §10.9), the CCA specification or its implementation-work grant (§13), `CCA IMPLEMENTATION: NOT ACCEPTED`, **P-16**, C1/C2 status, `AnalysisProtocol v1` (unfrozen) or deployment status. **VFC-01 is not an M7 ingestion integration contract** for Path A (§10.9, §11.6, §12.9, §13.10, §14.11, §15.8, §16.9); B1S Path A remains available only with an accepted M7 ingestion integration contract.

### 17.10 Synchronization of earlier register text — provenance preserved

No earlier entry is silently rewritten. The following edits accompany this entry; each preserves the prior wording or marks it historical, and none changes any status other than the recorded M7 authority reading, the recorded state of implementation staging and of `VBA-S02-1`, and the M7-S03 prerequisite list:

| Location | Treatment |
| :-- | :-- |
| Header — "Latest authority progression" | PR #33 integration and VFC-01 (§17) appended; prior text unchanged |
| Header — "Protected authority surface" | PR #33 and PR #35 merges appended; latest-integration sentence updated, with its PR #33 wording preserved in an annotation; "the §17 entry is not part of this history" replaces the corresponding §16 sentence, which is preserved in that annotation |
| Header — controlling M7 specification line | VFC-01 scoped reading added; M7-S01 / `VBA-S02-1` / M7-S03 status and section references updated, with the PR #33 wording preserved in an annotation; the normative-SQL conformance target is unchanged |
| Header — reading rule | item (8e) added for VFC-01; range references "(7)–(8d)" / "(1)–(8d)" → "(7)–(8e)" / "(1)–(8e)"; slice-artifact reference "(§14.6, §15.4, §16.4)" → "(§14.6, §15.4, §16.4, §17.4)" |
| §6 | VBA-01 bullet's M7-S01 / M7-S02 / `VBA-S02-1` / M7-S03 / `M7-S03-VBCP` status sentence moved to a new VFC-01 bullet, with the PR #33 wording preserved in an annotation; "Not authorized" list adds §17.6 / §17.7 / §17.8 references, `VBA-S02-1` re-authoring, candidate `7e82121b…` and mis-readings of VFC-01, with its PR #33 wording preserved in an annotation |
| §9.8, §10.10, §11.7, §12.11, §13.13, §14.14, §15.11 headings; §9.8 closing note; §11, §12 and §13 reading notes | navigation pointer "current matrix §16.12" / "the current matrix is §16.12" → "§17.12" only |
| §10 | reading note added (VFC-01 scoped reading; §10.1 identity unchanged; IA-08 unchanged) |
| §14 and §15 reading notes | one annotation each: the current slice, `VBA-S02-1`, M7-S03 and matrix statements are now §17.4–§17.8 and §17.12 |
| §15 heading | navigation pointer "the current M7 authority state is §16" → "§17" only |
| §16 | heading annotated ("current at PR #33"); reading note added (PR #33 integration; PR #34 staging synchronization; blocked `VBA-S02-1` candidate; VFC-01; current-state statements of §16.1 own status, §16.4 staging block, §16.6 `VBA-S02-1` row, §16.7 prerequisite list and §16.12 historical); §16.12 heading annotated and matrix tagged `[HISTORICAL — as recorded at PR #33 …]`; every row preserved verbatim |

### 17.11 What this entry changes

This entry changes exactly one file, this register. It changes no specification, amendment or clarification artifact — in particular not `PAGAMENOS_M7_VBA_S02_1_POSTGRESQL_VERSION_FLOOR_CLARIFICATION_01.md`, `PAGAMENOS_M7_S03_VERIFICATION_BOOTSTRAP_AMENDMENT_01.md`, `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1.md`, `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_01.md`, `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_02.md`, `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_03.md`, `PAGAMENOS_A1_A2_M7_CONSENT_COMPATIBILITY_AMENDMENT_01.md`, the A1 or A2 specifications, JBA V1.9 or its Amendment 01, or the B Semantic Ratification V1.3 — and no runtime source, Prisma schema, migration, test, package file, M7-S01, M7-S02, `VBA-S02-1` or M7-S03 artifact, harness check, `.github/` workflow, `scripts-trusted/` file, `authority/` artifact, implementation staging branch, repository configuration or external repository variable.

### 17.12 Current authorization matrix

```
M7 EFFECTIVE SPEC V1                    : BLOCKED / NON-AUTHORITATIVE
M7 V1.1 BASE SPEC                       : ACCEPTED — SPECIFICATION ACCEPTANCE DONE, PROTECTED INTEGRATION DONE
                                          (merge f99a7e3080fdb99bd3917820d889d09694bed4af, PR #16); bytes unedited
M7 ERRATUM 01                           : ACCEPTED + PROTECTED-INTEGRATED — clause-scoped
                                          (candidate 16e232330c86c92285804eb55ecb18d7f3cdf309;
                                           merge 3ef0b3ad0fb02cba84a60d0529fe054427b9f68c, PR #19); bytes unedited
M7 ERRATUM 02                           : ACCEPTED + PROTECTED-INTEGRATED — occurrence-scoped, E02-01…E02-09 only
                                          (candidate f9d5591e16906a176f9a5f019f42312f502f9da4;
                                           merge b8df77538671b957b03294fee0fae40929d29bd3, PR #24;
                                           blob a0e6fa6720f23ac08485ab7cb696ab9ba4b7e83f;
                                           SHA-256 b7b3440ad04181356770f243a6e2870e004aba604d2a62afdefd5330c85c170f)
M7 ERRATUM 03                           : ACCEPTED + PROTECTED-INTEGRATED — occurrence-scoped, E03-01…E03-09 only
                                          (fourteen occurrences)
                                          (candidate df6b4b0f9c71e5286d8925ad20cbb3fcc6b14eff;
                                           merge 6115b843c709bbfb1d169df27bc4e3db7e0f2b8a, PR #28;
                                           blob 8ba87adc9b87cee749c214d9326b0aa750ceabf0;
                                           SHA-256 b4debcb5a02e777e780e14002c5e9cdbb90f2140f5b7516592b8e05e67366160)
M7 S03 VBA-01                           : ACCEPTED + PROTECTED-INTEGRATED + ROOT-REGISTERED — verification and
                                          provisioning contract; no normative SQL delta
                                          (candidate dc6f1dfb16c3faa59dae29d6888987c8aea79bc8;
                                           merge b4ed5c97cbdfb0e7e031ae37653342192bd2fff2, PR #32;
                                           blob d10d59cac8f0d77304b88c6df0e06b89d710141d;
                                           SHA-256 dca045b62b245064926c1d4cb61c53f4f4f4110c22bcbf917a159e49ce3d1033;
                                           root registration §16, merge aa2799a4d04c30afb585090536db3af38cfdd345,
                                           PR #33); synchronized into implementation staging (PR #34)
VFC-01                                  : ACCEPTED + PROTECTED-INTEGRATED — NARROW VBA-01 CLARIFICATION —
                                          NO NORMATIVE SQL DELTA — ROOT REGISTRATION PENDING UNTIL THIS ENTRY (§17)
                                          IS ACCEPTED + INTEGRATED — NOT SYNCHRONIZED INTO IMPLEMENTATION STAGING
                                          (candidate 0c973be5fcb45cb69aa5d91228fbab3ab9fbc5d8;
                                           merge 475752e894d8468407f1f45523b870d753ed1ecd, PR #35;
                                           blob 7613c8a669bcaee9418a0e5f207192fdb5c45b75;
                                           SHA-256 ae8dd03b57e199177610e3b40c221542d41aa1f78265b4dc5eee2d967c2ba8e7)
VFC-*                                   : INCORPORATED ACCORDING TO VFC-01 — scoped clarification only; 0 SQL
                                          occurrences; VFC-01 is sole authority for their semantics (§17.3)
M7 SPECIFICATION READING                : M7 V1.1 + ACCEPTED ERRATUM 01 (for the clauses Erratum 01 amends)
                                          + ACCEPTED ERRATUM 02 (for the nine occurrences Erratum 02 enumerates)
                                          + ACCEPTED ERRATUM 03 (for the fourteen occurrences Erratum 03 enumerates);
                                          VBA-01 and VFC-01 are scoped supplements, not specification errata (§17.2)
M7 NORMATIVE SQL CONFORMANCE TARGET     : M7 V1.1 + ACCEPTED ERRATUM 01 + ACCEPTED ERRATUM 02 + ACCEPTED ERRATUM 03 (§15.2)
                                          — UNCHANGED BY VBA-01 AND BY VFC-01
M7 INSTALL PROVISIONING / S03
VERIFICATION READING                    : M7 V1.1 + ACCEPTED ERRATA 01–03 + ACCEPTED VBA-01 + ACCEPTED VFC-01
                                          WITHIN ITS EXPRESSLY SCOPED CLARIFICATION (§17.2)
VBA-S02-1 VERIFICATION POSTGRESQL FLOOR : PostgreSQL >= 16 — VFC-01 SCOPE ONLY (VFC-SC-1, VFC-PG-1; §17.3)
IA-08                                   : UNCHANGED IN ITS OWN SCOPE (VFC-IA08-1)
PostgreSQL 15 UNDER VBA-01 §3.4         : DOCUMENTED-SEMANTICS REALIZATION ONLY — UNVERIFIED — NOT CANONICAL
GLOBAL POSTGRESQL VERSION FLOOR         : NONE ASSERTED
H03 (VBA-S02-1)                         : 150000 -> 160000 AND TERMINATION BEFORE ROLE PROVISIONING EXPRESSLY
                                          PERMITTED BY VFC-01 — NOT IMPLEMENTED (§17.3)
ER-01…ER-05                             : INCORPORATED ACCORDING TO ERRATUM 01
E02-01…E02-09                           : INCORPORATED ACCORDING TO ERRATUM 02 — 9 occurrences in F09, F11, F17,
                                          F23, F26; 21 / 26 fragments unaffected
E03-01…E03-09                           : INCORPORATED ACCORDING TO ERRATUM 03 — 14 occurrences (classes E03-A…E03-I);
                                          normative SQL in F01, F11, F24; 23 / 26 fragments unaffected
VBA-*                                   : INCORPORATED ACCORDING TO VBA-01 — scoped contract only; 0 SQL occurrences
D-13                                    : DOWNSTREAM IMPLEMENTATION / CONTROL-PLANE COMPATIBILITY MATTER
D-06                                    : CLASSIFICATION ONLY — SERVER_MEDIATED CONFORMING; PRESIGNED_PUT UNAVAILABLE
M7 IMPLEMENTATION AUTHORIZED            : YES — GATE 1 ONLY (see the next two rows; never quote this row alone)
M7 IMPLEMENTATION WORK                  : AUTHORIZED — GATE 1 (§11; not revoked by Erratum 01, Erratum 02, Erratum 03,
                                          VBA-01 or VFC-01); candidates MUST conform to M7 V1.1 + accepted Erratum 01 +
                                          accepted Erratum 02 + accepted Erratum 03 (§15.2) and, within their scopes,
                                          to accepted VBA-01 (§16.2) as clarified by accepted VFC-01 (§17.2)
M7 IMPLEMENTATION / RUNTIME             : NOT ACCEPTED — GATE 2 OPEN / NOT SATISFIED; no completed implementation
                                          candidate exists (§11.4, §17.8)
M7 IMPLEMENTATION STAGING               : tip 2cc15773c12bd2c3d5f2826a738fcc620c9cb609 (tree
                                          3550705824eca90da74ddf665cc5f99939011710; PR #34; not an authority surface);
                                          CONTAINS VBA-01: YES; CONTAINS VFC-01: NO; CONTAINS THIS §17 ENTRY: NO (§17.4)
M7-S01 (PRE-ERRATUM-02 EXTRACTION)      : HISTORICALLY ACCEPTED — SUPERSEDED; integrated in staging (merge
                                          742bfffa0aaee4e92743ca5d9d6432affbe22e62, PR #22); not rejected (§14.6)
M7-S01 (ERRATUM 02 REGENERATION)        : INDEPENDENTLY RE-ACCEPTED / INTEGRATED IN STAGING BEFORE ERRATUM 03
                                          (candidate 60781eb599f7a385e18174adb8d0da0faf833000; merge
                                          dd5fc7278ac4fc0607aeae1fc885bb46c181968e, PR #27) — SUPERSEDED FOR
                                          ERRATUM 03 CONFORMANCE; not rejected (§15.5)
M7-S01 E03                              : ACCEPTED + INTEGRATED — CURRENT CONFORMANCE ARTIFACT SET
                                          (candidate 46c3fd5eda9f5b60f3116c256e610ffae158b017;
                                          merge 9cd2a61939d3e0ee6cf47ddcc9198b6c570974b0, PR #31); pins F01
                                          f75c45ab…, F11 c9f5777f…, F24 f68eeea9… (§16.5, §17.5)
M7-S01 REGENERATION REQUIRED BY VBA-01  : NO (§16.5)
M7-S01 REGENERATION REQUIRED BY VFC-01  : NO (§17.5)
M7-S02                                  : ACCEPTED + INTEGRATED INFRASTRUCTURE — ACCEPTANCE PRESERVED, NOT REJECTED
                                          (merge 14d846abb749c4bb27a9868eb0913acd343cb64e, PR #23; §14.6, §17.6)
VBA-S02-1                               : REQUIRED DOWNSTREAM — NOT ACCEPTED / NOT INTEGRATED (§17.6)
VBA-S02-1 candidate 7e82121b            : AUTHOR CANDIDATE — INDEPENDENT AUDIT BLOCKED — NOT ACCEPTED — NOT PUSHED —
                                          NOT INTEGRATED — NOT AUTHORITY — NOT AN IMPLEMENTATION BASELINE
                                          (7e82121b5abe7e649a2286025508ca0f115cf97a; §17.4)
VBA-S02-1 RE-AUTHORING                  : NOT YET AUTHORIZED — VFC-01 ROOT REGISTRATION AND AUTHORITY →
                                          IMPLEMENTATION STAGING SYNC NOT YET COMPLETE (§17.6, §17.7)
M7-S03                                  : BLOCKED (§17.7)
M7-S03 RESUME                           : NOT AUTHORIZED — prerequisites §17.7
M7-S03-VBCP                             : VERIFICATION FIXTURE CONTRACT ONLY — NOT PRODUCTION MANIFEST — NOT YET
                                          EXECUTED AS ACCEPTED S03 EVIDENCE (§17.8)
IMP-01…IMP-22                           : OPEN
MA-1…MA-18                              : OPEN
§24.3 CI ADDITIONS                      : OPEN — none exists
LC-1…LC-7                               : NOT OCCURRED (§12.5)
M7 CONTROL-PLANE / PRODUCTION MANIFEST  : NOT AUTHORED / NOT ACCEPTED / NOT PUBLISHED / NOT ACTIVE
MACHINE-READABLE AUTHORITY              : NOT PUBLISHED — UNCHANGED
PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA   : NOT ASSERTED
SELECTOR                                : NOT ASSERTED / NOT ROTATED
REAL-PROVIDER VERIFICATION              : NOT PERFORMED
REAL-DEPLOYMENT VERIFICATION            : NOT PERFORMED
RESIDUALS M7-R-01…M7-R-17               : STATED BOUNDS — NOT ELIMINATED
DEPLOYMENT / WAVE 0                     : NOT AUTHORIZED
CCA SPECIFICATION (AMENDMENT 01)        : ACCEPTED + PROTECTED-INTEGRATED (§9.1; candidate
                                          d6434e4597a178fde45faf74da0298fdb5755d37; merge
                                          f54d95abb0a8f7988626597a0eef01d0b0ae3c95, PR #14); bytes unedited
DEP-03                                  : CLOSED (§9.3)
CCA IMPLEMENTATION AUTHORIZATION        : GRANTED — IMPLEMENTATION WORK ONLY (§13; protected-integrated by PR #21,
                                          merge f1fd894b60b70e07143d474992ff8b3c5dd88fe1; see the next two rows;
                                          never quote this row alone)
CCA IMPLEMENTATION WORK                 : AUTHORIZED — permission to build conforming machinery implementing the
                                          exact accepted CCA, within CCA §50.1 scope (§13.3–§13.5)
CCA IMPLEMENTATION                      : NOT ACCEPTED — no CCA implementation exists (§13.3, §13.8)
CCA RUNTIME ACCEPTANCE                  : NOT PERFORMED
CCA AG-01…AG-16                         : OPEN FOR FUTURE IMPLEMENTATION ACCEPTANCE
CCA §48 ADVERSARIAL IMPLEMENTATION      : NOT YET EXECUTED
CCA §42–§45 ENFORCEMENT                 : NOT BUILT — NOT VERIFIED
CCA §46 FINDINGS                        : CLOSED AT SPECIFICATION LEVEL — implementation conformance NOT VERIFIED
B1S DESIGN                              : YES — MAY use the accepted S-2 non-grounding default (§9.7); Path A only
                                          with an accepted M7 ingestion integration contract (§10.9, §11.6, §12.9,
                                          §13.10, §14.11, §15.8, §16.9, §17.9)
B2S DESIGN                              : per existing JBA / P-16 sequencing (§6, §7) — unchanged
B1 IMPLEMENTATION                       : NO
B2 IMPLEMENTATION                       : NO
C1 IMPLEMENTATION                       : NO
C2 IMPLEMENTATION                       : NO
AnalysisProtocol v1                     : UNFROZEN
P-16                                    : ACTIVE
```

This matrix records status established by §6, §7, §9, §10, §11, §12, §13, §14, §15, §16 and §17.1–§17.11; it authorizes nothing beyond them. Relative to §16.12, it adds the `VFC-01`, `VFC-*`, VBA-S02-1 verification PostgreSQL floor, IA-08, PostgreSQL 15, global PostgreSQL version floor, H03, `M7-S01 REGENERATION REQUIRED BY VFC-01`, `VBA-S02-1 candidate 7e82121b` and `VBA-S02-1 RE-AUTHORING` rows; records the VBA-01 root registration (PR #33) and staging synchronization (PR #34) in the `M7 S03 VBA-01` row; extends the specification-reading row with a scoped-supplement note without changing its value; renames the scoped-reading row to `M7 INSTALL PROVISIONING / S03 VERIFICATION READING` and extends it to VFC-01; renames the `M7-S01 ERRATUM 03 REGENERATION` row to `M7-S01 E03` without changing its status; updates the implementation-staging row to `2cc15773…`; replaces the §16.12 `VBA-S02-1 : … NOT AUTHORIZED / NOT AUTHORED …` row with the current state; merges the `LC-1` and `LC-2…LC-7` rows into `LC-1…LC-7` without changing status; renames the manifest row to `M7 CONTROL-PLANE / PRODUCTION MANIFEST`; restates the `M7-S03-VBCP` row as a verification fixture contract only; and points the implementation-work, implementation/runtime, M7-S02, M7-S03 and B1S rows at §17. It changes no Gate 1, Gate 2, `IMP-*`, `MA-*`, LC, manifest, machine-readable authority, selector, CCA, B, C, P-16 or deployment status.

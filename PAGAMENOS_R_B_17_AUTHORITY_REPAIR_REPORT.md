# PAGAMENOS — R-B-17 AUTHORITY REPAIR REPORT

**Repair:** R-B-17 — authority repair and canonicalization.
**Mandated by:** `PAGAMENOS_M3_5B_B_SEMANTIC_RATIFICATION_V1_3`, clause **R-B-17**; annotation obligation **O-12**.
**Nature:** **DOCUMENTATION AND AUTHORITY ONLY.** No implementation delta.
**Root register after repair:** `PAGAMENOS_SPEC_AUTHORITY.md`.
**Baseline of the final commit:** the accepted A2 integration merge `81b1cc606df9eeff7766c5afdaa56eeddb0db1a5` — **see §18, which records how this repair was rehomed after preparation.** Sections 1–17 are the original forensic record and are deliberately left exactly as written.

> **This repair created no architecture, resolved no open item, and authorized no work.** It made the existing accepted authority durable, versioned, unambiguous, explicitly ordered and auditable, so that the Joint B Architecture and the B1/B2 effective specifications can be written against it.

---

## 1. Why the repair was required

Four authority defects were independently established before this repair. Each was verifiable by repository inspection, not by assertion.

| Defect | Statement | Evidence at the time |
| :-- | :-- | :-- |
| **AUTH-01** | **The A2 effective specification was untracked.** No `PAGAMENOS_M3_5B_A2_EFFECTIVE_SPEC*.md` existed in any commit on any ref; all eleven revisions were working-tree-only. | `git log --all --diff-filter=A -- "*A2_EFFECTIVE*"` returned empty; the tracked `.md` sets at `HEAD` and at the accepted integration merge `81b1cc6` were identical and contained no A2 spec. |
| **AUTH-02** | **`PAGAMENOS_SPEC_AUTHORITY.md` was stale at M0.** It read `Authorized now: M0 only` and `Not authorized in this run: M1, M2, M3, M3.5 …`, and named no A1, A2 or M3.5A artifact. | The file itself, at `HEAD`. |
| **AUTH-03** | **No accepted document split B1 from B2 in formal authority.** | No tracked artifact recorded the split; the ratification that created it was untracked. |
| **AUTH-06** | **The rejected B1 was implemented with no B1 specification.** | `git diff 81b1cc6 a586b31` adds 16 files, 3236 insertions — **none of them a specification or design document**. |

**Consequence.** The accepted A2 implementation was merged while the authority defining its semantics was absent from the repository; the root precedence file did not recognise the authorities a B artifact would have to derive from; and the phase boundary a B implementation had assumed was unratified. Any B1/B2 specification written in that state would have cited unversioned files.

**A fifth, related hazard** — recorded diagnostically as **AUTH-05** — was that the A2 revision chain's supersession claims were literally false. Each of V4.1–V4.5 claimed to "fully supersede" all earlier revisions, while being a bounded patch. V4.5 is 177 lines; V4 is 779 lines and holds the architecture. A gate reading only the newest file would have read a two-field reclassification patch and lost the entire `PurchaseIntent` lifecycle. This is addressed by §3 below.

---

## 2. Starting repository state

| Item | Value |
| :-- | :-- |
| Branch | `m3.5b-b1-implementation` |
| HEAD | `a586b3119da2cc1aa4668485b129dbe625ab5cae` — **the rejected B1 commit** |
| HEAD tree | `ae31d6649303d04bd334ef1bf93ec56b915d39fe` |
| Working tree | 16 untracked `.md` authority artifacts; **zero** modified tracked files |
| Remote | `origin` → `https://github.com/PieroAllccaco19/PagaMenos.git`, fetched and current |

**Accepted baselines verified present before any edit:**

```
22c8efe016a1f743196c45fe4b78d606b56d1567   commit   A2 accepted implementation head
81b1cc606df9eeff7766c5afdaa56eeddb0db1a5   commit   A2 accepted integration merge
b6de0d7f72ef67a6d2099a5fd9d7f09b0a476f6b   tree     A2 accepted integration tree  (== tree of 81b1cc6)
64cf864a817c137920204487ab3317bc6d4c9ba5   commit   M3.5A accepted implementation
99f2d61bc45839d6f9506abee5fae641bfcd8b2e   commit   M3.5B-A1 accepted implementation
7c0a3d9e0add34e4823c01f22c21542817dbc881   commit   A1 documentation-only child
a586b3119da2cc1aa4668485b129dbe625ab5cae   commit   REJECTED B1 implementation
ae31d6649303d04bd334ef1bf93ec56b915d39fe   tree     REJECTED B1 tree              (== tree of a586b31)
1ded28d28038d4a385628683da096f846439a100   commit   failed prototype (C - NO-GO)
```

The stated accepted integration tree `b6de0d7f…` was confirmed to be exactly the tree of `81b1cc6`, and the stated rejected tree `ae31d664…` exactly the tree of `a586b31`.

### 2.1 A structural constraint discovered during forensics

`.github/workflows/trusted-a2-authority.yml` declares:

```js
const PROTECTED_PREFIXES = ['src/corpus/', 'src/engine/', 'authority/', '.github/workflows/', 'scripts-trusted/'];
```

`authority/` is therefore a **protected trust path**, reserved for the machine-readable authority-baseline JSON artifacts. **The documentation archive created by this repair deliberately does NOT use it**, and lives at `docs/authority/archive/` instead. No CI workflow or script in the repository references any `.md` path, so this repair cannot alter gate behaviour.

---

## 3. Canonical A2 consolidation

**Created:** `PAGAMENOS_M3_5B_A2_EFFECTIVE_SPEC_CANONICAL_V1.md` — 1725 lines, §0 through §46 plus two appendices.

**Derivation.** Only from the accepted effective chain `V4 → V4.1 → V4.2 → V4.3 → V4.4 → V4.5`. The consolidation rule is frozen in its §0.3:

1. **V4** supplies the architectural spine and every contract it closed (`DG-04`, `DG-05`, `DG-06`, `H01`, `H04`, `H05`).
2. A later revision overrides an earlier one **only** where it explicitly states a correction; anything a later revision lists as "carried forward / not reopened" retains its earlier text.
3. **No consolidation-time invention.**
4. The `"fully supersedes"` headers of V4.1–V4.5 are historical review-scope statements and are **non-operative**.

**Which revision controls which section** is recorded row by row in **Appendix A** of the canonical document — every canonical section mapped to its source revision(s), with the controlling revision named where a later patch overrode an earlier one. The principal overrides:

| Canonical section | Controlling revision | What it corrected |
| :-- | :-- | :-- |
| §4 consent serialization | **V4.1 §2** | Model A — the consent facade need not share the A2 transaction client |
| §8 trusted `entrySource` | **V4.1 §6** | closed evidence union, exhaustive mapping, frozen precedence |
| §9 context policy | **V4.2 §1** | COMPLETE-SIGNATURE-ONLY family table and frozen rejections |
| §10.2 portfolio normalization | **V4.2 §9** | total normalizer, post-trim collision rejection, absent/empty equivalence |
| §10.3 instrument comparator | **V4.3 §4** | injective `canonicalMembershipsSerialized`; component-wise code-point comparator |
| §13 holiday authority | **V4.2 §3** | the actual content-defined fixture, dates, digest, registry |
| §27 P2002 handling | **V4.1 §8** | reload-and-prove; driver metadata is a hint only |
| §33.4 `RuleVersion.provenance` | **V4.4 §3/§5** | `sourceId` and `url` EXCLUDE → INCLUDE |
| §33.6 `RuleOperationalState` | **V4.5 §3/§4** | `asOf` and `note` EXCLUDE → INCLUDE |

**All fifteen accepted closures are preserved:** `A2-DG-01`, `A2-DG-02`, `A2-DG-03`, `A2-DG-04`, `A2-DG-05`, `A2-DG-06`, `A2-DG-H01`, `A2-DG-H02`, `A2-DG-H03`, `A2-DG-H04`, `A2-DG-H05`, `A2-V4-NEW-01`, `A2-PORTFOLIO-COMPARATOR-UNDERSPECIFIED`, `A2-CORPUS-PROJECTION-INCOMPLETE`, plus the R35R matrix (§38, with **R35R-19 still DEFERRED NON-BLOCKING**). The consolidated closure matrix is §45.

**Misleading supersession removed.** **Appendix B** of the canonical document is a register of every neutralized claim, stating for each revision what its header literally said, what its accepted scope actually was, and that the claim is non-operative. Each archived file additionally carries the same neutralization in its own header.

**Deliberately not supplied.** The concrete `corpusSemanticDigest` hex for `PAGAMENOS_VALIDATION_CORPUS_v1_2026-08-30T1800-0500` is **not** written into the canonical document. Every revision from V4.2 onward states it is produced at the authority-bootstrap gate and must not be hand-authored; consolidation rule 3 preserves that. Inventing a value here would have manufactured authority.

**Semantic change: none.** The canonical document restates the design authority the accepted A2 implementation was gated against. It does not modify accepted A1/A2 database semantics, runtime services, the Prisma schema, migrations, business logic, trusted-harness semantics, or application behaviour.

**Consolidation-time additions that are explicitly NOT A2 semantics**, and are labelled as such in Appendix A: §0 in full; the Appendix A and Appendix B tables; and one cross-reference note in §44 pointing at the accepted B ratification's matching firewall.

---

## 4. Historical A2 archive treatment

**Method: archival relocation, not deletion.** Fifteen historical artifacts were moved under `docs/authority/archive/`, each with a clearly separated `R-B-17 ARCHIVAL HEADER` block prepended. **No historical content was altered.**

Each header states: the non-normative status; the active normative replacement; that supersession language inside the file is **non-operative**; and the file's **pre-archival SHA-256**, so the body can be independently verified:

```bash
tail -n +23 <archived-file> | sha256sum
```

**All fifteen bodies were verified byte-identical after archival.**

| Archived path | Original name | Status | Pre-archival SHA-256 |
| :-- | :-- | :-- | :-- |
| `m3.5b-a2/…_A2_EFFECTIVE_SPEC_V1.md` | `…_A2_EFFECTIVE_SPEC.md` | HISTORICAL / NON-NORMATIVE | `8ee9dc6fcf795e92…` |
| `m3.5b-a2/…_A2_EFFECTIVE_SPEC_V2.md` | same | HISTORICAL / NON-NORMATIVE | `b78d8bf6481334c0…` |
| `m3.5b-a2/…_A2_EFFECTIVE_SPEC_V3.md` | same | HISTORICAL / NON-NORMATIVE | `b1f8deb09e02d0ca…` |
| `m3.5b-a2/…_A2_EFFECTIVE_SPEC_V4.md` | same | HISTORICAL — architectural spine | `1303e2376d99e33d…` |
| `m3.5b-a2/…_A2_EFFECTIVE_SPEC_V4_1.md` | same | HISTORICAL — bounded patch | `bcd77db32d43b9c2…` |
| `m3.5b-a2/…_A2_EFFECTIVE_SPEC_V4_2.md` | same | HISTORICAL — bounded patch | `01c16d8f89d403d3…` |
| `m3.5b-a2/…_A2_EFFECTIVE_SPEC_V4_3.md` | same | HISTORICAL — two corrections | `b9aba1f08a36fd45…` |
| `m3.5b-a2/…_A2_EFFECTIVE_SPEC_V4_4.md` | same | HISTORICAL — one correction | `161797c07f9e7972…` |
| `m3.5b-a2/…_A2_EFFECTIVE_SPEC_V4_5.md` | same | HISTORICAL — one correction | `327ba7656d4fb562…` |
| `m3.5b-a1/…_A1_EFFECTIVE_SPEC_V1.md` | `…_A1_EFFECTIVE_SPEC.md` | HISTORICAL / NON-NORMATIVE | `1d9879b95c790945…` |
| `m3.5b-a1/…_A1_EFFECTIVE_SPEC_V2.md` | same | HISTORICAL / NON-NORMATIVE | `721f7298de1b71e4…` |
| `m3.5b-b/…_B_SEMANTIC_RATIFICATION_V1.md` | same | SUPERSEDED HISTORICAL REVIEW ARTIFACT | `e55d26aa7ce3ec62…` |
| `m3.5b-b/…_B_SEMANTIC_RATIFICATION_V1_1.md` | same | SUPERSEDED HISTORICAL REVIEW ARTIFACT | `bb436b2ea2131fcd…` |
| `m3.5b-b/…_B_SEMANTIC_RATIFICATION_V1_2.md` | same | SUPERSEDED HISTORICAL REVIEW ARTIFACT | `78a05190762bdc03…` |
| `m3.5b-b/…_B1_EFFECTIVE_SPEC_V1.md` | same | **BLOCKED DIAGNOSTIC / DECISION INPUT** | `0b978dd832254282…` |

The unversioned `…_A2_EFFECTIVE_SPEC.md` and `…_A1_EFFECTIVE_SPEC.md` were renamed to `…_V1.md` **only** to make the ordering legible in one directory listing; both renames are recorded above, and the canonical document's Appendix B annotates the one place where V2 quotes the old filename verbatim.

`docs/authority/archive/README.md` indexes the archive and repeats the non-normative status at tree level, including the explicit reading warning about the false supersession claims.

**A1 V1 and V2 were archived too.** They were not named by any defect — A1's canonical `PAGAMENOS_M3_5B_A1_EFFECTIVE_SPEC_V2_1.md` was already tracked — but leaving them loose and untracked would have left their status ambiguous next to a fully classified A2 chain. They are explicitly incorporated into the authority bundle and recorded here.

---

## 5. Root authority register changes

`PAGAMENOS_SPEC_AUTHORITY.md` was rewritten. The stale `Authorized now: M0 only` authorization block is gone.

The register now carries, in explicit precedence order:

- **§1 Base study authority** — RT-04 micro-patch > Red-team Patch Rev 2 > Red-team Patch > Phase 0A-2 FINAL, with the authoritative background inputs (Phase 0A, 0A_1, 0A-1B) and the independent closure verdict, all preserved unchanged; plus **§1.1**, recording the two Rev 2 amendments now in force.
- **§2 Accepted milestones** — M3.5A (`64cf864…`), M3.5B-A1 (canonical V2.1, `99f2d61…`, with the documentation-only child explicitly not replacing it), M3.5B-A2 (canonical spec created here, head `22c8efe…`, integration merge `81b1cc6…`, integration tree `b6de0d7f…`); plus §2.4 distinguishing the protected `authority/` trust path from the documentation archive.
- **§3 B semantic authority** — V1.3, **ACCEPTED**, with its scope, its explicit subordination to immutable higher-order study invariants, and a note resolving its own candidate-era status lines.
- **§4 Formal B phase spine** — with the superseded legacy label called out.
- **§5 Non-authoritative artifacts** — an explicit register, including the rejected implementation.
- **§6 Current implementation authorization** — including frozen-status flags and the standing R-B-16 engineering pre-condition.
- **§7 Next authorized artifact** — the Joint B Architecture and the open items it must close.
- **§8 Repair provenance.**

A reading rule at the top resolves apparent conflicts deterministically.

---

## 6. B semantic authority installation

`PAGAMENOS_M3_5B_B_SEMANTIC_RATIFICATION_V1_3.md` is installed as the accepted B semantic authority and is now tracked at the repository root.

**Its body was not modified.** A clearly separated `R-B-17 ACCEPTANCE BANNER` was prepended, recording the acceptance verdict and the fact that R-B-17 has since been executed. The banner exists because the ratified body, authored as a candidate, still reads `CANDIDATE — NOT FINAL AUTHORITY` and `R-B-17 AUTHORITY REPAIR NOT EXECUTED`, and its §14 instructs the reader not to execute R-B-17. Leaving a stale `NOT EXECUTED` line inside the controlling authority would have been exactly the class of defect R-B-17 exists to remove.

The banner resolves **only** those status lines. It explicitly states that nothing in it ratifies, resolves, narrows or extends any clause of the body, and that **O-12 is the sole open item it touches** — and only because O-12's owner was defined as *"R-B-17 authority repair, before R-B-17 is considered complete."*

**Body integrity is verifiable:**

```bash
tail -n +30 PAGAMENOS_M3_5B_B_SEMANTIC_RATIFICATION_V1_3.md | sha256sum
# sha256:b4f83051a17d7318c8c871e14d2dc4b88c2add560414a01134962610826e76f4
```

This was verified after the banner was applied.

---

## 7. Rev 2 amendment annotations (O-12)

`PAGAMENOS_PHASE_0A-2_REDTEAM_PATCH_REV2.md` was annotated using an explicit, visible amendment mechanism. **The diff is 63 insertions and 0 deletions — no original Rev 2 content was changed, moved or removed.**

Three annotation blocks were added:

1. **A top-of-file amendment notice**, so no reader reaches §6.A or §8 unaware, with a two-row table naming both amended sections and the controlling authority.
2. **A normative amendment note immediately before §6.A**, printed above the pre-ratification interface so the superseded shape cannot be read first. It records that the accepted ratification supersedes the required singular `createdFromIntentId`, any interpretation requiring one app intent per occasion (with `UNIQUE(originIntentId)` forbidden as canonical identity), and physical scalar-shape assumptions incompatible with the ratified logical interface. It then states what holds after the amendment: zero/one/many source links with no synthetic intents; provenance separable from canonical identity; analysis-facing semantics following the amended logical interface, with no scalar projection implemented before its selection rule is accepted; and late facts represented append-only rather than by mutating the canonical identity record. It preserves the conservative dedup and anti-inflation invariants, assigns them to B2 and to C2 analysis rather than to B2 identity rules, and states that §6.B–§6.F are unamended — §6.E in particular remains controlling. It closes by naming what remains open (**O-04**, **O-14**, **O-06b-ARCH**) and forbidding inference of physical representation from §6.A.
3. **A normative amendment note immediately before §8**, recording that the `occasionKey` deletion **stands**, that it MUST NOT be reinterpreted as a universal ban on all possible future deterministic identity constructions, and that the narrowing preserves four separate rules rather than one universal ban (**R-B-06**, **R-B-12**, **R-B-04/P-02**, **R-B-14/P-09**). It states in a display block that **O-16 remains open** for the Joint B Architecture with the interim default *no new deterministic canonical key is authorized*, and confirms that no other row of the §8 register is amended.

Both notes cite `PAGAMENOS_M3_5B_B_SEMANTIC_RATIFICATION_V1_3` as the controlling amendment authority.

---

## 8. Non-authoritative artifact dispositions

| Artifact | Recorded status | Where recorded |
| :-- | :-- | :-- |
| `PAGAMENOS_M3_5B_B1_EFFECTIVE_SPEC_V1` | `BLOCKED DIAGNOSTIC / DECISION INPUT — NON-NORMATIVE` | register §5; archive README; its own archival header |
| Ratification `V1`, `V1.1`, `V1.2` | `SUPERSEDED HISTORICAL REVIEW ARTIFACTS — NON-NORMATIVE` | register §3 and §5; archive README; their own headers |
| Ratification `V1.3` | **`ACCEPTED B SEMANTIC AUTHORITY`** | register §3; its acceptance banner |
| A2 `V1`–`V4.5` | `HISTORICAL / NON-NORMATIVE` | register §5; archive README; their own headers; canonical Appendix B |
| A1 `V1`, `V2` | `HISTORICAL / NON-NORMATIVE` | register §5; archive README; their own headers |
| Commit `a586b3119da2cc1aa4668485b129dbe625ab5cae` | **`REJECTED IMPLEMENTATION EVIDENCE — NON-AUTHORITATIVE`** | register §5.1; archive README |
| Commit `1ded28d28038d4a385628683da096f846439a100` | `EVIDENCE ONLY — NOT A BASELINE` (Sol: **C — NO-GO**) | register §5 |

The blocked B1 diagnostic is explicitly recorded as **not competing** with the accepted V1.3 ratification.

**The rejected implementation was not deleted.** Commit `a586b31` and tree `ae31d664` remain in Git history and on `origin/m3.5b-b1-implementation`. The register records that it must not be treated as B semantic authority (**P-17**) and must not be used as an implementation baseline — the accepted baseline is the A2 integration merge `81b1cc6`. Its root cause is recorded as **AUTH-06**, together with the now-binding consequence that B artifacts require the B-scoped independently reviewed authority process before implementation (**R-B-17**, **P-17a**), and that beginning B1 implementation while the B1-to-B2 cross-contract is unresolved is prohibited (**P-16**).

---

## 9. Formal B phase spine

Recorded in the root authority register §4:

```
A1  Protocol / Cohort                                    ACCEPTED
A2  Intent / Decision                                    ACCEPTED
B1  Purchase Observation / Occasion Candidate Identity   RATIFIED, NOT YET SPECIFIED
B2  Purchase Occasion & Exposure Reconciliation          RATIFIED, NOT YET SPECIFIED
C1  Evidence / Attribution                               NOT AUTHORIZED
C2  Analysis                                             NOT AUTHORIZED
```

Stated explicitly, in its own callout:

> **`B1 Opportunity Identity` is a superseded legacy label and MUST NOT be used in new normative artifacts.** The ratified label is **`B1 — Purchase Observation / Occasion Candidate Identity`**.

The binding terminology table is carried into the register so the units — capture, purchase-decision occasion, purchase observation / occasion candidate, `PurchaseOccasion`, real-world distinctness, scientific independence, opportunity — cannot be collapsed.

---

## 10. AnalysisProtocol and C status

**Nothing was frozen.** Recorded in register §6.1:

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

The register states that **no artifact may freeze any element of `AnalysisProtocol v1`**, and notes that the Rev 2 §6.A amendment is permissible precisely *because* v1 is unfrozen and §6.B anticipates versioned change.

---

## 11. Joint B Architecture status

Recorded in register §7:

```
M3.5B-B ARCHITECTURE CONTRACT — B1+B2
Status: NEXT AUTHORIZED DESIGN ARTIFACT — NOT YET DRAFTED
```

**This repair did not create it.** The register lists the open decisions it must close before its own acceptance — **O-01, O-02, O-03, O-04, O-06a, O-06b-ARCH, O-B-DISTINCTNESS, O-11 (where shared), O-13, O-14, O-15, O-16, O-17** — as a gate checklist, **without answering any of them**. It also records the hard architecture-gate condition on the RT-09 `Outcome` terminology ambiguity, the separations that must not be recombined (`O-06b-ARCH` from `O-06b-SPEC`; `O-B-DISTINCTNESS` from `O-C-INDEPENDENCE`), and the items deliberately owned elsewhere (`O-05`, `O-06b-SPEC`, `O-06c`, `O-08`, `O-09`, `O-C-INDEPENDENCE`, `O-10`).

**Open item O-12 is the only open item this repair closed**, and only because the accepted register assigned it to the R-B-17 repair itself.

---

## 12. File change manifest

**Added — normative, repository root**

| File | Size |
| :-- | :-- |
| `PAGAMENOS_M3_5B_A2_EFFECTIVE_SPEC_CANONICAL_V1.md` | 1725 lines |
| `PAGAMENOS_R_B_17_AUTHORITY_REPAIR_REPORT.md` | this file |

**Added — accepted B semantic authority, brought under version control**

| File | Change |
| :-- | :-- |
| `PAGAMENOS_M3_5B_B_SEMANTIC_RATIFICATION_V1_3.md` | previously untracked; acceptance banner prepended, body unaltered |

**Modified — tracked**

| File | Diff |
| :-- | :-- |
| `PAGAMENOS_SPEC_AUTHORITY.md` | rewritten as the repaired root register |
| `PAGAMENOS_PHASE_0A-2_REDTEAM_PATCH_REV2.md` | **+63 / −0** — three amendment annotation blocks only |

**Added — non-normative archive**

| Path | Contents |
| :-- | :-- |
| `docs/authority/archive/README.md` | archive index and tree-level non-normative statement |
| `docs/authority/archive/m3.5b-a2/` | 9 historical A2 revisions |
| `docs/authority/archive/m3.5b-a1/` | 2 historical A1 revisions |
| `docs/authority/archive/m3.5b-b/` | 3 superseded ratifications + the blocked B1 diagnostic |

**Not modified — accepted baseline documents (verified):** `PAGAMENOS_M3_5A_IMPLEMENTATION_REPORT.md`, `PAGAMENOS_M3_5B_A1_EFFECTIVE_SPEC_V2_1.md`, `PAGAMENOS_M3_5B_A1_IMPLEMENTATION.md`, `PAGAMENOS_PHASE_0A.md`, `PAGAMENOS_PHASE_0A_1.md`, `PAGAMENOS_PHASE_0A-1B.md`, `PAGAMENOS_PHASE_0A-2_FINAL.md`, `PAGAMENOS_PHASE_0A-2_REDTEAM_PATCH.md`, `PAGAMENOS_PHASE_0A-2_RT04_MICROPATCH.md`, `README.md`, `docs/LOGGING_PRIVACY_POLICY.md`, `docs/trusted-a2-authority-bootstrap.md`, and the M0–M3 implementation reports.

---

## 13. Repository integrity proof

Established by Git path inspection, not by narrative.

**13.1 No runtime implementation delta.**

```bash
git diff --name-only HEAD -- src prisma scripts scripts-trusted .github \
                              package.json pnpm-lock.yaml eslint.config.mjs
```

Returns **empty**. No runtime source, Prisma schema, migration, script, trusted harness, CI workflow, dependency manifest or lockfile was touched by this repair.

**13.2 No trusted-gate weakening.** `.github/workflows/trusted-a2-authority.yml` is unmodified. No `.md` path is referenced by any workflow or script, so no gate behaviour can change. The documentation archive was deliberately placed at `docs/authority/archive/`, **not** under the protected `authority/` prefix.

**13.3 Archived bodies unaltered.** All fifteen archived files were verified: the SHA-256 of the body after the archival header equals the recorded pre-archival digest, for every file.

**13.4 Accepted B ratification body unaltered.** `tail -n +30` of `PAGAMENOS_M3_5B_B_SEMANTIC_RATIFICATION_V1_3.md` hashes to `b4f83051a17d7318c8c871e14d2dc4b88c2add560414a01134962610826e76f4`, the pre-banner digest.

**13.5 Rev 2 purely additive.** `git diff --numstat` reports `63  0` — sixty-three insertions, zero deletions.

**13.6 Working-tree discipline.** No untracked file was deleted to obtain a clean tree. The sixteen untracked authority artifacts present at the start were all either promoted to normative status at the root or relocated into the non-normative archive, and all are accounted for in §12. No unrelated user work existed in the working tree, and none was disturbed.

**13.7 Accepted implementation untouched.** The A2 accepted implementation head `22c8efe016a1f743196c45fe4b78d606b56d1567`, integration merge `81b1cc606df9eeff7766c5afdaa56eeddb0db1a5` and integration tree `b6de0d7f72ef67a6d2099a5fd9d7f09b0a476f6b` are unmodified. No accepted commit was amended and no history was rewritten.

### 13.8 Recorded observation — the repair branch base

> **Subsequently resolved — see §18.** The observation below is the **preparation-time** finding, recorded before any commit existed. It is retained verbatim as forensic history. The concern it raises was acted on: the repair was rehomed onto the accepted baseline, and the final commit does **not** descend from `a586b31`.

This repair was authored on `m3.5b-b1-implementation`, whose HEAD is the **rejected** B1 commit `a586b31`. That branch's tree therefore contains the sixteen rejected B1 files, which are **not** part of the accepted A2 integration tree:

```
eslint.config.mjs
prisma/migrations/20260904120000_m3_5b_b1_purchase_occasion/migration.sql
prisma/schema.prisma
scripts/migrate-check.ts
scripts/pg-integration.ts
src/db/b1-staged-upgrade.integration.test.ts
src/db/purchase-occasion-repository.ts
src/db/purchase-occasion.integration.test.ts
src/lib/module-capability.test.ts
src/services/b1-trust-boundary.test.ts
src/services/index.ts
src/services/study-purchase-occasion.ts
src/study/index.ts
src/study/purchase-occasion-errors.ts
src/study/purchase-occasion-identity.test.ts
src/study/purchase-occasion-identity.ts
```

**This repair added none of them and changed none of them** (§13.1). But an authority commit created on this branch would produce a tree in which the repaired normative authority and the rejected implementation coexist. That is a governance property of the **branch base**, not of the repair content, and it is recorded here rather than resolved unilaterally, because selecting the base for an authority commit is the repository-authority owner's decision. See §14.

---

## 14. Unresolved future gates

| Gate | Owner | Status |
| :-- | :-- | :-- |
| **Base commit for this authority repair** | repository-authority owner | ~~**OPEN** — see §13.8.~~ **CLOSED — see §18.** The repair was rehomed onto the accepted A2 integration merge `81b1cc6`; the final authority tree's runtime is exactly the accepted `b6de0d7f`. |
| `M3.5B-B ARCHITECTURE CONTRACT — B1+B2` | Joint B Architecture | **NOT YET DRAFTED** — must close O-01, O-02, O-03, O-04, O-06a, O-06b-ARCH, O-B-DISTINCTNESS, O-11 (shared), O-13, O-14, O-15, O-16, O-17, plus the RT-09 terminology condition |
| B1 Effective Specification | B1S | not started — owns O-05, O-06b-SPEC |
| B2 Effective Specification | B2S | not started — owns O-06c, and the implementable O-04 / O-B-DISTINCTNESS representations |
| Hosted real-PostgreSQL required-check surface | engineering | **OPEN** (**R-B-16**, rationale **HR-B-10**; tracked as P35A-06) — required before B1/B2 acceptance |
| A2 pre-implementation authority bootstrap | authority-bootstrap gate | corpus `corpusSemanticDigest` hex is produced there, never hand-authored |
| `AnalysisProtocol v1` freeze | C2 / protocol | **UNFROZEN** — owns O-08, O-09, O-C-INDEPENDENCE |
| C1 / C2 | — | **NOT AUTHORIZED** |

---

## 15. Cross-reference audit

Performed mechanically over the newly created and modified normative documents.

| Check | Result |
| :-- | :-- |
| Every `PAGAMENOS_*` filename referenced resolves to a real file | **PASS** — the only non-file matches are the CI variable `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA` and the corpus identifier `PAGAMENOS_VALIDATION_CORPUS_v1_2026-08-30T1800-0500`, neither of which is a filename |
| Every 40-hex object cited exists, with the expected type | **PASS** — 7 commits and 2 trees, all resolving |
| Accepted SHAs quoted correctly | **PASS** — head `22c8efe…`, merge `81b1cc6…`, tree `b6de0d7f…` verified against `git rev-parse` |
| Supersession status correct throughout | **PASS** |
| No broken section reference | **PASS** — the canonical A2 document runs §0–§46 with no gap, plus Appendices A and B |
| No reference to V1 / V1.1 / V1.2 as **active** authority | **PASS** — all six mentions are inside explicit `SUPERSEDED … NON-NORMATIVE` rows |
| No reference to `a586b31` as an implementation baseline | **PASS** — all three mentions are inside explicit `REJECTED … NON-AUTHORITATIVE` context; one is the AUTH-06 evidence citation |
| One quoted historical filename annotated | **PASS** — canonical Appendix B annotates V2's verbatim quotation of the unversioned `…_A2_EFFECTIVE_SPEC.md`, naming its archived path |

---

## 16. Acceptance matrix

| # | Criterion | Result |
| :-- | :-- | :-- |
| A | AUTH-01 repaired | **PASS** — canonical A2 spec created and staged for version control |
| B | AUTH-02 repaired | **PASS** — register rewritten; `Authorized now: M0 only` removed |
| C | AUTH-03 repaired | **PASS** — B1/B2 split recorded in the formal authority spine |
| D | AUTH-06 disposition recorded | **PASS** — register §5.1, with the binding process consequence |
| E | Canonical A2 spec created | **PASS** — 1725 lines, with a section-by-section provenance appendix |
| F | Historical A2 revisions non-normative | **PASS** — 9 archived and marked; supersession claims neutralized |
| G | B V1.3 installed as semantic authority | **PASS** — register §3; acceptance banner; body unaltered |
| H | V1 / V1.1 / V1.2 superseded | **PASS** — archived and marked non-normative |
| I | Blocked B1 diagnostic non-normative | **PASS** — archived as `BLOCKED DIAGNOSTIC / DECISION INPUT` |
| J | Rejected `a586b31` non-authoritative | **PASS** — register §5.1; preserved in history, not deleted |
| K | Rev 2 §6.A amendment annotated | **PASS** — visible normative note citing V1.3 |
| L | Rev 2 §8 amendment annotated | **PASS** — visible normative note citing V1.3; O-16 left open |
| M | B1/B2 spine recorded | **PASS** — register §4, with the superseded legacy label called out |
| N | AnalysisProtocol still UNFROZEN | **PASS** — register §6.1; nothing frozen |
| O | No runtime implementation delta | **PASS** — `git diff --name-only HEAD` over all runtime paths is empty |
| P | Repository integrity preserved | **PASS** — §13.1–§13.7; §13.8 records the branch-base observation |
| Q | Next artifact correctly recorded | **PASS** — Joint B Architecture, `NOT YET DRAFTED`, open items listed and unanswered |

---

## 17. Scope discipline — what this repair deliberately did not do

- It did **not** design the Joint B Architecture.
- It did **not** implement or specify B1 or B2.
- It did **not** alter accepted A1/A2 implementation semantics.
- It did **not** revive the rejected B1 implementation.
- It did **not** freeze `AnalysisProtocol v1`, or any element of it.
- It did **not** answer any open item except **O-12**, which the accepted register assigned to this repair.
- It did **not** invent the corpus semantic digest hex that the accepted chain reserves for the authority-bootstrap gate.
- It did **not** delete any historical or untracked artifact.

---

## 18. Finalization — rehoming onto the accepted baseline

> **This section is a finalization record appended after §§1–17 were written. It does not revise them.** Sections 1–17 describe the repair as it was **prepared**; this section describes where it was **committed**. Both are true, and the sequence is deliberately preserved rather than rewritten.

### 18.1 What happened, in order

1. **Preparation** occurred in the primary worktree on branch `m3.5b-b1-implementation`, whose HEAD was the **rejected** B1 commit `a586b3119da2cc1aa4668485b129dbe625ab5cae`. This is stated in §2 and is historically accurate.
2. **No commit was made on that branch.** The repair was left as a clean staged state, and §13.8 recorded the branch-base concern rather than resolving it unilaterally, because selecting the base for an authority commit is the repository-authority owner's decision.
3. **The base was then directed to the accepted baseline.** A fresh branch `m3.5b-r-b-17-authority-repair` was created in an isolated worktree, rooted **exactly** at the accepted A2 integration merge:

   ```
   HEAD = 81b1cc606df9eeff7766c5afdaa56eeddb0db1a5
   tree = b6de0d7f72ef67a6d2099a5fd9d7f09b0a476f6b
   ```

   verified clean before anything was applied.
4. **The prepared authority content was transferred by exact Git object identity**, not by re-authoring. The prepared staged tree `f700b89035b3d92cd1ee12ce06db55d75cf91c95` was anchored against garbage collection at `refs/rb17/prepared-tree`, and the twenty-one authority paths were checked out from it directly into the new worktree.
5. **The final commit derives directly from the accepted baseline.** Its parent is `81b1cc606df9eeff7766c5afdaa56eeddb0db1a5`, and the rejected commit `a586b31` is **not** an ancestor of it.

### 18.2 Transfer method and why it is exact

Two preconditions were checked before applying anything, and both passed:

- The two **modified** files, `PAGAMENOS_SPEC_AUTHORITY.md` and `PAGAMENOS_PHASE_0A-2_REDTEAM_PATCH_REV2.md`, have **byte-identical pre-images** at the accepted baseline and at the rejected branch — blobs `5f201158…` and `38b6abbc…` respectively. The repair's modifications are therefore baseline-independent, and no conflict was possible.
- None of the nineteen **added** paths already existed at the accepted baseline, so all nineteen are genuine additions there.

Because both preconditions held, the transfer was performed by **exact blob checkout from the anchored prepared tree** rather than by patch application. This is stronger than a patch: it reproduces the reviewed content by Git object identity, with no fuzz, no context matching, and no possibility of silent drift. **No conflict arose and no conflict resolution was required.**

### 18.3 Content equivalence

All twenty-one authority artifacts are **IDENTICAL** to the already-reviewed prepared repair, verified three ways per file — prepared-tree blob SHA, new index blob SHA, and on-disk `git hash-object` — with **zero** differences.

**One file was subsequently edited on the accepted-baseline branch: this report.** The edits are confined to recording this finalization, and are enumerated exhaustively:

| Edit | Location | Nature |
| :-- | :-- | :-- |
| Baseline pointer added to the header block | header | addition |
| Forward pointer to §18 added above the §13.8 observation | §13.8 | addition; the observation itself is unaltered |
| Branch-base gate marked **CLOSED — see §18** | §14 table | gate status update on a forward-looking row |
| This section | §18 | addition |

**No other repair artifact changed**, and no semantic content of the repair changed. Sections 1–17 are otherwise byte-identical to the reviewed version.

### 18.4 Rejected B1 runtime is absent — proof

The new branch was diffed against the accepted baseline `81b1cc6`:

- The complete diff is **21 paths**, every one of them authority documentation.
- The runtime path delta over `src/`, `prisma/`, `scripts/`, `scripts-trusted/`, `.github/workflows/`, `authority/`, and the package, lock and runtime configuration files is **EMPTY**.
- Each of the **sixteen** paths touched by `git diff --name-only 81b1cc6 a586b31` was checked individually: the **nine** files the rejected commit *added* are **absent** here, exactly as at the baseline; the **seven** files it *modified* carry the **baseline blob**, not the rejected blob.
- `git merge-base --is-ancestor a586b31 HEAD` is **false** — the rejected commit is not an ancestor.

### 18.5 Tree identity

| Tree | SHA | Meaning |
| :-- | :-- | :-- |
| Accepted baseline | `b6de0d7f72ef67a6d2099a5fd9d7f09b0a476f6b` | A2 accepted integration tree |
| Prepared (rejected base) | `f700b89035b3d92cd1ee12ce06db55d75cf91c95` | superseded — carried the rejected B1 runtime through its base |
| Final authority repair | *(recorded in the commit; see §18.6)* | baseline plus authority documentation only |

The prepared tree and the final tree are **expected to differ**, and do: they contain equivalent authority content over different runtime baselines. The authority delta over the accepted baseline is documentation-only, with **zero** non-documentation paths.

### 18.6 Final commit

```
message : docs(authority): repair M3.5B authority chain before B architecture
branch  : m3.5b-r-b-17-authority-repair
parent  : 81b1cc606df9eeff7766c5afdaa56eeddb0db1a5   (accepted A2 integration merge)
```

Not squashed with anything else. The rejected B1 implementation was **not** merged, **not** cherry-picked, and **not** rebased onto. It remains preserved in history and on `origin/m3.5b-b1-implementation`, with its status unchanged: `REJECTED IMPLEMENTATION EVIDENCE — NON-AUTHORITATIVE`.

### 18.7 Preservation of prepared work

The primary worktree on `m3.5b-b1-implementation` was left untouched throughout, so the prepared staged state remains intact there as an independent record. Unrelated user work was preserved: the pre-existing stash from 2026-09-05 on `pre-a2-ci-authority-parity` was neither popped nor modified, and no untracked file was deleted.

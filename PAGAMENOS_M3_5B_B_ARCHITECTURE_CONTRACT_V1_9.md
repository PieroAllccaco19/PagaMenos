# PAGAMENOS — M3.5B-B ARCHITECTURE CONTRACT — B1 + B2 — V1.9

**Artifact:** `PAGAMENOS_M3_5B_B_ARCHITECTURE_CONTRACT_V1_9.md`
**Nature:** Joint B Architecture (JBA), final O-06a totality patch; V1.9 is a **narrow normative-consistency cleanup of the V1.8 candidate** — it synchronizes stale live wording with the three semantic repairs V1.8 already made (`CD-5a`, the `LateActualTransactionFactSatellite` registry row, and the `DG-3`/`DG-4` narrowing), introduces **no new semantic choice**, and is not a redesign.
**Supersedes:** `PAGAMENOS_M3_5B_B_ARCHITECTURE_CONTRACT_V1_8.md` **in full, and only if independently accepted.** Until then V1.8 remains the immediately preceding candidate and V1.9 is the candidate under audit. V1.7 and earlier are neither amended nor re-opened.
**Status:** `CANDIDATE — SUBMITTED FOR INDEPENDENT ACCEPTANCE AUDIT.` This document does **not** self-declare acceptance.
**Repairs:** `JBA16-AUD-01`, `JBA16-AUD-02` and `JBA16-AUD-04` remain **CLOSED** as re-closed by V1.8 (see Part D's V1.8 addendum); V1.9 makes **no further semantic repair**, only synchronizing stale live normative surfaces that still contradicted those V1.8 repairs; `JBA16-AUD-03` carried CLOSED unchanged; carrying `JBA-AUD-01…30`, `JBA12-AUD-01…15`, `JBA13-AUD-01…07`, `JBA14-AUD-01…02` and `JBA15-AUD-01…03`.

```
Baseline commit : 6cde4342a6d12d4339c58560da45c2458821deaf
Baseline tree   : 8cec9d2d8e437ee6ca081b16b4b5321aa1cb247a   (re-verified for this revision)
Rejected B1     : a586b3119da2cc1aa4668485b129dbe625ab5cae   NON-AUTHORITATIVE EVIDENCE ONLY
Rejected tree   : ae31d6649303d04bd334ef1bf93ec56b915d39fe   (re-verified for this revision)
```

**Self-containment.** A future B1S or B2S author needs **this document plus the controlling authority chain (§2.3)** and nothing else. V1 through V1.8 are not required reading and are not cited as authority anywhere in Part C. Where a prior revision is named, it is named as a **defect record**, never as a source of current semantics.

**Nature of this revision.** **A narrowly scoped patch, not a redesign.** V1.6's typed eligibility and content-addressed disposition fold are **retained in full**. What V1.6 left unfinished is **well-foundedness**: two of its predicates were mutually recursive with no stated semantics, its record-class registry omitted classes the architecture elsewhere names, its cardinality contract contradicted its own fold, and its disposition-of-disposition rule was declared but never made operative. V1.7 supplies **two explicit dependency graphs, both required acyclic**, an **exhaustive persisted-class registry**, an **aligned cardinality contract**, and an **effective-event predicate** that makes quarantining a bad quarantine actually do something. **No accepted semantic is redesigned.**

**What the V1.6 audit accepted, and what is therefore frozen.** The verdict was `REQUIRES PATCH` with **only O-06a open**. Typed eligibility (`JBA15-AUD-01`), the content-addressed disposition fold (`JBA15-AUD-02`), the corrected `RS-1` (`JBA15-AUD-03`), `JBA14-AUD-01`/`-02`, **O-01 CLOSED VALIDLY**, and the twenty-four previously frozen areas are all accepted and carried. **Part E proves each is still in force.**

---

# PART A — V1.7 PATCH SUMMARY

**The single sentence that describes all four findings.** V1.6 defined predicates that refer to one another without stating **in what order they may be evaluated**, and enumerated classes without stating **which enumeration is closed** — so its totality held for every case it named and was undefined for the cases it did not. **V1.7 supplies the well-foundedness: two acyclic dependency graphs, a closed persisted-class registry, one cardinality contract, and an event-operability predicate that is actually consulted.**

| Finding | Exact defect in V1.6 | Repair in V1.7 | Kind | Downstream owner |
| :-- | :-- | :-- | :-- | :-- |
| **JBA16-AUD-01** | `PROJECTION_INPUT_ELIGIBLE(r)` depends on `CITATION_SOUND(r)`, and `CITATION_SOUND(a)` may consult `PROJECTION_INPUT_ELIGIBLE(x)` for a fold-read referent `x`. **Where citations form a cycle the two definitions are a recursive equation with no specified semantics** — no fixed point is defined, no evaluation order is given, and no failure behaviour is stated. V1.6 also never said **which** references are eligibility-dependency edges, leaving *"every operative reference is probably a citation"* implicit. | **§9.3.5.1 defines the `CitationDependencyGraph` normatively and exhaustively.** Every reference the architecture admits is classified into exactly one of **three kinds** — **semantic citation/dependency** (an eligibility edge), **mere provenance/reference** (no eligibility edge), **structural endpoint relation** (an `SG-R` obligation, not an eligibility edge) — in a **closed table** (CD-3). **`CD-01` requires the graph to be acyclic**, aligned with the B1→B2 construction layering (CD-4, CD-5). **Termination is proved** (CD-9): stratification plus a finite DAG gives a unique value in at most `\|R\|` steps, with **no fixed-point guessing and no "iterate until stable."** A cycle that physically enters **fails every member closed** with a typed integrity error and **no arbitrary winner** (CD-7, §9.5.6.9). | **AC** (the graph and its acyclicity) + **IC** (removing an undefined recursion) | edge representation and write-time enforcement → **B1S / B2S** |
| **JBA16-AUD-02** | §9.3.8 claimed *"every record class the architecture admits appears above"* while the architecture elsewhere names **source-native relation records**, **typed decomposition-ambiguity records**, **non-grounding emission markers**, **affected-scope records**, **structural-admission records** and **integrity-error / anomaly history records** — none of which appeared. The claim was **false as written**, and `AM-10` was available to excuse classes that were already defined. | **§9.3.8 is reissued as a closed persisted-class registry**: **twenty-one class rows**, each answering **eight** questions — tier · projection participation · seed eligibility · exact scope derivation · exact failure consequence · citation participation · disposition-control eligibility · deletion behaviour by reference to the frozen legal model. **§9.3.8.3 is a subsumption register** stating, for every other logical name in this document, either the class it is a subtype, field or event of, or that it is not B-persisted at all. **`AM-10a`** forbids using `AM-10` for any class this document already names. | **IC** (withdraws a false exhaustiveness claim) + **AC** (the registry) | physical representation → **B1S / B2S** |
| **JBA16-AUD-03** | §9.3.3.3's fold is **set-valued** — `ACTIVE_QUARANTINES(r)` may hold `N` members, and `MQ-2`/`MQ-5` depend on it — while §23.1 still read **`0..1` active quarantine per record**. Both were normative. **They cannot both be true.** | **§23.1 is corrected to `0..N` active quarantines per target record**, each with its own `qid`, a rescission naming exactly one. Four confirmations are stated and tested: `Q1 + Q2` valid ⇒ **both active**; rescind `Q1` ⇒ **`Q2` remains**; **no count changes semantic authority**; **exact replay is idempotent and a duplicate logical command creates no duplicate semantic identity**. §9.3.3, §5, §18.7, §19.5 and §25.5 are aligned to the same number. | **IC** (removes a contradiction; the fold's semantics were already accepted) | cardinality representation → **B2S** |
| **JBA16-AUD-04** | V1.6 chose **YES** — a disposition event **is** a valid quarantine target (DE-8, IQ-3) — but `DISPOSITION_EVENT_ADMISSIBLE(e)` **never consulted whether `e` itself is quarantined**. **Quarantining a bad quarantine therefore had no operative effect.** Recursive disposition also had no well-foundedness rule: nothing prohibited self-targeting, ancestor-targeting or a `Q1→Q2→Q1` cycle, and DS-5's termination argument — *"an admissible event has no further disposition"* — was **circular**. | **The choice is retained and made executable.** §9.3.3.2 separates **`DISPOSITION_EVENT_STRUCTURALLY_VALID`**, **`DISPOSITION_EVENT_GENERATION_AUTHORIZED`** and **`DISPOSITION_EVENT_CURRENTLY_QUARANTINED`**, and derives **`DISPOSITION_EVENT_EFFECTIVE`**. **Only an effective event participates in the fold** (§9.3.3.3), so **an event that is itself validly quarantined MUST NOT act.** §9.3.3.7 defines the **`DispositionControlGraph`** and requires it acyclic (**`DG-01`**), prohibiting self-target, ancestor-target and every longer cycle. **Termination is proved by control depth over a finite DAG** (DG-8). **`DCG-1`…`DCG-8`** are the required tests. | **AC** (the effective predicate and the control graph) + **IC** (makes an already-chosen rule operative) | fold implementation → **B2S** |

## A.1 What V1.7 deliberately does not do

| # | Not done | Why |
| :-- | :-- | :-- |
| **ND-1** | **No accepted area is redesigned.** | Twenty-four frozen areas plus everything the V1.6 audit accepted; Part E verifies each. Typed eligibility, the content-addressed fold, `SG-R`/`SG-S`, `IQ-9a`/`IQ-9b`, the S-2 contract, `RS-1` as corrected and O-01 are untouched in substance. |
| **ND-2** | **No fixed-point calculus is invented.** | A DAG prohibition models the accepted B1→B2 construction layering exactly, so the simpler architecture is chosen and **`CD-8` records why**. Iteration-until-stable and latest-wins are **prohibited**, not merely unused. |
| **ND-3** | **`HARMFUL` is not defined by which scientific answer is preferred.** | `AN-1a` defines it **structurally**: an erroneous control event is harmful iff it is **operative** — it is `DISPOSITION_EVENT_EFFECTIVE` **and** its presence changes the authoritative eligibility of its target. A non-operative event cannot be harmful whatever the answer looks like. |
| **ND-4** | **`RS-1` is carried unchanged.** | The V1.6 correction was independently accepted. `SG-R` may inspect explicit records, endpoints and provenance it references; it is independent only of the scientific survivor. **No further redesign.** |
| **ND-5** | **No opportunistic cleanup.** | Only the four findings and the consequential edits required to keep **one** operative composition. |

---

# PART B — CHANGED ARCHITECTURE DECISIONS

Four decisions changed. Everything else is carried from V1.6 unchanged and restated in full in Part C.

### B.1 Citation dependency is an explicit, classified, acyclic graph *(JBA16-AUD-01)*

| | V1.6 | **V1.7** |
| :-- | :-- | :-- |
| Which references are eligibility edges | implicit | a **closed classification table** — semantic citation · mere provenance · structural endpoint (CD-3) |
| Cyclic citation | **undefined recursive equation** | **prohibited** (`CD-01`); if one physically enters, **every member fails closed**, typed error, **no winner** (CD-7) |
| Evaluation order | unstated | **stratified**: primitive axes → disposition fold → citation recursion → set validation → seed and scope (CD-9, §9.3.9) |
| Termination | unstated | **proved** — finite DAG, at most `\|R\|` steps, unique value (CD-9) |
| Iteration to a fixed point | implicitly available | **prohibited** (CD-8) |

### B.2 The persisted-class registry is closed and exhaustive *(JBA16-AUD-02)*

| | V1.6 | **V1.7** |
| :-- | :-- | :-- |
| Class rows | 14, claimed exhaustive | **21**, with a **subsumption register** for every other logical name (§9.3.8.3) |
| Questions per class | 4 | **8** — adding citation participation, disposition-control eligibility and deletion behaviour |
| Omitted classes | source-native relations, decomposition ambiguity, non-grounding markers, affected-scope, structural-admission, integrity-error history | **each classified explicitly**, or **normatively subsumed by name** |
| `AM-10` | usable for anything unlisted | **`AM-10a`** — never for a class this document already names |

### B.3 Quarantine cardinality is `0..N` *(JBA16-AUD-03)*

| | V1.6 | **V1.7** |
| :-- | :-- | :-- |
| §23.1 | `0..1` active quarantine per record | **`0..N` active quarantines per target record** |
| §9.3.3.3 | set-valued fold | **unchanged — §23.1 is aligned to it**, not the reverse |
| Which is authoritative | **ambiguous** | the **fold**; `MQ-2`, `MQ-5`, `DQ-2` and `AT-23n` test the `N > 1` behaviour |

### B.4 A disposition event that is itself quarantined does not act *(JBA16-AUD-04)*

| | V1.6 | **V1.7** |
| :-- | :-- | :-- |
| Event operability | `DISPOSITION_EVENT_ADMISSIBLE` only | **three separated predicates** plus derived **`DISPOSITION_EVENT_EFFECTIVE`** |
| Quarantining a bad quarantine | declared possible, **no operative effect** | **the target event stops acting**, and the underlying record is **recomputed** (`DCG-2`) |
| Rescinding that quarantine | undefined | the suppressed event is **reconsidered under its own basis** — and **rescission never makes it scientifically valid** (`DCG-3`) |
| Self-target / ancestor-target | unprohibited | **self-target individually, record-level `SG-R`-invalid** (`DG-2`); **a proposed ancestor-target edge rejected at write time as a prospective admission test, never as a record-level property of an already-persisted event** (`DG-3`, narrowed in V1.8) |
| `Q1→Q2→Q1` | undefined | **control cycle** — affected target scope **fails closed**, typed error, **no winner, no recency resolution** (`DG-4`, `DCG-6`) |
| Termination | circular argument | **proved by control depth over a finite DAG** (DG-8) |

---

# PART C — COMPLETE ARCHITECTURE CONTRACT

## 1. Executive architecture decision

B is split into two stages that must never be collapsed, because they answer different questions.

**B1 asks:** *what did each source natively assert, as its own representation presents it?*
**B2 asks:** *how many real-world purchases happened, and which assertions describe each one?*

1. **A source-graded observation layer (B1).** Each admissible observation is ingested once, immutably, as a `SourceObservation` carrying provenance, **authorship domain**, evidentiary class, **semantic scope**, times, participant binding, **trusted-generation provenance** and raw material. B1 asserts nothing about how many purchases occurred. **A source observation is preserved whatever its eligibility; preservation and grounding are different questions** (§9.3.2).
2. **A one-assertion candidate layer (B1).** An `OccasionCandidate` represents **one individually addressable purchase-shaped assertion**. **Emission is deterministic** (§8.2.6): every candidate-grounding such assertion yields exactly one candidate, every non-grounding one yields none.
3. **An append-only adjudication layer (B2).** Occurrence, plurality, merchant, equivalence and linkage are established by explicit `ReconciliationAdjudication` events over a **validated** supersession graph, under **typed eligibility predicates over three independent record axes** (§9.3), with **disposition state derived by an append-only, content-addressed fold over effective events** (§9.3.3), **citation dependency confined to an acyclic graph** (§9.3.5.1), and an **integrity seed that ranges only over records whose scope is defined** (§9.3.6).
4. **Four distinct B2 factual outputs.** Resolved canonical occasions; **Type A** unresolved-plurality clusters; **Type B** occurrence-unresolved subjects; aggregate exposure facts.
5. **Opaque identity, minted never derived** — including **disposition-event identity**, so a rescission can name exactly what it rescinds.
6. **Historical identity separated from active occurrence**, and both — together with the **structural-integrity history itself** — subordinate to a controlling legal deletion obligation whose residue guarantees are **conditional**.
7. **A firewall in both directions, with inherited rules respected on both sides and no more.**

### 1.1 The four corrections that define this revision

**First — a mutual recursion is not a definition.** V1.6's `PROJECTION_INPUT_ELIGIBLE` and `CITATION_SOUND` could refer to one another without limit. §9.3.5.1 states **exactly which references are eligibility-dependency edges**, requires the resulting graph to be **acyclic** (`CD-01`) in the direction of the accepted B1→B2 construction layering, and **proves termination**. A physically present cycle **fails every member closed** with a typed error; **no member is selected, and no fixed point is guessed**.

**Second — an enumeration is exhaustive only if it is closed.** §9.3.8 is reissued as a **registry of twenty-two persisted classes** *(twenty-one in V1.7, plus V1.8's `LateActualTransactionFactSatellite`)*, each answering **eight** questions, with **§9.3.8.3** disposing of every other logical name in this document by explicit subsumption or explicit exclusion. `AM-10` remains for genuinely future classes and **may not be used for one already named** (`AM-10a`).

**Third — one cardinality.** The fold is set-valued; §23.1 now says **`0..N`**. Two valid quarantines are both active, rescinding one leaves the other, **no count carries semantic authority**, and replay is idempotent.

**Fourth — an event that is suppressed must actually stop acting.** `DISPOSITION_EVENT_EFFECTIVE` adds the conjunct V1.6 omitted: **not itself validly quarantined**. §9.3.3.7's `DispositionControlGraph` is required acyclic, so the recursion terminates on **control depth**, and `DCG-1`…`DCG-8` fix the exact behaviour — including that a rescission **restores the suppressed event's ability to act and never its scientific validity**.

All four corrections **construct** something V1.6 asserted or left open. None changes an accepted rule: no bare label grounds anything, B1 still reconciles nothing, quarantine still cannot select a survivor, `SG-S` still fails closed terminally, `RS-1` stands as corrected, and the S-2 contract is untouched (Part O).

---

## 2. Authority and exact baseline

### 2.1 Exact baseline

```
Baseline commit : 6cde4342a6d12d4339c58560da45c2458821deaf
Baseline tree   : 8cec9d2d8e437ee6ca081b16b4b5321aa1cb247a   (verified — matches expected)
Rejected B1     : a586b3119da2cc1aa4668485b129dbe625ab5cae
Rejected tree   : ae31d6649303d04bd334ef1bf93ec56b915d39fe   (verified — matches expected)
```

All authority was read content-addressed from the baseline commit's blobs (`git show 6cde434:<path>`). **No working-tree copy was used as normative input.**

### 2.2 Working-tree condition — recorded, not silently accepted

```
HEAD at authoring time  : a586b3119da2cc1aa4668485b129dbe625ab5cae   (the REJECTED B1 implementation)
Index/worktree tree     : f700b89035b3d92cd1ee12ce06db55d75cf91c95   (not equal to the baseline tree)
```

The working tree carries the rejected B1 runtime plus staged operator work on `PAGAMENOS_SPEC_AUTHORITY.md`, `PAGAMENOS_R_B_17_AUTHORITY_REPAIR_REPORT.md`, `PAGAMENOS_PHASE_0A-2_REDTEAM_PATCH_REV2.md` and the `docs/authority/archive/` tree.

**Mitigation applied.** No authority was read from the working tree. The repository was **not** mutated — no checkout, reset, stash, clean, commit, push or amend. This artifact is a **document-only, untracked candidate**, and **V1.5 was neither amended in place nor deleted.**

**Consequence, stated honestly.** Baseline identity is satisfied for the content this document derives from. The clean-worktree precondition is **not** satisfied; rehoming is an outstanding operator action (**OP-1**, Part P.5) and is **not** part of this repair.

### 2.3 Authority chain, in precedence order

| Precedence | Document | Role here |
| :-- | :-- | :-- |
| Base 1 | `PAGAMENOS_PHASE_0A-2_RT04_MICROPATCH.md` | RT-04 closure |
| Base 2 | `PAGAMENOS_PHASE_0A-2_REDTEAM_PATCH_REV2.md` **as amended** | §6.A (amended), §6.B–§6.F, §7, §8 (amended) |
| Base 3 | `PAGAMENOS_PHASE_0A-2_REDTEAM_PATCH.md` | RT-08, **RT-09**, RT-10, **RT-11**, RT-12, **RT-13**, RT-14 |
| Base 4 | `PAGAMENOS_PHASE_0A-2_FINAL.md` | §21 `Outcome`/VS ladder, §22, §23, §24, §25, §26, §30, **§40 milestone register (M7 = *Outcomes + VS ladder + evidence*)** |
| Background | `PAGAMENOS_PHASE_0A.md`, `PAGAMENOS_PHASE_0A_1.md`, `PAGAMENOS_PHASE_0A-1B.md` | meaningful-opportunity threshold — **C2-owned** |
| Milestone | `PAGAMENOS_M3_5A_IMPLEMENTATION_REPORT.md` | decision persistence, receipts |
| Milestone | `PAGAMENOS_M3_5B_A1_EFFECTIVE_SPEC_V2_1.md` | participant, assignment, consent, trusted participant context, capability matrix (§11/§13), append-only DB discipline (§21) |
| Milestone | `PAGAMENOS_M3_5B_A2_EFFECTIVE_SPEC_CANONICAL_V1.md` | capture identity, trusted `entrySource` (§8.4), receipts, P2002, **capability matrix (§28)**, DB invariant matrix (§29), §44 |
| **Controlling B semantics** | `PAGAMENOS_M3_5B_B_SEMANTIC_RATIFICATION_V1_3.md` | R-B-01…17, HR-B-01…10, P-01…19, O-01…17, JA-01…07 |
| Authority state | `PAGAMENOS_R_B_17_AUTHORITY_REPAIR_REPORT.md`, `PAGAMENOS_SPEC_AUTHORITY.md` | register, phase spine, accepted-milestone register |

Archived A1 V1/V2, A2 V1–V4.5, B ratification V1/V1.1/V1.2, the blocked B1 Effective Spec V1, and JBA revisions V1…V1.6 are **non-normative evidence only**.

> **The negative authority fact, carried unchanged.** **`Outcome` appears nowhere in the accepted A2 canonical specification**, and A2 §28's trusted capability matrix contains **no M7 or `Outcome` capability**. `Outcome` belongs to **M7**, which the accepted register lists as **not implemented and without an accepted effective specification**. §18.4.6 rests on this, and it is **accepted and frozen** (`JBA14-AUD-02` CLOSED).

---

## 3. Scope / non-scope

**In scope.** Shared B semantics: the source taxonomy, its levels, semantic scopes and authorship domains; evidentiary sufficiency and the bounded joint-sufficiency rule; `Outcome`'s role and the status-label principle; the RT-09 disambiguation; `intendedTransactionAt`; assertion unity and deterministic candidate emission; the B1/B2 boundary; the reconciliation/adjudication model, its levelled graph invariants, **its three record axes, its four typed eligibility predicates, its content-addressed disposition fold, its citation-dependency rule, its typed integrity seed and its per-class totality discharge**; the minimal fail-closed scope and the recovery model; cluster typing and factual bounds; the B1→B2 preservation contract; factual individuation; shared projection policy; B2→C1 ordering; provenance architecture; event/knowledge time; identity, **including disposition-event identity**; the legal-deletion capability and its conditional residue model; participant and merchant contracts; idempotency, decomposition and receipt responsibilities; the five-class enforcement taxonomy, the `DB-03A`/`DB-03B` split and the S-2 trusted-generation contract; the adversarial model.

**Out of scope.** Exact B1/B2 table, schema, model, index, DTO or field names; migration SQL; the full B1 or B2 service API; **the physical mechanism by which trusted-generation provenance is protected, for any class**; **the physical representation of quarantine and rescission identity**; the B2 reconciliation algorithm; C1 attribution schema; C2 independence; C2 UNKNOWN treatment; RIVSR; the final denominator; the meaningful-opportunity threshold; final scientific windows; **and any C2 rule inherited authority does not already fix at the scope the authority gives it.**

**No code, no repository mutation.** No change to Prisma, migrations, runtime services, tests, CI or the trusted harness. B1S and B2S were not begun. V1.5 was not amended and not deleted.

---

## 4. Binding semantic invariants

| # | Invariant | Authority |
| :-- | :-- | :-- |
| **BI-01** | A canonical `PurchaseOccasion` means **one real-world attempted or realized purchase**. Not a finalized `PurchaseIntent`, an API request, a decision request, an `Outcome`, a `WeeklyExposureReport`, a payment record, or a source-system record. No app-side fact alone establishes one. | R-B-01, P-01 |
| **BI-02** | B is two stages: B1 owns **Purchase Observation / Occasion Candidate Identity**; B2 owns **Purchase Occasion & Exposure Reconciliation**. | R-B-02 |
| **BI-03** | **Candidate existence never implies occasion existence.** Candidates are never countable analysis units and are never exposed to C2 as analysis units. | R-B-02, R-B-11 |
| **BI-04** | **Real-world distinctness** is B2's; **scientific independence** is C2's. C2 must never change a canonical occasion count B2 resolved, and must never contradict a factual bound B2 established. | HR-B-02, P-12, P-12a |
| **BI-05** | Data-model capability is not analysis eligibility. B may **preserve** facts C needs; B must not **decide** final numerator or denominator eligibility, scientific independence, UNKNOWN treatment, sensitivity/bounds design, the economic threshold, final analysis windows, or any final C2 classification. | ratification §4.3, ratification §4.5, P-06, P-06a, P-07 |
| **BI-06** | Intent-to-occasion is **not** 1:1 — zero, one or many in both directions where distinctness is established. `UNIQUE(originIntentId)` and equivalents are **forbidden** as canonical identity. A required singular `createdFromIntentId` is **superseded**. Synthetic `PurchaseIntent`s are **forbidden**. | R-B-04, R-B-05, P-02, P-11, P-19 |
| **BI-07** | Provenance is **separable from identity**. No source-system identifier is canonical identity. One sufficiently authoritative source **may** ground establishment; two-source corroboration is **not** universal. | R-B-06, HR-B-08, P-15 |
| **BI-08** | The canonical merchant is the **real-world** merchant and is **never auto-copied** from an A2 intent. | R-B-07 |
| **BI-09** | Every **active** canonical `PurchaseOccasion` has **exactly one** `StudyParticipant`, immutably, DB-provably, derived without trusting a caller-supplied `participantId`. A privacy tombstone (§16) is not an active canonical occasion and is outside this invariant's subject. | R-B-08, P-18 |
| **BI-10** | Occasion merge, split and lineage must **not** be inferred from the A2 invalidation/replacement lineage. | P-04, A2 §24/§44 |
| **BI-11** | Merge, supersession and correction are **append-only adjudication history**. No silent rewrite of scientific history. | R-B-10, R-B-13 |
| **BI-12** | `TIMESTAMPTZ(6)` with full microsecond precision wherever persisted. JavaScript `Date` must not be the canonical representation where truncation is possible. **No timestamp is canonical identity.** | R-B-12, P-08 |
| **BI-13** | No digest is required. None may be stored unless PostgreSQL verifies its **semantic content**, not merely its syntax. | R-B-14, P-09 |
| **BI-14** | A receipt is a **pointer**, never identity authority. Resolution must re-prove target and material ownership. A receiptless winner **fails closed**. | R-B-15, P-10, O-10 |
| **BI-15** | **No implicit** *latest-wins*, *first-wins* or *highest-confidence-wins* selection in any analysis-facing projection. No projection may be implemented before its selection rule is accepted. | HR-B-03, P-14, O-11 |
| **BI-16** | The four provenance states must remain distinguishable and may coexist: `A2_ENTRY_SOURCE_PRESENT`, `NON_A2_PROVENANCE_PRESENT`, `AFFIRMATIVE_NON_INDEPENDENCE_EVIDENCE`, `PROVENANCE_UNKNOWN`. **`PROVENANCE_UNKNOWN` must never become a negative determination.** | ratification §4.5, P-13, Rev 2 §6.D |
| **BI-17** | **Purpose limitation.** Nothing may be deleted, mutated or marked ineffective **in order to alter scientific results**. A controlling legal/consent/privacy deletion obligation **overrides** analysis retention, and it must never be claimed that scientific retention overrides it. **A lawful deletion may necessarily change available data, joins, analysable sample and historical references; that consequence is not a violation, and lawful deletion is not claimed to be analytically neutral.** | P-05 (verbatim purpose limitation), P-05a, Rev 2 §6.E |
| **BI-18** | **Anti-inflation, correctly divided and correctly scoped.** *On B2:* never assert distinctness evidence does not establish, and never collapse ambiguity into a resolved count. *Preserved inside C2 analysis:* plausible duplicates whose distinctness cannot be established **count as one for primary RIVSR**; ambiguity must not increase the numerator. **These invariants MUST NOT be re-expressed as B2 identity rules, and MUST NOT be extended beyond the plausible-duplicate class the amendment names** (§9.7.3, §22.3). | Rev 2 §6.A amendment, verbatim; ratification §8.1; **scope corrected per JBA12-AUD-06** |
| **BI-19** | `CanonicalEvent` telemetry must **never** create or repair a `PurchaseOccasion`. | RT-13 |
| **BI-20** | Before B1/B2 acceptance the hosted required-check surface must execute the authoritative **real-PostgreSQL** integration and adversarial suite. | R-B-16, HR-B-10 |
| **BI-21** | **C1 verification verdicts are not B occurrence authority.** B may consume an evidence *submission* fact **where a linked submission record exists** and the participant *assertion*; B must not consume verification success, verification failure, verified saving amount, or VS3/VS4 conclusions as occurrence authority — **and must not let a verdict influence which subjects are adjudicated** (§7.5). | R-B-03, O-13 |
| **BI-22** | **An identity row is not an occurrence claim.** Downstream factual consumption reads the **active occurrence projection**, never row existence. Identity permanence is **scientific permanence**, subordinate to a controlling legal deletion obligation. | ratification §4.2, P-05a |
| **BI-23** | **`STATUS LABEL ≠ DOMAIN FACT`.** An enumerated status value is **provenance metadata**. It asserts a real-world proposition **only where controlling authority explicitly defines the proposition that label asserts**. Where a status implies an underlying domain object, B may use that object's semantics **only if the object independently exists, is linked, and is re-provable**. The label's English name is **never** normative semantics. | R-B-01, P-01, P-13; **generalised per JBA12-AUD-01** |
| **BI-24** | **B1 does not reconcile.** B1 must not decide that observations from different sources or lineages describe the same thing, must not infer plurality, sameness or distinctness, and must not re-group candidates because later evidence changes real-world interpretation. Cross-source and cross-lineage equivalence is **B2-only**. | R-B-02, R-B-11 |
| **BI-25** | **Authorship is not transport.** A source's authority level attaches to the **factual provenance of the assertion** — who originated the fact — never to record ownership, storage location, write capability, transport trust, or collection method. **Researcher authorship is never inferred from a research collection path.** | R-B-06, HR-B-08, P-13; **added per JBA12-AUD-02** |
| **BI-26** | **Authority level is meaningful only within a semantic scope.** Every source class carries an authority level **and** a scope (§6.4). A fact may support a proposition only if its scope contains that proposition. **An aggregate fact never individuates a specific purchase, in either direction, at any authority level.** A higher level in the wrong scope never substitutes for the right scope, and no numerical confidence and no highest-authority-wins rule exists. | R-B-01, P-14, P-15, Phase 0A-2 §26; **added per JBA12-AUD-02/-03** |
| **BI-27** | **Informational dependence defeats corroboration.** A fact copied from, computed from, transcribed solely from, triggered solely by, derived from, or otherwise carrying no information beyond the assertion being corroborated is **not independent support for that assertion**. **A changed transport creates no new fact.** | HR-B-08, P-14, P-15; **added per JBA12-AUD-03** |
| **BI-28** | **Assertion unity is source-defined.** One `OccasionCandidate` binds **exactly one individually addressable source assertion**. A relation a source supplies between two separately addressable assertions is **preserved as provenance and merges nothing**. Whether such assertions describe one real purchase or several is **B2's** question. | R-B-02, R-B-11, R-B-06; **added per JBA12-AUD-04/-05** |
| **BI-29** | **Occurrence-established plurality and occurrence-unresolved are different states.** A Type A `UnresolvedPluralityCluster` may exist only where occurrence is established, and its factual **lower bound is `L ≥ 1`**. A state in which occurrence itself is unresolved is **not a cluster**, and no inherited count-one conclusion follows from it. | Rev 2 §6.A, ratification §8.1, P-13; **added per JBA12-AUD-07** |
| **BI-30** | **Structural-integrity quarantine is not scientific supersession.** Quarantine may exclude only **structurally malformed structural records** from graph admission; it may never target a substantive finding, never select a winner among competing findings, and never rewrite scientific history. It is append-only, attributable, and rescindable only by appending. | R-B-10, R-B-13, P-14; **added per JBA12-AUD-08** |
| **BI-31** | **Residue guarantees are conditional.** Typed deletion missingness, tombstones, deletion history, authorization records and severed-reference markers survive **where and only where controlling legal/consent/privacy authority permits that residue.** Where it does not, downstream sees **ordinary absence**, and **no proof the entity ever existed may remain**. No universal distinguishability between deleted and never-present is promised, and forbidden residue must never be reconstructed. | Rev 2 §6.E, ratification §4.2, P-05a; **added per JBA12-AUD-09/-10** |
| **BI-32** | **Every fail-closed guarantee names its verifier precondition.** A fail-closed authoritative read protects only against an actor who **cannot modify the verifier, its executable logic, or the trusted authority sources the verifier reads**. Against an actor who can, **no technical guarantee exists** and none is claimed. | P-10, R-B-15, R-B-16; **added per JBA12-AUD-11/-15** |
| **BI-33** | **The participant ceiling binds the authorship domain, not the artifact count.** Multiple participant-authored AL-1 assertions originating from the **same** `StudyParticipant` are **not jointly sufficient** to establish occurrence, however many separate reports, times, aspects, transports, artifacts or record types they span. They may ground candidates, preserve detail, corroborate **at the participant-assertion level**, and contribute alongside independently authored admissible evidence — but they may not cross the occurrence threshold without at least one **independently authored, `OCCURRENCE_SPECIFIC`** fact that is not ultimately participant-derived. **This creates no universal two-source rule** (P-15): a single AL-3 observation remains sufficient alone. | R-B-01, R-B-03, HR-B-08, P-15; **added per JBA13-AUD-03** |
| **BI-34** | **Persistence is not admission.** Exactly one predicate governs which records reach an authoritative projection: `ADMITTED(r) = persisted(r) AND STRUCTURAL_VALID(r) AND generation_sufficient(r) AND NOT CURRENTLY_QUARANTINED(r)` — over the **three independent axes** of §9.3.1, with class-scoped generation sufficiency (§9.3.2, TE-6). **Validation precedes admission.** A structurally invalid **or proven-unauthorized** record is **never** admitted, whether or not it has been quarantined; a quarantine **records a disposition** and does not **create** invalidity; and the **absence** of a quarantine does not make an invalid record valid. Rescission removes the disposition only — the record must still independently pass **both** `STRUCTURAL_VALID` and `generation_sufficient` (IQ-11a). *(V1.4 stated this predicate over two axes; the third is added per `JBA14-AUD-01`.)* | R-B-10, R-B-13, P-13, P-14; **added per JBA13-AUD-02, extended per JBA14-AUD-01** |
| **BI-35** | **Quarantine is a record-level remedy and can never select scientific state.** A quarantine is admissible only against a record that is **individually** structurally invalid by its own properties (`SG-R`), or independently proven unauthorized under **DB-03B**. A **set-level** violation (`SG-S`: cycle, branching), where no member is individually invalid, has **no quarantine remedy**; its scope remains fail closed. Quarantine must never answer *"which scientific finding should survive?"*: **a target must never be selected because excluding it produces a preferred survivor** (IQ-9a). **A legitimate exclusion may nonetheless change the projection** — recomputation over the admitted set after removing independently proven bad input is arithmetic, not selection (IQ-9b, BI-40). *(V1.4's blanket clause barring any remedy that would change the surviving projection is **withdrawn** per `JBA14-AUD-01`.)* | R-B-10, R-B-13, **P-14**; **added per JBA13-AUD-01, narrowed per JBA14-AUD-01** |
| **BI-36** | **Candidate emission is deterministic and total.** For every individually addressable, purchase-shaped assertion that is **candidate-grounding** under its source class, B1 **MUST** emit **exactly one** `OccasionCandidate`. For an individually addressable assertion that is **not** candidate-grounding, B1 **MUST** preserve it as observation/provenance and **MUST NOT** emit a candidate. Emission is never optional and never discretionary, and addressability alone never implies a candidate. | R-B-02, R-B-11; **added per JBA13-AUD-04** |
| **BI-37** | **Authorship and trusted generation are capability properties, not relational ones.** That a row's relations are structurally coherent proves **compatibility**, never that the asserted author produced it, that the trusted path created it, or that its source class, authority level and semantic scope were minted by authorized code. **A structurally coherent row is not, by itself, authoritative evidence of the authorship it claims**; that requires independently protected trusted-generation provenance (**DB-03B**, class **E-E**). | R-B-08, R-B-15, P-10, P-18; **added per JBA13-AUD-06** |

| **BI-38** | **A trusted parent does not authenticate a later child row.** A valid foreign key, lineage chain or reference proves **relation** — that two records are compatible and that one points at the other. It proves **nothing** about the child's own creation: not that an authorized path produced it, not that the asserted principal authored its payload, and not that its source class, authority level, semantic scope or authorship domain were minted by trusted code. **Trusted-generation provenance is a property of a record's own creation and is NEVER inherited across a reference.** A capability boundary protecting a parent entity's write path does not extend to a different entity written by a different milestone's path. | R-B-08, R-B-15, **P-10**, P-18; **added per JBA14-AUD-02** |
| **BI-39** | **Record state has three independent axes, and a valid disposition is effective.** A persisted record is characterized independently by `STRUCTURAL_VALID`, `GENERATION_AUTHORIZED` (three-valued) and `CURRENTLY_QUARANTINED` (§9.3.1); these must never be collapsed into one another. A record that is **excluded from admission** *and* carries a **valid disposition** — a quarantine naming a record-level basis that actually holds — **MUST NOT continue to seed the fail-closed scope merely because the raw row still persists** (§9.3.4). Exclusion without disposition fails closed; exclusion with a valid disposition permits recomputation over the remaining admitted set. | R-B-10, R-B-13, P-06a, P-14; **added per JBA14-AUD-01** |
| **BI-40** | **An exclusion's basis and an exclusion's consequence are different things.** A quarantine target MUST NOT be selected **because** excluding it produces a preferred scientific survivor or a desired projection. But where the target is independently established as `SG-R`-malformed or `GENERATION_AUTHORIZED = UNAUTHORIZED` **on evidence that does not depend on which projection survives**, exclusion is **permitted even though the resulting valid recomputation changes the projection**. Recomputing over the authoritative admitted set after removing independently proven bad input is **arithmetic, not winner selection** — and refusing to do so would let an unauthorized write permanently determine scientific state. | **P-14**, R-B-10, R-B-13; **added per JBA14-AUD-01** |

| **BI-41** | **Eligibility is typed, and no record enters a set whose scope is undefined.** There is **no single polymorphic admission predicate**. A record's participation is decided by **four typed predicates** — `SOURCE_PRESERVED`, `SOURCE_GROUNDING_ELIGIBLE`, `PROJECTION_INPUT_ELIGIBLE`, `INTEGRITY_SEED_ELIGIBLE` (§9.3.2) — and **the integrity seed ranges only over `INTEGRITY_SEED_ELIGIBLE` records**, every one of which names or belongs to a B2 subject and therefore has a **defined** `SCOPE` (§9.3.6). **For every record class the architecture admits, §9.3.8 states whether it can participate in a projection, whether it can seed, how its scope is obtained if it can, and what authoritative consequence its failure has if it cannot.** | R-B-10, R-B-13, P-14; **added per JBA15-AUD-01** |
| **BI-42** | **The failure of a non-seeding record is non-eligibility, and a dependency's failure is located at its consumer.** A record that cannot seed does not thereby become harmless: its failure means it **may not be cited** for the proposition it would have supported. Where an authoritative B2 record **does** cite a referent that is ineligible for the proposition being consumed, **the citing record fails `CITATION_SOUND` and the integrity failure is scoped to that citing record's own subject** (§9.3.5). **A canonical B2 subject MUST NEVER be invented for a referent merely because the referent exists** — in particular, a preserved-but-non-grounding source observation that no B2 artifact cites creates **no** fail-closed subject. | R-B-01, R-B-02, P-01, P-13; **added per JBA15-AUD-01** |
| **BI-43** | **Disposition state is derived, not stored, and a disposition event must be authorized to act.** `CURRENTLY_QUARANTINED` is **not a primitive**: it is derived from **`ACTIVE_QUARANTINES`**, a set fold over an **append-only, content-addressed** history in which every quarantine carries its **own immutable identity** and every rescission **explicitly targets exactly one such identity** (§9.3.3). **No ordering, recency, timestamp, counting or authority comparison determines the fold.** A disposition event acts **only** if it is itself **`GENERATION_AUTHORIZED = AUTHORIZED`** and capability-minted; a forged or `UNPROVEN` disposition event **cannot remove a valid scientific input**, is recorded as an **integrity anomaly**, and is dispositionable by the same mechanism with no special case. | R-B-10, R-B-13, **P-14**, P-10, P-06a; **added per JBA15-AUD-02** |
| **BI-44** | **Eligibility dependency is an explicit, classified, acyclic graph, and a cycle has a stated failure — never a guessed fixed point.** Every reference one B record makes to another is exactly one of three kinds (§9.3.5.1): a **semantic citation/dependency**, which is an edge of the **`CitationDependencyGraph`** and on which the citing record's `PROJECTION_INPUT_ELIGIBLE` may therefore depend; a **mere provenance/reference**, which creates **no** eligibility dependency; or a **structural endpoint relation**, which is an **`SG-R`** obligation and **not** an eligibility dependency. **The `CitationDependencyGraph` MUST be acyclic (`CD-01`)**, directed from later construction layers to earlier ones — **with the single named exception `CD-5a`** (added in V1.8: `AGGREGATE_INCONSISTENCY_OBSERVATION → ExposureFact`, proved not to reopen recursion) — so **no record obtains its eligibility from itself, directly or transitively.** Where a cycle physically exists, **no member is selected, no iteration to a fixed point is performed, and no ordering, recency or authority breaks the tie**: every member is ineligible, every member seeds, and the joint scope **fails closed** with a typed integrity error. **Evaluation is stratified and terminating** (CD-9). | R-B-10, R-B-13, R-B-02, **P-14**, P-13; **added per JBA16-AUD-01** |
| **BI-45** | **A disposition event that is itself validly quarantined MUST NOT act, and disposition control is itself an acyclic graph.** A `StructuralIntegrityQuarantine` or `QuarantineRescission` participates in the disposition fold only where **`DISPOSITION_EVENT_EFFECTIVE`** holds — its own structural validity, its own `GENERATION_AUTHORIZED = AUTHORIZED`, its capability minting, a resolving target, **and the absence of any active quarantine on the event itself** (§9.3.3.2). **The `DispositionControlGraph` — the directed relation from each disposition event to the record or event it controls — MUST be acyclic (`DG-01`)**: an event may not target itself (individually, record-level invalid, `DG-2`), and a **proposed** edge that would target an ancestor in its own control chain is **rejected prospectively at write time against the currently persisted graph** (`DG-3`, narrowed in V1.8) — never treated as a record-level invalidity of an event once persisted. Where a control cycle nonetheless physically exists, **no winner is selected and no timestamp or recency resolves it, and no member becomes individually invalid merely for being on the cycle**; the affected target scope **fails closed** with a typed integrity error. **The fold terminates on control depth over a finite acyclic graph**, and **the disposition layer never consults citation soundness or projection eligibility** (DG-8, CD-9). | R-B-10, R-B-13, **P-14**, P-10, P-06a; **added per JBA16-AUD-04** |

---

## 5. Terminology

| Term | Meaning | Owner | Never confuse with |
| :-- | :-- | :-- | :-- |
| **capture** | one A2 `PurchaseIntent` root via one immutable capture token | A2 | anything below |
| **purchase-decision occasion** | RT-09's unit: **one finalized `PurchaseIntent`** | A2 | canonical `PurchaseOccasion` |
| **`Decision`** | the A2/M3.5A decision artifact bound 1:1 to a finalized intent's decision request | A2 / M3.5A | `Outcome` |
| **`Outcome`** | the **M7** VS-ladder record attached to a `Decision`. **M7 is a separate milestone from A2, with no accepted effective specification** | M7 (unspecified at B level) | canonical `PurchaseOccasion`; an A2 artifact |
| **status label** | one of the seven enumerated `Outcome` status values | M7 | a real-world fact (BI-23) |
| **individually addressable assertion** | an assertion object the **source itself** identifies, references, and can correct or retract as a unit (§8.2.1) | the source | a B-inferred grouping |
| **candidate-grounding assertion** | an addressable assertion that is purchase-shaped, whose class grounds candidates, and whose participant binding is established under **both** `DB-03A` and `DB-03B` (§8.2.6) | this contract | any addressable assertion |
| **source-native relation** | a relation the source itself records **between** two separately addressable assertions | the source | assertion unity (BI-28) |
| **semantic scope** | what kind of proposition a source class can bear on (§6.3) | this contract | authority level |
| **authorship domain** | the principals whose assertions a fact **ultimately derives from** (§6.4.1) | this contract | authority level; record ownership |
| **`SourceObservation`** | one durable immutable ingested assertion from one admissible source | **B1** | the real-world event |
| **`OccasionCandidate`** | **one individually addressable purchase-shaped assertion** from one source | **B1** | `PurchaseOccasion`; **never counted** |
| **`PurchaseOccasion`** | **one real-world attempted or realized purchase**, resolved | **B2** | candidate; cluster; decision occasion |
| **`UnresolvedPluralityCluster`** *(Type A)* | occurrence **is** established over a member set whose **number** is not, with factual bounds `L ≥ 1` | **B2** | a Type B subject |
| **occurrence-unresolved subject** *(Type B)* | a subject on which occurrence itself is not established | **B2** | a Type A cluster (BI-29) |
| **`SOURCE_PRESERVED`** | may the record be retained and read as provenance? **True for every persisted record**, subject only to §16's legal-deletion override (§9.3.2) | **B1 / B2** | grounding eligibility; admission |
| **`SOURCE_GROUNDING_ELIGIBLE`** | may this observation ground a candidate and support occurrence for a given proposition? (§9.3.2, §8.2.6) | **B1** | preservation; projection participation |
| **`PROJECTION_INPUT_ELIGIBLE`** | may this record be read by the authoritative projection fold for a subject? (§9.3.2) | **B2** | grounding eligibility; seed eligibility |
| **`INTEGRITY_SEED_ELIGIBLE`** | may this record's failure seed a B2 fail-closed scope? **True only where the record names or belongs to a B2 subject**, so `SCOPE` is defined (§9.3.2, §9.3.6) | **B2** | projection eligibility (a record may be one without the other) |
| **`CITATION_SOUND`** | does every referent an authoritative B2 record cites satisfy the eligibility required for the proposition being consumed? (§9.3.5) | **B2** | the referent's own eligibility — **failure lands on the citing record** (BI-42) |
| **record-class tier** | the four-way classification of §9.3.8 — preservation-only, projection-input, disposition-control, control-plane — applied to a **closed registry of twenty-two persisted classes**, each answering **eight** questions, which discharges totality | this contract | the source taxonomy's S-classes; the construction layer (CD-4) |
| **record-level structural validity** (`SG-R`) | whether **one** record is structurally valid, decidable by inspecting **that record and everything it explicitly references** — including the endpoint properties `SG-03`…`SG-06` require — and **independent of which finding or projection would survive its exclusion** (§9.4.1) | **B2** | set-level validity; generation authorization |
| **set-level structural validity** (`SG-S`) | whether the **admitted set** is structurally valid — a property no individual member violates alone (§9.4.1) | **B2** | record-level validity |
| **generation authorization** | whether a record was **actually produced by the authorized capability path** — three-valued: `AUTHORIZED`, `UNPROVEN`, `UNAUTHORIZED` (§9.3.1, `DB-03B`) | **B2** to evaluate; **B1S** to represent | relational coherence (**BI-38**) |
| **disposition event** | a `StructuralIntegrityQuarantine` or a `QuarantineRescission` — an append-only integrity-control artifact that governs admission (§9.3.3) | **B2**, trusted integrity capability | a scientific adjudication (§9.5.8) |
| **quarantine identity** (`qid`) | the **opaque, immutable, content-addressable** identity of one `StructuralIntegrityQuarantine`, by which a rescission names it (§9.3.3.1) | **B2** | the identity of the record it targets |
| **`ACTIVE_QUARANTINES(t)`** | the **set** of **effective** quarantines targeting `t` for which **no effective rescission explicitly targets that exact `qid`** — a fold with **no ordering**, holding **`0..N`** members (§9.3.3.3, §23.1). Defined uniformly over records **and** over disposition events | **B2** | a boolean; a count that decides anything |
| **`DISPOSITION_EVENT_ADMISSIBLE`** | is this quarantine or rescission **well-formed, authorized and aimed at something that exists**? Requires the event's **own** `GENERATION_AUTHORIZED = AUTHORIZED`, capability minting, and a resolvable target (§9.3.3.2). **It is one conjunct of `DISPOSITION_EVENT_EFFECTIVE`, not the acting test** (DE-9) | **B2** | `DISPOSITION_EVENT_EFFECTIVE`; the truth of the basis it names (`VALID_DISPOSITION`) |
| **`VALID_DISPOSITION`** | does some **active** quarantine on `r` name a **record-level basis that actually holds**, re-provably, established independently of the surviving projection? (§9.3.4) | **B2** | `CURRENTLY_QUARANTINED` — the two must never be collapsed |
| **integrity anomaly** | a recorded, reportable defect in the integrity-control layer that **does not change what the projection would otherwise admit**, and therefore does **not** fail a subject closed (§9.3.3.6) | **B2** | a fail-closed seed |
| **fail-closed seed** | the set of `INTEGRITY_SEED_ELIGIBLE` records and violations that cause a scope to yield no authoritative projection (§9.3.6) | **B2** | the set of non-eligible records (**BI-41**) |
| **fail-closed scope** | the minimal authoritative graph region whose projection could be influenced by a seed member (§9.5.5) | **B2** | everything belonging to an affected participant |
| **semantic citation / dependency** | a reference on which the citing record's **eligibility depends**, because the citing record consumes the referent **in support of a proposition** (§9.3.5.1, CD-3) | **B2** | a preserved provenance reference; a structural endpoint relation |
| **mere provenance reference** | a reference **preserved verbatim** that supports no proposition and on which **no eligibility depends** — an A2-lineage reference, a source-native relation marker, a receipt pointer, an actor or knowledge-time annotation (RP-2, AU-3) | **B1 / B2** | a citation (CD-3 row 2) |
| **structural endpoint relation** | a reference whose well-formedness is an **`SG-R`** obligation of the referring record — a supersession edge's endpoints, a rescission's `qid` — and which is **not** an eligibility-dependency edge (CD-3 row 3) | **B2** | a citation; an admission input |
| **`CitationDependencyGraph`** | the directed graph whose vertices are persisted B records and whose edges are exactly the **semantic citations** of CD-3; **required acyclic** (`CD-01`) and directed from later construction layers to earlier ones, **with the single named `CD-5a` exception** (§9.3.5.1) | **B2** | the supersession graph (§9.4); the `DispositionControlGraph` |
| **construction layer** | the position of a record class in the accepted **B1 → B2** construction order, `L0` … `L5` (CD-4); a citation may point **only** to a strictly earlier layer, or within `L2` where CD-5 permits it, or via the single named `L2 → L5` exception `CD-5a`, and `CD-01` still forbids a cycle in every case | this contract | record-class tier (§9.3.8) — a different classification |
| **`DISPOSITION_EVENT_EFFECTIVE`** | may this quarantine or rescission **actually act**? Admissibility **and** the absence of any active quarantine on the event itself (§9.3.3.2, BI-45) | **B2** | `DISPOSITION_EVENT_ADMISSIBLE`, which is one conjunct of it |
| **`DispositionControlGraph`** | the directed graph whose edges run from each disposition event to the record or event it **controls**; **required acyclic** (`DG-01`), which is what makes the disposition fold terminate (§9.3.3.7) | **B2** | the `CitationDependencyGraph`; the supersession graph |
| **control depth** | the length of the longest chain of disposition events controlling a given record or event; finite because `DG-01` holds, and the induction variable of the fold's termination proof (DG-8) | **B2** | the allocation sequence (DB-13), which nothing in §9.3 consults |
| **`CONTROL_BASIS_FALSE`** | the record-level basis available **only against a `StructuralIntegrityQuarantine`**: the quarantine names a basis that **provably does not hold** for its own target, decided from that target's own axes (§9.3.4, IQ-15) | **B2** | a scientific disagreement — it is never available against a scientific record |
| **operative control event** | a disposition event that is `DISPOSITION_EVENT_EFFECTIVE` **and** whose presence changes the authoritative eligibility of its target; the **structural** definition of harm (AN-1a) | **B2** | a preferred scientific answer — harm is never defined by which result is liked |
| **persisted-class registry** | §9.3.8's **closed** list of twenty-two persisted classes, plus §9.3.8.3's subsumption and exclusion register; the registry, not any prose enumeration, is the authority on what classes exist | this contract | the source taxonomy's S-classes; the sixteen adjudication kinds |
| **protected verifier / control plane** | the executable verification and projection logic, the trigger and constraint definitions, the privilege model, and the trusted authority sources the verifier reads (§19.2) | operator + owning spec | the data it verifies |
| **trusted-generation provenance** | independently protected evidence that a record was actually produced by the authorized capability path (**`DB-03B`**, E-E) | **B1S** to represent; this contract to require | relational coherence (**`DB-03A`**); a parent's protection (**BI-38**) |
| **M7 ingestion integration contract** | the accepted contract under which B1S obtains re-provable trusted-generation provenance for the M7 `Outcome` write path — **absent, and therefore S-2 is non-grounding** (§18.4.7) | **B1S** | A2 §28's capability matrix |
| **scientific independence** | does an established occasion satisfy initiation/contamination/independence criteria? | **C2** | real-world distinctness |
| **opportunity** | a real occasion meeting the economic threshold | **C2** | `PurchaseOccasion` |

> **Superseded label.** `B1 Opportunity Identity` MUST NOT appear as an active normative label. The ratified label is **`B1 — Purchase Observation / Occasion Candidate Identity`**. The bare word *"occasion"*, unqualified, is retired from B usage (§23.2).

All role names are **logical**, not table, model or field names. Physical naming is reserved to B1S and B2S.

---

## 6. Source taxonomy — closes **O-01** (JA-01)

### 6.1 Governing principles

- **Authority levels grade evidentiary sufficiency an adjudication may cite**, never creation rights. No source at any level creates a candidate or an occasion automatically.
- **Authority attaches to authorship, not to transport** (BI-25).
- **The participant ceiling binds the authorship domain, not the artifact count** (BI-33). Participant-authored assertions do not sum past the ceiling by multiplying.
- **Every level is qualified by a semantic scope** (BI-26). The pair `(level, scope)` governs admissibility; the level alone does not.
- **One sufficiently authoritative source may ground establishment** (P-15 forbids a universal two-source rule) — but a combination must first pass the §6.8 gates and record the §6.8.6 basis.
- **Absence of a source is never FALSE** (BI-16, P-13).
- **No status label manufactures a real-world fact** (BI-23).
- **No source-system identifier ever becomes canonical identity** (BI-07).
- **A structurally coherent row is not evidence of the authorship it claims** (BI-37, §18.4). Class, level, scope and authorship are assigned by the **trusted ingestion path** and require independently protected provenance (**DB-03B**).
- **The taxonomy is closed.** Phase 0A data-minimization **prohibits** card numbers, credentials, balances, transaction history and bank access.

### 6.2 Authority levels

| Level | Meaning |
| :-- | :-- |
| **AL-0 — Non-admissible** | may not ground a candidate and may not be cited for occurrence; diagnostic context only |
| **AL-1 — Candidate-grounding, non-sufficient** | may ground a candidate and be cited as *partial* evidence within its scope; **never alone sufficient** for occurrence |
| **AL-2 — Corroborating** | may not alone ground a candidate; strengthens or contradicts within its scope |
| **AL-3 — Evidentiarily sufficient** | an adjudication **may cite this source alone** as sufficient evidence that one real purchase occurred |

**Participant-authored ceiling.** **No participant-authored source may exceed AL-1**, regardless of transport trust, session trust, upload integrity, content digest, storage owner or collection method. A trusted transport proves **who wrote the row**, **when**, and **which bytes** — never that the purchase occurred, nor merchant, time or amount truth. RT-09 already requires a content digest on `SavingEvidence` *to detect reuse*, which is inherited authority conceding that an upload is not self-proving.

> ### What the ceiling actually binds — **BI-33**
>
> **"Never alone sufficient" is a statement about the author, not about the artifact.**
>
> Read the other way, the ceiling would be defeatable by **artifact multiplication**: a participant who produces two, three or ten informationally distinct assertions about a purchase would eventually cross a threshold that a single assertion cannot. That reading empties the ceiling of content, because the number of artifacts a participant can author is not an evidentiary property of anything.
>
> The ceiling therefore binds the **authorship domain** (§6.8.4). **AL-1 + AL-1 from the same participant is still, in evidentiary terms, participant-authored material** — and remains non-sufficient no matter how the material is divided across reports, times, aspects, transports or record types.
>
> This is not a two-source rule. A single **AL-3** observation remains sufficient alone (**P-15**, §6.8.9).

**AL-3 therefore contains exactly one class: S-5**, a genuinely independent researcher factual finding.

### 6.3 Semantic scope — the second axis *(closes part of `JBA12-AUD-02` and `JBA12-AUD-03`)*

An authority level alone cannot answer every evidentiary question. A weekly aggregate held at a research-trusted level is not thereby evidence about *a specific purchase*; it is evidence about *a week*. Scope makes that explicit.

| Scope | What a source in this scope can bear on | What it can never do |
| :-- | :-- | :-- |
| **`OCCURRENCE_SPECIFIC`** | one identified real-world purchase: that it occurred, when, where, from whom, its merchant, its amount | — |
| **`AGGREGATE_EXPOSURE`** | counts, densities and coverage over a period; opportunity exposure | **individuate any specific purchase, in either direction** |
| **`CONTEXT`** | contact, prompting, contamination and behavioural context | assert that a purchase occurred or did not |
| **`PROVENANCE_ONLY`** | attribution, lineage, capture provenance, transport metadata | assert any real-world purchase fact |
| **`NON_ADMISSIBLE`** | nothing; may not be cited at all | everything |

> **BI-26, stated operationally.** A fact may support a proposition **only if the fact's scope contains that proposition.** `AGGREGATE_EXPOSURE` does not contain *"purchase P occurred"*, and does not contain *"purchase P did not occur"* either. **Scope is checked before level.** A higher level in the wrong scope is not a substitute for the right scope, and no arithmetic over levels exists.

**No numerical confidence is introduced. No highest-authority-wins rule is introduced.** Both would be P-14 mechanisms.

### 6.4 The taxonomy

| # | Source class | Scope | Grounds a candidate? | Alone sufficient? | Authority | Participant binding | Merchant binding | Event time | Knowledge time | Correction / retraction | Idempotency / identity | Absence means |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| **S-1** | **A2 decision-path facts** — capture token → intent → finalization → decision request → `Decision`/`DecisionSnapshot` | `OCCURRENCE_SPECIFIC` (as *intent*, not as occurrence) | **Yes** | **No** — app-side only | AL-1 | **structural**: `intent → captureToken → assignment → participant` | *intended* merchant only; never canonical | intent `initiatedAt`, context `capturedAt`; `intendedTransactionAt` = **intended** | A2 `recordedAt` | A2 append-only; correction = new context version; invalidation is **intent history only** | A2 immutable ids | `PROVENANCE_UNKNOWN` |
| **S-2** | **`Outcome`** (M7 VS ladder) — §7 | `OCCURRENCE_SPECIFIC` where an explicit assertion is present; else `PROVENANCE_ONLY` | **Only per §7.4** | **No** | AL-1 | via `Outcome → Decision → intent → token → assignment` | as *reported*; not canonical | as asserted, else UNKNOWN | trusted server record time | append-only correction observations | `Outcome` id + M7 idempotency key | `PROVENANCE_UNKNOWN` |
| **S-3** | **Participant self-report of a specific purchase** — an independently present report object asserting one identified purchase | `OCCURRENCE_SPECIFIC` | **Yes, where the report object exists** | **No** — participant ceiling | AL-1 | trusted participant context → own assignment (A1 §12) | participant-asserted | participant-asserted; often coarse or UNKNOWN | trusted server receipt time | participant may correct; append-only | report id + transport idempotency | `PROVENANCE_UNKNOWN` |
| **S-4** | **Participant-submitted transaction evidence — the submission act**: an actually present, linked, re-provable `SavingEvidence`/submission record | `OCCURRENCE_SPECIFIC` | **Yes, where the record exists** (§7.6) | **No** — participant ceiling | AL-1 | trusted participant context + evidence → outcome → decision chain | evidence-borne, adjudicated, never copied | evidence-borne transaction instant | trusted server upload time | withdrawable/retractable; verify-then-purge retention applies | evidence id + content digest (RT-09 reuse detection) | `PROVENANCE_UNKNOWN` |
| **S-5** | **Independent researcher reconciliation observation** — a trusted adjudicating researcher's own recorded factual finding about a specific real purchase, **authored by the researcher and not a transcription of a participant statement** (§6.5) | `OCCURRENCE_SPECIFIC` | **Yes** | **Yes** | **AL-3** | researcher capability + explicit participant reference verified against the cohort | researcher-established | researcher-recorded, may be coarse | trusted server record time | append-only correction with stated basis | researcher assertion id | `PROVENANCE_UNKNOWN` |
| **S-6** | **`WeeklyExposureReport`** — the inherited aggregate; **one authoritative report per participant-week, idempotent by `(participantId, studyWeek)`** | **`AGGREGATE_EXPOSURE` only** | **No** | **No** | **AL-2 within `AGGREGATE_EXPOSURE`; participant-ceilinged (AL-1) for any occurrence-bearing content** (§6.5.3) | `(participantId, studyWeek)` relation | merchant **counts**, not identity | the study **week** | `submittedAt` + trusted server time | **B observes the report as it exists. B invents no correction or revision mechanism.** If future upstream authority adds a correction contract, **JBA must be amended** or downstream specs consume that accepted contract. | inherited `(participantId, studyWeek)` | **MISSING**, never zero (Rev 2 §6.D) |
| **S-7** | **`ResearchContact`** (`WEEKLY_CHECK_IN`, `RESEARCHER_CONTACT`, `BEHAVIORAL_NUDGE`) | **`CONTEXT` only** | **No** | **No** | AL-2 within `CONTEXT` | research capability + `participantId` relation | none | contact instant | trusted server time | append-only | contact id | `PROVENANCE_UNKNOWN` |
| **S-8** | **`CanonicalEvent` telemetry** | **`NON_ADMISSIBLE`** | **No** | **No** | **AL-0** | envelope `participantId?` — **application-asserted, not relationally provable** | none | event `ts` | ingest time | n/a | event id | `PROVENANCE_UNKNOWN` |
| **S-9** | **Merchant / provider / payment-processor feeds** | **`NON_ADMISSIBLE`** (reserved, empty) | **Not admissible in Phase 0A** | n/a | **AL-0** | n/a | n/a | n/a | n/a | n/a | n/a | `PROVENANCE_UNKNOWN` |

**RT-13 is absolute for S-8**; per Phase 0A-2 §23 the **domain record wins** over any event. Phase 0A data-minimization is why S-9 is registered but empty.

### 6.4.1 Authorship domain — the third axis *(closes part of `JBA13-AUD-03`)*

Level answers *how much weight*. Scope answers *about what kind of proposition*. **Authorship domain answers *whose assertion is this, ultimately*** — and it is the axis the participant ceiling binds.

> **Definition.** The **authorship domain** of a fact is the set of principals whose assertions the fact **ultimately derives from**, following the six-concept separation of §6.5.1 and the informational-dependence forms of §6.8.2. Custody, storage, transport, collection, reporting and transcription **do not** change the domain (BI-25). Derivation, computation and transcription **preserve** the domain of the origin (D-2, D-3, D-5).

| # | Source class | Occurrence-bearing content authored by | Authorship domain for occurrence purposes |
| :-- | :-- | :-- | :-- |
| **S-1** | A2 decision-path facts | the **participant** — what they declared they intended; the app is transport. *(The trusted server-resolved fields — `entrySource`, capture and knowledge times — are system-authored but are `PROVENANCE_ONLY` in scope and are excluded from occurrence support by JD-1.)* | **participant** |
| **S-2** | `Outcome` | the **participant**, where an explicit payload assertion exists; otherwise the record bears no occurrence content at all (§7.4) | **participant** |
| **S-3** | Participant self-report | the **participant**, expressly | **participant** |
| **S-4** | Submission / `SavingEvidence` | the **participant** — the submission act and the submitted material | **participant** |
| **S-5** | Independent researcher observation | the **researcher**, as their own factual finding, **not** a transcription of a participant statement (§6.5) | **researcher — independent of the participant** |
| **S-6** | `WeeklyExposureReport` | the **participant** in every collection mode, unless an independently recorded researcher finding exists, which is S-5 (§6.5.3) | **participant** *(and `AGGREGATE_EXPOSURE`-scoped, so excluded from occurrence support by JD-1 in any case)* |
| **S-7** | `ResearchContact` | the **research operation**, as a contact record | **research operation** *(`CONTEXT`-scoped, excluded by JD-1)* |
| **S-8** | `CanonicalEvent` | application telemetry | **n/a — AL-0, `NON_ADMISSIBLE`** |
| **S-9** | Merchant / provider / processor feeds | a **third party**, independent of both participant and researcher | **third party — not admissible in Phase 0A** |

**Why S-1 and S-2 sit in the participant domain.** Their occurrence-bearing content is *what the participant declared or did in the app*. The application is the **custodian and transport** of that assertion, not its author (BI-25). This is not a new judgement: **R-B-01** already states that *the enumerated app-side facts are insufficient* to establish an occasion, and **P-01** prohibits treating a finalized intent as one. Placing them in the participant domain restates that, and applies it consistently.

> **Assignment is a trusted-path act, and it must be provable.** Source class, authority level, semantic scope **and authorship domain** are assigned by the trusted ingestion path, never by request content (AT-02, AT-02a). Because a forger can write a row asserting any of them, that assignment requires independently protected trusted-generation provenance — **`DB-03B`, class `E-E`** (§18.4, BI-37). Reading the row back does not verify it.

### 6.5 Authorship, transport and the six concepts *(closes `JBA12-AUD-02`)*

#### 6.5.1 The six concepts, never collapsed

| # | Concept | What it proves | What it does **not** prove |
| :-- | :-- | :-- | :-- |
| **1** | **Record owner / storage owner** | which system holds the row | anything about the content |
| **2** | **Transport or write capability** | who was able to write the row, and that the bytes arrived intact | who originated the facts in it |
| **3** | **Factual content author / origin** | **who asserted the fact** — the only thing authority attaches to | — |
| **4** | **Reporter** | who conveyed the assertion | that the reporter authored it |
| **5** | **Researcher transcription** | a researcher recorded what someone else said | that the researcher observed or verified it |
| **6** | **Independent researcher observation** | the researcher's **own** factual finding | — |

> **BI-25.** Authority attaches to concept **3**. Concepts 1, 2, 4 and 5 are **transport, reporting and custody**; none of them raises an authority level. Concept 6 is the only researcher-authored case, and it is **S-5**.

#### 6.5.2 Why this is not a new rule

The inherited data model already records the distinction and declines to resolve it: Phase 0A-2 §26 stores `collectionMethod: 'FORM' | 'RESEARCHER' | 'REMINDED'` on the report. That field says **how the report was collected**. It does not say who authored the counts inside it, and the same section describes the instrument as a *"lightweight weekly check-in"* whose purpose is to separate *"no opportunity"* from *"forgot PagaMenos"* — a participant-answered question in every collection mode.

#### 6.5.3 Applying it to `WeeklyExposureReport`

| `collectionMethod` | What it establishes | Authorship determination | Authority for occurrence-bearing content |
| :-- | :-- | :-- | :-- |
| `FORM` | participant submitted the form | participant-authored | **participant ceiling — AL-1** |
| `REMINDED` | participant submitted after a reminder | participant-authored; the reminder is an S-7 `CONTEXT` fact | **participant ceiling — AL-1** |
| `RESEARCHER` | a researcher collected the report | **UNKNOWN.** Collection is transport (concept 2/4/5). Researcher **authorship** is **not inferred** (BI-25). | **participant ceiling — AL-1**, unless an independently recorded researcher factual finding exists, which is **S-5** |

> **The rule.** A `WeeklyExposureReport` is **authoritative as the one report for that participant-week** — its inherited cardinality is untouched. That is **not** the same claim as *"every factual proposition inside it is independently researcher-authored evidence of a specific purchase."* The first is inherited (Phase 0A-2 §26). The second is not, and is not asserted.

**Unknown authorship is preserved as typed provenance, not resolved by default.** Where a source's authorship cannot be determined, the **participant ceiling applies** and the authorship state is recorded as UNKNOWN. That is the conservative direction: it never manufactures researcher authority, and it never converts UNKNOWN into a negative determination (P-13).

**A genuine researcher finding is never promoted through S-6.** If a researcher establishes a specific purchase, that finding is recorded as **S-5** in its own right, with its own identity, basis and knowledge time. It does not acquire AL-3 by being mentioned inside, or collected alongside, a weekly aggregate.

### 6.6 `WeeklyExposureReport` and specific occurrence — the explicit answer

#### 6.6.1 The question, answered

> **Can a `WeeklyExposureReport` participate in establishing a specific `PurchaseOccasion`?**
>
> **No.** Its scope is `AGGREGATE_EXPOSURE`. It reports *how many* covered purchases occurred in a week, and optionally *how many per merchant* — never *which*. It therefore **cannot satisfy JD-1** and can never be cited in a §6.7(a) occurrence basis, **however temporally compatible its counts may be.**

Turning `coveredPurchaseCount = 4` into four candidates would manufacture four assertions none of which was individually observed, each an unresolvable merge/split problem. `merchantOccurrences` does not change this: a count per merchant is still a count. **B2 reconciles the report as an `ExposureFact`** — which is why B2's charter is *"Purchase Occasion **& Exposure** Reconciliation"*. Rev 2 §6.C's ≥3-covered-occasion criterion is a **C2** computation reading occasions, clusters and exposure facts together; it is not a B occurrence rule.

#### 6.6.2 Symmetry — the correction recorded as `EXTENDED-1`

An aggregate cannot individuate in **either** direction.

| Situation | Recorded as | **Not** recorded as |
| :-- | :-- | :-- |
| Report says 0 covered purchases in a week where a candidate asserts one | an **aggregate-level inconsistency observation** attached to the exposure fact and the affected subject; triggers re-adjudication (§9.9) | evidence that the specific purchase did not occur |
| Report count exceeds the number of established occasions that week | an **aggregate-level inconsistency observation**; may motivate researcher follow-up | evidence that additional specific purchases occurred |
| Report count is temporally compatible with a candidate's claim | **nothing** — compatibility is not corroboration (JD-3) | corroboration of that candidate |

Reading an aggregate shortfall as evidence against a specific purchase would convert `AGGREGATE_EXPOSURE` missingness into a negative determination (**P-13**) and would breach Rev 2 §6.D's *missing is never zero*. Where missing, the state is **MISSING**.

---
### 6.7 Establishment predicate

> A **resolved canonical `PurchaseOccasion`** is established when, and only when, an explicit B2 `ReconciliationAdjudication` records that:
>
> **(a) Occurrence** — admissible evidence establishes that at least one real-world attempted or realized purchase occurred: either **one AL-3 `OCCURRENCE_SPECIFIC` observation cited alone**, or a **combination satisfying every gate and the recorded basis of §6.8**; **and**
> **(b) Plurality resolution** — the evidence establishes **how many** real purchases the observation set describes, and this occasion is one of them; **and**
> **(c) Participant** — exactly one participant is established through an accepted protected binding (§12, §18.4); **and**
> **(d) No standing contradiction** — no unretracted, unsuperseded contradicting `OCCURRENCE_SPECIFIC` observation of sufficient authority stands against occurrence.

Merchant resolution is **not** part of the predicate (§13). Establishment never requires C1 verification (BI-21), never requires two sources (P-15), and is **never automatic**.

**Where the predicate partially holds:**

| (a) | (b) | (c) | (d) | Result |
| :-- | :-- | :-- | :-- | :-- |
| ✔ | ✔ | ✔ | ✔ | one canonical `PurchaseOccasion` per enumerated purchase |
| ✔ | ✘ | ✔ | ✔ | **Type A `UnresolvedPluralityCluster`**, `L ≥ 1` (§9.7) — **zero** occasions |
| ✘ | — | — | — | **Type B occurrence-unresolved subject** (§9.7.2) — **not a cluster**, zero occasions |
| — | — | ✘ | — | **fail closed** — participant conflict is an integrity failure, not an ambiguity (§12, item 5) |
| ✔ | ✔ | ✔ | ✘ | no establishment while the contradiction stands; the subject projects `CONTESTED` |

### 6.8 Joint sufficiency — bounded, then recorded *(closes `JBA12-AUD-03` and `JBA13-AUD-03`)*

Where no single source is evidentiarily sufficient, §6.7(a) may be satisfied by a **combination**. A combination is admissible only if it passes **all four structural gates** and then records the **six-element basis**. **The gates are checked first and are not satisfiable by explanation.**

#### 6.8.1 `JD-1` — scope gate

> **Every fact cited in support of occurrence MUST be `OCCURRENCE_SPECIFIC`.**

An `AGGREGATE_EXPOSURE`, `CONTEXT` or `PROVENANCE_ONLY` fact **may not be cited for occurrence at all**, at any authority level (BI-26). Such facts may appear in the adjudication record as **context**, explicitly marked as non-supporting, and they contribute nothing to sufficiency.

#### 6.8.2 `JD-2` — informational-independence gate

> **A combination must contain at least two `OCCURRENCE_SPECIFIC` facts that are informationally independent of one another.**

**Informational dependence, defined.** A fact *F* is **informationally dependent** on an assertion *A* if *F* is any of:

| # | Dependence form |
| :-- | :-- |
| **D-1** | **copied from** *A* — a duplicate, echo, re-ingestion or re-delivery of *A* |
| **D-2** | **computed from** *A* — including any aggregate, count or derived value whose inputs include *A* |
| **D-3** | **transcribed solely from** *A* — a record of what *A* said, by anyone, through any path |
| **D-4** | **triggered solely by** *A* — a record whose existence is caused by *A* and whose content adds nothing |
| **D-5** | **derived from** *A* — a status, flag, projection or classification computed over *A* |
| **D-6** | otherwise **carrying no information not already carried by** *A* |

> **A changed transport does not create an independent fact.** Neither does a changed table, a changed record type, a changed collection method, a changed timestamp, or a second delivery. Independence is a property of the **information**, not of the **row**.

**This is not a universal two-source rule.** JD-2 applies **only** to the combination route. The AL-3 single-source route (§6.7(a) first branch) is untouched, and requiring corroboration from two or more sources as a universal establishment rule remains **forbidden** (P-15). JD-2 states what makes a *combination* a combination rather than one assertion counted twice.

#### 6.8.3 `JD-3` — probative-relevance gate

> **Each cited fact must be materially probative of the same proposition being established** — that *this* real-world purchase occurred.

| Insufficient by itself | Why |
| :-- | :-- |
| **Temporal coexistence** | that two facts share a time window says nothing about whether one bears on the other |
| **Generic contact or exposure context** | an S-7 contact or an S-6 aggregate establishes context or density, not this purchase (JD-1 also excludes them) |
| **Same participant** | participant coherence is a **precondition** (JS-1), not probative content |
| **A fact about a different proposition** | e.g. a merchant assertion is probative of merchant, not of occurrence, unless the source presents it as an assertion that the purchase occurred |

**Three roles, never interchangeable:** `occurrence-specific corroboration` · `aggregate exposure corroboration` · `contamination/context facts`. Each adjudication must state which role each cited fact plays (JS-6), and only the first counts toward §6.7(a).

#### 6.8.4 `JD-4` — authorship-domain gate *(closes `JBA13-AUD-03`)*

**The defect this closes.** JD-1 to JD-3 test *scope*, *information* and *relevance*. None of them tests *whose assertion it is*. Two self-reports by one participant about **different aspects** of the same purchase — say, one naming the merchant and time, another naming the amount and instrument — are `OCCURRENCE_SPECIFIC`, are not copies or derivations of one another, and are each probative of the same proposition. They pass all three gates. Sufficiency then rested on **JS-5 prose**, which is discretion, not a boundary — and the AL-1 participant ceiling became defeasible by producing more artifacts.

> ### The gate
>
> **If every occurrence-supporting fact in a combination ultimately originates within a single participant's authorship domain, the combination is NOT sufficient to establish occurrence.**
>
> A combination may satisfy §6.7(a) only where **at least one** cited occurrence-supporting fact is:
>
> **(i)** `OCCURRENCE_SPECIFIC` in scope; **and**
> **(ii)** **independently authored** — its authorship domain (§6.4.1) does **not** lie within the participant whose purchase is being established; **and**
> **(iii)** not ultimately derived, computed or transcribed from that participant's assertions (D-2, D-3, D-5).

**What remains permitted for participant-authored material.** It may **ground candidates**; **preserve detail**; **corroborate at the participant-assertion level** — that is, establish what the participant consistently asserted, which is a real and recorded fact about the assertions; and **contribute alongside** an independently authored fact once JD-4 is satisfied. What it may not do is **cross the occurrence threshold on its own account**.

**JS-5 cannot override this.** The gates run **before** the basis is read, and **FC-10** invalidates an `OCCURRENCE_ESTABLISHED` that breaches JD-4 regardless of what its basis records. No quantity or quality of prose reaches a gate.

**Elevation is authority's to grant, not an adjudicator's.** If controlling authority in future explicitly elevates a factual object beyond participant authorship — or admits a genuinely third-party occurrence source — JD-4 admits it automatically, because the gate tests the domain rather than a fixed list (**AM-7**).

#### 6.8.5 The anti-laundering register — combinations rejected by construction

Each row is rejected by the gate named, not by an adjudicator's judgement.

| # | Combination | Rejected by | Why |
| :-- | :-- | :-- | :-- |
| **AL-X-1** | participant self-report **+** duplicate delivery of the same report | **JD-2 (D-1)**, **JD-4** | one assertion, two rows; one authorship domain |
| **AL-X-2** | participant self-report **+** an `Outcome` status derived from that report | **JD-2 (D-5)**, **JD-4** | the status carries no information the report did not |
| **AL-X-3** | participant self-report **+** a `WeeklyExposureReport` whose count incorporates that report | **JD-1**, **JD-2 (D-2)**, **JD-4** | wrong scope; computed from the assertion; same domain |
| **AL-X-4** | evidence upload **+** an `Outcome` status derived from that upload | **JD-2 (D-5)**, **JD-4** | derived status, no new information |
| **AL-X-5** | two records whose only common factual origin is one participant assertion | **JD-2 (D-3/D-6)**, **JD-4** | one origin, two custodians |
| **AL-X-6** | participant assertion **+** a temporally compatible but non-probative AL-2 fact | **JD-3** | coincidence is not corroboration |
| **AL-X-7** | participant assertion **+** an `AGGREGATE_EXPOSURE` fact, however compatible | **JD-1**, **JD-4** | an aggregate never individuates (BI-26, §6.6) |
| **AL-X-8** | participant assertion **+** a researcher **transcription** of that same assertion | **JD-2 (D-3)**, **JD-4**, BI-25 | transcription is transport, not authorship |
| **AL-X-9** | **two separate self-reports by the same participant, informationally distinct** *(new)* | **JD-4** | passes JD-1…JD-3; **one authorship domain** (BI-33) |
| **AL-X-10** | **participant self-report + that participant's own evidence submission** *(new)* | **JD-4** | two artifacts, one author |
| **AL-X-11** | **participant assertions about two different aspects of one purchase** *(new)* | **JD-4** | informational distinctness does not change the domain |
| **AL-X-12** | **participant self-report + an A2 intent or `Outcome` payload assertion by that participant** *(new)* | **JD-4** | S-1/S-2 occurrence content is participant-authored (§6.4.1); also R-B-01 — app-side facts are insufficient |
| **AL-X-13** | **participant assertion + another participant-authored artifact of any kind** *(new)* | **JD-4** | the domain is the author, not the artifact type |

> **Explicitly forbidden and named.** *"Two AL-1 copies of the same participant assertion"* — and, now, *"two AL-1 participant-authored assertions that are merely different"* — **are not sufficient**, and **no recorded basis can make either sufficient**.

#### 6.8.6 The recorded basis — `JS-1` … `JS-6`

A combination that passes JD-1…JD-4 is admissible only where the adjudication **records** all six:

| # | Required element |
| :-- | :-- |
| **JS-1** | **Participant coherence** — every cited fact resolves to the same participant by a re-provable path (§12). |
| **JS-2** | **Source-specific corroboration semantics** — what each cited source's assertion *means* under its own §6.4 row and scope, and why that meaning bears on occurrence. |
| **JS-3** | **The independence finding** — which facts were held informationally independent under JD-2, and on what structural ground. |
| **JS-3a** | **The authorship finding** — which cited fact satisfies **JD-4(ii)**, its authorship domain, and the trusted-generation provenance relied on (**DB-03B**). |
| **JS-4** | **No circular use** of: **(i)** any C1 verification verdict; **(ii)** any status label as a fact (BI-23); **(iii)** any fact informationally dependent on the assertion being corroborated; **(iv)** any label-driven review-selection artefact (§7.5). |
| **JS-5** | **Why the combined facts establish occurrence rather than restate one assertion** — stated, not implied. **JS-5 explains a combination that has already passed the gates; it can never substitute for one.** |
| **JS-6** | **Per-fact roles** — which cited facts provide occurrence support, which provide aggregate or context material recorded as non-supporting, and how contradicting facts were handled. |

#### 6.8.7 What is deliberately not defined

**No fixed algorithm, no scoring function, no weighting table, no standing formula, no confidence value.** The gates bound the space; the basis records the reasoning inside it.

> **B2S obligation.** B2S **must** implement JD-1…JD-4 as structural preconditions and **must** require JS-1…JS-6 per adjudication. **B2S must not encode a standing rule that would make AL-1 sources mechanically sufficient**, and **must not permit any recorded basis to satisfy a gate** (ADR-14, AT-25, AT-25a).

#### 6.8.8 The Phase 0A consequence, stated rather than left to be discovered

JD-4 requires at least one independently authored `OCCURRENCE_SPECIFIC` fact. In the **current** taxonomy, exactly one class qualifies:

| Class | `OCCURRENCE_SPECIFIC`? | Independently authored? | Available as the JD-4 fact? |
| :-- | :-- | :-- | :-- |
| S-1, S-2, S-3, S-4 | yes | **no — participant domain** | **No** |
| S-5 | yes | **yes — researcher** | **Yes** |
| S-6, S-7 | no (aggregate / context) | — | No — JD-1 excludes them |
| S-8 | — | — | No — AL-0 |
| S-9 | yes | yes | **Not admissible in Phase 0A** (data minimization) |

> **Therefore, in Phase 0A, occurrence establishment requires an S-5 researcher observation** — which, being AL-3, is **sufficient on its own** (§6.7(a) first branch). **The AL-1-only combination route is consequently empty in the current taxonomy**, and this contract says so plainly rather than leaving a route that appears live but cannot be walked.

**This is consistent with inherited authority, not a departure from it.** **R-B-01** states that the enumerated app-side facts are **insufficient** to establish an occasion. **Rev 2 §6.A** contemplates *"manual research adjudication"* as the mechanism that resolves duplicates with an audit record. **Rev 2 §6.C** establishes the opportunity denominator from *"app records + `WeeklyExposureReport`s / **research reconciliation**"*. The inherited design already expects **research reconciliation** to be the establishing act; S-5 is exactly that class.

**The route is not closed permanently — it is empty because the taxonomy is currently narrow.** It re-opens automatically, with no amendment to JD-4, if any of the following occurs:

| Trigger | Effect |
| :-- | :-- |
| **AM-3** — a merchant/provider/processor feed (S-9) becomes admissible | a third-party `OCCURRENCE_SPECIFIC` class exists; JD-4 is satisfiable without S-5 |
| **AM-7** — controlling authority elevates some factual object beyond participant authorship | that object satisfies JD-4(ii) |
| A new independently authored occurrence-specific class is ratified | as above |

**What this does *not* mean.** It does **not** mean two sources are required — S-5 alone suffices (P-15). It does **not** mean C1 verification is required (BI-21, R-B-03). It does **not** mean participant material is worthless: it grounds candidates, preserves the detail B2 adjudicates over, and is exactly what an S-5 reconciliation reads.

#### 6.8.9 The legitimate single-source case, preserved

A genuinely independent researcher observation (**S-5**, AL-3, `OCCURRENCE_SPECIFIC`) that itself establishes a purchase satisfies §6.7(a) **alone**. It does not pass through §6.8 at all, and requiring it to find a second source would violate **P-15**.

---

## 7. `Outcome` contract — closes **O-02** (JA-02)

### 7.1 Ownership

**B1 consumes `Outcome`; it does not own it.** `Outcome` is a pre-existing M7 entity (Phase 0A-2 §21, §30). B1 must not redefine it, own its lifecycle, extend its status set, or write to it. Write ownership would place B1 inside the A2/M7 serialization order, which A2 §44 forbids.

### 7.2 Payload semantics are read, never inferred

Two opposite errors are both prohibited:

| Prohibited inference | Why prohibited |
| :-- | :-- |
| *"One `Outcome` may assert a retry sequence / evidence several purchases"* | invents payload content the inherited contract does not expose (P-01, BI-23) |
| *"One `Outcome` asserts **at most one** purchase-shaped fact, therefore `Outcome → Candidate = 0..1`"* | infers a payload bound from **RT-09's entity cardinality**, which constrains *how many `Outcome` records exist per Decision*, not *how many assertions one record's payload encodes* |

**The rule.**

> **B preserves whatever purchase-related assertion the authoritative `Outcome` object actually contains.**
> **B MUST NOT infer multiple purchases because B needs them.**
> **B MUST NOT infer a universal at-most-one payload fact from RT-09 entity cardinality.**
> **B-side cardinality derived from an `Outcome` is bounded by the authoritative representation actually available — no more, no less.**

Where the inherited object does not expose enough information to determine payload multiplicity, **linkage stays semantically open**: B1 preserves the raw fact and makes **no** cardinality claim. §23 records this as `SEMANTICALLY UNBOUNDED BY RT-09` rather than inventing `0..1` or `0..N`.

**What RT-09 does fix, and what it does not:**

```
RT-09 fixes (entity cardinality):
    one finalized PurchaseIntent  = one purchase-decision occasion
    <=1 final Decision            per finalized PurchaseIntent
    one Outcome                   per purchase-decision occasion / Decision
    one terminal VS3              per Outcome

RT-09 does NOT fix:
    how many purchase-shaped assertions one Outcome payload encodes
    how many B candidates one Outcome may ground
    how many canonical occasions one Outcome may support
```

**What remains true regardless:** **multiple `Outcome`s may support one canonical occasion** — RT-11 states directly that two Decisions/Outcomes from the same actual transaction MUST NOT count as two independent occasions. That is inherited and unaffected.

### 7.3 The status-label principle *(closes `JBA12-AUD-01`)*

Phase 0A-2 §21 reads, in full, for the status set:

> *"Statuses: intended · attempted · self-reported · evidence-submitted · evidence-verified · failed · abandoned."*

It **enumerates seven labels and defines none of them.** The section's normative content is the VS ladder, the VS3 rule for RIVSR, the nominal-value exclusion, and the instruction that *"raw fields captured; RIVSR computed only in analysis"*. Nothing there states the real-world proposition any label asserts.

> ### The principle — **BI-23**
>
> **An `Outcome` status label is, by itself, provenance metadata.**
>
> **It asserts a real-world proposition only where controlling authority explicitly defines the proposition that label asserts.**
>
> **The English of the label name is not that definition.** A label called `attempted` no more establishes an attempt than a label called `failed` establishes a failed purchase — and V1.2 was right about the second only because it had not applied the rule to the first.

**Four things that must never be conflated**, for every status:

| # | Thing | Status |
| :-- | :-- | :-- |
| **1** | the **bare label** | provenance metadata; asserts nothing (BI-23) |
| **2** | an **independently present, linked, re-provable domain object** the label implies | **admissible** — the object's own semantics apply, under its own source class |
| **3** | an **explicit assertion actually present** in the authoritative `Outcome` representation | **admissible** — read as what it says, no more |
| **4** | **semantics inferred** from the label's name, from ladder position, or from what B needs | **prohibited** |

### 7.4 All seven statuses under one rule

Applied uniformly. This table replaces every prior per-status ruling.

| Status | Ladder | Grounds a candidate on the **label alone**? | What B may read from the label | What may ground, independently of the label |
| :-- | :-- | :-- | :-- | :-- |
| *(VS0 — decision computed; not a status)* | VS0 | **No** | — | S-1 A2 decision-path facts, as *intent* |
| `intended` | VS1 | **No** | the label, as provenance | an intention is not an attempt (P-01); nothing follows |
| **`attempted`** | — | **No** *(changed)* | the label, as provenance | an **explicit purchase-attempt assertion actually present in the authoritative `Outcome` representation**; or an S-3 / S-4 / S-5 assertion of an attempt |
| **`self-reported`** | VS2 | **No** *(changed)* | the label, as provenance | an **independently present participant report object** asserting a specific purchase — ingested as **S-3** under its own class, with its own identity and knowledge time |
| `evidence-submitted` | — | **No** | the label, as provenance | an **independently present, linked, re-provable** submission record — **S-4** (§7.6) |
| `evidence-verified` | VS3 | **No** | the label, as provenance | the same linked submission record — **S-4**; the **verification verdict is never read** (BI-21) |
| `failed` | — | **No** | the label, as provenance | an independently established real-world purchase-attempt fact (S-3 / S-4 / S-5). See §7.4.1 |
| `abandoned` | — | **No** | the label, as provenance | an independently established real-world attempt fact. See §7.4.2 |

> **The symmetry that V1.2 lacked.** Every row now answers *"grounds on the label alone?"* the same way — **No** — and every row names the **independent** fact that may ground instead. No label is treated as self-defining, and none is read as its English name.

#### 7.4.1 `failed`

Phase 0A-2 §21 lists `failed` without defining it, and the nearest telemetry event in §24 is **`recommendation_failed`** — the *recommendation* failing, which is an app-side event and not a purchase attempt at all. Bare `failed` therefore carries occurrence stance **UNKNOWN** and is non-grounding.

**Not converted to negative.** `failed` is **not** evidence that no purchase occurred. UNKNOWN stays UNKNOWN (P-13, BI-16).

#### 7.4.2 `abandoned`

`abandoned` conflates *never attempted* with *attempted and gave up at the point of sale*. It grounds no candidate alone and establishes no non-occurrence; it is recorded with occurrence stance **UNKNOWN**. Reading it as *"no purchase happened"* is the `PROVENANCE_UNKNOWN` → negative conversion P-13 prohibits.

#### 7.4.3 What this costs, stated honestly

An `Outcome` whose **only** purchase-related content is a status label now yields **no** occurrence evidence — including where the label is `attempted` or `self-reported`. That is deliberate and conservative. Two things limit the cost:

1. **The real assertions survive.** Where the authoritative `Outcome` representation actually carries an explicit assertion, it is read (case 3). Where a participant genuinely reported a purchase, that report is an **S-3 object** with its own row, and it grounds. Where evidence was genuinely submitted, the **S-4 record** grounds. What is withdrawn is manufacturing those facts when the objects are absent.
2. **UNKNOWN stays visible.** A non-grounding label is not deletion and not a negative finding; it is preserved provenance, and the subject remains an open reconciliation state that a researcher may resolve through S-5.

**Amendment trigger `AM-1`** records that if upstream authority ever **defines** any of these labels, this section must be revisited.

### 7.5 The one permitted non-evidentiary use of a label — and its anti-bias obligation *(`EXTENDED-2`)*

A status label may be used **operationally**, to decide which subjects a human adjudicator reviews first. That is a triage act, not an evidentiary one.

| Permitted | Prohibited |
| :-- | :-- |
| queueing, filtering or prioritising adjudication review by label | citing a label, or anything derived from label-driven selection, in a §6.8.5 basis (**JS-4(iv)**) |
| recording that a subject entered review because of its label | treating review entry as evidence that a purchase occurred |

> **The risk, stated.** If review is queued by `evidence-verified` or `evidence-submitted`, established occasions will over-represent verified successes even though **no verdict was ever cited** — a route to **AT-19** success-biased establishment that citing rules alone do not close.
>
> **B2S obligation.** B2S **MUST** record **review provenance** — why each subject entered adjudication — so that selection is auditable and any label-correlated selection is visible to C2 rather than invisible. This contract does not fix the selection policy; it requires that the policy be recorded.

### 7.6 Structural lineage requirement for implied objects

> A status label implying an underlying domain object does **not** evidence that object's existence.

B may consume submission semantics **only** where an independently present, **linked and re-provable** `SavingEvidence`, submission record, or equivalent authoritative domain object **actually exists**:

| Situation | B may consume | B must not consume |
| :-- | :-- | :-- |
| **Linked submission record exists** | the **fact of submission**; the participant assertion/material; submission metadata | the verification verdict, verified amount, or VS3/VS4 conclusion (BI-21) |
| **Only the status label exists** | the label as **provenance metadata** | **anything as occurrence evidence** — the label generates none |

**Re-proof.** The link must be re-provable at read time (`Outcome → SavingEvidence`, and evidence → outcome → decision → intent → token → assignment), never trusted from a denormalized field — a forged link row must not survive re-proof (§17, DB-10, AT-04a), **subject to the protected-verifier precondition of BI-32**.

### 7.7 Participant authority, linkage, identity, retry

- **Participant authority.** Structural: `Outcome → Decision → PurchaseIntentDecisionRequest → PurchaseIntent → PurchaseIntentCaptureToken → ExperimentAssignment → StudyParticipant`. Never caller-supplied; never a denormalized copy trusted without re-proof (§18.5, DB-03A and DB-03B).
- **Decision linkage.** A preserved first-class fact — **linkage, not identity**.
- **Source identity.** `Outcome` row id plus its M7 idempotency key; ingesting the same `Outcome` twice yields **one** observation.
- **Correction/retraction.** Ingested as a **new** observation explicitly superseding the prior; the prior is never overwritten (BI-11).

**What `Outcome` is not.** Not a canonical `PurchaseOccasion`, and it does not become one by existing (BI-01, P-01).

---
## 8. Candidate model and assertion unity — the B1 core

### 8.1 What a candidate is

> **An `OccasionCandidate` represents exactly one individually addressable purchase-shaped assertion made by one admissible source.**

### 8.2 Assertion unity and candidate emission — defined here, not deferred *(closes `JBA12-AUD-04`, `JBA12-AUD-05` and `JBA13-AUD-04`)*

Two questions must both be answered here, and V1.3 answered only the first cleanly:

1. **What makes source material ONE B1 assertion** rather than two whose relationship must wait for B2? — §8.2.1 to §8.2.5.
2. **When must a candidate be emitted for such an assertion, and when must it not?** — §8.2.6.

Neither answer may depend on B judging whether the real-world purchase was the same; that is B2's (R-B-02, R-B-11, BI-24). Both therefore depend **only on the source's own representation and the accepted source taxonomy**.

#### 8.2.1 `individually addressable assertion` — the definition

> An assertion object is **individually addressable** when the **source system itself**:
>
> **(i)** gives it its own assertion identity distinct from its container; **and**
> **(ii)** can reference it as a unit; **and**
> **(iii)** can correct or retract it as a unit, independently of its siblings.
>
> All three must hold **in the source's own representation.** A payload fragment that B could point at, but that the source cannot address, correct or retract on its own, is **not** individually addressable.

#### 8.2.2 The unity rules

| # | Rule |
| :-- | :-- |
| **AU-1** | **One candidate binds exactly one individually addressable source assertion.** Nothing else establishes assertion unity. |
| **AU-2** | Several payload elements belong to **one** candidate **if and only if the authoritative source representation itself presents them as components, revisions or attachments of that one individually addressable assertion object.** Admissible examples: one report object with its own immutable assertion identity, plus its attachments; a correction or retraction **of that same source assertion**; evidence files the source explicitly attaches **to that same assertion**. |
| **AU-3** | **A source-native relation between two separately addressable assertions does NOT merge them.** The relation is **preserved verbatim as provenance**. Whether the two assertions describe one real purchase or several is **B2's** question, decided by adjudication (BI-28, BI-24). **It does not change the candidate count in either direction.** |
| **AU-4** | **Explicit enumeration.** Where one source payload **explicitly enumerates multiple individually addressable purchase assertions**, B1 **MUST** emit **exactly one candidate per enumerated assertion that is candidate-grounding under §8.2.6**, and **MUST** preserve the common container and its relation. **Receipt count, attachment count and array length are NOT assertion counts** unless the source itself semantically defines each member as a separate assertion under §8.2.1. *(V1.3 read `may` here; the modality is now fixed — see §8.2.6 and BI-36.)* |
| **AU-5** | **Composite ambiguity.** Where a payload contains composite material but the source **does not define assertion boundaries**, B1 preserves **ONE** `SourceObservation` / container, emits **no invented members and no member candidates**, records **typed decomposition ambiguity** for B2, and **does not decide purchase plurality**. |
| **AU-6** | **Plural language is not addressability.** A natural-language assertion of plurality (*"I tried twice"*) is **one** assertion whose **content** includes a plurality claim. It is preserved as a typed source-asserted plurality fact on **one** candidate. It does **not** become two candidates. |

#### 8.2.3 Relation preservation versus assertion unity — the two are separate

| | **Relation preservation** | **Assertion unity** |
| :-- | :-- | :-- |
| Cardinality | **`0..N`** — a candidate may carry any number of source-supplied references and relation markers | **exactly `1`** — one individually addressable assertion, always |
| What it means | *the source recorded a relationship* | *the source presented this as one assertion* |
| What it licenses | preservation, and B2 adjudication input | candidate membership |
| Effect on candidate count | **none** | **it is the count** |
| What it never licenses | **equivalence, sameness, plurality resolution, or candidate merging** | — |

> **A candidate never spans two source assertions**, regardless of how many A2 lineages, intents, decisions or `Outcome`s the **one** assertion it binds happens to reference. Referencing many is preservation (AU-3); spanning many is prohibited (AU-1).

#### 8.2.4 The operative unity test, stated once

> **Does the grouping exist in the source's own representation as one addressable assertion, or only as a relation between assertions — or only in B's judgement?**
>
> One addressable assertion → **one assertion unit (B1 reads it).**
> A relation between assertions → **separate assertion units, relation preserved (B2 decides).**
> B's judgement → **prohibited in B1 entirely (BI-24).**

#### 8.2.5 The downstream boundary

**B1S may decide the physical representation** of these accepted rules: how an assertion identity is stored, how relations are represented, how the manifest is serialized, and what constitutes an addressable assertion **for each concrete source adapter**, applying §8.2.1's three-part test.

> **B1S MUST NOT decide what assertion unity means, and MUST NOT decide whether a candidate is emitted.** §8.2.1, AU-1…AU-6 and §8.2.6 are settled here.

#### 8.2.6 Candidate emission — deterministic and total *(closes `JBA13-AUD-04`)*

**The defect this closes.** V1.3 asserted three things that could not all hold: AU-1 fixed *one candidate per addressable assertion*; `AT-24a` **required** two candidates for two addressable assertions; and AU-4 said B1 **may** emit one per enumerated assertion. The modality was contradictory, and the residue — *whether* to emit at all — would have fallen to B1S, which may not decide it. A second, opposite error lurked in the same place: reading AU-1 as *"every addressable assertion produces a candidate"* would emit candidates for addressable assertions that are not candidate-grounding at all.

##### The emission predicate

> An individually addressable assertion is **candidate-grounding** when **all three** hold:
>
> **(E-1) Purchase-shaped** — the assertion, **as the source actually states it**, asserts a specific real-world attempted or realized purchase. A bare status label is never purchase-shaped (BI-23, §7.4); an aggregate count is never purchase-shaped (BI-26, §6.6).
> **(E-2) Grounding source class** — the assertion's source class is marked *"grounds a candidate"* in §6.4, under the conditions that row states.
> **(E-3) Participant binding established** — the §18.4 minimum is satisfied: the participant is established through an accepted protected binding, with **`DB-03A`** relational coherence **and** **`DB-03B`** trusted-generation provenance.

##### The rule — **BI-36**

| # | Rule |
| :-- | :-- |
| **CE-1** | For **every** individually addressable assertion satisfying **E-1, E-2 and E-3**, B1 **MUST** emit **exactly one** `OccasionCandidate`. Emission is **not optional**, **not discretionary**, and **not a B1S choice**. |
| **CE-2** | For an individually addressable assertion that does **not** satisfy all three, B1 **MUST** preserve it as a `SourceObservation` / provenance as appropriate, and **MUST NOT** emit a candidate. **Addressability alone never implies a candidate.** |
| **CE-3** | Where **E-3 alone** fails — the assertion is purchase-shaped and its class grounds candidates, but the participant binding is not established — the observation is preserved and explicitly marked **non-grounding** (§18.4, §25.1). **No candidate is emitted**, and the deficiency is recorded rather than silently dropped. |
| **CE-4** | **N such assertions yield exactly N candidates.** Not fewer (which would be B1 merging — BI-24), and not more (which would be B1 inventing — AU-5). |
| **CE-5** | A **source-native relation** between two assertions leaves the candidate count **unchanged** (AU-3). |
| **CE-6** | A **composite payload with no source-defined assertion boundaries** yields **one container observation and zero member candidates** (AU-5, DC-02a) — plus typed decomposition ambiguity for B2. |
| **CE-7** | Emission is **idempotent**: re-delivery of the same source record yields the same candidate set by replaying the stored manifest, never a second set (DC-04, §17.2). |

##### The complete emission table — total over every input shape

| Input | **Candidates emitted** | Also preserved | Rule |
| :-- | :-- | :-- | :-- |
| 1 addressable, purchase-shaped, grounding assertion | **exactly 1** | the assertion, its attachments, its relations | CE-1 |
| N addressable, purchase-shaped, grounding assertions | **exactly N** | the container and its relation | CE-4, AU-4 |
| addressable assertion, **not** purchase-shaped (E-1 fails) | **0** | observation / provenance | CE-2 |
| addressable assertion, **non-grounding class** (E-2 fails) | **0** | observation / provenance | CE-2 |
| addressable, purchase-shaped, grounding class, **binding not established** (E-3 fails) | **0** | observation marked **non-grounding**, deficiency recorded | CE-3 |
| composite with **no** source-defined boundaries | **0 member candidates**; **1** container observation | typed decomposition ambiguity | CE-6, AU-5 |
| one assertion asserting plurality in its **content** (*"I tried twice"*) | **exactly 1** | typed source-asserted plurality claim | AU-6 |
| two separately addressable assertions **with** a source relation | **exactly 2** | the relation, as provenance | CE-4, CE-5, AU-3 |
| re-delivery of an already-decomposed record | **0 new** — the same set replayed | the stored manifest | CE-7 |

> **No `may` remains, and no false universal remains.** *"Every addressable assertion produces a candidate"* is **false** (CE-2). *"B1 may choose whether to emit"* is **false** (CE-1). The count is a **function of the source's representation and the accepted taxonomy**, and it is the same function for every B1S implementation.

### 8.3 `Outcome` and assertion unity — the four interaction cases resolved

Each case is resolved by the **semantic rule**; the physical schema is B1S's. Emission counts follow §8.2.6 and are **determined, not chosen**.

| # | Case | Resolution | Why |
| :-- | :-- | :-- | :-- |
| **1** | **One source row references two `Outcome`s** | If the row is **one** individually addressable assertion: **exactly one candidate** (CE-1), carrying **both** `Outcome` references as preserved provenance (AU-3, RP-2). **No** inference that the two `Outcome`s are equivalent, that two purchases occurred, or that either grounds anything (§7.4). | two references is a relation, not two assertions |
| **2** | **Participant says "I tried twice"** | **Exactly one candidate** (AU-6, CE-1), carrying a **typed source-asserted plurality claim (≥2)** as preserved content. B1 emits no second candidate and resolves nothing. B2 may cite the plurality claim as distinctness evidence toward a `DISTINCT_EVENT_FINDING`, or leave plurality unresolved. | plural language does not make two individually addressable events |
| **3** | **One upload contains two receipts** | If the source presents **one** submission assertion with **two attachments**: **exactly one candidate** (CE-1), two attached evidence items, plus **typed decomposition ambiguity** (AU-5, CE-6). B1 emits **exactly two** (CE-4) **only** where the source itself individually addresses each receipt as a separate purchase assertion under §8.2.1 **and** each satisfies E-1…E-3. | **two receipts are neither two purchases nor two assertions** |
| **4** | **Ambiguous composite payload** | **One** `SourceObservation` / container; **zero** member candidates; typed decomposition ambiguity preserved for B2 (AU-5, CE-6). | B1 does not decide plurality |

> **What is preserved in every case:** exactly what the source asserted, plus every relation marker it supplied, plus a typed record of the ambiguity B1 declined to resolve. What is withheld is B1's **judgement** — never the data (§21).

### 8.4 What B1 may and may not do

| B1 **must** | B1 **must not** |
| :-- | :-- |
| emit **exactly one** candidate per addressable, purchase-shaped, candidate-grounding assertion (CE-1) | decide that observations from **unrelated sources** describe the same thing |
| emit **exactly N** for N such assertions explicitly enumerated by the source (CE-4, AU-4, §17.3 manifest) | **merge** two separately addressable assertions into one candidate |
| emit **zero** candidates for an addressable assertion that is not candidate-grounding (CE-2) | emit a candidate **because an assertion is addressable** |
| mark an observation **non-grounding** where the participant binding is not established, and emit no candidate (CE-3) | emit a candidate on an unestablished participant binding (§18.4) |
| **preserve** every source-native relation and reference verbatim, changing no count (AU-3, CE-5) | infer real-world **plurality**, **sameness** or **distinctness** |
| attach explicit **revisions, corrections, retractions and source-native attachments of that same assertion** (AU-2) | **re-group** candidates because later evidence changes real-world interpretation |
| record **typed decomposition ambiguity** and emit no member candidates (AU-5, CE-6) | invent members the source does not address (DC-02a) |
| record a **source-asserted plurality claim** as content (AU-6) | act on that claim |

> **Cross-source and cross-lineage equivalence is B2-only** (BI-24). This is what makes it structurally impossible for B1 to perform reconciliation by candidate aggregation — and **deterministic emission** is what makes it impossible for B1 to perform reconciliation by candidate *suppression*.

### 8.5 Decisions

| Question | Decision | Rationale |
| :-- | :-- | :-- |
| Source-specific identity? | **No.** A candidate is distinct from the observations grounding it. | corrections and retractions of one assertion must attach without changing identity |
| Deterministic or opaque? | **Opaque, server-minted** (§11, ADR-2) | candidate content is exactly what later B2 adjudication reinterprets |
| One source → multiple candidates? | **Yes — exactly N**, where the source explicitly enumerates N individually addressable assertions each satisfying E-1…E-3 (CE-4, AU-4) | enumeration is reading; inference would be reconciliation |
| **Is emission optional?** | **No.** Emission is **determined** by §8.2.6 — never a B1 or B1S choice (BI-36) | *changed in V1.4; V1.3's `may` is withdrawn* |
| **Does addressability alone imply a candidate?** | **No.** E-1, E-2 and E-3 must all hold (CE-2) | *stated in V1.4 to foreclose the opposite over-reading* |
| Multiple observations → one candidate? | **Yes (`1..N`)**, but **only** revisions, corrections, retractions and source-native attachments **of that same individually addressable assertion** (AU-2) | a relation is not unity (AU-3) |
| Cross-lineage references on one candidate? | **References `0..N` where the one assertion itself makes them; equivalence never** (§23, RP-1…RP-3) | AU-3, BI-28 |
| Candidate with zero observations? | **No** — transaction-final obligation (§18, DB-04) | a candidate with no grounding observation is a fabrication |
| Correction / retraction / supersession | **Append-only**, explicit reference only | BI-11, P-14 |
| Merge / split | **Not candidate operations.** Both are **B2 adjudications**. | keeps B1 free of individuation (R-B-11, BI-24) |

### 8.6 Hard invariants

> **(1)** Candidate existence MUST NEVER imply `PurchaseOccasion` existence. Candidates are never countable analysis units and are never exposed to C2 as analysis units (BI-03).
> **(2)** A candidate MUST NOT span more than one individually addressable source assertion (BI-28, AU-1).
> **(3)** A preserved source-native relation MUST NEVER be read as equivalence, and MUST NEVER change a candidate count (AU-3, CE-5, BI-24).
> **(4)** Candidate emission MUST be a total, deterministic function of the source representation and the accepted taxonomy — never a discretionary act (BI-36, §8.2.6).

**Enforcement is structural.** A candidate carries **no** occasion identity; there is **no** automatic path from candidate creation to occasion creation; candidate construction has **no input** capable of expressing an inferred cross-assertion grouping; the decomposition manifest can only enumerate members the source itself addresses (DC-02, DC-02a); and the emission count is computed from the source's own representation rather than supplied by the caller. The only route to an occasion is an explicit B2 adjudication satisfying §6.7.

---

## 9. Reconciliation model — closes **O-06a** (part of JA-06)

### 9.1 Shape

Every reconciliation act is an immutable `ReconciliationAdjudication`. Nothing is updated in place. The current interpretation is a **projection** computed by a total, deterministic fold over a **validated** supersession graph, restricted to **admitted** records (§9.5).

### 9.2 Adjudication kinds

| Kind | Asserts | Effect on the projection |
| :-- | :-- | :-- |
| `CANDIDATE_LINK` | this candidate is grounded in / corroborated by this observation | adds a link |
| `CANDIDATE_EQUIVALENCE` | candidates *X* and *Y* describe the **same observed thing** — **B2-only, cross-source and cross-lineage** (BI-24, AU-3) | groups them for occurrence adjudication |
| `DUPLICATE_SUSPICION` | *X* and *Y* **may** be the same real purchase, evidence insufficient | records ambiguity; resolves nothing |
| `SAME_EVENT_FINDING` | these observations describe **one** real purchase | plurality resolved to 1 |
| `DISTINCT_EVENT_FINDING` | these observations describe **N** real purchases, enumerated | plurality resolved to N |
| `PLURALITY_UNRESOLVED_FINDING` | occurrence is established but the **number cannot** be, with factual bounds | opens/maintains a **Type A** `UnresolvedPluralityCluster` (§9.7). **Creates no occasion.** |
| `OCCURRENCE_ESTABLISHED` | §6.7 (a)–(d) satisfied for one enumerated purchase, with the §6.8 gates passed and basis recorded where a combination is cited | **creates** one canonical occasion identity; occurrence projection `ACTIVE` |
| `OCCURRENCE_CONTRADICTED` | an unretracted contradicting `OCCURRENCE_SPECIFIC` observation of sufficient authority stands | occurrence projection → `CONTRADICTED` |
| `OCCURRENCE_RETRACTED` | grounding evidence retracted or superseded such that occurrence no longer stands | occurrence projection → `RETRACTED` |
| `OCCURRENCE_REINSTATED` | a previously contradicted/retracted occurrence is explicitly re-established | occurrence projection → `ACTIVE`; required because retirement never reverses itself (§9.4) |
| `MERCHANT_ESTABLISHED` | the real-world merchant is *M* | merchant projection → `RESOLVED` |
| `MERCHANT_UNRESOLVED_FINDING` | merchant cannot be established on current evidence | merchant projection → `UNRESOLVED` |
| `AGGREGATE_INCONSISTENCY_OBSERVATION` | an `AGGREGATE_EXPOSURE` fact is inconsistent with the occurrence record for that period (§6.6.2) | records the inconsistency; **resolves nothing in either direction**; may mark findings for re-adjudication |
| `SOURCE_CORRECTION` | an ingested source fact was corrected upstream | re-opens affected findings |
| `SOURCE_RETRACTION` | a source withdrew its assertion | re-opens affected findings |
| `ADJUDICATION_SUPERSESSION` | this adjudication supersedes adjudication *A* | retires *A* permanently **once admitted** (§9.4, SG-10); *A* is never deleted |

**Sixteen kinds.** `AGGREGATE_INCONSISTENCY_OBSERVATION` is new in V1.3 and is the only place an aggregate fact may attach to an occurrence subject — as a **recorded inconsistency**, never as evidence (§6.6.2, BI-26).

### 9.3 Record state, typed eligibility and projection *(closes `JBA13-AUD-02`, `JBA14-AUD-01`, `JBA15-AUD-01`, `JBA15-AUD-02`, `JBA16-AUD-01`, `JBA16-AUD-02`, `JBA16-AUD-04`)*

#### 9.3.1 Three independent axes — never collapsed *(carried; wording aligned per `JBA15-AUD-03`)*

> ### The three axes
>
> ```
> STRUCTURAL_VALID(r)       in { TRUE, FALSE }
>     -- an SG-R property (9.4.1), decidable by inspecting r AND EVERYTHING r
>        EXPLICITLY REFERENCES -- including the endpoint properties SG-03..SG-06
>        require -- and INDEPENDENT of which finding or projection would survive
>        r's exclusion.
>
> GENERATION_AUTHORIZED(r)  in { AUTHORIZED, UNPROVEN, UNAUTHORIZED }
>     -- a DB-03B property of the record's OWN CREATION (18.4), evidenced by
>        independently protected trusted-generation provenance. NEVER inherited
>        across a reference (BI-38).
>
> CURRENTLY_QUARANTINED(r)  in { TRUE, FALSE }
>     -- DERIVED, not primitive: |ACTIVE_QUARANTINES(r)| > 0, folded from the
>        append-only content-addressed disposition history (9.3.3).
> ```

| # | Rule |
| :-- | :-- |
| **AX-1** | The three axes are **independent**. Structural validity says nothing about generation authorization; neither says anything about disposition; and a disposition says nothing about the truth of the basis it names. |
| **AX-2** | **`GENERATION_AUTHORIZED` is three-valued, and `UNPROVEN` is not `UNAUTHORIZED`.** `UNPROVEN` means provenance **could not be established either way**. It is **not** an affirmative finding of forgery, and converting it into one would be the `PROVENANCE_UNKNOWN` → negative conversion **P-13** prohibits (BI-16). |
| **AX-3** | A **cycle or branching ambiguity is `SG-S`** and is **not reducible** to any single member's `STRUCTURAL_VALID = FALSE` (§9.4.1, frozen). |
| **AX-4** | **`SG-R` invalidity and `GENERATION_AUTHORIZED = UNAUTHORIZED` are the two, and only two, record-level exclusion bases.** Each is a positive finding about **one record**, established on evidence **independent of the surviving projection**. |
| **AX-5** | *(clarified in V1.6)* **"Independent" means independent of survivors, not of references.** An `SG-R` determination **must** read the endpoints and provenance the record names — `SG-03` compares subjects, `SG-04` compares participants, `SG-05` compares kinds, `SG-06` resolves the target. What it must **never** consult is **which finding or projection would remain** if the record were excluded (`IQ-9a`, RS-1). |

#### 9.3.2 Four typed eligibility predicates *(closes `JBA15-AUD-01`)*

**The defect this closes.** V1.5 had **one** predicate, `ADMITTED(r)`, applied to a domain containing records of very different kinds, and then built the fail-closed seed over **every persisted record** that failed it. But §9.5.5's `SCOPE` is defined only over records that **name or belong to a B2 subject**. A preserved-but-non-grounding **S-2 observation** — `STRUCTURAL_VALID = true`, `GENERATION_AUTHORIZED = UNPROVEN`, `DB-03B` required — is not admitted, is not validly dispositioned, and therefore **seeded a set whose `SCOPE` was undefined for it**. Worse, it contradicted the **accepted** §18.4.6 rule that such an observation is *preserved as diagnostic provenance*: V1.5 turned a deliberate non-grounding outcome into an integrity corruption of a subject that may not exist.

> ### The four predicates
>
> ```
> SOURCE_PRESERVED(r)
>     = persisted(r) AND retention is lawful (16)
>     -- TRUE for EVERY persisted record regardless of validity, authorization or
>        disposition. Preservation is never conditioned on eligibility.
>
> SOURCE_GROUNDING_ELIGIBLE(o, P)                       -- o : SourceObservation
> = SOURCE_PRESERVED(o)
>     AND o's class grounds candidates for proposition-kind P     (6.4)
>     AND o is purchase-shaped for P where P is occurrence         (8.2.6 E-1)
>     AND DB-03A holds for o                                       (18.4.3)
>     AND ( GENERATION_AUTHORIZED(o) = AUTHORIZED
>           OR DB-03B is not required for class_of(o) )            (18.4.4, 18.5)
>     AND GENERATION_AUTHORIZED(o) != UNAUTHORIZED
>
> PROJECTION_INPUT_ELIGIBLE(r)                          -- r : a fold-read record
> = SOURCE_PRESERVED(r)
>     AND STRUCTURAL_VALID(r)
>     AND generation_sufficient(r)
>     AND NOT CURRENTLY_QUARANTINED(r)                             (9.3.3)
>     AND CITATION_SOUND(r)                                        (9.3.5)
>
> INTEGRITY_SEED_ELIGIBLE(r)
>     = r belongs to a record class that NAMES OR BELONGS TO a B2 subject,
>       so that SCOPE(r) is DEFINED                                (9.3.8, 9.5.5)
>
> generation_sufficient(r) =
>        GENERATION_AUTHORIZED(r) = AUTHORIZED
>     OR ( DB-03B is NOT required for class_of(r)
>          AND GENERATION_AUTHORIZED(r) != UNAUTHORIZED )
> ```

| # | Rule |
| :-- | :-- |
| **TE-1** | **There is no single polymorphic admission predicate.** Each question is asked of the record classes for which it is meaningful, and of no others (§9.3.8). |
| **TE-2** | **Preservation is unconditional.** `SOURCE_PRESERVED` never depends on validity, authorization or disposition. A record that fails every other predicate is still **retained and readable as provenance**, subject only to §16. This is what makes *"preserved as diagnostic provenance"* (§18.4.6) an actual state rather than a form of words. |
| **TE-3** | **Grounding eligibility is a property of an observation relative to a proposition**, not a global flag. An observation may be eligible for one proposition-kind and not another; §6.3's semantic scope and §6.4's grounding column decide it. |
| **TE-4** | **Projection-input eligibility is what the fold reads.** It is asked **only** of records the authoritative projection actually consumes (§9.3.8 Tier 2 and Tier 3). It is **never** asked of a source observation, because the fold never reads one directly — observations reach B2 only as **referents cited by adjudications** (§9.3.5). |
| **TE-5** | **Seed eligibility is a property of the class, not of the failure.** A record can seed **only if** its class names or belongs to a B2 subject, so that `SCOPE(r)` is defined by construction (BI-41). **No record ever enters the seed for which `SCOPE` is undefined.** |
| **TE-6** | **`UNAUTHORIZED` always blocks; `UNPROVEN` blocks only where the class requires proof.** Carried from V1.5, and now stated once in `generation_sufficient` and reused by both `SOURCE_GROUNDING_ELIGIBLE` and `PROJECTION_INPUT_ELIGIBLE`. |
| **TE-7** | **The consequence of ineligibility differs by predicate, and each is stated.** Failing `SOURCE_GROUNDING_ELIGIBLE` means **no candidate is emitted** (CE-2/CE-3) and no occurrence support flows — **not** an integrity failure. Failing `PROJECTION_INPUT_ELIGIBLE` means the record is **not read by the fold**. Failing neither but being cited by something that does is handled at **§9.3.5**. |
| **TE-8** | **A disposition records a state; it does not create one.** A quarantine does not **make** a record structurally invalid or unauthorized, and its **absence** does not make an invalid or unauthorized record eligible. Rescission removes the disposition only — the record must still independently satisfy `STRUCTURAL_VALID` **and** `generation_sufficient` before it is projection-input-eligible (IQ-11a). |

> ### The S-2 case, resolved
>
> An S-2 observation with `GENERATION_AUTHORIZED = UNPROVEN` where `DB-03B` is required:
>
> | Predicate | Value | Consequence |
> | :-- | :--: | :-- |
> | `SOURCE_PRESERVED` | **TRUE** | retained and readable as **diagnostic provenance** (§18.4.6) |
> | `SOURCE_GROUNDING_ELIGIBLE` | **FALSE** | **no candidate emitted** (CE-2/CE-3); **no occurrence support**; the deficiency is **recorded** |
> | `PROJECTION_INPUT_ELIGIBLE` | **not asked** | the fold never reads an observation directly (TE-4) |
> | `INTEGRITY_SEED_ELIGIBLE` | **FALSE** | **it does not seed**, and **no B2 subject is invented for it** (BI-42) |
>
> **This is the accepted §18.4.6 contract, now executable.** `UNPROVEN` is still never converted to `UNAUTHORIZED` (AX-2), and the observation still grounds nothing.

#### 9.3.3 The disposition fold — content-addressed, append-only and effective *(closes `JBA15-AUD-02`; extended per `JBA16-AUD-03` and `JBA16-AUD-04`)*

**The defect this closes.** V1.5 fed `CURRENTLY_QUARANTINED(r) ∈ {true,false}` into `ADMITTED`, `VALID_DISPOSITION`, the fail-closed seed and `SG-10` **without ever defining it**. `VALID_DISPOSITION` spoke of *"**the** quarantine"* — singular and definite — so the model could not represent two quarantines on one record, could not say which quarantine a rescission unwinds, and had no answer for an unmatched rescission, a duplicate delivery, a competing or erroneous quarantine, or a disposition event whose **own** provenance is `UNPROVEN` or `UNAUTHORIZED`. **Command idempotency answers none of these**, because they are questions about semantic state, not about retry.

##### 9.3.3.1 Disposition-event identity

| # | Rule |
| :-- | :-- |
| **DE-1** | A **`StructuralIntegrityQuarantine`** carries its **own opaque, immutable, server-minted identity** — written `qid` — distinct from the identity of the record it targets and from every other quarantine's, including other quarantines targeting the same record. Identity obeys §11: content-free, not derived from business data or any key pair (ADR-2, DB-12). |
| **DE-2** | A **`QuarantineRescission`** carries its own identity and **names exactly one `qid` by explicit reference**. **A rescission targets a quarantine, never *"the quarantine state of record r"*.** A rescission naming zero or more than one `qid` is **structurally invalid** (`SG-R`). |
| **DE-3** | Both are **append-only** and are **never updated or deleted** by any scientific or integrity operation; §16's legal-deletion override is the only removal path (IQ-10). |
| **DE-4** | Both are **authoritative integrity-control artifacts** and are subject to the same `DB-03A` / `DB-03B` obligations as any other record — with `DB-03B` **required**, never optional (§9.3.3.2, TG-5). |
| **DE-5** | Neither carries, or may be read for, any scientific content. A disposition event states **that a record is excluded and on what record-level basis**; it never states what is true about the world (IQ-3, IQ-4, BI-30). |

##### 9.3.3.2 Event operability — `ADMISSIBLE`, then `EFFECTIVE` *(separated per `JBA16-AUD-04`)*

**The defect this closes.** V1.6 chose, correctly, that a disposition event **is** itself a valid quarantine target (DE-8, IQ-3). But `DISPOSITION_EVENT_ADMISSIBLE(e)` never asked whether `e` **is itself quarantined**, so **quarantining a bad quarantine changed nothing**. The choice was declared and not implemented. V1.7 keeps the choice and supplies the predicate that makes it operative.

> ### The three separated predicates
>
> ```
> DISPOSITION_EVENT_STRUCTURALLY_VALID(e)                       -- SG-R, on e itself
>     = a QUARANTINE names exactly one target record and exactly one
>           record-level basis (9.3.4)                          (IQ-1)
>       a RESCISSION names exactly one qid, and that qid denotes a
>           StructuralIntegrityQuarantine                       (DE-2, RV-1, RV-3)
>     AND e does NOT target itself                              (DG-2)
>     -- decided by inspecting e AND the records e explicitly references,
>        INDEPENDENT of which finding or projection would survive (AX-5, RS-1)
>     -- (narrowed in V1.8: this predicate no longer tests ancestor-reachability.
>        DG-3's ancestor-target rule is a PROSPECTIVE, write-time admission
>        test over the graph as it stood before e was proposed -- never a
>        record-level SG-R conjunct evaluated against the completed graph, which
>        is what let a persisted Q1<->Q2 cycle make BOTH members individually
>        "invalid" and reopened the JBA13-AUD-01 winner-selection defect.
>        See DG-3, DCG-6.)
>
> DISPOSITION_EVENT_GENERATION_AUTHORIZED(e)
>     = GENERATION_AUTHORIZED(e) = AUTHORIZED                   -- REQUIRED, not
>                                                                  merely != UNAUTHORIZED
>     AND e was minted by the TRUSTED INTEGRITY-REPAIR CAPABILITY (IQ-6, DB-14)
>     -- a DB-03B property of e's OWN creation; never inherited from its target
>        or from any record it names (BI-38)
>
> DISPOSITION_EVENT_CURRENTLY_QUARANTINED(e)
>     = | ACTIVE_QUARANTINES(e) | > 0                            (9.3.3.3)
>     -- the SAME fold, applied to e as a target. Well-founded because the
>        DispositionControlGraph is acyclic (DG-01) and finite (DG-8).
> ```

> ### Admissibility and effectiveness
>
> ```
> DISPOSITION_EVENT_ADMISSIBLE(e) =
>       SOURCE_PRESERVED(e)
>   AND DISPOSITION_EVENT_STRUCTURALLY_VALID(e)
>   AND DISPOSITION_EVENT_GENERATION_AUTHORIZED(e)
>   AND e's target RESOLVES:
>         quarantine  -> the targeted record exists                (else inert, IQ-11)
>         rescission  -> the targeted qid exists AND is a quarantine (9.3.3.4)
>
> DISPOSITION_EVENT_EFFECTIVE(e) =
>       DISPOSITION_EVENT_ADMISSIBLE(e)
>   AND NOT DISPOSITION_EVENT_CURRENTLY_QUARANTINED(e)             (JBA16-AUD-04)
>
> ONLY AN EFFECTIVE EVENT PARTICIPATES IN THE FOLD (9.3.3.3).
> ```

| # | Rule |
| :-- | :-- |
| **DE-6** | **`DB-03B` is REQUIRED for disposition events, with no class exemption.** A disposition event is the one artifact class that can **remove** an otherwise valid scientific input from the projection. Admitting one on `UNPROVEN` provenance would let an unproven actor do exactly that. **`UNPROVEN` therefore does not act** (DQ-6). |
| **DE-7** | **A non-admissible disposition event has NO effect on `ACTIVE_QUARANTINES`.** It cannot exclude anything, and it cannot un-exclude anything. **A forged quarantine cannot remove a valid scientific input, and a forged rescission cannot restore an excluded one** (DQ-5). |
| **DE-8** | *(amended in V1.7)* A non-admissible disposition event is **not thereby ignored**: it is a recorded **integrity anomaly** (§9.3.3.6) and is itself **dispositionable** by an effective quarantine, because `GENERATION_AUTHORIZED = UNAUTHORIZED` is a record-level basis (AX-4). **V1.6 justified termination by claiming the chain stops at the first admissible event; that argument was circular and is withdrawn.** Termination now rests on **`DG-01`** — the `DispositionControlGraph` is acyclic and finite, so control depth is a well-founded induction variable (§9.3.3.7, DG-8). |
| **DE-9** | *(new in V1.7)* **Admissibility and effectiveness are different questions and are never collapsed.** `ADMISSIBLE` asks whether the event is well-formed, authorized and targeted at something that exists. `EFFECTIVE` additionally asks whether **anything has validly suppressed it**. An **admissible but suppressed** event is a representable, meaningful state: it is recorded, attributable and reportable, and it **does not act** (`DCG-2`). |
| **DE-10** | *(new in V1.7)* **An event that is itself validly quarantined MUST NOT act**, in either direction. A suppressed **quarantine** stops excluding its target; a suppressed **rescission** stops restoring its target quarantine, so that quarantine becomes active again (`DCG-4`). **This is the whole operative content of the V1.6 choice that disposition events are dispositionable.** |
| **DE-11** | *(new in V1.7)* **Suppression is not annulment.** Removing the quarantine that suppressed an event returns that event to **exactly the state its own axes and basis dictate** — it does not make an erroneous event correct, and it does not make a forged event authorized (`DCG-3`, IQ-11a applied one level up). |
| **DE-12** | *(new in V1.7)* **The disposition layer is stratified below the citation layer.** `DISPOSITION_EVENT_STRUCTURALLY_VALID`, `DISPOSITION_EVENT_GENERATION_AUTHORIZED`, `DISPOSITION_EVENT_CURRENTLY_QUARANTINED`, `DISPOSITION_EVENT_EFFECTIVE`, `ACTIVE_QUARANTINES`, `CURRENTLY_QUARANTINED` and `VALID_DISPOSITION` **MUST NOT consult `CITATION_SOUND` or `PROJECTION_INPUT_ELIGIBLE`** for any record. They read only the two primitive axes and the `DispositionControlGraph`. **This one-way dependency is what makes the whole composition terminate** (CD-9). |

##### 9.3.3.3 The fold — `ACTIVE_QUARANTINES` and `CURRENTLY_QUARANTINED`

> ```
> ACTIVE_QUARANTINES(t) =                        -- t : any record OR disposition event
>     { q : DISPOSITION_EVENT_EFFECTIVE(q)
>           AND q is a StructuralIntegrityQuarantine
>           AND target(q) = t
>           AND NOT EXISTS x : DISPOSITION_EVENT_EFFECTIVE(x)
>                              AND x is a QuarantineRescission
>                              AND target(x) = identity(q) }
>
> CURRENTLY_QUARANTINED(t) = | ACTIVE_QUARANTINES(t) | > 0
> ```
>
> **`EFFECTIVE`, not `ADMISSIBLE`, is the membership test** — this one word is the `JBA16-AUD-04` repair. `ACTIVE_QUARANTINES` is defined **uniformly over records and over disposition events**, which is what lets a quarantine of a quarantine mean something.

| # | Property | Guaranteed by |
| :-- | :--: | :-- |
| zero active quarantines → `CURRENTLY_QUARANTINED` **false** | ✔ | cardinality |
| one active → **true** | ✔ | cardinality |
| **N active → true, and the model represents all N** | ✔ | **set** semantics; §23.1 states the contract as **`0..N`** (`JBA16-AUD-03`) |
| **rescinding one of N leaves the others active** | ✔ | rescission targets **one `qid`** (DE-2), not the record |
| **rescinding the last active one → false** | ✔ | cardinality |
| **duplicate delivery does not duplicate semantic disposition** | ✔ | **set** semantics over identities; a replayed command yields **one** `qid` (§17.2), and two *distinct* quarantines with the same basis are two members whose removal requires two rescissions — which is correct, not duplication |
| **a suppressed quarantine is not a member** | ✔ | `DISPOSITION_EVENT_EFFECTIVE` (DE-10) |
| **a suppressed rescission does not remove a member** | ✔ | the inner `EXISTS` also requires `EFFECTIVE` (`DCG-4`) |
| **no timestamp, recency, ordering, counting or authority comparison determines truth** | ✔ | the fold is a **set comprehension**; nothing is ordered and nothing is compared for precedence (**P-14**) |
| **the fold terminates and is unique** | ✔ | `DG-01` acyclicity + finiteness ⇒ induction on control depth (DG-8) |

| # | Rule |
| :-- | :-- |
| **DF-1** | The fold is **pure over the authoritative persisted disposition history** and is **replayable**: any independent verifier recomputes the same `ACTIVE_QUARANTINES(t)` from the same effective records. |
| **DF-2** | **No latest-wins, first-wins or highest-authority-wins**, and **no mutable boolean** is the source of truth. `CURRENTLY_QUARANTINED` is a **derived** value with no storage of its own; a materialized copy is permitted only as a reproducible, explicitly non-authoritative projection (P-06a). |
| **DF-3** | **Rescission is not negation of a record's state; it is retraction of one specific act.** This is why the multi-quarantine cases below have answers at all. |
| **DF-4** | *(new in V1.7)* **`ACTIVE_QUARANTINES` is total over its argument.** For a record class that is not disposition-controllable (§9.3.8 column 7) the set is **empty by construction**, because no effective quarantine can target it (IQ-16). The fold is therefore defined — and equal to `∅` — for every persisted class, with no undefined case and no global default. |

##### 9.3.3.4 Rescission validity — total

| # | Case | Result |
| :-- | :-- | :-- |
| **RV-1** | **exact target identity** | a rescission **must** name exactly one `qid`. Naming zero, or more than one, is **structurally invalid** (`SG-R`, DE-2) and the event is non-admissible |
| **RV-2** | **target existence** | the named `qid` must resolve to a persisted quarantine. If it does not, the rescission is **inert** — it retracts nothing, seeds nothing, and is not an error (mirrors IQ-11) |
| **RV-3** | **target compatibility** | the named identity must be a **`StructuralIntegrityQuarantine`**. A rescission naming another rescission, or naming a non-disposition record, is **structurally invalid** and non-admissible |
| **RV-4** | **authorization / trusted generation** | the rescission must itself be `GENERATION_AUTHORIZED = AUTHORIZED` and capability-minted (DE-6). An `UNPROVEN` rescission **does not act** (DQ-6); an `UNAUTHORIZED` one does not act and is dispositionable (DE-8) |
| **RV-5** | **duplicate / replay** | two deliveries of the **same** rescission command yield **one** rescission by operation identity (§17.2). **Two distinct admissible rescissions naming the same `qid`** both hold; the effect is **idempotent** — that `qid` is not active. **No ordering is consulted** |
| **RV-6** | **rescission of an already-rescinded quarantine** | **no further effect.** The `qid` was already excluded from `ACTIVE_QUARANTINES` by the earlier rescission; set membership is not a counter |
| **RV-7** | **two rescissions targeting the same quarantine** | as RV-5 — both admissible, one effect. **Neither "wins"**, because the fold asks *"does an admissible rescission exist?"*, not *"which one?"* |
| **RV-8** | **target legally purged** | where §16 lawfully removes the quarantine record, the `qid` no longer resolves and the rescission becomes **inert** (RV-2). The **target record** returns to whatever its own axes say — still invalid or unauthorized if it is, hence still not projection-eligible and still seeding if it is seed-eligible. **Losing disposition history never re-admits a bad record** (§9.5.7.2 case 1) |
| **RV-9** | **legal deletion removes disposition history generally** | the fold computes over **what lawfully remains** (IQ-10, §16.9). No residue is promised, and none is reconstructed (AT-22a). Safety is preserved because admission is computed from the record's **own** axes, never from the absence of a quarantine (TE-8) |
| **RV-10** | **rescission never re-admits by itself** | *(carried, accepted)* After rescission the target record must **independently** satisfy `STRUCTURAL_VALID` **and** `generation_sufficient` before it is projection-eligible (IQ-11a). **A rescission removes a disposition; it never makes a malformed or unauthorized record authoritative.** |

##### 9.3.3.5 Composition of multiple active quarantines

Let `BASIS_HOLDS(q, t)` mean: the record-level basis `q` names **actually holds** for `t` — an `SG-R` violation of `t`, `GENERATION_AUTHORIZED(t) = UNAUTHORIZED`, or, **where `t` is itself a quarantine**, `CONTROL_BASIS_FALSE(t)` (§9.3.4, IQ-15) — is **re-provable** (IQ-5), and was established **independently of which projection survives** (IQ-9a).

| # | Configuration | `CURRENTLY_QUARANTINED` | `VALID_DISPOSITION` | Seeds? | Notes |
| :-- | :-- | :--: | :--: | :--: | :-- |
| **MQ-1** | **one valid** | true | **true** | **no** | the ordinary recovery case (§9.3.7 Case C/F) |
| **MQ-2** | **one valid + one valid** | true | **true** | **no** | **both are active — this is the `0..N` contract** (§23.1). Two independent justifications for the same exclusion; rescinding either leaves the other (DQ-2) |
| **MQ-3** | **one valid + one erroneous** | true | **true** | **no** | **the valid exclusion stands** (DQ-4). The erroneous event is **operative** (it is effective) but **changes nothing the projection would otherwise admit**, so it is an **integrity anomaly** (§9.3.3.6, AN-1a), **not** a seed |
| **MQ-4** | **two erroneous**, no independent exclusion basis | true | **false** | **YES** | the record would otherwise be projection-eligible; excluding it **does** change what the fold reads (§9.3.7 Case I) |
| **MQ-5** | **one valid rescinded, another valid remains** | true | **true** | **no** | set semantics; the remaining member still justifies exclusion (DQ-2) |
| **MQ-6** | **erroneous later rescinded** | per remaining set | per remaining set | per remaining set | the anomaly is cleared; nothing else changes |
| **MQ-7** | **quarantine whose own provenance is `UNPROVEN`** | **not counted** | **not counted** | **no** *(from this event)* | **not admissible** (DE-6), therefore not effective — it never enters the set, so it cannot exclude. Recorded as an anomaly; resolve by establishing its provenance or proving it unauthorized |
| **MQ-8** | **quarantine proven `UNAUTHORIZED`** | **not counted** | **not counted** | **no** *(from this event)* | not admissible (DE-7); **and itself dispositionable** (DE-8) |
| **MQ-9** *(new in V1.7)* | **quarantine that is admissible but is ITSELF validly quarantined** | **not counted** | **not counted** | **no** *(from this event)* | **not `EFFECTIVE`** (DE-10). It **stops acting**, its target is **recomputed**, and it remains a recorded, attributable, reportable event. `DCG-2` |
| **MQ-10** *(new in V1.7)* | **rescission that is admissible but is ITSELF validly quarantined** | per remaining set | per remaining set | per remaining set | the rescission **stops removing** its target `qid`, so that quarantine is **active again** (`DCG-4`). Nothing is re-decided by recency; the fold simply recomputes |

> **The composition rule, stated once.** **`VALID_DISPOSITION` is existential over the active set** — *some* active quarantine names a basis that holds. **Erroneous membership is not subtractive**: a bad event alongside a good one does not undo the good one (MQ-3, DQ-4). An event that is **not admissible never enters the set at all** (MQ-7, MQ-8), and an event that is admissible but **suppressed** does not enter it either (MQ-9, MQ-10). **In no case does a count, an ordering or a recency decide anything.**

##### 9.3.3.6 Ineffective and erroneous disposition events — anomaly versus harm

Two different defects must not be conflated, and **the distinction is structural, never a preference about which scientific answer is wanted.**

> ### The structural definition of harm
>
> ```
> OPERATIVE(e)  = DISPOSITION_EVENT_EFFECTIVE(e)
>                 -- e actually participates in the fold (9.3.3.3)
>
> HARMFUL(e)    = OPERATIVE(e)
>             AND e LACKS a valid basis for what it does
>                   quarantine  : NOT BASIS_HOLDS(e, target(e))
>                   rescission  : it removes a quarantine whose basis DID hold
>             AND removing e from the history WOULD CHANGE the authoritative
>                 eligibility of its ultimate scientific target
>
> ANOMALY(e)    = e is defective AND NOT HARMFUL(e)
> ```
>
> **Both conjuncts are decided over the record axes and the two graphs.** Neither consults a surviving finding, a projection result, or which answer a reader would prefer (AN-4, IQ-9a, AX-5).

| | **Integrity anomaly** | **Fail-closed seed** |
| :-- | :-- | :-- |
| What it is | a defect in the **integrity-control layer** that is **not operative**, or that is operative but **changes nothing the projection would otherwise admit** | a defect that **does** change it, or leaves an unexamined corruption in the fold's input |
| Examples | a non-admissible quarantine (MQ-7, MQ-8); a **suppressed** quarantine or rescission (MQ-9, MQ-10); an erroneous quarantine alongside a valid one (MQ-3); an inert rescission (RV-2, RV-8) | an erroneous quarantine that alone excludes an otherwise-eligible record (MQ-4); an undispositioned `SG-R`-invalid record; an `SG-S` violation; a **citation-dependency cycle** (CD-7); a **disposition-control cycle** (DG-4) |
| Consequence | **recorded, attributable and reportable**; consumable by C2 as **data-quality provenance** only (§22.1, BI-30); **does not fail a subject closed** | the §9.5.5 scope **fails closed**, typed integrity error |
| Remedy | disposition the offending event (DE-8), suppress it (DE-10), or establish/disprove its provenance | disposition the offending record, rescind the erroneous quarantine (IQ-11a), or remove the cycle |

| # | Rule |
| :-- | :-- |
| **AN-1** | **A defect seeds only if it changes what the projection would otherwise admit.** This is not leniency: an event that removes nothing cannot make an answer wrong, and failing a subject closed for it would convert a forged-event injection into a cheap denial of service while adding no protection. |
| **AN-1a** | *(new in V1.7)* **Harm is defined by operative influence, never by result preference.** An erroneous control event is harmful **iff** it is `DISPOSITION_EVENT_EFFECTIVE` **and** its presence changes the authoritative eligibility of its target. **A non-operative event — non-admissible or suppressed — is never harmful**, whatever the resulting projection looks like; and **an operative event that suppresses or reactivates a record without a valid basis is always harmful**, however convenient the result. |
| **AN-2** | **An anomaly is never silent.** It is recorded with its actor, basis and knowledge time, is queryable, and is surfaced to C2 as data-quality provenance (**C2-6**). What it does not do is withhold an answer the evidence supports. |
| **AN-3** | **A forged disposition event never acquires authority by existing** (BI-43). It does not act (DE-7), it is not a basis, and it is dispositionable (DE-8). |
| **AN-4** | The anomaly/harm distinction is **decidable and re-provable**: it asks whether the record would be `PROJECTION_INPUT_ELIGIBLE` **but for** the disposition in question — a determination over the record's own axes and the two graphs, not over surviving findings (IQ-9a, AX-5). |
| **AN-5** | *(new in V1.7)* **Suppression converts harm into anomaly, and only prospectively.** Once a harmful quarantine is validly suppressed it is no longer operative and therefore no longer harmful — its target is recomputed and stops failing closed on its account (`DCG-2`). **Nothing is rewritten**: the harmful event, its basis, the suppressing event and the intervening integrity error all remain in the append-only history, subject only to §16. |

##### 9.3.3.7 The `DispositionControlGraph` — well-founded by construction *(new in V1.7; closes `JBA16-AUD-04`)*

**The decision, stated explicitly.** **Disposition events ARE themselves valid quarantine targets.** V1.6 made this choice; V1.7 keeps it and makes it operative. The price of the choice is that disposition becomes recursive, and a recursion without a well-foundedness rule is not a definition. This section supplies the rule.

> ### The graph
>
> ```
> DispositionControlGraph (DCG):
>
>   VERTICES : every persisted StructuralIntegrityQuarantine, every persisted
>              QuarantineRescission, and every record either may target.
>
>   EDGES    : e --controls--> t   for each STRUCTURALLY VALID disposition
>              event e (DG-2 excludes self-target before this graph is built)
>              whose target is t, where
>                  target(quarantine)  = the record or event it quarantines
>                  target(rescission)  = the quarantine identified by the qid
>                                        it names
>
>   A self-targeting event fails DG-2's record-level SG-R invariant and
>   contributes NO edge here -- it is never a one-vertex cycle of this graph
>   (DCG-5). This graph is the PERSISTED, already-admitted control history;
>   DG-3's prospective write-time test (below) is evaluated against it BEFORE
>   a proposed new edge is added, and a rejected proposal never appears here.
>
>   The DCG contains NO citation edges, NO supersession edges and NO
>   provenance references. It is disjoint in kind from the
>   CitationDependencyGraph (9.3.5.1) and from the supersession graph (9.4).
> ```

| # | Rule |
| :-- | :-- |
| **DG-01** | **The `DispositionControlGraph` MUST be acyclic.** This is a **structural invariant of the persisted history**, enforced at write time where representable (**DB-08d**) and verified at read time otherwise. |
| **DG-2** | **Case A — self-target.** **No disposition event may target itself.** A quarantine naming its own identity, or a rescission naming its own identity, is **individually, record-level `SG-R` structurally invalid** — decidable from that one record alone — and therefore not admissible. **This classification never depends on, and is never generalized from, the multi-record cycle rules of `DG-3`/`DG-4`.** A self-target is mathematically a one-vertex cycle, but it is classified **solely** by this record-level invariant; it never enters the `DispositionControlGraph` as a cycle (`DCG-5`). |
| **DG-3** | *(narrowed in V1.8; repairs the `JBA16-AUD-04` winner-selection regression an independent audit found in V1.7)* **Case B — prospective cycle prevention, a write-time admission constraint only.** Before a **new** disposition-control edge `e --controls--> t` is admitted, the protected write path MAY test whether `t` already reaches `e`'s proposed source by following `controls` edges in the **currently valid, already-persisted** `DispositionControlGraph`. **If it would, the write is rejected**: the proposed edge is **not persisted as authoritative control**. This is a **prospective** constraint on the write, evaluated **before** the edge exists — it establishes **nothing** about any event already in the persisted history, and in particular it **never** makes an already-persisted event individually `SG-R`-invalid merely because the completed graph shows it reaching, or being reached by, another member. **No allocation order, commit order or timestamp is treated as identifying which edge "would have" closed the cycle** — none of those is available as semantic truth (P-14, DF-2). |
| **DG-4** | **Case C — a cycle already physically persisted is a set-level integrity violation with no remedy by selection.** Every event on the cycle is **treated as not `EFFECTIVE`**, so **no member of the cycle acts**; the **union of the scopes of the ultimate scientific targets** of the cycle's events **fails closed** with a typed `DISPOSITION_CONTROL_CYCLE` integrity error naming every member. **No member is chosen. No timestamp, allocation sequence, recency, actor authority or count resolves it, and no member is individually excludable merely for being on the cycle** — `DG-3`'s write-time test supplies no record-level defect for any already-persisted member, and cycle membership alone is never a `DG-2`-style basis. The remedy is the same shape as `IQ-9c`'s: **only** an independently provable record-level defect in **one specific** cycle member, established from that record's own axes and independent of the cycle, makes that member excludable, and lawful deletion under §16 is the only other exit. `DCG-6` |
| **DG-5** | **The cycle's ineffectiveness is fail-safe in the exclusion direction and fail-closed in the admission direction.** No cycle member excludes anything (so no valid scientific input is removed by an unresolvable control tangle), **and** the affected scope still fails closed (so nothing is silently admitted either). **The architecture refuses to answer rather than answering from an undefined state.** |
| **DG-6** | **Control depth is defined.** `depth(v) = 0` where no disposition event targets `v`; otherwise `depth(v) = 1 + max { depth(e) : e --controls--> v }`. `DG-01` and finiteness of the persisted history make `depth` **total and finite** on every vertex not lying on a cycle. |
| **DG-7** | **The recursion is structural.** `DISPOSITION_EVENT_EFFECTIVE(e)` depends on `ACTIVE_QUARANTINES(e)`, and `ACTIVE_QUARANTINES(t)` reads `DISPOSITION_EVENT_EFFECTIVE` **only for events that lie strictly above `t` in the `DispositionControlGraph`** — the quarantines that control `t`, and the rescissions that control those. **Every such event has strictly smaller `depth` than `t`** (DG-6). There is no other recursive reference anywhere in §9.3.3 or §9.3.4. |
| **DG-8** | **Termination and uniqueness, proved.** By DG-6 and DG-7 the evaluation of `DISPOSITION_EVENT_EFFECTIVE` is a **structural recursion on `depth`**, on a **finite** vertex set. It therefore **terminates** in at most `depth(v) + 1` levels, bounded by the number of persisted disposition events, and yields **exactly one** value per vertex. **No iteration to a fixed point is performed, none is permitted, and none is needed.** |
| **DG-9** | **The disposition layer never reads the citation layer.** No predicate in §9.3.3 or §9.3.4 consults `CITATION_SOUND`, `PROJECTION_INPUT_ELIGIBLE`, `INTEGRITY_SEED_ELIGIBLE`, `SG-S` or `SCOPE` (DE-12). The dependency between the two graphs is therefore **one-way**, and the composition of §9.3 as a whole is **stratified** (CD-9). |

##### 9.3.3.8 The required disposition-of-disposition cases — total

Let `R` be a scientific projection-input record, `Qbad` a quarantine targeting `R`.

| # | Configuration | Required result | Why |
| :-- | :-- | :-- | :-- |
| **DCG-1** | **`Qbad` targets `R`; `Qbad` is structurally valid, `AUTHORIZED` and capability-minted, but its named basis is FALSE for `R`** | `Qbad` is **`EFFECTIVE`** and **does** exclude `R`. `VALID_DISPOSITION(R)` is **false**. `Qbad` is **operative and lacks a valid basis**, so it is **HARMFUL**: `R` **seeds**, and `R`'s §9.5.5 scope **fails closed** | AN-1a; §9.3.7 Case I; MQ-4. **An erroneous but authorized event really can alter `R` — that is exactly why it must be correctable** |
| **DCG-2** | **`Q2` validly quarantines `Qbad`** — its basis is `CONTROL_BASIS_FALSE(Qbad)` (IQ-15), re-provable from `R`'s own axes | `Q2` is `EFFECTIVE`; `Qbad` becomes `DISPOSITION_EVENT_CURRENTLY_QUARANTINED` and is therefore **NOT `EFFECTIVE`**. **`Qbad` stops acting.** `ACTIVE_QUARANTINES(R)` loses it, `R` is **recomputed**, and — absent any other seed member — `R`'s scope **resumes projecting** | DE-10, MQ-9, AN-5. **This is the operative effect V1.6 lacked** |
| **DCG-3** | **`R2` validly rescinds `Q2`** | `R2` is `EFFECTIVE`; `Q2` leaves `ACTIVE_QUARANTINES(Qbad)`; `Qbad` is **no longer suppressed** and is **reconsidered under its own basis and admission state**. Its basis is still false, so `Qbad` is **again effective, again erroneous, again harmful**, and `R` **again fails closed** | DE-11, IQ-11a one level up. **Rescission restores the ability to act; it NEVER makes `Qbad` scientifically valid** |
| **DCG-4** | **`Q3` quarantines `R2`** | `Q3` is `EFFECTIVE`; `R2` becomes suppressed and **NOT `EFFECTIVE`**; the inner `EXISTS` of §9.3.3.3 therefore fails, so **`Q2` is active again**; `Qbad` is suppressed again; `R` is recomputed and **resumes** | MQ-10; the fold's inner clause also requires `EFFECTIVE`. **Depth 3 chain, terminating by DG-8** |
| **DCG-5** | **`Q1` attempts to quarantine itself** | **Structurally invalid** (`SG-R`, DG-2) ⇒ not `DISPOSITION_EVENT_STRUCTURALLY_VALID` ⇒ not admissible ⇒ **not effective**. It acts on nothing, is a recorded **anomaly**, and **never enters the DCG as a cycle** | DG-2; write-time rejection where representable (DB-08d) |
| **DCG-6** | **`Q1` quarantines `Q2` and `Q2` quarantines `Q1`** | **Disposition-control cycle.** Both are treated as **not `EFFECTIVE`**, so **neither acts**; the **union of the scopes of their ultimate scientific targets fails closed** with a typed `DISPOSITION_CONTROL_CYCLE` error. **No winner. No recency. No count.** Exit only by an independently provable record-level defect in one specific member, or by lawful deletion | DG-4, DG-5; **not** DG-3, whose write-time test supplies no record-level defect for an already-persisted member; the same shape as `IQ-9c` for `SG-S` |
| **DCG-7** | **A forged or `UNPROVEN` quarantine of another disposition event** | **Not `DISPOSITION_EVENT_GENERATION_AUTHORIZED`** ⇒ not admissible ⇒ **not effective**. **It cannot suppress anything.** Recorded anomaly; dispositionable on the `UNAUTHORIZED` basis | DE-6, DE-7, MQ-7, MQ-8. **A forged actor cannot silence a valid quarantine** |
| **DCG-8** | **A forged or `UNPROVEN` rescission** | Same: **not effective**, so the quarantine it names **stays active** and its target stays excluded. Recorded anomaly; dispositionable | DE-6, DE-7, DQ-5, DQ-6. **A forged actor cannot restore an excluded record** |

> **Determinism and termination, restated for this section.** Every one of `DCG-1`…`DCG-8` is computed from the **persisted authoritative history alone**, by structural recursion on control depth over a finite acyclic graph (DG-8). **Two independent verifiers reading the same history obtain the same answer**, and neither consults an ordering, a timestamp, an actor ranking, a count, or any scientific result.

#### 9.3.4 `VALID_DISPOSITION` — a pure function over the active set

> ```
> VALID_DISPOSITION(t) =
>     EXISTS q in ACTIVE_QUARANTINES(t) :  BASIS_HOLDS(q, t)
>
> BASIS_HOLDS(q, t) =
>         q names exactly one record-level basis, and that basis ACTUALLY HOLDS for t:
>             STRUCTURAL_VALID(t) = FALSE                (a named SG-R violation), or
>             GENERATION_AUTHORIZED(t) = UNAUTHORIZED    (a named DB-03B failure), or
>             CONTROL_BASIS_FALSE(t)                     (IQ-15; available ONLY where
>                                                         t is itself a
>                                                         StructuralIntegrityQuarantine)
>     AND that basis is RE-PROVABLE from the record set and its provenance   (IQ-5)
>     AND the basis was established INDEPENDENTLY of which projection survives (IQ-9a)
>     -- and q is in ACTIVE_QUARANTINES(t), which already required
>        DISPOSITION_EVENT_EFFECTIVE(q): the event's OWN trusted generation (DE-6)
>        AND that nothing has validly suppressed it (DE-10)
>
> CONTROL_BASIS_FALSE(p) =                   -- p : a StructuralIntegrityQuarantine
>       NOT BASIS_HOLDS(p, target(p))
>       -- "the quarantine p names a basis that provably does not hold for p's own
>          target". Decided from target(p)'s OWN axes. Terminates because it follows
>          `controls` edges strictly downward on the acyclic, finite DCG (DG-01, DG-8),
>          and because a scientific record's basis is decided from its two primitive
>          axes with no further recursion.
> ```

| # | Rule |
| :-- | :-- |
| **VD-1** | `VALID_DISPOSITION` is **derived from four things and nothing else**: the **active** quarantine identities, their **recorded bases**, the **truth** of those bases, and the **effectiveness of the events themselves**. **No primitive boolean appears anywhere in it.** |
| **VD-2** | **`UNPROVEN` is not a basis.** A quarantine naming *"generation provenance could not be established"* is **erroneous** (IQ-9d, AX-2). The remedy for `UNPROVEN` is to **establish** the provenance or to **prove it unauthorized** — never to disposition it away. |
| **VD-3** | A `VALID_DISPOSITION` **excludes the record from projection input and from the fail-closed seed** (§9.3.6, BI-39). This is what makes recovery reachable. |
| **VD-4** | A `VALID_DISPOSITION` **never** licenses re-admitting anything, never selects among findings, and never resolves a `CONTESTED` state (IQ-4). |
| **VD-5** | **`CURRENTLY_QUARANTINED` and `VALID_DISPOSITION` are never collapsed.** `CURRENTLY_QUARANTINED = true ∧ VALID_DISPOSITION = false` is a representable and meaningful state — an **erroneous quarantine** (§9.3.7 Case I, MQ-4). |
| **VD-6** | *(new in V1.7)* **`VALID_DISPOSITION` is defined uniformly over records and over disposition events**, so *"is `Qbad` validly suppressed?"* is the same question as *"is `R` validly excluded?"*, asked one level up. **No parallel vocabulary and no special case exists for the control layer.** |
| **VD-7** | *(new in V1.7)* **`CONTROL_BASIS_FALSE` is available ONLY against a `StructuralIntegrityQuarantine`, never against a scientific record.** It says *"this control event names a basis that does not hold"* — a **record-level, re-provable** property of the event, decided from its own target's axes and **not** from which finding would survive. **It is not, and may never be used as, a route to disagreeing with a scientific finding** (IQ-3, IQ-4, BI-30, IQ-15). |

#### 9.3.5 `CITATION_SOUND` — the dependency rule *(closes part of `JBA15-AUD-01`; made well-founded per `JBA16-AUD-01`)*

An observation is never read by the projection fold directly (TE-4). It reaches B2 **only** as a **referent cited by an authoritative record** — an adjudication citing it as evidence, a link naming it, a basis record listing it. That is where an ineligible referent must be caught, and it is the **only** place where it can be caught without inventing a subject for the referent.

> ```
> CITATION_SOUND(a) for an authoritative B2 record a =
>     FOR EVERY referent x that a cites in support of proposition P:
>         x satisfies the eligibility REQUIRED FOR P:
>             x : SourceObservation   -> SOURCE_GROUNDING_ELIGIBLE(x, P)
>             x : OccasionCandidate   -> the candidate was validly emitted (8.2.6)
>                                        and its grounding observation is eligible
>             x : any fold-read record-> PROJECTION_INPUT_ELIGIBLE(x)
>     AND every such citation is EXPLICIT and RE-PROVABLE from a to x
> ```

| # | Rule |
| :-- | :-- |
| **CS-1** | **The failure lands on the consumer.** Where `CITATION_SOUND(a)` is false, **`a`** is not `PROJECTION_INPUT_ELIGIBLE`, and **`a`** — which names a subject by construction — is the seed member. **`SCOPE` is `a`'s subject plus the §9.5.5 closure.** |
| **CS-2** | **No subject is invented for the referent** (BI-42). The ineligible observation remains preserved, non-grounding and un-scoped. It acquires no B2 identity, no cluster, no occasion and no fail-closed subject by having been cited. |
| **CS-3** | **The dependency must be explicit and re-provable.** A citation is a recorded reference from `a` to `x`, re-derivable at read time — never inferred from co-presence, timing or content similarity. An adjudication that cannot re-prove its own citations is not `CITATION_SOUND`. |
| **CS-4** | **Blast radius is the consumer's, not the store's.** Only subjects in `a`'s §9.5.5 scope fail closed. An unrelated participant, and any other subject that does not consume `a`, is untouched (QS-2, QS-4). |
| **CS-5** | **Proposition-relative.** The same observation may be soundly cited for one proposition and unsoundly for another — an `AGGREGATE_EXPOSURE` fact cited as exposure context is sound; the same fact cited for occurrence is not (JD-1, BI-26). `CITATION_SOUND` is evaluated per citation, not per referent. |
| **CS-6** | **This is the only route by which an ineligible source fact can affect a B2 projection**, and it always fails **closed at the consumer** rather than silently contributing. |
| **CS-7** | *(new in V1.7)* **The referents `CITATION_SOUND` ranges over are exactly the semantic-citation edges of §9.3.5.1, and no others.** A preserved provenance reference and a structural endpoint relation are **not** citations, are **not** consulted by `CITATION_SOUND`, and **create no eligibility dependency** (CD-2, CD-3). *"Every operative reference is probably a citation"* is **not** the rule and must never be implemented as one. |
| **CS-8** | *(new in V1.7)* **`CITATION_SOUND(a)` is evaluated only over referents strictly earlier than `a` in the `CitationDependencyGraph`**, which `CD-01` guarantees exists for every citing record. **`CITATION_SOUND` therefore terminates**, and **no record's eligibility is ever a function of its own eligibility** (CD-6, CD-9). Where a cycle physically exists, §9.3.5.1's `CD-7` governs — **not** a fixed-point computation. |

#### 9.3.5.1 The `CitationDependencyGraph` — classified, acyclic and terminating *(new in V1.7; closes `JBA16-AUD-01`)*

**The defect this closes.** V1.6 made `PROJECTION_INPUT_ELIGIBLE(r)` depend on `CITATION_SOUND(r)`, and let `CITATION_SOUND(a)` consult `PROJECTION_INPUT_ELIGIBLE(x)` for a fold-read referent `x`. Where citations form a cycle those two clauses are a **recursive equation with no specified semantics**: V1.6 defined no fixed point, gave no evaluation order, and stated no failure behaviour. It also never said **which** references are dependency edges at all, so an implementer could only guess that *"every operative reference is probably a citation"*. **Both gaps are closed here, and neither is closed by guessing a fixed point.**

##### The three kinds of reference

| # | Rule |
| :-- | :-- |
| **CD-1** | **Every reference one persisted B record makes to another is exactly one of three kinds**, and the kind is a **property of the record class and the reference role**, fixed by CD-3 — never inferred per instance, never inferred from co-presence, timing or content similarity. |
| **CD-2** | **Only a semantic citation is an eligibility-dependency edge.** `PROJECTION_INPUT_ELIGIBLE` may depend on a referent's eligibility **through a semantic citation and through nothing else**. A **mere provenance reference** creates **no** eligibility dependency — it is preserved verbatim and merges, grounds and gates nothing (RP-2, RP-3, AU-3). A **structural endpoint relation** creates an **`SG-R` obligation on the referring record** (§9.4.1) and **no eligibility dependency**. |
| **CD-3** | **The classification is closed.** The table below is the complete enumeration of reference roles the architecture admits. **A reference role not appearing in it may not be written**; a new one requires an amendment under `AM-10` / `AM-10a`. |

##### CD-3 — the closed classification table

| # | Reference (from → to) | Kind | Eligibility edge? | Governing rule |
| :--: | :-- | :-- | :--: | :-- |
| 1 | **`OccasionCandidate` → its grounding `SourceObservation`** | **semantic citation** | **YES** | AU-1, CE-1; the referent must be `SOURCE_GROUNDING_ELIGIBLE` for the proposition |
| 2 | **`ReconciliationAdjudication` → a cited `SourceObservation`** | **semantic citation** | **YES** | §9.3.5; `SOURCE_GROUNDING_ELIGIBLE(x, P)` |
| 3 | **`ReconciliationAdjudication` → a cited `OccasionCandidate`** | **semantic citation** | **YES** | §9.3.5; validly emitted **and** its grounding observation eligible |
| 4 | **`ReconciliationAdjudication` → another adjudication cited as factual basis** *(e.g. `OCCURRENCE_REINSTATED` citing the prior establishment; `SOURCE_CORRECTION` citing the finding it re-opens)* | **semantic citation** | **YES** | §9.3.5; `PROJECTION_INPUT_ELIGIBLE(x)`. **Within layer `L2`; `CD-01` still forbids a cycle** |
| 5 | **Plurality basis — `PLURALITY_UNRESOLVED_FINDING` / `SAME_EVENT_FINDING` / `DISTINCT_EVENT_FINDING` → each member observation and candidate** | **semantic citation** | **YES** | §9.7.1; the bounds are a claim **about** those members |
| 6 | **Merchant basis — `MERCHANT_ESTABLISHED` / `MERCHANT_UNRESOLVED_FINDING` → the observations relied on** | **semantic citation** | **YES** | §13.4; the merchant projection is authoritative only over eligible bases |
| 7 | **Joint-sufficiency basis — the `JS-1`…`JS-6` record inside an adjudication → each fact in the cited combination** | **semantic citation** | **YES** | §6.8, FC-07, JD-1…JD-4 |
| 8 | **`AGGREGATE_INCONSISTENCY_OBSERVATION` → the `ExposureFact` it reports on** | **semantic citation** | **YES** | §6.6.2, BI-26; sound only **within** the aggregate scope. **The sole authorized `L2 → L5` citation — see the named exception at `CD-5a`** |
| 9 | **`CandidateLink` / `OccasionSourceLink` → the candidate or observation it links** | **semantic citation** | **YES** | §14.1; a link is authoritative only over eligible endpoints |
| 10 | **`ExposureFact` → the `WeeklyExposureReport` observation it is derived from** | **semantic citation** | **YES** | §6.6; the exposure surface reads only eligible aggregate facts |
| 11 | **`ADJUDICATION_SUPERSESSION` → its source and target adjudications** | **structural endpoint relation** | **no** | `SG-01`…`SG-07` (well-formedness) and `SG-10` (retirement). **Retirement is an explicit-reference rule, never an eligibility dependency** |
| 12 | **Any record → the B2 subject it names or belongs to** | **structural endpoint relation** | **no** | §9.5.5's `subject()`; this determines **scope**, not eligibility |
| 13 | **`DecompositionManifest` → its member candidates and container observation** | **structural endpoint relation** | **no** | DC-02, DC-03, DB-06 — **mapping integrity**, enforced at write |
| 14 | **`StructuralIntegrityQuarantine` → its target; `QuarantineRescission` → its `qid`** | **structural endpoint relation** | **no — and explicitly NOT a `CitationDependencyGraph` edge** | These are **`DispositionControlGraph`** edges (§9.3.3.7). The two graphs are **disjoint in kind** (DG-9) |
| 15 | **`OccasionCandidate` → preserved A2-lineage references (`PurchaseIntent`, `Decision`, `Outcome`)** | **mere provenance** | **no** | RP-2, RP-3 — **preserved verbatim, merges nothing, changes no count, grounds nothing** |
| 16 | **Source-native relation record → the two assertions it relates** | **mere provenance** | **no** | AU-3, CE-5, BI-28 — a relation the source supplies **merges nothing** |
| 17 | **Receipt / ingestion receipt → its target record and material** | **mere provenance** | **no** | BI-14, DB-10 — a **pointer**, re-proved at read time, **never identity or eligibility authority** |
| 18 | **Non-grounding emission marker → the addressable assertion it records** | **mere provenance** | **no** | CE-2, CE-3 — it records that **no** candidate was emitted |
| 19 | **Decomposition-ambiguity record → its container observation** | **mere provenance** | **no** | DC-02a, AU-5 |
| 20 | **Structural-admission record / affected-scope record / integrity-error and anomaly record → the records they describe** | **mere provenance** | **no** | **Derived, non-authoritative Tier 4 artifacts** (§9.3.8). Reading one is **never** an eligibility input, which is what keeps the seed from seeding itself |
| 21 | **`DeletionAuthorization` → the entities whose deletion it authorizes** | **mere provenance** *(control-plane)* | **no** | §16.5, DB-09 — it authorizes a mutation; it never affects a scientific projection |
| 22 | **Deletion residue — tombstone, typed-missingness marker, severed-reference marker → the removed entity** | **mere provenance** *(conditional)* | **no** | BI-31, §16.6.1 — residue exists **only where permitted** and grounds nothing |
| 23 | **Re-adjudication marker → the finding it re-opens** | **mere provenance** *(operational)* | **no** | §9.9, AT-08 — it **re-opens** a finding; it does not supply one |
| 24 | **Any record → its actor, capability, knowledge time or allocation ordinal** | **mere provenance** | **no** | §15, DB-13, DB-14. **§9.3 consults no ordering** (DF-2) |

> **Nothing is left to *"probably a citation"*.** Rows 1–10 are the **complete** set of eligibility edges. Rows 11–14 are structural obligations of the referring record. Rows 15–24 are preserved and inert for eligibility purposes.

##### Construction layers and acyclicity

| # | Rule |
| :-- | :-- |
| **CD-4** | **Every persisted class carries a construction layer**, fixed by the accepted B1 → B2 ordering: **`L0`** source observations and their Tier 1 companions · **`L1`** candidates and decomposition manifests · **`L2`** reconciliation adjudications and their recorded bases · **`L3`** B2 subjects — canonical occasions, Type A clusters, Type B subjects · **`L4`** candidate and occasion source links · **`L5`** exposure facts. |
| **CD-5** | **A semantic citation may point only to a strictly earlier layer**, with **one** within-layer exception: an **`L2` → `L2`** citation (CD-3 row 4) is permitted, because an adjudication may legitimately cite an earlier adjudication as factual basis. **`CD-01` applies to it unchanged.** No other within-layer or forward citation may be written, **except the single named `L2 → L5` exception stated at `CD-5a`**. |
| **CD-5a** | *(new in V1.8; repairs the `JBA16-AUD-01` layering conflict an independent audit found in V1.7)* **The single named forward-citation exception: `AGGREGATE_INCONSISTENCY_OBSERVATION → ExposureFact` (CD-3 row 8) may cite `L2 → L5`.** CD-3 row 8 already required this citation; CD-5 as written forbade it. This is the **only** citation this contract authorizes across more than one forward layer, and it is authorized **by name, for this one reference role** — it is **not** a general "forward citation is allowed" rule, and no other CD-3 row may be read to permit one. **Proof that it cannot introduce recursive eligibility:** `ExposureFact`'s only semantic citation runs to the `WeeklyExposureReport` observation it is derived from (CD-3 row 10); `ExposureFact` makes **no** citation to a `ReconciliationAdjudication` or to any other `L2` record. No edge therefore exists by which the cited `ExposureFact` could cite back, directly or transitively, the `AGGREGATE_INCONSISTENCY_OBSERVATION` that cites it, and `CD-01`'s acyclicity requirement is unaffected. `DB-08c`'s write-time layer check treats this one row as a recognized permitted edge rather than a layer-violation rejection. |
| **CD-01** | **The `CitationDependencyGraph` MUST be acyclic.** **No record may obtain its eligibility from itself, directly or transitively.** This is a **structural invariant of the persisted record set**, enforced at write time where representable (**DB-08c**) and verified at read time otherwise. |
| **CD-6** | **The recursion is structural.** `PROJECTION_INPUT_ELIGIBLE(a)` consults `CITATION_SOUND(a)`, which consults the eligibility of referents **strictly earlier than `a`** in the `CitationDependencyGraph`. CD-5 and `CD-01` guarantee such an ordering exists. **There is no other recursive reference in §9.3.2 or §9.3.5.** |

##### CD-7 — what happens if a cycle physically exists

> ```
> A CITATION_DEPENDENCY_CYCLE is a set-level integrity violation.
>
>   -> NO member of the cycle is PROJECTION_INPUT_ELIGIBLE.
>   -> EVERY member of the cycle is a FAIL_CLOSED_SEED member
>      (9.3.6, set 4) -- every one is an L1..L5 class that names or belongs
>      to a B2 subject, so SCOPE is defined for each (BI-41, FS-5).
>   -> The JOINT 9.5.5 fixpoint over those members FAILS CLOSED, with a typed
>      CITATION_DEPENDENCY_CYCLE integrity error naming every member.
>   -> NO member is selected. NO arbitrary winner. NO iteration to a fixed
>      point. NO ordering, recency, timestamp, count or actor authority
>      resolves it (P-14).
>   -> The remedy has the SAME SHAPE as IQ-9c's: only an independently
>      provable RECORD-LEVEL defect in ONE SPECIFIC member makes that member
>      excludable (9.5.4); otherwise the scope remains fail closed, possibly
>      indefinitely, until lawful removal under 16.
> ```

| # | Rule |
| :-- | :-- |
| **CD-8** | **A DAG prohibition is chosen over a fixed-point calculus, and the reason is recorded.** The accepted authority already orders B1 before B2 (BI-02, BI-24) and already forbids a record from grounding itself (BI-03, P-01). A citation cycle therefore has **no legitimate meaning** under the accepted semantics — it is always a defect, never a representable state. **Defining a unique-fixed-point calculus would give a defect an answer.** Accordingly: **iterating "until stable" is PROHIBITED**, **latest-wins / first-wins / highest-authority-wins are PROHIBITED** (P-14, BI-15), and **no member of a cycle may be dropped to make the remainder computable.** |
| **CD-9** | **Stratification and termination, proved.** Evaluation of §9.3 proceeds in **five strata**, each reading only strata below it: **(α)** the two primitive axes `STRUCTURAL_VALID` and `GENERATION_AUTHORIZED`, which read a record and what it explicitly references and **nothing derived**; **(β)** the disposition fold — `DISPOSITION_EVENT_EFFECTIVE`, `ACTIVE_QUARANTINES`, `CURRENTLY_QUARANTINED`, `VALID_DISPOSITION` — which reads **only** α and the `DispositionControlGraph`, terminating by DG-8 and **never** consulting γ (DE-12, DG-9); **(γ)** the typed predicates and `CITATION_SOUND`, evaluated by structural recursion on the `CitationDependencyGraph`, terminating by CD-6 and `CD-01`; **(δ)** set-level validation `SG-S` and `SG-10` over the γ result; **(ε)** the fail-closed seed and its §9.5.5 scope. **No stratum reads a later one.** Both recursions run on **finite acyclic graphs**, so the whole composition terminates in **at most `\|R\|` steps** over the persisted record set and yields **exactly one** value per record. **This is a proof, not a convention.** |
| **CD-10** | **Every citation edge is explicit and re-provable**, recorded as a reference from the citing record to the cited one and re-derivable at read time (CS-3). **An edge inferred from co-presence, timing, content similarity or an actor's intent is not an edge**, and a record whose citations cannot be re-proved is not `CITATION_SOUND`. |
| **CD-11** | **A cycle never invents a subject for a Tier 1 record.** `L0` records make **no** citations (CD-3 rows 1–10 all originate at `L1` or later), so **no source observation, source-native relation, ambiguity record or non-grounding marker can lie on a citation cycle**. Every cycle member is therefore seed-eligible with a defined `SCOPE`, and **BI-42 is preserved unchanged**. |

#### 9.3.6 The fail-closed seed — typed, and total by construction *(closes `JBA15-AUD-01`; extended per `JBA16-AUD-01` and `JBA16-AUD-04`)*

> ### The seed
>
> ```
> FAIL_CLOSED_SEED =
>     { r : INTEGRITY_SEED_ELIGIBLE(r)
>           AND NOT PROJECTION_INPUT_ELIGIBLE(r)
>           AND NOT VALID_DISPOSITION(r) }
>   U { the members of every SG-S violation over the PROJECTION_INPUT_ELIGIBLE set }
>   U { r : INTEGRITY_SEED_ELIGIBLE(r)
>           AND an ERRONEOUS active quarantine on r is HARMFUL (AN-1a, MQ-4) }
>   U { r : r lies on a CITATION_DEPENDENCY_CYCLE }                      (CD-7)
>   U { r : r is the ultimate scientific target of a member of a
>           DISPOSITION_CONTROL_CYCLE }                                  (DG-4)
>
> A subject fails closed iff it lies in the 9.5.5 SCOPE of some seed member.
> ```

| # | Rule |
| :-- | :-- |
| **FS-1** | **Exclusion without disposition seeds; exclusion with a valid disposition does not.** *(carried, accepted)* |
| **FS-2** | **The second set is computed over the projection-input-eligible set**, so a validly dispositioned or otherwise ineligible record cannot contribute to an `SG-S` violation. |
| **FS-3** | **The third set catches only *harmful* erroneous quarantines** — those that are **operative** and exclude a record the fold would otherwise read (AN-1a, MQ-4). A non-operative event — non-admissible (MQ-7, MQ-8) or suppressed (MQ-9, MQ-10) — is an **anomaly**, recorded but not seeding (§9.3.3.6). |
| **FS-4** | Nothing here deletes anything. Every record, quarantine and basis persists, subject only to §16 (IQ-10). |
| **FS-5** | **Totality, by construction.** Every member of every set is **`INTEGRITY_SEED_ELIGIBLE`**, and by TE-5 that means its class **names or belongs to a B2 subject**. **`SCOPE` is therefore defined for every seed member**, and §9.3.8 discharges the claim class by class. **No record can enter this set for which `SCOPE` is undefined** (BI-41). |
| **FS-6** | **A source observation is never a seed member**, whatever its axes. Its ineligibility is expressed as **non-grounding** (TE-7) and, if something cites it, at the **consumer** (CS-1). |
| **FS-7** | *(new in V1.7)* **The fourth set is seed-eligible by construction.** `L0` records make no citations (CD-11), so **every** citation-cycle member is an `L1`…`L5` class that names or belongs to a B2 subject. **`SCOPE` is defined for each, and no Tier 1 record can enter this set.** |
| **FS-8** | *(new in V1.7)* **The fifth set seeds at the scientific target, not at the control event.** A disposition-control cycle is a defect in the control layer; the records whose authoritative eligibility becomes undecidable are the **ultimate scientific targets** reached by following `controls` edges out of the cycle. **Those are the seed members**, each with a defined `SCOPE` (DG-4, DS-5). A control event is never itself a seed member except under FS-3. |
| **FS-9** | *(new in V1.7)* **A Tier 4 derived record never seeds.** The affected-scope record, the structural-admission record and the integrity-error/anomaly record are **reproducible descriptions of a computation, never inputs to it** (§9.3.8, CD-3 row 20). Were one seed-eligible, recording a fail-closed scope would seed a further fail-closed scope without limit. **`INTEGRITY_SEED_ELIGIBLE` is false for all of Tier 4, and this is what makes the seed a finite set.** |

#### 9.3.7 The cases — exhaustive over the axes, for projection-input records

`REQ` = `DB-03B` required for the record's class. `VD` = `VALID_DISPOSITION`. **These cases are asked of Tier 2 and Tier 3 records** (§9.3.8); Tier 1 and Tier 4 are covered by §9.3.8's own rows.

| # | `STRUCTURAL_VALID` | `GENERATION_AUTHORIZED` | `CURRENTLY_QUARANTINED` | `VD` | **Projection input** | **Seeds** | State |
| :--: | :--: | :--: | :--: | :--: | :-- | :--: | :-- |
| **A** | ✔ | `AUTHORIZED` | ✘ | — | **YES** | no | ordinary operation |
| **B** | ✘ | any | ✘ | — | **NO** | **YES** | undispositioned structural defect |
| **C** | ✘ | any | ✔ | **✔** | **NO** | **NO** | **validly dispositioned structural defect — recovery** |
| **D** | ✘ | any | ✔ | ✘ | **NO** | **YES** | quarantine names a basis that does not hold; the genuine defect remains undispositioned in substance |
| **E** | ✔ | **`UNAUTHORIZED`** | ✘ | — | **NO** | **YES** | undispositioned authorization defect |
| **F** | ✔ | **`UNAUTHORIZED`** | ✔ | **✔** | **NO** | **NO** | **validly dispositioned authorization defect — legitimate** |
| **G** | ✔ | **`UNPROVEN`**, `REQ` | ✘ | — | **NO** | **YES** | required provenance unproven; **no quarantine licensed** (VD-2) |
| **H** | ✔ | `UNPROVEN`, **not** `REQ` | ✘ | — | **YES** | no | ordinary operation for a class not requiring `DB-03B` |
| **I** | ✔ | `AUTHORIZED` | ✔ | ✘ | **NO** | **YES** *(harmful)* | **erroneous quarantine** — operative, and it excludes a record the fold would otherwise read |
| **J** | ✔ | `UNPROVEN` | ✔ | ✘ | **NO** | **YES** *(harmful)* | erroneous — `UNPROVEN` is not a basis (VD-2, IQ-9d) |
| **K** | ✘ or `UNAUTH` | — | ✔ **valid + also an erroneous member** | **✔** | **NO** | **NO** *(anomaly only)* | **MQ-3** — the valid exclusion stands; the erroneous member is recorded but changes nothing (DQ-4) |
| **L** | ✔ | `AUTHORIZED` | ✔ **only non-admissible events** | ✘ | **YES** | no *(anomaly only)* | **MQ-7 / MQ-8** — a forged or unproven quarantine **never entered the active set**, so it excludes nothing (DE-7) |
| **M** *(new in V1.7)* | ✔ | `AUTHORIZED` | ✔ **only SUPPRESSED events** | ✘ | **YES** | no *(anomaly only)* | **MQ-9 / `DCG-2`** — the only quarantine on this record is **itself validly quarantined**, so it is **not `EFFECTIVE`** and never enters the active set. **The record is eligible again, and the suppressed event remains recorded** (DE-10, AN-5) |
| **N** *(new in V1.7)* | any | any | any | any | **NO** | **YES** | **the record lies on a `CITATION_DEPENDENCY_CYCLE`** (CD-7) or is the **ultimate scientific target of a `DISPOSITION_CONTROL_CYCLE`** (DG-4). **No member is selected, no fixed point is guessed, and the joint scope fails closed** with a typed error |

> **Cases K and L were added in V1.6** — a record validly excluded **while** an erroneous event sits alongside, and a record **not** excluded because the only quarantine on it was never admissible. **Cases M and N are added in V1.7**: a record freed by **suppressing** the event that excluded it, and a record whose eligibility is **undecidable** because a dependency graph contains a cycle. **Case N is the only case in this table whose consequence does not depend on the record's own axes**, and it is deliberately the harshest.

#### 9.3.8 Persisted-class registry — closed, with eight questions per class *(reissued per `JBA16-AUD-02`)*

**The defect this closes.** V1.6 asserted *"every record class the architecture admits appears above"* over **fourteen** rows, while this same document elsewhere names **source-native relation records** (§14.1, §23.1, AU-3), **typed decomposition-ambiguity records** (DC-02a), **non-grounding emission markers** (CE-2, CE-3), **affected-scope records**, **structural-admission records** and **integrity-error history records** (§9.5.7.1, IQ-10) — none of which appeared. The exhaustiveness claim was **false as written**. §9.3.8 is therefore reissued as a **closed registry**, and §9.3.8.3 disposes of **every** other logical name in this document.

**Tier 1 — preservation-only.** Never read by the fold; **never seeds**; failure means **non-eligibility for citation**.
**Tier 2 — projection input.** Read by the fold; **seeds**, with a subject by construction.
**Tier 3 — disposition control.** Governs admission; **seeds via its target's subject** where harmful, or is an anomaly.
**Tier 4 — control plane and derived record.** Neither projection input nor seed; failure has its own stated consequence.

##### 9.3.8.1 The registry — questions 1 to 5

| # | Persisted class | Tier / layer | 1. Projection participation? | 2. Can seed? | 3. Exact scope derivation if it seeds | 4. Exact authoritative consequence of its failure if it cannot seed |
| :--: | :-- | :--: | :-- | :--: | :-- | :-- |
| 1 | **`SourceObservation`** (S-1…S-9) | **1** / `L0` | **No** — never read directly by the fold (TE-4) | **No** | — | **Non-grounding**: `SOURCE_GROUNDING_ELIGIBLE` false ⇒ **no candidate emitted** (CE-2/CE-3), **no occurrence support**, deficiency **recorded**; preserved as diagnostic provenance. If cited, the **consumer** fails (CS-1) |
| 2 | **Source-native relation record** *(new row)* | **1** / `L0` | **No** — preserved provenance only; **merges nothing and changes no count** (AU-3, RP-3, CE-5) | **No** | — | **Inert.** A malformed or unauthorized relation record **relates nothing**: it is preserved, it grounds no equivalence, and **no candidate, count or B2 finding changes**. Cross-source equivalence is **B2-only** and comes from an adjudication, never from this record (BI-24, BI-28) |
| 3 | **Decomposition-ambiguity record** *(new row)* | **1** / `L0` | **No** — a B1 typed-ambiguity fact (DC-02a, AU-5) | **No** | — | **The container observation is not decomposed**: one container observation stands, **no member candidates are emitted**, and the ambiguity is **recorded and readable**. Attachment, receipt and array counts are **not** member counts |
| 4 | **Non-grounding emission marker** *(new row)* | **1** / `L0` | **No** — it records that **no** candidate was emitted (CE-2, CE-3) | **No** | — | **Its own absence is the defect.** Where an addressable assertion is non-grounding or its participant binding is unestablished, the marker **MUST** exist (CE-3, DB-04a); a missing or malformed marker is a **B1 emission-contract failure**, detected by the `CE-1`…`CE-7` LIVE suite, and **never** a B2 subject-level seed |
| 5 | **`OccasionCandidate`** | **1** / `L1` | **No** — a referent of adjudications, never a fold input (BI-03) | **No** | — | An invalidly emitted candidate is **not emitted** (§8.2.6); one that exists but is unsound makes any **citing adjudication** fail `CITATION_SOUND` (CS-1) |
| 6 | **`DecompositionManifest`** + member mapping | **1** / `L1` | **No** — a B1 artifact | **No** | — | A defective manifest yields **no member candidates** (CE-6, DC-02a); mapping uniqueness is enforced at write (DB-06); replay reproduces the stored mapping (DC-04) |
| 7 | **`ReconciliationAdjudication`** (all 16 kinds) | **2** / `L2` | **Yes** | **Yes** | **`subject(a)`** — the subject the adjudication names, plus §9.5.5 closure | — |
| 8 | **`ADJUDICATION_SUPERSESSION` edge** | **2** / `L2` | **Yes** | **Yes** | the subjects its **endpoints** name (§9.5.5), plus closure | — |
| 9 | **`PurchaseOccasion`** identity row | **2** / `L3` | **Yes** | **Yes** | **itself** — it *is* a subject | — |
| 10 | **`UnresolvedPluralityCluster`** (Type A) | **2** / `L3` | **Yes** | **Yes** | **itself** | — |
| 11 | **occurrence-unresolved subject** (Type B) | **2** / `L3` | **Yes** (as a subject with no established occurrence) | **Yes** | **itself** | — |
| 12 | **`CandidateLink` / `OccasionSourceLink`** | **2** / `L4` | **Yes** | **Yes** | the occasion or cluster subject it names, plus closure | — |
| 13 | **`ExposureFact`** | **2** / `L5` | **Yes**, on the **exposure surface only** | **Yes**, on its own period-subject | the `(participant, studyWeek)` **exposure subject** — never an occasion subject (BI-26) | — |
| 14 | **`StructuralIntegrityQuarantine`** | **3** | **Yes**, as a **disposition input** (§9.3.3) | **Yes**, where **harmful** (AN-1a) | the **target record's** scope, composed per §9.5.5.1 | Where **non-harmful**, **non-admissible** or **suppressed**: an **integrity anomaly** — recorded, reportable, dispositionable; **does not fail a subject closed** (§9.3.3.6) |
| 15 | **`QuarantineRescission`** | **3** | **Yes**, as a disposition input | **Yes**, where **harmful** | the **targeted quarantine's target record's** scope, composed per §9.5.5.1 (DS-2, DS-7) | Inert where its target does not resolve (RV-2, RV-8); otherwise an **anomaly** as above |
| 16 | **`DeletionAuthorization`** | **4** | **No** — control-plane artifact | **No** | — | An invalid or unauthorized authorization means **the deletion it purports to authorize is unauthorized** (§16.5, DB-09, AT-16a). It never affects a scientific projection |
| 17 | **Receipt / ingestion receipt** | **4** | **No** | **No** | — | A receipt is a **pointer, never identity authority**; resolution re-proves target and material, and **fails closed on mismatch** (BI-14, DB-10) — a read-time refusal, not a subject-level seed |
| 18 | **Structural-admission record** *(new row)* | **4** | **No** — a **reproducible, explicitly non-authoritative** record of an admission evaluation (P-06a, DF-2) | **No** | — | **It is never authority.** Where it disagrees with a recomputation from the record's own axes and the fold, **the recomputation governs and the stored record is discarded as drift** (DB-15). A missing one costs nothing; a stale one is **detectable and non-authoritative** |
| 19 | **Affected-scope record** *(new row)* | **4** | **No** — a reproducible record of the §9.5.5 fixpoint | **No** *(FS-9)* | — | **Same:** never authority; the scope is **always recomputed** from the seed and the record set (QS-5). A stale or absent scope record **never widens or narrows a fail-closed scope**, and — decisively — **recording a fail-closed scope never seeds another one** |
| 20 | **Integrity-error and integrity-anomaly history record** *(new row)* | **4** | **No** — the typed record of a fail-closed error (§9.5.6.1) or an anomaly (§9.3.3.6) | **No** *(FS-9)* | — | **It reports, it never causes.** It is **recorded, attributable, queryable and surfaced to C2 as data-quality provenance only** (AN-2, C2-6, §22.1). Its own malformation is a reporting defect, detected by the LIVE suite; **it never fails a scientific subject closed**, because doing so would make the report of a failure a second failure |
| 21 | **Deletion-residue artifact** — tombstone · typed-missingness marker · severed-reference marker · deletion-history entry *(new row)* | **4** | **No** | **No** | — | **Conditional existence** (BI-31, §16.6.1): where residue is permitted it is preserved and downstream sees **typed missingness**; where it is prohibited **none of it exists** and downstream sees **ordinary absence**. **Its absence is never an integrity defect**, and forbidden residue is **never reconstructed** (AT-22a) |
| 22 | **`LateActualTransactionFactSatellite`** *(new row; closes `JBA16-AUD-02`'s remaining omission, found by an independent audit of V1.7)* | **1**, bound to the `L3` `PurchaseOccasion` it satellites | **No** — preserved provenance only; **never read by the fold** | **No** | — | **Preserved, non-authoritative.** Append-only; may carry source event time that is coarse or **UNKNOWN**; **multiple values coexist** and **no canonical `actualTransactionAt` scalar exists**; there is **no current selection/winner rule** among coexisting values. **Any future scalar projection requires an accepted `O-11` amendment first** (§28.2), which must supply the selection semantics this revision does not invent |

##### 9.3.8.2 The registry — questions 6 to 8

**Question 8, answered once for every row.** Every persisted class in this registry is **append-only under ordinary and scientific operation** and is **subject to the controlling legal/consent/privacy deletion override** — **no exceptions, no unconditional residue, and no class exempt** (IQ-10, BI-31, §16, §16.9). The column below records only what is **class-specific** beyond that frozen rule.

| # | Persisted class | 6. Citation participation *(CD-3)* | 7. Disposition-control eligibility *(IQ-16)* | 8. Deletion behaviour beyond the frozen rule |
| :--: | :-- | :-- | :-- | :-- |
| 1 | `SourceObservation` | **cited** by rows 1, 2, 5, 7 of CD-3; **cites nothing** (`L0`) | **Inert target.** A quarantine naming it excludes nothing, because its eligibility is `SOURCE_GROUNDING_ELIGIBLE` over its own axes; recorded as an anomaly | — |
| 2 | Source-native relation record | **neither** — CD-3 row 16, mere provenance | **Inert target** | — |
| 3 | Decomposition-ambiguity record | **neither** — CD-3 row 19 | **Inert target** | — |
| 4 | Non-grounding emission marker | **neither** — CD-3 row 18 | **Inert target** | — |
| 5 | `OccasionCandidate` | **cited** by CD-3 rows 3, 5, 9; **cites** its grounding observation (row 1) | **Inert target** | — |
| 6 | `DecompositionManifest` | **neither** — CD-3 row 13 is structural | **Inert target** | — |
| 7 | `ReconciliationAdjudication` | **cites** CD-3 rows 2, 3, 4, 5, 6, 7, 8; **cited** by row 4 | **Operative target** — quarantinable on an `SG-R` or `UNAUTHORIZED` basis | — |
| 8 | `ADJUDICATION_SUPERSESSION` edge | **neither** — CD-3 row 11 is a **structural endpoint relation**; retirement is explicit-reference only | **Operative target** | — |
| 9 | `PurchaseOccasion` identity row | **neither as a citation** — CD-3 row 12, subject naming | **Operative target** | tombstone and purge states per §16.6 |
| 10 | `UnresolvedPluralityCluster` | **neither as a citation** — row 12 | **Operative target** | — |
| 11 | occurrence-unresolved subject | **neither as a citation** — row 12 | **Operative target** | — |
| 12 | `CandidateLink` / `OccasionSourceLink` | **cites** CD-3 row 9 | **Operative target** | unlinking is an **appended retraction**, never a delete (§14.1) |
| 13 | `ExposureFact` | **cites** CD-3 row 10; **cited** by row 8 | **Operative target** | — |
| 14 | `StructuralIntegrityQuarantine` | **neither** — CD-3 row 14 is a `DispositionControlGraph` edge, explicitly **not** a citation | **Operative target — YES.** The V1.6 choice, made executable in V1.7: bases are `SG-R`, `UNAUTHORIZED` **or `CONTROL_BASIS_FALSE`** (IQ-15). Subject to `DG-01` | purge of the target makes it **inert** (RV-8); purge of it never re-admits a bad record (RV-9) |
| 15 | `QuarantineRescission` | **neither** — CD-3 row 14 | **Operative target — YES**, on an `SG-R` or `UNAUTHORIZED` basis (`DCG-4`). **`CONTROL_BASIS_FALSE` does not apply**: a rescission names no basis (VD-7) | — |
| 16 | `DeletionAuthorization` | **neither** — CD-3 row 21 | **Inert target** | **itself mortal** (§16.5) |
| 17 | Receipt / ingestion receipt | **neither** — CD-3 row 17 | **Inert target** | — |
| 18 | Structural-admission record | **neither** — CD-3 row 20 | **Inert target** | recomputable; loss costs nothing |
| 19 | Affected-scope record | **neither** — CD-3 row 20 | **Inert target** | recomputable; loss costs nothing |
| 20 | Integrity-error / anomaly record | **neither** — CD-3 row 20 | **Inert target** | **not exempt** from the override (§16.9); where residue is prohibited, **no proof any integrity event occurred survives** |
| 21 | Deletion-residue artifact | **neither** — CD-3 row 22 | **Inert target** | **this class IS the residue**; its existence is conditional in both directions (BI-31) |
| 22 | `LateActualTransactionFactSatellite` *(new)* | **neither** — a **structural endpoint relation to its owning `PurchaseOccasion`** (CD-3 row 12); **cites nothing itself**; **not cited by any current record**, because no scalar projection over it exists to consume it | **Inert target** — Tier 1, per `IQ-16`/`DF-4` | follows the frozen §16 model; coexisting values do not change deletion behaviour; **a future `O-11` scalar projection must state its own citation and disposition treatment when adopted** |

| # | Rule |
| :-- | :-- |
| `IQ-16` §9.5.3 | Column 7 above applies **`IQ-16`**, stated normatively at **§9.5.3**: a quarantine has **operative effect only against a Tier 2 or Tier 3 target**; against a **Tier 1** or **Tier 4** target it is **inert** and is recorded as an **anomaly**. `ACTIVE_QUARANTINES` of any Tier 1 or Tier 4 record is therefore **`∅` by construction** (DF-4). **This section states no rule of its own; §9.5.3 is the definition.** |

##### 9.3.8.3 Subsumption and exclusion register — every other logical name in this document

**Rule.** A logical name appearing anywhere in this contract is either a **row of §9.3.8.1**, or it appears below with an explicit disposition. **There is no third possibility, and no name is left to inference.**

| Logical name used elsewhere in this document | Disposition |
| :-- | :-- |
| the sixteen **adjudication kinds** (§9.2) | **Not distinct persisted classes.** Each is a **typed kind of row 7**, `ReconciliationAdjudication`, for §9.3.8 purposes |
| **`AGGREGATE_INCONSISTENCY_OBSERVATION`** | **Not a distinct persisted class**; a **kind of row 7**, despite the word *"observation"* in its name. It is **never** a `SourceObservation` |
| **joint-sufficiency basis record** (`JS-1`…`JS-6`, §6.8) | **Not a distinct persisted class**; a **required field group of the row-7 adjudication** that cites the combination (FC-07) |
| **plurality basis**, **merchant basis**, **factual-basis record** | **Not distinct persisted classes**; the **citation set of a row-7 adjudication** (CD-3 rows 5, 6, 7) |
| **occurrence projection**, **merchant projection**, **provenance semantic state** (§13.4, §14.2, §25.2) | **Not persisted classes at all** — **derived capabilities computed on read** over rows 7–13. Storing one as authority is **prohibited** (P-06a, DF-2); a materialized copy is row 18 |
| **re-adjudication marker** (§9.9, AT-08) | **Not a distinct persisted class**; a **row-7 adjudication** of kind `SOURCE_CORRECTION`, `SOURCE_RETRACTION` or `AGGREGATE_INCONSISTENCY_OBSERVATION`, whose effect is to re-open findings |
| **privacy tombstone** (§16.6) | **Not a distinct persisted class**; a **deletion state of row 9**, together with a row-21 residue artifact where residue is permitted |
| **historical contradicted / retracted identity** (§16.6) | **Not a distinct persisted class**; a **projection state of row 9** (§25.3), reachable on the audit surface only |
| **quarantine basis**, **acting role / actor**, **trusted knowledge time** (§9.5.7.1) | **Not distinct persisted classes**; **required fields of rows 14 and 15** |
| **`qid`** (§9.3.3.1) | **Not a class**; the **identity of row 14** |
| **allocation sequence / ordinal** (BI-12, DB-13) | **Not a persisted class**; a **server-assigned field**. **§9.3 consults it not at all** (DF-2) |
| **`StudyParticipant`**, **`ExperimentAssignment`** | **Not B-persisted classes.** Upstream A1/A2 entities. B **binds to** a participant structurally (BI-09, §12) and never writes one |
| **`PurchaseIntent`**, **`Decision`**, **`Outcome`**, **`SavingEvidence`**, **`VerifiedValue`**, **`CanonicalEvent`**, **`ResearchContact`**, **`WeeklyExposureReport`** | **Not B-persisted classes.** They are **upstream artifacts of A2, M7 and C1** that reach B **only** as the content of a row-1 `SourceObservation` (§6.4), or as **preserved references** (CD-3 row 15). **B never owns, writes or mutates one** |
| **`AnalysisProtocol`**, opportunity, scientific independence, RIVSR | **Not B artifacts.** C2-owned; §22's firewall governs (BI-04, BI-05) |
| **`UnresolvedPluralityCluster` Type B** | **Not a cluster and not a distinct class** from row 11; BI-29 forbids representing a Type B state as a Type A cluster |
| **`actualTransactionAt`**, **late-known factual satellite(s)**, **actual transaction fact(s)** (§10.1, §24, §25.3, §28.2) *(new in V1.8)* | **Not itself a persisted class or a scalar.** It is the **field a row-22 `LateActualTransactionFactSatellite`** (§9.3.8.1) **records** — append-only, multiple values coexisting, no canonical scalar and no current selection rule. Every prior use of these phrases in this document resolves to row 22 |

##### 9.3.8.4 The closure rule

| # | Rule |
| :-- | :-- |
| **AM-10** | *(carried)* **A new persisted record class MUST NOT be written until it has a row in §9.3.8.** Adding a class without answering its registry questions reintroduces `JBA15-AUD-01` silently, and is an amendment trigger. |
| **AM-10a** | *(new in V1.7)* **`AM-10` covers genuinely future classes only.** It **MUST NOT** be invoked to excuse a class this document already names. Every logical name in this contract is disposed of by §9.3.8.1 or §9.3.8.3 **as of this revision**; a reader who finds one that is not has found a defect in this section, **not** a case for `AM-10`. |
| **AM-10b** | *(new in V1.7)* **A new reference role is subject to the same rule.** A reference not classified by CD-3 **MUST NOT** be written until CD-3 classifies it, because an unclassified reference is one whose effect on eligibility is undefined (CD-3, `CD-01`). |

> **The totality claim, now discharged rather than asserted.** **Twenty-two persisted classes** *(twenty-one as of V1.7, plus row 22's `LateActualTransactionFactSatellite`, added in V1.8 to close `JBA16-AUD-02`)*, each answering **eight** questions. **Every class that can seed has a stated subject derivation**, so `SCOPE` is defined for it. **Every class that cannot seed has a stated authoritative consequence** for its failure. **Every other logical name in this document is explicitly subsumed or explicitly excluded** (§9.3.8.3). **No class is left to a global default**, and **no class enters a set whose scope is undefined** (BI-41, FS-5, FS-7, FS-9).

#### 9.3.9 The projection fold — stratified, terminating, deterministic

```
CURRENT PROJECTION over a subject (candidate group, cluster, occasion, exposure
period, or attribute). The step numbers ARE the strata of CD-9: each step reads
only steps before it, and no step reads a later one.

  [alpha]
  0. EVALUATE the two PRIMITIVE axes for each persisted record, independently
     (9.3.1). STRUCTURAL_VALID uses SG-R, inspecting the record AND everything it
     explicitly references, INDEPENDENT of surviving findings (AX-5, RS-1).
     GENERATION_AUTHORIZED is a DB-03B property of the record's own creation,
     never inherited across a reference (BI-38).
     -- reads NOTHING derived.

  [beta]
  1. FOLD the disposition history (9.3.3) over the DispositionControlGraph:
        DISPOSITION_EVENT_STRUCTURALLY_VALID / _GENERATION_AUTHORIZED
        DISPOSITION_EVENT_CURRENTLY_QUARANTINED   -- the same fold, one level up
        DISPOSITION_EVENT_ADMISSIBLE
        DISPOSITION_EVENT_EFFECTIVE               -- admissible AND not suppressed
        ACTIVE_QUARANTINES(t)         -- set, no ordering, EFFECTIVE membership
        CURRENTLY_QUARANTINED(t)      -- derived
        VALID_DISPOSITION(t)          -- derived (9.3.4)
     TERMINATES by structural recursion on control depth over a finite acyclic
     graph (DG-01, DG-6, DG-8). A DISPOSITION_CONTROL_CYCLE makes every member
     ineffective and seeds the ultimate scientific targets (DG-4, FS-8).
     -- reads ONLY step 0 and the DispositionControlGraph. NEVER CITATION_SOUND
        and NEVER PROJECTION_INPUT_ELIGIBLE (DE-12, DG-9).

  [gamma]
  2. TYPE each record and evaluate only the predicates its class admits (9.3.2,
     9.3.8):
        SOURCE_PRESERVED / SOURCE_GROUNDING_ELIGIBLE / PROJECTION_INPUT_ELIGIBLE
        / INTEGRITY_SEED_ELIGIBLE
     CITATION_SOUND is evaluated for every authoritative record that cites a
     referent, over the semantic-citation edges of CD-3 AND NO OTHERS (CS-7).
     TERMINATES by structural recursion on the CitationDependencyGraph, which
     CD-01 requires acyclic (CD-6, CD-9). A CITATION_DEPENDENCY_CYCLE makes
     every member ineligible and every member a seed (CD-7, FS-7).
     -- reads steps 0-1 only. NO iteration to a fixed point is performed, and
        none is permitted (CD-8).

  [delta]
  3. VALIDATE the PROJECTION_INPUT_ELIGIBLE set as a set: SG-S (9.4.1).

  [epsilon]
  4. COMPUTE the FAIL_CLOSED_SEED (9.3.6) and its 9.5.5 scope.
     If this subject lies in that scope -> NO AUTHORITATIVE PROJECTION,
     typed integrity error. Never a best guess.
     Only INTEGRITY_SEED_ELIGIBLE records can be seed members (FS-5), and no
     Tier 4 derived record is ever one (FS-9).

  5. Take all PROJECTION_INPUT_ELIGIBLE adjudications naming that subject.

  6. Remove every RETIRED adjudication. An adjudication is RETIRED iff at least one
     PROJECTION_INPUT_ELIGIBLE ADJUDICATION_SUPERSESSION edge targets it
     (9.4.4, SG-10) - by EXPLICIT REFERENCE ONLY, never by recency, ordering or
     confidence.

  7. Of what remains:
       - exactly one non-contradicted finding   -> that is the current interpretation
       - zero findings                          -> UNRESOLVED
       - two or more mutually incompatible,
         none retired                           -> CONTESTED   (NOT a winner pick)

  8. UNRESOLVED and CONTESTED are first-class, durable, analysis-visible states.
```

**Five strata, deliberately separated.** Step 0 asks *"is this record sound and authorized on its own?"*; step 1 asks *"what has the integrity layer **effectively** said about it?"*; step 2 asks *"is what it depends on eligible?"*; step 3 asks *"is the eligible set sound together?"*; step 4 asks *"has every unsound thing that can matter been identified and recorded?"*.

**Termination and uniqueness, stated as a property of the whole fold.** Both recursions — step 1's over the `DispositionControlGraph` and step 2's over the `CitationDependencyGraph` — run on **finite acyclic** graphs, and **no stratum reads a later one** (CD-9, DG-9, DE-12). The projection is therefore computed in **at most `|R|` steps** over the persisted record set, yields **exactly one** value per record, and is **identical for any two independent verifiers reading the same history**. **No iteration to a fixed point occurs anywhere, and none is permitted** (CD-8).

The fold contains **no comparison step over values, no ordering and no recency** — only axis evaluation, a set-valued disposition fold over effective events, structural recursion over two acyclic graphs, typed eligibility, and explicit-reference retirement. **P-14 is therefore structurally unviolatable rather than merely asserted.**

**Ordering.** Where a total order is needed for replay and audit it is a **server-assigned allocation sequence**, not a timestamp (BI-12; DB-13 states its precise, limited guarantee). **Nothing in §9.3 consults it.**

### 9.4 Supersession graph — levelled structural validity vs substantive conflict

#### 9.4.1 Two levels of structural invalidity *(closes `JBA13-AUD-01`)*

**The defect this closes.** V1.3 listed SG-01…SG-07 as one undifferentiated set of "structural invariants", and IQ-5 admitted a quarantine wherever the named record *"actually violates the named structural invariant"*. For a **cycle**, every member edge equally and genuinely violates SG-02 — so IQ-5 admitted **any** of them, and under SG-10 different removals retire different adjudications and therefore surface **different findings**. The integrity actor was, in effect, selecting scientific state; Part K's `K-C3` said so out loud (*"quarantine the edge(s) whose removal restores acyclicity"*). That breaches **IQ-4** and **P-14**.

The repair is to distinguish **the level at which a violation exists**.

> **`SG-R` — record-level.** The violation is a property of **one record**, decidable from that record and the records it names, **without reference to any other record's validity and without reference to which findings would survive.** There is exactly one culprit, and it is identified by the rule, not chosen.
>
> **`SG-S` — set-level.** The violation is a property of a **set** of records, **no member of which is individually invalid.** There is no culprit the rule can name; every candidate removal is a choice.

| # | Structural invariant | Level | Individually invalid? |
| :-- | :-- | :--: | :-- |
| **SG-01** | **No self-supersession.** An adjudication may not supersede itself. | **`SG-R`** | **Yes** — the edge's own source equals its own target |
| **SG-02** | **No supersession cycles.** The supersession relation must be a DAG. | **`SG-S`** | **No** — every member edge is individually well-formed |
| **SG-03** | **Subject compatibility.** A supersession may target only an adjudication naming the **same subject**. | **`SG-R`** | **Yes** — the edge names two subjects |
| **SG-04** | **Participant compatibility.** Superseding and superseded adjudications must concern the **same participant**. | **`SG-R`** | **Yes** — the edge crosses participants |
| **SG-05** | **Kind compatibility.** Occurrence kinds supersede occurrence kinds; merchant kinds merchant kinds; plurality kinds plurality kinds; link kinds link kinds. | **`SG-R`** | **Yes** — the edge's endpoint kinds are incompatible |
| **SG-06** | **Target must exist and be visible.** A supersession naming a non-existent, redacted-beyond-reference or uncommitted target is invalid. | **`SG-R`** | **Yes** — the edge names an unresolvable target |
| **SG-07** | **No branching supersession.** **At most one admitted supersession edge may target a given adjudication.** | **`SG-S`** | **No** — each edge alone is well-formed; the pair is the violation |

| # | Governing rule |
| :-- | :-- |
| **SG-R-1** | An `SG-R` violation makes `STRUCTURAL_VALID(r)` **false**. The record is **never projection-input-eligible** (§9.3.1), whether or not it has been quarantined. |
| **SG-S-1** | An `SG-S` violation makes `set_structurally_valid` **false** over the admitted set. **No member's own validity changes**, and therefore **no member becomes quarantine-eligible by virtue of the set violation alone** (IQ-9). |
| **SG-S-2** | An `SG-S` violation fails its §9.5.5 scope closed and **has no quarantine remedy**. It is resolved only by independently identifying a member as an `SG-R` violation or as unauthorized under **DB-03B** — which is a finding about **that record**, not a choice among outcomes. |
| **SG-08** | Incompatible unsuperseded findings over a structurally valid admitted graph project as **`CONTESTED`** (§9.4.3). This is **not** a validity violation at either level. |
| **SG-09** | **Structural invalidity fails closed.** Any `SG-R` or `SG-S` violation yields no projection for the **affected scope** (§9.5.5) and a typed integrity error. A partially valid graph does not produce a partial answer. **SG-09 governs SG-01…SG-07 only; SG-08 is not a validity violation.** |

> **Why this is the whole of the `JBA13-AUD-01` repair.** Quarantine is a **record-level** remedy: it names one record and excludes it. A **set-level** violation has no unique record to name. Therefore **quarantine structurally cannot address `SG-02` or `SG-07`** — not by prohibition bolted on afterwards, but because the remedy's shape does not fit the defect's shape. The question *"which edge should we remove?"* never arises, because the mechanism that would ask it is not applicable.

#### 9.4.2 Why branching is INVALID rather than CONTESTED — deliberate choice

Supersession means *"this replaces that."* Two simultaneous replacements of one target have **no coherent single interpretation**: the model provides no way to say which replacement is in force, and admitting the state as `CONTESTED` would let an incoherent graph still produce a projection — precisely the failure SG-09 exists to prevent.

`CONTESTED` is reserved for a **real disagreement about the world** (two incompatible merchant findings; a same-event and a distinct-event finding both live). Branching supersession is not a disagreement about the world; it is a malformed edge set.

**Cost accepted, and now stated precisely.** Correcting a *legitimately mistaken* supersession requires superseding the *superseder* (a chain), not adding a second parallel edge. Correcting a *structurally malformed* record that physically entered uses the **record-level quarantine path** of §9.5. And a **branching set** in which no individual edge is identifiable as malformed has **no** quarantine path at all (SG-S-2) — it fails closed until one edge is independently shown to be an `SG-R` violation or unauthorized under DB-03B.

#### 9.4.3 Substantive conflict — `CONTESTED`, projected

A graph that is structurally **valid at both levels** may still carry incompatible unsuperseded findings. These project as **`CONTESTED`** (§9.3.3 step 6). They are never merged, averaged, ranked or defaulted — and, per **IQ-4**, they have **no quarantine remedy**.

#### 9.4.4 No resurrection — as *projection-input-eligible* edge existence, without hidden state

| # | Rule |
| :-- | :-- |
| **SG-10** | **An adjudication is RETIRED if and only if at least one `PROJECTION_INPUT_ELIGIBLE` `ADJUDICATION_SUPERSESSION` edge targets it**, where eligibility is exactly §9.3.2's predicate — which itself reads the derived disposition fold of §9.3.3. Retirement is a function of **eligible-edge existence alone** and is independent of whether the superseder is itself retired. |

**The consequence.** If **B** supersedes **A**, the eligible edge *"B supersedes A"* records A as retired. If **C** later supersedes **B**: **B** becomes retired; **A does NOT reactivate**, because the eligible edge targeting A still exists; reactivation requires a **new explicit reassertion**, which is a new adjudication, not an un-retirement of *A*.

**No hidden mutable state.** `RETIRED(x)` is computed as *"∃ a projection-input-eligible edge targeting x"* — a pure predicate over §9.3.2's predicate, which is a pure function of the three axes and the **set-valued** disposition fold. **Nothing is stored, flipped, ordered or reconciled**, and no boolean is the source of truth (DF-2).

##### 9.4.4.1 Recomputation after a valid exclusion is not resurrection *(carried; RS-1 corrected per `JBA15-AUD-03`)*

> **The rule (BI-40, IQ-9b).** Where an edge is independently established as `SG-R`-malformed or `GENERATION_AUTHORIZED = UNAUTHORIZED`, and validly dispositioned, it **leaves the projection-input-eligible set**. `SG-10` is then **recomputed over that set**. If no other eligible edge targets its former target, that target **is live** — and this is **not** scientific resurrection by integrity choice.

**Why it is not winner selection — four reasons:**

| # | Reason |
| :-- | :-- |
| **RS-1** | **The record was chosen by evidence about itself, not by its effect.** *(corrected in V1.6.)* The basis is an `SG-R` violation of the edge, or a `DB-03B` provenance failure of the edge. Establishing it **may — and for `SG-03`…`SG-06` must — inspect the edge and everything the edge explicitly references, including its source and target endpoints and their subjects, participants and kinds.** What the determination is **independent of** is **which scientific finding or projection would survive** the edge's exclusion (IQ-9a, AX-5). *(V1.5 stated this as independence from the edge's own references, which is wrong: SG-03 compares subjects, SG-04 compares participants, SG-05 compares kinds and SG-06 resolves the target — all of which require reading the endpoints. The operative rule is unchanged; only its statement was inaccurate.)* |
| **RS-2** | **`SG-10` is a pure function, not an act.** Nothing "resurrects" anything. The predicate is re-evaluated over a corrected input set, and any independent verifier recomputes the same result. |
| **RS-3** | **The counterfactual is strictly worse.** Retaining a forged edge's effect means **an unauthorized write permanently determines scientific state** — the forger becomes the winner-selector. That is the **P-14 harm inverted**. |
| **RS-4** | **It is fully auditable.** The quarantine names the edge, the invariant or provenance failure, the basis, the acting role and the knowledge time (IQ-1). The retirement change is a **derivable consequence**, not a recorded decision. |

##### 9.4.4.2 `SG-10` re-tests over the derived fold — required

| # | Setup | Required result |
| :-- | :-- | :-- |
| **SG10-1** | `B → A`, eligible | **A retired**; B live |
| **SG10-2** | `B → A` and `C → B`, both eligible | **A retired**, **B retired**, **C live**. Chain parity irrelevant |
| **SG10-3** | `B → A` **independently proven `UNAUTHORIZED`** and **validly quarantined** (Case F) | the edge leaves the eligible set; **stops seeding** (FS-1); `SG-10` recomputes; **if no other eligible edge targets A, A is live.** Not winner selection (RS-1…RS-4) |
| **SG10-4** | **Cycle** with no individually excludable member | **no quarantine admissible** (IQ-9c, SG-S-2); scope **fails closed** and **stays** fail closed |
| **SG10-5** | **Branching** with no individually excludable member | as SG10-4 |
| **SG10-6** | A **cycle member later independently proven forged** | that exact record becomes quarantine-eligible **through the provenance failure**; recompute; if the cycle disappears projection resumes, else the scope stays closed **for the remaining reason** |
| **DQ-1** | **One valid quarantine** removes a forged `B → A` | the edge leaves the eligible set; **A may reappear by recomputation** (RS-1…RS-4) |
| **DQ-2** | **Two valid quarantines** target `B → A`; **rescind one** | the rescission names **one `qid`** (DE-2); the **other remains in `ACTIVE_QUARANTINES`**; `CURRENTLY_QUARANTINED` stays **true**; **`B → A` remains quarantined** (MQ-2, MQ-5) |
| **DQ-3** | **Rescind the second** | `ACTIVE_QUARANTINES(B→A)` is now **empty**; the edge is **reconsidered under its own independent structural and generation state** — if it is still `SG-R`-invalid or `UNAUTHORIZED` it is **still not eligible** and **seeds again** (Case B/E, IQ-11a); it is **not** restored by the rescissions (RV-10) |
| **DQ-4** | **A valid quarantine and an erroneous quarantine coexist** on the same record | the **valid exclusion stands** — `VALID_DISPOSITION` is existential (MQ-3); the record does **not** re-enter the eligible set merely because a bad event exists; the **erroneous event generates an integrity anomaly**, recorded and dispositionable, and **does not fail the subject closed** because it changes nothing the projection would otherwise admit (AN-1) |
| **DQ-5** | **A forged rescission** attempts to reactivate `B → A` | it is **not `DISPOSITION_EVENT_ADMISSIBLE`** (DE-6), so it **never enters the fold** and **`ACTIVE_QUARANTINES` is unchanged** (DE-7). The edge **stays quarantined**. The forged event is an **anomaly**, and is itself dispositionable (DE-8) |
| **DQ-6** | An **`UNPROVEN` rescission** | **must not be treated as `AUTHORIZED`** and **must not silently clear the disposition** (DE-6, RV-4). `ACTIVE_QUARANTINES` is unchanged; the event is an **anomaly**; the remedy is to establish its provenance or prove it unauthorized |

> **What SG10-4 and SG10-5 guarantee, restated because it is a frozen area.** An `SG-S` violation with **no** independently identified excludable member has **no** remedy, and its scope may remain bounded fail closed **indefinitely**. Neither the disposition fold nor the typed predicates open a route out of it.

### 9.5 Structural-integrity quarantine, scope and recovery *(closes `JBA12-AUD-08`, `JBA13-AUD-01`, `JBA13-AUD-05`, `JBA13-AUD-07`; within **O-06a**)*

#### 9.5.1 The problem being solved, stated exactly

Under **E-B** (§18.2), a structurally malformed record **may physically commit** through an adversarial or defective privileged path. Combined with SG-10 and an append-only pattern that blocks `DELETE`, a malformed record would otherwise **permanently poison its subject**: the graph is invalid, the subject yields no projection forever, and no scientific operation can remove the offending row. This section supplies a recovery path **without** deleting data, **without** silently rewriting scientific history, and — the V1.3 defect — **without letting the remedy choose which finding survives**.

#### 9.5.2 Three layers, never collapsed

| Layer | What it is | Mutability |
| :-- | :-- | :-- |
| **1 — raw persisted record** | the row as it physically exists, malformed or not | immutable; retained as forensic history **where legal retention permits** (§9.5.7, §16) |
| **2 — admission** | whether that record enters an authoritative projection | **derived — §9.3.1's predicate**, a function of layers 1 and 3 plus record-level validity |
| **3 — integrity adjudication history** | the append-only log of quarantine and rescission acts | append-only under ordinary and scientific operation; **itself subject to the legal-deletion override** (IQ-10) |

> **Validity is a property of layer 1. Admission is computed at layer 2. Disposition is recorded at layer 3.** A quarantine does not make a record invalid; it records that an invalid record has been identified and by whom.

#### 9.5.3 The rules

| # | Rule |
| :-- | :-- |
| **IQ-1** | A **`StructuralIntegrityQuarantine`** is an append-only record carrying its **own opaque immutable identity** (`qid`, DE-1) and naming: **exactly one** quarantined record; **exactly one record-level basis** — the specific `SG-R` invariant violated, or the `DB-03B` trusted-generation failure established; the evidentiary basis; the acting **trusted integrity-repair capability**; and the trusted knowledge time. |
| **IQ-2** | **Effect: disposition, eligibility and seeding.** A quarantined record is excluded from projection input (§9.3.2) and therefore from SG-10 (§9.4.4). **Where the quarantine is part of a `VALID_DISPOSITION` (§9.3.4), the record also stops seeding the fail-closed scope** (§9.3.6, FS-1, BI-39). **Nothing is deleted, updated or overwritten by the quarantine act.** |
| **IQ-3** | **Record-level bases only.** Quarantine may target **only** a record excludable on a record-level basis — a record violating an `SG-R` invariant, or **any record independently proven `GENERATION_AUTHORIZED = UNAUTHORIZED`**, **including a disposition event** (DE-8). It may **NEVER** target a substantive finding **on scientific grounds** (BI-30). *(A finding proven **forged** is excludable on that provenance basis, which is a statement about its **creation**, never about its **content**.)* |
| **IQ-4** | **No winner selection.** Quarantine may **never** resolve a substantive disagreement, break a `CONTESTED` state, or make one competing finding prevail. A `CONTESTED` projection is **not** an integrity defect and has **no** quarantine remedy. |
| **IQ-5** | **Justification is record-level and re-provable, never scientific.** A quarantine is valid only where the named record **actually** violates the named `SG-R` invariant, or **actually** fails the named `DB-03B` obligation, and that failure is **re-provable from the record set and its provenance**. |
| **IQ-6** | **Attributable and capability-separated.** Quarantine and rescission are mintable only by a **trusted integrity-repair capability**, separate from the ordinary B write path and from the scientific adjudication capability. The acting role is recorded (DB-14, OP-3). |
| **IQ-7** | **Rescission by appending only, against exactly one identity.** A quarantine is undone by an appended **`QuarantineRescission`** that **names exactly one `qid` by explicit reference** (DE-2) — never *"the quarantine state of record r"*. Rescission never deletes or updates. Both records remain readable **where controlling legal/consent/privacy authority permits that residue** (IQ-10, BI-31). |
| **IQ-8** | **No authority from committing.** A record that is structurally invalid, or proven unauthorized, gains **no** semantic authority and **no** eligibility by having physically committed — `PROJECTION_INPUT_ELIGIBLE` requires `STRUCTURAL_VALID` **and** `generation_sufficient` independently of whether anyone has quarantined it (§9.3.2, TE-8). Quarantine supplies **disposition**, and with it the ability to recover. |
| **IQ-9a** | **Basis independence — the non-selection rule.** *(frozen)* A quarantine is admissible **only** where the record it names is **individually excludable**: it violates an **`SG-R`** invariant, or it is **independently established as `GENERATION_AUTHORIZED = UNAUTHORIZED`**. **The basis MUST be established on evidence that does not depend on which projection survives the exclusion.** **A target MUST NOT be selected because excluding it produces a preferred scientific survivor or a desired projection.** *(Establishing an `SG-R` basis **may and must** inspect the record and everything it explicitly references — AX-5, RS-1.)* |
| **IQ-9b** | **Consequence permission.** *(frozen)* Where `IQ-9a`'s basis holds, **exclusion is permitted even though the resulting valid recomputation changes the scientific projection.** Recomputing `SG-10` over the eligible set after removing independently proven malformed or unauthorized input is **arithmetic, not winner selection** (BI-40, §9.4.4.1). |
| **IQ-9c** | **Set-level violations have no remedy.** *(frozen)* Where a structural violation is a property of a set (`SG-S`) and **no member is individually excludable under `IQ-9a`**, **NO quarantine is admissible**, and the affected scope remains **FAIL CLOSED**, possibly indefinitely (SG-S-2). |
| **IQ-9d** | **`UNPROVEN` licenses nothing.** *(frozen)* `GENERATION_AUTHORIZED = UNPROVEN` on a **target** is **not** a quarantine basis (AX-2, P-13, BI-16), and a quarantine naming it is **erroneous** (§9.3.7 Case J). The remedy is to **establish** the provenance or **prove it unauthorized**. |
| **IQ-10** | **Structural-integrity history is subject to the controlling deletion override.** The quarantine record, its rescission, its basis, its acting role, the affected-scope record, the integrity-error history, the malformed raw record and the structural-admission record are **append-only under ordinary and scientific operation** — and **each is subject to the same controlling legal/consent/privacy deletion override** (BI-31, §16). **No unconditional survival, readability or visibility is promised** (§9.5.7). |
| **IQ-11** | **A disposition event whose target does not resolve is inert.** A quarantine naming a record that no longer exists, or a rescission naming a `qid` that no longer exists (RV-2, RV-8), excludes nothing, retracts nothing, and creates no fail-closed scope. |
| **IQ-11a** | **Rescission restores nothing by itself.** *(frozen)* After a `QuarantineRescission` removes a `qid` from `ACTIVE_QUARANTINES`, the target record is projection-input-eligible **only if** it independently satisfies **both** `STRUCTURAL_VALID` **and** `generation_sufficient` (TE-8). Rescinding a quarantine over a genuinely malformed or unauthorized record returns it to §9.3.7 **Case B** or **Case E** — excluded, undispositioned, and once again seeding (DQ-3). |
| **IQ-12** | **No identity laundering around a fail-closed scope.** *(frozen)* A subject whose projection is fail-closed **MUST NOT** be worked around by minting a **new** identity for the same subject matter, re-establishing the same occasion under a fresh identifier, or relocating its adjudications to an unaffected subject (BI-01, P-14, AT-23e). |
| **IQ-13** | **A disposition event must itself be authorized to act, and must not itself be suppressed.** *(V1.6; extended in V1.7)* `DISPOSITION_EVENT_ADMISSIBLE` (§9.3.3.2) requires the event's **own** `GENERATION_AUTHORIZED = AUTHORIZED` — **`UNPROVEN` is not enough** — plus capability minting and a resolvable target. **`DISPOSITION_EVENT_EFFECTIVE` additionally requires that no active quarantine names the event itself** (DE-10). **A forged or unproven quarantine cannot remove a valid scientific input, a forged or unproven rescission cannot restore an excluded one, and a validly suppressed event of either kind does neither** (DE-6, DE-7, DE-10, DQ-5, DQ-6, `DCG-2`, `DCG-4`). Such an event is itself dispositionable, with no special case (DE-8). |
| **IQ-14** | **Anomaly and harm are different consequences, and harm is structural.** *(V1.6; sharpened in V1.7)* A defect in the integrity-control layer that is **not operative** — non-admissible or suppressed — or that is operative but **does not change what the projection would otherwise admit**, is a recorded **integrity anomaly**: attributable, queryable and surfaced to C2 as data-quality provenance, and it **does not fail a subject closed** (§9.3.3.6, AN-1…AN-5). **Only an operative event lacking a valid basis, whose presence changes its target's authoritative eligibility, is harmful and seeds** (AN-1a, FS-3). **Harm is never determined by which scientific answer is preferred.** |
| **IQ-15** | **`CONTROL_BASIS_FALSE` — the third record-level basis, available only against a quarantine.** *(new in V1.7)* A `StructuralIntegrityQuarantine` `p` may be quarantined on the basis that **`p` names a basis that provably does not hold for `p`'s own target** (§9.3.4). This is a **record-level, re-provable** property of `p`, decided from `target(p)`'s **own axes** and therefore **independent of which projection survives** (IQ-9a, AX-5). **It is available against a quarantine and against nothing else** — never against a scientific record, never against a rescission (which names no basis), and never as a way of disagreeing with a finding (IQ-3, IQ-4, BI-30, VD-7). **Without it, `DCG-2` would be unreachable**: an erroneous-but-authorized quarantine would be uncorrectable except by rescission, which the erroneous actor could equally well undo. |
| **IQ-16** | **Disposition-control eligibility is a class property.** *(new in V1.7)* A quarantine has **operative effect only against a Tier 2 or Tier 3 target**; against Tier 1 or Tier 4 it is **inert** and recorded as an anomaly (§9.3.8.2, DF-4). |
| **IQ-17** | **The disposition-control graph is acyclic, and a cycle has no winner.** *(new in V1.7; narrowed in V1.8)* `DG-01` requires the `DispositionControlGraph` to be acyclic: **self-target is individually, record-level structurally invalid** (`DG-2`); **a proposed edge that would create an ancestor-target cycle is rejected only prospectively, at write time, against the currently persisted graph** (`DG-3`) — this establishes nothing about any event already persisted. Where a multi-record cycle **physically exists**, `DG-4` **alone** governs it: **every member is treated as ineffective**, the **ultimate scientific targets' scopes fail closed** with a typed `DISPOSITION_CONTROL_CYCLE` error, **no member is selected by recency, ordering, actor authority or count, and no member is individually invalid merely for cycle membership** (DG-4, DG-5, `DCG-6`). The remedy has the same shape as `IQ-9c`'s: only an independently provable record-level defect in one specific member, established from that record's own axes, makes that member excludable. |
| **IQ-18** | **The citation-dependency graph is acyclic, and a cycle has no fixed point.** *(new in V1.7)* `CD-01` requires the `CitationDependencyGraph` to be acyclic. Where a cycle physically exists, **every member is ineligible and every member seeds**, the joint scope **fails closed** with a typed `CITATION_DEPENDENCY_CYCLE` error, and **no member is selected and no fixed point is guessed** (CD-7, CD-8). **A quarantine may not be used to break a citation cycle** unless one specific member is independently excludable on a record-level basis — the same prohibition `IQ-9c` states for `SG-S` (§9.5.4). |
| **IQ-19** | **The integrity layer never reads the eligibility layer.** *(new in V1.7)* No rule in §9.3.3, §9.3.4 or this section consults `CITATION_SOUND`, `PROJECTION_INPUT_ELIGIBLE`, `INTEGRITY_SEED_ELIGIBLE`, `SG-S` or `SCOPE`. A quarantine's admissibility, effectiveness and basis are decided from the **two primitive axes** and the **`DispositionControlGraph`** alone (DE-12, DG-9). **This one-way dependency is what makes the whole of §9.3 terminate** (CD-9), and reversing it in an implementation would reintroduce an undefined recursion. |

#### 9.5.4 What may and may not be quarantined — total over every violation shape

| Violation / condition | Level | Basis available? | Quarantine admissible? | Remedy |
| :-- | :-- | :-- | :--: | :-- |
| **SG-01** self-edge | `SG-R` | the record is individually invalid | **Yes** | quarantine that record |
| **SG-03** cross-subject edge | `SG-R` | as above *(determined by comparing the endpoints' subjects — AX-5)* | **Yes** | quarantine that record |
| **SG-04** cross-participant edge | `SG-R` | as above *(compares the endpoints' participants)* | **Yes** | quarantine that record |
| **SG-05** kind-incompatible edge | `SG-R` | as above *(compares the endpoints' kinds)* | **Yes** | quarantine that record |
| **SG-06** dangling / invisible target | `SG-R` | as above *(resolves the named target)* | **Yes** | quarantine the superseding record |
| **`GENERATION_AUTHORIZED = UNAUTHORIZED`** on any record | **record-level provenance** | independently proven `DB-03B` failure | **Yes — including for a structurally valid record** (§9.3.7 Case F) | quarantine that record; **recompute** (IQ-9b) |
| **`GENERATION_AUTHORIZED = UNAUTHORIZED`** on a **disposition event** | record-level provenance | as above | **Yes** (IQ-3, DE-8) | quarantine that event; **it stops acting** (DE-10); termination by `DG-01` (DG-8) |
| **An erroneous but AUTHORIZED quarantine** — it names a basis that provably does not hold for its own target | **record-level, control layer** | **`CONTROL_BASIS_FALSE`** (IQ-15), re-provable from the target's own axes | **Yes — against a `StructuralIntegrityQuarantine` only** | quarantine **that quarantine**; it stops acting and the underlying record is recomputed (`DCG-1`, `DCG-2`) |
| **An erroneous rescission** | record-level | **`SG-R` or `UNAUTHORIZED` only** — a rescission names **no** basis, so `CONTROL_BASIS_FALSE` does **not** apply (VD-7) | **Yes, on those bases only** | quarantine that rescission; the quarantine it removed becomes active again (`DCG-4`) |
| **A disposition event targeting ITSELF** | `SG-R` | — | **NO — the event is structurally invalid** (DG-2) | it never acts and never enters the control graph; recorded anomaly (`DCG-5`) |
| **A *proposed* edge that would target an ancestor in its own control chain** *(not yet persisted; narrowed in V1.8)* | **prospective write-time admission test — not `SG-R`** | — | **N/A — rejected before persistence, never written** | the proposed edge never becomes authoritative control; this is **not** evidence that any already-persisted event is individually invalid (DG-3). An already-persisted multi-record cycle is governed solely by `DG-4`, below |
| **A `DISPOSITION_CONTROL_CYCLE`** — `Q1 → Q2 → Q1` or longer | **`SG-S`-analogue, control layer** | **none** | **NO** | **none by selection.** Every member is ineffective; the ultimate scientific targets fail closed (DG-4, DG-5, `DCG-6`). Exit only via an independent record-level defect in **one specific** member, or lawful removal (IQ-17) |
| **A `CITATION_DEPENDENCY_CYCLE`** | **`SG-S`-analogue, citation layer** | **none** | **NO** | **none by selection.** Every member is ineligible and seeds; the joint scope fails closed (CD-7, IQ-18). Exit only via an independent record-level defect in **one specific** member, or lawful removal |
| **SG-02** cycle, no member individually excludable | `SG-S` | **none** | **NO** | **none.** Scope stays FAIL CLOSED (IQ-9c) |
| **SG-07** branching, no member individually excludable | `SG-S` | **none** | **NO** | **none.** Scope stays FAIL CLOSED (IQ-9c) |
| **SG-02 / SG-07** where **one specific member** is independently shown `SG-R`-invalid **or** `UNAUTHORIZED` | `SG-S` with a **record-level** finding | that record's own violation or provenance failure | **Yes — that record only** | quarantine **that** record on **that** basis; recompute (SG10-6) |
| **`GENERATION_AUTHORIZED = UNPROVEN`** on a target, class requires `DB-03B` | record-level, **no finding** | **none — `UNPROVEN` is not a basis** | **NO** (IQ-9d) | not eligible (TE-6); scope fails closed **for a Tier 2/3 record** (Case G); for a **Tier 1 source observation** it is **non-grounding and does not seed** (TE-7, FS-6) |
| **`GENERATION_AUTHORIZED = UNPROVEN`** on a **disposition event** | — | — | **n/a — the event simply does not act** (IQ-13) | recorded **anomaly**; establish or disprove its provenance (MQ-7, DQ-6) |
| **Any Tier 1 or Tier 4 record** (observation, relation record, ambiguity record, non-grounding marker, candidate, manifest, authorization, receipt, admission/scope/error record, deletion residue) | — | may exist | **admissible but INERT** (IQ-16) | it excludes nothing, because those classes' eligibility is not a function of the fold; recorded as an anomaly. **Their failure is handled by §9.3.8's own rows** |
| any **substantive finding**, on scientific grounds | — | — | **NO — prohibited** | IQ-3, IQ-4, BI-30 |
| a **`CONTESTED`** projection | — | — | **NO — not an integrity defect** | IQ-4; resolve by ordinary scientific adjudication |
| a **structurally valid, authorized** record | — | **none** | **NO — erroneous quarantine** | §9.3.7 Case I; fails closed until rescinded **or until the erroneous quarantine is itself validly quarantined** (IQ-11a, IQ-15, `DCG-2`) |

> **The escape hatch is a finding about a record, not a choice among outcomes.** The only routes to excluding a record whose structure is sound require a **positive, re-provable, record-level finding** — an `SG-R` violation, a proven provenance failure, or, **against a quarantine only**, a **provably false control basis** — established **without consulting which findings would survive** (IQ-9a, IQ-15). If the only reason to prefer excluding record *X* over record *Y* is that the result looks better, **IQ-9a rejects both**. And no cycle — structural, citation or control — is ever broken by choosing a member (IQ-9c, IQ-17, IQ-18).

#### 9.5.5 Affected-scope algorithm — deterministic, minimal and defined for every seed member *(closes `JBA13-AUD-07`; extended per `JBA15-AUD-01`, `JBA16-AUD-01` and `JBA16-AUD-04`)*

> ### The rule
>
> **The fail-closed scope is the *minimal* authoritative graph region whose projection could be influenced by the seeding record.**
>
> **`SCOPE` is defined for every member of `FAIL_CLOSED_SEED`, because seed membership requires `INTEGRITY_SEED_ELIGIBLE` (FS-5), which requires that the record's class name or belong to a B2 subject (§9.3.8).** `SCOPE` is **not** defined for, and is **never asked of**, a Tier 1 preservation-only record or a Tier 4 derived record.

##### The algorithm

```
SCOPE(M) for a set M of seeding records:

  S0 = { subject(x) : x is a record in M, or a record EXPLICITLY NAMED as an
                      endpoint by some m in M }
       -- for a disposition event, subject() resolves through its target (9.5.5.1)

  S(i+1) = S(i)  U  { subject(y) : the authoritative projection of subject(y)
                                   CONSUMES at least one record that is
                                   (a) a member of M, or
                                   (b) named as an endpoint by a member of M }

  SCOPE(M) = the fixpoint of S

where a projection CONSUMES record r iff r names that subject, or r is a
supersession edge one of whose endpoints names that subject (9.3.9 steps 5-6).
```

| # | Rule |
| :-- | :-- |
| **QS-1** | The scope is the **fixpoint above** — the explicitly named endpoint subjects, closed **only** over subjects whose projection actually **consumes** an in-set record. It **MUST NOT** extend further. Store-wide contamination is prohibited. |
| **QS-2** | **Shared participant identity is NOT a structural dependency.** A cross-participant malformed edge fails **exactly its two explicitly named endpoint subjects** closed. **Every other subject of either participant continues to project normally.** |
| **QS-3** | **Where both endpoints are implicated, both fail closed.** |
| **QS-4** | A subject outside the computed scope **continues to project normally.** One malformed record does not disable the store. |
| **QS-5** | The computation is **deterministic and re-derivable** from the record set alone, so two independent verifiers compute the same scope. It is **total over `FAIL_CLOSED_SEED`** — §9.3.8 guarantees every member has a subject derivation, and §9.5.5.1 supplies it for disposition events. |
| **QS-6** | Multiple seeding records are scoped by a **joint fixpoint** over their union, never by summing independently computed scopes. |
| **QS-7** | *(V1.6)* **`SCOPE` is never asked of a Tier 1 record.** A source observation, source-native relation record, ambiguity record, non-grounding marker, candidate or manifest is not `INTEGRITY_SEED_ELIGIBLE` and therefore never reaches this function. Its ineligibility is expressed as **non-grounding**, and — if an authoritative record cites it — at the **consuming subject** (CS-1, FS-6). **This is the `JBA15-AUD-01` repair: the seed and the scope range over the same domain.** |
| **QS-8** | *(new in V1.7)* **`SCOPE` is never asked of a Tier 4 record either.** The structural-admission record, the affected-scope record, the integrity-error/anomaly record, the `DeletionAuthorization`, the receipt and the deletion-residue artifacts are **not** `INTEGRITY_SEED_ELIGIBLE` (FS-9). In particular **the affected-scope record — the very record that names a fail-closed scope — can never itself seed one**, so no scope can grow by being recorded. **The fixpoint is over a finite set of Tier 2 and Tier 3 seed members and always terminates.** |
| **QS-9** | *(new in V1.7)* **Cycle scopes are computed jointly, never member by member.** For a `CITATION_DEPENDENCY_CYCLE` the seed set `M` is **every member of the cycle** (CD-7); for a `DISPOSITION_CONTROL_CYCLE` it is **every ultimate scientific target** reached from the cycle (DG-4, FS-8). In both cases `SCOPE(M)` is the **QS-6 joint fixpoint**, and the resulting typed integrity error **names every member**, so an operator can see the whole cycle rather than one arbitrary vertex of it. |

##### Scope per seeding shape — total

| Seeding record / violation | Violated | **Fail-closed scope** |
| :-- | :-- | :-- |
| **self-edge** on *A* | SG-01 | `{ subject(A) }` |
| **cross-subject edge** *A → B* | SG-03 | `{ subject(A), subject(B) }` — exactly two |
| **cross-participant edge** *A → B* | SG-04 | `{ subject(A), subject(B) }` — **exactly two, and no other subject of either participant** (QS-2) |
| **kind-incompatible edge** *A → B* | SG-05 | `{ subject(A), subject(B) }` |
| **dangling / invisible target** | SG-06 | `{ subject(superseding record) }` |
| **cycle** among *A…N* | SG-02 | `{ subject(x) : x ∈ cycle members }` |
| **branching** — two edges → *T* | SG-07 | `{ subject(T) }` |
| **adjudication failing `CITATION_SOUND`** | CS-1 | `{ subject(a) }` plus the QS-1 closure — **the consumer's subject, never the referent's** (BI-42) |
| **`CITATION_DEPENDENCY_CYCLE`** *(new)* | CD-01 | the **joint QS-6 fixpoint over every cycle member's subject** — each member is `L1`…`L5` and therefore has one (CD-11, FS-7, QS-9) |
| **`DISPOSITION_CONTROL_CYCLE`** *(new)* | DG-01 | the **joint QS-6 fixpoint over the subjects of the ultimate scientific targets** reached from the cycle (DG-4, FS-8, QS-9) |
| **`SG-R`-invalid or `UNAUTHORIZED` adjudication / link / occasion / cluster** | — | the subject it names or is (§9.3.8) |
| **`ExposureFact`** failing its own axes | — | its `(participant, studyWeek)` **exposure subject** — never an occasion subject (BI-26) |
| **harmful erroneous quarantine** on *r* | AN-1a, MQ-4 | §9.5.5.1 |
| **harmful disposition event** generally | — | §9.5.5.1 |
| **Tier 1 record** (observation, relation record, ambiguity record, non-grounding marker, candidate, manifest) | — | **`SCOPE` NOT DEFINED and NEVER REQUIRED** — the record is not seed-eligible (QS-7) |
| **Tier 4 record** (authorization, receipt, admission record, affected-scope record, integrity-error record, deletion residue) | — | **`SCOPE` NOT DEFINED and NEVER REQUIRED** — the record is not seed-eligible (QS-8, FS-9) |

##### 9.5.5.1 Scope for disposition events *(V1.6; termination re-proved in V1.7)*

A disposition event has no subject of its own; it acquires one **through its target**.

| # | Rule |
| :-- | :-- |
| **DS-1** | For a **harmful quarantine** `q` targeting record `r`: `SCOPE(q) = SCOPE({r})`. The harm is that `r` has been excluded from a projection that was entitled to read it, so the affected region is exactly `r`'s. |
| **DS-2** | For a **harmful rescission** `x` targeting `qid(q)` where `q` targets `r`: `SCOPE(x) = SCOPE({r})`, resolved **through two hops** — the rescission names the quarantine, the quarantine names the record, the record names or belongs to the subject. |
| **DS-3** | **Where the target does not resolve, the event is inert and has NO scope** (IQ-11, RV-2, RV-8) — it is not a seed member at all, so `SCOPE` is never asked of it. |
| **DS-4** | **Where the event is a non-operative anomaly** — non-admissible (MQ-7, MQ-8) or **suppressed** (MQ-9, MQ-10) — or an operative-but-non-changing one (MQ-3), it is **not** a seed member and `SCOPE` is not asked of it. It is recorded and reportable (§9.3.3.6, AN-1a). |
| **DS-5** | *(termination argument replaced in V1.7)* Where the target record is itself a **disposition event** (DE-8), the chain resolves **by following `controls` edges** to the underlying scientific record's subject. **V1.6 justified termination by asserting that an admissible event has no further disposition; that argument was circular and is withdrawn.** Termination now rests on **`DG-01`**: the `DispositionControlGraph` is **acyclic and finite**, so following `controls` edges from any event reaches a **non-disposition vertex in at most `depth` steps** (DG-6, DG-8). **Where the chain instead re-enters a cycle, `DG-4` governs and the joint scope of the cycle's ultimate targets fails closed** — `SCOPE` is never left undefined. |
| **DS-6** | Disposition-event scope **composes** with any other seed member's scope by the joint fixpoint of QS-6. **There is no store-wide default and no undefined case.** |
| **DS-7** | *(new in V1.7)* **A rescission's harm is expressed through what it changes, and is never double-counted.** An effective rescission of a **valid** quarantine returns its target to §9.3.7 **Case B** or **Case E** — excluded, undispositioned and **seeding on its own account** (IQ-11a, DQ-3), which is the safe direction. An effective rescission of an **erroneous** quarantine correctly restores eligibility. **In both cases the seed member that matters is the underlying record**, and DS-2's scope is the same set. **A rescission therefore never widens a scope beyond the record whose eligibility it changed.** |

#### 9.5.6 Recovery

Ten dispositional situations, stated once and total.

##### 9.5.6.1 Case A — unresolved record-level defect *(Tier 2 / Tier 3)*

A projection-input record is individually invalid (`SG-R`) or `GENERATION_AUTHORIZED = UNAUTHORIZED`, and **no valid quarantine has dispositioned it**.

```
-> NOT PROJECTION_INPUT_ELIGIBLE (9.3.2)
-> SEEDS the fail-closed scope (9.3.6, set 1)
-> the deterministic 9.5.5 scope FAILS CLOSED. No projection, typed integrity error.
```

##### 9.5.6.2 Case B — validly dispositioned record-level defect *(the reachable recovery route)*

```
1. A record with an SG-R violation, or independently proven UNAUTHORIZED, physically
   commits (E-B path, 18.2) or is later discovered.
2. Step 0 of the fold evaluates the three axes; step 1 folds the disposition history.
   -> r is NOT PROJECTION_INPUT_ELIGIBLE. It never was, and no quarantine was needed
      for that (IQ-8).
   -> its 9.5.5 scope FAILS CLOSED while undispositioned (Case A).
3. The trusted integrity-repair capability appends a StructuralIntegrityQuarantine
   with its OWN identity, naming r AND the single record-level basis it relies on
   (IQ-1, IQ-5, IQ-9a). The event must itself be GENERATION_AUTHORIZED = AUTHORIZED
   and capability-minted, or it does not act at all (IQ-13, DE-6).
4. The fold recomputes: q enters ACTIVE_QUARANTINES(r) (9.3.3.3), and
   VALID_DISPOSITION(r) now holds because the named basis actually holds (9.3.4).
   -> r remains EXCLUDED, and is now excluded WITH A RECORDED REASON;
   -> r STOPS SEEDING the fail-closed scope (9.3.6 FS-1, BI-39).
5. RECOMPUTE over the remaining PROJECTION_INPUT_ELIGIBLE set:
     - re-evaluate set-level validity (SG-S) WITHOUT r (FS-2);
     - re-evaluate SG-10 retirement over eligible edges (9.4.4.1).
6. If the remaining set is valid at BOTH levels and no other seed member covers this
   subject -> PROJECTION RESUMES for that scope.
   Otherwise the scope stays fail closed FOR THAT OTHER REASON.
7. Structural-integrity history is retained WHERE LEGAL RETENTION PERMITS (IQ-10).

NO DELETE is required for ordinary integrity repair.
```

##### 9.5.6.3 Case C — set-level violation *(frozen: no remedy)*

```
1. A cycle (SG-02) or branching set (SG-07) exists among records that are each
   individually well-formed and each generation-authorized.
2. Every member is PROJECTION_INPUT_ELIGIBLE at record level; set-level validation
   fails.
3. The 9.5.5 scope FAILS CLOSED.
4. NO QUARANTINE IS ADMISSIBLE (IQ-9c). There is no individually excludable record
   to name, and naming one anyway would be choosing which finding survives.
5. The scope REMAINS FAIL CLOSED -- possibly indefinitely -- until either:
     (a) one specific member is independently shown SG-R-invalid or UNAUTHORIZED
         -> THAT record becomes quarantine-eligible, on THAT basis (SG10-6); or
     (b) the underlying records are lawfully removed under 16.
6. The subject's records remain readable on the AUDIT surface where legal retention
   permits. The data is not lost; only the authoritative projection is withheld.
```

**This is unchanged and is a frozen area.** Neither the typed predicates nor the disposition fold opens a route out of it.

##### 9.5.6.4 Case D — erroneous quarantine *(harmful)*

A record is `STRUCTURAL_VALID` and generation-sufficient, and the **only** active quarantines on it name bases that do not hold — including a quarantine naming `UNPROVEN` (IQ-9d).

```
-> NOT PROJECTION_INPUT_ELIGIBLE (the active quarantine excludes it)
-> VALID_DISPOSITION is FALSE
-> the exclusion CHANGES what the fold would otherwise read -> HARMFUL (AN-1)
-> SEEDS the fail-closed scope (9.3.6, set 3), scope per DS-1
-> remedy: append a QuarantineRescission naming that exact qid (IQ-7, RV-1);
   after rescission the record must INDEPENDENTLY re-pass both axes (IQ-11a)
```

##### 9.5.6.5 Case E — structurally valid but independently proven unauthorized

```
1. A record is STRUCTURAL_VALID = TRUE -- its shape is perfect.
2. DB-03B independently establishes GENERATION_AUTHORIZED = UNAUTHORIZED.
   This is a positive finding about the RECORD'S OWN CREATION, decidable without
   reference to which findings would survive (IQ-9a, AX-5).
3. -> NOT PROJECTION_INPUT_ELIGIBLE (generation_sufficient fails; UNAUTHORIZED
      blocks for every class, TE-6).
4. Quarantine is LEGITIMATE (9.5.4, IQ-3, IQ-9a) -- NOT the "erroneous
   valid+quarantined" state of Case D.
5. On valid disposition, the record stops seeding (FS-1) and the remaining eligible
   graph is RECOMPUTED (9.4.4.1).
6. If that recomputation changes the projection -- for example a forged supersession
   edge B->A leaves the eligible set and A becomes live -- that is PERMITTED and
   expected (IQ-9b, BI-40, RS-1..RS-4, DQ-1).
```

##### 9.5.6.6 Case F — preserved, non-grounding source observation *(new in V1.6; the `JBA15-AUD-01` case)*

A **Tier 1** source observation whose required trusted-generation provenance is `UNPROVEN` — the accepted S-2 situation (§18.4.6).

```
1. The observation is relationally coherent: DB-03A holds.
2. DB-03B is REQUIRED for its class and is UNPROVEN.
3. -> SOURCE_PRESERVED = TRUE. It is retained and readable as diagnostic
      provenance, subject only to 16 (TE-2).
   -> SOURCE_GROUNDING_ELIGIBLE = FALSE. NO CANDIDATE IS EMITTED (CE-2/CE-3),
      NO OCCURRENCE SUPPORT FLOWS, and the deficiency is RECORDED.
   -> PROJECTION_INPUT_ELIGIBLE is NOT ASKED: the fold never reads an observation
      directly (TE-4).
   -> INTEGRITY_SEED_ELIGIBLE = FALSE. It DOES NOT SEED, and NO B2 SUBJECT IS
      INVENTED FOR IT (BI-42, FS-6, QS-7).
4. GENERATION_AUTHORIZED is NOT converted to UNAUTHORIZED (AX-2, P-13).
5. If some B2 record CITES it for occurrence, the CITING RECORD fails
   CITATION_SOUND and the failure is scoped to THE CONSUMER'S subject (CS-1).
   The observation itself acquires no subject and no scope.
```

> **Recovery in both directions, and neither rewrites history.** If accepted trusted-generation provenance later becomes re-provable, the **same preserved observation** becomes `SOURCE_GROUNDING_ELIGIBLE` under the existing frozen source and status rules — **no historical record is rewritten**, and **no artificial prior B2 failure needs rescinding**, because none was ever created (SD-3). If it is instead later **proven `UNAUTHORIZED`**, that positive status is **distinguishable from the prior `UNPROVEN`**, the observation remains preserved where legal retention permits, it remains non-grounding, and any B2 record that consumed it is handled under `CITATION_SOUND` and the ordinary integrity rules (SD-4).

##### 9.5.6.7 Case G — non-admissible disposition event *(V1.6)*

A quarantine or rescission that is forged, `UNPROVEN`, malformed, or not capability-minted.

```
-> DISPOSITION_EVENT_ADMISSIBLE = FALSE (9.3.3.2, IQ-13)
-> therefore NOT DISPOSITION_EVENT_EFFECTIVE
-> it NEVER ENTERS ACTIVE_QUARANTINES. It excludes nothing and restores nothing
   (DE-7, DQ-5, DQ-6).
-> it therefore CHANGES NOTHING the projection would otherwise admit
   -> INTEGRITY ANOMALY, recorded and reportable, NOT a seed (AN-1a, IQ-14).
-> remedy: establish its provenance (it becomes admissible and acts), or prove it
   UNAUTHORIZED and quarantine it on that basis (DE-8) -- the same mechanism, no
   special case, terminating by DG-01 rather than by V1.6's circular argument
   (DS-5, DG-8).
```

> **The asymmetry is deliberate and is the safety property.** A forged disposition event **fails safe** — it cannot remove a valid scientific input — and **fails loud** — it is recorded, attributable and dispositionable. It does **not** fail a subject closed, because doing so would let anyone able to write a forged row deny service to an arbitrary subject while adding no protection whatever (AN-1, AN-1a).

##### 9.5.6.8 Case H — erroneous but AUTHORIZED disposition event, and its suppression *(new in V1.7; the `JBA16-AUD-04` case)*

An event that **passes every admissibility test** — well-formed, `GENERATION_AUTHORIZED = AUTHORIZED`, capability-minted, target resolves — but whose **named basis is false**. V1.6 could describe this state and could not correct it.

```
1. Qbad targets scientific record R. R is STRUCTURAL_VALID and generation-sufficient.
   Qbad names an SG-R basis that does not hold for R.
   -> Qbad IS EFFECTIVE. It DOES exclude R.  (DCG-1)
   -> VALID_DISPOSITION(R) = FALSE.
   -> Qbad is OPERATIVE and lacks a valid basis, and its presence changes R's
      authoritative eligibility -> HARMFUL (AN-1a).
   -> R SEEDS; R's 9.5.5 scope FAILS CLOSED (9.3.7 Case I, MQ-4).

2. The trusted integrity-repair capability appends Q2 targeting Qbad, on the
   CONTROL_BASIS_FALSE basis (IQ-15): "Qbad names a basis that provably does not
   hold for its own target", re-proved from R's OWN axes -- NOT from which
   projection survives (IQ-9a, AX-5).

3. Q2 is EFFECTIVE, so Qbad becomes DISPOSITION_EVENT_CURRENTLY_QUARANTINED
   and is therefore NOT EFFECTIVE (DE-10, MQ-9).
   -> Qbad LEAVES ACTIVE_QUARANTINES(R). It STOPS ACTING.
   -> R is RECOMPUTED and, absent another seed member, PROJECTS AGAIN
      (9.3.7 Case M, DCG-2).

4. Nothing is rewritten. Qbad, its false basis, Q2, its basis, the actor and the
   intervening typed integrity error ALL REMAIN in the append-only history,
   subject only to 16 (AN-5, IQ-10).

5. If Q2 is later validly rescinded, Qbad is RECONSIDERED UNDER ITS OWN BASIS --
   still false, so it is again effective, again harmful, and R again fails closed.
   RESCISSION RESTORES THE ABILITY TO ACT, NEVER SCIENTIFIC VALIDITY (DE-11, DCG-3).

6. If that rescission is itself validly quarantined, it stops acting, Q2 is active
   again, and Qbad is suppressed again (DCG-4). Every step terminates by DG-8.
```

> **Two remedies, and they are not interchangeable.** **Rescission** is the remedy where the *quarantine act itself* is withdrawn by an authorized actor. **Suppression** — quarantining the quarantine — is the remedy where the act is **defective on a re-provable record-level basis** and must be neutralized **on evidence** rather than by fiat. `IQ-15` is what makes the second route exist; without it, an erroneous-but-authorized quarantine could only be undone by an actor willing to undo it.

##### 9.5.6.9 Case I — citation-dependency cycle *(new in V1.7; the `JBA16-AUD-01` case)*

A set of authoritative records whose **semantic citations** (CD-3 rows 1–10) form a cycle.

```
1. Every member is individually well-formed and individually generation-authorized.
   The defect is a property of the SET, exactly as SG-02 is (9.5.6.3).
2. PROJECTION_INPUT_ELIGIBLE would be defined for each member only in terms of the
   others -> V1.6's undefined recursive equation.
3. -> CD-01 IS VIOLATED. NO member is PROJECTION_INPUT_ELIGIBLE (CD-7).
   -> EVERY member is a FAIL_CLOSED_SEED member (9.3.6, set 4). Each is an
      L1..L5 class with a defined subject, so SCOPE is defined for each
      (CD-11, FS-7).
   -> The JOINT 9.5.5 fixpoint FAILS CLOSED, with a typed
      CITATION_DEPENDENCY_CYCLE error NAMING EVERY MEMBER (QS-9).
4. NO MEMBER IS SELECTED. No iteration to a fixed point is performed and none is
   permitted (CD-8). No ordering, recency, timestamp, count or actor authority
   resolves it (P-14).
5. NO QUARANTINE IS ADMISSIBLE against a member merely for being on the cycle
   (IQ-18) -- that would be choosing which record's eligibility survives, exactly
   what IQ-9c forbids for SG-S.
6. The scope REMAINS FAIL CLOSED -- possibly indefinitely -- until either:
     (a) one specific member is independently shown SG-R-invalid or UNAUTHORIZED
         -> THAT record becomes quarantine-eligible, on THAT basis; excluding it
            breaks the cycle as ARITHMETIC, not as selection (IQ-9b); or
     (b) the underlying records are lawfully removed under 16.
7. Primary mitigation is PREVENTION: CD-01 is E-A where DB-representable
   (DB-08c), because the construction layering of CD-4/CD-5 is checkable at write
   time for every edge whose endpoints are already persisted.
```

##### 9.5.6.10 Case J — disposition-control cycle *(new in V1.7; the `JBA16-AUD-04` case)*

A set of disposition events whose `controls` edges form a cycle — `Q1 → Q2 → Q1`, or longer.

```
1. Each event may be individually well-formed and individually authorized.
   The defect is again a property of the SET.
2. DISPOSITION_EVENT_EFFECTIVE would be defined for each only in terms of the
   others.
3. -> DG-01 IS VIOLATED. EVERY member is treated as NOT EFFECTIVE (DG-4).
   -> NO member acts. Nothing is excluded by the cycle and nothing is restored
      by it -- the exclusion direction FAILS SAFE (DG-5).
   -> The ULTIMATE SCIENTIFIC TARGETS reached from the cycle are the seed members
      (FS-8); their JOINT 9.5.5 scope FAILS CLOSED with a typed
      DISPOSITION_CONTROL_CYCLE error naming every member (QS-9)
      -- the admission direction FAILS CLOSED (DG-5).
4. NO WINNER. No timestamp, allocation sequence, recency, actor authority or count
   resolves it (P-14, IQ-17).
5. Exit only via (a) an independently provable record-level defect in ONE specific
   member, or (b) lawful removal under 16.
6. Prevention: DG-2 makes self-target INDIVIDUALLY, RECORD-LEVEL STRUCTURALLY
   INVALID; DG-3 REJECTS, at write time where representable, a PROPOSED edge
   that would close a cycle against the currently persisted graph (DB-08d).
   DG-3 is a gate on the write, NOT a record-level property of an
   already-persisted event -- once a cycle physically exists, DG-4 alone
   governs it, and no member becomes individually invalid by DG-3 after the
   fact. A cycle can therefore only arise through the same E-B adversarial or
   defective privileged path that 9.5.1 already contemplates.
```

> **Why both cycle cases fail closed rather than pick.** The architecture's governing prohibition is **P-14**: no implicit *latest-wins*, *first-wins* or *highest-confidence-wins* selection in any analysis-facing projection. A cycle is precisely a situation in which **every** available resolution is a selection. **Refusing to answer is the only response consistent with the accepted authority**, and it is the same response `IQ-9c` already gives for `SG-S` — a decision the audit accepted and this revision does not disturb.

##### 9.5.6.11 Why there is no third exit from a set-level violation, a citation cycle or a control cycle

| Attempted route | Why it fails |
| :-- | :-- |
| append a new finding on the subject | Adjudications are **append-only**; appending removes no member, and the new finding is itself in scope |
| append a further supersession edge to "break" the cycle | Appending an edge cannot remove one; if it targets an already-targeted record it additionally breaches **SG-07** |
| mint a new identity for the same subject matter | **Prohibited by IQ-12** |
| quarantine a member to restore validity | **Prohibited by IQ-9c** — no member is individually excludable |
| assert a provenance failure without evidence | **Prohibited by IQ-5 and IQ-9a** — the basis must be **re-provable** and established independently of the surviving projection; an unevidenced claim is an erroneous quarantine (Case D) |
| forge a quarantine on a member | **Prohibited by IQ-13** — it is not admissible, never enters the fold, and is an anomaly (Case G) |

##### 9.5.6.12 The residual cost, and why it is the right trade

| | Set-level fail-closed *(chosen)* | Quarantine-selects *(rejected)* |
| :-- | :-- | :-- |
| Failure mode | **projection denial** for one bounded scope | **corrupted scientific result**, indistinguishable from a correct one |
| Who decides the outcome | **nobody** | the integrity actor |
| Detectability | explicit typed integrity error | none |
| P-14 | satisfied | **violated** |
| Recoverable by later evidence | **yes** (§9.5.6.3 step 5a) | the wrong answer is already downstream |

**Primary mitigation is prevention** — `SG-02` and `SG-07` are **E-A where DB-representable** (DB-08). **Bounded blast radius** — §9.5.5's minimal scope. **And the record-level route is genuinely available**, so an identified forgery or malformation no longer produces a permanent denial.

#### 9.5.7 Structural-integrity history and the legal-purge override *(closes `JBA13-AUD-05`)*

##### 9.5.7.1 The conditioning

**The defect this closes.** V1.3 conditioned deletion residue generally (BI-31) but left the quarantine text unqualified — IQ-7's *"remain readable"*, §9.5.5's *"a reader … can always see that a quarantine occurred, on what basis, and by whom"*, §25.5's *"remains readable"*. A controlling full purge may forbid exactly that residue, and an architecture may not promise what the law removes.

> **IQ-10, applied to every artifact by name.** Each of the following is **append-only under ordinary and scientific operation** and **subject to the controlling legal/consent/privacy deletion override**:
>
> the **quarantine record** · its **rescission** · the **basis** · the **acting role/actor** · the **affected-scope record** · the **integrity-error history** · the **malformed raw record** · the **structural-admission record** · any **forensic residue** of the above.

| Case | What survives | What downstream sees |
| :-- | :-- | :-- |
| **Residue permitted** | typed forensic history: the quarantine, its named invariant, its basis, its actor and its knowledge time | a reader **can** see that a quarantine occurred, on what basis and by whom |
| **Residue prohibited (full purge)** | **possibly nothing** — no quarantine record, no rescission, no basis, no actor, no scope record, no malformed row, **and no proof that any of them ever existed** | **ordinary absence**, indistinguishable from *"no integrity event ever occurred here"* |

**Every unconditional claim is replaced.** *"Remain readable"*, *"can always see"*, *"never removed"* and *"historical evidence remains"* are each now **conditioned on the controlling authority permitting that residue** (BI-31). **No universal readability of integrity history is promised**, and forbidden residue **must never be reconstructed** — not from backups, logs, identifier gaps, join remnants, or a retained *"an integrity event occurred"* marker (AT-22a).

##### 9.5.7.2 The two interaction cases — worked

Purging one of a quarantine/record pair while the other survives must not produce an unsafe state. **The total admission predicate makes both cases safe, and this is not a coincidence — it is why AUD-02's repair had to precede AUD-05's.**

| # | Case | What happens | Why it is safe |
| :-- | :-- | :-- | :-- |
| **1** | **The quarantine record is purged; the malformed record survives** | The record returns to *"persisted, invalid, not quarantined"* — **§9.3.7 Case B**. It is **still not projection-input-eligible**, because eligibility requires `STRUCTURAL_VALID` independently (TE-8). Its scope **fails closed** again, now without an attributable disposition. | **Under V1.3's default-admission reading this would have silently re-admitted a malformed record.** Under §9.3.1 it cannot: validity is evaluated on the record, not inferred from the absence of a quarantine. The system degrades to *fail closed*, never to *serve corrupt data*. |
| **2** | **The malformed record is purged; the quarantine survives** | The quarantine names a record that no longer exists and is **inert** (**IQ-11**): it excludes nothing, admits nothing, and creates no fail-closed scope. | Nothing depends on it. A dangling disposition is not an integrity defect, and treating it as one would fail a scope closed over a record that is gone. |
| **3** | **Both are purged** | No trace of the integrity event remains. Downstream sees **ordinary absence** (§9.5.7.1 Case 2). | The lawful outcome. The architecture does not reconstruct it (AT-22a), does not estimate it, and does not report a count it may not retain (§16.6.2). |

#### 9.5.8 Quarantine versus supersession — the distinction that must not blur

| | **Scientific supersession** | **Structural-integrity quarantine** |
| :-- | :-- | :-- |
| Solves | *"this finding replaces that finding"* | *"this record is individually structurally invalid"* |
| Targets | substantive findings and adjudications | **individually invalid structural records only** (IQ-3, IQ-9) |
| Basis | a scientific judgement about the world | a **re-provable `SG-R` violation or DB-03B provenance failure** (IQ-5, IQ-9) |
| Actor | scientific adjudication capability | **trusted integrity-repair capability** (IQ-6) |
| Effect | retires the target (SG-10) | **excludes from admission, with a recorded reason** (IQ-2) |
| May resolve a `CONTESTED` state? | **Yes**, by an explicit superseding finding | **Never** (IQ-4) |
| May resolve a **set-level** violation? | n/a | **Never** (IQ-9, SG-S-2) |
| Applicable when the structure is **valid** but the decision was mistaken? | **Yes — this is the correct mechanism** | **No.** §9.3.2 row 4 makes such a quarantine an integrity defect in itself |

> **The correction rule, stated explicitly.** If the structure is **valid** and the **semantic supersession decision** was mistaken, **do not quarantine**. Use the ordinary append-only scientific path: supersede the superseder, or append an explicit reassertion (`OCCURRENCE_REINSTATED` or a fresh finding of the same kind). Quarantine addresses malformed **records**; scientific adjudication addresses mistaken **judgements**. Using either for the other's job is prohibited (IQ-3, IQ-4, IQ-9, BI-30, BI-35).

### 9.6 Finding coherence rules

| Rule | Statement |
| :-- | :-- |
| **FC-01** | `SAME_EVENT_FINDING` and `DISTINCT_EVENT_FINDING` over the same observation set are **mutually incompatible**; both live ⇒ `CONTESTED`, and **no occasion may be created**. |
| **FC-02** | `OCCURRENCE_ESTABLISHED` is **licensed only** by a resolved plurality basis: a `SAME_EVENT_FINDING` (licensing exactly one occasion) or a `DISTINCT_EVENT_FINDING` enumerating N (licensing exactly N). |
| **FC-03** | A `PLURALITY_UNRESOLVED_FINDING` licenses **no** `OCCURRENCE_ESTABLISHED` over its observation set. |
| **FC-04** | Retiring the plurality basis of an existing occasion does **not** delete the identity; it requires an explicit `OCCURRENCE_RETRACTED` or `OCCURRENCE_CONTRADICTED` per affected occasion. |
| **FC-05** | An observation may be cited by at most one `OCCURRENCE_ESTABLISHED` **per enumerated purchase**; citing it for two requires an explicit `DISTINCT_EVENT_FINDING` enumerating both. |
| **FC-06** | Occasion **creation** and occasion **linkage** are separate adjudications. Creation is licensed by FC-02; linkage of further corroborating observations is unrestricted in count and append-only. |
| **FC-07** | An `OCCURRENCE_ESTABLISHED` citing a **combination** is **invalid unless** the §6.8 gates (JD-1…JD-4) are satisfied **and** the §6.8.6 basis (JS-1…JS-6, including JS-3a) is recorded on it. |
| **FC-08** | A `PLURALITY_UNRESOLVED_FINDING` is **invalid unless** occurrence is established for its member set and its factual **lower bound is `L ≥ 1`** (BI-29, §9.7). Where occurrence itself is unresolved, the correct state is **Type B** (§9.7.2), not a cluster. |
| **FC-09** | An `AGGREGATE_INCONSISTENCY_OBSERVATION` **licenses nothing**: it may not create, contradict, retract or reinstate an occasion, and may not be cited under §6.8 in either direction (BI-26, §6.6.2). It may mark findings for re-adjudication (§9.9). |
| **FC-10** | *(new in V1.4)* An `OCCURRENCE_ESTABLISHED` is **invalid** where **every** occurrence-supporting fact it cites lies within a **single participant's authorship domain** — the **JD-4** gate (§6.8.4, BI-33). **No recorded basis, however complete, cures this**, because the gate is evaluated before the basis is read. |
| **FC-11** | *(new in V1.4)* No adjudication of any kind may be admitted, and no projection served, over a subject lying in a **fail-closed scope** (§9.5.5). In particular, a fail-closed subject **MUST NOT** be re-established under a new identity (**IQ-12**). |

---
### 9.7 Unresolved states, typed *(closes `JBA12-AUD-06` and `JBA12-AUD-07`)*

V1.2 had one object for two different situations, and applied one inherited rule to all of them. V1.3 separates the situations first, then scopes the rule to the situation the authority actually names.

#### 9.7.1 Type A — `UnresolvedPluralityCluster`: occurrence established, plurality unresolved

**What it is.** A B2-owned **reconciliation fact** recording that occurrence **is** established over a member set, and that the **number** of real purchases is not.

**Precondition.** Created **only** where §6.7 **(a)**, **(c)** and **(d)** hold and **(b)** does not. It is licensed by a `PLURALITY_UNRESOLVED_FINDING` (FC-08).

| Element | Notes |
| :-- | :-- |
| cluster identity | opaque, server-minted, **structurally distinguishable** from an occasion identity |
| participant | exactly one, established as for occasions (§12) |
| members | the complete set of observations and candidates the ambiguity ranges over |
| **occurrence lower bound `L`** | **factual, and `L ≥ 1` always** (BI-29). A cluster asserts that at least *L* real purchases occurred among its members. |
| **occurrence upper bound `U`** | **factual where evidence establishes one**; otherwise **UNKNOWN / unbounded above**, recorded as such and never faked into a number |
| **ambiguity type** | the structural classification of §9.7.3 — required, not optional |
| basis | the full append-only adjudication history |
| merchant projection | independently `RESOLVED` / `UNRESOLVED` / `CONTESTED` (§13) |
| closure | an explicit `SAME_EVENT_FINDING` or `DISTINCT_EVENT_FINDING` **closes** the cluster and licenses the resulting occasion(s) |

> **Why `L ≥ 1` is mandatory.** §6.7's cluster branch is reached only once occurrence **has been established**. A cluster whose semantics simultaneously said *"a purchase occurred"* and *"the lower bound may be zero"* would be internally contradictory. The floor is not a counting policy — it is the factual content of the occurrence finding that licensed the cluster.

**On the bounds.** They are statements about **evidence**, not counting policy. *"At least one purchase occurred among these observations"* is a real-world fact B2 can establish. It is **not** an instruction to count one, and it is **not** the inherited primary rule either.

**Anti-inflation and anti-deflation both hold.** An open cluster contributes **zero** canonical occasions, so ambiguity cannot inflate B2's count; and the cluster is a **first-class B2 output** with its members, bounds and basis, so ambiguity cannot silently vanish either.

#### 9.7.2 Type B — occurrence itself unresolved: **not a cluster**

**What it is.** An ordinary reconciliation **subject** on which §6.7(a) is not satisfied: the evidence does not establish that any real purchase occurred.

| Property | Value |
| :-- | :-- |
| Is it a cluster? | **No.** It has no cluster identity, no factual bounds, and no membership semantics. |
| Canonical occasions licensed | **zero** |
| State | `UNRESOLVED` (or `CONTESTED`) on the reconciliation subject (§25.2) |
| Lower bound | **none — the concept does not apply.** There is no established occurrence to bound. |
| Inherited "count one" treatment | **Does not apply.** No inherited conclusion follows from the mere existence of this state. |
| Route out | an explicit `OCCURRENCE_ESTABLISHED` (then, if plurality is open, a Type A cluster), or continued UNRESOLVED |

> **BI-29, stated as the prohibition it is.** A Type B state MUST NOT be represented as, converted into, or analysed as a Type A cluster. Nothing about *"purchases occurred here, we just do not know how many"* is true of it — and the inherited rule that governs Type A's duplicate case says nothing whatever about it.

#### 9.7.3 Ambiguity type — the structural predicate *(scopes the inherited rule)*

Every Type A cluster carries exactly one **ambiguity type**. The classification is **factual and structural** — it describes the shape of the evidence, not an analytical treatment.

| Ambiguity type | Structural predicate | Typical bounds |
| :-- | :-- | :-- |
| **`PLAUSIBLE_DUPLICATE_AMBIGUITY`** | **(i)** the members are records that **plausibly describe the same real transaction**; **(ii)** their **distinctness cannot be established** on available evidence; **(iii)** the only open question is whether they duplicate one another — occurrence of at least one is established, and no evidence establishes that any member is a *separate additional* purchase. | `L = 1`; `U` = member count where bounded, else UNKNOWN |
| **`ESTABLISHED_MULTIPLICITY_AMBIGUITY`** | evidence establishes that **more than one** real purchase occurred, but not how many | `L ≥ 2`, `U` where established, e.g. `[2,3]` |
| **`OPEN_UPPER_AMBIGUITY`** | occurrence of at least *L* is established; no evidence bounds the count above | `L ≥ 1`, `U = UNKNOWN` |
| **`MIXED_AMBIGUITY`** | the member set contains both a plausible-duplicate question and an established-multiplicity question | `L ≥ 1`, recorded per the evidence |

> **The exact inherited class.** Rev 2 §6.A speaks of *"two records plausibly represent the same real transaction and distinctness cannot be established"*. That sentence describes **`PLAUSIBLE_DUPLICATE_AMBIGUITY`** and no other row of this table. This contract therefore applies the inherited primary treatment **only to that row** (§22.3).

**This classification is not an analysis treatment.** It records what kind of ambiguity the evidence exhibits. What C2 does with each kind is C2's, except where inherited authority already fixes it — which it does for exactly one kind.

### 9.8 Contradicted and retracted occurrence

| Layer | Nature | Behaviour |
| :-- | :-- | :-- |
| **Historical canonicalization identity** | **immutable under scientific operations** | never deleted by correction, contradiction, reconciliation or ordinary application operation; remains referenceable for audit and prior C1 references. **Subject to a controlling authorized legal deletion obligation** (§16, BI-22, BI-31). |
| **Active occurrence projection** | derived, revisable by adjudication | `ACTIVE` \| `CONTRADICTED` \| `RETRACTED` \| `TOMBSTONED` \| `PURGED` |

- Only **`ACTIVE`** is a canonical `PurchaseOccasion` for downstream **factual** consumption (BI-22).
- `CONTRADICTED` and `RETRACTED` identities are **historical records** — never counted, never joined as occasions.
- **Default read surfaces must make the distinction unavoidable**: the factual surface returns only `ACTIVE`; historical identities are reachable only through an explicitly historical/audit surface.
- Nothing is deleted **by scientific operation**; P-05's purpose limitation still forbids removing anything **in order to** alter results.
- Return to `ACTIVE` requires an explicit `OCCURRENCE_REINSTATED` (SG-10).
- `TOMBSTONED` and `PURGED` arise **only** from an authorized deletion (§16).

### 9.9 Correction, retraction, re-adjudication

A `SOURCE_CORRECTION`, `SOURCE_RETRACTION` or `AGGREGATE_INCONSISTENCY_OBSERVATION` changes no finding silently. It marks dependent findings as **requiring re-adjudication**; affected projections become `CONTESTED` until an explicit adjudication retires them. Original finding, correction and re-adjudication all remain readable with their own knowledge times, **under ordinary and scientific operation and where controlling legal retention permits** (BI-31, §16).

**The aggregate case is bounded.** An `AGGREGATE_INCONSISTENCY_OBSERVATION` may **only** mark for re-adjudication. It may not itself change any occurrence projection, in either direction (FC-09, BI-26).

### 9.10 Occasion correction after canonicalization

Canonical **identity** is never corrected — it is opaque and immutable under scientific operation (§11). What is corrected is the **adjudicated interpretation**: occurrence projection, merchant projection, plurality basis, source links — all by appended adjudication. An occasion that turns out never to have occurred becomes `CONTRADICTED`, not deleted (P-05) and not left `ACTIVE` (which would assert a falsehood).

---

## 10. `PurchaseOccasion` model

### 10.1 Logical interface (controlling; physical shape not decided here)

| Element | Cardinality | Notes |
| :-- | :-- | :-- |
| canonical identity | 1 | opaque surrogate (§11); **immutable under scientific operation**, subject to §16 |
| **occurrence projection** | 1 | `ACTIVE` \| `CONTRADICTED` \| `RETRACTED` \| `TOMBSTONED` \| `PURGED` |
| `StudyParticipant` | **exactly 1 while `ACTIVE`** | immutable, DB-provable (§12, BI-09); tombstones outside this invariant (§16) |
| **merchant projection** | 1 projection, `0..1` resolved merchant | `RESOLVED` \| `UNRESOLVED` \| `CONTESTED` \| `REDACTED` — **not** an occurrence precondition (§13) |
| establishment adjudication | ≥1 | the licensing `OCCURRENCE_ESTABLISHED` and its retirement chain |
| plurality basis | 1 | the finding that licensed creation (FC-02) |
| §6.8 basis | 1 where a combination was cited | FC-07 |
| source provenance links | **0..N** | append-only; supporting **or** contradicting (§14) |
| candidate links | **0..N** | which candidates it was reconciled from |
| `PurchaseIntent` links | **0..N** | zero for intentless occasions |
| `Decision` links | **0..N** | linkage only |
| `Outcome` links | **bounded by payload semantics actually available** | §7.2, §23 — **no cardinality inferred from RT-09** |
| **`LateActualTransactionFactSatellite`** rows (§9.3.8.1 row 22) | 0..N | appended; never mutating the identity row; no canonical scalar and no current selection rule among coexisting values (R-B-13) |
| adjudication history | ≥1 | append-only |
| legal-deletion state | derived | §16 |

`0..N` source provenance is required by the Rev 2 §6.A amendment (*"zero, one, or many source links"*). Zero is reachable after legal redaction.

### 10.2 Participant projection

A **named, tested `participantId` projection must exist** (P-18) for `ACTIVE` occasions. The architecture requires the projection and its test; it does **not** mandate a duplicated physical column. A spec choosing redundant storage must prove coherence (§18, DB-01).

### 10.3 What a canonical occasion is not

Not an opportunity, not an *independent* occasion, not a numerator or denominator fact, not a Type A cluster, and not a Type B subject. It is a factual statement that one real purchase occurred — and only while its occurrence projection is `ACTIVE`.

---

## 11. Identity architecture — closes **O-16**

### 11.1 Decision

> **All B identities — candidate, cluster, canonical occasion, link, decomposition manifest member, quarantine record — are opaque, server-minted surrogates with no business content. No identity is a function of business data, and no identity is derived from any key pair.**

The Rev 2 §8 interim default — *no new deterministic canonical key* — is **confirmed as the standing decision**. Legacy `occasionKey` stays deleted (P-03); `UNIQUE(originIntentId)` and equivalents are **forbidden** as canonical identity (R-B-04, P-02); **no source-system identifier** is identity (R-B-06); **no timestamp** is identity (R-B-12); **no identity digest is required**, and none is stored unless PostgreSQL verifies its *semantic content* (R-B-14, P-09).

**Cluster identities must be structurally distinguishable from occasion identities**, so a Type A cluster can never be joined as an occasion.

### 11.2 Minted, never derived

> A decomposition **manifest maps** `(operation identity, member discriminator) → server-minted opaque candidate ID`.
> The mapping is **stored**, not computed. Retries **replay the stored mapping**. **The candidate ID is not derived from the pair.**

Idempotency therefore comes from **reading a durable mapping**, not from recomputing a key — the same discipline §17 applies to receipts, and it keeps identity free of business content. Full contract at §17.3.

**How this is proven is a separate question**, and V1.2 answered it wrongly. A surrogate-typed column proves nothing about minting. The enforcement and proof obligations are class **E-E** and are stated at §18.6.

### 11.3 Why opaque — evaluated against the required axes

| Axis | Consequence |
| :-- | :-- |
| **Dedup uncertainty** | plurality is sometimes unresolvable (§9.7); a deterministic key would encode an answer that does not exist |
| **Append-only correction** | a key derived from merchant/instant/participant would have to **change** when adjudication corrects them; a changing identity is not an identity |
| **Candidate merge / split** | B2 merge and split change which observations belong where; a content-derived key changes with them |
| **No perfect natural key exists** | Phase 0A prohibits the transaction-history data that would supply one |
| **Idempotency** | achieved at the request/manifest layer (§17), not by making identity double as a dedup key |
| **Replay** | safety comes from re-proving the target, not recomputing a key |
| **Forensic auditability** | the append-only log records *why* an occasion exists — strictly more than a key asserting *that* it does |

**Correct security properties.** Content-independent; stable across adjudication; non-semantic; collision-resistant to its generator's strength; optionally unguessable.

**What it is NOT.** The claim that a surrogate *"carries no direct-SQL forgery surface"* is **withdrawn as false**. An attacker with arbitrary SQL fabricates surrogate rows as easily as any others; unguessability resists *targeted collision with a known existing identity*, nothing more. Authenticity comes from **DB roles and privileges, capability boundaries, relational integrity, triggers, re-proof and trusted write paths** (§18, §19) — each subject to **BI-32**. Identity opacity is a **correctness and stability** property, not a security control.

### 11.4 Identity is not duplicate-detection evidence

**Identity** answers *which row is this*; **duplicate-detection evidence** (candidate content, correlation facts, distinctness evidence) answers *might these be the same real purchase*. The latter feeds adjudication and never becomes or constrains identity. A future deterministic dedup fingerprint would be a duplicate-detection artifact; making it identity requires amending this contract (P-03a).

---

## 12. Participant semantics

1. **Exactly one `StudyParticipant`** per *active* canonical occasion (R-B-08, BI-09) and per Type A cluster.
2. **Immutable and DB-provable** while active (§18, DB-01).
3. **Derivable without trusting a caller-supplied `participantId`.** Each source class in §6.4 names its binding path; §18.5 states each path's relational provability and enforcement class.
4. **A B1 observation without an accepted participant-binding proof is non-grounding** (§18.4).
5. **Candidate participant conflict is a hard integrity failure, not an ambiguity — fail closed.** Participant is the cohort anchor (A1); there is no conservative reading of an ambiguous participant. Under §8, a candidate binds one individually addressable assertion, so a participant conflict within a candidate indicates corrupted or forged lineage rather than a reconciliation question.
6. **Occasion- and cluster-level source participant conflict is likewise fail-closed**, and **JS-1** requires participant coherence across every fact cited in a §6.8 basis.
7. **A named, tested `participantId` projection is required** (P-18); redundant physical storage is permitted, not mandated, and coherence must be proven if used.
8. **Tombstones are outside 1–7** (§16): a privacy tombstone is not an active canonical occasion and does not violate BI-09 by lacking a participant relation.

---

## 13. Merchant semantics

### 13.1 Two independent questions

| Question | Owner | Answer space |
| :-- | :-- | :-- |
| **Occurrence** — did one real-world attempted or realized purchase occur? | B2 | established / unresolved / contradicted |
| **Merchant resolution** — is the real-world merchant known? | B2, **separately** | resolved / unresolved / contested / redacted |

Merchant missingness is **missingness**. Converting it to non-occurrence would be the `PROVENANCE_UNKNOWN` → negative conversion P-13 prohibits.

### 13.2 Why merchant is optional — an architecture choice, honestly labelled

**What P-19 actually does.** P-19 prohibits *"requiring physical scalar columns merely because the superseded interface used them."* It therefore prevents deriving a **physical scalar requirement** from Rev 2 §6.A's printed `merchantId: string`. **It does not, by itself, forbid merchant resolution as a semantic establishment criterion.**

**What actually grounds the choice:**

| Basis | Contribution |
| :-- | :-- |
| **R-B-01 occurrence ontology** | an occasion is *one real-world attempted or realized purchase*; the definition contains no merchant condition. A purchase occurs whether or not anyone can later name the merchant. |
| **R-B-07 merchant provenance** | constrains **where the value comes from** (real-world, never auto-copied). It presupposes the field's meaning; it does not make merchant an existence condition. |
| **P-13 missingness discipline** | requiring merchant would convert a missing merchant fact into a **negative occurrence determination**. |
| **B/C firewall** | excluding real purchases from the factual record because a merchant is unknown pre-empts a C2 eligibility judgement inside B (BI-05). |

**Stated honestly.** Another JBA **could** have required merchant resolution as a semantic establishment criterion, had it a stronger semantic basis consistent with those four constraints. This contract judges that no such basis exists in the accepted authority and that the four above point the other way — but that is a **reasoned architecture choice, not a logical necessity**, and it is recorded as **AC** in **Part F**.

### 13.3 Three merchants, never collapsed

| Merchant fact | Owner | Meaning |
| :-- | :-- | :-- |
| **A2 intended merchant** | A2 | in the pinned context version — a **decision input**, not a real-world claim (A2 §44) |
| **observed / source merchant** | B1 | what a source asserts, preserved per observation with provenance |
| **canonical real-world merchant** | **B2** | the adjudicated real merchant, exposed as a projection |

**Never auto-copied from the A2 intent** (R-B-07, BI-08).

### 13.4 Merchant as an authoritative logical projection

> The **authority is the adjudication log.** The merchant is an **authoritative logical projection from adjudication**. Any materialized merchant field is a **derived, reproducible, explicitly non-authoritative projection** of that log, checkable against it. **No mutable column becomes authority** (P-06a, BI-15).

| State | Meaning | Downstream reading |
| :-- | :-- | :-- |
| `RESOLVED` | an unretired admitted `MERCHANT_ESTABLISHED` names *M* | *M* |
| `UNRESOLVED` | no merchant finding stands | **missing**, never "not a corpus merchant" |
| `CONTESTED` | incompatible unretired merchant findings over a valid graph | **missing and disputed**; no winner picked (SG-08) |
| `REDACTED` | legally redacted (§16) | **typed missingness where residue is permitted** (BI-31) |

### 13.5 Logical-interface handling of the pre-ratification non-null scalar

```
merchantProjection : { status: RESOLVED | UNRESOLVED | CONTESTED | REDACTED,
                       merchantId?: present if and only if status = RESOLVED }
```

**Semantic logical-interface repair only.** It does **not** authorize a mutable nullable physical column, and physical representation is reserved to **B2S** (P-19 forbids inferring physical shape from §6.A in either direction).

### 13.6 Establishment, conflict, unknown

- **Establishment:** an explicit `MERCHANT_ESTABLISHED` citing at least one participant-bound `OCCURRENCE_SPECIFIC` observation — one AL-3 source, or a combination passing §6.8. Never inferred, never defaulted, never copied.
- **Conflict:** `CONTESTED`. No winner picked.
- **Unknown:** `UNRESOLVED`. **The occasion still exists** if §6.7 (a)–(d) hold.

### 13.7 Who decides usability

**C2 determines** whether an established occasion with an unresolved or contested merchant may enter a merchant-dependent analysis — corpus coverage, the economic threshold, denominator inclusion. **B does not**, and B does not pre-filter such occasions out of existence (BI-05, P-07). "Established merchant" also does **not** mean "corpus merchant".

---
## 14. Provenance architecture — closes **O-14** (part of JA-06)

### 14.1 Link structure

| Property | Decision |
| :-- | :-- |
| source links per occasion / per Type A cluster | **0..N** / **1..N** |
| candidate links per occasion | **0..N** |
| observations per candidate | **1..N**, **restricted to revisions, corrections, retractions and source-native attachments of the same individually addressable assertion** (AU-2, BI-28) |
| **source-supplied references and relation markers per candidate** | **0..N — preserved, creating no equivalence** (AU-3, §23 RP-1…RP-3) |
| link identity | opaque, minted; **no source id is ever occasion identity** (BI-07) |
| append-only? | **Yes.** Unlinking is an appended retraction, never a delete. |
| source addition after canonicalization | **Permitted** (FC-06) |
| source retraction | **Permitted**, append-only; triggers re-adjudication; may make occurrence `CONTRADICTED`/`RETRACTED` |
| competing / contradictory sources | permitted and **first-class** — every link carries a **stance** (supports / contradicts) **and the scope of the linked fact** |
| source authority | the §6.4 **class-level** level **paired with its scope** — a static property, **not** a per-record confidence score (a score invites `highest-confidence-wins`, P-14) |
| cross-source equivalence | **B2-only** (BI-24). B1 links express **source-native relations only, which merge nothing** (AU-3). |

**Stance is scope-qualified.** A `contradicts` stance from an `AGGREGATE_EXPOSURE` fact is an **aggregate-level** contradiction (§6.6.2, FC-09), not an occurrence-specific one, and is recorded as such. Stance alone never tells an adjudicator what a fact may be cited for; the **pair** `(stance, scope)` does.

### 14.2 The four provenance semantic states (BI-16)

**Derived capabilities** over the link graph, not stored enum columns — they **may coexist**, and one mutable column would force the collapse the ratification forbids.

| State | Derivation |
| :-- | :-- |
| `A2_ENTRY_SOURCE_PRESENT` | ≥1 linked observation is in the A2 lineage (S-1/S-2), reaching a capture token carrying a trusted server-resolved `entrySource` |
| `NON_A2_PROVENANCE_PRESENT` | ≥1 linked observation is outside the A2 lineage (S-3/S-4/S-5) |
| `AFFIRMATIVE_NON_INDEPENDENCE_EVIDENCE` | ≥1 linked or temporally-related fact affirmatively evidences prompting — e.g. a `ResearchContact` (S-7) |
| `PROVENANCE_UNKNOWN` | unresolved by any available link |

**Binding constraints.** A2 provenance ≠ scientific independence — `entrySource` is *trusted capture provenance*, explicitly **not** a B entry-source adjudication or contamination conclusion (A2 §8.4, §44). Non-A2 provenance ≠ independence. **UNKNOWN is never negative** (P-13). Rev 2 §6.B's *primary independent* classification is a **C2** classification over these preserved facts; **B preserves and does not classify.**

---

## 15. Temporal architecture — closes **O-15** (JA-07)

### 15.1 The five time axes

| Axis | Meaning | Source | May be UNKNOWN? |
| :-- | :-- | :-- | :-- |
| **source event time** | when the real-world thing happened | source-asserted | **Yes** — frequently, often only coarsely |
| **source assertion time** | when the source made the assertion | source-asserted | Yes |
| **knowledge time** | when the study first durably knew the fact | **trusted server** | **No** |
| **persisted-at time** | when the row was written | **trusted server** | No |
| **adjudication time** | when an adjudication was recorded | **trusted server** | No |

### 15.2 Rules

- **`TIMESTAMPTZ(6)`** wherever persisted; **full microsecond precision preserved** (R-B-12). Storage capability and end-to-end fidelity are **different obligations** and are classified separately (§18.2, DB-11).
- **No JavaScript `Date` as canonical representation** where truncation is possible (P-08). `Date` is millisecond-resolution; round-tripping a `TIMESTAMPTZ(6)` through it destroys three digits — what the rejected implementation did (§30).
- **No timestamp is identity-relevant** for any occasion, cluster, candidate, link, manifest member or quarantine record (BI-12).
- **Event and knowledge time are always distinct for B facts.** A2 §36 legitimately collapses them for finalization/invalidation because those are immediate trusted service events that cannot be backdated; B facts are the opposite.
- **Anti-time-travel.** Every adjudication and every quarantine records the **knowledge horizon** it was made under; "what was known at *T*" filters by knowledge time.
- **Coarse and interval times are first-class**, never faked into a false instant.
- **As-of / bitemporal analysis semantics remain deferred to C2.**

---

## 16. Append-only, correction, retraction — and legal deletion (closes **O-17**)

### 16.1 The distinctions

| Concept | Mechanism |
| :-- | :-- |
| **immutable historical assertion** | the observation row; never modified |
| **current adjudicated interpretation** | a **projection** (§9.3), not a stored status |
| **retraction / correction** | appended; explicit reference to what is superseded |
| **supersession** | appended `ADJUDICATION_SUPERSESSION`, graph-validated (§9.4), retirement by **admitted**-edge existence (SG-10) |
| **structural-integrity quarantine** | appended (§9.5); excludes a **malformed structural record** from admission; **never a finding, never a winner** (IQ-3, IQ-4) |
| **equivalence / distinctness / unresolved plurality** | `SAME_EVENT_FINDING` / `DISTINCT_EVENT_FINDING` / `PLURALITY_UNRESOLVED_FINDING` |
| **legal deletion / redaction / purge** | §16.3–§16.7 — the **only** authorized removal path |

**No mutable status column carries authority.** A materialized current-state column is permitted only as a **reproducible projection**: explicitly non-authoritative and checkable against its authority (P-06a).

### 16.2 The tension

The accepted append-only pattern blocks `DELETE` **unconditionally** (A1 §21's BEFORE UPDATE/DELETE/TRUNCATE triggers; A2). Rev 2 §6.E holds that *"Legal/consent deletion overrides analysis retention."* Both are in force; ratification §4.2 records this as a STRICT CONSEQUENCE and assigns resolution here.

### 16.3 Purpose limitation, stated correctly

P-05 prohibits *"selectively deleting, mutating, or marking an occasion ineffective **in order to alter scientific results**."*

> **The prohibition is on purpose, not on consequence.**
>
> A controlling legal/consent/privacy deletion **may necessarily change** available data, available joins, the analysable sample, and historical references. **That consequence is not a violation of P-05**, and this contract makes **no claim that lawful deletion is analytically neutral.**
>
> What is prohibited is performing, selecting, timing or scoping a deletion **for the purpose of** altering scientific results.

**Representation obligation, correctly conditioned.** The analytical consequence must be represented as **typed missingness and deletion history where legally permitted** — and where residue is **not** legally permitted, the consequence is **ordinary absence** and must not be simulated by a residue the authority forbids (§16.6, BI-31). Per Rev 2 §6.D's principle, missingness must never make a favourable conclusion easier; **C2** handles it conservatively under the future `AnalysisProtocol` (BI-05).

### 16.4 Mechanisms — capability options, not legal-sufficiency claims

| Mechanism | What it does structurally |
| :-- | :-- |
| **Identifying-linkage removal** | severs the identifying participant relation |
| **Redaction** | replaces field content with a marker; row and relationships survive |
| **Crypto-erasure** | destroys the key for a detachable identifying payload; structure survives |
| **Tombstone** | retains the row carrying only permitted residue; referential integrity survives |
| **Authorized purge** | removes the row, and where required its identity residue, through the authorized path only |

> **No claim of legal sufficiency.** This contract does **not** assert that redaction, crypto-erasure, tombstoning or purge satisfies any specific law, regulation or consent instrument, individually or in combination. **The controlling legal/consent/privacy authority selects the mechanism and determines sufficiency.** Any engineering preference expressed here applies only where that authority is indifferent.

### 16.5 Authorization — and its own mortality *(closes `JBA12-AUD-10`)*

A durable **`DeletionAuthorization`** — a **logical role**, not a table name — names the obligation basis, data scope, authorizing role and selected mechanism. It is mintable **only outside the B write path**, by a named human or process role: not the analysis pipeline, not B1/B2 service code, not a participant request alone, and not this architecture. **No legal obligation is invented here.**

> **The authorization record is append-only under ordinary and scientific operation. It is NOT legally immortal.**
>
> The `DeletionAuthorization` is **itself subject to the same controlling deletion override** it exists to serve. Where the controlling authority requires the authorization record to be purged:
>
> - retain **no more than legally permitted** — which may be nothing;
> - **claim no surviving audit residue**;
> - do **not** preserve a "record that a record existed" as a workaround, and do **not** reconstruct it from logs, backups or joins (AT-22a).
>
> A design in which the authorization record can never be removed would assert that scientific and audit retention overrides a controlling deletion obligation — exactly the claim **P-05a** prohibits.

### 16.6 Deletion states and what downstream actually sees *(closes `JBA12-AUD-09`)*

| State | Invariants | Scientifically joinable? | Counted? |
| :-- | :-- | :-- | :-- |
| **ACTIVE factual identity** | all normal B invariants, incl. exactly one participant (BI-09) | **Yes** | Yes, while `ACTIVE` |
| **Historical contradicted / retracted identity** | retained under **scientific** operations; never removed by correction, contradiction or reconciliation | No — audit surface only | **Never** |
| **Privacy tombstone** | retained **only where controlling authority permits residue**; participant relation **may be absent** | **No** | **Never** |
| **Authorized full purge** | where the controlling authority requires it, **identity residue may be deleted** and references authorizedly severed, tombstoned or purged | n/a | n/a |

#### 16.6.1 The two cases, stated without contradiction

> **Case 1 — residue permitted.** Typed deletion missingness and deletion history are preserved: at most the opaque identity, the fact a tombstone exists, the redaction's typed classification, and the `DeletionAuthorization` reference. **Never the redacted content.** Downstream sees **typed missingness**, distinguishable from never-present.
>
> **Case 2 — residue prohibited (full purge).** There may be:
>
> - **no identity**;
> - **no tombstone**;
> - **no `DeletionAuthorization` record**;
> - **no link or severed-reference marker**;
> - **no typed deletion marker**;
> - **and no proof that the entity ever existed.**
>
> Downstream then sees **ordinary absence**, because even the deletion marker cannot lawfully remain. **This architecture explicitly accepts that possibility.**

> **BI-31 — the corrected guarantee.** *Typed deletion missingness and deletion history are preserved **where legally permitted**; otherwise downstream may see ordinary absence, indistinguishable from never-present.* **No universal distinguishability is promised.** A scientific system **MUST NOT reconstruct forbidden residue** — not by correlation, not by cross-table joins, not by backups, not by inference from a gap in an identifier sequence, and not by retaining a "deletion happened" marker the authority forbids (AT-22, AT-22a).

#### 16.6.2 The consequence for analysis, surfaced rather than hidden

Where residue is prohibited, **C2 cannot distinguish a lawfully purged record from one that never existed.** That is a real analytical limitation and it is **not** removable by architecture.

- **C2's conservative handling must not depend on making that distinction** (obligation **C2-4a**, Part P.4).
- Rev 2 §6.D's principle still governs: missingness must never make a favourable conclusion easier. Where the *fact of deletion* is itself unknowable, conservative treatment must be conservative **without** knowing it.
- **The number of purges may itself be unreportable.** Where the authority forbids retaining a count, no count is retained and none is estimated.

**Identity permanence, scoped.** Canonical identity is immutable and permanent **under scientific correction, contradiction, reconciliation and ordinary application operation**, and **remains subject to a controlling authorized legal/consent/privacy deletion obligation.** **Scientific retention cannot override the obligation** (P-05a).

### 16.7 Referential integrity — preserved only as far as legally permitted

> **A full legal purge may make perfect referential integrity impossible. This contract does not promise otherwise.**

| Requirement | Statement |
| :-- | :-- |
| **RI-1** | The architecture MUST support **authorized severance** and **authorized purge propagation** — a defined path by which references to a purged entity are severed, tombstoned or purged as the controlling authority requires. |
| **RI-2** | The architecture **MUST NOT promise that references survive** a purge. A prior C1 reference to a purged occasion may become unresolvable, and that is a lawful outcome, not a defect. |
| **RI-3** | An unresolvable reference MUST fail closed rather than resolve to a fabricated or reconstructed target. |
| **RI-4** | Where a severed-reference marker is itself forbidden residue, **no marker remains** and the reference is simply absent (BI-31, Case 2). |
| **RI-5** | **C1/C2 own the consequences** of an unresolvable reference for their own artifacts (Part P.3). B does not resolve it, and B does not delete anything to tidy it away (P-05 purpose limitation). |

### 16.8 Privilege separation for the deletion gate

The append-only trigger admits exactly one conditional exception: a mutation is permitted only with a valid, referenced `DeletionAuthorization` in the same transaction, within its declared scope. **That check alone is insufficient**, because an actor who can mint both rows defeats it. Privilege separation is therefore **part of the control**:

| # | Requirement |
| :-- | :-- |
| **PR-1** | Runtime roles **cannot own** protected tables. |
| **PR-2** | Runtime roles **cannot disable triggers**. |
| **PR-3** | Runtime roles **cannot assume** the authorization role. |
| **PR-4** | The authorization role **cannot mutate** B fact tables. |
| **PR-5** | **Migration / owner / superuser credentials are outside ordinary runtime** and require **separate operational governance and audit** — a control this architecture **requires be established, and does not enforce**. |

The **threat boundary** within which PR-1…PR-4 mean anything is stated at §19, not here, and it is stated once.

### 16.9 Structural-integrity history is not exempt *(closes `JBA13-AUD-05`)*

The append-only structural-integrity log of §9.5 is a **B artifact like any other**, and the conditional-residue rule of §16.6 applies to it without exception.

| # | Rule |
| :-- | :-- |
| **LD-Q1** | **`IQ-10`.** The quarantine record, its rescission, its basis, its acting role, the affected-scope record, the integrity-error history, the malformed raw record and the structural-admission record are **append-only under ordinary and scientific operation**, and **each is subject to the same controlling legal/consent/privacy deletion override** as every other B artifact (BI-31). |
| **LD-Q2** | Where residue is **permitted**, typed forensic integrity history is preserved and a reader can see that a quarantine occurred, on what basis and by whom — **§16.6.1 Case 1**. |
| **LD-Q3** | Where residue is **prohibited**, the integrity history may itself be purged or severed. There may then be **no quarantine record, no rescission, no basis, no actor, no scope record, no malformed row, and no proof that any integrity event ever occurred** — **§16.6.1 Case 2**. Downstream sees **ordinary absence**. |
| **LD-Q4** | **No unconditional survival, readability or visibility is promised for any integrity artifact**, and forbidden integrity residue **must never be reconstructed** — not from backups, logs, identifier gaps, join remnants, or a retained *"an integrity event occurred"* marker (AT-22a). |
| **LD-Q5** | Purging one of a quarantine/record pair while the other survives is **safe by construction**, because admission is computed from **record-level validity** rather than from the presence or absence of a quarantine (§9.3.2, TE-8). The two cases are worked at **§9.5.7.2**: a surviving malformed record whose quarantine was purged is **still not admitted** and **still fails its scope closed**; a surviving quarantine whose record was purged is **inert** (IQ-11). |
| **LD-Q6** | An authorized purge of integrity history is **not** an integrity remedy and **never** substitutes for one. It changes what is retained, never what is admitted, and it may not be used to clear a fail-closed scope (IQ-12, FC-11). |

> **Why this ordering matters.** The conditional-residue rule (§16.6) and the total admission predicate (§9.3.1) are not independent repairs. Without the predicate, purging a quarantine record would silently **re-admit** the malformed record it dispositioned, because admission would have defaulted to *"persisted and not quarantined"*. With the predicate, the same purge degrades the system to **fail closed** — losing the audit trail, which the law may require, but never the integrity guarantee.

---
## 17. Idempotency, decomposition and receipt architecture

### 17.1 Retained ratification (R-B-15)

A receipt is a **pointer**, never identity authority. Resolution must **re-prove** target and material ownership. **Direct SQL forgery is in scope.** A **receiptless winner fails closed** unless a spec explicitly elects recovery (O-10 default: *none, fail closed*). Every re-proof guarantee is subject to **BI-32**.

### 17.2 Responsibilities

| Concern | Responsibility |
| :-- | :-- |
| **source ingestion idempotency** | keyed on `(sourceClass, sourceRecordIdentity)`; the same source record delivered twice yields **one** observation |
| **candidate creation idempotency** | via the §17.3 manifest — **never from candidate content**, since content-based dedup would be a hidden individuation rule (R-B-11, BI-24) |
| **reconciliation requests** | idempotent on the adjudication command identity; a replay appends no second adjudication |
| **quarantine requests** | idempotent on the quarantine command identity; a replay appends no second quarantine for the same record and invariant |
| **canonicalization retries** | receipt + full re-proof before returning the occasion |
| **concurrent equivalent observations** | converge to one via the ingestion uniqueness constraint plus reload-and-prove |
| **receipt poisoning** | a receipt resolving to an object not belonging to the requesting subject **fails closed** with a typed error |
| **linked-record re-proof** | `Outcome → SavingEvidence` and evidence → outcome → decision → intent → token → assignment must be re-provable at read time (§7.6) |
| **direct-SQL inconsistent rows** | every trigger and read path re-proves rather than trusting a denormalized value |

### 17.3 Decomposition result-set contract

Decomposition — one source record whose payload **explicitly enumerates individually addressable** assertions grounding N candidates — needs an idempotent **result-set** contract that reintroduces neither derived identity nor inferred grouping.

| # | Requirement |
| :-- | :-- |
| **DC-01** | A decomposition is performed by a **trusted decomposition operation** with its own durable identity. |
| **DC-02** | Each member carries a **stable member discriminator** within that operation, fixed by an **immutable decomposition manifest** recorded with the operation. **Members correspond one-to-one to assertions the source itself individually addresses** under §8.2.1 — never to a grouping, splitting or enumeration B infers (AU-4, BI-24, BI-28). |
| **DC-02a** | **Where the source does not individually address its members, decomposition MUST NOT occur.** The result is one container observation and typed decomposition ambiguity (AU-5). **Attachment count, receipt count and array length are not member counts.** |
| **DC-03** | **On first successful decomposition, B1 server-mints one opaque candidate ID per member**, and the manifest **stores the mapping** `(operation identity, member discriminator) → opaque candidate ID`. **The candidate ID is NOT derived from the pair** (§11.2). |
| **DC-04** | **Retries replay the stored manifest**, reproducing the same N member identities. No member may duplicate because transport retried. |
| **DC-05** | Member identity must **not** be derived from canonical occasion identity, nor from merchant, time or content natural keys (BI-07, BI-12). |
| **DC-06** | A **changed** decomposition — the trusted operation concludes differently on new source evidence — is a **new** operation with a new manifest, appended and explicitly superseding the prior, never an in-place edit of the member set. |
| **DC-07** | Concurrent identical decomposition attempts converge to one manifest via the operation-identity uniqueness constraint plus reload-and-prove; a legitimate race converges rather than failing spuriously. |

Manifest serialization, discriminator scheme and index design are **B1S**'s.

### 17.4 Unique-violation discipline

Classify by **field set**, never message substring; unrecognized target ⇒ **fail closed**. Where ambiguous, reload-and-prove every domain identity that could legally conflict and accept reconciliation **only if exactly one coherent historical result proves the exact replay**; otherwise fail closed. Inherited from A2 §27.

---

## 18. Enforcement taxonomy and the PostgreSQL / security invariant matrix

**R-B-16 is binding.** Before B1/B2 acceptance the hosted required-check surface MUST execute the authoritative **real-PostgreSQL** integration and adversarial suite. Migration-text inspection is **insufficient evidence** for trigger semantics.

### 18.1 Why the taxonomy was refined *(closes `JBA12-AUD-13`)*

A two-way Model A / Model B dichotomy misclassifies at least three different kinds of property, and **a misclassified invariant is worse than a missing one**: it yields a test plan that looks complete and proves the wrong thing.

- A driver that truncates microseconds is not a *malformed write* any constraint can reject — it writes a perfectly well-formed wrong value (DB-11).
- The *absence* of a constraint cannot be enforced by a constraint (DB-07).
- A column's **shape** cannot prove a value's **provenance** (DB-12).

The refinement is not an invention: accepted **A2 §29** already distinguishes DB constraints, triggers, service verification, AST/ESLint module-capability enforcement and CI content gates as different enforcement kinds. This section names those kinds.

### 18.2 The five enforcement classes

| Class | Meaning | Authoritative failure behaviour | Proof |
| :-- | :-- | :-- | :-- |
| **E-A — integrity acceptance / rejection** *(= Model A)* | a DB-representable constraint, trigger or privilege boundary **rejects the malformed write**. Requires the invariant to be genuinely DB-representable. | write rejected at commit | LIVE: the malformed write is refused |
| **E-B — fail-closed authoritative read** *(= Model B)* | a malformed row **may physically enter** under a privileged path; **authoritative reads and projections MUST fail closed** rather than return a plausible wrong answer. | no answer; typed integrity error | LIVE: a direct-SQL-inserted malformed row provably yields a fail-closed read. **Subject to the protected-verifier precondition (§18.3).** |
| **E-C — end-to-end fidelity** | correctness across the driver, serialization and application boundary. **Not** a write-rejection property and **not** a read-refusal property. | a wrong-but-well-formed value is written or returned | **LIVE end-to-end round trip only.** A column-type assertion is not proof. `MODEL A/B NOT THE RIGHT CLASSIFICATION`. |
| **E-D — design prohibition / proof of absence** | the invariant is the **absence** of a construct. An absence cannot be enforced by a constraint. | the forbidden construct exists undetected | schema/design **review** plus a **positive behavioural** LIVE proof that the forbidden behaviour is absent |
| **E-E — capability and provenance** | the invariant concerns **how a value came to exist** or **who may act**. The DB can prove uniqueness and referential shape; it cannot prove provenance of generation. | a value of correct shape but wrong provenance is accepted | trusted path + privilege restriction + service/schema review + **adversarial LIVE proof**. `MODEL A/B NOT THE RIGHT CLASSIFICATION` for the provenance half. |

**Enforcement-class legend for the matrix:** **DB** PostgreSQL · **APP** application/service · **SEC** role/privilege separation · **REV** schema/design review · **LIVE** behavioural proof on real PostgreSQL.

> **No row claims that application-only logic rejects arbitrary SQL.** Where an invariant is not DB-representable, its guarantee is **E-B**, stated as such, with its precondition stated.

### 18.3 The protected-verifier precondition — attached to every E-B row *(closes `JBA12-AUD-15`)*

> **BI-32, as a precondition on the matrix.** Every **E-B** guarantee below holds **if and only if** the corrupting actor **cannot modify the protected verifier or control plane** (§19.2) — that is, cannot alter the verification or projection logic, the trigger and constraint definitions, the privilege model, or the trusted authority sources the verifier reads.
>
> Where the actor **can** modify those, the fail-closed behaviour can be removed by the same act that corrupts the data, and **no guarantee exists.** This is stated once here and referenced by each E-B row rather than repeated as an impossible claim.

Rows whose guarantee depends on this precondition: **DB-03A (E-B branch)**, **DB-08**, **DB-09 (outside boundary)**, **DB-10**, **DB-15**.

> **What the precondition does *not* rescue.** A fail-closed read protects against a corrupting actor by **refusing to answer**. It cannot establish a **positive** fact about how a well-formed row came to exist, because every value it reads is a value the writer chose. That limit is why **DB-03B** exists and is class **E-E** (§18.4, BI-37) — and it is the limit V1.3 missed when it classified authorship as E-B.

### 18.4 DB-03 — split into relational coherence and trusted-generation provenance *(closes `JBA12-AUD-12` and `JBA13-AUD-06`)*

#### 18.4.1 The semantic minimum

> **A candidate-grounding (occurrence-relevant) source whose participant ownership cannot be established through an accepted protected binding is DIAGNOSTIC and NON-GROUNDING until that proof exists.**
>
> An occurrence-bearing fact whose participant is **only application-asserted** may not ground a candidate or support establishment (CE-3).

**Why the accepted authority supports this — it is not invented.**

| Support | Contribution |
| :-- | :-- |
| **R-B-08** | *exactly one participant, immutably; relational satisfaction permitted; named + tested projection required*. An occasion must have a DB-provable participant. |
| **P-18** | prohibits omitting a canonical participant relation or exposing no named/tested projection. |
| **§6.7(c)** | establishment requires exactly one participant to be **established**, not asserted. |
| **AT-01** | the participant is never read from the request; it is derived structurally and re-proven. |
| **P-10** | direct SQL is in scope when reasoning about database integrity — so *"the row says so"* is not proof. |

#### 18.4.2 Why one obligation was two all along *(the `JBA13-AUD-06` defect)*

V1.3 classified the S-3 *"context property"* and the S-5 *"capability property"* as **E-B** — fail-closed **read**. That cannot work, and the reason is structural rather than incidental:

> A direct-SQL forgery writes a row with a **structurally perfect** participant reference, a valid assignment, a real researcher identifier and an intact FK chain. **Re-reading those relations at read time re-reads values the forger chose.** The verifier sees exactly what the forger intended it to see. A coherent forgery and a genuine trusted-path assertion are, at the level of relational content, **indistinguishable** — so no amount of re-proof over that content can separate them.

What re-proof *can* establish is **compatibility**: that the relations hang together and nothing points where it should not. What it **cannot** establish is **provenance**: who authored the assertion, whether the trusted path produced it, or whether the class, level and scope were minted by authorized code. Those are **capability** facts about an event in the past, and they require evidence created **at generation time by a protected mechanism the writer does not control**.

**DB-03 is therefore two independent obligations.**

#### 18.4.3 `DB-03A` — relational coherence

**What it asserts:** the referenced participant exists; the assignment belongs to that participant; the source object's chain resolves to the intended participant; a cross-participant relation is rejected; the observation's participant matches its structural derivation.

**Class:** **`E-A`** where the derivation path is relationally DB-representable (FK, CHECK, trigger); **`E-B`** under the **§18.3 protected-verifier precondition** where re-proof at read is the mechanism.

**What it does *not* assert:** anything about who authored the assertion or which path created the row.

#### 18.4.4 `DB-03B` — trusted-generation and authorship provenance

**What it asserts:**

| # | Obligation |
| :-- | :-- |
| **TG-1** | An observation was **actually authored through the trusted path its class claims** — for **S-3**, the trusted participant context; for **S-4**, the participant submission path — not written by a caller or a direct-SQL actor asserting a participant. |
| **TG-2** | An **S-5** observation was **actually minted by the trusted researcher capability**, not by any actor able to write a valid-looking researcher identifier. |
| **TG-3** | The observation's **source class, authority level, semantic scope and authorship domain** were assigned by **authorized trusted code**, never supplied or influenced by request content (AT-02, AT-02a). |
| **TG-4** | An authoritative read can **distinguish** *a valid structural relation* from *a valid structural relation forged outside the authorized capability path*. Where it cannot, the observation is **not sufficient as authoritative evidence** and is non-grounding (CE-3). |
| **TG-5** | *(new in V1.5)* For an **adjudication or structural record**, that it was produced by the **sanctioned adjudication or integrity capability** rather than injected — the property `GENERATION_AUTHORIZED` evaluates in §9.3.1. |

**Class:** **`E-E` — capability and provenance.** **Not** an FK property. **Not** inferable by reading the row. `MODEL A/B NOT THE RIGHT CLASSIFICATION`.

> ### The binding statement
>
> **Without independently protected trusted-generation / authorship provenance, a structurally coherent row is NOT sufficient as authoritative evidence** (BI-37).
>
> A valid assignment FK proves **ownership compatibility**, not authorship. A row containing a valid researcher identifier is **not proof the researcher created it**.

> ### **`BI-38` — a trusted parent does not authenticate a later child row** *(new in V1.5; closes `JBA14-AUD-02`)*
>
> A valid foreign key, lineage chain or reference proves **relation**. It proves **nothing** about the child's own creation.
>
> **A capability boundary protecting one entity's write path does NOT extend to a different entity written by a different milestone's path**, however sound the reference between them. Trusted generation is a property of **a record's own creation**, and it is **never inherited across a reference**.

**The architecture requires the property; it does not choose the mechanism.** B1S may satisfy `DB-03B` by any mechanism that produces provenance the writing actor cannot fabricate — for example a protected write-only procedure, role-bound server-side insertion, an immutable trusted-ingestion record, a protected capability receipt or provenance relation, or another construction meeting **E-E**. **This contract does not select among them.**

> ### What V1.4 claimed here, and why it is withdrawn
>
> V1.4 stated: *"**S-1 and S-2 therefore satisfy `DB-03B` through inherited accepted mechanisms**"*, citing A2 §28. **That claim is WITHDRAWN.** It is **false for S-2**, and **unqualified for S-1**. §18.4.5 and §18.4.6 replace it with a per-class audit, and **BI-38** states the principle that makes the difference between them visible.

#### 18.4.5 `S-1` — audited, and scoped rather than withdrawn

**What the accepted authority actually supplies.** A2 §28's trusted capability matrix binds `PurchaseIntentCapture`, `PurchaseIntentFinalization`, `PurchaseIntentAdministration`, `PurchaseIntentDecision`, `HistoricalDecisionLookup`, `A1-ConsentFactsRead` and `TrustedEntrySourceResolve` to named owning modules, enforced by `RAW_WRITE_MODULES`, a per-repository owner-allowlist map, ESLint groups and AST tests, alongside A1 §11/§13's capability boundaries. A2 §8.4 additionally makes `entrySource` **resolver-only at issuance and immutable on the token**.

**What that establishes — and its boundary, stated honestly:**

| | Establishes |
| :-- | :-- |
| **Against an application-layer actor** — any module other than the sanctioned owner attempting the write | **YES.** Module-capability enforcement is real and accepted, and it is the mechanism `DB-03B` names for S-1. |
| **Against a direct-SQL actor writing the row outside the application entirely** | **NO.** AST and ESLint are **build-time and code-review** controls. They constrain which module may call the write path; they do not prevent a row appearing without any module calling it — and **P-10** requires that a direct-SQL attacker be assumed. |

> **S-1's inheritance is real, and it is bounded.** V1.4's *"E-E, inherited"* is **preserved, not withdrawn** — it names a genuine accepted mechanism. What V1.5 adds is the **threat boundary that mechanism covers** (§19.3's M-A1…M-A3), and the statement that the **direct-SQL residual is not covered by it** and must be closed by whatever E-E mechanism B1S deploys.

**Why the S-1 residual has bounded consequence.** S-1 lies in the **participant authorship domain** (§6.4.1). By **JD-4**, an S-1 fact can **never** be the independently authored fact that satisfies a combination, and by the participant ceiling it is **never sufficient alone**. A forged S-1 row therefore **cannot, by itself, carry an occurrence establishment** in any configuration this contract admits. That does not make the residual acceptable — it makes it **bounded**, and it is recorded as such rather than treated as closed.

#### 18.4.6 `S-2` — the one rule *(closes `JBA14-AUD-02`)*

**The negative authority fact, established by reading rather than assumed (§2.3):**

| # | Fact, verified content-addressed from the baseline |
| :-- | :-- |
| **1** | **`Outcome` appears nowhere in the accepted A2 canonical specification.** |
| **2** | **A2 §28's trusted capability matrix contains no M7 or `Outcome` capability of any kind.** Its seven capabilities cover `PurchaseIntent*`, `Decision` and `entrySource` operations only. |
| **3** | **`Outcome` belongs to M7** — *"Outcomes + VS ladder + evidence (hardened, verify-then-purge)"*, Phase 0A-2 §40 — a **separate milestone**, which the accepted register lists as **neither implemented nor covered by an accepted effective specification**. |

> ### The rule
>
> **`Outcome → Decision → decisionRequest → intent → captureToken → assignment → participant` proves RELATIONAL COMPATIBILITY and PARTICIPANT COHERENCE only.**
>
> It does **NOT** prove:
>
> - that the `Outcome` was **created through the authorized M7 path**;
> - that its **payload was authored by the asserted principal**;
> - that its **source class was minted by trusted code**;
> - that its **authority level, semantic scope or authorship domain were minted by trusted code**.
>
> Those are **`DB-03B` / `E-E`** properties of the `Outcome` row's **own creation** (BI-38).
>
> **Therefore: an S-2 `Outcome` observation may be candidate-grounding ONLY where independently protected trusted-generation provenance for the authoritative M7 `Outcome` write path is RE-PROVABLE.**
>
> **Absent that proof:**
>
> - it is **preserved as non-authoritative diagnostic provenance**, as its class and scope permit;
> - it **MUST NOT ground a candidate** (CE-2, CE-3);
> - it **MUST NOT contribute occurrence-supporting evidence** under §6.8, in any combination.

**And the converse is equally binding.** *"Cannot prove trusted generation"* is **`GENERATION_AUTHORIZED = UNPROVEN`**, **not** an affirmative claim that the `Outcome` is forged. **V1.5 does not convert absence of proof into a finding of forgery** (AX-2, P-13, BI-16, IQ-9d) — unless controlling authority independently establishes `UNAUTHORIZED`, in which case §9.3.5 Case E/F applies.

**Consequence, stated plainly.** Because no accepted M7 trusted-generation contract exists today, **every S-2 observation is currently non-grounding**. `Outcome`-derived candidates do not exist until that contract exists and is re-provable. This **narrows the candidate-grounding set**; it does **not** change §6.8.8's conclusion, which already rests on **S-5** being the only class satisfying **JD-4**.

#### 18.4.7 `S-2` mechanism ownership — assigned, not left ambiguous

V1.4 left the owner as *"the owning effective spec"*, which names nobody. That gap is closed.

| Layer | Owner | Obligation |
| :-- | :-- | :-- |
| **Semantics** — what property is required, its failure semantics, its read-time re-proof expectation, its threat boundary, its grounding consequence | **This contract (JBA)** | **Fixed here**, at §18.4.6. Not delegated. |
| **Mechanism** — the physical construction that produces re-provable M7-side trusted-generation provenance | **B1S**, via a named **M7 ingestion integration contract** | B1S **MUST** either obtain an **accepted** trusted-generation contract for the M7 `Outcome` write path and implement its re-proof, **or** treat every S-2 observation as **non-grounding**. |
| **Upstream dependency** — any part of the mechanism that must be established by an M7-side effective specification | **recorded as a dependency, not as a blocker** | Where an M7 effective specification must supply part of the mechanism, that dependency is **explicit** (**OP-5**). **JBA semantics do not depend on it**: the standing default is **non-grounding**, so no future discretionary decision is required for this contract to be complete and applicable. |

> **The standing default is what makes the ownership assignment sound.** B1S cannot be blocked by an absent upstream contract, because the absence has a defined meaning: **S-2 is non-grounding**. B1S knows exactly what it may not do — treat an S-2 row as grounding — before any upstream decision is taken.

#### 18.4.8 Consequence for grounding

`DB-03A` **and** `DB-03B` are both preconditions of **E-3** in the emission predicate (§8.2.6). Where either fails or is unproven for a class that requires it, the observation is preserved and marked **non-grounding**, **no candidate is emitted** (CE-3), and the deficiency is recorded — never silently dropped, and never quietly grounding.

### 18.5 Per-source binding matrix — S-1 … S-9, five columns per class

Each class states: **(1)** its `DB-03A` relational proof; **(2)** its `DB-03B` trusted-generation proof; **(3)** its enforcement class; **(4)** who owns the physical mechanism; **(5)** the grounding consequence where `DB-03B` is absent or unproven. **Nothing is classified uniformly, and no class inherits another's protection** (BI-38).

| # | Source | **(1)** `DB-03A` relational proof | **(2)** `DB-03B` trusted-generation proof | **(3)** Class | **(4)** Mechanism owner | **(5)** If `DB-03B` absent / unproven |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| **S-1** | A2 decision-path facts | `intent → captureToken → assignment → participant`; FK chain, A2 §29 | **Partly inherited, and bounded** — A2 §28 capability matrix + A1 §11/§13 module-capability enforcement establish it **against application-layer actors**; `entrySource` is resolver-only and immutable (A2 §8.4). **The direct-SQL residual is NOT covered** (§18.4.5, P-10) | **E-A** (col 1) + **E-E** (col 2) | inherited part → **A1/A2, accepted**; the **direct-SQL residual** → **B1S** | **non-grounding.** Consequence **bounded**: S-1 is participant-domain, so JD-4 means it can never be the independently authored fact, and the ceiling means it is never sufficient alone (§18.4.5) |
| **S-2** | `Outcome` | `Outcome → Decision → decisionRequest → intent → token → assignment`; FK chain — **relational compatibility and participant coherence ONLY** (§18.4.6) | **NONE — no inherited mechanism exists.** A2 contains no `Outcome` capability; `Outcome` is **M7**, a separate milestone with no accepted effective specification. **A trusted parent does not authenticate a later child row** (BI-38) | **E-A** (col 1) + **E-E** (col 2) | **B1S**, via the **M7 ingestion integration contract** (§18.4.7); upstream M7 dependency recorded at **OP-5** | **NON-GROUNDING — and this is the CURRENT state.** Preserved as diagnostic provenance; grounds no candidate; contributes no occurrence-supporting evidence (§18.4.6). `UNPROVEN` is **not** a finding of forgery |
| **S-3** | Participant self-report | trusted participant context → the participant's **own** `ExperimentAssignment` (A1 §12), persisted as a relation on the report row | **E-E — `TG-1`.** A1 states full authentication is **out of its scope**, so the trusted-context property is inherited only as far as A1 asserts it; the **protected generation evidence is an architecture requirement on B1S** | **E-A** (col 1) + **E-E** (col 2) | **B1S** | **non-grounding**, however coherent the row |
| **S-4** | Submission / `SavingEvidence` | evidence → outcome → decision → intent → token → assignment; plus **E-B** forged-link detection at read (DB-10) | **E-E — `TG-1`** for the submission act. The RT-09 **content digest detects reuse**, which is **not** authorship proof and is not treated as one | **E-A** + **E-B** (col 1) + **E-E** (col 2) | **B1S**. *Note: S-4's chain traverses the `Outcome`; per BI-38 that traversal inherits **nothing** from S-2, and S-4 needs its own evidence* | **non-grounding**; and a **forged link must not survive re-proof** |
| **S-5** | Independent researcher observation | researcher capability + explicit participant reference **verified against the cohort** | **E-E — `TG-2`.** **This is the class the whole taxonomy's AL-3 rests on**, and a valid researcher identifier in a row proves nothing about who wrote it | **E-A** (col 1) + **E-E** (col 2) | **B1S** | **non-grounding.** **Highest-consequence row in this matrix** — per §6.8.8, S-5 is the only class satisfying JD-4, so every Phase 0A establishment depends on this proof (**OP-4**) |
| **S-6** | `WeeklyExposureReport` | inherited `(participantId, studyWeek)` relation | **E-E** for the research write path — required for its **exposure** use to be trustworthy | **E-A** + **E-E** | **B1S** | **n/a for grounding — never grounding by class** (§6.6). Without provenance it is not an authoritative **exposure** fact either |
| **S-7** | `ResearchContact` | `participantId` relation | **E-E** for the research write path — required for its **context** use | **E-A** + **E-E** | **B1S** | **n/a for grounding — never grounding by class** |
| **S-8** | `CanonicalEvent` | envelope `participantId?` — **application-asserted, not relationally provable** | **n/a** | — | — | **n/a — AL-0, `NON_ADMISSIBLE`, never grounding** (RT-13, BI-19) |
| **S-9** | Merchant / provider / processor feeds | — | — | — | — | **not admissible in Phase 0A** |

> **What changed from V1.4, and what did not.** **Changed:** the false claim that S-1 **and S-2** satisfy `DB-03B` through inherited mechanisms is withdrawn; S-2 is stated to have **no** inherited mechanism and to be **currently non-grounding**; S-1's inheritance is **scoped to the threat boundary it covers**; ownership is assigned to **B1S via a named contract** rather than to *"the owning effective spec"*; and the matrix gains the **mechanism-owner** and **absent-proof consequence** columns. **Not changed:** every class still has a **relationally provable** participant relation at **E-A** (`DB-03A`), so §18.4.1's minimum is still met by the taxonomy; the `DB-03A`/`DB-03B` split itself; and the E-E classification of authorship, which the audit accepted.

### 18.6 DB-12 — minted identity: invariant kept, proof reclassified *(closes `JBA12-AUD-14`)*

**The semantic invariant is unchanged:**

> Every B identity is **opaque**, **content-free**, and **server- or trusted-service-minted**. It is **not derived** from business values, source-system identifiers, timestamps, intent identifiers, or manifest member keys.

**The enforcement claim is corrected.** A surrogate-typed column proves **none** of that. Enforcement is class **E-E**:

| # | Obligation |
| :-- | :-- |
| **ID-1** | **Trusted generation path** — identity values are produced only by the trusted mint path. |
| **ID-2** | **Capability / privilege restriction** — only that path may supply identity values on insert; runtime roles cannot. |
| **ID-3** | **Application / service review** — the mint call site is reviewed and cannot be bypassed by a caller-supplied value. |
| **ID-4** | **Schema review** proving **no deterministic or generated semantic key exists**: no `GENERATED ALWAYS AS` identity over business columns, no expression index or unique constraint over business values acting as identity, no default expression deriving identity from row content. |
| **ID-5** | **Adversarial LIVE proof** that a caller-provided identity is **rejected or ignored** as the design requires, and that a derived member identity is **not** accepted in place of the stored manifest mapping (DC-03). |
| **ID-6** | **Uniqueness** remains **E-A** — a unique constraint proves uniqueness. |

> **Stated plainly:** *DB uniqueness proves uniqueness. It cannot prove provenance of value generation.* **No PostgreSQL column shape proves minting**, and this contract does not claim one does.

### 18.7 The reissued invariant matrix — DB-01 … DB-15

Every row states: the semantic invariant · its enforcement/proof class · its protected threat boundary · its authoritative failure behaviour · its LIVE-proof obligation. **Rows changed in V1.6 are marked.**

| # | Semantic invariant | Class | Protected threat boundary | Authoritative failure behaviour | LIVE proof |
| :-- | :-- | :-- | :-- | :-- | :-- |
| **DB-01** | exactly one participant per **active** occasion, immutable | **E-A** · DB + LIVE | actors within runtime/research roles (§19.3) | write rejected | insert/update attempts rejected; redundant-storage coherence if used |
| **DB-02** | append-only on observation, candidate, cluster, adjudication, link, manifest and **integrity-history** tables — **including quarantine and rescission records** | **E-A** · DB + LIVE | as above | write rejected | UPDATE/DELETE/TRUNCATE rejected. **Trigger-text inspection is not proof.** |
| **DB-03A** | **relational coherence** — an observation's participant matches its structural derivation; the assignment belongs to the participant; cross-participant relations rejected (§18.4.3) | **E-A** where DB-representable; **E-B** otherwise. **§18.3 precondition applies to the E-B branch** | E-A: role-constrained actors. E-B: actors who cannot modify the verifier | E-A: write rejected. E-B: the authoritative read **fails closed** | direct-SQL insert of an **incoherent** row is rejected (E-A) **or** provably yields a fail-closed read (E-B), **per class, per §18.5** |
| **DB-03B** | **trusted-generation / authorship provenance** — the record was actually produced by the authorized capability path, and its class, level, scope and authorship domain were minted by authorized code (§18.4.4, TG-1…TG-5). **Evaluates the `GENERATION_AUTHORIZED` axis** (§9.3.1) | **E-E — capability and provenance.** `MODEL A/B NOT THE RIGHT CLASSIFICATION` | the capability/privilege boundary; **not** a read-time property | a **structurally coherent forgery** is accepted as evidence unless TG-1…TG-5 hold; where provenance is **absent or unproven** for a class that requires it, a **Tier 1** record is **non-grounding** (TE-7) and a **Tier 2/3** record is **not projection-input-eligible** (TE-6) | **adversarial LIVE proof** per class that a direct-SQL row bearing valid relations but **no protected generation provenance** is **rejected or rendered non-grounding** — **`S2-FORGE-1`**, **`S2-FORGE-2`**, plus S-3, S-4 and S-5 individually; **and that a forged disposition event does not act** (DB-08a) |
| **DB-04** | **no durable candidate with zero grounding observations** | **E-A**, but **not by FK alone** — three acceptable mechanisms; **B1S-owned** | role-constrained actors | write rejected at the transaction boundary | a committed zero-observation candidate must be unreachable; test the **transaction-final boundary** |
| **DB-04a** | **deterministic candidate emission** — the candidate set is a **function** of the record and the taxonomy (§8.2.6, CE-1…CE-7), never a caller-supplied count and never optional | **E-A** for manifest-mapping uniqueness; **E-D** for the absence of a caller-supplied count; **E-E** for the trusted decomposition capability | role-constrained actors + capability boundary | a caller influences how many candidates exist | N addressable grounding assertions → exactly N; an addressable **non-grounding** assertion → **zero**; a caller-supplied count **rejected or ignored**; re-delivery replays the stored manifest |
| **DB-05** | occasion / cluster ↔ source linkage integrity | **E-A** · DB + LIVE | role-constrained actors | write rejected | FK + trigger |
| **DB-06** | ingestion, **manifest-mapping**, **disposition-event identity** and receipt uniqueness where legitimate | **E-A** · DB + LIVE | role-constrained actors | write rejected | `(sourceClass, sourceRecordIdentity)`; `(operationIdentity, memberDiscriminator)` **mapping uniqueness — not a derived key**; **quarantine `qid` uniqueness and rescission-command idempotency** (§9.3.3, RV-5); receipt `(operationScope, idempotencyKey)` |
| **DB-07** | **absence** of any singular origin-intent constraint | **E-D** · REV + LIVE | n/a (design property) | the forbidden constraint exists undetected | a **positive** behavioural test proving **two occasions can link one intent** (P-02) |
| **DB-08** | supersession-graph structural validity **at both levels** — `SG-R` per record and `SG-S` **over the projection-input-eligible set** (§9.4.1) | **`SG-R`: E-A where feasible**, **E-B** for the remainder. **`SG-S`: E-A where DB-representable — write-time rejection is the primary mitigation**; **E-B** otherwise. **§18.3 precondition applies to every E-B part** | E-A: role-constrained actors. E-B: actors who cannot modify the verifier | E-A: rejected. E-B: **no authoritative projection** over the §9.5.5 scope, typed error (SG-09) | malformed edges rejected **or** provably fail closed **within the computed scope only**; cyclic and branching sets rejected at write time where representable; **and the SG-S computation must run over the PROJECTION_INPUT_ELIGIBLE set**, so a validly dispositioned member cannot contribute (FS-2) |
| **DB-08a** *(changed in V1.7)* | **disposition-fold integrity** — `ACTIVE_QUARANTINES` is a **set fold over an append-only, content-addressed history**, with **`0..N` active quarantines per target record** (§23.1); every quarantine carries its **own `qid`**; every rescission **targets exactly one `qid` by explicit reference**; **`CURRENTLY_QUARANTINED` and `VALID_DISPOSITION` are derived, never stored as authority**; a disposition event must itself be `GENERATION_AUTHORIZED = AUTHORIZED` **and must not itself be validly quarantined** in order to act — **`DISPOSITION_EVENT_EFFECTIVE`, not merely `ADMISSIBLE`, is the membership test** (§9.3.3, IQ-13, BI-43, BI-45) | **E-A** for identity uniqueness and target-kind restriction; **E-E** for the integrity capability (IQ-6) and for disposition-event `DB-03B`; **E-B** for projection behaviour under **§18.3**; **E-D** for the **absence** of any stored authoritative disposition boolean **and for the absence of any `0..1`-shaped disposition column or constraint** | capability separation per §19.3; the integrity capability distinct from the write path **and** from scientific adjudication | a quarantine naming a **finding on scientific grounds**, a **valid+authorized record**, an **`UNPROVEN` basis**, or a **set-level violation with no excludable member** is **rejected**; a **forged, unproven or suppressed disposition event does not act** | **the `JBA14-AUD-01` regression test**: malformed record → scope fails closed → valid quarantine → **projection RESUMES**. **The `JBA15-AUD-02` suite**: `DQ-1`…`DQ-6`. **The `JBA16-AUD-03` cardinality suite**: two valid quarantines on one record are **both active**; rescinding one leaves the other; **no count carries semantic authority**; exact replay is **idempotent** and a duplicate logical command creates **no** duplicate semantic identity. **The `JBA16-AUD-04` suite**: `DCG-1`…`DCG-8`. Plus: **no ordering, recency or timestamp is consulted**, and **no stored boolean is authoritative** (P-06a) |
| **DB-08b** *(V1.6)* | **typed eligibility and seed totality** — the four predicates of §9.3.2 are evaluated **only** for the record classes that admit them (§9.3.8), and **`FAIL_CLOSED_SEED` ranges only over `INTEGRITY_SEED_ELIGIBLE` records**, every one of which has a defined `SCOPE` (FS-5, QS-5, BI-41). **Extended in V1.7: the registry is closed** — every persisted class has a §9.3.8.1 row and every other logical name a §9.3.8.3 disposition (`AM-10a`) | **E-D** for the **absence** of a global polymorphic admission path, the **absence** of any seed member without a defined scope, and the **absence** of any persisted class without a registry row; **E-B** for projection behaviour | actors who cannot modify the verifier | a Tier 1 or Tier 4 record enters the seed and `SCOPE` is undefined for it; **or a class is written that the registry does not name** | **the `JBA15-AUD-01` suite**: `SD-1`…`SD-7`. **The `JBA16-AUD-02` registry suite**: a **schema-to-registry reconciliation** proving that **every persisted table or logical class B writes maps to exactly one §9.3.8.1 row or one §9.3.8.3 subsumption**, and that a class introduced without one is **detected and rejected** — the positive design test `AM-10`/`AM-10a` require |
| **DB-08c** *(new in V1.7)* | **citation-dependency acyclicity** — every reference is classified by **CD-3**, only a **semantic citation** creates an eligibility dependency, and the resulting **`CitationDependencyGraph` MUST be acyclic** (`CD-01`), directed from later construction layers to earlier ones (CD-4, CD-5, BI-44), **with the single named `CD-5a` exception recognized as a permitted forward edge and not rejected as a layer violation** | **E-A where DB-representable** — a citation edge whose endpoints are already persisted has a checkable layer relation, so **write-time rejection is the primary mitigation**; **E-B** otherwise, under **§18.3**; **E-D** for the **absence** of any iterate-until-stable or precedence-based cycle resolution | E-A: role-constrained actors. E-B: actors who cannot modify the verifier | E-A: rejected. E-B: **every cycle member is ineligible and seeds; the joint scope yields no authoritative projection**, typed `CITATION_DEPENDENCY_CYCLE` error naming every member (CD-7, QS-9) | **the `JBA16-AUD-01` suite**: `CDT-1`…`CDT-6` — a **forward or same-layer citation** violating CD-5 is **rejected**; a **two-record and a three-record citation cycle** each **fail every member closed with a typed error naming all members**, and **no member is admitted, dropped or selected**; a **classified provenance reference and a structural endpoint relation do NOT create an eligibility dependency** and do **not** participate in cycle detection; and the read path **terminates** — a **timeout, a recursion-depth error or an oscillating result is a FAILURE of this row** |
| **DB-08d** *(new in V1.7; narrowed in V1.8)* | **disposition-control acyclicity and event operability** — `DISPOSITION_EVENT_EFFECTIVE` consults `DISPOSITION_EVENT_CURRENTLY_QUARANTINED`; **self-target is individually, record-level structurally invalid (DG-2)**; a **proposed** edge that would close an ancestor-target cycle against the currently persisted graph is **rejected at write time as a prospective admission constraint, never as a record-level reclassification of an already-persisted event (DG-3)**; the **`DispositionControlGraph` MUST be acyclic** (`DG-01`, DG-2, DG-3, BI-45) | **E-A** for self-target and for rejecting a proposed ancestor-target write where the existing chain is already persisted; **E-B** for the remainder under **§18.3**; **E-D** for the **absence** of any recency, timestamp or actor-authority tiebreak in the control layer | E-A: role-constrained actors. E-B: actors who cannot modify the verifier | E-A: rejected. E-B: **every cycle member is ineffective and the ultimate scientific targets fail closed**, typed `DISPOSITION_CONTROL_CYCLE` error naming every member (DG-4, DG-5) | **the `JBA16-AUD-04` suite**: `DCG-1`…`DCG-8` — an erroneous authorized quarantine **does** exclude and **does** fail its target closed; validly quarantining it **stops it acting and the target recomputes**; rescinding that **restores its ability to act and NOT its validity**; quarantining the rescission **reactivates the suppression**; **self-target rejected**; a `Q1→Q2→Q1` cycle **fails closed with no winner**; **forged quarantine and forged rescission of a disposition event both fail to act**. Termination must be demonstrated: **a control chain of depth ≥ 3 must evaluate without iteration and without divergence** |
| **DB-09** | legal-deletion authorization gate | **E-A within the §19.3 boundary**; **E-B outside it**; **E-E** for PR-1…PR-4. **§18.3 precondition applies to the E-B branch.** | **See §19.3. Against unrestricted owner/superuser: no technical guarantee** (§19.4) | authorized mutation succeeds; unauthorized fails | both directions tested; a role holding both capabilities must not exist; **and** an authorized purge of **integrity history** behaves per §16.9, §9.5.7.2 and **RV-8/RV-9** |
| **DB-10** | receipt-target and linked-record re-proof | **E-B** · APP + LIVE. **§18.3 precondition applies.** | actors who **cannot modify the verifier** | the read **refuses** a forged receipt or link | a direct-SQL-inserted forged receipt/link is defeated at read time |
| **DB-11** | microsecond timestamp fidelity — **two obligations** | **storage: E-A** (`TIMESTAMPTZ(6)`). **End-to-end fidelity: E-C** — `MODEL A/B NOT THE RIGHT CLASSIFICATION` | storage: role-constrained actors. Fidelity: a correctness property of the driver path | a well-formed but truncated value is written or returned | **end-to-end round trip preserving all six fractional digits.** A column-type assertion is **not** proof |
| **DB-12** | no timestamp or source id as identity; **no identity derived from any key pair**; identities minted by a trusted path — **including `qid`** (DE-1) | **uniqueness: E-A. Provenance and non-derivation: E-E** (ID-1…ID-6) | provenance: capability/privilege boundary | a correctly-shaped value of wrong provenance is accepted unless ID-1…ID-5 hold | collision test; **manifest mapping proven stored, not computed**; **caller-provided and derived member IDs proven rejected**; **and `qid` proven opaque, minted and content-free** |
| **DB-13** | adjudication ordering — **deterministic total replay order** | **E-A** for allocation uniqueness; **APP** for replay | role-constrained actors | duplicate allocation rejected | a sequence supplies **unique allocation order**, **not guaranteed commit order**. **No commit-order semantics are claimed, and §9.3 consults no ordering at all** (DF-2) |
| **DB-14** | capability boundaries on write paths, including the **trusted integrity-repair capability** (IQ-6), the **trusted decomposition capability** (DC-01) and the **sanctioned adjudication capability** (TG-5) | **E-A** for role boundaries; **E-E** for module capability | role/module boundary | an unauthorized module writes, or one role holds both integrity and adjudication capability | AST/ESLint module-capability enforcement (A1 §11/§13, A2 §28) plus PR-1…PR-4; **a deployed role holding both integrity-repair and scientific-adjudication capability must not exist** |
| **DB-15** | projection determinism — the same validated eligible set yields the same projection; materialized projections reproducible from their log | **E-B** · APP. **§18.3 precondition applies.** | actors who **cannot modify the verifier**, the projection logic or the comparison job | a drifted materialized projection must be **detectable** and must **not** be authoritative | property test over §9.3–§9.5, **including the three-axis evaluation, the disposition fold over effective events, the four typed predicates, `CITATION_SOUND` over the acyclic `CitationDependencyGraph`, the typed seed and the scope**; materialized-vs-log equivalence; **and a termination check — two evaluations of the same history must agree, and neither may diverge** (CD-9, DG-8). **Where the adversary controls the comparison job, the check proves nothing** (§19.4) |

**No migration SQL is written in this document.**

---

## 19. Security, adversarial model and threat boundary

### 19.1 What this section replaces

V1.2 stated the threat boundary correctly and then, twice, said the residual guarantee against actors **outside** that boundary is Model B. That is impossible, and it is not repeated here.

### 19.2 The protected verifier / control plane — defined *(closes `JBA12-AUD-11`)*

> The **protected verifier / control plane** is everything a fail-closed guarantee depends on other than the data itself:
>
> - the **executable verification logic** (re-proof routines, graph validation, coherence checks);
> - the **projection logic** (§9.3) and any materialized-vs-log comparison job;
> - the **trigger, constraint and function definitions** enforcing E-A invariants;
> - the **view and privilege model** determining what an authoritative read reads;
> - the **trusted authority sources** the verifier consults (capability maps, role definitions, the accepted authority selector).

> **BI-32.** A fail-closed guarantee protects **only** against an actor who **cannot modify any of the above**. An actor who can, can remove the fail-closed behaviour with the same privilege that corrupts the data — so no guarantee remains, and none is claimed.

### 19.3 Actor classes and what actually exists for each

| Actor | Can modify data? | Can modify the verifier / control plane? | **Guarantee that exists** |
| :-- | :-- | :-- | :-- |
| **Application / runtime role** | within its grants | **No** (PR-1, PR-2, PR-3) | **E-A** where the invariant is DB-representable; **E-B** otherwise. Full matrix applies. |
| **Research operational role** | within its grants | **No** | as above |
| **Ordinary direct-SQL actor constrained to those roles** | yes, within grants | **No** | as above — **this is the actor the matrix is written for** |
| **Data-tampering actor without verifier authority** | yes, possibly broadly | **No** | **E-B holds**: malformed rows may enter, authoritative reads fail closed, quarantine + recovery (§9.5) restores service without deleting evidence |
| **Migration owner** | yes | **Yes** — DDL, triggers, functions, views | **No technical guarantee.** Governance only (PR-5). |
| **Table owner** | yes | **Yes** — may disable triggers, alter constraints | **No technical guarantee.** Governance only (PR-5). |
| **Unrestricted superuser** | yes | **Yes** — everything, including privileges and audit | **No technical guarantee.** Governance only (PR-5). |

### 19.4 The statement that replaces the overclaim

> **Protection against unrestricted administrative compromise is an operational and governance concern, outside this JBA's technical integrity guarantee.**
>
> Where an adversary holds owner, migration-owner or superuser rights, this contract claims **no prevention and no fail-closed residual**. Such an actor can alter data, verifier logic, functions, views, triggers, privileges and the authoritative projection — including any mechanism that would otherwise detect the alteration.
>
> **No independently protected external verifier is invented here.** None is part of the accepted architecture, and inventing one solely to widen the claimed threat model would be an unratified architecture decision with no authority behind it and no deployment behind it.
>
> **PR-5 remains an operational requirement**: migration/owner/superuser credentials sit outside ordinary runtime and require separate governance and audit. This architecture **requires** that control; it does **not** enforce it. If an independently protected verifier or control plane is deployed in future, the guarantees available against these actors may be revisited by amendment (**AM-5**).

### 19.5 Adversarial model

| # | Attack | Required invariant |
| :-- | :-- | :-- |
| **AT-01** | forged caller `participantId` | participant is **never** read from the request; derived structurally and re-proven (§18.5) |
| **AT-02** | forged source authority — claiming an observation is AL-3 | class, level, **scope and authorship domain** are assigned by the **trusted ingestion path**, never request content, and require **DB-03B** provenance (TG-3) |
| **AT-02a** | **forged scope** | scope is a **class-level property assigned by the trusted path**, never per-record and never request-supplied; JD-1 rejects a wrong-scope citation |
| **AT-03** | direct SQL insert of an occasion, cluster, candidate or link | **E-A where DB-representable** — rejected at commit. **E-B otherwise** — the row may enter and the authoritative read **fails closed**, subject to §18.3 |
| **AT-04** | direct-SQL receipt poisoning | receipt resolution re-proves target ownership **and** material match; mismatch fails closed (DB-10) |
| **AT-04a** | **forged `Outcome → SavingEvidence` link** | the link must be **re-provable at read time** (§7.6); the label alone grants nothing (BI-23) |
| **AT-05** | replay with altered material | request-hash comparison; different material under one key ⇒ conflict, never silent alias |
| **AT-06** | same idempotency key, different subject | operation-scoped namespace + subject re-proof; fails closed |
| **AT-07** | same source id, different material | ingestion idempotency detects it; differing material ⇒ typed conflict, never overwrite |
| **AT-08** | source correction racing canonicalization | serialize on the subject; a post-establishment correction marks findings for re-adjudication |
| **AT-09** | retraction racing reconciliation | same serialization; a retraction cannot be lost |
| **AT-10** | concurrent duplicate candidates, including concurrent decomposition | ingestion uniqueness + reload-and-prove converge to one (DC-04, DC-07, CE-7) |
| **AT-11** | concurrent canonicalization of one subject | one occasion results; the loser resolves only after re-proof, else fails closed |
| **AT-12** | microsecond timestamp collision | no invariant depends on timestamp uniqueness; **and §9.3 consults no ordering at all** (DF-2) |
| **AT-13** | stale knowledge used retroactively | adjudications, quarantines **and rescissions** record their knowledge horizon |
| **AT-14** | intent invalidation mutating an occasion | A2 invalidation is **intent history only** (P-04, BI-10) |
| **AT-15** | C2 eligibility leaking backward into B identity | no B artifact may consume an independence/contamination/threshold classification as an individuation or establishment predicate (P-12, BI-04) |
| **AT-16** | legally required deletion blocked by an immutable trigger | the authorized path must succeed with a valid `DeletionAuthorization`; tested both directions |
| **AT-16a** | attacker mints both authorization and mutation | **PR-1…PR-4**. **Against an unrestricted owner/superuser: no guarantee** (§19.4) |
| **AT-17** | telemetry laundering | S-8 is AL-0 and `NON_ADMISSIBLE` (RT-13, BI-19) |
| **AT-18** | weekly-report inflation | S-6 grounds no candidate; JD-1 blocks it from any occurrence basis |
| **AT-18a** | **weekly-report deflation** | an `AGGREGATE_EXPOSURE` shortfall may **not** contradict a specific occasion (FC-09) |
| **AT-19** | success-biased establishment | occurrence establishment consumes **no** C1 verdict, and **no submission is inferred from a status label** (BI-21, BI-23) |
| **AT-19a** | **status-label laundering** | **no bare status label** may ground a candidate or support occurrence, **for every one of the seven statuses** |
| **AT-19b** | **label-driven selection bias** | label-based triage must not enter any evidentiary basis (JS-4(iv)); **review provenance must be recorded** |
| **AT-20** | ambiguity distortion | no `DISTINCT_EVENT_FINDING` without evidence; no occasion from an open cluster; the cluster stays visible with its bounds and type |
| **AT-20a** | **cluster-type confusion** | a **Type B** subject must not be represented as or analysed as a **Type A** cluster (BI-29, FC-08) |
| **AT-21** | contradicted-occurrence leakage | `CONTRADICTED`, `RETRACTED`, `TOMBSTONED` and `PURGED` identities unreachable from the default factual read surface (BI-22) |
| **AT-22** | tombstone re-identification | permitted residue must not permit reconstructing a removed participant identity (§16.6) |
| **AT-22a** | **forbidden-residue reconstruction** | where residue is prohibited, no component may recreate it — including a retained "an integrity event occurred" marker (BI-31, IQ-10) |
| **AT-23** | supersession-graph poisoning | malformed edges rejected (E-A) **or** fail-closed over the **computed scope only** (E-B); cyclic and branching sets rejected at write time where representable (DB-08) |
| **AT-23a** | **quarantine abuse — target kind** | a quarantine naming a **finding on scientific grounds** is **rejected** (IQ-3, IQ-4, BI-30); a quarantine whose named basis is not actually violated is **rejected** (IQ-5) |
| **AT-23b** | **quarantine scope contamination** | a **cross-participant** malformed edge fails **exactly its two named endpoint subjects** and leaves **every other subject of both participants** projecting normally (QS-2, QS-4) |
| **AT-23c** | **quarantine as scientific selection** | **the `JBA13-AUD-01` test, preserved.** A quarantine naming a member of a **cycle** or **branching set** where **no member is individually excludable** must be **rejected** (IQ-9a, IQ-9c). The scope **remains** fail closed. Only independent per-record evidence makes one member eligible (SG10-6) |
| **AT-23d** | **erroneous quarantine of a valid, authorized record** | a quarantine naming a record that is `STRUCTURAL_VALID` and generation-sufficient, **where no other valid disposition covers it**, must be **rejected** or must fail the affected scope closed (§9.3.7 Case I, MQ-4). **The same test must NOT reject** a quarantine of a structurally valid record proven **`UNAUTHORIZED`** (Case F, AT-23h), **nor treat an erroneous member alongside a valid one as a seed** (Case K, MQ-3, DQ-4) |
| **AT-23e** | **identity laundering around a fail-closed scope** | a fail-closed subject must not be re-established under a **new** identity (**IQ-12**, FC-11) |
| **AT-23f** | **inert-disposition confusion** | a quarantine whose target record does not exist, or a rescission whose target `qid` does not exist, must be **inert** — excluding nothing, retracting nothing, seeding nothing (**IQ-11**, RV-2, RV-8) |
| **AT-23g** | **disposition ineffectiveness** | **the `JBA14-AUD-01` regression test.** A **validly quarantined** record MUST **stop seeding**: insert an `SG-R`-invalid edge → scope fails closed → append a **valid** quarantine → **the scope MUST RESUME projecting**, absent another seed member (FS-1, BI-39) |
| **AT-23h** | **legitimate exclusion of a proven-unauthorized valid record** | a **structurally valid** edge `B → A` proven `UNAUTHORIZED` and quarantined on that basis → quarantine **accepted** → edge leaves the eligible set → **`SG-10` recomputed** → if no other eligible edge targets `A`, **`A` becomes live**, and this **MUST NOT be rejected as winner selection** (IQ-9b, BI-40, SG10-3, DQ-1) |
| **AT-23i** | **`UNPROVEN` as a pretext** | a quarantine whose basis is *"provenance could not be established"* must be **rejected** (IQ-9d, VD-2). For a **Tier 2/3** record the scope fails closed (Case G); **no quarantine is accepted**, and the state is **never recorded as forgery** (AX-2, P-13) |
| **AT-23j** | **seed-domain overreach** *(new in V1.6 — the `JBA15-AUD-01` test)* | **`SD-1`.** An **S-2 observation** with `STRUCTURAL_VALID = true`, `GENERATION_AUTHORIZED = UNPROVEN`, `DB-03B` required, **cited by no B2 artifact**, must be: **preserved**; **diagnostic**; **non-grounding**; **emit no candidate**; **support no occurrence**; and — decisively — must create **NO fail-closed subject and NO invented B2 artifact of any kind** (TE-5, FS-6, QS-7, BI-42). **A design in which this observation seeds, or in which a subject is minted for it, FAILS this test.** Verify additionally that **`SCOPE` is never invoked for it** |
| **AT-23k** | **dependency mislocation** *(new in V1.6)* | **`SD-2`.** Where a B2 adjudication or other authoritative projection input **cites** a source observation whose required generation proof is `UNPROVEN`: the **citing record** must fail `CITATION_SOUND` and become non-eligible; the failure must be scoped to **the consuming subject only** (CS-1, DS-1); and there must be **no unrelated participant contamination and no store-wide effect** (QS-2, CS-4). **The observation must still acquire no subject of its own** (CS-2) |
| **AT-23l** | **disposition-fold indeterminacy** *(new in V1.6 — the `JBA15-AUD-02` suite)* | **`DQ-1`…`DQ-6`.** Two quarantines on one record, **rescind one → still quarantined** (DQ-2); rescind the second → the record is reconsidered on its **own** axes and is **not** restored by the rescissions (DQ-3, RV-10); **valid + erroneous coexist → the valid exclusion stands, the erroneous is an anomaly not a seed** (DQ-4, MQ-3); an unmatched rescission is **inert** (RV-2); two rescissions on one `qid` are **idempotent with neither winning** (RV-5, RV-7); duplicate delivery yields **one** semantic disposition (RV-5). **No ordering, recency, timestamp or count decides any of these** (DF-2) |
| **AT-23m** | **forged or unproven disposition event** *(new in V1.6)* | **`DQ-5`/`DQ-6`.** A **forged rescission** must **not** reactivate a quarantined record; a **forged quarantine** must **not** remove a valid scientific input; an **`UNPROVEN`** disposition event of either kind must **not act** and must **not** be treated as `AUTHORIZED` (IQ-13, DE-6, DE-7). Each must be a recorded **integrity anomaly** that **does not fail a subject closed** (AN-1, IQ-14), and each must be **dispositionable on the `UNAUTHORIZED` basis** with the chain terminating at the first admissible event (DE-8, DS-5) |
| **AT-24** | **B1 reconciliation smuggling** | two observations from different lineages describing a plausibly identical purchase produce **two** candidates, never one (AU-3, CE-5, BI-24) |
| **AT-24a** | **assertion-unity smuggling** | two separately addressable assertions with a source relation → **two candidates**; two receipts on one assertion → **one candidate**; *"I tried twice"* → **one candidate** |
| **AT-24b** | **emission tampering** | a caller-supplied member count **rejected or ignored** (DB-04a); addressable **non-grounding** → **zero** candidates (CE-2); unestablished binding → **zero** with a **recorded non-grounding marker** (CE-3) |
| **AT-25** | **joint-sufficiency circularity** | an `OCCURRENCE_ESTABLISHED` citing a combination must be **rejected** where any gate fails (JD-1…JD-4) and where JS-1…JS-6 are not recorded (FC-07) |
| **AT-25a** | **prose-as-gate** | **no recorded basis may satisfy a gate** (FC-07, FC-10) |
| **AT-26** | **participant self-corroboration** | a combination whose every occurrence-supporting fact lies within one participant's authorship domain is **insufficient** (JD-4, FC-10, BI-33); participant assertion **+ independent S-5** → may satisfy; **single S-5** → may satisfy alone (P-15) |
| **AT-27** | **coherent direct-SQL forgery of authorship** | a row with a structurally perfect chain but written outside the authorized capability path must **not** be usable as authoritative evidence — **per class** (BI-37, §18.4.2) |
| **AT-27a** | **`S2-FORGE-1`** | a coherent forged `Outcome` with **no** M7 trusted-generation provenance: **`DB-03A` may pass**, **`DB-03B` must fail or remain unproven**, **S-2 non-grounding**, **no candidate**, **no occurrence-supporting evidence** — **and, per AT-23j, no fail-closed subject** |
| **AT-27b** | **`S2-FORGE-2`** | the same row **with** accepted provenance: `DB-03B` passes → **the frozen status rule applies unchanged**; a bare label still grants nothing (BI-23, §7.4) |
| **AT-28** | **admission-default exploitation** | a malformed record that **no one has quarantined** must **not** be eligible or used: it must **not** retire its target (SG-10), and its §9.5.5 scope must **fail closed** |
| **AT-29** | **trusted-parent inheritance** | no record may be treated as generation-authorized **because a record it references is** (**BI-38**); an S-2 referencing a protected A2 `Decision` is **still non-grounding**; an S-4 traversing that `Outcome` inherits **nothing** |
| **AT-30** | **`SG-R` under-determination** *(new in V1.6 — the `JBA15-AUD-03` check)* | An `SG-R` determination **must** inspect the endpoints the record names where the invariant requires it — `SG-03` compares subjects, `SG-04` participants, `SG-05` kinds, `SG-06` resolves the target. **A verifier that refuses to read endpoints cannot decide SG-03…SG-06 at all.** Test: a cross-subject edge must be **detected**, which is only possible by comparing its endpoints' subjects. Simultaneously verify the **independence that does bind**: the determination must **not** consult which finding or projection would survive the exclusion (IQ-9a, AX-5, RS-1) |
| **AT-31** | **citation-cycle exploitation** *(new in V1.7 — the `JBA16-AUD-01` suite)* | **`CDT-1`…`CDT-6`.** (i) A citation edge violating the CD-5 layer rule — forward, or same-layer outside the permitted `L2`→`L2` case — must be **rejected** where representable (DB-08c). (ii) A **two-record** citation cycle and a **three-record** citation cycle must each make **every member ineligible**, make **every member a seed**, and fail the **joint** scope closed with a typed `CITATION_DEPENDENCY_CYCLE` error **naming every member** (CD-7, QS-9). **A design that admits any member, drops any member, iterates to a fixed point, or resolves by recency, ordering, count or actor authority FAILS this test** (CD-8, P-14). (iii) A **preserved provenance reference** (CD-3 rows 15–24) and a **structural endpoint relation** (rows 11–14) arranged in a loop must **NOT** be detected as a citation cycle and must **NOT** affect eligibility (CD-2, CS-7). (iv) The read path must **terminate**: a timeout, a stack-depth failure or a result that differs between two evaluations of the same history is a **failure**, not a degraded pass (CD-9) |
| **AT-32** | **disposition-of-disposition exploitation** *(new in V1.7 — the `JBA16-AUD-04` suite)* | **`DCG-1`…`DCG-8`.** (i) An **erroneous but AUTHORIZED** quarantine of a valid record **does** exclude it and **does** fail its scope closed — a design in which it is silently ignored FAILS (`DCG-1`). (ii) Validly quarantining that quarantine on the **`CONTROL_BASIS_FALSE`** basis must make it **stop acting**, and the underlying record must be **recomputed and resume** — **a design in which quarantining a quarantine changes nothing FAILS, and this is the exact V1.6 defect** (`DCG-2`, DE-10). (iii) Rescinding that suppression must return the erroneous event to acting **under its own false basis**, so the record fails closed again — **rescission must NOT be implementable as making the suppressed event valid** (`DCG-3`, DE-11). (iv) Quarantining the **rescission** must reactivate the suppression (`DCG-4`). (v) A **self-targeting** disposition event must be **rejected as structurally invalid** (`DCG-5`, DG-2). (vi) A `Q1→Q2→Q1` **control cycle** must make **both ineffective**, fail the **ultimate scientific targets' joint scope closed** with a typed `DISPOSITION_CONTROL_CYCLE` error, and **select no winner by recency, timestamp, actor authority or count** (`DCG-6`, DG-4, DG-5). (vii) A **forged or `UNPROVEN` quarantine of a disposition event** must not suppress it (`DCG-7`); a **forged or `UNPROVEN` rescission** must not restore anything (`DCG-8`). (viii) A control chain of **depth ≥ 3** must evaluate **without iteration and without divergence** (DG-8) |
| **AT-23n** | **quarantine-cardinality collapse** *(new in V1.7 — the `JBA16-AUD-03` test)* | Two **distinct, independently valid** quarantines on one record must be **both active simultaneously** — a unique constraint, a `0..1` column, a "replace the existing quarantine" write path, or any representation that can hold only one **FAILS** (§23.1, MQ-2, DB-08a). Rescinding **one** must leave the **other active** and the record still excluded (MQ-5, DQ-2). **No count may carry semantic authority**: two active quarantines are not "more excluded" than one, and one is not overridden by two. **Exact replay of the same logical quarantine command must remain idempotent and must NOT mint a second `qid`** (§17.2, RV-5, DB-06) |
| **AT-33** | **unregistered-class smuggling** *(new in V1.7 — the `JBA16-AUD-02` test)* | A persisted class that **B writes** and that has **no §9.3.8.1 registry row and no §9.3.8.3 subsumption** must be **detected**. The reconciliation must be a **positive, executable check** of the schema against the registry (DB-08b), not a review artifact. **`AM-10` must NOT be satisfiable by a class this document already names** (`AM-10a`), and a **reference role absent from CD-3** must likewise be detected and rejected (`AM-10b`). Specifically verify that **source-native relation records, decomposition-ambiguity records, non-grounding emission markers, structural-admission records, affected-scope records, integrity-error/anomaly records and deletion-residue artifacts** each resolve to their registry rows and that **none of them can seed** (FS-9, QS-8) |
| **AT-34** | **seed self-amplification** *(new in V1.7)* | Recording a fail-closed scope must **not** create a new seed member. Write an **affected-scope record**, a **structural-admission record** and an **integrity-error record** describing an existing fail-closed subject, then recompute: the scope must be **byte-for-byte the same set**, and no additional subject may fail closed (FS-9, QS-8, CD-3 row 20). **A design in which the record of a failure is itself an input to the failure computation FAILS** |

---

## 20. B2 establishment → C1 verification ordering — closes **O-13** (JA-05)

**Frozen semantic ordering:**

1. A canonical `PurchaseOccasion` MUST exist **before, or atomically with,** the creation of any C1 object whose contract requires a `purchaseOccasionId`.
2. **C1 verification MUST NOT be the event that creates the `PurchaseOccasion`.**
3. **B2 occurrence establishment MUST NOT depend on success evidence from C1** (BI-21).

**Why — the failure prevented.** If an occasion existed only once a saving was verified, every occasion in the dataset would be a verified-saving occasion; the denominator would consist entirely of successes and RIVSR — whose numerator is verified savings — would be structurally near 1 regardless of the truth.

**The precise line — object vs verdict:**

| | Admissible to B | Not admissible to B as occurrence authority |
| :-- | :-- | :-- |
| Evidence | the **fact of submission**, **where a linked, re-provable `SavingEvidence`/submission record actually exists** | *that evidence was **verified*** |
| Label | a status label as **provenance metadata** only | **any status label as proof that a submission or a purchase occurred** (BI-23) |
| Amount | the participant's/evidence's **asserted** amount, as an assertion | the **verified** saving amount |
| Ladder | that a VS-ladder record exists and what the participant asserted | the **VS3/VS4 conclusion** |
| Failure | — | **verification failure**, in either direction |
| **Selection** | that a subject entered review, recorded as **review provenance** (§7.5) | **review selection itself as evidence**, or a verdict-correlated queue treated as neutral (JS-4(iv), AT-19b) |

**Symmetry.** B may establish an occasion whose verification later **fails** — a purchase that produced no saving is still a purchase and belongs in the denominator. Equally, B must **not** read a verification failure as evidence the purchase did not occur. A failed verification means only *the assertion remains unverified*.

**Reconciled apparent contradiction.** RT-10 places `VerifiedValue` — carrying `purchaseOccasionId` — at the **M7** gate while RT-11 introduces `PurchaseOccasion` at **M10/M11.5**. Milestone numbering is a **delivery schedule**; the accepted phase spine `A1 → A2 → B1 → B2 → C1 → C2` is the **semantic** order, and O-13 exists to freeze it. A C1/M7 artifact carrying `purchaseOccasionId` cannot be **finalized** before B2 establishes that occasion. C1S may restate this ordering; it may not be the first artifact to define it (JA-05).

**Stale and unresolvable references.** A C1 object may reference only an occasion whose projection was `ACTIVE` at reference time. If that occasion later becomes `CONTRADICTED`, `RETRACTED`, `TOMBSTONED` or `PURGED`, the C1 reference is **not** silently rewritten. Where a full purge leaves the reference **unresolvable and unmarked** (§16.7, RI-4), that too is a lawful outcome. The C1 artifact's validity becomes a C1/C2 question; B does not resolve it, does not fabricate a target (RI-3), and does not delete the identity to tidy it away (P-05 purpose limitation, §16.3).

---

## 21. B1 → B2 contract — closes **O-06b-ARCH** (part of JA-06)

Semantic only. No B1 columns, tables, DTOs or serialization are designed here; representation is `O-06b-SPEC`, owned by B1S. **The two MUST NOT be recombined.**

| Contract item | **B1 guarantees** | **B2 may assume** | **B2 must not assume** |
| :-- | :-- | :-- | :-- |
| **Candidate identity** | a stable, **server-minted opaque** identifier surviving correction and retraction, bound to **one individually addressable source assertion** | a candidate id is a durable join target for exactly one source assertion | that the id encodes anything; that it is derived from a key pair (§11.2); that it implies an occasion exists |
| **Candidate scope** | **one individually addressable purchase-shaped assertion** (AU-1); multiple observations only as revisions, corrections, retractions or attachments **of that same assertion** (AU-2) | any grouping it sees is **source-native and unity-bearing**, not B1-inferred | **that B1 grouped anything across assertions, sources or lineages** (BI-24, BI-28) |
| **Candidate emission** *(new in V1.4)* | emission is a **total, deterministic function** of the source representation and the accepted taxonomy: **exactly one** candidate per addressable, purchase-shaped, candidate-grounding assertion; **zero** for any assertion failing E-1, E-2 or E-3 (§8.2.6, CE-1…CE-7, BI-36) | **the candidate count is meaningful**: it reflects the source's own addressable assertions that were grounding, and nothing else | **that B1 exercised discretion over whether to emit**; that the count was influenced by a caller (DB-04a); that addressability alone implied a candidate |
| **Non-grounding observations** *(new in V1.4)* | an addressable purchase-shaped assertion whose **participant binding is not established** (`DB-03A` or `DB-03B` failing) is preserved and **explicitly marked non-grounding**, with the deficiency recorded — **never silently dropped and never quietly grounding** (CE-3, §18.4.5) | absence of a candidate is **visible and explained**, not a gap | that a missing candidate means the source said nothing |
| **Source-native relations** | every relation and reference the source supplied, **preserved verbatim, `0..N`, merging nothing and changing no count** (AU-3, CE-5) | it can see exactly what relations the source recorded | **that a preserved relation is an equivalence, a plurality claim, or a B1 judgement** |
| **Decomposition ambiguity** | where a payload is composite but the source defines no assertion boundaries, a **typed decomposition-ambiguity fact** and **one** container observation with **zero member candidates** (AU-5, CE-6, DC-02a) | ambiguity it sees is real, and no members were invented | that member count was determinable; that attachment or receipt count is an assertion count |
| **Source-asserted plurality** | a plurality claim in an assertion's content (*"I tried twice"*) preserved as a **typed claim on one candidate** (AU-6) | it can read what the source claimed about how many | that B1 acted on the claim; that the claim is established |
| **Participant** | a binding derived structurally and re-provable, satisfying **both** `DB-03A` relational coherence **and** `DB-03B` trusted-generation provenance — or the candidate is not emitted and the observation is marked non-grounding (§18.4) | the participant on a grounding candidate is relationally provable **and** its assertion was produced by the authorized capability path | that a participant may be re-derived from a caller-supplied field; **that relational coherence alone establishes authorship** (BI-37) |
| **Authorship provenance** | who **authored** the factual content, distinguished from who owned, transported, collected, reported or transcribed it, together with the **authorship domain** (§6.4.1) — **UNKNOWN preserved as UNKNOWN** (§6.5) | it can tell participant-authored content from an independent researcher finding, **and can evaluate JD-4** | **that a research collection path implies researcher authorship** (BI-25); that a coherent row evidences its claimed author (BI-37) |
| **Trusted-generation evidence** *(new in V1.4)* | the independently protected provenance on which `DB-03B` relies, preserved and re-checkable per observation (TG-1…TG-4) | it can distinguish a trusted-path assertion from a structurally coherent forgery | **that re-reading the relations proves generation** (§18.4.2) |
| **Merchant evidence** | every observation's asserted merchant preserved verbatim **with its source**, including disagreements and absences | it can see every merchant assertion and who made it | that B1 selected, ranked or resolved a merchant; **that merchant absence bears on occurrence** |
| **Event time** | source-asserted event times at full precision, **including coarseness/interval and UNKNOWN** | it can distinguish an exact instant from "some time on Tuesday" from "unknown" | that an event time exists; that a coarse time may be treated as an instant |
| **Knowledge time** | trusted server knowledge time on every observation, never source-supplied | it can reconstruct what was known at any past instant | that knowledge time equals event time |
| **Source provenance** | source class, source-system identity, ingestion path, **class-level authority, semantic scope and authorship domain** per observation | provenance is complete and attributable, and **scope and domain are present on every fact** | that provenance implies scientific independence; that a source id may serve as identity |
| **Source authority and scope** | the §6.4 class-level **pair** `(level, scope)` plus the **domain**, assigned by the trusted ingestion path under **DB-03B** | authority, scope and domain were never request-supplied; **no participant-authored source exceeds AL-1** | that an authority level licenses automatic creation; that it is a rankable score (P-14); **that a level in one scope substitutes for another scope** (BI-26); **that artifact count substitutes for authorship** (BI-33) |
| **Status labels** | preserved **verbatim as provenance metadata**, with **no real-world semantics attached by B1** | it sees exactly what the source recorded | **that any bare label evidences a real-world event — for any of the seven statuses** (BI-23, §7.4) |
| **Implied domain objects** | where a status implies an underlying object, B1 records **whether that object independently exists and is linked**, and preserves the link for re-proof | it can tell *"a linked `SavingEvidence` exists"* from *"only a label exists"* | **that a label evidences the object's existence** (BI-23, §7.6) |
| **Explicit payload assertions** | any explicit purchase-shaped assertion actually present in an authoritative source representation, preserved **unembellished and un-narrowed** | exactly what the object contains | **any multiplicity inferred in either direction** — neither "several purchases" nor "at most one" from RT-09 entity cardinality (§7.2) |
| **Verification components** | preserved as **provenance metadata explicitly flagged non-authority** | it can see that verification occurred and what it concluded, for audit | **that it may cite a verification verdict as occurrence evidence** (BI-21) |
| **Intent / Decision / Outcome linkage** | every A2-lineage linkage fact preserved for each observation | it can walk the full A2 lineage of every contributing observation | **that B1 merged lineages**; that linkage implies 1:1 anything (BI-06); that A2 invalidation lineage implies occasion lineage (BI-10) |
| **Source corrections** | every correction as a **new** observation explicitly naming what it supersedes; the original never overwritten | it can read both with their knowledge times | that the newest version is automatically correct (P-14) |
| **Retractions** | appended; the retracted assertion remains readable **under ordinary and scientific operation, where legal retention permits** (BI-31) | it can distinguish "withdrawn" from "never asserted" | that a retraction deletes or resolves anything by itself |
| **Ambiguity** | every unresolved or contradictory state preserved explicitly, never collapsed or defaulted | ambiguity it sees is real ambiguity | that B1 resolved any ambiguity |
| **Distinctness evidence** | all correlation facts bearing on one-vs-several: source-system references, tender/attempt references, basket/signature content, sequence/retry markers, explicit assertions of sameness or difference, and all **source-provided relation markers** verbatim | it has everything B1 saw that bears on individuation | **that B1 applied any individuation rule** — B1 hard-codes none (R-B-11, BI-24) |
| **Decomposition** | the **decomposition operation identity and immutable manifest**, storing `(operation, member discriminator) → minted candidate id` for **explicitly enumerated individually addressable** assertions (DC-01…DC-07) | the member set is stable and reproducible by **replaying the stored mapping** | that membership may be recomputed from a formula; that members reflect a B1-inferred grouping |
| **Idempotency** | duplicate delivery yields exactly one observation and **the same candidate set replayed**, never a second set (CE-7); concurrent equivalents converge | observation and candidate multiplicity reflect real source multiplicity, not transport retries | that observation count equals real-world purchase count |
| **Legal deletion state** | any redaction/tombstone/crypto-erasure/purge visible as **typed missingness where residue is legally permitted**, with the authorization referenced where permitted; **and ordinary absence where residue is prohibited** (BI-31) | where a typed marker is present, it means what it says | **that absence always means "never present"**, or that a deletion can always be distinguished from a never-existing record (§16.6) |
| **Integrity-history state** *(new in V1.4)* | quarantine, rescission, basis, actor and affected-scope records preserved **where legal retention permits**, and **ordinary absence where residue is prohibited** (IQ-10, §16.9) | where integrity history is present, it is complete and attributable for the events it covers | **that the absence of integrity history means no integrity event occurred**; that integrity history is immune from the deletion override |
| **Raw source material** | retained as needed for later adjudication, subject to §16 and Phase 0A data-minimization | it can re-read what a source actually said | that raw material is retained beyond its lawful retention period |

> **The negative guarantee.** **B1 MUST NOT discard** any of the above because it looks redundant, because a summary exists, or because a later source seems more authoritative. What B1 discards, B2 cannot reconstruct.
>
> **The complementary negative guarantee.** **B1 MUST NOT add** interpretation either — no inferred grouping, no inferred multiplicity, no inferred authorship, no inferred scope, no discretionary emission, and no real-world meaning attached to an undefined label. B2 must receive what the sources said, neither less nor more.

---
## 22. B2 → C firewall

**B2's factual outputs:** resolved canonical occasions (with occurrence projection), **Type A** unresolved-plurality clusters with their ambiguity type and factual bounds, **Type B** occurrence-unresolved subjects, exposure facts, merchant projections, provenance and authorship states, adjudication and integrity history, typed missingness where residue is permitted.

### 22.1 The consumption matrix

| B2 output / fact | **C may consume** | **C may classify** | **C must never rewrite** |
| :-- | :-- | :-- | :-- |
| **canonical occasion id** | yes — a stable join target | no | the id; **a count B2 resolved** (P-12a) |
| **occurrence projection** | yes — and **must** read it, not row existence (BI-22) | whether an `ACTIVE` occasion is analysis-eligible | the projection; **and must never count a `CONTRADICTED`/`RETRACTED`/`TOMBSTONED`/`PURGED` identity as an occurrence** |
| **Type A cluster** | yes — members, **ambiguity type**, factual bounds `[L,U]`, adjudication basis | **sensitivity and bounds treatment, subject to §22.3 and §22.4** | the cluster's factual bounds or ambiguity type; the fact that plurality is unresolved. **No write-back as a B2 resolution.** |
| **Type B subject** | yes — that occurrence is unresolved | how unresolved occurrence is treated — **an open C2 question** | **must not treat it as a Type A cluster** (BI-29); must not infer any count from it |
| **participant** | yes | eligibility of the participant | the participant of an occasion or cluster |
| **merchant projection** | yes — including `UNRESOLVED`, `CONTESTED`, `REDACTED` | corpus coverage; the economic threshold; whether an occasion with an unresolved merchant may enter a merchant-dependent analysis (§13.7) | the adjudicated merchant or its status; **and must never read `UNRESOLVED` as "not a corpus merchant"** |
| **source provenance, scope and authorship** | yes — all links, stances, scopes, class authorities, authorship states | entry-source independence (Rev 2 §6.B); contamination (RT-12) | the links, stances, scopes, authorities or authorship states |
| **status labels and verification metadata** | yes, as **audit provenance** | anything C1/C2 owns about verification | **must not be re-fed to B as occurrence authority** (BI-21, BI-23) |
| **review provenance** (§7.5) | yes — and **should**, to assess selection bias | whether label-correlated review selection affects an analysis | the record |
| **ambiguity / adjudication state** | yes — `UNRESOLVED`, `CONTESTED`, cluster state | how ambiguity is treated in primary vs sensitivity analysis, subject to §22.3 | the adjudication log |
| **integrity / quarantine history** | yes — as **data-quality provenance** | how a quarantined period affects data-quality reporting | the integrity log; **and must never treat a quarantine as a scientific finding** (BI-30) |
| **factual exposure** | yes | opportunity density; the ≥3-opportunity denominator; missing-report treatment | the reconciled exposure facts; **missingness stays MISSING, never zero** (Rev 2 §6.D) |
| **aggregate inconsistency observations** | yes — as data-quality provenance | data-quality reporting | **must never read one as evidence that a specific purchase did or did not occur** (FC-09, §6.6.2) |
| **actual transaction timing** | yes — including coarseness and UNKNOWN | analysis windows; partial-week handling; initiation timing | the recorded times or their precision |
| **`PROVENANCE_UNKNOWN`** | yes | how UNKNOWN is treated (O-09) | **UNKNOWN must never be converted to FALSE** (P-13) |
| **distinctness** | yes — the finding and its basis | scientific *independence* of established occasions (O-C-INDEPENDENCE) | **real-world distinctness**; a resolved occasion count (BI-04, P-12a) |
| **typed missingness / tombstones** | yes — as classification only, **where residue exists** | conservative handling of missingness **without relying on it being distinguishable** (C2-4a) | the residue; **and must never attempt re-identification or residue reconstruction** (AT-22, AT-22a) |
| **B1 candidates** | **NO — never exposed to C2 as analysis units** (BI-03) | — | — |

### 22.2 The B2 side: no factual count for unresolved plurality

B2 asserts **no canonical count** for a Type A cluster — that is what "unresolved" means, and §9.7.1 forbids B2 from asserting one. B2 states only what evidence establishes: that at least `L ≥ 1` purchases occurred among the members, and an upper bound where evidence supports one.

For a **Type B** subject, B2 asserts neither a count nor an occurrence.

### 22.3 The C2 side: the inherited rule, at its own scope *(closes `JBA12-AUD-06`)*

Rev 2 §6.A fixes a primary treatment. It fixes it for a **specific class**:

> *"when **two records plausibly represent the same real transaction and distinctness cannot be established**, they count as **one** `PurchaseOccasion` for **primary RIVSR**. **Ambiguity MUST NOT increase the numerator.**"*

Two things in that sentence bound the rule, and V1.2 preserved neither:

1. **Its class** — *plausible duplicates whose distinctness cannot be established*. That is `PLAUSIBLE_DUPLICATE_AMBIGUITY` (§9.7.3), and nothing else.
2. **Its analysis** — *primary RIVSR*. Not every primary analysis, and not sensitivity.

| Ambiguity type | **C2 primary RIVSR treatment** | Basis |
| :-- | :-- | :-- |
| **`PLAUSIBLE_DUPLICATE_AMBIGUITY`** | **ONE analytical unit**, where the cluster otherwise satisfies the relevant analysis eligibility criteria. **Zero** may result **only** from a separate eligibility or exclusion rule — never from the plurality treatment itself. **N is NOT permitted as a primary plurality treatment** (*ambiguity must not increase the numerator*). | **Inherited** — Rev 2 §6.A verbatim. This contract **states** it; it does not author it. |
| **`ESTABLISHED_MULTIPLICITY_AMBIGUITY`** (e.g. `[2,3]`) | **NOT STATED HERE.** No inherited authority fixes a primary treatment for this class, and this contract invents none. **C2 remains responsible** (obligation **C2-1a**). | — |
| **`OPEN_UPPER_AMBIGUITY`** | **NOT STATED HERE.** C2 remains responsible. | — |
| **`MIXED_AMBIGUITY`** | **NOT STATED HERE.** C2 remains responsible. | — |
| **Type B — occurrence unresolved** | **NOT STATED HERE**, and **no count-one conclusion follows from the state's existence** (BI-29). C2 remains responsible. | — |

> **Why this narrowing is required, not optional.** Applying *"count as one"* to `ESTABLISHED_MULTIPLICITY_AMBIGUITY` would make C2's primary analysis **contradict a B2 factual finding**: B2 established that at least two real purchases occurred, and the analysis would count one. C2 must not contradict B2's factual output (BI-04, P-12a). The V1.2 generalisation therefore did not merely over-reach — it produced a rule that could not be applied without breaching the firewall in the other direction.

### 22.4 The bounds constraint — the only sensitivity rule stated here

| # | Constraint | Basis |
| :-- | :-- | :-- |
| **SB-1** | Any C2 plurality **sensitivity or bounds** scenario for a Type A cluster **MUST lie within the B2 factual bounds `[L, U]`**. Where `U` is UNKNOWN, only the lower bound constrains. | **STRICT CONSEQUENCE** of BI-04 and P-12a: a scenario outside `[L,U]` contradicts an established B2 fact. |
| **SB-2** | A cluster with `L = 1` may permit plurality scenarios **≥ 1**. | SB-1 |
| **SB-3** | A cluster with `L = 2` **cannot** have a plurality sensitivity of **0 or 1**. | SB-1 |
| **SB-4** | **Zero may arise only from a separate eligibility or exclusion decision, never as a factual plurality scenario.** | SB-1 plus the separation below |
| **SB-5** | **Analysis eligibility and plurality uncertainty are separate questions and MUST NOT be merged.** A cluster may be excluded from an analysis for eligibility reasons at any bounds; that exclusion is not a plurality treatment, and a plurality treatment is not an eligibility decision. | BI-05 — eligibility is C2's, and this contract decides none of it |

> **Nothing else about C2 sensitivity is stated.** SB-1…SB-5 constrain sensitivity only by forbidding it to contradict B2 facts and by keeping eligibility distinct. **The sensitivity design itself, the eligibility rules, and the treatment of every ambiguity type other than the inherited one remain open C2 questions** (Part P.4).

### 22.5 Both directions of protection

- **Upward (into B2):** a C2 primary analytical count of one **does not become a B2 factual count**. There is **no write-back**. B2's record still says plurality is unresolved with bounds `[L,U]`; C2's analysis says one unit was counted for primary RIVSR. Those are different statements about different things (P-12, P-12a, AT-15).
- **Downward (into C2):** where B2 **did** resolve a count — `SAME_EVENT_FINDING` (1) or `DISTINCT_EVENT_FINDING` (N) — C2 must accept it and may never revise it (P-12a). And where B2 established **bounds**, C2 may not model outside them (SB-1).

**What C2 still owns and this contract does not touch:** the eligibility and exclusion rules that could produce zero; the sensitivity design; the treatment of every non-duplicate ambiguity type; scientific independence; UNKNOWN treatment; the denominator; the economic threshold; analysis windows; and conservative handling of missingness including the indistinguishable case (C2-4a).

---
## 23. Cardinality matrix — closes **O-03** (JA-03) with §23.2

Read as *left ↔ right*. Rows changed in V1.4 are marked. Conditional notation is used where authority does not fix a number.

### 23.0 Reference preservation and emission determinism

| # | Rule |
| :-- | :-- |
| **RP-1** | A candidate binds **exactly one** individually addressable source assertion (AU-1). This is not conditional and has no exception. |
| **RP-2** | That **one** assertion may itself **reference** any number of A2-lineage entities — intents, decisions, `Outcome`s — and every such reference is **preserved verbatim, `0..N`**. Preservation is reading; it merges nothing and **changes no count**. |
| **RP-3** | **Multiple references on one candidate MUST NOT be read as equivalence** between the referenced entities, as a plurality claim, or as a B1 grouping. Whether two referenced lineages describe one real purchase is a **B2** question (BI-24, BI-28, AU-3). |
| **RP-4** *(new)* | **Every cardinality below that involves a candidate is a determined value, not a permitted range for B1 to choose within.** Where a row reads `0..N`, the actual N for any given input is fixed by §8.2.6's emission function (CE-1…CE-7, BI-36). The notation describes what the model admits **across** inputs; it never licenses discretion **for** an input. |

### 23.1 The matrix

| Pair | Left → Right | Right → Left | Why |
| :-- | :-- | :-- | :-- |
| **Participant ↔ Candidate** | `0..N` | `1` | a candidate without an established participant binding is never emitted (CE-3, §18.4) |
| **SourceObservation ↔ Candidate** | `0..N`, **determined by §8.2.6 over the assertions the source addresses** *(changed)* | `1..N`, **restricted to revisions, corrections, retractions and attachments of the same individually addressable assertion** | AU-2, AU-4, CE-1…CE-7, DC-02, BI-28, BI-36 |
| **Individually addressable candidate-grounding assertion ↔ Candidate** *(changed)* | **exactly `1`** | **exactly `1`** | **AU-1 + CE-1 — the defining relation of the candidate layer, and now a total function** |
| **Individually addressable *non-grounding* assertion ↔ Candidate** *(new)* | **exactly `0`** | n/a | **CE-2** — addressability alone never implies a candidate |
| **Intent ↔ Candidate** | `0..N` | **`0..N` as preserved references made by the ONE bound assertion; equivalence never** | RP-2, RP-3 |
| **Decision ↔ Candidate** | `0..N` | **`0..N` as preserved references; equivalence never** | RP-2, RP-3 |
| **Outcome ↔ Candidate** | **`SEMANTICALLY UNBOUNDED BY RT-09; B MUST NOT INFER MULTIPLICITY WITHOUT EXPLICIT PAYLOAD EVIDENCE`** | **`0..N` as preserved references; equivalence never** | RT-09 bounds **entities**, not payloads (§7.2); RP-2, RP-3 |
| **Source-native relation ↔ Candidate** | `0..N` | `0..N` | **preserved provenance only — merges nothing and changes no count** (AU-3, RP-3, CE-5) |
| **Candidate ↔ PurchaseOccasion** | `0..N` | `0..N` | a candidate may support zero (never established, or in an open cluster), one, or several (resolved split); an occasion may be reconciled from several candidates — **B2 equivalence, not B1 grouping** |
| **Candidate ↔ Type A cluster** | `0..N` | `1..N` | a candidate may sit in a cluster while ambiguity stands |
| **Type A cluster ↔ PurchaseOccasion** | **`0..N`, and exactly `0` while the cluster is OPEN** | `0..1` | an open cluster licenses no occasion; on closure it licenses N (FC-02, FC-03) |
| **Type B subject ↔ PurchaseOccasion** | **`0` — always, while occurrence is unresolved** | n/a | BI-29; a Type B state licenses nothing |
| **Intent ↔ PurchaseOccasion** | `0..N` | `0..N` | BI-06. `UNIQUE(originIntentId)` **forbidden** |
| **Decision ↔ PurchaseOccasion** | `0..N` | `0..N` | RT-11: two Decisions from one actual transaction are not two occasions |
| **Outcome ↔ PurchaseOccasion** | **`SEMANTICALLY UNBOUNDED BY RT-09; B MUST NOT INFER MULTIPLICITY WITHOUT EXPLICIT PAYLOAD EVIDENCE`** | `0..N` | the `0..N` right-to-left direction is **inherited and unaffected** — RT-11 states it expressly |
| **SourceObservation ↔ PurchaseOccasion** | `0..N` | `0..N` | zero links reachable after legal redaction; many is the normal corroborated case |
| **Participant ↔ PurchaseOccasion** | `0..N` | **`1` while `ACTIVE`; `0..1` for a privacy tombstone; `n/a` when purged** | BI-09 binds active occasions (§16.6) |
| **Merchant ↔ PurchaseOccasion** | `0..N` | `0..1` | at most one **resolved** merchant; merchant is a projection with status, not an existence condition (§13) |
| **ExposureFact ↔ PurchaseOccasion** | **`0` — an exposure fact never links to a specific occasion as evidence** | **`0`** | BI-26, §6.6. An `AGGREGATE_INCONSISTENCY_OBSERVATION` attaches to the **subject**, not as an evidentiary link |
| **Quarantine ↔ target record** *(changed in V1.7 — `JBA16-AUD-03`)* | **`0..N` active quarantines per target record**, each with its **own opaque `qid`** | **`1`** — a quarantine names **exactly one** target | **The set-valued fold of §9.3.3.3 is authoritative and §23.1 is aligned to it.** V1.6 read `0..1` here while its own fold was set-valued; **that contradiction is removed, and the `0..1` reading is withdrawn.** IQ-1, IQ-7, DE-1, MQ-2, MQ-5. **A quarantine naming a record that no longer exists is inert** (IQ-11) |
| **Rescission ↔ quarantine** *(new in V1.7)* | **`0..N`** admissible rescissions may name the same `qid`; the effect is **idempotent** and **neither wins** | **exactly `1`** — a rescission names **exactly one `qid` by explicit reference**; naming zero or more than one is **structurally invalid** | DE-2, RV-1, RV-5, RV-7. **A rescission targets a quarantine, never *"the quarantine state of record r"*** |
| **Quarantine ↔ disposition event** *(new in V1.7)* | **`0..N`** — a disposition event is itself a valid quarantine target | **`1`** | DE-8, DE-10, IQ-15, `DG-01`. **An event with `≥1` active quarantine is not `EFFECTIVE` and does not act** (`DCG-2`). Self-target is individually structurally invalid (DG-2); a proposed ancestor-target edge is rejected only at write time, prospectively (DG-3) |
| **Quarantine ↔ set-level violation** | **`0` — always** | n/a | **IQ-9, SG-S-2.** A set-level violation has **no** quarantine remedy; naming a member would be scientific selection. **The same holds for a `CITATION_DEPENDENCY_CYCLE` and a `DISPOSITION_CONTROL_CYCLE`** (IQ-17, IQ-18) |
| **Malformed record ↔ fail-closed subject** | **`1..N`, computed by the §9.5.5 fixpoint** | `0..N` | **QS-1…QS-9.** For an edge, the seed is its **explicitly named endpoint subjects**; **shared participant identity is not a dependency** (QS-2). **A Tier 1 or Tier 4 record is never a seed member**, so this row does not range over them (QS-7, QS-8, FS-9) |
| **Semantic citation ↔ cited record** *(new in V1.7)* | **`0..N`** — a record may cite many referents | **`0..N`** — a referent may be cited by many records | **CD-3 rows 1–10**, and **only** those. The resulting `CitationDependencyGraph` **MUST be acyclic** (`CD-01`), directed to strictly earlier construction layers with the single `L2`→`L2` exception, plus the single named `L2 → L5` exception `CD-5a` (CD-4, CD-5, CD-5a). **A preserved provenance reference and a structural endpoint relation are not citations and are not counted here** (CD-2) |

**Reading the conditional entries.** `SEMANTICALLY UNBOUNDED BY RT-09` means: **inherited authority does not fix this number, and B must not invent one in either direction.** The effective multiplicity in any instance is whatever the authoritative `Outcome` representation actually exposes. B1S records what is available; B2S adjudicates linkage from that, and from nothing else. **`0..N` on a candidate row never means "B1 chooses"** (RP-4).

### 23.2 RT-09 terminology — the hard architecture-gate condition (ratification §8.3)

**The phrase:** *"one `Outcome` per occasion/Decision"* — RT-09.

**Disambiguation.** "occasion" here means the **purchase-decision occasion**, not the canonical `PurchaseOccasion`. RT-09's own sentence defines the antecedent two clauses earlier: *"one finalized `PurchaseIntent` = one purchase-decision occasion; ≤1 final `Decision` per finalized `PurchaseIntent`; one `Outcome` per occasion/Decision."* The canonical `PurchaseOccasion` is introduced separately by **RT-11**.

**Consequence, and its limit.** RT-09's uniqueness rule is an **A2/M7-layer entity** constraint. It says nothing about canonical `PurchaseOccasion` cardinality, **and it says nothing about `Outcome` payload multiplicity either.** Both inferences are refused. **The bare word "occasion" is retired from B usage.**

The seven units, kept separate:

```
purchase-decision occasion   = one finalized PurchaseIntent                  (A2)
Decision                     = <=1 per finalized PurchaseIntent              (A2 / M3.5A)
Outcome                      = one per Decision; payload multiplicity NOT
                               fixed by RT-09                                (M7)
individually addressable
  source assertion           = the source's own unit of assertion            (the source)
OccasionCandidate            = exactly one such assertion, emitted iff it is
                               candidate-grounding (8.2.6)                   (B1)  -- never counted
UnresolvedPluralityCluster   = Type A ambiguity over a member set, L >= 1    (B2)  -- licenses 0 occasions
PurchaseOccasion             = one real-world purchase, resolved             (B2)  -- the analysis unit, while ACTIVE
```

*(A **Type B occurrence-unresolved subject** is a reconciliation state, not a unit, and is deliberately absent from this list.)*

## 24. Temporal matrix

| Record / fact | source event time | trusted knowledge time | persisted-at | adjudication time | source-supplied? | trusted server time? | nullable / UNKNOWN? | identity-relevant? |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| **SourceObservation** | yes — asserted real-world instant/interval | yes | yes | n/a | event time **yes**; others **no** | knowledge, persisted | **event time may be UNKNOWN or coarse** | **No** |
| **OccasionCandidate** | inherited from its observations; asserts none of its own | yes (first grounding) | yes | n/a | no | yes | inherited | **No** |
| **Decomposition manifest** | n/a | yes | yes | n/a | no | yes | no | **No** — the mapping is stored; member ids are **minted, not derived** (DC-03) |
| **CandidateLink / OccasionSourceLink** | n/a | yes | yes | linking adjudication time | no | yes | no | **No** |
| **Preserved source-native relation** | n/a — the source's own relation record | yes | yes | n/a | relation content **yes** | knowledge, persisted | no | **No** |
| **ReconciliationAdjudication** | n/a | **knowledge horizon** it was made under | yes | **yes** | no | yes | no | **No** |
| **Supersession edge** | n/a | yes | yes | yes | no | yes | no | **No** — retirement is admitted-edge existence (SG-10), not a time comparison |
| **`STRUCTURAL_INTEGRITY_QUARANTINE`** | n/a | **knowledge horizon** | yes | **yes** | no | yes | no | **No** |
| **`QUARANTINE_RESCINDED`** | n/a | knowledge horizon | yes | yes | no | yes | no | **No** |
| **Type A cluster** | n/a | opening knowledge time | yes | opening/closing adjudication times | no | yes | no | **No** |
| **PurchaseOccasion** (identity row) | n/a | establishment knowledge time | yes | establishment adjudication time | no | yes | no | **No** — BI-12 |
| **Occurrence projection change** | n/a | knowledge time of the contradicting/retracting/deleting fact | yes | **yes** | no | yes | no | **No** |
| **`LateActualTransactionFactSatellite`** (§9.3.8.1 row 22) | yes — appended when learned | yes | yes | n/a | event time **yes** | knowledge, persisted | **may be UNKNOWN/coarse** | **No** |
| **ExposureFact** | the **study week**, not an instant | yes | yes | reconciliation time | period source-supplied | knowledge, persisted | period never null; counts **MISSING**, never zero | **No** |
| **`AGGREGATE_INCONSISTENCY_OBSERVATION`** | the period in question | yes | yes | yes | period **yes** | knowledge, persisted | no | **No** |
| **DeletionAuthorization** | obligation-effective instant, if any | yes | yes | n/a | may be authority-supplied | knowledge, persisted | obligation instant may be absent; **the whole record may be absent where purge requires it** (§16.5) | **No** |

**No timestamp above is identity-relevant.** R-B-12 requires it for canonical occasion identity; this contract extends it to candidates, clusters, links, supersession edges, quarantine records and manifest members, because a microsecond collision under concurrent commit would otherwise become a silent identity collision (AT-12, DB-13).

---

## 25. State / transition models

### 25.1 Candidate

```
Events (appended, never mutating):
    ASSERTED             -- created from ONE individually addressable source assertion
    CORROBORATED(obs)    -- a revision/attachment of THE SAME assertion supports it
    CONTRADICTED(obs)    -- a revision/attachment of THE SAME assertion contradicts it
    CORRECTED(obs')      -- a correcting observation supersedes obs
    RETRACTED            -- the grounding source withdrew
    CLUSTERED(clusterId) -- a B2 adjudication placed it in a Type A cluster
    LINKED(occasionId)   -- a B2 adjudication linked it to a resolved occasion
    UNLINKED(occasionId) -- appended retraction of a link

Projections (derived, never stored as authority):
    grounding      : ASSERTED | RETRACTED | NON_GROUNDING (no accepted participant binding, 18.4)
    corroboration  : UNCORROBORATED | CORROBORATED | CONTESTED
    disposition    : UNLINKED | CLUSTERED | LINKED(1) | LINKED(N)

NOTE: CLUSTERED and LINKED are B2 acts recorded against the candidate.
B1 never emits them, and B1 emits NO event that groups this candidate with
another candidate or with another assertion (BI-24, BI-28).
```

No `CONFIRMED` state exists: a candidate that "graduated" would be a countable unit, which BI-03 forbids.

### 25.2 Reconciliation subject

```
Per subject (an observation/candidate group):

    UNRESOLVED                  -- no finding yet                              [default]
    OCCURRENCE_UNRESOLVED       -- TYPE B: occurrence itself not established.
                                   NOT a cluster. Licenses 0 occasions.
                                   No inherited count-one conclusion.  [durable]  (BI-29)
    SAME_EVENT                  -- one real purchase                -> licenses 1 occasion
    DISTINCT_EVENTS             -- N real purchases, enumerated     -> licenses N occasions
    PLURALITY_UNRESOLVED        -- TYPE A: occurrence established, number NOT.
                                   Opens a cluster with L >= 1 and an ambiguity
                                   type. Licenses 0 occasions.        [durable]  (FC-08)
    OCCURRENCE_ESTABLISHED      -- 6.7 (a)-(d) satisfied for one enumerated purchase,
                                   with the 6.8 gates passed and basis recorded
                                   where a combination is cited (FC-07)
    CONTESTED                   -- incompatible unretired findings over a VALID
                                   eligible graph (SG-08)
    CORRECTION_PENDING          -- a source correction/retraction, or an aggregate
                                   inconsistency observation, re-opened this
    (no state)                  -- admitted graph structurally INVALID (SG-01..SG-07)
                                   -> FAIL CLOSED over the 9.5.4 scope only (SG-09)
                                   -> recoverable by quarantine (9.5.5)

Every transition is an appended ReconciliationAdjudication. No transition is
automatic; none is triggered by data arrival alone.

There is NO edge from PLURALITY_UNRESOLVED to OCCURRENCE_ESTABLISHED.
The only route out is an explicit SAME_EVENT_FINDING or DISTINCT_EVENT_FINDING
that closes the cluster (FC-02, FC-03).

There is NO edge from OCCURRENCE_UNRESOLVED to PLURALITY_UNRESOLVED.
A Type B subject reaches Type A only by first establishing occurrence (FC-08).
```

### 25.3 `PurchaseOccasion`

| Element | Immutable fact | Projection |
| :-- | :-- | :-- |
| canonical identity | **immutable under scientific operation**; subject to §16 legal deletion | — |
| **occurrence** | the appended `OCCURRENCE_*` adjudications and any `DeletionAuthorization` | **`ACTIVE` \| `CONTRADICTED` \| `RETRACTED` \| `TOMBSTONED` \| `PURGED`** |
| participant | **immutable** while `ACTIVE` | — |
| plurality basis | **immutable** (the licensing finding) | — |
| §6.8 basis | **immutable** where cited | — |
| **merchant** | the appended `MERCHANT_*` adjudications | **`RESOLVED` \| `UNRESOLVED` \| `CONTESTED` \| `REDACTED`** |
| source links | **immutable** (appended; retracted by appending) | active-link set |
| actual transaction facts (`LateActualTransactionFactSatellite`, §9.3.8.1 row 22) | **immutable** appended satellites (R-B-13) | any scalar view needs an O-11 rule first |
| legal-deletion state | **immutable authorization record where it lawfully survives** (§16.5) | redaction visibility |

```
Occurrence projection transitions (each an explicit appended adjudication or
an authorized deletion):

    (none) --OCCURRENCE_ESTABLISHED--> ACTIVE
    ACTIVE --OCCURRENCE_CONTRADICTED--> CONTRADICTED
    ACTIVE --OCCURRENCE_RETRACTED-----> RETRACTED
    CONTRADICTED | RETRACTED --OCCURRENCE_REINSTATED--> ACTIVE
                                        (retirement never reverses itself; SG-10)
    any --authorized deletion (16)-----> TOMBSTONED   (terminal for factual use)
    any --authorized full purge (16)---> PURGED       (identity residue may be removed
                                                       where the controlling authority
                                                       requires it; where residue is
                                                       forbidden, NO state marker
                                                       remains either -- 16.6.1 Case 2)

Only ACTIVE is a canonical PurchaseOccasion for downstream factual consumption (BI-22).
Scientific operations never delete the identity row. Legal deletion may (16).
An AGGREGATE_INCONSISTENCY_OBSERVATION triggers NONE of these transitions (FC-09).
```

### 25.4 Type A `UnresolvedPluralityCluster`

```
    OPEN            -- opened by PLURALITY_UNRESOLVED_FINDING; requires occurrence
                       established and L >= 1; carries an ambiguity type (9.7.3);
                       licenses 0 occasions
    OPEN            -- may gain/lose members and may have bounds tightened by
                       appended adjudication while ambiguity stands
    CLOSED_SAME     -- closed by SAME_EVENT_FINDING      -> 1 occasion licensed
    CLOSED_DISTINCT -- closed by DISTINCT_EVENT_FINDING  -> N occasions licensed,
                       where L <= N <= U
    CONTESTED       -- incompatible unretired closure findings (FC-01); still 0 occasions

A CLOSED cluster is never deleted by scientific operation; it remains the recorded
basis of the occasions it licensed.

C2's primary RIVSR treatment applies to an OPEN cluster ONLY where its ambiguity
type is PLAUSIBLE_DUPLICATE_AMBIGUITY (22.3). It is an ANALYSIS act, never a
cluster state change and never a B2 resolution. For every other ambiguity type,
NO primary treatment is stated here.
```

### 25.5 Record state, typed eligibility and structural-integrity disposition

**Nothing here is stored as authority.** Every predicate below is **computed on read** from the three axes, the append-only disposition history and the two dependency graphs. There is no admitted flag, no quarantined flag, no effectiveness flag and no resolution flag (P-06a, DF-2).

```
THE THREE AXES (9.3.1) -- independent, never collapsed:

    STRUCTURAL_VALID(r)       in { TRUE, FALSE }
        -- SG-R. Decidable by inspecting r AND EVERYTHING r EXPLICITLY REFERENCES,
           including the endpoint properties SG-03..SG-06 require.
           INDEPENDENT OF which finding or projection would survive (AX-5, RS-1).
    GENERATION_AUTHORIZED(r)  in { AUTHORIZED, UNPROVEN, UNAUTHORIZED }
        -- DB-03B, a property of r's OWN creation; never inherited (BI-38).
    CURRENTLY_QUARANTINED(r)  in { TRUE, FALSE }
        -- DERIVED: | ACTIVE_QUARANTINES(r) | > 0   (9.3.3.3)
```

```
THE DISPOSITION FOLD (9.3.3) -- append-only, content-addressed, unordered:

    DISPOSITION_EVENT_STRUCTURALLY_VALID(e)   -- SG-R on e; no self-target (DG-2).
                                                 Ancestor-target is a SEPARATE,
                                                 prospective write-time gate
                                                 (DG-3), not part of this
                                                 record-level predicate.
    DISPOSITION_EVENT_GENERATION_AUTHORIZED(e)
                                              -- AUTHORIZED REQUIRED; UNPROVEN is
                                                 NOT enough; capability-minted
    DISPOSITION_EVENT_CURRENTLY_QUARANTINED(e)
                                              -- | ACTIVE_QUARANTINES(e) | > 0
                                                 (the SAME fold, one level up)

    DISPOSITION_EVENT_ADMISSIBLE(e) = SOURCE_PRESERVED(e)
                                  AND the two predicates above
                                  AND e's target RESOLVES

    DISPOSITION_EVENT_EFFECTIVE(e)  = ADMISSIBLE(e)
                                  AND NOT DISPOSITION_EVENT_CURRENTLY_QUARANTINED(e)

    ACTIVE_QUARANTINES(t) =
        { q : DISPOSITION_EVENT_EFFECTIVE(q) AND target(q) = t
              AND NOT EXISTS x : DISPOSITION_EVENT_EFFECTIVE(x)
                                 AND x is a QuarantineRescission
                                 AND target(x) = identity(q) }
        -- 0..N members (23.1). Defined uniformly over records AND over
           disposition events, which is what makes a quarantine of a
           quarantine mean something.

    VALID_DISPOSITION(t) = EXISTS q in ACTIVE_QUARANTINES(t) : BASIS_HOLDS(q, t)
        -- bases: SG-R violation | UNAUTHORIZED | CONTROL_BASIS_FALSE (quarantine
           targets only, IQ-15)

    -- no ordering, no recency, no timestamp, no counting, no authority comparison
    -- TERMINATES by structural recursion on control depth over the acyclic,
       finite DispositionControlGraph (DG-01, DG-6, DG-8)
    -- NEVER consults CITATION_SOUND or PROJECTION_INPUT_ELIGIBLE (DE-12, DG-9)
```

```
THE FOUR TYPED PREDICATES (9.3.2) -- asked only of the classes that admit them:

    SOURCE_PRESERVED(r)            -- TRUE for every persisted record, subject to 16
    SOURCE_GROUNDING_ELIGIBLE(o,P) -- Tier 1 observations, per proposition
    PROJECTION_INPUT_ELIGIBLE(r)   -- Tier 2 / Tier 3 fold-read records
    INTEGRITY_SEED_ELIGIBLE(r)     -- ONLY classes with a defined SCOPE (9.3.8)

THE TWO DEPENDENCY GRAPHS -- both required ACYCLIC:

    CitationDependencyGraph   -- edges = the SEMANTIC CITATIONS of CD-3 rows 1-10,
                                 and NO others. CD-01. Directed to strictly
                                 earlier construction layers, one L2->L2 exception.
                                 CITATION_SOUND recurses on it and TERMINATES.
    DispositionControlGraph   -- edges = each disposition event to what it controls.
                                 DG-01. Disjoint in kind from the citation graph.

    A cycle in either is a SET-LEVEL violation with NO remedy by selection
    (CD-7, DG-4). No winner. No fixed point. No recency. FAIL CLOSED.
```

```
THE FOURTEEN STATES (9.3.7), exhaustive for projection-input records:

  A  valid,   AUTHORIZED,   unquarantined         -> ELIGIBLE            ordinary
  B  INVALID, any,          unquarantined         -> excluded, SEEDS     undispositioned
  C  INVALID, any,          valid quarantine      -> excluded, NO SEED   *** RECOVERY ***
  D  INVALID, any,          bad-basis quarantine  -> excluded, SEEDS     undispositioned
  E  valid,   UNAUTHORIZED, unquarantined         -> excluded, SEEDS     undispositioned
  F  valid,   UNAUTHORIZED, valid quarantine      -> excluded, NO SEED   *** LEGITIMATE ***
  G  valid,   UNPROVEN(req), unquarantined        -> excluded, SEEDS     no quarantine licensed
  H  valid,   UNPROVEN(not req), unquarantined    -> ELIGIBLE            ordinary
  I  valid,   AUTHORIZED,   erroneous quarantine  -> excluded, SEEDS     harmful (MQ-4)
  J  valid,   UNPROVEN,     erroneous quarantine  -> excluded, SEEDS     harmful (IQ-9d)
  K  excluded on a VALID basis, PLUS an erroneous active member
                                                  -> excluded, NO SEED   anomaly only (MQ-3)
  L  valid, AUTHORIZED, only NON-ADMISSIBLE quarantines
                                                  -> ELIGIBLE, NO SEED   anomaly only (MQ-7/8)
  M  valid, AUTHORIZED, only SUPPRESSED quarantines
                                                  -> ELIGIBLE, NO SEED   anomaly only (MQ-9)
  N  on a CITATION_DEPENDENCY_CYCLE, or the target of a DISPOSITION_CONTROL_CYCLE
                                                  -> NOT ELIGIBLE, SEEDS typed cycle error

Cases K and L are the states V1.5's primitive boolean could not express.
Case M is the state V1.6's missing EFFECTIVE conjunct could not express.
Case N is the state V1.6's unspecified recursion could not express.
```

```
TIER 1 RECORDS (source observations, source-native relation records,
decomposition-ambiguity records, non-grounding markers, candidates, manifests)
DO NOT APPEAR ABOVE.

    They are NEVER fold inputs and NEVER seed (9.3.8, TE-4, TE-5).
    Their failure is NON-ELIGIBILITY:
        SOURCE_GROUNDING_ELIGIBLE = FALSE
          -> NO CANDIDATE EMITTED (CE-2/CE-3), NO OCCURRENCE SUPPORT,
             deficiency RECORDED, record PRESERVED as diagnostic provenance.
    If an authoritative B2 record CITES one anyway, the CITING RECORD fails
    CITATION_SOUND and the failure is scoped to THE CONSUMER'S subject (CS-1).
    NO B2 SUBJECT IS EVER INVENTED FOR A TIER 1 RECORD (BI-42, QS-7).

TIER 4 RECORDS (deletion authorizations, receipts, structural-admission records,
affected-scope records, integrity-error and anomaly records, deletion residue)
DO NOT APPEAR ABOVE EITHER.

    They are NEVER fold inputs, NEVER seed, and NEVER authority (FS-9, QS-8).
    The admission record, the scope record and the error record are REPRODUCIBLE
    DESCRIPTIONS OF A COMPUTATION, never inputs to it -- which is why recording a
    fail-closed scope can never seed another one (AT-34).
    A quarantine naming a Tier 1 or Tier 4 record is INERT (IQ-16, DF-4).
```

```
Disposition transitions (append-only; nothing is deleted by these acts):

    (no disposition)  -- the default. Says NOTHING about eligibility: an invalid or
                         unauthorized record here is still NOT ELIGIBLE (TE-8, IQ-8),
                         and it SEEDS if it is Tier 2/3 (Case B / E / G).
    QUARANTINED       -- an appended StructuralIntegrityQuarantine with its OWN qid
                         names exactly one target and exactly one record-level basis
                         (IQ-1, DE-1).
                         -> it ACTS only if DISPOSITION_EVENT_EFFECTIVE (IQ-13).
                         -> effective + basis holds: the record STOPS SEEDING
                            (FS-1) and the eligible set is RECOMPUTED (9.5.6.2).
                         -> effective + basis does NOT hold: ERRONEOUS. Harmful if
                            it alone excludes an otherwise-eligible record (Case I/J);
                            anomaly only if a valid disposition also covers it (K).
                         -> NOT admissible: never enters ACTIVE_QUARANTINES at all;
                            anomaly; dispositionable on the UNAUTHORIZED basis (L).
                         -> 0..N quarantines may be active on one target (23.1).
    SUPPRESSED        -- (new in V1.7) an ADMISSIBLE disposition event that is ITSELF
                         validly quarantined. It is NOT EFFECTIVE and DOES NOT ACT
                         (DE-10, MQ-9/MQ-10, Case M).
                         -> a suppressed QUARANTINE stops excluding its target.
                         -> a suppressed RESCISSION stops removing its target qid,
                            so THAT quarantine becomes active again (DCG-4).
                         -> the suppressed event, its basis and the suppressing
                            event ALL REMAIN readable (AN-5).
                         -> removing the suppression returns the event to EXACTLY
                            what its own basis dictates -- never to validity (DE-11).
    RESCINDED         -- an appended QuarantineRescission naming EXACTLY ONE qid
                         (DE-2, RV-1). Removes THAT quarantine from the active set.
                         -> other active quarantines on the same record REMAIN (DQ-2).
                         -> the target record is eligible ONLY if it independently
                            satisfies both axes (IQ-11a, RV-10, DQ-3).
                         -> unmatched, incompatible or unresolvable target: INERT
                            (RV-2, RV-3, RV-8).
    INERT             -- the named target no longer exists (e.g. lawful purge), or
                         the target is a Tier 1 / Tier 4 class (IQ-16)
                         -> excludes nothing, retracts nothing, seeds nothing (IQ-11)
    CONTROL CYCLE     -- (new in V1.7) the DispositionControlGraph is cyclic
                         -> EVERY member is treated as NOT EFFECTIVE; none acts
                         -> the ULTIMATE SCIENTIFIC TARGETS fail closed, typed
                            DISPOSITION_CONTROL_CYCLE error naming every member
                         -> NO WINNER, no recency, no count (DG-4, DG-5, IQ-17)

Only records excludable on a RECORD-LEVEL basis may be quarantined (IQ-3).
The three record-level bases are: an SG-R violation; a proven UNAUTHORIZED
    generation; and -- against a StructuralIntegrityQuarantine ONLY --
    CONTROL_BASIS_FALSE (IQ-15, VD-7).
A substantive finding can NEVER be quarantined ON SCIENTIFIC GROUNDS (IQ-3, IQ-4).
A CONTESTED projection has NO quarantine remedy (IQ-4).
A set-level violation has NO quarantine remedy unless one specific member is
    independently shown SG-R-invalid or UNAUTHORIZED (IQ-9c) -- and it may remain
    bounded FAIL CLOSED indefinitely. The SAME rule governs a citation cycle
    (IQ-18) and a disposition-control cycle (IQ-17).
Recomputation after a VALID exclusion may change the projection: PERMITTED (IQ-9b).

RETENTION: every record in this state machine -- quarantine, rescission, basis,
    actor, affected-scope record, integrity-error record and the malformed row
    itself -- is append-only under ORDINARY AND SCIENTIFIC operation and is SUBJECT
    TO THE CONTROLLING LEGAL DELETION OVERRIDE (IQ-10, BI-31, 16.9). Where residue
    is prohibited, none of it survives, and no proof that any integrity event
    occurred is promised. Losing a quarantine record NEVER re-admits a bad record,
    because eligibility is computed from the record's OWN axes (TE-8, RV-8, RV-9).
```

---

## 26. Architecture Decision Records

Twenty-six ADRs. **ADR-25 and ADR-26 are new in V1.6**; ADR-16, ADR-20 and ADR-23 are amended. V1's ADR-8 remains **withdrawn**, replaced by ADR-8′. ADR-1…ADR-15, ADR-17…ADR-19, ADR-21, ADR-22 and ADR-24 are **carried unchanged** — all lie in frozen areas.

### ADR-1 — Source taxonomy: graded authority, a participant ceiling, a scope axis and an authorship axis *(carried)*

**Decision.** A closed nine-class taxonomy on **three axes** — level, semantic scope, authorship domain. **No participant-authored source exceeds AL-1**, and the ceiling binds the **author, not the artifact count** (BI-33); AL-3 contains only S-5. Telemetry AL-0; feeds registered-but-empty. `WeeklyExposureReport` `AGGREGATE_EXPOSURE`-scoped. **No bare status label grounds a candidate.** Combinations pass §6.8's four gates and record the §6.8.6 basis. Class, level, scope and domain assignment is a **`DB-03B`** obligation.

**Authority.** R-B-01, R-B-03, R-B-06, HR-B-08, P-01, P-10, P-13, P-14, P-15, RT-09, RT-13, Rev 2 §6.B/§6.D, Phase 0A-2 §21/§23/§26.

### ADR-2 — All identities are minted, never derived; proof is capability, not column shape *(carried)*

**Decision.** Opaque, server-minted surrogates for candidates, clusters, occasions, links, manifest members **and disposition events** (DE-1). **No identity is a function of business data or of any key pair.** The provenance half is **E-E** (ID-1…ID-6): **DB uniqueness proves uniqueness only.**

**Authority.** R-B-04, R-B-06, R-B-12, R-B-14, P-02, P-03, P-03a, P-09, P-10, Rev 2 §8 amendment.

### ADR-3 — Append-only adjudication over a levelled, validated, eligible graph *(carried)*

**Decision.** The current interpretation is a projection over the **projection-input-eligible** set, validated at **two levels**: `SG-R` per record and `SG-S` over the set. Structural invalidity at either level fails closed over a **bounded minimal scope**; substantive conflict (`CONTESTED`) projects as conflict. Branching is **`INVALID`**. **Retirement is eligible-edge existence (SG-10).**

**Authority.** R-B-10, R-B-13, HR-B-03, P-14, P-05, Rev 2 §6.A.

### ADR-4 — `Outcome`: consumed not owned; **no label is a fact** *(carried)*

**Decision.** B1 consumes `Outcome` and never owns or writes it. **No bare status label grounds a candidate — for any of the seven statuses.** Grounding comes only from an explicit assertion present in the authoritative representation, or an independently present, linked, re-provable domain object. The **verdict is never read**. **Payload multiplicity is inferred in neither direction.** Label triage is permitted but excluded from every basis. **ADR-24's `DB-03B` precondition is reached *before* these rules and never substitutes for them** (AT-27b).

**Authority.** R-B-01, R-B-03, P-01, P-13, O-13, RT-09, RT-11, Phase 0A-2 §21/§24.

### ADR-5 — `intendedTransactionAt`: no canonical scalar at B level *(carried; closes O-04)*

**Decision.** An observation-level, per-source, multi-valued provenance fact. A2's value is preserved as the **decision-input** fact it is, never promoted. **Authority.** O-04, O-11, R-B-13, HR-B-03, P-14, P-19, A2 §44.

### ADR-6 — Event time and knowledge time as separate first-class axes *(carried)*

**Decision.** Five axes; event time may be UNKNOWN or coarse; server times never null; `TIMESTAMPTZ(6)`; no JavaScript `Date`; **no timestamp identity**; explicit knowledge horizon on every adjudication, quarantine **and rescission**. Storage (**E-A**) and end-to-end fidelity (**E-C**) are separate obligations. **Authority.** R-B-12, P-08, A2 §36, O-15.

### ADR-7 — Legal deletion: authorization-gated, privilege-separated, purpose-limited, conditionally residual *(carried)*

**Decision.** A `DeletionAuthorization` mintable only outside the B write path conditionally unlocks a narrow trigger exception, backed by PR-1…PR-4. Mechanisms are **capability options** with **no legal-sufficiency claim**. **Identity permanence is scientific, not legal-absolute.** Every residue guarantee is **conditioned**; the authorization record is **itself subject to the override**. **Authority.** Rev 2 §6.E, ratification §4.2, P-05 verbatim, P-05a, O-17, A1 §21.

### ADR-8′ — Merchant as an authoritative logical projection, independent of occurrence *(carried)*

**Decision.** Occurrence and merchant resolution are independent. Merchant is an **authoritative logical projection from the adjudication log**. Grounded in **R-B-01**, **R-B-07**, **P-13** and the **B/C firewall**; recorded as **AC**, not as forced by P-19. **Authority.** R-B-01, R-B-07, P-13, P-19 (correctly scoped), HR-B-03, BI-05.

### ADR-9 — Unresolved plurality produces a typed cluster; the inherited treatment keeps its own scope *(carried)*

**Decision.** B2 creates **zero** canonical occasions and records a **Type A** cluster with members, an **ambiguity type**, and factual bounds **`L ≥ 1`**. **C2's primary RIVSR treatment is the inherited conservative one analytical unit — for `PLAUSIBLE_DUPLICATE_AMBIGUITY` only.** **Type B** is **not a cluster**. SB-1…SB-5 constrain sensitivity to `[L,U]`. **Authority.** Rev 2 §6.A amendment verbatim, ratification §8.1/§8.2, R-B-11, HR-B-02, P-12, P-12a, BI-04.

### ADR-10 — Historical identity separated from active occurrence *(carried)*

**Decision.** States `ACTIVE`, `CONTRADICTED`, `RETRACTED`, `TOMBSTONED`, `PURGED`. Only `ACTIVE` is a canonical occasion for downstream factual consumption. **Authority.** R-B-01, R-B-10, R-B-13, P-05, P-05a, BI-01, BI-11, BI-22.

### ADR-11 — Decomposition maps to minted identity, and only where the source addresses its members *(carried)*

**Decision.** A trusted decomposition operation with a durable identity and an **immutable manifest storing** `(operation, member discriminator) → minted opaque candidate id`. **Members correspond one-to-one to assertions the source itself individually addresses** (DC-02); where it addresses none, **decomposition MUST NOT occur** (DC-02a). **Authority.** R-B-06, R-B-11, R-B-12, R-B-15, BI-07, BI-24, BI-28, P-14.

### ADR-12 — Enforcement claims match mechanisms: five classes, not two *(carried)*

**Decision.** Every §18.7 invariant declares one of **E-A / E-B / E-C / E-D / E-E**. Every **E-B** row carries the **protected-verifier precondition**. **DB-03 is split into `DB-03A` and `DB-03B`.** DB-07 is E-D. **DB-11 splits.** **DB-12's provenance half is E-E.** **Authority.** R-B-08, R-B-15, R-B-16, HR-B-10, R-B-12, P-08, P-10, P-18; precedent A2 §29.

### ADR-13 — The B1/B2 boundary: one addressable assertion, and determined emission *(carried)*

**Decision.** A candidate binds **exactly one individually addressable source assertion** (AU-1), and **emission is a total deterministic function** (§8.2.6, BI-36). **Authority.** R-B-02, R-B-11, R-B-06, HR-B-02, BI-03, BI-24, BI-28, BI-36.

### ADR-14 — Joint sufficiency: four gates, then a recorded basis *(carried)*

**Decision.** **JD-1** scope, **JD-2** informational independence, **JD-3** probative relevance, **JD-4** authorship domain, then **JS-1…JS-6** including **JS-3a**. **P-15 intact.** **Authority.** R-B-01, R-B-03, R-B-06, HR-B-08, P-14, P-15, BI-21, BI-23, BI-26, BI-27, BI-33.

### ADR-15 — Semantic scope as an axis independent of authority level *(carried)*

**Decision.** Every source class carries **`(authority level, semantic scope)`**. **An aggregate never individuates, in either direction, at any level.** **Authority.** R-B-01, P-13, P-14, P-15, Rev 2 §6.C/§6.D, Phase 0A-2 §26.

### ADR-16 — Quarantine as a record-level remedy that cannot select scientific state *(amended in V1.6 and V1.7)*

**Decision.** A record excludable on a **record-level basis** is excluded from eligibility by an append-only `StructuralIntegrityQuarantine` (IQ-1…IQ-14), minted by a **separate trusted integrity-repair capability**. The two record-level bases are an **`SG-R` violation** and an independently established **`GENERATION_AUTHORIZED = UNAUTHORIZED`** (AX-4). A **set-level** violation with no individually excludable member has **no quarantine remedy** and stays fail closed (IQ-9c). `IQ-9a` (basis independence) and `IQ-9b` (consequence permission) are unchanged and **frozen**.

**Amendments in V1.6.** Three, all mechanical rather than semantic. **(i)** A quarantine now carries its **own identity** and names **exactly one** target and **exactly one** basis (IQ-1, DE-1), which is what lets a rescission name it. **(ii)** **`IQ-13`** — a disposition event must itself be `GENERATION_AUTHORIZED = AUTHORIZED` to act, so a forged or unproven one cannot remove a valid input. **(iii)** **`IQ-14`** — an integrity-layer defect that changes nothing the projection would otherwise admit is an **anomaly**, not a seed.

**Alternatives considered for IQ-14.** *(a)* Treat every integrity-layer defect as a seed — rejected: a forged-row injection would then deny service to any subject at will, while adding no protection, since the forged event already cannot act (DE-7). *(b)* Ignore non-acting events — rejected: they must be recorded, attributable and dispositionable (AN-2). *(c)* **Anomaly versus seed, decided by whether the defect changes what the projection would otherwise admit** — selected; the test is over the record's own axes and is re-provable (AN-4).

**Authority.** R-B-10, R-B-13, **P-14**, P-10, O-06a.

### ADR-17 — Cluster typing, factual bounds, and the scope of an inherited rule *(carried)*

**Decision.** Type A (`L ≥ 1`, typed ambiguity) separated from Type B. The inherited Rev 2 §6.A treatment applies **only** to `PLAUSIBLE_DUPLICATE_AMBIGUITY` and **only** to primary RIVSR. **Authority.** Rev 2 §6.A verbatim and its amendment, ratification §8.1/§8.2, P-12, P-12a, P-13, BI-04, BI-05.

### ADR-18 — The threat boundary is a precondition, not a residual guarantee *(carried)*

**Decision.** Every fail-closed guarantee holds **only** against actors who cannot modify the protected verifier (BI-32). Against migration owner, table owner and unrestricted superuser: **no technical guarantee is claimed**. **No independently protected external verifier is invented.** **Authority.** P-10, R-B-15, R-B-16, HR-B-10.

### ADR-19 — Deletion residue is conditional, and nothing is exempt *(carried)*

**Decision.** Residue guarantees hold **where and only where the controlling authority permits residue** (BI-31), **including the structural-integrity history** (IQ-10). **Authority.** Rev 2 §6.E, ratification §4.2, P-05, P-05a, O-17, BI-31.

### ADR-20 — Typed eligibility, evaluated on read *(amended in V1.6 and V1.7)*

**Decision.** Eligibility is a **family of pure predicates evaluated on read**, never a stored flag. Validation precedes eligibility. Nothing is eligible by default. Quarantine records a disposition and neither creates invalidity nor, by its absence, creates validity.

**Amendment in V1.6.** V1.5 had **one** predicate, `ADMITTED`, over an untyped domain. It is **replaced by four typed predicates** (§9.3.2) so that each question is asked only of the classes that admit it (ADR-25). The three-axis reading and the class-scoped generation sufficiency are carried unchanged; what changes is that **`PROJECTION_INPUT_ELIGIBLE` is no longer asked of records the fold never reads**, and **`INTEGRITY_SEED_ELIGIBLE` is a separate question from it**.

**Amendment in V1.7.** One. **Eligibility is now well-founded as well as typed.** `PROJECTION_INPUT_ELIGIBLE` consults `CITATION_SOUND`, which recurses over the **acyclic** `CitationDependencyGraph` (`CD-01`), so **no record's eligibility is a function of its own** and evaluation **provably terminates** (CD-6, CD-9). Nothing about *what* the predicates mean changes (ADR-27).

**Authority.** R-B-10, R-B-13, P-06a, P-13, P-14.

### ADR-21 — Candidate emission is a total function, not a permission *(carried)*

**Decision.** §8.2.6's predicate (E-1, E-2, E-3) determines emission. Every satisfying assertion yields **exactly one** candidate; every non-satisfying one yields **none**, with an explicit **non-grounding** marker where only E-3 fails. Because S-2 currently fails E-3 (§18.4.6), **no `Outcome`-derived candidate is emitted today** — the function behaving correctly on its inputs. **Authority.** R-B-02, R-B-11, R-B-08, P-18, BI-24, BI-28, BI-36.

### ADR-22 — Relational coherence and trusted-generation provenance are different obligations *(carried)*

**Decision.** `DB-03A` is **E-A**/**E-B**; `DB-03B` (TG-1…TG-5) is **E-E**. **Without independently protected trusted-generation provenance, a structurally coherent row is not sufficient as authoritative evidence** (BI-37). Per **BI-38**, trusted generation is a property of a record's **own** creation and is **never inherited across a reference**. **Authority.** R-B-08, R-B-15, P-10, P-18, BI-37, BI-38.

### ADR-23 — Three record axes, and a disposition that is effective *(amended in V1.6 and V1.7)*

**Decision.** Three independent axes (§9.3.1); the **fail-closed seed is disposition-aware** — a validly dispositioned record **stops seeding** (FS-1, BI-39).

**Amendment in V1.6.** Two. **(i)** The seed's **domain** is now typed: it ranges over `INTEGRITY_SEED_ELIGIBLE` records only, not over every persisted record (ADR-25). **(ii)** `CURRENTLY_QUARANTINED` is no longer a **primitive** on the third axis; it is **derived** from the disposition fold (ADR-26). The disposition-awareness that closed `JBA14-AUD-01` is unchanged; both amendments supply the totality it presupposed.

**Amendment in V1.7.** Two. **(i)** The seed's domain is narrowed once more: **no Tier 4 derived record may seed** (FS-9, QS-8), so recording a fail-closed scope cannot create one. **(ii)** The disposition that is "effective" is now **named and computed** — `DISPOSITION_EVENT_EFFECTIVE` requires that the event not itself be validly quarantined, so a suppressed event stops acting (ADR-28, DE-10).

**Authority.** R-B-10, R-B-13, P-06a, P-13, **P-14**, O-06a.

### ADR-24 — S-2 has no inherited trusted generation, and is non-grounding until it does *(carried)*

**Decision.** `Outcome → Decision → intent → assignment` proves **relational compatibility and participant coherence only**. **An S-2 observation may be candidate-grounding only where independently protected trusted-generation provenance for the authoritative M7 `Outcome` write path is re-provable.** Absent that proof it is **preserved as diagnostic provenance**, **grounds no candidate**, and **contributes no occurrence-supporting evidence**. *"Cannot prove"* is **`UNPROVEN`**, never forgery. **Mechanism owner: B1S**, via a named **M7 ingestion integration contract**, with **non-grounding as the standing default**.

> **V1.6 note, not an amendment.** §9.3.2 and §9.3.8 now make *"preserved as diagnostic provenance"* an **executable state** — `SOURCE_PRESERVED` true, `SOURCE_GROUNDING_ELIGIBLE` false, **`INTEGRITY_SEED_ELIGIBLE` false**. V1.5's untyped seed had contradicted this accepted rule by turning the same observation into an integrity corruption; ADR-25 removes the contradiction **without touching the S-2 contract**.

**Authority.** R-B-08, R-B-15, **P-10**, P-13, P-18, BI-37, **BI-38**; negative authority fact at §2.3.

### ADR-25 — Typed record domains, and a seed that cannot exceed its scope *(V1.6; amended in V1.7)*

**Decision.** Four typed predicates replace one polymorphic admission test (§9.3.2): **`SOURCE_PRESERVED`**, **`SOURCE_GROUNDING_ELIGIBLE`**, **`PROJECTION_INPUT_ELIGIBLE`**, **`INTEGRITY_SEED_ELIGIBLE`**. **`FAIL_CLOSED_SEED` ranges only over `INTEGRITY_SEED_ELIGIBLE` records**, whose classes name or belong to a B2 subject, so **`SCOPE` is defined for every seed member by construction** (FS-5, QS-5). A **four-tier record-class table** (§9.3.8) answers, for every class, whether it can be a projection input, whether it can seed, how its subject is obtained if it can, and **what authoritative consequence its failure has if it cannot**. **`CITATION_SOUND`** (§9.3.5) locates the failure of an ineligible referent **at the consuming B2 subject**.

**The defect this repairs.** V1.5's seed ranged over **every persisted record** while §9.5.5's `SCOPE` was defined only over structural records with subjects. A preserved-but-non-grounding **S-2 observation** therefore entered a set for which `SCOPE` was **undefined** — and, worse, contradicted §18.4.6's **accepted** rule that such an observation is merely diagnostic. **Totality was asserted, not constructed.**

**Alternatives considered.** *(a)* **Extend `SCOPE` to cover observations** by minting a subject for each — **rejected outright**: it invents B2 artifacts for records that ground nothing, inflates the subject space with objects no evidence supports, and would make every unproven source row an integrity incident. **BI-42 now forbids it.** *(b)* **Special-case observations out of the seed** with a proviso — rejected: a proviso on an untyped predicate is another patch layer, and the next record class raises the same question. *(c)* **Make the seed "not eligible and not dispositioned and has a subject"** — rejected as circular: *"has a subject"* is exactly the class property that needs stating, and hiding it inside the seed leaves §9.3.8's four questions unanswered. *(d)* **Type the domains and discharge totality class by class** — selected: it answers the question once, for every class, and makes the next class's answer a required table row rather than an open case.

**Why the dependency rule is the right place for the failure.** An observation reaches B2 only by being **cited**. The citing record has a subject; the observation may not. Locating the failure at the consumer is therefore the **only** placement that is both total and minimal — and it is also the correct one, because the defect is the **citation**, not the observation's existence (CS-1, CS-2).

**Amendment in V1.7.** Two, both closing the same gap in a different place. **(i)** The four-tier table is reissued as a **closed registry of twenty-one persisted classes answering eight questions**, with §9.3.8.3 disposing of every other logical name — V1.6's exhaustiveness claim was **false as written** (`JBA16-AUD-02`, ADR-27's sibling repair). **(ii)** **No Tier 4 derived record may seed** (FS-9, QS-8), so the affected-scope record, the structural-admission record and the integrity-error record cannot cause the failure they describe (`AT-34`). **The decision itself is unchanged.**

**Authority.** R-B-01, R-B-02, R-B-10, R-B-13, P-01, P-13, P-14; and §18.4.6, whose accepted rule V1.5's untyped seed contradicted.

### ADR-26 — Disposition state is a content-addressed fold, not a boolean *(V1.6; amended in V1.7)*

**Decision.** Quarantines carry **their own opaque immutable identities**; rescissions **target exactly one identity by explicit reference** (DE-1, DE-2). **`ACTIVE_QUARANTINES(r)`** is a **set fold with no ordering** over admissible events; **`CURRENTLY_QUARANTINED`** and **`VALID_DISPOSITION`** are **derived** from it (§9.3.3, §9.3.4). A disposition event acts **only** if it is itself **`GENERATION_AUTHORIZED = AUTHORIZED`** and capability-minted (IQ-13). Multi-quarantine composition, rescission validity and disposition-event integrity are stated totally (MQ-1…MQ-8, RV-1…RV-10, AN-1…AN-4).

**The defect this repairs.** V1.5 fed a **primitive boolean** into `ADMITTED`, `VALID_DISPOSITION`, the seed and `SG-10` without defining it, and spoke of *"**the** quarantine"* as though at most one could exist. The model had no answer for multiple quarantines, rescission targeting, unmatched rescissions, duplicate delivery, competing or erroneous quarantines, or a disposition event whose own provenance is `UNPROVEN` or `UNAUTHORIZED`.

**Alternatives considered.** *(a)* **Latest-wins over a timestamp** — **rejected**: it is exactly the implicit selection **P-14** forbids, and it makes clock skew a scientific input. *(b)* **A counter of quarantines minus rescissions** — rejected: counting cannot say *which* quarantine a rescission unwinds, and two rescissions of one quarantine would wrongly over-decrement. *(c)* **A mutable boolean maintained by the write path** — rejected: **P-06a** bars a column becoming authority, and it can drift from the history it summarises. *(d)* **Rescission negating a record's state rather than one act** — rejected: it cannot express DQ-2, and it lets one rescission undo justifications it never examined. *(e)* **A set fold over explicitly targeted identities** — selected: order-free, replayable, pure, and it answers every listed case without a precedence rule.

**Why disposition events need their own `DB-03B`.** A disposition event is the one artifact class that can **remove** an otherwise valid scientific input. If an `UNPROVEN` one acted, an unproven actor could silently delete evidence from the projection; if a forged one acted, so could an attacker. Requiring `AUTHORIZED` makes the forged event **fail safe** — it cannot act — while `IQ-14` keeps it **failing loud** as a recorded anomaly, and `DE-8` makes it removable by the same mechanism with no special case.

**Amendment in V1.7.** Two. **(i)** The fold's membership test becomes **`DISPOSITION_EVENT_EFFECTIVE`** rather than `DISPOSITION_EVENT_ADMISSIBLE`, so an event that is itself validly quarantined **stops acting** (ADR-28, DE-10). **(ii)** The cardinality the fold always had is now **stated as `0..N` in §23.1**, removing V1.6's contradiction with its own matrix (`JBA16-AUD-03`). **The fold's shape, its identities and its freedom from ordering are unchanged.**

**Authority.** R-B-10, R-B-13, **P-14**, **P-06a**, P-10, P-13, O-06a.

### ADR-27 — Eligibility dependency is an acyclic graph, not a fixed-point equation *(new; `JBA16-AUD-01`)*

**Decision.** Every reference one persisted B record makes to another is classified by **CD-3** into exactly one of three kinds: a **semantic citation**, which is an edge of the **`CitationDependencyGraph`** and the only kind on which eligibility may depend; a **mere provenance reference**, which creates no eligibility dependency; or a **structural endpoint relation**, which is an `SG-R` obligation of the referring record. The graph is **required acyclic** (`CD-01`), directed from later construction layers to earlier ones (CD-4, CD-5), **with the single named exception `CD-5a`** (`AGGREGATE_INCONSISTENCY_OBSERVATION → ExposureFact`, `L2 → L5`; added in V1.8, proved not to reopen recursion). Evaluation is **stratified** and **provably terminating** (CD-9). A cycle that physically exists **fails every member closed** with a typed error naming all members, and **no member is selected** (CD-7).

**The defect this repairs.** V1.6 made `PROJECTION_INPUT_ELIGIBLE(r)` depend on `CITATION_SOUND(r)` while letting `CITATION_SOUND(a)` consult `PROJECTION_INPUT_ELIGIBLE(x)`. For a cyclic citation those clauses are a **recursive equation with no specified semantics** — no fixed point, no order, no failure behaviour. V1.6 also never said **which** references were dependency edges, so *"every operative reference is probably a citation"* was the only available reading, and it is wrong: a preserved A2-lineage reference and a supersession endpoint are not citations at all.

**Alternatives considered.** *(a)* **A unique-fixed-point calculus** — considered seriously and **rejected**: it would give a **defect** a defined answer. The accepted authority already orders B1 before B2 (BI-02, BI-24) and already forbids a record from grounding itself (BI-03, P-01), so a citation cycle has **no legitimate meaning** to compute. *(b)* **Iterate until stable** — **rejected and prohibited** (CD-8): the stable point depends on the starting assignment, which is an implicit selection **P-14** forbids. *(c)* **Break the cycle by dropping the "latest" or "least authoritative" member** — **rejected and prohibited**: that is *latest-wins* / *highest-authority-wins* under another name (BI-15). *(d)* **Treat every reference as a citation and forbid all reference cycles** — rejected as over-broad: it would make an ordinary preserved-provenance loop, which affects nothing, a fatal integrity error. *(e)* **Classify references, require the citation subgraph acyclic, fail a cycle closed** — selected: it is the **minimal** graph that must be acyclic for the definition to be well-founded, and its failure mode is the one `IQ-9c` already established for `SG-S` and the audit already accepted.

**Why fail-closed rather than best-effort.** A cycle means the architecture cannot say whether a record is eligible. Answering anyway would publish a scientific result derived from an undefined state, **indistinguishable from a correct one**. Refusing to answer is detectable, bounded to the `QS-1` minimal scope, and **recoverable by later evidence** — the same trade §9.5.6.12 records for set-level violations.

**Authority.** R-B-10, R-B-13, R-B-02, **P-14**, P-01, P-13, O-06a; BI-02, BI-03, BI-15, BI-24.

### ADR-28 — Disposition events are dispositionable, and the control graph is acyclic *(new; `JBA16-AUD-04`)*

**Decision.** **The V1.6 choice is retained: a disposition event IS itself a valid quarantine target.** It is made operative by separating `DISPOSITION_EVENT_STRUCTURALLY_VALID`, `DISPOSITION_EVENT_GENERATION_AUTHORIZED` and `DISPOSITION_EVENT_CURRENTLY_QUARANTINED`, and deriving **`DISPOSITION_EVENT_EFFECTIVE`**, which the fold — not admissibility — now consults (§9.3.3.2, §9.3.3.3). The **`DispositionControlGraph`** is **required acyclic** (`DG-01`): **self-target is individually, record-level structurally invalid (`DG-2`)**; **a proposed edge that would create an ancestor-target cycle is rejected only prospectively, at write time, against the currently persisted graph (`DG-3`, narrowed in V1.8) — never as a record-level reclassification of an event already persisted**; an already-persisted multi-record cycle is governed **solely** by `DG-4`, with no member individually invalid merely for cycle membership. Termination is proved by **structural recursion on control depth** over a finite DAG (DG-8). A third record-level basis, **`CONTROL_BASIS_FALSE`**, is available **against a quarantine only** (IQ-15). `DCG-1`…`DCG-8` fix the exact behaviour.

**The defect this repairs.** V1.6 declared that a bad disposition event is dispositionable (DE-8) but never let that fact reach the fold: `DISPOSITION_EVENT_ADMISSIBLE(e)` did not ask whether `e` was quarantined, so **quarantining `Qbad` had no operative effect**. And the recursion it implied had no well-foundedness rule — nothing prohibited `Q1` targeting itself or `Q1 → Q2 → Q1`, and DS-5's termination argument assumed what it needed to prove.

**Alternatives considered.** *(a)* **Answer NO — disposition events are not quarantine targets** — rejected: it would leave an **erroneous but authorized** quarantine correctable only by rescission, i.e. only by an actor willing to undo it, and would reintroduce the permanent-poisoning problem §9.5.1 exists to solve, one layer up. It would also contradict the V1.6 contract the audit did not ask to reopen. *(b)* **Answer YES with unbounded recursion** — rejected: that is the defect. *(c)* **Bound the recursion by depth `k`** — rejected: an arbitrary constant decides scientific state at depth `k+1`, and an adversary chooses the depth. *(d)* **Resolve control cycles by recency or actor authority** — **rejected and prohibited** (**P-14**, BI-15). *(e)* **Require the control graph acyclic and fail a cycle closed** — selected: it makes `DCG-1`…`DCG-8` computable, keeps the exclusion direction **fail-safe** and the admission direction **fail-closed** (DG-5), and reuses the failure shape already accepted for `SG-S`.

**Why `CONTROL_BASIS_FALSE` is not a route to scientific selection.** It is available **only** against a `StructuralIntegrityQuarantine`, and it asserts exactly one thing: *the basis this control event named does not hold for its own target*. That is decided from the **target's own two axes** — the same evidence `IQ-9a` already requires — and **never** from which finding would survive. It cannot be aimed at an adjudication, an occasion, a link or a cluster, and it cannot be aimed at a rescission, which names no basis (VD-7, IQ-15).

**Why suppression and rescission both exist.** **Rescission** withdraws an act. **Suppression** neutralises a **defective** act on re-provable evidence. Keeping both means a bad quarantine can be corrected **either** by the actor who made it **or** by an independent finding about it — and neither route can make it scientifically valid (DE-11, `DCG-3`).

**Authority.** R-B-10, R-B-13, **P-14**, P-06a, P-10, P-13, O-06a; BI-15, BI-30, BI-35, BI-40.

## 27. Open-item closure matrix

Held once in **Part F**, so no divergent copy can exist.

---

## 28. Factual individuation and shared projection policy

### 28.1 `O-B-DISTINCTNESS` — failed / retry / resumed

**Three factual outcomes, no default among them:**

| Outcome | When | Result |
| :-- | :-- | :-- |
| **Resolved same-event** | evidence establishes the observations describe **one** real purchase | `SAME_EVENT_FINDING` → **one** occasion |
| **Resolved distinct-events** | evidence establishes **N**, enumerated | `DISTINCT_EVENT_FINDING` → **N** occasions |
| **Unresolved plurality** | occurrence established, number not | `PLURALITY_UNRESOLVED_FINDING` → **zero** occasions, one **Type A** cluster with `L ≥ 1` and a typed ambiguity |
| **Occurrence unresolved** | occurrence itself not established | **Type B** subject → **zero** occasions, **no cluster** (BI-29) |

**Admissible distinctness evidence** — evidence, never an automatic predicate: distinct merchant-side transaction references; distinct tender/payment attempt references; materially different baskets or purchase signatures; an intervening completion; an explicit participant or researcher assertion of sameness or difference, including a **source-asserted plurality claim** (AU-6); source-semantic markers whose meaning the source system actually defines.

**Inadmissible as a predicate.** **Elapsed time alone** — ratification §8.1 forbids *"inventing a scientifically motivated time window solely to force identity"*. **This contract invents no timing threshold.**

**Same cart, same session, same reference** may be **evidence** — sometimes strong — but is **never an automatic identity predicate**; it counts only to the extent the source system's own semantics prove what it means.

| Scenario | Treatment |
| :-- | :-- |
| **`Outcome.status = failed`, label only** | **no attempt fact exists.** Bare `failed` is UNKNOWN and non-grounding (§7.4.1). There is nothing to individuate. |
| **`Outcome.status = attempted`, label only** | **no attempt fact exists** (§7.4). *(changed in V1.3 — V1.2 read this label as an attempt.)* |
| **failed or attempted purchase, where the attempt is independently established** | **one occasion** — BI-01 counts *attempted or realized*. A definitional consequence of an **independently established** attempt fact, never a reading of a label. |
| **immediate retry** after a failure | **evidence-determined**, else unresolved |
| **resumed transaction** | **evidence-determined**, else unresolved |
| **payment retry**, different instrument | **evidence-determined**, else unresolved |
| **merchant rerun** of a charge | **evidence-determined**, else unresolved |
| **abandoned attempt** | **UNKNOWN** — no occasion unless a real-world attempt is affirmatively asserted (§7.4.2) |
| **partial completion** | **evidence-determined**; partiality preserved as a fact either way |
| **same cart across attempts** | **evidence-determined**, else unresolved |
| **multiple attempts near in time** | distinct only with evidence; otherwise **zero** occasions and one Type A cluster |
| **participant asserts "I tried twice"** | one candidate carrying a typed plurality claim (AU-6); B2 may find `DISTINCT_EVENT_FINDING(2)` on that evidence, or leave a Type A cluster with `L ≥ 1` |

**How ambiguity survives without distorting anything.** Ratification §8.1 requires ambiguity be **preserved** → the Type A cluster preserves it with members, typed ambiguity, bounds and basis. Rev 2 §6.A requires ambiguity **not increase the numerator** → an open cluster contributes **zero** canonical occasions, and the conservative primary count is applied **inside C2 analysis, for the duplicate class only** (§22.3). Neither inflation nor deflation, and no over-extension of the inherited rule.

### 28.2 `O-11` — shared projection policy

| Candidate projection | Exists at B level? | Authority | Selection rule | Ambiguity | Correction |
| :-- | :-- | :-- | :-- | :-- | :-- |
| **real merchant** | **Yes** | **the adjudication log** — an *authoritative logical projection*, never a column | explicit `MERCHANT_ESTABLISHED` only | `UNRESOLVED` / `CONTESTED`; **occurrence unaffected** | appended superseding adjudication |
| **occurrence status** | **Yes** | the adjudication log (plus authorized deletion) | explicit `OCCURRENCE_*` only | `CONTESTED`; identity persists, not `ACTIVE` | appended; reinstatement explicit (SG-10) |
| **plurality / occasion count** | **Yes where resolved; deliberately absent where not** | the adjudication log | `SAME_EVENT_FINDING` or `DISTINCT_EVENT_FINDING` only | **no projected count** — a Type A cluster with bounds, or a Type B subject | appended closure finding |
| **cluster factual bounds `[L,U]`** *(new)* | **Yes** | the adjudication log | the establishing evidence only | `U` may be UNKNOWN — **recorded as UNKNOWN, never faked** | appended tightening adjudication |
| **ambiguity type** *(new)* | **Yes** | the adjudication log | the structural predicate of §9.7.3 | — | appended reclassification with basis |
| **`intendedTransactionAt`** | **No** | — | n/a — observation-level only (ADR-5) | n/a | n/a |
| **`actualTransactionAt`** | **No canonical scalar** | append-only `LateActualTransactionFactSatellite` rows (§9.3.8.1 row 22, R-B-13) | any future projection needs an accepted O-11 rule **first** | multiple values coexist | appended satellite |
| **`Outcome`-derived linkage multiplicity** | **No inferred projection** | the authoritative `Outcome` representation | none — `SEMANTICALLY UNBOUNDED BY RT-09` | linkage stays open | per available payload |
| **authorship determination** *(new)* | **Yes, as a typed provenance state** | the ingestion path's recorded determination | none — **UNKNOWN stays UNKNOWN** (§6.5) | UNKNOWN is first-class and ceiling-applying | appended correction with basis |
| **one selected provenance source** | **No** | — | none; all links retained with stance **and scope** | selection would violate R-B-06 | n/a |
| **source confidence / status** | **No numeric confidence** | class-level `(level, scope)` is static | n/a — a score invites `highest-confidence-wins` (P-14) | n/a | class changes amend §6.4 |

**Where the architecture chooses not to expose a projection, it says so** — five of eleven rows exercise that obligation.

---

## 29. Downstream obligations and explicit non-decisions

Held once in **Part P**.

---

## 30. Rejected-B1 non-import audit

Compared against `a586b3119da2cc1aa4668485b129dbe625ab5cae` (tree `ae31d6649303d04bd334ef1bf93ec56b915d39fe`), **`REJECTED IMPLEMENTATION EVIDENCE — NON-AUTHORITATIVE`** (P-17). Both hashes re-verified (§2.1). **No rejected-B1 semantic is imported.**

| # | Concept | Classification | Disposition in V1.7 |
| :-- | :-- | :-- | :-- |
| 1 | Forged-receipt re-proof | **Independently required** (R-B-15) | **Retained**; conditioned on BI-32; explicitly **insufficient on its own for authorship** (BI-37, BI-38) |
| 2 | P2002 classification by field set; unrecognized target ⇒ fail closed | **Safe pattern**, A2 §27 | **Retained** (§17.4) |
| 3 | Trusted-context capability discipline | **Safe pattern**, A1 §11/§13, A2 §28 | **Retained**; extended with PR-1…PR-4, the trusted integrity-repair capability (IQ-6), the sanctioned adjudication capability (TG-5), the `DB-03B` obligation, the requirement that a disposition event be capability-minted and generation-authorized to act (IQ-13) — **and now the requirement that it not itself be validly quarantined** (DE-10) |
| 4 | Append-only `BEFORE … RAISE` triggers | **Safe pattern**, A1 §21 | **Retained, materially extended** — the authorization gate, privilege separation, the threat boundary, conditional residue, append-only quarantine and rescission records with their own identities, **and write-time rejection of self-targeting and layer-violating references** (DB-02, DE-3, DB-08c, DB-08d) |
| 5 | Adversarial test style | **Independently required** (P-10, R-B-15) | **Retained; extended** to **sixty-one** threats (§19.5) |
| 6 | `UNIQUE(originIntentId)` + finalization/context uniques | **REJECTED** | **Forbidden** (R-B-04, P-02, BI-06); DB-07 requires a **positive absence proof** (E-D) |
| 7 | Automatic post-finalization materialization of an occasion | **REJECTED** | App-side fact establishing a real-world purchase (P-01), skipping B1 (R-B-02). **§9.3.8 forbids the more general error it exemplifies: inventing a B2 artifact for a record that grounds nothing** (BI-42) |
| 8 | `identityDigest` with a hex-syntax CHECK | **REJECTED** | Verifies syntax, not semantic content (R-B-14, P-09) |
| 9 | Structural participant derivation | **Independently required** (R-B-08, P-18), A2 §5 | **Retained, and split** — relational derivation is `DB-03A`; **authorship and trusted generation are `DB-03B`, E-E**; **BI-38** forbids reading one class's protection off another's reference chain |
| 10 | `TIMESTAMPTZ(6)` columns **but** `new Date().toISOString()` canonicalization | **Split** | Column types **retained** (E-A); the `Date` canonicalization **REJECTED** (P-08) with an **E-C** round-trip obligation. **§9.3 consults no timestamp at all** (DF-2) |
| 11 | Merchant copied from the A2 pinned context, trigger-enforced | **REJECTED** | R-B-07; replaced by §13 and ADR-8′ |
| 12 | `intendedTransactionAt` copied from A2, trigger-enforced | **REJECTED** | Pre-empts O-04; replaced by ADR-5 |
| 13 | Occasion existence coupled to A2 invalidation | **REJECTED** | P-04, BI-10, AT-14 |
| 14 | Legacy label *"B1 Opportunity Identity"* | **REJECTED** | Superseded (§5) |
| 15 | No candidate layer | **REJECTED** | R-B-02; the candidate layer (§8) is the structural fix, with **deterministic** population (§8.2.6) |

**Conclusion.** Five concepts retained, each **independently required by accepted authority** (1, 2, 3, 5, 9), plus a column-type convention (10, partial). **Ten rejected semantic assumptions excluded.**

**V1.7 note.** This revision moves further from the rejected implementation on one additional count. The rejected implementation resolved contention **by write order** — the last write, or the constraint that fired first, determined state. V1.7 makes that impossible in **both** integrity graphs: a citation cycle and a control cycle each **refuse to resolve** rather than letting order decide (CD-7, CD-8, DG-4, IQ-17, IQ-18), and **no persisted class may be written that the §9.3.8 registry does not name** (`AM-10a`, AT-33).

---

## 31. Contradiction gate

Held once in **Part O**.

---

## 32. Acceptance criteria

| # | Criterion | Where |
| :-- | :-- | :-- |
| AC-01 | Baseline and rejected-tree hashes verified; authority read content-addressed; working-tree deviation disclosed | §2.1, §2.2 |
| AC-02 | All thirteen JBA open items CLOSED VALIDLY, with **O-06a** closed against the **eighteen-item** standard and **O-01** carried | **Part F**, **Part F.1** |
| AC-03 | `JBA16-AUD-01` … `-04` repaired substantively, not relabelled | **Part D** |
| AC-04 | The affected and history-critical prior findings **individually re-proved against their ORIGINAL defects** | **Part E.1** |
| **AC-05** | **Eligibility is typed; there is no single polymorphic admission predicate** | §9.3.2, BI-41, ADR-25 |
| **AC-06** | **The fail-closed seed ranges only over records with a defined `SCOPE`** | §9.3.6 FS-5/FS-7/FS-9, §9.5.5 QS-5/QS-7/QS-8, **AT-23j**, **AT-34** |
| **AC-07** | **Totality is discharged class by class, over a CLOSED registry of twenty-two classes on eight questions, with every other logical name subsumed or excluded** | §9.3.8.1, §9.3.8.2, §9.3.8.3, `AM-10a`, **AT-33** |
| **AC-08** | **A preserved, non-grounding source observation creates no B2 subject** | §9.3.2, §9.5.6.6, BI-42, **`SD-1` / AT-23j** |
| **AC-09** | **A dependency failure is located at the consuming subject** | §9.3.5 CS-1…CS-8, **`SD-2` / AT-23k** |
| **AC-10** | **Disposition state is a content-addressed append-only fold, with no ordering** | §9.3.3, BI-43, ADR-26 |
| **AC-11** | **Quarantines carry their own identity; rescissions target exactly one** | DE-1, DE-2, RV-1 |
| **AC-12** | **`CURRENTLY_QUARANTINED` and `VALID_DISPOSITION` are derived, never primitive** | §9.3.3.3, §9.3.4, VD-1 |
| **AC-13** | **Multi-quarantine composition, rescission validity and disposition-event integrity are total** | MQ-1…MQ-10, RV-1…RV-10, AN-1…AN-5, **`DQ-1`…`DQ-6` / AT-23l, AT-23m** |
| **AC-14** | **A forged or unproven disposition event cannot act, is an anomaly, and is dispositionable** | IQ-13, DE-6…DE-8, **AT-23m** |
| **AC-15** | **No latest-wins, first-wins, highest-authority-wins, timestamp ordering or mutable boolean** | DF-1, DF-2, DB-08a, DB-13 |
| **AC-16** | **`SG-R` may inspect endpoints and must be independent of survivors** | AX-5, RS-1, IQ-9a, §5, **AT-30** |
| AC-17 | `SG-10` re-proved over the derived fold | §9.4.4.2, `SG10-1`…`SG10-6`, `DQ-1`…`DQ-6` |
| AC-18 | `IQ-9a` / `IQ-9b` basis-versus-consequence preserved | IQ-9a, IQ-9b, BI-40, **AT-23h** |
| AC-19 | `SG-S` terminal fail-closed preserved | IQ-9c, §9.5.6.3, `SG10-4`, `SG10-5`, **AT-23c** |
| AC-20 | `SG-R` / `SG-S` classification unchanged | §9.4.1 |
| AC-21 | S-2 contract, `BI-38`, S-1 scoping and O-01 unchanged | §18.4.4–§18.4.7, §18.5, ADR-24 |
| AC-22 | Status-label discipline; source taxonomy; JD-4; assertion unity; CE-1…CE-7; RT-09; cluster ontology; Rev 2 §6.A scope; bounds firewall; merchant semantics | **Part E.2** |
| AC-23 | Opaque identity, extended to disposition events | §11, DE-1, DB-12 |
| AC-24 | Legal deletion and O-17 intact, including integrity history and the fold's behaviour under purge | §16, IQ-10, RV-8, RV-9, **Part L** |
| AC-25 | Temporal architecture intact; §9.3 consults no ordering | §15, DF-2 |
| AC-26 | Protected-verifier precondition and administrative threat limits intact | §18.3, §19.2–§19.4, **Part M** |
| AC-27 | B/C firewall intact; no new C2 semantics | **Part N** |
| AC-28 | Rejected-B1 non-import complete | §30 |
| AC-29 | **Sixty-one** adversarial threats each carry a required invariant | §19.5 |
| AC-30 | Contradiction gate PASS, including **CG17-1…CG17-18** | **Part O** |
| AC-31 | Self-contained without V1…V1.6 | §1, §5, §9, §18 |
| AC-32 | No code, no repository mutation, no authority mutation; **V1.6 neither amended nor deleted**; B1S/B2S not begun; `AnalysisProtocol v1` UNFROZEN | §3, **Part Q** |
| AC-33 | No new external human semantic decision assumed | **Part F.1**, **Part O** |
| **AC-34** | **Every reference is classified into exactly one of three kinds, in a closed table** | §9.3.5.1 CD-1…CD-3, BI-44, ADR-27 |
| **AC-35** | **The `CitationDependencyGraph` is required acyclic, and a cycle fails every member closed with no winner and no fixed point** | `CD-01`, CD-7, CD-8, §9.5.6.9, **DB-08c**, **AT-31** |
| **AC-36** | **Evaluation is stratified and termination is PROVED, not assumed** | CD-9, DG-6…DG-8, §9.3.9 |
| **AC-37** | **Quarantine cardinality is `0..N` in every place it is stated** | §23.1, §9.3.3.3, §5, DB-08a, §25.5, **AT-23n** |
| **AC-38** | **A disposition event that is itself validly quarantined does not act, and the fold consults `EFFECTIVE`** | §9.3.3.2 DE-9…DE-12, §9.3.3.3, BI-45, ADR-28 |
| **AC-39** | **The `DispositionControlGraph` is required acyclic; self-target is individually invalid; a proposed ancestor-target edge is rejected prospectively at write time, never reclassified after persistence; a control cycle fails closed with no winner** | `DG-01`, DG-2…DG-5, IQ-17, **DB-08d**, **AT-32** |
| **AC-40** | **`DCG-1`…`DCG-8` all hold, including that rescission restores the ability to act and never scientific validity** | §9.3.3.8, §9.5.6.8, DE-11 |
| **AC-41** | **Harm is defined structurally by operative influence, never by result preference** | AN-1a, IQ-14, **Part K.5** |

**Not self-declared.** This artifact does not declare its own acceptance.

---

# PART D — `JBA16-AUD-01` … `JBA16-AUD-04` CLOSURE MATRIX

| Finding | Status | V1.6 defect | V1.7 semantic repair | Sections changed | Controlling authority | Kind | Downstream owner | Remaining risk |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| **JBA16-AUD-01** | **CLOSED** | `PROJECTION_INPUT_ELIGIBLE` depended on `CITATION_SOUND`, which could consult `PROJECTION_INPUT_ELIGIBLE` for a fold-read referent. A fold-read citation cycle was therefore a **recursive equation with no specified semantics** — no fixed point, no evaluation order, no failure behaviour. And **no enumeration existed of which references are dependency edges**, leaving *"every operative reference is probably a citation"* as the only reading. | **§9.3.5.1.** **CD-3** is a **closed classification table** over all twenty-four reference roles the architecture admits, sorting each into **semantic citation** (rows 1–10, the only eligibility edges), **mere provenance** (rows 15–24, no eligibility effect) or **structural endpoint relation** (rows 11–14, an `SG-R` obligation). **CD-4/CD-5** fix construction layers `L0`…`L5` and permit citation only to a strictly earlier layer, with one `L2`→`L2` exception. **`CD-01`** requires the `CitationDependencyGraph` **acyclic**. **CD-7** states the cycle behaviour: every member ineligible, every member a seed, joint scope fails closed, typed error naming all members, **no selection**. **CD-8** prohibits iteration-to-stable and every precedence rule and **records why a DAG was chosen over a fixed-point calculus**. **CD-9** proves stratification and termination. **BI-44**, **ADR-27**, **DB-08c**, **AT-31**, §9.5.6.9. | §1, §4 (BI-44), §5, §9.3.5 (CS-7, CS-8), **§9.3.5.1 (new)**, §9.3.6 (FS-7), §9.3.7 (Case N), §9.3.9, §9.5.3 (IQ-18), §9.5.4, §9.5.5 (QS-9), §9.5.6.9, §23.1, §25.5, DB-08c, AT-31, ADR-27, §32 | R-B-02, R-B-10, R-B-13, **P-14**, P-01, P-13; BI-02, BI-03, BI-15, BI-24 | **AC** (the graph) + **IC** (removes an undefined recursion) | edge representation, write-time layer check → **B1S / B2S** | **Write-time enforcement of `CD-01` is partial by construction** — an edge whose endpoints are not yet persisted cannot be layer-checked at write, so that fraction rests on the **E-B** read path and inherits §18.3's verifier precondition (DB-08c, BI-32) |
| **JBA16-AUD-02** | **CLOSED** | §9.3.8 claimed exhaustiveness over **fourteen** rows while this document elsewhere names **source-native relation records** (§14.1, §23.1, AU-3), **typed decomposition-ambiguity records** (DC-02a), **non-grounding emission markers** (CE-2, CE-3), **affected-scope records**, **structural-admission records** and **integrity-error history records** (§9.5.7.1, IQ-10). The claim was **false as written**, and `AM-10` could be invoked to excuse an already-defined class. | **§9.3.8 reissued as a closed registry.** **§9.3.8.1** — **twenty-two** class rows *(twenty-one plus V1.8's `LateActualTransactionFactSatellite`)* answering questions 1–5 (tier/layer · projection participation · seed capability · **exact** scope derivation · **exact** failure consequence). **§9.3.8.2** — questions 6–8 (citation participation per CD-3 · disposition-control eligibility per **IQ-16** · deletion behaviour, stated once **by reference to the frozen §16 model** and then only where class-specific). **§9.3.8.3** — a **subsumption and exclusion register** disposing of every other logical name in this document, including the sixteen adjudication kinds, `AGGREGATE_INCONSISTENCY_OBSERVATION`, the joint-sufficiency basis, the merchant and occurrence projections, the re-adjudication marker, the privacy tombstone, `qid`, the allocation ordinal, and every upstream A2/M7/C1 entity. **`AM-10a`** forbids using `AM-10` for a named class; **`AM-10b`** extends the same rule to reference roles. **FS-9**/**QS-8** make every Tier 4 class non-seeding, which is what keeps the seed finite. | §1, §5, **§9.3.8 (rewritten)**, §9.3.6 (FS-9), §9.5.5 (QS-8), §9.5.4, §25.5, DB-08b, AT-33, AT-34, §32 | R-B-10, R-B-13, P-06a, P-13 | **IC** (withdraws a false claim) + **AC** (the registry) | physical representation; schema-to-registry reconciliation → **B1S / B2S** | **The registry is closed as of this revision only.** Its continued exhaustiveness depends on `AM-10`/`AM-10a` being honoured by B1S and B2S, and on `AT-33`'s schema-to-registry reconciliation actually running (DB-08b) |
| **JBA16-AUD-03** | **CLOSED** | §9.3.3.3's fold is set-valued and `MQ-2`/`MQ-5` require `N > 1`, while §23.1 read **`0..1` active quarantine per record**. **Two normative statements, mutually exclusive.** | **§23.1 aligned to the fold**, which the V1.6 audit accepted: **`0..N` active quarantines per target record**, each with its own `qid`; a rescission names **exactly one**. Three further rows are added — **rescission ↔ quarantine**, **quarantine ↔ disposition event**, **semantic citation ↔ cited record** — so the matrix now states every multiplicity the fold relies on. The **`0..1` reading is expressly withdrawn**. §9.3.3.3's property table, §5, DB-08a, §25.5 and **AT-23n** state the same number, and **DB-08a carries an `E-D` obligation for the absence of any `0..1`-shaped column or constraint**. | §1, §5, §9.3.3.3, **§23.1**, §18.7 (DB-08a), §19.5 (AT-23n), §25.5, §32 | IQ-1, IQ-7, DE-1, DE-2, MQ-2, MQ-5; **P-14** | **IC** (removes a contradiction) | cardinality representation → **B2S** | **None semantic.** The residual risk is representational: a physical schema could still encode `0..1`. `AT-23n` and DB-08a's **E-D** obligation exist precisely to detect that |
| **JBA16-AUD-04** | **CLOSED** | V1.6 chose **YES** — disposition events are themselves quarantine targets (DE-8, IQ-3) — but `DISPOSITION_EVENT_ADMISSIBLE(e)` **never consulted whether `e` is quarantined**, so **quarantining `Qbad` had no operative effect**. Recursive disposition had **no well-foundedness rule**: self-target, ancestor-target and `Q1→Q2→Q1` were unprohibited, and DS-5's termination argument was **circular**. | **The YES is retained and made executable.** §9.3.3.2 separates **`DISPOSITION_EVENT_STRUCTURALLY_VALID`**, **`DISPOSITION_EVENT_GENERATION_AUTHORIZED`** and **`DISPOSITION_EVENT_CURRENTLY_QUARANTINED`** and derives **`DISPOSITION_EVENT_EFFECTIVE`**; **§9.3.3.3's fold now tests `EFFECTIVE`, not `ADMISSIBLE`** — the one-word repair. **§9.3.3.7** defines the **`DispositionControlGraph`**, requires it **acyclic** (**`DG-01`**), makes **self-target** (DG-2) individually structurally invalid and **rejects a proposed ancestor-target edge prospectively at write time** (DG-3, narrowed in V1.8), states the **cycle behaviour** (DG-4, DG-5: no member acts, ultimate scientific targets fail closed, **no winner and no recency**), defines **control depth** (DG-6) and **proves termination and uniqueness** (DG-7, DG-8). **DG-9/DE-12** forbid the disposition layer reading the citation layer, which is what makes the whole composition stratified. **§9.3.3.8** discharges **`DCG-1`…`DCG-8`**. **`IQ-15`** adds `CONTROL_BASIS_FALSE` — the record-level basis, **available against a quarantine only** — without which `DCG-2` would be unreachable. **BI-45**, **ADR-28**, **DB-08d**, **AT-32**, §9.5.6.8, §9.5.6.10. | §1, §4 (BI-45), §5, **§9.3.3.2**, §9.3.3.3, §9.3.3.5 (MQ-9, MQ-10), §9.3.3.6 (AN-1a, AN-5), **§9.3.3.7 (new)**, **§9.3.3.8 (new)**, §9.3.4 (VD-6, VD-7), §9.3.6 (FS-8), §9.3.7 (Cases M, N), §9.3.9, §9.5.3 (IQ-13, IQ-15, IQ-16, IQ-17, IQ-19), §9.5.4, §9.5.5.1 (DS-5, DS-7), §9.5.6.7, §9.5.6.8, §9.5.6.10, §23.1, §25.5, DB-08a, DB-08d, AT-32, ADR-28, §32 | R-B-10, R-B-13, **P-14**, P-06a, P-10, P-13; BI-15, BI-30, BI-35, BI-40 | **AC** (the predicate and the graph) + **IC** (makes an already-chosen rule operative) | fold implementation, write-time self/ancestor check → **B2S** | **Same shape as `JBA16-AUD-01`.** Self-target is fully **E-A**; a longer ancestor chain is checkable at write only where already persisted, so the remainder rests on the **E-B** read path under §18.3 (DB-08d) |

**All four findings were CLOSED as of V1.7.** None was closed by relabelling, none left a semantic choice downstream, and **none reopened anything the V1.6 audit accepted.**

## D.1 The V1.8 addendum — three defects an independent audit found in the V1.7 candidate

An independent inspection of the V1.7 candidate (worktree blob `c00ff0e1c36633dd56a5a48a6aed0130618fae54`) found `JBA16-AUD-03` genuinely CLOSED but reopened `JBA16-AUD-01`, `JBA16-AUD-02` and `JBA16-AUD-04` on three defects V1.7 did not have a repair for. This addendum is the **complete, surgical** repair; it changes no accepted V1.6 semantic and reopens nothing else.

| Finding | V1.7 defect found by the independent audit | V1.8 repair | Sections touched |
| :-- | :-- | :-- | :-- |
| **`JBA16-AUD-01`** | CD-3 row 8 **required** `AGGREGATE_INCONSISTENCY_OBSERVATION` (`L2`) to cite `ExposureFact` (`L5`) as factual basis, but CD-5 **permitted only** a strictly-earlier-layer citation (plus the `L2`→`L2` exception) — the required citation was itself prohibited. | A single **named** exception, **`CD-5a`**: `AGGREGATE_INCONSISTENCY_OBSERVATION → ExposureFact` alone may cite `L2 → L5`. Proved not to reopen recursive eligibility, because `ExposureFact` cites only `WeeklyExposureReport` (CD-3 row 10) and never a `ReconciliationAdjudication`, so no path returns to the citing adjudication. **Not** a general forward-citation rule. | §9.3.5.1 (CD-3 row 8, new `CD-5a`), §18.7 DB-08c, Part M M-11 |
| **`JBA16-AUD-02`** | §10.1, §24, §25.3 and §28.2 each required a persisted **late-known / actual-transaction satellite** on `PurchaseOccasion`, but no such class appeared in the §9.3.8 registry — its seed, citation, disposition and deletion treatment were undefined, and `AM-10a` forbids curing this via `AM-10`. | New registry row 22, **`LateActualTransactionFactSatellite`** — Tier 1, preservation-only: append-only, bound to an existing `PurchaseOccasion`, no canonical scalar, no current selection rule, **not** projection-input-eligible, **not** seed-eligible, inert disposition-control target; any future scalar projection requires an accepted `O-11` amendment first. Registry count **21 → 22**. | §9.3.8.1 (row 22), §9.3.8.2 (row 22), §9.3.8.3, §10.1, §24, §25.3, §28.2, `AM-10a`/registry-count cross-references |
| **`JBA16-AUD-04`** | DG-3 classified an **ancestor-target** as individually, record-level `SG-R`-invalid **by reachability in the completed graph** — so in an already-persisted `Q1 → Q2 → Q1`, both members satisfied DG-3 and were individually invalid, letting an integrity operator choose which one to quarantine. This is exactly the `JBA13-AUD-01` winner-selection defect, reintroduced. | **DG-3 narrowed to a prospective, write-time-only admission test**: it rejects a *proposed* edge that would close a cycle against the *currently persisted* graph, and establishes nothing about any event already persisted. DG-4 alone governs an already-persisted cycle: every member ineffective, none individually excludable by cycle membership alone. DG-2 (self-target) restated as an explicitly record-level invariant that never generalizes to, or from, DG-3/DG-4. | §9.3.3.7 (DCG box, DG-2, DG-3, DG-4, DCG-6), §9.5.6.10 Case J, §18.7 DB-08d, Part M M-12 |

**`CONTROL_BASIS_FALSE` (`IQ-15`, `VD-7`) is carried unchanged** — the independent audit accepted it in isolation; only its cross-references to the renarrowed DG-3 move, and its target domain (a `StructuralIntegrityQuarantine` only) is not widened. **`JBA16-AUD-03`'s `0..N` cardinality is carried CLOSED, byte-for-byte, and is not touched by this addendum.**

---

# PART E — NON-REGRESSION AND RE-CLOSURE AUDIT

## E.1 The affected and history-critical findings, re-proved against their ORIGINAL defects

**Method and scope.** The V1.6 audit accepted everything except O-06a. This section therefore re-proves **only** the findings this patch could plausibly affect — those whose closure machinery V1.7 touches — **against their original defects**, not against V1.6's wording. **No regression was found in any of them, so no wider narrative is regenerated.**

| Finding | **Original** defect | Mechanism in V1.7 | Re-proof against the original defect | Status |
| :-- | :-- | :-- | :-- | :-- |
| **JBA16-AUD-01** | Citation dependency was a recursive equation with no semantics, over an unspecified edge set; **an independent audit of V1.7 then found CD-5's layering itself contradicted CD-3 row 8's required citation (D.1)**. | CD-1…CD-11, `CD-01`, `CD-5a`, ADR-27, DB-08c, AT-31. | **The edge set is now closed** (CD-3 enumerates all twenty-four reference roles) **and the recursion is now well-founded** (`CD-01` + CD-5's layering ⇒ structural recursion, CD-6). **A cycle has a stated, selection-free consequence** (CD-7) and **iteration is prohibited, not merely unused** (CD-8). **The one legitimate forward citation CD-5 could not admit now has a single named exception (`CD-5a`), proved not to reopen recursion.** `AT-31` fails a design that admits, drops, iterates or ranks. | **CLOSED** |
| **JBA16-AUD-02** | The record-class table omitted six classes the architecture names, while claiming exhaustiveness; **an independent audit of V1.7 then found a seventh omission, the actual-transaction satellite (D.1)**. | §9.3.8.1 (22 rows × 5 questions), §9.3.8.2 (3 further questions), §9.3.8.3 (subsumption/exclusion), `AM-10a`, `AM-10b`, AT-33. | **All seven named omissions now have rows** — the original six plus V1.8's `LateActualTransactionFactSatellite` — and the claim is no longer *"every class appears"* but *"every class appears **or** is disposed of in §9.3.8.3"* — a claim a reader can **falsify by finding one name that is neither**. `AT-33` makes the reconciliation an **executable** check rather than a review artifact. | **CLOSED** |
| **JBA16-AUD-03** | §23.1 and §9.3.3.3 stated contradictory quarantine cardinalities. | §23.1 rewritten to `0..N`; DB-08a `E-D` for the absence of a `0..1` shape; AT-23n. | **One number now appears in all six places** it is stated (§5, §9.3.3.3, §18.7, §23.1, §25.5, §19.5). The **fold** was authoritative and is unchanged; only the matrix moved. `AT-23n` fails any representation that can hold one quarantine. | **CLOSED** |
| **JBA16-AUD-04** | Quarantining a disposition event had no operative effect, and recursive disposition had no well-foundedness rule; **an independent audit of V1.7 then found DG-3 reintroduced the `JBA13-AUD-01` winner-selection defect by treating ancestor-reachability in the completed graph as an individual, record-level invalidity (D.1)**. | `DISPOSITION_EVENT_EFFECTIVE`, `DG-01`, DG-2…DG-9, IQ-15, `DCG-1`…`DCG-8`, ADR-28, DB-08d, AT-32. | **The fold now tests `EFFECTIVE`**, so a suppressed event **stops acting** and its target **recomputes** (`DCG-2`) — the exact behaviour V1.6 declared and did not implement. **Termination is proved on control depth over a finite DAG** (DG-8), replacing V1.6's circular DS-5 argument. **Self-target is individually invalid (DG-2); a proposed ancestor-target edge is rejected only prospectively, at write time, against the currently persisted graph (DG-3); an already-persisted cycle is governed solely by DG-4, with no member individually excludable by cycle membership alone.** | **CLOSED** |
| **JBA15-AUD-01** | The seed ranged over a domain wider than the scope function's. | `INTEGRITY_SEED_ELIGIBLE`, FS-5, QS-7 — **carried unchanged**; **extended** by FS-7, FS-9, QS-8. | **Not regressed, and strengthened.** V1.7 adds **two** new seed sets (citation cycle, control cycle) and proves each ranges only over classes with a defined `SCOPE` (FS-7 via CD-11; FS-8 via DG-4). It also **closes the remaining hole in the same shape**: FS-9/QS-8 make every **Tier 4** class non-seeding, so **recording a fail-closed scope cannot seed another** (`AT-34`). `SD-1` and `AT-23j` unchanged. | **CLOSED — not regressed** |
| **JBA15-AUD-02** | Disposition state was a primitive boolean, leaving multi-quarantine and forged-event semantics undefined. | DE-1, DE-2, the set fold, MQ-1…MQ-10, RV-1…RV-10, AN-1…AN-5. | **Not regressed, and completed.** The fold's shape is unchanged; **one conjunct is added** to its membership test (`EFFECTIVE`), and **two rows** to its composition table (MQ-9, MQ-10). Every V1.6 answer still follows from set semantics with **no precedence rule**: `DQ-2` from single-target rescission, `RV-5`/`RV-7` from set membership, `DQ-5`/`DQ-6` from admissibility, `MQ-3` from existential `VALID_DISPOSITION`. | **CLOSED — not regressed** |
| **JBA15-AUD-03** | RS-1 described an `SG-R` determination that could not decide SG-03…SG-06. | AX-5, corrected RS-1, aligned §5 / IQ-9a, AT-30 — **carried byte-identically**. | **Untouched, by instruction and in fact.** V1.7 changes no word of RS-1, AX-5, §9.4.1 or `AT-30`. The new `DISPOSITION_EVENT_STRUCTURALLY_VALID` **uses the same formulation** — it inspects the event and what it explicitly references, independent of survivors — so the corrected rule is applied, not restated differently. | **CLOSED — not regressed** |
| **JBA14-AUD-01** | The seed included **validly quarantined** records, making recovery unreachable. | FS-1, Case C, §9.5.6.2 — unchanged. | **Not regressed.** `VALID_DISPOSITION` still removes its record from the first seed set. **V1.7 makes recovery reachable in one more situation**, not fewer: an erroneous-but-authorized quarantine can now be neutralised on evidence (`DCG-2`, IQ-15) rather than only by the actor who wrote it. `AT-23g` unchanged and still governing. | **CLOSED — not regressed** |
| **JBA14-AUD-02** | §18.4.4 falsely claimed S-1 **and S-2** satisfy `DB-03B` through inherited A2 mechanisms. | §18.4.4–§18.4.7, §18.5, BI-38, ADR-24 — **carried unchanged**. | **Untouched.** V1.7 changes nothing in the S-2 contract. `DISPOSITION_EVENT_GENERATION_AUTHORIZED` explicitly restates **BI-38** — an event's authorization is never inherited from its target or from any record it names — so the invariant is **applied again**, in the one place V1.6's new machinery could have leaked it. `AT-27a`/`AT-27b`/`AT-29` unchanged. | **CLOSED — not regressed** |
| **JBA13-AUD-01** | A cycle repair let the integrity actor **select scientific state**. | `IQ-9a`, `IQ-9c` — **frozen and unchanged**; `AT-23c`. | **Re-checked against the original defect, and the principle is now applied three times.** `IQ-9c` for `SG-S`, **`IQ-18`** for a citation cycle and **`IQ-17`** for a control cycle all give the **same** answer: no member is individually excludable, so **no quarantine is admissible and the scope stays fail closed**. `IQ-15`'s new basis is **not** a route around this — it is available only against a quarantine, and only on the target's own axes. `AT-23c` unchanged. | **CLOSED — not regressed** |
| **JBA13-AUD-02** | Two contradictory admission rules, and validation after admission. | §9.3.1's axes, §9.3.2's four predicates, §9.3.9's ordered fold. | **Re-derived over the stratified fold.** There is still **exactly one** answer per question, the questions are still **typed**, and validation still precedes eligibility — now with the order **proved** rather than presented (CD-9's five strata). **Nothing is eligible by default** (TE-1, TE-8). `AT-28` unchanged. | **CLOSED — not regressed** |
| **JBA13-AUD-06** | Authorship was classified **E-B**, which cannot detect a coherent forgery. | `DB-03B` **E-E**, TG-1…TG-5, BI-37, BI-38 — carried. | **Re-checked and widened once more.** `DB-03B` remains **E-E**, and the `GENERATION_AUTHORIZED` axis it evaluates now gates disposition events **at two levels**: whether an event may act at all (IQ-13) and whether an event may **suppress another event** (`DCG-7`, `DCG-8`). A forged actor can neither remove a valid input nor silence a valid quarantine. `AT-27` unchanged; `AT-32` added. | **CLOSED — not regressed** |
| **JBA-AUD-07** | `SG-07`/`SG-09` mutually inconsistent, and no-resurrection relied on unexplained state. | §9.4.1's levelling; `SG-10` over `PROJECTION_INPUT_ELIGIBLE`; the derived fold. | **Re-derived, and the last unexplained step is gone.** `RETIRED` is a pure predicate over `PROJECTION_INPUT_ELIGIBLE`, which is now a **provably terminating** function of two axes, an acyclic control fold and an acyclic citation recursion. **No primitive and no undefined recursion remains anywhere in the chain** (CD-9). `SG10-1`…`SG10-6` and `DQ-1`…`DQ-6` re-test it. | **CLOSED — not regressed** |
| **JBA-AUD-12** | Enforcement claims exceeded their mechanisms. | Five classes; **DB-08c and DB-08d new**; DB-08a and DB-08b extended. | **Re-checked against the original defect — the one V1.6 partly recommitted.** V1.6 claimed exhaustiveness (§9.3.8) and termination (DS-5) **without a mechanism for either**. V1.7 gives both a **stated proof obligation with a test that can fail**: `DB-08b` now carries an **E-D** obligation for the **absence of any persisted class without a registry row**, discharged by `AT-33`; `DB-08c` and `DB-08d` carry **E-A/E-B/E-D** obligations for the two acyclicity invariants, discharged by `AT-31` and `AT-32`, **each of which fails a design that times out, diverges or oscillates**. | **CLOSED — not regressed** |
| **JBA-AUD-22** | `SG-07` and `SG-09` could not both hold. | §9.4.1; `IQ-9a`/`IQ-9b`; FS-1; the typed seed. | **Re-derived.** `SG-09`'s *"no projection for the affected scope"* is well-defined for **every** seed member, now including the two new cycle sets — each of which has a **joint** scope by QS-9 rather than an undefined or per-member one. | **CLOSED — not regressed** |
| **JBA12-AUD-08** | **No recovery model** existed for malformed Model-B data. | Cases A–J of §9.5.6. | **Re-checked and extended.** The model is **reachable** (V1.5), **total over the classes** (V1.6) and now **total over the failure shapes**: **ten** dispositional situations, adding the erroneous-but-authorized event and its suppression (§9.5.6.8) and the two cycle cases (§9.5.6.9, §9.5.6.10). **Each states whether recovery is possible and by exactly what act.** | **CLOSED** |
| **JBA12-AUD-12** | DB-03's per-source classification was deferred while §18 claimed completeness. | §18.4.6, §18.4.7, §18.5's five columns — carried; TG-5. | **Re-checked.** The S-2 rule, its ownership and its standing default are unchanged. §9.3.8.2's **column 6 and column 7** now state, for **every** class, its citation and disposition-control participation — so **no class that can affect an authoritative projection lacks a stated obligation**, in either dimension. | **CLOSED** |

## E.2 Frozen-area non-regression register

The independent audits accepted twenty-four areas, plus everything V1.6 added that the V1.6 audit did not reopen. Each is verified present and unchanged.

| # | Frozen area | Verified at | Changed? |
| :-- | :-- | :-- | :-- |
| 1 | `JBA14-AUD-02` closed; **S-2 trusted-generation semantics** | §18.4.4–§18.4.7, §18.5, ADR-24 | **No** |
| 2 | **O-01 CLOSED VALIDLY** | Part F | **No** |
| 3 | status-label discipline — all seven bare labels non-grounding | BI-23, §7.3, §7.4, Part G | **No** |
| 4 | source taxonomy — levels, scopes, domains | §6.2, §6.3, §6.4, §6.4.1 | **No** |
| 5 | **JD-4** authorship-domain gate | §6.8.4, FC-10, BI-33, Part H | **No** |
| 6 | **S-1 handling** — inheritance scoped, not withdrawn | §18.4.5 | **No** |
| 7 | assertion unity | AU-1…AU-6, §8.2 | **No** |
| 8 | deterministic candidate emission `CE-1…CE-7` | §8.2.6, Part I | **No** |
| 9 | B1/B2 boundary — B1 performs no reconciliation | BI-24, §8.4, Part I | **No** |
| 10 | RT-09 entity-only reach | §7.2, §23.2 | **No** |
| 11 | cluster ontology — Type A / Type B, `L ≥ 1` | §9.7, BI-29, Part J | **No** |
| 12 | Rev 2 §6.A scope — plausible-duplicate only | §9.7.3, §22.3 | **No** |
| 13 | factual bounds firewall | SB-1…SB-5, §22.4 | **No** |
| 14 | merchant semantics | §13, ADR-8′ | **No** |
| 15 | **`SG-R` / `SG-S` classification** | §9.4.1's table | **No** |
| 16 | **`IQ-9a` / `IQ-9b` basis-versus-consequence** | IQ-9a, IQ-9b, BI-40 | **No** — `IQ-15` adds a **third basis kind against quarantines only**, on the same independence standard |
| 17 | **valid forged-edge recomputation** | §9.4.4.1, RS-2…RS-4, `SG10-3`, `DQ-1` | **No** |
| 18 | **set-level no-arbitrary-quarantine; terminal `SG-S` fail-closed** | IQ-9c, §9.5.6.3, `SG10-4`, `SG10-5`, AT-23c | **No** — **and the same rule is now applied to both new cycle kinds** (IQ-17, IQ-18) |
| 19 | opaque identity / O-16 | §11, ADR-2, DE-1 | **No** |
| 20 | legal deletion / O-17 | §16, IQ-10, §16.9, Part L | **No** — §9.3.8.2 column 8 refers to the frozen model and adds nothing to it |
| 21 | temporal architecture / O-15 | §15 | **No** — **and §9.3 still consults no ordering at all** (DF-2) |
| 22 | B/C firewall | §22, Part N | **No** |
| 23 | administrative threat boundary | §19.2–§19.4, Part M | **No** |
| 24 | rejected-B1 non-import | §30 | **No** — one further divergence recorded |
| **25** | **`JBA15-AUD-01` — typed eligibility, the typed seed, `CITATION_SOUND`, BI-41, BI-42, ADR-25** *(accepted at V1.6)* | §9.3.2, §9.3.5, §9.3.6 | **No** — **extended**, never narrowed (FS-7, FS-9, QS-8) |
| **26** | **`JBA15-AUD-02` — the content-addressed fold, `qid`, single-target rescission, MQ/RV/AN, BI-43, ADR-26** *(accepted at V1.6)* | §9.3.3, §9.3.4 | **No** — **one conjunct added** to the membership test; no rule withdrawn |
| **27** | **`JBA15-AUD-03` — the corrected `RS-1`, AX-5, `AT-30`** *(accepted at V1.6)* | §9.3.1, §9.4.1, §9.4.4.1, §5 | **No — byte-identical** |

## E.3 Cumulative status

```
JBA16-AUD-01..04 : 4 of 4 CLOSED                                    (Part D)
Re-proved against ORIGINAL defects (affected + history-critical):
    JBA16-AUD-01, -02, -03, -04
    JBA15-AUD-01, -02, -03
    JBA14-AUD-01, -02
    JBA13-AUD-01, -02, -06
    JBA-AUD-07, -12, -22
    JBA12-AUD-08, -12                    -- 17 of 17 CLOSED         (Part E.1)
Frozen areas      : 27 of 27 verified present and unchanged         (Part E.2)
Other prior findings: JBA-AUD-01..30, JBA12-AUD-01..15,
                      JBA13-AUD-03..05, -07 -- carried, 0 regressed
REGRESSIONS FOUND : 0
```

---

# PART F — JBA OPEN-ITEM CLOSURE MATRIX

**Legend.** **IC** inherited conclusion · **HR** carried human-ratified constraint · **AC** JBA architecture choice.

The V1.6 audit found **O-01 CLOSED VALIDLY** and **O-06a** the only remaining question. V1.7 closes **O-06a** against the **eighteen-item** standard of F.1; the other twelve are carried and **not reopened**.

| Open item | Decision | Authority basis | Choice vs constraint | Downstream owner |
| :-- | :-- | :-- | :-- | :-- |
| **O-06a †** *(the V1.7 target)* | **CLOSED VALIDLY.** Append-only adjudication log, sixteen typed kinds; **three independent record axes** (§9.3.1); **four typed eligibility predicates** (§9.3.2); a **content-addressed append-only disposition fold over EFFECTIVE events**, yielding `ACTIVE_QUARANTINES`, `CURRENTLY_QUARANTINED` and `VALID_DISPOSITION` as **derived** values (§9.3.3, §9.3.4); an **acyclic `DispositionControlGraph`** with **proved termination** and total disposition-of-disposition semantics (§9.3.3.7, §9.3.3.8); the **`CITATION_SOUND` dependency rule** over an **acyclic, classified `CitationDependencyGraph`** with **proved termination** (§9.3.5, §9.3.5.1); a **typed fail-closed seed whose every member has a defined `SCOPE`** (§9.3.6); **fourteen exhaustive cases** for projection-input records (§9.3.7); a **closed twenty-two-class registry answering eight questions, with every other logical name subsumed or excluded** (§9.3.8); the **stratified projection fold** (§9.3.9); two-level `SG-R`/`SG-S` validation (§9.4.1, unchanged); `SG-10` over eligible edges with the recomputation proof (§9.4.4); record-level quarantine with `IQ-1…IQ-19`, the frozen `IQ-9a`…`IQ-9d`, and **no remedy by selection for any set-level violation, structural, citational or control**; the **minimal deterministic scope** including §9.5.5.1 and QS-9; a **total ten-case recovery model** (§9.5.6); integrity history under the deletion override; coherence rules FC-01…FC-11. **The mechanism is typed, total, deterministic, replayable, append-only, executable, terminating, stratified, pure over its authoritative persisted history, and free of implicit selection.** | R-B-10, R-B-13, HR-B-03, **P-14**, **P-06a**, P-05, P-10, P-13, Rev 2 §6.A, O-06a | **AC** (typing, fold, citation rule, tiering, the two graphs) over **HR** (append-only, no implicit selection) and **IC** (removing a false totality claim, an undefined recursion and a contradiction) | algorithm, incremental validation, disposition and recomputation workflow, write-time graph enforcement → **B2S** (O-06c) |
| **O-01** | **CLOSED VALIDLY** *(carried, accepted)*. Nine-class taxonomy on three axes; participant ceiling binds the author; AL-3 = S-5 only; **every class carries a complete, non-inherited `DB-03A`/`DB-03B` contract with its own mechanism owner and absent-proof consequence** (§18.5); the S-2 rule stated once (§18.4.6); S-1 audited and scoped (§18.4.5); **`BI-38`** forbids reading protection off a reference chain. **Consistency edit only:** §9.3.8.2 states each S-class row's citation and disposition-control participation. | R-B-01, R-B-03, R-B-06, **R-B-08**, HR-B-08, P-01, **P-10**, P-13, P-14, P-15, **P-18**, RT-09, RT-13, Rev 2 §6.B/§6.C/§6.D, Phase 0A-2 §21/§23/§26/§40 | **AC** over **HR** and **IC** | per-class mechanism → **B1S**; **S-2 via the M7 ingestion integration contract** (OP-5) |
| **O-02** | **CLOSED VALIDLY** *(carried)*. B1 consumes `Outcome`, never owns it; no bare label grounds anything; payload multiplicity inferred in neither direction; label triage excluded from every basis. **Consistency edit only:** §9.3.8.3 states expressly that `Outcome` is **not a B-persisted class**. | R-B-01, R-B-03, P-01, P-13, O-13, RT-09, RT-11, A2 §44, Phase 0A-2 §21/§24 | **IC** over **AC** | representation and link re-proof → **B1S** |
| **O-03** | **CLOSED VALIDLY** *(carried)*. RT-09 bounds **entities only**; seven units separated; cardinality matrix with RP-1…RP-4. **Consistency edit only:** the quarantine row now reads `0..N`, and three rows are added (`JBA16-AUD-03`). | RT-09, RT-11, ratification §8.3, R-B-04, P-02, BI-28, BI-36 | **AC** over **IC** | physical FKs → owning effective spec |
| **O-04** | **CLOSED VALIDLY** *(carried)*. No canonical scalar. | O-04, O-11, P-14, P-19, A2 §44 | **AC** | representation → **B2S** |
| **O-06b-ARCH** | **CLOSED VALIDLY** *(carried)*. Preservation contract with three negative guarantees. **Consistency edit only:** CD-3 rows 15–24 confirm that every preserved reference is **inert for eligibility** — preservation grounds nothing, which is what the contract already said. | ratification **§5.1**, R-B-11, BI-21…BI-28, BI-31, BI-33, BI-36…BI-38 | **AC** | representation → **B1S** (O-06b-SPEC) — **must not be recombined** |
| **O-B-DISTINCTNESS** | **CLOSED VALIDLY** *(carried)*. Four factual outcomes; Type A `L ≥ 1`; Type B not a cluster. | ratification §8.1, Rev 2 §6.A amendment, R-B-11, P-12, P-12a, P-13 | **AC** over **IC** | implementable rule → **B2S** |
| **O-11** | **CLOSED VALIDLY** *(carried)*. Policy per projection (§28.2). | HR-B-03, P-14, P-06a, O-11 | **AC** over **HR** | spec projections → owning spec |
| **O-13** | **CLOSED VALIDLY** *(carried)*. Occasion exists before or atomically with any C1 object; no verdict in either direction. | R-B-03, JA-05, RT-10, RT-11, BI-21, BI-23, BI-31 | **AC** | restatement → **C1S** |
| **O-14** | **CLOSED VALIDLY** *(carried)*. Link structure; stance paired with scope; class-level `(level, scope, domain)`. **Consistency edit only:** CD-3 classifies every link and reference role, so *"what does this reference do to eligibility?"* now has a stated answer for each. | R-B-06, ratification §4.5, P-13, P-14, Rev 2 §6.D, R-B-02, R-B-11, BI-26, BI-28 | **AC** over **HR** | DDL → owning effective spec |
| **O-15** | **CLOSED VALIDLY** *(carried)*. Five time axes; no timestamp identity; knowledge horizon on every adjudication, quarantine **and rescission**; **§9.3 consults no ordering** (DF-2) — **and neither cycle rule may be resolved by recency** (CD-8, DG-4). | R-B-12, P-08, A2 §36, O-15 | **AC** over **IC** | fields/storage → owning spec |
| **O-16** | **CLOSED VALIDLY** *(carried)*. Opaque server-minted surrogates for every B identity, **including `qid`** (DE-1); no identity from business data or any key pair; provenance half **E-E**. | R-B-04, R-B-06, R-B-12, R-B-14, P-02, P-03, P-03a, P-09, P-10, Rev 2 §8 amendment | **AC** | generation mechanics → **B1S / B2S** |
| **O-17** | **CLOSED VALIDLY** *(carried)*. Authorization-gated exception; conditional residue in every case; mortal authorization; **the entire structural-integrity history subject to the same override** (IQ-10), the fold's behaviour under purge stated (RV-8, RV-9), **and §9.3.8.2 column 8 refers every class to the same frozen model**. | Rev 2 §6.E, ratification §4.2, P-05 verbatim, **P-05a**, O-17, A1 §21, BI-31 | **AC** over **IC** | mechanism → owning spec; legal sufficiency → controlling legal authority |

```
ALL THIRTEEN JBA-OWNED OPEN ITEMS: CLOSED VALIDLY.
  0 PARTIAL   0 CONTRADICTORY   0 OPEN
  O-06a : closed by ONE typed, total, deterministic, replayable, append-only,
          executable, TERMINATING and STRATIFIED composition (9.3, 9.4, 9.5)
          -- see the eighteen-item O-06a standard below.
  O-01  : carried, accepted, not reopened.
```

## F.1 The O-06a closure standard, item by item

O-06a may be declared ready only if the architecture supplies **pure total functions** for **eighteen** questions. Each is discharged **in this contract**, with **no downstream semantic choice remaining** and **no B2S decision required**.

| # | Required function | Supplied at | Pure? | Total? |
| :--: | :-- | :-- | :--: | :--: |
| 1 | **typed record domains** | the four predicates of §9.3.2; §9.3.8's tier and layer assignment | ✔ | ✔ — every class typed |
| 2 | **exhaustive persisted-class registry** | §9.3.8.1's twenty-two rows; §9.3.8.2's three further columns; **§9.3.8.3's subsumption and exclusion register**; `AM-10a`, `AM-10b` | ✔ | ✔ — **closed**, and falsifiable by finding one undisposed name |
| 3 | **citation dependency graph** | **CD-3's closed classification** of all twenty-four reference roles; CD-1, CD-2, CD-10 | ✔ | ✔ — every role classified |
| 4 | **citation cycle semantics / DAG rule** | **`CD-01`**; CD-4/CD-5 layering; **CD-7** cycle behaviour; **CD-8** prohibition on fixed-point iteration and precedence; §9.5.6.9 | ✔ | ✔ — acyclic case defined, cyclic case defined |
| 5 | **projection eligibility** | `PROJECTION_INPUT_ELIGIBLE` (§9.3.2), §9.3.7's fourteen cases | ✔ | ✔ — every axis combination |
| 6 | **integrity seed eligibility** | `INTEGRITY_SEED_ELIGIBLE` (§9.3.2), FS-5, FS-7, FS-8, **FS-9** | ✔ | ✔ — class-determined; Tier 1 and Tier 4 excluded |
| 7 | **deterministic scope** | §9.5.5's fixpoint; §9.5.5.1; QS-1…**QS-9** | ✔ | ✔ — defined for every seed member, joint for cycles |
| 8 | **quarantine identity and cardinality** | DE-1's `qid`; **§23.1's `0..N`**; §9.3.3.3's property table; DB-06, DB-08a | ✔ | ✔ — one number, stated in six places |
| 9 | **rescission identity and target semantics** | DE-2; RV-1…RV-10; §23.1's rescission row | ✔ | ✔ — ten cases including purge |
| 10 | **disposition-event eligibility** | `DISPOSITION_EVENT_STRUCTURALLY_VALID` / `_GENERATION_AUTHORIZED` / `_ADMISSIBLE` (§9.3.3.2), DE-6…DE-9 | ✔ | ✔ — three separated predicates |
| 11 | **disposition-of-disposition semantics** | **`DISPOSITION_EVENT_EFFECTIVE`** (§9.3.3.2), DE-10, DE-11, MQ-9, MQ-10, **`DCG-1`…`DCG-8`** (§9.3.3.8), §9.5.6.8, **`IQ-15`** | ✔ | ✔ — eight required cases, all answered |
| 12 | **disposition-control cycle semantics** | **`DG-01`**; DG-2…DG-5; **DG-6…DG-8's termination proof**; IQ-17; §9.5.6.10 | ✔ | ✔ — acyclic case proved, cyclic case defined |
| 13 | **active quarantine fold** | §9.3.3.3's set comprehension over **effective** events; DF-1…**DF-4** | ✔ | ✔ — total over records **and** events; `∅` for Tier 1/4 |
| 14 | **valid disposition** | §9.3.4, existential over the active set with `BASIS_HOLDS` and `CONTROL_BASIS_FALSE`; VD-1…VD-7 | ✔ | ✔ — MQ-1…MQ-10 cover composition |
| 15 | **anomaly versus harmful seed** | §9.3.3.6's **structural** definition — `OPERATIVE`, `HARMFUL`, `ANOMALY`; **AN-1a**; AN-2…AN-5; IQ-14 | ✔ | ✔ — decided from axes and graphs, never from a preferred result |
| 16 | **`SG-R` / `SG-S`** | §9.4.1's table and levelling; AX-5's determination rule; **RS-1 as corrected and carried** | ✔ | ✔ — seven invariants, two levels |
| 17 | **`SG-10`** | §9.4.4 over `PROJECTION_INPUT_ELIGIBLE`; §9.4.4.1's proof | ✔ | ✔ — `SG10-1`…`SG10-6`, `DQ-1`…`DQ-6` |
| 18 | **legal deletion interaction** | §16; IQ-10; §16.9; RV-8, RV-9; §9.5.7.1, §9.5.7.2; **§9.3.8.2 column 8** | ✔ | ✔ — every class referred to one frozen model |

> **What remains downstream is representation only** — physical tables, fields, indexes, APIs, the write-time enforcement of `CD-01` and `DG-01`, and the concrete mechanisms that produce `DB-03B` provenance. **No semantic choice among the eighteen above is left to B1S or B2S.**

## F.2 Authority for every V1.7 decision — and the escalation test

| V1.7 decision | Owning open item | Accepted constraints | Classification | Outside JBA authority? |
| :-- | :-- | :-- | :-- | :-- |
| Reference classification into three kinds | **O-06a**, **O-14** | R-B-02, R-B-11, P-13 | **AC** | **No** |
| `CitationDependencyGraph` required acyclic | **O-06a** | **P-14**, P-01; BI-02, BI-03, BI-24 | **IC** — B1-before-B2 and no-self-grounding are already accepted | **No** |
| Citation cycle fails closed, no fixed point | **O-06a** | **P-14**, BI-15; the accepted `IQ-9c` failure shape | **IC** | **No** — choosing a member would be the selection P-14 forbids |
| Closed twenty-two-class registry | **O-06a** | R-B-10, R-B-13, P-06a | **AC** | **No** |
| Tier 4 classes cannot seed | **O-06a** | **P-06a** — a derived record is never authority | **IC** | **No** |
| Quarantine cardinality `0..N` | **O-03**, **O-06a** | IQ-1, IQ-7, DE-1; the fold accepted at V1.6 | **IC** — the matrix is aligned to the accepted fold | **No** |
| `DISPOSITION_EVENT_EFFECTIVE` | **O-06a** | R-B-10, R-B-13, **P-14**; DE-8, IQ-3 as accepted at V1.6 | **IC** — it implements a choice already made | **No** |
| `DispositionControlGraph` required acyclic | **O-06a** | **P-14**, P-06a | **AC** | **No** |
| Control cycle fails closed, no winner | **O-06a** | **P-14**, BI-15; the accepted `IQ-9c` failure shape | **IC** | **No** |
| `CONTROL_BASIS_FALSE` (IQ-15) | **O-06a** | R-B-10, R-B-13, **IQ-9a**'s independence standard, BI-30 | **AC**, tightly scoped | **No** — it is available only against a quarantine and only on the target's own axes |
| Structural definition of harm (AN-1a) | **O-06a** | **P-14**, P-13 | **AC** | **No** |
| Termination proofs (CD-9, DG-8) | **O-06a** | R-B-10, R-B-13 | **AC** | **No** |

```
HUMAN SEMANTIC DECISION REQUIRED : NONE
```

**Why no escalation is warranted.** Every repair either **constructs** something a prior revision asserted, **withdraws** a claim that could not hold, **removes** a contradiction between two of this document's own statements, or **implements** a choice already made and accepted. The two acyclicity invariants are the accepted **B1→B2 construction order** and the accepted **append-only control model** stated as graph properties; the two cycle behaviours are the accepted **`IQ-9c`** failure shape applied to two further set-level violations; the registry is the accepted **P-06a** discipline applied class by class; and `0..N` is the accepted fold's own cardinality. **No new authority is created, and no accepted clause is contradicted, narrowed or extended.**

---

# PART G — OUTCOME / STATUS SEMANTIC PROOF *(frozen area — carried)*

Phase 0A-2 §21 enumerates `intended · attempted · self-reported · evidence-submitted · evidence-verified · failed · abandoned` and **defines none of them**. **All seven are non-grounding on the label alone**; grounding comes only from an **explicit assertion present in the authoritative representation** or an **independently present, linked, re-provable domain object**; the **verdict is never read**; `failed` and `abandoned` are **UNKNOWN, never negative** (P-13). The four-way distinction — bare label / linked object / explicit payload assertion / inferred semantics — is unchanged (BI-23).

> **V1.6 interaction, not a change.** For **S-2**, `DB-03B` remains a **precondition reached before** these rules (§18.4.6), and §9.3.2 now makes the resulting *"preserved, non-grounding"* outcome an **executable state**. **Passing `DB-03B` never converts a bare label into a fact** (`AT-27b`).

```
UNDEFINED-STATUS SEMANTIC INVENTION: NONE      STATUS-LABEL ASYMMETRY: NONE
```

---

# PART H — AUTHORSHIP, AUTHORITY AND JOINT-SUFFICIENCY PROOF *(frozen area — carried)*

| # | Property | Proof |
| :-- | :-- | :-- |
| **H-1** | Authority attaches to **factual authorship** only; `collectionMethod` is transport; `RESEARCHER` collection does not imply researcher authorship | BI-25, §6.5 |
| **H-2** | Aggregates cannot establish **or refute** a specific occasion | BI-26, JD-1, §6.6.2, FC-09 |
| **H-3** | Authorship claims in a row are **not self-proving**, and **not inherited across a reference** | BI-37, **BI-38**, AT-29 |
| **H-4** | The participant ceiling binds the **author**, not the artifact | BI-33, §6.2 |
| **H-5** | **JD-4** is a structural gate; prose cannot cure a breach | §6.8.4, FC-10, AT-25a |
| **H-6** | **No universal two-source rule** — a single **AL-3 S-5** satisfies §6.7(a) alone | §6.8.9, **P-15** |
| **H-7** | The Phase 0A consequence is disclosed | §6.8.8 |

**The required case table** — same-participant duplicate, separate self-report, own evidence submission, two aspects, derived `Outcome` status, weekly aggregate, context fact, weak temporal fact, another participant-authored artifact, A2 intent or `Outcome` payload assertion, two duplicates, researcher transcription → **all INSUFFICIENT**; participant assertion **+ independent S-5** → **may satisfy**; **single S-5** → **may satisfy alone** — is carried unchanged at §6.8.5 and AT-26.

> **V1.6 interaction.** S-2 remains **non-grounding**, so the *"self-report + `Outcome` payload assertion"* row is excluded **twice over** — by **JD-4** and by **E-3**. Neither exclusion depends on the other, and §9.3.2 now shows that the second produces **no integrity consequence** (AT-23j).

```
AUTHORSHIP UPGRADE BY TRANSPORT OR INHERITANCE: IMPOSSIBLE
PARTICIPANT SELF-CORROBORATION AS SUFFICIENCY: IMPOSSIBLE
UNIVERSAL TWO-SOURCE RULE: NOT CREATED
```

---

# PART I — ASSERTION-UNITY AND CANDIDATE-EMISSION PROOF *(frozen area — carried)*

| # | Property | Proof |
| :-- | :-- | :-- |
| **I-1** | *Individually addressable* is defined by three conditions on the **source's own** representation | §8.2.1 |
| **I-2** | Unity is exactly one; a relation **merges nothing and changes no count** | AU-1, AU-3, CE-5 |
| **I-3** | Emission is **mandatory** where the predicate holds and **forbidden** where it does not | CE-1, CE-2, BI-36 |
| **I-4** | The E-3 failure case is **explicit, not a silent drop** | CE-3; §21's non-grounding row |
| **I-5** | The count is a **function**, not a range | CE-4, RP-4, DB-04a |
| **I-6** | No reconciliation by aggregation **or** by suppression | AU-3, CE-1, AT-24, AT-24b |

**The emission table and the seven unity cases** are carried unchanged at §8.2.6 and §8.3.

> **V1.6 interaction.** S-2 fails **E-3**, so **CE-2/CE-3** apply and no `Outcome`-derived candidate is emitted, **with the deficiency recorded**. §9.3.8 Tier 1 now additionally states that this produces **no seed and no invented subject** — the emission function behaving correctly, and the integrity layer correctly declining to react.

```
B1 RECONCILIATION LEAKAGE: NONE      EMISSION-MODALITY DEFERRAL TO B1S: NONE
```

---

# PART J — UNRESOLVED PLURALITY AND INHERITED C2-RULE PROOF *(frozen area — carried)*

| # | Property | Proof |
| :-- | :-- | :-- |
| **J-1** | An open **Type A** cluster licenses **zero** canonical occasions | §9.7.1, FC-03 |
| **J-2** | Type A requires occurrence established and **`L ≥ 1`** | §9.7.1, BI-29, FC-08 |
| **J-3** | **Type B** is **not** a cluster and carries **no** inherited conclusion | §9.7.2, AT-20a |
| **J-4** | The inherited rule's class is `PLAUSIBLE_DUPLICATE_AMBIGUITY`; its analysis is **primary RIVSR** | §9.7.3, §22.3 |
| **J-5** | **No primary treatment is stated for any other ambiguity type** | §22.3 |
| **J-6** | Sensitivity must lie within `[L,U]`; eligibility is separate from plurality | SB-1…SB-5 |

**V1.6 touched nothing in this Part.**

```
INHERITED C2 RULE APPLIED BEYOND ITS SCOPE: NO      NEW C2 TREATMENT INVENTED: NONE
```

---

# PART K — TYPED ELIGIBILITY, DISPOSITION, DEPENDENCY AND RECOVERY PROOF

## K.1 The composition is typed, total, deterministic, replayable, pure and terminating

| # | Property | Proof |
| :-- | :-- | :-- |
| **K-1** | **Typed** — four predicates, each asked only of the classes that admit it | §9.3.2, §9.3.8, BI-41 |
| **K-2** | **Total** — every persisted class answers all eight §9.3.8 questions; every other logical name is subsumed or excluded; every seed member has a defined `SCOPE` | §9.3.8.1, §9.3.8.2, §9.3.8.3, FS-5, FS-7, FS-9, QS-5, QS-7, QS-8 |
| **K-3** | **Deterministic** — no ordering, recency, timestamp, count or authority comparison anywhere in §9.3, **and neither cycle rule may be resolved by any of them** | DF-2, CD-8, DG-4, §9.3.9's closing note, DB-13 |
| **K-4** | **Replayable** — any independent verifier recomputes the same fold, the same citation recursion and the same scope from the same history | DF-1, CD-9, DG-8, QS-5, DB-15 |
| **K-5** | **Append-only** — quarantines and rescissions are never updated or deleted; §16 is the only removal path | DE-3, IQ-7, IQ-10, DB-02 |
| **K-6** | **Executable** — the recovery route is reachable for **every class and every failure shape**: ten dispositional situations, each with a stated act that resolves it or a stated reason none can | §9.5.6.1–§9.5.6.10, QS-7, QS-8, AT-23g |
| **K-7** | **Pure over its authoritative persisted history** — no derived state is stored as authority, and the three Tier 4 derived records are **explicitly non-authoritative and non-seeding** | DF-2, VD-1, FS-9, §9.3.8.1 rows 18–20, P-06a, DB-08a's E-D obligation |
| **K-8** | **Free of implicit selection** — `VALID_DISPOSITION` is existential, `ACTIVE_QUARANTINES` is a set, no precedence rule exists, and **no cycle is broken by choosing a member** | DF-2, MQ-3, RV-5, RV-7, CD-7, DG-4, IQ-17, IQ-18, **P-14** |
| **K-9** | *(new in V1.7)* **Well-founded** — every recursion in §9.3 runs on a **finite acyclic graph**, and no stratum reads a later one | `CD-01`, CD-6, `DG-01`, DG-7, DE-12, DG-9 |
| **K-10** | *(new in V1.7)* **Terminating and unique** — the whole composition evaluates in **at most `\|R\|` steps** and yields exactly one value per record. **A timeout, a stack-depth failure, a divergent iteration or a result that differs between two evaluations of the same history is a defect of the implementation, not a permitted degraded mode** | CD-9, DG-8, §9.3.9, AT-31(iv), AT-32(viii) |

## K.2 The `JBA15-AUD-01` cases *(carried, accepted)*

| # | Case | Required result | Proof |
| :-- | :-- | :-- | :-- |
| **SD-1** | **S-2 `UNPROVEN`, no candidate, cited by nothing** | **preserved · diagnostic · non-grounding · no candidate · no occurrence support · NO invented B2 fail-closed subject** | §9.3.2's S-2 table; §9.5.6.6; `INTEGRITY_SEED_ELIGIBLE` false by class (TE-5, §9.3.8 Tier 1); **`SCOPE` never invoked** (QS-7); BI-42. **AT-23j** makes a seeding design fail |
| **SD-2** | **S-2 `UNPROVEN`, attempted B2 consumption** | the consuming record **cannot become authoritative from it**; failure **scoped to the actual consuming subject**; **no unrelated participant or store-wide contamination** | `CITATION_SOUND` false ⇒ the **citing** record is not projection-input-eligible (CS-1); its scope is **its own subject** plus QS-1 closure (DS-1); QS-2/QS-4 bound it; CS-2 keeps the referent subject-free. **AT-23k** |
| **SD-3** | **S-2 later proven `AUTHORIZED`** | may become grounding-eligible under the **existing frozen** source/status rules; **no historical source record rewritten**; **no artificial prior B2 failure to rescind** | §9.5.6.6's closing note; the observation was **preserved** throughout (TE-2), and **no B2 artifact was ever created for it** (BI-42), so there is nothing to unwind |
| **SD-4** | **S-2 later proven `UNAUTHORIZED`** | source **remains preserved** where legal retention permits; positive `UNAUTHORIZED` **distinguishable** from prior `UNPROVEN`; **remains non-grounding**; any B2 record that consumed it handled under the dependency/integrity rules | AX-2 keeps the three values distinct; TE-2 preserves; `SOURCE_GROUNDING_ELIGIBLE` false either way; a consuming record is handled by `CITATION_SOUND` (CS-1) and, if it is itself `UNAUTHORIZED`, by Case E/F |
| **SD-5** | **ordinary valid structural adjudication** | must still use the B2 eligibility/integrity path; **DB-08 / DB-08a not weakened** | §9.3.8 Tier 2; §9.3.7 Case A; DB-08 unchanged in substance, DB-08a **strengthened** |
| **SD-6** | **malformed structural edge** | existing `SG-R` behaviour **unchanged** | §9.4.1's table; §9.5.4's rows; Cases B/C; `AT-23`, `AT-23g` |
| **SD-7** | **`SG-S` cycle** | existing bounded fail-closed behaviour **unchanged** | IQ-9c; §9.5.6.3; `SG10-4`, `SG10-5`, `AT-23c` |

## K.3 The `JBA15-AUD-02` cases *(carried, accepted)*

| # | Case | Required result | Proof |
| :-- | :-- | :-- | :-- |
| **DQ-1** | one valid quarantine removes a forged `B → A` | the edge leaves the eligible set; **A may reappear by recomputation** | §9.5.6.5; RS-1…RS-4; `IQ-9b` |
| **DQ-2** | two valid quarantines on `B → A`; **rescind one** | **`B → A` remains quarantined** | rescission targets **one `qid`** (DE-2, RV-1); the other member remains (MQ-2, MQ-5); **§23.1 now states the `0..N` that makes this representable** |
| **DQ-3** | **rescind the second** | the edge is **reconsidered under its own independent structural/generation state** — not restored by the rescissions | `ACTIVE_QUARANTINES` empty; IQ-11a, RV-10; returns to Case B/E if still bad |
| **DQ-4** | **valid + erroneous coexist** | the erroneous event **generates the appropriate integrity failure**, but the **valid independently justified exclusion does not disappear** | `VALID_DISPOSITION` is **existential** (MQ-3, §9.3.4); the erroneous member changes nothing the projection would otherwise admit, so it is an **anomaly**, recorded and dispositionable (AN-1a, IQ-14, Case K) |
| **DQ-5** | **forged rescission** attempts to reactivate `B → A` | **fails to change authoritative active-quarantine state** | not `DISPOSITION_EVENT_ADMISSIBLE` (DE-6), therefore not `EFFECTIVE`; never enters the fold (DE-7); anomaly; dispositionable (DE-8). **AT-23m** |
| **DQ-6** | **`UNPROVEN` rescission** | **must not be treated as `AUTHORIZED`** and **must not silently clear disposition** | DE-6 requires `AUTHORIZED`; RV-4; AX-2 keeps `UNPROVEN` distinct; anomaly, not action. **AT-23m** |

**Composition, rescission and event-integrity coverage:** MQ-1…MQ-10 (one valid; two valid; valid + erroneous; two erroneous; one rescinded with another remaining; erroneous rescinded; `UNPROVEN` event; `UNAUTHORIZED` event; **suppressed quarantine**; **suppressed rescission**) · RV-1…RV-10 (target identity, existence, compatibility, authorization, duplicate/replay, already-rescinded, two rescissions on one target, purged target, purged history, no re-admission) · AN-1…AN-5 (anomaly versus harm, structurally defined).

## K.4 The carried quarantine cases

| # | Case | Result |
| :-- | :-- | :-- |
| **Q1** | uniquely malformed self-edge | valid disposition → **stops seeding** → recompute → **projection RESUMES** |
| **Q2** | uniquely malformed cross-participant edge | **exactly the two named endpoint subjects** fail closed; both resume; no other subject affected (QS-2) |
| **Q3** | **ambiguous cycle** | **no quarantine admissible**; scope **remains fail closed**, possibly indefinitely (IQ-9c, `AT-23c`) |
| **Q4** | forged quarantine of a valid finding | **rejected** (IQ-3, IQ-4, BI-30) |
| **Q5** | mistaken quarantine of a valid, authorized record | **erroneous**, harmful, fails closed; corrected **either** by appending a rescission naming that `qid` **or** by validly quarantining that quarantine on `CONTROL_BASIS_FALSE` (IQ-15, `DCG-2`); the record must independently re-pass both axes (IQ-11a) |
| **Q6** | legal purge | residue survives **only where permitted** (IQ-10); losing a quarantine record **never re-admits a bad record** (RV-8, RV-9, TE-8) |
| **Q7** | structurally valid, proven `UNAUTHORIZED` | **legitimate** quarantine; recomputation permitted (Case F, `AT-23h`) |
| **Q8** | required provenance `UNPROVEN` | Tier 2/3: fails closed, **no quarantine licensed** (Case G). **Tier 1: non-grounding and no seed** (§9.5.6.6, `AT-23j`) |

## K.5 The `JBA16-AUD-01` cases — citation dependency *(new in V1.7)*

| # | Case | Required result | Proof |
| :-- | :-- | :-- | :-- |
| **CDT-1** | **A reference of each of the three kinds** — an adjudication citing an observation; a candidate preserving an A2-lineage reference; a supersession edge naming its endpoints | only the **first** creates an eligibility dependency; the second and third **create none** | CD-3 rows 2, 15, 11; CD-2, CS-7 |
| **CDT-2** | **A citation violating the layer rule** — an `L1` candidate citing an `L2` adjudication, or an `L4` link cited by an `L0` observation | **rejected** where representable; otherwise the citing record is not `PROJECTION_INPUT_ELIGIBLE` and seeds | CD-4, CD-5, DB-08c |
| **CDT-3** | **A two-record citation cycle** `a → b → a` | **both ineligible**, **both seed**, **joint** scope fails closed, typed `CITATION_DEPENDENCY_CYCLE` naming **both**; **neither admitted, dropped nor selected**; **no iteration performed** | `CD-01`, CD-7, CD-8, QS-9, §9.5.6.9. **AT-31(ii)** |
| **CDT-4** | **A three-record cycle, and a loop of preserved provenance references** | the citation cycle behaves as CD-3; the **provenance loop has NO effect** and must not be reported as a cycle | CD-2, CD-3 rows 15–24, CS-7. **AT-31(iii)** |
| **CDT-5** | **A cycle with one member independently `UNAUTHORIZED`** | that member is quarantinable **on its own basis**; excluding it breaks the cycle as **arithmetic** and the rest may resume | IQ-9b, IQ-18, §9.5.6.9 step 6(a) |
| **CDT-6** | **Termination under adversarial depth** | evaluation completes without divergence for any acyclic citation depth the persisted set admits | CD-6, CD-9, **AT-31(iv)** |

## K.6 The `JBA16-AUD-04` cases — disposition of disposition *(new in V1.7)*

**§9.3.3.8 is the normative statement of `DCG-1`…`DCG-8`**, worked end to end at **§9.5.6.8** and **§9.5.6.10**. The table below **restates** their required results for the proof roll-up and **defines nothing**; where the two differ, §9.3.3.8 governs.

| Case, as stated at §9.3.3.8 | Required result *(restated — not a definition)* | Proof |
| :-- | :-- | :-- |
| DCG-1 §9.3.3.8 | an erroneous but **authorized** quarantine **does** alter its target and **does** fail it closed | it is `EFFECTIVE`; `VALID_DISPOSITION` false; operative and baseless ⇒ **HARMFUL** (AN-1a, Case I) |
| DCG-2 §9.3.3.8 | validly quarantining it makes it **stop acting**, and the target **recomputes** | `DISPOSITION_EVENT_EFFECTIVE` requires **not itself quarantined** (DE-10); MQ-9; Case M. **This is the V1.6 defect, repaired** |
| DCG-3 §9.3.3.8 | rescinding that suppression returns the event to **its own basis** — **never to validity** | DE-11; the basis is re-evaluated, not inherited from the rescission |
| DCG-4 §9.3.3.8 | quarantining the **rescission** reactivates the suppression | the fold's inner `EXISTS` also requires `EFFECTIVE`; MQ-10 |
| DCG-5 §9.3.3.8 | self-target is **invalid** | DG-2; `SG-R` on the event itself |
| DCG-6 §9.3.3.8 | `Q1 ↔ Q2` **fails closed with no winner** | `DG-01`, DG-4, DG-5, IQ-17 |
| DCG-7 §9.3.3.8 | a forged quarantine **cannot silence** a valid one | DE-6, DE-7 |
| DCG-8 §9.3.3.8 | a forged rescission **cannot restore** an excluded record | DE-6, DE-7 |
| termination §9.3.3.7 | a depth-3 control chain evaluates **without iteration** and yields one value | DG-6, DG-7, DG-8, **AT-32(viii)** |

## K.7 Harm is structural, and the proof does not consult a result

| # | Claim | Proof |
| :-- | :-- | :-- |
| **HM-1** | **`HARMFUL` is defined by operative influence**, not by which scientific answer is preferred | §9.3.3.6's definition: `OPERATIVE(e) ∧ e lacks a valid basis ∧ removing e would change its target's authoritative eligibility`. **AN-1a** |
| **HM-2** | **A non-operative event is never harmful** — non-admissible (MQ-7, MQ-8) or **suppressed** (MQ-9, MQ-10) — **whatever the projection looks like** | DE-7, DE-10; §9.3.3.6's table |
| **HM-3** | **An operative baseless event is always harmful** — **however convenient the result** | AN-1a; Cases I, J; `DCG-1` |
| **HM-4** | **Neither conjunct reads a surviving finding** | the first is `DISPOSITION_EVENT_EFFECTIVE`, computed from axes and the control graph (DG-9); the second is a **counterfactual over the record's own axes** (AN-4, IQ-9a, AX-5) |
| **HM-5** | **The distinction is re-provable by an independent verifier** from the persisted history alone | DF-1, DG-8, CD-9 |

```
SEED WITHOUT A DEFINED SCOPE:        IMPOSSIBLE   (FS-5, FS-7, FS-9, QS-7, QS-8, BI-41)
INVENTED SUBJECT FOR A REFERENT:     IMPOSSIBLE   (BI-42, CS-2, CD-11)
PRIMITIVE DISPOSITION STATE:         NONE         (BI-43, DF-2)
UNDEFINED RECURSION:                 NONE         (CD-01, DG-01, CD-9, DG-8)
FIXED-POINT GUESSING:                PROHIBITED   (CD-8)
IMPLICIT SELECTION IN THE FOLD:      NONE         (P-14, DF-2)
CYCLE RESOLVED BY CHOOSING A MEMBER: IMPOSSIBLE   (IQ-9c, IQ-17, IQ-18)
SUPPRESSED EVENT THAT STILL ACTS:    IMPOSSIBLE   (DE-10, DCG-2)
UNREGISTERED PERSISTED CLASS:        DETECTED     (AM-10a, DB-08b, AT-33)
QUARANTINE AS SCIENTIFIC SELECTION:  IMPOSSIBLE   (IQ-9a, IQ-9c, IQ-15's scope limit)
SG-S TERMINAL FAIL-CLOSED:           PRESERVED    (IQ-9c, AT-23c)
```

---

# PART L — LEGAL-DELETION PROOF *(frozen area — carried)*

| # | Property | Proof |
| :-- | :-- | :-- |
| **L-1** | Deletion prohibited **by purpose**, not consequence; no analytical-neutrality claim | §16.3, BI-17 |
| **L-2** | Scientific retention never overrides the obligation | §16.6, P-05a |
| **L-3** | **Every** residue guarantee is conditioned; full purge may leave **nothing** | BI-31, §16.6.1 |
| **L-4** | Universal distinguishability **withdrawn**; forbidden residue never reconstructed | §16.6.1, AT-22a |
| **L-5** | The `DeletionAuthorization` is itself mortal | §16.5 |
| **L-6** | Referential integrity only as far as permitted | §16.7, RI-1…RI-5 |
| **L-7** | **Structural-integrity history is not exempt** | IQ-10, §9.5.7.1, §16.9 |
| **L-8** | **Purge interactions are safe because eligibility is computed from a record's own axes** | §9.5.7.2; **TE-8**; **RV-8**, **RV-9** — losing a quarantine record **never re-admits** a bad one, and a purged quarantine leaves its rescission **inert** |
| **L-9** | An integrity purge is **not** an integrity remedy | LD-Q6 |

**The six required purge cases** are carried unchanged at §16.6.1 and §9.5.7.2, extended by RV-8/RV-9 for the disposition fold.

```
IMPOSSIBLE RESIDUE PROMISE: NONE      LEGAL-DELETION CONTRADICTION: NONE
```

---

# PART M — POSTGRESQL / SECURITY / THREAT-BOUNDARY PROOF

| # | Property | Proof |
| :-- | :-- | :-- |
| **M-1** | Every invariant declares a class; no row claims application-only logic rejects arbitrary SQL | §18.7, §18.2, AT-03 |
| **M-2** | `DB-03A` / `DB-03B` split retained; authorship is **E-E**; **no class inherits another's** | §18.4, BI-38, AT-29 |
| **M-3** | Every class states its own proof, owner and absent-proof consequence | §18.5's five columns |
| **M-4** | **`DB-03B` now also gates disposition events** (TG-5, IQ-13) | §18.4.4, §18.7 DB-03B, DB-08a |
| **M-5** | **`DB-08a` covers the disposition fold**, with `DQ-1`…`DQ-6` as its LIVE suite and an **E-D** obligation for the absence of a stored authoritative boolean | §18.7 |
| **M-6** | **`DB-08b` covers typed eligibility and seed totality**, with `SD-1`…`SD-7` as its LIVE suite and **E-D** obligations for two absences | §18.7 |
| **M-7** | DB-08 unchanged in substance; `SG-S` still computed over the eligible set | §18.7 |
| **M-8** | `qid` is subject to the identity rules | DE-1, DB-06, DB-12 |
| **M-9** | DB-10, DB-15 state their verifier assumptions; DB-15's determinism now covers the fold and the typed predicates | §18.3, §18.7 |
| **M-10** | The seven-actor threat table is **unchanged** | §19.3 |
| **M-11** | *(new in V1.7)* **`DB-08c` covers citation-dependency acyclicity** — **E-A where DB-representable**, **E-B** otherwise under §18.3, **E-D** for the absence of any iterate-until-stable or precedence-based cycle resolution | §18.7 DB-08c, `CD-01`, `CD-5a`, CD-8, **AT-31** |
| **M-12** | *(new in V1.7; narrowed in V1.8)* **`DB-08d` covers disposition-control acyclicity and event operability** — **E-A** for self-target (record-level, `DG-2`) and for rejecting a **proposed** ancestor-target edge at write time against an already-persisted chain (prospective, `DG-3`), **E-B** otherwise, **E-D** for the absence of any recency or actor-authority tiebreak in the control layer | §18.7 DB-08d, `DG-01`, DG-2, DG-3, DG-4, **AT-32** |
| **M-13** | *(new in V1.7)* **No enforcement row claims a guarantee its class cannot support.** The two new acyclicity invariants are **write-time rejection plus read-time refusal**, never a promise that a cycle cannot be written by an actor who can modify the verifier (BI-32, §18.3, §19.4) | §18.2, §18.3, DB-08c, DB-08d |

**The seven-actor proof, carried.** M-A1…M-A3 (role-constrained) and **M-A4** (data-tampering without verifier authority) retain the full matrix; **M-A5…M-A7** (migration owner, table owner, unrestricted superuser) have **no technical guarantee** — governance only (PR-5), with **no external verifier invented** (§19.4).

> **What the V1.6 repairs add to the threat model, and what they do not.** `IQ-13` closes a route available to **M-A4**: writing a forged quarantine to **remove** a valid scientific input, or a forged rescission to **restore** an excluded one. It creates **no** guarantee against **M-A5…M-A7**, who control the capability path and therefore its provenance. **No new guarantee against unrestricted administrative compromise is claimed.**

```
IMPOSSIBLE FAIL-CLOSED GUARANTEE: NONE
GUARANTEE CLAIMED AGAINST UNRESTRICTED ADMINISTRATIVE COMPROMISE: NONE
```

---

# PART N — B/C FIREWALL PROOF *(frozen area — carried, with V1.6 and V1.7 additions checked)*

| # | Rule class | Defined here? | Where it lives |
| :-- | :-- | :-- | :-- |
| **N-1** | Numerator rule | **NO** | C2 — BI-05 |
| **N-2** | Denominator rule | **NO** | C2 (C2-5) |
| **N-3** | RIVSR rule | **NO — one inherited restatement**, scoped to the duplicate class and primary RIVSR | §22.3 |
| **N-4** | Scientific independence | **NO** | C2 (O-08, O-C-INDEPENDENCE) |
| **N-5** | Contamination rule | **NO** | C2 |
| **N-6** | Opportunity threshold | **NO** | C2 — BI-05, P-07 |
| **N-7** | Final UNKNOWN treatment | **NO** | C2 (O-09) |
| **N-8** | Analysis window | **NO** | C2 |
| **N-9** | Merchant eligibility | **NO** | C2 (C2-3) |
| **N-10** | Sensitivity design | **NO — one constraint** | SB-1…SB-5 |
| **N-11** | C1 verification conclusion | **NO** | C1 — BI-21 |

## N.1 V1.6's and V1.7's additions checked

| Addition | States a C2 rule? | Why not |
| :-- | :-- | :-- |
| Four typed eligibility predicates | **No** | They decide **which records B reads**, not how established occasions are analysed |
| `CITATION_SOUND` | **No** | B-side evidentiary admissibility at adjudication |
| Typed seed and per-class totality | **No** | **Integrity** states. §22.1's integrity row admits them to C as **data-quality provenance** only (BI-30) |
| Disposition fold, `qid`, `ACTIVE_QUARANTINES` | **No** | Integrity-control mechanics |
| Anomaly-versus-seed | **No** | An **integrity** classification. **C2-6** already governs how quarantine periods and fail-closed scopes are reported; **anomalies join that row**, and C2 decides the reporting |
| S-2 remaining non-grounding | **No** | An **input-availability** fact, already governed by **C2-8**, which forbids reading absence as evidence of fewer purchases (P-13) |
| *(V1.7)* Reference classification and the `CitationDependencyGraph` | **No** | It decides **which B records B may read**, and **nothing** about how established occasions are analysed (BI-05) |
| *(V1.7)* Citation-cycle and control-cycle fail-closed | **No** | Both produce a **typed integrity error on a bounded scope** — the same shape as the accepted `SG-S` outcome. **C2-7** already governs how a fail-closed subject is treated, and V1.7 adds no new instruction to it |
| *(V1.7)* `DISPOSITION_EVENT_EFFECTIVE` and the control graph | **No** | Integrity-control mechanics; surfaced to C only as **data-quality provenance** under **C2-6** |
| *(V1.7, extended in V1.8)* The twenty-two-class registry | **No** | A **B-internal** statement of what B persists and what each class does. It creates **no** analysis category and **no** C2 obligation beyond the existing `C2-6` reporting question |
| *(V1.7)* `0..N` quarantine cardinality | **No** | A B-side representation constraint. **No count is exposed to C2 as a fact**, and none may be read as one (BI-30) |

## N.2 Directional check

| Direction | Bar |
| :-- | :-- |
| **B → C** | BI-05; every class in N assigned away |
| **C → B** | P-12a, BI-04, AT-15; no write-back |
| **C1 → B** | BI-21, §7.5, §20, AT-19, AT-19b |
| **B1 → B2** | BI-24, BI-28, BI-36, AU-1…AU-6, CE-1…CE-7; §21's three negative guarantees; **and BI-42, which forbids B1 material from acquiring a B2 subject it never earned** |

```
UNAUTHORIZED B ANALYTICAL RULES: NONE      NEW C2 SEMANTICS CREATED: NONE
```

---

# PART O — CONTRADICTION GATE

## O.1 The eighteen required targets

| # | Required proof | Proof | Result |
| :-- | :-- | :-- | :-- |
| **CG17-1** | **Every reference is classified into exactly one of three kinds, in a closed table** | **CD-3** enumerates **all twenty-four** reference roles the architecture admits and assigns each to **semantic citation** (rows 1–10), **mere provenance** (rows 15–24) or **structural endpoint relation** (rows 11–14). **CD-1** makes the kind a property of the class and role, never inferred per instance; **`AM-10b`** forbids writing an unclassified role. *"Every operative reference is probably a citation"* is expressly **not** the rule (CS-7). | **PROVEN** |
| **CG17-2** | **Only a semantic citation creates an eligibility dependency** | **CD-2**; **CS-7** restricts `CITATION_SOUND`'s range to CD-3 rows 1–10. A preserved A2-lineage reference (row 15), a source-native relation (row 16), a receipt (row 17) and a supersession endpoint (row 11) **create none**. `AT-31(iii)` fails a design that treats a provenance loop as a cycle. | **PROVEN** |
| **CG17-3** | **The citation dependency graph is required acyclic, in the direction of the accepted construction order** | **`CD-01`**; **CD-4** fixes layers `L0`…`L5` from the accepted B1→B2 order; **CD-5** permits citation only to a strictly earlier layer, with one `L2`→`L2` exception, **plus the single named `L2 → L5` exception `CD-5a`**, all still constrained by `CD-01`. **No record obtains its eligibility from itself, directly or transitively.** **DB-08c** makes it **E-A where DB-representable**. | **PROVEN** |
| **CG17-4** | **A citation cycle has a stated failure with no arbitrary winner and no fixed-point guessing** | **CD-7**: every member ineligible, every member a seed, **joint** scope fails closed, typed `CITATION_DEPENDENCY_CYCLE` **naming every member** (QS-9). **CD-8** prohibits iterate-until-stable, latest-wins, first-wins and highest-authority-wins, and **records why a DAG was chosen over a fixed-point calculus**. **IQ-18** forbids breaking the cycle by quarantining a member. `AT-31(ii)`. | **PROVEN** |
| **CG17-5** | **Termination is proved, not assumed** | **CD-9**: five strata (α axes → β disposition fold → γ citation recursion → δ set validation → ε seed and scope), **no stratum reads a later one** (DE-12, DG-9); both recursions run on **finite acyclic** graphs; **at most `\|R\|` steps**, **exactly one value per record**. **DG-8** proves the disposition half on control depth. `AT-31(iv)` and `AT-32(viii)` make divergence a **failure**, not a degraded pass. | **PROVEN** |
| **CG17-6** | **The persisted-class registry is closed and exhaustive** | **§9.3.8.1** — twenty-two class rows. **§9.3.8.2** — three further columns. **§9.3.8.3** — a subsumption and exclusion register disposing of **every other logical name in this document**, including the six V1.6 omissions and the actual-transaction satellite closed in V1.8. The claim is **falsifiable**: a reader who finds a name that is in neither has found a defect. `AM-10a`, `AT-33`. | **PROVEN** |
| **CG17-7** | **Every class answers all eight questions, including the exact failure consequence when it cannot seed** | §9.3.8.1 columns 4 and 5 give **exact** scope derivation and **exact** authoritative consequence per class; §9.3.8.2 columns 6–8 give citation participation, disposition-control eligibility (**IQ-16**) and deletion behaviour **by reference to the frozen §16 model**, stated once and varied only where class-specific. **No global default anywhere.** | **PROVEN** |
| **CG17-8** | **A derived Tier 4 record can never seed, so recording a failure cannot cause one** | **FS-9**, **QS-8**, §9.3.8.1 rows 18–20, CD-3 row 20. The structural-admission record, the affected-scope record and the integrity-error record are **reproducible descriptions of a computation, never inputs to it**. `AT-34` fails a design in which recording a fail-closed scope widens it. | **PROVEN** |
| **CG17-9** | **Quarantine cardinality is `0..N` and is stated identically everywhere** | **§23.1** (rewritten), **§9.3.3.3**'s property table, **§5**'s `ACTIVE_QUARANTINES` entry, **DB-08a**, **§25.5**, **AT-23n**. The V1.6 `0..1` reading is **expressly withdrawn**; **DB-08a carries an `E-D` obligation for the absence of any `0..1`-shaped column or constraint**. | **PROVEN** |
| **CG17-10** | **`Q1 + Q2` both active; rescind `Q1` and `Q2` remains; no count carries authority; replay is idempotent** | MQ-2, MQ-5, DQ-2 (set semantics, single-target rescission DE-2); **no count appears in any predicate** — `CURRENTLY_QUARANTINED` reads `> 0` and `VALID_DISPOSITION` is existential; RV-5 and §17.2 give one `qid` per operation identity, and DB-06 enforces it. `AT-23n`. | **PROVEN** |
| **CG17-11** | **A disposition event that is itself validly quarantined does not act** | **`DISPOSITION_EVENT_EFFECTIVE`** (§9.3.3.2) adds the conjunct V1.6 omitted, and **§9.3.3.3's fold tests `EFFECTIVE`, not `ADMISSIBLE`**. **DE-10**; MQ-9, MQ-10; §9.3.7 **Case M**; `DCG-2`, `DCG-4`. **Quarantining `Qbad` now has operative effect — this is the `JBA16-AUD-04` repair.** | **PROVEN** |
| **CG17-12** | **The three event predicates are separated and the derived one is stated** | **`DISPOSITION_EVENT_STRUCTURALLY_VALID`**, **`_GENERATION_AUTHORIZED`**, **`_CURRENTLY_QUARANTINED`**, and derived **`_EFFECTIVE`** (§9.3.3.2). **DE-9** forbids collapsing admissibility and effectiveness; an **admissible-but-suppressed** event is a representable, recorded state. | **PROVEN** |
| **CG17-13** | **The disposition control graph is acyclic; self-target is individually invalid; a proposed ancestor-target edge is rejected prospectively, never reclassified once persisted** | **`DG-01`**, **DG-2**, **DG-3** *(narrowed in V1.8)*; `DCG-5`. **DB-08d** makes self-target, and rejection of a proposed ancestor-target write against an already-persisted chain, **E-A**. **DG-6/DG-7/DG-8** define control depth and prove termination and uniqueness — **replacing V1.6's circular DS-5 argument, which is expressly withdrawn** (DE-8, DS-5). | **PROVEN** |
| **CG17-14** | **A control cycle fails closed with no winner and no recency resolution** | **DG-4**: every member ineffective, **ultimate scientific targets** fail closed, typed `DISPOSITION_CONTROL_CYCLE` naming every member. **DG-5**: fail-safe in the exclusion direction, fail-closed in the admission direction. **IQ-17**; `DCG-6`; FS-8; QS-9. **No timestamp, allocation sequence, actor authority or count is consulted.** | **PROVEN** |
| **CG17-15** | **`DCG-1`…`DCG-8` are each answered, and rescission never confers validity** | §9.3.3.8 answers all eight; §9.5.6.8 works the chain end to end. **DE-11**: removing a suppression returns the event to **exactly what its own basis dictates** — `Qbad`'s false basis stays false, so it is again harmful and `R` again fails closed (`DCG-3`). | **PROVEN** |
| **CG17-16** | **`CONTROL_BASIS_FALSE` is not a route to scientific selection** | **IQ-15**, **VD-7**: available **only** against a `StructuralIntegrityQuarantine`; never against a scientific record; never against a rescission; decided from the **target's own two axes** and therefore satisfying `IQ-9a`'s independence standard. Without it `DCG-2` would be unreachable — an erroneous quarantine would be correctable only by the actor who wrote it. | **PROVEN** |
| **CG17-17** | **Harm is defined structurally, never by result preference** | §9.3.3.6's definition and **AN-1a**: `OPERATIVE ∧ baseless ∧ counterfactually eligibility-changing`. **HM-1…HM-5** (Part K.7) show neither conjunct reads a surviving finding. **A non-operative event is never harmful; an operative baseless one always is.** | **PROVEN** |
| **CG17-18** | **Everything the V1.6 audit accepted is carried unchanged** | **Part E.2 rows 25–27** verify typed eligibility, the content-addressed fold and the corrected `RS-1` individually; **`RS-1`, AX-5, §9.4.1 and `AT-30` are byte-identical**; Part E.1 re-proves seventeen findings against their **original** defects with **zero regressions**. | **PROVEN** |

## O.2 Re-run against the authority chain

| # | Tested against | Apparent contradiction | Reconciliation | Result |
| :-- | :-- | :-- | :-- | :-- |
| 1 | **Rev 2 §6.A as amended** | required singular `createdFromIntentId`; non-null `merchantId` | superseded; merchant-optional is an **AC** | **PASS** |
| 2 | **Rev 2 §6.A conservative dedup** | *"count as one for primary RIVSR"* vs B2 asserting no count | four clauses hold simultaneously, including the class scoping | **PASS** |
| 3 | **Rev 2 §6.B–§6.F** | entry-source classification; ≥3 denominator; missingness; deletion override; partial weeks | each assigned to C2 or handled at §16. **The two acyclicity invariants change no analysis input's meaning** — only whether B will answer at all | **PASS** |
| 4 | **Rev 2 §8 as amended** | `occasionKey` deleted | deletion stands, not a universal ban; `qid` remains an opaque minted identity (DE-1, P-03a) | **PASS** |
| 5 | **RT-09** — the §8.3 hard gate | *"one `Outcome` per occasion/Decision"* | disambiguated by its own antecedent; **entities only**. §9.3.8.3 additionally records that `Outcome` is **not a B-persisted class** | **PASS** |
| 6 | **RT-10 / RT-11** | `VerifiedValue` at M7 carries `purchaseOccasionId` | milestone numbering is a delivery schedule; the phase spine is the semantic order (O-13) | **PASS** |
| 7 | **RT-13** | events never create or repair an occasion | S-8 is AL-0 / `NON_ADMISSIBLE`, and §9.3.8 gives it **no** seed capability and **no** citation role | **PASS** |
| 8 | **Phase 0A-2 §21** | seven statuses enumerated, none defined | all seven read as undefined; `DB-03B` is a precondition **before** those rules (AT-27b) | **PASS** |
| 9 | **Phase 0A-2 §26 / §23 / §40** | weekly cardinality; domain record wins; **M7 = Outcomes** | carried verbatim; §40 remains the authority for §18.4.6 | **PASS** |
| 10 | **A1 (accepted)** | append-only; R-B-08; *"full auth out of scope"* | **nothing in the two graphs deletes anything** (FS-4, DE-3); the acyclicity invariants are **write-time rejections and read-time refusals**, never removals | **PASS** |
| 11 | **A1 §11/§13, A2 §28 capability matrices** | do they supply `DB-03B`? | **For S-1: partly, bounded to the application-module boundary. For S-2: not at all.** Unchanged and frozen. The same principle governs disposition events **at both levels** — acting, and suppressing another event (IQ-13, DB-14, `DCG-7`) | **PASS** |
| 12 | **A2 §8.4 / §29 / §44** | `entrySource`; DB invariant matrix; no B/C leak | unchanged; §18.2's classes restate A2 §29's own kinds; DB-08c and DB-08d use the same five classes | **PASS** |
| 13 | **A2 §27 / P2002** | reload-and-prove vs the fold | **RV-5**'s duplicate/replay discipline is unchanged, and **AT-23n** now tests explicitly that replay mints **no second `qid`** | **PASS** |
| 14 | **B ratification V1.3** | R-B-01…17, P-01…19, HR-B-01…10 | mapped in §4 and Part F. **No clause contradicted, narrowed or extended.** The V1.6 defects repaired here were an **undefined recursion**, a **false exhaustiveness claim**, an **internal contradiction** and an **unimplemented choice** — the first two and the fourth are constructions, the third is a removal. `AnalysisProtocol v1` remains **UNFROZEN** | **PASS** |
| 15 | **Internal — does `CD-01` forbid a legitimate citation pattern?** | — | **No.** CD-5 permits every direction the accepted B1→B2 construction order produces, including `L2`→`L2` citation of an earlier adjudication and the single named `L2 → L5` exception `CD-5a`. The **only** pattern it forbids is one in which a record's eligibility depends on itself — which **BI-03 and P-01 already forbid** in substance | **PASS** |
| 16 | **Internal — does failing a citation cycle closed over-punish?** | — | **No**, and the alternative is worse. The scope is the **QS-1 minimal joint fixpoint**, unrelated subjects project normally (QS-4), and the failure is **recoverable** by an independent record-level finding (§9.5.6.9 step 6a). Answering instead would publish a result derived from an undefined state, **indistinguishable from a correct one** | **PASS** |
| 17 | **Internal — does `DISPOSITION_EVENT_EFFECTIVE` let an attacker suppress a valid quarantine?** | — | **No.** Suppressing requires an event that is itself **`GENERATION_AUTHORIZED = AUTHORIZED` and capability-minted** (`DCG-7`). An attacker who can mint such an event could already have written a forged quarantine directly; **the new predicate adds no capability to an attacker and adds one to a legitimate operator** | **PASS** |
| 18 | **Internal — does `IQ-15` let the integrity actor overrule a finding?** | — | **No.** It is available **only** against a `StructuralIntegrityQuarantine`, and the thing it asserts — *"this event's named basis does not hold for its own target"* — is decided from the **target's two axes**. It cannot be aimed at an adjudication, occasion, cluster, link or rescission (VD-7), and it consults **no** surviving finding (CG17-16) | **PASS** |
| 19 | **Internal — does the registry's growth to twenty-two classes create new obligations downstream?** | — | **No new semantic ones.** The eight added rows (seven in V1.7, plus V1.8's `LateActualTransactionFactSatellite`) are classes the architecture **already required** to exist; the registry states what they do, and **for all eight the answer to "can it seed?" is no**. The only new downstream obligation is a **reconciliation check** (AT-33), which is a test, not a decision | **PASS** |
| 20 | **Internal — does `0..N` weaken any protection?** | — | **No.** It is the cardinality the accepted fold already had. What changes is that a **representation able to hold only one quarantine is now explicitly non-conforming** (`AT-23n`), closing a route by which an implementation could have silently dropped an independent justification | **PASS** |
| 21 | **Internal — do the frozen areas survive?** | — | **Yes** — Part E.2 verifies all **27** individually, including the three the V1.6 audit accepted, and Part E.1 re-proves seventeen findings against their original defects with **zero regressions** | **PASS** |

```
CONTRADICTION GATE: PASS      CG17-1 .. CG17-18: ALL PROVEN
```

---

# PART P — REMAINING DOWNSTREAM OBLIGATIONS

## P.1 B1 Effective Specification

1. Prove **complete coverage** of the §21 preservation contract, including all three negative guarantees.
2. Define the candidate schema around **one individually addressable source assertion**; apply §8.2.1's test per adapter — do not redefine it, and do not decide whether a candidate is emitted.
3. Implement **§8.2.6 exactly** — E-1/E-2/E-3, CE-1…CE-7, the explicit **non-grounding** record where E-3 fails, idempotent replay.
4. **Represent the four typed predicates** of §9.3.2 for every record class it writes, per §9.3.8's tier assignment. **`SOURCE_PRESERVED` must be unconditional** (TE-2): a record that fails every other predicate is still retained and readable.
5. **Implement `DB-03B` per class**, and prove by adversarial LIVE test that a coherent direct-SQL row without protected provenance is rejected or rendered non-grounding — **`S2-FORGE-1`**, **`S2-FORGE-2`**, plus S-3, S-4, S-5.
6. **Establish or decline the M7 ingestion integration contract for S-2.** Until an **accepted** contract exists, **B1S MUST treat every S-2 observation as non-grounding**, and **MUST NOT** create any B2 artifact for it (BI-42).
7. Implement `DB-03A` per class per §18.5, with LIVE proof.
8. Record **authorship provenance and authorship domain** per observation, UNKNOWN preserved.
9. Preserve source-native relations `0..N` without conferring membership or changing counts, **as CD-3 row 16 — a mere provenance reference that creates no eligibility dependency**.
9a. **Classify every reference it writes under CD-3**, and write **no** reference role the table does not name (`AM-10b`). **Enforce the CD-5 layer rule at write time where the endpoints are already persisted** (DB-08c).
9b. **Represent every persisted class it writes against the §9.3.8.1 registry**, including the **source-native relation record**, the **decomposition-ambiguity record** and the **non-grounding emission marker**, and supply the schema-to-registry reconciliation of **AT-33**.
10. Implement the stored-mapping manifest DC-01…DC-07 including DC-02a.
11. Implement the transaction-final zero-observation obligation (DB-04).
12. Preserve microsecond precision end to end (DB-11's E-C half).
13. Allocate LIVE-PG tests for DB-02, DB-03A, **DB-03B**, DB-04, DB-04a, DB-06, DB-11, DB-12, and threats AT-19a, AT-24, AT-24a, AT-24b, AT-27, AT-27a, AT-27b, AT-29.

## P.2 B2 Effective Specification

1. Define the reconciliation algorithm (O-06c) conforming to **§9.3.9**, implementing the **three-axis evaluation**, the **disposition fold**, the **four typed predicates**, **`CITATION_SOUND`**, the **typed seed** and the **scope**.
2. **Implement the disposition fold exactly** (§9.3.3): `qid` identities; single-target rescissions; `DISPOSITION_EVENT_ADMISSIBLE` requiring the event's **own** `AUTHORIZED`; `ACTIVE_QUARANTINES` as a **set with no ordering**; `CURRENTLY_QUARANTINED` and `VALID_DISPOSITION` **derived**. **No stored authoritative boolean** (DB-08a's E-D obligation).
3. **Evaluate `GENERATION_AUTHORIZED` for every projection-input and disposition record** (TG-5), not only for observations.
4. Implement **`IQ-1…IQ-19`**, including the frozen **`IQ-9a`…`IQ-9d`**, **`IQ-13`**/**`IQ-14`**, and the new **`IQ-15`** (`CONTROL_BASIS_FALSE`, quarantine targets only), **`IQ-16`** (disposition-control eligibility by tier), **`IQ-17`**/**`IQ-18`** (the two cycle rules) and **`IQ-19`** (the integrity layer never reads the eligibility layer).
4a. **Implement `DISPOSITION_EVENT_EFFECTIVE` and make the fold test it, not `ADMISSIBLE`** (§9.3.3.2, §9.3.3.3, DE-9…DE-12). **Enforce `DG-01`**: reject self-target as an individual, record-level `SG-R` invalidity (`DG-2`), and reject a **proposed** ancestor-target edge only as a prospective write-time admission test against the currently persisted graph (`DG-3`) — never as a record-level property of an event already persisted — at write time where representable (DB-08d), and detect an already-persisted control cycle at read time with the `DG-4` failure alone. Discharge **`DCG-1`…`DCG-8`** (AT-32).
4b. **Implement `CD-01`** — classify every citation edge per CD-3, enforce the CD-4/CD-5 layering **including the single named `CD-5a` exception**, and detect a citation cycle with the `CD-7` failure (DB-08c, AT-31). **Iterating to a fixed point and every precedence tiebreak are prohibited** (CD-8).
4c. **Prove termination.** Both recursions must evaluate by structural recursion on a finite acyclic graph, in the stratified order of CD-9. **A timeout, a stack-depth failure or a result that differs between two evaluations of the same history is a failure of DB-08c/DB-08d, not a degraded pass.**
4d. **Represent `0..N` active quarantines per target record** (§23.1); a schema able to hold only one **fails AT-23n**.
5. Implement **`CITATION_SOUND`** with **explicit, re-provable** citations (CS-3), and locate every dependency failure at the **consuming subject** (CS-1).
6. Implement the **§9.5.5 fixpoint** and **§9.5.5.1** for disposition events; prove containment (AT-23b).
7. Implement **IQ-12 / FC-11** — no re-establishment of a fail-closed subject under a new identity.
8. Implement JD-1…JD-4 and require JS-1…JS-6 including JS-3a.
9. Define Type A / Type B representation; assert no analytical count for either.
10. Record review provenance (§7.5) and **integrity anomalies** (AN-2) as queryable data-quality provenance.
11. Define the two read surfaces and the `participantId` projection with its test.
12. Implement `AGGREGATE_INCONSISTENCY_OBSERVATION` licensing nothing in either direction.
13. Prove the **absence** of any singular origin-intent constraint by a positive LIVE test (DB-07), **and the absences DB-08a and DB-08b require** — no stored authoritative disposition boolean; no polymorphic admission path; no seed member without a defined scope.
14. Implement the authorization-gated deletion path, conditional residue, and the **integrity-history purge** cases of §9.5.7.2, **RV-8** and **RV-9**.
15. Allocate LIVE-PG tests for DB-01, DB-05, DB-07, DB-08, **DB-08a (`DQ-1`…`DQ-6`, `DCG-1`…`DCG-8`, AT-23n)**, **DB-08b (`SD-1`…`SD-7`, AT-33, AT-34)**, **DB-08c (`CD-1`…`CD-6`, AT-31)**, **DB-08d (AT-32)**, DB-09, DB-10, DB-13, DB-15, and threats **AT-23a…AT-23m**, AT-25, AT-25a, AT-26, AT-28, **AT-30**.

## P.3 C1 Effective Specification

1. May **restate** the §20 ordering; may not be the first artifact to define it.
2. Must consume the **factual** read surface and honour BI-22.
3. Must define behaviour for a referenced occasion that becomes `CONTRADICTED`, `RETRACTED`, `TOMBSTONED`, `PURGED`, or **unresolvable and unmarked**.
4. Must not re-feed any verification verdict, or verdict-correlated selection, into B.
5. Must define behaviour for a referenced occasion whose subject is in a **fail-closed scope** — neither valid nor invalidated, but **unreadable**. B does not resolve this.

## P.4 C2 / `AnalysisProtocol`

**Fixed by inherited authority and restated, not created:** the primary **RIVSR** treatment of a **`PLAUSIBLE_DUPLICATE_AMBIGUITY`** cluster. **Constrained, not designed:** SB-1…SB-5.

| # | Still owned by C2 and undecided |
| :-- | :-- |
| **C2-1** | Eligibility and exclusion rules that could make a cluster contribute **zero** |
| **C2-1a** | Primary treatment of every **non-duplicate** ambiguity type |
| **C2-1b** | Analytical treatment of a **Type B** subject |
| **C2-2** | Sensitivity and bounds design, subject only to SB-1…SB-5 |
| **C2-3** | Whether an occasion with `UNRESOLVED`/`CONTESTED` merchant may enter a merchant-dependent analysis |
| **C2-4** | Conservative handling of typed missingness from lawful deletion |
| **C2-4a** | Conservative handling where deletion **or an integrity event** is indistinguishable from never-present |
| **C2-5** | Scientific independence; UNKNOWN treatment; contamination/windowing; RIVSR; the denominator; the opportunity threshold; analysis windows; partial-week and withdrawal sensitivity; entry-source classification |
| **C2-6** | Whether and how label-correlated review selection, quarantine periods, fail-closed scopes **and integrity anomalies** (AN-2) are reflected in data-quality or sensitivity reporting |
| **C2-7** | How to treat an occasion whose adjudication subject is **fail-closed** — neither established nor refuted; **B asserts nothing about it**, and C2 must not read it as a negative (P-13) |
| **C2-8** | How to treat a period in which **S-2 was non-grounding** versus one in which an accepted M7 contract made it grounding. **An input-availability change, not a rule change**; absence must not be read as evidence of fewer purchases (P-13) |

`O-06b-ARCH` / `O-06b-SPEC` and `O-B-DISTINCTNESS` / `O-C-INDEPENDENCE` **MUST NOT be recombined.**

## P.5 Operator actions and amendment triggers

| # | Item |
| :-- | :-- |
| **OP-1** | The working tree is not clean and HEAD is the rejected commit. Clean rehoming is an **outstanding operator action**. **Not part of this repair.** |
| **OP-2** | **PR-5** — migration/owner/superuser credential governance is required and **not enforced** by this architecture. |
| **OP-3** | The **trusted integrity-repair capability** (IQ-6) must be a role distinct from the ordinary B write path **and** from scientific adjudication (DB-14). **V1.6 raises its stakes**: that capability now also gates whether a disposition event acts at all (IQ-13). |
| **OP-4** | The **`DB-03B` mechanism for S-5** must be deployed with real protection — every Phase 0A occurrence establishment depends on it (§6.8.8). |
| **OP-5** | The **M7 ingestion integration contract for S-2** is an explicit upstream dependency. **Until it exists and is re-provable, S-2 is non-grounding**, and **no decision is pending on this contract's completeness**. |
| **OP-6** | **Bootstrap consideration for `GENERATION_AUTHORIZED`.** Records written before a provenance mechanism exists evaluate **`UNPROVEN`**. For a **Tier 2/3** record requiring proof that means **not eligible and fail closed** (Case G); for a **Tier 1** record it means **non-grounding with no seed** (Case F of §9.5.6). **This must be planned for** — deploy the mechanism before the records, or accept a bounded fail-closed period — rather than discovered in operation. |
| **OP-7** | *(new)* **Disposition events require provenance from day one.** Because `DISPOSITION_EVENT_ADMISSIBLE` demands `AUTHORIZED` (IQ-13), an integrity-repair capability deployed **without** a working `DB-03B` mechanism can record quarantines that **never act**. That fails safe, but it also means **no integrity recovery is available until the mechanism exists**. Deploy them together. |
| **AM-1** | If upstream authority ever **defines** the proposition asserted by any `Outcome` status, §7.3/§7.4/§28.1 must be revisited. |
| **AM-2** | If upstream authority adds a **`WeeklyExposureReport` correction contract**, JBA must be amended or downstream specs consume it. |
| **AM-3** | If a **merchant/provider/processor feed** becomes admissible, S-9 requires an amendment — **and it would make JD-4 satisfiable without S-5**. |
| **AM-4** | If the authoritative `Outcome` representation later **exposes payload multiplicity**, §7.2 and §23 resolve to whatever it exposes — **without amendment**. |
| **AM-5** | If an **independently protected verifier** is deployed, guarantees against M-A5…M-A7 may be revisited. **Until then none is claimed.** |
| **AM-6** | If upstream authority records **authorship** on `WeeklyExposureReport` distinctly from `collectionMethod`, §6.5.3's UNKNOWN default may be revisited. |
| **AM-7** | If controlling authority **elevates a factual object beyond participant authorship**, JD-4 admits it **automatically**. |
| **AM-8** | If a mechanism is proposed that would resolve a **set-level** violation by consulting the findings, **`IQ-9a` must be amended first, and that is a semantic decision requiring the B-scoped authority process.** |
| **AM-9** | When an **accepted M7 trusted-generation contract** exists, **S-2 becomes grounding automatically** under §18.4.6 — **no amendment required**. |
| `AM-10` §9.3.8.4 | **If a new record class is introduced anywhere in the B architecture, §9.3.8 MUST gain a row for it**, answering all **eight** questions, **before** that class may be written. **`AM-10a`** forbids invoking it for a class this document already names, and **`AM-10b`** extends the same rule to a reference role absent from CD-3. **§9.3.8.4 is the normative statement; this row is a pointer.** |

---

# PART Q — FINAL VERDICT

## Q.1 Roll-up

| Group | Result |
| :-- | :-- |
| **Findings** | `JBA16-AUD-01` **CLOSED** · `JBA16-AUD-02` **CLOSED** · `JBA16-AUD-03` **CLOSED** (carried, byte-for-byte) · `JBA16-AUD-04` **CLOSED** — all three re-closed against defects an independent audit found in V1.7 (Part D, **Part D.1 addendum**) |
| **Prior findings** | **17** re-proved **against their ORIGINAL defects**, not against V1.6 wording (Part E.1) — **0 regressions** |
| **Frozen areas** | **27 of 27** verified present and unchanged, including the three the V1.6 audit accepted (Part E.2) |
| **Open items** | **13 of 13 CLOSED VALIDLY**; **O-06a** closed by the four repairs, re-verified after the V1.8 addendum; **O-01** carried and not reopened (Part F) |
| **O-06a standard** | **18 of 18** required pure total functions supplied **in this contract** (Part F.1) |
| **Contradiction gate** | **PASS** — CG17-1…CG17-18 all PROVEN, plus 21 authority rows (Part O) |
| **Firewall** | UNAUTHORIZED B ANALYTICAL RULES: **NONE**; NEW C2 SEMANTICS: **NONE** (Part N) |
| **Human decision** | **NONE required** (Part F.2) |

## Q.2 Final state

```
Artifact                 : PAGAMENOS_M3_5B_B_ARCHITECTURE_CONTRACT_V1_9.md
Baseline SHA             : 6cde4342a6d12d4339c58560da45c2458821deaf
Baseline tree            : 8cec9d2d8e437ee6ca081b16b4b5321aa1cb247a   (re-verified)
V1.7 candidate           : worktree blob c00ff0e1c36633dd56a5a48a6aed0130618fae54
                             (independently inspected; JBA16-AUD-01/02/04 reopened)
Rejected B1              : a586b3119da2cc1aa4668485b129dbe625ab5cae
Rejected tree            : ae31d6649303d04bd334ef1bf93ec56b915d39fe   (re-verified)
Supersedes               : V1.8 in full, ONLY IF INDEPENDENTLY ACCEPTED
V1.6, V1.7 and V1.8      : NEITHER AMENDED NOR DELETED

JBA16-AUD-01 citation      : CLOSED -- CitationDependencyGraph defined normatively
  dependency totality        (9.3.5.1); CD-3 closed classification of all 24
                             reference roles into semantic citation / mere
                             provenance / structural endpoint; CD-4/CD-5
                             construction layers L0..L5; CD-01 ACYCLIC; CD-7 cycle
                             semantics -- every member ineligible, every member
                             seeds, joint scope fails closed, typed error, NO
                             winner; CD-8 prohibits fixed-point iteration and every
                             precedence rule and records why a DAG was chosen;
                             CD-9 PROVES stratification and termination; V1.8:
                             CD-5a NAMES the single L2->L5 exception CD-3 row 8
                             required and CD-5 forbade, proved non-recursive via
                             ExposureFact's own citation (row 10);
                             BI-44; ADR-27; DB-08c; CD-1..CD-6 cases; AT-31

JBA16-AUD-02 registry      : CLOSED -- 9.3.8 reissued as a CLOSED registry, now 22
  exhaustiveness             persisted classes x 8 questions (9.3.8.1, 9.3.8.2);
                             the six V1.6 omissions each given a row -- source-
                             native relation, decomposition ambiguity, non-
                             grounding marker, structural-admission record,
                             affected-scope record, integrity-error/anomaly record
                             -- plus deletion residue; V1.8 adds row 22,
                             LateActualTransactionFactSatellite (Tier 1,
                             preservation-only, no scalar, no selection rule,
                             future scalar needs an accepted O-11 amendment);
                             9.3.8.3 subsumption and exclusion register for every
                             other logical name; IQ-16 disposition-control
                             eligibility; FS-9/QS-8 make all Tier 4 non-seeding;
                             AM-10a, AM-10b; DB-08b; AT-33, AT-34

JBA16-AUD-03 cardinality   : CLOSED (carried unchanged, byte-for-byte) -- 23.1
                             corrected to 0..N active quarantines per target
                             record; rescission, disposition-event and
                             semantic-citation rows added; the 0..1 reading
                             EXPRESSLY WITHDRAWN; aligned at 5, 9.3.3.3, 18.7,
                             25.5; DB-08a carries an E-D obligation for the
                             absence of any 0..1-shaped column; AT-23n

JBA16-AUD-04 disposition   : CLOSED -- the V1.6 YES retained and made executable.
  of disposition             DISPOSITION_EVENT_STRUCTURALLY_VALID /
                             _GENERATION_AUTHORIZED / _CURRENTLY_QUARANTINED
                             separated; DISPOSITION_EVENT_EFFECTIVE derived; THE
                             FOLD NOW TESTS EFFECTIVE, NOT ADMISSIBLE (9.3.3.3);
                             DispositionControlGraph (9.3.3.7) with DG-01 ACYCLIC;
                             DG-2 self-target INDIVIDUALLY record-level invalid;
                             V1.8: DG-3 NARROWED to a prospective write-time-only
                             admission test -- rejects a PROPOSED ancestor-target
                             edge against the currently persisted graph, and
                             establishes NOTHING about an already-persisted event;
                             DG-4 alone governs a persisted cycle, NO member
                             individually excludable by cycle membership alone;
                             DG-6..DG-8 control depth and PROVED termination
                             (V1.6's circular DS-5 argument withdrawn);
                             DG-9/DE-12 one-way stratification; IQ-15
                             CONTROL_BASIS_FALSE, quarantine targets only,
                             CARRIED UNCHANGED; DCG-1..DCG-8 discharged (9.3.3.8);
                             MQ-9, MQ-10; Cases M and N; AN-1a structural harm;
                             BI-45; ADR-28; DB-08d; AT-32

Prior findings re-proved   : JBA15-AUD-01 CLOSED   JBA15-AUD-02 CLOSED
  against ORIGINAL defects   JBA15-AUD-03 CLOSED   JBA14-AUD-01 CLOSED
                             JBA14-AUD-02 CLOSED   JBA13-AUD-01 CLOSED
                             JBA13-AUD-02 CLOSED   JBA13-AUD-06 CLOSED
                             JBA-AUD-07   CLOSED   JBA-AUD-12   CLOSED
                             JBA-AUD-22   CLOSED   JBA12-AUD-08 CLOSED
                             JBA12-AUD-12 CLOSED
                             -- 17 of 17 with JBA16-AUD-01..04; 0 REGRESSIONS

O-06a                      : CLOSED VALIDLY -- 18 of 18 required functions supplied
O-01                       : CLOSED VALIDLY (carried, accepted, not reopened)
All 13 JBA open items      : CLOSED VALIDLY  (0 PARTIAL, 0 CONTRADICTORY, 0 OPEN)

Contradiction gate         : PASS -- CG17-1..CG17-18 + 21 authority rows
Frozen-area regression     : NONE -- 27 of 27 intact
Adversarial threats        : 61, each with a required invariant
Termination                : PROVED -- two finite acyclic graphs, five strata,
                             at most |R| steps, exactly one value per record
                             (CD-9, DG-8). No fixed-point iteration anywhere.

Accepted authority         : M3.5A / A1 / A2 / B V1.3 UNCHANGED -- no authority mutation
Repository mutated         : NO -- HEAD, index and worktree untouched; document-only
                             untracked candidate; no commit, no push
Code changed               : NONE -- no Prisma, migrations, services, runtime, tests,
                             CI, harness, DDL or migration text
Files created this patch   : 1 -- PAGAMENOS_M3_5B_B_ARCHITECTURE_CONTRACT_V1_9.md
B1S / B2S                  : NOT BEGUN; not authorized by this artifact
C1 / C2                    : NOT AUTHORIZED
AnalysisProtocol v1        : UNFROZEN
Human semantic decision    : NONE REQUIRED
Clean rehoming             : OUTSTANDING OPERATOR ACTION (OP-1) -- not part of this patch
```

## Q.3 Verdict

## M3.5B-B JOINT ARCHITECTURE V1.9 READY FOR INDEPENDENT ACCEPTANCE AUDIT

**Not self-accepted.** This artifact does **not** declare its own acceptance, does not claim `M3.5B-B JOINT ARCHITECTURE ACCEPT`, and does not supersede V1.8 until an independent acceptance audit says so. That verdict belongs exclusively to the independent auditor.

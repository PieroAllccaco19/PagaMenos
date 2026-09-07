<!-- R-B-17 ACCEPTANCE BANNER - BEGIN. Added by the R-B-17 authority repair. Nothing below the END marker is altered. -->

> # ACCEPTED — B SEMANTIC AUTHORITY
>
> **Status:** `ACCEPTED B SEMANTIC AUTHORITY`
>
> This document is the **accepted semantic basis for the M3.5B-B phase**. Independent final verdict:
>
> ```
> M3.5B-B SEMANTIC RATIFICATION ACCEPT
> ```
>
> **Resolution of the in-document status lines.** The body below was authored as a *candidate* and therefore still reads `CANDIDATE — NOT FINAL AUTHORITY`, `R-B-17 AUTHORITY REPAIR NOT EXECUTED`, and (in §14) instructs the reader not to execute R-B-17. Those lines were accurate at authoring time and are now **resolved by events**, in exactly two respects:
>
> 1. **Authority status.** The candidacy condition in §14 — *"V1.3 is a candidate ratification until finally accepted"* — has been **satisfied**. V1.3 is accepted and is the controlling B semantic authority. `V1`, `V1.1` and `V1.2` are superseded historical review artifacts (archived under `docs/authority/archive/m3.5b-b/`).
> 2. **R-B-17 execution.** R-B-17 has since been **executed**, exactly as clause R-B-17 and open item **O-12** required. See `PAGAMENOS_R_B_17_AUTHORITY_REPAIR_REPORT.md` and the root register `PAGAMENOS_SPEC_AUTHORITY.md`. The §14 instruction not to execute it is therefore **discharged, not violated**.
>
> **Everything else in §14 remains in force.** In particular the Joint B Architecture is still not drafted, no implementation is authorized, `AnalysisProtocol v1` remains **UNFROZEN**, C1/C2 remain unauthorized, and Wave 0 remains unauthorized. On acceptance, the next artifact is the **`M3.5B-B ARCHITECTURE CONTRACT — B1+B2`**, which is **NOT YET DRAFTED**.
>
> **Nothing in this banner ratifies, resolves, narrows or extends any clause of the body.** No open item in §9 is closed by it; **O-12 is the sole exception**, and only because its owner was defined as *"R-B-17 authority repair, before R-B-17 is considered complete"*. The Rev 2 §6.A and §8 annotations that O-12 required are now visible in `PAGAMENOS_PHASE_0A-2_REDTEAM_PATCH_REV2.md` and cite this document as the controlling amendment authority.
>
> **Body integrity.** Everything after the `R-B-17 ACCEPTANCE BANNER - END` marker is the ratified document, byte for byte. Its SHA-256 before this banner was added was:
>
> `sha256:b4f83051a17d7318c8c871e14d2dc4b88c2add560414a01134962610826e76f4`
>
> Verify with: `tail -n +30 PAGAMENOS_M3_5B_B_SEMANTIC_RATIFICATION_V1_3.md | sha256sum`

<!-- R-B-17 ACCEPTANCE BANNER - END -->

# PAGAMENOS — M3.5B-B SEMANTIC RATIFICATION — V1.3

**Nature:** **HUMAN-AUTHORITY PATCH — CANDIDATE.** Every normative clause is classified **INHERITED**, **HUMAN-RATIFIED**, or **STRICT CONSEQUENCE**. No clause is new unratified authority, and no universal governance doctrine is asserted.
**Status:** SEMANTIC RATIFICATION ONLY. No implementation, no code, no migrations, no B1/B2 implementation, **no authority repair (R-B-17 NOT executed)**, no Joint B Architecture drafting, no `AnalysisProtocol v1` freeze, no Wave 0.
**Authority status:** **CANDIDATE — NOT FINAL AUTHORITY.** V1.3 becomes authority only on final acceptance.
**Supersedes:** `PAGAMENOS_M3_5B_B_SEMANTIC_RATIFICATION_V1_2` in full. V1, V1.1 and V1.2 are historical.
**Non-authoritative input:** `PAGAMENOS_M3_5B_B1_EFFECTIVE_SPEC_V1` is a **diagnostic document only**.

**Scope of this revision.** Minimal. It closes exactly one acceptance blocker — **RAT-V12-01** — and applies the mechanical reference updates that closure requires. No other semantic decision is reopened: Model B, B1/B2 ownership, R-B-01…R-B-17, HR-B-01…HR-B-10, the P-03/P-05/P-06/P-17 corrections, the B/C firewall, O-16, O-17, the `Outcome` gate, the RT-09 gate and the authority-repair plan are all carried unchanged.

---

## 1. Contradiction gate — result

> **RESULT: NO NEW CONTRADICTION.**

**RAT-V12-01 was both a deadline violation and a circular dependency.** JA-06 required the Joint B Architecture to settle *what provenance/reconciliation information B1 must preserve for B2*, while the V1.2 register assigned that same semantic decision to the **B1 Effective Spec** with a deadline of B1S acceptance. Since B1S is derived from JBA (HR-B-06 step 3), the architecture could not have been accepted without an answer that only a downstream artifact was authorized to give. §5 splits the decision; §10 and §12 prove the cycle is gone.

**Sweep performed.** Every JA item was re-checked against its register row for the same defect: JA-01→O-01, JA-02→O-02, JA-03→O-03, JA-04→O-04, JA-05→O-13, JA-07→O-15 all close at JBA acceptance with only *representation* deferred. **JA-06 was the only instance**, consistent with the audit finding exactly one blocker.

**Defects corrected in earlier revisions (carried, not reopened).** V1/V1.1 P-05 contradicted Rev 2 §6.E's "Legal/consent deletion overrides analysis retention" — repaired in V1.2 §4.2. V1.1 P-03, P-06 and P-17 asserted unsupported generalizations — repaired in V1.2 §4.1/§4.3/§4.4.

---

## 2. Finding closure history

| Finding | Defect | Correction |
| :-- | :-- | :-- |
| **RAT-V12-01** | JA-06 required JBA to settle what B1 must preserve for B2, but O-06b assigned that decision to B1S — later than, and derived from, the artifact needing it | §5 · **O-06b split** into **O-06b-ARCH** (JBA, semantic preservation contract) and **O-06b-SPEC** (B1S, representation); §5 JA-06 updated; §9/§10/§12 updated |
| RAT-V11-01 … 07 | *(closed in V1.2, carried)* P-03 overbreadth; P-05 vs Rev 2 §6.E; P-06 vs B2's exposure charter; P-17 universal doctrine; deadlines set at implementation; O-07 combining B2 and C2; RT-09 phrase ungated | §§4.1–4.4 (carried), §5, §7, §8, §9, §10 |
| B-RAT-01 … 11 | *(closed in V1.1, carried)* numerator over-reach; distinctness/independence conflation; literal §6.A shape; `intendedTransactionAt`; `Outcome` gate; process order; OPEN-6 claim; corroboration reading; blanket import; R-B-16 rationale; owners/deadlines | HR-B-01 … HR-B-10, §6, §9 |

---

## 3. Ratified architectural clauses R-B-01 … R-B-17

Carried from V1.2 **unchanged**. Wording amendments in force: R-B-04/R-B-11 read "where real-world distinctness is established" (HR-B-02); R-B-06 separates identity from establishment (HR-B-08); R-B-09 is subject to §4.2's legal/consent carve-out; R-B-13's analysis-facing obligation is HR-B-03; R-B-16's rationale is HR-B-10.

| Clause | One-line statement | Provenance |
| :-- | :-- | :-- |
| R-B-01 | Occasion = one real-world attempted/realized purchase; the enumerated app-side facts are insufficient | definition INHERITED; enumeration HUMAN-RATIFIED |
| R-B-02 | Two-stage B: B1 candidate identity, B2 canonical occasion + exposure reconciliation | HUMAN-RATIFIED |
| R-B-03 | B2 establishes an occasion from ≥1 admissible real-world observation source; C-evidence never required | rule HUMAN-RATIFIED; no-evidence-gate INHERITED |
| R-B-04 | No 1:1 intent↔occasion; `UNIQUE(originIntentId)` forbidden as canonical identity | HUMAN-RATIFIED |
| R-B-05 | `createdFromIntentId` superseded; zero/one/many links; no synthetic intents | HUMAN-RATIFIED |
| R-B-06 | Provenance separable from identity; no source id is identity; one authoritative source may suffice | HUMAN-RATIFIED |
| R-B-07 | `merchantId` = real-world merchant, never auto-copied from A2 intent | HUMAN-RATIFIED |
| R-B-08 | Exactly one participant, immutably; relational satisfaction permitted; named + tested projection required | field INHERITED; permission HUMAN-RATIFIED |
| R-B-09 | Invalidation lineage is intent history only — subject to §4.2 | INHERITED; enumeration HUMAN-RATIFIED |
| R-B-10 | Merge/supersession/correction as append-only adjudication history | INHERITED; append-only requirement HUMAN-RATIFIED |
| R-B-11 | B1 hard-codes no individuation rule; B2 owns distinctness; anti-inflation invariant binding | placement HUMAN-RATIFIED; invariant INHERITED |
| R-B-12 | `TIMESTAMPTZ(6)`; full microsecond precision; no JS `Date`; no timestamp is identity | convention INHERITED; prohibitions HUMAN-RATIFIED |
| R-B-13 | Canonical identity append-only; late facts on append-only satellites | discipline INHERITED; resolution HUMAN-RATIFIED |
| R-B-14 | No digest required; none stored unless PostgreSQL verifies its semantic content | absence INHERITED; default HUMAN-RATIFIED |
| R-B-15 | Receipt is a pointer; re-prove targets; direct-SQL forgery in scope; fail closed by default | architecture INHERITED; rules HUMAN-RATIFIED |
| R-B-16 | Hosted real-PostgreSQL gate before B acceptance | HUMAN-RATIFIED (HR-B-10 rationale) |
| R-B-17 | Authority repair before B implementation — **NOT EXECUTED** | defects INHERITED; pre-condition HUMAN-RATIFIED |

HR-B-01 … HR-B-10 are carried unchanged from V1.1 §4 and remain in force.

---

## 4. Narrowing corrections (carried from V1.2, unchanged)

### 4.1 P-03 narrowed — **HUMAN-RATIFIED**

The legacy `occasionKey` removed by Rev 2 §8 MUST NOT be treated as a surviving inherited contract field, nor silently restored under its former semantics. Preserved separately, not merged into a universal ban: no source-system identifier is canonical identity (R-B-06); no timestamp is canonical identity (R-B-12); `UNIQUE(originIntentId)` and equivalents remain forbidden (R-B-04); the rejected digest design remains unauthorized (R-B-14). **No universal prohibition on every conceivable deterministic identity construction is ratified**; that question is **O-16**, default *no new deterministic canonical key authorized*. The universal prohibition MUST NOT be labelled INHERITED.

### 4.2 Legal / consent deletion override — **INHERITED** (override) / **HUMAN-RATIFIED** (narrowing)

A2 invalidation, withdrawal-as-analytical-event, intent replacement, candidate correction, or later analysis classification MUST NOT selectively delete, mutate, or mark a real `PurchaseOccasion` ineffective **merely to alter scientific results**. **However**, legally required, consent-required, privacy-required or other explicitly authorized deletion obligations remain **controlling**, per Rev 2 §6.E. Scientific append-only preservation and mandatory legal deletion are different concerns; this ratification does not claim retention overrides a controlling deletion obligation. Where deletion is required: execute the authoritative deletion/privacy process; preserve only legally permitted audit metadata; analysis handles the resulting missingness conservatively per the future `AnalysisProtocol`. The exact implementation is not invented here.

*Inherited, verbatim:* Rev 2 §6.E — "…a sensitivity treating withdrawals conservatively rather than selectively deleting poor outcomes. **Legal/consent deletion overrides analysis retention.**"

**STRICT CONSEQUENCE (O-17).** The accepted append-only pattern blocks `DELETE` unconditionally (A1 §21; A2 V4 §28). The Joint B Architecture MUST define how an authorized deletion/redaction obligation is satisfied against append-only B tables and what audit residue is legally permitted.

### 4.3 P-06 replaced — **HUMAN-RATIFIED**

**B MAY persist:** raw exposure facts; provenance facts; reconciliation facts; observation facts; append-only adjudication facts; factual contamination-relevant observations; non-authoritative diagnostic/cache values explicitly permitted by higher authority.

**B MUST NOT persist as authoritative B semantics:** final scientific-independence classification; final contamination eligibility; final RIVSR numerator eligibility; final participant denominator eligibility; final opportunity-threshold classification; final C2 analytical status; any cached value presented as the authoritative C2 result.

A permitted diagnostic cache MUST be explicitly non-authoritative, MUST leave the underlying facts authoritative, MUST be reproducible from or checked against its authority, and MUST NOT silently become the scientific analysis result. Compatible with B2 owning exposure reconciliation (R-B-02): B2 reconciles and persists exposure *facts*; it does not conclude contamination *eligibility*.

### 4.4 P-17 narrowed and split

**(a)** Commit `a586b3119da2cc1aa4668485b129dbe625ab5cae` is **evidence only** and MUST NOT be treated as B semantic authority — established process state.
**(b)** B architecture and effective specifications require the B-scoped independently reviewed authority process before implementation — **HUMAN-RATIFIED via R-B-17**.
**No universal doctrine is asserted**; "nothing anywhere becomes authority without an independent gate" is not ratified here.

### 4.5 Carried firewalls

**Numerator/denominator firewall (HUMAN-RATIFIED).** *Data-model capability is not analysis eligibility.* B MAY preserve facts for future analysis. B MUST NOT decide final numerator eligibility, final denominator eligibility, scientific independence, treatment of UNKNOWN independence, sensitivity/bounds logic, economic opportunity thresholds, or final analysis windows. B2 MAY determine whether one or multiple real-world occasions occurred, which observations support the same canonical occasion, and whether a candidate is sufficiently established under the ratified taxonomy.

**Provenance states (HUMAN-RATIFIED).** B MUST distinguish, without collapsing: `A2_ENTRY_SOURCE_PRESENT`; `NON_A2_PROVENANCE_PRESENT`; `AFFIRMATIVE_NON_INDEPENDENCE_EVIDENCE`; `PROVENANCE_UNKNOWN`. Labels need not be literal enum values. **`PROVENANCE_UNKNOWN` MUST NOT be converted into a negative determination** (INHERITED: Rev 2 §6.D).

**Distinctness / independence firewall (HR-B-02).** Real-world distinctness is **B2**'s; scientific independence is **C2 / `AnalysisProtocol`**'s. B MUST NOT use independence as the individuation predicate; C2 MUST NOT change B2's canonical occasion count.

---

## 5. RAT-V12-01 closure — the B1→B2 preservation contract

### 5.1 `O-06b-ARCH` — B1 preservation contract — **HUMAN-RATIFIED**

**Question.** What semantic information MUST B1 preserve so that B2 can perform occurrence establishment, provenance-aware reconciliation, real-world distinctness adjudication, source linkage, correction/retraction, and canonical `PurchaseOccasion` construction **without reconstructing or guessing facts that B1 discarded**?

**Primary owner:** **Joint B Architecture.** **Deadline:** **before Joint B Architecture acceptance.**

The Joint B Architecture MUST define, at the semantic-contract level:

* categories of information B1 must preserve;
* source provenance requirements;
* source authority metadata required downstream;
* event-time and knowledge-time facts required downstream;
* participant linkage required downstream;
* intended/observed merchant facts required downstream;
* correlation/linkage facts required downstream;
* correction/retraction lineage that must remain observable;
* any source-specific identity necessary to re-prove provenance;
* information required for B2 ambiguity/distinctness adjudication;
* information B1 MUST NOT discard because B2 cannot safely reconstruct it.

This is an **architecture-level semantic preservation contract**. It MUST NOT prescribe exact columns, table names, indexes, Prisma models, DTO field names, or physical serialization.

### 5.2 `O-06b-SPEC` — B1 implementation-grade representation — **HUMAN-RATIFIED**

**Question.** How does the B1 Effective Specification represent and expose the preservation contract ratified in O-06b-ARCH?

**Primary owner:** **B1 Effective Spec.** **Deadline:** **before B1 Effective Spec acceptance.**

The B1 Effective Spec MUST map every architecture-required preserved fact into persistence representation, service/API contract, append-only behaviour where applicable, idempotency semantics, integrity constraints, and tests. It MUST prove **complete coverage** of O-06b-ARCH. It MAY choose implementation details not fixed by the Joint Architecture, provided they do not alter the semantic preservation contract.

### 5.3 Why the split is required

The preservation contract is a **shared** contract: B2 depends on it to reconcile, and B1 depends on it to know what it may not discard. A shared contract cannot be owned by one of the two artifacts that derive from it. Leaving it at B1S made JBA acceptance depend on a downstream answer — the cycle §12 now proves absent.

---

## 6. Joint B Architecture — gating decisions JA-01 … JA-07

Per HR-B-06, these MUST be closed **before Joint B Architecture acceptance**. Physical/DDL design may remain to the effective specs where noted.

| # | Decision that must close at the architecture gate | Register row(s) |
| :-- | :-- | :-- |
| **JA-01** | Admissible observation-source taxonomy: source classes; authority levels; whether one source may establish occurrence; candidate-generating source semantics | O-01 |
| **JA-02** | `Outcome` source role/ownership: admissible?; B1 owns or consumes?; statuses relevant to candidate generation; participant/source authority; retry/idempotency meaning | O-02 |
| **JA-03** | `Outcome` attachment/cardinality semantics: ↔ Decision; ↔ Candidate; ↔ canonical occasion; one-to-many / many-to-one; correction/retraction; **RT-09 terminology clarification** (§8.3). *Physical FK/table design → effective specs* | O-03 |
| **JA-04** | `intendedTransactionAt` semantic contract: required?; optional?; obtainable by an intentless occasion from another admissible source?; or an observation rather than a canonical scalar. *Physical representation → B2S* | O-04 |
| **JA-05** | B2 establishment → C1 verification **semantic ordering**. C1 may restate it later but may not be the first artifact to define it | O-13 |
| **JA-06** | Provenance / source-link and preservation architecture — **all three of**: **O-06a** (architecture-level reconciliation/adjudication model), **O-06b-ARCH** (semantic preservation contract for B1→B2), **O-14** (provenance/source-link architecture: zero/one/many linkage; what B2 consumes). *Exact B1 persistence/API representation → **O-06b-SPEC**; exact B2 reconciliation algorithm/representation → **O-06c*** | O-06a, O-06b-ARCH, O-14 |
| **JA-07** | Event-time / knowledge-time semantics at architecture level. *Exact fields/storage types → spec level where appropriate* | O-15 |

---

## 7. Prohibition register

Every row normative and classified as exactly one of **INHERITED**, **HUMAN-RATIFIED**, **STRICT CONSEQUENCE**. Unchanged from V1.2.

| # | Prohibition | Classification |
| :-- | :-- | :-- |
| **P-01** | Treating a finalized `PurchaseIntent` — or any app-side fact of R-B-01 — as a `PurchaseOccasion` | HUMAN-RATIFIED (R-B-01) |
| **P-02** | `UNIQUE(originIntentId)` or equivalent finalization/context uniqueness as canonical occasion identity | HUMAN-RATIFIED (R-B-04) |
| **P-03** | Treating the legacy `occasionKey` deleted by Rev 2 §8 as a surviving inherited contract field, or silently restoring it under its former semantics | INHERITED (Rev 2 §8) |
| **P-03a** | Introducing a **new** deterministic canonical occasion key before **O-16** is resolved | HUMAN-RATIFIED (§4.1 default) |
| **P-04** | Inferring occasion merge, split, or lineage from the A2 invalidation/replacement lineage | INHERITED (A2 V4 §23/§44; A2 V1 §254) |
| **P-05** | Selectively deleting, mutating, or marking an occasion ineffective **in order to alter scientific results** | INHERITED (Rev 2 §6.E first half; RT-13) |
| **P-05a** | Claiming that immutable scientific retention overrides a controlling legal/consent/privacy deletion obligation | INHERITED (Rev 2 §6.E final sentence) |
| **P-06** | Persisting **as authoritative B semantics** any final independence classification, final contamination eligibility, final numerator or denominator eligibility, final opportunity-threshold classification, or final C2 analytical status | HUMAN-RATIFIED (§4.3); analysis ownership INHERITED (A2 V4 §2/§44; A1 §2; Rev 2 §6.C–F) |
| **P-06a** | Allowing a permitted diagnostic cache to be non-reproducible from its authority, or to silently become the scientific analysis result | HUMAN-RATIFIED (§4.3) |
| **P-07** | Applying the "meaningful opportunity" economic threshold as an authoritative B conclusion | STRICT CONSEQUENCE of §4.5; threshold ownership INHERITED (Phase 0A §13, H-P0-01) |
| **P-08** | Using JavaScript `Date` as the canonical representation of a stored `TIMESTAMPTZ(6)` instant where truncation is possible | HUMAN-RATIFIED (R-B-12) |
| **P-09** | Storing an immutable digest that only application code verifies | HUMAN-RATIFIED (R-B-14) |
| **P-10** | Assuming an attacker cannot issue direct SQL when reasoning about database integrity | HUMAN-RATIFIED (R-B-15) |
| **P-11** | Manufacturing synthetic `PurchaseIntent`s for purchases that occurred outside app usage | HUMAN-RATIFIED (R-B-05) |
| **P-12** | Using scientific independence as the predicate for occasion individuation | HUMAN-RATIFIED (HR-B-02) |
| **P-12a** | C2 / `AnalysisProtocol` changing B2's canonical occasion count | HUMAN-RATIFIED (§8.2) |
| **P-13** | Converting `PROVENANCE_UNKNOWN` into a negative determination | HUMAN-RATIFIED (§4.5); principle INHERITED (Rev 2 §6.D) |
| **P-14** | Implicit *latest-wins* / *first-wins* / *highest-confidence-wins* selection in any analysis-facing scalar projection | HUMAN-RATIFIED (HR-B-03) |
| **P-15** | Requiring corroboration from two or more sources as a universal establishment rule | HUMAN-RATIFIED (HR-B-08) |
| **P-16** | Beginning B1 implementation while the B1↔B2 cross-contract is unresolved | HUMAN-RATIFIED (HR-B-06) |
| **P-17** | Treating the rejected commit `a586b31` as B semantic authority | ESTABLISHED PROCESS STATE — recorded as INHERITED fact |
| **P-17a** | Beginning B architecture or effective-spec implementation without the B-scoped independently reviewed authority process | HUMAN-RATIFIED (R-B-17) |
| **P-18** | Omitting a canonical participant relation, or exposing no named/tested `participantId` projection | HUMAN-RATIFIED (R-B-08) |
| **P-19** | Restoring a mandatory singular `createdFromIntentId`, or requiring physical scalar columns merely because the superseded interface used them | HUMAN-RATIFIED (R-B-05, HR-B-03) |

---

## 8. O-07 split — B distinctness vs C independence (carried)

### 8.1 `O-B-DISTINCTNESS` — **HUMAN-RATIFIED**

**Question.** Under the B reconciliation model, what factual/reconciliation evidence establishes whether a failed attempt, retry, resumed attempt, or similar sequence represents **one** real-world `PurchaseOccasion` or **multiple**?
**Owner.** Joint B Architecture for the governing factual semantics; then B2 Effective Spec for the implementation-grade algorithm/representation.
**Deadlines.** Semantic rule/model: before JBA acceptance. Implementable B2 rule: before B2S acceptance.
**Constraint.** C2 / `AnalysisProtocol` MUST NOT determine how many real-world occasions existed. Where evidence cannot establish distinctness, B2 MUST preserve the ambiguity/reconciliation state rather than inventing a scientifically motivated time window solely to force identity.

### 8.2 `O-C-INDEPENDENCE` — **HUMAN-RATIFIED**

**Question.** Given already-established canonical occasions, what scientific windowing, contamination, initiation, independence and UNKNOWN-treatment rules determine analysis eligibility?
**Owner.** C2 / `AnalysisProtocol`. **Deadline.** Before `AnalysisProtocol` freeze and before C2S acceptance.
**Constraint.** MUST NOT change B2's canonical occasion count. Inherited anti-inflation requirements (Rev 2 §6.A) are preserved inside C2 analysis and MUST NOT be re-expressed as B2 identity rules. Sub-questions carried separately: **O-08**, **O-09**.

### 8.3 RT-09 terminology — hard architecture-gate condition — **HUMAN-RATIFIED**

The Joint B Architecture MUST remove the ambiguity in **"one `Outcome` per occasion/Decision"** before acceptance, distinguishing at minimum the **purchase-decision occasion** (A2 / RT-09) from the canonical **`PurchaseOccasion`** (B2). Final wording need not be chosen now, but the architecture cannot be accepted while the phrase remains ambiguous.

---

## 9. Open register

One semantic question per row; one primary owner; any later representation owner separated explicitly; acceptance-time deadline. No combined B2/C2 decision. **O-06b-ARCH and O-06b-SPEC MUST NOT be recombined.**

| ID | Semantic question | Primary owner · deadline | Later representation owner · deadline |
| :-- | :-- | :-- | :-- |
| **O-01** | Admissible observation-source taxonomy (JA-01) | Joint B Architecture · before **JBA acceptance** | — |
| **O-02** | `Outcome` source role and ownership (JA-02) | Joint B Architecture · before **JBA acceptance** | — |
| **O-03** | `Outcome` attachment/cardinality semantics + RT-09 clarification (JA-03, §8.3) | Joint B Architecture · before **JBA acceptance** | exact physical representation → owning effective spec · before **that spec's acceptance** |
| **O-04** | `intendedTransactionAt` semantic contract, incl. intentless occasions (JA-04) | Joint B Architecture · before **JBA acceptance** | physical representation → B2S · before **B2S acceptance** |
| **O-05** | Exact B1 candidate schema | B1 Effective Spec · before **B1S acceptance** | — |
| **O-06a** | Architecture-level reconciliation/adjudication model | Joint B Architecture · before **JBA acceptance** | — |
| **O-06b-ARCH** | What semantic information B1 must preserve for B2 | Joint B Architecture · before **JBA acceptance** | B1 Effective Spec maps it physically via **O-06b-SPEC** |
| **O-06b-SPEC** | How B1 represents/exposes the preservation contract | B1 Effective Spec · before **B1S acceptance** | — |
| **O-06c** | Exact B2 reconciliation algorithm/representation | B2 Effective Spec · before **B2S acceptance** | — |
| **O-B-DISTINCTNESS** | Failed/retry/resumed → one or multiple real-world occasions (factual semantics) | Joint B Architecture · before **JBA acceptance** | implementable rule → B2S · before **B2S acceptance** |
| **O-C-INDEPENDENCE** | Windowing/contamination/initiation/UNKNOWN rules for analysis eligibility | C2 / `AnalysisProtocol` · before **protocol freeze and C2S acceptance** | — |
| **O-08** | Scientific independence definition | C2 / `AnalysisProtocol` · before **protocol freeze and C2S acceptance** | — |
| **O-09** | Treatment of UNKNOWN independence | C2 / `AnalysisProtocol` · before **protocol freeze and C2S acceptance** | — |
| **O-10** | Receiptless-winner recovery protocol | **Default: none; fail closed.** Open only if the architecture/spec elects to support recovery | if elected → relevant effective spec · before **that spec's acceptance** |
| **O-11** | Scalar selection/adjudication rule for any analysis-facing scalar projection | Joint B Architecture · before **JBA acceptance**, where scalar projection is part of the shared B contract | spec-specific rule → owning spec · before **that spec's acceptance**. **No scalar projection may be implemented before its rule is accepted** |
| **O-12** | Annotation of Rev 2 §6.A/§8 as amended | R-B-17 authority repair · before **R-B-17 is considered complete** | carriage into `AnalysisProtocol` · before **protocol freeze** |
| **O-13** | B2 establishment → C1 verification semantic ordering (JA-05) | Joint B Architecture · before **JBA acceptance** | conformance/restatement → C1S · before **C1S acceptance** |
| **O-14** | Provenance / source-link architecture: zero/one/many linkage; what B2 consumes (JA-06) | Joint B Architecture · before **JBA acceptance** | exact DDL → owning effective spec · before **that spec's acceptance** |
| **O-15** | Event-time / knowledge-time semantics at architecture level (JA-07) | Joint B Architecture · before **JBA acceptance** | exact fields/storage types → owning spec · before **that spec's acceptance** |
| **O-16** | Whether canonical occasion identity must remain opaque/surrogate, or may use another deterministic construction (§4.1) | Joint B Architecture · before **JBA acceptance**. **Default until then: no new deterministic canonical key authorized** | — |
| **O-17** | How a controlling legal/consent/privacy deletion obligation is satisfied against append-only B tables, and what audit residue is legally permitted (§4.2) | Joint B Architecture · before **JBA acceptance** | exact deletion/redaction mechanism → owning effective spec · before **that spec's acceptance** |

### Mapping from the diagnostic register (OPEN-1 … OPEN-11)

OPEN-1 → O-01 · OPEN-1b → resolved by R-B-05, spawns O-04 · OPEN-2 → resolved (R-B-02) · OPEN-3 → resolved (R-B-02) · OPEN-4 → resolved (R-B-04, HR-B-02) · OPEN-5 → O-06a, O-06b-ARCH, O-06b-SPEC, O-06c, O-14 · OPEN-6 → split into O-B-DISTINCTNESS and O-C-INDEPENDENCE · OPEN-7 → resolved (R-B-07) · OPEN-8 → O-06a, O-06c · OPEN-9 → resolved (R-B-13); projection rule → O-11 · OPEN-10 → resolved (R-B-16, HR-B-10) · OPEN-11 → R-B-17, **not executed**; annotation → O-12.

---

## 10. Deadline-consistency proof

Artifact sequence:

```
JBA   M3.5B-B ARCHITECTURE CONTRACT — B1+B2      (first artifact of the B chain)
B1S   B1 Effective Specification                  B2S   B2 Effective Specification
B1I   B1 implementation                           B2I   B2 implementation
C1S   C1 Effective Specification
C2S   C2 Effective Specification / AnalysisProtocol v1 freeze
R17   R-B-17 authority repair (independent track; completes before B implementation)
```

| ID | First consuming artifact | Why it consumes the decision | Deadline | Result |
| :-- | :-- | :-- | :-- | :-- |
| O-01 | **JBA** | JBA must state the B2 establishment predicate | before JBA acceptance | **PASS** |
| O-02 | **JBA** | JBA must fix `Outcome` ownership and what B1 preserves | before JBA acceptance | **PASS** |
| O-03 | **JBA** | JBA must state candidate↔occasion↔Decision semantics unambiguously (§8.3) | before JBA acceptance | **PASS** |
| O-03 (physical) | owning effective spec | DDL first appears there | before that spec's acceptance | **PASS** |
| O-04 | **JBA** | JBA must state whether canonical occasions require an intended instant | before JBA acceptance | **PASS** |
| O-04 (physical) | **B2S** | occasion persistence model first appears there | before B2S acceptance | **PASS** |
| O-05 | **B1S** | the candidate schema is that document's own subject | before B1S acceptance | **PASS** |
| O-06a | **JBA** | shared adjudication model constrains both specs | before JBA acceptance | **PASS** |
| **O-06b-ARCH** | **JBA** | **JA-06 itself requires the architecture to define what B1 must preserve for B2** | **before JBA acceptance** | **PASS** |
| **O-06b-SPEC** | **B1S** | **physical/API representation first appears there** | **before B1S acceptance** | **PASS** |
| O-06c | **B2S** | the algorithm is that document's own subject | before B2S acceptance | **PASS** |
| O-B-DISTINCTNESS | **JBA** | the establishment/individuation boundary is shared contract | before JBA acceptance | **PASS** |
| O-B-DISTINCTNESS (algorithm) | **B2S** | implementable rule first appears there | before B2S acceptance | **PASS** |
| O-C-INDEPENDENCE | **C2S / protocol freeze** | no B artifact consumes it — §8.2 forbids B dependence | before protocol freeze and C2S acceptance | **PASS** |
| O-08 | **C2S / protocol freeze** | as above | before protocol freeze and C2S acceptance | **PASS** |
| O-09 | **C2S / protocol freeze** | RIVSR computation consumes it | before protocol freeze and C2S acceptance | **PASS** |
| O-10 | **only if elected** — else no consumer | default fail-closed needs no decision | before the electing spec's acceptance | **PASS** |
| O-11 | **JBA** (shared) / owning spec | a projection cannot be specified without its selection rule | before JBA acceptance / that spec's acceptance | **PASS** |
| O-12 | **R-B-17 completion** | the annotation is part of the repair itself | before R-B-17 complete; carriage before protocol freeze | **PASS** |
| O-13 | **JBA** | JA-05 forbids C1S being the first artifact to define the ordering | before JBA acceptance | **PASS** |
| O-14 | **JBA** | B1 and B2 share the linkage semantics | before JBA acceptance | **PASS** |
| O-15 | **JBA** | event/knowledge-time meaning is shared contract | before JBA acceptance | **PASS** |
| O-16 | **JBA** | canonical identity construction is shared contract; default holds until then | before JBA acceptance | **PASS** |
| O-17 | **JBA** | the append-only pattern is shared contract, and deletion capability constrains it | before JBA acceptance | **PASS** |

**All rows PASS.** No deadline falls later than the acceptance of the first artifact whose contract consumes the decision.

---

## 11. B phase spine and binding terminology

```
A1  Protocol / Cohort                                   ACCEPTED
A2  Intent / Decision                                   ACCEPTED
B1  Purchase Observation / Occasion Candidate Identity   ratified — not yet specified
B2  Purchase Occasion & Exposure Reconciliation          ratified — not yet specified
C1  Evidence / Attribution                               not authorized
C2  Analysis                                             not authorized
```

`B1 Opportunity Identity` remains superseded.

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

## 12. Internal consistency proof

| Check | Result |
| :-- | :-- |
| **B1 preservation semantics close at the architecture gate; only physical representation remains to B1S** | **PASS** — §5.1 O-06b-ARCH at JBA acceptance; §5.2 O-06b-SPEC at B1S acceptance; §9 keeps them separate rows; §10 proves both |
| **JA-06 no longer points to any open semantic decision deadlined later than JBA acceptance** | **PASS** — JA-06 now references exactly O-06a, O-06b-ARCH and O-14, all at JBA acceptance; O-06b-SPEC and O-06c are explicitly *representation*, not semantics |
| **No circular dependency between JBA and B1S remains** | **PASS** — every JBA-deadlined row (O-01, O-02, O-03, O-04, O-06a, O-06b-ARCH, O-B-DISTINCTNESS, O-11, O-13, O-14, O-15, O-16, O-17) is answerable without B1S or B2S output; the only rows consumed by JBA that formerly sat downstream have moved. Dependencies now run JBA → B1S/B2S → implementation, one direction only |
| Every JA item's semantic half closes at JBA acceptance | **PASS** — JA-01→O-01, JA-02→O-02, JA-03→O-03, JA-04→O-04, JA-05→O-13, JA-06→O-06a/O-06b-ARCH/O-14, JA-07→O-15 |
| P-03 narrowed; no universal deterministic-key ban labelled INHERITED | **PASS** — §4.1; P-03 scoped to the deleted `occasionKey`; P-03a the ratified default; O-16 carries the general question |
| Legal/consent deletion override retained and controlling | **PASS** — §4.2; P-05 narrowed; P-05a prohibits the inverse claim; O-17 records the append-only deletion-path obligation |
| B exposure/reconciliation storage not over-prohibited | **PASS** — §4.3; compatible with R-B-02 |
| P-17 narrowed; no universal governance doctrine | **PASS** — §4.4; P-17 process state, P-17a B-scoped |
| `Outcome` semantics close at the architecture gate | **PASS** — O-02, O-03 before JBA acceptance; §8.3 hard condition |
| `intendedTransactionAt` semantics close at the architecture gate | **PASS** — O-04 before JBA acceptance; physical representation to B2S only |
| B2 distinctness fully separated from C2 independence | **PASS** — §8.1/§8.2; P-12 and P-12a bar each direction |
| UNKNOWN treatment freezes before protocol/C2 acceptance | **PASS** — O-09 and O-C-INDEPENDENCE; P-13 bars negative conversion meanwhile |
| Rev 2 annotations happen during authority repair | **PASS** — O-12 |
| B2→C1 ordering exists before architecture acceptance | **PASS** — O-13 |
| Every normative prohibition is INHERITED / HUMAN-RATIFIED / STRICT CONSEQUENCE | **PASS** — §7 |
| Every open row has one owner, separated later owner, and an acceptance-time deadline | **PASS** — §9 |
| No deadline later than the first consuming artifact's acceptance | **PASS** — §10, all rows |
| No new normative choice outside RAT-V12-01 closure | **PASS** — §13 |

---

## 13. No-new-authority audit

Changes from V1.2 are confined to RAT-V12-01 closure and its mechanical reference updates:

| Change | Kind |
| :-- | :-- |
| §5.1 O-06b-ARCH introduced | HUMAN-RATIFIED (ratification patch §1) |
| §5.2 O-06b-SPEC introduced | HUMAN-RATIFIED (ratification patch §1) |
| §6 JA-06 row now references O-06a / O-06b-ARCH / O-14, with O-06b-SPEC and O-06c named as representation | mechanical reference update |
| §9 old O-06b row replaced by two rows | mechanical register update |
| §9 diagnostic mapping OPEN-5 / OPEN-8 references updated | mechanical reference update |
| §10 old O-06b row replaced by two proof rows | mechanical proof update |
| §12 three checks added (preservation gate, JA-06 pointer, no cycle) | proof statements, not normative clauses |

The candidate taxonomy was not expanded; no B1 schema was designed; no B2 reconciliation algorithm was decided; O-16 and O-17 remain unresolved; C2 ownership is unchanged; legal-deletion semantics are unchanged; `Outcome` semantics are unchanged beyond the existing gates.

```
NEW UNRATIFIED normative clauses: NONE
```

---

## 14. Authority status and prohibited next actions

V1.3 is a **candidate ratification** until finally accepted. Until then, do **NOT**: commit it as final authority; execute **R-B-17**; draft the Joint B Architecture; draft implementation code; draft isolated B1 implementation semantics; open B2 implementation.

On acceptance, the next artifact is the **`M3.5B-B ARCHITECTURE CONTRACT — B1+B2`**.

---

# Final Verdict

## M3.5B-B SEMANTIC RATIFICATION V1.3 READY FOR FINAL ACCEPTANCE CHECK

```
CANDIDATE RATIFICATION — NOT YET AUTHORITY.
NO IMPLEMENTATION AUTHORIZATION.
R-B-17 AUTHORITY REPAIR NOT EXECUTED.
JOINT B ARCHITECTURE CONTRACT NOT YET DRAFTED.
B1 / B2 EFFECTIVE SPECIFICATIONS NOT YET WRITTEN.
C1 / C2 NOT AUTHORIZED.
PRODUCTION PROTOCOL v1 UNFROZEN.
WAVE 0 NOT AUTHORIZED.
```

<!-- R-B-17 ARCHIVAL HEADER - BEGIN. Added by the R-B-17 authority repair. Nothing below the END marker is altered. -->

> # HISTORICAL / NON-NORMATIVE
>
> **Status:** `SUPERSEDED HISTORICAL REVIEW ARTIFACT - NON-NORMATIVE`
>
> **This document is retained as audit evidence only. It is NOT active authority and MUST NOT drive implementation, review, or gating.**
>
> **Accepted B semantic authority:** `PAGAMENOS_M3_5B_B_SEMANTIC_RATIFICATION_V1_3.md` (tracked at the repository root).
>
> **Supersession language inside this file is non-operative.** Any claim below of the form "fully supersedes" or "fully replaces" described the review packet submitted to one historical gate. It does **not** supersede, and never superseded, the active normative artifact named above. See Appendix B of the canonical A2 specification for the full register of neutralized claims.
>
> **Body integrity.** Everything after the `R-B-17 ARCHIVAL HEADER - END` marker is the original file, byte for byte. Its SHA-256 before archival was:
>
> `sha256:bb436b2ea2131fcd2d040f00265897fa9f42369220ca48d26c9d549c00671302`
>
> Verify with: `tail -n +23 <this file> | sha256sum`
>
> **Root authority register:** `PAGAMENOS_SPEC_AUTHORITY.md` · **Repair record:** `PAGAMENOS_R_B_17_AUTHORITY_REPAIR_REPORT.md`

<!-- R-B-17 ARCHIVAL HEADER - END -->

# PAGAMENOS — M3.5B-B SEMANTIC RATIFICATION — V1.1

**Nature:** **HUMAN-AUTHORITY PATCH — CANDIDATE.** Clauses marked *HUMAN-RATIFIED* are **decisions**, not derivations. Clauses marked *STRICT CONSEQUENCE* follow deductively from an inherited or human-ratified clause with no additional choice. **No clause in this document is new unratified authority.**
**Status:** SEMANTIC RATIFICATION ONLY. No implementation, no code, no Prisma, no migrations, no B1/B2 implementation, no authority repair (R-B-17 **not** executed), no `AnalysisProtocol v1` freeze, no Wave 0.
**Authority status:** **CANDIDATE — NOT FINAL AUTHORITY.** V1.1 becomes authority only on independent acceptance. It MUST NOT be committed as final authority before that.
**Supersedes:** `PAGAMENOS_M3_5B_B_SEMANTIC_RATIFICATION_V1` in full. V1 is historical.
**Non-authoritative input:** `PAGAMENOS_M3_5B_B1_EFFECTIVE_SPEC_V1` is a **diagnostic document only**. Nothing in it is normative here except where this document independently re-grounds a clause on primary authority or a human ratification (HR-B-09).

---

## 1. Contradiction gate — result

Every clause was re-checked against the immutable higher-order authority: Rev 2 §6.A–F, §5/RT-10; Patch §RT-08, §RT-09, §RT-11, §RT-13; RT-04 micro-patch; Phase 0A-2 FINAL; accepted A1 and A2.

> **RESULT: NO NEW CONTRADICTION WITH IMMUTABLE HIGHER-ORDER AUTHORITY.**

The patch **removes** two defects present in V1 rather than introducing any:

* V1 §5.3 decided an analysis-eligibility question (numerator entry) inside a B-phase document. Corrected by **HR-B-01**. The governing home for missing/unknown provenance is Rev 2 **§6.D**, whose entire subject is conservative treatment of missing data — a better fit than the exclusion V1 asserted.
* V1 §5.1 required the analysis projection to "reproduce the Rev 2 §6.A shape" while R-B-05 permitted occasions with no A2 intent. Since §6.A's `intendedTransactionAt` is an A2-derived instant, V1 latently required an A2 field for occasions that may have no A2 link. Corrected by **HR-B-03** + **HR-B-04**.

---

## 2. Audit-finding map (B-RAT-01 … B-RAT-11)

*The audit's own finding texts were not supplied to this document; the mapping below is keyed to the corrections received and MUST be checked against the audit's register during acceptance.*

| Finding | Defect in V1 | Correction |
| :-- | :-- | :-- |
| **B-RAT-01** | §5.3 ratified "intentless occasions MUST NOT enter the numerator" — a C2 eligibility judgement made in a B document | **HR-B-01** + §5 firewall + §6 provenance states. Statement deleted. |
| **B-RAT-02** | "independence" used both for occasion individuation and for study eligibility | **HR-B-02** terminology firewall; R-B-04 / R-B-11 re-worded to *real-world distinctness* |
| **B-RAT-03** | §5.1 required reproducing the superseded literal §6.A physical shape | **HR-B-03** — logical semantics, not physical shape; explicit selection/adjudication rules required |
| **B-RAT-04** | `intendedTransactionAt` for intentless occasions was left latently contradictory | **HR-B-04** — explicit open decision, owner + deadline |
| **B-RAT-05** | `Outcome` ownership raised as a consequence but not gated | **HR-B-05** — hard gate on B1 Effective Spec acceptance; RT-09 phrase must be clarified |
| **B-RAT-06** | Process ordered B1 spec before B2 architecture was known | **HR-B-06** — Joint B Architecture Contract first |
| **B-RAT-07** | OPEN-6 claimed "conservative resolution ratified now" | **HR-B-07** — claim removed; anti-inflation invariant retained as inherited, individuation not decided |
| **B-RAT-08** | R-B-06 admitted a reading that B2 always requires ≥2 corroborating sources | **HR-B-08** — identity vs establishment separated; one sufficient source MAY suffice |
| **B-RAT-09** | Wholesale import of the diagnostic document's §23 prohibitions | **HR-B-09** + §8 clause-level prohibition register with four classifications |
| **B-RAT-10** | R-B-16 justified by "more conservative ⇒ cannot contradict" | **HR-B-10** — invalid argument form replaced with an inspection finding + explicit engineering-assurance ratification |
| **B-RAT-11** | "No question remains unowned" claimed without owners/deadlines; firewall and provenance states absent | §5 firewall, §6 provenance states, §9 open register with owner + deadline for every item; the claim is not repeated |

---

## 3. Ratified architectural clauses R-B-01 … R-B-17 (as amended)

Not reopened. Wording amendments only where a correction requires them.

| # | Clause | Provenance |
| :-- | :-- | :-- |
| **R-B-01** | `PurchaseOccasion` denotes one real-world attempted/realized purchase. The enumerated app-side facts — intent exists, intent finalized, decision exists, decision bound, exposure occurred — are individually and jointly insufficient to establish one. | Definition **INHERITED** (Rev 2 §6.A; Phase 0A H-P0-01; A1 §20). Enumerated prohibition **HUMAN-RATIFIED**. |
| **R-B-02** | Two-stage B: **B1 = Purchase Observation / Occasion Candidate Identity**, **B2 = Purchase Occasion & Exposure Reconciliation**. A B1 candidate is not a `PurchaseOccasion`, is never counted as an opportunity, never enters a denominator or RIVSR, never implies a real purchase occurred, and never implements reconciliation. | **HUMAN-RATIFIED** (the split, and the candidate layer). B-owns-identity-and-reconciliation is **INHERITED** (A1 §20). |
| **R-B-03** | A canonical `PurchaseOccasion` exists only when **B2** establishes, from **at least one** admissible real-world observation source, that an attempted or realized purchase occurred. C-phase verified-value evidence MUST NOT be required. | Establishment rule and actor **HUMAN-RATIFIED**. The no-evidence-gate constraint is **INHERITED** (Rev 2 §6.D; Patch §RT-11 anti-shrinkage; and structurally by RT-10, whose three `VerifiedValue` variants all carry `purchaseOccasionId`). Source taxonomy **OPEN** (§9). |
| **R-B-04** | No 1:1 intent↔occasion invariant. Permitted: one intent → zero; → one; → multiple **where real-world distinctness is established**; multiple intents/observations → one canonical occasion **where reconciliation establishes they represent the same real-world purchase**; an occasion with no originating intent. `UNIQUE(originIntentId)` and equivalent finalization/context uniqueness are **FORBIDDEN** for canonical occasion identity. | **HUMAN-RATIFIED**. *Amended by HR-B-02: "independence" replaced by "real-world distinctness" throughout.* Non-conflict with §RT-09 is **INHERITED** — RT-09's unit is the **purchase-decision occasion**, already implemented by A2 as `UNIQUE(PurchaseIntentDecisionRequest.intentId)`. |
| **R-B-05** | Rev 2 §6.A's required singular `createdFromIntentId` is superseded. An occasion MAY have zero, one, or multiple intent/source links. Intent provenance is supporting lineage, never identity authority. Synthetic intents MUST NOT be manufactured. | **HUMAN-RATIFIED** (amends a to-be-frozen contract field; §7.1). |
| **R-B-06** | Provenance MUST be representable separately from durable identity; one occasion MAY have multiple supporting sources; an append-only source-link structure is permitted. **No source-system identifier — intent id, report id, `Outcome` id, payment-observation id, or any other — is itself canonical occasion identity.** *However, one sufficiently authoritative admissible observation MAY suffice for B2 to establish that a purchase occurred, if the future ratified source taxonomy allows it. Multiple supporting sources are permitted but NOT universally required.* | **HUMAN-RATIFIED**. *Amended by HR-B-08 (identity ≠ establishment).* Exact representation **OPEN** (§9). |
| **R-B-07** | `PurchaseOccasion.merchantId` denotes the merchant of the real-world purchase and MUST NOT be auto-copied from the A2 intended merchant. A2 retains intended-merchant semantics; B2 determines/records the real merchant. | **HUMAN-RATIFIED**. Consistency with Rev 2 §6.A `purchaseFingerprint` and the "covered occasions" criterion (§6.C / H-P0-01) is **INHERITED** support. |
| **R-B-08** | Every occasion MUST resolve immutably and unambiguously to exactly one `StudyParticipant`. A duplicated column is not required if an immutable DB-enforced relation provides the same semantic projection; the interface MUST expose a **named and tested** `participantId` projection; a redundantly stored value MUST be proven coherent by PostgreSQL. | Participant field **INHERITED** (Rev 2 §6.A). Permission to satisfy it relationally, plus the projection and coherence conditions, **HUMAN-RATIFIED**. |
| **R-B-09** | A2 invalidation/replacement lineage is intent history only: it MUST NOT delete, mutate, mark ineffective, auto-merge, auto-split, or repoint a `PurchaseOccasion`. | **INHERITED** (A2 V4 §23/§44; A2 V1 §254; RT-13; Rev 2 §6.E; A1 §7). Enumerated list **HUMAN-RATIFIED**. |
| **R-B-10** | Duplicate resolution, merge/supersession and correction MUST be represented as append-only adjudication/reconciliation history. Canonical scientific history MUST NOT be silently rewritten. | **INHERITED** (Rev 2 §6.A "merge duplicates with an audit record"; RT-08; accepted append-only discipline). Append-only requirement **HUMAN-RATIFIED**. Exact representation **OPEN** (§9). |
| **R-B-11** | B1 MUST NOT hard-code whether failed→retry, resumed purchase, or similar sequences are one or multiple occasions. **B2 owns real-world distinctness reconciliation; the `AnalysisProtocol` owns any scientifically meaningful window/independence parameter.** The inherited anti-inflation invariant remains binding on whichever authority decides: *ambiguity MUST NOT inflate the primary numerator.* **This ratification does not choose whether any particular sequence is one or multiple occasions.** | Placement **HUMAN-RATIFIED**. Anti-inflation **INHERITED** (Rev 2 §6.A). *Amended by HR-B-02 and HR-B-07.* Individuation itself **OPEN** (§9). |
| **R-B-12** | All persisted B instants use `TIMESTAMPTZ(6)` semantics; any canonicalization/comparison preserves full microsecond precision; JavaScript `Date` MUST NOT be the canonical representation of a stored `TIMESTAMPTZ(6)` instant where truncation is possible. No timestamp is an occasion identity key. | `TIMESTAMPTZ(6)` convention **INHERITED** (M3.5A/A1/A2). `Date` prohibition and the no-timestamp-identity rule **HUMAN-RATIFIED**. |
| **R-B-13** | Canonical occasion identity is append-only. Later-learned facts — actual transaction time, fingerprint, reconciliation facts — are carried on append-only supporting records. The accepted append-only discipline is NOT weakened. | Discipline **INHERITED** (RT-08; A1 §21; A2 V4 §28). Satellite resolution **HUMAN-RATIFIED**. *V1's projection obligation is superseded by HR-B-03.* |
| **R-B-14** | No `identityDigest` is required. Do not store an immutable digest unless PostgreSQL can verify its **semantic content**, not merely its syntax. Default: omit it and rely on DB-enforced relational/coherence invariants. | Absence-of-requirement **INHERITED** (no accepted text requires a digest on `PurchaseOccasion`). Default and condition **HUMAN-RATIFIED**. |
| **R-B-15** | A receipt is a pointer, never identity authority. Every receipt resolution MUST re-prove that its target belongs to the material request/subject. Direct-SQL forgery is inside the threat model. Receiptless-winner adoption MUST fail closed unless the effective spec explicitly defines a recoverable durable protocol that proves the winner. | Receipt architecture **INHERITED** (A1 §9; A2 V4 §24/§25/§26; A2 V4 §7/§17). Pointer rule, threat model and fail-closed default **HUMAN-RATIFIED**. Recovery protocol **OPEN** (§9). |
| **R-B-16** | Before B1/B2 can be formally accepted, the hosted required-check surface MUST execute the authoritative real-PostgreSQL integration/adversarial suite. `db:migrate:check` or migration-text inspection is insufficient evidence for trigger semantics. | **HUMAN-RATIFIED** as an engineering-assurance tightening — see **HR-B-10** for the corrected rationale. Existence of the gap is **INHERITED** (P35A-06; M3.5A §30; A1 impl §N). |
| **R-B-17** | Before B implementation: version the accepted A2 effective specification chain (or a consolidated canonical A2 spec); update `PAGAMENOS_SPEC_AUTHORITY.md` to recognise M3.5A, A1, A2 and this ratification; record the B1/B2 split; require independently reviewed effective specifications before implementation. | Defects **INHERITED** (independently verifiable in the repository). Pre-condition status **HUMAN-RATIFIED**. **NOT EXECUTED** — see §11. |

---

## 4. Human-ratified corrections HR-B-01 … HR-B-10

### HR-B-01 — Intentless occasion ≠ numerator exclusion — **HUMAN-RATIFIED**

The V1 §5.3 conclusion is **deleted**. Ratified in its place:

A `PurchaseOccasion` without an A2-linked capture has no A2 capture-token `entrySource`. **That absence does NOT determine the occasion's scientific independence and does NOT by itself determine numerator eligibility.**

B1/B2 MUST preserve sufficient typed provenance for later independence classification **wherever such provenance exists**. Scientific independence, treatment of UNKNOWN/missing provenance, primary eligibility, bounds and sensitivity handling belong to **C2 / the frozen `AnalysisProtocol`**. This ratification does **not** decide whether an intentless or provenance-incomplete occasion enters the final numerator. Synthetic `PurchaseIntent`s remain forbidden (R-B-05).

Four states MUST be distinguished and MUST NOT be treated as equivalent — see §6.

*Inherited support:* Rev 2 §6.D is the governing home for missing/unknown data; it requires that missingness never make GREEN easier, never be read as zero, and be handled by conservative sensitivity — an analysis treatment, not a B-phase exclusion.

### HR-B-02 — Real-world distinctness ≠ scientific independence — **HUMAN-RATIFIED** (firewall) / **INHERITED** (the distinction itself)

| | **Real-world distinctness** | **Scientific independence** |
| :-- | :-- | :-- |
| Question | Do these records/signals represent one real-world attempted/realized purchase, or more than one? | Does the canonical occasion satisfy the study's participant-initiation / contamination / independence requirements? |
| Owner | **B2** | **C2 / `AnalysisProtocol`** |
| Used for | duplicate reconciliation; failed/retry/resumption individuation; one-vs-many canonical occasion determination | RIVSR eligibility; contamination rules; analysis classification |

**B1/B2 MUST NOT use scientific independence as the predicate determining whether one or multiple real-world occasions exist.** All R-B-04 / R-B-11 language is amended accordingly: *"where independence is established"* → *"where real-world distinctness is established."*

*Inherited support:* the frozen text already separates the two words — Rev 2 §6.A resolves ambiguity where **"distinctness cannot be established"** (real-world), while the RT-11 numerator requires **"distinct independent"** occasions (two conditions, not one). The firewall names a distinction the authority already draws.

### HR-B-03 — Amended Rev 2 §6.A logical interface — **HUMAN-RATIFIED**

V1's requirement to "reproduce the Rev 2 §6.A shape" is **superseded**. The analysis-facing interface MUST implement the **ratified logical semantics** of amended §6.A, not its superseded literal physical field shape. It MUST:

* preserve one canonical participant relation;
* preserve canonical real-world merchant semantics;
* expose complete zero-to-many provenance/source linkage;
* preserve append-only late-fact and adjudication history;
* **NOT** restore a mandatory singular `createdFromIntentId`;
* **NOT** require physical scalar columns merely because the original interface used them.

If a downstream analysis-facing projection exposes a scalar — actual transaction time, fingerprint, or one selected provenance item — **the selection/adjudication rule MUST be separately and explicitly defined.** No implicit *latest-wins*, *first-wins* or *highest-confidence-wins* rule is authorized.

### HR-B-04 — `intendedTransactionAt` unresolved for intentless occasions — **OPEN**

`intendedTransactionAt` semantics and optionality for a canonical occasion with **zero** A2 intent links are **NOT resolved**. The original Rev 2 interface cannot simply require an A2-derived intended instant for an occasion that may legitimately have no A2 intent. Later resolutions may include: an optional field; an independently observed/reported intended instant; a separate typed observation; another explicitly ratified representation. **This document chooses none of them.**

Owner: **Joint B Architecture**. Deadline: **before B2 Effective Spec acceptance and before any canonical occasion persistence model is implemented.**

### HR-B-05 — `Outcome` ownership gate — **HUMAN-RATIFIED**

`Outcome` source role and ownership MUST be resolved in the **Joint B Architecture** before the B1 Effective Spec can be accepted. That work MUST determine: whether `Outcome` is an admissible B1 observation source; whether B1 owns or consumes it; which `Outcome` statuses may create candidate observations; `Outcome` participant/source identity; retry/idempotency semantics.

Before either B1 or B2 implementation begins it MUST also determine: `Outcome` ↔ Decision cardinality; `Outcome` ↔ Candidate cardinality; `Outcome` ↔ canonical occasion cardinality; correction/retraction behaviour; and how one-intent→many-occasion cases are represented.

The ambiguous §RT-09 phrase **"one `Outcome` per occasion/Decision"** MUST be clarified/amended so that **purchase-decision occasion** and **`PurchaseOccasion`** cannot be confused.

### HR-B-06 — Joint B Architecture first — **HUMAN-RATIFIED**

Any process requiring B1 to be fully specified independently before B2 architecture is known is **superseded**. Ratified process:

```
1. produce one joint  M3.5B-B ARCHITECTURE CONTRACT — B1+B2
2. independently audit and accept that contract
3. derive separate B1 and B2 Effective Specifications
4. cross-audit those specifications against the joint contract
5. only then authorize implementation
```

The joint contract MUST settle, at minimum: admissible observation-source taxonomy; source authority; provenance representation; event-time / knowledge-time contracts; participant semantics; real-world merchant semantics; candidate identity; candidate → canonical occasion handoff; reconciliation inputs; canonical source linkage; adjudication/correction; `Outcome` ownership and attachment; what B1 must preserve for B2; the B2 establishment predicate.

**B1 implementation MUST NOT begin merely because its local Effective Spec is complete, while the cross-contract with B2 remains unresolved.**

### HR-B-07 — OPEN-6 remains analytically open — **HUMAN-RATIFIED** (removal) / **INHERITED** (invariant)

Any statement equivalent to *"conservative resolution ratified now"* for failed→retry→resumed individuation is **removed**. Ratified: B2 owns real-world distinctness reconciliation; the `AnalysisProtocol` owns any scientifically meaningful window/independence parameter; the inherited anti-inflation invariant remains binding — *ambiguity MUST NOT inflate the primary numerator* (Rev 2 §6.A). **This ratification does not choose whether a particular failed/retry/resumed sequence is one or multiple occasions.**

### HR-B-08 — R-B-06 source-authority clarification — **HUMAN-RATIFIED**

Two questions are separated, and conflating them was the defect:

* **Identity:** no source-system identifier — intent id, report id, `Outcome` id, payment-observation id, or any other — is itself canonical occasion identity.
* **Establishment:** one sufficiently authoritative admissible observation **MAY** be enough for B2 to establish that a real-world attempted/realized purchase occurred, **if the future ratified source taxonomy explicitly allows it.**

Multiple supporting sources are permitted but are **not universally required**. No reading in which B2 always requires corroboration from two or more sources is authorized.

### HR-B-09 — No blanket import of the diagnostic prohibitions — **HUMAN-RATIFIED**

`PAGAMENOS_M3_5B_B1_EFFECTIVE_SPEC_V1` remains **non-authoritative**. Its §23 list MUST NOT be imported wholesale. §8 below is the clause-level prohibition register; every prohibition is classified, and only **INHERITED**, **HUMAN-RATIFIED** and **STRICT CONSEQUENCE** entries are normative.

### HR-B-10 — Hosted PostgreSQL rationale — **HUMAN-RATIFIED**

R-B-16 is retained. The V1 reasoning *"strictly more conservative, and therefore never a contradiction"* is **removed** — conservatism does not entail consistency, and the argument form was invalid. Replaced with:

> Independent inspection found no conflict with accepted study or engineering invariants. Pulling the PostgreSQL gate forward is **explicitly human-ratified as an engineering-assurance tightening**, because B1/B2 persistence will rely materially on live PostgreSQL constraints and triggers whose behaviour cannot be established by migration-text inspection alone.

---

## 5. Numerator / denominator firewall — **HUMAN-RATIFIED**

> **Design rule: data-model capability is not analysis eligibility.**

**B1/B2 MAY** preserve facts needed for future analysis.

**B1/B2 MUST NOT decide:** final RIVSR numerator eligibility; final denominator eligibility; scientific independence; treatment of UNKNOWN independence; sensitivity/bounds logic; economic opportunity thresholds; final analysis windows.

**B2 MAY determine:** whether one or multiple real-world occasions occurred; which observations support the same canonical occasion; whether a candidate is sufficiently established as a real-world attempt under the future ratified B source taxonomy. **These are reconciliation facts, not C2 eligibility judgements.**

*Inherited support:* A2 V4 §2/§44 already exclude RIVSR, denominator bounds and `thresholdStatus` from pre-C phases; A1 §2 keeps all analysis semantics inside the protocol's `definitionJson` and prohibits semantic scalar columns; Rev 2 §6.C–F assign eligibility, missingness, withdrawal and partial-week treatment to the analysis protocol.

---

## 6. Provenance states — **HUMAN-RATIFIED** (structural requirement)

B architecture MUST be capable of distinguishing, **without collapsing them**:

1. `A2_ENTRY_SOURCE_PRESENT` — an A2-linked capture exists and carries a trusted token-frozen `entrySource`;
2. `NON_A2_PROVENANCE_PRESENT` — provenance exists from an admissible non-A2 source;
3. `AFFIRMATIVE_NON_INDEPENDENCE_EVIDENCE` — positive evidence bearing against independence;
4. `PROVENANCE_UNKNOWN` — no provenance established either way.

These labels need not become literal enum values; the requirement is **semantic** — future C2 must be able to tell the states apart. **B1/B2 MUST NOT convert `PROVENANCE_UNKNOWN` into `FALSE`** (or into any negative determination).

*Inherited support:* Rev 2 §6.D — a missing report "stays **MISSING** (never read as zero)". Requirement (4) is the same principle applied to provenance. Classification of these states into eligibility remains C2's (§5).

---

## 7. Consequences carried as binding obligations

### 7.1 Two clauses amend a to-be-frozen contract — **STRICT CONSEQUENCE**

R-B-05 (supersedes required `createdFromIntentId`) and R-B-13 (relocates late-arriving facts to satellites) amend the field structure of Rev 2 §6.A. This is permissible because the contract is *slated* for the `AnalysisProtocol v1` freeze and **v1 is UNFROZEN** (A1 §3; A2 V4 §38); because §6.B itself anticipates versioned change; and because R-B-05 removes the §6.A-vs-§6.C contradiction rather than creating one.

**Obligations:** Rev 2 §6.A and §8 MUST be annotated as amended by this ratification, with the amendment carried into `AnalysisProtocol v1` when frozen. The analysis-facing interface obligation is **HR-B-03** (logical semantics), not V1's superseded shape requirement.

### 7.2 Occasion establishment precedes evidence verification — **STRICT CONSEQUENCE**

All three RT-10 `VerifiedValue` variants — including `NO_VERIFIABLE_SAVING` — require `purchaseOccasionId`. Under R-B-03 that id exists only once B2 has established the occasion. The Joint B Architecture and the C-phase specification MUST state the ordering: **B2 establishment precedes or accompanies C1 verification.** This independently confirms R-B-03's no-evidence-gate constraint; it is not an additional restriction on eligibility.

### 7.3 Provenance completeness varies by occasion — **STRICT CONSEQUENCE**

Because an occasion may have zero A2 intent links (R-B-05), the A2 token-frozen `entrySource` is not universally available. The consequence is **structural only**: B1/B2 MUST preserve whatever typed provenance exists and MUST represent the four states of §6. **No eligibility conclusion follows** (HR-B-01, §5).

---

## 8. Prohibition register (clause-level)

Replaces any wholesale import from the diagnostic document (HR-B-09). **Normative** = INHERITED, HUMAN-RATIFIED, or STRICT CONSEQUENCE.

| # | Prohibition | Classification | Normative |
| :-- | :-- | :-- | :-- |
| **P-01** | Treating a finalized `PurchaseIntent` — or any app-side fact of R-B-01 — as a `PurchaseOccasion` | **HUMAN-RATIFIED** (R-B-01); definition INHERITED (Rev 2 §6.A) | **yes** |
| **P-02** | `UNIQUE(originIntentId)` or equivalent finalization/context uniqueness as canonical occasion identity | **HUMAN-RATIFIED** (R-B-04) | **yes** |
| **P-03** | A natural/deterministic occasion key; `occasionKey` was deleted from the contract | **INHERITED** (Rev 2 §8) | **yes** |
| **P-04** | Inferring occasion merge, split, or lineage from the A2 invalidation/replacement lineage | **INHERITED** (A2 V4 §23/§44; A2 V1 §254), restated in R-B-09 | **yes** |
| **P-05** | Deleting, mutating or marking an occasion ineffective because its origin intent was invalidated or the participant withdrew | **INHERITED** (RT-13; Rev 2 §6.E; append-only discipline), restated in R-B-09 | **yes** |
| **P-06** | Storing derived effectiveness, eligibility, exposure, contamination, count, denominator or threshold values in B | **INHERITED** (A2 V4 §2/§44; A1 §2), reinforced by §5 | **yes** |
| **P-07** | Applying the "meaningful opportunity" economic threshold anywhere in **B** (scope widened from B1 by the §5 firewall) | **STRICT CONSEQUENCE** of §5; threshold's analysis ownership INHERITED (Phase 0A §13, H-P0-01) | **yes** |
| **P-08** | Using JavaScript `Date` as the canonical representation of a stored `TIMESTAMPTZ(6)` instant where truncation is possible | **HUMAN-RATIFIED** (R-B-12) | **yes** |
| **P-09** | Storing an immutable digest that only application code verifies | **HUMAN-RATIFIED** (R-B-14) | **yes** |
| **P-10** | Assuming an attacker cannot issue direct SQL when reasoning about database integrity | **HUMAN-RATIFIED** (R-B-15) | **yes** |
| **P-11** | Manufacturing synthetic `PurchaseIntent`s for purchases that occurred outside app usage | **HUMAN-RATIFIED** (R-B-05) | **yes** |
| **P-12** | Using scientific independence as the predicate for occasion individuation | **HUMAN-RATIFIED** (HR-B-02) | **yes** |
| **P-13** | Converting `PROVENANCE_UNKNOWN` into a negative determination | **HUMAN-RATIFIED** (§6); principle INHERITED (Rev 2 §6.D) | **yes** |
| **P-14** | Implicit *latest-wins* / *first-wins* / *highest-confidence-wins* selection in any analysis-facing scalar projection | **HUMAN-RATIFIED** (HR-B-03) | **yes** |
| **P-15** | Requiring corroboration from two or more sources as a universal establishment rule | **HUMAN-RATIFIED** (HR-B-08) | **yes** |
| **P-16** | Beginning B1 implementation while the B1↔B2 cross-contract is unresolved | **HUMAN-RATIFIED** (HR-B-06) | **yes** |
| **P-17** | Treating the rejected commit `a586b31` as authority, or reconciling any specification toward it to minimize a diff | **STRICT CONSEQUENCE** of the accepted gate process (nothing becomes authority without an independent gate) | **yes** |
| **P-18** | Reading Rev 2 §8's replacement column as the complete `PurchaseOccasion` field list | **DIAGNOSTIC** — largely moot: §6.A's physical shape is superseded by R-B-05/HR-B-03. The participant requirement survives independently as R-B-08 (P-19). | no |
| **P-19** | Omitting a canonical participant relation, or exposing no named/tested `participantId` projection | **HUMAN-RATIFIED** (R-B-08) | **yes** |

---

## 9. Open register — owner and deadline for every item

| # | Open question | Owner | Deadline |
| :-- | :-- | :-- | :-- |
| **O-01** | Admissible observation-source taxonomy | Joint B Architecture | before **B1 Effective Spec acceptance** |
| **O-02** | `Outcome` source role and ownership (admissible source? owned or consumed? which statuses create candidates? participant/source identity; retry/idempotency) | Joint B Architecture | before **B1 Effective Spec acceptance** |
| **O-03** | `Outcome` canonical attachment and cardinality (↔ Decision, ↔ Candidate, ↔ occasion; correction/retraction; one-intent→many representation); clarification of the RT-09 "one `Outcome` per occasion/Decision" phrase | Joint B Architecture | before **either B implementation** |
| **O-04** | `intendedTransactionAt` semantics/optionality for intentless occasions | Joint B Architecture / B2 Effective Spec | before **B2 spec acceptance and occasion persistence implementation** |
| **O-05** | Exact B1 candidate schema | B1 Effective Spec | before **B1 implementation** |
| **O-06** | Exact reconciliation / adjudication / merge-supersession representation | Joint B Architecture + B2 Effective Spec | before **B2 implementation**; any B1 dependency frozen before **B1 implementation** |
| **O-07** | Failed / retry / resumed real-world distinctness | B2; `AnalysisProtocol` where analytical windowing is required | before **any metric depends on the classification** |
| **O-08** | Scientific independence definition | C2 / `AnalysisProtocol` | before **C2 implementation / protocol freeze** |
| **O-09** | Treatment of UNKNOWN independence | C2 / `AnalysisProtocol` | before **RIVSR computation** |
| **O-10** | Recoverable receiptless-winner protocol | B1/B2 implementation spec, **if such recovery is desired** | **default: none; fail closed** |
| **O-11** | Analysis-facing scalar selection/adjudication rules, where such scalars are exposed | Joint B Architecture (contract) + the exposing spec | before **the projection is implemented** |
| **O-12** | Annotation of Rev 2 §6.A/§8 as amended, and carriage into `AnalysisProtocol v1` | Authority repair (R-B-17) + `AnalysisProtocol v1` owner | before **`AnalysisProtocol v1` freeze** |
| **O-13** | B2 → C1 establishment/verification ordering statement | Joint B Architecture + C-phase spec | before **C1 specification acceptance** |

Every item above carries an explicit owner and deadline. No broader coverage claim is made.

### Mapping from the diagnostic register (OPEN-1 … OPEN-11)

| Diagnostic # | Status under V1.1 | Where |
| :-- | :-- | :-- |
| OPEN-1 | **RESOLVED (rule)** / **DEFERRED (taxonomy)** | R-B-03 → O-01 |
| OPEN-1b | **RESOLVED** — occasions may exist with no intent | R-B-05; spawns **O-04** |
| OPEN-2 | **RESOLVED** | R-B-02 + §10 spine |
| OPEN-3 | **RESOLVED** — two-stage adopted | R-B-02 |
| OPEN-4 | **RESOLVED** — permitted where **real-world distinctness** is established | R-B-04 as amended by HR-B-02 |
| OPEN-5 | **RESOLVED (structure)** / **DEFERRED (representation)** | R-B-06 + R-B-10 + HR-B-08 → O-06 |
| OPEN-6 | **DEFERRED — no B-level resolution claimed** | HR-B-07 → O-07 |
| OPEN-7 | **RESOLVED** — real-world merchant | R-B-07 |
| OPEN-8 | **RESOLVED (principle)** / **DEFERRED (representation)** | R-B-10 → O-06 |
| OPEN-9 | **RESOLVED** — append-only preserved, satellites | R-B-13; projection obligation now HR-B-03 → O-11 |
| OPEN-10 | **RESOLVED** — gate pulled forward | R-B-16 + HR-B-10 |
| OPEN-11 | **RESOLVED (mandated) — NOT EXECUTED** | R-B-17 → §11 |

---

## 10. Ratified B phase spine and binding terminology

```
A1  Protocol / Cohort                                   ACCEPTED
A2  Intent / Decision                                   ACCEPTED
B1  Purchase Observation / Occasion Candidate Identity   ratified — not yet specified
B2  Purchase Occasion & Exposure Reconciliation          ratified — not yet specified
C1  Evidence / Attribution                               not authorized
C2  Analysis                                             not authorized
```

The legacy label **`B1 Opportunity Identity` is superseded** — it wrongly implied that B1 creates canonical `PurchaseOccasion` identity.

| Unit | Owner | Never confuse with |
| :-- | :-- | :-- |
| **capture** — one A2 `PurchaseIntent` root | A2 | anything below |
| **purchase-decision occasion** — RT-09's unit, one per finalized intent | A2 (implemented) | `PurchaseOccasion` |
| **purchase observation / occasion candidate** | **B1** | `PurchaseOccasion`; never counted |
| **`PurchaseOccasion`** — one real-world attempted/realized purchase | **B2** | candidate; decision occasion |
| **real-world distinctness** — one purchase or several | **B2** | scientific independence |
| **scientific independence** — study eligibility | **C2 / `AnalysisProtocol`** | real-world distinctness |
| **opportunity** — a real occasion meeting the economic threshold | C2 / `AnalysisProtocol` | `PurchaseOccasion` |

---

## 11. Authority status and prohibited next actions

V1.1 is a **candidate ratification** until independently audited and accepted. Until then, do **NOT**:

* commit it as final authority;
* execute **R-B-17** (authority repair);
* draft implementation code;
* draft isolated B1 implementation semantics;
* open B2 implementation.

On acceptance, the next artifact is the **`M3.5B-B ARCHITECTURE CONTRACT — B1+B2`** (HR-B-06 step 1), not an effective specification and not code.

---

## 12. Final internal consistency check

| Check | Result |
| :-- | :-- |
| No intentless-occasion numerator exclusion anywhere | **PASS** — V1 §5.3 deleted; replaced by HR-B-01; eligibility assigned to C2 in §5; §7.3 states the structural consequence only |
| No scientific-independence / real-world-distinctness conflation | **PASS** — HR-B-02 firewall; R-B-04 and R-B-11 re-worded; P-12; §10 terminology table |
| No mandatory singular `createdFromIntentId` | **PASS** — R-B-05 retained; HR-B-03 forbids its restoration; no clause reintroduces it |
| No literal restoration of the superseded §6.A physical shape | **PASS** — V1's "reproduce the shape" requirement superseded by HR-B-03; scalar projections require explicit selection rules (P-14, O-11) |
| `Outcome` ownership is gated | **PASS** — HR-B-05; O-02 gates B1 Effective Spec acceptance; O-03 gates both implementations |
| `intendedTransactionAt` gap is explicit | **PASS** — HR-B-04; O-04 with owner and deadline; no resolution chosen |
| Joint B Architecture precedes B1/B2 specs | **PASS** — HR-B-06 five-step process; P-16; §11 next artifact |
| No blanket import from the diagnostic B1 V1 | **PASS** — HR-B-09; §8 clause-level register; P-18 classified diagnostic and non-normative |
| R-B-16 rationale corrected | **PASS** — HR-B-10; the "more conservative ⇒ cannot contradict" argument removed |
| No `NEW UNRATIFIED` normative clause | **PASS** — every normative clause in §§3–8 carries INHERITED, HUMAN-RATIFIED or STRICT CONSEQUENCE |
| Every open item has owner + deadline | **PASS** — §9, O-01 … O-13 |

---

# Final Verdict

## M3.5B-B SEMANTIC RATIFICATION V1.1 READY FOR INDEPENDENT ACCEPTANCE AUDIT

```
CANDIDATE RATIFICATION — NOT YET AUTHORITY.
NO IMPLEMENTATION AUTHORIZATION.
R-B-17 AUTHORITY REPAIR NOT EXECUTED.
JOINT B ARCHITECTURE CONTRACT NOT YET WRITTEN.
B1 / B2 EFFECTIVE SPECIFICATIONS NOT YET WRITTEN.
C1 / C2 NOT AUTHORIZED.
PRODUCTION PROTOCOL v1 UNFROZEN.
WAVE 0 NOT AUTHORIZED.
```

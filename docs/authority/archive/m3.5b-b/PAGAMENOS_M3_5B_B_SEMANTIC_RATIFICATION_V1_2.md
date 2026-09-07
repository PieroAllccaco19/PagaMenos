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
> `sha256:78a05190762bdc03129840c7d2d0b5b981d1d3b4ff72a0d4dc1868ec27386677`
>
> Verify with: `tail -n +23 <this file> | sha256sum`
>
> **Root authority register:** `PAGAMENOS_SPEC_AUTHORITY.md` · **Repair record:** `PAGAMENOS_R_B_17_AUTHORITY_REPAIR_REPORT.md`

<!-- R-B-17 ARCHIVAL HEADER - END -->

# PAGAMENOS — M3.5B-B SEMANTIC RATIFICATION — V1.2

**Nature:** **HUMAN-AUTHORITY PATCH — CANDIDATE.** Every normative clause is classified **INHERITED**, **HUMAN-RATIFIED**, or **STRICT CONSEQUENCE**. No clause is new unratified authority, and no universal governance doctrine is asserted.
**Status:** SEMANTIC RATIFICATION ONLY. No implementation, no code, no migrations, no B1/B2 implementation, **no authority repair (R-B-17 NOT executed)**, no Joint B Architecture drafting, no `AnalysisProtocol v1` freeze, no Wave 0.
**Authority status:** **CANDIDATE — NOT FINAL AUTHORITY.** V1.2 becomes authority only on independent acceptance.
**Supersedes:** `PAGAMENOS_M3_5B_B_SEMANTIC_RATIFICATION_V1_1` in full. V1 and V1.1 are historical.
**Non-authoritative input:** `PAGAMENOS_M3_5B_B1_EFFECTIVE_SPEC_V1` is a **diagnostic document only**.

**Scope of this patch.** Bounded. R-B-01 … R-B-17, HR-B-01 … HR-B-10, the two-stage B architecture, Model B, the B1/B2 spine and the numerator/denominator firewall are **not reopened** — only narrowed or clarified where §2 states. This patch does not change Model B, does not change B1/B2 ownership, does not restore `createdFromIntentId`, does not decide scientific independence, does not decide final numerator/denominator rules, does not design the Joint B Architecture, does not execute authority repair, and implements nothing.

---

## 1. Contradiction gate — result

> **RESULT: NO NEW CONTRADICTION.** V1.2 **removes one real contradiction** that V1 and V1.1 both carried undetected.

**Corrected defect (material).** V1/V1.1 **P-05** stated an absolute prohibition on deleting a `PurchaseOccasion` and classified it **INHERITED**, citing Rev 2 §6.E. That citation was wrong in direction: §6.E ends **"Legal/consent deletion overrides analysis retention."** The frozen text subordinates analysis retention to legal/consent deletion; V1/V1.1 asserted the reverse. The prior contradiction gates reported "no contradiction" and did not detect this. **RAT-V11-02** repairs it (§4.2, P-05).

Three further corrections remove unsupported generalizations rather than contradictions: **P-03** (a universal ban on deterministic keys labelled INHERITED from a single deleted field), **P-06** (a prohibition that contradicted B2's own ratified charter to own exposure reconciliation), **P-17** (a universal PagaMenos governance doctrine inferred from a B-scoped process).

**Newly surfaced obligation (not a contradiction).** Rev 2 §6.E's controlling legal/consent deletion, combined with the accepted append-only discipline — whose triggers `RAISE` on `DELETE` unconditionally (A1 §21; A2 V4 §28) — means a B row subject to a legal deletion obligation cannot be deleted by the database as currently patterned. This is resolvable by design (the corpus already contemplates authorized deletion — FINAL §22 verify-then-purge), so it does not block. It is recorded as **O-17** at the architecture gate.

---

## 2. V1.1 finding closure — RAT-V11-01 … RAT-V11-07

*The audit's finding texts were not supplied; findings 01–04 are given in the patch body, and 05–07 are reconstructed from patch sections §5–§8. The mapping MUST be checked against the audit's register during acceptance.*

| Finding | Defect in V1.1 | Correction in V1.2 |
| :-- | :-- | :-- |
| **RAT-V11-01** | P-03 prohibited *every* natural/deterministic occasion key and labelled it INHERITED, generalizing from one deleted field | §4.1 · **P-03 narrowed** to the legacy `occasionKey` only; a default (no new deterministic canonical key authorized) plus **O-16** at the architecture gate |
| **RAT-V11-02** | P-05's absolute deletion prohibition contradicted Rev 2 §6.E's controlling legal/consent deletion override | §4.2 · **P-05 narrowed** to *selective deletion to alter scientific results*; legal/consent deletion explicitly controlling; **O-17** records the deletion-path obligation |
| **RAT-V11-03** | P-06 forbade B from persisting exposure/contamination values, contradicting R-B-02 (B2 owns exposure reconciliation) | §4.3 · **P-06 replaced** by a facts-vs-final-classification firewall; diagnostic caches conditioned and explicitly non-authoritative |
| **RAT-V11-04** | P-17 asserted "nothing anywhere becomes authority without an independent gate" as universal doctrine, classified STRICT CONSEQUENCE | §4.4 · **P-17 narrowed** and split: rejected-commit status = established process state; B-scoped review requirement = HUMAN-RATIFIED via R-B-17 |
| **RAT-V11-05** | Deadlines were set at implementation rather than at the acceptance of the first artifact whose contract depends on the decision | §7 principle + §9 register + §10 proof; **JA-01 … JA-07** close at Joint B Architecture acceptance |
| **RAT-V11-06** | O-07 combined B2 and C2 ownership, risking C2 defining B2 occasion identity | §8 · O-07 **deleted and split** into **O-B-DISTINCTNESS** (B) and **O-C-INDEPENDENCE** (C2), with an explicit non-interference constraint each way |
| **RAT-V11-07** | The ambiguous RT-09 phrase was noted but not gated | §8.3 · clarification is a **hard condition of Joint B Architecture acceptance** |

---

## 3. Ratified architectural clauses R-B-01 … R-B-17

Carried from V1.1 **unchanged in substance**. Summarized here; the full clause text and provenance table of V1.1 §3 remains in force, with these wording amendments only:

* **R-B-04 / R-B-11** — "where independence is established" reads **"where real-world distinctness is established"** (HR-B-02).
* **R-B-06** — identity and establishment are separate: no source identifier is canonical identity, but one sufficiently authoritative admissible observation MAY suffice to establish occurrence if the ratified taxonomy allows (HR-B-08).
* **R-B-09** — the prohibition list is subject to §4.2's legal/consent deletion carve-out.
* **R-B-13** — the analysis-facing obligation is HR-B-03 (logical semantics), not a physical shape.
* **R-B-16** — rationale is HR-B-10's engineering-assurance ratification.

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

HR-B-01 … HR-B-10 are carried unchanged from V1.1 §4 and are not restated in full here; HR-B-02 (distinctness/independence firewall), HR-B-03 (logical interface), HR-B-05 (`Outcome` gate) and HR-B-06 (Joint B Architecture first) are extended by §§4.5, 8 and 9 below.

---

## 4. Narrowing corrections

### 4.1 RAT-V11-01 — P-03 narrowed — **HUMAN-RATIFIED**

**Ratified rule.** The legacy `occasionKey` field removed by Rev 2 §8 MUST NOT be treated as a surviving inherited `PurchaseOccasion` contract field, nor silently restored under its former semantics.

Already-ratified restrictions are preserved and are **not** merged into a universal ban:

* no source-system identifier is canonical occasion identity (R-B-06);
* no timestamp is canonical occasion identity (R-B-12);
* the deleted legacy `occasionKey` may not be resurrected by implication (this clause);
* `UNIQUE(originIntentId)` and equivalents remain forbidden (R-B-04);
* the rejected digest design remains unauthorized (R-B-14).

**This ratification does NOT universally prohibit every conceivable future deterministic identity construction.** Whether canonical occasion identity must remain opaque/surrogate, or may ever use another deterministic construction, is **O-16** — owner **Joint B Architecture**, deadline **before Joint B Architecture acceptance**. **Default until then: no new deterministic canonical key is authorized.**

The universal prohibition MUST NOT be labelled INHERITED.

### 4.2 RAT-V11-02 — legal / consent deletion override — **INHERITED** (override) / **HUMAN-RATIFIED** (narrowing)

**Ratified rule.** A2 invalidation, participant withdrawal as an analytical event, intent replacement, candidate correction, or later analysis classification MUST NOT selectively delete, mutate, or mark a real `PurchaseOccasion` ineffective **merely to alter scientific results**.

**However** — legally required, consent-required, privacy-required, or other explicitly authorized deletion obligations remain **controlling**, per Rev 2 §6.E and applicable authority. Scientific append-only history preservation and mandatory legal deletion are **different concerns**, and this ratification does **not** claim immutable scientific retention overrides a controlling legal/consent deletion obligation.

Where deletion is legally required: execute the authoritative deletion/privacy process; preserve only whatever audit metadata is legally permitted; and let analysis handle the resulting missingness conservatively per the future `AnalysisProtocol`. The exact deletion implementation is **not invented here**.

*Inherited authority, verbatim:* Rev 2 §6.E — "Reporting preserves pre-withdrawal pseudonymized facts only where consent/protocol legally permits … provide a sensitivity treating withdrawals conservatively rather than selectively deleting poor outcomes. **Legal/consent deletion overrides analysis retention.**" The two halves of that clause are exactly the two halves of this rule.

**STRICT CONSEQUENCE (recorded as O-17).** The accepted append-only pattern blocks `DELETE` unconditionally at the database level. A B persistence model that cannot execute a controlling legal deletion obligation would violate Rev 2 §6.E. The Joint B Architecture MUST therefore define how an authorized deletion/redaction obligation is satisfied against append-only B tables, and what audit residue is legally permitted. Not designed here.

### 4.3 RAT-V11-03 — P-06 replaced — **HUMAN-RATIFIED**

**B MAY persist:** raw exposure facts; provenance facts; reconciliation facts; observation facts; append-only adjudication facts; factual contamination-relevant observations; non-authoritative diagnostic/cache values explicitly permitted by higher authority.

**B MUST NOT persist as authoritative B semantics:** final scientific-independence classification; final contamination eligibility; final RIVSR numerator eligibility; final participant denominator eligibility; final opportunity-threshold classification; final C2 analytical status; any cached value presented as the authoritative C2 result.

**If a diagnostic cache is allowed** it MUST be explicitly non-authoritative; the underlying facts remain authoritative; it MUST be reproducible from — or checked against — its authority; and it MUST NOT silently become the scientific analysis result.

This clarification is **compatible with B2 owning exposure reconciliation** (R-B-02): B2 reconciles and persists exposure *facts*; it does not conclude contamination *eligibility*.

### 4.4 RAT-V11-04 — P-17 narrowed and split

**(a) Rejected-implementation status — ESTABLISHED PROCESS STATE.** Commit `a586b3119da2cc1aa4668485b129dbe625ab5cae` is **evidence only** and MUST NOT be treated as B semantic authority. (It failed independent audit and no artifact ever ratified it.)

**(b) B-scoped review requirement — HUMAN-RATIFIED via R-B-17.** B architecture and effective specifications require the independently reviewed authority process ratified for B before implementation.

**No universal doctrine is asserted.** The claim "nothing anywhere becomes authority without an independent gate" is **not** ratified here and MUST NOT be relied on as PagaMenos-wide governance unless separately ratified.

### 4.5 Carried firewalls (unchanged, restated for self-containment)

**Numerator/denominator firewall (HUMAN-RATIFIED).** *Data-model capability is not analysis eligibility.* B MAY preserve facts for future analysis. B MUST NOT decide final numerator eligibility, final denominator eligibility, scientific independence, treatment of UNKNOWN independence, sensitivity/bounds logic, economic opportunity thresholds, or final analysis windows. B2 MAY determine whether one or multiple real-world occasions occurred, which observations support the same canonical occasion, and whether a candidate is sufficiently established under the ratified taxonomy — reconciliation facts, not C2 eligibility judgements.

**Provenance states (HUMAN-RATIFIED).** B MUST distinguish, without collapsing: `A2_ENTRY_SOURCE_PRESENT`; `NON_A2_PROVENANCE_PRESENT`; `AFFIRMATIVE_NON_INDEPENDENCE_EVIDENCE`; `PROVENANCE_UNKNOWN`. Labels need not be literal enum values; the requirement is semantic. **`PROVENANCE_UNKNOWN` MUST NOT be converted into a negative determination** (INHERITED principle: Rev 2 §6.D — a missing report "stays MISSING (never read as zero)").

**Distinctness / independence firewall (HR-B-02).** Real-world distinctness (one purchase or several) is **B2**'s. Scientific independence (study eligibility) is **C2 / `AnalysisProtocol`**'s. B MUST NOT use scientific independence as the individuation predicate; C2 MUST NOT change B2's canonical occasion count.

---

## 5. Joint B Architecture — gating decisions JA-01 … JA-07

Per HR-B-06, the Joint B Architecture Contract settles the shared semantics. The following MUST be **closed before Joint B Architecture acceptance** — not merely before a later effective spec or implementation. Physical/DDL design may remain to the effective specs where noted.

| # | Decision that must close at the architecture gate | Register row |
| :-- | :-- | :-- |
| **JA-01** | Admissible observation-source taxonomy: source classes; authority levels; whether one source may establish occurrence; candidate-generating source semantics | O-01 |
| **JA-02** | `Outcome` source role/ownership: admissible?; B1 owns or consumes?; statuses relevant to candidate generation; participant/source authority; retry/idempotency meaning | O-02 |
| **JA-03** | `Outcome` attachment/cardinality semantics: ↔ Decision; ↔ Candidate; ↔ canonical occasion; one-to-many / many-to-one; correction/retraction; **RT-09 terminology clarification** (§8.3). *Physical FK/table design → effective specs* | O-03 |
| **JA-04** | `intendedTransactionAt` semantic contract: required for canonical occasions?; optional?; obtainable by an intentless occasion from another admissible source?; or an observation rather than a canonical scalar. *Physical representation → B2 Effective Spec* | O-04 |
| **JA-05** | B2 establishment → C1 verification **semantic ordering**. C1 may restate it later but may not be the first artifact to define it | O-13 |
| **JA-06** | Provenance / source-link architecture: zero/one/many linkage semantics; what provenance B1 must preserve; what B2 consumes; architecture-level correction/adjudication model. *Exact DDL → effective specs* | O-06a, O-06b, O-14 |
| **JA-07** | Event-time / knowledge-time semantics at architecture level. *Exact fields/storage types → spec level where appropriate* | O-15 |

---

## 6. Prohibition register (reissued)

Every row is normative and classified as exactly one of **INHERITED**, **HUMAN-RATIFIED**, **STRICT CONSEQUENCE**. No diagnostic entry is normative; no universal governance doctrine appears.

| # | Prohibition | Classification |
| :-- | :-- | :-- |
| **P-01** | Treating a finalized `PurchaseIntent` — or any app-side fact of R-B-01 — as a `PurchaseOccasion` | HUMAN-RATIFIED (R-B-01) |
| **P-02** | `UNIQUE(originIntentId)` or equivalent finalization/context uniqueness as canonical occasion identity | HUMAN-RATIFIED (R-B-04) |
| **P-03** | *(narrowed)* Treating the legacy `occasionKey` deleted by Rev 2 §8 as a surviving inherited contract field, or silently restoring it under its former semantics | INHERITED (Rev 2 §8 deletion) |
| **P-03a** | Introducing a **new** deterministic canonical occasion key before **O-16** is resolved | HUMAN-RATIFIED (§4.1 default) |
| **P-04** | Inferring occasion merge, split, or lineage from the A2 invalidation/replacement lineage | INHERITED (A2 V4 §23/§44; A2 V1 §254) |
| **P-05** | *(narrowed)* Selectively deleting, mutating, or marking an occasion ineffective **in order to alter scientific results** — including on the basis of A2 invalidation, withdrawal-as-analytical-event, intent replacement, candidate correction, or later analysis classification | INHERITED (Rev 2 §6.E first half: "rather than selectively deleting poor outcomes"; RT-13) |
| **P-05a** | Claiming that immutable scientific retention overrides a controlling legal/consent/privacy deletion obligation | INHERITED (Rev 2 §6.E: "Legal/consent deletion overrides analysis retention") |
| **P-06** | *(replaced)* Persisting **as authoritative B semantics** any final scientific-independence classification, final contamination eligibility, final numerator or denominator eligibility, final opportunity-threshold classification, or final C2 analytical status — including a cached value presented as the authoritative C2 result | HUMAN-RATIFIED (§4.3); analysis ownership INHERITED (A2 V4 §2/§44; A1 §2; Rev 2 §6.C–F) |
| **P-06a** | Allowing a permitted diagnostic cache to be non-reproducible from its authority, or to silently become the scientific analysis result | HUMAN-RATIFIED (§4.3) |
| **P-07** | Applying the "meaningful opportunity" economic threshold as an authoritative B conclusion | STRICT CONSEQUENCE of §4.5 firewall; threshold's analysis ownership INHERITED (Phase 0A §13, H-P0-01) |
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
| **P-17** | *(narrowed)* Treating the rejected commit `a586b31` as B semantic authority | ESTABLISHED PROCESS STATE — recorded as INHERITED fact (the commit failed independent audit; no artifact ratified it) |
| **P-17a** | Beginning B architecture or effective-spec implementation without the B-scoped independently reviewed authority process | HUMAN-RATIFIED (R-B-17) |
| **P-18** | Omitting a canonical participant relation, or exposing no named/tested `participantId` projection | HUMAN-RATIFIED (R-B-08) |
| **P-19** | Restoring a mandatory singular `createdFromIntentId`, or requiring physical scalar columns merely because the superseded interface used them | HUMAN-RATIFIED (R-B-05, HR-B-03) |

**Not carried forward as normative.** V1.1's P-18 ("reading Rev 2 §8's replacement column as the complete field list") was classified DIAGNOSTIC and is **removed from the register**; the participant requirement it protected survives independently as P-18 above (R-B-08). V1.1's universal governance doctrine in P-17 is **removed** (§4.4).

---

## 7. Deadline principle — **HUMAN-RATIFIED**

> **A semantic decision MUST be closed before acceptance of the first artifact whose contract depends on it — not merely before implementation.**

Artifact sequence used throughout:

```
JBA   M3.5B-B ARCHITECTURE CONTRACT — B1+B2      (first artifact of the B chain)
B1S   B1 Effective Specification
B2S   B2 Effective Specification
B1I   B1 implementation          B2I   B2 implementation
C1S   C1 Effective Specification
C2S   C2 Effective Specification / AnalysisProtocol v1 freeze
R17   R-B-17 authority repair    (independent track; completes before B implementation)
```

---

## 8. O-07 split — B distinctness vs C independence

### 8.1 `O-B-DISTINCTNESS` — **HUMAN-RATIFIED**

**Question.** Under the B reconciliation model, what factual/reconciliation evidence establishes whether a failed attempt, retry, resumed attempt, or similar sequence represents **one** real-world `PurchaseOccasion` or **multiple**?

**Owner.** **Joint B Architecture** for the governing factual semantics; then **B2 Effective Spec** for the implementation-grade algorithm/representation.
**Deadlines.** Semantic rule/model: **before JBA acceptance.** Implementable B2 rule: **before B2S acceptance.**

**Constraint.** C2 / `AnalysisProtocol` MUST NOT determine how many real-world occasions existed. Where evidence cannot establish distinctness, **B2 MUST preserve the ambiguity/reconciliation state** rather than inventing a scientifically motivated time window solely to force identity.

### 8.2 `O-C-INDEPENDENCE` — **HUMAN-RATIFIED**

**Question.** Given already-established canonical occasions, what scientific windowing, contamination, initiation, independence and UNKNOWN-treatment rules determine analysis eligibility?

**Owner.** **C2 / `AnalysisProtocol`.** **Deadline.** Before `AnalysisProtocol` freeze **and** before C2S acceptance.

**Constraint.** This question MUST NOT change B2's canonical occasion count. Inherited anti-inflation requirements (Rev 2 §6.A) are preserved **inside C2 analysis** and MUST NOT be re-expressed as B2 identity rules.

Its two named sub-questions are carried as separate register rows for traceability: **O-08** (scientific independence definition) and **O-09** (treatment of UNKNOWN independence).

### 8.3 RT-09 terminology — hard architecture-gate condition — **HUMAN-RATIFIED**

The Joint B Architecture MUST remove the ambiguity in **"one `Outcome` per occasion/Decision"** before acceptance, distinguishing at minimum the **purchase-decision occasion** (A2 / RT-09) from the canonical **`PurchaseOccasion`** (B2). Final replacement wording need not be chosen now, but **the architecture cannot be accepted while the phrase remains semantically ambiguous.**

---

## 9. Open register (reissued)

One semantic question per row; one primary owner; any later physical/spec owner separated explicitly; acceptance-time deadline. No combined B2/C2 decision.

| # | Semantic question | Primary owner · deadline | Later physical / spec owner · deadline |
| :-- | :-- | :-- | :-- |
| **O-01** | Admissible observation-source taxonomy (JA-01) | Joint B Architecture · before **JBA acceptance** | — |
| **O-02** | `Outcome` source role and ownership (JA-02) | Joint B Architecture · before **JBA acceptance** | — |
| **O-03** | `Outcome` attachment/cardinality semantics + RT-09 clarification (JA-03, §8.3) | Joint B Architecture · before **JBA acceptance** | exact physical representation → owning effective spec · before **that spec's acceptance** |
| **O-04** | `intendedTransactionAt` semantic contract for canonical occasions, incl. intentless (JA-04) | Joint B Architecture · before **JBA acceptance** | physical representation → B2S · before **B2S acceptance** |
| **O-05** | Exact B1 candidate schema | B1 Effective Spec · before **B1S acceptance** | — |
| **O-06a** | Reconciliation/adjudication — architecture-level model (JA-06) | Joint B Architecture · before **JBA acceptance** | — |
| **O-06b** | Reconciliation inputs/linkage B1 must preserve | B1 Effective Spec · before **B1S acceptance** | — |
| **O-06c** | Exact B2 reconciliation representation/algorithm | B2 Effective Spec · before **B2S acceptance** | — |
| **O-B-DISTINCTNESS** | Failed/retry/resumed → one or multiple real-world occasions (factual semantics) | Joint B Architecture · before **JBA acceptance** | implementable rule → B2S · before **B2S acceptance** |
| **O-C-INDEPENDENCE** | Windowing/contamination/initiation/UNKNOWN rules for analysis eligibility | C2 / `AnalysisProtocol` · before **protocol freeze and C2S acceptance** | — |
| **O-08** | Scientific independence definition | C2 / `AnalysisProtocol` · before **protocol freeze and C2S acceptance** | — |
| **O-09** | Treatment of UNKNOWN independence | C2 / `AnalysisProtocol` · before **protocol freeze and C2S acceptance** | — |
| **O-10** | Receiptless-winner recovery protocol | **Default: none; fail closed.** Becomes an open dependency only if the architecture/spec elects to support recovery | if elected → relevant effective spec · before **that spec's acceptance** |
| **O-11** | Scalar selection/adjudication rule for any analysis-facing scalar projection | Joint B Architecture · before **JBA acceptance**, where scalar projection is part of the shared B contract | spec-specific projection rule → owning spec · before **that spec's acceptance**. **No scalar projection may be implemented before its rule is accepted** |
| **O-12** | Annotation of Rev 2 §6.A/§8 as amended | R-B-17 authority repair · before **R-B-17 is considered complete** | carriage into `AnalysisProtocol` · before **protocol freeze** |
| **O-13** | B2 establishment → C1 verification semantic ordering (JA-05) | Joint B Architecture · before **JBA acceptance** | conformance/restatement → C1S · before **C1S acceptance** |
| **O-14** | Provenance / source-link architecture: zero/one/many linkage; what B1 preserves; what B2 consumes (JA-06) | Joint B Architecture · before **JBA acceptance** | exact DDL → owning effective spec · before **that spec's acceptance** |
| **O-15** | Event-time / knowledge-time semantics at architecture level (JA-07) | Joint B Architecture · before **JBA acceptance** | exact fields/storage types → owning spec · before **that spec's acceptance** |
| **O-16** | Whether canonical occasion identity must remain opaque/surrogate, or may use another deterministic construction (§4.1) | Joint B Architecture · before **JBA acceptance**. **Default until then: no new deterministic canonical key authorized** | — |
| **O-17** | How a controlling legal/consent/privacy deletion obligation is satisfied against append-only B tables, and what audit residue is legally permitted (§4.2) | Joint B Architecture · before **JBA acceptance** | exact deletion/redaction mechanism → owning effective spec · before **that spec's acceptance** |

### Mapping from the diagnostic register (OPEN-1 … OPEN-11)

OPEN-1 → O-01 · OPEN-1b → resolved by R-B-05, spawns O-04 · OPEN-2 → resolved (R-B-02) · OPEN-3 → resolved (R-B-02) · OPEN-4 → resolved (R-B-04, HR-B-02) · OPEN-5 → O-06a/b/c, O-14 · OPEN-6 → **split** into O-B-DISTINCTNESS and O-C-INDEPENDENCE · OPEN-7 → resolved (R-B-07) · OPEN-8 → O-06a/c · OPEN-9 → resolved (R-B-13); projection rule → O-11 · OPEN-10 → resolved (R-B-16, HR-B-10) · OPEN-11 → R-B-17, **not executed**; annotation → O-12.

---

## 10. Deadline-consistency proof

For each row: the first artifact whose contract consumes the decision, and whether the deadline is at or before that artifact's acceptance.

| # | First consuming artifact | Why it consumes the decision | Deadline | Result |
| :-- | :-- | :-- | :-- | :-- |
| O-01 | **JBA** | JBA must state the B2 establishment predicate | before JBA acceptance | **PASS** |
| O-02 | **JBA** | JBA must fix `Outcome` ownership and what B1 preserves | before JBA acceptance | **PASS** |
| O-03 | **JBA** | JBA must state candidate↔occasion↔Decision semantics unambiguously (§8.3) | before JBA acceptance | **PASS** |
| O-03 (physical) | owning effective spec | DDL first appears there | before that spec's acceptance | **PASS** |
| O-04 | **JBA** | JBA must state whether canonical occasions require an intended instant | before JBA acceptance | **PASS** |
| O-04 (physical) | **B2S** | occasion persistence model first appears there | before B2S acceptance | **PASS** |
| O-05 | **B1S** | the candidate schema is that document's own subject | before B1S acceptance | **PASS** |
| O-06a | **JBA** | shared adjudication model constrains both specs | before JBA acceptance | **PASS** |
| O-06b | **B1S** | B1 must know what to preserve for B2 | before B1S acceptance | **PASS** |
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

## 12. Authority status and prohibited next actions

V1.2 is a **candidate ratification** until independently accepted. Until then, do **NOT**: commit it as final authority; execute **R-B-17**; draft the Joint B Architecture; draft implementation code; draft isolated B1 implementation semantics; open B2 implementation.

On acceptance, the next artifact is the **`M3.5B-B ARCHITECTURE CONTRACT — B1+B2`**.

---

## 13. Internal consistency proof

| Check | Result |
| :-- | :-- |
| P-03 narrowed; no universal deterministic-key ban labelled INHERITED | **PASS** — §4.1; P-03 scoped to the deleted `occasionKey`; P-03a is the ratified default; O-16 carries the general question |
| Legal/consent deletion override retained and controlling | **PASS** — §4.2; P-05 narrowed to selective-deletion-to-alter-results; P-05a prohibits the inverse claim; Rev 2 §6.E quoted in both halves |
| B exposure/reconciliation storage not over-prohibited | **PASS** — §4.3; B MAY persist exposure/provenance/reconciliation/adjudication facts; only final classifications are barred; compatible with R-B-02 |
| P-17 narrowed; no universal governance doctrine | **PASS** — §4.4; split into established process state (P-17) and B-scoped requirement (P-17a) |
| `Outcome` semantics close at the architecture gate | **PASS** — JA-02/JA-03 → O-02/O-03, both before JBA acceptance; §8.3 makes RT-09 disambiguation a hard acceptance condition |
| `intendedTransactionAt` semantics close at the architecture gate | **PASS** — JA-04 → O-04 before JBA acceptance; physical representation deferred to B2S only |
| B2 distinctness fully separated from C2 independence | **PASS** — §8.1/§8.2; two rows, two owners, two constraints; P-12 and P-12a bar each direction of interference |
| UNKNOWN treatment freezes before protocol/C2 acceptance | **PASS** — O-09 and O-C-INDEPENDENCE both deadline at protocol freeze and C2S acceptance; P-13 bars negative conversion meanwhile |
| Rev 2 annotations happen during authority repair | **PASS** — O-12, before R-B-17 is considered complete; carriage before protocol freeze |
| B2→C1 ordering exists before architecture acceptance | **PASS** — JA-05 → O-13; C1S may restate but may not first define |
| Every normative prohibition is INHERITED / HUMAN-RATIFIED / STRICT CONSEQUENCE | **PASS** — §6; no NEW UNRATIFIED, no normative DIAGNOSTIC, no unsupported universal doctrine |
| Every open row has one owner, separated later owner, and an acceptance-time deadline | **PASS** — §9 |
| No deadline later than the first consuming artifact's acceptance | **PASS** — §10, all rows |
| Patch scope respected | **PASS** — Model B, B1/B2 ownership, `createdFromIntentId` supersession, independence, numerator/denominator rules, architecture design, authority repair and implementation all untouched |

---

# Final Verdict

## M3.5B-B SEMANTIC RATIFICATION V1.2 READY FOR FINAL INDEPENDENT ACCEPTANCE AUDIT

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

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
> `sha256:e55d26aa7ce3ec62fee658e0dcc96b1b64ad573530caa5b0c2a6908d06124ad4`
>
> Verify with: `tail -n +23 <this file> | sha256sum`
>
> **Root authority register:** `PAGAMENOS_SPEC_AUTHORITY.md` · **Repair record:** `PAGAMENOS_R_B_17_AUTHORITY_REPAIR_REPORT.md`

<!-- R-B-17 ARCHIVAL HEADER - END -->

# PAGAMENOS — M3.5B-B SEMANTIC RATIFICATION — V1

**Nature:** **HUMAN-AUTHORITY PATCH.** The clauses marked *new authority* below are **decisions**, not derivations. They are binding because a human authority ratified them, not because prior authority entailed them. Any future document that cites them MUST cite them as ratified decisions.
**Status:** SEMANTIC RATIFICATION ONLY. No implementation, no code, no Prisma, no migrations, no B1/B2 implementation, no `AnalysisProtocol v1` freeze, no Wave 0.
**Resolves:** the decision register of `PAGAMENOS_M3_5B_B1_EFFECTIVE_SPEC_V1.md` §22 (OPEN-1 … OPEN-11).
**Supersedes:** the legacy phase label `B1 Opportunity Identity`.

---

## 1. Contradiction gate — result

Each ratified decision was checked against the frozen higher-order measurement invariants: Rev 2 §6.A (identity + conservative dedup), §6.B (entry-source taxonomy), §6.C (analysis-eligible denominator), §6.D (missing weekly report), §6.E (withdrawal), §6.F (partial week); Patch §RT-09 (business uniqueness), §RT-11 (numerator), §RT-13 (events never repair domain facts); Rev 2 §5/RT-10 (`VerifiedValue`); RT-08 (historical immutability).

> **RESULT: NO DIRECT CONTRADICTION WITH ANY IMMUTABLE HIGHER-ORDER STUDY INVARIANT.**

Two clauses amend a *to-be-frozen* contract text (§5.1); three consequences are material and MUST be carried into the effective B specification (§5.2–§5.4). None of the five is a contradiction; all five are recorded as binding obligations.

---

## 2. Ratified clauses

For each clause: **[I]** inherited authority (already binding; restated for clarity) · **[N]** human-ratified new authority (a decision) · **[O]** still open after this patch.

### R-B-01 — Real-world `PurchaseOccasion`

* **[I]** `PurchaseOccasion` denotes one real-world attempted or realized purchase, not one app request — Rev 2 §6.A verbatim; Phase 0A H-P0-01 ("**real** participant purchase occasions"); A1 §20 ("PurchaseIntent count is not an opportunity/denominator count").
* **[N]** The enumerated app-side facts — intent exists, intent finalized, decision exists, decision bound, exposure occurred — are declared **individually and jointly insufficient** to establish a `PurchaseOccasion`. Prior authority implied this; it was never stated as an enumerated prohibition, and its absence is what admitted the rejected implementation.
* **[O]** none.

### R-B-02 — Two-stage B architecture

* **[I]** B owns "opportunity/occasion identity, reconciliation" (A1 §20); reconciliation is not A2 (A2 V4 §2/§44); the three-level separation `PurchaseIntent ≠ PurchaseOccasion ≠ evidence` (A2 V4 §44).
* **[N]** **The B1/B2 split itself.** No accepted document divided B (spec V1 / AUTH-03). This patch creates the division: **B1 = Purchase Observation / Occasion Candidate Identity; B2 = Purchase Occasion & Exposure Reconciliation.**
* **[N]** **The candidate layer.** A B1 candidate is not a `PurchaseOccasion`; MUST NOT be counted as an opportunity, enter any denominator, enter RIVSR, imply that a real purchase occurred, or implement reconciliation. This is an expansion of the RT-11 contract, which defines one entity only.
* **[O]** the exact B1 candidate schema (deferred, §6).

### R-B-03 — Occasion establishment

* **[I]** C-phase evidence must not gate occasion existence — entailed by Rev 2 §6.D (missingness must not make GREEN easier) and Patch §RT-11 (the denominator must not shrink toward successful participants). Also entailed structurally by RT-10: all three `VerifiedValue` variants carry `purchaseOccasionId`, so the occasion must already exist when verification runs.
* **[N]** **The establishment rule:** a canonical `PurchaseOccasion` exists only when **B2** establishes, from **at least one admissible real-world observation source**, that an attempted or realized purchase occurred. Prior authority named no such rule and no such actor.
* **[O]** **the admissible-source taxonomy** — MUST be defined in the effective B specification before implementation. Candidate sources visible in the corpus: participant-reported attempt/completion (FINAL §21 `Outcome` statuses `attempted`/`self-reported`, VS1/VS2) and `WeeklyExposureReport` reconciliation (Rev 2 §6.C). **`Outcome` is still assigned to no phase** (spec V1 §4.3); the taxonomy work must assign it.

### R-B-04 — Intent cardinality

* **[I]** 0 occasions from one intent must be permitted; retries never create occasions; duplicate captures of one real transaction count as one (Rev 2 §6.A); replacement lineage must not drive occasion identity (A2 V4 §23/§44).
* **[N]** **Permission of one-intent→many** (where independence is *established*, never assumed) and **many-intents/observations→one canonical occasion**; **an occasion with no originating intent**.
* **[N]** **`UNIQUE(originIntentId)` and the equivalent finalization/context-version uniqueness constraints are FORBIDDEN** for canonical occasion identity. Spec V1 §9.2 rejected them as unproven; this patch makes the prohibition normative.
* **[I]** No conflict with §RT-09. RT-09's unit is the **purchase-decision occasion** — "one finalized `PurchaseIntent` = one purchase-decision occasion", already implemented by A2 as `UNIQUE(PurchaseIntentDecisionRequest.intentId)` plus the 1:1 binding. It is a different unit from RT-11's `PurchaseOccasion` (spec V1 §3). The terminology separation MUST be preserved in every downstream document.
* **[O]** none at this level; the *independence predicate* is deferred by R-B-11.

### R-B-05 — Origin intent optional and non-authoritative

* **[N]** **Rev 2 §6.A's required singular `createdFromIntentId` is superseded.** A real-world occasion MAY exist with zero, one, or multiple intent/source links; intent provenance is supporting lineage, never identity authority. **This is an amendment to a frozen-contract field** — see §5.1.
* **[I]** The amendment *repairs* an internal contradiction rather than creating one: Rev 2 §6.C requires counting occasions "established from app records **+ `WeeklyExposureReport`s/research reconciliation**" — purchases made without the app, which a mandatory `createdFromIntentId` cannot represent (spec V1 OPEN-1b).
* **[N]** Synthetic intents MUST NOT be manufactured for purchases that occurred outside app usage.
* **[O]** none; but see §5.3 (independence classification of intentless occasions).

### R-B-06 — Source linkage

* **[I]** Rev 2 §6.A anticipates supporting records ("Manual research adjudication may merge duplicates with an audit record").
* **[N]** Provenance MUST be representable **separately** from the occasion's durable identity; one occasion MAY have multiple supporting observations/sources; **no supporting source may independently determine canonical identity.** An append-only source-link structure is permitted.
* **[O]** the exact source-link representation (deferred, §6).

### R-B-07 — Merchant semantics

* **[N]** `PurchaseOccasion.merchantId` denotes the merchant of the **real-world** purchase and MUST NOT be auto-copied from the A2 intended merchant. A2 retains intended-merchant semantics; B2 determines/records the real merchant.
* **[I]** Consistent with, and required by, Rev 2 §6.A's `purchaseFingerprint` (participant + **merchant** + coarse time-window + verified paid amount + evidence digest — a real-transaction dedup key), and with the "**covered** purchase occasions" criterion of Rev 2 §6.C / H-P0-01, whose coverage test is meaningful only against the real merchant.
* **[O]** none.

### R-B-08 — Participant semantics

* **[I]** Rev 2 §6.A lists `participantId` (surviving §8; spec V1 §2.2). A1 makes `ExperimentAssignment` immutable, `UNIQUE(experimentId, participantId)`, not deleted on withdrawal — so a transitive relation is single-valued and permanent.
* **[N]** The **explicit permission** to satisfy the contract field by an immutable DB-enforced relation instead of a duplicated column, **conditioned on** a named and tested `participantId` projection, and on PostgreSQL proving coherence if the value is stored redundantly.
* **[O]** none.

### R-B-09 — Intent invalidation

* **[I]** Entirely inherited: A2 V4 §23/§44 and A2 V1 §254 ("intent-replacement history, **not** occasion lineage"); RT-13 ("a missing domain fact stays missing"); Rev 2 §6.E (withdrawal → conservative sensitivity, never selective deletion); A1 §7 (assignment not deleted on withdrawal).
* **[N]** The enumerated prohibition list (no delete / mutate / mark ineffective / auto-merge / auto-split / repoint) as a single normative clause.
* **[O]** none.

### R-B-10 — Occasion correction / reconciliation history

* **[I]** Rev 2 §6.A ("merge duplicates with an audit record"); RT-08 immutability; the accepted append-only discipline; A1 impl §N already names "occasion correction lineage" as B-phase work.
* **[N]** That duplicate resolution, merge/supersession and correction MUST be represented as **append-only adjudication/reconciliation history**, and that canonical scientific history MUST NOT be silently rewritten.
* **[O]** the exact adjudication/merge representation (deferred, §6).

### R-B-11 — Failed attempt / retry / resumed purchase

* **[I]** Rev 2 §6.A: "Ambiguity MUST NOT increase the numerator"; ambiguity resolves toward one occasion.
* **[N]** The **placement** decision: B1 MUST NOT hard-code the rule; it belongs to B2 reconciliation and, where windowing-dependent, to the frozen `AnalysisProtocol`.
* **[O]** the independence/windowing thresholds (deferred, §6).

### R-B-12 — Temporal precision

* **[I]** `TIMESTAMPTZ(6)` is the accepted convention of every M3.5A/A1/A2 instant column; no timestamp is an identity key (spec V1 T-01).
* **[N]** The explicit prohibition on JavaScript `Date` as the canonical representation of a stored `TIMESTAMPTZ(6)` instant where truncation is possible (spec V1 T-03, now normative).
* **[O]** none.

### R-B-13 — Append-only late knowledge

* **[I]** RT-08 + the accepted append-only scientific persistence discipline (A1 §21; A2 V4 §28), which this clause explicitly refuses to weaken.
* **[N]** The resolution of the spec V1 §12.3 trilemma: late-arriving facts — including `actualTransactionAt`, `purchaseFingerprint`, and reconciliation facts — are carried on **append-only supporting records**, not by mutating the occasion. **This relocates two fields of the Rev 2 §6.A interface** — see §5.1.
* **[N]** *(added obligation, §5.1)* The analysis-facing read projection MUST reproduce the Rev 2 §6.A shape, so the amendment is structural only and C2 continues to see the frozen interface.
* **[O]** the exact satellite-record shapes (deferred, §6).

### R-B-14 — Identity digest

* **[I]** No accepted text requires a digest on `PurchaseOccasion`; the rejected implementation's `identityDigest` was an invention (spec V1 §15.1).
* **[N]** The default: **omit it**, relying on DB-enforced relational/coherence invariants; and the condition that no immutable digest may be stored unless PostgreSQL verifies its **semantic content**, not merely its syntax.
* **[O]** none.

### R-B-15 — Idempotency receipts

* **[I]** The accepted receipt architecture (A1 §9; A2 V4 §24/§25): append-only, `UNIQUE(operationScope, idempotencyKey)`, concrete strong FK, never polymorphic; A2 V4 §7/§17 structural verification.
* **[N]** "A receipt is a pointer, never identity authority", the mandatory re-proof on every resolution, direct-SQL forgery **inside** the threat model, and fail-closed receiptless-winner adoption **unless** the effective spec defines a recoverable durable protocol that proves the winner.
* **[O]** that recoverable durable protocol, if one is to exist (deferred, §6).

### R-B-16 — Hosted PostgreSQL gate

* **[I]** The gap is real and already tracked as **P35A-06** (M3.5A §30; A1 impl §N), accepted as open with the deadline "before Wave 0".
* **[N]** **Pulling P35A-06 forward** to a B1/B2 acceptance pre-condition, and the ruling that `db:migrate:check` / migration-text inspection is insufficient evidence for trigger semantics. This is a *tightening* of an accepted deferral — strictly more conservative, and therefore never a contradiction.
* **[O]** none.

### R-B-17 — Authority repair

* **[I]** The defects are established: AUTH-01 (A2 spec untracked on every ref), AUTH-02 (`PAGAMENOS_SPEC_AUTHORITY.md` stale at M0), AUTH-03 (no B1/B2 split), AUTH-06 (B1 implemented with no specification).
* **[N]** That repair is a **pre-condition** for B implementation, in the four enumerated steps.
* **[O]** none.

---

## 3. Ratified B phase spine

```
A1  Protocol / Cohort                                  ACCEPTED
A2  Intent / Decision                                  ACCEPTED
B1  Purchase Observation / Occasion Candidate Identity  ratified here — not yet specified
B2  Purchase Occasion & Exposure Reconciliation         ratified here — not yet specified
C1  Evidence / Attribution                              not authorized
C2  Analysis                                            not authorized
```

**[N]** The legacy label **`B1 Opportunity Identity` is superseded** — it wrongly implied that B1 creates canonical `PurchaseOccasion` identity. Every downstream document MUST use the new label.

---

## 4. Terminology now binding

| Unit | Owner | Never confuse with |
| :-- | :-- | :-- |
| **capture** — one A2 `PurchaseIntent` root | A2 | anything below |
| **purchase-decision occasion** — RT-09's unit, one per finalized intent | A2 (implemented) | `PurchaseOccasion` |
| **purchase observation / occasion candidate** — a durable admissible observation that MAY support an occasion | **B1** | `PurchaseOccasion`; never counted |
| **`PurchaseOccasion`** — one real-world attempted/realized purchase | **B2** | candidate; decision occasion |
| **opportunity** — a real occasion meeting the economic threshold | C2 / `AnalysisProtocol` | `PurchaseOccasion` |

---

## 5. Consequences that MUST be carried (obligations, not blocks)

### 5.1 Two clauses amend a to-be-frozen contract

**R-B-05** (supersedes required `createdFromIntentId`) and **R-B-13** (relocates `actualTransactionAt` / `purchaseFingerprint` to satellites) amend the field structure of Rev 2 §6.A.

This is **permissible and not a contradiction**, for three reasons: the contract is *slated* to be frozen ("All of A–F are frozen into `AnalysisProtocol v1`") and **v1 is UNFROZEN** (A1 §3; A2 V4 §38) — the pre-freeze window is exactly when such amendment belongs; Rev 2 §6.B itself anticipates versioned change ("Taxonomy changes require a new `AnalysisProtocol` version"); and R-B-05 removes an internal contradiction (§6.A vs §6.C) rather than introducing one.

**Binding obligations:**

1. Rev 2 §6.A and §8 MUST be annotated as amended by this patch, with the amendment carried into `AnalysisProtocol v1` when it is frozen.
2. Per R-B-13, the analysis-facing projection MUST reproduce the Rev 2 §6.A shape, so C2 continues to see the frozen interface and the amendment stays structural.

### 5.2 Occasion establishment must precede evidence verification

All three RT-10 `VerifiedValue` variants — including `NO_VERIFIABLE_SAVING` — require `purchaseOccasionId`. Under R-B-03, that id exists only once B2 has established the occasion.

**Obligation:** the effective B/C specifications MUST state the ordering — B2 establishment precedes or accompanies C1 verification — otherwise C1 carries a mandatory reference to a row that may not exist. This *supports* R-B-03 (it independently confirms occasions cannot be evidence-gated), but the sequencing must be written down.

### 5.3 Intentless occasions cannot be classified for independence — and must not be forced to be

**This is the most material consequence of R-B-05 and MUST be stated explicitly in the effective B specification.**

The RIVSR numerator requires "≥2 VS3 outcomes on ≥2 **distinct independent** `PurchaseOccasion`s" (Patch §RT-11). Independence is classified by the Rev 2 §6.B entry-source taxonomy — and `entrySource` is an A2 fact frozen on the capture token, reachable **only through an intent** (A2 V4 §8/§5). An occasion with zero intent links therefore has **no entry source** and cannot be classified as independent.

**Consequence, ratified as normative:** an intentless occasion **MAY** support the **denominator** (Rev 2 §6.C, "≥3 genuine covered purchase occasions") and **MUST NOT** enter the **numerator**.

This is doubly conservative and consistent with both governing invariants: it cannot inflate the numerator (Rev 2 §6.A), and it enlarges rather than shrinks the denominator (Rev 2 §6.D; Patch §RT-11 anti-shrinkage). It is also why R-B-05's prohibition on manufacturing synthetic intents matters operationally — synthesizing an intent to obtain an entry source would fabricate independence and inflate the numerator.

### 5.4 `Outcome` ownership is still unassigned

FINAL §21's `Outcome` (VS ladder; statuses `attempted` / `self-reported`) is the corpus's only participant-side record of a real attempt, and it is assigned to **no** phase in the A1/A2/B1/B2/C1/C2 decomposition. R-B-03's deferred taxonomy MUST assign it, and MUST state whether an `Outcome` attaches to an occasion, to a Decision, or to both — RT-09's "one `Outcome` per occasion/Decision" is ambiguous, and R-B-04's one-intent→many-occasions case makes the ambiguity reachable.

---

## 6. Non-decisions (explicitly still open)

Unchanged from the patch scope: the complete admissible observation-source taxonomy; the exact B1 candidate schema; the exact B2 reconciliation algorithm; the exact duplicate/adjudication representation; independence/windowing thresholds; `AnalysisProtocol v1`; RIVSR computation; denominator rules beyond preserving frozen invariants. Added by §5: `Outcome` phase ownership and its attachment rule; the B2→C1 sequencing statement; the R-B-15 recoverable-winner protocol, if any.

---

## 7. OPEN-1 … OPEN-11 mapping

| # | Question | Status | By |
| :-- | :-- | :-- | :-- |
| **OPEN-1** | What event establishes a real-world attempt? | **RESOLVED (rule) / DEFERRED (taxonomy)** | R-B-03 — B2 establishes from ≥1 admissible source; C-evidence not required. Taxonomy deferred to the effective B spec |
| **OPEN-1b** | May an occasion exist with no origin intent? | **RESOLVED** | R-B-05 — yes; `createdFromIntentId` superseded. See §5.3 |
| **OPEN-2** | Where does B1 end and B2 begin? | **RESOLVED** | R-B-02 + §3 spine |
| **OPEN-3** | Adopt a two-stage candidate→reconciled model? | **RESOLVED** | R-B-02 — adopted; candidate explicitly not named `PurchaseOccasion` and excluded from all counts |
| **OPEN-4** | May one intent yield >1 occasion? | **RESOLVED** | R-B-04 — permitted where independently established; the predicate itself is R-B-11 |
| **OPEN-5** | How is "two records, one real transaction" represented? | **RESOLVED (structure) / DEFERRED (representation)** | R-B-06 + R-B-10 — append-only source links + append-only adjudication history; exact shapes deferred |
| **OPEN-6** | Failed→retry / resumed purchase: one occasion or two? | **DEFERRED (placement resolved)** | R-B-11 — B2 + `AnalysisProtocol`; conservative resolution ratified now |
| **OPEN-7** | Which merchant is the occasion's merchant? | **RESOLVED** | R-B-07 — the real-world merchant |
| **OPEN-8** | What is the occasion correction lineage? | **RESOLVED (principle) / DEFERRED (representation)** | R-B-10 |
| **OPEN-9** | Append-only vs late-arriving optional fields? | **RESOLVED** | R-B-13 — append-only preserved; satellites; §5.1 projection obligation |
| **OPEN-10** | Pull P35A-06 forward to a B acceptance pre-condition? | **RESOLVED** | R-B-16 — yes |
| **OPEN-11** | Repair AUTH-01 / AUTH-02 / AUTH-03? | **RESOLVED (mandated) — execution pending** | R-B-17 |

**Score:** 8 resolved · 3 resolved-with-deferred-detail · 1 deferred (placement resolved). **No question remains unowned.**

---

## 8. Obligations before any B implementation

1. Execute R-B-17: commit/version the A2 effective specification chain (or a consolidated canonical A2 spec); update `PAGAMENOS_SPEC_AUTHORITY.md` to recognise M3.5A, A1, A2 and this ratification; record the B1/B2 split; require independently reviewed effective specifications before implementation.
2. Annotate Rev 2 §6.A/§8 as amended by R-B-05 and R-B-13 (§5.1).
3. Write and independently gate `PAGAMENOS_M3_5B_B1_EFFECTIVE_SPEC_V1` (candidate identity) and the B2 effective specification, resolving every §6 item — **before** any code.
4. Close P35A-06 in the hosted required-check surface (R-B-16) before B acceptance.
5. Carry forward, unchanged, the forbidden-interpretation list of `PAGAMENOS_M3_5B_B1_EFFECTIVE_SPEC_V1` §23, with F-01/F-02 now doubly binding under R-B-01/R-B-04.

---

# Final Verdict

## M3.5B-B SEMANTIC RATIFICATION READY FOR INDEPENDENT AUTHORITY AUDIT

Seventeen clauses ratified. No direct contradiction with any immutable higher-order study invariant. Two clauses (R-B-05, R-B-13) amend the field structure of a contract that is slated for — but has not undergone — the `AnalysisProtocol v1` freeze; both amendments are permissible in the pre-freeze window, one of them repairs an internal contradiction, and both carry the annotation obligations of §5.1. Three consequences (§5.2, §5.3, §5.4) are material and are recorded as binding obligations on the effective B specification; §5.3 in particular is normative and conservative in both governing directions.

```
NO IMPLEMENTATION AUTHORIZATION.
B1 / B2 EFFECTIVE SPECIFICATIONS NOT YET WRITTEN.
C1 / C2 NOT AUTHORIZED.
PRODUCTION PROTOCOL v1 UNFROZEN.
WAVE 0 NOT AUTHORIZED.
```

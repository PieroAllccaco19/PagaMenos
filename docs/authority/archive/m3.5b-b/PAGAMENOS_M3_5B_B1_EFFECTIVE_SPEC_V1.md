<!-- R-B-17 ARCHIVAL HEADER - BEGIN. Added by the R-B-17 authority repair. Nothing below the END marker is altered. -->

> # HISTORICAL / NON-NORMATIVE
>
> **Status:** `BLOCKED DIAGNOSTIC / DECISION INPUT - NON-NORMATIVE`
>
> **This document is retained as audit evidence only. It is NOT active authority and MUST NOT drive implementation, review, or gating.**
>
> **Accepted B semantic authority:** `PAGAMENOS_M3_5B_B_SEMANTIC_RATIFICATION_V1_3.md` (tracked at the repository root). This document is a diagnostic and decision input only. It is NOT a B1 effective specification, it does NOT compete with the accepted V1.3 ratification, and it MUST NOT be cited as authority. Its label B1 Opportunity Identity is a superseded legacy label and MUST NOT be used in new normative artifacts.
>
> **Supersession language inside this file is non-operative.** Any claim below of the form "fully supersedes" or "fully replaces" described the review packet submitted to one historical gate. It does **not** supersede, and never superseded, the active normative artifact named above. For the accepted B semantic authority and the status of this artifact, see `PAGAMENOS_SPEC_AUTHORITY.md` §3 and §5, and `docs/authority/archive/README.md`. *(Appendix B of the canonical A2 specification is the neutralization register for the historical **A2** revision chain only. It does not govern this file.)*
>
> **Body integrity.** Everything after the `R-B-17 ARCHIVAL HEADER - END` marker is the original file, byte for byte. Its SHA-256 before archival was:
>
> `sha256:0b978dd832254282e35c7f83a917aed7be4e85aca222968c4ab847fdb09b3239`
>
> Verify with: `tail -n +23 <this file> | sha256sum`
>
> **Root authority register:** `PAGAMENOS_SPEC_AUTHORITY.md` · **Repair record:** `PAGAMENOS_R_B_17_AUTHORITY_REPAIR_REPORT.md`

<!-- R-B-17 ARCHIVAL HEADER - END -->

# PAGAMENOS — M3.5B-B1 EFFECTIVE PRE-IMPLEMENTATION SPECIFICATION — V1

**Milestone:** M3.5B-B1 — Opportunity Identity (`PurchaseOccasion`).
**Status:** SEMANTIC CLOSURE / SPECIFICATION ONLY. No code, no Prisma, no migrations, no branches, no commits, no B2/C1/C2, no Production-Protocol freeze, no Wave 0.
**Nature:** derived from the accepted authority corpus alone. Every normative clause cites its exact source and precedence. Where the accepted corpus cannot answer a core question without invention, the question is **left open in §22 (Decision Register)** and is NOT answered here.

**Final verdict (§23):** `B1 SPECIFICATION BLOCKED — HUMAN SEMANTIC DECISION REQUIRED`.

**Disposition of the rejected implementation:** `a586b3119da2cc1aa4668485b129dbe625ab5cae` (tree `ae31d6649303d04bd334ef1bf93ec56b915d39fe`) is **not authority** and is not reconciled toward. §21 classifies it part by part.

**Accepted baselines used (read-only):** accepted integration merge `81b1cc606df9eeff7766c5afdaa56eeddb0db1a5`; accepted A2 head `22c8efe016a1f743196c45fe4b78d606b56d1567`.

---

## 1. Purpose

B1 is the phase that would give the study's **opportunity unit** a durable identity that later phases join to. This document does three things and only three:

1. reconstructs the authority that governs that unit (§2);
2. closes, normatively, every B1 question the accepted corpus **can** close (§§4–20);
3. registers, without inventing an answer, every B1 question the accepted corpus **cannot** close (§22).

This document authorizes **no implementation**. It is written so an engineer who has never seen the rejected implementation can implement B1 without semantic guessing — **once §22 is ratified by a human authority**.

---

## 2. Authority

### 2.1 Reconstructed precedence

`PAGAMENOS_SPEC_AUTHORITY.md` fixes the base precedence:

```
RT-04 final micro-patch  >  Red-team Patch Revision 2  >  Red-team Patch  >  Phase 0A-2 FINAL
```

with `PAGAMENOS_PHASE_0A.md`, `PAGAMENOS_PHASE_0A_1.md`, `PAGAMENOS_PHASE_0A-1B.md` as authoritative background/corpus-research input. Earlier superseded revisions are historical evidence only.

Above that base sit the accepted milestone authorities, in acceptance order:

```
M3.5A   accepted implementation 64cf864…            (PAGAMENOS_M3_5A_IMPLEMENTATION_REPORT.md)
M3.5B-A1 accepted spec PAGAMENOS_M3_5B_A1_EFFECTIVE_SPEC_V2_1.md
         accepted implementation 99f2d61…          (PAGAMENOS_M3_5B_A1_IMPLEMENTATION.md)
M3.5B-A2 effective spec chain V4 → V4.5
         accepted head 22c8efe…, merged at 81b1cc6…
```

**Effective precedence for a B1 question.** A milestone authority binds only what its own scope binds. Where a milestone authority and the red-team corpus disagree about the *meaning of a study construct*, the red-team corpus wins (it is the frozen analysis contract). Where they disagree about *how an accepted table behaves*, the accepted milestone authority wins (it is the implemented fact). Neither A1 nor A2 claims any B/C closure — both say so explicitly (A1 §20; A2 V4 §36: "No B/C finding claimed closed").

### 2.2 The governing B1 texts, verbatim

**Red-team Patch §RT-11** (Patch level; partly superseded by Rev 2):

> **RT-11 — Distinct purchase occasion + RIVSR denominator (M10/M11.5).** Introduce a stable `PurchaseOccasion` identity; two Decisions/Outcomes from the **same actual transaction** MUST NOT count as two independent occasions. **RIVSR numerator:** participant has **≥2 VS3 `VERIFIED_PEN_SAVING` outcomes on ≥2 distinct independent `PurchaseOccasion`s.** … **missing `WeeklyExposureReport` handling that MUST NOT shrink the denominator toward successful participants** …

**Red-team Patch Rev 2 §6.A** — the highest-precedence definition of the entity:

> **A. Identity** (one real-world attempted/realized purchase, not one app request):
> ```ts
> interface PurchaseOccasion {
>   id: string; participantId: string; merchantId: string
>   intendedTransactionAt: string; actualTransactionAt?: string
>   purchaseFingerprint?: string        // normalized research-safe: participant + merchant + coarse
>                                       // time-window + verified paid amount + evidence digest;
>                                       // NEVER sensitive payment identifiers
>   createdFromIntentId: string
> }
> ```
> **Conservative dedup invariant:** when two records plausibly represent the same real transaction and distinctness cannot be established, they count as **one** `PurchaseOccasion` for primary RIVSR. **Ambiguity MUST NOT increase the numerator.** Manual research adjudication may merge duplicates with an audit record.

Rev 2 §6 closes: *"All of A–F are frozen into `AnalysisProtocol v1`. **Attaches to M10 + M11.5.**"*

**Rev 2 §8 (superseded register), RT-11 row:**

> | minimal `PurchaseOccasion { id, participantId, merchantId, occasionKey }` | full `PurchaseOccasion` (`intendedTransactionAt`/`actualTransactionAt?`/`purchaseFingerprint?`/`createdFromIntentId`); `occasionKey` removed | RT-11 |

**Reading of that row (normative here).** The replacement column enumerates the fields **added**; it is not a complete field list. The complete field list is Rev 2 §6.A. `participantId` and `merchantId` therefore **survive** supersession; only `occasionKey` is deleted. A reading that treats §8 as the field list — and so silently drops `participantId` — is **forbidden** (§10 depends on this).

**Red-team Patch §RT-09** (Patch level, not superseded):

> Business uniqueness (DB unique constraints/transactions): one finalized `PurchaseIntent` = one purchase-decision occasion; **≤1 final `Decision` per finalized `PurchaseIntent`** …; one `Outcome` per occasion/Decision …

**Red-team Patch §RT-13** (Patch level, not superseded):

> `CanonicalEvent` MUST NEVER create or repair VS3, Outcome, Decision, eligibility, `PurchaseOccasion`, contamination, verified saving, or analysis eligibility. A missing domain fact stays missing and is a reconciliation/data-quality exception.

**Phase 0A-2 FINAL** contains **no `PurchaseOccasion` entity at all.** Its §30 entity table names `PurchaseIntent`, `DecisionSnapshot`, `Outcome`, `SavingEvidence`, `ResearchContact`, `WeeklyExposureReport`. The real-world purchase attempt is carried by **`Outcome`** (§21: VS ladder VS0…VS4; statuses *intended · attempted · self-reported · evidence-submitted · evidence-verified · failed · abandoned*), and opportunity density by **`WeeklyExposureReport`** (§26: `coveredPurchaseCount`, `supportedMerchantPurchaseCount`). `PurchaseOccasion` enters the corpus **only** through RT-11, as the unit that stops two Decisions/Outcomes of one real transaction from counting twice.

**Phase 0A** (authoritative background): RIVSR is *"participants achieving ≥2 VS3 savings on ≥2 distinct independent purchase occasions"*; analysis-eligibility requires a participant who *"actually has ≥3 genuine covered-category purchase occasions during the four-week period"*; H-P0-01 measures *"Number of **real** participant purchase occasions where ≥1 applicable benefit meeting economic threshold exists."*

**A1 accepted spec §20:**

> A2 (PurchaseIntent lifecycle, decision request/binding), **B (opportunity/occasion identity, reconciliation)**, C (evidence/attribution, VS/RIVSR/as-of) are not implemented and not A1 tables. **PurchaseIntent count is not an opportunity/denominator count.**

**A2 accepted spec V4 §2 / §44:**

> **OUT of scope (B/C):** PurchaseOccasion; occasion lineages; ResearchContact; AuthMessage; weekly reports; opportunity reconciliation; entry-source **adjudication/contamination conclusions**; … VS3/VS4; RIVSR; denominator bounds; thresholdStatus; C2 analysis.
> `PurchaseIntent input capture ≠ B PurchaseOccasion/opportunity ≠ C evidence`. … The invalidation lineage is **intent-replacement history only**.

**A2 V4 §5 (non-collapse invariant, carried from V1 §137):** two genuinely distinct captures with the same merchant / similar amount / similar time produce **two** `PurchaseIntent` roots. A2 *"never asserts that multiple captures are one economic opportunity — that reconciliation is B1/B2."*

### 2.3 Authority defects found during reconstruction

| # | Defect | Evidence | Consequence |
| :-- | :-- | :-- | :-- |
| **AUTH-01** | **The A2 effective specification is untracked.** No `PAGAMENOS_M3_5B_A2_EFFECTIVE_SPEC*.md` exists in any commit on any ref; all eleven revisions are working-tree-only. | `git log --all --diff-filter=A -- "*A2_EFFECTIVE*"` → empty; `git ls-tree -r 22c8efe`; `git ls-tree -r HEAD` | The accepted A2 **implementation** is merged, but the authority defining its semantics is not in the repository. Any B1 derivation citing A2 cites an unversioned file; B1 cannot be gated against a non-existent artifact. |
| **AUTH-02** | **`PAGAMENOS_SPEC_AUTHORITY.md` is stale at M0.** It still reads "Authorized now: **M0 only**" and "Not authorized in this run: M1, M2, M3, M3.5 …", and lists no A1/A2 document. | `PAGAMENOS_SPEC_AUTHORITY.md` | The root precedence file does not recognise the authorities B1 must derive from; precedence has to be reconstructed by inference. |
| **AUTH-03** | **No accepted document splits B1 from B2.** A1 §20 names one phase — "**B** (opportunity/occasion identity, reconciliation)". The accepted A1 implementation report §N defers "**B1/B2** (PurchaseOccasion, occasion correction lineage, ResearchContact, AuthMessage, weekly reports, opportunity/entry-source reconciliation)" as one undivided bundle. A2 V1 §137 says reconciliation "is B1/B2". | A1 §20; A1 impl §N; A2 V1 §137 | The B1/B2 boundary the rejected implementation assumed is **unratified**. See §22 / **OPEN-2**. |
| **AUTH-04** | **RT-11 attaches to M10 + M11.5 and freezes into `AnalysisProtocol v1`, which is UNFROZEN.** | Rev 2 §6 closing line; A1 §3; A2 V4 §38 | The only contract defining `PurchaseOccasion` is bound to a protocol version that does not yet exist and to milestones far beyond M3.5B. Building the entity now pre-commits an unfrozen analysis contract. |
| **AUTH-05** | **The A2 revision chain's supersession claims are literally false.** V4.5 states it "fully supersedes V1–V4.4 for review" but contains only the `RuleOperationalState.asOf`/`.note` patch; read literally it deletes the entire PurchaseIntent lifecycle. | V4.5 header vs. body | The effective A2 authority is the **union** V4 (architecture) + V4.1/V4.2 (structures) + V4.3/V4.4/V4.5 (corpus projection). This document uses that union. A gate reading only the newest file reads a two-field patch. |
| **AUTH-06** | **The rejected B1 was implemented with no B1 specification.** `git diff 81b1cc6 a586b31` adds 16 files, none of them a specification or design document. Every prior phase was gated against a written effective spec first. | B1 diffstat | B1 semantics were authored inside the implementation — the root cause of audit blocker #1. |

**AUTH-01, AUTH-02 and AUTH-03 are pre-conditions for any B1 gate.** A B1 implementation cannot be independently audited against an authority that is absent from the repository (AUTH-01), unrecognised by the precedence file (AUTH-02), and silent about the phase's own scope (AUTH-03).

---

## 3. Terminology (normative)

| Term | Meaning |
| :-- | :-- |
| **capture** | One A2 `PurchaseIntent` root. An app-side event. A2 V4 §5 guarantees two similar captures stay two roots. |
| **decision occasion** | RT-09's unit: "one finalized `PurchaseIntent` = one purchase-decision occasion". Already implemented by A2 as `UNIQUE(PurchaseIntentDecisionRequest.intentId)` plus the 1:1 binding. **This is not `PurchaseOccasion`.** |
| **real-world occasion** | Rev 2 §6.A's unit: one real-world attempted or realized purchase. What `PurchaseOccasion` denotes. |
| **opportunity** | Phase 0A H-P0-01's unit: a *real* purchase occasion at which ≥1 applicable benefit met the economic threshold. A **filtered** real-world occasion; the filter is an analysis (C2) predicate over a frozen protocol. |
| **candidate** | A record that *may* denote a real-world occasion but has not been established as one. **No accepted authority defines this concept.** It appears here only in §22 / OPEN-3 as an option. |
| **reconciliation** | Establishing whether two signals denote the same real-world occasion (RT-11 conservative dedup). Explicitly B-phase, explicitly not A2 (A2 V4 §2/§44). |

**Forbidden synonymy.** "decision occasion", "real-world occasion" and "opportunity" are three different units. Any B1 artifact that uses one name for another is semantically invalid — this is defect **D-1** in §21.

---

## 4. What a Purchase Occasion is — normative definition

### 4.1 Ruling

> **A `PurchaseOccasion` is the durable identity of ONE real-world attempted or realized purchase by one study participant. It exists if and only if that real-world purchase attempt occurred. It is not created by, and does not correspond one-to-one with, any app-side request, capture, intent, finalization, decision, or exposure.**

This is **Model B — observed real-world occasion**. **Model A (prospective reservation) is REJECTED** on four independent grounds:

**(1) The definition text forecloses it.** Rev 2 §6.A: "one real-world attempted/realized purchase, **not one app request**". A row minted from a finalized intent, before any attempt exists, is by construction one app request.

**(2) Phase 0A's metric definitions require reality.** H-P0-01 counts "the number of **real** participant purchase occasions"; analysis-eligibility requires a participant who "**actually has** ≥3 genuine covered-category purchase occasions". A prospective reservation is not a real occurrence; counting reservations answers a different question than the study asks.

**(3) A1 forbids the resulting identity.** A1 §20: "**PurchaseIntent count is not an opportunity/denominator count.**" Under Model A with one occasion per finalized intent, occasion count **is** finalized-intent count. The prohibition is violated by construction, not by accident.

**(4) It produces exactly the bias RT-11 forbids.** RT-11 requires that missing exposure data "**MUST NOT shrink the denominator toward successful participants**" (Patch §RT-11; Rev 2 §6.D). Under Model A the only occasions that exist are those the participant created in the app. A participant with five real covered purchases who used the app twice has two occasions, fails the "≥3 genuine covered purchase occasions" criterion of Rev 2 §6.C, and drops out of the analysis-eligible denominator — while a participant who used the app at every purchase stays in. That is a denominator shrinking toward the engaged (successful) participants. Model A does not merely lack support; it manufactures the prohibited bias.

**Model C is not required.** The authority answers the definition question with Model B; no third model needs inventing at this level.

### 4.2 Immediate consequences (normative)

| # | Consequence | Basis |
| :-- | :-- | :-- |
| **D-01** | A finalized `PurchaseIntent` **MUST NOT**, on its own, cause a `PurchaseOccasion` to exist. Finalization is an app-side event establishing no real-world attempt. | §4.1; A1 §20 |
| **D-02** | An occasion **MAY** correspond to a real purchase the participant made **without** using the app. Rev 2 §6.C counts occasions "established from app records **+ `WeeklyExposureReport`s/research reconciliation**". | Rev 2 §6.C |
| **D-03** | Absence of an occasion is a **fact**, never a defect to be repaired by minting one: "A missing domain fact stays missing and is a reconciliation/data-quality exception." | RT-13 |
| **D-04** | B1 **MUST NOT** store, derive or expose effectiveness, exposure, contamination, evidence, verified value, threshold status, eligibility, or any count. | A2 V4 §2/§44; A1 impl §N |
| **D-05** | B1 **MUST NOT** compute the "meaningful opportunity" filter (Phase 0A §13: eligible + actionable + ≥ S/5 or 10%). It is an analysis predicate over a frozen `AnalysisProtocol`, which is UNFROZEN. | Phase 0A §13, H-P0-01; A1 §3; A2 V4 §38 |
| **D-06** | **D-02 and the mandatory `createdFromIntentId` of Rev 2 §6.A cannot both hold.** See §22 / **OPEN-1b**. This is a defect *inside the frozen contract*, not a choice B1 may make. | Rev 2 §6.A vs §6.C |

### 4.3 The unresolved half of the definition

Model B answers **what** an occasion is. It does not answer **what system event establishes that a real-world attempt occurred**, because the accepted corpus contains no such primitive at B level:

* FINAL's real-world-attempt carrier is `Outcome` (status `attempted` / `self-reported`, VS1/VS2) — and `Outcome` is **assigned to no M3.5B phase**. The accepted A1 implementation report §N assigns to C1/C2 only "evidence/VerifiedValue, corroboration, RIVSR, denominators/bounds/thresholdStatus, VS3/VS4, as-of analytics". VS1/VS2 and `Outcome` appear nowhere in the A1/A2/B1/B2/C1/C2 decomposition.
* `WeeklyExposureReport` — the other real-purchase signal — sits inside the undivided "B1/B2" bundle (A1 impl §N).
* `purchaseFingerprint`, the one RT-11 field that could evidence a real transaction, is defined over "verified paid amount + evidence digest" — **C-phase material** (RT-10 `VerifiedValue`, attaching to M7).

Therefore **§8 (creation event) is BLOCKED**, and with it the dependent parts of §§6, 7 and 11. See §22 / **OPEN-1**.

---

## 5. `PurchaseIntent` ↔ `PurchaseOccasion` cardinality

### 5.1 The invalid inference, stated and rejected

The rejected implementation reasoned: A2 forbids collapsing two distinct captures into one economic opportunity ⇒ therefore one intent may yield at most one occasion, enforced as `UNIQUE(originIntentId)`.

That inference is **invalid**. A2's non-collapse invariant (V4 §5) constrains **intent identity**: two captures must not become one *intent*. It says nothing about how many *real-world purchases* one intent may precede. "Two intents must not collapse" and "one intent cannot yield multiple occasions" are independent propositions; the second is established by no accepted text.

### 5.2 Cardinality table

Legend — **DERIVABLE**: settled by accepted authority, normative here. **OPEN**: not settled; see §22.

| Mapping | Status | Ruling / justification |
| :-- | :-- | :-- |
| one intent → **0** occasions | **DERIVABLE — MUST be permitted** | The participant may never attempt the purchase. §4.1 (Model B); Phase 0A "real"/"actually has"; A1 §20 (intent count ≠ opportunity count); FINAL §21 statuses `failed`/`abandoned`. Any schema forcing an occasion per finalized intent is invalid. |
| one intent → **exactly 1** occasion | **DERIVABLE — permitted** | The ordinary case. Rev 2 §6.A `createdFromIntentId`. |
| one intent → **>1** occasions | **OPEN** | Not forbidden by any text (`createdFromIntentId` is singular *per occasion row*, which constrains the occasion, not the intent). Really occurs: one `BUYING_TODAY` intent, two separate real purchases at the same merchant that day. Rev 2 §6.A permits two rows citing one origin intent; the conservative dedup invariant pushes the ambiguous case toward one. **No accepted rule chooses.** → OPEN-4. |
| one occasion ← **>1** intents | **OPEN** | Required in substance by RT-11 (two records of one real transaction count as one occasion) but **unrepresentable** in Rev 2 §6.A, which has a single `createdFromIntentId`. Representations (join table / adjudication record / canonical-plus-supporting) are all uncited. → OPEN-5. |
| **replacement intents** (A2 invalidation lineage) | **DERIVABLE — MUST NOT drive occasion identity** | A2 V4 §23/§44: "The invalidation lineage is **intent-replacement history only**"; A2 V1 §254: "Invalidation … is intent-replacement history, **not occasion lineage**." B1 MUST NOT infer that A-replaced-by-B implies one occasion, nor that it implies two. |
| **retries** (transport) | **DERIVABLE — never a new occasion** | A2 V4 §5.1/§24: transport retry converges on one durable fact. A retry is not a second real-world purchase. |
| **failed transaction then successful retry** (real world) | **OPEN** | Two real-world attempts. Rev 2 §6.A's unit is "attempted **or** realized", so both arguably qualify — yet RIVSR counts "distinct independent occasions", and a failed attempt immediately followed by a successful one at the same till is plainly one shopping event. **No accepted rule chooses.** → OPEN-6. |
| **resumed purchase later** | **OPEN** | Same structure as above, across a longer gap. The coarse time-window in `purchaseFingerprint` hints at a windowing rule but defines no threshold. → OPEN-6. |
| **duplicate app capture of one real transaction** | **DERIVABLE — MUST count as one occasion** | Rev 2 §6.A conservative dedup invariant, verbatim; Patch §RT-11 "two Decisions/Outcomes from the same actual transaction MUST NOT count as two independent occasions". **How** that single count is achieved (merge, adjudication, analysis-time projection) is OPEN-5. |
| **separate real transactions with similar merchant/time/value** | **DERIVABLE — are distinct occasions, but MUST NOT be distinguished by heuristic** | They are genuinely two real purchases. But Rev 2 §6.A resolves ambiguity *toward one* ("distinctness cannot be established ⇒ one"), and A2 V4 §17 forbids "same merchant/similar input/amount/time" as an identity predicate. So B1 MUST NOT mint two occasions merely because attributes differ, and MUST NOT merge two merely because they are similar. Establishing distinctness is reconciliation (B2 if the split is ratified). |

### 5.3 Three separations that MUST be kept distinct

| Layer | Owns | Enforced today |
| :-- | :-- | :-- |
| **intent identity** | which app capture is which | A2: `UNIQUE(intentCaptureKey)`, `UNIQUE(captureTokenId)`, non-collapse (V4 §5) |
| **real-world occasion identity** | which real purchase is which | **nothing — this is what B1 is for** |
| **deduplication / reconciliation** | whether two signals denote one real purchase | B-phase; conservative dedup (Rev 2 §6.A); explicitly not A2 (V4 §2/§44) |

`UNIQUE(originIntentId)` merges layer 1 into layer 2: it makes real-world identity a function of app-capture identity. That is the central semantic error of the rejected implementation (§21 / D-1).

---

## 6. B1 / B2 ownership boundary

**AUTH-03 applies: no accepted document splits B1 from B2.** The table below classifies each operation against the boundaries that *are* accepted — A2-vs-B and B-vs-C. Where the accepted corpus resolves only to "B", the cell reads **B (unsplit)** and the B1/B2 assignment is deferred to OPEN-2.

| Operation | Classification | Authority |
| :-- | :-- | :-- |
| detecting that a real-world purchase attempt occurred | **UNASSIGNED — no phase owns it** | FINAL §21 carries it on `Outcome` (VS1/VS2), which the M3.5B decomposition never assigns. §4.3. **This is the blocking gap (OPEN-1).** |
| allocating the durable occasion ID | **B (unsplit)** — "B1" only if OPEN-2 is ratified | A1 §20 "B (opportunity/occasion identity…)" |
| linking an occasion to one or more intents | **B (unsplit)**; the *multi-intent* case is unrepresentable today | Rev 2 §6.A `createdFromIntentId`; OPEN-5 |
| deduplicating two signals that may describe one real transaction | **B (unsplit)** — the "reconciliation" half; "B2" only if OPEN-2 is ratified | Rev 2 §6.A; A2 V4 §2 "opportunity reconciliation" is out-of-scope-B; A2 V1 §137 "that reconciliation is B1/B2" |
| reconciling merchant/payment observations | **B (unsplit)** | A2 V4 §2 excludes "opportunity reconciliation" as B |
| reconciling **receipt** observations | **C1** | A2 V4 §2 lists `TransactionCorroboration`, `BaselineCorroboration`, `ValueVerification` as C; A1 impl §N: "C1/C2 (evidence/VerifiedValue, corroboration …)" |
| determining whether two candidate events are the same occasion | **B (unsplit)**, reconciliation half | Rev 2 §6.A conservative dedup |
| exposure association | **B (unsplit)** | A2 V4 §2 excludes ResearchContact, weekly reports, "entry-source **adjudication/contamination conclusions**"; A1 impl §N places weekly reports + entry-source reconciliation in B1/B2 |
| evidence attribution | **C1** | A2 V4 §2 ("redeemed-benefit attribution"); A1 impl §N |
| effectiveness | **C2** | A1 impl §N; A2 V4 §2 (VS3/VS4, RIVSR) |
| denominator eligibility | **C2**, frozen into `AnalysisProtocol v1` at M10/M11.5 | Rev 2 §6.C + §6 closing line; A1 impl §N ("denominators/bounds/thresholdStatus") |
| meaningful-opportunity threshold | **outside M3.5B** — analysis-only, and currently unfreezable | Phase 0A §13 + H-P0-01; `AnalysisProtocol v1` UNFROZEN (A1 §3; A2 V4 §38) |

### 6.1 The critical requirement, tested

> *B1 must not require B2 semantics to determine identity unless the architecture explicitly defines a two-stage candidate→reconciled identity model.*

Applying it: under §4.1 (Model B), an occasion exists only once a real-world attempt is **established**. Establishing it against duplicate/ambiguous signals **is** reconciliation. Therefore, with the accepted corpus as it stands:

```
B1 (identity of a real-world occasion) REQUIRES reconciliation
⇒ either the two phases are one phase,
  or a two-stage candidate→reconciled model must be explicitly defined.
```

The accepted architecture defines **no** two-stage model. Hence the requirement is **not satisfiable** as written, and §22 / **OPEN-2** and **OPEN-3** must be ratified before B1 can exist as a standalone phase.

---

## 7. A two-layer model — evaluated, not adopted

**Candidate shape:** `PurchaseIntent` → app-side candidate observation/reference → B2 reconciliation → `PurchaseOccasion`.

**Arguments in favour (all from accepted text):**

* The corpus already separates the three levels: A2 V4 §44 — `PurchaseIntent input capture ≠ B PurchaseOccasion/opportunity ≠ C evidence`; A2 V1 §33 — `PurchaseIntent ≠ PurchaseOccasion ≠ denominator opportunity`.
* Rev 2 §6.A's conservative dedup presupposes "records" that "plausibly represent the same real transaction" and can be "merged … with an audit record" — i.e. something that exists *before* the occasion is settled.
* A two-layer model is the only structure found that satisfies §4.1 (occasions denote reality) **and** the accepted append-only discipline **and** the §6.1 constraint simultaneously, without B1 manufacturing real-world events.

**Arguments against (also from accepted text):**

* No accepted document names, types, or authorises a candidate layer. RT-11 defines exactly one entity.
* Rev 2 §6.A's `createdFromIntentId` already carries the intent link, so a separate reference layer is not textually required.
* Adding a layer expands the frozen RT-11 contract, which "attaches to M10 + M11.5" and freezes into `AnalysisProtocol v1` (AUTH-04). A B1-invented layer would pre-empt an analysis contract that has not been frozen.

**Ruling: NOT ADOPTED and NOT REJECTED.** Adopting it would create authority; rejecting it would leave §6.1 unsatisfiable. This is precisely the arbitrary choice §18 of the closure brief forbids. → §22 / **OPEN-3** (with a labelled recommendation).

---

## 8. Identity creation event

**BLOCKED.** No accepted text names an event, evidence set, or state that establishes "a real-world attempted/realized purchase occurred" at B level (§4.3).

What *is* derivable — the candidate events, each ruled out as **insufficient**:

| Candidate event | Ruling | Basis |
| :-- | :-- | :-- |
| intent capture | **MUST NOT** create an occasion | app request; §4.1; A2 V4 §5 |
| intent finalization | **MUST NOT** create an occasion | §4.2 / D-01; A1 §20. *This is what the rejected implementation used.* |
| decision binding | **MUST NOT** create an occasion | a decision is a computation, not a purchase; RT-09's "purchase-decision occasion" ≠ `PurchaseOccasion` (§3) |
| exposure | **MUST NOT** create an occasion | exposure is B2/contamination material; RT-13 forbids events creating occasions |
| explicit checkout attempt / payment initiation / merchant-side attempt | **would satisfy §4.1** — but **no such signal exists** in any accepted entity, and none is assigned to a phase | FINAL §30 entity table |
| transaction observation | **would satisfy §4.1** — carried by `Outcome` (`attempted`/`self-reported`), which is unassigned | FINAL §21/§30 |
| reconciliation threshold | **would satisfy §4.1** — but requires the two-stage model (OPEN-3) and a threshold no text defines | Rev 2 §6.A |
| evidence event | **C1**, and too late: it would make VS3-verified purchases the only occasions, biasing the denominator toward successes | RT-10; Rev 2 §6.D |

**Normative negative closure (usable now).** Even while OPEN-1 is unresolved, this much is binding:

> **N-01** — B1 MUST NOT create a `PurchaseOccasion` from any event whose occurrence is fully determined by app-side state (capture, context append, finalization, decision request, binding, exposure). Any implementation whose creation precondition is expressible purely over A1/A2 rows is semantically invalid.

---

## 9. Identity and uniqueness

Deliberately answered **after** §§4–8, and only to the extent those sections closed.

### 9.1 Durable identifier — DERIVABLE

| Question | Ruling | Basis |
| :-- | :-- | :-- |
| Form of `PurchaseOccasion.id` | **MUST be an opaque DB-generated UUID** (`gen_random_uuid()`), never derived from business fields, timestamps, or a hash | Rev 2 §6.A (`id: string`, opaque); the accepted convention of every M3.5A/A1/A2 table; A2 V4 §15 (identity from the immutable id) |
| Deterministic / natural key | **MUST NOT exist** | Rev 2 §8 **deleted `occasionKey`** from the contract. A merchant/time/value natural key is additionally forbidden by A2 V4 §17 ("Same merchant/similar input/amount/time never suffices") |
| Reconciliation-generated id | **OPEN** — would be the natural form under the two-stage model | OPEN-3 |

### 9.2 `UNIQUE(originIntentId)` — explicit ruling

> **REJECTED — NOT AUTHORIZED.**

Grounds:

1. **No authority establishes it.** It rests on the invalid inference rebutted in §5.1.
2. **It contradicts the definition.** It makes real-world occasion identity a total function of app-capture identity, so occasions become app requests — exactly what Rev 2 §6.A denies.
3. **It contradicts A1 §20.** Occasion count becomes finalized-intent count.
4. **It structurally forbids the one cardinality RT-11 mandates.** Two intents for one real transaction can never resolve to one occasion while each intent owns a unique occasion row.
5. **It is anti-conservative.** Under RIVSR, two duplicate captures of one real transaction, each verified, yield two "distinct independent occasions" — inflating the numerator, which Rev 2 §6.A forbids in terms ("Ambiguity MUST NOT increase the numerator").

The same ruling applies *a fortiori* to `UNIQUE(originFinalizationId)` and `UNIQUE(originContextVersionId)` (rejected implementation), which are narrower still and cited by nothing.

### 9.3 What IS unique — DERIVABLE, and it is only this

| Constraint | Status |
| :-- | :-- |
| `PRIMARY KEY (id)` | **MUST** |
| any uniqueness over `originIntentId` / finalization / context version | **MUST NOT** (§9.2) |
| any uniqueness over `(participant, merchant, time)` or any attribute tuple | **MUST NOT** — heuristic natural key; A2 V4 §17; Rev 2 §8 (`occasionKey` deleted) |
| uniqueness expressing "one occasion per real transaction" | **cannot be expressed** without OPEN-1/OPEN-5; the invariant is real but has no key |

**Consequence to state plainly:** once `UNIQUE(originIntentId)` is rejected and no natural key is permitted, **B1 has no uniqueness constraint left that carries scientific meaning.** A table whose only constraint is a surrogate PK does not, by itself, establish an identity. This is a strong structural signal that the identity B1 was asked to allocate cannot be allocated from A2 state alone — reinforcing OPEN-1/OPEN-3.

### 9.4 Alternatives evaluated

| Alternative | Verdict |
| :-- | :-- |
| many occasions per intent | permitted in principle; not chosen (OPEN-4) |
| join table intents ↔ occasions | **not authorised**; would be the natural representation of the many-intents-one-occasion case (OPEN-5) |
| candidate identities before reconciliation | **not authorised** (OPEN-3) |
| one canonical occasion + many supporting observations | **not authorised**; closest to Rev 2 §6.A's "merge duplicates with an audit record" (OPEN-5) |
| one occasion with one or multiple source intents | textually blocked by the singular `createdFromIntentId` (OPEN-5) |

---

## 10. Participant identity (RT-11 `participantId`)

### 10.1 Ruling

| Clause | Ruling |
| :-- | :-- |
| **MUST** | `PurchaseOccasion` MUST bear a participant relation that resolves to **exactly one** `StudyParticipant`, is **immutable**, and is **provable inside the database** — not merely in application code. The relation is part of the frozen contract (Rev 2 §6.A, `participantId: string`, surviving §8 per the reading in §2.2). |
| **MAY** | That relation MAY be satisfied **transitively**, through an immutable FK chain whose single-valuedness is DB-enforced — e.g. `occasion.assignmentId → ExperimentAssignment.participantId`, where A1 makes `ExperimentAssignment` immutable with `UNIQUE(experimentId, participantId)` and UPDATE/DELETE/TRUNCATE denied (A1 §21). A physically stored `participantId` column is **not** mandated by the contract, which is an interface, not a DDL. |
| **MUST** (conditional) | If a `participantId` column **is** stored, its equality with the derived participant MUST be proven at INSERT by a database trigger, exactly as A2 proves cross-table coherence. A stored copy that only the application checks is denormalization drift and is **MUST NOT**. |
| **MUST** | The projection used by analysis to obtain `PurchaseOccasion.participantId` MUST be defined normatively in this specification and covered by tests, so that RT-11's field name denotes exactly one derivation. |
| **MUST NOT** | B1 MUST NOT omit **every** participant-resolving relation, and MUST NOT reach the participant through any mutable or non-FK path. |

### 10.2 Why transitivity is sufficient here (and why the audit's blocker still stands)

Against the criteria the closure brief names:

* **Auditability / historical stability** — `ExperimentAssignment` is immutable and append-only, and A1 §7 states it is "**not deleted on withdrawal**". The derived participant is therefore stable forever. Satisfied.
* **Cross-assignment ambiguity** — an assignment determines exactly one participant permanently (`UNIQUE(experimentId, participantId)`). A participant in two experiments has two assignments; each occasion resolves through *its own* assignment, unambiguously. Storing only `participantId` would be strictly *worse*: it would lose the assignment, which the cohort/observation window needs. Satisfied.
* **FK enforcement** — the chain `occasion → assignment → participant` is FK-enforced end to end. Satisfied.
* **Downstream attribution** — C1/C2 need both participant and assignment; the transitive form retains both. Satisfied.
* **Denormalization drift** — avoided precisely by *not* copying. Satisfied.
* **Normative schema language** — this is the one criterion the transitive form does not satisfy on its face, and it is why the audit raised the blocker: RT-11 writes `participantId` as a field. §10.1 resolves it by requiring the *relation* and the *named projection*, not by letting a normalization preference silently delete a contract field.

**The audit's blocker is upheld in substance.** The rejected implementation did not merely normalize `participantId` away — it defined **no** projection restoring the contract field, so nothing in the codebase named or tested `PurchaseOccasion.participantId`. That is a contract-coverage failure, and §10.1's fourth clause is the fix.

**Note the asymmetry with `merchantId`.** RT-11 lists `merchantId` in the same struct. Under Model B, merchant is a property of the **real** purchase, and the app-side intent's merchant is only the *intended* one — a participant may intend KFC and buy at Bembos. A `merchantId` copied from the pinned A2 context version is therefore **not** the occasion's merchant; it is the intent's. This is a further reason the identity facts cannot be lifted wholesale from A2 rows. → OPEN-7.

---

## 11. Invalidation and replacement

Two rulings bind every case below:

> **I-01** — A2's invalidation lineage is **intent-replacement history only** and MUST NOT be read as occasion lineage, occasion merge, or occasion invalidation. (A2 V4 §23/§44; A2 V1 §254.)
>
> **I-02** — A real-world purchase that occurred cannot be un-occurred by an app-side correction. An existing occasion MUST NOT be deleted, mutated, or flagged non-effective because its origin intent was later invalidated or the participant withdrew. (RT-13 "a missing domain fact stays missing"; Rev 2 §6.E withdrawal → conservative sensitivity, never selective deletion; A1 §7 assignment "not deleted on withdrawal"; the accepted append-only discipline.)

| Case | Occasion exists? | Identity survives? | Linkage changes? | May another exist later? | Phase |
| :-- | :-- | :-- | :-- | :-- | :-- |
| **1.** Intent invalidated before any real-world attempt | **No** — nothing ever established an attempt (§4.1) | n/a | n/a | **Yes** — a later real attempt is a new occasion, whatever intent precedes it | B |
| **2.** Real-world attempt occurs, then intent is invalidated | **Yes** (if the attempt was established) | **Yes, unchanged** (I-02) | **No** — invalidation is intent history (I-01) | n/a | B; the invalidation fact stays A2's |
| **3.** Occasion exists, then source intent is invalidated | **Yes** | **Yes, unchanged** | **No** | n/a | B |
| **4.** Intent A replaced by Intent B before the attempt | **No** at replacement time | n/a | n/a | **Yes** — a later attempt yields one occasion; **which intent it cites is OPEN-5** | B |
| **5.** Intent A replaced after an occasion already exists | **Yes** | **Yes, unchanged** | **MUST NOT** be re-pointed to B by the replacement alone (I-01) | n/a | B |
| **6.** Two intents in a replacement lineage plausibly denote one real occasion | **At most one occasion** (Rev 2 §6.A conservative dedup) | — | **OPEN** — the merge is unrepresentable (single `createdFromIntentId`) and MUST NOT be inferred from the lineage (I-01) | — | reconciliation → B2 if OPEN-2 ratified |
| **7.** Replay / idempotency operation after invalidation | **No new occasion**; the frozen prior outcome replays if one exists | **Yes** | **No** | **No** | B, per §13 |

**Explicitly forbidden shortcut.** A mutable `effective = false` column (or any stored derived-effectiveness flag) MUST NOT be used for any case above. The accepted persistence discipline stores no derived effectiveness (A2 V4 §2/§44; A1 §2 keeps all analysis semantics in the protocol's `definitionJson`, prohibiting semantic scalar columns), and every B-phase table is append-only.

**Occasion correction lineage.** The accepted A1 implementation report §N names "**occasion correction lineage**" as B1/B2 work. So the authority *anticipates* a correction/supersession structure for occasions. Its shape (append-only supersession record vs. adjudication audit record) is defined nowhere. → **OPEN-8**. The rejected implementation provided none.

---

## 12. Temporal model

### 12.1 Meaning, mutability and role of each instant

| Instant | Owner | Meaning | Role in identity | May be unknown initially | May be populated later | Immutable |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| `PurchaseIntent.initiatedAt` (intent captured) | A2 | trusted instant the capture began | **never** — descriptive | no | no | yes |
| `PurchaseIntentContextVersion.capturedAt` / `.recordedAt` | A2 | event time / knowledge time of a context capture | never | no | no | yes |
| `intendedTransactionAt` | A2 (participant-entered, pinned at finalization) | when the participant *intends* to transact | **never** — descriptive only; MUST NOT participate in any uniqueness key | no | no | yes |
| `PurchaseIntentFinalization.finalizedAt` | A2 | trusted finalization event (event == knowledge; A2 V4 §34) | never | no | no | yes |
| `DecisionSnapshot.evaluatedAt` | M3.5A | when the engine evaluated | never | no | no | yes |
| **occasion creation time** | B1 | when the identity was recorded | **never** — it is a knowledge/recording time, not the occasion's event time; MUST NOT be used for uniqueness or windowing | no | no | yes |
| **`actualTransactionAt`** | B (Rev 2 §6.A, optional) | when the real transaction actually occurred | **never** — descriptive (it is the occasion's *event* time, but identity is the surrogate id) | **yes** | **see §12.3 — BLOCKED under append-only** | yes once set |
| exposure time | B2 | contamination-window anchor | never (not B1) | — | — | — |
| reconciliation time | B2 | when a merge/adjudication was decided | never (not B1) | — | — | — |
| evidence observation time | C1 | when evidence was observed/verified (`verifiedAt`, RT-10) | never (not B1) | — | — | — |

**Rule T-01 (normative).** No timestamp participates in occasion identity or in any uniqueness constraint. The only identity is the surrogate `id` (§9.1). This survives every open question.

**Rule T-02 (normative).** Event time and knowledge time MUST stay distinct for any B1 fact that can be learned after it occurred. `actualTransactionAt` is an event time that is learned later; the instant B1 records the row is a knowledge time. A2 collapsed the two only where the event is a trusted immediate service action (V4 §34) — that exemption does **not** extend to a real-world purchase.

### 12.2 Precision — DERIVABLE and binding

| Layer | Contract |
| :-- | :-- |
| Storage | **`TIMESTAMPTZ(6)`** — PostgreSQL microsecond precision, matching every accepted A1/A2/M3.5A instant column |
| Canonical serialization for any digest or comparison | **MUST preserve full stored microsecond precision** and MUST be zone-qualified/normalized deterministically |
| JavaScript `Date` | **MUST NOT** be used to canonicalize a stored instant. `Date` is millisecond-resolution: `new Date(v).toISOString()` silently truncates the microsecond component of a `TIMESTAMPTZ(6)` value |

**Rule T-03 (normative).** Any B1 canonicalization of an instant MUST round-trip against the stored `TIMESTAMPTZ(6)` value without loss. An implementation that canonicalizes through `Date` cannot satisfy T-03 and is invalid — a stored value with a non-zero microsecond remainder produces a canonical form that differs from the database's own value, so any digest or coherence check over it compares two different instants. (This is a live defect in the rejected implementation; see §21 / D-6.)

### 12.3 The append-only / late-population conflict — BLOCKED

Rev 2 §6.A marks `actualTransactionAt` and `purchaseFingerprint` optional, and `purchaseFingerprint` is defined over "verified paid amount + evidence digest" — values that exist only after C-phase verification. Under the accepted persistence discipline every scientific table is append-only at the database level (BEFORE UPDATE/DELETE/TRUNCATE triggers RAISE; A1 §21, A2 V4 §28). An append-only row can never be enriched.

So exactly one of these must be true, and **no accepted text chooses**:

1. the occasion row is created late enough that both fields are already known (pushing creation toward C-phase evidence — which §8 shows biases the denominator toward successes); or
2. the occasion table is **not** append-only (breaking the discipline that RT-08 and every accepted milestone enforce); or
3. the optional fields live in separate append-only satellite records (a structure no text authorises).

→ §22 / **OPEN-9**.

---

## 13. Idempotency and receipt authority

### 13.1 The trust model — DERIVABLE

> **R-01 — A receipt is a POINTER, never an identity authority.** Resolving a transport idempotency key to a durable fact MUST re-prove that the resolved row is the row the current request is entitled to. A receipt row that merely *contains* an `occasionId` establishes nothing.

Basis: the accepted receipt architecture (A1 §9; A2 V4 §24/§25) makes receipts append-only transport records with `UNIQUE(operationScope, idempotencyKey)` and a **concrete strong FK** — never a polymorphic or self-authorising target; and A2 V4 §7/§17 requires the *binding* to be verified structurally rather than trusted. The rejected implementation's own final commit reached R-01 for one path; R-01 generalises it.

**R-02.** The threat model MUST NOT assume an attacker cannot issue direct SQL. `INSERT` on a receipt table cannot be forbidden (the repository must write receipts), so a forged receipt carrying a victim's `(operationScope, idempotencyKey, requestHash)` and a foreign target is always constructible. Every receipt read MUST therefore be treated as untrusted until re-proven.

### 13.2 Case table

| Case | Required behaviour | Basis |
| :-- | :-- | :-- |
| same key / same request | return the frozen prior outcome; create **no** new fact and **no** new receipt; mark the response as a replay | A2 V4 §24 |
| same key / conflicting request | **fail closed** with a typed conflict; never silently resolve | A2 V4 §24/§25; RT-09 "same key + different payload ⇒ conflict (409)" |
| different key / same logical action | a domain **alias** receipt pointing at the existing fact; the original fact's trusted timestamps MUST NOT be re-sampled | A2 V4 §24 |
| forged / invalid receipt | **fail closed.** The resolved target MUST be re-proven to belong to the requesting subject before it is returned (R-01/R-02) | §13.1 |
| poisoned key (key consumed by an unrelated request) | permanently consumed; any later different request under it conflicts | A2 V4 §24 |
| winner adoption (concurrent race lost) | adopt the durable winner **only** after re-proving it satisfies the request's material identity; do **not** write an alias receipt for a lost race | A2 V4 §26 |
| receiptless winner | **fail closed** — a durable fact without its originating receipt violates the receipt architecture and MUST NOT be reported as idempotent success | A1 §9; A2 V4 §24 |
| recovery after crash | replay from durable state only; never re-derive the fact from current inputs | A2 V4 §21/§22 |

### 13.3 The part that is BLOCKED

The material **request identity** of a B1 create operation cannot be fixed until §8 and §9 are: a request hash must bind exactly the material that determines the resulting fact. The rejected implementation hashed `{op, intentId, participantId}` — correct only if the intent determines the occasion, which §9.2 rejects. Under Model B the material would include whatever evidence establishes the attempt (OPEN-1). → dependent on **OPEN-1**.

### 13.4 Enforcement layers for the idempotency invariants

| Invariant | DB | Repository | Service | Trusted harness |
| :-- | :-- | :-- | :-- | :-- |
| one durable receipt per `(operationScope, idempotencyKey)` | **MUST** (UNIQUE) | classify P2002 by field set, never by message | — | — |
| receipt target is a real, type-correct row | **MUST** (concrete FK) | — | — | — |
| `operationScope` is a trusted constant | **MUST** (CHECK) | — | — | — |
| receipt resolves to a row the caller is entitled to | cannot be DB-enforced | **MUST** re-prove per read (R-01) | **MUST** enforce ownership | **MUST** cover with an adversarial forged-receipt test |
| replay never re-samples trusted time | — | **MUST** | **MUST** | test |

---

## 14. Database authority model

Classification of every material identity invariant. **DB** = must be enforced by PostgreSQL; **APP** = must be enforced in application code; **BOTH** = duplicate deliberately; **AUDIT** = not enforceable, requires detection.

| Invariant | Class | Note |
| :-- | :-- | :-- |
| surrogate PK / id generation | **DB** | `gen_random_uuid()`; the application never supplies an id |
| append-only (no UPDATE/DELETE/TRUNCATE) | **DB** | BEFORE-trigger RAISE, matching the accepted `*_forbid_mutation` pattern — **subject to OPEN-9** |
| parent coherence (any A1/A2 row referenced belongs to the same subject) | **BOTH** | DB: FK + insert-time cross-table trigger (the A2 finalization-coherence pattern); APP: derive under lock |
| participant ownership | **BOTH** | DB: FK chain + trigger proof (§10.1); APP: trusted-context ownership check |
| occasion cardinality (one occasion per real transaction) | **AUDIT** | **Cannot be DB-enforced**: no key exists (§9.3) and the predicate is a research judgement (Rev 2 §6.A "distinctness cannot be established"). MUST be a reported reconciliation/data-quality exception, per RT-13 |
| invalidation state at identity creation | **BLOCKED** | Under §11 an occasion records reality; an A2 invalidation is app-side. Whether invalidation may *block* creation depends on the creation event → **OPEN-1**. The rejected implementation's DB trigger asserts it; that assertion is unproven |
| replacement lineage | **APP (read-only)** | I-01: lineage MUST NOT be enforced *into* occasion identity by any constraint |
| canonical digest | **see §15** | not required by authority |
| timestamps | **BOTH** | DB: `TIMESTAMPTZ(6)` + trusted server clock; APP: T-02/T-03 |
| idempotency receipts | **see §13.4** | |

**Rule DB-01 (normative).** An invariant classified **DB** that the authoritative gate never executes against real PostgreSQL is not enforced — it is asserted. See §17.

---

## 15. Canonicalization and identity digest

### 15.1 Is a digest required at all?

> **No.** Rev 2 §6.A defines no digest field, and no accepted text requires one on `PurchaseOccasion`. The `identityDigest` of the rejected implementation is an **invention**.

Digests are required by the accepted corpus where they protect a *frozen input* (M3.5A `inputHash`, A2 `decideInputHash`, corpus/holiday semantic digests) — i.e. where a payload must be proven unchanged. A `PurchaseOccasion` row carries no frozen payload; its facts are FK references and two scalars already provable by cross-table trigger.

### 15.2 If a digest is nevertheless retained — binding conditions

| Aspect | Requirement |
| :-- | :-- |
| status | **integrity fingerprint only**; MUST NOT participate in identity, MUST NOT be unique-indexed |
| canonical input | the exact set of stored identity facts, by explicit key projection (never object spread) |
| serialization | the accepted canonicalizer; instants at full `TIMESTAMPTZ(6)` precision (T-03) |
| computation layer | application, inside the same transaction that writes the row |
| DB verification | **either** the database verifies it, **or** it MUST NOT be stored in an immutable column |

### 15.3 The audit defect, and the fail-closed resolution

The defect is real and confirmed: the rejected migration constrains the digest with `CHECK ("identityDigest" ~ '^[0-9a-f]{64}$')`, which validates **form, not content**. Any syntactically valid 64-hex string is accepted, the row is then append-only, and the result is a permanently uncorrectable row whose digest does not fingerprint its own facts. The application-side `assertOccasionIdentityCoherent` detects it only on read — after the corrupt row is immutable.

**Ruling — one of the following MUST hold; the third is recommended:**

1. **DB-verifiable digest** — recompute the canonical serialization and SHA-256 inside the INSERT trigger (`pgcrypto`), rejecting a mismatch. Sound, but duplicates the canonicalizer in plpgsql, and any drift between the two implementations becomes a new fail-closed hazard.
2. **Digest removed from immutable DB authority** — do not store it; recompute on read from the DB-proven facts. The facts themselves are already trigger-proven, so nothing is lost.
3. **Recommended: omit the digest entirely.** No authority requires it (§15.1); the cross-table INSERT trigger already makes an incoherent row unrepresentable; and a stored-but-unverifiable digest is strictly worse than no digest, because it *looks* like an integrity guarantee.

**Forbidden:** a stored digest in an immutable column verified only by application code. That is the rejected implementation's design and it is fail-open at the database boundary.

---

## 16. API / service contract

**Cannot be specified.** The operation set follows from the creation event (§8) and the cardinality model (§9), both blocked. What is binding regardless:

| # | Rule |
| :-- | :-- |
| **S-01** | Every B1 write is a trusted internal operation over a trusted participant context; no identity fact is ever caller-supplied. (A2 V4 §27/§30.) |
| **S-02** | No public surface exposes a raw repository, clock, timestamp, or identity fact; the public surface is one-request-argument wrappers, with the injectable seam reachable only from the sanctioned module. (A1/A2 accepted service discipline.) |
| **S-03** | Reads MUST re-prove stored facts against the accepted authorities and fail closed on divergence; a drifted row is never returned as valid and is **never repaired**. (RT-13.) |
| **S-04** | No B1 operation reads current consent to decide whether an *already-established real-world fact* may be recorded. Withdrawal is handled by conservative sensitivity in analysis, never by suppressing collected facts. (Rev 2 §6.D/§6.E.) **But** whether recording an occasion is itself *new collection* — which A2 §4 would serialize against withdrawal — depends on the creation event → **OPEN-1**. The rejected implementation assumed "internal processing" (A2's Case-C shape) without authority. |
| **S-05** | B1 exposes no count, aggregate, denominator, eligibility or effectiveness query. (D-04.) |

---

## 17. Trusted / hosted gate requirements

### 17.1 Confirmed gap

Hosted CI (`.github/workflows/ci.yml`, job `verify`) runs `lint`, `typecheck`, `test`, `corpus:validate`, `build`, `db:validate`, `db:migrate:check`, `format:check`. It provisions **no PostgreSQL service**, and the workflow says so: *"The real-Postgres integration suite (pnpm test:integration) runs locally against an ephemeral cluster, not in this offline CI."* `db:migrate:check` is a **string grep over migration SQL text** (`scripts/migrate-check.ts`): it proves that trigger and constraint *names* appear in the file, never that a live database enforces them.

This is the standing deferred item **P35A-06** ("CI does not automatically run real PostgreSQL"), accepted as open with the deadline "**before Wave 0**" (M3.5A report §30; A1 impl §N). It is therefore **not** a new finding — but its consequences are materially worse for B1 than for A1/A2.

### 17.2 Required acceptance rule (normative for the future implementation)

> **G-01** — For every invariant this specification classifies **MUST be DB-enforced** (§14), the **hosted required-check surface** MUST execute that invariant against **real PostgreSQL** and observe it fail on violation. An invariant whose enforcement is proven only by a text grep, or only by a locally-run suite, MUST be reclassified as **APP** or **AUDIT** and MUST NOT be described anywhere as database-enforced.
>
> **G-02** — B1 acceptance MUST NOT rest on `db:migrate:check`. Grepping for a trigger name cannot detect a trigger that is present but ineffective — the exact failure mode of the `^[0-9a-f]{64}$` digest CHECK (§15.3), which the grep guard reports as present and satisfied.
>
> **G-03** — The real-PostgreSQL suite MUST include the adversarial cases of §19, executed as the *attacker* would: direct SQL against the database, not through the repository.
>
> **G-04** — Consequently, **P35A-06 must be closed before B1 acceptance, not before Wave 0.** This is a *tightening* of an accepted deferral, adopted because B1 places its core identity invariants in triggers whose only proof is real PostgreSQL, whereas A1/A2 could rest on application-level and structural guarantees. Recorded as a change to accepted authority requiring ratification (**OPEN-10**).

No workflow is modified by this document.

---

## 18. Persistence model

**Partially specifiable.** Binding now:

| # | Rule |
| :-- | :-- |
| **P-01** | Additive only: no accepted M3.5A/A1/A2 table, enum, column, FK, index or trigger may be altered. Prisma virtual back-relations that add no SQL column are permitted (A2 V4 §20; SCI-A2-13). |
| **P-02** | Instants are `TIMESTAMPTZ(6)` (§12.2). |
| **P-03** | Money, if ever present, is integer céntimos and is provenance, never identity (A2 V4 conventions). B1 as specified stores none. |
| **P-04** | No column stores derived effectiveness, eligibility, exposure, contamination, count, or threshold status (D-04). |
| **P-05** | No column stores a heuristic natural key or any attribute-tuple uniqueness (§9.3). |
| **P-06** | `purchaseFingerprint`, if ever stored, MUST be research-safe and MUST NEVER contain sensitive payment identifiers (Rev 2 §6.A, verbatim). B1 as specified stores none — it is C-derived material (§12.3). |

The table shape itself is **BLOCKED** on OPEN-1/OPEN-3/OPEN-5/OPEN-9.

---

## 19. Test matrix

Tests derivable now. Those marked **(blocked)** cannot be written until §22 is ratified.

| # | Test | Type |
| :-- | :-- | :-- |
| T-01 | A finalized, non-invalidated intent with no real-world evidence yields **no** occasion | real PG |
| T-02 | Occasion count is **not** a function of finalized-intent count (A1 §20 regression) | real PG |
| T-03 | No natural/deterministic key exists: two occasions with identical participant/merchant/instant are representable | real PG |
| T-04 | An occasion whose origin intent is later invalidated is **not** deleted, mutated, or flagged (I-02) | real PG |
| T-05 | A replacement lineage `A→B` produces **no** occasion linkage change (I-01) | real PG |
| T-06 | UPDATE / DELETE / TRUNCATE on every B1 table is rejected **by direct SQL** | real PG, adversarial |
| T-07 | Forged receipt: a row carrying a victim's `(scope, key, requestHash)` and a foreign target, inserted **by direct SQL**, never redirects a legitimate retry (R-01/R-02) | real PG, adversarial |
| T-08 | Cross-table coherence trigger rejects every falsified identity fact, inserted **by direct SQL** | real PG, adversarial |
| T-09 | A `TIMESTAMPTZ(6)` value with a non-zero microsecond remainder round-trips through canonicalization without loss (T-03) | unit + real PG |
| T-10 | If a digest is retained: an arbitrary syntactically valid 64-hex digest is **rejected at INSERT** by direct SQL (§15.3) | real PG, adversarial |
| T-11 | Same key / same request replays; same key / different request conflicts; different key / same action aliases without re-sampling trusted time | real PG, concurrency |
| T-12 | Concurrent creation attempts converge without producing a receiptless durable fact | real PG, concurrency |
| T-13 | The named `participantId` projection resolves to exactly one participant and is covered by an explicit test (§10.1) | unit + real PG |
| T-14 | Capability/AST: no B1 module can import consent facts, evidence, or analysis modules (D-04) | unit |
| **(blocked)** | creation-event preconditions; duplicate-real-transaction collapse; multi-intent linkage; correction lineage | — |

---

## 20. Migration requirements

**BLOCKED** on the table shape (§18). Binding now: additive, forward-only, single transaction, literal (never dynamically generated) trigger names, and every DB-classified invariant of §14 proven by §19's adversarial real-PostgreSQL tests under G-01…G-03.

---

## 21. Disposition of the rejected implementation `a586b31`

Classification is by correct semantics, **not** by diff minimization.

| Part | Classification | Reason |
| :-- | :-- | :-- |
| **D-1** `UNIQUE(originIntentId)` as the identity boundary, plus `UNIQUE(originFinalizationId)` / `UNIQUE(originContextVersionId)` | **SEMANTICALLY INVALID** | §9.2. Makes real-world identity a function of app-capture identity; structurally forbids the one collapse RT-11 mandates. |
| **D-2** Materialization triggered by "finalized AND not invalidated" (`deriveIdentityFactsUnderLock`) | **SEMANTICALLY INVALID** | §8 / N-01. The precondition is expressible entirely over A2 rows, so the row records an app request, not a purchase. |
| **D-3** Naming the entity `PurchaseOccasion` while implementing the decision-occasion unit | **SEMANTICALLY INVALID** | §3 forbidden synonymy. This is what made the error invisible in review. |
| **D-4** Absence of any `participantId` field *or* named projection | **MUST BE REMEDIED** | §10.1 clause 4. The transitive relation via `assignmentId` is acceptable; the missing contract projection is not. |
| **D-5** `merchantId` / `intendedTransactionAt` lifted from the pinned A2 context version as *occasion* identity facts | **SEMANTICALLY INVALID** | §10.2. These are the *intended* merchant and time, not the real purchase's. |
| **D-6** `canonicalOccasionInstant` canonicalizing through JS `Date` | **MUST BE REMOVED** | §12.2 / T-03. Silently truncates `TIMESTAMPTZ(6)` microseconds. |
| **D-7** `identityDigest` column + `CHECK (~ '^[0-9a-f]{64}$')` | **MUST BE REMOVED** | §15.1 (not required by authority) and §15.3 (fail-open at the DB boundary; produces immutable corrupt rows). |
| **D-8** Append-only triggers on both B1 tables | **REUSABLE WITH MODIFICATION** | The pattern is correct and matches the accepted discipline — but it is conditional on OPEN-9 (a strictly append-only occasion can never carry `actualTransactionAt`/`purchaseFingerprint`). |
| **D-9** Cross-table INSERT coherence trigger (proving referenced rows cohere) | **REUSABLE WITH MODIFICATION** | The mechanism is exactly right and is the accepted A2 pattern; the *facts* it proves change with the identity model. Its invalidation-blocking clause is unproven (§14) → blocked on OPEN-1. |
| **D-10** Forged-receipt closure in `a586b31` (re-proving the receipt's target before returning it) | **REUSABLE — the one clearly correct semantic contribution** | §13.1 / R-01. It generalises into R-01/R-02. Note its current form re-proves via `originIntentId`, so it must be re-derived once cardinality changes. |
| **D-11** P2002 classification by field set, typed errors, fail-closed on unrecognised constraints | **REUSABLE UNCHANGED** | Matches accepted A2 §26 discipline. |
| **D-12** Trusted-context ownership checks, public/internal service split, module-capability AST tests | **REUSABLE UNCHANGED** | Matches accepted A1/A2 §27/§30 discipline. |
| **D-13** Root-lock-only concurrency (A2 Case-C shape), justified as "internal processing, no consent read" | **REUSABLE WITH MODIFICATION** | Correct *if* recording an occasion is internal processing over durable facts. Under Model B it may be new collection, which A2 §4 would serialize on `ExperimentAssignment` → blocked on OPEN-1 (S-04). |
| **D-14** `db:migrate:check` extensions grepping B1 trigger/constraint names | **REUSABLE BUT INSUFFICIENT** | §17 / G-02. A grep cannot detect a present-but-ineffective guard — precisely D-7's failure. |
| **D-15** Integration tests (`purchase-occasion.integration.test.ts`, `b1-staged-upgrade.integration.test.ts`) | **REUSABLE WITH MODIFICATION** | Structure and adversarial style are good; every assertion encoding D-1/D-2/D-5 must be deleted, and they must run in the hosted gate (G-01). |
| **D-16** Absence of any B1 specification document | **MUST BE REMEDIED** | AUTH-06. |

**Net:** the *engineering* substrate (receipt discipline, P2002 classification, capability boundary, trigger patterns, adversarial testing style) is sound and largely reusable. The *semantic* core — what the entity is, when it comes into existence, and what makes it unique — is invalid and must be re-derived, not repaired.

---

## 22. Decision Register — `B1 SPECIFICATION BLOCKED`

Each item below is a decision the accepted authority does not make. Recommendations are labelled **RECOMMENDATION (not authority)**.

### OPEN-1 — What event establishes that a real-world purchase attempt occurred?

* **Conflicting / insufficient authority:** Rev 2 §6.A requires a real-world attempt; the M3.5B decomposition assigns no phase the primitive that observes one. FINAL §21's `Outcome` (`attempted`/`self-reported`) is unassigned; Rev 2 §6.C names `WeeklyExposureReport`s and research reconciliation, which A1 impl §N places in the undivided B1/B2 bundle; `purchaseFingerprint` needs C-phase verified value.
* **Options:** (a) participant self-report of attempt/completion (VS1/VS2-class), owned by B; (b) `WeeklyExposureReport` reconciliation, owned by B; (c) C-phase evidence verification; (d) any of the above via a candidate→reconciled model (OPEN-3).
* **Measurement consequences:** (c) counts only verified purchases as occasions, biasing the denominator toward successes — forbidden by Rev 2 §6.D. (a) and (b) preserve Rev 2 §6.C's "app records **+** weekly reports/reconciliation".
* **Downstream:** determines the RIVSR denominator's construction (C2), the ≥3-occasion eligibility rule, and H-P0-01's opportunity count.
* **RECOMMENDATION (not authority):** (a)+(b) combined under a two-stage model — a participant-reported attempt or a weekly-report-reconciled purchase establishes the occasion; C-phase evidence only *enriches* it.

### OPEN-1b — May an occasion exist with no origin intent?

* **Conflict:** Rev 2 §6.A makes `createdFromIntentId` **required**; Rev 2 §6.C counts occasions established from weekly reports and research reconciliation — purchases made without the app, which have no intent. The frozen contract cannot represent them.
* **Options:** (a) make `createdFromIntentId` optional; (b) rule that §6.C's occasions are counted from `WeeklyExposureReport` aggregates and are not `PurchaseOccasion` rows; (c) mint a synthetic intent (rejected — manufactures app facts).
* **Consequences:** (b) means the denominator is computed from two different unit types, and `PurchaseOccasion` covers only app-mediated purchases — reintroducing the §4.1(4) bias at analysis level.
* **RECOMMENDATION (not authority):** (a). It is the minimal contract change and the only option that lets one unit carry the denominator.

### OPEN-2 — Where exactly does B1 end and B2 begin?

* **Insufficient authority:** AUTH-03 — every accepted text says "B" or "B1/B2".
* **Options:** (a) ratify B1 = identity allocation, B2 = reconciliation/exposure; (b) merge B1 and B2 into one phase B; (c) a different split.
* **Consequences:** under (a), §6.1 shows B1 needs reconciliation to establish identity, so (a) is only coherent together with OPEN-3.
* **RECOMMENDATION (not authority):** (b) or (a)+OPEN-3. (a) alone is incoherent.

### OPEN-3 — Is a two-stage candidate → reconciled identity model adopted?

* **Insufficient authority:** §7. Textual support exists for the three-level separation but no candidate entity is defined.
* **Options:** (a) adopt: an app-side intent-linked candidate observation, reconciled into a `PurchaseOccasion`; (b) reject and make B one phase that allocates identity only on established reality; (c) reject and defer all occasion identity to C.
* **Consequences:** (a) is the only option that keeps a B1 deliverable while satisfying §4.1; it expands the RT-11 contract (AUTH-04). (c) leaves B1 with nothing to build.
* **RECOMMENDATION (not authority):** (a), with the candidate explicitly **not** named `PurchaseOccasion` and explicitly excluded from every count.

### OPEN-4 — May one intent yield more than one occasion?
Options: permit / forbid / permit-only-after-adjudication. Forbidding re-imports the §9.2 defect in weaker form. **RECOMMENDATION (not authority):** permit, with ambiguity resolved conservatively toward one (Rev 2 §6.A).

### OPEN-5 — How is "two records, one real transaction" represented?
Options: (a) join table intent↔occasion; (b) canonical occasion + supporting observations; (c) append-only merge/adjudication record (closest to Rev 2 §6.A's "merge duplicates with an audit record"); (d) analysis-time projection only, with no persisted merge. (d) makes the persisted rows *not* occasions. **RECOMMENDATION (not authority):** (c), which fits both the frozen text and the append-only discipline.

### OPEN-6 — Failed attempt then retry; resumed purchase later — one occasion or two?
No text defines a windowing rule; `purchaseFingerprint`'s "coarse time-window" hints at one without specifying it. This is a pre-registered analysis parameter. **RECOMMENDATION (not authority):** define it in `AnalysisProtocol v1` (C2), not in B1, and have B1 record observations that let either rule be applied afterwards.

### OPEN-7 — Which merchant is the occasion's merchant?
Rev 2 §6.A requires `merchantId`; under Model B the real merchant may differ from the intended one (§10.2). Options: intended merchant (wrong by construction), observed merchant (requires OPEN-1), or both. **RECOMMENDATION (not authority):** observed, with the intended merchant left on the A2 row.

### OPEN-8 — What is the "occasion correction lineage"?
Named as B1/B2 work by A1 impl §N; defined nowhere. **RECOMMENDATION (not authority):** an append-only supersession record (never mutation), mirroring A2's invalidation-lineage shape, but explicitly **not** derived from it (I-01).

### OPEN-9 — Is the occasion row append-only, given late-arriving optional fields?
§12.3's trilemma. **RECOMMENDATION (not authority):** keep the occasion row strictly append-only and carry `actualTransactionAt` / `purchaseFingerprint` on separate append-only satellite records, preserving both the discipline and the frozen field semantics.

### OPEN-10 — Is P35A-06 (hosted real PostgreSQL) pulled forward to a B1 acceptance pre-condition?
§17 / G-04. This tightens an accepted deferral ("before Wave 0"). **RECOMMENDATION (not authority):** yes — B1's identity invariants are trigger-resident, and §15.3 demonstrates a text-grep gate reporting a fail-open guard as satisfied.

### OPEN-11 — Are the authority defects AUTH-01 / AUTH-02 / AUTH-03 repaired before the B1 gate?
Not a semantic question, but a gating one: B1 cannot be independently audited against an authority absent from the repository. **RECOMMENDATION (not authority):** commit the A2 effective spec chain, update `PAGAMENOS_SPEC_AUTHORITY.md` through A2, and record the ratified B1/B2 split — before any B1 implementation begins.

---

## 23. Forbidden interpretations

| # | Forbidden |
| :-- | :-- |
| **F-01** | Treating a finalized `PurchaseIntent` as a purchase occasion, under any name. |
| **F-02** | `UNIQUE(originIntentId)` — or any uniqueness making occasion identity a function of app-capture identity. |
| **F-03** | Any natural/deterministic key from merchant, time, or value; `occasionKey` was deleted by Rev 2 §8. |
| **F-04** | Inferring occasion merge or occasion lineage from the A2 invalidation/replacement lineage. |
| **F-05** | Deleting, mutating, or flagging an occasion because its origin intent was invalidated or the participant withdrew. |
| **F-06** | Any stored derived effectiveness, eligibility, exposure, contamination, count, denominator or threshold value. |
| **F-07** | Applying the "meaningful opportunity" economic threshold anywhere in B1. |
| **F-08** | Canonicalizing a stored instant through JavaScript `Date`. |
| **F-09** | Storing an immutable digest that only application code verifies. |
| **F-10** | Assuming an attacker cannot issue direct SQL when reasoning about database integrity. |
| **F-11** | Reading Rev 2 §8's replacement column as the complete `PurchaseOccasion` field list, thereby dropping `participantId`. |
| **F-12** | Treating the rejected implementation as authority because it exists, or reconciling this specification toward it to minimize a diff. |

---

## 24. Acceptance criteria

**A B1 implementation may be accepted only if ALL of the following hold.**

1. **OPEN-1, OPEN-1b, OPEN-2, OPEN-3, OPEN-5 and OPEN-9 have been ratified by a human semantic authority** and written into a V2 of this specification, which is then independently gated **before** any code.
2. AUTH-01, AUTH-02 and AUTH-03 are repaired (OPEN-11).
3. Every normative rule of §§4–20 that is not blocked is implemented and tested: D-01…D-06, N-01, I-01, I-02, T-01…T-03, R-01, R-02, S-01…S-05, P-01…P-06, and all of §23's prohibitions.
4. Every §14 **DB**-classified invariant is executed against **real PostgreSQL in the hosted required-check surface**, and each adversarial case of §19 is exercised by direct SQL (G-01…G-04).
5. No accepted M3.5A / A1 / A2 table, enum, column, FK, index or trigger is altered.
6. The implementation is preceded by a written, independently gated specification (AUTH-06 not repeated).
7. `AnalysisProtocol v1` remains UNFROZEN and untouched; no denominator, RIVSR, VS, threshold, or eligibility semantics are implemented.

---

# Final Verdict

## B1 SPECIFICATION BLOCKED — HUMAN SEMANTIC DECISION REQUIRED

The accepted authority **is** sufficient to settle what a `PurchaseOccasion` is (§4: Model B — an observed real-world occasion), to reject `UNIQUE(originIntentId)` and every attribute-derived key (§9), to fix the participant-relation ruling (§10), the invalidation/replacement rules (§11), the temporal and precision contract (§12), the receipt trust model (§13), the database-authority classification (§14), the digest ruling (§15), and the hosted-gate acceptance rule (§17).

It is **not** sufficient to fix the one thing B1 exists to do: name the event that brings a durable occasion identity into being. No accepted text assigns any phase a primitive that observes a real-world purchase attempt, and the frozen RT-11 contract contradicts itself on whether an occasion can exist without an origin intent. Choosing an answer would be creating authority, not deriving it.

**Do not reimplement B1 until §22 is ratified.** The rejected implementation is not the baseline; §21 records which of its parts may survive.

```
NO IMPLEMENTATION AUTHORIZATION.
B1 IMPLEMENTATION NOT AUTHORIZED.
B2 NOT OPENED.
C1/C2 NOT AUTHORIZED.
PRODUCTION PROTOCOL v1 UNFROZEN.
WAVE 0 NOT AUTHORIZED.
```

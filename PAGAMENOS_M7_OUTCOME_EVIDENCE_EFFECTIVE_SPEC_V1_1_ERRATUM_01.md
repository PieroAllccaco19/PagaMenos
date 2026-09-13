# PAGAMENOS — M7 — OUTCOME + EVIDENCE — EFFECTIVE SPECIFICATION V1.1 — ERRATUM 01 (IMPLEMENTATION READINESS)

```
AUTHOR CANDIDATE — NOT YET AUTHORITATIVE
NOT SELF-ACCEPTED — AWAITING INDEPENDENT AUDIT
M7 IMPLEMENTATION EXECUTION REMAINS PAUSED PENDING INDEPENDENT ACCEPTANCE AND PROTECTED INTEGRATION OF THIS ERRATUM

ERRATUM KIND                 : IMPLEMENTATION-READINESS ERRATUM (narrow, clause-scoped)
ACCEPTED SPEC BYTES EDITED   : NO
NEW CONSENT SEMANTICS        : 0
NEW A1 / A2 SEMANTICS        : 0
NEW B / C SEMANTICS          : 0
NEW TABLES / ENUMS / FUNCTIONS / CONSTRAINTS / INDEXES / TRIGGERS / VIEWS : 0
LOCKS ADDED / REMOVED / REORDERED : 0
SELECTOR ROTATION            : NOT PERFORMED
CCA IMPLEMENTATION AUTHORIZATION : NOT DECIDED BY THIS ERRATUM
```

**Revision.** Author revision **R2**. Candidate `e3fde238b376eab126ebb516b62ac0955c8b16e1` received `REQUIRES PATCH` (`E01-AUD-01`, `E01-AUD-02`); candidate `80879ef5f79defde11f3806115568ff3f5392d05` (R1) received `REQUIRES PATCH — ROUND 2`, with `E01-AUD-01` and `E01-AUD-02` independently CLOSED and one new finding, `E01-AUD-03`. Both earlier candidates are **superseded**: neither is accepted, pushed, or an ancestor of this revision. R2 makes the normalization domain of ER-01 exact — the manifest digest and the installing digest may occur only in the designated self-reference slots (MD-3, MD-4, MG-3), the author procedures validate that after computing the digest (MD-6, MG-6), and Lemma E01-L2 proves the author and verifier computations literally equal — and replaces one imprecise sentence about SHA-256 preimages. The digest formulas of MD-5 and MG-4, the placeholder `P` of MD-1 and the ALT-6 architecture are unchanged; the R1 repairs, ER-02…ER-05, BC-1…BC-6, LC-1…LC-7, D-13 and D-06 are unchanged; §13 records the disposition.

**Nature.** A documentation-only erratum candidate against the independently accepted M7 Outcome/Evidence Effective Specification V1.1. It amends **only** the clauses enumerated in §5–§9 of this document, and only in the way stated there. It changes no runtime code, Prisma schema, migration, test, workflow, `scripts-trusted/` file, `authority/` artifact, repository setting or external variable. It edits neither the accepted specification nor the root register.

**Conventions.** MUST / MUST NOT / MAY are normative. "V1.1 §n" = `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1.md` at the exact accepted bytes of §1.2. "Register §n" = `PAGAMENOS_SPEC_AUTHORITY.md` at the baseline of §1.1. "A2 §n" = `PAGAMENOS_M3_5B_A2_EFFECTIVE_SPEC_CANONICAL_V1.md`. "CCA §n" = `PAGAMENOS_A1_A2_M7_CONSENT_COMPATIBILITY_AMENDMENT_01.md`. Identifiers introduced here carry the prefix `E01-` or one of the rule families `MD-*`, `MG-*`, `BC-*`, `LC-*`; finding labels `ER-01…ER-05`, `D-13`, `D-06` and alternative labels `ALT-0…ALT-6` are local to this document. None collides with an identifier of V1.1 (full-text search of the accepted bytes returns zero matches for `E01-`, `MD-<digit>`, `MG-<digit>`, `BC-<digit>`, `LC-<digit>`, `ER-0`, `ALT-`).

---

## 1. Exact authority baseline

### 1.1 Protected authority tip

| Item | Value |
| :-- | :-- |
| Repository | `PieroAllccaco19/PagaMenos` |
| Protected surface | `origin/m3.5b-b-integration` |
| Baseline commit | `ca1be1bcbef7f6a98a0396d446816bf099075c40` (PR #18 merge, *"docs(authority): authorize M7 V1.1 implementation work"*) |
| Baseline tree | `e7e8426c818c8766d7b8284a4f77dbf628180dea` |
| Parents, in order | 1. `e7423b81edf11559d46d3bc595a491ab1a538ea6` — 2. `888b0390b431a3ab249a5dbe742ea0af1c9ece2e` |
| Lineage | this erratum candidate is a single commit whose only parent is the baseline commit |

Lifecycle authority at the baseline (Register §11.7), unchanged by this erratum:

```
M7 SPECIFICATION                    : ACCEPTED
M7 IMPLEMENTATION WORK              : AUTHORIZED — GATE 1 ONLY
M7 IMPLEMENTATION / RUNTIME         : NOT ACCEPTED — GATE 2 OPEN
M7 IMPLEMENTATION EXECUTED          : NO (none exists)
```

### 1.2 Controlling specification — exact accepted identity (not edited)

| Item | Value |
| :-- | :-- |
| Artifact | `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1.md` |
| Accepted candidate commit | `e4f6966df63a4ab575dfdf593819906db817d98b` |
| Git blob | `06e103b0d5e8cfcbb96ab21134d5605b0aae9b26` |
| SHA-256 | `457f51778fb5d5890b3e3478376e413072f15aef7da88125b5e78963f49394bd` |
| Protected integration | `f99a7e3080fdb99bd3917820d889d09694bed4af` (PR #16) |
| Independent verdict | `M7 EFFECTIVE SPEC V1.1 — INDEPENDENT SPECIFICATION ACCEPT` |
| Verified at the baseline | blob at `HEAD`, at `e4f6966…` and at `f99a7e3…` is `06e103b0…` in all three; `sha256sum` of the working file is `457f5177…`; 10 626 lines, 1 143 725 bytes |

The accepted bytes remain immutable. This erratum is read **beside** them: where a clause of §5–§9 below replaces or narrows an accepted clause, the replacement controls **for that clause only**, and only once this erratum is independently accepted and protected-integrated. Every clause not enumerated in §5–§9 is governed by the accepted bytes exactly as they are (§11).

### 1.3 Provenance of the findings

The findings were reported by the independently reviewed M7 V1.1 Implementation Master Plan. **That report is not authority and is not incorporated.** Every finding below was re-derived by this author directly from the accepted bytes (§1.2), the register at the baseline, and the repository tree at the baseline; the evidence used is cited per finding. A finding that could not be reproduced would be reported `NOT CONFIRMED` and would receive no amendment; none of the five named errata falls in that category. A second instance of the ER-02 stale count, in verification case T-08b, is folded into ER-02 (§6; closure history in §10.3).

---

## 2. Scope

### 2.1 In scope — normative deltas

| ID | Subject | Clauses amended |
| :-- | :-- | :-- |
| **ER-01** | manifest digest ↔ migration digest dependency cycle | V1.1 §23.3 (digest row), §23.4 (`database.migrationSha256`, `database.controlPlaneInstall` rows — derivation only), §19.13.4 (install-sequence comment — derivation only), §23.5 (last sentence — derivation only), §24.2 MA-1 (reproduction procedure named) |
| **ER-02** | stale five-credential / five-login-role cardinality | V1.1 §24.3, third bullet; V1.1 §25.2 row T-08b (cardinality only) |
| **ER-03** | PA-1 lock inventory | V1.1 §16.2.4 PA-1 row and consequence (b) |
| **ER-04** | meaning of `authority.baselineCommit` | V1.1 §23.4 (`authority` row — meaning of one field) |
| **ER-05** | MA-6 / selector rotation / Gate-2 lifecycle | V1.1 §24.2 MA-6; lifecycle event names for §23.7 and §24.2 |

### 2.2 In scope — classification only, no normative delta

| ID | Subject | Disposition |
| :-- | :-- | :-- |
| **D-13** | existing `authority-gate` four-file inventory vs a future M7 manifest | classified **downstream** (§9.1); no amendment |
| **D-06** | presigned staging URLs vs XC-6 signing-SDK ownership | classified: conforming path exists via `SERVER_MEDIATED` (§9.2); no amendment |

### 2.3 Explicitly out of scope

```
CCA IMPLEMENTATION AUTHORIZATION: NOT DECIDED BY THIS ERRATUM
```

The Implementation Master Plan reported that the A1/A2→M7 Consent Compatibility Amendment 01 runtime machinery is absent from the tree and that building it may touch accepted A1/A2 transaction-owner surfaces. Whether that work is authorized is an **authority-scope question**, not a textual defect of M7 V1.1. This erratum neither authorizes, forbids, schedules nor pre-conditions it; a separate explicit authority transition decides it if required. Nothing in this erratum may be cited as CCA implementation authorization.

Also out of scope: M7 implementation, the CCA engine, selector rotation, manifest authoring or publication, deployment, any change to `verify` or `authority-gate`, any change to `authority/`.

---

## 3. Summary of re-derived findings

| ID | Reported | Re-derived result | Amendment |
| :-- | :-- | :-- | :-- |
| ER-01 | manifest digest and migration digest depend on each other | **CONFIRMED** — two cycles, one through the migration, one inside the manifest itself (§5.1) | yes (§5) |
| ER-02 | §24.3 says "five" new credential names; §18.3 / IMP-03 enumerate a different set; T-08b says "five login roles … 9 × 5" | **CONFIRMED** — §18.3 defines six M7 database credential names and §18.2 six login roles; "five" is a stale pre-round-3 count in both §24.3 and T-08b (§6.1) | yes, wording/cardinality only (§6) |
| ER-03 | `study-protocol-repository.ts` takes `analysis_protocol FOR UPDATE`, omitted by PA-1 | **CONFIRMED** — PA-1's inventory is incomplete; the LG-THEOREM remains valid (§7) | yes, wording/inventory only (§7) |
| ER-04 | `authority.baselineCommit` meaning ambiguous | **CONFIRMED** — the field is named once and defined nowhere; at least five distinct commits fit its context (§8.1) | yes (§8) |
| ER-05 | MA-6 "after independent acceptance" vs rotation preceding Gate-2 acceptance | **CONFIRMED as an ambiguity** — the acceptance object is unnamed; one admissible reading is circular (§9.0) | yes (§9.0) |
| D-13 | gate enforces exact four-file inventory | **CONFIRMED as a fact**; **not** an M7 V1.1 contradiction (§9.1) | no — downstream |
| D-06 | presigned URL issuance vs XC-6 | **CONFIRMED as a tension for `PRESIGNED_PUT` only**; `SERVER_MEDIATED` conforms (§9.2) | no |

---

## 4. Reading rule for this erratum

1. The accepted V1.1 bytes are never edited. Before/after text below quotes the accepted bytes in the "Before" column — verbatim apart from Markdown table escaping (pipes escaped, and inline code backticks dropped where the whole row is quoted as one code span) — and gives the controlling replacement in the "After" column.
2. An "After" text controls only the clause it names. It does not re-open any neighbouring clause, identifier, count or proof.
3. Where this erratum adds a derivation rule (ER-01, ER-04) or a lifecycle name (ER-05), the rule constrains **how** an already-accepted quantity or event is determined; it adds no field, table, function, gate, prerequisite or test identifier.
4. If this erratum and the accepted bytes appear to conflict outside the enumerated clauses, the accepted bytes control and the conflict is an erratum defect to be reported, not resolved by interpretation.

---

## 5. ER-01 — manifest digest ↔ migration digest

### 5.1 Re-derivation

**Accepted clauses read.**

| Clause | Accepted text (verbatim excerpt) | Consequence |
| :-- | :-- | :-- |
| V1.1 §23.3, digest row | `manifestSha256 = 'sha256:' ‖ hex(sha256(utf8(canonical(manifest without the digest field))))` | `D := manifestSha256` is a function of **every** manifest member except "the digest field" |
| V1.1 §23.4, `database` row | fields include `migrationName`, `migrationSha256` | the manifest contains `migrationSha256` ⇒ `D` depends on `migrationSha256` |
| V1.1 §23.4, `database.controlPlaneInstall` row | "the exact literal arguments of the single `c_register_*` → `c_load_catalog_expectations_v1` → `c_activate_manifest_v1` sequence (§19.13.4)" | the manifest contains the arguments of `c_register_manifest_v1(<manifestVersion>, <manifestSha256>, …)` and `c_activate_manifest_v1(<manifestVersion>, <manifestSha256>)` ⇒ the manifest contains `D` as a member value |
| V1.1 §19.13.4 | "The migration contains exactly ONE such sequence, whose literal arguments equal the reviewed manifest's "database.controlPlaneInstall" object" with `SELECT m7.c_register_manifest_v1(<manifestVersion>, <manifestSha256>, ...);` and `SELECT m7.c_activate_manifest_v1(<manifestVersion>, <manifestSha256>);` | the migration bytes contain `D` as install literals |
| V1.1 §23.5, last sentence | "A manifest that binds a different `migrationSha256` than the migration actually installed is a mismatch, not a warning." | `migrationSha256` is the digest of the installed migration bytes, which contain `D` |
| V1.1 §24.2 MA-1 | "the manifest's own digest is reproducible from its published bytes" | the computation must be reproducible by a third party |
| V1.1 §19.11.2 `c_register_manifest_v1`, §19.4 `m7_control_plane_manifest` | `D` is **supplied** and stored (`CHECK ("manifestSha256" ~ '^sha256:[0-9a-f]{64}$')`); PostgreSQL never recomputes it | the install literal is load-bearing: it is the value §23.6 compares with the build and the environment |

**Referent defect.** §23.3 excludes "the digest field", singular, but §23.4's field table lists **no** member that holds the manifest's own digest. The only members named anywhere whose value is `D` are the two `p_manifest_sha256` argument slots inside `database.controlPlaneInstall`. The accepted text therefore does not say which member(s) "the digest field" denotes.

**Cycle C1 (inside the manifest).** If "the digest field" does not denote the `controlPlaneInstall` slots, then `D = H(… D …)`: the manifest digest is computed over content that contains the digest.

**Cycle C2 (through the migration).** Independently of C1: `D = H(canon(M))` where `M ∋ migrationSha256`; `migrationSha256 = H(B_mig)`; `B_mig ∋ D` (install literals). Hence `D = F(D)` for `F = H ∘ canon ∘ embed ∘ H ∘ embed`, a composition of two SHA-256 evaluations.

**Is it a real cryptographic cycle?** Yes. A conforming `(M, B_mig)` pair under the accepted text exists only if `F` has a fixed point that someone can find. For a function modelled as a random oracle into 2²⁵⁶ values, finding a fixed point (or even deciding whether one exists for given surrounding content) requires on the order of 2²⁵⁶ evaluations. **No feasible fixed point is assumed.** Therefore, read literally, the accepted text admits **no constructible conforming migration + manifest pair**: MA-1, MA-7 and §23.5 cannot all be satisfied. The planner's finding is **CONFIRMED**, and the in-manifest cycle C1 is an additional instance the planner did not state separately.

**What is not cyclic** (checked, so the correction can stay narrow): `database.functions[].prosrc` digests and the `c_load_catalog_expectations_v1` literal arrays (no function body in §19 contains a manifest-digest literal; every function that needs the control-plane digest receives it as a parameter, e.g. `p_manifest_sha256` of `c_register_manifest_v1` / `c_activate_manifest_v1` and the digest argument checked by `m7.i_assert_control_plane`); `backendSha256`, `profileSha256`, `policySha256`, `entriesSha256`, `vocabularySha256` (computed from their own inputs, §23.7 review row); `authority.specSha256` (fixed accepted bytes); `authority.baselineCommit` (an ancestor commit, §8); the environment value `M7_CONTROL_PLANE_MANIFEST_SHA256` and the embedded build copy (§23.6 — consumers of `D`, not inputs). Rotation manifests (§23.7) do not form C2, because the rotation script is not the migration and its digest is not a manifest field; they do form C1.

### 5.2 Security properties the correction must preserve

| # | Property | Source in accepted authority |
| :-- | :-- | :-- |
| E01-P1 | reproducible digests by an independent party | §23.3, §23.7 review row, MA-1, MA-9 |
| E01-P2 | exact-byte binding of the migration the manifest describes — **computational** binding under the stated SHA-256 second-preimage and collision-resistance assumption (§5.6 E01-C1), never a claim of hash injectivity | §19.1 ("its source digest is bound by the control-plane manifest"), §23.5 |
| E01-P3 | the manifest binds the intended migration identity (no **computationally feasible** substitution of a different migration under an unchanged `D` and `migrationSha256`) | §23.4, §23.5 |
| E01-P4 | the migration/install binds the independently reviewed control plane (`D` is installed literally and compared at runtime) | §19.13.4, §23.6 |
| E01-P5 | fail-closed mismatch detection | §23.5, §23.6 steps 1–2, IA-13 |
| E01-P6 | no candidate-selected machine authority; no selector inference | §24.1, MA-5, MA-6 |
| E01-P7 | no weakening of any MA gate; no hidden implementation convention | §24.2, §24.3 |

### 5.3 Candidate corrections considered

| Alt | Correction | E01-P1 | E01-P2/P3 | E01-P4 | Verdict |
| :-- | :-- | :-- | :-- | :-- | :-- |
| ALT-0 | keep the text; search for a SHA-256 fixed point | — | — | — | **refused**: infeasible (§5.1) |
| ALT-1 | exclude `database.migrationSha256` from the manifest digest input | yes | **no** — a different migration can be paired with the same `D`; the manifest no longer binds migration identity | yes | **refused** (violates E01-P3) |
| ALT-2 | remove the `D` literal from the migration by moving the `c_register_manifest_v1` / `c_activate_manifest_v1` calls to a separate script | yes | yes | **weakened** — §19.13.4's single in-migration sequence and the in-migration IA-13 final assertion (`M7_INSTALL: no active control-plane installation`) would no longer run in the one install transaction of §19.1 | **refused** (changes accepted install architecture; not narrow) |
| ALT-3 | store a placeholder instead of `D` in the manifest's `controlPlaneInstall` slots, substituting at install time | yes | yes | yes | **refused**: contradicts §23.4 "the **exact** literal arguments" and creates two representations of the same install sequence |
| ALT-4 | introduce a second digest (e.g. a "core" manifest digest plus an envelope digest) or a new field | yes | yes | yes | **refused**: changes the identity model of §23.2/§23.3 and the field set of §23.4 |
| ALT-5 | normalize **every** `sha256:<hex>` token in the migration before hashing | yes | **no** — the `c_load_catalog_expectations_v1` literal arrays carry `sourceSha256` values and the backend/profile registration literals carry digests; erasing them unbinds those bytes | yes | **refused** (violates E01-P2) |
| ALT-6 | **self-digest normalization**: in exactly two digest computations — the manifest's own digest and `migrationSha256` — every occurrence of the manifest's own digest `D` — which MD-4 and MG-3 confine to exactly the two designated self-reference slots — is replaced, byte for byte, by one fixed, published, non-digest placeholder token before hashing; the real bytes keep `D` | yes | yes, computationally (§5.6: E01-L1 exact inversion of the normalization + E01-C1 SHA-256 binding) | yes — `D` stays an install literal; a placeholder left in place fails closed at install | **adopted** |

**Why ALT-6 is the narrowest correction and is uniquely determined up to a constant.** Any acyclic repair must remove the edge `D → (input of D)` from both cycles. E01-P3 forbids cutting C2 at `migrationSha256 → D` (ALT-1). E01-P4 and the accepted install architecture forbid cutting it at `D → B_mig` by removing the literal (ALT-2). §23.4's "exact literal arguments" forbids cutting C1 by changing what the manifest stores (ALT-3). ALT-4 changes identities; ALT-5 unbinds other digests. The remaining cut — **the digest computations do not read the value `D` itself**, while the stored and installed bytes still carry it — is ALT-6. Within ALT-6 the only free choice is the placeholder constant, which carries no semantics; this erratum fixes it (MD-1), so no implementation convention remains.

### 5.4 Normative amendment — manifest digest (replaces the V1.1 §23.3 digest row)

| Before (V1.1 §23.3) | After (E01) |
| :-- | :-- |
| `\| digest \| manifestSha256 = 'sha256:' ‖ hex(sha256(utf8(canonical(manifest without the digest field)))) \|` | `\| digest \| computed by E01 MD-1…MD-7 \|` — the formula is retained with "the digest field" and the self-references made exact, as stated below |

- **MD-1 (placeholder).** `P` is the 71-byte ASCII string consisting of `sha256:` followed by sixty-four `x` characters (U+0078). `P` does not match `^sha256:[0-9a-f]{64}$`.
- **MD-2 (the digest field).** The manifest document is a JSON object `M` that MUST carry a top-level member named `manifestSha256`, whose value is the manifest digest `D`. "The digest field" of V1.1 §23.3 denotes exactly this member. `D` MUST match `^sha256:[0-9a-f]{64}$`.
- **MD-3 (designated self-reference slots).** The *designated self-reference slots* of a manifest are exactly two JSON values inside `database.controlPlaneInstall`: the literal argument recorded for parameter `p_manifest_sha256` of the single `m7.c_register_manifest_v1` call, and the literal argument recorded for parameter `p_manifest_sha256` of the single `m7.c_activate_manifest_v1` call, of the install sequence that `database.controlPlaneInstall` records (V1.1 §23.4). They are derived from the accepted bytes: V1.1 §19.13.4 contains exactly two `<manifestSha256>` arguments in its install sequence — `SELECT m7.c_register_manifest_v1(<manifestVersion>, <manifestSha256>, ...);` and `SELECT m7.c_activate_manifest_v1(<manifestVersion>, <manifestSha256>);` — and V1.1 §19.11.2 names the corresponding parameter `p_manifest_sha256` in both functions. No other slot is designated. Each designated slot MUST be a JSON string whose entire value is `D`. The representation of `database.controlPlaneInstall` is that of the reviewed manifest schema (V1.1 §23.4, `compatibility.manifestSchemaVersion`); whatever that representation is, a verifier MUST be able to identify these two values unambiguously, and a manifest in which it cannot is non-conforming.
- **MD-4 (exact occurrence conditions).** Let `C(M) = utf8(canonical(M without its top-level manifestSha256 member))`, using the accepted project serializer `src/persistence/canonical.ts` (V1.1 §23.3 format row, unchanged). A manifest is *conforming* only if all of the following hold:
  - (a) `P` does not occur anywhere in `C(M)` as a byte substring;
  - (b) the 71-byte string `D` occurs in `C(M)` **exactly twice**, and those two occurrences are exactly the contents of the two designated self-reference slots of MD-3 (the bytes between the quotation marks of each JSON string);
  - (c) consequently `D` occurs nowhere else in `C(M)` — not in any other value, not as a substring of any other JSON string, and not inside any JSON object member name at any depth.

  The top-level `manifestSha256` member of MD-2 is removed before `C(M)` is formed and is therefore not an occurrence in `C(M)`.
- **MD-5 (digest).** `D = 'sha256:' ‖ lowercase-hex(SHA-256(σ(C(M))))`, where `σ` replaces every occurrence of the 71-byte string `D` in `C(M)` by `P`. For a conforming manifest, `σ` replaces exactly the two designated slot contents and nothing else, and `σ(C(M)) = utf8(canonical(M°))` for the `M°` of MD-6 (Lemma E01-L2 (i)).
- **MD-6 (author procedure, with post-computation validation; fail closed).**
  1. Construct `M°`: the manifest content without a top-level `manifestSha256` member, with each of the two designated self-reference slots holding the JSON string `P`.
  2. Refuse unless `P` occurs in `utf8(canonical(M°))` exactly twice, exactly as the contents of the two designated slots.
  3. Compute `D = 'sha256:' ‖ lowercase-hex(SHA-256(utf8(canonical(M°))))`.
  4. Construct the candidate `M`: `M°` with each designated slot set to the JSON string `D`, plus the top-level member `manifestSha256: D`.
  5. Validate the candidate `M` against MD-2 and MD-4. If `D` occurs in `C(M)` anywhere other than the two designated slots — which can happen only if `M°` already contained the byte string `D` (Lemma E01-L2 (iii)) — the candidate manifest is **refused**. No fixed point is searched for, and the extra occurrence is **never** reinterpreted as a self-reference.
  6. Only a candidate that passes step 5 may be submitted for manifest review (LC-3). If authoring is retried after a refusal, the content of `M°` (and, where the manifest version changes, the migration template of MG-6, which also carries `manifestVersion`) is changed — for example by a fresh `manifestVersion` — and MD-6 is re-run from step 1. Such a retry happens before manifest acceptance and creates no exception to MD-7.
- **MD-7 (verifier procedure, fail closed).** Given published manifest bytes: parse; refuse unless MD-2 holds; compute `C(M)`; identify the two designated self-reference slots of MD-3 and refuse if either cannot be identified unambiguously, is not a JSON string, or is not exactly `D`; refuse unless MD-4 (a), (b) and (c) hold; recompute per MD-5; refuse unless the result equals the top-level `manifestSha256`. Any refusal is a mismatch, never a warning (V1.1 §23.5).

### 5.5 Normative amendment — migration digest (derivation of V1.1 §23.4 `database.migrationSha256`)

| Before (V1.1 §23.4, `database` row) | After (E01) |
| :-- | :-- |
| lists `migrationSha256` with no byte scope or computation | `migrationSha256` is computed by MG-1…MG-6; the field, its position and its role are unchanged |

- **MG-1 (bytes).** `B_mig` is the exact Git blob content, at the implementation candidate commit, of the single M7 migration script identified by `database.migrationName` (the one-transaction script of V1.1 §19.1–§19.13.4). No line-ending, encoding, whitespace or comment normalization is applied.
- **MG-2 (installing manifest).** The *installing manifest* of `B_mig` is the manifest whose `database.controlPlaneInstall` equals the install-sequence literals inside `B_mig`; let `D_inst` be its digest. For the initial install manifest, `D_inst = D`.
- **MG-3 (exact occurrence conditions).** The *designated migration spans* of `B_mig` are exactly two: the contents of the SQL string constant supplied as the `p_manifest_sha256` argument (the second argument) of the single top-level `SELECT m7.c_register_manifest_v1(...)` statement, and of the single top-level `SELECT m7.c_activate_manifest_v1(...)` statement, of the §19.13.4 install sequence in `B_mig`. These are the migration counterparts of the two `<manifestSha256>` arguments of V1.1 §19.13.4 and of the MD-3 slots; no other span is designated. `B_mig` is *conforming* only if all of the following hold:
  - (a) `P` does not occur anywhere in `B_mig`;
  - (b) each designated migration span is exactly `D_inst`;
  - (c) `D_inst` occurs in `B_mig` **exactly twice**, and those two occurrences are exactly the two designated migration spans;
  - (d) consequently `D_inst` occurs nowhere else in `B_mig`: not inside the body of any function created by `B_mig` (so no `prosrc`, and no `sourceSha256` in the expectation set, depends on `D_inst`), not in any comment, not in any other string constant, not in any `c_load_catalog_expectations_v1` or other expectation literal, not in any other digest or value, and not as a substring of any other byte sequence.
- **MG-4 (digest).** `migrationSha256 = 'sha256:' ‖ lowercase-hex(SHA-256(τ(B_mig)))`, where `τ` replaces every occurrence of the 71-byte string `D_inst` in `B_mig` by `P`. For a conforming `B_mig`, `τ` replaces exactly the two designated migration spans and nothing else, and `T := τ(B_mig)` is exactly the placeholder-first template `T0` of MG-6 (Lemma E01-L2 (ii)).
- **MG-5 (rotation manifests).** A manifest registered by a rotation (§23.7) describes an already-installed schema and MUST carry the same `migrationSha256` as the installing manifest, computed with that manifest's `D_inst`; its own digest is computed by MD-1…MD-7 with its own `D`.
- **MG-6 (author procedure, with post-computation validation; fail closed).**
  1. Author the placeholder-first template `T0`: the migration bytes with each designated migration span holding `P`.
  2. Refuse unless `P` occurs in `T0` exactly twice, exactly at the two designated migration spans, and nowhere else.
  3. Compute `migrationSha256 = 'sha256:' ‖ lowercase-hex(SHA-256(T0))` and place it in `M°` (MD-6 step 1).
  4. After `D_inst` is computed by MD-6 step 3, construct the candidate `B_mig`: `T0` with each designated migration span set to `D_inst`.
  5. Validate the candidate `B_mig` against MG-3. If `D_inst` occurs in `B_mig` anywhere other than the two designated spans — which can happen only if `T0` already contained the byte string `D_inst` (Lemma E01-L2 (iii)) — the candidate migration is **refused**. No fixed point is searched for, and the extra occurrence is never reinterpreted as a designated span.
  6. A retry after a refusal changes the content of `T0` or `M°` (for example by a fresh `manifestVersion`) and re-runs MG-6 and MD-6 from step 1, before manifest acceptance; it creates no exception to MG-3 or MG-4 verification.

  A verifier checks MG-3 and then MG-4; it never needs `T0` from the author, because `τ(B_mig)` reconstructs it exactly.

**Read-with notes (no text change).** V1.1 §19.13.4's comment "whose literal arguments equal the reviewed manifest's `database.controlPlaneInstall` object" and §23.5's "binds a different `migrationSha256` than the migration actually installed" are evaluated with MG-4. V1.1 §23.6 step 1 ("compute the digest of the embedded manifest") and the §23.7 review row ("reproduce `manifestSha256` from the published content") use MD-7. The raw file SHA-256 of `B_mig` (for example a migration tool's own checksum) is **not** `migrationSha256` and MUST NOT be substituted for it.

### 5.6 Proof — the corrected computation is acyclic and preserves the properties

**Before (accepted text read literally).**

```text
                   ┌──────────────── literal p_manifest_sha256 (§19.13.4) ────────────────┐
                   ▼                                                                       │
  B_mig ──SHA-256──▶ migrationSha256 ──member of──▶ M ──canonical, minus "digest field"──▶ D
                                                   ▲                                       │
                                                   └──── controlPlaneInstall literal ◀─────┘

  C2:  D → B_mig → migrationSha256 → M → D          (fixed point of SHA-256 ∘ … ∘ SHA-256)
  C1:  D → M → D                                    (self-loop, unless "the digest field" covered it; undefined)
  RESULT: cyclic — no constructible conforming (M, B_mig)
```

**After (E01 MD/MG).**

```text
  T0  := authored migration template: P exactly at the two designated migration spans (MG-3), P nowhere else, no D
  M°  := manifest content: P exactly at the two designated slots (MD-3), P nowhere else, no top-level manifestSha256
  T   := τ(B_mig), which equals T0 for every conforming B_mig (E01-L2 (ii))
  S   := accepted spec bytes, baselineCommit (§8), backend/profile/policy/vocabulary inputs,
         function bodies (D-free by MG-3 (d))

  S ─────────────────────────────────────────────┐
  function bodies ──SHA-256──▶ sourceSha256 ─────┤
  T0 ──SHA-256──▶ migrationSha256 ───────────────┼──▶ M° ──canonical──SHA-256──▶ D
                                                 │                               │
                                                 │           ┌─ 2 spans := D ────┤
                                                 │           ▼                   ▼
                                                 │   B_mig (= T0, 2 spans := D)  M  (= M°, 2 slots := D, + manifestSha256: D)
                                                 │           │                   │
                                                 │           └──▶ implementation candidate commit ◀── embedded M (§23.6)

  Topological order: S, function bodies, T0 → sourceSha256, migrationSha256 → M° → D → B_mig, M → candidate commit
  Verification identities (E01-L2): τ(B_mig) = T0 and σ(C(M)) = utf8(canonical(M°))
  No edge enters T0, M°, S or any function body from D.  RESULT: acyclic (a DAG)
```

**Theorem E01-T1 (acyclicity).** Every quantity in the "After" graph is computed from quantities earlier in the stated topological order. *Proof.* `T0` and `M°` contain `P` exactly at their two designated positions and contain no `D` (MG-6 steps 1–2, MD-6 steps 1–2; `D` does not yet exist when they are formed). `sourceSha256` values are over function bodies that contain no `D` (MG-3 (d)). `migrationSha256 = H(T0)` by MG-6 step 3, and this equals the verifier's `H(τ(B_mig))` because `τ(B_mig) = T0` (Lemma E01-L2 (ii)). `D = H(canonical(M°))` by MD-6 step 3, and this equals the verifier's `H(σ(C(M)))` because `σ(C(M)) = utf8(canonical(M°))` (Lemma E01-L2 (i)). `B_mig` and `M` are derived from `T0`, `M°` and `D`, and are admitted only after MG-6 step 5 and MD-6 step 5. No computation reads its own output. ∎

**Lemma E01-L1 (exact inversion of the self-digest normalization — combinatorial, no cryptographic assumption).** Let `X` be a byte string in which `P` does not occur, and `D` a string matching `^sha256:[0-9a-f]{64}$`. Then `Y = X[D→P]` determines `X` uniquely as `Y[P→D]`. *Proof.* Both `D` and `P` are 71 bytes long and contain the byte `s` exactly once, at offset 0 (`ha256:` contains no `s`; the tails are `[0-9a-f]` and `x`). (i) Occurrences of `D` in `X` cannot overlap: a second occurrence starting at offset `k ∈ [1, 70]` of the first would require the first's byte at `k` to be `s`. So `Y = X[D→P]` is well defined by replacing disjoint intervals. (ii) Every occurrence of `P` in `Y` starts at a replaced interval: let an occurrence start at `q`. If `[q, q+70]` meets no replaced interval, it is an occurrence of `P` in `X`, contradicting the hypothesis. Otherwise it meets a replaced interval starting at `r`; if `r < q ≤ r+70`, then `Y[q] = s` lies at a non-zero offset of that replaced `P`, impossible; if `q < r ≤ q+70`, then `Y[r] = s` lies at a non-zero offset of the occurrence starting at `q`, impossible; hence `q = r`. (iii) Therefore the occurrences of `P` in `Y` are exactly the replaced intervals, and replacing them back by `D` yields `X`. ∎

**Lemma E01-L2 (exact normalization domain; author and verifier computations are equal).** *(i)* For every manifest `M` satisfying MD-2…MD-4, let `M°` be `M` without its top-level `manifestSha256` member and with both designated slots set to `P`. Then `σ(C(M)) = utf8(canonical(M°))`. *(ii)* For every `B_mig` satisfying MG-3, let `T0` be `B_mig` with both designated migration spans set to `P`. Then `τ(B_mig) = T0`, and `T0` contains no occurrence of `D_inst` and contains `P` exactly at the two designated spans. *(iii)* Conversely, if the candidate `M` of MD-6 step 4 (respectively the candidate `B_mig` of MG-6 step 4) violates MD-4 (b)/(c) (respectively MG-3 (c)/(d)), then `M°` already contained the byte string `D` (respectively `T0` already contained `D_inst`). *Proof.* All byte strings involved are ASCII; `D`, `D_inst` and `P` are 71 bytes long and contain the byte `s` only at offset 0. (i) By MD-4 (b)/(c) the occurrences of `D` in `C(M)` are exactly the two slot contents, so `σ` rewrites exactly those two 71-byte spans. Replacing the ASCII content of a JSON string value by another ASCII string of equal length that needs no escaping changes neither the serializer's escaping, nor any member name, nor therefore the key order it emits; so the result is byte-for-byte the serialization of the value obtained by setting those two slots to `P`, which is `canonical(M°)`. (ii) By MG-3 (c)/(d) the occurrences of `D_inst` in `B_mig` are exactly the two designated spans, so `τ` rewrites exactly those spans, giving `T0`. `T0` contains no `D_inst`: the unreplaced bytes contained none, and an occurrence overlapping a rewritten span would place the byte `s` of either `D_inst` or `P` at a non-zero offset of the other, which is impossible; by MG-3 (a) and the same argument (E01-L1 (ii)), `P` occurs in `T0` exactly at the two spans. (iii) Setting two `P` spans to `D` creates no occurrence of `D` that overlaps a rewritten span except the rewritten spans themselves (same `s`-offset argument), so any further occurrence of `D` in the candidate lies entirely in bytes copied unchanged from `M°` (respectively `T0`). ∎

**Corollary E01-C1 (computational binding of the exact migration bytes; E01-P2, E01-P3).** Two distinct mechanisms are used and are not conflated: E01-L1 supplies **exact inversion of the normalization transform**; SHA-256 supplies **computational binding**.

1. *Exact inversion (E01-L1; no cryptographic assumption).* Fix the published digest `D` and the constant `P`. Call migration bytes `X` **conforming** when they satisfy MG-3 — in particular `P` does not occur in `X`. By E01-L1, `τ(X) = X[D→P]` satisfies `τ(X)[P→D] = X` for every conforming `X`; hence `τ` is **injective over conforming migration bytes**.
2. *Honest migration.* Let `B` be the honest migration and `T = τ(B)`; the manifest publishes `migrationSha256 = 'sha256:' ‖ hex(SHA-256(T))`.
3. *Any other conforming migration.* Let `B′` be conforming with `B′ ≠ B`. By step 1, `τ(B′) ≠ τ(B)`. For `B′` nevertheless to verify under MG-4 against the same published `migrationSha256`, it would have to satisfy `SHA-256(τ(B′)) = SHA-256(τ(B))` with `τ(B′) ≠ τ(B)`: a SHA-256 second preimage of `T` when `B` is fixed first, or a SHA-256 collision when the same party can choose both `B` and `B′`. Under the stated assumption that SHA-256 is second-preimage resistant and collision resistant, producing such a `B′` is **computationally infeasible**.
4. *Non-conforming bytes.* A `B′` that is not conforming — for example one in which a designated `D` literal was replaced by `P`, or one containing `D` anywhere outside the two designated spans — is refused by MG-3 before any digest comparison.
5. *Conclusion.* Under the stated assumption, the published manifest **cryptographically binds the exact migration bytes**, not merely a template.

**Not claimed.** This corollary does **not** claim that SHA-256 is injective, that a digest has a unique preimage, that `migrationSha256` mathematically determines one byte string, or any information-theoretic uniqueness. SHA-256 maps an unbounded input domain to a 256-bit codomain, so collisions necessarily exist; this erratum assumes neither injectivity nor that any particular digest has a unique preimage. Its security claim is computational second-preimage/collision resistance, not information-theoretic uniqueness. The same two-part structure applies to the manifest digest: E01-L1 and E01-L2 (i) make `σ` exactly invertible over conforming canonical manifests (MD-4), and SHA-256 computationally binds `D` to that content.

**Corollary E01-C2 (E01-P1, E01-P5).** MD-7 and MG-3/MG-4 are total, deterministic procedures over published bytes, using only the accepted serializer and SHA-256; each failure is a refusal.

**Corollary E01-C3 (E01-P4).** The migration still installs the literal `D` (MG-3(b)); runtime equality of build, environment and active installation (§23.6) is unchanged. An unsubstituted template cannot be installed by mistake: `c_register_manifest_v1` would insert `P` into `m7_control_plane_manifest`, whose `m7_control_plane_manifest_digest_ck` requires `^sha256:[0-9a-f]{64}$`, so the one install transaction aborts (§19.1).

**Corollary E01-C4 (E01-P6, E01-P7).** No selector, no authority-baseline commit and no candidate-chosen value enters either computation; MA-1…MA-18 are unchanged in content; MA-1 and MA-9 remain reproducibility gates, now over a defined procedure.

### 5.7 Normative amendment — MA-1 wording

| Before (V1.1 §24.2 MA-1) | After (E01) |
| :-- | :-- |
| the new authority-baseline commit contains the M7 control-plane manifest at a fixed path in `authority/`, and the manifest's own digest is reproducible from its published bytes | the new authority-baseline commit contains the M7 control-plane manifest at a fixed path in `authority/`, and the manifest's own digest is reproducible from its published bytes **by E01 MD-7**, and its `database.migrationSha256` is reproducible from the implementation candidate's migration bytes **by E01 MG-3/MG-4** |

---

## 6. ER-02 — stale five-credential / five-login-role cardinality (§24.3, T-08b)

### 6.1 Re-derivation

| Source | What it enumerates |
| :-- | :-- |
| V1.1 §18.3 table | six M7 database credential environment keys: `M7_PARTICIPANT_DATABASE_URL`, `M7_SESSION_ISSUER_DATABASE_URL`, `M7_PRIVACY_REQUEST_DATABASE_URL`, `M7_STORAGE_WORKER_DATABASE_URL`, `M7_DELETION_AUTHORITY_DATABASE_URL`, `M7_CAPABILITY_SIGNER_DATABASE_URL`; plus three credential **categories** that have no fixed environment-key name: the provider write-signing credentials, the owner-class control-plane rotation credential, and the per-storage-profile object-store credentials |
| V1.1 RS-7 (§18.1) | the same six `DATABASE_URL`s, "distinct … each loaded only by its owning module", plus the rotation credential |
| V1.1 §18.2 / §19.2 | seven roles = `pagamenos_m7_owner` + six login roles, one per credential |
| V1.1 IMP-03 | "The **six** M7 login credentials plus the owner-class rotation credential …; … the capability-signer credential pair (`M7_CAPABILITY_SIGNER_DATABASE_URL` and the provider write-signing secret)" |
| V1.1 §24.3, third bullet | "… extended to M7 modules, the **five** new credential names (§18.3) and the LO-3 function allowlist" |
| V1.1 §25.2, row T-08b | "each of the **five** login roles calls every `m7.c_*` function" with expected result "`42501` for all 9 × **5**"; the invariant it verifies is M7-I87 (RS-8) |
| V1.1 §19.14 / §19.14.1 | nine `c_*` functions — the factor 9 of T-08b is correct |
| V1.1 §25.1 VC-6 | "No case may be replaced by a count of other cases, and no required case may be marked "covered by" a different family" — so the sixth role cannot be left to another case family (T-171b, IA-14) |
| CCA (full-text search) | defines **no** `*_DATABASE_URL` name; all six names are introduced by M7 V1.1 |
| Non-authoritative history (evidence of cause only, never authority) | candidates `8e8140fd`, `de260504`, `20afa33c` enumerated five M7 credentials (no capability signer); `de260504` and `20afa33c` already carried the §24.3 sentence "the five new credential names (§18.3)"; candidate `bf65f309` (round 3) added `M7_CAPABILITY_SIGNER_DATABASE_URL` and changed IMP-03 to "six" but left §24.3 at "five", which the accepted round-5 bytes carry forward |

**CONFIRMED.** "five" is a stale count in both places: the §18.3 set is six names, and the §18.2 login-role set is six roles (`pagamenos_m7_participant_rt`, `pagamenos_m7_session_issuer_rt`, `pagamenos_m7_privacy_request_rt`, `pagamenos_m7_storage_worker_rt`, `pagamenos_m7_deletion_authority_rt`, `pagamenos_m7_capability_signer_rt`).

### 6.2 Normative amendment

| Before (V1.1 §24.3, third bullet) | After (E01) |
| :-- | :-- |
| - the capability/dependency-closure checks CCA §42–§43 already require, extended to M7 modules, the five new credential names (§18.3) and the LO-3 function allowlist; | - the capability/dependency-closure checks CCA §42–§43 already require, extended to M7 modules, the **six** new M7 database credential environment-key names of §18.3 (`M7_PARTICIPANT_DATABASE_URL`, `M7_SESSION_ISSUER_DATABASE_URL`, `M7_PRIVACY_REQUEST_DATABASE_URL`, `M7_STORAGE_WORKER_DATABASE_URL`, `M7_DELETION_AUTHORITY_DATABASE_URL`, `M7_CAPABILITY_SIGNER_DATABASE_URL`) and the LO-3 function allowlist; |

**T-08b — stale cardinality correction (existing case only).** The row is quoted in full from the accepted bytes; only the role count and the expected-result cardinality change, and the six role names are taken from the accepted §18.2 table.

Before (V1.1 §25.2, verbatim):

```text
| T-08b | **M7-I87: `c_*` has no login grantee (RS-8)** | — | — | each of the five login roles calls every `m7.c_*` function | `42501` for all 9 × 5 | unchanged | — | verifier `RS-8` row |
```

After (E01):

```text
| T-08b | **M7-I87: `c_*` has no login grantee (RS-8)** | — | — | each of the six login roles calls every `m7.c_*` function (the six login roles of §18.2: `pagamenos_m7_participant_rt`, `pagamenos_m7_session_issuer_rt`, `pagamenos_m7_privacy_request_rt`, `pagamenos_m7_storage_worker_rt`, `pagamenos_m7_deletion_authority_rt`, `pagamenos_m7_capability_signer_rt`) | `42501` for all 9 × 6 | unchanged | — | verifier `RS-8` row |
```

This correction creates no T-ID and deletes none; the ID remains `T-08b`; the invariant it verifies (M7-I87), its remaining columns, RS-8, and every function or role grant are unchanged. The distinct T-ID total remains **209**.

**Categories distinguished, not re-scoped.** The §24.3 correction concerns the category *database role credentials with a named environment key* (six). The provider write-signing credentials (XC-3, XC-5, XC-7; IMP-03, IMP-17, IMP-18, IMP-20; T-171b, T-171c), the owner-class rotation credential (§18.3; IMP-03) and the per-profile object-store credentials (XC-1, XC-2; IMP-04) are separate categories governed by their existing clauses; this correction neither adds them to nor removes them from the §24.3 bullet, and changes no credential-separation rule.

**Mechanical consistency after correction.** §18.3 (6 names) = RS-7 (6) = login roles of §18.2 (6) = IMP-03 (six) = §24.3 (six) = T-08b (six roles; 9 × 6 denials).

---

## 7. ER-03 — PA-1 lock inventory

### 7.1 Re-derivation

**Reproducible search** (run at the baseline tree):

```bash
grep -rniE "for (update|share|no key update|key share)|nowait|skip locked|pg_advisory|LOCK TABLE" src prisma scripts --include=*.ts --include=*.sql --include=*.cjs --include=*.mjs
```

Runtime (non-test) explicit row-lock sites found:

| File:line | Lock | Owner |
| :-- | :-- | :-- |
| `src/db/study-consent-repository.ts:105` | `experiment_assignment FOR UPDATE` | A1 consent |
| `src/db/purchase-intent-repository.ts:1016` | `experiment_assignment FOR UPDATE` | A2 |
| `src/db/purchase-intent-repository.ts:1026` | `purchase_intent FOR UPDATE` (after the assignment) | A2 |
| `src/db/purchase-intent-decision-repository.ts:487` | `purchase_intent FOR UPDATE` (Case-C, without the assignment) | A2 |
| **`src/db/study-protocol-repository.ts:262`** | **`analysis_protocol FOR UPDATE`** | **A1 AnalysisProtocol freeze** |

No advisory lock, `LOCK TABLE`, `NOWAIT` or `SKIP LOCKED` exists in accepted source. The only other matches are comments and `src/db/purchase-intent.integration.test.ts` (test harness sessions that deliberately hold assignment / intent locks to prove blocking); test code is not an accepted runtime transaction and is not part of the deployed wait graph.

**CONFIRMED.** PA-1's statement "accepted A1 and A2 code issues explicit row locks **only** on `public.experiment_assignment` … and `public.purchase_intent`" is a false exhaustive claim.

**Transactions that touch `analysis_protocol`** (source inspection at the baseline):

| Transaction | Requests |
| :-- | :-- |
| A1 freeze — `AnalysisProtocolRepository.freeze` (`study-protocol-repository.ts`, the `$transaction` beginning after line 246) | explicit `analysis_protocol FOR UPDATE` on one row; plain reads of `analysis_protocol_command_receipt`; possibly `INSERT` into `analysis_protocol_command_receipt` (implicit `FOR KEY SHARE` on the `analysis_protocol` row it already holds; unique-key wait only against another A1 protocol-receipt insertion); `UPDATE` of the held `analysis_protocol` row; plain read |
| A1 experiment creation — `study-experiment-repository.ts` `create` | `INSERT` into `experiment` (implicit `FOR KEY SHARE` on `analysis_protocol` via `experiment_frozenProtocolId_fkey`, and a plain read in trigger `experiment_requires_frozen_protocol`); `INSERT` into `experiment_create_receipt`; unique-key waits only against other experiment creations |
| A1 protocol registration | inserts `analysis_protocol` and its receipt; no lock on an existing row of any other relation |

None of these transactions reads with a locking clause, inserts a row referencing, updates, or deletes any row of `experiment_assignment`, `study_participant`, `study_consent_event`, `purchase_intent`, `purchase_intent_capture_token`, `purchase_intent_decision_request`, `purchase_intent_decision_binding` or any `m7` relation.

**Can the additional lock participate in the M7 wait-for graph?** No:

- **E01-PO-1 (M7 never requests it).** The accepted V1.1 bytes name exactly seven `public` relations as objects M7 reads or references (`study_participant`, `experiment_assignment`, `study_consent_event`, `purchase_intent_capture_token`, `purchase_intent`, `purchase_intent_decision_request`, `purchase_intent_decision_binding`), plus `public.decision_snapshot` in the §6.1 lineage diagram only and four attacker-created shadow functions in adversarial case T-75; full-text search for `analysis_protocol`, `analysis_protocol_command_receipt`, `experiment_create_receipt` and `public.experiment` (other than `public.experiment_assignment`) returns **no** match. Every `m7` foreign key onto `public` targets one of `study_participant`, `experiment_assignment`, `study_consent_event`, `purchase_intent_decision_binding`. §19.2 grants `pagamenos_m7_owner` `SELECT` on the seven relations only, `REFERENCES` on four and `UPDATE("id")` only on `experiment_assignment`; PostgreSQL requires `UPDATE` privilege for any row-locking clause and `REFERENCES` to create a foreign key, so an M7 definer function cannot take, explicitly or implicitly, any lock on `analysis_protocol`, `experiment` or their receipt tables. The exact-set catalog verification (IA-09…IA-11) keeps it so.
- **E01-PO-2 (its holders never wait on M7).** The A1 transactions that lock `analysis_protocol` (table above) request no lock on any row an M7 transaction can hold (M7 holds locks only on `m7` rows and, per V1.1 table C, on `experiment_assignment`, `study_participant`, `study_consent_event`, `purchase_intent_decision_binding`). Every wait they can perform is on an A1 holder.

Hence the `analysis_protocol` edges lie entirely inside the A1/A2 sub-graph, and V1.1 §16.2.4 consequence (b) — *"an A1/A2 transaction that holds any lock can wait only on A1/A2 transactions"* — remains true. Consequences (a), (c), step (2) of the LG-THEOREM proof, tables IW, C and LV, Lemma Q, LG-1…LG-10, and every lock order are **unaffected**, because no M7 request on any relation is added or changed. **The LG-THEOREM remains valid** under the corrected premise.

### 7.2 Normative amendment

| Before (V1.1 §16.2.4, PA-1 row) | After (E01) |
| :-- | :-- |
| `\| **PA-1** \| accepted A1 and A2 code issues explicit row locks only on public.experiment_assignment (FOR UPDATE, as the first lock of its transaction) and public.purchase_intent (FOR UPDATE; the A2 Case-C decision freeze takes it **without** the assignment) \| full-text search of src/ for locking clauses \|` | `\| **PA-1** \| accepted A1 and A2 runtime code issues explicit row locks only on (i) public.experiment_assignment (FOR UPDATE, as the first lock of its transaction), (ii) public.purchase_intent (FOR UPDATE; the A2 Case-C decision freeze takes it **without** the assignment), and (iii) public.analysis_protocol (FOR UPDATE, by the A1 AnalysisProtocol freeze, which takes no lock on, and inserts no row referencing, any relation named in table C or any m7 relation). No M7 function requests any lock, explicit or implicit, on analysis_protocol, analysis_protocol_command_receipt, experiment or experiment_create_receipt (§19.2 grants; E01-PO-1) \| full-text search of non-test src/ for locking clauses (E01 §7.1), and source inspection of the transactions touching analysis_protocol \|` |

| Before (V1.1 §16.2.4, consequence (b), first clause) | After (E01) |
| :-- | :-- |
| **(b)** An A1/A2 transaction that holds any lock can wait only on A1/A2 transactions: its explicit waits are on `purchase_intent` (held only by A2) and its implicit waits are on rows it holds, on A2-held `purchase_intent` rows, or on A1/A2 unique keys (PA-1, PA-2, PA-4). | **(b)** An A1/A2 transaction that holds any lock can wait only on A1/A2 transactions: its explicit waits are on `purchase_intent` (held only by A2) or on `analysis_protocol` (held only by the A1 AnalysisProtocol freeze), and its implicit waits are on rows it holds, on A2-held `purchase_intent` rows, on A1-held `analysis_protocol` rows, or on A1/A2 unique keys (PA-1, PA-2, PA-4). |

The remainder of consequence (b), consequences (a) and (c), the concluding sentence, and PA-2, PA-3, PA-4 are unchanged. **No A1/A2 code or lock behaviour is altered; no lock is added, removed or reordered.**

---

## 8. ER-04 — `authority.baselineCommit`

### 8.1 Re-derivation

`baselineCommit` occurs **once** in the accepted bytes, in the V1.1 §23.4 `authority` row, whose "Bound to" column reads *"the accepted M7 specification and the register entry that accepted it"*. No clause defines which commit it is or when it is fixed. Commits that fit that context equally well at the baseline:

| Candidate reading | Commit (today) | Why it fits | Why it is not uniquely implied |
| :-- | :-- | :-- | :-- |
| specification authoring baseline | `8990ae0…` (V1.1 §1.1 "Baseline commit") | same phrase "Baseline commit" | predates acceptance; contains neither the accepted bytes nor the accepting register entry |
| specification protected integration | `f99a7e3…` | contains the accepted bytes | does not contain the accepting register entry (§10 was integrated later, `e7423b8…`) |
| register acceptance integration | `e7423b8…` | contains bytes + accepting entry | ignores the Gate-1 transition and any later erratum |
| implementation-authorization baseline | `ca1be1b…` | tip when Gate 1 was granted | would silently exclude any erratum (including this one) integrated before implementation |
| implementation candidate / its parent / final protected integration / authority-baseline commit / selector value | — | "baseline" is used for each elsewhere | each is either not fixed when the manifest is authored, or its identity depends on the manifest bytes (cycle), or it is machine authority |

**CONFIRMED — genuinely ambiguous.** The choice matters: the manifest's `authority` group is the only place that binds the manifest to documentation authority, and specification errata (such as this one) are documentation authority that `specSha256` alone does not name.

### 8.2 Normative amendment — meaning of `authority.baselineCommit`

| Before (V1.1 §23.4, `authority` row) | After (E01) |
| :-- | :-- |
| `\| authority \| specArtifactPath, specSha256, specAcceptanceVerdict, registerSection, baselineCommit \| the accepted M7 specification and the register entry that accepted it \|` | unchanged field list and "Bound to" column; **`baselineCommit` has exactly the meaning of E01 BC-1…BC-6** |

- **BC-1 (meaning).** `authority.baselineCommit` is the full 40-hexadecimal Git commit identifier of the **documentation-authority baseline of the implementation candidate the manifest describes**: the commit of the protected documentation-authority surface `origin/m3.5b-b-integration` whose documentation authority — accepted specification bytes, register, and accepted errata to that specification — the implementation candidate incorporates.
- **BC-2 (derivation).** Let `C` be the implementation candidate commit fixed at lifecycle event **LC-1** (§9.0). `baselineCommit` is the unique commit `B` such that (a) `B` lies on the first-parent chain of `origin/m3.5b-b-integration`; (b) `B` is an ancestor of `C` (`git merge-base --is-ancestor B C` succeeds) and `B ≠ C`; and (c) no commit that is a first-parent descendant of `B` on that chain satisfies (b). Reproduction: walk `git rev-list --first-parent origin/m3.5b-b-integration` newest-first and take the first commit that is a proper ancestor of `C`.
- **BC-3 (fixing point and stability).** The value is determined when `C` is fixed (LC-1), is verified at manifest review (LC-3), and is immutable thereafter as part of the accepted manifest bytes (§23.3). BC-2 is time-invariant under the premise, recorded by every protected-integration entry of the register (merge parents listed in order), that the protected surface advances only by merge commits whose first parent is the prior tip and is never rewritten. If that premise is observed to be false, reproduction fails closed and the manifest is not accepted on that basis. Protected authority transitions or errata integrated **before** `C` is fixed are reflected automatically when the candidate incorporates them (for example by being based on, or merging, a later protected tip); transitions integrated after `C` is fixed do not change the value.
- **BC-4 (content conditions; checked at LC-3).** `B`'s tree MUST contain (a) the file at `authority.specArtifactPath` whose SHA-256 equals `authority.specSha256`; (b) a `PAGAMENOS_SPEC_AUTHORITY.md` whose section named by `authority.registerSection` records `authority.specAcceptanceVerdict` for those bytes; and (c) every erratum to that specification that the register in `B` records as independently accepted and protected-integrated.
- **BC-5 (currency; checked at LC-3, for the manifest reviewed toward Gate-2 acceptance of an implementation candidate).** If, at LC-3, the register at the tip of the protected surface records an independently accepted and protected-integrated erratum to the M7 V1.1 specification that `B` does not contain, the candidate was not built against current specification authority (Register §11.1: authorization extends only to implementation conforming to the accepted specification) and the manifest MUST NOT be accepted until a candidate incorporating it is produced. Protected transitions that are not M7 V1.1 errata do not trigger BC-5. BC-5 does not decide rotation manifests for an implementation already accepted under Gate 2, which are outside this erratum.
- **BC-6 (exclusions).** `baselineCommit` is **not**: the specification authoring baseline as such (V1.1 §1.1); the implementation-authorization merge as such; the implementation candidate `C` or any commit of the candidate branch that is not on the protected first-parent chain; the implementation candidate's parent as such; the final protected integration commit of the implementation; the machine-readable authority-baseline commit that publishes the manifest; or the value of `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA`. It MUST NOT be read as, compared with, or used to infer or select any machine-authority commit or selector value. It may **coincide in value** with the specification authoring baseline, the implementation-authorization merge or the candidate's parent (for example, a candidate branched from `ca1be1b…` with no later protected commit incorporated yields `ca1be1b…`), but that coincidence is an outcome of BC-2, not its definition. `ca1be1b…` is **not** hard-coded.

**Why BC-1…BC-6 are acyclic and security-preserving.** `B` is a proper ancestor of `C` on the documentation surface, so `B`'s identity does not depend on `C`, on the manifest bytes, on the migration, or on any machine-authority commit (the authority-baseline commit that publishes the manifest, and the final integration commit, both contain the manifest and are excluded). Because a Git commit identifier transitively names its tree through Git's object hash, `B` computationally binds (under that hash's collision resistance, with no injectivity claim) the manifest to the exact specification bytes, register text and errata the implementation was built against — which `specSha256` alone cannot do once an erratum exists — without adding a field (V1.1 §23.4 unchanged). `B` is derived, not chosen: the candidate cannot select a stale base without failing BC-5, and cannot select machine authority at all (BC-6). BC-2 is consistent with Register §11.3, which requires implementation work to start from a fresh branch created from the then-current protected tip.

---

## 9. ER-05 — MA-6, selector rotation and Gate-2 lifecycle

### 9.0 Re-derivation, amendment and proof

**Accepted text read.**

| Clause | Text | Reading |
| :-- | :-- | :-- |
| V1.1 §24.2 heading | "What a later rotation must prove **before M7 implementation can be accepted**" | rotation and its proofs **precede** implementation acceptance |
| V1.1 §24.2 MA-6 | "the selector rotation happens **after** independent acceptance, by a privileged owner, with no force-moved tag, no branch-as-authority, and no candidate-chosen base (A2 §34.1 step 8)" | the object of "independent acceptance" is **not named** |
| A2 §34.1 step 8 (cited) | "a new independently reviewed additive authority commit, a new full SHA, and a privileged CI-variable rotation AFTER acceptance" | acceptance **of the authority commit's contents** |
| V1.1 §23.7 review / publication rows | manifest reviewed independently; published only in `authority/` of an accepted authority-baseline commit | manifest review and publication are distinct steps |
| Register §10.2, §11.2 | separate stages: Gate 2 implementation/runtime acceptance; machine-readable authority publication / selector rotation | never collapsed |
| Register §10.8 | restates MA-6 as "the rotation occurs after independent acceptance by a privileged owner" **without** the A2 citation | the ambiguity is carried into the register |
| Register §11.4 | Gate 2 remains open until, among others, "selector rotation where required (MA-5, MA-6)" | rotation is an **input** to Gate 2 |

**Finding.** Read with its A2 citation, MA-6 means acceptance of the additive authority commit, and is not contradictory. Read with "independent acceptance" as the M7 implementation acceptance — the M7 document's own use of the phrase for the specification (MA-2) and the register's use for Gate 2 — MA-6 requires Gate 2 before rotation while §24.2 and Register §11.4 require rotation before Gate 2: **circular**. Because the object is unnamed and the register restates it without the citation, the ambiguity is **CONFIRMED** and is removed normatively below.

**LC — lifecycle events (names are normative; each is a distinct event and none is called merely "acceptance").**

| # | Event | Object | Performed by | Preconditions | Produces |
| :-- | :-- | :-- | :-- | :-- | :-- |
| **LC-1** | **IMPLEMENTATION CANDIDATE COMPLETION** | an implementation candidate commit `C` whose migration bytes and embedded manifest bytes are fixed | implementer | Gate 1 (Register §11) | `C`; `D` and `migrationSha256` per MD/MG; `baselineCommit` per BC-2. **Not an acceptance** |
| **LC-2** | **PRE-PUBLICATION TECHNICAL VERIFICATION** | `C` | independent verifier | LC-1 | findings only. **Not required as a separate stage by accepted authority and not added by this erratum**; permitted; confers no acceptance and satisfies no Gate-2 item by itself |
| **LC-3** | **MANIFEST INDEPENDENT REVIEW AND ACCEPTANCE** | the exact manifest bytes (digest `D`) describing `C` | independent reviewer, independent of the implementation (V1.1 §23.7) | LC-1 | a verdict naming the manifest version and digest; reproduction of MD-7, MG-3/MG-4, the §23.7 digests, BC-2, BC-4, BC-5. **Accepts the manifest as a description; does not accept the implementation** |
| **LC-4** | **MACHINE-READABLE AUTHORITY PUBLICATION** | an additive authority-baseline commit `A` containing the LC-3-accepted manifest bytes unchanged at a fixed `authority/` path | publisher, with independent review of `A` (A2 §34.1 step 8; MA-1, MA-3) | LC-3 | `A` (full SHA). **Not a rotation; not an implementation acceptance** |
| **LC-5** | **PRIVILEGED SELECTOR ROTATION** | `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA := A` | privileged owner, outside any candidate change | LC-3 and LC-4 | the rotated selector. **Not authorized by this erratum** |
| **LC-6** | **POST-ROTATION MA VERIFICATION** | `C` unchanged, verified against the rotated selector | independent verifier | LC-5 | MA-1…MA-18 demonstrated with the selector equal to `A` (including MA-6 as a fact about LC-5 and MA-8's CI behaviour). MA items whose subject exists earlier MAY also be checked earlier; the LC-6 demonstration is the one Gate 2 relies on |
| **LC-7** | **GATE-2 M7 IMPLEMENTATION / RUNTIME ACCEPTANCE** | `C` (exact bytes) | independent auditor | LC-6, and every other Gate-2 condition of Register §10.7 / §11.4 (IMP-01…IMP-22, §24.3 CI additions, real-PostgreSQL / real-provider / real-deployment verification, conditional closures) | Gate 2 verdict. The only event that accepts the implementation |

**Verdict naming (normative).** A verdict recorded for LC-3, LC-4 or LC-7 MUST name its event and its object (for example "M7 control-plane manifest `<manifestVersion>` `<D>` — independent manifest acceptance"; "authority-baseline commit `<A>` — independent publication review"; "M7 implementation `<C>` — Gate 2 implementation/runtime acceptance"). The bare words "accepted" or "acceptance" without the event name MUST NOT be used for any of them. LC-5 is not a verdict.

**Normative amendment of MA-6.**

| Before (V1.1 §24.2 MA-6) | After (E01) |
| :-- | :-- |
| `\| MA-6 \| the selector rotation happens **after** independent acceptance, by a privileged owner, with no force-moved tag, no branch-as-authority, and no candidate-chosen base (A2 §34.1 step 8) \|` | `\| MA-6 \| the selector rotation (E01 LC-5) happens only **after** the manifest's independent review and acceptance (E01 LC-3) and the independent review of the additive authority-baseline commit that publishes it (E01 LC-4, A2 §34.1 step 8), by a privileged owner, with no force-moved tag, no branch-as-authority, and no candidate-chosen base. The rotation neither requires nor implies Gate-2 implementation/runtime acceptance (E01 LC-7), which it precedes \|` |

**Proof E01-T2 (the lifecycle is acyclic).** The precondition relation of the LC table is: LC-1 ← Gate 1; LC-2 ← LC-1; LC-3 ← LC-1; LC-4 ← LC-3; LC-5 ← LC-3, LC-4; LC-6 ← LC-5; LC-7 ← LC-6 (+ Gate-2 conditions that do not depend on LC-7). Every edge points from a higher to a strictly lower index, so the relation is a DAG with topological order LC-1 < LC-3 < LC-4 < LC-5 < LC-6 < LC-7 (LC-2 optional, between LC-1 and LC-4). LC-7 is a precondition of no event, so no reading of MA-6 can require Gate 2 before rotation. ∎

**Consequences (restating existing rules, adding no gate).** If LC-7 is refused after LC-5, nothing is un-published or un-rotated: `A` remains immutable history (A2 additivity, MA-3), and a corrected candidate `C′` requires a new manifest version and digest (V1.1 §23.3 immutability), followed by LC-3…LC-7 again. Publication and rotation authorize no deployment, Wave 0 or runtime use (Register §6.1, §11.2). This erratum performs none of LC-1…LC-7.

```
SELECTOR ROTATION: NOT PERFORMED
SELECTOR ROTATION AUTHORIZED BY THIS ERRATUM: NO
```

### 9.1 D-13 — `authority-gate` inventory: classification

**Facts at the baseline.** `.github/workflows/ci.yml` job `authority-gate` reads `authority/v1/AUTHORITY_BASELINE_MANIFEST_V1.json` at `vars.PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA` and fails unless its `authorityFiles` array equals exactly the four paths `authority/v1/AUTHORITY_BASELINE_MANIFEST_V1.json`, `authority/v1/CORPUS_RELEASE_LEDGER_V1.json`, `authority/v1/HOLIDAY_CALENDAR_REGISTRY_V1.json`, `authority/v1/holiday-calendar/pagamenos.holiday.pe-lima-callao.private-commerce.v1.json` (no missing, extra or duplicate entries). `.github/workflows/trusted-a2-authority.yml` carries the same four-path `REQUIRED_AUTHORITY_FILES` constant for pull requests into `m3.5b-a2-integration`. Neither gate enumerates the `authority/` tree itself; both check the declared inventory. **CONFIRMED as a fact.**

**Analysis.** V1.1 requires the manifest "at a fixed path in `authority/`" (MA-1), requires that `verify` and `authority-gate` "remain exactly as accepted" and that M7 **add** gates (§24.3), and requires MA-3 additivity. V1.1 does **not** require the M7 manifest to be listed in `AUTHORITY_BASELINE_MANIFEST_V1.authorityFiles`, does not fix the path, and does not require changing either existing gate. Whether the M7 manifest is carried inside the existing baseline manifest's inventory (which the unchanged gates would reject) or beside it under a separate, additive M7 gate (MA-8) is a choice about machine-readable authority layout and CI, decided at LC-4 and in the §24.3 gate additions — not a contradiction inside V1.1.

**Classification.** **Downstream implementation / control-plane compatibility task**, outside this erratum's normative delta. If the chosen layout requires the existing four-file inventory to change, that change is a **separate machine-readable-authority / workflow amendment** under its own authority (A2 §34, Register §2.4), not an M7 specification erratum. No M7 V1.1 amendment is required now. The gate, `authority/` and the selector are not modified.

### 9.2 D-06 — upload transport: classification

**Facts.** V1.1 §10.3 and §11.4 describe, for `PRESIGNED_PUT` profiles, a staging URL presigned "in the M7 business layer, from the committed row, using the credentials of the intent's own profile". V1.1 XC-6, IMP-18 and T-171b (iv) require "exactly one importer" of the provider signing SDK — the capability-signer module. A business-layer presigner would be a second importer of a signing facility. **CONFIRMED as a tension for `PRESIGNED_PUT` only.**

**Conforming path in the accepted text.** `uploadTransport` is a per-profile declaration, one of the three allowed selectors (V1.1 §23.5), with enum `M7UploadTransport = {PRESIGNED_PUT, SERVER_MEDIATED}` (§19.3). SP-2 is "required only when the profile's `uploadTransport = PRESIGNED_PUT`", and §11.2 states the alternative: *"the profile MUST declare `uploadTransport = SERVER_MEDIATED` (the client sends bytes to the server upload route, which writes the staging key itself under the same state machine …)"*. Under `SERVER_MEDIATED` no capability is issued to any client and no module other than the capability signer needs to produce a signed write capability; the staging write is subject to the existing staging-credential rule XC-2 and IMP-04. The storage worker already uses the object-store data plane without being a "signing SDK importer" in the XC-6 sense (XC-1, XC-5), so a reading under which XC-6 forbids every object-store data-plane client would make the accepted worker design (XC-1, XC-5) itself non-conforming; this erratum does not adopt that reading and does not otherwise interpret XC-6.

**Classification.** No normative amendment. A conforming implementation path exists through `SERVER_MEDIATED`. **Presigned staging operation (`PRESIGNED_PUT`) remains unavailable to an implementation** until an architecture for it demonstrates XC-6 / T-171b (iv) and the accepted signer/import boundary as written; if that is not achievable, enabling `PRESIGNED_PUT` is a separate authority question. "Unavailable" concerns a deployed presigning path only: database-level verification cases that register a storage-profile row declaring `PRESIGNED_PUT` (for example T-105 and T-118, which test provenance across a transport change) are unaffected and remain required as written. This erratum neither redesigns the signer boundary nor re-scopes XC-6.

---

## 10. Explicit non-amended clauses, closure history and downstream obligations

### 10.1 Preserved without change

Everything not quoted in a "Before/After" row of §5.4, §5.5, §5.7, §6.2, §7.2, §8.2 and §9.0 is preserved exactly, including:

| Preserved | Count / range (as derived in V1.1 §19.14.1) |
| :-- | :-- |
| tables and their semantics | 39 |
| enumerated types | 31 |
| functions (definer + invoker) | 110 (45 + 65) |
| constraints, indexes, triggers, views | 39 PK, 57 UNIQUE, 92 FK, 158 CHECK; 28 indexes; 183 triggers; 4 views |
| custom SQLSTATEs | M7001…M7014 |
| races / crash boundaries / retirement retry | RC-01…RC-29 / CB-01…CB-24 / RR-1…RR-7 |
| verification cases | all **209** distinct T-IDs; no case added or removed; the only change is the stale role cardinality of T-08b (ER-02, §6.2), whose invariant M7-I87 is unchanged |
| invariants | M7-I01…M7-I129 |
| implementation prerequisites | IMP-01…IMP-22 (IMP-03 text unchanged; ER-02 aligns §24.3 to it) |
| manifest gates | MA-1…MA-18; only MA-1 (reproduction procedure named, §5.7) and MA-6 (lifecycle object named, §9.0) are reworded |
| residuals | M7-R-01…M7-R-17 |
| consent semantics; CCA boundary | unchanged |
| provider / storage semantics; SP-1…SP-10; XC-1…XC-7; XF-*; SI-*; BL-* | unchanged |
| lock ordering; LG-1…LG-10; PG-1…PG-3; tables IW, C, LV; LG-THEOREM | unchanged except the PA-1 wording of §7.2 |
| manifest field set (V1.1 §23.4) and selectors (§23.5) | unchanged; ER-01 defines two derivations, ER-04 one meaning |
| B1 / B2 / C1 / C2 authority; S-2 Path A / Path B | unchanged |
| **P-16** | **ACTIVE** |

### 10.2 Implementation prerequisites — none satisfied

This erratum satisfies no `IMP-*`, no `MA-*`, no §24.3 CI addition, no real-PostgreSQL, real-provider or real-deployment case, and closes no conditional provider or signer closure. It does not claim that any implementation prerequisite is satisfied.

### 10.3 Closure history — T-08b stale cardinality

The superseded candidate `e3fde238…` recorded T-08b's *"five login roles … 9 × 5"* as an unamended observation (`E01-OBS-01`) and argued that T-171b (ii) and IA-14 covered the sixth role. The independent audit rejected that argument under V1.1 VC-6 (finding `E01-AUD-01`). `E01-OBS-01` is withdrawn as an open observation: the stale cardinality is **CLOSED by ER-02** (§6.2). No coverage argument from another case family is relied upon.

### 10.4 Downstream obligations created or clarified

| # | Obligation | Owner | Lifecycle point |
| :-- | :-- | :-- | :-- |
| E01-DO-1 | produce the migration and manifest so that MD-1…MD-7 and MG-1…MG-6 hold; provide a reproduction script or procedure an independent reviewer can run | implementation | LC-1 |
| E01-DO-2 | reproduce `D`, `migrationSha256`, `baselineCommit` (BC-2) and check BC-4/BC-5 | manifest reviewer | LC-3 |
| E01-DO-3 | decide the machine-readable layout of the M7 manifest compatibly with the unchanged `authority-gate`, or obtain a separate machine-authority / workflow amendment (D-13) | authority-baseline process | before LC-4 |
| E01-DO-4 | use `SERVER_MEDIATED` for any profile unless and until a `PRESIGNED_PUT` architecture demonstrates XC-6 / T-171b (iv) (D-06) | implementation | LC-1 |
| E01-DO-5 | register synchronization recording this erratum, if it is independently accepted, including the MA-6 restatement of Register §10.8 | root-authority sync (separate) | after acceptance of this erratum |
| E01-DO-6 | decide CCA implementation authorization | separate authority transition | not decided here |

### 10.5 Implementation consequences

1. The M7 migration and manifest are authored placeholder-first (MD-6, MG-6): the digest `D` is computed once, then set into exactly the two designated slots of each, and both results are validated against MD-4 and MG-3 before submission for review. A migration tool's raw file checksum is not `migrationSha256`.
2. The runtime startup check of V1.1 §23.6 step 1 computes the embedded manifest digest by MD-7, not by hashing the embedded file bytes.
3. No function body may contain the manifest digest literal (MG-3 (d)); the accepted §19 bodies already satisfy this.
4. The implementation branch should incorporate this erratum's protected integration (if accepted) before LC-1, otherwise BC-5 blocks manifest acceptance.
5. M7 implementation execution (including M7-S01) does not begin while this erratum is pending.

---

## 11. Acceptance criteria for the independent auditor

The auditor is asked to verify, from the exact bytes of this erratum, the accepted V1.1 bytes (§1.2) and the baseline tree (§1.1):

| # | Criterion |
| :-- | :-- |
| E01-AC-1 | the candidate commit changes exactly one path, this file; its only parent is `ca1be1bcbef7f6a98a0396d446816bf099075c40`; the accepted V1.1 blob is still `06e103b0…` |
| E01-AC-2 | ER-01: both cycles C1 and C2 exist under the accepted text; ALT-0…ALT-5 are correctly refused; MD-1…MD-7 and MG-1…MG-6 are deterministic; MD-3/MD-4 and MG-3 designate exactly the two slots and spans derived from V1.1 §19.13.4 and forbid every other occurrence of the digest; MD-6 and MG-6 validate after computing the digest and refuse on any extra occurrence without fixed-point search or reinterpretation; Lemma E01-L1 (exact inversion) and Lemma E01-L2 (`σ(C(M)) = utf8(canonical(M°))`, `τ(B_mig) = T0`) and Theorem E01-T1 hold; Corollary E01-C1 establishes computational binding under the stated SHA-256 second-preimage / collision-resistance assumption and claims no hash injectivity, unique preimage or information-theoretic uniqueness; Corollaries E01-C2…C4 hold; no field, function, table or gate is added |
| E01-AC-3 | ER-02: §18.3 lists six environment-key names and §18.2 six login roles; the corrected §24.3 bullet equals that set and IMP-03; T-08b is corrected to the six §18.2 login roles and `42501` for all 9 × 6, with no T-ID created or deleted, M7-I87 and RS-8 unchanged and no grant changed; the T-ID total remains 209; no credential-separation rule changed |
| E01-AC-4 | ER-03: the search of §7.1 reproduces five runtime lock sites including `study-protocol-repository.ts:262`; E01-PO-1 and E01-PO-2 hold; the LG-THEOREM proof goes through with the amended PA-1 and consequence (b); no lock behaviour changed |
| E01-AC-5 | ER-04: `baselineCommit` was undefined; BC-1…BC-6 give a unique, reproducible, acyclic value not equal by definition to any excluded commit and not hard-coded |
| E01-AC-6 | ER-05: the amended MA-6 names LC-3 and LC-4 as its preconditions; LC-1…LC-7 are distinct, named, and acyclic (E01-T2); nothing authorizes rotation |
| E01-AC-7 | D-13 and D-06 are classified without normative delta and without modifying any gate, `authority/`, selector or signer boundary |
| E01-AC-8 | CCA implementation authorization is expressly not decided |
| E01-AC-9 | every item of §10.1 is unchanged except as §10.1 itself states; no unresolved observation remains (§10.3) |
| E01-AC-10 | this document does not self-accept, and contains the two mandated status statements |

---

## 12. Explicit status

```
PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_01 : AUTHOR CANDIDATE — NOT YET AUTHORITATIVE
INDEPENDENT ACCEPTANCE                   : NOT PERFORMED
PROTECTED INTEGRATION                    : NOT PERFORMED
M7 IMPLEMENTATION EXECUTION REMAINS PAUSED PENDING INDEPENDENT ACCEPTANCE AND PROTECTED INTEGRATION OF THIS ERRATUM

M7 SPECIFICATION (V1.1)                  : ACCEPTED — ACCEPTED BYTES NOT EDITED
M7 IMPLEMENTATION WORK                   : AUTHORIZED — GATE 1 ONLY (unchanged)
M7 IMPLEMENTATION / RUNTIME              : NOT ACCEPTED — GATE 2 OPEN (unchanged)
IMP-01…IMP-22                            : OPEN
MA-1…MA-18                               : OPEN
M7 CONTROL-PLANE MANIFEST                : NOT AUTHORED, NOT ACCEPTED, NOT PUBLISHED
MACHINE-READABLE AUTHORITY               : UNCHANGED
PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA    : NOT ASSERTED
SELECTOR ROTATION                        : NOT PERFORMED
CCA IMPLEMENTATION AUTHORIZATION         : NOT DECIDED BY THIS ERRATUM
RUNTIME / SCHEMA / MIGRATIONS / TESTS / WORKFLOWS / scripts-trusted / authority : NOT MODIFIED
PAGAMENOS_SPEC_AUTHORITY.md              : NOT MODIFIED
B1 / B2 IMPLEMENTATION                   : NOT AUTHORIZED
C1 / C2                                  : NOT AUTHORIZED
P-16                                     : ACTIVE
```

## 13. Revisions R1 and R2 — disposition of the independent audits of `e3fde238…` and `80879ef5…`

| Finding | Severity | Change | Status |
| :-- | :-- | :-- | :-- |
| `E01-AUD-01` — T-08b stale five-role cardinality | MEDIUM / BLOCKING | ER-02 scope extended to V1.1 §25.2 T-08b; row corrected to the six §18.2 login roles and `42501` for all 9 × 6; `E01-OBS-01` withdrawn; §1.3, §2.1, §3, §6, §10.1, §10.3, E01-AC-3 and E01-AC-9 updated | R1 — **CLOSED** by the independent audit of `80879ef5…` |
| `E01-AUD-02` — E01-C1 overstated SHA-256 uniqueness | MEDIUM / BLOCKING | E01-C1 rewritten as computational binding (exact inversion from E01-L1; binding from SHA-256 second-preimage / collision resistance); E01-P2, E01-P3, the ALT-6 row, the E01-L1 title, the ER-04 Git-identity rationale sentence and E01-AC-2 made consistent; MD/MG rules unchanged in R1 | R1 — **CLOSED** by the independent audit of `80879ef5…` |
| `E01-AUD-03` — MD-5/MD-6 and MG-4 template equivalence lacked an exact no-extra-digest-occurrence condition | MEDIUM / BLOCKING | R2: MD-3 designates exactly the two `p_manifest_sha256` slots derived from V1.1 §19.13.4; MD-4 requires `D` exactly there and nowhere else (including substrings and member names) and `P` nowhere; MD-6 gains post-computation validation and refusal; MD-7 identifies the slots and fails closed; MG-3 requires `D_inst` exactly at the two designated migration spans and nowhere else; MG-4 defines `T := τ(B_mig)`; new MG-6 author procedure with validation; new Lemma E01-L2 proves `σ(C(M)) = utf8(canonical(M°))` and `τ(B_mig) = T0`; graph, E01-T1, E01-C1 step 4, E01-AC-2 and §10.5 item 1 aligned; the "Not claimed" sentence replaced by the precise statement. MD-5/MG-4 formulas, `P` and ALT-6 unchanged | R2 — addressed by the author; not an acceptance |

Nothing in this document accepts it. Acceptance belongs to an independent auditor, bound to the exact bytes of this file, and takes effect only through protected integration.

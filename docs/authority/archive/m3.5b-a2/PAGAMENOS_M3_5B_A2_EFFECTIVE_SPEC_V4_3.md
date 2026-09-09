<!-- R-B-17 ARCHIVAL HEADER - BEGIN. Added by the R-B-17 authority repair. Nothing below the END marker is altered. -->

> # HISTORICAL / NON-NORMATIVE
>
> **Status:** `HISTORICAL / NON-NORMATIVE - accepted-chain member, consolidated into the canonical A2 specification`
>
> **This document is retained as audit evidence only. It is NOT active authority and MUST NOT drive implementation, review, or gating.**
>
> **Active normative A2 specification:** `PAGAMENOS_M3_5B_A2_EFFECTIVE_SPEC_CANONICAL_V1.md`, which consolidates the accepted V4 to V4.5 chain without semantic change. This revision applied exactly two corrections (corpus provenance.observedAt; the portfolio instrument comparator); it did not replace the V4 architecture.
>
> **Supersession language inside this file is non-operative.** Any claim below of the form "fully supersedes" or "fully replaces" described the review packet submitted to one historical gate. It does **not** supersede, and never superseded, the active normative artifact named above. See Appendix B of the canonical A2 specification for the full register of neutralized claims.
>
> **Body integrity.** Everything after the `R-B-17 ARCHIVAL HEADER - END` marker is the original file, byte for byte. Its SHA-256 before archival was:
>
> `sha256:b9aba1f08a36fd4501de8945ae5048cb867222be60d1aa3c72484daa6d19cefd`
>
> Verify with: `tail -n +23 <this file> | sha256sum`
>
> **Root authority register:** `PAGAMENOS_SPEC_AUTHORITY.md` · **Repair record:** `PAGAMENOS_R_B_17_AUTHORITY_REPAIR_REPORT.md`

<!-- R-B-17 ARCHIVAL HEADER - END -->

# PAGAMENOS — M3.5B-A2 EFFECTIVE PRE-IMPLEMENTATION SPECIFICATION — V4.3

**Milestone:** M3.5B-A2 — PurchaseIntent lifecycle · deterministic decision-request freezing · exact snapshot binding · crash-repair saga.
**Status:** DESIGN / DOCUMENTATION ONLY. No code / Prisma / migrations / branches / commits / authority-bootstrap artifacts / CI-variable changes / A2 implementation / B1/B2 / C1/C2 / Production-Protocol freeze / Wave 0.
**Nature:** self-contained; **fully supersedes V1–V4.2 for review.** A reviewer needs only (1) this document, (2) accepted A1 spec `PAGAMENOS_M3_5B_A1_EFFECTIVE_SPEC_V2_1.md`, and (3) the accepted repository.

**Origin:** the independent Codex Sol V4.2 gate returned `# B — M3.5B-A2 V4.2 REQUIRES BOUNDED PATCH`, closing all prior findings and accepting the V4.2 structures (§2), leaving **exactly two** bounded normative corrections: `A2-CORPUS-PROJECTION-INCOMPLETE` and `A2-PORTFOLIO-COMPARATOR-UNDERSPECIFIED`. V4.3 applies only these two and propagates wording mechanically. It is not a redesign and reopens nothing else.

**Accepted baselines (verified present, `C:/Users/piero/pagamenos-a1`, inspected READ ONLY):** M3.5A `64cf864a817c137920204487ab3317bc6d4c9ba5`; M3.5B-A1 `99f2d61bc45839d6f9506abee5fae641bfcd8b2e`; A1 doc child `7c0a3d9e0add34e4823c01f22c21542817dbc881`.

---

## 1. Gate state carried forward (CLOSED / ACCEPTED — not reopened)

Independently CLOSED by Sol and carried unchanged: **A2-DG-02** (holiday authority), **A2-DG-01** (consent Model A), **A2-DG-03** (trusted entry provenance), **A2-DG-H02** (reload-and-prove P2002), **DG-04**, **DG-05**, **DG-06**, **H01**, **H04**, **H05**.

Independently ACCEPTED as structurally sound and carried unchanged: the external protected `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA` mechanism; authority-bootstrap separation from design acceptance; corpus bootstrap source SHA `64cf864…`; COMPLETE-SIGNATURE-ONLY `PurchaseContext` policy; operational-state cardinality (exactly one state per included rule; duplicate/missing/orphan → fail); Holiday Fixture `pagamenos.holiday.pe-lima-callao.private-commerce.v1` with digest `sha256:6d65409665d176d40390be4ed8414dc22e4ab9d11b40ede1d38abb7b258460d8`; binding structure; crash-repair saga; consent Model A; trusted entry provenance; reload-and-prove P2002; portfolio collision / empty-container handling (**except** the comparator issue in §4/Correction 2). These are modified only where wording must be propagated from the two corrections below.

---

## 2. The two open findings (verified)

### FINDING 1 — `A2-CORPUS-PROJECTION-INCOMPLETE`
V4.2 excluded all of `RuleVersion.provenance` from the corpus semantic projection. **Verified against accepted code (`src/engine/decide.ts`):** `decide()` reads `rule.provenance.observedAt` (line 751: `provenanceRef: rule.provenance.observedAt`) and uses it as decision-bound proof/audit material in the `BoundProof` construction — `sourceCheckId = provenanceRef` (line 533) and `reviewedAt = provenanceRef` (line 535). `provenance.sourceId` and `provenance.url` are **not** referenced anywhere in `decide()`. Sol's demonstrated attack:
```
PJ-BCP-01.provenance.observedAt: "2026-08-30" → "2099-01-01"
  before: sourceCheckId="2026-08-30", reviewedAt="2026-08-30"
  after:  sourceCheckId="2099-01-01", reviewedAt="2099-01-01"
  yet the V4.2 corpus semantic digest was unchanged.
```
So `same corpusId + same V4.2 digest` did **not** imply `same decision-bound engine material`. Correction 1 (§3) fixes this.

### FINDING 2 — `A2-PORTFOLIO-COMPARATOR-UNDERSPECIFIED`
V4.2 sorted instruments by `(family, network ?? '', tier ?? '', canonicalMembershipsSerialized)` without normatively defining `canonicalMembershipsSerialized` or the per-component comparison relation, permitting non-injective, participant-order-dependent results (e.g. a `join(",")` serialization collides `["A,B"]` with `["A","B"]`). Correction 2 (§4) makes the comparator injective and total.

---

## 3. CORRECTION 1 — `provenance.observedAt` enters the corpus semantic projection

The **only** H03 semantic-projection change authorized by this patch is to reclassify `RuleVersion.provenance` field-by-field:
```
provenance.sourceId   → EXCLUDE   (not consumed by accepted decide())
provenance.url        → EXCLUDE   (not consumed by accepted decide())
provenance.observedAt → INCLUDE   (consumed by decide(); enters BoundProof.sourceCheckId / reviewedAt)
```

**Corpus semantic digest contract (frozen, restated):** two states sharing one historical `corpusId` must not differ in any corpus field that can alter accepted engine decision output, decision status, candidate economics, advisories, **or decision-bound proof/audit material**. This is not broadened to source-rights / source-registry governance, and no unrelated documentary field is added.

### 3.1 `observedAt` normalization
`RuleVersion.provenance.observedAt` is a scalar semantic value. It is **not** truncated, converted to current time, re-fetched, locale-normalized, or derived from another record. The **exact validated value carried by the accepted `RuleVersion`** participates in the canonical corpus semantic projection verbatim. The accepted schema types it as a non-empty string (`src/persistence/schema.ts`: `provenance = z.strictObject({ sourceId: z.string().min(1), url: z.string().min(1), observedAt: z.string().min(1) })`; corpus values are Lima calendar `YYYY-MM-DD`, e.g. `"2026-08-30"`). V4.3 reuses that exact accepted contract and invents no new date format.

### 3.2 Updated `RuleVersion` projection table (exact)
| field | class | note |
| :-- | :-- | :-- |
| ruleId | INCLUDE | identity / sort key |
| version | INCLUDE | identity / sort key |
| campaignId | INCLUDE | semantic identity (combinability/grouping) |
| merchantIds | INCLUDE + normalized set | §3.4 (set-like; dup invalid; code-point sort) |
| providerFamily | INCLUDE | eligibility (`hasFamily`) |
| benefit | INCLUDE (full discriminated union) | economic core |
| eligibleSpendSelector | INCLUDE | spend base |
| canonicalItems? | INCLUDE + normalized set | set by `itemKey` (dup `itemKey` invalid) |
| ticketContext? | INCLUDE | TICKETS structure |
| constraints | INCLUDE every decision-relevant subfield | §3.3 |
| eligibilityClass | INCLUDE | eligibility resolution |
| confidence | INCLUDE | rankability |
| comparisonScopeRefs | INCLUDE + normalized set | set-like; dup invalid; code-point sort |
| signatureKind | INCLUDE | signature identity |
| **provenance.sourceId** | **EXCLUDE** | not consumed by `decide()` |
| **provenance.url** | **EXCLUDE** | not consumed by `decide()` |
| **provenance.observedAt** | **INCLUDE** | consumed by `decide()` → `BoundProof.sourceCheckId`/`reviewedAt` (verified §2) |

Repository inspection confirms `provenance` has exactly three fields (`sourceId`, `url`, `observedAt`); no other provenance field exists to classify.

### 3.3 `constraints` (unchanged from V4.2 — carried)
INCLUDE all decision-relevant subfields: `temporal`, `holidayPolicy`, `specificBlackoutDates?`, `weekdays?`, `timeWindow?`, `minimumSpend?`, `cap?`, `channels?`, `locations?.include/exclude`, `products?.includeSku/excludeSku`, `useLimit?`, `stock?`, `cardNetwork?`, `cardTier?`, `membership?`, `providerPrivateKey?`, `preRedemptionVerifiable?`, `combinability`.

### 3.4 Array/set normalization + ordering (unchanged from V4.2 — carried, NOT reopened)
`ComparisonScope` (INCLUDE all fields), `PurchaseSignature` (INCLUDE all), `RuleOperationalState` (INCLUDE `ruleId`/`version`/`publicationState`/`sourceQualityState`/`availability`; EXCLUDE `asOf`/`note`). All corpus arrays remain **SET-LIKE** (duplicates invalid → fail release; canonical sort): `requiredContext`, `allowedSelectors`, `canonicalItems`(by `itemKey`), `merchantIds`, `comparisonScopeRefs`, `weekdays`(canonical MON..SUN index), `channels`, `specificBlackoutDates`, `locations.include/exclude`, `products.includeSku/excludeSku`. Top-level: `scopes` by `scopeId`; `activeRules` by `(ruleId, version)`; `operationalStates` by `(ruleId, version)`; duplicate stable identity → fail. **The only projection change in V4.3 is `provenance.observedAt → INCLUDE`.** No corpus array is invented or reordered.

### 3.5 Digest + `corpusId`
`corpusSemanticDigest = "sha256:" + SHA-256(canonical(normalizeCorpusSemanticProjection(loadCorpus())))`, computed only after §3.4 validation; **`corpusId` is EXCLUDED from the digest** (renaming the id cannot change the digest). Bootstrap source remains `64cf864` (verified corpus-unchanged vs `99f2d61`). Because `observedAt` now enters the projection, the concrete bootstrap digest computed at the authority-bootstrap gate differs from any digest that would have been produced under the V4.2 projection; this is expected and correct, and the digest is produced at bootstrap (not hand-authored here).

### 3.6 Required corpus-ledger attack test (must now FAIL)
Starting from the accepted external authority baseline: change ONLY `RuleVersion.provenance.observedAt` → `normalizeCorpusSemanticProjection` → `corpusSemanticDigest` **MUST change**. If `corpusId` is unchanged, `candidate current digest != accepted external ledger[corpusId]` → **CI FAIL**. Even if the candidate edits its local corpus ledger, every candidate-local authority fixture, and every local expected digest, the external `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA` still makes the old-ID mutation fail (§8 corpus CI gate carried from V4.2). This exact `observedAt` attack is added to the required tests.

---

## 4. CORRECTION 2 — exact injective, total portfolio instrument comparator

Memberships are already normalized before instrument ordering (carried from V4.2, unchanged): each trimmed; blank rejected; exact case preserved; exact-equal duplicates removed; sorted by the frozen Unicode code-point comparator (§4.2); an empty normalized list represented as **absent/omitted**.

### 4.1 `canonicalMembershipsSerialized` (exact)
```
canonicalMembershipsSerialized(instrument):
  memberships = instrument.memberships ?? []      // already normalized (trimmed, deduped, code-point sorted)
  return canonicalize(memberships)                // the accepted serializer, src/persistence/canonical.ts
```
`canonicalize` is the **existing accepted PagaMenos canonical JSON serializer** (`src/persistence/canonical.ts`): no delimiter joining, no locale-dependent serialization, no custom serializer, no `Array.toString()`, no enum-ordinal encoding. Because canonical JSON emits array structure and JSON string escaping, `["A,B"]` and `["A","B"]` serialize to **different** values (`["A,B"]` → `["A,B"]`; `["A","B"]` → `["A","B"]`), so the serialization is **injective** over the already-normalized membership array.

### 4.2 `compareUnicodeCodePointStrings(a, b): -1 | 0 | 1` (exact)
```
A = Array.from(a); B = Array.from(b)      // Unicode code-point iteration
for i in 0 .. min(A.length, B.length)-1:
  cpA = A[i].codePointAt(0); cpB = B[i].codePointAt(0)
  if cpA < cpB: return -1
  if cpA > cpB: return 1
if A.length < B.length: return -1
if A.length > B.length: return 1
return 0
```
Lexicographic by Unicode scalar/code-point sequence. **Do NOT use** `localeCompare`, host locale, `Intl.Collator`, enum-ordinal ordering, implementation-defined sort, or UTF-8 byte locale collation. **No** NFC/NFD normalization is added: the accepted engine uses exact, case-sensitive string identity, so code-point-distinct-but-canonically-equivalent Unicode strings remain distinct unless existing accepted validation already collapses them.

### 4.3 `compareNormalizedEligibilityInstrumentV1(a, b)` (exact; component-wise)
```
instrumentSortTuple(i) = [ i.family, i.network ?? "", i.tier ?? "", canonicalize(i.memberships ?? []) ]
compareNormalizedEligibilityInstrumentV1(a, b):
  A = instrumentSortTuple(a); B = instrumentSortTuple(b)
  for index in 0..3:
    c = compareUnicodeCodePointStrings(A[index], B[index])
    if c != 0: return c
  return 0
```
The tuple component order is frozen: (1) `family`, (2) `network ?? ""`, (3) `tier ?? ""`, (4) `canonicalize(memberships ?? [])`. The four components are compared **independently** — never concatenated into one delimiter-separated string. Instrument ordering is therefore determined by explicit Unicode code-point comparison of the `family` string (not enum declaration order).

### 4.4 Comparator equality invariant (stated + tested)
```
compareNormalizedEligibilityInstrumentV1(a, b) == 0  IFF  a and b are structurally identical normalized instruments
```
A normalized instrument contains exactly `family`, optional `network`, optional `tier`, optional normalized `memberships`, all represented injectively in the tuple. **Defense-in-depth:** if `comparator(a,b) == 0` but `canonicalize(a) != canonicalize(b)`, throw `EligibilityProfileInstrumentComparatorInvariantError` (rather than relying on sort stability). This is unreachable for valid normalized V1 instruments but MUST be tested.

### 4.5 Instrument deduplication + sort order (frozen)
```
raw instruments → validate each → normalize memberships → normalize optional fields
→ produce normalized instrument objects
→ deduplicate structurally identical normalized instruments (equality of canonicalize(normalizedInstrument))
→ sort remaining instruments with compareNormalizedEligibilityInstrumentV1
→ persist
```
Deduplication is structural over the normalized representation (via `canonicalize`), never over caller order or raw JSON bytes. No implementation choice is discretionary.

### 4.6 Portfolio attack tests (required)
- **Delimiter collision:** instrument A `memberships=["A,B"]` vs B `memberships=["A","B"]` → `canonicalMembershipsSerialized` MUST differ; comparator MUST NOT return 0 (they are structurally different).
- **Membership permutation:** `["B","A"]` ≡ `["A","B"]` → normalize identically.
- **Membership duplicates:** `["A","A","B"]` ≡ `["A","B"]` → normalize identically.
- **Instrument permutation:** any permutation of the same normalized instrument set → byte-identical `portfolioJson`.
- **Provider-family ordering:** determined by Unicode code-point comparison of `family` strings, not enum declaration order.
- **Unicode/punctuation memberships:** values containing comma, quote, backslash, colon, brackets, non-ASCII Unicode → canonical JSON stays injective.
- **Comparator equality invariant (property):** `cmp(a,b)==0 ⇒ canonicalize(a)==canonicalize(b)` and, for valid normalized V1 instruments, `canonicalize(a)==canonicalize(b) ⇒ cmp(a,b)==0`.

### 4.7 Empty/absent + collision rules (carried unchanged, NOT reopened)
`memberships` undefined ≡ `[]` → omit; `privateStates` undefined ≡ `{}` → omit; `declarations` undefined ≡ `{}` → omit; blank membership → reject; blank tier → reject; post-trim declaration-key collision → reject; post-trim private-state-key collision → reject; even same-`Tri` normalized-key collision → reject.

---

## 5. No regressions (explicit)

V4.3 does **not** modify: Holiday Fixture v1; the holiday digest `sha256:6d654096…60d8`; holiday legal policy; coverage `2026-01-01…2027-12-31`; external base-SHA governance; consent Model A; trusted entry provenance; reload-and-prove P2002; COMPLETE-SIGNATURE-ONLY context; operational-state cardinality; the binding model; the crash-repair saga; DecisionRequest semantics; current-runtime semantic gates; parser retention; invalidation; A1; M3.5A economic semantics; B/C. The corpus array/set classification (V4.2 §7.6) is carried forward unchanged; the sole projection change is `provenance.observedAt → INCLUDE` (§3).

---

## 6. SCI effect (stated, not self-authorized)

With the two corrections applied, V4.3 supports **SCI-A2-05, SCI-A2-12, SCI-A2-17, SCI-A2-18** being READY — pending the independent closure review. V4.3 does not self-declare them accepted. All other SCI-A2 clauses are carried from V4/V4.1/V4.2 unchanged.

---

## 7. R35R effect

The two fixes close the remaining A2 portions of **R35R-11** and **R35R-15** (pending independent review). No B/C closure is claimed. **R35R-19 remains DEFERRED NON-BLOCKING.**

---

## 8. Authority bootstrap remains separate (carried)

```
PRE-IMPLEMENTATION AUTHORITY BOOTSTRAP = REQUIRED / NOT YET COMPLETE
```
Design-review sequence:
```
V4.3 → independent Codex Sol two-finding closure gate → if A:
  independently execute authority bootstrap (Holiday Fixture v1 gate + corpus ledger @64cf864, §V4.2)
  → independently verify bootstrap → set PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA
  → only then may A2 implementation begin
```
A2 implementation does **not** begin immediately after V4.3 authoring.

---

## 9. V4.3 Closure Matrix (two findings only)

| Finding | Previous attack | Exact patch | Mechanical authority | Test | Claimed state |
| :-- | :-- | :-- | :-- | :-- | :-- |
| **A2-CORPUS-PROJECTION-INCOMPLETE** | mutate `RuleVersion.provenance.observedAt` (`2026-08-30`→`2099-01-01`) changed `BoundProof.sourceCheckId`/`reviewedAt` yet left the V4.2 corpus digest unchanged | classify provenance field-by-field: `sourceId`/`url` EXCLUDE, **`observedAt` INCLUDE** in the corpus semantic projection (§3); verbatim scalar reuse (§3.1) | `decide()` verified to consume `provenance.observedAt` (`decide.ts` L751→L533/L535); digest recomputed over the corrected projection; external protected `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA` corpus CI gate | §3.6 — `observedAt`-only mutation under an unchanged `corpusId` MUST fail CI, even with all candidate-local files edited | READY FOR INDEPENDENT CLOSURE GATE |
| **A2-PORTFOLIO-COMPARATOR-UNDERSPECIFIED** | `join(",")`-style serialization collides `["A,B"]` with `["A","B"]`; participant-order-dependent normalized JSON | define `canonicalMembershipsSerialized = canonicalize(memberships??[])` (accepted serializer, injective) (§4.1); frozen `compareUnicodeCodePointStrings` (§4.2); component-wise `compareNormalizedEligibilityInstrumentV1` over `[family, network??"", tier??"", canonicalize(memberships)]` (§4.3); equality invariant + typed error (§4.4); structural dedup via `canonicalize` (§4.5) | accepted `src/persistence/canonical.ts`; explicit Unicode code-point comparison (no locale/Intl/enum-ordinal); injectivity of canonical JSON over normalized memberships | §4.6 — delimiter collision, permutation, duplicates, instrument permutation → byte-identical `portfolioJson`; equality-invariant property test | READY FOR INDEPENDENT CLOSURE GATE |

**All other findings (A2-DG-01, A2-DG-02, A2-DG-03, A2-DG-H02, A2-DG-H03, DG-04, DG-05, DG-06, H01, H04, H05) remain CLOSED and are not reopened.**

---

# M3.5B-A2 EFFECTIVE DESIGN V4.3 READY FOR FINAL TWO-FINDING INDEPENDENT CLOSURE GATE

```
DESIGN ONLY.
NO IMPLEMENTATION AUTHORIZATION.
PRE-IMPLEMENTATION AUTHORITY BOOTSTRAP NOT YET COMPLETE.
B1/B2 NOT AUTHORIZED.
C1/C2 NOT AUTHORIZED.
PRODUCTION PROTOCOL v1 UNFROZEN.
WAVE 0 NOT AUTHORIZED.
```

<!-- R-B-17 ARCHIVAL HEADER - BEGIN. Added by the R-B-17 authority repair. Nothing below the END marker is altered. -->

> # HISTORICAL / NON-NORMATIVE
>
> **Status:** `HISTORICAL / NON-NORMATIVE - accepted-chain member, consolidated into the canonical A2 specification`
>
> **This document is retained as audit evidence only. It is NOT active authority and MUST NOT drive implementation, review, or gating.**
>
> **Active normative A2 specification:** `PAGAMENOS_M3_5B_A2_EFFECTIVE_SPEC_CANONICAL_V1.md`, which consolidates the accepted V4 to V4.5 chain without semantic change. This revision applied exactly one correction (provenance.sourceId and provenance.url to INCLUDE); it did not replace the V4 architecture.
>
> **Supersession language inside this file is non-operative.** Any claim below of the form "fully supersedes" or "fully replaces" described the review packet submitted to one historical gate. It does **not** supersede, and never superseded, the active normative artifact named above. See Appendix B of the canonical A2 specification for the full register of neutralized claims.
>
> **Body integrity.** Everything after the `R-B-17 ARCHIVAL HEADER - END` marker is the original file, byte for byte. Its SHA-256 before archival was:
>
> `sha256:161797c07f9e7972d2c2512060ad0bfcc2d5297a39769f20c3b24c8a2d99bc40`
>
> Verify with: `tail -n +23 <this file> | sha256sum`
>
> **Root authority register:** `PAGAMENOS_SPEC_AUTHORITY.md` · **Repair record:** `PAGAMENOS_R_B_17_AUTHORITY_REPAIR_REPORT.md`

<!-- R-B-17 ARCHIVAL HEADER - END -->

# PAGAMENOS — M3.5B-A2 EFFECTIVE PRE-IMPLEMENTATION SPECIFICATION — V4.4

**Milestone:** M3.5B-A2 — PurchaseIntent lifecycle · deterministic decision-request freezing · exact snapshot binding · crash-repair saga.
**Status:** DESIGN / DOCUMENTATION ONLY. No code / Prisma / migrations / branches / commits / authority-bootstrap / corpus-ledger artifacts / CI-variable changes / A2 implementation / B1/B2 / C1/C2 / Production-Protocol freeze / Wave 0.
**Nature:** self-contained; **fully supersedes V1–V4.3 for review.** A reviewer needs only (1) this document, (2) accepted A1 spec `PAGAMENOS_M3_5B_A1_EFFECTIVE_SPEC_V2_1.md`, and (3) the accepted repository.

**Origin:** the independent Codex Sol V4.3 gate returned `# B — M3.5B-A2 V4.3 REQUIRES BOUNDED PATCH`, independently **CLOSING** `A2-PORTFOLIO-COMPARATOR-UNDERSPECIFIED`. The sole remaining open finding is `A2-CORPUS-PROJECTION-INCOMPLETE`. V4.4 applies only this single correction; it is not a redesign and reopens nothing else.

**Accepted baselines (verified present, `C:/Users/piero/pagamenos-a1`, inspected READ ONLY):** M3.5A `64cf864a817c137920204487ab3317bc6d4c9ba5`; M3.5B-A1 `99f2d61bc45839d6f9506abee5fae641bfcd8b2e`; A1 doc child `7c0a3d9e0add34e4823c01f22c21542817dbc881`.

---

## 1. Gate state carried forward (CLOSED / ACCEPTED — not reopened)

Independently CLOSED / accepted and carried **unchanged**: `A2-PORTFOLIO-COMPARATOR-UNDERSPECIFIED` (closed at the V4.3 gate); `A2-DG-01`; `A2-DG-02`; `A2-DG-03`; `A2-DG-H02`; `DG-04`; `DG-05`; `DG-06`; `H01`; `H04`; `H05`; Holiday Fixture v1 (`pagamenos.holiday.pe-lima-callao.private-commerce.v1`, digest `sha256:6d65409665d176d40390be4ed8414dc22e4ab9d11b40ede1d38abb7b258460d8`, coverage `2026-01-01…2027-12-31`, legal authority); COMPLETE-SIGNATURE-ONLY context policy; operational-state cardinality; consent Model A; trusted entry provenance; reload-and-prove P2002; binding model; crash-repair saga; parser/loadability retention; external protected `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA` governance; and the V4.3 portfolio normalization/comparator (`canonicalMembershipsSerialized`, `compareUnicodeCodePointStrings`, `compareNormalizedEligibilityInstrumentV1`, structural dedup, equality invariant). These are touched only for unavoidable wording references.

---

## 2. The single open finding (verified)

### `A2-CORPUS-PROJECTION-INCOMPLETE`
V4.3 classified `provenance.sourceId → EXCLUDE`, `provenance.url → EXCLUDE`, `provenance.observedAt → INCLUDE`. The independent V4.3 gate proved EXCLUDE of `sourceId`/`url` is insufficient. Although `sourceId` and `url` are not consumed by `decide()` ranking/status logic, they participate in **authoritative decision history**. Verified against accepted code:

1. **`engineInputV1Schema` persists the full provenance object** — `src/persistence/schema.ts`: `provenance: z.strictObject({ sourceId: z.string().min(1), url: z.string().min(1), observedAt: z.string().min(1) })` inside `ruleVersionSchema`, which is part of `engineInputV1Schema.rules`. All three are persisted in `engineInputJson`.
2. **M3.5A `requestHash == inputHash == SHA-256(canonical(validated DecideInput))`** (`src/persistence/snapshot.ts`/`hash.ts`/`canonical.ts`). Since `provenance.sourceId`/`url` are inside the validated `DecideInput.rules`, a change to only `sourceId` or only `url` changes the exact persisted `DecideInput` and therefore `inputHash`.
3. **`engineInputJson` preserves these fields as immutable historical audit/replay material** (`decision_snapshot.engineInputJson` JSONB, verbatim).
4. **Corpus provenance authenticity hashes the complete `RuleVersion`** — `src/persistence/provenance.ts` `corpusV1ProvenanceProvider` computes `canonicalHash(rule)` over the whole rule (including its `provenance`) for exact membership equality. So changing `sourceId`/`url` changes the corpus-authenticity definition of the rule.
5. **Historical replay verifies the exact input hash** (`verifyHistoricalSnapshot`/`replayWithCurrentEngine`, `src/persistence/integrity.ts`), so these fields participate in replay/integrity semantics.

Independently demonstrated: a `sourceId`-only mutation, or a `url`-only mutation, left the V4.3 `corpusSemanticDigest` unchanged while changing the exact `DecideInput`/`inputHash`. This permits the same historical `corpusId` and the same V4.3 ledger digest to refer to a **different exact authenticated/persisted input** — unacceptable. Correction (§3) includes all provenance fields.

---

## 3. Required patch — INCLUDE all `RuleVersion.provenance` fields

```
provenance.sourceId   → INCLUDE
provenance.url        → INCLUDE
provenance.observedAt → INCLUDE
```

No provenance field remains outside the corpus semantic projection. Read-only verification establishes `RuleVersion.provenance` contains **exactly** `{ sourceId, url, observedAt }` (`src/corpus/types.ts` `interface Provenance`; mirrored one-to-one by `ruleVersionSchema.provenance` in `src/persistence/schema.ts`). No additional provenance field exists to classify. For the current accepted `RuleVersion`, the **entire** provenance object is corpus-authoritative (never "some provenance is documentary").

---

## 4. Corrected corpus-digest principle (governing criterion)

V4.3's principle was centered too narrowly on direct engine output. Replace it with:

> A historical `corpusId` MUST bind every corpus field whose value participates in the exact validated `DecideInput`, M3.5A input hashing, corpus-authenticity verification, persisted decision history, historical integrity verification, replay semantics, decision output, decision status, candidate economics, advisories, or decision-bound proof/audit material.

Equivalently:
```
same historical corpusId
⇒ same normalized corpus authority for every field material to:
     exact DecideInput
     OR inputHash
     OR corpus authenticity
     OR replay/integrity
     OR engine decision semantics
     OR decision-bound audit/proof semantics
```
This is the governing criterion for `normalizeCorpusSemanticProjection` — intentionally broader than "directly consumed by `decide()`". It is **not** broadened into source-rights governance, source-scraping governance, research-contact semantics, or freshness adjudication outside existing `RuleVersion` fields.

---

## 5. Updated `RuleVersion` projection table (exact)

| field | class |
| :-- | :-- |
| ruleId | INCLUDE |
| version | INCLUDE |
| campaignId | INCLUDE |
| merchantIds | INCLUDE (normalized set) |
| providerFamily | INCLUDE |
| benefit | INCLUDE (full discriminated union) |
| eligibleSpendSelector | INCLUDE |
| canonicalItems? | INCLUDE (normalized set by `itemKey`) |
| ticketContext? | INCLUDE |
| constraints | INCLUDE (every decision-relevant subfield, §6) |
| eligibilityClass | INCLUDE |
| confidence | INCLUDE |
| comparisonScopeRefs | INCLUDE (normalized set) |
| signatureKind | INCLUDE |
| **provenance.sourceId** | **INCLUDE** |
| **provenance.url** | **INCLUDE** |
| **provenance.observedAt** | **INCLUDE** |

**This patch changes ONLY the provenance inclusion** (`sourceId`/`url` from EXCLUDE→INCLUDE; `observedAt` remains INCLUDE). Every other classification is carried from V4.3 verbatim.

---

## 6. Carried-forward projection (unchanged from V4.3)

Unchanged: `ComparisonScope` projection (all fields INCLUDE); `PurchaseSignature` projection (all INCLUDE); `constraints` projection (all decision-relevant subfields INCLUDE — `temporal`, `holidayPolicy`, `specificBlackoutDates?`, `weekdays?`, `timeWindow?`, `minimumSpend?`, `cap?`, `channels?`, `locations?.include/exclude`, `products?.includeSku/excludeSku`, `useLimit?`, `stock?`, `cardNetwork?`, `cardTier?`, `membership?`, `providerPrivateKey?`, `preRedemptionVerifiable?`, `combinability`); `RuleOperationalState` projection (`ruleId`/`version`/`publicationState`/`sourceQualityState`/`availability` INCLUDE; `asOf`/`note` EXCLUDE); top-level ordering (`scopes` by `scopeId`; `activeRules` by `(ruleId, version)`; `operationalStates` by `(ruleId, version)`); duplicate-stable-identity rejection; SET-LIKE array normalization (duplicates invalid → fail; canonical sort) for `requiredContext`, `allowedSelectors`, `canonicalItems`(by `itemKey`), `merchantIds`, `comparisonScopeRefs`, `weekdays`(MON..SUN index), `channels`, `specificBlackoutDates`, `locations.include/exclude`, `products.includeSku/excludeSku`. `corpusId` remains EXCLUDED from the digest.

---

## 7. Provenance normalization

`sourceId`, `url`, `observedAt` are scalar accepted `RuleVersion` values used **exactly** as validated. They are **not** trimmed (beyond whatever the accepted schema already does — it does not), lowercased, URL-syntax-normalized, redirect-resolved, host-canonicalized, source-id-rewritten, re-fetched, `observedAt`-converted, or metadata-substituted. The semantic projection passes the exact accepted normalized `RuleVersion` values to the accepted canonical serializer (`src/persistence/canonical.ts`). No new provenance-normalization semantics are invented.

---

## 8. Three required old-`corpusId` attack tests

Each tested separately at the release/authority gate.

**8.1 `observedAt`-only** — from the accepted corpus, change only `RuleVersion.provenance.observedAt` ⇒ `corpusSemanticDigest` changes; with an unchanged `corpusId`, CI FAILS against the external authority ledger.

**8.2 `sourceId`-only** — change only `provenance.sourceId` ⇒ `corpusSemanticDigest` changes; unchanged `corpusId` ⇒ CI FAILS. Also prove the mutation would otherwise change the exact M3.5A `DecideInput` / `inputHash` (the persisted `engineInputJson.rules[i].provenance.sourceId` differs, so `canonicalHash(input)` differs).

**8.3 `url`-only** — change only `provenance.url` ⇒ `corpusSemanticDigest` changes; unchanged `corpusId` ⇒ CI FAILS. Also prove the mutation would otherwise change the exact M3.5A `DecideInput` / `inputHash`.

---

## 9. Candidate-local self-approval attack (all three fields)

For each of the three provenance-field mutations, the candidate may attempt to edit corpus data, the local `CORPUS_RELEASE_LEDGER_V1`, the local expected digest, and every candidate-local authority fixture. The gate STILL requires: the accepted historical ledger loaded from `$PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA` ≠ the candidate old-ID digest ⇒ **CI FAIL**. The external-base-SHA governance (carried unchanged from the accepted V4.2/V4.3 design) makes the historical comparison independent of any candidate-local edit.

---

## 10. Exhaustiveness check (final; read-only audit)

After V4.4, every `RuleVersion` field is INCLUDE except the two `RuleOperationalState`-adjacent documentary fields (`asOf`, `note`) which are verified not consumed by `decide()` and not part of the frozen `DecideInput` (they live on `RuleOperationalState`, whose decision-consumed fields `publicationState`/`sourceQualityState`/`availability` are all INCLUDE). No `RuleVersion` field — including the full `provenance` object — remains outside the projection. No field besides those already included can affect the validated `DecideInput`, `inputHash`, corpus authenticity, persisted `engineInputJson`, replay integrity, engine output/status/economics/advisories, or decision-bound proof/audit material.

```
NO ADDITIONAL OMITTED RULEVERSION FIELD FOUND
```
No speculative future field is invented.

---

## 11. SCI effect (stated, not self-accepted)

This patch is intended to make **SCI-A2-18 = READY FOR INDEPENDENT CLOSURE REVIEW**. Carried from the independent V4.3 gate result, unchanged and not reopened: **SCI-A2-05 = READY**, **SCI-A2-12 = READY**, **SCI-A2-17 = READY**. V4.4 does not self-accept SCI-A2-18. All other SCI-A2 clauses carried from V4/V4.1/V4.2/V4.3 unchanged.

---

## 12. R35R effect

The only remaining affected clause is **R35R-11 A2**, whose remaining dependency V4.4 is intended to close through SCI-A2-18 (pending independent review). Carried from the V4.3 gate: **R35R-15 A2 = CLOSED**. **R35R-19 remains DEFERRED NON-BLOCKING.** No B/C finding is closed.

---

## 13. Authority bootstrap still must not run

```
PRE-IMPLEMENTATION AUTHORITY BOOTSTRAP = REQUIRED / NOT YET COMPLETE
```
The corrected corpus digest is computed only AFTER V4.4 receives an independent **A** design verdict. Sequence:
```
V4.4
→ independent final corpus-projection closure gate
→ if A:
   execute authority bootstrap using the corrected V4.4 projection at 64cf864
→ independently verify bootstrap
→ create accepted authority-baseline commit
→ set protected PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA
→ only then authorize A2 implementation
```
V4.4 does **not** compute or hand-author the final corpus digest hex.

---

## 14. No regression (explicit)

V4.4 does not modify or reopen: the portfolio comparator/normalizer (V4.3); Holiday Fixture v1; the holiday digest `sha256:6d654096…60d8`; holiday legal policy; holiday coverage; external base-SHA governance; consent Model A; trusted entry provenance; reload-and-prove P2002; COMPLETE-SIGNATURE-ONLY context policy; operational-state cardinality; the context request hash; the binding model; the crash-repair saga; DecisionRequest semantics; current-runtime gates; historical parser retention; invalidation; A1; M3.5A economic semantics; B/C. The **only** change is `provenance.sourceId` and `provenance.url` moving EXCLUDE→INCLUDE in the corpus semantic projection (§3/§5).

---

## 15. V4.4 Closure Matrix (single finding)

| Finding | V4.3 remaining attack | Exact patch | Accepted-code authority | Mechanical corpus-digest effect | External-ledger effect | Provenance mutation tests | State |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| **A2-CORPUS-PROJECTION-INCOMPLETE** | `sourceId`-only and `url`-only mutations left the V4.3 corpus digest unchanged while changing the exact `DecideInput`/`inputHash` — same `corpusId` + same digest could denote a different authenticated/persisted input | reclassify `provenance.sourceId`/`url` EXCLUDE→INCLUDE; full provenance object in `normalizeCorpusSemanticProjection` (§3/§5); corrected governing digest principle (§4); exact-value normalization (§7) | `engineInputV1Schema` persists full provenance (`schema.ts`); `requestHash==inputHash==SHA-256(canonical(DecideInput))` (`snapshot.ts`/`hash.ts`); corpus authenticity hashes the whole `RuleVersion` (`provenance.ts`); replay verifies input hash (`integrity.ts`); `Provenance = {sourceId,url,observedAt}` exactly (`corpus/types.ts`) | any provenance-field change now flips `corpusSemanticDigest` (computed at bootstrap over the corrected projection) | unchanged `corpusId` + changed digest ≠ external `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA` ledger ⇒ CI FAIL, even with all candidate-local files edited (§9) | §8.1 `observedAt`-only, §8.2 `sourceId`-only, §8.3 `url`-only (each: digest change + old-ID CI fail; §8.2/§8.3 also prove `DecideInput`/`inputHash` change) | READY FOR FINAL INDEPENDENT CLOSURE GATE |

**All other findings remain CLOSED and are not reopened.**

---

# M3.5B-A2 EFFECTIVE DESIGN V4.4 READY FOR FINAL CORPUS-PROJECTION INDEPENDENT CLOSURE GATE

```
DESIGN ONLY.
NO IMPLEMENTATION AUTHORIZATION.
PRE-IMPLEMENTATION AUTHORITY BOOTSTRAP NOT YET COMPLETE.
A2 IMPLEMENTATION NOT AUTHORIZED.
B1/B2 NOT AUTHORIZED.
C1/C2 NOT AUTHORIZED.
PRODUCTION PROTOCOL v1 UNFROZEN.
WAVE 0 NOT AUTHORIZED.
```

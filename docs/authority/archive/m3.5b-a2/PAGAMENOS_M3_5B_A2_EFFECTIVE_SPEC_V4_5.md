<!-- R-B-17 ARCHIVAL HEADER - BEGIN. Added by the R-B-17 authority repair. Nothing below the END marker is altered. -->

> # HISTORICAL / NON-NORMATIVE
>
> **Status:** `HISTORICAL / NON-NORMATIVE - accepted-chain member, consolidated into the canonical A2 specification`
>
> **This document is retained as audit evidence only. It is NOT active authority and MUST NOT drive implementation, review, or gating.**
>
> **Active normative A2 specification:** `PAGAMENOS_M3_5B_A2_EFFECTIVE_SPEC_CANONICAL_V1.md`, which consolidates the accepted V4 to V4.5 chain without semantic change. This revision applied exactly one correction (RuleOperationalState.asOf and .note to INCLUDE); it is a 177-line patch and does NOT contain the A2 architecture.
>
> **Supersession language inside this file is non-operative.** Any claim below of the form "fully supersedes" or "fully replaces" described the review packet submitted to one historical gate. It does **not** supersede, and never superseded, the active normative artifact named above. See Appendix B of the canonical A2 specification for the full register of neutralized claims.
>
> **Body integrity.** Everything after the `R-B-17 ARCHIVAL HEADER - END` marker is the original file, byte for byte. Its SHA-256 before archival was:
>
> `sha256:327ba7656d4fb5623c8456a777ed8cb3e78cce08b4084f4bd8e3f3a1ded6526d`
>
> Verify with: `tail -n +23 <this file> | sha256sum`
>
> **Root authority register:** `PAGAMENOS_SPEC_AUTHORITY.md` · **Repair record:** `PAGAMENOS_R_B_17_AUTHORITY_REPAIR_REPORT.md`

<!-- R-B-17 ARCHIVAL HEADER - END -->

# PAGAMENOS — M3.5B-A2 EFFECTIVE PRE-IMPLEMENTATION SPECIFICATION — V4.5

**Milestone:** M3.5B-A2 — PurchaseIntent lifecycle · deterministic decision-request freezing · exact snapshot binding · crash-repair saga.
**Status:** DESIGN / DOCUMENTATION ONLY. No code / Prisma / migrations / branches / commits / authority-bootstrap / corpus-ledger / holiday-registry artifacts / CI-variable changes / A2 implementation / B1/B2 / C1/C2 / Production-Protocol freeze / deployment / Wave 0.
**Nature:** self-contained; **fully supersedes V1–V4.4 for review.** A reviewer needs only (1) this document, (2) accepted A1 spec `PAGAMENOS_M3_5B_A1_EFFECTIVE_SPEC_V2_1.md`, and (3) the accepted repository.

**Origin:** the independent Codex Sol V4.4 gate returned `# B — M3.5B-A2 V4.4 REQUIRES BOUNDED PATCH`, confirming **FULL `RuleVersion.provenance` COVERAGE = PASS**, and leaving one remaining design defect: `A2-CORPUS-PROJECTION-INCOMPLETE`, with exactly two omitted fields — `RuleOperationalState.asOf` and `RuleOperationalState.note`. V4.5 reclassifies only these two fields and propagates wording mechanically. It is not a redesign and reopens nothing else.

**Accepted baselines (verified present, `C:/Users/piero/pagamenos-a1`, inspected READ ONLY):** M3.5A `64cf864a817c137920204487ab3317bc6d4c9ba5`; M3.5B-A1 `99f2d61bc45839d6f9506abee5fae641bfcd8b2e`; A1 doc child `7c0a3d9e0add34e4823c01f22c21542817dbc881`.

---

## 1. Gate state carried forward (CLOSED / READY — not reopened)

Confirmed at the V4.4 gate and carried **unchanged**: full `RuleVersion.provenance` coverage (`sourceId` + `url` + `observedAt`, all INCLUDE); `A2-PORTFOLIO-COMPARATOR-UNDERSPECIFIED`; `A2-DG-01`; `A2-DG-02`; `A2-DG-03`; `A2-DG-H02`; `DG-04`; `DG-05`; `DG-06`; `H01`; `H04`; `H05`; Holiday Fixture v1 (`pagamenos.holiday.pe-lima-callao.private-commerce.v1`, digest `sha256:6d65409665d176d40390be4ed8414dc22e4ab9d11b40ede1d38abb7b258460d8`, coverage `2026-01-01…2027-12-31`, legal policy); COMPLETE-SIGNATURE-ONLY context policy; operational-state cardinality (exactly one state per included rule; duplicate/missing/orphan → fail); consent Model A; trusted entry provenance; reload-and-prove P2002; portfolio normalization/comparator; binding model; crash-repair saga; parser/loadability retention; external protected `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA` governance. These are touched only for unavoidable wording references.

---

## 2. The single open finding (verified)

### `A2-CORPUS-PROJECTION-INCOMPLETE` — `RuleOperationalState.asOf`, `.note`
V4.4 classified `RuleOperationalState.asOf → EXCLUDE` and `.note → EXCLUDE` on the reasoning that neither is consumed by `decide()`. The V4.4 gate proved this violates V4.4's own corrected corpus-authority principle (§6). Verified against accepted code:

1. **`RuleOperationalState` contains exactly** `{ ruleId, version, publicationState, sourceQualityState, availability, asOf, note? }` (`src/corpus/types.ts` `interface RuleOperationalState`).
2. **`ruleOperationalStateSchema` includes both** `asOf: z.string().min(1)` and `note: z.string().optional()` (`src/persistence/schema.ts`).
3. **Full `RuleOperationalState[]` is inside the validated `engineInputV1Schema`** (`engineInputV1Schema.operationalStates`).
4. **The entire validated `DecideInput` is** canonicalized → SHA-256-hashed → persisted as `engineInputJson` → protected by `inputHash` → verified by historical integrity/replay (`snapshot.ts`/`hash.ts`/`canonical.ts`/`integrity.ts`).
5. **Therefore** changing only `asOf` or only `note` changes the exact frozen M3.5A input identity, even though neither is directly consumed by `decide()`.

Independently demonstrated: an `asOf`-only mutation, or a `note`-only mutation, left the V4.4 corpus semantic digest unchanged while changing the exact validated `inputHash`. This is the sole remaining defect.

---

## 3. Required patch

Reclassify (the ONLY semantic-projection change in V4.5):
```
RuleOperationalState.asOf → INCLUDE
RuleOperationalState.note → INCLUDE WHEN PRESENT
```

---

## 4. Updated `RuleOperationalState` projection table

| Field | Projection |
| :-- | :-- |
| `ruleId` | INCLUDE |
| `version` | INCLUDE |
| `publicationState` | INCLUDE |
| `sourceQualityState` | INCLUDE |
| `availability` | INCLUDE |
| `asOf` | **INCLUDE** |
| `note` | **INCLUDE WHEN PRESENT** |

No `RuleOperationalState` field remains excluded. Read-only inspection confirms the type/schema has exactly these seven fields; no other field exists to classify.

---

## 5. Governing principle (carried from V4.4, applied consistently)

> A historical `corpusId` MUST bind every corpus field whose value participates in the exact validated `DecideInput`, M3.5A input hashing, corpus-authenticity verification, persisted decision history, historical integrity verification, replay semantics, decision output, decision status, candidate economics, advisories, or decision-bound proof/audit material.

Direct use by `decide()` is **not** required for inclusion. Because `asOf` and `note` participate in the frozen validated `DecideInput` and its hash / persistence / replay identity, they belong to the corpus authority projection. No separate "documentary" exception is invented for values already frozen into the authenticated input.

---

## 6. `asOf` normalization

`asOf` enters the projection using the **exact value accepted by the existing `RuleOperationalState` schema** (a non-empty string, e.g. `"2026-09-01T00:00:00-05:00"`). It is **not** timezone-converted, reformatted, truncated, replaced with current time, derived from rule provenance, locale-normalized, or scientifically reinterpreted. This inclusion is about exact frozen input authority, **not** C2 event/knowledge-time analysis; **R35R-19 remains DEFERRED** (§12).

---

## 7. `note` normalization (optional field)

- **When absent:** preserve semantic absence exactly as the accepted validated schema + canonical serializer represent it (the accepted canonicalizer drops an `undefined`/absent optional key — §canonical.ts). No `note: ""` or `note: null` is invented.
- **When present:** use the exact validated string verbatim — no trim, lowercase, rewrite, whitespace normalization, or semantic interpretation. Purpose only: `same corpusId ⇒ same exact frozen operational-state input`. No product behavior is inferred from the note.

---

## 8. `asOf` attack test (required)

From the accepted corpus: baseline `operationalState.asOf = A` → semantic digest `D1`; change ONLY `operationalState.asOf = B` → `D2`. Require `D1 != D2`. Independently prove the exact validated `DecideInput`/`inputHash` changes (the persisted `engineInputJson.operationalStates[i].asOf` differs, so `canonicalHash(input)` differs). With an unchanged historical `corpusId`: candidate digest ≠ external authority ledger ⇒ **CI FAIL**, even if the candidate edits all local authority files.

---

## 9. `note` attack test (required)

Using a corpus state where `note` is absent or a controlled diagnostic copy: `note absent → note = "diagnostic-change"` with every other field unchanged ⇒ corpus semantic digest changes **and** exact validated `DecideInput`/`inputHash` changes; unchanged historical `corpusId` ⇒ external-ledger mismatch ⇒ **CI FAIL**. Also test `note = "A" → note = "B"` ⇒ digest changes. A schema-valid diagnostic mutation is sufficient (the current corpus need not have a populated `note`).

---

## 10. Complete operational-state authority test

Property/table-driven testing mutates EACH `RuleOperationalState` field independently — `ruleId`, `version`, `publicationState`, `sourceQualityState`, `availability`, `asOf`, `note`. Every schema-valid mutation MUST either change `corpusSemanticDigest`, or fail validation because an identity/coherence invariant (e.g. op-state cardinality, §1) was broken. **No valid field mutation may leave the semantic digest unchanged.**

---

## 11. Final exhaustiveness audit (read-only)

Structural comparison among `ComparisonScope`, every `PurchaseSignature` variant, `RuleVersion`, `RuleOperationalState`, `engineInputV1Schema`, and the `normalizeCorpusSemanticProjection` specification. The corpus-owned inputs to the frozen `DecideInput` are `scopes` (`ComparisonScope`, all fields incl. `signature`), `rules` (`RuleVersion`, all fields incl. full `provenance` per V4.4), and `operationalStates` (`RuleOperationalState`, all seven fields after V4.5). The non-corpus `DecideInput` fields (`portfolio`, `context`, `evaluatedAt`, `intendedTransactionAt`, `selectedScopeId`, `holidayCalendar`, `baselineByScopeId`) are A2 / participant / holiday-fixture authorities, bound separately and already closed. After including `asOf` and `note`, every corpus-owned field that can appear in the exact validated/frozen `DecideInput` participates in the semantic corpus projection.

```
NO ADDITIONAL OMITTED CORPUS-AUTHORITY FIELD FOUND
```
No hypothetical future field is invented; no unrelated domain is reopened.

---

## 12. Carried-forward projection + governance (unchanged)

Unchanged from V4.4: full `RuleVersion` projection (all fields INCLUDE, incl. `provenance.sourceId`/`url`/`observedAt`); `ComparisonScope` projection (all fields INCLUDE); `PurchaseSignature` projection (all INCLUDE); `constraints` projection (all decision-relevant subfields INCLUDE); top-level ordering (`scopes` by `scopeId`; `activeRules` by `(ruleId, version)`; `operationalStates` by `(ruleId, version)`); duplicate-stable-identity rejection; SET-LIKE array normalization (duplicates invalid → fail; canonical sort) for `requiredContext`, `allowedSelectors`, `canonicalItems`(by `itemKey`), `merchantIds`, `comparisonScopeRefs`, `weekdays`(MON..SUN index), `channels`, `specificBlackoutDates`, `locations.include/exclude`, `products.includeSku/excludeSku`; `corpusId` EXCLUDED from the digest; and the external protected `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA` governance with its candidate-local self-approval defense. **V4.5 changes exactly `asOf` EXCLUDE→INCLUDE and `note` EXCLUDE→INCLUDE-WHEN-PRESENT, and nothing else.** For `asOf`/`note` mutations, the candidate-local self-approval attack (edit corpus + local `CORPUS_RELEASE_LEDGER_V1` + local expected digest + every local authority file, keep old `corpusId`) still fails because the accepted historical ledger is loaded from the externally-supplied protected full Git SHA.

---

## 13. SCI effect (stated, not self-accepted)

V4.5 is intended to make **SCI-A2-18 = READY FOR FINAL INDEPENDENT CLOSURE REVIEW**. Carried from prior independent gates, unchanged and not reopened: **SCI-A2-05 = READY**, **SCI-A2-12 = READY**, **SCI-A2-17 = READY**. All other SCI-A2 clauses carried unchanged.

---

## 14. R35R effect

The final affected item is **R35R-11 A2**, whose remaining dependency V4.5 is intended to close through SCI-A2-18 (pending independent review). Carried: **R35R-15 A2 = CLOSED**; **R35R-19 = DEFERRED NON-BLOCKING**. No B/C closure is claimed.

---

## 15. Authority bootstrap still must not run

```
PRE-IMPLEMENTATION AUTHORITY BOOTSTRAP = REQUIRED / NOT YET COMPLETE
```
Sequence:
```
V4.5
→ independent final single-finding gate
→ if A:
   compute corrected corpusSemanticDigest at exact 64cf864 using the V4.5 projection
→ create CORPUS_RELEASE_LEDGER_V1
→ create/verify HOLIDAY_CALENDAR_REGISTRY_V1
→ independently verify authority bootstrap
→ create accepted authority-baseline commit
→ set protected PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA
→ only then authorize A2 implementation
```
V4.5 does **not** compute or hand-author the final authority corpus digest hex.

---

## 16. No regression (explicit)

V4.5 does not modify: the full `RuleVersion` projection from V4.4; portfolio normalization/comparator; Holiday Fixture v1; the holiday digest `sha256:6d654096…60d8`; holiday legal policy; holiday coverage; external base-SHA governance; consent Model A; trusted entry provenance; reload-and-prove P2002; COMPLETE-SIGNATURE-ONLY context policy; operational-state cardinality; the context request hash; the binding model; the crash-repair saga; DecisionRequest semantics; runtime version gates; parser/loadability retention; invalidation; A1; M3.5A economic semantics; B/C. The **only** change is `RuleOperationalState.asOf` EXCLUDE→INCLUDE and `.note` EXCLUDE→INCLUDE-WHEN-PRESENT (§3/§4).

---

## 17. V4.5 Closure Matrix (single finding)

| Finding | V4.4 remaining attack | Exact patch | Accepted-code authority | Semantic-digest effect | inputHash effect | External-ledger effect | Attack tests | State |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| **A2-CORPUS-PROJECTION-INCOMPLETE** | `asOf`-only and `note`-only mutations left the V4.4 corpus digest unchanged while changing the exact validated `inputHash` — same `corpusId` + same digest could denote a different frozen operational-state input | reclassify `RuleOperationalState.asOf` INCLUDE and `note` INCLUDE-WHEN-PRESENT (§3/§4); apply the V4.4 governing principle consistently (§5); exact-value normalization (§6/§7) | `RuleOperationalState = {ruleId,version,publicationState,sourceQualityState,availability,asOf,note?}` (`corpus/types.ts`); `ruleOperationalStateSchema` includes `asOf`+`note?` (`schema.ts`); full `operationalStates[]` ∈ `engineInputV1Schema`; `inputHash==SHA-256(canonical(DecideInput))` (`snapshot.ts`/`hash.ts`); replay/integrity (`integrity.ts`) | any `asOf`/`note` change now flips `corpusSemanticDigest` (computed at bootstrap over the corrected projection) | any `asOf`/`note` change flips the exact validated `inputHash` | unchanged `corpusId` + changed digest ≠ external `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA` ledger ⇒ CI FAIL, even with all candidate-local files edited (§12) | §8 `asOf`-only; §9 `note` absent→present and A→B; §10 per-field op-state property test | READY FOR FINAL INDEPENDENT CLOSURE GATE |

**All other findings remain CLOSED and are not reopened.**

---

# M3.5B-A2 EFFECTIVE DESIGN V4.5 READY FOR FINAL SINGLE-FINDING INDEPENDENT CLOSURE GATE

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

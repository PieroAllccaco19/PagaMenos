# PAGAMENOS — PHASE 0A-2: RT-04 FINAL CLOSURE MICRO-PATCH

**Precedence:** amends only the RT-04 text of `…_REDTEAM_PATCH_REV2.md` (§3.B and the RT-04 rows of §8/§9). Where this micro-patch changes it, **this wins.** RT-02/05/10/11/14 remain CLOSED and untouched.
**Scope:** close the single remaining defect — the `signature.kind` compatibility bypass. Tiny, normative. No architecture, no code, no reopening of CLOSED findings.

---

## 1. RT-04 Micro-Patch Decision

**ACCEPTED.** The bypass is closed by making `PurchaseSignature.kind` a **derived consequence of rule semantics**, not a corpus-authoring choice. A pure `deriveRequiredSignatureKind(rule)` is introduced; the corpus linter blocks any scope whose declared `signature.kind` disagrees with the derived kind of a member rule, and there is **no override flag**. Manual assignment of `ELIGIBLE_BILL` to an exact-package rule now fails seed acceptance.

---

## 2. `PurchaseSignatureKind`

```ts
type PurchaseSignatureKind = 'EXACT_BUNDLE' | 'ELIGIBLE_BILL' | 'TICKETS' | 'NOMINAL_PACKAGE'
```

---

## 3. `deriveRequiredSignatureKind(rule)` Semantics

```ts
function deriveRequiredSignatureKind(rule: RuleVersion): PurchaseSignatureKind
```
Pure, total, **fail-closed**, evaluated in strict precedence (first match wins):

1. **NOMINAL_PACKAGE** — `benefit.type === 'NON_CASH_NOMINAL'` (same-unit non-cash package, e.g. `pay S/45 → 85 CONEY_PLAY_BALANCE`). Preserves the RT-06 prerequisites (unit + known equal cash acquisition cost).
2. **TICKETS** — the rule's value depends on a defined ticket quantity/class or ticket-unit structure: `eligibleSpendSelector === 'TICKET_UNIT'`, ticket-count-specific `TWO_FOR_ONE`, or a fixed ticket-package price (UVK O4 fixture). The signature MUST preserve `ticketCount`/`ticketClass` where material.
3. **EXACT_BUNDLE** — the rule identifies a specific product/package composition. At minimum: `eligibleSpendSelector === 'EXACT_SKU_BUNDLE'`; `benefit.type === 'FIXED_BUNDLE'` referring to a defined product/package; `benefit.type === 'FIXED_PRICE'` for a defined product/package; explicit product/SKU **include** rules that define the purchased package; or any rule whose value is valid only for one exact item/quantity composition. Such a rule **MUST NOT** be `ELIGIBLE_BILL`.
4. **ELIGIBLE_BILL** — only a genuine general real-world bill/purchase occasion where composition is **not** the promotion identity, and the selector is a general-bill selector (`WHOLE_BILL` | `FOOD_ONLY` | `FOOD_PLUS_NONALCOHOLIC`): percentage/fixed discount over the eligible bill/subtotal (Perroquet remains valid — same `ELIGIBLE_BILL` occasion, BCP `FOOD_PLUS_NONALCOHOLIC` vs Diners `FOOD_ONLY`; differing subtotals do **not** make the purchase non-equivalent).

If a rule matches none of 1–4 (e.g. no specific trigger and no general-bill selector), the function does not default — it is **undeterminable ⇒ linter rejects the rule (seed fail)**. Derivation depends solely on rule semantics, never on `purchaseKind`/`equivalenceGroup`/`purchaseDomain`.

---

## 4. Blocking Linter Invariant

For **every** rule assigned to a `ComparisonScope`:
```
scope.signature.kind == deriveRequiredSignatureKind(rule)
```
Consequently all rankable members of a scope derive the **same** kind (and it equals the scope's). Seed acceptance **MUST fail** on any mismatch. There **MUST NOT** be a generic override (e.g. `allowSignatureKindOverride`). For Phase 0A the rule is strict equality — **no compatibility set is defined**; if one is ever introduced it MUST be a deterministic, corpus-controlled, reviewed allowlist table, never a free flag.

---

## 5. Exact-Bundle Structural Normalization / Check

For an `EXACT_BUNDLE` scope, the linter additionally requires, for **every** rankable member:
```
normalize(rule-derived canonicalItems) == normalize(scope.signature.canonicalItems)
```
`normalize(items)` is deterministic and fail-closed:
- **item keys** are stable/corpus-controlled;
- **quantities** are positive integers (`qty ≥ 1`; non-integer or `≤ 0` ⇒ reject);
- **duplicate item keys** ⇒ **reject** (no implicit collapsing);
- **sort** ascending by `itemKey`;
- equality is element-wise on `(itemKey, qty)`.

Two unequal exact bundles therefore **cannot** enter the same rankable scope.

---

## 6. Required Regression Tests (specification requirements)

1. **RT04-BUNDLE-BYPASS (Pizza-Hut-class):** Rule A = exact bundle *Pizza A + drink*, Rule B = exact bundle *Pizza B + sides* (both semantically `EXACT_BUNDLE`), both **mislabeled** `signature.kind = ELIGIBLE_BILL`, `purchaseDomain = GENERAL_MEAL` ⇒ **CORPUS LINT FAILURE before seed acceptance**.
2. exact bundle correctly assigned `EXACT_BUNDLE` ⇒ **allowed**.
3. genuine Perroquet general-bill rules (`FOOD_PLUS_NONALCOHOLIC` + `FOOD_ONLY`, one `purchaseDomain`) assigned `ELIGIBLE_BILL` ⇒ **allowed**.
4. ticket rule mislabeled `ELIGIBLE_BILL` ⇒ **rejected**.
5. nominal package mislabeled `ELIGIBLE_BILL` ⇒ **rejected**.
6. two **unequal** `EXACT_BUNDLE` compositions in one scope ⇒ **rejected** (structural check).
7. normalization failures — non-integer/`≤0` qty, or duplicate `itemKey` ⇒ **rejected**.

---

## 7. Superseded / Affected RT-04 Text

- Rev 2 §3.B — `PurchaseSignature.kind` as an **authored/manually-selected** field ⇒ **superseded**: `kind` is now derived by `deriveRequiredSignatureKind(rule)` and linter-enforced.
- Rev 2 §3.B — bundle-composition check applied "only if the scope was already classified `EXACT_BUNDLE`" ⇒ **superseded**: the kind is derived first, so mislabeling can no longer skip the composition check.
- §8/§9 RT-04 rows — additively tightened with the derived-kind invariant (§4), exact-bundle normalization (§5), and tests (§6).
- `purchaseKind`, `equivalenceGroup`, `purchaseDomain` remain **organizational identifiers only** and MUST NOT weaken the invariant. No new override flag is permitted.

Attaches to **M1 (linter)**; no other milestone changes.

---

## 8. Remaining RT-04 Ambiguity

**None.** The derivation is total and fail-closed; the only extension point (compatibility sets) is constrained to deterministic corpus-controlled tables with no free override, and none is defined for Phase 0A.

---

## 9. READY FOR RT-04-ONLY SOL CLOSURE CHECK — **YES**

**Canonical invariant (frozen):** *purchase-signature kind is a consequence of rule semantics, not a free corpus-authoring choice.* No code written, no architecture reopened, no CLOSED finding touched. On RT-04 clearance the specification is fully closed and **M0 → M3** may begin under the standing revised DoD.

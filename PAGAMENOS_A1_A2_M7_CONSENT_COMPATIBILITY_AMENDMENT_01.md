# PAGAMENOS — A1/A2 → M7 NARROW CONSENT COMPATIBILITY AMENDMENT 01

## Executor-Sealed Patch of the Sealed-Operation Candidate — Still Amendment 01

```
A1/A2→M7 CONSENT COMPATIBILITY AMENDMENT 01 CANDIDATE ONLY — NOT SELF-ACCEPTED
EXECUTOR-SEALED PATCH OF AMENDMENT 01 — NOT A SECOND AMENDMENT
M7 EFFECTIVE SPEC V1 REMAINS BLOCKED
M7 IMPLEMENTATION NOT AUTHORIZED
B1 IMPLEMENTATION NOT AUTHORIZED

NEW CONSENT SEMANTICS        : 0
NEW A1 SEMANTIC DECISIONS    : 0
NEW A2 SEMANTIC DECISIONS    : 0
NEW M7 DOMAIN SEMANTICS      : 0
NEW B/C SEMANTICS            : 0
```

**Nature.** Authority-compatibility work only. This document closes exactly two document-level defects found by independent audit in the immediately previous candidate. It authorizes a security capability boundary, not an implementation. It changes no runtime code, no Prisma schema, no migration, and edits no accepted specification in place, including `PAGAMENOS_SPEC_AUTHORITY.md`. It is a **candidate**: it carries no authority until independently accepted.

**Correction notice.** This file is the executor-sealed patch of Amendment 01. It is **not** Amendment 02. Four prior candidates of the same amendment exist and are superseded:

| Item | Value |
| :-- | :-- |
| 1st candidate | `ce06bc9fc7cdbaa5299f84369c0b027e70d1d404` — REQUIRES PATCH |
| 2nd candidate (Model A callback) | `bc8a3a09593ed29167ca8b141d9e8a33b2e533ec` — REQUIRES PATCH |
| 3rd candidate (operation port + façade) | `1a612019fff9ae9e7d6d2c2ad3ed091a26bb7136` — REQUIRES PATCH |
| 4th candidate (sealed-operation) | `c2218661581db9aae80703e99909af09cb7b9f73` — REQUIRES PATCH (`CCA01S-AUD-01`, `CCA01S-AUD-02`) |
| Status of all four | **NON-AUTHORITATIVE AUDIT EVIDENCE ONLY.** None is an ancestor of this candidate. Nothing in any of them has force unless restated here. |

```
ce06bc9fc7cdbaa5299f84369c0b027e70d1d404 ANCESTOR OF THIS CANDIDATE: NO
bc8a3a09593ed29167ca8b141d9e8a33b2e533ec ANCESTOR OF THIS CANDIDATE: NO
1a612019fff9ae9e7d6d2c2ad3ed091a26bb7136 ANCESTOR OF THIS CANDIDATE: NO
c2218661581db9aae80703e99909af09cb7b9f73 ANCESTOR OF THIS CANDIDATE: NO
```

**Conventions.** MUST / MUST NOT / MAY are normative. `CCA-*` identifiers belong to this amendment lineage. "A1 §n" = the accepted A1 effective specification. "A2 §n" = the accepted A2 canonical specification. "RT-17" = the accepted base-study red-team patch, upload condition. "Register §n" = `PAGAMENOS_SPEC_AUTHORITY.md`. Names are **illustrative unless this document fixes them as exact**; the physical method surface belongs to M7 V1.1 within the constraints stated here.

---

## 1. Purpose

The sealed-operation candidate (`c221866…`) correctly removed every M7-reachable capability value — callback, port, façade, Prisma transaction, purpose argument, detachable authorization result — and replaced the authorization surface with sealed, statically-policy-bound entry points backed by a fixed trusted executor and a hidden tracked adapter. Independent audit accepted that architecture structurally, with two residual document-level defects:

- **`CCA01S-AUD-01` — executor DB-capability escape.** The prior candidate stated the executor is "non-exported outside the trusted integration layer" and that the adapter is constructed only inside it, but never normatively restricted what the executor implementation itself is permitted to *import*. Nothing in the prior text prevented an executor from importing the Prisma client, `@/db/client`, an existing repository, a transaction helper, or a service locator directly, alongside or instead of the tracked adapter — which would let a future implementation silently defeat every guarantee built on "the adapter is the only DB-reachable surface."
- **`CCA01S-AUD-02` — over-broad transaction/assignment enforcement.** §27 of the prior candidate stated a blanket static-enforcement obligation against "direct `$transaction` calls outside the CCA engine" and "direct `experiment_assignment` access outside the CCA engine," without qualification. Read literally this would prohibit the accepted, already-in-production A1 and A2 transaction and assignment-lock owners enumerated in §34 below, which predate this amendment and are not being redesigned by it.

This patch closes both defects and closes them **only**:

- §15–§20 add a normative **executor capability contract** — an explicit allowlist of what a trusted integration executor may import, an explicit forbidden list, a diagram of the one permitted DB-reaching edge, and constructor restrictions — so `CCA01S-AUD-01` closes structurally rather than by policy statement alone.
- §33–§39 replace the prior blanket §27 prohibition with an explicit three-class **transaction/assignment-owner allowlist** (accepted existing owners / new CCA owner / everyone else), grounded in an exact inventory of the accepted baseline's current transaction and assignment-access sites, so `CCA01S-AUD-02` closes without retroactively prohibiting anything already accepted.

Everything else accepted in `c221866…` — consent semantics, AGR, temporal semantics, the service clock, the sealed-operation architecture, operation→policy binding, the purpose-oracle closure, `LockedCollectionScope`, assignment ownership re-proof, the tracked adapter, `activeCount`, the zero-in-flight commit gate, the replay/new-collection distinction, the replay race re-check, `DatabaseExecutionContext`, the top-level CCA procedure, CCA re-entry protection, and the canonical lock order — is restated here **unchanged**, not redesigned.

---

## 2. Exact baseline

| Item | Value |
| :-- | :-- |
| **Protected baseline commit** | `a67758e6c18c692bc635db416af576356f03b48d` (= `origin/m3.5b-b-integration` at fetch) |
| Excluded — 1st candidate | `ce06bc9fc7cdbaa5299f84369c0b027e70d1d404` — not an ancestor |
| Excluded — 2nd candidate | `bc8a3a09593ed29167ca8b141d9e8a33b2e533ec` — not an ancestor |
| Excluded — 3rd candidate | `1a612019fff9ae9e7d6d2c2ad3ed091a26bb7136` — not an ancestor |
| Excluded — 4th candidate | `c2218661581db9aae80703e99909af09cb7b9f73` — not an ancestor |

This candidate is authored fresh on the protected baseline. Nothing in any excluded commit is inherited by Git history; whatever this document reuses from them is restated in full below, not incorporated by reference.

**Runtime identity.** No path under `src`, `prisma`, `scripts-trusted`, `.github`, `package.json`, `pnpm-lock.yaml` or `eslint.config.mjs` is touched by this candidate. It adds exactly one document. The dirty pre-existing worktree at the primary project path (branch `m3.5b-b1-implementation`, staged B1 work) is untouched — this candidate was authored in an isolated worktree/branch created directly from the protected baseline commit.

---

## 3. Controlling authority

| Authority | Relationship |
| :-- | :-- |
| A1 effective specification (V2.1 lineage) | sole semantic source for consent; unchanged |
| A2 canonical specification | consumer precedent and existing capability boundary; unchanged |
| Base study authority (RT-17) | source of the optional-evidence upload condition; unchanged |
| Register | read only; not edited |

**Precedence.** This amendment, if accepted, is subordinate to the base study authority, A1 and A2. It controls only the capability-boundary decisions in §47. Where any statement here appears to alter a semantic of the base study authority, A1 or A2, that authority controls and the statement is void.

---

## 4. Preserved acceptances — not reopened

```
AGR CLASSIFICATION                                 : FAITHFUL
CONSENT TEMPORAL SEMANTICS CHANGED                  : NO
NEW CONSENT SEMANTICS                               : 0
NEW A1 SEMANTICS                                    : 0
NEW A2 SEMANTICS                                    : 0
NEW M7 DOMAIN SEMANTICS                             : 0
NEW B/C SEMANTICS                                   : 0

unchanged A1 predicate                              : PRESERVED
unchanged A1 fact reader                            : PRESERVED
accepted service clock                              : PRESERVED
accepted millisecond behavior                       : PRESERVED
READ COMMITTED                                      : PRESERVED
assignment lock                                     : PRESERVED
AGR                                                 : PRESERVED
RT-17 optionalEvidenceConsent enforced inside A1    : PRESERVED
generic consumer-visible NOT_AUTHORIZED             : PRESERVED
```

None of these is redesigned by §5 onward. Only the executor capability boundary (§15–§20) and the transaction/assignment allowlist (§33–§39) are new relative to `c221866…`; every other section restates prior-accepted content.

---

## 5. Architectural simplification — what M7 no longer receives

Unchanged from the sealed-operation candidate. The consumer-facing architecture deletes the concept that M7 receives any of: a callback; a port supplied, selected, or constructed at runtime; a façade, narrow or otherwise; a Prisma transaction or transaction client; a `purpose` argument; a detachable authorization result.

```text
business request
      ↓
sealed operation-specific entry point
      ↓
CCA internal transaction boundary
      ↓
assignment lock + ownership re-proof
      ↓
consent evaluation
      ↓
fixed trusted operation executor
      ↓
exact operation-specific tracked-adapter interface
      ↓
private tracked-adapter implementation
      ↓
hidden TransactionClient
      ↓
commit / rollback
```

The M7 caller never receives the transactional capability. It receives only the sealed entry point's own return value.

```
TRANSACTION CAPABILITY EXPOSED TO M7 CALLER: NO
```

---

## 6. Sealed operation-specific entry points

Unchanged. There is **no** generic `withCollectionConsentAuthorization(...)` importable by M7, and **no** `authorize(purpose, callback)` of any shape. Each consent-conditioned collection operation is exposed as exactly one sealed business-operation function, illustratively:

```ts
recordAuthorizedOutcome(input, trustedContext): Promise<OutcomeRecord | NOT_AUTHORIZED>
submitAuthorizedSavingEvidence(input, trustedContext): Promise<EvidenceRecord | NOT_AUTHORIZED>
```

Names, parameter order, and exact M7 business fields are illustrative and not frozen by this amendment unless already authoritative elsewhere.

> Each consent-conditioned collection operation has exactly one sealed entry point whose consent policy is fixed by construction.

---

## 7. No caller-selectable consent policy

Unchanged. The caller cannot supply, as a runtime value: `GENERAL`; `OPTIONAL`; a purpose enum; a policy selector; an operation-capability ID; a function or callback; or an executor. Integration wiring fixed at composition time determines the mapping:

```text
Outcome collection        → A1 §8.8 general collection authorization
SavingEvidence upload      → A1 §8.8 + RT-17 optionalEvidenceConsent
```

```
CALLER CAN SELECT POLICY: NO
```

---

## 8. Canonical consent-evaluation core — restated unchanged

### 8.1 Single semantic source

**CCA-SEM.** The only semantic source for collection-time consent authorization is A1's collection-time knowledge rule, as implemented by the accepted predicate. For the optional-evidence purpose, RT-17 is applied to the accepted grant material. No consumer maintains a second consent algorithm. M7 maintains none.

### 8.2 Predicate, reader, clock — unchanged

- **CCA-PRED.** The single implementation is the accepted predicate in [src/study/consent-state.ts](src/study/consent-state.ts). No diff to that file is authorized.
- **CCA-FACTS.** Facts are read only through the accepted reader. No new reader is authorized.
- **CCA-CLOCK.** The collection instant is sampled from the accepted trusted service clock, after the assignment lock, in the same transaction, exactly once.

```
CONSENT TEMPORAL SEMANTICS CHANGED: NO
```

### 8.3 AGR — preserved exactly

```
AGR(facts, collectionAt):
  iso := collectionAt.toISOString()
  dec := Date.parse with NaN -> throw

  AGR-1  visible   := facts where dec(recordedAt) <= dec(iso)
  AGR-2  intervals := deriveConsentAuthorizationIntervals(visible)
  AGR-3  grants    := orderBySeq(visible) restricted to action = 'GRANTED'
  AGR-4  require |intervals| = |grants|, and each INTERVAL's startAt equals its
         opening grant's capturedAt                                     else CONSENT_HISTORY_INTEGRITY_FAILURE
  AGR-5  containing := INTERVAL entries whose [startAt, endAt) contains iso
  AGR-6  require |containing| = 1                                        else CONSENT_HISTORY_INTEGRITY_FAILURE
  AGR-7  g := grant at the single containing index;
         require typeof g.optionalEvidenceConsent = 'boolean'           else CONSENT_HISTORY_INTEGRITY_FAILURE
  AGR-8  return g.optionalEvidenceConsent === true
```

```
AGR CLASSIFICATION: FAITHFUL
```

---

## 9. Cross-purpose oracle — exact closure

Unchanged. There is no authorization wrapper exposed to M7 at all. A caller can observe consent enforcement only by attempting the corresponding actual business operation with structurally valid operation material.

```
AUTHORIZATION-ONLY PROBE API: NONE
CALLER-SUBSTITUTABLE EXECUTOR: NO
```

### 9.1 Mandatory operation material

Each sealed operation defines a non-empty, structurally meaningful input grammar. The implementation MUST reject malformed or non-operation input **before** entering CCA.

```
NO VALID DOMAIN OPERATION INPUT → NO CONSENT EVALUATION
```

### 9.2 Confidentiality is narrower than secrecy of enforcement

Unchanged. The system MUST NOT expose `optionalEvidenceConsent` itself, a grant identity, an interval, or a reason distinguishing why general and optional evaluation differed, and MUST NOT expose a standalone probing primitive.

---

## 10. Separate sealed leaf modules

Unchanged. Illustratively:

```text
src/db/m7-authorized-outcome-operation.ts
src/db/m7-authorized-evidence-operation.ts
```

Each leaf implements exactly one business operation, has exactly one fixed consent policy, imports the private A1 CCA engine and exactly one trusted executor (§14–§20), cannot import the other leaf, cannot select another policy, and cannot export the CCA engine or the executor.

---

## 11. Public/business caller boundary

Unchanged. The higher (M7 business) layer may call the Outcome business operation and the SavingEvidence business operation. It MUST NOT have any way to invoke CCA directly, AGR, the consent predicate, the consent fact reader, an operation policy selector, or an executor directly.

---

## 12. Explicit operation input channel

Unchanged.

```ts
interface SealedOperation<I, R> {
  execute(
    trustedParticipantContext: TrustedParticipantContext,
    input: Readonly<I>,
  ): Promise<R | typeof NOT_AUTHORIZED>
}
```

```
input cannot select operation type                      : REQUIRED
input cannot select consent policy                       : REQUIRED
input cannot supply authorization truth                  : REQUIRED
input cannot supply participant truth                    : REQUIRED
input cannot supply a different trusted assignment
  as authoritative                                        : REQUIRED
input cannot supply a DB transaction or capability        : REQUIRED
input is immutable from entry through transaction         : REQUIRED
```

### 12.1 Assignment-bound operation input

`input` may carry references the domain operation needs, but assignment authority never comes from an input field — it comes from the trusted participant context, the locked assignment scope (§13), and relational re-proof (§14, §21). If `input` references an upstream entity belonging to a different assignment, the operation fails and the transaction rolls back.

```
CCA01F-AUD-05 (missing operation-input channel): CLOSED — see §12, §46
```

---

## 13. Trusted assignment binding — `LockedCollectionScope`

Unchanged. The canonical internal procedure MUST:

1. validate `TrustedParticipantContext`;
2. identify the target assignment reference required by the concrete operation;
3. lock `ExperimentAssignment FOR UPDATE`;
4. re-prove `locked.participantId == trustedParticipantContext.participantId`;
5. bind a private internal `LockedCollectionScope` containing at minimum: the locked assignment identity; the trusted participant identity; the operation identity; the consent policy.

`LockedCollectionScope` never reaches the caller. It is constructed only inside the sealed operation's own execution and is passed only to the trusted executor and the tracked adapter.

```
CCA01F-AUD-01 (assignment binding): CLOSED — see §13, §46
LockedCollectionScope DEFINED: YES
```

---

## 14. Fixed trusted executor and assignment-bound persistence

For each sealed operation, the executor implementation identity is statically fixed by composition-root wiring:

```text
sealed operation → exact trusted executor
```

The caller cannot pass an executor, callback, function pointer, strategy, or port implementation. The executor itself is non-exported outside the trusted integration layer. §15–§20 below now additionally restrict what the executor is permitted to *import and hold*, which is the exact gap `CCA01S-AUD-01` identified in the prior candidate.

Every scientific/domain persistence the executor's operation triggers MUST either (A) derive its assignment from `LockedCollectionScope`, or (B) relationally re-prove that its upstream material belongs to that same locked assignment, at the tracked-adapter layer (§21). No persistence method may accept an unconstrained caller-selected `assignmentId` and trust it.

```
AUTHORIZED ASSIGNMENT A → DOMAIN ROW FOR ASSIGNMENT B: IMPOSSIBLE
CCA01F-AUD-01 executor-side binding: CLOSED — see §14, §21, §46
```

---

## 15. Executor capability contract — normative hard boundary

This section closes `CCA01S-AUD-01`. It is new relative to `c221866…`; nothing here reopens consent semantics, AGR, temporal semantics, or the M7 domain.

A trusted integration executor **MAY** import only:

1. pure operation input/result types;
2. the `LockedCollectionScope` type/capability;
3. its **ONE** operation-specific tracked-adapter interface (§20);
4. pure, non-database utilities explicitly allowlisted for it.

A trusted integration executor **MUST NOT** import, directly or transitively through an unapproved DB-capable helper:

```text
Prisma client
@prisma/client DB execution surface
@/db/client
another repository with DB access
transaction helper
raw SQL helper
$queryRaw
$executeRaw
$transaction
generic DB facade
generic repository
consent repository/helper (e.g. src/db/study-consent-repository.ts)
A1 repository
A2 repository (e.g. src/db/purchase-intent-repository.ts, src/db/purchase-intent-decision-repository.ts)
assignment repository (src/db/study-assignment-repository.ts)
DI container capable of resolving DB services
plugin registry capable of resolving DB services
service locator
arbitrary operation registry
alternate tracked adapter (i.e. the tracked adapter belonging to the other sealed leaf)
```

```
EXECUTOR DIRECT DB CAPABILITY: NONE
```

---

## 16. Exact executor dependency graph

For every consent-conditioned operation, the permitted graph is:

```text
sealed leaf
  ↓
fixed trusted executor
  ↓
exact operation-specific tracked-adapter interface
  ↓
private tracked-adapter implementation
  ↓
hidden TransactionClient
```

No side edge may reach the database. In particular, the following are all forbidden:

```text
executor → Prisma
executor → repository
executor → raw SQL
executor → transaction helper
executor → another executor
executor → service locator → DB
executor → DI container → DB
```

This is stated normatively, not merely descriptively: an executor implementation whose reachable module graph (§18) contains any edge outside this diagram is non-compliant regardless of whether that edge is ever exercised at runtime.

---

## 17. Only the tracked-adapter implementation may capture `TransactionClient`

There is exactly **one** capability layer allowed to hold the hidden Prisma `TransactionClient` for an M7 authorized operation:

> the private tracked-adapter implementation instantiated by the CCA engine after authorization.

Neither the sealed leaf, the executor, the business layer, the operation input, nor any pure helper may capture or receive it.

```
TRANSACTIONCLIENT HOLDERS FOR AUTHORIZED M7 PERSISTENCE: 1 CAPABILITY CLASS
```

No concrete class name is frozen here beyond what §21 already fixes as the operation-specific tracked adapter; this is a capability-count requirement, not a naming requirement.

---

## 18. Executor constructor restrictions

Executor construction MUST NOT accept: a Prisma client; a transaction; a repository; a DB function; a DB callback; a generic port; a raw SQL facility; a DI container; a plugin registry; or a service locator.

Allowed injected dependencies must be pure or explicitly non-database (e.g. a logger interface that performs no DB access, a pure formatter). The tracked adapter (§21) is supplied only internally, by the CCA engine, for the lifetime of one authorized execution — it is never a constructor argument the executor's own composition wiring chooses.

---

## 19. Non-substitutability

Preserved and strengthened from the prior candidate's fixed-executor requirement:

- executor source/module identity is statically fixed;
- no runtime registration;
- no string lookup;
- no DI token selectable by caller;
- no plugin replacement;
- no environment-configurable implementation;
- no test hook in production topology capable of replacement.

Tests may replace components only in isolated test composition that cannot exist in production build/runtime.

```
PRODUCTION EXECUTOR SUBSTITUTION: IMPOSSIBLE BY CAPABILITY GRAPH
```

---

## 20. Executor cannot access another executor

The Outcome executor must not import the Evidence executor. The Evidence executor must not import the Outcome executor. No common DB-capable executor base class may expose generic persistence to both. Pure shared helpers are allowed between executors only if they are DB-free (§15 item 4) — this is the same rule as cross-leaf isolation (§10), extended one layer down to the executors each leaf owns.

---

## 21. No façade exposed to M7 — internal tracked adapter is the complete DB path

The tracked adapter exists **only inside** the sealed trusted executor infrastructure:

- the business caller never sees it;
- the sealed leaf operation never returns it;
- no function parameter reachable from M7 exposes it;
- the executor cannot construct one for itself outside the one interface the CCA engine hands it (§15 item 3, §17).

```
GENERIC DATABASE CAPABILITY EXPOSED: NO
NARROW DATABASE CAPABILITY EXPOSED TO CALLER: NO
```

The adapter implementation:

- is constructed only after the assignment lock and consent authorization succeed;
- captures `LockedCollectionScope`;
- exposes operation-specific atomic methods (§26), not raw Prisma;
- exposes no underlying transaction, no generic delegate, no raw SQL API, and no escape property exposing the hidden `TransactionClient` (§39).

Because §15–§20 close every DB-capable path an executor could otherwise reach, and because the adapter is the executor's sole permitted DB-reaching edge (§16), all DB operations issued as part of an authorized M7 collection MUST pass through tracked-adapter methods, including: the replay/root lock; the replay equality check; root persistence; child persistence; receipt persistence; relation persistence where applicable; and any operation whose failure must roll back the authorized collection. No executor-side DB operation exists outside the adapter's own `activeCount` tracking (§22).

```
AUTHORIZED A → PERSIST B: IMPOSSIBLE
UNTRACKED ASYNC DB OPERATION: IMPOSSIBLE
UNTRACKED LOCK ACQUISITION: IMPOSSIBLE
AUTOCOMMIT ESCAPE: IMPOSSIBLE
SEPARATE TRANSACTION ESCAPE: IMPOSSIBLE
CCA01C-AUD-03 (unrestricted database capability): CLOSED — restated and closed structurally, see §15–§21, §46
```

---

## 22. In-flight operation tracker — mandatory runtime gate, now provably complete

Every adapter database method MUST execute this lifecycle:

```text
assert adapter ACTIVE
increment activeCount
try:
    await complete database operation
finally:
    decrement activeCount
```

Because §15–§16 close every DB-capable path outside the adapter, `activeCount` now covers the **complete** executor DB capability surface, not merely the paths a given implementation happened to route through it: no DB-capable module reference reaches the executor except the one tracked-adapter interface, so there is no DB operation the executor can perform that does not pass through — and therefore is not counted by — this gate.

When the executor's top-level operation promise settles:

1. synchronously mark the adapter `CLOSING`;
2. prevent any new adapter method call from entering;
3. inspect `activeCount`.

```text
activeCount != 0  → fail; rollback entire transaction; never commit
activeCount == 0  → state becomes CLOSED; transaction commit may proceed
```

Commit requires `state != ACTIVE` **and** `activeCount == 0`. An executor cannot bypass this mechanism, because there is no DB-capable edge left for it to bypass through.

```
ZERO-IN-FLIGHT BEFORE COMMIT: MECHANICALLY REQUIRED
CCA01F-AUD-03 (in-flight async completion): CLOSED — see §22, §46
```

---

## 23. Microtask behavior

Unchanged. `queueMicrotask(...)` and `Promise.resolve().then(...)` are explicitly accounted for: if queued work starts before closing, it MUST increment `activeCount`, and closing then detects the nonzero count and rolls back; if it starts after the adapter becomes `CLOSING`/`CLOSED`, the adapter rejects it before any database access.

---

## 24. Timer and background behavior

Unchanged. For `setTimeout`, `setImmediate`, an event listener, a background promise, a worker, or any detached async callback: adapter use after executor settlement MUST fail before database access.

---

## 25. Lint is supplementary only

Unchanged. `@typescript-eslint/no-floating-promises` is required as defense-in-depth and does not itself close the async-escape risk.

> Lint is defense-in-depth; zero-in-flight runtime gating (§22–§24) is authoritative.

---

## 26. Operation-specific atomic adapter methods and assignment binding closure

The adapter does **not** expose independently orderable low-level methods such as `lockRoot()`, `lockChild()`, `insertRoot()`, `insertChild()`. Instead, each operation-specific method owns its entire required lock/write sequence internally, illustratively:

```text
executeOutcomeCollection(...)
executeSavingEvidenceCollection(...)
```

Because every DB persistence path is now reachable only through an adapter that captures `LockedCollectionScope` (§13, §21), and the executor cannot reach the database through any other module (§15–§16), executor code cannot persist an assignment-B row through an alternative DB path after authorization of assignment A — there is no alternative DB path for it to use.

```
CCA01F-AUD-01: CLOSED STRUCTURALLY
CCA01F-AUD-06 (internal M7 lock ordering): CLOSED — see §26–§27, §46
```

---

## 27. Canonical M7 lock order — now the complete lock path

Every operation-specific adapter method internally enforces:

```text
ExperimentAssignment          -- already held by CCA before the adapter exists (§13)
→ M7 root / replay identity row
→ deterministic peer ordering
→ M7 children
→ operational receipt, if applicable
```

Because the executor cannot acquire a DB lock anywhere else (§15–§16), this adapter-owned sequence is the **complete** M7 lock path, not merely the preferred one.

```
LOCK ORDER BYPASS THROUGH EXECUTOR: IMPOSSIBLE
```

---

## 28. Replay race closure

Unchanged design; closure statement extended. The lock-free, read-only, pre-CCA optimistic replay lookup is preserved: read-only, no transaction retained past the lookup, no locks held, no writes. Inside the hidden authorized transaction, the operation-specific executor's operation:

1. takes the required M7 root/replay lock (via the adapter — §21);
2. performs a durable replay re-check (via the adapter);
3. if a matching result already exists — returns the existing durable result and performs no new domain write;
4. otherwise — creates the new authorized collection (via the same assignment-bound adapter).

Because §15–§16 leave the executor with no alternate repository to reach: the executor cannot perform replay mutations through an alternate repository; the replay re-check is performed only by the operation-specific tracked adapter; the existing-result return performs no domain write; the new-result path uses the same assignment-bound adapter.

```
REPLAY CAN CREATE NEW DOMAIN FACT: NO
REPLAY DOMAIN-WRITE BYPASS: CLOSED
```

### 28.1 Existing replay without current consent

Unchanged. An already-durable exact replay found by the lock-free optimistic lookup MAY be returned without evaluating current consent, if existing M7 idempotency authority permits it. This amendment does not define M7 idempotency. No new scientific/domain write may occur on a replay-only return.

---

## 29. Application-wide transaction context

Unchanged design from `c221866…`, restated because §33–§39 depend on it. A CCA-local `AsyncLocalStorage` guard alone is insufficient to detect a caller that already holds an unrelated transaction or lock before ever reaching CCA. A shared trusted execution context, illustratively `DatabaseExecutionContext`, tracks at minimum:

```text
active transaction = YES/NO
transaction authority/type
held lock rank floor / known lock scope
CCA active = YES/NO
```

CCA checks the context **before** opening its own transaction. If any active application transaction exists, CCA rejects with `CCA_TOP_LEVEL_TRANSACTION_REQUIRED` before any database access.

```
CCA01F-AUD-04 (unrelated outer transaction / lock inversion): CLOSED — see §29, §33–§39, §46
```

### 29.1 CCA re-entry

The narrower CCA-active flag is retained as part of the shared context. A nested sealed operation invoked while a CCA transaction is already active is rejected immediately, whether the nesting is direct recursion, indirect helper recursion, another sealed operation entirely, or the same or a different assignment.

---

## 30. Corrected canonical procedure

```text
A. validate operation-specific input structurally
B. assert DatabaseExecutionContext has no active transaction
C. assert no active CCA context
D. enter CCA execution context
E. open A1-owned READ COMMITTED transaction
F. lock ExperimentAssignment
G. re-prove participant ownership
H. establish LockedCollectionScope
I. sample accepted service clock
J. read accepted consent facts
K. run unchanged A1 §8.8 predicate
L. apply AGR for evidence operation if required
M. if unauthorized → rollback / generic NOT_AUTHORIZED
N. construct hidden tracked operation-specific adapter (CCA engine only — §15, §17)
O. execute fixed trusted executor(input, LockedCollectionScope, adapter interface)
P. synchronously invalidate adapter
Q. require activeCount == 0
R. if nonzero/error → rollback
S. commit
T. clear execution context in finally
```

No domain database operation occurs before step N. Steps B–D close `CCA01F-AUD-04`'s pre-CCA half; steps F–H close `CCA01F-AUD-01`; steps N–R close `CCA01-AUD-05` and `CCA01F-AUD-03`; step N is now additionally constrained by §15–§20 (only the CCA engine constructs the adapter; the executor never does).

---

## 31. No consumer transaction object

Unchanged. At no point does application/M7 business code receive: the Prisma client; a `TransactionClient`; the tracked adapter; or the underlying transaction. Only the sealed trusted executor receives the operation-specific tracked-adapter *interface* (§15 item 3) — never the implementation, never the raw `TransactionClient` (§17).

---

## 32. Module topology

| Layer | Owns | Caller-substitutable? |
| :-- | :-- | :-- |
| Public M7 business layer | calling sealed operation functions | — |
| Sealed operation leaf | operation/policy mapping (§6, §10) | NO |
| Private A1 CCA engine | assignment lock, consent, time, transaction, adapter construction (§8, §13, §30) | NO |
| Trusted M7 executor | operation-specific business orchestration only, via the tracked-adapter interface (§14–§20) | NO |
| Private tracked-adapter implementation | DB operations, lock order, `TransactionClient` (§17, §21, §26–§27) | NO |

Future implementation must enforce imports so that each layer is reachable only from the layer directly above it in this table, and so the executor row's only downward edge is the adapter interface.

---

## 33. Fixing the over-broad §27 scope — accepted-owner allowlist

This section closes `CCA01S-AUD-02`. The prior candidate's blanket rule — prohibiting all production `$transaction` calls and all direct `experiment_assignment` access outside the CCA engine — is rewritten. This amendment does **not** globally prohibit all production `$transaction` calls or all direct `experiment_assignment` access outside CCA. It establishes an explicit transaction/assignment capability allowlist with three classes:

**A. Accepted existing owners.** The exact already-accepted A1/A2 transaction and assignment-lock owners enumerated in §34. They retain their existing capability unchanged.

**B. New CCA owner.** The private CCA engine may open the new M7 authorization transaction and lock the assignment, according to §13, §29–§30 of this amendment.

**C. Everyone else.** Prohibited unless a future accepted authority artifact explicitly adds them.

---

## 34. Inventory of exact existing owners

Inspection of the protected baseline (`a67758e6c18c692bc635db416af576356f03b48d`) found **15** production interactive `.$transaction(...)` call sites across **8** source files:

| File | `.$transaction(` sites | Domain / owning spec |
| :-- | --: | :-- |
| [src/db/purchase-intent-repository.ts](src/db/purchase-intent-repository.ts) | 6 | A2 §5–§10/§21/§24 — sole write path for A2 PurchaseIntent lifecycle |
| [src/db/decision-snapshot-repository.ts](src/db/decision-snapshot-repository.ts) | 2 | Base decision-persistence repository (§10/§11/§16/§26/§30, P35A-01) |
| [src/db/study-protocol-repository.ts](src/db/study-protocol-repository.ts) | 2 | Base study AnalysisProtocol repository (spec §2/§2.2/§9) |
| [src/db/purchase-intent-decision-repository.ts](src/db/purchase-intent-decision-repository.ts) | 1 | A2 §12/§16/§17/§19 — sole write path for A2 decision-request/binding |
| [src/db/study-assignment-repository.ts](src/db/study-assignment-repository.ts) | 1 | Base study ExperimentAssignment repository (spec §7/§9) — sole write path to `experiment_assignment` |
| [src/db/study-consent-repository.ts](src/db/study-consent-repository.ts) | 1 | A1 §8.6/§8.9/§8.10/§8.13 — sole write path for StudyConsent |
| [src/db/study-experiment-repository.ts](src/db/study-experiment-repository.ts) | 1 | Base study Experiment repository (spec §4/§9) |
| [src/db/study-participant-repository.ts](src/db/study-participant-repository.ts) | 1 | Base study StudyParticipant repository (spec §5/§6/§9) |

> At candidate audit time the accepted baseline contains 15 production transaction entry points across 8 files; implementation acceptance must re-enumerate this exact set at implementation time and prove every one is either an accepted owner or transparently governed. This list is implementation-manifest evidence, not domain semantics, and is not everlasting: if the accepted baseline changes before implementation, the count must be re-verified rather than assumed.

### 34.1 Accepted security-sensitive owners — direct `experiment_assignment` access

| File | Access pattern |
| :-- | :-- |
| [src/db/study-consent-repository.ts](src/db/study-consent-repository.ts) | Locks `experiment_assignment` row `FOR UPDATE` as the consent serialization point (A1 spec §8.10) |
| [src/db/purchase-intent-repository.ts](src/db/purchase-intent-repository.ts) | Locks `experiment_assignment` row `FOR UPDATE` first, before locking `purchase_intent` (A2 §21) |
| [src/db/study-assignment-repository.ts](src/db/study-assignment-repository.ts) | The sole write path that creates `experiment_assignment` rows (base spec §7/§9) |
| [src/db/purchase-intent-decision-repository.ts](src/db/purchase-intent-decision-repository.ts) | Re-proves `assignmentId` ownership relationally (read, via join) rather than locking the row directly (A2 §12/§16/§17/§19) — existing precedent for the relational re-proof pattern this amendment's `LockedCollectionScope` follows |

### 34.2 Unrelated production transaction sites

[src/db/decision-snapshot-repository.ts](src/db/decision-snapshot-repository.ts), [src/db/study-protocol-repository.ts](src/db/study-protocol-repository.ts), [src/db/study-experiment-repository.ts](src/db/study-experiment-repository.ts), and [src/db/study-participant-repository.ts](src/db/study-participant-repository.ts) each own an interactive `$transaction`, but none locks or writes `experiment_assignment`. These merely need `DatabaseExecutionContext` registration (§37) — they are not security-sensitive assignment/consent owners and this amendment does not change what they do.

```
A1/A2 ASSIGNMENT ACCESS CHANGED: NO
```

---

## 35. Transaction governance rule

Every accepted existing production transaction entry point enumerated in §34 MAY continue doing exactly what it already does. The only new requirement is transparent `DatabaseExecutionContext` registration (§29). It must not require rewriting the transaction's isolation, contents, lock order, outputs, or domain behavior.

---

## 36. New unauthorized transaction owners

After this amendment's implementation, creating a **new** production transaction entry point outside the accepted transaction-owner manifest (§34) requires governance approval. Capability CI fails unknown transaction-owner additions. This does not retroactively invalidate any of the 15 accepted sites.

---

## 37. ExperimentAssignment access rule

Preserve exact existing accepted A1/A2 repositories that directly access/lock `ExperimentAssignment` (§34.1). For **new** M7 code: only the private CCA engine may directly lock/re-prove the assignment (§13, §33 class B). The sealed leaves and executors cannot directly access it (§11, §15). Other pre-existing accepted uses remain untouched.

```
A1/A2 ASSIGNMENT ACCESS CHANGED: NO
```

---

## 38. Executor versus existing owners

Existing accepted A1/A2 repository capability (§34.1) MUST NOT accidentally become available to the M7 executor merely because it is allowlisted globally. The allowlist is `module/path + capability`, not merely `capability exists somewhere`:

```text
accepted-a2-repository (e.g. src/db/purchase-intent-repository.ts):
  MAY use assignment lock

M7 executor:
  MAY NOT import src/db/purchase-intent-repository.ts
  MAY NOT import src/db/study-consent-repository.ts
  MAY NOT import src/db/study-assignment-repository.ts
  MAY NOT acquire the assignment lock directly
```

§15's forbidden-import list names these exact accepted repositories precisely so this distinction is enforceable by static check, not only by prose.

---

## 39. Module capability matrix

| Module class | Start transaction | Direct assignment | Prisma | Tracked adapter |
| :-- | --: | --: | --: | --: |
| Accepted existing A1/A2 owner (§34.1) | existing only | existing only | existing accepted use | N/A |
| Private CCA engine | YES | YES | hidden transaction infrastructure | constructs adapter (§30 step N) |
| Sealed M7 leaf | NO | NO | NO | NO |
| Trusted M7 executor | NO | NO | NO | interface only (§15 item 3) |
| Tracked adapter impl | NO new tx | via bound scope only | hidden tx only | self (holds `TransactionClient` — §17) |
| Public M7 layer | NO | NO | NO | NO |

This matrix is capability authority, not domain semantics.

---

## 40. `DatabaseExecutionContext` compatibility

Existing transaction owners (§34) receive only transparent execution-context bookkeeping. No accepted A1/A2 transaction is prohibited because it predates this amendment. CCA rejects if it is invoked inside any registered active transaction (§29, §30 step B). This closes lock inversion without redefining existing transaction ownership.

Future implementation MAY wrap the accepted A1/A2 transaction entry points with transparent bookkeeping that: does not alter isolation; does not alter lock order; does not alter transaction content; does not alter outputs. Its only purpose is to make nested or pre-held transaction state mechanically observable.

### 40.1 No pre-held-lock route

Because every governed transaction registers in `DatabaseExecutionContext`, a caller cannot (1) open a transaction, (2) acquire an M7 row lock, then (3) invoke a sealed operation — CCA sees the active transaction before opening its own and rejects.

```
LOCK INVERSION VIA OUTER APPLICATION TRANSACTION: CLOSED
```

### 40.2 Scope of the guarantee

This requirement applies to every transaction entry point available to application code under the accepted module/capability model. It does not claim to detect arbitrary transactions created outside that trust boundary — administrative SQL remains outside the same threat boundary already inherited from A1/A2.

---

## 41. No migration of A2 to CCA

A2 continues on its accepted transaction/consent path. This amendment does not route A2 through sealed M7 CCA infrastructure, and does not change A2's import topology except transparent transaction-context bookkeeping (§40) if a future implementation chooses to add it.

```
A2 BEHAVIOR CHANGED: NO
```

---

## 42. Static enforcement — extended explicitly to executor modules

Capability tests are extended explicitly to executor modules. For each trusted executor source path, the CI check MUST fail if its dependency graph contains any forbidden DB-capable edge (§15). It must detect at minimum:

```text
direct Prisma import
@/db/client
relative/alias equivalent
generic repository import
existing repository import (§34.1 paths by name)
raw SQL helper
transaction helper
dynamic import
namespace import
re-export
barrel-mediated DB import
service locator
DI container
plugin registry
transitive helper whose dependency graph reaches DB
```

The audit is not limited to direct imports.

Retained from the prior candidate, for the remaining sealed-operation surface:

```text
direct Prisma imports in sealed business-operation modules, where forbidden
direct $transaction calls outside the CCA engine and the §34 accepted owners
raw SQL helper imports outside accepted owners
CCA-engine imports outside sealed leaves
tracked-adapter imports outside executor infrastructure
cross-leaf imports (one leaf importing another)
dynamic import() of any restricted module
re-export of any restricted symbol
namespace imports of any restricted module
direct consent-helper imports outside the CCA engine
direct experiment_assignment access outside the CCA engine and the §34.1 accepted owners
```

---

## 43. Dependency-closure check

Implementation CI MUST construct the import/dependency closure of each executor. Every reachable local module must be classified as one of:

- **PURE**;
- **APPROVED TRACKED-ADAPTER INTERFACE**;
- **FORBIDDEN DB-CAPABLE**.

If any unknown/unclassified reachable module exists: **FAIL CLOSED**. This closes `executor → pure-looking helper → repository → Prisma`.

---

## 44. Type-aware restriction

Where useful, implementation SHOULD require type-aware checks so the executor cannot receive a value assignable to: `PrismaClient`; `Prisma.TransactionClient`; a generic query/transaction interface; or a known DB repository interface. AST/import-graph closure (§42–§43) is primary for topology; type-aware checks are defense in depth.

---

## 45. Runtime hardening

Static checks do not defend against malicious runtime module mutation, and this amendment does not claim otherwise. Within the accepted application threat boundary, implementation additionally requires: the executor implementation reference is fixed before request handling; no runtime registry mutation; no plugin injection; the tracked adapter object contains no escape property exposing the raw `TransactionClient` (§17, §21). This is sufficient for the accepted in-process capability model and is not broadened to a hostile arbitrary-code-execution threat model.

---

## 46. Findings closure table

| Finding | Closure | Status |
| :-- | :-- | :-- |
| `CCA01S-AUD-01` | executor dependency closure has exactly one DB edge: `executor → tracked adapter interface` (§15–§20) | **CLOSED** |
| `CCA01S-AUD-02` | existing accepted owners (§34) remain allowlisted and unchanged; prohibitions target only new M7 leaves, M7 executors, and unauthorized new modules (§33, §35–§39) | **CLOSED** |
| `CCA01-AUD-05` | transaction-bound fixed executor + zero-in-flight commit gate, now provably complete because no DB-capable path exists outside the tracked adapter (§15–§16, §22) | **CLOSED** |
| `CCA01F-AUD-01` | `LockedCollectionScope` + assignment-bound executor, now closed structurally because every DB persistence path is reachable only through an adapter that captures the scope (§13, §21, §26) | **CLOSED** |
| `CCA01F-AUD-02` | no authorization API exposed; sealed per-operation leaf | **CLOSED** — §6, §9, §10 |
| `CCA01F-AUD-03` | runtime `activeCount` gate, now covering the complete executor DB capability surface (§15–§16, §22) | **CLOSED** |
| `CCA01F-AUD-04` | application-wide `DatabaseExecutionContext`, combined with the §33–§39 allowlist so existing owners are not swept in | **CLOSED** |
| `CCA01F-AUD-05` | immutable, explicit operation input | **CLOSED** — §12 |
| `CCA01F-AUD-06` | atomic, operation-specific lock-order methods, now the complete M7 lock path because the executor cannot lock anywhere else (§15–§16, §26–§27) | **CLOSED** |

| Earlier finding | Status here |
| :-- | :-- |
| `CCA01C-AUD-01` (phase-1/replay bypass) | **CLOSED** — no phase 1 exists in the sealed design (§5, §30); preserved unchanged from `c221866…` |
| `CCA01C-AUD-02` (cross-purpose oracle) | **CLOSED** — preserved unchanged from `c221866…`; no authorization wrapper exists at all (§9) |
| `CCA01C-AUD-03` (unrestricted Prisma callback) | **CLOSED** — restated and additionally closed structurally by §15–§21: no façade of any kind reaches M7, and the executor itself has no alternate DB edge |
| `CCA01C-AUD-04` (indirect re-entry) | **CLOSED** — preserved unchanged from `c221866…`, §29.1 |
| `CCA01C-AUD-05` (async/floating DB operations) | **CLOSED** — preserved unchanged from `c221866…`, §22–§25; additionally, §15–§16 make the runtime counting gate provably complete rather than merely comprehensive-by-discipline |
| `CCA01C-AUD-06` (pre-lock inversion) | **CLOSED** — preserved unchanged from `c221866…`, §40 |

```
ALL CAPABILITY FINDINGS CLOSED
```

---

## 47. Authority boundaries — normative delta ledger

| # | Decision authorized | Classification | Semantic decision? |
| :-- | :-- | :-- | :-- |
| **Δ-1** | Restate, unchanged, the canonical A1 consent-evaluation core (§8). | capability packaging | **NO** |
| **Δ-2** | Delete every M7-reachable capability value — callback, port, façade, Prisma transaction, purpose argument, detachable authorization result (§5). | capability restriction | **NO** |
| **Δ-3** | Require one sealed, statically-policy-bound entry point per consent-conditioned M7 operation, each in its own leaf module (§6, §10). | capability packaging | **NO** |
| **Δ-4** | Require `LockedCollectionScope` and assignment-bound persistence inside the trusted executor (§13–§14, §21). | physical/security enforcement | **NO** |
| **Δ-5** | Require a runtime zero-in-flight commit gate for all adapter database operations (§22–§25). | physical/security enforcement | **NO** |
| **Δ-6** | Require atomic, self-ordering adapter methods and a fixed canonical M7 lock order (§26–§27). | physical/security enforcement | **NO** |
| **Δ-7** | Require an application-wide `DatabaseExecutionContext` governing every application transaction entry point (§29, §40). | physical/security enforcement | **NO** |
| **Δ-8** | Restate the historical-replay / new-collection taxonomy and the lock-free pre-CCA replay lookup (§28). | physical/security constraint on M7's future replay mechanism | **NO** |
| **Δ-9** | Extend static and runtime enforcement to the new topology (§42–§45). | enforcement | **NO** |
| **Δ-10** | Add a normative executor capability contract — allowlisted imports, forbidden imports, exact dependency graph, constructor restrictions, non-substitutability, cross-executor isolation (§15–§20). | physical/security enforcement | **NO** |
| **Δ-11** | Replace the prior blanket transaction/assignment prohibition with an explicit three-class accepted-owner allowlist, grounded in an exact inventory of the 15 accepted baseline transaction sites (§33–§39). | physical/security enforcement | **NO** |

```
DELTA ITEMS                    : 11
NEW CONSENT SEMANTICS           : 0
NEW A1 SEMANTICS                : 0
NEW A2 SEMANTICS                : 0
NEW M7 DOMAIN SEMANTICS          : 0
NEW B/C SEMANTICS                : 0

NEW AUTHORITY BEYOND AMENDMENT 01 REQUIRED: NO
```

Capability/transaction topology is compatibility/security authority only; it defines no new consent, A1, A2, M7 domain, or B/C semantic.

---

## 48. Adversarial test matrix (future implementation obligation)

### 48.1 Retained from the sealed-operation candidate

| Class | Required case | Required result |
| :-- | :-- | :-- |
| Assignment binding | authorize assignment A, submit material belonging to B | no commit |
| Cross-purpose | attempt Outcome through the evidence leaf | impossible / import-topology rejection |
| Cross-purpose | attempt evidence through the Outcome leaf | impossible |
| No-op probing | call CCA without valid operation material | CCA never runs |
| In-flight | `void internalAdapterMethod()` | `activeCount` nonzero → rollback |
| Microtask | queue adapter DB use via `queueMicrotask`/`.then()` | counted-and-rollback, or rejected after invalidation |
| Timer | `setTimeout`/`setImmediate` adapter use | rejected before database access |
| Outer transaction | lock an M7 row, then call the sealed operation | rejected before CCA's transaction opens |
| Nested operation | sealed Outcome calls sealed Evidence | re-entry rejection |
| Lock order | two transactions contend root/children | deterministic root-before-child order; no inversion |
| Assignment mismatch | input references another assignment's entity | rollback |
| Replay race | T1 optimistic miss, T2 creates, T1 enters CCA and internally rechecks | T1 returns the existing result; creates no duplicate |

### 48.2 New — executor direct DB escape

| Required case | Required result |
| :-- | :-- |
| Executor imports `@/db/client` | capability test FAIL |
| Executor imports `@prisma/client` | FAIL |
| Executor imports an existing A2 repository (e.g. `src/db/purchase-intent-repository.ts`) | FAIL |
| Executor imports an existing A1 repository (e.g. `src/db/study-consent-repository.ts`) | FAIL |
| Executor imports a generic repository | FAIL |
| Executor imports a pure-looking helper that itself imports a repository | dependency-closure FAIL |
| Executor uses a dynamic `import()` of a forbidden module | FAIL |
| Executor uses a service locator / DI token for DB | FAIL |
| Executor attempts raw SQL | FAIL |

### 48.3 New — accepted-owner preservation

| Required case | Required result |
| :-- | :-- |
| Existing accepted A1 transaction owner (`study-consent-repository.ts`) | still permitted |
| Existing accepted A2 transaction owner (`purchase-intent-repository.ts`, `purchase-intent-decision-repository.ts`) | still permitted |
| Existing accepted A1/A2 assignment access (§34.1) | still permitted |
| New unauthorized module calling `$transaction` | FAIL |
| New M7 executor assignment access | FAIL |

### 48.4 New — `activeCount` completeness

| Required case | Required result |
| :-- | :-- |
| Executor attempts to bypass the adapter to produce an untracked write | structurally impossible / capability test FAIL on any surface that would allow it |

No test count substitutes for a required class.

---

## 49. Rollback rules

Unchanged. Any of the following MUST roll back the CCA transaction: `NOT_AUTHORIZED`; assignment mismatch; executor error; adapter operation error; `activeCount != 0` at executor settlement; adapter use during `CLOSING`/`CLOSED`; lock timeout or deadlock; operation-material mismatch; replay-material conflict; re-entry detected after a transaction somehow began. Re-entry and outer-transaction detection are preferred before any database access (§30 steps B–D).

---

## 50. Scope and non-scope

### 50.1 Scope

CCA-A (consent-evaluation core, §8); sealed per-operation entry points and leaf modules (§6, §10); the constrained operation-input channel (§12); `LockedCollectionScope` and assignment-bound persistence (§13–§14, §21); the executor capability contract (§15–§20); the internal tracked adapter with the zero-in-flight gate (§21–§25); atomic operation-specific lock ordering (§26–§27); the historical-replay taxonomy and lock-free pre-CCA lookup (§28); the application-wide `DatabaseExecutionContext` and CCA re-entry guard (§29, §40); the accepted-owner transaction/assignment allowlist and its exact baseline inventory (§33–§39); static and runtime enforcement of all of the above, extended to executors (§42–§45).

### 50.2 Non-scope

Unchanged from prior candidates: what consent means; the `NO_CONSENT`/`GRANTED`/`WITHDRAWN` states; `consentSeq` semantics; instant precision, decoding, rounding, clock source or temporal comparison; A2 behavior; the `StudyConsentEvent` schema or any migration or database privilege/role; M7 `Outcome`/`SavingEvidence` domain semantics or which M7 writes are new collections beyond the fixed operation-to-policy mapping of §7; M7 retention, custody, correction or deletion semantics; M7 idempotency (§28.1); JBA, B Semantic Ratification, S-2, S-4, DB-03A/B, B1, B2, C1, C2, `AnalysisProtocol v1`; the root authority register.

---

## 51. Acceptance gates

| Gate | Must prove | Evidence |
| :-- | :-- | :-- |
| **AG-01** | no new consent semantics | §4; §47 |
| **AG-02** | accepted predicate, reader, clock preserved exactly | §8.2 |
| **AG-03** | AGR preserved faithfully | §8.3 |
| **AG-04** | no callback, port, façade, Prisma transaction, or purpose argument reaches M7 | §5, §6, §21, §31 |
| **AG-05** | consent policy fixed by construction, not caller-selected | §6, §7 |
| **AG-06** | no standalone authorization probe possible | §9 |
| **AG-07** | assignment binding structural, not caller-supplied | §12.1, §13, §14 |
| **AG-08** | zero-in-flight commit gate mechanically required and provably complete | §15–§16, §22–§25 |
| **AG-09** | internal M7 lock order fixed, non-invertible, and complete | §15–§16, §26–§27 |
| **AG-10** | replay cannot create a new domain fact | §28 |
| **AG-11** | outer-transaction/lock inversion and CCA re-entry both closed application-wide | §29, §40 |
| **AG-12** | executor has exactly one DB-reaching edge, statically and transitively enforced | §15–§20, §42–§45 |
| **AG-13** | accepted existing transaction/assignment owners remain unchanged and unaffected by the new prohibitions | §33–§39 |
| **AG-14** | all listed findings closed | §46 |
| **AG-15** | A2 unchanged | §41 |
| **AG-16** | no B/C semantics | §50.2 |

---

## 52. Status

| Question | Answer |
| :-- | :-- |
| Authorization API exposed to M7 | **NO** |
| Generic `purpose` exposed | **NO** |
| Callback exposed | **NO** |
| Façade exposed to M7 | **NO** |
| Prisma / transaction client exposed | **NO** |
| Fixed sealed operations required | **YES** |
| Explicit immutable operation input required | **YES** |
| Trusted-context validation explicit | **YES** |
| Locked-assignment ownership re-proof explicit | **YES** |
| `LockedCollectionScope` defined | **YES** |
| Assignment-bound executor required | **YES** |
| Operation can persist another assignment's row | **NO** |
| `activeCount` tracker required | **YES** |
| Zero-in-flight commit gate required | **YES** |
| Microtask escape closed | **YES** |
| Timer escape closed | **YES** |
| Promise-chain escape closed | **YES** |
| Application-wide transaction context required | **YES** |
| Outer transaction rejected | **YES** |
| CCA re-entry rejected | **YES** |
| Canonical root→child lock order required | **YES** |
| Caller can select policy | **NO** |
| Standalone authorization probe possible | **NO** |
| Replay can create domain fact | **NO** |
| Replay-race internal recheck defined | **YES** |
| Executor can import Prisma | **NO** |
| Executor can import DB client | **NO** |
| Executor can import an existing repository | **NO** |
| Executor can import raw SQL helper | **NO** |
| Executor can import transaction helper | **NO** |
| Executor can use DI/service locator for DB | **NO** |
| Only tracked adapter may capture `TransactionClient` | **YES** |
| Accepted A1/A2 transaction owners preserved | **YES** |
| Accepted A1/A2 assignment access preserved | **YES** |
| New M7 leaf may call `$transaction` | **NO** |
| New M7 executor may call `$transaction` | **NO** |
| Private CCA engine may start transaction | **YES** |
| Implementation authorized | **NO** |

```
NEW CONSENT SEMANTICS: 0
NEW A1 SEMANTICS: 0
NEW A2 SEMANTICS: 0
NEW M7 DOMAIN SEMANTICS: 0
NEW B/C SEMANTICS: 0

ROOT AUTHORITY REGISTER            : NOT EDITED
A1 / A2 CANONICAL SPECIFICATIONS   : NOT EDITED
RUNTIME CODE / PRISMA / MIGRATIONS : NOT EDITED
```

```
A1/A2→M7 CONSENT COMPATIBILITY AMENDMENT 01 CANDIDATE ONLY — NOT SELF-ACCEPTED
M7 EFFECTIVE SPEC V1 REMAINS BLOCKED
M7 IMPLEMENTATION NOT AUTHORIZED
B1 IMPLEMENTATION NOT AUTHORIZED
```

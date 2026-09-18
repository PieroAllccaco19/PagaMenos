# PAGAMENOS — M7 — VBA-S02-1 POSTGRESQL VERSION-FLOOR CLARIFICATION 01 (VFC-01)

```
AUTHOR CANDIDATE — NOT YET AUTHORITATIVE
NOT SELF-ACCEPTED — AWAITING INDEPENDENT AUDIT
M7-S03 REMAINS BLOCKED

DOCUMENT KIND                           : NARROW CLARIFICATION SUBORDINATE TO ACCEPTED VBA-01 (no SQL delta)
ACCEPTED V1.1 / E01 / E02 / E03 / CCA   : NOT EDITED
ACCEPTED VBA-01                         : NOT EDITED
NORMATIVE SQL OCCURRENCES CHANGED       : 0
S01 FRAGMENT BYTES / PINS CHANGED       : 0 / 0
S01 REGENERATION REQUIRED               : NO
IA-08                                   : NOT EDITED — UNCHANGED IN ITS OWN SCOPE
SCOPE OF THE VERSION FLOOR              : VBA-S02-1 AND M7-S03 VERIFICATION UNDER THE VBA-S02-1 REALIZATION ONLY
PRODUCT / GLOBAL POSTGRESQL SUPPORT     : NOT CHANGED
IMPLEMENTATION REWORK AUTHORIZED BY THIS DOCUMENT'S EXISTENCE : NO (§14)
LC-1 … LC-7                             : NOT OCCURRED — unchanged
MACHINE-READABLE AUTHORITY              : NOT PUBLISHED
PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA   : NOT ASSERTED
SELECTOR                                : NOT ASSERTED / NOT ROTATED
DEPLOYMENT / WAVE 0                     : NOT AUTHORIZED
```

**Nature.** A documentation-only, narrowly scoped clarification of the accepted M7 S03 Verification Bootstrap Amendment 01 (**VBA-01**). It resolves exactly one ambiguity: the PostgreSQL version floor of the M7-S02 provisioning/verification harness and of M7-S03 installation verification when they exercise `VBA-PV-1` / `VBA-PV-3` through the `VBA-S02-1` work package. It is subordinate to VBA-01, does not broaden VBA-01, changes no normative SQL, and does not alter any PostgreSQL-version claim outside that verification scope.

**Conventions.** MUST / MUST NOT / MAY are normative. "VBA-01 §n" = `PAGAMENOS_M7_S03_VERIFICATION_BOOTSTRAP_AMENDMENT_01.md` at the accepted bytes of §2.2. "V1.1 §n" / "V1.1 line n" = `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1.md` at the accepted bytes of §2.2. "Register §n" = `PAGAMENOS_SPEC_AUTHORITY.md` at the baseline of §2.1. "The harness" = the M7-S02 PostgreSQL harness `scripts/m7/pg-m7-harness.ts` at implementation staging (§2.3), together with the provisioning template and testkit it drives. "H03" = the harness check with identifier `H03-server-version`. Identifiers introduced here carry the prefix `VFC-`; full-text search of the accepted V1.1, E01, E02, E03, CCA, VBA-01 and register bytes at the baseline returns zero matches for `VFC-`.

---

## 1. Identity and purpose

| Item | Value |
| :-- | :-- |
| Document | `PAGAMENOS_M7_VBA_S02_1_POSTGRESQL_VERSION_FLOOR_CLARIFICATION_01.md` |
| Short identifier | `VFC-01` |
| Full name | M7 VBA-S02-1 PostgreSQL Version-Floor Clarification 01 |
| Kind | narrow clarification subordinate to accepted VBA-01; author candidate |
| Controls, once accepted | (a) the PostgreSQL version floor of the harness for `VBA-S02-1`; (b) the PostgreSQL version floor of every subsequent M7-S03 execution that relies on the provisioning realization established by `VBA-S02-1`; (c) the one additional harness-semantic change `VBA-S02-1` may make to realize (a) (§9) |
| Does not control | any normative SQL byte; IA-08; the `VBA-PV-1` invariant; the `VBA-PV-3` version table; any product, deployment or production-provisioning PostgreSQL-version claim; the production migration; the reviewed production manifest; LC-1 … LC-7; MA-1 … MA-18; IMP-01 … IMP-22; Gate 2; machine-readable authority; the selector; deployment |
| Purpose | remove the contradiction of §3 so that a conforming `VBA-S02-1` can be authored without guessing the version floor, and so that a PostgreSQL version whose realization is not canonical under VBA-01 can never be silently provisioned or verified |

---

## 2. Preconditions and authority lineage

### 2.1 Protected authority baseline

| Item | Value |
| :-- | :-- |
| Repository | `PieroAllccaco19/PagaMenos` |
| Protected surface | `origin/m3.5b-b-integration` |
| Baseline commit | `aa2799a4d04c30afb585090536db3af38cfdd345` (PR #33 merge, *"m7-s03-vba01-root-authority-sync"*) |
| Baseline tree | `5262c26a5fa0e089be1999469f472fac6b07670b` |
| Baseline parents (ordered) | 1. `b4ed5c97cbdfb0e7e031ae37653342192bd2fff2` (PR #32 merge; VBA-01) — 2. `70d15f0fb5943a4c9fcbddb4a8913f7383043d30` (VBA-01 root registration) |
| Lineage | this candidate is a single commit whose only parent is the baseline commit, adding exactly one path: this file. The rejected historical commit `a586b3119da2cc1aa4668485b129dbe625ab5cae` is not an ancestor of the baseline |

### 2.2 Immutable accepted artifacts — exact identities (not edited)

| Artifact | Git blob at the baseline |
| :-- | :-- |
| `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1.md` (V1.1) | `06e103b0d5e8cfcbb96ab21134d5605b0aae9b26` |
| `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_01.md` (E01) | `15ee22090d3e37b6a63dd25914f8abb0f4fa9d4b` |
| `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_02.md` (E02) | `a0e6fa6720f23ac08485ab7cb696ab9ba4b7e83f` |
| `PAGAMENOS_M7_OUTCOME_EVIDENCE_EFFECTIVE_SPEC_V1_1_ERRATUM_03.md` (E03) | `8ba87adc9b87cee749c214d9326b0aa750ceabf0` |
| `PAGAMENOS_A1_A2_M7_CONSENT_COMPATIBILITY_AMENDMENT_01.md` (CCA) | `2f0ff3c886c5ac9b1cbba797404e9024c0b83732` |
| `PAGAMENOS_M7_S03_VERIFICATION_BOOTSTRAP_AMENDMENT_01.md` (VBA-01) | `d10d59cac8f0d77304b88c6df0e06b89d710141d` |
| `PAGAMENOS_SPEC_AUTHORITY.md` (root register) | `072b5b99bcfcebb94fbcda9a6f97ccf0c80099f8` |

VBA-01 is registered as accepted and protected-integrated (Register §16; header reading rule, item (8d)). The M7 normative-SQL conformance target remains **M7 V1.1 + accepted Erratum 01 + accepted Erratum 02 + accepted Erratum 03** (Register §15.2, §16.2), unchanged by VBA-01 and by this document.

### 2.3 Implementation-line artifacts consulted (provenance only; not authority; not edited; not copied)

| Item | Value |
| :-- | :-- |
| Implementation staging | `origin/m7-v1.1-implementation` tip `2cc15773c12bd2c3d5f2826a738fcc620c9cb609`, tree `3550705824eca90da74ddf665cc5f99939011710` (PR #34 merge, *"m7-vba01-authority-staging-sync"*; carries VBA-01 blob `d10d59c…` and register blob `072b5b9…`) |
| Harness | `scripts/m7/pg-m7-harness.ts`, blob `c6710acc8d925902824f598e9f0c61f5e77617c5` |
| H03 at staging | check `H03-server-version` fails iff `identity.serverVersionNum < 150000`, with detail `server_version_num <n> < 150000 (IA-08 precondition)`; the value is the running server's `current_setting('server_version_num')` (`src/m7/testkit/cluster.ts`) |
| Harness gating at staging | the harness returns early (remaining required checks recorded `NOT_EXECUTED` by `finish()`) after H01 when binaries are absent, after H02 when no cluster/identity exists, after H04 when no expectations exist, and after H05–H07 when any recorded check is not `PASS`. It does **not** return after a failing H03: H04 and H05 (execution of the rendered provisioning template) are still reached |
| M7-S02 provisioning inputs | `scripts/m7/provision/roles.template.sql` blob `6e790849793831089938102dd08e94286d868ad1` (owner-membership grant `GRANT pagamenos_m7_owner TO {{MIGRATION_ROLE}};` without options); `src/m7/testkit/provision.ts` (`HARNESS_MIGRATION_ROLE = 'pagamenos_migrator'`) |
| M7-S01 pins (provenance; unchanged) | F01 `f75c45ab8110c3fe5bce5379e77a08a51bc2e3d0561e887310d9c9361d02a6be`; F11 `c9f5777fcc699fd9411427e4b17fd3f28258068f925bbb8fcbe3a935fbec75a9`; F24 `f68eeea9d1f6a3b192b64163949385d89cd0b0fa369b168d8160d3eaa7006fff` |

These artifacts are cited only to state the defect of §3 precisely. This document asserts no register status for any implementation-line slice.

---

## 3. Defect being clarified

### 3.1 The accepted text

VBA-01 §14 limits `VBA-S02-1` to:

1. the owner-membership grant of the provisioning template realizing `VBA-PV-3` **"for the PostgreSQL version the harness pins"** (≥ 16: `WITH INHERIT TRUE, SET TRUE`);
2. extending the harness's role verification to assert the membership edge options and the `VBA-PV-1` item 4 predicate;
3. **"no other change to roles, attributes, credentials, migrations, suites or harness semantics."**

VBA-01 §3.4 (`VBA-PV-3`) establishes:

| PostgreSQL | Status under VBA-01 |
| :-- | :-- |
| ≥ 16 | canonical conforming realization: exactly one edge with `inherit_option = true`, `set_option = true`, `admin_option = false`, created by `GRANT pagamenos_m7_owner TO <migration role> WITH INHERIT TRUE, SET TRUE;`; empirically demonstrated on 18.4 only |
| 15 | documented-semantics realization only (migration role with the `INHERIT` attribute) — **UNVERIFIED**, not canonical; any reliance requires its own execution evidence first |
| ≤ 14 | refused by IA-08; out of scope |

### 3.2 Repository reality

The harness does **not** pin PostgreSQL ≥ 16. Its H03 admits any server with `server_version_num >= 150000` (§2.3), i.e. it admits PostgreSQL 15, mirroring the IA-08 precondition of the installation script (V1.1 §18.4 IA-08; V1.1 lines 2392–2393).

### 3.3 The contradiction

- Item 1 of VBA-01 §14 presupposes a pinned version. The only version range the harness actually enforces is ≥ 15.
- The canonical ≥ 16 grant (`WITH INHERIT TRUE, SET TRUE`) is not valid PostgreSQL 15 syntax and is not the PostgreSQL 15 realization.
- The PostgreSQL 15 realization is not canonical under VBA-01 and may not be relied on without its own execution evidence, which does not exist.
- Aligning the harness floor with the canonical realization requires changing H03, which item 3 of VBA-01 §14 ("no other change … to harness semantics") does not expressly permit.

A conforming `VBA-S02-1` therefore cannot be authored from VBA-01 alone without either (a) relying on an unverified, non-canonical PostgreSQL 15 realization, or (b) making a harness-semantic change VBA-01 does not name. This document resolves that ambiguity and nothing else.

### 3.4 Evidence that exposed the defect (non-authoritative)

The implementation candidate of §12 realized the ≥ 16 grant while leaving H03 at `150000`; its independent audit was blocked on this contradiction. That candidate is provenance only and contributes no bytes to this document.

---

## 4. Relationship to VBA-01

**`VFC-REL-1`.** This document is a narrow clarification **subordinate** to accepted VBA-01. It:

1. does not edit VBA-01, and every VBA-01 clause continues to control within its own scope;
2. does not change `VBA-PV-1`, `VBA-PV-2` or the `VBA-PV-3` version table, and does not re-grade any row of that table;
3. resolves the phrase *"for the PostgreSQL version the harness pins"* of VBA-01 §14 item 1 by fixing that version floor (§6);
4. creates one expressly enumerated, narrowly interpreted exception to VBA-01 §14 item 3 (§9) and nothing else;
5. gains no scope beyond VBA-01's `VBA-S02-1` / M7-S03 verification scope.

Where this document and VBA-01 appear to conflict outside the clauses enumerated in items 3 and 4, VBA-01 controls and the apparent conflict is a defect of this document, not a matter for interpretation.

---

## 5. Scope of the version floor

**`VFC-SC-1`.** The version floor of §6 applies **only** to:

1. the M7-S02 provisioning/verification harness when it provisions and verifies roles under the `VBA-S02-1` realization; and
2. every M7-S03 installation-verification execution governed by VBA-01 that relies on the provisioning realization established by `VBA-S02-1`.

**`VFC-SC-2`.** The floor is a **verification-harness precondition**. It is **not**:

1. a declaration that PostgreSQL 15 is unsupported by M7, by M7 V1.1, by the installation script or by the product;
2. a modification of IA-08 or of any PostgreSQL-version statement of V1.1, E01, E02, E03, the CCA or VBA-01;
3. a production-provisioning, deployment or runtime support claim.

```
The >= 16 floor introduced here is scoped to the
VBA-S02-1 / VBA-01 verification realization.

It does not modify any broader PostgreSQL-version claim
outside that verification scope.
```

---

## 6. `VFC-PG-1` — verification-harness version floor

**`VFC-PG-1`.** For `VBA-S02-1`, and for every subsequent M7-S03 execution that relies on the provisioning realization established by `VBA-S02-1`:

```
server_version_num MUST be >= 160000.
```

1. The value is the running server's `server_version_num`, observed from the server under test (not a configured, expected or binary-reported value).
2. A server with `server_version_num < 160000` MUST be refused.
3. The refusal MUST occur at the harness version-precondition boundary (H03, or its repository-equivalent), **before** the role-provisioning template is rendered for execution or executed, and before any role, membership or grant is created in the cluster under test.
4. `VFC-PG-1` adds no upper bound. VBA-01 §3.4 continues to state that versions **> 18** are not examined and that no realization is asserted for them; this document does not change that statement.

---

## 7. `VFC-PG15-1` — PostgreSQL 15 disposition

**`VFC-PG15-1`.**

```
PostgreSQL 15 =
  OUT OF SCOPE FOR VBA-S02-1
  and
  OUT OF SCOPE FOR M7-S03 VERIFICATION UNDER THIS REALIZATION
  until separately authorized and empirically demonstrated.
```

1. The VBA-01 §3.4 characterization is preserved unchanged: the PostgreSQL 15 realization is a **documented-semantics realization only — UNVERIFIED — not canonical**.
2. This document does **not** promote PostgreSQL 15 to supported, does **not** reject PostgreSQL 15 globally, and does **not** assert or invent any PostgreSQL 15 execution evidence.
3. `VBA-S02-1` is **not** required, and is **not** permitted, to implement a PostgreSQL 15 realization (no `ALTER ROLE … INHERIT` on the migration role, no version-conditional grant, no PostgreSQL 15 branch of the provisioning template).
4. Bringing PostgreSQL 15 into scope requires, at minimum, a separate accepted authority change and execution evidence on a PostgreSQL 15 server; nothing in this document pre-authorizes either.

---

## 8. `VFC-PG16-1` — PostgreSQL ≥ 16 realization (reaffirmed, not replaced)

**`VFC-PG16-1`.** Without replacing VBA-01 §3.4, for the scoped harness on a server satisfying `VFC-PG-1`, the provisioning MUST yield **exactly one direct** membership edge

```
pagamenos_m7_owner  →  <migration role>
```

with

```
inherit_option = true
set_option     = true
admin_option   = false
```

and

```
pg_has_role(<migration role>, 'pagamenos_m7_owner', 'MEMBER') = true
pg_has_role(<migration role>, 'pagamenos_m7_owner', 'USAGE')  = true
pg_has_role(<migration role>, 'pagamenos_m7_owner', 'SET')    = true
```

The canonical provisioning statement remains:

```sql
GRANT pagamenos_m7_owner
TO <migration role>
WITH INHERIT TRUE, SET TRUE;
```

The migration role's `rolinherit` attribute is **not** constrained by this realization and MUST NOT be changed solely to satisfy `VBA-PV-1`. All other `VBA-PV-1` and `VBA-PV-2` properties (non-superuser migration role; IA-02 … IA-05 unchanged; members of `pagamenos_m7_owner` exactly `{migration role}`; no `ADMIN OPTION`) continue to apply exactly as VBA-01 states them. Empirical support remains as VBA-01 §3.4 records it (18.4 only); this document adds none.

---

## 9. `VFC-H03-1` — narrow authorization of the H03 version-floor change

**`VFC-H03-1`.** As an express, narrowly interpreted clarification of and exception to VBA-01 §14 item 3 (*"no other change … to harness semantics"*), `VBA-S02-1` is authorized to make exactly one additional harness-semantic change:

```
H03 minimum server_version_num:
  150000  →  160000
```

(or the repository-equivalent version-precondition check, if the check is relocated or renamed by a separately accepted change before `VBA-S02-1` is re-authored).

This change comprises only:

1. **Threshold.** The H03 comparison refuses `server_version_num < 160000` instead of `< 150000`. The refusal detail MAY state the new threshold and MUST identify `VFC-PG-1` as its basis; it MUST NOT describe the refusal as an IA-08 failure or as a product-support statement.
2. **Refusal takes effect before provisioning.** Where the repository's harness does not already stop after a non-`PASS` H03 (as at §2.3, where H04 and H05 are still reached), `VBA-S02-1` MAY — and, to satisfy `VFC-PG-1` item 3 and `VFC-H03-2`, MUST — make a non-`PASS` H03 terminate the run through the harness's **existing** early-termination path (the `finish()` path already used after H01, H02, H04 and H05–H07), so that every not-yet-reached required check is recorded by the existing `NOT_EXECUTED` mechanism. No new status, check identifier, report field, mode or termination mechanism is introduced.

**Interpretation limits.**

- This change is authorized **solely** to align the harness precondition with `VFC-PG-1`.
- No other H03 semantics change: H03 continues to observe the running server's actual version, to record the server identity in the evidence, and to keep its identifier and its position in the required-check list.
- No other harness semantics are authorized by this document. The only other harness-semantic change `VBA-S02-1` may make remains the role-verification extension already authorized by VBA-01 §14 item 2.
- Item 2 is an enforcement consequence of `VFC-PG-1`, not a general licence to re-order or re-gate other checks.

---

## 10. `VFC-H03-2` — required fail-closed behavior

**`VFC-H03-2`.** On a server with `server_version_num < 160000`:

1. H03 MUST fail, reporting the repository's existing precondition-failure status (at §2.3: a non-`PASS` check result, with every not-reached required check recorded `NOT_EXECUTED`);
2. the role-provisioning template MUST NOT be executed (H05 not reached);
3. `VBA-S02-1` MUST NOT create any role, membership or grant, partial or complete, in the cluster under test;
4. no later S02 or S03 check may report `PASS`, and the run's overall outcome MUST NOT be success;
5. no fallback to a PostgreSQL 15 (or any other non-canonical) realization is permitted;
6. no automatic `ALTER ROLE … INHERIT` (or any other role-attribute change) is permitted;
7. no ad-hoc grant, re-grant or membership repair is permitted, by the harness or by M7-S03 (VBA-01 §14 final paragraph, unchanged).

The package MUST fail closed. A version refusal is never converted into a skip, a warning or a partial pass.

---

## 11. `VFC-IA08-1` — relationship to IA-08 and to broader M7 version semantics

**`VFC-IA08-1`.**

1. IA-08 (V1.1 §18.4; `server_version_num >= 150000` in the installation script, V1.1 lines 2392–2393) is **not** rewritten, and its SQL is not changed. IA-08 remains the installation script's own fail-closed precondition in its own scope.
2. This document does **not** assert that M7 V1.1, the installation script or the product now globally requires PostgreSQL ≥ 16. No accepted authority at the baseline makes that global assertion, and this document does not create it.
3. Where IA-08's ≥ 15 precondition and `VFC-PG-1` appear to be in tension, both hold: IA-08 remains unchanged in its own scope, and `VFC-PG-1` imposes a **narrower, additional** precondition that applies only to the `VBA-S02-1` / VBA-01 verification realization (§5). A server admitted by IA-08 but refused by `VFC-PG-1` is outside that verification realization; it is not thereby declared non-conforming for the product.
4. The harness's H03 was an S02 harness check mirroring IA-08; after `VFC-H03-1` it is instead the `VFC-PG-1` precondition for the harness. IA-08 itself continues to execute unchanged inside F01 whenever the installation script runs.

---

## 12. `VFC-CD-1` — disposition of the existing implementation candidate (provenance only)

| Item | Value |
| :-- | :-- |
| Branch | `m7-vba-s02-1-provisioning-compat` |
| Candidate commit | `7e82121b5abe7e649a2286025508ca0f115cf97a` (*fix(m7): align S02 provisioning with VBA-PV-1*) |
| Candidate tree | `4ac96bb8cd3af5f64be38f03024f291a8890ca0a` |
| Sole parent | `2cc15773c12bd2c3d5f2826a738fcc620c9cb609` |

```
VBA-S02-1 candidate 7e82121b5abe7e649a2286025508ca0f115cf97a =
  AUTHOR CANDIDATE
  INDEPENDENT AUDIT BLOCKED
  NOT ACCEPTED
  NOT PUSHED
  NOT INTEGRATED
```

**Reason.** Its ≥ 16 provisioning realization is directionally conforming, but its parent authority did not authorize changing the harness version floor from ≥ 15 to ≥ 16 (§3.3); the candidate leaves H03 at `150000`.

**Limits of this disposition.**

1. This document neither accepts nor rejects that candidate's implementation quality.
2. Future acceptance is **not** bound to that exact commit, tree or diff; none of its bytes is incorporated here.
3. After this document becomes authoritative and is synchronized into implementation staging (§14), the `VBA-S02-1` implementation work package MUST be re-authored or amended on the resulting staging baseline and independently audited against VBA-01 read with this document.

---

## 13. `VFC-SCOPE-1` — effect on `VBA-S02-1` scope

Once this document is authoritative (and subject to §14), the permitted `VBA-S02-1` implementation scope is **exactly**:

1. the owner-membership provisioning grant per VBA-01 §14 item 1, realized as `VFC-PG16-1`;
2. the role verification per VBA-01 §14 item 2 (edge options and the `VBA-PV-1` item 4 predicate);
3. tests directly required by items 1, 2 and 4;
4. the H03 version-floor change `>= 15 → >= 16`, solely as authorized by `VFC-H03-1` (including its item 2) and bounded by `VFC-H03-2`.

No other change. In particular: no change to roles, role attributes, credentials, migrations, suites or other harness semantics; no PostgreSQL 15 realization; no change to S01 artifacts, normative SQL or authority documents.

---

## 14. `VFC-LC-1` — no automatic implementation authorization

The existence of this document — as a candidate or after acceptance — does **not** by itself authorize any rework of `VBA-S02-1`. Until this document is:

1. independently accepted;
2. protected-integrated;
3. registered into the root authority register, if governance requires it;
4. synchronized into implementation staging by its own separate transition;

the current `VBA-S02-1` candidate (§12) remains blocked. Only after those transitions may a **separate** implementation authorization amend or re-author `VBA-S02-1`. Those transitions are cumulative with, and no weaker than, the prerequisites of Register §16.7 and VBA-01 §14–§16.

---

## 15. `VFC-SQL-1` — no normative SQL consequence

```
V1.1 normative SQL changes = 0
E01 changes                = 0
E02 changes                = 0
E03 changes                = 0
F01–F26 changes            = 0
S01 regeneration required  = NO
```

Critical pins remain provenance and are unchanged:

```
F01 = f75c45ab8110c3fe5bce5379e77a08a51bc2e3d0561e887310d9c9361d02a6be
F11 = c9f5777fcc699fd9411427e4b17fd3f28258068f925bbb8fcbe3a935fbec75a9
F24 = f68eeea9d1f6a3b192b64163949385d89cd0b0fa369b168d8160d3eaa7006fff
```

No T-ID, IA-* rule, verifier domain, count of V1.1 §19.14, `VBA-*` rule or `M7-S03-VBCP` rule changes.

---

## 16. `VFC-LC-2` — lifecycle: no advancement

This document advances no lifecycle state. At the baseline, and unchanged by this candidate:

```
M7-S01
  : ACCEPTED + INTEGRATED
    CURRENT CONFORMANCE ARTIFACT SET

M7-S02
  : ACCEPTED + INTEGRATED INFRASTRUCTURE
    ACCEPTANCE PRESERVED

VBA-S02-1
  : AUTHORIZED IN PRINCIPLE BY VBA-01
    CURRENT IMPLEMENTATION CANDIDATE BLOCKED
    NOT ACCEPTED
    NOT INTEGRATED

M7-S03
  : BLOCKED

M7-S03 RESUME
  : NOT AUTHORIZED

M7-S03-VBCP
  : NOT YET EXECUTED AS ACCEPTED S03 EVIDENCE

GATE 2
  : OPEN / NOT SATISFIED

IMP-01 ... IMP-22
  : OPEN

MA-1 ... MA-18
  : OPEN

LC-1 ... LC-7
  : NOT OCCURRED

PRODUCTION MANIFEST
  : NOT AUTHORED / NOT ACTIVE

MACHINE AUTHORITY
  : NOT PUBLISHED

PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA
  : NOT ASSERTED

SELECTOR
  : NOT ASSERTED / NOT ROTATED

DEPLOYMENT / WAVE 0
  : NOT AUTHORIZED
```

"Authorized in principle by VBA-01" records that VBA-01 §14 identifies and scopes `VBA-S02-1`; it does not supersede Register §16.6–§16.7, under which separate authorization, authoring, acceptance and integration of `VBA-S02-1` remain required.

---

## 17. Explicit non-authorizations

This document, as a candidate and after any acceptance, does **not**:

1. edit VBA-01, V1.1, E01, E02, E03, the CCA or the root register;
2. modify, regenerate or authorize changes to M7-S01 or to any normative SQL;
3. modify any implementation file, or authorize `VBA-S02-1` rework before the transitions of §14;
4. accept, reject, push or integrate candidate `7e82121b…`;
5. authorize M7-S03 to resume;
6. declare PostgreSQL 15 supported or globally unsupported, or assert any PostgreSQL 15, 16 or 17 execution evidence;
7. change IA-08 or any product/deployment PostgreSQL-version claim;
8. author, accept, publish or activate a production control-plane manifest;
9. perform or authorize LC-1 … LC-7, Gate-2 acceptance, machine-readable authority publication or selector rotation;
10. assert, infer, default or derive `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA`;
11. authorize deployment, Wave 0 or runtime use.

---

## 18. Acceptance criteria for the independent auditor

| # | Criterion |
| :-- | :-- |
| VFC-AC-1 | the candidate commit adds exactly one path, this file; its only parent is `aa2799a4d04c30afb585090536db3af38cfdd345`; no other path is added, modified or removed |
| VFC-AC-2 | the accepted VBA-01 blob `d10d59cac8f0d77304b88c6df0e06b89d710141d` is unchanged, as are V1.1 `06e103b…`, E01 `15ee220…`, E02 `a0e6fa6…`, E03 `8ba87ad…`, CCA `2f0ff3c…` and the root register `072b5b9…` |
| VFC-AC-3 | no normative SQL is changed; F01–F26 and the F01/F11/F24 pins are unchanged; S01 regeneration is not required (§15) |
| VFC-AC-4 | the version floor is explicitly limited to `VBA-S02-1` and to M7-S03 verification relying on the `VBA-S02-1` realization (§5), and IA-08 is left unchanged in its own scope (§11) |
| VFC-AC-5 | PostgreSQL 15 is neither falsely supported nor globally rejected; its VBA-01 §3.4 characterization (documented-semantics only, unverified, not canonical) is preserved (§7) |
| VFC-AC-6 | PostgreSQL ≥ 16 is the required verification realization, with the exact edge options, `pg_has_role` predicates and canonical grant of VBA-01, and `rolinherit` unconstrained (§6, §8) |
| VFC-AC-7 | H03 `150000 → 160000` is the only newly authorized harness-semantic change; its item 2 (termination through the existing `finish()` path) is bounded to enforcing the refusal-before-provisioning required by `VFC-PG-1` and introduces no new status or mechanism (§9, §10) |
| VFC-AC-8 | no lifecycle state advances (§16) |
| VFC-AC-9 | candidate `7e82121b5abe7e649a2286025508ca0f115cf97a` remains non-accepted and non-integrated; future acceptance is not bound to it (§12) |
| VFC-AC-10 | no machine authority, selector value, manifest, deployment or M7-S03-resume authorization is created, and the document's existence does not authorize rework (§14, §17) |

---

## 19. Explicit status

```
PAGAMENOS_M7_VBA_S02_1_POSTGRESQL_VERSION_FLOOR_CLARIFICATION_01 : AUTHOR CANDIDATE — NOT YET AUTHORITATIVE
INDEPENDENT ACCEPTANCE                   : NOT PERFORMED
PROTECTED INTEGRATION                    : NOT PERFORMED
ROOT AUTHORITY REGISTRATION              : NOT PERFORMED
IMPLEMENTATION STAGING SYNCHRONIZATION   : NOT PERFORMED
M7 CONFORMANCE TARGET                    : M7 V1.1 + ACCEPTED ERRATUM 01 + ACCEPTED ERRATUM 02 + ACCEPTED ERRATUM 03 (unchanged)

M7 SPECIFICATION (V1.1)                  : ACCEPTED — BYTES NOT EDITED
M7 ERRATA 01 / 02 / 03                   : ACCEPTED + PROTECTED-INTEGRATED — BYTES NOT EDITED
CCA                                      : ACCEPTED + PROTECTED-INTEGRATED — BYTES NOT EDITED
VBA-01                                   : ACCEPTED + PROTECTED-INTEGRATED — BYTES NOT EDITED
IA-08                                    : UNCHANGED
NORMATIVE SQL CHANGED                    : NO
M7-S01 REGENERATION                      : NOT REQUIRED
VBA-S02-1 CANDIDATE 7e82121b…            : AUTHOR CANDIDATE — INDEPENDENT AUDIT BLOCKED — NOT ACCEPTED — NOT PUSHED — NOT INTEGRATED
M7-S03                                   : BLOCKED — RESUME NOT AUTHORIZED
PAGAMENOS_SPEC_AUTHORITY.md              : NOT MODIFIED
RUNTIME / SCHEMA / MIGRATIONS / TESTS / WORKFLOWS / scripts-trusted / authority / S01 / S02 : NOT MODIFIED
```

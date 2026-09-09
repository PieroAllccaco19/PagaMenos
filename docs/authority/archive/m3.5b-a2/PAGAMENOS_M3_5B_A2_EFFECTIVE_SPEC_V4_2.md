<!-- R-B-17 ARCHIVAL HEADER - BEGIN. Added by the R-B-17 authority repair. Nothing below the END marker is altered. -->

> # HISTORICAL / NON-NORMATIVE
>
> **Status:** `HISTORICAL / NON-NORMATIVE - accepted-chain member, consolidated into the canonical A2 specification`
>
> **This document is retained as audit evidence only. It is NOT active authority and MUST NOT drive implementation, review, or gating.**
>
> **Active normative A2 specification:** `PAGAMENOS_M3_5B_A2_EFFECTIVE_SPEC_CANONICAL_V1.md`, which consolidates the accepted V4 to V4.5 chain without semantic change. This revision was a bounded patch closing DG-02, H03 and V4-NEW-01, and it embeds the A2 Holiday Calendar Fixture v1; it did not replace the V4 architecture.
>
> **Supersession language inside this file is non-operative.** Any claim below of the form "fully supersedes" or "fully replaces" described the review packet submitted to one historical gate. It does **not** supersede, and never superseded, the active normative artifact named above. See Appendix B of the canonical A2 specification for the full register of neutralized claims.
>
> **Body integrity.** Everything after the `R-B-17 ARCHIVAL HEADER - END` marker is the original file, byte for byte. Its SHA-256 before archival was:
>
> `sha256:01c16d8f89d403d3204ca8c84702c6f4e417da3d795e22824b662fa3afdfd76c`
>
> Verify with: `tail -n +23 <this file> | sha256sum`
>
> **Root authority register:** `PAGAMENOS_SPEC_AUTHORITY.md` · **Repair record:** `PAGAMENOS_R_B_17_AUTHORITY_REPAIR_REPORT.md`

<!-- R-B-17 ARCHIVAL HEADER - END -->

# PAGAMENOS — M3.5B-A2 EFFECTIVE PRE-IMPLEMENTATION SPECIFICATION — V4.2

**Milestone:** M3.5B-A2 — PurchaseIntent lifecycle · deterministic decision-request freezing · exact snapshot binding · crash-repair saga.
**Status:** DESIGN / DATA-AUTHORITY CLOSURE ONLY. No A2 application code / Prisma models / migrations / business-logic implementation / B1/B2 / C1/C2 / production-protocol freeze / Wave 0.
**Nature:** self-contained. **This V4.2 fully supersedes V1–V4.1.** A reviewer needs only (1) this document (which embeds `A2 Holiday Calendar Fixture v1`), (2) accepted A1 spec `PAGAMENOS_M3_5B_A1_EFFECTIVE_SPEC_V2_1.md`, and (3) the accepted repository.

**Origin:** the Codex Sol V4.1 gate returned `# B — M3.5B-A2 DESIGN REQUIRES BOUNDED PATCH`, explicitly CLOSING DG-01, DG-03, H02 (and no regression on DG-04, DG-05, DG-06, H01, H04, H05). V4.2 closes ONLY the three remaining blockers — `A2-DG-02` (exact holiday authority + accepted PurchaseContext policy + operational-state cardinality), `A2-DG-H03` (mechanically independent historical corpus authority + exhaustive semantic normalization), `A2-V4-NEW-01` (total EligibilityPortfolio normalization) — and does not reopen the closed items (§10).

**Accepted baselines (verified present, `C:/Users/piero/pagamenos-a1`, inspected READ ONLY):** M3.5A `64cf864a817c137920204487ab3317bc6d4c9ba5`; M3.5B-A1 `99f2d61bc45839d6f9506abee5fae641bfcd8b2e`; A1 doc child `7c0a3d9e0add34e4823c01f22c21542817dbc881`. **Verified (§27): `git diff 64cf864 99f2d61 -- src/corpus src/engine` is EMPTY** — A1 did not modify corpus or engine content, so the corpus digest is identical at both SHAs.

---

## 0. Carried-forward closed foundations (summarized; unchanged)

Accepted `DecideInput` *(verified `src/engine/types.ts`)*: `{ rules; operationalStates; scopes; portfolio: EligibilityPortfolio (mandatory); context: PurchaseContext; evaluatedAt; intendedTransactionAt; selectedScopeId?; holidayCalendar?: string[]; baselineByScopeId? }`. `EligibilityPortfolio = { instruments:{family:ProviderFamily; network?∈{AMEX,VISA,MC}; tier?:string; memberships?:string[]}[]; privateStates?:Record<string,Tri>; declarations?:Record<string,Tri> }`, `Tri∈{YES,NO,UNKNOWN}`. `corpusId='PAGAMENOS_VALIDATION_CORPUS_v1_2026-08-30T1800-0500'` *(verified `src/corpus/ids.ts`)*.

Entity/relationship model (final, unchanged from V4): `PurchaseIntentCaptureToken` (assignment + trusted `entrySource` + `intentCaptureKey`; `UNIQUE(assignmentId, clientCorrelationNonce)`); `PurchaseIntent` (`captureTokenId` UNIQUE FK RESTRICT; `intentType`; `initiatedAt`); `PurchaseIntentContextVersion` (discriminated signature, §3); `EligibilityProfileVersion` (normalized portfolio, §19); `PurchaseIntentFinalization` (pins `contextVersionId`+`eligibilityProfileVersionId`); `PurchaseIntentInvalidation`; `PurchaseIntentDecisionRequest` (frozen `exactValidatedDecideInputJson`+`decideInputHash`+pins+`holidayCalendarVersion`); `PurchaseIntentDecisionBinding` (**no free-standing `intentId`**; `UNIQUE(decisionRequestId)`/`UNIQUE(snapshotId)`; `verifyPurchaseIntentDecisionBinding`).

**Closed (carried, §10):** DG-01 consent serialization = Model A (assignment `FOR UPDATE` + separate READ COMMITTED consent read); DG-03 trusted server-resolved `entrySource` (closed `TrustedEntryEvidence` union + precedence); H02 reload-and-prove P2002; DG-04 complete context hash; DG-05 cross-wiring-free binding + verifier; DG-06 Case-C = internal processing (no consent read; withdrawal ≠ invalidation; decision service has no consent capability); H01 Prisma **6.19.3**; H04 unused-token material; H05 label grammar. Global lock order `ExperimentAssignment ≺ PurchaseIntent root (UUID asc) ≺ children`.

---

## 1. A2-DG-02(a) — Accepted PurchaseContext policy: COMPLETE-SIGNATURE-ONLY

> **A2 Phase-0A defines a stricter input-capture contract than the generic engine `PurchaseContext` (whose optional-field schema tolerates partial/mixed states yielding `MISSING_CONTEXT`). This does NOT alter M3 engine semantics; it limits which contexts Phase-0A A2 will freeze into a DecisionRequest.** A2 admits ONLY a context that instantiates exactly one complete supported purchase-signature family (single discriminant `signatureKind`).

Context version stores one normalized `purchaseSignatureJson` under `contextSchemaVersion="pagamenos.a2-context.v1"` (strict, unknown keys rejected) + lifted `merchantId`, `signatureKind`, `intendedTransactionAt`.

| `signatureKind` | Corpus scope | Required | Optional | Forbidden (A2) |
| :-- | :-- | :-- | :-- | :-- |
| **BILL** | ELIGIBLE_BILL | `merchantId`, `intendedTransactionAt`, `wholeBillCentimos`, `purchaseDomain` | `channel`, `branch`, `foodCentimos`, `nonAlcoholicBeverageCentimos` | `ticket*`, `exactItems`, `nominalPackage` |
| **TICKETS** | TICKETS | `merchantId`, `intendedTransactionAt`, `ticketUnitPriceCentimos`, `ticketCount`, `ticketClass` | `channel`, `branch` | `wholeBill*/food*`, `exactItems`, `nominalPackage`, `purchaseDomain` |
| **EXACT_ITEMS** | EXACT_BUNDLE | `merchantId`, `intendedTransactionAt`, `exactItems` (non-empty; unique `itemKey`; positive-int `qty`) | `channel`, `branch` | `wholeBill*/food*`, `ticket*`, `nominalPackage`, `purchaseDomain` |
| **NOMINAL_PACKAGE** | NOMINAL_PACKAGE | `merchantId`, `intendedTransactionAt`, `nominalPackage{cashAcquisitionCostCentimos, nominalUnit}` | `channel`, `branch` | `wholeBill*/food*`, `ticket*`, `exactItems`, `purchaseDomain` |

Verified rationale: `signatureRelevant` (`provenance.ts`) matches ELIGIBLE_BILL on `merchantId`+`purchaseDomain` (absent⇒MISSING) → A2 requires `purchaseDomain`; TICKETS on `ticketCount`+`ticketClass` (both required); EXACT_BUNDLE item-for-item; NOMINAL_PACKAGE on `cashAcquisitionCostCentimos`+`nominalUnit`. Enums from `CHANNELS`/`PURCHASE_DOMAINS`/`NOMINAL_UNITS`; céntimos integer ≥ 0; BILL split coherence `food + nonAlc ≤ wholeBill` when all present. **Mixed rejection (frozen):** `exactItems+wholeBill`, `tickets+purchaseDomain`, `nominalPackage+wholeBill`, `food split+tickets` → `PurchaseIntentContextSignatureError`. Tests prove the generic M3 engine may accept a partial/mixed context while A2 capture rejects it.

---

## 2. A2-DG-02(b) — Operational-state cardinality (fail closed)

At DecisionRequest construction:
```
includedRuleKeys = { ruleId@version : each included rule }
stateMultimap    = group corpusSnapshot.operationalStates by ruleId@version
for key in includedRuleKeys:
  n = |stateMultimap[key]|
  n==0 → throw PurchaseIntentCorpusOperationalStateIntegrityError('missing', key)
  n>1  → throw PurchaseIntentCorpusOperationalStateIntegrityError('duplicate', key)
```
Exactly one op-state per included rule; never rely on the current corpus being coherent. Orphan op-states (for rules not included) do not enter `DecideInput`; the corpus release guard (§8) rejects duplicate/missing/orphan globally. (Verified `EXPECTED.activeRules=46`; corpus is 46 rules / 46 states.)

---

## 3. A2-DG-02(c) — EXACT holiday authority

### 3.1 Verified engine facts
The corpus does NOT own a holiday calendar; each rule carries only `holidayPolicy∈{NONE,EXCLUDED,SPECIFIC_DATES,UNKNOWN}` (+ optional per-rule `specificBlackoutDates`) *(verified `corpus/data/rules.ts`, `corpus/ids.ts`)*. `holidayCalendar` is a `decide()` input *(verified `engine/decide.ts`: `new Set(input.holidayCalendar ?? [])`; `engine/time.ts` `evaluateHoliday`)*: `EXCLUDED`→BLOCKED iff `holidayCalendar.has(limaDate(intendedTransactionAt))`; `UNKNOWN`→UNCERTAIN only on a holiday date; `SPECIFIC_DATES`→rule's own dates; `NONE`→ALLOWED. So the calendar is decision-critical and A2-owned.

### 3.2 Semantic policy (frozen)
> `holidayCalendar` contains statutory/public **feriados** that legally apply as feriados to ordinary **private-sector commercial activity** in Lima/Callao, Peru. **INCLUDE:** Peru national statutory public holidays applicable to private-sector workers (incl. movable statutory national holidays); a Lima/Callao-specific holiday ONLY if an enacted legal authority makes it a public holiday applicable to ordinary private-sector commerce in the jurisdiction/date. **EXCLUDE:** ordinary `día no laborable` (public-sector) declarations; optional private-sector non-working days dependent on employer/worker agreement; compensable public-sector-only non-working days; banking-only holidays; government-office closures that are not legal private-sector feriados; school holidays; commemorative dates without private-sector feriado legal effect. `feriado` is never conflated with `día no laborable`. An exceptional measure classifying a private-sector-mandatory date as something other than a statutory feriado is documented separately, not silently included.

### 3.3 Source conflict hierarchy (frozen)
(1) enacted law / legislative decree / official legal amendment; (2) a later specific legal norm prevails over an earlier general norm where legally applicable; (3) an official consolidated government holiday page may *instantiate* dates but never override enacted legal text; (4) SUNAFIL/MTPE guidance is interpretive evidence for private-sector applicability; (5) a material conflict between authoritative sources ⇒ declare `HOLIDAY_AUTHORITY_CONFLICT` and fail the fixture gate. Each included holiday records its establishing legal authority (§3.7). **No `HOLIDAY_AUTHORITY_CONFLICT` was encountered** authoring this fixture.

### 3.4 Coverage (frozen absolute range)
`coverageStartDate = 2026-01-01`, `coverageEndDate = 2027-12-31` (deliberately broader than the expected Phase-0A study period; independent of any production-protocol freeze). A2 Phase-0A MUST reject a finalized `intendedTransactionAt` whose America/Lima calendar date is outside `[2026-01-01, 2027-12-31]` with `PurchaseIntentHolidayCoverageError` — there is no undefined future horizon and no dynamic derivation from the (unfrozen) production protocol.

### 3.5 Movable holidays (Gregorian computus; verified)
Holy Thursday (Jueves Santo) and Good Friday (Viernes Santo) are statutory feriados (DL 713); their calendar dates follow Gregorian Easter. Computed here (Anonymous Gregorian algorithm): **Easter 2026 = 2026-04-05** ⇒ Jueves Santo **2026-04-02**, Viernes Santo **2026-04-03**; **Easter 2027 = 2027-03-28** ⇒ Jueves Santo **2027-03-25**, Viernes Santo **2027-03-26**. The fixture contains the exact instantiated dates; no runtime computation.

### 3.6 Lima/Callao local determination (§9)
**No additional Lima/Callao-local private-sector public holidays are included for this fixture.** Basis: Peru's national feriado regime (DL 713 Art. 6 + the national amending laws in §3.7) governs private-sector feriados; no enacted Lima Metropolitan / Callao regional norm within `[2026-01-01, 2027-12-31]` establishes a feriado applicable to ordinary private commerce beyond the national set. Municipal/regional anniversaries and commemorative dates do not carry private-sector feriado legal effect and are excluded. (Fixture-gate obligation §3.9: an independent reviewer re-confirms no qualifying local norm exists in coverage.)

### 3.7 — `A2 HOLIDAY CALENDAR FIXTURE V1` (actual dates + provenance)

```
version           = "pagamenos.holiday.pe-lima-callao.private-commerce.v1"
jurisdiction      = "PE-LIMA-CALLAO-PRIVATE-COMMERCE"
legalPolicyVersion= "dl713-art6+ley31381+ley31530+ley31788+ley31822.v1"
coverageStartDate = "2026-01-01"
coverageEndDate   = "2027-12-31"
applicability (every entry) = PRIVATE_SECTOR_PUBLIC_HOLIDAY
```

| date | holidayCode | holidayName | authorityRefs |
| :-- | :-- | :-- | :-- |
| 2026-01-01 | PE_ANIO_NUEVO | Año Nuevo | DL 713 Art.6 |
| 2026-04-02 | PE_JUEVES_SANTO | Jueves Santo (movable; Easter 2026-04-05) | DL 713 Art.6 |
| 2026-04-03 | PE_VIERNES_SANTO | Viernes Santo (movable) | DL 713 Art.6 |
| 2026-05-01 | PE_DIA_DEL_TRABAJO | Día del Trabajo | DL 713 Art.6 |
| 2026-06-07 | PE_BATALLA_ARICA_BANDERA | Batalla de Arica y Día de la Bandera | Ley 31788 |
| 2026-06-29 | PE_SAN_PEDRO_SAN_PABLO | San Pedro y San Pablo | DL 713 Art.6 |
| 2026-07-23 | PE_FUERZA_AEREA_QUINONES | Día de la Fuerza Aérea del Perú (Cap. FAP J.A. Quiñones) | Ley 31822 |
| 2026-07-28 | PE_FIESTAS_PATRIAS_28 | Fiestas Patrias (Independencia) | DL 713 Art.6 |
| 2026-07-29 | PE_FIESTAS_PATRIAS_29 | Fiestas Patrias | DL 713 Art.6 |
| 2026-08-06 | PE_BATALLA_JUNIN | Batalla de Junín | Ley 31530 |
| 2026-08-30 | PE_SANTA_ROSA_LIMA | Santa Rosa de Lima | DL 713 Art.6 |
| 2026-10-08 | PE_COMBATE_ANGAMOS | Combate de Angamos | DL 713 Art.6 |
| 2026-11-01 | PE_TODOS_LOS_SANTOS | Día de Todos los Santos | DL 713 Art.6 |
| 2026-12-08 | PE_INMACULADA_CONCEPCION | Inmaculada Concepción | DL 713 Art.6 |
| 2026-12-09 | PE_BATALLA_AYACUCHO | Batalla de Ayacucho | Ley 31381 |
| 2026-12-25 | PE_NAVIDAD | Navidad | DL 713 Art.6 |
| 2027-01-01 | PE_ANIO_NUEVO | Año Nuevo | DL 713 Art.6 |
| 2027-03-25 | PE_JUEVES_SANTO | Jueves Santo (movable; Easter 2027-03-28) | DL 713 Art.6 |
| 2027-03-26 | PE_VIERNES_SANTO | Viernes Santo (movable) | DL 713 Art.6 |
| 2027-05-01 | PE_DIA_DEL_TRABAJO | Día del Trabajo | DL 713 Art.6 |
| 2027-06-07 | PE_BATALLA_ARICA_BANDERA | Batalla de Arica y Día de la Bandera | Ley 31788 |
| 2027-06-29 | PE_SAN_PEDRO_SAN_PABLO | San Pedro y San Pablo | DL 713 Art.6 |
| 2027-07-23 | PE_FUERZA_AEREA_QUINONES | Día de la Fuerza Aérea del Perú | Ley 31822 |
| 2027-07-28 | PE_FIESTAS_PATRIAS_28 | Fiestas Patrias (Independencia) | DL 713 Art.6 |
| 2027-07-29 | PE_FIESTAS_PATRIAS_29 | Fiestas Patrias | DL 713 Art.6 |
| 2027-08-06 | PE_BATALLA_JUNIN | Batalla de Junín | Ley 31530 |
| 2027-08-30 | PE_SANTA_ROSA_LIMA | Santa Rosa de Lima | DL 713 Art.6 |
| 2027-10-08 | PE_COMBATE_ANGAMOS | Combate de Angamos | DL 713 Art.6 |
| 2027-11-01 | PE_TODOS_LOS_SANTOS | Día de Todos los Santos | DL 713 Art.6 |
| 2027-12-08 | PE_INMACULADA_CONCEPCION | Inmaculada Concepción | DL 713 Art.6 |
| 2027-12-09 | PE_BATALLA_AYACUCHO | Batalla de Ayacucho | Ley 31381 |
| 2027-12-25 | PE_NAVIDAD | Navidad | DL 713 Art.6 |

`normalizedDates` (32, sorted unique) and `contentDigest` are reproduced in §3.8. Per-year count = 16 (14 fixed statutory + 2 movable).

**sourceManifest** (first-party government authorities; research/access date **2026-09-02**):
- **Decreto Legislativo N° 713, Art. 6** (consolidated feriados regime) — Diario Oficial El Peruano normative database, `https://diariooficial.elperuano.pe/Normas/obtenerDocumento?idNorma=110007`; congressional copy `https://www.leyes.congreso.gob.pe/Documentos/DecretosLegislativos/00713.pdf`.
- **Ley N° 31788** — 7 June feriado (Batalla de Arica / Día de la Bandera): `https://busquedas.elperuano.pe/dispositivo/NL/2187453-1`.
- **Ley N° 31822** (2023) — 23 July feriado nacional (Día de la Fuerza Aérea / Cap. FAP J.A. Quiñones), private + public sector; corroborated TVPerú `https://tvperu.gob.pe/noticias/nacionales/es-oficial-declaran-feriado-nacional-el-23-de-julio-por-el-dia-de-la-fuerza-aerea-del-peru` and Diario Oficial El Peruano.
- **Ley N° 31530** (2022) — 6 August feriado (Batalla de Junín): `https://busquedas.elperuano.pe/dispositivo/NL/2089960-2`.
- **Ley N° 31381** (2021) — 9 December feriado (Batalla de Ayacucho): `https://busquedas.elperuano.pe/dispositivo/NL/2026913-1`.
- Consolidated corroboration: gob.pe Plataforma del Estado (`https://www.gob.pe/feriados`) and SUNAFIL/MTPE 2026 feriado guidance (interpretive private-sector applicability).

**Authoring transparency (honest provenance).** `https://www.gob.pe/feriados` returned HTTP 418 (bot protection) during authoring, so enacting-law identities were confirmed via the Diario Oficial El Peruano official normative database (`busquedas.elperuano.pe/dispositivo/NL/…`, first-party) plus gob.pe/TVPerú/SUNAFIL corroboration; movable dates were derived by the Gregorian computus (§3.5). The fixture-gate (§3.9) requires an independent reviewer to re-verify each enacting law's official text and the Lima/Callao determination before the fixture is accepted. This is a bounded data-authoring artifact, not a research phase.

### 3.8 Normalization + content digest (reproducible)
```
normalizeHolidayCalendarV1(rawDates):
  parse strict YYYY-MM-DD; reject invalid; deduplicate; sort code-point (== chronological for ISO dates)

holidaySemanticPayload = {
  versionedPolicy: legalPolicyVersion,
  jurisdiction, coverageStartDate, coverageEndDate,
  normalizedDates
}
contentDigest = "sha256:" + SHA-256( canonical(holidaySemanticPayload) )   // reuse accepted src/persistence/canonical.ts + hash.ts
```
Computed with the accepted canonicalizer semantics (keys code-point-sorted, arrays preserved, JSON-escaped strings), the canonical preimage is:
```
{"coverageEndDate":"2027-12-31","coverageStartDate":"2026-01-01","jurisdiction":"PE-LIMA-CALLAO-PRIVATE-COMMERCE","normalizedDates":["2026-01-01","2026-04-02","2026-04-03","2026-05-01","2026-06-07","2026-06-29","2026-07-23","2026-07-28","2026-07-29","2026-08-06","2026-08-30","2026-10-08","2026-11-01","2026-12-08","2026-12-09","2026-12-25","2027-01-01","2027-03-25","2027-03-26","2027-05-01","2027-06-07","2027-06-29","2027-07-23","2027-07-28","2027-07-29","2027-08-06","2027-08-30","2027-10-08","2027-11-01","2027-12-08","2027-12-09","2027-12-25"],"versionedPolicy":"dl713-art6+ley31381+ley31530+ley31788+ley31822.v1"}
```
```
contentDigest = sha256:6d65409665d176d40390be4ed8414dc22e4ab9d11b40ede1d38abb7b258460d8
```
Any change to a date / jurisdiction / coverage / policy changes the digest and REQUIRES a new `version` (§3.9). The digest is byte-reproducible by anyone from the preimage above.

### 3.9 Version immutability + registry record
`version` MUST change if any included date changes, an omitted date becomes included, or jurisdiction/applicability/coverage/policy changes. The version registry record (retained by the application for self-integrity, §16) is:
```
HOLIDAY_CALENDAR_REGISTRY_V1["pagamenos.holiday.pe-lima-callao.private-commerce.v1"] = {
  version, digest: "sha256:6d654096…60d8",
  jurisdiction: "PE-LIMA-CALLAO-PRIVATE-COMMERCE",
  legalPolicyVersion: "dl713-art6+ley31381+ley31530+ley31788+ley31822.v1",
  coverageStartDate: "2026-01-01", coverageEndDate: "2027-12-31"
}
```

### 3.10 DecisionRequest self-integrity + finalization gate
DecisionRequest stores `holidayCalendarVersion` and the exact `normalizedDates` inside the frozen `DecideInput.holidayCalendar`. Self-integrity (per load): (1) load the accepted registry record for the stored version from the application's retained `HOLIDAY_CALENDAR_REGISTRY_V1`; (2) recompute the semantic digest from the frozen `normalizedDates` + the record's `versionedPolicy`/`jurisdiction`/`coverage`; (3) compare to the registered digest; (4) fail closed on mismatch. No current holiday-source lookup on retry. The current-runtime gate does NOT compare a current holiday version (the exact dates are frozen and bound by `decideInputHash`). At finalization/freeze: convert `intendedTransactionAt`→Lima date; verify coverage (else `PurchaseIntentHolidayCoverageError`); copy the pinned version's `normalizedDates` into `DecideInput`; persist `holidayCalendarVersion`; hash the full `DecideInput`.

### 3.11 Holiday tests
Reviewer reproduces the exact fixture from cited authorities; all dates sorted/unique; mutate one date → digest changes; edit date + local registry under the same version → external-base comparison (§6) fails; coverage boundaries exact; date outside coverage → fail closed; known statutory holiday membership correct (e.g. `2026-07-28`∈, `2026-04-03`∈); an ordinary non-holiday absent (e.g. `2026-07-27` ∉ — it is a public-sector *día no laborable*, excluded); public-sector-only day excluded; optional agreement day excluded; retry uses frozen dates despite a current-calendar change; a known holiday drives `holidayPolicy` (EXCLUDED→BLOCKED, UNKNOWN→UNCERTAIN) consistently in the engine; version cannot mutate.

---

## 4. Governance — external protected authority-base SHA (single mechanism; §§13–14 of task)

Both the holiday registry and the corpus ledger use ONE mechanically-independent historical-authority mechanism (no tags, no local self-referential fixtures, no content-addressed IDs offered as alternatives):

**Protected CI variable `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA`** — configured in CI/project settings OUTSIDE any candidate Git change; ordinary repository changes cannot alter it; it holds the **full immutable Git object SHA** (never a branch name) of the latest independently-ACCEPTED authority-baseline commit, which contains `HOLIDAY_CALENDAR_REGISTRY_V1` and `CORPUS_RELEASE_LEDGER_V1`. Candidate CI reads history from that SHA:
```
BASE_SHA = env.PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA
git cat-file -e "$BASE_SHA^{commit}"          # must exist
git show "$BASE_SHA:<authority-path>"         # accepted historical authority
```
A candidate cannot satisfy the gate by editing repository files, because the historical comparison comes from a commit SHA supplied outside the candidate.

### 4.1 Bootstrap (frozen sequence)
1. Produce V4.2 + the exact Holiday Fixture v1 (§3.7). 2. Produce the initial authority-baseline artifact containing `HOLIDAY_CALENDAR_REGISTRY_V1` (§3.9) and `CORPUS_RELEASE_LEDGER_V1` (§7). 3. Independently gate those contents. 4. Commit ONLY the accepted authority artifacts in a dedicated authority-baseline commit. 5. Record that full immutable commit SHA in `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA`. 6. Only then may A2 implementation begin. 7. Ordinary candidate code cannot change the protected variable. 8. A future authority update requires a new independently-reviewed additive authority commit, a new full SHA, and a privileged CI-variable rotation AFTER acceptance.

### 4.2 Threat model (stated)
This protects against ordinary candidate/repository changes self-approving authority mutation. It does NOT defend against an administrator who can maliciously alter protected CI variables (outside A2's application threat model). Ordinary implementation changes cannot self-approve historical-authority mutation — sufficient mechanical independence.

### 4.3 Shared commit, independent semantics
Holiday and corpus share `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA` for governance but keep independent registries (`HOLIDAY_CALENDAR_REGISTRY_V1` vs `CORPUS_RELEASE_LEDGER_V1`). Holiday changes never imply a `corpusId` change and vice-versa; `DecideInput`/`inputHash` binds both concrete inputs.

---

## 5. Holiday CI gate

CI: (1) load accepted historical registry from `$PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA`; (2) every historical version in the base registry MUST remain byte/semantic-identical in the candidate; (3) only additive NEW versions allowed; (4) the current fixture's computed digest MUST equal its candidate registry entry; (5) an existing version with a changed date/policy/coverage MUST fail. **Attack** — edit holiday dates + edit local holiday registry + keep version unchanged — fails against the external base SHA (step 2).

---

## 6. A2-DG-H03 — Corpus historical authority (same external mechanism)

`CORPUS_RELEASE_LEDGER_V1` (map `corpusId → corpusSemanticDigest`) lives in the authority-baseline artifact/commit; candidate code may propose additions, but CI compares all historical entries against the immutable external base SHA (§4). Same mechanism; no alternative.

### 6.1 Bootstrap from `64cf864`
Because §27 verified the corpus content is byte-identical between `64cf864` and `99f2d61`, the initial ledger digest is computed from the corpus at the exact accepted M3.5A commit `64cf864a817c137920204487ab3317bc6d4c9ba5` (equivalently the current accepted checkout):
```
CORPUS_RELEASE_LEDGER_V1 = {
  "PAGAMENOS_VALIDATION_CORPUS_v1_2026-08-30T1800-0500": "sha256:<corpusSemanticDigest @64cf864>"
}
```
The digest is computed by §7 `normalizeCorpusSemanticProjection` over `loadCorpus()` at that commit; it is then independently gated, and its authority-baseline commit SHA becomes the protected external value (§4.1). (The concrete hex is produced at the bootstrap gate by running the frozen projection+hash against `64cf864`; it is fully reproducible and is not hand-authored here to avoid asserting an unverified value.)

---

## 7. Exhaustive corpus semantic projection (field-by-field)

`corpusSemanticDigest = "sha256:" + SHA-256(canonical(normalizeCorpusSemanticProjection(loadCorpus())))`. **`corpusId` is EXCLUDED from the digest** (so renaming the id cannot change the digest and identity comparison stays clean). Projection = `{ scopes, activeRules, operationalStates }` only (`decide()` consumes only these via `DecideInput`; `merchants`/`sources`/`researchMeta`/`freezeTimestamp`/`excludedRules` are not decision inputs).

### 7.1 `ComparisonScope`
| field | class | note |
| :-- | :-- | :-- |
| scopeId | INCLUDE | stable identity / sort key |
| merchantId | INCLUDE | scope applicability |
| comparisonBasis | INCLUDE | decision basis |
| equivalenceGroup | INCLUDE | cross-candidate equivalence semantics |
| purchaseKind | INCLUDE | scope semantic identity |
| requiredContext | INCLUDE (array §7.5) | matching prerequisites |
| allowedSelectors | INCLUDE (array §7.5) | permitted spend bases |
| signature | INCLUDE (§7.2) | purchase-signature matcher |

### 7.2 `PurchaseSignature` (discriminated)
| field | class |
| :-- | :-- |
| kind | INCLUDE |
| merchantId | INCLUDE |
| canonicalItems (EXACT_BUNDLE) | INCLUDE (array §7.5, set by `itemKey`) |
| purchaseDomain (ELIGIBLE_BILL) | INCLUDE |
| ticketCount, ticketClass (TICKETS) | INCLUDE |
| cashAcquisitionCostCentimos, nominalUnit (NOMINAL_PACKAGE) | INCLUDE |

### 7.3 `RuleVersion`
| field | class | justification |
| :-- | :-- | :-- |
| ruleId, version | INCLUDE | identity / sort key |
| campaignId | INCLUDE | semantic identity (combinability/grouping) |
| merchantIds | INCLUDE (array §7.5) | applicability set |
| providerFamily | INCLUDE | eligibility (`hasFamily`) |
| benefit (full union) | INCLUDE | economic core |
| eligibleSpendSelector | INCLUDE | spend base |
| canonicalItems? | INCLUDE (array §7.5) | EXACT_BUNDLE structural check |
| ticketContext? | INCLUDE | TICKETS structure |
| constraints (all sub-fields §7.4) | INCLUDE | eligibility/temporal/economic |
| eligibilityClass | INCLUDE | eligibility resolution |
| confidence | INCLUDE | rankability (`confidenceRankable`) |
| comparisonScopeRefs | INCLUDE (array §7.5) | scope participation |
| signatureKind | INCLUDE | signature identity |
| provenance {sourceId,url,observedAt} | **EXCLUDE** | documentary; `decide()` never reads it |

### 7.4 `RuleVersion.constraints`
INCLUDE all: `temporal` (the discriminated range), `holidayPolicy`, `specificBlackoutDates?` (array §7.5), `weekdays?` (array §7.5), `timeWindow?`, `minimumSpend?`, `cap?`, `channels?` (array §7.5), `locations?.include/exclude` (arrays §7.5), `products?.includeSku/excludeSku` (arrays §7.5), `useLimit?`, `stock?`, `cardNetwork?`, `cardTier?`, `membership?`, `providerPrivateKey?`, `preRedemptionVerifiable?`, `combinability`. None are documentary — every one can alter eligibility/temporal/economic evaluation.

### 7.5 `RuleOperationalState`
| field | class |
| :-- | :-- |
| ruleId, version | INCLUDE (join key / sort key) |
| publicationState | INCLUDE (`resolvePublication`) |
| sourceQualityState | INCLUDE (`resolveSourceQuality`) |
| availability | INCLUDE (`resolveAvailability`) |
| asOf | **EXCLUDE** (not consumed by `decide()`; knowledge-time provenance) |
| note | **EXCLUDE** (documentary) |

### 7.6 Array semantic classification (no blanket sorting)
Every array/set-like corpus field is **SET-LIKE** (order carries no decision meaning under the verified engine consumption). No ORDERED array exists in the corpus decision content. Normalization per set-like field: validate elements; **duplicates are INVALID** → the corpus release validator fails; **canonical sort**. Concretely:

| Array field | classification | duplicate policy | sort key |
| :-- | :-- | :-- | :-- |
| ComparisonScope.requiredContext | SET-LIKE | invalid → fail | code-point |
| ComparisonScope.allowedSelectors | SET-LIKE | invalid → fail | code-point |
| PurchaseSignature.canonicalItems (EXACT_BUNDLE) | SET-LIKE | duplicate `itemKey` invalid → fail | `itemKey` |
| RuleVersion.merchantIds | SET-LIKE | invalid → fail | code-point |
| RuleVersion.comparisonScopeRefs | SET-LIKE | invalid → fail | code-point |
| RuleVersion.canonicalItems | SET-LIKE | duplicate `itemKey` invalid → fail | `itemKey` |
| constraints.weekdays | SET-LIKE | invalid → fail | canonical weekday index (MON..SUN) |
| constraints.channels | SET-LIKE | invalid → fail | code-point |
| constraints.specificBlackoutDates | SET-LIKE | invalid → fail | code-point (== chronological) |
| constraints.locations.include / exclude | SET-LIKE | invalid → fail | code-point |
| constraints.products.includeSku / excludeSku | SET-LIKE | invalid → fail | code-point |

### 7.7 Object ordering + cardinality
Top-level projection: `scopes` sorted by `scopeId`; `activeRules` sorted by `(ruleId, version)`; `operationalStates` sorted by `(ruleId, version)`. Duplicate stable identity (two scopes with one `scopeId`, or two rules/states with one `(ruleId, version)`) → **fail release gate**. Operational-state cardinality (§2) enforced at release: for every active rule key exactly one state; duplicate/missing/orphan → fail. The digest is computed ONLY after validation passes.

---

## 8. Corpus CI gate + attack test

CI: (1) compute current `corpusSemanticDigest`; (2) load candidate ledger; (3) require candidate `ledger[currentCorpusId] == currentDigest`; (4) load accepted historical ledger from `$PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA`; (5) require EVERY accepted historical `(corpusId, digest)` to exist unchanged in the candidate ledger; (6) candidate may add new IDs only; (7) same ID + changed digest → fail; (8) new digest under an old ID → fail; (9) changed decision-content without a new ID → fail; (10) editing all candidate local files cannot defeat step 5. **Required attack test:** start from accepted authority base → change a decision-relevant `RuleVersion` field → recompute digest → edit the candidate `CORPUS_RELEASE_LEDGER_V1` old entry → keep same `corpusId` → **CI FAILS** (candidate old entry ≠ external authority-base old entry); then change every local repository authority file too → **still FAILS** (base comes from the protected external SHA). **Future rotation:** new additive accepted authority commit → independent gate verifies old entries unchanged → privileged owner updates `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA` to the new full SHA (no force-moved tag, no branch authority, no candidate-owned base selection).

---

## 9. A2-V4-NEW-01 — Total EligibilityPortfolio normalization

**Verified consumption** *(`engine/eligibility.ts`)*: instruments matched existentially by `family`/`network`/`tier`/`memberships.includes` (case-sensitive `===`); `declarations` keyed `network:<FAM>:<NET>` / `tier:<FAM>:<TIER>` / `membership:<X>`; `privateStates` keyed by `providerPrivateKey`. Set semantics; case preserved.

`normalizeEligibilityPortfolioV1(raw): EligibilityPortfolio` is a **TOTAL** function over valid raw input, else a deterministic typed rejection. Exact order:
```
1. validate top-level known fields only (reject unknown keys)
2. per instrument:
   a. family ∈ PROVIDER_FAMILIES else reject
   b. network ∈ {AMEX,VISA,MC} if present else reject
   c. tier: if present, trim; blank-after-trim → REJECT (EligibilityProfileBlankTierError); preserve case; ≤128
   d. memberships: trim each; blank element → REJECT (EligibilityProfileBlankMembershipError); ≤128; preserve case;
      deduplicate exact-equal; sort code-point; if zero after normalization → OMIT the field (never [])
   e. omit empty optional containers
3. deduplicate identical normalized instruments
4. sort instruments by comparator: (family, network ?? '', tier ?? '', canonicalMembershipsSerialized)
5. privateStates: for each raw key → normalizedKey = trim(key); validate grammar (non-empty, ≤128, preserve case);
   group by normalizedKey; if >1 DISTINCT raw key maps to one normalizedKey → REJECT
     (EligibilityProfileNormalizedKeyCollisionError) — even if identical Tri; validate Tri∈{YES,NO,UNKNOWN};
   build map from keys sorted code-point; if zero entries → OMIT (never {})
6. declarations: identical algorithm (EligibilityProfileNormalizedKeyCollisionError on collision)
7. construct normalized EligibilityPortfolio
8. strict schema validate (portfolioSchemaVersion="pagamenos.a2-portfolio.v1"; privacy — no PAN/CVV/credentials/transactions)
9. persist ONLY the normalized object
10. use ONLY the normalized object for: requestHash, domain reconciliation, finalization pinning, DecideInput.portfolio
```

**Post-trim map-key collision (frozen):** two DISTINCT raw keys that trim to one normalized key → REJECT the entire profile (never last/first-write-win, never merge, never JSON-order choice), even with identical `Tri`. Test: `"membership:X"` and `" membership:X "` → always `EligibilityProfileNormalizedKeyCollisionError` (privateStates and declarations alike).

**Absent vs empty (frozen equivalence):** `memberships: undefined` ≡ `memberships: []` ≡ zero-after-normalization → **field omitted** (never persist `[]`); a blank membership string is **rejected**, not silently erased. `privateStates: undefined` ≡ `privateStates: {}` → **omitted** (never `{}`). `declarations: undefined` ≡ `declarations: {}` → **omitted**. Instrument `tier`: absent stays omitted; blank/whitespace-only `tier` is **invalid** (rejected), not equivalent to absent. After instrument normalization, two identical instruments deduplicate. Maps are built from code-point-sorted keys so key-order permutations converge before hashing.

**Tests:** equivalent inputs converge (reordered instruments; reordered memberships; duplicate memberships; duplicate identical instruments; map key-order permutation; absent memberships vs `[]`; absent privateStates vs `{}`; absent declarations vs `{}`) → identical normalized `portfolioJson`, identical `requestHash`, same reconciliation. **Reject:** post-trim privateStates/declarations collision; blank membership; blank tier. **Diverge (semantic change):** family / network / non-blank tier / membership value / `Tri` value.

---

## 10. Carried-forward closed findings (NOT reopened)

DG-01 (Model A consent serialization), DG-03 (trusted `entrySource` union + precedence), H02 (reload-and-prove P2002), DG-04 (complete context hash — extended to the §1 discriminated fields), DG-05 (binding without free `intentId` + `verifyPurchaseIntentDecisionBinding`), DG-06 (Case-C internal processing, no consent read), H01 (Prisma 6.19.3), H04 (unused-token material), H05 (label grammar). Unchanged except where §1/§9 supply the concrete context/portfolio shapes those contracts operate over.

---

## 11. SCI updates

- **SCI-A2-05 (DecideInput authority) — READY:** COMPLETE-SIGNATURE-ONLY policy explicit (§1); every accepted field has exact authority; **actual** Holiday Fixture v1 embedded and content-defined (§3.7/§3.8); operational-state exactly-one cardinality (§2).
- **SCI-A2-12 (retry/domain identity) — READY:** total portfolio normalization (§9) + reload-and-prove P2002 (carried) complete domain identity.
- **SCI-A2-17 (portfolio input authority) — READY:** total pre-persistence normalization incl. post-trim collision rejection + absent/empty equivalence (§9).
- **SCI-A2-18 (corpus/authority integrity) — READY:** external protected-base-SHA mechanism (§4) + exhaustive field-by-field projection + array classification (§7) + attack test (§8) + content-bound holiday registry (§3.9/§5).
- SCI-A2-01/02/03/04/06/07/08/09/10/11/13/14/15/16 carried from V4/V4.1 unchanged.

---

## 12. R35R matrix

| Finding | Status | Basis |
| :-- | :-- | :-- |
| R35R-04 | CLOSED | businessDecisionKey from immutable id |
| R35R-05 | CLOSED | full DecideInput authority now executable (§1/§2/§3/§7) + binding repair |
| R35R-06 | CLOSED | deterministic trusted entry evidence (carried DG-03) + exact authorities |
| R35R-08 A2 | CLOSED | consent serialization (Model A, carried DG-01) |
| R35R-11 A2 | CLOSED | all A2 SCI READY (§11) |
| R35R-15 A2 | CLOSED | total normalization (§9) + reload-and-prove P2002 (carried) |
| R35R-19 | DEFERRED NON-BLOCKING | timestamps preserved; as-of C2 |

---

## 13. V4.2 Three-Blocker Closure Matrix

| Finding | Status | Exact authority | Mechanical enforcement | Closure test |
| :-- | :-- | :-- | :-- | :-- |
| A2-DG-02 | **CLOSED** | (a) COMPLETE-SIGNATURE-ONLY capture policy (§1); (b) op-state exactly-one cardinality (§2); (c) `A2 Holiday Calendar Fixture v1` with actual DL 713 + Ley 31788/31822/31530/31381 dates (§3.7), digest `sha256:6d654096…60d8` (§3.8) | discriminated `purchaseSignatureJson` schema; per-included-rule state count==1; frozen `normalizedDates`+coverage fail-closed; version-immutable registry (§3.9); holiday CI gate (§5) | §1 mixed-rejection; §2 missing/duplicate/orphan; §3.11 fixture reproduction/mutation/coverage/retry |
| A2-DG-H03 | **CLOSED** | external protected `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA` (§4) + `CORPUS_RELEASE_LEDGER_V1` bootstrapped from `64cf864` (§6.1) | dual CI gates (current digest == ledger[id]; ledger == external base for old entries) (§8); exhaustive projection (§7); op-state cardinality | §8 content-change+ledger-edit+same-corpusId MUST fail, even editing all local files |
| A2-V4-NEW-01 | **CLOSED** | verified existential/case-sensitive engine consumption (§9) | total `normalizeEligibilityPortfolioV1` before persistence/hash/reconciliation; post-trim collision reject; absent/empty omission (§9) | §9 convergence/rejection/divergence tests |

**DG-01, DG-03, H02, DG-04, DG-05, DG-06, H01, H04, H05 remain CLOSED (§10).**

---

## 14. Exact next action

**STOP.** Submit V4.2 (with the embedded `A2 Holiday Calendar Fixture v1`) for the final independent Codex Sol closure gate, alongside accepted A1 V2.1 and the accepted repository. Before A2 implementation begins, execute the authority bootstrap (§4.1): independently gate the Holiday Fixture v1 (re-verifying each cited enacting law's official text and the Lima/Callao determination, §3.7) and the corpus ledger (§6.1), commit them as the authority baseline, and set `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA`. Do not implement A2, create Prisma models/migrations, author fixtures as application code, expose any facade, or open a branch. `Production Protocol v1 = UNFROZEN`; `Wave 0 = NOT AUTHORIZED`.

---

# Final Verdict

## M3.5B-A2 EFFECTIVE DESIGN V4.2 READY FOR FINAL INDEPENDENT CLOSURE GATE

- **A2-DG-02 — CLOSED:** the accepted-`PurchaseContext` policy is an explicit COMPLETE-SIGNATURE-ONLY capture restriction (§1); operational-state cardinality is fail-closed at build and release (§2); and the holiday authority is an **actual** content-defined fixture — 16 statutory private-sector feriados per year for 2026–2027 (DL 713 Art. 6 + Leyes 31788/31822/31530/31381), movable dates by Gregorian computus, 32 sorted-unique dates, reproducible digest `sha256:6d65409665d176d40390be4ed8414dc22e4ab9d11b40ede1d38abb7b258460d8`, version-immutable, coverage `2026-01-01…2027-12-31`, out-of-range fail-closed (§3).
- **A2-DG-H03 — CLOSED:** a single mechanically-independent external `PAGAMENOS_ACCEPTED_AUTHORITY_BASE_SHA` governs an immutable `corpusId → semanticDigest` ledger (bootstrapped from `64cf864`, verified corpus-unchanged), with an exhaustive field-by-field semantic projection and array-classification, dual CI gates, and the content-change/same-id attack proven to fail even when all local files are edited (§4–§8).
- **A2-V4-NEW-01 — CLOSED:** `normalizeEligibilityPortfolioV1` is total — post-trim map-key collisions are rejected, absent/empty containers normalize to omission, blanks are rejected, instruments/memberships are deduplicated and canonically ordered — applied before persistence, hashing, reconciliation, and DecideInput construction (§9).

DG-01/DG-03/H02 and DG-04/DG-05/DG-06/H01/H04/H05 remain closed. No B/C scope expansion. The only remaining pre-implementation dependency is the explicitly-declared, embedded, and now content-complete authority bootstrap (§4.1), whose contents are provided in this document. No implementation is self-authorized — implementation GO remains the independent reviewer's to grant.

**DESIGN / DATA-AUTHORITY CLOSURE ONLY.**

---

**Sources (holiday authority, first-party government; accessed 2026-09-02):**
- Decreto Legislativo N° 713 (consolidated), Diario Oficial El Peruano — https://diariooficial.elperuano.pe/Normas/obtenerDocumento?idNorma=110007
- Ley N° 31788 (7 June feriado — Batalla de Arica / Día de la Bandera) — https://busquedas.elperuano.pe/dispositivo/NL/2187453-1
- Ley N° 31822 (23 July feriado — Día de la Fuerza Aérea / Cap. FAP Quiñones) — https://tvperu.gob.pe/noticias/nacionales/es-oficial-declaran-feriado-nacional-el-23-de-julio-por-el-dia-de-la-fuerza-aerea-del-peru
- Ley N° 31530 (6 August feriado — Batalla de Junín) — https://busquedas.elperuano.pe/dispositivo/NL/2089960-2
- Ley N° 31381 (9 December feriado — Batalla de Ayacucho) — https://busquedas.elperuano.pe/dispositivo/NL/2026913-1
- gob.pe Plataforma del Estado Peruano, feriados (consolidated corroboration; HTTP 418 at authoring) — https://www.gob.pe/feriados

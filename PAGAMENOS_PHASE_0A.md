# PAGAMENOS — PHASE 0A
## PRIMARY BEHAVIORAL VALIDATION & SOURCE-RIGHTS CLEARANCE DESIGN

**Research cutoff:** 30 August 2026  
**Current decision state:** GO only for validation. No production build is authorized by this report.

---

## 1. Executive Validation Strategy

Phase 0A should be treated as a pre-registered falsification program, not as an MVP launch.

The central mistake to avoid is combining several weak signals into a favorable narrative:
> *people like the idea + many promotions exist + some users save once + social posts get views = BUILD.*

That inference would be invalid.

PagaMenos only earns serious product investment if both tracks independently survive:

### TRACK A — Behavioral viability
We need primary evidence that qualified users:
- encounter enough relevant opportunities;
- independently remember/use PagaMenos at real purchase moments;
- understand the recommendation;
- execute it;
- realize measurable savings;
- repeat that behavior.

### TRACK B — Data sustainability
We need evidence that:
- the required sources can be accessed sustainably;
- the factual information can be modeled correctly;
- changes can be detected quickly;
- most ordinary changes do not require human intervention;
- the beachhead dataset has a credible legal/contractual route to commercial use.

> **Success in one track cannot compensate for RED in the other.**

### Phase duration
I recommend **9 calendar weeks minimum**.  
The 60-day data-maintenance experiment itself requires approximately 8.5 weeks. Behavioral observation requires four real weeks per principal cohort; shortening it would preferentially measure novelty.

### Core execution structure

| Stage | Purpose |
| :--- | :--- |
| **Source-right triage** | Avoid validating demand for an unusable dataset |
| **Corpus construction** | Test offer density and rule representability |
| **Wave 0** | Fix research mechanics and comprehension defects |
| **Wave 1** | First locked behavioral cohort |
| **Wave 2** | Replication cohort |
| **60-day source test** | Measure maintenance burden independently |
| **Acquisition experiments** | Test content → qualified decisions |
| **Monetization probes** | Only after demonstrated savings |
| **Decision review** | Apply pre-registered BUILD/PIVOT/SWITCH/KILL matrix |

### Important update from live research
Three observations materially affect the design:
1. **OBSERVED:** Interbank's public catalogue currently exposes 554 promotion results, while its Plin page advertises more than 150 Plin promotions. Simply proving that many discounts exist would therefore teach us almost nothing. [Interbank](https://interbank.pe/es/web/guest/promociones-catalogo?utm_source=chatgpt.com)
2. **OBSERVED:** Sip already exposes a broad public benefits catalogue covering restaurants, fast food, entertainment and other categories. [Sip Beneficios](https://beneficios.sip.pe/)
3. **OBSERVED:** Rebajitas has moved quickly. Its current iOS listing shows version 1.0.3 only days old and already supports declared affiliations, personalized promotions, category/rubric search, nearby locations, favorites, usage history, notifications and deep-link sharing. [App Store](https://apps.apple.com/pe/app/rebajitas/id6800365955?utm_source=chatgpt.com)

Therefore Phase 0A should not optimize for offer count.  
It must optimize for: **real purchase moments where multiple legitimate options compete and PagaMenos can make a better decision than a personalized directory.**

---

## 2. Remaining Decision-Critical Unknowns

These are the uncertainties that still have veto power.

| ID | Unknown | Why decision-critical | Test |
| :--- | :--- | :--- | :--- |
| **U1** | How often does the ICP encounter economically meaningful overlaps? | No opportunity density → no product | Corpus + diary |
| **U2** | Will users independently remember PagaMenos? | Utility without recall has poor retention | 4-week cohort |
| **U3** | Does one successful saving materially increase repeat behavior? | Needed for reinforcement loop | Cohort transition analysis |
| **U4** | Can recommendations be ≥95% trustworthy? | Wrong financial outcome destroys credibility | Real redemptions + audits |
| **U5** | Can public rules be represented without constant exceptions? | Determines operational scalability | Torture suite |
| **U6** | Can source changes be automated? | Determines human COGS | 60-day source test |
| **U7** | Can factual offer information be used commercially? | Potential existential blocker | Source Rights Register + counsel |
| **U8** | Can PagaMenos remain differentiated from Rebajitas? | Competitor is rapidly active | Weekly competitive monitor |
| **U9** | Can content create qualified decisions, not just views? | Organic-growth thesis | Acquisition experiments |
| **U10** | Is realized saving high/frequent enough to matter? | Determines habit and monetization | Verified savings |
| **U11** | Does value exist outside extreme credit-card optimizers? | Determines beachhead breadth | ICP-A vs ICP-B |
| **U12** | Is there any credible revenue route? | Useful product ≠ business | Premium/commercial probes |

The two highest-risk unknowns remain:
- **U2** — repeated independent behavior
- **U7** — commercially sustainable source rights.

---

## 3. Target User Definition

The previous “22–40-year-old Limeño with multiple payment methods” is still too demographic.  
Phase 0A should recruit on behavior.

### ICP-A — Optimization-aware multi-benefit consumer
*Primary validation participant.*

Must satisfy all of:
- resides in Lima/Callao or makes most covered purchases there;
- aged approximately 22–40 for the initial beachhead;
- made ≥4 food-away-from-home purchases in the preceding 30 days;
- expects the same behavior during the next four weeks;
- owns/uses at least two independent eligibility families, with preferably three or more;
- at least one family must be something beyond a generic wallet.

Qualifying families can include:
- BCP card;
- Interbank card;
- Plin;
- Sip/Oh!;
- Diners;
- Yape;
- telecom loyalty;
- membership/club.

**Additional ICP-A condition:**  
has intentionally used, searched for, compared, or remembered a discount/benefit at least once in the preceding 60 days.

*This deliberately over-indexes toward the people most likely to experience the proposed value.*

### ICP-B — High-frequency but low-optimization consumer
Same purchasing frequency and multi-instrument requirements, but:
- rarely searches benefits;
- usually pays with the same instrument;
- reports forgetting promotions;
- does not actively optimize cards.

*ICP-B matters because it tests the more attractive business hypothesis: PagaMenos can convert ordinary multi-benefit consumers, not merely serve existing points/cashback enthusiasts.*

### Target allocation
For the behavioral cohorts:
- **~60% ICP-A**
- **~40% ICP-B**

That gives PagaMenos the best plausible beachhead while retaining a generalization check.

### Explicit exclusions
Exclude from primary behavioral analysis:
- users with only one meaningful instrument;
- people buying food outside home <2 times/month;
- people unlikely to make ≥3 covered purchases during observation;
- employees directly involved in promotions/loyalty at the tested issuers;
- employees/founders of benefit-comparison products;
- participants whose only usage is researcher-prompted;
- minors;
- people unwilling to participate for four weeks.

*One-instrument users can later be researched separately; including them now would test the wrong thesis.*

---

## 4. Participant Recruitment Plan

**Target:**  
38–48 recruited participants, of whom at least 30–36 should become analyzable behavioral participants after attrition/exclusions.

### Channel matrix

| Channel | Qualification | Friction | Bias | Cash cost | Use |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Personal network** | Medium-high | Low | Convenience/founder bias | S/0 | Limited |
| **Friends-of-friends referrals** | High | Low | Social-network similarity | S/0 | Strong |
| **University/alumni groups** | Medium | Low-medium | Younger skew | S/0 | ICP-B |
| **Professional networks** | High | Medium | Income/card skew | S/0 | ICP-A |
| **Peru finance communities** | Very high | Medium | Optimization enthusiast bias | S/0 | ICP-A |
| **Reddit Lima/Peru communities** | Medium-high | Medium | Digitally sophisticated | S/0 | Mixed |
| **Facebook consumer/card groups** | High if relevant | Medium | Enthusiast bias | S/0 | ICP-A |
| **TikTok/Instagram organic** | Unknown until tested | High | Content-selected | S/0 | Acquisition experiment |
| **Participant referrals** | High | Low | Homophily | S/0 | Supplement only |

> **No cold-DM spam.**

Recruitment posts should state the research problem rather than oversell the app:
> *"Research study on how people in Lima choose cards, wallets or benefits when eating out. Four-week early prototype study. No banking credentials or card numbers required."*

### Incentive
**Do not pay per app opening, recommendation or verified saving.** That would contaminate H-P0-02.

**Near-zero-cost default:**
- access to the prototype;
- personalized final “benefits/savings summary”;
- early access if product proceeds.

If a small participant honorarium later becomes available, it should be:
- fixed;
- independent of usage;
- paid for completing research obligations rather than opening PagaMenos.

### Screening questionnaire
*Keep this under approximately two minutes.*

1. **Where do you make most of your restaurant/fast-food/café purchases?**
   - Lima/Callao
   - elsewhere
2. **In the last 30 days, approximately how many times did you buy food/drinks outside the home or order prepared food?**
   - 0–1
   - 2–3
   - 4–7
   - 8–15
   - 16+
3. **Which of these do you currently use?**
   - BCP card
   - Interbank card
   - Plin
   - Yape
   - Sip/Oh!
   - Diners
   - other bank/card
   - telecom benefit
   - membership/club
4. **During the last 60 days, did you intentionally use or search for a promotion/benefit before paying?**
   - never
   - once
   - 2–3 times
   - 4+
5. **Do you expect to make at least three restaurant/fast-food/café/cinema purchases in Lima during the next four weeks?**
   - yes / no
6. **Do you work directly in banking promotions, loyalty programs or discount-comparison products?**
   - yes / no
7. **Can you participate in a four-week prototype study?**
   - yes / no
8. **Age band solely for beachhead qualification:**
   - 18–21
   - 22–29
   - 30–39
   - 40–49
   - 50+

*Do not ask salary unless later analysis establishes that income is essential. Instrument portfolio and spending frequency are better behavioral proxies.*

---

## 5. Cohort Design

Do not onboard everyone simultaneously.

### Wave 0 — Research mechanics
- **Participants:** 6–8 participants.
- **Purpose:** usability; instrumentation; comprehension; bug finding; onboarding comparison.
- **Duration:** approximately one week.
- *Wave-0 behavior is not pooled into PMF thresholds.*

**Changes permitted afterward:**
- wording;
- button placement;
- instrumentation bugs;
- merchant alias fixes;
- unclear condition formatting;
- broken workflow.

**Changes not permitted without declaring a new experiment:**
- changing target segment;
- lowering success thresholds;
- adding a radically different value proposition;
- changing North Star definition.

### Wave 1 — Locked behavioral cohort
- **Participants:** 16–18 participants.
- **Duration:** Four full weeks.
- **At Wave-1 start, freeze:** ICP qualification; primary categories; core recommendation logic; independent-use definition; behavioral thresholds; verification rules.

### Wave 2 — Replication cohort
- **Participants:** 16–22 additional participants.
- **Start:** Approximately 1–2 weeks after Wave 1.
- This stagger permits correction of experimental defects without rewriting the hypothesis.

Wave 1 and Wave 2 must first be reported separately.  
**Pool them only if:**
- eligibility criteria are unchanged;
- decision UX is semantically equivalent;
- no substantive intervention altered behavior.

*If a material product pivot occurs, reset cohort numbering: Wave 2B becomes a new hypothesis test.*

---

## 6. Validation Prototype

A responsive mobile web surface remains the correct vehicle.  
A native application would add negligible learning.

### Screen 1 — Entry / merchant intent
- **Objective:** Start with a real purchase context.
- **Mandatory:** merchant search; intent state (`buying now`, `buying today`, `considering later`, `just browsing`).
- **Optional:** transaction amount.
- **CTA:** `Check my best benefit`
- **Events:** `merchant_search_started`, `merchant_selected`, `purchase_intent_declared`
- **Abandonment:** merchant absent; unclear purpose; not genuinely purchasing.

### Screen 2 — Minimal eligibility portfolio
*Only ask about providers relevant to the selected merchant when possible.*
- **Mandatory:** Select owned/active instruments.
- **Optional:** card tier where materially needed; membership state.
- **Never ask:** card number; CVV; bank credentials.
- **CTA:** `Compare my options`
- **Events:** `portfolio_prompt_shown`, `instrument_selected`, `portfolio_context_completed`
- **Abandonment:** doesn't know card tier; privacy concern; too much effort.

### Screen 3 — Context clarification
*Shown only if needed.*
- **Examples:** salon / delivery / takeaway; estimated bill; day/time; branch; whether promotion already used this month.
- *Do not ask irrelevant questions.*
- **CTA:** `Calculate`
- **Event:** `decision_context_completed`

### Screen 4 — Recommendation
*Primary product moment.*
- **Shows:** winner; expected economic value; confidence; critical condition; alternative options; source freshness.
- **CTA:** `I'll use this`
- **Secondary CTA:** `See conditions`
- **Events:** `decision_returned`, `recommendation_viewed`, `recommendation_intended`

### Screen 5 — Evidence / explanation
- **Objective:** Make the result auditable.
- **Show:** source institution; source link; last checked; important restrictions; calculation; why alternative lost.
- **Event:** `recommendation_evidence_viewed`

### Screen 6 — Outcome
*Reached voluntarily from saved/recent decision or low-friction follow-up.*
- **Options:**
  - Worked and I saved.
  - I used it but haven't received the reward yet.
  - Didn't work.
  - I bought something else.
  - I didn't make the purchase.
- **If saved:** optional redacted evidence upload.
- **Events:** `recommendation_attempted`, `saving_reported`, `saving_verified`, `recommendation_failed`, `purchase_abandoned`

### Screen 7 — Recent decisions
*Minimal, not a “dashboard”.*
- **Purpose:** retrieve previous recommendation; submit outcome; observe return behavior.
- *No feed required.*

---

## 7. Onboarding Experiment

### Variant A — Portfolio-first
- **Flow:** portfolio → merchant → recommendation
- **Advantage:** Maximum personalization immediately.
- **Problem:** It asks the user for effort before producing value. It also makes first-session portfolio completion look artificially important.

### Variant B — Intent-first
- **Flow:** merchant → context → relevant instruments → answer
- **Advantages:** matches trigger; fastest path to understanding; reveals whether the merchant itself has value.
- **Weakness:** The user may repeatedly declare instruments.

### Variant C — Intent-first hybrid
- **Flow:** merchant → ask relevant instruments → remember them thereafter
- This gives initial low friction while allowing a persistent portfolio to emerge organically.

### Recommendation
**Use C for the behavioral cohorts.**  
But Wave 0 should compare A vs C.  
This is not a conventional powered A/B test; $n=6\text{–}8$ is too small.

Use a counterbalanced moderated comparison:
- half see A first;
- half C first;
- use distinct merchant tasks;
- collect task completion and time-to-value.

### Decision criteria
Choose C unless A demonstrates a clear advantage on all of:
- completion;
- comprehension;
- willingness to disclose portfolio;
- time-to-first-actionable-result.

*A minor conversion difference is insufficient to justify portfolio-first friction.*

---

## 8. Decision UX

The user should never have to reverse-engineer why the system chose something.

### CONFIRMED
> **BEST CONFIRMED OPTION**  
> **Interbank**  
> Estimated saving: S/30  
> Bill: S/120 → expected cost after benefit: S/90  
> Critical condition: pay in salon with eligible card.  
> Source: Interbank. Checked today.  
> *(Show #2 and #3 underneath).*

### LIKELY
Used when deterministic information supports the recommendation but one non-fatal user state cannot be independently verified.
> **LIKELY BEST OPTION**  
> We believe this applies, but confirm that your card is in the eligible tier.  
> *(Do not present it with identical visual confidence to CONFIRMED).*

### VERIFY FIRST
Used when an unknown can completely invalidate eligibility: invitation-only; remaining campaign stock; benefit already used; account must be current; membership tier unknown.
> **VERIFY BEFORE PAYING**  
> This could save S/40, but the promotion is limited to invited customers.

### INSUFFICIENT INFORMATION
Used when:
- source is stale;
- official sources conflict;
- essential transaction data is missing;
- economic values are non-comparable;
- reward valuation is unknown;
- eligibility cannot be reasonably determined.

### Refusal rule
The system must **not** display “BEST” if:
- the top candidate has VERIFY-FIRST uncertainty that could make #2 win;
- source status is STALE or CONFLICTED;
- a material rule was parsed with low confidence;
- two offers cannot be economically compared;
- the required user's private eligibility state is unknown.

*This is deliberately conservative.*

---

## 9. Concierge vs Automation Boundary

### Can remain concierge during Phase 0A
*(Without corrupting behavioral findings)*
- selecting the merchant universe;
- initial offer entry;
- validating ambiguous terms;
- resolving merchant aliases;
- reviewing unusual rules;
- participant recruitment;
- evidence redaction review;
- classification of failed redemptions;
- initial provider-rights outreach.

*The participant does not care whether a researcher initially entered a 20%-off rule manually.*

### Must behave like a real product
*(These cannot be concierge)*
1. **Real purchase initiation:** The participant must voluntarily open PagaMenos.
2. **Immediate recommendation:** A recommendation must appear in product-realistic latency (seconds, not “a researcher will answer you in WhatsApp later”). Otherwise recall and cognitive-friction measurements become invalid.
3. **Ranking:** Given an already validated rule corpus, calculation must be deterministic and automatic.
4. **Outcome collection:** Must be available without researcher prompting.
5. **Returning:** Participant must be able to retrieve/use the system independently.

### Must be automated specifically for H-P0-03
At least the validation corpus needs:
- scheduled source retrieval for selected source types;
- source change detection;
- deterministic expiry;
- extraction candidate generation;
- rule validation;
- changed-offer queue;
- stale-source detection.

Human review may handle exceptions. That review time is measured, not hidden.

---

## 10. Purchase Diary Protocol

The application itself should function as the main diary.  
**Do not require participants to write a daily journal.**

### Initial instruction
Participants receive exactly this behavioral instruction conceptually:
> *"For the next four weeks, use PagaMenos whenever you genuinely think it could help with a restaurant, fast-food, café, delivery or supported entertainment purchase. You are not required to open it every day or before every purchase. Use it as you naturally would."*

*That sentence matters: it avoids teaching an artificial ritual.*

### Researchers must NOT:
- message “remember to check PagaMenos”;
- suggest a merchant because it has an offer;
- send individual deals to improve usage;
- reward app openings;
- praise high-usage participants;
- remind people immediately before weekends/dinner.

### Permitted weekly research contact
One short retrospective check-in after each week:
1. How many covered purchases did you make?
2. Approximately how many involved merchants present in PagaMenos?
3. Any technical problem that prevented use?

*Do not say “Why didn't you use PagaMenos?” during the active study. That can create guilt-driven behavior.*

### Research-contact contamination window
Any app session occurring within 24 hours of a research check-in is flagged:
`research_contact_exposure = true`.  
It can still be analyzed, but by default does not count as independent use unless the participant had already created the purchase intent before contact.

---

## 11. Independent-Use Definition

This must be implemented, not decided afterward.

### `independent_purchase_intent`
All conditions must hold:
- user initiates session voluntarily;
- no researcher reminder in preceding 24h;
- merchant/category is covered;
- participant states purchase is expected within 24 hours;
- interaction is not part of a usability assignment;
- purchase intention is genuine, not created to explore the product.

It can later end in:
- purchase;
- abandoned purchase;
- changed merchant.

*A completed transaction is not required for the intent event.*

### `prompted_purchase_intent`
A genuine purchase session occurring after: study reminder; researcher task; mandatory research workflow; direct deal message.  
*Useful for usability. Excluded from H-P0-02.*

### `exploratory_session`
No current purchase planned. Examples: browsing discounts; testing random merchants; looking “for later”.  
*It may support discovery research. It does not count toward repeat-purchase behavior.*

### `content_driven_session`
User arrived through: TikTok; Instagram; Reddit; SEO; shared promotion and initially explores the referenced merchant/offer.  
If during the same session the user indicates a real intended purchase within 24h, it can become: `content_driven_purchase_intent`.  
*For H-P0-02, report this separately from spontaneous direct use.*

---

## 12. Verified-Saving Standard

The previous Levels 0–3 need greater precision.

- **VS0 — Theoretical saving:** System calculates potential S/30 saving. No purchase. Not verified.
- **VS1 — Intended use:** Participant says “I'll use this.” Still no transaction. Not verified.
- **VS2 — Self-reported redemption:** Participant reports that they made the purchase, used the recommended option, and received the stated benefit. *Useful behavioral evidence; still not sufficient for the Phase-0A North Star.*
- **VS3 — Transaction-corroborated saving:** Evidence demonstrates the economic outcome.
  - *Immediate discount/fixed price:* Redacted receipt, order screen, or merchant invoice showing merchant/date/relevant paid price consistent with promotion.
  - *Cashback/reward:* Redacted screenshot showing cashback/reward credit, relevant amount, and timing sufficiently linked to purchase.
  - *Fixed promotional item:* Receipt shows actual promotional price and official source supplies normal/promotional pricing.  
  👉 **THIS IS: VERIFIED SAVING**
- **VS4 — Dual corroboration:** Optional highest confidence: transaction evidence plus separate reward/discount evidence. Not necessary for most immediate discounts.

### Privacy requirements
Participants should be instructed to redact or crop:
- full card numbers;
- partial card digits unless required;
- account balances;
- unrelated transactions;
- names if unnecessary;
- addresses;
- order IDs where unnecessary;
- QR codes;
- bank credentials.

> **PagaMenos should never request:** CVV, PIN, password, full statement.

Keep the smallest evidence crop necessary. If proof can be validated and then deleted while retaining a verification status, that is preferable and should be discussed in the legal/privacy review.

---

## 13. Validation Dataset Design

The prior 300–500 offer target is unnecessarily large for behavioral validation; it would optimize the wrong variable.

### Recommended corpus
- **120–180 active offer/rule instances**
- across approximately **30–40 merchant entities**
- and **4 provider ecosystems**.

### Composition
- Approximately **70–80% restaurant/food**;
- **20–30% cinema/entertainment**.

### More important than total count
At corpus freeze:
- $\ge 20$ merchants should have $2+$ competing benefit options;
- $\ge 8\text{–}10$ should have $3+$ competing provider/instrument options if achievable;
- $\ge 15$ distinct rule-pattern families must be represented;
- at least three provider families must meaningfully overlap.

*If 180 offers produce only five overlapping merchants, the corpus is bad. If 110 offers create thirty real competitive purchase contexts, it is excellent.*

### Relevant-offer threshold
Define a “meaningful opportunity” as one where:
- participant is plausibly eligible;
- offer is actionable;
- expected economic benefit is at least S/5 or 10% of the relevant purchase, unless the benefit is otherwise materially valuable.

*(This threshold is an internal experimental definition).*

---

## 14. Merchant Universe

Do not use premium-only restaurants. The universe should deliberately include routine spending.

### Tier 1 — Frequent national/large chains
Candidate universe, contingent on active source overlap at dataset freeze:
- KFC
- Burger King
- Bembos
- Papa Johns
- Pizza Hut
- Chinawok
- Don Belisario
- Madam Tusan
- Chili's
- TGI Fridays
- Dunkin'
- Roky's
- Norky's
- Isushi

*Several such chains currently appear in Interbank/Plin's live promotion catalogue; BCP also publishes active food offers such as Isushi and Roky's. [Interbank](https://interbank.pe/promociones/descuentos/plinpromos?utm_source=chatgpt.com)*

### Tier 2 — Casual dining / higher-ticket comparison
Candidates:
- Granja Azul
- La Cabrera
- Trattoria Mambrino
- Perroquet
- selected Diners Modo Tasty merchants
- other merchants with meaningful multi-provider overlap at freeze.

*BCP currently exposes, for example, 20% at Granja Azul with a S/70 cap and location/day/product restrictions. [Viabcp](https://www.viabcp.com/beneficios/tarjetas/granja-azul?utm_source=chatgpt.com) Diners' current Modo Tasty campaign runs through December 2026 across participating restaurants. [Diners Club Peru](https://dinersclubperu.pe/establecimientos/modo-tasty/ciudad/lima-y-provincias?utm_source=chatgpt.com)*

### Tier 3 — Entertainment
- At least Cineplanet where an active supported-provider benefit exists;
- 1–2 additional cinema/entertainment merchants if overlapping offers can be verified.

*Sip's current catalogue shows a Cineplanet benefit among its featured offers. [Sip Beneficios](https://beneficios.sip.pe/)*

### Selection rule
A merchant receives priority if it scores high on:
$$\text{visit likelihood} \times \text{offer overlap} \times \text{economic saving} \times \text{rule diversity}$$

The final merchant list must be frozen **after participant screening but before Wave 1**.
- *Why after screening?* Because a perfect corpus of merchants participants never visit cannot test behavior.
- *Why before Wave 1?* To prevent researchers from adding convenient merchants after poor results.

---

## 15. Offer Quality Model

Every internal offer version receives independent states.

- `source_status`: `ACTIVE`, `REMOVED`, `INACCESSIBLE`, `CONFLICTED`, `UNKNOWN`
- `extraction_status`: `NOT_PARSED`, `PARSED`, `VALIDATED`, `REVIEW_REQUIRED`, `FAILED`
- `freshness_status`: `FRESH`, `AGING`, `STALE`, `EXPIRED`
- `eligibility_confidence`: `CONFIRMED_BY_DECLARED_FACTS`, `LIKELY`, `VERIFY_FIRST`, `UNKNOWN`
- `rule_confidence`: `HIGH`, `MEDIUM`, `LOW`
- `publication_status`: `ACTIONABLE`, `VISIBLE_NONRANKING`, `HIDDEN`, `EXPIRED`

### Publication invariant
Only `ACTIVE` + `VALIDATED` + `FRESH` + `HIGH rule confidence` may ordinarily become `ACTIONABLE`.  
`VERIFY_FIRST` may remain visible but cannot be declared a confirmed winner.

### Transition examples
- **Source disappears:** `ACTIVE` → `REMOVED` → `HIDDEN` (unless expiry already occurred).
- **Parser detects changed T&C:** `VALIDATED` → `REVIEW_REQUIRED` (if material semantics changed).
- **No refresh within source SLA:** `FRESH` → `AGING` → `STALE` → `VISIBLE_NONRANKING` / `HIDDEN`.
- **Known expiry reached:** `FRESH` → `EXPIRED` (without human review).
- **Official pages conflict:** `ACTIVE` → `CONFLICTED` → `VISIBLE_NONRANKING` (until resolved).

---

## 16. 60-Day Freshness Experiment

### Objective
Determine whether a limited PagaMenos catalogue can be operated by exceptions rather than routine manual maintenance.

- **Corpus:** 120–180 active offers.
- **Providers:** Initial target: Interbank/Plin; BCP; Sip/Oh!; Diners.
- **Duration:** 60 consecutive days.
- **Required source monitoring:** scheduled retrieval; content fingerprint; offer discovery; changed-content detection; deterministic expiry; parsing; semantic comparison; exception logging.

*An independent human audit sample must be used to evaluate the system, otherwise the parser would grade itself.*

### Metrics

#### 1. Source Freshness Rate — SFR
$$SFR = \frac{\text{audited published offer versions matching current official state}}{\text{all audited published offer versions}}$$
*Material match means no error capable of changing eligibility, recommendation or economic value.*
- **GREEN:** $\ge 95\%$
- **YELLOW:** $90\text{–}{<}95\%$
- **RED:** $<90\%$

#### 2. Critical Extraction Accuracy — CEA
$$CEA = \frac{\text{audited offer versions with zero material extraction errors}}{\text{audited offer versions}}$$
*Material fields include: value; cap; minimum; eligibility; date; channel; location; use limits.*
- **GREEN:** $\ge 97\%$
- **YELLOW:** $92\text{–}{<}97\%$
- **RED:** $<92\%$
*(The stricter threshold reflects the fact that this information changes real economic behavior).*

#### 3. Automation Rate — AR
$$AR = \frac{\text{material source changes correctly handled without human semantic intervention}}{\text{all material source changes}}$$
- **GREEN:** $\ge 90\%$
- **YELLOW:** $80\text{–}{<}90\%$
- **RED:** $<80\%$

#### 4. Exception Rate — ER
$$ER = \frac{\text{source change events needing human interpretation}}{\text{all material source change events}}$$
- **GREEN:** $\le 10\%$
- **YELLOW:** $>10\text{–}20\%$
- **RED:** $>20\%$

#### 5. Time to Detect Change — TTDC
From the earliest independently observed material change to system detection. (Bounded estimate).
- **GREEN:** median $\le 24\text{h}$; p90 $\le 48\text{h}$
- **YELLOW:** median $24\text{–}48\text{h}$
- **RED:** median $>48\text{h}$

#### 6. Time to Correct — TTC
From system detection of a material change to correct internal state.
- **GREEN:** median $\le 12\text{h}$; no high-risk error $>24\text{h}$
- **YELLOW:** median $12\text{–}24\text{h}$
- **RED:** repeated $>24\text{h}$

#### 7. Human Minutes per 100 Offer Changes — HM100
$$HM100 = \frac{\text{total semantic review minutes}}{\text{material source changes}} \times 100$$
- **GREEN:** $\le 180\text{ min} / 100\text{ changes}$
- **YELLOW:** $180\text{–}360\text{ min}$
- **RED:** $>360\text{ min}$
*(Internal threshold only).*

### Sample sufficiency
Do not declare GREEN on automation if only five meaningful changes occur. Require roughly:
- $\ge 100$ independent audited offer versions;
- and preferably $\ge 30$ material change events.

*If fewer material changes occur: label automation result INCONCLUSIVE/YELLOW, not GREEN.*

---

## 17. Rule Torture Suite

Before Wave 1, build a semantic test fixture containing at least 30–40 examples.

It must include:
- plain percentage discount;
- fixed PEN discount;
- promotional fixed price;
- cashback;
- future store/app credit;
- points;
- miles;
- free item;
- 2x1;
- bundle;
- minimum spend;
- maximum discount;
- no cap;
- selected weekdays;
- excluded weekends;
- excluded holidays;
- custom blackout dates;
- time window;
- selected branches;
- excluded branches;
- salon-only;
- takeaway-only;
- delivery-only;
- specific delivery app;
- coupon;
- must request before ordering;
- one use per day;
- one use per month;
- unlimited;
- per-table limit;
- stock limit;
- promotional-fund limit;
- invitation-only;
- active-account requirement;
- specific card tier;
- credit-only;
- credit-or-debit;
- specific network;
- product/SKU exclusions;
- non-combinability;
- promotion can combine with a base card reward;
- multiple benefits with unknown combinability;
- conflicting headline/T&C;
- stale promotion still indexed;
- value not economically comparable;
- dependent external merchant conditions.

*Real sources demonstrate this variety. For example, BCP's Granja Azul offer combines percentage discount, cap, branch-specific weekdays, excluded dates/products, table limits and consumption-channel restrictions; Plin promotions add stock, payment-QR and order-count requirements. [Viabcp](https://www.viabcp.com/beneficios/tarjetas/granja-azul?utm_source=chatgpt.com)*

### Success condition
For every torture fixture the model must produce either:
- correct deterministic representation; or
- explicit `UNREPRESENTABLE` / `REVIEW_REQUIRED`.

*Silently approximating is failure.*

### Semantic coverage gate
- **GREEN:** $\ge 90\%$ of beachhead offers representable without free-text logic in the runtime evaluator.
- **YELLOW:** $80\text{–}90\%$.
- **RED:** $<80\%$.

---

## 18. Phase-0A North Star Metric

“Independent Verified Savings per Activated User” is directionally right but insufficient: a few optimization enthusiasts could generate many savings and hide that most users never repeat.

I recommend:

### Repeat Independent Verified Saver Rate — RIVSR
$$RIVSR = \frac{\text{participants achieving } \ge 2\text{ VS3 savings on } \ge 2\text{ distinct independent purchase occasions}}{\text{analysis-eligible participants}}$$
during four weeks.

### Analysis-eligible participant
*Pre-registered definition:*
- qualified at recruitment;
- completes onboarding;
- remains technically able to use prototype;
- actually has $\ge 3$ genuine covered-category purchase occasions during the four-week period.

*Participants with fewer than three real purchase occasions are excluded from the primary RIVSR denominator but remain in intention-to-observe reporting. Both numbers must be published. No quietly deleting low-use participants.*

### Why RIVSR is superior
It simultaneously requires: opportunity density; recall; product use; correct recommendation; actual purchase; economic result; repetition.  
*A one-time “wow, S/50 off” does not satisfy it.*

### Supporting metrics
- $\ge 1$ verified saver rate
- third independent decision rate
- independent decision sessions/user
- week-4 active decision rate
- meaningful offer opportunities/user
- actionable-result rate
- confirmed-recommendation accuracy
- repeat after first VS3
- PEN saved — median, not only mean
- failed redemption rate
- no-actionable-result rate
- decision time
- evidence/source-open rate
- direct vs content-driven return.

---

## 19. Cohort Analysis Plan

Do not report one overall average. At minimum segment by:

1. **Instrument complexity:** 2 families; 3 families; 4+.
2. **Provider portfolio:** BCP-only family + wallets; Interbank/Plin; cross-bank; premium card/membership.
3. **Purchase frequency:** 4–7/month; 8–15; 16+.
4. **Promotion awareness:** ICP-A optimizer; ICP-B low optimization.
5. **Acquisition source:** personal/referral; finance community; university; organic content; search.
6. **Opportunity exposure:**
   - low: <3 relevant opportunities;
   - medium: 3–5;
   - high: 6+.

*This last segmentation is critical. If a user has no relevant offers, lack of usage means something different than: “They had eight opportunities and never opened PagaMenos.”*

### Key predictor analysis
With $n \approx 30\text{–}40$, do not pretend to build a reliable machine-learning model. Use:
- contingency tables;
- medians;
- proportion comparisons;
- exploratory logistic regression only if cell counts permit;
- Wilson intervals.

*The goal is to discover hypotheses such as: “3+ eligibility families predicts repeated value.” Not to publish causal coefficients.*

---

## 20. Behavioral Kill Criteria

*These are internal pre-registered thresholds, not industry benchmarks.*

### STRONG GO
All approximately true:
- RIVSR $\ge 35\%$;
- $\ge 50\%$ of eligible participants make $\ge 3$ independent purchase-decision sessions;
- week-4 independent active rate $\ge 35\%$;
- $\ge 40\%$ achieve $\ge 1$ VS3 saving;
- median meaningful opportunity density $\ge 3/\text{month}$;
- confirmed recommendation accuracy $\ge 95\%$;
- repeat-use rate rises materially after first verified saving;
- and Track B is GREEN.

### CONDITIONAL GO
Examples:
- RIVSR 20–35%;
- third-use rate 30–50%;
- week-4 activity 20–35%;
- but a clearly pre-specified subgroup demonstrates strong behavior (e.g., users with 3+ instruments have RIVSR 45%; 2-instrument users 8%).
- **Decision:** narrow the ICP before Phase 1.

### PIVOT PAGAMENOS
Trigger if behavioral value exists but original surface/category is wrong.  
Examples:
- users save repeatedly only on cinema;
- delivery drives behavior but restaurants do not;
- users never proactively search but share-extension usage works;
- one provider combination generates most value;
- content-driven merchant pages materially outperform app-style direct use.

*A pivot requires a new pre-registered thesis. Do not relabel poor results “learning” and proceed unchanged.*

### KILL BEHAVIORAL THESIS
Any combination like:
- RIVSR $<15\%$;
- $<20\%$ reach a third independent use;
- week-4 independent activity $<15\text{–}20\%$;
- $<20\%$ ever obtain one VS3 despite adequate opportunity density;
- strong opportunity density exists but users repeatedly forget/ignore the product.

*If both Wave 1 and Wave 2 reproduce this: STOP.*

---

## 21. User Research Protocol

Behavior remains primary. Interviews explain behavior; they do not override it.

### Pre-use interview — 10–15 minutes
Ask participants to reconstruct actual recent behavior.
- *Tell me about the last three times you paid for food outside home.*
- *What did you pay with? Why that instrument?*
- *Did you know of any discount? How did you learn about it?*
- *Have you ever discovered afterward that another card would have saved money?*
- *What do you currently do when you want to check promotions?*
- *What makes you decide checking is not worth the effort?*
- *Which benefits do you regularly forget?*
- *When does a S/5, S/10, S/30 saving become worth an extra step?*

*Do not describe PagaMenos until after this reconstruction.*

### First-use moderated session
Use one controlled scenario and one personally relevant scenario. Observe:
- whether they understand “best”;
- difference between discount/cashback;
- confidence state;
- restrictions;
- whether alternatives matter;
- whether source link increases trust.

**Critical task:**  
*“You are spending S/120 here now. Tell me what you would do after seeing this screen.”*  
*(Do not ask: “Is this easy?” Observe whether they can act correctly).*

### Exit interview — After four weeks
- *Reconstruct your last five covered purchases. Which ones triggered PagaMenos? Which didn't? Why?*
- *What were you doing immediately before the times you remembered?*
- *What were you doing when you forgot?*
- *Which result did you trust least?*
- *Did any condition surprise you at the merchant?*
- *Did saving once change later behavior?*
- *When was checking PagaMenos not worth the effort?*
- *What existing tool did you use instead?*
- *If PagaMenos disappeared tomorrow, what would you do?*

*(Do not ask “Would you pay S/X?” Premium behavior is tested separately).*

---

## 22. Rebajitas Competitive Monitor

**Current baseline:**  
OBSERVED: Rebajitas already supports declared banks/memberships/plans, personalized promotion feeds, search, category/discount/time filters, nearby locations, favorites, used-promotion history, notifications and sharing; it does not claim to link bank accounts or process payments. Its Android listing was updated August 19 and its iOS listing already shows a later 1.0.3 update. [App Store](https://apps.apple.com/pe/app/rebajitas/id6800365955?utm_source=chatgpt.com)  
*That makes it a HIGH threat.*

### Weekly delta register

| Field | Example |
| :--- | :--- |
| **Week** | W3 |
| **Date checked** | YYYY-MM-DD |
| **Platform** | iOS / Android / web |
| **Version** | 1.x |
| **Source** | Store listing / social / product |
| **New capability** | Transaction amount |
| **Exact evidence** | Screenshot/source |
| **Competitive dimension** | Decision engine |
| **PagaMenos overlap** | High |
| **Response** | None / adjust / reassess |
| **Analyst** | — |

### Six capabilities monitored
1. transaction amount input;
2. best-card/payment recommendation;
3. cross-provider economic ranking;
4. min-spend/cap calculation;
5. reward valuation;
6. net-cost comparison.

### Response framework
- **No change:** feed improvements; visual redesign; more filters; more brands. → *Continue.*
- **Product adjustment:** If it adds amount input; simple “recommended card”. → *Benchmark UX, but do not pivot automatically.*
- **Strategic reassessment:** If it simultaneously adds cross-provider ranking; correct minimum/cap calculation; transaction amount; deterministic economic value. → *PagaMenos's wedge has materially narrowed.*

### Potential kill/pivot trigger
If Rebajitas demonstrates before Phase-0A conclusion:
- $\ge 4$ of the six capabilities above;
- comparable or greater source breadth;
- materially stronger source relationships/partnerships;
- equivalent trust/provenance architecture;

then suspend any BUILD recommendation and rerun competitor scoring.  
*(A competing feature is not enough. A competing data/decision system is).*

---

## 23. Organic Acquisition Experiments

Use a structured 24-cell programme rather than random posting.

### Six message archetypes
- **A. Direct saving:** “Pay S/19.90 instead of S/29.90.”
- **B. Comparison:** “BCP vs Interbank at X.”
- **C. Expiring benefit:** “This ends Sunday.”
- **D. Surprising eligibility:** “You may already have this because you use Plin.”
- **E. You already own this:** “Three benefits people forget are included.”
- **F. Best option / decision:** “For a S/120 bill at X, which one wins?”

### Four formats
- short-form video;
- carousel;
- static comparison card;
- utility page / community-native post.

$$\text{6 archetypes} \times \text{4 formats} = \mathbf{24\text{ planned cells}}$$

*(Not every platform needs all 24. Reuse the same underlying offer evidence while testing presentation).*

### CTA
- *Never:* `Download PagaMenos`.
- *Use:* `Check which one applies to you` or `Compare your options`.

### Complete funnel
$$\text{impression} \longrightarrow \text{qualified\_click} \longrightarrow \text{merchant\_context\_created} \longrightarrow \text{portfolio\_context\_completed} \longrightarrow \text{decision\_returned} \longrightarrow \text{independent\_repeat\_within\_14d}$$

*A creative is only useful if downstream quality is known.*

### “Qualified click”
Visitor:
- lands intentionally;
- stays beyond accidental-load threshold;
- starts a merchant/promotion check.

*(Raw URL clicks are insufficient).*

---

## 24. Acquisition Kill Criteria

Diagnose the failure layer:

1. **Content failure:**
   - *Prerequisite:* enough aggregate reach to interpret; at least several creative variants per archetype.
   - *Internal RED signal:* After approximately 24 planned tests and $\ge 10,000$ combined organic impressions: $<20$ qualified visits overall, and no archetype demonstrates qualified-click rate $\ge 0.5\%$. *(Do not kill after one failed TikTok).*
2. **Landing-page failure:**
   - If $\ge 100$ qualified arrivals occur but $<20\%$ begin merchant/context flow.
   - *Problem:* positioning; relevance; landing UX. Not necessarily acquisition.
3. **Personalization/onboarding failure:**
   - If $\ge 80$ merchant contexts occur but $<35\%$ reach an actionable personalized decision.
   - *Investigate:* portfolio friction; unsupported merchants; missing instruments.
4. **Product-value failure:**
   - If $\ge 40$ first actionable decisions exist but almost nobody returns independently within 14 days, especially after receiving a useful saving opportunity.
5. **Acquisition thesis RED:**
   - If multiple message archetypes produce attention, landing converts adequately, decisions are returned, but qualified users do not become independent repeat users, then content is an audience business, not a PagaMenos growth engine.

---

## 25. Monetization Experiments

*Run only after participants have experienced value.*

### EXP Premium — automation value
- **Eligibility to see test:** participant has at least one VS3 or two successful VS2 outcomes.
- **Show one concrete disabled capability at relevant moment:**
  - “Track this benefit automatically.”
  - “Alert me before this expires.”
  - “Track my monthly use limit.”
  - “Compare household benefits.”
- **CTA:** `Request early access` or `Unlock when available`
- *This tests revealed feature interest, not willingness to pay. Do not pretend otherwise.*

*(Stronger later evidence: Before Phase 1 ends, a real paid reservation/checkout experiment would be better—but pricing belongs after Phase 0A).*

### Sponsored experiment
- *Never modify the winning recommendation.*
- **Placement:** after recommendation or in discovery content.
- **Labeling:** Clearly `Sponsored`.
- **Measure:** view; click; merchant action.
- *Initial test can use a real cooperating merchant without charge. Its purpose is UX/engagement. Commercial viability requires actual merchant interest.*

### Commercial experiment
- **Target:** 10–15 restaurant merchants/groups; 3–5 loyalty/payment/provider stakeholders where realistically accessible.

#### Evidence hierarchy

| Evidence | Strength |
| :--- | :--- |
| “Sounds interesting” | Very weak |
| Meeting completed | Weak |
| Follow-up requested | Weak-medium |
| Data-sharing discussion | Medium |
| Concrete pilot design | Medium-high |
| Written pilot interest | High |
| LOI/email commitment | Higher |
| Paid pilot | Strongest |

**Ask merchants about actual trade-offs:**  
Not: *“Would you advertise?”*  
Instead: *“If we can demonstrate X qualified visits and Y verified redemptions, would you test a clearly labeled placement or merchant-funded offer? What data would you require to approve that?”*

---

## 26. SOURCE RIGHTS REGISTER v1

> **Important:** this is issue spotting, not legal clearance. No source below is marked CLEARED merely because it is public.

| Provider | Source | Type | Public | Auth | robots.txt | Published terms / reuse | Data proposed | Raw / republish | Transform | Classification | Confidence | Dependency | Next action |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Interbank** | Public promotions catalogue + individual offer pages | HTML | Yes | None for public catalogue | General crawling not disallowed in observed robots | Public catalogue says © rights reserved; app-specific Interbank Negocios terms restrict commercial reproduction of app content, but those cannot automatically be extended to the public promo catalogue | merchant, benefit, dates, instrument, restrictions, source URL | No full copy/public T&C | Normalize facts/rules | **REVIEW** | High technical / medium legal | High but replaceable | Obtain counsel interpretation; request research/commercial permission |
| **Plin–Interbank** | Interbank Plin promotions page | HTML | Yes | None to read | Covered by Interbank robots | No explicit commercial-data licence found | merchant, fixed price, normal price, validity, QR/channel, stock, limits | No full T&C | Normalize | **REVIEW** | High | High | Same as Interbank; ask explicitly about Plin campaign data |
| **BCP** | ViaBCP benefit pages | HTML | Yes | None for public offer pages | Not independently verified in this audit | Individual offer T&C public; no sufficiently clear general licence for commercial reuse located | factual benefit/rule data | No promotional copy/images | Derived rule | **REVIEW / UNKNOWN** | Medium | High but replaceable | Counsel review + BCP permission outreach |
| **Sip / Oh!** | beneficios.sip.pe | HTML | Yes | No for public catalogue; login exists for other features | Not independently verified | © Infinance XP on site; no explicit commercial reuse grant located | merchant, category, benefit, validity, conditions | No imagery/full description | Derived rule | **REVIEW / UNKNOWN** | Medium | Replaceable | Locate governing web terms; request permission |
| **Diners Club** | Diners Modo Tasty / establishment pages | JS/HTML | Yes | None to inspect public benefits | Not independently verified | Pages say © Diners Club Peru, all rights reserved; no explicit commercial reuse licence located | merchant, card eligibility, dates, discount, caps, channel | No imagery/full copy | Derived rule | **REVIEW / UNKNOWN** | Medium | Replaceable | Locate governing website terms; permission/counsel |
| **Yape — controlled research only** | Public promo/help/T&C pages | HTML | Yes | Some promotions require Yape usage | Robots allows / generally but blocks APIs/private paths and some product paths | Yape Market terms expressly restrict copying/reuse/extraction of marketplace content; applicability to every public promo property needs legal analysis | minimal factual campaign fields only | No raw redistribution | Derived research facts | **REVIEW / POTENTIAL RED** | High for observed terms | Nice-to-have | Do not make core dependency before specialist review |
| **Merchant direct pages** | Individual restaurant promotional pages/T&C | HTML/social varies | Varies | Usually none | Provider-specific | Provider-specific | confirmation of merchant/date/value | No image/copy | Corroboration only | **UNKNOWN / REVIEW individually** | Low-medium | Replaceable | Use as secondary verifier; obtain merchant permission where possible |

*Evidence: Interbank currently exposes 554 catalogue entries and a public robots file without general Disallow for standard crawling. [Interbank](https://interbank.pe/es/web/guest/promociones-catalogo?utm_source=chatgpt.com) BCP exposes detailed individual offer pages such as Granja Azul and Isushi, including critical restrictions. [Viabcp](https://www.viabcp.com/beneficios/tarjetas/granja-azul?utm_source=chatgpt.com) Sip's catalogue is public and displays Infinance XP copyright notice. [Sip Beneficios](https://beneficios.sip.pe/) Diners' public pages similarly show campaign rules and an “all rights reserved” footer. [Diners Club Peru](https://dinersclubperu.pe/establecimientos/modo-fun/ciudad/lima-y-provincias?utm_source=chatgpt.com) Yape's robots file allows the general site while disallowing APIs/private areas; separately, Yape Market's published terms expressly restrict copying/reuse/extraction of marketplace content. Those facts must not be conflated into a blanket conclusion about all Yape pages. [Yape](https://www.yape.com.pe/robots.txt)*

### Register interpretation
At this stage:
- **0 critical providers are legally CLEARED.**
- Several are technically viable.
- This is acceptable for controlled validation.
- It is not acceptable for a production BUILD decision.  
👉 *That is exactly why Track B exists.*

---

## 27. Data-Layer Analysis

- **Layer A — raw expressive/presentational content:** Includes promotional copy, page HTML, images, creative assets, descriptions, page composition. *Highest IP/reuse concern. PagaMenos does not need to publicly reproduce this layer.*
- **Layer B — factual propositions:** Examples: merchant = Granja Azul; discount = 20%; maximum = S/70; valid until 30 September 2026; eligible instrument = BCP credit/debit; salon only. *This is the economically useful substrate. The legal status of systematic extraction/use of these facts, especially when sourced from protected compilations or subject to site terms, requires specialist analysis. Indecopi explicitly supports registration of databases/compilations as a copyright-related category, which reinforces why the issue cannot be reduced to “facts aren't copyrighted.” [Gob.pe](https://www.gob.pe/institucion/indecopi/colecciones/6604-formatos-tupa-derechos-de-autor?utm_source=chatgpt.com)*
- **Layer C — PagaMenos structured rules:** Example: `provider = BCP merchant = GRANJA_AZUL benefit = percentage(20) cap = 70 PEN channel = salon excluded_dates = [...]`. *This is newly normalized representation produced by PagaMenos. Whether transforming public facts this way overcomes contractual/database-use restrictions is a lawyer's question, not an engineering assumption.*
- **Layer D — derived recommendation:** *“For your S/200 purchase today, BCP produces an estimated S/40 saving and is stronger than your other declared options.”* This is PagaMenos's original analytical output. It should be the core value.

---

## 28. Minimum-Data Strategy

The product does not need to become an archive of provider websites.

### Default stored fields
- provider identifier;
- merchant identifier;
- benefit type/value;
- dates;
- limits;
- eligibility predicates;
- locations;
- channel;
- normalized restrictions;
- canonical source URL;
- retrieval timestamp;
- source fingerprint/hash;
- verification state.

### Avoid by default
- full promotional prose;
- provider imagery;
- entire T&C reproduction;
- logos unless branding use is cleared;
- archived HTML indefinitely;
- screenshots exposed to users.

### Public display
Prefer:
> *“20% discount, maximum S/70. Salon only. Certain dates/products excluded. Official source →”*

rather than copying multiple paragraphs of source wording.

### Does this improve sustainability?
**INFERRED: materially, yes.**  
It reduces dependence on reproducing original expression and keeps PagaMenos focused on: facts, transformation, computation, and provenance.  
*But it does not automatically make the collection legally permissible. Terms governing systematic collection and database extraction can remain relevant. Professional review remains required.*

---

## 29. Permission / Partnership Strategy

Do not start by asking a major bank for an API partnership and customer data: that is too heavy.

### Outreach target
- **At issuer/loyalty provider:** partnerships; loyalty/benefits team; digital channels; marketing alliances; innovation; commercial partnerships.
- **At merchants:** marketing; growth; partnerships; e-commerce; CRM/loyalty.

### Minimum initial request
Conceptually:
> *"We are conducting a limited research/private-beta project that helps users understand which existing published benefit applies to a purchase. We do not process payments or request banking credentials. We would like written confirmation that we may periodically retrieve your publicly published promotion facts, normalize selected factual terms, display a concise derived summary with attribution/source link, and measure user click/redemption feedback during the pilot."*

### Ideal access
Eventually: CSV, JSON, authenticated partner feed, scheduled file, webhook, merchant portal.  
*Minimum fields: offer ID, merchant, dates, eligibility, benefit, restrictions, update timestamp.*

### What PagaMenos offers
- **Early:** qualified traffic; promotion visibility; source attribution; aggregated error/failure feedback.
- **Later:** measurable redemptions; performance reporting; campaign benchmarking.

### What NOT to request now
customer accounts; transaction histories; bank API access; payment credentials; exclusivity; nationwide commercial agreement; real-time banking data; large revenue share contract.  
*The objective is permission to validate, not corporate transformation.*

---

## 30. Source Replacement Analysis

The strategy must be designed so that no single bank is existential.

**Critical requirement:**  
Not *“BCP is critical,”* but *“PagaMenos requires at least three independent benefit ecosystems with meaningful merchant overlap.”*

### Provider status
- **Interbank/Plin:** High experimental value because of breadth and current food promotions. High priority, but replaceable.
- **BCP:** High experimental value because offer terms are explicit and often economically significant. High priority, but replaceable.
- **Sip:** Useful because it expands beyond conventional bank-card benefits. Replaceable.
- **Diners:** Useful for materially different premium benefit logic. Replaceable.
- **Yape:** Excellent real-world relevance, but not required for initial thesis. Nice to have until rights cleared.

### Substitution pool
If one source becomes RED, potential substitutes (subject to separate rights review): Scotiabank, BBVA, telecom clubs, merchant-direct offers, card-network benefits.  
*Scotiabank's current public benefit ecosystem includes personalized product-dependent discounts and public promotions, illustrating that alternative data families exist. [Scotiabank](https://www.scotiabank.com.pe/Personas/beneficios/programas/app?utm_source=chatgpt.com)*

### Kill condition
If after reviewing 6–8 plausible provider families, fewer than three can support a credible, sustainable, overlapping beachhead corpus: **source diversity has failed.**

---

## 31. Legal Review Packet

*This packet should be handed to qualified Peruvian counsel. Do not make them reverse-engineer PagaMenos.*

### Product summary
PagaMenos is an informational purchase-decision service. It:
- does not issue cards;
- does not process payments;
- does not access bank accounts;
- asks users to declare benefit eligibility;
- combines third-party promotion facts;
- calculates estimated economic outcomes;
- links to original sources.

### Exact data flow
$$\text{Provider public source} \longrightarrow \text{controlled retrieval} \longrightarrow \text{factual extraction} \longrightarrow \text{normalized rule} \longrightarrow \text{validation} \longrightarrow \text{source attribution} \longrightarrow \text{user's declared portfolio/context} \longrightarrow \text{deterministic economic comparison} \longrightarrow \text{recommendation} \longrightarrow \text{user outcome feedback}$$

### Exact provider data stored
merchant; benefit amount/type; applicable instrument; dates; caps; minimum purchase; channels; locations; exclusions; use limitations; source URL; timestamps; derived confidence.

### Raw content policy under consideration
transient retrieval; no public republishing; limited internal retention only if required for audit; hash/version metadata; no imagery.  
*(Ask counsel whether raw snapshots should be retained and under what conditions).*

### User data
email/pseudonymous account identifier; declared instruments; optional membership/tier; merchant searches; purchase intent; recommendation interactions; optional location; optional redacted transaction evidence.  
**No bank credentials.**  
*Peru's current personal-data framework is governed by Law 29733 and its newer regulation under DS 016-2024-JUS. [Gob.pe](https://www.gob.pe/institucion/anpd/normas-legales/6554453-n-016-2024-jus?utm_source=chatgpt.com)*

### Commercial model to review
Possible future: Premium; clearly labeled sponsorships; affiliate links; commercial campaign analytics. *(No ranking can secretly be purchased).*

### Provider-specific legal questions
- **Interbank / Plin:** Does public-site access permit automated periodic retrieval? Do applicable website terms restrict systematic extraction of factual promotion information? Does the Interbank Negocios application's reproduction restriction have any relevance to the separate public promotions catalogue? Can PagaMenos display normalized factual terms with attribution? Can it deep-link to the original campaign?
- **BCP:** What terms govern the public ViaBCP benefit pages? Is systematic retrieval/normalization of factual offer terms permissible? May merchant/card names be displayed to explain eligibility? Is written permission recommended/required?
- **Sip / Infinance:** Same questions, plus whether individual promotion URLs/catalog structures may be automatically polled.
- **Diners:** Same questions, plus use of Diners/card-tier names and campaign compilation rights.
- **Yape:** Which exact terms govern public Yape promo pages outside Yape Market? Do Yape Market extraction restrictions extend to the public promotion/help properties considered? May normalized Yape-promotion facts be used commercially?

### Cross-provider legal questions
- Copyright status of factual promotional conditions.
- Protection applicable to databases/compilations.
- Effect of systematic extraction even when individual facts are unprotected.
- Contractual enforceability of site terms against automated retrieval.
- Relevance and limitations of robots.txt.
- Deep-linking.
- Temporary cache and source snapshots.
- Trademark/name use for identifying issuers/merchants.
- Whether logos require permission.
- Consumer-liability risk from incorrect summaries.
- Appropriate disclaimer wording.
- Whether “best payment option” creates any regulated financial-advice issue.
- Affiliate disclosure.
- Sponsored-ranking disclosure.
- User feedback/UGC obligations.
- Privacy consent for eligibility portfolios/location.
- Retention/deletion requirements for transaction evidence.
- Cross-border analytics/cloud processors.

*Indecopi's consumer code also requires promotion conditions/restrictions to be communicated clearly and consistently by advertisers, reinforcing the need to avoid summaries that omit material restrictions. [Parlamento Peruano](https://www2.congreso.gob.pe/sicr/cendocbib/con4_uibd.nsf/A36293339ABFB69E05257C45005D85B0/%24FILE/11_pdfsam_CodigoDProteccionyDefensaDelConsumidor%281%29.pdf?utm_source=chatgpt.com)*

---

## 32. Data Sustainability Kill Criteria

### GREEN
All of:
- $\ge 3$ independent provider ecosystems have a credible source route;
- no critical source requires prohibited authenticated scraping;
- counsel/permission path permits validation and a plausible production path;
- $\ge 20$ useful overlapping merchants can be constructed;
- automation performance reaches approximately GREEN thresholds.

### YELLOW
Examples:
- two providers cleared/credible and a third pending;
- permission conversations ongoing;
- some replacement sources available;
- one provider requires manual pilot feed.
- **Action:** Continue validation. Do not authorize production until resolved.

### RED
Any of:
- core value requires systematic use that counsel considers incompatible with applicable restrictions;
- only 1–2 provider ecosystems remain usable;
- permission is necessary but realistically unobtainable;
- replacement sources destroy offer overlap;
- sustainable operation requires authenticated/private scraping;
- recurring human acquisition of T&C is unavoidable.

### Hard veto
**If participants love PagaMenos but Track B is RED: DO NOT BUILD THE CURRENT PAGAMENOS MODEL.**  
At most pivot toward: provider-opt-in, merchant-supplied, user-supplied, or single-provider tooling, and revalidate.

---

## 33. Final Event Taxonomy

*Keep instrumentation lean.*

| Event | Purpose | Trigger | Mandatory properties | Optional | Privacy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `acquisition_visit` | Funnel source | Landing load | `anon_id`, `source`, `timestamp` | `creative_id` | Low |
| `qualified_visit` | Remove accidental traffic | meaningful engagement | `anon_id`, `source` | `referrer` | Low |
| `merchant_search` | Intent exploration | search submitted | `merchant_query` | — | Low |
| `merchant_selected` | Merchant context | result chosen | `merchant_id` | `location` | Low/Med |
| `purchase_intent_declared` | Genuine context | timing selected | `merchant_id`, `intent_type`, `planned_window` | `amount`, `channel` | Medium |
| `portfolio_prompt_shown` | Onboarding exposure | eligibility required | `merchant_id` | `variant` | Low |
| `instrument_selected` | Eligibility | selection | `provider_family`, `instrument_type` | `tier` | Medium |
| `portfolio_context_completed` | Funnel | enough inputs | `instrument_count`, `provider_count` | — | Medium |
| `decision_computed` | Technical evaluation | rule engine completes | `candidate_count`, `confidence`, `version` | `amount` | Medium |
| `actionable_recommendation_returned` | Core value | winner returned | `offer_id`, `expected_saving`, `confidence` | `alternatives` | Medium |
| `no_actionable_recommendation` | Density/failure | no safe result | `reason` | `candidates` | Low |
| `recommendation_viewed` | Exposure | result visible | `offer_id` | `dwell_time` | Low |
| `evidence_viewed` | Trust | conditions/source opened | `offer_id` | `source_type` | Low |
| `recommendation_intended` | Behavioral intention | “I'll use it” | `offer_id` | — | Medium |
| `recommendation_attempted` | Real-world action | outcome started | `offer_id`, `merchant` | `amount` | Medium |
| `saving_reported` | VS2 | self-report | `offer_id`, `reported_saving` | — | Medium |
| `saving_verified` | VS3/4 | evidence approved | `offer_id`, `verified_saving`, `evidence_level` | `evidence_type` | High |
| `recommendation_failed` | Quality | offer didn't work | `offer_id`, `failure_reason` | `comments` | Medium |
| `purchase_abandoned` | Outcome | no purchase | `reason` | — | Low |
| `offer_stale_reported` | Data quality | participant flags | `offer_id` | `description` | Low |
| `recommendation_shared` | Growth | share | `offer_id` | `channel` | Low |
| `research_contact` | Observer-effect control | study message sent | `participant_id`, `contact_type` | — | Medium |
| `repeat_independent_intent` | Retention | derived after rules | `participant_id`, `nth_independent_use` | `days_since_previous` | Medium |
| `premium_prompt_exposed` | Monetization | eligibility reached | `feature`, `prior_VS3` | — | Medium |
| `premium_interest_action` | Revealed interest | CTA | `feature` | — | Medium |

### Derived — not emitted
RIVSR; week-4 active; third-use rate; independent-use classification; opportunity density; user-level verified saving totals.

---

## 34. Statistical / Analytical Plan

*This is not a clinical trial, but analysis rules should be locked.*

### H-P0-01 — Offer Density
- **Metric:** Meaningful opportunity count per participant over four weeks.
- **Formula:** Number of real participant purchase occasions where $\ge 1$ applicable benefit meeting economic threshold exists.
- **Minimum interpretable sample:** $\ge 30$ participants with adequate purchase exposure.
- **Primary summary:** median; IQR; % with $\ge 3$ opportunities.
- **Threshold:** Median $\ge 3/\text{month} = \text{GREEN}$ directional signal.

### H-P0-02 — Repeat Behavior
- **Metric:** Third Independent Decision Rate:
$$\frac{\text{participants reaching } \ge 3\text{ independent intents}}{\text{analysis-eligible participants}}$$
- **Sample:** $\ge 30$.
- **GREEN:** $\ge 50\%$.
- **RED:** $<20\%$.
- Also calculate Wilson 95% interval. *(No claim of population prevalence).*

### H-P0-03 — Correctness/Freshness
- **Metrics:** SFR; CEA; Automation Rate; Exception Rate.
- **Minimum:** $\ge 100$ audited offer versions. Prefer $\ge 30$ detected change events for automation interpretation.

### H-P0-04 — Source Sustainability
- No statistical formula.
- **Pass requires:** $\ge 3$ viable provider ecosystems; no critical unresolved RED dependency; documented counsel/permission route.

### H-P0-05 — Verified Value
- **Metrics:** $\ge 1$ VS3 saver rate and RIVSR.
- Also: median verified PEN saved per saver; median saving per verified occasion.
- *Do not average all savings without median because S/100 premium-dining discounts can skew results.*

### H-P0-06 — Comprehension
- Wave 0 + selected Wave 1 checks.
- **Minimum:** $\ge 8$ moderated users.
- **Successful task:** User correctly identifies what to use, approximate expected benefit, and critical restriction.
- **GREEN:** $\ge 85\%$ task success.
- **RED:** $<70\%$.

### H-P0-07 — Acquisition
- **Minimum for lower-funnel interpretation:** 100 qualified visits.
- **Analyze:** qualified visit → merchant context; context → personalized result; result → 14-day independent repeat.
- *Do not make claims from 12 visitors.*

### H-P0-08 — Monetization
- **Premium:** only expose after demonstrated value; minimum ~20 qualified exposures for directional interpretation.
- **Commercial:** $\ge 10$ merchant conversations (preferably 15).
- *No statistical inference. Evidence strength follows commitment hierarchy.*

### Missing data rules
- Technical outage periods excluded from product-performance denominators but reported.
- Researcher-prompted usage excluded from independent metrics.
- Participants who drop out remain in recruitment/attrition reporting.
- Do not impute unreported savings.
- Unverified self-reports remain VS2, never promoted to VS3.

---

## 35. Experiment Register

| ID | Hypothesis / risk | Method | Participants/data | Duration | Required product | Primary metric | Success | Warning / Kill | Cost | Decision |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **EXP-P0A-001** | H4 source rights | Source register + counsel packet | 6–8 source families | 1–3 wks initial | None | viable provider count | $\ge 3$ credible | $<3 = \text{RED}$ | Low + possible legal fee | Can data model exist? |
| **EXP-P0A-002** | H1 offer density | Build overlapping corpus | 30–40 merchants | 1–2 wks | Admin dataset | overlap/density | $\ge 20$ multi-option merchants | insufficient overlap | S/0 | Beachhead viability |
| **EXP-P0A-003** | Rules representable | Torture suite | 30–40+ cases | 1 wk | Minimal evaluator | semantic coverage | $\ge 90\%$ | $<80\%$ kill current model | S/0 | Rules feasibility |
| **EXP-P0A-004** | H3 freshness | 60-day monitoring | 120–180 offers | 60 days | Source monitor | SFR/CEA/AR | GREEN thresholds | RED thresholds | Low infra | Data ops viability |
| **EXP-P0A-005** | H6/onboarding | Counterbalanced A vs C | 6–8 | 2–3 days | Prototype | task completion/time | clear comprehension | high abandonment | S/0 | Lock onboarding |
| **EXP-P0A-006** | H6 decision UX | Moderated tasks | Wave 0 | 1 wk | Prototype | correct interpretation | $\ge 85\%$ | $<70\%$ | S/0 | Lock result UX |
| **EXP-P0A-007** | H2/H5 Wave 1 | Real behavioral cohort | 16–18 | 4 wks | Validation product | RIVSR / third-use | threshold | RED behavioral | S/0 | Initial PMF signal |
| **EXP-P0A-008** | H2/H5 replication | Wave 2 | 16–22 | 4 wks | same semantics | same | reproduce | failure to replicate | S/0 | Replication |
| **EXP-P0A-009** | H7 organic acquisition | 24-cell matrix | public traffic | 4–6 wks | Public pages | qualified decisions | repeatable archetype | views only | S/0 | Distribution |
| **EXP-P0A-010** | H8 Premium | Post-value fake door | $\ge 20$ exposed | 2–4 wks | Feature prompt | committed action | meaningful directional signal | no action | S/0 | Premium signal |
| **EXP-P0A-011** | H8 commercial | Merchant/provider outreach | 10–20 orgs | 3–6 wks | Demo/data | commitment level | pilot/data discussions | compliments only | S/0 | B2B signal |
| **EXP-P0A-012** | Competitor risk | Rebajitas monitor | product | weekly | None | competitive capability delta | wedge survives | parity on core engine | S/0 | Reassessment |
| **EXP-P0A-013** | Source permission | Explicit outreach | initial providers | 4–8 wks | research summary | permission/feed progression | $\ge 3$ routes credible | systematic refusal | S/0 | Source sustainability |
| **EXP-P0A-014** | Challenger rescue | TuPlata concept/permission probe only if PagaMenos hits RED | 10–15 relevant users | $\le 1\text{ wk}$ | tiny concept | trust/permission acceptance | challenger credible | rejection too | S/0 | SWITCH eligibility |

### Highest information-value order
1. `EXP-001`
2. `EXP-002`
3. `EXP-003`
4. start `EXP-004` immediately
5. `EXP-005` / `EXP-006`
6. `EXP-007`
7. `EXP-008`
8. `EXP-009` in parallel
9. `EXP-010` / `EXP-011` after value
10. `EXP-014` only conditionally.

---

## 36. Experiment Dependency Graph

```text
SOURCE RIGHTS TRIAGE ───────────────┐
EXP-001                             │
                                    ↓
                            CORPUS / OVERLAP
                            EXP-002
                                    │
                                    ↓
                            RULE TORTURE
                            EXP-003
                                    ├────────────→ 60-DAY SOURCE TEST ──────────────┐
                                    │              EXP-004                          │
                                    ↓                                               │
                            MINIMAL PROTOTYPE                                       │
                                    ↓                                               │
                            WAVE 0: ONBOARDING + COMPREHENSION                      │
                            EXP-005 / EXP-006                                       │
                                    ↓                                               │
                            LOCK BEHAVIORAL PROTOCOL                                │
                                    ↓                                               │
                            WAVE 1 ─────────────→ ORGANIC ACQUISITION               │
                            EXP-007               EXP-009                           │
                                    ↓                                               │
                            WAVE 2                                                  │
                            EXP-008                                                 │
                                    ↓                                               │
                            VERIFIED SAVINGS ───────────┴→ PREMIUM / COMMERCIAL     │
                                                           EXP-010 / EXP-011        │
                                                                                    │
SOURCE PERMISSION EXP-013 ──────────────────────────────────────────────────────────┤
                                                                                    ↓
                                                                           FINAL DECISION REVIEW
```

- **EXP-P0A-012 Rebajitas Monitor** runs across the entire phase.
- **EXP-P0A-014 TuPlata rescue** activates only if PagaMenos becomes structurally RED.

### Parallelization
After the initial corpus exists, three clocks should run simultaneously:
1. 60-day data maintenance;
2. behavioral cohorts;
3. source-right outreach.

*This prevents spending nine weeks waiting sequentially.*

---

## 37. Minimum Validation Build Spec

*No production architecture decisions are needed.*

### Required before first participant

#### Public validation surface
Capabilities:
- mobile web;
- merchant search;
- purchase-intent declaration;
- minimal portfolio selection;
- amount/context input;
- deterministic result;
- alternatives;
- conditions/source/freshness;
- outcome submission.

#### Research/admin surface
- participant identifier;
- offer CRUD/import;
- merchant normalization;
- offer status;
- review queue;
- evidence verification.

#### Rules evaluator
Only enough semantics for the torture suite/beachhead.

#### Analytics
Events from Section 33.

#### Experiment controls
onboarding variant; participant wave; acquisition source.

### Required during the 60-day period
- **Source monitor:** scheduled retrieval; change fingerprints; expiry; parsing candidate; review queue; operational metrics.
- **Data quality dashboard:** Must expose stale count; changed count; exception count; SFR audit; human review minutes.
- **Outcome evidence workflow:** optional upload; redaction guidance; verification status; deletion controls as appropriate.

### Not required before behavioral validation
recommendation ML; generative chat; native push; app store packaging; card OCR; live banking APIs.

---

## 38. Explicit Non-Build List

Phase 0A must **not** build:
- Flutter/native iOS/Android app;
- final production architecture;
- microservices;
- nationwide catalog;
- all banks;
- all Yape offers;
- transaction aggregation;
- bank credentials;
- Open Banking integration;
- budgeting;
- credit scoring;
- loans;
- payment processing;
- wallet functionality;
- PagaMenos cashback;
- full affiliate infrastructure;
- Premium billing;
- subscription backend;
- production notification orchestration;
- geofencing;
- social feed;
- reviews/community;
- referral points;
- gamification;
- final recommendation ML;
- general-purpose LLM assistant;
- automatic merchant scraping at national scale;
- supermarket SKU comparison;
- ecommerce price engine;
- receipt OCR pipeline;
- complete design system;
- offline mobile engine;
- multi-country infrastructure;
- 12-month engineering backlog.

> **If Phase 0A engineering begins resembling the above: validation has escaped its boundary.**

---

## 39. Phase 0A Operating Sequence

### Week 0–1 — Preparation and rights triage
- Execute EXP-001; source inventory; screening setup; merchant-overlap analysis; contact/legal packet preparation.
- **Gate:** Do not invest in prototype beyond trivial shell if initial research suggests $<3$ plausible source ecosystems.

### Week 1–2 — Dataset and semantic model
- freeze candidate merchant universe;
- construct 120–180 offer corpus;
- EXP-002;
- EXP-003;
- start automated source monitoring.
- **Gate:** Require meaningful overlap; $\ge 80\%$ initial representability to proceed even experimentally. If $<80\%$: pivot rule scope before participants.

### Week 2 — Prototype
- Build only Section 37 capabilities.
- Instrument before inviting participants.
- Run synthetic event validation.

### Week 3 — Wave 0
- 6–8 participants.
- Run: onboarding comparison; decision comprehension; evidence/source trust; instrumentation audit.
- **Gate:** No Wave 1 until core task completion approximately $\ge 80\%$, analytics reconciliation succeeds, and no severe product misunderstanding. Fix mechanics; do not change success thresholds.

### Week 4 — Wave 1 begins
- 16–18 users.
- Start four-week naturalistic observation.
- Research contact strictly controlled.

### Week 5 — Wave 2 begins
- 16–22 additional users.
- Only begin if Wave-1 setup exposed no experimental invalidity.
- *Do not wait for Wave-1 success/failure and redesign the product to make Wave 2 look better.*

### Weeks 4–9 — Parallel clocks
- **Behavioral:** Wave 1; Wave 2; outcome verification.
- **Data:** Continue full 60 days.
- **Rights:** legal issue clarification; permission outreach; source replacement tests.
- **Acquisition:** 24-cell content matrix.
- **Competition:** weekly Rebajitas register.

### Weeks 7–9 — Monetization probes
- Only expose Premium tests to users with demonstrated value.
- Begin commercial discussions with real evidence: $X$ qualified decisions, $Y$ verified savings. *(Not hypothetical TAM slides).*

### End of Week 9+ — Locked analysis
- Before reading outcome summary, generate the analysis template containing all thresholds, formulas, exclusions, and cohort splits. Then populate it.
- **No-go on moving targets:** Any post-hoc alternative metric may be reported as exploratory only. It cannot overturn a failed pre-registered primary result.

---

## 40. Final BUILD / PIVOT / SWITCH / KILL Matrix

### A — BUILD PAGAMENOS
*Requires both tracks.*
- **Behavioral:** Ideally RIVSR $\ge 35\%$; strong third-use behavior; meaningful week-4 activity; $\ge 95\%$ confirmed-recommendation accuracy; meaningful saving density; replication across Wave 1/2 or a clearly defined strong ICP.
- **Data:** $\ge 3$ credible provider ecosystems; no existential rights issue; $\ge 95\%$ freshness region; $\ge 90\%$ automation region; exception-based operations.
- **Competitive:** Rebajitas has not eliminated the decision-engine wedge.
- **Acquisition:** At least one organic acquisition archetype generates qualified decision users.
- **Economics:** At least one monetization path shows credible revealed/commercial signal.
- **Outcome:** Proceed to *PAGAMENOS — PHASE 1: PRODUCT DEFINITION, EVIDENCE SYNTHESIS & VALIDATED REQUIREMENTS*. *(This still does not mean “build everything for twelve months”).*

### B — NARROW / PIVOT PAGAMENOS
*Choose this if demand is real but one part of the original thesis fails.*
- **Segment pivot:** 3+ instrument optimizers succeed; 2-instrument consumers do not. → *Narrow ICP.*
- **Category pivot:** Cinema performs; restaurants do not. → *Change wedge.*
- **Trigger pivot:** Users rarely search manually but share-extension/content paths perform. → *Reframe interaction.*
- **Source pivot:** Issuer scraping is unsustainable but merchant/provider-opt-in feeds work. → *Move toward partner-supplied model.*
- **Portfolio pivot:** One bank + membership combinations outperform cross-bank broadness. → *Narrow providers.*
- *Requires a new Phase-0 hypothesis before serious product development.*

### C — SWITCH TO TUPLATA
*Only appropriate when the failure is PagaMenos-specific, not generic lack of consumer willingness to optimize money.*
- Examples: users clearly value financial optimization but repeatedly fail to remember pre-purchase checking; source rights make cross-provider promotion data structurally unsustainable; data maintenance remains too labor-intensive; participants strongly prefer passive automation over active pre-purchase behavior; lightweight EXP-P0A-014 indicates reasonable acceptance of TuPlata's notification/privacy trade-off.
- *Do not switch merely because PagaMenos misses one threshold. TuPlata still has to earn its own primary validation.*

### D — KILL
*Choose this if:*
- repeat independent use is weak;
- relevant saving density is weak;
- source sustainability is RED;
- no strong subsegment emerges;
- organic traffic doesn't convert to real decisions;
- no revenue route shows credible signal;
- and the TuPlata rescue probe reveals similarly unattractive trust/adoption economics.

*This is a successful Phase 0A outcome if it prevents twelve months of wasted engineering.*

---

## 41. Recommended Immediate Next Action

Do not build the responsive prototype first.  
The immediate next action should be:

> **Create the Phase-0A Validation Corpus v0 + Source Rights Register v1.1 before any user-facing development.**

Specifically, perform these five actions in order:
1. **Freeze 30–40 candidate merchants** weighted toward frequent Lima chains and real participant behavior.
2. **Collect approximately 120–180 current offer instances** from Interbank/Plin, BCP, Sip and Diners, without trying to build nationwide coverage.
3. **Calculate merchant overlap** and require $\ge 20$ useful merchants with $\ge 2$ competing options where practicable.
4. **Run the rule torture audit and source-right triage** on that exact corpus.
5. **Only if the corpus survives**, build the minimal mobile-web validation surface and recruit Wave 0.

---

### The Most Important Distinction

> **Phase 0A should not validate whether users enjoy seeing discounts.**  
> Rebajitas, bank apps, Sip, ApliJoven and existing loyalty systems already make that question increasingly uninteresting; ApliJoven alone now claims thousands of youth-oriented promotions and discounts. [Gob.pe](https://www.gob.pe/institucion/minedu/noticias/1375563-aplijoven-el-aplicativo-movil-para-jovenes-que-ofrece-servicios-descuentos-y-oportunidades?utm_source=chatgpt.com)

Phase 0A needs to validate a much narrower proposition:
> **When a real multi-benefit user is actually about to spend money, does giving them one trustworthy, economically calculated answer cause repeated independent behavior and verified savings—and can we sustainably obtain the data required to keep that answer correct?**

- If yes, PagaMenos earns Phase 1.
- If users like the idea but do not independently use it, do not build it.
- If users use it repeatedly but the dataset has no sustainable rights path, do not build the current model.
- If users repeatedly use it, repeatedly save real money, the recommendation remains trustworthy, acquisition produces qualified users, and at least three provider ecosystems have a credible sustainable data route: **then—and only then—PagaMenos has earned serious product investment.**

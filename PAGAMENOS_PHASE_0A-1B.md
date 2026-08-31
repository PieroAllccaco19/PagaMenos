# PAGAMENOS — PHASE 0A-1: CORPUS HARDENING & FINAL v1 SPECIFICATION
## NARROWED VALIDATION CORPUS v1 & DECISION ENGINE FIXTURES

**Research cutoff / freeze reference:** 30 August 2026, 18:00 PET  
**Current decision state:** NARROWED CORPUS GREEN — Proceed to Phase 0A-2 Implementation.

---

## 1. Executive Hardening Decision

### NARROWED CORPUS GREEN
The final hardening pass passes the pre-registered gate, but only after removing four of the original eighteen merchants and correcting several pieces of Phase 0A-1 data.

The experimental corpus that survives is:

| Gate | Required | Hardened result | Result |
| :--- | :--- | :--- | :--- |
| **Confirmed same-purchase O2+** | $\ge 14/18$ | 14/18 | **PASS — exactly** |
| **O4-CONFIRMED** | $\ge 4$ | 4 | **PASS — exactly** |
| **Provider families materially contributing** | $\ge 3$ | 4 | **PASS** |
| **Rules semantically representable** | $\ge 90\%$ | 46/46 structural; 44/46 safely rankable without private state | **PASS** |
| **Actionable RC5/conflicts** | 0 | 0 | **PASS** |
| **Production source clearance** | Not a Phase-0A build gate | 0/4 provider families CLEARED | **BLOCKS production, not private validation** |
| **Rebajitas already at decision-engine parity** | Must be No | No public evidence of parity | **PASS** |

### The four removed merchants:
1. **Don Belisario:** current overlap is temporally fragile; the clean cross-provider campaign ends essentially immediately, while surviving offers cease being sufficiently equivalent.
2. **Pizza Hut:** significant active offers exist—including a current Sip 2-medium-pizza offer—but the cross-provider baskets are not equivalent enough; the strongest BCP alternative is Qore/private-state. ([beneficios.sip.pe](https://beneficios.sip.pe/promociones/hasta-26-pizza-hut-1))
3. **La Bistecca:** Diners is public; the 50% BCP alternative depends on Qore/private qualification.
4. **La Nacional:** same problem: the economically interesting BCP/Qore alternative is provider-private.

### Major Cineplanet Correction
A major correction occurred during hardening at Cineplanet: the primary Sip page currently available says its S/9.90 Wednesday campaign ended 26 August 2026, despite a newer search index claiming a later date. Under the strict evidence rule, the primary page wins and the Sip offer is excluded.  
Cineplanet nevertheless remains in Corpus v1 because BCP and Interbank both currently publish 50% AMEX benefits for Cineplanet, valid from 15 August 2026 to 15 August 2027.

### The surviving Wave-0 universe
$$\mathbf{14\text{ merchants}} \cdot \mathbf{46\text{ active rule instances}} \cdot \mathbf{4\text{ provider ecosystems}} \cdot \mathbf{10\text{ food merchants}} \cdot \mathbf{4\text{ entertainment merchants}}$$

> **The conclusion is not that PagaMenos has PMF.**  
> It is narrower: The real data now contains enough high-confidence, same-purchase decision problems to justify building the behavioral validation software.

---

## 2. Corpus v1 Summary

**Research cutoff / freeze reference:** 30 August 2026, 18:00 PET.

### Final merchants (14)
1. Papa Johns
2. Chinawok
3. Baco y Vaca
4. Granja Azul
5. TGI Fridays
6. UVK Multicines
7. Popeyes
8. Cineplanet
9. Coney Park
10. Coney Active
11. Embarcadero 41
12. Issei Cocina Nikkei
13. Perroquet
14. Villa Chicken

### Final rules

| Provider family | Rules | Share |
| :--- | :--- | :--- |
| **Interbank / Plin** | 16 | 34.8% |
| **Diners Club** | 12 | 26.1% |
| **BCP / Qore** | 10 | 21.7% |
| **Sip / Oh!** | 8 | 17.4% |
| **Total** | **46** | **100%** |

### Category split

| Category | Merchants | Share |
| :--- | :--- | :--- |
| **Restaurants / food** | 10 | 71.4% |
| **Cinema / entertainment** | 4 | 28.6% |

### Confirmed overlap
- **Confirmed O2+:** 14/14 final merchants
- **O3:** 2
- **O4-CONFIRMED:** 4
- **Merchants additionally containing meaningful VERIFY_FIRST alternatives:** 2 (principally Fridays and Villa Chicken)
- **Actionable conflicts retained:** 0

*A serious temporal warning remains: many food promotions end 30 September. That is precisely why Phase 0A's source-monitor and versioning requirements remain mandatory. The corpus is a living experimental corpus with frozen scope, not a claim that today's promotional terms never change.*

---

## 3. Merchant-by-Merchant Reverification

| Merchant | Reverification result | Confirmed overlap | Final disposition |
| :--- | :--- | :--- | :--- |
| **Papa Johns** | BCP + Plin + Sip current; exact large-classic comparison exists BCP vs Plin | O2 | **KEEP** |
| **Chinawok** | BCP + Plin + Sip current; same A-lo-Pobre product appears under Plin/Sip | O2 | **KEEP** |
| **Don Belisario** | Offers exist, but clean Sip/Plin overlap is at immediate expiry boundary and surviving baskets diverge | O1 | **REMOVE** |
| **Baco y Vaca** | BCP + Interbank + Sip + Diners all current | O3 | **KEEP** |
| **Granja Azul** | BCP + Interbank + Diners current, all 20%/cap-style rules with contextual restrictions | O3 | **KEEP** |
| **Fridays** | Interbank + Sip public 25%; Qore 50% exists but is private-state | O4-C + VF | **KEEP** |
| **UVK** | Interbank 2×1/food benefit + Diners fixed ticket/restobar/opera | O4-C | **KEEP** |
| **Popeyes** | BCP + Interbank + two Sip offers; exact six-piece basket BCP vs Sip | O2 | **KEEP** |
| **Cineplanet** | Sip S/9.90 primary page is expired; BCP + Interbank AMEX 50% remain current | O2 | **KEEP** |
| **Coney Park** | Sip and Diners provide essentially same S/45→S/85 play-value proposition | O2 | **KEEP** |
| **Coney Active** | Sip campaign covers Active; Diners has Active-specific S/45→S/86 | O2 | **KEEP** |
| **Embarcadero 41** | Interbank 15% vs Diners 20%, differing weekday/channel scope | O4-C | **KEEP** |
| **Issei** | Sip 50% + Diners 50%, materially equivalent economics | O2 | **KEEP** |
| **Perroquet** | BCP 20% applies differently to beverages; Diners 30% food-only | O4-C | **KEEP** |
| **Pizza Hut** | Plin, Sip and Qore offers exist, but baskets differ materially; Qore is private | O1 | **REMOVE** |
| **Villa Chicken** | Interbank and Diners expose sufficiently comparable whole-chicken bundles; Qore adds private-state possibility | O2 + VF | **KEEP** |
| **La Bistecca** | Diners public 25%; Qore 50% private | confirmed O0 | **REMOVE** |
| **La Nacional** | Diners public 20%; Qore 50% private | confirmed O0 | **REMOVE** |

*The current Sip Pizza Hut offer is real and useful—two medium Americana/Pepperoni pizzas plus two drinks for S/25.90 through 31 October—but that does not make its basket equivalent to Plin's three-medium-pizza or other Pizza Hut packages.*

---

## 4. Rule-by-Rule Corpus v1

**Corpus identifier:** `PAGAMENOS_VALIDATION_CORPUS_v1_2026-08-30T1800-0500`  
For every row below: `observed_at = 2026-08-30`, `source_status = ACTIVE`, source confidence = `HIGH` unless stated otherwise.
- `DP` = DETERMINISTIC_PUBLIC
- `UD` = USER_DECLARABLE
- `DX` = DYNAMIC_EXTERNAL
- `PP` = PROVIDER_PRIVATE
- `ACT` = ACTIONABLE_CONDITIONAL
- `VF` = VERIFY_FIRST

### Papa Johns

| Rule / campaign | Instrument | Benefit / function | Dates | Context / limits / exclusions | State | Source / corroboration | Confidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **PJ-BCP-01** / BCP-PJ-GCL | BCP credit/debit | S/20.90 vs S/32.90; $\Delta=\text{S}/12$ | 01/07–30/09 | Large Classic; salon/takeaway; max 2; stock $\ge 1500$; no delivery/apps/holidays; DNI | DX | BCP primary / P-only | HIGH / ACT |
| **PJ-PLIN-01** / PLIN-PJ-LARGE | Plin Interbank | S/13.90 vs S/27.90; $\Delta=\text{S}/14$ | 01/07–30/09 | Large Americana/Pepperoni; salon/takeaway; QR; daily limit; stock; no airport/delivery/holiday | DX | Plin official campaign / P-only | HIGH / ACT |
| **PJ-PLIN-02** / PLIN-PJ-PAPABOX | Plin Interbank | S/15.90 vs S/24.40 | 01/07–30/09 | PapaBox; salon/takeaway; QR; max 2/day; stock | DX | Plin official campaign | HIGH / ACT |
| **PJ-PLIN-03** / PLIN-PJ-HAWAIIAN | Plin Interbank | S/8.90 vs S/24.90 | 01/07–30/09 | Medium Hawaiian; salon/takeaway; stock 3000; max 1/order/user | DX | Plin official campaign | HIGH / ACT |
| **PJ-SIP-01** / SIP-PJ-BUNDLE | Sip/Oh! | S/9.90 vs S/29.90 | to 30/09 | Medium pizza + sides bundle; salon/takeaway; stock-limited; no incompatible channels/promos | DX | Sip primary | HIGH / ACT |

### Chinawok

| Rule | Instrument | Benefit / function | Dates | Context / limits | State | Source | Confidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CW-BCP-01** | BCP | S/29.90 vs S/49.90 | 01/07–30/09 | 2 Mostrazos; salon; stock 500; max 3; excludes airport/J. María/holidays | DX | BCP primary | HIGH / ACT |
| **CW-BCP-02** | BCP | S/12.90 vs S/19.80 | 01/07–30/09 | Encájate + 2 wantanes; salon; stock 500; max 2; no digital/delivery | DX | BCP primary | HIGH / ACT |
| **CW-PLIN-01** | Plin | S/15.90 vs S/28.80 | 01/07–30/09 | A lo Pobre Chijaukay + drink; stores; max 2; excluded locations | DX | Plin | HIGH / ACT |
| **CW-PLIN-02** | Plin | S/10.90 vs S/18.80 | 01/07–30/09 | Encájate + drink + wantán; max 2; stock 2500 | DX | Plin | HIGH / ACT |
| **CW-PLIN-03** | Plin | S/19.90 vs S/38.60 | 01/07–30/09 | Tallarín Taypa + chaufa + 2 drinks; max 3 | DX | Plin | HIGH / ACT |
| **CW-SIP-01** | Sip/Oh! | S/16.90 vs S/28.80 | to 30/09 | Chijaukay A lo Pobre + drink; salon; availability/stock; excluded locations | DX | Sip primary | HIGH / ACT |

### Baco y Vaca

| Rule | Instrument | Benefit / function | Dates | Context | State | Source | Confidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BV-BCP-01** | BCP credit/debit | $\min(20\% \times \text{eligible\_bill}, \text{S}/100)$ | 01/07–30/09 | salon; request before bill; holiday restrictions | DP | BCP | HIGH / ACT |
| **BV-IBK-01** | Interbank/Plin | $20\% \times \text{eligible bill}$; cap not stated | 01/07–31/12 | salon/pickup/delivery; listed locations; non-cumulative | DP | Interbank | MEDIUM / ACT; high-amount ranking blocked |
| **BV-SIP-01** | Sip/Oh! | $\min(20\% \times \text{eligible\_bill}, \text{S}/100)$ | 01/01–30/09 | whole menu incl. beverages; one/table/account | DP | Sip official detail | HIGH / ACT |
| **BV-DIN-01** | Diners | $\min(20\% \times \text{eligible\_bill}, \text{S}/100)$ | 01/01–30/12 | salon/takeaway/delivery; delivery fee excluded; special-date restrictions | DP | Diners | HIGH / ACT |

### Granja Azul

| Rule | Instrument | Benefit | Dates | Context | State | Source | Confidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **GA-BCP-01** | BCP | $\min(20\% \times \text{eligible\_subtotal}, 70)$ | 01/07–30/09 | salon; branch/day restrictions; product/date exclusions | DP | BCP | HIGH / ACT |
| **GA-IBK-01** | Interbank/Plin | same 20%, cap S/70 | 01/07–31/12 | salon; branch/day/product restrictions | DP | Interbank official | HIGH / ACT |
| **GA-DIN-01** | Diners | same 20%, cap S/70 | 04/05–31/12 | salon; listed branches; Mon–Sat; no holidays/long weekends | DP | Diners | HIGH / ACT |

### TGI Fridays

| Rule | Instrument | Benefit | Dates | Context | State | Source | Confidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FR-IBK-01** | Interbank/Plin | $\min(25\% \times \text{food}, 100)$ | 01/07–31/12 or stock | salon/takeaway; international airport included; no beverages/delivery/holidays | DX | Interbank | HIGH / ACT |
| **FR-SIP-01** | Sip/Oh! | $\min(25\% \times \text{food}, 100)$ | 01/01–30/09 | salon/takeaway; airport excluded; drinks/delivery/promos excluded; no published holiday exclusion | DP | Sip | HIGH / ACT |
| **FR-QORE-01** | BCP Qore | $\min(50\% \times \text{eligible\_food}, 100)$ | 01/07–30/09 | selected Qore users; one use; salon/takeaway | PP | Qore | HIGH rule / VF |

### UVK

| Rule | Instrument | Benefit | Dates | Context | State | Source | Confidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **UVK-IBK-01** | Interbank | 2×1 tickets; for 2 tickets saving = $P$ | 15/07–31/12 | physical box office; max 4; no Tue/holiday/restricted films | DP | Interbank | HIGH |
| **UVK-IBK-02** | Interbank | 20% eligible combos | 15/07–31/12 | physical candy bar; no Tue/holidays | DP | Interbank | HIGH |
| **UVK-DIN-01** | Diners | ticket S/9.90; saving = $P - 9.90$ | 01/02–31/12 | selected venues; Mon–Fri except Tue/holidays; box office | DP | Diners | HIGH |
| **UVK-DIN-02** | Diners | 20% Restobar | 01/02–31/12 | UVK Panorama; source restrictions | DP | Diners | HIGH |
| **UVK-DIN-03** | Diners | 20% opera | 01/02–31/12 | Wed/Sat; selected venues; physical; no holiday | DP | Diners | HIGH |

### Popeyes

| Rule | Instrument | Benefit | Dates | Context | State | Source | Confidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **POP-BCP-01** | BCP | 6 pcs + family fries S/39.90 vs 69.90; $\Delta=\text{S}/30$ | 01/07–30/09 | salon/takeaway; stock 500; max 1; no holiday/digital | DX | BCP | HIGH |
| **POP-IBK-01** | Interbank | 5 pcs + family potato S/39.90 vs 59.90 | to 30/09 | salon/takeaway; location/channel restrictions | DX | Interbank | HIGH |
| **POP-SIP-01** | Sip/Oh! | 2 pcs + nuggets + potato S/12.90 vs 32.40 | 01/03–30/09 | salon/takeaway; stock-limited; max 2 | DX | Sip | HIGH |
| **POP-SIP-02** | Sip/Oh! | 6 pcs + family potato S/29.90 vs 69.90; $\Delta=\text{S}/40$ | 01/03–30/09 | salon/takeaway; stock 3500; max 1/day | DX | Sip | HIGH |

### Cineplanet

| Rule | Instrument | Benefit | Dates | Context | State | Source | Confidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CIN-BCP-01** | BCP AMEX | 50% eligible ticket price | 15/08/26–15/08/27 | web/app; AMEX; Socio Cineplanet; $\le 2/\text{day}$; eligible formats; stock/codes | UD | BCP | HIGH |
| **CIN-IBK-01** | Interbank AMEX | 50% eligible ticket price | 15/08/26–15/08/27 | web/app; Socio Cineplanet; max 2/day; stock $\ge 100\text{k}$ codes | UD | Interbank current AMEX page | HIGH |

*(The previously used Sip S/9.90 rule is not retained: its accessible primary page says its validity ended on 26 August).*

### Coney Park / Coney Active

| Rule | Merchant scope | Instrument | Benefit | Dates | Context | State | Source | Confidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CON-SIP-01** | Park + Active | Sip/Oh! | Pay S/45 → S/85 nominal play value | 01/01–30/09 | purchase Mon–Fri via corporate WhatsApp $\ge 1\text{ day}$ ahead; no weekend/holiday; card cost if needed | DP | Sip | HIGH |
| **CON-DIN-P-01** | Coney Park | Diners | S/45 → S/85 nominal play value | 12/05–31/12 | weekday/prepurchase restrictions | DP | Diners | HIGH |
| **CON-DIN-A-01** | Coney Active | Diners | S/45 → S/86 nominal play value | 12/05–31/12 | weekday/prepurchase restrictions | DP | Diners | HIGH |

*(CON-SIP-01 is one campaign, not two duplicated rules).*

### Embarcadero 41

| Rule | Instrument | Benefit | Dates | Context | State | Source | Confidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **EMB-IBK-01** | Interbank/Plin | $\min(15\% \times \text{eligible\_food}, 100)$ | to 31/12 | salon/pickup; broad weekdays incl. holiday availability per current rule; drinks/desserts excluded | DP | Interbank | HIGH |
| **EMB-DIN-01** | Diners | $\min(20\% \times \text{eligible\_food}, 100)$ | 28/01–30/12 | Mon–Fri salon only; no holidays; drinks/desserts/promos/trios/makis excluded | DP | Diners | HIGH |

### Issei

| Rule | Instrument | Benefit | Dates | Context | State | Source | Confidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ISS-SIP-01** | Sip/Oh! | 50% eligible menu | 01/01–30/09 | La Rotonda; excludes beverages/desserts; salon/takeaway/direct delivery | DP | Sip | HIGH |
| **ISS-DIN-01** | Diners | 50% eligible menu | 01/01–31/12 | same merchant/location family; beverages/desserts excluded | DP | Diners | HIGH |

### Perroquet

| Rule | Instrument | Benefit | Dates | Context | State | Source | Confidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **PER-BCP-01** | BCP | $\min(20\% \times \text{eligible}(\text{food} + \text{nonalc}), 100)$ | 01/07–30/09 | reservation/salon; excludes alcohol/bar items/special contexts; no holiday | DP | BCP | HIGH |
| **PER-DIN-01** | Diners | $\min(30\% \times \text{eligible\_food}, 100)$ | 23/01–20/12 | reservation/salon; beverages/breakfast excluded; no holiday/takeaway/delivery | DP | Diners | HIGH |

### Villa Chicken

| Rule | Instrument | Benefit | Dates | Context | State | Source | Confidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **VC-IBK-01** | Interbank/Plin | whole chicken + fries + natural drink S/75.90 vs 100.80 | 01/07–30/12* | salon; one/table/client; locations; holiday exclusions | DP | Interbank | MEDIUM-HIGH; source header/T&C end-date mismatch resolved conservatively |
| **VC-IBK-02** | Interbank/Plin | chicken + fries + anticuchos + drink S/93.90 vs 122.60 | 01/07–30/12* | analogous salon rules | DP | Interbank | MEDIUM-HIGH |
| **VC-DIN-01** | Diners | whole chicken + fries + natural drink S/80.90 vs 100.80 | 01/01–31/12 | salon; restrictions/special dates | DP | Diners | HIGH |
| **VC-DIN-02** | Diners | chicken + fries + 1.5L soda S/84.90 vs 95.80 | 01/01–31/12 | takeaway/delivery | DP | Diners | HIGH |
| **VC-QORE-01** | BCP Qore | $\min(50\% \times \text{eligible\_a\_la\_carte}, 100)$ | 01/07–30/09 | Qore-active user; salon; one use; menu/date exclusions | PP | BCP Qore | HIGH rule / VF |

> **Corpus rule count:** The specification above contains exactly **46 retained active rule instances**.

---

## 5. Private-State Classification

I use a dominant uncertainty classification:
$$\text{PROVIDER\_PRIVATE} > \text{USER\_DECLARABLE} > \text{DYNAMIC\_EXTERNAL} > \text{DETERMINISTIC\_PUBLIC}$$

| Class | Rules | % | Meaning |
| :--- | :--- | :--- | :--- |
| **DETERMINISTIC_PUBLIC** | 26 | 56.5% | Public conditions + ordinary declared portfolio/context suffice |
| **USER_DECLARABLE** | 2 | 4.3% | Cineplanet requires declarable AMEX/Socio context |
| **DYNAMIC_EXTERNAL** | 16 | 34.8% | Stock/code availability may invalidate otherwise public rule |
| **PROVIDER_PRIVATE** | 2 | 4.3% | Qore status cannot safely be inferred |
| **Total** | **46** | **100%** | |

The two `PROVIDER_PRIVATE` rules are:
- Fridays Qore (`FR-QORE-01`);
- Villa Chicken Qore (`VC-QORE-01`).

*They remain useful as experimental VERIFY_FIRST fixtures but cannot participate in BEST_CONFIRMED_OPTION.*

- **Structurally encodable:** 46/46 (100%)
- **Safe eligibility/ranking without unknowable provider-private state:** 44/46 = **95.7%** (subject to real-time stock caveats).

---

## 6. Confirmed vs Total Overlap

### Total decision overlap
Includes provider-private VERIFY_FIRST options: 16/18 of the original 18 merchants contain at least a theoretical same-purchase decision relationship when private-state offers are allowed.

### Confirmed decision overlap
Requires safe comparison using public rules + reasonable user declarations:
$$\mathbf{14/18 = 77.8\%} \quad (\text{Exactly the pre-registered green threshold})$$

### Why the distinction matters
A user saying *“I have a BCP card”* does not prove *“I currently have the 50% Qore benefit activated.”*  
Therefore La Nacional cannot be counted as a confirmed BCP-vs-Diners comparison.  
The engine should say:
> *“Potential 50% Qore benefit — verify in your BCP app.”*  
*(not: “BCP wins”).*

---

## 7. O0–O4 Classification v2

### Confirmed classification of the original 18

| Merchant | Confirmed class | Additional total/private class |
| :--- | :--- | :--- |
| **Papa Johns** | O2 | — |
| **Chinawok** | O2 | — |
| **Don Belisario** | O1 | — |
| **Baco y Vaca** | O3 | — |
| **Granja Azul** | O3 | — |
| **Fridays** | O4-CONFIRMED | O4-VF through Qore |
| **UVK** | O4-CONFIRMED | — |
| **Popeyes** | O2 | — |
| **Cineplanet** | O2 | — |
| **Coney Park** | O2 | — |
| **Coney Active** | O2 | — |
| **Embarcadero 41** | O4-CONFIRMED | — |
| **Issei** | O2 | — |
| **Perroquet** | O4-CONFIRMED | — |
| **Pizza Hut** | O1 | private/non-equivalent options exist |
| **Villa Chicken** | O2 | VERIFY-FIRST Qore alternative |
| **La Bistecca** | O0 | O4-VF |
| **La Nacional** | O0 | O4-VF |

### Final 14 exclusive confirmed distribution
- **O2:** 8
- **O3:** 2
- **O4-CONFIRMED:** 4
- **O0/O1:** 0

*This is precisely the density needed for behavioral validation.*

---

## 8. Economic Scenario Recalculation

### Papa Johns
- Same relevant large-classic purchase: Plin S/13.90 vs BCP S/20.90.
- **Plin wins by S/7.**
- *Caveat:* The recommendation should compare actual promotional payable price, not trust differing regular price references.

### Chinawok
- A lo Pobre Chijaukay + drink: Plin S/15.90 vs Sip S/16.90.
- **Plin wins by S/1.** *(Both publish S/28.80 regular reference).*

### Baco y Vaca — S/150 eligible bill
- BCP: 20% → S/30; Sip: 20% → S/30; Diners: 20% → S/30; Interbank: 20% → S/30.
- **Tie.**
- At very high transaction values, `cap=UNKNOWN_NOT_STATED` for Interbank means: `NO SAFE HIGH-AMOUNT WINNER` until clarified.

### Granja Azul — S/200 eligible bill
- BCP, Interbank and Diners: $\min(0.20 \times 200, 70) = \text{S}/40$.
- **Three-way economic tie**, subject to branch/date eligibility.

### Fridays — S/200 food bill
- *Ordinary non-airport day:* Interbank S/50 vs Sip S/50 (Tie).
- *At international airport:* Sip excluded; Interbank included → **Interbank wins S/50 vs unavailable.**
- *On eligible holiday at normal branch:* Interbank excludes holidays; Sip has no holiday exclusion → **Sip wins by availability.**  
👉 *A genuine contextual switch.*

### UVK — two normal tickets
Let ordinary per-ticket price be $P$.
- Interbank 2×1: $\text{cost}_{\text{IBK}} = P$
- Diners fixed S/9.90: $\text{cost}_{\text{DIN}} = 19.80$
- **Switch point:** $P = \text{S}/19.80$.
  - $P = \text{S}/18$: IBK S/18 vs Diners S/19.80 → **IBK by S/1.80**.
  - $P = \text{S}/25$: Diners S/19.80 vs IBK S/25 → **Diners by S/5.20**.  
👉 *Textbook PagaMenos decision problem.*

### Popeyes — exact six-piece basket
- BCP: S/39.90 vs Sip: S/29.90.
- **Sip wins by S/10** (before considering stock).

### Cineplanet
- For equivalent eligible tickets: BCP AMEX 50% vs Interbank AMEX 50% → **Economic tie**.

### Coney Park & Active
- Coney Park: Sip pay S/45 → S/85 balance vs Diners pay S/45 → S/85 balance → **Tie** (*`NON_CASH_NOMINAL_VALUE`, not PEN cash saving*).
- Coney Active: Sip S/45 → S/85 vs Diners S/45 → S/86 → **Diners by S/1 nominal**.

### Embarcadero 41 — S/150 food
- *Weekday salon:* Diners 20% (S/30) vs Interbank 15% (S/22.50) → **Diners by S/7.50**.
- *Weekend or pickup:* Diners does not apply; Interbank does → **Interbank wins by availability**.

### Issei — S/120 eligible food
- Sip 50% (S/60) vs Diners 50% (S/60) → **Tie**.

### Perroquet
Let $F = \text{eligible food}$, $B = \text{eligible non-alcoholic drinks}$.
- BCP: $0.20(F + B)$
- Diners: $0.30F$
- Equality occurs at: $0.20(F + B) = 0.30F \implies \mathbf{B = 0.5F}$.
  - *Example A (Food S/100, Drinks S/20):* BCP S/24 vs Diners S/30 → **Diners by S/6**.
  - *Example B (Food S/100, Drinks S/60):* BCP S/32 vs Diners S/30 → **BCP by S/2**.  
👉 *Especially strong O4 basket-composition switch.*

### Villa Chicken
- Comparable whole-chicken + fries + drink basket: Interbank S/75.90 vs Diners S/80.90 → **Interbank by S/5**.
- Qore may outperform both but remains `VERIFY_FIRST`.

---

## 9. Decision-Switch Register v2

### Confirmed switches

| Merchant | Context A | Winner A | Context B | Winner B | Variable | Confirmed? | Difference |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **UVK** | 2 tickets, $P=\text{S}/18$ | Interbank | 2 tickets, $P=\text{S}/25$ | Diners | amount / base ticket price | **YES** | S/1.80 / S/5.20 |
| **Fridays** | Intl airport, normal day | Interbank | Holiday, ordinary Lima branch | Sip | location + holiday | **YES** | up to 25% / cap S/100 |
| **Embarcadero 41** | Weekday salon, S/150 | Diners | Weekend / pickup | Interbank | weekday / channel | **YES** | S/7.50 weekday example |
| **Perroquet** | F100 + B20 | Diners | F100 + B60 | BCP | basket composition | **YES** | S/6 vs S/2 |

### VERIFY-FIRST switches

| Merchant | Private condition | Impact |
| :--- | :--- | :--- |
| **Fridays** | active Qore 50% benefit | could replace 25% public winner |
| **Villa Chicken** | active Qore 50% | could materially alter best basket economics |

*These four confirmed cases become the most valuable acceptance-test fixtures.*

---

## 10. Portfolio Stress Tests

*Only v1 providers are used.*

| Portfolio | Merchants with $\ge 1$ offer | Confirmed O2+ | O4-C | Median provider alternatives / relevant merchant | Rules irrelevant | Private-state exposure |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **VP1 BCP + Interbank/Plin** | 11/14 | 4 | 0 | 2.0 | 20/46 = 43.5% | 2 Qore rules |
| **VP2 BCP + Sip** | 12/14 | 2 | 0 | 1.0 | 28/46 = 60.9% | 2 Qore |
| **VP3 BCP + Diners** | 14/14 | 3 | 1 | 1.0 | 24/46 = 52.2% | 2 Qore |
| **VP4 Interbank/Plin + Diners** | 14/14 | 5 | 2 | 1.0 | 18/46 = 39.1% | 0 |
| **VP5 Interbank/Plin + Sip + Diners** | 14/14 | 10 | 3 | 2.0 | 10/46 = 21.7% | 0 |
| **VP6 all four families** | 14/14 | 14 | 4 | 2.5 | 0% | 2/46 = 4.3% |

> **Critical inference for recruitment:** A generic *“has two payment methods”* is too weak. The actual corpus strongly favors **three independent benefit families**.

---

## 11. Wave-1 ICP Implications

### Wave-1 minimum portfolio qualification
The primary Wave-1 ICP should now require:
> **At least three independent eligibility families, with at least two drawn from BCP, Interbank/Plin, Sip/Oh! and Diners.**

- *Why three?* Two-family simulations yield only 2, 3, 4, or 5 confirmed O2+ merchants out of 14. The three-provider Interbank + Sip + Diners portfolio reaches **10/14 confirmed comparisons** (radically higher opportunity density).

### Limited admission exception
A participant with only two families may still enter a separately labeled secondary stratum if the pair is:
`Interbank/Plin + Diners` *(because that pair alone reaches five confirmed comparisons and two O4 cases)*.  
*Do not mix this stratum into the primary ICP denominator without reporting separately.*

---

## 12. Value Density

Using the selected 14-merchant universe:

| Portfolio | Merchants capable of meaningful confirmed comparison | Density |
| :--- | :--- | :--- |
| **BCP + Interbank** | 4/14 | 28.6% |
| **BCP + Sip** | 2/14 | 14.3% |
| **BCP + Diners** | 3/14 | 21.4% |
| **Interbank + Diners** | 5/14 | 35.7% |
| **Interbank + Sip + Diners** | 10/14 | 71.4% |
| **All four** | 14/14 | 100% |

*If a user visits a selected merchant, a three-provider portfolio is far more likely to create an actual decision problem than a generic two-instrument portfolio.*

---

## 13. Directory vs Decision Classification

After hardening:

- **DECISION-ENGINE-CORE — 7/14 = 50%:** Papa Johns, Chinawok, Fridays, UVK, Popeyes, Embarcadero 41, Perroquet. *(Clear ranking/computation or contextual winner).*
- **DECISION-ASSIST — 3/14 = 21.4%:** Granja Azul, Coney Active, Villa Chicken. *(Calculation helps, but incremental benefit over directory is smaller).*
- **DIRECTORY-SUFFICIENT — 4/14 = 28.6%:** Baco y Vaca, Cineplanet, Coney Park, Issei. *(Alternatives are largely equal economically).*

### Comparison with Corpus v0
- Broad v0 clear decision-engine value: ~43.8%
- **Hardened v1 CORE:** 50%
- **Hardened v1 CORE + ASSIST:** **71.4%**  
👉 *Substantial improvement in experimental signal density.*

---

## 14. Rebajitas Recheck

- **Current public state:** iOS version 1.0.3, Android recently updated. User selects affiliations; personalized “Para Ti”; search/filter; conditions/locations/favorites/used history/notifications/sharing. No account linking.

| Capability | Public evidence |
| :--- | :--- |
| Transaction amount input | Not observed |
| Cross-provider best-payment recommendation | Not observed |
| Net PEN saving comparison | Not observed |
| Minimum/cap-aware calculation | Not observed |
| Effective cost | Not observed |
| Ranked economic winner | Not observed |
| Reward valuation | Not observed |

> **Competitive status:** **WEDGE OPEN — HIGH THREAT** *(Not near parity)*. For the 7 DECISION-ENGINE-CORE merchants, PagaMenos is testing a computation layer Rebajitas does not publicly claim.

---

## 15. SOURCE RIGHTS REGISTER v1.2

*This is source-right issue spotting, not legal advice.*

| Provider | Exact source families used | v1 rules | Confirmed O2+ touched | O4-C touched | Current rights state | Replaceability |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Interbank / Plin** | `interbank.pe/promociones/*`, `/promociones/descuentos/plinpromos`, AMEX page | 16 | 9 | 3 | **REVIEW** | Medium |
| **Diners** | `dinersclubperu.pe/establecimientos/modo-tasty/*`, `/modo-fun/*` | 12 | 9 | 3 | **REVIEW** | Medium-low |
| **BCP / Qore** | `viabcp.com/beneficios/tarjetas/*`, `/qore/beneficios/*` | 10 | 6 | 1 | **REVIEW** | Medium |
| **Sip / Oh!** | `beneficios.sip.pe/promociones/*` | 8 | 7 | 1 | **PERMISSION_REQUIRED** | Medium |

- **Interbank:** Publicly accessible, no general Disallow. Status: REVIEW. Official “Sé un aliado” Open Banking page provides an outreach route.
- **BCP:** Public promotion pages detailed. Status: REVIEW. Official Partnerships BCP programme expressly intended to connect startups with BCP.
- **Diners:** Detailed public pages. Status: REVIEW.
- **Sip:** Digital terms explicitly include Web Beneficios Sip and reserve exploitation/transformation rights. Status: **PERMISSION_REQUIRED**.

> **Production-clearance status:** 0/4 families CLEARED. This remains a production blocker; it is not a reason to stop a limited private validation build.

---

## 16. Validation vs Production Rights

### Validation use (Private Study)
Deliberately limited:
- 30–50 research participants;
- no public mass catalogue;
- no monetization;
- no original advertising imagery;
- no full T&C republication;
- only normalized factual fields;
- source attribution/link;
- source snapshots used internally only as necessary for QA.

*Residual risk: REVIEW required.*

### Production use
Before public App Store deployment, scalable crawling, or monetization: PagaMenos must have provider-specific legal review, written permission, or licensed feeds.

---

## 17. Permission Outreach Register

| Provider | Route | Function targeted | Material to send | Permission requested | Priority | Blocking |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Interbank** | Official Open Banking / “Sé un aliado” | Alliances / Open Banking / benefits | 1-page research brief + 14-merchant scope | periodic retrieval + normalized factual display + attribution | 1 | Production |
| **Diners** | Official Diners corporate route → Marketing/Alianzas | Modo Tasty / Modo Fun owner | same | use of campaign facts and ideally simple feed | 2 | Production |
| **BCP** | Official Partnerships BCP | Partnerships → loyalty/benefits | research brief + prototype later | normalized use, attribution, pilot/feed discussion | 3 | Production |
| **Sip** | Official Sip channels → Alianzas/Beneficios/Marketing | Web Beneficios owner | source-right request referencing limited private study | explicit written research/commercial permission | 4 (legally urgent) | Highest rights blocker |

---

## 18. Provider Removal Test v2

*Baseline: confirmed O2+: 14, O4-CONFIRMED: 4.*

| Remove | Confirmed O2+ remaining | O4-C remaining | Interpretation |
| :--- | :--- | :--- | :--- |
| **BCP** | 10 | 3 | Still highly testable |
| **Interbank/Plin** | 7 | 1 | Major degradation |
| **Sip** | 8 | 3 | Still testable, lower density |
| **Diners** | 7 | 1 | Major degradation |

> **Key takeaway:** Interbank and Diners are the two most structurally important families, but **removing any one provider does not reduce the corpus to zero or destroy every decision case.** (PASS on single-institution failure).

---

## 19. Three-Provider Test v2

| Combination | Confirmed O2+ | O4-C | Assessment |
| :--- | :--- | :--- | :--- |
| **Interbank + Sip + Diners** | 10 | 3 | Best raw overlap |
| **BCP + Interbank + Diners** | 8 | 3 | **Best source-risk-adjusted** |
| **BCP + Interbank + Sip** | 7 | 1 | Weaker |
| **BCP + Sip + Diners** | 7 | 1 | Weaker |

*PagaMenos's central computational hypothesis remains testable without Sip (BCP + Interbank + Diners yields 8 O2+ and 3 O4-C).*

---

## 20. Source-Risk Adjusted Corpus

### Corpus v1-A — Full Research Corpus
- 14 merchants, 46 rules, 4 providers, 14 confirmed O2+, 4 O4-CONFIRMED, 2 provider-private rules, 7 DECISION-ENGINE-CORE merchants.
- **Rights exposure:** REVIEW = 38 rules (82.6%), PERMISSION_REQUIRED = 8 rules (17.4%), CLEARED = 0.

### Corpus v1-B — Conservative (Sip excluded)
- 14 merchants still represented, 38 rules, 3 provider families, 8 confirmed O2+, 3 O4-CONFIRMED, no dependency on Sip content.
- *Adequate for Wave-0 usability and core rules testing.*

---

## 21. Independent QA Findings

- **QA-01 — Sip Cineplanet stale/contradictory discovery:** Primary page says S/9.90 promotion ended 26 August. → *Action: rule removed (`search result != source truth`).*
- **QA-02 — Separate Sip Cineplanet campaign conflict:** Disagreement between headline/terms around expiry. → *Action: quarantined.*
- **QA-03 — Villa Chicken Interbank end-date discrepancy:** 30 vs 31 December mismatch. → *Action: use stricter 30 December date and lower rule confidence.*
- **QA-04 — Baco Interbank missing cap:** Interbank page does not state a cap. → *Action: `cap=UNKNOWN_NOT_STATED`. At values where cap affects ranking: `NO SAFE WINNER` (do not infer infinity).*
- **QA-05 — BCP “No Disponible” badge vs active campaign dates:** Badge present while campaign dates current. → *Action: separate `campaign_active` from `context_actionable_now`.*
- **QA-06 — Coney duplication risk:** One Sip campaign applies to both Coney Park and Coney Active. → *Action: one campaign rule with two merchant scopes.*
- **QA-07 — Provider-private Qore:** Qore eligibility is user-specific. → *Action: never infer eligibility from owning BCP.*

*Post-QA material error count: All identified material issues resolved. No known RC5 remains actionable.*

---

## 22. Final Wave-0 Corpus Specification

### Composition

| Attribute | Final |
| :--- | :--- |
| **Merchants** | 14 |
| **Active rules** | 46 |
| **Provider families** | 4 |
| **Food merchants** | 10 |
| **Entertainment merchants** | 4 |
| **Confirmed O2** | 8 |
| **Confirmed O3** | 2 |
| **O4-CONFIRMED** | 4 |
| **O4-VERIFY-FIRST overlays** | 2 private-state candidates (Fridays, Villa Chicken) |
| **DECISION-ENGINE-CORE** | 7 / 14 = 50% |
| **CORE + ASSIST** | 10 / 14 = 71.4% |

### Rule complexity

| Class | N | % |
| :--- | :--- | :--- |
| **RC1 simple** | 4 | 8.7% |
| **RC2 moderate** | 28 | 60.9% |
| **RC3 complex but representable** | 12 | 26.1% |
| **RC4 private-state dependent** | 2 | 4.3% |
| **RC5 ambiguous/conflicted actionable** | 0 | 0% |

- **Structurally representable:** 46/46 (100%)
- **Safely runtime-evaluable without provider-private interpretation:** 44/46 = 95.7%
- **Private-state rate:** 2/46 = 4.3%

---

## 23. Experimental Freeze Rules

- **Freeze timestamp:** `2026-08-30T18:00:00-05:00`
- **Dataset identifier:** `PAGAMENOS_VALIDATION_CORPUS_v1_2026-08-30T1800-0500`

### Frozen scope
- **Merchants:** Exactly the 14 named in Section 2.
- **Providers:** BCP/Qore, Interbank/Plin, Sip/Oh!, Diners.
- **Categories:** food-away-from-home, cinema/entertainment.

### Allowed operational changes
During Wave 0/Wave 1: official campaign expiry; updated dates; cap/minimum correction; changed channel/location; stock exhaustion; source removal; source inaccessibility; confidence downgrade; factual extraction correction. *(These change rule state, not experiment scope).*

### New campaigns
Placed in `v1-next-candidate`. Never silently activated for an already-running cohort.

---

## 24. Change Log Specification

Every post-freeze mutation creates:

| Field | Requirement |
| :--- | :--- |
| `rule_id` | immutable |
| `rule_version_old` | previous version |
| `rule_version_new` | resulting version |
| `field_changed` | exact field(s) |
| `old_value` | value before |
| `new_value` | new official value |
| `source_url` | supporting primary source |
| `detected_at` | machine/research detection timestamp |
| `corrected_at` | corpus update timestamp |
| `detection_method` | monitor / audit / user report |
| `change_reason` | official change / parsing correction / expiry / removal |
| `material_to_decision` | yes/no |
| `old_winner` | if applicable |
| `new_winner` | if applicable |
| `participants_exposed` | affected participant IDs/pseudonyms |
| `retroactive_impact` | none / possible / confirmed |
| `reviewer` | audit identifier |

---

## 25. Prototype Fixture Set

*These should become deterministic acceptance tests before Wave 0:*

1. **FIX-01 — Simple exact winner (Chinawok):** A lo Pobre Chijaukay + drink. Plin S/15.90 vs Sip S/16.90 → **Plin wins by S/1**.
2. **FIX-02 — Material fixed-price winner (Popeyes):** 6 pieces + family potato. Sip S/29.90 vs BCP S/39.90 → **Sip wins by S/10**.
3. **FIX-03 — Economic tie (Baco y Vaca):** S/150 eligible bill. 20% providers $\approx \text{S}/30$ saving → **No arbitrary winner (Tie)**.
4. **FIX-04 — Unknown-cap refusal:** Large Baco purchase where unknown Interbank cap could determine result → **`NO SAFE WINNER` / `INSUFFICIENT INFORMATION`**.
5. **FIX-05 — Amount switch (UVK):** Two tickets: $P=\text{S}/18 \implies \text{Interbank}$; $P=\text{S}/25 \implies \text{Diners}$.
6. **FIX-06 — Day/channel switch (Embarcadero 41):** S/150: weekday salon $\implies$ Diners S/30 vs IBK S/22.50; weekend/pickup $\implies$ Interbank.
7. **FIX-07 — Basket switch (Perroquet):** F100+B20 $\implies$ Diners; F100+B60 $\implies$ BCP.
8. **FIX-08 — Location/calendar switch (Fridays):** Intl airport normal day $\implies$ Interbank; Holiday normal Lima branch $\implies$ Sip.
9. **FIX-09 — Private eligibility (Fridays):** User with BCP answers Qore status = `UNKNOWN` $\implies$ Public option ranked; Qore appears as `VERIFY_FIRST` (never `BEST_CONFIRMED`).
10. **FIX-10 — Quarantine (Cineplanet Sip):** Conflicted/expired record never enters candidate set.
11. **FIX-11 — Non-cash nominal value (Coney Park):** S/45 $\to$ S/85 nominal value $\implies$ Tie; do not report as PEN cash saved.
12. **FIX-12 — Dynamic stock (Popeyes/Sip):** If stock exhausted, rule moves out of confirmed candidates; audit trail preserved.

---

## 26. Behavioral Prototype Build Contract

### Inputs
- canonical merchant;
- branch/location when relevant;
- purchase date/time;
- channel: salon; takeaway; delivery; app/web; box office;
- transaction amount;
- product/basket selection where fixed-SKU rules exist;
- user's provider/instrument families;
- card/network/tier where relevant;
- declarable membership status;
- private-state answer: `YES`, `NO`, `UNKNOWN`.
*(No card numbers or credentials).*

### Outputs
- all contextually relevant candidate rules;
- safely eligible options;
- uncertain options separately;
- expected PEN saving where genuinely comparable;
- effective payable price where derivable;
- winner; second-best; difference;
- critical conditions; redemption instructions;
- confidence; source; source check timestamp.

### Decision states
`BEST_CONFIRMED`, `CONFIRMED_TIE`, `LIKELY`, `VERIFY_FIRST`, `NO_SAFE_WINNER`, `NO_APPLICABLE_BENEFIT`, `SOURCE_STALE`, `SOURCE_CONFLICT`.

### Required calculations
percentage discount; maximum cap; minimum spend; fixed discount; fixed promotional price; 2×1; fixed bundles; eligible-subtotal calculations; product exclusions; weekday/date/time; branch/geography; channel; use limits; user-declarable eligibility; provider-private uncertainty; non-cash nominal benefits without forced PEN conversion. *(No ML required).*

### Required events
`merchant_selected`, `purchase_intent_declared`, `instrument_selected`, `decision_computed`, `actionable_recommendation_returned`, `no_actionable_recommendation`, `recommendation_viewed`, `evidence_viewed`, `recommendation_intended`, `recommendation_attempted`, `saving_reported`, `saving_verified`, `recommendation_failed`, `offer_stale_reported`, `research_contact_exposure`.

### Required admin & source-monitor capabilities
- Inspect 46-rule corpus, activate/quarantine/expire, edit normalization, view source, verify evidence, inspect waves.
- For the 4 source families: periodic retrieval, fingerprinting, expiry recognition, change alert, review queue, stale-state handling.

---

## 27. Final Gate Assessment

### NARROWED CORPUS GREEN
The corpus now satisfies the pre-build gate.

**The decisive evidence is:**
1. 14/18 original candidates survive confirmed same-purchase overlap (retained universe is 14/14 O2+ by construction).
2. Exactly 4 O4-CONFIRMED merchants survive without relying on provider-private eligibility (Fridays, UVK, Embarcadero 41, Perroquet) across 4 distinct mechanisms.
3. Four provider families materially participate.
4. Rules are overwhelmingly structured (44/46 safely evaluable without provider-private state; private-state dependence is only 4.3%).
5. No RC5/conflicted rule remains actionable.
6. Removing Sip leaves 38 rules, 8 confirmed O2+ and 3 O4-C across 3 providers.
7. Decision-engine signal density is high (50% CORE, 71.4% CORE+ASSIST).
8. Rebajitas remains a directory competitor without publicly documented transaction-value economic ranking.

> **Most importantly:** We no longer need another conceptual research report to decide whether a prototype is justified. The corpus has done its job. There are now enough real situations where a calculation engine can succeed or fail in front of real users.

---

## 28. Immediate Next Action

Proceed directly to:
> **PAGAMENOS — PHASE 0A-2: VALIDATION SYSTEM IMPLEMENTATION PLAN**

### Immutable inputs for Phase 0A-2:
- **Dataset:** `PAGAMENOS_VALIDATION_CORPUS_v1_2026-08-30T1800-0500`
- **Scope:** 14 merchants, 46 rules, 4 provider families (10 food, 4 entertainment).
- **Core decision fixtures:** Fridays, UVK, Embarcadero 41, Perroquet.
- **Primary Wave-1 recruitment requirement:** $\ge 3$ independent benefit families, with at least two represented by the v1 provider corpus.
- **Build objective:** Build the smallest responsive behavioral-validation system capable of turning a genuine merchant/purchase context plus a declared eligibility portfolio into a deterministic, auditable `BEST_CONFIRMED`, `VERIFY_FIRST`, tie or refusal result—and measuring whether users independently return and realize verified savings.

> **Validation boundary:** No production architecture is authorized yet. No native mobile app is authorized yet. No large ingestion platform is authorized yet. No nationwide catalogue is authorized yet.  
> *The next software exists for one purpose: to determine whether the real decision problems now proven to exist in the data become repeated human behavior.*

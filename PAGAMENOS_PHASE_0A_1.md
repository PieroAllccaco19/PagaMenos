# PAGAMENOS — PHASE 0A-1
## VALIDATION CORPUS RESEARCH & SOURCE RIGHTS REGISTER v1.1

**Research cutoff:** 30 August 2026  
**Current decision state:** CORPUS NARROW. Deep verification required before prototype build.

---

## 1. Executive Corpus Decision

### CORPUS NARROW
La investigación encontró el fenómeno que PagaMenos necesita, pero no con suficiente densidad y limpieza en el universo amplio de 32 comercios como para congelar inmediatamente un dataset Wave-1.

El resultado cuantitativo central es:

| Resultado | Corpus v0 |
| :--- | :--- |
| **Ofertas/reglas activas retenidas** | 86 |
| **Comercios** | 32 |
| **Proveedores core** | 4 |
| **Food** | 67 / 86 = 77.9% |
| **Entertainment** | 19 / 86 = 22.1% |
| **Comercios con ≥2 familias proveedoras** | 22 / 32 = 68.8% |
| **Comercios con ≥3 familias proveedoras** | 7 / 32 = 21.9% |
| **O2 — overlap real** | 7 |
| **O3 — overlap fuerte** | 2 |
| **O4 — decisión contextual** | 10 |
| **O2+ bruto** | 19 / 32 = 59.4% |
| **O2+ confirmado sin depender exclusivamente de estado privado** | 14 / 32 = 43.8% |
| **Comercios con claro DECISION_ENGINE_VALUE** | 14 / 32 = 43.8% |

Por tanto, el umbral previo de $\ge 20$ merchants con alternativas realmente competidoras no se alcanza bajo una definición estricta de “misma compra”.

### Señales clave
- **La señal positiva es más importante de lo que ese 19/32 podría sugerir:** encontramos casos reales donde monto, día, canal, instrumento o estado de elegibilidad cambian el ganador, por ejemplo TGI Fridays, Cineplanet, UVK, Embarcadero 41, Perroquet, Pizza Hut y Villa Chicken. Ahí PagaMenos sí hace un trabajo sustancialmente distinto al de un directorio. Las fuentes oficiales muestran, por ejemplo, 25% en Fridays con Interbank, 50% en Cineplanet con AMEX BCP y múltiples beneficios UVK diferentes según producto/formato con Diners. [Interbank](https://interbank.pe/promociones/fridays)
- **La señal negativa más importante es doble:**
  1. 18/32 comercios aportan poco o ningún diferencial contra un directorio personalizado.
  2. 0% del corpus está jurídicamente “CLEARED” para producción comercial. Tres familias quedan REVIEW; Sip debe tratarse como PERMISSION REQUIRED porque sus términos atribuyen a la empresa derechos de explotación, publicación, reproducción, distribución y transformación de contenidos y expresamente indican que el mero uso no concede licencia para otros fines. [cms.sip.pe](https://cms.sip.pe/wp-content/documentos/terminos-condiciones/TyC-Canales-digitales.pdf)

> **Mi decisión, por tanto, es:**  
> PagaMenos sí existe en los datos reales, pero el experimento debe estrecharse a aproximadamente **18 comercios decision-dense y ~62 reglas** antes de desarrollar el prototipo.

---

## 2. Research Method

- **Fecha de observación:** 30 de agosto de 2026.
- **Fuentes primarias de:**
  - Interbank / Plin Interbank;
  - BCP / Qore;
  - Sip / Oh!;
  - Diners Club.
- **Se utilizaron:** catálogos oficiales; páginas individuales; T&C visibles; términos legales; robots.txt cuando pudo verificarse; páginas oficiales de contacto/partnerships.

*Ejemplos del nivel de detalle utilizado: Plin publica actualmente para Chinawok precio promocional, precio regular, fechas, stock, canales, tiendas excluidas, cantidad por usuario y combinabilidad; BCP hace lo equivalente con sus promociones individuales. [Interbank](https://interbank.pe/promociones/descuentos/plinpromos)*

### Regla temporal
Clasifiqué: `ACTIVE`, `FUTURE`, `EXPIRED`, `CONFLICTED`, `UNCLEAR`.  
*Sólo `ACTIVE` entra en las 86 reglas.*

### Regla de overlap
No conté dos promociones en el mismo merchant como overlap automáticamente. Exigí que pudieran competir razonablemente por la misma intención de compra. *(Una pizza hawaiana específica y un PapaBox son dos ofertas de Papa Johns, pero no necesariamente son dos alternativas para la misma cesta).*

### Limitación importante
Las 86 instancias están respaldadas por fuentes oficiales a nivel de campaña/catálogo, pero no todas las 86 recibieron en esta pasada una segunda auditoría individual independiente de página-detail. Algunas entradas Sip/Diners provienen de catálogos oficiales vigentes, no de una apertura individual completa.

**Consecuencia:**  
Corpus v0 sirve para decidir el alcance; todavía no debe convertirse directamente en Wave-1 Locked Dataset. Ese es uno de los motivos para CORPUS NARROW.

---

## 3. Merchant Candidate Universe

Evalué 40 candidatos.

### Retenidos en v0
- **Food:** Papa Johns, Chinawok, KFC, Bembos, Don Belisario, Pizza Hut, Burger King, Granja Azul, Baco y Vaca, Embarcadero 41, TGI Fridays, Villa Chicken, Popeyes, La Cabrera, La Bistecca, La Nacional, La Vaca Loca, Edo Sushi Bar, Isushi, Perroquet, Dunkin, Issei Cocina Nikkei, GYU, La Carreta.
- **Entertainment:** Cineplanet, UVK Multicines, Coney Park, Coney Active, Fun Jungle, Rally Kart, Jump Spot, RF Karting.

### Screened out
Chili's, Madam Tusan, Roky's, Norky's, Carnica, Sabores Peruanos, Cinépolis y Cine Star.  
*(No significa que no tengan beneficios; significa que no encontré suficiente overlap actual y verificable para que mejoraran el experimento).*

*Un ejemplo temporal importante: Plin ya muestra campañas que comienzan en septiembre; esas ofertas son FUTURE al 30 de agosto y no se cuentan como activas. La propia página de Plin muestra esta coexistencia de campañas presentes y futuras. [Interbank](https://interbank.pe/promociones/descuentos/plinpromos)*

---

## 4. Merchant Selection Scoring

### Pesos fijados

| Factor | Peso |
| :--- | :--- |
| **M1 Visit likelihood** | 20% |
| **M2 Offer count** | 15% |
| **M3 Provider diversity** | 20% |
| **M4 Economic significance** | 15% |
| **M5 Rule diversity** | 10% |
| **M6 Geographic relevance** | 10% |
| **M7 Validation usefulness** | 10% |

*Escala 1–5. M2/M3 se apoyan directamente en corpus; M1/M4/M5/M6/M7 contienen juicio analítico explícito y no deben interpretarse como estadísticas de mercado.*

### Scoring Table

| Merchant | M1 | M2 | M3 | M4 | M5 | M6 | M7 | Score |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Don Belisario** | 5 | 5 | 4 | 5 | 4 | 5 | 3 | **4.50** |
| **Papa Johns** | 5 | 5 | 4 | 5 | 4 | 5 | 3 | **4.50** |
| **Pizza Hut** | 5 | 4 | 3 | 5 | 5 | 5 | 5 | **4.45** |
| **Chinawok** | 5 | 4 | 4 | 5 | 4 | 5 | 3 | **4.35** |
| **UVK** | 4 | 5 | 3 | 5 | 5 | 4 | 5 | **4.30** |
| **Fridays** | 4 | 3 | 4 | 5 | 5 | 4 | 5 | **4.20** |
| **Cineplanet** | 5 | 2 | 3 | 5 | 5 | 5 | 5 | **4.15** |
| **Villa Chicken** | 4 | 3 | 3 | 5 | 5 | 4 | 5 | **4.00** |
| **Popeyes** | 5 | 3 | 3 | 5 | 4 | 5 | 3 | **4.00** |
| **Baco y Vaca** | 3 | 4 | 5 | 4 | 4 | 3 | 4 | **3.90** |
| **KFC** | 5 | 3 | 4 | 4 | 3 | 5 | 2 | **3.85** |
| **La Nacional** | 4 | 2 | 3 | 5 | 5 | 4 | 5 | **3.85** |
| **La Bistecca** | 3 | 2 | 3 | 5 | 5 | 3 | 5 | **3.55** |
| **Granja Azul** | 3 | 3 | 4 | 4 | 4 | 3 | 4 | **3.55** |
| **Isushi** | 4 | 4 | 3 | 4 | 3 | 4 | 2 | **3.50** |

*El resto cae progresivamente porque pierde provider diversity o validation usefulness.*

> **Insight clave:** KFC puede ser comercialmente muchísimo más frecuente que Embarcadero 41, pero hoy KFC es peor merchant experimental porque las ofertas observadas corresponden a bundles distintos y producen menos comparación limpia.

---

## 5. Final Merchant Universe

### Corpus v0 — 32 merchants

| Merchant | BCP | Diners | IBK/Plin | Sip | Offers | Providers |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Baco y Vaca** | 1 | 1 | 1 | 1 | 4 | 4 |
| **Don Belisario** | 1 | 0 | 3 | 3 | 7 | 3 |
| **Papa Johns** | 3 | 0 | 3 | 1 | 7 | 3 |
| **Chinawok** | 2 | 0 | 1 | 1 | 4 | 3 |
| **Granja Azul** | 1 | 1 | 1 | 0 | 3 | 3 |
| **KFC** | 1 | 0 | 1 | 1 | 3 | 3 |
| **Fridays** | 1 | 0 | 1 | 1 | 3 | 3 |
| **UVK** | 0 | 5 | 2 | 0 | 7 | 2 |
| **Pizza Hut** | 2 | 0 | 3 | 0 | 5 | 2 |
| **Isushi** | 2 | 0 | 0 | 2 | 4 | 2 |
| **Popeyes** | 1 | 0 | 0 | 2 | 3 | 2 |
| **Villa Chicken** | 1 | 0 | 2 | 0 | 3 | 2 |
| **Cineplanet** | 1 | 0 | 0 | 1 | 2 | 2 |
| **Coney Active** | 0 | 1 | 0 | 1 | 2 | 2 |
| **Coney Park** | 0 | 1 | 0 | 1 | 2 | 2 |
| **Edo Sushi Bar** | 1 | 1 | 0 | 0 | 2 | 2 |
| **Embarcadero 41** | 0 | 1 | 1 | 0 | 2 | 2 |
| **Fun Jungle** | 0 | 1 | 0 | 1 | 2 | 2 |
| **Issei** | 0 | 1 | 0 | 1 | 2 | 2 |
| **La Bistecca** | 1 | 1 | 0 | 0 | 2 | 2 |
| **La Nacional** | 1 | 1 | 0 | 0 | 2 | 2 |
| **Perroquet** | 1 | 1 | 0 | 0 | 2 | 2 |
| **Burger King** | 0 | 0 | 3 | 0 | 3 | 1 |
| **Rally Kart** | 0 | 0 | 0 | 2 | 2 | 1 |
| **Bembos** | 0 | 0 | 1 | 0 | 1 | 1 |
| **Dunkin** | 0 | 0 | 0 | 1 | 1 | 1 |
| **GYU** | 0 | 1 | 0 | 0 | 1 | 1 |
| **Jump Spot** | 0 | 1 | 0 | 0 | 1 | 1 |
| **La Cabrera** | 1 | 0 | 0 | 0 | 1 | 1 |
| **La Carreta** | 0 | 1 | 0 | 0 | 1 | 1 |
| **La Vaca Loca** | 1 | 0 | 0 | 0 | 1 | 1 |
| **RF Karting** | 0 | 1 | 0 | 0 | 1 | 1 |

---

## 6. Validation Corpus v0 Overview

**86 current retained offer/rule instances**  
*No forcé 120–180. La página de Plin demuestra por qué: contiene campañas activas, vencidas y futuras en un mismo documento; inflar el dataset simplemente extrayendo todas produciría falsa densidad. [Interbank](https://interbank.pe/promociones/descuentos/plinpromos)*

### Representative normalized records

#### `PM-IBK-PJ-01`
- **provider:** Interbank
- **family:** Plin
- **merchant:** Papa Johns
- **benefit:** fixed price (promo: S/13.90, regular: S/27.90, saving: S/14.00)
- **product:** large Americana/Pepperoni
- **channel:** salon/takeaway
- **dates:** 2026-07-01 → 2026-09-30
- **daily limit:** 2
- **holidays:** excluded
- **QR:** required
- **combinability:** no
- **source confidence:** HIGH
- **observed:** 2026-08-30. [Interbank](https://interbank.pe/promociones/descuentos/plinpromos)

#### `PM-BCP-GRANJA-01`
- **provider:** BCP (credit/debit)
- **merchant:** Granja Azul
- **benefit:** 20% discount (cap S/70)
- **channel:** salon
- **branch-specific weekdays:** yes
- **exclusions:** numerous SKU exclusions, not holidays
- **dates:** 2026-07-01 → 2026-09-30
- **condition:** request before bill
- **confidence:** HIGH. [Viabcp](https://www.viabcp.com/beneficios/tarjetas/granja-azul)

#### `PM-BCP-POPEYES-01`
- **provider:** BCP (credit/debit)
- **merchant:** Popeyes
- **benefit:** S/39.90 (regular S/69.90)
- **product:** six chicken pieces + family potatoes
- **channel:** salon/takeaway
- **limits:** max 1/user, stock 500
- **exclusions:** no holidays
- **dates:** 2026-07-01 → 2026-09-30. [Viabcp](https://www.viabcp.com/beneficios/tarjetas/popeyes)

#### `PM-BCP-CINE-01`
- **provider:** BCP (AMEX)
- **merchant:** Cineplanet
- **benefit:** 50% discount (2D/Prime/3D/Xtreme/ScreenX)
- **channel:** online/app
- **limits:** maximum two codes/day
- **dates:** 2026-08-15 → 2027-08-15
- **exclusions:** premieres/promotional dates
- **confidence:** HIGH. [Viabcp](https://www.viabcp.com/beneficios/tarjetas/cineplanet-exclusivo)

*Estos ejemplos muestran que el esquema solicitado sí representa datos reales, no una taxonomía inventada a priori.*

---

## 7. Provider Distribution

| Family | Offers | Share |
| :--- | :--- | :--- |
| **BCP / Qore** | 23 | 26.7% |
| **Interbank / Plin** | 23 | 26.7% |
| **Diners** | 20 | 23.3% |
| **Sip / Oh!** | 20 | 23.3% |
| **Total** | **86** | **100%** |

*La distribución es deliberadamente balanceada. No confundí BCP y Qore como proveedores independientes, ni Interbank y Plin Interbank como ecosistemas completamente independientes, ni Sip/Oh! como dos proveedores distintos (eso habría inflado artificialmente M3).*

---

## 8. Category Distribution

| Category | Offers | Share |
| :--- | :--- | :--- |
| **Restaurants / food** | 67 | 77.9% |
| **Cinema / entertainment** | 19 | 22.1% |

**Por merchants:**
- food: 24/32 = 75%;
- entertainment: 8/32 = 25%.

*Por tanto el corpus cumple exactamente el rango 70–80% / 20–30%.*

---

## 9. Merchant Overlap Analysis

La cifra superficial es positiva: **22/32 merchants (68.8%)** tienen al menos dos familias proveedoras.  
Pero al aplicar same-purchase overlap:
- **19/32 (59.4%)** tienen O2+.
- Y al eliminar situaciones donde una alternativa esencial depende de estado privado que PagaMenos no puede verificar: aproximadamente **14/32 (43.8%)** mantienen overlap confirmado suficientemente limpio.

### Ejemplos
- **Chinawok:** Plin ofrece A lo Pobre Chijaukay + gaseosa a S/15.90 frente a S/28.80. Sip ofrece prácticamente la misma compra a S/16.90 frente a S/28.80. *Ese es un comparison problem real. [Interbank](https://interbank.pe/promociones/descuentos/plinpromos)*
- **Granja Azul:** BCP, Interbank y Diners producen múltiples alternativas, pero buena parte de la economía converge alrededor de 20%; PagaMenos ayuda más con elegibilidad que con matemática. BCP tiene 20% hasta S/70 y múltiples restricciones. [Viabcp](https://www.viabcp.com/beneficios/tarjetas/granja-azul)
- **Cineplanet:** AMEX BCP ofrece 50% sobre varios formatos mientras Sip presenta beneficios de precio fijo/2D con otras restricciones; formato, día y precio base pueden cambiar la recomendación. [Viabcp](https://www.viabcp.com/beneficios/tarjetas/cineplanet-exclusivo)

---

## 10. O0–O4 Classification

- **O0 (10):** Bembos, Burger King, Dunkin, GYU, Jump Spot, La Cabrera, La Carreta, La Vaca Loca, Rally Kart, RF Karting.
- **O1 (3):** KFC, Isushi, Fun Jungle. *(La razón típica: provider overlap sí; comparable-basket overlap no).*
- **O2 (7):** Papa Johns, Chinawok, Don Belisario, Popeyes, Coney Park, Coney Active, Issei.
- **O3 (2):** Baco y Vaca, Granja Azul.
- **O4 (10):** TGI Fridays, UVK Multicines, Pizza Hut, Villa Chicken, Cineplanet, Edo Sushi Bar, Embarcadero 41, La Bistecca, La Nacional, Perroquet.

| Level | N | % |
| :--- | :--- | :--- |
| **O0** | 10 | 31.3% |
| **O1** | 3 | 9.4% |
| **O2** | 7 | 21.9% |
| **O3** | 2 | 6.3% |
| **O4** | 10 | 31.3% |

> **Nota crítica:** Seis O4 contienen una dependencia importante de Qore/private state (Fridays, Pizza Hut, Villa Chicken, Edo, La Bistecca, La Nacional). Esos casos deben mostrar `VERIFY_FIRST`, no un ganador confirmado.

---

## 11. Economic Comparison Analysis

### Chinawok — exact same-product comparison
- **Plin:** regular S/28.80; Paga S/15.90; saving = S/12.90.
- **Sip:** regular S/28.80; Paga S/16.90; saving = S/11.90.
- **Ganador para esa compra concreta:** Plin por S/1.00.
*(Plin tiene además restricciones de canal/locales/stock que deben entrar en elegibilidad. [Interbank](https://interbank.pe/promociones/descuentos/plinpromos))*

### Popeyes
- **BCP:** regular S/69.90; promo S/39.90; saving S/30. [Viabcp](https://www.viabcp.com/beneficios/tarjetas/popeyes)
- **Sip:** la promo equivalente detectada en Sip ofrece el mismo núcleo de seis piezas + papa familiar a S/29.90.
- **En esa compra:** Sip produce aproximadamente S/40 frente a S/30 BCP.  
👉 *Ese es exactamente el tipo de respuesta que PagaMenos debe producir.*

### Granja Azul
Con BCP:
$$\text{saving} = \min(\text{amount} \times 0.20, 70)$$

| Bill | BCP saving |
| :--- | :--- |
| S/50 | S/10 |
| S/100 | S/20 |
| S/150 | S/30 |
| S/200 | S/40 |
| S/300 | S/60 |

*El cap sólo empieza a afectar después de S/350. La complejidad real aquí no es aritmética: son sucursal, día, producto y canal. [Viabcp](https://www.viabcp.com/beneficios/tarjetas/granja-azul)*

### Fridays
- **Interbank:** $\text{saving} = \min(\text{amount} \times 0.25, \text{cap})$. El catálogo confirma 25%. [Interbank](https://interbank.pe/promociones/fridays)
- Si el usuario además pertenece a un tier Qore elegible con una promoción 50%, la recomendación cambia radicalmente.
- *Eso prueba que: user portfolio / private eligibility puede importar más que merchant discovery.*

### Cineplanet
- **BCP AMEX:** $\text{cost} = 0.5 \times \text{regular\_ticket\_price}$ para formatos elegibles. [Viabcp](https://www.viabcp.com/beneficios/tarjetas/cineplanet-exclusivo)
- **Sip:** dispone de ofertas de precio fijo en determinados contextos.
- El precio de indiferencia frente a un ticket fijo S/9.90 sería:
$$0.5P = 9.90 \implies P = 19.80$$
- Por encima de S/19.80, el precio fijo sería económicamente inferior si ambas promociones aplicaran exactamente al mismo ticket/contexto. *(Esa condición final es esencial).*

---

## 12. Decision-Switch Register

| Merchant | Switch | Mechanism | Decision value |
| :--- | :--- | :--- | :--- |
| **Fridays** | Portfolio/private state | 25% vs potencial 50% Qore | Very high |
| **Pizza Hut** | Product + min spend + Qore | fixed-price Plin vs % carta | Very high |
| **Villa Chicken** | Portfolio + product | fixed bundles vs Qore % | High |
| **UVK** | Product/format/channel | 2x1, combo %, fixed tickets, restobar | Very high |
| **Cineplanet** | Day/format/base price | fixed price vs 50% | Very high |
| **Embarcadero 41** | Day/holiday/channel | Diners 20% vs IBK 15% | High |
| **Perroquet** | Basket composition | 30% food-only vs BCP conditions incl. non-alcoholic | High |
| **Edo** | Channel/private eligibility | delivery applicability differs | High |
| **La Bistecca** | Private eligibility | Diners 25% vs Qore 50% | High conditional |
| **La Nacional** | Private eligibility/date | 20% vs potential 50% | High conditional |

*Embarcadero 41 es especialmente limpio: Interbank publica 15% y vigencia hasta diciembre; el beneficio Diners observado aporta otra tasa y restricciones de días/canal. [Interbank](https://interbank.pe/promociones/embarcadero-41)*  
*UVK también es claramente no-directorio: Diners publica simultáneamente 20% en combo, 20% restobar, 20% ópera y tickets a precios fijos en distintas sedes. [Diners Club Peru](https://dinersclubperu.pe/establecimientos/modo-fun/categoria/cines)*

---

## 13. Economic Value Distribution

No existe una forma rigurosa de calcular “median saving de las 86 ofertas” porque:
- varias son non-cash;
- algunas son bundles diferentes;
- algunas necesitan precio base externo;
- unas dependen de Qore/private state;
- el gasto del usuario es desconocido.

Para el subconjunto cuantificable de referencia ($n=65$), normalizando ofertas porcentuales sobre un gasto de referencia plausible y usando precios regulares oficiales para fixed-price offers:

| Metric | Reference subset |
| :--- | :--- |
| **Median saving** | ~S/20 |
| **IQR** | ~S/19.50–S/28.70 |
| **$\ge \text{S}/5$** | 98.5% |
| **$\ge \text{S}/10$** | 92.3% |
| **$\ge \text{S}/20$** | 73.8% |
| **$\ge \text{S}/50$** | 13.8% |

*(Estos números son una medida del corpus seleccionado, no ahorro mensual esperado de un usuario).*

Para ofertas fixed-price donde existía precio regular comparable, la **reducción porcentual mediana es aproximadamente 44%**.  
*Eso indica: el problema del corpus no es que el ahorro sea demasiado pequeño. El problema es densidad personalizada + comparabilidad + derechos.*

---

## 14. Rule Complexity Distribution

Codificación manual provisional de las 86 reglas:

| Class | N | % |
| :--- | :--- | :--- |
| **RC1 — simple** | 8 | 9.3% |
| **RC2 — moderate** | 42 | 48.8% |
| **RC3 — complex representable** | 27 | 31.4% |
| **RC4 — private-state** | 9 | 10.5% |
| **RC5 — ambiguous/conflicted retained** | 0 | 0% |
| **Total** | **86** | **100%** |

*RC5=0 no significa que las fuentes no tengan conflictos. Significa que los conflictos fueron puestos en cuarentena. Ejemplo real: la página Sip de Cineplanet muestra arriba vigencia hasta el 31 de agosto, pero sus T&C dicen 30 de agosto de 2026. Esa regla quedó CONFLICTED, no entró como oferta accionable. [Sip Beneficios](https://beneficios.sip.pe/promociones/hasta-49-cineplanet)*

---

## 15. Rule Torture Audit

La suite quedó en **46 patrones**.

| Pattern | Real example / treatment | Deterministic? |
| :--- | :--- | :--- |
| **Percentage** | BCP Granja 20% | Yes |
| **Fixed price** | Plin Papa Johns | Yes |
| **Fixed economic saving** | regular − promo | Yes |
| **Cashback** | schema supported; limited v0 | Yes |
| **Future credit** | mark delayed value | Yes |
| **Points** | NON_COMPARABLE unless valuation | Conditional |
| **Miles** | same | Conditional |
| **Free item** | non-cash | Yes structurally |
| **2x1** | UVK | Yes |
| **Bundle** | Popeyes/Papa | Yes |
| **Minimum spend** | Qore examples | Yes |
| **Maximum benefit** | Granja S/70 | Yes |
| **Weekdays** | Don Belisario | Yes |
| **Weekend exclusion** | various | Yes |
| **Holiday exclusion** | BCP/Plin examples | Yes |
| **Specific blackout** | Qore/BCP | Yes |
| **Time window** | campaign dependent | Yes |
| **Selected branch** | Granja | Yes |
| **Excluded branch** | Chinawok | Yes |
| **Salon-only** | Granja | Yes |
| **Takeaway** | Fridays/Plin | Yes |
| **Delivery-only** | sparse in core | Yes structurally |
| **App-only** | Cineplanet | Yes |
| **Coupon** | sparse | Yes |
| **Request before paying** | BCP offers | Yes |
| **Once/day** | Plin campaigns | Yes |
| **Once/month** | selected membership rules | Yes |
| **Unlimited** | BCP standard examples | Yes |
| **Per-table** | Granja | Yes |
| **Stock** | Plin/Popeyes | Yes |
| **Promotional fund** | Plin examples | Yes |
| **Invitation** | private state | VERIFY_FIRST |
| **Account active** | private state | VERIFY_FIRST |
| **Card tier** | AMEX / Qore | Yes if declared |
| **Credit-only** | issuer dependent | Yes |
| **Credit/debit** | BCP | Yes |
| **Network** | AMEX | Yes |
| **SKU exclusions** | Granja | Yes |
| **Non-combinability** | widespread | Yes |
| **Base reward stacking** | often UNKNOWN | Conditional |
| **Unknown combinability** | explicit UNKNOWN | No ranking assumption |
| **Headline/T&C conflict** | Sip Cineplanet | Human review |
| **Stale indexed page** | excluded | quarantine |
| **Non-comparable reward** | entertainment credits | no PEN ranking |
| **External merchant condition** | cinema distributor restrictions | Conditional |
| **Dynamic private tier** | Qore | VERIFY_FIRST |

### Semantic result
- Approximately 45/46 patterns can at least be semantically represented, including explicit uncertainty/non-comparability states.
- That is different from saying 45/46 can be automatically resolved.
- The single hardest class is: source conflict requiring adjudication.
- **The corpus strongly supports:** rules engine feasible; **but rejects:** all eligibility can be known deterministically.

---

## 16. Entity Resolution Findings

Entity resolution is a genuine but manageable problem. Observed cases include:
- Dunkin / Dunkin' / historical Dunkin Donuts;
- Baco & Vaca / Baco y Vaca;
- Fridays / TGI Fridays;
- Edo / Edo Sushi Bar;
- Coney Park vs Coney Active;
- normal Edo vs excluded Edo Express;
- branch-specific Granja Azul rules;
- merchant direct vs delivery-app merchant;
- Plin as payment mechanism versus Interbank provider family;
- Qore versus ordinary BCP eligibility.

**Manual audit:** approximately 11/32 merchants (34%) required more than trivial case/whitespace normalization. Only a small subset required real identity judgment; most were deterministic alias/branch problems.

*Conclusion: entity resolution is a real engineering component, but the observed food beachhead is nowhere near the complexity of supermarket SKU matching.*

---

## 17. Duplicate / Campaign Identity Findings

Duplicates appeared conceptually through:
- catalog page + individual detail page;
- same campaign discovered via search and catalog;
- bank branding + Plin branding;
- repeated regional pages;
- merchant and provider references.

*These were not counted twice in the final 86.*

### Campaign identity
Recommended research identity:
$$\text{provider\_family} + \text{campaign/merchant} + \text{eligibility\_signature} + \text{benefit\_signature} + \text{date\_range} + \text{channel}$$

Multiple source pages become `source_versions` of the same campaign.

### Duplicate rate
- Final retained corpus: **0 known duplicates** by construction.
- Discovery-stage duplicate rate: **UNKNOWN**, because all discovery search hits were not exhaustively enumerated into a denominator. *(I will not manufacture one).*

---

## 18. Expiry / Freshness Findings

Freshness already produced material exclusions:
- **FUTURE:** Plin publishes September campaigns in the same page as current ones; they were excluded until their start date. [Interbank](https://interbank.pe/promociones/descuentos/plinpromos)
- **EXPIRED:** Previously indexed campaigns whose validity ended before 30 August were excluded even if their landing pages remained discoverable.
- **CONFLICTED:** Sip/Cineplanet (page header: through 31 August; detailed conditions: through 30 August). [Sip Beneficios](https://beneficios.sip.pe/promociones/hasta-49-cineplanet) → *Quarantined.*

### “Campaign active” ≠ “actionable now”
BCP Baco y Vaca, for example, has a published campaign through September but explicitly excludes holidays. Its page can therefore be campaign-active yet ineligible on a specific date/context. [Viabcp](https://www.viabcp.com/beneficios/tarjetas/baco-y-vaca)

The corpus consequently needs distinct states:
- `campaign_active`;
- `context_actionable`;
- `source_visible`.

*This was not merely theoretical—it appeared immediately in the audit.*

---

## 19. User Portfolio Simulations

*Yape/telecom remain outside the 86 core offers; they are not silently counted.*

- **P1 — BCP + Yape:**
  - BCP reaches 18/32 merchants at raw provider-presence level;
  - cross-provider comparison inside the core: essentially zero;
  - several BCP advantages require Qore/private eligibility.
  - *Decision-engine value: LOW (mostly a BCP benefit interpreter).*
- **P2 — BCP + Interbank + Plin + Yape:**
  - $\ge 22$ merchants reachable through BCP/IBK union;
  - ~9 merchants with those two provider families overlapping;
  - several genuine decision switches (Fridays, Pizza Hut, Villa Chicken).
  - *Portfolio quality: HIGH conditional (many strongest switches depend on Qore).*
- **P3 — BCP + Sip + telecom:**
  - ~24 merchants covered in union;
  - ~9 merchant intersections;
  - clean Popeyes comparison; Cineplanet; Fridays conditional.
  - *Quality: HIGH.*
- **P4 — Interbank + Diners + Plin:**
  - ~25/32 merchants in union;
  - fewer merchant intersections than P2/P3, but two especially clean O4 contexts: UVK, Embarcadero.
  - *Quality: MEDIUM-HIGH.*
- **P5 — all four core families:**
  - coverage: 32/32;
  - $\ge 2$-family merchants: 22;
  - all ten potential O4 cases reachable (six require private-state handling).
  - *Quality: HIGHEST.*

> **Critical inference:** The relevant variable is not number of cards. It is **number of independent eligibility families that overlap where the user actually buys.**

---

## 20. One-Instrument Baseline

A BCP-only consumer demonstrates why the original ICP should remain multi-instrument:
- BCP has substantial offer breadth in v0.
- But there is no cross-provider decision.
- PagaMenos can still answer: *do I qualify? what is the cap? what channel? is it valid today?*
- That has utility, but that job is much closer to **benefits directory + T&C interpreter** than **economic decision engine**.

*Therefore: one-instrument users should remain excluded from the principal behavioral ICP.*

---

## 21. Directory vs Decision-Engine Analysis

- **DIRECTORY-SUFFICIENT:** If $\le 1$ provider; different non-comparable bundles; identical economics; listing eligibility is sufficient.
- **DECISION-ENGINE-VALUE:** If calculation or context materially answers something the raw list does not: different effective monetary benefit; cap/minimum; day; channel; location; transaction amount; private eligibility; basket composition.

### Result

| Classification | Merchants | Share |
| :--- | :--- | :--- |
| **DECISION-ENGINE-VALUE** | 14 | 43.8% |
| **Directory-sufficient / weak** | 18 | 56.2% |

*That 43.8% is not good enough for a broad 32-merchant prototype. But it is enough to create a decision-dense narrower corpus. This is the central reason for NARROW rather than RED.*

---

## 22. PagaMenos vs Rebajitas Corpus-Level Gap

Rebajitas is materially closer to PagaMenos than it appeared during initial ideation.

Current App Store evidence says it: registers affiliations rather than bank accounts; personalizes offers; supports search; supports categories; shows conditions; supports favorites; tracks used offers; alerts; supports direct sharing; does not process payments or link bank accounts; is actively updating in August 2026. [App Store](https://apps.apple.com/pe/app/rebajitas/id6800365955)

### Publicly observable capability comparison

| Capability | Rebajitas | PagaMenos hypothesis |
| :--- | :--- | :--- |
| **Declared affiliations** | Yes | Yes |
| **Personalized promo filtering** | Yes | Yes |
| **Search** | Yes | Yes |
| **Conditions** | Yes | Yes |
| **Nearby** | Yes | Optional |
| **Favorites/history** | Yes | Later |
| **Sharing** | Yes | Later |
| **Transaction amount input** | Not publicly observed | Core |
| **Cross-provider economic ranking** | Not publicly observed | Core |
| **Cap/minimum calculation** | Not publicly observed | Core |
| **Effective cost** | Not publicly observed | Core |
| **Best-option explanation** | Not publicly observed | Core |
| **Explicit uncertainty state** | Not publicly observed | Core |

*(I cannot reliably determine its coverage of each of the 32 merchants from its public store metadata: that field is UNKNOWN).*

### Corpus-level implication
- For roughly 18/32 weak/directory contexts: Rebajitas' observed product thesis is already sufficient to absorb much of PagaMenos's intended value.
- For the 14 clear decision-engine contexts: PagaMenos still has a meaningful computational wedge.
- *That is another argument for narrowing the validation corpus.*

---

## 23. SOURCE RIGHTS REGISTER v1.1

*This is issue spotting, not legal advice.*

### Interbank / Plin
- **Sources actually used:** public promotions catalogue; individual `/promociones/...`; `/promociones/descuentos/plinpromos`. [Interbank promotions catalogue](https://interbank.pe/es/web/guest/promociones-catalogo?utm_source=chatgpt.com) [Plin promotions page](https://interbank.pe/promociones/descuentos/plinpromos?utm_source=chatgpt.com)
- **Public:** yes.
- **Authentication:** none for read.
- **robots:** no general Disallow was observed in current robots file. [Interbank](https://interbank.pe/robots.txt)
- **Published site notice:** “Todos los derechos reservados.” [Interbank](https://interbank.pe/es/web/guest/promociones-catalogo)
- **Explicit commercial reuse permission:** not found.
- **Raw content stored / republished:** proposed no raw storage / no full copy.
- **PagaMenos layer:** derived factual rules + source link.
- **Classification:** **REVIEW** *(Not CLEARED)*.

### BCP / Qore
- **Exact pattern:** `viabcp.com/beneficios/tarjetas/...` and `viabcp.com/qore/beneficios/...`. [BCP benefits](https://www.viabcp.com/beneficios/tarjetas?utm_source=chatgpt.com)
- **Public:** yes for pages inspected.
- **Authentication:** none to inspect public promotion; private Qore eligibility remains user-specific.
- **robots:** not sufficiently verified in this pass → UNKNOWN.
- **Commercial data reuse licence:** not located.
- **Raw copy:** should not be republished.
- **Classification:** **REVIEW**.
- *BCP does, importantly, operate an official Partnerships program explicitly connecting startups to BCP and piloting/scaling solutions. [Viabcp](https://www.viabcp.com/partnerships) That makes the permission route more credible than a generic customer-service email.*

### Sip / Oh!
- **Exact source:** `beneficios.sip.pe/promociones/...`. [Sip Beneficios](https://beneficios.sip.pe/?utm_source=chatgpt.com)
- **Public:** yes.
- **Auth:** no to browse benefits.
- **robots:** UNKNOWN in this audit.
- **Terms:** current digital-channel terms explicitly include “Web Beneficios Sip”; intellectual-property section states that rights over services/content/signs/domains and use/exploitation—including publication, reproduction, distribution and transformation—belong to the company, and use alone is not authorization/license for other purposes. [cms.sip.pe](https://cms.sip.pe/wp-content/documentos/terminos-condiciones/TyC-Canales-digitales.pdf)
- **Classification:** **PERMISSION REQUIRED**.
- *This does not mean normalized promotion facts are definitively legally prohibited. That is exactly the question for counsel. It does mean treating public access as commercial reuse permission would be irresponsible.*

### Diners
- **Exact patterns:** `dinersclubperu.pe/establecimientos/modo-tasty/...` and `dinersclubperu.pe/establecimientos/modo-fun/...`. [Diners Modo Tasty](https://dinersclubperu.pe/establecimientos/modo-tasty/?utm_source=chatgpt.com) [Diners Modo Fun](https://dinersclubperu.pe/establecimientos/modo-fun/?utm_source=chatgpt.com)
- Public campaign pages disclose conditions such as merchant, dates, discount, cap and channel; Baco y Vaca, for example, publishes 20%, maximum S/100, dates, participating stores and delivery/salon conditions. [Diners Club Peru](https://dinersclubperu.pe/establecimientos/modo-tasty/baco-y-vaca)
- **Explicit external commercial reuse licence:** not found.
- **Classification:** **REVIEW**.

---

## 24. Corpus Rights Exposure

### By offer count

| Rights status | Offers | Share |
| :--- | :--- | :--- |
| **CLEARED** | 0 | 0% |
| **REVIEW — IBK/BCP/Diners** | 66 | 76.7% |
| **PERMISSION REQUIRED — Sip** | 20 | 23.3% |
| **POTENTIAL RED** | 0 core | 0% |
| **RED** | 0 | 0% |

> **Most important conclusion:** 100% of the corpus remains commercially uncleared. That does not stop a controlled validation study. It does block a production GO.

### Decision-value exposure
Of the 19 O2+ contexts:
- BCP touches approximately 14/19 = 73.7%;
- Diners ~11/19 = 57.9%;
- Interbank ~10/19 = 52.6%;
- Sip ~10/19 = 52.6%.

*(These are participation shares and overlap; they are not additive).*

---

## 25. Provider Removal Stress Tests

*Baseline: 19 strict O2+ merchants.*

- **Remove Interbank / Plin:** Useful merchants remaining: **14** (Loss: 5 / 19 = 26%)
- **Remove BCP:** Useful merchants remaining: **11** (Loss: 8 / 19 = 42%)
- **Remove Sip:** Useful merchants remaining: **13** (Loss: 6 / 19 = 32%)
- **Remove Diners:** Useful merchants remaining: **10** (Loss: 9 / 19 = 47%)

> **Critical finding:** Diners represents only 20/86 (23.3%) of raw offers, but removing it destroys nearly half of the useful same-purchase overlap in this selected corpus. Therefore: **Diners has disproportionately high Decision Value Contribution.** Raw offer count would have completely hidden that dependency.

---

## 26. Three-Provider Minimum Test

| Three-provider corpus | Useful O2+ merchants |
| :--- | :--- |
| **BCP + Diners + Sip** | 14 |
| **BCP + Diners + Interbank** | 13 |
| **Diners + Interbank + Sip** | 11 |
| **BCP + Interbank + Sip** | 10 |

- **Raw-data winner:** BCP + Diners + Sip (14).
- **Risk-adjusted winner today:** BCP + Diners + Interbank (13) *(retains 13 useful contexts while avoiding Sip's current PERMISSION REQUIRED status)*.

*Conclusion: A three-provider validation corpus is possible. PagaMenos is not structurally dependent on all four.*

---

## 27. Provider Dependency Analysis

Ranking by actual experimental dependency:

1. **Diners:** Largest marginal effect (19 → 10 when removed). High value particularly for: UVK; Embarcadero; Granja; Baco; Perroquet; Bistecca; La Nacional; entertainment.
2. **BCP:** 19 → 11. Also contributes many of the strongest economic differences. Downside: Qore introduces private-state uncertainty.
3. **Sip:** 19 → 13. High category value. But legal status is currently the most problematic of the four because explicit IP language was located.
4. **Interbank / Plin:** 19 → 14. Still extremely useful, especially because its Plin rules are richly structured and frequent, but more replaceable in this corpus.

---

## 28. Provider Outreach Priority Matrix

| Priority | Provider | Decision contribution | Replaceability | Rights uncertainty | Partnership value |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Diners** | Very high | Low-medium | REVIEW | High |
| **2** | **BCP** | Very high | Medium | REVIEW | Very high |
| **3** | **Sip** | High | Medium | PERMISSION REQUIRED | High |
| **4** | **Interbank/Plin** | High | Higher | REVIEW | Very high |

- *Why Diners above BCP?* Not brand importance: because dataset removal impact is larger.
- *Why BCP second?* Overlap contribution; unique Qore cases; explicit startup-partnership infrastructure.

---

## 29. Source Contact Research

- **BCP:** Best route: *Partnerships BCP*. Its official page says the team connects startups with BCP and identifies, pilots and scales solutions. It includes an official application form. [Viabcp](https://www.viabcp.com/partnerships) Target function: Partnerships / innovation; then request routing to benefits/loyalty owner.
- **Interbank:** Official route: *Open Banking — Sé un aliado*. Interbank explicitly describes building collaborative models/alliances and integrations with external businesses. [Interbank](https://interbank.pe/open-banking) Target: partnerships/Open Banking; request benefits/Plin-promotions owner.
- **Sip:** Official published channels in current digital-terms document include: 989-157-775; Lima: (01) 619-4800; other support channels. [cms.sip.pe](https://cms.sip.pe/wp-content/documentos/terminos-condiciones/TyC-Canales-digitales.pdf) Request routing to: Alianzas; Marketing; Beneficios; owner of Web Beneficios Sip.
- **Diners:** Use an official Diners corporate/member-service route and request transfer to: Alianzas; Marketing; Modo Tasty / Modo Fun. *(I did not locate a dedicated public “startup partnership” surface comparable to BCP's during this pass).*

---

## 30. Permission Request Package

### 30-second description
> *"PagaMenos es un proyecto de investigación/private beta que ayuda a una persona a comparar beneficios que ya posee antes de una compra. El usuario declara sus tarjetas o membresías, sin proporcionar números de tarjeta ni credenciales bancarias. Para un comercio y contexto concretos, PagaMenos normaliza las condiciones publicadas, calcula alternativas y explica cuál podría generar mayor ahorro."*

### Data requested
stable campaign ID where available; merchant; validity; benefit type/value; eligible product/instrument; minimum; cap; channel; location; exclusions; update timestamp.

### Not collected
card numbers; CVV; credentials; balances; transaction history; bank-account data.

### Use
normalize factual conditions; calculate derived economic comparison; display concise conditions; link to official provider source.

### Attribution
Always: provider + official source + verification timestamp.

### Pilot boundaries
approximately 18 merchants; Lima; restaurants + cinema/entertainment; 30–50 users; approximately 60 days; no payment processing.

### Minimum permission requested
Written authorization to:
- periodically retrieve the specified public promotion facts;
- store normalized factual rules;
- show concise derived summaries/calculations;
- deep-link/attribute source;
- collect aggregate usage/redemption/error feedback.

### Ideal optional feed
CSV/JSON/file/email feed with: campaign ID; rule fields; change timestamp.

### Provider benefit
incremental qualified discovery; better benefit utilization; downstream redemption evidence; error/condition feedback; attribution.

### Accuracy controls
official source visible; timestamp; no “BEST” under inadequate confidence; conflicted source automatically removed from ranking; sponsored placement never overrides economic winner.

---

## 31. Corpus Quality Scorecard

| Dimension | Result | Assessment |
| :--- | :--- | :--- |
| **Active retained rules** | 86 | YELLOW |
| **Primary-source backed** | 86/86 | GREEN |
| **Food/entertainment composition** | 77.9 / 22.1% | GREEN |
| **Multi-provider presence** | 22/32 | GREEN |
| **Strict O2+** | 19/32 | YELLOW |
| **Confirmed overlap excluding private-only uplift** | 14/32 | YELLOW-RED |
| **≥3 provider families** | 7/32 | YELLOW |
| **Clear decision-engine value** | 14/32 | YELLOW |
| **Quantifiable reference economics** | ~65/86 = 75.6% | YELLOW |
| **Private-state RC4** | 9/86 = 10.5% | YELLOW |
| **Actionable RC5 retained** | 0 | GREEN |
| **Nontrivial entity normalization** | ~11/32 = 34% | YELLOW |
| **Known duplicate retained** | 0 | GREEN |
| **Discovery duplicate rate** | UNKNOWN | — |
| **Full individual-detail re-audit** | Incomplete | YELLOW |
| **Rights CLEARED** | 0/86 | RED for production |
| **Rights route plausible** | Yes | YELLOW |
| **Single-provider dependency** | No | GREEN |
| **Three-provider viable corpus** | Yes | GREEN |

> **The most important distinction:** Data feasibility = YELLOW/GREEN. Data rights = unresolved. Do not combine those into one “quality score.”

---

## 32. Dataset Freeze Rules

Corpus v0 should not be frozen as Wave-1 data. First create narrowed Corpus v1.

### Proposed v1 merchant freeze (18 merchants)
1. Papa Johns
2. Chinawok
3. Don Belisario
4. Baco y Vaca
5. Granja Azul
6. TGI Fridays
7. UVK
8. Popeyes
9. Cineplanet
10. Coney Park
11. Coney Active
12. Embarcadero 41
13. Issei
14. Perroquet
15. Pizza Hut
16. Villa Chicken
17. La Bistecca
18. La Nacional

- **Universe size:** approximately 62 of the 86 offer/rule instances.
- **Composition:** 14 food; 4 entertainment (77.8% / 22.2%).
- **Overlap:** Every selected merchant has at least two provider families in v0.

### Operational updates allowed after freeze
- expiry;
- campaign removal;
- factual source correction;
- changed cap;
- changed minimum;
- changed schedule;
- source conflict;
- source going inaccessible;
- replacement of an expired campaign by a new campaign from an already frozen merchant/provider.

*(Every such update requires timestamp/version).*

### Not allowed during Wave 1
- new merchant added to improve density;
- new category;
- new provider;
- adding an attractive offer after seeing poor cohort results;
- reclassifying private eligibility as confirmed.

*(Those are scope expansion, not operational updates).*

### Critical correction rule
If PagaMenos learns that a published rule was wrong:
- fix it immediately;
- preserve previous version;
- identify all affected user decisions;
- **do not preserve experimental purity at the expense of misinformation.**

---

## 33. Prototype Input Contract

*If the narrowed corpus eventually goes GREEN, the behavioral prototype needs only:*

### Purchase context input
- canonical merchant;
- branch/location where material;
- intended date/time;
- channel: salon; takeaway; delivery; web/app;
- estimated amount;
- optional product/basket when an offer is SKU-specific.

### User eligibility input
- provider families;
- cards/products;
- network;
- tier;
- memberships;
- private state only via explicit `YES` / `NO` / `UNKNOWN`. *(Example: Qore benefit active? UNKNOWN. Never infer YES).*

### Candidate-offer output
- offer ID; provider; benefit; expected PEN saving if comparable; expected effective cost; validity; cap/minimum; channel/location; critical exclusions; combinability state; source; checked timestamp.

### Decision output
- rank; winner; economic difference; `CONFIRMED` / `LIKELY` / `VERIFY_FIRST` / `INSUFFICIENT`; calculation; reason winner; reason alternative lost.

### Mandatory refusal state
If the top two cannot be safely compared: **NO SAFE WINNER** rather than invented precision.  
*(No banking integration is required for this experiment).*

---

## 34. CORPUS GREEN / NARROW / RED

### CORPUS NARROW
The broad v0 does not pass the pre-registered GREEN gate.

**Why:**
- 86 valid high-quality rules exist—so lack of supply is not the problem.
- 22/32 merchants have provider presence overlap, which initially looks strong.
- But only 19/32 survive a strict same-purchase O2+ test—below the $\ge 20$ threshold.
- Once private-state-only advantages are discounted, confirmed useful overlap falls toward 14/32.
- Only 7/32 have $\ge 3$ provider families rather than the desired 8–10.
- Only approximately 14/32 clearly add decision-engine value over a Rebajitas-style directory.
- Six major O4 scenarios depend materially on private eligibility such as Qore.
- Broad inclusion therefore dilutes the experiment with merchants where PagaMenos is effectively a directory.
- The rights position is unresolved for 100% of the production corpus.
- Sip has particularly explicit intellectual-property language and should not be treated as commercially reusable without permission/legal review. [cms.sip.pe](https://cms.sip.pe/wp-content/documentos/terminos-condiciones/TyC-Canales-digitales.pdf)

*But it is not RED because a much stronger subcorpus clearly exists.*

### Narrowed thesis
Use approximately **18 merchants / ~62 current rule instances / four provider families** with heavy concentration on same-purchase overlap and intentional inclusion of four Qore/private-state cases to test `VERIFY_FIRST`.

This narrower universe contains enough:
- clean fixed-price comparisons;
- percentage comparisons;
- caps;
- fixed-price vs percentage conflicts;
- day switches;
- channel switches;
- format switches;
- private-eligibility cases

to test the actual product job.

> **Crucially:** it no longer asks whether PagaMenos can organize offers. It asks whether users value the calculation.

---

## 35. Immediate Next Action

Do not proceed yet to Phase 0A-2 implementation.  
There is one short blocking step:

### Validation Corpus v1 — Hardening Gate
Take the 18 merchants above and perform a row-by-row deep verification of their approximately 62 rules.

The gate requires exactly five outputs:
1. **Every rule must be individually reopened at its primary source** and receive `ACTIVE` / `FUTURE` / `EXPIRED` / `CONFLICTED`, exact validity, source timestamp and rule confidence. No catalogue-only evidence remains for Wave 1.
2. **Recalculate O2/O3/O4 using only those fully verified rules.** Require at least 14/18 confirmed same-purchase overlap merchants and preferably $\ge 4$ strong O4 cases that do not depend solely on unknowable private state.
3. **Resolve the rights route for the four source families:** send or prepare immediate permission outreach to Diners, BCP, Sip and Interbank. BCP and Interbank already expose unusually relevant official partnership channels. [Viabcp](https://www.viabcp.com/partnerships)
4. **Quarantine every RC5, stale or conflicted rule.** The Sip Cineplanet contradiction demonstrates why this is a real requirement rather than theoretical QA. [Sip Beneficios](https://beneficios.sip.pe/promociones/hasta-49-cineplanet)
5. **Run the provider-removal test again on v1.** No single provider should cause the narrowed experiment to collapse below a useful behavioral test.

### Decision after that hardening
If v1 retains:
- $\ge 14/18$ confirmed same-purchase merchants;
- $\ge 4$ strong declarable O4 contexts;
- high rule representability;
- three credible provider source paths;
- no critical source becoming RED;

then reclassify: **NARROWED CORPUS GREEN** and proceed to:  
`PAGAMENOS — PHASE 0A-2: VALIDATION SYSTEM IMPLEMENTATION PLAN`.

*If the 18-merchant corpus loses substantial overlap after deep verification—or rights review eliminates Diners/BCP without adequate replacements—then PagaMenos should return to product/challenger evaluation before a user-facing prototype is built.*

---

### Final Assessment

> **The Phase 0A-1 result is therefore materially more cautious than the previous reports:**  
> PagaMenos is observable in real Peruvian promotion data. The strongest evidence is not the 86 promotions; it is the small set of transactions where two or more legitimate benefits compete and context actually changes the winner. That set is real, but still too concentrated and legally unresolved to authorize implementation without one final corpus-hardening pass.

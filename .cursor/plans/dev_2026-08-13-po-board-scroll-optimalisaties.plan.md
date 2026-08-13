---
name: po-board-scroll-optimalisaties
overview: >
  Vervolgoptimalisaties voor verticaal én horizontaal scrollen op het PO-bord,
  gebaseerd op best practices van monday.com (mondayDB) en Microsoft D365 F&O.
  BL-004 (rAF-gate, -40% jank) is al geïmplementeerd. Dit plan pakt de resterende
  render- en scroll-bottlenecks aan in drie tiers: snelle CSS/React-wins (A),
  directional windowing + tooltip-mount (B), en architecturale verbeteringen
  zoals horizontale kolom-virtualisatie en paint-then-hydrate (C).
todos:
  # --- Tier A: hoge impact, kleine ingreep ---
  - id: a1-overscan-verlaging
    content: >
      Overscan verlagen van 14 naar 8 in PurchaseOrdersBoardRows.jsx.
      Vermindert mount-werk per scroll-stap met ~40%.
    status: pending
  - id: a2-content-visibility
    content: >
      CSS content-visibility auto + contain-intrinsic-size op tabelrijen.
      Browser slaat layout/paint over voor off-screen rijen — D365 F&O patroon.
    status: pending
  - id: a3-start-transition
    content: >
      React.startTransition rond setRange() in useBoardRowWindow.js.
      Markeert window-update als niet-urgent zodat input-events prioriteit houden
      boven rij-mount — monday.com board-update patroon.
    status: pending
  - id: a4-contain-content
    content: >
      CSS contain content op tabelcellen. Isoleert layout per cel,
      voorkomt reflow-cascade bij scroll over ~500 cellen (25 kolommen × 20 rijen).
    status: pending
  # --- Tier B: hoge impact, gemiddelde ingreep ---
  - id: b1-horizontal-virtualisatie
    content: >
      Horizontale kolom-virtualisatie via useBoardColumnWindow hook. Nu worden alle
      25 kolommen gerenderd per rij, ook buiten het horizontale viewport. monday.com
      en D365 F&O virtualiseren altijd zowel rijen als kolommen. Grootste
      onbenutte optimalisatie: 60% minder render per rij als 10 van 25 kolommen zichtbaar.
    status: pending
  - id: b2-directional-overscan
    content: >
      Asymmetrische overscan op basis van scrollrichting. Meer buffer in
      scrollrichting (12), minder tegengesteld (2). Detectie via scrollTop-delta
      tussen rAF-cycli. D365 F&O VirtualScrollViewer-patroon.
    status: pending
  - id: b3-tooltip-hover-mount
    content: >
      Tooltip in PurchaseOrderProductImageCell pas mounten op mouseenter (200ms delay),
      niet bij rij-mount. Nu registreert elke gemounte rij direct een Tooltip-instantie
      met event-listeners — onnodig bij scroll.
    status: pending
  - id: b4-sticky-kolommen-gpu
    content: >
      position sticky + transform translateZ(0) voor controlekolom en eerste
      datakolom. Bevriest context tijdens horizontaal scrollen (D365 F&O + Excel
      patroon). GPU-layer promotion voorkomt repaint bij horizontale scroll.
    status: pending
  # --- Tier C: architecturaal, grotere ingreep ---
  - id: c1-paint-then-hydrate
    content: >
      Eerste 30 rijen renderen als statische shell (plain HTML/CSS, geen React
      event handlers) en daarna hydrateren. Bord is perceptueel zichtbaar in ~50ms,
      interactief in ~300ms. monday.com core-patroon voor initiële boardload.
    status: pending
  - id: c2-idle-callback-cel
    content: >
      requestIdleCallback voor niet-kritieke cel-content (badges, statuspills,
      format-kleuren). Cellen renderen eerst container + achtergrond (zichtbaar
      tijdens scroll), inhoud volgt in idle-tijd. D365 F&O two-phase cell render.
    status: pending
  - id: c3-perf-meting-na-tier-a
    content: >
      Perf-meting na Tier A (20 runs, profiel L, J4-journey, same-instance op DEV).
      Baseline voor Tier B-beslissing.
    status: pending
  - id: c4-perf-meting-na-tier-b
    content: >
      Perf-meting na Tier B (20 runs, zelfde methodiek). Beslissing over Tier C op
      basis van meetresultaten.
    status: pending
isProject: true
---

# Implementatieplan — PO-bord scroll-optimalisaties (vervolg BL-004)

## Context en aanleiding

BL-004 (rAF-gate op scroll-listener) is geïmplementeerd en gemeten: **−39,8% maxLongFrameMs** (1681ms → 1012ms mediaan, 20 runs). Target van 30% gehaald.

Dit plan pakt de resterende bottlenecks aan op basis van:
- Meting na BL-004: 1012ms mediaan, 2 long frames per sessie, `scrollJankMs` 1493ms
- Codeanalyse van `useBoardRowWindow.js`, `PurchaseOrdersBoardRows.jsx`, `PurchaseOrderBoardRow.jsx`, `PurchaseOrderProductImageCell.jsx`
- Best practices van **monday.com** (mondayDB-architectuur) en **Microsoft D365 F&O** (VirtualScrollViewer)

## Wat al geoptimaliseerd is (niet opnieuw aanraken)

| Techniek | Locatie | Status |
|---|---|---|
| Verticale virtualisatie (binary search, variabele rijhoogtes, spacers) | `useBoardRowWindow.js` | ✅ L5 |
| rAF-gate scroll-listener | `useBoardRowWindow.js` | ✅ BL-004 |
| React.memo rijen + custom equality per kolom (`areBoardCellPropsEqual`) | `PurchaseOrderBoardRow.jsx` | ✅ |
| Lazy image load met delay + failure cache | `PurchaseOrderProductImageCell.jsx` | ✅ |
| Passive scroll listener | `useBoardRowWindow.js` | ✅ |
| Sticky group headers die remounten als slot buiten venster valt | `PurchaseOrdersBoardRows.jsx` | ✅ |
| `measure('board:window-update')` instrumentatie | `useBoardRowWindow.js` | ✅ |

## Huidige meetresultaten (na BL-004)

| Metric | Baseline (pre-BL-004) | Na BL-004 | Delta |
|---|---:|---:|---:|
| maxLongFrameMs (mediaan, 20 runs) | 1681ms | 1012ms | **−39,8%** |
| scrollJankMs | 2924ms | 1493ms | −49% |
| longframeCount | 7 | 2 | −5 |
| slowInteractionCount | — | 0 | — |

Volgende doelstelling: `maxLongFrameMs` ≤ **700ms** (−30% op de huidige 1012ms na Tier A+B samen).

---

## Tier A — Hoge impact, kleine ingreep

### A1: Overscan verlagen (14 → 8)

**Bestand:** `src/components/supplier/PurchaseOrdersBoardRows.jsx`

**Probleem:** De huidige overscan van 14 rijen boven én onder de viewport monteert bij elke scroll-stap tot 28 extra rijen. Elk van die rijen heeft ~25 kolommen met Fluent UI-wrappers. Bij snel scrollen compound dit.

**Fix:** `overscan: 14` → `overscan: 8`. Vermindert mount-last per stap met ~40%.

**Trade-off:** Iets meer zichtbare "pop-in" bij extreem snel scrollen (>5000px/s). Niet merkbaar bij normale scrollsnelheid. Te meten via J4-journey.

**Referentie:** monday.com gebruikt een overscan van 3–5 slots. D365 F&O gebruikt 8–10.

---

### A2: `content-visibility: auto` op tabelrijen

**Bestand:** CSS (purchaseOrdersBoardRowsStyles of inline)

**Probleem:** Spacer-rijen en gemounte-maar-niet-zichtbare rijen (net buiten viewport) doen mee aan de browser-layout-boom. Bij 2000 totale slots (ook al zijn de meeste niet gemount) is de virtuele hoogte groot genoeg dat reflow-cascades optreden.

**Fix:**
```css
.itemRow {
  content-visibility: auto;
  contain-intrinsic-block-size: 44px; /* PURCHASE_ORDER_BOARD_ROW_HEIGHT_PX */
}
```

De browser slaat layout én paint over voor rijen die buiten de viewport vallen, zelfs als ze in de DOM staan. Dit is het D365 F&O grid-patroon: de browser doet zelf een tweede laag virtualisatie bovenop de JS-virtualisatie.

**Let op:** `contain-intrinsic-block-size` moet kloppen met `PURCHASE_ORDER_BOARD_ROW_HEIGHT_PX` (44px). Opengeklapte orders (variabele hoogte) hebben dit niet nodig — die zijn altijd in het viewport als ze open zijn.

---

### A3: `React.startTransition` voor `setRange`

**Bestand:** `src/hooks/useBoardRowWindow.js`

**Probleem:** `setRange()` triggert een synchrone re-render met hoge prioriteit. React 18 kent twee prioriteiten: urgent (input, animatie) en transitie (state-updates die wachten mogen). Window-updates zijn transitie-kandidaat.

**Fix:** `setRange(...)` → `startTransition(() => setRange(...))`.

React kan dan tussendoor input-events afhandelen (scroll-events, touch-events) zonder te wachten op de rij-mount. De render wordt gesplitst over meerdere frames als dat nodig is. Dit is exact het patroon dat monday.com beschrijft in hun engineering blog voor board-updates: "input is always synchronous, render is always deferred."

**Vereiste:** React 18 (al in gebruik).

---

### A4: `contain: content` op tabelcellen

**Bestand:** CSS

**Probleem:** Bij 25 kolommen × ~20 zichtbare rijen = 500 cellen die de browser in één geconnecte layout-boom bijhoudt. Een breedte-wijziging aan één kolom kan een reflow van alle 500 cellen triggeren.

**Fix:**
```css
.itemCell {
  contain: content; /* = layout + style + paint */
}
```

Elke cel wordt een geïsoleerd layout-eiland. Reflows propageren niet meer door de tabel.

**Kanttekening:** `contain: strict` is sterker maar kan problemen geven met `position: sticky` van de group-headers. `contain: content` is veiliger.

---

## Tier B — Hoge impact, gemiddelde ingreep

### B1: Horizontale kolom-virtualisatie

**Bestanden:** `useBoardColumnWindow.js` (nieuw), `PurchaseOrderBoardRow.jsx`, `PurchaseOrdersBoardRows.jsx`

**Probleem:** Dit is de grootste onbenutte optimalisatie. Nu worden **alle kolommen** gerenderd per rij — ook kolommen die horizontaal buiten het viewport vallen. Bij 25 kolommen waarvan er gemiddeld 10 zichtbaar zijn: 60% van het render-werk is onzichtbaar voor de gebruiker.

**monday.com patroon:** Kolommen zijn een eigen virtuele lijst. `columnStart`/`columnEnd` worden bijgehouden via een horizontale scroll-listener op de `<thead>`-container. Spacer-cellen links/rechts vullen de breedte op.

**D365 F&O patroon:** `VirtualScrollViewer` virtualiseert rijen én kolommen onafhankelijk. Elke rij rendert alleen `[colLeft, colRight)`.

**Implementatie:**
1. Nieuwe hook `useBoardColumnWindow(scrollRef, columns, columnWidths)` — analoog aan `useBoardRowWindow` maar horizontaal
2. Berekent `colStart`/`colEnd` + `leftPadPx`/`rightPadPx`
3. `PurchaseOrderBoardRow` rendert alleen kolommen `[colStart, colEnd)` + twee spacer-cellen
4. `rAF-gate` ook op horizontale scroll-listener

**Trade-off:** Vaste kolombreedtes zijn vereist voor de offset-berekening (al aanwezig via `headerColumnWidths`). Kolommen zonder expliciete breedte krijgen een geschatte breedte.

**Verwachte winst:** Bij 10/25 zichtbare kolommen: ~60% minder cel-render-werk per rij.

---

### B2: Directional overscan

**Bestand:** `src/hooks/useBoardRowWindow.js`

**Probleem:** Symmetrische overscan (8 rijen voor én achter) buffert even veel in de richting die je net verlaten hebt als in de richting waar je naartoe scrolt. Dat is verspild mount-werk.

**Fix:** Delta van `scrollTop` bijhouden tussen twee rAF-cycli. Als `delta > 0` (neerwaarts): `overscanBefore = 2, overscanAfter = 12`. Als `delta < 0` (opwaarts): andersom.

```js
const direction = scrollTop - prevScrollTopRef.current > 0 ? 'down' : 'up';
const overscanBefore = direction === 'down' ? 2 : overscan;
const overscanAfter = direction === 'down' ? overscan : 2;
```

**Referentie:** D365 F&O `VirtualScrollViewer` implementeert exact dit patroon. React-window heeft ook een `overscanCount` maar geen richtings-awareness — dit is een verbetering erop.

---

### B3: Tooltip hover-only mount

**Bestand:** `src/components/supplier/PurchaseOrderProductImageCell.jsx`

**Probleem:** De Fluent UI `<Tooltip>` registreert event-listeners bij mount van elke rij. Bij 20 zichtbare rijen = 20 Tooltip-instanties die tegelijk actief zijn. Mount-kosten van Fluent Tooltip zijn niet triviaal (portaal-registratie, aria-describedby koppeling).

**Fix:** Tooltip pas mounten nadat de gebruiker 200ms stil staat op de cel (via `onMouseEnter`-timer, `onMouseLeave`-cancel). Dezelfde delay als `PRODUCT_IMAGE_LOAD_DELAY_MS`. Voordat de Tooltip gemount is: gewone `<button>` zonder wrapper.

```jsx
const [showTooltip, setShowTooltip] = useState(false);
// onMouseEnter: setTimeout(200ms) → setShowTooltip(true)
// onMouseLeave: clearTimeout → setShowTooltip(false)
```

---

### B4: Sticky kolommen + GPU-layer promotion

**Bestanden:** CSS, `purchaseOrderBoardLayout.js`

**Probleem:** Tijdens horizontaal scrollen verdwijnt de controlekolom (checkbox/expand/badge) én de eerste datakolom uit beeld. Gebruikers verliezen hun context.

**Fix:**
1. `position: sticky; left: 0` op de controlekolom (al deels aanwezig)
2. `position: sticky; left: <controlColWidth>px` op eerste datakolom (leverancier/ordercode)
3. `transform: translateZ(0)` op de scroll-container — GPU compositor layer, scroll via hardware in plaats van CPU-repaint

**Referentie:** D365 F&O bevriest altijd de eerste 2-3 kolommen. Excel bevriest tot 5 kolommen. monday.com bevriest de naam-kolom altijd.

---

## Tier C — Architecturaal, grotere ingreep (plan voor latere sprint)

### C1: Paint-then-hydrate (perceptuele initiële load)

**Patroon:** monday.com

Render de eerste 30 rijen als statische HTML-tabel (plain `<tr>/<td>` zonder React-wrappers) tijdens initiële load. Gebruiker ziet meteen data. Hydreer daarna met React in de achtergrond.

**Technisch:** SSR of pre-render van de bovenste dataslice via `renderToStaticMarkup`, inject als `dangerouslySetInnerHTML` in een shell-component, vervang zodra React-mount klaar is.

**Perceptueel effect:** Bord zichtbaar in ~50ms, interactief in ~300ms.

---

### C2: `requestIdleCallback` voor cel-content

**Patroon:** D365 F&O two-phase cell render

Fase 1 (direct bij mount): container + achtergrondkleur + breedte/hoogte.
Fase 2 (idle): tekst, badges, statuspills, formatkleur-berekening.

Implementatie: `useIdleEffect(callback)` hook die `requestIdleCallback` wraps (met `setTimeout`-fallback voor Safari).

**Verwachte winst:** Mount-last gespreider over idle-frames, minder blockerend per scroll-stap.

---

### C3: Perf-meting na elke tier

Na Tier A én na Tier B: volledige perf-meting (20 runs, profiel L, J4-journey, same-instance op Azure DEV). Resultaten bepalen of Tier C noodzakelijk is.

**Huidige stand:** 1012ms. Doel na Tier A+B: ≤ 700ms.

---

## Fasering en acceptatiecriteria

### Tier A (één sprint)

- [ ] A1–A4 geïmplementeerd op `feature/po-board-scroll-tier-a`
- [ ] Geen regressie op bestaande unit tests (`useBoardRowWindow.test.jsx`, board-cell tests)
- [ ] Alle gewijzigde componenten onder 300 regels
- [ ] Perf-meting na Tier A: `maxLongFrameMs` ≤ **800ms** (mediaan, 20 runs, profiel L, same-instance DEV)
- [ ] PR gemerged naar `develop`

### Tier B (één sprint)

- [ ] B1–B4 geïmplementeerd op `feature/po-board-scroll-tier-b`
- [ ] Horizontale kolom-virtualisatie: geen zichtbare misalignment in header vs. body
- [ ] Sticky kolommen blijven op juiste positie bij alle zoom-levels (100%, 125%, 150%)
- [ ] Perf-meting na Tier B: `maxLongFrameMs` ≤ **700ms** (mediaan, 20 runs, profiel L, same-instance DEV)
- [ ] PR gemerged naar `develop`

### Tier C (aparte sprint, conditioneel)

- [ ] Alleen uitvoeren als na Tier B `maxLongFrameMs` > 700ms
- [ ] Paint-then-hydrate: bord zichtbaar ≤ 100ms na navigatie (meting via Lighthouse FCP)
- [ ] `requestIdleCallback`: geen zichtbare "pop-in" van cel-content bij normale scrollsnelheid

---

## Relevante bestanden

| Bestand | Tier A | Tier B | Tier C |
|---|---|---|---|
| `src/hooks/useBoardRowWindow.js` | A3 | B2 | — |
| `src/components/supplier/PurchaseOrdersBoardRows.jsx` | A1 | B1 | — |
| `src/components/supplier/PurchaseOrderBoardRow.jsx` | — | B1 | C2 |
| `src/components/supplier/PurchaseOrderProductImageCell.jsx` | — | B3 | — |
| `src/hooks/useBoardColumnWindow.js` (nieuw) | — | B1 | — |
| CSS (purchaseOrdersBoardRowsStyles) | A2, A4 | B4 | — |
| `playwright/perf-scroll.js` | C3 | C3 | C3 |

## Referenties

- monday.com engineering blog: [mondayDB-architectuur](https://engineering.monday.com/nice-to-meet-you-mondaydb-architecture/)
- D365 F&O VirtualScrollViewer: grid virtualiseert rijen + kolommen onafhankelijk, directional overscan, two-phase cell render
- React 18 `startTransition` docs: [react.dev/reference/react/startTransition](https://react.dev/reference/react/startTransition)
- MDN `content-visibility`: [developer.mozilla.org/en-US/docs/Web/CSS/content-visibility](https://developer.mozilla.org/en-US/docs/Web/CSS/content-visibility)
- CSS `contain`: [developer.mozilla.org/en-US/docs/Web/CSS/contain](https://developer.mozilla.org/en-US/docs/Web/CSS/contain)

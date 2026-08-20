# PO-bord scroll-optimalisaties (vervolg BL-004) — Tier A, B, C (DevOps)

**Work item:** [Feature #AB:252](https://dev.azure.com/ReyniervanBommel0745/Vendor-App/_workitems/edit/252)  
**Child stories:** [#253 Tier A](https://dev.azure.com/ReyniervanBommel0745/Vendor-App/_workitems/edit/253) · [#254 Tier B](https://dev.azure.com/ReyniervanBommel0745/Vendor-App/_workitems/edit/254) · [#255 Tier C](https://dev.azure.com/ReyniervanBommel0745/Vendor-App/_workitems/edit/255)  
**Doel:** `maxLongFrameMs` ≤ 700ms na Tier A+B (nu: 1012ms na BL-004)  
**Referentie:** [.cursor/plans/dev_2026-08-13-po-board-scroll-optimalisaties.plan.md](../.cursor/plans/dev_2026-08-13-po-board-scroll-optimalisaties.plan.md)  
**Tags:** `performance; po-board; frontend; scroll; BL-004`

---

## User Story (overkoepelend)

**Als** gebruiker van het PO-bord  
**wil ik** vloeiend kunnen scrollen (verticaal én horizontaal) zonder merkbare hapering  
**zodat** de interface aanvoelt als een professionele ERP-omgeving zoals D365 F&O of monday.com

---

## Huidige stand na BL-004

| Metric | Baseline | Na BL-004 | Delta |
|---|---:|---:|---:|
| maxLongFrameMs (mediaan, 20 runs) | 1681ms | **1012ms** | −39,8% |
| scrollJankMs | 2924ms | 1493ms | −49% |
| longframeCount | 7 | 2 | −5 |

**Volgende doelstelling: ≤ 700ms na Tier A+B.**

---

## Wat al geoptimaliseerd is (niet opnieuw aanraken)

| Techniek | Locatie |
|---|---|
| Verticale virtualisatie (binary search, variabele rijhoogtes) | `useBoardRowWindow.js` |
| rAF-gate scroll-listener (BL-004) | `useBoardRowWindow.js` |
| React.memo + custom equality per kolom | `PurchaseOrderBoardRow.jsx` |
| Lazy image load + failure cache | `PurchaseOrderProductImageCell.jsx` |
| Passive scroll listener | `useBoardRowWindow.js` |
| Sticky group headers remount | `PurchaseOrdersBoardRows.jsx` |

---

## Backlog — child User Stories

### [#253] Story A: Tier A — CSS en React quick-wins

**Sprint:** 1 van 2 (uitvoerbaar parallel aan andere features)

| Item | Bestand | Verwachte winst |
|---|---|---|
| A1: Overscan 14→8 | `PurchaseOrdersBoardRows.jsx` | −40% mount-werk per stap |
| A2: `content-visibility: auto` op rijen | CSS | Browser-side layout bypass |
| A3: `startTransition` voor setRange | `useBoardRowWindow.js` | Input altijd prioriteit boven render |
| A4: `contain: content` op cellen | CSS | Geen reflow-cascade bij 500 cellen |

**Acceptatiecriteria:**
1. `maxLongFrameMs` ≤ **800ms** (mediaan, 20 runs, profiel L, same-instance DEV)
2. Geen regressie op unit tests (`useBoardRowWindow.test.jsx`)
3. Alle gewijzigde bestanden onder 300 regels

**Referentie:** D365 F&O `content-visibility` patroon, monday.com `startTransition` board-update patroon

---

### [#254] Story B: Tier B — Horizontale kolom-virtualisatie, directional overscan, sticky kolommen

**Sprint:** 2 van 2 (na Tier A meting)

| Item | Bestand | Verwachte winst |
|---|---|---|
| B1: `useBoardColumnWindow` hook (nieuw) | nieuw + `PurchaseOrderBoardRow.jsx` | 60% minder render bij 10/25 zichtbare kolommen |
| B2: Directional overscan | `useBoardRowWindow.js` | Gerichte buffer in scrollrichting |
| B3: Tooltip hover-only mount | `PurchaseOrderProductImageCell.jsx` | −20 Tooltip-instanties per scroll-stap |
| B4: Sticky kolommen + GPU-layer | CSS | Horizontale UX + hardware scroll |

**Acceptatiecriteria:**
1. `maxLongFrameMs` ≤ **700ms** (mediaan, 20 runs, profiel L, same-instance DEV)
2. Geen visuele misalignment header vs. body bij kolom-virtualisatie
3. Sticky kolommen correct bij zoom 100%, 125%, 150%
4. Eerste datakolom altijd zichtbaar tijdens horizontaal scrollen

**Referentie:** monday.com kolom-virtualisatie, D365 F&O `VirtualScrollViewer` directional overscan

---

### [#255] Story C: Tier C — Paint-then-hydrate en idle-callback (conditioneel)

**Conditie:** Alleen uitvoeren als na Tier B `maxLongFrameMs` > 700ms

| Item | Bestand | Verwachte winst |
|---|---|---|
| C1: Paint-then-hydrate initieel bord | Shell-component (nieuw) | Perceptueel zichtbaar in ~50ms |
| C2: `requestIdleCallback` cel-content | `PurchaseOrderBoardRow.jsx` | Gespreide mount-last |

**Acceptatiecriteria:**
1. Bord zichtbaar ≤ 100ms na navigatie (Lighthouse FCP)
2. Geen zichtbare pop-in bij normale scrollsnelheid (≤ 3000px/s)

**Referentie:** monday.com paint-then-hydrate, D365 F&O two-phase cell render

---

## Technische context

| Bestand | Tier A | Tier B | Tier C |
|---|---|---|---|
| `src/hooks/useBoardRowWindow.js` | A3 | B2 | — |
| `src/components/supplier/PurchaseOrdersBoardRows.jsx` | A1 | B1 | — |
| `src/components/supplier/PurchaseOrderBoardRow.jsx` | — | B1 | C2 |
| `src/components/supplier/PurchaseOrderProductImageCell.jsx` | — | B3 | — |
| `src/hooks/useBoardColumnWindow.js` (nieuw) | — | B1 | — |
| CSS (purchaseOrdersBoardRowsStyles) | A2, A4 | B4 | — |

## Commit conventie

```
feat: <omschrijving> #AB:252
feat: <omschrijving> #AB:253   (Tier A commits)
feat: <omschrijving> #AB:254   (Tier B commits)
```

---

## Versie document

Aangemaakt op 2026-08-13 op basis van `.cursor/plans/dev_2026-08-13-po-board-scroll-optimalisaties.plan.md`.

# PO-bord scroll-optimalisaties (vervolg BL-004) — Tier A, B, C (DevOps)

**Doel:** Resterende scroll-/render-bottlenecks op het PO-bord aanpakken (vervolg op BL-004), in drie tiers. Doel na Tier A+B: `maxLongFrameMs ≤ 700ms` (mediaan, 20 runs, profiel L, J4, same-instance).
**Referentie in repo:** [.cursor/plans/dev_2026-08-13-po-board-scroll-optimalisaties.plan.md](../.cursor/plans/dev_2026-08-13-po-board-scroll-optimalisaties.plan.md)
**Tags:** `performance; po-board; scroll; virtualization; BL-004-vervolg`
**Work item:** [Feature #252](https://dev.azure.com/ReyniervanBommel0745/Vendor-App/_workitems/edit/252)

---

## User story

**Als** gebruiker van het PO-bord  
**wil ik** vloeiend verticaal én horizontaal kunnen scrollen (met vaste contextkolommen)  
**zodat** grote orderlijsten (~2000) aanvoelen als een professionele ERP-grid zonder merkbare jank

---

## Acceptatiecriteria (definitie van "klaar")

1. Tier A (#253): `maxLongFrameMs ≤ 800ms` (mediaan 20 runs, profiel L, J4, same-instance DEV).
2. Tier B (#254): `maxLongFrameMs ≤ 700ms` onder dezelfde meetmethode; geen header/body-misalignment; sticky correct bij zoom 100/125/150%.
3. Tier C (#255) is **niet** geïmplementeerd tenzij schriftelijke go na Tier-B-meting (`maxLongFrameMs` nog > 700ms).
4. Geen regressie op board/`useBoardRowWindow` unit tests; gewijzigde bestanden ≤ 300 regels.
5. Versienummer verhoogd in `src/config/version.js`.

---

## Belangrijke feiten (plan-review 2026-08-13)

| Feit | Gevolg |
|------|--------|
| BL-004 rAF-gate staat **niet** op `develop` (gerevert na merge) | Tier A begint met **A0 herstel rAF** (`752b563` / `87c662e`) |
| Sticky kolommen bestaan al | B4 = alleen GPU `translateZ(0)` op bestaande sticky cellen |
| `PurchaseOrderBoardRow.jsx` ≈ 368 regels | B0 split verplicht vóór kolom-virtualisatie |
| Tier C is conditioneel | Status **geparkeerd** tot go na meting |

Historische “na BL-004”-cijfers (1012ms / −40%) zijn **niet** de huidige stand op develop — opnieuw meten na A0.

---

## Wat is al gedaan

| Item | Locatie |
|------|---------|
| Rij-virtualisatie L5 | `src/hooks/useBoardRowWindow.js` |
| Overscan = 14 | `src/components/supplier/PurchaseOrdersBoardRows.jsx` |
| Sticky kolommen | `src/hooks/usePurchaseOrdersBoardStickyColumns.js` |
| Tooltip in image-cel | `src/components/supplier/PurchaseOrderProductImageCell.jsx` |
| Scroll-meetscript J4 | `playwright/perf-scroll.js` |
| Analyse BL-004 | `.cursor/plans/dev_2026-08-09-po-board-scroll-jank.plan.md` |
| rAF-implementatie (historie, niet op develop) | commits `752b563`, `87c662e` |

---

## Backlog — child User Stories

| # | Story | DevOps |
|---|-------|--------|
| A | Tier A: rAF-herstel + overscan + content-visibility + startTransition + contain | [#253](https://dev.azure.com/ReyniervanBommel0745/Vendor-App/_workitems/edit/253) |
| B | Tier B: kolom-virtualisatie, directional overscan, lazy Tooltip, sticky GPU | [#254](https://dev.azure.com/ReyniervanBommel0745/Vendor-App/_workitems/edit/254) |
| C | Tier C: paint-then-hydrate / idle cells (**geparkeerd**) | [#255](https://dev.azure.com/ReyniervanBommel0745/Vendor-App/_workitems/edit/255) |

### Tier A (#253) — aanpak

- A0: Herstel rAF-gate in `useBoardRowWindow.js`
- A1: Overscan 14 → 8 in `PurchaseOrdersBoardRows.jsx`
- A2: `content-visibility: auto` op niet-expanded rijen
- A3: `startTransition` voor `setRange()`
- A4: `contain: layout` op veilige tekstcellen

### Tier B (#254) — aanpak

- B0: Split `PurchaseOrderBoardRow.jsx` (<300 regels)
- B1: `useBoardColumnWindow` — horizontale kolom-virtualisatie
- B2: Directional overscan
- B3: Tooltip hover-only in `PurchaseOrderProductImageCell`
- B4: GPU-layer op **bestaande** sticky cellen (geen nieuwe sticky UX)

### Tier C (#255) — geparkeerd

Alleen na go wanneer mediaan `maxLongFrameMs` na Tier B nog > 700ms.

---

## Meetmethode (verplicht)

- Script: `playwright/perf-scroll.js`, journey **J4**
- Profiel **L** (~2000 orders), **20 runs**, mediaan `maxLongFrameMs`
- **Same-instance** pre- en post-meting

---

## Commit conventie

```
perf: beschrijving #AB:253
```

(Feature-commits mogen `#AB:252` gebruiken; child-id bij story-werk.)

---

## Versie document

Aangemaakt/bijgewerkt op basis van [.cursor/plans/dev_2026-08-13-po-board-scroll-optimalisaties.plan.md](../.cursor/plans/dev_2026-08-13-po-board-scroll-optimalisaties.plan.md) na plan-review 2026-08-13.
Repo-document: docs/devops/252-po-board-scroll-optimalisaties.md

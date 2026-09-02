# PO table zoom (DevOps)

**Doel:** Staff en leveranciers kunnen de PO-tabel schalen (75–110%, default 85%) zonder extra API en zonder zoom-state in de page/board-tree.  
**Referentie in repo:** [`.cursor/plans/dev_2026-09-02-po-table-zoom.plan.md`](../../.cursor/plans/dev_2026-09-02-po-table-zoom.plan.md)  
**Spec:** [docs/specs/2026-09-02-po-table-zoom-design.md](../specs/2026-09-02-po-table-zoom-design.md)  
**Azure DevOps Feature:** [#303](https://dev.azure.com/reyniervanbommel0745/Vendor-App/_workitems/edit/303)  
**Tags:** po-board; zoom; density; frontend; performance

---

## User story

**Als** staff of leverancier  
**wil ik** de PO-tabel visueel kleiner of groter kunnen zetten (tekst, padding, rijhoogte, headers en subitems)  
**zodat** ik meer rijen en kolommen op het scherm zie zonder de browser of de rest van de app te zoomen.

---

## Acceptatiecriteria (definitie van "klaar")

1. Tabel start op 85% (of de in deze browser opgeslagen schaal), zonder flash naar 100%.
2. Staff en leveranciers zien − / huidige % / + in de topbalk; Reset alleen als schaal ≠ 85%.
3. Bereik 75–110% in stappen van 5%; KPI-strip, dialogs en menus schalen niet mee.
4. Lagere zoom toont meer rijen én kolommen (CSS + row/column-window).
5. Sticky kolommen blijven uitgelijnd; kolom-resize slaat 100%-px op.
6. Geen extra API-call bij load of zoom; geen data-refetch.
7. UI-teksten Engels; geen Fluent Tooltip.

---

## Wat is al gedaan (geen DevOps-tasks meer nodig tenzij verificatie)

| Item | Locatie |
|------|---------|
| PO-board tabel, sticky, row/column-window | `PurchaseOrdersBoardTable.jsx`, `useBoardRowWindow.js`, `useBoardColumnWindow.js` |
| Vaste rij-/headerhoogtes | `purchaseOrderBoardLayout.js` |
| Kolombreedtes in px | `columnTextStyleUtils.js`, `ResizableTableHeaderCell.jsx` |
| Topbalk (geen zoom-control) | `PurchaseOrdersPageTopBar.jsx` |

---

## Backlog — child User Stories

### #304 — Zoom-control en persist

Compacte Fluent-groep in de board-topbalk (− / % / + / Reset). Schaal in localStorage (`po:tableZoom:purchase-orders`), dunne module-store, CSS-var alleen op `.frame` via callback-ref.

**Acceptatiecriteria:**
1. Default 85%; stappen van 5%; grenzen 75% en 110%.
2. Reset alleen zichtbaar als schaal ≠ 85%.
3. Geen extra API; ongeldige storage → 85%.
4. Labels Engels; geen Fluent Tooltip.

### #305 — CSS-schaal van de PO-tabel

Font via Fluent-tokens × `--po-table-zoom`; layout-px via `poTableZoomedPx`; kolombreedtes en product-imagehoogte volgen de var.

**Acceptatiecriteria:**
1. Meer kolommen zichtbaar bij lagere zoom.
2. Headers, rijen, subitems en control-kolom schalen mee.
3. KPI-strip, dialogs, menus en hover-preview schalen niet.

### #306 — Virtualisatie, resize en sticky bij zoom

`getScale`/`subscribeScale` op row- en column-window. Resize in 100%-px. Sticky `left` uit meting blijft visuele px. Expanded-hoogtes: meting ÷ scale opslaan, hook × scale voor spacers.

**Acceptatiecriteria:**
1. Lagere zoom toont extra rijen (row-window klopt).
2. Kolom-resize bij zoom ≠ 100% persist 100%-maten (header én subitems).
3. Sticky kolommen blijven uitgelijnd.
4. Footer PATCH `v1.52.124` → `v1.52.125`.

---

## Volgorde en afhankelijkheden

1. #304 — zoom-control, persist en CSS-var op `.frame`.
2. #305 — layout/font/kolombreedtes (kan deels parallel na de CSS-var uit #304).
3. #306 — row/column-window, resize en sticky (hangt van #305 af).

De volledige API-contracten, UI-details, testmatrix en performance-eisen staan in het implementatieplan.

---

## Versie document

Aangemaakt op basis van [`.cursor/plans/dev_2026-09-02-po-table-zoom.plan.md`](../../.cursor/plans/dev_2026-09-02-po-table-zoom.plan.md); wijzig dit bestand bij nieuwe afspraken.

Repo-document: docs/devops/303-po-table-zoom.md

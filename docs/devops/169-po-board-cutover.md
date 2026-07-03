# PO-bord cutover naar de generieke tb_*-laag (DevOps)

**Feature:** [#AB:169](https://dev.azure.com/reyniervanbommel0745/Vendor-App/_workitems/edit/169)
**Doel:** Migreer het Purchase Orders-bord van de po_*-laag naar de generieke tb_*-laag (/api/data), zodat de fk_join lookup-verrijking (#161) en vrije kolomkeuze op het bord verschijnen.
**Plan:** [.cursor/plans/dev_2026-07-03-po-board-cutover-tb.plan.md](../.cursor/plans/dev_2026-07-03-po-board-cutover-tb.plan.md)
**Tags:** d365; table-builder; cutover; purchase-orders; tech-debt

---

## Aanpak

Gefaseerd (strangler-fig): eerst pariteit op de tb_*-laag bereiken, dan de databron omschakelen achter een vlag, dan po_* opruimen. Het bord blijft tot Fase 7 op po_*.

## Pariteitskloof (samenvatting)

Al aanwezig op tb_*: lezen/refresh/viewed, kolommen toevoegen/hernoemen/verwijderen, eigen celwaarden.
Ontbreekt (moet gebouwd): kolom-toggles, row-exclusions, write-back, cell history, sync-filter-beheer, refresh-progress + admin datamodel, de cutover-shape-mapping, decommission po_*.

## Child-stories

| Story | Fase |
|-------|------|
| #170 | Fase 1 — tb_* kolom-toggles (zichtbaarheid / write-back / visible-at-delete) |
| #171 | Fase 2 — tb_* row-exclusions |
| #172 | Fase 3 — tb_* write-back naar D365 |
| #173 | Fase 4 — tb_* cel-geschiedenis |
| #174 | Fase 5 — tb_* sync-filter-beheer per tabel |
| #175 | Fase 6 — refresh-progress + admin datamodel-endpoint |
| #176 | Fase 7 — board-cutover (databron omschakelen achter vlag) |
| #177 | Fase 8 — decommission po_* + live vendor-lookup vervangen |

## Response-shape-mapping (Fase 7)

`orders→rows`, `columns.header|line→meta.columns.master|detail`, `dataAreaId→partitionKey`, `orderNumber→recordKey`, `lineNumber→detailKey`, `lines→details`, `lineCount→detailCount`, `removedInD365→removedAtSource`, plus `historyByColumnId` (uit Fase 4).

## Versie document

Aangemaakt op basis van [.cursor/plans/dev_2026-07-03-po-board-cutover-tb.plan.md](../.cursor/plans/dev_2026-07-03-po-board-cutover-tb.plan.md); wijzig bij nieuwe afspraken.

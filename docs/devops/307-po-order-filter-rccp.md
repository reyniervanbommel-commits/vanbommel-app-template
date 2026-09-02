# PO-tabel inkooporder-filter → RCCP (DevOps)

**Doel:** De RCCP-strip onder de PO-tabel toont alleen vakjes van de zichtbare rijen (Order/status/KPI); `/rccp` krijgt auto-vendor, geen stille PO-subset; matrix-drill-down UI verdwijnt.  
**Referentie in repo:** [.cursor/plans/dev_2026-09-02-po-order-filter-rccp.plan.md](../.cursor/plans/dev_2026-09-02-po-order-filter-rccp.plan.md)  
**Spec:** [docs/specs/2026-09-02-po-order-filter-rccp-design.md](../specs/2026-09-02-po-order-filter-rccp-design.md)  
**Tags:** `rccp; po-board; filter`  
**Work item:** [Feature #307](https://dev.azure.com/ReyniervanBommel0745/Vendor-App/_workitems/edit/307)

---

## User story

**Als** planner (employee/admin; leverancier voor eigen orders)  
**wil ik** op de PO-tabel filteren op inkooporder (bestaande kolom Order) en RCCP daarop laten meebewegen  
**zodat** ik load en capaciteit van precies die order(s) zie, net zoals nu al voor vendor en item.

---

## Acceptatiecriteria (definitie van "klaar")

1. Filter op de Order-kolom beperkt de tabel zoals nu (equals / oneOf / contains).
2. RCCP-strip toont alleen PO-vakjes (en PO-measures in de matrix) van de zichtbare rijen, inclusief status- en KPI-filter.
3. Zelfde SKU op twee POs = twee vakjes; filter op één order houdt één vak. Analysis-segmenten hebben `poNumber` en mergen niet over POs.
4. Item-filter + Order = AND op segmenten.
5. Zichtbare rijen delen één vendor → strip laadt die vendor zonder vendor-kolomfilter. Twee vendors → geen auto-vendor.
6. `/rccp` in hetzelfde tabblad: bestaande vendor-veld voor-ingevuld (filter of auto-vendor); grafiek vendor-breed; geen stille PO-subset; geen extra picker/chip.
7. Geen nieuwe klik van grafiekvakje → tabel-filter op ordernummer. Bestaande item-klik blijft.
8. Matrixklik opent geen drill-down-panel; geen pointer/`Show purchase order lines` op weekcellen. `GET /api/rccp/drill-down` blijft.
9. Geen extra `/rccp/analysis`-call per order. Engelse UI. Versie PATCH in `src/config/version.js`.

---

## Wat is al gedaan (geen DevOps-tasks meer nodig tenzij verificatie)

| Item | Locatie |
|------|---------|
| BRD + FRD + TD | `docs/specs/2026-09-02-po-order-filter-rccp-design.md` |
| Bouwplan (8 taken) | `.cursor/plans/dev_2026-09-02-po-order-filter-rccp.plan.md` |
| Item-filter strip | `src/components/rccp/rccpChartItems.js`, `RccpSplitStrip.jsx` |
| Vendor-handoff | `src/utils/poVendorFilterHandoff.js` |

---

## Backlog — child User Stories

### Story A: Analysis-segmenten per inkooporder ([#308](https://dev.azure.com/ReyniervanBommel0745/Vendor-App/_workitems/edit/308))
**Beschrijving:** `buildPoSegments` emit `poNumber` en merget dezelfde SKU niet over POs.  
**Acceptatiecriteria:**
1. Segment heeft `poNumber` (= `recordKey`).
2. Zelfde SKU op twee orders = twee vakjes.
3. Bestaande segment-tests groen na default `poNumber`.

### Story B: Strip volgt zichtbare rijen + auto-vendor ([#309](https://dev.azure.com/ReyniervanBommel0745/Vendor-App/_workitems/edit/309))
**Beschrijving:** Client-compositor (item AND PO) op de geladen chart; vendor uit gedeelde zichtbare rijen.  
**Acceptatiecriteria:**
1. Order/status/KPI-filter → strip alleen die vakjes.
2. Één gedeelde vendor zonder kolomfilter → strip laadt die vendor.
3. Twee vendors → geen auto-vendor. Geen extra analysis-call.

### Story C: Handoff auto-vendor + drill-down UI weg ([#310](https://dev.azure.com/ReyniervanBommel0745/Vendor-App/_workitems/edit/310))
**Beschrijving:** sessionStorage v1 met `derivedVendor`; `/rccp` vult vendor-veld; matrix-drill-down panel weg.  
**Acceptatiecriteria:**
1. `/rccp` toont dezelfde vendor, grafiek vendor-breed, geen stille PO-set.
2. Ongeldige handoff → null; legacy unwrap blijft werken.
3. Matrixklik opent geen panel; drill-down-API blijft.

---

## Versie document

Aangemaakt op basis van [.cursor/plans/dev_2026-09-02-po-order-filter-rccp.plan.md](../.cursor/plans/dev_2026-09-02-po-order-filter-rccp.plan.md); wijzig dit bestand bij nieuwe afspraken.

Repo-document: docs/devops/307-po-order-filter-rccp.md

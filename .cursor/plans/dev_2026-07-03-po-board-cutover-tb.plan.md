---
name: po-board-cutover-tb
overview: Migreer het Purchase Orders-bord (de hoofd-tabelpagina) van de po_*-laag naar de generieke tb_*-laag (/api/data), zodat lookup-verrijking (leveranciers/artikelen, #161) en vrije kolomkeuze op het bord verschijnen. Grote, gefaseerde migratie: eerst pariteit op de tb_*-laag bereiken (write-back, row-exclusions, cell history, sync-filters, kolom-toggles, refresh-progress, datamodel), dan de databron omschakelen, dan po_* opruimen. Strangler-fig: po_* blijft leidend tot de cutover-vlag om gaat.
todos:
  # --- Fase 1: kolombeheer-pariteit (medium) ---
  - id: tb-column-toggles
    content: tb_* kolom-toggles - visibility, writeback-config, visible-at-delete (+ migratie tb_columns.visible_at_delete), incl. bulk; routes op /api/data/:tableKey/columns/:id/*.
    status: pending
  # --- Fase 2: row-exclusions (hoog) ---
  - id: tb-row-exclusions
    content: tb_row_exclusions-tabel + service + routes (exclude / hidden-in-filter / include) + read-integratie (verborgen rijen niet tonen, wel terugzetbaar).
    status: pending
  # --- Fase 3: write-back naar de bron (hoog) ---
  - id: tb-writeback
    content: SourceProvider.writeField (D365ODataProvider PATCH met If-Match) + POST /api/data/:tableKey/correct; hergebruik bestaande tb_field_corrections (uit 011). Kolom writable/write_mechanism-config.
    status: pending
  # --- Fase 4: cell history (hoog) ---
  - id: tb-cell-history
    content: tb_cell_history (of afgeleid uit tb_field_corrections + tb_custom_values audit) + GET /api/data/:tableKey/history + historyByColumnId-hints in read().
    status: pending
  # --- Fase 5: sync-filter-beheer per tabel (hoog) ---
  - id: tb-sync-filters
    content: Per-tabel filteropslag (tb_tables.default_filter_json) i.p.v. globale PO_SYNC_RULES; validatie/compile; PUT sync-filters + POST sync-filters/count; refresh gebruikt de per-tabel filter.
    status: pending
  # --- Fase 6: refresh-progress + admin datamodel (medium/hoog) ---
  - id: tb-refresh-progress-datamodel
    content: Refresh-progress-tracker + GET /:tableKey/refresh/progress; generiek datamodel-endpoint (entities/relation/columns/cache-stats/filter-catalog/preview) voor de admin-pagina.
    status: pending
  # --- Fase 7: de eigenlijke cutover (hoog) ---
  - id: board-cutover
    content: usePurchaseOrdersPage naar /api/data/purchase-orders achter een vlag; shape-mapping in applyData (rows->orders, meta.columns.master|detail->header|line, partitionKey->dataAreaId, recordKey->orderNumber, details->lines, removedAtSource->removedInD365); board-settings/saved-views keys valideren tegen tb_-kolom-keys.
    status: pending
  # --- Fase 8: decommission (cleanup) ---
  - id: decommission-po
    content: Na stabiele DEV+PROD-validatie: po_*-routes/services/tabellen uitfaseren; live vendor/item-enrichment (fetchVendorsByAccounts) vervangen door de fk_join-lookup.
    status: pending
isProject: false
---

# Implementatieplan — PO-bord cutover naar de generieke tb_*-laag

## Doel
Het inkooporderbord (`src/components/supplier/PurchaseOrdersPage.jsx` via `usePurchaseOrdersPage.js`) leest nu uit `/api/purchase-orders` (po_*-laag). Migreer het naar `/api/data/purchase-orders` (tb_*-laag), zodat de fk_join lookup-verrijking uit #161 (leveranciersnaam op de kop, artikelnaam op de regel) én vrije kolomkeuze uit vendors/items op het bord verschijnen.

## Waarom gefaseerd (en niet in één keer)
De tb_*-laag mist ~8 bord-features. De cutover mag pas als de tb_*-laag pariteit heeft; anders breekt het bord (verwijderen, write-back, history, filters, saved views). Strangler-fig: po_* blijft leidend achter een feature-vlag tot de tb_*-laag compleet en gevalideerd is.

## Pariteitskloof (samenvatting van de analyse)

**Al aanwezig op tb_* (`/api/data`):** lezen+lazy refresh, refresh, viewed, kolommen lezen/toevoegen/hernoemen/(soft)verwijderen, eigen celwaarde opslaan.

**Ontbreekt op tb_* — moet gebouwd worden:**
1. Row-exclusion-trio (`/rows/exclude|hidden-in-filter|include`) — geen user-exclusion in tb_cache. **Nieuw: `tb_row_exclusions`.**
2. Write-back naar D365 (`/correct` + writeback-toggle) — bewust uitgesteld (Fase C). `tb_field_corrections` bestaat al (uit 011).
3. Cel-geschiedenis (`/history` + `historyByColumnId` in read) — geen `tb_cell_history`.
4. Sync-filter-beheer (`PUT /sync-filters`, `POST /sync-filters/count`, filterdeel van `/datamodel`) — refresh leest nog globale `PO_SYNC_RULES`.
5. Kolom-toggles: visibility, writeback-config, visible-at-delete (kolom bestaat niet in tb_columns).
6. Refresh-progress (`/refresh/progress`).
7. Admin datamodel-endpoint (cache-stats + filter-catalog + preview).
8. Hard-delete vs soft-delete van kolommen (gedragsbesluit).

**Response-shape-mapping (Fase 7):** `orders→rows`, `columns.header|line→meta.columns.master|detail`, `dataAreaId→partitionKey`, `orderNumber→recordKey`, `lineNumber→detailKey`, `lines→details`, `lineCount→detailCount`, `removedInD365→removedAtSource`. En `historyByColumnId` moet in de tb_-read komen (Fase 4).

**Board-agnostisch, blijft op `/api/supplier`:** board-settings (kolomlayout) en saved views werken al via `boardKey`; alleen de kolom-keys moeten matchen met de tb_-kolom-keys.

## Fasering
Zie de todos. Elke fase is los te shippen en te testen op DEV; het bord blijft tot Fase 7 op po_*. Fase 7 zet de vlag om; Fase 8 ruimt po_* op.

## Risico's
- Grootste risico zit in Fase 7 (shape-mapping) en Fase 2/3/4 (exclusion/write-back/history — nieuwe tabellen + bron-schrijfpad).
- `column.key`-consistentie tussen po_columns en tb_columns (011 heeft de keys 1-op-1 gemigreerd, dus board-settings/saved-views blijven matchen — verifiëren).
- Non-destructief tot de cutover: geen po_*-verwijdering vóór Fase 8.

## Aansluiting
Bouwt voort op #161 (vendors/items + fk_join) en de generieke tb_*-laag (#152/#139). Verwijst naar de eerder gekozen generieke-platform-richting.

# PO-board: Excel-export van headers én orderregels

## BRD

**Als** gebruiker van het purchase-orderboard (admin, employee of supplier)
**wil ik** bij Download to Excel kunnen kiezen of alleen orderheaders of ook de orderregels meegaan
**zodat** ik line-level data (item, qty, datums) in Excel kan analyseren of delen, zonder elke PO op het bord open te klappen.

**Probleem nu:** de Excel-download schrijft alleen header-rijen. Regels zitten niet in de board-payload (bewust, payloadgrootte) en staan ook niet in het exportbestand. Wie regels nodig heeft, moet per order expanden of in D365 kijken.

**Succes (toetsbaar):**
- Bestaande *All orders* / *Current view* blijven header-only en werken ongewijzigd.
- Er zijn twee extra keuzes die een werkboek downloaden met sheet **Orders** (headers) én sheet **Lines** (één rij per regel).
- *Current view with lines* exporteert de regels van de orders die de huidige board-filters tonen; *All orders with lines* van alle geladen board-orders.
- Leverancier ziet in Excel alleen eigen orders/regels (zelfde scope als het bord).
- Zichtbare kolommen en celopmaak sluiten aan op het bord (geen thumbnails/remarks).

**Non-goals:**
- RCCP- of andere pagina-exports.
- D365-importformaat, e-mailen van het bestand, geplande/server-side rapporten.
- Product images en remarks-threads in Excel.
- Board-payload weer vullen met alle `details` (`includeDetails=1` als default).
- Line-filters van één opengeklapte subtabel meenemen (die zijn lokaal per rij, niet board-breed).
- Visibility-toggles voor line-kolommen (die bestaan niet); export volgt de subtabel-volgorde.

**Constraints:**
- Geen N+1 `GET .../details` per order.
- Geen `?includeDetails=1` op de bestaande board-read (niet in board-state mengen; te zware JSON).
- Zelfde sessie-auth en supplier-scoping als `/api/data/purchase-orders`.
- Fluent UI v9, Engelse UI-teksten.
- `PurchaseOrdersPage.jsx` eindigt op **≤299 regels** (staat nu op 300). Exportlogica in util + hook + menu; geen extra props door TopBar/SavedViews.
- OTAP local-first: ontwikkelen op localhost, geen push zonder verzoek.
- Formattering via bestaande `formatCellValue` (zelfde als het bord).

## FRD

**Gekozen approach:** A — extra menu-items + twee sheets + één bulk-details-call. Header-only blijft synchroon en goedkoop. Lines-export haalt slanke details op voor de gekozen order-keys, bouwt lokaal het `.xlsx`.

**Afgewezen:**
- B — eenmalig `GET /api/data/purchase-orders?includeDetails=1`: hergebruikt de board-read, maar stuurt history/track-marks/ledger mee (tientallen MB), traag, en past slecht bij *current view* (alles ophalen, daarna filteren).
- C — N+1 per-order details of één plat blad met herhaalde headerkolommen: traag bij veel PO’s; plat blad is breed en minder bruikbaar voor draaitabellen.

**Happy path**
1. Gebruiker opent het view-menu → *Download to Excel* (bestaand nested menu).
2. Kiest *All orders* of *Current view (filters applied)* → zelfde header-only Excel als nu (één sheet).
3. Kiest *All orders with lines* of *Current view with lines*.
4. UI toont korte busy-staat (*Preparing Excel…*) **in het export-menu**; menu-acties zijn geblokkeerd tot klaar.
5. Client POSTet `{ keys: [{ partitionKey, recordKey }] }` — `partitionKey` = order.`dataAreaId`, `recordKey` = order.`orderNumber` — van `allItems` of `processedItems`. Meer dan 5000 orders: opeenvolgende POSTs van max 5000 keys, daarna één werkboek.
6. Server geeft slanke details terug (alleen `detailKey` + `values`, lookups meegenomen).
7. Browser downloadt `purchase-orders-{all-orders|current-view}-with-lines-YYYY-MM-DD.xlsx` met:
   - sheet **Orders**: huidige header-export (zichtbare headerkolommen).
   - sheet **Lines**: kolommen `Order number`, `Company`, daarna exportbare line-kolommen in subtabel-volgorde. Eén rij per regel. Order number en Company komen van de parent-order, niet van optionele line-velden.
8. Orders zonder regels: wel op Orders, geen rijen op Lines. Geen dummy-rij.

**Rollen:** admin, employee, supplier — zelfde zichtbaarheid als de huidige Download to Excel. Geen extra `requireRole`. Supplier: alleen keys in eigen vendor-scope; overige keys worden stil weggelaten (geen 403 op een gemengde lijst).

**Leeg:**
- Geen orders in scope: header-only blijft een sheet met alleen kolomkoppen (huidig gedrag). With-lines: Orders-sheet met koppen, Lines-sheet met koppen, 0 datarijen. Bestand wordt wel gedownload.
- Order met `lineCount` 0: geen line-rijen voor die PO.

**Fout:**
- Details-call faalt (timeout, 401, 403, 5xx): geen half bestand. Engelse fout in het menu: `Could not export order lines`. Header-only pad blijft synchroon en zonder deze call.
- Validatie 400 (te veel keys, ongeldige body, te veel detailrijen): zelfde fouttekst, geen download.
- Dubbelklik / tweede export terwijl de eerste loopt: negeren.

**Overlap:** één export tegelijk per tab. Geen gedeelde server-job. Twee gebruikers exporteren onafhankelijk; bron is `tb_cache` (zelfde als het bord).

**UI:**
- Nested Fluent `Menu` in `PurchaseOrderExportMenu.jsx`, vier items, Engels:
  - `All orders`
  - `Current view (filters applied)`
  - `All orders with lines`
  - `Current view with lines`
- Geen `<Tooltip>` in het menu. Icoon op de with-lines-items mag hetzelfde `TableRegular`/`FilterRegular` blijven; onderscheid zit in het label.
- Busy en fout blijven **lokaal in `PurchaseOrderExportMenu`**: `aria-busy` op de trigger, disabled items, trigger-label tijdelijk `Preparing Excel…`. Bij falen een korte Engelse tekst in het menu (`Could not export order lines`), geen `pageModel.error` / refresh-dialog.
- Vier named `useCallback`-handlers in het menu (geen inline `onClick={() => …}`).

**Zichtbaarheid:** Excel bevat geen extra velden t.o.v. wat de gebruiker op het bord mag zien. Supplier krijgt geen regels van andere vendors, ook niet als keys worden gespoofed.

**Hergebruik:** `src/utils/purchaseOrderBoardExport.js`, `formatCellValue`, `getExportableColumns`, board-rijen (`allItems` / `processedItems`), `orderedLineColumns`. Geen `mapTbDetailToBoardLine` (die trekt board-flags mee). Nieuwe POST naast bestaande `GET .../details` (die blijft voor expand).

## TD

Geen SQL-migratie. Geen nieuwe tabel. Excel blijft client-side (`xlsx`), dezelfde library als nu.

### Hergebruik (paden)

- Export-matrix: [src/utils/purchaseOrderBoardExport.js](src/utils/purchaseOrderBoardExport.js) — `buildBoardExportMatrix` blijft; nieuw puur `buildLinesExportMatrix(orders, lineColumns, detailsByKey)`. Dunne `writeWorkbook([{ name, matrix }])` voor I/O. Header-only pad blijft de huidige writer (één sheet). Cellen die beginnen met `=`, `+`, `-` of `@` krijgen een leidende `'` (ook op het bestaande header-pad, zelfde helper).
- Menu: [src/components/supplier/PurchaseOrderExportMenu.jsx](src/components/supplier/PurchaseOrderExportMenu.jsx) — `onExportExcel(scope, { includeLines })` returns een Promise. Busy + fout lokaal in dit component. Vier named `useCallback`s. Geen extra props op TopBar of SavedViewsControl (blijft één `onExportExcel`).
- Page: [src/components/supplier/PurchaseOrdersPage.jsx](src/components/supplier/PurchaseOrdersPage.jsx) staat op 300 regels. Vervang de bestaande 8-regel `handleExportExcel` 1-op-1 door een hook-call van max 8 regels. Geen `exporting`, geen extra error-prop, geen nieuwe `useState`. Eindstand ≤299 regels.
- Hook: [src/hooks/usePurchaseOrderExcelExport.js](src/hooks/usePurchaseOrderExcelExport.js) (geen JSX). Return alleen `{ handleExportExcel }` via `useMemo`. Inputs: `allItems`, `processedItems`, `headerColumns`, `lineColumns`. POST-resultaat is een lokale const, niet `useState`. `usePurchaseOrderLineDetails` niet aanraken. Unmount: cancelled-flag in `useEffect`-cleanup; na await geen `writeFile` als cancelled. `apiRequest` niet uitbreiden met AbortSignal.
- Kolommen: `visibleHeaderColumns` + `orderedLineColumns` uit [src/hooks/usePurchaseOrdersPage.js](src/hooks/usePurchaseOrdersPage.js) — die hook niet verder uitbreiden.
- Auth-allowlist: [server/middleware/dataAccess.js](server/middleware/dataAccess.js) + [server/middleware/dataAccess.test.js](server/middleware/dataAccess.test.js).
- Supplier-keys: [server/utils/supplierRowAccess.js](server/utils/supplierRowAccess.js). Voor dit endpoint geen 60s `_visibleKeyCache`: `loadSupplierVisibleRowKeysFresh` (of `{ fresh: true }`) met `userId`. Geen `assertSupplierPurchaseOrderRow` in een loop.

### Extractie (verplicht)

Nieuwe [server/services/tableDetailProjection.js](server/services/tableDetailProjection.js):

- Verplaats hierheen: `loadLookupEnrichmentCached`, `invalidateLookupEnrichmentCache`, en slanke `projectDetailValues` die alleen `{ detailKey, values }` bouwt (lookups + custom values; geen history/track/ledger).
- [server/services/TableDataService.js](server/services/TableDataService.js) importeert die module; `buildDetailRow` gebruikt `projectDetailValues` en hangt flags eromheen. Netto TDS krimpt; publieke API van TDS wordt niet breder.
- [server/services/PoExportDetailsService.js](server/services/PoExportDetailsService.js) + testbestand: importeert `tableDetailProjection` en bestaande db-helpers (`getPool` / `getTableByKey`). Importeert **niet** TableDataService. TDS importeert PoExportDetailsService niet (geen cyclus).

### Nieuw endpoint

Hardcoded `POST /api/data/purchase-orders/export-details` in [server/routes/data.js](server/routes/data.js). Niet `POST /:tableKey/export-details`. Mount achter `requireSession` + `restrictSupplierDataAccess`.

**Allowlist:** `method === 'POST' && rel === '/purchase-orders/export-details'`. Tests: supplier POST dat pad → next(); supplier POST `/vendors/export-details` → 403.

**Body (enige contract):** `{ "keys": [ { "partitionKey": string, "recordKey": string } ] }`

- 0 items → 200 `{ details: [] }`. Meer dan 5000 → 400 `Invalid export keys`.
- `partitionKey` trim 1–32; `recordKey` trim 1–128. Anders 400.
- Ontdubbelen server-side. Herserialiseren tot JSON van alleen gevalideerde keys; nooit raw `req.body` als SQL-parameter.

**Supplier, volgorde:** (1) verse zichtbare keyset, (2) intersectie, (3) alleen toegestane keys naar OPENJSON. Test: gespoofde vreemde `recordKey` ontbreekt in de JSON. Lege intersectie → `{ details: [] }`, 200.

**SQL:** `OPENJSON(@keysJson) WITH (partitionKey nvarchar(32), recordKey nvarchar(128))` join op `tb_cache` (`scope = 'detail'`) en `tb_custom_values`. `time('tb_export_details_sql', ...)`.

**Caps:** max 50 000 detailrijen; daarboven 413 `Export too large`. Geen history/track/ledger.

**Items-syncfilter:** niet opnieuw toepassen (zelfde als `readRowDetails`).

**Logging:** `logger.info` met `userId`, `keyCount`, `detailCount`, status — geen celwaarden.

### Client-flow

1. Keys uit `scope === 'view' ? processedItems : allItems`.
2. Header-only: bestaande synchrone writer, geen POST.
3. With-lines: chunks van max 5000 keys via `apiRequest` (`method: 'POST'`, `body: { keys }`). Merge in een lokale Map.
4. `buildLinesExportMatrix` + `writeWorkbook`; `measure('po_excel_export', ...)`.
5. Bestandsnaam: `buildExportFileName(scope, { includeLines })` → suffix `-with-lines`.

### Volgorde

1. `tableDetailProjection.js` extract; bestaande details-tests blijven groen.
2. Pure export-matrix + tests: header-only regressie; twee sheets; skip image/remarks; formule-prefix.
3. `PoExportDetailsService` + intersect-vóór-SQL-tests; route + dataAccess-allowlist.
4. Hook + menu (busy/error lokaal); page: 8-regel replace, ≤299.
5. Patch `APP_VERSION` in [src/config/version.js](src/config/version.js).

### Perf

- Header-only: geen extra `apiRequest`.
- With-lines: één POST per chunk van 5000 keys (typisch één call bij ~2000 orders).
- Geen N+1 details, geen tweede board-read, geen vullen van `lineDetails`.
- Lookups via de bestaande `loadLookupEnrichmentCached` (één cache).
- Server-Timing `tb_export_details_sql`; client `apiRequest` + `measure('po_excel_export')`.

### Auth / security

- Session verplicht. Input-validatie server-kant (5000 keys, 50 000 detailrijen).
- Supplier-scope: verse keyset, intersectie vóór SQL.
- Formule-injectie: `'`-prefix op cellen die beginnen met `=`, `+`, `-`, `@`.
- Geen secrets in Excel.

### Aantoonbaar

Op `http://localhost:5178` (PO TABEL): *All orders* = alleen Orders-sheet. *Current view with lines* na een header-filter = alleen die PO’s, Lines koppelt via `Order number`. Leverancier: geen vreemde vendor-PO’s. Foutpad: menu toont `Could not export order lines`, geen kapot `.xlsx`.

## Zelfbeantwoorde beslissingen (grill)

| Vraag | Keuze |
|---|---|
| Wie | Alle board-rollen, zelfde menu |
| Altijd lines vs optie | Optie; header-only blijft |
| Excel-vorm | Twee sheets, niet plat |
| Current view | Alle regels van zichtbare header-orders |
| Data | Bulk POST, geen N+1, geen includeDetails=1 |
| Images/remarks | Niet exporteren |
| D365-importsheet | Nee |

# PO-board: remarks-zoekfilter

## BRD

**Als** medewerker of leverancier (eigen orders)
**wil ik** purchase orders filteren op remarktekst, inclusief oudere remarks
**zodat** ik de juiste order terugvind zonder elke thread te openen.

**Probleem nu:** een order is via remarktekst niet terug te vinden. De Remarks-kolom heeft geen filter. De cel toont alleen de laatste remark. Oudere remarks bestaan wel in de thread, maar je moet per rij het panel openen om ze te zien. Orders met relevante oude remarks blijven onzichtbaar in de tabel.

**Succes (toetsbaar):**
- De Remarks-kolom heeft een Filter in het kolommenu, net als andere tekstkolommen (Apply).
- Na Apply toont het board alleen orders waarvan minstens één **actieve** remark (ook oudere, niet alleen de laatste in de cel) de zoekterm bevat.
- Zonder remarks-filter blijft de board-load even snel als nu (geen extra remarkbodies in de rijen, geen JOIN in de hoofdtabel-query).
- Leveranciers zien alleen matches op hun eigen orders (bestaande vendor-scope).

**Non-goals:**
- Sorteren op Remarks.
- Unique-value-picker of `is one of`-lijst van remarkteksten.
- SQL Full-Text catalog in deze versie.
- Zoeken in soft-deleted remarks.
- Remarkbodies in de board-payload of in de hoofdtabel-query.
- Apart zoekscherm of globale remarks-zoekpagina.
- D365-headercomments naast onze `tb_row_remarks`.

**Constraints:**
- Board-load, scroll en filteren op andere kolommen mogen niet trager worden.
- Bestaande auth en vendor-scope blijven: leverancier ziet alleen eigen orders.
- Remarks blijven buiten `order.values`; de summary blijft count + laatste preview.
- Bestaande kolomfilters, saved views en Apply-gedrag blijven werken.
- UI-teksten in het Engels.

## FRD

**Gekozen approach:** A — bij Apply één search-API die matching order-sleutels (`partitionKey` + `recordKey`) teruggeeft. De client houdt die rijen over en combineert ze AND met de overige kolomfilters. Board-load, summary en `order.values` blijven ongewijzigd.

**Afgewezen:**
- B — remarkteksten of zoekblob in de summary: elke board-load wordt zwaarder; schendt BRD-constraint.
- C — alleen `latest.bodyPreview` client-side: mist oudere remarks; schendt succes-criterium.

**Happy path**
1. Gebruiker opent het kolommenu van Remarks (staff of leverancier op het PO-board).
2. Filter-sectie is zichtbaar. Enige operator: `contains`. Geen sort, grouping, unique-value-picker of `is one of`.
3. Gebruiker typt een zoekterm (≥ 2 tekens na trim) en klikt Apply.
4. Eén request naar de remarks-search-API. Response: lijst matching sleutels.
5. Het board toont alleen orders waarvan minstens één actieve remark (ook oudere) de term bevat, case-insensitive. Andere actieve kolomfilters blijven gelden (AND).
6. De zoekterm staat in `filterByColumn` (key `remarks`), in saved views, en in de active-filters-flyout. Wissen gaat via Clear op de kolom of in de flyout.

**Rollen:** admin, employee en supplier. Zelfde board-zichtbaarheid als nu. Supplier-search is beperkt tot eigen orders (bestaande vendor-scope). Geen extra rol.

**Leeg:**
- Geen matches: bestaande lege board-state (geen extra empty-copy).
- Eerste search in-flight (`enabled` en `matchKeys === null`): board toont **geen** rijen (wacht), niet de volle set.
- Term korter dan 2 tekens: Apply wijzigt de rijen niet; validatie in het menu (Engels).
- Orders zonder remarks matchen `contains` niet.

**Fout:** search-API faalt of timeout: Engelse toast (`AbortError` geen toast). Filterwaarde blijft in het menu staan. De laatste geslaagde key-set blijft staan; het board valt niet terug naar alle rijen. Gebruiker kan opnieuw Apply of Clear.

**Overlap:** `filterByColumn.remarks` is de intentie; de laatste geslaagde key-set is het resultaat. `null` key-set alleen als het remarks-filter inactief is. Kolommenu en flyout wijzigen dezelfde `filterByColumn`. Twee snelle Applies: laatste geslaagde response wint (abort/negeer oudere). Unique-values van andere kolommen blijven **gevuld** (remarks is geen `order.values`-filter); ze hoeven niet te cascaden op remarks-matches. Extra tabs blijven werken. KPI-counts volgen wél het remarks-gefilterde board.

**UI:** bestaand Remarks-kolommenu (Fluent v9). Engels. Labels zoals de rest van het board (`contains`, `Apply`, `Clear`). Operator-flyout verbergen als er maar één operator is. Geen extra scherm. Geen `<Tooltip>` in de board-rijen. Sort/grouping/rename/text-style blijven uit voor Remarks.

**Zichtbaarheid:** search-resultaten volgen dezelfde vendor-scope als `/remarks/summary`. Geen remarkbodies in de search-response, alleen sleutels. Soft-deleted remarks tellen niet mee.

**Hergebruik:**
- Kolommenu: bestaande Filter-sectie; `showSort`/`showFilter` afleiden van `column.dataType` (geen extra props door de menu-keten). Remarks is geen image voor Filter/Hide.
- Filterstate: `applyColumnFilter` / `clearColumnFilter` / saved views.
- Value-pass skip: één helper in `tableViewFilterUtils` (niet in de table-view-hook).
- Flyout: bestaande editor, locked `contains`, zelfde min-2-helper als het kolommenu.
- Auth/scope: zelfde allowlist- + vendor-scope-patroon als `/remarks/summary`.
- Calls: `apiRequest` (niet raw `fetch`).

**Acceptatiecriteria**
1. Remarks-kolommenu toont Filter met alleen `contains`; sort en unique-picker ontbreken.
2. Apply met ≥ 2 tekens filtert het board op actieve remarks in de hele thread, niet alleen de laatste cel.
3. Combineert AND met andere kolomfilters; blijft in saved views en in de active-filters-flyout.
4. Zonder remarks-filter: geen extra search-call, board-load even zwaar als nu.
5. Supplier ziet alleen eigen orders; 403/lege set bij scope-overschrijding zoals elders.
6. API-fout: toast, laatste matches blijven, filter blijft staan; geen terugval naar alle rijen.
7. Soft-deleted remarks en D365-comments zitten niet in de zoekresultaten.
8. Unique-values van andere kolommen blijven gevuld (niet leeg door remarks); KPI-counts volgen het remarks-gefilterde board; BI-charts krijgen het remarks-filter niet.

## TD

**Hergebruik (paden):**
- Route: `server/routes/data.js` — `GET /:tableKey/remarks/search` direct onder `GET /:tableKey/remarks/summary`, vóór `GET /:tableKey/remarks`.
- Search-read: nieuwe `server/services/RowRemarksSearchService.js` (`searchRemarks`). `RowRemarksService.js` (327) niet groter maken; hoogstens re-export.
- Validatie: `normalizeSearchQuery` in `server/services/RowRemarksValidation.js`.
- Allowlist: `server/middleware/dataAccess.js` (`GET /purchase-orders/remarks/search`) + `dataAccess.test.js`.
- Vendor-scope: na SQL `loadSupplierVisibleRowKeys` + `filterRowsForSupplier` (`server/utils/supplierRowAccess.js`), zelfde als summary.
- Sleutel: `rowKey(partitionKey, recordKey)` in `remarksFormatters.js` = `dataAreaId`/`orderNumber`.
- Value-pass skip: in `columnValueMatchesFilter` in `src/utils/tableViewFilterUtils.js` (`dataType === 'remarks'` is geen celwaarde → match `true`, zodat unique-pickers/tabs niet leeg lopen). `hasActiveFilter` telt remarks wél. `usePurchaseOrderTableView.js` blijft ongewijzigd.
- Search-hook: `src/components/supplier/remarks/useRemarksColumnFilter.js` + `.test.jsx`; export in `remarks/index.js`. Brug `usePurchaseOrderRemarksFilterBridge` wordt **in** `usePurchaseOrderBoardView` aangeroepen ná extractie van `applyBoardMatchKeys` (net ≤300). Toast in de brug, niet in de data-hook.
- Intersectie: `applyBoardMatchKeys({ processedItems, remarksFilterEnabled, remarksMatchKeys, kpiMatchKeys, kpiFilterKey, kpiQtyOverlay })`. Als `remarksFilterEnabled && remarksMatchKeys == null` → `columnFiltered = []`. Als filter uit → `processedItems`. Anders filter op `rowKey`. Daarna KPI. `kpiSourceItems` = `columnFiltered`.
- Importers van `searchRemarks` gaan naar `RowRemarksSearchService.js`; geen re-export via `RowRemarksService.js`.
- Grouping op Remarks blijft uit (expliciet, niet via de image-alias).
- BI-strip: `filtersFromColumnMap` in `src/utils/biChartFetchKey.js` slaat remarks over (zelfde “geen value-kolom”-regel).
- Min-2: één helper (bijv. in `tableViewFilterUtils`); gate in `usePurchaseOrderSortFilterActions` en `PurchaseOrdersActiveFilterEditor`.
- Calls: `apiRequest`. Timing: `time('remarks_search_sql', …)`. Toast: `useAppToast` in de board-consumer, niet in de data-hook.

**Schema:** geen migratie, geen nieuwe kolom, geen JSON-property. `tb_columns.filterable = 0` blijft. Geen Full-Text.

**Auth:** bestaande `requireSession` + `restrictSupplierDataAccess`. Geen nieuwe rol. Ongeldige `q`: HTTP 400, Engelse tekst. Geen remarkbodies in response of logs.

**Contract**
- `GET /api/data/:tableKey/remarks/search?q=`
- `q`: string (geen array bij dubbele queryparams), trim, NFC, 2–200 tekens; alle C0/C1 control characters (inclusief tab/LF/CR) afwijzen; anders 400.
- Bind: `sql.NVarChar(200)` voor `@q`.
- SQL: `SELECT DISTINCT partition_key, record_key` — geen `body`, geen `SELECT *`. `table_id = @tableId`, `detail_key = -1`, `is_deleted = 0`, `CHARINDEX(@q, body COLLATE Latin1_General_CI_AS) > 0`.
- Response 200: `{ keys: [{ partitionKey, recordKey }] }`.
- Supplier: in-memory visible-keys na SQL; 200 met lege `keys` is oké. Verplichte IDOR-test: supplier krijgt nooit keys buiten `visibleKeys`. 403 alleen bij verkeerde allowlist/`tableKey`, niet bij geen hits.
- `q` niet in applicatielogs.

**Client-dataflow**
1. Remarks in `filterByColumn` is geen `order.values`-filter (gedeelde skip). Anders wordt het board/unique-pickers/tabs leeg.
2. `useRemarksColumnFilter({ query, enabled })`: `enabled` alleen bij actieve `contains` + geldige term. Dependency: de remarks-term, **niet** heel `filterByColumn`. AbortController bij term-wissel/unmount. Return `{ matchKeys, loading, error }` (stabiel via `useMemo`).
3. `matchKeys === null` alleen als remarks-filter inactief is. In-flight: vorige Set houden, keys niet wissen bij fetch-start. Eerste fetch (`enabled` + `matchKeys === null`): board toont geen rijen (wacht), niet de volle set. Lege Set na succesvolle 0 hits.
4. Intersectie: `rowKey(order.dataAreaId, order.orderNumber)`. Eerst remarks, dan KPI. Zonder remarks-filter: geen call.
5. Fout: vorige Set blijft; `error` gezet; consumer toasts; `AbortError` negeren. Clear: filter weg, abort, `matchKeys = null`.

**UI**
- `usePurchaseOrderColumnMenuFlags.js`: remarks niet als image voor Filter/Hide. Image blijft `readOnlyColumnMenu`. Geen extra return-waarden voor sort/filter (MainPane heeft `column` al).
- `PurchaseOrderColumnFilterMenuMainPane.jsx` / PopoverContent: `showSort`/`showFilter` afleiden van `dataType === 'remarks'`. Geen kleurfilter-sectie op Remarks. Geen extra props door FilterMenu (~298).
- Unique values: niet berekenen voor Remarks (`!open || isDate || remarks`).
- Operator: alleen `contains` (constants, niet in het 298-bestand). Operator-flyout verbergen als `operatorEntries.length === 1`.
- Apply < 2 tekens: geen state-change, geen API; `Enter at least 2 characters`.
- Flyout: locked `contains`, geen unique-picker, zelfde helper.
- Geen extra `useState` in FilterMenu.

**Bestandsgrootte**
- `usePurchaseOrderTableView.js` (343): ongewijzigd (skip zit in `columnValueMatchesFilter`).
- `usePurchaseOrderBoardView.js` (297): extractie + één brug-aanroep, net ≤300. Fetch zit in `useRemarksColumnFilter`.
- `RowRemarksService.js` (327): geen `searchRemarks` erin.
- `PurchaseOrderColumnFilterMenu.jsx` (298): geen extra flags/sectie.
- Nieuwe files: `RowRemarksSearchService.js` + test, `useRemarksColumnFilter.js` + test, eventueel `applyBoardMatchKeys.js` helper.

**Volgorde**
1. `normalizeSearchQuery` + `searchRemarks` + route + allowlist + IDOR-test.
2. Value-pass helper + BI-strip + hook + board-helper.
3. Menu/flyout afleiden, min-2-helper, tests.
4. Footer PATCH in `src/config/version.js` (nu `v1.52.20` → `v1.52.21`).

**Perf**
- Geen extra work op board-load, scroll, of andere kolomfilters (effect hangt niet aan de hele `filterByColumn`-map).
- Eén search-call per remarks-Apply / saved-view-load met geldige term.
- Response alleen sleutels. `CHARINDEX` op `tb_row_remarks`, niet `tb_cache`.
- Meetpunt: `time('remarks_search_sql')`; client via `apiRequest`.

**Aantoonbaar**
- Kolommenu Remarks: Filter `contains`, geen Sort, geen unique-picker, geen kleurfilter.
- Apply op een term in een oudere remark: matching rijen; cel mag nog de laatste preview tonen.
- Tweede kolomfilter AND; unique-picker van die kolom blijft gevuld.
- Saved view herstelt de term en triggert één search.
- Network: geen `/remarks/search` tot Apply; bij Apply één GET; andere kolom-Apply triggert geen tweede search.
- Supplier: IDOR-test groen; staff ziet alle board-matches.
- API-fout: toast, rijen blijven de vorige matches.

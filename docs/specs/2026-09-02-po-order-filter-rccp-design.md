# PO-tabel: inkooporder-filter stuurt RCCP

## BRD

**Als** planner (employee/admin; leverancier voor eigen orders)
**wil ik** op de PO-tabel filteren op inkooporder (bestaande kolom Order) en RCCP daarop laten meebewegen
**zodat** ik load en capaciteit van precies die order(s) zie, net zoals nu al voor vendor en item.

**Probleem nu:** een vendor- of item-filter op de PO-tabel beperkt RCCP. Een filter op inkooporder beperkt wel de tabel (en KPI’s via de zichtbare rijen), maar RCCP blijft de hele vendor-load tonen. De planner kan daardoor niet één order in de grafiek/matrix isoleren.

**Succes (toetsbaar):**
- Filter op de bestaande Order-kolom (`orderNumber`: equals, oneOf, contains) beperkt de tabel zoals nu.
- De RCCP-strip onder de tabel toont alleen PO-vakjes (en bijbehorende PO-measures in de matrix) die bij die order(s) horen.
- Delen de zichtbare rijen één vendor, dan laadt RCCP die vendor automatisch — ook zonder apart vendor-filter.
- Delen ze meerdere vendors, dan geen auto-vendor; RCCP volgt het PO-filter pas als er wél één vendor is (gekozen of gedeeld).
- Bij openen van `/rccp` geldt dezelfde vendor-handoff (kolomfilter of auto-vendor uit de zichtbare rijen). Geen stille PO-subset op die pagina (zelfde patroon als item: subset alleen live in de strip). Geen extra label of picker.
- Geen klik op een PO-vakje die de tabel terugfiltert.

**Non-goals:**
- Geen extra PO-picker op de tabel of op `/rccp`.
- Geen klik van grafiekvakje → tabel (v1).
- Geen zoektocht over alle vendors.
- Geen extra item-handoff naar `/rccp` (blijft zoals nu: item volgt alleen live in de strip).
- Geen nieuwe analysis-API of extra `/rccp/analysis`-call per order.
- BI-charts en KPI-tegels niet extra ontwerpen (KPI’s volgen al `visibleOrders`; BI gebruikt al `filterByColumn`).

**Constraints:**
- Hergebruik `filterByColumn` en `savePoFilterByColumnForRccp` / `readPoFilterByColumnForRccp`.
- Client-side segmentfilter, zelfde patroon als item (`resolveRccpItemsFromFilter` / `filterRccpChartByItem`).
- Capaciteit- en warning-lijnen blijven vendor-niveau (zoals bij item-filter).
- Engelse UI, Fluent v9, component ≤ 300 regels, OTAP local-first.

## FRD

**Gekozen approach:** B — de **strip** volgt de zichtbare tabelrijen (niet alleen Order; ook status/datum/KPI). Item-filter blijft AND op segmenten. Delen die rijen één vendor, dan laadt de strip die vendor. `/rccp` krijgt alleen auto-vendor (zichtbaar in het bestaande vendor-veld), geen stille orderlijst — zelfde patroon als item. Matrix-drill-down verdwijnt.

**Review-correctie:** stille PO-subset op `/rccp` is afgewezen (geen zichtbare staat naast vendor/item).

**Afgewezen:**
- A — alleen `orderNumber` uit `filterByColumn`, zelfde patroon als item: voldoet aan de oorspronkelijke wens, maar volgt status/datum/KPI niet.
- C — `/rccp/analysis` extra scoped op ordernummers: extra API-call, botst met de BRD-non-goal.

**Happy path**
1. Planner (of leverancier op eigen orders) filtert de PO-tabel: Order, vendor, item, status, datum, of een KPI-tegel.
2. De tabel toont de matching header-rijen.
3. Delen die rijen één vendor: de RCCP-strip laadt die vendor (ook zonder vendor-kolomfilter).
4. Grafiek en PO-measures in de matrix tonen alleen vakjes waarvan `poNumber` in die zichtbare set zit.
5. Staat er ook een item-filter: extra AND op `itemNumber` van het vakje (zelfde operators als nu).
6. Planner opent `/rccp`: het bestaande vendor-veld is voor-ingevuld (filter of auto-vendor). De grafiek is de volle vendor-load; de lokale item-picker blijft. Geen PO-subset.
7. Filters wissen of KPI-tegel uitzetten: de strip toont weer de volle vendor-load.
8. Klik op een matrixcel doet niets; het drill-down-panel is verwijderd. Week-matrix heeft geen pointer/button-aria meer. PO-vakjes mogen item-klik naar de tabel houden.

**Rollen**
- Employee/admin: volle tabel + RCCP-strip + `/rccp`.
- Supplier: zelfde gedrag binnen server-side vendor-scope; auto-vendor is hun account.
- Geen nieuwe auth of rechten.

**Leeg**
- Zichtbare set leeg, of geen vakjes voor die orders in het venster: lege PO-stapels, capaciteit-/warning-lijnen blijven vendor-breed. Geen extra empty-copy.
- Zichtbare rijen met meerdere vendors: geen auto-vendor. Strip wacht op één vendor (filter of keuze). `/rccp` opent zonder vendor, bestaande hint: *Search for a vendor above…*
- SessionStorage onleesbaar: huidige fallback (geen vendor uit handoff).

**Fout**
- Analysis-fout: bestaande error-UI; geen halve filter.
- Handoff-write faalt (private mode/quota): strip blijft live correct; `/rccp` mist auto-vendor, zelfde als nu.

**Overlap**
- Handoff is per browser-tab (`sessionStorage`), geen gedeelde SQL-waarheid.
- Twee gebruikers beïnvloeden elkaar niet. Geen write-conflict (read-only grafiek).

**UI**
- Geen nieuwe filter-control. Bestaande Order-kolom (en overige kolomfilters/KPI) blijven de trigger.
- Geen PO-picker, geen hint-chip op `/rccp`.
- Matrix is niet meer klikbaar naar drill-down. UI-teksten Engels.
- Capacity planning-tab blijft vendor-breed, ongefilterd op orders.

**Zichtbaarheid**
- Zelfde data als de tabel al toont. Geen orderlijst in localStorage of sessionStorage; handoff alleen `filterByColumn` + `derivedVendor`.

**Hergebruik**
- Live: `BoardSplitView` + `RccpSplitStrip` (zichtbare rijen + bestaande item-resolve).
- Handoff: `filterByColumn` + `derivedVendor` (geen ordernummers).
- `/rccp`: bestaande vendor-resolve + `derivedVendor`; geen PO-segmentfilter.
- Segmentfilter (strip): één compositor in `rccpChartItems.js` (item AND PO, `applyMeasureTotals` één keer).
- Verwijderen: `RccpDrillDownPanel` en matrix-klik-affordance op `/rccp`.

**Acceptatie**
- Filter Order (equals/oneOf/contains) → strip toont alleen die PO-vakjes.
- Extra status- of KPI-filter → strip volgt de dan zichtbare rijen.
- Eén gedeelde vendor zonder vendor-filter → strip laadt die vendor.
- Twee vendors in beeld → geen auto-vendor.
- Item + Order → alleen vakjes die beide matchen.
- `/rccp` na tabel-filter → dezelfde vendor in het zoekveld; grafiek is vendor-breed (geen stille PO-set).
- Matrixklik opent geen panel.

## TD

**Geen nieuwe routes, geen SQL.** Client-side op de bestaande `/rccp/analysis`. Handoff blijft `sessionStorage` (geen localStorage, geen board-settings). PO-subset alleen in de strip; `/rccp` alleen auto-vendor.

### Hergebruik

| Stuk | Pad |
|------|-----|
| Live strip | `src/components/bi/BoardSplitView.jsx`, `src/components/rccp/RccpSplitStrip.jsx` |
| Zichtbare rijen | `boardView.processedItems` (ná kolomfilters **en** KPI-tegel). `kpiSourceItems` blijft alleen voor de KPI-strip. |
| Scope-helpers | nieuw `src/utils/poVisibleRccpScope.js` — `collectOrderNumbers`, `resolveSharedVendorFromOrders`. Niet in `resolveRccpVendorFilter.js` stoppen. |
| Strip-vendor | `resolvePoBoardRccpVendor` uitbreiden met `derivedVendor` (na kolomfilter). |
| Segmentfilter | `src/components/rccp/rccpChartItems.js` — één compositor (item AND PO, `applyMeasureTotals` één keer). Niet `useRccpItemFilter` uitbreiden. |
| Handoff | `src/utils/poVendorFilterHandoff.js` — key `po:activeFilterByColumn` |
| `/rccp` | `src/components/rccp/RccpPageContent.jsx` — vendor-handoff + `derivedVendor`; geen orderlijst |
| Prefetch | `src/utils/dataPagesPrefetch.js` |
| Save-punt | `src/components/supplier/PurchaseOrdersPageContent.jsx` |

### Dataflow

1. **Tabel** — `processedItems` = wat de planner ziet.
2. **Scope** — uit die rijen: unieke `orderNumbers` + `derivedVendor` (één `vendorAccount` ná naam-mapping, anders `''`). Fingerprint = gesorteerde join van ordernummers, niet de array-identiteit (sort/KPI-qty-overlay mag geen extra writes geven).
3. **Strip-vendor** — kolomfilter eerst, anders `derivedVendor`. Supplier ongewijzigd. `hadPoFilterHandoff` / autofocus: waar als filter-vendor **of** `derivedVendor` gezet is. `rccpRefreshKey` blijft `vendor|planningDateMode`.
4. **Strip-grafiek** — compositor op de geladen chart. Matrix-PO-measures `active` als item **of** PO-subset. Capaciteit/warning vendor-breed. `orderNumbers` via één extra prop (strip heeft nu 9 props; 10 is het max). Geen `tableMatch`-bag. Scope uitrekenen in `poVisibleRccpScope.js`, niet als derde row-lijst door `BoardSplitView` duwen: geef `orderNumbers` + `derivedVendor` (strings) door, of laat de strip `processedItems` alleen gebruiken om die twee waarden intern te maken via de helper in de parent met `useMemo`.
5. **Handoff-payload** `{ v: 1, filterByColumn, derivedVendor }`. Geen `orderNumbers` in storage.
   - `readPoFilterByColumnForRccp()` unwrapt v1 én legacy.
   - Parse-guard: object, `filterByColumn` object of legacy-kolommap, `derivedVendor` string, max lengte; ongeldig → `null` + `removeItem`.
   - Leeg filter en geen `derivedVendor` → `removeItem`.
6. **Save** — effect-deps: gestabiliseerde `filterByColumn` + `derivedVendor` (niet `processedItems` zelf).
7. **`/rccp` mount** — vendor: filter → `derivedVendor` → `lastVendor`. Geen PO-subset. Item-picker blijft lokaal. Drill-down-state verdwijnt; geen extra snapshot-state (blijft onder 300).
8. **Prefetch** — `derivedVendor` als filter geen vendor heeft. Supplier-prefetch-skip ongewijzigd; `derivedVendor` nooit als query zonder bestaande `rccpAccess`-lock.

### Drill-down weg

- Verwijderen: `RccpDrillDownPanel.jsx` en wiring (`onCellClick`, `interactive={true}`, panel-state).
- `/rccp` geeft `interactive={false}` / geen `onCellClick`, zodat pointer, `role="button"` en *Show purchase order lines* weg zijn.
- `GET /api/rccp/drill-down` blijft deze PR (restschuld, geen UI-consumer). Geen nieuwe backend.

### Auth / validatie

- Geen nieuw endpoint. Bestaande keten: `requireSession` + `rccpAccess` (supplier GET-only, forced vendor).
- Handoff is untrusted: schema-guard client-side. Geen secrets. Ordernummers blijven in geheugen (strip), niet in storage.

### Perf

- Geen extra `apiRequest`. Client-`useMemo` op de al geladen chart.
- `orderNumbers` + `tableMatch`-achtige objecten: `useMemo` op fingerprint, anders is `memo(RccpSplitStrip)` waardeloos.
- Optioneel `measure('rccp_po_subset')` rond de compositor, zelfde stijl als bestaande chart-helpers.

### Tests

- `rccpChartItems.test.js` — `poNumber`; AND item; lege set + `emptyHidesAll`; matrix.
- `poVisibleRccpScope.test.js` — ordernummers; gedeelde vendor; conflict → `''`.
- `poVendorFilterHandoff.test.js` — v1 zonder orderNumbers, legacy unwrap, ongeldige payload, derivedVendor, clear.
- `RccpSplitStrip.test.jsx` — zichtbare POs beperken de chart.
- `dataPagesPrefetch.test.js` — `derivedVendor` zonder kolomfilter-vendor.
- `resolveRccpVendorFilter.test.js` — `derivedVendor` ná filter, supplier ongewijzigd.

### Versie

- `src/config/version.js` PATCH +1 bij implementatie.

### Aantoonbaar

- PO-tabel: filter Order/KPI → RCCP-strip alleen die vakjes; één vendor in beeld → strip laadt zonder vendor-kolomfilter.
- `/rccp` in hetzelfde tabblad: vendor-veld gevuld; grafiek vendor-breed; bestaande item-picker.
- Matrixklik opent geen panel, geen pointer op weekcellen.
- `http://localhost:5178` (geen push).

# RCCP: bevestigde leverdatum fabrikant

> **Status:** settings-mapping en load-plaatsing zijn vervangen door `docs/specs/2026-08-30-rccp-semantic-field-slots-design.md`. Dit document geldt alleen nog voor latere visualisatie (hatching, Planning-date-schakelaar, pin, history) en moet dan herzien worden.

## BRD

**Als** planner (employee/admin; leverancier ziet hetzelfde voor de eigen vendor)
**wil ik** naast gevraagde leverdatum en ontvangstdatum de **door de fabrikant bevestigde leverdatum** zien in grafiek, matrix en KPI’s, met een bewuste keuze welke van de twee datums de planning stuurt
**zodat** ik belofte, plan en ontvangst kan vergelijken en overcapacity/KPI’s op de datum kan rekenen die nu leidend is.

**Probleem nu:** RCCP kent alleen gevraagde leverdatum (`dateColumnKey`) en ontvangstdatum (`receiptDateColumnKey`). De bevestigde datum van de fabrikant zit al in het datamodel (PO-kolom of Excel-join) maar stuurt geen grafiek, matrix of KPI. Received-vakjes delen één measurekleur; unieke items zijn in de stapel wel gescheiden maar visueel niet. History van die bevestigde datum is op het board wel aanwezig, niet in RCCP.

**Succes (toetsbaar):**

- In RCCP-settings kiest admin een optionele kolom **Confirmed delivery date**.
- Grafiek toont altijd drie encodings: gepland (vaste stack boven de as), bevestigd (gestreepte balk boven de as), ontvangen (onder de as).
- Received: kleur **per uniek itemnummer**, 25% opacity boven de as, 100% onder de as.
- Open-vakjes blijven zoals nu (Open-measurekleur, te-laat rood kader).
- Eén schakelaar **Planning date: Requested | Confirmed** (default Requested) stuurt RCCP-KPI’s én overcapacity; extra matrixrij blijft altijd zichtbaar als vergelijking.
- Per item: laatste confirmed-datum standaard; oudere versies kiesbaar; “Show all versions” alleen voor dat item.
- Lege cel of `1-1-1900` → geen gestreepte balk en geen waarde in de extra rij.
- Vensterlidmaatschap van KPI-regels blijft de gevraagde leverdatum, ook als Planning date = Confirmed.
- Month-view somt `segmentsConfirmed` net als above/below.
- Klik opent de pin-kaart; de hoverkaart blijft niet-interactief.
- UI-teksten Engels.

**Non-goals:**

- Geen nieuwe D365-entiteit, Excel-uploadflow of history-tabel.
- Geen “alle versies” voor de hele grafiek.
- Geen itemkleur op open-vakjes.
- Grafiekbalken schuiven niet mee met de Planning-date-schakelaar.
- KPI’s op het **purchase-orderboard** (`GET /api/rccp/board-kpis`) blijven op gevraagde datum.
- Geen nieuwe tab of hernoemen van bestaande matrix-term “confirmed qty” (dat blijft load op de gevraagde week).
- Today-lijn en te-laat-kader-regel ongewijzigd.

**Constraints:**

- Bestaande Capacity vs load-grafiek en matrix op `/rccp`.
- Kolomkiezer in RCCP-config JSON (`RCCP_CONFIG`), zelfde validatiepatroon als `receiptDateColumnKey`.
- Actuele confirmed-waarde uit de PO-snapshot (`values[key]`); versies uit bestaande `tb_cell_history` / `tb_field_corrections`.
- Planning-date-keuze in RCCP board-settings (`board-key` `rccp`), per gebruiker, blob-replace zoals vendor/weekvenster.
- Bestaande `GET /api/rccp/analysis` + `rccpAccess`; `apiRequest` / `time()` / `measure()`.
- Componenten ≤ 300 regels; Fluent v9; geen secrets; SQL via parameters.
- OTAP local-first tot er een DevOps-feature is.

## FRD

**Classificatie:** architectural (nieuwe datumdimensie in analysis, matrix, KPI’s, chart-encoding en history-overlay).

**Gekozen approach:** A — bestaande `GET /api/rccp/analysis` uitbreiden: confirmed-segmenten + extra matrixrij uit dezelfde PO-snapshot; Planning date als query voor KPI’s en overcapacity; itemkleuren in de bestaande stack-shape; confirmed als **eigen** balk-shape via `weekBarBox(index, width, slot)`; history via `GET /api/rccp/confirmed-history` na item-pin, batched op de server.

**Afgewezen:**

- B — tweede analysis-call of overlay-API voor confirmed: extra round-trip, uitlijning met weekkolommen, twee bronnen van waarheid.
- C — client-only herbucketing van bestaande weektotalen: geen per-item confirmed-week, geen history, KPI’s blijven fout.

### Happy path

1. Admin zet in RCCP Settings → Purchase order fields de kolom **Confirmed delivery date** (PO-regel of Excel-join). Validatie gelijk aan Receipt date.
2. Planner opent `/rccp`, kiest vendor en weekvenster. Schakelaar **Planning date** staat op **Requested**.
3. Grafiek per week, twee balken boven de as binnen de weekkolom (samen ~80% breedte):
   - **Links:** bestaande stack: open (Open-measurekleur, 100%) + received (itemkleur, 25%) op de **gevraagde** week.
   - **Rechts:** gestreepte balk (diagonale hatching) per item, itemkleur, op de **bevestigde** week. Alleen open quantity. Geen balk bij lege/`1-1-1900` confirmed-datum.
4. Onder de as: received op ontvangstweek, itemkleur 100% (ongewijzigde plaatsing).
5. Hover op een vakje toont de bestaande item-kaart. Received/confirmed van hetzelfde item highlighten elkaar (25%-balk, gestreepte balk, onder-as).
6. **Klik** opent `RccpPoSegmentPinCard` (vaste overlay, interactief). De hoverkaart blijft niet-interactief. Dezelfde Item-kiezer bovenaan filtert de grafiek op dat item. “All items”, klik buiten of Escape haalt filter en pin weg.
7. Standaard confirmed-positie = huidige celwaarde. Versielijst = unieke datums uit history van alle **open** regels van dat item. Gekozen datum herbuckett **alle open qty van dat item** naar die ISO-week. “Show all versions” tekent één gestreepte balk per unieke datum; qty = huidige open qty van regels die díé datum in hun history hebben.
8. Extra matrixrij **Confirmed delivery**: open quantity in de ISO-week van de (huidige) bevestigde datum. Rijen Open/Received/Capacity blijven. Deze rij beïnvloedt util%/status **niet** zolang Planning date = Requested.
9. Schakelaar op **Confirmed**: KPI’s die nu tegen gevraagde datum rekenen, rekenen tegen bevestigde datum. Overcapacity (en capacity-shortfall / overloaded-weeks) gebruikt open load in **bevestigde** weken. Extra rij blijft staan. Vaste grafiekstacks blijven op gevraagde + ontvangst + arcering.

### Planning date — welke KPI’s

Volgen de schakelaar (vergelijkingsdatum = gevraagd of bevestigd):

- `lateDelivery`, `lateItems`, `onTime`, `openLate`
- `planned1900` → in Confirmed-modus: open + delivered waar confirmed leeg of `1-1-1900` is (kaartlabel Engels, bijv. Missing confirmed date)
- `capacityShortfall`, `overloadedWeeks`

Niet datum-afhankelijk, ongewijzigd: `ordered`, `delivered`, `open` (hoeveelheden). **Vensterlidmaatschap** (welke regels in het ISO-weekvenster vallen) blijft altijd op de **gevraagde** leverdatum; alleen de vergelijkingsdatum wisselt.

`deliveryReliability` volgt `onTime` (dus de schakelaar).

De extra matrixrij `__confirmed_delivery__` telt **niet** mee in `capacityShortfall` / `overloadedWeeks` / chart `__overloaded__`. Requested-overcapacity = huidige formule (open load op gevraagde week). Confirmed-overcapacity = open load op confirmed-weken, niet de som van extra rij + bestaande load.

### Rollen

- Admin: kolomkiezer Confirmed delivery date.
- Employee/admin/supplier: grafiek, matrix, schakelaar, item-pin, history-keuze (read). Supplier alleen eigen vendor (`rccpAccess`).
- Alleen staff schrijft celhistorie op het board; RCCP leest die historie.

### Leeg / fout / overlap

- Geen kolom gekozen: geen gestreepte balk, geen extra rij; **Planning date verbergen** (geen disabled control).
- `planningDate=confirmed` terwijl `confirmedDateColumnKey` leeg is → **400**.
- Geen confirmed-waarde / `1-1-1900`: geen gestreepte segment, geen extra-rij-bijdrage; telt als missing (niet als late).
- Geen history: dropdown alleen **Current**; **Show all versions** hidden.
- Analysis-fout: bestaande error UI.
- Twee kijkers: geen live-sync; board-settings per gebruiker.
- Itemkleur: stabiele hash van `itemNumber` naar een **vaste palet zonder** `#D13438` en zonder de Open-measurekleur. Te-laat-stroke wint van highlight-stroke; kaart toont **Late**.
- Split-pane (`RccpSplitStrip`): hatching mag (analysis default requested); geen Planning-date-control en geen pin.

### UI

- Settings-label: **Confirmed delivery date**. Info: line date first; header fallback. Optional. Engels. Zelfde 200px-slot als Receipt date.
- Planning date: horizontale Fluent **RadioGroup** in `Field` (niet `Switch`), `maxWidth` 220–280px, naast Item. Korte hint onder het Field; volledige zin in `rccpFieldLabel` info: `KPIs and overcapacity follow this date; chart bars stay on requested, receipt and hatching.`
- Hover: bestaande niet-interactieve portal-kaart. Pin: **aparte** vaste overlay (`RccpPoSegmentPinCard`, `pointer-events` aan) met status **Confirmed**, versie-dropdown (`Field`, listbox op `document.body`) en **Show all versions** als Checkbox. Unpin: All items, klik buiten, Escape. Geen Fluent `Tooltip`/`Menu` per vakje.
- Hatching: één set SVG `pattern`s in de plot-`<defs>` (niet per segment); dunne diagonalen, ruime spacing. Legenda: Open solid, Received 25%, Confirmed hatch.
- Balkgeometrie: `weekBarBox(index, width, slot)` — boven de as links gevraagd, rechts confirmed, samen ~80% van de weekkolom, vaste gap, lege slot blijft leeg (gevraagde balk zet niet uit). **Onder de as** blijft één gecentreerde received-balk (niet splitsen).
- Extra matrixrij-label: **Confirmed delivery**. `showInChart: false`.

### Zichtbaarheid

- Confirmed-kolomwaarde is PO-data die de gebruiker op het board al mag zien.
- History-fetch alleen voor het gepinde item, vendor-scoped, zelfde auth als analysis.
- Geen history in localStorage.

### Hergebruik

- Grafiek: `src/components/rccp/RccpChartMatrixPanel.jsx`, `RccpPoStackBar.jsx`, `rccpPoStack.js`, `RccpItemFilter.jsx`.
- Analysis: `server/services/RccpAnalysisService.js`, `server/utils/rccpPoSegments.js`, `server/utils/rccpKpis.js`.
- Settings: `RccpSettingsDataFields.jsx`, `RccpSettingsService.js`.
- Persist: `src/hooks/useRccpWindow.js` (board-settings blob).
- History-API-patroon: `GET /api/data/:tableKey/history` — **niet** N keer vanaf de client; batched via RCCP-backend.

## TD

### Eerst splitsen (vóór feature-code)

`RccpPageContent.jsx` (~286) en `RccpChartMatrixPanel.jsx` (~242, **al 10 props**) groeien niet. Extraheer **eerst**:

- `RccpPlanningDateSwitch.jsx` — RadioGroup + hint; PageContent blijft onder 300.
- Chart-stacks: pure helper `src/components/rccp/rccpChartStacks.js` (geen hook, geen extra panel-props). Pin/history blijven in het panel via hooks.
- `RccpPoConfirmedBar.jsx` — sibling van `RccpPoStackBar`, niet meer in dezelfde shape.
- `RccpPoSegmentPinCard.jsx` — niet de bestaande hoverkaart uitbreiden (`pointerEvents: none`).
- `weekBarBox(index, width, slot)` in `rccpPoStack.js` (`'left' | 'right' | 'center'`). Geen tweede Recharts grouped `Bar` (die landt op dezelfde x).

`RccpAnalysisService.js` (~636) krijgt **geen** history-I/O en geen extra aggregatielogica. Extra rij + overcapacity-switch: pure helper `server/utils/rccpConfirmedLoad.js`. History: `server/utils/rccpConfirmedHistory.js`. Service geeft alleen door.

`confirmedByCell` / `confirmedQty` (load op gevraagde week) **niet hernoemen en niet hergebruiken** voor fabrikant-confirmed. Nieuwe map bijv. `factoryConfirmedByCell`.

### Hergebruik (paden)

- Config: `server/services/RccpSettingsService.js` — `defaultConfig.confirmedDateColumnKey = ''`; `validateConfig` identiek aan `receiptDateColumnKey`.
- Settings-UI: `RccpSettingsDataFields.jsx` (10e prop `onConfirmedDate`, niet 11) + `useRccpSettingsFormHandlers.js` (`handleConfirmedDate`).
- Segmenten: `server/utils/rccpPoSegments.js` — `segmentsConfirmed` per week. Qty = open measure; week = ISO-week confirmed-datum; skip leeg/`isSentinelDate` (gedeelde helper in `server/utils/rccpPoRow.js`, niet privé in kpis). Header-only open qty: zelfde `collectDateSlots` als receipt. Clip buiten het venster zoals `clipBump`.
- Filter/grain: `rccpChartItems.js` en `rccpPeriodGrain.js` nemen `segmentsConfirmed` mee (`collectRccpChartItemNumbers`, `filterRccpChartByItem`, `sumChartGroup`, `SKIP_CHART_KEYS` inclusief `segmentsConfirmed` en `__barWidthConfirmed`).
- Matrix: synthetische `RCCP_CONFIRMED_DELIVERY_MEASURE_KEY` (`__confirmed_delivery__`) in `rccpUtils.js` (alleen de constante). `isConfirmedDelivery`, rank 35, `showInChart: false`. `isStackRow` sluit deze rij uit. `buildChartSeries` / `buildRccpCapacityKpis`: ook `!row.isConfirmedDelivery` (voorkomt dubbele load).
- Overcapacity: `OVERCAPACITY_MEASURE_KEY` ongewijzigd. Requested = bestaande `confirmedByCell` (gevraagde week). Confirmed = `factoryConfirmedByCell`. Open/delivered-cellen blijven gevraagde week. Drill-down op de synthetische rij: regels van dat item/die confirmed-week, niet `dateColumnKey` als enige datum.
- KPI’s: `rccpKpis.js` — `planningDate`; vergelijkingsdatum wisselt; vensterfilter blijft gevraagde datum. `time('rccp_kpis')`.
- Route analysis: query `planningDate=requested|confirmed`. Weglaten of leeg → `requested`. Ongeldig → 400. `confirmed` zonder kolom → 400. Niet op `/board-kpis`.
- Query/cache: `buildAnalysisQuery` + prefetch-cachekey + `useRccpPage` / `useRccpVendorPrefetch` deps bevatten `planningDate`.
- Chart: received above opacity **0.25**; fill via `rccpItemColor.js`. Confirmed-bar eigen component + `slot: 'right'`. Highlight: `highlightItem` = `itemNumber` van **elk** gehoverd segment (open/received/confirmed); helper matcht received-above, received-below en confirmed. `onClick` via bestaande `RccpSegmentHoverContext`, geen extra props op `RccpPoSegmentRect`.
- Persist: `useRccpWindow.js` groepeert de blob in **één** persist-object/ref (isoWindow, lastVendorAccount, kpiWindowOnly, chartVisibleKeys, planningDate) zodat returns ≤ 10 blijven. PATCH blijft alle velden sturen. Default `requested`. Tests: `useRccpWindow.test.js`.
- Pin: `useRccpItemFilter` alleen filteren. `useRccpSegmentPin` alleen pin + sync met filter. History-fetch in `useRccpConfirmedHistory.js` (abort-cleanup) tegen `GET /api/rccp/confirmed-history`. Overlay-volgorde: grain → item-filter → history-overlay.
- History-qty: unieke datums over open regels van het item. Gekozen versie → alle open qty van dat item in die ISO-week. Show all versions → per unieke datum de open qty van regels die die datum in hun history hebben.
- History-route: **alleen** `GET /api/rccp/confirmed-history` (`rccpAccess`, zelfde window/vendor-resolve als analysis). Geen `itemNumber` op analysis. Vendor verplicht (staff zonder vendor → 400, zelfde als drill-down). `itemNumber` verplicht: trim, max 128, reject leeg / `*` / `%` / `_`, verder exacte match zoals `matchRccpChartItem`. Eerst PO-regels in vendor+window+item, daarna parameterized batch op die rijen — geen loop `getCellHistory`, geen `LIKE`. Payload: alleen `{ itemNumber, versions: [{ at, date }] }` (datums voor overlay, geen extra history-velden). `time('rccp_confirmed_hist')`.
- Versie: `src/config/version.js` PATCH +1 bij implementatie.
- Tests: segments (clip, sentinel, header-only), kpis (venster blijft requested, missing ≠ late), settings validatie, overcapacity-switch, capacity-KPI sluit synthetische rij uit, history 400 + 1 batch, itemColor palet, grain/filter confirmed, persist blob. Board-kpis ongewijzigd.

### Schema

- Geen nieuwe SQL-tabel of kolom. `confirmedDateColumnKey` in `RCCP_CONFIG` JSON. `planningDate` in bestaande board-settings JSON. History blijft `tb_cell_history` / `tb_field_corrections`.

### Volgorde

1. Splits: PlanningDateSwitch, `rccpChartStacks.js`, ConfirmedBar, PinCard (geen feature-gedrag nog).
2. Config + settings-UI + tests.
3. `buildPoSegments` + `rccpConfirmedLoad` extra rij (Requested-overcapacity ongewijzigd) + grain/filter `segmentsConfirmed`.
4. Chart: itemkleur 25/100, slot-layout, hatching, highlight, legenda.
5. `planningDate` op analysis: KPI’s + overcapacity; query + prefetch-key.
6. RadioGroup + blob-persist.
7. `GET /api/rccp/confirmed-history` + pin-kaart + overlay.
8. Formula-copy in `rccpKpiFormulas.js`.
9. `APP_VERSION` patch.

### Perf

- Confirmed-segmenten in dezelfde `rccp_po_segments`-pass als open/received (geen extra PO-read).
- History niet in de standaard analysis-payload.
- `planningDate` herbucket alleen de open-load-map, geen tweede snapshot-read.
- Itemkleur O(1) per segment; paletmodule-level.
- Meetpunten: bestaande `rccp_po_segments` / `rccp_kpis`; nieuw `rccp_confirmed_hist`. Client: `apiRequest` only.

### Aantoonbaar

- Settings: kolom zichtbaar, opslaan, herladen.
- Grafiek `/rccp`: twee balken boven, hatching, 25%/100%, open blijft rood/measure, klik+Item-filter, history verschuift balk.
- Matrix: extra rij; schakelaar verandert overcapacity-kleur, niet de extra rij zelf.
- KPI-kaarten veranderen bij Confirmed; PO-board KPI-strip niet.
- Leeg/`1-1-1900`: geen hatching, geen extra-rij-qty.

### Zelfcheck ontwerp

- Geen TBD / geen open A/B: slot-layout, apart history-endpoint, `rccpChartStacks.js` (geen hook), history-qty-regel, eerst splitsen.
- Geen contradictie: extra rij altijd zichtbaar; overcapacity volgt RadioGroup; stacks schuiven niet; venster blijft gevraagde datum.
- Scope: geen D365-sync, geen board-KPI-switch, geen chart-wide all-versions.

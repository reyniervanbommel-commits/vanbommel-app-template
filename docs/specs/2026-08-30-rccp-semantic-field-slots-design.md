# RCCP: vaste veldslots, allowlist weg

Dit ontwerp **vervangt** de settings-mapping en de load-plaatsing uit `docs/specs/2026-08-27-rccp-confirmed-delivery-date-design.md` (niet gebouwd). Die spec blijft alleen relevant voor latere visualisatie (hatching, pin, history). Tot die herzien is, is de planningweek per regel: confirmed als echte datum, anders requested.

## BRD

**Als** admin (planner)
**wil ik** op RCCP-settings alleen de vaste rollen Vendor, Requested delivery date, Confirmed delivery date, Receipt date, Open, Received en Ordered mappen naar kolommen
**zodat** ik niet meer via Data model een allowlist hoef bij te houden en niet per ongeluk willekeurige Excel-/lookupkolommen als datum of hoeveelheid kies.

**Probleem nu:** Data model heeft een toggle “RCCP value column” die alleen Quantities raakt. De Data-tab toont alle kolommen zonder typefilter. Quantities zijn vrije kaarten plus optionele rollen Open/Received. Ordered ontbreekt. Confirmed delivery date is geen mapping; de grafiek gebruikt één delivery-datum. Het resultaat is dubbele configuratie en een dropdown-dump.

**Succes (toetsbaar):**

- Data-tab toont precies vier velden: Vendor, Requested delivery date, Confirmed delivery date, Receipt date.
- Elke dropdown is getypt (geen artikelnaam als datum, geen Excel-tekst als vendor).
- Quantities-tab toont precies drie vooringevulde slots: Open, Received, Ordered. Geen “Add quantity column”, geen chart-role-dropdown.
- Data model heeft geen kolom “RCCP value column”.
- Opslaan van RCCP-settings faalt niet meer omdat een kolom niet getoggeld is.
- Per regel: planningweek = confirmed als die cel een echte datum heeft, anders requested. Receipt date blijft voor received onder de as.
- UI-teksten Engels.

**Non-goals:**

- Geen hatching, Planning-date-RadioGroup, itemkleuren, pin-kaart of confirmed-history uit `docs/specs/2026-08-27-rccp-confirmed-delivery-date-design.md`.
- Geen extra vrije quantity-kaarten (formules/Excel als vierde reeks).
- Geen DROP van SQL-kolom `tb_columns.rccp_measure`.
- Geen wijziging van Display-tab, capacity import, excluded statuses.
- `GET /api/rccp/board-kpis` blijft op gevraagde leverdatum (geen confirmed-fallback).
- Geen D365-sync of nieuwe entiteit.
- Geen herbouw van supplier-vendor-scoping.

**Constraints:**

- Mapping blijft in `RCCP_CONFIG` JSON (`dbo.app_settings`), geen nieuwe SQL-tabel.
- Alleen admin wijzigt settings (`PUT /api/admin/rccp/settings`). Employee/supplier zien de grafiek; settings-flyout blijft admin.
- Supplier-isolatie blijft `rccpAccess` + `resolveSupplierAccount` (account uit de user), **niet** de Vendor-slot. Die slot kiest alleen uit welke PO-kolom de aggregatie de vendor-id leest. Geen herontwerp van vendor-scoping in deze feature.
- Bestaande `rccpAccess`, `apiRequest`, `time()` / `measure()`.
- Componenten ≤ 300 regels; Fluent v9 tokens; geen `<Tooltip>` in herhaalde lijsten.
- Bestaande prop-overschrijdingen (`DataPreviewTables`, `EntityConfigTable`, `useDataModelAdmin`) zijn **geen** scope; deze feature verwijdert props/handlers, split die bestanden niet.
- OTAP local-first tot dit work item gebouwd wordt.

**Beslissingen (zelf genomen):**

| Vraag | Keuze |
|-------|--------|
| Allowlist | Weg uit UI, save-gate en Quantities-filter. Kolom in SQL laten staan. |
| Data-velden | Vier vaste slots, typefilter. |
| Quantities | Drie vaste slots, geen extra kaarten. |
| Confirmed in de grafiek | Geen tweede balk. Zelfde last-plaatsing: confirmed indien gevuld, anders requested. |
| Receipt | Ongewijzigd: received onder de as; leeg = fallback naar planningweek. |
| Hardcoded keys | Nee. Defaults wél, daarna admin-mapping. |

## FRD

**Classificatie:** architectural (settingscontract, admin-UI, analysis-datumresolutie).

**Gekozen approach:** A — semantische slots op RCCP-settings, dropdowns filteren op `dataType` + eligibility, allowlist verwijderen, één planningdatum per regel (`confirmed` of `requested`).

**Afgewezen:**

- B — D365-keys hardcoderen: breekbaar bij hernoemen, lookups en receipt-lines.
- C — allowlist houden naast slots: dubbele admin-stap, precies het huidige probleem.
- D — RCCP-rol per Data model-kolom: onvindbaar in een lange tabel, conflicterende rollen.

### Happy path

1. Admin opent `/rccp` → Settings.
2. Tab **Data — Purchase order fields** toont vier velden (200px-slots, bestaande `RccpNarrowDropdown`):
   - **Vendor** — header-tekstkolommen. Default key `vendorAccount`.
   - **Requested delivery date** — datumkolommen. Default `requestedDeliveryDate`. Verplicht.
   - **Confirmed delivery date** — datumkolommen + None. Default `confirmedDeliveryDate` als die kolom bestaat, anders None.
   - **Receipt date** — datumkolommen + None. Default `productReceiptDate` als die bestaat (huidig gedrag mag blijven).
3. Tab **Quantities** toont drie vaste kaarten (geen Add, geen Delete, geen Chart role):
   - **Open** — default `remainingPurchaseQuantity` als die bestaat, anders huidige `openMeasureKey` / eerste getalkolom.
   - **Received** — default `receivedPurchaseQuantity`.
   - **Ordered** — default `quantity`.
   Elke kaart: kolomdropdown (alleen eligible getallen), kleur, In chart. Open/Received houden hun bestaande grafiekencoding. Ordered is een gewone matrix-/chartreeks (lijn/balk).
4. Admin slaat op. Config heeft drie `quantityMeasures` (één per slot), plus `openMeasureKey`, `deliveredMeasureKey`, `orderedMeasureKey`.
5. Planner ziet load in de ISO-week van confirmed (echte datum) of anders requested. Received onder de as volgt receipt date.

Load filter (excluded statuses) en Capacity import blijven onder Data, ongewijzigd.

### Rollen

- Admin: wijzigt mappings.
- Employee: leest analysis met de opgeslagen mappings.
- Supplier: read-only RCCP, eigen vendor; geen settings.

### Leeg / fout / overlap

- Geen datumkolommen in het model: dropdown leeg; Save 400 met Engelse melding welke slot ontbreekt.
- Confirmed = None: alle regels gebruiken requested.
- Confirmed-kolom gekozen, cel leeg of `1-1-1900`: die regel valt terug op requested.
- Twee slots dezelfde quantity-kolom: Save 400 (`Each quantity slot must use a different column`).
- Bestaande config met extra measures: bij eerste save na deze feature blijven alleen de drie slots over. `getConfig()` normaliseert al naar drie slots (defaults vullen gaten) zodat de UI nooit oude extra kaarten toont.
- Kolom verdwenen/inactief: slot toont warning “unavailable”, Save 400 tot de admin een andere kolom kiest.
- Twee admins: last write wins op `RCCP_CONFIG`, bestaand patroon.
- Ongeldige confirmed-cel (niet parsebaar tot ISO-week): zelfde als leeg → requested.

### UI

- Labels Engels; info-iconen via bestaande `rccpFieldLabel`.
- Vendor info: `Purchase order column that identifies the vendor.`
- Requested: `Line date first; the order header is the fallback. Used when confirmed date is empty.`
- Confirmed: `Line date first; header fallback. When filled, this week is used for open and ordered load. Empty or 1-1-1900 falls back to requested.`
- Receipt: huidige tekst (received onder de as; leeg → planningweek).
- Quantities-intro: `Each slot maps one numeric column. Open and Received drive the chart boxes; Ordered is a matrix row.`
- Data model: kolom RCCP value column en de (i)-copy `DATA_MODEL_INFO.rccp` weg.
- Geen Fluent `Tooltip` in de kolomrij-tabel voor deze feature (bestaande lock-tooltips op andere kolommen blijven).

### Typefilter (dropdown)

| Slot | `dataType` | Extra |
|------|------------|--------|
| Vendor | `text` | `scope === 'master'`, `isActive !== false` |
| Datums | `date` of `date_period` | `isActive !== false` |
| Quantities | `number` | `isActive !== false`; custom zonder `formulaExpr` uitgesloten (leeg in RCCP) |

Groepen (Purchase orders / Vendors / Items / Receipt lines / Excel) blijven via `rccpColumnGroupLabel`.

### Zichtbaarheid

- Alleen kolommen die de gebruiker via het datamodel al mag zien. Geen nieuwe data.
- Geen extra payload: analysis gebruikt dezelfde PO-snapshot.

### Hergebruik

- Settings-UI: `RccpSettingsDataFields.jsx`, `RccpQuantityMeasuresEditor.jsx`, `RccpQuantityMeasureCard.jsx`, `useRccpSettingsFormHandlers.js`.
- Config: `server/services/RccpSettingsService.js`.
- Analysis: `server/services/RccpAnalysisService.js`, `server/utils/rccpPoRow.js`, `server/utils/rccpPoSegments.js`.
- Admin: `EntityConfigTable.jsx`, `DataPreviewColumnConfigRow.jsx`, `useDataModelAdmin.js`, `server/routes/data.js` PATCH rccp-measure.

### Acceptatiecriteria

1. Data-tab heeft vier genoemde velden; Vendor-dropdown bevat geen datumkolommen; datum-dropdowns bevatten geen tekstkolommen zoals Artikelnaam.
2. Quantities-tab heeft drie slots Open / Received / Ordered; geen Add-knop.
3. Admin → Data model toont geen “RCCP value column”.
4. Save zonder Data model-toggle slaagt als de drie getalkolommen eligible zijn.
5. Regel met confirmed-datum in week 40 en requested in week 38: open/ordered landt in week 40. Zelfde regel zonder confirmed: week 38.
6. `1-1-1900` confirmed gedraagt zich als leeg (requested).
7. Board-KPI-strip ongewijzigd t.o.v. requested-only.

## TD

### Hergebruik (paden)

- `src/utils/rccpQuantityColumns.js` — uitbreiden, geen tweede filtermodule. Exporteert `isRccpVendorColumn`, `isRccpDateColumn`, `isRccpQuantityColumn`. Quantity: `dataType === 'number'`, actief, custom zonder formule uitgesloten. Geen `rccpMeasure`.
- Slot-default keys (geen aparte frontend-module): één lijst `SLOT_DEFAULT_KEYS` in `server/services/RccpSettingsService.js`, gespiegeld als constante in `src/utils/rccpQuantityColumns.js` (zelfde strings). Keys: vendor `vendorAccount`; requested `requestedDeliveryDate`; confirmed `confirmedDeliveryDate`; receipt `productReceiptDate`; open `remainingPurchaseQuantity`; received `receivedPurchaseQuantity`; ordered `quantity`.
- `src/components/rccp/RccpSettingsDataFields.jsx` — props: `config`, `columns`, `statusOptions`, `compact`, `onUpdateField` (5). Interne `useCallback`s voor vendor/dates/statuses/policy. Vierde `ColumnSelect` Confirmed. Gefilterde kolomlijsten via `useMemo`. Bestand blijft onder 300 (~167 + één Field).
- `src/components/rccp/RccpQuantityMeasuresEditor.jsx` — props blijven generiek (`measures`, `columns`, `openMeasureKey`, `deliveredMeasureKey`, `onChange`, `onUpdateField`). Geen add/remove. Drie vaste slots; `onUpdateField('orderedMeasureKey', …)` naast open/delivered. Hinttekst vervangen.
- `src/components/rccp/RccpQuantityMeasureCard.jsx` — Chart role en Delete weg; `chartType` alleen voor Ordered. Titel = slotnaam (Open / Received / Ordered).
- `src/components/rccp/useRccpSettingsFormHandlers.js` — Data-callbacks verdwijnen uit deze hook (DataFields praat met `onUpdateField`). Hook houdt Display + `handleMeasures` (≤10 keys). Tests: Data-handlers verhuizen naar `RccpSettingsDataFields.test.jsx` of een kleine `useRccpDataFieldHandlers` in hetzelfde bestand als DataFields als de view te vol wordt.
- `src/components/rccp/rccpChartRole.js` — blijft voor encoding Open/Received; UI zet keys via de drie slots.
- `server/services/RccpSettingsService.js`:
  - `defaultConfig.confirmedDateColumnKey = ''`
  - `defaultConfig.orderedMeasureKey = 'quantity'`
  - `defaultConfig.openMeasureKey = 'remainingPurchaseQuantity'`
  - `defaultConfig.deliveredMeasureKey = 'receivedPurchaseQuantity'`
  - `getConfig()` blijft **zonder** column-definitions-lookup (elke analysis). Normalize op JSON-keys: precies drie measures uit open/delivered/ordered; extra measures droppen; `remainingMeasureKey` → `orderedMeasureKey`. Kleur/`chartType`/`showInChart` van een bestaande measure met dezelfde `columnKey` behouden.
  - Kolom-afhankelijke “als de default-key niet bestaat, kies eerste eligible” gebeurt alleen in `saveConfig` / admin GET-settings als een verplicht slot leeg is, via `assertSlotsExist`.
  - `assertMeasuresAreReleased` → `assertSlotsExist(config)`: `getBoardColumnDefinitions('purchase-orders')`. Elke gezette key: max 128, `/^[A-Za-z0-9_]+$/`, exacte match, datatype/scope/eligibility. Vendor + requested verplicht. Confirmed + receipt optioneel. Drie quantity-keys verplicht, onderling uniek.
- `server/services/TableColumnsService.js` — `setRccpMeasure` weg. Hernoem `resolveRccpMeasureEligibility` → `resolveRccpQuantityEligibility` en exporteer die; `assertSlotsExist` hergebruikt hem (geen kopie). Frontend spiegelt dezelfde regels in `isRccpQuantityColumn`.
- `server/utils/rccpPoRow.js` — enige `isSentinelDate` (verwijder lokale kopieën in `rccpPoSegments.js` en `rccpKpis.js`). Tests in `rccpPoRow.test.js`: leeg, ongeldig, `1-1-1900`, Date-object. `planningDateValue(lineValues, masterValues, requestedKey, confirmedKey)`: confirmed als gezet, niet sentinel, en ISO-week parsebaar; anders requested.
- `RccpAnalysisService`: `aggregatePoLoad`, `collectInWindowSlots` / header-only slots, **en** `buildDrillDownRows` gebruiken `planningDateValue`. Received-onder-as ongewijzigd (`receiptDateColumnKey`).
- `server/utils/rccpPoSegments.js` — open/ordered-week via `planningDateValue`.
- `GET /api/rccp/board-kpis`: geen `planningDateValue`.
- Admin UI: RCCP-kolom weg uit `EntityConfigTable.jsx`, `DataPreviewColumnConfigRow.jsx`, `DataPreviewTables.jsx`, `AdminDataModel.jsx`, `DATA_MODEL_INFO.rccp`, `useDataModelAdmin` (`toggleRccpMeasure`, `rccpMeasureAllowed`, `resolveRccpMeasureBlockedReason`).
- Runtime-JS voor `rccpMeasure` weg: geen mapping meer in `TableRegistryService` / `TableDataService` (lookup-overerving van de vlag), geen veld op admin-column-API. SQL-kolom `tb_columns.rccp_measure` blijft (geen DROP). `SELECT` mag de kolom weglaten.
- API: `PATCH .../rccp-measure` weg. Tests: `TableColumnsService.test.js` (eligibility hernoemen, setRccpMeasure-tests weg), `TableDataService.test.js` (geen rccpMeasure-asserts op API-shape), `DataPreviewColumnConfigRow.test.jsx`, `useDataModelAdmin.test.jsx`.
- Settings-audit in `server/routes/admin.js`: bestaande audit bij PUT uitbreiden met `confirmedDateColumnKey` en `orderedMeasureKey` als dat endpoint al keys logt; anders ongewijzigd laten (geen nieuw audit-kanaal).
- Versie: `src/config/version.js` PATCH +1 bij implementatie.
- `src/config/devTestItems.js`: Data vier velden, Quantities drie slots, Data model zonder RCCP-kolom, één PO waarvan confirmed-week ≠ requested-week.

### Schema

- Geen nieuwe tabel/kolom. JSON-keys: `confirmedDateColumnKey`, `orderedMeasureKey`. `dateColumnKey` blijft requested (niet hernoemen). `remainingMeasureKey` op read mappen naar `orderedMeasureKey`, daarna niet meer schrijven.

### Auth

- Geen nieuwe routes. `PUT /api/admin/rccp/settings` blijft `requireRole(admin)`. PATCH rccp-measure verdwijnt.
- Tests bij de admin-route (of bestaande auth-testfile): employee en unauthenticated → 403/401 op PUT.
- `GET /api/rccp/settings` mag voor employee/supplier de runtimeconfig blijven geven (nodig voor kleuren/labels in de grafiek). Geen extra velden. Supplier ziet geen settings-flyout.

### Volgorde

1. Pure filters + `planningDateValue` / `isSentinelDate` + tests.
2. `RccpSettingsService` normalize/validate/assertSlotsExist + tests (inclusief legacy `remainingMeasureKey`, metadata-behoud, duplicate keys).
3. Analysis + segments + drill-down op `planningDateValue` + tests.
4. Settings Data/Quantities UI (DataFields via `onUpdateField`).
5. `rccpMeasure`-runtime + PATCH + Data model-kolom weg + tests.
6. `APP_VERSION` + `devTestItems`.

### Perf

- Geen extra `apiRequest`. Settings-save doet één bestaande column-definitions-lookup (nu al in `assertMeasuresAreReleased`).
- `planningDateValue` is O(1) per regel in de bestaande PO-loop (`time('rccp_po_segments')` / bestaande analysis-timing).
- Client: `useMemo` op gefilterde kolomlijsten per slot.

### Grootte

- `RccpSettingsDataFields.jsx`: 5 props, onder 300 regels.
- `RccpQuantityMeasureCard.jsx` krimpt.
- `EntityConfigTable.jsx` krimpt; geen extra split.
- `useRccpSettingsFormHandlers` groeit niet; Data-handlers verhuizen naar DataFields.

### Aantoonbaar

- Browser: Settings Data vier velden, Quantities drie slots, Data model zonder RCCP-kolom, Save, grafiekweek van een PO met confirmed ≠ requested; drill-down van die week toont dezelfde regel.
- Endpoint: `PUT /api/admin/rccp/settings` zonder `rccpMeasure` op de quantity-kolommen → 200; duplicate quantity keys → 400.

### Zelfcheck ontwerp

- Geen TBD / geen open A/B.
- 2026-08-27: mapping + load-plaatsing hier; visualisatie later, dan herzien.
- Extra quantity-kaarten expres geschrapt (YAGNI).
- Pre-existing 10+-prop admin-tabellen blijven buiten scope.

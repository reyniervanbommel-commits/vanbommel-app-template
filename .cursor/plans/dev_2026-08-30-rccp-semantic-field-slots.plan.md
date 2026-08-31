# RCCP vaste veldslots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** RCCP-settings mappen vaste rollen (Vendor, Requested/Confirmed/Receipt date, Open/Received/Ordered) naar getypte kolommen; Data model-allowlist weg; planningweek per regel = confirmed als echte datum, anders requested.

**Architecture:** Semantische keys in bestaande `RCCP_CONFIG` JSON. Dropdowns filteren op `dataType`. Save valideert tegen `getBoardColumnDefinitions`. Analysis, segmenten en drill-down gebruiken `planningDateValue`. Geen SQL-migratie.

**Tech Stack:** React 18, Fluent UI v9, Express, MSSQL JSON-settings, Vitest.

**Spec:** `docs/specs/2026-08-30-rccp-semantic-field-slots-design.md`

## Global Constraints

- UI Engels. Geen Fluent `Tooltip` in herhaalde lijsten.
- Componenten ≤ 300 regels; max 10 props per component; hook ≤ 10 top-level return keys.
- `RccpSettingsDataFields` krijgt `onUpdateField` (niet een extra named handler-prop). `useRccpSettingsFormHandlers` groeit niet.
- Kolomkeys: trim, max 128, leeg alleen waar optioneel, anders `/^[A-Za-z0-9_]+$/`.
- `getConfig()` geen column-definitions-lookup. `assertSlotsExist` alleen in `saveConfig`.
- Supplier-scope blijft `rccpAccess`; niet herontwerpen.
- `GET /api/rccp/board-kpis` blijft requested-only.
- SQL-kolom `tb_columns.rccp_measure` niet DROP-pen; alle JS/API-plumbing wél weg.
- `APP_VERSION` patch +1; `devTestItems` vullen. Commit prefix `feat` + `#AB:298`.
- Pre-existing 10+-prop admin-tabellen niet splitsen in deze feature.

### SLOT_DEFAULT_KEYS (beide lagen, identieke strings)

```js
{
  vendor: 'vendorAccount',
  requested: 'requestedDeliveryDate',
  confirmed: 'confirmedDeliveryDate',
  receipt: 'productReceiptDate',
  open: 'remainingPurchaseQuantity',
  received: 'receivedPurchaseQuantity',
  ordered: 'quantity',
}
```

---

### Task 1: Kolomfilters + planningdatum (puur)

**Files:**
- Modify: `src/utils/rccpQuantityColumns.js`
- Modify: `src/utils/rccpQuantityColumns.test.js`
- Modify: `server/utils/rccpPoRow.js`
- Create: `server/utils/rccpPoRow.test.js`
- Modify: `server/utils/rccpPoSegments.js` — verwijder lokale `isSentinelDate`, importeer uit `rccpPoRow`
- Modify: `server/utils/rccpKpis.js` — idem

**Interfaces:**
- Consumes: kolomobject `{ key, dataType, scope, source, formulaExpr, isActive }`
- Produces: `isRccpVendorColumn`, `isRccpDateColumn`, `isRccpQuantityColumn`, `SLOT_DEFAULT_KEYS`, `isSentinelDate`, `planningDateValue`

- [ ] **Step 1:** Herschrijf `isRccpQuantityColumn`: `dataType === 'number'`, `isActive !== false`, custom zonder `formulaExpr` → false. Geen `rccpMeasure`. Detail-scope mag (receipt qty). Voeg vendor (`text` + `scope === 'master'`) en date (`date` | `date_period`) toe. Exporteer `SLOT_DEFAULT_KEYS`.
- [ ] **Step 2:** Tests: quantity zonder vlag true voor number; custom zonder formule false; formule true; vendor weigert date; date accepteert `date_period`.
- [ ] **Step 3:** Verplaats `isSentinelDate` naar `rccpPoRow.js`. `planningDateValue(lineValues, masterValues, requestedKey, confirmedKey)`: `lineDateValue` voor confirmed; als null/sentinel/geen ISO-week (`getIsoWeekYear`/`getIsoWeek` falsy) → requested. Tests: confirmed week wint; leeg; `1900-01-01`; `'not-a-date'`.
- [ ] **Step 4:** `npm test -- src/utils/rccpQuantityColumns.test.js server/utils/rccpPoRow.test.js server/utils/rccpPoSegments.test.js server/utils/rccpKpis.test.js`

---

### Task 2: Settings-contract (drie slots, geen allowlist-gate)

**Files:**
- Modify: `server/services/RccpSettingsService.js`
- Modify: `server/services/RccpSettingsService.test.js`
- Modify: `server/services/TableColumnsService.js` — `setRccpMeasure` weg; `resolveRccpMeasureEligibility` → `resolveRccpQuantityEligibility` exporteren
- Modify: `server/services/TableColumnsService.test.js`
- Modify: `server/routes/admin.js` — audit payload

**Interfaces:**
- Consumes: raw JSON + `getBoardColumnDefinitions('purchase-orders')`
- Produces: config met `confirmedDateColumnKey`, `orderedMeasureKey`, precies drie `quantityMeasures`; `saveConfig` 400 zonder `rccpMeasure`

- [ ] **Step 1:** `defaultConfig`: `confirmedDateColumnKey: ''`, `openMeasureKey: 'remainingPurchaseQuantity'`, `deliveredMeasureKey: 'receivedPurchaseQuantity'`, `orderedMeasureKey: 'quantity'`. `validateConfig`: confirmed zelfde regels als receipt (optioneel). `remainingMeasureKey` op read → `orderedMeasureKey`. Bouw `quantityMeasures` uit de drie keys (max 3). Bestaande measure-metadata (kleur, `chartType`, `showInChart`) behouden bij dezelfde `columnKey`. Extra measures droppen. Schrijf `remainingMeasureKey` niet terug.
- [ ] **Step 2:** Vervang `assertMeasuresAreReleased` door `assertSlotsExist(config)`: keys max 128 + charset; lookup in master+detail defs; vendor = text+master; dates = date/date_period; quantities via `resolveRccpQuantityEligibility`; drie quantity-keys verplicht en uniek. Foutteksten Engels, o.a. `Each quantity slot must use a different column`.
- [ ] **Step 3:** Tests: default keys; legacy remaining; extra measure verdwijnt; metadata blijft; duplicate → invalid/throw 400; save zonder `rccpMeasure` op de kolom-mock slaagt als de kolom eligible is; confirmed te lang/ongeldige tekens.
- [ ] **Step 4:** Audit `UPDATE_RCCP_SETTINGS` uitbreiden met `vendorColumnKey`, `confirmedDateColumnKey`, `receiptDateColumnKey`, `orderedMeasureKey`. Bestaande admin-auth: PUT als employee/unauthenticated blijft 403/401 (voeg toe als die assert nog ontbreekt in `server/routes` tests).
- [ ] **Step 5:** `npm test -- server/services/RccpSettingsService.test.js server/services/TableColumnsService.test.js`

---

### Task 3: Analysis, segmenten, drill-down op planningDateValue

**Files:**
- Modify: `server/services/RccpAnalysisService.js` — `aggregatePoLoad`, header-only `collectInWindowSlots`, `buildDrillDownRows`
- Modify: `server/services/RccpAnalysisService.test.js`
- Modify: `server/utils/rccpPoSegments.js`
- Modify: `server/utils/rccpPoSegments.test.js`

**Interfaces:**
- Consumes: `planningDateValue`, `config.dateColumnKey`, `config.confirmedDateColumnKey`
- Produces: dezelfde week in matrix, grafieksegmenten en drill-down

- [ ] **Step 1:** Elke read van `config.dateColumnKey` voor open/ordered/window-slots (niet receipt, niet board-kpis) vervangen door `planningDateValue(..., config.dateColumnKey, config.confirmedDateColumnKey)`.
- [ ] **Step 2:** Tests: requested W38 / confirmed W40 → load + segment + drill-down in W40; zonder confirmed of 1900 → W38; board-kpis-pad ongemoeid (geen wijziging in die functie, bestaande tests groen).
- [ ] **Step 3:** `npm test -- server/services/RccpAnalysisService.test.js server/utils/rccpPoSegments.test.js`

---

### Task 4: Settings UI — Data vier slots, Quantities drie slots

**Files:**
- Modify: `src/components/rccp/RccpSettingsDataFields.jsx`
- Create: `src/components/rccp/RccpSettingsDataFields.test.jsx` (of handlers-tests hierheen)
- Modify: `src/components/rccp/RccpSettingsForm.jsx` — DataFields: `onUpdateField` i.p.v. losse Data-handlers
- Modify: `src/components/rccp/useRccpSettingsFormHandlers.js` — `handleVendor`/`handleDate`/`handleReceiptDate`/`handleStatuses`/`handlePolicy` weg
- Modify: `src/components/rccp/useRccpSettingsFormHandlers.test.js`
- Modify: `src/components/rccp/RccpQuantityMeasuresEditor.jsx`
- Modify: `src/components/rccp/RccpQuantityMeasureCard.jsx`

**Interfaces:**
- DataFields props: `{ config, columns, statusOptions, compact, onUpdateField }` (5)
- Editor: drie slots, geen Add/Delete/Chart role

- [ ] **Step 1:** DataFields interne callbacks: `onUpdateField('vendorColumnKey'|'dateColumnKey'|'confirmedDateColumnKey'|'receiptDateColumnKey'|…)`. Vier velden in deze volgorde: Vendor, Requested delivery date, Confirmed delivery date (allowEmpty), Receipt date (allowEmpty). Filter columns met de drie `isRccp*` helpers. Labels/info exact zoals spec FRD UI.
- [ ] **Step 2:** Quantities: vaste kaarten Open / Received / Ordered. Geen Add-knop, geen Delete, geen Chart role. Ordered toont Chart type. `onUpdateField` voor de drie keys + `onChange` voor measures-array (altijd lengte 3). Intro-tekst: `Each slot maps one numeric column. Open and Received drive the chart boxes; Ordered is a matrix row.`
- [ ] **Step 3:** `RccpSettingsForm` Data-tab: geen `onVendor`/`onDate`/… meer. Handlers-hook alleen Display + `handleMeasures`.
- [ ] **Step 4:** `npm test -- src/components/rccp/useRccpSettingsFormHandlers.test.js src/utils/rccpQuantityColumns.test.js` plus nieuwe DataFields-test: datum-dropdown bevat geen `itemName`.

---

### Task 5: Data model-allowlist en rccpMeasure-runtime weg

**Files:**
- Modify: `src/components/admin/datamodel/EntityConfigTable.jsx`
- Modify: `src/components/admin/datamodel/DataPreviewColumnConfigRow.jsx`
- Modify: `src/components/admin/datamodel/DataPreviewColumnConfigRow.test.jsx`
- Modify: `src/components/admin/datamodel/DataPreviewTables.jsx`
- Modify: `src/components/admin/datamodel/AdminDataModel.jsx`
- Modify: `src/components/admin/datamodel/dataModelInfoCopy.js` — `rccp` key weg
- Modify: `src/hooks/useDataModelAdmin.js`
- Modify: `src/hooks/useDataModelAdmin.test.jsx`
- Modify: `server/routes/data.js` — PATCH `rccp-measure` weg
- Modify: `server/services/TableRegistryService.js` — `rccpMeasure` niet mappen
- Modify: `server/services/TableDataService.js` — lookup erft geen `rccpMeasure`; `toAdminColumn` zonder het veld
- Modify: `server/services/TableDataService.test.js`

**Interfaces:**
- Consumes: n.v.t.
- Produces: admin-tabel zonder RCCP-kolom; 404/geen route op oude PATCH

- [ ] **Step 1:** UI-kolom + switch + info-hint + `toggleRccpMeasure` + `rccpMeasureAllowed` weg. `EntityConfigTable` telt na afloop regels (moet dalen, ≤300).
- [ ] **Step 2:** Route + mappings + tests die `rccpMeasure` op API-shape eisen aanpassen. Grep `rccpMeasure` / `rccp-measure` / `rccp_measure` in JS: alleen SQL-kolomdefinitie/migratie mag overblijven, geen runtime-consument.
- [ ] **Step 3:** `npm test -- src/hooks/useDataModelAdmin.test.jsx src/components/admin/datamodel/DataPreviewColumnConfigRow.test.jsx server/services/TableDataService.test.js`

---

### Task 6: Versie, DEV-checklist, volledige test/build

**Files:**
- Modify: `src/config/version.js` — PATCH +1
- Modify: `src/config/devTestItems.js`

- [ ] **Step 1:** Checklist-item id `rccp-semantic-slots`: Data vier velden getypt; Quantities Open/Received/Ordered; Data model zonder RCCP-kolom; PO met confirmed ≠ requested landt in confirmed-week; drill-down dezelfde regel.
- [ ] **Step 2:** `npm test` en `npm run build`.
- [ ] **Step 3:** Lokaal: `http://localhost:5178` — settings + één PO-check (dev-server niet zelf starten als die al draait).

---

## Acceptatie (bouwagent)

1. Data-tab: vier velden; geen Artikelnaam in datumlijst.
2. Quantities: drie slots, geen Add.
3. Data model: geen “RCCP value column”.
4. PUT settings 200 zonder kolom-toggle; duplicate quantity 400.
5. Confirmed W40 vs requested W38 → analysis + drill-down W40; 1900 → W38.
6. Board-KPI-strip ongewijzigd (requested).

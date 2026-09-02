# PO-tabel inkooporder-filter → RCCP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** De RCCP-strip onder de PO-tabel toont alleen vakjes van de zichtbare rijen (Order/status/KPI); `/rccp` krijgt auto-vendor, geen stille PO-subset; matrix-drill-down UI verdwijnt.

**Architecture:** Analysis-segmenten krijgen `poNumber` en mergen niet over POs. Client filtert de geladen chart (item AND PO). Scope (`orderNumbers`, `derivedVendor`) komt uit `processedItems`. Handoff is `{ v: 1, filterByColumn, derivedVendor }` in sessionStorage. Geen nieuw endpoint.

**Tech Stack:** React 18, Fluent UI v9, Vitest, Express (bestaande `GET /rccp/analysis`).

**Spec:** `docs/specs/2026-09-02-po-order-filter-rccp-design.md`

## Global Constraints

- UI-teksten Engels; geen extra PO-picker/chip.
- Componenten ≤ 300 regels; `BoardSplitView` 8→10 props (max); `RccpSplitStrip` 9→10 props (max).
- Geen `processedItems` als derde row-lijst door de split-view; scope in `PurchaseOrdersPageContent`.
- Geen extra `/rccp/analysis`-call; `rccpRefreshKey` blijft `vendor|planningDateMode`.
- `GET /api/rccp/drill-down` niet verwijderen.
- `APP_VERSION` PATCH +1 in de laatste taak. Geen commit tenzij de gebruiker dat vraagt.
- OTAP local-first: test op `http://localhost:5178`, geen push.

## File map

| File | Rol |
|------|-----|
| `server/utils/rccpPoSegments.js` | `poNumber` op segment; bucket per PO×item |
| `src/utils/poVisibleRccpScope.js` | `collectOrderNumbers`, `resolveSharedVendorFromOrders`, fingerprint |
| `src/components/rccp/rccpChartItems.js` | `filterRccpChartByPo` + compositor |
| `src/components/rccp/resolveRccpVendorFilter.js` | `derivedVendor` ná kolomfilter |
| `src/utils/poVendorFilterHandoff.js` | v1 payload + unwrap + parse-guard |
| `src/components/supplier/PurchaseOrdersPageContent.jsx` | scope + save |
| `src/components/bi/BoardSplitView.jsx` | `orderNumbers` + `derivedVendor` doorgeven |
| `src/components/rccp/RccpSplitStrip.jsx` | compositor met `orderNumbers` |
| `src/utils/dataPagesPrefetch.js` | prefetch via `derivedVendor` |
| `src/components/rccp/RccpPageContent.jsx` | auto-vendor; drill-down UI weg |
| `src/config/version.js` | PATCH |

---

### Task 1: Segmentpayload `poNumber`

**Files:**
- Modify: `server/utils/rccpPoSegments.js`
- Modify: `server/utils/rccpPoSegments.test.js`

**Interfaces:**
- Consumes: `row.recordKey`, bestaande `bump` / `clipBump` / `spreadHeaderQty`
- Produces: segment `{ itemNumber, poNumber, qty, status, late, onTime, planned1900, dataAreaId }`

- [ ] **Step 1: Pas de bestaande merge-test aan zodat hij faalt**

In `rccpPoSegments.test.js` helper `seg()`: voeg `poNumber: extra.poNumber || 'PO-A'` toe aan het object.

Vervang de test `merges the same item from different POs into one segment` door:

```js
it('emits one stack per PO when the same item appears on two orders', () => {
  const second = row();
  second.recordKey = 'PO-B';
  const byWeek = buildPoSegments([row(), second], baseConfig, window, { now: nowCurrent });
  const above = byWeek.get(plannedWeek.key).segmentsAbove;
  expect(above.filter((s) => s.itemNumber === 'SKU-1' && s.status === 'open')).toEqual([
    seg('SKU-1', 10, 'open', false, { poNumber: 'PO-A' }),
    seg('SKU-1', 10, 'open', false, { poNumber: 'PO-B' }),
  ]);
});
```

(Qty 10 = openQty van `row()`; als de fixture anders is, spiegel de bestaande `row()`-qty.)

- [ ] **Step 2: Run de test — FAIL** (nog één gemerged vak zonder `poNumber`)

Run: `npx vitest run server/utils/rccpPoSegments.test.js`

- [ ] **Step 3: Implementeer bucket per PO×item**

`bump`: key = `` `${poNumber}\0${itemNumber}` ``; sla `poNumber` en `itemNumber` op het entry op.

`emitSegment(..., flags)`: zet `poNumber: flags.poNumber || ''`.

`emitAbove` / `emitBelow`: sorteer keys; geef `entry.poNumber` mee.

Thread `poNumber` (`row.recordKey`) door `clipBump`, `spreadHeaderQty` en alle `bump(`-calls.

- [ ] **Step 4: Run tests — PASS** (ook bestaande `toEqual(seg(...))` via default `poNumber: 'PO-A'`)

Run: `npx vitest run server/utils/rccpPoSegments.test.js`

---

### Task 2: `poVisibleRccpScope`

**Files:**
- Create: `src/utils/poVisibleRccpScope.js`
- Create: `src/utils/poVisibleRccpScope.test.js`

**Interfaces:**
- Consumes: header-rijen `{ orderNumber, vendorAccount, values.vendorAccount, values.vendorName }`
- Produces:
  - `collectOrderNumbers(orders) => string[]` (uniek, gesorteerd, trim, lege drop)
  - `orderNumbersFingerprint(orderNumbers) => string` (`join('\0')`)
  - `resolveSharedVendorFromOrders(orders, { vendors, vendorNames, vendorColumnKey }) => string`

Vendor per rij: `order.vendorAccount || order.values?.[vendorColumnKey || 'vendorAccount'] || order.values?.vendorAccount`. Leeg skip. Unieke waarden ná mapping (account in `vendors`, anders naam → account via `vendorNames`). Exact 1 account → die; anders `''`.

- [ ] **Step 1: Schrijf tests**

```js
it('collects unique sorted order numbers', () => {
  expect(collectOrderNumbers([
    { orderNumber: 'PO-B' }, { orderNumber: 'PO-A' }, { orderNumber: 'PO-A' }, { orderNumber: '  ' },
  ])).toEqual(['PO-A', 'PO-B']);
});

it('returns one vendor when all visible rows share an account', () => {
  expect(resolveSharedVendorFromOrders([
    { values: { vendorAccount: 'V1' } },
    { vendorAccount: 'V1' },
  ], { vendors: ['V1', 'V2'], vendorNames: { V1: 'Acme' } })).toBe('V1');
});

it('maps a display name to the account', () => {
  expect(resolveSharedVendorFromOrders(
    [{ values: { vendorAccount: 'Acme' } }],
    { vendors: ['V1'], vendorNames: { V1: 'Acme' } },
  )).toBe('V1');
});

it('returns empty when two vendors are visible', () => {
  expect(resolveSharedVendorFromOrders([
    { values: { vendorAccount: 'V1' } },
    { values: { vendorAccount: 'V2' } },
  ], { vendors: ['V1', 'V2'], vendorNames: {} })).toBe('');
});
```

- [ ] **Step 2: Run — FAIL**

Run: `npx vitest run src/utils/poVisibleRccpScope.test.js`

- [ ] **Step 3: Implementeer de drie exports (geen JSX)**

- [ ] **Step 4: Run — PASS**

---

### Task 3: Chart-compositor item AND PO

**Files:**
- Modify: `src/components/rccp/rccpChartItems.js`
- Modify: `src/components/rccp/rccpChartItems.test.js`

**Interfaces:**
- Consumes: bestaande `filterRccpChartByItem`, `filterRccpMatrixByItem`, `applyMeasureTotals`
- Produces: `filterRccpChartBySegments(chart, { items, containsTerm, emptyHidesAll, orderNumbers, measureRows })`

Gedrag:
1. Item-pass: zelfde als `filterRccpChartByItem` maar **zonder** `applyMeasureTotals` (totals pas aan het eind).
2. PO-pass: als `orderNumbers` een array is: `Set` van trim-strings. Lege set + `emptyHidesAll` → alle stacks leeg. Niet-lege set → houd segmenten met `poNumber` in de set. Geen array → skip PO-pass.
3. Eén keer `applyMeasureTotals`.
4. `filterRccpMatrixByItem(..., { active: itemActive || poActive })` blijft; `poActive` = `Array.isArray(orderNumbers)`.

Bestaande `filterRccpChartByItem` mag intern de compositor aanroepen zodat oude tests groen blijven.

- [ ] **Step 1: Tests**

Chartpunt met twee POs, zelfde SKU:

```js
const chart = [{
  week: '2026-W12',
  segmentsAbove: [
    { itemNumber: 'A', poNumber: 'PO-1', qty: 2, status: 'open' },
    { itemNumber: 'A', poNumber: 'PO-2', qty: 3, status: 'open' },
  ],
  segmentsBelow: [],
}];

it('keeps only stacks whose poNumber is in the visible set', () => {
  expect(filterRccpChartBySegments(chart, { orderNumbers: ['PO-1'] })[0].segmentsAbove)
    .toEqual([{ itemNumber: 'A', poNumber: 'PO-1', qty: 2, status: 'open' }]);
});

it('ANDs item and PO', () => {
  const mixed = [{
    week: '2026-W12',
    segmentsAbove: [
      { itemNumber: 'A', poNumber: 'PO-1', qty: 2, status: 'open' },
      { itemNumber: 'B', poNumber: 'PO-1', qty: 4, status: 'open' },
    ],
    segmentsBelow: [],
  }];
  expect(filterRccpChartBySegments(mixed, { items: ['A'], orderNumbers: ['PO-1'] })[0].segmentsAbove)
    .toEqual([{ itemNumber: 'A', poNumber: 'PO-1', qty: 2, status: 'open' }]);
});

it('hides all stacks when orderNumbers is an empty list and emptyHidesAll', () => {
  expect(filterRccpChartBySegments(chart, { orderNumbers: [], emptyHidesAll: true })[0].segmentsAbove)
    .toEqual([]);
});
```

- [ ] **Step 2: Run — FAIL**

Run: `npx vitest run src/components/rccp/rccpChartItems.test.js`

- [ ] **Step 3: Implementeer compositor; bestaande item-tests blijven groen**

- [ ] **Step 4: Run — PASS**

---

### Task 4: `derivedVendor` in vendor-resolve

**Files:**
- Modify: `src/components/rccp/resolveRccpVendorFilter.js`
- Modify: `src/components/rccp/resolveRccpVendorFilter.test.js`

**Interfaces:**
- Consumes: bestaande `resolveDefaultRccpVendor` / `resolvePoBoardRccpVendor` / `resolveDefaultRccpVendorWithFallback`
- Produces: optionele `derivedVendor: string` — ná kolomfilter, vóór `lastVendor`

Volgorde `resolveDefaultRccpVendorWithFallback`: filter → `derivedVendor` (map via `vendors`/`vendorNames` net als filter-kandidaat) → `lastVendor`.

`resolvePoBoardRccpVendor`: na filter-leeg, als `derivedVendor` gezet is, zelfde mapping; supplier ongewijzigd.

- [ ] **Step 1: Tests**

```js
it('uses derivedVendor when there is no column vendor filter', () => {
  expect(resolvePoBoardRccpVendor({
    derivedVendor: 'V000696',
    vendors: ['V000696'],
    vendorNames: {},
    vendorsReady: true,
  })).toBe('V000696');
});

it('lets the column filter win over derivedVendor', () => {
  expect(resolvePoBoardRccpVendor({
    filterByColumn: { vendorAccount: { operator: 'equals', value: 'V000622' } },
    derivedVendor: 'V000696',
    vendors: ['V000622', 'V000696'],
    vendorNames: {},
    vendorsReady: true,
  })).toBe('V000622');
});

it('uses derivedVendor before lastVendor', () => {
  expect(resolveDefaultRccpVendorWithFallback({
    vendors: ['V000583', 'V000696'],
    vendorNames: {},
    filterByColumn: null,
    derivedVendor: 'V000696',
    lastVendor: 'V000583',
    lastVendorReady: true,
  })).toBe('V000696');
});
```

- [ ] **Step 2–4:** FAIL → implementeer → PASS

Run: `npx vitest run src/components/rccp/resolveRccpVendorFilter.test.js`

---

### Task 5: Handoff v1 + save + prefetch

**Files:**
- Modify: `src/utils/poVendorFilterHandoff.js`
- Modify: `src/utils/poVendorFilterHandoff.test.js`
- Modify: `src/components/supplier/PurchaseOrdersPageContent.jsx`
- Modify: `src/utils/dataPagesPrefetch.js`
- Modify: `src/utils/dataPagesPrefetch.test.js`

**Interfaces:**
- Consumes: `filterByColumn`, `derivedVendor`
- Produces:
  - `savePoRccpHandoff({ filterByColumn, derivedVendor })`
  - `readPoRccpHandoff() => { filterByColumn, derivedVendor } | null`
  - `readPoFilterByColumnForRccp()` blijft filter-only (unwrap v1 of legacy)

Payload: `{ v: 1, filterByColumn, derivedVendor }`.

Parse-guard: JSON object; als `v === 1` dan `filterByColumn` object (of `{}`), `derivedVendor` string max 64; anders legacy = het object ís `filterByColumn` (geen key `v`). Ongeldig → `null`. `save`: `removeItem` als geen keys in filter én geen `derivedVendor`.

Save in `PurchaseOrdersPageContent`: `useMemo` fingerprint `orderNumbersFingerprint(collectOrderNumbers(boardView.processedItems))` + `derivedVendor` (hier vendors-lijst nog niet; derivedVendor in de page content mag account-string van rijen zijn zonder mapping — mapping gebeurt in `resolvePoBoardRccpVendor` / `/rccp`). Simpeler: `derivedVendor` in de handoff = output van `resolveSharedVendorFromOrders(processedItems, { vendors: [], vendorNames: {} })` die raw unique account teruggeeft; mapping later. Als twee namen: `''`.

Effect-deps: `filterByColumn` + `derivedVendor` string, niet `processedItems`.

Prefetch: `readPoRccpHandoff()`; geef `derivedVendor` aan `resolveDefaultRccpVendorWithFallback`. Mock in test: breid `poVendorFilterHandoff` mock uit met `readPoRccpHandoff` of laat `readPoFilterByColumnForRccp` unwrap houden en voeg `readPoRccpHandoff` toe aan dezelfde mock.

- [ ] **Step 1: Handoff-tests** — v1 roundtrip; `readPoFilterByColumnForRccp` unwrap; legacy object zonder `v`; `{}` + lege derived → null; `{not-json` → null; `{ v: 1, derivedVendor: 1 }` → null.

- [ ] **Step 2: Implementeer save/read/guard; houd bestaande drie tests groen** (save legacy-shape via unwrap: `savePoFilterByColumnForRccp(filter)` mag intern `savePoRccpHandoff({ filterByColumn: filter, derivedVendor: '' })` doen).

- [ ] **Step 3: PageContent save** — `savePoRccpHandoff({ filterByColumn: boardView.filterByColumn, derivedVendor })`.

- [ ] **Step 4: Prefetch-test** — `readPoRccpHandoff` → `{ filterByColumn: {}, derivedVendor: 'V2' }`, vendors `['V1','V2']`, `lastVendor: 'V1'` → `prefetchRccpAnalysis` met `'V2'`.

Run: `npx vitest run src/utils/poVendorFilterHandoff.test.js src/utils/dataPagesPrefetch.test.js`

---

### Task 6: Strip live-filter + auto-vendor

**Files:**
- Modify: `src/components/supplier/PurchaseOrdersPageContent.jsx` (~255 regels; alleen useMemo + 2 props)
- Modify: `src/components/bi/BoardSplitView.jsx` (~261)
- Modify: `src/components/rccp/RccpSplitStrip.jsx` (~102, 9 props → 10)
- Modify: `src/components/rccp/RccpSplitStrip.test.jsx`

**Interfaces:**
- Consumes: Task 2–4
- Produces: strip chart gefilterd op `orderNumbers`; vendor uit filter of `derivedVendor`

`PurchaseOrdersPageContent`:

```js
const rccpOrderNumbers = useMemo(
  () => collectOrderNumbers(boardView.processedItems),
  [boardView.processedItems],
);
const rccpDerivedVendor = useMemo(
  () => resolveSharedVendorFromOrders(boardView.processedItems, { vendors: [], vendorNames: {} }),
  [boardView.processedItems],
);
```

Stabiel houden: memo op `orderNumbersFingerprint(rccpOrderNumbers)` als `processedItems` van identiteit wisselt. Geef `orderNumbers={rccpOrderNumbers}` en `derivedVendor={rccpDerivedVendor}` aan `BoardSplitView`. KPI blijft `visibleOrders={boardView.kpiSourceItems}`.

`BoardSplitView`: nieuwe props `orderNumbers`, `derivedVendor`. `resolvePoBoardRccpVendor({ ..., derivedVendor })`. Geen extra analysis-key. `RccpSplitStrip orderNumbers={orderNumbers}` (useMemo de array-ref in de parent).

`RccpSplitStrip`: 10e prop `orderNumbers`. Vervang de twee filter-memos door `filterRccpChartBySegments` + matrix `active: itemFilter.active || Array.isArray(orderNumbers)`.

- [ ] **Step 1:** Strip-test: mock analysis chart met twee `poNumber`s; render met `orderNumbers={['PO-A']}`; spy `RccpChartMatrixPanel` `chart` → alleen PO-A.

- [ ] **Step 2:** Wiring zoals hierboven. Tel props: SplitView ≤ 10, Strip ≤ 10. Geen bestand over 300.

- [ ] **Step 3:** Run `npx vitest run src/components/rccp/RccpSplitStrip.test.jsx src/components/rccp/resolveRccpVendorFilter.test.js`

---

### Task 7: `/rccp` auto-vendor + drill-down UI weg

**Files:**
- Modify: `src/components/rccp/RccpPageContent.jsx` (~290; drill-down eruit)
- Delete: `src/components/rccp/RccpDrillDownPanel.jsx`
- Modify: `src/components/rccp/RccpDashboardCharts.jsx` — geen `onCellClick` / `interactive={false}` vanuit de page

**Interfaces:**
- Consumes: `readPoRccpHandoff`, `resolveDefaultRccpVendorWithFallback` + `derivedVendor`
- Produces: vendor-handoff inclusief auto-vendor; geen drill-panel

- [ ] **Step 1:** `hadPoFilterHandoff` = filter-vendor **of** `Boolean(handoff?.derivedVendor)`.
- [ ] **Step 2:** Mount-effect: `const handoff = readPoRccpHandoff();` `resolveDefaultRccpVendorWithFallback({ ..., filterByColumn: handoff?.filterByColumn, derivedVendor: handoff?.derivedVendor, lastVendor, lastVendorReady: windowLoaded })`.
- [ ] **Step 3:** Verwijder `drillCell`, `handleCellClick`, `handleCloseDrill`, `<RccpDrillDownPanel>`, import. `RccpDashboardCharts`: geen `onCellClick`, `interactive={false}` (niet `periodGrain === WEEK`). Capacity planning ongewijzigd.
- [ ] **Step 4:** Bestand ≤ 300 regels. Zoek geen resterende `RccpDrillDownPanel`-imports. Route `GET /rccp/drill-down` blijft.

Run: `npx vitest run src/components/rccp` (bestaande tests; geen nieuwe page-test verplicht)

---

### Task 8: Versie

**Files:**
- Modify: `src/config/version.js` — PATCH +1 (`v1.52.124` → `v1.52.125` of wat HEAD nu is)

- [ ] **Step 1:** Bump. `devTestItems.js` niet vullen (spec: leeg tot push-naar-dev).

- [ ] **Step 2:** `npx vitest run server/utils/rccpPoSegments.test.js src/utils/poVisibleRccpScope.test.js src/components/rccp/rccpChartItems.test.js src/components/rccp/resolveRccpVendorFilter.test.js src/utils/poVendorFilterHandoff.test.js src/utils/dataPagesPrefetch.test.js src/components/rccp/RccpSplitStrip.test.jsx`

- [ ] **Step 3:** Handmatig op `http://localhost:5178` (server niet zelf starten als `dev:all` al draait): Order-filter → strip alleen die vakjes; twee vendors → geen auto-vendor; `/rccp` vendor-veld gevuld, grafiek vendor-breed; matrixklik opent geen panel.

---

## Spec-dekking

| Spec | Taak |
|------|------|
| `poNumber` + geen merge | 1 |
| Zichtbare rijen / KPI | 2 + 6 |
| Item AND PO | 3 |
| Auto-vendor strip + `/rccp` | 4, 5, 6, 7 |
| Geen stille PO-subset op `/rccp` | 7 |
| Handoff schema-guard | 5 |
| Drill-down UI weg, API blijft | 7 |
| Version PATCH | 8 |
| ≤300 / ≤10 props | 6, 7 |

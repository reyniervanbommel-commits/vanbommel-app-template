# PO-board remarks-zoekfilter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remarks-kolomfilter (`contains`) zoekt in alle actieve remarks van een order, zonder de board-load te verzwaren.

**Architecture:** Bij Apply één `GET /api/data/:tableKey/remarks/search?q=` die alleen `{ keys: [{ partitionKey, recordKey }] }` teruggeeft. Client slaat remarks over in de `order.values`-pass en intersecteert rijen op die sleutels. Board-load, summary en `tb_cache` blijven ongewijzigd.

**Tech Stack:** React 18, Vitest, Express, mssql, Fluent UI v9.

**Spec:** `docs/specs/2026-08-27-po-board-remarks-search-design.md`

**Als** medewerker of leverancier (eigen orders)
**wil ik** purchase orders filteren op remarktekst, inclusief oudere remarks
**zodat** ik de juiste order terugvind zonder elke thread te openen.

**Acceptatiecriteria**
1. Remarks-kolommenu toont Filter met alleen `contains`; sort en unique-picker ontbreken.
2. Apply met ≥ 2 tekens filtert op actieve remarks in de hele thread, niet alleen de laatste cel.
3. AND met andere kolomfilters; saved views en active-filters-flyout.
4. Zonder remarks-filter: geen extra search-call.
5. Supplier: alleen eigen orders.
6. API-fout: toast, laatste matches blijven; geen terugval naar alle rijen.
7. Geen soft-deleted remarks, geen D365-comments.
8. Unique-values van andere kolommen blijven gevuld; KPI volgt remarks-filter; BI krijgt remarks niet.

**DevOps (bij posten):** één Feature, drie child User Stories — (1) search-API, (2) board-intersectie, (3) kolommenu/flyout.

## Global Constraints

- UI-teksten Engels (`Enter at least 2 characters`, 400-messages, toast).
- Geen migratie, geen Full-Text, geen remarkbodies in board-payload of search-response.
- Hotspots niet groter maken: `usePurchaseOrderTableView.js` (343) ongewijzigd; `RowRemarksService.js` (327) geen `searchRemarks`; `PurchaseOrderColumnFilterMenu.jsx` (~298) geen extra props/sectie; `usePurchaseOrderBoardView.js` (297) net ≤300 via extractie.
- `apiRequest` (geen raw `fetch`); SQL parameterized; `time('remarks_search_sql', …)`.
- Footer PATCH in `src/config/version.js` (nu `v1.52.20` → `v1.52.21`) in de laatste taak.
- Local-first: **geen git commit** tenzij de gebruiker erom vraagt — sla commit-stappen over.
- Tests: `npx vitest run <bestand>`.

## Files

**Create**
- `server/services/RowRemarksSearchService.js` + `.test.js`
- `src/components/supplier/remarks/useRemarksColumnFilter.js` + `.test.jsx`
- `src/hooks/applyBoardMatchKeys.js` + `.test.js`
- `src/hooks/usePurchaseOrderRemarksFilterBridge.js` + `.test.jsx`

**Modify**
- `server/services/RowRemarksValidation.js`
- `server/routes/data.js`
- `server/middleware/dataAccess.js` + `.test.js`
- `src/utils/tableViewFilterUtils.js` + `.test.js`
- `src/utils/biChartFetchKey.js`
- `src/hooks/usePurchaseOrderBoardView.js` + `.test.jsx`
- `src/hooks/usePurchaseOrderColumnMenuFlags.js`
- `src/hooks/usePurchaseOrderSortFilterActions.js`
- `src/components/supplier/purchaseOrderColumnFilterMenuConstants.js`
- `src/components/supplier/PurchaseOrderColumnFilterMenu.jsx` + `.test.jsx`
- `src/components/supplier/PurchaseOrderColumnFilterMenuMainPane.jsx`
- `src/components/supplier/PurchaseOrdersActiveFilterEditor.jsx` + `.test.jsx`
- `src/components/supplier/remarks/index.js`
- `src/config/version.js`
- `src/config/devTestItems.js`

---

### Task 1: `normalizeSearchQuery`

**Files:**
- Modify: `server/services/RowRemarksValidation.js`
- Test: Create `server/services/RowRemarksValidation.test.js` (bestand bestaat nog niet)

**Interfaces:**
- Produces: `normalizeSearchQuery(value) => string` (NFC, trim, 2–200). Gooit `Error` met `status: 400` en Engelse `message`.

- [ ] **Step 1: Write the failing tests**

```js
'use strict';
const { describe, expect, it } = require('vitest');
const { normalizeSearchQuery } = require('./RowRemarksValidation');

function expectBadRequest(fn, message) {
  try {
    fn();
    throw new Error('expected throw');
  } catch (error) {
    expect(error.status).toBe(400);
    expect(error.message).toBe(message);
  }
}

describe('normalizeSearchQuery', () => {
  it('trims, NFC-normalizes, and accepts 2–200 chars', () => {
    expect(normalizeSearchQuery('  ab  ')).toBe('ab');
  });

  it('rejects non-strings, arrays, too-short, too-long, and control chars', () => {
    expectBadRequest(() => normalizeSearchQuery(['ab']), 'Search text is required');
    expectBadRequest(() => normalizeSearchQuery('a'), 'Search text must contain 2 to 200 valid characters');
    expectBadRequest(() => normalizeSearchQuery('a\nb'), 'Search text must contain 2 to 200 valid characters');
    expectBadRequest(() => normalizeSearchQuery('a'.repeat(201)), 'Search text must contain 2 to 200 valid characters');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/services/RowRemarksValidation.test.js`
Expected: FAIL (`normalizeSearchQuery` is not exported).

- [ ] **Step 3: Write minimal implementation**

In `RowRemarksValidation.js`, naast `CONTROL_CHARACTERS` een striktere set die tab/LF/CR meeneemt:

```js
const SEARCH_CONTROL_CHARACTERS = /[\u0000-\u001F\u007F-\u009F]/u;

function normalizeSearchQuery(value) {
  if (typeof value !== 'string') throw badRequest('Search text is required');
  const query = value.normalize('NFC').trim();
  if (query.length < 2 || query.length > 200 || SEARCH_CONTROL_CHARACTERS.test(query)) {
    throw badRequest('Search text must contain 2 to 200 valid characters');
  }
  return query;
}
```

Exporteer `normalizeSearchQuery` in `module.exports`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run server/services/RowRemarksValidation.test.js`
Expected: PASS.

---

### Task 2: `searchRemarks` service + IDOR-test

**Files:**
- Create: `server/services/RowRemarksSearchService.js`
- Test: `server/services/RowRemarksSearchService.test.js`

**Interfaces:**
- Consumes: `normalizeSearchQuery`, `normalizeTableKey`, `filterRowsForSupplier`, `loadSupplierVisibleRowKeys`, `getSupplierFilterColumnKey`, `getSupplierAccount`, `time`.
- Produces: `searchRemarks(tableKey, query, actor) => Promise<{ keys: Array<{ partitionKey: string, recordKey: string }> }>` plus `setTestDependencies` (zelfde patroon als `RowRemarksService`).

- [ ] **Step 1: Write the failing tests**

Spiegel de FakeRequest/`setTestDependencies`-setup van `RowRemarksService.test.js`. Cases:

1. Staff: SQL bevat `CHARINDEX(@q, body COLLATE Latin1_General_CI_AS)`, `is_deleted = 0`, `detail_key = -1`, `SELECT DISTINCT partition_key, record_key`, **geen** `body` in de SELECT. `@q` is de genormaliseerde term. Response `{ keys: [{ partitionKey, recordKey }] }`.
2. Supplier: na SQL `filterRowsForSupplier` — keys buiten `visibleKeys` verdwijnen (IDOR).
3. Bind: `inputs.q` is de string (NVarChar 200 in productiecode).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/services/RowRemarksSearchService.test.js`
Expected: FAIL (module ontbreekt).

- [ ] **Step 3: Write `searchRemarks`**

Kopieer de actor/table/pool-opzet van `summarizeRemarks` (niet importeren uit `RowRemarksService`). Query:

```sql
SELECT DISTINCT r.partition_key, r.record_key
FROM dbo.tb_row_remarks r
WHERE r.table_id = @tableId
  AND r.detail_key = -1
  AND r.is_deleted = 0
  AND CHARINDEX(@q, r.body COLLATE Latin1_General_CI_AS) > 0;
```

`.input('q', sql.NVarChar(200), query)` na `normalizeSearchQuery`. Wrap in `time('remarks_search_sql', () => …)`. Map naar `{ partitionKey, recordKey }`. Supplier: zelfde in-memory visible-keys als summary. Log `q` niet. Geen re-export via `RowRemarksService.js`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run server/services/RowRemarksSearchService.test.js`
Expected: PASS.

---

### Task 3: Route + supplier-allowlist

**Files:**
- Modify: `server/routes/data.js` (nieuwe GET **direct onder** `GET /:tableKey/remarks/summary`, vóór `GET /:tableKey/remarks`)
- Modify: `server/middleware/dataAccess.js`
- Modify: `server/middleware/dataAccess.test.js`

**Interfaces:**
- Consumes: `searchRemarks(tableKey, query, actor)` uit `RowRemarksSearchService`.
- Produces: `GET /api/data/:tableKey/remarks/search?q=` → `{ keys }`. 400 via bestaande error-middleware (`err.status`).

- [ ] **Step 1: Extend allowlist test**

In de bestaande `it.each` voor supplier GET-paden, voeg `'/purchase-orders/remarks/search'` toe.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/middleware/dataAccess.test.js`
Expected: FAIL op het nieuwe pad (403).

- [ ] **Step 3: Allowlist + route**

`dataAccess.js` GET-tak, naast summary:

```js
if (rel === '/purchase-orders/remarks/search') return true;
```

`data.js`:

```js
const { searchRemarks } = require('../services/RowRemarksSearchService');

router.get('/:tableKey/remarks/search', async (req, res, next) => {
  try {
    const tableKey = normalizeTableKey(req.params.tableKey);
    const query = normalizeSearchQuery(req.query.q);
    return res.json(await searchRemarks(tableKey, query, remarksActor(req)));
  } catch (err) {
    return next(err);
  }
});
```

Importeer `normalizeSearchQuery`. Handler dun houden (zelfde stijl als summary). `q` niet `console.log`gen.

- [ ] **Step 4: Run tests**

Run: `npx vitest run server/middleware/dataAccess.test.js`
Expected: PASS.

---

### Task 4: Value-pass skip, min-2 helper, BI-strip

**Files:**
- Modify: `src/utils/tableViewFilterUtils.js`
- Modify: `src/utils/tableViewFilterUtils.test.js`
- Modify: `src/utils/biChartFetchKey.js`
- Test: Create `src/utils/biChartFetchKey.test.js`

**Interfaces:**
- Produces: `isRemarksSearchTermValid(value) => boolean`; `columnValueMatchesFilter` returned `true` voor `dataType === 'remarks'`; `filtersFromColumnMap` slaat key `remarks` over.

- [ ] **Step 1: Write failing tests**

In `tableViewFilterUtils.test.js`:

```js
const remarks = { key: 'remarks', dataType: 'remarks' };
it('treats remarks as matching in the value pass so unique values of other columns stay filled', () => {
  expect(columnValueMatchesFilter(remarks, undefined, { operator: 'contains', value: 'delay' })).toBe(true);
  expect(hasActiveFilter(remarks, { operator: 'contains', value: 'delay' })).toBe(true);
});
it('isRemarksSearchTermValid requires 2–200 trimmed chars', () => {
  expect(isRemarksSearchTermValid(' a ')).toBe(false);
  expect(isRemarksSearchTermValid('ab')).toBe(true);
});
it('filterItemsByColumnFilters ignores remarks cell values', () => {
  const items = [{ values: { vendor: 'Acme' } }];
  const columns = [{ key: 'vendor', dataType: 'text' }, remarks];
  const filters = { remarks: { operator: 'contains', value: 'delay' }, vendor: { operator: 'contains', value: 'acme' } };
  expect(filterItemsByColumnFilters(items, columns, filters)).toHaveLength(1);
});
```

In `biChartFetchKey.test.js`: `filtersFromColumnMap({ remarks: { operator: 'contains', value: 'ab' }, vendor: { operator: 'contains', value: 'x' } })` bevat geen `remarks`.

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npx vitest run src/utils/tableViewFilterUtils.test.js src/utils/biChartFetchKey.test.js`

- [ ] **Step 3: Implement**

Bovenaan `columnValueMatchesFilter`:

```js
if (column?.dataType === 'remarks') return true;
```

```js
export function isRemarksSearchTermValid(value) {
  const term = String(value ?? '').trim();
  return term.length >= 2 && term.length <= 200;
}
```

Houd `tableViewFilterUtils.js` onder 300 regels.

`filtersFromColumnMap`: `.filter(([columnKey, filter]) => columnKey !== 'remarks' && filter && filter.operator)`.

- [ ] **Step 4: Run tests — expect PASS**

`usePurchaseOrderTableView.js` niet aanpassen.

---

### Task 5: Search-hook, match-keys helper, board-view

**Files:**
- Create: `src/components/supplier/remarks/useRemarksColumnFilter.js` + `.test.jsx`
- Create: `src/hooks/applyBoardMatchKeys.js` + `.test.js`
- Create: `src/hooks/usePurchaseOrderRemarksFilterBridge.js` + `.test.jsx`
- Modify: `src/components/supplier/remarks/index.js`
- Modify: `src/hooks/usePurchaseOrderBoardView.js` + `.test.jsx`

**Interfaces:**
- `useRemarksColumnFilter({ query, enabled, tableKey = 'purchase-orders' }) => { matchKeys: Set<string>|null, loading: boolean, error: string }`
- `applyBoardMatchKeys({ processedItems, remarksFilterEnabled, remarksMatchKeys, kpiMatchKeys, kpiFilterKey, kpiQtyOverlay }) => { columnFiltered, displayedItems }`
  - `!remarksFilterEnabled` → `columnFiltered = processedItems`
  - `remarksFilterEnabled && remarksMatchKeys == null` → `columnFiltered = []` (eerste load: wacht, niet alles)
  - anders filter op `rowKey(dataAreaId, orderNumber)`
  - daarna KPI op `columnFiltered`
- `usePurchaseOrderRemarksFilterBridge(filterByColumn) => { matchKeys }` — toast via `useAppToast.notifyError` op `error` (niet `AbortError`). Mock `useAppToast` in board-view tests of wrap met Fluent toaster.
- `matchKeys === null` alleen als filter inactief. In-flight: vorige Set houden.

- [ ] **Step 1: Failing tests voor de hook**

`useRemarksColumnFilter.test.jsx`: mock `apiRequest`.

- `enabled: false` → geen call, `matchKeys === null`.
- `enabled: true`, query `delay` → `GET /data/purchase-orders/remarks/search?q=delay`, `matchKeys` is Set van `rowKey`.
- Tweede call faalt → vorige Set blijft, `error` gezet, geen `AbortError`-error.
- Query-wissel aborted vorige request.

`applyBoardMatchKeys.test.js`:
- `remarksFilterEnabled: false` → alle `processedItems`.
- `remarksFilterEnabled: true`, `remarksMatchKeys: null` → `columnFiltered` leeg.
- `remarksFilterEnabled: true` + Set → alleen matching `rowKey`; daarna KPI op `orderNumber`.

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement hook (geen JSX)**

Patroon van `useRemarksSummary`, maar:

- effect-deps: `[query, enabled, tableKey]` — **niet** heel `filterByColumn`.
- bij start: keys niet wissen als `enabled`.
- URL: `` `/data/${encodeURIComponent(tableKey)}/remarks/search?q=${encodeURIComponent(query)}` `` via `apiRequest`.
- Return `useMemo` object.

Bridge:

```js
const query = String(filterByColumn?.remarks?.value || '').trim();
const enabled = filterByColumn?.remarks?.operator === 'contains' && isRemarksSearchTermValid(query);
const result = useRemarksColumnFilter({ query, enabled });
useEffect(() => { if (result.error) notifyError(result.error); }, [result.error, notifyError]);
```

`usePurchaseOrderBoardView`: extraheer huidige `displayedItems`-useMemo naar `applyBoardMatchKeys` **eerst**. Daarna één aanroep `usePurchaseOrderRemarksFilterBridge(tableView.filterByColumn)`. Geef `remarksFilterEnabled` + `matchKeys` aan de helper. Zet `kpiSourceItems` op `columnFiltered`. Bestand ≤300 regels. Mock `useAppToast` in bestaande board-view tests.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/components/supplier/remarks/useRemarksColumnFilter.test.jsx src/hooks/applyBoardMatchKeys.test.js src/hooks/usePurchaseOrderBoardView.test.jsx`
Expected: PASS. Export hook in `remarks/index.js`.

---

### Task 6: Kolommenu, flyout, version

**Files:**
- Modify: `src/hooks/usePurchaseOrderColumnMenuFlags.js` — `isImageColumn` alleen `dataType === 'image'` (niet remarks). `canHideColumn` daardoor aan voor remarks. Geen extra return-waarden.
- Modify: `src/components/supplier/PurchaseOrderColumnFilterMenu.jsx` — `showSortAndFilter={!readOnlyColumnMenu}` blijft; unique values skip remarks (`if (!open || isDate || column.dataType === 'remarks')`). Operatorlijst: als remarks alleen `{ contains: 'contains' }` uit constants. Geen extra props.
- Modify: `src/components/supplier/PurchaseOrderColumnFilterMenuMainPane.jsx` — afleiden: `const isRemarks = column?.dataType === 'remarks'`; `showSort = showSortAndFilter && !isRemarks`; `showFilter = showSortAndFilter`; grouping `showGrouping && !isRemarks`; kleursectie `colorFilter?.supported && !isRemarks`. FilterSection: `searchHint` vanuit MainPane; operator-flyout verbergen als `operatorEntries.length === 1`.
- Modify: `src/components/supplier/purchaseOrderColumnFilterMenuConstants.js` — `REMARKS_FILTER_OPERATORS = { contains: 'contains' }`.
- Modify: `src/hooks/usePurchaseOrderSortFilterActions.js` — `handleApplyFilter`: als `isRemarksSearchTermValid` false **en** current column remarks: niet `onApplyFilter` aanroepen (geen state-change). Validatietekst in de FilterSection: toon `Enter at least 2 characters` als remarks en term < 2. Dat vereist een kleine hint in FilterSection — alleen als `column.dataType === 'remarks'` (FilterSection heeft `columnLabel`; geef `isRemarksSearch` boolean mee **alleen als MainPane het al weet** — MainPane mag `isRemarks` intern gebruiken en een bestaande `hint` niet via FilterMenu-props tillen). Als FilterSection geen column krijgt: voeg optionele prop `searchHint` default `''` toe in MainPane, niet in FilterMenu.jsx.
- Modify: `src/components/supplier/PurchaseOrdersActiveFilterEditor.jsx` — remarks: alleen `contains`, geen unique-picker (`usesValuePicker = false`), Apply gated op `isRemarksSearchTermValid`.
- Modify: tests `PurchaseOrderColumnFilterMenu.test.jsx` (Remarks toont Filter, geen Sort/unique/kleur/grouping/rename); flyout-test.
- Modify: `src/hooks/usePurchaseOrderSortFilterActions.test.js` (bestand bestaat) — Apply met `'a'` op `columnDataType: 'remarks'` roept `onApplyFilter` niet aan.
- Modify: `src/config/version.js` PATCH (`v1.52.20` → `v1.52.21`).
- Modify: `src/config/devTestItems.js` — item met checks: Filter op Remarks; zoeken in oudere remark; min. 2 tekens; supplier ziet alleen eigen orders.

- [ ] **Step 1: Update menu test**

Bestaande test `verbergt niet-ondersteunde acties voor de vaste Remarks-kolom`: behoud geen rename/formatting/text-style; **voeg toe** dat Filter `contains` zichtbaar is en Sort **niet**. Unique-picker afwezig.

- [ ] **Step 2: Run — expect FAIL** (Filter ontbreekt nog)

- [ ] **Step 3: Implement flags + MainPane-afleiding + Apply-gate + flyout + version**

- [ ] **Step 4: Run**

Run: `npx vitest run src/components/supplier/PurchaseOrderColumnFilterMenu.test.jsx src/components/supplier/PurchaseOrdersActiveFilterEditor.test.jsx src/hooks/usePurchaseOrderSortFilterActions.test.js`
Expected: PASS. **Pin:** `usePurchaseOrderSortFilterActions` krijgt optionele `columnDataType`; FilterMenu geeft `columnDataType={column.dataType}` door (hook-arg, geen extra MainPane-prop). Gate:

```js
if (columnDataType === 'remarks' && !isRemarksSearchTermValid(draft.value)) return;
```

---

## Spec coverage

| Spec | Taak |
|---|---|
| Search-API, CHARINDEX, geen bodies, NVarChar(200) | 2–3 |
| Supplier allowlist + IDOR | 2–3 |
| Value-pass skip + unique values + tabs | 4 |
| BI-strip | 4 |
| Hook deps = remarks-term; null-semantiek; abort | 5 |
| Remarks→KPI volgorde; kpiSourceItems | 5 |
| Filter UI contains-only, geen sort/unique/kleur/grouping | 6 |
| Min 2 tekens, Engels | 1, 4, 6 |
| Version PATCH + DEV-checklist | 6 |
| Geen table-view-/RowRemarksService-groei | 2, 4 |

## Execution

Plan opgeslagen. Daarna (alleen op verzoek): `review-plan-for-devops` → `post-plan-to-devops`, of bouwen via `develop-from-devops` / executing-plans.

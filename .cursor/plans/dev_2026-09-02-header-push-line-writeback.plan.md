# Header-edit van gepushte D365-line-waarden Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Staff kan een via *Push values to header* gekoppelde D365-writable line-kolom vanaf de header bewerken; één POST schrijft alle regels van die PO terug, ook bij `+N`.

**Als** staff (admin of employee) op het purchase-orderboard
**wil ik** een gepushte D365-writable line-waarde op de header inline wijzigen
**zodat** die waarde naar D365 gaat op alle regels van die ene order, ook als de header `+N` toont.

**Acceptatiecriteria:**
- Writable bron-line + push-link → header-cel bewerkbaar; anders read-only.
- Save (één waarde of `+N`) PATCHt alle niet-gelijke regels van díé PO; andere POs onaangeroerd.
- Volledig succes → één waarde, geen `+N`. Lege PO / 0 regels → geen PATCH, rollup blijft leeg/`-`.
- Deel-409 → fout op de header, geen rollback, rollup volgt resterende verschillen.
- Multi-select → geen bulk-dialoog. Leverancier → geen editor + POST 403.
- UI-teksten Engels.

**Architecture:** Header-cel is een proxy. `POST /api/data/purchase-orders/correct-all-details` zoekt detailrijen in `tb_cache` en roept bestaande `correctField` sequentieel aan (max 200 PATCH). Client gebruikt een apart `onCorrectAllLines`-pad (niet `handleCorrectField`, geen bulk over andere POs). Rollup via immutable `patchLinkedLineValues`.

**Tech Stack:** React 18, Fluent UI v9, Express, MSSQL (`tb_cache` / `tb_field_corrections`), D365 OData PATCH, Vitest.

**Spec:** [docs/specs/2026-09-02-header-push-line-writeback-design.md](../../docs/specs/2026-09-02-header-push-line-writeback-design.md)

## Global Constraints

- UI Engels (labels, foutmeldingen, `aria-label`).
- Componenten ≤300 regels; bij 250+ splitsen vóór uitbreiding.
- `requireSession` + `restrictSupplierDataAccess`; leverancier 403 op deze POST.
- Geen extra query op de board-read; geen line numbers in de list-payload.
- `apiRequest` voor de client-call; `time('tb_correct_all_details')` op de server.
- `src/config/version.js` PATCH +1 in de laatste taak.
- OTAP local-first: **geen git commit/push** tenzij de gebruiker dat expliciet vraagt. Sla de Commit-stappen hieronder over.
- Tests: `npx vitest run <bestand>`.

---

## Bestanden

**Nieuw**

- `server/utils/odataValueEquals.js` + `.test.js` — `normalizeComparableValue`, `valuesEqualForConcurrency` (nu privé in D365ODataService)
- `server/utils/detailCorrectionFanout.js` + `.test.js` — skip, remaining uniques, business vs infra, cap 200; **geen** service-imports
- `src/utils/linkedLineValueMeta.js` + `.test.js` — `buildLinkedLineValueByHeaderKey`
- `src/utils/writeBackDateUtils.js` — datum-helpers uit WriteBackCell
- `src/hooks/usePurchaseOrderCorrectAllLines.js` + `.test.js`
- `src/components/supplier/PurchaseOrderLinkedHeaderValue.jsx` + `.test.jsx`

**Wijzig**

- `server/services/D365ODataService.js` — comparator importeren
- `server/services/TableDataService.js` — `correctAllDetailFields` + export
- `server/routes/data.js` — POST `/:tableKey/correct-all-details`
- `server/middleware/dataAccess.test.js` — supplier 403
- `src/hooks/usePurchaseOrdersBoardLinks.js`, `usePurchaseOrderBoardView.js`, `usePurchaseOrdersBoardLineLinks.js`
- `src/hooks/usePurchaseOrderLineDetails.js` — `applyLineValuesBatch`
- `src/hooks/usePurchaseOrdersPage.js` — alleen `patchLinkedLineValues`
- `src/components/supplier/PurchaseOrderWriteBackCell.jsx` — extract + `err.remainingDisplayValue`
- `src/components/supplier/PurchaseOrderHeaderCellContent.jsx` — linked-tak eruit; `actions.onCorrectAllLines`
- `src/components/supplier/PurchaseOrderBoardCell.jsx` — `actions` doorgeven, geen extra named prop
- `src/components/supplier/PurchaseOrdersPageContent.jsx` — hook hier instantiëren; `cellActions.onCorrectAllLines` alleen `isStaff`
- `src/components/supplier/PurchaseOrdersBoardTable.jsx` — `isStaff` doorgeven aan `usePurchaseOrdersBoardLinks`
- `src/config/version.js` — PATCH +1 op het moment van bouwen (niet hardcoden)

---

### Task 1: Comparator + fan-out-util (puur)

**Files:**
- Create: `server/utils/odataValueEquals.js`
- Create: `server/utils/odataValueEquals.test.js`
- Create: `server/utils/detailCorrectionFanout.js`
- Create: `server/utils/detailCorrectionFanout.test.js`
- Modify: `server/services/D365ODataService.js` — verwijder lokale `normalizeComparableValue` / `valuesEqualForConcurrency`; `const { valuesEqualForConcurrency } = require('../utils/odataValueEquals');`

**Interfaces:**
- Produces: `valuesEqualForConcurrency(currentValue, basedOnValue, dataType) => boolean`
- Produces: `MAX_DETAIL_PATCHES = 200`
- Produces: `planFanout({ lines, columnKey, dataType, targetValue, valuesEqual }) => { toPatch, skipped, tooMany }`
- Produces: `remainingValuesAfterPass({ lines, columnKey, targetValue, updatedDetailKeys, failedDetailKeys }) => any[]`
- Produces: `isBusinessWriteBackError(err) => boolean` (status 400, 404, 409)
- Produces: `isInfraWriteBackError(err) => boolean` (status ≥ 500 of ontbreekt)
- Consumes: nothing (geen TableDataService)

- [ ] **Step 1: Write failing tests**

```js
// server/utils/odataValueEquals.test.js
const { valuesEqualForConcurrency } = require('./odataValueEquals');

describe('valuesEqualForConcurrency', () => {
  it('treats date-only ISO and date-only as equal', () => {
    expect(valuesEqualForConcurrency('2026-08-25T00:00:00.000Z', '2026-08-25', 'date')).toBe(true);
  });
  it('treats different text as not equal', () => {
    expect(valuesEqualForConcurrency('Red', 'Blue', 'text')).toBe(false);
  });
});
```

```js
// server/utils/detailCorrectionFanout.test.js
const {
  MAX_DETAIL_PATCHES,
  planFanout,
  remainingValuesAfterPass,
  isBusinessWriteBackError,
  isInfraWriteBackError,
} = require('./detailCorrectionFanout');
const { valuesEqualForConcurrency } = require('./odataValueEquals');

const eq = (a, b) => valuesEqualForConcurrency(a, b, 'text');

describe('planFanout', () => {
  it('skips equal values and counts patches', () => {
    const plan = planFanout({
      lines: [
        { detailKey: 1, values: { color: 'Red' }, removed: false },
        { detailKey: 2, values: { color: 'Blue' }, removed: false },
        { detailKey: 3, values: { color: 'Red' }, removed: true },
      ],
      columnKey: 'color',
      targetValue: 'Red',
      valuesEqual: eq,
    });
    expect(plan.skipped).toEqual([1]);
    expect(plan.toPatch.map((l) => l.detailKey)).toEqual([2]);
    expect(plan.tooMany).toBe(false);
  });

  it('sets tooMany when patch count exceeds cap', () => {
    const lines = Array.from({ length: MAX_DETAIL_PATCHES + 1 }, (_, i) => ({
      detailKey: i + 1, values: { color: 'A' }, removed: false,
    }));
    expect(planFanout({
      lines, columnKey: 'color', targetValue: 'B', valuesEqual: eq,
    }).tooMany).toBe(true);
  });
});

describe('remainingValuesAfterPass', () => {
  it('uses target for updated lines and old value for failed', () => {
    const remaining = remainingValuesAfterPass({
      lines: [
        { detailKey: 1, values: { color: 'Red' } },
        { detailKey: 2, values: { color: 'Blue' } },
      ],
      columnKey: 'color',
      targetValue: 'Green',
      updatedDetailKeys: [1],
      failedDetailKeys: [2],
    });
    expect(remaining).toEqual(['Green', 'Blue']);
  });
});

describe('error class', () => {
  it('classifies 409 as business and 502 as infra', () => {
    expect(isBusinessWriteBackError({ status: 409 })).toBe(true);
    expect(isInfraWriteBackError({ status: 502 })).toBe(true);
    expect(isInfraWriteBackError({ status: 409 })).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run server/utils/odataValueEquals.test.js server/utils/detailCorrectionFanout.test.js`

Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

Kopieer `normalizeComparableValue` + `valuesEqualForConcurrency` 1-op-1 uit `D365ODataService.js` (regels ~280–313) naar `odataValueEquals.js` en exporteer beide. D365ODataService importeert ze; verwijder de lokale kopieën.

`detailCorrectionFanout.js`:

```js
'use strict';

const MAX_DETAIL_PATCHES = 200;

function planFanout({ lines, columnKey, targetValue, valuesEqual }) {
  const skipped = [];
  const toPatch = [];
  for (const line of lines || []) {
    if (line.removed) continue;
    const current = line.values?.[columnKey];
    if (valuesEqual(current, targetValue)) skipped.push(line.detailKey);
    else toPatch.push(line);
  }
  return { toPatch, skipped, tooMany: toPatch.length > MAX_DETAIL_PATCHES };
}

function remainingValuesAfterPass({
  lines, columnKey, targetValue, updatedDetailKeys, failedDetailKeys,
}) {
  const updated = new Set(updatedDetailKeys);
  const seen = new Set();
  const list = [];
  for (const line of lines || []) {
    if (line.removed) continue;
    const next = updated.has(line.detailKey) ? targetValue : line.values?.[columnKey];
    if (next === null || next === undefined || next === '') continue;
    const key = String(next).trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    list.push(next);
  }
  return list;
}

function isBusinessWriteBackError(err) {
  const status = Number(err?.status);
  return status === 400 || status === 404 || status === 409;
}

function isInfraWriteBackError(err) {
  const status = Number(err?.status);
  return !Number.isFinite(status) || status >= 500;
}

module.exports = {
  MAX_DETAIL_PATCHES,
  planFanout,
  remainingValuesAfterPass,
  isBusinessWriteBackError,
  isInfraWriteBackError,
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run server/utils/odataValueEquals.test.js server/utils/detailCorrectionFanout.test.js server/services/D365ODataService.test.js`

Expected: PASS (bestaande writeBackField-tests blijven groen).

---

### Task 2: `correctAllDetailFields` + route + 403

**Files:**
- Modify: `server/services/TableDataService.js` — functie + `module.exports`
- Create: `server/services/correctAllDetailFields.test.js`
- Modify: `server/routes/data.js` — POST naast `/correct`
- Modify: `server/middleware/dataAccess.test.js`

**Interfaces:**
- Consumes: `planFanout`, `remainingValuesAfterPass`, `isBusinessWriteBackError`, `isInfraWriteBackError`, `MAX_DETAIL_PATCHES`, `correctField`, `time`
- Produces: `correctAllDetailFields({ tableKey, columnId, partitionKey, recordKey, value }, user) => result | throws`

`user` = `{ id, role }` uit `req.user`. Role niet admin/employee → `Error` status 403 *"Access denied — insufficient permissions"*.

Result bij HTTP 200:

```js
{
  attempted, updated, skipped, failed,
  failures: [{ detailKey, message }],
  remainingValues,
  updatedDetailKeys,
}
```

GENERIC_FAIL = `'Write-back to D365 failed'`

- [ ] **Step 1: Write failing tests**

```js
// server/services/correctAllDetailFields.test.js
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('./TableRegistryService', () => ({
  getColumnById: vi.fn(),
  getTableByKey: vi.fn(),
}));

// Mock pool + correctField via de module onder test is lastig als ze in één file zitten.
// Test de geëxporteerde functie met vi.spyOn op sql/getPool OF extraheer de loop
// achter een injecteerbare `correctOne` in de test door de publieke API te raken
// met een lichte stub van getPool.

describe('correctAllDetailFields auth', () => {
  it('throws 403 for supplier role before any SQL', async () => {
    const { correctAllDetailFields } = await import('./TableDataService');
    await expect(correctAllDetailFields(
      { tableKey: 'purchase-orders', columnId: 1, partitionKey: 'nl01', recordKey: 'PO-1', value: 'X' },
      { id: 9, role: 'supplier' },
    )).rejects.toMatchObject({ status: 403 });
  });
});
```

Als `correctAllDetailFields` nog niet bestaat, faalt de import. Voeg daarna cases toe (met `vi.spyOn` op interne helpers of door `correctField` te stubben) voor:

- `tableKey !== 'purchase-orders'` → 400
- kolom `scope !== 'detail'` → 400
- `toPatch.length > 200` → 400 *Too many lines to write back from the header.*
- 409 op regel 2, succes op 1 → geen throw, `failed === 1`, `updated === 1`
- 502 op eerste regel → throw status 502
- 502 ná een succes → 200-vormig resultaat, `failures[0].message === 'Write-back to D365 failed'`, geen OData-body

`dataAccess.test.js` extra case:

```js
it('weigert supplier POST op /purchase-orders/correct-all-details met 403', () => {
  const { res, next } = callMiddleware({
    user: { role: 'supplier' },
    path: '/purchase-orders/correct-all-details',
    method: 'POST',
  });
  expect(res.statusCode).toBe(403);
  expect(next.calls).toHaveLength(0);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run server/services/correctAllDetailFields.test.js server/middleware/dataAccess.test.js`

Expected: FAIL op 403-case tot de test is toegevoegd; service-import faalt tot de export bestaat.

- [ ] **Step 3: Implement service + route**

SQL (parameters, **geen** `NOLOCK`):

```sql
SELECT detail_key, data_json, removed_at_source
FROM dbo.tb_cache
WHERE table_id = @tableId AND scope = 'detail'
  AND partition_key = @partitionKey AND record_key = @recordKey
ORDER BY detail_key
```

Orchestratie (schets, in `time('tb_correct_all_details', async () => { ... })`):

1. Role-check; `getTableByKey`; `tableKey === 'purchase-orders'`.
2. `getColumnById` + zelfde writable-guards als `correctField` + `scope === 'detail'` + `column.tableId === table.id`.
3. Map rijen → `{ detailKey, values: parseJson(data_json), removed: removed_at_source === true/1 }`.
4. `planFanout` met `valuesEqualForConcurrency` en `column.dataType`. `tooMany` → 400.
5. `attempted = toPatch.length`; loop `toPatch` sequentieel:
   - `await correctField({ tableKey, columnId, partitionKey, recordKey, detailKey, value, basedOnValue: line.values[column.key] }, user.id)`
   - succes → `updatedDetailKeys.push`
   - `isBusinessWriteBackError` → `failures.push({ detailKey, message: err.message })`, doorgaan
   - `isInfraWriteBackError` → als `updatedDetailKeys.length === 0` rethrow; anders `failures.push({ detailKey, message: GENERIC_FAIL })` en **break**
6. `remainingValuesAfterPass` over alle niet-removed lines.
7. Return counts (`skipped: skipped.length`, `failed: failures.length`).

Route (`server/routes/data.js`, naast `/correct`):

```js
router.post('/:tableKey/correct-all-details', async (req, res, next) => {
  try {
    const { columnId, partitionKey, recordKey, value } = req.body || {};
    const id = toColumnId(columnId);
    if (!id) return res.status(400).json({ error: 'Invalid column id' });
    const result = await dataService.correctAllDetailFields(
      { tableKey: req.params.tableKey, columnId: id, partitionKey, recordKey, value },
      req.user,
    );
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run server/services/correctAllDetailFields.test.js server/middleware/dataAccess.test.js server/routes/data.test.js`

Expected: PASS.

---

### Task 3: WriteBackCell datum-extractie + remaining display

**Files:**
- Create: `src/utils/writeBackDateUtils.js`
- Create: `src/utils/writeBackDateUtils.test.js`
- Create: `src/components/supplier/PurchaseOrderWriteBackCell.test.jsx` — `remainingDisplayValue` op reject
- Modify: `src/components/supplier/PurchaseOrderWriteBackCell.jsx` — import helpers; catch gebruikt `err.remainingDisplayValue`

**Interfaces:**
- Produces: bestaande `normalizeDateValue`, `toDisplayDateValue`, `isDateDataType`, `isDateLikeColumn`, `toInputValue`, `toCalendarValue` als named exports
- WriteBackCell catch:

```js
} catch (err) {
  setStatus('error');
  setError(err.message || 'Write-back failed');
  const fallback = err.remainingDisplayValue !== undefined && err.remainingDisplayValue !== null
    ? err.remainingDisplayValue
    : value;
  setLocal(toInputValue(fallback, column.dataType, treatAsDate));
}
```

Geen extra `useState`. Bestand ná extractie onder 250 houden.

- [ ] **Step 1: Write failing test**

```js
it('uses remainingDisplayValue on reject instead of the pre-edit value', async () => {
  const onCorrect = vi.fn().mockRejectedValue(
    Object.assign(new Error('Write-back failed on 1 of 2 lines.'), {
      remainingDisplayValue: 'Blue',
    }),
  );
  // render WriteBackCell value="Red" ; change to Green; blur
  // expect input to show Blue, not Red
});
```

- [ ] **Step 2: Run test — FAIL** (catch negeert `remainingDisplayValue`)

- [ ] **Step 3: Extract utils + catch-wijziging**

- [ ] **Step 4: Run** `npx vitest run src/utils/writeBackDateUtils.test.js src/components/supplier/PurchaseOrderWriteBackCell.test.jsx`

Expected: PASS. Tel regels WriteBackCell < 300.

---

### Task 4: Linked-value meta builder (drie hooks)

**Files:**
- Create: `src/utils/linkedLineValueMeta.js`
- Create: `src/utils/linkedLineValueMeta.test.js`
- Modify: `src/hooks/usePurchaseOrdersBoardLinks.js`
- Modify: `src/hooks/usePurchaseOrderBoardView.js`
- Modify: `src/hooks/usePurchaseOrdersBoardLineLinks.js`
- Modify: bijbehorende hook-tests (writable-vlag + `lineColumnId`)

**Interfaces:**
- Produces:

```js
export function buildLinkedLineValueByHeaderKey(lineValueHeaderLinks, lineColumns, { isStaff = true } = {}) {
  // per link:
  // { lineColumnKey, lineColumnId, lineDataType, lineColumnLabel, writableToD365, lineColumnOptions, lineColumn }
  // lineColumn = lineColumns.find(...) referentie, geen kloon
  // writableToD365 = Boolean(isStaff && lineColumn?.writableToD365 && lineColumn?.d365Field)
}
```

`lineColumnId` = `lineColumn?.id ?? null`.

- [ ] **Step 1: Failing tests**

```js
it('marks writable only for staff + d365 writable line column', () => {
  const lineColumns = [
    { id: 44, key: 'color', label: 'Color', dataType: 'text', writableToD365: true, d365Field: 'Color' },
  ];
  const map = buildLinkedLineValueByHeaderKey(
    [{ headerColumnKey: 'colorValues', lineColumnKey: 'color' }],
    lineColumns,
    { isStaff: true },
  );
  expect(map.colorValues).toMatchObject({
    lineColumnKey: 'color',
    lineColumnId: 44,
    lineDataType: 'text',
    lineColumnLabel: 'Color',
    writableToD365: true,
  });
  expect(map.colorValues.lineColumn).toBe(lineColumns[0]);
});

it('forces writable false for non-staff', () => {
  const map = buildLinkedLineValueByHeaderKey(
    [{ headerColumnKey: 'colorValues', lineColumnKey: 'color' }],
    [{ id: 44, key: 'color', writableToD365: true, d365Field: 'Color' }],
    { isStaff: false },
  );
  expect(map.colorValues.writableToD365).toBe(false);
});
```

- [ ] **Step 2: FAIL** — module ontbreekt

- [ ] **Step 3: Implement builder; vervang de drie inline reducers**

`usePurchaseOrdersBoardLinks` krijgt optionele `isStaff` (default true). `PurchaseOrdersBoardTable.jsx` geeft `isStaff` door (staat al in scope bij de `cellActions`-merge). Leverancier-pad heeft `disableWriteBack` al op `lineColumns`.

BoardView-formatter heeft `writableToD365` niet nodig voor weergave, maar gebruikt dezelfde builder zodat keys niet divergeren.

- [ ] **Step 4: Run** `npx vitest run src/utils/linkedLineValueMeta.test.js src/hooks/usePurchaseOrdersBoardLinks.test.jsx src/hooks/usePurchaseOrdersBoardLineLinks.test.jsx src/hooks/usePurchaseOrderBoardView.js`

Expected: PASS. `usePurchaseOrderBoardView.js` niet laten groeien (alleen import + builder-call).

---

### Task 5: `patchLinkedLineValues` + `applyLineValuesBatch` + hook

**Files:**
- Modify: `src/hooks/usePurchaseOrdersPage.js` — ~10 regels naast `applyFormulaValuesToOrder`
- Modify: `src/hooks/usePurchaseOrderLineDetails.js` + `.test.jsx`
- Create: `src/hooks/usePurchaseOrderCorrectAllLines.js`
- Create: `src/hooks/usePurchaseOrderCorrectAllLines.test.js`

**Interfaces:**

```js
// usePurchaseOrdersPage.js
const patchLinkedLineValues = useCallback((dataAreaId, orderNumber, headerKey, remainingValues) => {
  setOrders((prev) => prev.map((order) => (
    order.dataAreaId !== dataAreaId || order.orderNumber !== orderNumber
      ? order
      : {
        ...order,
        linkedLineValues: { ...(order.linkedLineValues || {}), [headerKey]: remainingValues },
      }
  )));
}, []);
```

Exporteer `patchLinkedLineValues` in de page-return (naast `correctField`).

```js
// usePurchaseOrderLineDetails.js
const applyLineValuesBatch = useCallback((dataAreaId, orderNumber, updateLine /* (line) => line */) => {
  const key = lineDetailsKey(dataAreaId, orderNumber);
  const entry = entriesRef.current.get(key);
  if (!entry || !Array.isArray(entry.lines)) return null;
  const next = new Map(entriesRef.current);
  next.set(key, { ...entry, lines: entry.lines.map(updateLine) });
  commit(next);
  return entry.lines;
}, [commit]);
```

```js
// usePurchaseOrderCorrectAllLines.js
export function usePurchaseOrderCorrectAllLines({
  patchLinkedLineValues,
  applyLineValuesBatch,
}) {
  const onCorrectAllLines = useCallback(async ({
    lineColumnId, lineColumnKey, headerColumnKey, dataAreaId, orderNumber, value,
  }) => {
    const response = await apiRequest('/data/purchase-orders/correct-all-details', {
      method: 'POST',
      body: { columnId: lineColumnId, partitionKey: dataAreaId, recordKey: orderNumber, value },
    });
    const remaining = Array.isArray(response.remainingValues) ? response.remainingValues : [];
    patchLinkedLineValues(dataAreaId, orderNumber, headerColumnKey, remaining);
    const updated = new Set(response.updatedDetailKeys || []);
    applyLineValuesBatch?.(dataAreaId, orderNumber, (line) => (
      updated.has(line.lineNumber)
        ? { ...line, values: { ...line.values, [lineColumnKey]: value } }
        : line
    ));
    if (response.failed > 0) {
      const err = new Error(`Write-back failed on ${response.failed} of ${response.attempted} lines.`);
      err.remainingDisplayValue = remaining[0] ?? '';
      throw err;
    }
    return response;
  }, [applyLineValuesBatch, patchLinkedLineValues]);

  return useMemo(() => ({ onCorrectAllLines }), [onCorrectAllLines]);
}
```

Return **alleen** `{ onCorrectAllLines }`. Geen `loading`. POST in de callback, geen `useEffect`.

- [ ] **Step 1: Hook-test**

```js
it('POSTs line columnId and patches remaining values on partial fail', async () => {
  apiRequest.mockResolvedValue({
    attempted: 2, updated: 1, skipped: 0, failed: 1,
    remainingValues: ['Green', 'Blue'],
    updatedDetailKeys: [10],
  });
  const patchLinkedLineValues = vi.fn();
  const applyLineValuesBatch = vi.fn();
  const { result } = renderHook(() => usePurchaseOrderCorrectAllLines({
    patchLinkedLineValues, applyLineValuesBatch,
  }));
  await expect(result.current.onCorrectAllLines({
    lineColumnId: 44, lineColumnKey: 'color', headerColumnKey: 'colorValues',
    dataAreaId: 'nl01', orderNumber: 'PO-1', value: 'Green',
  })).rejects.toMatchObject({ remainingDisplayValue: 'Green' });
  expect(apiRequest).toHaveBeenCalledWith(
    '/data/purchase-orders/correct-all-details',
    expect.objectContaining({
      method: 'POST',
      body: { columnId: 44, partitionKey: 'nl01', recordKey: 'PO-1', value: 'Green' },
    }),
  );
  expect(patchLinkedLineValues).toHaveBeenCalledWith('nl01', 'PO-1', 'colorValues', ['Green', 'Blue']);
});

it('uses remainingValues [] on empty order instead of [value]', async () => {
  apiRequest.mockResolvedValue({
    attempted: 0, updated: 0, skipped: 0, failed: 0,
    remainingValues: [],
    updatedDetailKeys: [],
  });
  const patchLinkedLineValues = vi.fn();
  const { result } = renderHook(() => usePurchaseOrderCorrectAllLines({
    patchLinkedLineValues, applyLineValuesBatch: vi.fn(),
  }));
  await result.current.onCorrectAllLines({
    lineColumnId: 44, lineColumnKey: 'color', headerColumnKey: 'colorValues',
    dataAreaId: 'nl01', orderNumber: 'PO-1', value: 'Green',
  });
  expect(patchLinkedLineValues).toHaveBeenCalledWith('nl01', 'PO-1', 'colorValues', []);
});
```

Mock `apiRequest` zoals andere hook-tests in `src/hooks`.

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Implement de drie functies; wire alleen in PageContent**

`patchLinkedLineValues` exporteren vanuit `usePurchaseOrdersPage` (return). `applyLineValuesBatch` vanuit `lineDetails`.

Hook **alleen** instantiëren in `PurchaseOrdersPageContent.jsx` (niet in `PurchaseOrdersPage.jsx`):

```js
const { onCorrectAllLines } = usePurchaseOrderCorrectAllLines({
  patchLinkedLineValues: pageModel.patchLinkedLineValues,
  applyLineValuesBatch: pageModel.lineDetails.applyLineValuesBatch,
});
```

Zet op de bestaande `cellActions`-`useMemo` (~regel 121):

```js
onCorrectAllLines: isStaff ? onCorrectAllLines : undefined,
```

**Niet** `usePurchaseOrdersBoardTableProps.js` wijzigen (geen live pad). **Niet** via `handleCorrectField`.

Voeg een hook-test toe voor lege PO: response `{ attempted: 0, failed: 0, remainingValues: [] }` → `patchLinkedLineValues(..., [])`, geen throw.

- [ ] **Step 4: Run** `npx vitest run src/hooks/usePurchaseOrderCorrectAllLines.test.js src/hooks/usePurchaseOrderLineDetails.test.jsx`

Expected: PASS.

---

### Task 6: Header UI — linked write-back + geen 14e prop

**Files:**
- Create: `src/components/supplier/PurchaseOrderLinkedHeaderValue.jsx`
- Create: `src/components/supplier/PurchaseOrderLinkedHeaderValue.test.jsx`
- Modify: `src/components/supplier/PurchaseOrderHeaderCellContent.jsx` — linked-tak vervangen door het nieuwe component; `actions` i.p.v. extra named prop
- Modify: `src/components/supplier/PurchaseOrderBoardCell.jsx` — `actions={actions}` (of bestaande actions al; voeg **geen** `onCorrectAllLines=` named prop toe)
- Modify: `src/components/supplier/PurchaseOrderHeaderCellContent.test.jsx` — bestaande linked-tests blijven; nieuwe: writable → input

**Interfaces:**

`PurchaseOrderLinkedHeaderValue` — **één** contract, 8 props:

```js
{
  order, headerColumnKey, meta, onCorrectAllLines,
  cellBackgroundColor, isConditionalFormat, hasHistory, cellKeys,
}
```

`meta.lineColumn` = bestaande `lineColumns`-entry uit Task 4 (geen `{...column}`, geen aparte `lineColumn`-prop). Preview intern: `getLinkedLineValuePreview(order.linkedLineValues?.[headerColumnKey], meta.lineDataType, { columnKey: meta.lineColumnKey, columnLabel: meta.lineColumnLabel })`.

Gedrag:

- `order.removedInD365` of `!meta.writableToD365` of `!onCorrectAllLines` → bestaande `PurchaseOrderLinkedValueCell` (read-only + badge)
- anders: `PurchaseOrderWriteBackCell` met `column={meta.lineColumn}`, `value` = ruwe `order.linkedLineValues[headerColumnKey][0]` (niet de geformatteerde preview; datum blijft ISO)
- `aria-label={`${meta.lineColumn.label} for order ${order.orderNumber} (write back to D365 on all lines)`}`
- Bij `additionalCount > 0`: `Badge` ernaast met native `title={preview.allValuesLabel}` (geen extra Fluent `Tooltip` in de virtuele lijst)

`onCorrect` van WriteBackCell:

```js
const handleCorrect = useCallback(({ value }) => onCorrectAllLines({
  lineColumnId: meta.lineColumnId,
  lineColumnKey: meta.lineColumnKey,
  headerColumnKey,
  dataAreaId: order.dataAreaId,
  orderNumber: order.orderNumber,
  value,
}), [meta, headerColumnKey, onCorrectAllLines, order.dataAreaId, order.orderNumber]);
```

HeaderCellContent: vervang de hele `if (linkedLineValueMeta)`-return door `<PurchaseOrderLinkedHeaderValue ... />`. Geen 14e named prop. BoardCell geeft `actions={actions}`; HeaderCellContent leest `actions.onCorrectAllLines`.

```jsx
<PurchaseOrderHeaderCellContent
  order={order}
  column={column}
  actions={actions}
  ...rest without onSaveValue/onCorrect/onUpdateStatusOptions/isAdmin/showHistoryIndicators
/>
```

Bestaande HeaderCellContent-tests aanpassen naar `actions={{ onSaveValue, onCorrect }}`.

- [ ] **Step 1: Tests** — read-only zonder writable; writable + handler → `getByLabelText(/write back to D365 on all lines/)`; `+N` badge blijft bij twee unieke waarden

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Split + wire; HeaderCellContent onder 300; LinkedHeaderValue ≤ 300 en 8 props**

- [ ] **Step 4: Run** `npx vitest run src/components/supplier/PurchaseOrderLinkedHeaderValue.test.jsx src/components/supplier/PurchaseOrderHeaderCellContent.test.jsx`

Expected: PASS. Geen bulk-dialoog (handler ≠ `handleCorrectField`).

---

### Task 7: Versie + poort

**Files:**
- Modify: `src/config/version.js` — PATCH +1 t.o.v. de waarde op het moment van bouwen (niet hardcoden)

- [ ] **Step 1:** Verhoog `APP_VERSION` (PATCH +1)

- [ ] **Step 2:** `npx vitest run server/utils/detailCorrectionFanout.test.js server/utils/odataValueEquals.test.js server/services/correctAllDetailFields.test.js server/middleware/dataAccess.test.js src/utils/linkedLineValueMeta.test.js src/hooks/usePurchaseOrderCorrectAllLines.test.js src/components/supplier/PurchaseOrderLinkedHeaderValue.test.jsx src/components/supplier/PurchaseOrderHeaderCellContent.test.jsx src/components/supplier/PurchaseOrderWriteBackCell.test.jsx`

Expected: PASS

- [ ] **Step 3:** `npx vitest run src/hooks/usePurchaseOrderBulkEdit.test.jsx` — header-bulk ongewijzigd

- [ ] **Step 4:** Handmatig op `http://localhost:5178` (server draait al): push-kolom met write-back; één waarde; `+N`; lege order blijft `-`; leverancier-account ziet geen editor. Geen extra board-request bij load (Network). 400-cap: fouttekst *Too many lines to write back from the header.* in de cel.

---

## Spec-coverage

| Spec | Taak |
|------|------|
| Header-editor alleen bij writable bron-line | 4, 6 |
| Fan-out alle regels, ook `+N` | 2, 5 |
| Skip gelijke | 1, 2 |
| Cap 200 | 1, 2 |
| 409 doorgaan / 502 stop | 1, 2 |
| Immutable rollup | 5 |
| Live links-hook | 4 |
| Apart van bulk-edit | 5, 6 |
| Leverancier 403 + geen UI | 2, 4, 6 |
| Versie | 7 |
| Geen board-read extra IO | 2 (alleen save) |

## Aantoonbaar

- Staff, writable gepushte line-kolom: header-input; succes → één waarde, geen `+N`
- `+N` → alle regels overschreven
- Deel-409 → fout op header, resterende mixed
- Multi-select: geen “Update multiple rows?”
- Leverancier: read-only
- `localhost:5178`

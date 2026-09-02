# Bulk write-back: per-rij uitkomst en retry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bulk-edit op een D365-writable kolom loopt na een fout door tot alle geselecteerde rijen zijn geprobeerd, toont per mislukte rij de D365-foutmelding, en biedt losse + gezamenlijke retry.

**Architecture:** Alleen `mode === 'correct'` verandert van stop-on-first-error naar verzamel-en-ga-door via `runCorrectRows`. Retry hergebruikt hetzelfde `correctField`-pad. `save`-pad blijft ongewijzigd. PATCH-fouten van D365 geven echte OData-detail door, met statuswhitelist zodat een D365-401 nooit een staff-sign-out triggert.

**Tech Stack:** React 18, Fluent UI v9, Express, Vitest, D365 OData PATCH.

**Spec:** `docs/specs/2026-08-30-bulk-writeback-conflicts-design.md`

**Work item:** #AB:295 (child van Feature #130)

## Global Constraints

- UI-teksten Engels (labels, fouten, aria-labels, knoppen).
- Componenten ≤300 regels; bij 250+ splitsen voorstellen.
- Geen `<Tooltip>` in herhaalde lijstrijen — native `title`.
- Error-cel rendert platte React-children, nooit `dangerouslySetInnerHTML`.
- Geen nieuw backend bulk-endpoint; één `POST /api/data/:tableKey/correct` per rij per poging.
- `PurchaseOrderWriteBackCell.jsx` niet aanraken.
- `save`-pad (`runBulkUpdate`) gedrag ongewijzigd: stop-on-first-error.
- Statuswhitelist PATCH: alleen `{400,404,409,422,423}` als eigen status; rest (incl. 401) blijft 502.
- `POST /:tableKey/correct` intercept `err.status`/`err.message` vóór `next(err)` zodat productie-`errorHandler` de D365-tekst niet vervangt door `An error occurred`.
- Commit-prefix `feat`/`fix`/`test` + `#AB:295`.
- PATCH-bump in `src/config/version.js` (huidig `v1.52.101` → `v1.52.102` in de laatste taak).
- Geen git checkout/switch naar andere bestaande branches.

---

## File structure

| File | Rol |
|---|---|
| `server/services/D365ODataService.js` | PATCH-failure: `summarizeODataFailure` + statuswhitelist |
| `server/services/D365ODataService.test.js` | Validatiefout-detail + 401→502 |
| `server/routes/data.js` | `POST /:tableKey/correct` eigen error-intercept |
| `server/routes/data.test.js` | Intercept vs productie-`errorHandler` |
| `src/hooks/purchaseOrderBulkEditRun.js` | Canonieke `valuesEqual` + `runCorrectRows` |
| `src/hooks/purchaseOrderBulkEditRun.test.js` | Sequencing + skip + meerdere fouten |
| `src/hooks/usePurchaseOrderBulkEdit.js` | `runBulkUpdateCorrect`, compose retry-hook, save-pad ongewijzigd |
| `src/hooks/usePurchaseOrderBulkEdit.test.jsx` | Correct-pad: doorlopen + reject-eigen-rij |
| `src/hooks/usePurchaseOrderBulkEditRetry.js` | Retry-lifecycle |
| `src/hooks/usePurchaseOrderBulkEditRetry.test.js` | retryRow / retryAllFailed / retryingBulk |
| `src/components/supplier/PurchaseOrdersPageDialogs.jsx` | 2 object-props i.p.v. spread |
| `src/components/supplier/PurchaseOrderBulkEditDialog.jsx` | Destructure object-props + failed-rows slot |
| `src/components/supplier/PurchaseOrderBulkEditFailedRows.jsx` | Failed-rows tabel + retry-knoppen |
| `src/config/version.js` | PATCH-bump |
| `src/config/devTestItems.js` | DEV-checklist items voor #295 |

---

### Task 1: Backend PATCH-detail + route-intercept

**Files:**
- Modify: `server/services/D365ODataService.js` (branch `if (!patchRes.ok)` in `writeBackField`)
- Modify: `server/services/D365ODataService.test.js` (`describe('writeBackField (#134)')`)
- Modify: `server/routes/data.js` (`POST /:tableKey/correct` catch)
- Modify: `server/routes/data.test.js`

**Interfaces:**
- Consumes: bestaande `summarizeODataFailure(status, url, body)`
- Produces: `writeBackField` throwt `Error` met `message` = OData-samenvatting; `status` ∈ `{400,404,409,422,423}` of anders `502`. Route `POST /:tableKey/correct` antwoordt `res.status(err.status).json({ error: err.message })` als `err.status` gezet is.

- [ ] **Step 1: Write the failing tests**

In `D365ODataService.test.js`, binnen `describe('writeBackField (#134)')`, voeg toe (bestaande fetch-mock-stijl: GET 200 + etag, daarna PATCH niet-ok):

```js
it('geeft D365-validatiedetail door i.p.v. generieke PATCH-tekst', async () => {
  global.fetch = vi.fn(async (_url, options) => {
    if (options.method === 'GET') {
      return { ok: true, status: 200, headers: { get: () => null }, json: async () => ({ PurchaseOrderName: 'oud', '@odata.etag': 'W/"1"' }) };
    }
    return {
      ok: false, status: 400, headers: { get: () => null },
      text: async () => JSON.stringify({ error: { message: { value: 'PurchaseOrderName cannot be empty' } } }),
    };
  });
  await expect(writeBackField({
    level: 'header', dataAreaId: 'WHSL', orderNumber: 'PO-1',
    d365Field: 'PurchaseOrderName', newValue: '', basedOnValue: 'oud',
  })).rejects.toMatchObject({
    status: 400,
    message: expect.stringContaining('PurchaseOrderName cannot be empty'),
  });
});

it('houdt e.status op 502 als D365-PATCH 401 teruggeeft', async () => {
  global.fetch = vi.fn(async (_url, options) => {
    if (options.method === 'GET') {
      return { ok: true, status: 200, headers: { get: () => null }, json: async () => ({ PurchaseOrderName: 'oud', '@odata.etag': 'W/"1"' }) };
    }
    return { ok: false, status: 401, headers: { get: () => null }, text: async () => JSON.stringify({ error: { message: 'Token expired' } }) };
  });
  await expect(writeBackField({
    level: 'header', dataAreaId: 'WHSL', orderNumber: 'PO-1',
    d365Field: 'PurchaseOrderName', newValue: 'x', basedOnValue: 'oud',
  })).rejects.toMatchObject({
    status: 502,
    message: expect.stringContaining('Token expired'),
  });
});
```

In `data.test.js`, voeg een describe toe. Mock `dataService.correctField`. Gebruik de **echte** `errorHandler` + `isProductionApp` mock true, zodat `next(err)` `'An error occurred'` zou geven:

```js
const errorHandler = require('../middleware/errorHandler');
const appEnvironment = require('../utils/appEnvironment');

describe('POST /:tableKey/correct — D365-foutdetail (#AB:295)', () => {
  const originalCorrect = dataService.correctField;
  afterEach(() => { dataService.correctField = originalCorrect; });

  function buildAppWithProductionHandler(user) {
    vi.spyOn(appEnvironment, 'isProductionApp').mockReturnValue(true);
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => { req.user = user; next(); });
    app.use('/api/data', dataRouter);
    app.use(errorHandler);
    return app;
  }

  it('geeft err.message door met err.status, ook als errorHandler in productie draait', async () => {
    const err = new Error('D365 OData request failed (400): PurchaseOrderName is locked');
    err.status = 400;
    dataService.correctField = vi.fn().mockRejectedValue(err);
    const app = buildAppWithProductionHandler({ id: 1, role: 'employee' });
    const server = await new Promise((resolve) => {
      const instance = app.listen(0, () => resolve(instance));
    });
    try {
      const res = await fetch(`http://127.0.0.1:${server.address().port}/api/data/purchase-orders/correct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          columnId: 1, partitionKey: 'WHSL', recordKey: 'PO-1', value: 'x', basedOnValue: 'oud',
        }),
      });
      const body = await res.json();
      expect(res.status).toBe(400);
      expect(body.error).toBe('D365 OData request failed (400): PurchaseOrderName is locked');
      expect(body.error).not.toBe('An error occurred');
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run server/services/D365ODataService.test.js server/routes/data.test.js`

Expected: nieuwe writeBackField-tests falen (message is nog `'Write-back to D365 failed'`, 401-case heeft status 502 maar zonder Token expired in message — of 401 als iemand status 1-op-1 doorzet). Route-test faalt: productie-handler geeft `'An error occurred'`.

- [ ] **Step 3: Implement**

In `writeBackField`, vervang de `if (!patchRes.ok)`-branch:

```js
if (!patchRes.ok) {
  const body = await patchRes.text().catch(() => '');
  logger.error('D365 write-back PATCH mislukt', { status: patchRes.status, bodyPreview: body.slice(0, 300) });
  const PATCH_FAILURE_STATUS_WHITELIST = new Set([400, 404, 409, 422, 423]);
  const message = summarizeODataFailure(patchRes.status, entityUrl, body);
  const e = new Error(message);
  e.status = PATCH_FAILURE_STATUS_WHITELIST.has(patchRes.status) ? patchRes.status : 502;
  throw e;
}
```

412-branch en 409-concurrency-check ongewijzigd laten.

In `server/routes/data.js` catch van `POST /:tableKey/correct`:

```js
} catch (err) {
  if (err.status) return res.status(err.status).json({ error: err.message });
  return next(err);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run server/services/D365ODataService.test.js server/routes/data.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/services/D365ODataService.js server/services/D365ODataService.test.js server/routes/data.js server/routes/data.test.js
git commit -m "feat: pass D365 PATCH error detail to bulk write-back #AB:295"
```

---

### Task 2: `purchaseOrderBulkEditRun.js` (valuesEqual + runCorrectRows)

**Files:**
- Create: `src/hooks/purchaseOrderBulkEditRun.js`
- Create: `src/hooks/purchaseOrderBulkEditRun.test.js`

**Interfaces:**
- Consumes: `rowSelectionKey(dataAreaId, orderNumber)` uit `src/hooks/usePurchaseOrderRowSelection.js`
- Produces:
  - `valuesEqual(left, right): boolean`
  - `runCorrectRows({ candidates, payload, runSingleUpdate, onSettled }): Promise<{ updated, skipped, failedRows }>`
  - `failedRows[]` items: `{ key, dataAreaId, orderNumber, columnId, columnKey, value, basedOnValue, errorMessage }`

- [ ] **Step 1: Write the failing test**

```js
import { describe, expect, it, vi } from 'vitest';
import { valuesEqual, runCorrectRows } from './purchaseOrderBulkEditRun';

describe('valuesEqual', () => {
  it('trekt undefined en null gelijk', () => {
    expect(valuesEqual(undefined, null)).toBe(true);
  });
  it('vergelijkt via string-coercie als Object.is faalt', () => {
    expect(valuesEqual(1, '1')).toBe(true);
  });
});

describe('runCorrectRows', () => {
  const payload = { columnId: 9, columnKey: 'status', value: 'Closed' };

  it('gaat door na een fout op rij 2 van 3', async () => {
    const runSingleUpdate = vi.fn()
      .mockResolvedValueOnce()
      .mockRejectedValueOnce(new Error('conflict on PO2'))
      .mockResolvedValueOnce();
    const result = await runCorrectRows({
      candidates: [
        { dataAreaId: 'USMF', orderNumber: 'PO1', currentValue: 'Open' },
        { dataAreaId: 'USMF', orderNumber: 'PO2', currentValue: 'Open' },
        { dataAreaId: 'USMF', orderNumber: 'PO3', currentValue: 'Open' },
      ],
      payload,
      runSingleUpdate,
    });
    expect(runSingleUpdate).toHaveBeenCalledTimes(3);
    expect(result.updated).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.failedRows).toEqual([
      expect.objectContaining({
        key: 'USMF|PO2',
        orderNumber: 'PO2',
        basedOnValue: 'Open',
        errorMessage: 'conflict on PO2',
      }),
    ]);
  });

  it('slaat rijen over die al gelijk zijn en roept onSettled per kandidaat', async () => {
    const onSettled = vi.fn();
    const runSingleUpdate = vi.fn().mockResolvedValue();
    const result = await runCorrectRows({
      candidates: [
        { dataAreaId: 'USMF', orderNumber: 'PO1', currentValue: 'Closed' },
        { dataAreaId: 'USMF', orderNumber: 'PO2', currentValue: 'Open' },
      ],
      payload,
      runSingleUpdate,
      onSettled,
    });
    expect(result.skipped).toBe(1);
    expect(result.updated).toBe(1);
    expect(runSingleUpdate).toHaveBeenCalledTimes(1);
    expect(onSettled).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/purchaseOrderBulkEditRun.test.js`

Expected: FAIL (module bestaat niet).

- [ ] **Step 3: Implement exactly**

```js
import { rowSelectionKey } from './usePurchaseOrderRowSelection';

export function valuesEqual(left, right) {
  if (Object.is(left, right)) return true;
  const normalizedLeft = left === undefined ? null : left;
  const normalizedRight = right === undefined ? null : right;
  if (Object.is(normalizedLeft, normalizedRight)) return true;
  return String(normalizedLeft ?? '') === String(normalizedRight ?? '');
}

export async function runCorrectRows({ candidates, payload, runSingleUpdate, onSettled }) {
  let updated = 0;
  let skipped = 0;
  const failedRows = [];
  for (const candidate of candidates) {
    if (valuesEqual(candidate.currentValue, payload.value)) {
      skipped += 1;
      onSettled?.();
      continue;
    }
    try {
      await runSingleUpdate('correct', {
        columnId: payload.columnId,
        columnKey: payload.columnKey,
        dataAreaId: candidate.dataAreaId,
        orderNumber: candidate.orderNumber,
        lineNumber: null,
        value: payload.value,
        basedOnValue: candidate.currentValue,
      });
      updated += 1;
    } catch (err) {
      failedRows.push({
        key: rowSelectionKey(candidate.dataAreaId, candidate.orderNumber),
        dataAreaId: candidate.dataAreaId,
        orderNumber: candidate.orderNumber,
        columnId: payload.columnId,
        columnKey: payload.columnKey,
        value: payload.value,
        basedOnValue: candidate.currentValue,
        errorMessage: err.message || 'Write-back failed',
      });
    }
    onSettled?.();
  }
  return { updated, skipped, failedRows };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/purchaseOrderBulkEditRun.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/purchaseOrderBulkEditRun.js src/hooks/purchaseOrderBulkEditRun.test.js
git commit -m "feat: collect per-row D365 bulk write-back outcomes #AB:295"
```

---

### Task 3: `usePurchaseOrderBulkEdit.js` — correct-pad + reject eigen rij

**Files:**
- Modify: `src/hooks/usePurchaseOrderBulkEdit.js` (212 regels nu; mag naar ~240)
- Modify: `src/hooks/usePurchaseOrderBulkEdit.test.jsx`

**Interfaces:**
- Consumes: `valuesEqual`, `runCorrectRows` uit Task 2
- Produces: `runBulkUpdateCorrect`; `dialogState.failedRows`; `buildCorrectSummaryMessage`; bij fail van initiërende rij: `throw new Error(matchingFailedRow.errorMessage)` ná `setDialogState` summary
- `runBulkUpdate` blijft stop-on-first-error, importeert `valuesEqual` (geen lokale kopie)
- Retry-hook komt in Task 4; in deze taak alleen `failedRows: []` op state + `runBulkUpdateCorrect` + `executeWithBulkOption` split save/correct. Compose van retry mag al een no-op-achtige placeholder zijn, maar liever de echte hook in Task 4 — dus Task 3 zet `failedRows` en de correct-lus, Task 4 voegt retry toe.

- [ ] **Step 1: Write the failing tests** in `usePurchaseOrderBulkEdit.test.jsx`

```js
describe('usePurchaseOrderBulkEdit — correct-pad verzamelt fouten (#AB:295)', () => {
  it('gaat door na een fout op rij 2 van 3 (mode correct)', async () => {
    const correctField = vi.fn()
      .mockResolvedValueOnce()
      .mockRejectedValueOnce(new Error('conflict on PO2'))
      .mockResolvedValueOnce();
    const { result } = renderHook(() => usePurchaseOrderBulkEdit({
      visibleHeaderColumns: COLUMNS,
      visibleOrders: ORDERS,
      selection: makeSelection(['USMF|PO1', 'USMF|PO2', 'USMF|PO3']),
      saveValue: vi.fn(),
      correctField,
    }));
    const payload = { dataAreaId: 'USMF', orderNumber: 'PO1', lineNumber: null, columnKey: 'status', value: 'Shipped' };
    let pending;
    act(() => { pending = result.current.handleCorrectField(payload); });
    act(() => result.current.dialogActions.onChooseBulk());
    await act(async () => { await pending; });

    expect(correctField).toHaveBeenCalledTimes(3);
    expect(result.current.dialogState.mode).toBe('summary');
    expect(result.current.dialogState.failedRows).toEqual([
      expect.objectContaining({ orderNumber: 'PO2', basedOnValue: 'Open', errorMessage: 'conflict on PO2' }),
    ]);
    expect(result.current.dialogState.summaryMessage).toMatch(/Failed: 1/);
    expect(result.current.dialogState.summaryMessage).toMatch(/Updated: 2/);
  });

  it('reject als de initiërende rij zelf faalt, ook als andere rijen slagen', async () => {
    const correctField = vi.fn()
      .mockRejectedValueOnce(new Error('locked PO1'))
      .mockResolvedValueOnce();
    const { result } = renderHook(() => usePurchaseOrderBulkEdit({
      visibleHeaderColumns: COLUMNS,
      visibleOrders: ORDERS,
      selection: makeSelection(['USMF|PO1', 'USMF|PO2']),
      saveValue: vi.fn(),
      correctField,
    }));
    const payload = { dataAreaId: 'USMF', orderNumber: 'PO1', lineNumber: null, columnKey: 'status', value: 'Shipped' };
    let pending;
    act(() => { pending = result.current.handleCorrectField(payload); });
    act(() => result.current.dialogActions.onChooseBulk());
    await act(async () => {
      await expect(pending).rejects.toThrow('locked PO1');
    });
    expect(result.current.dialogState.failedRows).toEqual([
      expect.objectContaining({ orderNumber: 'PO1' }),
    ]);
  });

  it('resolved wanneer alléén andere rijen falen, niet de initiërende rij', async () => {
    const correctField = vi.fn()
      .mockResolvedValueOnce()
      .mockRejectedValueOnce(new Error('locked PO2'));
    const { result } = renderHook(() => usePurchaseOrderBulkEdit({
      visibleHeaderColumns: COLUMNS,
      visibleOrders: ORDERS,
      selection: makeSelection(['USMF|PO1', 'USMF|PO2']),
      saveValue: vi.fn(),
      correctField,
    }));
    const payload = { dataAreaId: 'USMF', orderNumber: 'PO1', lineNumber: null, columnKey: 'status', value: 'Shipped' };
    let pending;
    act(() => { pending = result.current.handleCorrectField(payload); });
    act(() => result.current.dialogActions.onChooseBulk());
    await act(async () => { await pending; });
    expect(result.current.dialogState.failedRows[0].orderNumber).toBe('PO2');
  });
});
```

Bestaande test `'stopt bij een fout...'` blijft op `handleSaveValue` en moet groen blijven.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/usePurchaseOrderBulkEdit.test.jsx`

Expected: bestaande save-tests groen; nieuwe correct-tests falen (stopt nog bij eerste fout).

- [ ] **Step 3: Implement**

- Importeer `valuesEqual`, `runCorrectRows` uit `./purchaseOrderBulkEditRun`. Verwijder lokale `valuesEqual`.
- `EMPTY_DIALOG_STATE` uitbreiden: `failedRows: []`, `updated: 0`, `skipped: 0`.
- `showDecisionDialog` moet die velden ook resetten (niet een incompleet object zetten).
- Helper:

```js
function buildCorrectSummaryMessage({ updated, skipped, failedCount }) {
  return `Bulk edit finished. Updated: ${updated}. Skipped: ${skipped}. Failed: ${failedCount}.`;
}
```

- `runBulkUpdate` blijft voor save; `valuesEqual` via import.
- Nieuwe `runBulkUpdateCorrect(payload, rows, activeOrderKey)`: candidates uit `rows` (`currentValue: row?.values?.[payload.columnKey]`), `onSettled` bumpt `processedCount`. Daarna:
  - `failedRows.length === 0` → `closeDialog()`
  - anders → `setDialogState` met `mode: 'summary'`, `failedRows`, `updated`, `skipped`, `summaryMessage: buildCorrectSummaryMessage(...)`, `busy: false`, `open: true`
  - als `failedRows` een item met `key === activeOrderKey` bevat → `throw new Error(matching.errorMessage)`
- `executeWithBulkOption`: `mode === 'save'` → `runBulkUpdate`; `mode === 'correct'` → `runBulkUpdateCorrect(payload, selectedVisibleOrders, activeOrderKey)`.

Bestand onder 300 regels houden.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/hooks/usePurchaseOrderBulkEdit.test.jsx src/hooks/purchaseOrderBulkEditRun.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/usePurchaseOrderBulkEdit.js src/hooks/usePurchaseOrderBulkEdit.test.jsx
git commit -m "feat: continue D365 bulk write-back after per-row failure #AB:295"
```

---

### Task 4: `usePurchaseOrderBulkEditRetry.js` + compose

**Files:**
- Create: `src/hooks/usePurchaseOrderBulkEditRetry.js`
- Create: `src/hooks/usePurchaseOrderBulkEditRetry.test.js`
- Modify: `src/hooks/usePurchaseOrderBulkEdit.js`
- Modify: `src/hooks/usePurchaseOrderBulkEdit.test.jsx`

**Interfaces:**
- Consumes: `runCorrectRows`; `failedRows` + `onFailedRowsChange(updater)` + `runSingleUpdate`
- Produces: `{ retryingBulk, retryRow, retryAllFailed }`
- Parent exposeert `dialogState.retryingBulk` en `dialogActions.onRetryRow` / `onRetryAllFailed`

- [ ] **Step 1: Write failing tests** voor de hook (renderHook) én één integratietest in `usePurchaseOrderBulkEdit.test.jsx` dat `onRetryRow` een geslaagde rij uit `failedRows` haalt.

Hook-tests (signatuur exact zoals spec):

```js
it('retryRow verwijdert de rij bij succes', async () => { /* runSingleUpdate resolve → failedRows leeg */ });
it('retryAllFailed verwerkt de hele lijst via runCorrectRows', async () => { /* 2 entries, beide resolve */ });
it('rij die opnieuw faalt houdt de nieuwe errorMessage', async () => { /* reject met nieuwe tekst */ });
it('retryingBulk is true tijdens de aanroep en false erna', async () => { /* deferred promise */ });
```

Implementatie van de hook: exact de spec-code (ref voor failedRows, updater-merge, geen failedRows in deps van retryRows).

`handleFailedRowsChange` in parent:

```js
const handleFailedRowsChange = useCallback((updateFailedRows) => setDialogState((prev) => {
  const failedRows = updateFailedRows(prev.failedRows);
  return {
    ...prev,
    failedRows,
    summaryMessage: buildCorrectSummaryMessage({
      updated: prev.updated,
      skipped: prev.skipped,
      failedCount: failedRows.length,
    }),
  };
}), []);
```

Return: `dialogState` = `{ ...dialogState, retryingBulk: retry.retryingBulk }`; actions + `onRetryRow` / `onRetryAllFailed` in dezelfde `useMemo`.

- [ ] **Step 2–4:** TDD zoals Task 2. Run `npx vitest run src/hooks/usePurchaseOrderBulkEditRetry.test.js src/hooks/usePurchaseOrderBulkEdit.test.jsx`

- [ ] **Step 5: Commit**

```bash
git add src/hooks/usePurchaseOrderBulkEditRetry.js src/hooks/usePurchaseOrderBulkEditRetry.test.js src/hooks/usePurchaseOrderBulkEdit.js src/hooks/usePurchaseOrderBulkEdit.test.jsx
git commit -m "feat: retry failed D365 bulk write-back rows #AB:295"
```

---

### Task 5: Dialog props groeperen

**Files:**
- Modify: `src/components/supplier/PurchaseOrdersPageDialogs.jsx` regel 25
- Modify: `src/components/supplier/PurchaseOrderBulkEditDialog.jsx`

**Interfaces:**
- Consumes: `bulkEdit.dialogState`, `bulkEdit.dialogActions`
- Produces: `PurchaseOrderBulkEditDialog({ dialogState, dialogActions })` — 2 props

- [ ] **Step 1:** Geen apart visueel testbestand verplicht (pure wiring). Als er een bestaand dialog-test is, pas die aan. Anders: implementeer + bestaande hook-tests blijven groen.

Wijzig dialog:

```jsx
export default function PurchaseOrderBulkEditDialog({ dialogState, dialogActions }) {
  const {
    open, mode, columnLabel, selectedCount, processedCount, busy, summaryMessage,
    failedRows = [], retryingBulk,
  } = dialogState;
  const { onOpenChange, onChooseSingleCell, onChooseBulk, onCloseSummary } = dialogActions;
  // ... bestaande JSX, Close krijgt later disabled={retryingBulk} in Task 6
}
```

PageDialogs:

```jsx
<PurchaseOrderBulkEditDialog dialogState={bulkEdit.dialogState} dialogActions={bulkEdit.dialogActions} />
```

Confirm-titel ongewijzigd. Summary-titel: `'Bulk edit finished'` als `failedRows.length > 0`, anders `'Bulk edit stopped'` (save-pad).

- [ ] **Step 2:** `npx vitest run src/hooks/usePurchaseOrderBulkEdit.test.jsx`

- [ ] **Step 3: Commit**

```bash
git add src/components/supplier/PurchaseOrdersPageDialogs.jsx src/components/supplier/PurchaseOrderBulkEditDialog.jsx
git commit -m "refactor: group bulk-edit dialog props into state and actions #AB:295"
```

---

### Task 6: `PurchaseOrderBulkEditFailedRows.jsx`

**Files:**
- Create: `src/components/supplier/PurchaseOrderBulkEditFailedRows.jsx`
- Modify: `src/components/supplier/PurchaseOrderBulkEditDialog.jsx`
- Optional test: `src/components/supplier/PurchaseOrderBulkEditFailedRows.test.jsx` (render: Order/Error/Retry + Retry all failed)

**Interfaces:**
- Props: `{ rows, retrying, onRetryRow, onRetryAllFailed }` (4)
- `React.memo`
- Fluent Table, `maxHeight: '280px'`, tokens, native `title` op Error-cel, `{errorMessage}` als children
- Per-rij: `onClick={() => onRetryRow(row.key)}` (zelfde patroon als HiddenRowsPanel)
- Knoppen `disabled={retrying}`; Close in parent ook `disabled={retryingBulk}`
- Kop: `N rows failed` + `Retry all failed` (primary, `ArrowClockwiseRegular` / Spinner tiny)
- Kolommen: Order (`dataAreaId|orderNumber` semibold), Error, Retry (`appearance="secondary" size="small"`)

Aansluiting in dialog: alleen als `mode === 'summary' && failedRows.length > 0`.

Bestand ≤150 regels, nesting bewust zelfde 4+ niveaus als HiddenRowsPanel.

- [ ] **Step: implement + commit**

```bash
git add src/components/supplier/PurchaseOrderBulkEditFailedRows.jsx src/components/supplier/PurchaseOrderBulkEditFailedRows.test.jsx src/components/supplier/PurchaseOrderBulkEditDialog.jsx
git commit -m "feat: show failed bulk write-back rows with retry actions #AB:295"
```

---

### Task 7: Versie + DEV-checklist

**Files:**
- Modify: `src/config/version.js` → `v1.52.102`
- Modify: `src/config/devTestItems.js` — bestaand formaat `{ id, title, checks }`

```js
{
  id: 'bulk-writeback-conflicts-295',
  title: 'Bulk write-back per-row outcome and retry (#295)',
  checks: [
    'Bulk-edit a D365-writable column on 3 selected rows where the middle row fails: rows 1 and 3 still update; summary lists the failed PO and D365 error',
    'Retry on a resolved failed row removes it from the list and updates Failed: N',
    'Retry all failed runs remaining failed rows sequentially',
    'Bulk-edit without failures still closes the dialog silently',
    'Bulk-edit on a non-D365 column still stops on first error with the old summary text (no retry list)',
  ],
}
```

- [ ] **Step: bump + checklist + commit**

```bash
git add src/config/version.js src/config/devTestItems.js
git commit -m "chore: bump version and add DEV checks for bulk write-back retry #AB:295"
```

Daarna volledige suite: `npx vitest run` (of `npm test`).

---

## Self-review

1. Spec coverage: AC 1–8 → Tasks 3/6 (lus + UI), AC 5 → Task 1, retry AC 3–4 → Task 4/6, save-pad AC 7 → Task 3 laat `runBulkUpdate` staan, Engels AC 8 → Task 6 strings.
2. Placeholders: geen TBD.
3. Types: `failedRows` shape consistent tussen `runCorrectRows`, retry-merge en UI.

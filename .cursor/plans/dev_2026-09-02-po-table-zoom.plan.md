# PO table zoom Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Staff en leveranciers kunnen de PO-tabel schalen (75–110%, default 85%) zonder extra API en zonder zoom-state in de page/board-tree.

**Architecture:** `--po-table-zoom` alleen op `.frame`. Pure parse/clamp + dunne PO-store. Generieke row/column-window hooks krijgen optionele `getScale`/`subscribeScale` (default 1) en importeren `poTableZoom.js` niet. ZoomControl in de topbalk schrijft de store; BoardTable past de CSS-var via callback-ref toe.

**Tech Stack:** React 18, Vitest, Fluent UI v9, CSS custom properties.

**Spec:** `docs/specs/2026-09-02-po-table-zoom-design.md`

**Als** staff of leverancier  
**wil ik** de PO-tabel visueel kleiner of groter kunnen zetten (tekst, padding, rijhoogte, headers en subitems)  
**zodat** ik meer rijen en kolommen op het scherm zie zonder de browser of de rest van de app te zoomen.

**Acceptatiecriteria**
1. Tabel start op 85% (of de in deze browser opgeslagen schaal), zonder flash naar 100%.
2. Staff en leveranciers zien − / huidige % / + in de topbalk; Reset alleen als schaal ≠ 85%.
3. Bereik 75–110% in stappen van 5%; KPI-strip, dialogs en menus schalen niet mee.
4. Lagere zoom toont meer rijen én kolommen (CSS + row/column-window).
5. Sticky kolommen blijven uitgelijnd; kolom-resize slaat 100%-px op.
6. Geen extra API-call bij load of zoom; geen data-refetch.
7. UI-teksten Engels; geen Fluent Tooltip.

## Global Constraints

- UI-teksten Engels (`Zoom out`, `Zoom in`, `Reset zoom to 85%`, `Table zoom`).
- Geen nieuwe routes, SQL, board-settings of saved-view JSON.
- Geen CSS `zoom` / `transform: scale()` op tabel of sticky cellen.
- Geen Fluent `<Tooltip>`; `aria-label` + native `title`.
- Font-size via `calc(${tokens.fontSizeBase300} * var(--po-table-zoom, 0.85))`; `poTableZoomedPx` alleen voor layout-px.
- Generieke hooks in `src/hooks/` importeren `poTableZoom.js` niet.
- CSS-var krijgt alleen `parsePoTableZoom`-getal, nooit de ruwe localStorage-string.
- `PurchaseOrdersPageTopBar.jsx` (261) alleen +1 child; `PurchaseOrdersBoardTable.jsx` (281) alleen ref-subscribe; `PurchaseOrderSubitemLineRow.jsx` (>300) geen extra JSX/state.
- Footer PATCH in `src/config/version.js` (`v1.52.124` → `v1.52.125`) in de laatste taak.
- Local-first: **geen git commit** tenzij de gebruiker erom vraagt — sla commit-stappen over.
- Tests: `npx vitest run <bestand>`.

## Files

**Create**
- `src/utils/poTableZoom.js` + `src/utils/poTableZoom.test.js`
- `src/components/supplier/PurchaseOrderTableZoomControl.jsx` + `src/components/supplier/PurchaseOrderTableZoomControl.test.jsx`

**Modify**
- `src/components/supplier/purchaseOrderBoardLayout.js`
- `src/components/supplier/purchaseOrdersBoardTableStyles.js`
- `src/components/supplier/purchaseOrdersBoardRowsStyles.js`
- `src/components/supplier/columnTextStyleUtils.js` + `.test.js`
- `src/hooks/useBoardColumnWindow.js` + `.test.js`
- `src/hooks/useBoardRowWindow.js` + `.test.jsx`
- `src/components/supplier/PurchaseOrdersBoardRows.jsx`
- `src/components/supplier/ResizableTableHeaderCell.jsx`
- `src/components/supplier/PurchaseOrdersBoardHeaderRow.jsx` (`getScale={getPoTableZoom}`)
- `src/components/supplier/PurchaseOrdersSubitemsTable.jsx` (`getScale={getPoTableZoom}`)
- `src/hooks/useSequentialStickyColumns.js` (fallback × scale via `getScale` param)
- `src/hooks/usePurchaseOrdersBoardStickyColumns.js` (geeft `getScale: getPoTableZoom` door)
- `src/utils/purchaseOrderProductImageColumn.js` (hoogte via `poTableZoomedPx`; hover-preview blijft px)
- `src/components/supplier/PurchaseOrderProductImageCell.jsx` (thumb-hoogte via `poTableZoomedPx`)
- `src/components/supplier/PurchaseOrdersBoardTable.jsx`
- `src/components/supplier/PurchaseOrdersPageTopBar.jsx`
- `src/config/version.js`

Skeleton gebruikt al `purchaseOrderBoardRowHeight` — schaalt mee zodra die export `poTableZoomedPx` wordt (fallback 0.85). Geen aparte skeleton-taak.

---

### Task 1: `poTableZoom` (puur + persist + store)

**Files:**
- Create: `src/utils/poTableZoom.js`
- Test: `src/utils/poTableZoom.test.js`

**Interfaces:**
- Produces:
  - `PO_TABLE_ZOOM_DEFAULT = 0.85`, `PO_TABLE_ZOOM_MIN = 0.75`, `PO_TABLE_ZOOM_MAX = 1.1`, `PO_TABLE_ZOOM_STEP = 0.05`
  - `PO_TABLE_ZOOM_CSS_VAR = '--po-table-zoom'`
  - `PO_TABLE_ZOOM_STORAGE_KEY = 'po:tableZoom:purchase-orders'`
  - `clampPoTableZoom(value) => number`
  - `parsePoTableZoom(raw) => number` — `Number` + `Number.isFinite`, anders default; daarna clamp
  - `stepPoTableZoom(current, direction)` — `direction` is `-1` of `1`; resultaat op 2 decimalen, binnen min/max
  - `formatPoTableZoomPercent(value) => string` — bijv. `'85%'`
  - `poTableZoomedPx(px) => string` — `calc(${px}px * var(--po-table-zoom, 0.85))`
  - `visualPxToStored(visualPx, scale) => number`
  - `readPoTableZoom() => number` / `writePoTableZoom(value)` — alleen geclampt getal; quota stil
  - `getPoTableZoom() => number` / `setPoTableZoom(value) => number` / `subscribePoTableZoom(fn) => unsubscribe`
  - `applyPoTableZoom(el, value?)` — `el.style.setProperty(CSS_VAR, String(geclampt))`
  - `resetPoTableZoomStoreForTests()`

- [ ] **Step 1: Write the failing tests**

```js
import { afterEach, describe, expect, it } from 'vitest';
import {
  PO_TABLE_ZOOM_DEFAULT,
  applyPoTableZoom,
  clampPoTableZoom,
  formatPoTableZoomPercent,
  getPoTableZoom,
  parsePoTableZoom,
  poTableZoomedPx,
  readPoTableZoom,
  resetPoTableZoomStoreForTests,
  setPoTableZoom,
  stepPoTableZoom,
  subscribePoTableZoom,
  visualPxToStored,
  writePoTableZoom,
} from './poTableZoom';

afterEach(() => {
  resetPoTableZoomStoreForTests();
  window.localStorage.clear();
});

describe('parsePoTableZoom', () => {
  it('clamped finite numbers and rejects garbage', () => {
    expect(parsePoTableZoom(0.9)).toBe(0.9);
    expect(parsePoTableZoom('0.8')).toBe(0.8);
    expect(parsePoTableZoom('1);background:url(x)')).toBe(PO_TABLE_ZOOM_DEFAULT);
    expect(parsePoTableZoom(undefined)).toBe(PO_TABLE_ZOOM_DEFAULT);
    expect(clampPoTableZoom(0.5)).toBe(0.75);
    expect(clampPoTableZoom(2)).toBe(1.1);
  });
});

describe('step and format', () => {
  it('steps by 5% and formats percent', () => {
    expect(stepPoTableZoom(0.85, 1)).toBe(0.9);
    expect(stepPoTableZoom(0.75, -1)).toBe(0.75);
    expect(formatPoTableZoomPercent(0.85)).toBe('85%');
  });
});

describe('css helper', () => {
  it('builds calc from stored px', () => {
    expect(poTableZoomedPx(32)).toBe('calc(32px * var(--po-table-zoom, 0.85))');
    expect(visualPxToStored(170, 0.85)).toBe(200);
  });
});

describe('persist and store', () => {
  it('never writes raw strings to CSS or storage', () => {
    writePoTableZoom('1);hack');
    expect(readPoTableZoom()).toBe(PO_TABLE_ZOOM_DEFAULT);
    setPoTableZoom(0.9);
    expect(getPoTableZoom()).toBe(0.9);
    expect(window.localStorage.getItem('po:tableZoom:purchase-orders')).toBe('0.9');
    const el = document.createElement('div');
    applyPoTableZoom(el);
    expect(el.style.getPropertyValue('--po-table-zoom')).toBe('0.9');
    const seen = [];
    const unsub = subscribePoTableZoom((value) => seen.push(value));
    setPoTableZoom(0.95);
    expect(seen).toEqual([0.95]);
    unsub();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/poTableZoom.test.js`
Expected: FAIL (module ontbreekt)

- [ ] **Step 3: Implement `src/utils/poTableZoom.js`**

Module-init: `let current = readPoTableZoom()` (read raakt localStorage veilig in try/catch). `setPoTableZoom` parse→clamp→current→write→notify. `applyPoTableZoom(el, value = current)` zet alleen `String(clampPoTableZoom(value))`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/utils/poTableZoom.test.js`
Expected: PASS

---

### Task 2: Layout-helper + table/row styles + column widths

**Files:**
- Modify: `src/components/supplier/purchaseOrderBoardLayout.js`
- Modify: `src/components/supplier/purchaseOrdersBoardTableStyles.js`
- Modify: `src/components/supplier/purchaseOrdersBoardRowsStyles.js`
- Modify: `src/components/supplier/columnTextStyleUtils.js`
- Test: `src/components/supplier/columnTextStyleUtils.test.js`

**Interfaces:**
- Consumes: `poTableZoomedPx`, `PO_TABLE_ZOOM_CSS_VAR`, `PO_TABLE_ZOOM_DEFAULT` uit `src/utils/poTableZoom.js`
- Produces: `purchaseOrderBoardRowHeight` e.d. als `poTableZoomedPx(...)` i.p.v. `'32px'`. `.frame` zet `--po-table-zoom: 0.85`. Font: `calc(${tokens.fontSizeBase300} * var(--po-table-zoom, 0.85))`.

- [ ] **Step 1: Failing test voor gezoomde kolombreedte**

Voeg toe in `columnTextStyleUtils.test.js`:

```js
it('schrijft kolombreedte als calc maal CSS-var', () => {
  const style = getColumnCellStyle({ amount: 200 }, {}, 'amount');
  expect(style.width).toBe('calc(200px * var(--po-table-zoom, 0.85))');
  expect(style.minWidth).toBe(style.width);
  expect(style.maxWidth).toBe(style.width);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/supplier/columnTextStyleUtils.test.js`
Expected: FAIL (`200px` i.p.v. `calc`)

- [ ] **Step 3: Implement**

In `purchaseOrderBoardLayout.js` string-exports vervangen:

```js
import { poTableZoomedPx } from '../../utils/poTableZoom';

export const purchaseOrderBoardRowHeight = poTableZoomedPx(PURCHASE_ORDER_BOARD_ROW_HEIGHT_PX);
export const purchaseOrderSubRowHeight = poTableZoomedPx(PURCHASE_ORDER_SUB_ROW_HEIGHT_PX);
export const purchaseOrderBoardHeaderHeight = poTableZoomedPx(PURCHASE_ORDER_BOARD_HEADER_HEIGHT_PX);
export const purchaseOrderBoardControlColumnWidth = poTableZoomedPx(PURCHASE_ORDER_BOARD_CONTROL_COLUMN_WIDTH_PX);
```

In `purchaseOrdersBoardTableStyles.js` op `frame`:

```js
'--po-table-zoom': '0.85',
```

`headerCell` / `totalsCell`: `fontSize: \`calc(${tokens.fontSizeBase300} * var(--po-table-zoom, 0.85))\``. Padding header: `poTableZoomedPx(10)` / `poTableZoomedPx(12)` (layout-px, geen token-ramp).

In `purchaseOrdersBoardRowsStyles.js`: `itemCell.fontSize` idem token-calc. `containIntrinsicSize`: `` `auto ${purchaseOrderBoardRowHeight}` `` (gebruikt al de nieuwe export). `--po-cell-padding-y/x` via `poTableZoomedPx(2)` en `poTableZoomedPx(10)`.

In `getColumnCellStyle`: `width/minWidth/maxWidth: poTableZoomedPx(Math.round(width))`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/components/supplier/columnTextStyleUtils.test.js`
Expected: PASS

---

### Task 3: Column-window `getScale` / `subscribeScale`

**Files:**
- Modify: `src/hooks/useBoardColumnWindow.js`
- Test: `src/hooks/useBoardColumnWindow.test.js`

**Interfaces:**
- Consumes: geen `poTableZoom.js`
- Produces: `useBoardColumnWindow({ ..., getScale = () => 1, subscribeScale = null })`. Unscaled `offsets` blijven in `useMemo`. `update()` gebruikt `offsets.map((o) => o * getScale())`. `subscribeScale(scheduleUpdate)` in het bestaande scroll-`useEffect` (cleanup unsubscribe). Importeer `poTableZoom` hier **niet**.

- [ ] **Step 1: Failing hook-test — `getScale` schaalt offsets tegen `scrollLeft`**

Bestaande `computeBoardColumnWindow`-tests blijven unscaled. Voeg een hook-test toe (`renderHook` + mock scroll-el):

```js
import { renderHook } from '@testing-library/react';

it('applies getScale to offsets so scrollLeft maps to visual columns', () => {
  const el = { scrollLeft: 170, clientWidth: 200, addEventListener() {}, removeEventListener() {} };
  const columns = Array.from({ length: 10 }, (_, i) => ({ key: `c${i}` }));
  const columnWidths = Object.fromEntries(columns.map((c) => [c.key, 100]));
  const { result } = renderHook(() => useBoardColumnWindow({
    scrollRef: { current: el },
    columns,
    columnWidths,
    overscanCols: 0,
    enabled: true,
    getScale: () => 0.85,
  }));
  expect(result.current.colStart).toBe(2);
});
```

(10×100 stored; 85% → kolom 2 begint visueel bij 170.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useBoardColumnWindow.test.js`
Expected: FAIL (hook negeert getScale nog)

- [ ] **Step 3: Implement scale in `update()`**

```js
const scale = typeof getScale === 'function' ? getScale() : 1;
const visualOffsets = scale === 1 ? offsets : offsets.map((value) => value * scale);
const next = computeBoardColumnWindow({
  offsets: visualOffsets,
  totalCols,
  scrollLeft: el.scrollLeft,
  viewW: el.clientWidth || 1200,
  overscanCols,
  pinnedCount,
});
```

In dezelfde `useEffect` cleanup: `const unsubscribe = typeof subscribeScale === 'function' ? subscribeScale(scheduleUpdate) : null;` en `unsubscribe?.()`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/hooks/useBoardColumnWindow.test.js`
Expected: PASS

---

### Task 4: Row-window scale + BoardRows wiring

**Files:**
- Modify: `src/hooks/useBoardRowWindow.js`
- Modify: `src/hooks/useBoardRowWindow.test.jsx`
- Modify: `src/components/supplier/PurchaseOrdersBoardRows.jsx`

**Interfaces:**
- Consumes: BoardRows mag `getPoTableZoom` / `subscribePoTableZoom` importeren; de hook niet.
- Produces: `useBoardRowWindow({ ..., getScale = () => 1, subscribeScale = null })`. `rowHeights` en `rowHeightPx` blijven 100%-maten. `handleMeasureExpanded` deelt visuele px door `getPoTableZoom()` vóór opslag. `range` bevat `scale` zodat `topPadPx`/`bottomPadPx` updaten als start/end gelijk blijven.

- [ ] **Step 1: Failing hook test — pads × scale**

```js
it('scales spacer pads when getScale is 0.85', () => {
  const makeEl = () => ({
    scrollTop: 0,
    clientHeight: 320,
    addEventListener() {},
    removeEventListener() {},
  });
  const { result } = renderHook(() => useBoardRowWindow({
    scrollRef: { current: makeEl() },
    totalCount: 100,
    rowHeightPx: 32,
    overscan: 0,
    enabled: true,
    getScale: () => 0.85,
  }));
  const unscaled = renderHook(() => useBoardRowWindow({
    scrollRef: { current: makeEl() },
    totalCount: 100,
    rowHeightPx: 32,
    overscan: 0,
    enabled: true,
  }));
  expect(result.current.bottomPadPx).toBeGreaterThan(0);
  expect(result.current.bottomPadPx).toBeCloseTo(unscaled.result.current.bottomPadPx * 0.85, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useBoardRowWindow.test.jsx`
Expected: FAIL (pads nog 100%)

- [ ] **Step 3: Implement**

In `update()`: `const scale = getScale();` daarna `buildOffsets(totalCount, rowHeights, rowHeightPx)` unscaled houden in `useMemo`, maar:

```js
const first = findStartIndex(offsets, scrollTop / scale);
const last = findEndIndex(offsets, (scrollTop + viewH) / scale);
```

Return:

```js
const scale = range.scale ?? 1;
return {
  start,
  end,
  topPadPx: (offsets[start] || 0) * scale,
  bottomPadPx: Math.max(0, (totalHeight - (offsets[end] || 0)) * scale),
};
```

`setRange` equality: ook `prev.scale === scale`. `subscribeScale(scheduleUpdate)` in het bestaande effect.

In `PurchaseOrdersBoardRows.jsx`:

```js
import { getPoTableZoom, subscribePoTableZoom } from '../../utils/poTableZoom';

const handleMeasureExpanded = useCallback((rowId, heightPx) => {
  const scale = getPoTableZoom();
  const stored = Math.max(0, Math.round(heightPx / scale));
  setExpandedHeights((prev) => {
    if (Math.abs((prev[rowId] || 0) - stored) < 1) return prev;
    return { ...prev, [rowId]: stored };
  });
}, []);

useBoardRowWindow({
  ...,
  getScale: getPoTableZoom,
  subscribeScale: subscribePoTableZoom,
});
useBoardColumnWindow({
  ...,
  getScale: getPoTableZoom,
  subscribeScale: subscribePoTableZoom,
});
```

`estimateExpandedExtraPx` blijft 100%-constanten (hook/pads schalen).

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/hooks/useBoardRowWindow.test.jsx src/hooks/useBoardColumnWindow.test.js`
Expected: PASS

---

### Task 5: Resize + sticky fallback

**Files:**
- Modify: `src/components/supplier/ResizableTableHeaderCell.jsx`
- Modify: `src/components/supplier/PurchaseOrdersBoardHeaderRow.jsx`
- Modify: `src/components/supplier/PurchaseOrdersSubitemsTable.jsx`
- Modify: `src/hooks/useSequentialStickyColumns.js`
- Modify: `src/hooks/usePurchaseOrdersBoardStickyColumns.js`
- Test: `src/hooks/useSequentialStickyColumns.test.jsx`

**Interfaces:**
- Produces: `ResizableTableHeaderCell` optionele `getScale = () => 1`. Startbreedte = `width` prop (opgeslagen). `next = startStored + deltaX / scale`. Style width via `poTableZoomedPx(resolvedWidth)`. Beide callers (`PurchaseOrdersBoardHeaderRow`, `PurchaseOrdersSubitemsTable`) geven `getScale={getPoTableZoom}`. Sticky: `getScale` via `usePurchaseOrdersBoardStickyColumns` → `useSequentialStickyColumns`; fallback-offsets `CONTROL_COLUMN_WIDTH * getScale()` + stored widths × scale. Gemeten `getBoundingClientRect` → `left: ${n}px` ongewijzigd.

- [ ] **Step 1: Implementeer resize + sticky callers (geen apart ResizableTableHeaderCell-testbestand)**

Geen `ResizableTableHeaderCell.test.*`. Vertrouw op bestaande sticky-tests + browser-check in Task 7.

Wijzig `handleResizeMouseDown`:

```js
const scale = typeof getScale === 'function' ? getScale() : 1;
const startStored = clampWidth(width || minWidth, minWidth, maxWidth);
const startX = event.clientX;
applyDragWidth(startStored);
// move:
const nextWidth = clampWidth(startStored + (moveEvent.clientX - startX) / scale, minWidth, maxWidth);
```

Style:

```js
import { poTableZoomedPx } from '../../utils/poTableZoom';
style={resolvedWidth ? {
  ...(cellStyle || {}),
  width: poTableZoomedPx(resolvedWidth),
  minWidth: poTableZoomedPx(minWidth),
  maxWidth: poTableZoomedPx(resolvedWidth),
} : { ...(cellStyle || {}), minWidth: poTableZoomedPx(minWidth) }}
```

PO-header én subitems-tabel: `getScale={getPoTableZoom}` op `ResizableTableHeaderCell`.

Sticky: `usePurchaseOrdersBoardStickyColumns` geeft `getScale: getPoTableZoom` door. `fallbackOffsetsByKey`: `let left = CONTROL_COLUMN_WIDTH * (typeof getScale === 'function' ? getScale() : 1)` en `pickColumnWidth(...) * scale`. Default `getScale: () => 1` zodat `useSequentialStickyColumns` generiek blijft.

- [ ] **Step 2: Run bestaande tests**

Run: `npx vitest run src/hooks/useSequentialStickyColumns.test.jsx src/components/supplier/PurchaseOrdersBoardTable.test.jsx src/components/supplier/PurchaseOrdersBoardHeaderRow.test.jsx`
Expected: PASS

---

### Task 6: Product image hoogte via CSS-var

**Files:**
- Modify: `src/utils/purchaseOrderProductImageColumn.js`
- Modify: `src/components/supplier/PurchaseOrderProductImageCell.jsx`

**Interfaces:**
- `getProductImageCellStyle`: `height/maxHeight: poTableZoomedPx(heightPx)`. Thumb in `PurchaseOrderProductImageCell` makeStyles: `poTableZoomedPx(PRODUCT_IMAGE_CELL_HEIGHT)`. Hover-preview (`PRODUCT_IMAGE_HOVER_MAX_SIZE`) blijft gewone px (portal, schaalt niet mee).

- [ ] **Step 1: Update bestaande hoogte-assertie**

In `src/utils/purchaseOrderProductImageColumn.test.js` de test `removes padding so thumbnails can fill the full cell` aanpassen: `height`/`maxHeight` van `'32px'` naar `'calc(32px * var(--po-table-zoom, 0.85))'`.

- [ ] **Step 2: Implement + run**

Run: `npx vitest run src/utils/purchaseOrderProductImageColumn.test.js src/components/supplier/PurchaseOrderProductImageCell.test.jsx`
Expected: PASS

---

### Task 7: Frame callback-ref + ZoomControl in topbalk

**Files:**
- Modify: `src/components/supplier/PurchaseOrdersBoardTable.jsx`
- Create: `src/components/supplier/PurchaseOrderTableZoomControl.jsx`
- Test: `src/components/supplier/PurchaseOrderTableZoomControl.test.jsx`
- Modify: `src/components/supplier/PurchaseOrdersPageTopBar.jsx`
- Modify: `src/config/version.js` (`v1.52.124` → `v1.52.125`)

**Interfaces:**
- BoardTable: callback-ref op `.frame` (niet `useEffect`): `applyPoTableZoom(node)` + `subscribePoTableZoom(() => applyPoTableZoom(node))`; cleanup unsubscribe + `applyPoTableZoom` niet op null. Geen zoom-`useState`.
- ZoomControl: `role="group"` `aria-label="Table zoom"`; `Button` subtle small; `SubtractRegular` / `AddRegular`; `Text` voor `{n}%`; Reset-`Button` alleen als `getPoTableZoom() !== PO_TABLE_ZOOM_DEFAULT`; `useCallback`; geen Fluent Tooltip.
- TopBar: `<PurchaseOrderTableZoomControl />` in `headerRight`, geen extra props.

- [ ] **Step 1: Failing control tests**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import {
  PO_TABLE_ZOOM_DEFAULT,
  getPoTableZoom,
  resetPoTableZoomStoreForTests,
  setPoTableZoom,
} from '../../utils/poTableZoom';
import PurchaseOrderTableZoomControl from './PurchaseOrderTableZoomControl';

afterEach(() => {
  resetPoTableZoomStoreForTests();
  window.localStorage.clear();
});

describe('PurchaseOrderTableZoomControl', () => {
  it('steps zoom and hides reset at 85%', async () => {
    const user = userEvent.setup();
    render(<PurchaseOrderTableZoomControl />);
    expect(screen.queryByRole('button', { name: 'Reset zoom to 85%' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(getPoTableZoom()).toBe(0.9);
    expect(screen.getByRole('button', { name: 'Reset zoom to 85%' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Reset zoom to 85%' }));
    expect(getPoTableZoom()).toBe(PO_TABLE_ZOOM_DEFAULT);
  });
});
```

Wrap in `FluentProvider` + `webLightTheme` (patroon: `PurchaseOrdersTableControls.test.jsx`).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/supplier/PurchaseOrderTableZoomControl.test.jsx`
Expected: FAIL

- [ ] **Step 3: Implement control + frame ref + topbar + version**

ZoomControl leest `useState(() => getPoTableZoom())` en `subscribePoTableZoom(setZoom)` in `useEffect` (cleanup unsubscribe) zodat het label meegaat. Handlers:

```js
const zoomOut = useCallback(() => { setPoTableZoom(stepPoTableZoom(getPoTableZoom(), -1)); }, []);
const zoomIn = useCallback(() => { setPoTableZoom(stepPoTableZoom(getPoTableZoom(), 1)); }, []);
const reset = useCallback(() => { setPoTableZoom(PO_TABLE_ZOOM_DEFAULT); }, []);
```

BoardTable frame:

```js
const frameRef = useRef(null);
const setFrameNode = useCallback((node) => {
  if (frameRef.current && frameUnsubRef.current) {
    frameUnsubRef.current();
    frameUnsubRef.current = null;
  }
  frameRef.current = node;
  if (!node) return;
  applyPoTableZoom(node);
  frameUnsubRef.current = subscribePoTableZoom(() => applyPoTableZoom(node));
}, []);
```

`useEffect` cleanup bij unmount: unsubscribe. Houd totaal BoardTable onder 300 regels.

- [ ] **Step 4: Run tests + bestaande PO-table tests**

Run: `npx vitest run src/utils/poTableZoom.test.js src/components/supplier/PurchaseOrderTableZoomControl.test.jsx src/components/supplier/PurchaseOrdersBoardTable.test.jsx src/hooks/useBoardRowWindow.test.jsx src/hooks/useBoardColumnWindow.test.js src/components/supplier/columnTextStyleUtils.test.js`
Expected: PASS

- [ ] **Step 5: Browser-check op localhost (server niet starten als die al draait)**

Op `http://localhost:5178` PO-board: first paint ~85%; − / + / Reset; meer rijen én kolommen; sticky uitgelijnd; Network geen extra call bij zoom.

---

## Self-review

| Spec-eis | Taak |
|----------|------|
| Default 85%, bereik 75–110%, stap 5% | 1, 7 |
| localStorage, geen API | 1 |
| CSS-var alleen op `.frame` | 2, 7 |
| Font via tokens | 2 |
| Kolommen schalen | 2, 3, 5 |
| Rij-window schaalt (meer rijen) | 4 |
| Sticky niet dubbel schalen | 5 |
| Resize in stored px | 5 |
| Topbalk − / tekst% / + / Reset≠85% | 7 |
| Geen Tooltip, Engels | 7 |
| parse weigert garbage | 1 |
| Version PATCH | 7 |
| Subitem-regel geen extra state | 2+6 CSS-only |

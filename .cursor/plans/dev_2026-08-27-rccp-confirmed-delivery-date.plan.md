# RCCP confirmed delivery date Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the manufacturer confirmed delivery date in the RCCP chart, matrix and KPIs, with a Planning date switch that drives KPIs and overcapacity without moving the chart bars.

**Architecture:** Extend existing `GET /api/rccp/analysis` in one pass: `segmentsConfirmed` + synthetic matrix row from the PO snapshot; `planningDate` query switches KPI comparison date and overcapacity load map; item colors and a right-slot hatched bar live in the existing chart; history arrives only after item-pin via `GET /api/rccp/confirmed-history`.

**Tech Stack:** React 18, Fluent UI v9, Express, mssql, Vitest, Recharts.

**Spec:** `docs/specs/2026-08-27-rccp-confirmed-delivery-date-design.md`  
**DevOps:** Feature #285, stories #286–#290. Branch `feature/285-rccp-confirmed-delivery-date`. Commits use `#AB:285`.

## Global Constraints

- UI English only (labels, errors, aria, formulas).
- Components ≤ 300 lines; max 10 props; no JSX in hooks; hook returns ≤ 10 values.
- `RccpPageContent.jsx` (~257) and `RccpChartMatrixPanel.jsx` (~229, already 10 props) must not grow with feature logic — extract first.
- `RccpAnalysisService.js` (~636) gets no history I/O and no extra aggregation; pass through `rccpConfirmedLoad.js` / `rccpConfirmedHistory.js`.
- Do not rename or reuse `confirmedByCell` / `confirmedQty` (those are requested-week load). New map: `factoryConfirmedByCell`.
- `GET /api/rccp/board-kpis` stays on requested date; no `planningDate` query there.
- Window membership of KPI lines stays on requested delivery date even when Planning date = Confirmed.
- Chart bars do not follow the Planning date switch.
- No new SQL table/column. Config key in `RCCP_CONFIG` JSON; `planningDate` in existing board-settings blob.
- SQL parameterized; `requireSession` already on `/api/rccp`; history uses `rccpAccess` + vendor required.
- Client networking only via `apiRequest`. New server work in `time('rccp_confirmed_hist')`; reuse `rccp_po_segments` / `rccp_kpis`.
- Split-pane (`RccpSplitStrip`): hatching allowed (analysis default requested); no Planning-date control and no pin.
- `APP_VERSION` PATCH +1 once in Task 8 (`src/config/version.js`, currently `v1.52.39`).
- Do not pop the git stash `wip: unrelated rccp show-sum leftover (not #285)`.
- Do not change `RccpIsoWeekCalendarGrid.jsx` / `RccpIsoWeekRangePicker.jsx`.

---

### Task 1: Extract chart/page shells (no feature behavior yet)

**Files:**
- Create: `src/components/rccp/RccpPlanningDateSwitch.jsx`
- Create: `src/components/rccp/RccpPlanningDateSwitch.test.jsx`
- Create: `src/components/rccp/rccpChartStacks.js`
- Create: `src/components/rccp/rccpChartStacks.test.js`
- Create: `src/components/rccp/RccpPoConfirmedBar.jsx`
- Create: `src/components/rccp/RccpPoSegmentPinCard.jsx`
- Modify: `src/components/rccp/rccpPoStack.js` (`weekBarBox`)
- Modify: `src/components/rccp/rccpPoStack.test.js`
- Modify: `src/components/rccp/RccpChartMatrixPanel.jsx` (use `rccpChartStacks`; keep 10 props)
- Modify: `server/utils/rccpPoRow.js` (export `isSentinelDate`)
- Modify: `server/utils/rccpKpis.js` (import `isSentinelDate` from `rccpPoRow`, delete local copy)
- Modify: `src/components/rccp/RccpPoStackBar.jsx` (forward `onClick` from context onto the existing rect, no new props on `RccpPoSegmentRect`)

**Interfaces:**
- Consumes: existing `weekBarBox(index, barWidth)`, panel `chartRows` mapping, `isSentinelDate` in kpis.
- Produces:
  - `weekBarBox(index, barWidth, slot = 'center')` with `slot: 'left' | 'right' | 'center'`
  - `buildRccpChartRows({ chart, openVisible, deliveredVisible, openColor, receivedColor })` in `rccpChartStacks.js` — same output shape as today's panel mapping, plus `segmentsConfirmed: []` and `__barWidthConfirmed` reserved (empty until Task 3/4)
  - `RccpPlanningDateSwitch({ value, onChange, disabled })` — RadioGroup; not mounted in PageContent yet
  - `RccpPoConfirmedBar` sibling of stack bar; renders nothing until segments exist
  - `RccpPoSegmentPinCard({ pin, onClose })` — empty shell, `pointer-events: auto`
  - `isSentinelDate(value)` from `rccpPoRow.js`

- [ ] **Step 1: Write the failing tests**

`rccpPoStack.test.js` — add:

```js
it('splits left and right slots inside 80% of the week band', () => {
  const left = weekBarBox(0, RCCP_PO_BAR_SIZE, 'left');
  const right = weekBarBox(0, RCCP_PO_BAR_SIZE, 'right');
  const center = weekBarBox(0, RCCP_PO_BAR_SIZE, 'center');
  expect(left.x + left.width).toBeLessThan(right.x);
  expect(right.x + right.width).toBeLessThanOrEqual(center.x + center.width + 0.5);
  expect(left.width + right.width).toBeLessThan(RCCP_WEEK_COL_WIDTH * 0.85);
});

it('keeps center slot as the current centered bar', () => {
  expect(weekBarBox(0, RCCP_PO_BAR_SIZE)).toEqual(weekBarBox(0, RCCP_PO_BAR_SIZE, 'center'));
});
```

`rccpChartStacks.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { buildRccpChartRows } from './rccpChartStacks';
import { RCCP_PO_BAR_SIZE } from './rccpPoStack';

describe('buildRccpChartRows', () => {
  const chart = [{
    key: '2026-W12',
    segmentsAbove: [
      { itemNumber: 'A', qty: 4, status: 'received' },
      { itemNumber: 'A', qty: 6, status: 'open' },
    ],
    segmentsBelow: [{ itemNumber: 'A', qty: 4, status: 'received' }],
    segmentsConfirmed: [{ itemNumber: 'A', qty: 6, status: 'confirmed' }],
  }];

  it('filters stacks by visibility and preserves confirmed segments', () => {
    const rows = buildRccpChartRows({
      chart, openVisible: true, deliveredVisible: true,
      openColor: '#D13438', receivedColor: '#0078D4',
    });
    expect(rows[0].segmentsAbove).toHaveLength(2);
    expect(rows[0].__stackAbove).toBe(10);
    expect(rows[0].__stackBelow).toBe(-4);
    expect(rows[0].segmentsConfirmed).toEqual(chart[0].segmentsConfirmed);
    expect(rows[0].__barWidthAbove).toBe(RCCP_PO_BAR_SIZE);
    expect(rows[0].__openColor).toBe('#D13438');
  });

  it('hides open segments when open is not visible', () => {
    const rows = buildRccpChartRows({
      chart, openVisible: false, deliveredVisible: true,
      openColor: '#D13438', receivedColor: '#0078D4',
    });
    expect(rows[0].segmentsAbove.every((s) => s.status !== 'open')).toBe(true);
  });
});
```

`RccpPlanningDateSwitch.test.jsx`: render with `@testing-library/react`, assert two radios `Requested` and `Confirmed`, default selected `requested`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/rccp/rccpPoStack.test.js src/components/rccp/rccpChartStacks.test.js src/components/rccp/RccpPlanningDateSwitch.test.jsx`

Expected: FAIL — `rccpChartStacks` / `RccpPlanningDateSwitch` missing; `weekBarBox` ignores third arg.

- [ ] **Step 3: Write minimal implementation**

`weekBarBox` in `rccpPoStack.js`:

```js
export function weekBarBox(index, barWidth, slot = 'center') {
  const bandX = RCCP_CHART_Y_AXIS_WIDTH + Number(index) * RCCP_WEEK_COL_WIDTH;
  const width = Math.min(Math.max(0, Number(barWidth) || 0), RCCP_WEEK_COL_WIDTH);
  if (slot === 'left' || slot === 'right') {
    const pairWidth = Math.min(RCCP_WEEK_COL_WIDTH * 0.8, RCCP_WEEK_COL_WIDTH);
    const gap = 4;
    const half = Math.max(0, (pairWidth - gap) / 2);
    const start = bandX + (RCCP_WEEK_COL_WIDTH - pairWidth) / 2;
    if (slot === 'left') return { x: start, width: half };
    return { x: start + half + gap, width: half };
  }
  return { x: bandX + (RCCP_WEEK_COL_WIDTH - width) / 2, width };
}
```

`isSentinelDate` in `rccpPoRow.js` (move body from `rccpKpis.js`). Re-export from kpis only if tests import it from there — they currently do not; switch kpis to `require('./rccpPoRow').isSentinelDate`.

`RccpPlanningDateSwitch.jsx`: Fluent `Field` + horizontal `RadioGroup` (`Requested` / `Confirmed`), `maxWidth: 280px`, hint: `KPIs and overcapacity follow this date; chart bars stay on requested, receipt and hatching.` Info via `rccpFieldLabel`. Do **not** import it in PageContent yet.

`RccpPoConfirmedBar.jsx`: read `payload.segmentsConfirmed`, `weekBarBox(index, payload.__barWidthConfirmed, 'right')`; return `null` if empty.

`RccpPoSegmentPinCard.jsx`: portal overlay, `pointerEvents: 'auto'`, Escape/click-outside call `onClose`. Empty body is OK.

`RccpPoStackBar.jsx`: on the rect add `onClick` that calls `hover?.onClick?.({ segment, label: weekLabel })` from context. Do not add a new prop to `RccpPoSegmentRect`.

Replace the `chartRows` mapping in the panel with `buildRccpChartRows`. Keep the panel at 10 props.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/rccp/rccpPoStack.test.js src/components/rccp/rccpChartStacks.test.js src/components/rccp/RccpPlanningDateSwitch.test.jsx server/utils/rccpKpis.test.js`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/rccp/RccpPlanningDateSwitch.jsx src/components/rccp/RccpPlanningDateSwitch.test.jsx src/components/rccp/rccpChartStacks.js src/components/rccp/rccpChartStacks.test.js src/components/rccp/RccpPoConfirmedBar.jsx src/components/rccp/RccpPoSegmentPinCard.jsx src/components/rccp/rccpPoStack.js src/components/rccp/rccpPoStack.test.js src/components/rccp/RccpChartMatrixPanel.jsx src/components/rccp/RccpPoStackBar.jsx server/utils/rccpPoRow.js server/utils/rccpKpis.js
git commit -m "refactor: extract RCCP chart shells for confirmed delivery #AB:285"
```

---

### Task 2: Confirmed delivery date in RCCP settings (#286)

**Files:**
- Modify: `server/services/RccpSettingsService.js`
- Modify: `server/services/RccpSettingsService.test.js`
- Modify: `src/components/rccp/RccpSettingsDataFields.jsx` (10th prop `onConfirmedDate`)
- Modify: `src/components/rccp/useRccpSettingsFormHandlers.js`
- Modify: `src/components/rccp/useRccpSettingsFormHandlers.test.js`
- Modify: `src/components/rccp/RccpSettingsForm.jsx`

**Interfaces:**
- Consumes: existing `receiptDateColumnKey` validation.
- Produces: `defaultConfig.confirmedDateColumnKey = ''`; `validateConfig` copies the receipt-date rules onto `confirmedDateColumnKey` (trim, max 128, `/^[A-Za-z0-9_]+$/` when non-empty); handler `handleConfirmedDate`; UI label **Confirmed delivery date**.

- [ ] **Step 1: Write the failing tests**

In `RccpSettingsService.test.js` add a describe mirroring receipt-date:

```js
describe('RccpSettingsService.validateConfig confirmedDateColumnKey', () => {
  const base = {
    dateColumnKey: 'requestedDeliveryDate',
    vendorColumnKey: 'vendorAccount',
    quantityMeasures: [
      { columnKey: 'quantity', label: 'Quantity', chartType: 'line', color: '#D13438', showInChart: true },
    ],
  };

  it('defaults to an empty confirmed date key', () => {
    const { valid, config } = validateConfig(base);
    expect(valid).toBe(true);
    expect(config.confirmedDateColumnKey).toBe('');
  });

  it('keeps a valid confirmed date column key', () => {
    const { valid, config } = validateConfig({ ...base, confirmedDateColumnKey: 'confirmedDlvDate' });
    expect(valid).toBe(true);
    expect(config.confirmedDateColumnKey).toBe('confirmedDlvDate');
  });

  it('trims whitespace on the confirmed date key', () => {
    const { config } = validateConfig({ ...base, confirmedDateColumnKey: '  confirmedDlvDate  ' });
    expect(config.confirmedDateColumnKey).toBe('confirmedDlvDate');
  });

  it('rejects a confirmed date key longer than 128 characters', () => {
    const { valid, error } = validateConfig({ ...base, confirmedDateColumnKey: 'a'.repeat(129) });
    expect(valid).toBe(false);
    expect(error).toBe('confirmedDateColumnKey must be at most 128 characters');
  });

  it('rejects a confirmed date key with invalid characters', () => {
    const { valid, error } = validateConfig({ ...base, confirmedDateColumnKey: 'confirmed-date' });
    expect(valid).toBe(false);
    expect(error).toBe('confirmedDateColumnKey may only contain letters, numbers and underscores');
  });
});
```

Handler test:

```js
it('zet de confirmed-date kolom via handleConfirmedDate', () => {
  const onUpdateField = vi.fn();
  const { result } = renderHook(() => useRccpSettingsFormHandlers({ thresholds: {} }, onUpdateField));
  result.current.handleConfirmedDate({ target: { value: 'confirmedDlvDate' } });
  expect(onUpdateField).toHaveBeenCalledWith('confirmedDateColumnKey', 'confirmedDlvDate');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run server/services/RccpSettingsService.test.js src/components/rccp/useRccpSettingsFormHandlers.test.js`

Expected: FAIL — `confirmedDateColumnKey` undefined; `handleConfirmedDate` missing.

- [ ] **Step 3: Write minimal implementation**

In `defaultConfig` add `confirmedDateColumnKey: ''`.

In `validateConfig`, after receipt-date block, identical checks for `confirmedDateColumnKey`. Include it in the returned `config` object.

`RccpSettingsDataFields` currently has 9 props. Add `onConfirmedDate` as 10th. Insert a `ColumnSelect` after Receipt date:

- label: `Confirmed delivery date`
- info: `Line date first; the order header is the fallback. Optional.`
- `allowEmpty`
- `value={config.confirmedDateColumnKey || ''}`
- `onChange={onConfirmedDate}`
- same 200px slot

`handleConfirmedDate` in the form handlers; pass from `RccpSettingsForm`.

Empty column: no other behavior in this task (chart/matrix hide in later tasks).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run server/services/RccpSettingsService.test.js src/components/rccp/useRccpSettingsFormHandlers.test.js`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/services/RccpSettingsService.js server/services/RccpSettingsService.test.js src/components/rccp/RccpSettingsDataFields.jsx src/components/rccp/useRccpSettingsFormHandlers.js src/components/rccp/useRccpSettingsFormHandlers.test.js src/components/rccp/RccpSettingsForm.jsx
git commit -m "feat: optional confirmed delivery date column in RCCP settings #AB:285"
```

---

### Task 3: Confirmed segments and extra matrix row (#287)

**Files:**
- Create: `server/utils/rccpConfirmedLoad.js`
- Create: `server/utils/rccpConfirmedLoad.test.js`
- Modify: `server/utils/rccpPoSegments.js` (`segmentsConfirmed` per week)
- Modify: `server/utils/rccpPoSegments.test.js`
- Modify: `server/services/RccpAnalysisService.js` (call helper; `buildChartSeries` / overcapacity exclude `isConfirmedDelivery`)
- Modify: `src/components/rccp/rccpUtils.js` — `export const RCCP_CONFIRMED_DELIVERY_MEASURE_KEY = '__confirmed_delivery__';` only
- Modify: `src/components/rccp/rccpMatrixRows.js` — rank 35 for `isConfirmedDelivery`
- Modify: `src/components/rccp/rccpChartItems.js` — include `segmentsConfirmed`
- Modify: `src/components/rccp/rccpChartItems.test.js`
- Modify: `src/components/rccp/rccpPeriodGrain.js` — `SKIP_CHART_KEYS` add `segmentsConfirmed`, `__barWidthConfirmed`; `sumChartGroup` merge confirmed
- Modify: `src/components/rccp/rccpPeriodGrain.test.js`
- Modify: `src/components/rccp/RccpChartMatrixPanel.jsx` — `isStackRow` also true for `isConfirmedDelivery` (keep out of line/bar series). Do **not** add props.
- Modify: `server/utils/rccpKpis.js` — `buildRccpCapacityKpis` also exclude `isConfirmedDelivery`

**Interfaces:**
- Consumes: `buildPoSegments`, `collectDateSlots`, `isSentinelDate`, `clipBump` pattern.
- Produces:
  - `buildPoSegments` week bucket `{ segmentsAbove, segmentsBelow, segmentsConfirmed }`
  - `mergeSegmentsIntoChart` copies `segmentsConfirmed`
  - `buildConfirmedDeliveryCells({ factoryConfirmedByCell, periods, vendorFilter, config })` → cells with `measureKey: '__confirmed_delivery__'` and a measure row `{ measureKey, label: 'Confirmed delivery', showInChart: false, isConfirmedDelivery: true }`
  - `buildFactoryConfirmedByCell(rows, config, window, { vendorAccount })` — open qty keyed by vendor|year|week of confirmed date; skip empty/`isSentinelDate`; clip outside window; header-only via `collectDateSlots` on confirmed key
  - Month grain sums `segmentsConfirmed` via `mergeSegments`

Do **not** switch overcapacity yet (still uses `confirmedByCell` / requested week). Extra row `showInChart: false`.

- [ ] **Step 1: Write the failing tests**

`rccpPoSegments.test.js` — add cases:

```js
it('places open qty on the confirmed week as segmentsConfirmed', () => {
  const confirmed = '2026-03-23T00:00:00.000Z';
  const confirmedWeek = weekOf(confirmed);
  const config = { ...baseConfig, confirmedDateColumnKey: 'confirmedDlvDate' };
  const byWeek = buildPoSegments([row({ line: { confirmedDlvDate: confirmed } })], config, {
    ...window, toWeek: Math.max(window.toWeek, confirmedWeek.week),
  }, { now: nowCurrent });
  expect(byWeek.get(confirmedWeek.key).segmentsConfirmed).toEqual([
    { itemNumber: 'SKU-1', qty: 10, status: 'confirmed', late: false, dataAreaId: 'whsl' },
  ]);
  expect(byWeek.get(plannedWeek.key).segmentsConfirmed || []).toEqual([]);
});

it('skips sentinel and empty confirmed dates', () => {
  const config = { ...baseConfig, confirmedDateColumnKey: 'confirmedDlvDate' };
  const byWeek = buildPoSegments([
    row({ line: { confirmedDlvDate: '1900-01-01T00:00:00.000Z' } }),
  ], config, window, { now: nowCurrent });
  for (const bucket of byWeek.values()) {
    expect(bucket.segmentsConfirmed || []).toEqual([]);
  }
});

it('clips confirmed segments outside the window', () => {
  const config = { ...baseConfig, confirmedDateColumnKey: 'confirmedDlvDate' };
  const byWeek = buildPoSegments([
    row({ line: { confirmedDlvDate: '2020-01-06T00:00:00.000Z' } }),
  ], config, window, { now: nowCurrent });
  for (const bucket of byWeek.values()) {
    expect(bucket.segmentsConfirmed || []).toEqual([]);
  }
});
```

`rccpConfirmedLoad.test.js`: extra row cells; sentinel skip; `buildChartSeries` exclusion is tested via a unit on `buildRccpCapacityKpis` (synthetic row not in load). Header-only: confirmed key on master, open qty on master, lines without the measure.

`rccpChartItems.test.js`: `collectRccpChartItemNumbers` also reads `segmentsConfirmed`.

`rccpPeriodGrain.test.js`: month rollup concatenates/merges `segmentsConfirmed`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run server/utils/rccpPoSegments.test.js server/utils/rccpConfirmedLoad.test.js src/components/rccp/rccpChartItems.test.js src/components/rccp/rccpPeriodGrain.test.js`

Expected: FAIL — `segmentsConfirmed` undefined.

- [ ] **Step 3: Write minimal implementation**

In `buildPoSegments`:
- Read `confirmedKey = String(config.confirmedDateColumnKey || '').trim()`
- Third map `confirmed = new Map()`
- For each line with `openQty > 0` and a non-sentinel confirmed date: `clipBump(confirmed, isoWeekKey(...), itemNumber, 'open', openQty, false, dataAreaId)` then emit as `{ status: 'confirmed' }` (qty is open qty). Reuse `bump` with status `'open'` internally or add `'confirmed'` to bump — emit as `status: 'confirmed'`.
- Header-only open: `collectDateSlots(..., confirmedKey, null, window, ...)` then `spreadHeaderQty` into confirmed map.
- Empty `confirmedKey`: leave `segmentsConfirmed: []`.
- Return `{ segmentsAbove, segmentsBelow, segmentsConfirmed: emitConfirmed(...) }`.

`rccpConfirmedLoad.js`:
- `CONFIRMED_DELIVERY_MEASURE_KEY = '__confirmed_delivery__'`
- `buildFactoryConfirmedByCell` walks PO rows like segments (open qty, confirmed week).
- `appendConfirmedDeliveryRow({ cells, measureRows, factoryConfirmedByCell, periods, vendorFilter })` pushes cells + measure row.
- `buildChartSeries` in analysis: add `&& !r.isConfirmedDelivery` to `userLoadKeys` filter (same for `buildRccpCapacityKpis`).

`analyze()`: after `buildMatrixCells`, call `appendConfirmedDeliveryRow` when `confirmedDateColumnKey` is set; `mergeSegmentsIntoChart` already maps weeks.

Drill-down: in `buildDrillDownRows`, when `measureKey === '__confirmed_delivery__'`, match lines whose confirmed ISO week equals the cell week (not `dateColumnKey`). Put that branch in `rccpConfirmedLoad.js` (`matchConfirmedDeliveryDrill(row, cell, config)`) and call it from the service — do not add history I/O.

`rccpMatrixRows.js` rank: `if (row?.isConfirmedDelivery) return 35;` (between capacity 40 and open 30).

`isStackRow` in panel: `row.isOpen || row.isDelivered || row.isConfirmedDelivery`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run server/utils/rccpPoSegments.test.js server/utils/rccpConfirmedLoad.test.js server/utils/rccpKpis.test.js src/components/rccp/rccpChartItems.test.js src/components/rccp/rccpPeriodGrain.test.js src/components/rccp/rccpChartStacks.test.js`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/utils/rccpPoSegments.js server/utils/rccpPoSegments.test.js server/utils/rccpConfirmedLoad.js server/utils/rccpConfirmedLoad.test.js server/services/RccpAnalysisService.js server/utils/rccpKpis.js src/components/rccp/rccpUtils.js src/components/rccp/rccpMatrixRows.js src/components/rccp/rccpChartItems.js src/components/rccp/rccpChartItems.test.js src/components/rccp/rccpPeriodGrain.js src/components/rccp/rccpPeriodGrain.test.js src/components/rccp/RccpChartMatrixPanel.jsx
git commit -m "feat: RCCP confirmed-delivery segments and matrix row #AB:285"
```

---

### Task 4: Chart — item color, hatching, slot layout (#288)

**Files:**
- Create: `src/components/rccp/rccpItemColor.js`
- Create: `src/components/rccp/rccpItemColor.test.js`
- Modify: `src/components/rccp/rccpPoStack.js` (`isRccpItemHighlight` replacing received-only pair)
- Modify: `src/components/rccp/rccpPoStack.test.js`
- Modify: `src/components/rccp/RccpPoStackBar.jsx` (opacity 0.25 / highlight 0.4; fill from `rccpItemColor` for received; open stays measure color)
- Modify: `src/components/rccp/RccpPoConfirmedBar.jsx` (hatch + item color)
- Modify: `src/components/rccp/RccpChartPlot.jsx` (defs patterns; render confirmed bar; legend entries)
- Modify: `src/components/rccp/RccpChartMatrixPanel.jsx` (`highlightItem` from any hovered segment; no extra props)
- Modify: `src/components/rccp/rccpChartStacks.js` (`__barWidthConfirmed`, pass confirmed segments)

**Interfaces:**
- Consumes: `weekBarBox(..., 'left'|'right'|'center')`, `segmentsConfirmed`, `RccpSegmentHoverContext`.
- Produces:
  - `rccpItemColor(itemNumber, { openColor })` → hex from a module-level palette that never includes `#D13438` and skips `openColor`
  - Two bars above the axis: left = requested stack (`slot: 'left'`), right = confirmed (`slot: 'right'`), together ~80%; below axis stays one centered received bar (`slot: 'center'`)
  - Hover highlight: received-above + received-below + confirmed of the same `itemNumber`
  - Legend: Open solid, Received 25%, Confirmed hatch
  - Empty confirmed slot stays empty (left bar does not expand)

- [ ] **Step 1: Write the failing tests**

`rccpItemColor.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { rccpItemColor, RCCP_ITEM_PALETTE } from './rccpItemColor';

describe('rccpItemColor', () => {
  it('never returns #D13438 or the open measure color', () => {
    expect(RCCP_ITEM_PALETTE.map((c) => c.toLowerCase())).not.toContain('#d13438');
    for (let i = 0; i < 40; i += 1) {
      const color = rccpItemColor(`SKU-${i}`, { openColor: '#0078D4' });
      expect(color.toLowerCase()).not.toBe('#d13438');
      expect(color.toLowerCase()).not.toBe('#0078d4');
    }
  });

  it('is stable for the same item number', () => {
    expect(rccpItemColor('CFM-1', { openColor: '#D13438' }))
      .toBe(rccpItemColor('CFM-1', { openColor: '#D13438' }));
  });
});
```

`rccpPoStack.test.js`: `isRccpItemHighlight` true for received **and** confirmed of the same item; false for a different item; open segments do not need fill-highlight (stroke only via late/highlight).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/rccp/rccpItemColor.test.js src/components/rccp/rccpPoStack.test.js`

Expected: FAIL — module missing.

- [ ] **Step 3: Write minimal implementation**

Palette (examples, no `#D13438`): `#0078D4`, `#8764B8`, `#CA5010`, `#107C10`, `#5C2D91`, `#00B7C3`, `#4F6BED`, `#8E562E`. Hash `itemNumber` with a simple string hash, modulo filtered palette.

Received above: `fillOpacity` **0.25** (highlight ~0.45). Received below: 1. Open: 1, fill = `payload.__openColor`. Late stroke `#D13438` wins over highlight stroke.

`RccpPoStackBar` above: `weekBarBox(index, barWidth, 'left')`. Below: `weekBarBox(index, barWidth, 'center')`.

`RccpPoConfirmedBar`: one `<rect>` per confirmed segment, `fill={rccpItemColor(item)}`, `fill="url(#rccp-hatch-<sanitized>)"` or `fill` item color + `mask` / overlay pattern. Spec: one set of SVG `pattern`s in plot `<defs>` (not per segment); thin diagonals, generous spacing. Pattern id `rccpConfirmedHatch`. Rect uses `fill={itemColor}` plus a second rect with `fill="url(#rccpConfirmedHatch)"` and `style={{ mixBlendMode: 'multiply' }}` **or** pattern with `patternContentUnits` drawing item-colored diagonals via `currentColor` — simplest: pattern of dark lines (`tokens.colorNeutralForeground1`) at low opacity over the item fill.

`RccpChartPlot`: add `<Bar dataKey="__stackConfirmed" shape={renderConfirmed} legendType="none" isAnimationActive={false} />` when any point has confirmed qty. Custom legend items: Open, Received 25%, Confirmed hatch — implement as extra `Legend` payload via `content` only if default Recharts legend cannot express hatch; otherwise keep existing legend and add three static `swatch` texts under the plot header in the panel **without a new panel prop** (put swatches inside `RccpChartPlot` using `stack.openRow`).

Panel `highlightItem`: `hoveredSegment?.segment?.itemNumber || ''` (any status).

Do not add props to the panel. Do not wire pin card yet.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/rccp/rccpItemColor.test.js src/components/rccp/rccpPoStack.test.js src/components/rccp/rccpChartStacks.test.js`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/rccp/rccpItemColor.js src/components/rccp/rccpItemColor.test.js src/components/rccp/rccpPoStack.js src/components/rccp/rccpPoStack.test.js src/components/rccp/RccpPoStackBar.jsx src/components/rccp/RccpPoConfirmedBar.jsx src/components/rccp/RccpChartPlot.jsx src/components/rccp/RccpChartMatrixPanel.jsx src/components/rccp/rccpChartStacks.js
git commit -m "feat: RCCP item colors, hatching and split week bars #AB:285"
```

---

### Task 5: Planning date on analysis — KPIs and overcapacity (#289 backend)

**Files:**
- Modify: `server/routes/rccp.js` (`GET /analysis` parse `planningDate`)
- Modify: `server/services/RccpAnalysisService.js` (`analyze({ planningDate })`; overcapacity uses `factoryConfirmedByCell` when confirmed)
- Modify: `server/utils/rccpKpis.js` (`planningDate` on comparison date; window filter stays requested)
- Modify: `server/utils/rccpKpis.test.js`
- Modify: `server/utils/rccpConfirmedLoad.js` (overcapacity cells from factory map)
- Modify: `server/utils/rccpConfirmedLoad.test.js`
- Create: `server/routes/rccp.planningDate.test.js` **or** extend an existing route test if present — otherwise test parse via a small `parsePlanningDate(query, config)` helper in `server/utils/rccpPlanningDate.js`

**Interfaces:**
- Consumes: `confirmedDateColumnKey`, `factoryConfirmedByCell`.
- Produces:
  - Query `planningDate=requested|confirmed`. Omit/empty → `requested`. Invalid → 400. `confirmed` without column → 400.
  - KPI comparison date = requested or confirmed; `planned1900` in confirmed mode = open+delivered where confirmed empty or sentinel (not late).
  - `lateDelivery` / `onTime` / `openLate` compare against the chosen date.
  - Overcapacity: requested = current `confirmedByCell` open load; confirmed = `factoryConfirmedByCell` open load. Extra row never added into overload.
  - `GET /board-kpis` unchanged (no query, `buildRccpPoKpiByOrder` stays requested).

- [ ] **Step 1: Write the failing tests**

`rccpKpis.test.js` — window still requested when comparison is confirmed:

```js
it('keeps window membership on requested date when planningDate is confirmed', () => {
  const config = { ...baseConfig, confirmedDateColumnKey: 'confirmedDlvDate' };
  const confirmed = '2026-06-01T00:00:00.000Z'; // outside window
  const rows = [row({ line: { confirmedDlvDate: confirmed, openQty: 10, deliveredQty: 0 } })];
  const pair = buildRccpPoKpisPair(rows, config, window, { now: nowCurrent, planningDate: 'confirmed' });
  expect(pair.windowed.totalOpen).toBe(10); // still in window via requested date
});

it('treats missing confirmed date as planned1900, not late', () => {
  const config = { ...baseConfig, confirmedDateColumnKey: 'confirmedDlvDate' };
  const rows = [row({ line: { confirmedDlvDate: '', openQty: 10, deliveredQty: 0 } })];
  const kpis = buildRccpPoKpis(rows, config, window, { now: nowNext, planningDate: 'confirmed' });
  expect(kpis.planned1900Units).toBe(10);
  expect(kpis.openLateUnits).toBe(0);
});
```

`rccpConfirmedLoad.test.js`: overload uses factory map when `planningDate === 'confirmed'`; extra row qty does not double-count.

`rccpPlanningDate.test.js`:

```js
it('defaults empty to requested', () => {
  expect(parsePlanningDate('', { confirmedDateColumnKey: 'x' })).toBe('requested');
});
it('rejects invalid values', () => {
  expect(() => parsePlanningDate('maybe', { confirmedDateColumnKey: 'x' })).toThrow(/planningDate/);
});
it('rejects confirmed without a column', () => {
  expect(() => parsePlanningDate('confirmed', { confirmedDateColumnKey: '' })).toThrow(/planningDate/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run server/utils/rccpKpis.test.js server/utils/rccpConfirmedLoad.test.js server/utils/rccpPlanningDate.test.js`

Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

`parsePlanningDate(raw, config)` in `server/utils/rccpPlanningDate.js`. Route:

```js
const planningDate = parsePlanningDate(req.query.planningDate, await settingsService.getConfig());
```

Avoid double `getConfig` — parse after config is loaded inside `analyze`, and have the route pass the raw query string:

```js
const data = await analysisService.analyze({ ..., planningDate: req.query.planningDate });
```

Inside `analyze`, `getConfig()` then `parsePlanningDate`. Throw `err.status = 400`.

KPI walk: always attach `confirmedDate` from `confirmedDateColumnKey`. Window check stays `plannedYear/plannedWeek`. `visitUniverseLine` uses `compareDate = planningDate === 'confirmed' ? line.confirmedDate : line.plannedDate` for late/on-time/openLate/planned1900. Missing/sentinel confirmed in confirmed mode → planned1900, skip late.

`buildMatrixCells` overcapacity: if planningDate confirmed, `openLoad = factoryConfirmedByCell.get(cellKey(...)) || 0`. Requested path unchanged.

Pass `factoryConfirmedByCell` from `buildFactoryConfirmedByCell` in `analyze` (one extra walk is OK if kept in `time('rccp_po_segments')` together — prefer computing factory map inside `buildPoSegments` return or a shared walk; if a second walk is simpler, wrap it in `time('rccp_po_segments')` only if it is the same pass. Spec: “Confirmed-segmenten in dezelfde rccp_po_segments-pass”. So compute factory map inside `buildPoSegments` and return it, **or** derive cells from `segmentsConfirmed` summed per week. Preferred: return `{ byWeek, factoryConfirmedByCell }` from a wrapper `buildPoSegmentsWithLoad` in `rccpConfirmedLoad.js` that calls `buildPoSegments` and also builds the cell map from the same rows in one function used by analyze.

Simplest spec-compliant approach: extend `buildPoSegments` to also fill `factoryConfirmedByCell` and return `{ byWeek, factoryConfirmedByCell }`. Update existing callers/tests: tests use `buildPoSegments(...)` as a Map today — **keep `buildPoSegments` returning the Map** and add `buildFactoryConfirmedByCell` as a separate exported function called from analyze. Spec says same pass — implement both in one loop internally:

```js
function buildPoSegmentState(...) { /* one loop; returns { byWeek, factoryConfirmedByCell } */ }
function buildPoSegments(...) { return buildPoSegmentState(...).byWeek; }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run server/utils/rccpKpis.test.js server/utils/rccpConfirmedLoad.test.js server/utils/rccpPlanningDate.test.js server/utils/rccpPoSegments.test.js`

Expected: PASS. Board-kpi tests if any still pass.

- [ ] **Step 5: Commit**

```bash
git add server/routes/rccp.js server/services/RccpAnalysisService.js server/utils/rccpKpis.js server/utils/rccpKpis.test.js server/utils/rccpConfirmedLoad.js server/utils/rccpConfirmedLoad.test.js server/utils/rccpPlanningDate.js server/utils/rccpPlanningDate.test.js server/utils/rccpPoSegments.js
git commit -m "feat: RCCP planningDate query for KPIs and overcapacity #AB:285"
```

---

### Task 6: Planning date RadioGroup + blob persist (#289 frontend)

**Files:**
- Modify: `src/hooks/useRccpWindow.js`
- Create: `src/hooks/useRccpWindow.test.js` (file did not exist)
- Modify: `src/hooks/useRccpPage.js`
- Modify: `src/hooks/useRccpVendorPrefetch.js`
- Modify: `src/utils/rccpAnalysisPrefetch.js`
- Modify: `src/utils/rccpAnalysisPrefetch.test.js`
- Modify: `src/components/rccp/rccpUtils.js` — `buildAnalysisQuery(window, vendorAccount, planningDate)`
- Modify: `src/components/rccp/RccpPageContent.jsx` — mount `RccpPlanningDateSwitch` next to Item; hide when no confirmed column
- Modify: `src/components/rccp/RccpKpiCards.jsx` — `planned1900` label `Missing confirmed date` when `planningDate === 'confirmed'`
- Modify: `src/components/rccp/rccpChartStacks.js` — stacks **do not** read `planningDate`

**Interfaces:**
- Consumes: `RccpPlanningDateSwitch`, analysis `config.confirmedDateColumnKey`.
- Produces:
  - Persist blob always sends `{ isoWindow, lastVendorAccount, kpiWindowOnly, chartVisibleKeys, planningDate }`
  - Default `planningDate: 'requested'`
  - Hook return stays ≤ 10 by grouping `planning: { date, setDate }`
  - Prefetch cache key includes `planningDate`
  - Split-pane unchanged (no switch)

- [ ] **Step 1: Write the failing tests**

`useRccpWindow.test.js` (renderHook + mocked `apiRequest`):

```js
it('PATCH stuurt planningDate mee met de bestaande blob-velden', async () => {
  // after setPlanningDate('confirmed'), last PATCH body.settings has
  // isoWindow, lastVendorAccount, kpiWindowOnly, chartVisibleKeys, planningDate: 'confirmed'
});

it('leest planningDate uit board-settings; ongeldig valt terug op requested', async () => {
  // settings.planningDate = 'nope' → date === 'requested'
});
```

`rccpAnalysisPrefetch.test.js`: same vendor+window different `planningDate` → second `apiRequest`.

Add unit for `buildAnalysisQuery` in an existing rccpUtils test file if present; otherwise `rccpUtils.analysisQuery.test.js`:

```js
expect(buildAnalysisQuery(WINDOW, 'V1', 'confirmed')).toContain('planningDate=confirmed');
expect(buildAnalysisQuery(WINDOW, 'V1')).not.toContain('planningDate'); // omit when requested/default
```

Omitting default keeps existing cache keys working for requested.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/useRccpWindow.test.js src/utils/rccpAnalysisPrefetch.test.js`

Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

`useRccpWindow`: state `planningDate`, ref, persist field. Validate on load: only `'requested'|'confirmed'`. Return:

```js
{
  isoWindow, setIsoWindow, lastVendor, setLastVendor,
  kpiWindowOnly, setKpiWindowOnly, chartVisibleKeys, setChartVisibleKeys,
  planning, loaded,
}
```

where `planning = useMemo(() => ({ date: planningDate, setDate: setPlanningDate }), [...])`.

`useRccpPage` / prefetch: pass `planning.date`. `useRccpVendorPrefetch(window, planningDate)`.

PageContent: if `analysis?.config?.confirmedDateColumnKey`, render `<RccpPlanningDateSwitch value={planning.date} onChange={planning.setDate} />` beside `RccpItemFilter`. Hide entirely when column empty (no disabled control).

KPI cards: optional prop `planningDate`; relabel planned1900.

Chart code paths ignore `planningDate`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/useRccpWindow.test.js src/utils/rccpAnalysisPrefetch.test.js src/components/rccp/RccpPlanningDateSwitch.test.jsx`

Expected: PASS. File stays under 300 lines / 10 return values.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useRccpWindow.js src/hooks/useRccpWindow.test.js src/hooks/useRccpPage.js src/hooks/useRccpVendorPrefetch.js src/utils/rccpAnalysisPrefetch.js src/utils/rccpAnalysisPrefetch.test.js src/components/rccp/rccpUtils.js src/components/rccp/RccpPageContent.jsx src/components/rccp/RccpKpiCards.jsx
git commit -m "feat: persist RCCP planning date and wire KPI switch #AB:285"
```

---

### Task 7: History-pin per item (#290)

**Files:**
- Create: `server/utils/rccpConfirmedHistory.js`
- Create: `server/utils/rccpConfirmedHistory.test.js`
- Modify: `server/routes/rccp.js` — `GET /confirmed-history`
- Create: `src/components/rccp/useRccpSegmentPin.js`
- Create: `src/hooks/useRccpConfirmedHistory.js`
- Create: `src/hooks/useRccpConfirmedHistory.test.js`
- Modify: `src/components/rccp/useRccpItemFilter.js` (stay filter-only)
- Modify: `src/components/rccp/RccpPoSegmentPinCard.jsx`
- Modify: `src/components/rccp/RccpChartMatrixPanel.jsx` (hooks inside panel; still 10 props)
- Modify: `src/components/rccp/rccpChartItems.js` or new `src/components/rccp/rccpConfirmedOverlay.js` — overlay after grain → item-filter → history
- Create: `src/components/rccp/rccpConfirmedOverlay.test.js`
- Modify: `src/components/rccp/RccpPageContent.jsx` — item picker already filters; pin syncs via hook in panel **or** lift pin to page only if picker must pin. Spec: “Dezelfde Item-kiezer bovenaan filtert de grafiek op dat item.” Filter lives in PageContent; pin lives in panel. Sync: `useRccpSegmentPin` in PageContent wrapping filter change + panel `onItemClick` would add a panel prop (forbidden). **Ruling:** keep pin+history inside the panel; PageContent Item filter continues to filter. Click-to-pin is panel-local. Choosing an item in the page filter does **not** open the pin card (spec also says click opens pin). Item picker “filters and pins” — so PageContent must call pin. That needs a callback **into** the panel = 11th prop.

**Ruling (binding):** do not add an 11th panel prop. Extract a thin wrapper `RccpChartWithPin` in the same folder that owns pin+filter sync and renders the existing 10-prop panel + pin card. PageContent uses the wrapper (still one child). Wrapper may take `itemNumber`, `onItemChange`, `items` plus the current panel props — if that exceeds 10, pass `itemFilter={{ itemNumber, items, onChange }}` as one prop.

**Interfaces:**
- `GET /api/rccp/confirmed-history?itemNumber&vendorAccount&fromYear&fromWeek&toYear&toWeek`
- `rccpAccess`; vendor required (staff without vendor → 400)
- `itemNumber`: trim, max 128, reject empty / `*` / `%` / `_`, exact match via `matchRccpChartItem` rules
- Payload `{ itemNumber, versions: [{ at, date }] }` only
- `time('rccp_confirmed_hist')`
- One parameterized batch, no `getCellHistory` loop, no `LIKE`
- Overlay: chosen version → all open qty of that item in that ISO week; Show all versions → one hatched bar per unique date, qty = current open qty of lines that know that date
- Unpin: All items, click outside, Escape
- Hover card stays `pointer-events: none`

- [ ] **Step 1: Write the failing tests**

`rccpConfirmedHistory.test.js` (pure parse + qty overlay):

```js
describe('parseConfirmedHistoryItemNumber', () => {
  it('rejects empty, wildcard and too long', () => {
    for (const value of ['', '  ', '*', '%', '_', 'a'.repeat(129)]) {
      expect(() => parseConfirmedHistoryItemNumber(value)).toThrow();
    }
  });
});

describe('confirmedHistoryOverlay', () => {
  it('moves all open qty of the item to the chosen version week', () => {
    const chart = overlayConfirmedHistory(baseChart, {
      itemNumber: 'SKU-1',
      selectedDate: '2026-03-23T00:00:00.000Z',
      versions: [{ at: 't', date: '2026-03-23T00:00:00.000Z' }],
      showAll: false,
    });
    // all SKU-1 confirmed qty sits on 2026-W13 (week of 23 Mar 2026)
  });
});
```

Route validation can be unit-tested via parse helpers (no HTTP). SQL batch builder returns one query with table-valued parameters or an `IN` list of (`partitionKey`,`recordKey`,`detailKey`) built from already-fetched PO rows.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run server/utils/rccpConfirmedHistory.test.js src/components/rccp/rccpConfirmedOverlay.test.js src/hooks/useRccpConfirmedHistory.test.js`

Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

History util:
1. Resolve vendor+window like analysis (`readRccpPoRows` + same filters).
2. Keep open lines matching `itemNumber` exactly.
3. Resolve confirmed column id from config key (PO table columns + excel joins — same as board history uses). If column missing → `{ itemNumber, versions: [] }`.
4. One SQL batch: `WHERE column_id=@columnId AND (partition_key, record_key, detail_key) IN (...)` on `tb_cell_history` UNION `tb_field_corrections` (applied). Parameterize each triple; cap list to the matching lines (not the whole vendor).
5. Unique dates from history `newValue`/`oldValue` that parse as dates, plus skip sentinels. `at` = latest timestamp for that date.
6. Overlay on the client from `{ versions, selectedDate, showAll }`.

`useRccpConfirmedHistory({ itemNumber, vendorAccount, window, enabled })`: `apiRequest`, AbortController cleanup.

`useRccpSegmentPin({ itemNumber, onItemChange, resetItem })`: pin state, sync when filter changes to All items → unpin; click sets filter to that item.

Pin card: status **Confirmed**, `Field` + listbox `positioning={{ mountNode: document.body }}`, Checkbox **Show all versions** hidden when `versions.length <= 1`. Current option labeled **Current**.

Overlay order in PageContent/wrapper: `resolveRccpChartView` (grain) → `filterRccpChartByItem` → `overlayConfirmedHistory`.

`RccpPoStackBar` click → pin. Hover card unchanged.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run server/utils/rccpConfirmedHistory.test.js src/components/rccp/rccpConfirmedOverlay.test.js src/hooks/useRccpConfirmedHistory.test.js src/components/rccp/useRccpItemFilter.js`

Expected: PASS. Panel ≤10 props, files ≤300 lines.

- [ ] **Step 5: Commit**

```bash
git add server/utils/rccpConfirmedHistory.js server/utils/rccpConfirmedHistory.test.js server/routes/rccp.js src/components/rccp/useRccpSegmentPin.js src/hooks/useRccpConfirmedHistory.js src/hooks/useRccpConfirmedHistory.test.js src/components/rccp/RccpPoSegmentPinCard.jsx src/components/rccp/RccpChartMatrixPanel.jsx src/components/rccp/rccpConfirmedOverlay.js src/components/rccp/rccpConfirmedOverlay.test.js src/components/rccp/RccpPageContent.jsx src/components/rccp/RccpPoStackBar.jsx
git commit -m "feat: RCCP confirmed-date history pin per item #AB:285"
```

---

### Task 8: Formula copy + version bump

**Files:**
- Modify: `src/components/rccp/rccpKpiFormulas.js`
- Modify: `src/config/version.js` (`v1.52.39` → `v1.52.40`)

**Interfaces:**
- Consumes: Planning date behavior from Task 5/6.
- Produces: English formulas that mention the comparison date; `planned1900` confirmed wording.

- [ ] **Step 1: Write the failing test**

If `rccpKpiFormulas` has no test file, create `src/components/rccp/rccpKpiFormulas.test.js`:

```js
import { KPI_FORMULAS } from './rccpKpiFormulas';

it('mentions requested vs confirmed comparison for late and on-time', () => {
  expect(KPI_FORMULAS.lateDelivery.toLowerCase()).toMatch(/planned|confirmed|comparison/);
  expect(KPI_FORMULAS.planned1900.toLowerCase()).toMatch(/1-1-1900|confirmed/);
});
```

Adjust strings to the copy below so the test matches exactly.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/rccp/rccpKpiFormulas.test.js`

- [ ] **Step 3: Implementation**

```js
lateDelivery: 'delivered where receipt date > comparison date\n(comparison = requested or confirmed planning date)\nitems = unique item numbers on those lines\n% = late / ordered × 100',
onTime: 'delivered where receipt date ≤ comparison date\n1-1-1900 and missing comparison dates are excluded\nitems = unique item numbers\n% = on time / ordered × 100',
openLate: 'open where comparison ISO week < current ISO week\n(comparison = requested or confirmed planning date)\nitems = unique item numbers on those lines\nØ days late = average of (today − comparison date)',
planned1900: 'open + delivered where comparison date is missing or 1-1-1900\nRequested: planned date. Confirmed: confirmed date.\nitems = unique item numbers on those lines',
```

Keep `ordered` / `delivered` / `open` / capacity formulas unchanged.

`APP_VERSION = 'v1.52.40'`

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/components/rccp/rccpKpiFormulas.test.js`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/rccp/rccpKpiFormulas.js src/components/rccp/rccpKpiFormulas.test.js src/config/version.js
git commit -m "docs: RCCP KPI formulas for planning date and bump version #AB:285"
```

---

## Self-review

**Spec coverage:**
- Settings column → Task 2
- Three encodings / item color / hatch / slots → Task 4
- Extra matrix row / segmentsConfirmed / month sum / no double load → Task 3
- Planning date KPIs + overcapacity + window stays requested → Task 5–6
- History pin / overlay / batched GET → Task 7
- board-kpis unchanged → Task 5
- Split first → Task 1
- Version → Task 8
- Split-pane: no switch/pin → Task 6/7 (do not mount those in `RccpSplitStrip`)

**Placeholder scan:** none of TBD / later / similar-to-Task-N.

**Type consistency:** `confirmedDateColumnKey`, `planningDate`, `segmentsConfirmed`, `factoryConfirmedByCell`, `__confirmed_delivery__`, `isConfirmedDelivery` used the same way in later tasks.

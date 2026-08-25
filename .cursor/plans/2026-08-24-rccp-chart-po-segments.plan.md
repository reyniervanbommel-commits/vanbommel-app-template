# RCCP-grafiek PO-vakjes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In de bestaande Capacity vs load-grafiek per week PO-vakjes tonen (open donker, received licht boven; received onder op ontvangstdatum), een Today-lijn op de echte weekdag, en een rood kader om te late open orders.

**Architecture:** `GET /api/rccp/analysis` levert per weekpunt `segmentsAbove` / `segmentsBelow` uit dezelfde PO-snapshot. Custom Recharts-shape tekent gestapelde vakjes (80% weekbreedte). Today is een SVG-overlay op `todayLineX`, geen `ReferenceLine`. Geen nieuwe route, geen SQL-migratie.

**Tech Stack:** React 18, Fluent UI v9, Recharts, Express, Vitest.

**Spec:** `docs/specs/2026-08-24-rccp-chart-po-segments-design.md`

## Global Constraints

- UI-teksten Engels; geen Fluent `Tooltip` in herhaalde lijsten.
- Componenten ≤ 300 regels; `RccpChartMatrixPanel` extraheert bij ≥ 250.
- `receiptDateColumnKey`: trim, `''` toegestaan, max 128, niet-leeg alleen `[A-Za-z0-9_]+` anders 400.
- Geen `new Date()` in `buildPoSegments`; `now` injecteren. `time('rccp_po_segments', ...)`.
- Zelfde vendorfilter als de matrix (`effectiveVendor`).
- Geen segmenten uit `cells`; geen tweede board-read; util importeert nooit `RccpAnalysisService`.
- `APP_VERSION` patch; bestaande `apiRequest` / matrix / KPI’s / drill-down ongewijzigd.
- Commit prefix `feat` / `fix` + `#AB:269`.

---

### Task 1: Receipt date in RCCP-settings

**Files:**
- Modify: `server/services/RccpSettingsService.js`
- Modify: `server/services/RccpSettingsService.test.js`
- Modify: `src/components/rccp/useRccpSettingsFormHandlers.js`
- Modify: `src/components/rccp/useRccpSettingsFormHandlers.test.js`
- Modify: `src/components/rccp/RccpSettingsDataFields.jsx`
- Modify: `src/components/rccp/RccpSettingsForm.jsx`

**Interfaces:**
- Consumes: bestaande `validateConfig` / `ColumnSelect` / `onUpdateField`
- Produces: `config.receiptDateColumnKey` (string, altijd aanwezig)

- [ ] **Step 1:** `defaultConfig.receiptDateColumnKey = ''`. In `validateConfig`: trim; lengte > 128 → `{ valid: false, error: 'receiptDateColumnKey must be at most 128 characters' }`; niet-leeg en niet `^[A-Za-z0-9_]+$` → `{ valid: false, error: 'receiptDateColumnKey may only contain letters, numbers and underscores' }`; altijd terug in `config`.
- [ ] **Step 2:** Tests: leeg default; geldige key; te lang 400; ongeldige tekens 400.
- [ ] **Step 3:** `handleReceiptDate` in de hook; `ColumnSelect` **Receipt date** naast Delivery date met lege optie `None` (`__none__` → `''`). Info: "Date used to place received quantity below the axis. If empty, the delivery date is used."
- [ ] **Step 4:** `npm test -- server/services/RccpSettingsService.test.js src/components/rccp/useRccpSettingsFormHandlers.test.js`

---

### Task 2: PO-segmenten in analysis-payload

**Files:**
- Create: `server/utils/rccpPoRow.js` (gedeelde pick/qty/date/slots)
- Create: `server/utils/rccpPoSegments.js`
- Create: `server/utils/rccpPoSegments.test.js`
- Modify: `server/utils/isoWeek.js` — exporteer `isIsoWeekInWindow`
- Modify: `server/services/RccpAnalysisService.js` — één snapshot, `time('rccp_po_segments')`, merge op chart-punten; `isOpen` op measureRows
- Modify: `server/services/RccpAnalysisService.test.js` — vendorfilter-assert via `buildPoSegments`

**Interfaces:**
- Consumes: `poRows`, `config` (incl. `receiptDateColumnKey`), `window`, `{ now, vendorAccount }`
- Produces: per weekpunt `segmentsAbove: [{ poNumber, qty, status: 'open'|'received', late }]`, `segmentsBelow: [{ poNumber, qty, status: 'received', late: false }]`

- [ ] **Step 1:** Leaf-helpers: `toNumber`, `pickValue`, `resolveLineMeasureQty`, `isHeaderOnlyMeasure`, `lineDateValue`, `collectDateSlots`. Analysis gebruikt deze i.p.v. lokale kopieën.
- [ ] **Step 2:** `buildPoSegments`: som per `recordKey` × week × status; `qty <= 0` skip; received-onder eigen ontvangstweek (fallback gepland); clip op `periods`; late = open en geplande ISO-week strikt vóór `now`; sorteer `poNumber` `localeCompare`, per PO received dan open; header-only via slots; vendorfilter.
- [ ] **Step 3:** `analyze()`: `time('rccp_po_segments', () => buildPoSegments(poRows, config, window, { now: new Date(), vendorAccount: effectiveVendor }))` mergen op `buildChartSeries`-punten.
- [ ] **Step 4:** Tests: received-onder andere week; lege receipt → onder = gepland; open W-1 `late: true`; huidige week `late: false`; clip; vendorfilter geen vreemde `poNumber`.

---

### Task 3: Grafiek — stack-bars, Today, te-laat-kader

**Files:**
- Create: `src/components/rccp/rccpPoStack.js`
- Create: `src/components/rccp/rccpPoStack.test.js`
- Create: `src/components/rccp/RccpPoStackBar.jsx`
- Create: `src/components/rccp/RccpPoSegmentTooltip.jsx`
- Modify: `src/components/rccp/RccpChartMatrixPanel.jsx`
- Modify: `src/config/version.js` — patch bump
- Modify: `src/config/devTestItems.js`

**Interfaces:**
- Consumes: `chart[].segmentsAbove/Below`, `measureRows.isOpen/isDelivered`, `periods`
- Produces: custom Bars `__stackAbove` / `__stackBelow`; `todayLineX`; tooltip-tekst Engels

- [ ] **Step 1:** `lightenHex`, `todayLineX(periods, now)` (`null` buiten venster; anders `RCCP_CHART_Y_AXIS_WIDTH + (index + (isoWeekday - 0.5) / 7) * RCCP_WEEK_COL_WIDTH`), `stackRectLayout` (received tegen de as).
- [ ] **Step 2:** `RccpPoStackBarAbove` / `Below` als module-level `shape`; geen hooks, geen Fluent Tooltip. Late: `stroke #D13438`, `strokeWidth 2`. `barSize = Math.round(RCCP_WEEK_COL_WIDTH * 0.8)` (54).
- [ ] **Step 3:** Eén Recharts `Tooltip` `content={RccpPoSegmentTooltip}`; hover-segment via payload-callback in panel `useCallback`. Today SVG-overlay in het panel, geen `ReferenceLine`. Open/delivered niet als gewone Bar; `__overloaded__` fill niet op stacks.
- [ ] **Step 4:** Panel onder 300 regels. `APP_VERSION` patch. `devTestItems` voor `/rccp`.

---

## Self-review

1. Spec coverage: settings, payload, shape, Today, late, vendorfilter, geen nieuwe route/SQL — taken 1–3.
2. Placeholders: geen TBD.
3. Types: `receiptDateColumnKey`, `segmentsAbove` / `segmentsBelow`, `status` `'open'|'received'`, `late` boolean.

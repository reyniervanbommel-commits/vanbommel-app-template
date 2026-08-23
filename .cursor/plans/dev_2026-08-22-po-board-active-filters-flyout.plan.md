# PO-board active filters flyout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Staff on the PO board can open a right-side Drawer that lists and edits all active column filters and conditional-formatting rule sets, triggered by a filter icon (with a presence dot) next to the hamburger in the table control header.

**Architecture:** Derive active rules in a thin hook from existing `filterByColumn` and format-rule maps. Mount a Fluent OverlayDrawer as a sibling of the board table in `PurchaseOrdersPageContent` (outside the overflow wrapper). TableControls only opens the drawer. Compact editors reuse ValuePicker, color-filter hook, and FormatRulesSection. Persist via the same apply/clear/save handlers as the column menus. Unique values and editors mount only for the one expanded row.

**Tech Stack:** React 18, Fluent UI v9 (`Drawer`, `Button`, `Field`, `Text`), `@fluentui/react-icons`, Vitest + Testing Library, existing PO boardView / pageModel.

**Spec:** `docs/specs/2026-08-22-po-board-active-filters-flyout-design.md`

## Global Constraints

- English UI only (`Show active filters and formatting`, `Active filters & formatting`, `No active filters`, `No conditional formatting`, `Header columns`, `Line columns`, `Clear`).
- No `<Tooltip>` in lists; use `title` / `aria-label`. No `Menu`/`Popover` per collapsed row (Clear = `Button`).
- No new API routes, no SQL, no extra `apiRequest`. No sort/grouping in the flyout. No adding rules on inactive columns.
- Components stay under 300 lines. Hook returns at most `hasActive`, `filters`, `formatRules` (no JSX; open/`expandedKey` stay in the flyout).
- TableControls extra props: `hasActive`, `onOpenFlyout` only (still under 10 props).
- OTAP local-first: do **not** `git commit` or `git push` unless the user explicitly asks. Commit steps below are optional.
- Version: one patch bump in the last task (`src/config/version.js`, currently `v1.51.24` → `v1.51.25`).
- `npm test` via Vitest. Do not start a new server; `npm run dev:all` may already be running on 5178.

## File map

Create:

- `src/components/supplier/usePurchaseOrdersActiveRules.js`
- `src/components/supplier/usePurchaseOrdersActiveRules.test.js`
- `src/components/supplier/PurchaseOrdersActiveRulesFlyout.jsx`
- `src/components/supplier/PurchaseOrdersActiveFiltersList.jsx`
- `src/components/supplier/PurchaseOrdersActiveFormatRulesList.jsx`
- `src/components/supplier/PurchaseOrdersActiveFilterEditor.jsx`
- `src/components/supplier/PurchaseOrdersActiveFormatEditor.jsx`
- `src/components/supplier/PurchaseOrdersTableControls.test.jsx`

Modify:

- `src/components/supplier/purchaseOrderBoardLayout.js` — shared control-column width `116`
- `src/components/supplier/PurchaseOrdersTableControls.jsx` — icon + dot
- `src/components/supplier/purchaseOrdersBoardRowsStyles.js` — same width
- `src/hooks/useSequentialStickyColumns.js` — fallback `CONTROL_COLUMN_WIDTH` = 116
- `src/components/supplier/PurchaseOrdersBoardHeaderRow.jsx`
- `src/components/supplier/PurchaseOrdersBoardTableHeader.jsx`
- `src/components/supplier/PurchaseOrdersBoardTable.jsx`
- `src/components/supplier/PurchaseOrdersPageContent.jsx` — mount Drawer
- `src/config/version.js`
- `src/config/devTestItems.js`

Do not modify `PurchaseOrderColumnFilterMenu.jsx` except if a test proves outside-click does not close it (then a one-line close signal; YAGNI until then).

---

### Task 1: Active-rules hook (TDD)

**Files:**
- Create: `src/components/supplier/usePurchaseOrdersActiveRules.js`
- Test: `src/components/supplier/usePurchaseOrdersActiveRules.test.js`

**Interfaces:**
- Consumes: `isColumnFilterActive`, `isColumnFormatRuleSetActive`, `normalizeColumnFormatRuleSet` (from `purchaseOrderColumnFilterMenuConstants` / `columnFormatRuleUtils`), `COLOR_FILTER_OPERATOR` from `src/utils/tableViewFilterUtils.js`
- Produces:

```js
/**
 * @typedef {'header' | 'line'} ActiveRuleScope
 * @typedef {{
 *   id: string,
 *   columnKey: string,
 *   columnLabel: string,
 *   scope: ActiveRuleScope,
 *   column: object,
 *   summary: string,
 *   filter?: object,
 *   ruleSet?: object,
 * }} ActiveRuleItem
 *
 * usePurchaseOrdersActiveRules({
 *   headerColumns: object[],
 *   lineColumns: object[],
 *   filterByColumn: object,
 *   headerColumnFormatRules: object,
 *   lineColumnFormatRules: object,
 *   datePeriodDisplayModes?: object,
 * }) => ({
 *   hasActive: boolean,
 *   filters: { header: ActiveRuleItem[], line: ActiveRuleItem[] },
 *   formatRules: { header: ActiveRuleItem[], line: ActiveRuleItem[] },
 * })
 *
 * summarizeColumnFilter(column, filter) => string
 * summarizeFormatRuleSet(ruleSet) => string
 */
```

Item `id` = `` `${scope}:${column.key}` ``. `columnLabel` = `column.label || column.key`. Keep table order. Skip columns that are not active.

- [ ] **Step 1: Write the failing tests**

```js
import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  summarizeColumnFilter,
  summarizeFormatRuleSet,
  usePurchaseOrdersActiveRules,
} from './usePurchaseOrdersActiveRules';

const headerColumns = [
  { key: 'vendor', label: 'Vendor', dataType: 'text' },
  { key: 'status', label: 'Status', dataType: 'status' },
];
const lineColumns = [
  { key: 'qty', label: 'Qty', dataType: 'number' },
];

describe('summarizeColumnFilter', () => {
  it('summarizes contains filters', () => {
    expect(summarizeColumnFilter(
      { key: 'vendor', dataType: 'text' },
      { operator: 'contains', value: 'Acme' },
    )).toBe('contains Acme');
  });

  it('summarizes color filters without scanning rows', () => {
    expect(summarizeColumnFilter(
      { key: 'status', dataType: 'status' },
      { operator: 'colorIs', colors: ['#c02f64', '#6161ff'] },
    )).toBe('2 colors');
  });
});

describe('summarizeFormatRuleSet', () => {
  it('counts rules', () => {
    expect(summarizeFormatRuleSet({
      target: 'cell',
      rules: [{ op: '=', value: 'Open', color: '#c02f64' }],
    })).toBe('1 rule');
  });
});

describe('usePurchaseOrdersActiveRules', () => {
  it('returns empty groups and hasActive false when nothing is active', () => {
    const { result } = renderHook(() => usePurchaseOrdersActiveRules({
      headerColumns,
      lineColumns,
      filterByColumn: {},
      headerColumnFormatRules: {},
      lineColumnFormatRules: {},
    }));
    expect(result.current.hasActive).toBe(false);
    expect(result.current.filters).toEqual({ header: [], line: [] });
    expect(result.current.formatRules).toEqual({ header: [], line: [] });
  });

  it('splits header vs line filters and format rules', () => {
    const { result } = renderHook(() => usePurchaseOrdersActiveRules({
      headerColumns,
      lineColumns,
      filterByColumn: {
        vendor: { operator: 'contains', value: 'Acme' },
        qty: { operator: 'gt', value: '10' },
      },
      headerColumnFormatRules: {
        status: { target: 'row', rules: [{ op: '=', value: 'Open', color: '#c02f64' }] },
      },
      lineColumnFormatRules: {},
    }));
    expect(result.current.hasActive).toBe(true);
    expect(result.current.filters.header.map((item) => item.columnKey)).toEqual(['vendor']);
    expect(result.current.filters.line.map((item) => item.columnKey)).toEqual(['qty']);
    expect(result.current.formatRules.header.map((item) => item.columnKey)).toEqual(['status']);
    expect(result.current.formatRules.line).toEqual([]);
  });

  it('ignores empty oneOf filters', () => {
    const { result } = renderHook(() => usePurchaseOrdersActiveRules({
      headerColumns,
      lineColumns,
      filterByColumn: { vendor: { operator: 'oneOf', value: [] } },
      headerColumnFormatRules: {},
      lineColumnFormatRules: {},
    }));
    expect(result.current.hasActive).toBe(false);
    expect(result.current.filters.header).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL (module missing)**

Run: `npx vitest run src/components/supplier/usePurchaseOrdersActiveRules.test.js`

- [ ] **Step 3: Implement the hook**

Keep `useMemo` for `filters`, `formatRules`, and `hasActive`. No `useEffect`. Walk `headerColumns` then `lineColumns` in array order. For color filters use `COLOR_FILTER_OPERATOR` and `filter.colors.length`. For format summaries use `normalizeColumnFormatRuleSet(ruleSet)?.rules?.length`.

- [ ] **Step 4: Re-run tests — expect PASS**

- [ ] **Step 5: Commit (only if the user asked)**

```bash
git add src/components/supplier/usePurchaseOrdersActiveRules.js src/components/supplier/usePurchaseOrdersActiveRules.test.js
git commit -m "feat: derive active PO board filters and formatting for overview flyout"
```

---

### Task 2: Filter icon, presence dot, control-column width

**Files:**
- Modify: `src/components/supplier/purchaseOrderBoardLayout.js`
- Modify: `src/components/supplier/PurchaseOrdersTableControls.jsx`
- Modify: `src/components/supplier/purchaseOrdersBoardRowsStyles.js` (controlCell 92px)
- Modify: `src/hooks/useSequentialStickyColumns.js` (`CONTROL_COLUMN_WIDTH` 58 → 116 so first-paint sticky matches CSS)
- Test: `src/components/supplier/PurchaseOrdersTableControls.test.jsx`

**Interfaces:**
- Consumes: none from Task 1
- Produces: TableControls props `{ hasActive = false, onOpenFlyout }` plus existing props. `aria-label` / `title` = `hasActive ? 'Show active filters and formatting (active)' : 'Show active filters and formatting'`.

Add to `purchaseOrderBoardLayout.js`:

```js
export const PURCHASE_ORDER_BOARD_CONTROL_COLUMN_WIDTH_PX = 116;
export const purchaseOrderBoardControlColumnWidth = `${PURCHASE_ORDER_BOARD_CONTROL_COLUMN_WIDTH_PX}px`;
```

Use that string in TableControls `controlHeaderCell` and rows `controlCell`. Import the px number in `useSequentialStickyColumns.js`.

Icon: `Filter20Regular`. Dot: a `span` after the icon, `aria-hidden`, only if `hasActive`. Tokens: `tokens.colorBrandForeground1` (or brand background) for the fill, ~6px circle. No `<Tooltip>`. `onClick` calls `onOpenFlyout?.()`; omit the button if `onOpenFlyout` is not a function (tests/RCCP must not break — this component is PO-only).

Existing props stay as they are (7). New: 2. Total 9.

- [ ] **Step 1: Write TableControls tests**

Render with `@testing-library/react` + Fluent `FluentProvider`. Assert:
- button `Show active filters and formatting` present
- no `(active)` in the name when `hasActive` is false
- name includes `(active)` when `hasActive` is true
- click calls `onOpenFlyout`

- [ ] **Step 2: Run test — expect FAIL**

Run: `npx vitest run src/components/supplier/PurchaseOrdersTableControls.test.jsx`

- [ ] **Step 3: Implement icon + width**

Place the filter button immediately after the hamburger `Menu` in the toolbar.

- [ ] **Step 4: Re-run tests — expect PASS**

- [ ] **Step 5: Commit (only if the user asked)**

```bash
git add src/components/supplier/purchaseOrderBoardLayout.js src/components/supplier/PurchaseOrdersTableControls.jsx src/components/supplier/PurchaseOrdersTableControls.test.jsx src/components/supplier/purchaseOrdersBoardRowsStyles.js src/hooks/useSequentialStickyColumns.js
git commit -m "feat: add PO table filter-overview icon and widen control column"
```

---

### Task 3: Drawer shell + lists (clear, no editors yet)

**Files:**
- Create: `src/components/supplier/PurchaseOrdersActiveRulesFlyout.jsx`
- Create: `src/components/supplier/PurchaseOrdersActiveFiltersList.jsx`
- Create: `src/components/supplier/PurchaseOrdersActiveFormatRulesList.jsx`

**Interfaces:**
- Consumes: `filters` / `formatRules` / `hasActive` shape from Task 1
- Produces:

```js
// PurchaseOrdersActiveRulesFlyout
{
  open: boolean,
  onClose: () => void,
  filters: { header: ActiveRuleItem[], line: ActiveRuleItem[] },
  formatRules: { header: ActiveRuleItem[], line: ActiveRuleItem[] },
  expandedKey: string | null,
  onToggleExpanded: (key: string) => void,
  onClearFilter: (item: ActiveRuleItem) => void,
  onClearFormatRules: (item: ActiveRuleItem) => void,
  filterEditor?: React.ReactNode,
  formatEditor?: React.ReactNode,
}

// expanded list key: `filter:${item.id}` or `format:${item.id}`
```

Follow `src/components/rccp/RccpSettingsFlyout.jsx`: `Drawer` `position="end"` `size="medium"`, `DrawerHeader` + `DrawerHeaderTitle` + close `Dismiss24Regular` `aria-label="Close"`, `DrawerBody` **only when `open`**. No `DrawerFooter`. Title: `Active filters & formatting`.

Each list: section heading `Filters` / `Conditional formatting`. Subhead `Header columns` / `Line columns` omitted when that array is empty. Empty section: `<Text>No active filters</Text>` / `No conditional formatting`.

Collapsed row (`React.memo`): column label, summary `Text`, `Button` `appearance="subtle"` text `Clear`. Expand chevron `Button` toggles `expandedKey`. When expanded, render `filterEditor` / `formatEditor` children **passed from the parent** (Task 3 can render `null` placeholders). No Tooltip. No Menu.

- [ ] **Step 1: Add a flyout render test** (new file `PurchaseOrdersActiveRulesFlyout.test.jsx`)

With `open` true, empty groups: find `No active filters` and `No conditional formatting`. With one header filter item: find label + summary + `Clear`; click Clear calls `onClearFilter` with that item.

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement Drawer + lists** (split files; each under 300 lines; `useCallback` for row handlers; no inline functions in `.map` — extract `ActiveRuleRow`)

- [ ] **Step 4: Re-run — expect PASS**

- [ ] **Step 5: Commit (only if the user asked)**

```bash
git add src/components/supplier/PurchaseOrdersActiveRulesFlyout.jsx src/components/supplier/PurchaseOrdersActiveFiltersList.jsx src/components/supplier/PurchaseOrdersActiveFormatRulesList.jsx src/components/supplier/PurchaseOrdersActiveRulesFlyout.test.jsx
git commit -m "feat: add PO active-rules overview drawer"
```

---

### Task 4: Compact filter editor (lazy unique values)

**Files:**
- Create: `src/components/supplier/PurchaseOrdersActiveFilterEditor.jsx`
- Test: `src/components/supplier/PurchaseOrdersActiveFilterEditor.test.jsx`

**Interfaces:**
- Consumes: `item.column`, `item.filter`, `applyColumnFilter(columnKey, patch)`, `setColumnColorFilter(columnKey, colors)`, `items`, `headerColumns` (as `referenceColumns`), `filterByColumn`, `datePeriodDisplayModes`, `headerColumnFormatRules` + `lineColumnFormatRules` merged for color-filter row colors
- Produces: editor that does **not** unmount the flyout on Apply

Reuse:
- `getDraftFromFilter` / `isDateColumn` / `isNumberColumn`
- `PurchaseOrderColumnFilterValuePicker`
- `usePurchaseOrderColorFilter`
- `PurchaseOrderColumnColorFilterSection` with styles from `usePurchaseOrderColumnFilterMenuStyles()` (do not copy the column menu; do not invent a second swatch row)
- `getUniqueColumnValues` inside `useMemo` with guard `if (isDate) return []` — this component only mounts when expanded, so the scan does not run for collapsed rows
- Operator `Field` + `Dropdown` with `TEXT_FILTER_OPERATORS` / `DATE_FILTER_OPERATORS` / `NUMBER_FILTER_OPERATORS` from `src/hooks/usePurchaseOrderTableView.js` (re-exported there) or `src/utils/tableViewFilterUtils.js`
- Apply `Button` calls `applyColumnFilter(item.columnKey, { operator, value, secondaryValue })` via `startTransition` like `usePurchaseOrderSortFilterActions` — **do not** close the flyout
- Wrap inputs in `Field` with `maxWidth` on the field container (~520px)

Do not import `usePurchaseOrderSortFilterActions` (it closes the popover).

- [ ] **Step 1: Test** — render with a text column + contains filter; change value; click Apply; expect `applyColumnFilter` called with `{ operator: 'contains', value: 'Beta', secondaryValue: '' }`. Mock `getUniqueColumnValues` is unnecessary if `items=[]`.

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement editor**

- [ ] **Step 4: Re-run — expect PASS**

- [ ] **Step 5: Commit (only if the user asked)**

```bash
git add src/components/supplier/PurchaseOrdersActiveFilterEditor.jsx src/components/supplier/PurchaseOrdersActiveFilterEditor.test.jsx
git commit -m "feat: edit active PO column filters from the overview flyout"
```

---

### Task 5: Compact format-rules editor

**Files:**
- Create: `src/components/supplier/PurchaseOrdersActiveFormatEditor.jsx`
- Test: `src/components/supplier/PurchaseOrdersActiveFormatEditor.test.jsx`

**Interfaces:**
- Consumes: `item.columnKey`, `item.ruleSet`, `item.scope`, `onSetColumnFormatRules(columnKey, ruleSet)` (header vs line chosen by parent), `referenceColumns`
- Reuse: `useColumnFormatRulesMenuDraft({ open: true, columnFormatRuleSet: item.ruleSet, onPersist })`, `useColumnFormatRulesMenuActions`, `PurchaseOrderColumnFormatRulesSection`, `useAppToast` for `Saving conditional formatting failed.` / `Clearing conditional formatting failed.`

`onPersist` = `async (ruleSet) => { try { await onSetColumnFormatRules(item.columnKey, ruleSet); } catch (err) { notifyError(err?.message || 'Saving conditional formatting failed.'); } }`

Parent Clear on the collapsed row calls `onSetColumnFormatRules(key, null)` (same as `handleClearFormatRules`).

- [ ] **Step 1: Test** — mock `onSetColumnFormatRules`; render with one rule; the FormatRulesSection is visible (look for existing English copy in that section, e.g. target `Cell` / `Row`). Keep the test shallow: assert the section mounts without throwing.

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement** (`open: true` because this component only exists when expanded)

- [ ] **Step 4: Re-run — expect PASS**

- [ ] **Step 5: Commit (only if the user asked)**

```bash
git add src/components/supplier/PurchaseOrdersActiveFormatEditor.jsx src/components/supplier/PurchaseOrdersActiveFormatEditor.test.jsx
git commit -m "feat: edit active PO conditional formatting from the overview flyout"
```

---

### Task 6: Wire page + prop drill + version + DEV checklist

**Files:**
- Modify: `src/components/supplier/PurchaseOrdersPageContent.jsx`
- Modify: `src/components/supplier/PurchaseOrdersBoardTable.jsx` — add optional `activeRulesControls`
- Modify: `src/components/supplier/PurchaseOrdersBoardTableHeader.jsx`
- Modify: `src/components/supplier/PurchaseOrdersBoardHeaderRow.jsx` — pass into TableControls
- Modify: `src/config/version.js` (`v1.51.24` → `v1.51.25`)
- Modify: `src/config/devTestItems.js`

**Interfaces:**
- PageContent owns `const [activeRulesOpen, setActiveRulesOpen] = useState(false)`. The flyout owns `expandedKey` internally (useState, max one). Do not lift `expandedKey` to PageContent.
- `usePurchaseOrdersActiveRules({ headerColumns: data.columns, lineColumns: data.lineColumns, filterByColumn: boardView.filterByColumn, headerColumnFormatRules: formatting.headerColumnFormatRules, lineColumnFormatRules: formatting.lineColumnFormatRules, datePeriodDisplayModes: tableContext.datePeriodDisplayModes })`
- `onClearFilter`: `boardView.clearColumnFilter(item.columnKey)` (header and line share `filterByColumn`)
- `onClearFormatRules`: `item.scope === 'line' ? pageModel.saveLineColumnFormatRules(item.columnKey, null) : pageModel.saveHeaderColumnFormatRules(item.columnKey, null)`
- Filter editor: `boardView.applyColumnFilter`, `boardView.setColumnColorFilter`, `items: pageModel.orders`
- Format editor: same save functions as Clear
- Mount Drawer **outside** `styles.tableRegion` / `BoardSplitView` (sibling next to `RemarksPanel`) so overflow does not clip. Fluent Drawer still portals; keep it out of the `<table>`.
- Pass `activeRulesControls` via `useMemo` / `useCallback` so `memo(PurchaseOrdersBoardTable)` does not break: `onOpenFlyout` = `useCallback(() => setActiveRulesOpen(true), [])`, controls object memoized on `[hasActive, onOpenFlyout]`.
- `onOpenChange`: if `!data.open` then `setActiveRulesOpen(false)`.

`devTestItems.js` append:

```js
{
  id: 'po-active-rules-flyout',
  title: 'PO table — active filters & formatting flyout',
  checks: [
    'Filter icon sits next to the hamburger in the PO table header',
    'A presence dot appears only when a filter or formatting rule set is active',
    'Clicking the icon opens a right-side flyout titled Active filters & formatting',
    'Active header and line filters/rules are listed and can be cleared or edited',
    'The table does not get extra API calls while the flyout is closed',
  ],
}
```

If `PurchaseOrdersBoardTable.test.jsx` constructs the table, give `activeRulesControls` a default of `undefined` so existing tests pass.

- [ ] **Step 1: Add a HeaderRow test** in `src/components/supplier/PurchaseOrdersBoardHeaderRow.test.jsx` (create if missing): render the row with `activeRulesControls={{ hasActive: true, onOpenFlyout }}` and a minimal `columns`/`filterByColumn` stub; assert the filter-overview button is in the document and click calls `onOpenFlyout`. Do not add a PageContent test.

- [ ] **Step 2: Implement wiring + version + checklist**

- [ ] **Step 3: Run** `npx vitest run src/components/supplier/usePurchaseOrdersActiveRules.test.js src/components/supplier/PurchaseOrdersTableControls.test.jsx src/components/supplier/PurchaseOrdersActiveRulesFlyout.test.jsx src/components/supplier/PurchaseOrdersActiveFilterEditor.test.jsx src/components/supplier/PurchaseOrdersActiveFormatEditor.test.jsx src/components/supplier/PurchaseOrdersBoardTable.test.jsx`

Expected: PASS

- [ ] **Step 4: Browser AC (localhost already on 5178)** — click the filter icon on PO TABEL: empty states; with a column filter, dot + list + Clear; expand and apply; formatting Clear/edit. Confirm network tab: no new API on icon click while closed.

- [ ] **Step 5: After UI lands, run `ui-design-review` on the new flyout** (kwaliteitspoort: new Drawer).

- [ ] **Step 6: Commit (only if the user asked)**

```bash
git add src/components/supplier/PurchaseOrdersPageContent.jsx src/components/supplier/PurchaseOrdersBoardTable.jsx src/components/supplier/PurchaseOrdersBoardTableHeader.jsx src/components/supplier/PurchaseOrdersBoardHeaderRow.jsx src/config/version.js src/config/devTestItems.js
git commit -m "feat: wire PO active-rules flyout to the board header"
```

---

## Spec coverage

- Icon + hamburger position → Task 2
- Presence dot / aria-label → Task 2
- Right Drawer, Filters then Conditional formatting, header then line → Task 3
- Clear on collapsed row + one expanded editor → Tasks 3–5
- Same apply/save → Tasks 4–6
- No extra work when closed / unique values on expand → Tasks 3–4 (`DrawerBody` if open; editor only if expanded)
- Empty states → Task 3
- Staff only / no new routes → Task 6 (icon only on PO page)
- Version → Task 6
- Control column width sync + sticky fallback → Task 2
- Hook API slim → Task 1
- `devTestItems` → Task 6

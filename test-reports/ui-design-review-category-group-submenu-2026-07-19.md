# UI Design Review: Category / group column submenu

**Date**: 2026-07-19
**Reviewer**: Cursor Agent
**Mode**: light
**App URL**: http://localhost:5178 (dev server active; browser audit skipped — auth not exercised in this pass)
**Changed files**:
- `src/components/supplier/PurchaseOrderColumnGroupingSection.jsx`
- `src/components/supplier/PurchaseOrderColumnFilterMenuPanels.jsx`
- `src/components/supplier/purchaseOrderColumnFilterMenuStyles.js`
- `src/components/supplier/PurchaseOrderColumnFilterMenu.test.jsx`
- `src/config/version.js`

**Golden reference**: `PurchaseOrderColumnTextStylePane.jsx` + `purchaseOrderColumnFilterMenuStyles.js` (§6 column filter menu)

---

## Summary

| Category | Status | Notes |
|----------|--------|-------|
| Static — Fluent & tokens | PASS | v9 components, shared `ColorPalettePicker`, menu styles extended |
| Static — Forms & layout | PASS | `Field` for bar color; compact palette fits 240px sub-pane |
| Static — Overlays & pitfalls | PASS | No Dialog-in-Menu; English UI strings |
| Browser — visual consistency | SKIPPED | Static + unit tests only |
| Browser — console | SKIPPED | |

**Verdict**: GOEDGEKEURD

---

## Static findings

| # | Severity | File | Finding | Standard |
|---|----------|------|---------|----------|
| 1 | OK | `PurchaseOrderColumnGroupingSection.jsx` | Native `<input type="color">` replaced with `ColorPalettePicker` (`SELECTABLE_STATUS_COLORS`) | §1 tokens / shared color pattern |
| 2 | OK | `PurchaseOrderColumnGroupingSection.jsx` | Grouping + group-header sum use `Switch` rows (consistent with saved-view menu toggles) | §3 forms / overlay menus |
| 3 | OK | `PurchaseOrderColumnGroupingSection.jsx` | Sub-pane title moved inside component (matches Text style / format rules panes) | §6 golden reference |
| 4 | OK | `purchaseOrderColumnFilterMenuStyles.js` | Added `groupingSection`, `groupingToggleRow`, `groupingColorField` | §6 column menu |
| 5 | OK | Tests | 15/15 Vitest passing incl. palette + sum switch | — |

---

## Browser findings

| # | Severity | Check | Result | Notes |
|---|----------|-------|--------|-------|
| 1 | — | Sub-pane layout | SKIPPED | Unit tests cover menu open + submenu interaction |
| 2 | — | Palette swatch grid | SKIPPED | Same component as Text style pane |

**Screenshots**: not captured (light mode, static-only pass)

---

## Comparison with golden reference

| Aspect | Golden reference | This feature | Match |
|--------|------------------|--------------|-------|
| Sub-pane title | `PurchaseOrderColumnTextStylePane` | Inside grouping section | Yes |
| Color selection | `ColorPalettePicker` grid/compact | `layout="compact"` | Yes |
| Sub-pane width | 240px (`subPane`) | Unchanged | Yes |
| Toggle pattern | Switch in menu contexts | Switch rows for grouping + sum | Yes |

---

## Recommended fixes (priority order)

None — ship-ready from design perspective.

---

## Limitations

- [x] Auth: not tested in browser
- [x] Browser MCP not used — static review + Vitest
- [ ] Legacy bar colors outside palette display as nearest palette default until user picks a swatch

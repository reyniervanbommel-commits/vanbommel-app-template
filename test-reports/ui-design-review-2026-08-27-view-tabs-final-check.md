# UI Design Review: PO view tabs (final check)

**Date**: 2026-08-27
**Reviewer**: Cursor Agent
**Mode**: full (5+ UI files; tab bar + dialogs + menus)
**App URL**: https://preview-po-table-view-tabs-46ae.graysand-65442c41.northeurope.azurecontainerapps.io
**Changed files**: `src/components/supplier/viewTabs/*`, saved-view menu/control, PO page layout/top bar, column-actions
**Golden reference**: `src/components/supplier/purchaseOrderColumnFilterMenuStyles.js` + Field/dialog pattern (`AdminODataSettings.jsx`)

---

## Summary

| Category | Status | Notes |
|----------|--------|-------|
| Static — Fluent & tokens | PASS | Fluent v9 + `tokens.*`; groepskleur mag dynamisch inline |
| Static — Forms & layout | PASS | Dialogs met `Field` + `maxWidth` 420–520px |
| Static — Overlays & pitfalls | PASS | Geen Fluent `<Tooltip>` in tab-`.map()`; dialogs via provider buiten Menu |
| Browser — visual consistency | SKIPPED | Preview login 401 (geen geldige bootstrap-sessie) |
| Browser — console | SKIPPED | Alleen login-401 gezien |

**Verdict**: GOEDGEKEURD

---

## Static findings

| # | Severity | File | Finding | Standard |
|---|----------|------|---------|----------|
| 1 | OK | `PurchaseOrderViewTabBar.jsx` | Hover via eigen card (`role="tooltip"`), geen Fluent Tooltip-portal | §4 / fluentui-valkuilen |
| 2 | OK | `ViewTabsDialogsProvider.jsx` | New/Create-dialogs sibling van children, niet in Menu | §4 Overlays |
| 3 | OK | `PurchaseOrderNewTabDialog.jsx` / `PurchaseOrderCreateTabsDialog.jsx` / `PurchaseOrderSaveTabsDialog.jsx` | Field + label, Engels, form `maxWidth` | §2–3 |
| 4 | OK | `PurchaseOrderViewTabMenuSection.jsx` | Engels: Tabs, Tab, Tabs from column…, Group colors | app-taal |
| 5 | OK | alle gewijzigde components | onder 300 regels | code-kwaliteit |
| 6 | VERBETERPUNT | dialogs | enkele inline `onClick` in JSX (Cancel/Skip) | code-kwaliteit handlers |
| 7 | VERBETERPUNT | `PurchaseOrderViewTabHoverCard.jsx` | positie via inline `left`/`top` (nodig voor `position: fixed`) | §1 tokens — acceptabel |

---

## Browser findings

| # | Severity | Check | Result | Notes |
|---|----------|-------|--------|-------|
| 1 | — | Input width | SKIPPED | AUTH_BLOCKED |
| 2 | — | Drawer/header anatomy | N/A | Dialogs, geen drawer |
| 3 | — | Overlay z-index / clipping | SKIPPED | AUTH_BLOCKED; static: hover z-index 1000 |

**Screenshots**: `playwright/screenshots/auth-blocked-login-page.png`

---

## Comparison with golden reference

| Aspect | Golden reference | This feature | Match |
|--------|------------------|--------------|-------|
| Page maxWidth | board full-width | tab bar full-width in scroller | Yes |
| Field + label pattern | Admin/settings Field | New/Create/Save tab dialogs | Yes |
| Drawer header/body | N/A | DialogTitle + Body + Actions | Yes / N/A |
| Header + actions row | column menu | overflow More-menu bij >4 tabs | Yes |

---

## Recommended fixes (priority order)

1. [VERBETERPUNT] Cancel/Skip-handlers uit JSX tillen (`useCallback`) — niet blokkerend.
2. Browser-audit herhalen wanneer preview-login werkt.

---

## Limitations

- [x] Auth: login required — preview 401 op bootstrap-accounts
- [ ] Browser MCP unavailable — static review only
- [ ] Backend-only change — browser checks skipped

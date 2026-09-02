# UI Design Review: Bulk write-back background job (#295)

**Date**: 2026-09-02
**Reviewer**: Cursor Agent
**Mode**: full (AppLayout + 8 UI-bestanden)
**App URL**: http://localhost:5178 (draait **v1.52.126**, niet deze branch v1.53.3); preview timeout
**Changed files**: App.jsx, AppLayout, AppShellHeader, BulkWriteBackJobBadge, BulkEditDialog, FailedRows, HeaderCellContent, WriteBackCell
**Golden reference**: `src/components/layout/AppLayout.jsx` (header-slot) + `PurchaseOrderBulkEditDialog.jsx` (confirm Dialog)

---

## Summary

| Category | Status | Notes |
|----------|--------|-------|
| Static — Fluent & tokens | PASS | tokens, makeStyles, geen Fluent v8 |
| Static — Forms & layout | PASS | Confirm-dialoog is geen form; Inputs in cellen hebben aria-label |
| Static — Overlays & pitfalls | PASS | Geen Tooltip in rijen; native `title`; Dialog niet in Menu |
| Browser — visual consistency | SKIPPED | Localhost is andere versie; preview niet bereikbaar |
| Browser — console | SKIPPED | Zelfde beperking |

**Verdict**: GOEDGEKEURD

---

## Static findings

| # | Severity | File | Finding | Standard |
|---|----------|------|---------|----------|
| 1 | OK | `BulkWriteBackJobBadge.jsx` | Badge in header-slot naast avatar; Engels; D365-logo via bestaand icoon | §2 App shell |
| 2 | OK | `PurchaseOrderBulkEditFailedRows.jsx` | Native `title` i.p.v. Tooltip in tabelrijen | §5 Tooltip |
| 3 | OK | `PurchaseOrderWriteBackCell.jsx` | Spinner/status via Input `contentAfter` (blijft in de cel) | overflow hidden op board-cellen |
| 4 | VERBETERPUNT | `PurchaseOrderWriteBackCell.jsx` (280) | ≥250 regels; datumhelpers nog in het bestand | code-kwaliteit 250 |
| 5 | VERBETERPUNT | `PurchaseOrderHeaderCellContent.jsx` (252) | ≥250 regels | code-kwaliteit 250 |
| 6 | VERBETERPUNT | `BulkWriteBackJobContext.jsx` (277) | Provider nadert 300 | code-kwaliteit 250 |

---

## Browser findings

| # | Severity | Check | Result | Notes |
|---|----------|-------|--------|-------|
| 1 | | Input width | SKIPPED | Feature-UI niet geladen |
| 2 | | Drawer/header anatomy | N/A | Dialog, geen Drawer |
| 3 | | Overlay z-index / clipping | SKIPPED | |

**Screenshots**: `playwright/screenshots/ui-review-bulk-writeback-login.png` (login van andere lokale build)

---

## Comparison with golden reference

| Aspect | Golden reference | This feature | Match |
|--------|------------------|--------------|-------|
| Page maxWidth | N/A (board full-width) | Board + header badge | Yes |
| Field + label pattern | Admin forms | Cel-input met aria-label, geen Field (grid) | Yes / N/A |
| Drawer header/body | N/A | Dialog title/content/actions | Yes |
| Header + actions row | AppShellHeader | `endSlot` vóór theme/avatar | Yes |

---

## Recommended fixes (priority order)

1. [VERBETERPUNT] Split WriteBackCell datumhelpers bij de volgende wijziging.
2. [VERBETERPUNT] Context-provider onder 250 houden als er nog logica bij komt.

---

## Limitations

- [x] Auth: login required / feature-build niet op localhost
- [x] Browser MCP unavailable voor déze branch — static review only
- [ ] Backend-only change — browser checks skipped

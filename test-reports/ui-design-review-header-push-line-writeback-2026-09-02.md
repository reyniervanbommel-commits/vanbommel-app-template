# UI Design Review: Header-edit van gepushte D365-line-waarden

**Date**: 2026-09-02
**Reviewer**: Cursor Agent
**Mode**: standard (5+ UI-files; geen shell/theme — geen extra 375px-layoutrun)
**App URL**: https://preview-header-push-line-wri.graysand-65442c41.northeurope.azurecontainerapps.io
**Changed files**: `PurchaseOrderLinkedHeaderValue.jsx`, `PurchaseOrderWriteBackCell.jsx`, `PurchaseOrderHeaderCellContent.jsx`, `PurchaseOrderColumnHeader.jsx`, `PurchaseOrdersBoardHeaderRow.jsx`, `PurchaseOrdersPageContent.jsx`, plus bestaande `PurchaseOrderBulkEditDialog`
**Golden reference**: `PurchaseOrderWriteBackCell.jsx` (inline write-back) + `PurchaseOrderBulkEditDialog.jsx` (compacte bevestiging, §6 compact dialog)

---

## Summary

| Category | Status | Notes |
|----------|--------|-------|
| Static — Fluent & tokens | PASS | v9 `makeStyles` + `tokens.*` in nieuwe/gewijzigde cellen |
| Static — Forms & layout | PASS | Board-inline Input (geen Field) — bestaand write-back-patroon, geen admin-form |
| Static — Overlays & pitfalls | PASS | Geen Tooltip in `LinkedHeaderValue`; bulk-dialoog hergebruikt bestaande Dialog buiten de lijst |
| Browser — visual consistency | SKIPPED | Preview login faalde (`admin@example.com`) |
| Browser — console | SKIPPED | Alleen login-pagina gezien |

**Verdict**: GOEDGEKEURD

---

## Static findings

| # | Severity | File | Finding | Standard |
|---|----------|------|---------|----------|
| 1 | OK | `PurchaseOrderLinkedHeaderValue.jsx` | Inline write-back + `+N` Badge; Engelse aria-labels | §4 inline editor, app-taal |
| 2 | OK | `PurchaseOrderBulkEditDialog.jsx` (hergebruik) | "Update multiple rows?" / "This cell only" / "Apply to selected rows" — Engels | app-taal |
| 3 | OK | `PurchaseOrderWriteBackCell.jsx` | Tooltip alleen op fout-icoon (niet per-rij hover) — bestaand patroon | §5 Tooltip in lists |
| 4 | VERBETERPUNT | `PurchaseOrderHeaderCellContent.jsx` | 251 regels (waarschuwing ≥250); `#fff4ce` in makeStyles is bestaand changed-cell, niet nieuw | code-kwaliteit / §1 tokens |
| 5 | VERBETERPUNT | `PurchaseOrdersPage.jsx` | 292 regels, dicht tegen de 300-limiet | code-kwaliteit |

---

## Browser findings

| # | Severity | Check | Result | Notes |
|---|----------|-------|--------|-------|
| 1 | | Input width | SKIPPED | Auth |
| 2 | | Drawer/header anatomy | N/A | Geen nieuwe drawer |
| 3 | | Overlay z-index / clipping | SKIPPED | Bulk-dialoog niet interactief getest |

**Screenshots**: `playwright/screenshots/ui-review-header-push-line-writeback.png` (login-pagina)

---

## Comparison with golden reference

| Aspect | Golden reference | This feature | Match |
|--------|------------------|--------------|-------|
| Page maxWidth | n.v.t. (board cell) | Cel-editor in kolom | Yes |
| Field + label pattern | WriteBackCell zonder Field | Zelfde Input in header | Yes |
| Drawer header/body | n.v.t. | Bestaande bulk-Dialog | Yes / N/A |
| Header + actions row | D365-icoon op writable kolommen | Zelfde icoon via `showWriteBackIcon` | Yes |

---

## Recommended fixes (priority order)

Geen BLOCKER. Optioneel later: `PurchaseOrdersPage.jsx` onder 250 houden bij de volgende uitbreiding.

---

## Limitations

- [x] Auth: login required — `Email address or password is incorrect` op preview
- [ ] Browser MCP unavailable — static review only
- [ ] Backend-only change — browser checks skipped

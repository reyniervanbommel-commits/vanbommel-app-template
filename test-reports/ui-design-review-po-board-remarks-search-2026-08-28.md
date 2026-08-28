# UI Design Review: PO-board remarks search (#277)

**Date**: 2026-08-28
**Reviewer**: Cursor Agent
**Mode**: full (5+ UI-bestanden, kolommenu)
**App URL**: https://preview-po-board-remarks-sea.graysand-65442c41.northeurope.azurecontainerapps.io
**App versie**: v1.52.17
**Changed files**: kolommenu (FilterMenu, FilterSection, MainPane, ActiveFilterEditor, constants), remarks-hook
**Golden reference**: `purchaseOrderColumnFilterMenuStyles.js` / bestaand kolommenu

---

## Summary

| Category | Status | Notes |
|----------|--------|-------|
| Static — Fluent & tokens | PASS | Fluent v9, bestaande `makeStyles` / tokens |
| Static — Forms & layout | PASS | Filter-input volgt golden kolommenu (geen admin-Field) |
| Static — Overlays & pitfalls | PASS | Popover, geen Tooltip in rijen, Engels |
| Browser — visual consistency | PASS | Menu + hint + Apply/Clear; overlay niet achter header |
| Browser — console | PASS | Geen errors na login/filter |

**Verdict**: GOEDGEKEURD

---

## Static findings

| # | Severity | File | Finding | Standard |
|---|----------|------|---------|----------|
| 1 | OK | FilterSection / ActiveFilterEditor | Strings Engels (`contains`, `Apply`, `Clear`, hints) | app-taal |
| 2 | OK | FilterSection | Geen Tooltip in lijst; geen Dialog in Menu | §4 / valkuilen |
| 3 | VERBETERPUNT | FilterSection | Operator-knop blijft interactief bij één operator (`contains` only) | overlay / affordance |
| 4 | VERBETERPUNT | PurchaseOrderColumnFilterMenu.jsx | 294 regels (waarschuwing ≥250) | code-kwaliteit |
| 5 | OK | Filter-input | Geen Field-wrapper — zelfde patroon als overige kolomfilters | golden kolommenu |

---

## Browser findings

| # | Severity | Check | Result | Notes |
|---|----------|-------|--------|-------|
| 1 | OK | Input width | PASS | Filterveld in menu, niet viewport-breed |
| 2 | OK | Overlay anatomy | PASS | Filter / contains / hint / Apply+Clear |
| 3 | OK | Overlay clipping | PASS | Menu zichtbaar na horizontaal scrollen naar Remarks |
| 4 | OK | Geen sort/color/group op remarks | PASS | Geen “Sort A to Z”, geen Color in remarks-menu |
| 5 | OK | Dark mode | PASS | Theme-toggle; geen harde witte feature-panelen |
| 6 | OK | 375×667 | PASS / N/A | Board is desktop-first; horizontale scroll verwacht |

**Screenshots**: MCP-sessie `playwright/screenshots/ui-review-*.png` (buiten worktree-root van de MCP-server; niet gekopieerd naar git).

---

## Comparison with golden reference

| Aspect | Golden reference | This feature | Match |
|--------|------------------|--------------|-------|
| Page maxWidth | n.v.t. (kolommenu) | n.v.t. | N/A |
| Field + label pattern | Input + aria-label in menu | Zelfde + `searchHint` | Yes |
| Drawer header/body | n.v.t. | Popover | N/A |
| Header + actions row | Apply primary, Clear outline | Zelfde | Yes |

---

## Recommended fixes (priority order)

1. [VERBETERPUNT] Operator-knop visueel niet-klikbaar maken als er maar één operator is.
2. [VERBETERPUNT] `PurchaseOrderColumnFilterMenu.jsx` (294) in de gaten houden vóór 300.

---

## Limitations

- [x] Auth: sessie actief (DEV-account op preview)
- [ ] Browser MCP unavailable — static review only
- [ ] Backend-only change — browser checks skipped

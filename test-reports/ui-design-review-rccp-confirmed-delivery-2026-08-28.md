# UI Design Review: RCCP confirmed delivery date

**Date**: 2026-08-28
**Reviewer**: Cursor Agent
**Mode**: standard
**App URL**: https://preview-rccp-confirmed-deliv.graysand-65442c41.northeurope.azurecontainerapps.io
**Changed files**: `src/components/rccp/*` (matrix, chart, settings, KPIs, planning-date view) vs `origin/develop`
**Golden reference**: `RccpSettingsFlyout.jsx` + `RccpSettingsForm.jsx` (settings); dashboard matrix is the existing Capacity vs load table

---

## Summary

| Category | Status | Notes |
|----------|--------|-------|
| Static — Fluent & tokens | PASS | v9 imports; tokens in new toggle; hoverkaart heeft hardcoded hex (verbeterpunt) |
| Static — Forms & layout | PASS | Settings fields in Field + maxWidth 200px; matrix-labels zijn ToggleButtons, geen formuliervelden |
| Static — Overlays & pitfalls | PASS | Geen Fluent Tooltip in matrixrijen; Recharts Tooltip in de grafiek is geen lijst-portal |
| Browser — visual consistency | SKIPPED | Preview-login geweigerd (admin@example.com) |
| Browser — console | SKIPPED | Alleen login-pagina gezien |

**Verdict**: VERBETERPUNTEN

---

## Static findings

| # | Severity | File | Finding | Standard |
|---|----------|------|---------|----------|
| 1 | VERBETERPUNT | `RccpPoSegmentTooltip.jsx` | Hardcoded hex in makeStyles (`#ffffff`, `#323130`, `#D13438`) | §1 tokens |
| 2 | VERBETERPUNT | `RccpChartMatrixPanel.jsx` | Inline `style` voor chart-margin t.o.v. rijlabels | §1 makeStyles |
| 3 | VERBETERPUNT | `RccpPageContent.jsx` | 267 regels (≥250, onder 300) | structuur |
| 4 | OK | `RccpMatrixRowToggle.jsx` | ToggleButton subtle, tokens, Engelse aria-labels | §1 / app-taal |
| 5 | OK | `RccpSettingsDataFields.jsx` | Field + 200px slot, Engelse hint | §2 / §3 |

---

## Browser findings

| # | Severity | Check | Result | Notes |
|---|----------|-------|--------|-------|
| 1 | | Input width | SKIPPED | Auth |
| 2 | | Drawer/header anatomy | N/A | Settings-flyout niet geopend |
| 3 | | Overlay z-index / clipping | N/A | |

**Screenshots**: `playwright/screenshots/ui-review-rccp-confirmed-delivery.png` (login, sessie ongeldig)

---

## Comparison with golden reference

| Aspect | Golden reference | This feature | Match |
|--------|------------------|--------------|-------|
| Page maxWidth | Settings fields ~200px | ColumnSelect `slot` 200px | Yes |
| Field + label pattern | Field + rccpFieldLabel | Settings: ja; matrix-knoppen: ToggleButton | Yes / N/A |
| Drawer header/body | RccpSettingsFlyout | Ongewijzigd patroon | Yes |
| Header + actions row | Toolbar Refresh/Settings | Planning-switch verwijderd, keuze in matrix | Yes |

---

## Recommended fixes (priority order)

1. [VERBETERPUNT] Hoverkaart-kleuren naar Fluent tokens (`RccpPoSegmentTooltip.jsx`)
2. [VERBETERPUNT] Chart-margin via makeStyles i.p.v. inline style

---

## Limitations

- [x] Auth: login required — preview wees lokale testcredentials af
- [ ] Browser MCP unavailable — static review only
- [ ] Backend-only change — browser checks skipped

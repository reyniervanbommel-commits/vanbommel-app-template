# UI Design Review: BI-pagina — rechter flyout (Chart builder)

**Date**: 2026-07-22
**Reviewer**: Cursor Agent
**Mode**: standard (overlay/flyout) — Browser: skipped (static only, geen browser-MCP beschikbaar)
**App URL**: https://preview-bi-vendor-filter.graysand-65442c41.northeurope.azurecontainerapps.io
**Scope (in review)**:
- `src/components/bi/ChartBuilderFlyout.jsx` (shell/chrome)
- `src/components/bi/ChartBuilderPanel.jsx` (variant-router + page/flyout chrome)
- `src/components/bi/ChartBuilderFlyoutForm.jsx` (flyout-body)
- `src/components/bi/ChartBuilderFlyoutSection.jsx` (sectie-wrapper)

**Golden reference**: `src/components/rccp/RccpSettingsFlyout.jsx` (+ `RccpSettingsForm.jsx`) — UI_DESIGN_STANDARDS §4/§6

---

## Summary

| Category | Status | Notes |
|----------|--------|-------|
| Static — Fluent & tokens | PASS | v9-imports, `tokens.*`, geen hex, geen `!important` |
| Static — Forms & layout | PASS | Alle controls in `Field` + Engels label; 340px-container begrenst veldbreedte |
| Static — Overlays & pitfalls | FAIL | Geneste `.fui-*`-selectors; knopvolgorde afwijkend; custom `<aside>` i.p.v. `Drawer` |
| Static — Structure (≤300 regels) | FAIL | `ChartBuilderPanel.jsx` = 345 regels |
| Browser — visuele consistentie | SKIPPED | Geen browser-MCP in Cursor-sessie |
| Browser — console | SKIPPED | Idem |

**Verdict**: VERBETERPUNTEN (design) — met 1 losstaande code-kwaliteit **BLOCKER** (bestandslengte, pre-existing)

---

## Static findings

| # | Severity | File | Finding | Standard |
|---|----------|------|---------|----------|
| 1 | OK | alle 4 | Imports uitsluitend uit `@fluentui/react-components`; `makeStyles` op moduleniveau | §1 |
| 2 | OK | alle 4 | Kleuren/spacing via `tokens.*`, geen hardcoded hex, geen `!important` | §1 |
| 3 | OK | Flyout/Form | Elke `Dropdown`/`Input` in `Field` met label; alle UI-strings Engels | §3, app-taal |
| 4 | OK | Flyout | A11y: `aside` met `tabIndex=-1` + `aria-label`, focus-restore bij unmount, close-knop `aria-label`, secties `aria-labelledby` | §5/a11y |
| 5 | OK | Flyout | 340px-panel begrenst de (100%) veldbreedte — passend voor smal paneel | §2/§3 |
| 6 | VERBETERPUNT | `ChartBuilderPanel.jsx` (49–60), `ChartBuilderFlyoutSection.jsx` (28–29) | Geneste selectors op Fluent-internals (`.fui-Input__input`, `.fui-Input__underline`, `.fui-Dropdown`, `.fui-Input`) — breekbaar bij Fluent-versiewissel | §5 (pitfalls) |
| 7 | VERBETERPUNT | `ChartBuilderFlyout.jsx` (37–41) via `ChartBuilderPanel` (113–120) | Knopvolgorde: `Cancel` (secondary) links, `Save chart` (primary) rechts. Doc + golden reference plaatsen **primary links** | §4 (Drawer footer) |
| 8 | VERBETERPUNT | `ChartBuilderFlyout.jsx` | Custom `<aside>`-paneel i.p.v. Fluent `Drawer`/`DrawerHeader`/`DrawerBody`/`DrawerFooter`; acties in header i.p.v. footer | §4 (Drawer anatomy) |
| 9 | BLOCKER (code-kwaliteit) | `ChartBuilderPanel.jsx` | 345 regels > 300 (harde projectregel). Betreft vooral de **page-variant** JSX; pre-existing, niet door de vendor-filter-feature veroorzaakt | code-kwaliteit.mdc |

---

## Browser findings

| # | Severity | Check | Result | Notes |
|---|----------|-------|--------|-------|
| 1 | — | Input width | SKIPPED | Geen browser-MCP |
| 2 | — | Drawer/header anatomy | SKIPPED | Statisch beoordeeld (zie #8) |
| 3 | — | Overlay clipping | SKIPPED | Paneel is inline (sticky), niet overlay — clipping-risico laag |

**Screenshots**: n.v.t. (browser overgeslagen)

---

## Comparison with golden reference (`RccpSettingsFlyout.jsx`)

| Aspect | Golden reference | BI-flyout | Match |
|--------|------------------|-----------|-------|
| Overlay-type | Fluent `Drawer` (modal, position=end) | Custom `<aside>` (inline, sticky, duwt layout) | Nee (bewuste keuze) |
| Header/titel | `DrawerHeaderTitle` (statische titel) | Custom header met bewerkbaar naam-`Input` + close | Deels |
| Body scroll | `DrawerBody` scrollt | `body` met `overflowY:auto` | Ja |
| Footer + primary links | `DrawerFooter`, Save (primary) eerst | Acties in header, primary **rechts** | Nee |
| Field + label | `Field` + label | `Field` + label | Ja |
| Close-knop aria-label | Ja | Ja | Ja |

---

## Recommended fixes (priority order)

1. **[BLOCKER — code-kwaliteit]** Splits `ChartBuilderPanel.jsx` (345 → <300). Extraheer de page-variant secties (Details/Data/Appearance/Filters, regels ~145–344) naar een `ChartBuilderPageForm.jsx`, spiegelbeeld van het bestaande `ChartBuilderFlyoutForm.jsx`. `ChartBuilderPanel` blijft dan alleen de variant-router + chrome. (Pre-existing; blokkeert de huidige vendor-filter-feature niet.)
2. **[VERBETERPUNT]** Knopvolgorde gelijktrekken met de projectconventie/golden reference: primary (`Save chart`) links van secondary (`Cancel`) — zowel in de flyout-header-acties als in de page-variant footer (regels 336–341).
3. **[VERBETERPUNT]** Vervang geneste `.fui-*`-selectors door directe classes/props: styling van de naam-input (underline/brand) en de 100%-breedte van Dropdown/Input via eigen wrapper-classes i.p.v. tag-selectors op Fluent-internals.
4. **[VERBETERPUNT / documenteer]** Leg vast dat de BI-builder bewust een **inline side-panel** is (geen modale Drawer) — of lijn uit met de Drawer-anatomie (`DrawerHeader/Body/Footer`) voor consistentie met RCCP. Als inline bewust blijft: noteer als uitzondering in de standards.

---

## Limitations

- [x] Auth: niet getest (browser overgeslagen)
- [x] Browser-MCP niet beschikbaar in deze Cursor-sessie — alleen statische review + golden-reference vergelijking
- [ ] Backend-only change — n.v.t.

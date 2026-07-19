# UI Design Review: RCCP settings flyout

**Date**: 2026-07-19
**Reviewer**: Cursor Agent
**Mode**: standard (standalone — geen recente UI-wijzigingen in git diff)
**App URL**: http://localhost:5178/rccp
**Changed files**: Geen `src/` wijzigingen in git diff; review op expliciet verzoek van gebruiker
**Golden reference**: `src/components/rccp/RccpSettingsFlyout.jsx` + `src/components/rccp/RccpSettingsForm.jsx` (§6 — settings flyout is zelf de referentie)

---

## Summary

| Category | Status | Notes |
|----------|--------|-------|
| Static — Fluent & tokens | PASS | v9 imports, `makeStyles`, `tokens.*`; geen v8, geen hex in styles |
| Static — Forms & layout | PASS | Alle controls in `Field` met Engelse labels; `compactControl` 168px |
| Static — Overlays & pitfalls | PASS | Drawer header/body aanwezig; geen Tooltip in lists; geen Dialog in Menu |
| Browser — visual consistency | PASS | Flyout opent rechts, niet geclipt; compacte veldbreedtes |
| Browser — console | PASS | Geen JS-errors |

**Verdict**: VERBETERPUNTEN

---

## Static findings

| # | Severity | File | Finding | Standard |
|---|----------|------|---------|----------|
| 1 | OK | `RccpSettingsFlyout.jsx` | `DrawerHeader` + `DrawerHeaderTitle` + close-knop met `aria-label="Close settings"` | §4 |
| 2 | OK | `RccpSettingsFlyout.jsx` | `position="end"`, `size="medium"` | §4 |
| 3 | OK | `RccpSettingsForm.jsx` | Alle `Input`/`Select` in `Field`; UI-strings Engels | §3, app-taal |
| 4 | OK | `RccpSettingsForm.jsx` | Flyout-variant met `compactControl` 168px voor korte velden | §2 |
| 5 | OK | `RccpQuantityMeasuresEditor.jsx` | Geen Fluent `Tooltip` in `.map()`; delete gebruikt `aria-label` | §5 |
| 6 | OK | Alle RCCP flyout-bestanden | Componenten ≤300 regels | code-kwaliteit |
| 7 | VERBETERPUNT | `RccpSettingsForm.jsx` | **Save settings** staat bovenaan `DrawerBody` i.p.v. in `DrawerFooter` | §4 Drawer anatomy |
| 8 | VERBETERPUNT | `RccpChartWeekRangesEditor.jsx` | In flyout (`compact`) gebruiken week/jaar-inputs `compactControl` (168px) i.p.v. `weekInput` (72px) | §2 narrow control |
| 9 | VERBETERPUNT | `RccpQuantityMeasuresEditor.jsx` + `ColorPalettePicker` | Inline kleurengrid (9 swatches) per measure/range maakt de drawer erg lang; Popover-trigger (`layout="popover"`) zou compacter zijn | §4 Popover vs Drawer body |
| 10 | VERBETERPUNT | `RccpQuantityMeasuresEditor.jsx` | In flyout-layout staat delete-knop onderaan de gestapelde rij, los van de velden — visueel losgekoppeld | §2 spacing |

---

## Browser findings

| # | Severity | Check | Result | Notes |
|---|----------|-------|--------|-------|
| 1 | OK | Input width | PASS | Dropdowns en number-fields ~168px, niet full-width |
| 2 | OK | Drawer/header anatomy | PASS | Titel "RCCP settings", close-knop zichtbaar |
| 3 | OK | Overlay z-index / clipping | PASS | Drawer overlayt pagina; header blijft bereikbaar |
| 4 | OK | Console | PASS | 0 errors |
| 5 | VERBETERPUNT | Save-knop positie | FAIL (convention) | Save bovenaan body; bij scrollen verdwijnt hij uit zicht |
| 6 | OK | Scrollgedrag | PASS | Lange inhoud scrollt in drawer body |

**Screenshots**: `playwright/screenshots/ui-review-rccp-settings-flyout.png`

---

## Comparison with golden reference

| Aspect | Golden reference | This feature | Match |
|--------|------------------|--------------|-------|
| Drawer header/body | `RccpSettingsFlyout.jsx` | Zelfde implementatie | Yes |
| Field + label pattern | `RccpSettingsForm.jsx` | Zelfde `Field` + `compactControl` | Yes |
| Flyout save placement | §4: optioneel `DrawerFooter` | Save in body-top | No |
| Narrow week inputs | `weekInput` 72px (page mode) | 168px in flyout mode | No |
| Header + actions row | Admin pattern: actions in header/footer | Save alleen in body | Partial |

---

## Recommended fixes (priority order)

1. **[VERBETERPUNT]** Verplaats Save + statusfeedback (`Spinner`, "Saved", error) naar `DrawerFooter` in `RccpSettingsFlyout.jsx`; houd form-only content in `DrawerBody`. Primary action links in footer (§4).

2. **[VERBETERPUNT]** In `RccpChartWeekRangesEditor.jsx`: gebruik `weekInput` (72px) ook wanneer `compact={true}`, of een aparte `weekInputFlyout`-klasse — week/jaar zijn korte waarden.

3. **[VERBETERPUNT]** Gebruik `ColorPalettePicker` met `layout="popover"` in flyout-variant (`compact`) zodat kleurkeuze niet 9 swatches per rij inline toont.

4. **[VERBETERPUNT]** In flyout-row layout van measures/ranges: plaats delete-knop rechts naast het laatste veld (flex row) i.p.v. onderaan de stack.

---

## Limitations

- [x] Auth: sessie actief (admin-user; Settings-knop zichtbaar)
- [ ] Browser MCP unavailable — niet van toepassing
- [x] Geen git UI-diff — review op expliciet component-scope

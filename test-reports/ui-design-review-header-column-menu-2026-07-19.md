# UI Design Review: Purchase Order column header menu

**Date**: 2026-07-19  
**Reviewer**: Cursor Agent  
**Mode**: standard (static + browser skipped)  
**App URL**: http://localhost:5178 (dev server running; browser MCP unavailable)  
**Scope**: Column header + `PurchaseOrderColumnFilterMenu` flyout (user request; no code changes)  
**Golden reference**: `src/components/supplier/purchaseOrderColumnFilterMenuStyles.js` + `PurchaseOrderColumnFormatRulesSection.jsx` (Field pattern)

---

## Summary

| Category | Status | Notes |
|----------|--------|-------|
| Static — Fluent & tokens | PASS | `@fluentui/react-components`, `makeStyles`, mostly `tokens.*` |
| Static — Forms & layout | FAIL | Filter controls without `Field`; MainPane >300 lines |
| Static — Overlays & pitfalls | PASS | Dialogs outside Popover; no Tooltip in list maps in menu files |
| Browser — visual consistency | SKIPPED | cursor-ide-browser MCP not available |
| Browser — console | SKIPPED | — |

**Verdict**: **VERBETERPUNTEN** (2 standaard-blockers + meerdere UX-verbeteringen; geen merge-stopper als blockers eerst worden opgepakt)

---

## Static findings

| # | Severity | File | Finding | Standard |
|---|----------|------|---------|----------|
| 1 | BLOCKER | `PurchaseOrderColumnFilterMenuMainPane.jsx` | Filter-`Dropdown` en `Input`-velden hebben geen `Field` met label (alleen losse `Text` titel "Filter") | §3 Forms |
| 2 | BLOCKER | `PurchaseOrderColumnFilterMenuMainPane.jsx` | Bestand ~328 regels; component overschrijdt 300-regels limiet | Code kwaliteit / checklist |
| 3 | BLOCKER | `PurchaseOrderColumnHeader.jsx` | Nederlandse tooltip: "Track changes actief" (zichtbaar naast kolomlabel in header) | app-taal.mdc |
| 4 | VERBETERPUNT | `PurchaseOrderColumnFilterMenuMainPane.jsx` | Filter heeft Apply/Clear; text style & conditional formatting zijn live — inconsistent interactiemodel | §3 / UX |
| 5 | VERBETERPUNT | `PurchaseOrderColumnFilterMenuMainPane.jsx` | Sort-labels altijd "Sort A to Z" / "Sort Z to A", ook voor number/date-kolommen | §2 content-aware labels |
| 6 | VERBETERPUNT | `PurchaseOrderColumnFilterMenuMainPane.jsx` + `Panels.jsx` | Submenu's openen op hover (`onMouseEnter`); moeilijk op touch; `submenuTop` via `offsetTop` is fragiel na herordening filter bovenaan | §4 Overlays |
| 7 | VERBETERPUNT | `PurchaseOrderColumnFilterMenuMainPane.jsx` | Geneste `Popover` (connected columns) binnen hoofd-Popover — focus/escape risico | §4 Overlays / fluentui-valkuilen |
| 8 | VERBETERPUNT | `purchaseOrderColumnFilterMenuStyles.js` | `mainPane` heeft geen `maxHeight` / scroll; lang menu (veel kolomtypes) valt onder viewport | §4 Overlays |
| 9 | VERBETERPUNT | `PurchaseOrderColumnFilterMenu.jsx` | Trigger toont letterlijk "..."; pas zichtbaar bij hover — lage discoverability | §2 discoverability |
| 10 | VERBETERPUNT | Header rij | Dubbele filter-signaalering: gele badge in label + gele trigger + onderstreep op cel — visueel druk | §2 status feedback |
| 11 | VERBETERPUNT | `PurchaseOrderColumnFilterMenuMainPane.jsx` | Inline `style={{}}` op D365 sync-regel i.p.v. `makeStyles` | §1 Theming |
| 12 | VERBETERPUNT | `PurchaseOrderColumnFilterMenuMainPane.jsx` | Veel platte items met herhaalde `divider`; geen duidelijke sectiekoppen behalve filter | §2 page header / sections |
| 13 | VERBETERPUNT | `PurchaseOrderColumnFilterMenuMainPane.jsx` | "Display as" week/month: `aria-pressed` op subtle buttons — zwak selected-state contrast | §2 status feedback |
| 14 | OK | `purchaseOrderColumnFilterMenuStyles.js` | Vaste breedte 256px, tokens, icon alignment consistent met golden reference | §6 |
| 15 | OK | `PurchaseOrderColumnFilterMenu.jsx` | `PurchaseOrderColumnMutationDialogs` buiten Popover-hierarchie | §5 pitfalls |
| 16 | OK | Filter positie | Filter staat nu bovenaan (titel → filter → sort) — sluit aan bij gebruikersverwachting | — |

---

## Browser findings

| # | Severity | Check | Result | Notes |
|---|----------|-------|--------|-------|
| 1 | — | Input width in menu | SKIPPED | Static: 256px container is passend voor filter |
| 2 | — | Overlay clipping | SKIPPED | Sticky header z-index 2 vs subPane z-index 1 — visueel check nodig |
| 3 | — | Console | SKIPPED | — |

**Screenshots**: niet gemaakt (browser MCP unavailable)

---

## Comparison with golden reference

| Aspect | Golden reference | Column header menu | Match |
|--------|------------------|-------------------|-------|
| Popover width | 256px fixed (`mainPane`) | 256px | Yes |
| Field + label on controls | `FormatRulesSection` uses `Field` | Filter uses bare `Input`/`Dropdown` | No |
| Section structure | Admin: titled blocks + background | Flat list + dividers | Partial |
| Sub-overlay pattern | Drawer/flyout with clear open state | Hover side subPane | No |
| Token usage | `tokens.*` in makeStyles | Mostly yes; connector yellow via shared constant | Yes |

---

## Aanbevolen verbeteringen (prioriteit — nog niet geïmplementeerd)

### P1 — Standaard & toegankelijkheid

1. **Wrap filter controls in `Field`** — label "Operator" op dropdown, "Value" / "From" / "To" op inputs; behoud sectietitel "Filter" optioneel als overkoepelend kopje.
2. **Splits `PurchaseOrderColumnFilterMenuMainPane`** — extract `FilterMenuFilterSection`, `FilterMenuSortSection`, `FilterMenuColumnActions` zodat elk bestand <300 regels blijft.
3. **Vertaal header-tooltip** — "Track changes actief" → "Track changes active" in `PurchaseOrderColumnHeader.jsx`.

### P2 — Informatie-architectuur

4. **Groepeer menu in secties** met vaste koppen (Engels):
   - *Filter & sort* (filter, sort, clear sort)
   - *Category* (group submenu)
   - *Appearance* (text style, conditional formatting, display as)
   - *Column* (hide, sticky, rename via title, add/delete, line totals, D365 sync)
5. **Eenduidig apply-model** — kies één patroon:
   - *Optie A*: filter ook live (debounced/on blur) en verwijder Apply-knop — consistent met text style.
   - *Optie B*: text style/format rules terug naar expliciete Apply — consistent met filter.
   - Aanbevolen: **Optie A** voor filter (minder clicks, Monday/Excel-achtig).

### P3 — Interactie & overlay

6. **Submenu's op click i.p.v. hover** — chevron + `aria-expanded`; subPane positioneer relatief aan knop (`getBoundingClientRect`) i.p.v. `offsetTop`.
7. **Scrollbare main pane** — `maxHeight: min(70vh, 520px)` + `overflowY: auto` op `mainPane`.
8. **Connected columns** — vervang nested Popover door inline uitklapbare lijst of `Tooltip`/`title` op link-icoon (geen tweede Popover-laag).
9. **Trigger verbeteren** — icoon (`FilterRegular` of `ChevronDown`) i.p.v. "..."; altijd lichte opacity (bijv. 0.4) i.p.v. volledig hidden.

### P4 — Copy & visuele feedback

10. **Context-aware sort labels** — text: A→Z; number/date: "Sort ascending" / "Sort descending".
11. **Filter-indicator consolideren** — kies één primair signaal (bijv. alleen gele onderstreep + trigger tint; badge in label optioneel weglaten).
12. **Display-as toggles** — gebruik `ToggleButton` of `MenuItem` met checkmark voor geselecteerde week/month mode.
13. **Verplaats inline styles** D365-sync rij naar `purchaseOrderColumnFilterMenuStyles.js`.

---

## Limitations

- [x] Browser MCP unavailable — static review only
- [ ] Auth: not verified in browser
- [x] Geen code gewijzigd (user request: alleen voorstellen)

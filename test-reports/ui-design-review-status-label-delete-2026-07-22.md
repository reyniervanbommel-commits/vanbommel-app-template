# UI Design Review: Status label verwijderen (met reassign-conflictstap)

**Date**: 2026-07-22
**Reviewer**: Cursor Agent
**Mode**: standard (static only)
**App URL**: n/a — geen dev server gestart (project-regel: nooit zelf een server starten) en geen preview-URL beschikbaar buiten de OTAP-flow
**Changed files**:
- `src/components/supplier/StatusCell.jsx`
- `src/components/supplier/StatusLabelsEditor.jsx`
- `src/components/supplier/StatusLabelsConflictResolver.jsx` (nieuw)
- `src/components/supplier/PurchaseOrderHeaderCellContent.jsx`
- `src/components/supplier/PurchaseOrderSubitemLineRow.jsx`
- `src/hooks/useStatusLabelsEditor.js` (nieuw)
**Golden reference**: `src/components/supplier/PurchaseOrderColumnFormatRulesSection.jsx` (compacte Dropdown-rijen zonder Field-wrapper, binnen een bestaande Popover/Dialog-context)

---

## Summary

| Category | Status | Notes |
|----------|--------|-------|
| Static — Fluent & tokens | PASS | Alleen `@fluentui/react-components` (v9), geen hardcoded hex in nieuwe styles, `tokens.*` gebruikt |
| Static — Forms & layout | PASS | Compacte Dropdown-rijen consistent met bestaand `PurchaseOrderColumnFormatRulesSection.jsx`-patroon |
| Static — Overlays & pitfalls | PASS (met bestaande kanttekening) | Geen `Tooltip`/`Dialog`-nesting toegevoegd; delete-knop gebruikt `title`-attribuut i.p.v. Tooltip |
| Browser — visual consistency | SKIPPED | Geen dev server / preview-URL beschikbaar |
| Browser — console | SKIPPED | Idem |

**Verdict**: GOEDGEKEURD

---

## Static findings

| # | Severity | File | Finding | Standard |
|---|----------|------|---------|----------|
| 1 | OK | `StatusLabelsEditor.jsx` | Delete-knop per label gebruikt `title`-attribuut i.p.v. `<Tooltip>`, veilig binnen een `.map()` | §5 Fluent pitfalls |
| 2 | OK | `StatusLabelsConflictResolver.jsx` | Alleen v9-imports, `tokens.*` voor kleuren/spacing, geen hardcoded hex | §1 Theming |
| 3 | OK | `StatusLabelsConflictResolver.jsx` | Dropdown-rijen zonder `Field`-wrapper — consistent met golden reference (compacte inline pickers in bestaande overlay) | §3 Forms (uitzondering conform §6-referentie) |
| 4 | OK | `StatusCell.jsx` | Nieuwe `conflict`-modus hergebruikt de bestaande `Popover`/`PopoverSurface` in plaats van een nieuw overlay-type te introduceren | §4 Overlays |
| 5 | OK | Alle gewijzigde bestanden | Alle nieuwe/aangepaste UI-teksten zijn Engels | `.cursor/rules/app-taal.mdc` |
| 6 | OK | Alle gewijzigde bestanden | Componenten blijven ruim onder 300 regels (StatusCell ~222, StatusLabelsEditor ~155, StatusLabelsConflictResolver ~99) | Code-kwaliteit |
| 7 | VERBETERPUNT (pre-existing, niet geïntroduceerd door deze wijziging) | `StatusCell.jsx` | `Popover` wordt per statuscel (dus per rij) gemount — dit patroon bestond al vóór deze wijziging en is niet aangepast | §5 "Portal components in lists" |

---

## Browser findings

Geskipt — geen dev server gestart (project-regel) en geen preview-URL beschikbaar buiten de OTAP-flow. Functioneel gedrag is gevalideerd via de nieuwe unit tests voor `useStatusLabelsEditor` (7 tests, incl. de conflict-resolutiestap) en de volledige testsuite (615/615 groen).

---

## Comparison with golden reference

| Aspect | Golden reference (`PurchaseOrderColumnFormatRulesSection.jsx`) | This feature | Match |
|--------|------------------|--------------|-------|
| Dropdown zonder Field-wrapper in compacte rij | Ja | Ja | Yes |
| `tokens.*` voor kleur/spacing | Ja | Ja | Yes |
| Overlay-type | Dialog (bestaand) | Popover (bestaand, hergebruikt) | Yes (context-consistent) |
| Engelse UI-teksten | Ja | Ja | Yes |

---

## Recommended fixes (priority order)

Geen blokkerende punten. Punt 7 (Popover-per-rij) is pre-existing gedrag buiten de scope van deze wijziging; alleen relevant als een toekomstige performance-review dit oppikt op de PO-board hot path.

---

## Limitations

- [x] Backend-only change — browser checks skipped: nee, dit is een UI-wijziging, maar zonder draaiende dev server/preview-URL kon geen browsercontrole worden uitgevoerd (project-regel: nooit zelf een server starten)
- [x] Functioneel gedrag afgedekt via unit tests i.p.v. browsertest

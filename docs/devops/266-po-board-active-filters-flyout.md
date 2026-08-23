# PO-board active filters flyout (DevOps)

**Doel:** Staff op het PO-board kan in één rechter-flyout alle actieve filters en conditional formatting zien en aanpassen.  
**Referentie in repo:** [.cursor/plans/dev_2026-08-22-po-board-active-filters-flyout.plan.md](../.cursor/plans/dev_2026-08-22-po-board-active-filters-flyout.plan.md)  
**Spec:** [docs/specs/2026-08-22-po-board-active-filters-flyout-design.md](../specs/2026-08-22-po-board-active-filters-flyout-design.md)  
**Tags:** `po-board; filters; conditional-formatting; fluent-ui`  
**Work item:** [User Story #266](https://dev.azure.com/ReyniervanBommel0745/Vendor-App/_workitems/edit/266)

---

## User story

**Als** staff op het PO-board  
**wil ik** in één rechter-flyout alle actieve filters en conditional formatting zien en aanpassen  
**zodat** ik snel begrijp waarom rijen weg of gekleurd zijn, zonder elk kolommenu te openen.

---

## Acceptatiecriteria (definitie van "klaar")

1. Filter-icoon staat links boven in de PO-tabelheader, naast het hamburger-menu.
2. Een stip op het icoon is zichtbaar als minstens één filter of formatting-regelset actief is; bij niets actiefs geen stip.
3. Klik opent een flyout rechts met titel `Active filters & formatting`; eerst Filters, daaronder Conditional formatting.
4. Per sectie eerst header-kolommen, daarna line-kolommen; lege groepen zonder kopje.
5. Collapsed rij toont samenvatting + Clear; uitklappen opent de bestaande editor (maximaal één tegelijk).
6. Wijzigingen gebruiken dezelfde apply/save als de kolommenu’s.
7. Icoon blijft klikbaar bij niets actiefs (empty states: `No active filters` / `No conditional formatting`).
8. Geen extra API-calls of unique-value-scans zolang de flyout dicht is.
9. Engelse UI, Fluent Drawer, geen Tooltip in de lijst; versie gepatcht in `src/config/version.js`.

---

## Wat is al gedaan (geen DevOps-tasks meer nodig tenzij verificatie)

| Item | Locatie |
|------|---------|
| BRD + FRD + TD | `docs/specs/2026-08-22-po-board-active-filters-flyout-design.md` |
| Bouwplan (6 taken) | `.cursor/plans/dev_2026-08-22-po-board-active-filters-flyout.plan.md` |
| Kolomfilters + CF-editors (hergebruik) | `src/components/supplier/PurchaseOrderColumnFilterMenu.jsx` e.a. |
| Drawer-patroon | `src/components/rccp/RccpSettingsFlyout.jsx` |

---

## Backlog — tasks

- [ ] Hook `usePurchaseOrdersActiveRules` + tests
- [ ] Filter-icoon, presence-dot, control-kolom 116px
- [ ] Drawer + lijsten (Clear, empty states)
- [ ] Compacte filter-editor (lazy unique values)
- [ ] Compacte format-editor
- [ ] Wire PageContent, version, `devTestItems`

---

## Versie document

Aangemaakt op basis van [.cursor/plans/dev_2026-08-22-po-board-active-filters-flyout.plan.md](../.cursor/plans/dev_2026-08-22-po-board-active-filters-flyout.plan.md); wijzig dit bestand bij nieuwe afspraken.  
Repo-document: docs/devops/266-po-board-active-filters-flyout.md

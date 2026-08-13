# PO-board waarde-filter (equals/oneOf combobox) (DevOps)

**Doel:** Vervang de vrije tekstvelden voor `equals` en `oneOf` kolomfilters op het PO-board door een combobox met typeahead-suggesties en D365 F&O-stijl chip-invoer voor `oneOf`.
**Referentie in repo:** [.cursor/plans/dev_2026-08-10-po-board-value-filter-plan.md](../.cursor/plans/dev_2026-08-10-po-board-value-filter-plan.md)
**Tags:** `po-board; filter; combobox; oneOf; cascading`
**Work item:** [Feature #238](https://dev.azure.com/ReyniervanBommel0745/Vendor-App/_workitems/edit/238)

---

## User story

**Als** inkoper
**wil ik** bij kolomfilters `equals` en `is one of` een lijst van beschikbare waarden zien en meerdere waarden als chips kunnen invoeren of plakken
**zodat** ik snel en foutloos op bekende waarden kan filteren zonder exact te moeten typen

---

## Acceptatiecriteria (definitie van "klaar")

1. `equals`-operator toont een typeahead-dropdown met unieke kolomwaarden; klikken vult het veld.
2. `oneOf`-operator slaat waarden op als array; plakken van meerdere regels voegt meerdere chips toe.
3. Suggesties zijn cascading: ze respecteren actieve filters op andere kolommen (kleurfilters uitgesloten).
4. Een opgeslagen view met legacy komma-string (`"Acme,Beta"`) laadt en filtert correct.
5. Date-kolommen zijn ongewijzigd; alle bestaande tests blijven groen.
6. Versienummer is verhoogd in `src/config/version.js`.

---

## Wat is al gedaan

| Item | Locatie |
|------|---------|
| `oneOf` in `TEXT_FILTER_OPERATORS` | `src/utils/tableViewFilterUtils.js:19` |
| `COLOR_FILTER_OPERATOR` geëxporteerd | `src/utils/tableViewFilterUtils.js:11` |
| `parseOneOfValues` helper (privé) | `src/utils/tableViewFilterUtils.js:58` |
| `referenceColumns` prop op filtermenu | `src/components/supplier/PurchaseOrderColumnFilterMenu.jsx:58` |
| Test-helpers `renderMenu`/`openColumnMenu` | `src/components/supplier/PurchaseOrderColumnFilterMenu.test.jsx` |

---

## Backlog — child User Stories

| # | Story | DevOps |
|---|-------|--------|
| P1 | Refactor: `tableViewFilterUtils.js` splitsen | [#239](https://dev.azure.com/ReyniervanBommel0745/Vendor-App/_workitems/edit/239) |
| P2 | Refactor: `PurchaseOrdersBoardTable.jsx` splitsen | [#240](https://dev.azure.com/ReyniervanBommel0745/Vendor-App/_workitems/edit/240) |
| 1 | Array-based `oneOf` + backward compat | [#241](https://dev.azure.com/ReyniervanBommel0745/Vendor-App/_workitems/edit/241) |
| 2 | `oneOf`-operator voor number-kolommen | [#242](https://dev.azure.com/ReyniervanBommel0745/Vendor-App/_workitems/edit/242) |
| 3 | Cascading `filterItemsByColumnFilters` | [#243](https://dev.azure.com/ReyniervanBommel0745/Vendor-App/_workitems/edit/243) |
| 4 | Array-bewuste `isColumnFilterActive` / `getDraftFromFilter` | [#244](https://dev.azure.com/ReyniervanBommel0745/Vendor-App/_workitems/edit/244) |
| 5 | Unieke-waarden utility (`columnUniqueValues`) | [#245](https://dev.azure.com/ReyniervanBommel0745/Vendor-App/_workitems/edit/245) |
| 6 | `handleDraftValueChange` in hook | [#246](https://dev.azure.com/ReyniervanBommel0745/Vendor-App/_workitems/edit/246) |
| 7 | Nieuw component `PurchaseOrderColumnFilterValuePicker` | [#247](https://dev.azure.com/ReyniervanBommel0745/Vendor-App/_workitems/edit/247) |
| 8 | Data-threading + lazy unieke waarden | [#248](https://dev.azure.com/ReyniervanBommel0745/Vendor-App/_workitems/edit/248) |
| 9 | Picker inzetten in `FilterSection` | [#249](https://dev.azure.com/ReyniervanBommel0745/Vendor-App/_workitems/edit/249) |
| 10 | Regressietests + versie + check-ui | [#250](https://dev.azure.com/ReyniervanBommel0745/Vendor-App/_workitems/edit/250) |

---

## Versie document

Aangemaakt op basis van [.cursor/plans/dev_2026-08-10-po-board-value-filter-plan.md](../.cursor/plans/dev_2026-08-10-po-board-value-filter-plan.md); wijzig dit bestand bij nieuwe afspraken.
Repo-document: docs/devops/238-po-board-value-filter.md

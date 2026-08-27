# ADR-006: PO-board kolomsom in saved view, niet in board-settings

**Datum:** 2026-08-27  
**Status:** Geaccepteerd  
**Tags:** po-board, saved-view, column-sum, persist  

---

## Context

Het PO-board had al “Show sum in group header”: een som per groep in de groepsheader. Zonder grouping was er geen kolomtotaal, en bij een lange lijst verdween elk overzicht tot je helemaal naar beneden scrollde. De som moest dezelfde numerieke parse gebruiken als group-sum, de virtualisatie niet extra DOM-rijen forceren, en de instelling moest herladen overleven zonder een nieuwe SQL-kolom of API-route.

Twee persist-plekken lagen voor de hand: board-settings (`settings_json`) en saved-view (`view_state_json`). Group-sum zat al in de view-state onder `grouping.summaryColumnKeys`. Extra top-level keys op `usePurchaseOrderBoardView` zouden het compositiepunt verder opblazen (bestand al tegen de 300-regelgrens).

## Beslissing

1. Kolomsom (board-footer) is onafhankelijk van group-sum. Nieuw veld `columnSumKeys` (`string[]`) op **table-niveau** in saved-view `view_state_json`. Niet in `grouping.summaryColumnKeys`. Niet in board-settings `settings_json`.
2. Weergave is een native `<tfoot>` in dezelfde board-tabel, met `position: sticky; bottom: 0` in de bestaande overflow-wrapper. Bij overflow plakt de rij onderaan het tabelvenster; zonder overflow blijft hij direct na de laatste datarij.
3. Somlogica woont in `usePurchaseOrderColumnSums`. `usePurchaseOrderBoardView` composeert die hook en hangt **één** nested `columnSums` aan de return. Export/apply van de view krijgt `columnSumKeys` in het bestaande filter/sort/grouping-object.
4. Som is client-side, één pass over de gefilterde header-rijen (`calculateHeaderColumnSums`). Geen extra `apiRequest`, geen SQL-kolom. Zelfde `toNumeric` als grouping.
5. **Reset view** wist `columnSumKeys` (zelfde contract als group-summaries). Ontbrekend veld of oude client → `[]`, geen footer, geen migratie.
6. Menu-keten gebruikt één `sumToggles`-object (group-sum én board-sum) zodat `PurchaseOrderColumnFilterMenu` niet groeit.

## Alternatieven overwogen

| Optie | Reden afgewezen |
|-------|-----------------|
| Persist in `grouping.summaryColumnKeys` | Footer-som is geen grouping; Reset en saved views zouden beide features koppelen. |
| Persist in board-settings `settings_json` | Som hoort bij een view (filters, kolommen, grouping), niet bij globale board-instellingen. |
| Overlay-`<div>` buiten de tabel | Extra JS, desync met kolombreedtes, sticky columns en horizontale scroll. |
| Synthetische groep “Total” onderaan | Group header is `colSpan`, dus geen som per kolom; grouping-UI wordt misbruikt. |
| Extra top-level keys op board-view | Verantwoordelijkheid verspreid; bestand over de 300-regelgrens. Nested `columnSums` houdt één compositiepunt. |
| Extra API/SQL-kolom | Onnodig: de gefilterde rijen staan al client-side. |

## Gevolgen

Saved views (personal/global/vendor) nemen `Show sum` mee; een globale staff-view toont de footer ook aan employees. Oude views zonder het veld blijven geldig. Mixed old-client save kan `columnSumKeys` wissen — acceptabel. Toekomstige board-voorkeuren die bij filters/grouping horen, horen in `view_state_json` / `normalizeViewState`, niet in `normalizeBoardSettings`. Footer blijft buiten `useBoardRowWindow`; som over data, niet over gemounte DOM.

## Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/hooks/usePurchaseOrderColumnSums.js` | State, sanitize, som, export/apply. |
| `src/hooks/usePurchaseOrderBoardView.js` | Nested `columnSums` + `columnSumKeys` in export/apply. |
| `src/hooks/usePurchaseOrderSavedViewState.js` | Reset wist column sums. |
| `server/routes/supplier.js` | `normalizeViewState` houdt `table.columnSumKeys`. |
| `src/components/supplier/PurchaseOrdersBoardTotalsRow.jsx` | Sticky `<tfoot>`. |
| `src/components/supplier/PurchaseOrderColumnSumToggles.jsx` | Show sum + group-sum switches. |
| `src/utils/purchaseOrderTotals.js` | Gedeelde `toNumeric` + `calculateHeaderColumnSums`. |
| `docs/specs/2026-08-27-po-board-column-sum-design.md` | BRD/FRD/TD. |

# PO-board: kolomtotaal onderaan de tabel (Show sum)

## BRD

**Als** PO-board gebruiker (inkoper)
**wil ik** een som onderaan een numerieke header-kolom
**zodat** ik het totaal van de zichtbare headerwaarden zie zonder te groeperen en zonder naar het einde van een lange lijst te scrollen.

**Probleem nu:** “Show sum in group header” bestaat alleen in de groepsheader. Zonder grouping is er geen kolomtotaal. Bij een lange lijst verdwijnt elk overzicht tot je helemaal naar beneden scrollt.

**Succes (toetsbaar):**
- Op een numerieke header-kolom staat een switch **Show sum** (Engels).
- De som is de optelsom van headerwaarden van alle **gefilterde** PO-rijen (zelfde numerieke parse als group-sum).
- Overflow (meer rijen dan het tabelvenster): de totaalregel blijft zichtbaar onderaan het venster tijdens verticaal scrollen.
- Geen overflow: de totaalregel zit direct onder de laatste datarij, niet in de lege ruimte onderaan het venster.
- De instelling overleeft herladen via **saved view** (`view_state_json`). Niet via board-settings (`settings_json`).
- **Reset view** zet **Show sum** uit (zelfde contract als group-summaries).
- **Show sum in group header** blijft onafhankelijk werken.

**Non-goals:**
- Geen gemiddelde, aantal, min of max.
- Geen som van line-items in deze footer (dat is al **Enable total row sum** in `PurchaseOrderLineTotalsRow.jsx`).
- Geen andere borden of tabellen.
- Group-sum niet vervangen of verplaatsen.
- Geen nieuwe SQL-kolom of API-route; extra JSON alleen in bestaande `view_state_json` (saved views). Niet in `settings_json` / `normalizeBoardSettings`.
- Excel-export ongewijzigd.

**Constraints:**
- UI Engels; staff-toggle zoals group-sum (`isHeaderNumberColumn`).
- Componenten ≤ 300 regels; Fluent v9 tokens, geen hardcoded kleuren.
- Virtualisatie (`useBoardRowWindow`) mag niet extra DOM-rijen forceren: som over data, `<tfoot>` buiten het window.
- Sticky kolommen: footer-cellen in die kolommen ook `left` + `bottom` sticky.
- Geen extra `apiRequest`; som client-side over al geladen gefilterde rijen.
- Collapsed groups: rijen tellen wél mee (gefilterde set, niet alleen gemounte DOM).
- OTAP local-first: ontwikkelen op localhost, geen push zonder verzoek.

## FRD

**Gekozen approach:** A — native `<tfoot>` in dezelfde board-`<table>` met `position: sticky; bottom: 0` in de bestaande overflow-wrapper. CSS sticky-bottom plakt de rij bij overflow onderaan het venster; zonder overflow blijft de rij op zijn natuurlijke plek (direct na de laatste datarij). Kolombreedtes en horizontale scroll blijven die van de tabel.

**Afgewezen:**
- B — overlay-`<div>` buiten de tabel die `scrollHeight` vs. `clientHeight` meet: extra JS, desync-risico met kolombreedtes, sticky columns en horizontale scroll.
- C — synthetische groep “Total” onderaan: group header is `colSpan`, dus geen som per kolom; grouping-UI wordt misbruikt.

**Happy path**
1. Staff opent het kolommenu van een numerieke header-kolom (niet `level === 'line'`).
2. Zet **Show sum** aan.
3. Onder de datarijen verschijnt een footer-regel. In de cellen van som-kolommen staat de geformatteerde som (`formatCellValue(total, 'number')`); overige cellen blijven leeg.
4. Meerdere numerieke header-kolommen mogen tegelijk aan staan.
5. Filters wijzigen de som (alleen gefilterde header-rijen). Grouping mag aan of uit; group-sum blijft per groep in de groepsheader.
6. Na herladen of het toepassen van dezelfde saved view blijft **Show sum** aan.
7. **Reset view** wist filters/sort/grouping én `columnSumKeys` → footer verdwijnt.

**Rollen:** staff zet de switch aan/uit (zelfde `isStaff`-gate als “Show sum in group header”). Iedereen met board-toegang ziet de footer zodra de instelling in de **saved view** staat. Persist per gebruiker/view, geen extra `requireRole`.

**Leeg:**
- Geen som-kolommen aan → geen `<tfoot>`.
- Filter-empty-state (“No rows match the active filters”) → geen footer.
- Som-kolom aan, wel rijen, alle waarden non-numeriek → som `0` (zelfde reduce als group-sum).

**Fout:**
- Niet-numerieke cellen worden overgeslagen (bestaande `toNumeric`).
- Geen netwerkcall, dus geen timeout/403-pad voor deze feature.
- Dubbel togglen: idempotente set van keys (aan als uit, uit als aan).

**Overlap:** twee tabs/users hebben elk hun eigen view-state. Geen gedeelde server-job. Bron van de som is de al geladen, gefilterde board-dataset.

**UI:**
- Switch **Show sum** in het Category/group-pane van het kolommenu, onder de bestaande **Show sum in group header**. Zichtbaar voor numerieke header-kolommen ongeacht of grouping aan staat — dat is waar gebruikers nu al sommen aanzetten.
- Labels, `aria-label` en empty/foutteksten Engels.
- Geen `<Tooltip>` in de kolomlijst of in herhaalde rijen.
- Footer visueel zoals line-totals: `fontWeightSemibold`, `colorNeutralBackground2`, bovenrand 2px `colorNeutralStroke1`. Geen hardcoded hex.
- Control-kolom (selectie/expand) in de footer: leeg, zelfde raster als de header.
- Ingeklapte header-kolommen: collapsed placeholder-cel in de footer (zelfde patroon als `PurchaseOrderLineTotalsRow` + `PurchaseOrderCollapsedColumnCell`).
- Footer-achtergrond is opaque (`colorNeutralBackground2`) zodat datarijen niet doorschemeren als de rij sticky is.

**Zichtbaarheid:** footer toont alleen sommen van kolommen die op het bord staan. Geen extra velden. Supplier ziet dezelfde scoped dataset als het bord. `columnSumKeys` reist mee in de saved view (personal/global/vendor), net als grouping — een globale view van staff toont de footer ook aan employees. localStorage mag hooguit dezelfde voorkeur cachen als de rest van de view-state; **nooit** berekende sommen of PO-bedragen.

**Hergebruik:** `formatCellValue`, line-totals-rij als visueel/structuurpatroon, `normalizeStringArray` voor persist, bestaande kolommenu-flags/quick-actions. Som over `order.values[columnKey]` van gefilterde header-rijen.

## TD

### Hergebruik (concrete paden)

| Wat | Pad |
|-----|-----|
| Line-totals UI-patroon | `src/components/supplier/PurchaseOrderLineTotalsRow.jsx` |
| Board-tabel + scroll-wrapper | `src/components/supplier/PurchaseOrdersBoardTable.jsx` |
| Header sticky + `stickyLeft` | `src/components/supplier/PurchaseOrdersBoardHeaderRow.jsx`, `src/hooks/useSequentialStickyColumns.js` |
| Group-sum toggle | `src/components/supplier/PurchaseOrderColumnGroupingSection.jsx` |
| Menu flags | `src/hooks/usePurchaseOrderColumnMenuFlags.js` (`isHeaderNumberColumn`) |
| Menu quick-actions | `src/hooks/usePurchaseOrderColumnMenuQuickActions.js` |
| Column-sum state | **verplicht** `src/hooks/usePurchaseOrderColumnSums.js`. Board-view composeert die hook en hangt **één** nested `columnSums` aan de return. Geen extra losse top-level keys. |
| Filter/sort/grouping persist | `exportFilterSortGrouping` / `applyFilterSortGrouping` krijgen `columnSumKeys` in het export-object. `useCallback`-deps bevatten `columnSums.exportKeys` / `applyKeys`. |
| Saved-view JSON | Alleen `normalizeViewState` in `server/routes/supplier.js`. **Niet** `normalizeBoardSettings`. Reset: `src/hooks/usePurchaseOrderSavedViewState.js` → `handleResetView`. |
| Numerieke som | `src/utils/purchaseOrderTotals.js`. `usePurchaseOrderGrouping.js` importeert dezelfde geëxporteerde `toNumeric` (geen tweede parser). |
| Virtualisatie | `src/hooks/useBoardRowWindow.js` — footer **niet** in het row-window |
| Versie | `src/config/version.js` (PATCH bij implementatie) |

### Somlogica

Exporteer `toNumeric` uit `src/utils/purchaseOrderTotals.js`. `usePurchaseOrderGrouping.js` vervangt de private kopie door die import (één parser, zelfde succescriterium). Voeg `calculateHeaderColumnSums(rows, columnKeys)` toe: **één** pass over `rows`, resultaat `Record<columnKey, number>`. Geen N reduces. `entry.order?.values?.[columnKey]`.

Som woont in `usePurchaseOrderColumnSums`, niet in de TotalsRow en niet in `PurchaseOrdersBoardTable`. Collapsed groups tellen mee (`rows` is de platte gefilterde lijst).

Hook-contract `usePurchaseOrderColumnSums({ rows, columns })`:
- Compose **in** `usePurchaseOrderBoardView` (spiegel van grouping). Tabel, header en reset lezen `boardView.columnSums`.
- Returns (≤ 10): `{ columnSumKeys, setColumnSumColumn, clearColumnSums, summedValuesByColumn, exportKeys, applyKeys }`. Stabiel via `useMemo`/`useCallback`. Geen JSX. Geen `loading`/`error`.
- `applyKeys` / `setColumnSumColumn`: alleen numerieke header-kolommen; skip `__proto__`, `constructor`, `prototype`; ontbrekend/ongeldig → `[]`. `columnSumKeys` memoizen (geen verse `[]` per render).
- `usePurchaseOrderBoardView.js` staat op 295 regels. Compose + export/apply mag het bestand **niet** over 300 duwen: verplaats de bestaande `ACTIVITY_FILTER_*`-constanten naar een sibling-module (`src/hooks/purchaseOrderActivityFilter.js`) in dezelfde wijziging. Geen andere drive-by.

### State en persist

Nieuw veld **`columnSumKeys`** (`string[]`) op **table-niveau** in **saved-view** `view_state_json`. Niet in `grouping.summaryColumnKeys`. Niet in board-settings `settings_json` (`normalizeBoardSettings` blijft ongewijzigd; een key daar wordt stil weggegooid).

`exportFilterSortGrouping`:

```js
{ activityFilter, filterByColumn, sortState, grouping, columnSumKeys }
```

`applyFilterSortGrouping` roept `columnSums.applyKeys(state?.columnSumKeys)` aan. `useCallback`-deps bevatten `columnSums.exportKeys` en `columnSums.applyKeys`.

Server `normalizeViewState`:

```js
columnSumKeys: normalizeStringArray(table.columnSumKeys),
```

`normalizeStringArray` cap al op `MAX_COLUMNS` (80), dedupe, trim. Geen kolom-whitelist (dynamisch D365-metamodel, zelfde beleid als `summaryColumnKeys`). Keys nooit in SQL of in HTML/CSS interpoleren.

**Backwards compatible:**
- Ontbrekend veld of oude client → `[]`, geen footer. Geen migratie, geen layout-`version`-bump, geen SQL-kolom.
- Rollback naar oude code: de normalizer stript onbekende keys; rest van de blob blijft geldig.
- Mixed old-client save kan `columnSumKeys` wissen — acceptabel, geen extra schema.

**Reset:** `handleResetView` in `usePurchaseOrderSavedViewState.js` roept `boardView.columnSums.clearColumnSums()` aan naast `clearGroupSummaries`. Test daarvoor verplicht.

**localStorage:** geen bron van waarheid. Cache/fallback mag geen berekende sommen of bedragen bevatten.

Toggle: `columnSums.setColumnSumColumn(columnKey, enabled)`. Staff-only in de UI; server beperkt keys niet tot staff.

### UI-componenten (grootte / props)

- Nieuw: `PurchaseOrdersBoardTotalsRow.jsx` — `<tfoot>` + één `<tr>`. Krijgt `summedValuesByColumn` + `columnSumKeys` + `columns`; **geen** `rows`, **geen** reduce. `React.memo`.
- Nieuw: `PurchaseOrdersBoardTotalsCell.jsx` — één cel, memoized. Sticky `left`/`bottom` via interne `useMemo` op style, niet `style={{}}` in een `.map` in de parent. Geen inline handlers, geen `.map`/ternary-logica in TotalsRow-JSX voorbij één cell-component-aanroep.
- Styles in `purchaseOrdersBoardTableStyles.js`: opaque `totalsCell`, sticky `bottom: 0`, thead `zIndex: 2` wint van footer `zIndex: 1`. Sticky-kolomcellen: `left` + `bottom`. Control-kolom: `left: 0`. Fluent tokens.
- `PurchaseOrdersBoardTable.jsx` (272, 250+): korte render van TotalsRow ná rows/empty-tbody. Geen som-`useMemo` in dit bestand. Blijft ≤ 300.

**300-regel FilterMenu (298 nu) — BLOCKER als het groeit:** `PurchaseOrderColumnFilterMenu.jsx` mag **niet** extra prop-regels of flag-destructures erbij krijgen. Vervang de bestaande `isGroupSummaryColumn` + `onSetGroupSummaryColumn` door **één** `sumToggles`-object (group-sum én board-sum). Netto ≤ 0 regels in dit bestand. Zelfde object door TableHeader → HeaderRow → FilterMenu → PopoverContent → Panels → `PurchaseOrderColumnSumToggles`. Geen drie losse props per laag.

**Grouping-sectie:** nu 10 props. Extraheert `PurchaseOrderColumnSumToggles.jsx`; GroupingSection krijgt hetzelfde `sumToggles`-object (geen +3 props).

**Flags:** `usePurchaseOrderColumnMenuFlags` returnt al >10 keys. Voeg geen twee losse keys toe. Eén nested `sumFlags: { canToggleGroupSummary, canToggleColumnSum }` en laat bestaande `canToggleGroupSummary` staan tot een latere flags-split (niet in deze feature). Quick-actions: + `handleToggleColumnSum` (8 ≤ 10).

### Virtualisatie en sticky

`<tfoot>` is sibling van `<tbody>`, buiten `useBoardRowWindow`. Spacer-rijen bepalen scrollhoogte; sticky-bottom plakt tegen `.wrapper`. Zelfde `table-layout: fixed` voor kolom-align. Thead `position: sticky; top: 0` blijft. Footer mag de header niet overschrijven (korte viewport: header wint via hogere z-index).

### Auth en validatie

- Geen nieuwe endpoint. Bestaande `requireSession` op saved-views blijft.
- Client: alleen `dataType === 'number'` header-kolommen; reserved keys (`__proto__`, `constructor`, `prototype`) weigeren.
- Server: `normalizeStringArray` (type, trim, dedupe, max 80). Geen kolom-whitelist. Round-trip-test: POST/PATCH bewaart `table.columnSumKeys`.

### Perf

- Eén `useMemo`, één pass over `rows`, `Record<columnKey, number>` met stabiele referentie.
- Geen extra `apiRequest`, geen reduce in cel-render of TotalsRow.
- Geen `measure` verplicht; optioneel als de pass op grote boards merkbare kost krijgt.

### Volgorde (implementatie later, geen TBD)

1. `toNumeric` exporteren; grouping importeert die; `calculateHeaderColumnSums` + tests co-located bij `purchaseOrderTotals.js`.
2. `usePurchaseOrderColumnSums` + `.test.js`. Activity-filter-constanten uit board-view halen zodat dat bestand ≤299 blijft. Nested `columnSums` + export/apply. Reset in `handleResetView` + test.
3. Server `normalizeViewState` + round-trip-test (`columnSumKeys` optioneel → `[]`).
4. `sumToggles`-object door de menu-keten; `PurchaseOrderColumnSumToggles`. FilterMenu groeit niet.
5. `PurchaseOrdersBoardTotalsCell` + `PurchaseOrdersBoardTotalsRow` + styles + korte aansluiting in de tabel.
6. Tests: toggle, som over gefilterde rijen, grouping-onafhankelijk, empty/geen footer, reset, oude view zonder veld.
7. PATCH in `src/config/version.js`.

### Aantoonbaar

- Weinig rijen: footer tegen de laatste datarij.
- Veel rijen: footer plakt onderaan het tabelvenster; bij scrollen naar het einde is het nog steeds de laatste regel.
- Filter wijzigt de som.
- Group-sum ongewijzigd.
- Saved view round-trip: `columnSumKeys` blijft staan.
- Reset view verwijdert de footer.
- UI-teksten Engels.

## Review

Fase 4 (team): 🔴 van Dev Lead en React Architect verwerkt in deze TD. Overgebleven 🟡 zijn vastgelegd als beslissing, geen open keuze.

| Persona | Was | Nu |
|---------|-----|-----|
| Dev Lead | 🔴 board-view 295 + FilterMenu 298 | Extract som-hook + activity-constanten; FilterMenu `sumToggles` i.p.v. extra props |
| React Architect | 🔴 extra returns op board-view | Verplichte nested `columnSums`, één verantwoordelijkheid |
| Backend / Security / Release / Refactor | 🟡 persist/reset/parser | Saved view only, reset, gedeelde `toNumeric`, key-cap 80 |

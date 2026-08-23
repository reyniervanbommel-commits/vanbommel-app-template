# PO-board: actieve filters- en formatting-flyout

## BRD

**Als** staff op het PO-board
**wil ik** in één rechter-flyout alle actieve filters en conditional formatting zien en aanpassen
**zodat** ik snel begrijp waarom rijen weg of gekleurd zijn, zonder elk kolommenu te openen.

**Probleem nu:** actieve filters en conditional-formatting-regels zitten verstopt per kolommenu. Overzicht ontbreekt, en opruimen of bijstellen vraagt het openen van meerdere menu’s. Vergeten filters blijven staan.

**Succes (toetsbaar):**
- Links boven in de PO-tabelheader, naast het hamburger-menu, staat een filter-icoon.
- Het icoon is geel (zelfde kleur als de balk onder een gefilterde/formatted header) als minstens één filter of één formatting-regelset actief is; bij niets actiefs blijft het icoon neutraal. Geen aparte presence-stip.
- Klik opent een flyout aan de rechterkant met eerst Filters, daaronder Conditional formatting.
- Alle actieve regels staan erin, zijn daar te wissen en (na uitklappen) te wijzigen; dezelfde opslag als de kolommenu’s.
- Zolang de flyout dicht is: geen extra API-calls, geen unique-value-scans, geen itemlijsten. Unique values alleen bij uitklappen van een filter met value-picker.

**Non-goals:**
- Andere pagina’s (RCCP, BI) of een eigen scherm voor de subitem-tabel.
- Sort of grouping in deze flyout.
- Nieuwe filters of formatting op kolommen die nu niets actief hebben.
- Een nieuw persistentiemodel of nieuwe backend-routes.

**Constraints:**
- Bestaande kolommenu’s blijven werken.
- Wijzigingen in de flyout gebruiken dezelfde apply/save als het kolommenu.
- Fluent UI v9, Engelse UI, geen `<Tooltip>` in herhaalde lijsten.
- Staff (admin + employee), zelfde zichtbaarheid als het PO-board.

## FRD

**Gekozen approach:** A — OverlayDrawer rechts, accordion per actieve regel. Patroon: `src/components/rccp/RccpSettingsFlyout.jsx` (`Drawer`, `position="end"`). Trigger: `src/components/supplier/PurchaseOrdersTableControls.jsx`.

**Afgewezen:**
- B — Popover vanaf het icoon: past niet bij “flyout rechts”; te krap voor stacked editors.
- C — Extra tab/pagina: extra navigatie, geen sneller overzicht.

**Happy path**
1. Gebruiker klikt het filter-icoon in de control-header (naast het hamburger-menu).
2. Een open kolommenu gaat dicht.
3. Drawer rechts opent, titel: `Active filters & formatting`.
4. Sectie **Filters**, daaronder **Conditional formatting**.
5. Per sectie eerst Header columns (tabelvolgorde), daarna Line columns. Een groeps-kopje ontbreekt als die groep leeg is.
6. Elke collapsed rij toont kolomnaam, korte samenvatting en Clear. Clear wist meteen via dezelfde handlers als het kolommenu.
7. Uitklappen opent de compacte editor (filter of formatting). Maximaal één editor tegelijk.
8. Wijzigingen gaan via `applyColumnFilter` / `clearColumnFilter` / `setColumnColorFilter` / `saveHeaderColumnFormatRules` / `saveLineColumnFormatRules`. De tabel en de gele icoon-kleur volgen dezelfde React-state.

**Rollen:** alleen staff op de PO TABEL-pagina, zelfde `isStaff` als het board. Geen nieuwe API, geen `requireRole` extra.

**Leeg:** icoon blijft klikbaar. Flyout toont `No active filters` en `No conditional formatting`.

**Fout:** bestaande error-toast bij save-fail (zelfde teksten als het kolommenu, Engels).

**Overlap:** één editor tegelijk. Flyout openen sluit het kolommenu (Fluent outside-click op het icoon; geen tweede overlay-bus tenzij een test het tegendeel toont). Geen tweede bron van waarheid.

**UI:** Fluent Drawer (header + scrollbare body, geen extra Save-footer). Engels. Geen `<Tooltip>` in de lijst; `title` / `aria-label` op het icoon. Actieve staat nooit kleur alleen: `aria-label` is `Show active filters and formatting` of `Show active filters and formatting (active)`.

**Zichtbaarheid:** zelfde data als het board (geen extra velden, geen vendor-specifieke geheimen in de flyout).

**Hergebruik:** bestaande filter-value-picker, color-filter-hook, format-rules-section en format-draft-hook. Het hele kolommenu (sort, grouping, rename) wordt niet geëmbed.

## TD

**Hergebruik (paden):**
- Filters: `applyColumnFilter`, `clearColumnFilter`, `setColumnColorFilter` uit boardView (`src/hooks/usePurchaseOrderTableView.js` / `usePurchaseOrderBoardView.js`).
- Formatting: `saveHeaderColumnFormatRules`, `saveLineColumnFormatRules` in `src/hooks/usePurchaseOrdersPage.js`.
- Detectie: `isColumnFilterActive`, `isColumnFormatRuleSetActive` in `src/components/supplier/purchaseOrderColumnFilterMenuConstants.js`.
- Editors: `src/components/supplier/PurchaseOrderColumnFilterValuePicker.jsx`, `src/components/supplier/PurchaseOrderColumnFormatRulesSection.jsx`, `src/hooks/usePurchaseOrderColorFilter.js`, `src/hooks/useColumnFormatRulesMenuDraft.js`.
- Unique values: `src/utils/columnUniqueValues.js` — alleen in de uitgeklapte filter-editor, en alleen bij operators met een value-picker (`oneOf` / tekst-`equals`).
- Overlay-patroon: `src/components/rccp/RccpSettingsFlyout.jsx`.

**Schema:** geen nieuwe tabel of kolom. Geen extra JSON-properties in canvas-layout; bestaande board-settings blijven de bron.

**Auth:** geen nieuwe routes. Zelfde sessie als de pagina; icoon alleen waar het PO-board al staff-gated is.

**Nieuw** in `src/components/supplier/`, elk onder 300 regels:
- `PurchaseOrdersActiveRulesFlyout.jsx` — Drawer `position="end"`, `DrawerHeader` / `DrawerHeaderTitle` / `DrawerBody`, geen footer-Save.
- `PurchaseOrdersActiveRulesSection.jsx` — gedeelde Filters- en Conditional-formatting-lijst
- compacte filter-editor en compacte format-editor (alleen gemount bij `expandedKey`; inputs in `Field`, geen Tooltip, Clear op collapsed rij = `Button`).
- `usePurchaseOrdersActiveRules.js` + `usePurchaseOrdersActiveRules.test.js`
- `usePurchaseOrdersActiveRulesFlyout.js` — open-state en PageContent-wiring

**Hook-API:** `usePurchaseOrdersActiveRules` levert `hasActive` altijd (goedkoop, geen cell-scan). Itemlijsten alleen als `open` true is. Geen JSX. `expandedKey` blijft in de flyout-view; open-state in `usePurchaseOrdersActiveRulesFlyout`.

**Mount:** sibling van `src/components/supplier/PurchaseOrdersBoardTable.jsx` in `src/components/supplier/PurchaseOrdersPageContent.jsx`. Niet in de `<th>`. `PurchaseOrdersTableControls.jsx` krijgt twee extra props: `hasActive`, `onOpenFlyout` (blijft onder 10 props). Control-kolom nu 92px: synchroon verbreden in `PurchaseOrdersTableControls.jsx` en `src/components/supplier/purchaseOrdersBoardRowsStyles.js`.

**Volgorde:** hook + tests → icoon + stip + kolombreedte → Drawer + lijsten → compacte editors → wire in PageContent.

**Perf:**
- Geen extra `apiRequest`.
- Drawer-body alleen renderen als `open`.
- Itemlijsten alleen afleiden als de flyout open is; dichte flyout: alleen `hasActive`.
- `getUniqueColumnValues` alleen als die ene filter-editor expanded is én de operator een value-picker gebruikt, gewrapt in `measureSync('po_flyout_unique_values')`.
- Badge = Boolean over bestaande `filterByColumn` + format-regelmaps; geen scan van cell-waarden.
- Lijst-rijen `React.memo`; handlers `useCallback`.

**Versie:** patch in `src/config/version.js`.

**Aantoonbaar:** icoon klikken op `http://localhost:5178` (PO TABEL) → flyout toont actieve regels → Clear verwijdert het filter/de regelset → uitklappen wijzigt en de tabel volgt → bij niets actiefs empty states en een neutraal (niet-geel) icoon.

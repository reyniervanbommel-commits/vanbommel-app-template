# PO table zoom

## BRD

**Als** staff of leverancier
**wil ik** de PO-tabel visueel kleiner of groter kunnen zetten (tekst, padding, rijhoogte, headers en subitems)
**zodat** ik meer rijen en kolommen op het scherm zie zonder de browser of de rest van de app te zoomen.

**Probleem nu:** Cijfers en witruimte in de PO-tabel zijn te groot (vaste `fontSizeBase300`, header-padding 10×12px, rijhoogte 32px). Gebruikers zien minder data per scherm en hebben geen manier om de dichtheid aan te passen.

**Succes (toetsbaar):**
- De tabel start compacter dan nu (ca. 85% van de huidige maat).
- Staff en leveranciers kunnen de schaal zelf bijstellen; de keuze blijft staan in dezelfde browser tot ze hem wijzigen.
- KPI-strip, toolbar, dialogs en de rest van de app schalen niet mee.
- Eerste load van het board is niet trager: geen extra API-call, geen extra payload.
- Scrollen en cell-interactie blijven minstens even snel als nu (geen her-render van alle rijen bij het wijzigen van zoom).

**Non-goals:**
- Geen zoom van de hele app of van de browser.
- Geen zoom van de KPI-strip of andere pagina’s.
- Zoom niet opslaan in saved views of board-settings (geen extra persist-roundtrip).
- Geen per-kolom of per-cel zoom.
- Geen `transform: scale()` / CSS `zoom` op de tabel (breekt sticky kolommen en scroll).

**Constraints:**
- Geen negatief effect op laadsnelheid of algemene appsnelheid.
- Bestaande sticky headers/kolommen, `content-visibility` en vaste rijhoogtes blijven correct.
- UI-teksten Engels. Auth ongewijzigd.

## FRD

**Approach (gekozen):** één CSS-custom property `--po-table-zoom` **alleen** op de PO-tabelwrapper (`.frame`). Font-size, padding, rijhoogte, headerhoogte, control-kolom en kolombreedtes gebruiken `calc(basis * var(--po-table-zoom))`. De zoom-bediening in de topbalk schrijft localStorage en de module-store; de tabelwrapper past de CSS-var toe. Geen React zoom-state in de page- of board-tree.

Afgewezen: density-presets (te grof); CSS `zoom` / `transform: scale()` (breekt sticky kolommen en scroll, zie BRD).

**Happy path**
1. Gebruiker opent het purchase-order board (staff of leverancier).
2. De tabel is meteen compact: default **85%** in CSS, of de laatst gekozen schaal uit deze browser (localStorage). Geen extra API.
3. Rechts in de board-topbalk staat één compacte Fluent-groep: **−**, huidige **85%** als tekst, **+**. De topbalk zoomt niet mee.
4. − of + past de schaal aan in stappen van **5%**, bereik **75–110%**. De tabel (tekst, padding, rijen, headers, subitems, kolombreedtes) volgt direct via de CSS-variabele.
5. Als de schaal ≠ 85% verschijnt een **Reset**-knop; die zet terug naar 85%. Het percentage zelf is niet klikbaar.
6. De keuze blijft staan tot de gebruiker hem wijzigt. Volgende bezoek in dezelfde browser herstelt hem.

**Rollen:** staff (`admin`, `employee`) en leverancier (`supplier`) zien dezelfde bediening. Geen extra auth.

**Leeg:** zoom-control blijft in de topbalk. Empty state in de tabel schaalt mee. Geen aparte empty-copy voor zoom.

**Fout:** geen server. localStorage vol of geblokkeerd → zoom werkt deze sessie nog; persist faalt stil. Ongeldige opgeslagen waarde → fallback 85%.

**Overlap:** zoom is per browser, niet per gebruiker-account of saved view. Andere tab in dezelfde browser pikt de nieuwe waarde op bij herladen (geen live `storage`-sync). Twee gebruikers beïnvloeden elkaar niet.

**UI**
- Alleen `.frame` van de PO-tabel schaalt, niet KPI-strip, topbalk, dialogs, menus of popovers (Fluent portals blijven normale maat).
- Groep: `role="group"` `aria-label="Table zoom"`. Labels Engels: `Zoom out`, `Zoom in`, `Reset zoom to 85%`. Percentage als `Text` (`Table zoom {n}%` via aria op de groep).
- Knoppen `size="small"` `appearance="subtle"`, Fluent-iconen `SubtractRegular` / `AddRegular`. Geen Fluent `<Tooltip>` (wel `aria-label` + native `title`). − disabled op 75%, + disabled op 110%. Reset alleen zichtbaar als schaal ≠ 85%.
- `makeStyles` + `tokens.*` voor gap; geen hardcoded hex. Cluster `flexShrink: 0`.
- Geen Slider, geen portal in list-items, geen extra chrome in de 116px control-kolom.

**Zichtbaarheid:** alleen een schaalgetal; geen orderdata in storage. Key-naam zonder secrets.

**Hergebruik:** `PurchaseOrdersPageTopBar` (bediening), `purchaseOrdersBoardTableStyles` / `purchaseOrdersBoardRowsStyles` / `purchaseOrderBoardLayout` (maten via CSS-var), `getColumnCellStyle` (breedte als `calc`). Persist: `localStorage` als presentatievoorkeur (geen board-data, geen `board-settings`).

**Acceptatie**
- Eerste paint is 85% (of opgeslagen schaal), zonder flash naar 100%.
- − / + / Reset werken; 75% en 110% zijn harde grenzen. Reset ontbreekt bij 85%.
- Meer rijen én meer kolommen zichtbaar bij lagere zoom (CSS én row/column-window).
- Sticky header/kolommen blijven uitgelijnd.
- Network-tab: geen extra request bij load of bij zoom-wijziging.
- Geen data-refetch en geen zoom-`useState` in page/board. Window-slice en sticky-`left` mogen updaten (zelfde klasse als scroll/resize).

## TD

**Modules (geen JSX)**
- `src/utils/poTableZoom.js` + `src/utils/poTableZoom.test.js`, gesplitst:
  - Puur: `PO_TABLE_ZOOM_DEFAULT` (0.85), `MIN` 0.75, `MAX` 1.10, `STEP` 0.05, `clampPoTableZoom`, `parsePoTableZoom` (`Number` + `Number.isFinite`, daarna clamp; nooit de ruwe string), `poTableZoomedPx(n)`, `visualPxToStored(visual, scale)`.
  - Persist: `readPoTableZoom` / `writePoTableZoom` — schrijft alleen het geclampte getal; quota → stil.
  - PO-store (bewust dun, één board op de pagina): `getPoTableZoom` / `setPoTableZoom` / `subscribePoTableZoom` / `applyPoTableZoom(el)` / `resetPoTableZoomStoreForTests`. Geen React context. Generieke hooks importeren dit **niet**.
- `src/components/supplier/purchaseOrderBoardLayout.js` — `poTableZoomedPx` re-export of lokale wrapper; numerieke constanten blijven 100%-maten voor JS.

**CSS (alleen `.frame`)**
- `--po-table-zoom: 0.85` op `.frame` in `purchaseOrdersBoardTableStyles.js`.
- Font: `calc(${tokens.fontSizeBase300} * var(--po-table-zoom, 0.85))` (geen eigen px-typeramp). Hetzelfde patroon voor `lineHeight` waar die nu een token is.
- Layout-px (rij 32, sub 30, header 41, control 116, padding 2/10/10×12, `containIntrinsicSize`): `poTableZoomedPx`.
- Product-imagecelhoogte en skeleton-rijhoogte: dezelfde CSS-var (niet hard 32px laten staan).
- `PurchaseOrdersBoardTable.jsx`: callback-ref op `.frame` (niet `useEffect`) roept `applyPoTableZoom(el)` en `subscribePoTableZoom` → alleen `setProperty` op die node. Geen zoom-`useState`. Bestand blijft onder 300; geen extra logica buiten de ref.

**Bediening**
- Nieuw: `src/components/supplier/PurchaseOrderTableZoomControl.jsx` (<100 regels). Eigen `useState` alleen voor het label. `useCallback` voor − / + / reset. Roept `setPoTableZoom`; zet **geen** CSS-var zelf.
- `PurchaseOrdersPageTopBar.jsx`: één child in `headerRight`. Geen extra props, geen zoom-logica (blijft onder 10 props / 300 regels).

**Generieke hooks: `getScale` + `subscribeScale`, default schaal 1**
- `useBoardColumnWindow`: offsets in `update()` als `storedWidth * getScale()` (niet zoom in `useMemo`-deps / geen zoom-`useState`). `subscribeScale` hangt aan het bestaande scroll-effect (cleanup unsubscribe). `setRange` alleen bij gewijzigde slice. Tests: `computeBoardColumnWindow` met geschaalde offsets.
- `useBoardRowWindow` + `PurchaseOrdersBoardRows.jsx`: zelfde contract. `rowHeightPx` en `rowHeights` blijven 100%-maten. `handleMeasureExpanded` deelt visuele ResizeObserver-px door `getPoTableZoom()` bij opslag. De hook vermenigvuldigt constanten én `rowHeights` met `getScale()` voor spacers/`scrollTop`. Niet mixen van visuele en unscaled px in één array. `estimateExpandedExtraPx` blijft 100%-constanten. Zonder dit toont lagere zoom geen extra rijen.
- `useSequentialStickyColumns`: gemeten `left` is visuele px → `left: ${n}px`, niet × zoom. Fallback vóór meting: som van 100%-breedtes × `getScale()` op het moment van de memo, of wacht op `ResizeObserver` (die na zoom fired). Geen extra `useEffect` voor zoom; geen import van de PO-store als de caller `getScale` kan doorgeven. Hook blijft 2 effects.
- `ResizableTableHeaderCell`: optionele `getScale` (default `() => 1`). Startbreedte = opgeslagen `width`-prop (niet `getBoundingClientRect`). `next = start + deltaX / scale`. Persist unscaled; CSS-preview via `poTableZoomedPx`. min/max 80–1000 unscaled. Callers: `PurchaseOrdersBoardHeaderRow` en `PurchaseOrdersSubitemsTable` geven `getPoTableZoom` door. Sticky-wrapper `usePurchaseOrdersBoardStickyColumns` geeft `getScale` door.

**Kolombreedtes / sticky left op cellen**
- `getColumnCellStyle`: width/min/max als `poTableZoomedPx(width)`.
- `PurchaseOrderDataCell` / header / totals: `stickyLeft` uit meting blijft `${n}px`.

**Niet wijzigen**
- Geen nieuwe routes, geen `board-settings`, geen saved-view JSON, geen SQL.
- Geen zoom-state in `usePurchaseOrdersPage` / `PurchaseOrdersPage`.
- Geen CSS `zoom` of `transform: scale()` op tabel/sticky cellen.
- Generieke hooks importeren `poTableZoom.js` niet.
- KPI-strip, dialogs, menus, popovers: ongewijzigd.
- `PurchaseOrderSubitemLineRow.jsx` (al >300): geen extra JSX/state; alleen bestaande style-hoogte via CSS-var als die al via `getProductImageCellStyle` loopt.

**Auth / schema:** geen. localStorage is presentatievoorkeur. `parsePoTableZoom` weigert non-finite; CSS-var krijgt alleen het getal (geen ruwe storage-string).

**Volgorde**
1. Pure parse/clamp + persist + store + tests.
2. `poTableZoomedPx` + styles (tokens voor font, px-helper voor layout) + column width.
3. `getScale` op row-window, column-window, resize, sticky fallback; BoardRows schat hoogtes × scale.
4. Frame callback-ref + ZoomControl in topbalk.
5. PATCH `src/config/version.js`.

**Perf**
- Geen `apiRequest`, geen extra payload. Geen zware client-berekening (geen nieuw `measure()`).
- Zoom-klik: clamp → storage → notify → `setProperty` op `.frame`. Geen page-state.
- Toegestane React-updates: column/row-window `setRange` als de slice wijzigt; sticky `left` via bestaande `ResizeObserver`. Geen data-refetch, geen unmount van de row-lijst als de slice gelijk blijft.
- `content-visibility` / `containIntrinsicSize` volgen de gezoomde rijhoogte.

**Grootte:** ZoomControl eigen bestand. TopBar alleen +1 child. BoardTable alleen ref-subscribe. Geen JSX in utils.

**Aantoonbaar:** `http://localhost:5178` PO-board: first paint 85% of opgeslagen schaal; − / + / Reset; meer rijen én kolommen; sticky uitgelijnd; Network geen extra call; geen refetch bij zoom.

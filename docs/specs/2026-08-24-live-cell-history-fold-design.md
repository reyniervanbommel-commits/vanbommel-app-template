# Live history-hoekje na celwijziging

## BRD

**Als** staff (admin of employee) op het purchase-orderboard
**wil ik** meteen het history-hoekje zien nadat ik een cel heb opgeslagen
**zodat** ik zonder page refresh weet dat de wijziging in de celhistorie staat.

**Probleem nu:** na een celwijziging staat de nieuwe waarde direct in de cel, maar het omgevouwen history-hoekje rechtsboven verschijnt pas na een page refresh. De historie is op de server al weggeschreven; alleen de client-vlag `historyByColumnId` wordt niet bijgewerkt. Staff denkt daardoor dat de wijziging niet in de celhistorie zit en ververst extra.

**Succes (toetsbaar):**
- Na een geslaagde celwijziging (custom save of D365-write-back) verschijnt het hoekje op die cel zonder page refresh.
- Het hoekje verschijnt in dezelfde render als de nieuwe waarde.
- Klik opent de bestaande history-popover.
- Bij een mislukte save blijft het hoekje weg, of verdwijnt het weer (rollback samen met de waarde).
- Geen extra netwerkcall en geen board-herlaad voor dit hoekje.

**Non-goals:**
- Geen board-herlaad of extra history-API na elke save.
- Geen nieuw hoekje-ontwerp en geen andere popover.
- Geen write-back-rechten voor leveranciers.
- Geen live hoekje op formulecellen die alleen indirect meeveranderen (die volgen bij refresh, tenzij later bewust toegevoegd).
- Geen wijziging aan wanneer history-indicators aan of uit staan.

**Constraints:**
- Bestaande history-hoekjes en popover blijven werken, ook voor leveranciers die alleen kijken.
- Track-change-stipjes blijven direct updaten zoals nu.
- Bij een mislukte save: waarde én hoekje terug naar de vorige staat.
- Geen extra API-calls of board-refresh; de save-call die er al is blijft de enige write.
- Session-cache en revisie-check blijven de bron van waarheid bij tab-terugkeer (dan komt history alsnog uit SQL).
- Auth en write-back-regels blijven ongewijzigd: alleen staff schrijft terug naar D365; leveranciers krijgen geen `POST /correct`.

## FRD

**Gekozen approach:** A — optimistic patch van `historyByColumnId` in dezelfde state-update als de nieuwe celwaarde. Patroon: `withRightmostMarkRed` in `src/hooks/usePurchaseOrdersPage.js`.

**Afgewezen:**
- B — vlag uit de save-response: hoekje komt pas ná de netwerkronde, later dan de waarde.
- C — board of history herladen na save: extra load, breekt de BRD-snelheidseis.

**Happy path**
1. Staff wijzigt een header- of regelcel (custom save of D365-write-back).
2. De waarde is alleen opgeslagen als die écht wijzigt (bestaande `EditableCell`/`WriteBackCell`-guard).
3. In dezelfde optimistic update als de nieuwe waarde krijgt die cel `historyByColumnId[columnId] = true`.
4. Het bestaande omgevouwen hoekje verschijnt rechtsboven, zonder page refresh.
5. Klik opent de bestaande `CellHistoryPopover`; die laadt history pas bij openen (ongewijzigd).

**Rollen:** alleen staff (admin + employee) triggert het live hoekje via save/correct. Leveranciers blijven bestaande hoekjes zien; zij krijgen geen write-back en geen wijziging van data-rechten.

**Leeg:** history-indicators uit → geen hoekje, ook niet na save. Cel had al history → hoekje blijft staan. Geen nieuw empty-state-scherm.

**Fout:** save of correct faalt → rollback van waarde én `historyByColumnId` naar de vorige staat (zelfde `previousOrders` / `previousLines` als nu). Geen extra fouttekst voor het hoekje; bestaande save-fout blijft.

**Overlap:** twee gebruikers: de ander ziet het nieuwe hoekje pas na refresh of revisie-herlaad. Geen live-sync. Session-cache blijft SQL als bron bij tab-terugkeer.

**UI:** bestaand hoekje en popover. Engels. Geen nieuwe portal-componenten in de cellijst. Geen nieuw icoon of copy.

**Zichtbaarheid:** dezelfde `showHistoryIndicators`-toggle als nu. Geen extra velden in de UI. Leveranciers zien geen write-back-editor.

**Hergebruik:** `saveValue` en `correctField` in `src/hooks/usePurchaseOrdersPage.js`; `applyLineValues` voor regels; `CellHistoryPopover` ongewijzigd. Nieuwe pure helper `withHistoryFlag` in `src/utils/` (niet lokaal in de hook).

## TD

**Hergebruik (paden):**
- Optimistic save: `saveValue` en `correctField` in `src/hooks/usePurchaseOrdersPage.js` (header via `setOrders`, regel via `applyLineValues` / `restoreLines` uit `src/hooks/usePurchaseOrderLineDetails.js`).
- Track-marks-patroon: lokale helper `withRightmostMarkRed` in hetzelfde hook-bestand — zelfde plek, zelfde rollback.
- UI ongewijzigd: `src/components/supplier/CellHistoryPopover.jsx` leest `hasHistory`; header via `src/components/supplier/PurchaseOrderHeaderCellContent.jsx`, regels via `src/components/supplier/PurchaseOrderSubitemLineRow.jsx` (`historyByColumnId[column.id]`).
- Mapping blijft: `src/utils/purchaseOrdersBoardMapping.js` vult ontbrekende maps aan met `{}`.

**Nieuw:**
- `src/utils/withHistoryFlag.js` — pure helper `withHistoryFlag(existing, columnId)`. Muteert de input niet. Zet `String(columnId)` op `true` (zelfde key-vorm als `buildHistoryByCell` in `server/services/TableDataService.js`). Als de vlag al true is: dezelfde map-referentie terug (geen nutteloze nieuwe map; de rij is al nieuw door `values`). Ontbrekende map → nieuw object `{ [colKey]: true }`. Vier bestaande patches houden hun eigen spread; geen extra optimistic-row-builder in deze feature.
- `src/utils/withHistoryFlag.test.js` — cases: lege map, bestaande andere kolommen, al-true (zelfde referentie), number vs string id.
- Aanroep in de vier optimistic patches (save header, save line, correct header, correct line), in hetzelfde object dat al `values` en `trackMarksByColumnId` zet:
  `historyByColumnId: withHistoryFlag(row.historyByColumnId, columnId)`.
- `src/config/version.js` — PATCH +1.

**Niet wijzigen:** `CellHistoryPopover`, board-read, `saveCustomValue` / `correctField` op de server, `boardSessionStore`, auth/middleware, write-back-disable voor suppliers in `src/components/supplier/PurchaseOrdersPageContent.jsx`.

**Schema:** geen nieuwe tabel, kolom of JSON-property. History blijft in `tb_cell_history` / `tb_field_corrections`; de client-vlag is afgeleid, niet persistent.

**Auth:** geen nieuwe routes. Bestaande `PUT /data/purchase-orders/value` en `POST /data/purchase-orders/correct` blijven achter `restrictSupplierDataAccess` (`server/middleware/dataAccess.js`): suppliers 403 op beide. Client-vlag verandert dat niet.

**Volgorde:**
1. Helper + unit tests (rood → groen).
2. Helper inpluggen in `saveValue` en `correctField`.
3. Versienummer. Geen migratie, geen endpoint.

**Perf:** geen extra `apiRequest`, geen board-read, geen tweede `setOrders` voor het hoekje. `applyFormulaValuesToOrder` spreidt `...order` en overschrijft alleen `values`; een eerder gezette history-vlag blijft staan. Session-cache wordt niet per cel-edit bijgewerkt (te zwaar); bij tab-terugkeer volgt revisie-mismatch (`maxCustomValueAt`) een volledige read. Meetpunt blijft de bestaande `apiRequest` op save/correct.

**Grootte:** `usePurchaseOrdersPage.js` is al groot; de helper gaat naar `src/utils/` zodat de hook niet groeit met testduplicatie. Geen nieuw React-component. `CellHistoryPopover` blijft onder 300 regels.

**Versie:** footer via `src/config/version.js` (nu `v1.51.46`).

**Aantoonbaar:**
- Cel zonder history bewerken → hoekje zichtbaar zonder refresh; klik opent bestaande popover.
- Save forceren tot fout → waarde én hoekje terug.
- Cel die het hoekje al had → blijft.
- History-indicators uit → geen hoekje na save.
- Helper-tests groen met `npm test`.


# Header-edit van gepushte D365-line-waarden

## BRD

**Als** staff (admin of employee) op het purchase-orderboard
**wil ik** een header-kolom die via *Push values to header column* is gevuld vanuit een D365-writable line-kolom inline kunnen wijzigen
**zodat** ik de nieuwe waarde in één keer naar D365 terugschrijf op **alle regels** van die order, zonder elke subregel open te klappen en los te bewerken.

**Probleem nu:** *Push values to header* maakt een aparte custom header-kolom die unieke regelwaarden toont (één waarde, of eerste waarde plus `+N` bij verschillen). Die header-cel is read-only. Write-back bestaat alleen op de line-rij (`PurchaseOrderWriteBackCell` + `correctField` per `LineNumber`). Wie dezelfde D365-waarde op alle regels van een order wil zetten, moet de order expanderen en regel voor regel patchen. Op de gepushte header-kolom is *Enable sync* niet beschikbaar, omdat het een custom kolom zonder `d365Field` is.

**Succes (toetsbaar):**
- Bron-line-kolom heeft write-back aan → de gekoppelde header-cel is bewerkbaar (zelfde soort inline editor als line write-back).
- Opslaan vanaf die header schrijft de nieuwe waarde naar **alle** D365-regels van die ene order, ook als de header `+N` toont omdat de regels nu verschillende waarden hebben.
- Na succes toont de header één waarde (geen `+N` meer) en komen de line-cellen (na expand of herladen) overeen met die waarde.
- Bron-line-kolom heeft write-back uit, of de header is niet via *Push values* gekoppeld → gedrag ongewijzigd (read-only rollup of bestaande header-editor).
- Leveranciers zien geen header-write-back (zelfde staff-gate als nu).
- Line-write-back na expand blijft werken, onafhankelijk van de header-proxy.
- Selectie van meerdere orders triggert **geen** bulk over andere POs: alleen de order van de bewerkte cel.

**Non-goals:**
- Geen bewerken van *Push total to header*-cellen (geen terugverdelen van een totaal over regels).
- Geen *Enable sync* / `writable` op de custom header-kolom zelf: write-back blijft via de bron-line-kolom (`columnId` + D365 line-entity).
- Geen atomair alles-of-niets: als één regel faalt, worden geslaagde D365-patches van die order niet teruggedraaid.
- Geen bulk-fan-out over andere geselecteerde orders (bestaande header-bulk-dialoog geldt hier niet).
- Geen wijziging aan *Push values to header* als koppelactie (nieuwe custom kolom + link blijft).
- Geen write-back voor leveranciers.
- Geen nieuw generiek D365-bulk-endpoint buiten het purchase-order line-pad.

**Constraints:**
- UI Engels (labels, foutmeldingen, `aria-label`).
- Auth ongewijzigd: `requireSession`; write-back alleen staff (`onCorrect` alleen als `isStaff`); leveranciers blijven via `disableWriteBack`.
- Bestaande per-regel D365-PATCH + optimistic concurrency (`basedOnValue` / etag) blijft de bron van waarheid; de header is een proxy, geen tweede D365-header-veld.
- Board-payload heeft nu alleen ontdubbelde `linkedLineValues`, geen line numbers; de oplossing mag de hot path niet extra belasten met een details-fetch per zichtbare rij.
- Componenten ≤300 regels; `PurchaseOrderWriteBackCell.jsx` en `PurchaseOrderHeaderCellContent.jsx` bij uitbreiding splitsen.
- Fluent v9 tokens; geen extra portal-componenten in herhaalde header-cellen van de virtuele lijst.
- OTAP local-first: ontwikkelen op localhost, geen push zonder verzoek.

**Grill-beslissingen:**
- Rol = staff (admin + employee).
- Scope = alleen gepushte values-kolommen waarvan de **bron-line-kolom** D365-write-back aan heeft.
- Bij `+N` verschillende regelwaarden: header-edit overschrijft **alle** regels van die order, zonder extra bevestiging alleen vanwege mixed values.
- Alleen de order van de cel; geen hergebruik van de selectie-bulk-dialoog.
- Non-goals = geen push-total-edit, geen sync-toggle op de custom header, geen rollback van geslaagde line-patches.

## FRD

**Gekozen approach:** A — één staff-only `apiRequest` bij save vanaf de header. De server zoekt alle detailregels van die ene PO in `tb_cache` en schrijft per regel terug via het bestaande `correctField` → `writeBackField`-pad (D365 line-entity, etag/`basedOnValue` per regel). De board-payload krijgt geen line numbers; er is geen details-fetch per zichtbare rij.

**Afgewezen:**
- B — client laadt bij save de details (`readRowDetails` / `loadLines`) en roept N× `POST /correct` aan. Afgewezen: N round-trips, extra details-payload op het save-pad, en twee bronnen van waarheid voor line numbers (client vs cache).
- C — hybrid: expanded → N× `/correct`, anders server-fan-out. Afgewezen: twee codepaden voor hetzelfde gedrag, zonder winst op de hot path.

**Happy path**
1. Staff ziet een header-kolom die via *Push values to header* gekoppeld is aan een line-kolom met write-back aan. De cel toont de eerste unieke regelwaarde; bij meerdere unieke waarden blijft de `+N`-badge zichtbaar. De cel is een inline write-back-editor (zelfde editorfamilie als de line-cel: tekst, datum of enum-keuze), niet de huidige read-only `PurchaseOrderLinkedValueCell`.
2. Staff wijzigt de waarde en blurt / Enter. Geen extra bevestiging, ook niet bij `+N`.
3. De header-cel toont een spinner en blijft de oude rollup tonen tot de hele fan-out klaar is.
4. Server: alle detailregels van `(dataAreaId, orderNumber)` voor de **bron-line-kolom**. Regels waarvan de huidige waarde al gelijk is aan de doelwaarde worden overgeslagen (geen D365-PATCH). Overige regels: `correctField` met die regel’s eigen `basedOnValue` (cache/D365-waarde van de regel, niet de header-string).
5. Alle PATCH’en slagen (of alles was skip): de header toont de nieuwe waarde **zonder** `+N`. Als de order al expanded is, tonen de line-cellen dezelfde waarde. `linkedLineValues` op die order wordt lokaal bijgewerkt naar één waarde.
6. Leveranciers en niet-writable bronkolommen: ongewijzigd read-only rollup.

**Rollen:** alleen staff. `onCorrect` / de nieuwe fan-out-handler wordt alleen doorgegeven als `isStaff` (`PurchaseOrdersPageContent.jsx`). Leveranciers: `disableWriteBack` blijft; geen editor op de gepushte header. Server: bestaande session-auth; zelfde schrijfrechten als `POST …/correct`.

**Leeg:**
- Order zonder detailregels, of alleen lege waarden: geen PATCH, geen fout; de cel blijft `-` / leeg.
- Alle regels hebben de doelwaarde al: 0 PATCH’en, spinner kort, header toont die ene waarde, geen fout.
- Order `removedInD365`: geen editor; bestaande doorhaling blijft.

**Fout:**
- Businessfout per regel (409 conflict, 404, D365-veldvalidatie): geslaagde patches blijven staan. Server gaat door naar de volgende regel. HTTP 200 met counts; header: fout-icoon + *Write-back failed on N of M lines*; rollup/`+N` volgt resterende unieke waarden. Invoer volgt die rollup, niet de ingetikte doelwaarde.
- Infra/onbekend (502/504/timeout/SQL): **stop** de resterende PATCH’en. Als nog geen regel is bijgewerkt: zelfde `next(err)` als `/correct` (geen 200, geen driver-tekst naar de client). Als er al regels slaagden: HTTP 200 met generieke failed-tekst voor de rest, geen stack/OData-body.
- Te veel regels om te patchen (boven harde cap, zie TD): 400 vóór de eerste PATCH.
- 401: bestaande `apiRequest`-sessie-afhandeling.
- Dubbel blur/Enter tijdens spinner: tweede commit genegeerd tot de eerste klaar is.
- Kolom niet writable / geen line-link / header-`columnId` i.p.v. line-`columnId`: 400, geen D365-call.

**Overlap:** twee tabs of twee staff-users op dezelfde PO: per-regel etag/`basedOnValue` zoals nu. De header is geen D365-header-veld; er is geen extra race op een custom kolom. Board-read erna toont opnieuw de echte unieke regelwaarden.

**UI:**
- Zelfde visuele write-back-cel als op de regel (merk-kleur, spinner, ✓, fout-icoon). `+N`-badge blijft ernaast zolang er meerdere unieke waarden zijn.
- Geen extra `Dialog` en geen hergebruik van de selectie-bulk-dialoog.
- Geen extra `Tooltip` in de virtuele rijenlijst voor de `+N`-lijst bovenop wat `PurchaseOrderLinkedValueCell` al doet; de editor zelf gebruikt de bestaande fout-`Tooltip` van `PurchaseOrderWriteBackCell` (één cel, geen lijst).
- Alle nieuwe strings Engels. Voorbeeld `aria-label`: `{column label} for order {orderNumber} (write back to D365 on all lines)`.

**Zichtbaarheid:** dezelfde waarden als line write-back; geen extra velden in de header-payload. Audit blijft `tb_field_corrections` **per regel**, niet één header-rij.

**Hergebruik:**
- Weergave/editor: `PurchaseOrderWriteBackCell.jsx` (niet een tweede editor).
- Koppeling: bestaande `lineValueHeaderLinks` + `linkedLineValueByHeaderKey`; uitbreiden met writable-meta van de bron-line-kolom.
- Save: nieuwe server-fan-out die intern `correctField` herhaalt; client via `apiRequest` (één call, `Server-Timing` / bestaande timing).
- Geen nieuwe SQL-tabel of kolom; geen `writable` op de custom header-kolom.

**Acceptatiecriteria:**
- Writable bron-line + push-link → header-cel is bewerkbaar; anders niet.
- Save bij één unieke waarde én bij `+N` → alle niet-gelijke regels van die PO gepatcht; andere POs onaangeroerd.
- Volledig succes → header één waarde, geen `+N`.
- Deel-fout → foutmelding op de header, geen rollback, rollup volgt resterende verschillen.
- Reeds gelijke regels → 0 extra PATCH voor die regels.
- Leverancier → geen editor.
- Expanded lines na succes → dezelfde nieuwe waarde.
- UI-teksten Engels.

## TD

### Hergebruik en nieuwe eenheden

| Pad | Rol |
|-----|-----|
| `POST /api/data/:tableKey/correct` | Bestaande per-regel write-back. **Niet** vanaf de header: `executeWithBulkOption` ziet `lineNumber === null` als bulk over geselecteerde **orders**. |
| `TableDataService.correctField` | Intern per regel vanuit de fan-out. |
| `D365ODataService.writeBackField` | Ongewijzigd. Export/`normalizeComparableValue` tillen naar `server/utils/odataValueEquals.js` zodat skip-gelijk dezelfde comparator gebruikt (nu privé). |
| `PurchaseOrderWriteBackCell.jsx` (~261) | Eerst datum-helpers naar `writeBackDateUtils.js`. Geen extra `useState`. Reject met `err.remainingDisplayValue` in bestaande catch. |
| `PurchaseOrderLinkedValueCell.jsx` | `+N`-badge ernaast, niet in de WriteBackCell-boom. |
| Live board-links | `usePurchaseOrdersBoardLinks.js` (dit is wat `PurchaseOrdersBoardTable` importeert). `usePurchaseOrderBoardView.js` voor de rollup-formatter. `usePurchaseOrdersBoardLineLinks.js` is **niet** het live pad — dezelfde `linkedLineValueMeta.js`-builder gebruiken of de dode hook laten wijzen naar die builder. |
| `usePurchaseOrdersPage.js` (~1417) | Alleen een smalle `patchLinkedLineValues(dataAreaId, orderNumber, headerKey, remainingValues)` (~10 regels, immutable `{ ...order, linkedLineValues: { ... } }`, zelfde patroon als `applyFormulaValuesToOrder`). Geen fan-out, geen `apiRequest`. |
| `PurchaseOrderHeaderCellContent.jsx` (~255, **al 13 props**) | Linked-tak naar `PurchaseOrderLinkedHeaderValue.jsx`. **Geen** 14e named prop. `onCorrectAllLines` zit op het bestaande `cellActions`-object in `PurchaseOrdersPageContent.jsx` (niet `usePurchaseOrdersBoardTableProps` — die hook is geen live pad). HeaderCellContent leest `actions.onCorrectAllLines`. |

Nieuwe bestanden: `server/utils/detailCorrectionFanout.js` (+ test; **importeert geen** TableDataService/D365-service — comparator als argument of via `odataValueEquals.js`), `src/hooks/usePurchaseOrderCorrectAllLines.js` (+ test), `src/utils/linkedLineValueMeta.js` (+ test), `src/utils/writeBackDateUtils.js`, `src/components/supplier/PurchaseOrderLinkedHeaderValue.jsx`.

### Endpoint

`POST /api/data/:tableKey/correct-all-details` in `server/routes/data.js`. Mount: `requireSession` + `restrictSupplierDataAccess`. Supplier-POST niet op allowlist → **403**. 403-test in `server/middleware/dataAccess.test.js` (niet in de router-testapp zonder die middleware).

Body: `columnId` (bron-line), `partitionKey`, `recordKey`, `value`. Geen client-`basedOnValue`. `columnId` via bestaande `toColumnId`; kolom `tableId === table.id`.

400 vóór D365:

- `tableKey === 'purchase-orders'`
- kolom actief, `scope === 'detail'`, `source === 'source'`, `writable`, `writeMechanism === 'patch'`, `sourceField`
- partition/record lengtelimieten zoals `correctField`
- aantal **te patchen** regels (niet-skip, niet-removed) > **200** → 400 *Too many lines to write back from the header.*

SQL: `SELECT detail_key, data_json, removed_at_source FROM dbo.tb_cache` met parameters, `scope = 'detail'`, order-keys. **Geen** `WITH (NOLOCK)` op dit write-pad (`basedOnValue` mag geen dirty read zijn). `removed_at_source = 1` skip.

Loop in `time('tb_correct_all_details')`, sequentieel:

1. Skip als waarde gelijk (gedeelde comparator).
2. Anders `correctField(..., basedOnValue: cachedValue)`.
3. `status` 409/404 of D365-validatie → `failures[]` met bestaande veilige `err.message`, doorgaan.
4. 5xx/timeout/SQL → **stop**. `updated === 0` → `next(err)` (errorHandler, geen internals). `updated > 0` → HTTP 200, resterende als generieke *Write-back to D365 failed*, geen OData-body.

HTTP 200 alleen na een **afgeronde** fan-out van businessfouten (of vroege stop ná minstens één succes met generieke tekst). `remainingValues` = unieke waarden uit de **in-memory** snapshot ná de pass (geslaagde regels → doelwaarde; skipped/failed → oude cachewaarde). Geen tweede cache-query in de pure util.

Response: `{ attempted, updated, skipped, failed, failures: [{ detailKey, message }], remainingValues, updatedDetailKeys }` — `failures` max 200.

### Client dataflow

1. `buildLinkedLineValueByHeaderKey(lineColumns, links, { isStaff })` → `{ lineColumnKey, lineColumnId, lineDataType, lineColumnLabel, writableToD365, lineColumnOptions, lineColumn }`. `lineColumn` = bestaande array-entry. `writableToD365` alleen als `isStaff && lineColumn?.writableToD365 && lineColumn?.d365Field`.
2. Builder in **drie** call sites: `usePurchaseOrdersBoardLinks` (live tabel), `usePurchaseOrderBoardView`, `usePurchaseOrdersBoardLineLinks`.
3. `PurchaseOrderBoardCell` geeft geen extra HeaderCell-prop; `cellActions.onCorrectAllLines` in de bestaande `cellActions`-`useMemo` van `PurchaseOrdersPageContent.jsx`. Hook alleen daar instantiëren (niet in `PurchaseOrdersPage.jsx`).
4. `PurchaseOrderLinkedHeaderValue` — **één** contract, 8 props: `{ order, headerColumnKey, meta, onCorrectAllLines, cellBackgroundColor, isConditionalFormat, hasHistory, cellKeys }`. `meta.lineColumn` is de bestaande `lineColumns`-entry (geen per-cel-kloon, geen aparte `lineColumn`/`preview`-prop). Preview in het component via `getLinkedLineValuePreview(order.linkedLineValues[headerColumnKey], …)`.
5. `usePurchaseOrderCorrectAllLines({ patchLinkedLineValues, applyLineValuesBatch })` returnt **alleen** `{ onCorrectAllLines }`. Geen page-level `loading`/`error`. POST in de callback, geen `useEffect`.
6. `onCorrectAllLines` clonet de order **immutable** via `patchLinkedLineValues`. Expanded lines: één `applyLineValuesBatch` in `usePurchaseOrderLineDetails.js`.
7. Rollup altijd `response.remainingValues` (ook bij `failed === 0`). Lege PO → `remainingValues: []`, cel blijft `-`. `failed > 0`: reject met `remainingDisplayValue = remaining[0]`. HTTP 5xx (`updated === 0`): throw, oude value.
8. Dubbele commit: `status === 'saving'`.

### Schema / JSON

Geen nieuwe SQL-tabel/kolom. Geen `writable` op de custom header. Audit per regel via `correctField`.

### Auth en privacy

- Session + supplier 403 (middleware). Service extra: `role` admin/employee, anders 403 — niet alleen mount-volgorde.
- Geen privilege-eis dat de kolom een actieve push-link heeft (zelfde macht als N× `/correct`).
- `value` via `correctField`; SQL parameters; geen secrets; geen ruwe D365-bodies.

### Volgorde (bouw)

1. `odataValueEquals.js` + `detailCorrectionFanout` + tests.
2. `correctAllDetailFields` + route + `dataAccess.test.js` (403) + 400-tests (`toColumnId`, cap).
3. `writeBackDateUtils`; WriteBackCell catch-uitbreiding.
4. `linkedLineValueMeta` in de drie hooks.
5. `patchLinkedLineValues` + `applyLineValuesBatch` (smal) + `usePurchaseOrderCorrectAllLines`.
6. Header split; `cellActions`.
7. `src/config/version.js` PATCH +1.

### Perf

- Board-read: geen extra query, geen line numbers.
- Save: één `apiRequest`; `time('tb_correct_all_details')`; sequentieel max 200 PATCH.
- `onCorrectAllLines` stabiel; geen page-saving-state.
- Badge niet in WriteBackCell (geen extra nesting/portal in de input-boom).

### Grootte

| Bestand | Nu | Actie |
|---------|----|--------|
| HeaderCellContent | ~255, 13 props | Split linked-tak; handler via `actions`, geen 14e prop. |
| WriteBackCell | ~261 | Datum-extractie eerst; geen 5e `useState`. |
| usePurchaseOrdersPage | ~1417 | Alleen `patchLinkedLineValues`. |
| usePurchaseOrderBoardView | ~306 | Alleen builder-call, geen extra reducer. |
| TableDataService | groot | Alleen orchestratie-loop; util blijft puur. |

### Versie

`src/config/version.js` PATCH +1.

### Aantoonbaar

- Staff + writable push: header-input; succes → één waarde, geen `+N`; order-ref nieuw (rollup zichtbaar zonder expand).
- `+N` → alle regels overschreven; badge weg.
- 409 op één regel → 200, fout-icoon, resterende mixed.
- 502 vóór enig succes → geen 200, generieke fout, oude rollup.
- >200 te patchen regels → 400, 0 PATCH.
- Leverancier: 403 + read-only (writable geforceerd uit).
- Multi-select: geen bulk-dialoog.
- Vitest: skip/fail-aggregatie; builder writable-vlag; hook stuurt line-`columnId`; BoardCell geen extra Header-prop.
- Lokaal: `http://localhost:5178`.

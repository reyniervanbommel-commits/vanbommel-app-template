# Bulk write-back: per-rij uitkomst en retry bij mislukte rijen

## BRD

**Als** staff (admin of employee) die bulk-edit gebruikt op een D365-writable kolom
**wil ik** na een bulk-wijziging per geselecteerde rij zien of de write-back naar D365 is gelukt of mislukt (met de foutmelding), en mislukte rijen los of allemaal tegelijk opnieuw kunnen proberen
**zodat** ik niet handmatig rij voor rij hoef te zoeken welke van de N gewijzigde rijen zijn mislukt, en ze direct kan herstellen zonder de hele bulk-actie te herhalen.

**Probleem nu:** `usePurchaseOrderBulkEdit.js` voert bulk-wijzigingen sequentieel uit en **stopt bij de eerste fout** (`runBulkUpdate`, regel 114-147) — een bewuste YAGNI-beslissing uit [`docs/devops/202-bulk-edit-geselecteerde-rijen.md`](../devops/202-bulk-edit-geselecteerde-rijen.md) ("geen atomariteit vereist, bescheiden selecties"). Bij een fout op rij 5 van 20 worden rijen 6 t/m 20 helemaal **niet geprobeerd** ("not attempted"), en de gebruiker krijgt één samengevatte tekst (`createBulkErrorMessage`): *"Bulk edit stopped due to an error. Updated: 4. Skipped: 0. Not attempted: 15."* — zonder te zeggen wélke rij faalde of waarom. Single-cell write-back (`PurchaseOrderWriteBackCell.jsx` → `correctField` in `usePurchaseOrdersPage.js` → `D365ODataService.writeBackField`) heeft al volledige optimistic-concurrency (ETag/`If-Match`, 409 bij conflict) en toont de fout inline op die ene cel — maar die per-cel-UX bereikt de andere N-1 rijen van een bulk-actie niet. Bovendien geeft `writeBackField` voor elke D365-PATCH-fout die geen 409/404 is (bijv. een veldvalidatiefout of een vergrendeld record) nu altijd dezelfde generieke tekst `"Write-back to D365 failed"` terug — de echte OData-foutdetail van D365 wordt gelogd maar nooit naar de client doorgegeven, terwijl de helper daarvoor (`summarizeODataFailure`) al bestaat en elders al wordt gebruikt.

**Succes (toetsbaar):**
- Bulk-edit op een D365-writable kolom (`write_mechanism = 'patch'`) loopt door **alle** geselecteerde zichtbare rijen heen, ook na een fout op een tussenliggende rij — geen "not attempted"-rijen meer voor dit pad. Dit vervangt AC #9 van `docs/devops/202-bulk-edit-geselecteerde-rijen.md` **specifiek voor het `correct`-pad** (D365 write-back); het `save`-pad (niet-D365 kolommen) behoudt AC #9 ongewijzigd.
- Na afloop, als 1 of meer rijen zijn mislukt: de summary-dialoog toont per mislukte rij het PO-nummer (`dataAreaId|orderNumber`) en de foutmelding (Engels), met een **Retry**-knop per rij.
- Een **Retry all failed**-knop probeert alle nog-mislukte rijen opnieuw, sequentieel, via hetzelfde write-back-pad als de oorspronkelijke poging.
- Een rij die bij retry slaagt, verdwijnt uit de mislukte-lijst; de teller in de samenvattingstekst wordt bijgewerkt.
- Een D365-validatiefout of vergrendeld record toont de echte D365-foutdetail, niet langer de generieke tekst voor elke niet-conflict-fout.
- Bulk-edit zonder enige mislukking gedraagt zich ongewijzigd: de dialoog sluit stil (geen extra chrome op het happy path).
- Bulk op een niet-D365 kolom (`saveValue`) gedraagt zich ongewijzigd: stop-on-first-error, bestaande samenvattingstekst, geen retry-lijst.
- Alle nieuwe/gewijzigde UI-teksten zijn Engels.

**Non-goals:**
- Geen wijziging aan het `saveValue`-bulkpad (niet-D365 custom `tb`-kolommen): blijft stop-on-first-error met de bestaande samenvattingstekst. De problemen die deze feature oplost (D365-conflicten, vergrendelde records) bestaan daar niet op dezelfde manier.
- Geen nieuw backend bulk-endpoint en geen transactie/atomariteit over meerdere rijen — blijft één `POST /api/data/:tableKey/correct`-aanroep per rij, zoals nu. De #202-beslissing tegen een bulk-endpoint blijft staan; alleen "stop bij de eerste fout" wordt "ga door en verzamel per rij".
- Geen wijziging aan `PurchaseOrderWriteBackCell.jsx` (staat al op 261 regels; het eigen ontwerpdocument [`2026-08-24-d365-writeback-enum-choices-design.md`](2026-08-24-d365-writeback-enum-choices-design.md) zegt al expliciet "bij uitbreiding eerst splitsen"). De retry-UI leeft volledig in de bulk-edit-dialoog, niet in de cel.
- Geen automatische of achtergrond-retry (geen polling, geen auto-retry na X seconden) — retry is altijd een expliciete klik.
- Geen zoek/filterveld in de mislukte-rijenlijst — de lijst ís al de mislukte subset, begrensd door de oorspronkelijke (bescheiden) selectie.
- Geen wijziging aan `write_mechanism = 'action'` (bound D365-acties): dat pad is nu al niet geïmplementeerd in `correctField` — elke kolom met een ander mechanisme dan `'patch'` geeft nu al 400 *"This column is not configured for write-back to D365"*. Buiten scope.
- Geen wijziging aan het `tb_field_corrections`-schema. Elke poging (ook een retry) blijft een eigen `pending → applied/failed`-audit-rij, zoals vandaag — geen koppeling tussen pogingen nodig voor dit feature.
- Geen live voortgangsteller tijdens een retry-batch (die bestaat wél tijdens de eerste bulk-pass, ongewijzigd) — retry toont alleen een bezig-status tot de batch klaar is.
- Verdwijnt een mislukte rij tijdens de open summary-dialoog uit de gefilterde boardweergave (gebruiker wijzigt het filter): geen speciale foutafhandeling nodig. Retry gebruikt de bij de mislukking vastgelegde payload, geen live board-lookup (zie FRD, afgewezen optie B) — de rij blijft gewoon in de lijst staan en retry werkt door.

**Constraints:**
- UI Engels (labels, foutteksten, `aria-label`).
- Componenten ≤300 regels; zie TD voor concrete regelbudgetten per bestand.
- Geen `<Tooltip>` in de mislukte-rijenlijst (herhaalde rijen) — native `title`-attribuut, zoals `PurchaseOrderHiddenRowsPanel.jsx` en `PurchaseOrderErrorDialog.jsx` al doen (`.cursor/rules/fluentui-valkuilen.mdc`).
- Geen extra `apiRequest` bovenop wat er al conceptueel was: nog steeds precies één `correctField`-aanroep per rij per poging (eerste pas of retry) — geen polling, geen nieuw bulk-status-endpoint.
- Fluent v9 tokens, geen hardcoded kleuren/hex.
- `requireSession` + bestaande rolgate ongewijzigd — retry hergebruikt exact hetzelfde `onCorrect`-pad, dus dezelfde autorisatie als vandaag; geen nieuwe route, geen nieuwe `requireRole`.
- OTAP local-first: ontwikkelen op `localhost`, geen push zonder expliciet verzoek.

## FRD

**Gekozen approach:** A — de bestaande sequentiële lus in `usePurchaseOrderBulkEdit.js` (alleen voor `mode === 'correct'`) ombouwen van "stop bij de eerste fout" naar "ga door en verzamel per-rij uitkomst", en de bestaande summary-`Dialog` (`mode === 'summary'`) uitbreiden met een mislukte-rijenlijst + retry-acties. Retry hergebruikt letterlijk dezelfde aanroep (`runSingleUpdate('correct', payload)` → `correctField` in `usePurchaseOrdersPage.js` → `POST /api/data/:tableKey/correct` → `TableDataService.correctField` → `D365ODataService.writeBackField`) als de oorspronkelijke poging én als single-cell write-back. Elke mislukte rij bewaart zijn eigen `basedOnValue` (de waarde zoals de client die zag vóór déze bulk-poging), zodat retry zonder nieuwe board-lookup kan; D365 blijft zelf de autoriteit over conflicten — een retry kan opnieuw 409 geven als de rij intussen weer gewijzigd is, en dat toont zich vanzelf als een nieuwe foutmelding in de lijst.

**Afgewezen:**
- B — retry leest bij elke klik een verse `basedOnValue` uit `visibleOrders` (het huidige gefilterde bord). Afgewezen: voegt een randgeval toe (rij niet meer in `visibleOrders` na filterwissel → retry-knop doet stilzwijgend niets) zonder correctheidswinst — D365 controleert de concurrency zelf toch opnieuw bij elke PATCH. De eenvoudigere, robuustere optie (bewaar `basedOnValue` in de mislukte-rij zelf, zoals bij de oorspronkelijke poging) wint en maakt retry bovendien onafhankelijk van `visibleOrders`.
- C — nieuw server-side bulk-endpoint (`…/correct/bulk`) dat alle rijen in één call afhandelt en gestructureerd per-rij resultaat teruggeeft. Afgewezen: precies de route die #202 al bewust uitstelde ("aparte story als atomariteit of schaal een eis wordt"). Niet nodig om per-rij uitkomst zichtbaar te maken — dat kan met de bestaande per-rij `correctField`-call, alleen zonder te stoppen bij de eerste fout.
- D — automatische achtergrond-retry (bijv. elke 5s opnieuw tot een rij slaagt of een max aantal pogingen). Afgewezen: extra state en timing-risico, en bij een 409-conflict wil een gebruiker doorgaans eerst de rij bekijken of verversen vóór een retry, niet blind dezelfde waarde opnieuw pushen.

**Happy path**
1. Staff selecteert N zichtbare rijen en bewerkt een D365-writable header-cel (`column.source === 'd365' && column.writableToD365`, `onCorrect` alleen doorgegeven als `isStaff`). De bestaande confirm-dialoog verschijnt ("Update multiple rows?").
2. Staff kiest "Apply to selected rows".
3. De bulk-lus loopt over alle N rijen. Per rij: waarde gelijk aan doelwaarde → skip (zoals nu); anders → `correctField`-aanroep. Bij succes: teller omhoog, doorgaan. Bij fout: foutmelding + rij-identiteit + `basedOnValue` opslaan in `failedRows`, **en doorgaan naar de volgende rij** — dit is de gedragswijziging t.o.v. vandaag.
4. Geen enkele fout: dialoog sluit stil, exact zoals nu.
5. 1 of meer fouten: dialoog blijft open in `mode: 'summary'` met een header-regel ("Bulk edit finished. Updated: 17. Skipped: 0. Failed: 3.") en daaronder de mislukte-rijenlijst (PO-nummer + foutmelding + Retry-knop per rij) plus een "Retry all failed"-knop.
6. Staff klikt Retry op één rij, of "Retry all failed". Geretryde rijen worden opnieuw via hetzelfde pad geprobeerd; bij succes verdwijnen ze uit de lijst en telt de header-regel mee; bij herhaalde fout blijft de rij staan met de (mogelijk nieuwe) foutmelding. Worden alle rijen alsnog opgelost, dan blijft de dialoog open met "Failed: 0" en een lege lijst — geen automatische sluiting.
7. Staff sluit de dialoog via "Close", ook met resterende mislukte rijen (geen geforceerde blokkade). De audit-trail in `tb_field_corrections` bevat elke poging (`pending → applied/failed`) zoals vandaag; een rij die uiteindelijk mislukt blijft daar als `'failed'` staan totdat een latere poging (in of buiten deze dialoog) slaagt.

**Rollen:** ongewijzigd. Alleen staff (`isStaff` = admin of employee) bereikt deze dialoog, want `onCorrect` wordt alleen doorgegeven aan write-back-cellen als `isStaff` (`PurchaseOrdersPageContent.jsx`, regel 124). Leveranciers hebben geen write-back-cellen en zien deze dialoog nooit. Retry is dus impliciet even staff-only als de rest van de write-back-flow — geen nieuwe `requireRole` nodig.

**Leeg:**
- Geen mislukte rijen → geen lijst, geen "Retry all failed"-knop, gedrag ongewijzigd.
- Alle N rijen al gelijk aan de doelwaarde (allemaal skip) → geen enkele `correctField`-call, dialoog sluit stil (zoals nu).

**Fout:**
- D365-conflict (409, *"The value changed in D365 since you read it. Refresh first and try again."*) → in de lijst; Retry probeert opnieuw met dezelfde payload. Staat de conflicterende wijziging nog steeds, dan komt exact dezelfde 409-tekst terug.
- Record niet gevonden (404, *"Record not found in D365"*) → in de lijst; Retry blijft zinloos totdat de rij weer bestaat, maar er is geen speciale code nodig — de gebruiker ziet gewoon dezelfde melding opnieuw.
- Validatiefout of vergrendeld record van D365 (nu altijd generiek 502 *"Write-back to D365 failed"*) → TD-wijziging in `D365ODataService.writeBackField` geeft de echte OData-foutdetail door (`summarizeODataFailure`, bestaat al, alleen nog niet gebruikt in dit PATCH-pad), zodat de lijst een bruikbare melding toont in plaats van een generieke tekst.
- Netwerkfout/timeout of verlopen sessie tijdens een (retry-)poging → dezelfde bestaande `apiRequest`-foutafhandeling (401 → sessie-verval-melding via `shouldNotifyUnauthorized`); geen nieuwe foutcode nodig. Dit blijft uitsluitend een **echte** sessie-401 (van de app zelf) — een D365-side fout tijdens de PATCH mag hier nooit in verzeild raken (zie TD, statuswhitelist in `writeBackField`).
- Dubbel klikken op Retry (dezelfde rij of "Retry all") tijdens een lopende poging → alle retry-knoppen en "Close" zijn `disabled` zolang `retryingBulk` waar is (zelfde patroon als `restoring` in `PurchaseOrderHiddenRowsPanel.jsx`), dus geen dubbele `correctField`-call op dezelfde rij.
- **De rij die de gebruiker zelf net aan het bewerken was, faalt mee in de batch** → naast de summary-dialoog toont de cel zelf óók een foutstatus: `PurchaseOrderWriteBackCell` verwacht dat zijn `onCorrect`-promise reject't bij een fout (zo toont hij `status: 'error'` + de oude waarde terug). `runBulkUpdateCorrect` reject't daarom alsnog specifiek wanneer de initiërende rij (de cel waarop de gebruiker blurde) in `failedRows` terechtkomt — de rest van de batch loopt gewoon door en verschijnt ongewijzigd in de summary-dialoog. Zie TD.

**Overlap:** twee tabs/gebruikers die tegelijk dezelfde rij bulk-editen is geen nieuwe race-conditie — dit is precies het scenario dat de bestaande optimistic-concurrency (ETag/`basedOnValue`) al afvangt met een 409, nu alleen zichtbaar per rij in plaats van verstopt in een aggregaat-toast.

**UI:**
- Header-regel van de summary blijft platte tekst (`<Text>{summaryMessage}</Text>`), nu met een derde teller: *"Bulk edit finished. Updated: X. Skipped: Y. Failed: Z."* (Engels, zelfde toonvorm als de bestaande `createBulkErrorMessage`).
- Mislukte-rijenlijst: Fluent `Table`/`TableBody`/`TableRow`/`TableCell` in een `overflowY: auto`-container (`maxHeight` ~280px) — hetzelfde patroon als `PurchaseOrderHiddenRowsPanel.jsx`. Kolommen: **Order** (`dataAreaId|orderNumber`, semibold), **Error** (foutmelding, CSS-ellipsis + native `title` voor de volledige tekst — geen `<Tooltip>`), **Retry**-actie (per-rij `Button appearance="secondary" size="small" icon={<ArrowClockwiseRegular/>}`, `disabled` tijdens `retryingBulk`). De Error-cel rendert de tekst als platte React-children (`{errorMessage}`) — **nooit** `dangerouslySetInnerHTML` — ook al komt de tekst uiteindelijk uit een extern systeem (D365) en is hij alleen getrimd/afgekapt, niet HTML-gesanitized; React/Fluent's default-escaping is hier de enige en voldoende laag.
- "Retry all failed"-knop: `Button appearance="primary" icon={retryingBulk ? <Spinner size="tiny"/> : <ArrowClockwiseRegular/>}`, zelfde plek/stijl als "Restore all" in `PurchaseOrderHiddenRowsPanel.jsx`.
- "Close" blijft de enige manier om de dialoog te sluiten (bestaande `onCloseSummary`), nu ook `disabled` tijdens `retryingBulk`. Geen nieuwe `modalType`.
- Alle nieuwe teksten Engels: "Retry", "Retry all failed", "Order", "Error", "Close" (bestaand).

**Zichtbaarheid:** de mislukte-rijenlijst toont alleen rijen/velden die al in de bulk-selectie zaten (PO-nummer + de al zichtbare doelwaarde) — geen nieuwe velden, geen extra data over een rij die de gebruiker nog niet zag. Foutmeldingen komen 1-op-1 van de bestaande `err.message` (server → `apiRequest` → hook), nooit ruwe stacktraces. Geen `localStorage`-persistentie van mislukte rijen — de lijst leeft alleen in dialoog-state en verdwijnt bij sluiten, zoals vandaag.
`summarizeODataFailure` geeft bij voorkeur het geparste `error.message`/`innererror.message` uit de D365-OData-responsbody door; alleen als die JSON-parse faalt, valt de functie terug op de ruwe response-tekst (tot 400 tekens, whitespace-genormaliseerd). Op codeinspectie bevat die ruwe fallback geen tokens/secrets (auth loopt via de Authorization-header, niet via de URL) en de PO-/kolomdata is al bekend bij de staff-gebruiker die de bulk-actie zelf startte — de fallback wordt hiermee bewust staff-safe geacht, geen aparte allowlist/sanitatiestap nodig voor déze feature.
**Volumebegrenzing:** "stop bij de eerste fout" begrensde voorheen het worst-case aantal D365-round-trips bij een structurele fout tot 1; met deze feature is dat gegarandeerd N (zie Perf), en "Retry all failed" herhaalt die volledige sweep bij elke klik zonder cooldown of maximum-selectiegrootte in code. Dit is een bewust geaccepteerd residual risk voor déze feature — begrensd door de bestaande, onafgedwongen aanname "bescheiden selecties" uit #202, dezelfde aanname waarop de rest van de bulk-edit-flow al leunt. Geen nieuwe harde limiet in deze feature; als D365-rate-limit-druk in de praktijk een probleem blijkt, is een maximum-selectiegrootte een kleine losse vervolgstap.

**Hergebruik:** `usePurchaseOrderBulkEdit.js` (bestaande decision/dialog-state), `runSingleUpdate('correct', payload)` (bestaande per-rij aanroep), `rowSelectionKey`/`resolveOrderSelectionKey` (rij-identiteit), `PurchaseOrderHiddenRowsPanel.jsx` (lijst + bulk-actie + per-rij-actie-patroon, incl. `title`-attribuut i.p.v. Tooltip), `PurchaseOrderErrorDialog.jsx` (Retry-knop/icoon-conventie `ArrowClockwiseRegular`), bestaande `err.message`-doorgifte via `apiRequest`, bestaande `summarizeODataFailure`.

## TD

### Hergebruik (concrete paden)

| Wat | Pad |
|---|---|
| Bulk-decision/dialog-state hook | `src/hooks/usePurchaseOrderBulkEdit.js` (212 regels nu) |
| Retry-recovery-lifecycle (nieuw, eigen verantwoordelijkheid) | `src/hooks/usePurchaseOrderBulkEditRetry.js` |
| Bulk-dialoog shell | `src/components/supplier/PurchaseOrderBulkEditDialog.jsx` (69 regels nu) |
| Dialoog-wiring | `src/components/supplier/PurchaseOrdersPageDialogs.jsx` (1 regel aangepast, zie hieronder) |
| Rij-identiteit | `rowSelectionKey` / `resolveOrderSelectionKey` in `src/hooks/usePurchaseOrderRowSelection.js` |
| Per-cel write-back (single-cell, **niet aanraken**) | `src/components/supplier/PurchaseOrderWriteBackCell.jsx` (261 regels — al gemarkeerd "eerst splitsen bij uitbreiding") |
| Frontend write-back-call | `correctField` in `src/hooks/usePurchaseOrdersPage.js` (regel 475-523) → `POST /api/data/:tableKey/correct` |
| Server-route (1 branch gewijzigd) | `server/routes/data.js` regel 508 (`router.post('/:tableKey/correct', …)`), gemount achter `requireSession` + `restrictSupplierDataAccess` in `server.js` regel 184 — krijgt een eigen `err.status`/`err.message`-catch, zie TD |
| Server write-back-service (ongewijzigd, hergebruikt) | `TableDataService.correctField` in `server/services/TableDataService.js` regel 4582-4719 |
| D365 PATCH + concurrency (1 branch gewijzigd) | `writeBackField` in `server/services/D365ODataService.js` regel 322-369 |
| OData-foutsamenvatting (bestaat al, nu ook hier gebruikt) | `summarizeODataFailure` in `server/services/D365ODataService.js` regel 386-404 |
| Lijst + bulk-actie + per-rij-actie visueel patroon | `src/components/supplier/PurchaseOrderHiddenRowsPanel.jsx` |
| Retry-knop/icoon-conventie | `src/components/supplier/PurchaseOrderErrorDialog.jsx` (`ArrowClockwiseRegular`, native `title` i.p.v. Tooltip) |
| Audit-trail (ongewijzigd) | `dbo.tb_field_corrections` (migratie `011_tb_metamodel.sql` regel 291-315) |
| Versie | `src/config/version.js` (huidig `v1.52.68`; PATCH bij implementatie) |

### Bulk-lus: van stop-on-first-error naar verzamel-en-ga-door (alleen `mode === 'correct'`)

Nieuw sibling-bestand **`src/hooks/purchaseOrderBulkEditRun.js`** — geen React, geen JSX, houdt `usePurchaseOrderBulkEdit.js` onder de regelgrens (zelfde reden als het uitplaatsen van de `ACTIVITY_FILTER_*`-constanten in het kolomtotaal-ontwerp). I/O loopt via een geïnjecteerde `runSingleUpdate`-callback, dus dit is sequencing-logica die zonder React-renderer test, niet 100% pure functies (er zit een `await` op echte netwerk-I/O in).

**`valuesEqual` verhuist hierheen en wordt hier canoniek gedefinieerd en geëxporteerd.** Vandaag bestaat `valuesEqual` alleen als niet-geëxporteerde lokale functie in `usePurchaseOrderBulkEdit.js`; met dit ontwerp importeert dat bestand `runCorrectRows` juist ván `purchaseOrderBulkEditRun.js`. Zou `purchaseOrderBulkEditRun.js` op zijn beurt `valuesEqual` terugimporteren uit `usePurchaseOrderBulkEdit.js`, ontstaat een 2-bestands cyclus tussen precies de twee modules die dit ontwerp bewust wilde ontkoppelen. Fix: `valuesEqual` woont voortaan alleen in `purchaseOrderBulkEditRun.js` (geëxporteerd); de bestaande `runBulkUpdate` (save-pad, gedrag ongewijzigd) in `usePurchaseOrderBulkEdit.js` importeert 'm van dáár — één importrichting, geen cyclus, geen tweede kopie.

Eén export, gebruikt voor **zowel** de eerste bulk-pas **als** retry:

```js
export function valuesEqual(left, right) {
  if (Object.is(left, right)) return true;
  const normalizedLeft = left === undefined ? null : left;
  const normalizedRight = right === undefined ? null : right;
  if (Object.is(normalizedLeft, normalizedRight)) return true;
  return String(normalizedLeft ?? '') === String(normalizedRight ?? '');
}

export async function runCorrectRows({ candidates, payload, runSingleUpdate, onSettled }) {
  // candidates: Array<{ dataAreaId, orderNumber, currentValue }>
  // payload: { columnId, columnKey, value }  (target-waarde, gelijk voor de hele batch)
  let updated = 0;
  let skipped = 0;
  const failedRows = [];
  for (const candidate of candidates) {
    if (valuesEqual(candidate.currentValue, payload.value)) {
      skipped += 1; onSettled?.(); continue;
    }
    try {
      await runSingleUpdate('correct', {
        columnId: payload.columnId, columnKey: payload.columnKey,
        dataAreaId: candidate.dataAreaId, orderNumber: candidate.orderNumber, lineNumber: null,
        value: payload.value, basedOnValue: candidate.currentValue,
      });
      updated += 1;
    } catch (err) {
      failedRows.push({
        key: rowSelectionKey(candidate.dataAreaId, candidate.orderNumber),
        dataAreaId: candidate.dataAreaId, orderNumber: candidate.orderNumber,
        columnId: payload.columnId, columnKey: payload.columnKey,
        value: payload.value, basedOnValue: candidate.currentValue,
        errorMessage: err.message || 'Write-back failed',
      });
    }
    onSettled?.();
  }
  return { updated, skipped, failedRows };
}
```

`valuesEqual` is hierboven canoniek gedefinieerd (zie vorige alinea); `rowSelectionKey` blijft geïmporteerd uit `usePurchaseOrderRowSelection.js` (bestaande functie, geen tweede kopie, geen cyclus — dat bestand importeert niets terug uit de bulk-edit-modules). Geen `throw`, geen stoppen — dit is het kernverschil met de bestaande `runBulkUpdate`. Geschat 65-80 regels inclusief `valuesEqual` en imports, co-located test `purchaseOrderBulkEditRun.test.js` (dekt nu ook `valuesEqual` zelf, incl. de bestaande `runBulkUpdate`-tests die er al tegen leunden).

**Twee aanroepen, één functie:**
- **Eerste pas** (in `usePurchaseOrderBulkEdit.js`): `candidates = selectedVisibleOrders.map(row => ({ dataAreaId: row.dataAreaId, orderNumber: row.orderNumber, currentValue: row?.values?.[payload.columnKey] }))`; `onSettled` bumpt `processedCount` (zelfde `setDialogState`-patroon als de bestaande `runBulkUpdate`, dus de "Updating: X/Y"-tekst in de confirm-fase blijft ongewijzigd werken).
- **Retry**: `candidates = entries.map(e => ({ dataAreaId: e.dataAreaId, orderNumber: e.orderNumber, currentValue: e.basedOnValue }))`; `payload = { columnId: entries[0].columnId, columnKey: entries[0].columnKey, value: entries[0].value }`; geen `onSettled` (geen live teller tijdens retry, zie FRD Non-goals). Elke `entry` is dus volledig zelfbeschrijvend — geen board-lookup nodig (zie FRD, afgewezen optie B).

### `usePurchaseOrderBulkEdit.js` — wijzigingen

- `EMPTY_DIALOG_STATE` krijgt `failedRows: []` (`retryingBulk` woont voortaan in de nieuwe retry-hook, zie hieronder — niet hier).
- Bestaande `runBulkUpdate` (stop-on-first-error) blijft **ongewijzigd** in gedrag, alleen nog gebruikt voor `mode === 'save'`; importeert `valuesEqual` voortaan uit `purchaseOrderBulkEditRun.js` in plaats van de eigen lokale kopie (zie boven).
- Nieuwe `runBulkUpdateCorrect(payload, rows, activeOrderKey)`: bouwt `candidates` uit `rows`, roept `runCorrectRows` aan met `onSettled` gekoppeld aan `processedCount`. Na afloop:
  - `failedRows.length === 0` → `closeDialog()` (stil, zoals vandaag).
  - anders → `setDialogState` met `mode: 'summary'`, `failedRows`, `updated`, `skipped` (bewaard voor latere hertelling ná een retry, zie hieronder), en `summaryMessage` via een nieuwe kleine helper `buildCorrectSummaryMessage({ updated, skipped, failedCount })` (naast de bestaande `createBulkErrorMessage`, zelfde bestand — dit blijft lokaal, alleen de rij-loop verhuist naar de sibling-module).
  - **daarna, ongeacht dialoog-pad:** als de rij die de gebruiker zelf initieerde (`activeOrderKey`, meegegeven vanuit `executeWithBulkOption` — dezelfde `rowSelectionKey(payload.dataAreaId, payload.orderNumber)` die al berekend wordt om te beslissen of de confirm-dialoog verschijnt) in `failedRows` voorkomt, dan `throw new Error(matchingFailedRow.errorMessage)`. Dit lost de stille contractwijziging op (Refactor Specialist-blocker): `PurchaseOrderWriteBackCell.commit()` verwacht dat `onCorrect(...)` reject't bij een fout op de cel waarop de gebruiker net blurde, en doet dat nu weer — de rest van de batch is dan al klaar en staat al in `failedRows`/de summary-dialoog, dat wordt door deze `throw` niet teruggedraaid (de `setDialogState`-call hierboven gebeurt eerst).
- `executeWithBulkOption`: `mode === 'save'` → bestaand pad (`runBulkUpdate`, ongewijzigd, geen `activeOrderKey`-parameter nodig — dat pad blijft al reject'en zoals vandaag). `mode === 'correct'` → nieuw pad (`runBulkUpdateCorrect(payload, selectedVisibleOrders, activeOrderKey)`, met `activeOrderKey` de al-berekende `rowSelectionKey(payload.dataAreaId, payload.orderNumber)`).
- **Retry-recovery-lifecycle verhuist volledig naar een nieuwe, eigen hook `usePurchaseOrderBulkEditRetry.js`** (zie eigen sectie hieronder) — `retryRows`/`retryRow`/`retryAllFailed`/`retryingBulk` staan niet meer in dit bestand. Dit is een verantwoordelijkheid-gebaseerde split (React Architect-blocker), geen regelbudget-gok: bulk-uitvoeren (dit bestand) en fouten-herstellen (de nieuwe hook) zijn twee aparte state machines, ook als de optelsom van regels toevallig nog onder 300 zou zijn gebleven.
- `usePurchaseOrderBulkEdit.js` **componeert** de nieuwe hook: `const retry = usePurchaseOrderBulkEditRetry({ failedRows: dialogState.failedRows, onFailedRowsChange: handleFailedRowsChange, runSingleUpdate })`, met
  ```js
  const handleFailedRowsChange = useCallback((updateFailedRows) => setDialogState((prev) => {
    const failedRows = updateFailedRows(prev.failedRows);
    return { ...prev, failedRows, summaryMessage: buildCorrectSummaryMessage({ updated: prev.updated, skipped: prev.skipped, failedCount: failedRows.length }) };
  }), []);
  ```
  `onFailedRowsChange` krijgt dus **alleen** de updater-functie mee (geen los `summaryMessage`-argument) — de nieuwe `summaryMessage` wordt in de parent herberekend uit `prev.updated`/`prev.skipped` (bewaard sinds de eerste pas, ongewijzigd door een retry) plus de lengte van de nét bijgewerkte `failedRows`. Dit is dezelfde compose-in-de-parent-vorm als `usePurchaseOrderColumnSums` in `usePurchaseOrderBoardView` (kolomtotaal-ontwerp) — geen React-context, geen prop-drilling van setters door meerdere lagen.
- Return-object: `dialogState` die dit hook exposeert is `{ ...dialogState, retryingBulk: retry.retryingBulk }` (retryingBulk leeft in de retry-hook, niet in de lokale `useState`, maar consumenten zien 'm gewoon als onderdeel van `dialogState`, geen contractwijziging voor `PurchaseOrderBulkEditDialog.jsx`). `dialogActions` krijgt `onRetryRow: retry.retryRow`, `onRetryAllFailed: retry.retryAllFailed` naast de 4 bestaande keys, in dezelfde toplevel `useMemo` als nu (stabiele referentie — deps krijgen `retry.retryRow`/`retry.retryAllFailed`/`retry.retryingBulk` erbij). Top-level return blijft 4 keys (`handleSaveValue`, `handleCorrectField`, `dialogState`, `dialogActions`) — ruim onder de React Architect-limiet van 10.
- Geschat: 212 → ~225-240 regels (kleinere toename dan eerder geschat, want de retry-logica — de grootste toevoeging — zit nu in een eigen bestand; wat overblijft is `runBulkUpdateCorrect` (~15-20 regels), `buildCorrectSummaryMessage` (~10-15), de `activeOrderKey`-throw (~5), en de compose-regels voor de retry-hook (~5-8)). Ruim onder 300, geen escape-hatch-taal meer nodig.

### `usePurchaseOrderBulkEditRetry.js` — nieuwe, eigen hook (retry-recovery-lifecycle)

Eigen verantwoordelijkheid: fouten uit een eerdere bulk-correct-pas opnieuw proberen. Geen React-context, geen JSX. Signatuur:

```js
function usePurchaseOrderBulkEditRetry({ failedRows, onFailedRowsChange, runSingleUpdate }) {
  const [retryingBulk, setRetryingBulk] = useState(false);
  const failedRowsRef = useRef(failedRows);
  failedRowsRef.current = failedRows; // elke render bijgewerkt, geen dependency nodig in de callbacks hieronder

  const retryRows = useCallback(async (entries) => {
    if (!entries.length) return;
    setRetryingBulk(true);
    const candidates = entries.map((e) => ({ dataAreaId: e.dataAreaId, orderNumber: e.orderNumber, currentValue: e.basedOnValue }));
    const payload = { columnId: entries[0].columnId, columnKey: entries[0].columnKey, value: entries[0].value };
    const { failedRows: stillFailed } = await runCorrectRows({ candidates, payload, runSingleUpdate });
    const stillFailedKeys = new Set(stillFailed.map((r) => r.key));
    const retriedKeys = new Set(entries.map((e) => e.key));
    onFailedRowsChange((prevFailedRows) => prevFailedRows
      .filter((r) => !retriedKeys.has(r.key) || stillFailedKeys.has(r.key))
      .map((r) => stillFailed.find((sf) => sf.key === r.key) || r));
    setRetryingBulk(false);
  }, [onFailedRowsChange, runSingleUpdate]);

  const retryRow = useCallback((key) => retryRows(failedRowsRef.current.filter((r) => r.key === key)), [retryRows]);
  const retryAllFailed = useCallback(() => retryRows(failedRowsRef.current), [retryRows]);

  return { retryingBulk, retryRow, retryAllFailed };
}
```

- **Stabiele-referentieketen, expliciet dichtgezet (React Architect-warning):** `retryRow`/`retryAllFailed` zijn `useCallback` met als enige dependency `retryRows`, dat zelf stabiel is (deps `[onFailedRowsChange, runSingleUpdate]`, geen `failedRows`). Actuele `failedRows` wordt gelezen via `failedRowsRef.current` op het moment van de klik, niet via een dependency-array-entry — dus geen stale-closure-risico en geen nodeloze her-creatie van `retryRow`/`retryAllFailed` bij elke wijziging van `failedRows`. `onFailedRowsChange` zelf is een `useCallback` in de aanroepende `usePurchaseOrderBulkEdit.js` met lege deps (gebruikt alleen `setDialogState`, die zelf stabiel is), dus ook die schakel is stabiel.
- **Functionele state-update voor de merge (React Architect-warning):** de merge in `retryRows` leest nergens direct `failedRows`/`dialogState.failedRows` als closure-waarde — `onFailedRowsChange` geeft een updater-functie door die de aanroeper met `setDialogState((prev) => ...)` toepast op de dan-actuele `prev.failedRows`. Geen dubbele bron van waarheid, geen mogelijke stale-state-merge.
- `buildCorrectSummaryMessage` wordt hier niet zelf aangeroepen en deze hook kent `updated`/`skipped` niet (blijft in `usePurchaseOrderBulkEdit.js`, naast de bestaande `createBulkErrorMessage`); `onFailedRowsChange` krijgt alleen de updater-functie mee, en de aanroeper herberekent `summaryMessage` daarbinnen uit de bewaarde `prev.updated`/`prev.skipped` plus de nieuwe `failedRows`-lengte, binnen dezelfde `setDialogState`-call. Zo blijft de summary-tekst-logica op één plek.
- **Unmount-guard (React Architect-warning, bewust geaccepteerd i.p.v. nieuw gebouwd):** noch deze hook, noch de bestaande `runBulkUpdate`, heeft vandaag een mounted-ref/AbortController-guard tegen `setState` ná unmount tijdens een lange sequentiële lus. Dit is een pre-existing gap (ook `runBulkUpdate` had 'm al vóór deze feature) die dit ontwerp qua *venster* vergroot (twee gegarandeerd-volledige lussen i.p.v. één die vroeg kan stoppen), maar niet qua *patroon* — er is geen nieuw soort risico, alleen meer gelegenheid voor hetzelfde bestaande risico. Bewuste keuze: geen guard toevoegen in déze feature (zou een cross-cutting concern voor de hele bulk-edit-flow worden, niet iets specifiek voor retry); een eventuele mounted-ref-guard is een aparte, kleine vervolgstap voor beide lussen tegelijk als dit in de praktijk een probleem blijkt (bijv. via een sessie-verval-redirect die tijdens een lange batch vuurt).
- Props (3, ruim onder de limiet): `failedRows`, `onFailedRowsChange`, `runSingleUpdate`. Returns (3): `retryingBulk`, `retryRow`, `retryAllFailed`.
- Geschat: 45-60 regels inclusief imports, co-located test `usePurchaseOrderBulkEditRetry.test.js` ("retryRow verwijdert de rij bij succes", "retryAllFailed verwerkt de hele lijst sequentieel via `runCorrectRows`", "rij die opnieuw faalt houdt de nieuwe `errorMessage`", "`retryingBulk` is `true` tijdens de aanroep en `false` erna", "dubbele klik tijdens `retryingBulk` — knoppen zijn client-side `disabled`, geen extra guard in de hook nodig").

### UI-componenten (grootte / props)

**Prop-explosie voorkomen (Dev Lead-regel, max 10 props):** `PurchaseOrdersPageDialogs.jsx` spreidt vandaag al `{...bulkEdit.dialogState}` (7 keys) + `{...bulkEdit.dialogActions}` (4 keys) = **11 losse props** op `PurchaseOrderBulkEditDialog` — al over de limiet vóór deze feature. Met `failedRows`/`retryingBulk`/`onRetryRow`/`onRetryAllFailed` erbij zou dat 15 worden. Fix, in dezelfde wijziging: `PurchaseOrdersPageDialogs.jsx` regel 25 wordt

```jsx
<PurchaseOrderBulkEditDialog dialogState={bulkEdit.dialogState} dialogActions={bulkEdit.dialogActions} />
```

en `PurchaseOrderBulkEditDialog.jsx` destructureert intern uit die twee objecten. Component-prop-aantal: **2**, ongeacht hoeveel velden `dialogState`/`dialogActions` later nog krijgen. Enige aanpassing buiten de bulk-edit-bestanden zelf — geen shotgun surgery.

- `PurchaseOrderBulkEditDialog.jsx`: 2 props (`dialogState`, `dialogActions`). Destructureert `failedRows = []`, `retryingBulk` uit `dialogState` en `onRetryRow`, `onRetryAllFailed` uit `dialogActions`. In `mode === 'summary'` en `failedRows.length > 0`: rendert `<PurchaseOrderBulkEditFailedRows rows={failedRows} retrying={retryingBulk} onRetryRow={onRetryRow} onRetryAllFailed={onRetryAllFailed} />` onder `<Text>{summaryMessage}</Text>`; "Close"-knop krijgt `disabled={retryingBulk}` erbij. Geschat: 69 → ~100-115 regels.
- Nieuw **`PurchaseOrderBulkEditFailedRows.jsx`** — props `{ rows, retrying, onRetryRow, onRetryAllFailed }` (4, ruim onder de limiet). Zelfde opbouw als `PurchaseOrderHiddenRowsPanel.jsx`: koprij met "N rows failed" + "Retry all failed"-knop, daaronder `Table` in een `overflowY: auto`-wrapper (`maxHeight: '280px'`). Kolommen Order / Error / Retry. `React.memo`, geen `rows`-reduce, geen berekening — puur render. Geschat: 120-150 regels (`PurchaseOrderHiddenRowsPanel.jsx` telt 179 regels met één kolom méér).
  - **Per-rij Retry-knop, expliciet benoemd (Dev Lead-warning):** de per-rij knop gebruikt `onClick={() => onRetryRow(row.key)}` — een nieuwe closure per rij per render, ditzelfde patroon staat al in `PurchaseOrderHiddenRowsPanel.jsx` (`onClick={() => handleRestoreOne(row)}`). Dit is bewust hetzelfde geaccepteerde patroon, geen nieuwe overtreding en geen `data-row-key`-indirectie erbij verzonnen voor dit ene component — bij N ≤ enkele tientallen mislukte rijen (bescheiden selecties, zie #202) is de her-render-kost verwaarloosbaar en de indirectie zou de leesbaarheid t.o.v. het referentiecomponent juist verminderen.
  - **JSX-nesting, expliciet geverifieerd tegen de 4-niveaus-regel (Dev Lead-warning):** de opbouw `tableWrap-div → Table → TableBody → TableRow → TableCell` is al 4 niveaus vóórdat de `Button` in de Retry-cel meegeteld wordt — exact zoals `PurchaseOrderHiddenRowsPanel.jsx` dat vandaag al doet (geverifieerd: dezelfde structuur, `Button` binnen `TableCell`). Bewust geaccepteerd als hetzelfde patroon als het referentiecomponent, niet stilzwijgend overgenomen: een Fluent `Table`-rij met een actieknop komt zonder een aparte cell-subcomponent per kolom niet onder 4 niveaus, en dat cell-subcomponent bestaat in het referentiecomponent ook niet.
- Styles: eigen `makeStyles` in `PurchaseOrderBulkEditFailedRows.jsx` (zelfde aanpak als `PurchaseOrderHiddenRowsPanel.jsx` — geen gedeeld stylesheet-bestand nodig voor één dialoog-uitbreiding). Fluent tokens (`colorNeutralStroke2`, `colorNeutralBackground2/3`, `colorNeutralForeground3`), geen hex.
- **Bestandslocatie (Dev Lead-warning):** `purchaseOrderBulkEditRun.js`, `usePurchaseOrderBulkEditRetry.js` en `PurchaseOrderBulkEditFailedRows.jsx` landen plat in de bestaande `src/hooks/` resp. `src/components/supplier/`-mappen, zonder submap/index.js — een voortzetting van de bestaande (vlakke) projectconventie in deze mappen, geen nieuwe overtreding door dit ontwerp, expliciet benoemd als geaccepteerde bestaande afwijking van de "gegroepeerd per feature in submappen"-regel.
- **`dialogState`/`dialogActions` lossen de prop-télling op, niet de onderliggende complexiteit (Dev Lead-warning):** na deze feature kent `dialogState` 8 velden (7 bestaand + `failedRows`, met `retryingBulk` als afgeleide toevoeging bovenop bij het exposen, zie boven) en `dialogActions` 6 velden (4 bestaand + `onRetryRow`/`onRetryAllFailed`) die `PurchaseOrderBulkEditDialog.jsx` moet kennen en destructureren. Bewust geaccepteerd voor déze feature (en eerlijker dan de vorige 11-losse-props-staat) — geen precedent om de 10-props-regel projectbreed te omzeilen zonder de onderliggende verantwoordelijkheden ook te splitsen; in dit ontwerp gebeurt die onderliggende split wél (retry-lifecycle naar een eigen hook), dus de objectgroepering verhult hier geen ongesplitste complexiteit.

### Backend: echte D365-foutdetail bij een PATCH-fout

`server/services/D365ODataService.js`, functie `writeBackField`, branch `if (!patchRes.ok)` (regel ~363-367):

```js
// voor
const e = new Error('Write-back to D365 failed'); e.status = 502; throw e;

// na
const PATCH_FAILURE_STATUS_WHITELIST = new Set([400, 404, 409, 422, 423]);
const message = summarizeODataFailure(patchRes.status, entityUrl, body);
const e = new Error(message);
e.status = PATCH_FAILURE_STATUS_WHITELIST.has(patchRes.status) ? patchRes.status : 502;
throw e;
```

`summarizeODataFailure` bestaat al (regel 386-404, nu alleen gebruikt in `fetchODataJson`) en parset de OData `error.message` / `innererror.message` uit de response-body — precies de tekst die D365 geeft bij een vergrendeld record of een veldvalidatiefout. De 412-branch (stale ETag → *"Conflict: the record was just changed…"*) en de eerdere 409-concurrency-check (regel 348-351) blijven **ongewijzigd** met hun eigen specifieke tekst; alleen de restcategorie ("iets anders ging mis bij de PATCH", voorheen altijd generiek 502) wordt specifiek.

**Statuscode wordt bewust NIET 1-op-1 doorgezet (Backend Engineer-blocker).** `writeBackField` documenteert zelf een "legacy fallback: handmatig geplakt token (verloopt ~1u)" — een D365-side 401 tijdens een PATCH is dus een reëel scenario, met name tijdens een "Retry all failed"-batch die herhaaldelijk tegen dezelfde falende call aanloopt na tokenverval. `writeBackField` is gedeeld met de bestaande single-cell write-back, dus zonder whitelist zou dit een regressie zijn op bestaande productiefunctionaliteit, niet alleen een risico van de nieuwe bulk-feature. Concreet faalscenario dat de whitelist voorkomt: D365-token verloopt tijdens een bulk-retry → PATCH krijgt 401 van D365 → zónder whitelist zou `e.status = 401` de client een 401 geven, `apiRequest` interpreteert élke 401 op een niet-publieke route via `shouldNotifyUnauthorized` als sessieverval en logt de staff-gebruiker uit ("Your session expired") terwijl zijn eigen sessie prima is. Met de whitelist blijft elke status buiten `{400, 404, 409, 422, 423}` — inclusief 401/403/429/5xx — op `502` zoals vandaag, met de D365-detailtekst als `message`; alleen de statussen die daadwerkelijk een cliëntfout van de gebruiker zelf beschrijven (bad request, not found, conflict, validatiefout, vergrendeld) krijgen hun eigen statuscode door. Nieuwe test in `D365ODataService.test.js`: "PATCH faalt met D365-status 401 → `e.status` blijft 502, niet 401" naast de bestaande "PATCH faalt met een D365-validatiefout → `error.message` bevat de D365-detailtekst".

Geen wijziging aan `correctField` in `TableDataService.js` nodig: die vangt `err` al op, schrijft `err.message` naar `tb_field_corrections.error` en gooit hem door (regel 4638-4644); `apiRequest` geeft `data.error` (= dat `err.message`) al door als `err.message` op de client. De keten hoeft alleen bij de bron een betere tekst en statuswhitelist te krijgen — plus, zie hieronder, een expliciete `err.status`/`err.message`-interceptie in de route zelf, anders wordt die betere tekst in productie alsnog vervangen door de generieke errorHandler-tekst.

### Auth en validatie

- Geen nieuwe route, geen nieuwe middleware. Retry roept exact dezelfde `POST /api/data/:tableKey/correct` aan, achter de bestaande mount in `server.js` regel 184: `app.use('/api/data', requireSession, restrictSupplierDataAccess, dataRouter)`. `restrictSupplierDataAccess` (`server/middleware/dataAccess.js`) laat admin/employee altijd door en blokkeert `supplier` met 403 voor elk pad dat niet expliciet op de read-only whitelist staat — `/purchase-orders/correct` staat daar niet op, dus een supplier-sessie krijgt nu al 403 op dit endpoint, bulk of niet. Retry verandert hier niets aan; het is exact hetzelfde frontend-pad (`correctField` in `usePurchaseOrdersPage.js`).
- Client: retry-knoppen zijn alleen bereikbaar via een dialoog die alleen ontstaat uit `onCorrect` (alleen doorgegeven als `isStaff`) — geen aparte gate nodig.
- Server: geen nieuw invoerveld — `columnId`/`partitionKey`/`recordKey`/`value`/`basedOnValue` blijven exact de bestaande gevalideerde velden in `TableDataService.correctField` (kolom moet `writable && writeMechanism === 'patch'`, anders 400). Retry op een kolom die inmiddels niet meer writable is, faalt gewoon opnieuw met die 400 — geen crash, geen speciale code.
- **`POST /:tableKey/correct` krijgt een eigen `err.status`/`err.message`-interceptie vóór `next(err)` (Backend Engineer-blocker).** `server/middleware/errorHandler.js` vervangt in productie (`isProductionApp()`) élk `err.message` door de generieke tekst `'An error occurred'`. Zonder eigen interceptie zou de route (`server/routes/data.js` regel 508-521, vandaag `catch (err) { return next(err); }`) in PROD voor élke fout — de bestaande 409-conflicttekst, de bestaande 404-tekst, én de nieuw beloofde D365-validatie/vergrendeld-record-tekst — alleen `'An error occurred'` teruggeven. Precies het probleem dat de BRD wil oplossen ("zonder te zeggen wélke rij faalde of waarom") zou dan in productie onopgelost blijven, onopgemerkt tijdens lokale ACC- en Azure DEV-ontwikkeling (die zetten `APP_ENV` niet op `production`), en zich pas manifesteren na een push naar PROD. Dit bestand kent dit patroon al: `/columns/:id/rccp-measure` (regel 403-413) doet exact `if (err.status) return res.status(err.status).json({ error: err.message }); return next(err);`. Fix, zelfde patroon, in dezelfde wijziging:

```js
// server/routes/data.js — POST /:tableKey/correct
} catch (err) {
  // De generieke errorHandler verbergt in productie het bericht; deze route moet de
  // D365-foutdetail (o.a. bulk-writeback-retry-summary) wél laten zien.
  if (err.status) return res.status(err.status).json({ error: err.message });
  return next(err);
}
```

  Gecombineerd met de statuswhitelist hierboven (401/403/429/5xx blijven op 502, dus er lekt via dit pad nooit een echte sessie-401 door) is dit veilig: alleen statussen die de service zelf bewust zet (400/404/409/422/423/502, plus de bestaande 400 voor "not configured for write-back") bereiken de client met hun eigen tekst.

### Perf

- Zelfde aantal `apiRequest`-calls als een succesvolle bulk-actie vandaag zou geven: één `correctField`-POST per gewijzigde rij, sequentieel, geen parallelle D365-calls (voorkomt D365-rate-limit-risico, zelfde volgorde-garantie als nu).
- Enige verschil: rijen ná een fout werden voorheen **niet** geprobeerd; nu wél. Bij N rijen met 1 vroege fout is dat in het slechtste geval N-1 extra requests t.o.v. vandaag — bewust, want dat is exact de feature (rijen ná de fout ook daadwerkelijk bijwerken i.p.v. overslaan). Bij een grote selectie met een structurele fout (bijv. kolom niet meer writable) betekent dit N mislukkingen i.p.v. 1 vroege stop — geaccepteerd; het kolommenu voorkomt al dat je een niet-writable kolom als write-back-cel opent, dus dit scenario is zeldzaam (D365 zet write-back tijdens gebruik uit).
- Geen extra `apiRequest` per retry-klik bovenop de rijen die je expliciet retryt.
- Geen `measure()`/`time()` nodig — geen board-load, geen SQL-query, geen bestaand chokepoint; de bulk-actie was al ongemeten en blijft dat.
- **D365 429 (rate limit) bij een grotere "Retry all failed"-selectie:** met de statuswhitelist hierboven valt een 429 automatisch terug op `502` met de D365-detailtekst als `message` — geen aparte code nodig, dezelfde afhandeling als elke andere niet-gewhitelistte status. Zie ook "Volumebegrenzing" in de FRD (Zichtbaarheid): geen harde cap op selectiegrootte of retry-frequentie in déze feature, bewust geaccepteerd residual risk.

### Volgorde (implementatie later, geen TBD)

1. Backend: statuswhitelist + `summarizeODataFailure` inzetten in `writeBackField`'s PATCH-failure-branch + nieuwe tests in `D365ODataService.test.js` ("PATCH faalt met een D365-validatiefout → `error.message` bevat de D365-detailtekst, niet de generieke tekst"; "PATCH faalt met D365-status 401 → `e.status` blijft 502, niet 401"). Route `POST /:tableKey/correct` krijgt de eigen `err.status`/`err.message`-interceptie vóór `next(err)`, + test die bevestigt dat de foutdetail ook doorkomt als `errorHandler` in productiestand zou draaien (mock `isProductionApp()` true, controleer dat de route zelf al reageert vóór de generieke handler in beeld komt).
2. `src/hooks/purchaseOrderBulkEditRun.js` (`valuesEqual` canoniek + `runCorrectRows`) + `purchaseOrderBulkEditRun.test.js` (doorlopen na fout, skip-logica, meerdere fouten in één batch, `valuesEqual`-edge-cases die eerder alleen impliciet via `usePurchaseOrderBulkEdit.test.js` liepen).
3. `usePurchaseOrderBulkEdit.js`: importeert `valuesEqual` uit stap 2 i.p.v. de eigen kopie; nieuwe `runBulkUpdateCorrect(payload, rows, activeOrderKey)` incl. de reject-bij-eigen-rij-faalt-logica, `EMPTY_DIALOG_STATE`-uitbreiding (`failedRows: []`). Bestaande tests blijven groen (`mode === 'save'` ongewijzigd); nieuwe tests: "gaat door na een fout op rij 2 van 3 (mode correct)", "`failedRows` bevat `basedOnValue`/`errorMessage` per mislukte rij", "reject't alsnog wanneer de initiërende rij zelf in `failedRows` belandt, óók als andere rijen slaagden" (de kern-fix van de Refactor Specialist-blocker), "resolved gewoon wanneer alléén andere rijen faalden, niet de initiërende rij".
4. Nieuwe `src/hooks/usePurchaseOrderBulkEditRetry.js` + `.test.js` (zie eigen TD-sectie: retryRow/retryAllFailed/retryingBulk, stabiele-referentie-tests, functionele-merge-test). Compose in `usePurchaseOrderBulkEdit.js` (`retry = usePurchaseOrderBulkEditRetry(...)`, `dialogState`/`dialogActions` uitgebreid met `retryingBulk`/`onRetryRow`/`onRetryAllFailed`).
5. `PurchaseOrdersPageDialogs.jsx` naar `dialogState`/`dialogActions`-props (2 i.p.v. 11 gespreide props) + `PurchaseOrderBulkEditDialog.jsx` intern aanpassen — geen gedragswijziging, alleen prop-vorm.
6. Nieuw `PurchaseOrderBulkEditFailedRows.jsx` + korte aansluiting in `PurchaseOrderBulkEditDialog.jsx`.
7. PATCH in `src/config/version.js`.

### Aantoonbaar

- 3 geselecteerde rijen, rij 2 faalt (bijv. een conflicterende D365-wijziging op die ene rij): rij 1 én rij 3 worden alsnog bijgewerkt (voorheen bleef rij 3 "not attempted").
- Summary-dialoog toont 1 mislukte rij met PO-nummer + de echte D365-foutmelding (niet de generieke tekst, voor een niet-409/404-fout) — ook in een lokale simulatie van PROD (`isProductionApp()` true), niet alleen op localhost/DEV.
- Retry op die rij (na het conflict op te lossen) → rij verdwijnt uit de lijst, header-teller past aan.
- "Retry all failed" bij 3 mislukte rijen → alle 3 sequentieel geprobeerd, lijst update per rij.
- Bulk-edit zonder enige fout → dialoog sluit stil, geen zichtbaar verschil met vandaag.
- **De rij die de gebruiker zelf net bewerkte faalt mee in de batch** (bijv. 3 rijen, rij 1 is de rij waarop de gebruiker blurde) → die cel toont zelf ook `status: 'error'` + de oude waarde terug (niet stilzwijgend "saved" terwijl de summary-dialoog 'm als failed toont).
- **D365-token verloopt tijdens een PATCH** (gesimuleerd: D365 antwoordt 401 op de PATCH) → de staff-gebruiker wordt **niet** uitgelogd; de rij verschijnt gewoon als "failed" in de summary-lijst met de D365-detailtekst, de eigen sessie blijft actief.
- `mode === 'save'` (niet-D365 kolom) bulk met een fout → ongewijzigd: stopt bij eerste fout, oude samenvattingstekst, geen retry-lijst.
- Alle nieuwe teksten Engels.

## Review

Fase 4, team-review door vijf personae (`.claude/team/`) op het ontwerp (BRD/FRD/TD), vóór een bouwplan/DevOps-item. Alle 🔴 hieronder zijn daadwerkelijk in de FRD/TD hierboven verwerkt (niet alleen vermeld); 🟡's zijn verwerkt waar het een simpele, eenduidige verbetering was, en anders expliciet vastgelegd als bewuste beslissing.

| Persona | Was | Nu |
|---|---|---|
| Dev Lead | 🔴 Regelbudget-waiver ("blijft ruim onder 300") op het randje van het eigen 250+-stopsignaal, zonder harde, afdwingbare trigger.<br>🟡 Inline `onClick={() => onRetryRow(row.key)}` per rij niet benoemd.<br>🟡 JSX-nesting (Table→TableBody→TableRow→TableCell→Button) niet expliciet tegen de 4-niveaus-regel geverifieerd.<br>🟡 `dialogState`/`dialogActions` lossen de prop-télling op, niet de onderliggende complexiteit.<br>🟡 Nieuwe bestanden landen plat zonder submap/index.js. | Retry-lifecycle (de grootste toevoeging) is nú al verplaatst naar een eigen `usePurchaseOrderBulkEditRetry.js` — `usePurchaseOrderBulkEdit.js` blijft ~225-240 regels, geen waiver-taal meer nodig.<br>Alle vier 🟡's expliciet benoemd in de TD als bewust hetzelfde geaccepteerde patroon als `PurchaseOrderHiddenRowsPanel.jsx` resp. de bestaande vlakke mapconventie — niet stilzwijgend overgenomen. |
| React Architect | 🔴 Verkeerd split-criterium bij het eigen BLOCKER-stopsignaal: regelbudget in plaats van verantwoordelijkheid voor de nieuwe retry-recovery-state-machine.<br>🟡 Geen unmount-guard voor de nu gegarandeerd-volledige async-lussen.<br>🟡 Stabiele-referentieketen (`retryRows`) niet volledig gespecificeerd.<br>🟡 Merge in `retryRows` leest mogelijk een closure-waarde i.p.v. functionele `setState`. | `retryRows`/`retryRow`/`retryAllFailed`/`retryingBulk` zijn nú al (niet als toekomstige stap) verplaatst naar een eigen `usePurchaseOrderBulkEditRetry.js`, gecomponeerd door `usePurchaseOrderBulkEdit.js` — verantwoordelijkheid-gebaseerde split.<br>Unmount-guard: expliciet bevestigd als bewuste, gedocumenteerde beslissing (pre-existing gap, ook `runBulkUpdate` had 'm al; venster groter, patroon niet nieuw).<br>`retryRow`/`retryAllFailed` zijn `useCallback` met stabiele deps (lezen actuele `failedRows` via een ref, niet via een dependency).<br>Merge gaat via een updater-functie die de aanroeper met `setDialogState(prev => ...)` toepast — geen stale-closure-risico. |
| Backend Engineer | 🔴 D365-PATCH-statuscode werd 1-op-1 doorgezet als app-HTTP-status → reëel risico op onterechte forced sign-out bij een D365-side 401 (bv. verlopen legacy-token tijdens een retry-batch).<br>🔴 Generieke `errorHandler.js` vervangt in productie élk `err.message` door de generieke tekst; `/:tableKey/correct` had geen eigen interceptie zoals twee precedent-routes in hetzelfde bestand al wél hebben — de kernbelofte van dit ontwerp zou in PROD onopgelost blijven, onopgemerkt op ACC/DEV.<br>🟡 `tb_field_corrections` blijft ongecorreleerd tussen pogingen.<br>🟡 `summarizeODataFailure`'s ruwe-body-fallback nu ook op het PATCH-pad, geen expliciete sanitatie-bevestiging.<br>🟡 429 (rate limit) bij "Retry all failed" niet genoemd in de Perf-sectie. | Statuswhitelist in `writeBackField`: alleen `{400, 404, 409, 422, 423}` gaan door als eigen statuscode; alles daarbuiten (incl. 401/403/429/5xx) blijft op `502` zoals voorheen — plus een test die dit vastlegt.<br>`POST /:tableKey/correct` krijgt een eigen `err.status`/`err.message`-interceptie vóór `next(err)`, zelfde patroon als het bestaande `/columns/:id/rccp-measure`.<br>Blijft bewuste YAGNI-keuze uit de Non-goals, ongewijzigd.<br>TD-zin toegevoegd (FRD Zichtbaarheid) die expliciet bevestigt dat de ruwe fallback staff-safe is (auth via header, geen secrets, PO-data al bekend bij de gebruiker).<br>Toegevoegd aan de Perf-sectie: valt automatisch terug op 502 via de whitelist. |
| Security Engineer | (geen 🔴)<br>🟡 Foutmelding-passthrough op het PATCH-pad niet expliciet als staff-safe vastgelegd.<br>🟡 Geen volumebegrenzing op de retry-sweep (gegarandeerd N i.p.v. 1 vroege stop, "Retry all failed" zonder cooldown/max).<br>🟡 Rendering-garantie voor de Error-kolom (nooit `dangerouslySetInnerHTML`) niet expliciet vastgelegd. | TD legt expliciet vast: geparste `error.message`/`innererror.message` heeft voorrang, de ruwe-body-fallback is bewust staff-safe geacht (FRD Zichtbaarheid).<br>Expliciet vastgelegd als bewust geaccepteerd residual risk voor déze feature, begrensd door de bestaande "bescheiden selecties"-aanname uit #202 — geen harde cap toegevoegd (FRD Zichtbaarheid).<br>TD/FRD leggen vast: platte React-children, nooit `dangerouslySetInnerHTML` (FRD UI). |
| Refactor Specialist | 🔴 Stille contractwijziging van de `onCorrect`-promise: `runBulkUpdateCorrect` gooide niet meer door bij een fout, waardoor `PurchaseOrderWriteBackCell` de eigen mislukte rij als "saved" toonde terwijl die tegelijk in de summary-dialoog als "Failed" stond.<br>🔴 De `valuesEqual`-hergebruikclaim was niet oplosbaar zoals beschreven: zou een 2-bestands cyclus creëren tussen `usePurchaseOrderBulkEdit.js` en de nieuwe sibling-module.<br>🟡 Statuscode-semantiek verandert ongenoemd mee (502 wordt soms variabel).<br>🟡 Twee bijna-parallelle summary-tekst-bouwers in hetzelfde bestand.<br>🟡 Vage regelbudget-escape-hatch zonder concreet triggerpunt. | `runBulkUpdateCorrect` reject't alsnog specifiek wanneer de initiërende rij (`activeOrderKey`) in `failedRows` terechtkomt — de rest van de batch loopt gewoon door en staat al in de summary-dialoog vóór die `throw`.<br>`valuesEqual` is canoniek gedefinieerd en geëxporteerd in `purchaseOrderBulkEditRun.js`; de bestaande `runBulkUpdate` importeert 'm vandaar — één importrichting, geen cyclus, geen tweede kopie.<br>Expliciet benoemd in de TD (Backend-sectie): whitelist, motivatie, test.<br>Blijft bewuste keuze, ongewijzigd (al gedocumenteerd als verdedigbaar).<br>Vervalt: de retry-hook is nu al geëxtraheerd, geen toekomstige stap meer om vaag te laten. |

**Geen overgebleven 🔴.** Alle zes 🔴-bevindingen (Dev Lead 1, React Architect 1, Backend Engineer 2, Refactor Specialist 2) zijn met een concrete ontwerpwijziging opgelost, niet weg-geredeneerd. Resterende 🟡's staan hierboven en/of in de FRD/TD expliciet vastgelegd als bewuste, benoemde beslissing (geen stilzwijgende aannames) — met name de volumebegrenzing op de retry-sweep (Security Engineer) en het ontbreken van een unmount-guard (React Architect), die allebei een reëel maar bewust geaccepteerd residual risk blijven voor déze feature.

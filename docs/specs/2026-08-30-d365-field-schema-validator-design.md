# Data model: D365-veldvalidatie (Validate fields)

## BRD

**Als** admin (rol `admin`) die de Data model-beheerpagina gebruikt
**wil ik** op elk moment kunnen checken of de D365-bronvelden achter de actieve kolommen van een tabel nog echt bestaan in D365
**zodat** ik een hernoemd, verwijderd of nooit-bestaand veld zíe vóórdat ik het weer aanzet, en niet pas nadat het de nachtelijke sync heeft geraakt.

**Probleem nu:**

- Commit `adf9201` ("fix: keep nonexistent D365 fields out of the purchase-order refresh") toont het exacte faalscenario: `RemainingPurchasePhysicalQuantity` stond als actieve bronkolom in `tb_columns` (migratie 027, "uit D365-docs, niet uit `$metadata`" — zie migratie 043) en bestaat niet op `PurchaseOrderLineV2`. Elke refresh met die kolom actief kreeg een HTTP 400 op de hele PO-fetch.
- Er bestaan al **twee** vangnetten, en beide zijn *reactief*:
  1. **Runtime self-heal** (`fetchPurchaseOrderRecords` in `server/services/D365ODataService.js`, sinds `adf9201`): bij een HTTP 400 op `$select` probeert de fetch één keer opnieuw zonder `$select`, vergelijkt de teruggekregen velden met wat er gevraagd was, en laat `TableDataService.applyDroppedSelectFields` de foute bronkolom(men) definitief verwijderen uit `tb_columns` (hard delete, `deleteSourceColumnsByIds`). Dit werkt pas **nadat** een refresh al één keer op zijn bek is gegaan, en is alleen zichtbaar via een `notice_text` in `D365RefreshHistory.jsx` / `D365RefreshLivePanel.jsx` — een admin die daar niet kijkt, ziet niets.
  2. **"Discover D365 fields"-knop** (`discoverSourceFields` in `TableDataService.js`, route `POST /api/data/:tableKey/discover-fields`): haalt een velden-loze sample op (60 rijen) en **prunt meteen** bronkolommen die D365 niet teruggeeft. Dit ontdekt hetzelfde probleem, maar alleen als een admin er expliciet aan denkt om te klikken — en het muteert meteen (verwijdert), zonder eerst per kolom te laten zien wát er zou verdwijnen.
- Wat ontbreekt: een manier om **per kolom, zonder iets te wijzigen**, te zien of het onderliggende D365-veld nog bestaat — vóórdat een admin "Visible in table" weer aanzet voor een kolom die er (nog) niet uitgehaald is, of vóórdat hij blind op "Discover D365 fields" klikt en kolommen kwijtraakt zonder eerst te weten welke.
- De bestaande "Sample value"-kolom in `EntityConfigTable.jsx` lost dit niet op: die toont `—` zowel wanneer een veld leeg is (bestaat wél, is null) als wanneer een veld niet bestaat. Beide zien er voor de admin identiek uit.

**Succes (toetsbaar):**

- Een knop **"Validate fields"** staat op elke tab van de Data model-pagina (Purchase orders, Vendors, Items, Product receipt lines), naast de bestaande "Discover D365 fields".
- Een klik haalt een live D365-sample op (dezelfde soort no-`$select`-sample als Discover, 60 rijen) en vergelijkt elk **actief** bronveld (`tb_columns.source = 'source'`, `is_active = 1`) tegen de veldnamen die D365 in die sample teruggeeft.
- Elke getroffen kolom krijgt een rode Fluent `Badge` ("Not found in D365") inline in de bestaande D365-veldkolom van de tabel (`DataPreviewColumnConfigRow.jsx`), met een `Tooltip` die uitlegt wat dat betekent.
- Een `MessageBar` boven de tabellen toont hoeveel kolommen zijn geraakt (of een korte "alles klopt"-melding, of een "kon niet checken"-melding bij een lege sample).
- **Validate fields wijzigt niets** in `tb_columns` — puur diagnose, geen `INSERT`/`UPDATE`/`DELETE`. Dat onderscheidt het bewust van "Discover D365 fields".
- Werkt op alle vier de tabs (purchase-orders met header + line, en de drie single-entity-tabs).
- Reproduceerbaar: een actieve bronkolom met een niet-bestaand veld (zoals `RemainingPurchasePhysicalQuantity` in `adf9201`) krijgt na een klik op "Validate fields" een zichtbare Badge, zonder dat `tb_columns` verandert.

**Non-goals:**

- Geen D365 OData `$metadata`-fetch/parse (zie FRD, expliciet afgewezen — de sample-based aanpak is en blijft de bron van waarheid in deze codebase).
- Geen automatische validatie vóór elke nachtelijke refresh (preflight). Het runtime-zelfherstel uit `adf9201` lost dat al op — binnen dezelfde refresh-run, met een zichtbare `notice_text` — en dat gebeurt maar één keer per kolom (de kolom wordt daarna hard verwijderd). Een preflight-call zou D365-verkeer toevoegen aan élke refresh voor een geval dat na de eerste keer al verholpen is.
- Geen automatische validatie bij het laden van de Data model-pagina. Zelfde bewuste keuze als bij "Discover D365 fields" (zie code-comment: "Alleen via POST /discover-fields ... nooit automatisch bij GET /datamodel"): een GET krijgt geen D365-call als neveneffect.
- Geen wijziging aan het gedrag van "Discover D365 fields" (`discoverSourceFields`) — blijft muterend, blijft ongewijzigd.
- Geen wijziging aan de nachtelijke refresh-flow zelf (`purchaseOrdersFetch`, `refreshRetainedPurchaseOrders`, `fetchPurchaseOrderRecords`) — het bestaande zelfherstel-pad blijft de vangnet-laag voor de sync; deze feature is alleen het admin-facing diagnose-instrument.
- Geen validatie van inactieve, `custom`- of `lookup`-kolommen (die voeden `$select` niet en kunnen de sync dus niet breken).
- Geen persistente opslag van het validatieresultaat (geen nieuwe SQL-kolom/tabel, geen `localStorage`). Elke klik is een verse, wegwerpbare check.
- Geen wijziging aan andere borden of aan de PO-board kolommenu ("connected-status" uit commit `f34b6bb` is een andere, statische indicator op een andere pagina — geen live D365-check).

**Constraints:**

- UI Engels (`.cursor/rules/app-taal.mdc`): knoplabel, tooltip, badge-tekst, meldingen.
- `requireSession` (al op app-niveau voor `/api/data`, `server/server.js`) + `requireRole(ROLES.ADMIN)` op de nieuwe route — zelfde patroon als de bestaande `/discover-fields`-route.
- Componenten/hooks ≤300 regels. `EntityConfigTable.jsx` staat al op 290 — netto budget ≤10 regels in dat bestand. `useDataModelAdmin.js` staat al op 392 (al over de norm, bestaande schuld) — deze feature voegt daar **letterlijk 0 regels** aan toe: `useD365FieldValidation` wordt **niet** door `useDataModelAdmin.js` gecomponeerd, maar rechtstreeks door `AdminDataModel.jsx` aangeroepen (zie TD, Client-sectie). Dat is een harde eis, geen richtlijn — een eerdere TD-versie sprak zichzelf hierover tegen (zie ## Review, Dev Lead/React Architect) en dat is nu ondubbelzinnig opgelost door het integratiepunt te verplaatsen.
- Geen server-side rate limiting/in-flight-dedup op de nieuwe `/validate-fields`-route. Bewuste, expliciete keuze (zie ## Review, Security Engineer/Backend Engineer): symmetrisch met het bestaande, ongewijzigde gat op `/discover-fields` — zelfde blast radius als vandaag, geen nieuwe regressie. Als D365-throttling ooit een probleem wordt, geldt dat voor beide knoppen tegelijk en is een gedeelde cooldown/dedup-fix een apart issue, niet iets wat deze feature in scope hoort te nemen.
- Fluent v9 tokens; rode badge via `color="danger"` (bestaand patroon in dit project, geen hardcoded hex).
- Geen extra `apiRequest`-call als neveneffect van page-load — alleen op knopklik (zelfde keuze als "Discover D365 fields").
- Hergebruik van de bestaande sample-techniek (`FIELD_DISCOVERY_ROW_LIMIT`, `collectDiscoveredFields`, `listStaleSourceColumns`) — geen tweede D365-fetch-implementatie.
- Server-kant volledig read-only voor dit pad: geen schrijfstatements.
- OTAP local-first: ontwikkelen en testen op `localhost` (`npm run dev:all`), geen `git push` zonder expliciet verzoek.

## FRD

**Gekozen approach:** Hergebruik de bestaande, al vertrouwde sample-based discovery-machinery (dezelfde die `discoverSourceFields` en het runtime-zelfherstel uit `adf9201` al gebruiken) in een **nieuwe, read-only** validatie-actie — server retourneert alleen een diff, muteert niets — met een inline rode `Badge` op kolomniveau in de bestaande admin-tabel. Geen nieuwe subsystem voor D365-schemakennis.

Concreet:
- Server extraheert de sample-fetch die nu inline bovenaan `discoverSourceFields` staat naar een gedeelde `fetchFieldDiscoverySample(table)`, hergebruikt door zowel de bestaande (muterende) discovery als de nieuwe (read-only) validatie.
- De nieuwe `validateSourceFields(tableKey)` roept die sample-fetch aan, bouwt `collectDiscoveredFields(records, scope)` (ongewijzigd, bestaat al), en hergebruikt **letterlijk** `listStaleSourceColumns` uit `server/utils/discoverSourceColumns.js` — die functie berekent nu al exact "welke bestaande actieve bronkolommen zitten niet in de discovered set, exclusief protected/verplichte velden" en wordt vandaag alleen aangeroepen vanuit het prune-pad. Er verandert niets aan die functie; ze krijgt alleen een tweede aanroeper die het resultaat toont in plaats van verwijdert.
- Een kleine gedeelde helper `protectedSourceFieldsForTable(table, scope)` vervangt de losse, inline gedupliceerde opbouw van de protected-veldenlijst die nu al twee keer voorkomt (`dropIllegalSelectSourceColumns`, `syncSourceColumnsFromRecords`) — de nieuwe validatiefunctie wordt de derde aanroeper. Zonder die extractie zou het een derde kopie worden van `table.key === 'purchase-orders' ? REQUIRED_HEADER_D365_FIELDS : []`.

**Afgewezen:**

- **A2 — D365 `$metadata` XML fetch + parse per entiteit** (het uitgangsidee). Afgewezen omdat de codebase hier al een expliciete, bewuste keuze tégen heeft gemaakt: het commentaar bij `discoverSourceFields` zegt letterlijk *"Niet gokken uit docs — alleen velden die een `$select`-loze sample teruggeeft"*. Migratie 027 zette `RemainingPurchasePhysicalQuantity` juist aan de hand van D365-*documentatie* (niet metadata) — en dat bleek dus al fout te kunnen zijn; `$metadata` parsen zou een tweede, aparte waarheidsbron toevoegen (XML-parser, caching per entiteit, weer een plek die uit sync kan raken met wat de sample-aanpak al zegt) zonder aantoonbaar beter te zijn: beide antwoorden dezelfde vraag ("bestaat dit veld écht"), en de sample-aanpak wordt al vertrouwd voor zowel insert (discovery) als removal (`adf9201`'s retry-pad).
- **A3 — Automatische preflight-validatie vóór elke nachtelijke refresh.** Afgewezen: dit dupliceert wat `adf9201` al reactief oplost (zelfherstel binnen dezelfde refresh-run, met zichtbare `notice_text`), en voegt een D365-call toe aan élke refresh voor een fout die na de eerste keer al verholpen is (de kolom is dan hard verwijderd). Botst met de perf-regel "geen onnodige extra calls".
- **A4 — Validatie automatisch laten meelopen in `GET /:tableKey/datamodel`** (bij elk bezoek van de pagina). Afgewezen om dezelfde reden als waarom "Discover D365 fields" bewust knop-only is: een GET krijgt geen D365-call als neveneffect.

**Happy path**

1. Admin opent de Data model-tab (Purchase orders, Vendors, Items of Product receipt lines).
2. Klikt **"Validate fields"**, naast de bestaande "Discover D365 fields"-knop.
3. Server haalt een kleine live sample op (60 rijen, geen `$select` — zelfde soort call als Discover) en vergelijkt de gevonden veldnamen met de `source_field` van elke actieve bronkolom.
4. Eén request/response, geen polling (zelfde patroon als Discover fields; geen lang-lopende job zoals een refresh).
5. Getroffen kolommen tonen meteen een rode `Badge` ("Not found in D365") in de D365-veldkolom; een `MessageBar` boven de tabel meldt het aantal.
6. Admin beslist zelf: kolom uitzetten via de bestaande "Visible in table"-switch, alsnog "Discover D365 fields" klikken om de kolom definitief te laten verwijderen, of niets doen.
7. Opnieuw klikken ververst de check gewoon; er wordt niets onthouden tussen klikken.

**Rollen:** alleen `admin` (zelfde gate als de rest van de Data model-pagina en van "Discover D365 fields"). Geen nieuwe rol, geen aparte permissie.

**Leeg:**

- Geen actieve bronkolommen op een scope (bijv. een tabel zonder line-scope) → die scope wordt overgeslagen, geen Badge, geen melding voor die scope.
- Live sample komt leeg terug (0 records — lege tabel, streng syncfilter) → `listStaleSourceColumns` geeft bewust `[]` terug (bestaande guard: een lege discovery mag nooit alles als "stale" aanmerken). De `MessageBar` toont in dat geval expliciet *"Could not check — D365 returned no sample rows"*, niet *"0 columns flagged"* — anders leest een lege sample ten onrechte als "alles is in orde".
- Alle actieve bronvelden bestaan → korte succesmelding ("All columns match the last D365 check.") zodat de klik zichtbaar iets deed.

**Fout:**

- D365 onbereikbaar, timeout of 403 tijdens de sample-fetch → dezelfde afhandeling als "Discover D365 fields": de `apiRequest`-call gooit, de hook zet `error`, de bestaande foutweergave in `AdminDataModel.jsx` toont de melding. Geen nieuwe foutcomponent.
- Dubbelklikken → knop is `disabled` zolang de check loopt. Eigen `validating`-boolean in `useD365FieldValidation` (niet het gedeelde `togglingKey` van `useDataModelAdmin.js` — die hook wordt door deze feature niet aangeraakt, zie TD/Constraints), functioneel hetzelfde busy-gate-idee als `togglingKey === 'discover-fields'` nu al toepast, maar in de nieuwe, aparte hook.

**Overlap:** twee admins die tegelijk valideren krijgen allebei hun eigen (mogelijk net iets andere) resultaat — geen gedeelde state, geen schrijfconflict mogelijk, want puur leeswerk. Anders dan "Discover D365 fields" (dat wél muteert en dus al zijn eigen busy-gate nodig heeft) kan Validate fields nooit met zichzelf of met een refresh botsen.

**UI:**

- Knop **"Validate fields"** (`appearance="secondary"`, icoon `CheckmarkCircleRegular`) in dezelfde `discoverRow`-flexcontainer in `DataPreviewTables.jsx`, direct naast "Discover D365 fields". `AdminInfoHint` ernaast met een korte Engelse uitleg (nieuwe entry in `dataModelInfoCopy.js`).
- Badge: `<Badge appearance="tint" color="danger" size="small" icon={<ErrorCircleRegular />}>Not found in D365</Badge>`, zelfde kleur/opmaak als bestaande `color="danger"`-badges in dit project (o.a. `StepPublish.jsx`, `PurchaseOrderRowStatusBadge.jsx`). `Tooltip` erbij met uitleg — per-rij `Tooltip` is al de norm in `DataPreviewColumnConfigRow.jsx` (zie de bestaande "Key column: cannot be hidden"- en "Not available"-tooltips op elke rij); dit is een kleine, niet-gevirtualiseerde admin-tabel, geen board met duizenden rijen, dus geen perf-bezwaar tegen Tooltip-per-rij.
- `MessageBar` (`intent="warning"`) boven de tabellen met het aantal getroffen kolommen — zelfde plek en patroon als de bestaande discovery-`MessageBar` (`intent="info"`) in `AdminDataModel.jsx`.
- Alle labels, tooltip-tekst en meldingen in het Engels.

**Zichtbaarheid:** alleen bruikbaar voor `admin` (net als de rest van deze pagina; suppliers en employees komen hier niet). Het resultaat wordt nergens opgeslagen — geen `localStorage`, geen SQL-kolom. Sluit de admin het tabblad of navigeert hij weg, dan is de markering weg; dat is acceptabel, want dit is een diagnose-hulpmiddel op het moment van kijken, geen audit-trail (die bestaat al, reactief, via `notice_text` in de refresh-geschiedenis). Geen nieuwe `audit_log`-entry voor een Validate-klik: het is een read-only leesactie zonder effect op data (geen andere admin of gebruiker kan iets zien veranderen), exact zoals een `GET` nergens gelogd wordt op deze pagina — pas wanneer een actie ook daadwerkelijk iets wijzigt (zoals "Discover D365 fields" dat vandaag al niet audit-logt) zou dat overwogen worden, en dat blijft dan een keuze voor die bestaande knop, niet iets wat deze feature in scope neemt.

**Hergebruik:** `fetchEntityRecords` / `fetchPurchaseOrders` (`selectFields: null`, ongewijzigd), `collectDiscoveredFields`, `listStaleSourceColumns` (`server/utils/discoverSourceColumns.js`, ongewijzigd), `FIELD_DISCOVERY_ROW_LIMIT`, het bestaande Badge/Tooltip-patroon en de `color="danger"`-conventie, de bestaande `discoverRow`-toolbar in `DataPreviewTables.jsx`, het bestaande `MessageBar`-patroon in `AdminDataModel.jsx`, het bestaande `requireRole(ROLES.ADMIN)`-routepatroon, `getTableByKey`, `listColumns`.

## TD

### Hergebruik (concrete paden)

| Wat | Pad |
|-----|-----|
| Sample-fetch (60 rijen, geen `$select`) | `discoverSourceFields` in `server/services/TableDataService.js` (~2536-2564) — hier uit geëxtraheerd naar `fetchFieldDiscoverySample(table)` |
| Veldontdekking uit een sample | `collectDiscoveredFields(records, scope)` — `TableDataService.js` (~1654), **ongewijzigd**, tweede aanroeper |
| Stale-kolom-diff | `listStaleSourceColumns(existingColumns, discoveredFields, protectedSourceFields)` — `server/utils/discoverSourceColumns.js` (~8-30), **ongewijzigd**, tweede aanroeper |
| Protected/verplichte velden per tabel (scope-vorm) | `syncSourceColumnsFromRecords` (~1805-1812) bouwt dit al per scope (`protectedMaster`/`protectedLine`) — **letterlijk** geëxtraheerd naar `protectedSourceFieldsForTable(table, scope)`, tweede aanroeper wordt de nieuwe validatiefunctie. **`dropIllegalSelectSourceColumns`** (~1723-1728) bouwt een ANDERE, ongescoped vorm (header+line samengevoegd, toegepast op `[...masterCols, ...detailCols]`) en blijft bewust **buiten** deze extractie — zie ## Review (Backend Engineer / Refactor Specialist) |
| Kolommen lezen | `listColumns({ tableId, scope, includeInactive: false })` — bestaand |
| Route-auth | `requireRole(ROLES.ADMIN)` — `server/middleware/auth.js` / `server/constants/roles.js`, zelfde patroon als `POST /:tableKey/discover-fields` (`server/routes/data.js` ~458) |
| Admin-tabel (D365-veldkolom + Badge/Tooltip-plek) | `src/components/admin/datamodel/DataPreviewColumnConfigRow.jsx` (regel 105-118, bestaande D365-field-cel) |
| Kolomtabel-container | `src/components/admin/datamodel/EntityConfigTable.jsx` |
| Toolbar met "Discover D365 fields" | `src/components/admin/datamodel/DataPreviewTables.jsx` (`discoverRow`) |
| Paginacompositie + discovery-`MessageBar` + vaste per-tab hook-instanties | `src/components/admin/datamodel/AdminDataModel.jsx` (`formatDiscoveryMessage`-patroon, en het bestaande patroon van vier vaste `useDataModelAdmin(tableKey)`-aanroepen op regel 55-58) |
| Admin-datamodel-hook | `src/hooks/useDataModelAdmin.js` (392 regels — blijft **volledig ongewijzigd**, 0 regels netto; `useD365FieldValidation` wordt niet hierin gecomponeerd, zie Client-sectie) |
| Info-teksten | `src/components/admin/datamodel/dataModelInfoCopy.js` |
| Fluent danger-badge-conventie | `src/components/supplier/PurchaseOrderRowStatusBadge.jsx`, `src/components/admin/datamodel/excel-link/StepPublish.jsx` |
| Versie | `src/config/version.js` (PATCH bij implementatie) |

### Server: read-only validatiepad

`server/services/TableDataService.js`:

```js
// Extractie uit discoverSourceFields — ongewijzigd gedrag, nu ook bruikbaar voor validate.
async function fetchFieldDiscoverySample(table) {
  if (table.key === 'purchase-orders') {
    const result = await fetchPurchaseOrders({
      supplierAccount: null, top: FIELD_DISCOVERY_ROW_LIMIT, skip: 0,
      fetchAll: false, maxItems: FIELD_DISCOVERY_ROW_LIMIT,
    });
    return (Array.isArray(result.items) ? result.items : []).map((order) => ({
      masterRaw: order.raw || {},
      details: (Array.isArray(order.lines) ? order.lines : []).map((line) => ({ raw: line.raw || {} })),
    }));
  }
  const sample = await fetchEntityRecords({
    sourceEntity: table.sourceEntity, top: FIELD_DISCOVERY_ROW_LIMIT, skip: 0,
    fetchAll: false, maxItems: FIELD_DISCOVERY_ROW_LIMIT, selectFields: null,
  });
  return (Array.isArray(sample.items) ? sample.items : []).map((raw) => ({
    masterRaw: raw && typeof raw === 'object' ? raw : {},
    details: [],
  }));
}

// Gedeeld door syncSourceColumnsFromRecords (bestaand, prune-pad) en de nieuwe validateSourceFields.
// dropIllegalSelectSourceColumns roept dit BEWUST NIET aan (zie ## Review, Backend Engineer /
// Refactor Specialist): die functie is niet scope-vormig — ze bouwt vandaag één samengevoegde
// protected-set (header+line) en past die ongescoped toe op [...masterCols, ...detailCols]. Haar
// eigen inline lijst (regel ~1723-1728) blijft ongewijzigd staan; ze consolideren met deze helper
// zou de union-vorm expliciet moeten uitschrijven en een eigen characterization-test verdienen —
// dat is een aparte, latere refactor, buiten scope van deze feature.
function protectedSourceFieldsForTable(table, scope) {
  if (scope === 'master') {
    return uniqueFieldList([
      ...(table.keyFields || []),
      ...requiredMasterFieldsFromTable(table),
      ...(table.key === 'purchase-orders' ? REQUIRED_HEADER_D365_FIELDS : []),
    ]);
  }
  return uniqueFieldList(table.key === 'purchase-orders' ? REQUIRED_LINE_D365_FIELDS : []);
}

// Nieuw, read-only: geen prune, geen INSERT/UPDATE/DELETE.
async function validateSourceFields(tableKey) {
  const table = await getTableByKey(tableKey);
  // Externe D365-call → time() volgens CLAUDE.md ("Zware backend-suboperatie").
  const records = await time('d365_field_validation_sample', () => fetchFieldDiscoverySample(table));
  const headerFields = collectDiscoveredFields(records, 'header');
  const lineFields = collectDiscoveredFields(records, 'line');

  async function staleForScope(scope, discoveredFields) {
    const existing = (await time('d365_field_validation_columns', () => listColumns({ tableId: table.id, scope, includeInactive: false })))
      .filter((col) => col.source === 'source');
    const protectedFields = protectedSourceFieldsForTable(table, scope);
    return listStaleSourceColumns(existing, discoveredFields, protectedFields)
      .map((col) => ({ columnId: col.id, key: col.key, label: col.label, sourceField: col.sourceField }));
  }

  const [header, line] = await Promise.all([
    staleForScope('master', headerFields),
    staleForScope('detail', lineFields),
  ]);
  return { header, line, sampledRows: records.length, checkedAt: new Date().toISOString() };
}
```

`discoverSourceFields` blijft ongewijzigd behalve dat de sample-fetch nu via `fetchFieldDiscoverySample(table)` loopt in plaats van inline — gedrag identiek, bestaande tests blijven groen. `syncSourceColumnsFromRecords` roept na de extractie `protectedSourceFieldsForTable('master')` / `protectedSourceFieldsForTable('detail')` aan in plaats van haar eigen inline `protectedMaster`/`protectedLine`-opbouw — dat is een **letterlijke 1-op-1 verplaatsing** van dezelfde `uniqueFieldList([...])`-expressie (vergelijk regel 1805-1812 van vandaag met de functie hierboven), geen gedragswijziging. **`dropIllegalSelectSourceColumns` wordt niet aangepast** en blijft zijn eigen, ongescoped inline protected-set gebruiken — dat is een bewuste scope-beperking van deze feature, geen vergeten refactor (zie ## Review). Dit is de directe oplossing voor de blocker van zowel Backend Engineer als Refactor Specialist: het hoogste-risico pad — `dropIllegalSelectSourceColumns`, dat via `applyDroppedSelectFields` in het `adf9201`-zelfherstelpad hangt en hard delete uitvoert — wordt door deze feature helemaal niet aangeraakt, dus er is geen "gedrag identiek"-belofte meer nodig voor precies het pad waar zo'n belofte het lastigst hard te maken was.

`sampledRows: 0` (lege sample) → beide `staleForScope`-aanroepen geven `[]` terug via de bestaande guard in `listStaleSourceColumns` ("`if (!discovered.size) return [];`" — een lege discovery wist niets). De route/hook gebruikt `sampledRows === 0` om het "kon niet checken"-pad te tonen in plaats van "0 kolommen geraakt".

`validateSourceFields` toevoegen aan `module.exports`.

### Route

`server/routes/data.js`, direct na de bestaande `/discover-fields`-route (~regel 465):

```js
// POST /api/data/:tableKey/validate-fields — admin: check of actieve bronvelden nog in D365 bestaan.
// Read-only: muteert nooit tb_columns (in tegenstelling tot /discover-fields).
router.post('/:tableKey/validate-fields', requireRole(ROLES.ADMIN), async (req, res, next) => {
  try {
    return res.json(await dataService.validateSourceFields(req.params.tableKey));
  } catch (err) {
    return next(err);
  }
});
```

`requireSession` staat al op het hele `/api/data`-mount (`server/server.js:184`); `requireRole(ROLES.ADMIN)` erbovenop is identiek aan `/discover-fields` en `/datamodel`. Geen nieuwe body-parsing, geen user-input buiten `tableKey` (die loopt al door `getTableByKey`, dat een typed error met `.status` gooit bij een onbekende tabel — bestaand gedrag, geen wijziging nodig).

### Client: nieuwe hook + doorgifte

Nieuw: `src/hooks/useD365FieldValidation.js` (nieuw bestand, ruim onder 300 regels). **Belangrijke wijziging t.o.v. een eerdere versie van deze TD: deze hook wordt NIET door `useDataModelAdmin.js` gecomponeerd** (zie ## Review, Dev Lead / React Architect) — hij wordt rechtstreeks door `AdminDataModel.jsx` aangeroepen, met `tableKey` (niet `adminBasePath`, die is privé binnen `useDataModelAdmin.js`) als parameter. `BOARD_TB_SOURCE` staat sinds de board-cutover (Fase 8, `src/config/featureFlags.js`) hard op `true`, dus het endpoint is altijd `/data/${tableKey}/validate-fields` — geen aparte pad-logica nodig, geen afhankelijkheid van `useDataModelAdmin.js`'s interne `adminBase()`-helper:

```js
export function useD365FieldValidation(tableKey) {
  const [result, setResult] = useState(null);   // ruwe server-response of null (nog niet gecheckt)
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');

  const validateFields = useCallback(async () => {
    setValidating(true);
    setError('');
    try {
      setResult(await apiRequest(`/data/${tableKey}/validate-fields`, { method: 'POST' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setValidating(false);
    }
  }, [tableKey]);

  const staleSourceFields = useMemo(() => ({
    header: new Set((result?.header || []).map((f) => String(f.sourceField || '').toLowerCase())),
    line: new Set((result?.line || []).map((f) => String(f.sourceField || '').toLowerCase())),
  }), [result]);

  // Stabiele referentie voor de hele return-waarde (hook-API-contract: "stabiele referenties via
  // useMemo/useCallback"), ook al wordt dit object nu niet meer in een andere hook's return-useMemo
  // gespreid — de consument (AdminDataModel.jsx) geeft losse velden door aan het gememoized
  // DataPreviewTables, dus stabiliteit hier blijft de juiste default (zie ## Review, React Architect).
  return useMemo(() => ({
    staleSourceFields,               // { header: Set<string>, line: Set<string> } — lowercased source_field
    staleCount: (result?.header?.length || 0) + (result?.line?.length || 0),
    sampledRows: result?.sampledRows ?? null,
    validated: result !== null,
    validateFields,
    validating,
    validationError: error,
  }), [staleSourceFields, result, validateFields, validating, error]);
}
```

`useDataModelAdmin.js` blijft **volledig ongewijzigd** (392 regels, 0 netto toevoeging) — precies wat de BRD-constraint belooft, nu zonder de tegenstrijdigheid van de vorige TD-versie. In plaats daarvan componeert `AdminDataModel.jsx` vier vaste instanties van `useD365FieldValidation`, exact hetzelfde patroon als de vier bestaande, vaste `useDataModelAdmin(tableKey)`-aanroepen op regel 55-58:

```js
// AdminDataModel.jsx — spiegelt de bestaande vier useDataModelAdmin-instanties (regel 55-58).
const purchaseOrdersValidation = useD365FieldValidation('purchase-orders');
const vendorsValidation = useD365FieldValidation('vendors');
const itemsValidation = useD365FieldValidation('items');
const productReceiptLinesValidation = useD365FieldValidation('product-receipt-lines');
const fieldValidationByTab = {
  'purchase-orders': purchaseOrdersValidation,
  vendors: vendorsValidation,
  items: itemsValidation,
  'product-receipt-lines': productReceiptLinesValidation,
};
const selectedValidation = fieldValidationByTab[selectedTab];
```

Vier vaste, permanent gemounte instanties (niet één gedeelde instantie die van `tableKey` wisselt) is bewust: dat is precies waarom het validatieresultaat per tab geïsoleerd blijft zonder dat er ooit ergens expliciet gereset moet worden bij tabwissel — zelfde reden waarom dat vandaag al werkt voor `useDataModelAdmin` (zie ## Review, Refactor Specialist). Wijzigt iemand dit later naar één gedeelde instantie met een wisselende `tableKey`, dan moet diegene zelf een reset-bij-tabwissel toevoegen — dat is nu expliciet vastgelegd, niet meer impliciet.

**Propketen** (spiegelt hoe `relationFields` al scope-specifiek wordt doorgegeven):

- `AdminDataModel.jsx` (124 → ~160 regels): vier `useD365FieldValidation`-aanroepen + `fieldValidationByTab`-lookup (zie boven). Leest `selectedValidation.staleSourceFields` / `staleCount` / `validated` / `sampledRows` / `validationError`; toont een tweede `MessageBar` (`intent="warning"`) via een nieuwe `formatValidationMessage(validation)` naast de bestaande `formatDiscoveryMessage`, en een aparte foutregel voor `selectedValidation.validationError` (zelfde `styles.error`-styling als het bestaande `selectedModel.error`, dezelfde afhandeling als FRD > Fout beschrijft). Geeft **één** gebundelde prop door aan `DataPreviewTables`: `fieldValidation={{ onValidateFields: selectedValidation.validateFields, validating: selectedValidation.validating, staleSourceFields: selectedValidation.staleSourceFields }}` — gebundeld omdat `DataPreviewTables.jsx` al 13 props heeft; drie losse nieuwe props zou dat verder opblazen, één gebundelde prop niet (zuiver nieuwe toevoeging, raakt geen bestaande prop-signature).
- `DataPreviewTables.jsx` (144 → ~165 regels): nieuwe `Button` "Validate fields" in de bestaande `discoverRow`, gebruikt `fieldValidation.onValidateFields` / `fieldValidation.validating` voor de disabled-state; geeft per sectie het scope-specifieke Set door aan `EntityConfigTable` als eigen prop — `staleSourceFields={section.scope === 'header' ? fieldValidation.staleSourceFields.header : fieldValidation.staleSourceFields.line}` (zelfde patroon als de bestaande `relationFields`-doorgifte op regel 127).
- `EntityConfigTable.jsx` (290 → ≤300 regels, budget ≤10 regels): nieuwe prop `staleSourceFields` (Set) — 16 → **17 props**. **Bewuste, expliciet vastgelegde keuze** (zie ## Review, Dev Lead-warning): dit bestand zit al ruim over de 10-props-limiet (bestaande schuld, niet door deze feature veroorzaakt); de nieuwe prop wordt *niet* samengevoegd met de bestaande `relationFields`-prop om geen werkende, ongerelateerde prop-signature aan te raken buiten de scope van deze feature. **Eerstvolgende keer dat dit bestand wordt aangeraakt is splitsing de eerste stap** — zelfde afspraak als voor de 290-regel-grens hieronder. In de bestaande `.map()` (regel 259-278) berekent `EntityConfigTable` zelf de per-rij boolean, exact zoals het vandaag al voor `isRelationField` doet (regel 260-261) — niet de hook, die kent de kolommenlijst niet (corrigeert de eerdere TD-tekst hierover, zie ## Review, Dev Lead-warning):
  ```js
  const isRelationField = relationFields?.has ? relationFields.has(fieldKey) : false;
  const isStaleSourceField = staleSourceFields?.has ? staleSourceFields.has(fieldKey) : false;
  ```
  Beide op dezelfde, al-bestaande null-veilige `fieldKey = String(column.d365Field || '').toLowerCase()` (regel 260) — dit sluit meteen het null-`sourceField`-risico uit de React Architect-warning uit, want dit is letterlijk de bestaande, altijd-veilige expressie, hergebruikt in plaats van een nieuwe. Geeft **één** gebundelde prop `columnFlags={{ isRelationField, isStaleSourceField }}` door aan `DataPreviewColumnConfigRow` in plaats van twee losse props (zie volgende bullet).
- `DataPreviewColumnConfigRow.jsx` (220 → ~235 regels): de bestaande losse prop `isRelationField` wordt vervangen door één gebundelde prop `columnFlags` (`{ isRelationField, isStaleSourceField }`), gedestructureerd binnenin de component. **Dit voorkomt de 11e prop die een eerdere TD-versie toevoegde** (zie ## Review, Dev Lead-blocker) — het component blijft op **exact 10 props**: `column, typeLabel, sampleValue, columnFlags, togglingKey, onToggleVisibility, onToggleVisibleAtDelete, onToggleWriteback, onToggleRccpMeasure, onDeleteColumn`. In de bestaande D365-field-cel (regel 105-118), **binnen de al-bestaande `<span className={styles.mono}>`-wrapper** (geen extra wrapper-`div`, zie ## Review, Dev Lead-warning over JSX-nesting):
  ```jsx
  {column.source === 'd365' ? (
    <span className={styles.mono}>
      {column.d365Field || '(derived)'}
      {columnFlags.isStaleSourceField ? (
        <Tooltip content="This D365 field was not found in the last live sample. It may have been renamed or removed." relationship="label">
          <Badge appearance="tint" color="danger" size="small" icon={<ErrorCircleRegular />}>Not found in D365</Badge>
        </Tooltip>
      ) : null}
    </span>
  ) : ( /* ongewijzigd: custom-column badges */ )}
  ```
  Nesting blijft `TableCell > span > Tooltip > Badge` — 4 niveaus, exact op de grens, niet eroverheen.
- `dataModelInfoCopy.js`: één nieuwe entry `validateFields`.

### Auth en validatie

- Nieuwe route achter `requireRole(ROLES.ADMIN)`, zelfde als de rest van de Data model-pagina.
- Server: geen nieuwe user-input om te valideren — `tableKey` loopt door de bestaande `getTableByKey`. Geen SQL-interpolatie: `listColumns`/`listStaleSourceColumns` zijn bestaande, al-geparametriseerde/pure functies.
- Geen mutatie mogelijk via dit pad: geen `INSERT`/`UPDATE`/`DELETE` in `validateSourceFields` of `fetchFieldDiscoverySample`.
- Client toont D365-veldnamen (`sourceField`) die al zichtbaar zijn voor elke admin op deze pagina — geen nieuwe gevoelige data.
- Geen server-side rate limiting/in-flight-dedup op `/validate-fields` — zie Constraints voor de expliciete, bewuste motivatie (symmetrisch met het bestaande gat op `/discover-fields`).

### Perf

- Eén D365-call per klik op "Validate fields" (60 rijen, geen `$select`) — identiek qua vorm en kosten aan de bestaande "Discover D365 fields"-call; geen nieuw callpatroon.
- Geen `apiRequest` als neveneffect van page-load.
- `staleSourceFields`-Sets worden één keer per response gebouwd (`useMemo` in de hook), niet per rij; per-rij lookup is een O(1) `Set.has` (zowel voor `isRelationField` als `isStaleSourceField`, in `EntityConfigTable`'s bestaande `.map()`).
- Geen extra SQL-queries t.o.v. wat `discoverSourceFields` al doet — `listColumns` wordt al twee keer per klik aangeroepen (header/line), net als bij discovery.
- De externe D365-sample-call (`fetchFieldDiscoverySample`) en de twee `listColumns`-aanroepen in `staleForScope` lopen door `time('d365_field_validation_sample', …)` / `time('d365_field_validation_columns', …)` — CLAUDE.md-verplichting voor externe calls/DB-queries, expliciet in de code-sketch opgenomen (zie ## Review, Backend Engineer-warning) zodat het niet op het geheugen van de implementeerder leunt.
- Vier vaste `useD365FieldValidation`-instanties in `AdminDataModel.jsx` (één per tab, altijd gemount) i.p.v. één instantie die herconstrueert bij tabwissel — geen extra re-renders t.o.v. het bestaande `useDataModelAdmin`-patroon, en de niet-geselecteerde tabs blijven simpelweg `validated: false` totdat een admin er zelf op klikt (geen achtergrond-D365-call voor tabs die niemand bekijkt).

### Volgorde (implementatie later, geen TBD)

1. Server: `fetchFieldDiscoverySample(table)` extraheren uit `discoverSourceFields`; gedrag ongewijzigd — bestaande `discoverSourceFields`-tests blijven groen.
2. Server: `protectedSourceFieldsForTable(table, scope)` extraheren **uit `syncSourceColumnsFromRecords`'s bestaande `protectedMaster`/`protectedLine`-opbouw** (letterlijke verplaatsing, geen gedragswijziging) + een equivalence-unit-test die, per tabel (`purchase-orders`, `vendors`, `items`, `product-receipt-lines`) en scope (`master`/`detail`), `protectedSourceFieldsForTable(table, scope)` vergelijkt met een vooraf vastgelegde golden-list — geschreven en groen **vóórdat** `syncSourceColumnsFromRecords` wordt omgezet naar de helper. `dropIllegalSelectSourceColumns` blijft bewust **buiten** deze stap: geen scope-parameter, geen aanroep van de nieuwe helper, ongewijzigd (zie ## Review, Backend Engineer / Refactor Specialist).
3. Server: `validateSourceFields(tableKey)` + co-located `.test.js` (mirrors `d365SelectFields.test.js`/`discoverSourceColumns.test.js`-stijl): geen mutatie op een stale kolom, lege sample → `[]` op beide scopes, protected/verplicht veld nooit in het resultaat, inactieve/`custom`/`lookup`-kolom nooit in het resultaat.
4. Route `POST /:tableKey/validate-fields` + korte routetest (403 zonder admin-rol, 200 met de verwachte vorm `{ header, line, sampledRows, checkedAt }`).
5. `dataModelInfoCopy.js`: `validateFields`-entry.
6. Nieuwe hook `src/hooks/useD365FieldValidation.js` + `.test.js`: busy-state, Set-opbouw uit een response, foutpad (D365 onbereikbaar), stabiele return-referentie (`useMemo`) bij ongewijzigde inputs.
7. `AdminDataModel.jsx`: vier `useD365FieldValidation(tableKey)`-aanroepen + `fieldValidationByTab`-lookup componeren (`useDataModelAdmin.js` blijft ongemoeid — zie Client-sectie).
8. `DataPreviewTables.jsx`: "Validate fields"-knop + gebundelde `fieldValidation`-prop, scope-specifieke doorgifte van `staleSourceFields` aan `EntityConfigTable`.
9. `AdminDataModel.jsx`: `formatValidationMessage` + tweede `MessageBar` (`intent="warning"`) + foutregel voor `validationError`, `fieldValidation`-prop doorgeven aan `DataPreviewTables`.
10. `EntityConfigTable.jsx`: `staleSourceFields`-prop ontvangen, per-rij `isStaleSourceField` berekenen (zelfde patroon als `isRelationField`), `columnFlags={{ isRelationField, isStaleSourceField }}` doorgeven aan `DataPreviewColumnConfigRow`.
11. `DataPreviewColumnConfigRow.jsx`: losse `isRelationField`-prop vervangen door gebundelde `columnFlags`-prop (houdt het component op 10 props); rode `Badge` + `Tooltip` in de D365-field-cel, binnen de bestaande `<span>`-wrapper; bestaand `DataPreviewColumnConfigRow.test.jsx` (67 regels) uitbreiden met een "toont Badge bij stale veld"-case en de `columnFlags`-prop-vorm aanpassen in de bestaande relatie-veld-tests.
12. Handmatige verificatie op `localhost`: zet lokaal tijdelijk een niet-bestaand veld actief (bv. via een losse lokale SQL-`UPDATE`, **niet** als migratie, **niet** op DEV/PROD) → "Validate fields" → Badge zichtbaar, `tb_columns` ongewijzigd → weer opruimen.
13. PATCH in `src/config/version.js` (`v1.52.68` → volgende patch).

### Aantoonbaar

- Actieve bronkolom met niet-bestaand veld (het `adf9201`-scenario) → na "Validate fields": rode Badge zichtbaar op die kolom, `MessageBar` toont het aantal, `tb_columns` blijft ongewijzigd (geen diff vóór/na de klik).
- Alle actieve velden bestaan → geen Badges, korte succesmelding.
- Lege D365-sample (streng filter/lege tabel) → geen valse Badges, aparte "kon niet checken"-melding in plaats van "0 kolommen geraakt".
- Inactieve, `custom`- of `lookup`-kolommen krijgen nooit een Badge.
- "Discover D365 fields" blijft ongewijzigd werken (voegt nog steeds toe/verwijdert, onafhankelijk van "Validate fields").
- Knop is disabled tijdens de call; een dubbelklik start geen tweede call.
- Werkt op alle vier de tabs (purchase-orders header + line, vendors, items, product-receipt-lines).
- UI-teksten zijn Engels.

## Review

Fase 4 (team): alle 🔴 van Dev Lead, React Architect, Backend Engineer en Refactor Specialist verwerkt in deze TD — geen resterende blockers. Overgebleven 🟡 zijn vastgelegd als expliciete beslissing, geen stilzwijgend geaccepteerde schuld.

| Persona | Was | Nu |
|---------|-----|-----|
| Dev Lead | 🔴 `DataPreviewColumnConfigRow` krijgt een 11e prop (`isStaleSourceField`), boven de 10-props-limiet | `isRelationField` + `isStaleSourceField` samengevoegd tot één prop `columnFlags` — component blijft op exact 10 props |
| Dev Lead | 🔴 BRD belooft "geen toevoeging aan `useDataModelAdmin.js`", TD liet de nieuwe hook er juist in componeren (392 regels, al over de cap) — tegenstrijdig | `useD365FieldValidation` wordt niet door `useDataModelAdmin.js` gecomponeerd; `AdminDataModel.jsx` roept 'm rechtstreeks aan, 4 vaste instanties (spiegelt de bestaande 4 `useDataModelAdmin`-instanties). `useDataModelAdmin.js` blijft 0 regels gewijzigd |
| Dev Lead | 🟡 `EntityConfigTable.jsx` krijgt een 17e prop (`staleSourceFields`), al over de 10-props-limiet | Bewuste keuze, expliciet vastgelegd in TD: geen consolidatie met de bestaande `relationFields`-prop (buiten scope), wel afgesproken dat splitsing de eerste stap is bij de volgende wijziging aan dit bestand |
| Dev Lead | 🟡 TD legt verkeerd uit wie de per-kolom stale-check berekent (suggereert: de hook) | Tekst gecorrigeerd: `EntityConfigTable` berekent het zelf per rij, `Set.has` in de bestaande `.map()`, exact zoals `isRelationField` vandaag al werkt |
| Dev Lead | 🟡 Badge+Tooltip in de D365-veldcel komt op 4 JSX-niveaus, geen marge | Code-sketch expliciet zonder extra wrapper-`div`, binnen de bestaande `<span>` — blijft op 4, niet eroverheen |
| React Architect | 🔴 `useD365FieldValidation`'s return niet gewrapt in `useMemo`, destabiliseert (in de oude opzet) de return-`useMemo` van `useDataModelAdmin.js` (14 deps, 4 permanent gemounte instanties, breekt de `memo()`-grens van `DataPreviewTables`) | Los van de architectuurwijziging (hook niet meer gecomponeerd in `useDataModelAdmin.js`, dus geen destabilisatie meer mogelijk op dat punt) wrapt de hook zijn eigen return alsnog in `useMemo`, conform het hook-API-contract |
| React Architect | 🔴 Platte `...fieldValidation`-spread zou `useDataModelAdmin.js`'s al >20-sleutel-brede API nog breder maken, in strijd met de BRD-belofte | Vervalt: er wordt niets meer in `useDataModelAdmin.js` gespreid — de hook levert zijn eigen, apart genest resultaat rechtstreeks aan `AdminDataModel.jsx` |
| React Architect | 🟡 Geen guard tegen `null`/`undefined` `sourceField` bij de per-rij lookup | Opgelost door de bestaande, al-veilige `fieldKey`-expressie (`String(column.d365Field \|\| '').toLowerCase()`) te hergebruiken voor zowel `isRelationField` als `isStaleSourceField`, i.p.v. een nieuwe, ongegarandeerde expressie |
| React Architect | 🟡 Geen cleanup/abort-guard tegen setState-na-unmount in `validateFields` | Blijft staan als bewuste, gedocumenteerde keuze — consistent met alle bestaande callbacks in `useDataModelAdmin.js`, geen nieuwe regressie |
| React Architect | 🟡 Feature-hook in `src/hooks/` i.p.v. bij de feature | Blijft staan — bevestigt bestaand precedent (`useDataModelAdmin.js` zelf), geen actie nodig |
| Backend Engineer | 🔴 Refactor van `dropIllegalSelectSourceColumns`/`syncSourceColumnsFromRecords` raakt het `adf9201`-mutatiepad zonder aangetoonde gedragsgelijkheid | `dropIllegalSelectSourceColumns` (het hard-delete-zelfherstelpad) wordt door `protectedSourceFieldsForTable` niet meer aangeraakt — blijft ongewijzigd. Alleen `syncSourceColumnsFromRecords` (al scope-vormig, letterlijke verplaatsing) en de nieuwe `validateSourceFields` delen de helper, plus een equivalence-test per tabel/scope vóór de refactor (Volgorde-stap 2) |
| Backend Engineer | 🟡 Geen server-side rate limiting/dedup op het nieuwe D365-endpoint | Expliciet vastgelegd als bewuste keuze in Constraints — symmetrisch met het bestaande, ongewijzigde gat op `/discover-fields` |
| Backend Engineer | 🟡 `time()`-instrumentatie ontbrak in de TD-codevoorbeelden voor de externe D365-call | Toegevoegd aan de code-sketch: `time('d365_field_validation_sample', …)` en `time('d365_field_validation_columns', …)` |
| Backend Engineer | 🟡 Kale `err.message`-passthrough naar de client | Blijft staan — identiek aan het bestaande `discoverSourceFields`-foutpad, geen nieuwe regressie |
| Security Engineer | (geen 🔴) | — |
| Security Engineer | 🟡 Geen server-side rate limiting op het nieuwe endpoint | Zelfde oplossing als bij Backend Engineer hierboven — nu één keer expliciet vastgelegd in Constraints i.p.v. voor beide personas apart |
| Security Engineer | 🟡 Gedeelde `protectedSourceFieldsForTable`-extractie raakt indirect het destructieve hard-delete-pad | Vervalt grotendeels: dat pad (`dropIllegalSelectSourceColumns`) wordt niet meer aangeraakt (zie Backend Engineer-blocker hierboven) |
| Security Engineer | 🟡 Geen `audit_log`-entry voor deze nieuwe admin-actie, geen motivatie in de TD | Eén expliciete zin toegevoegd aan FRD > Zichtbaarheid: read-only actie zonder effect op data, zelfde behandeling als de bestaande `GET`-routes op deze pagina |
| Refactor Specialist | 🔴 Claim "gedrag identiek" voor `dropIllegalSelectSourceColumns` is aantoonbaar onjuist — die functie is niet scope-vormig (ongescoped merge van header+line, toegepast op de gecombineerde kolomlijst), in tegenstelling tot `syncSourceColumnsFromRecords` | Optie (b) uit de review toegepast: `dropIllegalSelectSourceColumns` blijft volledig buiten de `protectedSourceFieldsForTable`-extractie, ongewijzigd. De helper wordt alleen gedeeld door de al vorm-identieke `syncSourceColumnsFromRecords` en de nieuwe `validateSourceFields` |
| Refactor Specialist | 🟡 4-laagse prop-keten (`AdminDataModel` → `DataPreviewTables` → `EntityConfigTable` → `DataPreviewColumnConfigRow`) voor één boolean-lookup | Blijft staan, nu expliciet benoemd als bewuste trade-off in de TD (spiegelt het bestaande `relationFields`-patroon); een volgende per-rij-diagnostiekfeature is het moment om een gedeelde context/selector te overwegen |
| Refactor Specialist | 🟡 Impliciete aanname dat de 4 `useDataModelAdmin`-instanties permanent en apart gemount blijven (tab-isolatie), nergens vastgelegd | Expliciet vastgelegd in de Client-sectie, en nu ook van toepassing op de 4 nieuwe `useD365FieldValidation`-instanties die hetzelfde patroon spiegelen |

# PO-board: exception filter in één stap als quick-filter tab

## BRD

**Als** staff-gebruiker (admin/employee) op het PO-board
**wil ik** 2 tot 4 kolomfilters (bijv. "delivery date is voorbij" ÉN "confirmed is No") in één klein formulier samenstellen en als tab opslaan
**zodat** ik een terugkerende samengestelde inkoopvraag ("late, onbevestigde orders") met één klik kan oproepen, zonder elke keer dat ik zo'n exception wil bouwen 2-4 losse kolommenu's na elkaar te openen.

**Probleem nu:** een kolomfilter (`filterByColumn`) ondersteunt al precies één operator+waarde per kolom, en meerdere actieve kolomfilters combineren al automatisch met AND — dat gebeurt zowel in de tabel (`filterItemsByColumnFilters` in `src/utils/tableViewFilterUtils.js`, gebruikt door `usePurchaseOrderTableView.processedItems`) als in de view-tabs-laag (`filterRowsByFilters` in `src/utils/viewTabs.js`). Sinds **View Tabs** (`docs/specs/2026-08-26-po-view-tabs-design.md`) bestaat er bovendien al een persistente, met-één-klik-toe-te-passen chip voor precies zo'n samengestelde AND-set: een extra tab bewaart een `extraFilters`-record met willekeurig veel kolomfilters en past ze in één klik toe (`selectTab` → `applyMergedFilters` → `mergeFilters` in `src/hooks/usePurchaseOrderViewTabs.js`). De dagelijkse frictie zit dus niet in "toepassen" — dat is al één klik en blijft na opslaan zo — maar in **het opzetten**: `+ New tab` (`PurchaseOrderNewTabDialog.jsx`) vraagt alleen een naam en start leeg; de 2-4 kolomfilters moet de gebruiker daarna nog steeds één voor één instellen via elk kolommenu apart (kolom openen → operator kiezen → waarde intypen → Apply, 2-4 keer na elkaar) voordat de tab bruikbaar is. Die opzet-stap is vandaag de enige overgebleven frictie, en die is puur een dialoog-probleem, geen filter-, opslag- of schemaprobleem.

**Succes (toetsbaar):**
- In het Tabs-menu van een actieve saved view (`PurchaseOrderViewTabMenuSection.jsx`, naast bestaand **Tab** en **Tabs from column…**) staat een derde item **Exception filter…**.
- Het opent een dialoog met een naamveld en standaard 2 filterrijen (kolom + operator + waarde), met **+ Add condition** tot maximaal 4 rijen.
- **Create** is uitgeschakeld tot: naam ingevuld, minstens 2 rijen een geldige kolom+operator+waarde hebben (zelfde geldigheid als een normaal kolomfilter — `hasActiveFilter`), en geen twee rijen dezelfde kolom kiezen.
- Na **Create**: een nieuwe tab verschijnt in de tabbalk (`PurchaseOrderViewTabBar`), wordt meteen actief, en het bord toont alleen rijen die aan **alle** ingevulde rijen tegelijk voldoen (AND).
- De tab werkt daarna identiek aan elke andere extra tab: opnieuw aanklikken past dezelfde AND-filter in één klik toe; hover toont de samenvatting (`PurchaseOrderViewTabHoverCard`); rechtermuisklik → **This tab only** verwijdert hem.
- De tab (en zijn filters) overleeft **Save as new view** / **Update current view** via de bestaande `view_state_json.tabs.extraTabs` — geen aparte opslag.
- **Reset view** verwijdert de tab, net als elke andere extra tab (`viewTabs.resetTabs()`).
- Geen nieuwe SQL-migratie, geen nieuwe API-route, geen nieuw veld op `po_saved_views`.

**Non-goals:**
- Geen nieuw filter-operator-type ("AND-groep") in `filterByColumn` zelf — de AND-samenstelling bestaat al via extra tabs; dit voegt alleen een snellere manier toe om zo'n tab op te zetten.
- Geen waarde-picker (`oneOf`, autocomplete) en geen kleurfilter (`colorIs`) als rij-type in de composer. Wie dat nodig heeft, opent na het aanmaken van de tab gewoon het kolommenu van die kolom terwijl de tab actief is — dat blijft een normale tab, dus dat werkt al.
- Geen `remarks`-kolommen (vrije tekstzoekopdracht) als kolomkeuze in de composer-rijen.
- Geen rename van een bestaande exception-tab vanuit de composer — geen enkele extra tab is vandaag hernoembaar (alleen verwijderen + groepskleur bestaan in `PurchaseOrderViewTabContextMenu.jsx`); dat blijft een bestaande beperking, niet iets wat deze feature oplost.
- Geen ingang vanuit een los kolommenu (bijv. "voeg deze kolom toe aan een exception filter") — v1 heeft precies één ingang: het Tabs-menu. Dat kan een latere, kleine uitbreiding zijn.
- Geen nieuw visueel "ster-chip"-type naast de bestaande tab-chip — de gemaakte tab rendert exact zoals elke andere extra tab in `PurchaseOrderViewTabBar`/`PurchaseOrderViewTabCaption`. Dat IS de gevraagde quick-filter-chip; een tweede visuele taal ernaast zou verwarren.
- Geen wijziging aan `filterByColumn`-semantiek, `resolveFilterModel`, `hasActiveFilter` of de BI-aggregatie-pariteit (`server/utils/biAggregate.js`) — de composer produceert uitsluitend gewone per-kolom `{operator, value, secondaryValue}`-entries, identiek aan wat het kolommenu al opslaat.
- Geen andere borden dan het PO-board.
- Excel-export ongewijzigd (die volgt gewoon `boardView.processedItems`, ongeacht welke tab actief is).

**Constraints:**
- UI Engels (`.cursor/rules/app-taal.mdc`): dialoogtitel, veldlabels, knoptekst, foutmeldingen.
- Alleen staff (admin/employee) ziet de ingang — zelfde `isStaff`-gate als de bestaande `openNewTab`/`openCreateTabs` in `ViewTabsDialogsProvider.jsx` (`enabled = Boolean(activeViewId && isStaff && viewTabs)`). Geen nieuwe rol nodig, geen nieuwe route dus geen nieuwe `requireSession`/`requireRole`.
- Componenten ≤ 300 regels; Fluent v9 tokens, geen hardcoded kleuren.
- Geen `<Tooltip>` in de rijenlijst van de composer (`.cursor/rules/fluentui-valkuilen.mdc` — portal-witvlak-risico bij herhaalde items); hints via gewone tekst of `Field`-hint.
- Geen nieuwe `apiRequest`: de composer wijzigt alleen client-state via één bestaande, backward-compatible uitgebreide hook-methode (`viewTabs.addBlankTab(name, extraFilters)` — nieuw optioneel 2e argument, zie TD/Review); persisteren gebeurt pas via de bestaande Save/Update-actie, zoals voor elke andere tab.
- Twee bestanden zitten al dicht bij of over de 300-regel-grens en mogen door deze feature **niet** verder groeien dan strikt nodig: `src/utils/viewTabs.js` (342, al over de grens) en `src/hooks/usePurchaseOrderTableView.js` (350, al over de grens) blijven **ongewijzigd** — deze feature raakt ze niet. `src/components/supplier/PurchaseOrdersPage.jsx` staat op 290/300: de enige toegestane wijziging daar is het bundelen van de bestaande `viewTabs`/`columns`/`isStaff`/`activeViewId`-props plus de nieuwe `datePeriodDisplayModes` tot één `viewTabsProps`-object in de bestaande `<PurchaseOrdersPageLayout>`-aanroep (netto ~3 regels; zie TD "Props-telling" voor de onderbouwing); als er in dezelfde wijziging nog iets anders in dat bestand moet, eerst splitsen. **Vastgelegde vervolgtrigger** (i.p.v. een contingency "als het ooit moet"): de eerstvolgende wijziging aan dit bestand die niets met View Tabs te maken heeft, begint met het verplaatsen van wiring naar `PurchaseOrdersPageLayout.jsx` of het bundelen van meer flat props — vóórdat er nieuwe regels bijkomen.
- OTAP local-first: ontwikkelen en testen op `localhost` (`npm run dev:all`), geen push zonder expliciet verzoek.

## FRD

**Gekozen approach:** A — een nieuwe, kleine dialoog **"Exception filter…"** naast de bestaande `+ New tab` / `Tabs from column…` in `PurchaseOrderViewTabMenuSection.jsx`. De dialoog vraagt een naam plus 2-4 rijen (kolom, operator, waarde) en bouwt daaruit bij **Create** zelf één `extraFilters`-record (`{ [columnKey]: toColumnFilterPatch(row) }` per rij — pure object-opbouw, geen React), dat in één keer meegaat naar `viewTabs.addBlankTab(name, extraFilters)`. Dat is dezelfde bouwsteen die vandaag ook een handmatig aangemaakte tab oplevert (maakt de tab, activeert hem, kopieert de huidige view-basisfilters, past de merge toe op het bord), uitgebreid met één optioneel, backward-compatible 2e argument — bestaande aanroepen `addBlankTab(name)` (via `+ New tab`) blijven ongewijzigd werken, `extraFilters` defaultet naar `{}`.

**Herziening t.o.v. de eerste versie van dit ontwerp (opgelost naar aanleiding van Fase-4-review):** die versie liet de composer `boardView.applyColumnFilter(columnKey, patch)` per rij aanroepen ná `addBlankTab(name)`, in de veronderstelling dat het bestaande achtergrondmechanisme `useViewTabExtraFilterPrompt` die opeenvolgende wijzigingen automatisch zou opvangen en naar `extraFilters` van de nieuwe tab zou schrijven. Code-inspectie (React Architect en Refactor Specialist, onafhankelijk van elkaar) wees uit dat dit niet klopt: `addBlankTab` zet zelf al een skip-vlag (`skipFilterPrompt()`) vlak vóórdat het de basisfilters toepast, en omdat React 18 de N synchrone `applyColumnFilter`-calls uit dezelfde event-handler batcht tot één her-render, ziet `useViewTabExtraFilterPrompt`'s effect maar één (te late) cyclus — het neemt dan de skip-tak en slaat de capture-write over. Netto bleef `extraTabs`-state voor de net aangemaakte tab op `extraFilters: {}` staan totdat de gebruiker iets deed dat expliciet `snapshotCurrentTab()` aanriep (tab wisselen, Save/Update); de hover-samenvatting toonde dus direct na **Create** geen condities, in tegenspraak met de eigen 'Aantoonbaar'-regel.

**Fix:** de composer roept `boardView.applyColumnFilter` niet meer aan en leunt dus niet meer op `useViewTabExtraFilterPrompt` om de `extraFilters` van de nieuwe tab te vullen. `addBlankTab(name, extraFilters)` zet de tab-`extraFilters` synchroon, in dezelfde `setExtraTabs`-call die de tab aanmaakt — identiek aan hoe `addTabsFromColumn` dat vandaag al doet voor bulk-tabs (die functie omzeilt de reactieve capture om precies dezelfde reden en leunt er nooit op). Deze aanpak is dus per constructie onafhankelijk van effect-timing/batching, in plaats van er alsnog impliciet van af te hangen. `useViewTabExtraFilterPrompt` zelf verandert niet en blijft nodig voor zijn bestaande taak: kolommenu-wijzigingen vastleggen terwijl een tab al actief is. Zie de concrete implementatie in de TD ("Wiring") en de Review-sectie onderaan voor de volledige onderbouwing.

**Afgewezen:**
- **B — een nieuw "AND-groep"-filtertype** rechtstreeks in `filterByColumn` (zoals het oorspronkelijke idee voorstelde: één filter-entry die zelf een lijst van kolom+operator+waarde-triples bevat). Verworpen omdat dit een tweede, parallelle manier zou zijn om exact hetzelfde te doen als een extra tab al doet (persistent, met één klik toepasbaar, herbruikbaar), maar met een veel grotere blast radius: `resolveFilterModel`/`hasActiveFilter`/`columnValueMatchesFilter` in `src/utils/tableViewFilterUtils.js` (288 regels, expliciet gedocumenteerd als 1-op-1 met de BI-aggregatie in `server/utils/biAggregate.js` — "de semantiek is bewust identiek aan de server-side aggregatie") zouden een nieuw operator-type moeten leren, mét een matching wijziging aan de server-normalisatie in `normalizeViewState` (`server/routes/supplier.js`) én aan de BI-pariteit, voor per saldo nul nieuwe gebruikersfunctionaliteit boven wat View Tabs al bieden.
- **C — de samengestelde rijen embedden in het bestaande kolommenu** (`PurchaseOrderColumnFilterMenuFilterSection.jsx`), zoals het idee's "vermoedelijke implementatie" suggereerde. Verworpen: het kolommenu (`PurchaseOrderColumnFilterMenuMainPane.jsx`) is inherent aan **één** `column`-prop gebonden — er is geen natuurlijke plek in de popover van kolom A om ineens 3 *andere* kolommen te kiezen. Bovendien staat `PurchaseOrderColumnFilterMenu.jsx` zelf al op 294/300 regels (zoals ook vastgelegd in `docs/specs/2026-08-27-po-board-column-sum-design.md` als groei-blocker) — geen ruimte om dit erbij te bouwen zonder eerst te moeten splitsen, voor een feature die conceptueel niets met "de filter van deze ene kolom" te maken heeft.

**Happy path**
1. Staff opent een actieve saved view en klikt de view-titel → Tabs-menu.
2. Klikt **Exception filter…** (naast **Tab** en **Tabs from column…**).
3. Dialoog opent met een **Name**-veld (leeg) en 2 lege rijen; elke rij heeft een kolom-`Select`, een operator-`Dropdown` (afhankelijk van het kolomtype) en een waarde-`Input` (of twee bij `between`).
4. Staff vult naam + rij 1 (bijv. Delivery date / is before / vandaag) + rij 2 (bijv. Confirmed / is exactly / No) in. Optioneel **+ Add condition** voor een 3e/4e rij.
5. **Create** wordt actief zodra naam + minstens 2 geldige, uniek-per-kolom rijen ingevuld zijn.
6. Klik op **Create**: dialoog sluit, een nieuwe tab verschijnt in de tabbalk, is meteen actief, en het bord toont alleen de rijen die aan alle ingevulde condities voldoen.
7. Later: naar **All** of een andere tab wisselen en terugklikken op de exception-tab herstelt dezelfde AND-filter in één klik — identiek aan elke andere extra tab.
8. **Save as new view** of **Update current view** persisteert de tab zoals elke andere (`view_state_json.tabs.extraTabs`); **Reset view** verwijdert hem.

**Rollen:** alleen staff (admin/employee) kan **Exception filter…** openen — zelfde `isStaff`-gate als de bestaande Tab-acties. Suppliers zien de ingang niet (geen entry in het Tabs-menu, dat voor hen sowieso niet bestaat), maar zien en gebruiken wél een door staff aangemaakte exception-tab wanneer die op een **vendor**-scoped saved view staat die voor hen zichtbaar is gemaakt — exact hetzelfde gedrag als voor elke andere extra tab vandaag ("Vendors see tabs when the vendor view is configured that way", `docs/specs/2026-08-26-po-view-tabs-design.md`). Geen nieuwe API, dus geen nieuwe `requireRole`.

**Expliciet geaccepteerde beperking (bestaand, niet nieuw door deze feature):** `isStaff` is uitsluitend een UI-gate voor de **ingang**. De onderliggende save-route waarmee een tab uiteindelijk persisteert (`/api/supplier`, `requireAnyRole([SUPPLIER, EMPLOYEE, 'user'])`) maakt server-side geen onderscheid tussen een tab die via de composer is opgebouwd en een handmatig samengesteld `extraFilters`-payload van een supplier-account naar diezelfde route — een supplier kan dus, buiten de UI om, vandaag al zo'n meervoudige AND-tab persisteren. Dit is geërfd gedrag van View Tabs (ongewijzigd, geen regressie), hier expliciet vastgelegd als bewuste, geaccepteerde beperking in plaats van een impliciete aanname.

**Leeg:** dialoog start met 2 lege rijen (geen kolom gekozen); **Create** blijft uitgeschakeld tot ze geldig zijn. Geen leeg-state nodig voor het resultaat — een succesvolle Create levert per definitie een tab met ≥2 filters op.

**Fout:**
- Twee rijen kiezen dezelfde kolom → **Create** blijft uitgeschakeld; een korte hint onder de rijen ("Each condition needs its own column.") legt uit waarom, geen `<Tooltip>`.
- Een `between`-rij met maar één kant ingevuld (from/to, of alleen start/eind-datum) → die rij telt niet mee als geldig (zelfde regel als `hasActiveFilter` voor `between`), dus **Create** blijft uit tot hij compleet is of verwijderd wordt.
- Naam leeg → **Create** uit (zelfde patroon als `PurchaseOrderNewTabDialog.jsx`).
- Geen netwerkcall in dit deel van de flow, dus geen timeout/403-pad; fouten bij de uiteindelijke Save-actie lopen via de bestaande foutafhandeling van saved views (ongewijzigd).

**Overlap:** de composer maakt altijd een **nieuwe** tab aan, nooit een bestaande. Staat er al een andere extra tab actief op het moment dat **Exception filter…** geopend wordt, dan snapshot `addBlankTab` die eerst (`snapshotCurrentTab()`), zodat er niets verloren gaat — identiek aan het gedrag van de bestaande `+ New tab`. Twee tabs/gebruikers hebben elk hun eigen tab-set binnen hun eigen saved view; geen gedeelde server-job, geen race tussen sessies.

**UI:**
- Entry point: `MenuItem` **Exception filter…** met `FilterRegular`-icoon (al gebruikt in dit codebase, o.a. `PurchaseOrderCellContextMenu.jsx`), in dezelfde `MenuGroup` "Tabs" als **Tab** en **Tabs from column…** in `PurchaseOrderViewTabMenuSection.jsx`.
- Dialoog-layout: `Dialog`/`DialogSurface`/`DialogBody` zoals `PurchaseOrderNewTabDialog.jsx` en `PurchaseOrderCreateTabsDialog.jsx` (`maxWidth` op de form-`div`, `shorthands.gap`).
- Per rij: kolom-`Select` (native Fluent `Select`, zoals `PurchaseOrderCreateTabsDialog.jsx` al gebruikt voor kolomkeuze) + operator-`Dropdown`/`Option` (zoals `PurchaseOrdersActiveFilterEditor.jsx`) + waarde-`Input` (type `text`/`number`/`date` afhankelijk van kolomtype en operator, zelfde patroon als `PurchaseOrderColumnFilterMenuFilterSection.jsx`).
- **+ Add condition** als tekst-knop onder de rijen, zelfde stijl als **+ Add rule** in `PurchaseOrderColumnFormatRulesSection.jsx`; verschijnt niet meer bij 4 rijen. Een rij verwijderen (✕) kan alleen voor rij 3/4 — de eerste 2 rijen zijn niet verwijderbaar (minimum blijft 2).
- Geen `<Tooltip>` in de rijenlijst; validatiehints als gewone tekst onder de rijen.
- Labels/placeholders/hints/knoptekst Engels: **Exception filter…**, **Name**, **Column**, **Operator**, **Value**, **+ Add condition**, **Create**, **Cancel**.
- Het resultaat leunt op bestaande visuals: de nieuwe tab krijgt geen eigen sterretje of afwijkende kleur — hij ziet eruit als elke andere `Tab` in `PurchaseOrderViewTabBar.jsx`/`PurchaseOrderViewTabCaption.jsx`, en de hover-samenvatting (kolom: operator waarde per rij) komt gratis mee via de bestaande `PurchaseOrderViewTabHoverCard.jsx` (`describeTabExtraFilters`/`tabHoverFilterRows` in `src/utils/viewTabs.js`).

**Zichtbaarheid:** een exception-tab leeft, net als elke extra tab, binnen **één** saved view (`view_state_json.tabs.extraTabs`) — niet automatisch gedeeld tussen views of gebruikers, tenzij die saved view zelf `global`/`vendor`-scope heeft (bestaand deel-mechanisme, ongewijzigd). Geen extra velden, geen scope-uitbreiding.

**Hergebruik:** `viewTabs.addBlankTab(name, extraFilters)` (bestaande methode, uitgebreid met een backward-compatible 2e argument — zie TD), `resolveFilterModel`/`hasActiveFilter`/`TEXT_FILTER_OPERATORS`/`NUMBER_FILTER_OPERATORS`/`DATE_FILTER_OPERATORS` (`src/utils/tableViewFilterUtils.js`), `getDraftFromFilter`/`isDateColumn`/`isNumberColumn` (`src/components/supplier/purchaseOrderColumnFilterMenuConstants.js`), `getOperatorLabels` (`PurchaseOrdersActiveFilterEditor.jsx`, geëxporteerd i.p.v. een derde lokale kopie van dezelfde operator-mapping — zie TD), de dialoog- en rij-UI-patronen van `PurchaseOrderCreateTabsDialog.jsx`, `PurchaseOrdersActiveFilterEditor.jsx` en `PurchaseOrderColumnFormatRulesSection.jsx`, en de volledige persist/reset/save-plumbing van View Tabs (`normalizeTabsState` client én server, `usePurchaseOrderSavedViewState.js`). `boardView.applyColumnFilter` en het achtergrondmechanisme `useViewTabExtraFilterPrompt` worden door de composer niet meer aangeroepen (zie "Gekozen approach" hierboven en Review); beide blijven ongewijzigd voor hun bestaande taken elders.

## TD

### Hergebruik (concrete paden)

| Wat | Pad | Wijzigt? |
|-----|-----|----------|
| Tab aanmaken + activeren, nu met optionele `extraFilters` | `src/hooks/usePurchaseOrderViewTabs.js` → `addBlankTab(name, extraFilters = {})` | **Ja** — backward-compatible 2e argument, 3 regels gewijzigd (zie "Wiring" en Review — lost de auto-capture-race op) |
| Eén kolomfilter zetten (kolommenu) | `src/hooks/usePurchaseOrderTableView.js` → `applyColumnFilter(columnKey, {operator, value, secondaryValue})`, geëxposed als `boardView.applyColumnFilter` | Nee — ongewijzigd; de composer roept dit **niet meer** aan (zie Review), blijft in gebruik door het kolommenu |
| Live filters → tab-`extraFilters` capture (kolommenu terwijl een tab actief is) | `src/hooks/useViewTabExtraFilterPrompt.js` | Nee — ongewijzigd; de composer leunt hier niet meer op (zie Review), blijft nodig voor zijn bestaande taak |
| Filter-model, operator-labels, geldigheid | `src/utils/tableViewFilterUtils.js` (`resolveFilterModel`, `hasActiveFilter`, `TEXT_/NUMBER_/DATE_FILTER_OPERATORS`) | Nee |
| Operator-labels per kolomtype | `src/components/supplier/PurchaseOrdersActiveFilterEditor.jsx` → `getOperatorLabels(isDate, isNumber, isRemarks)` | **Ja** — geëxporteerd i.p.v. lokaal, zodat de composer 'm hergebruikt i.p.v. een derde kopie (zie Review) |
| Draft-helpers per kolomtype | `src/components/supplier/purchaseOrderColumnFilterMenuConstants.js` (`getDraftFromFilter`, `isDateColumn`, `isNumberColumn`) | Nee |
| Tab-dialogs hosten | `src/components/supplier/viewTabs/ViewTabsDialogsProvider.jsx` (77 regels) | **Ja** — 1 nieuwe dialoog + 1 nieuwe action + 1 nieuwe prop (`datePeriodDisplayModes`; `applyColumnFilter` is niet meer nodig — zie Review) |
| Tabs-menu (ingang) | `src/components/supplier/viewTabs/PurchaseOrderViewTabMenuSection.jsx` (57 regels) | **Ja** — 1 `MenuItem` |
| Prop-bundeling naar provider | `src/components/supplier/PurchaseOrdersPage.jsx` (290 regels) → `src/components/supplier/PurchaseOrdersPageLayout.jsx` (66 regels) | **Ja** — bestaande `viewTabs`/`columns`/`isStaff`/`activeViewId` + nieuwe `datePeriodDisplayModes` gebundeld in één `viewTabsProps`-object i.p.v. 5 losse props (zie "Props-telling" in Review) |
| Hover-samenvatting van tab-filters | `src/components/supplier/viewTabs/PurchaseOrderViewTabHoverCard.jsx`, `describeTabExtraFilters`/`tabHoverFilterRows` in `src/utils/viewTabs.js` | Nee — werkt al voor elke `extraFilters`-set |
| Tab verwijderen / groepskleur | `src/components/supplier/viewTabs/PurchaseOrderViewTabContextMenu.jsx` | Nee |
| Persist / normalisatie (client) | `src/utils/viewTabs.js` → `normalizeTabsState`, `normalizeExtraFilters` (342 regels, al over budget) | Nee |
| Persist / normalisatie (server) | `server/utils/viewTabs.js` → `normalizeTabsState` (parallelle CommonJS-kopie); `server/routes/supplier.js` → `normalizeViewState` | Nee |
| Save/Update/Reset view | `src/hooks/usePurchaseOrderSavedViewState.js` (`handleSaveAsNew`, `handleUpdateActive`, `handleResetView` → `viewTabs.resetTabs()`) | Nee |
| "+ Add rij"-visueel precedent | `src/components/supplier/PurchaseOrderColumnFormatRulesSection.jsx` (244 regels, "+ Add rule") | Nee — alleen patroon |
| Compacte rij-editor-precedent | `src/components/supplier/PurchaseOrdersActiveFilterEditor.jsx` | Nee — alleen patroon (logica: zie `getOperatorLabels`-rij hierboven) |
| Versie | `src/config/version.js` (PATCH bij implementatie) | **Ja** |

Geen wijziging in `scripts/db/migrations/` (geen nieuwe kolom/tabel), geen wijziging in `server/routes/supplier.js` buiten wat er al staat, geen wijziging in `src/utils/tableViewFilterUtils.js` of `src/hooks/usePurchaseOrderTableView.js`. De enige wijziging in een verder "ongewijzigd"-bestand is de 3-regelige, backward-compatible uitbreiding van `addBlankTab` in `src/hooks/usePurchaseOrderViewTabs.js` (281 → ~282 regels, ruim onder het plafond) en het exporteren van `getOperatorLabels` in `PurchaseOrdersActiveFilterEditor.jsx` (geen gedragswijziging, alleen zichtbaarheid).

**Openstaand risico, niet opgelost door deze feature (bewust):** `src/utils/viewTabs.js` (342 regels) en `src/hooks/usePurchaseOrderTableView.js` (350 regels) blijven ongewijzigd, en dat is voor déze feature de juiste discipline — geen blocker. Maar de nieuwe exception-filters lopen wél functioneel door `normalizeExtraFilters`/`normalizeTabsState` in dat 342-regelige bestand (via `addBlankTab` → `applyMergedFilters` → `mergeFilters`), dus de afhankelijkheid van dat bestand groeit terwijl er geen opruimactie gepland staat. De eerstvolgende feature die `src/utils/viewTabs.js` wél moet aanraken, start met een kant-en-klare BLOCKER (300-regel-plafond) voordat er één regel bijkomt — dat is hier expliciet vastgelegd als bekend, geaccepteerd vervolgrisico, niet als verrassing voor die latere feature.

### Nieuwe pure module: rij- en draft-validatie

`src/utils/exceptionFilterRows.js` (nieuw, pure, geen React) + `exceptionFilterRows.test.js`:

```js
export const MIN_EXCEPTION_ROWS = 2;
export const MAX_EXCEPTION_ROWS = 4;

export function createEmptyExceptionRow() {
  return { columnKey: '', operator: '', value: '', secondaryValue: '' };
}

// Hergebruikt getOperatorLabels (geëxporteerd uit PurchaseOrdersActiveFilterEditor.jsx)
// i.p.v. een derde lokale kopie van dezelfde operator-mapping; filtert 'oneOf' eruit
// (geen value-picker in v1).
export function composerOperatorEntries(column, datePeriodDisplayModes = {}) { /* ... */ }

// Hergebruikt hasActiveFilter — geen tweede geldigheidsregel naast het kolommenu.
export function isExceptionRowValid(column, row, datePeriodDisplayModes = {}) { /* ... */ }

export function exceptionDraftHasDuplicateColumns(rows) { /* ... */ }

export function isExceptionTabDraftValid({ name, rows }, columnByKey, datePeriodDisplayModes = {}) { /* ... */ }

// { operator, value, secondaryValue } — wordt de extraFilters[columnKey]-waarde direct
// (zelfde vorm die resolveFilterModel elders al normaliseert bij het lezen; geen tussenstap
// via applyColumnFilter nodig — zie "Wiring" en Review).
export function toColumnFilterPatch(row) { /* ... */ }
```

Dit is de enige nieuwe logica in deze feature; alles eromheen is UI-bedrading van bestaande hooks. Co-located test dekt: lege draft ongeldig, 1 geldige rij ongeldig (< `MIN_EXCEPTION_ROWS`), 2 geldige rijen geldig, dubbele kolom ongeldig, onvolledige `between`-rij ongeldig, 5e rij nooit aangemaakt (`MAX_EXCEPTION_ROWS`).

### Composer-dialoog en rij-component (grootte / props)

- **Nieuw** `src/components/supplier/viewTabs/PurchaseOrderExceptionFilterRow.jsx` (~100-130 regels), **`React.memo`**: één rij — kolom-`Select`, operator-`Dropdown`, waarde-`Input`(s), verwijder-knop (alleen rij-index ≥ `MIN_EXCEPTION_ROWS`). Props (≤ 10): `row`, `index`, `columns`, `usedColumnKeys`, `datePeriodDisplayModes`, `canRemove`, `onChange`, `onRemove`. Geen `<Tooltip>`.
  **Stabiel callback-patroon (vastgelegd, geen gat):** `onChange`/`onRemove` zijn in de dialoog **één** keer gememoïseerde functies met signature `onChange(index, patch)` / `onRemove(index)`. Dezelfde functiereferentie gaat naar alle rijen (`<PurchaseOrderExceptionFilterRow onChange={handleRowChange} onRemove={handleRemoveRow} index={i} ... />` in de `.map()`) — **niet** `onChange={(patch) => handleRowChange(index, patch)}` inline, wat bij elke render een nieuwe prop-referentie zou geven en `React.memo` zinloos zou maken. De rij zelf roept `onChange(index, patch)` aan met zijn eigen `index`-prop. Dit voldoet aan checklist-item 5 (geen inline functions in JSX) en maakt `React.memo` op de rij daadwerkelijk effectief, ook bij max. 4 items.
- **Nieuw** `src/components/supplier/viewTabs/PurchaseOrderNewFilterTabDialog.jsx` (~150-190 regels): `Dialog` + `Name`-`Field` + lijst van `PurchaseOrderExceptionFilterRow` (`useState<row[]>`, start met 2 via `createEmptyExceptionRow`) + **+ Add condition** (verborgen bij `MAX_EXCEPTION_ROWS`) + `DialogActions` (Cancel / Create, Create `disabled` via `isExceptionTabDraftValid`). Props: `open`, `columns`, `datePeriodDisplayModes`, `onOpenChange`, `onSubmit(name, rows)` — `rows` bij submit al gefilterd tot de geldige, ingevulde rijen (geen halve rijen naar de caller).
- Co-located tests `PurchaseOrderExceptionFilterRow.test.jsx` en `PurchaseOrderNewFilterTabDialog.test.jsx`, zelfde renderstijl als `PurchaseOrderCreateTabsDialog.test.jsx` (42 regels).

### Wiring: van dialoog naar bestaande tab-plumbing

**`usePurchaseOrderViewTabs.js` (281 → ~282 regels) — minimale, backward-compatible uitbreiding van `addBlankTab`:**

```js
// Was: const addBlankTab = useCallback((name) => {
const addBlankTab = useCallback((name, extraFilters = {}) => {
  snapshotCurrentTab();
  const tab = {
    id: createTabId(),
    name: String(name || 'New tab').trim().slice(0, 120) || 'New tab',
    extraFilters: { ...extraFilters },   // was: extraFilters: {}
    groupColumnKey: '',
  };
  const next = [...extraTabsRef.current, tab];
  setExtraTabs(next);
  extraTabsRef.current = next;
  setActiveTabId(tab.id);
  activeTabIdRef.current = tab.id;
  applyMergedFilters(viewBaseRef.current, extraFilters);   // was: applyMergedFilters(viewBaseRef.current, {})
  return tab;
}, [applyMergedFilters, snapshotCurrentTab]);
```

Precies 3 regels wijzigen; de bestaande aanroep `addBlankTab(name)` (via `+ New tab`) blijft functioneel identiek, want `extraFilters` defaultet naar `{}`. Cruciaal: `setExtraTabs(next)` zet de tab — mét zijn `extraFilters` al gevuld — synchroon in dezelfde call die de tab aanmaakt. Er is geen tweede, reactieve stap meer nodig om de tab-state consistent te krijgen (zie Review voor waarom de vorige aanpak, leunend op `useViewTabExtraFilterPrompt`, dat wél nodig had en daardoor een race had). `applyMergedFilters` blijft ongewijzigd en roept zelf nog steeds `skipFilterPrompt()` aan vóór `boardView.applyFilterSortGrouping(...)` — dat blijft correct, want `useViewTabExtraFilterPrompt`'s effect ziet na deze ene call een `sig` die al gelijk is aan `tab.extraFilters` en no-opt via zijn bestaande `extraFiltersEqual`-guard (regel 40 in dat bestand), dus geen dubbele/overbodige snapshot.

Test toevoegen aan `usePurchaseOrderViewTabs.test.js`: `addBlankTab(name, extraFilters)` zet `extraTabs[].extraFilters` synchroon (geen `act()`-cyclus nodig om te "settlen"); bestaand gedrag van `addBlankTab(name)` zonder 2e argument blijft ongewijzigd (regressietest).

**`ViewTabsDialogsProvider.jsx` (77 → ~105 regels):**

```js
export default function ViewTabsDialogsProvider({
  viewTabs, columns = [], isStaff = false, activeViewId,
  datePeriodDisplayModes = {},     // nieuw
  children,
}) {
  const enabled = Boolean(activeViewId && isStaff && viewTabs);
  const [newFilterOpen, setNewFilterOpen] = useState(false);

  const openNewFilterTab = useCallback(() => {
    if (enabled) setNewFilterOpen(true);
  }, [enabled]);

  // Bouwt het extraFilters-record zelf (pure) en geeft het in één keer mee aan
  // addBlankTab — roept boardView.applyColumnFilter NIET aan, leunt dus niet op
  // useViewTabExtraFilterPrompt (zie FRD "Gekozen approach" en Review).
  const handleNewFilterTab = useCallback((name, rows) => {
    const extraFilters = {};
    rows.forEach((row) => {
      extraFilters[row.columnKey] = toColumnFilterPatch(row);
    });
    viewTabs?.addBlankTab?.(name, extraFilters);
  }, [viewTabs]);

  // ...bestaande openNewTab/openCreateTabs blijven ongewijzigd...

  const value = useMemo(() => ({
    canCreateFromColumn: enabled,
    openNewTab, openCreateTabs, openNewFilterTab,
  }), [enabled, openCreateTabs, openNewTab, openNewFilterTab]);

  return (
    <ViewTabsActionsContext.Provider value={value}>
      {children}
      <PurchaseOrderNewTabDialog /* ...ongewijzigd... */ />
      <PurchaseOrderCreateTabsDialog /* ...ongewijzigd... */ />
      <PurchaseOrderNewFilterTabDialog
        open={newFilterOpen}
        columns={columns}
        datePeriodDisplayModes={datePeriodDisplayModes}
        onOpenChange={setNewFilterOpen}
        onSubmit={handleNewFilterTab}
      />
    </ViewTabsActionsContext.Provider>
  );
}
```

`ViewTabsActionsContext`'s default-object en `useViewTabsActions()`-consumers krijgen `openNewFilterTab: () => {}` erbij.

`PurchaseOrderViewTabMenuSection.jsx` (57 → ~65 regels):

```jsx
const { openNewTab, openCreateTabs, openNewFilterTab } = useViewTabsActions();
// ...
<MenuItem icon={<TabAddRegular />} onClick={openNewTab}>Tab</MenuItem>
<MenuItem icon={<FilterRegular />} onClick={openNewFilterTab}>Exception filter…</MenuItem>
<MenuItem icon={<TabAddRegular />} onClick={handleOpenCreateTabs}>Tabs from column…</MenuItem>
```

**Props-telling (Dev Lead-eis, vóór implementatie geteld):** `PurchaseOrdersPageLayout.jsx` heeft vóór deze feature al **15** props (`viewTabs, columns, isStaff, activeViewId, savedViewsState, headerState, activityState, bulkState, hiddenRowsState, refreshState, onExportExcel, error, contentStatus, tableContext, dialogs`) — ruim boven de 10-props-richtlijn, niet veroorzaakt door deze feature. Zonder ingreep zou er een 16e (`datePeriodDisplayModes`) bijkomen. In plaats daarvan bundelt deze TD de 4 bestaande flat props die uitsluitend voor `ViewTabsDialogsProvider` dienen (`viewTabs`, `columns`, `isStaff`, `activeViewId`) samen met de nieuwe `datePeriodDisplayModes` tot **één** `viewTabsProps`-object — hetzelfde patroon dat dit bestand al 7× toepast (`savedViewsState`, `headerState`, ...). `columns` wordt ook gebruikt door `PurchaseOrdersPageTopBar` binnen dit bestand; dat leest voortaan `viewTabsProps.columns` in plaats van een aparte prop. Netto: `PurchaseOrdersPageLayout.jsx` gaat van **15 naar 12** props — nog boven de 10-richtlijn (de overige 7 bundels verder comprimeren is een bredere refactor buiten deze feature), maar een concrete verbetering t.o.v. zowel de huidige staat als de eerder voorgestelde +1-losse-prop-aanpak.

`PurchaseOrdersPageLayout.jsx` (66 → ~62 regels, **krimpt** ondanks de feature-toevoeging — de bundeling elimineert meer regels dan ze toevoegt):

```jsx
export default function PurchaseOrdersPageLayout({
  viewTabsProps,   // { viewTabs, columns, isStaff, activeViewId, datePeriodDisplayModes }
  savedViewsState,
  headerState,
  activityState,
  bulkState,
  hiddenRowsState,
  refreshState,
  onExportExcel,
  error,
  contentStatus,
  tableContext,
  dialogs,
}) {
  const styles = useStyles();
  return (
    <ViewTabsDialogsProvider {...viewTabsProps}>
      <div className={styles.page}>
        <PurchaseOrdersPageTopBar
          savedViewsState={savedViewsState}
          headerState={headerState}
          activityState={activityState}
          bulkState={bulkState}
          hiddenRowsState={hiddenRowsState}
          refreshState={refreshState}
          onExportExcel={onExportExcel}
          error={error}
          columns={viewTabsProps.columns}
        />
        <PurchaseOrdersPageContent status={contentStatus} tableContext={tableContext} />
        <PurchaseOrdersPageDialogs
          formula={dialogs.formula}
          datePeriod={dialogs.datePeriod}
          bulkEdit={dialogs.bulkEdit}
        />
      </div>
    </ViewTabsDialogsProvider>
  );
}
```

`PurchaseOrdersPage.jsx` (290 → ~293 regels, onder het 300-plafond): de `<PurchaseOrdersPageLayout>`-aanroep verliest zijn 4 losse `viewTabs`/`columns`/`isStaff`/`activeViewId`-props en krijgt in plaats daarvan één `viewTabsProps`-object met die 4 plus de nieuwe `datePeriodDisplayModes`:

```jsx
<PurchaseOrdersPageLayout
  viewTabsProps={{
    viewTabs,
    columns: visibleHeaderColumns,
    isStaff,
    activeViewId,
    datePeriodDisplayModes,
  }}
  /* ...rest ongewijzigd... */
/>
```

`datePeriodDisplayModes` bestaat al in de scope van dit bestand (regels 56/70/94 e.a.) — geen nieuwe hook, geen nieuwe state. `boardView.applyColumnFilter` is niet meer nodig (zie "Wiring" hierboven), dus `boardView` hoeft voor deze feature niet extra doorgegeven te worden.

### Auth en validatie

- Geen nieuwe route: `/api/supplier` (incl. saved-views) staat al achter `requireSession, requireAnyRole([SUPPLIER, EMPLOYEE, 'user'])` op router-niveau (`server/server.js:180`). De composer schrijft niets naar de server totdat de gebruiker de bestaande Save/Update-actie gebruikt — dat pad is ongewijzigd.
- Client-gate: **Exception filter…** is alleen zichtbaar/bruikbaar wanneer `enabled` (`activeViewId && isStaff && viewTabs`) — identiek aan `openNewTab`/`openCreateTabs`.
- Server-validatie van het resultaat verandert niet: een composer-rij wordt direct een gewone `extraFilters[columnKey]`-entry (via `viewTabs.addBlankTab(name, extraFilters)`, geen tussenstap meer via `applyColumnFilter` — zie "Wiring"), en die loopt door de **bestaande** `normalizeTabsState`/`normalizeExtraFilters` (client én server, `cloneFilter`: operator max 32 tekens, value/secondaryValue als string, kolom-key max 64 tekens, max 80 filters per tab, max 200 tabs) — geen nieuwe validatie-oppervlak nodig.
- Client-side hergebruikt uitsluitend `resolveFilterModel`/`hasActiveFilter` voor geldigheid — geen tweede, losstaande parser die uit de pas kan lopen met hoe `columnValueMatchesFilter` de tab later interpreteert.
- **Composer-kolommen volgen altijd de actief bewerkte (eventueel vendor-scoped) view — geverifieerd, geen aanname.** De composer krijgt exact `visibleHeaderColumns` als `columns`-prop (via `viewTabsProps.columns`, zie "Wiring") — dezelfde lijst die het bord zelf rendert voor de view die op dat moment open staat. Er is geen apart, breder kolomoverzicht in de composer, dus een staff-gebruiker kan er nooit een kolom in kiezen die niet al zichtbaar is op de (mogelijk vendor-scoped) view die hij bewerkt. Geen extra kolom-gevoeligheidscheck nodig.
- **Server-validatie is lengte-/vorm-gebaseerd, niet allow-list-gebaseerd — geverifieerd bestaand, ongewijzigd gedrag** (`server/utils/viewTabs.js` gelezen: `cloneFilter`/`normalizeExtraFilters` clampen op type en lengte — operator ≤32 tekens, kolom-key ≤64 tekens, value/secondaryValue als string ≤200 tekens — maar toetsen `columnKey`/`operator` niet tegen een lijst van bestaande kolommen/operators). Een onbekende of gespoofte `columnKey`/`operator` wordt dus geclampt en stilzwijgend **opgeslagen**, niet geweigerd — exact hetzelfde bestaande gedrag als een handmatig via het kolommenu opgebouwde tab vandaag al heeft. De composer verlaagt de drempel om dit soort records te produceren (tot 4 per Create, in serie tot 80×200), maar introduceert geen nieuw gat. Een allow-list zou een aparte, bredere View-Tabs-hardening zijn — buiten de scope van dit ontwerp; hier expliciet vastgelegd als geaccepteerde, bestaande beperking i.p.v. impliciete aanname.
- **Autorisatie is volledig client-side UI-gating, expliciet geaccepteerd** (zie FRD "Rollen"): `isStaff` bepaalt alleen zichtbaarheid van de composer-ingang; er is geen nieuwe server-side rolcheck, want er is geen nieuwe route. Een niet-staff account met schrijftoegang tot een eigen saved view kan in theorie dezelfde `extraFilters`-structuur produceren zonder de composer-UI te zien — consistent met het bestaande patroon van `openNewTab`/`openCreateTabs`, geen regressie. "Geen nieuwe API" betekent hier dus expliciet "geen nieuw autorisatie-oppervlak", niet "geen autorisatierisico" — dat onderscheid is met deze paragraaf nu benoemd, niet impliciet gesuggereerd.

### Perf

- Geen nieuwe `apiRequest` in deze flow; de eerste netwerkcall komt pas bij de bestaande Save-actie.
- `handleNewFilterTab` bouwt het `extraFilters`-record met **één** synchrone `rows.forEach` (pure object-opbouw, geen `setState` per rij, ≤4 iteraties) en roept daarna **één** keer `viewTabs.addBlankTab(name, extraFilters)` aan. Dat is nog steeds **één** `setExtraTabs` + **één** `applyFilterSortGrouping`-call — dus nog steeds één her-render — maar nu zonder de eerdere (foute) afhankelijkheid van een tweede, reactieve effect-cyclus om de tab-state consistent te krijgen (zie Review). Geen zichtbare tussentijdse flikker, en — belangrijker dan in de vorige versie van dit ontwerp — geen inconsistente tussentoestand ná de render.
- Rij-geldigheid (`isExceptionRowValid`) is O(1) per rij, ≤4 rijen — geen `useMemo` nodig, wel prettig voor leesbaarheid.
- Geen scan over `items`/`rows` in de composer zelf: kolomlijst komt uit de al aanwezige `visibleHeaderColumns`-prop, geen `uniqueColumnValues`/`getUniqueColumnValues`-aanroep (die hoort bij de afgewezen value-picker, niet bij v1).

### Volgorde (implementatie later, geen TBD)

1. `src/utils/exceptionFilterRows.js` + `.test.js` — pure rij-/draft-helpers. `getOperatorLabels` exporteren uit `PurchaseOrdersActiveFilterEditor.jsx` (geen gedragswijziging) en importeren voor `composerOperatorEntries`.
2. `usePurchaseOrderViewTabs.js` — `addBlankTab(name, extraFilters = {})`: 3-regelige, backward-compatible uitbreiding + test (zie "Wiring"). Dit lost de auto-capture-race uit de Review-sectie op vóórdat er UI op gebouwd wordt.
3. `PurchaseOrderExceptionFilterRow.jsx` + test — kolom/operator/waarde-rij, `React.memo`, stabiel `onChange(index, patch)`/`onRemove(index)`-patroon (zie "Composer-dialoog en rij-component"), geen `<Tooltip>`.
4. `PurchaseOrderNewFilterTabDialog.jsx` + test — naam + rijenlijst + **+ Add condition** + Create/Cancel, gebouwd op stap 1 en 3.
5. `ViewTabsDialogsProvider.jsx` — nieuwe prop (`datePeriodDisplayModes`), `openNewFilterTab`-state/action, `handleNewFilterTab` (bouwt `extraFilters` en roept `addBlankTab(name, extraFilters)` aan — geen `applyColumnFilter`-loop), dialoog mounten.
6. `PurchaseOrderViewTabMenuSection.jsx` — **Exception filter…**-item + test.
7. `PurchaseOrdersPageLayout.jsx` / `PurchaseOrdersPage.jsx` — bestaande `viewTabs`/`columns`/`isStaff`/`activeViewId` + nieuwe `datePeriodDisplayModes` gebundeld in één `viewTabsProps`-object doorgeven i.p.v. 5 losse props (zie "Props-telling"; houdt `PurchaseOrdersPage.jsx` onder het 300-regel-plafond én verlaagt het propaantal van `PurchaseOrdersPageLayout.jsx` van 15 naar 12).
8. Tests: Create → tab actief + bord gefilterd **én** — direct ná Create, vóór enige tab-wissel — `viewTabs.extraTabs`/de hover-summary tonen meteen beide condities (expliciete regressietest voor de auto-capture-race uit Review; een test die eerst van tab wisselt zou de regressie maskeren, want dat pad triggert zelf een verse `snapshotCurrentTab()`); tab wisselen weg-en-terug herstelt dezelfde AND-filter; Save/Update persisteert `tabs.extraTabs`, inclusief een server-round-trip-test (POST/PATCH) van een 4-rijen composer-payload mét een expres onvolledige/dubbele `between`-rij, die bevestigt dat `normalizeTabsState`/`normalizeExtraFilters` het resultaat ongewijzigd (geclampt, niet geweigerd) accepteert; Reset view verwijdert de tab; dubbele-kolom-guard; onvolledige `between`-rij blokkeert Create; menu-item afwezig voor suppliers (`isStaff=false`).
9. PATCH in `src/config/version.js`.

### Aantoonbaar

- Op `http://localhost:5178` (PO TABEL, staff-account): Tabs-menu → **Exception filter…** → naam "Late & unconfirmed", rij 1 (Delivery date / is before / vandaag), rij 2 (Confirmed / is exactly / No) → **Create**.
- Nieuwe tab verschijnt actief in de tabbalk; het bord toont alleen orders die aan beide voorwaarden voldoen.
- **Direct na Create, vóór enige tab-wissel:** hoveren over de nieuwe tab toont meteen de samenvatting van beide condities via `PurchaseOrderViewTabHoverCard`. Dit is de expliciete regressiecheck voor de auto-capture-race die een eerdere versie van dit ontwerp had (zie Review) — niet pas ná een tab-wissel controleren, want dat pad herstelt zichzelf via een verse `snapshotCurrentTab()` en zou de regressie maskeren.
- Naar **All** wisselen en terug op de nieuwe tab klikken herstelt exact dezelfde AND-filter met één klik.
- **Save as new view** (of **Update current view**), pagina herladen, view opnieuw toepassen → tab en filters staan er nog.
- **Reset view** → de tab is verdwenen.
- Een tweede rij op dezelfde kolom kiezen → **Create** blijft uitgeschakeld met een zichtbare hint.
- Ingelogd als supplier op een vendor-scoped view met deze tab: de tab is zichtbaar en klikbaar; **Exception filter…** staat niet in een (voor hen niet-bestaand) Tabs-menu.
- Alle UI-teksten Engels.

## Review

Fase 4 (team, 5 personas): 🔴 van React Architect en Refactor Specialist — onafhankelijk van elkaar dezelfde root cause gevonden — verwerkt in deze TD/FRD (`addBlankTab(name, extraFilters)`, zie "Gekozen approach", "Wiring" en "Volgorde"). Geen enkele persona hield een 🔴 over. Overgebleven 🟡 zijn óf verwerkt als simpele, eenduidige verbetering, óf expliciet vastgelegd als bewuste beslissing/geaccepteerd risico — niets stilzwijgend blijven liggen.

| Persona | Was | Nu |
|---------|-----|-----|
| React Architect | 🔴 Capture-race tussen `addBlankTab`'s skip-vlag en de synchrone `applyColumnFilter`-loop: `useViewTabExtraFilterPrompt` slaat de capture-write over omdat React 18 de N calls batcht tot één her-render, dus `extraTabs`/hover-card blijven leeg direct na **Create**. 🟡 orchestratie-logica in component i.p.v. hook; 🟡 pre-existing 19-return-hook krijgt een nieuwe consument; 🟡 testplan dekte het faalscenario niet | `addBlankTab(name, extraFilters = {})`: backward-compatible 2e argument, zet `extraFilters` synchroon in dezelfde `setExtraTabs`-call — geen afhankelijkheid meer van de reactieve capture (zie "Wiring"). Testplan (Volgorde stap 8, "Aantoonbaar") expliciet uitgebreid: hover-summary/`extraTabs` gecontroleerd **direct ná Create, vóór elke tab-wissel**. 🟡's bewust ongewijzigd gelaten: bestaand patroon in dit bestand resp. bestaande tech-debt, geen regressie door deze feature |
| Refactor Specialist | 🔴 Zelfde auto-capture-race, onafhankelijk bevestigd met volledige code-tracering. 🟡 derde, parallelle operator-lijst-implementatie naast twee bestaande niet-gedeelde varianten (`getOperatorLabels`); 🟡 prop-drilling van `applyColumnFilter`+`datePeriodDisplayModes` door een laag die ze zelf niet gebruikt, in bestanden dicht bij hun regel-plafond | Zelfde fix als hierboven — het door deze persona zelf voorgestelde alternatief ("tab-object met `extraFilters` vooraf gevuld, één `setExtraTabs`") is exact wat is geïmplementeerd, naar het patroon van `addTabsFromColumn`. 🟡 `getOperatorLabels` geëxporteerd uit `PurchaseOrdersActiveFilterEditor.jsx` i.p.v. een derde lokale kopie (composer hergebruikt 'm). 🟡 prop-drilling: `applyColumnFilter` is door de blocker-fix helemaal komen te vervallen; de resterende `datePeriodDisplayModes` + bestaande `viewTabs`/`columns`/`isStaff`/`activeViewId` zijn gebundeld tot één `viewTabsProps`-object |
| Dev Lead | Geen 🔴 (binnen eigen drempels). 🟡 `PurchaseOrdersPage.jsx`-marge (290/300) zonder split-plan of vervolgtrigger; 🟡 props-telling ontbrak voor de gewijzigde wiring-componenten; 🟡 `React.memo`/stabiel-callback-patroon voor de rij-lijst niet gespecificeerd; 🟡 `viewTabs.js`/`usePurchaseOrderTableView.js`: groeiende functionele afhankelijkheid zonder vervolgactie | Props vóór implementatie geteld (TD "Props-telling"): `PurchaseOrdersPageLayout.jsx` bleek al op 15 te staan; 4 bestaande + 1 nieuwe prop gebundeld tot `viewTabsProps` → 15→12. Expliciete vervolgtrigger vastgelegd (BRD Constraints) voor de eerstvolgende, niet-gerelateerde wijziging aan `PurchaseOrdersPage.jsx`. Stabiel `onChange(index, patch)`/`onRemove(index)`-patroon + `React.memo` vastgelegd voor `PurchaseOrderExceptionFilterRow.jsx`. Openstaand risico van `viewTabs.js`/`usePurchaseOrderTableView.js` expliciet benoemd (TD, na Hergebruik-tabel) i.p.v. stilzwijgend gegroeid |
| Backend Engineer | GOEDGEKEURD, geen 🔴 — backend-claims geverifieerd tegen code. 🟡 client-only staff-gate niet expliciet als geaccepteerd risico benoemd; 🟡 testplan verifieerde de server-round-trip niet expliciet | Beide expliciet vastgelegd: FRD "Rollen" + TD "Auth en validatie" benoemen de client-only-gate nu als bewuste, bestaande beperking (niet als toevallige omissie); testplan (Volgorde stap 8) bevat nu een expliciete server-round-trip-test (POST/PATCH) van een 4-rijen composer-payload inclusief een expres onvolledige/dubbele `between`-rij |
| Security Engineer | Geen 🔴. 🟡 vendor-blootstelling via hover-card zonder kolom-gevoeligheidsgrens; 🟡 server-validatie uitsluitend lengte-gebaseerd, niet allow-list-gebaseerd (onbevestigd); 🟡 autorisatie volledig client-side UI-gating, niet expliciet als bewuste keuze benoemd | Alle drie vastgelegd in TD "Auth en validatie": bevestigd dat de composer exact `visibleHeaderColumns` van de actieve (evt. vendor-scoped) view als kolomlijst krijgt — geen apart, breder overzicht mogelijk; `cloneFilter`/`normalizeExtraFilters` gelezen en het lengte-only-gedrag (geen allow-list, onbekende key/operator wordt geclampt+opgeslagen) expliciet als geaccepteerde, bestaande beperking benoemd; client-side-only autorisatie expliciet benoemd i.p.v. impliciet gesuggereerd via "geen nieuwe API" |

# PO-board kolomfilter: waarden kiezen i.p.v. vrij typen ("is exactly" / "is one of")

Status: approved for planning
Datum: 2026-08-10

## Probleem / aanleiding

Op het PO-board (`src/components/supplier/PurchaseOrderColumnFilterMenu*.jsx`) zijn de filter-operatoren
`equals` ("is exactly") en `oneOf` ("is one of") vandaag simpele vrije tekstvelden
([PurchaseOrderColumnFilterMenuFilterSection.jsx](../../../src/components/supplier/PurchaseOrderColumnFilterMenuFilterSection.jsx)).
Voor `oneOf` moet je waarden zelf kommagescheiden intypen. Gebruikers willen sneller kunnen filteren
op exacte waarden die al in de kolom voorkomen, en willen — zoals in Dynamics 365 F&O — een
kolom uit Excel kunnen kopiëren/plakken om in één keer een lijst van waarden op te bouwen.

## Doel

1. `equals` en `oneOf` worden combobox-achtige invoervelden met typeahead-suggesties uit de al
   geladen boarddata, i.p.v. losse tekstvelden.
2. `oneOf` ondersteunt plakken van een verticale (newline-gescheiden) lijst — zoals een gekopieerde
   Excel-kolom — die in één keer wordt omgezet naar losse, individueel verwijderbare waarden
   ("chips"), conform het D365 F&O-patroon.
3. Geen backend-wijziging: alle data is al client-side geladen; unieke-waarden-berekening blijft
   puur in de browser.

## Scope

- **Kolomtypen**: text, status, select **én number** krijgen de nieuwe `equals`/`oneOf`-UX.
  Date-kolommen behouden hun huidige operatoren ongewijzigd (`before`/`after`/`between`/etc.,
  geen `oneOf`, geen typeahead) — plakken/parsen van datums heeft eigen edge cases
  (formats, tijdzones) en valt buiten deze iteratie.
- `oneOf` bestaat vandaag alleen in `TEXT_FILTER_OPERATORS`
  ([tableViewFilterUtils.js:13-20](../../../src/utils/tableViewFilterUtils.js#L13-L20)); dit plan
  voegt hem toe aan `NUMBER_FILTER_OPERATORS` (regel 32-39) zodat je bv. een lijst PO-nummers
  kan plakken.
- `equals` en `oneOf` hergebruiken dezelfde onderliggende typeahead-component (zie UX-ontwerp
  hieronder); de uitbreiding naar number-kolommen geldt daarom voor **beide** operatoren, niet
  alleen voor `oneOf`.
- `colorIs` (kleurfilter) blijft volledig ongewijzigd — aparte, client-only matching zonder
  server-tegenhanger, expliciet losgekoppeld van deze value-filters
  ([tableViewFilterUtils.js:8-11](../../../src/utils/tableViewFilterUtils.js#L8-L11)).

## UX-ontwerp

### "is one of" — chip-invoer met plakken en typeahead

- Eén invoerveld. Typen + Enter voegt de huidige tekst toe als losse "chip"; plakken van
  meerregelige tekst (newline-gescheiden, zoals een gekopieerde Excel-kolom) voegt in één keer
  meerdere chips toe.
- Elke chip toont de waarde + een `x`-knop om hem individueel te verwijderen (zie referentiescreenshot
  D365 F&O uit de brainstorm-sessie: invoerveld bovenaan, daaronder de losse waarde-rijen met
  verwijderknop, en `Apply`/`Clear` onderaan — dat bestaande knoppenpaar blijft ongewijzigd).
- **Typeahead**: terwijl je typt (niet bij plakken) toont een suggestielijst onder het invoerveld
  de bestaande unieke waarden uit de kolom die matchen op de getypte tekst, tot maximaal
  **100** matches. Klikken op een suggestie voegt hem toe als chip (zelfde effect als typen + Enter).
- Suggesties zijn **cascading**: ze worden berekend over de rijen die overblijven ná toepassing
  van alle *andere* actieve kolomfilters (dus niet het filter van de kolom zelf) — zodat je geen
  waarde kan kiezen die toch nul resultaten oplevert gegeven de rest van je huidige filters.
- **Numerieke validatie (number-kolommen)**: bij plakken worden regels die geen geldig getal zijn
  overgeslagen. Als er regels genegeerd zijn, toont de UI een korte melding, bv.
  `"3 of 12 values ignored — not numeric"`.
- Dubbele waarden (getypt, geplakt, of via suggestie) worden gededupliceerd; volgorde = volgorde
  van toevoegen.

### "is exactly" — single-value combobox met typeahead

- Zelfde onderliggende typeahead-suggestielogica als bij "is one of" (unieke waarden, cascading,
  limiet 100 matches), maar de component staat maar **1** waarde toe.
- Kiezen uit de suggestielijst, of Enter na typen, vult het veld en **vervangt** een eventueel
  eerder gekozen waarde. Geen chips-lijst — er is toch maar 1 waarde relevant.
- Plakken van een meerregelige lijst in dit veld: alleen de eerste regel wordt overgenomen, de
  rest genegeerd (desnoods met dezelfde soort hint als bij `oneOf`).
- Technisch: hergebruikt dezelfde hook/component als `oneOf`, in een "single value"-variant
  zonder chip-verwijderknoppen en met plakken beperkt tot de eerste regel.

### Niet in scope

- Geen aparte `(Blanks)`-optie in de nieuwe invoer. Filteren op lege cellen kan al via `equals`
  met een lege waarde — dat gedrag bestaat al
  ([tableViewFilterUtils.js:135](../../../src/utils/tableViewFilterUtils.js#L135) /
  [purchaseOrderColumnFilterMenuConstants.js:99](../../../src/components/supplier/purchaseOrderColumnFilterMenuConstants.js#L99))
  en wordt niet aangeraakt.
- Geen checkbox-popover/"Choose from list"-picker (verworpen tussentijds ontwerp) — vervangen
  door de combobox/chip-aanpak hierboven.
- Geen `oneOf` of typeahead voor date-kolommen.
- Geen backend/SQL-wijziging: geen `DISTINCT`-query, geen nieuwe API-route.

## Technisch ontwerp

### Filter-datamodel

- `oneOf`-filterwaarde verandert van één kommagescheiden string naar een **array**
  (`filter.value: string[]` voor tekst/select/status, `number[]` voor number-kolommen).
- **Backward compatibility**: bestaande opgeslagen view-states met de oude komma-string worden bij
  het inlezen (`resolveFilterModel` /
  [usePurchaseOrderTableView.js `applyState`](../../../src/hooks/usePurchaseOrderTableView.js#L222-L242))
  omgezet naar een array via de bestaande `parseOneOfValues`-splitlogica
  ([tableViewFilterUtils.js:58-63](../../../src/utils/tableViewFilterUtils.js#L58-L63)) als fallback
  wanneer `filter.value` een string blijkt te zijn i.p.v. een array. Nieuwe writes zijn altijd een array.
- `equals` blijft een losse string/number — geen datamodel-wijziging nodig.

### Matching-logica (`src/utils/tableViewFilterUtils.js`)

- `textMatchesFilter`: `oneOf`-tak aanpassen van `parseOneOfValues(filter.value)` (string-split)
  naar direct itereren over de array in `filter.value` (met dezelfde `normalizeText`-normalisatie
  per item).
- `numberMatchesFilter`: nieuwe `oneOf`-tak toevoegen — `rowNum` moet voorkomen in de
  (numerieke) array `filter.value`.
- `hasActiveFilter` / `isColumnFilterActive`: check op "leeg filter" wordt `Array.isArray(filter.value)
  && filter.value.length > 0` i.p.v. de huidige string-truthiness-check, voor beide kolomtypen.

### Unieke-waarden-berekening (nieuw)

- Nieuwe pure helper, bv. `getUniqueColumnValues(column, items, activeFiltersExcludingColumn,
  datePeriodDisplayModes)` in `src/utils/tableViewFilterUtils.js` (of een nieuw bestand
  `columnUniqueValues.js` als de bestaande file te veel groeit) — dedupliceert
  `order.values[column.key]` over de meegegeven rijen, alfabetisch/numeriek gesorteerd.
- **Lazy berekening**: alleen actief zolang de typeahead-suggestielijst van die specifieke kolom
  open/relevant is (dus niet voor alle kolommen op elke render) — `useMemo` in het filter-menu,
  afhankelijk van "items gefilterd door alle *andere* actieve kolomfilters". Dat hergebruikt
  dezelfde filter-pass die `processedItems`
  ([usePurchaseOrderTableView.js:244-291](../../../src/hooks/usePurchaseOrderTableView.js#L244-L291))
  al doet, met de eigen kolom uitgesloten van de filterset.
- Puur client-side, geen nieuwe backend-call. Geen nieuwe `Server-Timing`/`measure()`-instrumentatie
  bij oplevering; als de suggestieberekening in de praktijk merkbaar traag blijkt op een groot
  board, wordt de memo alsnog gewrapt in `measure()` (perf-chokepoint uit `CLAUDE.md`).

### Nieuwe/gewijzigde componenten (frontend)

- Nieuwe component, bv. `PurchaseOrderColumnFilterValuePicker.jsx`, met een `mode: 'single' |
  'multi'`-prop:
  - `multi` (voor `oneOf`): chip-lijst + invoerveld + paste-handler (split op `\n`) + typeahead-dropdown.
  - `single` (voor `equals`): invoerveld + typeahead-dropdown, geen chips, paste beperkt tot 1e regel.
- [PurchaseOrderColumnFilterMenuFilterSection.jsx](../../../src/components/supplier/PurchaseOrderColumnFilterMenuFilterSection.jsx):
  de huidige `Input`-rendering voor `!isDate` (regel 113-122, tekst) en voor `isNumber &&
  operator !== 'between'` (regel 102-112) wordt voor `operator === 'equals' || operator ===
  'oneOf'` vervangen door de nieuwe picker-component; overige operatoren (`contains`,
  `startsWith`, etc.) behouden het bestaande `Input`.

## Edge cases

- Kolom met 0 unieke waarden gegeven de huidige andere filters → suggestielijst toont
  "No values match the current filters" i.p.v. een lege dropdown.
- Geplakte lege regels (dubbele newlines) worden genegeerd, niet als lege chip toegevoegd.
- Meer dan 100 matches op een getypte zoekterm → suggestielijst toont de eerste 100 (gesorteerd)
  + hint "Showing 100 of N — refine your search to see more"; typen verfijnt de match altijd over
  de volledige dataset, alleen de weergave is begrensd.
- Migratie: een opgeslagen view met oude `oneOf`-komma-string moet na deze wijziging nog steeds
  correct filteren (zie backward-compat fallback hierboven) — dit is een expliciet testgeval.

## Testen

- Unit tests (co-located, conform `kwaliteitspoort`) voor:
  - `textMatchesFilter` / `numberMatchesFilter` met array-`oneOf`-waarden.
  - Backward-compat fallback: string-`oneOf`-waarde wordt correct gelezen als array.
  - `getUniqueColumnValues`: cascading-gedrag (respecteert andere actieve filters, sluit eigen
    kolom uit), sortering, limiet/afkap-gedrag bij >100 matches, dedupe.
  - Paste-parsing: newline-split, lege regels genegeerd, numerieke validatie + "N ignored"-telling
    voor number-kolommen.
- Bestaande tests die nu comma-string-`oneOf`-gedrag aannemen
  ([usePurchaseOrderTableView.test.js](../../../src/hooks/usePurchaseOrderTableView.test.js),
  [PurchaseOrderColumnFilterMenu.test.jsx](../../../src/components/supplier/PurchaseOrderColumnFilterMenu.test.jsx))
  worden bijgewerkt naar het array-formaat.
- `/check-ui` (Fluent UI design-review) na implementatie, want dit raakt een nieuw invoerpatroon
  (chip/combobox) — conform de kwaliteitspoort-regel "3+ UI-bestanden of nieuwe flyout/drawer/
  overlay → escaleer naar ui-design-review".

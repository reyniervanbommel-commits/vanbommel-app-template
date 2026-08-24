# RCCP-grafiek: PO-vakjes, received onder de as, Today en te laat

## BRD

**Als** planner (employee/admin; leverancier ziet hetzelfde voor eigen vendor)
**wil ik** in de bestaande grafiek *Capacity vs load* per week zien welke PO’s de last maken, wat al received is, waar vandaag valt, en welke open orders te laat zijn
**zodat** ik load niet als één anonieme som hoef te lezen en achterstallige open PO’s meteen herken.

**Probleem nu:** de grafiek stapelt alleen weektotalen per measure. Received kan al onder de as (negatieve delivered-measure), maar zonder PO-vakjes, zonder Today-lijn, zonder te-laat-kader, en met dunne balken.

**Succes (toetsbaar):**

- Received (configured *Delivered quantity*) staat **boven** als lichte vakjes op de **bestaande RCCP-datum** (geplande week) én **onder** de x-as als vakjes op de **ontvangstdatum**.
- Ontvangstdatum is een **nieuwe admin-keuze** in RCCP-settings. Ontbreekt die datum op de rij: onder de as op de **geplande week** (fallback).
- Open (*Open quantity*) staat **boven** als donkere vakjes op de geplande week.
- Elke balk heeft **één vak per PO per week per status** (open vs received). Zelfde PO met beide hoeveelheden in één week = twee vakjes. Geen PO-nummer in het vak; PO alleen via **tooltip/hover**.
- Balkbreedte **80%** van de weekkolom.
- Verticale **Today**-lijn op de echte huidige datum in de huidige weekkolom.
- **Rood kader** alleen om open-vakjes waarvan de geplande ISO-week **strikt vóór** de huidige ISO-week ligt. Open in de huidige week is niet te laat.
- UI-teksten Engels.

**Non-goals:**

- Geen nieuwe tab *Delivery plan* (DevOps #258 blijft buiten scope).
- Geen wijziging aan matrix, KPI’s of drill-down-panel.
- Geen verplichte labels in vakjes; geen per-regel (SKU) vakjes.
- Capaciteit-/warning-/overcapacity-lijnen blijven zoals nu.

**Constraints:** bestaande Recharts-grafiek in `src/components/rccp/RccpChartMatrixPanel.jsx`; extra settings-veld voor ontvangstdatum (JSON in RCCP-config, geen nieuwe SQL-tabel); `apiRequest` / `measure()`; component ≤ 300 regels; OTAP local-first.

## FRD

**Gekozen approach:** A — `GET /api/rccp/analysis` levert per week PO-segmenten; één custom Recharts Bar-shape tekent gestapelde vakjes (80% weekbreedte). Today = SVG-overlay in het chart-panel op `todayLineX` (echte weekdag in de huidige ISO-weekkolom). Geen Recharts `ReferenceLine` voor Today (die landt op het band-midden). Huidige ISO-week niet in het venster: geen lijn. Te laat = rode stroke op het open-vak. Tooltip per vak. Matrix en KPI’s ongewijzigd.

**Afgewezen:**

- B — één Bar-serie per PO×status: explodeert bij veel PO’s (legend, series, remount).
- C — weektotalen houden en PO-vakjes als overlay of tweede call: uitlijning en extra round-trip.

**Happy path**

1. Planner opent RCCP, kiest vendor en weekvenster.
2. Analysis geeft per weekpunt `segmentsAbove` en `segmentsBelow` (`poNumber`, `qty`, `status`, `late`).
3. Boven de as: open (donker, geplande week) en received (licht, geplande week).
4. Onder de as: received op ontvangstweek; zonder ontvangstdatum op de geplande week.
5. Balk = 80% van de weekkolom. Vakjes gestapeld: PO-nummer A–Z; per PO received tegen de as, open naar buiten. Onder de as dezelfde PO-volgorde, naar beneden.
6. Today-lijn op de echte datum als de huidige ISO-week in het venster zit.
7. Open-vakjes met geplande ISO-week strikt vóór de huidige ISO-week krijgen een rood kader.
8. Hover toont PO, status, quantity, week (Engels). Geen klik op vakjes; drill-down blijft de matrix.

**Settings**

- Nieuw optioneel veld **Receipt date** naast *Delivery date* in RCCP settings (Purchase order fields). Alleen admin wijzigt.
- Geen kolom gekozen, of cel leeg: received onder de as op de geplande week.
- Employee/supplier zien de grafiek; settings blijven admin.

**Weekvenster**

- Alleen vakjes waarvan de week in het zichtbare venster valt. Geen extra kolommen buiten de matrix.
- Huidige ISO-week niet in het venster: geen Today-lijn (niet op de rand tekenen).

**Kleur en legenda**

- Fill uit de geconfigureerde Open- en Delivered-measurekleuren; received lichter (zelfde hue).
- Legenda per measure (niet per PO). Capaciteit-/warning-lijnen ongewijzigd.
- Te laat = rode stroke, geen extra fill.

**Leeg / fout / overlap**

- Geen PO-segmenten in het venster: geen vakjes; lijnen en bestaande empty states blijven.
- Analysis- of settingsfout: bestaande error UI; geen halve shape.
- Grafiek is read-only; geen write-conflict tussen kijkers.

**Oppervlakken / hergebruik**

- Grafiek: `src/components/rccp/RccpChartMatrixPanel.jsx` (custom shape + tooltip + Today-lijn).
- Payload: `server/services/RccpAnalysisService.js` (`buildChartSeries` uitbreiden).
- Settings: `src/components/rccp/RccpSettingsDataFields.jsx` + `server/services/RccpSettingsService.js`.
- Geen nieuwe route; bestaande `GET /api/rccp/analysis` en RCCP-config JSON.

## TD

Geen nieuwe route, geen SQL-migratie. Zelfde PO-snapshot als nu. Segmenten meeleveren in `GET /api/rccp/analysis`. Custom Recharts-shape i.p.v. één Bar-serie per PO.

### Config

- Nieuw optioneel veld `receiptDateColumnKey` in `RCCP_CONFIG` JSON via [server/services/RccpSettingsService.js](server/services/RccpSettingsService.js) `defaultConfig` + `validateConfig`. Altijd terug in het opgeslagen object.
- Validatie: string; trim; `''` toegestaan; max 128 → **400** als langer; alleen `[A-Za-z0-9_]+` als niet-leeg (anders 400). Nooit in SQL: alleen `values[key]` op de al geladen snapshot (zelfde pad als `dateColumnKey`).
- Leeg of onbekende kolom op de rij: ontvangstdatum = `dateColumnKey`.
- Geen registry-plicht, geen `rccpMeasure`-check (datumkolom, geen hoeveelheid).
- UI: **Receipt date** `ColumnSelect` in [src/components/rccp/RccpSettingsDataFields.jsx](src/components/rccp/RccpSettingsDataFields.jsx) naast Delivery date; `onReceiptDate` via [src/components/rccp/useRccpSettingsFormHandlers.js](src/components/rccp/useRccpSettingsFormHandlers.js) **en** doorgeven in [src/components/rccp/RccpSettingsForm.jsx](src/components/rccp/RccpSettingsForm.jsx). Label/info Engels. Alleen admin `PUT /api/admin/rccp/settings` (`requireRole(ADMIN)`).

### Analysis-payload

Bestaande weektotalen in [server/services/RccpAnalysisService.js](server/services/RccpAnalysisService.js) `buildChartSeries` blijven (matrix, KPI’s, capacity/warning/overcapacity-lijnen). Extra per weekpunt:

```text
segmentsAbove: [{ poNumber, qty, status: 'open'|'received', late }]
segmentsBelow: [{ poNumber, qty, status: 'received', late: false }]
```

- `poNumber` = `row.recordKey` (zelfde als drill-down).
- `qty` altijd ≥ 0. Onder de as spiegelt de shape (niet de payload).
- Bestaande negatie van de delivered-measure-totaal blijft voor Y-domein/legenda.

**Datums (per PO-regel, zelfde pick-volgorde als nu: lijn dan header):**

| Segment | Datum | Week |
|---|---|---|
| open boven | `dateColumnKey` | geplande ISO-week |
| received boven | `dateColumnKey` | geplande ISO-week |
| received onder | `receiptDateColumnKey` of fallback `dateColumnKey` | ontvangst-ISO-week |

Header-only measures: open/received-boven op geplande slots; received-onder op ontvangst-slots (fallback geplande slots). Alleen weken in het query-venster.

**Late:** `status === 'open'` en geplande ISO-week strikt vóór de ISO-week van de geïnjecteerde `now` (UTC, bestaande `getIsoWeek` / `getIsoWeekYear`). Received nooit `late`.

**Stapel:** server sorteert `poNumber` `localeCompare`; per PO in `segmentsAbove` eerst `received` dan `open`. Client tekent in array-volgorde vanaf de as.

**Clip:** geen segment buiten `periods`. Geen extra weekkeys.

**Leeg rollen:** geen `openMeasureKey` → geen open-vakjes; geen `deliveredMeasureKey` → geen received-vakjes. Overige measures blijven gewone Bar/Line.

**Analyse-hook (verplicht):** `analyze()` houdt **één** snapshot (`poRows`). `aggregatePoLoad` blijft weektotalen voor matrix/KPI’s. Daarna `time('rccp_po_segments', () => buildPoSegments(poRows, config, window, { now, vendorAccount }))` — puur, `now` geïnjecteerd (geen `new Date()` in de util). Resultaat op de bestaande chart-punten mergen. **Nooit** segmenten uit `cells` (geen `recordKey` daar). **Nooit** tweede board-read. **Nooit** `RccpAnalysisService` importeren vanuit de util.

- Zelfde `vendorAccount` / `effectiveVendor` als de matrix (staff + gekozen vendor: geen PO’s van andere vendors in de JSON).
- Sommeer qty per `recordKey` × week × status; `qty <= 0` skippen zoals `addLoad`.
- Ontvangstweek **niet** via de geplande-week-skip van `processLine`: eigen datum → eigen ISO-week → daarna clip op `periods`. Gepland buiten venster + ontvangen in venster ⇒ wel `segmentsBelow`.
- Shared date/window helpers als leaf-utils, geen gekopieerde tweede PO-loop.

Extract: [server/utils/rccpPoSegments.js](server/utils/rccpPoSegments.js) + `rccpPoSegments.test.js`. Analysis-test: supplier (of staff+vendorfilter) + andere `vendorAccount` in de query ⇒ geen vreemde `poNumber`s.

### Grafiek

[src/components/rccp/RccpChartMatrixPanel.jsx](src/components/rccp/RccpChartMatrixPanel.jsx) (nu ~193 regels) mag niet over 300; bij ≥250 ComposedChart-body extraheeren. Extract:

- [src/components/rccp/RccpPoStackBar.jsx](src/components/rccp/RccpPoStackBar.jsx) — stomme Recharts `shape` (`React.memo`): alleen `<g>` + `<rect>`s. **Geen hooks, geen Fluent Tooltip, geen today-lijn, geen inline `shape={(p) => …}`.** `shape={RccpPoStackBarAbove}` / `shape={RccpPoStackBarBelow}` als **module-level** wrappers (`side` + kleuren uit het weekpayload, niet extra named props). Recharts-payload telt niet als component-props; publieke API ≤ 10.
- [src/components/rccp/RccpPoSegmentTooltip.jsx](src/components/rccp/RccpPoSegmentTooltip.jsx) — **één** bestaande Recharts-`Tooltip` (`content={RccpPoSegmentTooltip}` als referentie). Hover-segment via payload/activeIndex in het **panel** (`useCallback`); geen `onMouseEnter` per rect in een `.map()` in JSX van het panel; geen tweede Tooltip.
- [src/components/rccp/rccpPoStack.js](src/components/rccp/rccpPoStack.js) — `lightenHex` (één keer per measure-kleur, niet per rect), `todayLineX`, stack-layout. `todayLineX`: `null` als huidige ISO-week niet in `periods`; anders `RCCP_CHART_Y_AXIS_WIDTH + (index + (isoWeekday - 0.5) / 7) * RCCP_WEEK_COL_WIDTH`. Today = SVG-overlay **in het panel**, niet in de bar-shape.
- `useMemo` voor chart-rijen met `__stackAbove` / `__stackBelow` en voor `todayLineX`. Geen `Cell`-`.map()` op de stack-bars. `barSize = round(RCCP_WEEK_COL_WIDTH * 0.8)` (54 px).

Open/delivered **Bar**-series met `dataKey` = measure vervangen door twee custom Bars (`__stackAbove` / `__stackBelow` som van segmenten, onder negatief) zodat de Y-as klopt. `__overloaded__` fill op die stacks **niet** gebruiken (rood = alleen late stroke; overload blijft matrix/KPI/capacity-lijn). Overige measures + lijnen ongewijzigd.

Kleur: open = `openMeasure.color`; received = `lightenHex(deliveredMeasure.color)` (zelfde hue, lichter). Late open: `stroke = tokens.colorPaletteRedBorder2` (of `#D13438` als token in SVG lastig is), `strokeWidth = 2`, geen extra fill.

Legend: bestaande measure-namen, geen PO-items.

### Auth / input

- Geen nieuw endpoint. Analysis: `requireSession` + `rccpAccess` zoals nu.
- `receiptDateColumnKey`: zie Config; nooit concatenatie in SQL/OData.
- Geen localStorage, geen secrets.

### Volgorde

1. Settings-veld + tests (`RccpSettingsService.test.js`).
2. `rccpPoSegments` + analysis-tests (stapel, late, fallback-datum, clip, header-only).
3. Chart shape + tooltip + today-lijn; `RccpChartMatrixPanel` onder 300 regels.
4. Footer: `APP_VERSION` patch in [src/config/version.js](src/config/version.js).

### Tests / aantoonbaar

- Server: received-onder andere week dan received-boven; lege receipt-datum → onder = geplande week; open W-1 + `late: true`; huidige week open `late: false`; vendorfilter/supplier ⇒ geen vreemde `poNumber`s.
- Client util: `todayLineX` null buiten venster; stackvolgorde received tegen as.
- Handmatig op `/rccp`: dikke PO-vakjes, today-lijn, rood kader links van deze week, hover toont PO.

### Perf

- Geen extra `apiRequest`; geen N+1.
- Custom shape is O(segmenten in beeld), niet O(PO-series).
- `measure`/`time` alleen om de nieuwe groepeerstap, bestaande analysis-`time` blijft.

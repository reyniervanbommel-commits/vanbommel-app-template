# Idle prefetch: KPI-tab, BI- en RCCP-pagina

## BRD

De KPI-kaarten onder de PO-tabel blijven leeg (DEV en PROD), terwijl dezelfde kaarten op de RCCP-pagina wél vullen. Oorzaak: de PO-board-read (zonder sublijnen) vervuilt de server-KPI-cache. Daarna moet `/rccp/board-kpis` een snapshot mét regels gebruiken.

Tegelijk moeten KPI-, BI- en RCCP-data stilletjes op de achtergrond warm worden, zodat de onderste tabs en de eerste klik op `/bi` en `/rccp` snel aanvoelen — **zonder** de initiële laadsnelheid van de PO-tabel en **zonder** scroll-/type-jank.

Keep-alive maakt alleen **terugkeer** naar een al bezochte pagina instant. Dit ontwerp dekt het **eerste** bezoek en de KPI-tab.

## FRD

1. KPI-tab onder de PO-tabel toont dezelfde volume/late/on-time-cijfers als de RCCP-pagina (geaggregeerd over de zichtbare tabelrijen). Capacity-tegels op deze tab blijven leeg (by design).
2. De PO-tabel laadt ongewijzigd: geen extra round-trip vóór eerste paint, `includeDetails` blijft default `false`.
3. Ná board-klaar + browser-idle start achtergrondwerk in deze volgorde, met pauze bij gebruikersinput (scroll, toets, pointer):
   1. Server-snapshot mét PO-regels warmen via `GET /api/rccp/board-kpis` (compacte client-payload).
   2. JS-chunks van `/rccp` en `/bi` prefetchen (`import()`).
   3. RCCP-analyse prefetchen voor **alleen** de laatst gekozen vendor + opgeslagen ISO-weekrange (bestaande `prefetchRccpAnalysis`). Geen “alle vendors”.
   4. BI: chartlijst + `POST /api/bi/aggregate` in `biBoardCache`, met
      dezelfde vendor-/datumfilter als de echte `/bi`-lezing zal gebruiken:
      lees `readPoFilterByColumnForRccp()` (PO-kolomfilter-handoff) en
      `GET /bi/date-filter` vóórdat de aggregate-payload gebouwd wordt.
      Zonder die twee inputs is de cache-key vrijwel zeker anders dan
      `useChartData` gebruikt en is de prefetch een no-op.
4. Hover op rail-items RCCP/BI mag dezelfde prefetch starten als idle nog niet klaar was.
5. Prefetch schrijft **niet** naar PO-tabel React-state (`orders` / filters / grouping).
6. `/rccp` en `/bi` worden **niet** stiekem gemount (geen extra keep-alive-slots).
7. Fout in prefetch is stil (geen toast, geen spinner op de tabel). Tab-open of pagina-navigatie valt terug op de bestaande fetch.
8. UI-teksten blijven Engels; dit werk voegt geen user-visible copy toe behalve bestaande KPI-strings.

## TD

### Root cause (cache)

- Board: `GET /api/data/purchase-orders` → `includeDetails: false`.
- `TableDataService.readExecute` roept daarna `rememberKpiPoRows(scopedRows)` aan — rijen **zonder** `details`.
- `readRccpPoRows` hergebruikt die cache. Open/delivered zitten op regels (`walkRccpPoKpiLines` / `isHeaderOnlyMeasure`). Zonder `details` blijven KPI’s 0.
- Spec 2026-08-25: board-kpis moet een snapshot **met details** gebruiken.

### Cache-contract

- Alleen snapshots mét `details` (array aanwezig, ook als leeg) mogen in `kpiRowCache`.
- `includeDetails: false` mag `rememberKpiPoRows` **niet** aanroepen.
- `readRccpPoRows` weigert cache-hits zonder details en doet `dataService.read({ includeChangeDecorations: false })` (details default `true`).
- Optioneel: een details-snapshot ook in `snapshotCache` zetten zodat BI `readBoardSnapshot` dezelfde rijen hergebruikt i.p.v. een tweede zware read.

### Idle-orchestratie (client)

Nieuwe utils, geen JSX:

- `src/utils/idleWhenQuiet.js` — `requestIdleCallback` (fallback `setTimeout(800)`), pauze bij `keydown` / `wheel` / `pointerdown` / `touchstart` (niet `mousemove`).
- `src/utils/dataPagesPrefetch.js` — stappen 3.1–3.4; dedupe; abort-token bij unmount/navigatie weg van `/`.

Trigger: PO-pagina `pageActive && !loading && orders` (eerste succesvolle board-read). Cleanup bij leave.

`useRccpSplitAnalysis` moet `getCachedRccpAnalysis` hergebruiken (nu doet alleen `useRccpPage` dat).

### Hard constraints (specialist)

| Mag niet | Waarom |
|---|---|
| Extra werk vóór eerste PO-paint | Startsnelheid |
| `setOrders` / board-re-render door prefetch | Scroll/type-jank |
| Hidden mount van RCCP/BI-pagina’s | Geheugen + CPU naast de tabel |
| RCCP prefetch zonder vendor / alle vendors | Bewust trage path |
| Header-only rijen in KPI-cache | Lege tegels |

### Risico’s

- `res.json()` van een grote `/rccp/analysis` (PO-segmenten) kan kort de main thread belasten. Mitigatie: pas starten na idle + input-pauze; KPI-call eerst (compact); analysis als derde stap.
- Zelfde SQL-pool als live board-edits. Mitigatie: alleen ná board-klaar; één details-read, daarna cache.
- Verspilde achtergrondtijd als de gebruiker nooit KPI/BI/RCCP opent. Acceptabel.

### Niet in scope

- SQL-migratie, nieuwe routes (behalve hergebruik bestaande).
- Capacity-tegels vullen op de PO-KPI-tab.
- Keep-alive wijzigen naar mount-all-pages.
- Service worker / localStorage voor board-data.

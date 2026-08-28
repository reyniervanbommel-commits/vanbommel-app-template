# Performance Review — 2026-08-27

**Modus:** regression (impact lokale unpushed commits op `develop`)
**Omgeving:** local (5178) — *metingen op local bevatten geen netwerklatentie*
**Baseline:** aanwezig (2026-07-22, seed 80 PO’s / DEV URL) — **niet vergelijkbaar** met deze run (productie-achtig PO-volume, opgeslagen RCCP-venster 2021-W46→2023-W10)
**App:** v1.52.39
**Verdict:** REGRESSIERISICO — vooral RCCP-venster + duplicate BI/prefetch, niet de KPI-sparklines (die zijn al gerevert)

Geraakte lokale commits: prefetch parallel (`9369ab1`), KPI-tegel 1-1-1900 (`afefb96`), Show sum persist (`d437ea7`), RCCP-dashboard/itemfilter/dataWindow (`a4da469`, `7eeeec2`), sparkline-revert (`59c97ab`). Uncommitted: ISO-week picker.

---

## 1. Ranglijst

Mediaan waar 2+ runs; anders één meting. ms.

| Actie | Totaal | Δ baseline | SQL | Backend-ov. | Netwerk | Client | Render | Dominant |
|-------|-------:|-----------:|----:|------------:|--------:|-------:|-------:|----------|
| Eerste klik RCCP (na PO-load) | ~4400 | n.v.t. (andere data) | — | — | 4421 (columns, 4×) | 0 | rest | Netwerk (duplicate) |
| RCCP analysis breed venster | 516 | n.v.t. | ~215 | ~147 | ~90 | 0 | — | SQL + backend-overig |
| RCCP analysis 8 weken | 283 app | — | ~147 | ~136 | — | — | — | SQL |
| Warm RCCP (KeepAlive) | ~120 | beter dan 833 | 0 | 0 | 120 | 0 | laag | Netwerk (revision) |
| Terug naar PO | 259 | KeepAlive OK | 0 | 0 | 259 | 0 | laag | Netwerk (revision) |
| Eerste klik BI | ~4885 | >> 837 | — | — | 4885 (meta, 2×) | 0 | — | Netwerk (duplicate) |
| Koude PO-load `/data/purchase-orders` | 15030–25206 | niet vergelijkbaar | ongemeten | — | — | — | — | SQL/board-read; 1e run vervuild door 2e browser-tab |

Koude start (eerste klik na load), waar sterk afwijkend:

| Actie | Koud | Warm |
|-------|-----:|-----:|
| Tab RCCP | ~4,4 s (columns + analysis) | ~120 ms |
| Tab BI | ~4,9 s (`/bi/meta` 2×) | niet 3× hermeten |
| Terug PO | 259 ms | KeepAlive |

---

## 2. Bevindingen

Gesorteerd op **geschatte winst**, niet op ernst.

### B1 — Duplicate `/bi/meta` bij eerste BI-klik · geschatte winst ~4,8 s

- **Gemeten:** eerste klik BI: twee keer `GET /bi/meta/purchase-orders` (4885 ms en 4807 ms). Ook `/bi/charts`, `/bi/revision`, `/rccp/vendors`, `/bi/date-filter` elk 2×. Op de PO-load al 2–3× `/bi/meta` + `/rccp/vendors`.
- **Toegerekend aan:** netwerk — prefetch én de echte BI-mount fetchen dezelfde endpoints.
- **Oorzaak:** `prefetchBiDashboard` vult `biBoardCache`, maar `useBiMeta` doet altijd `apiRequest` ook als de cache al warm is. Prefetch loopt nu parallel met KPI/RCCP (`dataPagesPrefetch.js`) en start al tijdens de PO-board-read.
- **Plek:** `src/components/bi/hooks/useBiMeta.js` (effect altijd fetch), `src/utils/biBoardPrefetch.js`, `src/utils/dataPagesPrefetch.js`
- **Voorstel:** in-flight promise delen; geen tweede `/bi/meta` als cache vers is. Prefetch pas ná succesvolle board-read (niet ernaast).
- **Afweging:** iets vaker stale meta tot de gebruiker vernieuwt; eerste klik voelt veel lichter.

### B2 — Opgeslagen RCCP-venster 2021–2023 (71 weken) · geschatte winst groot op render/payload

- **Gemeten:** analysis `fromYear=2021&fromWeek=46&toYear=2023&toWeek=10&vendorAccount=V000511`: app 426 ms, payload **173 KB**, 71 periodes, 426 cells, 648 stack-segmenten, **5810 DOM-nodes**. Zelfde vendor, 8 weken (2026-W31–W38): app 283 ms, payload **6 KB**, 0 segmenten (lege weken).
- **Toegerekend aan:** client/render (matrix zonder virtualisatie) + grotere serialisatie. Server-labels breed: `rccp_po_read` 147, `rccp_capacity` 67, `rccp_po_segments` 27, `rccp_kpis` 40.
- **Oorzaak:** nieuwe lege-week hint kan het volledige `dataWindow` als isoWindow zetten en persistet dat. Prefetch gebruikt daarna dat venster op de achtergrond tijdens PO-load. Matrix is `tableLayout: fixed` + `width: max-content`, geen windowing.
- **Plek:** `src/components/rccp/RccpPageContent.jsx` (`handleShowDataWindow`), `src/hooks/useRccpWindow.js` (persist), `src/utils/dataPagesPrefetch.js`, `src/components/rccp/RccpMatrixTable.jsx`
- **Voorstel:** dataWindow alleen als eenmalige “jump”, niet als blijvend opgeslagen default; prefetch max. 8–12 weken; matrix virtualiseren of maand-grain forceren boven N weken.
- **Afweging:** gebruiker die “alle historie” wil, moet dat bewust houden; default blijft het korte venster.

### B3 — `listCapacity` zonder weekfilter + extra analyse-passen · geschatte winst klein lokaal, groeit op Azure

- **Gemeten:** `rccp_capacity` **67 ms (breed)** vs **69 ms (8 weken)** — zelfde duur, dus de query is niet meer window-gebonden. Extra `rccp_po_segments` + `rccp_kpis` ~66 ms sequentieel. `aggregatePoLoad` loopt nu ook out-of-window regels voor `dataRangeByVendor` (ongemeten, zit in backend-overig ~147 ms).
- **Toegerekend aan:** SQL (capacity full-scan per vendor) + backend-overig (tweede/derde PO-pass).
- **Oorzaak:** `analyze()` roept `listCapacity({ vendorAccount })` zonder `periodYear`/`fromWeek`/`toWeek`, filtert daarna in JS.
- **Plek:** `server/services/RccpAnalysisService.js` (analyze), `server/services/RccpCapacityService.js`
- **Voorstel:** weekfilter terugzetten; data-range desnoods via een lichte min/max-query, niet de hele capacity-tabel.
- **Afweging:** lege-week hint blijft mogelijk zonder de zware read.

### B4 — Show sum persist / KPI-overlay / sparkline-revert · lage impact

- Show sum: alleen saved-view keys; sommen blijven in `useMemo` op `rows`.
- KPI matching-units overlay: `O(zichtbare rijen × kolommen)` bij tegelklik, gememoized pad. Extra `useEffect` in `PoBoardKpiStrip` herberekent overlay als payload verandert.
- Sparklines zijn gerevert — geen extra render op KPI-tegels.

---

## 3. Meetgaten

| Actie / route | Ongemeten deel | Voorgestelde instrumentatie |
|---------------|---------------:|-----------------------------|
| `analyze()` | `aggregatePoLoad` + matrix-build | `time('rccp_aggregate_po')`, `time('rccp_build_matrix')` |
| KPI overlay op PO-board | `overlayKpiQtyOnOrders` | `measure('kpi:overlay')` |
| Capacity JS-filter | na unbounded SQL | valt weg als SQL weer gefilterd is |
| Eerste PO-load deze sessie | 2e Playwright-tab open | hermeten met één tab; Server-Timing ontbrak op de 15–25 s read |

---

## 4. Baseline

`test-reports/perf-baseline.json` — **ongewijzigd**.

Deze run is productie-achtig volume + een 71-weeks RCCP-venster. De juli-baseline is seed (80 PO’s) op DEV. Overschrijven zou de HUD-vergelijking bederven.

Regressiedrempel: > +25% of > +200 ms t.o.v. baseline — hier niet toepasbaar op absolute ms.

---

## 5. Aantekeningen

- Eerste minuten: backend 500s tijdens herstart; daarna 200.
- Koude PO-load was deels vervuild door een tweede browser-tab op `/rccp` (zelfde SQL-pool). Extra tab daarna gesloten. De 15–25 s `GET /data/purchase-orders` is dus geen harde regressie-claim, wél een signaal van pool-druk als prefetch parallel loopt.
- Parallelle calls: prefetch KPI + RCCP analysis + BI + chunk-preload naast de board-read. Som van API-ms >> wandklok; Render daardoor niet zuiver.
- `rccp_capacity` even duur bij 8 als bij 71 weken: bevestigt unbounded fetch.
- Buiten scope: feature #277 (worktree, niet op deze localhost), Admin/Analytics, scroll-jank van de 71-weeks matrix (geen `perf-scroll` deze run).

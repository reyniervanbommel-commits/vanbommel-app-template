# Idle prefetch KPI / BI / RCCP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** KPI-kaarten onder de PO-tabel vullen met regeldata, en KPI/BI/RCCP stilletjes warmen ná de eerste PO-paint, zonder startsnelheid of scroll/type in de tabel te raken.

**Architecture:** Twee lagen. (1) Server: header-only board-reads mogen de KPI-row-cache niet meer vullen; `readRccpPoRows` eist `details`. (2) Client: ná board-klaar + idle + geen recente input, bestaande endpoints aanroepen (`/rccp/board-kpis`, `prefetchRccpAnalysis`, `/bi/charts` + `/bi/aggregate`) en JS-chunks `import()`-en. Prefetch schrijft alleen naar bestaande in-memory caches, nooit naar PO-tabel state. Pagina’s `/rccp` en `/bi` niet stiekem mounten.

**Tech Stack:** React 18, Express, `apiRequest`, Vitest, bestaande `BoardSnapshotCache` / `rccpAnalysisPrefetch` / `biBoardCache`.

**Spec:** `docs/specs/2026-08-26-idle-prefetch-kpi-bi-rccp-design.md`  
Gerelateerd: `docs/specs/2026-08-25-rccp-kpi-cards-design.md` (board-kpis mét details).

## Global Constraints

- UI Engels; geen nieuwe user-visible copy.
- Componenten ≤ 300 regels; nieuwe logica in `src/utils/` (geen JSX in hooks die alleen prefetch doen is OK).
- Geen `git commit` / `git push` tenzij de gebruiker het vraagt (OTAP local-first).
- `APP_VERSION` patch-bump bij code in `src/` of `server/`.
- Prefetch: geen toast, geen board-`setState`, geen keep-alive van ongebezochte `/rccp`/`/bi`.
- RCCP-prefetch alleen met niet-lege `lastVendor`; nooit alle vendors.
- `time()` rond zware server-reads die al in het pad zitten; nieuwe client-calls via `apiRequest`.
- Tests co-located `.test.js` naast gewijzigde utils/services.

## Specialist-review (niet-onderhandelbaar)

Lees dit blok vóór de taken. Dit is wat een perf/architectuur-review moet afkeuren of goedkeuren.

**Probleem nu:** PO-board `includeDetails: false` → `rememberKpiPoRows` → `/rccp/board-kpis` telt 0. RCCP-pagina vult wél omdat die een details-read doet (of oude React-state houdt).

**Initieel laden:** 0 extra calls tot de tabel zijn eerste succesvolle read heeft gehad én de browser idle is.

**Scroll/typen:** prefetch mag de virtualized table niet rerenderen. Input-events (`keydown`, `wheel`, `pointerdown`, `touchstart`) zetten een quiet-window (bijv. 400 ms) voordat de volgende prefetch-stap start. In-flight HTTP mag door; zware volgende stappen wachten.

**Main thread:** `/rccp/board-kpis` is compact (per-PO map). `/rccp/analysis` mét PO-segmenten kan groter zijn — daarom stap 3, niet stap 1. Geen full PO-details naar de client.

**SQL:** één details-read (`includeChangeDecorations: false`) deelt KPI + RCCP; BI zou idealiter dezelfde `snapshotCache` raken.

**Afkeuren als:** hidden mount van hele pagina’s; prefetch vóór board-paint; alle-vendors analysis; header-only in KPI-cache; `setOrders` vanuit prefetch.

---

### File map

| File | Rol |
|---|---|
| `server/services/BoardSnapshotCache.js` | Weigeren/cachen alleen details-snapshots; helper `snapshotHasDetails` |
| `server/services/BoardSnapshotCache.test.js` | Board-read zonder details mag KPI-read niet verkrachten |
| `server/services/TableDataService.js` ~3774 | `rememberKpiPoRows` alleen als `includeDetails === true` |
| `src/utils/idleWhenQuiet.js` | Idle + input-pauze |
| `src/utils/idleWhenQuiet.test.js` | Fake timers / fake rIC |
| `src/utils/dataPagesPrefetch.js` | Orchestratie 4 stappen, dedupe |
| `src/utils/dataPagesPrefetch.test.js` | Volgorde, skip zonder vendor, fouten slikken |
| `src/utils/biBoardPrefetch.js` | Charts + aggregate → `setBiSeries` / `setBiRevision`; leest eerst PO-vendorfilter-handoff + `/bi/date-filter` voor key-parity |
| `src/utils/biChartFetchKey.js` | Gedeelde `chartFetchKey` (uit `useChartData.js` getrokken) zodat prefetch en echte lezing dezelfde cache-key bouwen |
| `src/hooks/useDataPagesPrefetch.js` | Koppelen aan PO-pagina actief + board geladen |
| `src/hooks/useRccpSplitAnalysis.js` | `getCachedRccpAnalysis` hergebruiken |
| `src/components/layout/AppLayout.jsx` | Optioneel: `onMouseEnter` rail RCCP/BI → `kickDataPagesPrefetch` |
| `src/hooks/usePurchaseOrdersPage.js` of `PurchaseOrdersPageContent.jsx` | Hook aanroepen ná load |
| `src/config/version.js` | Patch bump |

---

### Task 1: KPI-cache weigert header-only snapshots

**Files:**
- Modify: `server/services/BoardSnapshotCache.js`
- Modify: `server/services/BoardSnapshotCache.test.js`
- Modify: `server/services/TableDataService.js` (blok `if (table.key === 'purchase-orders' && parts)`)

**Interfaces:**
- Consumes: `rows` van `dataService.read`
- Produces: `snapshotHasDetails(rows) → boolean`; `rememberKpiPoRows` no-op zonder details

- [ ] **Step 1: Failing tests** in `BoardSnapshotCache.test.js`:

```js
it('negeert een board-snapshot zonder details en doet alsnog een kpi_po_read mét details', async () => {
  mockDataService({
    parts: { syncedAt: 'poison' },
    rows: [{ recordKey: 'PO-1', values: { vendorAccount: 'V1' } }], // geen details
  });
  const { rememberKpiPoRows, contentSignature } = await import('./BoardSnapshotCache');
  rememberKpiPoRows({
    tableKey: 'purchase-orders',
    supplierAccount: null,
    signature: contentSignature({ syncedAt: 'poison' }),
    rows: [{ recordKey: 'PO-1', values: {} }],
  });
  dataService.read.mockResolvedValue({
    rows: [{ recordKey: 'PO-1', details: [{ detailKey: '1', values: {} }], values: {} }],
  });
  const kpi = await readRccpPoRows({
    tableKey: 'purchase-orders',
    revision: 1,
    parts: { syncedAt: 'poison' },
  });
  expect(dataService.read).toHaveBeenCalledWith(expect.objectContaining({
    includeChangeDecorations: false,
  }));
  expect(kpi.rows[0].details).toEqual([{ detailKey: '1', values: {} }]);
});
```

Tweede test: `read` met `includeDetails: false` pad — `rememberKpiPoRows` wordt niet aangeroepen vanuit TableDataService (spy of: na een mock board-remember zonder details blijft `readRccpPoRows` een verse read doen). Minimaal de cache-helper testen; TableDataService-wijziging is een `if (includeDetails)` rond het bestaande blok.

Let op: dit vereist ook een aanpassing van de bestaande test
`'hergebruikt een warm board-snapshot zonder tweede read()'` in
`BoardSnapshotCache.test.js` (regel 91-101) — de mock-rows daar
(`[{ recordKey: 'PO-SNAP' }]`) hebben geen `details`, en falen dus
op de nieuwe `snapshotHasDetails`-check. Update naar
`rows: [{ recordKey: 'PO-SNAP', details: [] }]`.

- [ ] **Step 2:** Helper:

```js
function snapshotHasDetails(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return true;
  return rows.some((row) => Array.isArray(row.details));
}
```

`rememberKpiPoRows`: return vroeg als `!snapshotHasDetails(rows)`.  
`readRccpPoRows`: snapshotCache-hit en kpiRowCache-hit alleen gebruiken als `snapshotHasDetails`. Anders doorvallen naar `kpi_po_read`.  
Na een geslaagde details-read: `rememberKpiPoRows` én `snapshotCache.set` (zelfde key als `readBoardSnapshot`) zodat BI niet opnieuw full-read.

- [ ] **Step 3:** In `readExecute`, bestaande call vervangen door:

```js
if (table.key === 'purchase-orders' && parts && includeDetails) {
  const { rememberKpiPoRows, contentSignature } = require('./BoardSnapshotCache');
  rememberKpiPoRows({
    tableKey: table.key,
    supplierAccount,
    signature: contentSignature(parts),
    rows: scopedRows,
  });
}
```

- [ ] **Step 4:** `npm test -- server/services/BoardSnapshotCache.test.js`

---

### Task 2: Idle-when-quiet helper

**Files:**
- Create: `src/utils/idleWhenQuiet.js`
- Create: `src/utils/idleWhenQuiet.test.js`

**Interfaces:**
- Consumes: `window.requestIdleCallback` / `setTimeout`, DOM events
- Produces: `runWhenIdleAndQuiet(callback, { idleTimeoutMs = 800, quietMs = 400 }) → { cancel() }`

- [ ] **Step 1: Tests** (jsdom): na `runWhenIdleAndQuiet` + fake idle fire, callback 1×; na `wheel` vóór idle, callback nog niet; na `quietMs` zonder events wél. `cancel()` voorkomt latere run. Fallback: als geen `requestIdleCallback`, `setTimeout(idleTimeoutMs)`.

- [ ] **Step 2: Implementatie**

```js
const INPUT_EVENTS = ['keydown', 'wheel', 'pointerdown', 'touchstart'];

export function runWhenIdleAndQuiet(callback, options = {}) {
  const idleTimeoutMs = options.idleTimeoutMs ?? 800;
  const quietMs = options.quietMs ?? 400;
  let cancelled = false;
  let idleId = null;
  let quietTimer = null;

  const armQuietThenRun = () => {
    if (cancelled) return;
    clearTimeout(quietTimer);
    quietTimer = setTimeout(() => {
      if (!cancelled) callback();
    }, quietMs);
  };

  const onInput = () => {
    if (cancelled) return;
    clearTimeout(quietTimer);
    // opnieuw idle+quiet; in-flight HTTP wordt niet afgebroken (caller bepaalt stappen)
    scheduleIdle();
  };

  function scheduleIdle() {
    if (cancelled) return;
    const ric = typeof requestIdleCallback === 'function' ? requestIdleCallback : null;
    if (ric) {
      idleId = ric(armQuietThenRun, { timeout: idleTimeoutMs });
    } else {
      idleId = setTimeout(armQuietThenRun, idleTimeoutMs);
    }
  }

  INPUT_EVENTS.forEach((type) => window.addEventListener(type, onInput, { passive: true }));
  scheduleIdle();

  return {
    cancel() {
      cancelled = true;
      clearTimeout(quietTimer);
      if (typeof cancelIdleCallback === 'function' && idleId != null) cancelIdleCallback(idleId);
      else clearTimeout(idleId);
      INPUT_EVENTS.forEach((type) => window.removeEventListener(type, onInput));
    },
  };
}
```

Let op: bij `requestIdleCallback` is `idleId` een rIC-handle, bij fallback een timeout-id — `cancel` moet beide paden aankunnen (flag `usedRic`).

- [ ] **Step 3:** `npm test -- src/utils/idleWhenQuiet.test.js`

---

### Task 3: dataPagesPrefetch-orchestratie

**Files:**
- Create: `src/utils/dataPagesPrefetch.js`
- Create: `src/utils/dataPagesPrefetch.test.js`
- Create: `src/utils/biBoardPrefetch.js` (klein, of in hetzelfde bestand als BI-stuk < 80 regels)
- Create: `src/utils/biChartFetchKey.js` — `chartFetchKey(chart, inheritedFilters, dataRevision, dateFilter)` geëxtraheerd uit `src/components/bi/hooks/useChartData.js`; beide bestanden importeren dezelfde functie (geen kopie)
- Modify: `src/components/bi/hooks/useChartData.js` — lokale `chartFetchKey` vervangen door de import uit `biChartFetchKey.js`
- Modify: `src/utils/rccpAnalysisPrefetch.js` — geen API-wijziging nodig als we `prefetchRccpAnalysis` hergebruiken
- Modify: `src/hooks/useRccpSplitAnalysis.js` — cache hergebruiken zoals `useRccpPage`

**Interfaces:**
- Consumes: `getPoBoardKpis`, `prefetchRccpAnalysis`, `apiRequest`, `setBiSeries`, `setBiRevision`, de gedeelde `chartFetchKey` uit `biChartFetchKey.js` (**niet** losstaand in `useChartData.js` laten staan — dat is precies de duplicatie die een cache-key-mismatch veroorzaakt), `readPoFilterByColumnForRccp` (`src/utils/poVendorFilterHandoff.js`), `resolveDefaultRccpVendor`/`resolveRccpVendorFromFilter` (`src/components/rccp/resolveRccpVendorFilter.js`), `useRccpVendorOptions` (voor `vendorColumnKey`)
- Produces: `startDataPagesPrefetch({ refreshKey, lastVendor, isoWindow }) → Promise<void>`; `preloadDataPageChunks()`; interne dedupe-key

- [ ] **Step 1: Tests** met `vi.mock('../utils/api')` en mocks voor `getPoBoardKpis` / `prefetchRccpAnalysis`:
  - volgorde: board-kpis → chunk import (mock) → analysis alleen als `lastVendor` → daarna bi
  - zonder `lastVendor`: analysis **niet** aangeroepen
  - `getPoBoardKpis` throw → rest slikt, geen throw naar caller
  - tweede `startDataPagesPrefetch` zelfde `refreshKey` doet geen tweede board-kpis (dedupe)
  - `prefetchBiDashboard` met een gemockt actief PO-vendorfilter (`readPoFilterByColumnForRccp` → niet-lege waarde): de `POST /bi/aggregate`-payload bevat de bijbehorende `externalFilterByColumn`-filter, en de opgeslagen `setBiSeries`-key matcht een key gebouwd via dezelfde `chartFetchKey`-call als `useChartData` met die filters zou maken
  - `prefetchBiDashboard` met `/bi/date-filter` → `enabled: true`: de aggregate-payload bevat het datumfilter; met `enabled: false` (of request-fout) geen datumfilter

- [ ] **Step 2: Implementatie** — stappen `await` sequentieel (niet parallel), zodat SQL/JSON niet samen pieken:

```js
export async function startDataPagesPrefetch({ refreshKey, lastVendor, isoWindow }) {
  const key = String(refreshKey || '');
  if (inFlightKey === key) return inFlight;
  inFlightKey = key;
  inFlight = (async () => {
    try {
      await getPoBoardKpis(refreshKey);
      await preloadDataPageChunks();
      if (lastVendor && isoWindow) prefetchRccpAnalysis(isoWindow, lastVendor);
      await prefetchBiDashboard();
    } catch {
      /* stil */
    }
  })();
  return inFlight;
}

function preloadDataPageChunks() {
  return Promise.all([
    import('../components/rccp/RccpPage.jsx'),
    import('../components/bi/BiPage.jsx'),
  ]).catch(() => {});
}
```

`prefetchBiDashboard`: bepaalt eerst dezelfde filters als `BiPage` zou gebruiken — anders is de cache-key gegarandeerd anders dan die van `useChartData` en de hele stap een no-op:

1. Vendor: `readPoFilterByColumnForRccp()` → `resolveDefaultRccpVendor({ vendors, vendorNames, filterByColumn })` (vendorlijst via `useRccpVendorOptions`-databron, geen hook nodig buiten React — hergebruik de onderliggende `apiRequest`/cache die die hook al gebruikt) → `externalFilterByColumn` net als in `useBiVendorFilter` (`{ [vendorColumnKey]: { operator: 'equals', value: vendorAccount } }`, of `undefined` bij "all vendors"/supplier).
2. Datumfilter: `apiRequest('/bi/date-filter')` → alleen een `dateRange` meenemen als `dateFilter.enabled` waar is; anders `null` (zelfde als `useBiDateFilter` ongeactiveerd).
3. `apiRequest('/bi/charts')` → max 20 charts → per chart dezelfde `filters`-opbouw als `useChartData` (`chart.config.filters + inheritedFilters + dateFilter-voor-die-chart`) → `POST /bi/aggregate` met `boardKey: 'purchase-orders'`.
4. Resultaat in `setBiRevision(data.revision)` en per chart `setBiSeries(chartFetchKey(chart, inheritedFilters, dataRevision, dateFilterForChart), series)` — met de **gedeelde** `chartFetchKey` uit `biChartFetchKey.js`, dezelfde parameters (inclusief `dataRevision`, standaard `null` zoals `BiPage` die niet meegeeft) als `useChartData` intern gebruikt.

Zonder stap 1-2 (filter-parity) is dit hele stuk verspilde server-load: bij elke gebruiker met een actief PO-vendorfilter of een ingeschakelde BI-datumfilter zou de naïeve variant (geen filters meenemen) een cache-key bouwen die nooit door de echte `/bi`-lezing wordt geraakt.

- [ ] **Step 3:** `useRccpSplitAnalysis.load`: zelfde patroon als `useRccpPage` (`getCachedRccpAnalysis(isoWindow, vendorAccount)` vóór `apiRequest`). Zonder vendor (lege string / all-vendors op de split-tab): **geen** prefetch van all-vendors; bestaande fetch bij tab-open mag blijven.

- [ ] **Step 4:** `npm test -- src/utils/dataPagesPrefetch.test.js src/hooks/useRccpSplitAnalysis.test.js`

---

### Task 4: Trigger op PO-pagina + optioneel rail-hover

**Files:**
- Create: `src/hooks/useDataPagesPrefetch.js`
- Modify: `src/components/supplier/PurchaseOrdersPageContent.jsx` of de plek waar `loading` false wordt (niet in de 1300-regels hook als dat hem over 300 duwt — liever de content-component)
- Modify: `src/components/layout/AppLayout.jsx` — `onMouseEnter` op nav items `rccp` en `bi`
- Modify: `src/config/version.js` — `v1.51.66` (of huidige patch +1)
- Modify: `src/config/devTestItems.js` — 2–3 checks (Engels)

**Interfaces:**
- Consumes: `pageActive` (`usePageActive`), `loading`, `refreshKey`/`dataRevision`, `lastVendor` + `isoWindow` uit `useRccpWindow` (alleen lezen)
- Produces: side effect only

- [ ] **Step 1:** Hook:

```js
export function useDataPagesPrefetch({ enabled, refreshKey }) {
  const pageActive = usePageActive();
  const { isoWindow, lastVendor, loaded: windowLoaded } = useRccpWindow();
  useEffect(() => {
    if (!enabled || !pageActive || !windowLoaded || !refreshKey) return undefined;
    const handle = runWhenIdleAndQuiet(() => {
      startDataPagesPrefetch({ refreshKey, lastVendor, isoWindow });
    });
    return () => handle.cancel();
  }, [enabled, pageActive, windowLoaded, refreshKey, lastVendor, isoWindow]);
}
```

`enabled` = `!loading` na eerste board-success (niet tijdens skeleton).

- [ ] **Step 2:** Rail: `onMouseEnter` op RCCP/BI roept `startDataPagesPrefetch` aan (geen idle-wacht; gebruiker toont intentie). Nog steeds geen pagina-mount.

- [ ] **Step 3:** Testitems, bijv. id `idle-prefetch-kpi-bi-rccp`:
  - Open PO-tabel, wacht ~2s zonder te scrollen, open KPI-tab: tegels hebben cijfers (niet allemaal 0) als Open/Delivered in settings staan.
  - Tijdens snel scrollen/typen in de tabel geen merkbare extra hapering vs. nu.
  - Eerste klik RCCP met last-vendor: grafiek/KPI’s zonder lange lege staat (of alleen korte JS-chunk als prefetch nog liep).

- [ ] **Step 4:** `npm test` (geraakte bestanden) + `npm run build`

---

### Task 5: Handmatige / specialist verificatie

Geen code. Checklist voor reviewer:

- [ ] Network: tot board `200` op `/api/data/purchase-orders` geen `/rccp/board-kpis` of `/rccp/analysis`.
- [ ] Daarna (idle): `/rccp/board-kpis` wél; `/rccp/analysis` alleen met `vendorAccount` query.
- [ ] React profiler / geen extra PO-row commits tijdens prefetch (geen `setOrders`).
- [ ] KPI-tab: waarden ≠ 0 wanneer RCCP-pagina voor dezelfde vendor ook ≠ 0.
- [ ] Capaciteit-tegels op PO-KPI-tab blijven `—`.
- [ ] Navigatie naar `/rccp` en `/bi` mount keep-alive pas bij eerste bezoek (Network: JS-chunk mag al binnen zijn).
- [ ] Scroll 2000-rijen + kolomfilter typen terwijl prefetch loopt: subjectief gelijk aan baseline; bij twijfel `perf-scroll` / HUD `keepalive` niet erger.
- [ ] `perf-review` (modus `regression`) vóór/na op de PO-pagina: deze wijziging raakt het PO-board hot path (nieuwe hook ná `loading=false`) — verplicht per Kwaliteitspoort (CLAUDE.md), niet optioneel bij twijfel. Baseline + na-meting bijvoegen bij de PR.
- [ ] BI-prefetch key-parity in de praktijk: zet een PO-vendor-kolomfilter, wacht op idle-prefetch, open `/bi` — Network toont **geen** nieuwe `POST /bi/aggregate` voor charts die al door de prefetch zijn opgehaald (cache-hit, niet alleen "geen crash").

---

## Zelfcheck t.o.v. spec

| Spec-eis | Taak |
|---|---|
| Board-kpis mét details | Task 1 |
| Geen header-only in cache | Task 1 |
| Idle ná board-paint | Task 2 + 4 |
| Input-pauze | Task 2 |
| Geen board setState | Task 3–4 |
| Geen hidden page mount | Task 4 (niet in KeepAliveDataPages.visited duwen) |
| Alleen lastVendor | Task 3 |
| Split-tab hergebruikt analysis-cache | Task 3 |
| Stil falen | Task 3 |

Geen placeholders. Geen nieuwe SQL-migratie.

---
name: BI-tab en split-screen grafieken
overview: Een nieuwe BI-tab in het linker flyout-menu met een simpele chart-builder (dimensie + numerieke waarde + aggregatie), plus een inklapbaar split-screen op het PO-board waarvan de grafieken de actieve tabelfilters overnemen. Grafieken worden centraal opgeslagen (prive/gedeeld). Scope v1 = staff-only (admin/employee); supplier-BI is een expliciete follow-up.
todos:
  - id: migration
    content: Migratie scripts/db/migrations/024_bi_charts.sql (alleen bi_charts, idempotent IF NOT EXISTS, non-destructief) en uitvoeren op dev + prod
    status: pending
  - id: backend-route
    content: server/routes/bi.js + mount in server.js achter requireRole([ADMIN, EMPLOYEE]); CRUD charts (eigenaar-only mutatie), meta-endpoint
    status: pending
  - id: backend-aggregate
    content: POST /api/bi/aggregate + server/utils/biAggregate.js dat TableDataService.read() hergebruikt en meerdere chart-configs in EEN read verwerkt; time('bi_aggregate') instrumentatie
    status: pending
  - id: number-filters
    content: Numerieke filter-operators toevoegen in usePurchaseOrderTableView + filtermenu + identieke server-side semantiek in biAggregate.js
    status: pending
  - id: nav-route
    content: BI nav-item in AppLayout.jsx (alleen isAdminLike) + lazy route /bi in App.jsx achter AuthGuard allowedRoles ADMIN/EMPLOYEE
    status: pending
  - id: chart-renderer
    content: Herbruikbare ChartRenderer (bar/line/pie/kpi) met recharts (lazy), Fluent-tokens voor kleuren, React.memo
    status: pending
  - id: bi-page
    content: BiPage + BiToolbar + BiDashboardGrid + ChartCard (inline icon-buttons, geen Menu/Popover per kaart) + ChartBuilderPanel + ChartFilterEditor (elk < 300 regels, index.js exports)
    status: pending
  - id: bi-hooks
    content: Hooks in src/components/bi/hooks/ - useBiCharts, useChartData, useChartBuilder
    status: pending
  - id: split-screen
    content: useSplitPane + BoardSplitView + BiChartStrip op PO-board; v1 inklapbaar onderpaneel (toggle), positie in user_board_settings.settings_json; grafieken erven tabelfilters
    status: pending
  - id: starter-examples
    content: Starter-dashboard met voorbeeldgrafieken (KPI totaal, bar per leverancier, line per maand, pie per status)
    status: pending
  - id: version-footer
    content: Versienummer in src/config/version.js verhogen (MINOR)
    status: pending
isProject: false
---

# BI-tab en split-screen grafieken

Best-practice BI-laag bovenop de bestaande Purchase Orders-tabel, met recharts (al aanwezig, v3.9.0). Grafieken zijn herbruikbaar tussen de BI-tab en het split-screen op het board (een centrale definitie, keuze `gedeeld`).

**User story:** Als medewerker/admin wil ik grafieken kunnen bouwen bovenop de inkooporder-data en die naast het board kunnen zien, zodat ik trends en totalen in één oogopslag kan analyseren zonder te exporteren.

### Kernbeslissingen (op basis van jouw antwoorden)
- Aggregatiemodel: **dimensie** (groeperen op willekeurige kolom) + **waarde** (numerieke kolom, `dataType === 'number'`) + **aggregatie** (som/gemiddelde/aantal/min/max).
- Grafiektypes v1: **bar, line, pie, kpi**.
- Opslag: centraal in SQL, **prive per gebruiker met optie tot delen** (`visibility: private | shared`).
- Split-screen: op het PO-board (`/`), v1 een **inklapbaar horizontaal onderpaneel** (toggle); grafieken erven standaard `filterByColumn` uit de tabel.

### Kernbeslissing scope & security (v1) ⭐
De generieke Table-Builder-datalaag (`/api/data/:tableKey` → `TableDataService.read()`, leest uit `tb_cache`) is in de bestaande architectuur **staff-only** (`requireRole(employee/admin)`, zie [server/routes/data.js](server/routes/data.js)). `read()` levert **alle vendors**; er is in die generieke laag geen kolom-notie van `vendorAccount`. Suppliers krijgen hun data via een **ander** pad ([supplier.js](server/routes/supplier.js) → `fetchPurchaseOrders({ supplierAccount })`, live D365, andere shape).

Daarom is BI **v1 = staff-only**:
- Nav-item + `/bi`-route alleen zichtbaar/bereikbaar voor **admin/employee** (`isAdminLike`).
- Alle `/api/bi/*`-routes achter **`requireRole([ROLES.ADMIN, ROLES.EMPLOYEE])`**.
- Aggregatie leest uit `TableDataService.read()` (staff-scope = alle vendors). **Geen** supplier-scoping, **geen** `getSupplierAccount` in v1.
- **Supplier-BI is een expliciete follow-up story** (eigen-data-charts via het D365-supplierpad `fetchPurchaseOrders`, met account-filter) — buiten deze feature. Zo vermijden we een niet-afdwingbaar/ondoordacht scopingmodel bovenop `tb_cache`.

### Architectuur (databaan)
- Builder stelt een `config_json` samen: `{ type, dimension, measure, aggregation, filters, options }`.
- Aggregatie gebeurt **server-side** in een nieuw endpoint `POST /api/bi/aggregate` dat `TableDataService.read()` hergebruikt, filters toepast en chart-ready series teruggeeft. Zo blijft de client licht.
- **`boardKey` → `tableKey`:** de board-key `'purchase-orders'` is identiek aan de `tableKey` in het metamodel (zie [011_tb_metamodel.sql](scripts/db/migrations/011_tb_metamodel.sql), `tb_tables.key = 'purchase-orders'`). `biAggregate.js` gebruikt de key één-op-één als `tableKey` voor `read()`.
- **Geen `bi_dashboards` in v1.** Dashboards vallen buiten scope: grafieken staan los in de BI-tab; de split-screen-strip toont een door de gebruiker geselecteerde subset (chart-ids opgeslagen in `user_board_settings.settings_json`). Een echt dashboard-groeperingsmodel kan een vervolg-story worden.

### Backend

**1. Migratie** `scripts/db/migrations/024_bi_charts.sql` (idempotent, `IF NOT EXISTS`, non-destructief; volgende vrije nummer — 011/017/021/023 zijn al dubbel, dus 024):
- Tabel `dbo.bi_charts`: `id`, `user_id`, `board_key` (default `purchase-orders`), `name`, `config_json NVARCHAR(MAX)`, `visibility NVARCHAR(16)` (`private`/`shared`), `created_at`, `updated_at`.
- **Geen** `bi_dashboards` (zie scope-beslissing). Split-screen-selectie leeft in de bestaande `user_board_settings.settings_json` (JSON in bestaande kolom → geen extra migratie nodig).

**2. Route** `server/routes/bi.js`, gemount in `server/server.js` achter **`requireRole([ROLES.ADMIN, ROLES.EMPLOYEE])`**:
- `GET /api/bi/charts` — eigen prive + alle `shared` grafieken.
- `POST /api/bi/charts`, `PATCH /api/bi/charts/:id`, `DELETE /api/bi/charts/:id` — **alleen de eigenaar** mag muteren (403 anders; server-side gecontroleerd op `user_id`).
- `POST /api/bi/aggregate` — body `{ boardKey, charts: [{ dimension, measure, aggregation, filters }] }`; roept **één** `TableDataService.read({ tableKey: boardKey })` en aggregeert alle meegegeven charts daarover in Node, retourneert `{ results: [{ series: [{ name, value }] }] }`. (Batching voorkomt N volledige board-reads bij een strip met meerdere grafieken.)
- `GET /api/bi/meta/:boardKey` — kolommen + welke `number`-kolommen als measure bruikbaar zijn (hergebruik kolom-metadata uit `read()`).
- Server-side input-validatie (`express-validator`): whitelist `aggregation` (`sum|avg|count|min|max`), `type`, en check dat `dimension`/`measure` bestaande kolomsleutels zijn.

**3. Aggregatie-util** `server/utils/biAggregate.js`: filtert rijen (hergebruik dezelfde operator-semantiek als de tabel, incl. de nieuwe number-operators uit stap 9), groepeert op dimensie en past de aggregatie toe. Getimed met `time('bi_aggregate', ...)` conform de perf-regels. Pure functie (rows in → series out), gescheiden van I/O, zodat unit-testbaar.

### Frontend

**4. Navigatie**: nieuw item in `navItems` in [src/components/layout/AppLayout.jsx](src/components/layout/AppLayout.jsx), **alleen binnen het `isAdminLike`-blok** (`{ id: 'bi', label: 'BI', icon: DataTrending24Regular, path: '/bi' }`), en een **lazy** route in [src/App.jsx](src/App.jsx) binnen `AppLayout`, achter `AuthGuard allowedRoles={[ROLES.ADMIN, ROLES.EMPLOYEE]}`. Recharts blijft zo in een lazy chunk (net als de admin-module nu) en groeit de main-bundle niet.

**5. BI-pagina** `src/components/bi/BiPage.jsx` (orchestrator, < 300 regels) + submap-structuur met `index.js`:
- `BiToolbar.jsx` — chart-select, + New chart, Save.
- `BiDashboardGrid.jsx` — grid van `ChartCard`.
- `ChartCard.jsx` — titel + **inline icon-buttons** `Edit`/`Delete` (met `aria-label`) — **geen `Menu`/`Popover` per kaart** (UI-regel: geen overlay-triggers in herhaalde `.map()`-items).
- `ChartBuilderPanel.jsx` — formulier: type, dimensie (elke kolom), waarde (alleen `number`-kolommen), aggregatie, filters (`ChartFilterEditor`).
- `ChartFilterEditor.jsx` — filter op alle kolommen (operatoren hergebruikt uit `TEXT_FILTER_OPERATORS`/`DATE_FILTER_OPERATORS` en de nieuwe numerieke operators, zie stap 9).
- `ChartRenderer.jsx` — **herbruikbare** recharts-wrapper voor bar/line/pie/kpi (`React.memo`); kleuren via **Fluent-tokens**, geen hardcoded hex.

**6. Hooks** in `src/components/bi/hooks/` (vaste locatie):
- `useBiCharts` — CRUD van chart-definities (data/loading/error, stabiele handlers).
- `useChartData` — haalt aggregatie op via `POST /api/bi/aggregate` (met filters + boardKey), `loading`/`error`. Gebruikt **`apiRequest`** (nooit raw `fetch`).
- `useChartBuilder` — builder-state (type/dimensie/measure/aggregatie/filters), gememoiseerde afgeleide props.

**7. Split-screen op het board (v1 = inklapbaar onderpaneel)**:
- `useSplitPane` hook — paneel open/dicht + hoogte, opgeslagen in `user_board_settings` (nieuwe property in `settings_json`, **geen** nieuwe SQL-kolom).
- `BoardSplitView.jsx` — rendert de bestaande tabel boven en een `BiChartStrip` onder; toggle-knop in de board-toolbar om het paneel te openen/sluiten. (De vrij-versleepbare `role="separator"`-divider met toetsenbord-ondersteuning, naar het model van [ResizableTableHeaderCell.jsx](src/components/supplier/ResizableTableHeaderCell.jsx), is een **vervolg-verbetering**, niet v1.)
- `BiChartStrip.jsx` — toont geselecteerde opgeslagen grafieken (bij voorkeur bar/line in de lage strip); geeft de actuele `filterByColumn` uit `usePurchaseOrderBoardView` door aan `useChartData`, zodat grafieken standaard meebewegen met de tabelfilters.

**8. Numerieke filters (kleine uitbreiding)**: voeg number-operators toe (`=`, `>`, `<`, `>=`, `<=`, `between`) in de filterlaag zodat cijferkolommen zowel in de tabel als in de builder correct filterbaar zijn. Raakt [src/hooks/usePurchaseOrderTableView.js](src/hooks/usePurchaseOrderTableView.js) (nu alleen `TEXT_FILTER_OPERATORS`/`DATE_FILTER_OPERATORS`) en het filtermenu [PurchaseOrderColumnFilterMenu.jsx](src/components/supplier/PurchaseOrderColumnFilterMenu.jsx); server-side **identieke** semantiek in `biAggregate.js`.

**9. Versie-footer**: verhoog het versienummer (MINOR bump, nieuwe feature) in [src/config/version.js](src/config/version.js) conform projectregel.

### Voorbeelden/suggesties die ik meelever (starter-dashboard)
- KPI "Totaal inkoopbedrag" (som van bedrag-kolom).
- Bar "Bedrag per leverancier" (dimensie `vendorAccount`/`vendorName`, som).
- Line "Bedrag per maand" (dimensie datumkolom gegroepeerd per maand, som).
- Pie "Aantal orders per status" (dimensie `status`, aantal).

### Acceptatiecriteria (definitie van klaar)
- **Migratie:** `024_bi_charts.sql` draait idempotent op dev (2× draaien = geen fout); tabel `dbo.bi_charts` bestaat met de genoemde kolommen.
- **Route/auth:** een supplier-sessie krijgt **403** op alle `/api/bi/*`-endpoints; admin/employee krijgen 200. Een niet-eigenaar krijgt 403 op `PATCH`/`DELETE` van andermans chart.
- **Aggregate:** `POST /api/bi/aggregate` met 1..n charts geeft per chart `{ series: [{ name, value }] }`, in **één** board-read (zichtbaar als één `bi_aggregate`-Server-Timing-metric).
- **Nav:** BI-item verschijnt in de sidebar voor admin/employee en is **afwezig** voor de supplier-rol; `/bi` redirect/blokkeert voor niet-staff.
- **BI-pagina:** een nieuwe bar-chart (dimensie + measure + som) is te bouwen, op te slaan (private) en verschijnt na reload; delen (`shared`) maakt hem zichtbaar voor een andere staff-gebruiker.
- **Number-filter:** een `>`-filter op een numerieke kolom werkt identiek in de tabel én in een chart.
- **Split-screen:** toggle opent een onderpaneel met de geselecteerde grafieken; een actief tabelfilter is zichtbaar terug te zien in de grafiek (browser-test op preview-URL).
- **Versie:** `src/config/version.js` is MINOR opgehoogd; footer toont de nieuwe versie.

### Buiten scope (v1)
- **Supplier-BI** (eigen-data-charts via het D365-supplierpad) — expliciete follow-up.
- `bi_dashboards`-groeperingsmodel — grafieken staan los in v1.
- Vrij-versleepbare split-divider (v1 = inklapbaar paneel).
- Area-charts, cross-filtering tussen grafieken onderling, geplande/gemailde rapporten, export naar PDF/Excel.

### Aandachtspunten (projectregels)
- Alle UI-teksten in het **Engels** (recente projectrichting; overschrijft de oudere "Nederlandse labels"-notitie).
- Componenten < 300 regels; logica in hooks, geen JSX in hooks; ≤3 `useEffect`.
- Geen raw `fetch` in frontend — altijd `apiRequest`; recharts-route lazy laden.
- `/api/bi/*` achter `requireRole([ADMIN, EMPLOYEE])`; server-side input-validatie; geen secrets in responses.
- Perf: `time('bi_aggregate')` op de aggregatie; zware client-berekening (indien) via `measure()`.
- Migratie idempotent + non-destructief, in dezelfde PR als de code die de tabel gebruikt; werk op `feature/*`, commit-prefix `feat` + `#AB:<id>`.

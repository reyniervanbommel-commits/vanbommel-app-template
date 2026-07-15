# BI-tab en split-screen grafieken (DevOps)

**Doel:** Een BI-tab met simpele chart-builder (dimensie + numerieke waarde + aggregatie) en een inklapbaar split-screen op het PO-board waarvan de grafieken de actieve tabelfilters overnemen; grafieken centraal opgeslagen (prive/gedeeld), scope v1 = staff-only.
**Referentie in repo:** [.cursor/plans/dev_2026-07-15-bi-tab-split-screen-grafieken.plan.md](../../.cursor/plans/dev_2026-07-15-bi-tab-split-screen-grafieken.plan.md)
**Tags:** bi; charts; recharts; dashboard; full-stack; purchase-orders

---

## User story

**Als** medewerker/admin
**wil ik** grafieken bouwen bovenop de inkooporder-data en die naast het board zien
**zodat** ik trends en totalen in een oogopslag kan analyseren zonder te exporteren.

---

## Acceptatiecriteria (definitie van "klaar")

1. Migratie `024_bi_charts.sql` draait idempotent op dev (2× = geen fout); tabel `dbo.bi_charts` bestaat met de afgesproken kolommen.
2. Een supplier-sessie krijgt **403** op alle `/api/bi/*`-endpoints; admin/employee krijgen 200. Een niet-eigenaar krijgt 403 op `PATCH`/`DELETE` van andermans chart.
3. `POST /api/bi/aggregate` met 1..n charts geeft per chart `{ series: [{ name, value }] }` in **één** board-read (zichtbaar als één `bi_aggregate`-Server-Timing-metric).
4. BI nav-item verschijnt voor admin/employee en is **afwezig** voor supplier; `/bi` blokkeert voor niet-staff.
5. Een bar-chart (dimensie + measure + som) is te bouwen, private op te slaan en verschijnt na reload; delen (`shared`) maakt hem zichtbaar voor een andere staff-gebruiker.
6. Een `>`-filter op een numerieke kolom werkt identiek in de tabel én in een chart.
7. Split-screen-toggle opent een onderpaneel met de geselecteerde grafieken; een actief tabelfilter is zichtbaar terug te zien in de grafiek (browser-test op preview-URL).
8. `src/config/version.js` is MINOR opgehoogd; footer toont de nieuwe versie.

**Kernbeslissing scope & security (v1):** de generieke Table-Builder-datalaag (`/api/data/:tableKey` → `TableDataService.read()`, leest uit `tb_cache`) is staff-only en levert alle vendors; er is geen kolom-notie van `vendorAccount`. Suppliers krijgen data via een ander pad (`fetchPurchaseOrders`, live D365). Daarom is BI **v1 staff-only**: nav + `/api/bi/*` achter `requireRole([ADMIN, EMPLOYEE])`, geen supplier-scoping. Supplier-BI is een aparte follow-up. `boardKey` `purchase-orders` is identiek aan de `tableKey` in het metamodel. Geen `bi_dashboards` in v1.

---

## Wat is al gedaan

_(Nog niets — nieuw plan. recharts v3.9.0 is al aanwezig als dependency.)_

---

## Backlog — child User Stories

### Story A (#219): Backend — bi_charts migratie, BI-route & aggregate
**Beschrijving:** Migratie `scripts/db/migrations/024_bi_charts.sql` (idempotent, non-destructief, alleen `bi_charts`), `server/routes/bi.js` gemount achter `requireRole([ADMIN, EMPLOYEE])` met CRUD (eigenaar-only mutatie) + `GET /api/bi/meta/:boardKey`, en `POST /api/bi/aggregate` + `server/utils/biAggregate.js` dat `TableDataService.read()` hergebruikt en meerdere chart-configs in één read verwerkt. Getimed met `time('bi_aggregate')`. Server-side input-validatie (whitelist aggregation/type, kolomsleutels bestaan).
**Acceptatiecriteria:**
1. Migratie draait 2× zonder fout; `dbo.bi_charts` met de afgesproken kolommen bestaat.
2. Supplier → 403 op alle `/api/bi/*`; admin/employee → 200; niet-eigenaar → 403 op PATCH/DELETE.
3. `POST /api/bi/aggregate` met n charts levert n× `{ series }` in één `read()` (één `bi_aggregate`-metric).
4. Ongeldige aggregation/dimension/measure → 400.

### Story B (#220): Numerieke filter-operators (tabel + server)
**Beschrijving:** Voeg number-operators toe (`=`, `>`, `<`, `>=`, `<=`, `between`) in `src/hooks/usePurchaseOrderTableView.js` (nu alleen TEXT/DATE) en het filtermenu `PurchaseOrderColumnFilterMenu.jsx`, met identieke semantiek server-side in `biAggregate.js`.
**Acceptatiecriteria:**
1. Numerieke kolommen zijn filterbaar met alle zes operators in de tabel-UI.
2. Een `>`-filter geeft in tabel en chart identieke resultaten (client- en server-semantiek gelijk).
3. `between` werkt met twee grenzen; lege/ongeldige invoer breekt niet.

### Story C (#221): BI-pagina, hooks, ChartRenderer & navigatie
**Beschrijving:** Lazy `/bi`-route in `App.jsx` achter `AuthGuard allowedRoles=[ADMIN, EMPLOYEE]` en nav-item in `AppLayout.jsx` binnen het `isAdminLike`-blok. `src/components/bi/`: `BiPage` (orchestrator <300 regels), `BiToolbar`, `BiDashboardGrid`, `ChartCard` (inline icon-buttons, geen Menu/Popover per kaart), `ChartBuilderPanel`, `ChartFilterEditor`, herbruikbare `ChartRenderer` (bar/line/pie/kpi, recharts lazy, Fluent-tokens, `React.memo`). Hooks in `src/components/bi/hooks/`: `useBiCharts`, `useChartData` (`apiRequest`), `useChartBuilder`.
**Acceptatiecriteria:**
1. BI-item zichtbaar voor admin/employee, afwezig voor supplier; `/bi` blokkeert niet-staff.
2. Een bar-chart is te bouwen, private op te slaan en verschijnt na reload; shared is zichtbaar voor andere staff.
3. Recharts zit in een lazy chunk; main-bundle groeit niet merkbaar.
4. Alle componenten < 300 regels; geen JSX in hooks; frontend-calls via `apiRequest`.

### Story D (#222): Split-screen (inklapbaar paneel) op het PO-board
**Beschrijving:** `useSplitPane`-hook (paneel open/dicht + hoogte in `user_board_settings.settings_json`, geen SQL-kolom), `BoardSplitView.jsx` (tabel boven, `BiChartStrip` onder, toggle in board-toolbar) en `BiChartStrip.jsx` die de actuele `filterByColumn` uit `usePurchaseOrderBoardView` doorgeeft aan `useChartData`. v1 = inklapbaar paneel; vrij-versleepbare divider is vervolg.
**Acceptatiecriteria:**
1. Toggle opent/sluit een onderpaneel met geselecteerde grafieken; keuze + hoogte blijven per gebruiker bewaard.
2. Een actief tabelfilter is zichtbaar terug in de grafiek (browser-test op preview).
3. Geen nieuwe SQL-kolom; selectie leeft in `settings_json`.

### Story E (#223): Starter-dashboard & versie-bump
**Beschrijving:** Starter-grafieken (KPI totaal inkoopbedrag, bar bedrag per leverancier, line bedrag per maand, pie aantal orders per status) en MINOR versie-bump in `src/config/version.js`.
**Acceptatiecriteria:**
1. De vier starter-grafieken renderen met echte data op de BI-pagina.
2. `src/config/version.js` is MINOR opgehoogd; footer toont de nieuwe versie.

---

## Versie document

Aangemaakt op basis van [.cursor/plans/dev_2026-07-15-bi-tab-split-screen-grafieken.plan.md](../../.cursor/plans/dev_2026-07-15-bi-tab-split-screen-grafieken.plan.md); wijzig dit bestand bij nieuwe afspraken.

Repo-document: docs/devops/218-bi-tab-split-screen-grafieken.md

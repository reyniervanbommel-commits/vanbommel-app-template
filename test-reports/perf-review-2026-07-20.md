# Performance Review — 2026-07-20

**Modus:** screening + hermeting (nulmeting)
**Omgeving:** local (localhost:5178) — lokale SQL Server, 80 geseede PO-rijen
**Baseline:** nulmeting — vervangt eerdere lege-DB run
**Verdict:** STABIEL (local) — Azure-referentie blijft leidend voor productie-load
**Meetweg:** Playwright headless + hermeting script

- `window.__perf` actief op dev-server
- Login: admin@example.com
- Seed: `node scripts/seed-perf-po-cache.js --orders=80 --lines=3`

---

## 1. Ranglijst

### Hermeting board-load (hard reload 3× mediaan)

| Metriek | Mediaan | Run 1 (koud) | Run 3 (warm) |
|---------|--------:|-------------:|-------------:|
| Wandklok (elapsedWall) | **1779** | 1779 | 1789 |
| `GET /data/purchase-orders` (apiRequest) | **390** | 348 | 399 |
| Server `app` | **95** | 90 | 100 |
| SQL-labels (parallel)* | 391 | 340 | 401 |

\*Gebruik altijd `app` als server-wandklok; label-sommen lopen parallel op.

**Dominante labels (mediaan):** `tb_lookups` 49 ms → `tb_read_details` 33 ms → `tb_sync_state` 31 ms → `tb_read_cols` 30 ms → `tb_ledger` 13 ms → `tb_build_rows` 2 ms

**Δ t.o.v. Azure-referentie (2026-07-19):** server `app` **95 ms** local vs. **740 ms** Azure (−87%) — verwacht door lokale SQL zonder netwerklatentie.

### Overige acties (koud, na login)

| Actie | elapsedWall | app | apiSum | Dominant |
|-------|------------:|----:|-------:|----------|
| Route /rccp | 860 | 179 | 467 | SQL (`rccp_vendor_list`) |
| PO board tab — RCCP | 833 | 5 | 12 | network |
| Route /bi | 837 | 0 | 28 | network |
| PO board tab — Charts | ~120† | — | — | render |

†Charts-tab: geen geconfigureerde grafieken — klik <100 ms (geen recharts-render).

---

## 2. Bevindingen

Gesorteerd op geschatte winst bij productie-data (Azure).

### B1 — PO board-load · geschatte winst ~200–400 ms server (Azure)

- **Gemeten (local hermeting):** server `app` **95 ms**, API **390 ms**, wandklok **1779 ms** (80 PO's, 240 regels)
- **Gemeten (Azure referentie):** server `app` **740 ms** warm — zelfde labels, remote SQL
- **Dominant (Azure):** `tb_ledger` 445 ms → `tb_read_details` 385 ms + `tb_lookups` 423 ms
- **Dominant (local):** `tb_lookups` 49 ms → `tb_read_details` 33 ms — zelfde architectuur, andere latency
- **Plek:** `server/services/TableDataService.js` — `read()` met parallelle SQL-blokken
- **Voorstel:** detail-cache-query optimaliseren; lookup-materialisatie bij sync; ledger-window verkleinen
- **Afweging:** stale indicators vs. minder ledger-SQL

### B2 — Route /rccp · geschatte winst ~300 ms bij gevuld board

- **Gemeten (local):** `app` **179 ms**, `rccp_vendor_list` 40 ms, volledige `tableDataService.read()` opnieuw
- **Referentie (2026-07-19):** ~1084 ms netwerk/API op Azure
- **Plek:** `server/services/RccpAnalysisService.js` — `rccp_po_read` / `rccp_vendor_list`
- **Voorstel:** PO-data delen via revision-cache of smaller scoped read

### B3 — Board-render (80 rijen) · geschatte winst ~800 ms client

- **Gemeten:** wandklok **1779 ms** vs. server `app` **95 ms** → ~**1680 ms** client/render/netwerk-rest
- **Oorzaak:** 80 master-rijen × 3 detailregels DOM; geen virtualisatie-meting in deze run
- **Plek:** `src/components/supplier/PurchaseOrdersBoardTable.jsx`
- **Voorstel:** drilldown met React Profiler bij grotere datasets; virtualisatie evalueren bij >200 rijen

---

## 3. Meetgaten

| Onderdeel | Status |
|-----------|--------|
| Preview-URL / Azure DEV | Niet gemeten — preview.yml triggert alleen op `feature/**` |
| Charts-tab render | Geen grafieken geconfigureerd — geen recharts-meting mogelijk |
| Event Timing total | Alle tab-klikken <100 ms drempel |
| Browser MCP | Niet beschikbaar — Playwright fallback |

---

## 4. Baseline

`test-reports/perf-baseline.json` — **bijgewerkt** met hermeting (80 PO's, local SQL).

Bevat `referenceWithData` (Azure 2026-07-19, app 740 ms) voor regressievergelijking op productie-achtige load.

---

## 5. Aantekeningen

- Seed-script: `scripts/seed-perf-po-cache.js` — herbruikbaar voor lokale perf-runs.
- Local `app` 95 ms is geen regressie t.o.v. Azure 740 ms — andere database-locatie.
- Volgende hermeting: **DEV Container App** (Azure SQL + echte PO-volume) voor representatieve nulmeting.
- Charts-tab timeout in oude screening (20 s wachten op recharts) opgelost in `playwright/perf-screening.js`.

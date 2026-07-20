# Performance Review — 2026-07-20

**Modus:** screening (nulmeting)
**Omgeving:** local (localhost:5178) — lege lokale SQL Server, geen netwerklatentie richting Azure
**Baseline:** eerste gestructureerde nulmeting (vorige run 2026-07-19 had Azure-data)
**Verdict:** STABIEL (local) — referentie-board-load nog te hermeten op DEV/preview met data
**Meetweg:** Playwright headless (browser MCP niet beschikbaar)

- `window.__perf` actief op dev-server
- Login: admin@example.com (bootstrap)

---

## 1. Ranglijst

Koude start (eerste navigatie na login). Interactie-total `<100 ms` → geen Event Timing-regel (actie voelt snel). **elapsedWall** = wandklok tot UI klaar.

| Actie | elapsedWall | Δ ref.* | SQL | Backend-ov. | Netwerk | Client | Dominant |
|-------|------------:|--------:|----:|------------:|--------:|-------:|----------|
| Admin tab — Analytics | 980 | — | 0 | 62 | 730 | 0 | network |
| Route /admin | 931 | — | 0 | 28 | 69 | 0 | network |
| Data model tab — Vendors | 904 | — | 0 | 0 | 0 | 0 | render |
| Admin tab — Data model | 897 | — | 0 | 155 | 379 | 0 | network |
| Route /rccp | 844 | −23% app† | 474 | 0 | 229 | 0 | SQL |
| Route /bi | 841 | — | 167 | 0 | 58 | 0 | SQL |
| Route / — Purchase orders | 826 | −87% app‡ | 0 | 0 | 0 | 0 | render |
| Admin tab — Users | 855 | — | 0 | 0 | 0 | 0 | render |
| PO board tab — Charts | — | — | — | — | — | — | **NIET MEETBAAR** |
| PO board tab — RCCP | — | — | — | — | — | — | **NIET MEETBAAR** |

\* Δ t.o.v. `referenceWithData` in baseline (2026-07-19 Azure board-load).
† RCCP lokaal leeg: app 193 ms vs. ~1084 ms netwerk (screening 2026-07-19).
‡ PO board lokaal leeg: geen API-call; referentie app **740 ms** warm (Azure).

Warme herklik (mediaan 3×): alle routes `<830 ms` wandklok — gecachte responses, geen nieuwe Server-Timing.

---

## 2. Bevindingen

Gesorteerd op geschatte winst bij productie-data.

### B1 — PO board-load (referentie) · geschatte winst ~200–400 ms server

- **Gemeten (referentie 2026-07-19):** server `app` **740 ms** warm, **1204 ms** koud
- **Toegerekend aan:** `tb_ledger` 445 ms → `tb_read_details` 385 ms + `tb_lookups` 423 ms parallel
- **Oorzaak:** ~10 parallelle SQL-blokken in `TableDataService.read()`; ledger-window en detail-cache-read zijn kritisch pad
- **Plek:** `server/services/TableDataService.js` (labels `tb_ledger`, `tb_read_details`)
- **Voorstel:** detail-cache-query versmallen; lookup-materialisatie bij sync; ledger-window beperken
- **Afweging:** vandaag niet hergemeten — lokale DB heeft 0 PO-rijen; hermeting vereist DEV/preview met sync

### B2 — Route /rccp · geschatte winst ~300 ms bij gevuld board

- **Gemeten (koud local):** API-som 422 ms, `app` 193 ms; dominant SQL (`rccp_vendor_list`, `tb_lookups`)
- **Toegerekend aan:** `RccpAnalysisService` roept `tableDataService.read()` op via `rccp_po_read` / `rccp_vendor_list`
- **Oorzaak:** volledige board-read voor RCCP-analyse, ook al is PO-data elders geladen
- **Plek:** `server/services/RccpAnalysisService.js`
- **Voorstel:** revision-cache delen of smaller scoped read voor RCCP
- **Afweging:** geheugen vs. invalidatie-logica

### B3 — Admin tab Analytics · geschatte winst ~400 ms

- **Gemeten (koud local):** API-som **792 ms** over 12 calls; dominant netwerk/waterfall
- **Toegerekend aan:** sequentiële admin-API's bij tab-open (geen bundeling)
- **Oorzaak:** elke subresource apart opgehaald; geen `Promise.all`-batch
- **Plek:** admin-tab componenten onder `src/components/admin/`
- **Voorstel:** parallel fetchen waar onafhankelijk; lazy load voor zware tabellen
- **Afweging:** iets complexere loading-state in UI

---

## 3. Meetgaten

| Actie / route | Ongemeten deel | Actie |
|---------------|----------------|-------|
| PO board tabs (Charts, RCCP) | Volledig | Seed/sync PO-data; `BoardSplitView` rendert pas bij `orderCount > 0` |
| Route / — PO board-load | Server-Timing labels | Hermet op DEV/preview na D365-sync |
| Interactie-total | Event Timing `<100 ms` | Normaal voor local; op preview met data verwacht `>100 ms` |
| Browser MCP | Event Timing precisie | `cursor-ide-browser` inschakelen voor drilldown |
| Preview-URL | Netwerklatentie | Meten op preview-container na volgende deploy |

---

## 4. Baseline

`test-reports/perf-baseline.json` — **aangemaakt** (nulmeting 2026-07-20).

Bevat:
- Local empty-DB metingen (cold + warm)
- `referenceWithData` uit 2026-07-19 voor PO board-load (app 740 ms)

Regressiedrempel: > +25% of > +200 ms t.o.v. baseline.

---

## 5. Aantekeningen

- Paginalading na login: TTFB 4 ms, load 414 ms, transfer 1 KB (Vite dev-shell).
- Lokale lege DB maakt alle routes snel; **nulmeting is infrastructuur-baseline**, geen productie-snapshot.
- Volgende stap: hermeting op **DEV/preview met gesynchroniseerde PO-data** voor board-load en tabs.
- Playwright-script robuuster gemaakt (`playwright/perf-screening.js`) — slaat ontbrekende board-tabs netjes over.

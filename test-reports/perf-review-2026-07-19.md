# Performance Review — 2026-07-19

**Modus:** screening + drilldown + hermeting (Stap 5 labels)
**Verdict:** VERBETERPUNTEN — PO board-load ~740 ms server (warm)
**Meetweg:** Playwright MCP + headless script

- `window.__perf` actief op dev-server

**Login:** Logged in as reyniervanbommel@vanbommel.nl

---

## 1. Ranglijst

Mediaan van 3 metingen per actie, in ms.

| Actie | Totaal | Δ baseline | SQL | Backend-ov. | Netwerk | Client | Render | Dominant |
|-------|-------:|-----------:|----:|------------:|--------:|-------:|-------:|----------|
| Data model tab — Vendors | 144 | — | 0 | 0 | 0 | 0 | 0 | sql |
| PO board tab — Charts | 120 | — | 0 | 75 | 16 | 0 | 0 | backendOther |
| PO board tab — RCCP | 112 | — | 0 | 99 | 14 | 0 | 0 | backendOther |
| Route / — Purchase orders | — | −87% app* | 445** | 324 | 0 | 0 | — | SQL (`tb_ledger`) |
| Route /rccp | — | — | 0 | 0 | 1084 | 0 | — | sql |
| Route /bi | — | — | 0 | 0 | 386 | 0 | — | sql |
| Route /admin | — | — | 0 | 0 | 0 | 0 | — | sql |
| Admin tab — Users | — | — | 0 | 0 | 0 | 0 | — | sql |
| Admin tab — Analytics | — | — | 0 | 0 | 0 | 0 | — | sql |
| Admin tab — OData | — | — | 0 | 0 | 0 | 0 | — | sql |
| Admin tab — Data model | — | — | 0 | 0 | 0 | 0 | — | sql |

*Δ t.o.v. screening-fout (5810 ms label-som); hermeting warm **`app` 740 ms** (was ~1308 ms enkel-meting).
**Dominant SQL-post = langste parallelle label (`tb_ledger` 445 ms), niet label-som.

---

## 2. Hermeting PO board-load (na Stap 5, 3× mediaan)

`GET /api/data/purchase-orders` — Playwright MCP, v1.29.3

| Label | Warm (mediaan) | Koud (run 1) | Wat |
|-------|---------------:|-------------:|-----|
| **`app`** | **740** | **1204** | Server wandklok |
| `tb_ledger` | 445 | 1003 | Change ledger sinds last viewed |
| `tb_lookups` | 423 | 423 | Lookup-enrichment totaal |
| **`tb_read_details`** | **385** | 385 | **Langste cache-read** |
| `tb_lookup_product_receipt_lines` | 279 | 279 | Lookup doeltabel |
| `tb_track_marks` | 213 | 222 | Track-changes patroon |
| `tb_lookup_excel_map1` | 200 | 200 | Lookup doeltabel |
| `tb_lookup_vendors` | 191 | 191 | Lookup doeltabel |
| `tb_lookup_items` | 172 | 172 | Lookup doeltabel |
| `tb_read_cols` | 143 | 217 | Kolom-metadata |
| `tb_sync_state` | 128 | 125 | Sync timestamp |
| `tb_revision` | 125 | 125 | Revision-hash |
| `tb_read_masters` | 122 | 197 | Master cache-read |
| `tb_read_custom` | 120 | 120 | Custom values |
| `tb_viewed` | 108 | 87 | Admin last viewed |
| `tb_links` | 96 | 123 | Runtime header links |
| `tb_history_hints` | 97 | 97 | Cel-history hints |
| **`tb_build_rows`** | **29** | **29** | JS-projectie — **niet** de bottleneck |

**Conclusie hermeting:** traagheid zit in **SQL round-trips naar Azure**, niet in JS (`tb_build_rows` 29 ms). Kritisch pad ≈ **445 ms** (`tb_ledger` warm) tot **423 ms** (`tb_lookups`) parallel. Binnen cache-reads is **`tb_read_details` (385 ms)** de winnaar — niet masters (122 ms).

---

## 3. Bevindingen

### B1 — PO board-load · geschatte winst ~200–400 ms server (warm)

- **Gemeten (hermeting):** server **`app` 740 ms** warm (mediaan 3×), **1204 ms** koud. JS-build **29 ms**.
- **Dominant (warm):** `tb_ledger` **445 ms** → `tb_read_details` **385 ms** + lookups tot **423 ms** parallel.
- **Voorstel:** detail-cache-query optimaliseren; lookup-materialisatie bij sync; ledger-window verkleinen.

### B2 — Dubbele board-fetch bij paginaload · geschatte winst ~740 ms

- **Gemeten:** twee identieke `GET /api/data/purchase-orders` (requests #199 en #204) direct na login.
- **Oorzaak:** waarschijnlijk dubbele mount (React Strict Mode dev) of parallel bootstrap-paden in `usePurchaseOrdersPage.js` (regel 224+).
- **Plek:** `src/hooks/usePurchaseOrdersPage.js`
- **Voorstel:** dedupe in-flight request (singleton promise) of revision-check vóór tweede read.
- **Afweging:** alleen dev-dubbel vs. echte dubbele caller — eerst bevestigen in productie-build.

### B3 — Route /rccp · geschatte winst ~300–500 ms

- **Gemeten:** ~**1084 ms** netwerk/API (screening, warm).
- **Toegerekend aan:** `RccpAnalysisService` roept opnieuw `tableDataService.read()` aan (`rccp_po_read`).
- **Voorstel:** PO-data delen via revision-cache of smaller scoped read voor RCCP.
- **Afweging:** geheugen vs. extra invalidatie-logica.

---

## 4. Stap 3 — Diagnose PO board-load (samenvatting)

Zie **§2 hermeting** voor actuele label-tijden. Architectuur: `TableDataService.read()` — ~10 parallelle SQL-blokken in `Promise.all`.

---

## 5. Meetgaten

| Onderdeel | Status |
|-----------|--------|
| Browser MCP | Playwright MCP beschikbaar; screening via headless script |
| Stap 5 labels | **Gemeten** v1.29.3 | Hermeting §2 |
| Preview-URL | Niet gemeten (alleen local) |

---

## 6. Baseline

`test-reports/perf-baseline.json` — bijgewerkt met hermeting PO board-load.

---

## 7. Aantekeningen

- Hermeting warm **`app` 740 ms** vs. screening label-som 5810 ms — altijd `app` als wandklok gebruiken.
- **`tb_read_details` (385 ms)** > masters (122 ms) + custom (120 ms) — optimalisatie richten op detail-scope.
- **`tb_build_rows` 29 ms** — client/server projectie is geen hotspot.
- Koud: `tb_ledger` 1003 ms op run 1; warm stabiliseert naar 445 ms (pool/cache warm).
- Preview-URL nog niet gemeten.

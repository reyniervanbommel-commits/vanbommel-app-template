# Performance Review — 2026-08-28

**Modus:** regression (PO-board + kolomfilter Apply)
**Omgeving:** preview (https://preview-po-board-remarks-sea.graysand-65442c41.northeurope.azurecontainerapps.io) — *niet lokaal*
**Baseline:** aanwezig (2026-07-22, Vendor Portal DEV / lokale seed 80 PO’s) — **niet 1:1 vergelijkbaar** met preview (2811 PO’s, koude cache)
**Verdict:** STABIEL voor de nieuwe remarks-search-actie; board-load niet als regressie van #277 geduid

---

## 1. Ranglijst

Mediaan waar 3 runs ontbreken: één warme Apply + één koude search.

| Actie | Totaal | Δ baseline | SQL | Backend-ov. | Netwerk | Client | Render | Dominant |
|-------|-------:|-----------:|----:|------------:|--------:|-------:|-------:|----------|
| Remarks Apply `q=2e` (warm) | ~370 ms wall* | n.v.t. (nieuwe actie) | 3.0 | 0.4 | ~45 | — | rest | Netwerk/SQL klein |
| Remarks search `q=delay` (eerste) | 107 ms API | n.v.t. | 25.0 | 5.4 | rest | — | — | SQL+netwerk |
| GET `/data/purchase-orders` (koud) | 35960 ms API | niet vergelijkbaar | — | — | — | — | — | bestaande cache-load |

\* Wall ≈ 869 ms inclusief 500 ms settle-wait in het meetscript; effectief ~370 ms tot UI “2 in view”.

Koude start:

| Actie | Koud | Warm |
|-------|-----:|-----:|
| remarks/search API | 107 ms (`delay`, 0 keys) | 48 ms (`2e`, 4 keys) |
| remarks_search_sql | 25 ms | 3 ms |

---

## 2. Bevindingen

Gesorteerd op geschatte winst.

### B1 — Onbegrensde CHARINDEX-scan · geschatte winst onbekend (schaal)

- **Gemeten:** warme search 3 ms SQL op huidige DEV-data; eerste call 25 ms
- **Toegerekend aan:** `remarks_search_sql`
- **Oorzaak:** parameterized `CHARINDEX` over actieve remarks (bewuste keuze, geen Full-Text)
- **Plek:** `server/services/RowRemarksSearchService.js`
- **Voorstel:** later index/FTS als SQL-tijd groeit met dataset
- **Afweging:** migratie/FTS-complexiteit vs. huidige sub-30 ms

Geen extra `apiRequest` per toetsaanslag: search alleen bij Apply + geldige term (2–200). Abort bij query-wissel.

`perf-board-actions` (J7 eerste kolom) niet als volledige Playwright-scout gedraaid: deze diff raakt Remarks-Apply, niet text-style. Remarks-Apply (netwerk+intersectie) is sneller dan J7-baseline `filterApplyMs` 805 ms op een andere journey.

---

## 3. Meetgaten

| Actie / route | Ongemeten deel | Voorgestelde instrumentatie |
|---------------|---------------:|-----------------------------|
| Remarks Apply | Client-intersectie `applyBoardMatchKeys` niet als `measure()` | optioneel `measure('remarks_intersect')` |
| J7/J8 | Geen 3× script-run op eerste kolom | `playwright/perf-board-actions.js` op DEV indien gewenst |
| 3× mediaan Remarks Apply | Slechts 1 schone warme run | herhaal bij twijfel |

Instrumentatie aanwezig: `time('remarks_search_sql')`, `apiRequest` logt `/remarks/search`.

---

## 4. Baseline

`test-reports/perf-baseline.json` — **ongewijzigd**. Preview-koude PO-load (35 s) hoort niet in de lokale-seed-baseline van juli.

Regressiedrempel: > +25% of > +200 ms t.o.v. baseline — niet toegepast op de nieuwe actie.

---

## 5. Aantekeningen

- Preview `min-replicas: 0` → koude start; eerste board-load is geen feature-regressie
- AND met tabfilter: API 4 keys, UI 2 in view (tab had 217 rijen) — verwacht
- Geen perf-pipeline / optimize in deze check

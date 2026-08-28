# Performance Review — 2026-08-28

**Modus:** regression (static only)
**Omgeving:** preview (https://preview-rccp-confirmed-deliv.graysand-65442c41.northeurope.azurecontainerapps.io) — *niet gemeten: login geweigerd*
**Baseline:** niet aanwezig / niet bijgewerkt
**Verdict:** NIET MEETBAAR

---

## 1. Ranglijst

Geen browser-metingen. Preview-login faalde; localhost is niet gestart (projectregel).

---

## 2. Bevindingen (statisch)

### B1 — Planning-date wissel blijft client-side · geen extra round-trip

- **Gemeten:** niet
- **Toegerekend aan:** `applyRccpPlanningDateView` + `applyPlanningDateAbove`
- **Oorzaak:** toggle/label zet alleen board-settings `planningDate`; analysis-fetch bevat geen planningDate
- **Plek:** `src/hooks/useRccpPage.js`, `src/components/rccp/rccpPlanningDateView.js`
- **Voorstel:** geen
- **Afweging:** n.v.t.

### B2 — Matrix-label persist is gedebounced

- **Gemeten:** niet
- **Toegerekend aan:** `useRccpWindow` PATCH 400 ms
- **Oorzaak:** geen PATCH per klik-frame; blob-replace van bestaande settings
- **Plek:** `src/hooks/useRccpWindow.js`
- **Voorstel:** geen

---

## 3. Meetgaten

| Actie / route | Ongemeten deel | Voorgestelde instrumentatie |
|---------------|---------------:|-----------------------------|
| `/rccp` dashboard load | Volledige interactie | Preview-login, daarna 3× vendor-select + matrix-toggle |
| `GET /api/rccp/analysis` | Server-Timing op preview | Zelfde sessie; labels `rccp_po_read` / `rccp_po_segments` / `rccp_kpis` |

---

## 4. Baseline

`test-reports/perf-baseline.json` — ongewijzigd (geen meting).

Regressiedrempel: > +25% of > +200 ms t.o.v. baseline.

---

## 5. Aantekeningen

- Hot path in de diff: matrix-tabel. Geen extra `apiRequest` in de toggle-handler.
- `RccpAnalysisService.js` is 703 regels (service, geen componentregel); bestaande `time()`-labels blijven.
- perf-scroll / perf-board-actions niet aangeroepen (geen PO-board kolommenu / scroll-diff).

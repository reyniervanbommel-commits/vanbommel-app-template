# Performance Review — 2026-09-02

**Modus:** regression (PO-board hot path in de diff)
**Omgeving:** preview https://preview-header-push-line-wri.graysand-65442c41.northeurope.azurecontainerapps.io — **niet ingelogd**
**Baseline:** aanwezig (2026-07-22, `test-reports/perf-baseline.json`) — **niet hermeten**
**Verdict:** NIET MEETBAAR (static only)

---

## 1. Ranglijst

Geen browser-meting. Login op preview faalde; geen `[perf]` / `[api]` / Server-Timing verzameld.

| Actie | Totaal | Δ baseline | Dominant |
|-------|-------:|-----------:|----------|
| Route / PO board-load | — | — | — |
| Header write-back (`correct-all-details`) | — | — | — |
| Bulk fan-out N orders | — | — | — |

---

## 2. Bevindingen (statisch)

### B1 — Sequentiële D365-fan-out per PO · geen board-load impact

- **Gemeten:** niet
- **Toegerekend aan:** `time('tb_correct_all_details')` in `TableDataService.correctAllDetailFields`
- **Oorzaak:** tot 200 sequentiële `correctField`/D365-PATCH’en **na** save, cap + skip-equals. Bulk over geselecteerde headers: N van die POSTs, alleen na dialoogbevestiging.
- **Plek:** `server/services/TableDataService.js` (`tb_correct_all_details`), `src/hooks/usePurchaseOrderBulkEdit.js` (`runBulkUpdate`)
- **Voorstel:** geen; niet op de hot path van board-render
- **Afweging:** staff-actie, niet bij scroll/filter

### B2 — Board-read ongewijzigd

- Geen extra `apiRequest` per zichtbare rij
- `linkedLineValues` blijft rollup; geen details-fetch per header
- Client: skip-equal op `linkedLineValues` is O(selectie), geen loop over alle regels in render

---

## 3. Meetgaten

| Actie / route | Ongemeten deel | Voorgestelde instrumentatie |
|---------------|---------------:|-----------------------------|
| POST `…/correct-all-details` | Browser-duur + Server-Timing in HUD | Al aanwezig: `tb_correct_all_details`; hermeten ná login |
| Board-load na deze feature | Δ vs baseline | Login + 3× hard reload `/` |

Baseline **niet** bijgewerkt (geen mediaan).

---

## 4. Baseline

`test-reports/perf-baseline.json` — ongewijzigd.

---

## 5. Aantekeningen

- Preview toont PERF-HUD op de login-pagina (`VITE_APP_ENV=preview`), maar zonder sessie geen board-acties.
- Buiten scope: `perf-pipeline` / `perf-scroll` (geen scroll-diff).

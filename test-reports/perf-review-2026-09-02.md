# Performance Review — 2026-09-02

**Modus:** regression (PO-board hot path) — **static only**
**Omgeving:** local/preview niet gemeten voor #295; #302 preview niet ingelogd
**Baseline:** aanwezig — **niet hermeten**
**Verdict:** NIET MEETBAAR

---

## 1. Ranglijst

Geen runtime-meting.

---

## 2. Bevindingen

### B1 — Context-updates op elke rij (#295)

- **Oorzaak:** job-state na elke sequentiële D365-PATCH; write-back-cellen hertekenen
- **Plek:** `src/context/BulkWriteBackJobContext.jsx`, `src/hooks/useWriteBackCellLock.js`
- **Afweging:** netwerk >> render zolang D365 sequentieel blijft

### B2 — Sequentiële D365-fan-out per PO (#302)

- **Plek:** `TableDataService.correctAllDetailFields`, bulk `correctAll` blijft blokkerend
- Geen extra board-read per rij

---

## 3. Meetgaten

| Actie / route | Ongemeten deel |
|---------------|----------------|
| Bulk background job | client-loop |
| POST `…/correct-all-details` | HUD na login |

---

## 4. Baseline

`test-reports/perf-baseline.json` — ongewijzigd.

---

## 5. Aantekeningen

- Sequentiële D365 is bewust (rate limits)
- Job overleeft navigatie binnen de SPA; tab-sluiten stopt de lus

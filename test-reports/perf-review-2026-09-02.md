# Performance Review — 2026-09-02

**Modus:** regression (PO-board hot path) — **static only**
**Omgeving:** local (5178) draait v1.52.126 (niet deze branch); preview timeout
**Baseline:** niet hermeten
**Verdict:** NIET MEETBAAR

---

## 1. Ranglijst

Geen runtime-meting. Deze run is statische analyse van de #295-diff.

---

## 2. Bevindingen

### B1 — Context-updates op elke rij · geschatte winst n.v.t. (bewust)

- **Gemeten:** niet gemeten
- **Toegerekend aan:** client render
- **Oorzaak:** `BulkWriteBackJobProvider` zet job-state na elke sequentiële D365-PATCH; alle `useWriteBackCellLock`-cellen hertekenen
- **Plek:** `src/context/BulkWriteBackJobContext.jsx`, `src/hooks/useWriteBackCellLock.js`
- **Voorstel:** acceptabel zolang D365 sequentieel is (netwerk >> render). Virtualisatie ontbreekt al op het board
- **Afweging:** finer-grained context selectors zouden minder cellen raken, extra complexiteit

### B2 — Geen extra API-patroon

- Bulk blijft één `correct`-call per rij via bestaande `apiRequest` / `POST /correct`
- Geen extra fetch in render-loops
- Save-pad ongewijzigd (blokkerend)

---

## 3. Meetgaten

| Actie / route | Ongemeten deel | Voorgestelde instrumentatie |
|---------------|---------------:|-----------------------------|
| Bulk background job | Client-loop duur | optioneel `measure('bulk_writeback_job', …)` rond `runCorrectRows` |
| `POST /correct` | al via `apiRequest` + Server-Timing `app` | geen |

---

## 4. Baseline

Ongewijzigd — geen hermeting.

---

## 5. Aantekeningen

- Sequentiële D365 is bewust (rate limits); 300 rijen blijven minuten werk
- Job overleeft navigatie binnen de SPA; tab-sluiten stopt de lus

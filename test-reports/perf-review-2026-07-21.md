# Performance Review — 2026-07-21

**Modus:** screening (Scout — pipeline v1)
**Omgeving:** Azure DEV Container App
**Profiel:** L (label; seed op Azure DEV DB indien beschikbaar)
**Baseline:** bijgewerkt in `perf-baseline.json`
**Verdict:** BACKLOG GEVULD (3 items)
**Meetweg:** Playwright headless (`playwright/perf-scout.js`)

- `window.__perf`: **actief**
- Login: Logged in as reyniervanbommel@vanbommel.nl
- Frequency: /admin/analytics/page-usage

---

## 1. v1 Journeys (mediaan 3×)

| Journey | Actie | elapsedWall | app | apiSum | Dominant | PO-fetches |
|---------|-------|------------:|----:|-------:|----------|------------|
| J1 | Board-load / | 81 | 489 | 656 | server | 3 |
| J2 | /rccp | — | 0 | 0 | sql | 0 |
| J3 | Terugkeer / | 248 | 87289 | 9152 | server | **0** |

---

## 2. Backlog (priorityScore)

| ID | Journey | Actie | elapsedWall | targetWall | Dominant | priorityScore |
|----|---------|-------|------------:|-----------:|----------|--------------:|
| BL-003 | J3 | Return / after /rccp (duplicate PO-fetch) | 248 | 174 | server | 148 |
| BL-001 | J1 | PO board-load / (hard reload) | 81 | 57 | server | 72 |
| BL-002 | J2 | Route /rccp dashboard load | — | — | sql | 0 |

---

## 3. Artifacts

- `test-reports/perf-backlog.json`
- `test-reports/perf-baseline.json` (profiel L)
- `test-reports/perf-pipeline-state.json` (scout completed)

Scout-only — geen fixes in deze run.

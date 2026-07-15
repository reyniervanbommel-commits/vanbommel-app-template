# RCCP — Rough Cut Capacity Planning (#224)

Plan for Feature #224 and child stories #225–#229.

## Scope

Full-stack RCCP page with capacity storage, Excel import, live PO load analysis, admin settings, supplier read-only scope, tests and documentation.

## Stories

- **A (#225):** Migration `028_rccp_capacity.sql`, `RccpSettingsService`, Admin RCCP tab
- **B (#226):** Capacity CRUD + Excel import (preview/commit + batch record)
- **C (#227):** `RccpAnalysisService` + dashboard matrix/KPI/chart
- **D (#228):** Drill-down panel + `rccpAccess.js` middleware
- **E (#229):** Tests + `docs/guides/RCCP.md` + version bump

## Key files

| Area | Files |
|------|-------|
| SQL | `scripts/db/migrations/028_rccp_capacity.sql` |
| Backend | `server/services/Rccp*.js`, `server/routes/rccp.js`, `server/middleware/rccpAccess.js` |
| Frontend | `src/components/rccp/*`, `src/components/admin/AdminRccpSettings.jsx`, `src/hooks/useRccpPage.js` |
| Tests | `server/utils/isoWeek.test.js`, `server/services/RccpImportService.test.js`, `server/services/RccpAnalysisService.test.js` |
| Docs | `docs/guides/RCCP.md` |

DevOps: `docs/devops/224-rccp-capacity-planning.md`

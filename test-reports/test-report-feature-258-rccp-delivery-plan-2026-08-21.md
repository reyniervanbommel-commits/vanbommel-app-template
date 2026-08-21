# Test report — Feature #258 RCCP Delivery Plan

**Date:** 2026-08-21  
**Branch:** `feature/258-rccp-delivery-plan`  
**Commit:** `ae064d4`  
**Preview:** https://preview-rccp-delivery-plan.graysand-65442c41.northeurope.azurecontainerapps.io  
**Version:** v1.52.0

## Scope

New Delivery plan tab on `/rccp`: settings, `GET /rccp/delivery-plan`, Recharts chart, hover/detail, docs.

## Automated

| Check | Result |
|-------|--------|
| Focused unit tests (isoWeek, keys, settings, mapping, chart model, hook) | Pass (31) |
| Full `npm test` | 937 pass; 1 flake timeout in `useRccpSplitAnalysis` (passes alone) |
| Preview workflow `preview.yml` | Pass |
| `GET /api/health` on preview | `{"status":"ok"}` |
| Login page shows `v1.52.0` | Pass |

## Browser (preview)

| Step | Result |
|------|--------|
| Open preview | Login page, English UI, version v1.52.0 |
| Health | ok |
| Sign in with local bootstrap account | Fail — DEV database rejects that account |
| `/rccp` tab, vendor, chart, hover, settings reload | Not executed (no DEV session) |

## Notes

- Preview uses the shared DEV database; the documented local bootstrap user is not valid there.
- Interactive `/rccp` checks remain on the `devTestItem` checklist after a DEV login.
- Entra redirect registration skipped: this app uses session cookies, not an Entra SPA login.

## Verdict

🟡 Conditional — deploy and automated coverage are green; live chart interaction on preview still needs a DEV account.

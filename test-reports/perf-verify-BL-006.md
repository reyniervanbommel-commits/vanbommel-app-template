# Perf verify — BL-006

**Date:** 2026-07-21  
**Tier:** L4  
**Result:** **PASS**

## Local gates

| Check | Result |
|-------|--------|
| `npm test` | PASS |
| `npm run build` | PASS |

## UX metric (preview)

| Metric | Baseline (DEV) | After (preview) | Δ | Gate (≥30%) |
|--------|---------------:|----------------:|--:|-------------|
| textStyleApplyMs | 10149 | 2000 | −80% | **PASS** |

**Preview URL:** https://preview-perf-pipeline-skills-v1.graysand-65442c41.northeurope.azurecontainerapps.io  
**App version:** v1.30.30

## Adversary

| Scenario | Result |
|----------|--------|
| A1 | PASS (blocking) |
| A5 | PASS (blocking) |

See `test-reports/perf-adversary-BL-006.md`.

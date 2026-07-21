# Adversary — BL-005

**Datum:** 2026-07-21  
**Omgeving:** https://preview-perf-pipeline-skills-v1.graysand-65442c41.northeurope.azurecontainerapps.io

Herhaald `playwright/perf-adversary.js` na L5 deploy (zelfde blocking gates als BL-003/cache).

## Blocking scenarios

| ID | Result | Notes |
|----|--------|-------|
| A1 | PASS | Full PO reads during tab switch ≤2 |
| A5 | PASS | revisionOk; returnFullReads=0 |

## Overall: PASS

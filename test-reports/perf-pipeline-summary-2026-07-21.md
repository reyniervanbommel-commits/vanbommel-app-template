# Perf pipeline summary — 2026-07-21

**runId:** perf-2026-07-21T1258Z  
**runMode:** full  
**status:** running → iteration 1 done (BL-006); backlog not empty  
**Preview:** https://preview-perf-pipeline-skills-v1.graysand-65442c41.northeurope.azurecontainerapps.io

## Fases

| Fase | Resultaat |
|------|-----------|
| Seed M/L | SKIP — lokale SQL firewall naar Azure |
| Scout M+L | OK — top was BL-003, later BL-006 na board-actions |
| Scroll J4 | SKIP — geen scrollable overflow container |
| Board actions J7/J8 | OK — BL-005/006 aangemaakt |
| Loop iter 1 | **BL-006** L4 optimistic text-style — PASS + adversary PASS |
| Preview deploy | FAIL → fix slug in `preview.yml` → SUCCESS |
| Draft PR | created |

## Commits

- `568b002` perf: optimistic text-style + revision cache [BL-006][BL-003]
- `1968dc8` docs: skills scroll/board-actions/full runMode
- `02e3582` fix: preview Container App name sanitization

## Items

| ID | Status | Notes |
|----|--------|-------|
| BL-006 | **done** | textStyleApplyMs 10149→2000 |
| BL-003 | open | L4 applied; duplicatePoFetch=0; wall nog hoog |
| BL-005 | open | filter Apply ~2000–4609 ms |
| BL-001/002 | open | lagere score |

## Volgende iteratie

Architect + fix voor BL-003 (server/API op return) of BL-005 (filter render).

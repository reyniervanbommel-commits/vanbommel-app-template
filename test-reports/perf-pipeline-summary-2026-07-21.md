# Perf Pipeline Summary — 2026-07-21

**Run:** `perf-2026-07-21T1258Z` · `runMode: full` (resume)  
**Branch:** `feature/perf-pipeline-skills-v1.3`  
**PR:** https://github.com/reyniervanbommel-commits/vanbommel-app-template/pull/61  
**Preview:** https://preview-perf-pipeline-skills-v1.graysand-65442c41.northeurope.azurecontainerapps.io  
**App version:** v1.30.32

## Status

`completed` — loop gestopt: hoogste resterende open item (BL-005) na L3+L4 zonder UX-gate; L5 virtualisatie bewust niet gestart in deze run.

## Iteraties

| Iteratie | Item | Resultaat |
|---------:|------|-----------|
| 1 | BL-006 text style | **done** (~10s→optimistic UI; adversary PASS) |
| 2 | BL-003 return board | **done** (0 full PO-reads; A1/A5 PASS) |
| 3 | BL-005 filter Apply | **skipped** (L3+L4; echte time-to-empty ~10.6s → L5 nodig) |

## UX-winsten

| Journey | Metric | Voor → na | Note |
|---------|--------|-----------|------|
| J8 | text style Apply | geblokkeerd op PATCH → optimistic | Cap-meting misleidend |
| J3 | duplicate PO fetch | >0 → **0** | Revision-cache |
| J3 | elapsedWall | — | ~216–384 ms (&lt; skipIf 500) |
| J7 | filter Apply | cap 2000 → gemeten **~10.6 s** | Render/DOM; L5 |

## Open / skipped backlog

| ID | Status | Reden |
|----|--------|-------|
| BL-005 | skipped | Needs L5 virtualization |
| BL-001 | skipped | elapsedWall 86 ms &lt; skipIf 500 |
| BL-002 | skipped | elapsedWall null (meetruis RCCP) |
| BL-004 | skipped | Geen scroll-overflow container |
| BL-006 | done | Eerdere iteratie |
| BL-003 | done | Deze resume |

## Artifacts

- `test-reports/perf-backlog.json`
- `test-reports/perf-pipeline-state.json`
- `test-reports/perf-adversary-BL-003.md`
- `test-reports/perf-verify-BL-003.md` / `BL-005.md`
- `test-reports/perf-user-report-2026-07-21.md`

## Seed / scroll

- Seed SQL: firewall — overgeslagen  
- Scroll J4: geen overflow container — overgeslagen  

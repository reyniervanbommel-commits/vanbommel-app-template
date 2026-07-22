# Perf Pipeline Summary — 2026-07-21 (final)

**Run:** `perf-2026-07-21T1258Z` · `runMode: full`  
**Branch:** `feature/perf-pipeline-skills-v1.3`  
**PR:** https://github.com/reyniervanbommel-commits/vanbommel-app-template/pull/61  
**Preview:** https://preview-perf-pipeline-skills-v1.graysand-65442c41.northeurope.azurecontainerapps.io  
**App version:** **v1.30.33**

## Status

`completed` — volledige cyclus afgerond inclusief L5 (BL-005).

## Iteraties

| Iteratie | Item | Tier | Resultaat |
|---------:|------|------|-----------|
| 1 | BL-006 text style Bold | L3/optimistic | **done** |
| 2 | BL-003 return board / duplicate fetch | L4 cache | **done** (0 full PO-reads; A1/A5 PASS) |
| 3 | BL-005 filter Apply | L3→L4 | fail (time-to-empty ~10.6 s) |
| 4 | BL-005 filter Apply | **L5 window** | **done** (**10611 → 721 ms**, −93%) |

## UX-winsten (gemeten)

| Journey | Metric | Voor | Na | Δ |
|---------|--------|-----:|---:|--:|
| **J7** | filterApplyMs (L) | 10611 | **721** | **−93%** |
| **J8** | textStyleApplyMs (L) | ~10149 | **1073** | **−89%** |
| **J3** | duplicate full PO-reads | ≥1 | **0** | fixed |
| J1 | elapsedWall | 86 | — | skipped (&lt;500 ms) |
| J2 | elapsedWall | null | — | skipped |
| J4 | scroll longframe | — | — | skipped (geen overflow) |

## Skills / meetpaden

| Skill | Gebruikt |
|-------|----------|
| perf-orchestrate | full + resume |
| perf-scout (J1–J3) | ja |
| perf-scroll (J4) | skip (dataset) |
| perf-board-actions (J7/J8) | ja |
| perf-architect / optimize / verify / adversary | ja |
| develop-from-devops preview | ja |

## Code-fixes (kort)

1. **BL-003** — revision behouden bij cache-hit (`usePurchaseOrdersPage`)
2. **BL-006** — optimistic text-style persist
3. **BL-005 L3/L4** — batch Apply + `startTransition` + `useDeferredValue`
4. **BL-005 L5** — `useBoardRowWindow` + slot-flatten + spacers (DOM ≈ viewport)

## Open / later

| Onderwerp | Note |
|-----------|------|
| Scroll J4 | Herhaal met dataset die overflow heeft, of seed M/L |
| Seed script | Lokale SQL-firewall |
| L5 expand/locate | Window tijdelijk uit bij expand/locate |

## Artifacts

- `test-reports/perf-backlog.json`
- `test-reports/perf-pipeline-state.json`
- `test-reports/perf-verify-BL-005.md` / `BL-003.md` / `BL-006` (user)
- `test-reports/perf-adversary-BL-005.md` / `BL-003.md`
- `test-reports/perf-user-report-2026-07-21.md`
- `test-reports/perf-fix-plan-BL-005.json` (L5)

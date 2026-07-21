# Perf Verify — BL-005 (L5)

**Datum:** 2026-07-21  
**Fix:** Viewport window (`useBoardRowWindow`) — alleen zichtbare + overscan slots in DOM  
**Omgeving:** preview v1.30.33  
**URL:** https://preview-perf-pipeline-skills-v1.graysand-65442c41.northeurope.azurecontainerapps.io

## Checklist

| Check | Resultaat |
|-------|-----------|
| Unit tests (window + slots) | **PASS** |
| `npm run build` | **PASS** |
| Preview deploy | **PASS** |
| J7 filterApplyMs (L, median 3×) | **721 ms** (was **10611 ms**) |
| Target −30% vs 10611 | **PASS** (−93%, ≫ 30%) |
| Min gain 50 ms | **PASS** (−9890 ms) |
| functionalInvariants (Apply → empty) | **PASS** (time-to-empty) |
| Adversary A1/A5 | **PASS** (herhaald op preview) |

## Verdict

**PASS** — L5 viewport window lost filter-to-empty unmount-bottleneck.

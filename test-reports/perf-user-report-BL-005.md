# Perf user report — BL-005

**Fix:** L5 viewport window (board rows)  
**Preview:** v1.30.33  
**Verdict:** PASS

## Resultaat

| Metric | Baseline | After |
|--------|---------:|------:|
| filterApplyMs (L) | 10611 | **721** |

Filter Apply (lege match) voelt nu snel i.p.v. ~10 seconden.

## Test

1. Open preview  
2. Kolomfilter met waarde die niets matcht → Apply  
3. Empty state binnen ~1 s

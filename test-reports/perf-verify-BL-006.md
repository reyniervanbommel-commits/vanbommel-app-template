# Perf verify — BL-006

**Date:** 2026-07-21  
**Tier:** L4  
**Result:** PARTIAL PASS (local green; Azure re-measure pending deploy)

## Local gates

| Check | Result |
|-------|--------|
| `npm test` | PASS |
| `npm run build` | PASS |
| functionalInvariants (static) | PASS — optimistic state + coalesced PATCH; error path still via persist |

## UX metric

| Metric | Baseline | After (local) | Gate |
|--------|---------:|--------------:|------|
| textStyleApplyMs | 10149 | pending Azure/preview re-measure | ≥30% reduction |

## Notes

- Local fix: optimistic `setHeaderColumnTextStyles` / `setLineColumnTextStyles` + 200ms coalesced `persistBoardSettings`.
- Includes prior BL-003 revision-cache fix in same commit (same file).
- Scroll scout skipped this run (no overflow container on DEV dataset).

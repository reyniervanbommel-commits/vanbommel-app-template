# Perf Verify — BL-005

**Datum:** 2026-07-21  
**Fix:** L3 batch Apply + startTransition; L4 `useDeferredValue` op filterByColumn  
**Omgeving:** preview v1.30.32

## Checklist

| Check | Resultaat |
|-------|-----------|
| `npm test` / build | **PASS** (L3 commit) |
| J7 time-to-empty (L) | **~10.6 s** (`No rows match the active filters`) |
| Target −30% vs 2000 ms cap-baseline | **FAIL** — echte UX ~10s; L3/L4 raken DOM-unmount niet |
| functionalInvariants | Apply/filter gedrag OK in unit tests |

## Verdict

**FAIL / SKIP** — max attempts (L3→L4) zonder voldoende UX-winst. Volgende stap is **L5 board virtualisatie** (buiten snelle pipeline-iteratie; 1 L5-slot bewaren).

## Note

Eerdere J7=2000 ms was de longframe-**cap**, geen echte duur.

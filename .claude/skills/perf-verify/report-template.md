# Perf Verify — <id>

**Datum:** YYYY-MM-DD  
**Fix-plan:** `test-reports/perf-fix-plan-<id>.json`  
**Tier:** L<n>  
**Commit:** `<hash>`  
**Omgeving:** Azure DEV — `<url>`

## Summary

| Check | Result |
|-------|--------|
| npm test | PASS / FAIL |
| npm run build | PASS / FAIL |
| UX regression (elapsedWall) | PASS / FAIL |
| Server app (informational) | `<ms>` (no gate) |
| Browser feature test | PASS / FAIL |
| Functional invariants | PASS / FAIL |
| **Overall** | **PASS / FAIL** |

## Perf regression

| Journey | Profiel | Baseline ms | After ms | Δ | Verdict |
|---------|---------|------------:|---------:|--:|---------|
| J1 board-load | M | | | | WIN / STABLE / REGRESSION |
| J3 return board | M | | | | |
| … | L | | | | |

## Server metric (informational)

| Journey | Profiel | app baseline | app after | Note |
|---------|---------|-------------:|----------:|------|
| J1 | M | | | no merge gate |

## Functional invariants

| Invariant | Result | Evidence |
|-----------|--------|----------|
| Change indicators remain visible | PASS / FAIL | |
| Supplier scope intact | PASS / FAIL | |

## Browser feature test

- Route tested: `/`
- Console errors: 0 / N
- Screenshot: `playwright/screenshots/perf-verify-<id>.png` (if taken)

## Fail reason (if FAIL)

_Describe regression, missing win, or broken invariant._

## Recommendation

- [ ] Proceed to adversary
- [ ] Revert — escalate tier
- [ ] Blocked — human review

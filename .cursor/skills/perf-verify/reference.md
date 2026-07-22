# Perf Verify — Reference

## Pass/fail matrix

| Check | Blocks push? |
|-------|--------------|
| npm test | Yes |
| npm run build | Yes |
| elapsedWall WIN on M (blast radius) | Yes (need win to proceed) |
| elapsedWall REGRESSION any journey | Yes |
| server `app` | No (informational) |
| functionalInvariants | Yes |
| browser-feature-test console errors | Yes |

## Regression thresholds (from policy)

```
REGRESSION if: Δ > +25% OR Δ > +200 ms (elapsedWall only)
WIN if:        Δ ≤ −50 ms OR Δ ≤ −25%
STABLE:        between — counts as fail (no UX gain)
```

## Profile order

Always measure in order **S → M → L**:

1. **S (80)** — smoke; fail fast on broken build
2. **M (500)** — decisive for UX win
3. **L (2000)** — required when tier ≥ L4 or policy verifyProfiles includes L

## Seed commands

```bash
node scripts/seed-perf-po-cache.js --orders=80
node scripts/seed-perf-po-cache.js --orders=500
node scripts/seed-perf-po-cache.js --orders=2000
```

## Playwright fallback

```bash
set TEST_BASE_URL=https://<azure-dev-url>
node playwright/perf-screening.js
```

## Orchestrator handoff

Return to `perf-orchestrate`:

| Overall | Action |
|---------|--------|
| PASS | → `perf-adversary` |
| FAIL (no win) | revert → `perf-architect` next tier |
| FAIL (regression) | revert → retry (max 2) |
| FAIL (tests) | revert → blocked |

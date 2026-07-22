# Perf Adversary — Scenario Reference

## A1 — Parallel tabs (BLOCKING)

**Doel:** duplicate-read / cache coherency onder parallel navigatie.

```
Context: same browser session
Tab 1: navigate to /
Wait: board visible
Tab 2: navigate to /rccp (new page in context or second tab)
Wait: RCCP loaded
Switch Tab 1 → Tab 2 → Tab 1
```

**Pass signals:**

- Network: geen 2× volledige PO-read zonder revision change
- UI: board data consistent na tab switch
- Console: geen errors

**Fail signals:**

- Identieke `/api/.../purchase-orders` (or tb_read) 2× parallel zonder coalescing
- Stale board na RCCP tab active
- OOM / timeout

---

## A2 — Supplier scope (WARNING)

**Doel:** admin-fix lekt geen admin-only data naar supplier.

```
Login: supplier test account (if available)
Navigate: /
Check: only supplier-scoped PO rows visible
```

**Fail:** PO numbers outside supplier scope visible.

---

## A3 — Hard refresh during load (WARNING)

**Doel:** race / partial cache state.

```
Navigate: /
Immediately: reload (F5) before board fully rendered
Wait: board stable
```

**Fail:** blank board, permanent loading, duplicate rows, console error.

---

## A4 — Quick return within 30s (WARNING)

**Doel:** TTL invalidation — policy says unlimited cross-page, so this should PASS.

```
Load: /
Navigate: /bi (or /rccp)
Within 30s: navigate back to /
```

**Expected (policy Q6):** cache hit — **faster** load, data still correct.

**Fail:** stale data after revision occurred during away period.

---

## A5 — Revision / change indicators (BLOCKING)

**Doel:** cache respects revision invalidation.

```
Load: / with PO that has change indicators
Trigger: revision bump (sync job, seed update, or mock tb_revision change)
Reload or wait for invalidation
```

**Pass:** indicators reflect new revision state.

**Fail:** old indicators persist after known revision change.

---

## Playwright stub

Create `playwright/perf-adversary.js` when implementing first pipeline run.
Minimum structure:

```javascript
// playwright/perf-adversary.js
// Usage: TEST_BASE_URL=... node playwright/perf-adversary.js --plan=BL-001
```

Scenarios return `{ id, pass, notes, blocking }`.

---

## Policy mapping

```json
{
  "adversary": {
    "blockingScenarios": ["A1", "A5"],
    "warningOnlyScenarios": ["A2", "A3", "A4"]
  }
}
```

Only `blockingScenarios` with `pass: false` → overall FAIL.

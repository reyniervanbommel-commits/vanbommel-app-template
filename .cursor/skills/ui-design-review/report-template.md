# UI Design Review: [Feature / component name]

**Date**: [YYYY-MM-DD]
**Reviewer**: Cursor Agent
**Mode**: light / standard / full
**App URL**: [preview or localhost URL]
**Changed files**: [git diff --name-only output or summary]
**Golden reference**: [path from UI_DESIGN_STANDARDS.md §6]

---

## Summary

| Category | Status | Notes |
|----------|--------|-------|
| Static — Fluent & tokens | PASS / FAIL | |
| Static — Forms & layout | PASS / FAIL | |
| Static — Overlays & pitfalls | PASS / FAIL | |
| Browser — visual consistency | PASS / FAIL / SKIPPED | |
| Browser — console | PASS / FAIL / SKIPPED | |

**Verdict**: GOEDGEKEURD / VERBETERPUNTEN / BLOCKER

---

## Static findings

| # | Severity | File | Finding | Standard |
|---|----------|------|---------|----------|
| 1 | BLOCKER / VERBETERPUNT / OK | `path` | Description | § reference |

---

## Browser findings

| # | Severity | Check | Result | Notes |
|---|----------|-------|--------|-------|
| 1 | | Input width | PASS / FAIL | |
| 2 | | Drawer/header anatomy | PASS / FAIL / N/A | |
| 3 | | Overlay z-index / clipping | PASS / FAIL / N/A | |

**Screenshots**: `playwright/screenshots/ui-review-<name>.png`

---

## Comparison with golden reference

| Aspect | Golden reference | This feature | Match |
|--------|------------------|--------------|-------|
| Page maxWidth | | | Yes / No |
| Field + label pattern | | | Yes / No |
| Drawer header/body | | | Yes / No / N/A |
| Header + actions row | | | Yes / No / N/A |

---

## Recommended fixes (priority order)

1. [BLOCKER] …
2. [VERBETERPUNT] …

---

## Limitations

- [ ] Auth: session active / login required / not tested
- [ ] Browser MCP unavailable — static review only
- [ ] Backend-only change — browser checks skipped

---
name: ui-design-review
description: >-
  Review UI code and visuals for Fluent UI v9 design consistency: field widths,
  drawer/flyout anatomy, tokens, overlay patterns, navigation, and golden
  reference components. Supports light mode for small changes. Generates a
  markdown report in test-reports/. Use after building a feature, before PR,
  or when the user asks to review UI design, check design consistency,
  ui-design-review, check de ui, ui controleren, design consistentie,
  fluent ui check, /check-ui, or Fluent UI best practices. Works in Cursor
  and Claude Code (.claude/skills/).
---

# UI Design Review

Review agent-built UI against project standards and Microsoft Fluent 2 / Fluent UI v9 best practices.

**Standards doc:** `docs/guides/UI_DESIGN_STANDARDS.md`
**Checklists:** [checklist.md](checklist.md)
**Report template:** [report-template.md](report-template.md)

> **Claude Code:** slash commands `/check-ui` and `/ui-design-review` invoke this skill.
> **OTAP:** prefer preview URL (same as `develop-from-devops`). Do not start dev servers.
> **Companion skill:** `browser-feature-test` covers functional behaviour; this skill covers **design consistency**.

---

## Runtime: Cursor vs Claude Code

| Step | Cursor | Claude Code |
|------|--------|-------------|
| Static audit | Always | Always |
| Browser audit | cursor-ide-browser MCP | Browser/Playwright tools if available; else **static only** |
| Report | `test-reports/ui-design-review-*.md` | Same |

If browser is unavailable, still complete static audit and golden-reference comparison. Note **"Browser: skipped (static only)"** in the report.

---

## When to use

| Trigger | Mode |
|---------|------|
| Small tweak (≤3 UI files) | **light** — static + 1 screenshot |
| Normal feature | **standard** |
| Layout/shell/theme changes | **full** |
| User says "review UI", "check de ui", "ui controleren", "design consistentie", `/check-ui` | Auto-detect mode |
| No `src/` UI changes | Skip — report "no UI scope" |

Standalone use is supported — no DevOps work item required.

---

## Workflow

Copy and check off:

```
UI Design Review:
- [ ] Step 0: Scope & mode
- [ ] Step 1: Static audit
- [ ] Step 2: Pick golden reference
- [ ] Step 3: Browser audit (if UI changed)
- [ ] Step 4: Report & verdict
```

---

## Step 0 — Scope & mode

1. Detect changed files:
   ```bash
   git diff --name-only HEAD
   git diff --staged --name-only
   ```
2. Filter to `src/` (`.jsx`, `.js`, `.tsx`, `.css` under `src/`).
3. If empty → stop with one-line message: no UI files to review.
4. Select mode per [checklist.md](checklist.md#mode-selection).
5. Resolve test URL:
   - Preview URL from context / DevOps comment / `develop-from-devops` step 6
   - Else ask user OR probe localhost (do not start server):
     ```bash
     curl -s -o /dev/null -w "%{http_code}" http://localhost:5178 2>/dev/null || echo "DOWN"
     ```
6. Map changed paths to routes (same heuristics as `browser-feature-test` step 0).

---

## Step 1 — Static audit

Read `docs/guides/UI_DESIGN_STANDARDS.md` and audit **changed files only**.

Run checks from [checklist.md — Static audit](checklist.md#static-audit-all-modes):

- Fluent v9 imports, `tokens.*`, `Field` wrappers, `maxWidth` on forms
- Drawer header/body/footer anatomy
- Blockers: Tooltip in lists, Dialog inside Menu, Dutch UI strings
- Component size ≤300 lines

Use `Grep`/`Read` on changed files — do not review the entire codebase.

Record each finding with severity: **BLOCKER** / **VERBETERPUNT** / **OK**.

---

## Step 2 — Golden reference

From standards §6, pick the **closest** reference component for the change type:

| Change type | Reference |
|-------------|-----------|
| Admin settings page | `AdminODataSettings.jsx` |
| Flyout / settings drawer | `RccpSettingsFlyout.jsx` + `RccpSettingsForm.jsx` |
| Drill-down panel | `RccpDrillDownPanel.jsx` |
| App navigation | `AppLayout.jsx` |
| Column menu | `purchaseOrderColumnFilterMenuStyles.js` |

Read the reference file(s) and note 3–5 patterns the new code should match (maxWidth, header row, Field usage, drawer parts).

---

## Step 3 — Browser audit

Skip if no browser tools available (common in Claude Code without Playwright). Note "static only" in report.

**Cursor:** use cursor-ide-browser MCP (same as `browser-feature-test`).
**Claude Code:** use Playwright/browser tools if present; otherwise skip this step.

**light:** navigate → snapshot → one screenshot
**standard:** + open overlay/menu/drawer for the feature
**full:** + resize 375×667, dark mode if available

Screenshot path (required by project rules):

```
playwright/screenshots/ui-review-<feature-slug>.png
```

Checks:

| Check | FAIL when |
|-------|-----------|
| Input width | Short-value fields span full content area |
| Drawer anatomy | Missing title, close, or body scroll |
| Overlay clipping | Menu/drawer hidden behind header or logo |
| Console | New JS errors related to changed UI |

Use same auth handling as `browser-feature-test` — stop and report if stuck on login.

Optional: `browser_console_messages` in standard/full mode.

---

## Step 4 — Report & verdict

1. Write report: `test-reports/ui-design-review-<feature-slug>-<YYYY-MM-DD>.md`
2. Use [report-template.md](report-template.md)
3. Verdict rules — [checklist.md — Verdict](checklist.md#verdict):

| Verdict | Meaning |
|---------|---------|
| **GOEDGEKEURD** | Ship-ready from design perspective |
| **VERBETERPUNTEN** | Non-blocking inconsistencies listed |
| **BLOCKER** | Must fix before merge |

4. If **BLOCKER**: list concrete fixes (file + what to change), ordered by priority.
5. Tell user the report path and verdict in chat — keep summary short.

---

## Integration with other skills

| Skill | Relationship |
|-------|----------------|
| `develop-from-devops` modus `full` | Run **before** `browser-feature-test` (step 7a) |
| `browser-feature-test` | Run **after** this for clicks, API, forms behaviour |
| `.claude/team/ui-engineer.md` | Uses same standards for code review |
| `.claude/team/design-lead.md` | Uses same standards for visual review |

---

## Error handling

| Situation | Action |
|-----------|--------|
| No UI files in diff | Stop — nothing to review |
| Server down | Static audit only; note in report |
| Auth blocked | Static audit only; note limitation |
| No golden match | Compare to `AdminODataSettings.jsx` as default admin pattern |

---

## Best practices

- Review **only** changed scope — not the whole app
- Prefer fixing BLOCKERs over debating VERBETERPUNTEN
- Cite standard section (e.g. "§4 Overlays") in findings
- One feature per review run
- For backend-only diffs, refuse politely and suggest `browser-feature-test` if behaviour testing is needed

# UI Design Review — Checklists

Full standards: [docs/guides/UI_DESIGN_STANDARDS.md](../../../docs/guides/UI_DESIGN_STANDARDS.md)

---

## Mode selection

| Mode | When | Static | Browser |
|------|------|--------|---------|
| **light** | ≤3 UI files changed, no new routes | Full static | 1 page + 1 screenshot |
| **standard** | Default | Full static | Target page + open overlays |
| **full** | New layout/shell, many pages, responsive work | Full static | + responsive 375px, dark mode spot-check |

Detect mode automatically:

```
light     → git diff --name-only | grep '^src/' | wc -l  ≤ 3 AND no AppLayout/routing changes
full      → AppLayout, theme, or 5+ UI files changed
standard  → everything else
```

---

## Static audit (all modes)

Run against changed files under `src/` only. Skip if no `src/` changes.

### Package & styling

- [ ] Imports from `@fluentui/react-components` (not `@fluentui/react`)
- [ ] `makeStyles` at module scope; no inline style objects for repeated patterns
- [ ] Colors/spacing use `tokens.*` (flag hex in makeStyles except allowed files)
- [ ] No `!important` in makeStyles
- [ ] No new global CSS for component-specific styling

### Forms

- [ ] Every `Input`/`Dropdown`/`Textarea`/`Combobox` wrapped in `Field` with `label`
- [ ] Field or form root has appropriate `maxWidth` (see standards §2)
- [ ] Validation uses `validationMessage` or `MessageBar`
- [ ] User-visible strings in English

### Overlays

- [ ] Drawers use `DrawerHeader` + `DrawerBody` (+ `DrawerFooter` if actions)
- [ ] No `Dialog` rendered as child of `Menu`/`MenuPopover`
- [ ] No `<Tooltip>` in files that `.map()` over list rows
- [ ] Popover not used where Drawer is appropriate (multi-field form)

### Structure

- [ ] Changed components ≤300 lines
- [ ] Golden reference identified and noted in report

### Static commands (helper)

```bash
# Changed UI files
git diff --name-only HEAD
git diff --staged --name-only

# Quick scans (adjust paths from diff output)
rg "@fluentui/react[^-]" src/
rg "<Tooltip" src/components/<changed-area>/
rg "color: '#" src/components/<changed-area>/
rg "maxWidth" src/components/<changed-area>/
```

---

## Browser audit

**Cursor:** cursor-ide-browser MCP (same as `browser-feature-test`).
**Claude Code:** Playwright/browser tools if available; otherwise skip — static audit still required.

Prefer **preview URL** from OTAP; fallback localhost only if running (do not start server).

### light mode

- [ ] Navigate to target page
- [ ] Screenshot → `playwright/screenshots/ui-review-<feature>.png`
- [ ] Inputs not full viewport width when content is short
- [ ] Page/drawer header visible and consistent

### standard mode

All light checks, plus:

- [ ] Open flyout/drawer/menu if feature adds one
- [ ] Overlay not clipped or hidden behind header/logo
- [ ] Footer button order (primary left) if footer present
- [ ] Console: no new errors

### full mode

All standard checks, plus:

- [ ] Resize 375×667 — no horizontal overflow on target page
- [ ] Toggle dark mode if available — no hardcoded white panels
- [ ] Second screenshot after opening primary overlay

---

## Severity mapping

| Finding | Severity |
|---------|----------|
| Tooltip in list, Dialog in Menu | BLOCKER |
| Missing Field label, Dutch UI string | BLOCKER |
| Input full-width for short field (no maxWidth) | VERBETERPUNT (BLOCKER on admin/settings pages) |
| Hardcoded hex in makeStyles | VERBETERPUNT |
| Drawer missing header | BLOCKER |
| Minor spacing inconsistency | VERBETERPUNT |
| Matches golden reference | OK |

---

## Verdict

| Verdict | Condition |
|---------|-----------|
| **GOEDGEKEURD** | No BLOCKER, ≤2 VERBETERPUNT |
| **VERBETERPUNTEN** | No BLOCKER, ≥3 VERBETERPUNT |
| **BLOCKER** | Any BLOCKER finding |

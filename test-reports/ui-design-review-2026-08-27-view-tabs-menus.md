# UI design review — view tab follow-up (v1.52.7)

**Mode:** standard (static only)  
**Browser:** skipped (static only)  
**Verdict:** pass

## Scope

View-menu group colors, tab context menu (color + prefix/suffix), hover filter card, thicker active underline, Enable sync order, Tabs from column label, >10 tabs warning.

## Checks

| Check | Result |
|-------|--------|
| Fluent tokens, no hardcoded colors in new `makeStyles` | Pass |
| Field `maxWidth` on prefix/suffix (~168px) | Pass |
| Dialogs outside Menu | Pass — affix dialog lives on the tab bar |
| No Fluent `Tooltip` in tab `.map()` | Pass — one shared hover card |
| Hover card background + z-index ≥ 1000 | Pass (`colorNeutralBackground1`, `shadow16`) |
| English UI strings | Pass |
| MessageBar for >10 tabs | Pass |
| Nested Group colors menu | Pass |

## Notes

- Active tab underline is 5px vs 3px inactive.
- Enable sync is the first Column-section action.

# Final check

**Scope:** branch `cursor/po-table-view-tabs-46ae` vs `origin/main` (~50 bestanden) + untracked rommel
**Skills aangeroepen:** ui-design-review, perf-review, security-review (subagent), browser-feature-test, project-cleanup
**Skills ontbraken (fallback):** geen. `perf-scroll` / `perf-board-actions` bestaan; niet gemeten (auth). Geen `perf-pipeline`.

| Onderdeel | Verdict |
|-----------|---------|
| Eigen checks | fix nu — ongebruikte `tabsInGroup` verwijderd; versie v1.52.9 |
| UI | GOEDGEKEURD (static); browser SKIPPED |
| Snelheid | NIET MEETBAAR — perf-review static only |
| Security | geen blockers |
| Browser | AUTH_BLOCKED; unit tests PASS |
| Cleanup | restant follow-up-rapport + md in screenshots-map verwijderd |

**Gedaan:**
- Catalogus: repo `.cursor/skills` + `.claude/skills`; persoonlijk alleen `final-check-feature`
- Bestandsgrootte: UI-components onder 300; hooks SavedViewState 294 (waarschuwing ≥250); `viewTabs.js` util 310 (geen componentregel)
- Tests aanwezig naast utils/hooks; gerelateerde vitest-run groen
- Dialogs buiten Menu; geen Fluent Tooltip in tab-lijst
- Security-review op branch-diff: merge-ready; optionele hardening later
- Cleanup smal: geen hele-repo-opruiming

**Open:**
- Debounce `persistTabSelection`; hover-delay; skip snapshot-setState als extras gelijk
- Client/server `normalizeTabsState` (hex-validatie alleen server)
- Preview-login 401 — E2E/perf hermeten als sessie werkt
- Inline Cancel/Skip-handlers in tab-dialogs

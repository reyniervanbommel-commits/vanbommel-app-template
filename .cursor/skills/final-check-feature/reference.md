# final-check-feature — catalogus en fallbacks

## Catalogus bouwen

Glob `**/SKILL.md` in deze volgorde (wat bestaat, gebruiken):

1. `<repo>/.cursor/skills/`
2. `<repo>/.claude/skills/`
3. `~/.cursor/skills/`
4. `~/.claude/skills/`
5. `~/.agents/skills/`

Lees van elke onbekende skill alleen de frontmatter (`name` + `description`).
Een skill “bestaat” als `name` exact matcht.

| Naam | Extra detectie |
|------|----------------|
| `ui-design-review` | skill |
| `perf-review` | skill |
| `browser-feature-test` | skill |
| `project-cleanup` | skill |
| `security-review` | skill **of** Task-subagent `security-review` |
| `perf-scroll` / `perf-board-actions` | alleen bij matching diff |
| `create-adr` / `add-dev-test-menu-item` | optioneel, zie SKILL.md |

Subagent `security-review`: promptvorm van de omgeving volgen (`Diff: branch changes`
of `uncommitted changes`). Alleen deze diff, geen hele-repo-audit.

## Repo-conventies (optioneel)

Bestaan deze files, dan meenemen; anders negeren:

| Bestand | Betekenis |
|---------|-----------|
| `.cursor/rules/code-kwaliteit.mdc` | 250/300 componentregels |
| `.cursor/rules/app-taal.mdc` | UI-taal (vaak Engels) |
| `.cursor/rules/fluentui-valkuilen.mdc` | geen Tooltip in lijsten |
| `.cursor/rules/kwaliteitspoort.mdc` | deze skill is de uitvoering |
| `src/config/version.js` | PATCH bij code-wijziging |
| `src/config/devTestItems.js` | DEV-checklist |
| `docs/guides/UI_DESIGN_STANDARDS.md` | UI golden path |
| `test-reports/` | rapporten hierheen |

Hot path (voor perf-modus `regression`) als de diff paden raakt zoals:
`*board*`, `*tab*`, `*table*`, `*grid*`, `*list*` in UI, of queries in een list-service.
In dit vendor-portal-repo: PO-board, tab-switch, kolommenu.

## Fallback UI

Geen `ui-design-review`:

- User-visible strings consistent (geen mix NL/EN als de repo één taal eist)
- Geen hardcoded kleuren als er design-tokens zijn
- Formuliervelden begrensd (niet full-bleed voor korte input)
- Overlays niet in een Menu nesten als dat de overlay unmount
- Geen tooltip-per-rij in lange lijsten als de repo die valkuil kent

## Fallback perf

Geen `perf-review`:

- Geen extra fetch/api in een render-loop of per list-item
- Tab/route-wissel: geen onnodige refetch als cache er al is
- Hover/input: geen volledige lijst-rerender zonder memo/debounce
- Nieuwe zware calls: meetpunt als de repo `apiRequest` / `time()` / `measure()` heeft
- Rapport: **static only** — niet doen alsof er gemeten is

## Fallback security

Geen security-review skill/subagent:

- User input gevalideerd (lengte/type) client én server als beide bestaan
- Geen secrets in de diff
- Nieuwe HTTP-routes: auth-middleware als de app sessies/rollen heeft
- SQL: parameters, geen string-concat
- Diff toont geen credentials of `.env`

## Fallback browser

Zonder browser-skill: `npm test` / equivalent als die bestaat; anders handmatige
stappen in het rapport. Server niet starten als een projectregel dat verbiedt.

## Cleanup-scope

Alleen:

- Untracked rommel van deze sessie (`*.log`, debug-dumps)
- Nieuwe files die nergens geïmporteerd worden
- Rapporten die de repo-regel niet in git wil (`test-reports/` uitzondering als
  de skill van de review zelf een rapport daar verwacht — die wél behouden)

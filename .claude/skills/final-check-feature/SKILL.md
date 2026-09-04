---
name: final-check-feature
description: >-
  After finishing a feature or bugfix, run a final quality pass on the git
  diff. Orchestrates ui-design-review, perf-review, security-review,
  browser-feature-test and project-cleanup when those skills exist in the
  current environment; also checks file size, dead code, tests and version.
  Portable across Cursor, Claude Code and other repos. Triggers:
  final-check-feature, final check, revue na feature, klaar met de feature,
  na bugfix controleren, /final-check-feature.
---

# Final check feature

Dirigent ná een feature of bugfix. **Roept bestaande review-skills aan** — verzint geen
tweede UI-, perf- of security-oordeel. Werkt in **elk project**: ontbrekende skills
overslaan met fallback, geen harde Van Bommel-paden.

Geen nieuwe snelheid-skill. Snelheid meten = `perf-review`. Niet `perf-pipeline`
(autonome fix-loop) na elke wijziging.

## Wanneer

- Gebruiker: *final check*, *final-check-feature*, *revue na feature*, *klaar met de
  feature*, *na bugfix controleren*
- Automatisch: einde van `develop-from-devops` (build/full) en vóór klaarmelden van
  ad-hoc werk in app-code
- Slash (Claude Code): `/final-check-feature`

**Niet** bij pure docs/rules zonder `src/` / `server/` / app-equivalent, tenzij de
gebruiker het expliciet vraagt.

## Stap 0 — Scope, schaalniveau en skill-catalogus

1. Diff: `git diff --name-only` tegen de integratiebranch (`main` of `develop` als die
   bestaat), plus unstaged/staged. Alleen die bestanden.
2. Bepaal het **schaalniveau** (zie `.cursor/rules/kwaliteitspoort.mdc` als die bestaat,
   anders onderstaande vuistregel):
   - **Triviaal**: kleine diff (richtlijn <~30 regels, 1-2 bestanden), geen nieuwe
     route/auth/SQL, geen nieuwe UI-flow, geen hot-path-impact (board, tab-switch,
     grote lijst) → alleen Stap 1, Stap 2 t/m 5 overslaan (één regel per stap in het
     rapport: "triviaal — overgeslagen").
   - **Feature / risicovol**: alles wat niet triviaal is, of twijfel → volledige poort
     (Stap 1 t/m 6).
3. Lees [reference.md](reference.md) en bouw de catalogus: welke sibling-skills bestaan
   in dit project of in persoonlijke skill-mappen.
4. Bij feature/risicovol: sla een skill **niet** over omdat die "te zwaar" is. Wel de
   **lichtste modus** die de skill zelf toestaat (bijv. ui-design-review `light`,
   perf-review `regression` vs `screening`).

Kopieer en vink af:

```
Final check:
- [ ] Stap 0: Scope + schaalniveau + catalogus
- [ ] Stap 1: Eigen checks (grootte, dode code, tests, versie, statische snelheid)
- [ ] Stap 2: ui-design-review (of fallback) — alleen bij feature/risicovol
- [ ] Stap 3: perf-review (of fallback) — alleen bij feature/risicovol, geen extra snelheid-skill
- [ ] Stap 4: security-review (of fallback) — alleen bij feature/risicovol
- [ ] Stap 5: browser-feature-test (of fallback) — alleen bij feature/risicovol
- [ ] Stap 6: project-cleanup (alleen deze wijziging)
- [ ] Stap 7: Veilige fixes + kort rapport
```

## Stap 1 — Eigen werk (geen andere skill)

Alleen de **diff**.

| Check | Actie |
|-------|--------|
| Bestandsgrootte | Als de repo een 300-regels-regel heeft (`.cursor/rules/code-kwaliteit.mdc` of vergelijkbaar): waarschuw ≥250, splits ≥300. Anders: waarschuw bij >400 regels in een nieuw/gewijzigd UI-bestand. |
| Dode code | Ongebruikte exports/imports in de diff; restanten van verwijderde UI. |
| Tests | Kernlogica (`**/utils/`, `**/hooks/`, `**/services/`, `**/middleware/`) naast een `*.test.*` als de repo dat patroon al heeft. |
| Versie | Alleen als `src/config/version.js` of een app-footer-versie bestaat: PATCH omhoog als die nog niet mee ging. |
| Statische snelheid | Extra netwerkcalls, werk in loops, ontbrekende memo op dure paden, `setState` op hover/input zonder debounce, PATCH per klik. Geen meting — dat is stap 3. |

Auto-fix nu: ongebruikte import/export, restant-bestanden die niet in git horen. Gedrag (debounce, memo) rapporteren, niet stil wijzigen tenzij triviaal en getest.

## Stap 2 — UI

Als de catalogus `ui-design-review` heeft: **lees die SKILL.md en voer hem uit** op de
diff (de skill kiest light/standard/full).

Geen UI in de diff → overslaan, één regel in het rapport.

Geen skill → [reference.md](reference.md#fallback-ui).

## Stap 3 — Snelheid (`perf-review`)

Als `perf-review` bestaat: **uitvoeren**. Modus:

- Diff raakt board, tab-switch, grote lijst, of vergelijkbare hot path → `regression`
- Anders → `screening` (of static only als er geen browser is)

Niet aanroepen: `perf-orchestrate`, `perf-pipeline`, `perf-optimize`. Die zijn de
autonome fix-straat, geen final check.

`perf-scroll` / `perf-board-actions` alleen als de diff scroll of kolom-acties raakt
én die skills bestaan.

Geen `perf-review` → [reference.md](reference.md#fallback-perf).

## Stap 4 — Security

Als de **security-review subagent** of een `security-review` skill bestaat: aanroepen
op de **diff** (branch of uncommitted), niet alleen bij auth-wijzigingen.

Geen skill/subagent → [reference.md](reference.md#fallback-security).

## Stap 5 — Gedrag in de browser

Als `browser-feature-test` bestaat: uitvoeren op de geraakte flow.

Geen skill / geen browser → functionele checks via tests of HTTP; noteer de beperking.
Start zelf geen server als de repo dat verbiedt.

## Stap 6 — `project-cleanup`

Als de skill bestaat: **alleen artefacten van deze wijziging** (ongebruikte nieuwe
files, eenmalige rapporten die niet mee moeten, debug-logs). Geen hele-repo-opruiming.

Geen skill → zelf dezelfde smalle scan op de diff + untracked.

## Stap 7 — Rapport

Kort, in de taal van de gebruiker (dit project: Nederlands). Geen codevoorbeelden.

```markdown
## Final check

**Scope:** [N bestanden]
**Skills aangeroepen:** …
**Skills ontbraken (fallback):** …

| Onderdeel | Verdict |
|-----------|---------|
| Eigen checks | ok / fix nu / later |
| UI | … |
| Snelheid | … (perf-review, geen extra skill) |
| Security | … |
| Browser | … |
| Cleanup | … |

**Gedaan:** …
**Open:** …
```

Rapportpad als de repo `test-reports/` heeft:
`test-reports/final-check-feature-<slug>-<YYYY-MM-DD>.md`.
Anders: alleen in chat.

BLOCKER uit een aangeroepen skill → eerst fixen, dan opnieuw die skill, dan klaarmelden.

## Optioneel (niet standaard)

| Wanneer | Skill |
|---------|--------|
| Grotere feature, team-bestanden aanwezig | `.claude/team/` review |
| Architectuurkeuze gemaakt | `create-adr` (vragen, tenzij otap-full dat al eist) |
| Push naar gedeelde DEV | `add-dev-test-menu-item` als die config bestaat |

## Relatie tot andere skills

| Skill | Relatie |
|-------|---------|
| `ui-design-review` | Aanroepen, niet nadoen |
| `perf-review` | Aanroepen — dit ís de snelheidscheck |
| `security-review` | Aanroepen (skill of subagent) |
| `browser-feature-test` | Aanroepen |
| `project-cleanup` | Aanroepen, smal |
| `perf-pipeline` | Niet vanuit deze skill |
| `kwaliteitspoort` (rule) | Deze skill voert die poort uit |

## Installatie in andere projecten

Cursor pakt skills uit (eerste hit wint, later overschrijft niet altijd):

1. **Persoonlijk (alle projecten):** kopieer deze map naar
   `~/.cursor/skills/final-check-feature/` (Windows:
   `%USERPROFILE%\.cursor\skills\final-check-feature\`).
   Zelfde map ook in `~/.claude/skills/` en `~/.agents/skills/` voor Claude Code / Codex.
2. **Per repo:** `.cursor/skills/final-check-feature/` en `.claude/skills/final-check-feature/`.

Geen Fluent, geen Azure, geen `version.js` nodig. Ontbrekende conventies = overslaan.

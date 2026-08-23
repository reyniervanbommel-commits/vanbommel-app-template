---
name: review-plan-for-devops
description: >-
  Use when reviewing a feature design or implementation plan before posting to a
  tracker or building — any repo, Cursor or Claude Code. Triggers: "review dit
  plan", "is dit plan klaar voor DevOps", "toets het plan", "plan-check",
  "review-plan-for-devops". Read-only unless the user asks to apply fixes.
---

# Review Plan for DevOps

Poort vóór bord + bouwen. Geen code, geen post naar een tracker. Beoordeelt
of een agent het plan kan bouwen zonder vragen, en of team-review het overleeft.

Geldt in **elk project**. Azure DevOps is één pad, niet het enige.

Kondig aan: `Using review-plan-for-devops to <bestand>`.

**Niet** `grill-me` of `brainstorming` — dit is een review, geen ontdekking.
Ontwerp nog vaag → stuur naar `brd-td-feature-design`.

## Project-detectie

**Te reviewen bestand** (eerste die past): pad van de gebruiker; anders nieuwste
`docs/specs/*-design.md` of `.cursor/plans/*.plan.md` (zonder `dev_`-prefix,
tenzij her-review). Mag het ontwerpbestand (BRD/FRD/TD) of een taakplan zijn.

**Tracker (Lens A):** Azure DevOps MCP → work-item-eisen; `gh` + GitHub-repo →
issue-eisen; geen tracker → Lens A = “staat de user story + AC in het document?”

**Bouwen (Lens B):** `preview.yml` / work item → OTAP-eisen (`develop-from-devops`
vraagt daar niets). Anders: bouwbaar door `executing-plans` (localhost); geen
preview-URL verplicht.

**Team (Lens C):** `.claude/team/` → persona’s. Ontbreekt → vier lenzen inline
(design, security, snelheid, best practice).

**Stack:** `version.js`, `devTestItems.js`, `apiRequest`, Fluent, migratiepad
`scripts/db/migrations/` — alleen eisen als die in **deze** repo bestaan.
UI-taal: projectregel (`app-taal.mdc`); Van Bommel = Engels (negeer NL-eis in
`ui-engineer.md` als die botst).

## Werkwijze

1. Bepaal het bestand. `dev_`-prefix → al op het bord; stop tenzij her-review.
2. Lees volledig; verifieer genoemde paden in de codebase.
3. Lens **0**, daarna A/B/C. Concreet: plek + fix.
4. Uitvoerformaat hieronder. Fixes alleen ná akkoord. Posten = `post-plan-to-devops`.

Read-only tenzij gevraagd.

## Drie petten (altijd)

- 🧑‍💻 **Developer** — klopt het, edge cases, te complex?
- 🏛️ **Architect** — past het in *deze* codebase, welke schuld?
- 🎨 **UI** — snapt de gebruiker het; UI-kit en taal van *dit* project.

---

## Lens 0 — Inhoudelijk (belangrijkst)

Kritische collega. Altijd concrete betere suggesties. Geen afvinken.

**Functioneel:** ontbrekende scenario’s (fout, leeg, overlap, rechten, migratie);
lost het het echte probleem op; past het bij hoe *deze* app vergelijkbare
features doet?

**Pragmatisch:** YAGNI; 80%-eerste versie; hergebruik bestaande code; simpeler
alternatief; fundamenteel andere route.

**Waarde & risico:** complexiteit vs waarde (geen tijd/geld als argument);
risico’s (perf, data, externe systemen) + mitigatie; meetbaar succes.

Suggesties, geen BLOCKER tenzij aantoonbaar fout. Dit blok in de uitvoer is
verplicht en zelden leeg.

---

## Lens A — Vertaalbaar naar het bord

- H1-titel, doel in één zin, user story (Als/wil ik/zodat), toetsbare AC
- Feature vs één story (≥3 deelgebieden → children met eigen AC)
- Tags afleidbaar; “al gedaan” met paden
- Bestandsnaam `YYYY-MM-DD-…` zonder `dev_` als nog niet gepost
- Tracker-specifiek: ADO-velden alleen als ADO het pad is

---

## Lens B — Autonoom bouwbaar

- Geen TBD / open A-of-B (BLOCKER)
- Bestanden/routes/tabellen bij naam; volgorde expliciet
- Schema: nieuwe kolom/tabel → migratie volgens **deze** repo, idempotent, zelfde PR
- Minstens één AC aantoonbaar (browser of endpoint)
- Alleen als aanwezig: `version.js`, `devTestItems.js`, `time()`/`apiRequest`/`measure()`
- OTAP: preview-testbaar. Lokaal: localhost-testbaar is genoeg

---

## Lens C — Team-review

Zelfde set als `develop-from-devops` stap 8 als `.claude/team/` er is
(Dev Lead, Security, Refactor altijd). Anders vier lenzen. Rode vlag:
Tooltip in lijsten; secrets in code; shotgun; hardcoded kleuren als de UI-kit
tokens heeft.

Diepe persona-dispatch: optioneel bij groot/risicovol plan.

---

## Uitvoerformaat

```
# Plan-review — <bestand>

**Feature-type:** <frontend / backend / infra / full-stack>
**Tracker-pad:** <Azure DevOps | GitHub | alleen document>
**Bouw-pad:** <OTAP preview | lokaal>

## Readiness-matrix
| Lens | Status | Belangrijkste bevinding |
|------|--------|-------------------------|
| 0 — Inhoudelijk | ✅/⚠️/❌ | ... |
| A — Bord | ✅/⚠️/❌ | ... |
| B — Bouwbaar | ✅/⚠️/❌ | ... |
| C — Team-review | ✅/⚠️/❌ | ... |

## Inhoudelijke suggesties (Lens 0)
- [🧑‍💻|🏛️|🎨] <observatie> → **Beter:** <alternatief>

## BLOCKERs
1. … → **Fix:** …
(of "Geen blockers")

## Verbeterpunten
- …

## Eindoordeel
🟢 KLAAR — volgende: `post-plan-to-devops` (als tracker) of `develop-from-devops`
🟡 BIJNA — blockers eerst
🔴 NIET KLAAR — …

## Voorgestelde fixes
<plakbare blokken>
```

## Regels

- Lens 0 nooit leeg
- Eén open beslissing = BLOCKER
- Verifieer paden in de repo
- Na 🟢: `post-plan-to-devops` alleen als de gebruiker een bord wil

---
name: review
description: Voer een Van Bommel team review uit op basis van de gewijzigde bestanden.
disable-model-invocation: true
---

# Review

Gebruik deze skill wanneer een branch of wijziging gereviewd moet worden volgens het Van Bommel reviewteam.

## Broninstructie

Deze skill maakt `.claude/commands/review.md` beschikbaar voor Cursor. Lees dat bestand eerst en volg daarna de persona-instructies hieronder.

## Team dispatch

- Altijd: Dev Lead, Security Engineer en Refactor Specialist.
- Bij frontend-wijzigingen: React Architect, UI Engineer en Design Lead.
- Bij backend-wijzigingen: Backend Engineer.
- Bij CI/CD- of deploywijzigingen: Release Manager.

## Persona bestanden

- `.claude/team/dev-lead.md`
- `.claude/team/security-engineer.md`
- `.claude/team/refactor-specialist.md`
- `.claude/team/react-architect.md`
- `.claude/team/ui-engineer.md`
- `.claude/team/design-lead.md`
- `.claude/team/backend-engineer.md`
- `.claude/team/release-manager.md`
- `.claude/team/team-lead.md`

## Werkwijze

1. Bepaal de gewijzigde bestanden op de huidige branch.
2. Lees de relevante persona-bestanden.
3. Review alleen op basis van de branchdiff en repo-context.
4. Geef bevindingen in het outputformaat van de persona.
5. Laat Team Lead de bevindingen synthetiseren.

## Eindoordeel

Gebruik exact een van deze verdicts:

- GROEN GOEDGEKEURD
- GEEL CONDITIONEEL
- ROOD GEBLOKKEERD

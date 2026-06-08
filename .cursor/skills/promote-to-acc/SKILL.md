---
name: promote-to-acc
description: Promoveer develop naar main voor acc/staging deploy volgens de OTAP-flow.
disable-model-invocation: true
---

# Promote to acc

Gebruik deze skill alleen na succesvolle dev-tests en goedgekeurde team review.

## Broninstructie

Deze skill maakt `.claude/commands/promote-to-acc.md` beschikbaar voor Cursor. Lees dat bestand eerst en volg de repositoryregels voor git en PR's.

## Vereisten

- `develop` bevat de goedgekeurde wijzigingen.
- Dev-tests zijn uitgevoerd en akkoord.
- Team Lead verdict is GROEN GOEDGEKEURD.
- Relevante migraties zijn idempotent.

## Werkwijze

1. Controleer lokale status en huidige branch.
2. Update `develop` vanaf origin.
3. Merge `develop` naar `main` met een duidelijke promote-commit.
4. Push `main`.
5. Rapporteer commit hash, branch en verwachte acc/staging deploy-trigger.

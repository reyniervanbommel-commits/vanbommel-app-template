---
name: promote-to-prod
description: Start productie-deploy na acc-goedkeuring en vereiste checks.
disable-model-invocation: true
---

# Promote to prod

Gebruik deze skill alleen wanneer acc/staging is getest en productiepromotie expliciet gevraagd is.

## Broninstructie

Deze skill maakt `.claude/commands/promote-to-prod.md` beschikbaar voor Cursor. Lees dat bestand eerst en volg de beschreven goedkeuringsvoorwaarden.

## Vereisten

- Acc/staging is getest en goedgekeurd.
- Team Lead verdict is GROEN GOEDGEKEURD.
- Database-migraties zijn idempotent en getest op acc.
- De productie-deploy is expliciet gevraagd.

## Werkwijze

1. Start de productie-workflow via de beschikbare GitHub Actions tooling.
2. Wacht op completion als de omgeving dat ondersteunt.
3. Rapporteer workflow run ID, status en relevante deployment-uitkomst.

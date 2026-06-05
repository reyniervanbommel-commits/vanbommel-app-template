# /promote-to-prod — Promoveer naar productie

Voer handmatig uit via GitHub Actions:

```bash
gh workflow run deploy-prod.yml --field confirm=deploy-prod
```

Of via de GitHub UI: Actions → "Deploy naar Productie" → Run workflow → typ "deploy-prod" in het bevestigingsveld.

**Vereisten vóór uitvoering:**
- ACC-omgeving is getest en goedgekeurd
- Team Lead heeft 🟢 GOEDGEKEURD gegeven
- Database-migraties zijn idempotent en getest op ACC

Rapporteer de workflow run ID en wacht op succesvolle completion.

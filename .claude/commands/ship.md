# /ship — Feature afronden en PR aanmaken

Voer de volgende stappen uit zonder te vragen:

1. Check of er uncommitted changes zijn (`git status`)
2. Stage alle gewijzigde bestanden (`git add .`)
3. Commit met prefix `feat:` of `fix:` op basis van de aard van de wijzigingen
4. Push naar de huidige branch (`git push -u origin <branch>`)
5. Maak een PR aan naar `develop`:
   ```
   gh pr create --title "feat: <beschrijving>" --body "Zie docs/devops/ voor acceptatiecriteria." --base develop
   ```
6. Rapporteer de PR-URL

Gebruik dit commando alleen als de feature gereed is en de team review goedgekeurd is.

Promoot de huidige staging branch naar main (productie).

Voer de volgende stappen uit:

1. Controleer of de huidige branch `staging` is via `git branch --show-current`. Als dat niet zo is, stop dan en meld: "Je moet op de staging branch staan om naar productie te promoten. Gebruik eerst /promote-to-acc."

2. Controleer of er uncommitted changes zijn via `git status --porcelain`. Als er wijzigingen zijn, meld dan: "Er zijn uncommitted changes. Commit of stash ze eerst."

3. Vraag expliciet om bevestiging: "Weet je zeker dat je naar PRODUCTIE wilt deployen? (ja/nee)"
   - Als het antwoord niet "ja" is: stop.

4. Pull de laatste wijzigingen van staging:
   ```bash
   git pull origin staging
   ```

5. Switch naar main en merge staging erin:
   ```bash
   git checkout main
   git pull origin main
   git merge staging --no-edit
   ```

6. Push naar main:
   ```bash
   git push origin main
   ```

7. Ga terug naar develop:
   ```bash
   git checkout develop
   ```

8. Meld de gebruiker: "Gepromoot naar productie. GitHub Actions deployt nu naar de Container App vendorportal-prod (https://vendorportal-prod.graysand-65442c41.northeurope.azurecontainerapps.io) — dit duurt ~2-3 minuten."

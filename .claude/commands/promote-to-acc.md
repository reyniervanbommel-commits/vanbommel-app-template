Promoot de huidige develop branch naar staging (acceptatie).

Voer de volgende stappen uit:

1. Controleer of de huidige branch `develop` is via `git branch --show-current`. Als dat niet zo is, stop dan en meld: "Je moet op de develop branch staan om naar acceptatie te promoten."

2. Controleer of er uncommitted changes zijn via `git status --porcelain`. Als er wijzigingen zijn, meld dan: "Er zijn uncommitted changes. Commit of stash ze eerst."

3. Pull de laatste wijzigingen van develop:
   ```bash
   git pull origin develop
   ```

4. Switch naar staging en merge develop erin:
   ```bash
   git checkout staging
   git pull origin staging
   git merge develop --no-edit
   ```

5. Push naar staging:
   ```bash
   git push origin staging
   ```

6. Ga terug naar develop:
   ```bash
   git checkout develop
   ```

7. Meld de gebruiker: "Gepromoot naar acceptatie. GitHub Actions deployt nu naar de Container App vendorportal-acc (https://vendorportal-acc.graysand-65442c41.northeurope.azurecontainerapps.io) — dit duurt ~2-3 minuten."

# /promote-to-acc — Promoveer develop naar main (ACC deploy)

Voer uit zonder te vragen:

1. Zorg dat je op `develop` staat en up-to-date bent:
   ```bash
   git checkout develop && git pull
   ```

2. Merge naar main:
   ```bash
   git checkout main && git pull && git merge develop --no-ff -m "chore: promote develop to main for ACC deploy"
   ```

3. Push main:
   ```bash
   git push origin main
   ```

4. Dit triggert automatisch `deploy-staging.yml` → deploy naar `[APP_NAME]-acc`

5. Rapporteer: commit hash, branch, en wat er getriggerd is.

Gebruik dit commando alleen na succesvolle dev-tests en team review goedkeuring.

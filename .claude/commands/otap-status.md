Toon een overzicht van welke commits in elke OTAP-omgeving zitten.

Voer de volgende git commando's uit en presenteer de resultaten overzichtelijk:

1. Fetch alle branches:
   ```bash
   git fetch origin
   ```

2. Commits die in develop zitten maar nog NIET in staging (wacht op promotie naar acc):
   ```bash
   git log origin/staging..origin/develop --oneline
   ```

3. Commits die in staging zitten maar nog NIET in main (wacht op promotie naar prod):
   ```bash
   git log origin/main..origin/staging --oneline
   ```

4. Laatste commit per omgeving:
   ```bash
   git log origin/develop -1 --format="%h %s (%cr)"
   git log origin/staging -1 --format="%h %s (%cr)"
   git log origin/main -1 --format="%h %s (%cr)"
   ```

Presenteer als:

```
OTAP Status — [huidige datum]

ONTWIKKEL (develop)
Laatste: [commit]
Wacht op promotie naar ACC: [aantal] commits
[lijst van commits]

ACCEPTATIE (staging)
Laatste: [commit]
Wacht op promotie naar PROD: [aantal] commits
[lijst van commits]

PRODUCTIE (main)
Laatste: [commit]
```

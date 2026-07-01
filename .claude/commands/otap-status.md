Toon een overzicht van welke commits in elke omgeving zitten (DEV en PROD).

Voer de volgende git commando's uit en presenteer de resultaten overzichtelijk:

1. Fetch alle branches:
   ```bash
   git fetch origin
   ```

2. Commits die in develop zitten maar nog NIET in main (wacht op promotie naar prod):
   ```bash
   git log origin/main..origin/develop --oneline
   ```

3. Laatste commit per omgeving:
   ```bash
   git log origin/develop -1 --format="%h %s (%cr)"
   git log origin/main -1 --format="%h %s (%cr)"
   ```

Presenteer als:

```
OTAP Status — [huidige datum]

ONTWIKKEL (develop → DEV)
Laatste: [commit]
Wacht op promotie naar PROD: [aantal] commits
[lijst van commits]

PRODUCTIE (main → PROD)
Laatste: [commit]
```

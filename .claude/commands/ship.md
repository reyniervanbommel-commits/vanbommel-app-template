# /ship — Reviewen en pushen naar develop

Voert een volledige team-review uit en pusht daarna naar de huidige branch.

## Stap 1: Controleer huidige branch

Voer uit: `git branch --show-current`

Als de branch `main` is: STOP en zeg:
"Je staat op `main`. Gebruik `/promote-to-prod` voor develop→main, of werk op een feature branch."

## Stap 2: Voer /review uit

Voer de volledige review-flow uit zoals beschreven in `.claude/commands/review.md`.

Als het eindoordeel 🔴 GEBLOKKEERD is: STOP en toon de blockers. Zeg: "Los de blockers op voor je shipt."

## Stap 3: Controleer versienummer

Zoek in de gewijzigde bestanden naar een versienummer in de footer component (zoek op `v\d+\.\d+\.\d+` patroon).

Als het versienummer NIET verhoogd is ten opzichte van de vorige commit: STOP en zeg:
"Verhoog eerst het versienummer in de footer (semantic versioning: MAJOR.MINOR.PATCH)."

## Stap 4: Push via ship script

Voer uit: `node scripts/ship.mjs`

Bevestig: "✅ Gepusht. GitHub Actions deploy gestart."

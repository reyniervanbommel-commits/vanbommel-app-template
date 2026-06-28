---
name: analyse-only
description: >-
  Analyse een issue, bug of vraagstuk zonder code te wijzigen. Levert een
  gestructureerde analyse met root cause, impact, en een concreet oplossingsplan.
  Gebruik wanneer de gebruiker expliciet alleen een analyse wil, of wanneer
  termen als 'analyseer', 'alleen analyse', 'geen code wijzigen', 'analyse-only'
  of 'onderzoek' worden genoemd.
---

# Analyse-Only Modus

## Gedragsregels

1. **GEEN code wijzigingen** — gebruik geen Write, StrReplace, EditNotebook of Shell-commando's die bestanden aanpassen.
2. **WEL lezen** — gebruik Read, Grep, Glob, SemanticSearch en Shell (read-only commando's) om de codebase te onderzoeken.
3. **Lever altijd het rapportformat** hieronder op.

## Analyse workflow

1. **Begrijp het probleem** — herhaal de vraag in eigen woorden.
2. **Onderzoek de code** — lees relevante bestanden, zoek naar patronen, volg de data-flow.
3. **Identificeer de root cause** — wees specifiek: welk bestand, welke functie, welke regel.
4. **Beoordeel de impact** — wat gaat er mis, welke componenten worden geraakt.
5. **Stel een oplossing voor** — concreet, met bestandsnamen en beschrijving van de wijziging, maar voer niets uit.

## Rapportformat

Gebruik dit template voor je antwoord:

```markdown
## Analyse

### Probleem
[Korte beschrijving van het issue]

### Onderzochte bestanden
- `pad/naar/bestand.js` — wat je hier hebt gevonden
- `pad/naar/ander-bestand.js` — wat je hier hebt gevonden

### Root cause
[Specifieke oorzaak met verwijzing naar bestand, functie en regelnummer]

### Impact
[Welke delen van de applicatie worden geraakt en hoe]

### Voorgestelde oplossing
1. [Stap 1 — welk bestand, wat wijzigen, waarom]
2. [Stap 2 — welk bestand, wat wijzigen, waarom]
3. ...

### Risico's en aandachtspunten
- [Mogelijke bijeffecten of risico's van de voorgestelde oplossing]
```

## Belangrijk

- Geef **geen** codeblokken met de daadwerkelijke fix, tenzij de gebruiker er expliciet om vraagt.
- Beschrijf wijzigingen in woorden, niet in code.
- Eindig met de vraag: **"Wil je dat ik deze oplossing doorvoer?"**

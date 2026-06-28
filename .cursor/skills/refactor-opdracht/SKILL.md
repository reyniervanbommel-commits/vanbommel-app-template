---
name: refactor-opdracht
description: >-
  Leid refactoring van JS/TS codebases met gestructureerde analyse, beslisboom,
  en bewezen patronen. Richt zich op testbaarheid, dependency-reductie,
  concern-scheiding en module-grenzen. Bevat React-, Express- en monorepo-patronen.
  Gebruik bij architectuur-verbeteringen, cyclische dependencies, te grote
  componenten, performance-optimalisatie, of wanneer de gebruiker vraagt om
  refactoring, code-splitsing, hook-extractie of module-herstructurering.
---

# Refactor-opdracht

## Agent instructies

1. Lees ALLE referentiebestanden (decision-tree, analysis-commands, checklists, patterns) voordat je begint
2. Voer Fase 1 (Analyse) uit door de commando's uit [analysis-commands.md](analysis-commands.md) te draaien
3. Presenteer het analyse-rapport aan de gebruiker VOORDAT je verder gaat met Fase 2
4. Vraag bevestiging voordat je wijzigingen maakt
5. Gebruik de [prioriteitsmatrix](#prioriteitsmatrix) om te bepalen welke problemen je eerst aanpakt
6. Volg de checklists uit [checklists.md](checklists.md) bij elke fase
7. Gebruik `superpowers:writing-plans` in Fase 3 als de refactor > 3 bestanden of > 1 iteratie raakt
8. Gebruik `superpowers:verification-before-completion` aan het einde van Fase 5 voordat je de branch klaar meldt

## Mindset

Benader elke refactor als een ervaren tech lead:

- **Vraag "waarom" voor je begint** — niet elke code-smell is een probleem.
  Een bestand van 310 regels dat goed leesbaar is, heeft lagere prioriteit
  dan een bestand van 200 regels met 8 useState en 5 useEffect.
- **Weeg kosten tegen baten** — een refactor die 2 uur kost maar alleen
  20 regels bespaart is het niet waard. Focus op meetbare verbetering:
  minder coupling, betere testbaarheid, eenvoudiger onderhoud.
- **Doe geen schade** — liever een imperfecte maar werkende codebase dan
  een "schone" codebase met regressies. Als je twijfelt, laat het.
- **Splits met een reden** — elk nieuw bestand moet een eigen
  verantwoordelijkheid hebben. "Te lang" is geen verantwoordelijkheid.
- **Denk aan de volgende ontwikkelaar** — code moet leesbaar zijn zonder
  de refactor-geschiedenis te kennen. Benoem verhuisde logica duidelijk.
- **Communiceer proactief** — als je een risico ziet, benoem het voordat
  je verder gaat. Stel vragen bij onduidelijke requirements.

## Doel

Verbeter de interne kwaliteit van een codebase door:
- **Testbaarheid**: pure logica scheiden van side-effects
- **Coupling verlagen**: expliciete, smalle interfaces tussen modules
- **Complexiteit reduceren**: kleinere eenheden met één verantwoordelijkheid
- **Cyclische dependencies elimineren**: eenrichtingsverkeer in de dependency-graph

Geen cosmetische wijzigingen; elke refactor moet een concreet, meetbaar probleem oplossen.

## Beslisboom (quick-ref)

Gebruik [decision-tree.md](decision-tree.md) voor het volledige overzicht. Samenvatting:

| Signaal | Refactor-type |
|---------|---------------|
| Component > 300 regels | Component splitting |
| 5+ useState in component | Hook extractie |
| Cyclische imports | Module herstructurering |
| Mixed concerns in route handler | Middleware/repository extractie |
| Herhaalde logica over apps | Shared package |
| Trage renders / onnodige re-renders | Memoization / lazy loading |

## Werkwijze

### Fase 1: Analyse

Voer de geautomatiseerde analyse uit (zie [analysis-commands.md](analysis-commands.md)):
1. Scan bestandsgroottes
2. Tel state-variabelen per component
3. Detecteer circulaire dependencies
4. Identificeer hotspots (hoge complexiteit)
5. Breng import-relaties in kaart

**Minimale fallback (als analysis-commands.md niet laadt):**
```powershell
# Bestandsgroottes boven 200 regels
Get-ChildItem -Recurse -Include *.js,*.jsx,*.ts,*.tsx -Exclude node_modules | ForEach-Object { $lines = (Get-Content $_.FullName | Measure-Object -Line).Lines; if ($lines -gt 200) { [PSCustomObject]@{Lines=$lines; File=$_.Name} } } | Sort-Object Lines -Descending
# useState hotspots
rg -c "useState" --glob "*.{jsx,tsx}" | sort -t: -k2 -rn | head -15
# Circulaire dependencies
npx madge --circular src/
```

Lever een dependency-schets op:
```
module A --> module B (side-effect: API call)
module B --> module C (pure)
module C --> module A (cyclisch!)
```

### Fase 2: Scope

1. **Benoem concrete pijnpunten** (max 5 per iteratie)
   - Waar zitten verspreide flows?
   - Welke modules mixen concerns?
   - Welke dependencies zijn cyclisch?

2. **Formuleer als meetbare doelen**
   - "Persistence-logica in een module isoleren"
   - "Component X onder 300 regels brengen"
   - "Circulaire dependency A-B-C elimineren"
   - Niet: "betere code" of "opruimen"

### Fase 3: Plan

1. Kies refactor-type via de [beslisboom](decision-tree.md)
2. Selecteer het juiste patroon uit de referentiebestanden
3. Maak een geïsoleerde werkruimte via `superpowers:using-git-worktrees` (branch: `refactor/<korte-beschrijving>`)
4. Doorloop de [pre-flight checklist](checklists.md#pre-flight)
5. Leg het plan vast via `superpowers:writing-plans` als de scope > 3 bestanden raakt

### Fase 4: Uitvoering

Per iteratie (kleine stappen):
1. Kies een verbeterpunt
2. Implementeer de wijziging
3. Verifieer: lint + tests + dependency-graph
4. Documenteer: **probleem -> aanpak -> effect**
5. Commit: `refactor(<scope>): <wat en waarom>`

Doorloop de [per-iteratie checklist](checklists.md#per-iteratie) na elke stap.

### Fase 5: Verificatie

Gebruik `superpowers:verification-before-completion` voordat je de branch klaar meldt voor review.

Doorloop de [post-flight checklist](checklists.md#post-flight). Minimaal:
- Lint slaagt
- Tests slagen
- Build slaagt
- Geen nieuwe circulaire dependencies
- Geen functionele regressies
- Versienummer verhoogd

## Gereed-criteria

| Criterium | Drempel |
|-----------|---------|
| Bestandsgrootte | Zie [regellimieten per bestandstype](#regellimieten-per-bestandstype) |
| State per component | 5-9 useState: overweeg custom hook. 10+: verplicht custom hook |
| JSX nesting | Max 4 niveaus diep |
| Props per component | Max 10 |
| Publieke API per module | Alleen wat consumers daadwerkelijk gebruiken |
| Circulaire dependencies | Nul |
| Functionele regressie | Zelfde input geeft zelfde output |

### Regellimieten per bestandstype

Niet elk bestand is gelijk. Gebruik deze tabel om te bepalen wanneer ingrijpen nodig is:

| Bestandstype | Streefdoel | Hard max | Actie bij overschrijding |
|---|---|---|---|
| React component (.jsx/.tsx) | < 150 | 300 | Component split + hook extractie |
| Custom hook | < 150 | 250 | Splits per verantwoordelijkheid |
| Utility / helpers | < 200 | 300 | Splits per domein |
| Backend controller | < 100 | 200 | Middleware + service extractie |
| Backend route file | < 80 | 150 | Splits per resource |
| Constants / config / data | geen | 500 | Splits per categorie |

> **Wat telt als regel:** Tel totaal aantal regels inclusief imports en lege regels (dit is wat tooling rapporteert). Bij twijfelgevallen vlak bij de grens: beoordeel de hoeveelheid logica, niet alleen het regelaantal.

### Prioriteitsmatrix

Wanneer de analyse meerdere problemen vindt, pak ze aan in deze volgorde:

| Prioriteit | Criteria | Voorbeelden |
|---|---|---|
| **P1 — Blocker** | Breekt build/runtime, circulaire deps | Cyclische imports, build-fouten, runtime crashes |
| **P2 — Hoog** | Sterk boven hard max, ernstige code-smells | 400+ regels, 10+ useState, god modules |
| **P3 — Medium** | Boven streefdoel, matige code-smells | 200-300 regels component, 5-9 useState, ontbrekende memoization |
| **P4 — Laag** | Onder streefdoel maar verbeterbaar | Naamgeving, kleine duplicatie, optionele memoization |

## Wanneer NIET refactoren

Sla de refactor over als:
- Code binnenkort vervangen of verwijderd wordt
- Er geen tests zijn én de risico/baat verhouding scheef is (hoge kans op regressie, lage winst)
- Het bestand net boven streefdoel zit maar duidelijke structuur en goede leesbaarheid heeft
- De refactor meer dan 10 bestanden raakt voor een klein probleem (teken van te hoge coupling — los dat eerst op)

## Niet doen

- Cosmetische opsplitsing enkel om regels te verlagen
- Grootschalige rename/format-sweeps die de diff vervuilen
- Stille semantiekwijzigingen; flag elke behavior change expliciet
- Meerdere onafhankelijke refactors in een commit combineren
- Refactoren zonder eerst de huidige staat te analyseren
- Over-abstractie: geen wrapper om iets dat maar een keer gebruikt wordt

## Deliverables

Schaal de deliverables naar de scope van de refactor:

### Kleine refactor (P3/P4 — ≤ 3 bestanden, 1 iteratie)

Alleen een **wijzigingslijst** (één regel per bestand):
```markdown
- `bestand.js`: [wat is gewijzigd en waarom]
```

### Grote refactor (P1/P2 — > 3 bestanden of meerdere iteraties)

Alle vier:

#### 1. Ontwerpnotitie
```markdown
## Pijnpunten
- [concreet probleem 1]
- [concreet probleem 2]

## Gekozen aanpak
- [module]: [nieuwe verantwoordelijkheid]

## Beslissingen + trade-offs
- Beslissing: [wat]
  Reden: [waarom]
  Trade-off: [nadeel/risico]
```

#### 2. Wijzigingslijst
Een regel per bestand:
```markdown
- `bestand.js`: [wat is gewijzigd en waarom]
```

#### 3. Risico's en open vragen
```markdown
## Risico's
- [risico]: [mitigatie]

## Open vragen
- [ ] [vraag die nog beantwoord moet worden]
```

#### 4. Test-impact
Gebruik de [review checklist](checklists.md#review) en geef aan:
- Welke tests zijn bijgewerkt
- Wat moet handmatig getest worden
- Wat is niet getest (met reden)

## Voorbeeld iteratie-log

```markdown
## Iteratie 1
Probleem: usePortalData hook bevat CRUD voor apps, users en settings (227 regels)
Aanpak: Split in useApps, useUsers, useSettings; usePortalData orkestreert
Effect: Elke hook < 80 regels, individueel testbaar
Commit: refactor(hooks): split usePortalData into domain-specific hooks
```

## Referentie-patronen

Lees het juiste referentiebestand wanneer je een specifiek patroon nodig hebt:

- [decision-tree.md](decision-tree.md) — Wanneer welk type refactor toepassen
- [patterns-react.md](patterns-react.md) — Hook extractie, component splitting, memoization
- [patterns-api.md](patterns-api.md) — Middleware, repository, validation layers
- [patterns-monorepo.md](patterns-monorepo.md) — Shared packages, cross-app dependencies
- [analysis-commands.md](analysis-commands.md) — Geautomatiseerde analyse stappen
- [checklists.md](checklists.md) — Pre-flight, per-iteratie, post-flight en review checklists

# Refactor Principes

## Kerndoelen
Verbeter **testbaarheid**, verlaag **coupling**, elimineer **cyclische dependencies**, en maak **verantwoordelijkheden eenduidig**.

⚠️ **Belangrijke mindset**: Regelaantallen zijn **geen doel**, hoogstens een bijvangst. Focus op architectuur en onderhoudbaarheid.

## Scope definiëren
Voor elke refactor-taak:
- Benoem **concrete pijnpunten** (bijv. "save-flow zit verspreid over 4 plekken", "view management mixt state en I/O")
- Formuleer ze als **meetbare doelen**, niet als vage verbeteringen

## Gereed-criteria
Een refactor is klaar wanneer:
- ✅ Lagere cyclomatische complexiteit op hotspots (meet en vergelijk)
- ✅ Duidelijke scheiding: pure logica vs. I/O/side-effects
- ✅ Kleinere, explicitere publieke API per module
- ✅ Minder gedeelde state tussen modules
- ✅ Tests kunnen eenvoudig spies/mocks gebruiken
- ✅ Geen verborgen singletons of globale state
- ✅ Geen functionele regressies (zelfde input → zelfde output)

## Werkwijze
1. **Start met dependency-schets**: wat roept wat aan, welke side-effects waar
2. **Definieer nieuwe snijlijnen**: bijv. "persist laag", "ui state", "domain logica"
3. **Refactor iteratief** in kleine stappen
4. **Verifieer telkens** kort met lint/test
5. **Noteer per stap**: probleem → aanpak → effect

## Niet doen ❌
- ❌ **Geen cosmetische opsplitsing** enkel om regels te verlagen
- ❌ **Geen grootschalige rename/format-sweeps** die de diff vervuilen
- ❌ **Geen stille semantiekwijzigingen** - flag elke behavior change expliciet
- ❌ **Geen "shotgun surgery"** - als één feature wijziging 10+ bestanden raakt, is de coupling te hoog

## Code kwaliteit bewaken
- Bij **>300 regels**: overweeg component split (maar alleen als de verantwoordelijkheden logisch te scheiden zijn)
- Bij **>10 useState**: verplaats naar custom hook (maar alleen als ze logisch bij elkaar horen)
- Bij **herhaalde patronen**: extraheer reusable logica (maar geen premature abstractie)

## Memoization & Performance
- **useMemo**: voor dure berekeningen en afgeleide data
- **useCallback**: voor event handlers en functies in dependencies
- **React.memo**: voor grid/list componenten met veel items
- **Geen inline functions** in JSX waar dat renders veroorzaakt

## Beslissingen vastleggen
Bij elke refactor:
- Documenteer **waarom** deze snijlijn is gekozen
- Noteer **trade-offs** en alternatieven die je hebt overwogen
- Leg **risico's** vast en wat er handmatig getest moet worden

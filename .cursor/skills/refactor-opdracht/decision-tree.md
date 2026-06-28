# Beslisboom: refactor-type selectie

Gebruik deze boom om het juiste refactor-type te kiezen op basis van het signaal dat je waarneemt.

## Frontend signalen

### Component te groot

**Signaal**: Component nadert of overschrijdt de limiet (streefdoel < 150, hard max 300 regels).

| Situatie | Aanpak | Verwacht resultaat |
|----------|--------|--------------------|
| Meerdere visuele secties in render | Splits in subcomponents per sectie | Elk component onder streefdoel (< 150 regels), eigen props |
| Veel logica + weinig JSX | Extraheer logica naar custom hook | Component wordt thin view layer |
| Zowel logica als JSX groot | Eerst hook extractie, dan component split | Hook + meerdere kleine components |

> **Let op**: Een bestand van 280 regels dat goed leesbaar is, heeft lagere prioriteit dan een bestand van 180 regels met 8 useState en gemixte concerns. Splits altijd met een reden, niet alleen om regelaantal te verlagen.

### Te veel state (5+ useState)

**Signaal**: Component heeft 5 of meer `useState` calls.

| Situatie | Aanpak | Verwacht resultaat |
|----------|--------|--------------------|
| State is gerelateerd (bv. form fields) | Combineer in useReducer of custom hook | 1 hook call in plaats van 5+ useState |
| State is onafhankelijk maar veel | Splits component; elk deel krijgt eigen state | Kleinere, gefocuste components |
| State + derived data | useMemo voor afgeleide data, hook voor state | Minder re-renders, duidelijke data flow |

### Performance problemen

**Signaal**: Trage renders, onnodige re-renders, zware berekeningen in render.

| Situatie | Aanpak | Verwacht resultaat |
|----------|--------|--------------------|
| Dure berekening in render | Wrap in useMemo met juiste dependencies | Berekening alleen bij data-wijziging |
| Handler wordt elke render opnieuw gemaakt | Wrap in useCallback | Stabiele referentie, minder child re-renders |
| Lijst/grid component rendert te vaak | Wrap child in React.memo | Child rendert alleen bij eigen props-wijziging |
| Grote component tree | React.lazy + Suspense voor secties | Snellere initial load |

### God hook (te veel verantwoordelijkheden)

**Signaal**: Hook heeft meer dan één duidelijke verantwoordelijkheid, bevat 3+ useEffect blokken, of retourneert 10+ waarden.

| Situatie | Aanpak | Verwacht resultaat |
|----------|--------|--------------------|
| Hook met 3+ useEffect blokken | Splits per concern (data-fetching, subscriptions, DOM-interactie) | Elke hook max 1-2 useEffect, duidelijk afgebakend |
| Hook retourneert 10+ waarden | Versmal de API of splits in domein-hooks | Elke hook retourneert max 5-7 waarden |
| Hook mixt data-fetching + UI-state + transformatie | Splits in data-hook, state-hook en orchestratie-hook | Data-hook herbruikbaar, UI-hook component-specifiek |
| Hook > 250 regels | Splits per verantwoordelijkheid | Elke hook < 150 regels |

### Prop drilling (> 3 niveaus)

**Signaal**: Props worden doorgegeven door 3+ componenten die ze zelf niet gebruiken.

| Situatie | Aanpak | Verwacht resultaat |
|----------|--------|--------------------|
| Weinig consumers, stabiele data | Context + Provider op logisch niveau | Directe toegang zonder drilling |
| Veel consumers, frequente updates | Custom hook met context | Gecontroleerde re-renders |
| Alleen callbacks doorgeven | Composition pattern (children/render props) | Geen tussenliggende doorgeefluiken |

## Backend signalen

### Route handler te groot

**Signaal**: Express route handler > 50 regels of bevat meerdere concerns.

| Situatie | Aanpak | Verwacht resultaat |
|----------|--------|--------------------|
| Validatie + business logic + response | Splits: middleware (validatie) + service (logic) + controller (response) | Elk onderdeel < 20 regels |
| Directe database queries in route | Extraheer naar repository module | Route handler roept repository aan |
| Error handling herhaald per route | Centraliseer in error-handling middleware | Try/catch verdwijnt uit routes |

### Validatie verspreid

**Signaal**: Zod schemas of validatie-logica op meerdere plekken.

| Situatie | Aanpak | Verwacht resultaat |
|----------|--------|--------------------|
| Schemas in route files | Centraliseer in validation module | Een bron van waarheid voor schemas |
| Gedeelde veldvalidatie | Extraheer base schemas, compose per route | Minder duplicatie, consistentie |

### Mixed I/O en logica

**Signaal**: Functies die zowel data ophalen als transformeren.

| Situatie | Aanpak | Verwacht resultaat |
|----------|--------|--------------------|
| Fetch + transform in een functie | Splits in fetcher (I/O) + transformer (pure) | Transformer unit-testbaar zonder mocks |
| Database + business rules samen | Repository (data) + service (regels) | Service testbaar met mock repository |

## Architectuur signalen

### Circulaire dependencies

**Signaal**: `madge --circular` toont cycles, of import-errors.

| Situatie | Aanpak | Verwacht resultaat |
|----------|--------|--------------------|
| A -> B -> A | Extraheer gedeelde logica naar module C | A -> C, B -> C (geen cycle) |
| Tight coupling via gedeelde state | Introduceer event/callback patroon | Modules communiceren zonder directe import |
| Type-dependency cycle | Verplaats gedeelde types naar apart bestand | Types als onafhankelijke laag |

### Gedeelde logica over meerdere apps

**Signaal**: Dezelfde functie/utility in 2+ apps gekopieerd.

| Situatie | Aanpak | Verwacht resultaat |
|----------|--------|--------------------|
| Utility functies | Verplaats naar shared package in packages/ | Enkele bron, workspace import |
| Gedeelde types/interfaces | Maak types package | Consistentie over apps |
| Gedeelde UI componenten | Maak UI package met eigen exports | Herbruikbare components |

### God module (te veel verantwoordelijkheden)

**Signaal**: Module exporteert 10+ functies uit verschillende domeinen.

| Situatie | Aanpak | Verwacht resultaat |
|----------|--------|--------------------|
| Utils/helpers met 20+ exports | Splits per domein (string-utils, date-utils) | Gerichte modules, tree-shakeable |
| Service met CRUD + business logic + formatting | Splits in repository + service + formatter | Elk onderdeel testbaar |

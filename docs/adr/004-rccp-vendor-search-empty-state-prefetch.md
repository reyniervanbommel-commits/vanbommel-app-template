# ADR-004: Lege vendor-staat + hover-gebaseerde achtergrond-prefetch op de RCCP-pagina

**Datum:** 2026-07-22
**Status:** Geaccepteerd
**Tags:** rccp, prefetch, cache, performance, ux

---

## Context

De RCCP-dashboardpagina (`/rccp`) selecteerde bij het openen automatisch een vendor: eerst de
vendor uit een actief PO-tabelfilter (nr/naam, `equals`), en anders standaard **de eerste vendor
uit de lijst**. Dat voorkwam weliswaar een trage "alle vendors"-analyse, maar leidde tot een
vendor die de gebruiker meestal niet zocht — die moest hem daarna alsnog wisselen via het
zoekveld. Daarnaast bleef de dashboard-loadingstatus (`loading`) in `useRccpPage` standaard op
`true` staan zolang er geen vendor actief was, wat bij het loskoppelen van de auto-select een
oneindige spinner zou opleveren in plaats van een duidelijke lege staat.

De gebruiker wilde dat de pagina bij het openen direct focus geeft aan het vendor-zoekveld
("search by vendor no. or name") wanneer er geen PO-tabelfilter is meegenomen, met een lege
grafiek/matrix totdat een vendor gekozen is — en dat de wachttijd na het kiezen van een vendor
zo laag mogelijk aanvoelt door de data al op de achtergrond te laden terwijl de gebruiker nog
aan het zoeken is.

## Beslissing

1. `resolveDefaultRccpVendor` valt niet langer terug op de eerste vendor uit de lijst; zonder
   PO-tabelfilter-match wordt `''` (geen vendor) teruggegeven.
2. `RccpPageContent` berekent bij mount éénmalig (`useState`-lazy-initializer) of er een
   PO-tabelfilter-handoff was; alleen wanneer die er **niet** was krijgt het vendor-zoekveld
   `autoFocus`. Is er wél een PO-filter, dan blijft die vendor voor-ingevuld (ongewijzigd
   gedrag) en krijgt het veld geen autofocus.
3. Zolang er geen vendor gekozen is (`hasVendor = false`) laadt `useRccpPage` niets: geen
   spinner, geen analyse-call, en de pagina toont een tekstuele hint in plaats van chart/matrix
   of capacity-planning-data. `useRccpPage`'s `loading`-state start op `false` in plaats van
   `true`, zodat "geen vendor" niet meer als "aan het laden" oogt.
4. Een nieuwe module `rccpAnalysisPrefetch.js` houdt een korte in-memory promise-cache
   (TTL 2 minuten, key = vendor + weekvenster) bij. `useRccpVendorPrefetch` (hook) debouncet
   (250ms) een `highlightVendor(vendorAccount)`-aanroep die deze cache vult.
5. `RccpVendorFilter` roept die highlight-functie aan bij (a) hover/keyboard-highlight van een
   optie in de zoeklijst (`onActiveOptionChange` + `onMouseEnter` per Option), en (b) wanneer
   het typen de lijst versmalt tot exact één match. `useRccpPage` checkt deze cache vóór een
   "echte" fetch en hergebruikt een lopende/afgeronde prefetch-promise in plaats van een
   dubbele `apiRequest` te vuren (dedupe).

## Alternatieven overwogen

| Optie | Reden afgewezen |
|-------|-----------------|
| Prefetch bij elke toetsaanslag voor alle gefilterde vendors | Te veel onnodige `apiRequest`-calls, in strijd met de performance-kwaliteitspoort. |
| Alleen prefetchen op exacte match, geen hover/highlight | Mist het geval waarin de gebruiker door de dropdown navigeert vóór selectie — minder dekking van de "instant aanvoelen"-doelstelling. |
| Server-side prefetch/warm-cache per vendor | Onnodige complexiteit en serverbelasting voor een puur cliëntgedreven, sessie-lokale optimalisatie; de `/rccp/analysis`-query is al vendor-scoped en dus al relatief snel. |
| Vendor 1 uit de lijst als default blijven gebruiken | Laadt bijna altijd de "verkeerde" vendor en kost de gebruiker een extra zoekactie — precies het probleem dat opgelost moest worden. |

## Gevolgen

De RCCP-pagina laadt niet langer ongevraagd data voor een willekeurige vendor; de gebruiker
zoekt zelf, met focus al in het zoekveld, en ziet een duidelijke lege staat totdat er een keuze
gemaakt is. Komt de gebruiker vanuit een gefilterde PO-tabel, dan verandert er niets. Door de
hover/highlight-gedreven achtergrond-prefetch met dedupe-cache voelt de daadwerkelijke selectie
sneller aan zonder het aantal API-calls onnodig te verhogen. De cache is puur sessie-lokaal
(geen bron van waarheid, vergelijkbaar met de bestaande `sessionStorage`-handoff) en heeft een
korte TTL, dus geen risico op verouderde data bij langer openstaande tabbladen. Toekomstige
zoekvelden met een vergelijkbaar "kies-en-laad"-patroon kunnen dezelfde prefetch-hook/cache-opzet
hergebruiken.

## Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/components/rccp/resolveRccpVendorFilter.js` | Geen fallback meer naar de eerste vendor; retourneert `''` zonder PO-filter-match. |
| `src/components/rccp/resolveRccpVendorFilter.test.js` | Tests aangepast aan het nieuwe "geen fallback"-gedrag. |
| `src/components/rccp/RccpPageContent.jsx` | Geen auto-select vendor 1, `hadPoFilterHandoff`/`hasVendor`-logica, lege-staat-hint, prefetch-hook gekoppeld. |
| `src/components/rccp/RccpVendorFilter.jsx` | `autoFocus`- en `onHighlightVendor`-props; hover/keyboard-highlight en exacte-match-detectie. |
| `src/components/rccp/RccpVendorFilter.test.jsx` | Tests voor autofocus en highlight-callback. |
| `src/hooks/useRccpPage.js` | `loading` start op `false`; leegt analyse bij `enabled=false`; gebruikt prefetch-cache vóór fetch. |
| `src/hooks/useRccpPage.test.js` | Nieuwe tests voor de lege-staat en de vendor-fetch. |
| `src/hooks/useRccpVendorPrefetch.js` | Nieuwe hook: gedebouncete highlight-trigger voor achtergrond-prefetch. |
| `src/utils/rccpAnalysisPrefetch.js` | Nieuwe in-memory promise-cache (prefetch + dedupe) voor RCCP-analyse per vendor+weekvenster. |
| `src/utils/rccpAnalysisPrefetch.test.js` | Tests voor cache/dedupe/foutafhandeling. |
| `src/config/version.js` | Versie verhoogd naar `v1.34.0`. |

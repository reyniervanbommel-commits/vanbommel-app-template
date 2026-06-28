📝 Communicatie regels

• gebruik nederlands als taal om te antwoorden
• maak eerst altijd een korte samenvatting van mijn vragen in een lijstje, kleur het lettertype rood, gebruik ronde bolletjes, vink elk punt af zodra het klaar is
• geef geen uitgebreide uitleg over de code
• geef een kleine samenvatting van wat je hebt aangepast
• geef geen code voorbeelden in de samenvatting
• vraag mij niet om code uit te voeren, doe dat zelf waar mogelijk
• start geen servers, dat doe ik zelf

🔢 Versie beheer

• voeg altijd een footer onder in de app toe met een versienummer
• verhoog bij iedere aanpassing in de code het versienummer in de footer
• gebruik semantic versioning met MAJOR MINOR PATCH, bijvoorbeeld v8 0 0



🏗️ Code kwaliteit regels
Kritiek, component grootte

• nooit meer dan 300 regels per component
• bij 250 regels of meer, waarschuwen en splitsing voorstellen
• bij 300 regels of meer, stoppen en eerst het component splitsen
• controleer altijd de bestandsgrootte voordat je wijzigingen start

Component structuur

• groepeer components per feature in submappen
• gebruik index js voor exports
• maximaal vier niveaus JSX nesting
• maximaal tien props per component

State management

• bij vijf of meer useState in een component, overweeg een custom hook
• bij tien of meer useState in een component, verplicht een custom hook
• gebruik waar mogelijk useCanvasLayout en useFilterState
• voorkom duplicatie van state logica

Performance

• gebruik useMemo voor dure berekeningen
• gebruik useCallback voor event handlers
• gebruik React memo voor grid en list components
• geen inline functions in JSX, maak handlers met useCallback

Code organisatie

• verplaats herbruikbare logica naar custom hooks
• verplaats herhaalde UI naar losse components
• pas memoization toe bij arrays en objects die als dependency dienen
• documenteer complexe logica met korte comments

🔁 Herbruikbare hooks
Doel en grenzen

• verplaats uitsluitend logica naar de hook, geen JSX in een hook
• de view rendert, de hook levert data en handlers
• gebruik de hook om regels in de view te reduceren en hergebruik te vergroten

Naamgeving en locatie

• naam begint met use en beschrijft de feature, bijvoorbeeld useCards of useFilterState
• algemene hooks in src hooks
• feature specifieke hooks in de map van die feature

API contract

• return alleen wat de view nodig heeft
• geef een object terug met stabiele referenties via useMemo en useCallback
• lever naast data ook loading en error terug wanneer van toepassing

Side effects en data

• netwerkcalls en andere effecten in de hook via useEffect met heldere dependencies en cleanup
• foutafhandeling in de hook, geef een eenvoudige error waarde terug
• voorkom onnodige renders door afgeleide data te memoizen

Types en linting

• typ de input en output van de hook met TypeScript types
• zet eslint rules of hooks aan en los alle meldingen op

Wanneer, Nu maak ik een herbruikbare hook

• bij vijf of meer losse stukjes state in een component, verplaats naar een hook
• bij tien of meer stukjes state, maak een hook verplicht
• bij terugkerende patronen zoals laden van data, filteren, sorteren, selectie, paginatie, autorisatie, maak een hook

Hook checklists

Voor wijziging
• is de verantwoordelijkheid logisch om te verplaatsen
• zijn input en output van de hook duidelijk
• komt het component na verplaatsing onder de 300 regels

Na wijziging
• geen JSX in de hook
• handlers en afgeleide data zijn gestabiliseerd met useCallback en useMemo
• eslint rules of hooks geeft geen meldingen
• korte JSDoc met doel, input en output aanwezig
• versienummer in de app footer verhoogd

Stop signalen voor hooks

• een hook heeft meer dan één duidelijke verantwoordelijkheid, splits in kleinere hooks
• een hook bevat meer dan drie useEffect blokken, heroverweeg de afbakening
• een hook geeft meer dan tien waarden terug, versmal de API

🔒 Security en privacy

• houd altijd maximaal rekening met security en privacy
• geen api keys in code
• gebruik environment variables
• valideer alle user input

📋 Voor elke code wijziging
Pre change checklist

1, controleer huidige bestandsgrootte, onder de 300 regels
2, plan de wijziging, inschatting van het aantal regels
3, als het totaal boven 300 komt, eerst component splitsen

Post change checklist

1, geen JSX syntax errors
2, component blijft onder 300 regels
3, memoization toegepast waar nodig
4, versienummer verhoogd in de footer
5, commit met juiste prefix, feat of fix of andere

🚨 Stop signalen

Stoppen en splitsen wanneer
• bestand gaat over 300 regels
• meer dan drie niveaus JSX nesting
• tien of meer useState calls
• herhaalde code patronen zichtbaar
• fouten in de JSX structuur

Actie bij stop signaal
1, extraheer logische secties naar nieuwe components of hooks
2, test grondig
3, merge pas wanneer alles onder 300 regels blijft

📚 Referentie documenten

• DEVELOPMENT_WORKFLOW md, volledige workflow guide
• BRANCH_STRATEGY md, git strategie
• REFACTOR_PLAN md, refactoring guide
• APP_SCHEMA md, architectuur overzicht

🎯 Prioriteiten

1, code kwaliteit boven snelheid
2, kleine components boven grote monoliths
3, herbruikbaarheid boven duplicatie
4, duidelijkheid boven slimheid
5, testen boven aannames

🔧 Git & versiebeheer

- Werk zelf met Git wanneer dat nodig is (init, add, commit, branch, merge, etc.).
- Geef het altijd expliciet aan als je een Git-actie hebt gedaan, inclusief een korte samenvatting van wat je hebt gedaan.
- Na elke afgeronde wijziging in de code:
  - Geef mij één of meerdere concrete terminal-commando’s (run commands) om de wijzigingen in Git te zetten, bijvoorbeeld:
    - git status
    - git add …
    - git commit -m "…"
    - git push
  - Bij `develop-from-devops` / OTAP-feature: voer `git push` en PR zelf uit (geen akkoord vragen). Anders: meld uitgevoerde Git-commando’s achteraf.

💾 Data opslag & SQL backend
Algemeen
- Alle page‑designer / canvas layouts worden centraal opgeslagen in de SQL‑tabel QAQC_canvas_layouts in één JSON‑kolom layout_state.
- Nieuwe layout‑elementen (bijvoorbeeld freeTextItems, extra overlays, nieuwe secties) worden uitsluitend als nieuwe properties in dit JSON‑object toegevoegd, niet als nieuwe SQL‑kolommen.
Instellingen
- Board‑ en user‑specifieke instellingen (zichtbaarheid, filters, kaart‑layout, enz.) worden centraal beheerd in de SQL‑tabel QAQC_user_board_settings.
- localStorage in de frontend is alleen cache/fallback, niet de bron van waarheid.
Versiebeheer layout
Het veld version in QAQC_canvas_layouts wordt gebruikt voor migraties van het JSON‑formaat.
Bij grote wijzigingen in de layout‑structuur:
verhoog de version waarde;
zorg voor migratielogica in de code zodat oude records backwards compatible geladen worden.

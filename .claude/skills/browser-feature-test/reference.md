# Test Checklists per Categorie

## Visueel / Layout

- [ ] Alle verwachte elementen zijn zichtbaar in de snapshot
- [ ] Teksten kloppen (titels, labels, placeholder tekst)
- [ ] Iconen/afbeeldingen laden correct
- [ ] Kleuren en stijlen matchen het ontwerp
- [ ] Responsive op mobiel (375x667) — geen overflow, leesbare tekst
- [ ] Responsive op tablet (768x1024)
- [ ] Geen visuele glitches bij schermwisseling
- [ ] Footer met versienummer is aanwezig (indien van toepassing)

## Interactie — Knoppen & Links

- [ ] Knoppen zijn klikbaar (niet disabled tenzij verwacht)
- [ ] Klik op knop triggert juiste actie (UI-wijziging, navigatie, API-call)
- [ ] Hover-state is zichtbaar (cursor change, kleur, tooltip)
- [ ] Disabled state werkt correct wanneer van toepassing
- [ ] Links navigeren naar juiste pagina

## Interactie — Formulieren

- [ ] Input-velden accepteren tekst
- [ ] Validatie toont foutmeldingen bij ongeldige input
- [ ] Submit knop verstuurt het formulier
- [ ] Succesmelding verschijnt na submit
- [ ] Reset/cancel knop werkt correct
- [ ] Dropdown/select opties zijn aanwezig en selecteerbaar
- [ ] Checkbox/radio buttons werken correct

## Interactie — Modals & Dialogs

- [ ] Modal opent bij trigger
- [ ] Modal sluit met close-knop of escape
- [ ] Overlay blokkeert achterliggende content
- [ ] Content in modal is correct

## Interactie — Drag & Drop

> **Let op**: Browser MCP-tools ondersteunen meestal geen echte drag & drop simulatie
> (mousedown → mousemove → mouseup sequentie). Deze checks moeten handmatig getest worden.
> Noteer in het rapport: "Drag & drop: handmatige test vereist."

- [ ] Element is versleepbaar (handmatig testen)
- [ ] Drop-target accepteert het element (handmatig testen)
- [ ] Visuele feedback tijdens drag (handmatig testen)
- [ ] State update na drop (handmatig testen)

## Data & State

- [ ] Data laadt correct uit API
- [ ] Loading state is zichtbaar tijdens laden
- [ ] Error state toont bij API-fout
- [ ] Empty state toont bij lege dataset
- [ ] Data refresh/update werkt correct
- [ ] Filters/sortering werken correct
- [ ] Pagination werkt (volgende/vorige pagina)

## Console & Errors

- [ ] Geen JavaScript errors in console
- [ ] Geen unhandled promise rejections
- [ ] Geen React warnings (key prop, deprecated lifecycle)
- [ ] Geen 404 requests voor assets

Bekende ruis die je kunt negeren:
- `[HMR]` of `[vite]` messages (hot module reload)
- `DevTools` warnings
- Third-party script warnings (analytics, fonts, browser extensions)

## Netwerk

- [ ] Verwachte API-calls worden uitgevoerd
- [ ] Response status codes zijn 2xx
- [ ] Geen dubbele/overbodige requests
- [ ] Geen CORS errors
- [ ] Request payloads bevatten juiste data
- [ ] Geen 401/403 responses (authenticatie-probleem)

## Toegankelijkheid (basis)

- [ ] Interactieve elementen hebben labels in snapshot
- [ ] Afbeeldingen hebben alt-tekst
- [ ] Formulier-velden hebben labels
- [ ] Focus-volgorde is logisch (tab-navigatie)

## Performance (optioneel)

- [ ] Pagina laadt binnen 3 seconden
- [ ] Geen merkbare lag bij interactie
- [ ] Geen memory leaks zichtbaar in console
- [ ] Geen excessieve re-renders

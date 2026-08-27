# Perf — review

**Omgeving:** preview (login geblokkeerd)  
**Datum:** 2026-08-27  
**Verdict:** PARTIAL — alleen statische check, geen HUD-meting

## Wat is gedaan
- Snelheid bekeken in de gewijzigde tab-code (geen extra skill naast perf-review)
- Geen cijfers: preview-login faalt; lokale backend draait niet

## Wat jij kunt testen
1. Log in op de preview (of localhost met API) → Purchase Orders
2. Wissel een paar keer tussen All en een extra tab; kijk in Network naar PATCH board-settings (niet per klik stormen)
3. Hover snel over afgekapte tabnamen; de balk mag niet haperen

## PERF HUD (⚡ linksonder)
- Op preview/dev zou de HUD linksonder staan
- Deze run: niet gezien (niet ingelogd)

## Nog open
- Hermeten zodra preview-login werkt

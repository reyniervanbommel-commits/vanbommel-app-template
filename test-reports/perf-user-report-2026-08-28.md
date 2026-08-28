# Perf — review

**Omgeving:** preview PO-board remarks search  
**Datum:** 2026-08-28  
**Verdict:** GEMETEN (nieuwe zoekactie snel; board-load is koude preview, geen #277-regressie)

## Wat is gedaan
- Remarks-filter Apply gemeten op preview (v1.52.17)
- Search-API: ~48 ms warm, ~107 ms eerste call; SQL 3–25 ms
- Geen extra zoekcall bij 1 teken

## Wat jij kunt testen
1. PO-board → kolom Remarks → Filter contains → term van minstens 2 tekens → Apply
2. Network: één `GET .../remarks/search?q=...` met 200; PERF HUD toont die duur
3. Verwacht: board filtert; lege term/1 teken start geen search

## PERF HUD (⚡ linksonder)
- Na Apply de laatste API-tijd (hier 48–107 ms voor search)
- Baseline in de HUD is de oude DEV-seed — niet 1:1 met deze preview

## Nog open
- Volledige J7-scout (`perf-board-actions`) niet herhaald; optioneel op DEV

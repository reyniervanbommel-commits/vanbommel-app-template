# ADR-003: Achtergrondrefresh voor D365 purchase orders

**Datum:** 2026-07-06  
**Status:** Geaccepteerd  
**Tags:** d365, refresh, purchase-orders, performance  
**DevOps Feature:** #177

---

## Context

Tijdens een handmatige D365-refresh van purchase orders werd de refresh-flow blokkerend uitgevoerd. Daardoor kon de purchase-order tabel tijdelijk leeg of instabiel aanvoelen, terwijl de refresh nog liep. Dit gaf een slechte gebruikerservaring en verhoogde het risico op performance-impact in de actieve tabelweergave.

## Beslissing

1. D365-refresh wordt gestart als achtergrondjob via een dedicated start-endpoint.
2. Er draait maximaal één refreshjob per tabel tegelijk (in-memory jobregistratie).
3. Het progress-endpoint levert zowel voortgang als `running` status terug.
4. De frontend houdt de bestaande tabeldata zichtbaar tijdens refresh en vervangt data pas na afgeronde achtergrondrefresh.
5. Bij een refreshfout blijft de bestaande tabeldata staan en wordt alleen de foutstatus getoond.

## Alternatieven overwogen

| Optie | Reden afgewezen |
|-------|-----------------|
| Blokkerende sync refresh (huidige gedrag) | Leegt of blokkeert de tabelervaring tijdens langlopende D365-sync. |
| Tabel tussentijds resetten en progress tonen | Geeft visuele instabiliteit en onnodige contextwissel voor eindgebruikers. |
| Periodieke auto-refresh zonder jobcontrole | Kans op overlap/concurrentie en onvoorspelbare belasting. |

## Gevolgen

De purchase-order tabel blijft responsief en bruikbaar terwijl de D365-refresh op de achtergrond draait. Gebruikers zien stabiele data totdat de nieuwe dataset volledig klaarstaat. Extra complexiteit zit in jobstatusbeheer en pollinglogica, maar die is beperkt en lokaal afgebakend. Toekomstige uitbreidingen kunnen deze aanpak hergebruiken voor andere tabellen met langlopende bron-refreshes.

## Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `server/routes/data.js` | Nieuw background-refresh start-endpoint en `running` in progress-response. |
| `server/services/TableDataService.js` | Jobregistratie, `startRefresh()`, `isRefreshRunning()` en progress-initialisatie. |
| `src/hooks/usePurchaseOrdersPage.js` | Refresh-flow omgezet naar background-start met expliciete afronding/reload. |
| `src/hooks/usePurchaseOrderRefreshProgress.js` | Polling uitgebreid met `running` status en `waitForCompletion()`. |
| `src/components/supplier/PurchaseOrdersPage.jsx` | UI-flow aangepast: tabel blijft zichtbaar tot refresh klaar is. |
| `src/config/version.js` | Versie verhoogd naar `v1.14.31`. |

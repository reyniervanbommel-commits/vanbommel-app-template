# ADR-001: Instant reload met gelaagde cache voor Purchase Orders

**Datum:** 2026-07-02  
**Status:** Geaccepteerd  
**Tags:** purchase-orders, caching, performance  
**DevOps Feature:** #130

---

## Context

Bij terugnavigeren naar de Purchase Orders-pagina werd de tabel steeds opnieuw geladen met een zichtbare wachttijd. De data staat op dat moment al in SQL-cache, maar de UI wachtte op een volledige API-response voordat de tabel opnieuw werd getoond. Dit gaf een trage ervaring terwijl de gegevens meestal al direct beschikbaar waren.

## Beslissing

1. We hanteren een gelaagde cache-aanpak voor snelle herlaadtijd:
   - een korte frontend view-cache voor instant render bij terugkeer naar de pagina;
   - een korte backend read-cache op de SQL-readflow om herhaalde reads te versnellen.
2. We voeren stale-while-revalidate gedrag in:
   - eerst direct de laatst bekende data tonen;
   - daarna op de achtergrond opnieuw ophalen via de bestaande API-call.
3. We valideren backend read-cache actief bij mutaties en refresh-acties om consistentie te borgen.

## Alternatieven overwogen

| Optie | Reden afgewezen |
|-------|-----------------|
| Alleen backend read-cache | Verbetert API-latency, maar lost de directe UI-wachttijd bij page return niet volledig op. |
| Alleen frontend cache zonder revalidate | Sneller, maar risico op verouderde data zonder automatische verversing. |
| Altijd hard refresh zonder caching | Simpel, maar levert onnodige wachttijd en hogere belasting op SQL/API op. |

## Gevolgen

De tabel verschijnt directer bij terugkeer naar de pagina en blijft daarna automatisch bijwerken op de achtergrond. De backend verwerkt minder identieke read-queries in korte tijd. Extra aandachtspunt is correcte cache-invalidering bij writes; dit is expliciet ingericht op refresh, mark-as-viewed en bewerkacties.

## Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/hooks/usePurchaseOrdersPage.js` | Instant render met cached payload + background revalidate toegevoegd. |
| `src/utils/purchaseOrdersViewCache.js` | Nieuwe frontend view-cache met korte TTL toegevoegd. |
| `server/services/D365PurchaseOrderCacheService.js` | Backend read-cache met TTL en invalideringslogica bij writes/refresh toegevoegd. |
| `src/config/version.js` | Applicatieversie verhoogd voor deze wijziging. |

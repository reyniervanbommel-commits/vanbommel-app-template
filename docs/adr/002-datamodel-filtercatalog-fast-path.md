# ADR-002: Snelle datamodel-load via filtercatalogus fast-path

**Datum:** 2026-07-03  
**Status:** Geaccepteerd  
**Tags:** datamodel, performance, caching  
**DevOps Feature:** #161

---

## Context

De admin-datamodelpagina (`/api/purchase-orders/datamodel`) laadde traag door zware catalogusopbouw per request. De oude flow las grote `raw_json`-samples uit SQL-cachetabellen en bouwde steeds opnieuw previewdata op. Dit veroorzaakte hoge latency en kon zelfs request timeouts geven bij grotere datasets.

## Beslissing

1. We vervangen de zware request-time catalogusopbouw door een snelle fast-path:
   - catalogus wordt primair opgebouwd vanuit `po_columns` (kolomregistry);
   - dit maakt de datamodel-load onafhankelijk van zware JSON-sampling in SQL.
2. We introduceren een in-memory cache voor de filtercatalogus op backendniveau met korte TTL.
3. We verrijken de catalogus met sampledata tijdens `refresh()` (achtergrond/syncpad), niet tijdens page-load.
4. Frontend-verbruik van samplewaarden blijft compatibel door fallback naar `sampleByField`.

## Alternatieven overwogen

| Optie | Reden afgewezen |
|-------|-----------------|
| SQL-sampling behouden met extra indexen | Vermindert mogelijk latency, maar houdt zware query- en parsekosten in request-pad. |
| Alleen payload verkleinen zonder cache | Minder data over netwerk, maar kernprobleem (dure opbouw per request) blijft bestaan. |
| Volledige previewtabellen blijven berekenen | Functioneel rijk, maar disproportioneel duur voor de primaire beheerflow. |

## Gevolgen

De datamodel-endpoint reageert merkbaar sneller en stabieler, met name bij herhaald openen van de pagina. De zware belasting verschuift naar het refreshmoment, waar die beter beheersbaar is. Hierdoor daalt de kans op timeouts in de admin-flow en stijgt de gebruikerservaring bij configuratietaken.

## Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `server/services/D365PurchaseOrderCacheService.js` | Fast-path catalogus, in-memory cache en sampleverrijking tijdens refresh toegevoegd. |
| `server/routes/purchaseOrders.js` | Zware kolomsync in `/datamodel` verwijderd. |
| `src/components/admin/datamodel/entityConfigTableUtils.js` | `sampleByField`-fallback voor voorbeeldwaarden toegevoegd. |
| `src/components/admin/datamodel/EntityConfigTable.jsx` | Export gebruikt fallback-geschikte voorbeeldrij. |
| `src/config/version.js` | Versie verhoogd bij de performancewijziging. |

# RCCP dashboard KPI-kaarten

## BRD

De RCCP-dashboardkaarten moeten de planner binnen de gekozen vendor en From/To-weekrange antwoorden geven over volume (ordered / delivered / open), te late levering (ontvangen én nog open) en capaciteitstekort. De huidige kaarten (available capacity, confirmed load, warning cells, overloaded cells) doen dat niet.

## FRD

Acht kaarten, Engels, zelfde Card-patroon als nu. Geen extra API-roundtrip: waarden komen mee in `GET /api/rccp/analysis`.

1. **Total ordered** — som van open + delivered van PO-regels waarvan de geplande ISO-week in de range valt.
2. **Total delivered** — delivered van díe regels (ook als de ontvangstweek buiten de range valt) + percentage van ordered.
3. **Total open** — open van díe regels + percentage van ordered.
4. **Late delivery** — gemiddeld aantal kalenderdagen (ontvangstdatum − gepland) voor ontvangen regels met ontvangst ná gepland; gemiddelde per PO-regel.
5. **Late delivery items** — aantal unieke artikelnummers onder (4).
6. **Open and late** — unieke artikelnummers nog open, geplande week strikt vóór de huidige ISO-week; hoofgetal = aantal, detail = gemiddelde dagen (vandaag − gepland) per PO-regel.
7. **Capacity shortfall** — som van (open load − capacity) in weken waar load > capacity.
8. **Overloaded weeks** — aantal van die weken.

Lege artikelnummers tellen niet mee in SKU-tellingen. Zonder late regels: dagen = —. Ordered 0 → percentages 0%.

## TD

- Pure helper `server/utils/rccpKpis.js` (`buildRccpPoKpis`, `buildRccpCapacityKpis`) + co-located tests.
- `RccpAnalysisService.analyze` vult `kpis` vanuit PO-snapshot + chart-serie (open vs `__capacity__`).
- `RccpKpiCards.jsx` rendert de acht kaarten; diagnostics-empty-state gebruikt `totalOrdered`.
- PO-tabel: derde split-tab **KPIs**. Getallen uit de zichtbare header-rijen (`buildPoBoardKpis`); capacity = —. Klikbare tegels zetten een overlay-filter (`applyKpiFilter`) bovenop kolomfilters.
- Geen schema-migratie. Vendor-scoping gelijk aan de bestaande analyse.

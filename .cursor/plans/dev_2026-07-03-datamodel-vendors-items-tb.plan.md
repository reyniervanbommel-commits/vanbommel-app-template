---
name: datamodel-vendors-items-tb
overview: Voeg de entiteiten Vendors en Items toe aan de Data model-pagina via de generieke tb_*-laag (strangler-fig cutover afmaken), met fk_join lookup-verrijking van Purchase Orders (vendor-naam op de header, item-omschrijving op de line). Vendors/Items zijn platte referentie-tabellen (scope master, geen detail). Bewust NIET op het po_*-pad.
todos:
  # --- Fase 1: generieke D365-provider (fundament, geen UI-impact) ---
  - id: d365-odata-provider
    content: D365ODataProvider (generieke fetch op source_entity + $select uit tb_columns) die de PO-only FETCH_ADAPTERS in TableDataService vervangt; resolved uit tb_sources.provider_type.
    status: pending
  # --- Fase 2: registreer Vendors + Items + relaties ---
  - id: db-migration-015
    content: Migratie 015 (idempotent) — seed tb_tables/tb_columns voor vendors (/data/VendorsV2) en items (/data/ReleasedProductsV2); tb_relations uitbreiden naar meerdere relaties per tabel + fk_join-seeds PO->vendor en PO.line->item.
    status: pending
  # --- Fase 3: lookup-verrijking in de leeslaag ---
  - id: fk-join-read
    content: TableDataService.read() resolvet fk_join-relaties tegen tb_cache van vendors/items en levert read-only afgeleide kolommen (vendorName, itemDescription) mee; binnen cache-is-leidend, geen extra D365-calls per rij.
    status: pending
  # --- Fase 4: Data model-UI data-gedreven ---
  - id: ui-registry-driven
    content: DataPreviewTables data-gedreven maken (registry-loop i.p.v. 2 hardcoded blokken) + entiteit-kiezer (TabList); platte tabellen tonen 1 EntityConfigTable, master-detail 2. Hergebruik EntityConfigTable/SyncFilterBuilder ongewijzigd.
    status: pending
  # --- Fase 5: ER-overzicht ---
  - id: diagram-generalize
    content: DataModelDiagram generaliseren van 2 hardcoded nodes naar N entiteit-kaarten met 1:n (expand) + n:1 (fk_join) relatielijnen; bovenaan de pagina tonen.
    status: pending
  # --- Afronding ---
  - id: tests-versioning
    content: Backend-tests voor provider-fetch + fk_join-resolutie; frontend-test voor de registry-gedreven pagina; versie verhogen in src/config/version.js.
    status: pending
isProject: false
---

# Implementatieplan — Vendors & Items op de Data model-pagina (tb_*-laag)

## Laagkeuze (vastgelegd)
- We bouwen op de generieke **`tb_*` Table Builder-laag** ([011_tb_metamodel.sql](scripts/db/migrations/011_tb_metamodel.sql), [TableDataService.js](server/services/TableDataService.js), route `/api/data/:tableKey`) — **niet** op het hardcoded `po_*`-pad in [purchaseOrders.js](server/routes/purchaseOrders.js).
- Reden: Vendors/Items zijn bewust anders van vorm dan PO (platte referentie-tabellen, geen master-detail) en dwingen zo de al-gekozen strangler-fig-cutover af. Het PO-specifieke cache/fetch-pad (1300 regels) hergebruiken is niet haalbaar; het `po_*`-pad opnieuw dupliceren voor 2 platte tabellen is verspilling.
- Sluit aan op besluit 2026-06-30 (generiek platform gekozen).

## Doel en afbakening
- Twee nieuwe entiteiten op de Data model-tab, elk met eigen sync + kolomconfiguratie (zichtbaarheid/write-back-toggles), via de bestaande `EntityConfigTable`.
- **Lookup-verrijking van PO**: vendor-naam als read-only kolom op de PO-header, item-omschrijving op de PO-line. Cache-gedreven, geen extra D365-call per rij.
- Buiten scope: schrijf-terug op Vendors/Items zelf; meerdere detail-niveaus; een aparte browse-pagina buiten de admin-datamodel-tab.

## Koppeling (bevestigd tegen de code)
De app doet de vendor-join nu al ad-hoc bij het ophalen ([D365ODataService.js:369-401](server/services/D365ODataService.js#L369-L401), `fetchVendorsByAccounts` op `/data/VendorsV2`). De generieke `fk_join` formaliseert dat en breidt het uit met Items.

| Relatie | Van (bron-veld) | Naar (doel-key) | Partition | Verrijkingsveld |
|---------|-----------------|-----------------|-----------|-----------------|
| PO → Vendor (n:1) | header `OrderVendorAccountNumber` | Vendor `VendorAccountNumber` | `dataAreaId` | `VendorOrganizationName` |
| PO-line → Item (n:1) | line `ItemNumber` | Item `ItemNumber` | `dataAreaId` | `ProductName` (te bevestigen) |

## Beslissingen en aannames
- **Vendor-entiteit = `VendorsV2`** (niet V3). De werkende code gebruikt V2 met velden `VendorAccountNumber`/`VendorOrganizationName` ([D365ODataService.js:173-183](server/services/D365ODataService.js#L173-L183)). Als V3 gewenst is, is dat een expliciete keuze met veld-mapping-controle.
- **Item-entiteit = `ReleasedProductsV2`**, key `dataAreaId,ItemNumber`. Omschrijvingsveld (`ProductName` vs `SearchName`) verifiëren tegen `$metadata` vóór het seeden van de kolommen.
- **`tb_relations` moet meerdere relaties per tabel toestaan.** Nu blokkeert `UQ_tb_relations_table` ([011_tb_metamodel.sql:147](scripts/db/migrations/011_tb_metamodel.sql#L147)) dat: PO krijgt er straks drie (`expand`→lines, `fk_join`→vendors, `fk_join`→items). Migratie 015 vervangt de unieke constraint en vult `join_keys_json` op de fk_join-rijen.
- **Verrijkingskolommen zijn read-only afgeleid**, niet als `tb_columns` met eigen waarde-opslag — ze komen puur uit de gejoinde cache.

---

## Fase 1 — Generieke D365-provider

- Introduceer een `D365ODataProvider` (bijv. `server/services/sources/D365ODataProvider.js`) met `fetch(table, { columns, filter, maxRows })` die een willekeurige entiteit ophaalt op `table.sourceEntity`, met `$select` afgeleid uit de actieve `source`-kolommen (`tb_columns`), `cross-company` + `dataAreaId`-filter zoals de bestaande calls.
- Vervang `FETCH_ADAPTERS`/`getFetchAdapter` in [TableDataService.js:74-84](server/services/TableDataService.js#L74-L84) door provider-resolutie op `tb_sources.provider_type` (`d365_odata` → deze provider). PO blijft werken via dezelfde provider (source_entity + expand-relatie uit `tb_relations`).
- Non-destructief: de bestaande PO-flow op `po_*` blijft ongemoeid tot de UI-cutover.

## Fase 2 — Migratie 015 (registreer entiteiten + relaties)
- `tb_tables`: seed `vendors` (`/data/VendorsV2`, key `dataAreaId,VendorAccountNumber`) en `items` (`/data/ReleasedProductsV2`, key `dataAreaId,ItemNumber`), beide `cache_mode='auto'`.
- `tb_columns`: seed de master-kolommen per entiteit (Vendor: account, naam, e-mail, telefoon, groep, valuta — conform `mapVendor`; Item: itemnummer, omschrijving, evt. eenheid/productgroep). Allemaal `scope='master'`, `source='source'`.
- `tb_relations`: drop `UQ_tb_relations_table`; voeg `fk_join`-rijen toe voor PO→vendor en PO.line→item met `join_keys_json`. Idempotent (`IF NOT EXISTS`), non-destructief.
- `tb_sync_state`: init-rijen voor beide tabellen (stale, zodat eerste lazy refresh de cache opbouwt).

## Fase 3 — fk_join-resolutie in de leeslaag
- In `TableDataService.read()` voor `purchase-orders`: laad de `fk_join`-relaties, resolvet elke masterrij/detailrij tegen `tb_cache` van de doeltabel (`vendors`/`items`) op de join-keys + partition, en voeg de geconfigureerde verrijkingsvelden toe als read-only kolommen (`vendorName` op master, `itemDescription` op detail).
- Ontbrekende lookup (vendor/item nog niet gesynct) → leeg veld, geen fout.
- Blijft binnen cache-is-leidend: geen D365-call per rij.

## Fase 4 — Data model-UI data-gedreven
- [DataPreviewTables.jsx](src/components/admin/datamodel/DataPreviewTables.jsx): vervang de twee hardcoded `EntityConfigTable`'s door een loop over de tabellen uit de registry. Master-detail → 2 tabellen (master + detail), platte tabel → 1.
- Voeg een **entiteit-kiezer** toe (Fluent `TabList`): Inkooporders / Leveranciers / Artikelen. De gekozen entiteit toont zijn `SyncFilterBuilder` + `EntityConfigTable`(s).
- Backend: laat de datamodel-payload de tabellen uit de tb-registry opbouwen (of een nieuwe `/api/data`-admin-endpoint) i.p.v. de hardcoded entities in [purchaseOrders.js:242-267](server/routes/purchaseOrders.js#L242-L267). `EntityConfigTable`/`SyncFilterBuilder` blijven ongewijzigd.

## Fase 5 — ER-overzicht
- Generaliseer [DataModelDiagram.jsx](src/components/admin/datamodel/DataModelDiagram.jsx) van 2 hardcoded nodes naar N entiteit-kaarten, met relatielijnen: crow's-foot voor 1:n (`expand`), pijl voor n:1 (`fk_join`) met de join-velden als badge. Toon het diagram bovenaan de pagina.

## Afronding
- Backend-tests: provider-fetch (`$select`/filter), fk_join-resolutie (hit, miss, cross-company).
- Frontend-test: registry-gedreven pagina rendert N entiteiten + kiezer.
- Versie verhogen in [src/config/version.js](src/config/version.js).

## Risico's / aandachtspunten
- Item-omschrijvingsveld en exacte `ReleasedProductsV2`-key verifiëren tegen `$metadata` vóór seeden.
- `tb_relations`-constraint verwijderen is een schema-wijziging; migratie idempotent + non-destructief houden.
- Twee extra syncs verhogen D365-load; hergebruik `cache_mode='auto'` + `stale_minutes` en overweeg vendors/items minder vaak te verversen dan PO.

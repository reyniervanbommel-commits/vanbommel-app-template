# Vendors & Items op Data model + lookup-verrijking op PO-bord (DevOps)

**Work item:** [#AB:195](https://dev.azure.com/reyniervanbommel0745/Vendor-App/_workitems/edit/195)  
**Parent:** Feature #130  
**Status:** In uitvoering  

## Doel

Voeg `VendorsV2` en `ReleasedProductsV2` toe als volwaardige entiteiten in de `tb_*`-laag en maak lookup-verrijking beschikbaar op het PO-bord:

- Header lookup: `OrderVendorAccountNumber -> VendorOrganizationName`
- Line lookup: `ItemNumber -> SearchName`

Alles cache-gedreven, zonder extra D365-call per rij.

## Opgeleverde scope

1. Generieke D365-entity fetch op basis van `source_entity` + `$select` uit actieve `tb_columns`.
2. Nieuwe migratie voor vendors/items registratie in `tb_tables`, `tb_columns`, `tb_relations` en `tb_sync_state`.
3. Data model-admin uitgebreid met entiteit-tabs (`Inkooporders`, `Leveranciers`, `Artikelen`) en hergebruik van bestaande kolomconfig + sync-filter.
4. ER-overzicht toont 1:n-relatie (PO header -> lines) plus n:1-lookuprelaties naar vendors/items.
5. Lookup-kolommen worden read-only verrijkt in de leeslaag vanuit `tb_cache`.
6. Testdekking uitgebreid (backend services) + versie verhoogd.

## Belangrijke technische notities

- Migratiebestand is `021_tb_vendors_items_lookup.sql` omdat `020` al in gebruik was in `develop`.
- Migratie is idempotent (`IF NOT EXISTS`) en non-destructief.
- Item lookup gebruikt `SearchName` met `ProductSearchName` als fallback in de mapper.

## Gewijzigde kernbestanden

- `server/services/D365ODataService.js`
- `server/services/TableDataService.js`
- `scripts/db/migrations/021_tb_vendors_items_lookup.sql`
- `src/components/admin/datamodel/AdminDataModel.jsx`
- `src/components/admin/datamodel/DataModelDiagram.jsx`
- `src/components/admin/datamodel/DataPreviewTables.jsx`
- `src/hooks/useDataModelAdmin.js`
- `src/hooks/useSyncFilters.js`
- `server/services/D365ODataService.test.js`
- `server/services/TableDataService.test.js`

## Validatie

- `npm test` -> geslaagd
- `npm run build` -> geslaagd

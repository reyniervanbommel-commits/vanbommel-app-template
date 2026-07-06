# ADR-004: Generic D365 entity datamodel with cache lookups

**Datum:** 2026-07-06  
**Status:** Geaccepteerd  
**Tags:** d365, table-builder, datamodel, lookup, cache  
**DevOps Feature:** #195

---

## Context

De Data model-admin was in de praktijk vooral geoptimaliseerd voor Purchase Orders, terwijl feature #195 vendors en items als volwaardige entiteiten toevoegt. Tegelijk moest het PO-bord read-only verrijking krijgen met vendor- en itemnamen zonder extra D365-requests per rij.

Daarmee ontstonden twee kernproblemen:

1. De sync/payload-opbouw moest niet langer impliciet alleen op PO-velden leunen.
2. Lookupverrijking op het bord moest schaalbaar en cache-gedreven blijven.

## Beslissing

We hebben de volgende architectuurbeslissingen genomen:

1. D365-entiteiten worden in de `tb_*`-laag geregistreerd (`tb_tables`, `tb_columns`, `tb_relations`) en gesynct via generieke fetchlogica op `source_entity`.
2. Vendors en items worden als aparte entiteiten gemodelleerd met eigen sync-state en kolomconfiguratie.
3. Lookupverrijking op PO gebeurt via `fk_join`-relaties en `tb_cache`, niet via extra live D365-calls per boardrij.
4. De admin-datamodel UI is entiteit-gedreven (PO, Vendors, Items) met hergebruik van bestaande kolom/syncfilter-componenten.
5. Het ER-overzicht toont zowel 1:n (header-line) als n:1 lookup-relaties naar doelentiteiten.

## Alternatieven overwogen

| Optie | Reden afgewezen |
|-------|-----------------|
| PO-specifieke adapters uitbreiden met extra hardcoded branches | Schaalde slecht bij nieuwe entiteiten en verhoogde onderhoudslast |
| Lookupwaarden live opvragen uit D365 bij renderen van het bord | Te duur qua latency en request-volume, plus extra foutkans |
| Vendors/items als extra kolommen in PO-cache opslaan zonder eigen entiteit | Verlies van beheerbaarheid (geen eigen sync/kolombeheer per entiteit) |

## Gevolgen

Positief:

- Entiteit-onafhankelijker datamodel in admin.
- Betere uitbreidbaarheid voor nieuwe D365-entiteiten.
- Lookupverrijking blijft snel en voorspelbaar door cache-gebruik.

Negatief / trade-offs:

- Meer metamodel-configuratie (migraties en relatiebeheer).
- Eerste setup voor nieuwe entiteiten vraagt expliciete seeding in migraties.

## Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `scripts/db/migrations/021_tb_vendors_items_lookup.sql` | Nieuwe entiteiten/kolommen/relaties/sync-state seeded |
| `server/services/D365ODataService.js` | Generieke entity-fetch toegevoegd naast PO-flow |
| `server/services/TableDataService.js` | Vendors/items adapters + lookup-resolutie gebruikt in read-path |
| `src/components/admin/datamodel/AdminDataModel.jsx` | Entiteit-tabs voor PO, vendors en items |
| `src/components/admin/datamodel/DataModelDiagram.jsx` | Diagram gegeneraliseerd naar lookup-entiteiten en relaties |
| `src/components/admin/datamodel/DataPreviewTables.jsx` | Entiteit-gedreven tabelopbouw (PO vs single-entity) |
| `src/hooks/useDataModelAdmin.js` | Datamodelbeheer per tableKey |

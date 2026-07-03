# Vendors & Items als entiteiten op de Data model-pagina (tb_*-laag) (DevOps)

**Work item:** [#AB:161](https://dev.azure.com/reyniervanbommel0745/Vendor-App/_workitems/edit/161) (User Story, child van Feature #130)

**Doel:** Voeg de entiteiten Vendors en Items toe aan de Data model-pagina via de generieke `tb_*`-laag, met fk_join lookup-verrijking van Purchase Orders (vendor-naam op de header, item-omschrijving op de line).
**Referentie in repo:** [.cursor/plans/dev_2026-07-03-datamodel-vendors-items-tb.plan.md](../.cursor/plans/dev_2026-07-03-datamodel-vendors-items-tb.plan.md)
**Parent:** Feature #130 — D365 Purchase Orders
**Tags:** d365; odata; table-builder; data-model; vendors; items

---

## User story

**Als** admin die de D365-datakoppeling beheert
**wil ik** Vendors en Items als aparte entiteiten op de Data model-pagina kunnen syncen en configureren, en hun gegevens als lookup zien op de Purchase Orders
**zodat** ik vendor-naam en item-omschrijving in de PO-tabel heb zonder handmatig werk, en de datamodel-pagina niet langer aan één hardcoded tabel vastzit.

---

## Acceptatiecriteria (definitie van "klaar")

1. Vendors (`/data/VendorsV2`) en Items (`/data/ReleasedProductsV2`) zijn geregistreerd in de `tb_*`-laag en synchroniseren via de generieke provider (geen PO-specifieke fetch-adapter meer).
2. De Data model-pagina toont beide nieuwe entiteiten met kolomconfiguratie (zichtbaarheid + write-back-toggles) en sync-filter, via een entiteit-kiezer.
3. Op de Purchase Orders verschijnt vendor-naam (`VendorOrganizationName`) op de header en item-omschrijving op de line als read-only afgeleide kolommen, gevoed uit de cache (geen extra D365-call per rij).
4. Een ER-overzicht bovenaan de pagina toont de entiteiten met hun relaties (PO 1:n lines; PO n:1 vendor; line n:1 item).
5. De bestaande PO-flow blijft ongewijzigd werken; migratie 015 is idempotent en non-destructief.
6. Backend- en frontend-tests dekken de provider-fetch, fk_join-resolutie en de registry-gedreven pagina; versie verhoogd in `src/config/version.js`.

---

## Wat is al gedaan (geen DevOps-tasks meer nodig tenzij verificatie)

| Item | Locatie |
|------|---------|
| Generiek `tb_*`-metamodel (tabellen, kolommen, relaties, cache) | scripts/db/migrations/011_tb_metamodel.sql |
| Generieke datalaag + `/api/data/:tableKey`-route | server/services/TableDataService.js, server/routes/data.js |
| Bestaande vendor-lookup bij fetch (VendorsV2, join op VendorAccountNumber) | server/services/D365ODataService.js:369-401 |
| Herbruikbare UI: EntityConfigTable, SyncFilterBuilder, (ongebruikte) DataModelDiagram | src/components/admin/datamodel/ |

---

## Koppeling (bevestigd tegen de code)

| Relatie | Van (bron-veld) | Naar (doel-key) | Partition | Verrijkingsveld |
|---------|-----------------|-----------------|-----------|-----------------|
| PO → Vendor (n:1) | header `OrderVendorAccountNumber` | Vendor `VendorAccountNumber` | `dataAreaId` | `VendorOrganizationName` |
| PO-line → Item (n:1) | line `ItemNumber` | Item `ItemNumber` | `dataAreaId` | `SearchName` (fallback `ProductSearchName`) — `ProductName` bestaat NIET |

---

## Backlog — tasks

- [ ] **Fase 1** — Generieke `D365ODataProvider` (fetch op `source_entity` + `$select` uit `tb_columns`); vervangt de PO-only `FETCH_ADAPTERS` in TableDataService.
- [ ] **Fase 2** — Migratie 015: seed `tb_tables`/`tb_columns` voor `vendors` + `items`; `tb_relations` naar meerdere relaties per tabel + `fk_join`-seeds PO→vendor en PO.line→item.
- [ ] **Fase 3** — `TableDataService.read()` resolvet fk_join tegen `tb_cache` van vendors/items → read-only afgeleide kolommen (vendorName, itemDescription).
- [ ] **Fase 4** — `DataPreviewTables` data-gedreven (registry-loop) + entiteit-kiezer (TabList); EntityConfigTable/SyncFilterBuilder ongewijzigd hergebruiken.
- [ ] **Fase 5** — `DataModelDiagram` generaliseren naar N nodes met 1:n (expand) + n:1 (fk_join) relatielijnen.
- [ ] **Afronding** — Tests (provider-fetch, fk_join-resolutie, registry-pagina) + versie verhogen.

---

## Beslissingen / aandachtspunten

- **Vendor-entiteit = `VendorsV2`** (EntityType `VendorV2`, akkoord gebruiker): velden `VendorAccountNumber`/`VendorOrganizationName` bevestigd. Key = `dataAreaId, VendorAccountNumber` ✓.
- **Item-entiteit = `ReleasedProductsV2`** (EntityType `ReleasedProductV2`): key = `dataAreaId, ItemNumber` ✓ (geverifieerd tegen `$metadata` 2026-07-03). ⚠️ `ProductName` bestaat NIET; item-naam = **`SearchName`** (fallback `ProductSearchName`).
- `tb_relations` `UQ_tb_relations_table` (1 relatie per tabel) moet vervangen worden om PO zijn 3 relaties te geven.
- Twee extra syncs verhogen D365-load: `cache_mode='auto'` + ruimere `stale_minutes` voor vendors/items.

---

## Versie document

Aangemaakt op basis van [.cursor/plans/dev_2026-07-03-datamodel-vendors-items-tb.plan.md](../.cursor/plans/dev_2026-07-03-datamodel-vendors-items-tb.plan.md); wijzig dit bestand bij nieuwe afspraken.

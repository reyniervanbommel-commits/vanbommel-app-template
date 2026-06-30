# D365 PO — Generieke kolompicker, filters & entiteit-registry (DevOps)

**Doel:** entiteit- en kolom-selectie data-gedreven maken (admin cureert D365-velden + labels), met per-kolom filters, opslaanbare filtersets en een generiek datagrid dat met meerdere entiteiten werkt.
**Referentie in repo:** [docs/plans/dev_2026-06-29-d365-po-platform-samengevoegd-plan.md](../plans/dev_2026-06-29-d365-po-platform-samengevoegd-plan.md)
**Sluit aan op:** [130-d365-po-cache.md](130-d365-po-cache.md) — dit is de kolompicker/filter-helft (Fase 6–8) onder Feature #AB:130.
**Work items:** Feature #AB:130 → Stories #AB:139 (Fase 6), #AB:141 (Fase 7), #AB:140 (Fase 8).
**Tags:** d365; odata; kolompicker; filters; filtersets; generiek; multi-entiteit

---

## User story

**Als** beheerder/medewerker die met D365-data werkt
**wil ik** zelf kunnen bepalen welke D365-entiteiten en -velden in beeld komen, met labels, filters en opslaanbare filtersets
**zodat** ik zonder code-wijziging de juiste kolommen zie, gericht kan filteren, en later eenvoudig nieuwe entiteiten kan toevoegen.

---

## Acceptatiecriteria (definitie van "klaar")

1. Entiteit-selectie is data-gedreven (registry), niet meer hardcoded in `D365ODataService.js`.
2. Admin cureert uit álle D365-velden (via `$metadata`) een pool met vriendelijke NL-labels.
3. Per-kolom filters + opslaanbare filtersets (privé per gebruiker + admin kan delen).
4. Minimaal één tweede entiteit (bijv. Vendors) is via alléén configuratie toe te voegen.

---

## Wat is al gedaan (geen DevOps-tasks meer nodig tenzij verificatie)

| Item | Locatie |
|------|---------|
| Uniforme kolom-registry `po_columns` (D365 + eigen kolommen) | [scripts/db/migrations/007_purchase_orders_cache.sql](../../scripts/db/migrations/007_purchase_orders_cache.sql) |
| `$metadata`-verificatie + script | [scripts/d365/inspect-metadata.mjs](../../scripts/d365/inspect-metadata.mjs), [131-fase0-bevindingen.md](131-fase0-bevindingen.md) |
| Bestaande (hardcoded) entiteit-keuzes om te generaliseren | [server/services/D365ODataService.js](../../server/services/D365ODataService.js) — `$expand=PurchaseOrderLines` + `/data/VendorsV2` |

---

## Backlog — child User Stories

### Story #AB:139 — Fase 6: Generieke entiteit-registry + metadata-discovery + admin kolompicker
**Beschrijving:** entiteit-selectie data-gedreven maken i.p.v. hardcoded (nu zitten `PurchaseOrderLines`-expand en `VendorsV2` vast in `D365ODataService.js`); admin cureert uit alle D365-velden een pool met NL-labels.
**Acceptatiecriteria:**
1. Tabel `odata_entities` (entity_key, odata_path, line nav-property, key-velden); lines-expand en vendors-pad uit de code naar deze registry.
2. `D365MetadataService`: haalt en cachet `$metadata`, levert per entiteit alle header- en regelvelden.
3. Admin-UI `AdminODataColumns`: kies D365-velden (header + regel) + vriendelijk NL-label + default-zichtbaarheid; opgeslagen in de uniforme `po_columns`-registry.
4. Endpoints achter `requireRole('admin')`; muteren geaudit.

### Story #AB:141 — Fase 7: Generieke projectie + per-kolom filters + filtersets + paginering
**Beschrijving:** projectie en filtering generiek maken o.b.v. de gecureerde kolommen, met opslaanbare filtersets en echte paginering.
**Acceptatiecriteria:**
1. `buildPurchaseOrderUrl` generiek: `$select`/`$expand` o.b.v. de gecureerde kolommen (kleinere payload).
2. Per-kolom filters client-side op de geladen cache; "volledig zoeken in D365" vertaalt naar server-side `$filter` (whitelist op veld + operator, literals escapen).
3. Opslaanbare filtersets: privé per gebruiker + admin kan delen (`odata_filter_sets`).
4. Echte server-side paginering (vervangt de huidige cap-aanpak in de UI).

### Story #AB:140 — Fase 8: Tweede entiteit (bv. Vendors) via alleen configuratie
**Beschrijving:** bewijs dat het generieke ontwerp werkt door een tweede entiteit puur via configuratie toe te voegen.
**Acceptatiecriteria:**
1. Een tweede D365-entiteit (bv. Vendors) toevoegbaar via alleen configuratie (`odata_entities` + kolompicker), zonder nieuwe code.
2. Het generieke datagrid toont die entiteit met dynamische kolommen, filters en (indien van toepassing) master-detail.
3. Bewijst dat entiteit-uitbreiding config-werk is, geen code-werk.

---

## Versie document

Aangemaakt op basis van [docs/plans/dev_2026-06-29-d365-po-platform-samengevoegd-plan.md](../plans/dev_2026-06-29-d365-po-platform-samengevoegd-plan.md); wijzig dit bestand bij nieuwe afspraken.

Repo-document: docs/devops/139-kolompicker-filters-generiek.md

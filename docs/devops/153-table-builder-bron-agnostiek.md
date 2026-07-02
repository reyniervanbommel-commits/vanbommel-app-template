# Table Builder — bron-agnostieke herijking (DevOps)

**Doel:** de generieke tabel-laag losmaken van D365 als enige bron. Een beheerder stelt op de admin-pagina tabellen samen (bron → entiteit → velden cureren → relatie → publiceren) zonder code, voor D365 én niet-D365-bronnen (SQL-views, REST).
**Referentie in repo:** [docs/plans/dev_2026-06-30-generieke-table-builder-architectuur.md](../plans/dev_2026-06-30-generieke-table-builder-architectuur.md)
**Bouwt voort op:** [139-kolompicker-filters-generiek.md](139-kolompicker-filters-generiek.md) (Fase 6–8) en [130-d365-po-cache.md](130-d365-po-cache.md).
**Work items:** Feature #AB:130 → #AB:152 (Fase A), #AB:139 (Fase B), #AB:141 (Fase C), #AB:140 (Fase D), #AB:153 (Fase E), **#AB:160 (Fase F, nieuw)**.
**Tags:** table-builder; source-provider; metamodel; generiek; bron-agnostiek

---

## Vastgelegde besluiten (2026-06-30)

1. **Bron-agnostische provider-abstractie in scope.** "Generiek" = niet alleen meer D365-entiteiten, maar ook niet-D365-bronnen (SQL-views, REST). D365 OData wordt één `SourceProvider`-connector via een dunne interface (`discoverFields` / `fetch` / `capabilities` / `writeField`).
2. **Bron-neutrale naamgeving `tb_*`** vervangt het eerder voorgestelde `odata_*`. Er is nog niets generieks gebouwd (alleen `po_*`), dus geen migratiekosten.

### Naam-mapping t.o.v. het samengevoegde plan
| Samengevoegd plan (`odata_*`) | Dit spoor (`tb_*`) |
|---|---|
| `odata_entities` | `tb_tables` (+ `tb_sources`, `tb_relations`) |
| `odata_columns` | `tb_columns` (`source`/`custom`, `master`/`detail`) |
| `odata_cache` | `tb_cache` |
| `odata_custom_values` | `tb_custom_values` |
| `odata_filter_sets` | `tb_filter_sets` |
| `odata_field_corrections` | `tb_field_corrections` |
| `ODataCacheService` | `TableDataService` |
| `AdminODataColumns` (kolompicker) | `<TableBuilder>` (wizard) |
| — | `SourceProvider` + `D365ODataProvider` / `SqlViewProvider` / `RestProvider` |

`header/line` → `master/detail`; `d365/custom` → `source/custom`.

---

## Fasering (onder Feature #AB:130)

| Fase | Work item | Inhoud |
|------|-----------|--------|
| A | #AB:152 | `tb_*`-metamodel + seed PO-tabel + `TableDataService` (generalisatie cacheservice) |
| B | #AB:139 | `SourceProvider`-interface + `D365ODataProvider` + `$metadata`-discovery + admin `<TableBuilder>` |
| C | #AB:141 | Generieke projectie/filters via provider (capability-gedreven) + filtersets + paginering |
| D | #AB:140 | Tweede D365-entiteit (Vendors) puur via config |
| E | #AB:153 | `SqlViewProvider` — tabel op SQL-view zonder D365 (bewijs bron-agnostiek) |
| **F** | **#AB:160** | **Lookup-/verrijkingskolommen (many-to-one join naar referentie-entiteit) — generaliseert de hardcoded vendor-verrijking** |
| G | #AB:135/#AB:136 | Per-gebruiker zichtbaarheid + tests + OTAP-runbook + versie-bump |

---

## Story #AB:153 — Fase 8b: SqlViewProvider (bewijs bron-agnostiek)

**Beschrijving:** bewijst dat de provider-abstractie niet lekt — dezelfde TableBuilder + generiek datagrid tonen een tabel uit een lokale SQL-view zonder enige D365-/OData-code.
**Acceptatiecriteria:**
1. `SqlViewProvider` implementeert `SourceProvider`: `discoverFields` via `INFORMATION_SCHEMA.COLUMNS`, `fetch` via parametrized SELECT op een whitelisted view, `capabilities` met `needsCache=false`.
2. Tabel toevoegbaar via de TableBuilder met `provider_type=sql_view` — puur configuratie.
3. Generiek datagrid toont de tabel met dynamische kolommen, filters, app-native kolommen + per-gebruiker zichtbaarheid.
4. Injectieveilig: whitelisted views, parametrized queries, veld+operator-whitelist.
5. Geen laag boven de provider kent D365 (bron-agnostiek geverifieerd).

---

## Story #AB:160 — Fase F: lookup-/verrijkingskolommen (many-to-one)

**Context / afbakening.** In de wizard koppelt **stap 4 "Detail-relatie" alleen een one-to-many master→detail** (één order → meerdere orderregels als geneste detailrijen). Dat is géén mechanisme om een referentietabel (bv. Vendors) te koppelen die **extra kolommen** aan de master-rij toevoegt. Die many-to-one "lookup/verrijking" is een apart concept en bestaat nog niet generiek.

**Huidige stand (het bouwmateriaal is er al, maar hardgecodeerd):**
- Werkende, PO-specifieke vendor-verrijking buiten `tb_*`: `D365ODataService.fetchVendorsByAccounts()` (many-to-one call naar `/data/VendorsV2` op `VendorAccountNumber`) en de merge in `fetchPurchaseOrders()` die `vendorName/vendorGroup/vendorEmail/vendorPhone` aan de order hangt.
- In het TB-pad projecteert `TableDataService` (`purchaseOrdersFetch`) daarvan momenteel alleen `vendorAccount`/`vendorName`; `vendorGroup/email/phone` gaan verloren.
- `tb_columns.source` kent alleen `source`/`custom`; `tb_relations` modelleert uitsluitend master→detail (`relation_kind` `expand`/`fk_join`/`none`) en is UNIQUE per tabel. `join_keys_json` wordt wél gelezen maar nergens toegepast. Er is dus geen datamodel voor many-to-one referentiekolommen.

**Doel:** een beheerder koppelt in de TableBuilder een **referentie-entiteit** aan een tabel en kiest welke velden daarvan als **extra master-kolommen** verschijnen — puur configuratie, en dit vervangt de hardcoded vendor-verrijking.

**Acceptatiecriteria:**
1. **Datamodel** voor many-to-one lookups, náást (niet in) `tb_relations` — dat model is one-to-many en UNIQUE-per-tabel, dus ongeschikt. Keuze uit:
   - een `tb_lookups`-tabel (per tabel 0..N referenties: ref-`tb_source`/entity, join-key master→ref, veld-mapping ref-veld → master-kolomnaam/label), óf
   - `source='lookup'` op `tb_columns` (CHECK uitbreiden) met de join-config per kolom.
   Meerdere referenties per tabel moeten mogelijk zijn (many-to-one heeft eigen cardinaliteit, 0..N per tabel).
2. **Resolve tijdens refresh** in `TableDataService`: referentie-records batch ophalen op de join-key (dedup) en de gekozen velden in de master-`data_json` projecteren — config-gedreven equivalent van `fetchVendorsByAccounts`, via de `SourceProvider`-interface (dus ook voor niet-D365-referentiebronnen).
3. **Wizard-stap** "Lookup/verrijking" (los van stap 4 Detail-relatie): referentie-entiteit kiezen, join-key mappen, ref-velden → master-kolommen selecteren.
4. **Migratiepad:** de bestaande PO-vendor-verrijking wordt via deze config gereproduceerd (incl. de nu-verloren `vendorGroup/email/phone`); de hardcoded `fetchVendorsByAccounts`-merge kan daarna vervallen of dunner.
5. De lookup-kolommen gedragen zich als gewone (readonly, source-afkomstige) kolommen in filters, projectie en per-gebruiker zichtbaarheid.

**Volgt op Fase C (provider-fetch/projectie) en Fase D (Vendors-config); Fase D levert Vendors als bron, deze fase gebruikt Vendors als lookup-referentie i.p.v. aparte tabel.**

---

## Openstaand (fase-gating, niet-blokkerend voor Fase A)

- Relatie-diepte: v1 = 1 master → 1 detail (zoals PO→lines).
- Write-back voor SQL-bronnen (UPDATE) of D365-only.
- UI-navigatie van nieuwe tabellen (dynamische lijst uit `tb_tables` vs admin wijst menu-plek toe).
- **Blocker:** session-store-hang in de container moet weg vóór preview-validatie van `/api/data/*`.

---

Repo-document: docs/devops/153-table-builder-bron-agnostiek.md

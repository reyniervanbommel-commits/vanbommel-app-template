# Architectuurplan: Generieke Table Builder

> **Status:** concept ter ontwikkeling — architectuurvoorstel (senior-architect perspectief)
> **Datum:** 2026-06-30
> **Auteur-context:** opgesteld n.a.v. de wens om de tabel los te koppelen van Purchase Order header/lines en een admin-gestuurde *table builder* te maken die generiek werkt (niet alleen PO's).
> **Bouwt voort op / herijkt:**
> - [dev_2026-06-29-d365-po-platform-samengevoegd-plan.md](dev_2026-06-29-d365-po-platform-samengevoegd-plan.md) — de D365-gekoppelde generalisatie (`odata_*`, Fase 6–8)
> - [dev_d365-po-cache-annotatielaag-plan.md](dev_d365-po-cache-annotatielaag-plan.md) — de **gebouwde** PO-laag (`po_*`)
> **DevOps:** Feature **#130** (stories #131–#134 **Closed**, #135/#136/#139/#140/#141/#152 **New**), Feature **#142** (tech-debt).
> **Tags:** table-builder; metamodel; source-providers; generiek; multi-entiteit; d365; odata; admin

---

## 0. TL;DR voor de haastige lezer

De tabel zit nu vast aan **D365 Purchase Order header + lines**. We willen op de admin-pagina een **table builder**: een beheerder definieert daar — zónder code — *welke tabel(len)* de app toont, *uit welke bron*, *welke kolommen*, met *welke labels/typen/filters* en *welke master-detail-relatie*.

Het bestaande roadmap-spoor (#139/#152) generaliseert al richting "meerdere D365-entiteiten via een registry". Dit plan zet daar één architectuurlaag bovenop die het **echt** generiek maakt: een **bron-onafhankelijk metamodel** + een **provider-interface**, waarbij D365 OData *één* connector is in plaats van *hét* model. Daardoor kan dezelfde table builder later ook een SQL-view of een REST-API ontsluiten — puur configuratie.

Omdat er nog **niets** generieks is gebouwd (alleen `po_*`), is dit hét moment om bron-neutrale namen (`tb_*`) en de juiste abstractie te kiezen, vóór we ons in `odata_*` vastleggen.

**Vastgelegde kernbeslissingen (afgestemd 2026-06-30):**
1. **De provider-abstractie komt nu in scope** — D365 OData is de eerste connector, maar **niet-D365-bronnen (SQL-views, REST) horen expliciet bij het doel**. "Generiek" betekent hier bron-agnostisch, niet alleen multi-entiteit binnen D365. → Fase E (`SqlViewProvider`) is **in scope**, geen optie.
2. **Bron-neutrale naamgeving `tb_*`** — vervangt de eerder voorgestelde `odata_*`-naamgeving uit het samengevoegde plan.

---

## 1. Doel

**Als** beheerder
**wil ik** op de admin-pagina tabellen samenstellen (bron kiezen, velden ontdekken, kolommen cureren met labels/typen/filters, een detail-relatie leggen)
**zodat** de app nieuwe datatabellen toont **zonder code-wijziging** — vandaag D365 Purchase Orders, morgen Vendors, overmorgen een SQL-view of REST-bron.

Niet-doelen (nu):
- Geen rapportage-/pivot-engine (dit is een **lijst/grid-builder**, geen BI-tool).
- Geen visuele query-designer met joins over willekeurige bronnen (relaties zijn 1 master → N detail, binnen één bron).
- Geen AI/LLM in het datapad (conform doc 76).

---

## 2. Wat er nú is (feitelijk, geverifieerd in code)

### 2.1 Gebouwd en PO-specifiek
| Laag | Bestanden | Aard |
|------|-----------|------|
| Presentatie (generiek) | [DataTable.jsx](../../src/components/shared/DataTable.jsx), `EditableCell.jsx` | Al kolom-config-gedreven, type-aware (text/date/status/number/boolean/select) |
| Presentatie (PO-specifiek) | [PurchaseOrdersBoardTable.jsx](../../src/components/supplier/PurchaseOrdersBoardTable.jsx), [PurchaseOrdersSubitemsTable.jsx](../../src/components/supplier/PurchaseOrdersSubitemsTable.jsx) | Status-groepering + master-detail expand + inline edit + nieuw/gewijzigd-highlight |
| Kolompicker (zichtbaarheid) | [PurchaseOrderColumnsDialog.jsx](../../src/components/supplier/PurchaseOrderColumnsDialog.jsx), [PurchaseOrderColumnHeader.jsx](../../src/components/supplier/PurchaseOrderColumnHeader.jsx), [PurchaseOrderAddColumnDialog.jsx](../../src/components/supplier/PurchaseOrderAddColumnDialog.jsx) | Toggle zichtbaarheid, eigen kolom toevoegen, hernoemen/soft-delete |
| Hook | [usePurchaseOrdersPage.js](../../src/hooks/usePurchaseOrdersPage.js) | `visibleColumnKeys`, `columnOrder`, add/rename/remove/saveValue |
| Bron-client | [D365ODataService.js](../../server/services/D365ODataService.js) | **Hard gekoppeld** aan `PurchaseOrderHeadersV2`/`Lines` + VendorsV2-verrijking |
| Cache + merge | [D365PurchaseOrderCacheService.js](../../server/services/D365PurchaseOrderCacheService.js) | refresh → cache; read → cache + `po_columns` + `po_custom_values`; hash-based change-detect |
| Routes | [purchaseOrders.js](../../server/routes/purchaseOrders.js), [supplier.js](../../server/routes/supplier.js) (board-settings), [admin.js](../../server/routes/admin.js) (OData-settings) | PO-specifiek pad |
| Admin-UI | [AdminODataSettings.jsx](../../src/components/admin/AdminODataSettings.jsx) | **Alleen connectie-/scope-config**; nog géén kolompicker/table-builder |
| Data | `po_columns`, `po_cache_headers`, `po_cache_lines`, `po_custom_values`, `po_sync_state`, `po_user_view_state` (migr. 007–009) | PO-specifiek |
| Data (al generiek!) | `user_board_settings` (migr. 006, `board_key`) + `app_settings` (key-value) | **Bron-neutraal — herbruiken** |

### 2.2 Al gepland maar nog níet gebouwd (D365-gekoppeld)
Uit het [samengevoegde plan](dev_2026-06-29-d365-po-platform-samengevoegd-plan.md) en DevOps:
- **#152** — generaliseer `po_*` → `odata_*` met `entity_key`
- **#139** — `odata_entities`-registry + `D365MetadataService` (`$metadata`-discovery) + admin-kolompicker `AdminODataColumns`
- **#141** — generieke projectie (`$select`/`$expand`) + per-kolom filters + filtersets + paginering
- **#140** — tweede entiteit (Vendors) puur via configuratie

> **Belangrijk:** deze stories generaliseren wél naar *meerdere entiteiten*, maar nog steeds **binnen D365 OData**. De tabelvorm, de cache en de projectie nemen aan dat de bron een OData-endpoint met `$metadata`/`$select`/`$expand` is. Dit plan trekt die aanname één niveau hoger.

### 2.3 Gunstige fundamenten die we niet weggooien
1. **`po_columns` is al een uniforme registry** (`d365` + `custom`, `header`/`line`, getypeerd). Het metamodel hieronder is de generalisatie ervan.
2. **`user_board_settings.board_key`** is al bron-neutraal — wordt direct `entity_key`/`table_id`.
3. **`DataTable`/`EditableCell`** zijn al config-gedreven — de presentatielaag is grotendeels klaar voor generiek.
4. **EAV `po_custom_values`** is precies het juiste patroon voor app-native kolommen op willekeurige rijen.

**Conclusie:** ~60% van de generieke bouwstenen bestaat al, maar (a) PO-specifiek benoemd en (b) zonder bron-abstractie. De taak is **abstraheren + één keer goed benoemen**, niet from-scratch bouwen.

---

## 3. De architectuurkeuze die dit plan toevoegt

### 3.1 Het probleem met het huidige spoor
De `odata_*`-richting maakt het **multi-entiteit** maar laat de **bron** impliciet (= altijd D365 OData). Dat is een leaky abstraction: zodra iemand een tabel wil op een SQL-view (bv. een lokale `vw_open_facturen`) of een externe REST-bron, moet de hele cache-/projectielaag opnieuw.

### 3.2 De oplossing: scheid *definitie*, *bron* en *presentatie*
Drie strikt gescheiden lagen met een dunne interface ertussen:

```
┌─────────────────────────────────────────────────────────────────────┐
│  DEFINITIE-LAAG (metamodel, in SQL — bron-neutraal)                   │
│  tb_tables · tb_columns · tb_relations · tb_sources                   │
│  "Wat is een tabel, welke kolommen, welke detail-relatie, welke bron" │
└───────────────┬─────────────────────────────────────┬────────────────┘
                │ definitie                            │ definitie
                ▼                                       ▼
┌───────────────────────────────┐        ┌────────────────────────────────┐
│  BRON-LAAG (providers)         │        │  PRESENTATIE-LAAG               │
│  SourceProvider-interface:     │        │  Generiek <DataGrid> gedreven   │
│   • discover() → velden        │        │  door tabel-definitie + prefs   │
│   • fetch(query) → rijen       │        │  Admin <TableBuilder> bewerkt   │
│   • capabilities()             │        │  de definitie-laag              │
│  Implementaties:               │        └────────────────────────────────┘
│   • D365ODataProvider (eerst)  │                     ▲
│   • SqlViewProvider (later)    │                     │ /api/data/:tableId
│   • RestProvider (later)       │        ┌────────────┴───────────────────┐
└───────────────┬───────────────┘        │  SERVE-LAAG (generiek)          │
                │ rijen                    │  read = cache + custom + prefs  │
                ▼                          │  + filters; write-back via prov │
┌───────────────────────────────┐        └─────────────────────────────────┘
│  MATERIALISATIE-LAAG (cache)   │
│  tb_cache (optioneel per bron) │
│  tb_custom_values (EAV, altijd)│
└───────────────────────────────┘
```

**De kerngedachte:** een *tabel* is een definitie die naar een *bron* wijst via een *provider*. De provider weet hoe je voor díe bron velden ontdekt en rijen ophaalt. Alles erboven (cache, custom-kolommen, filters, prefs, grid, builder) is **bron-onafhankelijk**.

### 3.3 Capability-onderhandeling (waarom dit elegant blijft)
Bronnen verschillen in wat ze kunnen. De provider declareert capabilities; de generieke lagen gedragen zich adaptief:

| Capability | D365 OData | SQL-view | Statische lijst |
|------------|:----------:|:--------:|:---------------:|
| `discoverFields` (metadata) | ✓ (`$metadata`) | ✓ (INFORMATION_SCHEMA) | ✓ (uit data) |
| `serverFilter` | ✓ (`$filter`) | ✓ (WHERE) | ✗ → client-side |
| `serverPaging` | ✓ (`$top/$skip`) | ✓ (OFFSET/FETCH) | ✗ |
| `masterDetail` | ✓ (`$expand`) | ✓ (FK-join) | ⚠ config |
| `writeBack` | ✓ (PATCH/Action) | ⚠ (UPDATE, mits toegestaan) | ✗ |
| `needsCache` | ✓ (traag, 504-risico) | ✗ (al lokaal/snel) | ✗ |

`needsCache=false` betekent: de serve-laag leest **direct** via de provider, geen `tb_cache`. Dat hoeft niet hetzelfde pad te zijn als D365. **Custom-kolommen (EAV) en prefs werken in álle gevallen**, want die liggen lokaal naast de brondata.

---

## 4. Het metamodel (definitie-laag)

Bron-neutrale tabellen, prefix `tb_` (table builder). Migraties in [scripts/db/migrations/](../../scripts/db/migrations/), idempotent (`IF NOT EXISTS`), conform projectconventie.

> **Naamgevingsbesluit:** we kiezen `tb_*` i.p.v. het in het samengevoegde plan voorgestelde `odata_*`. Reden: `odata_` lekt de bron in de naam, terwijl het metamodel bron-neutraal is. Dit **vervangt** de `odata_*`-naamgeving uit §3 van het samengevoegde plan (er is nog niets generieks gebouwd, dus geen migratiekosten).

### 4.1 `tb_sources` — bronnen-registry
Een herbruikbare bronverbinding (kan door meerdere tabellen gedeeld worden).
- `id` (PK), `key` (slug, uniek, bv. `d365-acc`), `label`
- `provider_type` (`d365_odata` | `sql_view` | `rest`) — bepaalt welke provider-implementatie
- `config_json` — provider-specifiek (bv. D365: base_url/company; SQL: connection-ref/schema; REST: base+auth-ref)
- `secret_ref` — verwijst naar een secret-key in `app_settings` (geheimen **nooit** in `config_json`)
- `is_active`, audit-kolommen
- *Migratie:* hergebruikt de bestaande D365-connectie-instellingen uit `app_settings` als eerste `tb_sources`-rij (`provider_type=d365_odata`).

### 4.2 `tb_tables` — tabel-definitie (vervangt het impliciete "PO-board")
- `id` (PK), `key` (slug, uniek, bv. `purchase-orders`) — wordt `board_key` voor prefs
- `label` (NL, admin), `description`
- `source_id` → `tb_sources.id`
- `source_entity` — bron-specifieke entiteitsaanduiding (D365: `/data/PurchaseOrderHeadersV2`; SQL: `vw_x`; REST: pad)
- `key_fields` (comma-sep natuurlijke sleutel, altijd meenemen)
- `default_filter_json` — vaste scope (bv. `dataAreaId eq 'WHSL'`), bron-neutraal beschreven, door provider vertaald
- `cache_mode` (`auto` | `always` | `never`) — override op provider-`needsCache`
- `stale_minutes` (default 15), `max_rows` (cap)
- `is_active`, `sort_order`, audit-kolommen

### 4.3 `tb_columns` — uniforme kolom-registry (generalisatie van `po_columns`)
Eén registry voor **bron-velden én app-native (custom) kolommen**.
- `id` (PK), `table_id` → `tb_tables.id`, `scope` (`master` | `detail`) *(generaliseert `header`/`line`)*
- `key` (slug, uniek per `table_id`+`scope`), `label` (NL, admin)
- `source` (`source` | `custom`) *(was `d365`/`custom`)*
- `source_field` — technische bronveldnaam bij `source=source` (D365-veld / SQL-kolom / REST-jsonpath), anders NULL
- `data_type` (`text` | `number` | `date` | `boolean` | `select`) — bij bron afgeleid uit discovery
- `options_json` (alleen `select`)
- `writable` (bit, **admin-only**) + `write_mechanism` (`patch` | `action` | `sql` | NULL) — alleen zinvol als provider `writeBack` kan
- `is_default_visible` (bit), `filterable` (bit), `sortable` (bit)
- `is_active` (bit, soft-delete), `sort_order`, audit-kolommen
- UNIQUE (`table_id`, `scope`, `key`)

### 4.4 `tb_relations` — master-detail-relatie (maakt "header/lines" generiek)
Modelleert wat nu hardcoded "PO → lines" is.
- `id` (PK), `table_id` → master-`tb_tables.id`
- `detail_source_entity` (bv. `PurchaseOrderLines` nav-property, of SQL detail-view)
- `relation_kind` (`expand` | `fk_join` | `none`)
- `join_keys_json` — koppelvelden master→detail (bij `fk_join`)
- `detail_key_fields`
- 1 master heeft 0..1 detail-relatie (bewust simpel; geen N-niveau-boom in v1)

### 4.5 Materialisatie & app-native data
- **`tb_cache`** — generalisatie van `po_cache_*`. PK `(table_id, scope, partition_key, record_key, detail_key)`; brondata als getypeerde `data_json` (dynamische breedte → geen schema-migratie per veld); hot keys (`record_key`, `partition_key`) geïndexeerd; `source_modified_at` (ETag/ModifiedDateTime), `synced_at`, `first_seen_at`, `content_hash`, `content_changed_at`, `removed_at_source`. Alleen gevuld als `cache_mode≠never`.
- **`tb_custom_values`** — generalisatie van `po_custom_values` (EAV, getypeerd): `column_id`, `table_id`, `scope`, `partition_key`, `record_key`, `detail_key`, `value_text/number/date/bool`. Werkt voor **elke** bron (ligt lokaal).
- **`tb_sync_state`** — generalisatie van `po_sync_state` + `po_user_view_state`: globaal per tabel (`watermark`, `last_full_sync_at`) + per gebruiker (`last_viewed_at`).
- **`tb_filter_sets`** — opslaanbare filtersets (privé per gebruiker; admin deelt): `table_id`, `user_id` (NULL=gedeeld), `name`, `definition_json`, `is_shared`.
- **`tb_field_corrections`** — write-back audit + status (generalisatie van `po_field_corrections`), bron-neutraal.
- **`tb_cell_history`** — append-only cel-geschiedenis (audit trail) voor app-native kolomwaarden: *wie/wat/wanneer* per cel, atomair gevuld via `MERGE … OUTPUT … INTO` in `saveCustomValue`. Samen met `tb_field_corrections` voedt dit één per-cel tijdlijn-popover. Uitgewerkt in [dev_2026-06-30-cel-geschiedenis-audittrail.md](dev_2026-06-30-cel-geschiedenis-audittrail.md) (besluit: gebouwd als onderdeel van Fase A).
- **Herbruik** `user_board_settings` (`board_key = tb_tables.key`) voor per-gebruiker zichtbaarheid + volgorde — **bestaat al, ongewijzigd**.

> EAV blijft het juiste patroon voor app-native kolommen (door gebruikers gedefinieerd). Getypeerde value-kolommen houden sorteren/filteren mogelijk.

---

## 5. De bron-laag (provider-interface)

Eén interface, meerdere implementaties. Pseudocode (JS, conform de bestaande service-stijl):

```js
// server/services/sources/SourceProvider.js  (contract)
class SourceProvider {
  // wat kan deze bron?  → stuurt cache/filter/paging-gedrag aan
  capabilities() { /* { discoverFields, serverFilter, serverPaging,
                          masterDetail, writeBack, needsCache } */ }

  // velden ontdekken voor de admin-kolompicker
  async discoverFields({ source, sourceEntity, relation }) {
     /* → [{ field, dataType, scope, nullable, ... }] (master + detail) */ }

  // rijen ophalen voor refresh/lezen
  async fetch({ source, table, columns, relation, filters, paging }) {
     /* → { rows: [...], total, watermark } — alleen gecureerde velden */ }

  // optioneel: terugschrijven (alleen als capabilities.writeBack)
  async writeField({ source, table, recordKey, detailKey, field, value, etag }) { }
}
```

Implementaties:
- **`D365ODataProvider`** — wrapt de **bestaande** [D365ODataService.js](../../server/services/D365ODataService.js). `discoverFields` = nieuwe `$metadata`-parser (story #139, hergebruik [scripts/d365/inspect-metadata.mjs](../../scripts/d365/inspect-metadata.mjs)); `fetch` = generieke `$select`/`$expand`/`$filter`/`$top`-bouwer i.p.v. de hardcoded PO-URL; `writeField` = PATCH/Action met `If-Match`. `needsCache=true`.
- **`SqlViewProvider`** *(later, bewijst de abstractie zonder D365)* — `discoverFields` via `INFORMATION_SCHEMA.COLUMNS`; `fetch` via parametrized SELECT op een **whitelisted** view; `needsCache=false`. Goedkoop te bouwen, want MSSQL-pool bestaat al.
- **`RestProvider`** *(later, optioneel)* — generieke REST/JSON-bron met jsonpath-mapping.

De provider wordt geresolved uit `tb_sources.provider_type` (simpele factory). **Geen enkele laag boven de provider kent D365.**

---

## 6. De serve-laag (generieke backend)

### 6.1 Service: `TableDataService` (generalisatie van `D365PurchaseOrderCacheService`)
- `refresh({ tableId })` — resolve provider; als `needsCache`: `provider.fetch(...)` met delta op `source_modified_at`, upsert `tb_cache`, watermark bij, nieuw/gewijzigd markeren via content-hash (bestaande logica generaliseren). Anders no-op.
- `read({ tableId, filters, userId, paging })` — als gecachet: `tb_cache` + actieve `tb_columns` + `tb_custom_values` → rijen (master + detail). Anders: `provider.fetch(...)` live + merge custom + prefs. Per-user nieuw-vlaggen o.b.v. `last_viewed_at`. `meta` bevat de effectieve kolomdefinitie zodat de frontend volledig data-gedreven rendert.
- `saveCustomValue(...)` — instant SQL-write (bron-onafhankelijk).
- `correctField(...)` — alleen als kolom `writable` én provider `writeBack`; schrijft `tb_field_corrections` (pending) → `provider.writeField(... etag)` → cache + status; conflict → `failed`.

### 6.2 Definitie-/builder-service: `TableBuilderService` (admin)
- `listTables / createTable / updateTable / deactivateTable`
- `connectSource / testSource` — bron koppelen + verbindingstest
- `discoverFields(tableId)` — via provider → kandidaatvelden voor de picker
- `curateColumns(tableId, [...])` — bronvelden kiezen + NL-labels + default-zichtbaarheid + filter/sort-vlaggen
- `setRelation(tableId, {...})` — master-detail leggen
- `setWriteConfig(columnId, {...})` — **admin-only**

### 6.3 Routes
**Admin** ([server/routes/admin.js](../../server/routes/admin.js) of nieuw `server/routes/tableBuilder.js`, `requireRole('admin')`, audit):
- `GET/POST /api/admin/tables` · `PATCH /api/admin/tables/:id` — tabel-CRUD
- `GET/POST /api/admin/sources` · `POST /api/admin/sources/:id/test` — bronnen
- `GET /api/admin/tables/:id/discover` — velden-discovery
- `GET/POST /api/admin/tables/:id/columns` — kolompool cureren + labels
- `POST /api/admin/tables/:id/relation` — master-detail
- `PATCH /api/admin/columns/:id/writeconfig` — write-back-config

**Gebruiker** (generiek, vervangt `purchaseOrders.js` → `server/routes/data.js`, `requireSession`):
- `GET /api/data/:tableKey` — lezen (rijen + `meta.columns` + nieuw-vlaggen + paging)
- `POST /api/data/:tableKey/refresh` · `POST /api/data/:tableKey/viewed`
- `GET/POST/PATCH/DELETE /api/data/:tableKey/columns` — app-native kolommen (DELETE = soft-delete)
- `PUT /api/data/:tableKey/value` — custom-kolomwaarde (instant)
- `POST /api/data/:tableKey/correct` — bronveldcorrectie (write-back)
- `GET/POST/DELETE /api/data/:tableKey/filter-sets`
- Per-gebruiker zichtbaarheid blijft via bestaande `GET/PATCH /api/supplier/board-settings/:tableKey`.

> Server-side inputvalidatie + type-validatie tegen `tb_columns.data_type` op alle schrijfroutes; injectie-whitelisting in elke provider.

---

## 7. De presentatie-laag (frontend)

### 7.1 Generiek `<DataGrid>` (veralgemening van `PurchaseOrdersBoardTable`)
Eén `tableKey`-gedreven component:
- **Dynamische kolommen** uit `meta.columns` (master + detail).
- **Master-detail** uitklap (alleen als `tb_relations` een relatie definieert; anders platte lijst).
- **App-native kolommen** inline bewerkbaar (autosave, hergebruik `EditableCell.jsx`); **bronvelden** read-only behalve `writable` → bewuste "Corrigeren in bron"-actie + bevestiging.
- **Per-kolom filters** (type-afhankelijk) client-side op cache; "volledig zoeken" → server-side via provider-`serverFilter`.
- **Filtersets** opslaan/laden/delen.
- **Rij-highlight** nieuw/gewijzigd sinds laatste bezoek.
- **Kolom toevoegen / zichtbaarheid / volgorde** — hergebruik van de bestaande dialogen, ontdaan van "PurchaseOrder"-naamgeving.
- Het bestaande [DataTable.jsx](../../src/components/shared/DataTable.jsx) blijft de presentational primitive eronder.

### 7.2 Admin `<TableBuilder>` (nieuw, het hart van de wens)
Een wizard/tab naast [AdminODataSettings.jsx](../../src/components/admin/AdminODataSettings.jsx), volgt hetzelfde laad/opslaan-stramien:
1. **Bron kiezen / verbinden** — kies `tb_sources` of maak nieuwe; *Test verbinding*.
2. **Entiteit kiezen** — bron-entiteit + sleutelvelden.
3. **Velden ontdekken & cureren** — twee secties (Master / Detail) met zoekfilter; per veld: aan/uit, NL-label, type (voorgevuld uit discovery), default-zichtbaar, filterbaar, sorteerbaar, schrijfbaar (admin).
4. **Detail-relatie leggen** — koppelvelden master→detail (optioneel).
5. **Publiceren** — tabel actief; verschijnt in de navigatie en als `/api/data/:tableKey`.

Resultaat: een nieuwe tabel toevoegen = de wizard doorlopen, **nul code**.

### 7.3 Hook: `useTableGrid(tableKey)`
Generalisatie van [usePurchaseOrdersPage.js](../../src/hooks/usePurchaseOrdersPage.js): leest `/api/data/:tableKey`; `baseColumns`/`defaultColumnKeys` **dynamisch uit `meta`** (cruciaal — anders filtert normalize nieuwe keys weg); refresh-knop; lazy refresh bij stale; echte server-side paginering (vervangt de huidige 50-cap).

---

## 8. Coexistentie & migratiestrategie (kritiek — er is werkende PO-code)

De PO-laag (#131–#134) is **Closed en in productie-pad**. We mogen die niet breken. Aanpak: **strangler-fig**, niet big-bang.

1. **Bouw het generieke spoor naast het PO-spoor** (`tb_*` naast `po_*`). Geen migratie 007 herschrijven; nieuwe migraties beginnen bij het eerstvolgende vrije nummer (na 009).
2. **Seed de eerste tabel = Purchase Orders** in `tb_tables`/`tb_columns` via een data-migratie die `po_columns` 1-op-1 overzet (`header`→`master`, `line`→`detail`, `d365`→`source`). Idempotent.
3. **`D365ODataProvider` wrapt de bestaande `D365ODataService`** — geen herschrijving, alleen een generieke fetch/discover-schil eromheen.
4. **Schakel het PO-scherm om** naar `<DataGrid tableKey="purchase-orders">` zodra dat functioneel gelijk is (parallel testbaar via OTAP-preview).
5. **Pas daarna** verwijder/deprecate de PO-specifieke routes/componenten (aparte cleanup-story, soft).
6. **DevOps:** dit plan **verfijnt** #152/#139/#141/#140 — het zijn dezelfde fasen, maar met bron-neutraal metamodel i.p.v. `odata_*`. Stories hoeven niet opnieuw; alleen hun acceptatiecriteria-naamgeving bijwerken (zie §10).

> **Let op de bekende blocker** uit memory [[session-store-hang-preview]]: authenticated requests hangen op `connect-mssql-v2` `store.get` in de container — dit blokkeert live-testen van álle nieuwe authenticated endpoints. Vóór de eerste preview-test van `/api/data/*` moet die session-store-hang verholpen zijn, anders is geen enkele tabel te valideren in de OTAP-straat.

---

## 9. Gefaseerde uitvoering (gemapt op bestaande DevOps-stories)

| Fase | DevOps | Inhoud (herijkt naar bron-neutraal) | Levert |
|------|--------|--------------------------------------|--------|
| **A** | **#152** | Metamodel-migraties `tb_*` (incl. `tb_cell_history`); seed PO-tabel uit `po_columns`; `TableDataService` als generalisatie van de PO-cacheservice (cache_mode=auto) + cel-historie-write in `saveCustomValue` | Generieke datalaag, PO draait erop, cel-audittrail |
| **B** | **#139** | `SourceProvider`-interface + `D365ODataProvider` (wrapt bestaande service) + `discoverFields` (`$metadata`); **`<TableBuilder>`-admin-UI** (bron→entiteit→velden cureren) | Admin stelt tabellen samen, zonder code |
| **C** | **#141** | Generieke projectie via provider (`$select`/`$expand`); per-kolom filters (client) → server-side via `serverFilter`; filtersets; echte paginering | Volwaardig generiek grid |
| **D** | **#140** | Tweede entiteit (Vendors) **puur via de TableBuilder** — bewijst het ontwerp | Bewijs: uitbreiden = config |
| **E** | **#153 (nieuw)** | `SqlViewProvider` — een tabel op een SQL-view, **zonder D365** — bewijst bron-agnostiek | Echt bron-agnostisch |
| **F** | #135/#136 | Per-gebruiker zichtbaarheid (`tb_column_visibility`), tests, OTAP-runbook, versie-bump | Oplevering |

Fase A–B leveren al de kern van de wens (admin table builder op D365). C–D maken het robuust en bewezen-generiek. **E is de lakmoesproef voor bron-onafhankelijkheid en staat vast in scope** (besluit §0): een tabel op een SQL-view zonder enige OData-code bewijst dat de abstractie niet lekt.

---

## 10. Voorgestelde DevOps-aanpassingen

Geen nieuwe Feature — alles past onder **#130**. Aanpassen, niet dupliceren:
- **#152** (Fase 6a): herformuleer "generaliseren naar `odata_*`" → "**generaliseren naar bron-neutraal `tb_*`-metamodel** + `SourceProvider`-interface". Voeg seed-migratie PO→`tb_*` toe als acceptatiecriterium.
- **#139** (Fase 6): titel "admin kolompicker" → "**admin TableBuilder** (bron → entiteit → velden cureren → relatie)"; metadata-discovery achter `D365ODataProvider.discoverFields`.
- **#141** (Fase 7): "generieke projectie" expliciet **via de provider** (capability-gedreven), niet OData-hardcoded.
- **#140** (Fase 8): ongewijzigd (tweede D365-entiteit via config).
- **#153 (Fase 8b, aangemaakt 2026-06-30):** "`SqlViewProvider` — tabel op SQL-view zonder D365" als bewijs van bron-abstractie, onder #130.

**Geregistreerd in DevOps (2026-06-30):** titels van #152/#139 aangescherpt; herijking-comment (bron-neutraal `tb_*` + provider-abstractie) op #152/#139/#141/#140; #153 aangemaakt. Begeleidend repo-document: [docs/devops/153-table-builder-bron-agnostiek.md](../devops/153-table-builder-bron-agnostiek.md).

---

## 11. Beslissingen

**Vastgelegd (afgestemd 2026-06-30):**
1. ✅ **Reikwijdte abstractie**: de **provider-abstractie komt nu in scope**. `tb_sources`/`SourceProvider` worden gebouwd; D365-provider eerst (Fase B), SQL-provider in scope (Fase E).
2. ✅ **Naamgeving**: bron-neutraal **`tb_*`** (dit plan), vervangt `odata_*`.
3. ✅ **Scope "niet alleen PO's"**: betekent **(b) ook niet-D365-bronnen** (SQL-views, externe API's), niet alleen andere D365-entiteiten. → Fase A–E.

**Nog open (gating voor de betreffende fase, niet-blokkerend voor start van Fase A):**
4. **Relatie-diepte**: is 1 master → 1 detail-niveau genoeg (zoals PO→lines), of wil je geneste/meerdere detail-relaties? (v1-aanname: één niveau.)
5. **Write-back per bron**: mag write-back ook voor SQL-bronnen (UPDATE op view/tabel), of blijft write-back D365-only? (Bepaalt `write_mechanism=sql` in `tb_columns`.)
6. **Navigatie**: hoe verschijnen nieuwe tabellen in de UI — vaste sectie met dynamische lijst uit `tb_tables`, of admin wijst per tabel een menu-plek toe?

> Eerst de session-store-hang ([[session-store-hang-preview]]) oplossen vóór de eerste OTAP-preview-validatie, anders zijn de nieuwe `/api/data/*`-endpoints niet live te testen.

---

## 12. Risico's & mitigaties

| Risico | Mitigatie |
|--------|-----------|
| **Over-engineering** (bron-abstractie die nooit een 2e bron krijgt) | Provider-interface dun houden; D365 eerst; SQL-provider pas als concreet nodig (Fase E expliciet optioneel). De abstractie kost weinig als de interface klein blijft. |
| **Big-bang-breuk PO-scherm** | Strangler-fig (§8): `tb_*` naast `po_*`, PO als eerste seed, omschakelen pas bij functionele gelijkheid. |
| **504/timeout D365** | `cache_mode=auto` + `$select` o.b.v. gecureerde velden + echte paginering (gemeten: 200 rijen mét `$expand` ≈ 21s → cache-is-leidend). |
| **Injectie** (filters, SQL-provider) | Per provider strikt whitelisten op veld + operator; literals escapen; SQL-provider alleen op **whitelisted views**, parametrized. |
| **EAV-performance** | Getypeerde value-kolommen + index op `(column_id, record_key, detail_key)`; kolommen per pagina begrensd. |
| **Metamodel-complexiteit voor de admin** | TableBuilder als **wizard** (stap voor stap) i.p.v. één groot formulier; sensible defaults uit discovery. |
| **Kolom-/tabel-wildgroei** | Soft-delete + audit + behoud waarden; `is_active`-filtering; later admin-zichtbaarheid. |
| **Session-store-hang blokkeert testen** | Eerst oplossen (memory-blocker), vóór preview-validatie. |
| **Write-back-concurrency** | `If-Match`/ETag (D365), rowversion (SQL); conflict = "ververs eerst". |

---

## 13. Definition of Done

- Een beheerder stelt op de admin-pagina een **nieuwe tabel** samen (bron → entiteit → velden cureren met labels/typen/filters → optionele detail-relatie) en publiceert die **zonder code-wijziging**.
- Purchase Orders draait aantoonbaar op het generieke `tb_*`-spoor (functioneel gelijk aan nu).
- Minimaal één **tweede entiteit** (Vendors) is puur via de TableBuilder toegevoegd.
- Het generieke grid toont dynamische kolommen, master-detail (waar gedefinieerd), per-kolom filters, filtersets, app-native kolommen (inline edit), write-back (waar de provider het kan) en nieuw/gewijzigd-highlight.
- Bron-abstractie is **niet-lekkend**: geen laag boven de provider kent D365 (geverifieerd doordat — indien Fase E — een SQL-view-tabel werkt zonder OData-code).
- Tests + OTAP-runbook + versie-bump.

---

*Concept ter ontwikkeling. Kernkeuzes (§0/§11): bron-agnostische provider-abstractie + `tb_*`-naamgeving zijn vastgelegd (2026-06-30). Resterende vragen §11.4–6 zijn fase-gating, niet blokkerend voor Fase A. Dit plan verfijnt het [samengevoegde plan](dev_2026-06-29-d365-po-platform-samengevoegd-plan.md) met een bron-neutraal metamodel en provider-abstractie; de gefaseerde uitvoering blijft onder Feature #130.*

# Samengevoegd plan: D365 PO-platform — SQL-cache + annotatielaag + generieke kolompicker & filters

> **Status:** concept ter ontwikkeling — samenvoeging van twee plannen
> **Datum:** 2026-06-29
> **Vervangt / verenigt:**
> - [dev_d365-po-cache-annotatielaag-plan.md](dev_d365-po-cache-annotatielaag-plan.md) (cache + eigen kolommen + write-back) — in DevOps als **Feature #130** (#131–#136)
> - [dev_2026-06-29-d365-kolompicker-filters.plan.md](../../.cursor/plans/dev_2026-06-29-d365-kolompicker-filters.plan.md) (kolompicker + filters, generiek multi-entiteit) — nog niet in DevOps
> **Sluit aan op:** [76-visie-d365-composite-proxy.md](../devops/76-visie-d365-composite-proxy.md)
> **DevOps:** Feature **#130** (Vendor-App). Dit document breidt #130 uit; bestaande stories #131–#136 blijven, nieuwe stories komen erbij.
> **Tags:** d365; odata; purchase-orders; sql-cache; dynamische-kolommen; kolompicker; filters; write-back; generiek

---

## 0. Waarom samenvoegen

De twee plannen raken hetzelfde scherm, dezelfde bestanden en dezelfde D365-bron, maar belichten twee helften:

| | Cache + annotatielaag (#130) | Kolompicker + filters |
|---|---|---|
| Kernvraag | *Snel werken + eigen context vastleggen + corrigeren* | *Welke D365-kolommen zie/filter ik* |
| Levert | SQL-cache, eigen kolommen (EAV), write-back, nieuw-detectie | Metadata-discovery, admin-gecureerde D365-pool + labels, per-kolom filters + filtersets, generiek |

Los van elkaar **conflicteren** ze (beide claimen migratie 007; beide herschrijven `D365ODataService.js`, `usePurchaseOrdersPage.js`, `PurchaseOrdersPage.jsx`, `server/routes/supplier.js`; en ze introduceren twee kolom-registry's). Dit plan voegt ze tot één samenhangend traject.

### Vastgelegde samenvoegings-beslissingen (afgestemd 2026-06-29)

1. **Eén uniforme kolom-registry.** D365-velden én eigen kolommen staan in één tabel. Labels, zichtbaarheid, filterconfig én write-back-config werken uniform op "een kolom", ongeacht herkomst.
2. **Cache is leidend.** De admin-gecureerde kolom-pool bepaalt wélke D365-velden in de SQL-cache worden gesynct. Lezen gaat **altijd** uit de cache (snel). "Volledig zoeken in D365" (server-side `$filter`) is de expliciete uitzondering.
3. **Generiek multi-entiteit vanaf nu.** Alle tabellen/endpoints zijn gedreven door een `entity_key`. Purchase Orders is de eerste concrete entiteit; een tweede entiteit (bv. Vendors) bewijst het generieke ontwerp.
4. **Uitbreiden onder Feature #130.** Geen tweede Feature. Nieuwe stories (Fase 6–8) onder #130. Migraties hernummerd tot één consistente reeks zodat de 007-botsing met #132 verdwijnt.

---

## 1. Kernidee (samengevoegd)

```
   D365 $metadata ─► metadata-discovery (admin, gecachet)
            │
            ▼
   admin cureert pool + NL-labels + write-back/filter-config  ──►  odata_columns (UNIFORME registry: d365 + custom)
            │  (bepaalt welke D365-velden gesynct worden)               ▲           ▲
            ▼                                                           │           │
   refresh (knop / lazy >15 min, delta op ModifiedDateTime)            │           │
   D365 OData  ──────────────────────────────────────►  odata_cache (SQL, per entity)
        ▲   (read + write-back)                                │
        │                                                      ▼
        │   write-through (writable_to_d365, If-Match)   read-endpoint (cache + registry + custom values
        └──────── odata_field_corrections (audit)        + filtersets + per-user nieuw-vlaggen)  ──►  React
                  odata_custom_values (EAV)  ─────────────────────┘                                     │
                  odata_sync_state (per-user watermark + globaal)                                        ▼
                                                                                          Generiek DataGrid
                                                                                          (kolompicker · filters · master-detail · inline edit)
```

- **React praat nooit direct met D365.** Express is de enige consumer.
- **Lezen = altijd uit SQL-cache.** D365 wordt alleen geraadpleegd bij refresh of bij "volledig zoeken in D365".
- **Eén kolom-registry** voedt zowel de cache-sync (welke velden) als de UI (labels, zichtbaarheid, filters, bewerkbaarheid).

---

## 2. Vastgelegde beslissingen (geërfd + nieuw)

Geërfd uit #130:
- **D365-velden** read-only referentie; **admin** zet per kolom write-back aan/uit; alleen dán corrigeerbaar en teruggeschreven.
- **Eigen kolommen** vrij toe te voegen op **hoofd- én regelniveau** (dynamisch, EAV, getypeerd).
- **Versheid:** lezen uit cache; auto-refresh bij openen als cache > ~15 min oud; handmatige "Vernieuwen"-knop; **geen scheduler**.
- **Nieuw-detectie** per gebruiker (rij-highlight nieuw/gewijzigd sinds laatste bezoek).
- **Soft-delete** voor kolommen (`is_active = 0`), waarden blijven behouden.
- **Geen AI/LLM** in het datapad.

Geërfd uit kolompicker-plan:
- **Admin cureert** uit álle D365-velden (via `$metadata`) een pool + **vriendelijk NL-label** per kolom.
- **Gebruiker** personaliseert zichtbare kolommen + volgorde.
- **Per-kolom filters** + **opslaanbare filtersets** (privé per gebruiker; admin kan delen).
- **Generiek/multi-entiteit** vanaf het begin.
- **Hybride filteren:** eenvoudige filters client-side op geladen cache; "volledig zoeken" server-side via OData `$filter`.

Nieuw (samenvoeging):
- **Uniforme registry** `odata_columns` met `source` (`d365`|`custom`) — vervangt zowel `po_columns` als `odata_entity_columns`.
- **Cache-gevoede pool:** alleen gecureerde D365-velden landen in `odata_cache`. Een veld toevoegen aan de pool → wordt vanaf de volgende refresh meegesynct.

---

## 3. Datamodel (SQL) — uniform & generiek

Migraties in [scripts/db/migrations/](../../scripts/db/migrations/), idempotent (`IF NOT EXISTS`), conform projectconventie. **Hernummerd** tot één reeks (zie §6 over de #132-007-botsing).

### 3.1 `odata_entities` — entiteit-registry (migratie 007)
- `entity_key` (PK-uniek, bv. `purchase-orders`), `label`
- `odata_path` (bv. `/data/PurchaseOrderHeadersV2`), `key_fields` (comma-sep, altijd meenemen)
- `line_nav_property` NULL (bv. `PurchaseOrderLines`), `line_entity_path` NULL, `line_key_fields` NULL
- `default_filter` NULL (bv. `dataAreaId`-scope), `is_active`, `updated_at`, `updated_by`

### 3.2 `odata_columns` — **uniforme kolom-registry** (migratie 008)
Vervangt `po_columns` **en** `odata_entity_columns`.
- `id` (PK), `entity_key`, `scope` (`header`|`line`)
- `key` (slug, uniek per `entity_key`+`scope`), `label` (NL, admin)
- `source` (`d365`|`custom`)
- `d365_field` (technische D365-veldnaam bij `source=d365`, anders NULL)
- `data_type` (`text`|`number`|`date`|`boolean`|`select`; bij d365 afgeleid uit `$metadata` Edm-type)
- `options` (JSON, alleen `select`)
- `writable_to_d365` (bit) — **admin-only**; alleen zinvol als `d365_field` gezet
- `write_mechanism` (`patch`|`action`|NULL)
- `is_default_visible` (bit) — initiële zichtbaarheid nieuwe gebruikers
- `filterable` (bit), `sortable` (bit)
- `is_active` (bit, soft-delete), `sort_order`, `created_by/at`, `updated_by/at`
- UNIQUE (`entity_key`, `scope`, `key`)

### 3.3 `odata_cache` — gecachete D365-waarden, cache-is-leidend (migratie 009)
Generiek + dynamisch van breedte (gecureerde velden variëren per entiteit).
- PK: `(entity_key, scope, data_area_id, record_key, line_key)` — `line_key` NULL voor header
- `record_key` — natuurlijke sleutel (bv. `PurchaseOrderNumber`)
- **`data_json`** — de gecureerde D365-velden als getypeerde JSON (dynamische breedte; vermijdt schema-migratie per nieuw veld)
- Geïndexeerde "hot" sleutelvelden als generieke kolommen voor join/filter (`record_key`, `data_area_id`)
- `d365_modified_at` (`ModifiedDateTime`/ETag — delta + optimistic concurrency)
- `synced_at`, `first_seen_at`, `removed_in_d365` (bit; deletes via volledige resync)
- Index op `(entity_key, scope, d365_modified_at)` en op `record_key`

> **Cache-is-leidend in de praktijk:** `refresh()` projecteert via `$select` exact de gecureerde velden uit `odata_columns` (source=d365) en schrijft die in `data_json`. Een veld dat de admin niet kiest, wordt niet gesynct → geen onnodige payload.

### 3.4 `odata_custom_values` — eigen-kolomwaarden (EAV, getypeerd) (migratie 010)
Vervangt `po_custom_values`, nu met `entity_key`.
- `column_id` → `odata_columns.id`, `entity_key`, `scope`
- `data_area_id`, `record_key`, `line_key` (NULL voor header)
- `value_text`, `value_number`, `value_date`, `value_bool` — getypeerd volgens `data_type`
- `updated_by`, `updated_at`
- UNIQUE (`column_id`, `data_area_id`, `record_key`, `line_key`)

### 3.5 `odata_filter_sets` — opslaanbare filtersets (migratie 011)
- `id` (PK), `entity_key`, `user_id` (NULL = gedeeld/globaal, door admin)
- `name`, `definition_json` (array `{key, scope, operator, value}`)
- `is_shared` (bit), `created_by`, `updated_at`
- FK `user_id` → `dbo.users(id)` ON DELETE CASCADE

### 3.6 `odata_field_corrections` — write-back audit + status (migratie 012)
Vervangt `po_field_corrections`, generiek.
- `id`, `entity_key`, `scope`, `(data_area_id, record_key, line_key)`, `column_id`, `d365_field`
- `old_value`, `new_value`, `based_on_modified_at` (basis voor `If-Match`)
- `status` (`pending`|`applied`|`failed`), `error`, `created_by/at`, `applied_at`

### 3.7 `odata_sync_state` (migratie 013)
- Per gebruiker + entiteit: `user_id`, `entity_key`, `last_viewed_at`
- Globaal per entiteit: `entity_key`, `watermark` (hoogste `ModifiedDateTime`), `last_full_sync_at`

### 3.8 `odata_column_visibility` — toekomst (migratie 014, alleen ontwerpen)
- `user_id`, `column_id`, `can_view` (bit); afwezigheid = standaard zichtbaar.

### Herbruik bestaand
- `dbo.user_board_settings` (`board_key = entity_key`): per gebruiker `visibleColumns` + `columnOrder` (header/line gescheiden in JSON).

---

## 4. Backend

### 4.1 `D365ODataService.js` — uitbreiden (deels af)
- ✅ **OAuth2 client-credentials** met token-cache + refresh (Fase 0, **af** — zie #131). Statisch token uitgefaseerd.
- `$count=true` + `@odata.count` voor echte pagination (deels aanwezig).
- **Generieke projectie:** `mapPurchaseOrder`/`mapPurchaseOrderLine` vervangen door config-gedreven projectie o.b.v. `odata_columns` (key-velden altijd mee).
- **Generieke URL-bouw:** optioneel `$select` (header) + `$expand=<lineNav>($select=...)` o.b.v. gekozen kolommen → kleinere payload, minder 504-risico. Key-/filtervelden altijd in `$select`.
- **Server-side `$filter`:** vertaal whitelisted operatoren (`eq`, `contains`, `ge`/`le`) naar OData; strikt whitelisten op veld (uit pool) + operator; `escapeODataLiteral` voor injectieveiligheid.
- `writeBackField()` — `PATCH` (of bound Action) met `If-Match` (ETag) voor optimistic concurrency.

### 4.2 `D365MetadataService.js` — nieuw (uit kolompicker-plan)
- Haalt `<base>/data/$metadata`, parseert per `EntityType` alle `<Property Name= Type=>` voor header- én (via `NavigationProperty`) regel-entiteit.
- Hergebruik/uitbreiden XML-parselogica uit [scripts/d365/inspect-metadata.mjs](../../scripts/d365/inspect-metadata.mjs).
- **In-memory cache** (enkele uren), zoals de token-cache.

### 4.3 `ODataCacheService.js` — generiek (generalisatie van `D365PurchaseOrderCacheService`)
- `refresh({ entityKey, scope })` — projecteert gecureerde velden via `$select`, delta op `ModifiedDateTime gt watermark`, upsert in `odata_cache`, werkt watermark bij, markeert nieuw/gewijzigd; periodieke volledige resync zet `removed_in_d365`.
- `read({ entityKey, filters, userId })` — `odata_cache` + actieve `odata_columns` + `odata_custom_values` → rijen met header- en regelkolommen; per-user nieuw-vlaggen o.b.v. `last_viewed_at`; client-side filters toepasbaar, "volledig zoeken" delegeert naar D365 `$filter`.
- `saveCustomValue(...)` — instant SQL-write.
- `correctField(...)` — alleen als `writable_to_d365`; schrijft `odata_field_corrections` (pending) → `writeBackField()` met `If-Match` → update cache + status; conflict/fout → `failed`.

### 4.4 Registry-/kolombeheer-service
- `createColumn / renameColumn / deactivateColumn` (iedereen; soft-delete).
- `curateD365Columns(entityKey, [...])` — admin kiest D365-velden uit metadata + labels + default-zichtbaarheid.
- `setWriteBackConfig(columnId, { writable, mechanism })` — **admin-only**.
- `manageEntities(...)` — entiteit-registry CRUD (admin).

### 4.5 Routes
**Admin** (`server/routes/admin.js`, `requireRole('admin')`, audit via `auditLog`):
- `GET /admin/odata/:entityKey/metadata` — metadata-discovery (gecachet).
- `GET/POST /admin/odata/entities` — entiteit-registry.
- `GET/POST /admin/odata/:entityKey/columns` — gecureerde pool + labels + default-zichtbaarheid.
- `PATCH /admin/odata/columns/:id/writeback` — write-back-config.

**Gebruiker** — nieuw generiek `server/routes/purchaseOrders.js` → **veralgemeniseren naar `server/routes/data.js`** (`requireSession` + medewerker-rol, doc 76 §4.5):
- `GET /api/data/:entityKey` — lezen (cache + kolommen + waarden + nieuw-vlaggen + effectieve kolomdefinitie in `meta`).
- `POST /api/data/:entityKey/refresh` — refresh triggeren.
- `GET/POST/PATCH/DELETE /api/data/:entityKey/columns` — eigen kolommen (DELETE = soft-delete).
- `PUT /api/data/:entityKey/:record/:line?/value` — eigen kolomwaarde (instant).
- `POST /api/data/:entityKey/:record/:line?/correct` — D365-veldcorrectie (write-back).
- `GET/POST/DELETE /api/data/:entityKey/filter-sets` — filtersets (privé + gedeeld; `is_shared` alleen admin).
- `POST /api/data/:entityKey/viewed` — `last_viewed_at` bijwerken.
- Server-side inputvalidatie + type-validatie tegen `odata_columns.data_type`; `MAX_COLUMNS` meeschalen.

---

## 5. Frontend

- **Admin kolompicker** `src/components/admin/AdminODataColumns.jsx` (naast `AdminODataSettings.jsx`): laadt metadata-velden; twee secties (Header/Regels) met zoekfilter; per kolom NL-label + default-zichtbaarheid + volgorde + write-back-toggle. Volgt laad/opslaan-stramien van `AdminODataSettings.jsx`.
- **Generiek DataGrid** (nieuw, herbruikbaar, `entityKey`-gedreven; vervangt het PO-specifieke board):
  - **Dynamische kolommen** o.b.v. backend-kolomdefinitie (header + line).
  - **Eigen kolommen** inline bewerkbaar, autosave (`EditableCell.jsx`).
  - **D365-velden** read-only, behalve `writable_to_d365` → bewuste actie + bevestiging + spinner + foutafhandeling.
  - **Per-kolom filters** (type-afhankelijk) client-side op cache; "volledig zoeken in D365" triggert server-side `$filter`.
  - **Filtersets** opslaan/laden/verwijderen; gedeelde gemarkeerd; admin publiceert.
  - **Uitklapbare detailregels** (master-detail) — bestaande subitems-weergave.
  - **Rij-highlight** nieuw/gewijzigd sinds laatste bezoek (rij-niveau).
  - **"Kolom toevoegen"** op beide niveaus (`PurchaseOrderAddColumnDialog.jsx` → veralgemeniseren).
- Refactor [usePurchaseOrdersPage.js](../../src/hooks/usePurchaseOrdersPage.js) → generieke `useEntityGrid(entityKey)`: leest SQL-backed endpoint; `baseColumns`/`defaultColumnKeys` dynamisch uit backend (zodat normalize-filters nieuwe keys niet wegfilteren); refresh-knop; lazy refresh bij stale cache; **paginering** (de huidige 50-stopgap wordt echte server-side paging).
- Styling via `makeStyles` + tokens, geen inline styles (cursor rules).

---

## 6. Conflicten & coördinatie (kritiek)

> Story **#132 (Fase 1)** wordt **nu actief gebouwd** in worktree `feature/132-po-sql-cache` (niet-gecommit): `007_purchase_orders_cache.sql`, `D365PurchaseOrderCacheService.js`, `PurchaseOrderColumnsService.js`, `EditableCell.jsx`, `PurchaseOrderAddColumnDialog.jsx`, e.a.

Gevolgen van de samenvoegings-beslissingen voor lopend werk:
1. **Migratie-botsing 007.** #132's `007_purchase_orders_cache.sql` wordt opgenomen in de generieke reeks (007 = `odata_entities`). De PO-specifieke `po_cache_*`/`po_columns` worden de generieke `odata_*`-tabellen. **Afstemmen met de #132-agent vóór commit** om dubbele/strijdige migraties te voorkomen.
2. **Registry generaliseert.** `po_columns` → `odata_columns` (+ `entity_key`, `source`-merge met de admin-pool). #132's kolombeheer-service en `AddColumnDialog` veralgemeniseren mee.
3. **PO-specifieke namen → generiek.** `D365PurchaseOrderCacheService` → `ODataCacheService`; `routes/purchaseOrders.js` → `routes/data.js`.
4. **#131 (Fase 0) status achterhaald:** OAuth2 client-credentials is **af** (token-cache + refresh, end-to-end geverifieerd). Zet #131 op Resolved/Closed.

**Aanpak:** laat #132 niet doorgaan op de PO-specifieke schema's zonder deze generalisatie te verwerken — anders dubbel werk. Twee opties: (a) #132 nu generiek hertekenen vóór commit; (b) #132 PO-specifiek afmaken en daarna een refactor-story de generalisatie laten doen. Voorkeur: (a), zolang nog niet gecommit.

---

## 7. Gefaseerde uitvoering → DevOps-stories onder Feature #130

| Fase | Story | Inhoud | Status |
|------|-------|--------|--------|
| 0 | **#131** | OAuth2 client-credentials + `$metadata`-verificatie + PATCH/Action bepalen | ✅ OAuth **af** — story op Resolved zetten |
| 1 | **#132** | SQL-cache + dynamische eigen kolommen (snel scherm, geen write-back) — **generiek hertekend** (`odata_*`, `entity_key`, uniforme registry) | In aanbouw (worktree) |
| 2 | **#133** | Nieuw-detectie per gebruiker (delta-refresh + rij-highlight), nu per `entity_key` | New |
| 3 | **#134** | D365 write-back (veldcorrecties terug naar D365) | New |
| 4 | **#135** | Personalisatie (later): per-gebruiker kolomzichtbaarheid | New |
| 5 | **#136** | Oplevering: tests, OTAP-runbook, versie-bump | New |
| **6** | **#137 (nieuw)** | **Metadata-discovery + admin kolompicker**: `D365MetadataService`, `AdminODataColumns.jsx`, gecureerde pool + NL-labels (header & line) | te maken |
| **7** | **#138 (nieuw)** | **Generieke projectie + filteren**: `$select`/`$expand` o.b.v. pool; per-kolom filters (client) → server-side `$filter` (hybride) → **filtersets** (privé + gedeeld); echte paginering (vervangt 50-stopgap) | te maken |
| **8** | **#139 (nieuw)** | **Tweede entiteit als bewijs** (bv. Vendors) via alléén config — valideert het generieke ontwerp | te maken |

Fase 1–2 + 6–7 leveren samen het volledige snelle scherm mét kolompicker en filters; write-back (3) en personalisatie (4) houden de rest niet op.

---

## 8. Risico's & mitigaties

- **Tokenverloop** → OAuth2 refresh (af); door gebruiker/lazy getriggerd, geen stille timer.
- **504/timeout** → `$select` o.b.v. keuze beperkt payload; echte server-side paginering; zware filters server-side binnen timeout houden. (Gemeten: 200 rijen mét `$expand` = ~21s → de reden voor cache-is-leidend.)
- **Kolom-wildgroei/dataverlies** → soft-delete + audit + behoud waarden; later admin-zichtbaarheid.
- **Write-back-concurrency** → `If-Match`/ETag; conflict = "ververs eerst", geen blinde overschrijving.
- **Read-only/boekings-velden** → vroeg PATCH vs Action bepalen; niet-schrijfbaar niet als bewerkbaar tonen.
- **Veldnamen exact** → keuzelijst uit échte `$metadata`, geen aannames (vervangt de `||`-fallbacks).
- **Injectie** → server-side `$filter` strikt whitelisten op veld + operator; literals escapen.
- **EAV-performance** → getypeerde value-kolommen + index op `(column_id, record_key, line_key)`; kolommen per pagina beperkt.
- **Deletes in D365** → periodieke volledige resync markeert `removed_in_d365`.
- **`data_json`-cache vs filteren** → client-side filter op geladen cache; "volledig zoeken" delegeert naar D365 zodat geen volledige cache-scan op JSON nodig is.
- **Geen scheduler** → geen lease/lock, geen scale-to-zero-probleem op Container Apps.

---

## 9. Definition of Done (samengevoegd)

- Lezen gaat altijd uit de SQL-cache; D365 alleen bij expliciete/lazy refresh of "volledig zoeken".
- Admin kan per entiteit uit álle D365-kolommen (header + regel) kiezen en NL-labels instellen; gekozen kolommen worden gesynct én stromen aantoonbaar door naar de tabel.
- Gebruiker personaliseert zichtbare kolommen + volgorde; voegt eigen kolommen toe op beide niveaus (instant opgeslagen, getypeerd).
- Per-kolom filters werken (client-side + server-side voor volledige dataset); filtersets opslaan/hergebruiken/delen werkt.
- Per-gebruiker nieuw-/gewijzigd-detectie (rij-highlight).
- Write-back alleen voor admin-gemarkeerde `writable_to_d365`-kolommen, met optimistic concurrency + audit.
- Eén uniforme kolom-registry; één generiek datagrid; minimaal één tweede entiteit aantoonbaar via alléén config.
- Tests + OTAP/devops-runbook + versie-bump.

---

## 10. Openstaande vragen (gating, niet-blokkerend voor start)

1. **Welke concrete D365-velden** mogen write-back krijgen (Fase 3)? Bepaalt PATCH vs bound Action (doc 76 §4.3).
2. **Scope/datumfilter** van de cache (vanaf welke datum, welke statussen)? Beperkt de ~19.913 PO's tot een werkbare set.
3. Heeft de PO-header een **navigation property** naar de regels (`$expand`) of client-side joinen op `PurchaseOrderNumber`? (doc 76 §4.2 — te bevestigen via `$metadata` in #137)
4. Welke **D365-rollen/scopes** krijgt de Azure AD app voor schrijven (minimale rechten)? (lezen is geverifieerd werkend)
5. Mogen eigen kolommen op **hoofdniveau** leeg blijven per regel, of overerving naar regels? (UX subitems)
6. **Tweede bewijs-entiteit**: Vendors, Items of iets anders?

---

*Concept ter ontwikkeling. Werk dit document bij dit nieuwe afspraken; het verenigt #130 en het kolompicker/filter-plan tot één traject.*

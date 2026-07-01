# Plan: D365 Kolompicker + Filterfunctie (generiek, multi-entiteit)

> Status: concept-plan, klaar voor `/post-plan-to-devops`
> Datum: 2026-06-29
> Context: Supplier Portal — D365 OData data komt nu beperkt door omdat de mapping en frontend een vaste whitelist van ~8 kolommen hanteren.

## 1. Probleem & aanleiding

Bij het laden van purchase-order-data uit D365 (OData) komen niet alle kolommen door. Oorzaak: de data wordt op twee plekken hard ingeperkt — niet door D365 zelf:

1. **Backend-mapping (vaste whitelist):** `mapPurchaseOrder` / `mapPurchaseOrderLine` in `server/services/D365ODataService.js` bouwen handmatig een object met ~8 vaste velden. De rest van het record zit nog in `raw`, maar wordt nergens gebruikt. De OData-URL gebruikt géén `$select`, dus D365 levert wél alles.
2. **Frontend (vaste kolommen + filter):** `baseColumns` in `src/components/supplier/PurchaseOrdersPage.jsx` is hardcoded; `normalizeVisibleColumns`/`normalizeColumnOrder` in `src/hooks/usePurchaseOrdersPage.js` gooien elke key weg die niet in `defaultColumnKeys` zit.

## 2. Doel

Een **generieke kolompicker + filterfunctie** voor D365-entiteiten, te beginnen met Purchase Orders (header + regels), waarbij:
- Admin uit **alle** D365-kolommen een "beschikbare pool" cureert en per kolom een **vriendelijk NL-label** instelt.
- Gebruikers daaruit zelf hun **zichtbare kolommen + volgorde** kiezen.
- Er **per-kolom filters** zijn én **opslaanbare filtersets** (privé per gebruiker + admin kan delen).
- De gekozen kolommen daadwerkelijk **doorstromen** naar de tabel.

## 3. Vastgelegde keuzes (uit afstemming)

| Onderwerp | Keuze |
|-----------|-------|
| Plaatsing kolomkeuze | **Hybride**: admin cureert globale pool + labels; gebruiker personaliseert zichtbaar + volgorde |
| Filtertype | **Filter per kolom** + **opslaanbare filtersets** |
| Filter-uitvoering | **Hybride**: eenvoudige filters/zoek client-side; volledige/zware filters server-side via OData `$filter` |
| Reikwijdte | **Generiek/multi-entiteit vanaf het begin** (PO, later vendors/items/...) |
| Filtersets-zichtbaarheid | **Privé per gebruiker + admin kan delen** (gepubliceerde sets voor iedereen) |
| Kolomlabels | **Admin stelt vriendelijk NL-label in** per kolom |
| Regelweergave | **Uitklapbare detailregels** (master-detail per order) |

## 4. Architectuur-overzicht

Generieke "entity registry"-aanpak: één configureerbaar datagrid-mechanisme gedreven door een `entityKey` (bv. `purchase-orders`), met per entiteit een D365-entiteitsdefinitie (pad, key-velden, nav-property voor regels, gekozen kolommen + labels).

```
D365 $metadata ──► metadata-discovery endpoint (admin) ──► admin kolompicker UI
                                                              │ (kiest kolommen + labels, per entiteit + regel-entiteit)
                                                              ▼
                                                  dbo.odata_entity_columns (globale pool + labels + order)
                                                              │
        ┌─────────────────────────────────────────────────────┤
        ▼                                                       ▼
  Supplier datagrid endpoint ◄── dynamische mapping        user_board_settings (per gebruiker: zichtbaar + volgorde)
  (projecteert gekozen velden,    (server/services)        odata_filter_sets (per gebruiker + gedeeld)
   $select/$filter generiek)
        │
        ▼
  Generiek DataGrid-component (kolommen + per-kolom filters + uitklapbare regels)
```

## 5. Datamodel (nieuwe SQL-migraties, idempotent volgens projectconventie)

### 5.1 `dbo.odata_entities` — entiteit-registry (migratie 007)
- `entity_key` NVARCHAR(64) PK-uniek (bv. `purchase-orders`)
- `label` NVARCHAR(128) — weergavenaam
- `odata_path` NVARCHAR(256) — bv. `/data/PurchaseOrderHeadersV2`
- `key_fields` NVARCHAR(256) — comma-sep key-velden (altijd meenemen)
- `line_nav_property` NVARCHAR(128) NULL — bv. `PurchaseOrderLines`
- `line_entity_path` NVARCHAR(256) NULL — voor regel-metadata
- `is_active` BIT, `updated_at`, `updated_by`

### 5.2 `dbo.odata_entity_columns` — door admin gecureerde pool + labels (migratie 008)
- `id` BIGINT IDENTITY PK
- `entity_key` NVARCHAR(64)
- `scope` NVARCHAR(16) — `header` | `line`
- `field_name` NVARCHAR(128) — technische D365-veldnaam
- `label` NVARCHAR(128) — vriendelijk NL-label (admin)
- `data_type` NVARCHAR(64) — uit $metadata (Edm.String/Decimal/DateTime/...)
- `sort_order` INT
- `is_default_visible` BIT — initiële zichtbaarheid voor nieuwe gebruikers
- UNIQUE (`entity_key`, `scope`, `field_name`)

### 5.3 `dbo.odata_filter_sets` — opslaanbare filtersets (migratie 009)
- `id` BIGINT IDENTITY PK
- `entity_key` NVARCHAR(64)
- `user_id` INT NULL — NULL = gedeeld/globaal (door admin)
- `name` NVARCHAR(128)
- `definition_json` NVARCHAR(MAX) — array van `{field, scope, operator, value}`
- `is_shared` BIT — door admin gepubliceerd
- `created_by`, `updated_at`
- FK `user_id` → `dbo.users(id)` ON DELETE CASCADE

### 5.4 Hergebruik bestaand
- `dbo.user_board_settings` (board_key = `entity_key`): per gebruiker `visibleColumns` + `columnOrder` (header + line gescheiden in JSON).

## 6. Backend

### 6.1 Metadata-discovery (nieuw)
- `GET /admin/odata/:entityKey/metadata` (admin-only) — haalt `<base>/data/$metadata`, parseert per `EntityType` alle `<Property Name= Type=>` voor de header-entiteit én — via de `NavigationProperty` — de regel-entiteit. Geeft `{ headerColumns: [{field, type}], lineColumns: [{field, type}] }`.
- Hergebruik de XML-parselogica uit `scripts/d365/inspect-metadata.mjs` (uitbreiden van alleen `PropertyRef`/`NavigationProperty` naar alle `Property`-elementen).
- **Cachen**: $metadata is groot/traag → in-memory cache (enkele uren), vergelijkbaar met de token-cache in `D365ODataService.js`.

### 6.2 Entiteit- & kolomconfig (nieuw, admin-only)
- `GET/POST /admin/odata/:entityKey/columns` — lees/schrijf gecureerde pool + labels + default-zichtbaarheid (`odata_entity_columns`).
- `GET/POST /admin/odata/entities` — beheer entiteit-registry (`odata_entities`).
- Achter `requireSession` + `requireRole('admin')`; muteren via `auditLog` (patroon zoals bestaande OData-settings-route).

### 6.3 Dynamische mapping & query (`D365ODataService.js`)
- `mapPurchaseOrder`/`mapPurchaseOrderLine` vervangen door **generieke projectie**: lees de gekozen veldenlijst (uit config) en projecteer die velden generiek uit het ruwe record. Key-velden (`PurchaseOrderNumber`, `LineNumber`, vendor/filter-velden) altijd meenemen.
- `buildPurchaseOrderUrl` generiek maken: optioneel `$select` (header) + `$expand=<lineNav>($select=...)` op basis van de gekozen kolommen → kleinere payload, minder timeout-risico. Key- en filtervelden (`OrderVendorAccountNumber`, `dataAreaId`) blijven altijd in de select.
- `MAX_COLUMNS = 80` in `server/routes/supplier.js` en validatie meeschalen.

### 6.4 Server-side filteren (hybride)
- Datagrid-endpoint accepteert een `filters`-parameter (array van `{field, scope, operator, value}`); vertaalt veilige operatoren (`eq`, `contains`, `ge`/`le` voor datum/getal) naar OData `$filter`. Hergebruik/uitbreiden `escapeODataLiteral` voor injectie-veiligheid. Whitelist op operator + veld (alleen velden uit de gecureerde pool).

### 6.5 Supplier datagrid-endpoint
- Bestaande `GET /supplier/purchase-orders` uitbreiden (of generiek `GET /supplier/data/:entityKey`): levert naast de rijen ook de **effectieve kolomdefinitie** (veld + label + type + scope) in `meta`, zodat de frontend dynamisch kan renderen. Per-gebruiker zichtbaarheid/volgorde via bestaande board-settings.
- Filtersets: `GET/POST/DELETE /supplier/filter-sets/:entityKey` (privé per gebruiker + gedeelde sets zichtbaar; alleen admin mag `is_shared` zetten).

## 7. Frontend

### 7.1 Admin kolompicker (nieuw)
- Component `src/components/admin/AdminODataColumns.jsx`, naast `AdminODataSettings.jsx`.
- Laadt beschikbare kolommen uit metadata-endpoint; toont **twee secties** (Header / Regels) met zoekfilter (kunnen honderden velden zijn) — Fluent UI checkbox-lijst of `TagPicker`.
- Per gekozen kolom: **vriendelijk NL-label** invoeren + default-zichtbaarheid + volgorde (drag of sort-order).
- Opslaan via `POST /admin/odata/:entityKey/columns`. Volgt laad/opslaan-stramien van `AdminODataSettings.jsx`.

### 7.2 Generiek DataGrid (nieuw, herbruikbaar)
- Generiek datagrid-component gedreven door `entityKey` + kolomdefinitie uit de backend.
- **Per-kolom filter** (type-afhankelijk: tekst-contains, eq, datum-range, getal-range); client-side voor geladen data, met "volledig zoeken in D365"-optie die server-side `$filter` triggert.
- **Uitklapbare detailregels** (master-detail): per order een rij, klik klapt regels uit met eigen regel-kolommen.
- **Filtersets**: opslaan/laden/verwijderen; gedeelde sets gemarkeerd; admin kan publiceren.
- Refactor `PurchaseOrdersPage.jsx` + `usePurchaseOrdersPage.js`: `baseColumns` en `defaultColumnKeys` dynamisch uit backend-kolomdefinitie (zodat normalize-filters de nieuwe keys niet wegfilteren).

## 8. Fasering / implementatievolgorde

1. **Fundament & metadata** — entiteit-registry + migraties (007–009); metadata-discovery endpoint + caching. Verifieer dat álle D365-kolommen correct binnenkomen.
2. **Admin kolompicker** — config-endpoints + `AdminODataColumns.jsx` (selectie + labels, header & line).
3. **Dynamische backend-projectie** — generieke mapping + `$select`/`$expand`; supplier-endpoint levert kolomdefinitie mee.
4. **Generiek DataGrid frontend** — dynamische kolommen + uitklapbare regels; per-gebruiker zichtbaar/volgorde.
5. **Filteren** — per-kolom filters (client-side) → server-side `$filter` (hybride) → opslaanbare filtersets (privé + gedeeld).
6. **Tweede entiteit als bewijs** — bv. Vendors via alleen config, om generiek ontwerp te valideren.

## 9. Risico's & aandachtspunten

- **Performance/timeout:** meer kolommen + `$expand` vergroten payload; bestaande 504-gevoeligheid (zie `usePurchaseOrdersPage.js`). `$select` op basis van keuze beperkt dit; server-side filter moet binnen timeout blijven.
- **Veldnamen exact:** keuzelijst moet uit échte `$metadata`-properties komen, niet uit aannames — anders blijven kolommen leeg.
- **Datatypes/rendering:** D365 levert datums, decimalen, enums — generieke render moet types netjes formatteren (nu hardgecodeerd per kolom).
- **Injectie-veiligheid:** server-side `$filter` strikt whitelisten op veld + operator; literals escapen.
- **Autorisatie:** metadata- en config-endpoints achter `requireRole('admin')`; filtersets `is_shared` alleen door admin.
- **Migratie bestaande voorkeuren:** huidige `user_board_settings` normaliseren tegen nieuwe (grotere) kolommenset; behoud de 8 bestaande kolommen als default-zichtbaar.
- **`MAX_COLUMNS = 80`** grens (`server/routes/supplier.js`) en bijbehorende validatie meeschalen.

## 10. Definition of Done

- Admin kan per entiteit uit alle D365-kolommen kiezen (header + regel) en labels instellen.
- Gekozen kolommen stromen aantoonbaar door naar de Supplier Portal-tabel.
- Gebruiker kan zichtbare kolommen + volgorde personaliseren.
- Per-kolom filters werken (client-side + server-side voor volledige dataset).
- Filtersets opslaan/hergebruiken werkt; admin kan delen.
- Regels tonen via uitklapbare detailregels.
- Minimaal één tweede entiteit aantoonbaar via alleen config toe te voegen (generiek bewezen).

## 11. Geraakte/nieuwe bestanden (indicatief)

**Nieuw**
- `scripts/db/migrations/007_odata_entities.sql`
- `scripts/db/migrations/008_odata_entity_columns.sql`
- `scripts/db/migrations/009_odata_filter_sets.sql`
- `server/services/D365MetadataService.js` (metadata-discovery + cache)
- `src/components/admin/AdminODataColumns.jsx`
- generiek DataGrid-component (frontend) + bijbehorende hook

**Wijzigen**
- `server/services/D365ODataService.js` (generieke mapping + `$select`/`$filter`)
- `server/routes/admin.js` (metadata- + kolomconfig-endpoints)
- `server/routes/supplier.js` (kolomdefinitie in respons, filter-params, filter-sets)
- `server/services/SettingsService.js` (evt. entity-config helpers)
- `src/components/supplier/PurchaseOrdersPage.jsx` + `src/hooks/usePurchaseOrdersPage.js` (dynamische kolommen)
- `scripts/d365/inspect-metadata.mjs` (parselogica delen/uitbreiden)

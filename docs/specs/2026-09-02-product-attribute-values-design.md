# Product attribute values (D365-entiteit)

## BRD

**Als** admin (rol `admin`) die het datamodel beheert
**wil ik** de D365-entiteit Product attribute values ophalen, op de Data model-pagina beheren met dezelfde admin-functies als Items/Vendors/Product receipt lines, en gekozen attribuutnamen als aparte kolommen op het PO-board zetten
**zodat** inkopers (en leveranciers op eigen orders) productkenmerken naast de PO-regel zien, zonder D365 te openen of Excel-workarounds.

**Probleem nu:**

- De app heeft vier D365-entiteiten in het datamodel: Purchase orders, Vendors, Items (`ReleasedProductsV2`), Product receipt lines. Productkenmerken (attribuutwaarden) staan alleen in D365.
- Zonder cache kan de app die waarden niet tonen, hergebruiken of in de nachtverversing meenemen. Inkopers missen kenmerken op het PO-board; admins hebben geen tab, syncfilter, preview of kolombeheer voor deze bron.
- Eén artikel heeft **veel** attribuutrijen (niet 1:1 zoals Items). Zonder expliciete keuze welke attribuutnamen kolommen worden, explodeert het board of blijven de waarden onbruikbaar in een ruwe rijlijst.

**Succes (toetsbaar):**

1. **Vijfde Data model-tab** "Product attribute values" (Engelse UI), naast Purchase orders / Vendors / Items / Product receipt lines.
2. Dezelfde admin-functies als de bestaande single-entity-tabs: syncfilter, cache/re-import baseline, data preview, kolomzichtbaarheid, visible-at-delete, discover fields, night refresh als cascade-entiteit. Validate fields bestaat op deze branch niet — niet nabouwen in v1.
3. Cache bevat alleen attribuutwaarden van artikelen die **al in de Items-cache** zitten — geen volledige D365-dump. Night refresh stopt na een hard chunk-budget (zie TD).
4. Admin kiest welke attribuutnamen als **aparte PO-boardkolommen** komen (1 kolom per gekozen attribuut; waarde uit de cache, gekoppeld via artikelnummer). Niet-gekozen attributen blijven in de cache/preview, niet op het board.
5. Zichtbaarheid gelijk aan andere lookup-kolommen: staff ziet alles; leverancier ziet alleen attributen bij eigen PO-regels. Ruwe PAV-tabel: alleen admin.
6. Bestaande vier entiteiten, PO-boardgedrag en night-refresh-duur blijven leidend: geen regressie op hun sync, preview of board.

**Non-goals:**

- Geen writeback van attribuutwaarden naar D365 (toggle mag zichtbaar blijven; server weigert schrijven).
- Geen extra D365-entiteiten in v1 (attribuut-definities, vertalingen, product masters als losse tabellen).
- Geen nieuw scherm buiten Data model + bestaande PO-boardkolommen.
- Geen automatische kolom-per-attribuutnaam voor élke naam in D365 (alleen wat de admin kiest).
- Geen RCCP/KPI-maat op attributen in v1.
- Geen Excel-vervanging of wijziging aan bestaande Excel-lookup (`externalLinks`).
- Geen Validate fields in v1.

**Constraints:**

- UI Engels (`.cursor/rules/app-taal.mdc`).
- Auth: Data model en ruwe PAV-API blijven `admin`; PO-board volgt bestaande rol- en leveranciersscope (`supplierRowAccess`).
- Geen secrets in code; SQL via parameters; nieuwe routes `requireSession` / `requireRole`.
- Volume: sync scoped op Items-cache **in de OData-$filter** (niet fetch-dan-droppen); `max_rows` volgt de bestaande fetch-cap (10000); night refresh mag bestaande PO/Items/Vendors/PRL niet merkbaar vertragen (hard chunk-budget).
- Cardinaliteit 1:N: board toont gepivotete gekozen namen, niet ruwe attribuutrijen als extra PO-regels.
- Componenten ≤300 regels. `TableDataService.js` (5308) en `useDataModelAdmin.js` (354) groeien niet met fetch-/toggle-logica.
- OTAP local-first: ontwikkelen/testen op localhost; geen push zonder verzoek. Migratie 046 gaat mee in `deploy-dev.yml` / `deploy-prod.yml` bij latere merge/promote.
- Bestaande vier entiteiten, hun filters, retention en lookups niet breken.

**Geraakt, geen extra v1-oppervlak:** planners/RCCP — attributen zijn later eventueel herbruikbaar, niet in deze oplevering.

## FRD

**Gekozen approach:** Vijfde `tb_tables`-entiteit met ruwe D365-rijen in `tb_cache` (één rij per artikel × attribuutnaam × unieke waarde), dezelfde Data model-tab-functies als Items (zonder Validate fields), en een **aparte pivot** naar het PO-board — niet via 1:1 `applyLookups`. Admin zet per unieke attribuutnaam `Visible on PO board`; de PO-regel krijgt één tekstkolom per gekozen naam, gevuld via exact `ItemNumber` = `ProductNumber`.

**Afgewezen:**

- Attribuutwaarden na sync op de Items-cache schrijven.
- Excel-achtige lookup-dataset zonder D365-tab.
- Fetch met alleen admin-`$filter` en daarna ProductNumbers client-side droppen (dump tot cap).

**Happy path**

1. Admin opent **Data model → Product attribute values**.
2. Zet desgewenst extra syncfilterregels (typisch `AttributeName`), Save.
3. **Sync now** of night refresh: na Items haalt de server Product attribute values op met **admin-filter AND ProductNumber-chunks** uit de Items-cache, schrijft `tb_cache`.
4. Preview toont ruwe rijen. **Discover D365 fields** werkt zoals op Items.
5. Sectie **PO board columns**: unieke namen (cache ∪ al aangezette kolommen); switches default **uit**.
6. Admin zet bv. `Season` aan → read-only kolom op PO-detail, zichtbaar op het board.
7. Inkoper ziet Season op de regel. Leverancier alleen bij eigen orders.
8. Twee unieke waarden → eerste + `+1`; `title` toont beide (geen Fluent `Tooltip` in de lijst).

**Rollen**

| Rol | Start | Ziet | Wijzigt |
|-----|--------|------|---------|
| `admin` | Data model-tab, sync, filters, board-columns, discover | Ruwe cache + boardkolommen | Ja |
| `employee` | Niets | Alleen gekozen kolommen op het PO-board | Nee — geen `GET /api/data/product-attribute-values` |
| `supplier` | Niets | Zelfde kolommen, alleen eigen PO-regels | Nee |

Writeback: PAV-bronkolommen en `pav_*`-kolommen zijn niet schrijfbaar; `correct`/`value`/`setWriteBackConfig` geven 400.

**Leeg**

- Items-cache leeg → geen D365-call, empty preview, lege boardcellen (niet `0`).
- Artikel zonder die naam → lege cel.
- Nog geen sync → *"No attribute names yet. Sync this entity first."*
- Naam verdwijnt uit D365 → kolom blijft; switch blijft uitzetbaar; cellen leeg. Geen auto-delete.

**Fout**

- D365 403/timeout: `error_text` op de PAV-entiteit; overige entiteiten gaan door.
- Refresh al bezig: attach.
- Truncatie (`max_rows` 10000 of chunk-budget 50): `truncated` + Engelse `notice_text`. Geen stille data.
- Ongeldig syncfilter: zelfde 400 als Items.
- Toggle onbekende **nieuwe** naam → 400; toggle van een **bestaande** `pav_*`-kolom (naam weg uit cache) blijft 200.

**Overlap:** `tb_cache` + `tb_columns` zijn bron van waarheid. Geen `localStorage`. Laatste voltooide refresh / laatste kolom-write wint.

**UI:** tab *Product attribute values*; panel alleen op die tab; Engels; `+N` via bestaande `PurchaseOrderLinkedValueCell` met `hover="title"` op het board.

**Zichtbaarheid:** ruwe PAV alleen admin; gepivotete waarden zoals andere PO-kolommen. Zelfde `ItemNumber` in twee companies deelt attributen (bewuste keuze: product-masterdata, geen `dataAreaId`-join).

**Acceptatiecriteria**

1. Tab met syncfilter, cache/re-import, preview, kolomswitches, discover — geen Validate fields.
2. Elke D365-call bevat ProductNumber-scope uit de Items-cache; geen volledige dump.
3. Switch `Season` aan → kolom op PO-regels; default uit.
4. Exact `ItemNumber` = `ProductNumber`.
5. Twee unieke waarden → eerste + `+1` + `title`; leeg → lege cel.
6. Employee/supplier kunnen de ruwe PAV-API niet lezen; leverancier ziet boardkolommen alleen op eigen orders; geen writeback.
7. Items-fail → PAV tegen stale Items-cache; bestaande vier entiteiten blijven werken.
8. Night run: PAV na Items; bij >50 ProductNumber-chunks stopt PAV-fetch met `truncated`.

## TD

### Hergebruik (paden)

| Stuk | Pad | Wat |
|------|-----|-----|
| Migratie | `scripts/db/migrations/046_product_attribute_values.sql` | Tabellen/kolommen/sync_state + CHECK-verbreding + pivot-relatie |
| Fetch | `server/services/productAttributeValuesFetch.js` + `.test.js` | Eigen adapter; **niet** in `TableDataService.js` |
| OData | `D365ODataService.fetchEntityRecords` | `applyCompanyFilter: false`; chunks 20; cap `MAX_PURCHASE_ORDER_ITEMS` (10000) |
| Puur | `server/utils/productAttributeValues.js` + `.test.js` | Display-waarde, unieke waarden, eerste + count |
| Kolomkey | bestaande `slugify` / `uniqueKeyForScope` in `TableColumnsService.js` | Geen tweede slug; desnoods naar `server/utils/columnKey.js` als export een cycle geeft |
| Pivot read | `server/services/productAttributePivot.js` + `.test.js` | SQL + index + apply; mag `TableDataService` niet requiren |
| Boardkolommen | `server/services/ProductAttributeBoardColumnsService.js` + `.test.js` | GET-lijst + POST-toggle |
| Cascade | `TableRegistryService.listRefreshCascadeTargets` + `refreshCascadeOrder.js` | lookup ∪ pivot; `items` vóór `product-attribute-values` |
| Labels | `RefreshRunService.ENTITY_LABELS` | `'product-attribute-values': 'Product attribute values'` |
| Routes | `server/routes/data.js` | `GET`+`POST /:tableKey/board-columns`; PAV-tableKey ADMIN op read/write |
| Admin | `AdminDataModel.jsx` + `ProductAttributeBoardColumnsPanel.jsx` + `useProductAttributeBoardColumns.js` | Hook **niet** via `useDataModelAdmin` (354) |
| Boardcel | `PurchaseOrderLinkedValueCell.jsx` | Extra prop `hover`: `'tooltip'` (header, default) \| `'title'` (virtualized line) |
| Kolomdetectie | `src/utils/productAttributeColumn.js` | `isProductAttributeColumn` zoals `isProductImageColumn` |
| Line row | `PurchaseOrderSubitemLineRow.jsx` (332) | Eerst split naar `PurchaseOrderLineCellContent.jsx` (≤300, props ≤10 waar mogelijk); attribuut-branch **in de content**, niet terug in de host |
| Copy | `dataModelInfoCopy.js` | |
| Versie | `src/config/version.js` | PATCH bij implementatie (nu `v1.52.125`) |

`TableDataService.js` (5308): **alleen** `FETCH_ADAPTERS['product-attribute-values'] = productAttributeValuesFetch` en in `buildDetailRow` één aanroep `applyProductAttributePivot(...)`. Geen fetch, geen `boardAttributeNames`, geen `__pivot`-skip.

`useDataModelAdmin.js`: **0 regels erbij**. Panel doet `GET /board-columns` alleen als `selectedTab === 'product-attribute-values'` (geen tweede `/datamodel`).

### D365-bron

- Entity set: `/data/ProductAttributeValuesV3`. Eerste buildstap: `scripts/d365/inspect-metadata.mjs ProductAttribute` op ACC; ontbreekt V3, dan `source_entity` in 046 naar het bestaande public collection name vóór sync. Geen tweede entiteit.
- Match: `ProductNumber` = `ItemNumber`, partitionloos. Zelfde itemnummer in twee companies deelt attributen (bewust).
- Naam: `AttributeName` else `Name`.
- Display (eerste niet-lege): `AttributeValue` → `TextValue` → `IntegerValue` → `DecimalValue` → `BooleanValue` → `DateTimeValue` → `CurrencyValue`.
- `$select` bij fetch bevat altijd sleutels + deze waardeketen, ook als Discover de extra velden nog hidden heeft.
- Adapter zet zelf: `partition_key = 'shared'`, `record_key = (ProductNumber + '|' + AttributeName + '|' + displayValue).slice(0, 128)`. **Niet** `resolveRecordKeys` (die zou 1:N collapsen). `tb_tables.key_fields` documenteert `ProductNumber,AttributeName,AttributeValue`.
- Seed-kolommen (`writable = 0`): `productNumber`, `attributeName`, `attributeValue`, `attributeTypeName`. Label Engels: *Product attribute values*.
- `max_rows = 10000` (gelijk aan `MAX_PURCHASE_ORDER_ITEMS`; 50000 is onhaalbaar). `stale_minutes` 15, `sort_order` 230.

### Fetch-volgorde en scope

`ITEMS_CACHE_SCOPED_TABLE_KEYS = {'product-attribute-values'}`. Niet in `PO_LOOKUP_SCOPED_TABLE_KEYS`.

1. Distinct itemnummers = distinct `record_key` van items-`tb_cache` (`removed_at_source = 0`). Stale OK. Leeg → geen D365-call.
2. Admin-`$filter` via `getTableSyncFilter` / `compileSyncRules` (escape via bestaande compiler).
3. **Altijd** `combineODataFilters(adminFilter, buildOneOfFilterClause('ProductNumber', chunk))`. Nooit admin-filter alleen.
4. `fetchEntityRecords({ applyCompanyFilter: false, maxItems: 10000, extraFilter: scoped })`. `time('pav_fetch')`.
5. Chunks: `D365_FILTER_CHUNK_SIZE` (20). **Hard stop na 50 chunks (1000 itemnummers):** rest niet ophalen, `truncated = true`, notice: *Add an AttributeName sync filter; refresh stopped after 1000 item numbers to protect night refresh.*
6. Body: `visible` moet boolean zijn (geen `"false"`); `attributeName` string, trim, max 128, geen `\x00-\x1F`. `options_json` via `JSON.stringify`.

### Cascade en relatie (geen fake 1:1-lookup)

046 verbreedt `CK_tb_relations_role` met `'pivot'` en insert:

- `relation_kind` = `fk_join`, `relation_role` = **`pivot`** (niet `lookup`, geen `{"__pivot":true}`)
- `source_scope` = `detail`, `source_field` = `ItemNumber`
- `target_table_key` = `product-attribute-values`, `target_key_field` = `ProductNumber`

Oude `getLookups` (`WHERE relation_role = 'lookup'`) ziet deze rij niet → oude `loadSingleLookup` doet geen 1:1-collapse tijdens deploy (migratie vóór container-update is veilig).

Nieuw: `listRefreshCascadeTargets` = lookup-targets ∪ pivot-targets. `orderLookupTargetKeys` houdt D365-vóór-Excel en sorteert daarna `REFRESH_AFTER = { 'product-attribute-values': 'items' }`. PAV-fout: `markEntityError` alleen PAV.

### Boardkolommen

046 verbreedt `CK_tb_columns_source` naar `('source','custom','lookup')`. Geen `pav_*`-rijen seeden (pas bij toggle) → oude board-read ziet niets extra's.

Toggle upsert op PO detail:

- `key` = `uniqueKeyForScope(..., 'pav_' + slug(AttributeName))` — collision na truncate via `_2`, `_3`; match blijft `options.attributeName`
- `source` = `lookup`, `writable` = 0, `options_json` = `{"kind":"product-attribute","attributeName":"<exact>"}`
- Aan: `is_active = 1`, `is_default_visible = 1`. Uit: `is_active = 0` (rij blijft)

`GET /api/data/product-attribute-values/board-columns`: `cache-namen ∪ bestaande pav_*` (ook inactief). Verdwenen D365-naam blijft in de lijst met `visible` volgens `is_active`.

`POST` zelfde pad: naam in die union → OK. Nieuwe naam die nergens staat → 400. `invalidateTableCache('purchase-orders')`.

### Pivot op read

Alleen bij ≥1 actieve `kind === 'product-attribute'`-kolom. Aanroep in `buildDetailRow` (board + lazy details).

1. `time('tb_lookup_pav_pivot')`: `SELECT` PAV-cache gefilterd op actieve namen (`JSON_VALUE(data_json,'$.attributeName')` IN parameterized lijst).
2. Index `Map<ProductNumber, Map<AttributeName, string[]>>`, uniek + `localeCompare`.
3. `values[columnKey] = first | null`. Extra **niet** in `values`: `row.pavExtras[columnKey] = { additionalCount, allValuesLabel }` alleen als `additionalCount > 0`.
4. Cel krijgt primitives: `firstValue`, `additionalCount`, `allValuesLabel` — geen nieuw object per render.

### Auth

- Alle `/api/data/product-attribute-values*` (GET tabel, details, history, correct, value, exclude, columns, board-columns): `requireRole(ADMIN)` plus bestaande session.
- PO-board: ongewijzigd + `supplierRowAccess`.
- Write-pad (`correctField`, `saveCustomValue`, `setWriteBackConfig`): 400 als `tableKey === 'product-attribute-values'` of `options.kind === 'product-attribute'`.

### UI / grootte

- Panel alleen bij geselecteerde PAV-tab; ≤10 props; empty-string Engels.
- `PurchaseOrderLinkedValueCell`: bij `hover="title"` Badge+`title`, geen Tooltip (lijst-regel). Header blijft default Tooltip.
- Line-split: image/status/writeback + PAV in `PurchaseOrderLineCellContent.jsx`; host blijft `<tr>`+`map`. Inline handlers in de host meenemen naar content/`useCallback`.

### Perf

| Punt | Metric |
|------|--------|
| D365 | `time('pav_fetch')` |
| Pivot | `time('tb_lookup_pav_pivot')` |
| Admin namen/toggle | `apiRequest` op `/board-columns` (niet op PO-board-load) |

### Volgorde

1. Migratie 046 op localhost (`run-migrations.js`). Zelfde script gaat later mee in deploy-dev (merge `develop`) en deploy-prod (`/promote-to-prod`).
2. Utils + cascade-order + tests.
3. Fetch-module + `FETCH_ADAPTERS`-registratie + tests.
4. Pivot + `buildDetailRow`-aanroep + tests.
5. Board-columns service + GET/POST + PAV ADMIN-gate + write-weigering.
6. Admin tab + panel + hook (geen `useDataModelAdmin`-wijziging).
7. Split line-row + `hover="title"` op LinkedValueCell + `isProductAttributeColumn`.
8. `ENTITY_LABELS`, info-copy, version PATCH, `npm test`.

### Aantoonbaar

- Tab + Sync now → preview; Discover voegt velden toe.
- Switch aan/uit → kolom op/af het PO-board.
- Twee waarden → `+1` + `title`.
- Employee `GET /api/data/product-attribute-values` → 403.
- Night panel: PAV na Items; >1000 items zonder AttributeName-filter → truncated notice.
- `npm test` groen.

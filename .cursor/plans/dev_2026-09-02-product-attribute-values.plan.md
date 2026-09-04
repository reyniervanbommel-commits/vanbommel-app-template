# Product attribute values Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vijfde D365-entiteit Product attribute values cachen, op Data model beheren, en gekozen attribuutnamen als PO-boardkolommen tonen.

**User story:** Als admin (rol `admin`) die het datamodel beheert wil ik de D365-entiteit Product attribute values ophalen, op de Data model-pagina beheren met dezelfde admin-functies als Items/Vendors/Product receipt lines, en gekozen attribuutnamen als aparte kolommen op het PO-board zetten zodat inkopers (en leveranciers op eigen orders) productkenmerken naast de PO-regel zien, zonder D365 te openen of Excel-workarounds.

**Acceptatiecriteria (toetsbaar):** zie spec §FRD; samengevat: (1) tab + sync/preview/kolommen/discover, geen Validate fields; (2) elke D365-call scoped op Items-cache ProductNumbers; (3) switch default uit; (4) exact ItemNumber = ProductNumber; (5) twee unieke waarden → eerste +N + title, leeg → lege cel; (6) employee/supplier geen ruwe PAV-API, geen writeback; (7) Items-fail → stale Items-cache; (8) night run PAV ná Items, chunk-cap 50 → truncated + notice_text.

**Architecture:** Nieuwe `tb_tables`-rij + ruwe `tb_cache` (1:N). Eigen fetch-adapter scoped op Items-cache ItemNumbers (OData AND admin-filter). Apart pivot-pad (niet 1:1 `applyLookups`). Persistente `pav_*` lookup-kolommen op PO-detail. Night cascade via `relation_role = pivot` ná Items.

**Tech Stack:** React 18, Fluent UI v9, Express, mssql, Vitest, D365 OData.

**Spec:** `docs/specs/2026-09-02-product-attribute-values-design.md`

## Global Constraints

- UI-teksten Engels; AI-antwoorden Nederlands.
- Componenten/hooks ≤300 regels. `useDataModelAdmin.js` 0 regels erbij. `TableDataService.js` groeit alleen met: `FETCH_ADAPTERS`-registratie, `listRefreshCascadeTargets`-wire, `noticeText` doorzetten in `refresh()`, één `applyProductAttributePivot`-aanroep in `buildDetailRow`, write-guard. **Geen** `__pavKeys` / `resolveRecordKeys`-bypass in `refresh()`.
- Geen Validate fields. Geen writeback. Geen `localStorage` als bron.
- Tests: `npm test -- <bestanden>`. Versie: PATCH in `src/config/version.js` in de laatste taak (nu `v1.52.125`).
- **Geen git commit/push** tenzij de gebruiker dat expliciet vraagt (OTAP local-first). Suggested messages staan per taak.
- Ontwikkelen/testen op localhost (`http://localhost:5178`). Migratie 046 lokaal via `npm run migrate:db`.

## Review pins (2026-09-02, review-plan-for-devops)

Open A/B's uit de plan-review zijn **dicht**. Niet heropenen tijdens bouw:

1. `listRefreshCascadeTargets` retourneert `Promise<string[]>` (table keys), daarna `orderLookupTargetKeys`. Geen object-array.
2. PAV-adapter retourneert dezelfde record-vorm als `genericMasterD365Fetch` (`partitionKey`, `recordKey`, `masterRaw`, `master: {}`, `details: []`). Sleutels via `buildPavRecordKey`. Geen `__pavKeys` in `refresh()`.
3. `refresh()` destructureert `noticeText` en schrijft `refreshRunService.updateEntity(table.key, { notice_text: noticeText })`.
4. Admin-filter = Items-pad: `compileSyncRules(parseDefaultFilterRules(table.defaultFilter))`. Geen `PO_SYNC_RULES`. Geen settings-key-zoektocht.

## File map

| File | Verantwoordelijkheid |
|------|----------------------|
| `server/utils/productAttributeValues.js` | display, cache-key, unique values, first+count |
| `server/utils/odataFilterCombine.js` | `chunkList` / `combineODataFilters` / `buildOneOfFilterClause` (verplaatst uit TableDataService) |
| `server/utils/refreshCascadeOrder.js` | `REFRESH_AFTER` items vóór PAV |
| `server/services/TableRegistryService.js` | `listRefreshCascadeTargets` (lookup ∪ pivot) |
| `scripts/db/migrations/046_product_attribute_values.sql` | schema + seed |
| `server/services/productAttributeValuesFetch.js` | D365 fetch |
| `server/services/productAttributePivot.js` | board-read pivot |
| `server/services/ProductAttributeBoardColumnsService.js` | GET/POST board-columns |
| `server/services/TableDataService.js` | adapter-registratie + cascade-wire + `noticeText` in `refresh()` + pivot-aanroep + write-weigering |
| `server/services/TableColumnsService.js` | writeback-weigering |
| `server/routes/data.js` | ADMIN-gate PAV + board-columns routes |
| `src/config/version.js` | PATCH |
| `src/config/devTestItems.js` | checklist-item |
| `src/hooks/useProductAttributeBoardColumns.js` | admin panel data |
| `src/components/admin/datamodel/ProductAttributeBoardColumnsPanel.jsx` | switches |
| `src/components/admin/datamodel/AdminDataModel.jsx` | vijfde tab |
| `src/utils/productAttributeColumn.js` | `isProductAttributeColumn` |
| `src/components/supplier/PurchaseOrderLinkedValueCell.jsx` | `hover="title"` |
| `src/components/supplier/PurchaseOrderLineCellContent.jsx` | split uit SubitemLineRow + PAV-cel |
| `src/components/supplier/PurchaseOrderSubitemLineRow.jsx` | layout-only host |

---

### Task 1: Pure utils + OData-combine extract

**Files:**
- Create: `server/utils/productAttributeValues.js`
- Create: `server/utils/productAttributeValues.test.js`
- Create: `server/utils/odataFilterCombine.js`
- Modify: `server/services/TableDataService.js` — `chunkList`/`combineODataFilters`/`buildOneOfFilterClause` vervangen door require; re-export ongewijzigd
- Test: `server/utils/productAttributeValues.test.js` + bestaande `TableDataService.test.js` combine-tests

**Interfaces:**
- Consumes: `escapeODataLiteral` uit `server/services/D365ODataService.js`
- Produces:
  - `attributeNameFromRaw(raw) => string`
  - `attributeDisplayValue(raw) => string`
  - `buildPavRecordKey({ productNumber, attributeName, displayValue }) => { partitionKey: 'shared', recordKey: string }`
  - `uniqueSortedValues(values) => string[]`
  - `firstValueAndExtra(values) => { first, additionalCount, allValuesLabel }`
  - `chunkList(values, size) => any[][]`
  - `combineODataFilters(base, extra) => string`
  - `buildOneOfFilterClause(field, values) => string`

- [ ] **Step 1: Write failing tests**

```js
'use strict';
const {
  attributeNameFromRaw,
  attributeDisplayValue,
  buildPavRecordKey,
  uniqueSortedValues,
  firstValueAndExtra,
} = require('./productAttributeValues');

describe('productAttributeValues', () => {
  it('leest AttributeName met fallback Name', () => {
    expect(attributeNameFromRaw({ AttributeName: 'Season' })).toBe('Season');
    expect(attributeNameFromRaw({ Name: 'Material' })).toBe('Material');
  });

  it('kiest de eerste niet-lege displaywaarde in keten-volgorde', () => {
    expect(attributeDisplayValue({ IntegerValue: 7 })).toBe('7');
    expect(attributeDisplayValue({ AttributeValue: 'SS26', TextValue: 'x' })).toBe('SS26');
    expect(attributeDisplayValue({})).toBe('');
  });

  it('bouwt een 1:N cache-sleutel van max 128 tekens', () => {
    const keys = buildPavRecordKey({
      productNumber: 'SHOE-41',
      attributeName: 'Season',
      displayValue: 'SS26',
    });
    expect(keys).toEqual({ partitionKey: 'shared', recordKey: 'SHOE-41|Season|SS26' });
    expect(buildPavRecordKey({
      productNumber: 'A',
      attributeName: 'B',
      displayValue: 'x'.repeat(200),
    }).recordKey.length).toBe(128);
  });

  it('unieke waarden stabiel gesorteerd; eerste + extra count', () => {
    expect(uniqueSortedValues(['FW26', 'SS26', 'FW26'])).toEqual(['FW26', 'SS26']);
    expect(firstValueAndExtra(['FW26', 'SS26'])).toEqual({
      first: 'FW26',
      additionalCount: 1,
      allValuesLabel: 'FW26, SS26',
    });
    expect(firstValueAndExtra(['SS26'])).toEqual({
      first: 'SS26',
      additionalCount: 0,
      allValuesLabel: 'SS26',
    });
    expect(firstValueAndExtra([])).toEqual({ first: '', additionalCount: 0, allValuesLabel: '' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- server/utils/productAttributeValues.test.js`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `productAttributeValues.js`**

```js
'use strict';

const RECORD_KEY_MAX = 128;

function firstNonEmptyString(values) {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    return String(value);
  }
  return '';
}

function attributeNameFromRaw(raw) {
  return firstNonEmptyString([raw?.AttributeName, raw?.Name, raw?.attributeName, raw?.name]);
}

function attributeDisplayValue(raw) {
  return firstNonEmptyString([
    raw?.AttributeValue, raw?.TextValue, raw?.attributeValue, raw?.textValue,
    raw?.IntegerValue, raw?.DecimalValue, raw?.BooleanValue,
    raw?.DateTimeValue, raw?.CurrencyValue,
  ]);
}

function buildPavRecordKey({ productNumber, attributeName, displayValue }) {
  const recordKey = [productNumber, attributeName, displayValue]
    .map((part) => String(part || '').trim())
    .join('|')
    .slice(0, RECORD_KEY_MAX);
  return { partitionKey: 'shared', recordKey };
}

function uniqueSortedValues(values) {
  const unique = [...new Set((Array.isArray(values) ? values : [])
    .map((value) => String(value ?? '').trim())
    .filter(Boolean))];
  unique.sort((a, b) => a.localeCompare(b));
  return unique;
}

function firstValueAndExtra(values) {
  const unique = uniqueSortedValues(values);
  if (!unique.length) return { first: '', additionalCount: 0, allValuesLabel: '' };
  return {
    first: unique[0],
    additionalCount: Math.max(unique.length - 1, 0),
    allValuesLabel: unique.join(', '),
  };
}

module.exports = {
  attributeNameFromRaw,
  attributeDisplayValue,
  buildPavRecordKey,
  uniqueSortedValues,
  firstValueAndExtra,
};
```

- [ ] **Step 4: Extract OData combine helpers**

Maak `server/utils/odataFilterCombine.js` met de huidige `chunkList` / `combineODataFilters` / `buildOneOfFilterClause` uit `TableDataService.js` (regels ~704–732), `escapeODataLiteral` via `require('../services/D365ODataService')`. In `TableDataService.js` de drie functies verwijderen en:

```js
const { chunkList, combineODataFilters, buildOneOfFilterClause } = require('../utils/odataFilterCombine');
```

Re-export onderaan blijft zodat bestaande tests niet breken.

- [ ] **Step 5: Run tests**

Run: `npm test -- server/utils/productAttributeValues.test.js server/services/TableDataService.test.js`
Expected: PASS

Suggested commit: `feat: PAV display-utils en OData-combine extract`

---

### Task 2: Cascade-order + pivot-targets

**Files:**
- Modify: `server/utils/refreshCascadeOrder.js`
- Modify: `server/utils/refreshCascadeOrder.test.js`
- Modify: `server/services/TableRegistryService.js` — `listRefreshCascadeTargets`
- Create: `server/services/TableRegistryService.cascade.test.js` (of uitbreiden van bestaande test met mocks; als SQL nodig is: unit-test de query-mapper puur door `listRefreshCascadeTargets` te exporteren en de row-mapper te testen via een interne `mapCascadeRow` — liever: extraheer `mergeCascadeTargetKeys(lookupKeys, pivotKeys)` puur)

**Interfaces:**
- Consumes: bestaande `getLookups`, `orderLookupTargetKeys`
- Produces:
  - `REFRESH_AFTER = { 'product-attribute-values': 'items' }`
  - `orderLookupTargetKeys` respecteert parent-vóór-child ná D365/Excel-split
  - `listRefreshCascadeTargets(tableId) => Promise<string[]>` — unique target table keys (lookup ∪ pivot), daarna `orderLookupTargetKeys` in de caller
  - `mergeCascadeTargetKeys(lookupKeys, pivotKeys) => string[]` uniek, lookup+pivot

- [ ] **Step 1: Failing test voor order**

Voeg toe in `server/utils/refreshCascadeOrder.test.js`:

```js
  it('zet product-attribute-values ná items', async () => {
    const loadTable = async (key) => ({ key, source: { providerType: 'd365-odata' } });
    const ordered = await orderLookupTargetKeys(
      ['product-attribute-values', 'vendors', 'items'],
      loadTable,
    );
    expect(ordered.indexOf('items')).toBeLessThan(ordered.indexOf('product-attribute-values'));
    expect(ordered[0]).toBe('vendors');
  });
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm test -- server/utils/refreshCascadeOrder.test.js`

- [ ] **Step 3: Implement order**

In `refreshCascadeOrder.js`:

```js
const REFRESH_AFTER = {
  'product-attribute-values': 'items',
};

function applyRefreshAfter(keys) {
  const list = [...keys];
  Object.entries(REFRESH_AFTER).forEach(([child, parent]) => {
    const childIdx = list.indexOf(child);
    const parentIdx = list.indexOf(parent);
    if (childIdx === -1 || parentIdx === -1 || parentIdx < childIdx) return;
    list.splice(childIdx, 1);
    list.splice(list.indexOf(parent) + 1, 0, child);
  });
  return list;
}
```

Pas `orderLookupTargetKeys` aan: na D365/Excel-concat `return applyRefreshAfter([...d365, ...excel])`.

- [ ] **Step 4: `mergeCascadeTargetKeys` + `listRefreshCascadeTargets`**

In `TableRegistryService.js`, naast `getLookups`:

```js
function mergeCascadeTargetKeys(lookupKeys, pivotKeys) {
  return [...new Set([
    ...(lookupKeys || []).map((k) => String(k || '').trim()).filter(Boolean),
    ...(pivotKeys || []).map((k) => String(k || '').trim()).filter(Boolean),
  ])];
}

async function listRefreshCascadeTargets(tableId) {
  const pool = await getPool();
  const result = await pool.request()
    .input('tableId', sql.BigInt, tableId)
    .query(`
      SELECT target_table_key, relation_role
      FROM dbo.tb_relations
      WHERE table_id = @tableId AND relation_role IN ('lookup', 'pivot')
    `);
  const lookupKeys = [];
  const pivotKeys = [];
  for (const row of result.recordset) {
    const key = String(row.target_table_key || '').trim();
    if (!key) continue;
    if (String(row.relation_role || '') === 'pivot') pivotKeys.push(key);
    else lookupKeys.push(key);
  }
  return mergeCascadeTargetKeys(lookupKeys, pivotKeys);
}
```

Export `mergeCascadeTargetKeys` en `listRefreshCascadeTargets`. Test `mergeCascadeTargetKeys` co-located.

- [ ] **Step 5: Wire refresh**

In `refreshLookupTargetsAfterPurchaseOrders` (`TableDataService.js` ~2148): vervang `getLookups(table.id)`-map door `listRefreshCascadeTargets(table.id)`.

- [ ] **Step 6: Run tests**

Run: `npm test -- server/utils/refreshCascadeOrder.test.js server/services/TableDataService.test.js`
Expected: PASS

Suggested commit: `feat: night-refresh cascade items vóór product-attribute-values`

---

### Task 3: Migratie 046

**Files:**
- Create: `scripts/db/migrations/046_product_attribute_values.sql`

**Interfaces:**
- Produces: table key `product-attribute-values`, source `/data/ProductAttributeValuesV3`, `max_rows` 10000, `sort_order` 230, seed-kolommen, `tb_sync_state`, CHECK-verbredingen, pivot-relatie

- [ ] **Step 1: Inspect ACC (geen code-gate als MCP down is)**

Run: `node scripts/d365/inspect-metadata.mjs ProductAttribute` (env `D365_ODATA_BASE_URL` + token). Als `ProductAttributeValuesV3` ontbreekt, zet in de migratie `source_entity` op de wél bestaande public collection. Default hieronder is V3.

- [ ] **Step 2: Write idempotent SQL**

```sql
-- 046: Product attribute values (D365) als vijfde datamodel-entiteit.
-- Idempotent. CK-verbreding vóór INSERT. Geen pav_* PO-kolommen seeden.

-- CK_tb_columns_source: lookup toestaan
IF EXISTS (
  SELECT 1 FROM sys.check_constraints
  WHERE name = 'CK_tb_columns_source' AND parent_object_id = OBJECT_ID('dbo.tb_columns')
)
BEGIN
  ALTER TABLE dbo.tb_columns DROP CONSTRAINT CK_tb_columns_source;
END;
ALTER TABLE dbo.tb_columns ADD CONSTRAINT CK_tb_columns_source
  CHECK (source IN ('source','custom','lookup'));

-- CK_tb_relations_role: pivot
IF EXISTS (
  SELECT 1 FROM sys.check_constraints
  WHERE name = 'CK_tb_relations_role' AND parent_object_id = OBJECT_ID('dbo.tb_relations')
)
BEGIN
  ALTER TABLE dbo.tb_relations DROP CONSTRAINT CK_tb_relations_role;
END;
ALTER TABLE dbo.tb_relations ADD CONSTRAINT CK_tb_relations_role
  CHECK (relation_role IN ('detail','lookup','pivot'));

DECLARE @sourceId BIGINT = (SELECT TOP 1 id FROM dbo.tb_sources WHERE [key] = 'd365');

IF @sourceId IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM dbo.tb_tables WHERE [key] = 'product-attribute-values')
BEGIN
  INSERT INTO dbo.tb_tables
    ([key], label, description, source_id, source_entity, key_fields, cache_mode, stale_minutes, max_rows, sort_order)
  VALUES
    ('product-attribute-values', 'Product attribute values',
     'D365 product attribute values from ProductAttributeValuesV3',
     @sourceId, '/data/ProductAttributeValuesV3',
     'ProductNumber,AttributeName,AttributeValue', 'auto', 15, 10000, 230);
END;

DECLARE @pavId BIGINT = (SELECT TOP 1 id FROM dbo.tb_tables WHERE [key] = 'product-attribute-values');
DECLARE @poId BIGINT = (SELECT TOP 1 id FROM dbo.tb_tables WHERE [key] = 'purchase-orders');

IF @pavId IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM dbo.tb_columns WHERE table_id = @pavId AND scope = 'master' AND [key] = 'productNumber')
    INSERT INTO dbo.tb_columns
      (table_id, scope, [key], label, source, source_field, data_type, writable, is_default_visible, filterable, sortable, is_active, sort_order)
    VALUES (@pavId, 'master', 'productNumber', 'Product number', 'source', 'ProductNumber', 'text', 0, 1, 1, 1, 1, 10);

  IF NOT EXISTS (SELECT 1 FROM dbo.tb_columns WHERE table_id = @pavId AND scope = 'master' AND [key] = 'attributeName')
    INSERT INTO dbo.tb_columns
      (table_id, scope, [key], label, source, source_field, data_type, writable, is_default_visible, filterable, sortable, is_active, sort_order)
    VALUES (@pavId, 'master', 'attributeName', 'Attribute name', 'source', 'AttributeName', 'text', 0, 1, 1, 1, 1, 20);

  IF NOT EXISTS (SELECT 1 FROM dbo.tb_columns WHERE table_id = @pavId AND scope = 'master' AND [key] = 'attributeValue')
    INSERT INTO dbo.tb_columns
      (table_id, scope, [key], label, source, source_field, data_type, writable, is_default_visible, filterable, sortable, is_active, sort_order)
    VALUES (@pavId, 'master', 'attributeValue', 'Attribute value', 'source', 'AttributeValue', 'text', 0, 1, 1, 1, 1, 30);

  IF NOT EXISTS (SELECT 1 FROM dbo.tb_columns WHERE table_id = @pavId AND scope = 'master' AND [key] = 'attributeTypeName')
    INSERT INTO dbo.tb_columns
      (table_id, scope, [key], label, source, source_field, data_type, writable, is_default_visible, filterable, sortable, is_active, sort_order)
    VALUES (@pavId, 'master', 'attributeTypeName', 'Attribute type', 'source', 'AttributeTypeName', 'text', 0, 0, 1, 1, 1, 40);
END;

IF @pavId IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM dbo.tb_sync_state WHERE table_id = @pavId)
  INSERT INTO dbo.tb_sync_state (table_id, watermark, last_full_sync_at)
  VALUES (@pavId, NULL, NULL);

IF @poId IS NOT NULL AND @pavId IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM dbo.tb_relations
  WHERE table_id = @poId AND relation_role = 'pivot'
    AND target_table_key = 'product-attribute-values'
)
  INSERT INTO dbo.tb_relations
    (table_id, relation_kind, relation_role, source_scope, source_field, target_table_key, target_key_field, lookup_fields_json)
  VALUES
    (@poId, 'fk_join', 'pivot', 'detail', 'ItemNumber', 'product-attribute-values', 'ProductNumber', NULL);
```

- [ ] **Step 3: Run locally**

Run: `npm run migrate:db`
Expected: script succeeds; tweede run idempotent.

Suggested commit: `feat: migratie 046 product-attribute-values`

---

### Task 4: Fetch-adapter

**Files:**
- Create: `server/services/productAttributeValuesFetch.js`
- Create: `server/services/productAttributeValuesFetch.test.js`
- Modify: `server/services/TableDataService.js` — `FETCH_ADAPTERS['product-attribute-values']` + in `refresh()` `noticeText` doorzetten (geen `__pavKeys`)
- Modify: `server/services/TableDataService.test.js` — adapter bestaat
- Modify: `server/services/RefreshRunService.js` — `ENTITY_LABELS`

**Interfaces:**
- Consumes: `fetchEntityRecords`, `getTableByKey`, `getPool` uit TableRegistryService, `listColumns`, `odataFilterCombine`, `productAttributeValues`, `compileSyncRules` uit `odataSyncFilter.js`, `time` uit `server/utils/timing.js`. Fetch-module mag **niet** `TableDataService` requiren.

- Admin-filter (**dicht, geen A/B**): zelfde pad als Items (`getTableSyncRules` voor non-PO). Kopieer de 8-regelige `parseDefaultFilterRules` in de fetch-module (JSON-array of `[]`), daarna `compileSyncRules(rules)`. **Niet** `PO_SYNC_RULES`. **Niet** `resolveSyncRules` (dat is PO-only). Lege `table.defaultFilter` → admin-filter `''`. Altijd `combineODataFilters(adminFilter, ProductNumber-chunk)`. `applyCompanyFilter: false`.

- Items-keys: SQL distinct `record_key` op de items-tabel.

- Produces: `productAttributeValuesFetch(table, { onProgress }) => { records, total, truncated, noticeText? }`

  Elke `records[]`-entry heeft **dezelfde vorm als `genericMasterD365Fetch`** (wat `refresh()` al persist):

  ```js
  {
    partitionKey: 'shared',
    recordKey: buildPavRecordKey({ productNumber, attributeName, displayValue }).recordKey,
    modifiedAt: raw.ModifiedDateTime || raw.modifiedDateTime || null,
    masterRaw: raw,
    master: {},
    details: [],
  }
  ```

  - `truncated` true bij >50 chunks of fetch truncated
  - `noticeText` Engels bij chunk-cap: `Add an AttributeName sync filter; refresh stopped after 1000 item numbers to protect night refresh.`
  - Lege items-cache: `{ records: [], total: 0, truncated: false }` (geen D365-call, geen `noticeText`)

Constanten in de fetch-module:

```js
const PAV_SELECT_FIELDS = [
  'ProductNumber', 'AttributeName', 'Name', 'AttributeTypeName',
  'AttributeValue', 'TextValue', 'IntegerValue', 'DecimalValue',
  'BooleanValue', 'DateTimeValue', 'CurrencyValue',
];
const MAX_PRODUCT_NUMBER_CHUNKS = 50;
const CHUNK_SIZE = 20; // D365_FILTER_CHUNK_SIZE
```

- [ ] **Step 1: Failing tests (mock fetchEntityRecords)**

```js
'use strict';
const { describe, it, expect, vi, beforeEach } = require('vitest');

vi.mock('./D365ODataService', () => ({
  fetchEntityRecords: vi.fn(),
}));
vi.mock('./TableRegistryService', () => ({
  getTableByKey: vi.fn(),
  getPool: vi.fn(),
  listColumns: vi.fn().mockResolvedValue([]),
}));
vi.mock('./SettingsService', () => ({
  getAsync: vi.fn().mockResolvedValue(''),
}));

const { fetchEntityRecords } = require('./D365ODataService');
const { getTableByKey, getPool } = require('./TableRegistryService');
const { productAttributeValuesFetch } = require('./productAttributeValuesFetch');

const table = {
  key: 'product-attribute-values',
  sourceEntity: '/data/ProductAttributeValuesV3',
  maxRows: 10000,
  defaultFilter: '',
  id: 9,
};

function mockItemsCache(keys) {
  getTableByKey.mockResolvedValue({ id: 3, key: 'items' });
  getPool.mockResolvedValue({
    request: () => ({
      input() { return this; },
      query: async () => ({ recordset: keys.map((record_key) => ({ record_key })) }),
    }),
  });
}

describe('productAttributeValuesFetch', () => {
  beforeEach(() => vi.clearAllMocks());

  it('doet geen D365-call als de items-cache leeg is', async () => {
    mockItemsCache([]);
    const result = await productAttributeValuesFetch(table);
    expect(fetchEntityRecords).not.toHaveBeenCalled();
    expect(result).toEqual({ records: [], total: 0, truncated: false });
  });

  it('geeft genericMaster-recordvorm terug, niet raw D365-items', async () => {
    mockItemsCache(['SHOE-41']);
    fetchEntityRecords.mockResolvedValue({
      items: [{ ProductNumber: 'SHOE-41', AttributeName: 'Season', AttributeValue: 'SS26' }],
      truncated: false,
      pagesFetched: 1,
    });
    const result = await productAttributeValuesFetch(table);
    expect(result.records).toHaveLength(1);
    expect(result.records[0]).toMatchObject({
      partitionKey: 'shared',
      recordKey: 'SHOE-41|Season|SS26',
      masterRaw: { ProductNumber: 'SHOE-41', AttributeName: 'Season', AttributeValue: 'SS26' },
      master: {},
      details: [],
    });
  });

  it('AND-t ProductNumber-chunk altijd, ook mét admin-filter, company-filter uit', async () => {
    mockItemsCache(['SHOE-41']);
    fetchEntityRecords.mockResolvedValue({ items: [], truncated: false, pagesFetched: 1 });
    await productAttributeValuesFetch({
      ...table,
      defaultFilter: JSON.stringify([{ field: 'AttributeName', operator: 'eq', value: 'Season', valueType: 'text', level: 'header' }]),
    });
    const arg = fetchEntityRecords.mock.calls[0][0];
    expect(arg.applyCompanyFilter).toBe(false);
    expect(arg.extraFilter).toContain('ProductNumber eq');
    expect(arg.extraFilter).toContain('AttributeName');
    expect(arg.maxItems).toBe(10000);
  });

  it('stopt na 50 chunks en zet truncated + notice', async () => {
    mockItemsCache(Array.from({ length: 1001 }, (_, i) => `SKU-${i}`));
    fetchEntityRecords.mockResolvedValue({ items: [], truncated: false, pagesFetched: 1 });
    const result = await productAttributeValuesFetch(table);
    expect(fetchEntityRecords.mock.calls.length).toBe(50);
    expect(result.truncated).toBe(true);
    expect(result.noticeText).toMatch(/1000 item numbers/);
  });
});
```

Admin-filter in de test hierboven is een JSON-array zoals Items `default_filter_json`. Compile via `compileSyncRules(parseDefaultFilterRules(...))` — geen extra parsing-onderzoek.

- [ ] **Step 2: Run — expect FAIL**

Run: `npm test -- server/services/productAttributeValuesFetch.test.js`

- [ ] **Step 3: Implement fetch**

Wrap de D365-loop in `time('pav_fetch', async () => { ... })`. Per raw item: skip zonder ProductNumber. Bouw cache-records **in de adapter**, niet in `refresh()`:

```js
function toPavCacheRecord(raw) {
  const productNumber = String(raw?.ProductNumber || raw?.productNumber || '').trim();
  const attributeName = attributeNameFromRaw(raw);
  const displayValue = attributeDisplayValue(raw);
  const keys = buildPavRecordKey({ productNumber, attributeName, displayValue });
  return {
    partitionKey: keys.partitionKey,
    recordKey: keys.recordKey,
    modifiedAt: raw?.ModifiedDateTime || raw?.modifiedDateTime || null,
    masterRaw: raw,
    master: {},
    details: [],
  };
}
```

**Niet** `resolveRecordKeys`. **Niet** `genericMasterD365Fetch`. **Niet** `__pavKeys` op raw of in `refresh()`.

`refresh()` (bestaande destructure uitbreiden, ~2235):

```js
const { records, total, truncated, noticeText } = await adapter(table, { onProgress: handleFetchProgress });
if (noticeText) refreshRunService.updateEntity(table.key, { notice_text: noticeText });
```

Dat is de enige extra TDS-wijziging in `refresh()` naast `FETCH_ADAPTERS`. Truncatie-AC (nachtjob) faalt zonder deze regel.

- [ ] **Step 4: Register adapter + label**

```js
const { productAttributeValuesFetch } = require('./productAttributeValuesFetch');
const FETCH_ADAPTERS = {
  'purchase-orders': purchaseOrdersFetch,
  vendors: vendorsFetch,
  items: itemsFetch,
  'product-receipt-lines': genericMasterD365Fetch,
  'product-attribute-values': productAttributeValuesFetch,
};
```

`RefreshRunService.js` ENTITY_LABELS: `'product-attribute-values': 'Product attribute values'`.

In `TableDataService.test.js` FETCH_ADAPTERS-describe: `expect(typeof FETCH_ADAPTERS['product-attribute-values']).toBe('function');`

- [ ] **Step 5: Run tests**

Run: `npm test -- server/services/productAttributeValuesFetch.test.js server/services/TableDataService.test.js`
Expected: PASS

Suggested commit: `feat: D365 fetch voor product-attribute-values`

---

### Task 5: Pivot op PO-read

**Files:**
- Create: `server/services/productAttributePivot.js`
- Create: `server/services/productAttributePivot.test.js`
- Modify: `server/services/TableDataService.js` `buildDetailRow` — één aanroep; `buildDetailRow` return `pavExtras` wanneer aanwezig
- Test: `server/services/productAttributePivot.test.js`

**Interfaces:**
- Consumes: `getPool`, `getTableByKey`, `listColumns`, `firstValueAndExtra`, `time`
- Produces:
  - `loadProductAttributePivot(detailColumns) => Promise<null | PivotIndex>`
  - `applyProductAttributePivot(detailValues, itemNumber, pivot, pavColumnList) => pavExtras | null`
  - PivotIndex: `Map<string, Map<string, string[]>>` keyed by ProductNumber → AttributeName → values

`loadProductAttributePivot`: als geen actieve kolom met `options.kind === 'product-attribute'`, return `null` (geen SQL). Anders parameterized `JSON_VALUE(data_json, '$.attributeName')` IN (...namen). Index-keys zijn **camelCase** zoals `projectJson` ze opslaat (`productNumber` / `attributeName` / `attributeValue`), niet D365-PascalCase. Fallback op `ProductNumber` mag, primaire pad is camelCase.

- [ ] **Step 1: Pure apply-test (geen SQL)**

Exporteer `buildPivotIndex(rows)` en `applyProductAttributePivot` voor unit tests:

```js
it('vult first value en pavExtras alleen bij extra unieke waarden', () => {
  const index = buildPivotIndex([
    { productNumber: 'SHOE-41', attributeName: 'Season', attributeValue: 'FW26' },
    { productNumber: 'SHOE-41', attributeName: 'Season', attributeValue: 'SS26' },
  ]);
  const values = {};
  const extras = applyProductAttributePivot(values, 'SHOE-41', index, [
    { key: 'pav_season', options: { kind: 'product-attribute', attributeName: 'Season' } },
  ]);
  expect(values.pav_season).toBe('FW26');
  expect(extras.pav_season).toEqual({ additionalCount: 1, allValuesLabel: 'FW26, SS26' });
});

it('zet null bij geen match, geen 0', () => {
  const values = {};
  applyProductAttributePivot(values, 'MISSING', buildPivotIndex([]), [
    { key: 'pav_season', options: { kind: 'product-attribute', attributeName: 'Season' } },
  ]);
  expect(values.pav_season).toBeNull();
});
```

- [ ] **Step 2: Run — FAIL then implement `productAttributePivot.js`**

Mag `TableDataService` niet requiren.

- [ ] **Step 3: Wire `buildDetailRow`**

Laad pivot **eenmaal** in de read-context (naast `enrichment`), niet per regel. In de functie die `ctx` voor `buildDetailRow` bouwt: `ctx.pavPivot = await loadProductAttributePivot(detailCols)` wrapped in `time('tb_lookup_pav_pivot', ...)`.

In `buildDetailRow` na `applyLookups`:

```js
const pavExtras = applyProductAttributePivot(
  detailValues,
  detailValues.itemNumber || detailJson.itemNumber || detailJson.ItemNumber,
  ctx.pavPivot,
  ctx.pavColumns,
);
...
return {
  ...
  ...(pavExtras ? { pavExtras } : {}),
};
```

- [ ] **Step 4: Run**

Run: `npm test -- server/services/productAttributePivot.test.js server/services/TableDataService.test.js`
Expected: PASS

Suggested commit: `feat: PAV pivot op PO-detailregels`

---

### Task 6: Board-columns API + auth + write-weigering

**Files:**
- Create: `server/services/ProductAttributeBoardColumnsService.js`
- Create: `server/services/ProductAttributeBoardColumnsService.test.js`
- Modify: `server/routes/data.js`
- Modify: `server/services/TableColumnsService.js` `setWriteBackConfig`
- Modify: `server/services/TableDataService.js` `correctField` + `saveCustomValue` (één guard-helper)

**Interfaces:**
- Consumes: `getTableByKey`, `listColumns`, `getPool`, `uniqueKeyForScope`, `slugify` (**al geëxporteerd** uit `TableColumnsService.js` — niet opnieuw exporteren of verplaatsen tenzij een require-cycle verschijnt)
- Produces:
  - `listBoardAttributeNames() => [{ name, visible, columnKey }]`
  - `setBoardAttributeVisible({ attributeName, visible }, userId) => { name, visible, columnKey }`
  - `assertPavWriteForbidden(tableKey, column)` throws 400

Validatie POST-body:

```js
function normalizeBoardColumnBody(body) {
  if (typeof body?.visible !== 'boolean') {
    throw Object.assign(new Error('visible must be a boolean'), { status: 400 });
  }
  const attributeName = String(body?.attributeName || '').trim();
  if (!attributeName || attributeName.length > 128 || /[\x00-\x1F]/.test(attributeName)) {
    throw Object.assign(new Error('Invalid attributeName'), { status: 400 });
  }
  return { attributeName, visible: body.visible };
}
```

Union: distinct `JSON_VALUE`/`attributeName` uit PAV cache ∪ `options.attributeName` van bestaande PO-kolommen met `kind === 'product-attribute'` (ook `is_active = 0`). POST: als naam niet in union → 400. Upsert: `JSON.stringify({ kind: 'product-attribute', attributeName })`. Aan: `is_active=1`, `is_default_visible=1`. Uit: `is_active=0`. `invalidateTableCache('purchase-orders')`.

- [ ] **Step 1: Unit tests voor normalize + union-logica (pure helpers geëxporteerd)**

- [ ] **Step 2: Implement service**

- [ ] **Step 3: Routes** — **vóór** `GET /:tableKey` (anders vangt tableKey `board-columns` niet, maar pad is `/:tableKey/board-columns` dus na param). Plaats naast andere `/:tableKey/...` admin-routes:

```js
const PAV_TABLE_KEY = 'product-attribute-values';
const pavBoardColumns = require('../services/ProductAttributeBoardColumnsService');

function requirePavAdmin(req, res, next) {
  const tableKey = String(req.params.tableKey || '').trim();
  if (tableKey !== PAV_TABLE_KEY) return next();
  return requireRole(ROLES.ADMIN)(req, res, next);
}

router.use('/:tableKey', requirePavAdmin);

router.get('/:tableKey/board-columns', requireRole(ROLES.ADMIN), async (req, res, next) => {
  try {
    if (req.params.tableKey !== PAV_TABLE_KEY) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.json({ names: await pavBoardColumns.listBoardAttributeNames() });
  } catch (err) { return next(err); }
});

router.post('/:tableKey/board-columns', requireRole(ROLES.ADMIN), async (req, res, next) => {
  try {
    if (req.params.tableKey !== PAV_TABLE_KEY) {
      return res.status(404).json({ error: 'Not found' });
    }
    const body = pavBoardColumns.normalizeBoardColumnBody(req.body);
    return res.json(await pavBoardColumns.setBoardAttributeVisible(body, req.user.id));
  } catch (err) { return next(err); }
});
```

`router.use('/:tableKey', requirePavAdmin)` moet **alle** PAV-requests (GET tabel, correct, value, …) ADMIN maken. Voor andere `tableKey` altijd `next()` — PO remarks en overige data-routes blijven ongewijzigd. Plaats `board-columns` naast andere `/:tableKey/...`-adminroutes zodat `GET /:tableKey` ze niet opslokt.

- [ ] **Step 4: Write guards**

```js
function assertNotPavWritable(tableKey, column) {
  if (String(tableKey) === 'product-attribute-values') {
    throw Object.assign(new Error('Product attribute values are read-only'), { status: 400 });
  }
  if (column?.options && column.options.kind === 'product-attribute') {
    throw Object.assign(new Error('Product attribute columns are read-only'), { status: 400 });
  }
}
```

Aanroepen aan start van `correctField`, `saveCustomValue`, `setWriteBackConfig`.

- [ ] **Step 5: Run**

Run: `npm test -- server/services/ProductAttributeBoardColumnsService.test.js server/services/TableColumnsService.test.js`
Expected: PASS

Suggested commit: `feat: PAV board-columns API en admin-only reads`

---

### Task 7: Data model-tab + panel

**Files:**
- Create: `src/hooks/useProductAttributeBoardColumns.js`
- Create: `src/hooks/useProductAttributeBoardColumns.test.jsx`
- Create: `src/components/admin/datamodel/ProductAttributeBoardColumnsPanel.jsx`
- Modify: `src/components/admin/datamodel/AdminDataModel.jsx`
- Modify: `src/components/admin/datamodel/dataModelInfoCopy.js`
- Modify: `src/hooks/useDataModelAdmin.js` — **verboden te wijzigen**

**Interfaces:**
- Consumes: `apiRequest('/data/product-attribute-values/board-columns')`
- Produces: `{ names, loading, error, togglingName, setVisible(name, visible) }`

- [ ] **Step 1: Hook test** — mock `apiRequest`; bij mount GET; `setVisible` POST `{ attributeName, visible: true }` boolean.

- [ ] **Step 2: Implement hook** — altijd aanroepen (geen conditionele `useX()`). Intern: `useEffect` alleen als `enabled === true`.

- [ ] **Step 3: Panel** — Fluent `Switch` label `Visible on PO board`; empty: `No attribute names yet. Sync this entity first.`; `AdminInfoHint` nieuwe key `pavBoardColumns`: `Choose which attribute names appear as extra columns on purchase-order lines. New names stay off until you turn them on.` Geen Fluent `Tooltip` in de Switch-`.map()` (zelfde valkuil als board-lijsten). Lange namen: wrapping, optioneel native `title` op het label.

- [ ] **Step 4: AdminDataModel**

```jsx
const productAttributeValues = useDataModelAdmin('product-attribute-values');
const pavBoardColumns = useProductAttributeBoardColumns(
  selectedTab === 'product-attribute-values',
);
// Tab: <Tab value="product-attribute-values">Product attribute values</Tab>
// Na DataPreviewTables, alleen als selectedTab === 'product-attribute-values':
<ProductAttributeBoardColumnsPanel
  names={pavBoardColumns.names}
  loading={pavBoardColumns.loading}
  error={pavBoardColumns.error}
  togglingName={pavBoardColumns.togglingName}
  onSetVisible={pavBoardColumns.setVisible}
/>
```

Bestand blijft ≪ 250 regels. `useDataModelAdmin.js` niet aanraken.

- [ ] **Step 5: Run**

Run: `npm test -- src/hooks/useProductAttributeBoardColumns.test.jsx src/hooks/useDataModelAdmin.test.jsx`
Expected: PASS

Suggested commit: `feat: Data model-tab Product attribute values`

---

### Task 8: Board-cel, line-split, versie

**Files:**
- Create: `src/utils/productAttributeColumn.js`
- Create: `src/utils/productAttributeColumn.test.js`
- Create: `src/components/supplier/PurchaseOrderLineCellContent.jsx` (verplaats `renderLineCellContent` + helpers uit SubitemLineRow)
- Modify: `src/components/supplier/PurchaseOrderSubitemLineRow.jsx` — host ≤300
- Modify: `src/components/supplier/PurchaseOrderLinkedValueCell.jsx` + `.test.jsx`
- Modify: `src/config/version.js` PATCH
- Modify: `src/config/devTestItems.js` checklist-item

**Interfaces:**
- Consumes: `line.pavExtras[column.key]`, `isProductAttributeColumn(column)`
- Produces: `isProductAttributeColumn(column) => Boolean(column?.options?.kind === 'product-attribute')`

- [ ] **Step 1: Tests `isProductAttributeColumn` + LinkedValueCell `hover="title"`**

```js
it('uses a title attribute instead of a tooltip when hover is title', () => {
  renderCell({
    firstValue: 'SS26',
    additionalCount: 1,
    allValuesLabel: 'SS26, FW26',
    hover: 'title',
  });
  expect(screen.getByTitle('SS26, FW26')).toBeTruthy();
});
```

In `PurchaseOrderLinkedValueCell.jsx`: prop `hover = 'tooltip'`. Als `hover === 'title'` en `additionalCount > 0`: `<span className={styles.root} title={allValuesLabel}>` zonder `<Tooltip>`.

- [ ] **Step 2: Verplaats `renderLineCellContent` naar `PurchaseOrderLineCellContent.jsx`** (export named function). Host importeert die. Tel regels: host ≤300, content ≤300.

- [ ] **Step 3: In content, vóór de default `formatCellValue`-tak:**

```jsx
if (isProductAttributeColumn(column)) {
  const extra = line?.pavExtras?.[column.key];
  return (
    <PurchaseOrderLinkedValueCell
      firstValue={rawValue == null || rawValue === '' ? '' : String(rawValue)}
      additionalCount={extra?.additionalCount || 0}
      allValuesLabel={extra?.allValuesLabel || ''}
      hover="title"
      isConditionalFormat={isConditionalFormat}
    />
  );
}
```

Lege string, geen `'0'` en geen `'-'` (LinkedValueCell default `'-'` overschrijven met `''` wanneer raw leeg is — pas default in de PAV-tak, niet globaal).

- [ ] **Step 4: `APP_VERSION` PATCH** (bijv. `v1.52.126`).

- [ ] **Step 5: `devTestItems`**

```js
{
  id: 'pav-datamodel',
  title: 'Product attribute values',
  checks: [
    'Data model tab Product attribute values syncs rows for items already in the Items cache',
    'Visible on PO board adds a line column; two unique values show first + N with hover list',
    'Employee cannot open /api/data/product-attribute-values',
  ],
}
```

- [ ] **Step 6: Full test + line counts**

Run: `npm test`
Expected: PASS

Tel: `PurchaseOrderSubitemLineRow.jsx` ≤300, `PurchaseOrderLineCellContent.jsx` ≤300, `AdminDataModel.jsx` ≤300, `useProductAttributeBoardColumns.js` ≤300.

Suggested commit: `feat: PAV-kolommen op het PO-board`

---

## Spec coverage (self-review)

| Spec | Task |
|------|------|
| Tab + dezelfde admin-functies minus validate | 7 |
| Items-cache scope in OData AND chunks | 4 |
| Chunk-cap 50 / max_rows 10000 / company-filter uit | 4 |
| Truncatie `notice_text` via adapter → `refresh()` | 4 |
| 1:N record_key in adapter (genericMaster-vorm) | 4 |
| Pivot niet applyLookups; pavExtras buiten values | 5 |
| Visible on PO board; verdwenen naam uitzetbaar | 6 |
| CK lookup + pivot role; deploy-safe | 3 |
| Cascade items vóór PAV | 2 |
| ADMIN ruwe API; write 400 | 6 |
| LinkedValueCell title; geen Tooltip in lijst | 8 |
| TDS/useDataModelAdmin groeibegrenzing | 4–5, 7 |
| Engels UI / version PATCH | 7–8 |

Geen TBD. Review-pins hierboven zijn bindend. Signatures consistent: `productAttributeValuesFetch`, `applyProductAttributePivot`, `listBoardAttributeNames`, `setBoardAttributeVisible`, `isProductAttributeColumn`, `hover`.

-- Migratie 016: Vendors + Items als generieke tb_*-tabellen + fk_join lookups PO->vendors / PO.line->items (#AB:161).
-- Plan: .cursor/plans/dev_2026-07-03-datamodel-vendors-items-tb.plan.md
-- Deel 2/2 (seed). Volgt op 015 (tb_relations-schema). Idempotent (IF NOT EXISTS) en non-destructief.
-- Entiteitsnamen + sleutels geverifieerd tegen D365 ACC $metadata (2026-07-03):
--   VendorsV2          -> EntityType VendorV2,          key (dataAreaId, VendorAccountNumber)
--   ReleasedProductsV2 -> EntityType ReleasedProductV2, key (dataAreaId, ItemNumber)
-- Let op: ProductName bestaat NIET op ReleasedProductsV2; de effectieve naam is SearchName.

-- ===========================================================================
-- 1) Vervangende constraint: max 1 detail-relatie per tabel (lookups mogen meervoudig).
--    Via EXEC omdat relation_role in 015 is toegevoegd (deferred name resolution).
-- ===========================================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tb_relations_detail' AND object_id = OBJECT_ID('dbo.tb_relations'))
  EXEC('CREATE UNIQUE INDEX UX_tb_relations_detail ON dbo.tb_relations(table_id) WHERE relation_role = ''detail''');

-- ===========================================================================
-- 2) tb_tables: Vendors + Items (platte referentie-tabellen, geen detail)
-- ===========================================================================
IF NOT EXISTS (SELECT 1 FROM dbo.tb_tables WHERE [key] = 'vendors')
  INSERT INTO dbo.tb_tables ([key], label, description, source_id, source_entity, key_fields, cache_mode, stale_minutes, max_rows, sort_order)
  SELECT 'vendors', 'Leveranciers', 'D365 vendor master (VendorsV2)',
         s.id, '/data/VendorsV2', 'dataAreaId,VendorAccountNumber', 'auto', 60, 5000, 10
  FROM dbo.tb_sources s WHERE s.[key] = 'd365';

IF NOT EXISTS (SELECT 1 FROM dbo.tb_tables WHERE [key] = 'items')
  INSERT INTO dbo.tb_tables ([key], label, description, source_id, source_entity, key_fields, cache_mode, stale_minutes, max_rows, sort_order)
  SELECT 'items', 'Artikelen', 'D365 released products (ReleasedProductsV2)',
         s.id, '/data/ReleasedProductsV2', 'dataAreaId,ItemNumber', 'auto', 60, 5000, 20
  FROM dbo.tb_sources s WHERE s.[key] = 'd365';

-- ===========================================================================
-- 3) tb_columns: master-kolommen voor Vendors + Items (source='source').
--    source_field = echte D365-property (geverifieerd tegen $metadata / sample).
-- ===========================================================================
MERGE dbo.tb_columns AS target
USING (
  SELECT t.id AS table_id, v.[key], v.label, v.data_type, v.source_field, v.sort_order
  FROM (VALUES
    ('vendorAccount', 'Leverancier',       'text', 'VendorAccountNumber',    10),
    ('vendorName',    'Naam',              'text', 'VendorOrganizationName', 20),
    ('searchName',    'Zoeknaam',          'text', 'VendorSearchName',       30),
    ('vendorGroup',   'Leveranciersgroep', 'text', 'VendorGroupId',          40),
    ('currencyCode',  'Valuta',            'text', 'CurrencyCode',           50),
    ('email',         'E-mail',            'text', 'PrimaryEmailAddress',    60),
    ('phone',         'Telefoon',          'text', 'PrimaryPhoneNumber',     70)
  ) AS v([key], label, data_type, source_field, sort_order)
  CROSS JOIN dbo.tb_tables t WHERE t.[key] = 'vendors'
) AS src
ON target.table_id = src.table_id AND target.scope = 'master' AND target.[key] = src.[key]
WHEN NOT MATCHED THEN
  INSERT (table_id, scope, [key], label, source, source_field, data_type, writable, is_default_visible, filterable, sortable, is_active, sort_order)
  VALUES (src.table_id, 'master', src.[key], src.label, 'source', src.source_field, src.data_type, 0, 1, 1, 1, 1, src.sort_order);

MERGE dbo.tb_columns AS target
USING (
  SELECT t.id AS table_id, v.[key], v.label, v.data_type, v.source_field, v.sort_order
  FROM (VALUES
    ('itemNumber',        'Artikel',         'text', 'ItemNumber',                 10),
    ('searchName',        'Artikelnaam',     'text', 'SearchName',                 20),
    ('productSearchName', 'Productnaam',     'text', 'ProductSearchName',          30),
    ('productType',       'Producttype',     'text', 'ProductType',                40),
    ('productGroup',      'Artikelgroep',    'text', 'ProductGroupId',             50),
    ('purchaseUnit',      'Inkoopeenheid',   'text', 'PurchaseUnitSymbol',         60),
    ('primaryVendor',     'Hoofdleverancier','text', 'PrimaryVendorAccountNumber', 70)
  ) AS v([key], label, data_type, source_field, sort_order)
  CROSS JOIN dbo.tb_tables t WHERE t.[key] = 'items'
) AS src
ON target.table_id = src.table_id AND target.scope = 'master' AND target.[key] = src.[key]
WHEN NOT MATCHED THEN
  INSERT (table_id, scope, [key], label, source, source_field, data_type, writable, is_default_visible, filterable, sortable, is_active, sort_order)
  VALUES (src.table_id, 'master', src.[key], src.label, 'source', src.source_field, src.data_type, 0, 1, 1, 1, 1, src.sort_order);

-- ===========================================================================
-- 4) tb_sync_state: start beide tabellen "stale" (eerste lazy refresh bouwt tb_cache op)
-- ===========================================================================
INSERT INTO dbo.tb_sync_state (table_id, watermark, last_full_sync_at)
SELECT t.id, NULL, NULL
FROM dbo.tb_tables t
WHERE t.[key] IN ('vendors','items')
  AND NOT EXISTS (SELECT 1 FROM dbo.tb_sync_state ss WHERE ss.table_id = t.id);

-- ===========================================================================
-- 5) tb_relations: fk_join lookups. source_field = tb_columns.key op PO die de FK-waarde bevat;
--    lookup_fields_json: { afgeleide-kolom-key : doel-tb_columns-key }. Via EXEC (nieuwe kolommen uit 015).
-- ===========================================================================
IF NOT EXISTS (
  SELECT 1 FROM dbo.tb_relations r
  INNER JOIN dbo.tb_tables t ON t.id = r.table_id
  WHERE t.[key] = 'purchase-orders' AND r.relation_role = 'lookup' AND r.target_table_key = 'vendors'
)
  EXEC('
    INSERT INTO dbo.tb_relations
      (table_id, relation_kind, relation_role, source_scope, source_field, target_table_key, target_key_field, lookup_fields_json)
    SELECT t.id, ''fk_join'', ''lookup'', ''master'', ''vendorAccount'', ''vendors'', ''vendorAccount'',
           N''{"vendorOrgName":"vendorName"}''
    FROM dbo.tb_tables t WHERE t.[key] = ''purchase-orders''');

IF NOT EXISTS (
  SELECT 1 FROM dbo.tb_relations r
  INNER JOIN dbo.tb_tables t ON t.id = r.table_id
  WHERE t.[key] = 'purchase-orders' AND r.relation_role = 'lookup' AND r.target_table_key = 'items'
)
  EXEC('
    INSERT INTO dbo.tb_relations
      (table_id, relation_kind, relation_role, source_scope, source_field, target_table_key, target_key_field, lookup_fields_json)
    SELECT t.id, ''fk_join'', ''lookup'', ''detail'', ''itemNumber'', ''items'', ''itemNumber'',
           N''{"itemName":"searchName"}''
    FROM dbo.tb_tables t WHERE t.[key] = ''purchase-orders''');

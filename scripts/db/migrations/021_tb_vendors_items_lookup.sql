-- Migratie 021: Vendors + Items als zelfstandige tb_-entiteiten, inclusief lookup-relaties
-- naar purchase-orders (#AB:195). Idempotent + non-destructief.
-- Doel:
-- 1) Vendors (/data/VendorsV2) en Items (/data/ReleasedProductsV2) als cachebare tabellen.
-- 2) Basis-kolomconfig voor beide tabellen in tb_columns.
-- 3) fk_join lookup-relaties:
--    - PO header (OrderVendorAccountNumber) -> vendors (VendorAccountNumber)
--    - PO line   (ItemNumber)               -> items   (ItemNumber)

DECLARE @sourceId BIGINT = (
  SELECT TOP 1 id FROM dbo.tb_sources WHERE [key] = 'd365'
);

IF @sourceId IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM dbo.tb_tables WHERE [key] = 'vendors')
  BEGIN
    INSERT INTO dbo.tb_tables
      ([key], label, description, source_id, source_entity, key_fields, cache_mode, stale_minutes, max_rows, sort_order)
    VALUES
      ('vendors', 'Leveranciers', 'D365 leveranciers uit VendorsV2', @sourceId, '/data/VendorsV2', 'dataAreaId,VendorAccountNumber', 'auto', 15, 10000, 200);
  END;

  IF NOT EXISTS (SELECT 1 FROM dbo.tb_tables WHERE [key] = 'items')
  BEGIN
    INSERT INTO dbo.tb_tables
      ([key], label, description, source_id, source_entity, key_fields, cache_mode, stale_minutes, max_rows, sort_order)
    VALUES
      ('items', 'Artikelen', 'D365 artikelen uit ReleasedProductsV2', @sourceId, '/data/ReleasedProductsV2', 'dataAreaId,ItemNumber', 'auto', 15, 20000, 210);
  END;
END;

DECLARE @vendorsTableId BIGINT = (SELECT TOP 1 id FROM dbo.tb_tables WHERE [key] = 'vendors');
DECLARE @itemsTableId BIGINT = (SELECT TOP 1 id FROM dbo.tb_tables WHERE [key] = 'items');
DECLARE @purchaseOrdersTableId BIGINT = (SELECT TOP 1 id FROM dbo.tb_tables WHERE [key] = 'purchase-orders');

-- Basis kolomconfig vendors
IF @vendorsTableId IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM dbo.tb_columns WHERE table_id = @vendorsTableId AND scope = 'master' AND [key] = 'vendorAccountNumber')
    INSERT INTO dbo.tb_columns
      (table_id, scope, [key], label, source, source_field, data_type, writable, write_mechanism, is_default_visible, filterable, sortable, is_active, sort_order)
    VALUES
      (@vendorsTableId, 'master', 'vendorAccountNumber', 'Vendor account', 'source', 'VendorAccountNumber', 'text', 0, NULL, 1, 1, 1, 1, 10);

  IF NOT EXISTS (SELECT 1 FROM dbo.tb_columns WHERE table_id = @vendorsTableId AND scope = 'master' AND [key] = 'vendorOrganizationName')
    INSERT INTO dbo.tb_columns
      (table_id, scope, [key], label, source, source_field, data_type, writable, write_mechanism, is_default_visible, filterable, sortable, is_active, sort_order)
    VALUES
      (@vendorsTableId, 'master', 'vendorOrganizationName', 'Vendor name', 'source', 'VendorOrganizationName', 'text', 0, NULL, 1, 1, 1, 1, 20);

  IF NOT EXISTS (SELECT 1 FROM dbo.tb_columns WHERE table_id = @vendorsTableId AND scope = 'master' AND [key] = 'vendorGroupId')
    INSERT INTO dbo.tb_columns
      (table_id, scope, [key], label, source, source_field, data_type, writable, write_mechanism, is_default_visible, filterable, sortable, is_active, sort_order)
    VALUES
      (@vendorsTableId, 'master', 'vendorGroupId', 'Vendor group', 'source', 'VendorGroupId', 'text', 0, NULL, 0, 1, 1, 1, 30);

  IF NOT EXISTS (SELECT 1 FROM dbo.tb_columns WHERE table_id = @vendorsTableId AND scope = 'master' AND [key] = 'primaryContactEmail')
    INSERT INTO dbo.tb_columns
      (table_id, scope, [key], label, source, source_field, data_type, writable, write_mechanism, is_default_visible, filterable, sortable, is_active, sort_order)
    VALUES
      (@vendorsTableId, 'master', 'primaryContactEmail', 'Primary contact email', 'source', 'PrimaryContactEmail', 'text', 0, NULL, 0, 1, 1, 1, 40);

  IF NOT EXISTS (SELECT 1 FROM dbo.tb_columns WHERE table_id = @vendorsTableId AND scope = 'master' AND [key] = 'primaryContactPhone')
    INSERT INTO dbo.tb_columns
      (table_id, scope, [key], label, source, source_field, data_type, writable, write_mechanism, is_default_visible, filterable, sortable, is_active, sort_order)
    VALUES
      (@vendorsTableId, 'master', 'primaryContactPhone', 'Primary contact phone', 'source', 'PrimaryContactPhone', 'text', 0, NULL, 0, 1, 1, 1, 50);
END;

-- Basis kolomconfig items
IF @itemsTableId IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM dbo.tb_columns WHERE table_id = @itemsTableId AND scope = 'master' AND [key] = 'itemNumber')
    INSERT INTO dbo.tb_columns
      (table_id, scope, [key], label, source, source_field, data_type, writable, write_mechanism, is_default_visible, filterable, sortable, is_active, sort_order)
    VALUES
      (@itemsTableId, 'master', 'itemNumber', 'Item number', 'source', 'ItemNumber', 'text', 0, NULL, 1, 1, 1, 1, 10);

  IF NOT EXISTS (SELECT 1 FROM dbo.tb_columns WHERE table_id = @itemsTableId AND scope = 'master' AND [key] = 'searchName')
    INSERT INTO dbo.tb_columns
      (table_id, scope, [key], label, source, source_field, data_type, writable, write_mechanism, is_default_visible, filterable, sortable, is_active, sort_order)
    VALUES
      (@itemsTableId, 'master', 'searchName', 'Item name', 'source', 'SearchName', 'text', 0, NULL, 1, 1, 1, 1, 20);

  IF NOT EXISTS (SELECT 1 FROM dbo.tb_columns WHERE table_id = @itemsTableId AND scope = 'master' AND [key] = 'productSearchName')
    INSERT INTO dbo.tb_columns
      (table_id, scope, [key], label, source, source_field, data_type, writable, write_mechanism, is_default_visible, filterable, sortable, is_active, sort_order)
    VALUES
      (@itemsTableId, 'master', 'productSearchName', 'Product search name', 'source', 'ProductSearchName', 'text', 0, NULL, 0, 1, 1, 1, 30);

  IF NOT EXISTS (SELECT 1 FROM dbo.tb_columns WHERE table_id = @itemsTableId AND scope = 'master' AND [key] = 'itemGroupId')
    INSERT INTO dbo.tb_columns
      (table_id, scope, [key], label, source, source_field, data_type, writable, write_mechanism, is_default_visible, filterable, sortable, is_active, sort_order)
    VALUES
      (@itemsTableId, 'master', 'itemGroupId', 'Item group', 'source', 'ItemGroupId', 'text', 0, NULL, 0, 1, 1, 1, 40);
END;

-- Sync-state records voor lazy refresh
IF @vendorsTableId IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM dbo.tb_sync_state WHERE table_id = @vendorsTableId)
  INSERT INTO dbo.tb_sync_state (table_id, watermark, last_full_sync_at)
  VALUES (@vendorsTableId, NULL, NULL);

IF @itemsTableId IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM dbo.tb_sync_state WHERE table_id = @itemsTableId)
  INSERT INTO dbo.tb_sync_state (table_id, watermark, last_full_sync_at)
  VALUES (@itemsTableId, NULL, NULL);

-- fk_join lookup-relaties (alleen als lookup-kolommen op tb_relations beschikbaar zijn)
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tb_relations') AND name = 'relation_role')
AND @purchaseOrdersTableId IS NOT NULL
AND @vendorsTableId IS NOT NULL
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM dbo.tb_relations
    WHERE table_id = @purchaseOrdersTableId
      AND relation_role = 'lookup'
      AND target_table_key = 'vendors'
      AND source_scope = 'master'
      AND source_field = 'OrderVendorAccountNumber'
  )
  BEGIN
    INSERT INTO dbo.tb_relations
      (table_id, relation_kind, relation_role, source_scope, source_field, target_table_key, target_key_field, lookup_fields_json)
    VALUES
      (@purchaseOrdersTableId, 'fk_join', 'lookup', 'master', 'OrderVendorAccountNumber', 'vendors', 'VendorAccountNumber',
       N'{"vendorOrganizationName":"vendorOrganizationName"}');
  END;
END;

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tb_relations') AND name = 'relation_role')
AND @purchaseOrdersTableId IS NOT NULL
AND @itemsTableId IS NOT NULL
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM dbo.tb_relations
    WHERE table_id = @purchaseOrdersTableId
      AND relation_role = 'lookup'
      AND target_table_key = 'items'
      AND source_scope = 'detail'
      AND source_field = 'ItemNumber'
  )
  BEGIN
    INSERT INTO dbo.tb_relations
      (table_id, relation_kind, relation_role, source_scope, source_field, target_table_key, target_key_field, lookup_fields_json)
    VALUES
      (@purchaseOrdersTableId, 'fk_join', 'lookup', 'detail', 'ItemNumber', 'items', 'ItemNumber',
       N'{"itemName":"searchName"}');
  END;
END;

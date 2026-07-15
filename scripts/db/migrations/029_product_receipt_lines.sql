-- Migratie 029: ProductReceiptLinesV2 als vierde datamodel-entiteit + composite lookup naar PO-regels (#AB:230).
-- Idempotent + non-destructief.

DECLARE @sourceId BIGINT = (
  SELECT TOP 1 id FROM dbo.tb_sources WHERE [key] = 'd365'
);

IF @sourceId IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM dbo.tb_tables WHERE [key] = 'product-receipt-lines')
  BEGIN
    INSERT INTO dbo.tb_tables
      ([key], label, description, source_id, source_entity, key_fields, cache_mode, stale_minutes, max_rows, sort_order)
    VALUES
      ('product-receipt-lines', 'Ontvangstregels', 'D365 ontvangstregels uit ProductReceiptLinesV2', @sourceId,
       '/data/ProductReceiptLinesV2', 'dataAreaId,PurchaseOrderNumber,PurchaseOrderLineNumber', 'auto', 15, 20000, 220);
  END;
END;

DECLARE @prlTableId BIGINT = (SELECT TOP 1 id FROM dbo.tb_tables WHERE [key] = 'product-receipt-lines');
DECLARE @purchaseOrdersTableId BIGINT = (SELECT TOP 1 id FROM dbo.tb_tables WHERE [key] = 'purchase-orders');

IF @prlTableId IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM dbo.tb_columns WHERE table_id = @prlTableId AND scope = 'master' AND [key] = 'purchaseOrderNumber')
    INSERT INTO dbo.tb_columns
      (table_id, scope, [key], label, source, source_field, data_type, writable, is_default_visible, filterable, sortable, is_active, sort_order)
    VALUES
      (@prlTableId, 'master', 'purchaseOrderNumber', 'Purchase order', 'source', 'PurchaseOrderNumber', 'text', 0, 1, 1, 1, 1, 10);

  IF NOT EXISTS (SELECT 1 FROM dbo.tb_columns WHERE table_id = @prlTableId AND scope = 'master' AND [key] = 'purchaseOrderLineNumber')
    INSERT INTO dbo.tb_columns
      (table_id, scope, [key], label, source, source_field, data_type, writable, is_default_visible, filterable, sortable, is_active, sort_order)
    VALUES
      (@prlTableId, 'master', 'purchaseOrderLineNumber', 'Line number', 'source', 'PurchaseOrderLineNumber', 'number', 0, 1, 1, 1, 1, 20);

  IF NOT EXISTS (SELECT 1 FROM dbo.tb_columns WHERE table_id = @prlTableId AND scope = 'master' AND [key] = 'receivedPurchaseQuantity')
    INSERT INTO dbo.tb_columns
      (table_id, scope, [key], label, source, source_field, data_type, writable, is_default_visible, filterable, sortable, is_active, sort_order)
    VALUES
      (@prlTableId, 'master', 'receivedPurchaseQuantity', 'Received qty', 'source', 'ReceivedPurchaseQuantity', 'number', 0, 1, 1, 1, 1, 30);

  IF NOT EXISTS (SELECT 1 FROM dbo.tb_columns WHERE table_id = @prlTableId AND scope = 'master' AND [key] = 'remainingPurchaseQuantity')
    INSERT INTO dbo.tb_columns
      (table_id, scope, [key], label, source, source_field, data_type, writable, is_default_visible, filterable, sortable, is_active, sort_order)
    VALUES
      (@prlTableId, 'master', 'remainingPurchaseQuantity', 'Remaining qty', 'source', 'RemainingPurchaseQuantity', 'number', 0, 1, 1, 1, 1, 40);

  IF NOT EXISTS (SELECT 1 FROM dbo.tb_columns WHERE table_id = @prlTableId AND scope = 'master' AND [key] = 'orderedPurchaseQuantity')
    INSERT INTO dbo.tb_columns
      (table_id, scope, [key], label, source, source_field, data_type, writable, is_default_visible, filterable, sortable, is_active, sort_order)
    VALUES
      (@prlTableId, 'master', 'orderedPurchaseQuantity', 'Ordered qty', 'source', 'OrderedPurchaseQuantity', 'number', 0, 0, 1, 1, 1, 50);

  IF NOT EXISTS (SELECT 1 FROM dbo.tb_columns WHERE table_id = @prlTableId AND scope = 'master' AND [key] = 'productReceiptNumber')
    INSERT INTO dbo.tb_columns
      (table_id, scope, [key], label, source, source_field, data_type, writable, is_default_visible, filterable, sortable, is_active, sort_order)
    VALUES
      (@prlTableId, 'master', 'productReceiptNumber', 'Receipt number', 'source', 'ProductReceiptNumber', 'text', 0, 0, 1, 1, 1, 60);

  IF NOT EXISTS (SELECT 1 FROM dbo.tb_columns WHERE table_id = @prlTableId AND scope = 'master' AND [key] = 'productReceiptDate')
    INSERT INTO dbo.tb_columns
      (table_id, scope, [key], label, source, source_field, data_type, writable, is_default_visible, filterable, sortable, is_active, sort_order)
    VALUES
      (@prlTableId, 'master', 'productReceiptDate', 'Receipt date', 'source', 'ProductReceiptDate', 'date', 0, 0, 1, 1, 1, 70);

  IF NOT EXISTS (SELECT 1 FROM dbo.tb_columns WHERE table_id = @prlTableId AND scope = 'master' AND [key] = 'itemNumber')
    INSERT INTO dbo.tb_columns
      (table_id, scope, [key], label, source, source_field, data_type, writable, is_default_visible, filterable, sortable, is_active, sort_order)
    VALUES
      (@prlTableId, 'master', 'itemNumber', 'Item number', 'source', 'ItemNumber', 'text', 0, 0, 1, 1, 1, 80);
END;

IF @prlTableId IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM dbo.tb_sync_state WHERE table_id = @prlTableId)
  INSERT INTO dbo.tb_sync_state (table_id, watermark, last_full_sync_at)
  VALUES (@prlTableId, NULL, NULL);

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tb_relations') AND name = 'relation_role')
AND @purchaseOrdersTableId IS NOT NULL
AND @prlTableId IS NOT NULL
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM dbo.tb_relations
    WHERE table_id = @purchaseOrdersTableId
      AND relation_role = 'lookup'
      AND target_table_key = 'product-receipt-lines'
      AND source_scope = 'detail'
      AND source_field = 'PurchaseOrderNumber'
  )
  BEGIN
    INSERT INTO dbo.tb_relations
      (table_id, relation_kind, relation_role, source_scope, source_field, target_table_key, target_key_field, join_keys_json, lookup_fields_json)
    VALUES
      (@purchaseOrdersTableId, 'fk_join', 'lookup', 'detail', 'PurchaseOrderNumber', 'product-receipt-lines', 'PurchaseOrderNumber',
       N'[{"sourceKey":"purchaseOrderNumber","targetKey":"purchaseOrderNumber"},{"sourceKey":"lineNumber","targetKey":"purchaseOrderLineNumber"}]',
       N'{"receivedPurchaseQuantity":"receivedPurchaseQuantity","remainingPurchaseQuantity":"remainingPurchaseQuantity","productReceiptDate":"productReceiptDate","productReceiptNumber":"productReceiptNumber"}');
  END;
END;

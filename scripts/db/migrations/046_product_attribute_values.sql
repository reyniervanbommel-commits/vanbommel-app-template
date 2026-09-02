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

-- 047: PAV Text value-kolom (046 zonder textValue al gedraaid).
-- Idempotent.

DECLARE @pavId BIGINT = (SELECT TOP 1 id FROM dbo.tb_tables WHERE [key] = 'product-attribute-values');

IF @pavId IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM dbo.tb_columns WHERE table_id = @pavId AND scope = 'master' AND [key] = 'textValue')
  INSERT INTO dbo.tb_columns
    (table_id, scope, [key], label, source, source_field, data_type, writable, is_default_visible, filterable, sortable, is_active, sort_order)
  VALUES (@pavId, 'master', 'textValue', 'Text value', 'source', 'TextValue', 'text', 0, 1, 1, 1, 1, 35);

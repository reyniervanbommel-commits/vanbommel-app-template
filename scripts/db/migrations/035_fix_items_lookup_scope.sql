-- Migratie 035: Herstel items-lookup source_scope naar 'detail' en voeg extra item-kolommen toe.
--
-- Probleembeschrijving:
--   getLookups() in TableRegistryService.js gebruikt `r.source_scope || 'master'` als fallback.
--   Als source_scope NULL of 'master' is voor de items-lookup (target_table_key = 'items'),
--   wordt de lookup behandeld als master-scope. applyLookups() slaat hem dan over voor PO-regels
--   (scope = 'detail'), en getInheritedPoLookupScopes() haalt nul itemnummers op zodat de
--   items-cache leeg blijft. Gevolg: geen artikelgegevens op inkooporderregels.
--
-- Oplossing:
--   1. UPDATE de bestaande items-lookup naar source_scope = 'detail', source_field = 'ItemNumber',
--      target_key_field = 'ItemNumber' en een uitgebreidere lookup_fields_json.
--   2. INSERT de lookup als hij ontbreekt.
--   3. Voeg extra item-kolommen toe (productName, orderUnitSymbol).
--
-- Idempotent: veilig meerdere keren uitvoeren.

DECLARE @purchaseOrdersTableId BIGINT = (SELECT TOP 1 id FROM dbo.tb_tables WHERE [key] = 'purchase-orders');
DECLARE @itemsTableId BIGINT = (SELECT TOP 1 id FROM dbo.tb_tables WHERE [key] = 'items');

-- ---------------------------------------------------------------------------
-- 1. Fix de items-lookup in tb_relations
-- ---------------------------------------------------------------------------
IF @purchaseOrdersTableId IS NOT NULL
AND @itemsTableId IS NOT NULL
AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tb_relations') AND name = 'relation_role')
BEGIN
  IF EXISTS (
    SELECT 1 FROM dbo.tb_relations
    WHERE table_id = @purchaseOrdersTableId
      AND relation_role = 'lookup'
      AND target_table_key = 'items'
  )
  BEGIN
    -- Rij bestaat; zorg dat alle velden correct zijn.
    UPDATE dbo.tb_relations
    SET
      source_scope       = 'detail',
      source_field       = 'ItemNumber',
      target_key_field   = 'ItemNumber',
      lookup_fields_json = N'{"itemName":"searchName","itemProductName":"productName","itemGroupId":"itemGroupId","itemOrderUnitSymbol":"orderUnitSymbol"}'
    WHERE table_id = @purchaseOrdersTableId
      AND relation_role = 'lookup'
      AND target_table_key = 'items';
  END
  ELSE
  BEGIN
    -- Rij ontbreekt; aanmaken.
    INSERT INTO dbo.tb_relations
      (table_id, relation_kind, relation_role, source_scope, source_field, target_table_key, target_key_field, lookup_fields_json)
    VALUES
      (@purchaseOrdersTableId, 'fk_join', 'lookup', 'detail', 'ItemNumber', 'items', 'ItemNumber',
       N'{"itemName":"searchName","itemProductName":"productName","itemGroupId":"itemGroupId","itemOrderUnitSymbol":"orderUnitSymbol"}');
  END;
END;

-- ---------------------------------------------------------------------------
-- 2. Voeg productName-kolom toe aan de items-tabel (als die nog ontbreekt)
-- ---------------------------------------------------------------------------
IF @itemsTableId IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM dbo.tb_columns WHERE table_id = @itemsTableId AND scope = 'master' AND [key] = 'productName')
    INSERT INTO dbo.tb_columns
      (table_id, scope, [key], label, source, source_field, data_type, writable, write_mechanism, is_default_visible, filterable, sortable, is_active, sort_order)
    VALUES
      (@itemsTableId, 'master', 'productName', 'Product name', 'source', 'ProductName', 'text', 0, NULL, 1, 1, 1, 1, 25);

  IF NOT EXISTS (SELECT 1 FROM dbo.tb_columns WHERE table_id = @itemsTableId AND scope = 'master' AND [key] = 'orderUnitSymbol')
    INSERT INTO dbo.tb_columns
      (table_id, scope, [key], label, source, source_field, data_type, writable, write_mechanism, is_default_visible, filterable, sortable, is_active, sort_order)
    VALUES
      (@itemsTableId, 'master', 'orderUnitSymbol', 'Order unit', 'source', 'ProductDefaultOrderUnitSymbol', 'text', 0, NULL, 0, 1, 1, 1, 50);
END;

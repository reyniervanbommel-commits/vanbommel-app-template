-- Migratie 027: corrigeer deliver-remainder naar het D365 OData-veld RemainingPurchasePhysicalQuantity.
-- MCP/D365-docs noemen dit veld; op ACC (2026-07-15) staat het nog niet in $metadata — kolom blijft
-- inactief tot de entiteit het exposeert (standaard update of entity extension). Geen $select zolang
-- het veld ontbreekt (anders 400 op sync).

IF EXISTS (SELECT 1 FROM dbo.tb_tables WHERE [key] = 'purchase-orders')
BEGIN
  DECLARE @tableId BIGINT = (SELECT id FROM dbo.tb_tables WHERE [key] = 'purchase-orders');

  -- Verkeerde veldnaam uit eerdere poging (ReceivedPurchaseQuantity bestaat niet op V2).
  UPDATE dbo.tb_columns
  SET is_active = 0, is_default_visible = 0, updated_at = SYSUTCDATETIME()
  WHERE table_id = @tableId AND scope = 'detail' AND [key] = 'receivedPurchaseQuantity';

  -- Formule-benadering uitschakelen; echte D365-waarde is direct veld, geen besteld - ontvangen.
  UPDATE dbo.tb_columns
  SET is_active = 0, is_default_visible = 0, updated_at = SYSUTCDATETIME()
  WHERE table_id = @tableId AND scope = 'detail' AND [key] = 'deliverRemainderApprox';

  IF NOT EXISTS (
    SELECT 1 FROM dbo.tb_columns
    WHERE table_id = @tableId AND scope = 'detail' AND [key] = 'deliverRemainder'
  )
  INSERT INTO dbo.tb_columns
    (table_id, scope, [key], label, source, source_field, data_type, writable, is_default_visible,
     filterable, sortable, is_active, sort_order)
  VALUES
    (@tableId, 'detail', 'deliverRemainder', 'Deliver remainder', 'source', 'RemainingPurchasePhysicalQuantity',
     'number', 0, 1, 1, 1, 0, 80);
END

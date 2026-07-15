-- Migratie 028: Rollback deliver-remainder kolommen (soft-delete, idempotent).
-- Draait 026/027-kolommen uit op het PO-board; rijen blijven in tb_columns (historie).

IF EXISTS (SELECT 1 FROM dbo.tb_tables WHERE [key] = 'purchase-orders')
BEGIN
  DECLARE @tableId BIGINT = (SELECT id FROM dbo.tb_tables WHERE [key] = 'purchase-orders');

  UPDATE dbo.tb_columns
  SET is_active = 0, is_default_visible = 0, updated_at = SYSUTCDATETIME()
  WHERE table_id = @tableId
    AND scope = 'detail'
    AND [key] IN ('receivedPurchaseQuantity', 'deliverRemainderApprox', 'deliverRemainder')
    AND is_active = 1;
END

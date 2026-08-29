-- Migratie 043: zet RemainingPurchasePhysicalQuantity uit op purchase-order-regels.
--
-- 027 zette dit veld in tb_columns (uit D365-docs, niet uit $metadata). LIVE F&O kent het
-- niet op PurchaseOrderLine → HTTP 400 op de hele PO-refresh zodra de kolom is_active=1 is
-- (Data model visibility-toggle). 028 deactiveerde alleen op dat moment; later aanzetten
-- bleef mogelijk. Deze migratie forceert inactief, idempotent.

IF EXISTS (SELECT 1 FROM dbo.tb_tables WHERE [key] = 'purchase-orders')
BEGIN
  DECLARE @tableId BIGINT = (SELECT id FROM dbo.tb_tables WHERE [key] = 'purchase-orders');

  UPDATE dbo.tb_columns
  SET is_active = 0, is_default_visible = 0, updated_at = SYSUTCDATETIME()
  WHERE table_id = @tableId
    AND scope = 'detail'
    AND (
      [key] = 'deliverRemainder'
      OR source_field = 'RemainingPurchasePhysicalQuantity'
    )
    AND is_active = 1;
END

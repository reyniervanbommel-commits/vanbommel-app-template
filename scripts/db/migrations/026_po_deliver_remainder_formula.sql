-- Migratie 026: Deliver remainder (approx.) via formulekolom op PO-regels.
-- Formule: OrderedPurchaseQuantity - ReceivedPurchaseQuantity
-- Verified 2026-07-15: ReceivedPurchaseQuantity is NOT on standard PurchaseOrderLineV2 on ACC.
-- Keep receivedPurchaseQuantity inactive until D365 exposes the field; then activate + resync.

IF EXISTS (SELECT 1 FROM dbo.tb_tables WHERE [key] = 'purchase-orders')
BEGIN
  DECLARE @tableId BIGINT = (SELECT id FROM dbo.tb_tables WHERE [key] = 'purchase-orders');

  IF NOT EXISTS (
    SELECT 1 FROM dbo.tb_columns
    WHERE table_id = @tableId AND scope = 'detail' AND [key] = 'receivedPurchaseQuantity'
  )
  INSERT INTO dbo.tb_columns
    (table_id, scope, [key], label, source, source_field, data_type, writable, is_default_visible,
     filterable, sortable, is_active, sort_order)
  VALUES
    (@tableId, 'detail', 'receivedPurchaseQuantity', 'Received qty', 'source', 'ReceivedPurchaseQuantity',
     'number', 0, 0, 1, 1, 0, 75);

  IF NOT EXISTS (
    SELECT 1 FROM dbo.tb_columns
    WHERE table_id = @tableId AND scope = 'detail' AND [key] = 'deliverRemainderApprox'
  )
  INSERT INTO dbo.tb_columns
    (table_id, scope, [key], label, source, data_type, formula_expr, writable, is_default_visible,
     filterable, sortable, is_active, sort_order)
  VALUES
    (@tableId, 'detail', 'deliverRemainderApprox', 'Deliver remainder (approx.)', 'custom', 'number',
     '(quantity)-(receivedpurchasequantity)', 0, 1, 1, 1, 1, 80);
END

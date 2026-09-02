-- Migratie 045: D365 RequestedDeliveryDate heette in het datamodel "Leverdatum".
-- Dat is te kort: het veld is de gevraagde leverdatum. Idempotent op label.

UPDATE c
SET c.label = N'Gevraagde leverdatum', c.updated_at = SYSUTCDATETIME()
FROM dbo.tb_columns c
INNER JOIN dbo.tb_tables t ON t.id = c.table_id
WHERE t.[key] = N'purchase-orders'
  AND c.[key] = N'requestedDeliveryDate'
  AND c.label = N'Leverdatum';

-- Migratie 019: opschonen van experimentele/test-tb_tables (#AB:161).
-- Op DEV waren via de table-builder-admin diverse test-tabellen aangemaakt (Customers, Sales Order Lines,
-- Open inkooporders demo, losse Purchase Order Lines, dubbele Leveranciers, e2e-test-rijen). Alleen de
-- drie kern-tabellen blijven: purchase-orders, vendors, items. Idempotent + herhaalbaar; verwijdert elke
-- tb_table die niet in de keep-lijst staat, inclusief afhankelijke rijen (FK-volgorde: children eerst).
-- Non-destructief voor de kern: de keep-lijst wordt nooit geraakt. Draait ook op PROD bij deploy.

DECLARE @drop TABLE (id BIGINT PRIMARY KEY);
INSERT INTO @drop
  SELECT id FROM dbo.tb_tables
  WHERE [key] NOT IN ('purchase-orders', 'vendors', 'items');

-- tb_row_exclusions bestaat pas vanaf migratie 018; guard zodat 019 ook draait als 018 (nog) niet liep.
IF OBJECT_ID('dbo.tb_row_exclusions') IS NOT NULL
  DELETE FROM dbo.tb_row_exclusions    WHERE table_id IN (SELECT id FROM @drop);

DELETE FROM dbo.tb_custom_values       WHERE table_id IN (SELECT id FROM @drop);
DELETE FROM dbo.tb_field_corrections   WHERE table_id IN (SELECT id FROM @drop);
DELETE FROM dbo.tb_cache               WHERE table_id IN (SELECT id FROM @drop);
DELETE FROM dbo.tb_sync_state          WHERE table_id IN (SELECT id FROM @drop);
DELETE FROM dbo.tb_user_view_state     WHERE table_id IN (SELECT id FROM @drop);
DELETE FROM dbo.tb_relations           WHERE table_id IN (SELECT id FROM @drop);
DELETE FROM dbo.tb_columns             WHERE table_id IN (SELECT id FROM @drop);
DELETE FROM dbo.tb_tables              WHERE id IN (SELECT id FROM @drop);

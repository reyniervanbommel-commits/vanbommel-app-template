-- Migratie 015: datatype 'image' toestaan op po_columns én tb_columns (#AB:178)
-- Story A "Plaatje-kolom": een nieuw read-only kolomtype 'image' laadt afbeeldingen
-- van een user-gestuurde URL-template. De data_type CHECK-constraints moeten dit toestaan.
--
-- CHECK-constraints zijn niet muteerbaar: droppen en opnieuw aanmaken.
-- - CK_po_columns_data_type is gedefinieerd in 007_purchase_orders_cache.sql.
-- - CK_tb_columns_data_type is gedefinieerd in 011_tb_metamodel.sql; tb_columns wordt
--   geseed uit po_columns.data_type, dus beide moeten 'image' toestaan.
--
-- Idempotent: veilig meerdere keren uitvoeren. De DROP is geguard op bestaan van de
-- constraint; de tb_columns-blok draait alleen als die tabel bestaat.
-- De migratie-runner (scripts/db/run-migrations.js) voert het bestand uit via
-- pool.request().batch() en splitst NIET op GO, dus we gebruiken geen GO.

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_po_columns_data_type')
  ALTER TABLE dbo.po_columns DROP CONSTRAINT CK_po_columns_data_type;

ALTER TABLE dbo.po_columns
  ADD CONSTRAINT CK_po_columns_data_type
  CHECK (data_type IN ('text','number','date','boolean','select','image'));

IF OBJECT_ID('dbo.tb_columns','U') IS NOT NULL
BEGIN
  IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_tb_columns_data_type')
    ALTER TABLE dbo.tb_columns DROP CONSTRAINT CK_tb_columns_data_type;

  ALTER TABLE dbo.tb_columns
    ADD CONSTRAINT CK_tb_columns_data_type
    CHECK (data_type IN ('text','number','date','boolean','select','image'));
END

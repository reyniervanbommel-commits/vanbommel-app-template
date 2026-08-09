-- Migratie 036: Voeg itemNumber kolom toe aan items-tabel (idempotent).
--
-- Probleembeschrijving (aanvulling op migratie 035):
--   Migration 021 voegde itemNumber toe aan items via IF NOT EXISTS op @itemsTableId.
--   Als de items-tabel op dat moment nog niet bestond was @itemsTableId NULL en werden de
--   INSERT-statements overgeslagen. Daarna werden items gesynchroniseerd via D365, waarbij
--   syncSourceColumnsFromRecords auto-discovered kolommen aanmaakte met is_active=0. Gevolg:
--   de items-cache heeft geen 'itemNumber' in data_json, buildLookupCacheKey geeft null terug
--   en byKey blijft leeg -> geen artikeldata op PO-regels.
--
-- Oplossing:
--   1. Zorg dat itemNumber actief aanwezig is als source-kolom in de items-tabel.
--   2. Zorg dat searchName en itemGroupId actief zijn (dezelfde kolommen die ook in migration 021 staan).
--   3. Forceer een hersynch van de items-tabel door last_full_sync_at te wissen, zodat de
--      volgende D365F&O-refresh fresh data haalt inclusief itemNumber in data_json.
--
-- Idempotent: veilig meerdere keren uitvoeren.

DECLARE @itemsTableId BIGINT = (SELECT TOP 1 id FROM dbo.tb_tables WHERE [key] = 'items');

IF @itemsTableId IS NOT NULL
BEGIN
  -- 1a. Voeg itemNumber toe als die ontbreekt
  IF NOT EXISTS (
    SELECT 1 FROM dbo.tb_columns
    WHERE table_id = @itemsTableId AND scope = 'master' AND [key] = 'itemNumber'
  )
  BEGIN
    INSERT INTO dbo.tb_columns
      (table_id, scope, [key], label, source, source_field, data_type,
       writable, write_mechanism, is_default_visible, filterable, sortable, is_active, sort_order)
    VALUES
      (@itemsTableId, 'master', 'itemNumber', 'Item number', 'source', 'ItemNumber', 'text',
       0, NULL, 1, 1, 1, 1, 10);
  END
  ELSE
  BEGIN
    -- Kolom bestaat al; zorg dat hij actief is en de juiste source_field heeft
    UPDATE dbo.tb_columns
    SET is_active = 1, source_field = 'ItemNumber', source = 'source'
    WHERE table_id = @itemsTableId AND scope = 'master' AND [key] = 'itemNumber';
  END;

  -- 1b. searchName
  IF NOT EXISTS (
    SELECT 1 FROM dbo.tb_columns
    WHERE table_id = @itemsTableId AND scope = 'master' AND [key] = 'searchName'
  )
  BEGIN
    INSERT INTO dbo.tb_columns
      (table_id, scope, [key], label, source, source_field, data_type,
       writable, write_mechanism, is_default_visible, filterable, sortable, is_active, sort_order)
    VALUES
      (@itemsTableId, 'master', 'searchName', 'Item name', 'source', 'SearchName', 'text',
       0, NULL, 1, 1, 1, 1, 20);
  END
  ELSE
  BEGIN
    UPDATE dbo.tb_columns
    SET is_active = 1, source_field = 'SearchName', source = 'source'
    WHERE table_id = @itemsTableId AND scope = 'master' AND [key] = 'searchName';
  END;

  -- 1c. itemGroupId
  IF NOT EXISTS (
    SELECT 1 FROM dbo.tb_columns
    WHERE table_id = @itemsTableId AND scope = 'master' AND [key] = 'itemGroupId'
  )
  BEGIN
    INSERT INTO dbo.tb_columns
      (table_id, scope, [key], label, source, source_field, data_type,
       writable, write_mechanism, is_default_visible, filterable, sortable, is_active, sort_order)
    VALUES
      (@itemsTableId, 'master', 'itemGroupId', 'Item group', 'source', 'ItemGroupId', 'text',
       0, NULL, 1, 1, 1, 1, 30);
  END
  ELSE
  BEGIN
    UPDATE dbo.tb_columns
    SET is_active = 1, source_field = 'ItemGroupId', source = 'source'
    WHERE table_id = @itemsTableId AND scope = 'master' AND [key] = 'itemGroupId';
  END;

  -- 2. Reset last_full_sync_at zodat de eerstvolgende sync items opnieuw fetcht
  --    inclusief itemNumber in data_json. Alleen wissen als de tabel nog sync-state heeft.
  IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tb_sync_state' AND type = 'U')
  BEGIN
    UPDATE dbo.tb_sync_state
    SET last_full_sync_at = NULL
    WHERE table_id = @itemsTableId;
  END;
END;
